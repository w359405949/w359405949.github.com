// @editor-module 战斗事件的文字调用引用所属代码字段。
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from './field-submenu-code-sources.js';
import {textRecordNodeId} from './text-record-project.js';
import {battleVehicleItemCallContract, battleVehicleItemCallOperations,
  applyBattleVehicleItemCallEffect} from './battle-vehicle-item-calls.js';
import {battleHumanItemCallContract, battleHumanItemCallOperations, applyBattleHumanItemEffect} from './battle-human-item-calls.js';
import {battleBugleCallContract, battleBugleCallOperations, applyBattleBugleEffect} from './battle-bugle-call.js';

const events = ['entry', 'action', 'shell-firing', 'replacement-failed', 'miss',
  'party-damage', 'enemy-damage', 'party-death', 'enemy-death'];

const parameterLabels = {'ui-text-provider-workspace.current-string': '人物或战车姓名',
  'ui-text-provider-zero-page-overlays.current-record': '本次引用名称',
  'ui-text-provider-workspace.target-instance-suffix': '敌方实例后缀',
  'ui-text-provider-zero-page-overlays.battle-quantity': '本次数量'};

export const battleMessageParameterLabel = source => parameterLabels[source] || '动态内容';

// 未确认参数只替换预览插入内容，不提供执行值。
export function battleMessageParameterPlaceholder({source}) {
  return {status: 'placeholder', text: '？', label: `${battleMessageParameterLabel(source)}（未确认）`};
}

export async function battleMessageCalls(readField) {
  const values = await fieldSubmenuCodeValues(['battle-message-region',
    ...events.map(event => `battle-message-${event}`)], readField);
  const region = fieldSubmenuCodeValue(values, 'battle-message-region');
  return Object.fromEntries(events.map(event => [event,
    textRecordNodeId(region, fieldSubmenuCodeValue(values, `battle-message-${event}`))]));
}

export const BATTLE_MESSAGE_CALL_EVIDENCE = 'project/evidence/reverse-engineering/battle-message-calls/observations.json';
const fixedCalls = {
  'battle-result-script:91': {bytes: [0xD2, 0x15, 0xF7, 0x3A], texts: [21, 58],
    states: ['action', 'failure']},
  'battle-result-script:8D': {bytes: [0xDA, 0xCD, 0xD2, 0x15, 0xF7, 0xBD], texts: [21, 189],
    states: ['action', 'item-effect'], consume: true, runtime: {smokeEvasion: 4, smokeTurns: 4}},
  'battle-result-script:90': {bytes: [0xDA, 0xBF, 0xD2, 0x4D, 0xF7, 0x3F], texts: [77, 63],
    states: ['drink-use', 'power-up'], consume: true, runtime: {resultSkill: 100}},
  'battle-result-script:8B': {bytes: [0xCC, 1, 0xD2, 0x6F, 0xFF], texts: [111],
    states: ['cover-face'], runtime: {resultCondition: 1}},
  'battle-result-script:8C': {bytes: [0xCC, 2, 0xD2, 0x15, 0xFF], texts: [21],
    states: ['mask-use'], runtime: {resultCondition: 2}},
};

// 固定调用只确认本条结果记录的效果与返回，后续回合另取调用现场。
export function battleMessageCallContract(handle, phases, record, itemReference) {
  if (handle === 'battle-result-script:94') return battleBugleCallContract(handle, phases, record);
  const call = fixedCalls[handle] || battleVehicleItemCallContract(handle);
  if (!call) return battleHumanItemCallContract(handle, phases, record, itemReference);
  if (!call || phases?.length !== call.texts.length || phases.some((phase, index) =>
    phase.state !== `battle-messages.${call.states[index]}` || phase.slot !== 'slot:message:0'
    || phase.text_record_ref?.resource_id !== 'text-record'
    || phase.text_record_ref.node_id !== `record:0A:${String(call.texts[index]).padStart(3, '0')}`
    || phase.retain_previous !== (index > 0))) return null;
  if (record !== undefined && (record?.handle !== handle || record.raw_bytes?.length !== call.bytes.length
      || !record.raw_bytes.every((byte, index) => byte === call.bytes[index]))) return null;
  return structuredClone(call);
}

export function battleMessageCallOperations({path, record, item, fields, context, inventoryField, resultScripts, healing, paths} = {}) {
  const call = battleMessageCallContract(path?.resultScript, path?.phases, record || null, path?.itemReference);
  if (battleVehicleItemCallContract(path?.resultScript) && call)
    return battleVehicleItemCallOperations({call, path, record, item, fields, context, resultScripts});
  const inventory = fields?.[inventoryField], slot = context?.inventory_index ?? 0;
  const rolePrefix = inventoryField?.endsWith('.inventory') ? inventoryField.slice(0, -'inventory'.length) : '';
  const present = fields?.[`${rolePrefix}present`], status = fields?.[`${rolePrefix}status`];
  const selector = `battle-result-script:${item?.battle_use_effect?.result_selector?.toString(16).toUpperCase().padStart(2, '0')}`;
  if (!call || path.enemyActionReference || selector !== path.resultScript
      || context?.actor !== `save-role:${context?.role}` || ![0, 1, 2].includes(context.role)
      || present !== context.role + 1
      || !Number.isInteger(status) || status < 0 || status > 255 || (status & 0xE0)
      || !(Array.isArray(inventory) || inventory instanceof Uint8Array) || inventory.length !== 8
      || !Number.isInteger(slot) || slot < 0 || slot >= 8
      || !inventory.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
      || !context.item || inventory[slot] !== context.item || item?.id !== context.item)
    return [{kind: 'boundary', missing: '本次道具、行动方或结果记录不匹配已确认调用'}];
  if (call.bugle) return item.id === 0x9C
    ? battleBugleCallOperations({path, record, resultScripts, context, fields, inventoryField, paths})
    : [{kind: 'boundary', missing: '本次调用的携带物不是军号'}];
  if (call.humanItem) return battleHumanItemCallOperations({call, path, record, records: resultScripts, item, fields,
    context, inventoryField, healing});
  const evidence = BATTLE_MESSAGE_CALL_EVIDENCE;
  return [...(call.consume ? [{kind: 'effect', id: 'consume-item', confirmed: true, evidence,
    inventoryField, slot, item: context.item}] : []),
  ...(call.runtime ? [{kind: 'effect', id: 'actor-runtime', confirmed: true, evidence,
    actor: context.actor, value: call.runtime}] : []),
  ...path.phases.map(phase => ({kind: 'message', phase, evidence})),
  {kind: 'return', evidence, value: {scope: 'result-script', confirmed: true,
    actor: context.actor, item: context.item, resultScript: path.resultScript}}];
}

export function applyBattleMessageCallEffect(fields, operation, context, domainResults = {}) {
  if (operation.id?.startsWith('bugle-')) return applyBattleBugleEffect(fields, operation, context, domainResults);
  if (operation.id?.startsWith('vehicle-tool-'))
    return applyBattleVehicleItemCallEffect(fields, operation, context, domainResults);
  if (operation.id?.startsWith('human-item-'))
    return applyBattleHumanItemEffect(fields, operation, context, domainResults);
  if (operation.id === 'consume-item') {
    const inventory = fields[operation.inventoryField];
    if (!(Array.isArray(inventory) || inventory instanceof Uint8Array) || inventory.length !== 8
        || inventory[operation.slot] !== operation.item)
      return {status: 'unavailable', reason: '待移除道具与本次携带位不一致'};
    const next = Array.from(inventory);
    next.splice(operation.slot, 1); next.push(0);
    fields[operation.inventoryField] = inventory instanceof Uint8Array ? Uint8Array.from(next) : next;
    return {status: 'available', fields};
  }
  if (operation.id === 'actor-runtime' && operation.actor === context.actor)
    return {status: 'available', fields, domainResults: {battleActor: {
      ...domainResults.battleActor, actor: operation.actor, ...structuredClone(operation.value)}}};
  return {status: 'unavailable', reason: '本次行动方效果未确认'};
}
