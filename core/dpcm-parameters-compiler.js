// @editor-module 编码 DPCM 控制参数，保留采样窗口与引用，不持有物理地址。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {byteTableFieldObjectCodec} from "./field-object.js";
export const DPCM_COMPILER_ID = "dpcm-parameters/v1";
export const DPCM_COMPONENT_CODEC = "metalmaxcn.dpcm-parameter";
const OWNER = "dpcm-sample";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function dpcmComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown DPCM parameter owner");
  return [{fragmentId: `${OWNER}.parameters`, length: 42}];
}
export function dpcmAssetSchema(resourceId) {
  dpcmComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateDpcmAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === dpcmAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === dpcmAssetSchema(OWNER), "DPCM identity/policy drift");
    requireValue(doc.record_count === 14 && doc.owned_byte_count === 42,
      "DPCM table shape drift");
    requireValue(Array.isArray(doc.records) && doc.records.length === 14, "expected 14 DPCM parameters");
    doc.records.forEach((row, index) => {
      requireValue(row.id === index + 1 && row.handle === `dpcm-sample:${(index + 1).toString(16).toUpperCase().padStart(2, "0")}`,
        "DPCM record identity/order drift");
      for (const field of ["rate_flags", "start_register", "length_register"]) {
        requireValue(Number.isInteger(row[field]) && row[field] >= 0 && row[field] <= 255,
          "DPCM 寄存器值必须是 0–255 的整数");
      }
    });
  }
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    const target = expected.document.records[index];
    requireValue((row.rate_flags & 0x30) === (target.rate_flags & 0x30), "DPCM 未用位 bit4–5 不可修改");
    for (const field of names) target[field] = row[field];
  });
  requireValue(canonicalJsonEqual(asset, expected), "仅可修改 DPCM 寄存器原值；采样窗口引用保持原值");
}

const names = ["rate_flags", "start_register", "length_register"];
const handle = id => `${OWNER}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
export function dpcmFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document.records?.length === 14, "DPCM field collection drift");
  const seen = new Set();
  return document.records.flatMap((row, index) => {
    requireValue(Number.isInteger(row.id) && row.id >= 1 && row.id <= 14
      && row.handle === handle(row.id) && !seen.has(row.id), "DPCM field identity drift");
    seen.add(row.id);
    return names.map((fieldName, column) => ({resourceId: OWNER, entityHandle: row.handle,
      fieldName, recordId: row.id,
      ...(fieldName === "rate_flags" ? {} : {writeback: ROM_WRITE_PENDING}),
      documentPath: ["records", index, fieldName], defaultValue: row[fieldName],
      fragmentId: dpcmComponentSpecs(OWNER)[0].fragmentId,
      offsetInFragment: (row.id - 1) * 3 + column, byteLength: 1}));
  });
}
export function validateDpcmFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(dpcmFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    requireValue(row.resource_id === OWNER && field && !seen.has(key), "DPCM override identity drift");
    seen.add(key); candidate.document.records[field.documentPath[1]][field.fieldName] = row.value;
  }
  validateDpcmAsset(candidate, original);
}
export function encodeDpcmFields(fields, {defaults = false} = {}) {
  const positions = new Map(Array.from({length: 14}, (_, index) => names.map((name, column) =>
    [JSON.stringify([handle(index + 1), name]), index * 3 + column])).flat());
  const payload = new Uint8Array(42), seen = new Set();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]), index = positions.get(key);
    const value = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === OWNER && index !== undefined && !seen.has(key), "DPCM build field identity drift");
    requireValue(Number.isInteger(value) && value >= 0 && value <= 255, "DPCM build value drift");
    requireValue(field.fieldName !== "rate_flags" || (value & 0x30) === (field.defaultValue & 0x30),
      "DPCM 未用位 bit4–5 不可修改");
    seen.add(key); payload[index] = field.writeback?.state === "unpermitted" ? field.defaultValue : value;
  }
  requireValue(seen.size === 42, "DPCM build field collection incomplete");
  return [{fragment_id: dpcmComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}

const dpcmByteCodec = byteTableFieldObjectCodec({resourceId: OWNER,
  fragmentId: dpcmComponentSpecs(OWNER)[0].fragmentId,
  fields: Array.from({length: 14}, (_, index) => names.map(name => [handle(index + 1), name])).flat()});
const DPCM_COLUMN_LABELS = Object.freeze({rate_flags: "$4010 速率 / 循环 / IRQ 标志",
  start_register: "$4012 采样起点（暂不写进 ROM）", length_register: "$4013 采样长度（暂不写进 ROM）"});
export const dpcmFieldObjectCodec = Object.freeze({
  ...dpcmByteCodec,
  objects: () => dpcmByteCodec.objects().map(definition => ({...definition, label: "DPCM 采样参数",
    editor: {kind: "numeric-table", rows: [...new Set(definition.fields.map(([entityHandle]) => entityHandle))],
      columns: names.map(name => ({name, label: DPCM_COLUMN_LABELS[name], min: 0, max: 0xff,
        ...(name === "length_register" ? {semantic: {kind: "dimension", unit: "16 B + 1"}} : {}),
        ...(name === "rate_flags" ? {semantic: {kind: "bit-labels"}, bits: [
          {value: 1, label: "速率 1"}, {value: 2, label: "速率 2"},
          {value: 4, label: "速率 4"}, {value: 8, label: "速率 8"},
          {value: 64, label: "循环"}, {value: 128, label: "IRQ"},
        ]} : {})}))}})),
  serializeField(field) {
    const payload = dpcmByteCodec.serializeField(field), value = field.value;
    requireValue(field.fieldName !== "rate_flags" || (value & 0x30) === (field.defaultValue & 0x30),
      "DPCM 未用位 bit4–5 不可修改");
    return payload;
  },
});
