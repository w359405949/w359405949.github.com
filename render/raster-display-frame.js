// @editor-module 光栅画面使用共享显示阶段与 CHR 服务提供的当前图样。
import {completeRasterFrame} from '../core/raster-interrupt-semantics.js';
import {resolveChrPatternTable} from '../core/chr-bank-mapping-semantics.js';

export async function resolveRasterDisplayFrame(catalog, state, readChrBank) {
  const result = completeRasterFrame(catalog, state);
  return resolveRasterDisplayResult(result, state, readChrBank);
}

export async function resolveRasterDisplayResult(result, state, readChrBank) {
  if (result.status !== 'available') return result;
  try {
    const banks = new Map();
    const read = bank => {
      if (!banks.has(bank)) banks.set(bank, Promise.resolve(readChrBank(bank)));
      return banks.get(bank);
    };
    const phases = await Promise.all(result.frame.phases.map(async phase => ({...phase,
      pattern_table: await resolveChrPatternTable({...state, ...phase}, read)})));
    return {...result, frame: {phases}};
  } catch (error) {return {status: 'unavailable', missing: [error.message]};}
}
