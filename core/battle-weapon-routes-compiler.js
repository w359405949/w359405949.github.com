// @editor-module 将战斗结果脚本与特殊安放怪物引用编码成独立逻辑片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const BATTLE_WEAPON_ROUTES_COMPILER_ID = "battle-weapon-routes/v1";
export const BATTLE_WEAPON_ROUTES_COMPONENT_CODEC = "metalmaxcn.battle-weapon-routes";
const OWNER = "battle-engine";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function battleWeaponRoutesComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown weapon route owner");
  return [{fragmentId: `${OWNER}.weapon-result-routes`, length: 3},
    {fragmentId: `${OWNER}.special-monster-placement-ids`, length: 18}];
}
export function battleWeaponRoutesAssetSchema(resourceId) {
  battleWeaponRoutesComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateBattleWeaponRoutesAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === battleWeaponRoutesAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === battleWeaponRoutesAssetSchema(OWNER), "weapon route identity/policy drift");
    const allowed = doc.weapon_result_candidates;
    requireValue(Array.isArray(allowed) && allowed.length > 0 && allowed.every((row, index) =>
      Number.isInteger(row?.id) && row.id >= 1 && row.id <= 255
      && row.handle === `battle-result-script:${row.id.toString(16).toUpperCase().padStart(2, "0")}`
      && (!index || row.id > allowed[index - 1].id)), "invalid published weapon result candidates");
    const handles = new Set(allowed.map(row => row.handle));
    const monsterIds = doc.placement_monster_ids;
    requireValue(Array.isArray(monsterIds) && monsterIds.length > 0 && monsterIds.every((id, index) =>
      Number.isInteger(id) && id >= 0 && id <= 255 && (!index || id > monsterIds[index - 1])),
    "invalid published monster identities");
    const refs = doc.special_monster_placement?.monster_references;
    requireValue(Array.isArray(refs) && refs.length === 18, "expected eighteen placement references");
    refs.forEach(ref => requireValue(ref?.resource_id === "monster-profile"
      && Number.isInteger(ref.record_id) && monsterIds.includes(ref.record_id), "请选择已发布的怪物"));
    requireValue(Array.isArray(doc.weapon_result_routes) && doc.weapon_result_routes.length === 3,
      "expected three weapon routes");
    doc.weapon_result_routes.forEach((row, index) => {
      requireValue(row.route_id === index, "weapon route identity/order drift");
      requireValue(handles.has(row.result_reference), "请选择已发布的非零结果脚本（00 会回退到 95）");
    });
  }
  const expected = structuredClone(original);
  asset.document.weapon_result_routes.forEach((row, index) => {
    expected.document.weapon_result_routes[index].result_reference = row.result_reference;
  });
  asset.document.special_monster_placement.monster_references.forEach((ref, index) => {
    expected.document.special_monster_placement.monster_references[index].record_id = ref.record_id;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改结果引用与安放怪物名单，身份、候选与扫描参数不可修改");
}

export function battleWeaponRoutesFieldDescriptions(document) {
  const specs = battleWeaponRoutesComponentSpecs(document?.module_id), seen = new Set();
  requireValue(Array.isArray(document.weapon_result_routes) && document.weapon_result_routes.length === 3,
    "expected three weapon route fields");
  const fields = document.weapon_result_routes.map((row, index) => {
    requireValue(Number.isInteger(row.route_id) && row.route_id >= 0 && row.route_id < 3
      && !seen.has(row.route_id), "invalid weapon route field identity");
    seen.add(row.route_id);
    return {resourceId: OWNER, entityHandle: `${OWNER}:route:${row.route_id}`, fieldName: "result_reference",
      documentPath: ["weapon_result_routes", index, "result_reference"], defaultValue: row.result_reference,
      allowedReferences: document.weapon_result_candidates.map(candidate => candidate.handle),
      fragmentId: specs[0].fragmentId, offsetInFragment: row.route_id, byteLength: 1};
  });
  // The ordered placement list is one value. Positions within that value are
  // UI projections, not persistent record identities.
  fields.push({resourceId: OWNER, entityHandle: `${OWNER}:special-monster-placement`, fieldName: "monster_references",
    resetLabel: "特殊安放怪物名单（全部 18 项）",
    documentPath: ["special_monster_placement", "monster_references"],
    defaultValue: document.special_monster_placement.monster_references,
    allowedMonsterIds: document.placement_monster_ids,
    fragmentId: specs[1].fragmentId, offsetInFragment: 0, byteLength: specs[1].length});
  return fields;
}
export function validateBattleWeaponRoutesFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, battleWeaponRoutesFieldDescriptions, validateBattleWeaponRoutesAsset);
}
export function encodeBattleWeaponRoutesFields(fields, {defaults = false} = {}) {
  const supplied = new Map();
  for (const field of fields) {
    requireValue(field.resourceId === OWNER && !supplied.has(field.entityHandle), "invalid weapon build field identity");
    supplied.set(field.entityHandle, field);
  }
  const payload = Array.from({length: 3}, (_, routeId) => {
    const handle = `${OWNER}:route:${routeId}`, field = supplied.get(handle);
    const value = defaults ? field?.defaultValue : field?.value;
    requireValue(field?.fieldName === "result_reference" && field.allowedReferences.includes(value),
      "请选择已发布的非零结果脚本（00 会回退到 95）");
    supplied.delete(handle);
    return Number.parseInt(value.split(":")[1], 16);
  });
  const handle = `${OWNER}:special-monster-placement`, field = supplied.get(handle);
  const refs = defaults ? field?.defaultValue : field?.value;
  requireValue(field?.fieldName === "monster_references" && Array.isArray(refs) && refs.length === 18,
    "expected eighteen placement field references");
  const placement = refs.map(ref => {
    requireValue(ref?.resource_id === "monster-profile" && Number.isInteger(ref.record_id)
      && field.allowedMonsterIds.includes(ref.record_id), "请选择已发布的怪物");
    return ref.record_id;
  });
  supplied.delete(handle);
  requireValue(supplied.size === 0, "unknown weapon build field");
  return [{fragment_id: battleWeaponRoutesComponentSpecs(OWNER)[0].fragmentId,
    payload: Uint8Array.from(payload), relocations: []},
  {fragment_id: battleWeaponRoutesComponentSpecs(OWNER)[1].fragmentId,
    payload: Uint8Array.from(placement), relocations: []}];
}

const routeHandles = Array.from({length: 3}, (_, index) => `${OWNER}:route:${index}`);
const placementHandle = `${OWNER}:special-monster-placement`;
function weaponRouteFieldPosition(field) {
  const index = routeHandles.indexOf(field.entityHandle);
  requireValue(field.resourceId === OWNER && (index >= 0 && field.fieldName === "result_reference"
    || field.entityHandle === placementHandle && field.fieldName === "monster_references"), "invalid weapon build field identity");
  return index;
}
/** 怪物候选：控件候选与写入校验共用这一份声明。 */
const MONSTER_CANDIDATE_SOURCE = Object.freeze({resourceId: "monster-profile", documentPath: ["records"],
  value: ["id"], label: ["id_hex", "name"]});

/** 写入校验与控件候选同源：安放名单是一张表，按 elementPath 逐条比。 */
export function battleWeaponRoutesReferenceRule(field) {
  return field?.fieldName === "monster_references"
    ? {source: MONSTER_CANDIDATE_SOURCE, elementPath: ["record_id"]} : null;
}

export function battleWeaponRoutesObjects() {
  return battleWeaponRoutesComponentSpecs(OWNER).map((spec, index) => index === 0
    ? {id: spec.fragmentId, label: "武器结果脚本", fragmentIds: [spec.fragmentId],
      fields: routeHandles.map(handle => [handle, "result_reference"]),
      editor: {kind: "reference-table", rows: routeHandles,
        rowLabels: routeHandles.map((_, route) => `路线 ${route}`),
        columns: [{name: "result_reference", label: "结果脚本",
          semantic: {kind: "reference", targetModule: "battle-result-script"},
          candidates: {resourceId: OWNER, documentPath: ["weapon_result_candidates"],
            value: ["handle"], label: ["handle"]}}]}}
    : {id: spec.fragmentId, label: "特殊安放怪物名单", fragmentIds: [spec.fragmentId],
      fields: [[placementHandle, "monster_references"]],
      // 名单是一个值；18 个位置只是这一列的投影。
      editor: {kind: "reference-table",
        rows: Array.from({length: 18}, (_, slot) => ({handle: placementHandle, element: slot})),
        rowLabels: Array.from({length: 18}, (_, slot) => `安放 ${slot + 1}`),
        columns: [{name: "monster_references", label: "怪物", element: {path: ["record_id"]},
          semantic: {kind: "reference", targetModule: "monster-profile"},
          candidates: MONSTER_CANDIDATE_SOURCE}]}});
}
export function serializeBattleWeaponRouteField(field) {
  const index = weaponRouteFieldPosition(field), value = field.value;
  if (index >= 0) {
    const match = typeof value === "string" && /^battle-result-script:([0-9A-F]{2})$/u.exec(value);
    requireValue(match && field.allowedReferences.includes(value), "请选择已发布的非零结果脚本（00 会回退到 95）");
    return new Uint8Array([Number.parseInt(match[1], 16)]);
  }
  requireValue(Array.isArray(value) && value.length === 18, "expected eighteen placement field references");
  return Uint8Array.from(value.map(ref => {
    requireValue(ref?.resource_id === "monster-profile" && Number.isInteger(ref.record_id)
      && field.allowedMonsterIds.includes(ref.record_id), "请选择已发布的怪物");
    return ref.record_id;
  }));
}
export function validateBattleWeaponRoutesPreimage(fields, fragmentId, baseline) {
  const component = battleWeaponRoutesComponentSpecs(OWNER).findIndex(spec => spec.fragmentId === fragmentId);
  requireValue(component >= 0 && baseline.length === (component === 0 ? 3 : 18)
    && fields.length === (component === 0 ? 3 : 1), "weapon Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const index = weaponRouteFieldPosition(field);
    requireValue((component === 0 ? index >= 0 : index === -1) && !seen.has(index), "weapon Origin field identity drift");
    const expected = component === 0 ? `battle-result-script:${baseline[index].toString(16).toUpperCase().padStart(2, "0")}`
      : Array.from(baseline, record_id => ({resource_id: "monster-profile", record_id}));
    requireValue(canonicalJsonEqual(field.defaultValue, expected), "weapon Origin differs from bound baseline");
    seen.add(index);
  }
}
