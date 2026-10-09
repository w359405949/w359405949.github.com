import { db, loadByteMapSpace, selectionCursorCoordinates } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { currentTextReference } from './element-tree-DsgOBeTK.js';

// @editor-module 从符号表注释派生事件位用途。
const globalEventFlagHandle = id => `global-event-flag:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;

function globalEventFlagPurposes(annotations) {
  const labels = new Map(annotations.filter(row => row.binding?.slot === 1
    && Number.isInteger(row.binding.flag_id) && !/treasure/u.test(row.field_id || '')
    && row.semantic_status !== 'unproven' && !/查不实|未知|未确认/u.test(row.binding.label || ''))
    .map(row => [row.binding.flag_id, {label: row.binding.label,
      purposeTextReference: row.binding.purpose_text_reference}]));
  return Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id),
    ...(labels.get(id) || {label: '未知用途'})}));
}

// @editor-module 全局事件位的句柄与已确认用途。
let entries = Array.from({length: 256}, (_, id) => ({id, handle: globalEventFlagHandle(id), label: '未知用途'}));

function globalEventFlagEntries() { return entries.map(row => globalEventFlagEntry(row.id)); }

function globalEventFlagEntry(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = typeof value === 'string' && value.startsWith('global-event-flag:')
    ? Number.parseInt(value.split(':')[1], 16) : Number(value);
  if (!Number.isInteger(id) || id < 0 || id >= 256) return null;
  const row = entries[id];
  return row.purposeTextReference ? {...row,
    get label() {return `${row.label} · ${currentTextReference(row.purposeTextReference).label}`;}} : row;
}

async function prepareGlobalEventFlags() {
  const path = state.browserPackageManifest?.browser_prepared_inputs?.global_event_flags;
  if (path) {
    const document = await db.getPackageDocument(path, null, {readonly: true});
    entries = document.entries;
  } else {
    const document = await loadByteMapSpace('sram', {allPages: true});
    entries = globalEventFlagPurposes(document.annotations);
  }
  return globalEventFlagEntries();
}

// @editor-module 显示现场的字节与向量在共享边界校验。
const byte$3 = value => Number.isInteger(value) && value >= 0 && value <= 255;
const validatedVectors = new WeakSet();
function requireFrameByte(state, key) {
  if (!byte$3(state[key])) throw new Error(key);
  return state[key];
}
function requireFrameVector(value, size, key) {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value)) || value.length !== size) throw new Error(key);
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return value;
  if (validatedVectors.has(value)) return value;
  for (const item of value) if (!byte$3(item)) throw new Error(key);
  if (Object.isFrozen(value)) validatedVectors.add(value);
  return value;
}

function cloneFrameValue(value, seen = new Map()) {
  if (value === null || typeof value !== 'object')
    return ['function', 'symbol'].includes(typeof value) ? structuredClone(value) : value;
  if (seen.has(value)) return seen.get(value);
  if ((value instanceof Uint8Array || value instanceof Uint8ClampedArray) && value.buffer instanceof ArrayBuffer) {
    const result = value instanceof Uint8ClampedArray
      ? new Uint8ClampedArray(value) : new Uint8Array(value);
    seen.set(value, result); return result;
  }
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) {
    const result = structuredClone(value); seen.set(value, result); return result;
  }
  const result = array ? value.slice() : {};
  seen.set(value, result);
  if (array) {
    if (validatedVectors.has(value)) return result;
    for (let index = 0; index < result.length; index++) {
      const type = typeof result[index];
      if (result[index] !== null && type === 'object' || type === 'function' || type === 'symbol')
        result[index] = cloneFrameValue(result[index], seen);
    }
  } else for (const key of Object.keys(value)) {
    const cloned = cloneFrameValue(value[key], seen);
    if (key === '__proto__') Object.defineProperty(result, key, {value: cloned, enumerable: true, writable: true, configurable: true});
    else result[key] = cloned;
  }
  return result;
}

function sameByteVector(left, right) {
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index]) return false;
  return true;
}

function sameFrameVector(left, right) {
  if (left === right) return true;
  if (left?.length !== right?.length) return false;
  if (left instanceof Uint8Array || left instanceof Uint8ClampedArray)
    return sameByteVector(left, right);
  if (!Array.isArray(left)) return left.every((value, index) => value === right[index]);
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index] && index in left) return false;
  return true;
}

// @editor-module CHR 映射服务独占寄存器映射与图样地址解算。

function applyChrBankSet(state, banks, effects = []) {
  state.chr_banks = Array.from(requireFrameVector(banks, 6, 'chr-bank-set'), (bank, index) => index < 2 ? bank & 254 : bank);
  state.chr_mode = 1;
  effects.push({kind: 'chr-banks', banks: [...state.chr_banks], mode: 1});
}

function setChrBank(state, register, bank, effects = []) {
  requireFrameVector(state.chr_banks, 6, 'chr_banks');
  requireFrameByte({bank}, 'bank');
  if (!Number.isInteger(register) || register < 0 || register > 5) throw new Error('chr-register');
  state.chr_banks[register] = register < 2 ? bank & 254 : bank;
  state.chr_mode = 1;
  effects.push({kind: 'chr-bank', register, bank, mode: 1});
}

function chrMappedPages(state) {
  const banks = requireFrameVector(state.chr_banks, 6, 'chr_banks'), mode = requireFrameByte(state, 'chr_mode');
  if (mode > 1) throw new Error('chr_mode');
  const pages = [banks[0] & 254, banks[0] | 1, banks[1] & 254, banks[1] | 1, ...banks.slice(2)];
  return mode ? [...pages.slice(4), ...pages.slice(0, 4)] : pages;
}

function writeChrRam(state, address, value) {
  const bank = chrMappedPages(state)[address >> 10];
  if (bank === 8 || bank === 9)
    requireFrameVector(state.chr_ram, 2048, 'chr_ram')[(bank - 8) * 1024 + (address & 1023)] = value;
}

async function resolveChrPatternTable(state, readBank) {
  const result = new Uint8Array(8192);
  await Promise.all(chrMappedPages(state).map(async (bank, index) => {
    const bytes = bank === 8 || bank === 9
      ? requireFrameVector(state.chr_ram, 2048, 'chr_ram').slice((bank - 8) * 1024, (bank - 7) * 1024)
      : await readBank(bank);
    result.set(requireFrameVector(bytes, 1024, 'chr-bank-patterns'), index * 1024);
  }));
  return result;
}

// @editor-module 光栅服务按显示配置与当前现场执行所属 IRQ handler。

const unavailable$7 = missing => ({status: 'unavailable', missing});
function rasterTables(catalog) {
  if (catalog?.confirmation_status !== 'confirmed' || !catalog.raster) throw new Error('raster-sources');
  const tables = catalog.raster;
  for (const key of ['handler_indices', 'latches', 'chr_sets']) requireFrameVector(tables[key], 13, `raster.${key}`);
  if (!Array.isArray(tables.handlers) || tables.handlers.length !== 16
      || !tables.handlers.every(value => Number.isInteger(value) && value >= 0 && value <= 65535))
    throw new Error('raster.handlers');
  return tables;
}
function selectHandler(tables, state, selector, effects) {
  if (!Number.isInteger(selector) || selector < 0 || selector >= 16) throw new Error('raster-handler-domain');
  state.irq_handler_index = selector;
  state.irq_handler = tables.handlers[selector];
  effects.push({kind: 'irq-handler', selector, address: state.irq_handler});
}
function control(state, value, effects) {
  state.ppu_ctrl = state.raster_ctrl = value;
  effects.push({kind: 'ppu-control', value});
}
function latch(state, value, effects) {
  state.irq_latch = value;
  effects.push({kind: 'irq-latch', value});
}
function disable(state, effects) {
  state.irq_enabled = false;
  effects.push({kind: 'irq-enable', enabled: false});
}

function configureFrameRaster(catalog, state, effects) {
  const tables = rasterTables(catalog), profile = requireFrameByte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  control(state, requireFrameByte(state, 'ppu_ctrl_shadow'), effects);
  state.ppu_mask = requireFrameByte(state, 'ppu_mask_shadow');
  state.scroll_x = requireFrameByte(state, 'scroll_x_shadow');
  state.scroll_y = requireFrameByte(state, 'scroll_y_shadow');
  latch(state, tables.latches[profile] || requireFrameByte(state, 'dynamic_irq_latch'), effects);
  state.raster_phase = 0;
  delete state.ppu_address;
  selectHandler(tables, state, tables.handler_indices[profile], effects);
  state.irq_enabled = profile !== 0;
  state.raster_complete = false;
  if (profile && tables.chr_sets[profile]) {
    applyChrBankSet(state, requireFrameVector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
    control(state, state.ppu_ctrl ^ requireFrameByte(state, 'nametable_xor'), effects);
  }
  effects.push({kind: 'raster-setup', profile, irq_latch: state.irq_latch,
    irq_handler: state.irq_handler, irq_enabled: state.irq_enabled,
    ppu_ctrl: state.ppu_ctrl, ppu_mask: state.ppu_mask, scroll_x: state.scroll_x, scroll_y: state.scroll_y});
}

function runHandler(catalog, state, effects) {
  const tables = rasterTables(catalog), selector = requireFrameByte(state, 'irq_handler_index');
  if (selector >= 16 || state.irq_handler !== tables.handlers[selector]) throw new Error('raster-handler-binding');
  if (!requireFrameByte(state, 'display_profile')) {disable(state, effects); return;}
  state.irq_enabled = true;
  const primary = () => applyChrBankSet(state, requireFrameVector(state.primary_chr_banks, 6, 'primary_chr_banks'), effects);
  const raster = () => applyChrBankSet(state, requireFrameVector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
  const toggle = () => control(state, requireFrameByte(state, 'ppu_ctrl_shadow') ^ requireFrameByte(state, 'nametable_page'), effects);
  const fixed = () => {
    setChrBank(state, 2, 0x34, effects);
    setChrBank(state, 4, 0x12, effects);
    setChrBank(state, 5, 0x13, effects);
  };
  switch (selector) {
    case 0:
      disable(state, effects); toggle(); primary(); break;
    case 1:
      latch(state, 0x30, effects); selectHandler(tables, state, 0, effects);
      applyChrBankSet(state, requireFrameVector(state.chr_shadow, 6, 'chr_shadow'), effects);
      control(state, requireFrameByte(state, 'ppu_ctrl_shadow'), effects); break;
    case 2: {
      state.raster_phase = (requireFrameByte(state, 'raster_phase') + 1) & 255;
      const phase = state.raster_phase;
      if (phase < 1 || phase > 3) throw new Error('raster-phase-domain');
      const bank = phase === 3 ? 0x24 : requireFrameVector(tables.stage_chr2, 3, 'raster.stage_chr2')[phase];
      setChrBank(state, 2, bank, effects); setChrBank(state, 3, (bank + 1) & 255, effects);
      latch(state, phase === 3 ? 0x19 : requireFrameVector(tables.stage_latches, 3, 'raster.stage_latches')[phase], effects);
      selectHandler(tables, state, phase === 3 ? 3 : 2, effects); break;
    }
    case 3:
      toggle(); setChrBank(state, 2, 8, effects); setChrBank(state, 3, 9, effects);
      latch(state, 0x0F, effects); selectHandler(tables, state, 4, effects); break;
    case 4:
      disable(state, effects); fixed(); break;
    case 5: {
      disable(state, effects); toggle();
      const banks = requireFrameVector(state.primary_chr_banks, 6, 'primary_chr_banks');
      setChrBank(state, 0, banks[0], effects); setChrBank(state, 1, banks[1], effects); fixed(); break;
    }
    case 6:
      disable(state, effects);
      if (!Number.isInteger(state.raster_address) || state.raster_address < 0 || state.raster_address > 65535)
        throw new Error('raster_address');
      state.ppu_address = state.raster_address & 0x3FFF;
      state.scroll_x = requireFrameByte(state, 'scroll_x_shadow'); state.scroll_y = requireFrameByte(state, 'scroll_y_shadow');
      effects.push({kind: 'ppu-scroll-restore', address: state.ppu_address,
        x: state.scroll_x, y: state.scroll_y});
      control(state, requireFrameByte(state, 'raster_restore_ctrl'), effects); primary(); break;
    case 7: case 12: case 13: break;
    case 8:
      latch(state, 0x34, effects); selectHandler(tables, state, 9, effects); primary(); break;
    case 9:
      disable(state, effects); raster(); break;
    case 10:
      disable(state, effects); control(state, requireFrameByte(state, 'ppu_ctrl_shadow') ^ 1, effects);
      state.ppu_mask = requireFrameByte(state, 'ppu_mask_shadow') & 0xEF;
      effects.push({kind: 'ppu-mask', value: state.ppu_mask}); break;
    case 11: case 14: case 15:
      selectHandler(tables, state, 0, effects);
      latch(state, (0x90 - requireFrameByte(state, 'dynamic_irq_latch')) & 255, effects);
      control(state, requireFrameByte(state, 'raster_ctrl') ^ 1, effects);
      if (selector !== 11) {
        for (let register = 2; register <= 4; register++) setChrBank(state, register, 0xA2 + register, effects);
        state.raster_transfer_count = 0;
      }
      break;
    default: throw new Error('raster-handler-domain');
  }
}

function commitRasterIrq(catalog, input) {
  const state = cloneFrameValue(input), effects = [];
  try {runHandler(catalog, state, effects);}
  catch (error) {return unavailable$7([error.message]);}
  return {status: 'available', state, effects};
}

const displayPhase = state => Object.fromEntries(['chr_banks', 'chr_mode', 'ppu_ctrl', 'ppu_mask',
  'scroll_x', 'scroll_y', 'ppu_address'].filter(key => state[key] !== undefined)
  .map(key => [key, cloneFrameValue(state[key])]));

function timedDisplayPhases(tables, before, after, selector, line) {
  const timing = tables.timing;
  const path = timing?.handlers?.find(row => row.selector === selector
    && row.phase === (selector === 2 ? after.raster_phase : 0));
  if (!path || timing.irq_entry_cycles !== 7 || timing.ppu_cycles_per_cpu !== 3
      || timing.irq_issue?.split_line_offset !== -2 || timing.irq_issue?.ppu_dot !== 261)
    throw new Error('raster-handler-timing');
  const display = displayPhase(before), phases = [];
  // $0000 背景与 $1000 精灵的 A12 上升位于第 261 dot，整行边界晚两行。
  const issue = (line + timing.irq_issue.split_line_offset) * 341 + timing.irq_issue.ppu_dot;
  const origin = issue + timing.irq_entry_cycles * timing.ppu_cycles_per_cpu;
  let previous = -1, latchTime;
  for (const event of path.events) {
    if (!Number.isInteger(event.cpu_cycle) || event.cpu_cycle <= previous) throw new Error('raster-handler-timing');
    previous = event.cpu_cycle;
    const time = origin + event.cpu_cycle * timing.ppu_cycles_per_cpu;
    if (event.kind === 'irq-latch') {latchTime = time; continue;}
    switch (event.kind) {
      case 'chr-bank':
        setChrBank(display, event.register, after.chr_banks[event.register]); break;
      case 'ppu-control': display.ppu_ctrl = after.ppu_ctrl; break;
      case 'ppu-mask': display.ppu_mask = after.ppu_mask; break;
      case 'ppu-address':
        display.ppu_address = after.ppu_address;
        display.scroll_origin_line = Math.floor(time / 341); break;
      case 'ppu-scroll-x': display.scroll_x = after.scroll_x; break;
      case 'ppu-scroll-y': display.scroll_y = after.scroll_y; break;
      default: throw new Error('raster-timing-event');
    }
    phases.push({line: Math.floor(time / 341), dot: ((time % 341) + 341) % 341, ...cloneFrameValue(display)});
  }
  return {phases, reloadPreviousLatch: latchTime !== undefined && latchTime >= issue + 341};
}

function completeRasterFrame(catalog, input) {
  const state = cloneFrameValue(input), effects = [], phases = [{line: 0, dot: 0, ...displayPhase(state)}];
  try {
    const tables = rasterTables(catalog);
    if (typeof state.irq_enabled !== 'boolean') throw new Error('irq_enabled');
    let line = requireFrameByte(state, 'irq_latch') + 1;
    if (!state.raster_complete && state.ppu_mask & 0x18) while (state.irq_enabled && line < 240) {
      const previousLatch = state.irq_latch;
      const selector = state.irq_handler_index;
      const before = displayPhase(state);
      const irq = commitRasterIrq(catalog, state);
      if (irq.status !== 'available') return irq;
      Object.assign(state, irq.state);
      effects.push({kind: 'raster-irq', line, effects: irq.effects});
      const timed = timedDisplayPhases(tables, before, state, selector, line);
      for (const phase of timed.phases) {
        if (phase.line < 0) Object.assign(phases[0], phase, {line: 0, dot: 0});
        else if (phase.line < 240) phases.push(phase);
      }
      // 长分支的 latch 写入晚于下一次 A12 上升，计数器已装入前一个 latch。
      line += (timed.reloadPreviousLatch ? previousLatch : requireFrameByte(state, 'irq_latch')) + 1;
    }
    state.raster_complete = true;
  } catch (error) {return unavailable$7([error.message]);}
  return {status: 'available', state, effects, frame: {phases}};
}

// @editor-module 共享 NMI 提交按当前工作区执行，帧屏障按显式调度续行。
const byte$2 = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte$1 = requireFrameByte, vector$2 = requireFrameVector;
const unavailable$6 = missing => ({status: 'unavailable', missing});

function writePpu(state, effects, address, value, targets) {
  if (!byte$2(value)) throw new Error("ppu-write-value");
  address &= 0x3FFF;
  effects.push({kind: 'ppu-write', address, value});
  if (address < 0x2000) {
    writeChrRam(state, address, value);
  } else if (address < 0x3F00) {
    const offset = (address - 0x2000) & 4095;
    const page = offset >> 10;
    if (!['horizontal', 'vertical'].includes(state.mirroring)) throw new Error('mirroring');
    const physicalPage = state.mirroring === 'vertical' ? page & 1 : page >> 1;
    const tables = targets.nametables ||= vector$2(state.nametables, 2048, 'nametables');
    tables[physicalPage * 1024 + (offset & 1023)] = value;
  } else {
    const palette = targets.palette ||= vector$2(state.ppu_palette, 32, 'ppu_palette');
    const index = address & 31;
    palette[index] = value & 63;
    if ((index & 3) === 0) palette[index ^ 16] = value & 63;
  }
}

function uploadGlyph(state, effects) {
  const targets = {};
  const glyph = state.glyph;
  if (!glyph || !byte$2(glyph.pending)) throw new Error('glyph.pending');
  if (glyph.pending !== 0) return;
  const first = requireByte$1(glyph, 'first_half');
  const second = requireByte$1(glyph, 'second_half');
  const tiles = vector$2(glyph.tiles, 4, 'glyph.tiles');
  const patterns = vector$2(glyph.patterns, 48, 'glyph.patterns');
  const plane = (tile, offset) => {
    const address = tile * 16;
    glyph.address_low = address & 255;
    glyph.address_high = address >> 8;
    for (let index = 0; index < 8; index++)
      writePpu(state, effects, address + index * (requireByte$1(state, 'ppu_ctrl') & 4 ? 32 : 1), patterns[offset + index], targets);
  };
  if (first !== 0) {
    applyChrBankSet(state, [...state.chr_banks.slice(0, 2), 8, 9, 10, 11], effects);
    plane(tiles[0], 0);
    plane(tiles[1], 8);
    plane(tiles[2], 16);
    plane(tiles[3], 24);
  } else if (second !== 0) {
    plane(tiles[2], 16);
    plane(tiles[3], 24);
    plane(tiles[0], 32);
    plane(tiles[1], 40);
  }
  glyph.pending = 255;
}

function flushQueues(state, effects) {
  const targets = {};
  const main = vector$2(state.main_queue, 352, 'main_queue');
  const increment = requireByte$1(state, 'ppu_ctrl') & 4 ? 32 : 1;
  const spans = requireByte$1(state, 'span_count');
  let cursor = 0;
  for (let span = 0; span < spans; span++) {
    const high = main[cursor]; cursor = (cursor + 1) & 255;
    const low = main[cursor]; cursor = (cursor + 1) & 255;
    const size = main[cursor];
    if (size) cursor = (cursor + 1) & 255;
    for (let index = 0; index < size; index++) {
      writePpu(state, effects, (high << 8 | low) + index * increment, main[cursor], targets);
      cursor = (cursor + 1) & 255;
    }
  }
  state.span_count = 0;
  const triples = (queue, length, offset = 0) => {
    if (!length) return;
    // 尾项允许超过声明长度，X 在递增至 255 时仍可退出。
    for (let index = 0; index < length; index += 3)
      writePpu(state, effects, queue[offset + index] << 8 | queue[offset + index + 1], queue[offset + index + 2], targets);
  };
  triples(main, requireByte$1(state, 'main_queue_length'));
  state.main_queue_length = 0;
  const size = requireByte$1(state, 'contiguous_length');
  if (size) {
    const address = requireByte$1(state, 'contiguous_high') << 8 | requireByte$1(state, 'contiguous_low');
    for (let index = 0; index < size; index++) writePpu(state, effects, address + index * increment, main[index], targets);
  }
  state.contiguous_length = 0;
  if (requireByte$1(state, 'palette_pending')) {
    const palette = vector$2(state.palette_shadow, 32, 'palette_shadow');
    for (let index = 0; index < 32; index++) writePpu(state, effects, 0x3F00 + index * increment, palette[index], targets);
  }
  state.palette_pending = 0;
  const secondary = requireByte$1(state, 'secondary_queue_length');
  if (secondary) triples(main, secondary, 96);
  state.secondary_queue_length = 0;
}

function commitFrameNmi(catalog, input, {advanceAudio} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    vector$2(state.chr_banks, 6, 'chr_banks');
    uploadGlyph(state, effects);
    const mode = requireByte$1(state, 'nmi_mode');
    if (mode & 128) return {status: 'available', state, effects};
    if (mode) {
      if (state.nmi_worker !== 'normal-display') return unavailable$6(['nmi-worker-semantics']);
      if (requireByte$1(state, 'oam_pending')) {
        state.oam = [...vector$2(state.oam_shadow, 256, 'oam_shadow')]
          .map((value, index) => (index & 3) === 2 ? value & 0xE3 : value);
        state.oam_pending = 0;
        effects.push({kind: 'oam-dma', page: 7});
      }
      flushQueues(state, effects);
      applyChrBankSet(state, vector$2(state.chr_shadow, 6, 'chr_shadow'), effects);
      configureFrameRaster(catalog, state, effects);
    }
    if (advanceAudio !== undefined) {
      if (typeof advanceAudio !== 'function') return unavailable$6(['audio-frame-service']);
      const audio = advanceAudio(cloneFrameValue(state));
      if (audio?.status === 'pending') return {status: 'pending', state, effects,
        continuation: {phase: 'nmi-audio'}};
      if (audio?.status !== 'available') return audio || unavailable$6(['audio-frame-service']);
      state = audio.state;
      effects.push(...(audio.effects || []));
    } else effects.push({kind: 'audio-frame'});
    commitNmiTail(state);
  } catch (error) { return unavailable$6([error.message]); }
  return {status: 'available', state, effects};
}

function commitNmiTail(state) {
  state.frame_counter = (requireByte$1(state, 'frame_counter') + 1) & 255;
  if (!requireByte$1(state, 'display_profile') && requireByte$1(state, 'brightness_countdown')) {
    state.brightness_countdown--;
    if (state.brightness_countdown & 1) {
      const palette = vector$2(state.palette_shadow, 32, 'palette_shadow');
      const queue = vector$2(state.main_queue, 352, 'main_queue');
      for (let index = 0; index < 16; index++) {
        const value = palette[index];
        const raised = ((value & 240) + 16) & 255;
        queue[index] = value === 15 ? 15 : raised === 64 ? 48 : raised;
      }
      state.contiguous_low = 0;
      state.contiguous_high = 63;
      state.contiguous_length = 16;
    } else state.palette_pending = (requireByte$1(state, 'palette_pending') + 1) & 255;
  }
}

function completeFrameNmiTail(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  const state = cloneFrameValue(input);
  try {commitNmiTail(state);}
  catch (error) {return unavailable$6([error.message]);}
  return {status: 'available', state, effects: []};
}

function advanceFrameBarrier(catalog, input, {advanceRandom, pollController, nmiEvents} = {}) {
  if (typeof advanceRandom !== 'function') return unavailable$6(['random-wait-schedule']);
  if (typeof pollController !== 'function') return unavailable$6(['controller-poll-effects']);
  if (!Array.isArray(nmiEvents)) return unavailable$6(['nmi-event-schedule']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    const previous = requireByte$1(state, 'frame_counter');
    for (const event of nmiEvents) {
      const raster = completeRasterFrame(catalog, state);
      if (raster.status !== 'available') return raster;
      state = raster.state;
      effects.push(...raster.effects);
      const random = advanceRandom(state, event);
      if (random?.status !== 'available') return random || unavailable$6(['random-wait-schedule']);
      state = random.state;
      effects.push(...random.effects);
      const frame = commitFrameNmi(catalog, state);
      if (frame.status !== 'available') return frame;
      state = frame.state;
      effects.push(...frame.effects);
      if (state.frame_counter !== previous) {
        const polled = pollController(state);
        if (polled?.status !== 'available') return polled || unavailable$6(['controller-poll-effects']);
        return {status: 'available', state: polled.state, effects: [...effects, ...polled.effects]};
      }
    }
  } catch (error) { return unavailable$6([error.message]); }
  return {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
}

function commitPpuQueues(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  const state = cloneFrameValue(input), effects = [];
  try { flushQueues(state, effects); }
  catch (error) { return unavailable$6([error.message]); }
  return {status: 'available', state, effects};
}

// @editor-module 已确认的音频空闲、淡出与持续音分支按当前工作区计算 CPU 耗时。

const unavailable$5 = missing => ({status: 'unavailable', missing});

function measureAudioFrameClock(input) {
  const state = cloneFrameValue(input), paths = [];
  let cycles = 0;
  const add = (kind, cost) => {cycles += cost; paths.push({kind, cycles: cost});};
  try {
    const requests = requireFrameVector(state.requests, 8, 'audio.requests');
    const fade = requireFrameByte(state, 'fade_interval');
    if (!fade) {
      state.fade_index = state.fade_amount = 0;
      add('fade-idle', 15);
    } else {
      state.fade_countdown = (requireFrameByte(state, 'fade_countdown') - 1) & 255;
      if (state.fade_countdown) add('fade-countdown', 15);
      else {
        const fadeCurve = requireFrameVector(state.fade_curve, 16, 'audio.fade_curve');
        const index = requireFrameByte(state, 'fade_index');
        if (index >= fadeCurve.length) return unavailable$5(['audio-fade-index-domain']);
        state.fade_countdown = fade;
        state.fade_amount = (requireFrameByte(state, 'fade_amount') + fadeCurve[index]) & 255;
        state.fade_index = (index + 1) & 255;
        if (state.fade_index === 16) {
          state.requests.fill(0);
          for (const key of ['duration', 'note_countdown', 'note_reload', 'channel_flags']) state[key].fill(0);
          for (const key of ['active_mask', 'effect_mask', 'tempo_low', 'tempo_high', 'tempo_pause',
            'fade_interval', 'fade_countdown', 'fade_index', 'fade_amount', 'dpcm_stop']) state[key] = 0;
          state.tempo_increment_low = state.tempo_increment_high = 255;
          add('fade-reset', 56 + 6 + 4014 + 2 + 4 + 4 + 4);
        } else add('fade-step', 57);
      }
    }
    let admission = 6;
    for (const [first, second] of [[0, 4], [1, 5]]) {
      admission += 8;
      if (!(requests[first] | requests[second])) {admission += 3; continue;}
      admission += 2 + 8;
      if (requests[first] !== requests[first + 2]) return unavailable$5(['audio-command-admission-clock']);
      admission += 2 + 8;
      if (requests[second] !== requests[second + 2]) return unavailable$5(['audio-command-admission-clock']);
      admission += 3;
    }
    add('command-check', 6 + admission);
    let sum = requireFrameByte(state, 'tempo_low') + requireFrameByte(state, 'tempo_increment_low') + 1;
    state.tempo_low = sum & 255;
    sum = requireFrameByte(state, 'tempo_high') + requireFrameByte(state, 'tempo_increment_high') + (sum >>> 8);
    state.tempo_high = sum & 255;
    state.tick = sum > 255 && !requireFrameByte(state, 'tempo_pause') ? 255 : 0;
    add('tempo', 6 + 28 + (sum <= 255 ? 3 : 2 + 4 + (state.tempo_pause ? 3 : 2 + 2 + 4)) + 6);
    const active = requireFrameByte(state, 'active_mask'), effects = requireFrameByte(state, 'effect_mask');
    const duration = requireFrameVector(state.duration, 4, 'audio.duration');
    const noteCountdown = requireFrameVector(state.note_countdown, 4, 'audio.note_countdown');
    const noteReload = requireFrameVector(state.note_reload, 4, 'audio.note_reload');
    const flags = requireFrameVector(state.channel_flags, 4, 'audio.channel_flags');
    add('channel-start', 2);
    for (let channel = 3; channel >= 0; channel--) {
      const mask = 1 << channel;
      let cost = 3 + 4;
      if (!active) {
        cost += 2 + 16 + 3;
        for (const index of [0, 2, 4, 6]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(active & mask)) cost += 3;
        else {
          cost += 2 + 4;
          if (!state.tick) cost += 3;
          else {
            cost += 2 + 7;
            noteCountdown[channel] = (noteCountdown[channel] - 1) & 255;
            if (!noteCountdown[channel]) return unavailable$5(['audio-note-decode-clock']);
            cost += 3;
          }
        }
      }
      cost += 4;
      if (!effects) {
        cost += 2 + 16 + 4;
        for (const index of [1, 3, 5, 7]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(effects & mask)) cost += 4;
        else {
          cost += 2 + 4 + 2 + 5 + 7;
          flags[channel] |= 32;
          duration[channel] = (duration[channel] - 1) & 255;
          if (!duration[channel]) return unavailable$5(['audio-effect-restore-clock']);
          cost += 3;
          add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
          continue;
        }
      }
      cost += 4 + 4;
      if (!(active & mask)) cost += 3;
      else {
        cost += 2 + 4;
        if (!state.tick) cost += 3;
        else {
          cost += 2 + 4 + 4;
          if (noteCountdown[channel] === noteReload[channel]) return unavailable$5(['audio-note-output-clock']);
          cost += 3 + 6;
          if (!(flags[channel] & 32)) return unavailable$5(['audio-envelope-clock']);
          cost += 4 + 2 + 2 + 6;
        }
      }
      add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
    }
    add('dpcm-tail', 4 + (requireFrameByte(state, 'dpcm_stop') ? 2 + 2 + 4 : 3) + 6);
    // D155 的 JSR、D362 的 bank 信封与 A006 trampoline 包住音频帧服务。
    add('nmi-audio-envelope', 65);
  } catch (error) {return unavailable$5([error.message]);}
  return {status: 'available', state, cycles, paths};
}

// @editor-module 普通 NMI 按当前显示与音频工作区计算耗时，不读取 ROM 或采集调用量。

const unavailable$4 = missing => ({status: 'unavailable', missing});
const pageCross = (low, index) => low + index > 255 ? 1 : 0;

function queueCycles(state) {
  const queue = requireFrameVector(state.main_queue, 352, 'main_queue');
  let cycles = 26, cursor = 0;
  const spans = requireFrameByte(state, 'span_count');
  cycles += 6;
  if (spans) {
    cycles += 5 + 2 + 6;
    for (let span = 0; span < spans; span++) {
      cycles += 4;
      cycles += 4 + 4 + pageCross(147, cursor); cursor = (cursor + 1) & 255;
      cycles += 2 + 4 + 4 + pageCross(147, cursor); cursor = (cursor + 1) & 255;
      cycles += 2 + 4 + 2 + pageCross(147, cursor);
      const size = queue[cursor];
      if (!size) cycles += 3;
      else {
        cycles += 2 + 2;
        cursor = (cursor + 1) & 255;
        for (let index = 0; index < size; index++) {
          cycles += 15 + pageCross(147, cursor);
          cursor = (cursor + 1) & 255;
        }
        cycles--;
      }
      cycles += 5 + (span + 1 === spans ? 2 : 3);
    }
  }
  for (const [key, low] of [['main_queue_length', 147], ['secondary_queue_length', 243]]) {
    const length = requireFrameByte(state, key);
    cycles += 6;
    if (!length) continue;
    cycles += 5 + 2 + 11;
    for (let index = 0; index < length; index += 3)
      cycles += 36 + pageCross(low, index) + pageCross(low + 1, index) + pageCross(low + 2, index);
    cycles--;
  }
  const contiguous = requireFrameByte(state, 'contiguous_length');
  cycles += 6;
  if (contiguous) {
    cycles += 5 + 19 + 9;
    for (let index = 0; index < contiguous; index++) cycles += 15 + pageCross(147, index);
    cycles--;
  }
  cycles += 6;
  if (requireFrameByte(state, 'palette_pending')) cycles += 5 + 516;
  return cycles;
}

function glyphCycles(state) {
  const glyph = state.glyph;
  if (requireFrameByte(glyph, 'pending')) return 26;
  const banks = requireFrameByte(state, 'prg_bank_8000') === 10 ? 26 : 92;
  const prelude = 70 + banks;
  if (requireFrameByte(glyph, 'first_half')) return prelude + 1135;
  if (requireFrameByte(glyph, 'second_half')) return prelude + 1043;
  return prelude + 26;
}

function rasterCycles(catalog, state) {
  const profile = requireFrameByte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  const latches = requireFrameVector(catalog.raster?.latches, 13, 'raster.latches');
  const sets = requireFrameVector(catalog.raster?.chr_sets, 13, 'raster.chr_sets');
  let cycles = 139 + pageCross(249, profile);
  if (latches[profile]) cycles -= 2;
  if (profile) {
    cycles += 3 + 4;
    if (!sets[profile]) cycles += 3;
    else cycles += 2 + 6 + 147 + 3 + 3 + 4 + 3;
  }
  return cycles;
}

function tailCycles(state) {
  const profile = requireFrameByte(state, 'display_profile');
  if (profile) return 33;
  const countdown = requireFrameByte(state, 'brightness_countdown');
  if (!countdown) return 38;
  if (!((countdown - 1) & 1)) return 55;
  const palette = requireFrameVector(state.palette_shadow, 32, 'palette_shadow');
  let brightness = 2 + 21;
  for (const value of palette.slice(0, 16)) {
    if (value === 15) brightness += 23;
    else brightness += ((value & 240) + 16) === 64 ? 35 : 31;
  }
  return 59 + brightness - 1;
}

function measureFrameNmiClock(catalog, state, {cpuCycle = 0} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$4(['frame-commit-sources']);
  const paths = [];
  let cycles = 0;
  const add = (kind, cost) => {paths.push({kind, start: cycles, cycles: cost}); cycles += cost;};
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0) throw new Error('cpu-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    add('glyph', glyphCycles(state));
    const mode = requireFrameByte(state, 'nmi_mode');
    if (mode & 128) {
      add('disabled-tail', 3 + 3 + 22);
      return {status: 'available', cycles, paths, changesFrameCounter: false};
    }
    add('dispatch', mode ? 16 : 8);
    if (mode) {
      if (state.nmi_worker !== 'normal-display') throw new Error('nmi-worker-clock');
      let prefix = 6;
      if (requireFrameByte(state, 'oam_pending')) {
        // DMA 在 $4014 写入后的下一个读取开始，奇数相位多一个对齐周期。
        const dmaCycle = cpuCycle + cycles + 3 + 2 + 2 + 3 + 4 + 2 + 4;
        prefix = 20 + 513 + ((dmaCycle + 1) & 1);
      }
      add('display', prefix + 6 + queueCycles(state) + 90);
      add('raster', 6 + rasterCycles(catalog, state) + 3);
    }
    const audio = measureAudioFrameClock(state.audio);
    if (audio.status !== 'available') return audio;
    add('audio', audio.cycles);
    add('tail', tailCycles(state));
    return {status: 'available', cycles, paths, changesFrameCounter: true, audio: audio.state};
  } catch (error) {return unavailable$4([error.message]);}
}

// @editor-module D02E 的双字节随机状态转换。
function advanceGlobalRandom(high, low) {
  const shifted = ((high << 2) | (low >>> 6)) & 255;
  let sum = low + low + ((high >>> 6) & 1);
  sum = (sum & 255) + 17 + (sum >>> 8);
  const nextLow = sum & 255;
  sum = high + shifted + (sum >>> 8);
  sum = (sum & 255) + 55 + (sum >>> 8);
  return {high: sum & 255, low: nextLow, workspaceHigh: shifted};
}

function createRuntimeRandomServices({state}) {
  return Object.freeze({
    advance() {
      try {
        const fields = Object.fromEntries(["high", "low", "workspaceHigh", "workspaceLow"].map(name => {
          const field = state.field(`random.${name}`);
          if (field.knowledge !== "confirmed") throw new TypeError(`random.${name}`);
          return [name, field];
        }));
        const high = fields.high.value, low = fields.low.value;
        if (![high, low].every(value => Number.isInteger(value) && value >= 0 && value <= 255))
          throw new TypeError("random-state");
        const next = advanceGlobalRandom(high, low);
        fields.high.value = next.high;
        fields.low.value = next.low;
        fields.workspaceHigh.value = next.workspaceHigh;
        fields.workspaceLow.value = low;
        return {status: "available", state: state.capture(), effects: [{kind: "random-update"}]};
      } catch (error) {return {status: "unavailable", missing: [error.message]};}
    },
  });
}

let cycles = null;
function globalRandomCycles() {
  if (cycles) return cycles;
  const visited = new Uint8Array(65536), found = [];
  for (let seed = 0; seed < 65536; seed += 1) {
    if (visited[seed]) continue;
    const path = new Map();
    let current = seed;
    while (!visited[current] && !path.has(current)) {
      path.set(current, path.size);
      const next = advanceGlobalRandom(current >> 8, current & 255);
      current = (next.high << 8) | next.low;
    }
    if (path.has(current)) found.push(Object.freeze([...path.keys()].slice(path.get(current))));
    for (const value of path.keys()) visited[value] = 1;
  }
  cycles = Object.freeze(found.sort((left, right) => left.length - right.length));
  return cycles;
}

function globalRandom(seed = 0) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 65535) throw new RangeError("种子须为 0–65535");
  let high = seed >>> 8, low = seed & 255, calls = 0;
  const next = () => {
    ({high, low} = advanceGlobalRandom(high, low));
    calls++;
    return high;
  };
  return {next, below: bound => Math.floor(next() * bound / 256),
    snapshot: () => ({high, low, calls})};
}

// @editor-module D01D 的随机等待按原生指令边界和普通 NMI 耗时推进。

const unavailable$3 = missing => ({status: 'unavailable', missing});
// 固定随机转换没有条件分支，保留边界只为确定中断接受位置。
const randomInstructionCycles = [3, 3, 3, 3, 2, 5, 2, 5, 3, 3, 2, 3, 3, 3, 2, 3, 6];

function nextNmiEdgeCycle(cpuCycle, phase) {
  if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0 || phase?.region !== 'ntsc'
      || !Number.isInteger(phase.scanline) || phase.scanline < -1 || phase.scanline > 260
      || !Number.isInteger(phase.dot) || phase.dot < 0 || phase.dot > 340)
    throw new TypeError('nmi-ppu-phase');
  const lines = 241 - phase.scanline + (phase.scanline >= 241 ? 262 : 0);
  let dots = lines * 341 + 1 - phase.dot;
  if (phase.scanline >= 241 || phase.scanline === -1 && phase.dot < 340) {
    if (!Number.isSafeInteger(phase.frame) || phase.frame < 0 || typeof phase.rendering !== 'boolean')
      throw new TypeError('nmi-ppu-frame-phase');
    if (phase.rendering && (phase.frame & 1)) dots--;
  }
  return cpuCycle + Math.ceil(dots / 3);
}

function advanceRandomWaitClock(catalog, state, {cpuCycle, nmiEdgeCycle} = {}) {
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0 || !Number.isSafeInteger(nmiEdgeCycle)
        || nmiEdgeCycle < cpuCycle || nmiEdgeCycle > cpuCycle + 30000)
      throw new Error('nmi-edge-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    if (state.irq_enabled !== false || requireFrameByte(state, 'display_profile') !== 0)
      throw new Error('irq-acceptance-clock');
    let cycle = cpuCycle, counter = requireFrameByte(state, 'frame_counter'), snapshot;
    let random = {high: requireFrameByte(state.random, 'high'), low: requireFrameByte(state.random, 'low')};
    let calls = 0, nmi = null;
    const step = (cost, action) => {
      cycle += cost;
      action?.();
      // NMI 边沿在下一 CPU 周期进入待处理中断；接受发生在指令完成处。
      if (!nmi && cycle > nmiEdgeCycle) {
        cycle += 7;
        const clock = measureFrameNmiClock(catalog, state, {cpuCycle: cycle});
        if (clock.status !== 'available') throw new Error(clock.missing.join(','));
        nmi = {cpu_cycle: cycle, cycles: clock.cycles, paths: clock.paths, audio: clock.audio};
        cycle += clock.cycles;
        if (clock.changesFrameCounter) counter = (counter + 1) & 255;
      }
    };
    step(2); step(3); step(3, () => {snapshot = counter;});
    for (let iteration = 0; iteration < 512; iteration++) {
      step(6);
      calls++;
      for (const cost of randomInstructionCycles) step(cost);
      random = advanceGlobalRandom(random.high, random.low);
      let equal;
      step(3, () => {equal = counter === snapshot;});
      step(equal ? 3 : 2);
      if (!equal) return {status: 'available', random, calls, cpu_cycle: cycle, frame_counter: counter, nmi};
      if (nmi && counter === snapshot) return {status: 'pending', random, calls, cpu_cycle: cycle,
        frame_counter: counter, nmi, continuation: {phase: 'frame-barrier'}};
    }
    return unavailable$3(['random-wait-clock-domain']);
  } catch (error) {return unavailable$3([error.message]);}
}

// @editor-module 逻辑窗口按行提交图块，再合成与提交属性。

const unavailable$2 = missing => ({status: 'unavailable', missing});
const wrapY = value => value >= 15 ? value - 15 : value;
const attributeIndex = (x, y) => ((y << 2) & 56) | ((x >> 1) & 7) | ((x << 2) & 64);
const quadrant = (x, y) => (y & 1) * 2 + (x & 1);
const tileAddress = (x, y) => 0x2000 | ((x & 32) << 5) | ((y & 31) << 5) | (x & 31);
const attributeAddress = (x, y) => 0x23C0 | ((y << 2) & 56) | ((x >> 1) & 7) | ((x >> 2) & 4) << 8;

function context(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.logical_profiles?.[requireFrameByte(state, 'logical_profile')];
  if (!profile) throw new Error('logical-profile-domain');
  const pages = requireFrameVector(state.nametable_pages, 2, 'nametable_pages');
  const x = (requireFrameByte(state, 'camera_x') + (pages[profile.page_selector] ? 0 : 16)) & 31;
  const y = wrapY((requireFrameByte(state, 'camera_y') + profile.source_y) & 255);
  if (y >= 15) throw new Error('logical-camera-domain');
  return {profile, x, y};
}

function beginLogicalWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  let savedOam;
  try {
    context(catalog, state);
    requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
    requireFrameVector(state.main_queue, 352, 'main_queue');
    savedOam = requireFrameByte(state, 'oam_pending');
    state.oam_pending = 0;
  } catch (error) { return unavailable$2([error.message]); }
  return {status: 'pending', state, effects: [], continuation: {phase: 'logical-tiles', row: 0, saved_oam_pending: savedOam}};
}

function tileBatch(state, profile, x, y, row) {
  const queue = state.main_queue;
  let cursor = 0, spans = 0;
  const startX = x * 2;
  let tileY = y * 2;
  const nextY = value => (value + 1 + (value + 1 >= 30 ? 2 : 0)) & 31;
  for (let index = 0; index < row * 2; index++) tileY = nextY(tileY);
  for (let half = 0; half < 2; half++) {
    if (!(half && state.logical_skip_gate && (profile.skip_row & 1) && tileY === profile.skip_row)) {
      let column = 0;
      while (column < 32) {
        const currentX = (startX + column) & 63;
        const size = Math.min(32 - column, 32 - (currentX & 31));
        const address = tileAddress(currentX, tileY);
        queue[cursor++] = address >> 8;
        queue[cursor++] = address & 255;
        queue[cursor++] = size;
        for (let index = 0; index < size; index++)
          queue[cursor++] = state.logical_tiles[profile.source_offset + row * 64 + half * 32 + column + index];
        column += size;
        spans++;
      }
    }
    tileY = nextY(tileY);
  }
  state.span_count = spans;
}

function mergeAttributes(catalog, state, profile, x, y) {
  const logical = state.logical_tiles;
  const shadow = requireFrameVector(state.attribute_shadow, 128, 'attribute_shadow');
  const masks = catalog.masks;
  if (!requireFrameByte(state, 'logical_attribute_gate')) {
    for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
      const sourceY = (profile.source_y + row) & 255;
      const index = attributeIndex(column, sourceY);
      logical[960 + index] |= masks.keep[quadrant(column, sourceY)] ^ 255;
    }
  }
  for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
    const sourceY = wrapY((profile.source_y + row) & 255);
    const targetY = wrapY((y + row) & 255);
    const targetX = (x + column) & 255;
    const source = logical[960 + attributeIndex(column, sourceY)];
    const palette = (source >> (quadrant(column, sourceY) * 2)) & 3;
    const index = attributeIndex(targetX, targetY), keep = masks.keep[quadrant(targetX, targetY)];
    shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & masks.palette_values[palette]);
  }
}

function attributeBatch(state, x, y, row) {
  let cursor = 0;
  const targetY = y + row * 2;
  for (let column = 0; column < 8 + (x & 1); column++) {
    const targetX = x + column * 2;
    const address = attributeAddress(targetX, targetY);
    state.main_queue[cursor++] = address >> 8;
    state.main_queue[cursor++] = address & 255;
    state.main_queue[cursor++] = state.attribute_shadow[attributeIndex(targetX, targetY)];
  }
  state.main_queue_length = cursor;
}

function resumeLogicalWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable$2(['logical-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  let continuation = {...pending.continuation};
  try {
    const {profile, x, y} = context(catalog, state);
    if (continuation.phase !== 'logical-barrier') {
      if (continuation.phase === 'logical-tiles') tileBatch(state, profile, x, y, continuation.row);
      else if (continuation.phase === 'logical-attributes') attributeBatch(state, x, y, continuation.row);
      else throw new Error('logical-window-phase');
      continuation = {...continuation, phase: 'logical-barrier', next_phase: continuation.phase};
    }
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireFrameByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable$2(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state;
    effects.push(...frame.effects);
    const row = continuation.row + 1;
    if (continuation.next_phase === 'logical-tiles') {
      if (row < profile.rows) continuation = {...continuation, phase: 'logical-tiles', row};
      else {
        state.oam_pending = continuation.saved_oam_pending;
        mergeAttributes(catalog, state, profile, x, y);
        continuation = {...continuation, phase: 'logical-attributes', row: 0};
      }
    } else if (row < profile.attribute_rows + (y >= 9 || (y & 1) ? 1 : 0))
      continuation = {...continuation, phase: 'logical-attributes', row};
    else return {status: 'available', state, effects};
    return {status: 'pending', state, effects, continuation};
  } catch (error) { return unavailable$2([error.message]); }
}

function restoreSceneLogicalRow(catalog, input, row, {readMetatile} = {}) {
  const state = cloneFrameValue(input);
  const effects = [];
  try {
    const {profile} = context(catalog, state);
    if (!Number.isInteger(row) || row < 0 || row >= profile.rows) throw new Error('scene-logical-row');
    if (typeof readMetatile !== 'function') throw new Error('current-scene-metatiles');
    const logical = requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
    const shadow = requireFrameVector(state.attribute_shadow, 128, 'attribute_shadow');
    const worldX = requireFrameByte(state, 'world_x'), worldY = requireFrameByte(state, 'world_y');
    const screenX = requireFrameByte(state, 'camera_x');
    const screenY = wrapY((requireFrameByte(state, 'camera_y') + profile.source_y + row) & 255);
    for (let column = 0; column < 16; column++) {
      const cell = readMetatile((worldX + column) & 255, (worldY + profile.source_y + row) & 255);
      const tiles = requireFrameVector(cell?.tiles, 4, 'current-metatile-tiles');
      const palette = requireFrameByte(cell, 'palette');
      if (palette > 3) throw new Error('current-metatile-palette');
      const offset = profile.source_offset + row * 64 + column * 2;
      logical[offset] = tiles[0]; logical[offset + 1] = tiles[1];
      logical[offset + 32] = tiles[2]; logical[offset + 33] = tiles[3];
      const x = (screenX + column) & 255;
      const index = attributeIndex(x, screenY), keep = catalog.masks.keep[quadrant(x, screenY)];
      shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & catalog.masks.palette_values[palette]);
    }
    effects.push({kind: 'scene-logical-row', row});
  } catch (error) { return unavailable$2([error.message]); }
  return {status: 'available', state, effects};
}

function partialContext(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.partial_profiles?.[requireFrameByte(state, 'logical_profile')];
  if (!profile) throw new Error('partial-window-profile');
  requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
  requireFrameVector(state.main_queue, 352, 'main_queue');
  const pages = requireFrameVector(state.nametable_pages, 2, 'nametable_pages');
  const x = (((requireFrameByte(state, 'camera_x') & 31) * 2 + profile.x) & 255)
    ^ (pages[profile.page_selector] ? 32 : 0);
  let y = (requireFrameByte(state, 'camera_y') * 2 + profile.y) & 255;
  if (y >= 30) y -= 30;
  return {profile, x, y};
}

function beginPartialWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  try {partialContext(catalog, state);}
  catch (error) {return unavailable$2([error.message]);}
  return {status: 'pending', state, effects: [], continuation: {phase: 'partial-tiles', batch: 0}};
}

function resumePartialWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable$2(['partial-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  const continuation = {...pending.continuation};
  try {
    const {profile, x, y} = partialContext(catalog, state);
    if (continuation.phase === 'partial-tiles') {
      let cursor = 0, spans = 0;
      const firstRow = continuation.batch * profile.batch_rows;
      for (let row = firstRow; row < firstRow + profile.batch_rows; row++) {
        let column = 0;
        while (column < profile.width) {
          const currentX = (x + column) & 255;
          const size = Math.min(profile.width - column, 32 - (currentX & 31));
          const address = tileAddress(currentX, (y + row) % 30);
          state.main_queue[cursor++] = address >> 8;
          state.main_queue[cursor++] = address & 255;
          state.main_queue[cursor++] = size;
          for (let index = 0; index < size; index++) state.main_queue[cursor++] =
            state.logical_tiles[((profile.y + row) * 32 + profile.x + column + index) & 1023];
          column += size; spans++;
        }
      }
      state.span_count = spans;
      continuation.phase = 'partial-barrier';
    } else if (continuation.phase !== 'partial-barrier') throw new Error('partial-window-phase');
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireFrameByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable$2(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state; effects.push(...frame.effects);
    const batch = continuation.batch + 1;
    return batch === profile.batches ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'partial-tiles', batch}};
  } catch (error) {return unavailable$2([error.message]);}
}

function createFrameCommitServices(catalog, {advanceRandom, pollController, nmiEvents, readMetatile,
  advanceFrame: frameService} = {}) {
  const advanceFrame = frameService || (state => advanceFrameBarrier(catalog, state, {
    advanceRandom, pollController,
    nmiEvents: typeof nmiEvents === 'function' ? nmiEvents(state) : nmiEvents,
  }));
  return {
    commitNmi: state => commitFrameNmi(catalog, state),
    measureNmiClock: (state, timing) => measureFrameNmiClock(catalog, state, timing),
    measureWaitClock: (state, {cpuCycle, phase, nmiEdgeCycle} = {}) => {
      try {
        return advanceRandomWaitClock(catalog, state, {cpuCycle,
          nmiEdgeCycle: nmiEdgeCycle ?? nextNmiEdgeCycle(cpuCycle, phase)});
      } catch (error) {return unavailable$2([error.message]);}
    },
    advanceFrame,
    beginLogicalWindow: state => beginLogicalWindowCommit(catalog, state),
    resumeLogicalWindow: pending => resumeLogicalWindowCommit(catalog, pending, {advanceFrame}),
    beginPartialWindow: state => beginPartialWindowCommit(catalog, state),
    resumePartialWindow: pending => resumePartialWindowCommit(catalog, pending, {advanceFrame}),
    restoreSceneRow: (state, row) => restoreSceneLogicalRow(catalog, state, row, {readMetatile}),
  };
}

// @editor-module 一号手柄服务从按键输入计算三次锁存及所属输入字段。

const unavailable$1 = missing => ({status: "unavailable", missing});
const buttons = Object.freeze({a: 128, b: 64, select: 32, start: 16, up: 8, down: 4, left: 2, right: 1});

function controllerButtonMask(input) {
  if (!input || typeof input !== "object") throw new TypeError("controller-buttons");
  let value = 0;
  for (const [name, mask] of Object.entries(buttons)) {
    if (typeof input[name] !== "boolean") throw new TypeError(`controller-buttons.${name}`);
    if (input[name]) value |= mask;
  }
  return value;
}

function resolveControllerSamples(catalog, input, samples) {
  const state = structuredClone(input);
  try {
    requireFrameVector(samples, 3, "controller-read-samples");
    const [first, second, third] = samples;
    const value = first === second || first === third ? first : second === third ? second : null;
    state.controller_samples = [...samples];
    if (value !== null) {
      state.controller_edges = (value ^ requireFrameByte(state, "controller_previous")) & value;
      state.controller_previous = value;
      state.direction_index = requireFrameVector(catalog?.controller_directions, 16,
        "controller-direction-source")[value & 15];
      state.controller_samples[0] = value;
    }
    return {status: "available", state, effects: [{kind: "controller-poll", samples: [...samples]}]};
  } catch (error) {return unavailable$1([error.message]);}
}

function pollControllerInput(catalog, input, {readButtons, buttons: heldButtons} = {}) {
  const samples = [];
  let cycles = 2;
  try {
    if (typeof readButtons !== "function" && heldButtons === undefined) throw new Error("controller-buttons");
    for (let sample = 2; sample >= 0; sample--) {
      // STY $4016 的高电平锁存发生在本轮第六个周期。
      const value = controllerButtonMask(typeof readButtons === "function"
        ? readButtons({sample, cycle_offset: cycles + 6}) : heldButtons);
      samples[sample] = value;
      const ones = [...Array(8).keys()].reduce((sum, bit) => sum + ((value >> bit) & 1), 0);
      // BPL 从 D10D 跳到 D0F5 时跨页。
      cycles += 14 + 167 - ones + 2 + (sample ? 4 : 2);
    }
    const result = resolveControllerSamples(catalog, input, samples);
    if (result.status !== "available") return result;
    const [first, second, third] = samples;
    cycles += first === second ? 9 + 35 : first === third ? 14 + 35
      : second === third ? 21 + 35 : 22 + 6;
    return {...result, cycles, timing_scope: "no-interrupts-or-bus-stalls"};
  } catch (error) {return unavailable$1([error.message]);}
}

function createControllerInputServices({state, catalog}) {
  return Object.freeze({
    poll(input) {
      try {
        const fields = Object.fromEntries(["current", "edges", "direction", "samples"].map(name => {
          const field = state.field(`controller.${name}`);
          if (field.knowledge !== "confirmed") throw new TypeError(`controller.${name}`);
          return [name, field];
        }));
        const before = {
          controller_previous: fields.current.value,
          controller_edges: fields.edges.value,
          direction_index: fields.direction.value,
        };
        for (const key of Object.keys(before)) requireFrameByte(before, key);
        const result = pollControllerInput(catalog, before, input);
        if (result.status !== "available") return result;
        fields.samples.value = result.state.controller_samples;
        fields.current.value = result.state.controller_previous;
        fields.edges.value = result.state.controller_edges;
        fields.direction.value = result.state.direction_index;
        return {...result, state: state.capture()};
      } catch (error) {return unavailable$1([error.message]);}
    },
  });
}

// @editor-module OAM 所属计算保留继承字节、写入顺序、裁剪与八位游标。

const byte$1 = (value, name) => requireFrameByte({[name]: value}, name);
const vector$1 = (value, length, name) => requireFrameVector(value, length, name);
const primaryOrders = Object.freeze([
  [0, 1, 15], [14, -1, -1], [15, -1, -1], [0, 1, 16],
]);
const secondaryOrders = Object.freeze([[1, 1, 16], [15, -1, 0]]);

function target(input) {
  const cursor = byte$1(input.cursor, 'oam-cursor');
  if (cursor & 3) throw new TypeError('oam-cursor-alignment');
  return {oam: [...vector$1(input.oam, 256, 'oam-shadow')], cursor, writes: [], sprites: []};
}
function write(output, offset, value) {
  output.oam[offset] = value & 255;
  output.writes.push({offset, value: value & 255});
}
function quartet(output, y, tile, attributes, x) {
  write(output, output.cursor + 1, tile);
  write(output, output.cursor + 3, x);
  write(output, output.cursor, y);
  write(output, output.cursor + 2, attributes);
  output.sprites.push({x: x & 255, y: y & 255, tile, attribute: attributes});
  output.cursor = (output.cursor + 4) & 255;
}

// PRG $026000：横向越界仍写四字节并隐藏 Y，下一条复用当前游标。
function writeCountedOam(input, object, x, y) {
  const output = target(input);
  byte$1(x, 'oam-x'); byte$1(y, 'oam-y');
  if (!Array.isArray(object?.sprites) || !object.sprites.length) throw new TypeError('counted-metasprite');
  for (const sprite of object.sprites) {
    if (![sprite.x, sprite.y].every(value => Number.isInteger(value) && value >= -128 && value <= 127))
      throw new TypeError('counted-metasprite-offset');
    byte$1(sprite.tile, 'metasprite-tile'); byte$1(sprite.attribute, 'metasprite-attribute');
    const rawX = sprite.x & 255, sum = x + rawX, screenX = sum & 255;
    const screenY = (y + sprite.y) & 255;
    write(output, output.cursor, screenY);
    write(output, output.cursor + 1, sprite.tile);
    write(output, output.cursor + 2, sprite.attribute);
    write(output, output.cursor + 3, screenX);
    if ((((screenX >>> 1) | (sum > 255 ? 128 : 0)) ^ rawX) & 128) {
      write(output, output.cursor, 0xEF);
    } else {
      output.sprites.push({x: screenX, y: screenY, tile: sprite.tile, attribute: sprite.attribute});
      output.cursor = (output.cursor + 4) & 255;
    }
  }
  return output;
}

// PRG $02635C/$026422：翻转位与调色板只随接纳的象限推进。
function writeActorOam(input, frame, slot, tables) {
  const output = target(input);
  const descriptor = byte$1(frame?.descriptor, 'actor-descriptor');
  const deltas = vector$1(tables?.deltas, 16, 'actor-tile-deltas');
  const maps = vector$1(tables?.quadrantMaps, 32, 'actor-quadrant-maps');
  const deltaX = vector$1(tables?.xDeltas, 4, 'actor-x-deltas');
  const deltaY = vector$1(tables?.yDeltas, 8, 'actor-y-deltas');
  const attributes = byte$1(slot.attributes, 'actor-attributes');
  const x = byte$1(slot.xLow, 'actor-x-low') | byte$1(slot.xHigh, 'actor-x-high') << 8;
  const y = ((byte$1(slot.yLow, 'actor-y-low') | byte$1(slot.yHigh, 'actor-y-high') << 8) - 4) & 65535;
  const tiles = [byte$1(frame.tile_a, 'actor-tile-a'), (frame.tile_a + deltas[descriptor & 7]) & 255,
    byte$1(frame.tile_b, 'actor-tile-b'), (frame.tile_b + deltas[8 + (descriptor & 7)]) & 255];
  let flips = (descriptor & 0x78) >>> 3, palette = attributes & 15;
  if (attributes & 0x40) {
    flips = maps[flips];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[1], tiles[0], tiles[3], tiles[2]];
  }
  if (attributes & 0x80) {
    flips = maps[16 + flips]; palette = maps[16 + palette];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[2], tiles[3], tiles[0], tiles[1]];
  }
  flips = (flips << 3) & 255;
  for (let quadrant = 3; quadrant >= 0; quadrant--) {
    const screenX = (x + deltaX[quadrant]) & 65535;
    write(output, output.cursor + 3, screenX);
    if (screenX >>> 8) continue;
    const screenY = (y + deltaY[quadrant | ((descriptor & 128) ? 4 : 0)]) & 65535;
    write(output, output.cursor, screenY);
    if (screenY >>> 8) continue;
    write(output, output.cursor + 1, tiles[quadrant]);
    const attribute = ((flips & 0x40) ^ (attributes & 0xC0)) | palette;
    flips = (flips << 1) & 255;
    write(output, output.cursor + 2, attribute);
    output.sprites.push({x: screenX, y: screenY, tile: tiles[quadrant], attribute});
    if (quadrant === 2) palette >>>= 2;
    output.cursor = (output.cursor + 4) & 255;
  }
  return output;
}

// PRG $027031：首列坐标取低字节，列步进溢出后跳过下一格。
function writePackedOam(input, object, x, y) {
  const output = target(input);
  byte$1(x, 'packed-x'); byte$1(y, 'packed-y');
  byte$1(object?.anchor, 'packed-anchor'); byte$1(object?.grid, 'packed-grid');
  const columns = ((object.grid >>> 2) & 7) + 1, rows = (object.grid >>> 5) + 1;
  if (!Array.isArray(object.sprites) || object.sprites.length !== rows * columns)
    throw new TypeError('packed-grid');
  const originX = (x - (object.anchor & 0x1C)) & 255;
  let screenY = (y + 4 - ((object.anchor & 0xE0) >>> 3)) & 255;
  for (let row = 0; row < rows; row++) {
    let screenX = originX, clipped = false;
    for (let column = 0; column < columns; column++) {
      const sprite = object.sprites[row * columns + column];
      byte$1(sprite.tile, 'packed-tile'); byte$1(sprite.attribute, 'packed-attribute');
      if (!clipped && sprite.tile) quartet(output, screenY, sprite.tile, sprite.attribute, screenX);
      const sum = screenX + 8;
      clipped = sum > 255;
      screenX = sum & 255;
    }
    screenY = (screenY + 8) & 255;
  }
  return output;
}

// PRG $026701：原点与列步进保留进位，战斗模式裁掉槽 3..15 的下侧。
function writeBattleOam(input, object, slot, index, mode) {
  const output = target(input);
  const origin = byte$1(object?.origin, 'battle-origin');
  const {columns, rows, palette, tiles} = object;
  if (![columns, rows].every(value => Number.isInteger(value) && value >= 1 && value <= 8))
    throw new TypeError('battle-grid');
  vector$1(tiles, columns * rows, 'battle-tiles');
  if (byte$1(palette, 'battle-palette') > 3) throw new TypeError('battle-palette');
  const flip = byte$1(slot.descriptor, 'battle-descriptor') & 1;
  const x = byte$1(slot.x, 'battle-x'), y = byte$1(slot.y, 'battle-y');
  byte$1(index, 'battle-slot'); byte$1(mode, 'battle-mode');
  const inverse = flip ? 0 : 255;
  const xSum = (((origin & 0xF0) >>> 2) ^ inverse) + x;
  const highSum = inverse + Number(index >= 13 && x < 128 && mode === 2) + Number(xSum > 255);
  let screenY = ((origin & 15) << 2 ^ 255) + y;
  let yHigh = (255 + Number(screenY > 255)) & 255;
  screenY &= 255;
  for (let row = 0; row < rows; row++) {
    let screenX = xSum & 255, xHigh = highSum & 255;
    for (let column = 0; column < columns; column++) {
      const tile = tiles[row * columns + column];
      if (!(xHigh | yHigh) && !(mode === 2 && index >= 3 && screenY >= 0x90) && tile)
        quartet(output, screenY, tile, palette | (flip ? 0x40 : 0), screenX);
      const sum = screenX + (flip ? 0xF8 : 8);
      screenX = sum & 255;
      xHigh = (xHigh + (flip ? 255 : 0) + Number(sum > 255)) & 255;
    }
    const sum = screenY + 8;
    screenY = sum & 255;
    yHigh = (yHigh + Number(sum > 255)) & 255;
  }
  return output;
}

function createSceneOamServices({state, sources}) {
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const value = field(id, index);
    if (value.knowledge !== 'confirmed' || value.value === null) throw new TypeError(id);
    return value.value;
  };
  const scalar = id => byte$1(read(id), id);
  const primary = index => ({descriptor: byte$1(read('render.marker', index), 'render.marker'),
    frame: byte$1(read('render.frame', index), 'render.frame'),
    xLow: byte$1(read('render.screenXLow', index), 'render.screenXLow'),
    xHigh: byte$1(read('render.screenXHigh', index), 'render.screenXHigh'),
    yLow: byte$1(read('render.screenYLow', index), 'render.screenYLow'),
    yHigh: byte$1(read('render.screenYHigh', index), 'render.screenYHigh'),
    attributes: byte$1(read('render.attributes', index), 'render.attributes')});
  const secondary = index => ({descriptor: byte$1(read('oam.secondaryDescriptor', index), 'secondary-descriptor'),
    frame: byte$1(read('oam.secondaryFrame', index), 'secondary-frame'),
    x: byte$1(read('oam.secondaryX', index), 'secondary-x'), y: byte$1(read('oam.secondaryY', index), 'secondary-y')});
  return Object.freeze({compose({entry = 'primary'} = {}) {
    const before = state.capture();
    try {
      if (!['primary', 'secondary', 'append-secondary'].includes(entry)) throw new TypeError('oam-entry');
      let output = target({oam: read('display.oamShadow'), cursor: entry === 'append-secondary' ? scalar('dispatch.renderSlot') : 0});
      const writes = [], slots = [], sprites = [];
      if (entry !== 'append-secondary') {
        for (let at = 0; at < 256; at += 4) write(output, at, 0xEF);
        output.cursor = 0;
      }
      const merge = result => {
        writes.push(...output.writes, ...result.writes); sprites.push(...result.sprites);
        output = {...result, writes: []};
      };
      const counted = slot => writeCountedOam(output, sources.counted(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const packed = slot => writePackedOam(output, sources.packed(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const actor = slot => writeActorOam(output, sources.actorFrame(slot.frame), slot, sources.actorTables());
      const draw = (group, index, slot, forced = null) => {
        if (!slot.frame) return;
        const kind = forced || (slot.descriptor & 128 ? group === 'primary' ? 'actor' : 'battle'
          : slot.descriptor & 64 ? 'packed' : 'counted');
        slots.push({group, index, kind});
        merge(kind === 'actor' ? actor(slot) : kind === 'packed' ? packed(slot) : kind === 'counted'
          ? counted(slot) : writeBattleOam(output, sources.battle(slot.frame), slot, index, scalar('control.mainMode')));
      };
      const phase = scalar('display.frameCounter') & 1;
      if (entry === 'primary') {
        const profile = scalar('parameter.story');
        if (profile >= primaryOrders.length) throw new TypeError('primary-oam-profile');
        if (!profile) draw('primary', 15, primary(15), 'actor');
        const [start, step, end] = primaryOrders[profile || phase];
        for (let index = start; index !== end; index += step) draw('primary', index, primary(index));
      }
      if (entry !== 'primary' || scalar('control.displayProfile')) {
        draw('secondary', 0, secondary(0), 'counted');
        const [start, step, end] = secondaryOrders[phase];
        for (let index = start; index !== end; index += step) draw('secondary', index, secondary(index));
      }
      writes.push(...output.writes);
      field('display.oamShadow').value = output.oam;
      field('dispatch.renderSlot').value = output.cursor;
      field('display.oamPending').value = 255;
      return {status: 'available', state: state.capture(), oam: output.oam, cursor: output.cursor,
        writes, slots, sprites, effects: [{kind: 'oam-dma-request', value: 255}],
        ...(entry === 'primary' ? {randomSnapshot: [scalar('random.high'), scalar('random.low')]} : {})};
    } catch (error) {
      state.restore(before);
      return {status: 'unavailable', missing: [error.message]};
    }
  }});
}

// @editor-module 设施窗口只执行已确认的局部效果，帧循环经共享服务续行。

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (state, key) => {
  if (!byte(state[key])) throw new Error(key);
  return state[key];
};
const vector = (value, size, key) => {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value))
      || value.length !== size || !value.every(byte)) throw new Error(key);
  return value;
};
const unavailable = missing => ({status: 'unavailable', missing});

function executeFacilityWindowRoutine(catalog, id, input = {}, context = {}) {
  const {selectionLayout, selectionMovement, cursorObject} = context;
  const routine = catalog?.routines?.find(row => row.id === id);
  if (routine?.confirmation_status !== 'confirmed' || !routine.implementation)
    return unavailable(routine?.missing || ['window-routine-semantics']);
  const state = structuredClone(input);
  const effects = [];
  try {
    switch (routine.implementation) {
      case 'selection-coordinates': {
        if (requireByte(state, 'coordinate_update_gate') !== 0) break;
        const coordinates = selectionCursorCoordinates(selectionLayout,
          {resource_id: 'selection-layout', kind: 'indexed-coordinate',
            selector: requireByte(state, 'selector')}, requireByte(state, 'selection_index'));
        state.cursor_x = coordinates.x;
        state.cursor_y = coordinates.y;
        effects.push({kind: 'selection-coordinates', ...coordinates});
        break;
      }
      case 'selection-movement': {
        const selector = selectionLayout?.selectors?.find(row => row.selector === requireByte(state, 'selector'));
        const profile = selectionLayout?.profiles?.[selector?.profile];
        const index = requireByte(state, 'selection_index');
        const direction = requireByte(state, 'direction_index');
        const maximum = (requireByte(state, 'selection_count') - 1) & 255;
        if (!profile || direction > 4 || index >= profile.capacity) throw new Error('selection-movement-domain');
        const movementTable = selectionMovement?.records?.find(record =>
          record.id === 'code-module.fixed-ui-table-core-a')?.values || catalog.movement;
        const directionMask = movementTable?.[direction];
        const movementMask = movementTable?.[5 + profile.movement_offset + index];
        if (!byte(directionMask) || !byte(movementMask)) throw new Error('selection-movement-source');
        const movement = directionMask & movementMask;
        let next = index, moved = false;
        if (movement & 1) {
          if (index !== maximum) {next = (index + 1) & 255; moved = true;}
          else if (index !== 0) {next = index - 1; moved = true;}
        } else if (movement & 2) {next = (index - 1) & 255; moved = true;}
        else {
          const candidate = (index + profile.columns) & 255;
          if (movement & 4 && candidate <= maximum) {next = candidate; moved = true;}
          else if (movement & 8) {next = (index - profile.columns) & 255; moved = true;}
        }
        state.selection_index = next;
        if (moved) effects.push({kind: 'audio-command', command: 'audio-command:67'});
        break;
      }
      case 'selection-highlight': {
        const selector = requireByte(state, 'selector');
        if (selector !== 0 && selector !== 2) break;
        const role = requireByte(state, 'role_index');
        const record = catalog.highlight_records?.[role];
        if (!byte(record)) throw new Error('highlight-record-source');
        const x = (((requireByte(state, 'camera_x') * 2) & 255) + 13) & 255;
        let y = (((requireByte(state, 'camera_y') * 2) & 255) + record) & 255;
        if (y >= 30) y -= 30;
        const column = x ^ (requireByte(state, 'nametable_page') !== 0 ? 32 : 0);
        const pointer = 0x2000 + ((column & 32) ? 0x400 : 0) + (y & 31) * 32 + (column & 31);
        const tile = requireByte(state, 'frame_counter') & 32 ? 255 : selector === 0 ? 0x86 : 0x11;
        state.highlight_region = 13;
        state.highlight_record = record;
        state.highlight_pointer = pointer;
        const triple = [pointer >> 8, pointer & 255, tile];
        if (state.main_queue?.length >= 3) {
          for (let index = 0; index < 3; index++) state.main_queue[index] = triple[index];
        } else state.main_queue = triple;
        state.main_queue_length = 3;
        effects.push({kind: 'replace-main-queue', queue: triple});
        break;
      }
      case 'selection-cursor': {
        const sprites = [];
        if (requireByte(state, 'display_profile') && requireByte(state, 'cursor_object_id')) {
          const object = typeof cursorObject === 'function' ? cursorObject(state.cursor_object_id) : cursorObject;
          if (object?.id !== state.cursor_object_id || !object.sprites?.length)
            throw new Error('current-cursor-metasprite');
          const x = requireByte(state, 'cursor_x'), y = requireByte(state, 'cursor_y');
          const result = writeCountedOam({oam: state.oam_shadow, cursor: requireByte(state, 'oam_cursor')}, object, x, y);
          state.oam_shadow = result.oam;
          state.oam_cursor = result.cursor;
          sprites.push(...result.sprites.map(sprite => ({...sprite, attribute: sprite.attribute & 0xE3})));
        }
        state.window_sprites = sprites;
        effects.push({kind: 'window-sprites', sprites});
        break;
      }
      case 'flush-main-queue': {
        const size = requireByte(state, 'main_queue_length');
        if (size % 3) throw new Error('main-queue-triple-domain');
        const transferred = size || 3;
        const queue = state.main_queue;
        if (!(Array.isArray(queue) || ArrayBuffer.isView(queue))
            || queue.length < transferred || !Array.from(queue).slice(0, transferred).every(byte)) throw new Error('main_queue');
        for (let index = 0; index < transferred; index += 3)
          effects.push({kind: 'ppu-write', address: ((queue[index] << 8) | queue[index + 1]) & 0x3FFF,
            value: queue[index + 2]});
        state.main_queue_length = 0;
        break;
      }
      case 'frame-barrier':
        return createFrameCommitServices(context.frameCommitCatalog, context).advanceFrame(state);
      case 'clear-logical-rectangle': {
        vector(state.logical_tiles, 1024, 'logical_tiles');
        const index = routine.rectangle_index ?? requireByte(state, 'rectangle_index');
        const rectangle = catalog.rectangles?.find(row => row.index === index);
        if (!rectangle) throw new Error('logical-rectangle-source');
        const width = rectangle.width || 256, height = rectangle.height || 256;
        const positions = [];
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const offset = ((rectangle.pointer + row * 32 + column) & 0xFFFF) - 0x6000;
          if (offset < 0 || offset >= 1024) throw new Error('rectangle-outside-logical-buffer');
          positions.push(offset);
        }
        for (const offset of positions) state.logical_tiles[offset] = 255;
        state.rectangle_width = width & 255;
        state.rectangle_pointer = (rectangle.pointer + height * 32) & 0xFFFF;
        effects.push({kind: 'logical-buffer-clear', rectangle: {...rectangle}, value: 255});
        break;
      }
      case 'begin-selection-cycle': {
        const coordinates = executeFacilityWindowRoutine(catalog, 'window-F256', state, {selectionLayout});
        if (coordinates.status !== 'available') return coordinates;
        Object.assign(state, coordinates.state);
        effects.push(...coordinates.effects);
        // F1DD 从 F256 返回后读取 059B，随后直落 F1E3。
      }
      // fall through
      case 'begin-selection-wait':
        state.wait_remaining = requireByte(state, 'wait_count');
        return {status: 'pending', state, effects, continuation: {phase: 'scene-render'}, missing: routine.missing};
      default:
        return unavailable(['window-routine-implementation']);
    }
  } catch (error) {
    return unavailable([error.message]);
  }
  return {status: 'available', state, effects};
}

function resumeFacilityWindowCycle(catalog, pending, {renderScene, windowOnly = false, cursorObject,
  advanceFrame, frameCommitCatalog, advanceRandom, pollController, nmiEvents} = {}) {
  if (pending?.status !== 'pending') return unavailable(['selection-cycle-continuation']);
  let state = structuredClone(pending.state);
  const effects = [...pending.effects];
  try {
    if (!advanceFrame && frameCommitCatalog) advanceFrame = createFrameCommitServices(frameCommitCatalog,
      {advanceRandom, pollController, nmiEvents}).advanceFrame;
    if (pending.continuation.phase === 'scene-render') {
      if (typeof renderScene !== 'function' && !windowOnly)
        return {...pending, ...unavailable(['scene-actor-frame-effects'])};
      let rendered;
      if (typeof renderScene === 'function') rendered = renderScene(state);
      else {
        state.oam_shadow = Array.from({length: 256}, (_, index) => index % 4 === 0 ? 0xEF : 0);
        state.oam_cursor = 0;
        rendered = executeFacilityWindowRoutine(catalog, 'window-A233-cursor', state, {cursorObject});
        if (rendered.status === 'available') rendered.state.oam_pending = 255;
      }
      if (rendered?.status !== 'available') return {...pending, ...unavailable(rendered?.missing || ['scene-actor-frame-effects'])};
      state = rendered.state;
      effects.push(...rendered.effects);
      const highlighted = executeFacilityWindowRoutine(catalog, 'window-F276', state);
      if (highlighted.status !== 'available') return highlighted;
      state = highlighted.state;
      effects.push(...highlighted.effects);
    } else if (pending.continuation.phase !== 'frame-barrier') throw new Error('selection-cycle-phase');
    const barrier = {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
    if (typeof advanceFrame !== 'function') return {...barrier, ...unavailable(['frame-barrier-effects'])};
    const frame = advanceFrame(structuredClone(state));
    if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
    if (frame?.status !== 'available') return {...barrier, ...unavailable(frame?.missing || ['frame-barrier-effects'])};
    if (requireByte(frame.state, 'frame_counter') === requireByte(state, 'frame_counter')) return barrier;
    state = frame.state;
    effects.push(...frame.effects);
    if (requireByte(state, 'controller_edges') !== 0) return {status: 'available', state, effects};
    state.wait_remaining = (requireByte(state, 'wait_remaining') - 1) & 255;
    return state.wait_remaining === 0 ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'scene-render'}};
  } catch (error) {
    return unavailable([error.message]);
  }
}

function executeFacilityWindowConstruction(catalog, program, input, context = {}) {
  if (!Array.isArray(program)) return unavailable(['window-construction-program']);
  const previous = context.continuation;
  let index = previous?.index ?? 0;
  if (!Number.isInteger(index) || index < 0 || index > program.length)
    return unavailable(['window-construction-continuation']);
  let state = structuredClone(input), effects = [];
  const services = createFrameCommitServices(context.frameCommitCatalog, context);
  for (; index < program.length; index++) {
    const operation = program[index];
    let result;
    const pending = previous?.index === index ? previous.pending : null;
    if (operation.kind === 'window-routine') {
      result = pending && ['window-F1DD', 'window-F1E3'].includes(operation.routine)
        ? resumeFacilityWindowCycle(catalog, {...pending, state, effects: []}, context)
        : executeFacilityWindowRoutine(catalog, operation.routine, state, context);
    } else if (operation.kind === 'logical-window') {
      result = pending ? services.resumeLogicalWindow({...pending, state, effects: []})
        : services.beginLogicalWindow(state);
    } else if (operation.kind === 'restore-scene-row') {
      result = services.restoreSceneRow(state, operation.row);
    } else return {status: 'unavailable', state, effects, stopped_at: index,
      missing: ['window-construction-operation']};
    if (result.status !== 'available') return {...result, state: result.state || state,
      effects: [...effects, ...(result.effects || [])],
      construction_continuation: {index, pending: result.status === 'pending' ? result : pending}};
    state = result.state;
    effects.push(...result.effects);
  }
  return {status: 'available', state, effects};
}

function facilityWindowFrameSchedule(catalog, events) {
  let current;
  return {
    nmiEvents: events,
    advanceRandom(state, event) {
      if (!Number.isSafeInteger(event?.random_calls) || event.random_calls < 0)
        return unavailable(['random-wait-schedule']);
      const next = structuredClone(state);
      try {
        for (let index = 0; index < event.random_calls; index++) {
          const random = advanceGlobalRandom(requireByte(next, 'random_high'), requireByte(next, 'random_low'));
          next.random_high = random.high;
          next.random_low = random.low;
          next.random_workspace = random.workspaceHigh;
        }
      } catch (error) { return unavailable([error.message]); }
      current = event;
      return {status: 'available', state: next, effects: [{kind: 'random-wait', calls: event.random_calls}]};
    },
    pollController(state) {
      return resolveControllerSamples(catalog, state, current?.controller_samples);
    },
  };
}

export { advanceGlobalRandom, cloneFrameValue, commitFrameNmi, commitRasterIrq, completeFrameNmiTail, completeRasterFrame, createControllerInputServices, createFrameCommitServices, createRuntimeRandomServices, createSceneOamServices, executeFacilityWindowConstruction, executeFacilityWindowRoutine, facilityWindowFrameSchedule, globalEventFlagEntries, globalEventFlagEntry, globalEventFlagHandle, globalRandom, globalRandomCycles, prepareGlobalEventFlags, requireFrameByte, requireFrameVector, resolveChrPatternTable, resumeFacilityWindowCycle, sameFrameVector };
