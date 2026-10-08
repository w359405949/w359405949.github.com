// @editor-module CHR 映射服务独占寄存器映射与图样地址解算。
import {requireFrameByte as byte, requireFrameVector as vector} from './frame-state-values.js';

export function applyChrBankSet(state, banks, effects = []) {
  state.chr_banks = Array.from(vector(banks, 6, 'chr-bank-set'), (bank, index) => index < 2 ? bank & 254 : bank);
  state.chr_mode = 1;
  effects.push({kind: 'chr-banks', banks: [...state.chr_banks], mode: 1});
}

export function setChrBank(state, register, bank, effects = []) {
  vector(state.chr_banks, 6, 'chr_banks');
  byte({bank}, 'bank');
  if (!Number.isInteger(register) || register < 0 || register > 5) throw new Error('chr-register');
  state.chr_banks[register] = register < 2 ? bank & 254 : bank;
  state.chr_mode = 1;
  effects.push({kind: 'chr-bank', register, bank, mode: 1});
}

function chrMappedPages(state) {
  const banks = vector(state.chr_banks, 6, 'chr_banks'), mode = byte(state, 'chr_mode');
  if (mode > 1) throw new Error('chr_mode');
  const pages = [banks[0] & 254, banks[0] | 1, banks[1] & 254, banks[1] | 1, ...banks.slice(2)];
  return mode ? [...pages.slice(4), ...pages.slice(0, 4)] : pages;
}

export function writeChrRam(state, address, value) {
  const bank = chrMappedPages(state)[address >> 10];
  if (bank === 8 || bank === 9)
    vector(state.chr_ram, 2048, 'chr_ram')[(bank - 8) * 1024 + (address & 1023)] = value;
}

export async function resolveChrPatternTable(state, readBank) {
  const result = new Uint8Array(8192);
  await Promise.all(chrMappedPages(state).map(async (bank, index) => {
    const bytes = bank === 8 || bank === 9
      ? vector(state.chr_ram, 2048, 'chr_ram').slice((bank - 8) * 1024, (bank - 7) * 1024)
      : await readBank(bank);
    result.set(vector(bytes, 1024, 'chr-bank-patterns'), index * 1024);
  }));
  return result;
}
