// @editor-module 原型路径条件只覆盖服务预览字段，不写 Working 或存档。
import {constructServicePreviewState, servicePreviewFields, SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';

const hex = id => id.toString(16).toUpperCase().padStart(2, '0');

export function genericShopParty(command, {fields, context}) {
  const prefix = `save.slot.${context.slot}.`;
  const roles = SERVICE_ROLES.flatMap((role, index) =>
    fields.object(`${prefix}role.${role}.present`).value ? [index] : []);
  const vehicles = [...fields.object(`${prefix}entity_scene_object_slots`).value.slice(0, 4)]
    .filter(vehicle => vehicle < 128);
  return {count: command.command_id <= 0x11 ? vehicles.length : roles.length,
    role: roles.includes(context.role) ? context.role : roles[0] ?? context.role,
    vehicle: vehicles.includes(context.vehicle) ? context.vehicle : vehicles[0] ?? context.vehicle};
}

export async function genericShopServicePreview(preview, {path, record, command, final, context,
  readFields, readDocument, readField}) {
  if (!path) return preview;
  const [rawFields, items, stock] = await Promise.all([
    readFields(), readDocument('item-entry'),
    readField('facility-config', record.id, 'slot:0'),
  ]);
  const fields = servicePreviewFields(preview, rawFields);
  const item = stock.value;
  const priceCode = (await readField('item-entry', `item-entry:item:${hex(item)}`, 'price.raw_code')).value;
  const price = items.equipment_editor.numeric_codes.find(row => row.raw_code === priceCode)?.value;
  const conditions = [];
  if (path === 'funds') conditions.push({id: 'prototype-money-low', label: '金钱不足：金钱临时设为 0', construct: e => e.put('gold', 0)});
  if (path === 'purchase') {
    if (Number.isSafeInteger(price)) conditions.push({id: 'prototype-money-enough', label: final ? '临时预览金钱提交：扣除当前报价' : '金钱达到当前商品报价',
      construct: e => e.put('gold', Math.max(Number(e.get('gold')), price) - (final ? price : 0))});
    conditions.push({id: 'prototype-capacity', label: '携带栏空位预览（原生映射未确认）', construct: e => {
      if (command.command_id >= 0x12) {
        const suffix = `role.${e.role}.inventory`, values = [...e.get(suffix)];
        if (!values.includes(0)) {values[0] = 0; e.put(suffix, values);}
      } else {
        const suffix = `vehicle.${e.vehicle}.equipment.generic_8`;
        e.put(suffix, 0);
      }
    }});
  }
  if (path === 'refused') {
    const candidates = items.records.filter(row => row.id > 0 && (row.price?.raw_code ?? row.price?.raw ?? 0) >= 0xE0);
    const domain = command.command_id >= 0x12 ? 'human-' : 'tank-';
    const refused = candidates.find(row => row.category?.id?.startsWith(domain)
      && row.category?.id === (domain === 'human-' ? 'human-weapon' : 'tank-main-gun'));
    if (refused) conditions.push({id: 'prototype-refused', label: '所选携带物临时换为价格哨兵物品', construct: e => {
      const index = preview.runtime_context?.sale_item_index ?? 0;
      if (command.command_id >= 0x12) {
        const suffix = `role.${e.role}.${preview.shop_menu.sale_item_bar || 'equipment'}`;
        const values = [...e.get(suffix)]; values[index] = refused.id; e.put(suffix, values);
      } else e.put(`vehicle.${e.vehicle}.equipment.${SERVICE_PARTS[index]}`, refused.id);
    }});
  }
  const result = constructServicePreviewState(preview, {fields, context}, conditions);
  const before = preview.service_preview_state || {values: {}, selection: {}, terminal: {}, conditions: []};
  result.service_preview_state = {values: {...before.values, ...result.service_preview_state.values},
    selection: {...before.selection, ...result.service_preview_state.selection},
    terminal: {...before.terminal, ...result.service_preview_state.terminal},
    conditions: [...before.conditions, ...result.service_preview_state.conditions]};
  return result;
}
