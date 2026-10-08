// @editor-module 战车受击与火焰、冷气状态按当前存档和部件数值结算。

/** PRG $02F3F6–$02F40E、$02EF03–$02F010、$02F4F9–$02F59C。 */
export function settleBattleVehicleDamage(target, amount, random) {
  const vehicle = target.vehicle;
  if (!Number.isInteger(vehicle?.sp)) return {missing: ['占位：本次战车护甲缺失']};
  let settled = Math.floor(amount / 5);
  if (target.defending) settled = Math.floor(settled / 2);
  const before = {hp: target.hp, shield: target.shield, riding: target.riding, vehicle: structuredClone(vehicle)};
  const after = structuredClone(before);
  after.vehicle.sp = Math.max(0, vehicle.sp - settled);
  let partDamage;
  if (!after.vehicle.sp && settled) {
    if (!Number.isInteger(vehicle.equippedMask) || vehicle.parts?.length !== 6)
      return {missing: ['占位：本次战车部件与装备位缺失']};
    const index = random.below(6);
    const part = vehicle.parts[index];
    if ((vehicle.equippedMask & (128 >>> index)) && part.itemId) {
      if (!Number.isInteger(part.defense) || !Number.isInteger(part.state))
        return {missing: ['占位：本次战车部件防御或状态缺失']};
      const threshold = part.defense < amount ? 64 : 32;
      if (random.next() < threshold && !(part.state & 128)) {
        const state = part.state | (part.state & 64 ? 128 : 64);
        after.vehicle.parts[index].state = state;
        partDamage = {index, key: part.key, itemId: part.itemId, label: part.label, before: part.state, after: state,
          messageRecordId: `record:0A:${state & 128 ? '031' : '030'}`};
        if (index === 5 && (state & 128)) {
          after.riding = false;
          after.vehicle.condition &= 4;
          after.defense = target.roleDefense;
          after.defenseSkill = target.roleDefenseSkill;
          after.attackSkill = target.roleAttackSkill;
          after.damageResistances = target.roleDamageResistances;
        }
      }
    }
  }
  return {settled, before, after, partDamage, dead: false, status: target.status, missing: []};
}

/** PRG $02F6F0–$02F729、$02F7AF–$02F7E8：FA 06 火焰、FA 07 冷气。 */
export function applyBattleVehicleCondition(target, {selector, operation = 'apply'}) {
  if (!target.riding) return {changed: false, missing: []};
  if (![6, 7].includes(selector) || !Number.isInteger(target.vehicle?.condition))
    return {changed: false, missing: ['占位：本次战车状态现场缺失']};
  const mask = 128 >>> selector;
  const condition = target.vehicle.condition;
  if (operation === 'clear') {
    if (!(condition & mask)) return {changed: false, missing: []};
    target.vehicle.condition &= ~mask;
  } else {
    if (condition & (selector === 6 ? 1 : 2)) return {changed: false, missing: []};
    target.vehicle.condition |= mask;
    target.vehicle.conditionTurns = {...target.vehicle.conditionTurns, [selector]: 3};
  }
  return {changed: true, missing: [], messageRecordId:
    `record:0A:${String(operation === 'clear' ? selector + 44 : selector + 33).padStart(3, '0')}`};
}

/** PRG $02009E–$0200BE：计数归零调用 B7，零计数调用 B5。 */
export function battleVehicleConditionRound(target, selector) {
  const count = target.vehicle?.conditionTurns?.[selector];
  if (!target.riding || !(target.vehicle?.condition & (128 >>> selector)) || !Number.isInteger(count)) return null;
  if (count & 128) return null;
  target.vehicle.conditionTurns[selector] = Math.max(0, count - 1);
  return count > 1 ? null : `battle-result-script:${count === 1 ? 'B7' : 'B5'}`;
}
