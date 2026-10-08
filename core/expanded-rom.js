// @editor-module 准备 mapper 74 扩展布局与可选诊断片段，由 RomLinker 写入。
import {RomLinker, sha256Hex} from "./rom-linker.js";
import {prepareExpandedRomTest} from "./expanded-rom-test.js";

const EXPANDED_PRG_BYTES = 1024 * 1024;
const ORIGINAL_PRG_BYTES = 512 * 1024;
const BANK_BYTES = 8192;
const READER = Uint8Array.from([0xA2, 0, 0xBD, 0, 0xA0, 0x9D, 0, 5, 0xE8, 0xE0, 16, 0xD0, 0xF5, 0x60]);

function inspectExpansionSource(source) {
  if (!(source instanceof Uint8Array) || source.length < 16 ||
      source[0] !== 0x4E || source[1] !== 0x45 || source[2] !== 0x53 || source[3] !== 0x1A) {
    throw new Error("扩容需要 NES ROM");
  }
  const format = source[7] & 12;
  const mapper = (source[6] >> 4) | (source[7] & 0xF0) |
    (format === 8 ? (source[8] & 15) << 8 : 0);
  const prgUnits = source[4] | (format === 8 ? (source[9] & 15) << 8 : 0);
  const chrUnits = source[5] | (format === 8 ? (source[9] >> 4) << 8 : 0);
  if (![0, 8].includes(format) || source[6] & 4 || mapper !== 74 ||
      prgUnits !== 32 || chrUnits !== 32 || source.length !== 16 + 768 * 1024) {
    throw new Error("扩容仅支持无 trainer 的 mapper 74、512 KiB PRG、256 KiB CHR ROM");
  }
}

export async function createExpandedRom(source, {nes2 = false, diagnostic = false} = {}) {
  const alreadyExpanded = source instanceof Uint8Array && source[4] === 64 &&
    source.length === 16 + EXPANDED_PRG_BYTES + 256 * 1024;
  // 已扩展输入保留新增区的当前字节；诊断只应用明确列出的补丁。
  const original = alreadyExpanded ? RomLinker.originalRom(source, ORIGINAL_PRG_BYTES) : source;
  inspectExpansionSource(original);
  const header = source.slice(0, 16);
  header[4] = EXPANDED_PRG_BYTES / 16384;
  if (nes2) {
    header[7] = 0x48;
    header.set([0, 0, 0x70, 5, 0, 0, 0, 0], 8);
  }
  const fragments = [];
  const markers = [];
  const test = diagnostic ? prepareExpandedRomTest() : null;
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    const marker = new Uint8Array(16);
    marker.set(new TextEncoder().encode("MMEXP74"));
    marker.set([bank, bank ^ 255, 0x74, 0xA5, bank, 0, 0, 0], 8);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes: marker});
    fragments.push({offset: 16 + bank * BANK_BYTES + 0x20, bytes: READER});
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(marker, byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0xA020, kind: "written-marker"});
  }
  const fixedBankMirrors = {};
  for (let index = 0; index < 2; index++) {
    const bank = 0x7E + index;
    const sourceBank = ORIGINAL_PRG_BYTES / BANK_BYTES - 2 + index;
    const bytes = source.slice(16 + sourceBank * BANK_BYTES, 16 + (sourceBank + 1) * BANK_BYTES);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes});
    fixedBankMirrors[sourceBank.toString(16).toUpperCase()] = bank.toString(16).toUpperCase();
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0x0440, kind: "fixed-bank-mirror-signature"});
  }
  const bootPatches = test ? [
    {offset: 16 + test.stubPrgOffset, bytes: test.stubBytes},
    {offset: 16 + test.resetPrgOffset, bytes: test.resetBytes},
    {offset: 16 + test.programPrgOffset, bytes: test.runtimeBytes},
    {offset: 16 + test.loaderPrgOffset, bytes: test.loaderBytes},
  ] : [];
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    bootPatches.push({offset: 16 + bank * test.bankBytes + test.executorOffset, bytes: test.executor});
  }
  fragments.push(...bootPatches);
  const rom = alreadyExpanded ? RomLinker.applyFragments(source, {header, fragments}) :
    RomLinker.expandRom(source, {header, originalPrgBytes: ORIGINAL_PRG_BYTES,
    expandedPrgBytes: EXPANDED_PRG_BYTES, fragments});
  return {rom, markers, report: {output_sha256: await sha256Hex(rom),
    bytes: rom.length, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
    added_prg_bytes: EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES,
    usable_added_prg_bytes: 62 * BANK_BYTES,
    original_prg_chr_preserved: true, fixed_bank_mirrors: fixedBankMirrors,
    layout: {mapper: 74, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
      diagnostic},
    boot_test: test ? {banks: test.endBankExclusive - test.firstBank,
      first_bank: test.firstBank, last_bank: test.endBankExclusive - 1,
      result_cpu: test.resultCpu, program_cpu: test.programCpu, boot_bank: test.bootBank,
      patches: bootPatches.map(({offset, bytes}) => ({space: "prg", offset: offset - 16,
        file_offset: offset, bytes: bytes.length})),
      stub_original_prg_offset: test.stubPrgOffset - (EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES),
      stub_evidence: test.evidence} : null}};
}

export async function storeExpandedRomBuild(repository, output, sourceBuild) {
  const buildId = await sha256Hex(new TextEncoder().encode(
    `${sourceBuild.build_id}:${output.report.output_sha256}:${crypto.randomUUID()}`,
  ));
  const createdAt = new Date().toISOString();
  const sourceSave = await repository.getBlob(`save-build:${sourceBuild.build_id}`);
  if (!sourceSave) throw new Error(`构建 ${sourceBuild.build_id} 没有同号存档`);
  await repository.putBlob(`rom-build:${buildId}`, new Blob([output.rom], {
    type: "application/x-nes-rom",
  }), {
    kind: "rom-build", build_id: buildId, created_at: createdAt,
    name: "metalmaxcn-diagnostic.nes", output_sha256: output.report.output_sha256,
  });
  await repository.putBlob(`save-build:${buildId}`, sourceSave.data, {
    kind: "save-build", build_id: buildId, created_at: createdAt,
    save_sha256: sourceSave.save_sha256,
    source: sourceSave.source,
  });
  await repository.putBuildReport(buildId, {
    ...output.report, build_id: buildId, created_at: createdAt,
    source_build_id: sourceBuild.build_id, save_sha256: sourceSave.save_sha256,
  }, {createdAt});
  return buildId;
}
