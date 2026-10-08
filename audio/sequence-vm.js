// @editor-module 音序流的确定性模拟执行
//
// 这是 `mm_audio._resolve_stream_execution` 的浏览器实现。两边跑同一套语义，
// 输出逐字段相同（对拍见 engine/tests/audio_sequence_vm_parity.mjs）。
//
// 为什么要有它：`executions` 是**计算缓存**，不是内容表——每行都是对一条音序流
// 做一次模拟执行留下的轨迹，没有自己的 ROM 地址（地址在 `instructions` 行上）。
// 已发布的 sequence graph、playback 与 DPCM JSON 足以重算；缓存不该进发布包，预览
// 也不该依赖 Python、ROM baseline 或构建产物（见项目生命周期文档 §5）。
//
// 所有运行时事实都从已发布数据读：窗口、预算与栈上限在
// `sequence_graph.decoder`，voice 指针在 `sequence_graph.voice_table`，音高 timer
// 在 `audio.playback.period_table.entries`，时钟与噪声周期也在 `audio.playback`。
// BA 切到未来的自定义周期表时，只有该表也被发布后才能解析；当前严格 fail-closed，
// 绝不按 CPU 地址回退读取 ROM。

const EXECUTION_STATE_FIELDS = Object.freeze([
  "duration_raw",
  "transpose_raw",
  "gate_ratio_raw",
  "fine_timer_offset_raw",
  "duty_state_raw",
  "auto_duty_enabled",
  "auto_duty_interval",
  "envelope_flags_raw",
  "envelope_or_gate_rate_raw",
  "voice_id",
  "voice_pointer",
  "sweep_raw",
  "note_period_reload_enabled",
  "period_table_pointer",
  "tempo_increment_raw",
  "base_timer_raw",
  "sfx_volume_raw",
  "sfx_duty_raw",
  "pitch_mod_limit_or_delay_raw",
  "pitch_mod_phase_increment_raw",
  "pitch_mod_timer_delta_raw",
]);

const hex = (value, width) =>
  `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

const signed8 = (value) => (value < 0x80 ? value : value - 0x100);

/** 八位 DEC-until-zero 计数器把 0 编码成 256 拍。 */
const counterTicks = (value) => (value ? value : 0x100);

/**
 * 与 Python `round(x, 6)` 同值。
 *
 * JS 没有等价内建：`toFixed` 按十进制字符串四舍五入，Python 按 double 的真实值
 * 取最近的六位小数、并列时取偶。这里先用 toFixed 拿候选，再比较两个候选到原值
 * 的距离，平局取偶——和 CPython 的 _Py_dg_dtoa 路径一致。
 */
function round6(value) {
  if (!Number.isFinite(value)) return value;
  const scale = 1e6;
  const scaled = value * scale;
  const low = Math.floor(scaled);
  const high = low + 1;
  const lowDiff = Math.abs(value - low / scale);
  const highDiff = Math.abs(high / scale - value);
  if (lowDiff < highDiff) return low / scale;
  if (highDiff < lowDiff) return high / scale;
  return (low % 2 === 0 ? low : high) / scale;
}

/** 已发布的窗口表 → `_sequence_prg_offset` / `_sequence_cpu_address` 用的形状。 */
function sequenceWindows(decoder) {
  const windows = new Map();
  for (const entry of decoder?.windows || []) {
    const address = entry.address || {};
    const cpuStart = Number(address.cpu_address);
    windows.set(entry.selected_bank ?? null, {
      id: entry.id,
      prgStart: Number(address.offset),
      prgEnd: Number(address.end_exclusive),
      cpuStart,
      cpuEnd: cpuStart + Number(address.length),
    });
  }
  return windows;
}

const BANKED = new Set([0x0d, 0x0e, 0x0f]);

function publishedInteger(value, label, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be an integer in ${minimum}..${maximum}`);
  }
  return value;
}

/**
 * graph.voice_table 是 voice id → 程序入口的唯一运行时事实来源。
 * 只有已经解码出 program 的行可用于试听；修改后未确认、保留项与缺行都返回 null。
 */
function publishedVoicePointers(graph) {
  if (!Array.isArray(graph?.voice_table)) {
    throw new TypeError("sequence_graph.voice_table must be a published array");
  }
  const pointers = new Map();
  for (const entry of graph.voice_table) {
    const voiceId = publishedInteger(
      entry?.id,
      "sequence_graph.voice_table[].id",
      0,
      0xff,
    );
    if (pointers.has(voiceId)) {
      throw new TypeError(`duplicate sequence_graph.voice_table id ${voiceId}`);
    }
    const decoded = String(entry?.status || "").startsWith("decoded-");
    if (!decoded || !entry?.program) {
      pointers.set(voiceId, null);
      continue;
    }
    pointers.set(
      voiceId,
      publishedInteger(
        entry.pointer,
        `sequence_graph.voice_table[${voiceId}].pointer`,
        0,
        0xffff,
      ),
    );
  }
  return pointers;
}

/** playback.period_table.entries 是 timer 与原始两字节的唯一运行时来源。 */
function publishedPeriodTable(playback) {
  const table = playback?.period_table;
  if (!table || !Array.isArray(table.entries) || !table.entries.length) {
    throw new TypeError(
      "audio.playback.period_table.entries must be a non-empty published array",
    );
  }
  const pointer = publishedInteger(
    table.pointer,
    "audio.playback.period_table.pointer",
    0,
    0xffff,
  );
  const declaredCount = publishedInteger(
    table.entry_count,
    "audio.playback.period_table.entry_count",
    1,
    0x80,
  );
  if (declaredCount !== table.entries.length) {
    throw new TypeError(
      "audio.playback.period_table.entry_count must equal entries.length",
    );
  }
  const sourceAddress = table.pointer_initialiser;
  if (
    !sourceAddress ||
    sourceAddress.space !== "prg" ||
    !Number.isInteger(sourceAddress.offset)
  ) {
    throw new TypeError(
      "audio.playback.period_table.pointer_initialiser must be a published PRG address",
    );
  }
  const entries = table.entries.map((entry, index) => {
    if (entry?.index !== index) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].index must equal ${index}`,
      );
    }
    const timer = publishedInteger(
      entry.timer,
      `audio.playback.period_table.entries[${index}].timer`,
      0,
      0xffff,
    );
    if (
      !Array.isArray(entry.raw_bytes) ||
      entry.raw_bytes.length !== 2 ||
      entry.raw_bytes.some(value => !Number.isInteger(value) || value < 0 || value > 0xff)
    ) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].raw_bytes must contain two bytes`,
      );
    }
    if ((entry.raw_bytes[0] | (entry.raw_bytes[1] << 8)) !== timer) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}] timer/raw_bytes disagree`,
      );
    }
    const address = entry.address;
    if (!address || address.space !== "prg" || !Number.isInteger(address.offset)) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].address must be a published PRG address`,
      );
    }
    return {timer, rawBytes: entry.raw_bytes, address};
  });
  return {pointer, entries, sourceAddress};
}

export function createSequenceVm({graph, playback, dpcm}) {
  const decoder = graph?.decoder || {};
  // 参数组数是参数表长度除以每组 3 字节（rate/flags、$4012 start、$4013 length），
  // 不是 DPCM 速率表的条目数——两者一个 14 一个 16。
  const dpcmParameterCount = Number(dpcm?.parameter_table?.length ?? 0) / 3;
  const windows = sequenceWindows(decoder);
  const local = windows.get(null);
  const stepBudget = Number(decoder.execution_step_budget_per_stream);
  const eventBudget = Number(decoder.execution_event_budget_per_stream);
  const stackLimits = decoder.stack_limits || {};
  const loopALimit = Number(stackLimits.loop_a);
  const loopBLimit = Number(stackLimits.loop_b);
  const callLimit = Number(stackLimits.call);

  const voicePointers = publishedVoicePointers(graph);
  const periodTable = publishedPeriodTable(playback);
  const defaultPeriodTableCpu = periodTable.pointer;
  const defaultPeriodTableCount = periodTable.entries.length;
  const periodTableSourceAddress = periodTable.sourceAddress;

  const cpuClockHz = Number(playback?.timing?.cpu_clock_hz);
  const noiseTimerPeriods = playback?.noise?.timer_periods_cpu_cycles || [];

  function sequencePrgOffset(cpuAddress, selectedBank) {
    if (cpuAddress >= 0x8000 && cpuAddress < 0xa000 && BANKED.has(selectedBank)) {
      const window = windows.get(selectedBank);
      const prgOffset = window.prgStart + cpuAddress - 0x8000;
      return prgOffset < window.prgEnd ? prgOffset : null;
    }
    if (cpuAddress >= local.cpuStart && cpuAddress < local.cpuEnd) {
      return local.prgStart + cpuAddress - local.cpuStart;
    }
    return null;
  }

  const sequenceContextId = (selectedBank) =>
    selectedBank === null || selectedBank === undefined
      ? "bank-1d-local"
      : `bank-${selectedBank.toString(16).padStart(2, "0")}`;

  const sequenceInstructionId = (selectedBank, parserMode, channelKey, prgOffset) =>
    `audio-seq-i:${sequenceContextId(selectedBank)}:${parserMode}:` +
    `${channelKey}:${prgOffset.toString(16).padStart(6, "0")}`;

  function validVoicePointer(voiceId) {
    return voicePointers.get(voiceId) ?? null;
  }

  function initialExecutionState(parserMode, channelIndex) {
    const music = parserMode === "music";
    const soundEffect = parserMode === "sound-effect";
    return {
      duration_raw: music ? 1 : null,
      transpose_raw: music ? 0 : null,
      gate_ratio_raw: music ? 0 : null,
      fine_timer_offset_raw: music ? 0 : null,
      duty_state_raw: null,
      auto_duty_enabled: music ? false : null,
      auto_duty_interval: null,
      envelope_flags_raw: music ? 0 : null,
      envelope_or_gate_rate_raw: null,
      voice_id: null,
      voice_pointer: null,
      sweep_raw: music && (channelIndex === 0 || channelIndex === 1) ? 0x08 : null,
      note_period_reload_enabled: music ? false : null,
      period_table_pointer: music ? defaultPeriodTableCpu : null,
      // tempo 是全局量而不是每条轨的，所有轨解析完之后才挂到各命令上。
      tempo_increment_raw: null,
      base_timer_raw: soundEffect ? 0 : null,
      sfx_volume_raw: soundEffect ? 0 : null,
      // $A50D 只初始化脉冲声道的 SFX duty；三角/噪声的输出路径不读这个别名，
      // 所以它们的值不编造。
      sfx_duty_raw: soundEffect && (channelIndex === 0 || channelIndex === 1) ? 2 : null,
      pitch_mod_limit_or_delay_raw: null,
      pitch_mod_phase_increment_raw: null,
      pitch_mod_timer_delta_raw: null,
    };
  }

  const stateKey = (state) =>
    JSON.stringify(EXECUTION_STATE_FIELDS.map((field) => state[field]));

  function stateSnapshot(state, index) {
    const snapshot = {index};
    for (const field of EXECUTION_STATE_FIELDS) snapshot[field] = state[field];
    const duration = state.duration_raw;
    snapshot.duration_effective_tempo_ticks =
      duration === null ? null : counterTicks(duration);
    const transpose = state.transpose_raw;
    snapshot.transpose_signed_semitones =
      transpose === null ? null : signed8(transpose);
    const fine = state.fine_timer_offset_raw;
    snapshot.fine_timer_offset_signed = fine === null ? null : signed8(fine);
    for (const field of [
      "voice_pointer",
      "period_table_pointer",
      "tempo_increment_raw",
      "base_timer_raw",
    ]) {
      const value = state[field];
      snapshot[`${field}_hex`] = value === null ? null : hex(value, 4);
    }
    return snapshot;
  }

  /** $A935-$A9A2 的定时器查表，逐字段照抄。 */
  function musicNotePlaybackFields({
    channelIndex,
    pitchNibble,
    transposeRaw,
    periodTablePointer,
    fineTimerOffsetRaw,
    periodTableSource,
  }) {
    const transposeSum = (transposeRaw + pitchNibble) & 0xff;
    const sourceAddress = periodTableSource.source_address;
    const sourceFields = {
      period_table_pointer_source_kind: periodTableSource.kind,
      period_table_pointer_source_instruction_id:
        periodTableSource.instruction_id ?? null,
      period_table_pointer_source_prg_offset: sourceAddress.offset,
      period_table_pointer_source_prg_offset_hex: hex(sourceAddress.offset, 6),
    };
    if (channelIndex === 3) {
      const timerPeriod = noiseTimerPeriods[pitchNibble];
      return {
        period_table_lookup_status: "not-applicable-noise-channel",
        period_table_pointer: periodTablePointer,
        period_table_pointer_hex: hex(periodTablePointer, 4),
        ...sourceFields,
        period_table_index: null,
        period_table_byte_offset: null,
        period_table_entry_prg_offset: null,
        period_table_timer_raw: null,
        fine_timer_offset_raw: fineTimerOffsetRaw,
        fine_timer_offset_signed: signed8(fineTimerOffsetRaw),
        effective_apu_timer: null,
        apu_frequency_hz: null,
        noise_period_index: pitchNibble,
        noise_timer_period_cpu_cycles: timerPeriod,
        noise_shift_register_clock_hz: round6(cpuClockHz / timerPeriod),
        noise_mode_bit: 0,
        noise_register_value: pitchNibble,
      };
    }

    // $A94B-$A953 是八位 ADC 后接 ASL A，所以间接 Y 的字节偏移把 $80-$FF 折回
    // $00-$7F。
    const tableIndex = transposeSum & 0x7f;
    const byteOffset = (transposeSum << 1) & 0xff;
    const entryCpu = (periodTablePointer + byteOffset) & 0xffff;
    let lookupStatus;
    if (periodTablePointer !== defaultPeriodTableCpu) {
      // BA 可以把指针切去任意地址，但 JSON 里没有该表就没有可验证的 timer。
      // 物理地址看起来可映射也不代表它是一张周期表，因此不能回退 ROM 猜读。
      lookupStatus = "unresolved-custom-period-table-not-published";
    } else if (tableIndex >= defaultPeriodTableCount) {
      lookupStatus = "index-outside-confirmed-default-table";
    } else {
      lookupStatus = "resolved-confirmed-default-table";
    }

    const common = {
      period_table_lookup_status: lookupStatus,
      period_table_pointer: periodTablePointer,
      period_table_pointer_hex: hex(periodTablePointer, 4),
      ...sourceFields,
      period_table_index_sum_raw: transposeSum,
      period_table_index: tableIndex,
      period_table_byte_offset: byteOffset,
      period_table_entry_cpu: entryCpu,
      period_table_entry_cpu_hex: hex(entryCpu, 4),
      fine_timer_offset_raw: fineTimerOffsetRaw,
      fine_timer_offset_signed: signed8(fineTimerOffsetRaw),
    };
    if (!lookupStatus.startsWith("resolved-")) {
      return {
        ...common,
        period_table_entry_prg_offset: null,
        period_table_entry_prg_offset_hex: null,
        period_table_entry_raw_low: null,
        period_table_entry_raw_high: null,
        period_table_timer_raw: null,
        effective_timer_before_11bit_mask: null,
        effective_apu_timer: null,
        apu_frequency_hz: null,
      };
    }

    const entry = periodTable.entries[tableIndex];
    const entryPrg = entry.address.offset;
    const rawLow = entry.rawBytes[0];
    const rawHigh = entry.rawBytes[1];
    const tableTimer = entry.timer;
    const signedOffset = signed8(fineTimerOffsetRaw);
    const unwrappedTimer = tableTimer + signedOffset;
    const timer16 = unwrappedTimer & 0xffff;
    const timer11 = timer16 & 0x07ff;
    const divider = channelIndex === 2 ? 32 : 16;
    return {
      ...common,
      period_table_entry_prg_offset: entryPrg,
      period_table_entry_prg_offset_hex: hex(entryPrg, 6),
      period_table_entry_raw_low: rawLow,
      period_table_entry_raw_high: rawHigh,
      period_table_timer_raw: tableTimer,
      period_table_timer_raw_hex: hex(tableTimer, 4),
      fine_offset_unwrapped_timer: unwrappedTimer,
      fine_offset_16bit_wrap_status:
        unwrappedTimer >= 0 && unwrappedTimer <= 0xffff ? "no-wrap" : "wrapped-16-bit",
      effective_timer_before_11bit_mask: timer16,
      effective_timer_before_11bit_mask_hex: hex(timer16, 4),
      effective_apu_timer: timer11,
      effective_apu_timer_hex: hex(timer11, 3),
      apu_timer_register_low: timer11 & 0xff,
      apu_timer_register_high_bits: (timer11 >> 8) & 0x07,
      apu_frequency_divider: divider,
      apu_frequency_hz: round6(cpuClockHz / (divider * (timer11 + 1))),
    };
  }

  /**
   * 跑一条轨，带具体的循环栈与子流调用栈。
   *
   * @param stream 已发布的 `sequence_graph.streams` 行
   * @param instructionsById uid → 已发布的 `sequence_graph.instructions` 行
   */
  function resolveExecution(stream, instructionsById) {
    const streamId = String(stream.id);
    const executionId = streamId.replace("audio-seq-s:", "audio-seq-x:");
    const parserMode = String(stream.parser_mode);
    const selectedBank = stream.selected_sequence_bank ?? null;
    const channelIndex = Number(stream.channel_index);
    const channelKey = String(stream.channel_key);
    if (parserMode !== "music" && parserMode !== "sound-effect") {
      return {
        id: executionId,
        stream_id: streamId,
        parser_mode: parserMode,
        status: "not-resolved-unknown-parser-mode",
        termination: {kind: "unknown-parser-mode"},
        executed_instruction_steps: 0,
        event_count: 0,
        events: [],
        state_snapshots: [],
        resolved_dynamic_edges: [],
      };
    }

    const state = initialExecutionState(parserMode, channelIndex);
    const initialUnknownFields = EXECUTION_STATE_FIELDS.filter(
      (field) => state[field] === null,
    );
    let initialStateEvidence;
    if (parserMode === "sound-effect") {
      initialStateEvidence = {
        base_timer_raw: {value: 0, source: "$A4F9/$A4FC"},
        sfx_volume_raw: {value: 0, source: "$A4FF"},
        effect_delay_counter_raw: {value: 1, source: "$A502-$A504"},
        sfx_duty_raw:
          channelIndex === 0 || channelIndex === 1
            ? {value: 2, source: "$A50B-$A50D"}
            : {
                value: null,
                status:
                  "not-initialised-and-not-read-by-this-channel-output-path",
                source: "$A507-$A519 and $A8D1 channel branch",
              },
      };
    } else {
      initialStateEvidence = {
        duration_raw: {value: 1, source: "$A461-$A466"},
        transpose_raw: {value: 0, source: "$A455"},
        gate_ratio_raw: {value: 0, source: "$A45E"},
        fine_timer_offset_raw: {value: 0, source: "$A45B"},
        envelope_flags_raw: {value: 0, source: "$A452"},
        period_table_pointer: {
          value: defaultPeriodTableCpu,
          value_hex: hex(defaultPeriodTableCpu, 4),
          source: "$A069-$A070 driver initialiser",
          source_address: periodTableSourceAddress,
        },
      };
    }
    let periodTableSource = {
      kind: "driver-initialiser",
      pointer: defaultPeriodTableCpu,
      pointer_hex: hex(defaultPeriodTableCpu, 4),
      source_address: periodTableSourceAddress,
    };

    const stateSnapshots = [];
    const stateSnapshotIndices = new Map();
    const internState = () => {
      const key = stateKey(state);
      const existing = stateSnapshotIndices.get(key);
      if (existing !== undefined) return existing;
      const index = stateSnapshots.length;
      stateSnapshotIndices.set(key, index);
      stateSnapshots.push(stateSnapshot(state, index));
      return index;
    };

    const events = [];
    const initialStateIndex = internState();

    const appendEvent = (instructionId, kind, fields) => {
      if (events.length >= eventBudget) return false;
      const eventIndex = events.length;
      events.push({
        id: `${executionId}:event:${eventIndex}`,
        index: eventIndex,
        kind,
        instruction_id: instructionId,
        state_index: internState(),
        ...fields,
      });
      return true;
    };

    const loopA = [];
    const loopB = [];
    const callStack = [];
    const maxDepths = {loop_a: 0, loop_b: 0, call: 0};
    const instructionCounts = new Map();
    const firstSeenStructuralStates = new Map();
    const seenFullParserStates = new Map();
    let firstStructuralReturn = null;
    const dynamicEdges = new Map();

    function recordDynamicEdge(sourceId, kind, targetCpu) {
      let targetId = null;
      if (targetCpu !== null && targetCpu !== undefined) {
        const targetPrg = sequencePrgOffset(targetCpu, selectedBank);
        if (targetPrg !== null) {
          targetId = sequenceInstructionId(
            selectedBank,
            parserMode,
            channelKey,
            targetPrg,
          );
        }
      }
      const key = `${sourceId}\u0000${kind}\u0000${targetId ?? ""}`;
      let edge = dynamicEdges.get(key);
      if (edge === undefined) {
        edge = {
          source_instruction_id: sourceId,
          target_instruction_id: targetId,
          kind,
          status: "resolved-by-parser-stack-execution",
          occurrence_count: 0,
        };
        if (targetCpu !== null && targetCpu !== undefined) {
          edge.target_pointer = targetCpu;
          edge.target_pointer_hex = hex(targetCpu, 4);
        }
        dynamicEdges.set(key, edge);
      }
      edge.occurrence_count += 1;
    }

    const update8 = (field, operation, operand = 1) => {
      const current = state[field];
      if (current === null) return;
      state[field] =
        operation === "add" ? (current + operand) & 0xff : (current - operand) & 0xff;
    };
    const update16 = (field, operation, operand) => {
      const current = state[field];
      if (current === null) return;
      state[field] =
        operation === "add"
          ? (current + operand) & 0xffff
          : (current - operand) & 0xffff;
    };

    let pcCpu = Number(stream.entry_pointer);
    let steps = 0;
    let termination = null;

    while (steps < stepBudget) {
      const controlKey = `${pcCpu}\u0000${JSON.stringify(loopA)}\u0000${JSON.stringify(
        loopB,
      )}\u0000${JSON.stringify(callStack)}`;
      const currentState = stateKey(state);
      const previousStructural = firstSeenStructuralStates.get(controlKey);
      if (previousStructural !== undefined && firstStructuralReturn === null) {
        const [previousStep, previousEvent, previousState] = previousStructural;
        const previousValues = JSON.parse(previousState);
        const currentValues = JSON.parse(currentState);
        const stateChanges = [];
        EXECUTION_STATE_FIELDS.forEach((field, position) => {
          if (previousValues[position] !== currentValues[position]) {
            stateChanges.push({
              field,
              cycle_entry_value: previousValues[position],
              cycle_return_value: currentValues[position],
            });
          }
        });
        firstStructuralReturn = {
          first_structural_return_pointer: pcCpu,
          first_structural_return_pointer_hex: hex(pcCpu, 4),
          first_structural_return_start_step: previousStep,
          first_structural_return_step_count: steps - previousStep,
          first_structural_return_start_event_index: previousEvent,
          first_structural_return_event_count: events.length - previousEvent,
          modeled_parser_state_stable_at_first_control_return:
            stateChanges.length === 0,
          modeled_parser_state_changes_at_first_control_return: stateChanges,
        };
      }
      const fullKey = `${controlKey}\u0000${currentState}`;
      const previousFull = seenFullParserStates.get(fullKey);
      if (previousFull !== undefined) {
        const [previousStep, previousEvent] = previousFull;
        termination = {
          kind: "structural-control-cycle",
          structural_cycle_entry_pointer: pcCpu,
          structural_cycle_entry_pointer_hex: hex(pcCpu, 4),
          structural_cycle_start_step: previousStep,
          structural_cycle_step_count: steps - previousStep,
          structural_cycle_start_event_index: previousEvent,
          structural_cycle_event_count: events.length - previousEvent,
          modeled_parser_state_cycle_confirmed: true,
          ...(firstStructuralReturn || {}),
        };
        break;
      }
      if (!firstSeenStructuralStates.has(controlKey)) {
        firstSeenStructuralStates.set(controlKey, [
          steps,
          events.length,
          currentState,
        ]);
      }
      seenFullParserStates.set(fullKey, [steps, events.length]);

      const prgOffset = sequencePrgOffset(pcCpu, selectedBank);
      if (prgOffset === null) {
        termination = {
          kind: "outside-confirmed-sequence-windows",
          target_pointer: pcCpu,
          target_pointer_hex: hex(pcCpu, 4),
        };
        break;
      }
      const instructionId = sequenceInstructionId(
        selectedBank,
        parserMode,
        channelKey,
        prgOffset,
      );
      const node = instructionsById.get(instructionId);
      if (node === undefined) {
        termination = {
          kind: "instruction-not-in-conservative-graph",
          instruction_id: instructionId,
          target_pointer: pcCpu,
          target_pointer_hex: hex(pcCpu, 4),
        };
        break;
      }
      if (String(node.flow) === "unknown-stop") {
        termination = {
          kind: String(node.status),
          instruction_id: instructionId,
          opcode: Number(node.opcode),
        };
        break;
      }

      instructionCounts.set(
        instructionId,
        (instructionCounts.get(instructionId) || 0) + 1,
      );
      steps += 1;
      const opcode = Number(node.opcode);
      const raw = (node.raw_bytes || []).map(Number);
      const operands = raw.slice(1);
      const nextCpu = (pcCpu + Number(node.length)) & 0xffff;

      if (opcode < 0x90) {
        if (parserMode === "music" && opcode < 0x80) {
          state.duration_raw = opcode;
        } else if (parserMode === "music") {
          const pitchNibble = opcode - 0x80;
          const durationRaw = state.duration_raw;
          const transpose = state.transpose_raw;
          const eventFields = {
            raw_value: opcode,
            raw_value_hex: hex(opcode, 2),
            pitch_nibble: pitchNibble,
            duration_raw: durationRaw,
            duration_effective_tempo_ticks: counterTicks(durationRaw),
            transpose_raw: transpose,
            transpose_signed_semitones: signed8(transpose),
            ...musicNotePlaybackFields({
              channelIndex,
              pitchNibble,
              transposeRaw: transpose,
              periodTablePointer: state.period_table_pointer,
              fineTimerOffsetRaw: state.fine_timer_offset_raw,
              periodTableSource,
            }),
          };
          if (!appendEvent(instructionId, "note", eventFields)) {
            termination = {kind: "event-budget", limit: eventBudget};
            break;
          }
        } else if (
          !appendEvent(instructionId, "effect-delay", {
            duration_raw: opcode,
            duration_effective_driver_updates: counterTicks(opcode),
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
        pcCpu = nextCpu;
        continue;
      }

      if (opcode === 0x91) update8("transpose_raw", "add", 12);
      else if (opcode === 0x92) update8("transpose_raw", "subtract", 12);
      else if (opcode === 0x93) state.transpose_raw = operands[0];
      else if (opcode === 0x94) state.gate_ratio_raw = operands[0];
      else if (opcode === 0x96) state.duty_state_raw = operands[0];
      else if (opcode === 0x97) {
        state.auto_duty_enabled = true;
        state.auto_duty_interval = operands[0];
      } else if (opcode === 0x98) {
        state.auto_duty_enabled = false;
        state.duty_state_raw = 2;
      } else if (opcode === 0x99) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw = flags === null ? null : (flags | 0x40) & 0xcf;
        state.envelope_or_gate_rate_raw = operands[0];
      } else if (opcode === 0x9a) {
        const flags = state.envelope_flags_raw;
        if (channelIndex === 2) {
          state.envelope_flags_raw = flags === null ? null : (flags | 0x40) & 0xcf;
        } else {
          state.envelope_flags_raw = flags === null ? null : (flags | 0x60) & 0xef;
          state.voice_id = operands[0];
          state.voice_pointer = validVoicePointer(operands[0]);
        }
        state.envelope_or_gate_rate_raw = operands[1];
      } else if (opcode === 0x9b) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw =
          flags === null ? null : ((flags | 0x50) & 0xdf) | operands[0];
      } else if (opcode === 0x9c) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw =
          flags === null ? null : (flags | 0x70) | operands[0];
      } else if (opcode === 0x9d) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw = flags === null ? null : flags & 0x8f;
      } else if (opcode === 0x9e) state.sweep_raw = operands[0];
      else if (opcode === 0x9f) state.note_period_reload_enabled = true;
      else if (opcode === 0xa0) state.note_period_reload_enabled = false;
      else if (opcode === 0xa7) state.sfx_volume_raw = operands[0];
      else if (opcode === 0xa8) {
        state.base_timer_raw = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xa9) state.sfx_duty_raw = operands[0];
      else if (opcode === 0xab) update8("sfx_volume_raw", "add", operands[0]);
      else if (opcode === 0xac) update16("base_timer_raw", "add", operands[0]);
      else if (opcode === 0xad) update8("sfx_volume_raw", "add");
      else if (opcode === 0xaf) update8("sfx_duty_raw", "add");
      else if (opcode === 0xb0) update8("sfx_volume_raw", "subtract", operands[0]);
      else if (opcode === 0xb1) update16("base_timer_raw", "subtract", operands[0]);
      else if (opcode === 0xb2) update8("sfx_volume_raw", "subtract");
      else if (opcode === 0xba) {
        state.period_table_pointer = operands[0] | (operands[1] << 8);
        periodTableSource = {
          kind: "sequence-opcode-BA",
          instruction_id: instructionId,
          pointer: state.period_table_pointer,
          pointer_hex: hex(state.period_table_pointer, 4),
          source_address: node.address,
        };
      } else if (opcode === 0xbb) {
        state.tempo_increment_raw = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xc1) state.fine_timer_offset_raw = operands[0];
      else if (opcode === 0xc3) {
        state.pitch_mod_limit_or_delay_raw = operands[0];
        state.pitch_mod_phase_increment_raw = operands[1];
        state.pitch_mod_timer_delta_raw = operands[2];
      } else if (opcode === 0xc4) {
        const parameterId = operands[0];
        if (
          !appendEvent(instructionId, "dpcm-trigger-attempt", {
            dpcm_parameter_id: parameterId,
            dpcm_parameter_status:
              parameterId >= 1 && parameterId <= dpcmParameterCount
                ? "valid-one-based-id"
                : "out-of-range-no-bounds-check",
            gate_condition: "$06FD < 0x0A",
            gate_value_status: "runtime-dependent-not-modeled",
            trigger_status: "conditional-runtime-attempt",
            unconditional_write: {address: 0x4015, address_hex: "0x4015", value: 0x0f},
            gated_writes: "$4010-$4013 followed by $4015=$1F",
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode >= 0xd0 && opcode <= 0xdf) {
        state.gate_ratio_raw = opcode & 0x0f;
      } else if (opcode >= 0xe0 && opcode <= 0xe3) {
        state.duty_state_raw = opcode & 0x0f;
      }

      if (opcode === 0x90) {
        let appended;
        if (parserMode === "music") {
          const durationRaw = state.duration_raw;
          appended = appendEvent(instructionId, "rest", {
            duration_raw: durationRaw,
            duration_effective_tempo_ticks: counterTicks(durationRaw),
          });
        } else {
          appended = appendEvent(instructionId, "silence-yield", {
            duration_status: "opcode-does-not-write-$0613",
          });
        }
        if (!appended) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode === 0xa6) {
        if (
          !appendEvent(instructionId, "effect-delay", {
            duration_raw: operands[0],
            duration_effective_driver_updates: counterTicks(operands[0]),
            parser_semantic_status:
              parserMode === "sound-effect"
                ? "confirmed-sound-effect-parser"
                : "opcode-handler-writes-sfx-counter-in-music-stream",
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode === 0xb9) {
        const registerBase = 0x4000 + channelIndex * 4;
        const writes = [
          {address: registerBase, address_hex: hex(registerBase, 4), value: operands[0]},
          {
            address: registerBase + 2,
            address_hex: hex(registerBase + 2, 4),
            value: operands[2],
          },
          {
            address: registerBase + 3,
            address_hex: hex(registerBase + 3, 4),
            value: operands[3],
          },
        ];
        if (channelIndex !== 2) {
          writes.splice(1, 0, {
            address: registerBase + 1,
            address_hex: hex(registerBase + 1, 4),
            value: operands[1],
          });
        }
        if (
          !appendEvent(instructionId, "raw-apu-frame", {
            register_writes: writes,
            consumed_register_1_value: operands[1],
            consumed_register_1_status:
              channelIndex === 2 ? "ignored-on-triangle" : "written",
            duration_raw: operands[4],
            duration_effective_driver_updates: counterTicks(operands[4]),
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      }

      if (opcode === 0xa1 || opcode === 0xa5) {
        pcCpu = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xa2) {
        termination = {kind: "music-channel-stop", instruction_id: instructionId};
        break;
      } else if (opcode === 0xa3) {
        if (loopA.length >= loopALimit) {
          termination = {
            kind: "loop-a-stack-overflow",
            instruction_id: instructionId,
            limit: loopALimit,
          };
          break;
        }
        const encodedCount = operands[0];
        loopA.push([nextCpu, counterTicks(encodedCount), encodedCount]);
        maxDepths.loop_a = Math.max(maxDepths.loop_a, loopA.length);
        pcCpu = nextCpu;
      } else if (opcode === 0xa4) {
        if (!loopA.length) {
          termination = {kind: "unmatched-loop-end-a", instruction_id: instructionId};
          break;
        }
        const frame = loopA[loopA.length - 1];
        const remaining = frame[1] - 1;
        if (remaining) {
          frame[1] = remaining;
          recordDynamicEdge(instructionId, "resolved-loop-a-back", frame[0]);
          pcCpu = frame[0];
        } else {
          loopA.pop();
          recordDynamicEdge(instructionId, "resolved-loop-a-exit", nextCpu);
          pcCpu = nextCpu;
        }
      } else if (opcode === 0xb6) {
        termination = {
          kind: "sound-effect-channel-stop",
          instruction_id: instructionId,
        };
        break;
      } else if (opcode === 0xbc) {
        if (loopB.length >= loopBLimit) {
          termination = {
            kind: "loop-b-stack-overflow",
            instruction_id: instructionId,
            limit: loopBLimit,
          };
          break;
        }
        const encodedCount = operands[0];
        loopB.push([nextCpu, counterTicks(encodedCount), encodedCount]);
        maxDepths.loop_b = Math.max(maxDepths.loop_b, loopB.length);
        pcCpu = nextCpu;
      } else if (opcode === 0xbd) {
        if (!loopB.length) {
          termination = {kind: "unmatched-loop-end-b", instruction_id: instructionId};
          break;
        }
        const frame = loopB[loopB.length - 1];
        const remaining = frame[1] - 1;
        if (remaining) {
          frame[1] = remaining;
          recordDynamicEdge(instructionId, "resolved-loop-b-back", frame[0]);
          pcCpu = frame[0];
        } else {
          loopB.pop();
          recordDynamicEdge(instructionId, "resolved-loop-b-exit", nextCpu);
          pcCpu = nextCpu;
        }
      } else if (opcode === 0xbe) {
        if (callStack.length >= callLimit) {
          termination = {
            kind: "substream-call-stack-overflow",
            instruction_id: instructionId,
            limit: callLimit,
          };
          break;
        }
        callStack.push(nextCpu);
        maxDepths.call = Math.max(maxDepths.call, callStack.length);
        pcCpu = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xbf) {
        if (!callStack.length) {
          termination = {
            kind: "top-level-substream-return",
            instruction_id: instructionId,
          };
          break;
        }
        const continuation = callStack.pop();
        recordDynamicEdge(instructionId, "resolved-substream-return", continuation);
        pcCpu = continuation;
      } else if (opcode === 0xc0) {
        termination = {
          kind: "driver-parse-update-abort",
          instruction_id: instructionId,
          global_mode_value: operands[0],
        };
        break;
      } else {
        pcCpu = nextCpu;
      }
    }
    // 循环正常跑完（没 break）就是撞了步数预算——每个 break 都先写 termination，
    // 所以「termination 仍为空」等价于 Python 那边 while...else 的分支。
    if (termination === null) {
      termination = {kind: "execution-step-budget", limit: stepBudget};
    }
    const terminationKind = String(termination.kind);
    let status;
    if (terminationKind === "structural-control-cycle") {
      status = "resolved-structural-control-cycle";
    } else if (
      terminationKind === "music-channel-stop" ||
      terminationKind === "sound-effect-channel-stop" ||
      terminationKind === "driver-parse-update-abort"
    ) {
      status = "resolved-terminal";
    } else if (terminationKind === "top-level-substream-return") {
      status = "resolved-top-level-return";
    } else {
      status = "partial-explicit-stop";
    }
    const finalStateIndex = internState();

    let playbackLoop;
    if (
      terminationKind === "structural-control-cycle" &&
      termination.modeled_parser_state_cycle_confirmed
    ) {
      const cycleStart = Number(termination.structural_cycle_start_event_index);
      const cycleCount = Number(termination.structural_cycle_event_count);
      playbackLoop = {
        status: "exact-modeled-parser-state-cycle",
        looping: true,
        intro_event_start_index: 0,
        intro_event_count: cycleStart,
        cycle_event_start_index: cycleStart,
        cycle_event_count: cycleCount,
        cycle_step_start: Number(termination.structural_cycle_start_step),
        cycle_step_count: Number(termination.structural_cycle_step_count),
        recommended_preview_event_limit: cycleStart + cycleCount,
        fidelity:
          "exact sequence-parser state and event cycle; per-driver-update envelope, " +
          "auto-duty and pitch-modulation evolution remains synthesiser work",
      };
    } else if (status === "resolved-terminal" || status === "resolved-top-level-return") {
      playbackLoop = {
        status: "finite-event-sequence",
        looping: false,
        intro_event_start_index: 0,
        intro_event_count: events.length,
        cycle_event_start_index: null,
        cycle_event_count: 0,
        recommended_preview_event_limit: events.length,
        fidelity:
          "exact sequence-parser events through terminal; per-driver-update envelope, " +
          "auto-duty and pitch-modulation evolution remains synthesiser work",
      };
    } else {
      playbackLoop = {
        status: "unresolved-disable-automatic-looping",
        looping: null,
        intro_event_start_index: 0,
        intro_event_count: events.length,
        cycle_event_start_index: null,
        cycle_event_count: null,
        recommended_preview_event_limit: events.length,
        fidelity: "execution stopped at an explicit decoder budget or unknown boundary",
      };
    }

    const executedIds = [...instructionCounts.keys()].sort();
    const repeatedCounts = executedIds
      .filter((id) => instructionCounts.get(id) > 1)
      .map((id) => ({instruction_id: id, execution_count: instructionCounts.get(id)}));

    const resolvedDynamicEdges = [...dynamicEdges.values()].sort((left, right) => {
      const leftKey = [
        left.source_instruction_id,
        left.kind,
        left.target_instruction_id || "",
      ];
      const rightKey = [
        right.source_instruction_id,
        right.kind,
        right.target_instruction_id || "",
      ];
      for (let position = 0; position < 3; position += 1) {
        if (leftKey[position] < rightKey[position]) return -1;
        if (leftKey[position] > rightKey[position]) return 1;
      }
      return 0;
    });

    return {
      id: executionId,
      stream_id: streamId,
      parser_mode: parserMode,
      status,
      termination,
      executed_instruction_steps: steps,
      executed_unique_instruction_count: instructionCounts.size,
      executed_instruction_ids: executedIds,
      repeated_instruction_counts: repeatedCounts,
      event_count: events.length,
      events,
      playback_loop: playbackLoop,
      state_snapshots: stateSnapshots,
      initial_state_index: initialStateIndex,
      final_state_index: finalStateIndex,
      initial_unknown_fields: initialUnknownFields,
      initial_state_evidence: initialStateEvidence,
      maximum_stack_depths: maxDepths,
      resolved_dynamic_edges: resolvedDynamicEdges,
    };
  }

  return {resolveExecution};
}
