// @editor-module 战斗界面共用图、工作台、字段控件与战斗播放组件。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {currentViewUrl, replaceHistoryUrl} from '../core/router.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {battleMenuCalls} from '../core/battle-menu-calls.js';
import {battleScenePreviewCatalog, battleScenePreviewForFormation, battlePartyVisualPosition,
  normalizeBattleScenePreview} from '../core/battle-scene-preview.js';
import {ensureBattleSceneData, prepareViewData} from '../core/view-data.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {battleCommandGraph, battleCommandExecution, BATTLE_INTERFACE_PAGES,
  BATTLE_COMMAND, BATTLE_AUXILIARY, BATTLE_RESPONSE} from '../render/battle-command-state-machine.js';
import {interfaceBattleValuePreview} from '../render/interface-value-preview.js';
import {createInterfaceStateControllerWorkbench} from './interface-state-workbench.js';
import {gameUiStateComponents} from '../views/game-ui-workbench.js';
import {bindScreenWorkbenchBottomResize} from './screen-workbench.js';
import {battleSimulationMarkup, bindBattleSimulation} from './battle-simulation-player.js';
import {showEditorError} from './editor-error.js';

const sessions = new Map();
const presentation = {namespace: 'battle-state', dataPrefix: 'battle-state', exitLabel: '返回调用者', notice: ''};
const current = () => {
  if (!sessions.has(state.projectRepository)) sessions.set(state.projectRepository, {path: '', node: null, fullGraph: false});
  return sessions.get(state.projectRepository);
};
const graphFor = () => battleCommandGraph(state.project.ui.construction.interfaces);
const selectedScreen = () => state.project.ui.editor.screens.find(row => row.id === state.interfacePageScreen);
const valuesFor = (fields, slot) => Object.fromEntries(fields.all(`save.slot.${slot}.`)
  .map(field => [field.fieldId, structuredClone(field.value)]));

export function battleCommandStateControls(model) {
  if (!BATTLE_INTERFACE_PAGES.includes(model.id)) return null;
  const selected = current(), context = interfacePreviewContext();
  const inputKey = JSON.stringify([context.slot, context.scene]);
  if (selected.inputKey !== inputKey) {selected.path = ''; delete selected.session;}
  selected.inputKey = inputKey;
  const graph = graphFor();
  selected.model = model;
  const requested = graph.nodes.find(node => node.id === state.interfacePageEntry);
  if (requested && selected.entryRequest !== state.interfacePageEntry) {
    selected.path = ''; delete selected.session; selected.node = requested.id;
  }
  selected.entryRequest = state.interfacePageEntry;
  if (selected.path && selected.session) selected.node = selected.session.state.node;
  else if (!([BATTLE_AUXILIARY, BATTLE_RESPONSE].includes(selected.node) && model.id === 'battle-party-status'
      && !state.interfacePageScreen))
    selected.node = requested?.id
      || model.selectedScreen?.interface_state_id || BATTLE_COMMAND;
  const snapshot = selected.path ? selected.session?.state : null;
  selected.workbench = createInterfaceStateControllerWorkbench({pageId: model.id,
    contextRequirements: ['preview-context', 'save-fields', 'formation', 'pending-action'],
    entry: {pageId: model.id, request: state.interfacePageEntry, caller: context.scene},
    selection: current, graph: graphFor, presentation: {...presentation, count: `${graph.nodes.length} 个节点`},
    available: node => node.confirmed, initialize: async () => {
      const context = structuredClone(interfacePreviewContext());
      Object.assign(selected, await sources(context));
      const node = ['battle-scene.encounter', 'battle-scene.command', 'battle-party-status.human',
        'battle-party-status.vehicle'].includes(selected.node) ? selected.node : graph.entry;
      selected.session = new InterfacePreviewSession(selected.adapter.initial({fields: selected.fields, context, node}));
      selected.path = 'input'; navigate(selected.session.state.node);
    },
    inputs: () => selected.session?.state.execution.status === 'waiting'
      ? ['up', 'down', 'left', 'right', 'a', 'b', 'option']
      : selected.session?.state.execution.status === 'battle'
        ? [...(selected.session.state.domainResults.message?.execution.wait?.kind === 'input'
          ? ['up', 'down', 'left', 'right', 'a', 'b'] : []), 'battle-result'] : [],
    advance: input => {
      const snapshot = selected.session.state;
      if (snapshot.execution.status === 'battle' && input.type !== 'battle-result') {
        snapshot.execution.trace.push({from: 'battle-scene.action', input: structuredClone(input),
          evidence: 'project/evidence/reverse-engineering/battle-command-followups/observations.json'});
        document.querySelector('#interface-page-workbench [data-battle-simulation]')
          .dispatchEvent(new CustomEvent('battle-message-input', {detail: input}));
      } else selected.session.advance(input, selected.adapter);
    },
    preview: (snapshot, viewing) => framePreview(selected, snapshot, viewing),
    components: gameUiStateComponents(`interface-page:${model.id}`, () => model.nodes)});
  const labels = snapshot ? selected.workbench.options(snapshot) : [];
  return {toolbar: `<label class="screen-workbench-selection">路径 <select data-battle-state-path>
      <option value="">自由查看</option><option value="input"${snapshot ? ' selected' : ''}>输入推进</option></select></label>
    <button type="button" class="button" data-battle-state-previous${!snapshot || selected.session.position === 0 ? ' disabled' : ''}>上一步</button>
    <button type="button" class="button" data-battle-state-next${!snapshot || selected.session.position === selected.session.snapshots.length - 1 ? ' disabled' : ''}>下一步</button>
    ${snapshot ? `<select data-battle-state-option aria-label="输入选项"${labels.length ? '' : ' hidden'}>${labels.map((label, index) =>
      `<option value="${index}"${index === snapshot.selections.choice ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
      ${['up', 'down', 'left', 'right', 'a', 'b'].map((input, index) => `<button type="button" class="button" data-battle-state-input="${input}"${snapshot.execution.status === 'waiting' ? '' : ' disabled'}>${['↑', '↓', '←', '→', 'A', 'B'][index]}</button>`).join('')}
      <span data-battle-state-status>${esc(snapshot.execution.reason || (snapshot.execution.status === 'returned' ? '已返回调用者'
        : graph.nodes.find(row => row.id === snapshot.node)?.label))}</span>` : ''}`,
    bottom: selected.workbench.graphMarkup(),
    domainMarkup: snapshot?.execution.status === 'battle' ? battleSimulationMarkup({workbench: {
      bottomSize: 'compact',
      attributes: {style: 'display:grid;grid-template-columns:minmax(0, 1fr);height:100%;width:100%'},
      treeAttributes: {hidden: true, style: 'display:none'}, inspectorAttributes: {hidden: true, style: 'display:none'},
    }}) : battleSimulationMarkup({interfaceScene: true, pageId: model.id}), graph};
}

function navigate(id) {
  const node = graphFor().nodes.find(row => row.id === id);
  if (!node) throw new TypeError('战斗节点不存在');
  state.interfacePage = node.pageId;
  state.interfacePageScreen = state.project.ui.editor.screens.find(row => row.interface_state_id === node.stateId)?.id || null;
  state.interfacePageEntry = null; state.interfacePageRecord = null;
  current().node = id;
  replaceHistoryUrl(currentViewUrl());
}

async function sources(context) {
  const [fields, items, catalog, selectionLayout, selectionMovement, calls, test, monsters, equipmentEffects] = await Promise.all([
    ensureSaveCurrentFieldObjects(state), db.getDocument('item'), db.getDocument('project.ui.interfaces'),
    db.getResourceDocument('selection-layout'), db.getResourceDocument('code-module'),
    battleMenuCalls(source => db.getField(source.resource_id, source.entity_handle, source.field)),
    db.getResourceDocument('battle-test-point'), db.getAll('monster'),
    db.getResourceDocument('role-equipment-derived'),
  ]);
  const formation = test.formations.find(row => Number(row.id) === Number(test.encounter_id));
  if (!formation) throw new TypeError('战斗缺少当前预览编队');
  const groups = formation.slots.map((row, group) => ({group, monster_id: row.monster_id,
    population: row.count, label: monsters.find(monster => monster.id === row.monster_id)?.name || '怪物'}));
  const adapter = battleCommandExecution({graph: graphFor(), items: items.records,
    targetItems: items.battle_use.tables.item_ids.values.slice(0, 10), groups, calls,
    equipmentEffects: equipmentEffects.records.map(row => parseInt(row.item_reference.split(':')[1], 16)),
    navigation: {catalog: catalog.application_window_sources, selectionLayout, selectionMovement}});
  return {fields: valuesFor(fields, context.slot), adapter, formationId: formation.id};
}

function framePreview(selected, snapshot, viewing) {
  const screen = selectedScreen() || selected.model.selectedScreen;
  let preview = interfaceBattleValuePreview(selected.model.preview, selected.model.id, screen);
  const vehicle = selected.adapter.vehicle(snapshot), role = snapshot.context.role;
  const actor = viewing && snapshot.context.actor.startsWith('rom-vehicle:') ? snapshot.context.actor
    : vehicle == null ? `save-role:${role}` : `save-vehicle:${vehicle}`;
  if (!preview) preview = {layers: []};
  preview = {...preview, interface_value_context: {pageId: selected.model.id, slot: snapshot.context.slot, actor,
    inventory_index: snapshot.context.inventory_index ?? 0, shell_index: snapshot.context.shell_index ?? 0},
    battle_actor_role: role,
    service_preview_state: {values: snapshot.fields, selection: {...snapshot.context, actor},
      conditions: snapshot.view.conditions || []},
    runtime_context: {...preview.runtime_context, choice_index: snapshot.selections.position ?? 0},
    viewport: {x: 0, y: 0, width: 256, height: 240}};
  if (preview.battle_target) preview.battle_command_selection = structuredClone(snapshot.execution.pending);
  if (snapshot.execution.status === 'returned') return {...preview, battle_target: false, layers: [],
    selection_cursor: null, menu_highlight: null};
  if (snapshot.node === BATTLE_COMMAND || ['battle-scene.command', 'battle-party-status.human', 'battle-party-status.vehicle'].includes(snapshot.node))
    preview = {...preview, layers: [{kind: 'interface_battle_layout', vehicle: vehicle != null},
      {kind: 'interface_battle_name', glyph_pixel_y_offset: -4},
      {kind: 'interface_battle_actor', status: true}],
      selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
        battle_menu_selector: vehicle == null ? 'human' : 'vehicle'}};
  if (snapshot.node === BATTLE_AUXILIARY) preview = {...preview, battle_target: false,
    mode_settings: true, interface_battle_palette: true,
    layers: [{kind: 'interface_battle_layout', vehicle: vehicle != null},
      {kind: 'interface_battle_name', role_only: true, glyph_pixel_y_offset: -4},
      {kind: 'script', record: 'record:02:006', mode_settings: true, glyph_pixel_y_offset: -4}],
    menu_highlight: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
      battle_menu_selector: vehicle == null ? 'human' : 'vehicle', choice_index: vehicle == null ? 3 : 5,
      preset: 'parent-menu'},
    selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector: 6}};
  if (snapshot.node === 'battle-party-status.condition') preview = {...preview,
    runtime_context: {...preview.runtime_context, confirmed_waits: snapshot.execution.conditionWaits || 0},
    menu_highlight: {...preview.menu_highlight, battle_menu_selector: vehicle == null ? 'human' : 'vehicle',
      choice_index: vehicle == null ? 3 : 5},
    layers: preview.layers.map(layer => layer.kind === 'interface_battle_layout'
      ? {...layer, vehicle: vehicle != null} : layer)};
  if (snapshot.node === BATTLE_RESPONSE) {
    const response = snapshot.execution.response;
    preview = {...preview, battle_target: false, interface_battle_palette: true,
      layers: [{kind: 'interface_battle_layout', vehicle: response.vehicle},
        {kind: 'interface_battle_response', record: response.record, partRecord: response.partRecord,
          role: snapshot.context.role}], selection_cursor: null,
      menu_highlight: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
        battle_menu_selector: response.vehicle ? 'vehicle' : 'human', choice_index: response.choice,
        preset: 'parent-menu'}};
  }
  return preview;
}

export async function bindBattleCommandStateController({rerender, isCurrent = () => true}) {
  const root = document.querySelector('#interface-page-workbench');
  if (!root?.querySelector('[data-battle-state-path]')) return;
  const selected = current(), graph = graphFor();
  bindScreenWorkbenchBottomResize({root, namespace: `interface-page:${state.interfacePage}`});
  selected.workbench.bind(root, {cacheKey: `battle-state:${state.projectRepository}`});
  const perform = task => async event => {
    try {await task(event); if (isCurrent() && root.isConnected) await rerender();}
    catch (error) {if (isCurrent() && root.isConnected) showEditorError(root.querySelector('.workspace-inspector'), '战斗输入', error);}
  };
  const advance = input => {selected.workbench.advance(input); navigate(selected.session.state.node);};
  root.querySelector('[data-battle-state-path]').addEventListener('change', perform(async event => {
    if (!event.target.value) {selected.path = ''; delete selected.session; return;}
    await selected.workbench.initialize();
  }));
  root.querySelector('[data-battle-state-previous]').addEventListener('click', perform(() => {
    selected.session.previous(); navigate(selected.session.state.node);
  }));
  root.querySelector('[data-battle-state-next]').addEventListener('click', perform(() => {
    selected.session.next(); navigate(selected.session.state.node);
  }));
  root.querySelector('[data-battle-state-option]')?.addEventListener('change', perform(event =>
    advance({type: 'option', index: Number(event.target.value)})));
  root.querySelectorAll('[data-battle-state-input]').forEach(button => button.addEventListener('click', event => {
    const input = {type: button.dataset.battleStateInput};
    if (selected.session?.state.execution.status === 'battle')
      selected.workbench.advance(input);
    else void perform(() => advance(input))(event);
  }));
  root.querySelectorAll('[data-battle-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; selected.edge = null; navigate(button.dataset.battleStateNode);
  })));
  root.querySelector('[data-battle-state-full-graph]').addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-battle-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = graph.edges.find(row => row.id === button.dataset.battleStateEdge);
    selected.edge = edge.id;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl><dt>输入</dt><dd>${esc(edge.input)}</dd>
      <dt>去向</dt><dd>${esc(graph.nodes.find(row => row.id === edge.to)?.label || '返回调用者')}</dd>
      <dt>确认程度</dt><dd>${edge.unknown ? '未确认' : '已确认'}</dd></dl>`;
  }));
  root.querySelectorAll('[data-interface-preview-toolbar] select').forEach(control => {
    if (control.matches('[data-battle-state-path], [data-battle-state-option]')) return;
    control.addEventListener('change', () => {selected.path = ''; delete selected.session;}, {capture: true});
  });
  const context = structuredClone(interfacePreviewContext()), repository = state.projectRepository;
  const failures = await ensureBattleSceneData({includeInventory: true});
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
  await prepareViewData('interfaceui');
  if (!isCurrent() || !root.isConnected || repository !== state.projectRepository) return;
  if (!selected.path) Object.assign(selected, await sources(context));
  if (!isCurrent() || !root.isConnected || repository !== state.projectRepository) return;
  const viewFields = structuredClone(selected.fields);
  const conditions = [];
  const vehicleView = !selected.path && (context.kind === 'vehicle'
    || /\.(vehicle|vehicle-items|special-shell)$/u.test(selected.node));
  if (vehicleView) {
    const prefix = `save.slot.${context.slot}.role.${SERVICE_ROLES[context.role]}`;
    viewFields[`${prefix}.present`] |= 128;
    viewFields[`${prefix}.current_vehicle`] = context.vehicle;
    conditions.push({label: '所选人物乘坐所选战车'});
  }
  const snapshot = selected.path ? selected.session.state : selected.adapter.initial({fields: viewFields, context, node: selected.node});
  if (!selected.path) snapshot.view.conditions = conditions;
  const currentFrame = () => isCurrent() && root.isConnected && repository === state.projectRepository;
  const player = root.querySelector('[data-battle-simulation]');
  let preview = battleScenePreviewForFormation(state.project, selected.formationId);
  const catalog = battleScenePreviewCatalog(state.project), members = SERVICE_ROLES.filter(name => snapshot.fields[`save.slot.${context.slot}.role.${name}.present`]);
  preview = normalizeBattleScenePreview({...preview,
    enemyEvents: snapshot.domainResults.roundState?.enemyEvents || preview.enemyEvents,
    party: preview.party.map((member, role) => {
    const prefix = `save.slot.${context.slot}.role.${SERVICE_ROLES[role]}`;
    const present = snapshot.fields[`${prefix}.present`], vehicleId = snapshot.fields[`${prefix}.current_vehicle`];
    const vehicle = present & 128 ? catalog.vehiclePresets.find(row => row.preset.vehicle_slot === vehicleId) : null;
    return {...member, visible: Boolean(present), riding: Boolean(vehicle), vehiclePresetId: vehicle?.id ?? member.vehiclePresetId,
      dead: snapshot.fields[`${prefix}.status`] === 255, ...battlePartyVisualPosition(role, members.length)};
  })}, state.project, catalog);
  if (snapshot.execution.status === 'battle') {
    await bindBattleSimulation(player, {project: state.project, preview,
      encounter: {kind: 'encounter', fields: snapshot.fields, ...snapshot.domainResults.battleCall, scene: context.scene},
      onMessageState: message => {
        if (!currentFrame() || selected.session.state !== snapshot) return;
        snapshot.domainResults.message = structuredClone(message);
        const wait = message?.execution.wait;
        root.querySelectorAll('[data-battle-state-input]').forEach(button => {
          button.disabled = message?.execution.status !== 'waiting' || wait?.kind !== 'input';
        });
        root.querySelector('[data-battle-state-status]').textContent = message?.execution.reason
          || (wait?.kind === 'input' ? '等待消息确认' : '战斗执行中');
      },
      onComplete: result => {
        if (!currentFrame() || selected.session.state !== snapshot) return;
        advance({type: 'battle-result', result: result.completion});
        void rerender().catch(error => showEditorError(root, '战斗返回', error));
      }, onError: error => {
        if (!currentFrame() || selected.session.state !== snapshot) return;
        advance({type: 'battle-result', result: {confirmed: false, missing: [error.message]}});
        void rerender().catch(failure => showEditorError(root, '战斗返回', failure));
      }});
  } else await bindBattleSimulation(player, {project: state.project, preview,
    interfaceFrame: selected.workbench.preview(snapshot, !selected.path), isCurrent: currentFrame});
}
