import { referencePickerMarkup, esc, hex, bindReferencePicker } from './monster-figure-C07vG7yu.js';
import { VEHICLE_PRESET_GROUPS, VEHICLE_PRESET_MODULE_ID, vehiclePresetChoices, vehiclePresetReferenceItem, vehiclePresetEntry, elementTree, paintUiConstructionSemanticPreview, uiEditorPreviewDraft } from './charset-BJ0aS3Xk.js';
import { state } from './emulator-Bl-sLXnd.js';
import { machineServiceGraph, addHumanItemsStateGraph, fieldMenuStateGraph, interfaceStatePageGraph, interfaceStateSources, systemStateGraph, battleCommandGraph, projectStoryScriptPrograms, createInterfaceStateSource, genericShopPreview, db, blankInterfaceStateDocument, interfaceStateFieldKey, flushAllAutoSaves, serializeInterfaceStateDocument } from './scene-actors-Cftr7mCE.js';
import { genericShopGraph } from './facility-configuration-controls-J3sIu6pM.js';
import { battleResultGraph, dialogueStateModel, createInterfaceStateControllerWorkbench } from './story-component-labels-C9k8orBA.js';
import { screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom, bindScreenWorkbenchBottomResize } from './preview-sound-DHDXA99x.js';
import { mountFieldObjectColumns } from './rectangle-preset-controls-MtKWNScU.js';

// @editor-module 载具预设的引用控件：用途视图提供分组，使用处声明允许的组。

/**
 * `extraEntries` 是消费页自己的哨兵值（如存档的「未租用」），排在候选之前。
 * `controlMarkup` 是消费页原有的精确值控件；`compact` 下它只留作写回路径。
 */
function vehiclePresetPickerMarkup({
  value,
  label = "载具预设",
  allowedGroups = VEHICLE_PRESET_GROUPS,
  componentAttributes = "",
  controlMarkup = "",
  extraEntries = [],
  compact = true,
  disabled = false,
  previewPanel = false,
} = {}) {
  return referencePickerMarkup({
    moduleId: VEHICLE_PRESET_MODULE_ID,
    value,
    label,
    items: [...extraEntries, ...vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
      ...vehiclePresetReferenceItem(preset), group, groupLabel,
    }))],
    grouped: true,
    controlMarkup,
    componentAttributes,
    compact,
    disabled,
    previewPanel,
  });
}

/** 精确值控件（`<select>`）里的候选项，与引用控件同源。 */
function vehiclePresetOptionMarkup(value, allowedGroups = VEHICLE_PRESET_GROUPS) {
  const selected = Number(value);
  const entries = vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
    ...vehiclePresetEntry(preset, group), group, groupLabel,
  }));
  const known = entries.some(entry => Number(entry.value) === selected);
  // 原值可能在候选表外；保留它，避免精确值控件改掉当前选择。
  return [
    ...(known ? [] : [`<option value="${selected}" selected>${
      esc(`${hex(selected, 2)} · 表外值`)}</option>`]),
    ...[...new Map(entries.map(entry => [entry.group, entry.groupLabel]))]
      .map(([group, groupLabel]) => `<optgroup label="${esc(groupLabel)}">${
        entries.filter(entry => entry.group === group).map(entry => `<option value="${entry.value}"${
          Number(entry.value) === selected ? " selected" : ""}>${
          esc(`${hex(Number(entry.value), 2)} · ${entry.label} · ${entry.description}`)
        }</option>`).join("")}</optgroup>`),
  ].join("");
}

// @editor-module 切换页内展示分页，保留已挂载控件和待写入编辑。

/** Local display tabs. All controls stay mounted, including pending edits. */
function inPageTabs({id, label, tabs, content, active = tabs[0].id}) {
  const selected = tabs.some(tab => tab.id === active) ? active : tabs[0].id;
  return `<div class="in-page-tabs" data-in-page-tabs data-active-tab="${esc(selected)}">
    <div class="in-page-tab-list" role="tablist" aria-label="${esc(label)}">
      ${tabs.map(tab => `<button type="button" role="tab" class="in-page-tab"
        id="${esc(id)}-tab-${esc(tab.id)}" data-in-page-tab="${esc(tab.id)}"
        aria-controls="${esc(id)}-panel" aria-selected="${tab.id === selected}"
        tabindex="${tab.id === selected ? 0 : -1}">${esc(tab.label)}</button>`).join("")}
    </div>
    <div class="in-page-tab-content" id="${esc(id)}-panel" role="tabpanel"
      aria-labelledby="${esc(id)}-tab-${esc(selected)}" tabindex="0">${content}</div>
  </div>`;
}

/** data-in-page-tabs-show lists the tabs that share a piece of content. */
function bindInPageTabs(root, {onChange} = {}) {
  if (!root) return;
  const own = selector => [...root.querySelectorAll(selector)].filter(
    node => node.closest("[data-in-page-tabs]") === root);
  const buttons = own("[data-in-page-tab]");
  const content = own("[data-in-page-tabs-show]");
  const panel = own('[role="tabpanel"]')[0];
  const select = (button, focus = false) => {
    const active = button.dataset.inPageTab;
    for (const tab of buttons) {
      tab.setAttribute("aria-selected", String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    }
    for (const group of content) {
      group.hidden = !group.dataset.inPageTabsShow.split(/\s+/).includes(active);
    }
    panel.setAttribute("aria-labelledby", button.id);
    root.dataset.activeTab = active;
    onChange?.(active);
    if (focus) button.focus();
  };
  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => select(button));
    button.addEventListener("keydown", event => {
      const next = {ArrowRight: (index + 1) % buttons.length,
        ArrowLeft: (index + buttons.length - 1) % buttons.length,
        Home: 0, End: buttons.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(buttons[next], true);
    });
  }
  select(buttons.find(button => button.dataset.inPageTab === root.dataset.activeTab)
    || buttons[0]);
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

export { bindInPageTabs, genericShop, inPageTabs, vehiclePresetOptionMarkup, vehiclePresetPickerMarkup };
