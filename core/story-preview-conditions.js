// @editor-module 剧情分支条件与显式预览输入。
export const STORY_BRANCH_OPERATIONS = Object.freeze({
  0x22: {operation: "branch-if-party-not-riding", fidelity: "exact"},
  0x2A: {operation: "branch-if-party-member-alive", branch_operand_index: 1, fidelity: "exact"},
  0x5A: {operation: "branch-if-party-descriptor-absent", branch_operand_index: 1, fidelity: "exact"},
  0x5B: {operation: "branch-if-object-outside-scene", branch_operand_index: 1, fidelity: "exact"},
  0x5C: {operation: "branch-if-investigation-acquired", branch_operand_index: 1, fidelity: "exact"},
});

// previewConditions 只投影为 VM 参数；未指定的字段沿用调用方的预览输入。
export function storyPreviewRuntimeOverrides(overrides, defaults) {
  const conditions = overrides?.previewConditions;
  if (!conditions) return overrides;
  const result = {...overrides};
  const members = (overrides.partyMembers || defaults).map(member => ({...member}));
  const slots = new Set(overrides.partySlots ?? members.filter(member => member.defaultRendered).map(member => member.slot));
  for (const condition of conditions.party || []) {
    const member = members.find(item => item.slot === condition.slot);
    if (!member) continue;
    if (condition.state !== undefined) {
      if (!["present", "absent", "dead"].includes(condition.state)) throw new TypeError("剧情预览队员状态无效");
      if (condition.state === "absent") slots.delete(member.slot);
      else slots.add(member.slot);
      member.status = condition.state === "dead" ? 0xFF : 0;
    }
    for (const field of ["status", "level", "currentHp", "maxHp", "ridingVehicle", "vehicleSlot"])
      if (condition[field] !== undefined) member[field] = condition[field];
  }
  if (conditions.ridingVehicle !== undefined) for (const member of members) {
    member.ridingVehicle = Boolean(conditions.ridingVehicle && slots.has(member.slot));
    if (member.ridingVehicle && member.vehicleSlot === undefined) member.vehicleSlot = member.slot;
  }
  result.partyMembers = members;
  result.partySlots = [...slots];
  for (const field of ["eventFlags", "investigationBits", "partyDescriptors", "objectScenes",
    "choices", "serviceResults", "partyInventories", "partyEquipment", "runtimeResultD5",
    "fieldUiTarget", "playerMapX", "playerMapY", "playerDirection"])
    if (conditions[field] !== undefined) result[field] = conditions[field];
  if (conditions.money !== undefined) result.partyMoney = conditions.money;
  return result;
}
