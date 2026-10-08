// @editor-module 战斗消息按本次参数写入阶段读取实体当前值。
import {currentActorNameSource, itemNameRecordId, fixedRuntimeTextScriptHex} from './text-record-project.js';
import {uiTemplateBindings} from './ui-template-bindings.js';

const unavailable = reason => ({status: 'unavailable', reason});
const reference = node_id => ({resource_id: 'text-record', node_id});
const sameIdentity = (left, right, keys) => keys.every(key =>
  (typeof left?.[key] === 'string' && left[key].length > 0 || Number.isInteger(left?.[key]))
    && left[key] === right?.[key]);
const sameSubject = (bound, selected) => bound?.kind === selected?.kind
  && (selected?.kind === 'enemy' ? bound?.slot === selected.slot : bound?.id === selected?.id);

function recordClosure(catalog, roots) {
  const found = new Set();
  const pending = [...roots];
  while (pending.length) {
    const node = pending.pop();
    if (found.has(node)) continue;
    found.add(node);
    pending.push(...(catalog?.records?.[node]?.fixed_includes || [])
      .map(row => row.text_record_ref.node_id));
  }
  return [...found].sort();
}

export function battleMessageStateSources(templates, interfaces) {
  const catalog = templates?.battle_message_runtime_parameters;
  const states = interfaces?.interfaces?.find(row => row.id === 'battle-messages')?.states || [];
  return states.map(state => {
    const bindings = uiTemplateBindings(templates).filter(row => row.state === state.id
      || row.state.startsWith(`${state.id}:`));
    const roots = [...new Set([
      ...(state.evidence?.records || []).map(row => typeof row === 'string' ? row : row.id),
      ...bindings.flatMap(binding => [
        ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id),
        ...(binding.deferred_records || []),
      ])].filter(Boolean))].sort();
    const records = recordClosure(catalog, roots);
    return {state: state.id, roots, records,
      insertions: records.flatMap(node_id => (catalog?.records?.[node_id]?.insertions || [])
        .map(binding => ({text_record_ref: reference(node_id), ...binding,
          value_type: catalog.sources[binding.source]?.value_type,
          writers: Object.entries(catalog.current_value_contract?.writers || {})
            .filter(([, writer]) => writer.sources.includes(binding.source))
            .map(([id]) => id)})))};
  });
}

// 参数写入者由本次战斗调用方显式绑定，消息记录与界面状态不推断写入者。
export function createBattleContextValues({catalog, readBattle, readSaveFields,
  readMonster, readItem} = {}) {
  const contract = catalog?.current_value_contract;
  if (!contract || typeof readBattle !== 'function') {
    throw new TypeError('缺少已发布的战斗当前值契约或本次战斗读取入口');
  }
  const tokens = new WeakMap();

  function actorName(battle, actor) {
    const fields = readSaveFields?.();
    if (!fields?.slotStatus(battle.save_slot)?.valid) return unavailable('本次战斗的存档槽不存在');
    if (!['role', 'vehicle'].includes(actor?.kind) || !Number.isInteger(actor.id)) {
      return unavailable('本次姓名写入缺少人物或战车绑定');
    }
    const objects = fields.all(`save.slot.${battle.save_slot}.${actor.kind}.`);
    const result = currentActorNameSource({saveSlot: battle.save_slot, actor, fieldObjects: objects});
    if (result.status !== 'available') return result;
    const name = objects.find(row => row.fieldId === result.field_id);
    const present = actor.kind === 'role'
      ? fields.find(`${name.fieldId.slice(0, -'.name_codes'.length)}.present`)?.value
      : fields.vehicleAcquired(battle.save_slot, actor.id);
    return present ? result : unavailable('本次姓名写入所选实体已删除');
  }

  function enemy(battle, selected) {
    if (selected?.kind !== 'enemy' || !Number.isInteger(selected.slot)
        || selected.slot < 0 || selected.slot >= contract.enemy_groups.instance_slots) return null;
    const instance = battle.enemy_instances?.[selected.slot];
    const group = battle.enemy_groups?.[instance?.group];
    if (!instance || instance.present !== true || !Number.isInteger(instance.group)
        || instance.group < 0 || instance.group >= contract.enemy_groups.group_slots || !group) return null;
    const monster = readMonster?.(instance.monster_id);
    return monster && monster.id === instance.monster_id ? {instance, group, monster} : null;
  }

  function monsterName(monster) {
    const name = monster?.name_reference;
    return name?.mapping_status === 'confirmed' && typeof name.node_id === 'string'
      ? {status: 'available', value: reference(name.node_id)}
      : unavailable('本次怪物缺少已确认的名称文本引用');
  }

  function currentBattle(identity) {
    const battle = readBattle();
    return battle?.origin === contract.battle_origin
      && sameIdentity(identity, battle.identity, contract.identity_fields) ? battle : null;
  }

  function forMessage({state, text_record_ref, identity, parameters} = {}) {
    const node = text_record_ref?.resource_id === 'text-record' ? text_record_ref.node_id : null;
    const token = Object.freeze({state, text_record_ref, identity: Object.freeze({...identity})});
    tokens.set(token, {state, node, identity: token.identity,
      declared: contract.message_state_roots?.[state]?.includes(node) === true,
      records: new Set(recordClosure(catalog, node ? [node] : [])),
      parameters: structuredClone(parameters || {})});
    return token;
  }

  function resolveRuntimeParameter(request) {
    const message = tokens.get(request?.invocation);
    const battle = message && currentBattle(message.identity);
    if (!battle || !message.declared) return unavailable('消息不属于本次战斗、行动、目标迭代或已发布状态');
    if (battle.state !== message.state || battle.text_record_ref?.node_id !== message.node
        || !message.records.has(request.text_record_ref?.node_id)) {
      return unavailable('参数不属于本次消息状态或文本引用闭包');
    }
    const insertion = catalog.records[request.text_record_ref.node_id]?.insertions?.find(row =>
      row.command_index === request.command_index && row.source === request.source);
    const parameter = message.parameters[request.source];
    const writer = contract.writers[parameter?.writer];
    if (request.text_record_ref.resource_id !== 'text-record' || !insertion || !writer
        || !writer.sources.includes(request.source)
        || parameter.phase !== contract.parameter_phase
        || !sameIdentity(parameter.identity, message.identity, contract.identity_fields)) {
      return unavailable('本次插入缺少匹配的参数写入阶段');
    }
    const selected = parameter.subject === 'actor' ? battle.actor
      : parameter.subject === 'target' ? battle.target : null;
    if (!writer.subjects.includes(parameter.subject)) return unavailable('参数写入者与所选实体类别不符');
    if (selected && !sameSubject(parameter.subject_binding, selected)) {
      return unavailable('参数写入阶段绑定的是另一实体');
    }
    if (parameter.writer === 'save-name') return actorName(battle, selected);
    if (parameter.writer === 'enemy-context') {
      const selectedEnemy = enemy(battle, selected);
      if (!selectedEnemy) return unavailable('本次敌方实体已删除或缺少敌群与怪物当前值');
      if (parameter.subject_binding?.group !== selectedEnemy.instance.group
          || parameter.subject_binding.monster_id !== selectedEnemy.instance.monster_id) {
        return unavailable('本次敌方实体的敌群或怪物绑定已改变');
      }
      if (catalog.sources[request.source].value_type === 'text-record-ref') {
        return monsterName(selectedEnemy.monster);
      }
      const snapshot = parameter.population_snapshot;
      if (!Number.isInteger(snapshot) || snapshot < 0 || snapshot > 255) {
        return unavailable('本次目标绑定缺少命名数量快照');
      }
      if (snapshot < contract.enemy_groups.suffix_minimum_population) return {status: 'empty'};
      const value = parameter.suffix_source;
      try {
        if (!value?.raw_hex || value.terminator !== contract.enemy_groups.suffix_terminator) {
          return unavailable('本次目标绑定缺少不透明的实例后缀文字源');
        }
        fixedRuntimeTextScriptHex(value);
        return {status: 'available', value};
      } catch {
        return unavailable('本次目标绑定的实例后缀文字源无效');
      }
    }
    if (parameter.writer === 'item-reference') {
      if (parameter.subject_binding !== battle.item) return unavailable('本次参数绑定的是另一物品');
      const item = readItem?.(battle.item);
      const node = item?.id === battle.item ? itemNameRecordId(item) : null;
      return node ? {status: 'available', value: reference(node)}
        : unavailable('本次物品已删除或缺少名称文本引用');
    }
    if (parameter.writer === 'group-reference') {
      if (parameter.subject_binding !== battle.changed_group) return unavailable('本次参数绑定的是另一变更敌群');
      const group = battle.enemy_groups?.[battle.changed_group];
      const monster = group && readMonster?.(group.monster_id);
      return group && Number.isInteger(group.population) && group.population > 0
        && monster?.id === group.monster_id ? monsterName(monster) : unavailable('本次变更敌群不存在');
    }
    if (parameter.writer === 'quantity-result') {
      const target = battle.target;
      const exists = target?.kind === 'enemy' ? enemy(battle, target)
        : actorName(battle, target).status === 'available';
      if (!exists || !sameSubject(parameter.subject_binding, target)
          || (target.kind === 'enemy' && (parameter.subject_binding.group !== exists.instance.group
            || parameter.subject_binding.monster_id !== exists.instance.monster_id))) {
        return unavailable('本次数值写入的目标已删除或绑定已改变');
      }
      const result = battle.quantity;
      return result?.origin === contract.quantity_origin
        && sameIdentity(result.identity, message.identity, contract.identity_fields)
        && result.text_record_ref?.resource_id === 'text-record'
        && result.text_record_ref.node_id === request.text_record_ref.node_id
        && result.command_index === request.command_index
        && result.phase === contract.quantity_phase
        && Number.isInteger(result.value) && result.value >= 0 && result.value <= 65535
        ? {status: 'available', value: result.value}
        : unavailable('本次插入缺少同阶段逆向公式的结算当前值');
    }
    return unavailable('本次参数写入者尚未实现');
  }

  function targetChoices(identity) {
    const battle = currentBattle(identity);
    if (!battle) return unavailable('缺少本次战斗的目标选择现场');
    const groups = Array.from({length: contract.enemy_groups.group_slots}, (_, index) => {
      const group = battle.enemy_groups?.[index];
      if (!group || !Number.isInteger(group.population) || group.population <= 0) return null;
      const monster = readMonster?.(group.monster_id);
      const name = monster?.id === group.monster_id && monsterName(monster);
      return name?.status === 'available' ? {group: index, monster_id: group.monster_id,
        population: group.population, text_record_ref: name.value} : null;
    }).filter(Boolean);
    const instances = Array.from({length: contract.enemy_groups.instance_slots}, (_, slot) => {
      const selected = enemy(battle, {kind: 'enemy', slot});
      const group = groups.find(row => row.group === selected?.instance.group);
      const name = selected && monsterName(selected.monster);
      return selected?.instance.targetable === true && group && name.status === 'available'
        ? {slot, group: group.group, text_record_ref: name.value} : null;
    }).filter(Boolean);
    return {status: 'available', groups, instances};
  }

  return {forMessage, resolveRuntimeParameter, targetChoices};
}

export function battleContextTextSlot(slot, context, message) {
  return {...slot, invocation: context.forMessage(message),
    resolveRuntimeParameter: context.resolveRuntimeParameter};
}
