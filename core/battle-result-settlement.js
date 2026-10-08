// @editor-module 战后结算只产生已确认字段的预览效果。
import {battleResultDropValues} from './battle-result-screen.js';

const unsigned = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const ROLES = ['hunter', 'mechanic', 'soldier'];

/** 17:A1CE–A27B、3F:EDCB–EE34、13:994D–9990。 */
export function battleResultSettlement(input, party, totals, {deaths, dropRoll} = {}) {
  const slot = input.encounter.saveSlot, prefix = `save.slot.${slot}.`;
  const fields = input.encounter.fields || {};
  const effects = [], dropEffects = [], unconfirmed = [];
  const skip = reason => unconfirmed.push(reason);
  const effect = (field, value, drop = false) => {
    if (!Object.hasOwn(fields, field)) {skip(`缺少结算字段：${field}`); return;}
    effects.push({field, value});
    if (drop) dropEffects.push({field, value});
  };
  for (const vehicle of new Set(party.filter(actor => actor.present && unsigned(actor.currentVehicle, 10))
    .map(actor => actor.currentVehicle))) {
    const field = `${prefix}vehicle.${vehicle}.condition_raw`;
    if (!unsigned(fields[field], 255)) skip('战后战车状态缺少当前值');
    else effect(field, fields[field] & 4);
  }
  let gold = totals.gold;
  const rentals = Array.from({length: 3}, (_, index) => fields[`${prefix}active_rental_vehicle_preset.${index}`]);
  if (totals.experience && !rentals.every(value => unsigned(value, 255))) {
    gold = null; skip('出租战车分成缺少活动实例');
  } else if (totals.experience) {
    for (const preset of rentals) if (preset < 128) gold = Math.floor(gold / 2);
  }
  if (totals.experience && gold) {
    const current = fields[`${prefix}gold`];
    if (!unsigned(current, 0xFFFFFF)) skip('金钱入账缺少当前余额');
    else {
      const balance = Math.min(9999999, (current + gold) % 0x1000000);
      effect(`${prefix}gold`, balance);
      const settings = fields[`${prefix}adventure_data_settings`], threshold = fields[`${prefix}gold_bell_threshold`];
      if (!unsigned(settings, 255)) skip('金铃结算缺少冒险设置');
      else if (settings & 128) {
        if (!unsigned(threshold, 0xFFFFFF)) skip('金铃结算缺少通知金额');
        else if (balance >= threshold) effect(`${prefix}adventure_data_settings`, settings & 127);
      }
    }
  }
  for (const actor of totals.experience ? party : []) {
    if (!actor.present || actor.status === 255) continue;
    const role = `${prefix}role.${actor.slug}.`;
    const experience = fields[`${role}experience`], level = fields[`${role}level`];
    if (!unsigned(experience, 0xFFFFFF) || !unsigned(level, 99) || level === 0) {
      skip(`${actor.slug} 的经验结算缺少当前经验或等级`); continue;
    }
    const next = Math.min(9999999, (experience + totals.experience) % 0x1000000);
    const threshold = input.growth?.experience_thresholds?.find(row => row.current_level === level);
    if (level < 99 && (!unsigned(threshold?.required_total_experience, 0xFFFFFF)
        || next >= threshold.required_total_experience)) {
      skip(`${actor.slug} 的升级属性与随机现场未确认`); continue;
    }
    effect(`${role}experience`, next);
  }
  const lastDeath = deaths?.at(-1);
  const last = input.monsters?.find(row => row.id === lastDeath?.monsterId);
  const members = party.map(actor => ({slot: actor.roleId, hp: actor.hp,
    inventory: Array.from(fields[`${prefix}role.${actor.slug}.inventory`] || []),
    equipment: Array.from(fields[`${prefix}role.${actor.slug}.equipment`] || []),
    ridingVehicle: unsigned(actor.currentVehicle, 10), vehicleSlot: actor.currentVehicle}));
  let drop = null;
  if (totals.experience) {
    const values = battleResultDropValues({experience: totals.experience, gold, last,
      party: members, dropRoll, vehicles: input.resultVehicles, dropWeight: input.dropWeight});
    if (values.status !== 'available') skip(values.reason);
    else {
      drop = values.drop;
      if (drop?.inserted) {
        if (drop.container?.startsWith('vehicle-')) {
          skip('战车掉落的弹数与逐列状态提交未确认'); drop = {...drop, committed: false};
        } else {
          const field = `${prefix}role.${ROLES[drop.partySlot]}.${drop.itemId < 0x41 ? 'equipment' : 'inventory'}`;
          const items = Array.from(fields[field]); items[drop.itemSlot] = drop.itemId;
          effect(field, items, true); drop = {...drop, committed: true};
        }
      }
    }
  }
  return {rewards: {...totals, gold}, drop, effects, dropEffects, unconfirmed};
}
