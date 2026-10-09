import { uiPutRgb, nesPalette, $, esc, bindTextInputEvents, requireBrowserProjectRepository, showEditorError, paintChrTile, decodeChrTile, writeAccessMarker } from './element-tree-DsgOBeTK.js';
import { clearAutoSaveErrorsOf, textRecordRuntimeTokens, TEXT_CONTROL_CODES, textFillDetails, textRecordEditorTokens, textControlMarker, db, TEXT_RECORDS_RESOURCE_ID, editTextRecordFill, TEXT_FILL_OPERANDS, textRecord, decodeFixedTextRecord, textRecordEditorSelection, decodeFixedTextRecordSelection, textRecordEditorText, hasPendingAutoSaves, flushAllAutoSaves, exactFixedTextRecordBytes, fixedTextRecordBytes, textRecordEditorBytes, installEncodedTextRecord, textRecordRuntimeWritableRanges } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';

// @editor-module 通用 nametable 编辑器
//
// 一张 nametable 就是定长格子表：前 columns×rows 字节是 tile 编号，尾部是属性
// 表，一格属性管 4×4 tile。游戏里哪一屏用它、字节存在 CHR 还是 PRG、改动写到
// 哪个资源——全是调用方的事。所以这里只要几何、数据和两个写回回调，不认识任何
// 具体画面。
//
// 图块字节一律由调用方传入，并且应当来自 shared-chr-bank 的 original/working
// （engine/editor/core/media-assets.js）。本模块不自己取 CHR，也不写 CHR：
// 图元编辑是跨模块的通用能力，不能让每个用到 nametable 的页面各长一份。


const NAMETABLE_COLUMNS = 32;
const NAMETABLE_ROWS = 30;
const NAMETABLE_ATTRIBUTE_BASE = 0x3C0;
const TILE_BYTES = 16;
const PALETTE_MAX = 0x3F;
const PICKER_COLUMNS = 16;
const PICKER_TILES = 256;

const OUTLINE = [236, 88, 180];

const defaultGeometry = Object.freeze({
  columns: NAMETABLE_COLUMNS,
  rows: NAMETABLE_ROWS,
  attributeBase: NAMETABLE_ATTRIBUTE_BASE,
});

/** 属性表一格管 4×4 tile，组号由行列的第 1 位选出。 */
function attributeGroupAt(tiles, geometry, row, column) {
  const attribute = tiles[
    geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4)
  ];
  return (attribute >> (((row & 2) << 1) | (column & 2))) & 0x03;
}

/** 返回改写后的属性字节；调用方决定要不要落到自己的数据上。 */
function attributeByteWith(current, row, column, group) {
  const shift = ((row & 2) << 1) | (column & 2);
  return (current & ~(0x03 << shift)) | ((group & 0x03) << shift);
}

function attributeIndexAt(geometry, row, column) {
  return geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4);
}

function groupColours(palette, group, background) {
  const colours = [0, 1, 2, 3].map(index =>
    nesPalette[Number(palette[group * 4 + index] || 0) & PALETTE_MAX]
  );
  // 每个 tile 的颜色 0 都取整屏通用色，这是 PPU 行为而不是分组色。
  if (background) colours[0] = background;
  return colours;
}

function paintTilePixels(image, patterns, tile, originX, originY, colours) {
  const offset = Number(tile) * TILE_BYTES;
  if (offset + TILE_BYTES > patterns.length) return;
  for (let y = 0; y < 8; y += 1) {
    const low = patterns[offset + y];
    const high = patterns[offset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(image.data, image.width, originX + x, originY + y, colours[value]);
    }
  }
}

/**
 * 框一个区域。`dash` 是虚线周期（前一半实、后一半虚），给 0 画实线。
 *
 * 同一屏上常要同时框几种含义不同的区域——「这个组件的地盘」和「它实际占了
 * 多少格」不该长得一样重。颜色与线型因此可调，默认仍是原来的粉色虚线。
 */
function outlineBox(image, box, {colour = OUTLINE, dash = 4} = {}) {
  const right = box.x + box.width - 1;
  const bottom = box.y + box.height - 1;
  const on = offset => !dash || offset % dash < dash / 2;
  for (let x = box.x; x <= right; x += 1) {
    if (!on(x - box.x)) continue;
    uiPutRgb(image.data, image.width, x, box.y, colour);
    uiPutRgb(image.data, image.width, x, bottom, colour);
  }
  for (let y = box.y; y <= bottom; y += 1) {
    if (!on(y - box.y)) continue;
    uiPutRgb(image.data, image.width, box.x, y, colour);
    uiPutRgb(image.data, image.width, right, y, colour);
  }
}

function fillBackground(image, colour) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) uiPutRgb(image.data, image.width, x, y, colour);
  }
}

/**
 * 把一张 nametable 画进 image。
 *
 * `tiles` 是完整的一页（tile 区 + 属性区），`patterns` 是本屏映射后的图案表，
 * `palette` 是 32 字节整版调色板。精灵之类的叠加层由调用方在返回后自己画。
 */
function paintNametable(image, {tiles, patterns, palette, geometry = defaultGeometry}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintTilePixels(
        image, patterns, tiles[row * geometry.columns + column],
        column * 8, row * 8,
        groupColours(palette, attributeGroupAt(tiles, geometry, row, column), background)
      );
    }
  }
  return background;
}

/**
 * 按 PPU 的取景方式画一屏：若干页拼成一个平面，滚动量在平面上截一个窗口。
 *
 * 编辑视图按 nametable 原点画一页，那是「你能改哪一格」的视图；跑起来看到的却是
 * 滚动影子截出来的窗口，越过页边界就接上相邻的那一页，并在平面边界处绕回。
 * 两者只差这一个函数，所以别在调用方里另写一遍带取模的合成循环。
 *
 * `pages` 是按页排布的二维数组（`pages[行][列]`），每项是一整页格子表或 null。
 * 相邻关系由调用方按镜像方式给出——本模块不认识镜像寄存器。
 */
function paintNametableWindow(image, {
  pages, patterns, palette, scrollX = 0, scrollY = 0, geometry = defaultGeometry,
}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  const planeColumns = pages[0].length * geometry.columns;
  const planeRows = pages.length * geometry.rows;
  const originColumn = Math.floor(scrollX / 8);
  const originRow = Math.floor(scrollY / 8);
  // 多画一列一行：滚动量不是 8 的倍数时，首尾各有半格露在窗口里。
  const columns = Math.ceil(image.width / 8) + 1;
  const rows = Math.ceil(image.height / 8) + 1;
  for (let row = 0; row < rows; row += 1) {
    const planeRow = (originRow + row) % planeRows;
    for (let column = 0; column < columns; column += 1) {
      const planeColumn = (originColumn + column) % planeColumns;
      const page = pages[Math.floor(planeRow / geometry.rows)]
        [Math.floor(planeColumn / geometry.columns)];
      if (!page) continue;
      const pageRow = planeRow % geometry.rows;
      const pageColumn = planeColumn % geometry.columns;
      paintTilePixels(
        image, patterns, page[pageRow * geometry.columns + pageColumn],
        (originColumn + column) * 8 - scrollX,
        (originRow + row) * 8 - scrollY,
        groupColours(palette, attributeGroupAt(page, geometry, pageRow, pageColumn),
          background)
      );
    }
  }
  return background;
}

function cellFromEvent(canvas, event, geometry = defaultGeometry) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * geometry.columns);
  const row = Math.floor((event.clientY - rect.top) / rect.height * geometry.rows);
  if (row < 0 || row >= geometry.rows || column < 0 || column >= geometry.columns) {
    return null;
  }
  return {row, column};
}

function pickerTileFromEvent(canvas, event, {
  columns = PICKER_COLUMNS, rows = PICKER_TILES / PICKER_COLUMNS,
} = {}) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * columns);
  const row = Math.floor((event.clientY - rect.top) / rect.height * rows);
  if (column < 0 || column >= columns || row < 0 || row >= rows) return null;
  return row * columns + column;
}

/**
 * 绑定「按住拖动连续画」。
 *
 * `paint(cell)` 由调用方实现：它拿到格子坐标，自己决定改 tile 还是改属性、
 * 改到哪份数据上，返回是否真的变了。`onStroke` 在一笔开始前调用，适合压撤销栈。
 */
function bindNametablePainting(canvas, {
  enabled = true, geometry = defaultGeometry, paint, onStroke, onChange,
}) {
  if (!canvas || !enabled || typeof paint !== "function") return;
  let pointer = null;
  const stop = event => {
    if (pointer === null) return;
    if (event?.pointerId != null && event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
  };
  const apply = event => {
    const cell = cellFromEvent(canvas, event, geometry);
    if (cell && paint(cell)) onChange?.();
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (typeof enabled === 'function' && !enabled()) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    onStroke?.();
    apply(event);
  });
  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== pointer) return;
    if ((event.buttons & 1) === 0) {
      stop(event);
      return;
    }
    apply(event);
  });
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("lostpointercapture", stop);
}

// @editor-module 元图块行为码的已证实局部移动效果。
// 依据：project/evidence/reverse-engineering/metatile-attribute-bits/observations.md。
const effects = new Map([
  [0, "人物通过目标格"], [1, "改变位移方向"], [2, "改变位移方向"],
  [3, "人物通过目标格"], [4, "人物通过目标格，落点有别"],
  [5, "人物通过目标格"], [6, "人物通过；世界地图战车受阻"],
  [7, "人物通过目标格"], [8, "人物停在目标格前"],
  [9, "人物停在目标格前"], [10, "人物停在目标格前"],
  [11, "人物停在目标格前"], [12, "人物停在目标格前"],
  [13, "通过；同格有入口时转场"], [14, "人物通过目标格"],
  [15, "人物通过目标格"], [16, "人物停在目标格前"],
  [17, "人物通过目标格"], [18, "人物通过目标格"],
  [19, "人物通过目标格"], [20, "此处转入另一场景"],
  [21, "人物通过目标格"], [22, "人物停在目标格前"],
  [23, "人物停在目标格前"], [24, "人物停在目标格前"],
  ...Array.from({length: 7}, (_, index) => [25 + index, "人物通过目标格"]),
  [32, "人物停在目标格前"], [33, "人物停在目标格前"],
  [38, "人物停在目标格前"], [52, "人物停在目标格前"],
  [63, "人物停在目标格前"],
]);

const metatileBehaviorCode = attribute => (Number(attribute) >> 2) & 0x3f;
const metatileBehaviorLabel = code => effects.get(code) || "局部移动效果未确认";
const metatileBehaviorOptions = Array.from({length: 64}, (_, code) => ({
  code, label: `$${code.toString(16).toUpperCase().padStart(2, "0")} · ${metatileBehaviorLabel(code)}`,
}));

function metatileAttributeWithBehavior(attribute, code) {
  if (!Number.isInteger(attribute) || attribute < 0 || attribute > 255
      || !Number.isInteger(code) || code < 0 || code > 63)
    throw new TypeError("元图块行为码必须是 0–63 的整数");
  return (code << 2) | (attribute & 3);
}

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

const hex$1 = (value, width) =>
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

function createSequenceVm({graph, playback, dpcm}) {
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
      snapshot[`${field}_hex`] = value === null ? null : hex$1(value, 4);
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
      period_table_pointer_source_prg_offset_hex: hex$1(sourceAddress.offset, 6),
    };
    if (channelIndex === 3) {
      const timerPeriod = noiseTimerPeriods[pitchNibble];
      return {
        period_table_lookup_status: "not-applicable-noise-channel",
        period_table_pointer: periodTablePointer,
        period_table_pointer_hex: hex$1(periodTablePointer, 4),
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
      period_table_pointer_hex: hex$1(periodTablePointer, 4),
      ...sourceFields,
      period_table_index_sum_raw: transposeSum,
      period_table_index: tableIndex,
      period_table_byte_offset: byteOffset,
      period_table_entry_cpu: entryCpu,
      period_table_entry_cpu_hex: hex$1(entryCpu, 4),
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
      period_table_entry_prg_offset_hex: hex$1(entryPrg, 6),
      period_table_entry_raw_low: rawLow,
      period_table_entry_raw_high: rawHigh,
      period_table_timer_raw: tableTimer,
      period_table_timer_raw_hex: hex$1(tableTimer, 4),
      fine_offset_unwrapped_timer: unwrappedTimer,
      fine_offset_16bit_wrap_status:
        unwrappedTimer >= 0 && unwrappedTimer <= 0xffff ? "no-wrap" : "wrapped-16-bit",
      effective_timer_before_11bit_mask: timer16,
      effective_timer_before_11bit_mask_hex: hex$1(timer16, 4),
      effective_apu_timer: timer11,
      effective_apu_timer_hex: hex$1(timer11, 3),
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
          value_hex: hex$1(defaultPeriodTableCpu, 4),
          source: "$A069-$A070 driver initialiser",
          source_address: periodTableSourceAddress,
        },
      };
    }
    let periodTableSource = {
      kind: "driver-initialiser",
      pointer_hex: hex$1(defaultPeriodTableCpu, 4),
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
          edge.target_pointer_hex = hex$1(targetCpu, 4);
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
          first_structural_return_pointer_hex: hex$1(pcCpu, 4),
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
          structural_cycle_entry_pointer_hex: hex$1(pcCpu, 4),
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
          target_pointer_hex: hex$1(pcCpu, 4),
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
          target_pointer_hex: hex$1(pcCpu, 4),
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
            raw_value_hex: hex$1(opcode, 2),
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
          pointer_hex: hex$1(state.period_table_pointer, 4),
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
          {address: registerBase, address_hex: hex$1(registerBase, 4), value: operands[0]},
          {
            address: registerBase + 2,
            address_hex: hex$1(registerBase + 2, 4),
            value: operands[2],
          },
          {
            address: registerBase + 3,
            address_hex: hex$1(registerBase + 3, 4),
            value: operands[3],
          },
        ];
        if (channelIndex !== 2) {
          writes.splice(1, 0, {
            address: registerBase + 1,
            address_hex: hex$1(registerBase + 1, 4),
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

// @editor-module 从音频文档建立音序 VM，按执行身份缓存并按需计算轨迹。
//
// `executions` 不在发布包里：它是对每条音序流做一次模拟执行留下的轨迹，没有自己
// 的 ROM 地址，由已发布的音序图、playback 与 DPCM JSON 就能重算——是计算缓存，
// 不是内容表。存下来要 22.2 MiB，重算 231 条只要 0.6 秒（Python 与浏览器实测
// 同量级），所以两侧都现算。
//
// 这里负责两件事：从该音频文档建一个 VM、按 execution_id 记忆化。它不读取项目
// baseline，也不观察构建状态；因此导入后的 JSON 在，预览就能工作。


// 以完整音频文档身份为键：graph 或 playback 换版本都会随文档一起自然作废。
const caches = new WeakMap();

/**
 * 备好某份音频文档的执行解析器。渲染音乐与音效页之前调用一次。
 *
 * graph 不存在时返回 false；已声明 graph 却缺少运行所需 JSON 时抛出明确错误。
 * 这属于发布包契约损坏，不能偷偷回退到 ROM 或把整页伪装成「暂无执行」。
 */
async function ensureSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  if (!graph || !Array.isArray(graph.streams)) return false;
  const existing = caches.get(audio);
  if (existing?.ready) return true;
  // 失败不缓存：文档 hydrate/修复后，同一个对象可以重新尝试。
  if (existing?.pending) return existing.pending;
  const cache = existing || {ready: false, byId: new Map()};
  caches.set(audio, cache);
  cache.pending = Promise.resolve().then(() => {
    cache.vm = createSequenceVm({
      graph,
      playback: audio.playback,
      dpcm: audio.dpcm,
    });
    cache.instructions = new Map(
      (graph.instructions || []).map(item => [item.id, item]),
    );
    cache.streamsById = new Map(
      (graph.streams || []).map(item => [String(item.execution_id || ""), item]),
    );
    cache.ready = true;
    return true;
  }).finally(() => {
    cache.pending = null;
  });
  return cache.pending;
}

/**
 * 全部执行轨迹，按已发布的 streams 顺序。音乐与音效页的执行/事件总表要它。
 *
 * 231 条一起算是 0.6 秒量级，而且和逐条取共用同一份记忆化结果——先点开总表再
 * 播某一轨，不会算第二遍。
 */
function allSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready) return [];
  if (!cache.all) {
    cache.all = (graph.streams || [])
      .map(stream => sequenceExecution(audio, stream.execution_id))
      .filter(Boolean);
  }
  return cache.all;
}

/**
 * 取一条执行轨迹。必须先 `ensureSequenceExecutions`；没备好就返回 null，
 * 调用点按「这条轨没有可用执行」处理。
 */
function sequenceExecution(audio, executionId) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready || !executionId) return null;
  const id = String(executionId);
  const memoised = cache.byId.get(id);
  if (memoised !== undefined) return memoised;
  const stream = cache.streamsById.get(id);
  const resolved = stream
    ? cache.vm.resolveExecution(stream, cache.instructions)
    : null;
  cache.byId.set(id, resolved);
  return resolved;
}

// @editor-module 零依赖的 Metal Max 音序试听核心。
//
// 输入是 engine/tools/mm_audio.py 生成的 audio-index/v2 + audio-sequence/v2。
// 音高 timer 与 DPCM 原始字节必须已经内嵌在发布包中。执行轨迹（events /
// state_snapshots）不在包里，由 audio/executions.js 仅依据 audio index 与
// sequence graph JSON 现算——那是计算缓存，不是发布内容。缺少播放字段时
// 返回明确的不可播放原因。AudioContext 只会由
// unlock()/play*() 创建，因此调用方应从 click/pointerup 等用户手势中直接调用
// play*()。


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
        } else if (!options.channelKey) ;
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
      segment.timer & 15;
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


function createNesApuSynth(audio, options) {
  return new MetalMaxNesApuSynth(audio, options);
}

// @editor-module 地形行为处理器的电梯分派语义。
// 依据：project/evidence/reverse-engineering/scene-elevator-dynamic-list/observations.json。
function fieldElevatorSceneRanges(document) {
  const values = name => document?.blocks?.find(block =>
    block.id === `field-terrain-behavior-service.elevator-scene-${name}`)?.values;
  const lower = values('lower'), upper = values('upper');
  if (lower?.length !== 5 || upper?.length !== 5) throw new TypeError('电梯场景范围表未发布');
  return lower.map((value, instance) => [value, upper[instance]]);
}

function fieldElevatorInstance(sceneId, behaviorCode, document) {
  if (behaviorCode !== 0x11) return null;
  const instance = fieldElevatorSceneRanges(document).findIndex(([lower, upper]) =>
    sceneId >= lower && sceneId < upper);
  return instance < 0 ? null : instance;
}

function sceneHasElevatorDispatch(sceneId, document) {
  return fieldElevatorInstance(sceneId, 0x11, document) !== null;
}

// PRG $029034、$0290AA..$02911E 的移动前地形分派。
function fieldTerrainMotion(document, behaviorCode, animationStep) {
  const blocks = document?.blocks || document?.document?.blocks || [];
  const whitelist = blocks.find(block => block.id === "field-terrain-behavior-service.whitelist-b065")?.values || [];
  if (!whitelist.slice(0, whitelist.indexOf(0)).includes(behaviorCode)) return null;
  if (behaviorCode >= 1 && behaviorCode <= 4) {
    return {directionCode: behaviorCode, speedIndex: 2, transported: true};
  }
  if (behaviorCode < 6 || behaviorCode > 10 || !animationStep) return null;
  const directions = blocks.find(block => block.id === "field-terrain-behavior-service.conveyor-directions")?.values;
  const index = 2 * (animationStep + 1) + behaviorCode - 8;
  const directionCode = directions?.[index];
  return directionCode >= 1 && directionCode <= 4
    ? {directionCode, speedIndex: 0, transported: true} : null;
}

// @editor-module 外壳行为：导航栏收起、导航分组折叠与状态栏。


const COLLAPSE_KEY = "mm-editor.nav-collapsed";

const SIDEBAR_COLLAPSE_KEY = "mm-editor.sidebar-collapsed";

function bindSidebarToggle() {
  const button = $("#sidebar-toggle");
  const cacheButton = $("#sidebar-cache-toggle");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  const apply = collapsed => {
    document.body.dataset.sidebarCollapsed = String(collapsed);
    button.textContent = collapsed ? "›" : "‹";
    button.setAttribute("aria-expanded", String(!collapsed));
    const label = collapsed ? "展开导航栏" : "收起导航栏";
    button.setAttribute("aria-label", label);
    button.title = label;
    cacheButton?.setAttribute("aria-expanded", String(!collapsed));
  };
  try {
    apply(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true");
  } catch {
    apply(false);
  }
  const setCollapsed = collapsed => {
    apply(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(collapsed));
    } catch {
      // 浏览器禁止保存偏好时仍允许收起与展开。
    }
  };
  button.addEventListener("click", () => {
    setCollapsed(document.body.dataset.sidebarCollapsed !== "true");
  });
  cacheButton?.addEventListener("click", () => {
    setCollapsed(false);
    $("[data-cache-fill]")?.focus();
  });
}

function collapsedGroups() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistCollapsed(groups) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...groups]));
  } catch {
    // 隐私模式下 localStorage 可能不可写：折叠状态是便利功能，不值得中断渲染。
  }
}

/** 分组折叠。状态存本地，因为它是「这台机器上我怎么用」，不属于项目数据。 */
function bindNavigationTree() {
  const nav = $("#navigation");
  if (!nav) return;
  const restore = () => {
    const collapsed = collapsedGroups();
    for (const group of nav.querySelectorAll(".nav-group")) {
      const name = group.dataset.group || "";
      group.dataset.collapsed = String(collapsed.has(name));
    }
  };
  restore();
  if (nav.dataset.navigationTreeBound === "1") return;
  nav.dataset.navigationTreeBound = "1";
  // 页面导航重新挂载时恢复分组折叠状态。
  new MutationObserver(restore).observe(nav, {childList: true});
  nav.addEventListener("click", event => {
    const label = event.target.closest(".nav-label");
    if (!label) return;
    const group = label.closest(".nav-group");
    if (!group) return;
    const name = group.dataset.group || "";
    const next = group.dataset.collapsed !== "true";
    group.dataset.collapsed = String(next);
    const store = collapsedGroups();
    if (next) store.add(name);
    else store.delete(name);
    persistCollapsed(store);
  });
}

/** 当前页面的行数、选中、未保存与地址统一交给日志服务驱动状态栏。 */
function setStatus({rows, selection, dirty, address} = {}) {
  editorLog.setContext({rows, selection, dirty, address});
}

/**
 * 资源错误只上报统一日志，重试入口由日志页提供。
 */
function setResourceAlert({title = "资源加载失败", detail = "", retry, error} = {}) {
  return editorLog.error("资源载入", `${title}：${detail}`, error, {retry});
}

/** 表格页的通用状态：可见行 / 总行数，以及未保存条数。 */
function setTableStatus(visible, total, {dirty = 0, address = ""} = {}) {
  setStatus({
    rows: visible === total
      ? `${total} 行`
      : `${visible} / ${total} 行`,
    dirty: dirty ? `未保存 ${dirty}` : "",
    address,
  });
}

/**
 * 数据集事实：一行紧凑文字，不是一排数字方块。
 *
 * 旧版每页顶部铺 4-8 个 24px 大字方块，其中多数只是「表里有几行」——表格自己
 * 就在显示这件事，状态栏也在显示。方块把首屏让给了重复信息，真正的工作区被
 * 推到下面去了。
 *
 * 留下来的只有两种：表里数不出来的派生事实（去重后画面数、可达指令数），
 * 以及指向别处的资源链接。它们放在过滤条那一行，跟着表走。
 */
function datasetFacts(entries) {
  const cells = entries
    .filter(entry => entry && entry[1] !== null && entry[1] !== undefined)
    .map(([label, value]) => `<span><i>${label}</i>${value}</span>`)
    .join("");
  return cells ? `<div class="dataset-facts">${cells}</div>` : "";
}

// @editor-module 数据网格：列宽由列声明决定，长内容在单元格内换行。
// 列宽总和决定表格最小宽度，放不下时横向滚动。


const DEFAULT_COLUMN_WIDTH = 120;
const virtualTables = new Map();
const virtualTableBindings = new WeakMap();
const VIRTUAL_WINDOW = 18;
const VIRTUAL_ROW_HEIGHT = 52;

function columnWidth(column) {
  const declared = Number(column.width);
  return Number.isFinite(declared) && declared > 0
    ? declared
    : DEFAULT_COLUMN_WIDTH;
}
function contentWidth(value) {
  return Array.from(String(value ?? "")).reduce((total, character) =>
    total + (character.codePointAt(0) > 0xff ? 12 : 8), 24);
}

function fitColumn(column, rows) {
  if (!column.fit || column.width !== undefined || column.sticky) return column;
  let width = contentWidth(column.label);
  for (const row of rows) {
    width = Math.max(width, contentWidth(column.fitValue?.(row) ?? row[column.key]));
    if (width >= 240) break;
  }
  return {...column, width: Math.max(48, Math.min(240, width))};
}
/** 列定义 → <colgroup>，让宽度由列声明而不是内容决定。 */
function columnGroup(columns) {
  const declaredGrow = columns.findIndex(column => column.grow && !column.sticky);
  const growIndex = declaredGrow >= 0 ? declaredGrow : columns.reduce((selected, column, index) =>
    !column.sticky && (selected < 0
      || columnWidth(column) >= columnWidth(columns[selected])) ? index : selected, -1);
  return `<colgroup>${columns.map((column, index) =>
    index === growIndex ? "<col>" : `<col style="width:${columnWidth(column)}px">`
  ).join("")}</colgroup>`;
}

function tableMinWidth(columns) {
  return columns.reduce((total, column) => total + columnWidth(column), 0);
}

function headerCell(column, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  return `<th${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}
    ${column.title ? `title="${esc(column.title)}"` : ""}${column.reset ? ' aria-label="恢复原值"' : ''}>${esc(column.label)}</th>`;
}

// 前置固定列的偏移由前面几列的宽度累加。固定列应显式给 width；漏写时也要
// 使用统一兜底，否则浏览器无法在横向滚动时把它们钉住。
let stickyWidths = [];
function stickyOffset(index) {
  return stickyWidths.slice(0, index).reduce((total, width) => total + width, 0);
}

function bodyCell(column, row, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.wrap ? "wrap" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  const content = column.cell
    ? column.cell(row)
    : esc(row[column.key] ?? "");
  return `<td${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}>${content}</td>`;
}

/**
 * 不要在视图 CSS 里给表格补最小宽度：那会复制并漂移列定义。表被压扁时，
 * 请在 columns 的对应列声明 width；这里是汇总列宽并把最小宽度落到表格的唯一入口。
 */
function dataTable({
  columns,
  rows,
  renderRow = null,
  rowId = row => row.id,
  recordRoute = null,
  selectedId = null,
  empty = "没有匹配的记录",
  total = null,
  dirty = 0,
  reportStatus = true,
  virtualKey = null,
}) {
  // 行数报给状态栏。以前每页顶部都用一个大字方块说「N 条记录」——表格自己就在
  // 显示这件事，方块只是把工作区往下推。
  if (reportStatus) setTableStatus(rows.length, total === null ? rows.length : total, {dirty});
  const visible = columns.filter(column => column.hidden !== true)
    .map(column => fitColumn(column, rows));
  const widths = visible.map(column =>
    column.sticky ? columnWidth(column) : 0);
  stickyWidths = widths;
  const minWidth = tableMinWidth(visible);
  const rowHtml = row => {
    stickyWidths = widths;
    const id = rowId(row);
    const route = recordRoute ? recordRoute(row) : null;
    if (renderRow) return renderRow(row);
    return `<tr data-row-id="${esc(id)}"
      ${route ? `data-record-link="${esc(route)}"` : ""}
      ${String(id) === String(selectedId) ? 'aria-selected="true"' : ""}
    >${visible.map((column, index) => bodyCell(column, row, index)).join("")}</tr>`;
  };
  if (virtualKey !== null) virtualTables.set(virtualKey, {rows, rowHtml, columns: visible.length});
  if (!rows.length) {
    return `<div class="table-wrap"><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
      <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
      <tbody><tr><td class="table-empty" colspan="${visible.length}">${esc(empty)}</td></tr></tbody>
    </table></div>`;
  }
  return `<div class="table-wrap${virtualKey !== null ? ' virtual-table-wrap' : ''}"${virtualKey !== null ? ` data-virtual-table="${esc(virtualKey)}"` : ''}><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
    <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
    <tbody>${(virtualKey !== null ? rows.slice(0, VIRTUAL_WINDOW) : rows).map(rowHtml).join("")}${virtualKey !== null ? spacer(rows.length - VIRTUAL_WINDOW, visible.length, VIRTUAL_ROW_HEIGHT) : ''}</tbody>
  </table></div>`;
}

function spacer(count, columns, height) {
  return count > 0 ? `<tr class="virtual-table-spacer" data-virtual-count="${count}" aria-hidden="true"><td colspan="${columns}" style="height:${count * height}px"></td></tr>` : '';
}

/** 窗口重叠的行须保留节点，新增行在插入前绑定事件。 */
function updateTableRowWindow(body, mountedRows, {
  first, end, rowHtml, before = null, bindRows = () => {},
}) {
  for (const [index, row] of mountedRows) {
    if (index >= first && index < end) continue;
    row.remove();
    mountedRows.delete(index);
  }
  const range = body.ownerDocument.createRange();
  range.selectNodeContents(body);
  for (let index = first; index < end;) {
    if (mountedRows.has(index)) {
      index += 1;
      continue;
    }
    const start = index;
    let html = '';
    while (index < end && !mountedRows.has(index)) {
      html += rowHtml(index);
      index += 1;
    }
    const rows = range.createContextualFragment(html);
    [...rows.children].forEach((row, offset) => mountedRows.set(start + offset, row));
    bindRows(rows);
    body.insertBefore(rows, mountedRows.get(index) || before);
  }
}

function bindVirtualTables(root, open, afterRowsMounted = () => {}) {
  virtualTableBindings.get(root)?.();
  const cleanups = [];
  virtualTableBindings.set(root, () => cleanups.forEach(cleanup => cleanup()));
  root.querySelectorAll('[data-virtual-table]').forEach(wrap => {
    const source = virtualTables.get(wrap.dataset.virtualTable);
    if (!source) return;
    const view = wrap.ownerDocument.defaultView;
    let scroller = wrap.parentElement;
    while (scroller && !/^(auto|scroll|overlay)$/u.test(view.getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    scroller ||= wrap.ownerDocument.scrollingElement;
    const scrollTarget = scroller === wrap.ownerDocument.scrollingElement ? view : scroller;
    const body = wrap.querySelector('tbody');
    let first = 0;
    let mountedCount = Math.min(source.rows.length, VIRTUAL_WINDOW);
    let rowHeight = VIRTUAL_ROW_HEIGHT;
    let pinnedBottom = false;
    const mountedRows = new Map([...body.querySelectorAll(':scope > tr[data-row-id]')]
      .map((row, index) => [index, row]));
    const template = body.ownerDocument.createElement('template');
    template.innerHTML = spacer(1, source.columns, rowHeight);
    const topSpacer = template.content.firstElementChild;
    const bottomSpacer = body.querySelector('.virtual-table-spacer') || topSpacer.cloneNode(true);
    const setSpacer = (row, count) => {
      row.hidden = count === 0;
      row.dataset.virtualCount = String(count);
      row.firstElementChild.style.height = `${count * rowHeight}px`;
    };
    setSpacer(topSpacer, 0);
    setSpacer(bottomSpacer, source.rows.length - mountedCount);
    body.prepend(topSpacer);
    body.append(bottomSpacer);
    const measure = () => {
      const heights = [...body.querySelectorAll('tr[data-row-id]')]
        .map(row => row.getBoundingClientRect().height).filter(height => height > 0)
        .sort((left, right) => left - right);
      const measured = heights[Math.floor(heights.length / 2)];
      if (!measured || Math.abs(measured - rowHeight) < 1) return;
      rowHeight = measured;
      body.querySelectorAll('.virtual-table-spacer').forEach(row => {
        row.firstElementChild.style.height = `${Number(row.dataset.virtualCount) * rowHeight}px`;
      });
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    const observer = new ResizeObserver(() => {measure(); update();});
    const observeRows = () => {
      observer.disconnect();
      observer.observe(scroller);
      body.querySelectorAll('tr[data-row-id]').forEach(row => observer.observe(row));
    };
    const update = () => {
      if (!wrap.isConnected) return;
      const viewportTop = scrollTarget === view ? 0
        : scroller.getBoundingClientRect().top + scroller.clientTop;
      const viewportHeight = scrollTarget === view ? view.innerHeight : scroller.clientHeight;
      const offset = Math.max(0, viewportTop - body.getBoundingClientRect().top);
      pinnedBottom = scroller.scrollTop > 0
        && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      const count = Math.min(source.rows.length, Math.max(VIRTUAL_WINDOW,
        Math.ceil(viewportHeight / rowHeight) + 8));
      const next = Math.min(Math.max(0, Math.floor(offset / rowHeight) - 4),
        Math.max(0, source.rows.length - count));
      if (next === first && count === mountedCount) return;
      first = next;
      mountedCount = count;
      updateTableRowWindow(body, mountedRows, {
        first, end: first + count, before: bottomSpacer,
        rowHtml: index => source.rowHtml(source.rows[index]),
        bindRows: rows => bindRecordLinks(rows, open),
      });
      setSpacer(topSpacer, first);
      setSpacer(bottomSpacer, source.rows.length - first - count);
      observeRows();
      wrap.dispatchEvent(new CustomEvent('virtual-table-rows', {bubbles: true}));
      afterRowsMounted(wrap);
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    observeRows();
    scrollTarget.addEventListener('scroll', update, {passive: true});
    view.addEventListener('resize', update);
    cleanups.push(() => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', update);
      view.removeEventListener('resize', update);
    });
    update();
  });
}

/**
 * 行点击 → 记录页。只在没点到交互元件时触发，否则表内编辑会被劫持。
 */
function bindRecordLinks(root, open) {
  root.querySelectorAll("tr[data-record-link]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("input, select, textarea, button, a, label, details, summary")) return;
      open(row.dataset.recordLink, row.dataset.rowId);
    });
  });
}

/** Standard action cell for restoring one persisted record to its original. */
function resetToOriginalButton(itemId, {
  title = "只恢复这一项；同一资源中的其他编辑会保留",
  disabled = false,
  dirty = null,
  label = null,
  attributes = {},
  ...unsupported
} = {}) {
  if (Object.keys(unsupported).length) {
    throw new TypeError(`Unsupported reset options: ${Object.keys(unsupported).join(", ")}`);
  }
  if (itemId === undefined || itemId === null || itemId === "") {
    throw new TypeError("itemId is required");
  }
  const knownDirty = typeof dirty === "boolean";
  const isDisabled = disabled || (label === null ? dirty !== true : dirty === false);
  const extra = Object.entries(attributes).map(([name, value]) => {
    if (!/^data-[a-z0-9-]+$/u.test(name) || name === 'data-reset-to-original')
      throw new TypeError(`Unsupported reset attribute: ${name}`);
    return `${name}="${esc(String(value))}"`;
  }).join(' ');
  const hint = `恢复原值：${title}`;
  return `<button class="button ghost reset-to-original${label === null ? " reset-icon" : ""}${dirty === true ? " dirty" : ""}" type="button"
    data-reset-to-original="${esc(String(itemId))}"
    ${knownDirty ? `data-original-dirty="${dirty}"` : ""}
    ${extra} aria-label="${esc(label ?? hint)}" title="${esc(hint)}" ${isDisabled ? "disabled" : ""}>${label === null ? '<span aria-hidden="true">↺</span>' : esc(label)}</button>`;
}

/** Apply a batch selectionStates result without issuing per-row DB reads. */
function applyResetToOriginalStates(root, states, {busy = false} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (!states || typeof states !== "object") {
    throw new TypeError("states must be an object or Map");
  }
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    const key = button.dataset.resetToOriginal;
    const dirty = states instanceof Map ? states.get(key) : states[key];
    if (typeof dirty !== "boolean") return;
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle("dirty", dirty);
    button.disabled = busy || !dirty;
  });
}

/**
 * Bind every standard per-item reset button below root.  Pages own projection
 * refresh and error messaging; this helper centralizes confirmation and the
 * in-flight disabled state.
 */
function bindResetToOriginalButtons(root, onReset, {
  confirmMessage = null,
  states = null,
  busy = false,
} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (typeof onReset !== "function") {
    throw new TypeError("onReset must be callable");
  }
  if (states) applyResetToOriginalStates(root, states, {busy});
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled || button.dataset.resetPending === "true") return;
      button.resetCompletion = (async () => {
        const itemId = button.dataset.resetToOriginal;
        const question = typeof confirmMessage === "function"
          ? confirmMessage(itemId, button)
          : confirmMessage;
        if (question && typeof globalThis.confirm === "function" &&
            !globalThis.confirm(question)) return;
        button.dataset.resetPending = "true";
        button.setAttribute("aria-busy", "true");
        button.disabled = true;
        try {
          await onReset(itemId, button);
        } finally {
          if (button.isConnected) {
            delete button.dataset.resetPending;
            button.removeAttribute("aria-busy");
            button.disabled = button.dataset.originalDirty === "false";
          }
        }
      })();
      return button.resetCompletion;
    });
  });
}

/** Field hosts use the standard control and delegate deletion to the field object. */
function bindFieldResetToOriginalButtons(root, fields, {
  beforeReset = null, afterReset = null, database = null, resourceId = null,
  changesFor = null, confirmMessage = null, onError = null,
  dirtyFor = selection => (Array.isArray(selection) ? selection : [selection])
    .some(field => field.hasOverride),
} = {}) {
  if (!(fields instanceof Map)) throw new TypeError("fields must be a Map");
  for (const button of root.querySelectorAll('[data-reset-to-original]')) {
    const selection = fields.get(button.dataset.resetToOriginal);
    const selected = Array.isArray(selection) ? selection : [selection];
    if (!selected.length || selected.some(field => !field || typeof field.bind !== 'function')) continue;
    const refresh = () => applyResetToOriginalStates(button.parentElement,
      new Map([[button.dataset.resetToOriginal, dirtyFor(selection)]]),
      {busy: button.dataset.resetPending === 'true'});
    let initializing = true;
    for (const field of selected) field.bind(button, () => {
      if (!initializing) refresh();
    });
    initializing = false;
    refresh();
  }
  bindResetToOriginalButtons(root, async key => {
    try {
      const selection = fields.get(key);
      const selected = Array.isArray(selection) ? selection : [selection];
      if (!selected.length || selected.some(field => !field || typeof field.reset !== "function")) {
        throw new TypeError(`未绑定重置字段：${key}`);
      }
      const context = await beforeReset?.(selection);
      // 版本只在调用方点名要固定时才传；其余交给字段层在写入那一刻取。
      const version = context?.expectedVersion;
      const saved = database ? await resetFieldObjectChanges(database,
        changesFor?.(selection, context) ??
          selected.map(field => ({field, reset: true, ...context?.fieldOptions})),
        {expectedVersion: version, resourceId, key}) : null;
      if (!database) for (const field of selected)
        await field.reset({...context?.fieldOptions, expectedVersion: version});
      // 只有恢复 Origin 真的成功才解除这一处失败；同一处可能同时挂在别的链上。
      // 失败的重置不动任何失败——原来那处保存失败要继续报。
      if (!database) clearAutoSaveErrorsOf(resetScopesOf(selection, key));
      await afterReset?.(selection, context, saved);
    } catch (error) {
      if (!onError) throw error;
      onError(error);
    }
  }, {confirmMessage});
}

/** Commit one atomic field-object reset batch and optionally reload its resource. */
async function resetFieldObjectChanges(database, changes, {
  expectedVersion = undefined, resourceId = null, key = null,
} = {}) {
  if (!Array.isArray(changes) || !changes.length ||
      changes.some(change => !change?.field || (change.reset !== true && !('value' in change))))
    throw new TypeError('字段对象重置批次无效');
  await database.writeFields(changes, {expectedVersion});
  clearAutoSaveErrorsOf(resetScopesOf(changes.map(change => change.field), key));
  return resourceId ? database.readResource(resourceId) : undefined;
}

// 重置的解除范围：这一处的字段与它们所属资源（旧入口按资源记账）。
function resetScopesOf(selection, key) {
  const selected = Array.isArray(selection) ? selection : [selection];
  const scopes = [key];
  for (const field of selected) {
    if (!field) continue;
    scopes.push(field);
    if (field.resourceId !== undefined) scopes.push(field.resourceId);
  }
  return scopes;
}

// @editor-module 文本字段对象的控制码标记、键入与插入菜单。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const sample = (token, recordId) => textFillDetails(token, recordId)?.[2] || "示例值";

function tokenMarkup(item, recordId) {
  if (item.kind === 'fill') {
    const [short, full, example] = textFillDetails(item.token, recordId);
    return `<span class="text-runtime-token" title="${esc(`${full} · 示例：${example}`)}"><b>〔${esc(short)}〕</b>
      <small>$${hex(item.token)}${item.operands.map(value => ` $${hex(value)}`).join("")}</small>
      <button type="button" data-runtime-delete="${item.offset}" aria-label="删除 $${hex(item.token)} 填值码">删除</button></span>`;
  }
  return `<span class="text-runtime-character" title="${item.bytes.map(hex).join(" ")}">${esc(item.text)}</span>`;
}

function preview(record, tokens) {
  const tokenByOffset = new Map(tokens.map(item => [item.offset, item]));
  const structure = new Map(record.protected_ranges
    .filter(range => !Object.hasOwn(TEXT_FILL_OPERANDS, Number(range.token)))
    .map(range => [range.offset, range]));
  let result = "";
  for (let offset = 0; offset < record.capacity;) {
    const protectedRange = structure.get(offset);
    if (protectedRange) {
      if (protectedRange.token === 0xE5) result += "\n";
      offset += protectedRange.length;
      continue;
    }
    const item = tokenByOffset.get(offset);
    if (item) result += item.kind === "fill" ? sample(item.token, record.node_id) : item.text;
    offset += item?.bytes.length || 1;
  }
  return result.trim();
}

function runtimeEditorMarkup(document_, recordId, encoding, {compact = false} = {}) {
  const record = document_?.records?.[recordId];
  if (!record?.editable) return "";
  let tokens;
  try {
    tokens = textRecordRuntimeTokens(record, encoding, document_);
  } catch (error) {
    return `<section class="text-runtime-editor warning">${esc(error.message)}</section>`;
  }
  const options = [...TEXT_CONTROL_CODES].map(([token, [label]]) => {
    return `<option value="${token}">${esc(textFillDetails(token, recordId)?.[0] || label)} · $${hex(token)}</option>`;
  }).join("");
  return `<section class="text-runtime-editor" data-runtime-editor="${esc(recordId)}">
    <div class="section-line"><h3>控制码 · ${esc(recordId)}</h3><span>固定 ${record.capacity} B</span></div>
    <div class="text-runtime-token-list">${textRecordEditorTokens(record, encoding).map(item => tokenMarkup(item, recordId)).join("")}</div>
    <div class="text-runtime-example"><b>示例值预览</b><pre>${esc(preview(record, tokens))}</pre></div>
    ${compact ? `<details><summary>插入控制码</summary>` : ""}<div class="text-runtime-controls"><label>插入位置<select data-runtime-position>
      ${tokens.map(item => `<option value="${item.offset}">${item.offset} · ${esc(item.kind === "fill" ? `$${hex(item.token)}` : item.text)}</option>`).join("")}</select></label>
      <label>控制码<select data-runtime-token>${options}</select></label>
      <label>参数（十六进制，空格分隔）<input data-runtime-operands value="" spellcheck="false" placeholder="按控制码所需参数填写"></label>
      <button type="button" data-runtime-insert>插入</button>
      ${compact ? "" : resetToOriginalButton(recordId, {title: "恢复当前文字记录", attributes: {'data-runtime-reset': ''}})}</div>${compact ? "</details>" : ""}
    <details class="text-runtime-legend"${compact ? "" : " open"}><summary>键入写法</summary><table><thead><tr><th>标记</th><th>控制码</th><th>参数</th></tr></thead><tbody>
      ${[...TEXT_CONTROL_CODES].map(([token, [, operands]]) => `<tr><td>${esc(textControlMarker(token,
        operands.map(() => 0), recordId))}</td><td>$${hex(token)}</td><td>${esc(operands.join('、'))}</td></tr>`).join('')}
      <tr><td>〔字节:AB CD〕</td><td>AB CD</td><td>原始字节</td></tr>
    </tbody></table></details>
    <small data-runtime-operand-hint></small><div data-runtime-state role="status" aria-live="polite"></div>
  </section>`;
}

function bindRuntimeEditor(host, {getDocument, getEncoding, onSaved, beforeEdit = async () => {}, ranges = null, quiet = false}) {
  if (!host) return;
  const recordId = host.dataset.runtimeEditor;
  const status = host.querySelector("[data-runtime-state]");
  const tokenSelect = host.querySelector("[data-runtime-token]");
  const hint = host.querySelector("[data-runtime-operand-hint]");
  const updateHint = () => {
    const kinds = TEXT_CONTROL_CODES.get(Number(tokenSelect.value))[1];
    hint.textContent = kinds.length ? `需要 ${kinds.length} 个参数：${kinds.join("、")}` : "此控制码没有参数";
    host.querySelector("[data-runtime-operands]").title = hint.textContent;
  };
  tokenSelect.addEventListener("change", updateHint);
  updateHint();
  let busy = false;
  const resetButton = host.querySelector('[data-runtime-reset]');
  let resetField;
  const refreshReset = () => {
    if (resetButton && resetField) applyResetToOriginalStates(resetButton.parentElement,
      new Map([[recordId, resetField.hasOverride]]), {busy});
  };
  if (resetButton) void db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, 'bytes').then(field => {
    resetField = field;
    field.bind(resetButton, refreshReset);
  }).catch(error => {editorLog.error("字段编辑", `文本字段载入失败：${error.message || error}`, error);});
  host.addEventListener("click", async event => {
    const insert = event.target.closest("[data-runtime-insert]");
    const deletion = event.target.closest("[data-runtime-delete]");
    const reset = event.target.closest("[data-runtime-reset]");
    if (!insert && !deletion && !reset || busy) return;
    busy = true;
    refreshReset();
    status.textContent = "";
    try {
      await beforeEdit();
      const field = await db.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (reset) {
        await field.reset({expectedVersion: field.version});
      } else {
        const document_ = getDocument();
        const current = {...document_, records: {...document_.records,
          [recordId]: {...document_.records[recordId], bytes: [...field.value]}}};
        const operandsText = host.querySelector("[data-runtime-operands]").value.trim();
        const operands = operandsText ? operandsText.split(/\s+/u).map(value =>
          /^[0-9a-f]{1,2}$/iu.test(value) ? Number.parseInt(value, 16) : -1) : [];
        const result = editTextRecordFill(current, recordId, getEncoding(), {
          action: insert ? "insert" : "delete",
          offset: Number(insert ? host.querySelector("[data-runtime-position]").value : deletion.dataset.runtimeDelete),
          token: Number(tokenSelect.value), operands,
        });
        if (ranges && result.bytes.some((value, offset) => value !== field.value[offset]
          && !ranges.some(range => offset >= range.offset && offset < range.offset + range.length))) {
          throw new TypeError("该字段没有足够的空白字节");
        }
        await db.writeFields([{field, value: result.bytes, selection: ranges || field.editableRanges}],
          {expectedVersion: field.version});
      }
      await db.readResource(TEXT_RECORDS_RESOURCE_ID);
      status.textContent = "";
      await onSaved();
    } catch (error) {
      editorLog.error("字段编辑", `文本修改失败：${error.message || error}`, error);
    } finally {
      busy = false;
      refreshReset();
    }
  });
}

function inlineRuntimeEditorMarkup(document_, recordId, encoding, {ranges = null, editorId, label, mode = "capacity"} = {}) {
  const record = document_.records[recordId];
  const tokens = textRecordEditorTokens(record, encoding).filter(item =>
    !ranges || ranges.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length));
  const parts = [];
  let run = [];
  const finish = () => {
    if (!run.length) return;
    const offset = run[0].offset;
    const length = run.at(-1).offset + run.at(-1).bytes.length - offset;
    const visible = [...run];
    while (visible.at(-1)?.kind === 'padding') visible.pop();
    const text = visible.map(item => item.text).join('');
    parts.push(`<span contenteditable="plaintext-only" data-runtime-plain
      data-runtime-ranges="${esc(JSON.stringify([{offset, length}]))}" role="textbox"
      aria-label="${esc(label)}" spellcheck="false">${esc(text || "\u200B")}</span>`);
    run = [];
  };
  for (const item of tokens) {
    if (item.kind === "protected") {
      finish();
      parts.push(`<span class="text-runtime-inline-token" contenteditable="false"
        title="${esc(item.bytes.map(hex).join(' '))}">${esc(item.text)}</span>`);
    } else if (item.kind === 'fill') {
      finish();
      const [, full, example] = textFillDetails(item.token, recordId);
      parts.push(`<span class="text-runtime-inline-token" title="${esc(`${full} · 示例：${example}`)}"><span
        contenteditable="plaintext-only" data-runtime-plain role="textbox" aria-label="${esc(label)}" spellcheck="false"
        data-runtime-ranges="${esc(JSON.stringify([{offset: item.offset, length: item.bytes.length}]))}">${esc(item.text)}</span><button type="button"
        data-runtime-delete="${item.offset}" aria-label="删除 ${esc(item.text)} 填值码">×</button></span>`);
    } else {
      if (run.length && run.at(-1).offset + run.at(-1).bytes.length !== item.offset) finish();
      run.push(item);
    }
  }
  finish();
  return `<div class="fixed-text-runtime-input" data-runtime-inline="${esc(recordId)}"
    data-runtime-editor-id="${esc(editorId)}" data-runtime-mode="${esc(mode)}" aria-label="${esc(label)}"
    title="键入：〔换行〕、〔等待〕、〔分页〕、〔名〕；参数：〔等帧:10〕；字节：〔字节:AB CD〕">${parts.join("")}</div>`;
}

const inlineBindings = new WeakMap();

function bindInlineRuntimeEditors(root, options) {
  if (!root.isConnected) return;
  const document_ = root.ownerDocument;
  const content = document_.querySelector("#content") || root;
  const fields = root.querySelectorAll("[data-runtime-inline]");
  if (!fields.length) return;
  let panel = content.querySelector("[data-runtime-page-panel]");
  if (!panel) {
    panel = document_.createElement("details");
    panel.className = "text-runtime-page-panel";
    panel.dataset.runtimePagePanel = "";
    content.append(panel);
  }
  const selectField = input => {
    panel.runtimeTarget = input;
    const binding = inlineBindings.get(input);
    if (!binding) return;
    const owner = input.closest("[data-fixed-text-editor]");
    const recordId = input.dataset.runtimeInline;
    const template = document_.createElement("template");
    template.innerHTML = runtimeEditorMarkup(binding.getDocument(), recordId, binding.getEncoding());
    const source = template.content.querySelector("[data-runtime-editor]");
    const controls = source.querySelector(".text-runtime-controls");
    controls.querySelector("[data-runtime-reset]").remove();
    const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
    if (ranges) for (const option of controls.querySelector("[data-runtime-position]").options) {
      if (!ranges.some(range => Number(option.value) >= range.offset
        && Number(option.value) < range.offset + range.length)) option.remove();
    }
    const record = binding.getDocument().records[recordId];
    const tokens = textRecordRuntimeTokens(record, binding.getEncoding(), binding.getDocument())
      .filter(item => !ranges || ranges.some(range => item.offset >= range.offset
        && item.offset + item.bytes.length <= range.offset + range.length));
    const example = ranges ? tokens.map(item => item.kind === "fill"
      ? sample(item.token, recordId) : item.text).join("").trimEnd() : preview(record, tokens);
    const targets = [...content.querySelectorAll("[data-runtime-inline]")];
    panel.innerHTML = `<summary>插入控制码</summary><section data-runtime-editor="${esc(recordId)}">
      <label>文字<select data-runtime-target>${targets.map((target, index) => `<option value="${index}"${target === input ? " selected" : ""}>${esc(target.dataset.runtimeEditorId)}</option>`).join("")}</select></label>
      <div class="text-runtime-example"><pre>${esc(example)}</pre></div>
      ${controls.outerHTML}${source.querySelector(".text-runtime-legend").outerHTML}
      <small data-runtime-operand-hint hidden></small><div data-runtime-state role="status"></div></section>`;
    panel.querySelector(".text-runtime-legend").removeAttribute("open");
    panel.querySelector("[data-runtime-target]").addEventListener("change", event =>
      selectField(targets[Number(event.target.value)]));
    bindRuntimeEditor(panel.querySelector("[data-runtime-editor]"), {...binding, ranges, quiet: true});
  };
  for (const input of fields) {
    const previous = inlineBindings.get(input);
    inlineBindings.set(input, options);
    const owner = input.closest("[data-fixed-text-editor]");
    if (options.resetRecordId === input.dataset.runtimeInline || !input.contains(document_.activeElement)
        || !document_.activeElement.matches("[data-runtime-plain]")) {
      const ranges = owner.dataset.fixedTextRanges ? JSON.parse(owner.dataset.fixedTextRanges) : null;
      const template = document_.createElement("template");
      template.innerHTML = inlineRuntimeEditorMarkup(options.getDocument(), input.dataset.runtimeInline,
        options.getEncoding(), {ranges, editorId: input.dataset.runtimeEditorId,
          label: input.getAttribute("aria-label"), mode: input.dataset.runtimeMode});
      input.innerHTML = template.content.firstElementChild.innerHTML;
      input.title = template.content.firstElementChild.title;
    }
    if (previous) continue;
    input.addEventListener("focusin", () => selectField(input));
    bindTextInputEvents(input, {selector: '[data-runtime-plain]',
      onInput: event => editPlain(event.target)});
    const editPlain = segment => {
      if (!segment.matches("[data-runtime-plain]")) return;
      inlineBindings.get(input).onInput({
        dataset: {fixedTextInput: input.dataset.runtimeEditorId,
          fixedTextRecord: input.dataset.runtimeInline,
          fixedTextRanges: segment.dataset.runtimeRanges, fixedTextMode: input.dataset.runtimeMode},
        value: segment.textContent.replaceAll("\u200B", ""),
        runtimeSegment: segment, setAttribute: (key, value) => input.setAttribute(key, value),
      });
    };
    input.addEventListener("click", event => {
      const deletion = event.target.closest("[data-runtime-delete]");
      if (!deletion) {
        if (event.target === input) input.querySelector("[data-runtime-plain]")?.focus();
        return;
      }
      selectField(input);
      const action = deletion.cloneNode(true);
      action.hidden = true;
      panel.querySelector("[data-runtime-editor]").append(action);
      action.click();
    });
  }
  selectField(panel.runtimeTarget?.isConnected ? panel.runtimeTarget : fields[0]);
}

// @editor-module text-record 的共用定长文字组件
//
// 页面只声明要编辑哪条稳定 record ID。本组件统一负责 Unicode 输入、按完整
// 字符截断、空字节补齐、保护结构命令与固定图块、延迟写入 working 层及单条还原；剧情、
// 游戏 UI 等消费者不再各写一套 text-record 保存循环。exact 模式拒绝任何字节数
// 变化；readonly 模式只投影同一条记录，不创建输入或保存入口。


const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const boundRoots = new WeakMap();
const liveControllers = new Set();

async function flushFixedTextEditors() {
  for (const reference of liveControllers) {
    const controller = reference.deref();
    if (!controller) {
      liveControllers.delete(reference);
      continue;
    }
    if (controller.error) throw new Error(controller.error);
    await controller.flush();
  }
}

function fixedTextFieldInputMarkup({value, label, maxLength = null,
  className = '', attributes = ''} = {}) {
  return `<input${className ? ` class="${esc(className)}"` : ''} type="text"
    value="${esc(value)}" aria-label="${esc(label)}" aria-invalid="false"
    autocomplete="off" spellcheck="false"${
      maxLength === null ? '' : ` maxlength="${esc(maxLength)}"`} ${attributes}>`;
}

function fixedTextInput(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-input="${CSS.escape(String(editorId || ""))}"], [data-runtime-editor-id="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function fixedTextState(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-save-state="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function sayFixedTextState(root, editorId, message, {invalid = false} = {}) {
  const input = fixedTextInput(root, editorId);
  if (input) {
    input.setAttribute("aria-invalid", String(invalid));
    input.setCustomValidity?.(invalid ? message : "");
  }
  const status = fixedTextState(root, editorId);
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("invalid", invalid);
  }
}

function fixedTextResultMessage(result) {
  if (result?.truncated_characters) {
    return `已按容量截断 ${result.truncated_characters} 个字`;
  }
  if (result?.padded_bytes) {
    return `剩余 ${result.padded_bytes} B 已自动补空`;
  }
  return "";
}

/** Unicode projection for plain-text consumers (titles, filters and options). */
function fixedTextRecordText(recordId, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = document_?.records?.[recordId];
  if (!record || !encoding) return "";
  return decodeFixedTextRecord(record, encoding).text;
}

/** 画面文字片段包含其后同一可写区间的补空字节。 */
function fixedTextRecordRangesWithPadding(recordId, ranges, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = textRecord(document_, recordId);
  const paddingEnds = new Map();
  for (const token of textRecordEditorTokens(record, encoding).reverse()) {
    if (token.kind !== 'padding') continue;
    const end = token.offset + token.bytes.length;
    paddingEnds.set(token.offset, paddingEnds.get(end) ?? end);
  }
  const writable = textRecordRuntimeWritableRanges(record);
  return ranges.map(({offset, length}) => {
    const span = writable.find(span => offset >= span.offset && offset + length <= span.offset + span.length);
    const end = Math.min(paddingEnds.get(offset + length) ?? offset + length,
      span ? span.offset + span.length : offset + length);
    return {offset, length: end - offset};
  });
}

/** 生成一条固定容量文字输入；内容始终从 text-record 当前文档现场解码。 */
function fixedTextEditorMarkup({
  recordId,
  editorId = recordId,
  ranges = null,
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
  label = "字段名",
  description = "",
  className = "",
  mode = "capacity",
  compact = false,
  readonly = false,
  reset = true,
  resetOnly = false,
  runtime = true,
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let record = null;
  let decoded = null;
  let failure = "";
  try {
    record = document_ ? textRecord(document_, id) : null;
    if (!record) failure = "当前项目没有这条定长文字记录。";
    else if (!encoding) failure = "当前项目没有可用字符映射。";
    else decoded = ranges === null || ranges === undefined
      ? decodeFixedTextRecord(record, encoding)
      : runtime ? textRecordEditorSelection(record, encoding, document_, ranges)
        : decodeFixedTextRecordSelection(record, encoding, ranges);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const capacity = Number(
    decoded?.editable_byte_capacity ?? record?.editable_byte_capacity,
  ) || 0;
  const editable = Boolean(!readonly && record?.editable && decoded && capacity > 0 && !failure);
  const reason = editable
    ? mode === "exact"
      ? `定长替换必须保持 ${capacity} 个编码字节；不足或超出均拒绝保存。`
      : runtime ? `固定容量；不足自动补空，超出拒绝写入，结构命令和固定图块保持原位。`
        : `固定 ${capacity} 个文字字节；不足自动补空，超出按完整字符截断，结构命令和固定图块保持原位。`
    : failure || record?.readonly_reason || "这条记录不可逐字编辑。";
  if (readonly || !editable) {
    return `<span class="fixed-text-readonly" data-fixed-text-record="${esc(id)}"
      data-fixed-text-runtime="${runtime}"
      data-fixed-text-ranges="${esc(ranges ? JSON.stringify(ranges) : "")}"
      title="${esc(readonly ? description : reason)}">${esc(record && encoding && !ranges
        ? textRecordEditorText(record, encoding) : decoded?.text || "—")}</span>`;
  }
  const serializedRanges = ranges === null || ranges === undefined
    ? "" : JSON.stringify(ranges);
  return `<div class="fixed-text-editor${compact ? " fixed-text-editor--compact" : ""}${className ? ` ${esc(className)}` : ""}"
    data-fixed-text-editor="${esc(editor)}"
    data-fixed-text-runtime="${runtime}"
    data-fixed-text-record="${esc(id)}"
    data-fixed-text-ranges="${esc(serializedRanges)}">
    ${resetOnly ? "" : `<label class="fixed-text-editor-field" title="${esc(description || reason)}">
      ${compact ? "" : `<span><b>${esc(label)}</b><small>${esc(id)}</small></span>`}
      ${runtime ? inlineRuntimeEditorMarkup(document_, id, encoding, {ranges, editorId: editor, label, mode}) : fixedTextFieldInputMarkup({value: decoded?.text || '', label,
        attributes: `data-fixed-text-input="${esc(editor)}"
          data-fixed-text-record="${esc(id)}"
          data-fixed-text-ranges="${esc(serializedRanges)}"
          data-fixed-text-mode="${esc(mode)}"${editable ? '' : ' disabled'}`})}
    </label>`}
    <div class="fixed-text-editor-actions">
      ${resetOnly ? "" : `<span data-fixed-text-save-state="${esc(editor)}" aria-live="polite" hidden></span>`}
      ${reset ? resetToOriginalButton(editor, {
        title: serializedRanges
          ? "只把这个字段恢复到 Original；同一条记录的其他字段保留"
          : "把这条文字恢复到 Original；同一资源里的其他编辑保留",
        disabled: !editable,
      }) : ""}
    </div>
  </div>`;
}

/**
 * 绑定一个根节点下的全部固定文字输入。回调只处理页面自己的投影/重绘；编码、
 * 校验与还原由本组件拥有，写入的等待、排队与失败记账归字段层的自动写入链。
 */
function bindFixedTextEditors(root, {
  database = db,
  reuse = null,
  getDocument = () => state.project?.text_record_edits || null,
  getEncoding = () => state.project?.text_record_encoding || null,
  getRepository = () => requireBrowserProjectRepository(state),
  onDraft = () => {},
  onSaved = null,
  onReset = async () => {},
  onState = () => {},
} = {}) {
  if (!root) return null;
  if (boundRoots.has(root)) {
    const controller = boundRoots.get(root);
    controller.refreshBindings();
    return controller;
  }
  if (reuse?.rebind(root)) return reuse;
  const project = state.project;
  const repository = getRepository();
  const revision = state.browserProjectManifest?.active_original_revision_id;
  const sessionMatches = () => state.project === project &&
    state.projectRepository === repository &&
    state.browserProjectManifest?.active_original_revision_id === revision;
  const notifySaved = async event => {
    if (sessionMatches()) {
      project.text_record_edits = event.saved.value.document;
      project.text_record_dirty = Boolean(event.saved.dirty);
    }
    if (onSaved) await onSaved(event);
    refreshRuntimeEditors({resetRecordId: event.reset ? event.recordId : null});
  };
  const refreshRuntimeEditors = ({resetRecordId = null} = {}) => bindInlineRuntimeEditors(root, {
    getDocument, getEncoding, resetRecordId,
    beforeEdit: async () => {
      await flush();
      if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    },
    onSaved: async () => {
      const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
      await notifySaved({saved, changes: [], root});
    },
    onInput: handleInput,
  });
  let generation = 0;
  const latest = new Map();
  const pending = new Map();
  const invalid = new Map();
  const saving = new Map();

  const queue = (editorId, recordId, ranges, result) => {
    const changeGeneration = ++generation;
    latest.set(editorId, changeGeneration);
    pending.set(editorId, {
      editorId,
      recordId,
      ranges,
      bytes: result.bytes.slice(),
      result,
      generation: changeGeneration,
    });
    onState();
    // 等待防抖、排队与正在提交都归字段层那一条链（`core/project-db.js`）：
    // 这一笔不进任何自建计时器，改动立即排进去，状态栏从同一份记账读。
    void flush().catch(error => showEditorError(root, "定长文字自动写入失败", error));
  };

  const flush = async () => {
    const changes = [...pending.values()].sort(
      (left, right) => left.generation - right.generation,
    );
    if (!changes.length) {
      // 只有还在字段层链上的写入：等它落定，好让调用方看到落盘后的值。
      if (hasPendingAutoSaves()) await flushAllAutoSaves();
      return;
    }
    for (const change of changes) saving.set(change.editorId, change);
    await (async () => {
      try {
        if (state.browserProjectManifest?.active_original_revision_id !== revision ||
            state.projectRepository !== repository) {
          throw new Error("项目会话已切换，请重新打开文字编辑器");
        }
        const grouped = new Map();
        for (const change of changes) {
          const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, change.recordId, "bytes");
          let entry = grouped.get(field);
          if (!entry) grouped.set(field, entry = {field, value: [...field.value], indices: new Set()});
          const ranges = change.ranges || field.editableRanges;
          for (const range of ranges) for (let offset = range.offset; offset < range.offset + range.length; offset++) {
            entry.value[offset] = change.bytes[offset];
            entry.indices.add(offset);
          }
        }
        const writes = [...grouped.values()].map(({field, value, indices}) => {
          const selection = [];
          for (const offset of [...indices].sort((a, b) => a - b)) {
            const last = selection.at(-1);
            if (last && last.offset + last.length === offset) last.length++;
            else selection.push({offset, length: 1});
          }
          return {field, value, selection};
        });
        await database.writeFields(writes, {expectedVersion: writes[0].field.version});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await notifySaved({saved, changes, root});
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              root.querySelector("[data-runtime-inline]") ? "" : fixedTextResultMessage(change.result),
            );
          }
        }
      } catch (error) {
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              `保存失败：${error?.message || error}`,
              {invalid: true},
            );
          }
        }
        throw error;
      } finally {
        for (const change of changes) {
          // 这一笔落定才把同代次的待写清掉：更新的一笔仍留着，写的是更全的值。
          if (latest.get(change.editorId) === change.generation) pending.delete(change.editorId);
          if (saving.get(change.editorId) === change) saving.delete(change.editorId);
        }
        onState();
      }
    })();
  };

  const handleInput = input => {
    if (input.disabled || input.readOnly) return;
    const editorId = String(input?.dataset.fixedTextInput || "");
    const recordId = String(input?.dataset.fixedTextRecord || "");
    const ranges = input?.dataset.fixedTextRanges
      ? JSON.parse(input.dataset.fixedTextRanges) : null;
    const source = getDocument();
    const encoding = getEncoding();
    if (!editorId || !recordId || !source || !encoding) return;
    const document_ = cloneJson(source);
    let result;
    try {
      const encode = input.dataset.fixedTextMode === "exact"
        ? exactFixedTextRecordBytes : fixedTextRecordBytes;
      result = input.runtimeSegment ? textRecordEditorBytes(document_, recordId, input.value,
        encoding, ranges, {exact: input.dataset.fixedTextMode === 'exact'}) : encode(
        document_, recordId, input.value, encoding, ranges,
      );
    } catch (error) {
      result = {ok: false, reason: `不能编码：${error?.message || error}`};
    }
    if (!result.ok) {
      const suffix = result.unsupported?.length
        ? `：${result.unsupported.join(" ")}` : "";
      const reason = `${result.reason}${suffix}`;
      invalid.set(editorId, {recordId, ranges, reason});
      pending.delete(editorId);
      latest.set(editorId, ++generation);
      sayFixedTextState(root, editorId, reason, {invalid: true});
      onState();
      return;
    }
    invalid.delete(editorId);
    installEncodedTextRecord(document_, result);
    input.value = result.text;
    if (input.runtimeSegment && result.truncated_characters) input.runtimeSegment.textContent = result.text || "\u200B";
    input.setAttribute("aria-invalid", "false");
    onDraft({
      document: document_, result, editorId, recordId, ranges, input, root,
    });
    sayFixedTextState(root, editorId, input.runtimeSegment ? "" : fixedTextResultMessage(result));
    queue(editorId, recordId, ranges, result);
  };

  // 身份读容器：`.fixed-text-editor` 上本来就有 editor / record / ranges，
  // 共用按钮只带 itemId，不再重复挂一份。
  const prepareReset = async (recordId, ranges) => {
    const matches = change => change.recordId === recordId &&
      (ranges === null || change.ranges?.every(range => ranges.some(selection =>
        range.offset >= selection.offset && range.offset + range.length <= selection.offset + selection.length)));
    for (const [id, change] of pending) if (matches(change)) pending.delete(id);
    for (const [id, change] of invalid) if (matches(change)) invalid.delete(id);
    for (const input of root.querySelectorAll("[data-fixed-text-input]")) {
      const inputRanges = input.dataset.fixedTextRanges ? JSON.parse(input.dataset.fixedTextRanges) : null;
      if (matches({recordId: input.dataset.fixedTextRecord, ranges: inputRanges})) input.__fieldResetPending = true;
    }
    await flush();
    if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    return {field, expectedVersion: field.version, fieldOptions: {selection: ranges}, recordId, ranges};
  };
  const finishReset = async ({recordId, ranges}) => {
    const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
    await notifySaved({saved, changes: [], root, reset: true, recordId, ranges});
    onState();
    return saved;
  };
  const resetRecord = async (recordId, ranges = null) => {
    const context = await prepareReset(recordId, ranges);
    await context.field.reset({...context.fieldOptions, expectedVersion: context.expectedVersion});
    return finishReset(context);
  };
  const boundFields = new WeakSet();
  let ready = Promise.resolve();
  const bindFields = async () => {
    const hosts = root.querySelectorAll("[data-fixed-text-record]");
    for (const host of hosts) {
      if (boundFields.has(host)) continue;
      boundFields.add(host);
      const recordId = host.dataset.fixedTextRecord;
      const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (!host.isConnected || !sessionMatches()) continue;
      const ranges = host.dataset.fixedTextRanges ? JSON.parse(host.dataset.fixedTextRanges) : null;
      const editorId = host.dataset.fixedTextInput || host.dataset.fixedTextEditor;
      let previousText;
      field.bind(host, (element, bytes) => {
        const record = {...textRecord(getDocument(), recordId), bytes};
        const decoded = ranges
          ? host.dataset.fixedTextRuntime === 'true'
            ? textRecordEditorSelection(record, getEncoding(), getDocument(), ranges)
            : decodeFixedTextRecordSelection(record, getEncoding(), ranges)
          : decodeFixedTextRecord(record, getEncoding());
        if (element.matches("[data-fixed-text-input]")) {
          if (element.__fieldResetPending || (!pending.has(editorId) && !saving.has(editorId) && !invalid.has(editorId)
              && (previousText === undefined || element.value === previousText))) element.value = decoded.text;
          delete element.__fieldResetPending;
        } else if (element.matches(".fixed-text-readonly")) element.textContent = decoded.text || "—";
        previousText = decoded.text;
      });
      if (host.matches("[data-fixed-text-editor]")) bindFieldResetToOriginalButtons(host,
        new Map([[editorId, field]]), {
          dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
            field.value.slice(offset, offset + length).some((value, index) =>
              value !== field.defaultValue[offset + index])) : field.hasOverride,
          beforeReset: () => prepareReset(recordId, ranges),
          afterReset: async (_field, context) => {
            const saved = await finishReset(context);
            await onReset({saved, editorId, recordId, ranges, root});
            sayFixedTextState(root, editorId, "");
          },
          onError: error => sayFixedTextState(root, editorId, `还原失败：${error?.message || error}`, {invalid: true}),
        });
    }
  };

  const refreshBindings = () => {
    refreshRuntimeEditors();
    ready = bindFields();
    void ready.catch(error => showEditorError(root, "文字字段绑定失败", error));
    return ready;
  };

  const bindRoot = () => {
    bindTextInputEvents(root, {selector: '[data-fixed-text-input]', onInput: event => {
      if (event.composedPath().find(node => boundRoots.has(node)) !== root) return;
      const input = event.target.closest?.("[data-fixed-text-input]");
      if (input) handleInput(input);
    }});
    refreshBindings();
  };

  const controller = Object.freeze({
    // A list/detail rerender replaces the form, not the pending text edit.
    // Keep its queue and validation so a later invalid input cancels the same
    // pending record. Never transfer a controller between project sessions.
    rebind(nextRoot) {
      if (root.isConnected || !sessionMatches()) return false;
      boundRoots.delete(root);
      root = nextRoot;
      boundRoots.set(root, controller);
      bindRoot();
      return true;
    },
    // 落定这一页的待写：字段层的链没有自建计时器，直接等它跑完。
    flush,
    resetRecord,
    prepareReset,
    finishReset,
    refreshBindings,
    get ready() { return ready; },
    isDirty(recordId) {
      return [...pending.values(), ...saving.values(), ...invalid.values()]
        .some(change => change.recordId === recordId);
    },
    get error() { return invalid.values().next().value?.reason || ""; },
    get dirtyCount() {
      return new Set([...pending.values(), ...saving.values(), ...invalid.values()]
        .map(change => change.recordId)).size;
    },
    get pending() { return pending.size > 0 || saving.size > 0; },
  });
  boundRoots.set(root, controller);
  liveControllers.add(new WeakRef(controller));
  bindRoot();
  return controller;
}

// @editor-module 字段对象提供定长 8×8 双位面像素编辑与重置。

function paintPatternPixelPreview(canvas, fields) {
  const bytes = fields.flatMap(field => field.value);
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  paintChrTile(pixels, 8, 0, 0, decodeChrTile(bytes, 0), [0x0F, 0x30, 0x10, 0x00], {transparent: false});
  canvas.width = canvas.height = 8;
  canvas.getContext('2d').putImageData(new ImageData(pixels, 8, 8), 0, 0);
}

function mountPatternPixelEditor(host, object, {fields, onValue = () => {}}) {
  const selected = fields.map(name => object.fields.find(field => field.fieldName === name));
  if (selected.some(field => !field) || ![1, 2].includes(selected.length)
      || selected.some(field => field.value.length !== (selected.length === 1 ? 16 : 8)))
    throw new TypeError('像素字段必须含两个 8 B 位面或一段 16 B 位图');
  const key = object.id;
  host.innerHTML = `<div class="pattern-pixel-editor" data-pattern-editor="${esc(key)}">
    <code>${esc(key)}</code>${selected.some(field => field.writeback?.state === 'unpermitted')
      ? writeAccessMarker({writebackMissing: true}) : ''}
    <fieldset><legend>画笔</legend>${[0, 1, 2, 3].map(value => `<label><input
      type="radio" name="pattern-brush-${esc(key)}" value="${value}"${value === 1 ? ' checked' : ''}>${value}</label>`).join('')}</fieldset>
    <canvas width="8" height="8" data-pattern-canvas aria-label="8×8 像素"></canvas>
    ${resetToOriginalButton(key)}</div>`;
  const canvas = host.querySelector('[data-pattern-canvas]');
  let pending = 0, writes = Promise.resolve();
  const sync = () => {
    paintPatternPixelPreview(canvas, selected);
    applyResetToOriginalStates(host, new Map([[key, selected.some(field => field.hasOverride)]]), {busy: pending > 0});
  };
  const perform = action => {
    pending++;
    sync();
    writes = writes.then(action).then(() => {
      host.querySelector('[data-editor-error-block]')?.remove();
      sync();
      return onValue();
    }).catch(error => showEditorError(host, '像素编辑', error))
      .finally(() => {pending--; sync();});
    return writes;
  };
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 8 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 8 / rect.height);
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    const brush = Number(host.querySelector('input:checked').value);
    void perform(async () => {
      const bytes = selected.flatMap(field => field.value);
      const bit = 1 << (7 - x);
      for (let plane = 0; plane < 2; plane++) bytes[y + plane * 8] =
        (bytes[y + plane * 8] & ~bit) | (((brush >> plane) & 1) ? bit : 0);
      await object.database.writeFields(selected.map((field, index) => ({field,
        value: selected.length === 1 ? bytes : bytes.slice(index * 8, index * 8 + 8)})));
    });
  });
  host.querySelector('[data-reset-to-original]').addEventListener('click', () =>
    void perform(() => object.database.writeFields(selected.map(field =>
      ({field, value: field.defaultValue, reset: true})))));
  for (const field of selected) field.bind(host, sync);
  sync();
  host.dataset.fieldObjectReady = key;
}

var patternPixelEditor = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountPatternPixelEditor: mountPatternPixelEditor,
  paintPatternPixelPreview: paintPatternPixelPreview
});

export { PALETTE_MAX, PICKER_COLUMNS, PICKER_TILES, TILE_BYTES, allSequenceExecutions, applyResetToOriginalStates, attributeByteWith, attributeIndexAt, bindFieldResetToOriginalButtons, bindFixedTextEditors, bindNametablePainting, bindNavigationTree, bindRecordLinks, bindResetToOriginalButtons, bindRuntimeEditor, bindSidebarToggle, bindVirtualTables, createNesApuSynth, dataTable, datasetFacts, defaultGeometry, ensureSequenceExecutions, fieldElevatorInstance, fieldElevatorSceneRanges, fieldTerrainMotion, fixedTextEditorMarkup, fixedTextFieldInputMarkup, fixedTextRecordRangesWithPadding, fixedTextRecordText, flushFixedTextEditors, metatileAttributeWithBehavior, metatileBehaviorCode, metatileBehaviorLabel, metatileBehaviorOptions, outlineBox, paintNametable, paintNametableWindow, paintPatternPixelPreview, patternPixelEditor, pickerTileFromEvent, resetToOriginalButton, runtimeEditorMarkup, sceneHasElevatorDispatch, setResourceAlert, setStatus, setTableStatus, updateTableRowWindow };
