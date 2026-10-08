// @editor-module 物品攻防数值读取当前数值码与空栏数值字段。

export async function itemEquipmentValues(ids, read) {
  const items = await Promise.all(ids.map(id => read.get(`item:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`, null)));
  const byId = new Map(items.map(item => [item.id, item]));
  let nullValue;
  if (ids.includes(0)) {
    const codes = await read.getResourceDocument('item-entry');
    const raw = (await read.getField('item-entry', 'item-entry.equipment-values', 'payload_hex')).value;
    nullValue = codes.equipment_editor.numeric_codes.find(code => code.raw_code === parseInt(raw.slice(0, 2), 16))?.value;
  }
  return {items, itemValue: id => {
    const value = id === 0 ? nullValue : byId.get(id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
    if (!Number.isInteger(value)) throw new TypeError(`人物装备缺少数值：${id}`);
    return value & 0xFFFF;
  }};
}
