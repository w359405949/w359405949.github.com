// @editor-module 从发布文档准备人物与载具槽位形状，提供装备掩码草稿。
import {db} from "./project-db.js";

// Published slot declarations never come from a resolved Working document.
// Scope the prepared documents to the project object, just like view-data.
const documents = new WeakMap();
const paths = {
  "vehicle-preset": "game/data/vehicles.json",
  "character-initial-record": "game/data/characters.json",
};

export async function prepareEquipmentSlotShape(schema, project) {
  if (!Object.hasOwn(paths, schema)) return;
  const value = await db.getPackageDocument(paths[schema]);
  if (!value) throw new Error(`${schema} 缺少发布槽位结构`);
  let prepared = documents.get(project);
  if (!prepared) documents.set(project, prepared = new Map());
  prepared.set(schema, value);
}

export function vehicleSlotShape(project, presetId) {
  const preset = documents.get(project)?.get("vehicle-preset")?.presets
    .find(entry => Number(entry.preset_id) === Number(presetId));
  if (!Array.isArray(preset?.equipped_mask?.slots) ||
      !Array.isArray(preset?.mount_mask?.slots)) {
    throw new Error(`战车 ${presetId} 缺少发布槽位结构`);
  }
  return preset;
}

export function characterSlotShape(project) {
  const slots = documents.get(project)?.get("character-initial-record")?.equipment_slot_flags?.slots;
  if (!Array.isArray(slots)) throw new Error("人物缺少发布槽位结构");
  return slots;
}

// Missing values remain missing; neither opening nor editing another field
// may manufacture a mask. A whole-record Original reset can restore it.
export function draftEquipmentMask(value) {
  return value === undefined || value === null ? null : Number(value);
}

export function vehicleMountableSlots(item) {
  return Array.isArray(item?.mountable_slots) ? item.mountable_slots : [];
}

export function vehicleAssignedSlot(project, draft, column, item) {
  const candidates = vehicleMountableSlots(item);
  const selected = draft.slot_assignments?.[column];
  if (selected !== null && selected !== undefined) return candidates.includes(selected) ? selected : null;
  const initial = vehicleSlotShape(project, draft.preset_id).loadout[column]?.slot_id;
  return candidates.includes(initial) ? initial : null;
}
