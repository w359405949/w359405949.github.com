// @editor-module 遭遇完成结果只声明已确认的队伍、奖励累计与事件提交。
import {SERVICE_PARTS} from '../core/service-preview-state.js';
import {battleResultSettlement} from '../core/battle-result-settlement.js';
const flagHandle = id => id.toString(16).toUpperCase().padStart(2, '0');
const unsigned = (value, max) => Number.isInteger(value) && value >= 0 && value <= max;
const ROLES = ['hunter', 'mechanic', 'soldier'];

/** PRG $02EECD–$02EF00、$02EF74–$02EFE1：胜利提交与败北剧情交接。 */
export function battleEncounterResult(input, actors, rewardTotals, missing = [], resultContext = {}) {
  const active = side => actors.some(actor => actor.side === side && (actor.hp > 0 || actor.shield > 0)
    && !(actor.status & 0x80));
  const outcome = !active('party') ? 'defeat' : !active('enemy') ? 'victory' : resultContext.round ? 'round' : 'unknown';
  const call = input.encounter || {};
  const gaps = [...missing];
  if (outcome === 'unknown') gaps.push('未确认：战斗尚未分出胜负');
  if (input.story) gaps.push('未确认：剧情专用战斗不提交普通遭遇结果');
  const party = actors.filter(actor => actor.side === 'party').map(actor => ({id: actor.id,
    roleId: actor.roleId, slug: actor.slug, hp: actor.hp, status: actor.status,
    present: actor.riding === false && unsigned(actor.present, 255) ? actor.present & 127 : actor.present,
    currentVehicle: actor.currentVehicle, inventory: actor.inventory, vehicle: actor.vehicle}));
  if (![1, 2].includes(call.saveSlot) || !party.length || party.some(actor => !unsigned(actor.roleId, 2)
      || actor.slug !== ROLES[actor.roleId]) || new Set(party.map(actor => actor.roleId)).size !== party.length)
    gaps.push('未确认：调用方存档组与人物身份');
  if (party.some(actor => !unsigned(actor.hp, 65535) || !unsigned(actor.status, 255) || !unsigned(actor.present, 255)))
    gaps.push('未确认：战后队伍状态');
  const flags = [];
  const eventEffects = [];
  if (!unsigned(call.pendingEventFlag ?? 0, 255) || !unsigned(call.targetStoryState ?? 0, 255))
    gaps.push('未确认：战后事件与剧情状态的输入域');
  const pending = unsigned(call.pendingEventFlag, 255) ? call.pendingEventFlag : 0;
  if (outcome === 'victory' && pending) {
    const bounty = pending >= 0x50 && pending < 0x5D;
    if (bounty && rewardTotals.status !== 'available') gaps.push('未确认：事件提交所需的击破奖励');
    else if (!bounty || rewardTotals.experience !== 0) {
      if (bounty) {
        const level = call.fields?.[`save.slot.${call.saveSlot}.role.hunter.level`];
        const field = `save.slot.${call.saveSlot}.wanted_defeat_level_at_victory.${pending - 0x4F}`;
        if (!Number.isInteger(level) || !Object.hasOwn(call.fields, field))
          gaps.push('未确认：赏金首击破等级的调用现场');
        else eventEffects.push({field, value: level});
      }
      flags.push(pending);
    }
  }
  const scene = structuredClone(call.scene || {});
  let mode = 'resume';
  if (outcome === 'defeat') {
    if (party.some(actor => unsigned(actor.currentVehicle, 10))) gaps.push('未确认：败北留车与场景对象恢复');
    if (call.targetStoryState === 6) gaps.push('未确认：剧情状态 06 的玩家恢复现场');
    else {
      for (const actor of party) {
        actor.status = 255;
        if (actor.roleId !== 0) actor.present = 0;
      }
      scene.storyState = 3;
      scene.actorList = 0xF2;
      mode = 'reload';
      if (call.fieldEncounter === true) flags.push(0x4C);
    }
  } else if (outcome === 'victory') {
    // PRG $02E206–$02E20F：胜利返回只保留死亡与酸状态，FF 死亡槽保持原值。
    for (const actor of party) if (actor.status !== 255) actor.status &= 0x88;
    const storyState = call.targetStoryState ?? 0;
    if (storyState > 0 && storyState < 0x80) gaps.push('未确认：战后剧情现场须交接所属领域');
    else {scene.storyState = 0; mode = storyState === 0 ? 'resume' : 'reload';}
  }
  if (outcome === 'victory' && rewardTotals.status !== 'available') gaps.push('未确认：本次击破奖励');
  if (['victory', 'defeat'].includes(outcome)) for (const actor of party) {
    if (actor.present && actor.status !== 255) actor.status &= 0x88;
    if (actor.present) actor.present = actor.roleId + 1 + (unsigned(actor.currentVehicle, 10) ? 128 : 0);
  }
  const confirmed = gaps.length === 0;
  const partyEffects = confirmed ? party.flatMap(actor => Object.entries({current_hp: actor.hp,
    status: actor.status, present: actor.present, inventory: actor.inventory}).filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({field: `save.slot.${call.saveSlot}.role.${actor.slug}.${field}`, value}))) : [];
  if (confirmed) for (const vehicle of new Map(party.filter(actor => actor.vehicle)
    .map(actor => [actor.vehicle.id ?? actor.vehicle.slot, actor.vehicle])).values()) {
    const values = [...(vehicle.inventory || []).map((value, index) => [`item.${index}`, value]),
      ...SERVICE_PARTS.map((part, index) => [`equipment_state.${part}`,
        vehicle.parts?.[index]?.state ?? vehicle.equipmentState?.[index]]),
      ...(vehicle.shellTypes || []).map((value, index) => [`shell_type.${index}`, value]),
      ...(vehicle.shellCounts || []).map((value, index) => [`shell_count.${index}`, value]),
      ['sp', vehicle.sp], ['condition_raw', vehicle.condition]];
    partyEffects.push(...values.filter(([, value]) => value !== undefined).map(([field, value]) => ({
      field: `save.slot.${call.saveSlot}.vehicle.${vehicle.id ?? vehicle.slot}.${field}`, value})));
  }
  const eventFlags = confirmed ? flags : [];
  const entryEffects = confirmed ? [...eventEffects, ...eventFlags.map(id => ({field: `save.slot.${call.saveSlot}.global_event_flag.${flagHandle(id)}`, value: 1}))] : [];
  const totals = outcome === 'defeat' ? {status: 'available', experience: 0, gold: 0} : rewardTotals;
  const settlement = confirmed && ['victory', 'defeat'].includes(outcome) ? battleResultSettlement({
    ...input, encounter: {...call, fields: {...call.fields,
      ...Object.fromEntries(partyEffects.map(effect => [effect.field, effect.value]))}}}, party, totals, resultContext)
    : {rewards: totals, drop: null, effects: [], dropEffects: [], unconfirmed: []};
  const stages = {entry: entryEffects, rewards: [...partyEffects,
    ...settlement.effects.filter(effect => !settlement.dropEffects.some(drop => drop.field === effect.field))],
    drop: settlement.dropEffects};
  const effects = [...stages.entry, ...stages.rewards, ...stages.drop];
  const sourceFields = Object.fromEntries(Object.entries(call.fields || {})
    .filter(([field]) => field.startsWith(`save.slot.${call.saveSlot}.`))
    .map(([field, value]) => [field, structuredClone(value)]));
  return {outcome, confirmed, missing: [...new Set(gaps)], party, rewards: settlement.rewards, drop: settlement.drop,
    invocation: {saveSlot: call.saveSlot, sceneId: call.scene?.sceneId, sourceFields},
    unconfirmed: settlement.unconfirmed, eventFlags, effects, stages,
    ...(outcome === 'round' && confirmed ? {roundState: {actors: structuredClone(actors),
      enemyEvents: structuredClone(resultContext.enemyEvents), deaths: structuredClone(resultContext.deaths),
      randomState: resultContext.random}} : {}),
    sceneReturn: confirmed ? {mode, context: scene, ...(outcome === 'defeat' ? {handoff: 'story-f2'} : {})} : null};
}
