// @editor-module 敌方行动调用只修改本次战斗的隔离现场。
import {globalRandom} from './global-random.js';
import {battleInstanceSuffixSource} from './text-record-project.js';
import {SERVICE_ROLES} from './service-preview-state.js';

export const BATTLE_ENEMY_MESSAGE_EVIDENCE = 'project/evidence/reverse-engineering/damage-enemy-message-calls/observations.json';
const BATTLE_ENEMY_ACCURACY_EVIDENCE = 'project/evidence/reverse-engineering/enemy-group-accuracy-call/observations.json';
const BATTLE_ENEMY_POISON_EVIDENCE = 'project/evidence/reverse-engineering/enemy-poison-message-call/observations.json';
const BATTLE_ENEMY_DODGE_EVIDENCE = 'project/evidence/reverse-engineering/enemy-acid-dodge-call/observations.json';
const BATTLE_ENEMY_PANIC_EVIDENCE = 'project/evidence/reverse-engineering/enemy-panic-wave-call/observations.json';
const BATTLE_ENEMY_SLEEP_EVIDENCE = 'project/evidence/reverse-engineering/enemy-sleep-wave-call/observations.json';
const BATTLE_ENEMY_LONG_WAVE_EVIDENCE = 'project/evidence/reverse-engineering/enemy-long-wave-call/observations.json';
const calls = {
  'enemy-action:2D': {script: 'battle-result-script:14', bytes: [0xFC, 0x16, 0x19],
    states: ['action', 'condition'], texts: [129, 35], effect: 'enemy-party-sleep',
    condition: {selector: 4, successor: 0x16, bytes: [0xFE, 4, 0x18, 0x1A], result: 0x1A, mask: 64, counter: 0},
    evidence: BATTLE_ENEMY_SLEEP_EVIDENCE},
  'enemy-action:32': {script: 'battle-result-script:63', bytes: [0xFC, 0x64, 0x19],
    states: ['action', 'condition'], texts: [134, 34], effect: 'enemy-party-long-wave',
    condition: {selector: 0, successor: 0x64, bytes: [0xFE, 0, 0x19, 0x12], result: 0x12, mask: 128, counter: 255},
    evidence: BATTLE_ENEMY_LONG_WAVE_EVIDENCE},
  'enemy-action:31': {script: 'battle-result-script:0E', bytes: [0xD7, 0xFE, 0, 0x19, 0x56],
    states: ['action', 'panic-wave-result'], texts: [133, 37], effect: 'enemy-party-panic',
    condition: {selector: 0, result: 0x56, mask: 16, counter: 0},
    evidence: BATTLE_ENEMY_PANIC_EVIDENCE},
  'enemy-action:2F': {script: 'battle-result-script:3A', bytes: [0xFD, 2, 0x3B, 0x3C],
    states: ['action', 'acid-dodge'], texts: [131, 10], effect: 'enemy-party-dodge',
    evidence: BATTLE_ENEMY_DODGE_EVIDENCE},
  'enemy-action:2C': {script: 'battle-result-script:1F', bytes: [0xF9, 7],
    states: ['action', 'poison-gas-result'], texts: [127, 41], effect: 'enemy-party-poison',
    evidence: BATTLE_ENEMY_POISON_EVIDENCE},
  'enemy-action:33': {script: 'battle-result-script:41', bytes: [0xF0],
    states: ['action', 'detection-wave-accuracy-first', 'detection-wave-accuracy-second'],
    texts: [135, 70, 70], effect: 'enemy-group-accuracy', evidence: BATTLE_ENEMY_ACCURACY_EVIDENCE},
  'enemy-action:42': {script: 'battle-result-script:72', bytes: [0xC6, 0xBD, 0xE5],
    states: ['action', 'item-effect'], texts: [152, 73], effect: 'enemy-full-heal'},
  'enemy-action:3F': {script: 'battle-result-script:74', bytes: [0xC8, 0xEE],
    states: ['underground'], texts: [149], effect: 'enemy-underground'},
};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const word = value => Number.isInteger(value) && value >= 0 && value <= 65535;

function validCallState(state) {
  if (!Array.isArray(state?.instances) || state.instances.length !== 9
      || !Array.isArray(state.groups) || state.groups.length !== 4
      || !Number.isInteger(state.actor) || state.actor < 0 || state.actor >= 9) return false;
  return state.instances.every((instance, slot) => !instance || instance.slot === slot
    && instance.present === true && instance.targetable === true && instance.status === 0
    && byte(instance.monster_id) && Number.isInteger(instance.group) && instance.group >= 0 && instance.group < 4
    && word(instance.hp) && word(instance.maxHp) && instance.hp <= instance.maxHp && byte(instance.shield)
    && instance.hp + instance.shield > 0
    && state.groups[instance.group]?.monster_id === instance.monster_id
    && instance.population_snapshot === state.groups[instance.group].population_snapshot)
    && state.groups.every((group, index) => !group
      ? !state.instances.some(instance => instance?.group === index)
      : group.population === state.instances.filter(instance => instance?.group === index).length
        && group.population > 0 && Number.isInteger(group.population_snapshot)
        && group.population_snapshot >= group.population && group.population_snapshot <= 9);
}

export function battleEnemyMessageCallContract(action, script, phases, record) {
  const call = calls[action];
  if (!call || script !== call.script || phases?.length !== call.texts.length
      || phases.some((phase, index) => phase.state !== `battle-messages.${call.states[index]}`
        || phase.slot !== 'slot:message:0' || phase.retain_previous !== (index > 0)
        || phase.text_record_ref?.resource_id !== 'text-record'
        || phase.text_record_ref.node_id !== `record:0A:${String(call.texts[index]).padStart(3, '0')}`)) return null;
  if (record !== undefined && (record?.handle !== script || record.raw_bytes?.length !== call.bytes.length
      || record.raw_bytes.some((value, index) => value !== call.bytes[index]))) return null;
  return structuredClone(call);
}

// 初始化命名序号按敌群内的装载顺序分配；绑定后保留命名数量快照。
export function battleEnemyMessageInitialState(input, {seed = 0, allTargets = false, pendingDirections = 0,
  sonicResistanceItem} = {}) {
  if (!Array.isArray(input?.enemies) || !Array.isArray(input?.party) || !byte(pendingDirections)
      || input.party.some(role => role.resultConditionStates != null || role.conditionTurns != null)) return null;
  const random = globalRandom(seed), groups = Array.from({length: 4}, () => null);
  const instances = Array(9).fill(null);
  for (const enemy of [...input.enemies].sort((a, b) => a.slot - b.slot)) {
    if (!Number.isInteger(enemy.slot) || enemy.slot < 0 || enemy.slot >= 9 || instances[enemy.slot]
        || !Number.isInteger(enemy.groupIndex) || enemy.groupIndex < 0 || enemy.groupIndex >= 4
        || !byte(enemy.monsterId) || !word(enemy.hp) || !word(enemy.maxHp) || enemy.hp > enemy.maxHp
        || !byte(enemy.shield) || !byte(enemy.status) || enemy.status !== 0
        || (enemy.repeatCode ?? 0) !== 0 || enemy.linkedSlots?.length) return null;
    const group = groups[enemy.groupIndex] ||= {monster_id: enemy.monsterId, population: 0};
    if (group.monster_id !== enemy.monsterId) return null;
    group.population++;
    instances[enemy.slot] = {slot: enemy.slot, group: enemy.groupIndex, monster_id: enemy.monsterId,
      present: true, targetable: true, hp: enemy.hp, maxHp: enemy.maxHp, shield: enemy.shield,
      status: enemy.status, suffix_source: battleInstanceSuffixSource(group.population)};
  }
  for (const group of groups.filter(Boolean)) group.population_snapshot = group.population;
  for (const instance of instances.filter(Boolean)) instance.population_snapshot = groups[instance.group].population_snapshot;
  const available = input.party.filter(role => role.present && role.status !== 255).map(role => role.slot).sort((a, b) => a - b);
  if (!available.length || new Set(available).size !== available.length
      || available.some(role => !Number.isInteger(role) || role < 0 || role > 2)) return null;
  const targets = allTargets ? available : [available.toReversed()[random.below(available.length)]];
  const actor = instances.findLast(instance => instance?.targetable)?.slot;
  const randomHigh = random.snapshot().high;
  const randomLow = random.snapshot().low;
  const accuracy = Array(9).fill(null);
  for (const enemy of input.enemies) if (byte(enemy.attackSkill)) accuracy[enemy.slot] = enemy.attackSkill;
  const party = structuredClone(input.party);
  for (const role of party) role.resultConditionStates = {4: 0};
  for (const role of party) if (byte(sonicResistanceItem) && sonicResistanceItem > 0 && byte(role.slotFlags)
      && Array.isArray(role.equipment) && role.equipment.length === 8 && role.equipment.every(byte)) {
    role.resultConditionStates[0] = role.equipment.some((id, slot) => id === sonicResistanceItem
      && (role.slotFlags & (0x80 >> slot))) ? 2 : 0;
  }
  const randomInputs = targets.length > 1 ? targets.map((_, index) => index ? random.next() : randomHigh) : undefined;
  return actor === undefined ? null : {actor, instances, groups, targets, randomHigh, randomInputs,
    randomLow, accuracy, party,
    pendingDirections, exitControl: 0, ended: false, reward: {gold: 0, experience: 0}};
}

function accuracyTargets(callState) {
  if (!byte(callState?.randomLow) || !byte(callState.randomHigh)
      || !Array.isArray(callState.accuracy) || callState.accuracy.length !== 9
      || !callState.accuracy.every(value => value === null || byte(value))) return null;
  const random = globalRandom((callState.randomHigh << 8) | callState.randomLow);
  const seen = new Set();
  let group;
  do {
    const state = random.snapshot(), seed = (state.high << 8) | state.low;
    if (seen.has(seed)) return null;
    seen.add(seed);
    group = random.next() & 3;
  } while (!callState.groups[group]?.population);
  const targets = callState.instances.filter(instance => instance?.group === group).map(instance => instance.slot);
  return targets.length === 2 && byte(callState.accuracy[group]) ? {group, targets} : null;
}

export function battleEnemyMessageCallOperations({path, record, action, callState, directionMasks, fields, context, resultScripts} = {}) {
  const call = battleEnemyMessageCallContract(path?.enemyActionReference, path?.resultScript, path?.phases, record || null);
  const actor = callState?.instances?.[callState.actor];
  if (!call || action?.handle !== path.enemyActionReference
      || action.fields?.result_script?.value !== call.script
      || action.fields?.message?.value !== `record:0A:${String(call.texts[0]).padStart(3, '0')}`
      || !validCallState(callState) || !actor?.present || !actor.targetable || actor.status !== 0
      || !word(actor.hp) || !word(actor.maxHp) || actor.hp > actor.maxHp
      || !byte(callState.randomHigh) || !byte(callState.pendingDirections) || callState.exitControl !== 0
      || !Array.isArray(callState.targets) || !callState.targets.length
      || callState.targets.some(target => !Number.isInteger(target) || target < 0 || target > 2)
      || new Set(callState.targets).size !== callState.targets.length
      || (callState.targets.length > 1 && (!Array.isArray(callState.randomInputs)
        || callState.randomInputs.length !== callState.targets.length || !callState.randomInputs.every(byte)))
      || (call.effect === 'enemy-full-heal' && callState.targets.length !== 1)
      || (call.effect === 'enemy-underground' && (!Array.isArray(directionMasks)
        || directionMasks.length !== 4 || !directionMasks.every(byte))))
    return [{kind: 'boundary', missing: '敌方调用缺少匹配的行动、结果记录、目标列表或运行时字段'}];
  const evidence = call.evidence || BATTLE_ENEMY_MESSAGE_EVIDENCE;
  const message = phase => ({kind: 'message', phase, evidence});
  const effect = id => ({kind: 'effect', id, confirmed: true, evidence,
    callState: structuredClone(callState), directionMasks: structuredClone(directionMasks)});
  if (call.effect.startsWith('enemy-party-')) {
    const target = callState.targets[0], role = callState.party?.find(role => role.slot === target);
    const prefix = `save.slot.${context?.slot}.role.${SERVICE_ROLES[target]}.`;
    if (callState.targets.length !== 1 || ![1, 2].includes(context?.slot)
        || !byte(role?.present) || (role.present & 0x7F) !== target + 1 || !byte(role.status) || role.status & 0xE0
        || !word(role.hp) || role.hp < 1 || fields?.[`${prefix}present`] !== role.present
        || fields?.[`${prefix}status`] !== role.status || fields?.[`${prefix}current_hp`] !== role.hp)
      return [{kind: 'boundary', missing: '敌方消息缺少本次存活队员的姓名、状态和 HP 字段'}];
    if (call.effect === 'enemy-party-dodge') {
      const successor = resultScripts?.find(row => row.handle === 'battle-result-script:3B');
      if (!byte(callState.randomLow) || !byte(callState.randomHigh)
          || successor?.raw_bytes?.length !== 2 || successor.raw_bytes[0] !== 0xF7 || successor.raw_bytes[1] !== 10
          || (globalRandom((callState.randomHigh << 8) | callState.randomLow).next() & 15) < 2)
        return [{kind: 'boundary', missing: '酸液当前随机输入进入命中分支或躲闪后继记录不匹配'}];
    }
    if (call.condition) {
      const condition = role.resultConditionStates?.[call.condition.selector];
      const effectRecord = resultScripts?.find(row => row.id === call.condition.result);
      const successor = resultScripts?.find(row => row.id === call.condition.successor);
      if (![0, 2].includes(condition) || !byte(callState.randomLow) || !byte(callState.randomHigh)
          || (call.effect !== 'enemy-party-panic' && role.present & 128)
          || (call.effect === 'enemy-party-long-wave' && (callState.party.length !== 1 || role.status !== 0))
          || effectRecord?.raw_bytes?.length !== 2 || effectRecord.raw_bytes[0] !== 0xF9
          || effectRecord.raw_bytes[1] !== (call.condition.selector === 4 ? 1 : call.condition.result === 0x56 ? 3 : 0)
          || (call.condition.successor !== undefined && (successor?.raw_bytes?.length !== call.condition.bytes.length
            || successor.raw_bytes.some((value, index) => value !== call.condition.bytes[index])))
          || (globalRandom((callState.randomHigh << 8) | callState.randomLow).next() & 15) >= [6, 3, 0][condition])
        return [{kind: 'boundary', missing: '异常消息缺少本次人物条件、后继记录或随机输入进入其他分支'}];
    }
    return [message(path.phases[0]), {...effect(call.effect), target, statusField: `${prefix}status`,
      hpField: `${prefix}current_hp`, presentField: `${prefix}present`, condition: call.condition}, message(path.phases[1]),
      ...(call.effect === 'enemy-party-long-wave' ? [{...effect('enemy-party-finalize'), target,
        statusField: `${prefix}status`}] : []),
      {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
        actor: callState.actor, enemyAction: action.handle, resultScript: call.script, target}}];
  }
  if (call.effect === 'enemy-group-accuracy') {
    const selected = accuracyTargets(callState);
    if (callState.targets.length !== 1 || !selected)
      return [{kind: 'boundary', missing: '检测波缺少两实例敌群或敌群编号对应的命中率当前字节'}];
    return [message(path.phases[0]), {...effect('enemy-accuracy-select'), selected},
      {...effect('enemy-accuracy-add'), group: selected.group}, message(path.phases[1]),
      {...effect('enemy-accuracy-add'), group: selected.group}, message(path.phases[2]),
      {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
        actor: callState.actor, enemyAction: action.handle, resultScript: call.script}}];
  }
  return [message(path.phases[0]), effect(call.effect),
    ...(call.effect === 'enemy-full-heal' ? [message(path.phases[1])] : []),
    {kind: 'return', evidence, value: {scope: 'enemy-action', confirmed: true,
      actor: callState.actor, enemyAction: action.handle, resultScript: call.script}}];
}

export function applyBattleEnemyMessageEffect(fields, operation, context, domainResults = {}) {
  const source = ['enemy-accuracy-add', 'enemy-party-finalize'].includes(operation.id)
    ? domainResults.enemyCall : operation.callState;
  const battle = structuredClone(source), actor = battle?.instances?.[battle.actor];
  if (!actor?.present || !actor.targetable) return {status: 'unavailable', reason: '本次敌方行动方不存在'};
  if (operation.id === 'enemy-party-finalize') {
    const role = battle.party?.find(role => role.slot === operation.target);
    if (battle.party.length !== 1 || role?.status !== 128 || fields[operation.statusField] !== role.status)
      return {status: 'unavailable', reason: '长波完成缺少唯一人物的麻痹状态'};
    role.status = 255;
    fields[operation.statusField] = role.status;
    battle.ended = true;
  } else if (operation.id.startsWith('enemy-party-')) {
    const role = battle.party?.find(role => role.slot === operation.target);
    if (!role || fields[operation.statusField] !== role.status || fields[operation.hpField] !== role.hp
        || fields[operation.presentField] !== role.present || role.status & 0xE0)
      return {status: 'unavailable', reason: '敌方消息目标与本次队员字段不一致'};
    if (operation.id !== 'enemy-party-dodge') {
      const poison = operation.id === 'enemy-party-poison';
      role.status |= poison ? 1 : operation.condition.mask;
      const selector = poison ? 7 : operation.condition.selector === 4 ? 1 : operation.condition.result === 0x56 ? 3 : 0;
      role.conditionTurns = {...role.conditionTurns, [selector]: poison ? 3 : operation.condition.counter};
      fields[operation.statusField] = role.status;
    }
    battle.messagePartyTargets = [null, operation.target];
  } else if (operation.id === 'enemy-accuracy-select') {
    const selected = accuracyTargets(battle);
    if (!validCallState(battle) || !selected || selected.group !== operation.selected?.group
        || selected.targets.some((target, index) => target !== operation.selected.targets[index]))
      return {status: 'unavailable', reason: '检测波敌群与本次实例绑定不一致'};
    battle.accuracyGroup = selected.group;
    battle.messageTargets = [battle.actor, ...selected.targets];
  } else if (operation.id === 'enemy-accuracy-add') {
    if (operation.group !== battle.accuracyGroup || !byte(battle.accuracy?.[operation.group]))
      return {status: 'unavailable', reason: '检测波命中率字节与本次敌群绑定不一致'};
    // B054 将 Y 设为敌群编号；B618 只保存加量后的低字节。
    battle.accuracy[operation.group] = (battle.accuracy[operation.group] + 30) & 255;
  } else if (operation.id === 'enemy-full-heal') actor.hp = actor.maxHp;
  else if (operation.id === 'enemy-underground') {
    for (let index = 0; index < battle.targets.length; index++) {
      const randomHigh = battle.randomInputs?.[index] ?? battle.randomHigh;
      battle.pendingDirections |= operation.directionMasks[randomHigh & 3];
      battle.exitControl = (battle.exitControl - 1) & 255;
    }
    actor.targetable = false; actor.status = 255; actor.hp = 0;
    battle.groups[actor.group].population--;
    battle.ended = !battle.instances.some(instance => instance?.targetable);
    battle.exitControl = 0;
  } else return {status: 'unavailable', reason: '本次敌方效果未确认'};
  return {status: 'available', fields, domainResults: {enemyCall: battle}};
}
