import { state } from './emulator-Bpa8EsFw.js';
import { uiCommandDispatchTarget, BATTLE_INTERFACE_PAGES, textRecord, textRecordNodeId, decodeFixedTextRecord, STORY_DIALOGUE_OPERATIONS, projectStoryScriptPrograms, db, blankInterfaceStateDocument, interfaceStateFieldKey, flushAllAutoSaves, serializeInterfaceStateDocument } from './prg-loaders-DnCSmXk9.js';
import { interfacePreviewState, esc } from './interface-state-preview-Dlotqlmn.js';
import { foldInterfaceStateGraph, interfaceStatePageGraph, interfaceStateSources, createInterfaceStateSource, createInterfaceStateControllerWorkbench } from './story-component-labels-CSjCRgXX.js';
import { carriedInventoryCount, removeCarriedItem, machineServiceGraph, genericShopGraph, genericShopPreview } from './machine-service-model-B-6y5baD.js';
import { executeFacilityWindowRoutine, applyBattleResultEffects, battleResultGraph } from './battle-result-state-machine-BbK2hSud.js';
import { SERVICE_ROLES, currentVehicleEquipmentLoad, SERVICE_PARTS, roleEquipmentStats, storagePreviewEntries, battleConditionWaitCount, executeSceneActionLocalHandler, paintUiConstructionSemanticPreview, uiEditorPreviewDraft } from './ui-construction-preview-BuoQ5mM6.js';
import { saveCameraFromPlayerTile, playerTileFromSaveCamera } from './physical-field-object-windows-DnQmS3eb.js';
import { systemStateGraph } from './system-state-model-zPjxuFk6.js';
import { screenWorkbench, screenWorkbenchCanvasStage, elementTree, bindScreenWorkbenchZoom, bindScreenWorkbenchBottomResize } from './element-tree-C1bWRgTl.js';
import { referencePickerMarkup, bindReferencePicker } from './timeline-player-YCH7Y-3h.js';
import { mountFieldObjectColumns } from './field-object-editor-Blro4OF0.js';

// @editor-module 人类道具节点引用现有构造，准备动作折入使用边。
const HUMAN_ITEMS_EVIDENCE = 'project/evidence/reverse-engineering/human-items-state-machine/observations.json';
const HUMAN_ITEM_STATES = Object.freeze({actors: 'human-items.actor-select', inventory: 'human-items.inventory',
  actions: 'human-items.action-select', target: 'human-items.field-use-target', transfer: 'human-items.transfer-target',
  vehicleTransfer: 'human-items.vehicle-transfer-target', vehicleUse: 'human-items.vehicle-use-target',
  parts: 'human-items.vehicle-part-target', drop: 'human-items.drop-confirm', result: 'human-items.result-message',
  fax: 'human-items.fax-destination-select', faxReturn: 'human-items.fax-return-confirm', map: 'human-items.world-map'});

const humanItemSceneType = scene => scene.id === 0 ? 0 : Number(Boolean(scene.header[0] & 8));

function addHumanItemsStateGraph(graph, dispatch, catalog) {
  const definition = catalog.interfaces.find(row => row.id === 'human-items');
  const nodes = new Map(graph.nodes.map(row => [row.id, row]));
  for (const preview of dispatch.previews.filter(row => row.interface_state_id?.startsWith('human-items.'))) {
    const id = preview.interface_entry_id || preview.interface_state_id;
    const state = definition.states.find(row => row.id === preview.interface_state_id);
    nodes.set(id, {id, stateId: state.id, entryId: preview.interface_entry_id || null, preview,
      pageId: id === HUMAN_ITEM_STATES.map ? 'satellite-map' : id.includes('fax') ? 'field-item-fax' : 'human-items',
      label: state.entry_routes?.find(row => row.id === id)?.label || state.label,
      input: 'A 确认 / B 返回', regions: []});
  }
  const transitions = graph.transitions.filter(row => !row.from.startsWith('human-items.'));
  const add = (from, to, input, kind, unknown = false) => transitions.push({id: `human-item-transition:${transitions.length}`,
    from, to, input, operation: {kind}, unknown, evidence: HUMAN_ITEMS_EVIDENCE, controls: [], declarations: []});
  const S = HUMAN_ITEM_STATES, main = 'field-command-menu.main';
  add(S.actors, S.inventory, 'A · 对象', 'inventory');
  add(S.actors, null, 'B · 返回行走', 'return');
  add(S.inventory, S.actions, 'A · 道具', 'actions');
  add(S.inventory, S.actors, 'B · 对象选择', 'return-actors');
  add(S.actions, S.inventory, 'B · 道具列表', 'return-inventory');
  for (const [target, label] of [[S.target, '人物目标'], [S.vehicleUse, '战车目标'], [S.result, '效果反馈'],
    [S.fax, '传真目的地'], [S.faxReturn, '洞穴返回'], [S.map, '世界地图']])
    add(S.actions, target, `A · 使用 / ${label}`, 'use');
  add(S.actions, S.transfer, 'A · 转交 / 人物', 'transfer');
  add(S.actions, S.vehicleTransfer, 'A · 转交 / 战车', 'transfer');
  add(S.actions, S.drop, 'A · 丢弃', 'drop');
  for (const id of [S.target, S.vehicleUse, S.parts, S.transfer, S.vehicleTransfer]) {
    add(id, S.actions, 'B · 取消', 'cancel');
    add(id, S.result, 'A · 当前目标', 'effect');
    if ([S.vehicleUse, S.parts].includes(id)) transitions.at(-1).evidence = 'project/evidence/reverse-engineering/field-menu-followups/observations.json';
  }
  add(S.vehicleUse, S.parts, 'A · 修理箱', 'parts');
  add(S.drop, S.result, 'A / B · 是或否', 'drop-result');
  add(S.result, main, 'A / B · 正文结束', 'result-return');
  add(S.fax, null, 'A · 已开放目的地 / 场景移动', 'fax-scene');
  add(S.fax, null, 'B · 返回行走', 'fax-cancel');
  add(S.faxReturn, null, 'B / A·否 · 返回行走', 'fax-cancel');
  add(S.faxReturn, null, 'A·是 · 保存的入口 / 场景移动', 'fax-entrance');
  add(S.map, null, '任意新按键 · 返回行走', 'map-return');
  for (const id of Object.values(S).filter(id => ![S.result, S.map].includes(id)))
    add(id, id, '方向 · 当前候选', 'selection');
  return {...graph, nodes: [...nodes.values()], transitions,
    edges: transitions.map(row => ({...row, routes: [row], condition: row.unknown ? '此调用效果未确认' : row.operation.condition || ''}))};
}

// @editor-module 道具效果从当前登记和显式随机输入计算，缺现场的效果保持未确认。

function humanItemEffects({uses, healing, codes, items}, {get, put, consume, enter, result, block, vehicles}) {
  const targetPath = state => `role.${SERVICE_ROLES[state.context.item_target ?? state.context.role]}`;
  const status = (state, path, value) => {
    put(state, `${path}.status`, value);
    for (const [name, mask] of [['acid', 8], ['numb', 128]])
      if (Object.hasOwn(state.fields, `save.slot.${state.context.slot}.${path}.${name}`))
        put(state, `${path}.${name}`, Number(value !== 255 && Boolean(value & mask)));
    if (Object.hasOwn(state.fields, `save.slot.${state.context.slot}.${path}.dead`)) put(state, `${path}.dead`, Number(value === 255));
  };
  const apply = state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    const family = use?.effect_family.id, path = targetPath(state);
    if (family === 'throw-stone') {consume(state); return result(state, 129);}
    if (family === 'wallet') {
      const middle = get(state, 'gold') >>> 8 & 255;
      return result(state, 82 + Number(Boolean(middle & 0xFC)) + Number(Boolean(middle & 0xE0)));
    }
    if (family === 'ancient-coin') {
      state.domainResults.coin = {region: codes['runtime-action-record-region'],
        record: codes['field-item-coin-record-base'] + Number(!(state.execution.itemRandom & 0x80))};
      return result(state, 114);
    }
    if (family === 'heal-hp') {
      if (get(state, `${path}.status`) === 255) return result(state, 118);
      const base = healing.records.find(row => row.id === use.id)?.base_healing;
      if (!Number.isInteger(base) || base < 0 || base > 65535) return block(state, '当前回复基础值未确认');
      const random = state.execution.itemRandom & 15, low = (base & 255) + random;
      const current = get(state, `${path}.current_hp`), sumLow = (current & 255) + (low & 255) + Number(low > 255);
      const sumHigh = (current >>> 8) + (base >>> 8) + Number(sumLow > 255);
      const total = ((sumHigh & 255) << 8) | (sumLow & 255), maximum = get(state, `${path}.max_hp`);
      state.domainResults.healing = {amount: ((base & 0xFF00) | (low & 255)), random};
      put(state, `${path}.current_hp`, total > maximum ? maximum : total);
      if (use.id !== 0xD1) consume(state);
      return result(state, 89 + Number(total > maximum));
    }
    if (family === 'revive') {
      if (get(state, `${path}.status`) !== 255) return result(state, 140);
      put(state, `${path}.current_hp`, get(state, `${path}.max_hp`)); status(state, path, 0);
      put(state, 'global_event_flag.4D', 0); consume(state); return result(state, 139);
    }
    if (['clear-poison', 'clear-drunk'].includes(family)) {
      const before = get(state, `${path}.status`), mask = family === 'clear-poison' ? 8 : 128;
      const changed = before !== 255 && Boolean(before & mask);
      if (changed) {status(state, path, before & ~mask); if (use.id !== 0xAD) consume(state);}
      return result(state, (family === 'clear-poison' ? 138 : 136) - Number(changed));
    }
    if (family === 'scripted-message') {
      return result(state, Number(use.text_record_references[0].split(':').at(-1)));
    }
    if (family === 'vehicle-context') {
      if (state.context.role !== 1 && get(state, `role.${SERVICE_ROLES[state.context.role]}.repair_skill`)
          < codes['field-item-repair-skill-threshold']) return result(state, codes['field-item-repair-failure-record']);
      if (!vehicles(state).length) return result(state, 130);
      return enter(state, HUMAN_ITEM_STATES.vehicleUse);
    }
    if (['restore-sp', 'wax'].includes(family)) return enter(state, HUMAN_ITEM_STATES.vehicleUse);
    if (family === 'world-map') return get(state, 'scene_id') === 0 ? result(state, 156, {next: HUMAN_ITEM_STATES.map}) : result(state, 158);
    if (family === 'fax') return block(state, '传真场景类型缺少当前入口属性，不能由场景编号猜测洞穴');
    if (!use) return result(state, 119);
    block(state, `“${use.effect_family.label}”的场景字段或领域完成结果未确认`);
  };
  const vehicle = state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    if (use?.effect_family.id === 'wax') {
      const path = `vehicle.${state.context.item_vehicle}`;
      consume(state);
      put(state, `${path}.condition_raw`, get(state, `${path}.condition_raw`) & -5);
      put(state, `${path}.acid`, 0);
      return result(state, 124);
    }
    if (use?.effect_family.id === 'restore-sp') {
      const path = `vehicle.${state.context.item_vehicle}`;
      const amount = uses.pag_sp_restore_values_low_high.find(row => Number.parseInt(row.item_reference.split(':')[1], 16) === use.id)?.sp_restore;
      const load = currentVehicleEquipmentLoad({read: suffix => get(state, `${path}.${suffix}`), items, extra: amount});
      if (!load) return block(state, 'PAG 缺少当前设备重量或引擎载重');
      const adjusted = !load.overloaded ? amount : load.capacity === 0 ? 0
        : (amount - ((load.weight - load.capacity) & 0xFFFF)) & 0xFFFF;
      consume(state);
      put(state, `${path}.sp`, (get(state, `${path}.sp`) + adjusted) & 0xFFFF);
      return result(state, 142);
    }
    block(state, '所选战车道具的容量截取或状态重算未确认');
  };
  return {apply, vehicle, use: state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    if (state.execution.item.source.kind === 'vehicle' && state.execution.item.id < 0xCB)
      return block(state, '战车携带人类道具时的状态检查跨字段读取未确认');
    if (state.execution.item.id < 0xCB && get(state, `role.${SERVICE_ROLES[state.context.role]}.status`) & 128)
      return result(state, 22);
    if (use?.effect_family.id === 'fax') {
      if (state.context.fieldSceneType === 1) return enter(state, HUMAN_ITEM_STATES.faxReturn);
      if (state.context.fieldSceneType === undefined) return apply(state);
      return result(state, 87, {next: HUMAN_ITEM_STATES.fax});
    }
    if (use?.target_required) {
      const roles = SERVICE_ROLES.flatMap((role, id) => get(state, `role.${role}.present`) ? [id] : []);
      if (roles.length === 1) {state.context.item_target = roles[0]; return apply(state);}
      return enter(state, HUMAN_ITEM_STATES.target);
    }
    return apply(state);
  }};
}

// @editor-module 传真场景调用只在隔离现场完成装载与入口返回。

const FAX_SCENE_EVIDENCE = 'project/evidence/reverse-engineering/fax-cave-scene-return/observations.json';
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const sceneHandle = id => `scene:${id.toString(16).toUpperCase().padStart(2, '0')}`;

function directionVector(cameraModel, direction) {
  const vector = [cameraModel?.delta_x?.[direction], cameraModel?.delta_y?.[direction]];
  return vector.every(value => Number.isInteger(value) && value >= -128 && value <= 255)
    ? vector.map(value => value & 255) : null;
}

function faxEntranceDestination(entrance, cameraModel) {
  if (!entrance || entrance.provenance !== 'natural-point-transition'
      || ![entrance.sceneId, entrance.cameraX, entrance.cameraY].every(byte)
      || !Number.isInteger(entrance.direction) || entrance.direction < 1 || entrance.direction > 4) return null;
  const vector = directionVector(cameraModel, entrance.direction);
  if (!vector) return null;
  const [dx, dy] = vector;
  return {kind: 'fax-return', sceneId: entrance.sceneId,
    cameraX: (entrance.cameraX - dx) & 255, cameraY: (entrance.cameraY - dy) & 255,
    evidence: FAX_SCENE_EVIDENCE};
}

async function completeFaxScene(snapshot, initialize) {
  const request = snapshot.domainResults.scene;
  if (snapshot.execution.status !== 'scene-loading' || !request) return snapshot;
  try {
    if (!byte(request.sceneId)) throw new TypeError('传真场景落点无效');
    const point = playerTileFromSaveCamera(request.cameraX, request.cameraY);
    const context = {...snapshot.context, scene: {sceneId: request.sceneId, ...point}};
    const {entry} = await initialize({...snapshot, context});
    const prefix = `save.slot.${context.slot}.`;
    for (const [field, value] of Object.entries({scene_id: request.sceneId,
      camera_x: entry.camera.x & 255, camera_y: entry.camera.y & 255})) {
      if (!Object.hasOwn(snapshot.fields, prefix + field)) throw new TypeError(`预览缺少字段：${prefix + field}`);
      if (!byte(value)) throw new TypeError('传真场景落点无效');
    }
    const next = structuredClone(snapshot);
    Object.assign(next.context, context, {fieldSceneType: humanItemSceneType(entry.scene)});
    Object.assign(next.fields, {[prefix + 'scene_id']: request.sceneId,
      [prefix + 'camera_x']: entry.camera.x & 255, [prefix + 'camera_y']: entry.camera.y & 255});
    next.context.scene = {sceneId: request.sceneId, ...playerTileFromSaveCamera(entry.camera.x & 255, entry.camera.y & 255)};
    delete next.view.deviceScene;
    next.view.sceneEntry = {sceneId: request.sceneId, direction: 0, state: entry.state, display: entry.display,
      party: entry.state.owners.flatMap(owner => owner.fields).filter(field =>
        ['party.x', 'party.y', 'party.direction', 'party.order', 'party.renderState', 'field.partyCount'].includes(field.field)),
      evidence: FAX_SCENE_EVIDENCE};
    next.domainResults.scene = {...request, status: 'confirmed', cameraX: entry.camera.x & 255, cameraY: entry.camera.y & 255};
    next.execution.status = 'returned'; delete next.execution.reason;
    next.execution.trace.push({effect: 'fax-scene', ...next.domainResults.scene});
    next.windows = []; next.returnStack = []; next.pause = null;
    return next;
  } catch (error) {
    snapshot.execution.status = 'unknown'; snapshot.execution.reason = error.message;
    snapshot.domainResults.scene = {...request, status: 'unknown'};
    return snapshot;
  }
}

async function prepareFaxNaturalEntry(snapshot, direction, {readDocument, initialize}) {
  const source = snapshot.context.scene;
  if (!source || !Number.isInteger(direction) || direction < 1 || direction > 4)
    throw new TypeError('自然进入须选择入口场景、坐标与进入方向');
  const document = await readDocument(sceneHandle(source.sceneId)), scene = document.scene || document;
  const transition = document.logic?.layers?.transitions?.point_transitions?.find(row => row.x === source.x && row.y === source.y);
  if (humanItemSceneType(scene) !== 0 || !transition)
    throw new TypeError('所选位置没有保存返回入口的自然转场');
  const targetDocument = await readDocument(sceneHandle(transition.destination_scene_id));
  if (humanItemSceneType(targetDocument.scene || targetDocument) !== 1)
    throw new TypeError('所选入口的目的场景没有洞穴传真分支');
  const {core} = await initialize(snapshot);
  const vector = directionVector(core.storyBrowserVm().camera_model, direction);
  if (!vector) throw new TypeError('自然进入方向的当前坐标增量未确认');
  // 入口解析消费格步完成后的所选坐标与进入方向。
  const entrance = {provenance: 'natural-point-transition', sceneId: source.sceneId,
    ...saveCameraFromPlayerTile(source.x, source.y), direction, transitionId: transition.id,
    destinationSceneId: transition.destination_scene_id, evidence: FAX_SCENE_EVIDENCE};
  snapshot.view.savedEntrance = entrance;
  snapshot.domainResults.scene = {kind: 'natural-entry', sceneId: transition.destination_scene_id,
    ...saveCameraFromPlayerTile(transition.destination_x, transition.destination_y), evidence: FAX_SCENE_EVIDENCE};
  snapshot.execution.status = 'scene-loading';
  const entered = await completeFaxScene(snapshot, initialize);
  if (entered.execution.status !== 'returned') throw new TypeError(entered.execution.reason);
  entered.execution.status = 'waiting'; entered.pause = {kind: 'menu'};
  return entered;
}

// @editor-module 工具输入只提交已确认的效果到本次快照。

function humanItemsExecution(data, {get, enter, frame, block, roles, vehicles, navigation, dispatch}) {
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
    state.execution.itemResult = {record, next, pending, target: [HUMAN_ITEM_STATES.vehicleUse, HUMAN_ITEM_STATES.parts].includes(state.node)
      ? {vehicle: state.context.item_vehicle, component: state.node === HUMAN_ITEM_STATES.parts ? SERVICE_PARTS[state.selections.choice] : null} : null};
    enter(state, HUMAN_ITEM_STATES.result, {push: false});
  };
  const effects = humanItemEffects(data, {get, put, consume, enter, result, block, vehicles});
  const name = (state, actor) => actor.kind === 'role' ? data.roleLabels?.[actor.id] || ['猎人', '机械师', '战士'][actor.id]
    : data.vehicleLabels?.[actor.id] || `战车 ${actor.id + 1}`;
  const entries = state => {
    if ([HUMAN_ITEM_STATES.actors, HUMAN_ITEM_STATES.transfer].includes(state.node)) return [
      ...roles(state).map(row => ({...row, kind: 'role'})),
      ...(state.node === HUMAN_ITEM_STATES.actors ? vehicles(state).map(row => ({...row, kind: 'vehicle'})) : [])]
      .sort((a, b) => a.position - b.position).map(row => ({...row, label: name(state, row)}));
    if ([HUMAN_ITEM_STATES.vehicleTransfer, HUMAN_ITEM_STATES.vehicleUse].includes(state.node)) return vehicles(state)
      .map(row => ({...row, kind: 'vehicle', label: name(state, {...row, kind: 'vehicle'})}));
    if (state.node === HUMAN_ITEM_STATES.target) return roles(state).map(row => ({...row, position: row.id, kind: 'role', label: name(state, {...row, kind: 'role'})}));
    if (state.node === HUMAN_ITEM_STATES.inventory) return inventory(state).slice(0, carriedInventoryCount(inventory(state)))
      .map((id, position) => ({id, position, label: data.itemLabels?.[id] || `道具 ${position + 1}`}));
    if (state.node === HUMAN_ITEM_STATES.parts) return SERVICE_PARTS.slice(0, 6).map((part, position) => ({part, position,
      label: ['主炮', '副炮', 'S-E', 'C装置', '发动机', '底盘'][position]}));
    if (state.node === HUMAN_ITEM_STATES.fax) return data.destinations
      .map(row => ({...row, position: row.id, label: row.label}));
    const source = group(state);
    return [HUMAN_ITEM_STATES.actions, HUMAN_ITEM_STATES.drop, HUMAN_ITEM_STATES.faxReturn].includes(state.node) ? source.choices.map(row => ({...row, position: row.index,
      label: data.choiceLabels?.[source.id]?.[row.index] || (state.node === HUMAN_ITEM_STATES.actions ? ['使用', '转交', '丢弃'][row.index] : ['是', '否'][row.index])})) : [];
  };
  const select = (state, row) => {if (state.node === HUMAN_ITEM_STATES.parts) state.context.component_index = row.position;};
  const finish = state => {
    state.execution.status = 'returned'; state.returnStack = []; state.windows = []; state.pause = null;
  };
  const main = state => {
    state.returnStack = []; enter(state, 'field-command-menu.main', {push: false});
    state.selections = {choice: 3, position: 3};
  };
  const cancel = state => {
    if ([HUMAN_ITEM_STATES.actors, HUMAN_ITEM_STATES.fax, HUMAN_ITEM_STATES.faxReturn].includes(state.node)) return finish(state);
    if (state.node === HUMAN_ITEM_STATES.inventory) {delete state.execution.item; return enter(state, HUMAN_ITEM_STATES.actors, {push: false});}
    if (state.node === HUMAN_ITEM_STATES.actions) return enter(state, HUMAN_ITEM_STATES.inventory, {push: false});
    if (state.node === HUMAN_ITEM_STATES.drop) return result(state, 31);
    enter(state, HUMAN_ITEM_STATES.actions, {push: false});
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
    if ([HUMAN_ITEM_STATES.drop, HUMAN_ITEM_STATES.faxReturn].includes(state.node)) {
      if (['left', 'right'].includes(type)) state.selections = {choice: type === 'right' ? 1 : 0, position: type === 'right' ? 1 : 0};
      return;
    }
    const selector = Number(group(state)?.selector?.value), directionIndex = ['up', 'down', 'left', 'right'].indexOf(type) + 1;
    const count = [HUMAN_ITEM_STATES.actors, HUMAN_ITEM_STATES.transfer, HUMAN_ITEM_STATES.vehicleTransfer, HUMAN_ITEM_STATES.vehicleUse].includes(state.node) ? 8
      : state.node === HUMAN_ITEM_STATES.fax ? 12 : state.node === HUMAN_ITEM_STATES.parts ? 6 : list.length;
    const moved = executeFacilityWindowRoutine(navigation.catalog, 'window-F1F9', {
      selector, selection_index: state.selections.position, selection_count: count, direction_index: directionIndex}, navigation);
    if (moved.status !== 'available') return block(state, '工具选择布局的方向输入未确认');
    let position = moved.state.selection_index;
    if (!list.some(row => row.position === position)) {
      const step = ['up', 'left'].includes(type) ? -1 : 1;
      const stride = [HUMAN_ITEM_STATES.actors, HUMAN_ITEM_STATES.transfer, HUMAN_ITEM_STATES.vehicleTransfer, HUMAN_ITEM_STATES.vehicleUse].includes(state.node) && directionIndex < 3 ? 2 : 1;
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
    if (from === HUMAN_ITEM_STATES.map) {if (['up', 'down', 'left', 'right', 'a', 'b'].includes(input.type)) finish(state); return state;}
    if (input.type === 'option') {
      const row = entries(state)[input.index]; if (!row) throw new RangeError('输入选项超出当前道具候选');
      state.selections = {choice: input.index, position: row.position}; select(state, row); return state;
    }
    if (['up', 'down', 'left', 'right'].includes(input.type)) {direction(state, input.type); return state;}
    if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的道具输入');
    if (from === HUMAN_ITEM_STATES.result) {
      const pending = state.execution.itemResult.pending;
      if (pending === 'drop') consume(state);
      const next = state.execution.itemResult.next;
      if (input.type === 'b') {finish(state); return state;}
      if (next === 'field-command-menu.main') main(state); else enter(state, next, {push: false});
      return state;
    }
    if (input.type === 'b') {cancel(state); return state;}
    const row = entries(state)[state.selections.choice]; if (!row) return state;
    if (from === HUMAN_ITEM_STATES.actors) {
      delete state.execution.item;
      Object.assign(state.context, {kind: row.kind, [row.kind]: row.id, actor: `save-${row.kind}:${row.id}`});
      if (!carriedInventoryCount(inventory(state))) result(state, 14); else enter(state, HUMAN_ITEM_STATES.inventory);
    } else if (from === HUMAN_ITEM_STATES.inventory) {
      delete state.domainResults.healing;
      state.context.inventory_index = row.position;
      state.execution.item = {id: row.id, index: row.position, source: {kind: state.context.kind, id: state.context[state.context.kind]}};
      if (row.id >= 0xDC) result(state, 169); else enter(state, HUMAN_ITEM_STATES.actions);
    } else if (from === HUMAN_ITEM_STATES.actions) {
      if (row.index === 0) effects.use(state);
      else if (row.index === 1) enter(state, object(state).kind === 'role' ? HUMAN_ITEM_STATES.transfer : HUMAN_ITEM_STATES.vehicleTransfer);
      else enter(state, HUMAN_ITEM_STATES.drop);
    } else if ([HUMAN_ITEM_STATES.transfer, HUMAN_ITEM_STATES.vehicleTransfer].includes(from)) transfer(state, row);
    else if (from === HUMAN_ITEM_STATES.drop) result(state, row.index ? 31 : 111, {pending: row.index ? null : 'drop'});
    else if (from === HUMAN_ITEM_STATES.target) {state.context.item_target = row.id; effects.apply(state);}
    else if (from === HUMAN_ITEM_STATES.vehicleUse) {
      state.context.item_vehicle = row.id; state.context.vehicle = row.id;
      const use = data.uses.records.find(use => use.id === state.execution.item.id);
      if (use?.id === 0xB0) enter(state, HUMAN_ITEM_STATES.parts);
      else effects.vehicle(state);
    } else if (from === HUMAN_ITEM_STATES.parts) {
      const vehicle = state.context.item_vehicle, part = row.part;
      if (!(get(state, `vehicle.${vehicle}.equipped_mask_raw`) & (0x80 >> row.position))) return result(state, 131);
      const condition = get(state, `vehicle.${vehicle}.equipment_state.${part}`);
      const damage = Number(Boolean(condition & 0x80)) + Number(Boolean(condition & 0x40));
      if (damage === 1) put(state, `vehicle.${vehicle}.equipment_state.${part}`, condition & 0x3F);
      result(state, 132 + damage);
    }
    else if (from === HUMAN_ITEM_STATES.faxReturn) {
      if (row.index) finish(state);
      else {
        const destination = faxEntranceDestination(state.view.savedEntrance, data.cameraModel);
        if (!destination) block(state, '洞穴返回缺少自然进入时保存的入口场景、坐标与方向');
        else {state.domainResults.scene = destination; state.execution.status = 'scene-loading';}
      }
    } else if (from === HUMAN_ITEM_STATES.fax) {
      if (!get(state, `teleport_destination.${row.id}.unlocked`)) return state;
      state.domainResults.scene = {kind: 'fax', destination: row.id, sceneId: 0, cameraX: row.coordinate_x, cameraY: row.coordinate_y,
        evidence: FAX_SCENE_EVIDENCE};
      state.execution.status = 'scene-loading';
    }
    if (state.execution.status !== 'returned') frame(state);
    return state;
  }};
}

function humanItemsExecutionPreview(preview, state) {
  if (!preview || !state.node.startsWith('human-items.')) return preview;
  const source = state.execution.item?.source;
  const field = source?.kind === 'role' ? `save.slot.${state.context.slot}.role.${SERVICE_ROLES[source.id]}.inventory` : null;
  const result = structuredClone(preview);
  delete result.field_use_result;
  result.runtime_context = {...result.runtime_context, inventory_index: state.context.inventory_index ?? 0};
  if (state.node === HUMAN_ITEM_STATES.map) result.satellite_position = {...playerTileFromSaveCamera(
    state.fields[`save.slot.${state.context.slot}.camera_x`], state.fields[`save.slot.${state.context.slot}.camera_y`]), visible: true};
  if (state.node === HUMAN_ITEM_STATES.result) {
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
    if (layer.runtime_save_item && state.node === HUMAN_ITEM_STATES.result && state.execution.itemResult.target?.component) {
      const {vehicle, component} = state.execution.itemResult.target;
      layer.runtime_save_item = {field_id: `save.slot.${state.context.slot}.vehicle.${vehicle}.equipment.${component}`};
    } else if (layer.runtime_save_item && source?.kind === 'role') layer.runtime_save_item = {
      field_id: field, index: state.execution.item.index, index_context: 'inventory_index'};
    else if (layer.runtime_save_item && source?.kind === 'vehicle') layer.runtime_save_item = {
      field_ids: Array.from({length: 8}, (_, index) => `save.slot.${state.context.slot}.vehicle.${source.id}.item.${index}`),
      index: state.execution.item.index, index_context: 'inventory_index'};
    if (state.node === HUMAN_ITEM_STATES.inventory && layer.provider_save_items) {
      const actor = {kind: state.context.kind, id: state.context[state.context.kind]};
      const {providers} = layer.provider_save_items;
      layer.provider_save_items = actor.kind === 'role' ? {providers,
        field_id: `save.slot.${state.context.slot}.role.${SERVICE_ROLES[actor.id]}.inventory`}
        : {providers, field_ids: Array.from({length: 8}, (_, index) => `save.slot.${state.context.slot}.vehicle.${actor.id}.item.${index}`)};
    }
    if (layer.repair_components) layer.repair_components.vehicle = state.context.item_vehicle ?? state.context.vehicle;
  }
  if (state.node === HUMAN_ITEM_STATES.result && state.execution.item) result.runtime_context.item_overrides = {...result.runtime_context.item_overrides,
    ...(field ? {[field]: {[state.execution.item.index]: state.execution.item.id}} : {
      [`save.slot.${state.context.slot}.vehicle.${source.id}.item.${state.execution.item.index}`]: {value: state.execution.item.id}})};
  return result;
}

// @editor-module 装备菜单按携带位置、装备位与确认边推进隔离状态。

const FIELD_EQUIPMENT_EVIDENCE = 'project/evidence/reverse-engineering/field-equipment-state-machine/observations.json';
const HUMAN = 'human-equipment', VEHICLE = 'vehicle-equipment-shells';
const roots = new Set([`${HUMAN}.list`, `${HUMAN}.actor-select`, `${VEHICLE}.parts`, `${VEHICLE}.detail`]);
const shell = `${VEHICLE}.shells`;
const aliases = {[`${HUMAN}.actor-select`]: `${HUMAN}.list`, [`${VEHICLE}.detail`]: `${VEHICLE}.parts`};
const isEquipment = id => id?.startsWith(`${HUMAN}.`) || id?.startsWith(`${VEHICLE}.`);
const owner = state => state.context.kind === 'vehicle' ? VEHICLE : HUMAN;
const root = state => state.context.kind === 'vehicle' ? `${VEHICLE}.parts` : `${HUMAN}.list`;
const suffix = state => state.node.split('.').at(-1);

function addFieldEquipmentGraph(nodes, dispatch, catalog, add) {
  for (const definition of catalog.interfaces.filter(row => [HUMAN, VEHICLE].includes(row.id))) {
    for (const state of definition.states) {
      const previews = dispatch.previews.filter(row => row.interface_state_id === (aliases[state.id] || state.id));
      for (const preview of previews) {
        const id = preview.interface_entry_id || state.id;
        nodes.set(id, {id, stateId: state.id, entryId: preview.interface_entry_id || null,
          pageId: definition.id, preview, label: state.entry_routes?.find(row => row.id === id)?.label || state.label,
          input: 'A 确认 / B 返回', regions: []});
      }
    }
  }
  const edge = (from, to, input, kind, condition = '') => add(from, to, input, {kind, condition}, false, FIELD_EQUIPMENT_EVIDENCE);
  for (const id of roots) {
    edge(id, `${HUMAN}.action-select`, 'A · 人物', 'equipment-actor', '人物携带栏非空');
    edge(id, `${VEHICLE}.action-select`, 'A · 战车', 'equipment-actor', '同行自有战车');
    edge(id, null, 'B · 返回行走', 'return');
  }
  for (const prefix of [HUMAN, VEHICLE]) {
    for (const action of ['equip', 'transfer', 'drop']) edge(`${prefix}.action-select`,
      `${prefix}.${action === 'drop' ? 'drop' : action}-items`, `A · ${action === 'equip' ? '装备' : action === 'transfer' ? '交给' : '扔'}`, 'equipment-action');
    edge(`${prefix}.action-select`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'B · 对象选择', 'equipment-return');
    for (const action of ['equip', 'transfer', 'drop']) edge(`${prefix}.${action}-items`, `${prefix}.action-select`,
      action === 'equip' && prefix === VEHICLE ? 'B · 提交装备标记' : 'B · 动作选择', 'equipment-return');
    edge(`${prefix}.transfer-items`, `${prefix}.transfer-target`, 'A · 接收者', 'equipment-transfer-select');
    edge(`${prefix}.transfer-target`, `${prefix}.transfer-items`, 'B · 取消转交', 'equipment-cancel');
    edge(`${prefix}.transfer-target`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 转交', 'equipment-transfer');
    edge(`${prefix}.drop-items`, `${prefix}.drop-confirm`, 'A · 丢弃确认', 'equipment-drop-select');
    edge(`${prefix}.drop-confirm`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 是 / 提交丢弃', 'equipment-drop');
    edge(`${prefix}.drop-confirm`, prefix === HUMAN ? `${HUMAN}.list` : `${VEHICLE}.parts`, 'A · 否 / B · 取消', 'equipment-cancel');
  }
  edge(`${HUMAN}.equip-items`, `${HUMAN}.result`, 'A · 装备 / 卸下', 'human-equipment');
  edge(`${HUMAN}.result`, `${HUMAN}.result`, 'A · 装备 / 卸下', 'human-equipment');
  edge(`${HUMAN}.result`, `${HUMAN}.action-select`, 'B · 动作选择', 'equipment-return');
  edge(`${VEHICLE}.equip-items`, `${VEHICLE}.equip-items`, 'A · 部件装备 / 卸下', 'vehicle-equipment');
  edge(`${VEHICLE}.equip-items`, `${VEHICLE}.weapon-mount-select`, 'A · 武器位置', 'vehicle-mount');
  edge(`${VEHICLE}.weapon-mount-select`, `${VEHICLE}.equip-items`, 'A · 装备武器', 'vehicle-mount-assign');
  edge(`${VEHICLE}.weapon-mount-select`, `${VEHICLE}.equip-items`, 'B · 取消位置选择', 'equipment-cancel');
  edge(shell, null, 'A / B · 返回行走', 'return');
  for (const node of nodes.values()) if (isEquipment(node.id)) edge(node.id, node.id, '方向 · 选择', 'selection');
}

function fieldEquipmentExecution({get, enter, restore, block, entries, selection, items = [], masks, choiceLabel}) {
  const item = id => items.find(row => row.id === id);
  const put = (state, path, value) => {
    const field = `save.slot.${state.context.slot}.${path}`, before = structuredClone(state.fields[field]);
    state.fields[field] = structuredClone(value);
    state.execution.trace.push({effect: 'equipment', field, before, after: structuredClone(value), evidence: FIELD_EQUIPMENT_EVIDENCE});
  };
  const rolePath = (state, id = state.context.role) => `role.${SERVICE_ROLES[id]}`;
  const vehiclePath = (state, id = state.context.vehicle) => `vehicle.${id}`;
  const inventory = state => state.context.kind === 'vehicle'
    ? SERVICE_PARTS.flatMap((part, column) => {
      const path = vehiclePath(state), id = get(state, `${path}.equipment.${part}`);
      return id ? [{id, column, condition: get(state, `${path}.equipment_state.${part}`),
        assigned: get(state, `${path}.equipped.${part}`) ? part : null}] : [];
    }) : Array.from(get(state, `${rolePath(state)}.equipment`)).flatMap((id, column) => id ? [{id, column}] : []);
  const carried = state => state.execution.equipmentDraft || inventory(state);
  const pairedActors = state => [
    ...SERVICE_ROLES.flatMap((role, id) => get(state, `role.${role}.present`) ? [{kind: 'role', id, position: id * 2}] : []),
    ...Array.from(get(state, 'entity_scene_object_slots') || []).slice(0, 4)
      .flatMap((id, index) => id < 11 ? [{kind: 'vehicle', id, position: index * 2 + 1}] : []),
  ].sort((a, b) => a.position - b.position);
  const mounts = state => SERVICE_PARTS.slice(0, 3).filter(part =>
    item(carried(state)[state.context.equipment_index]?.id)?.mountable_slots?.includes(part)
      && get(state, `${vehiclePath(state)}.mount_permission.${part}`));
  const list = (state, group) => {
    if (!isEquipment(state.node)) return null;
    if (state.execution.equipmentResponse) return [];
    if (roots.has(state.node) || state.node === shell) return pairedActors(state).filter(row => state.node !== shell || row.kind === 'vehicle');
    if (suffix(state) === 'transfer-target') return pairedActors(state)
      .filter(row => row.kind === state.context.kind).map(row => ({...row, position: row.kind === 'role' ? row.id : row.position}));
    if (suffix(state) === 'weapon-mount-select') return mounts(state).map((part, position) => ({part, position,
      label: ['主炮', '副炮', 'S-E'][SERVICE_PARTS.indexOf(part)]}));
    if (suffix(state).endsWith('-items') || suffix(state) === 'result') return carried(state).map((row, position) => ({...row,
      position: state.context.kind === 'role' ? row.column : position,
      label: `${item(row.id)?.label || `物品 ${row.id}`} · ${row.assigned || state.context.kind === 'role'
        && (get(state, `${rolePath(state)}.slot_flags`) & masks.descending_bit_masks[row.column]) ? '已装备' : '携带'}`}));
    return group?.choices.map(row => ({...row, position: row.index,
      label: choiceLabel?.(row.label_reference) || row.visible_text})) || [];
  };
  const select = (state, row) => {
    if (!isEquipment(state.node)) return;
    if (roots.has(state.node) || state.node === shell) {
      Object.assign(state.context, {kind: row.kind, [row.kind]: row.id, actor: `save-${row.kind}:${row.id}`});
      if (roots.has(state.node)) {
        state.node = row.kind === 'vehicle' ? `${VEHICLE}.parts` : `${HUMAN}.list`;
        state.control = state.node;
      }
    }
    if (suffix(state).endsWith('-items') || suffix(state) === 'result') state.context.equipment_index = state.context.kind === 'role' ? row.column : row.position;
  };
  const stats = (state, id = state.context.role) => {
    const path = rolePath(state, id);
    const values = Object.fromEntries(['strength', 'speed', 'vitality', 'equipment', 'slot_flags'].map(key => [key, get(state, `${path}.${key}`)]));
    const result = roleEquipmentStats(values, id => {
      const value = item(id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
      if (!Number.isInteger(value)) throw new TypeError('人物装备攻防数值未确认');
      return value;
    });
    for (const key of ['attack', 'defense']) put(state, `${path}.${key}`, result[key]);
  };
  const removeRole = (state, column) => {
    const path = rolePath(state), ids = [...get(state, `${path}.equipment`)];
    ids.splice(column, 1); ids.push(0);
    const flags = get(state, `${path}.slot_flags`), tail = masks.descending_equipment_masks[column];
    if (!Number.isInteger(tail)) return block(state, '人物装备移位掩码未确认');
    put(state, `${path}.equipment`, ids);
    put(state, `${path}.slot_flags`, ((flags << 1) & tail) | (flags & (tail ^ 255)));
    stats(state);
  };
  const writeVehicle = (state, rows, vehicle = state.context.vehicle, {repack = false} = {}) => {
    const slots = Array.from({length: 8}, () => null), pending = structuredClone(rows);
    if (repack) for (const part of SERVICE_PARTS.slice(0, 6)) {
      for (let index = pending.length - 1; index >= 0; index--) if (pending[index].assigned === part) {
        slots[SERVICE_PARTS.indexOf(part)] = pending[index]; pending[index] = {id: 0};
      }
    }
    for (const row of pending.filter(row => row.id)) {
      const column = repack ? slots.findIndex(row => !row) : row.column;
      if (column >= 0) slots[column] = row;
    }
    const path = vehiclePath(state, vehicle);
    let mask = 0;
    for (const [column, part] of SERVICE_PARTS.entries()) {
      const row = slots[column], equipped = Boolean(row?.id && row.assigned === part);
      if (equipped) mask |= masks.descending_bit_masks[column];
      put(state, `${path}.equipment.${part}`, row?.id || 0);
      put(state, `${path}.equipment_state.${part}`, row?.condition || 0);
      put(state, `${path}.equipped.${part}`, Number(equipped));
    }
    put(state, `${path}.equipped_mask_raw`, mask);
  };
  const feedback = (state, record, next, {commit = null} = {}) => {
    if (next === state.node && suffix(state) === 'equip-items') {
      state.execution.equipmentMessage = {record, column: carried(state)[state.selections.choice]?.column}; return;
    }
    state.execution.equipmentResponse = {record, next, commit, source: state.node,
      selection: structuredClone(state.selections)};
    state.pause = {kind: 'wait'};
  };
  const resetTo = (state, target, choice = 0) => {
    const actor = {kind: state.context.kind, id: state.context[state.context.kind]};
    delete state.execution.equipmentResponse;
    delete state.execution.equipmentMessage;
    delete state.execution.equipmentPending;
    enter(state, target, {push: false});
    const rows = entries(state);
    const index = roots.has(target) ? rows.findIndex(row => row.kind === actor.kind && row.id === actor.id) : choice;
    if (rows.length) selection(state, Math.max(0, Math.min(index, rows.length - 1)));
    if (roots.has(target)) state.returnStack = state.returnStack.filter(row => !isEquipment(row.node));
  };
  const prepare = state => {
    if (!isEquipment(state.node)) return;
    if (suffix(state) === 'equip-items' && state.context.kind === 'vehicle' && !state.execution.equipmentDraft)
      state.execution.equipmentDraft = structuredClone(inventory(state));
  };
  const advance = (state, input) => {
    if (!isEquipment(state.node) || !['a', 'b'].includes(input.type)) return false;
    const kind = suffix(state), chosen = entries(state)[state.selections.choice];
    const response = state.execution.equipmentResponse;
    if (response) {
      const pending = state.execution.equipmentPending;
      if (response.commit === 'drop') {
        if (state.context.kind === 'role') removeRole(state, pending.column);
        else writeVehicle(state, inventory(state).filter(row => row.column !== pending.column), undefined, {repack: true});
      }
      if (response.next === state.node) {
        delete state.execution.equipmentResponse; state.pause = {kind: 'menu'}; state.selections = response.selection;
      } else resetTo(state, response.next);
      return true;
    }
    if (state.node === shell || input.type === 'b' && roots.has(state.node)) {
      state.execution.status = 'returned'; state.windows = []; state.returnStack = []; return true;
    }
    if (input.type === 'b') {
      if (kind === 'equip-items' && state.context.kind === 'vehicle') {
        writeVehicle(state, carried(state), undefined, {repack: true}); delete state.execution.equipmentDraft;
        resetTo(state, `${VEHICLE}.action-select`);
      } else if (kind === 'action-select') {
        delete state.execution.equipmentDraft; resetTo(state, root(state));
      } else if (kind === 'drop-confirm') feedback(state, 'record:02:031', root(state));
      else if (kind === 'result') resetTo(state, `${HUMAN}.action-select`);
      else restore(state);
      return true;
    }
    if (roots.has(state.node)) {
      if (!chosen) return true;
      if (chosen.kind === 'vehicle' && chosen.id >= 8) feedback(state, 'record:02:144', root(state));
      else if (!inventory(state).length) feedback(state, 'record:02:017', root(state));
      else enter(state, `${owner(state)}.action-select`);
    } else if (kind === 'action-select') {
      if (chosen) enter(state, chosen.target_entry_id || chosen.target_state_id);
    } else if (['equip-items', 'result'].includes(kind) && chosen) {
      if (state.context.kind === 'role') {
        const path = rolePath(state), selected = item(chosen.id), flags = get(state, `${path}.slot_flags`);
        if (!selected?.equipment?.roles?.some(row => row.slug === SERVICE_ROLES[state.context.role])) feedback(state, 'record:02:112', state.node);
        else {
          let next = flags | masks.descending_bit_masks[chosen.column];
          for (const row of inventory(state)) if (flags & masks.descending_bit_masks[row.column]
              && item(row.id)?.category?.id === selected.category.id) next ^= masks.descending_bit_masks[row.column];
          put(state, `${path}.slot_flags`, next); stats(state);
          enter(state, `${HUMAN}.result`, {push: false});
          selection(state, entries(state).findIndex(row => row.column === chosen.column));
        }
      } else {
        const draft = state.execution.equipmentDraft, row = draft[state.selections.choice];
        if (item(row.id)?.category?.id === 'tank-chassis') feedback(state, 'record:02:107', state.node);
        else if (row.assigned) {
          row.assigned = null; feedback(state, row.id < 0x75 ? 'record:02:105' : 'record:02:108', state.node);
        } else if (row.id < 0x75) {
          if (!mounts(state).length) feedback(state, 'record:02:112', state.node);
          else enter(state, `${VEHICLE}.weapon-mount-select`);
        } else {
          const part = item(row.id)?.mountable_slots?.[0];
          if (!['c_unit', 'engine'].includes(part)) return block(state, '战车部件装备类别未确认'), true;
          for (const other of draft) if (other.assigned === part) other.assigned = null;
          row.assigned = part; feedback(state, 'record:02:106', state.node);
        }
      }
    } else if (kind === 'weapon-mount-select' && chosen) {
      for (const row of carried(state)) if (row.assigned === chosen.part) row.assigned = null;
      carried(state)[state.context.equipment_index].assigned = chosen.part;
      restore(state); feedback(state, 'record:02:106', state.node);
    } else if (['transfer-items', 'drop-items'].includes(kind) && chosen) {
      state.execution.equipmentPending = structuredClone(chosen);
      if (state.context.kind === 'vehicle' && item(chosen.id)?.category?.id === 'tank-chassis') feedback(state, 'record:02:080', root(state));
      else if (kind === 'drop-items' && item(chosen.id)?.price?.raw_code === 255) feedback(state, 'record:02:110', root(state));
      else enter(state, `${owner(state)}.${kind === 'transfer-items' ? 'transfer-target' : 'drop-confirm'}`);
    } else if (kind === 'transfer-target' && chosen) {
      const pending = state.execution.equipmentPending;
      if (state.context.kind === 'role') {
        const target = rolePath(state, chosen.id), ids = [...get(state, `${target}.equipment`)], count = ids.filter(Boolean).length;
        if (count - Number(chosen.id === state.context.role) === 8) feedback(state, 'record:02:099', root(state));
        else {
          removeRole(state, pending.column);
          const values = [...get(state, `${target}.equipment`)];
          values[values.filter(Boolean).length] = pending.id;
          put(state, `${target}.equipment`, values); stats(state, chosen.id);
          resetTo(state, root(state));
        }
      } else {
        const source = state.context.vehicle, target = vehiclePath(state, chosen.id);
        const rejection = chosen.id >= 8 ? 151 : chosen.id === source ? 152
          : get(state, `${target}.equipment.generic_8`) ? 153 : null;
        if (rejection) feedback(state, `record:02:${String(rejection).padStart(3, '0')}`, root(state));
        else {
          const column = SERVICE_PARTS.findIndex(part => !get(state, `${target}.equipment.${part}`));
          put(state, `${target}.equipment.${SERVICE_PARTS[column]}`, pending.id);
          put(state, `${target}.equipment_state.${SERVICE_PARTS[column]}`, pending.condition);
          put(state, `${target}.equipped.${SERVICE_PARTS[column]}`, 0);
          put(state, `${target}.equipped_mask_raw`, get(state, `${target}.equipped_mask_raw`) & ~masks.descending_bit_masks[column]);
          writeVehicle(state, inventory(state).filter(row => row.column !== pending.column), source, {repack: true});
          resetTo(state, root(state));
        }
      }
    } else if (kind === 'drop-confirm') {
      const yes = state.selections.choice === 0;
      feedback(state, yes ? 'record:02:111' : 'record:02:031', root(state), {commit: yes ? 'drop' : null});
    }
    return true;
  };
  return {evidence: FIELD_EQUIPMENT_EVIDENCE, owns: state => isEquipment(state.node), entries: list, selection: select,
    selectionCount: (state, group) => isEquipment(state.node)
      && ['carried-vehicle-equipment', 'eligible-weapon-mounts'].includes(group?.choice_source?.kind) ? entries(state).length : null,
    prepare, advance};
}

function fieldEquipmentPreview(preview, state) {
  if (!isEquipment(state.node)) return preview;
  const draft = state.execution.equipmentDraft;
  preview = {...preview, layers: preview.layers.map(layer => ({...layer,
    ...(draft && Array.isArray(layer.save_equipment?.items)
      ? {preview_equipment_assignments: draft.map(row => row.assigned == null ? null : SERVICE_PARTS.indexOf(row.assigned))} : {}),
    ...(layer.vehicle_mount_candidates ? {vehicle_mount_candidates: {...layer.vehicle_mount_candidates,
      vehicle: state.context.vehicle, ...(draft ? {assignments: draft.map(row => ({id: row.id, part: row.assigned}))} : {})}} : {}),
  }))};
  const response = state.execution.equipmentResponse;
  const message = response || state.execution.equipmentMessage;
  if (!message) return preview;
  const pending = response ? state.execution.equipmentPending : message;
  const body = preview.layers.findLast(layer => layer.kind === 'script');
  return {...preview, ...(response ? {selection_cursor: null} : {}), layers: preview.layers.map(layer => layer === body
    ? {...layer, record: message.record, cursor: 654, line_origin: 14, dialogue_runtime: true,
      save_party_names: null, inline_confirm: false, human_equipment_result: null,
      ...(pending ? {runtime_save_item: {field_id: state.context.kind === 'role'
        ? `save.slot.${state.context.slot}.role.${SERVICE_ROLES[state.context.role]}.equipment`
        : undefined, ...(state.context.kind === 'vehicle' ? {field_ids: SERVICE_PARTS.map(part =>
          `save.slot.${state.context.slot}.vehicle.${state.context.vehicle}.equipment.${part}`)} : {}),
        index: pending.column, index_context: null}} : {})} : layer)};
}

// @editor-module 概览滚动与金铃数字按原生输入协议推进隔离字段。

const FIELD_MENU_DETAILS_EVIDENCE = 'project/evidence/reverse-engineering/field-menu-details/observations.json';
const GOLD = 'field-command-menu.gold-amount';
const BOX = 'vehicle-status.overview-box', DAMAGE = 'vehicle-status.overview-damage';

function fieldMenuDetails({get, block, restore}) {
  const put = (state, suffix, value) => {
    const field = `save.slot.${state.context.slot}.${suffix}`, before = state.fields[field];
    if (before === undefined) throw new TypeError(`预览缺少字段：${field}`);
    state.fields[field] = value;
    state.execution.trace.push({effect: 'field-menu-detail', field, before, after: value, evidence: FIELD_MENU_DETAILS_EVIDENCE});
  };
  const adventure = state => {
    restore(state, 'field-command-menu.adventure-data');
    state.selections = {choice: 0, position: 0};
  };
  const stored = state => storagePreviewEntries({object: id => ({value: state.fields[id]})}, state.context.slot, {sorted: true});
  const rows = state => {
    if (state.node === BOX) return stored(state).filter(row => row.id).map(row => ({label: `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`}));
    if (state.node !== DAMAGE) return null;
    return Array.from({length: 8}, (_, vehicle) => {
      const damaged = SERVICE_PARTS.filter(part => get(state, `vehicle.${vehicle}.equipment_state.${part}`) & 0xC0);
      return damaged.length ? [{label: `战车 ${vehicle + 1}`}, ...damaged.map(part => ({label: part}))] : [];
    }).flat();
  };
  const entries = state => {
    const list = rows(state);
    return list?.slice(state.context.first_row ?? 0, (state.context.first_row ?? 0) + 8)
      .map((row, position) => ({...row, position}));
  };
  const prepare = state => {
    if (state.node === GOLD) {
      state.execution.goldDigits = String(get(state, 'gold_bell_threshold')).padStart(7, '0').split('').map(Number);
      delete state.execution.goldResult;
    }
    if ([BOX, DAMAGE].includes(state.node)) {
      state.context.first_row = 0;
      state.execution.overviewScrollGate = false;
    }
    if (state.node === BOX) {
      const list = stored(state);
      list.forEach((row, index) => {
        put(state, `property_storage.item.${index}`, row.id);
        put(state, `property_storage.paired_condition.${index}`, row.condition);
      });
      if (list.every(row => row.id)) block(state, 'G2：满 64 槽首零扫描的数组外字段仍未确认');
    }
  };
  const advance = (state, input) => {
    if (state.node === GOLD) {
      if (state.execution.goldResult) {
        if (['a', 'b'].includes(input.type)) {delete state.execution.goldResult; adventure(state);}
        return true;
      }
      if (input.type === 'b') {adventure(state); return true;}
      if (input.type === 'a') {
        put(state, 'adventure_data_settings', get(state, 'adventure_data_settings') | 0x80);
        put(state, 'gold_bell_threshold', Number(state.execution.goldDigits.join('')));
        state.execution.goldResult = true;
        for (const window of state.windows) {
          if (!window.content.some(layer => layer.gold_bell_digits)) continue;
          window.content = fieldMenuDetailsPreview({layers: window.content}, state).layers;
          window.retention = 'replaced';
        }
        return true;
      }
      if (['up', 'down'].includes(input.type)) {
        const digit = state.selections.position;
        state.execution.goldDigits[digit] = (state.execution.goldDigits[digit] + (input.type === 'up' ? 1 : 9)) % 10;
        return true;
      }
      return false;
    }
    const list = rows(state);
    if (!list) return false;
    if (input.type === 'a') {
      if (state.node === BOX) block(state, '后备箱 A 切换损坏设备处理器；共享列表的重画解释未接入');
      return true;
    }
    if (!['up', 'down', 'left', 'right'].includes(input.type)) return false;
    let first = state.context.first_row ?? 0, position = state.selections.position;
    const scroll = step => {
      if (state.execution.overviewScrollGate) state.execution.overviewScrollGate = false;
      else {first += step; state.execution.overviewScrollGate = true;}
    };
    if (input.type === 'up') {
      if (position) {position--; state.execution.overviewScrollGate = false;}
      else if (first) scroll(-1);
    }
    if (input.type === 'down') {
      if (position < (list.length ? Math.min(7, list.length - 1) : 7)) {
        position++; state.execution.overviewScrollGate = false;
      } else if (first + 8 < list.length) scroll(1);
    }
    state.context.first_row = first;
    state.selections = {choice: position, position};
    return true;
  };
  return {entries, prepare, advance};
}

function fieldMenuDetailsPreview(preview, state) {
  if (state.execution.partDetail) return {...preview, selection_cursor: null,
    layers: [...preview.layers, {kind: 'vehicle_part_detail_clear'},
      {kind: 'layout', vehicle_part_detail_frame: true},
      {kind: 'script', cursor: 0, glyph_pixel_y_offset: -4,
        vehicle_part_detail: true}]};
  if (state.node !== GOLD || !state.execution.goldDigits) return preview;
  if (!state.execution.goldResult) return {...preview, layers: preview.layers.map(layer => layer.gold_bell_digits
    ? {...layer, gold_bell_digit_values: [...state.execution.goldDigits]} : layer)};
  return {...preview, selection_cursor: null, layers: preview.layers.map(layer => layer.gold_bell_digits
    ? {kind: 'script', record: layer.record, gold_bell_result: true, cursor: layer.cursor, line_origin: layer.line_origin,
      glyph_pixel_y_offset: layer.glyph_pixel_y_offset, dialogue_runtime: true,
      provider_save_values: {14: `save.slot.${state.context.slot}.gold_bell_threshold`}}
    : layer)};
}

// @editor-module 行走菜单按确认的分派和选择协议推进隔离快照。


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

function fieldMenuStateGraph(dispatch, catalog, commandDocument = null) {
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
    add(node.id, node.id, box ? 'A' : 'A · 保留当前页',
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
  for (const node of unique.values()) if (node.boundary) add(node.id, MAIN, '调用返回', {kind: 'domain-return'}, true);
  return {nodes: [...unique.values()], entry: MAIN, transitions: routes,
    edges: routes.map(row => ({...row, routes: [row], condition: row.unknown ? '此调用效果未确认' : row.operation.condition || ''}))};
}

function fieldMenuExecution({graph, dispatch, navigation, commandDocument, equipment, humanItems = null}) {
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

function fieldMenuExecutionPreview(preview, state) {
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

// @editor-module 战斗选择只更新隔离现场，行动与结果交接既有战斗组件。

const BATTLE_COMMAND = 'battle-command-target.command';
const BATTLE_AUXILIARY = 'battle-party-status.auxiliary';
const BATTLE_RESPONSE = 'battle-party-status.command-response';
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

function battleCommandGraph(catalog) {
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

function battleCommandExecution({graph, items, targetItems, groups, calls, navigation, equipmentEffects = []}) {
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

// @editor-module 文本字段对象将当前正文的确认位置与选择后继投影给对话适配器。

function textDialogueProgram(document, encoding, reference) {
  const pauses = [];
  const visit = (recordId, ancestors = []) => {
    if (ancestors.includes(recordId)) {
      pauses.push({kind: 'unknown', record: recordId, reason: '正文引用循环'}); return;
    }
    const record = textRecord(document, recordId);
    if (!record) {pauses.push({kind: 'unknown', record: recordId, reason: '正文记录缺失'}); return;}
    for (const command of decodeFixedTextRecord(record, encoding).commands) {
      const token = command.token, offset = command.offset;
      if (token === 0xE3 || token === 0xEB) {
        pauses.push({kind: 'choice', record: recordId, offset, branch: token === 0xEB}); return;
      }
      if (token === 0xE4 || [0xFE, 0xF0].includes(token) && command.repeat_role !== 'delimiter')
        pauses.push({kind: 'wait', record: recordId, offset});
      if ([0xF5, 0xE6, 0xF4].includes(token)) {
        pauses.push({kind: 'unknown', record: recordId, offset,
          reason: '正文动作或重复调用须交接所属执行器'}); return;
      }
      const region = ({[0xF2]: 0x09, [0xF3]: 0x11, [0xEA]: 0x13, [0xEC]: 0x14})[token];
      if (region !== undefined || token === 0xF7) {
        visit(textRecordNodeId(region ?? command.operands[1], command.operands[0]), [...ancestors, recordId]);
        if (['choice', 'unknown'].includes(pauses.at(-1)?.kind)) return;
      }
    }
  };
  visit(reference);
  if (!['choice', 'unknown'].includes(pauses.at(-1)?.kind)) pauses.push({kind: 'wait', record: reference, terminal: true});
  return pauses.map((pause, ordinal) => ({...pause, ordinal,
    confirmedWaits: pauses.slice(0, ordinal).filter(row => row.kind === 'wait').length,
    evidence: `${pause.record}${pause.offset === undefined ? '/return-confirmation' : `/bytes:${pause.offset}`}`}));
}

function textDialogueSuccessor(document, encoding, pause, value) {
  const record = textRecord(document, pause.record);
  if (![0, 1].includes(value)) throw new TypeError('对话选择超出当前输入域');
  const id = record.bytes[pause.offset + 1 + value];
  if (!Number.isInteger(id)) throw new TypeError('对话选择后继未确认');
  return id === 0xFF ? null : textRecordNodeId(record.region_id, id);
}

// @editor-module 普通交互沿正文暂停推进；剧情及战斗保留领域调用边界。

const DIALOGUE_STATE_EVIDENCE = 'project/evidence/reverse-engineering/dialogue-state-input/observations.json';
const region = {id: 'dialogue', label: '对话', bounds: {x: 0, y: 144, width: 256, height: 96},
  visible: true, cursor: false, layer: 0, retention: '本次交互的正文窗口'};

function dialogueStateModel(entry, {text, encoding, semantics = []}) {
  const declarations = new Map(semantics.map(row => [row.opcode, row]));
  const commands = new Map((entry.script?.commands || []).map(command => [command.cursor, command]));
  const programs = new Map();
  const program = record => {
    if (!programs.has(record)) programs.set(record, textDialogueProgram(text, encoding, record));
    return programs.get(record);
  };
  const operation = command => STORY_DIALOGUE_OPERATIONS[command.opcode] || declarations.get(command.opcode);
  const normal = command => command.edges.find(edge => edge.kind === 'normal')?.target_cursor;
  const initial = entry.unsupported ? {boundary: 'unknown', cursor: null, reason: '该交互须交接所属领域'}
    : entry.record ? {record: entry.record, ordinal: 0, cursor: null} : {cursor: 0};
  const commandLocation = location => {
    if (location.record || location.boundary) return location;
    const command = commands.get(location.cursor);
    if (!command) return {...location, boundary: 'unknown', reason: '交互控制位置未确认'};
    const declaration = operation(command);
    if (declaration?.operation === 'start-blocking-dialogue' || declaration?.operation === 'start-blocking-ui-action'
        || declaration?.operation === 'dispatch-interaction-service' && command.operands[0] < 0x10) {
      const id = declaration.region_id ?? command.operands[0];
      return {...location, record: `record:${id.toString(16).toUpperCase().padStart(2, '0')}:${String(
        command.operands[declaration.record_operand_index]).padStart(3, '0')}`, ordinal: 0};
    }
    if (command.opcode === 0x37) return {...location, boundary: 'battle', command};
    if (command.opcode === 0 || [6, 9].includes(command.opcode)) return location;
    return {...location, boundary: 'story', command, reason: '交接剧情或服务领域'};
  };
  const node = location => {
    if (location.boundary) return {id: `${entry.id}:call:${location.cursor}`, label: location.boundary === 'battle'
      ? '遭遇调用' : location.boundary === 'story' ? '领域交接' : '边界', location,
      ...(location.boundary === 'battle' ? {referenceTarget: {pageId: 'battle-command-target',
        nodeId: 'battle-command-target.command', label: '战斗命令与目标选择'}}
        : location.boundary === 'story' && operation(location.command)?.operation === 'dispatch-interaction-service'
          ? {referenceTarget: {commandId: location.command.operands[0], argument: location.command.operands[1]}} : {}),
      pause: {kind: location.boundary, evidence: DIALOGUE_STATE_EVIDENCE},
      input: location.reason || '等待战斗完成结果', publishedPreview: location.cursor === null ? entry.preview : null,
      regions: location.cursor === null && entry.preview ? [region] : []};
    if (!location.record) return null;
    const pause = program(location.record)[location.ordinal];
    if (!pause) return null;
    return {id: `${entry.id}:${location.cursor ?? 'direct'}:${location.record}:${pause.ordinal}`,
      label: `${pause.kind === 'choice' ? '选择' : pause.kind === 'unknown' ? '正文' : '对话'} · ${location.record} · ${pause.ordinal + 1}`,
      location, record: location.record, pause,
      input: pause.kind === 'choice' ? '← 是；→ 否；A 确定；B 否' : 'A / B 继续',
      regions: [{...region, cursor: pause.kind === 'choice', source: location.record}]};
  };
  const successors = location => {
    if (location.boundary) return [];
    if (location.record) {
      const pause = program(location.record)[location.ordinal];
      if (pause?.kind === 'unknown') return [];
      if (pause?.kind === 'choice') return [0, 1].map(value => {
        const record = pause.branch ? textDialogueSuccessor(text, encoding, pause, value) : null;
        return {location: record ? {...location, record, ordinal: 0}
          : location.cursor === null ? null : {cursor: normal(commands.get(location.cursor))},
          input: value ? '否 / B' : '是 / A', value};
      });
      if (program(location.record)[location.ordinal + 1]) return [{location: {...location, ordinal: location.ordinal + 1}, input: 'A / B 继续'}];
      return [{location: location.cursor === null ? null : {cursor: normal(commands.get(location.cursor))}}];
    }
    const command = commands.get(location.cursor);
    if (command.opcode === 0) return [{location: null}];
    return command.edges.map(edge => ({location: {cursor: edge.target_cursor}, edge,
      condition: command.opcode === 9 ? '当前选择值' : '当前事件位', command}));
  };
  const graph = foldInterfaceStateGraph({entry: initial, evidence: DIALOGUE_STATE_EVIDENCE,
    enter: commandLocation, positionKey: location => JSON.stringify(location), setup: () => [],
    pause: location => location.resumed ? null : node(location),
    branches: location => successors(location).map(next => ({...next,
      location: next.location && Object.fromEntries(Object.entries(next.location).filter(([key]) => key !== 'resumed')),
      exit: next.location === null,
      declarations: next.condition ? [{label: next.condition, confirmed: true,
        reads: [next.condition], writes: [], evidence: DIALOGUE_STATE_EVIDENCE}] : [],
      effects: next.value === undefined ? [] : [{field: 'choice', value: next.value}]})),
    resume: current => ({location: {...current.location, resumed: true}, controls: [current.location.cursor], input: null}),
  });
  for (const call of graph.nodes.filter(row => row.pause.kind === 'battle')) {
    for (const outcome of ['victory', 'defeat']) {
      const id = `${call.id}:${outcome}`;
      graph.nodes.push({id, label: outcome === 'victory' ? '胜利返回' : '败北恢复',
        pause: {kind: 'result', evidence: DIALOGUE_STATE_EVIDENCE}, input: '等待所属战斗组件的已确认完成结果', regions: []});
      const edge = {id: `${call.id}>${id}`, from: call.id, to: id, input: outcome === 'victory' ? '胜利' : '败北',
        condition: '战斗语义完成结果', evidence: DIALOGUE_STATE_EVIDENCE,
        routes: [{controls: [call.location.cursor], declarations: []}]};
      graph.edges.push(edge); graph.transitions.push({...edge, executable: true});
    }
  }
  if (entry.caller?.kind === 'field-command-menu' || entry.id === 'field-dialogue') {
    const id = 'reference:field-command-menu.main';
    graph.nodes.push({id, label: '主菜单', pause: {kind: 'call'}, navigationOnly: true,
      referenceTarget: {pageId: 'non-battle-main-menu', nodeId: 'field-command-menu.main', label: '主菜单'}, regions: []});
  }
  return {entry, initial, graph, program, node, commandLocation, commands, normal, successors, operation};
}

function dialogueStateExecution(model, {text, encoding}) {
  const returned = (state, destination = 'caller') => {
    const caller = state.returnStack.pop();
    state.execution.status = 'returned'; state.pause = null; state.windows = [];
    state.domainResults.return = {destination, caller};
    return state;
  };
  const settle = state => {
    const seen = new Set();
    while (state.execution.status === 'running') {
      let location = model.commandLocation(state.control);
      const signature = JSON.stringify(location);
      if (seen.has(signature)) {state.execution.status = 'unknown'; state.execution.reason = '交互没有有进展的续接'; break;}
      seen.add(signature); state.control = location;
      const current = model.node(location);
      if (current) {
        state.node = current.id; state.pause = current.pause;
        state.execution.status = ['unknown', 'story', 'battle'].includes(current.pause.kind) ? current.pause.kind : 'waiting';
        state.execution.reason = current.pause.reason || location.reason || '';
        state.selections.choice = 0;
        state.windows = current.record ? [{id: 'dialogue', record: current.record,
          confirmedWaits: current.pause.confirmedWaits, choice: 0}] : [];
        if (location.boundary === 'battle') {
          const [formationId, pendingEventFlag, targetStoryState] = location.command.operands;
          state.domainResults.battleCall = {node: current.id, formationId, pendingEventFlag, targetStoryState,
            caller: structuredClone(state.returnStack.at(-1)), scene: structuredClone(state.context)};
        }
        return state;
      }
      const command = model.commands.get(location.cursor);
      if (command.opcode === 0) return returned(state);
      let advance;
      try {
        advance = executeSceneActionLocalHandler({commandBytes: command.raw_window, semantic: model.operation(command)}, {
          read: field => {
            if (field === 'parameter.result') return state.fields.choice;
            const match = /^save\.active\.global_event_flag\.([0-9A-F]{2})$/u.exec(field);
            if (match && Array.isArray(state.fields.eventFlags)) return Number(state.fields.eventFlags.includes(parseInt(match[1], 16)));
            throw new TypeError(`交互字段未确认：${field}`);
          }, actor: state.context.caller?.object,
          write: (field, value) => {
            if (!['scratch.savedX', 'scratch.savedY'].includes(field)) throw new TypeError(`交互写入未确认：${field}`);
            state.fields[field] = value;
          },
        });
      } catch (error) {state.execution.status = 'unknown'; state.execution.reason = error.message; return state;}
      const edge = command.edges.find(row => row.target_cursor === command.cursor + advance);
      if (!edge) {state.execution.status = 'unknown'; state.execution.reason = '分支续接未确认'; return state;}
      state.execution.trace.push({cursor: command.cursor, advance, target: edge.target_cursor, evidence: DIALOGUE_STATE_EVIDENCE});
      state.control = {cursor: edge.target_cursor};
    }
    return state;
  };
  return {
    initial({context, fields = {}} = {}) {
      return settle(interfacePreviewState({context, fields: {choice: 0, ...fields},
        entry: model.graph.entry, control: model.initial,
        returnStack: [{...model.entry.caller, entry: model.entry.id}], execution: {status: 'running', trace: []}}));
    },
    advance(state, input) {
      if (input.type === 'battle-result') {
        if (state.execution.status !== 'battle') return state;
        state.domainResults.battleResult = structuredClone(input.result);
        if (!applyBattleResultEffects(state, input.result)) {
          state.execution.status = 'unknown'; state.execution.reason = '战斗完成效果未确认'; return state;
        }
        state.node = `${state.node}:${input.result.outcome}`;
        return returned(state, 'scene');
      }
      if (state.execution.status !== 'waiting') return state;
      if (['left', 'right', 'option'].includes(input.type) && state.pause.kind === 'choice') {
        const value = input.type === 'option' ? input.index : input.type === 'right' ? 1 : 0;
        if (![0, 1].includes(value)) throw new RangeError('对话选择超出当前输入域');
        state.selections.choice = value; state.windows[0].choice = value; return state;
      }
      if (!['a', 'b'].includes(input.type)) return state;
      const location = state.control, pause = state.pause;
      state.execution.trace.push({node: state.node, input: input.type, evidence: pause.evidence});
      if (pause.kind === 'choice') {
        const value = input.type === 'b' ? 1 : state.selections.choice;
        state.fields.choice = value;
        const record = pause.branch ? textDialogueSuccessor(text, encoding, pause, value) : null;
        if (record) state.control = {...location, record, ordinal: 0};
        else if (location.cursor === null) return returned(state);
        else state.control = {cursor: model.normal(model.commands.get(location.cursor))};
      } else if (model.program(location.record)[location.ordinal + 1]) state.control = {...location, ordinal: location.ordinal + 1};
      else if (location.cursor === null) return returned(state);
      else state.control = {cursor: model.normal(model.commands.get(location.cursor))};
      state.execution.status = 'running'; return settle(state);
    },
  };
}

// @editor-module 文档按领域语义生成只读状态图，物理声明不进入文档。

const clone = value => JSON.parse(JSON.stringify(value));
const recordId = handle => `record:06:${String(Number.parseInt(handle.slice(-3), 16)).padStart(3, '0')}`;

function applicationDocumentGraph(program, originalGraph, command, previews) {
  const nodes = program.segments.map(segment => {
    const index = Number.parseInt(segment.id.split(':').at(-1), 16);
    const original = originalGraph.nodes.find(node => node.segment?.index === index);
    const source = original && genericShopPreview(original, command, previews)?.preview
      || previews.find(row => row.id === 'constructor:field-dialogue-no-target');
    const text = segment.instructions.find(instruction => instruction.kind === 'text');
    const preview = source && clone(source);
    if (preview && text) for (const layer of preview.layers.filter(layer => layer.shop_welcome))
      layer.record = recordId(text.record);
    if (preview && !original) {
      const body = preview.layers.findLast(layer => layer.kind === 'script');
      const choice = segment.instructions.find(instruction => instruction.opcode === 0xD4);
      if (body && (text || choice)) body.record = text ? recordId(text.record)
        : `record:02:${String(choice.operands[0].value).padStart(3, '0')}`;
    }
    return {id: segment.id, label: original?.label || `段 ${index.toString(16).toUpperCase().padStart(2, '0')}`,
      segment, publishedPreview: preview, record: text && recordId(text.record),
      regions: original?.regions || [], pause: original?.pause || {kind: 'view'}};
  });
  const edges = [];
  for (const segment of program.segments) for (const [index, instruction] of segment.instructions.entries()) {
    const targets = instruction.kind === 'indexed-branches' ? instruction.targets
      : (instruction.operands || []).filter(operand => ['segment', 'end'].includes(operand.kind));
    for (const [branch, target] of targets.entries())
      edges.push({id: `${segment.id}:${index}:${branch}`, from: segment.id,
        to: target.kind === 'segment' ? target.target : null, input: `去向 ${branch + 1}`,
        condition: '', routes: [], unknown: false});
    if (instruction.opcode === 0xFE) edges.push({id: `${segment.id}:return`, from: segment.id,
      to: null, input: '返回', condition: '', routes: [], unknown: false});
  }
  return {nodes, edges, transitions: edges, entry: nodes[0]?.id};
}

async function openInterfaceStateDocumentSource(document, database, selected, {encoding, previewForNode} = {}) {
  if (!document.source && !document.program) return null;
  const descriptors = await database.interfaceStateDocumentSources();
  const descriptor = descriptors.find(source => source.identity.id === document.source?.id)
    || {identity: {id: document.source?.id || 'application:new', domain: 'shop', key: 'application-program'}};
  const entry = document.source?.entry || {pageId: null, commandId: null, sequenceId: null};
  const domain = document.source?.domain || 'shop';
  const read = async resourceId => {
    const value = clone(await database.getResourceDocument(resourceId));
    for (const row of document.fields.filter(field => field.resourceId === resourceId)) {
      const field = await database.getField(resourceId, row.handle, row.field);
      const parent = field.documentPath.slice(0, -1).reduce((node, key) => node[key], value);
      parent[field.documentPath.at(-1)] = clone(row.value);
    }
    return value;
  };
  const [dispatch, catalog, text] = await Promise.all([
    database.getDocument('project.ui.dispatch'), database.getDocument('project.ui.interfaces'), read('text-record'),
  ]);
  const previews = dispatch.previews;
  let graph, command = null;
  if (document.program && (entry.commandId === null || entry.commandId >= 0x39)) {
    graph = applicationDocumentGraph(document.program, {nodes: []}, null, previews);
  } else if (entry.commandId !== null && !['system'].includes(domain)) {
    command = await read(`application-command:${entry.commandId.toString(16).toUpperCase().padStart(2, '0')}`);
    graph = domain === 'machine' ? machineServiceGraph(command, text, previews, catalog, {argument: 0})
      : genericShopGraph(command, text, previews, catalog.application_branch_sources, {catalog, invocation: {argument: 0}});
    if (document.program) graph = applicationDocumentGraph(document.program, graph, command, previews);
  } else if (domain === 'menu') {
    const complete = addHumanItemsStateGraph(fieldMenuStateGraph(dispatch, catalog, await read('code-module')), dispatch, catalog);
    graph = interfaceStatePageGraph(complete, entry.pageId || descriptor.identity.key, {
      parent: entry.pageId === 'non-battle-main-menu' ? null : complete.nodes.find(node => node.id === complete.entry),
      pageLabel: id => interfaceStateSources().find(source => source.entries.some(row => row.pageId === id))?.label || id});
  } else if (domain === 'system') graph = systemStateGraph(descriptor.identity.key, previews);
  else if (domain === 'battle' && descriptor.identity.key === 'battle-command')
    graph = battleCommandGraph(catalog);
  else if (domain === 'battle' && descriptor.identity.key === 'battle-results')
    graph = battleResultGraph(previews);
  else if (domain === 'dialogue') {
    const preview = previews.find(row => row.id === 'constructor:field-dialogue-no-target');
    const record = preview?.layers?.findLast(layer => layer.kind === 'script')?.record;
    graph = dialogueStateModel({id: 'field-dialogue', record, preview},
      {text, encoding}).graph;
    for (const node of graph.nodes) if (!node.publishedPreview) node.publishedPreview = preview;
  } else if (domain === 'story') {
    const story = await database.getDocument('project.story');
    const sequence = story.browser_vm.sequences.find(row => row.id === entry.sequenceId);
    const interaction = sequence?.interaction_trigger;
    const id = interaction?.interaction_script_id ?? interaction?.script_id;
    const scripts = id == null ? null : await read('story-interaction-script');
    const script = scripts && projectStoryScriptPrograms(scripts, story.browser_vm.programs)
      .find(row => row.kind === 'interaction' && row.id === id);
    graph = dialogueStateModel({id: descriptor.identity.id, script, unsupported: !script},
      {text, encoding,
        semantics: story.browser_vm.opcode_semantics}).graph;
  } else graph = descriptor.open({previews, selection: () => selected}).graph();
  for (const node of graph.nodes) {
    node.regions ||= [];
    node.publishedPreview ||= node.preview || previews.find(preview => node.stateId
      && preview.interface_state_id === node.stateId || node.previewId && preview.id === node.previewId)
      || previewForNode?.(node);
  }
  if (!graph.nodes.some(node => node.id === selected.node)) selected.node = graph.nodes.find(node => node.publishedPreview)?.id
    || graph.entry || graph.nodes[0]?.id;
  const preview = () => {
    const node = graph.nodes.find(row => row.id === selected.node);
    if (node?.publishedPreview) return node.publishedPreview;
    return command ? genericShopPreview(node, command, previews)?.preview : null;
  };
  const source = createInterfaceStateSource({identity: descriptor.identity, command, pageId: entry.pageId || descriptor.identity.id,
    graph: () => graph, selection: () => selected, entry, execution: {preview},
    capabilities: {structure: Boolean(document.program), apply: true, export: true},
    references: () => document.fields.map(row => ({...row}))});
  source.textDocument = text;
  return source;
}

// @editor-module 状态机页面组织文档、领域来源与公共工作台。

const namespace = 'state-document';
const domains = {shop: '应用与服务', machine: '机器', menu: '菜单', dialogue: '对话',
  system: '系统', battle: '战斗', story: '剧情', published: '已登记界面'};
let model;

function selection() {
  if (state.genericShopPrototype?.repository !== state.projectRepository)
    state.genericShopPrototype = {repository: state.projectRepository, documentId: null,
      node: null, widget: 'screen', edge: null, path: '', fullGraph: false, zoom: 'fit', undo: []};
  return state.genericShopPrototype;
}

async function renderGenericShop() {
  const selected = selection();
  const [documents, sources, document] = await Promise.all([
    db.listInterfaceStateDocuments(), db.interfaceStateDocumentSources(),
    selected.documentId ? db.getInterfaceStateDocument(selected.documentId) : blankInterfaceStateDocument(),
  ]);
  const source = await openInterfaceStateDocumentSource(document, db, selected, sourceOptions());
  const workbench = source && createInterfaceStateControllerWorkbench({source, selection,
    presentation: {namespace: 'generic-shop', dataPrefix: 'state-document',
      count: `${source.graph().nodes.length} 个节点`, notice: '', exitLabel: '返回调用者'}});
  const widgets = [{id: 'screen', label: document.title, depth: 0},
    ...(source?.graph().nodes || []).map(node => ({id: node.id, label: node.label, depth: 1})),
    ...document.fields.map(row => ({id: interfaceStateFieldKey(row), label: row.field, depth: 1}))];
  const preview = source?.execution.preview();
  model = {document, source, workbench, widgets, preview};
  return screenWorkbench({namespace, className: 'generic-shop-workbench', heightMode: 'fill',
    bottomSize: 'resizable', bottomFit: true,
    toolbarMarkup: `<div class="screen-workbench-stage-toolbar">
      <select data-state-document-select aria-label="状态机文档"><option value="">空文档</option>
        ${documents.map(row => `<option value="${esc(row.id)}"${row.id === selected.documentId ? ' selected' : ''}>${esc(row.title)}</option>`).join('')}</select>
      </div>`,
    treeTitle: '组件树', treeMarkup: elementTree({nodes: widgets, selectedId: selected.widget, showIcons: false,
      buttonAttributes: row => ({'data-state-document-widget': row.id})}),
    stageMarkup: preview ? screenWorkbenchCanvasStage({namespace, sizing: 'fill',
      canvasMarkup: '<canvas width="256" height="240" data-state-document-canvas aria-label="状态机画面"></canvas>'}) : '',
    inspectorTitle: '详情', inspectorMarkup: `<div class="screen-workbench-inspector-body state-document-tools">
      <button class="button" data-state-document-new>新建</button>
      <span>新建类别</span>${referencePickerMarkup({moduleId: 'interface-state-document', label: '新建类别', compact: true, previewPanel: false,
        value: selected.templateId || 'blank', componentAttributes: 'data-state-template-picker',
        items: db.interfaceStateDocumentTemplates().map(template => ({value: template.id, label: template.label,
          description: template.reason ? '' : template.description,
          filter: [template.label, template.reason || template.description].filter(Boolean).join(' '),
          disabled: Boolean(template.reason)}))})}
      <button class="button" data-state-program-new>新建应用程序</button>
      ${document.program ? '<button class="button" data-state-program-copy>另存为新程序</button>' : ''}
      <span>导入来源</span>${referencePickerMarkup({moduleId: 'interface-state-document', label: '导入来源', compact: true,
        value: '', componentAttributes: 'data-state-source-picker', items: sources.map(source => ({value: source.identity.id, label: source.label,
          group: source.identity.domain, groupLabel: domains[source.identity.domain]}))})}
      <button class="button" data-state-document-import>导入文件</button>
      <button class="button" data-state-document-export>导出文件</button>
      <input type="file" accept=".json,application/json" data-state-document-file hidden>
      <span data-state-document-status role="alert"></span></div><div data-state-document-inspector></div>`,
    stageToolbarMarkup: `<span data-state-document-position>${esc(document.source?.id
      || (document.program ? '新应用程序' : ''))}</span>`,
    bottomMarkup: workbench ? workbench.graphMarkup() : '',
  });
}

async function captureSourceFields(id, source) {
  const references = new Map();
  const add = (resourceId, handle, field) => {
    const row = {resourceId, handle, field};
    references.set(interfaceStateFieldKey(row), row);
  };
  const records = new Set();
  for (const node of source.graph().nodes) {
    if (node.record) records.add(node.record);
    for (const action of node.segment?.actions || []) if (action.record) records.add(action.record);
    const preview = node.publishedPreview || node.preview;
    for (const field of preview?.field_sources || [])
      if (typeof field.reference === 'string' && field.reference.startsWith('record:')) records.add(field.reference);
    for (const layer of preview?.layers || []) if (layer.record?.startsWith('record:')) records.add(layer.record);
  }
  const document = await db.getInterfaceStateDocument(id);
  for (const instruction of document.program?.segments.flatMap(row => row.instructions) || [])
    if (instruction.kind === 'text') records.add(`record:06:${String(Number.parseInt(instruction.record.slice(-3), 16)).padStart(3, '0')}`);
  const texts = await db.getResourceDocument('text-record');
  for (const record of records) {
    const text = texts.records[record];
    if (text?.editable) add('text-record', record, 'bytes');
  }
  await db.captureInterfaceStateFields(id, [...references.values()]);
}

function sourceOptions() {
  return {encoding: state.project.text_record_encoding, previewForNode: node => {
    const screen = state.project.ui.editor.screens.find(screen => node.stateId
      && screen.interface_state_id === node.stateId);
    return screen && uiEditorPreviewDraft(screen.id);
  }};
}

async function bindGenericShop(root, {rerender}) {
  root = root.querySelector(`[data-screen-workbench="${namespace}"]`);
  if (!root) return;
  const selected = selection(), {document, source, workbench, preview} = model;
  const report = failure => {if (root.isConnected) root.querySelector('[data-state-document-status]').textContent = failure.message;};
  const run = operation => {
    root.querySelector('[data-state-document-status]').textContent = '';
    void (async () => {await flushAllAutoSaves(); await operation();})().catch(report);
  };
  const remember = () => {selected.undo.push(structuredClone(model.document));};
  const ensureDocument = async () => selected.documentId ||= await db.createInterfaceStateDocument();
  root.querySelector('[data-state-document-new]').addEventListener('click', () => run(async () => {
    selected.documentId = await db.createInterfaceStateDocument();
    Object.assign(selected, {node: null, widget: 'screen', undo: []}); await rerender();
  }));
  bindReferencePicker(root.querySelector('[data-state-template-picker]'), {onSelect: value => {
    selected.templateId = value;
  }});
  const newProgram = async fromId => {
    const templateId = fromId ? 'blank' : selected.templateId || 'blank';
    selected.documentId = await db.createInterfaceStateApplicationProgram(fromId, templateId);
    Object.assign(selected, {node: null, widget: 'screen', undo: []});
    const opened = await openInterfaceStateDocumentSource(await db.getInterfaceStateDocument(selected.documentId),
      db, selected, sourceOptions());
    if (fromId || templateId === 'blank') await captureSourceFields(selected.documentId, opened);
    await rerender();
  };
  root.querySelector('[data-state-program-new]').addEventListener('click', () => run(() => newProgram(null)));
  root.querySelector('[data-state-program-copy]')?.addEventListener('click', () => run(() => newProgram(selected.documentId)));
  root.querySelector('[data-state-document-select]').addEventListener('change', event => run(async () => {
    Object.assign(selected, {documentId: event.target.value || null, node: null, widget: 'screen', undo: []});
    await rerender();
  }));
  bindReferencePicker(root.querySelector('[data-state-source-picker]'), {onSelect: value => {
    run(async () => {
      const id = await ensureDocument();
      const previous = await db.getInterfaceStateDocument(id);
      try {
        await db.importInterfaceStateSource(id, value);
        const imported = await db.getInterfaceStateDocument(id);
        const opened = await openInterfaceStateDocumentSource(imported, db, {node: null}, sourceOptions());
        await captureSourceFields(id, opened);
      } catch (failure) {await db.updateInterfaceStateDocument(id, () => previous); throw failure;}
      Object.assign(selected, {node: null, widget: 'screen', undo: []}); await rerender();
    });
  }});
  const file = root.querySelector('[data-state-document-file]');
  root.querySelector('[data-state-document-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', () => run(async () => {
    if (!file.files[0]) return;
    await db.importInterfaceStateDocument(await ensureDocument(), await file.files[0].text());
    Object.assign(selected, {node: null, widget: 'screen', undo: []}); await rerender();
  }));
  root.querySelector('[data-state-document-export]').addEventListener('click', () => run(async () => {
    const content = selected.documentId ? await db.exportInterfaceStateDocument(selected.documentId) : document;
    const url = URL.createObjectURL(new Blob([serializeInterfaceStateDocument(content)], {type: 'application/json'}));
    const link = root.ownerDocument.createElement('a'); link.href = url; link.download = `${content.title}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  const inspector = root.querySelector('[data-state-document-inspector]');
  const refreshInspector = async () => {
    inspector.innerHTML = '';
    const host = root.ownerDocument.createElement('div'); inspector.append(host);
    const field = document.fields.find(row => interfaceStateFieldKey(row) === selected.widget);
    if (field) {
      const scoped = db.getInterfaceStateDocumentDb(selected.documentId);
      const objects = await scoped.getFieldObjects(field.resourceId);
      const object = objects.find(object => object.fields.some(row => row.entityHandle === field.handle && row.fieldName === field.field));
      if (field.resourceId === 'text-record') {
        await object.mount(host, {sceneInteractionConfiguration: true});
      } else await mountFieldObjectColumns(host, object, [field.field], {rowHandles: [field.handle]});
    } else {
      const object = await db.getInterfaceStateDocumentObject(await ensureDocument());
      await object.mount(host, {segmentId: selected.widget, beforeEdit: remember, onChange: rerender});
    }
    inspector.insertAdjacentHTML('beforeend', `<button class="button" data-state-document-undo${selected.undo.length ? '' : ' disabled'}>撤销试改</button>
      ${document.program ? `<button class="button" data-state-program-apply>${document.source
        ? '应用程序结构' : '应用为扩展流程'}</button>` : ''}
      ${document.fields.length ? `<div data-state-apply-scope>
        <label>应用字段对象 <select data-state-apply-resource><option value="">选择字段对象</option>${[...new Set(document.fields.map(row => row.resourceId))].map(id =>
          `<option value="${esc(id)}">${esc(id)}</option>`).join('')}</select></label>
        <div data-state-apply-fields></div><button class="button" data-state-fields-apply disabled>应用</button>
        <button class="button" data-state-fields-cancel>取消</button></div>` : ''}`);
    inspector.querySelector('[data-state-document-undo]').addEventListener('click', () => run(async () => {
      const previous = selected.undo.at(-1);
      await db.updateInterfaceStateDocument(selected.documentId, () => previous); selected.undo.pop(); await rerender();
    }));
    inspector.querySelector('[data-state-program-apply]')?.addEventListener('click', () => run(async () => {
      await db.applyInterfaceStateProgram(selected.documentId); await rerender();
    }));
    const applyResource = inspector.querySelector('[data-state-apply-resource]');
    applyResource?.addEventListener('change', () => {
      inspector.querySelector('[data-state-apply-fields]').innerHTML = document.fields.filter(row => row.resourceId === applyResource.value)
        .map(row => `<label><input type="checkbox" data-state-apply-field value="${esc(interfaceStateFieldKey(row))}">
          ${esc(`${row.handle} · ${row.field}`)}</label>`).join('');
      inspector.querySelector('[data-state-fields-apply]').disabled = false;
    });
    inspector.querySelector('[data-state-fields-cancel]')?.addEventListener('click', () => {
      applyResource.value = ''; inspector.querySelector('[data-state-apply-fields]').innerHTML = '';
      inspector.querySelector('[data-state-fields-apply]').disabled = true;
    });
    inspector.querySelector('[data-state-fields-apply]')?.addEventListener('click', () => run(async () => {
      await db.applyInterfaceStateFields(selected.documentId, [...inspector.querySelectorAll('[data-state-apply-field]:checked')]
        .map(input => input.value)); await rerender();
    }));
  };
  const activate = event => {
    const full = event.target.closest('[data-state-document-full-graph]');
    if (full) {selected.fullGraph = !selected.fullGraph; run(rerender); return;}
    const target = event.target.closest('[data-state-document-widget], [data-state-document-node], [data-state-document-edge]');
    if (!target) return;
    if (event.type === 'keydown') {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
    }
    if (target.dataset.stateDocumentEdge) {
      selected.edge = target.dataset.stateDocumentEdge;
      selected.edgeIds = JSON.parse(target.dataset.stateDocumentEdgeIds);
      const edges = source.graph().edges.filter(edge => selected.edgeIds.includes(edge.id));
      inspector.innerHTML = edges.map(edge => `<p>${esc(edge.input || '')} · ${esc(edge.condition || '')}</p>`).join('');
      workbench.refreshGraph(root); return;
    }
    selected.edge = null;
    selected.widget = target.dataset.stateDocumentWidget || target.dataset.stateDocumentNode;
    if (source?.graph().nodes.some(node => node.id === selected.widget)) selected.node = selected.widget;
    run(rerender);
  };
  root.addEventListener('click', activate);
  root.addEventListener('keydown', activate);
  root.addEventListener('field-object-saved', () => run(rerender));
  root.addEventListener('change', event => {
    if (event.target.closest('[data-field-object-mounted], .fixed-text-editor')) remember();
  }, true);
  const canvas = root.querySelector('[data-state-document-canvas]');
  if (canvas) canvas.getContext('2d').fillRect(0, 0, 256, 240);
  workbench?.bind(root);
  if (canvas && preview) await paintUiConstructionSemanticPreview(canvas, preview,
    {isCurrent: () => root.isConnected, textDocument: source.textDocument});
  bindScreenWorkbenchZoom({namespace, root, zoom: selected.zoom, onChange: zoom => {selected.zoom = zoom;}});
  bindScreenWorkbenchBottomResize({namespace, root});
  if (selected.documentId) await refreshInspector();
  else inspector.replaceChildren();
}

var genericShop = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindGenericShop: bindGenericShop,
  renderGenericShop: renderGenericShop
});

export { BATTLE_AUXILIARY, BATTLE_COMMAND, BATTLE_RESPONSE, addHumanItemsStateGraph, battleCommandExecution, battleCommandGraph, completeFaxScene, dialogueStateExecution, dialogueStateModel, fieldMenuExecution, fieldMenuExecutionPreview, fieldMenuStateGraph, genericShop, humanItemSceneType, prepareFaxNaturalEntry };
