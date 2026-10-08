// @editor-module 工具输入只提交已确认的效果到本次快照。
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {carriedInventoryCount, removeCarriedItem} from './carried-inventory.js';
import {HUMAN_ITEM_STATES as S, HUMAN_ITEMS_EVIDENCE} from './human-items-state-model.js';
import {humanItemEffects} from './human-item-effects.js';
import {executeFacilityWindowRoutine} from '../core/facility-window-semantics.js';
import {playerTileFromSaveCamera} from '../core/save-position.js';
import {faxEntranceDestination, FAX_SCENE_EVIDENCE} from './fax-scene-execution.js';

export function humanItemsExecution(data, {get, enter, frame, block, roles, vehicles, navigation, dispatch}) {
  const owns = state => state.node.startsWith('human-items.');
  const group = state => dispatch.choice_groups.find(row => row.interface_entry_id === state.node)
    || dispatch.choice_groups.find(row => !row.interface_entry_id && row.interface_state_ids?.includes(state.node));
  const put = (state, suffix, value) => {
    const field = `save.slot.${state.context.slot}.${suffix}`, before = state.fields[field];
    if (before === undefined) throw new TypeError(`预览缺少字段：${field}`);
    state.fields[field] = structuredClone(value);
    state.execution.trace.push({effect: 'item', field, before, after: value, evidence: HUMAN_ITEMS_EVIDENCE});
  };
  const object = state => state.execution.item?.source || {kind: state.context.kind, id: state.context[state.context.kind]};
  const inventory = (state, actor = object(state)) => actor.kind === 'role'
    ? [...get(state, `role.${SERVICE_ROLES[actor.id]}.inventory`)]
    : Array.from({length: 8}, (_, index) => get(state, `vehicle.${actor.id}.item.${index}`));
  const writeInventory = (state, actor, value) => {
    if (actor.kind === 'role') put(state, `role.${SERVICE_ROLES[actor.id]}.inventory`, value);
    else value.forEach((id, index) => put(state, `vehicle.${actor.id}.item.${index}`, id));
  };
  const consume = state => {
    const source = object(state), index = state.execution.item.index;
    writeInventory(state, source, removeCarriedItem(inventory(state, source), index));
  };
  const result = (state, record, {next = 'field-command-menu.main', pending = null} = {}) => {
    state.execution.itemResult = {record, next, pending, target: [S.vehicleUse, S.parts].includes(state.node)
      ? {vehicle: state.context.item_vehicle, component: state.node === S.parts ? SERVICE_PARTS[state.selections.choice] : null} : null};
    enter(state, S.result, {push: false});
  };
  const effects = humanItemEffects(data, {get, put, consume, enter, result, block, vehicles});
  const name = (state, actor) => actor.kind === 'role' ? data.roleLabels?.[actor.id] || ['猎人', '机械师', '战士'][actor.id]
    : data.vehicleLabels?.[actor.id] || `战车 ${actor.id + 1}`;
  const entries = state => {
    if ([S.actors, S.transfer].includes(state.node)) return [
      ...roles(state).map(row => ({...row, kind: 'role'})),
      ...(state.node === S.actors ? vehicles(state).map(row => ({...row, kind: 'vehicle'})) : [])]
      .sort((a, b) => a.position - b.position).map(row => ({...row, label: name(state, row)}));
    if ([S.vehicleTransfer, S.vehicleUse].includes(state.node)) return vehicles(state)
      .map(row => ({...row, kind: 'vehicle', label: name(state, {...row, kind: 'vehicle'})}));
    if (state.node === S.target) return roles(state).map(row => ({...row, position: row.id, kind: 'role', label: name(state, {...row, kind: 'role'})}));
    if (state.node === S.inventory) return inventory(state).slice(0, carriedInventoryCount(inventory(state)))
      .map((id, position) => ({id, position, label: data.itemLabels?.[id] || `道具 ${position + 1}`}));
    if (state.node === S.parts) return SERVICE_PARTS.slice(0, 6).map((part, position) => ({part, position,
      label: ['主炮', '副炮', 'S-E', 'C装置', '发动机', '底盘'][position]}));
    if (state.node === S.fax) return data.destinations
      .map(row => ({...row, position: row.id, label: row.label}));
    const source = group(state);
    return [S.actions, S.drop, S.faxReturn].includes(state.node) ? source.choices.map(row => ({...row, position: row.index,
      label: data.choiceLabels?.[source.id]?.[row.index] || (state.node === S.actions ? ['使用', '转交', '丢弃'][row.index] : ['是', '否'][row.index])})) : [];
  };
  const select = (state, row) => {if (state.node === S.parts) state.context.component_index = row.position;};
  const finish = state => {
    state.execution.status = 'returned'; state.returnStack = []; state.windows = []; state.pause = null;
  };
  const main = state => {
    state.returnStack = []; enter(state, 'field-command-menu.main', {push: false});
    state.selections = {choice: 3, position: 3};
  };
  const cancel = state => {
    if ([S.actors, S.fax, S.faxReturn].includes(state.node)) return finish(state);
    if (state.node === S.inventory) {delete state.execution.item; return enter(state, S.actors, {push: false});}
    if (state.node === S.actions) return enter(state, S.inventory, {push: false});
    if (state.node === S.drop) return result(state, 31);
    enter(state, S.actions, {push: false});
  };
  const transfer = (state, target) => {
    const source = object(state), old = inventory(state, target), count = carriedInventoryCount(old);
    const same = source.kind === target.kind && source.id === target.id;
    if (target.kind === 'vehicle' && target.id >= 8) return result(state, 151);
    const destination = count - Number(same);
    if (destination >= 8) return result(state, target.kind === 'role' ? 12 : 19);
    const removed = removeCarriedItem(inventory(state, source), state.execution.item.index);
    const received = same ? removed : old; received[destination] = state.execution.item.id;
    writeInventory(state, source, removed);
    if (!same) writeInventory(state, target, received);
    state.domainResults.transfer = {source, target, destination, item: state.execution.item.id};
    result(state, target.kind === 'role' ? 23 : 116);
  };
  const direction = (state, type) => {
    const list = entries(state); if (!list.length) return;
    if ([S.drop, S.faxReturn].includes(state.node)) {
      if (['left', 'right'].includes(type)) state.selections = {choice: type === 'right' ? 1 : 0, position: type === 'right' ? 1 : 0};
      return;
    }
    const selector = Number(group(state)?.selector?.value), directionIndex = ['up', 'down', 'left', 'right'].indexOf(type) + 1;
    const count = [S.actors, S.transfer, S.vehicleTransfer, S.vehicleUse].includes(state.node) ? 8
      : state.node === S.fax ? 12 : state.node === S.parts ? 6 : list.length;
    const moved = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
      selector, selection_index: state.selections.position, selection_count: count, direction_index: directionIndex}, navigation);
    if (moved.status !== 'available') return block(state, '工具选择布局的方向输入未确认');
    let position = moved.state.selection_index;
    if (!list.some(row => row.position === position)) {
      const step = ['up', 'left'].includes(type) ? -1 : 1;
      const stride = [S.actors, S.transfer, S.vehicleTransfer, S.vehicleUse].includes(state.node) && directionIndex < 3 ? 2 : 1;
      while (position >= 0 && position < count && !list.some(row => row.position === position)) position += step * stride;
    }
    const index = list.findIndex(row => row.position === position);
    if (index >= 0) {state.selections = {choice: index, position}; select(state, list[index]);}
  };
  return {owns, entries, select, advance(state, input) {
    const from = state.node;
    if (input.type === 'random') {
      if (!Number.isInteger(input.value) || input.value < 0 || input.value > 255) throw new RangeError('随机输入须为 0–255');
      state.execution.itemRandom = input.value; state.randomInputs.push(input.value); return state;
    }
    if (from === S.map) {if (['up', 'down', 'left', 'right', 'a', 'b'].includes(input.type)) finish(state); return state;}
    if (input.type === 'option') {
      const row = entries(state)[input.index]; if (!row) throw new RangeError('输入选项超出当前道具候选');
      state.selections = {choice: input.index, position: row.position}; select(state, row); return state;
    }
    if (['up', 'down', 'left', 'right'].includes(input.type)) {direction(state, input.type); return state;}
    if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的道具输入');
    if (from === S.result) {
      const pending = state.execution.itemResult.pending;
      if (pending === 'drop') consume(state);
      const next = state.execution.itemResult.next;
      if (input.type === 'b') {finish(state); return state;}
      if (next === 'field-command-menu.main') main(state); else enter(state, next, {push: false});
      return state;
    }
    if (input.type === 'b') {cancel(state); return state;}
    const row = entries(state)[state.selections.choice]; if (!row) return state;
    if (from === S.actors) {
      delete state.execution.item;
      Object.assign(state.context, {kind: row.kind, [row.kind]: row.id, actor: `save-${row.kind}:${row.id}`});
      if (!carriedInventoryCount(inventory(state))) result(state, 14); else enter(state, S.inventory);
    } else if (from === S.inventory) {
      delete state.domainResults.healing;
      state.context.inventory_index = row.position;
      state.execution.item = {id: row.id, index: row.position, source: {kind: state.context.kind, id: state.context[state.context.kind]}};
      if (row.id >= 0xDC) result(state, 169); else enter(state, S.actions);
    } else if (from === S.actions) {
      if (row.index === 0) effects.use(state);
      else if (row.index === 1) enter(state, object(state).kind === 'role' ? S.transfer : S.vehicleTransfer);
      else enter(state, S.drop);
    } else if ([S.transfer, S.vehicleTransfer].includes(from)) transfer(state, row);
    else if (from === S.drop) result(state, row.index ? 31 : 111, {pending: row.index ? null : 'drop'});
    else if (from === S.target) {state.context.item_target = row.id; effects.apply(state);}
    else if (from === S.vehicleUse) {
      state.context.item_vehicle = row.id; state.context.vehicle = row.id;
      const use = data.uses.records.find(use => use.id === state.execution.item.id);
      if (use?.id === 0xB0) enter(state, S.parts);
      else effects.vehicle(state);
    } else if (from === S.parts) {
      const vehicle = state.context.item_vehicle, part = row.part;
      if (!(get(state, `vehicle.${vehicle}.equipped_mask_raw`) & (0x80 >> row.position))) return result(state, 131);
      const condition = get(state, `vehicle.${vehicle}.equipment_state.${part}`);
      const damage = Number(Boolean(condition & 0x80)) + Number(Boolean(condition & 0x40));
      if (damage === 1) put(state, `vehicle.${vehicle}.equipment_state.${part}`, condition & 0x3F);
      result(state, 132 + damage);
    }
    else if (from === S.faxReturn) {
      if (row.index) finish(state);
      else {
        const destination = faxEntranceDestination(state.view.savedEntrance, data.cameraModel);
        if (!destination) block(state, '洞穴返回缺少自然进入时保存的入口场景、坐标与方向');
        else {state.domainResults.scene = destination; state.execution.status = 'scene-loading';}
      }
    } else if (from === S.fax) {
      if (!get(state, `teleport_destination.${row.id}.unlocked`)) return state;
      state.domainResults.scene = {kind: 'fax', destination: row.id, sceneId: 0, cameraX: row.coordinate_x, cameraY: row.coordinate_y,
        evidence: FAX_SCENE_EVIDENCE};
      state.execution.status = 'scene-loading';
    }
    if (state.execution.status !== 'returned') frame(state);
    return state;
  }};
}

export function humanItemsExecutionPreview(preview, state) {
  if (!preview || !state.node.startsWith('human-items.')) return preview;
  const source = state.execution.item?.source;
  const field = source?.kind === 'role' ? `save.slot.${state.context.slot}.role.${SERVICE_ROLES[source.id]}.inventory` : null;
  const result = structuredClone(preview);
  delete result.field_use_result;
  result.runtime_context = {...result.runtime_context, inventory_index: state.context.inventory_index ?? 0};
  if (state.node === S.map) result.satellite_position = {...playerTileFromSaveCamera(
    state.fields[`save.slot.${state.context.slot}.camera_x`], state.fields[`save.slot.${state.context.slot}.camera_y`]), visible: true};
  if (state.node === S.result) {
    result.runtime_context.choice_index = 3;
    const body = result.layers.find(layer => layer.kind === 'script' && !layer.glyph_cache_only);
    body.record = `record:02:${String(state.execution.itemResult.record).padStart(3, '0')}`;
    body.field_result_record = body.record;
    body.dialogue_runtime = true;
    const target = state.execution.itemResult.target;
    body.provider_save_names = {7: target ? `save.slot.${state.context.slot}.vehicle.${target.vehicle}.name_codes`
      : `save.slot.${state.context.slot}.role.${SERVICE_ROLES[state.context.item_target ?? state.context.role]}.name_codes`};
    if (state.domainResults.healing) body.provider_constants = {15: state.domainResults.healing.amount};
    if (state.domainResults.coin && state.execution.itemResult.record === 114)
      body.provider_record_pairs = {15: state.domainResults.coin};
  }
  for (const layer of result.layers) {
    if (layer.runtime_save_item && state.node === S.result && state.execution.itemResult.target?.component) {
      const {vehicle, component} = state.execution.itemResult.target;
      layer.runtime_save_item = {field_id: `save.slot.${state.context.slot}.vehicle.${vehicle}.equipment.${component}`};
    } else if (layer.runtime_save_item && source?.kind === 'role') layer.runtime_save_item = {
      field_id: field, index: state.execution.item.index, index_context: 'inventory_index'};
    else if (layer.runtime_save_item && source?.kind === 'vehicle') layer.runtime_save_item = {
      field_ids: Array.from({length: 8}, (_, index) => `save.slot.${state.context.slot}.vehicle.${source.id}.item.${index}`),
      index: state.execution.item.index, index_context: 'inventory_index'};
    if (state.node === S.inventory && layer.provider_save_items) {
      const actor = {kind: state.context.kind, id: state.context[state.context.kind]};
      const {providers} = layer.provider_save_items;
      layer.provider_save_items = actor.kind === 'role' ? {providers,
        field_id: `save.slot.${state.context.slot}.role.${SERVICE_ROLES[actor.id]}.inventory`}
        : {providers, field_ids: Array.from({length: 8}, (_, index) => `save.slot.${state.context.slot}.vehicle.${actor.id}.item.${index}`)};
    }
    if (layer.repair_components) layer.repair_components.vehicle = state.context.item_vehicle ?? state.context.vehicle;
  }
  if (state.node === S.result && state.execution.item) result.runtime_context.item_overrides = {...result.runtime_context.item_overrides,
    ...(field ? {[field]: {[state.execution.item.index]: state.execution.item.id}} : {
      [`save.slot.${state.context.slot}.vehicle.${source.id}.item.${state.execution.item.index}`]: {value: state.execution.item.id}})};
  return result;
}
