// @editor-module 人物装备攻防按角色基础属性与八槽装备位图派生。

export function roleEquipmentStats({strength, speed, vitality, equipment, slot_flags}, itemValue) {
  let attack = strength;
  let defense = (speed + vitality) >> 1;
  for (const [index, id] of equipment.entries()) {
    if (!(slot_flags & (0x80 >> index))) continue;
    const value = itemValue(id);
    if (id < 0x23) defense = (defense + value) & 0xFFFF;
    else attack = (attack + value) & 0xFFFF;
  }
  return {attack, defense};
}

export function roleEquipmentComparison(role, items, index, itemValue, stats = roleEquipmentStats(role, itemValue)) {
  const selected = items[index];
  if (!selected || selected.id === 0) return null;
  if (selected.category?.owner !== 'human') throw new TypeError('人物装备比较缺少物品类别');
  const attribute = selected.id < 0x23 ? 'defense' : 'attack';
  // 19:ADD3 从第八槽向前找同类已装备物品。
  const previous = items.findLast((item, slot) => (role.slot_flags & (0x80 >> slot))
    && item?.category?.id === selected.category.id);
  const value = (stats[attribute] - (previous ? itemValue(previous.id) : 0) + itemValue(selected.id)) & 0xFFFF;
  return {attack: attribute === 'attack' ? value : 0, defense: attribute === 'defense' ? value : 0};
}
