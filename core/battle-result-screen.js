// @editor-module 战斗结果画面由预览敌群、队伍与取得分支构造。
import {battleResultRewardTotals} from './battle-result-values.js';
import {grantStoryPartyItem, grantStoryVehicleItem} from './story-party-item-operations.js';

const unavailable = reason => ({status: 'unavailable', reason});
const record = (region, id) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(id).padStart(3, '0')}`;
const row = values => Array.isArray(values) && values.length === 8
  && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255);

/** 预览把所选敌群作为已击杀输入，不执行战斗行动。 */
export function battleResultScreenValues({groups, monsters, party, vehicles = [], dropRoll = 0,
  rentalCount = 0, dropWeight} = {}) {
  if (!Array.isArray(groups) || !Array.isArray(monsters) || !Array.isArray(party)
      || !party.length || party.some(member => !Number.isInteger(member.slot)
        || member.slot < 0 || member.slot > 2 || !row(member.inventory) || !row(member.equipment)))
    return unavailable('结果预览缺少敌群或队伍字段');
  const deaths = [];
  let last = null;
  for (const [groupIndex, group] of groups.entries()) {
    if (!Number.isInteger(group.count) || group.count < 0 || group.count > 9)
      return unavailable('敌群数量无效');
    if (!group.count) continue;
    const monster = monsters.find(monster => monster.id === group.monster_id);
    if (!monster) return unavailable('所选敌群的怪物字段缺失');
    last = monster;
    for (let index = 0; index < group.count; index++) deaths.push({
      instance: `${groupIndex}:${index}`, experience: monster.experience?.value, gold: monster.gold?.value});
  }
  if (!deaths.length || deaths.length > 9) return unavailable('敌群须在九个实例以内');
  const totals = battleResultRewardTotals(deaths);
  if (totals.status !== 'available') return totals;
  if (!Number.isInteger(rentalCount) || rentalCount < 0 || rentalCount > 3)
    return unavailable('出租战车数量无效');
  let gold = totals.gold;
  for (let index = 0; index < rentalCount; index++) gold = Math.floor(gold / 2);
  return battleResultDropValues({experience: totals.experience, gold, last, party, vehicles, dropRoll, dropWeight});
}

/** 17:A24D–A27B：掉落来源是本次末个死亡实例，不是编队末项。 */
export function battleResultDropValues({experience, gold = 0, last, party, vehicles = [], dropRoll, dropWeight}) {
  const result = {status: 'available', experience, gold,
    defeat: party.some(member => member.slot > 0) ? 6 : 0, drop: null};
  if (experience && typeof last?.drop?.participates !== 'boolean')
    return unavailable('掉落预览缺少参与字段');
  if (!experience || !last.drop?.participates || last.drop.item?.kind === 'no-drop') return result;
  const itemId = last.drop?.item?.item_id, threshold = last.drop?.probability?.numerator;
  if (!Number.isInteger(itemId) || !Number.isInteger(threshold)
      || !Number.isInteger(dropRoll) || dropRoll < 0 || dropRoll > 255)
    return unavailable('掉落预览缺少物品、概率或随机字节');
  if (dropRoll >= threshold) return result;
  if (!party.length || party.some(member => !row(member.inventory) || !row(member.equipment)))
    return unavailable('掉落取得缺少队伍容器');
  const slots = new Set(party.map(member => member.slot));
  let acquisition;
  if (itemId >= 1 && itemId < 0x41 || itemId >= 0x99 && itemId < 0xCB) {
    const containers = Array.from({length: 3}, (_, slot) => {
      const member = party.find(member => member.slot === slot);
      return [...(member?.[itemId < 0x41 ? 'equipment' : 'inventory'] || Array(8).fill(0))];
    });
    acquisition = grantStoryPartyItem(containers, slots, itemId, 0);
  } else if (itemId >= 0x41 && itemId < 0x99 || itemId >= 0xCB && itemId < 0xF0) {
    const copies = structuredClone(vehicles);
    if (party.some(member => member.ridingVehicle && !copies[member.vehicleSlot]))
      return unavailable('掉落预览缺少所乘战车的容量字段');
    if (party.some(member => member.ridingVehicle && member.vehicleSlot < 8)
        && (copies.some(vehicle => !row(vehicle.inventory) || !row(vehicle.equipmentCargo)
          || !row(vehicle.equipment) || !Number.isFinite(vehicle.remainingWeight))
          || itemId < 0x99 && !Number.isFinite(dropWeight)))
      return unavailable('战车取得缺少容器或重量字段');
    acquisition = grantStoryVehicleItem(copies, party, slots, itemId, 0,
      {weight: dropWeight});
  } else return unavailable('掉落物品的取得分支未确认');
  if (acquisition.missing) return unavailable(acquisition.missing);
  result.drop = {itemId, monsterId: last.id, roll: dropRoll, threshold, ...acquisition};
  return result;
}

/** AA81 清除消息区；A0EF 和 F0A6 在既有正文下继续输出。 */
export function battleResultScreenCalls(phase, values, party, cursors) {
  if (values?.status !== 'available') return [];
  const call = (region, id, cursor, line_count, extra = {}) => ({
    record: record(region, id), cursor, line_count, ...extra});
  if (phase === 'victory') return values.experience ? [call(10, 12, 0x282, 0)] : [];
  if (phase === 'defeat') return values.defeat ? [call(10, values.defeat, 0x282, 0)]
    : [call(10, 11, 0x2C2, 0, {provider_script_hex: {7: party[0].name}})];
  if (phase === 'rewards') return values.experience ? [call(10, 12, 0x282, 0),
    call(2, 97, 0x280 + cursors[0] - 0x0B, 0),
    ...(values.gold ? [call(2, 98, 0x280 + cursors[2] - 0x0B, 2)] : [])] : [];
  if (phase === 'drop') return values.drop ? [call(10, 68, 0x282, 0),
    call(5, values.drop.resultRecord, 0x240 + 0xC0 + 2, 2,
      {provider_script_hex: {7: party.find(member => member.slot === values.drop.partySlot)?.name || '9F'}})] : [];
  throw new TypeError('战斗结果画面状态无效');
}
