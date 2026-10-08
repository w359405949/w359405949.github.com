// @editor-module 战车载重按当前携带设备、装甲、底盘与已安装引擎计算。
export function currentVehicleEquipmentLoad({read, items, extra = 0, limit = 0x91}) {
  const parts = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'];
  const chassis = read('chassis_weight'), sp = read('sp'), equipped = read('equipped.engine');
  if (![chassis, sp, extra, limit].every(Number.isInteger) || equipped == null) return null;
  let weight = (chassis + ((sp + extra) & 0xFFFF)) & 0xFFFF, engine;
  for (const part of parts) {
    const id = read(`equipment.${part}`), item = items.find(row => row.id === id);
    if (!Number.isInteger(id)) return null;
    if (part === 'engine') engine = item;
    if (!id || id >= limit) continue;
    const units = item?.tank_weight?.internal_units;
    if (!Number.isInteger(units) || units < 0) return null;
    weight = (weight + units) & 0xFFFF;
  }
  const capacity = equipped ? engine?.engine_capacity?.internal_units : 0;
  return Number.isInteger(capacity) && capacity >= 0 && capacity <= 0xFFFF
    ? {weight, capacity, overloaded: capacity < weight} : null;
}
