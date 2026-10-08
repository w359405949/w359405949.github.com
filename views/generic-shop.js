// @editor-module 状态机页面组织文档、领域来源与公共工作台。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {blankInterfaceStateDocument, serializeInterfaceStateDocument, interfaceStateFieldKey} from '../core/interface-state-document.js';
import {openInterfaceStateDocumentSource} from '../render/interface-state-document-source.js';
import {screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom, bindScreenWorkbenchBottomResize} from '../ui/screen-workbench.js';
import {createInterfaceStateControllerWorkbench} from '../ui/interface-state-workbench.js';
import {elementTree} from '../ui/element-tree.js';
import {referencePickerMarkup, bindReferencePicker} from '../ui/reference-picker.js';
import {paintUiConstructionSemanticPreview} from '../modules/visual/ui-construction-preview.js';
import {mountFieldObjectColumns} from '../ui/field-object-editor.js';
import {flushAllAutoSaves} from '../core/auto-save.js';
import {uiEditorPreviewDraft} from './ui-editor.js';

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

export async function renderGenericShop() {
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
  model = {document, source, workbench, widgets};
  return screenWorkbench({namespace, className: 'generic-shop-workbench', heightMode: 'fill',
    bottomSize: 'resizable', bottomFit: true,
    toolbarMarkup: `<div class="screen-workbench-stage-toolbar">
      <select data-state-document-select aria-label="状态机文档"><option value="">空文档</option>
        ${documents.map(row => `<option value="${esc(row.id)}"${row.id === selected.documentId ? ' selected' : ''}>${esc(row.title)}</option>`).join('')}</select>
      <button class="button" data-state-document-new>新建</button>
      <button class="button" data-state-program-new>新建应用程序</button>
      ${document.program ? '<button class="button" data-state-program-copy>另存为新程序</button>' : ''}
      <span>导入来源</span>${referencePickerMarkup({moduleId: 'interface-state-document', label: '导入来源', compact: true,
        value: '', items: sources.map(source => ({value: source.identity.id, label: source.label,
          group: source.identity.domain, groupLabel: domains[source.identity.domain]}))})}
      <button class="button" data-state-document-import>导入文件</button>
      <button class="button" data-state-document-export>导出文件</button>
      <input type="file" accept=".json,application/json" data-state-document-file hidden>
      <span data-state-document-status role="alert"></span></div>`,
    treeTitle: '组件树', treeMarkup: elementTree({nodes: widgets, selectedId: selected.widget, showIcons: false,
      buttonAttributes: row => ({'data-state-document-widget': row.id})}),
    stageMarkup: screenWorkbenchCanvasStage({namespace, sizing: 'fill',
      canvasMarkup: '<canvas width="256" height="240" data-state-document-canvas aria-label="状态机画面"></canvas>'}),
    inspectorTitle: '详情', inspectorMarkup: '<div data-state-document-inspector></div>',
    stageToolbarMarkup: `<span data-state-document-position>${esc(document.source?.id
      || (document.program ? '新应用程序' : '空文档'))}</span>`,
    bottomMarkup: workbench ? workbench.graphMarkup() : '<p>空文档</p>',
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

export async function bindGenericShop(root, {rerender}) {
  root = root.querySelector(`[data-screen-workbench="${namespace}"]`);
  if (!root) return;
  const selected = selection(), {document, source, workbench} = model;
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
  const newProgram = async fromId => {
    selected.documentId = await db.createInterfaceStateApplicationProgram(fromId);
    Object.assign(selected, {node: null, widget: 'screen', undo: []});
    const opened = await openInterfaceStateDocumentSource(await db.getInterfaceStateDocument(selected.documentId),
      db, selected, sourceOptions());
    await captureSourceFields(selected.documentId, opened);
    await rerender();
  };
  root.querySelector('[data-state-program-new]').addEventListener('click', () => run(() => newProgram(null)));
  root.querySelector('[data-state-program-copy]')?.addEventListener('click', () => run(() => newProgram(selected.documentId)));
  root.querySelector('[data-state-document-select]').addEventListener('change', event => run(async () => {
    Object.assign(selected, {documentId: event.target.value || null, node: null, widget: 'screen', undo: []});
    await rerender();
  }));
  bindReferencePicker(root.querySelector('[data-module-reference-picker]'), {onSelect: value => {
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
  canvas.getContext('2d').fillRect(0, 0, 256, 240);
  workbench?.bind(root);
  if (source?.execution.preview()) await paintUiConstructionSemanticPreview(canvas, source.execution.preview(),
    {isCurrent: () => root.isConnected, textDocument: source.textDocument});
  bindScreenWorkbenchZoom({namespace, root, zoom: selected.zoom, onChange: zoom => {selected.zoom = zoom;}});
  bindScreenWorkbenchBottomResize({namespace, root});
  if (selected.documentId) await refreshInspector();
  else inspector.textContent = '空文档';
}
