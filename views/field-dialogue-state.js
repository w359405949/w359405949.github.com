// @editor-module 对话编辑页面组织公共状态图、组件树与既有领域预览。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext, selectInterfacePreviewContext} from '../core/interface-preview-context.js';
import {createSceneActionCore} from '../core/scene-action-core.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {currentTextReferenceLink, recordUid} from '../core/resource-index.js';
import {uiRecordComponentLabel, uiImageComponentLabel} from '../core/ui-component-labels.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {dialogueStateModel, dialogueStateExecution} from '../render/dialogue-state-model.js';
import {interfaceStateTree} from '../render/interface-state-tree.js';
import {interfaceComponentBounds} from '../render/interface-state-regions.js';
import {screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom, bindScreenWorkbenchBottomResize} from '../ui/screen-workbench.js';
import {createInterfaceStateControllerWorkbench} from '../ui/interface-state-workbench.js';
import {elementTree} from '../ui/element-tree.js';
import {fixedTextEditorMarkup} from '../ui/fixed-text-editor.js';
import {textRecordStructureEditorMarkup} from '../ui/text-record-structure-editor.js';
import {bindUiComponentEditors} from './ui-component-editors.js';
import {interfaceCursorReferenceMarkup} from '../modules/visual/interface-buttons.js';
import {interfacePreviewSceneMarkup, bindInterfacePreviewScene} from '../ui/interface-preview-scene.js';
import {fieldMenuObjectMarkup, bindFieldMenuObject} from '../ui/field-menu-loadout.js';
import {interfacePreviewEntityTypes} from '../core/interface-preview-scope.js';
import {interfaceValueContext} from '../render/interface-value-preview.js';
import {fieldMenuHref, FIELD_MENU_PARENTS} from '../core/field-menu-tree.js';
import {dialoguePreviewFrames} from '../modules/text/dialogue-preview.js';
import {sceneInteractionPreviewMarkup, bindSceneInteractionPreview, sceneInteractionPreviewTarget} from '../ui/scene-actor-interaction-picker.js';
import {fieldMenuInteractionPreview} from '../modules/visual/field-menu.js';
import {selectionLayoutMarkup, bindSelectionLayoutControls} from '../modules/visual/selection-layout.js';
import {paintUiConstructionSemanticPreview, uiConstructionPreviewRegion} from '../modules/visual/ui-construction-preview.js';
import {paintInterfaceStateFrame} from '../modules/visual/interface-state-frame.js';
import {battleSimulationMarkup, bindBattleSimulation} from '../ui/battle-simulation-player.js';
import {battleScenePreviewForFormation} from '../core/battle-scene-preview.js';
import {showEditorError} from '../ui/editor-error.js';
import {interactionEditorHref} from '../ui/interaction-editor-links.js';
import {prepareViewData, ensureBattleSceneData} from '../core/view-data.js';

const namespace = 'field-dialogue-state';
const presentation = {namespace: 'generic-shop', dataPrefix: 'dialogue', exitLabel: '返回调用者'};
const regions = [{id: 'dialogue', label: '对话', visible: true, bounds: {x: 0, y: 144, width: 256, height: 96}}];
let selected;

function selection() {
  if (![1, 2].includes(interfacePreviewContext().slot)) selectInterfacePreviewContext('slot', 1);
  if (selected?.repository !== state.projectRepository) selected = {repository: state.projectRepository,
    node: null, edge: null, widget: 'screen', path: '', fullGraph: false, zoom: 'fit', slot: interfacePreviewContext().slot};
  return selected;
}

export function renderFieldDialogueState() {
  selection();
  return screenWorkbench({namespace, className: 'generic-shop-workbench', heightMode: 'fill', bottomSize: 'resizable', bottomFit: true,
    toolbarMarkup: `<div class="screen-workbench-stage-toolbar">${sceneInteractionPreviewMarkup('field-dialogue')}
      <label>路径 <select data-dialogue-path><option value="">自由查看</option><option value="input">输入推进</option></select></label>
      <button class="button" data-dialogue-previous disabled>上一步</button><span data-dialogue-position></span>
      <span data-dialogue-status role="status"></span></div>`,
    treeTitle: '组件树', treeMarkup: '<div data-dialogue-tree></div>',
    stageMarkup: screenWorkbenchCanvasStage({namespace, sizing: 'fill',
      toolbarMarkup: `${interfacePreviewSceneMarkup()}<span data-dialogue-object></span>
        <label>预览组 <select data-dialogue-slot>${[1, 2].map(slot => `<option${slot === selection().slot ? ' selected' : ''}>${slot}</option>`).join('')}</select></label>
        <span data-dialogue-inputs hidden>${[['left', '←'], ['right', '→'], ['a', 'A'], ['b', 'B']].map(([input, label]) =>
          `<button class="button" data-dialogue-input="${input}">${label}</button>`).join('')}</span>`,
      canvasMarkup: '<canvas width="256" height="240" data-dialogue-canvas aria-label="对话状态画面"></canvas>'})
      + '<div class="screen-workbench-preview" data-dialogue-domain hidden style="display:none"></div>',
    inspectorTitle: '属性', inspectorMarkup: '<div data-dialogue-inspector></div>',
    bottomMarkup: '<div class="interface-state-graph-panel" data-dialogue-graph></div>',
  });
}

export async function bindFieldDialogueState({rerender, isCurrent = () => true}) {
  const root = document.querySelector(`[data-screen-workbench="${namespace}"]`);
  if (!root) return;
  const currentPage = () => isCurrent() && root.isConnected;
  const reportError = (block, error) => {
    if (currentPage()) showEditorError(root, block, error);
  };
  const choice = selection(), canvas = root.querySelector('[data-dialogue-canvas]');
  let model, adapter, session, widgets = [], preview, refreshId = 0, initializeId = 0, domainId = null;
  let storyDocument, interactionDocument, interfaceDocument;
  const core = createSceneActionCore({readProject: () => ({...state.project, story: storyDocument,
    story_interaction_edits: interactionDocument}), database: db});
  const definition = () => {
    const target = sceneInteractionPreviewTarget('field-dialogue');
    const source = target?.dialogues?.[0];
    const record = source?.record || 'record:05:000';
    const script = target?.mode === 'interaction-script'
      ? core.storyBrowserVm().programs.find(row => row.kind === 'interaction' && row.id === target.record.interaction_or_record_id) : null;
    const unsupported = target && (!['direct-dialogue', 'interaction-script'].includes(target.mode)
      || target.mode === 'interaction-script' && !script);
    return {id: target?.objectUid || 'command:20:no-target', label: target?.label || '普通对话',
      record: script || unsupported ? null : record, script, unsupported, ownerHref: unsupported ? target.href : null,
      preview: unsupported ? source?.preview || fieldMenuInteractionPreview(record, 'field-dialogue') : null,
      caller: target ? {kind: 'scene-interaction', object: target.objectUid, sceneId: target.sceneId,
        x: target.record.x, y: target.record.y} : {kind: 'field-command-menu', command: 'command:20'}};
  };
  const initialize = async ({reload = true} = {}) => {
    const id = ++initializeId;
    delete root.dataset.dialogueReady;
    domainId = null;
    root.querySelector('[data-dialogue-domain]').innerHTML = '';
    if (reload) {
      await prepareViewData('interfaceui');
      [storyDocument, interactionDocument, interfaceDocument] = await Promise.all([
        db.getDocument('project.story'), db.getResourceDocument('story-interaction-script'),
        db.getDocument('project.ui.interfaces'),
      ]);
    }
    if (!currentPage() || id !== initializeId) return;
    const dependencies = {text: structuredClone(state.project.text_record_edits), encoding: state.project.text_record_encoding,
      semantics: core.storyBrowserVm().opcode_semantics};
    model = dialogueStateModel(definition(), dependencies);
    for (const source of state.project.ui.construction.menu_dispatch_data.previews.filter(row =>
      ['walking-dialogue', 'dialogue-choice', 'dialogue-scripted-encounter'].some(id => row.interface_state_id?.startsWith(id))))
      model.graph.nodes.push({id: source.id, label: source.interface_state || source.visible_state,
        publishedPreview: source, pause: {kind: 'view', evidence: source.id}, regions});
    adapter = dialogueStateExecution(model, dependencies);
    const save = await ensureSaveCurrentFieldObjects(state);
    if (!currentPage() || id !== initializeId) return;
    const values = Object.fromEntries(save.all().map(field => [field.fieldId, structuredClone(field.value)]));
    const flags = Object.keys(values).filter(key =>
      key.startsWith(`save.slot.${choice.slot}.global_event_flag.`));
    const fields = {...values, ...(flags.length ? {eventFlags: flags.filter(key => values[key]).map(key => parseInt(key.split('.').at(-1), 16))} : {})};
    session = new InterfacePreviewSession(adapter.initial({fields, context: {...structuredClone(interfacePreviewContext()),
      slot: choice.slot, caller: model.entry.caller,
      ...(model.entry.caller.sceneId === undefined ? {} : {scene: interfacePreviewContext().scene?.sceneId === model.entry.caller.sceneId
        ? structuredClone(interfacePreviewContext().scene) : {sceneId: model.entry.caller.sceneId,
          x: model.entry.caller.x, y: model.entry.caller.y}})}}));
    if (choice.entry !== model.entry.id) {choice.node = null; choice.edge = null; choice.widget = 'screen'; choice.page = null;}
    choice.entry = model.entry.id;
    if (choice.path || !model.graph.nodes.some(row => row.id === choice.node)) choice.node = session.state.node;
    choice.session = session; choice.model = model; choice.adapter = adapter;
    choice.workbench = createInterfaceStateControllerWorkbench({pageId: 'field-dialogue',
      contextRequirements: ['preview-context', 'save-fields', 'interaction-caller'],
      entry: {id: model.entry.id, caller: model.entry.caller, record: model.entry.record,
        scriptId: model.entry.script?.id ?? null, unsupported: model.entry.unsupported, ownerHref: model.entry.ownerHref},
      selection: () => choice, graph: () => model.graph,
      presentation: () => ({...presentation, count: `${model.graph.nodes.length} 个状态`, notice: '普通交互与领域调用'}),
      available: node => Boolean(node.record || node.publishedPreview), initialize,
      capabilities: {input: !model.entry.unsupported},
      inputs: () => session.state.execution.status === 'waiting' ? ['left', 'right', 'a', 'b']
        : session.state.execution.status === 'battle' ? ['battle-result'] : [],
      preview: () => preview,
      references: () => [
        ...(model.entry.script ? [{resourceId: 'story-interaction-script',
          handle: recordUid('story-interaction-script:script', model.entry.script.id), field: null}] : []),
        ...[...new Set(model.graph.nodes.map(node => node.record).filter(Boolean))]
          .map(handle => ({resourceId: 'text-record', handle, field: null}))],
      components: {current: () => widgets, selected: () => choice.widget,
        select: id => {choice.widget = id; choice.edge = null;},
        fields: id => {
          const widget = widgets.find(row => row.id === id);
          return widget?.recordId ? [{resourceId: 'text-record', handle: widget.recordId, field: null}] : [];
        }, mount: () => inspector()}});
    root.querySelector('[data-dialogue-graph]').innerHTML = choice.workbench.graphMarkup();
    choice.workbench.bind(root, {cacheKey: `${namespace}:${model.entry.id}`});
  };
  const inspector = async () => {
    const host = root.querySelector('[data-dialogue-inspector]');
    const edge = model.graph.edges.find(row => row.id === choice.edge);
    const widget = widgets.find(row => row.id === choice.widget);
    if (edge) host.innerHTML = `<dl><dt>输入</dt><dd>${esc(edge.input)}</dd><dt>条件</dt><dd>${esc(edge.condition || '无附加条件')}</dd></dl>`;
    else if (widget?.kind === 'image' && widget.bounds) {
      const bounds = widget.bounds;
      host.innerHTML = `<dl class="screen-workbench-facts"><div><dt>位置</dt><dd>${bounds.x}, ${bounds.y}</dd></div>
        <div><dt>尺寸</dt><dd>${bounds.width} × ${bounds.height}</dd></div>
        <div><dt>来源</dt><dd>${esc(widget.sourceRecord)}</dd></div></dl>`
        + (widget.sourceRecord === 'selection-cursor' ? interfaceCursorReferenceMarkup() : '');
    } else if (widget?.recordId) {
      host.innerHTML = (widget.layout ? textRecordStructureEditorMarkup(widget.recordId)
        : fixedTextEditorMarkup({recordId: widget.recordId, label: widget.label, editorId: `${namespace}:${widget.recordId}`}))
        + currentTextReferenceLink(widget.recordId);
      bindUiComponentEditors(host, {repaint: () => {void initialize({reload: false}).then(() => refresh({keepInspector: true}))
        .catch(error => reportError('正文刷新', error));},
        rerender: async () => {await initialize({reload: false}); await refresh({keepInspector: true});}});
    } else if (widget?.id === 'choice') {
      host.innerHTML = interfaceCursorReferenceMarkup() + selectionLayoutMarkup(preview);
      await bindSelectionLayoutControls(host, preview, {repaint: refresh, rerender});
    } else if (widget?.markup) host.innerHTML = widget.markup;
    else host.innerHTML = `<p>${esc(model.graph.nodes.find(row => row.id === choice.node)?.input || '')}</p>
      <dl><dt>调用者</dt><dd>${esc(model.entry.caller.object || '行走命令菜单')}</dd></dl>
      <a class="editor-inline-link" href="${esc(fieldMenuHref({pageId: FIELD_MENU_PARENTS['field-dialogue']}))}">返回上级菜单 ↗</a>
      ${model.entry.ownerHref ? `<a class="editor-inline-link" href="${esc(model.entry.ownerHref)}">所属领域 ↗</a>` : ''}`;
  };
  const refresh = async ({keepInspector = false} = {}) => {
    if (!currentPage()) return;
    const id = ++refreshId, isCurrent = () => currentPage() && id === refreshId;
    root.dataset.dialogueRefreshing = '';
    try {
      const running = choice.path ? session.state : null;
      if (running) choice.node = running.node;
      const node = model.graph.nodes.find(row => row.id === choice.node);
      root.querySelector('[data-dialogue-path]').value = choice.path;
      root.querySelector('[data-dialogue-previous]').disabled = !choice.path || session.position === 0;
      root.querySelector('[data-dialogue-position]').textContent = choice.path ? `输入 ${session.position}` : '';
      root.querySelector('[data-dialogue-inputs]').hidden = !choice.path;
      for (const button of root.querySelectorAll('[data-dialogue-input]')) button.disabled = running?.execution.status !== 'waiting';
      root.querySelector('[data-dialogue-status]').textContent = running?.execution.reason || (running?.execution.status === 'returned'
        ? '已返回调用者' : node?.input || '');
      const domain = root.querySelector('[data-dialogue-domain]');
      const battle = running?.pause?.kind === 'battle' && Boolean(running.domainResults.battleCall);
      const story = running?.execution.status === 'story';
      domain.hidden = !battle && !story;
      domain.style.display = battle || story ? 'flex' : 'none';
      canvas.closest('.screen-workbench-preview').style.display = battle || story ? 'none' : '';
      if (story) domain.innerHTML = `<a class="editor-inline-link" href="${esc(interactionEditorHref(
        `story-interaction-script:script:${model.entry.script.id.toString(16).toUpperCase().padStart(2, '0')}`))}">剧情播放 ↗</a>`;
      if (battle && domainId !== running.domainResults.battleCall.node) {
        const calledSession = session;
        domainId = running.domainResults.battleCall.node;
        domain.innerHTML = battleSimulationMarkup({workbench: {
          bottomSize: 'compact',
          attributes: {style: 'grid-template-columns:minmax(0, 1fr)'},
          treeAttributes: {hidden: true, style: 'display:none'}, inspectorAttributes: {hidden: true, style: 'display:none'},
        }});
        const call = running.domainResults.battleCall;
        await prepareViewData('text');
        await prepareViewData('monster-formations');
        const failures = await ensureBattleSceneData({includeInventory: true});
        if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
        await prepareViewData('interfaceui');
        if (!isCurrent() || session !== calledSession) return;
        const battlePreview = battleScenePreviewForFormation(state.project, call.formationId);
        const player = domain.querySelector('[data-battle-simulation]');
        await bindBattleSimulation(player, {project: state.project, preview: battlePreview,
          encounter: {kind: 'encounter', saveSlot: choice.slot, fields: running.fields,
            ...call, scene: running.context.scene || {}, fieldEncounter: false},
          onComplete: result => {
            if (!currentPage() || session !== calledSession || session.state.execution.status !== 'battle') return;
            choice.workbench.advance({type: 'battle-result', result: result.completion});
            void refresh().catch(error => reportError('战斗返回', error));
          }});
        if (isCurrent() && session === calledSession && session.state.execution.status === 'battle'
            && player.dataset.simulationReady !== 'true') {
          choice.workbench.advance({type: 'battle-result', result: {outcome: 'unknown', confirmed: false,
            missing: [player.querySelector('[data-simulation-error]').textContent]}});
          return refresh();
        }
      }
      if (!battle) domainId = null;
      let painted = [];
      if (!battle && node && running?.execution.status !== 'returned') {
        const confirmation = state.project.ui.construction.menu_dispatch_data.previews.find(row =>
          row.id === 'constructor:field-dialogue-choice-list');
        preview = node.publishedPreview || (node.pause.kind === 'choice' ? confirmation : fieldMenuInteractionPreview(node.record, 'field-dialogue'));
        if (preview) {
          preview = structuredClone(preview);
          preview.runtime_context = {...preview.runtime_context, save_slot: choice.slot,
            ...(node.record ? {confirmed_waits: node.pause.confirmedWaits ?? 0,
              choice_index: running?.selections.choice ?? 0} : {})};
          if (node.record) preview.layers = preview.layers.map(layer => layer.dialogue_runtime && !layer.glyph_cache_only
            ? {...layer, ...(node.record ? {record: node.record} : {}), inline_confirm: node.pause.kind === 'choice',
              dialogue_terminal_wait: node.pause.kind !== 'choice'} : layer);
          if (!choice.path && choice.page && preview.layers.some(layer => layer.record === choice.page.record)) {
            preview.runtime_context.confirmed_waits = choice.page.confirmedWaits;
            preview.layers = preview.layers.map(layer => layer.record === choice.page.record && layer.dialogue_runtime
              ? {...layer, page_index: choice.page.pageIndex} : layer);
          }
          if (running) preview.service_preview_state = {values: running.fields, selection: running.context, conditions: []};
          const areas = interfacePreviewContext().scene ? [{id: 'scene', label: '场景', visible: true,
            bounds: {x: 0, y: 0, width: 256, height: 144}}, ...node.regions] : node.regions;
          painted = await paintInterfaceStateFrame(canvas, areas, {resolve: () => preview,
            paint: (surface, source) => paintUiConstructionSemanticPreview(surface, source, {isCurrent, backgroundCanvas: canvas}),
            read: uiConstructionPreviewRegion, isCurrent});
        } else {canvas.getContext('2d').fillStyle = '#000'; canvas.getContext('2d').fillRect(0, 0, 256, 240);}
      } else if (!battle) {canvas.getContext('2d').fillStyle = '#000'; canvas.getContext('2d').fillRect(0, 0, 256, 240);}
      if (!isCurrent()) return;
      const declaredState = (interfaceDocument.interfaces || []).flatMap(row => row.states || [])
        .find(row => row.id === node?.publishedPreview?.interface_state_id);
      const stateLabel = node?.record ? `${node.pause.kind === 'choice' ? '选择' : '对话'} · ${uiRecordComponentLabel(node.record,
        {fallback: '正文'})} · ${node.pause.ordinal + 1}` : declaredState?.label || (node?.publishedPreview ? '对话' : node?.label) || '对话';
      widgets = await interfaceStateTree({label: stateLabel, regions: painted || []}, (area, components) => ({children:
        [...new Set(components.map(row => row.recordId).filter(Boolean))].map(recordId => {
          const layout = preview?.layers.some(layer => layer.kind === 'layout' && layer.record === recordId);
          const image = !recordId.startsWith('record:');
          const sources = components.filter(row => row.recordId === recordId);
          return {id: recordId, ...(image ? {sourceRecord: recordId} : {recordId, layout}),
            label: recordId === node.record ? '正文' : image ? uiImageComponentLabel(recordId)
              : uiRecordComponentLabel(recordId, {layout}),
            kind: image ? 'image' : layout ? 'layout' : 'text', depth: 2,
            bounds: interfaceComponentBounds(sources), components: sources};
        })}));
      const object = root.querySelector('[data-dialogue-object]');
      object.innerHTML = fieldMenuObjectMarkup('field-dialogue', interfacePreviewEntityTypes(interfaceValueContext(preview, 'field-dialogue')));
      bindFieldMenuObject(object, {rerender: async () => {await initialize(); await refresh();}});
      widgets.push({id: 'fonts', label: '文字排版', kind: 'group', depth: 1,
        markup: '<a class="editor-inline-link" href="?view=text&amp;textMode=fonts">字形 ↗</a>'},
      {id: 'wait', label: '等待标记', kind: 'image', depth: 1,
        markup: '<a class="editor-inline-link" href="?view=interfaceui&amp;interface=common-elements">公共界面元素 ↗</a>'},
      {id: 'choice', label: '选择框', kind: 'layout', depth: 1});
      const body = preview?.layers.find(layer => layer.dialogue_runtime && !layer.glyph_cache_only)?.record;
      const frames = body ? dialoguePreviewFrames(body) : [];
      const bodyWidget = widgets.find(row => row.recordId === body);
      if (frames.length > 1 && bodyWidget) widgets.splice(widgets.indexOf(bodyWidget) + 1, 0,
        ...frames.map((frame, index) => ({id: `${body}:page:${index}`, parentId: bodyWidget.id,
        label: `第 ${index + 1} 页`, kind: 'text', depth: bodyWidget.depth + 1,
        page: {record: body, confirmedWaits: frame.confirmedWaits, pageIndex: frame.pageIndex},
        markup: `<pre class="interface-dialogue-body">${esc(frame.text)}</pre>${currentTextReferenceLink(body, '文字来源')}`})));
      root.querySelector('[data-dialogue-tree]').innerHTML = elementTree({nodes: widgets, selectedId: choice.widget,
        buttonAttributes: widget => ({'data-dialogue-widget': widget.id})});
      if (!keepInspector) await inspector();
      choice.workbench.refreshGraph(root);
      root.querySelector('[data-dialogue-full-graph]').setAttribute('aria-pressed', String(choice.fullGraph));
      choice.workbench.bind(root, {cacheKey: `${namespace}:${model.entry.id}`});
      canvas.dataset.dialogueState = choice.node;
      canvas.dataset.dialoguePainted = '1';
      root.dataset.dialogueReady = '1';
    } finally {if (isCurrent()) delete root.dataset.dialogueRefreshing;}
  };
  await initialize();
  if (!currentPage()) return;
  bindScreenWorkbenchZoom({namespace, root: root.parentElement});
  bindScreenWorkbenchBottomResize({namespace, root: root.parentElement});
  root.addEventListener('click', event => {
    const node = event.target.closest('[data-dialogue-node]'), edge = event.target.closest('[data-dialogue-edge]');
    const widget = event.target.closest('[data-dialogue-widget]'), input = event.target.closest('[data-dialogue-input]');
    if (node) {choice.path = ''; choice.node = node.dataset.dialogueNode; choice.edge = null; choice.page = null;}
    else if (edge) choice.edge = edge.dataset.dialogueEdge;
    else if (widget) {
      choice.workbench.selectComponent(widget.dataset.dialogueWidget);
      const page = widgets.find(row => row.id === choice.widget)?.page;
      if (page) {choice.path = ''; choice.page = page;}
    }
    else if (input) choice.workbench.advance({type: input.dataset.dialogueInput});
    else if (event.target.closest('[data-dialogue-previous]')) session.previous();
    else if (event.target.closest('[data-dialogue-full-graph]')) {
      choice.fullGraph = !choice.fullGraph;
      root.querySelector('[data-dialogue-graph]').innerHTML = choice.workbench.graphMarkup();
    }
    else return;
    void refresh().catch(error => reportError('对话状态', error));
  });
  root.querySelector('[data-dialogue-path]').addEventListener('change', event => {
    choice.path = event.target.value;
    choice.page = null;
    void choice.workbench.initialize().then(refresh).catch(error => reportError('对话路径', error));
  });
  root.querySelector('[data-dialogue-slot]').addEventListener('change', event => {
    choice.slot = Number(event.target.value);
    selectInterfacePreviewContext('slot', choice.slot);
    void initialize().then(refresh).catch(error => reportError('对话预览组', error));
  });
  await bindSceneInteractionPreview(root.querySelector('[data-field-interaction-target]'), {previewInStage: true,
    repaint: async () => {await initialize(); await refresh();}, rerender});
  await bindInterfacePreviewScene(root, {rerender});
  await refresh();
}
