// @editor-module 将设施配置编码为带长度前缀的逻辑片段。
// Pure browser encoder for the length-prefixed 840-byte facility table.
//
// The semantic asset contains no ROM address.  The AssetCompiler receives its
// destination slot from target bindings and hands this compact payload to the
// linker as one fragment.

import {sha256Hex} from "./rom-linker.js";
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides, fieldOffsetInFragment} from "./field-codec.js";

export const FACILITY_CONFIG_COMPILER_ID = "facility-config/v1";
export const FACILITY_CONFIG_RESOURCE_ID = "facility-config";
export const FACILITY_CONFIG_ASSET_SCHEMA =
  "metalmaxcn.facility-configuration.asset";
export const FACILITY_CONFIG_FRAGMENT_ID = "facility-config.records";
const FACILITY_CONFIG_COMPONENT_BYTES = 840;
export const FACILITY_CONFIG_COMPONENT_CODEC =
  "metalmaxcn.facility-configuration-records";
export const FACILITY_CONFIG_COMPONENT_CODEC_VERSION = "1";
export const FACILITY_CONFIG_ENCODER =
  "engine.tools.rom_assets.facilities.extract.FacilityConfigurationCompiler";
export const FACILITY_CONFIG_ENCODER_VERSION = "1";

class FacilityConfigurationEncodingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "FacilityConfigurationEncodingError";
  }
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function byte(value, name) {
  const result = value;
  if (!Number.isInteger(result) || result < 0 || result > 0xff) {
    throw new FacilityConfigurationEncodingError(`${name} must be a byte`);
  }
  return result;
}

function validateFacilityLayout(asset) {
  if (!asset || asset.resource_id !== FACILITY_CONFIG_RESOURCE_ID ||
      !asset.document || !Array.isArray(asset.document.records)) {
    throw new FacilityConfigurationEncodingError(
      "facility-config identity/schema is invalid",
    );
  }
  const document = asset.document;
  if (document.component_id !== FACILITY_CONFIG_FRAGMENT_ID ||
      !Number.isSafeInteger(document.byte_length) || document.byte_length <= 0) {
    throw new FacilityConfigurationEncodingError(
      "facility-config component identity/length is invalid",
    );
  }
  let cursor = 0;
  const ids = new Set();
  const records = [...document.records].sort((left, right) =>
    Number(left.component_offset) - Number(right.component_offset));
  for (const record of records) {
    if (typeof record.id !== "string" || !record.id || ids.has(record.id)) {
      throw new FacilityConfigurationEncodingError(
        "facility-config record IDs must be unique strings",
      );
    }
    ids.add(record.id);
    if (Number(record.component_offset) !== cursor ||
        !Number.isSafeInteger(record.payload_length) ||
        record.payload_length < 0 || record.payload_length > 0xff ||
        !Array.isArray(record.slots) ||
        record.slots.length !== record.payload_length) {
      throw new FacilityConfigurationEncodingError(
        `${record.id}: record offset/length is invalid`,
      );
    }
    cursor += 1;
    for (let index = 0; index < record.slots.length; index += 1) {
      const slot = record.slots[index];
      if (Number(slot.id) !== index) {
        throw new FacilityConfigurationEncodingError(
          `${record.id}: slot IDs must be contiguous`,
        );
      }
      byte(slot.value, `${record.id}.slots[${index}].value`);
      cursor += 1;
    }
  }
  if (cursor !== document.byte_length) {
    throw new FacilityConfigurationEncodingError(
      `facility-config encoded ${cursor}; expected ${document.byte_length} bytes`,
    );
  }
}

/** Validate one facility-config asset without an Original comparison. */
export function validateFacilityConfigurationDocument(asset) {
  validateFacilityLayout(asset);
}

function validateFacilityConfigurationAsset(asset, original) {
  validateFacilityLayout(original);
  validateFacilityLayout(asset);
  const expected = structuredClone(original);
  for (const [index, record] of asset.document.records.entries()) {
    const before = expected.document.records[index];
    if (!before || before.id !== record.id || before.slots.length !== record.slots.length)
      throw new FacilityConfigurationEncodingError("设施记录身份或布局不能修改");
    for (const [slot, value] of record.slots.entries()) before.slots[slot].value = value.value;
  }
  if (!canonicalJsonEqual(asset, expected))
    throw new FacilityConfigurationEncodingError("设施配置只允许修改既有槽位值");
}

export function facilityConfigurationFieldDescriptions(document) {
  const fields = [];
  for (const [index, record] of document.records.entries()) {
    const common = {resourceId: FACILITY_CONFIG_RESOURCE_ID, entityHandle: record.id,
      fragmentId: FACILITY_CONFIG_FRAGMENT_ID, byteLength: 1};
    fields.push({...common, fieldName: "payload_length", readOnly: true,
      edit_policy: "immutable", immutable_basis: "长度前缀等于既有 slots 的数量",
      documentPath: ["records", index, "payload_length"], defaultValue: record.payload_length,
      offsetInFragment: record.component_offset});
    for (const [position, slot] of record.slots.entries()) fields.push({...common,
      fieldName: `slot:${slot.id}`, documentPath: ["records", index, "slots", position, "value"],
      defaultValue: slot.value, offsetInFragment: record.component_offset + 1 + slot.id});
  }
  return fields;
}

const FACILITY_SLOT_LABEL = /^slot:(\d+)$/u;

function facilityFieldLabel(fieldName) {
  if (fieldName === "payload_length") return "固定长度";
  const slot = FACILITY_SLOT_LABEL.exec(fieldName);
  return slot ? `槽 ${slot[1]}` : fieldName;
}

/** 一条配置记录一个字段对象：记录自己的连续字节，列按已发布槽位铺开。 */
export function facilityConfigurationObjects(document) {
  const byHandle = new Map();
  for (const field of facilityConfigurationFieldDescriptions(document)) {
    if (!byHandle.has(field.entityHandle)) byHandle.set(field.entityHandle, []);
    byHandle.get(field.entityHandle).push(field);
  }
  return [...byHandle.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `设施配置 · ${entityHandle}`,
    fragmentIds: [FACILITY_CONFIG_FRAGMENT_ID],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle],
      columns: rows.map(field => ({name: field.fieldName, label: facilityFieldLabel(field.fieldName),
        min: 0, max: 0xff}))},
  }));
}

function facilityFieldOffset(field) {
  const offset = field.physical?.offsetInFragment ?? field.offsetInFragment;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= FACILITY_CONFIG_COMPONENT_BYTES)
    throw new FacilityConfigurationEncodingError("设施字段物理位置无效");
  return offset;
}

export function serializeFacilityConfigurationField(field) {
  if (field.resourceId !== FACILITY_CONFIG_RESOURCE_ID || field.readOnly)
    throw new FacilityConfigurationEncodingError("设施字段身份无效");
  return new Uint8Array([byte(field.value, JSON.stringify([field.entityHandle, field.fieldName]))]);
}

export function validateFacilityConfigurationPreimage(fields, fragmentId, baseline) {
  if (fragmentId !== FACILITY_CONFIG_FRAGMENT_ID || baseline.length !== FACILITY_CONFIG_COMPONENT_BYTES)
    throw new FacilityConfigurationEncodingError("设施 Origin 片段身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    if (field.readOnly) continue;
    const offset = facilityFieldOffset(field), identity = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== FACILITY_CONFIG_RESOURCE_ID || seen.has(identity))
      throw new FacilityConfigurationEncodingError("设施 Origin 字段身份不符");
    seen.add(identity);
    if (baseline[offset] !== field.defaultValue)
      throw new FacilityConfigurationEncodingError("设施 Origin 与绑定原像不同");
  }
}

export function validateFacilityConfigurationFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, facilityConfigurationFieldDescriptions, validateFacilityConfigurationAsset);
}

export function encodeFacilityConfigurationFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(FACILITY_CONFIG_COMPONENT_BYTES), offsets = new Set(), identities = new Set();
  for (const field of fields) {
    const offset = field.physical?.offsetInFragment ?? fieldOffsetInFragment(field);
    const identity = JSON.stringify([field.entityHandle, field.fieldName]);
    if (field.resourceId !== FACILITY_CONFIG_RESOURCE_ID || identities.has(identity)
        || !Number.isSafeInteger(offset) || offset < 0 || offset >= payload.length || offsets.has(offset))
      throw new FacilityConfigurationEncodingError("设施字段身份或组件位置无效");
    identities.add(identity); offsets.add(offset);
    payload[offset] = byte(defaults ? field.defaultValue : field.value, identity);
  }
  if (offsets.size !== payload.length) throw new FacilityConfigurationEncodingError("设施字段未覆盖完整组件");
  return [{fragment_id: FACILITY_CONFIG_FRAGMENT_ID, payload, relocations: []}];
}

export async function facilityConfigurationInputSha256(asset) {
  return sha256Hex(new TextEncoder().encode(stableJson(asset)));
}
