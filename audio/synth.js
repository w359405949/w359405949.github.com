// @editor-module 零依赖的 Metal Max 音序试听核心。
//
// 输入是 engine/tools/mm_audio.py 生成的 audio-index/v2 + audio-sequence/v2。
// 音高 timer 与 DPCM 原始字节必须已经内嵌在发布包中。执行轨迹（events /
// state_snapshots）不在包里，由 audio/executions.js 仅依据 audio index 与
// sequence graph JSON 现算——那是计算缓存，不是发布内容。缺少播放字段时
// 返回明确的不可播放原因。AudioContext 只会由
// unlock()/play*() 创建，因此调用方应从 click/pointerup 等用户手势中直接调用
// play*()。

import {sequenceExecution} from "./executions.js";

const NES_APU_TIMING = Object.freeze({
  cpuHz: 1789773,
  driverHz: 60.0988,
  defaultSampleRate: 44100,
  // NTSC $4010 rate index 0..15，单位为 CPU cycle / DPCM bit。
  dpcmRateCycles: Object.freeze([
    428, 380, 340, 320, 286, 254, 226, 214,
    190, 160, 142, 128, 106, 85, 72, 54,
  ]),
  // NTSC noise timer period，单位为 CPU cycle / LFSR clock。
  noisePeriodCycles: Object.freeze([
    4, 8, 16, 32, 64, 96, 128, 160,
    202, 254, 380, 508, 762, 1016, 2034, 4068,
  ]),
});

const NES_APU_CHANNEL_KEYS = Object.freeze([
  "pulse-1", "pulse-2", "triangle", "noise", "dpcm",
]);

const DEFAULT_LOOP_PREVIEW_SECONDS = 120;
const DEFAULT_MAX_RENDER_SECONDS = 120;
// 该驱动初始化路径把 DPCM DAC 从 0 开始；调用方仍可显式覆盖以预览其他运行态。
const DEFAULT_DPCM_DAC = 0;
const DUTY_RATIOS = Object.freeze([1 / 8, 1 / 4, 1 / 2, 3 / 4]);

let audibleOwner = null;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value)));
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) return Uint8Array.from(value);
  return null;
}

function uniquePush(target, value) {
  if (value && !target.includes(value)) target.push(value);
}

function nesTndOutput(triangle, noise, dpcm) {
  const input = Number(triangle) / 8227
    + Number(noise) / 12241
    + Number(dpcm) / 22638;
  return input > 0 ? 159.79 / (1 / input + 100) : 0;
}

function commandNumber(value) {
  if (Number.isInteger(value)) return value;
  const text = String(value ?? "").trim();
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
  if (/^[0-9a-f]{1,2}$/i.test(text) && /[a-f]/i.test(text)) {
    return Number.parseInt(text, 16);
  }
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return Number.NaN;
}

function counterDuration(value) {
  const byte = Number(value) & 0xFF;
  return byte || 0x100;
}

function takeTempoTicks(scheduler, tickCount, raw, driverHz) {
  if (!Number.isInteger(raw)) return null;
  const ticks = Math.max(0, Math.floor(Number(tickCount)));
  const increment = (Number(raw) & 0xFFFF) + 1;
  const tickUpdateOffsets = [];
  let updates = 0;
  while (tickUpdateOffsets.length < ticks) {
    scheduler.accumulator += increment;
    updates += 1;
    if (scheduler.accumulator >= 0x10000) {
      scheduler.accumulator -= 0x10000;
      tickUpdateOffsets.push(updates);
    }
  }
  return {
    updates,
    durationSeconds: updates / driverHz,
    tickBoundariesSeconds: tickUpdateOffsets.map(value => value / driverHz),
  };
}

function elapsedTempoTicks(boundaries, localSeconds) {
  let low = 0;
  let high = boundaries?.length || 0;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (boundaries[middle] <= localSeconds) low = middle + 1;
    else high = middle;
  }
  return low;
}

function eventDurationSeconds(event, state, parserMode, sharedTempoRaw, driverHz) {
  if (parserMode === "music") return Number.NaN;
  const updates = Number(
    event.duration_effective_driver_updates
    ?? (event.duration_raw === undefined ? 0 : counterDuration(event.duration_raw)),
  );
  return Math.max(0, updates) / driverHz;
}

function audioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function userGestureIsUnavailable() {
  const activation = globalThis.navigator?.userActivation;
  return activation && activation.isActive === false;
}

function copySlice(bytes, start, length) {
  const result = bytes.subarray(start, start + length);
  return new Uint8Array(result);
}

/** Decode NES DPCM bits (least-significant bit first) at a requested PCM rate. */
function decodeNesDpcm(bytesInput, {
  rateIndex = 15,
  ratePeriodCpuCycles = null,
  sampleRate = NES_APU_TIMING.defaultSampleRate,
  cpuHz = NES_APU_TIMING.cpuHz,
  initialDac = DEFAULT_DPCM_DAC,
  loop = false,
  maxSeconds = DEFAULT_MAX_RENDER_SECONDS,
} = {}) {
  const bytes = asBytes(bytesInput);
  if (!bytes) throw new TypeError("DPCM bytes must be Uint8Array-compatible");
  const rate = Number(rateIndex);
  const explicitPeriod = Number(ratePeriodCpuCycles);
  if (!(explicitPeriod > 0) && (!Number.isInteger(rate) || rate < 0 || rate > 15)) {
    throw new RangeError("DPCM rateIndex must be 0..15 when no rate period is supplied");
  }
  const outputRate = Math.max(8000, Math.floor(Number(sampleRate)));
  const ratePeriod = explicitPeriod > 0 ? explicitPeriod : NES_APU_TIMING.dpcmRateCycles[rate];
  const bitSeconds = ratePeriod / Number(cpuHz);
  const onePassSeconds = bytes.length * 8 * bitSeconds;
  const duration = loop
    ? Math.max(0, Math.min(Number(maxSeconds), DEFAULT_MAX_RENDER_SECONDS))
    : Math.min(onePassSeconds, Number(maxSeconds));
  const sampleCount = Math.max(1, Math.ceil(duration * outputRate));
  const dacValues = new Float32Array(sampleCount);
  let dac = clamp(Math.floor(initialDac), 0, 127);
  let bitIndex = 0;
  let nextBitTime = 0;
  const totalBits = bytes.length * 8;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const time = sampleIndex / outputRate;
    while (time >= nextBitTime && (loop || bitIndex < totalBits)) {
      const sourceBit = loop ? bitIndex % totalBits : bitIndex;
      const bit = (bytes[sourceBit >> 3] >> (sourceBit & 7)) & 1;
      if (bit) {
        if (dac <= 125) dac += 2;
      } else if (dac >= 2) {
        dac -= 2;
      }
      bitIndex += 1;
      nextBitTime += bitSeconds;
      if (!totalBits) break;
    }
    dacValues[sampleIndex] = dac;
  }
  return {
    sampleRate: outputRate,
    durationSeconds: sampleCount / outputRate,
    bitSeconds,
    initialDac: clamp(Math.floor(initialDac), 0, 127),
    finalDac: dac,
    dacValues,
  };
}

function graphIndexes(audio) {
  const graph = audio?.sequence_graph || {};
  return {
    graph,
    // 执行轨迹不在发布包里，按 execution_id 现算并记忆化（见 executions.js）。
    // 接口保持 `.get(id)`，调用点不用关心它是查表还是现算。
    executions: {get: id => sequenceExecution(audio, id)},
    streams: new Map((graph.streams || []).map(item => [item.id, item])),
    voices: new Map((graph.voice_table || []).map(item => [Number(item.id), item])),
  };
}

function voiceFrames(voice) {
  const program = voice?.program;
  if (!program || !Array.isArray(program.instructions) || !program.instructions.length) return [];
  const instructions = new Map(program.instructions.map(item => [item.id, item]));
  const next = new Map();
  for (const edge of program.edges || []) {
    if (edge.target_instruction_id && !next.has(edge.source_instruction_id)) {
      next.set(edge.source_instruction_id, edge.target_instruction_id);
    }
  }
  const frames = [];
  let duty = null;
  let programIndex = 0;
  let current = program.instructions[0]?.id;
  const visits = new Map();
  while (current && frames.length < 4096) {
    const count = (visits.get(current) || 0) + 1;
    visits.set(current, count);
    if (count > 16) break;
    const instruction = instructions.get(current);
    if (!instruction) break;
    if (instruction.kind === "terminal-silence") {
      frames.push({level: 0, duty, programIndexAfterRead: Math.min(0xFF, programIndex + 1)});
      break;
    }
    if (instruction.kind === "set-inline-duty") {
      duty = Number(instruction.duty_state_raw) & 3;
      programIndex = Math.min(0xFF, programIndex + Number(instruction.raw_bytes?.length || 1));
    } else if (instruction.kind === "level") {
      programIndex = Math.min(0xFF, programIndex + Number(instruction.raw_bytes?.length || 1));
      frames.push({
        level: Number(instruction.level_raw) & 15,
        duty,
        programIndexAfterRead: programIndex,
      });
    }
    current = next.get(current);
  }
  return frames;
}

function findSharedTempo(command, indexes, warnings) {
  const playbackTempo = command.playback?.tempo;
  if (Number.isInteger(playbackTempo?.increment_raw)) {
    return Number(playbackTempo.increment_raw) & 0xFFFF;
  }
  const values = [];
  for (const track of command.tracks || []) {
    const execution = indexes.executions.get(track.execution_id);
    for (const snapshot of execution?.state_snapshots || []) {
      if (snapshot.tempo_increment_raw !== null && snapshot.tempo_increment_raw !== undefined) {
        const value = Number(snapshot.tempo_increment_raw) & 0xFFFF;
        if (!values.includes(value)) values.push(value);
      }
    }
  }
  if (values.length > 1) uniquePush(warnings, "tempo-changes-use-event-state");
  if (!values.length) {
    const resetFallback = playbackTempo?.reset_fallback_increment_raw;
    return Number.isInteger(resetFallback) ? resetFallback & 0xFFFF : null;
  }
  return values[0];
}

function playbackLoop(execution) {
  const proven = execution?.playback_loop;
  if (proven?.status === "exact-modeled-parser-state-cycle"
      && proven.looping === true
      && Number.isInteger(proven.cycle_event_start_index)
      && Number.isInteger(proven.cycle_event_count)
      && proven.cycle_event_count > 0) {
    return {
      start: proven.cycle_event_start_index,
      count: proven.cycle_event_count,
      status: proven.status,
      proven: true,
    };
  }
  return null;
}

function rawApuFields(event, channelKey) {
  const writes = new Map((event.register_writes || []).map(item => [Number(item.address), Number(item.value)]));
  if (channelKey === "triangle") {
    const low = writes.get(0x400A);
    const high = writes.get(0x400B);
    return {
      timer: low === undefined || high === undefined ? null : low | ((high & 7) << 8),
      volume: (writes.get(0x4008) ?? 0) & 0x7F ? 15 : 0,
      duty: null,
    };
  }
  const base = channelKey === "pulse-1" ? 0x4000
    : channelKey === "pulse-2" ? 0x4004 : 0x400C;
  if (channelKey === "noise") {
    const control = writes.get(base);
    const period = writes.get(0x400E);
    return {
      timer: period ?? null,
      volume: control === undefined ? null : control & 15,
      duty: null,
    };
  }
  const control = writes.get(base);
  const low = writes.get(base + 2);
  const high = writes.get(base + 3);
  return {
    timer: low === undefined || high === undefined ? null : low | ((high & 7) << 8),
    volume: control === undefined ? null : control & 15,
    duty: control === undefined ? null : (control >> 6) & 3,
  };
}

function voiceFrameAt(segment, tempoTicks) {
  const frames = segment.envelope || [];
  if (!frames.length) return null;
  const threshold = Number(segment.envelopeThreshold);
  const advancesPerTick = threshold > 0 ? Math.floor(30 / threshold) : 0;
  if (!advancesPerTick || tempoTicks <= 0) return frames[0];
  // note 起点直接读 voice[0]，但 index 仍为 0；第一个 tempo tick 因而再次读
  // voice[0]。其后每 threshold credit 读一个普通 level，inline duty 不额外耗 credit。
  const consumedLevels = tempoTicks * advancesPerTick;
  return frames[Math.min(Math.max(0, consumedLevels - 1), frames.length - 1)];
}

function scaledVoiceLevel(level, gateScale) {
  const raw = Number(level) & 15;
  const gate = Number(gateScale) & 15;
  if (!raw || !gate) return 0;
  return Math.max(1, Math.floor(raw * gate / 16));
}

function envelopeIndexAfterTicks(segment, tempoTicks) {
  if (segment.channelKey === "triangle") return Math.min(0xFF, tempoTicks);
  const threshold = Number(segment.envelopeThreshold);
  if (!(threshold > 0)) return 0;
  const frame = voiceFrameAt(segment, tempoTicks);
  return frame?.programIndexAfterRead || 0;
}

function pitchModTimers(baseTimer, state, segment, tickCount, channelKey) {
  const timers = new Uint16Array(Math.max(1, tickCount + 1));
  timers.fill(Number(baseTimer) & 0x7FF);
  if (channelKey === "noise") return timers;
  const delay = Number(state?.pitch_mod_limit_or_delay_raw) & 0xFF;
  const phaseIncrement = Number(state?.pitch_mod_phase_increment_raw) & 0xFF;
  const delta = Number(state?.pitch_mod_timer_delta_raw) & 0xFFFF;
  if (!phaseIncrement || !delta) return timers;
  const base = Number(baseTimer) & 0x7FF;
  let current = base;
  let phase = 0;
  let quadrant = 0;
  for (let tick = 1; tick <= tickCount; tick += 1) {
    const envelopeIndex = envelopeIndexAfterTicks(segment, tick);
    if (envelopeIndex > delay) {
      const targetQuadrant = phase <= 0x1E ? 1
        : phase <= 0x3E ? 2
          : phase <= 0x5E ? 3 : 4;
      if (targetQuadrant !== quadrant) {
        const subtract = targetQuadrant === 1 || targetQuadrant === 4;
        const target = current + (subtract ? -delta : delta);
        if (target >= 0 && target < 0x700) current = target;
        quadrant = targetQuadrant;
      }
      phase = (phase + phaseIncrement) & 0xFF;
      if (phase & 0x80) {
        phase = 0;
        quadrant = 0;
        current = base;
      }
    }
    timers[tick] = current & 0x7FF;
  }
  return timers;
}

function sweepTimers(baseTimer, sweepRaw, channelKey, duration, driverHz) {
  const sweep = Number(sweepRaw) & 0xFF;
  if (!(sweep & 0x80) || !(sweep & 7)
      || (channelKey !== "pulse-1" && channelKey !== "pulse-2")) return null;
  const halfFrameHz = driverHz * 2;
  const count = Math.max(1, Math.ceil(duration * halfFrameHz) + 1);
  const timers = new Int16Array(count);
  let timer = Number(baseTimer) & 0x7FF;
  const period = ((sweep >> 4) & 7) + 1;
  const shift = sweep & 7;
  for (let clock = 0; clock < count; clock += 1) {
    timers[clock] = timer;
    if ((clock + 1) % period) continue;
    const change = timer >> shift;
    const target = (sweep & 8)
      ? timer - change - (channelKey === "pulse-1" ? 1 : 0)
      : timer + change;
    if (timer < 8 || target < 0 || target > 0x7FF) timer = -1;
    else timer = target;
  }
  return {timers, halfFrameHz};
}

function nativeSegment(
  channelKey, event, state, duration, timer, voice, warningTarget, noisePeriods,
  tickBoundaries, driverHz,
) {
  let volume = 0;
  let duty = null;
  let envelope = null;
  if (event.kind === "raw-apu-frame") {
    const raw = rawApuFields(event, channelKey);
    timer = raw.timer;
    volume = raw.volume ?? 0;
    duty = raw.duty;
    if (channelKey === "triangle") {
      uniquePush(warningTarget, "raw-triangle-linear-counter-frame-approximation");
    }
  } else if (event.kind === "effect-delay") {
    timer = Number(state?.base_timer_raw ?? 0);
    volume = Number(state?.sfx_volume_raw ?? 0) & 15;
    duty = state?.sfx_duty_raw === null || state?.sfx_duty_raw === undefined
      ? null : Number(state.sfx_duty_raw) & 3;
  } else if (event.kind === "note") {
    if (channelKey === "triangle") {
      volume = 15;
    } else {
      envelope = Array.isArray(voice) ? voice : voiceFrames(voice);
      if (!envelope.length) {
        uniquePush(warningTarget, `missing-voice-program:${state?.voice_id ?? "unknown"}`);
        return null;
      }
      volume = envelope[0]?.level ?? 0;
      duty = state?.duty_state_raw === null || state?.duty_state_raw === undefined
        ? null : Number(state.duty_state_raw) & 3;
    }
  }
  if (timer === null || timer === undefined || !Number.isFinite(Number(timer))) return null;
  const segment = {
    channelKey,
    kind: event.kind,
    duration,
    timer: Number(timer),
    noisePeriodCycles: channelKey === "noise"
      ? Number(event.noise_timer_period_cpu_cycles ?? noisePeriods?.[Number(timer) & 15])
      : null,
    volume,
    duty,
    envelope,
    envelopeThreshold: Number(state?.envelope_or_gate_rate_raw),
    gateScale: event.kind === "note" ? Number(state?.gate_ratio_raw) & 15 : 15,
    triangleGateCountdown: channelKey === "triangle" && event.kind === "note"
      ? Number(state?.envelope_or_gate_rate_raw) & 0xFF : Number.POSITIVE_INFINITY,
    tempoTickBoundaries: tickBoundaries || [],
    sweepRaw: Number(state?.sweep_raw) & 0xFF,
    autoDutyEnabled: Boolean(state?.auto_duty_enabled),
    event,
  };
  segment.pitchModTimers = event.kind === "note"
    ? pitchModTimers(
      segment.timer,
      state,
      segment,
      segment.tempoTickBoundaries.length,
      channelKey,
    )
    : Uint16Array.of(segment.timer & 0x7FF);
  segment.sweep = event.kind === "note"
    ? sweepTimers(segment.timer, segment.sweepRaw, channelKey, duration, driverHz)
    : null;
  if (segment.sweep) uniquePush(warningTarget, "hardware-sweep-half-frame-phase-approximation");
  return segment;
}

class MetalMaxNesApuSynth {
  constructor(audio, options = {}) {
    this.audio = audio;
    this.options = options;
    this.sampleRate = Math.max(8000, Math.floor(
      Number(options.sampleRate) || NES_APU_TIMING.defaultSampleRate,
    ));
    const playbackTiming = audio?.playback?.timing || {};
    this.cpuHz = Number(playbackTiming.cpu_clock_hz);
    this.driverHz = Number(playbackTiming.video_frame_rate_hz)
      * Number(playbackTiming.driver_updates_per_video_frame);
    this.maxPreviewSeconds = clamp(
      options.maxPreviewSeconds ?? DEFAULT_LOOP_PREVIEW_SECONDS,
      1,
      DEFAULT_MAX_RENDER_SECONDS,
    );
    this.dpcmGatePolicy = options.dpcmGatePolicy || "skip-unknown";
    this.initialDpcmDac = clamp(
      options.initialDpcmDac
      ?? audio?.playback?.dpcm?.initial_dac_level
      ?? DEFAULT_DPCM_DAC,
      0,
      127,
    );
    this._indexes = graphIndexes(audio);
    this._commandById = new Map((audio?.commands || []).map(item => [Number(item.id), item]));
    this._voiceFrameCache = new Map();
    this._dpcmByteCache = new Map();
    this._decodedDpcmCache = new Map();
    this._noisePeriods = audio?.playback?.noise?.timer_periods_cpu_cycles || [];
    this._listeners = new Set();
    if (typeof options.onState === "function") this._listeners.add(options.onState);
    this._state = Object.freeze({status: "idle"});
    this._volume = clamp(options.volume ?? 0.75, 0, 1);
    this._context = null;
    this._gain = null;
    this._source = null;
    this._channelSources = [];
    this._channelGains = new Map();
    this._channelEnabled = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, true]));
    this._playToken = 0;
  }

  get state() {
    return this._state;
  }

  get volume() {
    return this._volume;
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  _emit(status, details = {}) {
    this._state = Object.freeze({status, ...details});
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (error) {
        globalThis.console?.error?.("audio state listener failed", error);
      }
    }
  }

  setVolume(value) {
    this._volume = clamp(value, 0, 1);
    if (this._gain && this._context) {
      this._gain.gain.setValueAtTime(this._volume, this._context.currentTime);
    }
    return this._volume;
  }

  setChannelEnabled(channelKey, enabled) {
    if (!this._channelEnabled.has(channelKey)) throw new RangeError(`unknown channel: ${channelKey}`);
    this._channelEnabled.set(channelKey, Boolean(enabled));
    const gain = this._channelGains.get(channelKey);
    if (gain && this._context) gain.gain.setValueAtTime(enabled ? 1 : 0, this._context.currentTime);
    return Boolean(enabled);
  }

  isChannelEnabled(channelKey) {
    return this._channelEnabled.get(channelKey) ?? false;
  }

  channelGain(channelKey) {
    const gain = this._channelGains.get(channelKey);
    return gain ? gain.gain.value : this.isChannelEnabled(channelKey) ? 1 : 0;
  }

  _schemaProblem() {
    if (!(this.cpuHz > 0) || !(this.driverHz > 0)) {
      return "missing-ntsc-playback-timing";
    }
    return null;
  }

  async _periodTimer(event, warnings) {
    if (!String(event.period_table_lookup_status || "").startsWith("resolved-")) {
      uniquePush(warnings, `unresolved-period-table:${event.period_table_lookup_status || "missing"}`);
      return null;
    }
    if (!Number.isInteger(event.effective_apu_timer)) {
      uniquePush(warnings, "missing-effective-apu-timer");
      return null;
    }
    return Number(event.effective_apu_timer) & 0x7FF;
  }

  async _dpcmBytes(sample) {
    const id = Number(sample?.id);
    if (this._dpcmByteCache.has(id)) return this._dpcmByteCache.get(id);
    const bytes = asBytes(sample?.raw_bytes);
    if (!bytes || bytes.length !== Number(sample?.sample_length || 0)) return null;
    const copy = copySlice(bytes, 0, bytes.length);
    this._dpcmByteCache.set(id, copy);
    return copy;
  }

  async _decodedDpcm(sample, options) {
    const initialDac = options.initialDpcmDac ?? sample.initial_dac_level;
    const loop = Boolean(options.loop ?? sample.loop);
    const maxSeconds = options.maxSeconds ?? this.maxPreviewSeconds;
    const key = [sample.id, this.sampleRate, initialDac, loop ? maxSeconds : "once"].join(":");
    if (!this._decodedDpcmCache.has(key)) {
      this._decodedDpcmCache.set(key, (async () => {
        const bytes = await this._dpcmBytes(sample);
        if (!bytes) return null;
        return decodeNesDpcm(bytes, {
          rateIndex: sample.rate_index,
          ratePeriodCpuCycles: sample.rate_period_cpu_cycles,
          sampleRate: this.sampleRate,
          cpuHz: this.cpuHz,
          initialDac,
          loop,
          maxSeconds,
        });
      })());
    }
    return this._decodedDpcmCache.get(key);
  }

  _sampleById(id) {
    return (this.audio?.dpcm?.samples || []).find(item => Number(item.id) === Number(id));
  }

  async _dpcmSegment(event, start, options, warnings, assumptions) {
    const sample = this._sampleById(event.dpcm_parameter_id);
    if (!sample) {
      uniquePush(warnings, `missing-dpcm-parameter:${event.dpcm_parameter_id}`);
      return null;
    }
    if (event.trigger_status === "conditional-runtime-attempt") {
      const policy = options.dpcmGatePolicy || this.dpcmGatePolicy;
      if (policy !== "assume-open") {
        uniquePush(warnings, `dpcm-gate-runtime-unknown:${sample.id_hex}`);
        return null;
      }
      uniquePush(assumptions, `assume-$06FD<0x0A-for-dpcm:${sample.id_hex}`);
    }
    const decoded = await this._decodedDpcm(sample, options);
    if (!decoded) {
      uniquePush(warnings, `missing-dpcm-sample-bytes:${sample.id_hex}`);
      return null;
    }
    if (options.initialDpcmDac !== undefined) {
      uniquePush(assumptions, `override-dpcm-initial-dac:${decoded.initialDac}`);
    }
    return {
      channelKey: "dpcm",
      kind: "dpcm",
      start,
      end: start + decoded.durationSeconds,
      dacValues: decoded.dacValues,
      sample,
      event,
    };
  }

  async _compileEventList({
    events, execution, stream, channelKey, start, deadline, sharedTempoRaw,
    options, warnings, assumptions, nativeSegments, dpcmSegments, tempoScheduler,
  }) {
    let cursor = start;
    for (const event of events) {
      if (cursor >= deadline) break;
      const state = execution.state_snapshots?.[event.state_index] || null;
      if (event.kind === "dpcm-trigger-attempt") {
        for (let index = dpcmSegments.length - 1; index >= 0; index -= 1) {
          const active = dpcmSegments[index];
          if (active.start <= cursor && active.end > cursor) {
            // $C4 always writes $4015=$0F before evaluating $06FD, so even a closed
            // runtime gate stops the currently playing DPCM sample.
            active.end = cursor;
            break;
          }
        }
        if (!options.channelKey || options.channelKey === "dpcm") {
          const dpcm = await this._dpcmSegment(event, cursor, options, warnings, assumptions);
          if (dpcm) dpcmSegments.push(dpcm);
        } else if (!options.channelKey) {
          // Kept for readability if solo semantics are extended later.
        }
        continue;
      }
      let duration;
      let tickBoundaries = [];
      if (execution.parser_mode === "music") {
        const tickCount = Number(
          event.duration_effective_tempo_ticks
          ?? (event.duration_raw === undefined ? 0 : counterDuration(event.duration_raw)),
        );
        const tempoRaw = state?.tempo_increment_raw ?? sharedTempoRaw;
        const timing = takeTempoTicks(tempoScheduler, tickCount, tempoRaw, this.driverHz);
        if (!timing) {
          uniquePush(warnings, "missing-command-tempo-for-independent-playback");
          continue;
        }
        duration = timing.durationSeconds;
        tickBoundaries = timing.tickBoundariesSeconds;
      } else {
        duration = eventDurationSeconds(
          event, state, execution.parser_mode, sharedTempoRaw, this.driverHz,
        );
      }
      if (!(duration > 0)) continue;
      const end = Math.min(deadline, cursor + duration);
      if (!options.channelKey || options.channelKey === channelKey) {
        if (event.kind !== "rest") {
          let timer = null;
          if (event.kind === "note") {
            if (channelKey === "noise") timer = Number(event.noise_period_index) & 15;
            else timer = await this._periodTimer(event, warnings);
          }
          let voice = state?.voice_id === null || state?.voice_id === undefined
            ? null : this._indexes.voices.get(Number(state.voice_id));
          if (voice) {
            if (!this._voiceFrameCache.has(voice.id)) {
              this._voiceFrameCache.set(voice.id, voiceFrames(voice));
            }
            voice = this._voiceFrameCache.get(voice.id);
          }
          const segment = nativeSegment(
            channelKey, event, state, end - cursor, timer, voice, warnings,
            this._noisePeriods, tickBoundaries, this.driverHz,
          );
          if (segment) {
            segment.start = cursor;
            segment.end = end;
            nativeSegments.push(segment);
            if (segment.autoDutyEnabled) uniquePush(warnings, "auto-duty-not-time-synthesised");
          }
        }
      }
      cursor += duration;
    }
    return cursor;
  }

  async _compileTrack(command, track, sharedTempoRaw, options, result) {
    const execution = this._indexes.executions.get(track.execution_id);
    const stream = this._indexes.streams.get(execution?.stream_id || track.stream_id);
    const channelKey = track.channel_key || stream?.channel_key;
    if (!execution || !stream || !channelKey) {
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: "unplayable",
        reason: "missing-stream-or-execution",
      });
      return;
    }
    if (options.channelKey && options.channelKey !== channelKey && options.channelKey !== "dpcm") {
      return;
    }
    const events = execution.events || [];
    const loop = playbackLoop(execution);
    const deadline = Number(options.maxSeconds ?? this.maxPreviewSeconds);
    let cursor = 0;
    const tempoScheduler = {accumulator: 0};
    const compile = selected => this._compileEventList({
      events: selected,
      execution,
      stream,
      channelKey,
      start: cursor,
      deadline,
      sharedTempoRaw,
      options,
      warnings: result.warnings,
      assumptions: result.assumptions,
      nativeSegments: result.nativeSegments,
      dpcmSegments: result.dpcmSegments,
      tempoScheduler,
    });
    if (loop && loop.count > 0) {
      const prefix = events.slice(0, loop.start);
      const repeated = events.slice(loop.start, loop.start + loop.count);
      cursor = await compile(prefix);
      const firstLoopStart = cursor;
      const before = cursor;
      if (cursor < deadline && repeated.length) cursor = await compile(repeated);
      const passes = cursor > before ? 1 : 0;
      uniquePush(result.loopStatuses, loop.status);
      if (!loop.proven) uniquePush(result.warnings, "structural-loop-state-not-proven-stable");
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: loop.status,
        executionStatus: execution.status,
        durationSeconds: Math.min(cursor, deadline),
        loopStartSeconds: firstLoopStart,
        renderedLoopPasses: passes,
      });
    } else {
      cursor = await compile(events);
      const playbackStatus = execution.playback_loop?.status || execution.status;
      uniquePush(result.loopStatuses, playbackStatus);
      if (execution.termination?.kind === "structural-control-cycle") {
        uniquePush(result.warnings, "structural-loop-not-automatically-repeated");
      }
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: playbackStatus,
        executionStatus: execution.status,
        durationSeconds: Math.min(cursor, deadline),
      });
    }
    result.durationSeconds = Math.max(result.durationSeconds, Math.min(cursor, deadline));
  }

  _nativeValue(segment, time, noiseState) {
    const local = time - segment.start;
    const tempoTicks = elapsedTempoTicks(segment.tempoTickBoundaries, local);
    let volume = segment.volume & 15;
    let duty = segment.duty;
    if (segment.envelope?.length) {
      const frame = voiceFrameAt(segment, tempoTicks);
      volume = scaledVoiceLevel(frame?.level ?? 0, segment.gateScale);
      if (frame?.duty !== null && frame?.duty !== undefined) duty = frame.duty;
    }
    let timer = segment.pitchModTimers?.[
      Math.min(tempoTicks, (segment.pitchModTimers?.length || 1) - 1)
    ] ?? segment.timer;
    if (segment.sweep) {
      const sweepIndex = Math.min(
        Math.floor(local * segment.sweep.halfFrameHz),
        segment.sweep.timers.length - 1,
      );
      timer = segment.sweep.timers[sweepIndex];
    }
    if (segment.channelKey === "pulse-1" || segment.channelKey === "pulse-2") {
      if (timer < 0) return 0;
      timer &= 0x7FF;
      if (timer < 8 || !volume) return 0;
      const frequency = this.cpuHz / (16 * (timer + 1));
      const phase = (local * frequency) % 1;
      return phase < DUTY_RATIOS[duty ?? 2] ? volume : 0;
    }
    if (segment.channelKey === "triangle") {
      const countdown = segment.triangleGateCountdown;
      if (!(segment.gateScale > 0) || tempoTicks >= countdown) return 0;
      timer &= 0x7FF;
      if (timer < 2 || !volume) return 0;
      const step = Math.floor(local * this.cpuHz / (timer + 1)) & 31;
      return step < 16 ? 15 - step : step - 16;
    }
    if (segment.channelKey === "noise") {
      if (!volume) return 0;
      const periodIndex = segment.timer & 15;
      const period = segment.noisePeriodCycles;
      if (!(period > 0)) return 0;
      noiseState.accumulator += this.cpuHz / (period * this.sampleRate);
      while (noiseState.accumulator >= 1) {
        const tap = (segment.timer & 0x80) ? 6 : 1;
        const feedback = (noiseState.lfsr ^ (noiseState.lfsr >> tap)) & 1;
        noiseState.lfsr = (noiseState.lfsr >> 1) | (feedback << 14);
        noiseState.accumulator -= 1;
      }
      return (noiseState.lfsr & 1) ? 0 : volume;
    }
    return 0;
  }

  _mix(result) {
    const requested = Number(result.durationSeconds);
    const dpcmEnd = result.dpcmSegments.reduce((max, item) => Math.max(max, item.end), 0);
    const duration = Math.min(
      Math.max(requested, dpcmEnd, 1 / this.sampleRate),
      result.maxSeconds,
    );
    const sampleCount = Math.max(1, Math.ceil(duration * this.sampleRate));
    const pcm = new Float32Array(sampleCount);
    const channelPcm = Object.fromEntries(NES_APU_CHANNEL_KEYS.map(key => [key, new Float32Array(sampleCount)]));
    const channelFilter = NES_APU_CHANNEL_KEYS.map(() => ({input: 0, output: 0}));
    const byChannel = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, []]));
    for (const segment of result.nativeSegments) byChannel.get(segment.channelKey)?.push(segment);
    for (const segment of result.dpcmSegments) byChannel.get("dpcm").push(segment);
    for (const [channelKey, segments] of byChannel) {
      segments.sort((a, b) => a.start - b.start);
      if (channelKey === "dpcm") {
        for (let index = 1; index < segments.length; index += 1) {
          // $C4 restarts the single DMC unit; a new request truncates the previous sample.
          segments[index - 1].end = Math.min(segments[index - 1].end, segments[index].start);
        }
      }
    }
    const positions = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, 0]));
    const noiseState = {lfsr: 1, accumulator: 0};
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const time = sampleIndex / this.sampleRate;
      const native = {"pulse-1": 0, "pulse-2": 0, triangle: 0, noise: 0, dpcm: 0};
      for (const channelKey of NES_APU_CHANNEL_KEYS) {
        const segments = byChannel.get(channelKey);
        let position = positions.get(channelKey);
        while (position < segments.length && segments[position].end <= time) position += 1;
        positions.set(channelKey, position);
        const segment = segments[position];
        if (!segment || segment.start > time || segment.end <= time) continue;
        if (channelKey === "dpcm") {
          const index = Math.floor((time - segment.start) * this.sampleRate);
          native.dpcm = segment.dacValues[index] ?? 0;
        } else {
          native[channelKey] = this._nativeValue(segment, time, noiseState);
        }
      }
      let previousStage = 0;
      for (let index = 0; index < NES_APU_CHANNEL_KEYS.length; index += 1) {
        const key = NES_APU_CHANNEL_KEYS[index];
        const pulseSum = native["pulse-1"] + (index >= 1 ? native["pulse-2"] : 0);
        const pulse = pulseSum > 0 ? 95.88 / (8128 / pulseSum + 100) : 0;
        const mixed = pulse + nesTndOutput(index >= 2 ? native.triangle : 0,
          index >= 3 ? native.noise : 0, index >= 4 ? native.dpcm : 0);
        // 累积混音逐级求差；全开与原非线性输出一致，关一路时其余声道样本不变。
        const filter = channelFilter[index];
        filter.output = mixed - filter.input + 0.995 * filter.output;
        filter.input = mixed;
        const stage = Math.tanh(filter.output * 2.2);
        channelPcm[key][sampleIndex] = stage - previousStage;
        previousStage = stage;
      }
      pcm[sampleIndex] = previousStage;
    }
    result.pcm = pcm;
    result.channelPcm = channelPcm;
    result.durationSeconds = sampleCount / this.sampleRate;
    result.sampleRate = this.sampleRate;
    result.channelCount = 1;
    result.nativeSegmentCount = result.nativeSegments.length;
    result.dpcmSegmentCount = result.dpcmSegments.length;
    delete result.nativeSegments;
    delete result.dpcmSegments;
    return result;
  }

  async renderCommand(commandId, options = {}) {
    const schemaProblem = this._schemaProblem();
    if (schemaProblem) return {ok: false, status: "unplayable", reason: schemaProblem};
    const id = commandNumber(commandId);
    const command = this._commandById.get(id);
    if (!command) return {ok: false, status: "unplayable", reason: "unknown-command-id"};
    if (!command.available || command.kind === "control") {
      return {
        ok: false,
        status: "unplayable",
        reason: "command-is-control-or-disabled",
        commandId: id,
      };
    }
    const channelKey = options.channelKey || null;
    if (channelKey && !NES_APU_CHANNEL_KEYS.includes(channelKey)) {
      return {ok: false, status: "unplayable", reason: `unknown-channel-key:${channelKey}`};
    }
    const maxSeconds = clamp(
      options.maxSeconds ?? this.maxPreviewSeconds,
      0.05,
      Math.max(DEFAULT_MAX_RENDER_SECONDS, Number(options.timelineSeconds) || 0),
    );
    const result = {
      ok: true,
      status: "rendered",
      commandId: id,
      commandIdHex: command.id_hex,
      commandKind: command.kind,
      canonicalCommandId: command.canonical_command_id,
      channelKey,
      maxSeconds,
      durationSeconds: 0,
      warnings: [],
      assumptions: [],
      loopStatuses: [],
      trackReports: [],
      nativeSegments: [],
      dpcmSegments: [],
      fidelity: {
        driverTiming: "embedded-ntsc-rate-and-16-bit-tempo-accumulator-per-track-preview",
        pitch: "embedded-effective-11-bit-apu-timer-required",
        envelope: "current-ROM-$9A-voice-credit-and-triangle-gate-on-tempo-ticks",
        pitchModulation: "current-ROM-$C3-four-quadrant-timer-state-machine",
        sweep: "current-ROM-$8E-hardware-sweep-with-approximate-half-frame-phase",
        loops: "proven-playback-loop-preferred-otherwise-structural-preview",
        mixing: "NES-nonlinear-channel-formula-with-simple-dc-filter",
      },
    };
    const sharedTempoRaw = findSharedTempo(command, this._indexes, result.warnings);
    result.tempo = {
      sharedIncrementRaw: sharedTempoRaw,
      sharedIncrementHex: Number.isInteger(sharedTempoRaw)
        ? `0x${sharedTempoRaw.toString(16).padStart(4, "0").toUpperCase()}` : null,
      defaultEvidence: command.kind !== "music"
        ? "not-applicable-sound-effect-driver-update-timing"
        : sharedTempoRaw === 0xFFFF
          ? "driver-init-$05F9/$05FA=$FFFF" : "sequence-set-tempo-increment",
      schedulingStatus: command.kind === "music"
        ? "per-track-accumulator-preview" : "driver-update-counts",
    };
    if (command.kind === "music") {
      uniquePush(result.warnings, "tempo-intertrack-scheduling-approximation");
    }
    const seenExecutions = new Set();
    for (const track of command.tracks || []) {
      // Alias headers can expose the same execution more than once. Preserve distinct APU tracks,
      // but never render one execution twice for the same channel.
      const key = `${track.channel_key}:${track.execution_id}`;
      if (seenExecutions.has(key)) continue;
      seenExecutions.add(key);
      await this._compileTrack(command, track, sharedTempoRaw, {...options, channelKey, maxSeconds}, result);
    }
    if (channelKey === "dpcm" && !result.dpcmSegments.length) {
      uniquePush(result.warnings, "command-has-no-renderable-dpcm-trigger");
    }
    const mixed = this._mix(result);
    const peak = mixed.pcm.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
    mixed.peak = peak;
    if (peak === 0) {
      mixed.status = "rendered-silence";
      uniquePush(mixed.warnings, "no-audible-segment-from-proven-events");
    } else if (mixed.warnings.length) {
      mixed.status = "rendered-partial";
    }
    return mixed;
  }

  async renderDpcmSample(sampleId, options = {}) {
    const schemaProblem = this._schemaProblem();
    if (schemaProblem) return {ok: false, status: "unplayable", reason: schemaProblem};
    const sample = this._sampleById(sampleId);
    if (!sample) {
      return {ok: false, status: "unplayable", reason: "unknown-dpcm-parameter-id"};
    }
    const bytes = await this._dpcmBytes(sample);
    if (!bytes) {
      return {
        ok: false,
        status: "unplayable",
        reason: "missing-dpcm-sample-bytes",
        sampleId: sample.id,
      };
    }
    const decoded = decodeNesDpcm(bytes, {
      rateIndex: sample.rate_index,
      ratePeriodCpuCycles: sample.rate_period_cpu_cycles,
      sampleRate: options.sampleRate || this.sampleRate,
      cpuHz: this.cpuHz,
      initialDac: options.initialDpcmDac ?? sample.initial_dac_level,
      loop: Boolean(options.loop ?? sample.loop),
      maxSeconds: options.maxSeconds ?? this.maxPreviewSeconds,
    });
    const pcm = new Float32Array(decoded.dacValues.length);
    // $4011=0 is a zero-valued DMC input, not the midpoint of a signed PCM signal.
    // Establish the requested initial DAC as the pre-sample DC baseline, then use
    // the same nonlinear TND transfer and DC filter as command mixing. This keeps
    // a real first-bit transition while avoiding an artificial DAC-0 click.
    let previousInput = nesTndOutput(0, 0, decoded.initialDac);
    let previousOutput = 0;
    let peak = 0;
    for (let index = 0; index < pcm.length; index += 1) {
      const input = nesTndOutput(0, 0, decoded.dacValues[index]);
      const output = input - previousInput + 0.995 * previousOutput;
      previousInput = input;
      previousOutput = output;
      pcm[index] = Math.tanh(output * 2.2);
      peak = Math.max(peak, Math.abs(pcm[index]));
    }
    return {
      ok: true,
      status: "rendered",
      kind: "dpcm-sample",
      sampleId: sample.id,
      sampleIdHex: sample.id_hex,
      sampleRate: decoded.sampleRate,
      channelCount: 1,
      durationSeconds: decoded.durationSeconds,
      pcm,
      channelPcm: {dpcm: pcm},
      peak,
      warnings: [],
      assumptions: options.initialDpcmDac === undefined
        ? [] : [`override-dpcm-initial-dac:${decoded.initialDac}`],
      fidelity: {
        dpcm: "NES-delta-rules-and-NTSC-rate-table",
        mixing: "NES-nonlinear-DMC-TND-formula-with-simple-dc-filter",
        initialDac: options.initialDpcmDac === undefined
          ? "driver-reset-zero" : "caller-override",
      },
    };
  }

  async unlock() {
    try {
      if (!this._context) {
        if (userGestureIsUnavailable() && !this.options.allowContextWithoutUserGesture) {
          const result = {
            ok: false,
            status: "blocked",
            reason: "audio-context-requires-user-gesture",
          };
          this._emit("blocked", result);
          return result;
        }
        const factory = this.options.audioContextFactory;
        const Constructor = audioContextConstructor();
        if (!factory && !Constructor) {
          const result = {ok: false, status: "blocked", reason: "web-audio-api-unavailable"};
          this._emit("blocked", result);
          return result;
        }
        this._context = factory ? factory() : new Constructor({latencyHint: "interactive"});
        this._gain = this._context.createGain();
        this._gain.gain.value = this._volume;
        this._gain.connect(this._context.destination);
      }
      if (this._context.state === "suspended") {
        if (userGestureIsUnavailable() && !this.options.allowContextWithoutUserGesture) {
          const result = {
            ok: false,
            status: "blocked",
            reason: "audio-context-requires-user-gesture",
          };
          this._emit("blocked", result);
          return result;
        }
        await this._context.resume();
      }
      return {ok: true, status: "unlocked", state: this._context.state};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const name = error && typeof error === "object" ? String(error.name || "") : "";
      const failedContext = this._context;
      this._context = null;
      this._gain = null;
      if (failedContext && failedContext.state !== "closed"
          && typeof failedContext.close === "function") {
        try {
          await failedContext.close();
        } catch (_) {
          // Preserve the original construction/resume failure as the reported cause.
        }
      }
      const blocked = name === "NotAllowedError" || name === "SecurityError";
      const status = blocked ? "blocked" : "error";
      const result = {
        ok: false,
        status,
        reason: blocked ? "audio-context-start-blocked" : "audio-context-start-failed",
        error: message,
      };
      this._emit(status, {kind: "audio-context", ...result});
      return result;
    }
  }

  _unlockFailure(unlocked) {
    return {
      ok: false,
      status: unlocked?.status || "unplayable",
      reason: unlocked?.reason || "audio-context-not-unlocked",
      ...(unlocked?.error ? {error: unlocked.error} : {}),
    };
  }

  stop(reason = "user") {
    this._playToken += 1;
    const source = this._source;
    this._source = null;
    for (const channelSource of this._channelSources) {
      channelSource.onended = null;
      try { channelSource.stop(); } catch (_) { /* Already ended. */ }
      channelSource.disconnect();
    }
    this._channelSources = [];
    for (const gain of this._channelGains.values()) gain.disconnect();
    this._channelGains.clear();
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch (_) {
        // AudioBufferSourceNode may already have ended.
      }
      try {
        source.disconnect();
      } catch (_) {
        // A disconnected node is already silent.
      }
    }
    if (audibleOwner === this) audibleOwner = null;
    this._emit("stopped", {reason});
  }

  async _playRendered(rendered, kind, id, options = {}) {
    if (!rendered?.ok) {
      this._emit("unplayable", {
        kind,
        id,
        reason: rendered?.reason || "render-failed",
        rendered,
      });
      return rendered;
    }
    if (!this._context || !this._gain) {
      return {ok: false, status: "unplayable", reason: "audio-context-not-unlocked"};
    }
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    audibleOwner = this;
    const stems = rendered.channelPcm || {dpcm: rendered.pcm};
    const sources = [];
    for (const [key, pcm] of Object.entries(stems)) {
      if (!pcm?.length) continue;
      const buffer = this._context.createBuffer(1, pcm.length, rendered.sampleRate);
      buffer.copyToChannel(pcm, 0);
      const source = this._context.createBufferSource();
      const gain = this._context.createGain();
      gain.gain.value = this.isChannelEnabled(key) ? 1 : 0;
      source.buffer = buffer;
      source.playbackRate.value = Number(options.rate) || 1;
      source.connect(gain);
      gain.connect(this._gain);
      this._channelGains.set(key, gain);
      sources.push(source);
    }
    this._channelSources = sources;
    const source = sources[0];
    this._source = source;
    const token = ++this._playToken;
    source.onended = () => {
      if (this._source !== source || token !== this._playToken) return;
      this._source = null;
      for (const channelSource of this._channelSources) channelSource.disconnect();
      this._channelSources = [];
      for (const gain of this._channelGains.values()) gain.disconnect();
      this._channelGains.clear();
      if (audibleOwner === this) audibleOwner = null;
      this._emit("ended", {kind, id, rendered});
    };
    const startAt = this._context.currentTime + 0.01;
    for (const channelSource of sources) channelSource.start(startAt, Math.max(0, Number(options.offsetSeconds) || 0));
    this._emit("playing", {kind, id, rendered});
    return {...rendered, playback: "started"};
  }

  async playTimeline(rendered, options = {}) {
    const token = ++this._playToken;
    const unlocked = await this.unlock();
    if (token !== this._playToken) return {ok: false, status: "cancelled"};
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    return this._playRendered(rendered, "timeline", options.id, options);
  }

  async playCommand(commandId, options = {}) {
    // unlock() is intentionally the first awaited operation, so AudioContext construction/resume
    // still happens inside the caller's click/pointerup activation.
    const unlocked = await this.unlock();
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    const token = ++this._playToken;
    this._emit("rendering", {kind: "command", id: commandNumber(commandId)});
    try {
      const rendered = await this.renderCommand(commandId, options);
      if (token !== this._playToken) return {ok: false, status: "cancelled", reason: "playback-replaced"};
      return await this._playRendered(rendered, "command", commandNumber(commandId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._emit("error", {kind: "command", id: commandId, error: message});
      return {ok: false, status: "error", reason: message};
    }
  }

  async playDpcmSample(sampleId, options = {}) {
    const unlocked = await this.unlock();
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    const token = ++this._playToken;
    this._emit("rendering", {kind: "dpcm-sample", id: Number(sampleId)});
    try {
      const rendered = await this.renderDpcmSample(sampleId, options);
      if (token !== this._playToken) return {ok: false, status: "cancelled", reason: "playback-replaced"};
      return await this._playRendered(rendered, "dpcm-sample", Number(sampleId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._emit("error", {kind: "dpcm-sample", id: sampleId, error: message});
      return {ok: false, status: "error", reason: message};
    }
  }

  async dispose() {
    this.stop("disposed");
    const context = this._context;
    this._context = null;
    this._gain = null;
    if (context && context.state !== "closed") await context.close();
    this._listeners.clear();
  }
}


export function createNesApuSynth(audio, options) {
  return new MetalMaxNesApuSynth(audio, options);
}
