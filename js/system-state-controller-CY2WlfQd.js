import { state } from './emulator-Bpa8EsFw.js';
import { SYSTEM_STATE_PAGES, nameEntryProtocol, db } from './prg-loaders-DnCSmXk9.js';
import { esc, showEditorError, InterfacePreviewSession } from './interface-state-preview-Dlotqlmn.js';
import { bindScreenWorkbenchBottomResize, interfacePreviewContext, rememberCurrentHistoryEntry, pushCurrentHistory } from './element-tree-C1bWRgTl.js';
import { ensureSaveCurrentFieldObjects, previewSaveFileFields, getSaveSlotStatus } from './physical-field-object-windows-DnQmS3eb.js';
import { systemStateGraph, systemStateExecution } from './system-state-model-zPjxuFk6.js';
import { createInterfaceStateControllerWorkbench } from './story-component-labels-CSjCRgXX.js';
import { gameUiStateComponents, selectGameUiWorkbenchNode } from './game-ui-workbench-Dsg65sF-.js';

// @editor-module 系统预览控制器组织公共状态图、输入与隔离快照。

const repositories = new WeakMap();
const presentation = {namespace: 'system-state', dataPrefix: 'system-state', exitLabel: '领域交接', notice: ''};
const systemPage = page => page === 'save-service' ? 'save-management' : page;
const current = page => {
  if (!repositories.has(state.projectRepository)) repositories.set(state.projectRepository, new Map());
  const pages = repositories.get(state.projectRepository);
  if (!pages.has(page)) pages.set(page, {path: '', node: null, edge: null, fullGraph: false, currentSlot: null});
  return pages.get(page);
};

function systemStateControls(model) {
  const page = systemPage(model.id);
  if (!SYSTEM_STATE_PAGES.includes(page)) return null;
  const selected = current(model.id), context = interfacePreviewContext();
  const variant = model.id === 'startup-load' ? 'player-name' : selected.nameVariant || model.preview?.variant || 'player-name';
  const key = JSON.stringify([context.slot, variant, state.nameEntryVehicleChassis]);
  if (selected.key !== key) {selected.path = ''; selected.session = null; selected.node = null;}
  selected.key = key; selected.model = model; selected.variant = variant; selected.page = page;
  selected.graph = systemStateGraph(page, state.project.ui?.construction?.menu_dispatch_data?.previews || [], variant);
  const requested = selected.graph.nodes.find(node => node.id === state.interfacePageEntry);
  if (requested && selected.entryRequest !== state.interfacePageEntry) {
    selected.path = ''; selected.session = null;
  }
  selected.entryRequest = state.interfacePageEntry;
  const endingPreview = model.id === 'ending-credits' && state.project.ui.construction.menu_dispatch_data.previews.find(row =>
    row.id.startsWith('constructor:ending-') && row.layers.some(layer => layer.kind === 'script' && layer.record === state.interfacePageRecord));
  const activePreview = endingPreview || model.preview;
  const active = selected.graph.nodes.find(row => row.publishedPreview?.id === activePreview?.id)
    || (model.id === 'ending-credits' && activePreview?.id?.startsWith('constructor:ending-credit-')
      ? selected.graph.nodes.find(row => row.id === 'credits') : null);
  if (!selected.path && (!selected.node || selected.screen !== model.selectedScreen?.id
      || model.id === 'save-service' && selected.previewId !== model.preview?.id
      || model.id === 'ending-credits' && selected.record !== state.interfacePageRecord)) selected.node = model.title ? 'title' : active?.id || selected.graph.entry;
  if (!selected.path && requested) selected.node = requested.id;
  selected.screen = model.selectedScreen?.id;
  selected.previewId = model.preview?.id;
  selected.record = state.interfacePageRecord;
  const execution = selected.path ? selected.session?.state : null;
  const choices = selected.node === 'files' ? ['继续', '移动记录', '重新开始', '删除记录']
    : ['file-slot', 'save-slot'].includes(selected.node) ? ['存档槽 1', '存档槽 2'] : ['是', '否'];
  const name = execution?.execution.name;
  const waiting = execution?.execution.status === 'waiting';
  const hasChoice = waiting && !name && model.id !== 'ending-credits' && selected.node !== 'title' && !['saved', 'save-bed'].includes(selected.node);
  const inputs = model.id === 'ending-credits' && selected.node !== 'ending-retirement' ? []
    : selected.node === 'ending-retirement' ? ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']
    : name ? ['up', 'down', 'left', 'right', 'a', 'b', 'select']
    : selected.node === 'title' ? ['a', 'start']
    : selected.node === 'files' ? ['up', 'down', 'left', 'right', 'a', 'b']
    : ['file-slot', 'save-slot'].includes(selected.node) ? ['up', 'down', 'a', 'b']
    : ['saved', 'save-bed'].includes(selected.node) ? ['a', 'b'] : ['left', 'right', 'a', 'b'];
  selected.workbench = createInterfaceStateControllerWorkbench({pageId: model.id,
    command: model.id === 'save-service' ? {command_id: model.definition.commandId} : null,
    contextRequirements: ['preview-context', 'save-files', 'name-variant'],
    entry: {pageId: model.title ? 'title' : model.id, variant: model.title ? 'title' : page === 'name-entry' ? variant : null,
      nodeRequest: state.interfacePageEntry, currentSlot: selected.currentSlot},
    selection: () => selected, graph: () => selected.graph,
    presentation: {...presentation, count: `${selected.graph.nodes.length} 个节点`},
    available: node => Boolean(node.previewId) || ['title', 'call'].includes(node.role),
    initialize: prepareInput => initialize(selected, prepareInput),
    inputs: () => waiting ? [...inputs, ...(hasChoice ? ['option'] : [])] : [],
    preview: fallback => systemPreview(fallback, model.id),
    references: () => [{resourceId: 'ui-name-entry', handle: null, field: null}],
    components: gameUiStateComponents(model.title ? 'boot' : `interface-page:${model.id}`, () => model.nodes)});
  const label = {up: '↑', down: '↓', left: '←', right: '→', a: 'A', b: 'B', start: 'START', select: 'SELECT'};
  const result = execution?.domainResults.file;
  const freeCall = !execution && selected.node !== 'credits'
    && selected.graph.nodes.find(row => row.id === selected.node)?.role === 'call';
  const status = execution?.execution.status === 'returned' ? '已返回调用者'
    : execution?.execution.status === 'called' ? '领域交接'
    : execution?.execution.status === 'terminal' ? '终止' : execution?.execution.status === 'unknown' ? '交接未确认'
    : freeCall ? '领域交接' : '';
  const call = execution?.domainResults.call;
  const domainMarkup = status && !waiting ? `<div class="interface-state-domain"><p>${esc(status)}</p>
    <p>${esc(call ? { 'new-game': '主角命名返回新游戏构筑', 'name-return': '命名返回调用者',
      'load-game': '加载所选记录进入游戏', reset: '返回开机演出', credits: '交接职员表线性播放',
      'power-off-prompt': '结束游戏，等待重启或关机' }[call.kind]
      : selected.graph.nodes.find(row => row.id === selected.node)?.label || '')}</p></div>` : '';
  return {toolbar: `<label>路径 <select data-system-state-path data-system-state-page="${esc(model.id)}"><option value="">自由查看</option>
      <option value="input"${execution ? ' selected' : ''}>输入推进</option></select></label>
    ${model.id === 'name-entry' ? `<label>命名对象 <select data-system-state-name-variant${execution ? ' disabled' : ''}>
      <option value="player-name"${variant === 'player-name' ? ' selected' : ''}>主角</option>
      <option value="vehicle-name"${variant === 'vehicle-name' ? ' selected' : ''}>战车</option></select></label>` : ''}
    ${page === 'save-management' ? `<label>当前文件 <select data-system-state-current-slot${execution ? ' disabled' : ''}>
      <option value="">首次保存</option>${[1, 2].map(slot => `<option value="${slot}"${selected.currentSlot === slot ? ' selected' : ''}>${slot}</option>`).join('')}</select></label>` : ''}
    <button class="button" data-system-state-previous${!execution || !selected.session.position ? ' disabled' : ''}>上一步</button>`,
    inputs: execution ? `${hasChoice ? `<select data-system-state-option aria-label="输入选项">${choices.map((text, index) =>
      `<option value="${index}"${execution.selections.choice === index ? ' selected' : ''}>${text}</option>`).join('')}</select>` : ''}
      ${inputs.map(input => `<button class="button" data-system-state-input="${input}"${waiting ? '' : ' disabled'}>${label[input]}</button>`).join('')}
      <span data-system-state-status>${esc(status)}</span>${name ? `<span data-system-state-name>${name.position + 1} / ${name.limit}</span>` : ''}
      ${result ? `<span data-system-state-result>${esc({load: '继续', clone: '移动记录', restart: '重新开始', save: '保存', delete: '删除记录'}[result.operation])}${result.slot ? ` · ${result.slot}` : ''}</span>` : ''}` : '',
    bottom: selected.workbench.graphMarkup(), graph: selected.graph, domainMarkup};
}

function systemTitleControls() {
  return systemStateControls({id: 'startup-load', title: true, preview: null,
    selectedScreen: {id: 'title'}, screens: [], nodes: []});
}

function systemStateComponentNodes(nodes, page) {
  if (!SYSTEM_STATE_PAGES.includes(systemPage(page))) return nodes;
  return nodes.map(node => ({...node, facts: node.facts?.map(fact => typeof fact.value === 'string'
    && /(?:project\/|game\/|web-project\/|out\/|\.(?:json|bin|png|mss)\b)/u.test(fact.value)
    ? {...fact, value: '所属界面资产', mono: false} : fact)}));
}

function systemStateServiceNodes(nodes, page) {
  if (page !== 'save-service') return nodes;
  const ancestors = [], result = [];
  let controls = '', stage = null;
  for (const node of nodes) {
    while (ancestors.length && ancestors.at(-1).depth >= node.depth) ancestors.pop();
    const navigation = node.id.includes(':phase:') || node.id.includes(':stage:')
      || node.serviceFragment && node.kind === 'group' && !node.recordId && !node.selection?.record_id;
    const depth = node.depth - ancestors.filter(parent => parent.navigation).length;
    ancestors.push({depth: node.depth, navigation});
    if (navigation) {
      controls += node.controlsMarkup || '';
      stage ||= node.serviceStage || null;
      continue;
    }
    result.push({...node, depth, controlsMarkup: controls + (node.controlsMarkup || ''),
      ...(stage ? {serviceStage: stage} : {}),
      facts: node.facts?.filter(fact => !['阶段', '片段'].includes(fact.label))});
    controls = ''; stage = null;
  }
  return result;
}

function navigate(page) {
  rememberCurrentHistoryEntry();
  state.view = page === 'title' ? 'cutscene-title' : 'interfaceui';
  if (page !== 'title') state.interfacePage = page;
  const url = new URL(location.origin + location.pathname);
  url.searchParams.set('view', state.view);
  if (page !== 'title') {
    url.searchParams.set('interface', page);
    if (state.interfacePageEntry) url.searchParams.set('interfaceEntry', state.interfacePageEntry);
  }
  pushCurrentHistory(url);
}

function selectNode(selected, nodeId) {
  selected.node = nodeId;
  const node = selected.graph.nodes.find(row => row.id === nodeId);
  const stateId = node?.publishedPreview?.interface_state_id
    || (nodeId === 'credits' ? 'ending-credits.credits-page' : null);
  const screen = stateId && (selected.model.screens.find(row => row.interface_state_id === stateId)
    || state.project.ui?.editor?.screens.find(row => row.interface_state_id === stateId));
  if (screen) state.interfacePageScreen = screen.id;
  state.interfacePageEntry = node?.publishedPreview?.interface_entry_id
    || (selected.model.title && !selected.path && nodeId !== 'title' ? nodeId : null);
  if (selected.model.id === 'ending-credits') state.interfacePageRecord = node?.publishedPreview?.layers.find(layer => layer.kind === 'script')?.record || null;
  const component = selected.model.nodes.find(row => row.screenId === screen?.id && row.kind === 'screen');
  const serviceComponent = selected.model.id === 'save-service' && selected.model.nodes.find(row =>
    row.servicePreview?.id === node?.previewId);
  if (serviceComponent || component) selectGameUiWorkbenchNode(`interface-page:${selected.model.id}`, (serviceComponent || component).id);
}

function systemStateDisplayPage(page) {
  if (page !== 'startup-load') return null;
  const selected = current(page);
  return selected.node === 'player-name' ? 'name-entry' : null;
}

function systemStateModelPreview(page, fallback, forcedVariant = null) {
  if (page !== 'name-entry') return fallback;
  const selected = current(page);
  const variant = forcedVariant || selected.nameVariant || fallback?.variant || 'vehicle-name';
  const suffix = fallback?.interface_state_id === 'name-entry.end-selected' ? '-end'
    : fallback?.interface_state_id === 'name-entry.typed' ? '-typed' : '';
  return state.project.ui.construction.menu_dispatch_data.previews.find(row => row.id === `constructor:${variant}${suffix}`) || fallback;
}

function systemStatePreview(fallback, page) {
  if (!SYSTEM_STATE_PAGES.includes(systemPage(page))) return fallback;
  return current(page).workbench ? current(page).workbench.preview(fallback) : systemPreview(fallback, page);
}

function systemPreview(fallback, page) {
  const selected = current(page);
  const snapshot = selected.path ? selected.session?.state : null;
  if (!snapshot) return page === 'save-service' ? fallback
    : selected.graph?.nodes.find(row => row.id === selected.node)?.publishedPreview || fallback;
  const node = selected.graph.nodes.find(row => row.id === snapshot.node);
  if (['called', 'returned'].includes(snapshot.execution.status) || node?.role === 'title') return null;
  let preview = structuredClone(node?.publishedPreview || fallback);
  if (!preview) return null;
  const name = snapshot.execution.name;
  if (name) {
    const typed = state.project.ui.construction.menu_dispatch_data.previews.find(row =>
      row.id === `constructor:${name.variant}-typed`);
    const text = typed?.layers.find(layer => layer.record === 'record:02:008');
    preview.layers = preview.layers.filter(layer => layer.record !== 'record:02:008').map(layer => {
      if (layer.kind !== 'generic_metasprite') return layer;
      return Number(layer.object_id) === 1 ? {...layer, anchor_x: name.x, anchor_y: name.y}
        : Number(layer.object_id) === 2 ? {...layer, anchor_x: selected.protocol.inputAnchors[name.variant][name.position]} : layer;
    });
    if (text) preview.layers.push({...text, provider_script_hex: {7: name.buffer.map(value => value.toString(16).padStart(2, '0')).join(' ')}});
  }
  preview.service_preview_state = {values: snapshot.fields, selection: snapshot.context,
    slotStatus: Object.fromEntries([1, 2].map(slot => [slot, getSaveSlotStatus(snapshot.execution.files, slot, selected.byteMap)]))};
  preview.runtime_context = {...preview.runtime_context, save_slot: snapshot.context.slot,
    choice_index: snapshot.selections.choice};
  if (page === 'startup-load' && !name) {
    // 文件菜单与槽位选择共用画面，只移动所属光标。
    const fileSlot = snapshot.node === 'file-slot';
    const choice = snapshot.selections.choice;
    const point = fileSlot ? {x: 57, y: choice ? 99 : 75}
      : {x: choice % 2 ? 123 : 23, y: choice < 2 ? 166 : 190};
    preview.layers = preview.layers.map(layer => layer.role === 'continue-cursor' ? {...layer,
      sprites: layer.sprites.map(sprite => ({...sprite, x: sprite.x + point.x - 23, y: sprite.y + point.y - 166}))} : layer);
  }
  return preview;
}

async function initialize(selected, prepareInput) {
  const page = selected.page;
  await prepareInput?.();
  await ensureSaveCurrentFieldObjects(state);
  selected.byteMap = state.saveByteMapDocument;
  selected.protocol = nameEntryProtocol(await db.getResourceDocument('ui-name-entry'));
  const files = state.saveCurrentBytes.slice();
  const fields = previewSaveFileFields(files, selected.byteMap);
  const context = structuredClone(interfacePreviewContext());
  selected.adapter = systemStateExecution({page, graph: selected.graph,
    protocol: selected.protocol, byteMap: selected.byteMap, variant: selected.variant});
  selected.session = new InterfacePreviewSession(selected.adapter.initial({fields, context, files,
    currentSlot: selected.currentSlot, node: page === 'ending-credits' || selected.node === 'title'
      ? selected.node : selected.graph.entry}));
  selected.path = 'input'; selectNode(selected, selected.session.state.node);
}

function bindSystemStateController(root, {rerender, prepareInput = null}) {
  const control = root?.querySelector('[data-system-state-path]');
  if (!control) return;
  const page = control.dataset.systemStatePage, selected = current(page);
  bindScreenWorkbenchBottomResize({root, namespace: selected.model.title ? 'boot' : `interface-page:${page}`});
  selected.workbench.bind(root, {cacheKey: `system:${page}`});
  const perform = task => async event => {
    const control = event?.currentTarget;
    if (control && 'disabled' in control) control.disabled = true;
    try {await task(event); await rerender();}
    catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '系统输入', error);}
    finally {if (control && 'disabled' in control) control.disabled = false;}
  };
  control.addEventListener('change', perform(async event => {
    if (!event.target.value) {selected.path = ''; selected.session = null; return;}
    await selected.workbench.initialize(prepareInput);
  }));
  const advance = input => {
    const before = selected.session.state.node;
    selected.workbench.advance(input); selectNode(selected, selected.session.state.node);
    if (before === 'title' && selected.node !== 'title') navigate('startup-load');
  };
  root.querySelector('[data-system-state-current-slot]')?.addEventListener('change', perform(event => {
    selected.currentSlot = Number(event.target.value) || null;
  }));
  root.querySelector('[data-system-state-name-variant]')?.addEventListener('change', perform(event => {
    selected.nameVariant = event.target.value; selected.node = 'name-grid'; selected.path = ''; selected.session = null;
  }));
  root.querySelector('[data-system-state-previous]')?.addEventListener('click', perform(() => {
    selected.session.previous(); selectNode(selected, selected.session.state.node);
    if (selected.node === 'title') navigate('title');
  }));
  root.querySelector('[data-system-state-option]')?.addEventListener('change', perform(event => advance({type: 'option', index: Number(event.target.value)})));
  root.querySelectorAll('[data-system-state-input]').forEach(button => button.addEventListener('click', perform(() => advance(button.dataset.systemStateInput))));
  root.querySelectorAll('[data-system-state-node]').forEach(element => element.addEventListener('click', perform(() => {
    selected.path = ''; selected.session = null; selectNode(selected, element.dataset.systemStateNode);
    if (selected.node === 'title') navigate('title');
    else if (selected.model.title) navigate('startup-load');
  })));
  root.querySelector('[data-system-state-full-graph]')?.addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-system-state-edge]').forEach(element => element.addEventListener('click', () => {
    const edge = selected.graph.edges.find(row => row.id === element.dataset.systemStateEdge);
    if (!edge) return;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl class="screen-workbench-facts"><dt>输入</dt><dd>${esc(edge.input)}</dd>
      <dt>条件</dt><dd>${esc(edge.condition)}</dd><dt>去向</dt><dd>${esc(selected.graph.nodes.find(row => row.id === edge.to)?.label || '领域交接')}</dd></dl>`;
  }));
  root.addEventListener('field-object-saved', () => {selected.path = ''; selected.session = null;});
}

export { bindSystemStateController, systemStateComponentNodes, systemStateControls, systemStateDisplayPage, systemStateModelPreview, systemStatePreview, systemStateServiceNodes, systemTitleControls };
