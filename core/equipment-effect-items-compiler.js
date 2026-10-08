// @editor-module 校验装备特效的三项物品引用，编码为逻辑片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const EQUIPMENT_EFFECT_ITEMS_COMPILER_ID = "equipment-effect-items/v1";
export const EQUIPMENT_EFFECT_ITEMS_COMPONENT_CODEC = "metalmaxcn.equipment-effect-items";
const OWNER = "role-equipment-derived";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function equipmentEffectItemsComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown equipment-effect owner");
  return [{fragmentId: `${OWNER}.special-effect-item-ids`, length: 3}];
}
export function equipmentEffectItemsAssetSchema(resourceId) {
  equipmentEffectItemsComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateEquipmentEffectItemsAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === equipmentEffectItemsAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === equipmentEffectItemsAssetSchema(OWNER), "equipment-effect identity/policy drift");
    requireValue(doc.record_count === 3 && Array.isArray(doc.records) && doc.records.length === 3,
      "expected three equipment effects");
    const ids = doc.records.map(row => {
      const match = typeof row.item_reference === "string" && /^human-item:([0-9A-F]{2})$/u.exec(row.item_reference);
      requireValue(match, "必须选择人物物品");
      const id = Number.parseInt(match[1], 16);
      requireValue(id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)), "invalid human-item identity");
      return id;
    });
    requireValue(new Set(ids).size === 3, "三项效果的物品不能重复");
  }
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    expected.document.records[index].item_reference = row.item_reference;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改物品引用，效果身份、顺序与源地址不能修改");
}

const EFFECTS = ["sonic-and-mental-wave-resistance", "fire-resistance", "cold-resistance"];
const HANDLES = EFFECTS.map(effect => `${OWNER}:effect:${effect}`);
const ITEM_CANDIDATES = Object.freeze({resourceId: "item-entry", documentPath: ["records"],
  filter: {path: ["id"], values: [
    ...Array.from({length: 0x40}, (_, index) => index + 1),
    ...Array.from({length: 0xCA - 0x99 + 1}, (_, index) => index + 0x99),
  ]},
  value: {path: ["id"], hex: 2, prefix: "human-item:"}, label: ["id_hex", "name"]});
export function equipmentEffectItemsFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document.records?.length === 3, "equipment field collection drift");
  const seen = new Set();
  return document.records.map((row, index) => {
    const position = HANDLES.indexOf(row.handle);
    requireValue(position >= 0 && row.effect_reference === row.handle && !seen.has(position), "equipment field identity drift");
    seen.add(position);
    return {resourceId: OWNER, entityHandle: row.handle, fieldName: "item_reference",
      documentPath: ["records", index, "item_reference"], defaultValue: row.item_reference,
      fragmentId: equipmentEffectItemsComponentSpecs(OWNER)[0].fragmentId, offsetInFragment: position, byteLength: 1};
  });
}
export function validateEquipmentEffectItemsFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, equipmentEffectItemsFieldDescriptions, validateEquipmentEffectItemsAsset);
}
export function encodeEquipmentEffectItemsFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(3), seen = new Set(), items = new Set();
  for (const field of fields) {
    const index = HANDLES.indexOf(field.entityHandle), value = defaults ? field.defaultValue : field.value;
    const match = typeof value === "string" && /^human-item:([0-9A-F]{2})$/u.exec(value);
    requireValue(field.resourceId === OWNER && field.fieldName === "item_reference" && index >= 0 && !seen.has(index) && match,
      "equipment build field identity/value drift");
    const id = Number.parseInt(match[1], 16);
    requireValue(id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)) && !items.has(id), "invalid or duplicate equipment item");
    seen.add(index); items.add(id); payload[index] = id;
  }
  requireValue(seen.size === 3, "equipment build fields incomplete");
  return [{fragment_id: equipmentEffectItemsComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}

function equipmentFieldPosition(field) {
  const index = HANDLES.indexOf(field.entityHandle);
  requireValue(field.resourceId === OWNER && field.fieldName === "item_reference" && index >= 0,
    "equipment build field identity drift");
  return index;
}
export function equipmentEffectItemsObjects() {
  const fragmentId = equipmentEffectItemsComponentSpecs(OWNER)[0].fragmentId;
  return [{id: fragmentId, label: "特殊效果物品引用", fragmentIds: [fragmentId],
    fields: HANDLES.map(handle => [handle, "item_reference"]),
    editor: {kind: "numeric-table", rows: HANDLES, rowLabels: HANDLES,
      columns: [{name: "item_reference", label: "物品引用",
        candidates: ITEM_CANDIDATES,
        semantic: {kind: "reference", targetModule: "item-entry"}}]}}];
}
export function serializeEquipmentEffectItemField(field) {
  equipmentFieldPosition(field);
  const match = typeof field.value === "string" && /^human-item:([0-9A-F]{2})$/u.exec(field.value);
  const id = match && Number.parseInt(match[1], 16);
  requireValue(match && id >= 1 && (id <= 0x40 || (id >= 0x99 && id <= 0xCA)), "invalid equipment item");
  return new Uint8Array([id]);
}
export function validateEquipmentEffectItemsPreimage(fields, fragmentId, baseline) {
  requireValue(fragmentId === equipmentEffectItemsComponentSpecs(OWNER)[0].fragmentId
    && baseline.length === HANDLES.length && fields.length === HANDLES.length, "equipment Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const index = equipmentFieldPosition(field);
    requireValue(!seen.has(index), "equipment Origin field identity drift");
    requireValue(field.defaultValue === `human-item:${baseline[index].toString(16).toUpperCase().padStart(2, "0")}`,
      "equipment Origin differs from bound baseline");
    seen.add(index);
  }
}
