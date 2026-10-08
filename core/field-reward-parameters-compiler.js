// @editor-module 编码奖励解析服务的十一项金额乘数，不包含物理位置或执行体。
import {canonicalJsonEqual} from "./project-store-values.js";
export const FIELD_REWARD_PARAMETERS_COMPILER_ID = "field-reward-parameters/v1";
export const FIELD_REWARD_PARAMETERS_COMPONENT_CODEC = "metalmaxcn.field-reward-parameter";
const OWNER = "field-reward-resolution-service";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function fieldRewardParametersComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown field-reward owner");
  return [{fragmentId: `${OWNER}.money-result-multipliers`, length: 22}];
}
export function fieldRewardParametersAssetSchema(resourceId) {
  fieldRewardParametersComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateFieldRewardParametersAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === fieldRewardParametersAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === fieldRewardParametersAssetSchema(OWNER), "field-reward identity/policy drift");
    requireValue(!Object.hasOwn(doc, "money_result_multipliers"), "retired duplicate money multiplier table");
    requireValue(doc.record_count === 11 && Array.isArray(doc.records) && doc.records.length === 11,
      "expected eleven money results");
    doc.records.forEach((row, index) => {
      const code = 0xF0 + index;
      requireValue(row.id === code && row.result_code === code
        && row.handle === `${OWNER}:${code.toString(16).toUpperCase()}`, "money result identity/order drift");
      requireValue(Number.isInteger(row.money_multiplier) && row.money_multiplier >= 0
        && row.money_multiplier <= 65535, "金额乘数必须是 0–65535 的整数");
    });
  }
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    expected.document.records[index].money_multiplier = row.money_multiplier;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改金额乘数，记录身份、源地址与执行体不能修改");
}

const handle = id => `${OWNER}:${id.toString(16).toUpperCase()}`;
export function fieldRewardFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document.records?.length === 11, "money field collection drift");
  const seen = new Set();
  return document.records.map((row, index) => {
    requireValue(Number.isInteger(row.id) && row.id >= 0xF0 && row.id <= 0xFA
      && row.result_code === row.id && row.handle === handle(row.id) && !seen.has(row.id), "money field identity drift");
    seen.add(row.id);
    return {resourceId: OWNER, entityHandle: row.handle, fieldName: "money_multiplier", recordId: row.id,
      documentPath: ["records", index, "money_multiplier"], defaultValue: row.money_multiplier,
      fragmentId: fieldRewardParametersComponentSpecs(OWNER)[0].fragmentId,
      offsetInFragment: (row.id - 0xF0) * 2, byteLength: 2};
  });
}
export function validateFieldRewardFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(fieldRewardFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    requireValue(row.resource_id === OWNER && field && !seen.has(key), "money override identity drift");
    seen.add(key); candidate.document.records[field.documentPath[1]].money_multiplier = row.value;
  }
  validateFieldRewardParametersAsset(candidate, original);
}
export function encodeFieldRewardFields(fields, {defaults = false} = {}) {
  const positions = new Map(Array.from({length: 11}, (_, id) => [handle(id + 0xF0), id]));
  const payload = new Uint8Array(22), seen = new Set();
  for (const field of fields) {
    const index = positions.get(field.entityHandle), value = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === OWNER && field.fieldName === "money_multiplier"
      && index !== undefined && !seen.has(index), "money build field identity drift");
    requireValue(Number.isInteger(value) && value >= 0 && value <= 65535, "money build value drift");
    seen.add(index); payload[index * 2] = value & 255; payload[index * 2 + 1] = value >>> 8;
  }
  requireValue(seen.size === 11, "money build field collection incomplete");
  return [{fragment_id: fieldRewardParametersComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}

const rewardPositions = new Map(Array.from({length: 11}, (_, index) => [handle(index + 0xF0), index]));
function rewardFieldPosition(field) {
  const index = rewardPositions.get(field.entityHandle);
  requireValue(field.resourceId === OWNER && field.fieldName === "money_multiplier" && index !== undefined,
    "money build field identity drift");
  return index;
}
export function fieldRewardObjects() {
  const fragmentId = fieldRewardParametersComponentSpecs(OWNER)[0].fragmentId;
  const fields = [...rewardPositions.keys()].map(id => [id, "money_multiplier"]);
  return [{id: fragmentId, label: "字段奖励结果 · 金额乘数", fragmentIds: [fragmentId], fields,
    editor: {kind: "numeric-table", rows: fields.map(([entityHandle]) => entityHandle),
      columns: [{name: "money_multiplier", label: "金额乘数", min: 0, max: 65535}]}}];
}
export function serializeFieldRewardField(field) {
  rewardFieldPosition(field);
  const value = field.value;
  requireValue(Number.isInteger(value) && value >= 0 && value <= 65535, "money build value drift");
  return new Uint8Array([value & 255, value >>> 8]);
}
export function validateFieldRewardPreimage(fields, fragmentId, baseline) {
  requireValue(fragmentId === fieldRewardParametersComponentSpecs(OWNER)[0].fragmentId
    && baseline.length === 22 && fields.length === 11, "money Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const index = rewardFieldPosition(field), offset = index * 2;
    requireValue(!seen.has(index), "money Origin field identity drift");
    requireValue(baseline[offset] + baseline[offset + 1] * 256 === field.defaultValue,
      "money Origin differs from bound baseline");
    seen.add(index);
  }
}
