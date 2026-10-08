// @editor-module 编码两段共享 DMC delta 数据，保留间隙与固定采样窗口。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const DPCM_STORAGE_COMPILER_ID = "dpcm-storage/v1";
export const DPCM_STORAGE_COMPONENT_CODEC = "metalmaxcn.dpcm-storage";
const OWNER = "dpcm-storage";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function dpcmStorageComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown DPCM storage owner");
  return [3073, 641].map((length, i) => ({fragmentId: `${OWNER}.sample-data-run-0${i}`, length}));
}
export function dpcmStorageAssetSchema(resourceId) {
  dpcmStorageComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateDpcmStorageAsset(asset, original) {
  const specs = dpcmStorageComponentSpecs(OWNER);
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === dpcmStorageAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === dpcmStorageAssetSchema(OWNER), "DPCM storage identity/policy drift");
    requireValue(doc.owned_byte_count === 3714 && doc.source_pool_byte_count === 3904,
      "DPCM storage fixed pool shape drift");
    requireValue(Array.isArray(doc.physical_components) && doc.physical_components.length === 2,
      "expected two DPCM runs");
    doc.physical_components.forEach((run, i) => {
      requireValue(run.id === `sample-data-run-0${i}`, "DPCM run identity/order drift");
      requireValue(Array.isArray(run.delta_bytes) && run.delta_bytes.length === specs[i].length
        && run.delta_bytes.every(v => Number.isInteger(v) && v >= 0 && v <= 255),
      "DPCM delta 值必须是 0–255 的整数，长度固定");
    });
  }
  const expected = structuredClone(original);
  specs.forEach((spec, i) => {
    const values = asset.document.physical_components[i].delta_bytes;
    expected.document.physical_components[i].delta_bytes = values;
  });
  requireValue(canonicalJsonEqual(asset, expected), "仅支持 DPCM delta 数据写回，边界、间隙与提取快照必须保持原值");
}

// A run is one ordered bitstream value. Its byte controls are projections, not
// independently identified records; reordering run records preserves identity.
export function dpcmStorageFieldDescriptions(document) {
  const specs = dpcmStorageComponentSpecs(document?.module_id), seen = new Set();
  requireValue(Array.isArray(document.physical_components) && document.physical_components.length === 2,
    "expected two DPCM field runs");
  return document.physical_components.map((run, index) => {
    const spec = specs.find(row => row.fragmentId === `${OWNER}.${run.id}`);
    requireValue(spec && !seen.has(run.id) && Array.isArray(run.delta_bytes)
      && run.delta_bytes.length === spec.length, "DPCM field run identity/length drift");
    seen.add(run.id);
    return {resourceId: OWNER, entityHandle: `${OWNER}:${run.id}`, fieldName: "delta_bytes",
      resetLabel: `${run.id} 的 Delta 位流（整段）`,
      documentPath: ["physical_components", index, "delta_bytes"], defaultValue: run.delta_bytes,
      fragmentId: spec.fragmentId, offsetInFragment: 0, byteLength: spec.length};
  });
}
export function validateDpcmStorageFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, dpcmStorageFieldDescriptions, validateDpcmStorageAsset);
}
export function encodeDpcmStorageFields(fields, {defaults = false} = {}) {
  const supplied = new Map();
  for (const field of fields) {
    requireValue(field.resourceId === OWNER && field.fieldName === "delta_bytes"
      && !supplied.has(field.entityHandle), "invalid DPCM build field identity");
    supplied.set(field.entityHandle, defaults ? field.defaultValue : field.value);
  }
  const result = dpcmStorageComponentSpecs(OWNER).map(spec => {
    const handle = `${OWNER}:${spec.fragmentId.slice(OWNER.length + 1)}`, values = supplied.get(handle);
    requireValue(Array.isArray(values) && values.length === spec.length
      && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255), "invalid DPCM field bytes");
    supplied.delete(handle);
    return {fragment_id: spec.fragmentId, payload: Uint8Array.from(values), relocations: []};
  });
  requireValue(supplied.size === 0, "unknown DPCM build field");
  return result;
}

function dpcmStorageFieldSpec(field) {
  const spec = dpcmStorageComponentSpecs(OWNER).find(spec =>
    field.entityHandle === `${OWNER}:${spec.fragmentId.slice(OWNER.length + 1)}`);
  requireValue(field.resourceId === OWNER && field.fieldName === "delta_bytes" && spec, "invalid DPCM build field identity");
  return spec;
}
const DPCM_STORAGE_RUN_LABELS = Object.freeze(["共享采样数据 1", "共享采样数据 2"]);

export function dpcmStorageObjects() {
  return dpcmStorageComponentSpecs(OWNER).map((spec, index) => {
    const handle = `${OWNER}:${spec.fragmentId.slice(OWNER.length + 1)}`;
    return {id: spec.fragmentId, label: DPCM_STORAGE_RUN_LABELS[index], fragmentIds: [spec.fragmentId],
      fields: [[handle, "delta_bytes"]],
      editor: {kind: "numeric-table", rows: [handle], columns: [{name: "delta_bytes",
        label: "Delta 位流（0–255，低位先播放）", array: true, length: spec.length, min: 0, max: 0xff,
        semantic: {kind: "raw-bytes"}}]}};
  });
}
export function serializeDpcmStorageField(field) {
  const spec = dpcmStorageFieldSpec(field), values = field.value;
  requireValue(Array.isArray(values) && values.length === spec.length
    && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255), "invalid DPCM field bytes");
  return Uint8Array.from(values);
}
export function validateDpcmStoragePreimage(fields, fragmentId, baseline) {
  requireValue(fields.length === 1, "DPCM Origin field count drift");
  const field = fields[0], spec = dpcmStorageFieldSpec(field), values = field.defaultValue;
  requireValue(fragmentId === spec.fragmentId && baseline.length === spec.length, "DPCM Origin run identity/length drift");
  requireValue(Array.isArray(values) && values.length === baseline.length
    && values.every((value, index) => value === baseline[index]), "DPCM Origin differs from bound baseline");
}
