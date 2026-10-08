// @editor-module 音频资源目录
//
// 来源：拆分前 engine/editor/app.js 第 9050-9177 行。

import {editorLog} from "../core/editor-log.js";
import {$, bytes, esc, hex} from "../core/dom.js";
import {
  audioCommandLabel,
  resourceLabel,
  resourceForwardReferenceCell,
  tableValueStack,
} from "../core/resource-index.js";
import {state} from "../core/state.js";
import {db} from "../core/project-db.js";
import {fields, panel, recordPage} from "../ui/record.js";
import {mountFieldObjectEditor} from "../ui/field-object-editor.js";
import {datasetFacts, setTableStatus} from "../ui/shell.js";
import {dataTable} from "../ui/table.js";
import {allSequenceExecutions} from "../audio/executions.js";
import {createNesApuSynth} from "../audio/synth.js";
import {recordViewHref} from "../core/router.js";

const EMPTY_SEQUENCE_GRAPH = Object.freeze({});
const sequenceGraphViewCache = new WeakMap();
const AUDIO_CHANNEL_LABELS = Object.freeze({
  "pulse-1": "P1",
  "pulse-2": "P2",
  triangle: "TRI",
  noise: "NOISE",
  dpcm: "DPCM",
});
const AUDIO_COMMAND_CHANNELS = Object.freeze([
  Object.freeze({key: "pulse-1", label: "P1", name: "PULSE 1", registers: "$4000-$4003"}),
  Object.freeze({key: "pulse-2", label: "P2", name: "PULSE 2", registers: "$4004-$4007"}),
  Object.freeze({key: "triangle", label: "TRI", name: "TRIANGLE", registers: "$4008-$400B"}),
  Object.freeze({key: "noise", label: "NOISE", name: "NOISE", registers: "$400C-$400F"}),
]);

function byteAudioUid(prefix, value) {
  return `${prefix}:${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
}

function audioCommandUid(command) {
  return byteAudioUid("audio-command", command.id);
}

function audioControlUid(control) {
  return byteAudioUid("audio-control", control.id);
}

function audioOpcodeUid(opcode) {
  return byteAudioUid("audio-opcode", opcode.opcode);
}

function audioVoiceUid(voice) {
  return byteAudioUid("audio-voice", voice.id);
}

function dpcmSampleUid(sample) {
  return byteAudioUid("dpcm-sample", sample.id);
}

function audioPeriodUid(entry) {
  return byteAudioUid("audio-period", entry.index);
}

function audioEventUid(event) {
  return `audio-event:${event.execution_id}:${String(event.index).padStart(6, "0")}`;
}

let audioPlaybackSynth = null;
let audioPlaybackSource = null;
let audioPlaybackUnsubscribe = null;
let audioPlaybackSnapshot = Object.freeze({status: "idle"});
let audioPlaybackRequest = null;
let audioPlaybackStartedAt = 0;
let audioPlaybackProgressFrame = 0;
let audioPlaybackVolume = 0.75;
const audioChannelEnabled = new Map(Object.keys(AUDIO_CHANNEL_LABELS).map(key => [key, true]));
let audioListCategory = "all";

function audioPlaybackSchemaReady(audio) {
  const timing = audio?.playback?.timing || {};
  return Boolean(audio?.sequence_graph) && Boolean(audio?.playback)
    && Number(timing.cpu_clock_hz) > 0
    && Number(timing.video_frame_rate_hz) > 0
    && Number(timing.driver_updates_per_video_frame) > 0;
}

function audioCommandHex(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `$${number.toString(16).toUpperCase().padStart(2, "0")}`
    : "$??";
}

function audioTime(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function playbackTargetDetails(snapshot = audioPlaybackSnapshot) {
  const rendered = snapshot.rendered || {};
  const request = audioPlaybackRequest || {};
  const kind = snapshot.kind || request.kind;
  const id = snapshot.id ?? request.id;
  const channelKey = rendered.channelKey || request.channelKey || null;
  if (kind === "dpcm-sample") {
    return {
      key: `dpcm:${Number(id)}`,
      label: `DPCM 参数 ${audioCommandHex(id)}`,
      channelKey: "dpcm",
    };
  }
  if (kind === "command") {
    const channel = channelKey ? ` · ${AUDIO_CHANNEL_LABELS[channelKey] || channelKey} SOLO` : "";
    return {
      key: `command:${Number(id)}:${channelKey || "all"}`,
      label: `${audioCommandLabel(id)}${channel}`,
      channelKey,
    };
  }
  return {key: null, label: "", channelKey: null};
}

function audioPlaybackStatusText(snapshot = audioPlaybackSnapshot) {
  const target = playbackTargetDetails(snapshot);
  if (snapshot.status === "rendering") return `正在合成 · ${target.label}`;
  if (snapshot.status === "playing") return `正在播放 · ${target.label}`;
  if (snapshot.status === "ended") return `播放完成 · ${target.label}`;
  if (snapshot.status === "stopped") {
    return snapshot.reason === "navigation" ? "已离开音频页并停止播放" : `已停止 · ${target.label}`;
  }
  if (snapshot.status === "blocked") return "浏览器拦截了音频启动，请直接点击试听按钮重试";
  if (snapshot.status === "unplayable") return `无法试听 · ${snapshot.reason || "缺少已确认播放数据"}`;
  if (snapshot.status === "error") return `试听失败 · ${snapshot.error || snapshot.reason || "未知错误"}`;
  return "";
}

function stopAudioPlaybackProgress() {
  if (audioPlaybackProgressFrame) cancelAnimationFrame(audioPlaybackProgressFrame);
  audioPlaybackProgressFrame = 0;
}

function updateAudioPlaybackDom() {
  const snapshot = audioPlaybackSnapshot;
  const rendered = snapshot.rendered || {};
  const duration = Number(rendered.durationSeconds) || 0;
  const isPlaying = snapshot.status === "playing";
  const isRendering = snapshot.status === "rendering";
  const elapsed = isPlaying
    ? Math.min(duration, Math.max(0, (performance.now() - audioPlaybackStartedAt) / 1000))
    : snapshot.status === "ended" ? duration : 0;
  const status = $("#audio-playback-status");
  const time = $("#audio-playback-time");
  const progress = $("#audio-playback-progress");
  const stop = $("#audio-playback-stop");
  if (status) {
    status.textContent = audioPlaybackStatusText(snapshot);
    status.dataset.status = snapshot.status;
  }
  if (time) time.textContent = duration ? `${audioTime(elapsed)} / ${audioTime(duration)}` : "0:00.0";
  if (progress) {
    progress.max = Math.max(duration, 1);
    progress.value = duration ? elapsed : 0;
    progress.setAttribute("aria-valuetext", duration
      ? `${audioTime(elapsed)} / ${audioTime(duration)}` : "尚未播放");
  }
  if (stop) stop.disabled = !isPlaying && !isRendering;

  const target = playbackTargetDetails(snapshot);
  document.querySelectorAll("[data-audio-playback-key]").forEach(node => {
    const active = (isPlaying || isRendering) && node.dataset.audioPlaybackKey === target.key;
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const activeChannels = new Set(
    (rendered.trackReports || []).map(report => report.channelKey).filter(Boolean),
  );
  if (Number(rendered.dpcmSegmentCount) > 0 || target.channelKey === "dpcm") {
    activeChannels.add("dpcm");
  }
  document.querySelectorAll("[data-audio-channel-indicator]").forEach(node => {
    const channelKey = node.dataset.audioChannelIndicator;
    const active = isPlaying && (target.channelKey === channelKey
      || (!target.channelKey && activeChannels.has(channelKey)));
    node.classList.toggle("active", active && audioChannelEnabled.get(channelKey));
  });
  document.querySelectorAll("[data-audio-channel-solo]").forEach(node => {
    const key = node.dataset.audioChannelSolo;
    const solo = Object.keys(AUDIO_CHANNEL_LABELS).every(
      channel => audioChannelEnabled.get(channel) === (channel === key),
    );
    node.classList.toggle("active", solo);
    node.setAttribute("aria-pressed", solo ? "true" : "false");
  });

  stopAudioPlaybackProgress();
  if (isPlaying && elapsed < duration) {
    audioPlaybackProgressFrame = requestAnimationFrame(updateAudioPlaybackDom);
  }
}

function ensureAudioPlaybackSynth(audio) {
  if (audioPlaybackSynth && audioPlaybackSource === audio) return audioPlaybackSynth;
  if (audioPlaybackSynth) {
    audioPlaybackSynth.stop("project-replaced");
    audioPlaybackUnsubscribe?.();
    void audioPlaybackSynth.dispose();
  }
  audioPlaybackSource = audio;
  audioPlaybackSynth = createNesApuSynth(audio, {
    volume: audioPlaybackVolume,
    maxPreviewSeconds: 120,
    dpcmGatePolicy: "assume-open",
  });
  for (const [key, enabled] of audioChannelEnabled) audioPlaybackSynth.setChannelEnabled(key, enabled);
  audioPlaybackUnsubscribe = audioPlaybackSynth.subscribe(snapshot => {
    audioPlaybackSnapshot = snapshot;
    if (snapshot.status === "playing") audioPlaybackStartedAt = performance.now();
    updateAudioPlaybackDom();
  });
  return audioPlaybackSynth;
}

function audioPlaybackToolbar(audio, commands, samples, {
  record = false,
  controls = "",
} = {}) {
  const schemaReady = audioPlaybackSchemaReady(audio);
  const playable = commands.filter(command => command.playback?.status === "playable").length;
  const silent = commands.filter(command => command.playback?.status === "silent-control").length;
  const channelIndicators = Object.entries(AUDIO_CHANNEL_LABELS).map(([key, label]) => (
    `<span class="audio-channel-control" data-audio-channel-indicator="${key}"><label><input type="checkbox" data-audio-channel-toggle="${key}"
      ${audioChannelEnabled.get(key) ? "checked" : ""} aria-label="${label} 声道试听">${label}</label>
      <button type="button" data-audio-channel-solo="${key}" aria-label="${label} 独奏" aria-pressed="false">独奏</button></span>`
  )).join("");
  return `<section class="audio-playback-console${
    record ? " record-panel record-panel--wide" : ""
  }" aria-labelledby="audio-playback-heading">
    <div class="audio-playback-head">
      <div><small>NES APU · 浏览器合成</small><h2 id="audio-playback-heading">音频试听</h2></div>
      <div class="audio-playback-badges"><span>${playable} 条发声命令</span><span>${samples.length} 组 DPCM</span><span>${silent} 条静音控制</span></div>
    </div>
    <div class="audio-playback-transport">
      <button type="button" class="button" id="audio-playback-stop" disabled>■ 停止</button>
      <label class="audio-playback-volume"><span>音量</span><input id="audio-playback-volume" type="range" min="0" max="1" step="0.01" value="${audioPlaybackVolume}"><b id="audio-playback-volume-value">${Math.round(audioPlaybackVolume * 100)}%</b></label>
      <div class="audio-channel-indicators" aria-label="试听声道开关">${channelIndicators}</div>
      <strong id="audio-playback-status" role="status" aria-live="polite" aria-atomic="true" data-status="${esc(audioPlaybackSnapshot.status)}">${esc(audioPlaybackStatusText())}</strong>
      <time id="audio-playback-time">0:00.0</time>
      <progress id="audio-playback-progress" aria-label="试听播放进度" aria-valuetext="尚未播放" max="1" value="0"></progress>
    </div>
    ${controls ? `<div class="audio-record-playback-actions">${controls}</div>` : ""}

  </section>`;
}

export function bindAudioPlayback() {
  document.querySelectorAll("[data-audio-address] summary").forEach(summary => {
    summary.addEventListener("click", event => {
      if (!event.target.closest("a")) event.stopPropagation();
    });
  });
  const audio = state.project?.audio;
  const category = document.querySelector("[data-audio-category]");
  category?.addEventListener("change", () => {
    audioListCategory = category.value;
    let visible = 0;
    document.querySelectorAll(".audio-list-page tr[data-row-id]").forEach(row => {
      const uid = row.dataset.rowId || "";
      const kind = uid.startsWith("dpcm-sample:") ? "sample"
        : uid.startsWith("audio-control:") ? "control"
          : audio.commands?.find(command => audioCommandUid(command) === uid)?.kind || "command";
      row.hidden = audioListCategory !== "all" && kind !== audioListCategory;
      if (!row.hidden) visible++;
    });
    const count = document.querySelector("[data-audio-list-count]");
    if (count) count.textContent = `${visible} / ${count.dataset.total} 条`;
    setTableStatus(visible, Number(count?.dataset.total) || visible);
  });
  category?.dispatchEvent(new Event("change"));
  const fieldHost = document.querySelector("[data-audio-command-fields]");
  if (fieldHost) {
    const id = fieldHost.dataset.audioCommandFields;
    void db.getFieldObjects("audio-command").then(objects => {
      const object = objects.find(item => item.id === id);
      if (object && fieldHost.isConnected) return mountFieldObjectEditor(fieldHost, object);
      if (fieldHost.isConnected) fieldHost.textContent = "该命令没有已登记的字段对象";
    }).catch(error => {
      editorLog.error("声音", `操作失败：${error?.message || error}`, error);
      if (fieldHost.isConnected) fieldHost.textContent = `字段载入失败：${error.message || error}`;
    });
  }
  if (!audio || !$("#audio-playback-heading")) return;
  if (!audioPlaybackSchemaReady(audio)) return;
  const synth = ensureAudioPlaybackSynth(audio);
  $("#audio-playback-stop")?.addEventListener("click", () => synth.stop("user"));
  $("#audio-playback-volume")?.addEventListener("input", event => {
    audioPlaybackVolume = synth.setVolume(Number(event.currentTarget.value));
    const value = $("#audio-playback-volume-value");
    if (value) value.textContent = `${Math.round(audioPlaybackVolume * 100)}%`;
  });
  document.querySelectorAll("[data-audio-channel-toggle]").forEach(node => {
    node.addEventListener("change", () => {
      const key = node.dataset.audioChannelToggle;
      const enabled = synth.setChannelEnabled(key, node.checked);
      audioChannelEnabled.set(key, enabled);
      updateAudioPlaybackDom();
    });
  });
  document.querySelectorAll("[data-audio-channel-solo]").forEach(node => {
    node.addEventListener("click", () => {
      const key = node.dataset.audioChannelSolo;
      const solo = Object.keys(AUDIO_CHANNEL_LABELS).every(
        channel => audioChannelEnabled.get(channel) === (channel === key),
      );
      for (const channel of Object.keys(AUDIO_CHANNEL_LABELS)) {
        const enabled = solo || channel === key;
        audioChannelEnabled.set(channel, synth.setChannelEnabled(channel, enabled));
        const toggle = document.querySelector(`[data-audio-channel-toggle="${channel}"]`);
        if (toggle) toggle.checked = enabled;
      }
      updateAudioPlaybackDom();
    });
  });
  document.querySelectorAll("[data-audio-command-play]").forEach(node => {
    node.addEventListener("click", async event => {
      const button = event.currentTarget;
      const id = Number(button.dataset.audioCommandPlay);
      const channelKey = button.dataset.audioChannelPlay || null;
      audioPlaybackRequest = {kind: "command", id, channelKey};
      updateAudioPlaybackDom();
      await synth.playCommand(id, {
        channelKey,
        maxSeconds: 120,
        dpcmGatePolicy: "assume-open",
      });
    });
  });
  document.querySelectorAll("[data-audio-dpcm-play]").forEach(node => {
    node.addEventListener("click", async event => {
      const id = Number(event.currentTarget.dataset.audioDpcmPlay);
      audioPlaybackRequest = {kind: "dpcm-sample", id, channelKey: "dpcm"};
      updateAudioPlaybackDom();
      await synth.playDpcmSample(id);
    });
  });
  updateAudioPlaybackDom();
}

export function leaveAudioPlaybackView() {
  if (!audioPlaybackSynth) return;
  const active = ["rendering", "playing"].includes(audioPlaybackSnapshot.status);
  if (active) audioPlaybackSynth.stop("navigation");
  stopAudioPlaybackProgress();
}

function sequenceGraphViewIndex(sequenceGraph, includeSearchText, executions) {
  const streams = sequenceGraph.streams || [];
  const instructions = sequenceGraph.instructions || [];
  const edges = sequenceGraph.edges || [];
  const voices = sequenceGraph.voice_table || [];
  const opcodes = sequenceGraph.opcode_table || [];
  let cached = sequenceGraphViewCache.get(sequenceGraph);
  if (!cached
      || cached.streams !== streams
      || cached.executions !== executions
      || cached.instructions !== instructions
      || cached.edges !== edges
      || cached.voices !== voices
      || cached.opcodes !== opcodes) {
    const edgesBySource = new Map();
    edges.forEach(edge => {
      const source = String(edge.source_instruction_id || "");
      if (!edgesBySource.has(source)) edgesBySource.set(source, []);
      edgesBySource.get(source).push(edge);
    });
    const events = executions.flatMap(execution => (
      execution.events || []
    ).map(event => ({execution_id: execution.id, parser_mode: execution.parser_mode, ...event})));
    const voiceInstructions = voices.flatMap(voice => (
      voice.program?.instructions || []
    ).map(instruction => ({voice_id: voice.id, voice_status: voice.status, ...instruction})));
    cached = {
      streams,
      executions,
      instructions,
      edges,
      voices,
      opcodes,
      events,
      voiceInstructions,
      edgesBySource,
      streamSearchText: null,
      executionSearchText: null,
      instructionSearchText: null,
      eventSearchText: null,
      voiceSearchText: null,
      opcodeSearchText: null,
      voiceInstructionSearchText: null,
    };
    sequenceGraphViewCache.set(sequenceGraph, cached);
  }
  if (includeSearchText && !cached.streamSearchText) {
    cached.streamSearchText = streams.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.executionSearchText = executions.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.instructionSearchText = instructions.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.eventSearchText = cached.events.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.voiceSearchText = voices.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.opcodeSearchText = opcodes.map(
      item => JSON.stringify(item).toLowerCase(),
    );
    cached.voiceInstructionSearchText = cached.voiceInstructions.map(
      item => JSON.stringify(item).toLowerCase(),
    );
  }
  return cached;
}

function audioResourceButton(uid, label = uid) {
  if (!uid) return `<span class="resource-empty">—</span>`;
  if (uid.startsWith("audio-command:")) label = resourceLabel(uid, label);
  return `<button type="button" class="resource-inline-link" data-resource-target="${esc(uid)}">${esc(label)}</button>`;
}

function cappedAudioRows(items, limit) {
  const shown = items.slice(0, limit);
  if (!state.resourceId || shown.some(item => item.id === state.resourceId)) return shown;
  const selected = items.find(item => item.id === state.resourceId);
  if (selected) shown.push(selected);
  return shown;
}

function audioTerminationDetails(execution) {
  const termination = execution.termination || {};
  const playbackLoop = execution.playback_loop || {};
  const details = [termination.kind];
  const cycleSteps = termination.structural_cycle_step_count;
  const cycleEvents = termination.structural_cycle_event_count;
  if (cycleSteps !== undefined) details.push(`结构循环 ${cycleSteps} 指令步`);
  if (cycleEvents !== undefined) details.push(`结构循环 ${cycleEvents} 事件`);
  if (termination.modeled_parser_state_stable_at_first_control_return === false) {
    details.push("首轮返回时 parser 状态继续演化");
  }
  if (termination.instruction_id) details.push(termination.instruction_id);
  if (termination.limit !== undefined) details.push(`LIMIT ${termination.limit}`);
  if (playbackLoop.status === "exact-modeled-parser-state-cycle") {
    details.push(`精确播放循环 · 前奏 ${playbackLoop.intro_event_count} / 循环 ${playbackLoop.cycle_event_count} 事件`);
  } else if (playbackLoop.status === "finite-event-sequence") {
    details.push("完整有限事件序列");
  }
  return details;
}

function audioEventDetails(event) {
  if (event.kind === "note") {
    return [
      `PITCH ${event.pitch_nibble}`,
      `DURATION ${event.duration_raw} → ${event.duration_effective_tempo_ticks} TEMPO TICKS`,
      event.noise_period_index !== undefined
        ? `NOISE PERIOD ${event.noise_period_index} · ${event.noise_timer_period_cpu_cycles} CPU CYCLES`
        : `PERIOD INDEX ${event.period_table_index} · TIMER ${event.effective_apu_timer_hex}`,
      event.apu_frequency_hz !== undefined && event.apu_frequency_hz !== null
        ? `${event.apu_frequency_hz} Hz`
        : event.noise_shift_register_clock_hz !== undefined
          ? `LFSR ${event.noise_shift_register_clock_hz} Hz`
          : "",
      event.transpose_signed_semitones !== undefined
        ? `TRANSPOSE ${event.transpose_signed_semitones}`
        : "",
      event.fine_timer_offset_signed ? `FINE TIMER ${event.fine_timer_offset_signed}` : "",
    ];
  }
  if (event.kind === "rest") {
    return [`DURATION ${event.duration_raw} → ${event.duration_effective_tempo_ticks} TEMPO TICKS`];
  }
  if (event.kind === "effect-delay" || event.kind === "raw-apu-frame") {
    const writes = (event.register_writes || []).map(
      write => `${write.address_hex}=${hex(Number(write.value), 2)}`,
    );
    return [
      `DURATION ${event.duration_raw} → ${event.duration_effective_driver_updates} DRIVER UPDATES`,
      ...writes,
    ];
  }
  if (event.kind === "dpcm-trigger-attempt") {
    const parameterId = Number(event.dpcm_parameter_id);
    const sampleUid = Number.isFinite(parameterId) && parameterId >= 1
      ? `dpcm-sample:${parameterId.toString(16).toUpperCase().padStart(2, "0")}`
      : null;
    return [event.dpcm_parameter_status, event.gate_condition, event.gate_value_status, event.trigger_status, sampleUid];
  }
  if (event.kind === "silence-yield") return [event.duration_status];
  return [JSON.stringify(event)];
}

function audioInstructionSemanticDetails(instruction) {
  const semantic = instruction.semantic || {};
  return [
    semantic.mnemonic || instruction.flow,
    semantic.category,
    semantic.status,
    ...(semantic.operand_roles || []).map((role, index) => `OP${index} ${role}`),
    ...(semantic.writes || []).map(value => `WRITE ${value}`),
  ];
}

function audioTrackExecutionLabel(status) {
  const value = String(status || "");
  if (value.includes("structural-control-cycle")) return "结构循环";
  if (value.includes("terminal")) return "有限音序";
  return value || "解析状态未知";
}

function audioTrackDurationMarkup(duration) {
  const status = String(duration?.status || "");
  const previewSeconds = duration?.preview_span_seconds;
  const naturalSeconds = duration?.natural_duration_seconds;
  const hasPreview = previewSeconds !== null && previewSeconds !== undefined
    && Number.isFinite(Number(previewSeconds));
  const hasNatural = naturalSeconds !== null && naturalSeconds !== undefined
    && Number.isFinite(Number(naturalSeconds));
  if (status === "infinite-loop" && hasPreview) {
    const hasIntro = Number(duration.intro_driver_updates) > 0;
    const spanLabel = hasIntro ? "前奏+1轮" : "单轮";
    return `<small class="audio-command-channel-duration" data-audio-track-duration-status="infinite-loop"
      title="循环音序没有自然终点；有限数值是独立试听从复位态开始的${spanLabel}长度。">时长 <b>∞</b><span>· ${spanLabel} ${audioTime(previewSeconds)}</span></small>`;
  }
  if (status === "finite" && hasNatural) {
    return `<small class="audio-command-channel-duration" data-audio-track-duration-status="finite"
      title="有限音序的自然终止时长，按 NTSC 音频驱动更新计算。">时长 <b>${audioTime(naturalSeconds)}</b></small>`;
  }
  return ``;
}

function audioCommandChannelCell(command, track, canPlay, channel) {
  if (!track) {
    return `<div class="audio-command-channel-cell is-empty" data-audio-command-channel="${channel.key}">
      <b class="audio-command-channel-title">${esc(channel.label)}</b>
      <span class="audio-channel-empty-mark">—</span><small>未启用</small>
    </div>`;
  }
  const channelKey = String(track.channel_key || "");
  const trackCanPlay = canPlay && Number(track.event_count) > 0 && channelKey === channel.key;
  const soloKey = `command:${Number(command.id)}:${channelKey}`;
  const status = String(track.execution_status || "");
  return `<div class="audio-command-channel-cell" data-audio-command-channel="${channel.key}">
    <div class="audio-command-channel-track">
      <div class="audio-command-channel-actions">
        <div class="audio-command-channel-title"><button type="button" class="resource-inline-link"
          data-resource-target="${esc(track.track_id)}" title="${esc(track.track_id)}">${esc(channel.label)}</button>
          <small>MASK ${esc(track.channel_mask_bit_hex || "—")}</small></div>
        <button type="button" class="button audio-solo-button"
          data-audio-command-play="${Number(command.id)}" data-audio-channel-play="${esc(channelKey)}"
          data-audio-playback-key="${esc(soloKey)}" aria-label="试听 ${esc(audioCommandLabel(command.id))} ${esc(channel.label)} 单声道"
          aria-pressed="false" ${trackCanPlay ? "" : "disabled"}>▶ SOLO</button>
      </div>
      <small class="audio-command-channel-meta">${esc(track.event_count)} EVENTS</small>
      ${audioTrackDurationMarkup(track.sequence_duration)}
      <small class="audio-command-channel-status" title="${esc(status)}">${esc(audioTrackExecutionLabel(status))}</small>
    </div>
  </div>`;
}

function audioControlChannelCell(channel) {
  return `<div class="audio-command-channel-cell is-empty" data-audio-command-channel="${channel.key}">
    <span class="audio-channel-empty-mark">—</span><small>控制命令不读取音序</small>
  </div>`;
}

function audioCommandPlaybackCell(command, canPlay) {
  const playback = command.playback || {};
  const tempo = playback.tempo || {};
  const playbackKey = `command:${Number(command.id)}:all`;
  return `<div class="audio-playback-cell"><button type="button"
    class="button audio-play-button" data-audio-command-play="${Number(command.id)}"
    data-audio-playback-key="${esc(playbackKey)}"
    aria-label="试听 ${esc(audioCommandLabel(command.id))} 全部声道" aria-pressed="false"
    ${canPlay ? "" : "disabled"}>▶ 整轨试听</button>${tableValueStack([
      playback.sequence_shape === "looping"
        ? "前奏 + 1 个完整循环"
        : playback.sequence_shape === "finite" ? "完整有限音序" : playback.status,
      playback.audible_event_count !== undefined
        ? `${playback.audible_event_count} AUDIBLE EVENTS` : "",
      tempo.increment_raw_hex
        ? `TEMPO ${tempo.increment_raw_hex} · ${tempo.average_driver_updates_per_tempo_tick} FRAMES/TICK`
        : "",
      tempo.status === "no-command-local-write-inherits-current-global-tempo"
        ? "TEMPO RESET FALLBACK $FFFF" : "",
    ])}</div>`;
}

function audioDpcmPlaybackCell(sample, canPlay) {
  const playbackKey = `dpcm:${Number(sample.id)}`;
  return `<div class="audio-playback-cell"><button type="button"
    class="button audio-play-button" data-audio-dpcm-play="${Number(sample.id)}"
    data-audio-playback-key="${esc(playbackKey)}" aria-label="试听 ${esc(sample.label)}"
    aria-pressed="false" ${canPlay ? "" : "disabled"}>▶ 试听样本</button>
    <small>${esc(sample.one_pass_duration_seconds ?? "—")} s · DAC ${esc(
      sample.initial_dac_level ?? 0,
    )}</small></div>`;
}

function audioCatalogRowUid(row) {
  return row.kind === "command" ? audioCommandUid(row.item) : audioControlUid(row.item);
}

function audioRowLabel(row) {
  return row.kind === "command" ? audioCommandLabel(row.item.id) : row.item.label;
}

function lowLevelAudioRows(audio, query = "") {
  const rows = [
    ...(audio.sequence_regions || []).map(region => ({
      uid: `audio-sequence-region:${region.id}`,
      id: region.id,
      label: region.label,
      kind: "音序数据",
      status: region.status,
      note: region.notes || (region.command_range
        ? `$${hex(region.command_range[0], 2).slice(2)}-$${
          hex(region.command_range[1], 2).slice(2)
        } 命令组`
        : ""),
      address: region.address,
      source: region,
    })),
    ...(audio.driver?.sections || []).map(section => ({
      uid: `audio-driver-section:${section.id}`,
      id: section.id,
      label: section.label,
      kind: section.kind,
      status: section.address?.confidence,
      note: section.description || "",
      address: section.address,
      source: section,
    })),
  ];
  return rows.filter(item => !query || JSON.stringify(item).toLowerCase().includes(query));
}

export function renderAudio() {
  const audio = state.project?.audio || {};
  const commands = audio.commands || [];
  const controls = audio.controls || [];
  const samples = audio.dpcm?.samples || [];
  const query = state.query.trim().toLowerCase();
  const rows = [
    ...commands.map(item => ({kind: "command", item})),
    ...controls.map(item => ({kind: "control", item})),
    ...samples.map(item => ({kind: "sample", item})),
  ].filter(row => {
    const uid = row.kind === "sample" ? dpcmSampleUid(row.item) : audioCatalogRowUid(row);
    return !query || [uid, row.item.id_hex, audioRowLabel(row), row.item.kind,
        row.item.playback?.sequence_shape, ...(row.item.observed_uses || [])]
        .join(" ").toLowerCase().includes(query);
  });
  const uid = row => row.kind === "sample" ? dpcmSampleUid(row.item) : audioCatalogRowUid(row);
  const duration = row => {
    if (row.kind === "sample") return audioTime(row.item.one_pass_duration_seconds);
    if (row.kind === "control") return "—";
    if (row.item.playback?.status !== "playable") return "—";
    const tracks = row.item.tracks || [];
    if (tracks.some(track => track.sequence_duration?.status === "infinite-loop")) {
      return `<span class="audio-list-loop-duration">循环</span>`;
    }
    const values = tracks.map(track => track.sequence_duration?.natural_duration_seconds)
      .filter(value => value !== null && value !== undefined && Number.isFinite(Number(value)))
      .map(Number);
    return values.length ? audioTime(Math.max(...values)) : "—";
  };
  const schemaReady = audioPlaybackSchemaReady(audio);
  const columns = [
    {key: "uid", label: "资源 ID", mono: true, width: 190,
      cell: row => `<a class="record-link" href="${recordViewHref("audio", uid(row))}">${esc(uid(row))}</a>`},
    {key: "name", label: "名称 / 用途", width: 210,
      cell: row => `<div class="audio-list-name"><b>${esc(audioRowLabel(row) || "—")}</b>
        ${(row.item.observed_uses || []).length ? `<small>${esc(row.item.observed_uses.join(" · "))}</small>` : ""}</div>`},
    {key: "kind", label: "类别 / 轨道头", width: 155, cell: row => {
      if (row.kind === "sample") return tableValueStack(["DPCM", `${row.item.sample_length} B`]);
      if (row.kind === "control") return tableValueStack(["控制", `INTERVAL ${row.item.interval}`]);
      return tableValueStack([row.item.kind === "music" ? "BGM"
        : row.item.kind === "control" ? "控制" : "音效",
        row.item.header ? `MASK ${row.item.channel_mask_hex}` : "",
        row.item.header ? `${row.item.stream_count} STREAMS` : ""]);
    }},
    {key: "channels", label: "声道构成", width: 165, cell: row => {
      if (row.kind === "sample") return `<span class="audio-list-channels">DPCM</span>`;
      if (row.kind === "control") return "—";
      const tracks = new Set((row.item.tracks || []).map(track => track.channel_key));
      return `<span class="audio-list-channels">${AUDIO_COMMAND_CHANNELS
        .filter(channel => tracks.has(channel.key)).map(channel => channel.label).join(" · ") || "—"}</span>`;
    }},
    {key: "shape", label: "播放形态 / 事件", width: 140, cell: row => row.kind === "sample"
      ? tableValueStack([row.item.loop ? "LOOP" : "NO LOOP", `RATE ${row.item.rate_index}`])
      : row.kind === "control" ? "淡出控制" : tableValueStack([
        row.item.playback?.sequence_shape === "looping" ? "前奏 + 循环"
          : row.item.playback?.sequence_shape === "finite" ? "有限音序"
            : row.item.playback?.status || "—",
        row.item.playback?.audible_event_count != null
          ? `${row.item.playback.audible_event_count} 发声事件` : "",
      ])},
    {key: "duration", label: "时长", mono: true, width: 80, cell: duration},
    {key: "play", label: "试听", width: 100, cell: row => {
      if (row.kind === "control") return "—";
      const sample = row.kind === "sample";
      const canPlay = sample
        ? schemaReady && Array.isArray(row.item.raw_bytes)
          && row.item.raw_bytes.length === Number(row.item.sample_length)
        : schemaReady && row.item.playback?.status === "playable";
      return `<button type="button" class="button audio-play-button"
        ${sample ? `data-audio-dpcm-play="${Number(row.item.id)}"` : `data-audio-command-play="${Number(row.item.id)}"`}
        data-audio-playback-key="${sample ? `dpcm:${Number(row.item.id)}` : `command:${Number(row.item.id)}:all`}"
        aria-label="试听 ${esc(audioRowLabel(row))}" aria-pressed="false" ${canPlay ? "" : "disabled"}>▶ 播放</button>`;
    }},
  ];
  return `<div class="audio-page audio-list-page">
    ${audioPlaybackToolbar(audio, commands, samples)}
    <div class="section-line"><h2>音频列表</h2><span data-audio-list-count
      data-total="${commands.length + controls.length + samples.length}">${rows.length} / ${commands.length + controls.length + samples.length} 条</span>
      <a class="record-link" href="${recordViewHref("audio", "audio-index")}" data-audio-index-link title="音频结构与底层资源" aria-label="音频结构与底层资源">↗</a></div>
    <div class="audio-list-filter"><label for="audio-category">类别</label><select id="audio-category" data-audio-category>
      <option value="all" ${audioListCategory === "all" ? "selected" : ""}>全部</option>
      <option value="music" ${audioListCategory === "music" ? "selected" : ""}>BGM</option>
      <option value="sound-effect" ${audioListCategory === "sound-effect" ? "selected" : ""}>音效</option>
      <option value="control" ${audioListCategory === "control" ? "selected" : ""}>控制</option>
      <option value="sample" ${audioListCategory === "sample" ? "selected" : ""}>DPCM</option>
    </select></div>
    ${dataTable({columns, rows, rowId: uid, recordRoute: row => `audio/${uid(row)}`,
      total: commands.length + controls.length + samples.length})}
  </div>`;
}

function renderAudioIndex() {
  const audio = state.project.audio || {};
  const playbackSchemaReady = audioPlaybackSchemaReady(audio);
  const summary = audio.summary || {};
  const commands = audio.commands || [];
  const controls = audio.controls || [];
  const samples = audio.dpcm?.samples || [];
  const playbackData = audio.playback || {};
  const periodEntries = playbackData.period_table?.entries || [];
  const sections = audio.driver?.sections || [];
  const sequenceRegions = audio.sequence_regions || [];
  const sequenceGraph = audio.sequence_graph || EMPTY_SEQUENCE_GRAPH;
  const graphSummary = sequenceGraph.summary || {};
  if (!commands.length) {
    return ``;
  }
  const q = state.query.trim().toLowerCase();
  // 执行轨迹是仅依据已发布 JSON 现算的（发布包里没有缓存轨迹），
  // 渲染前 main.js 已经备好 VM 结果。
  const graphView = sequenceGraphViewIndex(
    sequenceGraph,
    Boolean(q),
    allSequenceExecutions(audio),
  );
  const graphStreams = graphView.streams;
  const graphExecutions = graphView.executions;
  const graphInstructions = graphView.instructions;
  const graphEvents = graphView.events;
  const graphVoices = graphView.voices;
  const graphOpcodes = graphView.opcodes;
  const graphVoiceInstructions = graphView.voiceInstructions;
  const shownCommands = commands.filter(item => !q || `${audioCommandLabel(item.id)} ${JSON.stringify(item)}`.toLowerCase().includes(q));
  const shownControls = controls.filter(item => !q || JSON.stringify(item).toLowerCase().includes(q));
  const shownSamples = samples.filter(item => !q || JSON.stringify(item).toLowerCase().includes(q));
  const shownPeriodEntries = periodEntries.filter(
    item => !q || JSON.stringify(item).toLowerCase().includes(q),
  );
  const shownStreams = graphStreams.filter(
    (_item, index) => !q || graphView.streamSearchText[index].includes(q),
  );
  const shownExecutions = graphExecutions.filter(
    (_item, index) => !q || graphView.executionSearchText[index].includes(q),
  );
  const matchingInstructions = graphInstructions.filter(
    (_item, index) => !q || graphView.instructionSearchText[index].includes(q),
  );
  const matchingEvents = graphEvents.filter(
    (_item, index) => !q || graphView.eventSearchText[index].includes(q),
  );
  const shownVoices = graphVoices.filter(
    (_item, index) => !q || graphView.voiceSearchText[index].includes(q),
  );
  const shownOpcodes = graphOpcodes.filter(
    (_item, index) => !q || graphView.opcodeSearchText[index].includes(q),
  );
  const matchingVoiceInstructions = graphVoiceInstructions.filter(
    (_item, index) => !q || graphView.voiceInstructionSearchText[index].includes(q),
  );
  const instructionLimit = q ? 500 : 256;
  const eventLimit = q ? 500 : 256;
  const voiceInstructionLimit = q ? 500 : 256;
  const shownInstructions = cappedAudioRows(matchingInstructions, instructionLimit);
  const shownEvents = matchingEvents.slice(0, eventLimit);
  const shownVoiceInstructions = cappedAudioRows(matchingVoiceInstructions, voiceInstructionLimit);
  const edgesBySource = graphView.edgesBySource;
  const audioCatalogRows = [
    ...shownCommands.map(item => ({kind: "command", item})),
    ...shownControls.map(item => ({kind: "control", item})),
  ];
  const commandColumns = [
    {key: "resource_id", label: "资源 ID",
      cell: row => {
        const uid = audioCatalogRowUid(row);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "index", label: "索引", mono: true,
      cell: row => `<b>${esc(row.item.id_hex)}</b>`},
    {key: "name", label: "名称",
      cell: row => `<div class="audio-command-name"><b>${esc(audioRowLabel(row))}</b>
        <small>${esc(row.item.status)}</small>${(row.item.observed_uses || []).length
          ? `<small>${esc(row.item.observed_uses.join(" · "))}</small>` : ""}</div>`},
    {key: "playback", label: "整轨试听",
      cell: row => row.kind === "command"
        ? audioCommandPlaybackCell(
          row.item,
          playbackSchemaReady && row.item.playback?.status === "playable",
        )
        : `<div class="audio-playback-cell"><button type="button"
          class="button audio-play-button" disabled>不支持单独试听</button></div>`},
    {key: "kind", label: "类型 / 轨道头",
      cell: row => {
        if (row.kind === "control") {
          return tableValueStack(["淡出控制", `INTERVAL ${row.item.interval}`]);
        }
        const command = row.item;
        const kindLabel = command.kind === "music" ? "BGM"
          : command.kind === "sound-effect" ? "SFX"
          : command.kind === "control" ? "控制" : "未定义";
        const details = command.header
          ? [
              `FLAGS ${command.header_flags_hex}`,
              `MASK ${command.channel_mask_hex}`,
              `${command.stream_count} STREAMS`,
              command.dispatch_path,
            ]
          : [command.status];
        return tableValueStack([kindLabel, ...details]);
      }},
    ...AUDIO_COMMAND_CHANNELS.map(channel => ({
      key: channel.key,
      label: channel.label,
      title: `音序入口 / Solo · ${channel.name} · ${channel.registers}`,
      cell: row => {
        if (row.kind === "control") return audioControlChannelCell(channel);
        const command = row.item;
        const track = (command.tracks || []).find(
          item => String(item.channel_key || "") === channel.key,
        );
        return audioCommandChannelCell(
          command,
          track,
          playbackSchemaReady && command.playback?.status === "playable",
          channel,
        );
      },
    })),
    {key: "references", label: "引用资产",
      cell: row => row.kind === "command"
        ? resourceForwardReferenceCell(audioCommandUid(row.item))
        : `<span class="resource-empty">—</span>`},
  ];
  const lowLevelRows = lowLevelAudioRows(audio, q);
  const streamColumns = [
    {key: "resource_id", label: "资源 ID", width: 220,
      cell: stream => `<button class="resource-uid" type="button"
        data-resource-query="${esc(stream.id)}">${esc(stream.id)}</button>`},
    {key: "channel", label: "声道 / 入口", width: 160,
      cell: stream => tableValueStack([
        stream.channel_label, stream.channel_key,
      ])},
    {key: "status", label: "解码状态 / 控制形状", width: 300,
      cell: stream => tableValueStack([
        stream.status,
        stream.execution_status,
        stream.control_shape,
        stream.has_structural_control_cycle
          ? "RESOLVED STRUCTURAL CYCLE" : "NO STRUCTURAL CYCLE",
      ])},
    {key: "scale", label: "规模", width: 220,
      cell: stream => `${tableValueStack([
        `${stream.instruction_count} INSTRUCTIONS`,
        `${stream.decoded_byte_count} UNIQUE BYTES`,
        `${(stream.edge_ids || []).length} EDGES`,
        `${stream.event_count ?? 0} EVENTS`,
      ])}${audioResourceButton(stream.execution_id, "执行解析")}`},
    {key: "commands", label: "来源命令", width: 260,
      cell: stream => {
        const sourceCommands = (stream.source_command_ids || []).map(commandId => {
          const uid = byteAudioUid("audio-command", commandId);
          return `<button type="button" class="resource-inline-link"
            data-resource-target="${uid}" title="${uid}">${esc(audioCommandLabel(commandId))}</button>`;
        }).join("");
        return `<div class="table-cell-stack">${
          sourceCommands || `<span class="resource-empty">—</span>`
        }</div>`;
      }},
  ];
  // 模拟范围与初始栈假设是整张表的契约，写在 decoder 上；以前每行各存一份。
  const executionScope = [
    sequenceGraph.decoder?.execution_state_scope,
    sequenceGraph.decoder?.execution_stack_assumption,
  ];
  const executionColumns = [
    {key: "resource_id", label: "执行资源 ID", width: 220,
      cell: execution => `<button class="resource-uid" type="button"
        data-resource-query="${esc(execution.id)}">${esc(execution.id)}</button>`},
    {key: "stream", label: "音序流 / 解析器", width: 260,
      cell: execution => {
        const stream = graphStreams.find(item => item.id === execution.stream_id) || {};
        return `${audioResourceButton(execution.stream_id, execution.stream_id)}${
          tableValueStack([stream.channel_label, execution.parser_mode])
        }`;
      }},
    {key: "termination", label: "终止或结构回环", width: 300,
      cell: execution => tableValueStack([
        execution.status, ...audioTerminationDetails(execution),
      ])},
    {key: "scale", label: "执行规模", width: 260,
      cell: execution => tableValueStack([
        `${execution.executed_instruction_steps ?? 0} EXECUTED STEPS`,
        `${execution.executed_unique_instruction_count ?? 0} UNIQUE INSTRUCTIONS`,
        `${execution.event_count ?? 0} EVENTS`,
        `${(execution.state_snapshots || []).length} STATES`,
      ])},
    {key: "stacks", label: "动态栈峰值", width: 240,
      cell: execution => {
        const maxDepths = execution.maximum_stack_depths || {};
        return tableValueStack([
          `LOOP-A ${maxDepths.loop_a ?? 0}/2`,
          `LOOP-B ${maxDepths.loop_b ?? 0}/2`,
          `CALL ${maxDepths.call ?? 0}/3`,
          `${(execution.resolved_dynamic_edges || []).length} RESOLVED DYNAMIC EDGES`,
        ]);
      }},
    {key: "scope", label: "状态范围 / 假设", width: 220,
      cell: () => tableValueStack(executionScope)},
  ];
  const eventColumns = [
    {key: "event", label: "事件", mono: true, width: 60,
      cell: event => `<b>${esc(event.kind)}</b><small>#${esc(event.index)}</small>`},
    {key: "execution", label: "执行资源 / 解析器", width: 300,
      cell: event => `${audioResourceButton(event.execution_id, event.execution_id)}
        <small>${esc(event.parser_mode)}</small>`},
    {key: "instruction", label: "来源指令", width: 280,
      cell: event => audioResourceButton(event.instruction_id, event.instruction_id)},
    {key: "parameters", label: "已确认参数", width: 520,
      cell: event => {
        const details = audioEventDetails(event);
        const resourceDetail = event.kind === "dpcm-trigger-attempt"
            && details.at(-1)?.startsWith("dpcm-sample:")
          ? audioResourceButton(details.at(-1), details.at(-1))
          : "";
        const plainDetails = resourceDetail ? details.slice(0, -1) : details;
        return `${tableValueStack(plainDetails)}${resourceDetail}`;
      }},
    {key: "state", label: "状态快照", width: 120,
      cell: event => tableValueStack([
        `STATE ${event.state_index}`,
        event.raw_value_hex ? `RAW ${event.raw_value_hex}` : "",
      ])},
  ];
  const instructionColumns = [
    {key: "resource_id", label: "指令资源 ID", width: 220,
      cell: instruction => `<button class="resource-uid" type="button"
        data-resource-query="${esc(instruction.id)}">${esc(instruction.id)}</button>`},
    {key: "channel", label: "声道 / Bank", width: 140,
      cell: instruction => tableValueStack([
        instruction.channel_label,
      ])},
    {key: "bytes", label: "原始字节", mono: true, width: 150,
      cell: instruction => `<b>${esc(instruction.raw_hex)}</b><small>${
        esc(instruction.classification)
      } · ${esc(instruction.parser_mode)}</small>`},
    {key: "semantic", label: "语义 / 处理器", width: 500,
      cell: instruction => `${tableValueStack([
        ...audioInstructionSemanticDetails(instruction),
        instruction.status,
        instruction.handler_cpu === null || instruction.handler_cpu === undefined
          ? "" : `HANDLER ${hex(instruction.handler_cpu, 4)}`,
      ])}${Number(instruction.opcode) >= 0x90
        ? audioResourceButton(byteAudioUid("audio-opcode", instruction.opcode), "opcode 定义")
        : ""}`},
    {key: "edges", label: "出边", width: 310,
      cell: instruction => {
        const edges = edgesBySource.get(String(instruction.id)) || [];
        const markup = edges.length
          ? edges.map(edge => {
            const target = edge.target_instruction_id;
            return target
              ? `<button type="button" class="resource-inline-link"
                data-resource-target="${esc(target)}">${esc(edge.kind)} → ${
                  esc(String(target).split(":").at(-1))
                }</button>`
              : `<span>${esc(edge.kind)} · ${esc(edge.status || "dynamic")}</span>`;
          }).join("")
          : `<span class="resource-empty">终点 / 无静态边</span>`;
        return `<div class="table-cell-stack">${markup}</div>`;
      }},
  ];
  const opcodeColumns = [
    {key: "resource_id", label: "资源 ID", width: 120,
      cell: opcode => {
        const uid = audioOpcodeUid(opcode);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "opcode", label: "操作码 / 索引", mono: true, width: 80,
      cell: opcode => `<b>${esc(opcode.opcode_hex)}</b>
        <small>INDEX ${esc(opcode.table_index)}</small>`},
    {key: "semantic", label: "语义 / 流程", width: 290,
      cell: opcode => {
        const semantic = opcode.semantic || {};
        return tableValueStack([semantic.mnemonic, semantic.category, opcode.flow]);
      }},
    {key: "length", label: "长度 / 操作数", width: 480,
      cell: opcode => {
        const semantic = opcode.semantic || {};
        return tableValueStack([
          opcode.status,
          opcode.operand_count === null
            ? "OPERANDS UNKNOWN"
            : `${opcode.operand_count} OPERANDS / ${opcode.instruction_length} BYTES`,
          ...(semantic.operand_roles || []),
        ]);
      }},
  ];
  const voiceColumns = [
    {key: "resource_id", label: "资源 ID", width: 120,
      cell: voice => {
        const uid = audioVoiceUid(voice);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "entry", label: "ID", mono: true, width: 90,
      cell: voice => `<b>${esc(voice.id_hex)}</b>`},
    {key: "status", label: "状态 / 终止", width: 250,
      cell: voice => tableValueStack([voice.status, voice.termination?.kind])},
    {key: "scale", label: "程序规模", width: 370,
      cell: voice => {
        const program = voice.program || {};
        return tableValueStack([
          `${voice.length ?? 0} BYTES`,
          program.instruction_count !== undefined
            ? `${program.instruction_count} INSTRUCTIONS` : "NO PROGRAM",
          program.level_event_count !== undefined
            ? `${program.level_event_count} LEVEL EVENTS` : "",
          program.inline_duty_count !== undefined
            ? `${program.inline_duty_count} INLINE DUTY` : "",
          program.has_jump ? "HAS ENVELOPE JUMP" : "NO ENVELOPE JUMP",
        ]);
      }},
    {key: "bytes", label: "原始包络字节（预览）", mono: true, width: 430,
      cell: voice => {
        const raw = String(voice.program?.raw_hex || "");
        return `<div class="audio-raw-preview">${raw
          ? `<span title="${esc(raw)}">${esc(raw.slice(0, 128))}${
            raw.length > 128 ? " …" : ""
          }</span>`
          : `<span class="resource-empty">保留 ID，无包络程序</span>`}</div>`;
      }},
  ];
  const voiceInstructionColumns = [
    {key: "resource_id", label: "指令资源 ID", width: 220,
      cell: instruction => `<button class="resource-uid" type="button"
        data-resource-query="${esc(instruction.id)}">${esc(instruction.id)}</button>`},
    {key: "voice", label: "音色", width: 180,
      cell: instruction => {
        const uid = byteAudioUid("audio-voice", instruction.voice_id);
        return audioResourceButton(uid, uid);
      }},
    {key: "bytes", label: "原始字节", mono: true, width: 160,
      cell: instruction => `<b>${esc(instruction.raw_hex)}</b>`},
    {key: "semantic", label: "语义", width: 520,
      cell: instruction => {
        const detailFields = instruction.kind === "level"
          ? [`LEVEL ${instruction.level_raw}`]
          : instruction.kind === "set-inline-duty"
            ? [`DUTY ${instruction.duty_state_raw}`]
            : instruction.kind === "jump"
            ? ["跳转"]
              : [instruction.kind];
        return tableValueStack([
          instruction.kind, instruction.status, ...detailFields,
        ]);
      }},
  ];
  const dpcmColumns = [
    {key: "resource_id", label: "资源 ID", width: 110,
      cell: sample => {
        const uid = dpcmSampleUid(sample);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "parameter_id", label: "参数 ID", mono: true, width: 50,
      cell: sample => `<b>${esc(sample.id_hex)}</b>`},
    {key: "name", label: "名称", width: 95,
      cell: sample => `<b>${esc(sample.label)}</b>`},
    {key: "playback", label: "单独试听", width: 165,
      cell: sample => audioDpcmPlaybackCell(
        sample,
        playbackSchemaReady && Array.isArray(sample.raw_bytes)
          && sample.raw_bytes.length === Number(sample.sample_length),
      )},
    {key: "rate", label: "速率 / 标志", width: 330,
      cell: sample => tableValueStack([
        `RATE ${sample.rate_index}`,
        `${sample.rate_period_cpu_cycles ?? "—"} CPU CYCLES/BIT`,
        sample.loop ? "LOOP" : "NO LOOP",
        sample.irq ? "IRQ" : "NO IRQ",
        `RAW ${sample.rate_flags_hex}`,
      ])},
    {key: "length", label: "长度", width: 115,
      cell: sample => tableValueStack([
        `${sample.sample_length} B`, `$4013=${sample.length_register_hex}`,
      ])},
    {key: "bytes", label: "原始 DMC 字节", mono: true, width: 430,
      cell: sample => {
        const raw = String(sample.raw_hex || "");
        return `<div class="audio-raw-preview"><span>${esc(raw.slice(0, 128))}${
          raw.length > 128 ? " …" : ""
        }</span><small>${esc(sample.sample_bit_count ?? 0)} BITS · LSB FIRST</small></div>`;
      }},
  ];
  const periodColumns = [
    {key: "index", label: "索引", mono: true, width: 120,
      cell: entry => `<b>${esc(entry.index_hex)}</b><small>${esc(entry.index)}</small>`},
    {key: "bytes", label: "原始字节", mono: true, width: 140,
      cell: entry => `<b>${esc(entry.raw_hex)}</b><small>LE16</small>`},
    {key: "timer", label: "11 位 APU 定时值", mono: true, width: 220,
      cell: entry => `${esc(entry.timer_hex)}<small>${esc(entry.timer)}</small>`},
    {key: "pulse", label: "方波频率", width: 220,
      cell: entry => `${esc(entry.pulse_frequency_hz)} Hz`},
    {key: "triangle", label: "三角波频率", width: 220,
      cell: entry => `${esc(entry.triangle_frequency_hz)} Hz`},
  ];
  const layoutColumns = [
    {key: "resource_id", label: "资源 ID",
      cell: item => `<button class="resource-uid" type="button"
        data-resource-query="${esc(item.uid)}">${esc(item.uid)}</button>`},
    {key: "block_id", label: "区块 ID", mono: true,
      cell: item => esc(item.id)},
    {key: "description", label: "说明",
      cell: item => `<b>${esc(item.label)}</b>`},
    {key: "type", label: "类型", cell: item => esc(item.kind)},
    {key: "status", label: "状态 / 证据",
      cell: item => tableValueStack([item.status, item.note])},
  ];
  // 十三个数字方块占了整个首屏。命令数下面的 section-line 就有，其余压成一行；
  // 逐流、逐指令的明细本来就在下面的表里。
  const stats = datasetFacts([
    ["可试听 / BGM / SFX", `<b>${summary.audible_commands || 0}</b> · ${summary.music_commands || 0} · ${summary.sound_effect_commands || 0}`],
    ["DPCM 参数组", `<b>${summary.dpcm_parameter_sets || 0}</b>`],
    ["去重声道流", `<b>${graphSummary.canonical_streams || 0}</b>`],
    ["可达指令", `<b>${graphSummary.canonical_instructions || 0}</b>`],
    ["控制流边", `<b>${graphSummary.canonical_edges || 0}</b>`],
    ["去重音序字节", `<b>${bytes(graphSummary.decoded_physical_bytes || 0)}</b>`],
    ["音序事件", `<b>${graphSummary.semantic_events || 0}</b>`],
    ["有效音色程序", `<b>${graphSummary.valid_voice_programs || 0}</b>`],
  ]);
  const html = `<div class="audio-page">${audioPlaybackToolbar(audio, commands, samples)}${stats}
    <div class="section-line"><h2>声音命令目录</h2><span>${shownCommands.length + shownControls.length} / ${commands.length + controls.length} 条命令</span></div>
    <div class="audio-command-table">${dataTable({
      columns: commandColumns,
      rows: audioCatalogRows,
      rowId: audioCatalogRowUid,
      recordRoute: row => `audio/${audioCatalogRowUid(row)}`,
      total: commands.length + controls.length,
    })}</div>
    <div class="section-line"><h2>声道流与轨道结构</h2><span>${shownStreams.length} / ${graphStreams.length} 条声道流</span></div>
    <div class="audio-stream-table">${dataTable({
      columns: streamColumns,
      rows: shownStreams,
      rowId: stream => stream.id,
      recordRoute: stream => `audio/${stream.id}`,
      total: graphStreams.length,
    })}</div>
    <div class="section-line"><h2>逐轨解析结果</h2><span>${shownExecutions.length} / ${graphExecutions.length} 条结果 · 动态栈已解析</span></div>
    <div class="audio-execution-table">${dataTable({
      columns: executionColumns,
      rows: shownExecutions,
      rowId: execution => execution.id,
      recordRoute: execution => `audio/${execution.id}`,
      total: graphExecutions.length,
    })}</div>
    <div class="section-line"><h2>音序事件</h2><span>${shownEvents.length} / ${matchingEvents.length} 条匹配 · 共 ${graphEvents.length} 条</span></div>
    ${matchingEvents.length > shownEvents.length ? `<div class="wide-card"></div>` : ""}
    <div class="audio-event-table">${dataTable({
      columns: eventColumns,
      rows: shownEvents,
      rowId: audioEventUid,
      recordRoute: event => `audio/${audioEventUid(event)}`,
      total: graphEvents.length,
    })}</div>
    <div class="section-line"><h2>音序指令与控制流</h2><span>${shownInstructions.length} / ${matchingInstructions.length} 条匹配 · 共 ${graphInstructions.length} 条</span></div>
    ${matchingInstructions.length > shownInstructions.length ? `<div class="wide-card"></div>` : ""}
    <div class="audio-instruction-table">${dataTable({
      columns: instructionColumns,
      rows: shownInstructions,
      rowId: instruction => instruction.id,
      recordRoute: instruction => `audio/${instruction.id}`,
      total: graphInstructions.length,
    })}</div>
    <div class="section-line"><h2>操作码处理表</h2><span>${shownOpcodes.length} / ${graphOpcodes.length} 条记录 · $90-$E3</span></div>
    <div class="audio-opcode-table">${dataTable({
      columns: opcodeColumns,
      rows: shownOpcodes,
      rowId: audioOpcodeUid,
      recordRoute: opcode => `audio/${audioOpcodeUid(opcode)}`,
      total: graphOpcodes.length,
    })}</div>
    <div class="section-line"><h2>音色与包络程序</h2><span>${shownVoices.length} / ${graphVoices.length} 个音色 ID · 0–9 有效，10–15 保留</span></div>
    <div class="audio-voice-table">${dataTable({
      columns: voiceColumns,
      rows: shownVoices,
      rowId: audioVoiceUid,
      recordRoute: voice => `audio/${audioVoiceUid(voice)}`,
      total: graphVoices.length,
    })}</div>
    <div class="section-line"><h2>包络脚本指令</h2><span>${shownVoiceInstructions.length} / ${matchingVoiceInstructions.length} 条匹配 · 共 ${graphVoiceInstructions.length} 条</span></div>
    ${matchingVoiceInstructions.length > shownVoiceInstructions.length ? `<div class="wide-card"></div>` : ""}
    <div class="audio-voice-instruction-table">${dataTable({
      columns: voiceInstructionColumns,
      rows: shownVoiceInstructions,
      rowId: instruction => instruction.id,
      recordRoute: instruction => `audio/${instruction.id}`,
      total: graphVoiceInstructions.length,
    })}</div>
    <div class="section-line"><h2>DPCM 参数</h2><span>${shownSamples.length} / ${samples.length} 条记录 · 每条 3 字节</span></div>
    <div class="audio-dpcm-table">${dataTable({
      columns: dpcmColumns,
      rows: shownSamples,
      rowId: dpcmSampleUid,
      recordRoute: sample => `audio/${dpcmSampleUid(sample)}`,
      total: samples.length,
    })}</div>
    <div class="section-line"><h2>默认音高定时器表</h2><span>${shownPeriodEntries.length} / ${periodEntries.length} 条记录 · 16 位小端序</span></div>
    <div class="audio-period-table">${dataTable({
      columns: periodColumns,
      rows: shownPeriodEntries,
      rowId: audioPeriodUid,
      recordRoute: entry => `audio/${audioPeriodUid(entry)}`,
      total: periodEntries.length,
    })}</div>
    <div class="section-line"><h2>驱动与音序区块</h2><span>${lowLevelRows.length} 个地址范围</span></div>
    <div class="audio-layout-table">${dataTable({
      columns: layoutColumns,
      rows: lowLevelRows,
      rowId: item => item.uid,
      recordRoute: item => `audio/${item.uid}`,
      total: sequenceRegions.length + sections.length,
    })}</div>
    <div class="wide-card"></div></div>`;
  const visibleRows = [
    audioCatalogRows.length,
    shownStreams.length,
    shownExecutions.length,
    shownEvents.length,
    shownInstructions.length,
    shownOpcodes.length,
    shownVoices.length,
    shownVoiceInstructions.length,
    shownSamples.length,
    shownPeriodEntries.length,
    lowLevelRows.length,
  ].reduce((total, value) => total + value, 0);
  const totalRows = [
    commands.length + controls.length,
    graphStreams.length,
    graphExecutions.length,
    graphEvents.length,
    graphInstructions.length,
    graphOpcodes.length,
    graphVoices.length,
    graphVoiceInstructions.length,
    samples.length,
    periodEntries.length,
    sequenceRegions.length + sections.length,
  ].reduce((total, value) => total + value, 0);
  // 十一张表属于同一个音频目录；状态栏报告整页合计，而不是最后一张表的局部行数。
  setTableStatus(visibleRows, totalRows);
  return html;
}

function audioRecordContext() {
  const audio = state.project?.audio || {};
  const sequenceGraph = audio.sequence_graph || EMPTY_SEQUENCE_GRAPH;
  const graphView = sequenceGraphViewIndex(
    sequenceGraph,
    false,
    allSequenceExecutions(audio),
  );
  return {
    audio,
    catalog: [
      ...(audio.commands || []).map(item => ({kind: "command", item})),
      ...(audio.controls || []).map(item => ({kind: "control", item})),
    ],
    streams: graphView.streams,
    executions: graphView.executions,
    events: graphView.events,
    instructions: graphView.instructions,
    opcodes: graphView.opcodes,
    voices: graphView.voices,
    voiceInstructions: graphView.voiceInstructions,
    samples: audio.dpcm?.samples || [],
    periods: audio.playback?.period_table?.entries || [],
    layouts: lowLevelAudioRows(audio),
  };
}

function audioRecordReferencePanel(resourceUid) {
  if (!resourceUid) return "";
  return panel("引用资产", resourceForwardReferenceCell(resourceUid));
}

function audioRecordPlaybackControls(kind, row, audio) {
  const schemaReady = audioPlaybackSchemaReady(audio);
  if (kind === "catalog" && row.kind === "command") {
    const command = row.item;
    const canPlay = schemaReady && command.playback?.status === "playable";
    const tracks = new Map((command.tracks || []).map(
      track => [String(track.channel_key || ""), track],
    ));
    return `<div class="audio-record-command-playback">
      ${audioCommandPlaybackCell(command, canPlay)}
      <div class="audio-record-channel-playback">${AUDIO_COMMAND_CHANNELS.map(
        channel => audioCommandChannelCell(
          command, tracks.get(channel.key), canPlay, channel,
        ),
      ).join("")}</div>
    </div>`;
  }
  if (kind === "sample") {
    const canPlay = schemaReady && Array.isArray(row.raw_bytes)
      && row.raw_bytes.length === Number(row.sample_length);
    return audioDpcmPlaybackCell(row, canPlay);
  }
  return "";
}

function catalogRecordPanels(row) {
  const item = row.item;
  if (row.kind === "control") {
    return [panel("控制命令", fields([
      ["命令索引", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["类型", esc(item.kind || "—")],
      ["状态", esc(item.status || "—")],
      ["间隔", esc(item.interval ?? "—")],
      ["操作", esc(item.operation || "—")],
      ["淡出步数", esc(item.fade_steps ?? "—")],
      ["复位更新数", esc(item.driver_updates_to_reset ?? "—")],
    ])), panel("时序说明", `<p>${esc(item.timing_note || "—")}</p>`)];
  }
  const command = item;
  const playback = command.playback || {};
  return [
    panel("命令信息", fields([
      ["命令索引", `<span class="mono">${esc(command.id_hex)}</span>`],
      ["类型", esc(command.kind || "—")],
      ["状态", esc(command.status || "—")],
      ["轨道头标志", esc(command.header_flags_hex || "—")],
      ["声道掩码", esc(command.channel_mask_hex || "—")],
      ["分派路径", esc(command.dispatch_path || "—")],
      ["轨道数", esc(command.tracks?.length ?? 0)],
      ["播放形状", esc(playback.sequence_shape || playback.status || "—")],
      ["发声事件", esc(playback.audible_event_count ?? "—")],
    ])),
    ...(command.observed_uses?.length
      ? [panel("已观察用途", `<p>${esc(command.observed_uses.join(" · "))}</p>`)] : []),
  ];
}

function streamRecordPanels(stream) {
  return [
    panel("声道流", fields([
      ["声道", `${esc(stream.channel_label || "—")} · ${esc(stream.channel_key || "—")}`],
      ["解析器", esc(stream.parser_mode || "—")],
      ["状态", esc(stream.status || "—")],
      ["控制形状", esc(stream.control_shape || "—")],
      ["指令数", esc(stream.instruction_count ?? 0)],
      ["事件数", esc(stream.event_count ?? 0)],
    ])),
    panel("来源命令", `<div class="record-resource-links">${(
      stream.source_command_ids || []
    ).map(id => audioResourceButton(byteAudioUid("audio-command", id))).join("") || "—"}</div>`),
  ];
}

function executionRecordPanels(execution) {
  const maxDepths = execution.maximum_stack_depths || {};
  return [
    panel("逐轨解析", fields([
      ["音序流", audioResourceButton(execution.stream_id, execution.stream_id)],
      ["解析器", esc(execution.parser_mode || "—")],
      ["状态", esc(execution.status || "—")],
      ["终止", esc(audioTerminationDetails(execution).join(" · ") || "—")],
      ["执行步数", esc(execution.executed_instruction_steps ?? 0)],
      ["去重指令", esc(execution.executed_unique_instruction_count ?? 0)],
      ["事件数", esc(execution.event_count ?? 0)],
      ["状态快照", esc(execution.state_snapshots?.length ?? 0)],
    ])),
    panel("动态栈", fields([
      ["LOOP-A", `${esc(maxDepths.loop_a ?? 0)} / 2`],
      ["LOOP-B", `${esc(maxDepths.loop_b ?? 0)} / 2`],
      ["CALL", `${esc(maxDepths.call ?? 0)} / 3`],
      ["动态出边", esc(execution.resolved_dynamic_edges?.length ?? 0)],
    ])),
  ];
}

function eventRecordPanels(event) {
  return [panel("音序事件", fields([
    ["事件序号", esc(event.index)],
    ["类型", esc(event.kind || "—")],
    ["执行资源", audioResourceButton(event.execution_id, event.execution_id)],
    ["解析器", esc(event.parser_mode || "—")],
    ["来源指令", audioResourceButton(event.instruction_id, event.instruction_id)],
    ["状态快照", esc(event.state_index ?? "—")],
    ["原始值", `<span class="mono">${esc(event.raw_value_hex || "—")}</span>`],
    ["已确认参数", esc(audioEventDetails(event).filter(Boolean).join(" · ") || "—")],
  ]))];
}

function instructionRecordPanels(instruction) {
  const semantic = instruction.semantic || {};
  return [
    panel("指令", fields([
      ["声道", esc(instruction.channel_label || "—")],
      ["解析器", esc(instruction.parser_mode || "—")],
      ["分类", esc(instruction.classification || "—")],
      ["流程", esc(instruction.flow || "—")],
      ["状态", esc(instruction.status || "—")],
      ["操作码", instruction.opcode == null ? "—" : hex(instruction.opcode, 2)],
      ["长度", `${esc(instruction.length ?? 0)} bytes`],
      ["处理器", instruction.handler_cpu == null ? "—" : hex(instruction.handler_cpu, 4)],
    ])),
    panel("语义", fields([
      ["助记符", esc(semantic.mnemonic || instruction.mnemonic || "—")],
      ["类别", esc(semantic.category || "—")],
      ["语义状态", esc(semantic.status || instruction.semantic_status || "—")],
      ["操作数角色", esc((semantic.operand_roles || []).join(" / ") || "—")],
      ["写入", esc((semantic.writes || []).join(" / ") || "—")],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(instruction.raw_hex || "—")}</code>`),
  ];
}

function opcodeRecordPanels(opcode) {
  const semantic = opcode.semantic || {};
  return [panel("操作码", fields([
    ["操作码", `<span class="mono">${esc(opcode.opcode_hex)}</span>`],
    ["表索引", esc(opcode.table_index)],
    ["状态", esc(opcode.status || "—")],
    ["流程", esc(opcode.flow || "—")],
    ["指令长度", esc(opcode.instruction_length ?? "—")],
    ["操作数", esc(opcode.operand_count ?? "未知")],
    ["助记符", esc(semantic.mnemonic || "—")],
    ["类别", esc(semantic.category || "—")],
    ["写入", esc((semantic.writes || []).join(" / ") || "—")],
  ]))];
}

function voiceRecordPanels(voice) {
  const program = voice.program || {};
  return [
    panel("音色与包络", fields([
      ["音色 ID", `<span class="mono">${esc(voice.id_hex)}</span>`],
      ["状态", esc(voice.status || "—")],
      ["终止", esc(voice.termination?.kind || "—")],
      ["指令数", esc(program.instruction_count ?? 0)],
      ["电平事件", esc(program.level_event_count ?? 0)],
      ["内联占空比", esc(program.inline_duty_count ?? 0)],
    ])),
    panel("原始包络字节", `<code class="record-bytes">${esc(program.raw_hex || "—")}</code>`),
  ];
}

function voiceInstructionRecordPanels(instruction) {
  return [panel("包络脚本指令", fields([
    ["音色", audioResourceButton(byteAudioUid("audio-voice", instruction.voice_id))],
    ["类型", esc(instruction.kind || "—")],
    ["状态", esc(instruction.status || "—")],
    ["原始字节", `<span class="mono">${esc(instruction.raw_hex || "—")}</span>`],
    ["电平", esc(instruction.level_raw ?? "—")],
    ["占空比", esc(instruction.duty_state_raw ?? "—")],
  ]))];
}

function sampleRecordPanels(sample) {
  return [
    panel("DPCM 参数", fields([
      ["参数 ID", `<span class="mono">${esc(sample.id_hex)}</span>`],
      ["速率索引", esc(sample.rate_index)],
      ["每 bit 周期", `${esc(sample.rate_period_cpu_cycles ?? "—")} CPU cycles`],
      ["速率标志", `<span class="mono">${esc(sample.rate_flags_hex || "—")}</span>`],
      ["循环", sample.loop ? "是" : "否"],
      ["IRQ", sample.irq ? "是" : "否"],
      ["采样位数", esc(sample.sample_bit_count ?? "—")],
      ["单次时长", `${esc(sample.one_pass_duration_seconds ?? "—")} s`],
      ["初始 DAC", esc(sample.initial_dac_level ?? 0)],
    ])),
    panel("原始 DMC 字节", `<code class="record-bytes">${esc(sample.raw_hex || "—")}</code>`),
  ];
}

function periodRecordPanels(entry) {
  return [panel("默认音高定时器", fields([
    ["索引", `<span class="mono">${esc(entry.index_hex)}</span>`],
    ["原始字节", `<span class="mono">${esc(entry.raw_hex)}</span>`],
    ["11 位定时值", `<span class="mono">${esc(entry.timer_hex)}</span> · ${esc(entry.timer)}`],
    ["方波频率", `${esc(entry.pulse_frequency_hz)} Hz`],
    ["三角波频率", `${esc(entry.triangle_frequency_hz)} Hz`],
  ]))];
}

function layoutRecordPanels(item) {
  return [panel("驱动与音序区块", fields([
    ["区块 ID", `<span class="mono">${esc(item.id)}</span>`],
    ["说明", esc(item.label || "—")],
    ["类型", esc(item.kind || "—")],
    ["状态", esc(item.status || "—")],
    ["证据", esc(item.note || "—")],
  ]))];
}

function audioRecordTitle(kind, row, uid) {
  if (kind === "catalog") return audioRowLabel(row) || uid;
  if (kind === "stream") return `${row.channel_label || "声道流"} · ${row.channel_key || uid}`;
  if (kind === "execution") return `逐轨解析 · ${row.parser_mode || uid}`;
  if (kind === "event") return `${row.kind || "音序"} 事件 #${row.index}`;
  if (kind === "instruction") return `音序指令 · ${row.raw_hex || uid}`;
  if (kind === "opcode") return `操作码 ${row.opcode_hex}`;
  if (kind === "voice") return `音色 ${row.id_hex}`;
  if (kind === "voice-instruction") return `包络指令 · ${row.kind || uid}`;
  if (kind === "sample") return row.label || uid;
  if (kind === "period") return `默认音高定时器 ${row.index_hex}`;
  if (kind === "layout") return row.label || uid;
  return uid;
}

function audioRecordPanels(kind, row) {
  if (kind === "catalog") return catalogRecordPanels(row);
  if (kind === "stream") return streamRecordPanels(row);
  if (kind === "execution") return executionRecordPanels(row);
  if (kind === "event") return eventRecordPanels(row);
  if (kind === "instruction") return instructionRecordPanels(row);
  if (kind === "opcode") return opcodeRecordPanels(row);
  if (kind === "voice") return voiceRecordPanels(row);
  if (kind === "voice-instruction") return voiceInstructionRecordPanels(row);
  if (kind === "sample") return sampleRecordPanels(row);
  if (kind === "period") return periodRecordPanels(row);
  if (kind === "layout") return layoutRecordPanels(row);
  return [];
}

/** 十一张音频表共用的记录页；只展示整体范围，不伪造字段级地址表。 */
export function renderAudioRecord(recordId) {
  if (recordId === "audio-index") return recordPage({
    title: "音频结构与底层资源", uid: "audio-index", backLabel: "音频列表",
    panels: [panel("资源目录", renderAudioIndex(), {wide: true, flat: true})],
  });
  const context = audioRecordContext();
  const groups = [
    {kind: "catalog", rows: context.catalog, uidFor: audioCatalogRowUid},
    {kind: "stream", rows: context.streams, uidFor: row => row.id},
    {kind: "execution", rows: context.executions, uidFor: row => row.id},
    {kind: "event", rows: context.events, uidFor: audioEventUid,
      resourceUidFor: row => row.instruction_id},
    {kind: "instruction", rows: context.instructions, uidFor: row => row.id},
    {kind: "opcode", rows: context.opcodes, uidFor: audioOpcodeUid},
    {kind: "voice", rows: context.voices, uidFor: audioVoiceUid},
    {kind: "voice-instruction", rows: context.voiceInstructions, uidFor: row => row.id},
    {kind: "sample", rows: context.samples, uidFor: dpcmSampleUid},
    {kind: "period", rows: context.periods, uidFor: audioPeriodUid,
      resourceUidFor: () => null, addressFor: row => row.address},
    {kind: "layout", rows: context.layouts, uidFor: row => row.uid},
  ];
  const wanted = String(recordId);
  for (const group of groups) {
    const index = group.rows.findIndex(row => group.uidFor(row) === wanted);
    if (index < 0) continue;
    const row = group.rows[index];
    const uid = group.uidFor(row);
    const resourceUid = group.resourceUidFor ? group.resourceUidFor(row) : uid;
    const controls = audioRecordPlaybackControls(group.kind, row, context.audio);
    return recordPage({
      title: audioRecordTitle(group.kind, row, uid),
      uid,
      physicalUid: resourceUid,
      physicalRows: [
        ...(group.addressFor?.(row) ? [{label: "地址", address: group.addressFor(row)}] : []),
        ...(group.kind === "stream" ? (row.reachable_ranges || []).map((address, rangeIndex) => ({
          label: `可达范围 ${rangeIndex + 1}`, address,
        })) : []),
        ...(group.kind === "catalog" && row.kind === "command"
          ? (row.item.tracks || []).map(track => ({label: track.channel_label || track.channel_key,
            address: track.address})) : []),
      ].filter(entry => entry.address),
      backLabel: "音频资源目录",
      prevId: index > 0 ? group.uidFor(group.rows[index - 1]) : null,
      nextId: index < group.rows.length - 1 ? group.uidFor(group.rows[index + 1]) : null,
      panels: [
        audioPlaybackToolbar(
          context.audio,
          context.audio.commands || [],
          context.audio.dpcm?.samples || [],
          {record: true, controls},
        ),
        ...audioRecordPanels(group.kind, row),
        ...(group.kind === "catalog" && row.kind === "command" ? [panel("命令字段",
          `<div data-audio-command-fields="${esc(uid)}"></div>`, {wide: true})] : []),
        audioRecordReferencePanel(resourceUid),
      ],
    });
  }
  return null;
}
