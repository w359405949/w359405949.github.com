// @editor-module 剧情队伍与物品处理器的预览语义。
export const STORY_PARTY_ITEM_OPERATIONS = Object.freeze({
  0x23: {operation: "join-party-and-remove-scene-actor", fidelity: "partial",
    sound_command: 0x73},
  0x39: {operation: "find-party-item-and-branch", fidelity: "exact",
    branch_operand_index: 1},
  0x3A: {operation: "replace-party-item", fidelity: "partial",
    missing: "out-of-inventory-write-$65ad"},
  0x49: {operation: "grant-party-item-and-branch", fidelity: "partial",
    branch_operand_index: 1, missing: "vehicle-overload-confirmation"},
  0x60: {operation: "push-temporary-field-entity", fidelity: "partial"},
});

// eight-slot-inventory-service 的 B361 从最后一格倒序检查在队成员。
export function findStoryPartyItem(inventories, partySlots, itemId) {
  for (let slot = 2; slot >= 0; slot -= 1) {
    if (!partySlots.has(slot)) continue;
    for (let index = 7; index >= 0; index -= 1) {
      if (inventories[slot][index] === itemId) {
        return {d5: 0, partySlot: slot, itemSlot: index, offset: slot * 8 + index};
      }
    }
  }
  return {d5: 1, partySlot: null, itemSlot: null, offset: 0xFF};
}

// $B388 用 $B361 的倒序结果替换物品，未命中时 Y=$FF 的写入越出背包。
export function replaceStoryPartyItem(inventories, partySlots, itemId, replacement) {
  const result = findStoryPartyItem(inventories, partySlots, itemId);
  if (result.d5 === 0) inventories[result.partySlot][result.itemSlot] = replacement;
  return {...result, replacement, replaced: result.d5 === 0,
    outsideInventory: result.d5 !== 0};
}

// $A126 先检查乘车成员，再按 $EDAB 检查容器末格。
export function grantStoryVehicleItem(vehicles, members, partySlots, itemId, initialD5,
  {weight = 0, acceptOverload = false} = {}) {
  let d5 = initialD5;
  if (!members.some(member => partySlots.has(member.slot) && member.ridingVehicle)) {
    return {d5, resultRecord: 0xAA, inserted: false};
  }
  for (let slot = 0; slot < 3; slot += 1) {
    if (!partySlots.has(slot)) continue;
    const member = members.find(member => member.slot === slot);
    if (!member?.ridingVehicle || !(member.vehicleSlot >= 0 && member.vehicleSlot < 8)) continue;
    const vehicle = vehicles[member.vehicleSlot];
    const equipment = itemId < 0x99;
    const container = equipment ? vehicle.equipmentCargo : vehicle.inventory;
    d5 = container[7] === 0 ? 0 : 1;
    if (d5) continue;
    const overloaded = equipment && weight > vehicle.remainingWeight;
    if (overloaded && !acceptOverload) {d5 = 1; continue;}
    const target = equipment ? vehicle.equipment : container;
    const itemSlot = target.indexOf(0);
    if (itemSlot < 0) return {d5, inserted: false, missing: "vehicle-equipment-overflow"};
    target[itemSlot] = itemId;
    if (equipment) vehicle.remainingWeight -= weight;
    return {d5, resultRecord: 3, partySlot: slot, vehicleSlot: member.vehicleSlot,
      itemSlot, inserted: true, overloaded, container: equipment ? "vehicle-equipment" : "vehicle-inventory"};
  }
  return {d5, resultRecord: 4, inserted: false};
}

// item-acquisition-service 的 A126 逐人检查末格，A1F7 插入首个零值。
export function grantStoryPartyItem(containers, partySlots, itemId, initialD5) {
  let d5 = initialD5;
  for (let slot = 0; slot < 3; slot += 1) {
    if (!partySlots.has(slot)) continue;
    d5 = containers[slot][7] === 0 ? 0 : 1;
    if (d5 !== 0) continue;
    const itemSlot = containers[slot].indexOf(0);
    containers[slot][itemSlot] = itemId;
    return {d5, resultRecord: 3, partySlot: slot, itemSlot, inserted: true};
  }
  return {d5, resultRecord: 4, partySlot: null, itemSlot: null, inserted: false};
}
