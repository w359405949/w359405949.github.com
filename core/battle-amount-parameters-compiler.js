// @editor-module 编码战斗随机量与倍率参数，不决定 ROM 放置。
// Bounded owner encodings. No ROM placement; code and RAM pointers are evidence.
import {canonicalJsonEqual} from "./project-store-values.js";
import {byteTableFieldObjectCodec} from "./field-object.js";
export const BATTLE_AMOUNT_COMPILER_ID = "battle-amount-parameters/v1";
export const BATTLE_AMOUNT_COMPONENT_CODEC = "metalmaxcn.battle-amount-parameter";
const SPECS = Object.freeze({
  "battle-random-amount-service": ["random-profiles", 40],
  "battle-amount-scaling-service": ["rate-factors", 12],
});
export function battleAmountComponentSpecs(resourceId) {
  const spec = SPECS[resourceId];
  if (!spec) throw new Error("unknown battle amount parameter owner");
  return [{fragmentId: `${resourceId}.${spec[0]}`, length: spec[1]}];
}
export function battleAmountAssetSchema(resourceId) {
  battleAmountComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${resourceId}`;
}
function hasBattleAmountParameterShape(doc) {
  if (doc?.module_id === "battle-random-amount-service") return Array.isArray(doc.random_amount_profiles);
  return doc?.module_id === "battle-amount-scaling-service" && Array.isArray(doc.records)
    && !Object.hasOwn(doc, "runtime_rate_factor_values_1_through_12")
    && doc.records.every(row => row.factor_denominator === 256 && !Object.hasOwn(row, "raw_hex"));
}
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function validateBattleAmountAsset(asset, original) {
  const resourceId = asset?.resource_id;
  const schema = battleAmountAssetSchema(resourceId);
  const random = resourceId === "battle-random-amount-service";
  const key = random ? "random_amount_profiles" : "records";
  const fields = random ? ["minimum", "exclusive_random_span"] : ["factor_numerator"];
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.schema === schema && candidate.resource_id === resourceId
      && candidate.edit_policy === "mutable" && doc?.schema === schema && doc.module_id === resourceId,
    "battle amount identity/policy drift");
    requireValue(hasBattleAmountParameterShape(doc), "倍率表结构已更新；请明确恢复旧草稿后重新编辑");
    requireValue(doc.owned_byte_count === (random ? 84 : 113) && doc[key].length === (random ? 20 : 12)
      && (random || doc.record_count === 12), "battle amount record count drift");
    doc[key].forEach((row, index) => {
      requireValue(random ? row.profile_index === index && row.selector_even_offset === index * 2
        : row.id === index + 1 && row.handle === `${resourceId}:${(index + 1).toString(16).toUpperCase().padStart(2, "0")}`,
      "battle amount record identity/order drift");
      for (const field of fields) requireValue(Number.isInteger(row[field]) && row[field] >= 0 && row[field] <= 255,
        `${field}: 必须是 0..255 的整数`);
    });
  }
  const expected = structuredClone(original);
  asset.document[key].forEach((row, index) => {
    for (const field of fields) expected.document[key][index][field] = row[field];
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改随机量参数或倍率分子，不能修改执行体、指针及证据");
}

function encodeValues(resourceId, payload) {
  return [{fragment_id: battleAmountComponentSpecs(resourceId)[0].fragmentId,
    payload: Uint8Array.from(payload), relocations: []}];
}

const SCALING_OWNER = "battle-amount-scaling-service";
const scalingHandle = id => `${SCALING_OWNER}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const scalingFields = Array.from({length: 12}, (_, index) => [scalingHandle(index + 1), "factor_numerator"]);
const scalingCodec = byteTableFieldObjectCodec({resourceId: SCALING_OWNER,
  fragmentId: battleAmountComponentSpecs(SCALING_OWNER)[0].fragmentId, fields: scalingFields});
export const battleScalingFieldObjectCodec = Object.freeze({
  ...scalingCodec,
  objects: () => scalingCodec.objects().map(definition => ({...definition,
    id: `${SCALING_OWNER}.rate-factors`, label: "战斗倍率分子",
    editor: {kind: "numeric-table", rows: scalingFields.map(([handle]) => handle),
      columns: [{name: "factor_numerator", label: "倍率分子", min: 0, max: 255}]},
  })),
});
export function battleScalingFieldDescriptions(document) {
  requireValue(document?.module_id === SCALING_OWNER && Array.isArray(document.records)
    && document.records.length === 12, "battle scaling field collection drift");
  const seen = new Set();
  return document.records.map((row, index) => {
    requireValue(Number.isInteger(row.id) && row.id >= 1 && row.id <= 12
      && row.handle === scalingHandle(row.id) && !seen.has(row.id), "battle scaling field identity drift");
    seen.add(row.id);
    return {resourceId: SCALING_OWNER, entityHandle: row.handle, fieldName: "factor_numerator",
      recordId: row.id, documentPath: ["records", index, "factor_numerator"],
      defaultValue: row.factor_numerator, fragmentId: battleAmountComponentSpecs(SCALING_OWNER)[0].fragmentId,
      offsetInFragment: row.id - 1, byteLength: 1};
  });
}

export function validateBattleScalingFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(battleScalingFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]);
    const field = descriptions.get(key);
    requireValue(row.resource_id === SCALING_OWNER && field && !seen.has(key), "battle scaling override identity drift");
    seen.add(key);
    candidate.document.records[field.documentPath[1]].factor_numerator = row.value;
  }
  // Keep the existing whole-candidate identity, immutable evidence and range checks.
  validateBattleAmountAsset(candidate, original);
}

export function encodeBattleScalingFields(fields, {defaults = false} = {}) {
  const positions = new Map(scalingFields.map(([handle], index) => [handle, index]));
  const values = new Array(12), seen = new Set();
  for (const field of fields) {
    const index = positions.get(field.entityHandle);
    requireValue(field.resourceId === SCALING_OWNER && field.fieldName === "factor_numerator"
      && index !== undefined && !seen.has(index), "battle scaling build field identity drift");
    seen.add(index);
    const value = defaults ? field.defaultValue : field.value;
    requireValue(Number.isInteger(value) && value >= 0 && value <= 255, "battle scaling build value drift");
    values[index] = value;
  }
  requireValue(seen.size === 12, "battle scaling build fields incomplete");
  return encodeValues(SCALING_OWNER, values);
}

const RANDOM_OWNER = "battle-random-amount-service";
const randomFields = ["minimum", "exclusive_random_span"];
const randomHandle = id => `${RANDOM_OWNER}:profile:${id}`;
const randomIdentities = Array.from({length: 20}, (_, id) => randomFields.map(name => [randomHandle(id), name])).flat();
const randomCodec = byteTableFieldObjectCodec({resourceId: RANDOM_OWNER,
  fragmentId: battleAmountComponentSpecs(RANDOM_OWNER)[0].fragmentId, fields: randomIdentities});
export const battleRandomFieldObjectCodec = Object.freeze({
  ...randomCodec,
  objects: () => randomCodec.objects().map(definition => ({...definition,
    id: `${RANDOM_OWNER}.random-profiles`, label: "战斗随机量参数",
    editor: {kind: "numeric-table", rows: [...new Set(randomIdentities.map(([handle]) => handle))],
      columns: [
        {name: "minimum", label: "最低值", min: 0, max: 255},
        {name: "exclusive_random_span", label: "随机跨度", min: 0, max: 255},
      ]},
  })),
});
export function battleRandomFieldDescriptions(document) {
  requireValue(document?.module_id === RANDOM_OWNER && document.random_amount_profiles?.length === 20,
    "battle random field collection drift");
  const seen = new Set();
  return document.random_amount_profiles.flatMap((row, index) => {
    const id = row.profile_index;
    requireValue(Number.isInteger(id) && id >= 0 && id < 20 && !seen.has(id)
      && row.selector_even_offset === id * 2, "battle random field identity drift");
    seen.add(id);
    return randomFields.map((fieldName, column) => ({resourceId: RANDOM_OWNER,
      entityHandle: randomHandle(id), fieldName, recordId: id,
      documentPath: ["random_amount_profiles", index, fieldName], defaultValue: row[fieldName],
      fragmentId: battleAmountComponentSpecs(RANDOM_OWNER)[0].fragmentId,
      offsetInFragment: id * 2 + column, byteLength: 1}));
  });
}
export function validateBattleRandomFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(battleRandomFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]);
    const field = descriptions.get(key);
    requireValue(row.resource_id === RANDOM_OWNER && field && !seen.has(key), "battle random override identity drift");
    seen.add(key);
    candidate.document.random_amount_profiles[field.documentPath[1]][field.fieldName] = row.value;
  }
  validateBattleAmountAsset(candidate, original);
}
export function encodeBattleRandomFields(fields, {defaults = false} = {}) {
  const positions = new Map(randomIdentities.map((key, index) => [JSON.stringify(key), index]));
  const values = new Array(40), seen = new Set();
  for (const field of fields) {
    const index = positions.get(JSON.stringify([field.entityHandle, field.fieldName]));
    requireValue(field.resourceId === RANDOM_OWNER && index !== undefined && !seen.has(index),
      "battle random build field identity drift");
    seen.add(index);
    const value = defaults ? field.defaultValue : field.value;
    requireValue(Number.isInteger(value) && value >= 0 && value <= 255, "battle random build value drift");
    values[index] = value;
  }
  requireValue(seen.size === 40, "battle random build fields incomplete");
  return encodeValues(RANDOM_OWNER, values);
}
