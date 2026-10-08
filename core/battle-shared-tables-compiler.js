// @editor-module 编码战斗共享布局与概率阈值表，不决定 ROM 放置。
// One value per physical table entry, including the entry shared by two roles.
// Placement belongs exclusively to the target binding and RomLinker.
import {canonicalJsonEqual} from "./project-store-values.js";
import {byteTableFieldObjectCodec} from "./field-object.js";

export const BATTLE_SHARED_TABLES_COMPILER_ID = "battle-shared-tables/v1";
export const BATTLE_SHARED_TABLES_COMPONENT_CODEC = "metalmaxcn.battle-shared-table";
const SPECS = Object.freeze({
  "battle-party-vertical-layout": ["shared-party-y-origins", 6],
  "battle-probability-thresholds": ["status-and-evasion-threshold-union", 8],
});
const ROLES = Object.freeze({
  "battle-party-vertical-layout": [
    "队伍槽位 0 的 Y 原点", "队伍槽位 1 的 Y 原点",
    "队伍槽位 2 的 Y 原点；在场人数 0 的 Y 基线",
    "在场人数 1 的 Y 基线", "在场人数 2 的 Y 基线", "在场人数 3 的 Y 基线",
  ],
  "battle-probability-thresholds": [
    "怪物状态抗性档 0 的阈值", "怪物状态抗性档 1 的阈值", "怪物状态抗性档 2 的阈值",
    "怪物状态抗性档 3 的阈值；闪避档 0 的阈值",
    "闪避档 1 的阈值", "闪避档 2 的阈值", "闪避档 3 的阈值", "闪避档 4 的阈值",
  ],
});

export function battleSharedTableComponentSpecs(resourceId) {
  const spec = SPECS[resourceId];
  if (!spec) throw new Error("unknown battle shared table");
  return [{fragmentId: `${resourceId}.${spec[0]}`, length: spec[1]}];
}

export function battleSharedTableAssetSchema(resourceId) {
  battleSharedTableComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${resourceId}`;
}

/** Build the semantic publication from upstream ROM bytes and their owner source. */
export function buildBattleSharedTableDocument(resourceId, raw, source) {
  const [spec] = battleSharedTableComponentSpecs(resourceId);
  const values = Array.from(raw);
  if (values.length !== spec.length) throw new Error("battle shared table length drift");
  return {owned_byte_count: spec.length,
    parameters: values.map((value, index) => ({role: ROLES[resourceId][index], value})),
    writeback_components: [{fragment_id: spec.fragmentId, source, fields: ["parameters[*].value"]}],
    source};
}

function hasBattleSharedTableShape(doc) {
  return Boolean(doc && Array.isArray(doc.parameters) && canonicalJsonEqual(Object.keys(doc).sort(),
    ["schema", "module_id", "owned_byte_count", "parameters", "source", "writeback_components"].sort()));
}

function validateBattleSharedTableAsset(asset, original) {
  const resourceId = asset?.resource_id;
  const schema = battleSharedTableAssetSchema(resourceId);
  const [spec] = battleSharedTableComponentSpecs(resourceId);
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    if (candidate?.schema !== schema || candidate.resource_id !== resourceId ||
        candidate.edit_policy !== "mutable" || doc?.schema !== schema || doc.module_id !== resourceId ||
        doc.owned_byte_count !== spec.length || !hasBattleSharedTableShape(doc) ||
        doc.parameters.length !== spec.length ||
        !canonicalJsonEqual(doc.parameters.map(row => row.role), ROLES[resourceId])) {
      throw new Error("战斗共享表结构已更新；旧草稿须明确恢复原始值后重新编辑");
    }
    for (const row of doc.parameters) {
      if (!canonicalJsonEqual(Object.keys(row).sort(), ["role", "value"]) ||
          typeof row.role !== "string" || !row.role ||
          !Number.isInteger(row.value) || row.value < 0 || row.value > 255) {
        throw new Error("共享表参数必须是 0..255 的整数");
      }
    }
  }
  const expected = structuredClone(original);
  asset.document.parameters.forEach((row, index) => { expected.document.parameters[index].value = row.value; });
  if (!canonicalJsonEqual(expected, asset)) throw new Error("共享表仅允许修改参数值");
}

// Semantic identities survive both display reordering and changes to role labels.
// The two shared entries deliberately have one identity, not one per consumer.
const FIELD_IDS = Object.freeze({
  "battle-party-vertical-layout": ["party-slot-0", "party-slot-1", "party-slot-2-and-count-0",
    "present-count-1", "present-count-2", "present-count-3"],
  "battle-probability-thresholds": ["status-tier-0", "status-tier-1", "status-tier-2",
    "status-tier-3-and-evasion-tier-0", "evasion-tier-1", "evasion-tier-2", "evasion-tier-3", "evasion-tier-4"],
});
export function battleSharedTableFieldObjectCodec(resourceId) {
  const fragmentId = battleSharedTableComponentSpecs(resourceId)[0].fragmentId;
  const fields = FIELD_IDS[resourceId].map(id => [`${resourceId}:${id}`, "value"]);
  const codec = byteTableFieldObjectCodec({resourceId, fragmentId, fields});
  const labels = {
    "battle-party-vertical-layout": "战斗队伍垂直布局 · Y 原点",
    "battle-probability-thresholds": "战斗概率阈值",
  };
  return Object.freeze({...codec, objects: () => [{id: fragmentId, label: labels[resourceId],
    fragmentIds: [fragmentId], fields, editor: {kind: "numeric-table",
      rows: fields.map(([entityHandle]) => entityHandle),
      columns: [{name: "value", label: "值", min: 0, max: 255}]}}]});
}
function requireField(condition, message) {if (!condition) throw new TypeError(message);}
export function battleSharedTableFieldDescriptions(document) {
  const resourceId = document?.module_id, [spec] = battleSharedTableComponentSpecs(resourceId);
  requireField(document.parameters?.length === spec.length, "shared table field collection drift");
  const seen = new Set();
  return document.parameters.map((row, index) => {
    const position = ROLES[resourceId].indexOf(row.role);
    requireField(position >= 0 && !seen.has(position), "shared table field identity drift");
    seen.add(position);
    return {resourceId, entityHandle: `${resourceId}:${FIELD_IDS[resourceId][position]}`, fieldName: "value",
      documentPath: ["parameters", index, "value"], defaultValue: row.value,
      fragmentId: spec.fragmentId, offsetInFragment: position, byteLength: 1};
  });
}
export function validateBattleSharedTableFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(battleSharedTableFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    requireField(row.resource_id === original.resource_id && field && !seen.has(key), "shared table override identity drift");
    seen.add(key); candidate.document.parameters[field.documentPath[1]].value = row.value;
  }
  validateBattleSharedTableAsset(candidate, original);
}
export function encodeBattleSharedTableFields(fields, {defaults = false} = {}) {
  const resourceId = fields[0]?.resourceId, [spec] = battleSharedTableComponentSpecs(resourceId);
  const positions = new Map(FIELD_IDS[resourceId].map((id, index) => [`${resourceId}:${id}`, index]));
  const payload = new Uint8Array(spec.length), seen = new Set();
  for (const field of fields) {
    const index = positions.get(field.entityHandle), value = defaults ? field.defaultValue : field.value;
    requireField(field.resourceId === resourceId && field.fieldName === "value"
      && index !== undefined && !seen.has(index), "shared table build identity drift");
    requireField(Number.isInteger(value) && value >= 0 && value <= 255, "shared table build value drift");
    seen.add(index); payload[index] = value;
  }
  requireField(seen.size === spec.length, "shared table build fields incomplete");
  return [{fragment_id: spec.fragmentId, payload, relocations: []}];
}
