// @editor-module 菜单控制器组织现有界面页与隔离执行会话。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext, selectInterfacePreviewContext} from '../core/interface-preview-context.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {currentViewUrl, replaceHistoryUrl} from '../core/router.js';
import {FIELD_MENU_NAVIGATION, fieldMenuNavigationEntry} from '../core/field-menu-tree.js';
import {currentTextChoiceLabel, currentTextReference} from '../core/resource-index.js';
import {itemNameRecordId} from '../core/text-record-project.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {fieldMenuStateGraph, fieldMenuExecution, fieldMenuExecutionPreview, FIELD_MENU_STATE_PAGES} from '../render/field-menu-state-machine.js';
import {createInterfaceStateControllerWorkbench} from './interface-state-workbench.js';
import {gameUiStateComponents} from '../views/game-ui-workbench.js';
import {showEditorError} from './editor-error.js';
import {bindScreenWorkbenchBottomResize} from './screen-workbench.js';
import {addHumanItemsStateGraph} from '../render/human-items-state-model.js';
import {humanItemsStateContext} from './human-items-state-context.js';
import {initializeInterfacePreviewScene} from '../render/interface-preview-scene.js';
import {completeFaxScene, prepareFaxNaturalEntry} from '../render/fax-scene-execution.js';
import {interfaceStatePageGraph} from '../render/interface-state-source.js';

const sessions = new Map();
const pages = new Set([...FIELD_MENU_STATE_PAGES, 'field-board-exit', 'field-investigation']);
const presentation = {namespace: 'field-state', dataPrefix: 'field-state', exitLabel: '返回行走',
  notice: ''};
const paths = [{id: 'input', label: '输入推进', nodes: [], edges: []}];
const pageLabel = id => id === 'non-battle-main-menu' ? '主菜单'
  : state.project.ui.editor.pages?.find(page => page.id === id)?.label
    || ({'field-dialogue': '对话', 'field-board-exit': '乘降', 'party-strength': '强度',
      'human-items': '工具', 'human-equipment': '装备', 'vehicle-equipment-shells': '炮弹',
      'field-investigation': '调查', 'field-mode': '模式', 'satellite-map': '卫星地图', 'field-item-fax': '传真传送'})[id] || id;
const pageGraph = (pageId = state.interfacePage) => {
  const graph = graphFor();
  return interfaceStatePageGraph(graph, pageId, {pageLabel,
    parent: pageId === 'non-battle-main-menu' ? null
      : graph.nodes.find(node => node.id === 'field-command-menu.main')});
};

function current() {
  const repository = state.projectRepository;
  if (!sessions.has(repository)) sessions.set(repository, {path: '', node: null, widget: 'screen', fullGraph: false});
  return sessions.get(repository);
}

function graphFor() {
  const sources = current().sources;
  const dispatch = sources?.dispatch || state.project?.ui?.construction?.menu_dispatch_data;
  const catalog = sources?.catalog || state.project?.ui?.construction?.interfaces;
  if (!dispatch || !catalog) return null;
  const graph = addHumanItemsStateGraph(fieldMenuStateGraph(dispatch, catalog, db.peekResourceDocument('code-module')), dispatch, catalog);
  for (const edge of graph.edges) {
    const choices = dispatch.choice_groups.flatMap(row => row.choices);
    const choice = choices.find(row => Number(row.local_command) === edge.operation.command
      && row.target_state_id === edge.to);
    if (choice) edge.input = `A · ${currentTextChoiceLabel(choice.label_reference) || graph.nodes.find(row => row.id === edge.to)?.label}`;
  }
  return graph;
}

function currentNode(graph) {
  const selected = current();
  const executing = graph.nodes.find(row => row.id === selected.session?.state.node);
  if (selected.path && executing?.pageId === state.interfacePage) return executing;
  return graph.nodes.find(row => row.pageId === state.interfacePage && row.id === state.interfacePageEntry)
    || graph.nodes.find(row => row.pageId === state.interfacePage && row.stateId === state.project.ui.editor.screens
    .find(screen => screen.id === state.interfacePageScreen)?.interface_state_id
    && row.entryId === (state.interfacePageEntry || null))
    || graph.nodes.find(row => row.pageId === state.interfacePage)
    || graph.nodes.find(row => row.id === selected.node) || graph.nodes[0];
}

export function fieldMenuStateControls(pageId, nodes = () => []) {
  const selected = current();
  if (!pages.has(pageId) && !selected.path) return null;
  const graph = graphFor();
  if (!graph || !pages.has(pageId) && (!selected.path || graph.nodes.find(row => row.id === selected.node)?.pageId !== pageId)) return null;
  selected.graphViews ||= new Map();
  if (selected.graphPage !== pageId) {
    if (selected.graphPage) selected.graphViews.set(selected.graphPage, selected.fullGraph);
    selected.fullGraph = selected.graphViews.get(pageId) || false;
    selected.graphPage = pageId;
  }
  const node = currentNode(graph);
  if (selected.path && selected.session?.state.node !== node.id) {
    selected.path = ''; delete selected.session; delete selected.adapter;
  }
  selected.node = node.id;
  const entry = fieldMenuNavigationEntry(pageId, state.interfacePageScreen, state.interfacePageEntry);
  const localGraph = pageGraph(pageId);
  selected.workbench = createInterfaceStateControllerWorkbench({pageId,
    contextRequirements: ['preview-context', 'save-fields', 'scene-call'],
    entry: {pageId, request: FIELD_MENU_NAVIGATION.some(row => row.flowId === entry?.flowId) ? entry.flowId : null,
      nodeRequest: state.interfacePageEntry, caller: interfacePreviewContext().scene},
    selection: current, graph: () => pageGraph(pageId), paths: () => paths,
    presentation: {...presentation, count: `${localGraph.nodes.length} 个节点`}, available: row => Boolean(row.preview),
    initialize: path => start(graph, path),
    inputs: () => {
      const snapshot = selected.path && selected.session?.state;
      return snapshot?.execution?.status === 'waiting' ? ['up', 'down', 'left', 'right', 'a', 'b',
        ...(selected.adapter.options(snapshot).length ? ['option'] : []),
        ...(snapshot.node === 'vehicle-status.armor-amount' ? ['quantity'] : []),
        ...(snapshot.node.startsWith('human-items.') ? ['random'] : [])] : [];
    },
    preview: menuPreview,
    references: () => ['ui-command-dispatch', 'selection-layout', 'code-module'].map(resourceId => ({resourceId, handle: null, field: null})),
    components: gameUiStateComponents(`interface-page:${pageId}`, nodes)});
  const snapshot = selected.session?.state, options = snapshot ? selected.workbench.options(snapshot) : [];
  const active = Boolean(selected.path), quantity = active && snapshot.node === 'vehicle-status.armor-amount';
  const status = snapshot?.execution;
  return {toolbar: `<label class="screen-workbench-selection">路径 <select data-field-state-path>
      <option value="">自由查看</option><option value="input"${selected.path === 'input' ? ' selected' : ''}>输入推进</option>
      ${interfacePreviewContext().scene ? ['↑', '↓', '←', '→'].map((label, index) =>
        `<option value="entrance:${index + 1}"${selected.path === `entrance:${index + 1}` ? ' selected' : ''}>从所选入口 ${label} 自然进入</option>`).join('') : ''}</select></label>
    <button class="button" type="button" data-field-state-previous${!active || selected.session.position < 1 ? ' disabled' : ''}>上一步</button>
    <button class="button" type="button" data-field-state-next${!active || selected.session.position >= selected.session.snapshots.length - 1 ? ' disabled' : ''}>下一步</button>
    ${active ? `<select data-field-state-option aria-label="输入选项"${options.length ? '' : ' hidden'}>${options.map((label, index) =>
      `<option value="${index}"${index === snapshot.selections.choice ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
      ${snapshot.node.startsWith('human-items.') ? `<label>随机输入 <input type="number" min="0" max="255" value="${snapshot.execution.itemRandom}" data-field-state-random></label>` : ''}
      ${['up', 'down', 'left', 'right', 'a', 'b'].map((input, index) => `<button class="button" type="button" data-field-state-input="${input}"${status.status === 'waiting' ? '' : ' disabled'}>${['↑', '↓', '←', '→', 'A', 'B'][index]}</button>`).join('')}
      <span data-field-state-status>${esc(status.status === 'unknown' ? `未确认：${status.reason}` : status.status === 'returned' ? '已返回行走' : node.label)}</span>` : ''}`,
    bottom: selected.workbench.graphMarkup(), graph: localGraph,
    inputActive: active, quantity: quantity ? snapshot.execution.quantity : null};
}

function navigate(graph, id) {
  const node = graph.nodes.find(row => row.id === id);
  if (!node) throw new TypeError('菜单节点不存在');
  state.interfacePage = node.pageId;
  state.interfacePageScreen = state.project.ui.editor.screens.find(screen => screen.interface_state_id === node.stateId)?.id || null;
  state.interfacePageEntry = node.entryId || null;
  state.interfacePageRecord = null;
  current().node = id;
  const snapshot = current().session?.state;
  if (snapshot) {
    const context = interfacePreviewContext();
    context.slot = snapshot.context.slot;
    if (snapshot.context.actor) selectInterfacePreviewContext('actor', snapshot.context.actor);
  }
  replaceHistoryUrl(currentViewUrl());
}

async function start(graph, path = 'input') {
  const context = structuredClone(interfacePreviewContext());
  context.actor = `save-${context.kind}:${context[context.kind]}`;
  const [fields, dispatch, catalog, selectionLayout, commandDocument, items, masks] = await Promise.all([
    ensureSaveCurrentFieldObjects(state), db.getDocument('project.ui.dispatch'), db.getDocument('project.ui.interfaces'),
    db.getResourceDocument('selection-layout'), db.getResourceDocument('code-module'),
    db.getResourceDocument('item-entry'), db.getResourceDocument('shared-indexed-byte-overlays'),
  ]);
  const values = Object.fromEntries(fields.all(`save.slot.${context.slot}.`).map(field => [field.fieldId, structuredClone(field.value)]));
  let initial = {fields: values, context, view: {}, execution: {status: 'waiting', trace: []}, domainResults: {}};
  if (path.startsWith('entrance:')) initial = await prepareFaxNaturalEntry(initial, Number(path.split(':')[1]), {
    readDocument: id => db.getResourceDocument(id), initialize: initializeInterfacePreviewScene});
  const humanItems = await humanItemsStateContext(dispatch, initial.fields, initial.context, fields);
  const adapter = fieldMenuExecution({graph, dispatch, commandDocument, humanItems,
    equipment: {items: items.records.map(item => ({...item, label: currentTextReference(itemNameRecordId(item)).label})),
      masks, choiceLabel: currentTextChoiceLabel},
    navigation: {catalog: catalog.application_window_sources, selectionLayout, selectionMovement: commandDocument}});
  const selected = current();
  selected.sources = {dispatch, catalog};
  selected.adapter = adapter;
  const entry = state.interfacePage === 'human-equipment' ? 'human-equipment.list'
    : state.interfacePage === 'vehicle-equipment-shells' ? state.interfacePageScreen?.endsWith('.shells')
      ? 'vehicle-equipment-shells.shells' : 'vehicle-equipment-shells.parts' : undefined;
  const snapshot = adapter.initial({fields: initial.fields, context: initial.context, entry});
  snapshot.view = initial.view;
  selected.session = new InterfacePreviewSession(snapshot);
  selected.path = path;
  navigate(graph, selected.session.state.node);
}

export function fieldMenuStatePreview(preview) {
  return current().workbench ? current().workbench.preview(preview) : menuPreview(preview);
}

function menuPreview(preview) {
  const selected = current(), snapshot = selected.session?.state;
  if (!selected.path || !snapshot) return preview;
  const node = graphFor()?.nodes.find(row => row.id === snapshot.node);
  if (node?.pageId !== state.interfacePage) return preview;
  const resolved = fieldMenuExecutionPreview(node.preview || preview, snapshot);
  resolved.interface_preview_state = {context: snapshot.context, fields: snapshot.fields, view: snapshot.view};
  if (snapshot.execution.status === 'returned') return {id: resolved.id, viewport: resolved.viewport,
    ui_palette_source: resolved.ui_palette_source, layers: [], selection_cursor: null,
    interface_preview_state: resolved.interface_preview_state};
  return resolved;
}

export function bindFieldMenuStateController({rerender}) {
  const root = document.querySelector('#interface-page-workbench');
  if (!root?.querySelector('[data-field-state-path]')) return;
  bindScreenWorkbenchBottomResize({root, namespace: `interface-page:${state.interfacePage}`});
  const selected = current(), graph = graphFor();
  selected.workbench.bind(root, {cacheKey: `field-state:${state.projectRepository}`});
  const perform = task => async event => {
    try {await task(event); await rerender();}
    catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '菜单输入', error);}
  };
  root.querySelector('[data-field-state-path]').addEventListener('change', perform(async event => {
    if (event.target.value) await selected.workbench.initialize(event.target.value);
    else {selected.path = ''; delete selected.session; delete selected.adapter;}
  }));
  root.querySelector('[data-field-state-previous]')?.addEventListener('click', perform(() => {
    selected.session.previous(); navigate(graph, selected.session.state.node);
  }));
  root.querySelector('[data-field-state-next]')?.addEventListener('click', perform(() => {
    selected.session.next(); navigate(graph, selected.session.state.node);
  }));
  const advance = async input => {
    const session = selected.session;
    selected.workbench.advance(input);
    session.project(await completeFaxScene(session.state, initializeInterfacePreviewScene));
    navigate(graph, session.state.node);
  };
  root.querySelector('[data-field-state-option]')?.addEventListener('change', perform(event => advance({type: 'option', index: Number(event.target.value)})));
  root.querySelector('[data-field-state-quantity]')?.addEventListener('change', perform(event => advance({type: 'quantity', value: Number(event.target.value)})));
  root.querySelector('[data-field-state-random]')?.addEventListener('change', perform(event => advance({type: 'random', value: Number(event.target.value)})));
  root.querySelectorAll('[data-field-state-input]').forEach(button => button.addEventListener('click', perform(() => advance({type: button.dataset.fieldStateInput}))));
  root.querySelectorAll('[data-field-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; delete selected.adapter; selected.edge = null;
    navigate(graph, button.dataset.fieldStateNode);
  })));
  root.querySelector('[data-field-state-full-graph]')?.addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-field-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = graph.edges.find(row => row.id === button.dataset.fieldStateEdge);
    if (!edge) return;
    selected.edge = edge.id;
    const host = root.querySelector('[data-game-ui-inspector-detail]');
    host.innerHTML = `<dl><dt>输入</dt><dd>${esc(edge.input)}</dd><dt>去向</dt><dd>${esc(graph.nodes.find(node => node.id === edge.to)?.label || '返回行走')}</dd>
      ${edge.unknown ? '<dt>确认程度</dt><dd>未确认</dd>' : ''}</dl>`;
  }));
  const contextControls = root.querySelectorAll('[data-interface-preview-toolbar] select');
  contextControls.forEach(control => {
    if (control.matches('[data-field-state-path], [data-field-state-option]')) return;
    control.addEventListener('change', () => {
      selected.path = ''; delete selected.session; delete selected.adapter;
    }, {capture: true});
  });
}
