// @editor-module 为扩容 ROM 准备复位短桩、RAM 检测程序与扩展区执行片段。

import profile from "../project/config/rom-expansion/mapper74-boot-test.json" with {type: "json"};

const BOOT_BANK = profile.boot_bank;
const STUB_CPU = profile.stub.cpu;
const STUB_CAPACITY = profile.stub.capacity;
const PROGRAM_CPU = profile.program.cpu;
const PROGRAM_CAPACITY = profile.program.capacity;
const RESULT = profile.result_cpu;

function program(origin) {
  const bytes = [], labels = new Map(), fixups = [];
  const emit = (...values) => bytes.push(...values);
  const label = name => labels.set(name, origin + bytes.length);
  const absolute = (opcode, target) => {
    emit(opcode, 0, 0);
    fixups.push({at: bytes.length - 2, target});
  };
  const branch = (opcode, target) => {
    emit(opcode, 0);
    fixups.push({at: bytes.length - 1, target, relative: true});
  };
  const finish = () => {
    for (const {at, target, relative} of fixups) {
      const address = labels.get(target);
      if (address === undefined) throw new Error(`检测程序缺少标签 ${target}`);
      const value = relative ? address - (origin + at + 1) : address;
      if (relative && (value < -128 || value > 127)) throw new Error(`检测程序分支越界 ${target}`);
      bytes[at] = value & 255;
      if (!relative) bytes[at + 1] = value >> 8;
    }
    return Uint8Array.from(bytes);
  };
  return {emit, label, absolute, branch, finish, labels};
}

function tiles(text) {
  return Array.from(text, character => character === " " ? 127 :
    character === "-" ? 98 : parseInt(character, 36));
}

function mapBank(emit, register, bank) {
  emit(0xA9, register, 0x8D, 0, 0x80, 0xA9, bank, 0x8D, 1, 0x80);
}

function ppuAddress(emit, address) {
  emit(0xA9, address >> 8, 0x8D, 6, 0x20, 0xA9, address & 255, 0x8D, 6, 0x20);
}

export function prepareExpandedRomTest() {
  const stub = program(STUB_CPU);
  const {emit: s, label: sl, absolute: sa, branch: sb} = stub;
  s(0x78, 0xD8, 0xA2, 255, 0x9A, 0xA9, 0,
    0x8D, 0, 0x20, 0x8D, 1, 0x20, 0x8D, 0, 0xE0);
  sl("warm1"); s(0x2C, 2, 0x20); sb(0x10, "warm1");
  sl("warm2"); s(0x2C, 2, 0x20); sb(0x10, "warm2");
  mapBank(s, 0x87, BOOT_BANK);
  s(0xAD, 0, 0xA0, 0xC9, 0x4D); sb(0xD0, "bootFail");
  s(0xAD, 8, 0xA0, 0xC9, BOOT_BANK); sb(0xD0, "bootFail");
  s(0x4C, profile.loader.bank_offset & 255, 0xA0 + (profile.loader.bank_offset >> 8));
  sl("bootFail");
  s(0xA9, 2, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3,
    0xA9, BOOT_BANK, 0x8D, 2, 3);
  sa(0x20, "font");
  ppuAddress(s, 0x2146);
  s(0xA2, 0); sl("failText"); sa(0xBD, "failure");
  s(0x8D, 7, 0x20, 0xE8, 0xE0, 22); sb(0xD0, "failText");
  sa(0x4C, "waitKey");

  sl("font");
  mapBank(s, 0x87, profile.font.bank);
  mapBank(s, 0x82, 8);
  mapBank(s, 0x83, 9);
  s(0xAD, 2, 0x20, 0xA9, 0, 0x85, 0, 0x8D, 6, 0x20, 0x8D, 6, 0x20,
    0xA9, profile.font.cpu >> 8, 0x85, 1, 0xA0, 0);
  sl("fontCopy"); s(0xB1, 0, 0x8D, 7, 0x20, 0xC8); sb(0xD0, "fontCopy");
  s(0xE6, 1, 0xA5, 1, 0xC9, (profile.font.cpu + profile.font.length) >> 8); sb(0xD0, "fontCopy");
  ppuAddress(s, 0x07F0);
  s(0xA2, 16, 0xA9, 0); sl("blank"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "blank");
  ppuAddress(s, 0x2000);
  s(0xA0, 4, 0xA2, 0, 0xA9, 127); sl("clear"); s(0x8D, 7, 0x20, 0xE8); sb(0xD0, "clear");
  s(0x88); sb(0xD0, "clear");
  ppuAddress(s, 0x23C0);
  s(0xA2, 64, 0xA9, 0); sl("attributes"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "attributes");
  ppuAddress(s, 0x3F00);
  s(0xA9, 15, 0x8D, 7, 0x20, 0xA2, 3, 0xA9, 0x30);
  sl("palette"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "palette");
  s(0x60);

  sl("waitKey");
  s(0xA9, 0, 0x8D, 0, 0x20, 0x8D, 5, 0x20, 0x8D, 5, 0x20,
    0xA9, 0x0A, 0x8D, 1, 0x20);
  sa(0x20, "key"); sb(0xD0, "waitKey");
  sl("press"); sa(0x20, "key"); sb(0xF0, "press");
  s(0xA9, 0, 0x8D, 1, 0x20, 0x4C, 0x3B, 0xFF);
  sl("key");
  s(0xA9, 1, 0x8D, 0x16, 0x40, 0xA9, 0, 0x8D, 0x16, 0x40,
    0xA2, 8, 0x85, 2);
  sl("keyBit"); s(0xAD, 0x16, 0x40, 0x4A, 0x26, 2, 0xCA); sb(0xD0, "keyBit");
  s(0xA5, 2, 0x60);
  sl("failure"); s(...tiles(`FAIL BANKS 00 FIRST ${BOOT_BANK.toString(16).toUpperCase()}`));
  const stubBytes = stub.finish();
  if (stubBytes.length > STUB_CAPACITY) throw new Error(`复位短桩超过现场未读取范围：${stubBytes.length}`);

  const runtime = program(PROGRAM_CPU);
  const {emit: e, label: l, absolute: a, branch: b} = runtime;
  const callStub = name => e(0x20, stub.labels.get(name) & 255, stub.labels.get(name) >> 8);
  e(0xA9, 1, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3, 0xA9, 255, 0x8D, 2, 3,
    0xA9, profile.first_bank, 0x8D, 3, 3);
  l("bank");
  e(0xA9, 0x87, 0x8D, 0, 0x80, 0xAD, 3, 3, 0x8D, 1, 0x80, 0xA2, 7);
  l("check"); e(0xBD, 0, 0xA0); a(0xDD, "marker"); b(0xD0, "bad");
  e(0xCA); b(0x10, "check");
  e(0xAD, 8, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0x49, 255, 0xCD, 9, 0xA0); b(0xD0, "bad");
  e(0xAD, 10, 0xA0, 0xC9, 0x74); b(0xD0, "bad");
  e(0xAD, 11, 0xA0, 0xC9, 0xA5); b(0xD0, "bad");
  e(0xAD, 12, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0xAD, 13, 0xA0, 0x0D, 14, 0xA0, 0x0D, 15, 0xA0); b(0xD0, "bad");
  e(0xA2, profile.executor.length - 1);
  l("codeCheck"); e(0xBD, profile.executor.bank_offset, 0xA0); a(0xDD, "executor"); b(0xD0, "bad");
  e(0xCA); b(0x10, "codeCheck");
  e(0xA9, 0, 0x8D, 4, 3, 0x20, profile.executor.bank_offset, 0xA0,
    0xAD, 3, 3, 0x49, 0xA5, 0xCD, 4, 3); b(0xF0, "good");
  l("bad"); e(0xA9, 2, 0x8D, 0, 3, 0xAD, 2, 3, 0xC9, 255); b(0xD0, "next");
  e(0xAD, 3, 3, 0x8D, 2, 3); a(0x4C, "next");
  l("good"); e(0xEE, 1, 3);
  l("next"); e(0xEE, 3, 3, 0xAD, 3, 3, 0xC9, profile.end_bank_exclusive); b(0xF0, "display"); a(0x4C, "bank");
  l("display"); callStub("font");

  const row = (address, text, name) => {
    ppuAddress(e, address);
    e(0xA2, 0); l(name); a(0xBD, `${name}Text`); e(0x8D, 7, 0x20, 0xE8, 0xE0, text.length); b(0xD0, name);
  };
  row(0x2106, "EXPANDED ROM TEST", "title");
  ppuAddress(e, 0x2168);
  e(0xAD, 0, 3, 0xC9, 1); b(0xD0, "failed");
  for (const byte of tiles("PASS")) e(0xA9, byte, 0x8D, 7, 0x20);
  a(0x4C, "count");
  l("failed"); for (const byte of tiles("FAIL")) e(0xA9, byte, 0x8D, 7, 0x20);
  l("count"); row(0x21C6, "BANKS ", "banks");
  e(0xAD, 1, 3, 0xA2, 0);
  l("decimal"); e(0xC9, 10); b(0x90, "digits"); e(0x38, 0xE9, 10, 0xE8); a(0x4C, "decimal");
  l("digits"); e(0x48, 0x8E, 7, 0x20, 0x68, 0x8D, 7, 0x20);
  const totalText = `OF ${profile.end_bank_exclusive - profile.first_bank}`;
  row(0x21D1, totalText, "total");
  row(0x2206, "FIRST ", "first");
  e(0xAD, 2, 3, 0xC9, 255); b(0xD0, "firstBank");
  e(0xA9, 98, 0x8D, 7, 0x20, 0x8D, 7, 0x20); a(0x4C, "prompt");
  l("firstBank"); e(0x48, 0x4A, 0x4A, 0x4A, 0x4A, 0x8D, 7, 0x20, 0x68, 0x29, 15, 0x8D, 7, 0x20);
  l("prompt"); row(0x2266, "PRESS ANY BUTTON", "buttons");
  e(0x4C, stub.labels.get("waitKey") & 255, stub.labels.get("waitKey") >> 8);
  for (const [name, text] of [["title", "EXPANDED ROM TEST"], ["banks", "BANKS "],
    ["total", totalText], ["first", "FIRST "], ["buttons", "PRESS ANY BUTTON"]]) {
    l(`${name}Text`); e(...tiles(text));
  }
  l("marker"); e(...new TextEncoder().encode("MMEXP74"), 0);
  const executor = Uint8Array.from([0xAD, 8, 0xA0, 0x49, 0xA5, 0x8D, 4, 3, 0x60]);
  l("executor"); e(...executor);
  const runtimeBytes = runtime.finish();
  if (runtimeBytes.length > PROGRAM_CAPACITY) throw new Error("扩展区检测程序超过 RAM 载入容量");
  const loader = program(0xA000 + profile.loader.bank_offset);
  loader.emit(0xA2, 0);
  loader.label("copy");
  for (let page = 0; page < PROGRAM_CAPACITY / 256; page++) {
    loader.emit(0xBD, profile.program.bank_offset & 255, 0xA0 + (profile.program.bank_offset >> 8) + page,
      0x9D, PROGRAM_CPU & 255, (PROGRAM_CPU >> 8) + page);
  }
  loader.emit(0xE8);
  loader.branch(0xD0, "copy");
  loader.emit(0x4C, PROGRAM_CPU & 255, PROGRAM_CPU >> 8);
  const loaderBytes = loader.finish();
  if (loaderBytes.length !== profile.loader.length) throw new Error("扩展区载入程序长度与声明不符");
  return {stubBytes, runtimeBytes, loaderBytes, executor, bootBank: BOOT_BANK,
    firstBank: profile.first_bank, endBankExclusive: profile.end_bank_exclusive,
    bankBytes: profile.bank_bytes, executorOffset: profile.executor.bank_offset,
    stubPrgOffset: profile.stub.bank * profile.bank_bytes + STUB_CPU - 0xE000,
    resetPrgOffset: profile.reset.bank * profile.bank_bytes + profile.reset.bank_offset,
    programPrgOffset: BOOT_BANK * profile.bank_bytes + profile.program.bank_offset,
    loaderPrgOffset: BOOT_BANK * profile.bank_bytes + profile.loader.bank_offset,
    resetBytes: Uint8Array.from([STUB_CPU & 255, STUB_CPU >> 8]),
    resultCpu: RESULT, programCpu: PROGRAM_CPU, stubCapacity: STUB_CAPACITY,
    evidence: profile.stub.evidence, programCapacity: PROGRAM_CAPACITY};
}
