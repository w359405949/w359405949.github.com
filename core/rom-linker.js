// @editor-module 按 target 与 BuildMap 写入逻辑片段并产出构建报告。
// Deterministic fixed-layout ROM linker.
//
// Asset compilers provide logical fragments and never receive a physical ROM
// offset.  This is the only browser module allowed to copy fragment bytes into
// a ROM buffer.  Its build ID, diff grouping and BuildEvent/BuildReport shapes
// match engine/tools/mm_linker.py.

export const BUNDLE_SCHEMA = "metalmaxcn.encoded-asset-bundle";
const BUILD_REPORT_SCHEMA = "metalmaxcn.build-report";

const REGION_KINDS = new Set(["header", "prg", "chr"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function compareText(left, right) {
    const a = Array.from(left, character => character.codePointAt(0));
    const b = Array.from(right, character => character.codePointAt(0));
    for (let index = 0; index < Math.min(a.length, b.length); index++) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
}

export function identifierRepr(value) {
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

export class LinkerError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

export class LinkerSchemaError extends LinkerError {}
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

export function canonicalJson(value) {
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

function bytesEqual(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return false;
    }
    return true;
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

export async function sha256Hex(value) {
    if (!globalThis.crypto?.subtle) {
        throw new LinkerError("WebCrypto SHA-256 is unavailable");
    }
    const bytes = asBytes(value, "SHA-256 input", {copy: false});
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function canonicalHash(value) {
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
        ...(Object.hasOwn(value, "expansion_shared_pool") ? {expansion_shared_pool: value.expansion_shared_pool} : {}),
    };
}

/** Validate one pinned target profile document. */
export function validateTargetDocument(value) {
    normalizeTarget(value);
}

/** Validate one BuildMap document, including slot geometry and aliasing. */
export function validateBuildMapDocument(value) {
    normalizeBuildMap(value);
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
export function resolveFragmentPayload({payload, relocations, slots}) {
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

export async function normalizeBundle(input) {
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

function regionByKind(target, kind) {
    return target.regions.find(region => region.kind === kind);
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

function slice(bytes, start, end) {
    return bytes.slice(start, end);
}

export class RomLinker {
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

export async function linkRom(baseline, target, buildMap, bundles, options = {}) {
    const linker = await RomLinker.create({baseline, target, buildMap});
    return linker.link(bundles, options);
}

export async function projectRomLinker({action, baseline, target, build_map, bundles = []}) {
    let phase = "validate";
    try {
        const linker = await RomLinker.create({baseline, target, buildMap: build_map});
        if (action === "validate") return {value: null};
        if (action !== "link") throw new LinkerSchemaError(`unknown linker action ${action}`);
        phase = "link";
        return {value: await linker.link(bundles)};
    } catch (error) {
        return {error: {name: error.name, message: error.message}, phase};
    }
}
