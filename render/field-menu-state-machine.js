// @editor-module 行走菜单按确认的分派和选择协议推进隔离快照。
import {interfacePreviewState} from './interface-state-preview.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {uiCommandDispatchTarget} from '../core/ui-command-dispatch-owner.js';
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {humanItemsExecution, humanItemsExecutionPreview} from './human-items-execution.js';
import {addFieldEquipmentGraph, fieldEquipmentExecution, fieldEquipmentPreview} from './field-equipment-state-machine.js';
import {fieldMenuDetails, fieldMenuDetailsPreview, FIELD_MENU_DETAILS_EVIDENCE} from './field-menu-details.js';

export const FIELD_MENU_STATE_PAGES = Object.freeze(['non-battle-main-menu', 'party-strength', 'field-mode',
  'human-items', 'field-item-fax', 'satellite-map', 'human-equipment', 'vehicle-equipment-shells']);

const FIELD_MENU_EVIDENCE = 'project/evidence/reverse-engineering/field-menu-state-machine/observations.json';
const MAIN = 'field-command-menu.main', STRENGTH = 'character-status.actor-select';
const ACTORS = 'character-status.detail-select', DETAIL = 'character-status.detail';
const OVERVIEW = 'vehicle-status.overview', VEHICLES = 'vehicle-status.overview-vehicle-select';
const PART = 'vehicle-status.part-detail', OVERVIEW_PART = 'vehicle-status.overview-part-detail';
const ARMOR = 'vehicle-status.armor-vehicle-select', AMOUNT = 'vehicle-status.armor-amount';
const CONFIRM = 'vehicle-status.armor-confirm', MODE = 'field-command-menu.mode-settings';
const RESULT = 'vehicle-status.armor-result:';
const ADVENTURE = 'field-command-menu.adventure-data', NO_VEHICLE = 'vehicle-status.no-vehicle-message';
const destinations = [
  ['field-dialogue', 'walking-dialogue.start'], ['field-board-exit', 'field-command-menu.branch'],
  ['party-strength', STRENGTH], ['human-items', 'human-items.actor-select'],
  ['human-equipment', 'human-equipment.list'], ['vehicle-equipment-shells', 'vehicle-equipment-shells.shells'],
  ['field-investigation', null], ['field-mode', MODE],
];
const ownPage = id => id === MAIN ? 'non-battle-main-menu'
  : id.startsWith('character-status.') || id.startsWith('vehicle-status.') ? 'party-strength' : 'field-mode';
const keyFor = preview => preview.interface_entry_id === OVERVIEW_PART ? OVERVIEW_PART : preview.interface_state_id;

export function fieldMenuStateGraph(dispatch, catalog, commandDocument = null) {
  const definitions = catalog.interfaces.filter(row => ['field-command-menu', 'character-status', 'vehicle-status'].includes(row.id));
  const states = definitions.flatMap(row => row.states);
  const nodes = dispatch.previews.filter(row => states.some(state => state.id === row.interface_state_id)
    && row.interface_state_id !== 'field-command-menu.branch').map(preview => ({id: keyFor(preview),
    stateId: preview.interface_state_id, entryId: preview.interface_entry_id || null,
    pageId: ownPage(preview.interface_state_id), preview,
    label: states.find(row => row.id === preview.interface_state_id).label,
    input: 'A 确认 / B 返回', regions: []}));
  const unique = new Map(nodes.map(node => [node.id, node]));
  for (const index of [0, 1]) {
    const parent = unique.get(CONFIRM), choice = dispatch.choice_groups.find(row => row.id === 'field-armor-confirm').choices[index];
    unique.set(`${RESULT}${index}`, {...parent, id: `${RESULT}${index}`, preview: {...parent.preview,
      selection_cursor: null, layers: parent.preview.layers.map(layer => layer.inline_confirm
        ? {...layer, record: choice.continuation_record, inline_confirm: false, dialogue_runtime: true} : layer)},
    entryId: `${RESULT}${index}`, label: index ? '拆装甲：否' : '拆装甲：是', input: 'A / B · 正文结束'});
  }
  const routes = [], add = (from, to, input, operation, unknown = false, evidence = FIELD_MENU_EVIDENCE) => {
    routes.push({id: `field-transition:${routes.length}`, from, to, input,
      operation, unknown, evidence, controls: [], declarations: []});
  };
  addFieldEquipmentGraph(unique, dispatch, catalog, add);
  for (const choice of dispatch.choice_groups.find(row => row.id === 'commands:20-27').choices) {
    const command = Number(choice.command), [pageId, stateId] = destinations[command - 0x20];
    const id = stateId || `field-call:${command.toString(16).toUpperCase()}`;
    if (!unique.has(id)) unique.set(id, {id, stateId, pageId, label: choice.visible_text,
      entryId: null, preview: dispatch.previews.find(row => row.interface_state_id === stateId) || null,
      input: '领域调用边界', regions: [], boundary: true});
    add(MAIN, id, `A · ${choice.visible_text}`, {kind: 'global-command', command});
  }
  add(MAIN, null, 'B · 返回行走', {kind: 'return'});
  add(STRENGTH, ACTORS, 'A · 看强度', {kind: 'global-command', command: 0x31});
  add(STRENGTH, ARMOR, 'A · 拆装甲', {kind: 'global-command', command: 0x32});
  add(STRENGTH, OVERVIEW, 'A · 战车状况', {kind: 'global-command', command: 0x33});
  add(STRENGTH, null, 'B · 返回行走', {kind: 'return'});
  add(ACTORS, DETAIL, 'A · 人物', {kind: 'select-role'});
  add(ACTORS, PART, 'A · 战车', {kind: 'select-vehicle'});
  add(ACTORS, STRENGTH, 'B · 返回强度命令', {kind: 'return-strength'});
  add(DETAIL, DETAIL, 'A · 下一人物', {kind: 'cycle-role'});
  add(DETAIL, ACTORS, 'B · 返回对象选择', {kind: 'return'});
  add(PART, PART, '方向 · 携带部件', {kind: 'select-part'});
  add(PART, PART, 'A · 部件', {kind: 'part-detail'}, false,
    'project/evidence/reverse-engineering/field-menu-followups/observations.json');
  add(PART, ACTORS, 'B · 返回对象选择', {kind: 'return'});
  add(ARMOR, AMOUNT, 'A · 战车', {kind: 'armor-quantity'});
  add(STRENGTH, NO_VEHICLE, 'A · 拆装甲 / 无战车', {kind: 'no-vehicle'});
  add(ARMOR, STRENGTH, 'B · 返回强度命令', {kind: 'return-strength'});
  add(AMOUNT, CONFIRM, 'A · 确认非零拆除数量', {kind: 'armor-confirm'});
  add(AMOUNT, STRENGTH, 'A · 拆除数量为零', {kind: 'return-strength'});
  add(AMOUNT, ARMOR, 'B · 返回战车选择', {kind: 'return'});
  for (const index of [0, 1]) {
    add(CONFIRM, `${RESULT}${index}`, `A · ${index ? '否' : '是'}`, {kind: 'armor-result'});
    add(`${RESULT}${index}`, STRENGTH, 'A / B · 正文结束', {kind: index ? 'return-strength' : 'armor-commit'});
  }
  add(CONFIRM, `${RESULT}1`, 'B · 否', {kind: 'armor-result'});
  add(NO_VEHICLE, STRENGTH, 'A / B · 返回强度命令', {kind: 'return-strength'});
  for (const choice of dispatch.choice_groups.find(row => row.id === 'field-overview-categories').choices)
    add(OVERVIEW, choice.target_state_id, `A · ${choice.label_reference?.record || choice.index}`, {kind: 'local-command', command: Number(choice.local_command)});
  add(OVERVIEW, VEHICLES, '↑ · 查看对象', {kind: 'local-command', command: 0x02});
  add(VEHICLES, OVERVIEW, '↓ · 返回分类', {kind: 'local-command', command: 0x01});
  add(OVERVIEW, null, 'B · 返回行走', {kind: 'return'});
  add(VEHICLES, OVERVIEW_PART, 'A · 自有战车', {kind: 'select-owned-vehicle'});
  add(VEHICLES, null, 'B · 返回行走', {kind: 'return'});
  add(OVERVIEW_PART, OVERVIEW_PART, '方向 · 携带部件', {kind: 'select-part'});
  add(OVERVIEW_PART, VEHICLES, 'B · 返回战车选择', {kind: 'return'});
  add(OVERVIEW_PART, OVERVIEW_PART, 'A · 部件', {kind: 'part-detail'}, false,
    'project/evidence/reverse-engineering/field-menu-followups/observations.json');
  for (const node of unique.values()) if (node.id.startsWith('vehicle-status.overview-') && ![VEHICLES, OVERVIEW_PART].includes(node.id)) {
    add(node.id, OVERVIEW, 'B · 返回分类', {kind: 'return'});
    add(node.id, node.id, '方向 · 当前页选择', {kind: 'selection'}, false, FIELD_MENU_DETAILS_EVIDENCE);
    const box = node.id === 'vehicle-status.overview-box';
    add(node.id, node.id, box ? 'A · 后续解释未确认' : 'A · 保留当前页',
      {kind: 'overview-confirm'}, box, FIELD_MENU_DETAILS_EVIDENCE);
  }
  for (const choice of dispatch.choice_groups.find(row => row.id === 'commands:41-44').choices) {
    const command = Number(choice.command), target = commandDocument ? uiCommandDispatchTarget(commandDocument, command) : command;
    add(MODE, target === 0x41 ? ADVENTURE : MODE, `A · ${choice.visible_text}`,
      {kind: target === 0x41 ? 'global-command' : 'setting', command, targetCommand: target});
  }
  add(MODE, MAIN, 'B · 返回主菜单', {kind: 'return-main'});
  const adventure = dispatch.choice_groups.find(row => row.id === 'field-adventure-options');
  for (const choice of adventure.choices) {
    add(ADVENTURE, choice.target_state_id, 'A · 数据', {kind: 'global-command', command: Number(choice.command)});
    const exits = choice.target_state_id.endsWith('experience-data');
    add(choice.target_state_id, exits ? null : ADVENTURE, exits ? 'B · 返回行走' : 'B · 返回冒险数据',
      {kind: exits ? 'return' : 'return-adventure'}, false, FIELD_MENU_DETAILS_EVIDENCE);
    const gold = choice.target_state_id.endsWith('gold-amount');
    add(choice.target_state_id, gold ? choice.target_state_id : null, gold ? 'A · 提交金铃阈值 / 正文结束' : 'A · 返回行走',
      {kind: gold ? 'gold-confirm' : 'return'}, false, FIELD_MENU_DETAILS_EVIDENCE);
  }
  add(ADVENTURE, MODE, 'B · 返回模式', {kind: 'return'});
  for (const id of [MAIN, STRENGTH, ACTORS, ARMOR, AMOUNT, CONFIRM, MODE, ADVENTURE])
    add(id, id, '方向 · 选择', {kind: 'selection'});
  add('field-command-menu.gold-amount', 'field-command-menu.gold-amount', '方向 · 数字编辑', {kind: 'gold-digits'}, false, FIELD_MENU_DETAILS_EVIDENCE);
  for (const node of unique.values()) if (node.boundary) add(node.id, MAIN, '调用返回未确认', {kind: 'domain-return'}, true);
  return {nodes: [...unique.values()], entry: MAIN, transitions: routes,
    edges: routes.map(row => ({...row, routes: [row], condition: row.unknown ? '此调用效果未确认' : row.operation.condition || ''}))};
}

export function fieldMenuExecution({graph, dispatch, navigation, commandDocument, equipment, humanItems = null}) {
  const get = (state, suffix) => state.fields[`save.slot.${state.context.slot}.${suffix}`];
  const node = state => graph.nodes.find(row => row.id === state.node);
  const group = state => dispatch.choice_groups.find(row => row.interface_state_ids?.includes(node(state).stateId)
    && (!row.interface_entry_id || row.interface_entry_id === node(state).entryId)
    && (row.dispatch_protocol_id === 'vehicle-overview-bank-10') === (state.node === OVERVIEW_PART || state.node.startsWith('vehicle-status.overview')));
  const roles = state => SERVICE_ROLES.flatMap((role, id) => get(state, `role.${role}.present`) ? [{id, role, position: id * 2}] : []);
  const vehicles = state => [...get(state, 'entity_scene_object_slots').slice(0, 4)]
    .flatMap((id, index) => id < 11 ? [{id, position: index * 2 + 1}] : []);
  const owned = state => Array.from({length: 8}, (_, id) => ({id, position: id}))
    .filter(row => get(state, `global_event_flag.${(row.id + 8).toString(16).toUpperCase().padStart(2, '0')}`));
  let human;
  const entries = state => {
    if (human?.owns(state)) return human.entries(state);
    const equipmentEntries = equipmentAdapter.entries(state, group(state));
    if (equipmentEntries) return equipmentEntries;
    if (state.node === ACTORS) return [...roles(state).map(row => ({...row, kind: 'role'})),
      ...vehicles(state).map(row => ({...row, kind: 'vehicle'}))].sort((a, b) => a.position - b.position);
    if (state.node === ARMOR) return vehicles(state).map(row => ({...row, kind: 'vehicle'}));
    if (state.node === VEHICLES) return owned(state).map(row => ({...row, kind: 'vehicle'}));
    if ([PART, OVERVIEW_PART].includes(state.node)) return SERVICE_PARTS.flatMap((part, id) =>
      get(state, `vehicle.${state.context.vehicle}.equipment.${part}`) ? [{id, label: part}] : [])
      .map((row, position) => ({...row, position}));
    const source = group(state);
    if (source?.choice_source?.page_capacity) return details.entries(state);
    if (source?.choice_source?.kind === 'owned-vehicle-pairs') return owned(state).map(row => ({...row,
      position: source.choice_source.index_to_vehicle.indexOf(row.id), kind: 'vehicle'})).sort((a, b) => a.position - b.position);
    return source?.choices.map(row => ({...row, position: row.index})) || [];
  };
  const options = state => state.node.startsWith(RESULT) || state.execution.goldResult ? [] : entries(state).map(row => row.label || row.visible_text || row.label_reference?.record
    || (row.kind === 'role' ? ['猎人', '机械师', '战士'][row.id] : row.kind === 'vehicle' ? `战车 ${row.id + 1}` : `选项 ${row.position + 1}`));
  const block = (state, reason) => {state.execution.status = 'unknown'; state.execution.reason = reason;};
  const selection = (state, index) => {
    const row = entries(state)[index];
    if (!row) throw new RangeError('输入选项超出当前选择域');
    state.selections.choice = index; state.selections.position = row.position;
    if (human?.owns(state)) human.select(state, row);
    if ([PART, OVERVIEW_PART].includes(state.node)) state.context.equipment_index = index;
    if (group(state)?.choice_source?.kind === 'equipment-attribute-selector') state.context.attribute_index = row.position;
    if (state.node === 'vehicle-status.overview-defense') state.context.component_index = row.position;
    if (group(state)?.choice_source?.kind === 'owned-vehicle-pairs') state.context.overview_vehicle = row.id;
    equipmentAdapter.selection(state, row);
    if (row.kind && /^(human-equipment|vehicle-equipment-shells)\./u.test(state.node)) frame(state);
  };
  const frame = state => {
    const preview = node(state)?.preview;
    if (!preview) {state.windows = []; return;}
    const previous = state.windows;
    state.windows = [];
    for (const layer of preview.layers || []) {
      if (layer.kind === 'layout') state.windows.push({id: layer.record, content: [layer]});
      else state.windows.at(-1)?.content.push(layer);
    }
    for (const window of state.windows) {
      const parent = previous.find(row => row.id === window.id);
      const retained = parent && JSON.stringify(parent.content) === JSON.stringify(window.content);
      window.instance = parent?.instance ?? ++state.execution.windowSequence;
      window.retention = retained ? 'retained' : parent ? 'replaced' : 'created';
      if (window.content.some(layer => layer.party_summary_rows))
        window.values = retained ? parent.values : structuredClone(state.fields);
    }
  };
  const enter = (state, target, {push = true} = {}) => {
    if (!graph.nodes.some(row => row.id === target)) return block(state, `界面 ${target} 没有已发布构造`);
    if (push && state.node !== target) state.returnStack.push({node: state.node, selections: state.selections,
      context: structuredClone(state.context), windows: state.windows});
    state.node = target; state.control = target; state.pause = {kind: 'menu'};
    state.execution.status = 'waiting'; delete state.execution.reason;
    state.selections = {choice: 0, position: 0};
    equipmentAdapter.prepare(state);
    details.prepare(state);
    if (entries(state).length) selection(state, 0);
    if (target === 'field-command-menu.gold-amount') selection(state, 6);
    if (target === AMOUNT) {
      const sp = get(state, `vehicle.${state.context.vehicle}.sp`);
      state.execution.quantity = {value: sp, maximum: sp, kind: 'remaining-sp', digit: 3};
      state.context.armor_value = sp; state.selections.position = 3; state.selections.choice = 3;
    }
    frame(state);
    if (node(state).boundary) block(state, '领域调用后续不属于本期的已确认执行范围');
  };
  const restore = (state, target = null) => {
    let parent;
    do {parent = state.returnStack.pop();} while (parent && target && parent.node !== target);
    if (!parent) return block(state, '缺少此调用的返回窗口现场');
    state.node = parent.node; state.control = parent.node; state.selections = parent.selections;
    state.windows = parent.windows; state.context = {...parent.context,
      armor_value: state.context.armor_value};
    state.execution.status = 'waiting'; delete state.execution.reason;
    if ([MAIN, STRENGTH, ACTORS, ARMOR].includes(state.node)) delete state.execution.quantity;
  };
  const globalCommand = (state, command) => {
    if (command === 0x5C) {
      const source = dispatch.choice_groups.find(row => row.id === 'field-adventure-options');
      state.execution.command = {command, bank: source.entry_bank};
      return enter(state, source.choices.find(row => Number(row.command) === command).target_state_id);
    }
    const sourceCommand = command;
    command = uiCommandDispatchTarget(commandDocument, command);
    const handler = dispatch.entries.find(row => Number(row.command) === command);
    if (!handler || handler.handler_bank !== 0x19) return block(state, `全局命令 ${command} 的调用现场未确认`);
    state.execution.command = {command: sourceCommand, targetCommand: command, bank: handler.handler_bank, handler: handler.handler_cpu};
    if (command >= 0x20 && command <= 0x27) {
      const [, target] = destinations[command - 0x20];
      return enter(state, target || `field-call:${command.toString(16).toUpperCase()}`);
    }
    if (command === 0x31) return enter(state, ACTORS);
    if (command === 0x32) return enter(state, vehicles(state).length ? ARMOR : NO_VEHICLE);
    if (command === 0x33) return enter(state, OVERVIEW);
    if (command === 0x41) return enter(state, ADVENTURE);
    if ([0x42, 0x43, 0x44].includes(command)) {
      const field = `save.slot.${state.context.slot}.adventure_data_settings`, before = state.fields[field];
      if (!Number.isInteger(before)) return block(state, '设置字段没有当前值');
      const increment = (before + 1) & 255;
      state.fields[field] = command === 0x42 ? (increment & 7) === 5 ? increment & 0xF8 : increment
        : before ^ (command === 0x43 ? 0x40 : 0x20);
      state.execution.trace.push({effect: 'setting', field, before, after: state.fields[field], evidence: FIELD_MENU_EVIDENCE});
      return;
    }
    const target = dispatch.choice_groups.find(row => row.id === 'field-adventure-options').choices
      .find(row => Number(row.command) === command)?.target_state_id;
    if (target) return enter(state, target);
    block(state, `全局命令 ${command} 的字段效果未确认`);
  };
  const equipmentAdapter = fieldEquipmentExecution({get, enter, restore, block, entries, selection, ...equipment});
  const details = fieldMenuDetails({get, block, restore});
  if (humanItems) human = humanItemsExecution(humanItems, {get, enter, frame, block, roles, vehicles, navigation, dispatch});
  return {evidence: FIELD_MENU_EVIDENCE, options,
    initial({fields, context, entry = MAIN}) {
      const state = interfacePreviewState({fields, context, entry, node: entry,
        execution: {status: 'waiting', trace: [], command: null, windowSequence: 0, itemRandom: 0}});
      enter(state, entry, {push: false});
      if (entry === 'vehicle-equipment-shells.parts') {
        const index = entries(state).findIndex(row => row.kind === 'vehicle' && row.id === context.vehicle);
        if (index >= 0) selection(state, index);
      }
      return state;
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting') return state;
      delete state.execution.partDetail;
      const from = state.node;
      state.execution.trace.push({from, input: structuredClone(input),
        evidence: equipmentAdapter.owns(state) ? equipmentAdapter.evidence : FIELD_MENU_EVIDENCE});
      if (human?.owns(state)) return human.advance(state, input);
      if (details.advance(state, input)) return state;
      if (from.startsWith(RESULT)) {
        if (!['a', 'b'].includes(input.type)) return state;
        if (from === `${RESULT}0`) {
          const field = `save.slot.${state.context.slot}.vehicle.${state.context.vehicle}.sp`;
          state.fields[field] = state.execution.quantity.value;
          state.execution.trace.push({effect: 'armor', field, after: state.fields[field], evidence: FIELD_MENU_EVIDENCE});
        }
        restore(state, STRENGTH); return state;
      }
      if (input.type === 'quantity') {
        const quantity = state.execution.quantity;
        if (state.node !== AMOUNT || !quantity || !Number.isInteger(input.value) || input.value < 0 || input.value > quantity.maximum)
          throw new RangeError('保留 SP 超出当前战车装甲范围');
        quantity.value = input.value; state.context.armor_value = input.value; return state;
      }
      if (input.type === 'option') {selection(state, input.index); return state;}
      if (['up', 'down', 'left', 'right'].includes(input.type)) {
        const direction = ['up', 'down', 'left', 'right'].indexOf(input.type) + 1;
        if (from === OVERVIEW && direction === 1 && state.selections.position < 5) {
          const column = state.selections.position;
          enter(state, VEHICLES);
          const index = entries(state).findIndex(row => row.position >= (column < 4 ? column + 4 : 4));
          if (index >= 0) selection(state, index);
          return state;
        }
        if (from === VEHICLES && direction === 2 && state.selections.position >= 4) {
          const column = state.selections.position % 4;
          restore(state); selection(state, column); return state;
        }
        if (state.node === CONFIRM || node(state).preview?.selection_cursor?.kind === 'inline-text-confirm') {
          selection(state, direction < 3 ? state.selections.choice : direction - 3); return state;
        }
        if (state.node === AMOUNT && direction < 3) {
          const q = state.execution.quantity, step = 10 ** (3 - state.selections.position);
          const value = q.value + (direction === 1 ? step : -step);
          if (value >= 0 && value <= q.maximum) {q.value = value; state.context.armor_value = value;}
          return state;
        }
        const list = entries(state), selector = node(state).preview?.selection_cursor?.selection_profile_selector
          ?? node(state).preview?.selection_cursor?.selector;
        if (!list.length || selector === undefined) return state;
        const count = equipmentAdapter.selectionCount(state, group(state)) ?? ([PART, OVERVIEW_PART].includes(state.node) ? list.length
          : group(state)?.choice_source?.capacity ?? list.length);
        const result = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
          selector, selection_index: state.selections.position, selection_count: count, direction_index: direction}, navigation);
        if (result.status !== 'available') {block(state, `选择移动未确认：${result.missing.join('、')}`); return state;}
        let position = result.state.selection_index;
        if (group(state)?.choice_source
            && !list.some(row => row.position === position) && direction < 3) {
          const profile = navigation.selectionLayout.profiles[navigation.selectionLayout.selectors
            .find(row => row.selector === selector).profile];
          const step = (direction === 1 ? -1 : 1) * profile.columns;
          while (position >= 0 && position < count && !list.some(row => row.position === position)) position += step;
        }
        const next = list.findIndex(row => row.position === position);
        if (next >= 0) selection(state, next);
        return state;
      }
      if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的行走菜单输入');
      if (equipmentAdapter.advance(state, input)) return state;
      if (input.type === 'b') {
        if ([MAIN, STRENGTH, OVERVIEW, VEHICLES, 'field-command-menu.experience-data'].includes(from)) {
          state.execution.status = 'returned'; state.windows = []; state.returnStack = []; return state;
        }
        if (from === CONFIRM) {enter(state, `${RESULT}1`); return state;}
        restore(state, [ACTORS, ARMOR, NO_VEHICLE].includes(from) ? STRENGTH : from === MODE ? MAIN
          : ['field-command-menu.battle-data', 'field-command-menu.experience-data'].includes(from) ? ADVENTURE : null);
        return state;
      }
      const chosen = entries(state)[state.selections.choice];
      if ([MAIN, STRENGTH, MODE, ADVENTURE].includes(from)) {
        if (chosen) globalCommand(state, Number(chosen.command));
      } else if (from === ACTORS || from === ARMOR || from === VEHICLES) {
        if (!chosen) return state;
        Object.assign(state.context, {kind: chosen.kind, [chosen.kind]: chosen.id,
          actor: `save-${chosen.kind}:${chosen.id}`});
        enter(state, from === ARMOR ? AMOUNT : from === VEHICLES ? OVERVIEW_PART : chosen.kind === 'role' ? DETAIL : PART);
      } else if (from === DETAIL) {
        const list = roles(state), index = list.findIndex(row => row.id === state.context.role);
        const role = list[(index + 1) % list.length];
        if (!role) block(state, '当前队伍没有可查看人物');
        else {state.context.role = role.id; state.context.actor = `save-role:${role.id}`;}
      } else if ([PART, OVERVIEW_PART].includes(from)) {
        if (chosen) state.execution.partDetail = true;
      } else if (from === OVERVIEW) {
        const protocol = dispatch.dispatch_protocols.find(row => row.id === 'vehicle-overview-bank-10');
        if (!protocol || protocol.handler_bank !== 0x10 || !chosen) return block(state, '战车状况局部分派现场未确认');
        state.execution.command = {command: Number(chosen.local_command), bank: protocol.handler_bank};
        state.context.parent_choice_index = chosen.index;
        enter(state, chosen.target_state_id);
      } else if (from === AMOUNT) {
        if (state.execution.quantity.value === state.execution.quantity.maximum) restore(state, STRENGTH);
        else enter(state, CONFIRM);
      } else if (from === CONFIRM) {
        enter(state, `${RESULT}${state.selections.choice}`);
      } else if (from === NO_VEHICLE) restore(state, STRENGTH);
      else if (['field-command-menu.battle-data', 'field-command-menu.experience-data'].includes(from)) {
        state.execution.status = 'returned'; state.windows = []; state.returnStack = [];
      } else if (from.startsWith('vehicle-status.overview-') && ![OVERVIEW_PART, VEHICLES].includes(from)) return state;
      else block(state, '此原生命令的详情或字段提交尚未确认');
      state.execution.trace.push({from, to: state.node, command: state.execution.command, status: state.execution.status, evidence: FIELD_MENU_EVIDENCE});
      return state;
    },
  };
}

export function fieldMenuExecutionPreview(preview, state) {
  if (!preview || !state) return preview;
  preview = fieldEquipmentPreview(preview, state);
  const slot = state.context.slot, role = SERVICE_ROLES[state.context.role] || SERVICE_ROLES[0];
  const remap = value => typeof value === 'string' ? value.replace(/^save\.slot\.[12]\./u, `save.slot.${slot}.`)
    .replace(/\.role\.(hunter|mechanic|soldier)(?=\.|$)/gu, `.role.${role}`)
    .replace(/\.vehicle\.\d+\./gu, `.vehicle.${state.context.vehicle ?? 0}.`) : value;
  const result = JSON.parse(JSON.stringify(preview), (_key, value) => remap(value));
  result.service_preview_state = {values: structuredClone(state.fields), selection: structuredClone(state.context), conditions: []};
  const summary = state.windows.find(window => window.content.some(layer => layer.party_summary_rows));
  if (summary?.values) result.retained_party_summary_values = structuredClone(summary.values);
  result.runtime_context = {...result.runtime_context, save_slot: slot, actor: state.context.role,
    equipment_index: state.context.equipment_index ?? 0, choice_index: state.selections.position,
    armor_value: state.context.armor_value, attribute_index: state.context.attribute_index ?? 0,
    component_index: state.context.component_index ?? 0, parent_choice_index: state.context.parent_choice_index,
    first_row: state.context.first_row ?? 0};
  if (result.field_submenu_vehicle) result.field_submenu_vehicle = {...result.field_submenu_vehicle,
    vehicle: state.context.vehicle ?? 0, preset_id: undefined};
  if (result.field_overview) result.field_overview = {...result.field_overview,
    vehicle: state.context.overview_vehicle ?? state.context.vehicle ?? 0};
  return humanItemsExecutionPreview(fieldMenuDetailsPreview(result, state), state);
}
