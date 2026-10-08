// @editor-module 光栅服务按显示配置与当前现场执行所属 IRQ handler。
import {requireFrameByte as byte, requireFrameVector as vector, cloneFrameValue} from './frame-state-values.js';
import {applyChrBankSet, setChrBank} from './chr-bank-mapping-semantics.js';

const unavailable = missing => ({status: 'unavailable', missing});
function rasterTables(catalog) {
  if (catalog?.confirmation_status !== 'confirmed' || !catalog.raster) throw new Error('raster-sources');
  const tables = catalog.raster;
  for (const key of ['handler_indices', 'latches', 'chr_sets']) vector(tables[key], 13, `raster.${key}`);
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

export function configureFrameRaster(catalog, state, effects) {
  const tables = rasterTables(catalog), profile = byte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  control(state, byte(state, 'ppu_ctrl_shadow'), effects);
  state.ppu_mask = byte(state, 'ppu_mask_shadow');
  state.scroll_x = byte(state, 'scroll_x_shadow');
  state.scroll_y = byte(state, 'scroll_y_shadow');
  latch(state, tables.latches[profile] || byte(state, 'dynamic_irq_latch'), effects);
  state.raster_phase = 0;
  delete state.ppu_address;
  selectHandler(tables, state, tables.handler_indices[profile], effects);
  state.irq_enabled = profile !== 0;
  state.raster_complete = false;
  if (profile && tables.chr_sets[profile]) {
    applyChrBankSet(state, vector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
    control(state, state.ppu_ctrl ^ byte(state, 'nametable_xor'), effects);
  }
  effects.push({kind: 'raster-setup', profile, irq_latch: state.irq_latch,
    irq_handler: state.irq_handler, irq_enabled: state.irq_enabled,
    ppu_ctrl: state.ppu_ctrl, ppu_mask: state.ppu_mask, scroll_x: state.scroll_x, scroll_y: state.scroll_y});
}

function runHandler(catalog, state, effects) {
  const tables = rasterTables(catalog), selector = byte(state, 'irq_handler_index');
  if (selector >= 16 || state.irq_handler !== tables.handlers[selector]) throw new Error('raster-handler-binding');
  if (!byte(state, 'display_profile')) {disable(state, effects); return;}
  state.irq_enabled = true;
  const primary = () => applyChrBankSet(state, vector(state.primary_chr_banks, 6, 'primary_chr_banks'), effects);
  const raster = () => applyChrBankSet(state, vector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
  const toggle = () => control(state, byte(state, 'ppu_ctrl_shadow') ^ byte(state, 'nametable_page'), effects);
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
      applyChrBankSet(state, vector(state.chr_shadow, 6, 'chr_shadow'), effects);
      control(state, byte(state, 'ppu_ctrl_shadow'), effects); break;
    case 2: {
      state.raster_phase = (byte(state, 'raster_phase') + 1) & 255;
      const phase = state.raster_phase;
      if (phase < 1 || phase > 3) throw new Error('raster-phase-domain');
      const bank = phase === 3 ? 0x24 : vector(tables.stage_chr2, 3, 'raster.stage_chr2')[phase];
      setChrBank(state, 2, bank, effects); setChrBank(state, 3, (bank + 1) & 255, effects);
      latch(state, phase === 3 ? 0x19 : vector(tables.stage_latches, 3, 'raster.stage_latches')[phase], effects);
      selectHandler(tables, state, phase === 3 ? 3 : 2, effects); break;
    }
    case 3:
      toggle(); setChrBank(state, 2, 8, effects); setChrBank(state, 3, 9, effects);
      latch(state, 0x0F, effects); selectHandler(tables, state, 4, effects); break;
    case 4:
      disable(state, effects); fixed(); break;
    case 5: {
      disable(state, effects); toggle();
      const banks = vector(state.primary_chr_banks, 6, 'primary_chr_banks');
      setChrBank(state, 0, banks[0], effects); setChrBank(state, 1, banks[1], effects); fixed(); break;
    }
    case 6:
      disable(state, effects);
      if (!Number.isInteger(state.raster_address) || state.raster_address < 0 || state.raster_address > 65535)
        throw new Error('raster_address');
      state.ppu_address = state.raster_address & 0x3FFF;
      state.scroll_x = byte(state, 'scroll_x_shadow'); state.scroll_y = byte(state, 'scroll_y_shadow');
      effects.push({kind: 'ppu-scroll-restore', address: state.ppu_address,
        x: state.scroll_x, y: state.scroll_y});
      control(state, byte(state, 'raster_restore_ctrl'), effects); primary(); break;
    case 7: case 12: case 13: break;
    case 8:
      latch(state, 0x34, effects); selectHandler(tables, state, 9, effects); primary(); break;
    case 9:
      disable(state, effects); raster(); break;
    case 10:
      disable(state, effects); control(state, byte(state, 'ppu_ctrl_shadow') ^ 1, effects);
      state.ppu_mask = byte(state, 'ppu_mask_shadow') & 0xEF;
      effects.push({kind: 'ppu-mask', value: state.ppu_mask}); break;
    case 11: case 14: case 15:
      selectHandler(tables, state, 0, effects);
      latch(state, (0x90 - byte(state, 'dynamic_irq_latch')) & 255, effects);
      control(state, byte(state, 'raster_ctrl') ^ 1, effects);
      if (selector !== 11) {
        for (let register = 2; register <= 4; register++) setChrBank(state, register, 0xA2 + register, effects);
        state.raster_transfer_count = 0;
      }
      break;
    default: throw new Error('raster-handler-domain');
  }
}

export function commitRasterIrq(catalog, input) {
  const state = cloneFrameValue(input), effects = [];
  try {runHandler(catalog, state, effects);}
  catch (error) {return unavailable([error.message]);}
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

export function completeRasterFrame(catalog, input) {
  const state = cloneFrameValue(input), effects = [], phases = [{line: 0, dot: 0, ...displayPhase(state)}];
  try {
    const tables = rasterTables(catalog);
    if (typeof state.irq_enabled !== 'boolean') throw new Error('irq_enabled');
    let line = byte(state, 'irq_latch') + 1;
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
      line += (timed.reloadPreviousLatch ? previousLatch : byte(state, 'irq_latch')) + 1;
    }
    state.raster_complete = true;
  } catch (error) {return unavailable([error.message]);}
  return {status: 'available', state, effects, frame: {phases}};
}
