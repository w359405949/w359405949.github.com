// @editor-module 消息状态控制复用公共图、字段控件与战斗播放组件。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {currentViewUrl, replaceHistoryUrl} from '../core/router.js';
import {currentTextReferenceLink} from '../core/resource-index.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {battleMessageCalls, battleMessageCallOperations, applyBattleMessageCallEffect, battleMessageParameterLabel,
  battleMessageParameterPlaceholder} from '../core/battle-message-calls.js';
import {createBattleContextValues} from '../core/battle-context-values.js';
import {battleVehicleItemContext, battleVehicleItemCallContract} from '../core/battle-vehicle-item-calls.js';
import {battleSimulationInput} from '../core/battle-simulation-input.js';
import {battleEnemyMessageInitialState, battleEnemyMessageCallOperations, applyBattleEnemyMessageEffect}
  from '../core/battle-enemy-message-calls.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {battleMessageSequenceWindow, battleScenePreviewForFormation} from '../core/battle-scene-preview.js';
import {ensureBattleSceneData} from '../core/view-data.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {interfaceValueSelection} from '../render/interface-value-preview.js';
import {battleMessageGraph, battleMessageExecution, BATTLE_MESSAGE_EVIDENCE} from '../render/battle-message-state-machine.js';
import {createInterfaceStateControllerWorkbench} from './interface-state-workbench.js';
import {gameUiStateComponents} from '../views/game-ui-workbench.js';
import {bindScreenWorkbenchBottomResize} from './screen-workbench.js';
import {battleSimulationMarkup, bindBattleSimulation} from './battle-simulation-player.js';
import {showEditorError} from './editor-error.js';

const sessions = new Map();
const presentation = {namespace: 'battle-message-state', dataPrefix: 'battle-message-state', exitLabel: '返回行动调用方', notice: ''};
const current = () => {
  if (!sessions.has(state.projectRepository)) sessions.set(state.projectRepository, {path: '', node: null, fullGraph: false, viewIndex: 0});
  return sessions.get(state.projectRepository);
};
const graphFor = ({calls, items, actions} = {}) => battleMessageGraph({templates: state.project.ui.construction.templates_data,
  interfaces: state.project.ui.construction.interfaces, calls, items, actions});
const selectedPath = selected => selected.graph?.paths.find(row => row.id === selected.path);

function navigate(id) {
  const screen = state.project.ui.editor.screens.find(row => row.interface_state_id === id);
  if (!screen) throw new TypeError('消息状态没有编辑画面');
  state.interfacePageScreen = screen.id; state.interfacePageEntry = null; state.interfacePageRecord = null;
  current().node = id; replaceHistoryUrl(currentViewUrl());
}

function sourceMarkup(source) {
  if (!source) return '';
  return `<dl><dt>正文来源</dt><dd>${source.roots.map(id => currentTextReferenceLink(id)).join(' · ') || '未确认'}</dd>
    <dt>调用来源</dt><dd>${[source.fixedCalls.length ? '战斗调用字段' : '', source.itemCalls.length ? '道具结果字段' : '',
      source.enemyCalls.length ? '敌方行动字段' : '', source.paths.length ? '已发布行动序列' : ''].filter(Boolean).map(esc).join(' · ') || '未确认'}</dd>
    <dt>参数</dt><dd>${[...new Set(source.insertions.map(row => battleMessageParameterLabel(row.source)))].map(esc).join(' · ') || '固定正文'}</dd>
    ${source.insertions.length ? '<dt>预览占位</dt><dd>？表示未确认参数，仅供预览。</dd>' : ''}
    ${source.missing.length ? `<dt>缺口</dt><dd>${source.missing.map(esc).join('；')}</dd>` : ''}</dl>`;
}

export function battleMessageStateControls(model) {
  if (model.id !== 'battle-messages') return null;
  const selected = current(), context = interfacePreviewContext();
  const inputKey = JSON.stringify([context.slot, context.actor, context.scene, context.inventory_index]);
  if (selected.inputKey !== inputKey) {selected.path = ''; delete selected.session;}
  selected.inputKey = inputKey; selected.model = model; selected.graph = graphFor(selected);
  if (selected.session?.state.node) selected.node = selected.session.state.node;
  else selected.node = model.selectedScreen?.interface_state_id;
  const path = selectedPath(selected), snapshot = selected.session?.state, wait = snapshot?.execution.wait;
  const status = snapshot?.execution.reason || (snapshot?.execution.status === 'returned' ? '消息已返回行动调用方'
    : wait?.kind === 'input' ? '等待确认' : wait ? `还需 ${wait.remaining} 帧` : path ? '消息顺序查看' : '');
  const inputActive = snapshot?.execution.status === 'waiting' && wait.kind === 'input';
  selected.workbench = createInterfaceStateControllerWorkbench({pageId: model.id,
    contextRequirements: ['preview-context', 'save-fields', 'message-call'],
    entry: {pageId: model.id, path: selected.path, caller: context.actor}, selection: current, graph: () => selected.graph,
    paths: () => selected.graph.paths, presentation: {...presentation, count: `${selected.graph.nodes.length} 个节点`},
    available: node => node.confirmed, initialize: () => execute(selected),
    inputs: () => inputActive ? ['up', 'down', 'left', 'right', 'a', 'b'] : wait?.kind === 'frames' ? ['frames'] : [],
    preview: messagePreview,
    components: gameUiStateComponents(`interface-page:${model.id}`, () => model.nodes)});
  const position = snapshot ? selected.session.position : selected.viewIndex;
  const count = snapshot ? selected.session.snapshots.length : path?.phases.length || 0;
  return {toolbar: `<label class="screen-workbench-selection">路径 <select data-battle-message-state-path>
      <option value="">自由查看</option>${selected.graph.paths.map(row => `<option value="${esc(row.id)}"${row.id === selected.path ? ' selected' : ''}>${esc(row.label)}</option>`).join('')}</select></label>
    <button type="button" class="button" data-battle-message-state-previous${position > 0 ? '' : ' disabled'}>上一步</button>
    <button type="button" class="button" data-battle-message-state-next${position + 1 < count ? '' : ' disabled'}>下一步</button>
    <button type="button" class="button" data-battle-message-state-execute${path && !snapshot ? '' : ' disabled'}>输入推进</button>
    ${['up', 'down', 'left', 'right', 'a', 'b'].map((type, i) => `<button type="button" class="button" data-battle-message-state-input="${type}"${inputActive ? '' : ' disabled'}>${['↑', '↓', '←', '→', 'A', 'B'][i]}</button>`).join('')}
    <button type="button" class="button" data-battle-message-state-frame${wait?.kind === 'frames' ? '' : ' disabled'}>下一帧</button>
    <span data-battle-message-state-status>${esc(status)}</span>`,
    bottom: selected.workbench.graphMarkup(),
    domainMarkup: battleSimulationMarkup({interfaceScene: true, pageId: model.id})};
}

export function battleMessageStateNodes(nodes, pageId, stateId) {
  if (pageId !== 'battle-messages') return nodes;
  const source = graphFor(current()).nodes.find(row => row.id === stateId)?.source;
  return [...nodes, {id: 'battle-messages:message-source', kind: 'group', depth: 1, label: '消息来源',
    textComponents: true, structureRecord: false, controlsMarkup: sourceMarkup(source)}];
}

function snapshotFields(selected, snapshot) {
  const value = field => field && ({...field,
    value: Object.hasOwn(snapshot.fields, field.fieldId) ? snapshot.fields[field.fieldId] : field.value});
  return {find: id => value(selected.saveFields.find(id)),
    slotStatus: slot => selected.saveFields.slotStatus(slot),
    vehicleAcquired: (slot, vehicle) => selected.saveFields.vehicleAcquired(slot, vehicle),
    all: prefix => selected.saveFields.all(prefix).map(value)};
}

function messageParameters(selected, snapshot, phase, index) {
  const catalog = state.project.ui.construction.templates_data.battle_message_runtime_parameters;
  const enemyCall = snapshot.domainResults.enemyCall || snapshot.context.enemyCall;
  const enemySlot = enemyCall?.messageTargets?.[index] ?? enemyCall?.actor;
  const enemy = selectedPath(selected).enemyActionReference ? enemyCall?.instances?.[enemySlot] : null;
  const partyTarget = enemyCall?.messagePartyTargets?.[index];
  const identity = {battle_id: 'message-preview', action_id: selected.path,
    target_iteration: index, target_slot: -1, result_execution: selectedPath(selected).resultScript};
  const actor = enemy ? {kind: 'enemy', slot: enemyCall.actor}
    : snapshot.context.messageActor || (snapshot.context.actor.startsWith('save-vehicle:')
    ? {kind: 'vehicle', id: Number(snapshot.context.actor.split(':')[1])}
    : {kind: 'role', id: snapshot.context.role});
  const target = Number.isInteger(partyTarget) ? {kind: 'role', id: partyTarget}
    : enemy ? {kind: 'enemy', slot: enemySlot} : undefined;
  const battle = {origin: catalog.current_value_contract.battle_origin, identity, actor,
    target, enemy_instances: enemyCall?.instances, enemy_groups: enemyCall?.groups,
    item: snapshot.context.item, save_slot: snapshot.context.slot, state: phase.state.split(':')[0],
    text_record_ref: phase.text_record_ref};
  const values = createBattleContextValues({catalog, readBattle: () => battle,
    readSaveFields: () => snapshotFields(selected, snapshot), readItem: id => selected.items.find(row => row.id === id),
    readMonster: id => selected.monsters?.find(row => row.id === id)});
  const parameter = (writer, subject, subject_binding) => ({writer, subject, subject_binding,
    phase: catalog.current_value_contract.parameter_phase, identity});
  const enemyParameter = enemy && {...parameter('enemy-context', Number.isInteger(partyTarget) ? 'actor' : 'target',
    {kind: 'enemy', slot: enemySlot,
    group: enemy.group, monster_id: enemy.monster_id}),
    population_snapshot: enemy.population_snapshot, suffix_source: enemy.suffix_source};
  const invocation = values.forMessage({...battle, parameters: enemy ? {
    ...(Number.isInteger(partyTarget) ? {
      'ui-text-provider-workspace.current-string': parameter('save-name', 'target', target),
    } : {}),
    'ui-text-provider-zero-page-overlays.current-record': enemyParameter,
    'ui-text-provider-workspace.target-instance-suffix': enemyParameter,
  } : {
    'ui-text-provider-workspace.current-string': parameter('save-name', 'actor', actor),
    'ui-text-provider-zero-page-overlays.current-record': parameter('item-reference', 'item', battle.item),
  }});
  return {invocation, resolveRuntimeParameter: values.resolveRuntimeParameter};
}

export function battleMessageStatePreview(preview, pageId) {
  if (pageId !== 'battle-messages') return preview;
  return current().workbench ? current().workbench.preview(preview) : messagePreview(preview);
}

function messagePreview(preview) {
  const selected = current(), path = selectedPath(selected);
  if (!path || !selected.saveFields) return preview;
  const snapshot = selected.session?.state;
  const executing = snapshot?.execution.phases.length > 0;
  const count = executing ? snapshot.execution.phases.length : selected.viewIndex + 1;
  const phases = executing ? snapshot.execution.phases : path.phases;
  const templates = state.project.ui.construction.templates_data;
  const window = battleMessageSequenceWindow(templates, phases, Math.min(count, phases.length));
  return {...preview, interface_value_context: null, runtime_context: {},
    viewport: {x: 0, y: 0, width: 256, height: 240},
    layers: [...window.layers.map(layer => ({kind: 'scene_window_raster', window: layer.windowId,
      rectangle: layer.rectangle})), ...window.textSlots.map((slot, index) => {
      const phase = phases[slot.phaseIndex];
      const parameters = executing ? messageParameters(selected, snapshot, phase, slot.phaseIndex)
        : {invocation: {kind: 'message-order-view'}, resolveRuntimeParameter: battleMessageParameterPlaceholder};
      return {kind: 'text_slot', text_record_ref: slot.textRecordRef, geometry: slot.geometry, fonts: slot.fonts,
        runtimeParameters: slot.runtimeParameters, ...parameters,
        waitMarker: executing && index === window.textSlots.length - 1
          && snapshot.execution.wait?.kind === 'input' ? 'battle-command' : null};
    })]};
}

async function sources(selected, context) {
  const [saveFields, items, actions, resultScripts, overlays, code, calls, test, healing, equipmentEffects] = await Promise.all([
    ensureSaveCurrentFieldObjects(state), db.getDocument('item'), db.getDocument('enemy-action'),
    db.getResourceDocument('battle-result-script'), db.getResourceDocument('shared-indexed-byte-overlays'),
    fieldSubmenuCodeValues(['dialogue-wait-input-mask']), battleMessageCalls(), db.getResourceDocument('battle-test-point'),
    db.getResourceDocument('party-healing-service'),
    db.getResourceDocument('role-equipment-derived'),
  ]);
  Object.assign(selected, {saveFields, items: items.records, actions: actions.records, resultScripts: resultScripts.records,
    waitValues: overlays.level_value_codebook,
    directionMasks: overlays.descending_bit_masks.slice(4),
    inputMask: fieldSubmenuCodeValue(code, 'dialogue-wait-input-mask'), calls, formationId: test.encounter_id, healing,
    sonicResistanceItem: Number.parseInt(equipmentEffects?.records?.find(row =>
      row.effect_reference === 'role-equipment-derived:effect:sonic-and-mental-wave-resistance')?.item_reference?.split(':')[1], 16)});
  selected.fields = Object.fromEntries(saveFields.all(`save.slot.${context.slot}.`)
    .map(field => [field.fieldId, structuredClone(field.value)]));
}

async function execute(selected) {
  const context = {...structuredClone(interfacePreviewContext()), ...interfaceValueSelection('battle-messages')};
  context.randomSeed ??= Math.floor(Math.random() * 65536);
  await sources(selected, context);
  const path = selectedPath(selected), name = SERVICE_ROLES[context.role];
  const inventory = selected.fields[`save.slot.${context.slot}.role.${name}.inventory`];
  context.item = inventory?.[context.inventory_index ?? 0];
  if (!path.enemyActionReference && battleVehicleItemCallContract(path.resultScript)) {
    const binding = battleVehicleItemContext({context, fields: selected.fields, items: selected.items});
    if (binding) Object.assign(context, {role: binding.role, vehicle: binding.vehicle, item: binding.item.id,
      messageActor: binding.messageActor, effectActor: binding.effectActor});
    else context.item = null;
  }
  context.settings = selected.fields[`save.slot.${context.slot}.adventure_data_settings`];
  const item = selected.items.find(row => row.id === context.item);
  let operations;
  if (path.enemyActionReference) {
    const input = await battleSimulationInput(state.project,
      battleScenePreviewForFormation(state.project, selected.formationId), db, {fields: selected.saveFields},
      {saveSlot: context.slot, fields: selected.fields});
    selected.monsters = input.monsters;
    context.enemyCall = battleEnemyMessageInitialState(input, {seed: context.randomSeed,
      sonicResistanceItem: selected.sonicResistanceItem});
    operations = battleEnemyMessageCallOperations({path,
      record: selected.resultScripts.find(row => row.handle === path.resultScript),
      action: selected.actions.find(row => row.handle === path.enemyActionReference),
      callState: context.enemyCall, directionMasks: selected.directionMasks, fields: selected.fields, context,
      resultScripts: selected.resultScripts});
  } else operations = battleMessageCallOperations({path,
    record: selected.resultScripts.find(row => row.handle === path.resultScript), item,
    fields: selected.fields, context, inventoryField: `save.slot.${context.slot}.role.${name}.inventory`,
    resultScripts: selected.resultScripts, healing: selected.healing, paths: selected.graph.paths});
  const adapter = battleMessageExecution({operations, waitValues: selected.waitValues, inputMask: selected.inputMask,
    applyEffect: path.enemyActionReference ? applyBattleEnemyMessageEffect : applyBattleMessageCallEffect,
    resolveParameters(operation, snapshot) {
      const binding = messageParameters(selected, snapshot, operation.phase, snapshot.execution.phases.length);
      const catalog = state.project.ui.construction.templates_data.battle_message_runtime_parameters;
      const pending = [operation.phase.text_record_ref.node_id], visited = new Set(), insertion = [];
      while (pending.length) {
        const node = pending.pop();
        if (visited.has(node)) continue;
        visited.add(node);
        const record = catalog.records[node];
        insertion.push(...(record?.insertions || []).map(row => ({...row,
          text_record_ref: {resource_id: 'text-record', node_id: node}})));
        pending.push(...(record?.fixed_includes || []).map(row => row.text_record_ref.node_id));
      }
      for (const row of insertion) {
        const value = binding.resolveRuntimeParameter({...row,
          invocation: binding.invocation});
        if (value.status !== 'available' && value.status !== 'empty') return value;
      }
      return {status: 'available'};
    }});
  selected.adapter = adapter;
  selected.session = new InterfacePreviewSession(adapter.initial({fields: selected.fields, context}));
  if (selected.session.state.node) navigate(selected.session.state.node);
}

export async function bindBattleMessageStateController({rerender, resolvePreview, isCurrent = () => true}) {
  const root = document.querySelector('#interface-page-workbench');
  if (!root?.querySelector('[data-battle-message-state-path]')) return;
  const selected = current(), graph = selected.graph;
  bindScreenWorkbenchBottomResize({root, namespace: 'interface-page:battle-messages'});
  selected.workbench.bind(root, {cacheKey: `battle-message-state:${state.projectRepository}`});
  const perform = task => async event => {
    try {await task(event); if (isCurrent() && root.isConnected) await rerender();}
    catch (error) {if (isCurrent() && root.isConnected) showEditorError(root.querySelector('.workspace-inspector'), '战斗消息', error);}
  };
  root.querySelector('[data-battle-message-state-path]').addEventListener('change', perform(event => {
    selected.path = event.target.value; selected.viewIndex = 0; delete selected.session;
    const path = selectedPath(selected);
    if (path) navigate(path.nodes[0]);
  }));
  root.querySelector('[data-battle-message-state-execute]').addEventListener('click', perform(() => selected.workbench.initialize()));
  const step = delta => {
    if (selected.session) delta < 0 ? selected.session.previous() : selected.session.next();
    else selected.viewIndex += delta;
    const node = selected.session?.state.node || selectedPath(selected).nodes[selected.viewIndex];
    if (node) navigate(node);
  };
  root.querySelector('[data-battle-message-state-previous]').addEventListener('click', perform(() => step(-1)));
  root.querySelector('[data-battle-message-state-next]').addEventListener('click', perform(() => step(1)));
  const advance = input => {
    selected.workbench.advance(input);
    if (selected.session.state.node) navigate(selected.session.state.node);
  };
  root.querySelectorAll('[data-battle-message-state-input]').forEach(button => button.addEventListener('click', perform(() =>
    advance({type: button.dataset.battleMessageStateInput}))));
  root.querySelector('[data-battle-message-state-frame]').addEventListener('click', perform(() => advance({type: 'frames', frames: 1})));
  root.querySelectorAll('[data-battle-message-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; selected.edge = null; navigate(button.dataset.battleMessageStateNode);
  })));
  root.querySelector('[data-battle-message-state-full-graph]').addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-battle-message-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = graph.edges.find(row => row.id === button.dataset.battleMessageStateEdge);
    selected.edge = edge.id;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl><dt>输入</dt><dd>消息等待完成</dd>
      <dt>去向</dt><dd>${esc(graph.nodes.find(row => row.id === edge.to)?.label || presentation.exitLabel)}</dd>
      <dt>效果</dt><dd>${edge.unknown ? '须由本次战斗调用方确认' : '本次调用的已确认效果与等待'}</dd></dl>`;
  }));
  root.querySelectorAll('[data-interface-preview-toolbar] select').forEach(control => {
    if (control.matches('[data-battle-message-state-path]')) return;
    control.addEventListener('change', () => {selected.path = ''; delete selected.session;}, {capture: true});
  });
  const context = structuredClone(interfacePreviewContext()), repository = state.projectRepository;
  const failures = await ensureBattleSceneData({includeInventory: true});
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
  if (!isCurrent() || !root.isConnected || repository !== state.projectRepository) return;
  if (!selected.session) await sources(selected, context);
  if (!isCurrent() || !root.isConnected || repository !== state.projectRepository) return;
  const player = root.querySelector('[data-battle-simulation]');
  await bindBattleSimulation(player, {project: state.project,
    preview: battleScenePreviewForFormation(state.project, selected.formationId),
    interfaceFrame: resolvePreview(null, selected.model.preview, selected.model.definition, selected.model),
    isCurrent: () => isCurrent() && root.isConnected && repository === state.projectRepository});
  if (!isCurrent() || !root.isConnected) return;
  player.dataset.messageSourceCount = String(graph.nodes.length);
  player.dataset.messageExecutionStatus = selected.session?.state.execution.status || 'viewing';
  player.dataset.messageEvidence = BATTLE_MESSAGE_EVIDENCE;
}
