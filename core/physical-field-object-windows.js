// @editor-module PRG 与 CHR 物理字段对象窗口及关联视图。

import {createPrgPhysicalFieldObjects, projectPrgFieldObjects}
  from "./prg-physical-field-objects.js";
import {createChrPhysicalFieldObjects}
  from "./chr-physical-field-objects.js";
import {state} from "./state.js";
import {
  buildRomMapPrgAnnotations,
  byteMapBankDescriptor,
  byteMapSpaceDescriptor,
  loadAllByteMapRecordPages,
  loadByteMapBank,
  loadByteMapIndex,
  loadByteMapRecordPagesForOffsets,
  loadedByteMapRecordPages,
} from "./physical-field-object-document.js";

let loadedPrgManifest = null;
let loadedChrManifest = null;
let chrWindow = null;

function decodeBase64(value) {
  let raw;
  try {
    raw = globalThis.atob(String(value));
  } catch {
    throw new Error("统一字节地图 base64 数据无效");
  }
  const result = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) result[index] = raw.charCodeAt(index);
  return result;
}

// 正文按发布内容直接解码：字节地图的字节就是项目基线，前端不复核它的哈希。
function decodeEnvelope(envelope) {
  return decodeBase64(envelope.data);
}

function uniqueJson(records) {
  const seen = new Set();
  return records.filter(record => {
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assembleBytes(shards, offset, length) {
  const bytes = new Uint8Array(length);
  for (const shard of shards) {
    bytes.set(decodeEnvelope(shard.bytes), shard.address.offset - offset);
  }
  return bytes;
}

function normalizedInstruction(source, windowOffset, windowLength) {
  const physicalStart = Number(source?.prg_offset);
  const size = Number(source?.size || 1);
  if (!Number.isInteger(physicalStart) || !Number.isInteger(size) || size < 1
      || physicalStart + size <= windowOffset
      || physicalStart >= windowOffset + windowLength) return null;
  const instructionBytes = String(source.bytes_hex || "").split(/\s+/).filter(Boolean)
    .map(value => Number.parseInt(value, 16));
  if (instructionBytes.some(value => !Number.isInteger(value) || value < 0 || value > 0xff)) {
    throw new Error(`PRG 指令 ${physicalStart} bytes_hex 无效`);
  }
  return {
    start: physicalStart - windowOffset,
    physicalStart,
    size,
    bytes: instructionBytes,
    mnemonic: source.mnemonic || "???",
    operand: source.operand || "",
    addressingMode: source.addressing_mode || "",
    confidence: source.confidence || "",
    execCount: Number(source.exec_count || 0),
    functionName: source.function || "",
    functionEntry: Number.isFinite(Number(source.function_entry_prg))
      ? Number(source.function_entry_prg) : null,
    domain: source.domain || "unclassified",
    submodes: Array.isArray(source.submodes) ? source.submodes : [],
  };
}

async function loadRomMapDisassembly(shards, {offset, length}) {
  const classification = new Uint8Array(length);
  let classificationIds = null;
  const rawInstructions = [];
  const functions = [];
  const namedRanges = [];
  const xrefs = [];
  const symbols = [];
  const functionSummary = {};
  for (const shard of shards) {
    const source = shard.disassembly;
    const requiredArrays = ["instructions", "functions", "symbols", "named_ranges", "xrefs"];
    if (!source || requiredArrays.some(key => !Array.isArray(source[key]))
        || !source.classification_ids || typeof source.classification_ids !== "object") {
      throw new Error(`PRG bank ${shard.bank} 反汇编 JSON 无效`);
    }
    const decoded = decodeEnvelope(source.classification);
    if (decoded.length !== shard.address.length) {
      throw new Error(`PRG bank ${shard.bank} classification 长度错误`);
    }
    classification.set(decoded, shard.address.offset - offset);
    if (classificationIds
        && JSON.stringify(classificationIds) !== JSON.stringify(source.classification_ids)) {
      throw new Error("PRG bank classification_ids 不一致");
    }
    classificationIds ||= source.classification_ids;
    rawInstructions.push(...source.instructions);
    functions.push(...source.functions);
    symbols.push(...source.symbols);
    namedRanges.push(...source.named_ranges);
    xrefs.push(...source.xrefs);
    Object.assign(functionSummary, source.function_summary || {});
  }
  const instructions = uniqueJson(rawInstructions)
    .map(source => normalizedInstruction(source, offset, length))
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);
  const uniqueFunctions = uniqueJson(functions);
  return {
    classification,
    functionsByEntry: new Map(uniqueFunctions.map(entry => [Number(entry.entry_prg), entry])),
    instructions,
    functionSummary,
    symbols: uniqueJson(symbols),
    namedRanges: uniqueJson(namedRanges),
    classificationIds,
    xrefs: uniqueJson(xrefs),
  };
}

export async function loadRomMapPrg(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "prg");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? state.romMapSelectedOffset) || 0,
  ));
  if (loadedPrgManifest && loadedPrgManifest !== manifest) {
    state.romMapLoadedAll = false;
  }
  const all = request.all === true;
  const descriptors = all
    ? manifest.bank_shards.prg
    : [byteMapBankDescriptor(manifest, "prg", selected)];
  const windowOffset = all ? 0 : descriptors[0].address.offset;
  const windowLength = all ? space.length : descriptors[0].address.length;
  const loadKey = `${manifest.source_rom_sha256}:prg:${all ? "all" : descriptors[0].bank}`;
  const shards = await Promise.all(descriptors.map(descriptor =>
    loadByteMapBank(manifest, descriptor)));
  if (all || request.allPages === true) {
    await loadAllByteMapRecordPages(manifest, shards);
  } else {
    await loadByteMapRecordPagesForOffsets(manifest, shards[0], [
      selected, ...(Array.isArray(request.pageOffsets) ? request.pageOffsets : []),
    ]);
  }
  const recordPages = loadedByteMapRecordPages(manifest, shards);
  const pageKey = recordPages
    .map(page => `${page.space}:${page.bank}:${page.page}`).sort().join("|");
  const reuseWindow = loadedPrgManifest === manifest
    && state.romMapLoadKey === loadKey
    && state.romMapBytes && state.romMapDisassembly;
  const [bytes, disassembly] = reuseWindow
    ? [state.romMapBytes, state.romMapDisassembly]
    : await Promise.all([
      assembleBytes(shards, windowOffset, windowLength),
      loadRomMapDisassembly(shards, {offset: windowOffset, length: windowLength}),
    ]);
  state.romMapBytes = bytes;
  state.romMapDisassembly = disassembly;
  if (!reuseWindow || state.romMapPageLoadKey !== pageKey || !state.romMapFieldObjects) {
    const annotations = await buildRomMapPrgAnnotations(recordPages, {
      offset: windowOffset,
      length: windowLength,
      disassembly,
      lookupTables: manifest.lookup_tables,
    });
    const owners = createPrgPhysicalFieldObjects(recordPages,
      {offset: windowOffset, length: windowLength, bytes});
    state.romMapFieldObjects = projectPrgFieldObjects(annotations,
      {offset: windowOffset, bytes, owners: owners.byByte,
        namedRanges: disassembly.namedRanges,
        cpuWindows: shards.map(shard => ({offset: shard.address.offset,
          length: shard.address.length,
          cpuStart: shard.manual?.address?.cpu_start == null ? null
            : Number(shard.manual.address.cpu_start)}))});
    state.romMapAnnotations = state.romMapFieldObjects.byByte.map((object, local) =>
      object?.presentationAt(windowOffset + local) || null);
  }
  state.romMapPrgSections = descriptors;
  state.romMapWindowOffset = windowOffset;
  state.romMapTotalLength = space.length;
  state.romMapLoadedAll = all;
  state.romMapRecordPagesLoaded = recordPages.length;
  state.romMapRecordPagesTotal = shards.reduce(
    (total, shard) => total + shard.record_pages.length, 0,
  );
  state.romMapLoadedRecordPageAddresses = recordPages.map(page => ({...page.address}));
  state.romMapRecordPagesComplete =
    state.romMapRecordPagesLoaded === state.romMapRecordPagesTotal;
  state.romMapLoadKey = loadKey;
  state.romMapPageLoadKey = pageKey;
  state.romMapDisassemblyError = "";
  state.romMapSearchIndex = null;
  state.romMapFilteredOffsets = null;
  state.romMapFilterResult = null;
  state.romMapSelectedOffset = selected;
  loadedPrgManifest = manifest;
  return true;
}

function chrReferenceRecord(uid, range, association, binding = null) {
  return {
    uid,
    label: uid,
    domain: binding?.domain || "unknown",
    kind: binding?.role || "resource",
    producer: association.producer,
    status: association.status,
    start: Number(range.address.offset),
    end: Number(range.address.end_exclusive),
  };
}

function chrShardReferences(manifest, catalog) {
  const bank = Number(catalog.bank);
  const referenceByKey = new Map();
  for (const range of catalog.rangeViews) {
    for (const association of range.associations) {
      const boundIds = new Set();
      for (const binding of association.bindings) {
        const uid = String(binding.resource_id);
        boundIds.add(uid);
        const reference = chrReferenceRecord(uid, range, association, binding);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
      for (const value of association.resourceIds) {
        const uid = String(value);
        if (boundIds.has(uid)) continue;
        const reference = chrReferenceRecord(uid, range, association);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
    }
  }
  const references = [...referenceByKey.values()]
    .sort((left, right) => String(left.label)
      .localeCompare(String(right.label), "zh-CN") || left.start - right.start);
  const knownBanks = new Set();
  if (references.length) knownBanks.add(bank);
  const semanticRanges = catalog.rangeViews.map(range => {
    const resourceIds = [...new Set(range.associations.flatMap(association => [
      ...association.resourceIds,
      ...association.bindings.map(binding => binding.resource_id),
    ]))];
    const roles = [...new Set(range.associations.flatMap(association =>
      association.bindings.map(binding => binding.role)))];
    const statuses = [...new Set(range.associations.map(association => association.status))];
    const signal = [...resourceIds, ...roles].join(" ");
    return {
      id: `chr:${range.address.offset}:${range.address.end_exclusive}`,
      label: resourceIds.length
        ? `${resourceIds[0]}${resourceIds.length > 1 ? ` 等 ${resourceIds.length} 项` : ""}`
        : "CHR 图像资源范围",
      kind: roles.join(" / ") || "image-data",
      status: statuses.join(" / ") || "classified",
      start: Number(range.address.offset),
      end: Number(range.address.end_exclusive),
      isFont: /font|glyph|字库|字模/i.test(signal),
    };
  });
  return {
    byBank: new Map([[bank, references]]),
    referencedBanks: knownBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

function chrReferences(manifest, catalogs) {
  const byBank = new Map();
  const referencedBanks = new Set();
  const semanticRanges = [];
  for (const catalog of catalogs) {
    const projected = chrShardReferences(manifest, catalog);
    for (const [bank, references] of projected.byBank) byBank.set(bank, references);
    for (const bank of projected.referencedBanks) referencedBanks.add(bank);
    semanticRanges.push(...projected.semanticRanges);
  }
  semanticRanges.sort((left, right) => left.start - right.start);
  return {
    byBank,
    referencedBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

export async function loadRomMapChr(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "chr");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? Number(state.romMapChrTile || 0) * 16) || 0,
  ));
  const descriptors = manifest.bank_shards.chr;
  const loadKey = `${manifest.source_rom_sha256}:chr:all`;
  if (loadedChrManifest !== manifest || chrWindow?.repository !== state.projectRepository
      || chrWindow?.bytes !== state.romMapChrBytes) {
    chrWindow = {repository: state.projectRepository, bytes: new Uint8Array(space.length),
      catalogs: new Map(), inflight: new Map()};
    loadedChrManifest = manifest;
    state.romMapChrBytes = chrWindow.bytes;
  }
  const window = chrWindow;
  const requested = Array.isArray(request.banks)
    ? descriptors.filter(descriptor => request.banks.includes(Number(descriptor.bank))) : descriptors;
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(16, requested.length)}, async () => {
    while (cursor < requested.length) {
      const descriptor = requested[cursor++], bank = Number(descriptor.bank);
      if (window.catalogs.has(bank)) continue;
      if (!window.inflight.has(bank)) {
        const pending = loadByteMapBank(manifest, descriptor).then(shard => {
          const bytes = assembleBytes([shard], descriptor.address.offset, descriptor.address.length);
          const catalog = createChrPhysicalFieldObjects(shard, bytes);
          if (catalog.uncovered) throw new Error(`CHR Bank ${catalog.bank} 缺少字段对象`);
          window.bytes.set(bytes, descriptor.address.offset);
          window.catalogs.set(bank, catalog);
        }).finally(() => window.inflight.delete(bank));
        window.inflight.set(bank, pending);
      }
      await window.inflight.get(bank);
    }
  }));
  if (window !== chrWindow || window.bytes !== state.romMapChrBytes
      || window.repository !== state.projectRepository) return false;
  const catalogs = [...window.catalogs.values()].sort((left, right) => left.bank - right.bank);
  state.romMapChrFieldObjects = {byBank: window.catalogs, total: Number(space.bank_size)};
  state.romMapChrReferences = chrReferences(manifest, catalogs);
  state.romMapChrReferences.summary.total_ranges = descriptors.reduce((total, descriptor) => total + descriptor.resources, 0);
  state.romMapChrBankDirectory = Object.freeze(descriptors.map(descriptor => Object.freeze({
    bank: Number(descriptor.bank), resources: descriptor.resources,
    offset: Number(descriptor.address.offset), length: Number(descriptor.address.length),
    ...(window.catalogs.has(Number(descriptor.bank)) ? {uncovered: window.catalogs.get(Number(descriptor.bank)).uncovered} : {}),
  })));
  state.romMapChrSections = descriptors;
  state.romMapChrWindowOffset = 0;
  state.romMapChrTotalLength = space.length;
  if (!request.background) {
    state.romMapChrTile = Math.floor(selected / 16);
    state.romMapChrBank = Math.floor(selected / Number(space.bank_size));
  }
  state.romMapChrLoadKey = loadKey;
  loadedChrManifest = manifest;
  return true;
}
