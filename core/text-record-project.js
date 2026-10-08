// @editor-module 编解码定长文本与运行时文字，保留控制指令并提供目录投影和重置路径。
// Fixed-capacity browser asset for UI text records.
//
// Views deal in Unicode strings only. This module owns the opaque mapping to
// one/two-byte text tokens, preserves control commands and fixed UI tiles, pads unused
// text bytes, and truncates only at complete character boundaries.

import {canonicalJsonEqual, isPlainJsonObject} from "./project-store-values.js";
import {textRecordStructureFields, textRecordStructureReplacementAllowed,
  validateTextRecordStructure} from './text-record-structure.js';
import {
  annotateTextRecord, characterMapIndex, textRecordReference,
} from "./character-map-project.js";

export const TEXT_RECORDS_RESOURCE_ID = "text-record";
export const TEXT_RECORDS_ASSET_SCHEMA = "metalmaxcn.text-record.asset";
const TEXT_RECORDS_DOCUMENT_SCHEMA = "metalmaxcn.text-record";
const TEXT_RECORDS_CODEC = "fixed-text-record/v1";

/** Pass published runtime inputs through without interpreting them in consumers. */
export function textSlotProviderBindings(source) {
  return Object.fromEntries([
    "runtime_record_pair", "provider_scripts", "provider_script_hex",
    "provider_records", "provider_record_pairs", "provider_record_sequence",
    "provider_record_sequences", "provider_constants", "provider_values",
    "runtimeParameters", "invocation", "resolveRuntimeParameter",
  ].filter(key => Object.hasOwn(source || {}, key)).map(key => [key, source[key]]));
}

/** Resolve the slot's published catalog; a declared but missing catalog is an error. */
export function textSlotRuntimeParameters(templates, slot) {
  if (!slot?.runtime_parameter_catalog) return {};
  const runtimeParameters = templates?.[slot.runtime_parameter_catalog];
  if (!runtimeParameters?.records || !runtimeParameters.sources) {
    throw new TypeError(`文字槽位缺少运行时参数目录 ${slot.runtime_parameter_catalog}`);
  }
  return {runtimeParameters};
}

/** The text owner turns a published save-name field into an opaque text source. */
export function saveNameTextSource(record, bytes) {
  if (record?.binding?.text_codec !== "metalmaxcn-runtime-text"
      || !(bytes instanceof Uint8Array)) {
    throw new TypeError(`${record?.fieldId || record?.field_id} 不是已发布的运行时姓名字段`);
  }
  return {
    raw_hex: [...bytes]
      .map(value => value.toString(16).toUpperCase().padStart(2, "0"))
      .join(" "),
    length: bytes.length,
    terminator: record.binding.terminator,
    padding: record.binding.padding,
    rentalSuffix: /\.vehicle\.(8|9|10)\.name_codes$/.test(record.fieldId),
  };
}

/**
 * Current save slot + acting role/vehicle -> its current name, never ROM presets.
 * actor is {kind: "role", id: roleId} or {kind: "vehicle", id: saveVehicleSlot}.
 * Identity, field layout and encoding come from the published save bindings.
 */
export function currentActorNameSource({saveSlot, actor, fieldObjects}) {
  const unavailable = reason => ({status: "unavailable", reason});
  if (!Number.isInteger(saveSlot) || saveSlot < 1) {
    return unavailable("缺少本次消息的存档槽（战斗预览调用方）");
  }
  if (!["role", "vehicle"].includes(actor?.kind)
      || !Number.isInteger(actor.id) || actor.id < 0) {
    return unavailable("缺少当前出手者到存档角色／战车位的绑定（战斗预览调用方）");
  }
  if (!Array.isArray(fieldObjects)) {
    return unavailable("当前存档值／字段目录尚未就绪（存档工作区）");
  }
  const matches = fieldObjects.filter(object =>
    object.fieldId.endsWith(".name_codes")
      && object.binding.slot === saveSlot
      && object.binding[actor.kind] === actor.id);
  if (matches.length !== 1 || matches[0].status !== "exact") {
    return unavailable(`当前${actor.kind === "vehicle" ? "战车" : "角色"}姓名缺少唯一、精确的存档字段绑定（save-${actor.kind}）`);
  }
  const record = matches[0];
  return {status: "available", field_id: record.fieldId,
    value: saveNameTextSource(record, record.value)};
}

const MAPPED_STATUSES = new Set(["confirmed", "candidate", "manual-candidate"]);

const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

const byte = (value, name) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 0xff) {
    throw new TypeError(`${name} must be one byte`);
  }
  return number;
};

const integer = (value, name, minimum = 0) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum) {
    throw new TypeError(`${name} must be an integer >= ${minimum}`);
  }
  return number;
};

const hexByte = value => byte(value, "byte")
  .toString(16).toUpperCase().padStart(2, "0");

const hexBytes = values => values.map(hexByte).join(" ");
const validatedDocuments = new WeakSet();

export function projectTextRecordFieldView(document_, {originDocument}) {
  requireTextRecordsDocument(originDocument);
  validatedDocuments.add(document_);
}

/** 就地改写正文（编辑安装、投影重建）后，旧的校验结论作废。 */
export function invalidateTextRecordsValidation(document_) {
  if (document_ !== null && typeof document_ === "object") validatedDocuments.delete(document_);
}

function characterCount(value) {
  return Array.from(String(value || "")).length;
}

function requireProtectedRanges(record, name) {
  if (!Array.isArray(record.protected_ranges)) {
    throw new TypeError(`${name}.protected_ranges must be an array`);
  }
  const capacity = integer(record.capacity, `${name}.capacity`, 1);
  let cursor = 0;
  return record.protected_ranges.map((source, index) => {
    if (!isPlainJsonObject(source)) {
      throw new TypeError(`${name}.protected_ranges[${index}] must be an object`);
    }
    const offset = integer(source.offset, `${name}.protected_ranges[${index}].offset`);
    const length = integer(source.length, `${name}.protected_ranges[${index}].length`, 1);
    if (offset < cursor || offset + length > capacity) {
      throw new TypeError(`${name}.protected_ranges overlap or escape the record`);
    }
    cursor = offset + length;
    return {...source, offset, length, token: byte(source.token, `${name}.token`)};
  });
}

export function requireTextRecordsDocument(document_) {
  if (validatedDocuments.has(document_)) return document_;
  if (!isPlainJsonObject(document_) ||
      document_.schema !== TEXT_RECORDS_DOCUMENT_SCHEMA ||
      !isPlainJsonObject(document_.regions) ||
      !isPlainJsonObject(document_.records)) {
    throw new TypeError("text records document has an invalid schema");
  }
  const regionCount = integer(document_.region_count, "text region_count", 1);
  if (Object.keys(document_.regions).length !== regionCount) {
    throw new TypeError("text region_count does not match regions");
  }
  const recordCount = integer(document_.record_count, "text record_count", 1);
  const entries = Object.entries(document_.records);
  if (entries.length !== recordCount) {
    throw new TypeError("text record_count does not match records");
  }
  byte(document_.padding_byte, "text padding_byte");
  for (const [nodeId, record] of entries) {
    if (!isPlainJsonObject(record) || record.node_id !== nodeId ||
        !Array.isArray(record.bytes)) {
      throw new TypeError(`${nodeId}: invalid fixed text record`);
    }
    const match = nodeId.match(/^record:([0-9a-f]{2}):(\d{3})$/iu);
    if (!match || integer(record.region_id, `${nodeId}.region_id`) !==
        Number.parseInt(match[1], 16) ||
        integer(record.id, `${nodeId}.id`) !== Number.parseInt(match[2], 10)) {
      throw new TypeError(`${nodeId}: text record identity drift`);
    }
    const capacity = integer(record.capacity, `${nodeId}.capacity`, 1);
    if (record.bytes.length !== capacity) {
      throw new TypeError(`${nodeId}: byte capacity drift`);
    }
    record.bytes.forEach((value, index) => byte(value, `${nodeId}.bytes[${index}]`));
    const ranges = requireProtectedRanges(record, nodeId);
    const editableBytes = capacity - ranges.reduce(
      (total, range) => total + range.length,
      0,
    );
    if (integer(
      record.editable_byte_capacity,
      `${nodeId}.editable_byte_capacity`,
    ) !== editableBytes) {
      throw new TypeError(`${nodeId}: editable byte capacity drift`);
    }
  }
  validatedDocuments.add(document_);
  return document_;
}

function requireTextRecordsAsset(value) {
  if (!isPlainJsonObject(value) ||
      value.resource_id !== TEXT_RECORDS_RESOURCE_ID ||
      value.schema !== TEXT_RECORDS_ASSET_SCHEMA ||
      value.codec !== TEXT_RECORDS_CODEC) {
    throw new TypeError("invalid fixed text-record asset");
  }
  requireTextRecordsDocument(value.document);
  return value;
}

export function textRecordNodeId(regionId, recordId) {
  const region = integer(regionId, "text region id")
    .toString(16).toUpperCase().padStart(2, "0");
  const record = integer(recordId, "text record id")
    .toString(10).padStart(3, "0");
  return `record:${region}:${record}`;
}

/** Item names use the owner's declared record, shared by editing and runtime insertion. */
export function itemNameRecordId(item) {
  if (item?.name_authority !== "rom-region-00-record"
      || String(item?.name_text_region || "").toUpperCase() !== "00"
      || item?.name_text_record_id == null
      || !Number.isInteger(Number(item.name_text_record_id))) return null;
  return textRecordNodeId(
    Number.parseInt(String(item.name_text_region), 16),
    Number(item.name_text_record_id),
  );
}

export function textRecord(document_, regionIdOrNode, recordId = null) {
  requireTextRecordsDocument(document_);
  const nodeId = recordId === null
    ? String(regionIdOrNode || "")
    : textRecordNodeId(regionIdOrNode, recordId);
  return document_.records[nodeId] || null;
}

function parseEncodedHex(value) {
  const parts = String(value || "").trim().split(/\s+/u).filter(Boolean);
  if (!parts.length || parts.some(part => !/^[0-9a-f]{2}$/iu.test(part))) return null;
  return parts.map(part => Number.parseInt(part, 16));
}

function textFieldByte(value, fallback, label) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" && /^0x[0-9a-f]{2}$/iu.test(value)) {
    return Number.parseInt(value.slice(2), 16);
  }
  return byte(value, label);
}

function requireFixedRuntimeTextSource(source) {
  if (!isPlainJsonObject(source)) {
    throw new TypeError("定长运行时文字字段缺少来源信息");
  }
  const bytes = parseEncodedHex(source.raw_hex);
  const capacity = integer(source.length, "定长运行时文字字段长度", 1);
  if (!bytes || bytes.length !== capacity) {
    throw new TypeError(`定长运行时文字字段必须正好包含 ${capacity} 字节`);
  }
  return {
    bytes,
    capacity,
    terminator: textFieldByte(source.terminator, 0x9f, "文字终止符"),
    padding: textFieldByte(source.padding, 0xff, "文字填充字节"),
    terminatorMode: source.terminator_mode === "runtime-appended"
      ? "runtime-appended" : "embedded",
  };
}

/** Return the exact script bytes consumed at runtime, including a deferred terminator. */
export function fixedRuntimeTextScriptHex(source) {
  const {bytes, terminator, terminatorMode} =
    requireFixedRuntimeTextSource(source);
  const script = terminatorMode === "runtime-appended"
    ? [...bytes, terminator] : bytes;
  return script
    .map(byte => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

// 10:12B1–12C9 的群内序号加九形成原生实例文字码，B052 绑定时补终止符。
export function battleInstanceSuffixSource(ordinal) {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 9) throw new RangeError('敌方命名序号无效');
  return {raw_hex: (ordinal + 9).toString(16).toUpperCase().padStart(2, '0'),
    length: 1, terminator: 159, terminator_mode: 'runtime-appended'};
}

/**
 * 解码角色名等“字段内自带终止符”的运行时文字。
 *
 * 调用方只提供字段来源，不接触单/双字节字形规则；未知旧字节显示为方框且会在
 * 未编辑时原样保留，不能因为当前字符映射不完整就静默改写 ROM。
 */
export function decodeFixedRuntimeText(source, encoding) {
  if (!(encoding?.glyphCodes instanceof Map) ||
      !(encoding?.literalBytes instanceof Map)) {
    throw new TypeError("运行时文字编码不可用");
  }
  const {bytes, capacity, terminator, padding, terminatorMode} =
    requireFixedRuntimeTextSource(source);
  const terminatorOffset = bytes.indexOf(terminator);
  const limit = terminatorOffset >= 0 ? terminatorOffset : capacity;
  const characters = [];
  const unknownBytes = [];
  for (let offset = 0; offset < limit;) {
    const pair = offset + 1 < limit
      ? encoding.glyphCodes.get(hexBytes(bytes.slice(offset, offset + 2)))
      : null;
    if (pair) {
      characters.push(String(pair.unicode || "") || "□");
      if (!pair.unicode) unknownBytes.push(...bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    const literal = source.rentalSuffix && bytes[offset] === 0x96
      ? {unicode: "#"} : encoding.literalBytes.get(bytes[offset]) || null;
    if (literal?.unicode !== undefined) {
      characters.push(String(literal.unicode));
    } else if (bytes[offset] === padding) {
      characters.push(" ");
    } else {
      characters.push("□");
      unknownBytes.push(bytes[offset]);
    }
    offset += 1;
  }
  return {
    text: characters.join("").trimEnd(),
    raw_hex: hexBytes(bytes),
    bytes,
    capacity,
    terminator,
    padding,
    terminated: terminatorOffset >= 0,
    complete: (terminatorOffset >= 0 || terminatorMode === "runtime-appended")
      && unknownBytes.length === 0,
    unknown_bytes: unknownBytes,
    terminator_mode: terminatorMode,
  };
}

/** Encode one fixed-capacity runtime string without exposing glyph codes. */
export function fixedRuntimeTextBytes(text, source, encoding) {
  if (!(encoding?.glyphs instanceof Map)) {
    throw new TypeError("运行时文字编码不可用");
  }
  const {capacity, terminator, padding, terminatorMode} =
    requireFixedRuntimeTextSource(source);
  const characters = Array.from(String(text ?? ""));
  const encoded = characters.map(character => source.rentalSuffix && character === "#"
    ? {bytes: [0x96]} : encoding.glyphs.get(character) || null);
  const unsupported = [...new Set(characters.filter((_, index) => !encoded[index]))];
  if (unsupported.length) {
    return {ok: false, reason: unsupported.some(character => /^[a-z]$/u.test(character))
      ? "字库没有这些字符，英文仅支持大写" : "字库没有这些字符", unsupported};
  }
  const payload = encoded.flatMap(item => [...item.bytes]);
  // 新游戏姓名候选表每格正好四字节，运行时复制后另行追加 $9F；
  // 存档姓名等普通字段则把终止符包含在自己的固定容量内。
  const byteCapacity = terminatorMode === "runtime-appended"
    ? capacity : capacity - 1;
  if (payload.length > byteCapacity) {
    return {
      ok: false,
      reason: `姓名编码需要 ${payload.length} 字节，字段最多容纳 ${byteCapacity} 字节`,
      required_bytes: payload.length,
      byte_capacity: byteCapacity,
    };
  }
  const bytes = [
    ...payload,
    ...Array.from({length: byteCapacity - payload.length}, () => padding),
    ...(terminatorMode === "runtime-appended" ? [] : [terminator]),
  ];
  return {
    ok: true,
    text: characters.join(""),
    bytes,
    raw_hex: hexBytes(bytes),
    encoded_characters: characters.length,
    encoded_bytes: payload.length,
    padded_bytes: byteCapacity - payload.length,
    capacity,
    terminator_mode: terminatorMode,
  };
}

function installCharacterEncoding(target, unicode, bytes, priority, metadata) {
  if (characterCount(unicode) !== 1 || !bytes?.length) return;
  const current = target.get(unicode);
  const signature = hexBytes(bytes);
  if (current && (current.priority < priority ||
      (current.priority === priority && current.signature.localeCompare(signature) <= 0))) {
    return;
  }
  target.set(unicode, {
    unicode,
    bytes: Object.freeze([...bytes]),
    signature,
    priority,
    ...metadata,
  });
}

function characterMapEncoding(characterMapDocument) {
  if (!isPlainJsonObject(characterMapDocument) ||
      !Array.isArray(characterMapDocument.records)) {
    throw new TypeError("character map must contain records");
  }
  const glyphs = new Map();
  const glyphCodes = new Map();
  for (const record of characterMapDocument.records) {
    const values = parseEncodedHex(record?.encoded_hex);
    if (!values || values.length !== 2) continue;
    const signature = hexBytes(values);
    const status = String(record.status || "unidentified");
    const unicode = String(record.unicode || "");
    glyphCodes.set(signature, {
      unicode: characterCount(unicode) === 1 ? unicode : "",
      status,
      confidence: String(record.confidence || "unconfirmed"),
    });
    if (MAPPED_STATUSES.has(status)) {
      installCharacterEncoding(
        glyphs,
        unicode,
        values,
        status === "confirmed" ? 1 : 2,
        {kind: "localized-glyph", status},
      );
    }
  }
  return {glyphs, glyphCodes};
}

/** Build one opaque Unicode codec from the two text/font authorities. */
export function createTextRecordEncoding(characterMapDocument, textCatalog, textFonts = null) {
  if (!isPlainJsonObject(textCatalog) || !Array.isArray(textCatalog.records)) {
    throw new TypeError("text catalog must contain records");
  }
  const {glyphs, glyphCodes} = characterMapEncoding(characterMapDocument);
  const literalBytes = new Map();
  // 姓名沿用普通文字分派；完整核心字库不依赖文本目录的引用次数。
  const font = textFonts?.fonts?.find(font => font.id === "core-latin");
  const references = [
    ...Object.entries(font?.glyphs || {}).flatMap(([code, unicode]) => {
      const token = Number(code);
      const references = [{tile_id: token, unicode}];
      if (token >= 0x16 && token <= 0x23) references.push({tile_id: token + 0x6a, unicode});
      return references;
    }),
    ...(textCatalog.literal_tile_references || textCatalog.records.flatMap(record => record.literal_tile_references || [])),
  ];
  for (const reference of references) {
    const tile = Number(reference?.tile_id);
    const unicode = String(reference?.unicode || "");
    if (!Number.isInteger(tile) || tile < 0 || tile > 0xff ||
        characterCount(unicode) !== 1) continue;
    const existing = literalBytes.get(tile);
    if (existing && existing.unicode !== unicode) {
      throw new TypeError(
        `literal text byte ${hexByte(tile)} maps to multiple characters`,
      );
    }
    literalBytes.set(tile, {
      unicode,
      status: "confirmed",
      confidence: String(
        reference.mapping_confidence || "runtime-font-table-confirmed",
      ),
    });
    installCharacterEncoding(
      glyphs,
      unicode,
      [tile],
      0,
      {kind: "literal-glyph", status: "confirmed"},
    );
  }
  return Object.freeze({glyphs, glyphCodes, literalBytes});
}

function editableRanges(record) {
  const result = [];
  let cursor = 0;
  for (const range of record.protected_ranges) {
    if (cursor < range.offset) result.push({offset: cursor, length: range.offset - cursor});
    cursor = range.offset + range.length;
  }
  if (cursor < record.capacity) result.push({offset: cursor, length: record.capacity - cursor});
  return result;
}

// Published text VM handlers that only supply runtime data to the output stream.
export const TEXT_FILL_OPERANDS = Object.freeze({
  0xE2: [], 0xE8: [], 0xE9: [],
  0xEA: ["record:13"], 0xEC: ["record:14"],
  0xF2: ["record:09"], 0xF3: ["record:11"],
  0xF7: ["record", "region"],
  0xF8: ["provider", "format"], 0xF9: ["provider", "format"],
  0xFA: ["provider"], 0xFB: ["provider"],
  0xFC: ["provider"], 0xFD: ["provider"],
});

const TEXT_FILL_LABELS = new Map([
  [0xE2, ["数", "运行时数值", "30"]], [0xE8, ["名", "$051D 字符串", "姓名"]],
  [0xE9, ["录", "运行时记录", "弹弓"]],
  [0xEA, ["引13", "引用 13 区记录", "记录文字"]], [0xEC, ["引14", "引用 14 区记录", "记录文字"]],
  [0xF2, ["引09", "引用 09 区记录", "记录文字"]], [0xF3, ["引11", "引用 11 区记录", "记录文字"]],
  [0xF7, ["引F7", "引用指定区记录", "记录文字"]],
  [0xF8, ["定数", "提供器数值（定宽）", "123"]],
  [0xF9, ["变数", "提供器数值（紧凑）", "123"]],
  [0xFA, ["供录FA", "提供器记录并保留输出位置", "提供器文字"]],
  [0xFB, ["供录FB", "提供器记录", "提供器文字"]],
  [0xFC, ["供录FC", "提供器记录", "提供器文字"]],
  [0xFD, ["供录FD", "提供器记录", "提供器文字"]],
]);

export function textFillDetails(token, recordId) {
  if (["record:06:035", "record:06:156"].includes(recordId)) {
    if (token === 0xE2) return ["价", "运行时价格", "30"];
    if (token === 0xE9) return ["物", "运行时物品名", "弹弓"];
  }
  return TEXT_FILL_LABELS.get(token);
}

// 文本字段对象统一提供控制码名称、参数宽度与键入标记。
export const TEXT_CONTROL_CODES = new Map([
  [0xE2, ['数', []]], [0xE3, ['选择', []]], [0xE4, ['等待', []]],
  [0xE5, ['换行', []]], [0xE6, ['说话人', []]], [0xE7, ['原点换行', []]],
  [0xE8, ['名', []]], [0xE9, ['录', []]], [0xEA, ['引13', ['record']]],
  [0xEB, ['选择分支', ['meta0', 'meta1']]], [0xEC, ['引14', ['record']]],
  [0xED, ['移位', ['columns']]], [0xEE, ['样式', ['value']]],
  [0xEF, ['填充', ['length', 'tile']]], [0xF0, ['分页样式', ['value']]],
  [0xF1, ['等帧', ['frames']]], [0xF2, ['引09', ['record']]],
  [0xF3, ['引11', ['record']]], [0xF4, ['重复', ['count']]],
  [0xF5, ['钩子', ['hook']]], [0xF6, ['图块模式', []]],
  [0xF7, ['引F7', ['record', 'region']]], [0xF8, ['定数', ['provider', 'format']]],
  [0xF9, ['变数', ['provider', 'format']]], [0xFA, ['供录FA', ['provider']]],
  [0xFB, ['供录FB', ['provider']]], [0xFC, ['供录FC', ['provider']]],
  [0xFD, ['供录FD', ['provider']]], [0xFE, ['分页', []]],
  [0x2F, ['状态2F', []]], [0x30, ['状态30', []]],
  ...[0x31, 0x32, 0x33, 0x34].map(token => [token, [`状态${hexByte(token)}`, ['lookahead']]]),
  [0x43, ['图块引09', ['record']]], [0x63, ['文字模式', []]],
  [0x8C, ['图块填充', ['length', 'tile']]], [0x9E, ['图块移位', ['columns']]],
  [0x9F, ['结束', []]], [0xFF, ['空白', []]],
]);

export function textControlMarker(token, operands = [], recordId = '') {
  const label = textFillDetails(token, recordId)?.[0] || TEXT_CONTROL_CODES.get(token)?.[0];
  return label ? `〔${label}${operands.length ? ':' + hexBytes(operands) : ''}〕`
    : `〔字节:${hexBytes([token, ...operands])}〕`;
}

function markerToken(value, recordId) {
  if (value.split(':').length > 2) throw new TypeError('控制码标记只允许一个参数分隔符');
  const [name, raw = ''] = value.split(':');
  const operands = raw ? parseEncodedHex(raw) : [];
  if (!operands) throw new TypeError('控制码参数须为两位十六进制字节');
  if (name === '字节') {
    if (!operands.length) throw new TypeError('字节标记不能为空');
    return {bytes: operands, text: `〔${value}〕`};
  }
  const entry = [...TEXT_CONTROL_CODES].find(([token, [label]]) =>
    label === name || textFillDetails(token, recordId)?.[0] === name);
  if (!entry || entry[1][1].length !== operands.length) throw new TypeError(`控制码标记或参数无效：〔${value}〕`);
  return {bytes: [entry[0], ...operands], text: textControlMarker(entry[0], operands, recordId)};
}

/** 编辑标记保留原字节；普通预览仍使用 decodeFixedTextRecord。 */
export function textRecordEditorTokens(record, encoding, document_) {
  const protectedByOffset = new Map(record.protected_ranges.filter(range => !isFillRange(range))
    .map(range => [range.offset, range]));
  const tokens = [];
  let rawMode = false;
  for (let offset = 0; offset < record.capacity;) {
    const range = protectedByOffset.get(offset);
    let length = range?.length || 1;
    let kind = range && !isFillRange(range) ? 'protected' : 'text';
    let text;
    const token = record.bytes[offset];
    if (range) {
      text = range.kind === 'fixed-tile' ? `〔字节:${hexBytes(record.bytes.slice(offset, offset + length))}〕`
        : textControlMarker(token, record.bytes.slice(offset + 1, offset + length), record.node_id);
    } else if (rawMode ? [0x43, 0x63, 0x8C, 0x9E, 0x9F].includes(token)
      : (token >= 0xE2 && token <= 0xFE) || (token >= 0x2F && token <= 0x34) || token === 0x9F) {
      kind = !rawMode && Object.hasOwn(TEXT_FILL_OPERANDS, token) ? 'fill' : 'control';
      length = 1 + (TEXT_CONTROL_CODES.get(token)?.[1].length || 0);
      if (offset + length > record.capacity || Array.from({length: length - 1}, (_, i) => offset + i + 1)
          .some(index => protectedByOffset.has(index))) length = 1;
      text = textControlMarker(token, record.bytes.slice(offset + 1, offset + length), record.node_id);
    } else {
      const pair = !rawMode && offset + 1 < record.capacity && !protectedByOffset.has(offset + 1)
        ? encoding.glyphCodes.get(hexBytes(record.bytes.slice(offset, offset + 2))) : null;
      if (pair) length = 2;
      const unicode = rawMode ? null : pair?.unicode || encoding.literalBytes.get(token)?.unicode;
      const sourceBytes = record.bytes.slice(offset, offset + length);
      text = token === 0xFF ? '〔空白〕' : unicode && canonicalJsonEqual(encoding.glyphs.get(unicode)?.bytes, sourceBytes)
        && !['〔', '〕'].includes(unicode) ? unicode : `〔字节:${hexBytes(sourceBytes)}〕`;
      if (token === 0xFF) kind = 'padding';
    }
    tokens.push({kind, offset, bytes: record.bytes.slice(offset, offset + length), token,
      operands: record.bytes.slice(offset + 1, offset + length), text});
    if (!rawMode && token === 0xF6) rawMode = true;
    else if (rawMode && token === 0x63) rawMode = false;
    offset += length;
  }
  return tokens;
}

export function textRecordEditorText(record, encoding, document_) {
  return textRecordEditorTokens(record, encoding, document_).map(item => item.text).join('');
}

/** 运行时文字片段保留完整填充命令，只读取指定的可写范围。 */
export function textRecordEditorSelection(record, encoding, document_, ranges) {
  const available = textRecordRuntimeWritableRanges(record);
  let cursor = 0;
  for (const range of ranges) {
    if (!Number.isInteger(range.offset) || !Number.isInteger(range.length) || range.length < 1
        || range.offset < cursor || !available.some(span => range.offset >= span.offset
          && range.offset + range.length <= span.offset + span.length)) {
      throw new TypeError('运行时文字片段包含不可写范围');
    }
    cursor = range.offset + range.length;
  }
  const selected = textRecordEditorTokens(record, encoding, document_).filter(item => {
    const overlaps = ranges.some(range => item.offset < range.offset + range.length
      && item.offset + item.bytes.length > range.offset);
    if (overlaps && !ranges.some(range => item.offset >= range.offset
        && item.offset + item.bytes.length <= range.offset + range.length)) {
      throw new TypeError('运行时文字片段须保留完整字形与命令');
    }
    return overlaps;
  });
  return {text: selected.map(item => item.text).join(''),
    editable_byte_capacity: ranges.reduce((total, range) => total + range.length, 0)};
}

/** 文本组件只以换行或空格分隔，填充命令与受保护字节不拆词。 */
export function textRecordComponents(record, encoding, document_, ranges = null) {
  const writable = textRecordRuntimeWritableRanges(record).flatMap(span => ranges
    ? ranges.flatMap(range => {
        const offset = Math.max(span.offset, range.offset);
        const end = Math.min(span.offset + span.length, range.offset + range.length);
        return end > offset ? [{offset, length: end - offset}] : [];
      }) : [span]);
  const components = [];
  const leading = {ranges: []};
  let run = null;
  const append = (component, item) => {
    const previous = component.ranges.at(-1);
    if (previous && previous.offset + previous.length === item.offset) previous.length += item.bytes.length;
    else component.ranges.push({offset: item.offset, length: item.bytes.length});
  };
  for (const item of textRecordEditorTokens(record, encoding, document_)) {
    const editable = writable.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length);
    const separator = item.kind === 'padding' || item.kind === 'text' && /^\s+$/u.test(item.text)
      || item.kind === 'protected' && ([0xE5, 0xE7].includes(item.token)
        || item.token === 0xED && item.operands[0] > 0);
    if (separator) {
      if (editable) append(run || components.at(-1) || leading, item);
      run = null;
      continue;
    }
    if (!editable) continue;
    if (!run) {
      run = {kind: 'text', text: '', ranges: leading.ranges.splice(0)};
      components.push(run);
    }
    append(run, item);
    if (item.kind === 'fill') run.kind = 'dynamic';
    run.text += item.text;
  }
  if (!components.length && leading.ranges.length) components.push({kind: 'text', text: '', ranges: leading.ranges});
  return components;
}

/** 一个可编辑片段同时接受 Unicode、命名控制码与无损字节标记。 */
export function textRecordEditorBytes(document_, recordId, text, encoding, ranges, {exact = false} = {}) {
  const record = textRecord(document_, recordId);
  if (!record?.editable) return {ok: false, reason: '这条记录不可逐字编辑'};
  const available = textRecordRuntimeWritableRanges(record);
  const selected = ranges || available;
  if (!selected.length || selected.some(range => !available.some(span => range.offset >= span.offset
      && range.offset + range.length <= span.offset + span.length)))
    return {ok: false, reason: '文字片段包含受保护字节'};
  const encoded = [];
  const input = String(text ?? '');
  for (let offset = 0; offset < input.length;) {
    if (input[offset] === '〔') {
      const end = input.indexOf('〕', offset + 1);
      if (end < 0) return {ok: false, reason: '控制码标记缺少〕'};
      encoded.push(markerToken(input.slice(offset + 1, end), recordId));
      offset = end + 1;
    } else {
      const character = String.fromCodePoint(input.codePointAt(offset));
      const value = encoding.glyphs.get(character);
      if (!value) return {ok: false, reason: '字库没有这些字符', unsupported: [character]};
      encoded.push({bytes: [...value.bytes], text: character});
      offset += character.length;
    }
  }
  const required = encoded.reduce((sum, item) => sum + item.bytes.length, 0);
  const capacity = selected.reduce((sum, range) => sum + range.length, 0);
  if (required > capacity || exact && required !== capacity)
    return {ok: false, reason: `文字与控制码需要 ${required} 字节，片段容量 ${capacity} 字节`};
  const bytes = [...record.bytes];
  let index = 0;
  for (const range of selected) {
    let cursor = range.offset;
    const end = cursor + range.length;
    while (index < encoded.length && cursor + encoded[index].bytes.length <= end) {
      const value = encoded[index++].bytes;
      bytes.splice(cursor, value.length, ...value);
      cursor += value.length;
    }
    while (cursor < end) bytes[cursor++] = document_.padding_byte;
  }
  if (index !== encoded.length) return {ok: false, reason: '控制码或字形不能跨越受保护字节'};
  return {ok: true, node_id: recordId, bytes, text: input, ranges: selected,
    required_bytes: required, padded_bytes: capacity - required, truncated_characters: 0};
}

const isFillRange = range => range.kind === "command"
  && Object.hasOwn(TEXT_FILL_OPERANDS, Number(range.token));

/** Mutable spans include fill commands while retaining every Original flow boundary. */
export function textRecordRuntimeWritableRanges(record) {
  if (record.list_order || record.byte_variants) {
    const offsets = record.list_order ? record.list_order.slots.flatMap(slot => slot.offsets)
      : record.bytes.flatMap((value, offset) => record.byte_variants.some(bytes => bytes[offset] !== value) ? [offset] : []);
    return [...new Set(offsets)].sort((a, b) => a - b).map(offset => ({offset, length: 1}));
  }
  const result = [];
  let cursor = 0;
  for (const range of record.protected_ranges) {
    if (isFillRange(range)) continue;
    if (cursor < range.offset) result.push({offset: cursor, length: range.offset - cursor});
    cursor = range.offset + range.length;
  }
  if (cursor < record.capacity) result.push({offset: cursor, length: record.capacity - cursor});
  return result;
}

function validateFillOperands(token, operands, document_) {
  const kinds = TEXT_FILL_OPERANDS[token];
  if (!kinds || operands.length !== kinds.length) return false;
  const region = token === 0xF7 ? operands[1] :
    ({0xEA: 0x13, 0xEC: 0x14, 0xF2: 0x09, 0xF3: 0x11})[token];
  return kinds.every((kind, index) => {
    const value = operands[index];
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) return false;
    if (kind === "provider") return value <= 0x45;
    if (kind === "format") return (token === 0xF8
      ? [0, 1, 2, 0x80, 0x81, 0x82] : [0, 1, 2]).includes(value);
    if (kind === "region") return Boolean(document_.regions[value.toString(16).toUpperCase().padStart(2, "0")]);
    if (kind === "record" || kind.startsWith("record:")) {
      return Boolean(document_.records[textRecordNodeId(region, value)]);
    }
    return false;
  });
}

/** Parse a mutable span as complete VM tokens; tokens retain their exact source bytes. */
export function textRecordRuntimeTokens(record, encoding, document_) {
  const ranges = textRecordRuntimeWritableRanges(record);
  return textRecordEditorTokens(record, encoding, document_).filter(item => ranges.some(range =>
    item.offset >= range.offset && item.offset + item.bytes.length <= range.offset + range.length))
    .map(item => {
      if (item.kind === 'fill') {
        if (!validateFillOperands(item.token, item.operands, document_))
          throw new TypeError(`${record.node_id}: invalid fill command at ${item.offset}`);
        return {...item, kind: 'fill'};
      }
      return item;
    });
}

/** 控制码只在完整标记边界插入或删除。 */
export function editTextRecordFill(document_, recordId, encoding, {action, offset, token, operands = []}) {
  requireTextRecordsDocument(document_);
  const record = textRecord(document_, recordId);
  if (!record?.editable) throw new TypeError(`${recordId}: record is not editable`);
  const tokens = textRecordRuntimeTokens(record, encoding, document_);
  const target = tokens.find(item => item.offset === offset);
  if (action === "delete" && !TEXT_CONTROL_CODES.has(target?.token)) {
    throw new TypeError("只能整块删除控制码");
  }
  if (action === "insert" && (!TEXT_CONTROL_CODES.has(token)
      || operands.length !== TEXT_CONTROL_CODES.get(token)[1].length
      || !operands.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
      || Object.hasOwn(TEXT_FILL_OPERANDS, token) && !validateFillOperands(token, operands, document_))) {
    throw new TypeError("控制码参数个数或取值无效");
  }
  const range = textRecordRuntimeWritableRanges(record).find(item =>
    offset >= item.offset && offset < item.offset + item.length);
  if (!range) throw new TypeError("插入位置不在可编辑文字片段内");
  const within = tokens.filter(item => item.offset >= range.offset && item.offset < range.offset + range.length);
  const index = within.findIndex(item => item.offset === offset);
  if (index < 0) throw new TypeError("插入位置必须在完整 token 边界");
  const updated = [...within];
  if (action === "delete") updated.splice(index, 1);
  else if (action === "insert") updated.splice(index, 0, {bytes: [token, ...operands]});
  else throw new TypeError("未知填值码操作");
  while (updated.at(-1)?.kind === "padding") updated.pop();
  const payload = updated.flatMap(item => item.bytes);
  if (payload.length > range.length) throw new TypeError("该片段没有足够的空白字节");
  const bytes = record.bytes.slice();
  bytes.splice(range.offset, range.length, ...payload,
    ...Array(range.length - payload.length).fill(document_.padding_byte));
  return {ok: true, node_id: recordId, bytes};
}

function textRecordEditableRanges(record, ranges = null) {
  const available = editableRanges(record);
  if (ranges === null || ranges === undefined) return available;
  if (!Array.isArray(ranges) || !ranges.length) {
    throw new TypeError("定长文字片段没有可编辑字节范围");
  }
  let cursor = 0;
  return ranges.map((source, index) => {
    if (!isPlainJsonObject(source)) {
      throw new TypeError(`文字片段范围 ${index} 不是对象`);
    }
    const offset = integer(source.offset, `文字片段范围 ${index}.offset`);
    const length = integer(source.length, `文字片段范围 ${index}.length`, 1);
    if (offset < cursor || offset + length > record.capacity) {
      throw new TypeError("文字片段范围重叠或超出记录容量");
    }
    if (!available.some(range => (
      offset >= range.offset
      && offset + length <= range.offset + range.length
    ))) {
      throw new TypeError("文字片段范围包含结构命令或固定图块");
    }
    cursor = offset + length;
    return {offset, length};
  });
}

/**
 * fixed-tile 字节仍由文字 VM 逐 token 读取；命令、终止符、双字节字形前缀和
 * 会被运行时重映射的核心字节都不能当作“所见即所得”的图块编号写进去。
 */
export function textRecordFixedTileValueAllowed(value) {
  const token = byte(value, "fixed tile");
  return token === 0xFF || (
    token < 0xE2
    && token !== 0x9F
    && token !== 0x42
    && !(token >= 0x16 && token <= 0x34)
  );
}

function appendLine(pages) {
  pages[pages.length - 1].push("");
}

function appendPage(pages) {
  pages.push([""]);
}

function appendText(pages, value) {
  const page = pages[pages.length - 1];
  page[page.length - 1] += value;
}

/** Decode effective bytes without moving the record's structural commands. */
export function decodeFixedTextRecord(record, encoding, {fillPlaceholders = false} = {}) {
  if (!isPlainJsonObject(record) || !Array.isArray(record.bytes)) {
    throw new TypeError("fixed text record is invalid");
  }
  if (record.bytes.length !== integer(record.capacity, "text record capacity", 1))
    throw new TypeError(`${record.node_id}: byte capacity drift`);
  if (!(encoding?.glyphCodes instanceof Map) ||
      !(encoding?.literalBytes instanceof Map)) {
    throw new TypeError("text record encoding is invalid");
  }
  const protectedByOffset = new Map(
    record.protected_ranges.filter(range => !isFillRange(range))
      .map(range => [Number(range.offset), range]),
  );
  const bytes = record.bytes.map((value, index) => byte(value, `record byte ${index}`));
  const pages = [[""]];
  const glyphReferences = [];
  const literalReferences = [];
  const commands = [];
  const statuses = {};
  let mapped = 0;
  let confirmed = 0;
  let total = 0;
  for (let offset = 0; offset < bytes.length;) {
    const protectedRange = protectedByOffset.get(offset);
    if (protectedRange) {
      if (protectedRange.kind === "command") {
        commands.push({...protectedRange});
        if (["line-break-scroll", "line-break"].includes(protectedRange.semantic)) {
          appendLine(pages);
        } else if ([
          "page-break-or-repeat-end",
          "set-page-style-and-break",
        ].includes(protectedRange.semantic) && protectedRange.repeat_role !== "delimiter") {
          appendPage(pages);
        }
      }
      offset += protectedRange.length;
      continue;
    }
    if (Object.hasOwn(TEXT_FILL_OPERANDS, bytes[offset])) {
      const length = 1 + TEXT_FILL_OPERANDS[bytes[offset]].length;
      commands.push({kind: "command", token: bytes[offset], offset, length});
      if (fillPlaceholders) appendText(pages, `〔${textFillDetails(bytes[offset], record.node_id)[0]}〕`);
      offset += length;
      continue;
    }
    if ((bytes[offset] >= 0xE2 && bytes[offset] <= 0xFE)
        || (bytes[offset] >= 0x2F && bytes[offset] <= 0x34) || bytes[offset] === 0x9F) {
      const token = bytes[offset];
      const length = 1 + (TEXT_CONTROL_CODES.get(token)?.[1].length || 0);
      commands.push({kind: 'command', token, offset, length});
      if ([0xE5, 0xE7].includes(token)) appendLine(pages);
      if ([0xFE, 0xF0].includes(token)) appendPage(pages);
      offset += length;
      continue;
    }
    const pair = offset + 1 < bytes.length && !protectedByOffset.has(offset + 1)
      ? encoding.glyphCodes.get(hexBytes(bytes.slice(offset, offset + 2)))
      : null;
    let reference;
    if (pair) {
      reference = {
        offset,
        encoded_hex: hexBytes(bytes.slice(offset, offset + 2)),
        unicode: pair.unicode,
        mapping_status: pair.status,
        mapping_confidence: pair.confidence,
      };
      glyphReferences.push(reference);
      offset += 2;
    } else {
      const literal = encoding.literalBytes.get(bytes[offset]) || {};
      reference = {
        offset,
        tile_id: bytes[offset],
        tile_id_hex: hexByte(bytes[offset]),
        unicode: String(literal.unicode || ""),
        mapping_status: String(literal.status || "unidentified"),
        mapping_confidence: String(literal.confidence || "unconfirmed"),
      };
      literalReferences.push(reference);
      offset += 1;
    }
    total += 1;
    const status = String(reference.mapping_status || "unidentified");
    statuses[status] = (statuses[status] || 0) + 1;
    if (reference.unicode) {
      mapped += 1;
      if (status === "confirmed") confirmed += 1;
      appendText(pages, reference.unicode);
    } else {
      appendText(pages, "□");
    }
  }
  const normalizedPages = pages.map(lines => lines.map(line => line.trimEnd()));
  const preview = normalizedPages.flat().join("");
  const complete = mapped === total;
  const status = total === 0
    ? "no-static-glyphs"
    : confirmed === total
      ? "confirmed"
      : complete
        ? "candidate-complete"
        : mapped
          ? "partial"
          : "unmapped";
  return {
    bytes,
    raw_hex: hexBytes(bytes),
    glyph_references: glyphReferences,
    literal_tile_references: literalReferences,
    commands,
    pages: normalizedPages,
    page_breaks: normalizedPages.length - 1,
    text: preview,
    unicode_preview: preview,
    display_text: complete ? preview : null,
    formatted_text: normalizedPages
      .map(lines => lines.join("\n"))
      .join("\n\n")
      .trim(),
    unicode_mapping: {
      status,
      total_glyphs: total,
      mapped_glyphs: mapped,
      confirmed_glyphs: confirmed,
      status_counts: Object.fromEntries(
        Object.entries(statuses).sort(([left], [right]) => left.localeCompare(right)),
      ),
      complete,
      confirmed_complete: confirmed === total,
    },
  };
}

// $E3 返回选择值；$EB 按 D5 选择同文字区后继，$FF 后继结束对话。
export function resolveTextRecordDialogue(document_, encoding, regionId, recordId, choose) {
  const stages = [];
  const seen = new Set();
  while (recordId !== 0xFF) {
    const record = textRecord(document_, regionId, recordId);
    if (!record) throw new TypeError(`对话后继记录不存在：${regionId}:${recordId}`);
    const decoded = decodeFixedTextRecord(record, encoding);
    const choices = [];
    let next = 0xFF;
    for (const command of decoded.commands) {
      if (command.token !== 0xE3 && command.token !== 0xEB) continue;
      const value = Number(choose({record: record.node_id, regionId, recordId, offset: command.offset}));
      if (value !== 0 && value !== 1) throw new TypeError("剧情预览选择须为 0（是）或 1（否）");
      choices.push({record: record.node_id, offset: command.offset, value});
      if (command.token === 0xEB) next = record.bytes[command.offset + 1 + value];
    }
    const signature = `${recordId}:${choices.map(choice => choice.value).join(",")}`;
    if (seen.has(signature)) throw new TypeError("剧情预览文字选择进入循环");
    seen.add(signature);
    stages.push({region_id: regionId, record_id: recordId, record_found: true,
      pages: decoded.pages, page_breaks: decoded.page_breaks, text: decoded.text, choices});
    recordId = next;
  }
  return stages;
}

/** Decode only one explicitly selected text component inside a larger record. */
export function decodeFixedTextRecordSelection(record, encoding, ranges) {
  if (!isPlainJsonObject(record) || !Array.isArray(record.bytes)) {
    throw new TypeError("fixed text record is invalid");
  }
  if (!(encoding?.glyphCodes instanceof Map) ||
      !(encoding?.literalBytes instanceof Map)) {
    throw new TypeError("text record encoding is invalid");
  }
  const selected = textRecordEditableRanges(record, ranges);
  const characters = [];
  let mapped = 0;
  let confirmed = 0;
  let total = 0;
  for (const range of selected) {
    const end = range.offset + range.length;
    for (let offset = range.offset; offset < end;) {
      const pair = offset + 1 < end
        ? encoding.glyphCodes.get(hexBytes(record.bytes.slice(offset, offset + 2)))
        : null;
      const reference = pair || encoding.literalBytes.get(record.bytes[offset]) || {};
      const unicode = String(reference.unicode || "");
      const status = String(reference.status || "unidentified");
      characters.push(unicode || "□");
      total += 1;
      if (unicode) {
        mapped += 1;
        if (status === "confirmed") confirmed += 1;
      }
      offset += pair ? 2 : 1;
    }
  }
  const text = characters.join("").trimEnd();
  return {
    text,
    pages: [[text]],
    editable_byte_capacity: selected.reduce(
      (totalBytes, range) => totalBytes + range.length,
      0,
    ),
    unicode_mapping: {
      total_glyphs: total,
      mapped_glyphs: mapped,
      confirmed_glyphs: confirmed,
      complete: mapped === total,
      confirmed_complete: confirmed === total,
    },
  };
}

/** Replace text bytes, padding or truncating without altering any command byte. */
export function fixedTextRecordBytes(
  document_, recordId, text, encoding, ranges = null
) {
  requireTextRecordsDocument(document_);
  const record = textRecord(document_, recordId);
  if (!record) return {ok: false, reason: "当前文本区没有这条记录"};
  if (!record.editable) {
    return {ok: false, reason: record.readonly_reason || "这条记录不可逐字编辑"};
  }
  if (!(encoding?.glyphs instanceof Map)) {
    throw new TypeError("text record encoding is invalid");
  }
  const characters = Array.from(String(text ?? ""));
  const encoded = characters.map(character => encoding.glyphs.get(character) || null);
  const unsupported = [...new Set(characters.filter((_, index) => !encoded[index]))];
  if (unsupported.length) {
    return {ok: false, reason: "字库没有这些字符", unsupported};
  }
  const requiredBytes = encoded.reduce(
    (total, character) => total + character.bytes.length,
    0,
  );
  const bytes = record.bytes.slice();
  const padding = byte(document_.padding_byte, "text padding_byte");
  const selectedRanges = textRecordEditableRanges(record, ranges);
  const selectedCapacity = selectedRanges.reduce(
    (total, range) => total + range.length,
    0,
  );
  let characterIndex = 0;
  let encodedBytes = 0;
  for (const range of selectedRanges) {
    let cursor = range.offset;
    const end = range.offset + range.length;
    while (characterIndex < encoded.length && cursor < end) {
      const values = encoded[characterIndex].bytes;
      if (values.length > end - cursor) break;
      bytes.splice(cursor, values.length, ...values);
      cursor += values.length;
      encodedBytes += values.length;
      characterIndex += 1;
    }
    while (cursor < end) bytes[cursor++] = padding;
  }
  const nextRecord = {...record, bytes};
  const decoded = ranges === null || ranges === undefined
    ? decodeFixedTextRecord(nextRecord, encoding)
    : decodeFixedTextRecordSelection(nextRecord, encoding, selectedRanges);
  return {
    ok: true,
    node_id: record.node_id,
    bytes,
    text: decoded.text,
    pages: decoded.pages,
    encoded_characters: characterIndex,
    truncated_characters: characters.length - characterIndex,
    padded_bytes: selectedCapacity - encodedBytes,
    required_bytes: requiredBytes,
    capacity: record.capacity,
    editable_byte_capacity: selectedCapacity,
    ranges: ranges === null || ranges === undefined
      ? null : selectedRanges.map(range => ({...range})),
  };
}

/** Encode through the shared text-record codec, but reject any byte-length drift. */
export function exactFixedTextRecordBytes(
  document_, recordId, text, encoding, ranges = null
) {
  const result = fixedTextRecordBytes(
    document_, recordId, text, encoding, ranges,
  );
  if (!result.ok) return result;
  const required = Number(result.required_bytes);
  const expected = Number(result.editable_byte_capacity);
  if (required !== expected) {
    const difference = required - expected;
    return {
      ...result,
      ok: false,
      byte_difference: difference,
      reason: `新文字编码为 ${required} 字节，原记录为 ${expected} 字节，${
        difference > 0 ? "多" : "少"
      } ${Math.abs(difference)} 字节；定长替换必须保持字节数相同`,
    };
  }
  if (result.truncated_characters) {
    return {
      ...result,
      ok: false,
      reason: "新文字跨越了不可拆分的定长片段，不能完整写入",
    };
  }
  return result;
}

export function installEncodedTextRecord(document_, result) {
  requireTextRecordsDocument(document_);
  if (!result?.ok || !Array.isArray(result.bytes)) {
    throw new TypeError("encoded text record result is invalid");
  }
  const record = textRecord(document_, result.node_id);
  if (!record || result.bytes.length !== record.capacity) {
    throw new TypeError("encoded text record identity/capacity drift");
  }
  record.bytes = result.bytes.map((value, index) => byte(value, `encoded byte ${index}`));
  invalidateTextRecordsValidation(document_);
  return record;
}

// 候选须保留 Original 的身份、容量、编辑许可与保护结构，字形编码只取字符映射权威。
export function validateFixedTextRecordAsset(asset, original, characterMapDocument) {
  requireTextRecordsAsset(asset);
  requireTextRecordsAsset(original);
  const encoding = {...characterMapEncoding(characterMapDocument), literalBytes: new Map()};
  const expected = cloneJson(original);
  const recordIds = Object.keys(original.document.records).sort();
  if (!canonicalJsonEqual(Object.keys(asset.document.records).sort(), recordIds)) {
    throw new TypeError("text-record: record identity set changed");
  }
  for (const recordId of recordIds) {
    const before = original.document.records[recordId];
    const next = asset.document.records[recordId];
    for (const record of [before, next]) {
      if (!record.bytes.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) {
        throw new TypeError(`${recordId}: non-byte value in record`);
      }
    }
    if (next.bytes.length !== before.capacity) {
      throw new TypeError(`${recordId}: fixed record capacity changed`);
    }
    if (!canonicalJsonEqual(next.bytes, before.bytes)) {
      const slots = before.list_order?.slots || [];
      const slotOffsets = new Set(slots.flatMap(slot => slot.offsets));
      const parts = bytes => slots.map(slot => JSON.stringify(slot.offsets.map(offset => bytes[offset]))).sort();
      const listOrderAllowed = slots.length > 0 && canonicalJsonEqual(parts(before.bytes), parts(next.bytes))
        && next.bytes.every((value, offset) => slotOffsets.has(offset) || value === before.bytes[offset]);
      const variantAllowed = before.byte_variants?.some(bytes => canonicalJsonEqual(bytes, next.bytes)) === true;
      const listChangeAllowed = listOrderAllowed || variantAllowed;
      if (before.editable !== true && !listChangeAllowed && !textRecordStructureFields(original.document, recordId).length)
        throw new TypeError(`${recordId}: record is not editable`);
      if (before.editable !== true) for (let offset = 0; offset < before.capacity; offset += 1) {
        if (next.bytes[offset] !== before.bytes[offset] && !listChangeAllowed
          && !textRecordStructureReplacementAllowed(original.document, recordId, offset, next.bytes[offset]))
          throw new TypeError(`${recordId}: readonly bytes changed`);
      }
      for (const range of before.protected_ranges.filter(range => !isFillRange(range))) {
        for (let offset = range.offset; offset < range.offset + range.length; offset += 1) {
          if (next.bytes[offset] !== before.bytes[offset] && !listChangeAllowed
              && !textRecordProtectedReplacementAllowed(before, offset, next.bytes[offset])
              && !textRecordStructureReplacementAllowed(original.document, recordId, offset, next.bytes[offset])) {
            throw new TypeError(`${recordId}: protected text structure changed`);
          }
        }
      }
      textRecordRuntimeTokens(next, encoding, original.document);
      validateTextRecordStructure(asset.document, original.document, recordId);
    }
    expected.document.records[recordId].bytes = next.bytes;
  }
  if (!canonicalJsonEqual(asset, expected)) {
    throw new TypeError("text-record: changes outside record bytes");
  }
}

// 保护结构的替换许可只读取 Original 发布的单字节固定图块范围。
export function textRecordProtectedReplacementAllowed(originalRecord, offset, value) {
  const range = originalRecord.protected_ranges.find(range => range.offset === offset && range.length === 1);
  const values = range?.replacement?.allowed_values;
  return originalRecord.editable === true && range?.kind === "fixed-tile"
    && Array.isArray(values) && values.length > 0
    && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
    && new Set(values).size === values.length && values.includes(originalRecord.bytes[offset])
    && values.includes(value);
}

function textRecordResetPath(recordId) {
  return ["document", "records", String(recordId), "bytes"];
}


class CurrentTextSources extends Map {
  constructor(records, document_) {
    super(records instanceof CurrentTextSources ? Map.prototype.entries.call(records) : records || []);
    this.document = document_ || (records instanceof CurrentTextSources ? records.document : null);
    this.localOverrides = new Set(records instanceof CurrentTextSources ? records.localOverrides : []);
    for (const id of Object.keys(this.document?.records || {})) {
      if (!super.has(id)) super.set(id, null);
    }
  }
  get(id) {
    if (!super.has(id) || this.localOverrides.has(id)) return super.get(id);
    const record = this.document?.records?.[id];
    return Array.isArray(record?.bytes) ? record.bytes.slice() : super.get(id);
  }
  set(id, value) {this.localOverrides?.add(id); return super.set(id, value);}
  delete(id) {this.localOverrides.delete(id); return super.delete(id);}
  clear() {this.localOverrides.clear(); super.clear();}
  *entries() {for (const id of this.keys()) yield [id, this.get(id)];}
  *values() {for (const id of this.keys()) yield this.get(id);}
  [Symbol.iterator]() {return this.entries();}
  forEach(callback, context) {for (const [id, value] of this) callback.call(context, value, id, this);}
}

/** 文本来源只在按引用取值时读取当前字段；克隆保留同一字段会话。 */
export function effectiveTextRecordSources(records, document_) {
  return new CurrentTextSources(records, document_);
}

export function textRecordListReferenceChoices(record, encoding, document_) {
  const references = textRecordRuntimeTokens(record, encoding, document_).filter(token => token.kind === 'fill'
    && token.token === 0xEA && document_.records[textRecordNodeId(0x13, token.operands[0])]?.bytes.at(-2) === 0xE5);
  const choices = [];
  for (let first = 0; first < references.length; first++) for (let second = first + 1; second < references.length; second++) {
    const a = references[first], b = references[second], bytes = [...record.bytes];
    bytes[a.offset + 1] = b.operands[0]; bytes[b.offset + 1] = a.operands[0];
    choices.push({values: [bytes], label: `${textRecordNodeId(0x13, a.operands[0])} ↔ ${textRecordNodeId(0x13, b.operands[0])}`});
  }
  return choices;
}

/** 把一条定长记录的当前字节铺到目录记录上；两条路径（整份/按需）共用。 */
function overlayFixedTextRecord(record, fixedRecord, encoding) {
  const projection = decodeFixedTextRecord(fixedRecord, encoding);
  Object.assign(record, {
    raw_hex: projection.raw_hex,
    glyph_references: projection.glyph_references,
    literal_tile_references: projection.literal_tile_references,
    unicode_preview: projection.unicode_preview,
    display_text: projection.display_text,
    formatted_text: projection.formatted_text,
    unicode_mapping: projection.unicode_mapping,
    known_label: projection.unicode_mapping.complete
      ? projection.formatted_text : "",
    current_pages: projection.pages,
    current_page_breaks: projection.page_breaks,
    current_text: projection.text,
  });
  return record;
}

/**
 * 一条记录在当前字形映射与当前字节下的投影：字形注解 + 有效字节。
 *
 * `source` 不改写；`annotate` 为假表示传进来的目录已经注解过（例如文字页自己
 * 刷过的那一份），只补有效字节。整份刷新与按需查询必须走这一条路径，否则两条
 * 路径会给出不同的 `known_label`／`formatted_text`。
 */
function projectTextRecord(source, {
  characterMapDocument, mappings = null, encoding = null, fixedRecord = null,
  annotate = true,
} = {}) {
  const record = annotate || fixedRecord ? cloneJson(source) : source;
  if (annotate) Object.assign(record, annotateTextRecord(record, characterMapDocument, mappings));
  if (fixedRecord) overlayFixedTextRecord(record, fixedRecord, encoding);
  else if (annotate) {
    const preview = String(record.formatted_text || record.unicode_preview || "");
    record.known_label = record.unicode_mapping.complete
      && record.unicode_mapping.total_glyphs && preview && !preview.includes("□")
      ? preview : "";
  }
  return record;
}

/**
 * 按 node_id 现算的当前文字引用表。
 *
 * 引用方一律按 node_id 单条查询（`resourceLabel`、`game_data` 名称、故事投影），
 * 没有整份遍历的读取方；整份目录只归文字页自己的目录构建。按需查询因此只为
 * 真正被渲染的那几条记录付「注解 + 有效字节解码」的代价。
 */
export function createTextReferenceIndex({
  catalog, characterMapDocument, recordsDocument = null, encoding = null,
  annotate = true,
} = {}) {
  const mappings = annotate ? characterMapIndex(characterMapDocument) : null;
  const fixedRecords = recordsDocument?.records || {};
  const sources = new Map((catalog?.records || []).map(record => [
    String(record?.node_id || ""), record,
  ]));
  const memo = new Map();
  const projected = nodeId => {
    const source = sources.get(nodeId);
    if (!source) {
      if (!Object.hasOwn(fixedRecords, nodeId)) return null;
      return overlayFixedTextRecord({node_id: nodeId}, fixedRecords[nodeId], encoding);
    }
    if (catalog?.schema === 'metalmaxcn.text-reference-catalog') {
      if (!Object.hasOwn(fixedRecords, nodeId)) throw new TypeError(`文本引用缺少字段对象：${nodeId}`);
      return overlayFixedTextRecord({...source}, fixedRecords[nodeId], encoding);
    }
    return projectTextRecord(source, {
      characterMapDocument, mappings, encoding,
      fixedRecord: fixedRecords[nodeId] || null, annotate,
    });
  };
  const record = nodeId => {
    const key = String(nodeId || "");
    if (!key) return null;
    if (!memo.has(key)) memo.set(key, projected(key));
    return memo.get(key);
  };
  return Object.freeze({
    nodeIds: Object.freeze([...sources.keys()]),
    record,
    get(nodeId) {
      const value = record(nodeId);
      return value ? textRecordReference(value) : null;
    },
  });
}

/** Overlay effective record bytes on the read-only navigation catalog. */
export function applyTextRecordsToCatalog(textCatalog, recordsDocument, encoding, {reuse = false} = {}) {
  if (!isPlainJsonObject(textCatalog) || !Array.isArray(textCatalog.records)) {
    throw new TypeError("text catalog must contain records");
  }
  requireTextRecordsDocument(recordsDocument);
  const result = reuse ? textCatalog : cloneJson(textCatalog);
  const records = new Map(result.records.map(record => [String(record.node_id), record]));
  for (const [nodeId, fixedRecord] of Object.entries(recordsDocument.records)) {
    const record = records.get(nodeId);
    if (!record) continue;
    overlayFixedTextRecord(record, fixedRecord, encoding);
  }
  const mappingStatuses = {};
  for (const record of result.records) {
    const status = String(record.unicode_mapping?.status || "unmapped");
    mappingStatuses[status] = (mappingStatuses[status] || 0) + 1;
  }
  result.summary = {
    ...(result.summary || {}),
    unicode_mapping: {
      confirmed_records: mappingStatuses.confirmed || 0,
      candidate_complete_records: mappingStatuses["candidate-complete"] || 0,
      partial_records: mappingStatuses.partial || 0,
      unmapped_records: mappingStatuses.unmapped || 0,
      no_static_glyph_records: mappingStatuses["no-static-glyphs"] || 0,
    },
  };
  return result;
}

const storyTextProjectionOrigins = new WeakMap();

/** 当前文字投影到剧情显示字段；引用索引只解引用已读取的记录。 */
export function applyTextCatalogToStoryProject(project, textCatalog, {referenceIndex = null} = {}) {
  const records = new Map((textCatalog?.records || []).map(record => [
    `${Number(record.region)}:${Number(record.record)}`,
    record,
  ]));
  const targets = [];
  for (const program of project?.story?.browser_vm?.programs || []) {
    for (const command of program.commands || []) {
      if (command.blocking_ui) targets.push(command.blocking_ui);
      targets.push(...(command.blocking_ui_choices || []));
    }
  }
  // 结局 MODE $0D/$0E 直接调度 region $15 的记录，不经过普通角色脚本的
  // blocking_ui。它们仍是同一份 text-record 基础资产，也必须接受同一份当前
  // 文本投影，不能让职员表在编辑器里悄悄保留发布时的旧文字。
  for (const sequence of project?.story?.browser_vm?.sequences || []) {
    for (const stage of sequence.ending_animation?.timeline || []) {
      if (stage.ui_record) targets.push(stage.ui_record);
    }
  }
  const targetNodeId = target => Number.isSafeInteger(Number(target.region_id))
    && Number.isSafeInteger(Number(target.record_id))
    ? textRecordNodeId(Number(target.region_id), Number(target.record_id)) : "";
  let updated = 0;
  for (const target of targets) {
    if (referenceIndex) {
      const nodeId = targetNodeId(target);
      if (!records.has(`${Number(target.region_id)}:${Number(target.record_id)}`)) continue;
      let before = storyTextProjectionOrigins.get(target);
      if (!before) {
        before = {record_found: target.record_found, page_breaks: target.page_breaks,
          pages: target.pages, text: target.text};
        storyTextProjectionOrigins.set(target, before);
      }
      let source, projection;
      for (const key of Object.keys(before)) Object.defineProperty(target, key, {enumerable: true, configurable: true,
        get: () => {
          const record = referenceIndex.record(nodeId);
          if (!record || !Array.isArray(record.current_pages)) return before[key];
          if (source !== record) {
            source = record;
            projection = {record_found: true, page_breaks: Number(record.current_page_breaks) || 0,
              pages: cloneJson(record.current_pages), text: String(record.current_text || "")};
          }
          return projection[key];
        }});
      updated += 1;
      continue;
    }
    const record = records.get(`${Number(target.region_id)}:${Number(target.record_id)}`);
    if (!record || !Array.isArray(record.current_pages)) continue;
    for (const [key, value] of Object.entries({
      record_found: true,
      page_breaks: Number(record.current_page_breaks) || 0,
      pages: cloneJson(record.current_pages),
      text: String(record.current_text || ""),
    })) Object.defineProperty(target, key, {value, enumerable: true, configurable: true, writable: true});
    updated += 1;
  }
  return updated;
}
