// @editor-module 物理字段对象的字节地图来源与 PRG 展示语义。
//
// 根清单登记地址空间、lookup 与 bank shard。bank 自足携带 PRG/CHR base64
// 字节及 PRG 反汇编。PRG/SRAM 的语义记录按 bank 内 256 B 分页；CHR 是图像
// bank，合并后的物理范围/资源关联直接随 bank shard 到达，不存在
// record page 或逐字段 annotation。
// 整个路径不读取 ROM baseline Blob、layout `.bin` 或旧版
// annotations/records/disassembly 端点。

import {db} from "./project-db.js";
import {BYTE_MAP_INDEX_PATH, loadPhysicalFieldSourceIndex}
  from "./physical-field-object-sources.js";
import {ADDRESS_SPACE_IDS, isAddressSpace} from "./physical-address.js";
import {state} from "./state.js";
import {freezeValidatedJson} from "./project-store-values.js";

const RECORD_PAGE_BYTES = 0x100;

function adaptByteMapResourceOwner(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const resourceId = String(value.resource_id || "").trim();
  const role = String(value.role || "").trim();
  if (!resourceId || !role) return null;
  const elementIndex = Number(value.element_index);
  const elementCount = Number(value.element_count);
  return {
    resourceId,
    role,
    ...(Number.isInteger(elementIndex) ? {elementIndex} : {}),
    ...(Number.isInteger(elementCount) ? {elementCount} : {}),
  };
}

// 逐指令代码投影的合并优先级：高于分类区间（5）、低于一切语义标注。
// 与构建期 PRODUCER_ORDER 共用同一坐标系，两侧必须一起改。
const CODE_APPLY_ORDER = 7;

export async function loadByteMapIndex() {
  return loadPhysicalFieldSourceIndex(db);
}

export function byteMapSpaceDescriptor(manifest, space) {
  if (!isAddressSpace(space)) {
    throw new Error(`未知字节地图地址空间：${space}`);
  }
  const descriptor = manifest.address_spaces.find(item => item.id === space);
  if (!descriptor) throw new Error(`统一字节地图缺少地址空间：${space}`);
  return descriptor;
}

export function byteMapBankDescriptor(manifest, space, offsetOrBank, {isBank = false} = {}) {
  const spaceDescriptor = byteMapSpaceDescriptor(manifest, space);
  const value = Number(offsetOrBank);
  const bank = isBank ? value : Math.floor(value / spaceDescriptor.bank_size);
  const descriptor = manifest.bank_shards[space]?.[bank];
  if (!Number.isInteger(bank) || !descriptor) {
    throw new Error(`${space} 地址不在统一字节地图内：${offsetOrBank}`);
  }
  return descriptor;
}

export async function loadByteMapBank(manifest, descriptor) {
  const shard = await db.getPackageDocument(descriptor.path, null, {readonly: true});
  return shard;
}

const recordPageCache = new WeakMap();

function cachedRecordPages(manifest) {
  let pages = recordPageCache.get(manifest);
  if (!pages) {
    pages = new Map();
    recordPageCache.set(manifest, pages);
  }
  return pages;
}

function byteMapRecordPageDescriptor(bankShard, offsetOrPage, {isPage = false} = {}) {
  if (bankShard.space === "chr") {
    throw new Error("CHR bank 不发布 record page");
  }
  const value = Number(offsetOrPage);
  const page = isPage
    ? value : Math.floor((value - bankShard.address.offset) / RECORD_PAGE_BYTES);
  if (!Number.isInteger(page) || page < 0
      || page >= Math.ceil(bankShard.address.length / RECORD_PAGE_BYTES)) {
    throw new Error(`${bankShard.space} 地址不在 bank ${bankShard.bank} 内：${offsetOrPage}`);
  }
  return bankShard.record_pages.find(item => item.page === page) || null;
}

async function loadByteMapRecordPage(manifest, bankShard, descriptor) {
  if (!descriptor) return null;
  const cache = cachedRecordPages(manifest);
  if (cache.has(descriptor.path)) return cache.get(descriptor.path);
  const page = await db.getPackageDocument(descriptor.path, null, {readonly: true});
  cache.set(descriptor.path, page);
  return page;
}

export function loadedByteMapRecordPages(manifest, bankShards) {
  const identities = new Set((Array.isArray(bankShards) ? bankShards : [bankShards])
    .map(shard => `${shard.space}:${shard.bank}`));
  return [...cachedRecordPages(manifest).values()]
    .filter(page => identities.has(`${page.space}:${page.bank}`))
    .sort((left, right) => ADDRESS_SPACE_IDS.indexOf(left.space)
      - ADDRESS_SPACE_IDS.indexOf(right.space)
      || left.bank - right.bank || left.page - right.page);
}

export async function loadByteMapRecordPagesForOffsets(manifest, bankShard, offsets) {
  const descriptors = new Map(offsets.map(offset => {
    const descriptor = byteMapRecordPageDescriptor(bankShard, Number(offset));
    return [descriptor?.path, descriptor];
  }));
  await Promise.all([...descriptors.values()].map(descriptor =>
    loadByteMapRecordPage(manifest, bankShard, descriptor)));
  return loadedByteMapRecordPages(manifest, bankShard);
}

export async function loadAllByteMapRecordPages(manifest, bankShards) {
  const shards = Array.isArray(bankShards) ? bankShards : [bankShards];
  if (shards.some(shard => shard.space === "chr")) {
    throw new Error("CHR bank 不发布 record page");
  }
  const jobs = shards.flatMap(shard => shard.record_pages.map(descriptor =>
    ({shard, descriptor})));
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(12, jobs.length)}, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      await loadByteMapRecordPage(manifest, job.shard, job.descriptor);
    }
  }));
  return loadedByteMapRecordPages(manifest, shards);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function uniqueRecords(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = canonical(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadByteMapSpace(
  space,
  {offset = 0, all = false, allPages = false, pageOffsets = null} = {},
) {
  const manifest = await loadByteMapIndex();
  byteMapSpaceDescriptor(manifest, space);
  const descriptors = all
    ? manifest.bank_shards[space]
    : [byteMapBankDescriptor(manifest, space, offset)];
  const shards = await Promise.all(descriptors
    .map(descriptor => loadByteMapBank(manifest, descriptor)));
  if (space !== "chr" && (all || allPages)) {
    await loadAllByteMapRecordPages(manifest, shards);
  } else if (space !== "chr") {
    const offsets = Array.isArray(pageOffsets) && pageOffsets.length
      ? pageOffsets : [offset];
    await loadByteMapRecordPagesForOffsets(manifest, shards[0], offsets);
  }
  const pages = loadedByteMapRecordPages(manifest, shards);
  const records = space === "chr"
    ? []
    : pages.map(page => page.records);
  const document_ = {
    ...manifest,
    annotations: uniqueRecords(records.flatMap(value => value.annotations)),
    enrichments: uniqueRecords(records.flatMap(value => value.enrichments)),
    debug_labels: uniqueRecords(records.flatMap(value => value.debug_labels)),
    ...(space === "chr" ? {
      resources: uniqueRecords(shards.flatMap(shard => shard.resources)),
    } : {}),
    loaded_bank_shards: shards,
    loaded_record_pages: pages,
  };
  return space === "sram" ? freezeValidatedJson(document_) : document_;
}

// ---------------------------------------------------------------------------
// value_format：构建期无法序列化 valueFormatter 闭包，改用声明式规格。
// 每种 spec 对应原来的一类闭包；无法解释时返回 null，让调用方回退到原始字节
// 显示，而不是编造一个看似合理的解释。
// ---------------------------------------------------------------------------

const hex2 = value => `$${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
const hex4 = value => `$${Number(value).toString(16).toUpperCase().padStart(4, "0")}`;

// 与 loaders.js 的 romMapHex 同义。此处本地定义而非 import：loaders.js 依赖
// 本模块的 buildRomMapPrgAnnotations，反向 import 会构成循环。
const romMapHex = (value, width = 6) =>
  `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

function readPointer(offset) {
  const bytes = state.romMapBytes;
  if (!bytes) return 0;
  return Number(bytes[offset] || 0) | (Number(bytes[offset + 1] || 0) << 8);
}

function fill(template, context) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    context[key] == null ? match : String(context[key]));
}

// 查表解析：跨表名称在构建期不便内联，运行期按已加载的领域数据解析。
function resolveLookup(lookupTables, kind, value) {
  const table = lookupTables?.tables?.[kind];
  if (!table) return null;
  const key = table.key_mode === "low-nibble" ? Number(value) & 0x0f : Number(value);
  return table.values?.[String(key)] ?? null;
}

function formatterFor(spec, annotationStart, lookupTables) {
  if (!spec) return null;
  return value => {
    const numeric = Number(value);
    const context = {
      value: numeric,
      value_hex: hex2(numeric),
      value_pad3: String(numeric).padStart(3, "0"),
      low2: numeric & 0x03,
      low6: numeric & 0x3F,
      low7: numeric & 0x7F,
      low_nibble: numeric & 0x0F,
      low_nibble_hex: hex2(numeric & 0x0F),
      low_nibble_hex1: `$${(numeric & 0x0F).toString(16).toUpperCase()}`,
      low_nibble_popcount: ((numeric & 0x0F).toString(2).match(/1/g) || []).length,
      high_nibble_hex: hex2(numeric >> 4),
      high2_hex: hex2(numeric & 0xC0),
      high2_shr2_hex: hex2((numeric & 0xC0) >> 2),
      high_bits_hex: hex2(numeric & 0xC0),
      value_shr2_hex: hex2(numeric >> 2),
      value_times_100: numeric * 100,
      value_minus_7: numeric - 7,
      value_minus_8: numeric - 8,
      value_minus_128_hex: hex2(numeric - 0x80),
      bit6_loop: numeric & 0x40 ? "循环" : "不循环",
      bit7_irq: numeric & 0x80 ? "IRQ" : "无 IRQ",
      bit7_effect_or_music: numeric & 0x80 ? "音效" : "音乐",
      bit7_special_suffix: numeric & 0x80 ? "；bit7 特殊处理" : "；普通处理",
      dmc_start_hex4: hex4(0xC000 + numeric * 64),
      dmc_length: numeric * 16 + 1,
      two_bit_groups: [6, 4, 2, 0].map(shift => (numeric >> shift) & 3).join(" / "),
      direction: ["上", "下", "左", "右"][numeric & 3],
    };
    if (spec.mask != null) {
      const masked = numeric & Number(spec.mask);
      context.masked = masked;
      context.masked_hex = hex2(masked);
      if (spec.above_mask_suffix && numeric > Number(spec.mask)) {
        context.suffix = fill(spec.above_mask_suffix, context);
      }
    }
    if (spec.pointer === "u16le") {
      const pointer = readPointer(annotationStart + Number(spec.at_offset || 0));
      const sentinel = spec.sentinel?.[`0x${pointer.toString(16).toUpperCase()}`];
      if (sentinel) return sentinel;
      context.pointer = pointer;
      context.pointer_hex4 = hex4(pointer);
    }
    if (spec.divide) {
      context.scaled = (numeric / Number(spec.divide)).toFixed(Number(spec.decimals ?? 0));
    }
    if (spec.multiply != null) context.scaled = numeric * Number(spec.multiply);
    if (spec.boolean) return numeric ? "是" : "否";
    if (spec.branch_equals != null) {
      return numeric === Number(spec.branch_equals)
        ? spec.equal
        : fill(spec.other, context);
    }
    if (spec.role_bits) {
      const roles = Object.entries(spec.role_bits)
        .filter(([bit]) => numeric & Number(bit))
        .map(([, label]) => label);
      const unresolved = numeric & Number(spec.unresolved_mask || 0);
      return `${roles.join("、") || "无人"}；战斗效果码 `
        + `${numeric & Number(spec.effect_mask || 0)}`
        + (unresolved ? `；未解释位 ${hex2(unresolved)}` : "");
    }
    if (spec.selector_mode) {
      const selector = numeric >> 2;
      context.mode = selector === 0 ? "无交互 / 交互脚本"
        : selector < 0x10 ? "直接文本记录" : "服务 / 功能处理器";
    }
    if (spec.zero_label != null && numeric === 0) return spec.zero_label;
    if (spec.range_max != null) {
      context.validity = numeric <= Number(spec.range_max)
        ? "合法" : `超出 $00-${hex2(spec.range_max)}`;
    }
    if (spec.record_count != null) {
      const count = Number(spec.record_count);
      context.validity = numeric < count ? "合法" : `超出 0-${Math.max(0, count - 1)}`;
    }
    if (spec.lookup) {
      const resolved = resolveLookup(lookupTables, spec.lookup, numeric);
      context.name = resolved ?? `未知 ${hex2(numeric)}`;
      context.decoded = resolved ?? `未知码 ${hex2(numeric)}`;
      context.clip_label = resolved ? ` · ${resolved}` : "";
      context.clip_names = resolved ? `（${resolved}）` : "";
      context.facility_label = resolved ?? "未知调查命令";
      context.id_label = spec.lookup === "item-name" ? "道具 ID" : "类型";
    }
    if (spec.branch != null) {
      const template = numeric >= Number(spec.branch) ? spec.at_or_above : spec.below;
      if (template) return fill(template, context);
    }
    if (!spec.template) return null;
    const text = fill(spec.template, context);
    return context.suffix ? `${text}${context.suffix}` : text;
  };
}

// ---------------------------------------------------------------------------
// 适配：构建期 snake_case 记录 → 前端既有的 camelCase 标注形状。
// 字段名与拆分前完全一致，渲染层无需改动。
// ---------------------------------------------------------------------------

function adapt(
  record,
  windowOffset = 0,
  windowLength = Number.POSITIVE_INFINITY,
  lookupTables = null,
) {
  const address = record.address || {};
  const classification = record.classification || {};
  const globalStart = Number(address.offset);
  const globalEnd = Number(address.end_exclusive);
  const clippedStart = Math.max(globalStart, windowOffset);
  const clippedEnd = Math.min(globalEnd, windowOffset + windowLength);
  return {
    status: record.status,
    category: record.category,
    moduleId: record.module_id || null,
    block: {
      id: record.block_id || null,
      label: record.block_label || null,
      roundtrip: Boolean(record.writeback_path),
      web_editable: Boolean(record.web_editable),
    },
    field: {
      encoding: record.field.encoding,
      meaning: record.field.meaning,
      detail: record.field.detail || "",
    },
    rangeStart: clippedStart - windowOffset,
    rangeLength: clippedEnd - clippedStart,
    physicalRangeStart: globalStart,
    physicalRangeLength: Number(address.length),
    record: record.record,
    entity_name: record.record,
    aliases: record.aliases || [],
    valueAliases: record.value_aliases || [],
    addressMeaning: record.address_meaning
      || `${record.record} · ${record.field.meaning}`,
    algorithmDetail: record.algorithm_detail || "",
    plainDescription: record.plain_description,
    decodedLabel: record.decoded_label,
    valueDescription: record.decoded_label,
    valueFormatter: formatterFor(
      record.value_format, globalStart - windowOffset, lookupTables,
    ),
    writebackPath: record.writeback_path || null,
    searchKey: record.search_key,
    mergeGroupId: record.merge_group_id,
    classificationKind: classification.kind,
    classificationName: classification.name,
    classificationLabel: classification.label,
    classificationDomainLabel: classification.domain_label,
    classificationSubmodeLabels: classification.submode_label
      ? [classification.submode_label] : undefined,
    resourceOwner: adaptByteMapResourceOwner(record.resource_owner),
    resourceIds: record.resource_ids || [],
    moduleIds: record.module_id ? [record.module_id] : [],
  };
}

export function romMapCodeDomainLabel(domain) {
  return ({
    battle: "战斗流程",
    "non-battle": "非战斗流程",
    "non-battle-ui": "非战斗界面 / 设施流程",
    audio: "音频流程",
    "shared-core": "共享基础代码",
    unclassified: "未分类流程",
  })[domain] || domain || "未分类流程";
}

export function romMapCodeSubmodeLabel(submode) {
  return ({
    "turn-based-battle": "回合制战斗",
    walking: "地图行走",
    shop: "商店",
    "facility-machine": "设施机器",
    "scripted-lock": "剧情锁定",
    "self-preparation": "自身准备",
  })[submode] || submode;
}

function romMapCodeFunctionView(meta, instruction) {
  const metaEntry = meta?.entry_prg == null ? null : Number(meta.entry_prg);
  const instructionEntry = instruction?.functionEntry == null ? null : Number(instruction.functionEntry);
  const entry = Number.isFinite(metaEntry) ? metaEntry : (Number.isFinite(instructionEntry) ? instructionEntry : null);
  const instructionAddress = Number(instruction?.physicalStart ?? instruction?.start ?? 0);
  const bank = Number.isFinite(entry) ? Math.floor(entry / 0x2000) : Math.floor(instructionAddress / 0x2000);
  const bankOffset = Number.isFinite(entry) ? (entry & 0x1FFF) : (instructionAddress & 0x1FFF);
  const far = meta?.entry_far || `${romMapHex(bank, 2).slice(1)}:${romMapHex(bankOffset, 4).slice(1)}`;
  const declared = meta?.name_source === "declared";
  const rawName = meta?.name || instruction?.functionName || "";
  const title = declared
    ? (String(meta?.comment || "").trim() || rawName || `函数 ${far}`)
    : `未命名函数 ${far}`;
  const domain = meta?.domain || instruction?.domain || "unclassified";
  const submodes = meta?.submodes || instruction?.submodes || [];
  const domainLabel = romMapCodeDomainLabel(domain);
  const submodeLabels = submodes.map(romMapCodeSubmodeLabel);
  const algorithm = String(meta?.long_comment || meta?.comment || "").trim()
    || `反汇编已确认这是 ${domainLabel}的 6502 功能代码，入口 ${far}；尚未恢复更具体的语义名称。`;
  return {
    entry,
    far,
    rawName,
    title,
    domain,
    domainLabel,
    submodeLabels,
    declared,
    algorithm,
  };
}

function romMapCodeAnnotation(instruction, meta) {
  const view = romMapCodeFunctionView(meta, instruction);
  const assembly = `${instruction.mnemonic}${instruction.operand ? ` ${instruction.operand}` : ""}`;
  const evidence = [
    instruction.confidence ? `证据 ${instruction.confidence}` : "",
    instruction.execCount ? `执行 ${instruction.execCount.toLocaleString()} 次` : "",
  ].filter(Boolean).join(" · ");
  return {
    status: "code",
    category: "code",
    block: {
      id: "confirmed-function-code",
      label: "已确认功能代码",
      roundtrip: true,
      web_editable: false,
    },
    field: {
      encoding: `6502 ${instruction.addressingMode || "instruction"}`,
      meaning: "6502 指令",
      detail: `${assembly}${evidence ? ` · ${evidence}` : ""}`,
    },
    rangeStart: instruction.start,
    rangeLength: instruction.size,
    record: view.title,
    aliases: [
      "功能代码", "6502", view.rawName, view.far, view.domain, view.domainLabel,
      ...view.submodeLabels,
    ].filter(Boolean),
    valueAliases: [instruction.mnemonic, instruction.operand, instruction.addressingMode, assembly].filter(Boolean),
    addressMeaning: `${view.title} · 功能代码`,
    algorithmDetail: view.algorithm,
    searchKey: `code-instruction:${instruction.start}`,
    codeGroupId: `function:${view.entry ?? view.far}`,
    codeFunction: view,
    codeInstruction: {...instruction, assembly},
  };
}

export function romMapClassificationView(kind) {
  return ({
    data: {
      category: "config", label: "结构化配置 / 索引（字段待细化）", shortLabel: "结构已定位：配置 / 索引",
      description: "已确认为结构化数据、查找表、索引或配置区，但本行尚未细化到单字节字段。",
    },
    "script-data": {
      category: "script", label: "脚本 / 命令流（opcode 待细化）", shortLabel: "结构已定位：脚本 / 命令流",
      description: "已确认为解释器消费的脚本或命令流，具体 opcode 字段将在对应脚本编辑器中继续细分。",
    },
    "text-data": {
      category: "textdata", label: "文本 / 名称编码区", shortLabel: "结构已定位：文本 / 名称",
      description: "已确认为文本、名称或字符编码记录。",
    },
    "font-data": {
      category: "fontdata", label: "字库图形数据", shortLabel: "结构已定位：字库图形",
      description: "已确认为字形位图或字库页，属于 PRG 中的图形数据而非 6502 代码。",
    },
    "asset-data": {
      category: "contentdata", label: "图形 / 内容资源区", shortLabel: "结构已定位：图形 / 内容资源",
      description: "已由资产管线确认边界的内容记录；可能是对话、界面图块布局、名称或其他非代码资源。",
    },
    "mixed-code-data": {
      category: "mixed", label: "混合代码 / 内联数据功能区", shortLabel: "功能已定位：混合代码 / 内联数据",
      description: "已由调用图、运行记录或连续处理器边界确认主功能；区内同时包含 6502 指令、跳转表和内联常量，尚未强行逐字节拆成纯代码或纯数据。",
    },
    "mirror-data": {
      category: "mirror", label: "历史镜像 / 扩容填充区", shortLabel: "结构已定位：镜像 / 填充",
      description: "已由逐字节重复、固定 bank 语义或版本差分确认为历史副本、镜像页或扩容填充；它不是当前逻辑的权威编辑源。",
    },
    "provisional-data": {
      category: "provisional", label: "候选数据范围（未确认）", shortLabel: "候选范围（未确认）",
      description: "仅有低置信度的范围证据；用作后续分析抓手，不计入已确认覆盖。",
      provisional: true,
    },
  })[kind] || null;
}

// ---------------------------------------------------------------------------
// 逐指令代码投影：从当前 PRG bank shard 的自足 disassembly JSON 展开。
// ---------------------------------------------------------------------------

function codeFillOperations(disassembly, total) {
  const operations = [];
  if (!disassembly?.classification) return operations;
  const codeId = Number(disassembly.classificationIds?.code ?? 1);
  const fragmentId = Number(disassembly.classificationIds?.["code-fragment"] ?? 4);
  const isCode = offset => disassembly.classification[offset] === codeId
    || disassembly.classification[offset] === fragmentId;
  for (const instruction of disassembly.instructions || []) {
    const meta = instruction.functionEntry == null
      ? null : disassembly.functionsByEntry?.get(instruction.functionEntry);
    const base = romMapCodeAnnotation(instruction, meta);
    const eligible = [];
    for (let index = 0; index < instruction.size; index += 1) {
      const offset = instruction.start + index;
      if (offset >= 0 && offset < total && isCode(offset)) eligible.push(offset);
    }
    if (!eligible.length) continue;
    if (eligible.length === instruction.size) {
      operations.push({order: CODE_APPLY_ORDER, offsets: eligible, annotation: base});
      continue;
    }
    for (const offset of eligible) {
      operations.push({
        order: CODE_APPLY_ORDER,
        offsets: [offset],
        annotation: {
          ...base,
          rangeStart: offset,
          rangeLength: 1,
          searchKey: `${base.searchKey}:byte:${offset - instruction.start}`,
        },
      });
    }
  }
  return operations;
}

// ---------------------------------------------------------------------------
// 装配：按 apply_order 填充，后者覆盖前者；最后套用 enrichments。
// ---------------------------------------------------------------------------

export async function buildRomMapPrgAnnotations(
  recordPages,
  {
    offset = 0,
    length,
    disassembly = state.romMapDisassembly,
    lookupTables = null,
  } = {},
) {
  if (!Array.isArray(recordPages)
      || !Number.isInteger(offset) || offset < 0
      || !Number.isInteger(length) || length < 1) {
    throw new TypeError("PRG 字节地图需要 record pages 数组与有效窗口");
  }
  const annotations = Array(length).fill(null);
  const records = uniqueRecords(recordPages.flatMap(page => page.records.annotations));
  const enrichments = uniqueRecords(recordPages.flatMap(page => page.records.enrichments));
  const loadedWindows = recordPages.map(page => page.address);
  const recordByteLoaded = globalOffset => loadedWindows.some(address =>
    globalOffset >= address.offset && globalOffset < address.end_exclusive);

  const operations = records
    .filter(record => record?.address?.space === "prg")
    .filter(record => record.address.end_exclusive > offset
      && record.address.offset < offset + length)
    .map(record => ({
    order: record.apply_order,
    record,
  }));
  operations.push(...codeFillOperations(disassembly, length));
  // Array.prototype.sort 在现代引擎中是稳定的：同 order 保留文档顺序，
  // 与构建期 records.sort 的次序一致。
  operations.sort((left, right) => left.order - right.order);

  for (const operation of operations) {
    if (operation.annotation) {
      for (const offset of operation.offsets) annotations[offset] = operation.annotation;
      continue;
    }
    const record = operation.record;
    const adapted = adapt(record, offset, length, lookupTables);
    const start = Math.max(Number(record.address.offset), offset) - offset;
    const end = Math.min(Number(record.address.end_exclusive), offset + length) - offset;
    for (let localOffset = start; localOffset < end; localOffset += 1) {
      if (recordByteLoaded(offset + localOffset)) annotations[localOffset] = adapted;
    }
  }

  // 增强器只追加别名与引用，遇空槽跳过——与构建期语义一致。
  for (const enrichment of enrichments) {
    const address = enrichment.address;
    if (!address || typeof address !== "object" || Array.isArray(address)
        || Object.keys(address).length !== 4
        || !["space", "offset", "length", "end_exclusive"]
          .every(key => Object.prototype.hasOwnProperty.call(address, key))
        || address.space !== "prg"
        || !Number.isInteger(address.offset) || !Number.isInteger(address.length)
        || !Number.isInteger(address.end_exclusive) || address.length < 1
        || address.end_exclusive !== address.offset + address.length
        || address.offset < 0) {
      throw new Error("统一字节地图 enrichment 地址无效");
    }
    const start = Math.max(address.offset, offset) - offset;
    const end = Math.min(address.end_exclusive, offset + length) - offset;
    for (let localOffset = start; localOffset < end; localOffset += 1) {
      if (!recordByteLoaded(offset + localOffset)) continue;
      const current = annotations[localOffset];
      if (!current) continue;
      annotations[localOffset] = {
        ...current,
        aliases: [...new Set([
          ...(current.aliases || []), ...(enrichment.aliases || []),
        ])],
        resourceIds: [...new Set([
          ...(current.resourceIds || []), ...(enrichment.resource_ids || []),
        ])],
        moduleIds: [...new Set([
          ...(current.moduleIds || []), ...(enrichment.module_ids || []),
        ])],
      };
    }
  }

  return annotations;
}
