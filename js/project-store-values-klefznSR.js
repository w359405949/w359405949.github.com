// @editor-module 在当前页面会话内统一记录日志、任务进度与未查看的错误。

const entries = [];
const tasks = new Map();
const listeners = new Set();
const errors = new WeakMap();
let sequence = 0;
let context = {};

const LOG_LEVELS = Object.freeze({debug: "调试", info: "信息", warning: "警告", error: "错误"});

function detailText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {return JSON.stringify(value, null, 2);}
  catch {return String(value);}
}

function notify() {
  for (const listener of listeners) {
    try {listener();} catch { /* 日志订阅不能中断被记录的操作。 */ }
  }
}

function record({source = "编辑器", level = "info", time = new Date(), message = "", progress = null,
  details = null, error = null, retry = null, running = false} = {}) {
  const entry = {
    id: ++sequence, source, level, time: new Date(time).toISOString(), message: String(message),
    progress: progress ? Object.freeze({...progress}) : null,
    details: detailText(details), stack: error?.stack || "", viewed: false, running,
    retry: typeof retry === "function" ? retry : null,
  };
  entries.push(entry);
  notify();
  return entry;
}

function error(source, message, failure, options = {}) {
  if (failure && typeof failure === "object") {
    if (errors.has(failure)) {
      const existing = errors.get(failure);
      if (typeof options.retry === "function") {existing.retry = options.retry; notify();}
      return existing;
    }
    const entry = record({source, message, error: failure, ...options, level: "error"});
    errors.set(failure, entry);
    return entry;
  }
  return record({source, message, ...options, level: "error"});
}

function startTask({source, message, ...options}) {
  const id = Symbol(source);
  let finished = false;
  const update = patch => {
    if (finished) return;
    const value = {...tasks.get(id), ...patch, source};
    tasks.set(id, value);
    return record({...value, running: true});
  };
  tasks.set(id, {source, message, ...options});
  record({source, message, ...options, running: true});
  return Object.freeze({
    update,
    finish(patch = {}) {
      if (finished) return;
      finished = true;
      const value = {...tasks.get(id), ...patch, source, running: false};
      tasks.delete(id);
      if (patch.error) {
        const entry = error(source, value.message, patch.error, value);
        notify();
        return entry;
      }
      return record(value);
    },
  });
}

function acknowledge(ids) {
  const selected = new Set(ids);
  let changed = false;
  for (const entry of entries) if (selected.has(entry.id) && !entry.viewed) {
    entry.viewed = true;
    changed = true;
  }
  if (changed) notify();
}

function logProgressText(progress) {
  if (!progress) return "";
  return Number.isFinite(progress.current) && Number.isFinite(progress.total) && progress.total > 0
    ? `${progress.current}/${progress.total}` : "…";
}

function logEntryText(entry) {
  return [`${entry.time} [${entry.source}] [${LOG_LEVELS[entry.level] || entry.level}] ${entry.message}`,
    logProgressText(entry.progress), entry.details, entry.stack].filter(Boolean).join("\n");
}

const editorLog = Object.freeze({
  record, error, startTask, acknowledge,
  setContext(value) {context = {...value}; notify();},
  context: () => ({...context}),
  entries: () => entries.slice(),
  tasks: () => [...tasks.values()],
  attention: () => entries.findLast(entry => entry.level === "error" && !entry.viewed)
    || entries.findLast(entry => !entry.viewed && !entry.running && ["warning", "info"].includes(entry.level)),
  subscribe(listener) {
    listeners.add(listener);
    listener();
    return () => listeners.delete(listener);
  },
});

// @editor-module 为开发根路径与静态发布子路径提供同一站点地址。
const root = new URL("../core/site-url.js", import.meta.url).href.startsWith("file:") ? "/" : new URL("../", new URL("../core/site-url.js", import.meta.url).href).pathname;

const siteUrl = path => `${root}${String(path).replace(/^\/+/, "")}`;

// @editor-module 按 target 与 BuildMap 写入逻辑片段并产出构建报告。
// Deterministic fixed-layout ROM linker.
//
// Asset compilers provide logical fragments and never receive a physical ROM
// offset.  This is the only browser module allowed to copy fragment bytes into
// a ROM buffer.  Its build ID, diff grouping and BuildEvent/BuildReport shapes
// match engine/tools/mm_linker.py.

const BUNDLE_SCHEMA = "metalmaxcn.encoded-asset-bundle";
const BUILD_REPORT_SCHEMA = "metalmaxcn.build-report";

const REGION_KINDS = new Set(["header", "prg", "chr"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function compareText(left, right) {
    const a = Array.from(left, character => character.codePointAt(0));
    const b = Array.from(right, character => character.codePointAt(0));
    for (let index = 0; index < Math.min(a.length, b.length); index++) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
}

function identifierRepr(value) {
    if (Array.isArray(value)) return `(${value.map(identifierRepr).join(", ")}${value.length === 1 ? "," : ""})`;
    const quote = value.includes("'") && !value.includes('"') ? '"' : "'";
    let result = quote;
    for (const character of value) {
        const point = character.codePointAt(0);
        if (character === quote || character === "\\") result += "\\" + character;
        else if (character === "\n") result += "\\n";
        else if (character === "\r") result += "\\r";
        else if (character === "\t") result += "\\t";
        else if (character !== " " && /[\p{C}\p{Z}]/u.test(character)) {
            const width = point <= 255 ? 2 : point <= 65535 ? 4 : 8;
            result += "\\" + (width === 2 ? "x" : width === 4 ? "u" : "U") + point.toString(16).padStart(width, "0");
        } else result += character;
    }
    return result + quote;
}

class LinkerError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

class LinkerSchemaError extends LinkerError {}
class RelocationError extends LinkerError {}

const isObject = value => value !== null && typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null);

function strictObject(value, fields, name) {
    if (!isObject(value)) throw new LinkerSchemaError(`${name} must be a JSON object`);
    const actual = Object.keys(value);
    const missing = fields.filter(field => !Object.hasOwn(value, field));
    const unknown = actual.filter(field => !fields.includes(field));
    if (missing.length || unknown.length) {
        const details = [];
        if (missing.length) details.push(`missing ${missing.join(", ")}`);
        if (unknown.length) details.push(`unknown ${unknown.join(", ")}`);
        throw new LinkerSchemaError(`invalid ${name} fields: ${details.join("; ")}`);
    }
    return value;
}

function requireNonempty(value, name) {
    if (typeof value !== "string" || !value.trim()) {
        throw new LinkerSchemaError(`${name} must be a non-empty string`);
    }
    return value;
}

function requireSha256(value, name) {
    if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
        throw new LinkerSchemaError(
            `${name} must be a lowercase SHA-256 hex digest`,
        );
    }
    return value;
}

function requireInteger(value, name, minimum = 0) {
    if (!Number.isSafeInteger(value) || value < minimum) {
        const kind = minimum === 1 ? "positive" : "non-negative";
        throw new LinkerSchemaError(`${name} must be a ${kind} integer`);
    }
    return value;
}

function requirePowerOfTwo(value, name) {
    requireInteger(value, name, 1);
    if (!Number.isSafeInteger(Math.log2(value))) {
        throw new LinkerSchemaError(`${name} must be a power of two`);
    }
    return value;
}

function requireNullableString(value, name) {
    if (value !== null) requireNonempty(value, name);
    return value;
}

function requireNullableInteger(value, name) {
    if (value !== null) requireInteger(value, name);
    return value;
}

function canonicalize(value) {
    if (value === null || typeof value === "string" ||
        typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new LinkerSchemaError("canonical JSON number is not finite");
        return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!isObject(value)) throw new LinkerSchemaError("value is not canonical JSON");
    const result = {};
    for (const key of Object.keys(value).sort(compareText)) {
        if (value[key] === undefined) {
            throw new LinkerSchemaError(
                `canonical JSON field ${JSON.stringify(key)} is undefined`,
            );
        }
        result[key] = canonicalize(value[key]);
    }
    return result;
}

function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
}

function asBytes(value, name, {copy = true} = {}) {
    let bytes;
    if (value instanceof Uint8Array) bytes = value;
    else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
    else if (ArrayBuffer.isView(value)) {
        bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else {
        throw new LinkerSchemaError(`${name} must be an ArrayBuffer or byte view`);
    }
    return copy ? bytes.slice() : bytes;
}

function changedByteCount(before, after) {
    let changed = 0;
    for (let index = 0; index < before.length; index += 1) {
        if (before[index] !== after[index]) changed += 1;
    }
    return changed;
}

function hexToBytes(value, name) {
    if (typeof value !== "string" || value.length % 2 ||
        !/^[0-9a-f]*$/.test(value)) {
        throw new LinkerSchemaError(`${name} must be lowercase hexadecimal bytes`);
    }
    const result = new Uint8Array(value.length / 2);
    for (let index = 0; index < result.length; index += 1) {
        result[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return result;
}

async function sha256Hex(value) {
    if (!globalThis.crypto?.subtle) {
        throw new LinkerError("WebCrypto SHA-256 is unavailable");
    }
    const bytes = asBytes(value, "SHA-256 input", {copy: false});
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function canonicalHash(value) {
    return sha256Hex(new TextEncoder().encode(canonicalJson(value)));
}

function normalizeRegion(input) {
    const value = strictObject(input,
        ["kind", "file_offset", "size", "bank_size"], "ROM region");
    if (!REGION_KINDS.has(value.kind)) {
        throw new LinkerSchemaError(`unsupported ROM region kind ${JSON.stringify(value.kind)}`);
    }
    requireInteger(value.file_offset, "region file_offset");
    requireInteger(value.size, "region size", 1);
    requireInteger(value.bank_size, "region bank_size", 1);
    if (value.size % value.bank_size) {
        throw new LinkerSchemaError(`${value.kind} region size must be divisible by its bank size`);
    }
    return {
        kind: value.kind,
        file_offset: value.file_offset,
        size: value.size,
        bank_size: value.bank_size,
    };
}

function normalizeTarget(input) {
    const value = strictObject(input, [
        "schema", "profile_id", "mapper", "submapper", "regions",
        "baseline_sha256", "build_map_sha256",
    ], "ROM target profile");
    requireNonempty(value.profile_id, "profile_id");
    requireInteger(value.mapper, "mapper");
    if (value.mapper > 0xfff) throw new LinkerSchemaError("mapper must fit the NES 2.0 12-bit field");
    if (value.submapper !== null) {
        requireInteger(value.submapper, "submapper");
        if (value.submapper > 0x0f) throw new LinkerSchemaError("submapper must fit four bits");
    }
    if (!Array.isArray(value.regions)) {
        throw new LinkerSchemaError("target regions must be a JSON array");
    }
    const regions = value.regions.map(normalizeRegion);
    requireSha256(value.baseline_sha256, "baseline_sha256");
    requireSha256(value.build_map_sha256, "build_map_sha256");
    const byKind = new Map(regions.map(region => [region.kind, region]));
    if (regions.length !== 3 || [...REGION_KINDS].some(kind => !byKind.has(kind))) {
        throw new LinkerSchemaError("target profile must define exactly one header, PRG, and CHR region");
    }
    const header = byKind.get("header");
    const prg = byKind.get("prg");
    const chr = byKind.get("chr");
    if (header.file_offset !== 0 || header.size !== 16 || header.bank_size !== 16) {
        throw new LinkerSchemaError("iNES header region must be exactly [0, 16)");
    }
    if (prg.file_offset !== header.file_offset + header.size ||
        chr.file_offset !== prg.file_offset + prg.size) {
        throw new LinkerSchemaError("header, PRG, and CHR regions must be contiguous");
    }
    if (prg.size % (16 * 1024)) {
        throw new LinkerSchemaError("PRG size must use iNES 16 KiB units");
    }
    if (chr.size % (8 * 1024)) {
        throw new LinkerSchemaError("CHR size must use iNES 8 KiB units");
    }
    return {
        schema: value.schema,
        profile_id: value.profile_id,
        mapper: value.mapper,
        submapper: value.submapper,
        regions: regions.sort((left, right) => left.file_offset - right.file_offset),
        baseline_sha256: value.baseline_sha256,
        build_map_sha256: value.build_map_sha256,
    };
}

function normalizeSlot(input) {
    const value = strictObject(input, [
        "slot_id", "region", "file_offset", "capacity", "bank_index",
        "bank_offset", "baseline_bin", "preimage_sha256", "owner",
        "alignment", "fill", "runtime_address", "alias_of", "mirror_of",
        "atomic_group",
    ], "BuildMap slot");
    requireNonempty(value.slot_id, "slot_id");
    if (!REGION_KINDS.has(value.region)) {
        throw new LinkerSchemaError(`unsupported slot region ${JSON.stringify(value.region)}`);
    }
    requireInteger(value.file_offset, "slot file_offset");
    requireInteger(value.capacity, "slot capacity", 1);
    requireInteger(value.bank_index, "slot bank_index");
    requireInteger(value.bank_offset, "slot bank_offset");
    requireNonempty(value.baseline_bin, "slot baseline_bin");
    requireSha256(value.preimage_sha256, "slot preimage_sha256");
    requireNonempty(value.owner, "slot owner");
    requirePowerOfTwo(value.alignment, "slot alignment");
    if (value.fill !== null &&
        (!Number.isInteger(value.fill) || value.fill < 0 || value.fill > 255)) {
        throw new LinkerSchemaError("slot fill must be null or one byte");
    }
    requireNullableInteger(value.runtime_address, "slot runtime_address");
    requireNullableString(value.alias_of, "slot alias_of");
    requireNullableString(value.mirror_of, "slot mirror_of");
    requireNullableString(value.atomic_group, "slot atomic_group");
    if (value.alias_of !== null && value.mirror_of !== null) {
        throw new LinkerSchemaError("a slot cannot be both an alias and a mirror");
    }
    if (value.alias_of === value.slot_id || value.mirror_of === value.slot_id) {
        throw new LinkerSchemaError("a slot cannot refer to itself");
    }
    return {
        slot_id: value.slot_id,
        region: value.region,
        file_offset: value.file_offset,
        capacity: value.capacity,
        bank_index: value.bank_index,
        bank_offset: value.bank_offset,
        baseline_bin: value.baseline_bin,
        preimage_sha256: value.preimage_sha256,
        owner: value.owner,
        alignment: value.alignment,
        fill: value.fill,
        runtime_address: value.runtime_address,
        alias_of: value.alias_of,
        mirror_of: value.mirror_of,
        atomic_group: value.atomic_group,
    };
}

function normalizeBuildMap(input) {
    const value = strictObject(input, ["schema", "target_profile_id", "slots",
        ...(Object.hasOwn(input, "story_farjump") ? ["story_farjump"] : []),
        ...(Object.hasOwn(input, "scene_map_expansion") ? ["scene_map_expansion"] : []),
        ...(Object.hasOwn(input, "application_farjump") ? ["application_farjump"] : []),
        ...(Object.hasOwn(input, 'scene_interaction_transfer') ? ['scene_interaction_transfer'] : []),
        ...(Object.hasOwn(input, "expansion_shared_pool") ? ["expansion_shared_pool"] : [])], "BuildMap");
    requireNonempty(value.target_profile_id, "target_profile_id");
    if (!Array.isArray(value.slots)) throw new LinkerSchemaError("BuildMap slots must be a JSON array");
    const slots = value.slots.map(normalizeSlot);
    const ids = slots.map(slot => slot.slot_id);
    if (new Set(ids).size !== ids.length) {
        throw new LinkerSchemaError("BuildMap slot IDs must be unique");
    }
    return {
        schema: value.schema,
        target_profile_id: value.target_profile_id,
        slots,
        ...(Object.hasOwn(value, "story_farjump") ? {story_farjump: value.story_farjump} : {}),
        ...(Object.hasOwn(value, "scene_map_expansion") ? {scene_map_expansion: value.scene_map_expansion} : {}),
        ...(Object.hasOwn(value, "application_farjump") ? {application_farjump: value.application_farjump} : {}),
        ...(Object.hasOwn(value, 'scene_interaction_transfer') ? {scene_interaction_transfer: value.scene_interaction_transfer} : {}),
        ...(Object.hasOwn(value, "expansion_shared_pool") ? {expansion_shared_pool: value.expansion_shared_pool} : {}),
    };
}

function normalizeRelocation(input) {
    if (!isObject(input) || typeof input.type !== "string") {
        throw new LinkerSchemaError("relocation must be a JSON object with a type");
    }
    if (input.type === "fixed-write") {
        const value = strictObject(input, ["type", "offset", "data_hex"], "fixed-write relocation");
        requireInteger(value.offset, "fixed-write relocation offset");
        const data = hexToBytes(value.data_hex, "fixed-write relocation data_hex");
        if (!data.length) throw new LinkerSchemaError("fixed-write relocation data must be non-empty bytes");
        return {type: "fixed-write", offset: value.offset, data_hex: value.data_hex, data, size: data.length};
    }
    if (input.type === "le16-pointer") {
        const value = strictObject(input,
            ["type", "offset", "target_slot_id", "target_offset", "addend"],
            "LE16 relocation");
        requireInteger(value.offset, "LE16 relocation offset");
        requireNonempty(value.target_slot_id, "LE16 target_slot_id");
        if (typeof value.target_offset === "bigint") {
            if (value.target_offset < 0n) throw new LinkerSchemaError("LE16 target_offset must be a non-negative integer");
        } else requireInteger(value.target_offset, "LE16 target_offset");
        if (typeof value.addend !== "bigint" && !Number.isSafeInteger(value.addend)) {
            throw new LinkerSchemaError("LE16 addend must be an integer");
        }
        return {...value, size: 2};
    }
    throw new LinkerSchemaError(`unsupported relocation type ${JSON.stringify(input.type)}`);
}

function relocationMetadata(relocation) {
    if (relocation.type === "fixed-write") {
        return {type: "fixed-write", offset: relocation.offset, data_hex: relocation.data_hex};
    }
    return {
        type: "le16-pointer",
        offset: relocation.offset,
        target_slot_id: relocation.target_slot_id,
        target_offset: relocation.target_offset,
        addend: relocation.addend,
    };
}

function relocationKey(relocation) {
    const className = relocation.type === "fixed-write"
        ? "FixedWriteRelocation" : "LE16PointerRelocation";
    return [relocation.offset, className, canonicalJson(relocationMetadata(relocation))];
}

function compareTuple(left, right) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        if (typeof left[index] === "string" && typeof right[index] === "string") {
            const compared = compareText(left[index], right[index]);
            if (compared) return compared;
            continue;
        }
        if (left[index] < right[index]) return -1;
        if (left[index] > right[index]) return 1;
    }
    return 0;
}

function normalizeRelocations(input, payloadLength, {sort = true} = {}) {
    if (!Array.isArray(input)) {
        throw new LinkerSchemaError("fragment relocations must be an array");
    }
    const relocations = input.map(normalizeRelocation);
    if (sort) relocations.sort((left, right) => compareTuple(relocationKey(left), relocationKey(right)));
    const ranges = relocations.map(item => [item.offset, item.offset + item.size])
        .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
    for (const [start, end] of ranges) {
        if (end > payloadLength) {
            throw new LinkerSchemaError(`relocation at ${start} exceeds fragment payload`);
        }
    }
    for (let index = 1; index < ranges.length; index += 1) {
        if (ranges[index][0] < ranges[index - 1][1]) {
            throw new LinkerSchemaError("fragment relocations may not overlap");
        }
    }
    return relocations;
}

function applyRelocations(fragment, slots) {
    const payload = fragment.payload.slice();
    for (const relocation of fragment.relocations) {
        if (relocation.type === "fixed-write") {
            payload.set(relocation.data, relocation.offset);
            continue;
        }
        const target = slots.get(relocation.target_slot_id);
        if (!target) {
            throw new RelocationError(
                `LE16 relocation targets unknown slot ${identifierRepr(relocation.target_slot_id)}`,
            );
        }
        if (typeof target.runtime_address !== "bigint" && !Number.isSafeInteger(target.runtime_address)) {
            throw new RelocationError(`slot ${identifierRepr(target.slot_id)} has no runtime address`);
        }
        if (relocation.target_offset >= target.capacity) {
            throw new RelocationError(
                `LE16 target offset escapes slot ${identifierRepr(target.slot_id)}`,
            );
        }
        const value = BigInt(target.runtime_address) + BigInt(relocation.target_offset) + BigInt(relocation.addend);
        if (value < 0n || value > 0xffffn) {
            throw new RelocationError("LE16 relocation result does not fit 16 bits");
        }
        payload[relocation.offset] = Number(value & 0xffn);
        payload[relocation.offset + 1] = Number(value >> 8n);
    }
    return payload;
}

// 比较与写入须共用重定位解析，解析结果不得修改传入的片段。
function resolveFragmentPayload({payload, relocations, slots}) {
    const bytes = asBytes(payload, "fragment payload");
    return applyRelocations({payload: bytes, relocations: normalizeRelocations(relocations, bytes.length, {sort: false})},
        slots instanceof Map ? slots : new Map(slots));
}

async function normalizeFragment(input) {
    const allowed = [
        "asset_id", "fragment_id", "slot_id", "payload", "payload_hex",
        "payload_sha256", "codec", "codec_version", "alignment", "relocations", "offset_in_slot", "instruction_boundaries",
    ];
    if (!isObject(input)) throw new LinkerSchemaError("fragment must be an object");
    const actual = Object.keys(input);
    const required = allowed.filter(field => !["payload", "payload_hex", "offset_in_slot", "instruction_boundaries"].includes(field));
    const missing = required.filter(field => !Object.hasOwn(input, field));
    const unknown = actual.filter(field => !allowed.includes(field));
    const payloadFields = ["payload", "payload_hex"].filter(field => Object.hasOwn(input, field));
    if (missing.length || unknown.length || payloadFields.length !== 1) {
        throw new LinkerSchemaError("invalid encoded fragment fields");
    }
    if (Object.hasOwn(input, "offset_in_slot")) requireInteger(input.offset_in_slot, "fragment offset_in_slot");
    if (Object.hasOwn(input, "instruction_boundaries") && (!Array.isArray(input.instruction_boundaries)
        || input.instruction_boundaries.some(cursor => !Number.isSafeInteger(cursor) || cursor < 0 || cursor > 255))) {
        throw new LinkerSchemaError("fragment instruction_boundaries must contain byte cursors");
    }
    requireNonempty(input.asset_id, "fragment asset_id");
    requireNonempty(input.fragment_id, "fragment_id");
    requireNonempty(input.slot_id, "fragment slot_id");
    const payload = Object.hasOwn(input, "payload")
        ? asBytes(input.payload, "fragment payload")
        : hexToBytes(input.payload_hex, "fragment payload_hex");
    requireSha256(input.payload_sha256, "fragment payload_sha256");
    if (await sha256Hex(payload) !== input.payload_sha256) {
        throw new LinkerSchemaError(`fragment ${input.asset_id}/${input.fragment_id} payload hash mismatch`);
    }
    requireNonempty(input.codec, "fragment codec");
    requireNonempty(input.codec_version, "fragment codec_version");
    requirePowerOfTwo(input.alignment, "fragment alignment");
    const relocations = normalizeRelocations(input.relocations, payload.length);
    return {
        asset_id: input.asset_id,
        fragment_id: input.fragment_id,
        slot_id: input.slot_id,
        payload,
        payload_sha256: input.payload_sha256,
        ...(Object.hasOwn(input, "offset_in_slot") ? {offset_in_slot: input.offset_in_slot} : {}),
        ...(Object.hasOwn(input, "instruction_boundaries") ? {instruction_boundaries: [...input.instruction_boundaries]} : {}),
        codec: input.codec,
        codec_version: input.codec_version,
        alignment: input.alignment,
        relocations,
    };
}

function fragmentMetadata(fragment) {
    return {
        asset_id: fragment.asset_id,
        fragment_id: fragment.fragment_id,
        slot_id: fragment.slot_id,
        payload_sha256: fragment.payload_sha256,
        encoded_length: fragment.payload.length,
        ...(Object.hasOwn(fragment, "offset_in_slot") ? {offset_in_slot: fragment.offset_in_slot} : {}),
        ...(Object.hasOwn(fragment, "instruction_boundaries") ? {instruction_boundaries: fragment.instruction_boundaries} : {}),
        codec: fragment.codec,
        codec_version: fragment.codec_version,
        alignment: fragment.alignment,
        relocations: fragment.relocations.map(relocationMetadata),
    };
}

async function normalizeBundle(input) {
    const value = strictObject(input,
        ["schema", "asset_id", "encoder", "encoder_version", "input_sha256", "fragments"],
        "encoded asset bundle");
    requireNonempty(value.asset_id, "bundle asset_id");
    requireNonempty(value.encoder, "bundle encoder");
    requireNonempty(value.encoder_version, "bundle encoder_version");
    requireSha256(value.input_sha256, "bundle input_sha256");
    if (!Array.isArray(value.fragments)) throw new LinkerSchemaError("bundle fragments must be an array");
    const fragments = [];
    for (const fragment of value.fragments) fragments.push(await normalizeFragment(fragment));
    const ids = fragments.map(fragment => fragment.fragment_id);
    if (new Set(ids).size !== ids.length) {
        throw new LinkerSchemaError("fragment IDs must be unique within an asset");
    }
    if (fragments.some(fragment => fragment.asset_id !== value.asset_id)) {
        throw new LinkerSchemaError("every fragment asset_id must match its enclosing bundle");
    }
    fragments.sort((left, right) => compareText(left.fragment_id, right.fragment_id));
    const normalized = {
        schema: value.schema,
        asset_id: value.asset_id,
        encoder: value.encoder,
        encoder_version: value.encoder_version,
        input_sha256: value.input_sha256,
        fragments,
    };
    normalized.metadata = bundleMetadata(normalized);
    normalized.output_sha256 = await canonicalHash(normalized.metadata);
    return normalized;
}

function bundleMetadata(bundle) {
    return {
        schema: bundle.schema,
        asset_id: bundle.asset_id,
        encoder: bundle.encoder,
        encoder_version: bundle.encoder_version,
        input_sha256: bundle.input_sha256,
        fragments: bundle.fragments.map(fragmentMetadata),
    };
}

function slotEnd(slot) {
    return slot.file_offset + slot.capacity;
}

function relationshipRoot(slot) {
    return slot.alias_of || slot.mirror_of || slot.slot_id;
}

function arrayUniqueSorted(values) {
    return [...new Set(values)].sort(compareText);
}

class RomLinker {
    static originalRom(source, originalPrgBytes) {
        const prgBytes = source[4] * 16384;
        const rom = new Uint8Array(source.length - prgBytes + originalPrgBytes);
        rom.set(source.subarray(0, 16 + originalPrgBytes));
        rom[4] = originalPrgBytes / 16384;
        rom.set(source.subarray(16 + prgBytes), 16 + originalPrgBytes);
        return rom;
    }

    static applyFragments(source, {header, fragments}) {
        const rom = source.slice();
        rom.set(header);
        for (const {offset, bytes} of fragments) rom.set(bytes, offset);
        return rom;
    }

    static expandRom(source, {header, originalPrgBytes, expandedPrgBytes, fragments}) {
        const rom = new Uint8Array(source.length + expandedPrgBytes - originalPrgBytes);
        rom.fill(0xFF);
        rom.set(header);
        rom.set(source.subarray(16, 16 + originalPrgBytes), 16);
        rom.set(source.subarray(16 + originalPrgBytes), 16 + expandedPrgBytes);
        for (const {offset, bytes} of fragments) rom.set(bytes, offset);
        return rom;
    }

    static async create({baseline, target, buildMap}) {
        const linker = new RomLinker(
            asBytes(baseline, "baseline"),
            normalizeTarget(target),
            normalizeBuildMap(buildMap),
        );
        // 写入前的目标、映射与原像校验由构建入口完成。
        linker.buildMapSha256 = linker.target.build_map_sha256 ?? null;
        linker.baselineSha256 = await sha256Hex(linker.baseline);
        return linker;
    }

    constructor(baseline, target, buildMap) {
        this.baseline = baseline;
        this.target = target;
        this.buildMap = buildMap;
        this.slots = new Map(buildMap.slots.map(slot => [slot.slot_id, slot]));
        this.targetProfileSha256 = null;
        this.buildMapSha256 = null;
        this.baselineSha256 = null;
    }

    async link(bundleInputs, {onEvent = null} = {}) {
        if (!bundleInputs || typeof bundleInputs[Symbol.iterator] !== "function") {
            throw new LinkerSchemaError("bundles must be iterable");
        }
        const bundles = [];
        for (const input of bundleInputs) bundles.push(await normalizeBundle(input));
        bundles.sort((left, right) => compareText(left.asset_id, right.asset_id));
        const assetIds = bundles.map(bundle => bundle.asset_id);
        if (new Set(assetIds).size !== assetIds.length) {
            throw new LinkerSchemaError("bundle asset IDs must be globally unique");
        }
        const buildId = await this.buildId(bundles);
        const fragments = bundles.flatMap(bundle => bundle.fragments)
            .sort((left, right) => compareText(left.asset_id, right.asset_id) ||
                compareText(left.fragment_id, right.fragment_id));
        const keys = fragments.map(fragment => canonicalJson([
            fragment.asset_id,
            fragment.fragment_id,
        ]));
        if (new Set(keys).size !== keys.length) {
            throw new LinkerSchemaError("fragment identity must be globally unique");
        }
        const resolved = fragments.map(fragment => this.resolveFragment(fragment));
        const planned = this.planWrites(resolved);

        const events = [];
        const progressCurrent = new Map();
        const progressTotal = new Map([
            ["compile", bundles.length],
            ["map", fragments.length],
            ["link", planned.length],
            ["finalize", 1],
        ]);
        const append = async values => {
            const event = {
                build_id: buildId,
                sequence: events.length + 1,
                ...values,
                elapsed_ms: 0,
            };
            events.push(event);
            const current = (progressCurrent.get(event.stage) || 0) + 1;
            progressCurrent.set(event.stage, current);
            if (onEvent) await onEvent({
                ...event,
                progress_current: current,
                progress_total: progressTotal.get(event.stage) || current,
            });
        };
        for (const bundle of bundles) {
            await append({
                stage: "compile",
                event_type: "bundle-ready",
                status: bundle.fragments.length ? "success" : "skipped-clean",
                asset_id: bundle.asset_id,
                encoder: bundle.encoder,
                encoder_version: bundle.encoder_version,
                input_sha256: bundle.input_sha256,
                output_sha256: bundle.output_sha256,
                message: `${bundle.fragments.length} encoded fragment(s)`,
            });
        }
        for (const fragment of fragments) {
            const slot = this.slots.get(fragment.slot_id);
            const event = {
                stage: "map",
                event_type: "fragment-mapped",
                status: "mapped",
                asset_id: fragment.asset_id,
                fragment_id: fragment.fragment_id,
                slot_id: slot.slot_id,
                region: slot.region,
                bank_index: slot.bank_index,
                baseline_bin: slot.baseline_bin,
                bank_offset: slot.bank_offset + (fragment.offset_in_slot ?? 0),
                file_offset: slot.file_offset + (fragment.offset_in_slot ?? 0),
                encoded_length: fragment.payload.length,
                capacity: slot.capacity,
                relocation_count: fragment.relocations.length,
                output_sha256: fragment.payload_sha256,
            };
            if (slot.atomic_group !== null) event.atomic_group = slot.atomic_group;
            await append(event);
        }

        const output = this.baseline.slice();
        for (const write of planned) {
            const start = write.slot.file_offset + (write.offset_in_slot ?? 0);
            output.set(write.data, start);
            const before = this.baseline.subarray(
                start,
                start + write.data.length,
            );
            const localChanged = changedByteCount(before, write.data);
            const event = {
                stage: "link",
                event_type: "slot-linked",
                status: localChanged ? "written" : "skipped-identical",
                asset_id: write.asset_ids[0],
                fragment_id: write.fragment_ids[0],
                slot_id: write.slot.slot_id,
                related_asset_ids: [...write.asset_ids],
                related_fragment_ids: [...write.fragment_ids],
                related_slot_ids: [...write.slot_ids],
                region: write.slot.region,
                bank_index: write.slot.bank_index,
                baseline_bin: write.slot.baseline_bin,
                bank_offset: write.slot.bank_offset + (write.offset_in_slot ?? 0),
                file_offset: start,
                encoded_length: write.encoded_length,
                capacity: write.slot.capacity,
                attempted_bytes: write.data.length,
                changed_bytes: localChanged,
            };
            if (write.slot.atomic_group !== null) {
                event.atomic_group = write.slot.atomic_group;
            }
            await append(event);
        }
        const diffs = await this.buildDiffs(planned, output);
        const changedBytes = diffs.reduce((sum, diff) => sum + diff.length, 0);
        const outputSha256 = await sha256Hex(output);
        await append({
            stage: "finalize",
            event_type: "build-finalized",
            status: "success",
            output_sha256: outputSha256,
            changed_bytes: changedBytes,
        });
        const report = {
            schema: BUILD_REPORT_SCHEMA,
            build_id: buildId,
            target_profile_id: this.target.profile_id,
            target_profile_sha256: this.targetProfileSha256,
            build_map_sha256: this.buildMapSha256,
            baseline_sha256: this.baselineSha256,
            output_sha256: outputSha256,
            changed_bytes: changedBytes,
            diffs,
            events,
        };
        return {rom: output, report};
    }

    resolveFragment(fragment) {
        const payload = applyRelocations(fragment, this.slots);
        return {fragment, slot: this.slots.get(fragment.slot_id), payload};
    }

    planWrites(resolved) {
        const sourcesByRoot = new Map();
        for (const item of resolved) {
            const root = relationshipRoot(item.slot);
            if (!sourcesByRoot.has(root)) sourcesByRoot.set(root, []);
            sourcesByRoot.get(root).push(item);
        }
        const membersByRoot = new Map();
        for (const slot of this.buildMap.slots) {
            const root = relationshipRoot(slot);
            if (!membersByRoot.has(root)) membersByRoot.set(root, []);
            membersByRoot.get(root).push(slot);
        }
        const writes = [];
        for (const rootId of [...sourcesByRoot.keys()].sort(compareText)) {
            const sources = sourcesByRoot.get(rootId).sort((left, right) =>
                compareText(left.fragment.asset_id, right.fragment.asset_id) ||
                compareText(left.fragment.fragment_id, right.fragment.fragment_id));
            if (sources.some(item => item.fragment.offset_in_slot !== undefined)) {
                const byOffset = new Map();
                for (const item of sources) {
                    const offset = item.fragment.offset_in_slot;
                    const same = byOffset.get(offset);
                    if (!same) byOffset.set(offset, [item]); else same.push(item);
                }
                const spans = [...byOffset.entries()].sort((a, b) => a[0] - b[0]);
                const physical = new Map();
                for (const slot of membersByRoot.get(rootId)) {
                    const key = canonicalJson([slot.file_offset, slot.capacity]);
                    if (!physical.has(key)) physical.set(key, []);
                    physical.get(key).push(slot);
                }
                for (const slots of physical.values()) for (const [offset, items] of spans) {
                    writes.push({slot: slots[0], offset_in_slot: offset, data: items[0].payload,
                        encoded_length: items[0].payload.length,
                        asset_ids: arrayUniqueSorted(items.map(item => item.fragment.asset_id)),
                        fragment_ids: arrayUniqueSorted(items.map(item => item.fragment.fragment_id)),
                        slot_ids: slots.map(slot => slot.slot_id).sort(compareText)});
                }
                continue;
            }
            const payload = sources[0].payload;
            const members = membersByRoot.get(rootId).sort((left, right) =>
                left.file_offset - right.file_offset || compareText(left.slot_id, right.slot_id));
            const byRange = new Map();
            for (const member of members) {
                const key = canonicalJson([member.file_offset, member.capacity]);
                if (!byRange.has(key)) byRange.set(key, []);
                byRange.get(key).push(member);
            }
            const ranges = [...byRange.values()].sort((left, right) =>
                left[0].file_offset - right[0].file_offset ||
                left[0].capacity - right[0].capacity);
            for (const physicalMembers of ranges) {
                const representative = physicalMembers[0];
                const data = this.renderSlot(representative, payload);
                writes.push({
                    slot: representative,
                    data,
                    encoded_length: payload.length,
                    asset_ids: arrayUniqueSorted(sources.map(item => item.fragment.asset_id)),
                    fragment_ids: arrayUniqueSorted(sources.map(item => item.fragment.fragment_id)),
                    slot_ids: physicalMembers.map(item => item.slot_id).sort(compareText),
                });
            }
        }
        return writes.sort((left, right) =>
            left.slot.file_offset + (left.offset_in_slot ?? 0) - right.slot.file_offset - (right.offset_in_slot ?? 0) ||
            compareText(left.slot.slot_id, right.slot.slot_id));
    }

    renderSlot(slot, payload) {
        const result = new Uint8Array(slot.capacity);
        result.set(payload);
        if (slot.fill === null) {
            result.set(this.baseline.subarray(
                slot.file_offset + payload.length,
                slotEnd(slot),
            ), payload.length);
        } else {
            result.fill(slot.fill, payload.length);
        }
        return result;
    }

    async buildDiffs(planned, linked) {
        const diffs = [];
        for (const write of planned) {
            const start = write.slot.file_offset + (write.offset_in_slot ?? 0);
            const before = this.baseline.subarray(start, start + write.data.length);
            const after = linked.subarray(start, start + write.data.length);
            let cursor = 0;
            while (cursor < before.length) {
                while (cursor < before.length && before[cursor] === after[cursor]) cursor += 1;
                if (cursor === before.length) break;
                const runStart = cursor;
                while (cursor < before.length && before[cursor] !== after[cursor]) cursor += 1;
                diffs.push({
                    region: write.slot.region,
                    bank_index: write.slot.bank_index,
                    baseline_bin: write.slot.baseline_bin,
                    file_offset: start + runStart,
                    bank_offset: write.slot.bank_offset + (write.offset_in_slot ?? 0) + runStart,
                    length: cursor - runStart,
                    before_sha256: await sha256Hex(before.subarray(runStart, cursor)),
                    after_sha256: await sha256Hex(after.subarray(runStart, cursor)),
                    asset_ids: [...write.asset_ids],
                    fragment_ids: [...write.fragment_ids],
                    slot_ids: [...write.slot_ids],
                });
            }
        }
        return diffs;
    }

    async buildId(bundles) {
        return canonicalHash({
            schema: "metalmaxcn.deterministic-build-id",
            target_profile_sha256: this.targetProfileSha256,
            build_map_sha256: this.buildMapSha256,
            baseline_sha256: this.baselineSha256,
            bundles: bundles.map(bundle => bundle.metadata),
        });
    }
}

async function linkRom(baseline, target, buildMap, bundles, options = {}) {
    const linker = await RomLinker.create({baseline, target, buildMap});
    return linker.link(bundles, options);
}

// @editor-module 按发布清单的内容摘要缓存解析正文与构建二进制。

const DATABASE_NAME = "metalmaxcn-package-cache";
const STORE_NAME = "files";
const SHA256 = /^[0-9a-f]{64}$/;
const packageRoot = siteUrl("package/");
const reads = new Map();
let manifestPromise;
let digestPromise;
let databasePromise;
let clearGeneration = 0;

function announceChange() {
  if (typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent?.(new CustomEvent("mmeditor:package-cache-change"));
  }
}

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {resolve(null); return;}
      let failed = false;
      const request = globalThis.indexedDB.open(DATABASE_NAME);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, {keyPath: "url"});
      request.onerror = () => {failed = true; reject(request.error);};
      request.onblocked = () => {failed = true; reject(new Error("运行包缓存被其他标签页占用"));};
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {db.close(); return;}
        db.onversionchange = () => {db.close(); databasePromise = null;};
        resolve(db);
      };
    }).catch(() => null);
  }
  return databasePromise;
}

async function transact(mode, operation) {
  const db = await database();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || new Error("运行包缓存操作失败"));
    transaction.onerror = () => {};
  });
}

const fileUrl$1 = path => `${packageRoot}${String(path).split("/").map(encodeURIComponent).join("/")}`;
const cacheKey = path => new URL(fileUrl$1(path), globalThis.location?.href || "http://localhost/").href;

async function updateFile(url, record) {
  return transact('readwrite', store => {
    const summary = store.get(cacheKey(''));
    summary.onsuccess = () => {
      const sizes = summary.result?.sizes || {};
      if (record) sizes[url] = record.byte_length;
      else delete sizes[url];
      store.put({url: cacheKey(''), sizes});
    };
    return record ? store.put(record) : store.delete(url);
  });
}

async function rateLimited(response) {
  if (response.status === 429) return true;
  if (response.status !== 403) return false;
  if (response.headers.has("Retry-After") || response.headers.get("X-RateLimit-Remaining") === "0") return true;
  return /rate[\s-]*limit|too many requests|abuse detection/i.test(await response.text());
}

function retryDelay(response, attempt) {
  let serverDelay = null;
  const after = response?.headers.get("Retry-After");
  if (after?.trim()) {
    const seconds = Number(after);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(after) - Date.now();
    if (Number.isFinite(delay)) serverDelay = Math.max(0, delay);
  }
  if (response?.headers.get("X-RateLimit-Remaining") === "0") {
    const reset = response.headers.get("X-RateLimit-Reset");
    if (reset?.trim()) {
      const delay = Number(reset) * 1000 - Date.now();
      if (Number.isFinite(delay)) serverDelay = Math.max(serverDelay || 0, delay, 0);
    }
  }
  const base = response && serverDelay === null ? 60000 : 1000;
  const backoff = Math.min(300000, base * 2 ** Math.min(attempt - 1, 9));
  return Math.max(serverDelay || 0, backoff) + Math.floor(Math.random() * backoff * 0.2);
}

async function waitForRetry(delay) {
  const deadline = Date.now() + delay;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, Math.min(deadline - Date.now(), 2147483647)));
  }
}

async function networkFile(path, priority) {
  let attempt = 0;
  let task;
  let complete = false;
  try {
    for (;;) {
      let response;
      let reason;
      try {
        response = await fetch(fileUrl$1(path), {priority, cache: "no-cache"});
        if (response.ok) {
          const bytes = await response.arrayBuffer();
          complete = true;
          return bytes;
        }
        if (!await rateLimited(response)) throw new Error(`${path}: HTTP ${response.status}`);
        reason = `HTTP ${response.status}`;
      } catch (error) {
        if (!["TypeError", "NetworkError", "AbortError"].includes(error?.name)) throw error;
        response = null;
        reason = error.message;
      }
      const delay = retryDelay(response, ++attempt);
      const entry = {source: "数据下载", level: "debug", message: `等待重试（${Math.ceil(delay / 1000)} 秒）`,
        details: {path, attempt, reason, delay_ms: delay}};
      if (!task) task = editorLog.startTask(entry);
      else task.update(entry);
      await waitForRetry(delay);
      task.update({message: "重试下载"});
    }
  } finally {
    task?.finish({level: "debug", message: complete ? "下载完成" : "下载结束"});
  }
}

const parseJson = bytes => JSON.parse(new globalThis.TextDecoder("utf-8", {fatal: true}).decode(bytes));

// 解析正文的相同子树共享引用，IndexedDB 保留共享关系，读取边界负责冻结。
function shareParsedJson(value) {
  const nodes = new Map();
  const visit = value => {
    if (!value || typeof value !== "object") {
      const token = Object.is(value, -0) ? [-1]
        : typeof value === "number" && !Number.isFinite(value) ? [String(value)] : value;
      return {value, token};
    }
    const array = Array.isArray(value);
    const members = [];
    for (const key of Object.keys(value)) {
      const child = visit(value[key]);
      value[key] = child.value;
      members.push(array ? child.token : [key, child.token]);
    }
    const key = JSON.stringify([array, members]);
    let node = nodes.get(key);
    if (!node) {
      node = {value, token: [nodes.size]};
      nodes.set(key, node);
    }
    return node;
  };
  return visit(value).value;
}

function readPackageManifest(priority = "high") {
  if (!manifestPromise) {
    manifestPromise = networkFile("manifest.json", priority).then(parseJson);
    manifestPromise.catch(() => {manifestPromise = null; digestPromise = null;});
  }
  return manifestPromise;
}

function manifestDigests(manifest) {
  const digests = new Map();
  const add = (path, digest) => {
    if (typeof path !== "string" || !path || typeof digest !== "string" || !SHA256.test(digest)) {
      throw new Error(`${path}: 运行包文件摘要无效`);
    }
    if (digests.has(path) && digests.get(path) !== digest) {
      throw new Error(`${path}: 运行包清单的文件摘要冲突`);
    }
    digests.set(path, digest);
  };
  if (manifest.package_file_sha256) {
    for (const [path, digest] of Object.entries(manifest.package_file_sha256)) add(path, digest);
  } else {
    const visit = value => {
      if (!value || typeof value !== "object") return;
      if (value.path && value.sha256) add(value.path, value.sha256);
      for (const child of Object.values(value)) visit(child);
    };
    visit(manifest);
  }
  return digests;
}

async function loadFile(path, priority) {
  const generation = clearGeneration;
  const digests = await (digestPromise ||= readPackageManifest(priority).then(manifestDigests));
  const digest = digests.get(path);
  const json = String(path).toLowerCase().endsWith(".json");
  const url = cacheKey(path);
  let cached;
  if (digest) try {cached = await transact("readonly", store => store.get(url));} catch (_) {}
  if (cached) {
    if (cached.sha256 === digest && cached.bytes instanceof Blob
        && cached.byte_length === cached.bytes.size) {
      if (json && Object.hasOwn(cached, "value")) return cached;
      if (!json) try {
        const bytes = await cached.bytes.arrayBuffer();
        if (await sha256Hex(new Uint8Array(bytes)) === digest) return {...cached, bytes};
      } catch (_) {}
    }
    try {await updateFile(url, null); announceChange();} catch (_) {}
  }
  const bytes = await networkFile(path, priority);
  if (digest && await sha256Hex(new Uint8Array(bytes)) !== digest) {
    throw new Error(`${path}: 运行包文件 SHA-256 与清单不符`);
  }
  const record = {url, sha256: digest, bytes: new Blob([bytes]), byte_length: bytes.byteLength,
    ...(json ? {value: shareParsedJson(parseJson(bytes))} : {})};
  if (digest && generation === clearGeneration) {
    try {
      const stored = await updateFile(url, record);
      if (stored !== null) announceChange();
    } catch (_) {}
  }
  return {...record, bytes};
}

function readFile(path, priority) {
  let pending = reads.get(path);
  if (!pending) {
    pending = loadFile(path, priority);
    reads.set(path, pending);
    const release = () => {if (reads.get(path) === pending) reads.delete(path);};
    pending.then(release, release);
  }
  return pending;
}

function readPackageJson$1(path, priority = "high") {
  if (path === "manifest.json") return readPackageManifest(priority);
  return readFile(path, priority).then(record => {
    if (!Object.hasOwn(record, "value")) throw new Error(`${path}: 正文不是 JSON`);
    return record.value;
  });
}

function readPackageBytes(path, priority = "high") {
  return readFile(path, priority).then(async record => {
    const bytes = record.bytes instanceof Blob ? await record.bytes.arrayBuffer() : record.bytes;
    return bytes.slice(0);
  });
}

function scopeRange() {
  const prefix = new URL(packageRoot, globalThis.location?.href || "http://localhost/").href;
  return globalThis.IDBKeyRange.bound(prefix, `${prefix}\uffff`);
}

async function packageCacheStats() {
  const summary = await transact('readonly', store => store.get(cacheKey('')));
  const count = await transact('readonly', store => store.count(scopeRange()));
  if (count === null) return null;
  let sizes = summary?.sizes;
  if (!sizes || Object.keys(sizes).length !== count - (summary ? 1 : 0)) {
    await transact('readwrite', store => {
      const records = store.getAll(scopeRange());
      records.onsuccess = () => {
        sizes = Object.fromEntries(records.result.filter(row => row.url !== cacheKey(''))
          .map(row => [row.url, Number(row.byte_length) || 0]));
        store.put({url: cacheKey(''), sizes});
      };
      return records;
    });
  }
  return {entries: Object.keys(sizes).length,
    bytes: Object.values(sizes).reduce((sum, size) => sum + size, 0)};
}

async function deletePackageCache() {
  clearGeneration += 1;
  reads.clear();
  await transact("readwrite", store => store.delete(scopeRange()));
  announceChange();
}

// @editor-module 封装静态包 JSON 读取和文件、图片 URL。
// 非构建页面读取静态资产包的唯一入口：页面不自行拼接资源路径；`.bin` 只由构建流程经 `build-package-io.js` 读取；
// 缺少像素投影时显示不可用状态，不回退读取 layout、region、pattern 或 bank 二进制。
//
// 架构约束（见 docs/metalmaxcn_project.md 「预览／媒体与数值」第 2 条）：
// 视图不得自行拼接资源路径，一律经过本模块；`.bin` 只经构建路径读取。


let valueOperations;
const jsonOperations = () => valueOperations ||= Promise.resolve().then(function () { return projectStoreValues; });

const fileUrl = path => {
    const value = String(path);
    const pathname = value.split(/[?#]/, 1)[0];
    if (pathname.toLowerCase().endsWith(".bin")) {
        throw new Error(`${path}: .bin package inputs are build-only`);
    }
    return siteUrl(`package/${value.split("/").map(encodeURIComponent).join("/")}`);
};

const visualUrl = (path) => fileUrl(`game/visuals/${path}`);

const prefetched = new Map();
const pendingReads = new Map();
const backgroundQueue = new Set();
let backgroundActive = 0;
let prefetchVersion = 0;
const packagePrefetchVersion = () => prefetchVersion;

async function fetchPackageJson(path, priority) {
    fileUrl(path);
    const task = priority === "low" ? editorLog.startTask({source: "后台准备", message: "预取数据", details: path}) : null;
    try {
        const value = await readPackageJson$1(path, priority);
        task?.finish({level: "debug", message: "预取完成"});
        return value;
    } catch (error) {
        if (task) task.finish({level: "error", message: `预取失败：${path}`, error});
        else editorLog.error("资源载入", `载入失败：${path}`, error);
        throw error;
    }
}

function readPackageJson(path, priority = "high") {
    let pending = pendingReads.get(path);
    if (!pending) {
        pending = fetchPackageJson(path, priority).then(async value =>
            (await jsonOperations()).freezeValidatedJson(value));
        pendingReads.set(path, pending);
        const release = () => {if (pendingReads.get(path) === pending) pendingReads.delete(path);};
        pending.catch(release);
    }
    return pending;
}

function drainBackgroundReads() {
    while (backgroundActive < 2 && backgroundQueue.size) {
        const job = backgroundQueue.values().next().value;
        backgroundQueue.delete(job);
        void job.start(true);
    }
}

function prefetchPackageJson(path, {background = false} = {}) {
    let job = prefetched.get(path);
    if (!job) {
        job = {started: false};
        job.promise = new Promise((resolve, reject) => {
            job.start = async backgroundRead => {
                if (job.started) return;
                job.started = true;
                backgroundQueue.delete(job);
                if (backgroundRead) backgroundActive += 1;
                try {
                    const value = await readPackageJson(path, backgroundRead ? "low" : "high");
                    resolve((await jsonOperations()).freezeValidatedJson(value));
                } catch (error) {
                    reject(error);
                } finally {
                    if (backgroundRead) {
                        backgroundActive -= 1;
                        drainBackgroundReads();
                    }
                }
            };
            job.cancel = () => {
                if (job.started) return;
                job.started = true;
                backgroundQueue.delete(job);
                reject(new Error(`${path}: 静态预取已失效`));
            };
        });
        prefetched.set(path, job);
        job.promise.catch(() => {if (prefetched.get(path) === job) prefetched.delete(path);});
        if (background) {
            backgroundQueue.add(job);
            queueMicrotask(drainBackgroundReads);
        } else void job.start();
    } else if (!background) void job.start();
    return job.promise;
}

function discardPackagePrefetch(path) {
    prefetchVersion += 1;
    if (path === undefined) {
        pendingReads.clear();
        for (const job of prefetched.values()) job.cancel();
        prefetched.clear();
    } else {
        pendingReads.delete(path);
        prefetched.get(path)?.cancel();
        prefetched.delete(path);
    }
}

function packageJson(path) {
    const job = prefetched.get(path);
    if (job) void job.start();
    return (job ? job.promise : readPackageJson(path)).then(async value =>
        (await jsonOperations()).cloneValidatedJson(value));
}

function readonlyPackageJson(path) {
    const job = prefetched.get(path);
    if (!job) return readPackageJson(path);
    void job.start();
    return job.promise;
}

// @editor-module 实现 JSON 默认值与稀疏覆盖、选择性重置和仓库纯值操作。
// Pure value semantics for the browser project repository.
//
// This module deliberately has no DOM, IndexedDB, or Node dependency.  It is
// shared by the IndexedDB adapter and by the contract tests.  Persistent asset
// values are JSON only; MISSING exists solely while comparing object members.

const MISSING = Symbol.for("metalmaxcn.project-store.missing");

const hasOwn = (value, key) =>
    Object.prototype.hasOwnProperty.call(value, key);
const frozenValidatedNodes = new WeakSet();
const isFrozenValidatedJson = value => value !== null && typeof value === "object"
    && frozenValidatedNodes.has(value);

function isPlainJsonObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function jsonPath(parts) {
    return "$" + parts.map(part => "/" + escapeJsonPointerToken(part)).join("");
}

function assertJsonNode(value, path, ancestors, label) {
    const at = () => label + jsonPath(path).slice(1);
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new TypeError(`${at()}: JSON numbers must be finite`);
        return !Object.is(value, -0);
    }
    if (value === MISSING) throw new TypeError(`${at()}: MISSING is comparison state, not JSON`);
    if (typeof value !== "object") throw new TypeError(`${at()}: value is not JSON-compatible`);
    if (frozenValidatedNodes.has(value)) return true;
    if (ancestors.has(value)) throw new TypeError(`${at()}: cyclic JSON value`);
    ancestors.add(value);
    let immutable = Object.isFrozen(value);
    if (Array.isArray(value)) {
        immutable = immutable && Object.getPrototypeOf(value) === Array.prototype
            && Reflect.ownKeys(value).length === value.length + 1;
        for (let index = 0; index < value.length; index += 1) {
            if (!hasOwn(value, index)) throw new TypeError(`${at()}/${index}: sparse arrays cannot represent MISSING`);
            path.push(String(index));
            immutable = assertJsonNode(value[index], path, ancestors, label) && immutable;
            path.pop();
        }
    } else {
        if (!isPlainJsonObject(value)) throw new TypeError(`${at()}: only plain JSON objects are allowed`);
        const keys = Reflect.ownKeys(value);
        immutable = immutable && Object.getPrototypeOf(value) === Object.prototype
            && !keys.includes("__proto__");
        if (keys.some(key => typeof key === "symbol")) throw new TypeError(`${at()}: symbol keys are not JSON-compatible`);
        for (const key of keys) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (!descriptor.enumerable || !("value" in descriptor)) throw new TypeError(
                `${at()}/${escapeJsonPointerToken(key)}: JSON properties must be enumerable data properties`,
            );
            path.push(key);
            immutable = assertJsonNode(descriptor.value, path, ancestors, label) && immutable;
            path.pop();
        }
    }
    ancestors.delete(value);
    if (immutable) frozenValidatedNodes.add(value);
    return immutable;
}

function assertJsonValue(value, label = "$") {
    assertJsonNode(value, [], new Set(), label);
    return value;
}

function cloneJsonNode(value) {
    if (value === null || typeof value !== "object") {
        return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) return value.map(cloneJsonNode);
    const result = {};
    for (const key of Object.keys(value)) {
        result[key] = cloneJsonNode(value[key]);
    }
    return result;
}

function cloneJson(value) {
    assertJsonValue(value);
    return cloneJsonNode(value);
}

/**
 * 写入端已经逐节点校验过的值：只深拷贝，不再复查。
 *
 * 仓储里每一份 Original / Working / 覆盖都由写入路径（`normalizeOriginalAsset`、
 * `saveValues`、`importProject`）先过一遍 `assertJsonValue`，读取时再走一遍
 * 是整个文档级的重复劳动（`text-record` 的 Original 是 2.9 MB）。
 */
function cloneValidatedJson(value) {
    return cloneJsonNode(value);
}

function freezeJsonNode(value) {
    if (value && typeof value === "object" && !frozenValidatedNodes.has(value)) {
        if (Array.isArray(value)) {
            for (const child of value) {
                if (child && typeof child === "object") freezeJsonNode(child);
            }
        } else {
            for (const key of Object.keys(value)) {
                const child = value[key];
                if (child && typeof child === "object") freezeJsonNode(child);
            }
        }
        Object.freeze(value);
        frozenValidatedNodes.add(value);
    }
    return value;
}

function freezeValidatedJson(value) {
    return freezeJsonNode(value);
}

function canonicalizeNode(value) {
    if (value === null || typeof value !== "object") {
        return Object.is(value, -0) ? 0 : value;
    }
    if (Array.isArray(value)) return value.map(canonicalizeNode);
    const result = {};
    for (const key of Object.keys(value).sort()) {
        result[key] = canonicalizeNode(value[key]);
    }
    return result;
}

function canonicalJsonStringify(value) {
    assertJsonValue(value);
    return JSON.stringify(canonicalizeNode(value));
}

function equalJsonNodes(left, right) {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) return left.length === right.length && left.every((item, index) => equalJsonNodes(item, right[index]));
    // canonicalizeNode writes to ordinary objects, whose __proto__ setter does not create a JSON member.
    const keys = Object.keys(left).filter(key => key !== "__proto__");
    return keys.length === Object.keys(right).filter(key => key !== "__proto__").length
        && keys.every(key => hasOwn(right, key) && equalJsonNodes(left[key], right[key]));
}

function canonicalJsonEqual(left, right) {
    if (left === MISSING || right === MISSING) return left === right;
    assertJsonValue(left);
    assertJsonValue(right);
    return equalJsonNodes(left, right);
}

/** 两侧都须经写入校验；对象成员顺序不参与相等判定。 */
function validatedJsonEqual(left, right) {
    return equalJsonNodes(left, right);
}

// 默认值 + 稀疏覆盖：项目里只有「提取器发布的默认值」和「用户改过的那些值」。
// 取值时逐字段现算 `覆盖 ?? 默认`，所以重解析换掉默认值那一层不需要任何迁移，
// 也不存在「整个项目属于哪个版本」。设计见 docs/metalmaxcn_project.md#origin-与-working。
const OVERRIDE_DELETED = Object.freeze({
    __override__: "deleted",
});

function isOverrideDeleted(value) {
    return isPlainJsonObject(value) && value.__override__ === "deleted";
}

/**
 * 求「相对默认值的稀疏差异」。
 *
 * 对象逐键递归；数组一旦有差异就整体覆盖——本项目的数组是有稳定 ID 的记录表，
 * 逐元素合并只会制造歧义。默认值里有、编辑值里没有的键写成删除标记。
 */
function diffJson(defaults, value) {
    if (!isPlainJsonObject(defaults) || !isPlainJsonObject(value)) {
        return canonicalJsonEqual(defaults, value) ? MISSING : cloneJson(value);
    }
    const overrides = {};
    for (const key of Object.keys(value)) {
        if (!hasOwn(defaults, key)) {
            overrides[key] = cloneJson(value[key]);
            continue;
        }
        const nested = diffJson(defaults[key], value[key]);
        if (nested !== MISSING) overrides[key] = nested;
    }
    for (const key of Object.keys(defaults)) {
        if (!hasOwn(value, key)) overrides[key] = cloneJson(OVERRIDE_DELETED);
    }
    return Object.keys(overrides).length ? overrides : MISSING;
}

/** 把稀疏覆盖铺到当前默认值上，得到页面看到的完整文档。 */
function applyOverrides(defaults, overrides) {
    if (overrides === undefined || overrides === MISSING) return cloneJson(defaults);
    if (!isPlainJsonObject(overrides) || !isPlainJsonObject(defaults)) {
        return cloneJson(overrides);
    }
    const result = cloneJson(defaults);
    for (const [key, override] of Object.entries(overrides)) {
        if (!hasOwn(result, key)) continue;
        if (isOverrideDeleted(override)) {
            delete result[key];
            continue;
        }
        result[key] = applyOverrides(result[key], override);
    }
    return result;
}

/** 覆盖非空即为已修改；空覆盖与从未编辑过等价。 */
function hasOverrides(overrides) {
    return overrides !== undefined && overrides !== MISSING &&
        (!isPlainJsonObject(overrides) || Object.keys(overrides).length > 0);
}

function isWorkingDirty(working) {
    if (!isPlainJsonObject(working) || !hasOwn(working, "overrides")) {
        throw new TypeError("working must carry an overrides tree");
    }
    return hasOverrides(working.overrides);
}

function collectionAtPath(root, path, label) {
    let node = root;
    for (const [index, segment] of path.entries()) {
        const valid = typeof segment === "string" && segment.length > 0 ||
            Number.isInteger(segment) && segment >= 0;
        if (!valid || node === null || typeof node !== "object" ||
            !Object.hasOwn(node, segment)) {
            throw new TypeError(
                `${label}/${index}: collection path does not exist`,
            );
        }
        node = node[segment];
    }
    if (!Array.isArray(node)) {
        throw new TypeError(`${label}: collection path must select an array`);
    }
    return node;
}

function collectionIdentityIndex(collection, identityKey, identityValue, label) {
    let match = -1;
    for (const [index, item] of collection.entries()) {
        if (!isPlainJsonObject(item) || !Object.hasOwn(item, identityKey)) {
            throw new TypeError(
                `${label}/${index}: item must contain identity key ${identityKey}`,
            );
        }
        if (!canonicalJsonEqual(item[identityKey], identityValue)) continue;
        if (match >= 0) {
            throw new TypeError(
                `${label}: duplicate identity ${canonicalJsonStringify(identityValue)}`,
            );
        }
        match = index;
    }
    return match;
}

/**
 * Restore one keyed array item from immutable working.base while preserving
 * every unrelated edit in working.value.
 *
 * A base-only item is reinserted, a value-only item is removed, and an item
 * present in both collections is replaced in place.  Identity lookup is used
 * instead of an array offset so a preceding insertion cannot reset the wrong
 * record.
 */

// Only called with validated JSON and an owned clone. Batch reset reuses that
// clone rather than validating, copying and comparing the entire asset per item.
function resetCollectionItemInPlace(base, next, {
    collectionPath, identityKey, identityValue,
}) {
    if (!Array.isArray(collectionPath) || !collectionPath.length) {
        throw new TypeError("collectionPath must be a non-empty array");
    }
    nonEmptyIdentityKey(identityKey);
    assertJsonValue(identityValue, "$.identityValue");

    const baseCollection = collectionAtPath(base, collectionPath, "$.base");
    const valueCollection = collectionAtPath(next, collectionPath, "$.value");
    const baseIndex = collectionIdentityIndex(
        baseCollection, identityKey, identityValue, "$.base.collection",
    );
    const valueIndex = collectionIdentityIndex(
        valueCollection, identityKey, identityValue, "$.value.collection",
    );
    if (baseIndex < 0 && valueIndex < 0) {
        throw new RangeError(
            `collection item ${canonicalJsonStringify(identityValue)} not found`,
        );
    }
    if (baseIndex < 0) {
        valueCollection.splice(valueIndex, 1);
    } else if (valueIndex < 0) {
        valueCollection.splice(
            Math.min(baseIndex, valueCollection.length),
            0,
            cloneJson(baseCollection[baseIndex]),
        );
    } else {
        valueCollection[valueIndex] = cloneJson(baseCollection[baseIndex]);
    }
    return baseIndex >= 0;
}

function nonEmptyIdentityKey(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError("identityKey must be a non-empty string");
    }
    return value;
}

function normalizedJsonPath(path, label = "path") {
    if (!Array.isArray(path) || !path.length) {
        throw new TypeError(`${label} must be a non-empty array`);
    }
    for (const [index, segment] of path.entries()) {
        if (!(typeof segment === "string" && segment.length > 0) &&
            !(Number.isInteger(segment) && segment >= 0)) {
            throw new TypeError(`${label}/${index}: invalid path segment`);
        }
    }
    return path;
}

function jsonPathState(root, path) {
    let node = root;
    for (const segment of path) {
        if (node === null || typeof node !== "object" ||
            !Object.hasOwn(node, segment)) {
            return {exists: false, value: MISSING};
        }
        node = node[segment];
    }
    return {exists: true, value: node};
}

function emptyPathContainer(template, nextSegment, label) {
    if (Array.isArray(template)) return [];
    if (isPlainJsonObject(template)) return {};
    if (template === MISSING) {
        return Number.isInteger(nextSegment) ? [] : {};
    }
    throw new TypeError(`${label}: path crosses a non-container value`);
}

function mutablePathParent(next, base, path, {create}) {
    let node = next;
    for (let index = 0; index < path.length - 1; index += 1) {
        const segment = path[index];
        const prefix = path.slice(0, index + 1);
        if (node === null || typeof node !== "object") {
            throw new TypeError(`$.value/${index}: path crosses a non-container value`);
        }
        if (Array.isArray(node) && !Number.isInteger(segment)) {
            throw new TypeError(`$.value/${index}: array path segment must be an index`);
        }
        if (!Object.hasOwn(node, segment) || node[segment] === null ||
            typeof node[segment] !== "object") {
            if (!create) return null;
            const template = jsonPathState(base, prefix).value;
            const container = emptyPathContainer(
                template,
                path[index + 1],
                `$.base/${index}`,
            );
            if (Array.isArray(node)) {
                if (segment > node.length) {
                    throw new TypeError("path would create a sparse JSON array");
                }
                if (segment === node.length) node.push(container);
                else node[segment] = container;
            } else {
                node[segment] = container;
            }
        }
        node = node[segment];
    }
    return node;
}

/** Restore one JSON property/array element from base; a base-missing key deletes. */

function resetPathInPlace(base, next, path) {
    normalizedJsonPath(path);
    const baseState = jsonPathState(base, path);
    const valueState = jsonPathState(next, path);
    if (!baseState.exists && !valueState.exists) {
        return false;
    }
    const parent = mutablePathParent(next, base, path, {
        create: baseState.exists,
    });
    if (!parent) return false;
    const key = path.at(-1);
    if (Array.isArray(parent) && !Number.isInteger(key)) {
        throw new TypeError("array path segment must be an index");
    }
    if (baseState.exists) {
        if (Array.isArray(parent) && Number.isInteger(key) && key > parent.length) {
            throw new TypeError("path would create a sparse JSON array");
        }
        if (Array.isArray(parent) && Number.isInteger(key) && key === parent.length) {
            parent.push(cloneJson(baseState.value));
        } else {
            parent[key] = cloneJson(baseState.value);
        }
    } else if (Array.isArray(parent) && Number.isInteger(key)) {
        if (key < parent.length) parent.splice(key, 1);
    } else {
        delete parent[key];
    }
    return baseState.exists;
}

// Both reference trees have already passed assertJsonValue. Visit every node
// of the result, including unrelated fields, once to validate, compare against
// both references, and encode its sparse override. Never short-circuit validation
// after finding a difference. Arrays remain whole-value overrides.
function inspectResetResult(value, base, previous, path = "$", ancestors = new Set()) {
    if (value === null || typeof value !== "object") {
        assertJsonNode(value, path, ancestors);
        return {copy: Object.is(value, -0) ? 0 : value,
            sameBase: value === base, samePrevious: value === previous,
            overrides: value === base ? MISSING : Object.is(value, -0) ? 0 : value};
    }
    if (ancestors.has(value)) throw new TypeError(`${path}: cyclic JSON value`);
    ancestors.add(value);
    const array = Array.isArray(value);
    if (!array && !isPlainJsonObject(value)) {
        throw new TypeError(`${path}: only plain JSON objects are allowed`);
    }
    if (!array && Object.getOwnPropertySymbols(value).length) {
        throw new TypeError(`${path}: symbol keys are not JSON-compatible`);
    }
    const baseMatches = array ? Array.isArray(base) : isPlainJsonObject(base);
    const previousMatches = array ? Array.isArray(previous) : isPlainJsonObject(previous);
    const copy = array ? [] : {};
    const overrides = {};
    const descriptors = array ? null : Object.getOwnPropertyDescriptors(value);
    const keys = array ? Array.from({length: value.length}, (_, i) => i) : Object.keys(descriptors);
    let sameBase = baseMatches && keys.length === (array ? base.length : Object.keys(base).length);
    let samePrevious = previousMatches && keys.length === (array ? previous.length : Object.keys(previous).length);
    for (const key of keys) {
        const nodePath = `${path}/${escapeJsonPointerToken(String(key))}`;
        if (!hasOwn(value, key)) throw new TypeError(`${nodePath}: sparse arrays cannot represent MISSING`);
        const descriptor = array ? null : descriptors[key];
        if (!array && (!descriptor.enumerable || !("value" in descriptor))) {
            throw new TypeError(`${nodePath}: JSON properties must be enumerable data properties`);
        }
        const child = inspectResetResult(value[key],
            baseMatches && hasOwn(base, key) ? base[key] : MISSING,
            previousMatches && hasOwn(previous, key) ? previous[key] : MISSING,
            nodePath, ancestors);
        if (key === "__proto__") Object.defineProperty(copy, key, {
            value: child.copy, enumerable: true, writable: true, configurable: true,
        });
        else copy[key] = child.copy;
        sameBase = sameBase && child.sameBase;
        samePrevious = samePrevious && child.samePrevious;
        if (!array && child.overrides !== MISSING) {
            if (key === "__proto__") Object.defineProperty(overrides, key, {
                value: child.overrides, enumerable: true, writable: true, configurable: true,
            });
            else overrides[key] = child.overrides;
        }
    }
    if (!array && baseMatches) {
        for (const key of Object.keys(base)) {
            if (!hasOwn(value, key)) Object.defineProperty(overrides, key, {
                value: { ...OVERRIDE_DELETED }, enumerable: true, writable: true, configurable: true,
            });
        }
    }
    ancestors.delete(value);
    return {copy, sameBase, samePrevious,
        overrides: sameBase ? MISSING : !array && baseMatches ? overrides : copy};
}

/** Apply path/item resets in order and publish one complete working.value. */
function resetJsonSelections(base, value, selectors) {
    assertJsonValue(base, "$.base");
    assertJsonValue(value, "$.value");
    if (!Array.isArray(selectors) || !selectors.length) {
        throw new TypeError("selectors must be a non-empty array");
    }
    // The input was validated above; cloning need not validate it again.
    // Still validate the mutated result before comparing/publishing it.
    const next = cloneJsonNode(value);
    for (const [index, selector] of selectors.entries()) {
        if (!isPlainJsonObject(selector)) {
            throw new TypeError(`selectors/${index}: selector must be an object`);
        }
        if (selector.kind === "path") {
            resetPathInPlace(base, next, selector.path);
        } else if (selector.kind === "item") {
            resetCollectionItemInPlace(base, next, selector);
        } else {
            throw new TypeError(`selectors/${index}: unknown selector kind`);
        }
    }
    const result = inspectResetResult(next, base, value);
    return {value: next, changed: !result.samePrevious, overrides: result.overrides};
}

function jsonSelectionsDirtyUnchecked(base, value, selectors) {
    if (!Array.isArray(selectors) || !selectors.length) {
        throw new TypeError("selectors must be a non-empty array");
    }
    let dirty = false;
    for (const [index, selector] of selectors.entries()) {
        if (!isPlainJsonObject(selector)) {
            throw new TypeError(`selectors/${index}: selector must be an object`);
        }
        if (selector.kind === "path") {
            normalizedJsonPath(selector.path, `selectors/${index}.path`);
            const baseState = jsonPathState(base, selector.path);
            const valueState = jsonPathState(value, selector.path);
            dirty ||= baseState.exists !== valueState.exists ||
                baseState.exists &&
                !canonicalJsonEqual(baseState.value, valueState.value);
            continue;
        }
        if (selector.kind === "item") {
            if (!Array.isArray(selector.collectionPath) ||
                !selector.collectionPath.length) {
                throw new TypeError(
                    `selectors/${index}.collectionPath must be a non-empty array`,
                );
            }
            nonEmptyIdentityKey(selector.identityKey);
            assertJsonValue(
                selector.identityValue,
                `selectors/${index}.identityValue`,
            );
            const baseCollection = collectionAtPath(
                base, selector.collectionPath, "$.base",
            );
            const valueCollection = collectionAtPath(
                value, selector.collectionPath, "$.value",
            );
            const baseIndex = collectionIdentityIndex(
                baseCollection,
                selector.identityKey,
                selector.identityValue,
                "$.base.collection",
            );
            const valueIndex = collectionIdentityIndex(
                valueCollection,
                selector.identityKey,
                selector.identityValue,
                "$.value.collection",
            );
            if (baseIndex < 0 && valueIndex < 0) {
                throw new RangeError(
                    `collection item ${canonicalJsonStringify(
                        selector.identityValue,
                    )} not found`,
                );
            }
            dirty ||= baseIndex < 0 || valueIndex < 0 ||
                !canonicalJsonEqual(
                    baseCollection[baseIndex],
                    valueCollection[valueIndex],
                );
            continue;
        }
        throw new TypeError(`selectors/${index}: unknown selector kind`);
    }
    return dirty;
}


/** Evaluate many selector groups while validating the complete trees once. */
function jsonSelectionStates(base, value, selectorGroups) {
    assertJsonValue(base, "$.base");
    assertJsonValue(value, "$.value");
    if (!Array.isArray(selectorGroups) || !selectorGroups.length) {
        throw new TypeError("selectorGroups must be a non-empty array");
    }
    return selectorGroups.map((selectors, index) => {
        try {
            return jsonSelectionsDirtyUnchecked(base, value, selectors);
        } catch (error) {
            error.message = `selectorGroups/${index}: ${error.message}`;
            throw error;
        }
    });
}

function escapeJsonPointerToken(value) {
    return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}



/** 只把本次改动的 JSON 位置写入最新值；数组长度改变时整段替换。 */
function applyJsonChanges(current, previous, next) {
    if (canonicalJsonEqual(previous, next)) return cloneJson(current);
    if (Array.isArray(previous) && Array.isArray(next) && Array.isArray(current)
        && previous.length === next.length && current.length === next.length) {
        return next.map((value, index) => applyJsonChanges(current[index], previous[index], value));
    }
    if (isPlainJsonObject(previous) && isPlainJsonObject(next) && isPlainJsonObject(current)) {
        const result = cloneJson(current);
        for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
            if (!Object.hasOwn(next, key)) delete result[key];
            else if (!Object.hasOwn(previous, key) || !Object.hasOwn(current, key)) {
                if (!Object.hasOwn(previous, key) || !canonicalJsonEqual(previous[key], next[key]))
                    Object.defineProperty(result, key, {value: cloneJson(next[key]), enumerable: true, writable: true, configurable: true});
            } else Object.defineProperty(result, key, {value: applyJsonChanges(current[key], previous[key], next[key]),
                enumerable: true, writable: true, configurable: true});
        }
        return result;
    }
    return cloneJson(next);
}

function assetModelIdentity(assetSchema, codec = null) {
    if (typeof assetSchema !== "string" || !assetSchema) {
        throw new TypeError("assetSchema must be a non-empty string");
    }
    if (codec !== null && (typeof codec !== "string" || !codec)) {
        throw new TypeError("codec must be null or a non-empty string");
    }
    return canonicalJsonStringify({asset_schema: assetSchema, codec});
}

/** A small directed migration graph for semantic asset schemas/codecs. */
class AssetSchemaMigrationRegistry {
    constructor() {
        this.edges = new Map();
    }

    register({
        fromAssetSchema,
        fromCodec = null,
        toAssetSchema,
        toCodec = null,
        migrate,
    }) {
        if (typeof migrate !== "function") {
            throw new TypeError("migrate must be a function");
        }
        const from = assetModelIdentity(fromAssetSchema, fromCodec);
        const to = assetModelIdentity(toAssetSchema, toCodec);
        const edges = this.edges.get(from) || [];
        if (edges.some(edge => edge.to === to)) {
            throw new Error(`migration already registered: ${from} -> ${to}`);
        }
        edges.push({to, migrate});
        this.edges.set(from, edges);
        return this;
    }

    findPath(from, to) {
        if (from === to) return [];
        const queue = [{id: from, path: []}];
        const visited = new Set([from]);
        while (queue.length) {
            const current = queue.shift();
            for (const edge of this.edges.get(current.id) || []) {
                const path = [...current.path, edge];
                if (edge.to === to) return path;
                if (!visited.has(edge.to)) {
                    visited.add(edge.to);
                    queue.push({id: edge.to, path});
                }
            }
        }
        return null;
    }

    async migrate(value, {
        fromAssetSchema,
        fromCodec = null,
        toAssetSchema,
        toCodec = null,
        context = {},
    }) {
        const from = assetModelIdentity(fromAssetSchema, fromCodec);
        const to = assetModelIdentity(toAssetSchema, toCodec);
        const path = this.findPath(from, to);
        if (path === null) {
            throw new ProjectAssetMigrationMissingError(from, to);
        }
        let result = cloneJson(value);
        for (const edge of path) {
            result = await edge.migrate(cloneJson(result), {
                ...context,
                from_model: from,
                step_model: edge.to,
                to_model: to,
            });
            assertJsonValue(result, "$.migrated");
        }
        return cloneJson(result);
    }
}

class ProjectAssetMigrationMissingError extends Error {
    constructor(from, to) {
        super(`no asset schema migration registered: ${from} -> ${to}`);
        this.name = "ProjectAssetMigrationMissingError";
        this.from = from;
        this.to = to;
    }
}

const BASE64_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(input) {
    const bytes = input instanceof Uint8Array
        ? input
        : new Uint8Array(input.buffer || input, input.byteOffset || 0,
            input.byteLength === undefined ? undefined : input.byteLength);
    let result = "";
    for (let offset = 0; offset < bytes.length; offset += 3) {
        const a = bytes[offset];
        const hasB = offset + 1 < bytes.length;
        const hasC = offset + 2 < bytes.length;
        const b = hasB ? bytes[offset + 1] : 0;
        const c = hasC ? bytes[offset + 2] : 0;
        result += BASE64_ALPHABET[a >> 2];
        result += BASE64_ALPHABET[((a & 3) << 4) | (b >> 4)];
        result += hasB
            ? BASE64_ALPHABET[((b & 15) << 2) | (c >> 6)]
            : "=";
        result += hasC ? BASE64_ALPHABET[c & 63] : "=";
    }
    return result;
}

function base64ToBytes(value) {
    if (typeof value !== "string" || value.length % 4 !== 0 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
        throw new TypeError("invalid base64 data");
    }
    const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
    const bytes = new Uint8Array((value.length / 4) * 3 - padding);
    let output = 0;
    for (let offset = 0; offset < value.length; offset += 4) {
        const values = value.slice(offset, offset + 4).split("").map(character =>
            character === "=" ? 0 : BASE64_ALPHABET.indexOf(character));
        const word = (values[0] << 18) | (values[1] << 12) |
            (values[2] << 6) | values[3];
        if (output < bytes.length) bytes[output++] = (word >> 16) & 255;
        if (output < bytes.length) bytes[output++] = (word >> 8) & 255;
        if (output < bytes.length) bytes[output++] = word & 255;
    }
    return bytes;
}

var projectStoreValues = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AssetSchemaMigrationRegistry: AssetSchemaMigrationRegistry,
  MISSING: MISSING,
  ProjectAssetMigrationMissingError: ProjectAssetMigrationMissingError,
  applyJsonChanges: applyJsonChanges,
  applyOverrides: applyOverrides,
  assertJsonValue: assertJsonValue,
  assetModelIdentity: assetModelIdentity,
  base64ToBytes: base64ToBytes,
  bytesToBase64: bytesToBase64,
  canonicalJsonEqual: canonicalJsonEqual,
  canonicalJsonStringify: canonicalJsonStringify,
  cloneJson: cloneJson,
  cloneValidatedJson: cloneValidatedJson,
  diffJson: diffJson,
  freezeValidatedJson: freezeValidatedJson,
  isFrozenValidatedJson: isFrozenValidatedJson,
  isPlainJsonObject: isPlainJsonObject,
  isWorkingDirty: isWorkingDirty,
  jsonSelectionStates: jsonSelectionStates,
  resetJsonSelections: resetJsonSelections,
  validatedJsonEqual: validatedJsonEqual
});

export { AssetSchemaMigrationRegistry, BUNDLE_SCHEMA, LOG_LEVELS, LinkerError, LinkerSchemaError, MISSING, RomLinker, applyJsonChanges, applyOverrides, assertJsonValue, base64ToBytes, bytesToBase64, canonicalHash, canonicalJson, canonicalJsonEqual, canonicalJsonStringify, cloneJson, cloneValidatedJson, compareText, deletePackageCache, diffJson, discardPackagePrefetch, editorLog, fileUrl, freezeValidatedJson, identifierRepr, isFrozenValidatedJson, isPlainJsonObject, isWorkingDirty, jsonSelectionStates, linkRom, logEntryText, logProgressText, normalizeBundle, packageCacheStats, packageJson, packagePrefetchVersion, prefetchPackageJson, readPackageBytes, readonlyPackageJson, resetJsonSelections, resolveFragmentPayload, sha256Hex, siteUrl, validatedJsonEqual, visualUrl };
