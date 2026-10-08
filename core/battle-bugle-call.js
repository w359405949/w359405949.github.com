// @editor-module 军号调用按 DB 的实际字段范围、FD 随机分支与 DA 消耗执行。
import {globalRandom} from './global-random.js';
import {SERVICE_ROLES} from './service-preview-state.js';

const BATTLE_BUGLE_EVIDENCE = 'project/evidence/reverse-engineering/battle-bugle-call/observations.json';
const programs = {'battle-result-script:94': [0xD2, 187, 0xDB, 0xE1, 80, 0xFD, 2, 0, 0x87],
  'battle-result-script:00': [255], 'battle-result-script:87': [0xDA, 0xF7, 81]};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const word = value => Number.isInteger(value) && value >= 0 && value <= 65535;
const matching = (record, handle) => record?.handle === handle
  && record.raw_bytes?.length === programs[handle].length
  && record.raw_bytes.every((value, i) => value === programs[handle][i]);

export function battleBugleCallContract(handle, phases, record) {
  if (handle !== 'battle-result-script:94' || ![2, 3].includes(phases?.length)) return null;
  const texts = [187, 80, 81], states = ['bugle-use', 'item-effect', 'bugle-broken'];
  if (phases.some((phase, i) => phase.state !== `battle-messages.${states[i]}`
      || phase.slot !== 'slot:message:0' || phase.text_record_ref?.resource_id !== 'text-record'
      || phase.text_record_ref.node_id !== `record:0A:${String(texts[i]).padStart(3, '0')}`
      || phase.retain_previous !== (i > 0)) || (record !== undefined && !matching(record, handle))) return null;
  return {bugle: true, evidence: BATTLE_BUGLE_EVIDENCE};
}

// 10:B174/B2CD 的徒步入场投影保留全部三个人物槽，包括不在队的槽。
function battleBugleInitialParameters(fields, slot) {
  if (![1, 2].includes(slot)) return null;
  const read = (role, name) => fields[`save.slot.${slot}.role.${role}.${name}`];
  if (SERVICE_ROLES.some(role => !byte(read(role, 'present')) || (read(role, 'present') & 128))) return null;
  const parameters = {speed: SERVICE_ROLES.map(role => read(role, 'speed')),
    defense: SERVICE_ROLES.map(role => read(role, 'defense')),
    attackSkill: SERVICE_ROLES.map(role => read(role, 'battle_skill')),
    defenseSkill: SERVICE_ROLES.map(role => read(role, 'battle_skill')), thresholdIndex: [1, 1, 1]};
  return validParameters(parameters) ? parameters : null;
}

function validParameters(value) {
  return ['speed', 'attackSkill', 'defenseSkill', 'thresholdIndex'].every(key =>
    Array.isArray(value?.[key]) && value[key].length === 3 && value[key].every(byte))
    && Array.isArray(value?.defense) && value.defense.length === 3 && value.defense.every(word);
}

// EC94 保留映射器的 X=10；DB 对 17 个字节分别饱和，防御的两字节不作整体加法。
function battleBugleParameterEffect(parameters) {
  if (!validParameters(parameters)) return null;
  const add = value => Math.min(255, value + 16);
  return {speed: parameters.speed.map(add),
    defense: parameters.defense.map(value => add(value & 255) + 256 * add(value >>> 8)),
    attackSkill: parameters.attackSkill.map(add), defenseSkill: parameters.defenseSkill.map(add),
    thresholdIndex: parameters.thresholdIndex.map((value, i) => i < 2 ? add(value) : value)};
}

export function battleBugleCallOperations({path, record, resultScripts, context, fields, inventoryField, paths}) {
  const boundary = missing => [{kind: 'boundary', missing}];
  if (!battleBugleCallContract(path.resultScript, path.phases, record)
      || !['battle-result-script:00', 'battle-result-script:87'].every(handle =>
        matching(resultScripts?.find(row => row.handle === handle), handle)))
    return boundary('本次军号调用的结果记录已改变');
  if (!Number.isInteger(context.randomSeed) || context.randomSeed < 0 || context.randomSeed > 65535)
    return boundary('本次军号调用缺少随机输入');
  const parameters = context.battleParameters ?? battleBugleInitialParameters(fields, context.slot);
  if (!validParameters(parameters)) return boundary('本次军号缺少完整战斗参数；乘车现场须由调用方提供');
  const random = globalRandom(context.randomSeed), roll = random.next() & 15, broken = roll < 2;
  const dynamic = path.id === 'message-path:5:0';
  if (!dynamic && broken !== (path.phases.length === 3)) return boundary('当前随机输入进入另一军号结果');
  let phases = path.phases;
  if (dynamic && broken) {
    const successor = paths?.find(row => row.id === 'message-path:5:2');
    if (!battleBugleCallContract(successor?.resultScript, successor?.phases))
      return boundary('本次军号损坏消息缺少后继阶段');
    phases = successor.phases;
  }
  const evidence = BATTLE_BUGLE_EVIDENCE;
  const message = i => ({kind: 'message', phase: phases[i], evidence});
  return [message(0), {kind: 'effect', id: 'bugle-parameters', actor: context.actor,
    value: structuredClone(parameters), confirmed: true, evidence}, message(1),
  {kind: 'effect', id: 'bugle-random', actor: context.actor,
    value: {roll, broken, random: random.snapshot()}, confirmed: true, evidence},
  ...(broken ? [{kind: 'effect', id: 'consume-item', confirmed: true, evidence,
    inventoryField, slot: context.inventory_index ?? 0, item: context.item}, message(2)] : []),
  {kind: 'return', evidence, value: {scope: 'result-script', confirmed: true,
    actor: context.actor, item: context.item, resultScript: path.resultScript,
    successor: broken ? 'battle-result-script:87' : 'battle-result-script:00'}}];
}

export function applyBattleBugleEffect(fields, operation, context, domainResults = {}) {
  if (operation.actor !== context.actor) return {status: 'unavailable', reason: '军号效果绑定另一行动方'};
  if (operation.id === 'bugle-parameters') {
    const value = battleBugleParameterEffect(domainResults.battleParameters ?? operation.value);
    return value ? {status: 'available', fields, domainResults: {battleParameters: value}}
      : {status: 'unavailable', reason: '军号效果缺少本次战斗参数'};
  }
  if (operation.id === 'bugle-random') return {status: 'available', fields,
    domainResults: {bugle: structuredClone(operation.value)}};
  return {status: 'unavailable', reason: '军号效果指令未确认'};
}
