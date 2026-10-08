// @editor-module 普通 NMI 按当前显示与音频工作区计算耗时，不读取 ROM 或采集调用量。
import {requireFrameByte as byte, requireFrameVector as vector} from './frame-state-values.js';
import {measureAudioFrameClock} from '../audio/frame-clock.js';

const unavailable = missing => ({status: 'unavailable', missing});
const pageCross = (low, index) => low + index > 255 ? 1 : 0;

function queueCycles(state) {
  const queue = vector(state.main_queue, 352, 'main_queue');
  let cycles = 26, cursor = 0;
  const spans = byte(state, 'span_count');
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
    const length = byte(state, key);
    cycles += 6;
    if (!length) continue;
    cycles += 5 + 2 + 11;
    for (let index = 0; index < length; index += 3)
      cycles += 36 + pageCross(low, index) + pageCross(low + 1, index) + pageCross(low + 2, index);
    cycles--;
  }
  const contiguous = byte(state, 'contiguous_length');
  cycles += 6;
  if (contiguous) {
    cycles += 5 + 19 + 9;
    for (let index = 0; index < contiguous; index++) cycles += 15 + pageCross(147, index);
    cycles--;
  }
  cycles += 6;
  if (byte(state, 'palette_pending')) cycles += 5 + 516;
  return cycles;
}

function glyphCycles(state) {
  const glyph = state.glyph;
  if (byte(glyph, 'pending')) return 26;
  const banks = byte(state, 'prg_bank_8000') === 10 ? 26 : 92;
  const prelude = 70 + banks;
  if (byte(glyph, 'first_half')) return prelude + 1135;
  if (byte(glyph, 'second_half')) return prelude + 1043;
  return prelude + 26;
}

function rasterCycles(catalog, state) {
  const profile = byte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  const latches = vector(catalog.raster?.latches, 13, 'raster.latches');
  const sets = vector(catalog.raster?.chr_sets, 13, 'raster.chr_sets');
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
  const profile = byte(state, 'display_profile');
  if (profile) return 33;
  const countdown = byte(state, 'brightness_countdown');
  if (!countdown) return 38;
  if (!((countdown - 1) & 1)) return 55;
  const palette = vector(state.palette_shadow, 32, 'palette_shadow');
  let brightness = 2 + 21;
  for (const value of palette.slice(0, 16)) {
    if (value === 15) brightness += 23;
    else brightness += ((value & 240) + 16) === 64 ? 35 : 31;
  }
  return 59 + brightness - 1;
}

export function measureFrameNmiClock(catalog, state, {cpuCycle = 0} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable(['frame-commit-sources']);
  const paths = [];
  let cycles = 0;
  const add = (kind, cost) => {paths.push({kind, start: cycles, cycles: cost}); cycles += cost;};
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0) throw new Error('cpu-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    add('glyph', glyphCycles(state));
    const mode = byte(state, 'nmi_mode');
    if (mode & 128) {
      add('disabled-tail', 3 + 3 + 22);
      return {status: 'available', cycles, paths, changesFrameCounter: false};
    }
    add('dispatch', mode ? 16 : 8);
    if (mode) {
      if (state.nmi_worker !== 'normal-display') throw new Error('nmi-worker-clock');
      let prefix = 6;
      if (byte(state, 'oam_pending')) {
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
  } catch (error) {return unavailable([error.message]);}
}
