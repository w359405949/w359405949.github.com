// @editor-module 人物道具调用以原版结果记录、当前人物字段和随机输入闭合。
import {partyHealingBase, partyHealingValues} from './party-healing-values.js';
import {globalRandom} from './global-random.js';

const HUMAN_ITEM_CALL_EVIDENCE = 'project/evidence/reverse-engineering/battle-human-item-calls/observations.json';
const programs = {
  'battle-result-script:88': [0xD2, 82, 0xFD, 8, 0x89, 0x8A],
  'battle-result-script:89': [0xF7, 83], 'battle-result-script:8A': [0xF7, 84],
  'battle-result-script:B3': [0xD2, 21, 0xE1, 190, 0xE9],
  'battle-result-script:A9': [0xDA, 0xF5, 0xA7],
  'battle-result-script:A7': [0xD2, 21, 0xD9, 13, 255],
  'battle-result-script:A8': [0xDA, 0xF5, 0xA6],
  'battle-result-script:A6': [0xD2, 21, 0xD9, 12, 255],
  'battle-result-script:A5': [0xDA, 0xD2, 21, 0xD9, 5, 255],
  'battle-result-script:92': [0xCA, 0xD2, 77, 0xE5],
  'battle-result-script:AF': [0xCA, 0xD2, 21, 0xE5],
};
const recordMatches = (handle, record) => record?.handle === handle
  && record.raw_bytes?.length === programs[handle]?.length
  && record.raw_bytes.every((byte, i) => byte === programs[handle][i]);
const textId = value => `record:0A:${String(value).padStart(3, '0')}`;
const statePairs = {
  'battle-result-script:88': ['coin-use', 'coin-victory', 'coin-defeat'],
  'battle-result-script:B3': ['map-use', 'satellite-signal'],
  'battle-result-script:A9': ['extinguisher-use', 'extinguisher-no-fire', 'extinguisher-fire-cleared'],
  'battle-result-script:A7': ['hydrant-use', 'hydrant-no-fire', 'hydrant-fire-cleared'],
  'battle-result-script:A8': ['antidote-use', 'antidote-no-effect', 'antidote-acid-neutralized'],
  'battle-result-script:A6': ['spray-use', 'spray-no-effect'],
  'battle-result-script:A5': ['wax-use', 'wax-no-effect', 'wax-acid-neutralized'],
  'battle-result-script:AF': ['medicine-box-use', 'medicine-box-hp-full'],
};

export function battleHumanItemCallContract(handle, phases, record, itemReference) {
  if (!programs[handle] || phases?.length !== 2
      || phases.some((phase, i) => !phase.state?.startsWith('battle-messages.')
        || phase.slot !== 'slot:message:0' || phase.text_record_ref?.resource_id !== 'text-record'
        || phase.retain_previous !== (i > 0))) return null;
  if (record !== undefined && !recordMatches(handle, record)) return null;
  const texts = phases.map(phase => phase.text_record_ref.node_id);
  const first = handle === 'battle-result-script:88' ? 82 : handle === 'battle-result-script:92' ? 77 : 21;
  const tails = handle === 'battle-result-script:88' ? [83, 84]
    : handle === 'battle-result-script:B3' ? [190]
      : handle === 'battle-result-script:92' ? [78, 79] : handle === 'battle-result-script:AF' ? [79]
        : [58, handle === 'battle-result-script:A9' || handle === 'battle-result-script:A7' ? 50 : 186];
  if (texts[0] !== textId(first) || !tails.some(id => texts[1] === textId(id))) return null;
  if (handle === 'battle-result-script:92' && !/^human-item:A[9ABC]$/.test(itemReference || '')) return null;
  const pair = handle === 'battle-result-script:92'
    ? itemReference === 'human-item:AA' ? ['item-effect', 'item-effect']
      : [`healing-${itemReference.slice(-2).toLowerCase()}-use`,
        texts[1] === textId(78) && itemReference === 'human-item:A9' ? 'item-effect'
          : `healing-${itemReference.slice(-2).toLowerCase()}-hp-full`]
    : statePairs[handle];
  const tail = handle === 'battle-result-script:92' ? pair?.[1]
    : pair?.[tails.findIndex(id => texts[1] === textId(id)) + 1];
  if (!pair || phases[0].state !== `battle-messages.${pair[0]}`
      || phases[1].state !== `battle-messages.${tail}`) return null;
  return {humanItem: true, evidence: HUMAN_ITEM_CALL_EVIDENCE, texts,
    consume: ['battle-result-script:A9', 'battle-result-script:A8', 'battle-result-script:A5'].includes(handle)};
}

export function battleHumanItemCallOperations({call, path, record, records, item, fields, context, inventoryField, healing}) {
  const evidence = HUMAN_ITEM_CALL_EVIDENCE, prefix = inventoryField.slice(0, -'inventory'.length);
  const effect = (id, extra) => ({kind: 'effect', id, confirmed: true, evidence, ...extra});
  const boundary = missing => ({kind: 'boundary', missing});
  const message = index => ({kind: 'message', phase: path.phases[index], evidence});
  const expected = path.phases[1].text_record_ref.node_id;
  const operation = {actor: context.actor, expected, evidence};
  const finish = {kind: 'return', evidence, value: {scope: 'result-script', confirmed: true,
    actor: context.actor, item: context.item, resultScript: path.resultScript}};
  const successor = path.resultScript === 'battle-result-script:A9' ? 'battle-result-script:A7'
    : path.resultScript === 'battle-result-script:A8' ? 'battle-result-script:A6' : null;
  if (successor && !recordMatches(successor, records?.find(row => row.handle === successor)))
    return [boundary('本次状态清除后继记录已改变')];
  if (path.resultScript === 'battle-result-script:88') {
    if (!['battle-result-script:89', 'battle-result-script:8A'].every(handle =>
      recordMatches(handle, records?.find(row => row.handle === handle))))
      return [boundary('本次古币分支后继记录已改变')];
    return [message(0), effect('human-item-coin', {...operation, seed: context.randomSeed}), message(1), finish];
  }
  if (path.resultScript === 'battle-result-script:B3') return [message(0), message(1),
    effect('human-item-map', {...operation, sceneId: context.scene?.sceneId}), finish];
  if (['battle-result-script:92', 'battle-result-script:AF'].includes(path.resultScript)) {
    if (path.resultScript === 'battle-result-script:92'
        ? path.itemReference !== `human-item:${item.id.toString(16).toUpperCase()}` : item.id !== 0xD1)
      return [boundary('本次回复物品与消息路径不一致')];
    const base = partyHealingBase(healing, item.id);
    return [effect('human-item-heal', {...operation, hpField: `${prefix}current_hp`,
      maxHpField: `${prefix}max_hp`, statusField: `${prefix}status`, base, seed: context.randomSeed,
      inventoryField, slot: context.inventory_index ?? 0, item: context.item,
      consume: item.id !== 0xD1}), message(0), message(1), finish];
  }
  const vehicle = context.role;
  const wax = path.resultScript === 'battle-result-script:A5';
  if (wax && (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10))
    return [boundary('本次石蜡调用缺少行动方编号')];
  const statusField = wax ? `${prefix.split('.role.')[0]}.vehicle.${vehicle}.condition_raw` : `${prefix}status`;
  return [...(call.consume ? [effect('consume-item', {inventoryField,
    slot: context.inventory_index ?? 0, item: context.item})] : []), message(0),
    effect('human-item-clear', {...operation, statusField,
      mask: wax || ['battle-result-script:A9', 'battle-result-script:A7'].includes(path.resultScript) ? 4 : 8,
      resultMessage: wax ? 186 : ['battle-result-script:A9', 'battle-result-script:A7'].includes(path.resultScript) ? 50 : 186}),
    message(1), finish];
}

export function applyBattleHumanItemEffect(fields, operation, context, domainResults) {
  const unavailable = reason => ({status: 'unavailable', reason});
  if (operation.actor !== context.actor) return unavailable('本次道具效果绑定另一人物');
  const runtime = {...domainResults.battleActor, actor: context.actor};
  if (operation.id === 'human-item-heal' || operation.id === 'human-item-coin') {
    if (!Number.isInteger(operation.seed) || operation.seed < 0 || operation.seed > 65535)
      return unavailable('本次道具缺少随机输入');
    const random = globalRandom(operation.seed);
    if (operation.id === 'human-item-coin') {
      const value = random.next();
      if (operation.expected !== textId((value & 15) >= 8 ? 83 : 84))
        return unavailable('当前随机输入进入另一古币结果');
      runtime.random = random.snapshot();
    } else {
      const result = partyHealingValues({hp: fields[operation.hpField], maxHp: fields[operation.maxHpField],
        status: fields[operation.statusField], base: operation.base, randomHigh: random.snapshot().high});
      if (result.missing) return unavailable(result.missing);
      if (operation.expected !== textId(result.message)) return unavailable('当前 HP 与随机输入进入另一回复结果');
      const inventory = fields[operation.inventoryField];
      if (inventory?.[operation.slot] !== operation.item) return unavailable('本次回复物品携带位已改变');
      if (operation.consume) {
        const next = Array.from(inventory); next.splice(operation.slot, 1); next.push(0);
        fields[operation.inventoryField] = inventory instanceof Uint8Array ? Uint8Array.from(next) : next;
      }
      fields[operation.hpField] = result.hp;
      runtime.healingQuantity = result.quantity;
      runtime.random = random.snapshot();
    }
  } else if (operation.id === 'human-item-clear') {
    const status = fields[operation.statusField];
    if (!Number.isInteger(status) || status < 0 || status > 255) return unavailable('本次状态查询缺少人物字段');
    const present = Boolean(status & operation.mask);
    if (operation.expected !== textId(present ? operation.resultMessage : 58))
      return unavailable('当前状态进入另一清除结果');
    if (present) fields[operation.statusField] = status & ~operation.mask;
  } else if (operation.id === 'human-item-map') {
    if (!Number.isInteger(operation.sceneId) || operation.sceneId < 0 || operation.sceneId > 255)
      return unavailable('本次地图调用缺少场景编号');
    if (operation.sceneId === 0) runtime.mapState = 3;
  } else return unavailable('本次人物道具效果未确认');
  return {status: 'available', fields, domainResults: {battleActor: runtime}};
}
