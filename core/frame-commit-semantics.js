// @editor-module 共享 NMI 提交按当前工作区执行，帧屏障按显式调度续行。
import {requireFrameByte, requireFrameVector, cloneFrameValue} from './frame-state-values.js';
import {applyChrBankSet, writeChrRam} from './chr-bank-mapping-semantics.js';
import {configureFrameRaster, completeRasterFrame} from './raster-interrupt-semantics.js';
export {requireFrameByte, requireFrameVector} from './frame-state-values.js';
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = requireFrameByte, vector = requireFrameVector;
const unavailable = missing => ({status: 'unavailable', missing});

function writePpu(state, effects, address, value, targets) {
  if (!byte(value)) throw new Error("ppu-write-value");
  address &= 0x3FFF;
  effects.push({kind: 'ppu-write', address, value});
  if (address < 0x2000) {
    writeChrRam(state, address, value);
  } else if (address < 0x3F00) {
    const offset = (address - 0x2000) & 4095;
    const page = offset >> 10;
    if (!['horizontal', 'vertical'].includes(state.mirroring)) throw new Error('mirroring');
    const physicalPage = state.mirroring === 'vertical' ? page & 1 : page >> 1;
    const tables = targets.nametables ||= vector(state.nametables, 2048, 'nametables');
    tables[physicalPage * 1024 + (offset & 1023)] = value;
  } else {
    const palette = targets.palette ||= vector(state.ppu_palette, 32, 'ppu_palette');
    const index = address & 31;
    palette[index] = value & 63;
    if ((index & 3) === 0) palette[index ^ 16] = value & 63;
  }
}

function uploadGlyph(state, effects) {
  const targets = {};
  const glyph = state.glyph;
  if (!glyph || !byte(glyph.pending)) throw new Error('glyph.pending');
  if (glyph.pending !== 0) return;
  const first = requireByte(glyph, 'first_half');
  const second = requireByte(glyph, 'second_half');
  const tiles = vector(glyph.tiles, 4, 'glyph.tiles');
  const patterns = vector(glyph.patterns, 48, 'glyph.patterns');
  const plane = (tile, offset) => {
    const address = tile * 16;
    glyph.address_low = address & 255;
    glyph.address_high = address >> 8;
    for (let index = 0; index < 8; index++)
      writePpu(state, effects, address + index * (requireByte(state, 'ppu_ctrl') & 4 ? 32 : 1), patterns[offset + index], targets);
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
  const main = vector(state.main_queue, 352, 'main_queue');
  const increment = requireByte(state, 'ppu_ctrl') & 4 ? 32 : 1;
  const spans = requireByte(state, 'span_count');
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
  triples(main, requireByte(state, 'main_queue_length'));
  state.main_queue_length = 0;
  const size = requireByte(state, 'contiguous_length');
  if (size) {
    const address = requireByte(state, 'contiguous_high') << 8 | requireByte(state, 'contiguous_low');
    for (let index = 0; index < size; index++) writePpu(state, effects, address + index * increment, main[index], targets);
  }
  state.contiguous_length = 0;
  if (requireByte(state, 'palette_pending')) {
    const palette = vector(state.palette_shadow, 32, 'palette_shadow');
    for (let index = 0; index < 32; index++) writePpu(state, effects, 0x3F00 + index * increment, palette[index], targets);
  }
  state.palette_pending = 0;
  const secondary = requireByte(state, 'secondary_queue_length');
  if (secondary) triples(main, secondary, 96);
  state.secondary_queue_length = 0;
}

export function commitFrameNmi(catalog, input, {advanceAudio} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable(['frame-commit-sources']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    vector(state.chr_banks, 6, 'chr_banks');
    uploadGlyph(state, effects);
    const mode = requireByte(state, 'nmi_mode');
    if (mode & 128) return {status: 'available', state, effects};
    if (mode) {
      if (state.nmi_worker !== 'normal-display') return unavailable(['nmi-worker-semantics']);
      if (requireByte(state, 'oam_pending')) {
        state.oam = [...vector(state.oam_shadow, 256, 'oam_shadow')]
          .map((value, index) => (index & 3) === 2 ? value & 0xE3 : value);
        state.oam_pending = 0;
        effects.push({kind: 'oam-dma', page: 7});
      }
      flushQueues(state, effects);
      applyChrBankSet(state, vector(state.chr_shadow, 6, 'chr_shadow'), effects);
      configureFrameRaster(catalog, state, effects);
    }
    if (advanceAudio !== undefined) {
      if (typeof advanceAudio !== 'function') return unavailable(['audio-frame-service']);
      const audio = advanceAudio(cloneFrameValue(state));
      if (audio?.status === 'pending') return {status: 'pending', state, effects,
        continuation: {phase: 'nmi-audio'}};
      if (audio?.status !== 'available') return audio || unavailable(['audio-frame-service']);
      state = audio.state;
      effects.push(...(audio.effects || []));
    } else effects.push({kind: 'audio-frame'});
    commitNmiTail(state);
  } catch (error) { return unavailable([error.message]); }
  return {status: 'available', state, effects};
}

function commitNmiTail(state) {
  state.frame_counter = (requireByte(state, 'frame_counter') + 1) & 255;
  if (!requireByte(state, 'display_profile') && requireByte(state, 'brightness_countdown')) {
    state.brightness_countdown--;
    if (state.brightness_countdown & 1) {
      const palette = vector(state.palette_shadow, 32, 'palette_shadow');
      const queue = vector(state.main_queue, 352, 'main_queue');
      for (let index = 0; index < 16; index++) {
        const value = palette[index];
        const raised = ((value & 240) + 16) & 255;
        queue[index] = value === 15 ? 15 : raised === 64 ? 48 : raised;
      }
      state.contiguous_low = 0;
      state.contiguous_high = 63;
      state.contiguous_length = 16;
    } else state.palette_pending = (requireByte(state, 'palette_pending') + 1) & 255;
  }
}

export function completeFrameNmiTail(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable(['frame-commit-sources']);
  const state = cloneFrameValue(input);
  try {commitNmiTail(state);}
  catch (error) {return unavailable([error.message]);}
  return {status: 'available', state, effects: []};
}

export function advanceFrameBarrier(catalog, input, {advanceRandom, pollController, nmiEvents} = {}) {
  if (typeof advanceRandom !== 'function') return unavailable(['random-wait-schedule']);
  if (typeof pollController !== 'function') return unavailable(['controller-poll-effects']);
  if (!Array.isArray(nmiEvents)) return unavailable(['nmi-event-schedule']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    const previous = requireByte(state, 'frame_counter');
    for (const event of nmiEvents) {
      const raster = completeRasterFrame(catalog, state);
      if (raster.status !== 'available') return raster;
      state = raster.state;
      effects.push(...raster.effects);
      const random = advanceRandom(state, event);
      if (random?.status !== 'available') return random || unavailable(['random-wait-schedule']);
      state = random.state;
      effects.push(...random.effects);
      const frame = commitFrameNmi(catalog, state);
      if (frame.status !== 'available') return frame;
      state = frame.state;
      effects.push(...frame.effects);
      if (state.frame_counter !== previous) {
        const polled = pollController(state);
        if (polled?.status !== 'available') return polled || unavailable(['controller-poll-effects']);
        return {status: 'available', state: polled.state, effects: [...effects, ...polled.effects]};
      }
    }
  } catch (error) { return unavailable([error.message]); }
  return {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
}

export function commitPpuQueues(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable(['frame-commit-sources']);
  const state = cloneFrameValue(input), effects = [];
  try { flushQueues(state, effects); }
  catch (error) { return unavailable([error.message]); }
  return {status: 'available', state, effects};
}
