// @editor-module 库存事务按原生处理器保留配对状态与装备派生字段。
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {roleEquipmentStats} from '../core/role-equipment-derived.js';

export function carriedInventoryCount(items) {
  const first = items.indexOf(0);
  return first < 0 ? items.length : first;
}

export function removeCarriedItem(items, index) {
  if (items.length !== 8 || !Number.isInteger(index) || index < 0 || index >= carriedInventoryCount(items))
    throw new RangeError('所选道具不在当前八槽携带栏');
  const result = [...items];
  result.splice(index, 1); result.push(0);
  return result;
}

export const INVENTORY_TRANSACTION_EVIDENCE = 'project/evidence/reverse-engineering/inventory-transactions/observations.json';

export function creditedGold(gold, quote) {
  if (![gold, quote].every(value => Number.isInteger(value) && value >= 0 && value <= 0xFFFFFF))
    throw new RangeError('收购资金与报价须为 24 位无符号数');
  return Math.min((gold + quote) & 0xFFFFFF, 9999999);
}

export function inventoryStatusBranch(index, read) {
  if (!Number.isInteger(index) || index < 0 || index > 7)
    throw new RangeError('人物状态读取索引超出已确认字段');
  const field = index < 3 ? 'status' : index < 6 ? 'level' : 'strength';
  return Number(read(`role.${SERVICE_ROLES[index % 3]}.${field}`) === 255);
}

export function inventorySaleBranch(id, installed) {
  return id >= 0x91 && id < 0x99 ? 2 : Number(Boolean(installed));
}

export function inventoryRemoval({vehicle, object, category, index, read, items, effects, overlays}) {
  const path = suffix => `${object}.${suffix}`;
  const updates = [];
  const write = (suffix, value) => updates.push([path(suffix), value]);
  if (!vehicle || category) {
    const suffix = category ? 'inventory' : 'equipment';
    const values = vehicle ? Array.from({length: 8}, (_, slot) => read(path(`item.${slot}`))) : [...read(path(suffix))];
    const next = removeCarriedItem(values, index);
    if (vehicle) next.forEach((id, slot) => write(`item.${slot}`, id));
    else write(suffix, next);
    if (!vehicle && !category) {
      const tail = overlays?.descending_equipment_masks?.[index];
      if (!Number.isInteger(tail)) throw new TypeError('人物装备移位掩码未确认');
      const old = read(path('slot_flags')), flags = ((old << 1) & tail) | (old & (tail ^ 255));
      const stats = roleEquipmentStats({equipment: next, slot_flags: flags,
        ...Object.fromEntries(['strength', 'speed', 'vitality'].map(field => [field, read(path(field))]))}, id => {
        const value = items.find(row => row.id === id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
        if (!Number.isInteger(value)) throw new TypeError('人物装备攻防数值未确认');
        return value;
      });
      if (effects?.records?.length !== 3) throw new TypeError('人物装备特殊效果物品表未确认');
      let special = 0, armorSlot = 255;
      next.forEach((id, slot) => {
        if (!(flags & (0x80 >> slot)) || id >= 0x23) return;
        if (id >= 0x18 && id < 0x1D) armorSlot = slot;
        const effect = effects.records.findIndex(row => row.item_reference === `human-item:${id.toString(16).toUpperCase().padStart(2, '0')}`);
        if (effect >= 0) {
          const mask = overlays.zero_prefixed_ascending_bit_masks[effect + 1];
          if (!Number.isInteger(mask)) throw new TypeError('人物特殊效果位掩码未确认');
          special |= mask;
        }
      });
      write('slot_flags', flags);
      for (const [field, value] of Object.entries(stats)) write(field, value);
      write('equipment_special_effects_raw', special);
      const role = SERVICE_ROLES.indexOf(object.split('.').at(-1));
      const slots = [...read('entity_scene_object_slots')];
      slots[7 + role] = armorSlot === 255 ? 255 : role * 8 + armorSlot;
      updates.push(['entity_scene_object_slots', slots]);
      return {updates, armorSlot};
    }
    return {updates};
  }
  const mask = read(path('equipped_mask_raw'));
  if (mask & 3) throw new TypeError('第七、八设备槽安装标记超出已确认安装域');
  const rows = SERVICE_PARTS.flatMap((part, slot) => {
    const id = read(path(`equipment.${part}`));
    return id ? [{id, condition: read(path(`equipment_state.${part}`)), installed: Boolean(mask & (0x80 >> slot)), slot}] : [];
  });
  const selected = rows.findIndex(row => row.slot === index);
  if (selected < 0) throw new RangeError('所选设备不在当前紧缩列表');
  rows.splice(selected, 1);
  const slots = Array(8).fill(null);
  for (const row of rows.filter(row => row.installed)) slots[row.slot] = row;
  for (const row of rows.filter(row => !row.installed)) slots[slots.indexOf(null)] = row;
  let nextMask = 0;
  slots.forEach((row, slot) => {
    if (!row?.installed) return;
    const mask = overlays?.descending_bit_masks?.[slot];
    if (!Number.isInteger(mask)) throw new TypeError('设备安装位掩码未确认');
    nextMask |= mask;
  });
  SERVICE_PARTS.forEach((part, slot) => {
    const row = slots[slot];
    write(`equipment.${part}`, row?.id || 0);
    write(`equipment_state.${part}`, row?.condition || 0);
    write(`equipped.${part}`, Number(Boolean(nextMask & (0x80 >> slot))));
  });
  write('equipped_mask_raw', nextMask);
  return {updates};
}

export function commitInventoryRemoval(state, plan, put, object) {
  for (const [suffix, value] of plan.updates) put(state, suffix, value);
  if (plan.armorSlot !== undefined) {
    const role = SERVICE_ROLES.indexOf(object.split('.').at(-1));
    state.execution.armorSlots = {...state.execution.armorSlots,
      [role]: plan.armorSlot === 255 ? 255 : role * 8 + plan.armorSlot};
  }
}
