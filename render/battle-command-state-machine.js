// @editor-module 战斗选择只更新隔离现场，行动与结果交接既有战斗组件。
import {interfacePreviewState} from './interface-state-preview.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {roleEquipmentStats} from '../core/role-equipment-derived.js';
import {battleConditionWaitCount} from '../core/battle-condition-preview.js';

export const BATTLE_INTERFACE_PAGES = ['battle-scene', 'battle-command-target', 'battle-party-status', 'battle-items-equipment'];
export const BATTLE_COMMAND = 'battle-command-target.command';
export const BATTLE_AUXILIARY = 'battle-party-status.auxiliary';
export const BATTLE_RESPONSE = 'battle-party-status.command-response';
const BATTLE_TARGET = 'battle-command-target.target';
const PLAYBACK = 'battle:playback';
const EVIDENCE = 'project/evidence/reverse-engineering/battle-command-state-machine/command-gaps.json';
const FOLLOWUP_EVIDENCE = 'project/evidence/reverse-engineering/battle-command-followups/observations.json';
const DISPLAY_CONTROLS = {
  'battle-scene.command': BATTLE_COMMAND,
  'battle-party-status.human': BATTLE_COMMAND,
  'battle-party-status.vehicle': BATTLE_COMMAND,
  'battle-scene.target': BATTLE_TARGET,
  'battle-items-equipment.target': BATTLE_TARGET,
};
const HUMAN_ITEMS = 'battle-items-equipment.human-items', VEHICLE_ITEMS = 'battle-items-equipment.vehicle-items';
const EQUIPMENT = 'battle-items-equipment.human-equipment', SHELLS = 'battle-items-equipment.special-shell';

export function battleCommandGraph(catalog) {
  const nodes = catalog.interfaces.filter(row => BATTLE_INTERFACE_PAGES.includes(row.id)).flatMap(page =>
    page.states.filter(row => row.ui_role === 'screen').map(row => ({id: row.id, stateId: row.id,
      pageId: page.id, label: row.label, confirmed: row.status === 'confirmed'})));
  for (const [id, label] of [[BATTLE_AUXILIARY, '辅助'], [BATTLE_RESPONSE, '命令回应']])
    if (!nodes.some(row => row.id === id)) nodes.push({id,
      stateId: id, pageId: 'battle-party-status', label, confirmed: true});
  for (const id of [EQUIPMENT, 'battle-party-status.condition']) nodes.find(row => row.id === id).confirmed = true;
  for (const node of nodes) if (DISPLAY_CONTROLS[node.id]) node.confirmed = true;
  nodes.push({id: PLAYBACK, pageId: 'battle-command-target', label: '战斗播放', boundary: true, confirmed: true,
    referenceTarget: {pageId: 'battle-messages', label: '战斗文本与效果提示'}});
  nodes.push({id: 'battle:results', label: '战斗结果', boundary: true, confirmed: true,
    referenceTarget: {pageId: 'battle-results', nodeId: 'battle-results.victory', label: '战斗结果'}});
  const transitions = [];
  const add = (from, to, input, unknown = false, condition = '') => transitions.push({id: `battle-edge:${transitions.length}`,
    from, to, input, unknown, condition, evidence: unknown || !condition ? EVIDENCE : FOLLOWUP_EVIDENCE});
  add('battle-scene.encounter', BATTLE_COMMAND, 'A · 进入命令');
  for (const id of [BATTLE_TARGET, HUMAN_ITEMS, VEHICLE_ITEMS, EQUIPMENT, SHELLS, BATTLE_AUXILIARY])
    add(BATTLE_COMMAND, id, id === BATTLE_TARGET ? 'A · 武器' : `A · ${nodes.find(row => row.id === id).label}`);
  add(BATTLE_AUXILIARY, 'battle-party-status.condition', 'A · 状态');
  add(BATTLE_AUXILIARY, BATTLE_AUXILIARY, 'A · 情报、动画或音响');
  add(BATTLE_AUXILIARY, BATTLE_COMMAND, 'A · 逃跑、防卫或保护；下一行动方');
  add(BATTLE_AUXILIARY, BATTLE_RESPONSE, 'A · 乘降');
  add(BATTLE_RESPONSE, BATTLE_COMMAND, 'A/B · 正文结束');
  add(EQUIPMENT, BATTLE_COMMAND, 'A · 装备重算');
  add('battle-party-status.condition', BATTLE_COMMAND, 'A · 正文结束');
  for (const id of [HUMAN_ITEMS, VEHICLE_ITEMS]) add(id, BATTLE_COMMAND, 'A · 非敌方工具；下一行动方');
  for (const id of [HUMAN_ITEMS, VEHICLE_ITEMS, BATTLE_AUXILIARY]) add(id, PLAYBACK, 'A · 本轮末行动提交');
  for (const id of [HUMAN_ITEMS, VEHICLE_ITEMS, SHELLS]) add(id, BATTLE_TARGET, id === SHELLS ? 'A · 非空炮弹' : 'A · 敌方工具');
  add(BATTLE_TARGET, PLAYBACK, 'A · 人物武器提交');
  add(BATTLE_TARGET, PLAYBACK, 'A · 道具或战车提交');
  for (const id of [HUMAN_ITEMS, VEHICLE_ITEMS, SHELLS]) add(BATTLE_TARGET, id, 'B · 返回选择列表');
  add(PLAYBACK, 'battle:results', '战斗组件完成结果');
  add(PLAYBACK, BATTLE_COMMAND, '本轮完成；重新选择命令');
  for (const node of nodes.filter(row => !row.boundary)) {
    const executable = [BATTLE_COMMAND, BATTLE_TARGET, HUMAN_ITEMS, VEHICLE_ITEMS, SHELLS, EQUIPMENT,
      BATTLE_AUXILIARY, BATTLE_RESPONSE, 'battle-party-status.condition'].includes(node.id);
    const protocol = DISPLAY_CONTROLS[node.id] === BATTLE_COMMAND ? '共用命令窗口输入'
      : DISPLAY_CONTROLS[node.id] === BATTLE_TARGET ? '共用目标输入；取消返回本次调用窗口'
        : node.id === 'battle-scene.encounter' ? '结束遭遇正文后进入命令'
          : node.id === 'battle-scene.action' ? '交给本次行动消息；定帧等待不接受输入' : '';
    if (node.id !== BATTLE_COMMAND) add(node.id, BATTLE_COMMAND, 'B · 返回', !executable && !protocol, protocol);
    add(node.id, node.id, '方向 · 当前选择', !executable && !protocol, protocol);
  }
  add(BATTLE_COMMAND, BATTLE_COMMAND, 'B · 上一位行动方；首位保留');
  return {nodes, entry: BATTLE_COMMAND, transitions,
    edges: transitions.map(row => ({...row, routes: [row], condition: row.unknown ? '续接未确认' : row.condition}))};
}

export function battleCommandExecution({graph, items, targetItems, groups, calls, navigation, equipmentEffects = []}) {
  const get = (state, suffix) => state.fields[`save.slot.${state.context.slot}.${suffix}`];
  const role = state => SERVICE_ROLES[state.context.role];
  const vehicle = state => {
    if (!(get(state, `role.${role(state)}.present`) & 128)) return null;
    const id = get(state, `role.${role(state)}.current_vehicle`);
    return Number.isInteger(id) && id >= 0 && id < 11 ? id : null;
  };
  const item = id => items.find(row => row.id === id);
  const label = id => item(id)?.name || `物品 ${id}`;
  const party = state => SERVICE_ROLES.flatMap((name, id) => {
    const present = get(state, `role.${name}.present`), mounted = get(state, `role.${name}.current_vehicle`);
    return present && !(get(state, `role.${name}.status`) & 0xE0)
      && !(present & 128 && get(state, `vehicle.${mounted}.condition_raw`) & 16) ? [id] : [];
  });
  const commands = state => vehicle(state) == null
    ? ['攻击', '工具', '装备', '辅助'].map((label, position) => ({label, position, command: position + 0x16}))
    : ['主炮', '工具', '副炮', '炮弹', 'S-E', '辅助']
      .map((label, position) => ({label, position, command: position + 0x10}));
  const inventory = state => {
    const id = vehicle(state);
    const values = id == null ? Array.from(get(state, `role.${role(state)}.inventory`) || [])
      : Array.from({length: 8}, (_, slot) => get(state, `vehicle.${id}.item.${slot}`));
    const end = values.findIndex(id => !id);
    return values.slice(0, end < 0 ? 8 : end).map((id, position) => ({id, position, label: label(id)}));
  };
  const weaponRejection = (state, part, requireAmmo = true) => {
    const id = vehicle(state), name = SERVICE_PARTS[part];
    if (id == null || !(get(state, `vehicle.${id}.equipped_mask_raw`) & (0x80 >> part))) return 'record:0A:000';
    const status = get(state, `vehicle.${id}.equipment_state.${name}`);
    if (status & 128) return 'record:0A:002';
    if (requireAmmo && get(state, `vehicle.${id}.equipment.${name}`) < 0x65 && !(status & 0x3F)) return 'record:0A:001';
    return null;
  };
  const weapon = (state, part) => get(state, `vehicle.${vehicle(state)}.equipment.${SERVICE_PARTS[part]}`);
  const entries = state => {
    const control = DISPLAY_CONTROLS[state.node] || state.node;
    if (control === BATTLE_COMMAND) return commands(state);
    if (state.node === BATTLE_AUXILIARY) {
      const settings = get(state, 'adventure_data_settings');
      return ['乘降', '状态', '逃跑', `情报：${(settings & 7) + 1}`, '防卫',
        `动画：${settings & 0x40 ? 'OFF' : 'ON'}`, '保护', `音响：${settings & 0x20 ? 'OFF' : 'ON'}`]
        .map((label, position) => ({label, position}));
    }
    if (state.node === EQUIPMENT) {
      const values = Array.from(get(state, `role.${role(state)}.equipment`) || []), end = values.findIndex(id => !id);
      return values.slice(0, end < 0 ? 8 : end).map((id, position) => ({id, position, label: label(id)}));
    }
    if ([HUMAN_ITEMS, VEHICLE_ITEMS].includes(state.node)) return inventory(state);
    if (state.node === SHELLS) return Array.from({length: 6}, (_, position) => ({position,
      id: get(state, `vehicle.${vehicle(state)}.shell_type.${position}`),
      count: get(state, `vehicle.${vehicle(state)}.shell_count.${position}`)}))
      .map(row => ({...row, label: row.id < 128 ? `炮弹 ${row.position + 1} · ${row.count}` : '空位'}));
    if (control === BATTLE_TARGET)
      return [...groups].reverse().map(row => state.domainResults.roundState ? {...row,
        population: state.domainResults.roundState.actors.filter(actor => actor.side === 'enemy' && actor.groupIndex === row.group
          && (actor.hp > 0 || actor.shield > 0) && !(actor.status & 128)).length} : row)
        .filter(row => row.population > 0).map((row, position) => ({...row,
        position, label: `${row.label} × ${row.population}`}));
    return [];
  };
  const block = (state, reason) => {state.execution.status = 'unknown'; state.execution.reason = reason;};
  const select = (state, index) => {
    const row = entries(state)[index];
    if (!row) throw new RangeError('选择超出当前战斗候选');
    state.selections = {choice: index, position: row.position};
    if ([HUMAN_ITEMS, VEHICLE_ITEMS].includes(state.node)) state.context.inventory_index = row.position;
    if (state.node === EQUIPMENT) state.context.equipment_index = row.position;
    if (state.node === SHELLS) state.context.shell_index = row.position;
  };
  const frame = state => {
    const id = vehicle(state), previous = state.windows;
    const control = DISPLAY_CONTROLS[state.node] || state.node;
    const replacesStatus = [BATTLE_TARGET, HUMAN_ITEMS, VEHICLE_ITEMS, SHELLS, EQUIPMENT, BATTLE_AUXILIARY, BATTLE_RESPONSE,
      'battle-party-status.condition'].includes(control);
    const names = ['battlefield', ...(replacesStatus ? [] : [id == null ? 'human-status' : 'vehicle-status']), 'command'];
    if (control !== BATTLE_COMMAND) names.push(control);
    state.windows = names.map(name => {
      const retained = previous.find(row => row.id === name && row.actor === state.context.role);
      return retained || {id: name, actor: state.context.role, instance: ++state.execution.windowSequence};
    });
  };
  const enter = (state, target, push = true) => {
    if (push) state.returnStack.push({node: state.node, selections: structuredClone(state.selections),
      context: structuredClone(state.context), windows: structuredClone(state.windows)});
    state.node = target; state.control = DISPLAY_CONTROLS[target] || target;
    state.execution.status = 'waiting'; delete state.execution.reason;
    state.selections = {choice: 0, position: 0};
    if (entries(state).length) {
      const mask = state.control === BATTLE_COMMAND && vehicle(state) != null
        ? get(state, `vehicle.${vehicle(state)}.equipped_mask_raw`) : null;
      const index = mask == null ? 0 : [0, 1, 2].find(part => mask & (0x80 >> part));
      select(state, mask == null ? 0 : index === undefined ? 5 : index * 2);
    }
    frame(state);
  };
  const restore = state => {
    const parent = state.returnStack.pop();
    if (!parent) return block(state, '缺少上一层战斗窗口现场');
    Object.assign(state, parent); state.control = DISPLAY_CONTROLS[state.node] || state.node;
    state.execution.status = 'waiting'; delete state.execution.reason;
    delete state.execution.pending;
  };
  const target = (state, pending) => {state.execution.pending = pending; enter(state, BATTLE_TARGET);};
  const command = state => {
    state.returnStack = []; delete state.execution.pending; delete state.execution.response;
    enter(state, BATTLE_COMMAND, false);
  };
  const reject = (state, record, part = null) => {
    state.execution.response = {record, part, vehicle: vehicle(state) != null, choice: state.selections.position,
      ...(part == null ? {} : {partRecord: calls.part_names[part]}), evidence: FOLLOWUP_EVIDENCE};
    enter(state, BATTLE_RESPONSE, false);
  };
  const mount = state => {
    const wasRiding = Boolean(get(state, `role.${role(state)}.present`) & 128);
    const assigned = get(state, `role.${role(state)}.current_vehicle`);
    const available = Number.isInteger(assigned) && assigned >= 0 && assigned < 11;
    if (available) {
      const field = `save.slot.${state.context.slot}.role.${role(state)}.present`;
      state.fields[field] ^= 0x80;
      state.domainResults.mount = {role: state.context.role, vehicle: assigned, riding: !wasRiding};
    }
    state.execution.response = {record: available ? wasRiding ? 'record:0A:027' : 'record:0A:026' : 'record:0A:004',
      vehicle: wasRiding, choice: wasRiding ? 5 : 3};
    enter(state, BATTLE_RESPONSE, false);
  };
  const submit = (state, pending) => {
    state.execution.commands.push(pending);
    const remaining = party(state).find(id => id > pending.role && !state.execution.commands.some(row => row.role === id));
    if (remaining !== undefined) {state.context.role = remaining; command(state);}
    else {
      state.domainResults.battleCall = {saveSlot: state.context.slot, commands: structuredClone(state.execution.commands),
        ...(state.domainResults.roundState ? {actorState: structuredClone(state.domainResults.roundState.actors),
          enemyEvents: structuredClone(state.domainResults.roundState.enemyEvents),
          deaths: structuredClone(state.domainResults.roundState.deaths), randomState: state.domainResults.roundState.randomState} : {})};
      state.returnStack = []; delete state.execution.pending;
      state.node = state.control = PLAYBACK; state.execution.status = 'battle'; state.windows = [];
    }
  };
  const equip = (state, chosen) => {
    const record = item(chosen.id), prefix = `role.${role(state)}`;
    if (!record?.equipment || !(record.equipment.role_mask & (0x80 >> state.context.role))) {
      state.domainResults.equipment = {role: state.context.role, rejected: true, response: 'record:02:112'};
      command(state); return;
    }
    const values = Array.from(get(state, `${prefix}.equipment`)), before = get(state, `${prefix}.slot_flags`);
    let flags = before | (0x80 >> chosen.position);
    for (const [index, id] of values.entries())
      if (before & (0x80 >> index) && item(id)?.category?.id === record.category.id) flags &= ~(0x80 >> index);
    const stats = roleEquipmentStats({equipment: values, slot_flags: flags,
      strength: get(state, `${prefix}.strength`), speed: get(state, `${prefix}.speed`),
      vitality: get(state, `${prefix}.vitality`)}, id => {
        const value = item(id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
        if (!Number.isInteger(value)) throw new TypeError('人物装备缺少当前攻防数值');
        return value;
      });
    if (!Object.values(stats).every(Number.isInteger)) return block(state, '人物装备重算缺少基础属性');
    state.fields[`save.slot.${state.context.slot}.${prefix}.slot_flags`] = flags;
    for (const [name, value] of Object.entries(stats)) state.fields[`save.slot.${state.context.slot}.${prefix}.${name}`] = value;
    state.domainResults.equipment = {role: state.context.role, before, after: flags,
      armorSlot: values.findLastIndex((id, index) => flags & (0x80 >> index) && id >= 0x18 && id < 0x1D),
      specialEffects: equipmentEffects.reduce((mask, id, bit) => mask | (values.some((value, index) =>
        flags & (0x80 >> index) && value < 0x23 && value === id) ? 1 << bit : 0), 0)};
    state.fields[`save.slot.${state.context.slot}.${prefix}.equipment_special_effects_raw`] = state.domainResults.equipment.specialEffects;
    command(state);
  };
  const condition = state => {
    const assigned = get(state, `role.${role(state)}.current_vehicle`);
    const statuses = [get(state, `role.${role(state)}.status`)];
    if (Number.isInteger(assigned) && assigned >= 0 && assigned < 11)
      statuses.push(get(state, `vehicle.${assigned}.condition_raw`));
    const count = battleConditionWaitCount(statuses);
    state.execution.conditionWaits = (state.execution.conditionWaits || 0) + 1;
    if (state.execution.conditionWaits >= count) {delete state.execution.conditionWaits; command(state);}
  };
  return {entries, vehicle, party, evidence: EVIDENCE,
    options: state => entries(state).map(row => row.label),
    initial({fields, context, node = graph.entry}) {
      const state = interfacePreviewState({fields, context, node, entry: node,
        execution: {status: 'waiting', trace: [], windowSequence: 0, commands: []}});
      if (!party(state).includes(context.role)) state.context.role = party(state)[0];
      if (state.context.role === undefined) block(state, '当前队伍没有可输入命令的人物');
      else enter(state, node, false);
      return state;
    },
    advance(state, input) {
      const from = DISPLAY_CONTROLS[state.node] || state.node;
      if (input.type === 'battle-result') {
        if (state.execution.status !== 'battle') throw new TypeError('当前没有等待战斗完成结果');
        const result = input.result;
        state.domainResults.battleResult = structuredClone(result);
        if (!result?.confirmed || !['victory', 'defeat', 'round'].includes(result.outcome) || !result.sceneReturn)
          block(state, result?.missing?.join('、') || '战斗组件完成结果未确认');
        else {
          for (const effect of result.effects || []) {
            if (!Object.hasOwn(state.fields, effect.field)) throw new TypeError('战斗结果字段不属于本次预览');
            state.fields[effect.field] = structuredClone(effect.value);
          }
          state.domainResults.sceneReturn = structuredClone(result.sceneReturn);
          if (result.outcome === 'round') {
            state.domainResults.roundState = structuredClone(result.roundState);
            state.execution.commands = []; state.context.role = party(state)[0]; command(state);
          } else {state.execution.status = 'returned'; state.windows = []; state.returnStack = [];}
        }
        state.execution.trace.push({from, input: 'battle-result', status: state.execution.status, evidence: EVIDENCE});
        return state;
      }
      if (state.execution.status !== 'waiting') return state;
      state.execution.trace.push({from: state.node, control: from, input: structuredClone(input),
        evidence: DISPLAY_CONTROLS[state.node] || ['battle-scene.encounter', BATTLE_RESPONSE].includes(from)
          ? FOLLOWUP_EVIDENCE : EVIDENCE});
      if (['a', 'b', 'up', 'down', 'left', 'right'].includes(input.type)
          && ['battle-scene.encounter', BATTLE_RESPONSE].includes(from)) {command(state); return state;}
      if (input.type === 'option') {select(state, input.index); return state;}
      if (['up', 'down', 'left', 'right'].includes(input.type)) {
        const rows = entries(state);
        if (!rows.length) return state;
        const selector = from === BATTLE_COMMAND ? vehicle(state) == null ? calls.human_selector : calls.vehicle_selector
          : from === SHELLS ? calls.shell_selector : from === BATTLE_AUXILIARY ? 6
            : from === EQUIPMENT ? calls.equipment_selector : [HUMAN_ITEMS, VEHICLE_ITEMS].includes(from) ? 8 : calls.target_selector;
        const moved = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
          selector, selection_index: state.selections.position, selection_count: rows.length,
          direction_index: ['up', 'down', 'left', 'right'].indexOf(input.type) + 1}, navigation);
        if (moved.status !== 'available') block(state, `选择移动未确认：${moved.missing.join('、')}`);
        else {
          const index = rows.findIndex(row => row.position === moved.state.selection_index);
          if (index >= 0) select(state, index);
        }
        return state;
      }
      if (input.type === 'b') {
        if (from === BATTLE_COMMAND) {
          const previous = state.execution.commands.pop();
          if (previous) state.context.role = previous.role;
          command(state);
        }
        else if (from === 'battle-party-status.condition') condition(state);
        else if (from === BATTLE_RESPONSE) command(state);
        else restore(state);
        return state;
      }
      if (input.type !== 'a') throw new TypeError('未声明的战斗输入');
      const chosen = entries(state)[state.selections.choice];
      if (from === 'battle-scene.encounter') enter(state, BATTLE_COMMAND, false);
      else if (from === BATTLE_COMMAND) {
        if (chosen.command === 0x16) {
          const equipment = Array.from(get(state, `role.${role(state)}.equipment`) || []), mask = get(state, `role.${role(state)}.slot_flags`);
          const index = equipment.findIndex((id, index) => mask & (0x80 >> index) && id >= 0x23);
          target(state, {kind: 'weapon', role: state.context.role, item: index < 0 ? 0x22 : equipment[index], command: 0x0C});
        } else if ([0x10, 0x12, 0x14].includes(chosen.command)) {
          const part = (chosen.command - 0x10) / 2, refusal = weaponRejection(state, part);
          if (refusal) reject(state, refusal, part);
          else target(state, {kind: 'vehicle-weapon', role: state.context.role, vehicle: vehicle(state), part,
            item: weapon(state, part), command: 4});
        } else if ([0x11, 0x17].includes(chosen.command)) {
          if (!inventory(state).length) reject(state, 'record:0A:003');
          else enter(state, vehicle(state) == null ? HUMAN_ITEMS : VEHICLE_ITEMS);
        }
        else if (chosen.command === 0x13) {
          const refusal = weaponRejection(state, 0, false);
          if (refusal) reject(state, refusal, 0);
          else if (!Array.from({length: 6}, (_, slot) => get(state, `vehicle.${vehicle(state)}.shell_type.${slot}`))
            .some(id => id < 128)) reject(state, 'record:0A:195');
          else enter(state, SHELLS);
        } else if (chosen.command === 0x18) {
          if (!get(state, `role.${role(state)}.equipment`)?.[0])
            reject(state, 'record:0A:188');
          else enter(state, EQUIPMENT);
        } else if ([0x15, 0x19].includes(chosen.command)) enter(state, BATTLE_AUXILIARY);
        else block(state, '此战斗命令的效果与续接未确认');
      } else if ([HUMAN_ITEMS, VEHICLE_ITEMS].includes(from)) {
        if (!chosen?.id) block(state, '空携带位的回应续接未确认');
        else if (!targetItems.includes(chosen.id)) submit(state, {kind: 'item', role: state.context.role,
          vehicle: vehicle(state), item: chosen.id, slot: chosen.position});
        else target(state, {kind: 'item', role: state.context.role, vehicle: vehicle(state), item: chosen.id, slot: chosen.position});
      } else if (from === SHELLS) {
        if (!chosen || chosen.id >= 128 || !chosen.count) block(state, '炮弹空位或数量为零的回应续接未确认');
        else target(state, {kind: 'shell', role: state.context.role, vehicle: vehicle(state), slot: chosen.position,
          shell: chosen.id, item: weapon(state, 0), command: 0x13});
      } else if (from === BATTLE_TARGET) {
        if (!chosen || !state.execution.pending) return block(state, '缺少本次行动或目标');
        submit(state, {...state.execution.pending, group: chosen.group});
      } else if (from === EQUIPMENT) equip(state, chosen);
      else if (from === BATTLE_AUXILIARY) {
        if (chosen.position === 1) enter(state, 'battle-party-status.condition');
        else if ([3, 5, 7].includes(chosen.position)) {
          const field = `save.slot.${state.context.slot}.adventure_data_settings`, before = state.fields[field];
          if (!Number.isInteger(before)) return block(state, '辅助设置缺少当前值');
          const increment = (before + 1) & 255;
          state.fields[field] = chosen.position === 3 ? (increment & 7) === 5 ? increment & 0xF8 : increment
            : before ^ (chosen.position === 5 ? 0x40 : 0x20);
          frame(state);
        } else if ([2, 4, 6].includes(chosen.position)) submit(state,
          {kind: ({2: 'escape', 4: 'defend', 6: 'protect'})[chosen.position], role: state.context.role,
            vehicle: vehicle(state), command: 0x15 + chosen.position / 2});
        else mount(state);
      } else if (from === 'battle-party-status.condition') condition(state);
      else if (from === BATTLE_RESPONSE) command(state);
      else block(state, '此窗口的输入续接未确认');
      state.execution.trace.push({from, to: state.node, status: state.execution.status, evidence: EVIDENCE});
      return state;
    },
  };
}
