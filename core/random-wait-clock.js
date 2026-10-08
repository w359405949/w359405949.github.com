// @editor-module D01D 的随机等待按原生指令边界和普通 NMI 耗时推进。
import {advanceGlobalRandom} from './global-random.js';
import {requireFrameByte as byte} from './frame-state-values.js';
import {measureFrameNmiClock} from './frame-nmi-clock.js';

const unavailable = missing => ({status: 'unavailable', missing});
// 固定随机转换没有条件分支，保留边界只为确定中断接受位置。
const randomInstructionCycles = [3, 3, 3, 3, 2, 5, 2, 5, 3, 3, 2, 3, 3, 3, 2, 3, 6];

export function nextNmiEdgeCycle(cpuCycle, phase) {
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

export function advanceRandomWaitClock(catalog, state, {cpuCycle, nmiEdgeCycle} = {}) {
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0 || !Number.isSafeInteger(nmiEdgeCycle)
        || nmiEdgeCycle < cpuCycle || nmiEdgeCycle > cpuCycle + 30000)
      throw new Error('nmi-edge-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    if (state.irq_enabled !== false || byte(state, 'display_profile') !== 0)
      throw new Error('irq-acceptance-clock');
    let cycle = cpuCycle, counter = byte(state, 'frame_counter'), snapshot;
    let random = {high: byte(state.random, 'high'), low: byte(state.random, 'low')};
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
    return unavailable(['random-wait-clock-domain']);
  } catch (error) {return unavailable([error.message]);}
}
