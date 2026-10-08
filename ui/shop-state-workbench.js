// @editor-module 商店页面共用状态机、区域预览、组件树与字段对象控件。
import {editorLog} from "../core/editor-log.js";
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {esc} from '../core/dom.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {SHOP_PAGES} from '../core/editor-pages.js';
import {currentTextReference} from '../core/resource-index.js';
import {itemNameRecordId, textRecordRuntimeWritableRanges} from '../core/text-record-project.js';
import {screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom, bindScreenWorkbenchBottomResize} from './screen-workbench.js';
import {genericShopGraphPresentation} from './generic-shop-graph.js';
import {createInterfaceStateControllerWorkbench} from './interface-state-workbench.js';
import {shopConfigurationPicker} from './shop-configuration-picker.js';
import {facilityConfigurationLabel} from '../modules/facility/configuration-summary.js';
import {bindReferencePicker} from './reference-picker.js';
import {fixedTextEditorMarkup, bindFixedTextEditors, fixedTextRecordRangesWithPadding} from './fixed-text-editor.js';
import {mountInterfaceWidgetFields} from './interface-state-inspector.js';
import {genericShopWidgetFields} from '../render/generic-shop-fields.js';
import {elementTree, rerenderElementTreeKeepingSelectionVisible} from './element-tree.js';
import {genericShopWidgets} from '../modules/visual/generic-shop-widgets.js';
import {paintFieldMenuIcons} from '../modules/visual/field-menu.js';
import {paintUiConstructionSemanticPreview, uiConstructionPreviewRegion} from '../modules/visual/ui-construction-preview.js';
import {resolveShopMenuPreview} from '../render/shop-menu-preview.js';
import {resolveServiceConditionPreview} from '../render/service-condition-preview.js';
import {genericShopParty} from '../render/generic-shop-service-preview.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {genericShopFramePlan, genericShopPreviewSnapshot, genericShopRegionSlots, startGenericShopExecution} from '../render/generic-shop-context.js';
import {paintInterfaceStateFrame} from '../modules/visual/interface-state-frame.js';
import {genericShopGraph, genericShopPaths, genericShopPreview, genericShopSelection} from '../render/generic-shop-model.js';
import {SIMPLE_SERVICE_COMMANDS} from '../render/simple-service-model.js';
import {LIST_QUANTITY_COMMANDS} from '../render/list-quantity-service-model.js';
import {SPECIAL_SERVICE_COMMANDS} from '../render/special-service-model.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../modules/scene/components.js';
import {interfacePreviewSceneMarkup, bindInterfacePreviewScene} from './interface-preview-scene.js';
import '../modules/shell/components.js';

export function createShopStateWorkbench({namespace = 'generic-shop', selection, fixedFamily = null,
  fixedCommand = null, toolbarMarkup = '', mountComponent = null,
  onInstanceChange = () => {}, widgetFields = () => [], inspectorMarkup = '',
  bindInspector = async () => {}, evidenceVisible = true, previewScene = false,
  pathsInPreview = false, startAtEntry = false, quantityPreview = false, getEntry = () => '',
  componentNodes = () => [], previewFor = preview => preview, decoratePreview = preview => preview, previewToolbarMarkup = '',
  bindPreviewControls = () => {}, onNodeChange = () => {}} = {}) {
  let model, workbench;
  const paintGenerations = new WeakMap();
  const inspectorGenerations = new WeakMap();

  function previewDependencies() {
    return {context: structuredClone(interfacePreviewContext()),
      text: state.project.text_record_edits,
      readFields: () => ensureSaveCurrentFieldObjects(state),
      readDocument: resource => resource.startsWith('project.') ? db.getDocument(resource) : db.getResourceDocument(resource),
      readInterfaces: () => db.getDocument('project.ui.interfaces'),
      readField: (resource, handle, name) => db.getField(resource, handle, name),
      resolveConditions: preview => resolveServiceConditionPreview(previewFor(preview, model)),
      resolveMenu: async preview => decoratePreview(await resolveShopMenuPreview(preview), model)};
  }

  async function readParty(command) {
    return genericShopParty(command, {fields: await ensureSaveCurrentFieldObjects(state), context: interfacePreviewContext()});
  }

  function resetPreviewHistory() {
    const selected = selection();
    selected.previewSession = new InterfacePreviewSession({context: interfacePreviewContext()});
    selected.previewPositions = new Map();
    delete selected.executionAdapter;
    delete selected.restoredPreview;
  }

  async function prepareModel() {
    const selected = selection();
    const [facilities, configuration, dispatch, interfaces] = await Promise.all([
      db.getDocument('project.facilities'), db.getResourceDocument('facility-config'),
      db.getDocument('project.ui.dispatch'), db.getDocument('project.ui.interfaces'),
    ]);
    const shopFamilies = new Set(SHOP_PAGES.map(page => page.route.shopFamily));
    const families = facilities.configuration_loader.pointer_entries.filter(entry => shopFamilies.has(entry.family_id)
      &&
      configuration.families.some(family => Number(family.id) === Number(entry.family_id))
      && facilities.applications.commands.some(command => command.configuration_family?.family_id === entry.family_id));
    families.push(...facilities.applications.commands.filter(command => [...SIMPLE_SERVICE_COMMANDS, ...LIST_QUANTITY_COMMANDS, ...SPECIAL_SERVICE_COMMANDS].includes(command.command_id)
      && !command.configuration_family).map(command => ({family_id: 0x100 + command.command_id,
        command_id: command.command_id, label: command.label})));
    if (fixedFamily != null) selected.family = fixedFamily;
    if (fixedFamily != null && !families.some(entry => entry.family_id === fixedFamily))
      throw new TypeError('商店缺少所属类型的状态机');
    const requestedCommand = fixedCommand == null ? null : facilities.applications.commands.find(row => row.command_id === fixedCommand);
    const family = requestedCommand ? {...families.find(entry => entry.family_id === requestedCommand.configuration_family?.family_id),
      family_id: requestedCommand.configuration_family?.family_id ?? 0x100 + fixedCommand,
      command_id: fixedCommand, label: requestedCommand.label} : families.find(entry => entry.family_id === selected.family) || families[0];
    selected.family = family.family_id;
    const aliases = configuration.families.find(row => Number(row.id) === selected.family)?.records
      || [{id: 0, record_id: null}];
    if (fixedCommand == null && !aliases.some(row => row.id === selected.instance)) {
      selected.instance = aliases[0].id;
      if (fixedFamily != null) onInstanceChange(selected.instance);
    }
    const alias = aliases.find(row => row.id === selected.instance);
    const record = configuration.records.find(row => row.id === alias?.record_id) || {id: null, slots: []};
    const command = requestedCommand || facilities.applications.commands.find(row => family.command_id === row.command_id
      || row.configuration_family?.family_id === selected.family);
    const previews = dispatch.previews;
    const context = interfacePreviewContext();
    const graph = genericShopGraph(command, state.project.text_record_edits, previews, interfaces.application_branch_sources,
      {catalog: interfaces, invocation: {sceneId: context.scene?.sceneId, argument: selected.instance}});
    const entry = getEntry();
    if (entry !== selected.entryRequest) {
      const entryState = entry?.split(':state:').at(-1);
      const component = componentNodes({command, family, record, graph, previews})
        .find(widget => widget.serviceFragment === entry);
      const target = startAtEntry && entry === command.dialogue_flow?.segments[0]?.id
        ? graph.nodes.find(node => node.id === graph.entry) : graph.nodes.find(node => {
        const preview = genericShopPreview(node, command, previews)?.preview;
        return node.id === component?.nodeId || node.id === entry || node.segment?.id === entry || node.action?.id === entry
          || preview?.id === entry || preview?.interface_entry_id === entry || preview?.interface_state_id === entryState;
      }) || graph.nodes.find(node => node.segment?.actions?.some(action => action.id === entry));
      if (target) {
        selected.node = target.id;
        selected.widget = component?.id || 'screen'; selected.edge = null; selected.path = ''; selected.step = 0;
        resetPreviewHistory();
      }
      if (component) selected.widget = component.id;
      selected.entryRequest = entry;
    }
    const party = graph.basic ? await readParty(command) : null;
    const paths = genericShopPaths(graph, party?.count);
    if (!graph.nodes.some(node => node.id === selected.node)) selected.node = startAtEntry || fixedCommand != null ? graph.entry : graph.nodes.find(node =>
      node.binding === 'buy-sell' && genericShopPreview(node, command, previews))?.id
      || graph.nodes.find(node => genericShopPreview(node, command, previews))?.id || graph.entry;
    if (selected.path !== 'input' && !paths.some(path => path.id === selected.path && path.available)) selected.path = '';
    model = {command, family, record, graph, paths, previews, party};
    const commandDocument = await db.getResourceDocument(`application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`);
    workbench = createInterfaceStateControllerWorkbench({command: commandDocument, selection,
      contextRequirements: ['preview-context', 'save-fields', 'service-invocation'],
      entry: {instance: selected.instance, request: entry, caller: context.scene || null},
      graph: () => model.graph, paths: () => model.paths,
      presentation: genericShopGraphPresentation, available: node => genericShopPreview(node, model.command, model.previews),
      initialize: graph.basic || graph.service || graph.device
        ? () => startGenericShopExecution(model, selection(), previewDependencies()) : null,
      inputs: () => {
        const snapshot = selection().path && selection().previewSession?.state;
        if (snapshot?.execution?.status !== 'waiting') return [];
        const options = selection().executionAdapter.options(snapshot);
        return [...(options.length ? ['up', 'down', 'left', 'right', 'option'] : []), 'a', 'b',
          ...(snapshot.pause?.quantity ? ['amount'] : []),
          ...([0x2C, 0x22].includes(model.command.command_id) ? ['random'] : []),
          ...(model.command.command_id === 0x2C && snapshot.control === 0 ? ['amount'] : [])];
      },
      preview: () => genericShopFramePlan(model, selection(), previewDependencies()),
      references: () => record.id ? [{resourceId: 'facility-config', handle: record.id, field: null}] : [],
      components: {
        current: () => model.widgets || [], selected: () => selection().widget,
        select: id => {selection().widget = id; selection().edge = null;},
        fields: id => {
          const widget = model.widgets?.find(row => row.id === id);
          if (!widget) return [];
          const records = [...new Set([widget.record, ...(widget.components || []).map(component => component.recordId)].filter(Boolean))];
          return [...records.map(handle => ({resourceId: 'text-record', handle, field: null})),
          ...(widget.textEditor ? [{resource: 'text-record', handle: widget.textEditor.recordId}] : []),
          ...genericShopWidgetFields(widget, {mode: genericShopPreview(model.graph.nodes.find(node =>
            node.id === selection().node), model.command, model.previews)?.preview?.shop_menu?.mode,
          record: model.record, family: model.family}), ...widgetFields(widget, model)];
        },
        mount: (...args) => inspector(...args),
      }});
    return {families, family, aliases, configuration, paths, graph, command, previews};
  }

  async function render() {
    const selected = selection();
    const {families, family, aliases, configuration, paths, graph, command, previews} = await prepareModel();
    const instanceFamily = {...family, records: aliases.map(row => ({...row,
      values: configuration.records.find(record => record.id === row.record_id)?.slots.map(slot => slot.value) || []}))};
    const instancePicker = shopConfigurationPicker({family: instanceFamily, recordId: selected.instance,
      controlAttribute: 'data-generic-instance', label: '门店',
      labelForRecord: record => facilityConfigurationLabel({...family, id: record.id},
        record.values, record.id, {showHandle: false}),
      productsForRecord: (_family, record) => record.values.map(value => {
        const item = family.value_namespace?.namespace === 'item'
          ? state.project.game_data.items.records.find(row => row.id === value) : null;
        const good = family.value_namespace?.goods?.find(row => row.value === value);
        return {item, label: currentTextReference(item ? itemNameRecordId(item) : good?.text_record).label || String(value)};
      })});
    const context = interfacePreviewContext();
    const pathMarkup = `<label class="screen-workbench-selection">路径 <select data-generic-path><option value="">自由查看</option>${graph.basic || graph.service || graph.device ? '<option value="input">输入推进</option>' : ''}${paths.map(path =>
      `<option value="${path.id}"${path.id === selected.path ? ' selected' : ''}${path.available ? '' : ' disabled'}>${esc(path.label)}</option>`).join('')}</select></label>
      <button class="button" type="button" data-generic-step="-1"${!selected.path || selected.step === 0 ? ' disabled' : ''}>上一步</button>
      <button class="button" type="button" data-generic-step="1"${!selected.path || selected.step >= (paths.find(path => path.id === selected.path)?.nodes.length || 0) - 1 ? ' disabled' : ''}>下一步</button>
      <span data-generic-path-position></span>`;
    return screenWorkbench({namespace, className: 'generic-shop-workbench', heightMode: 'fill', bottomSize: 'resizable', bottomFit: true,
      toolbarMarkup: `<div class="screen-workbench-stage-toolbar">${toolbarMarkup}${fixedFamily == null && fixedCommand == null ? `<label class="screen-workbench-selection">商店类型 <select data-generic-family>${families.map(entry =>
        `<option value="${entry.family_id}"${entry.family_id === selected.family ? ' selected' : ''}>${esc(entry.label)}</option>`).join('')}</select></label>` : ''}
        <span${model.record.id && fixedCommand == null ? '' : ' hidden'}>${instancePicker}</span>${pathsInPreview ? '' : pathMarkup}</div>`,
      treeTitle: '组件树', treeMarkup: '<div data-generic-widget-tree></div>',
      stageMarkup: screenWorkbenchCanvasStage({namespace, sizing: 'fill',
        toolbarMarkup: `${pathsInPreview ? pathMarkup : ''}<label class="screen-workbench-selection">预览组 <select data-generic-preview="slot">${[1, 2, 3].map(slot => `<option${slot === context.slot ? ' selected' : ''}>${slot}</option>`).join('')}</select></label>
          <label class="screen-workbench-selection">人物 <select data-generic-preview="role">${['猎人', '机械师', '战士'].map((label, index) => `<option value="${index}"${index === context.role ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
          <label class="screen-workbench-selection">战车 <select data-generic-preview="vehicle">${Array.from({length: 11}, (_, index) => `<option value="${index}"${index === context.vehicle ? ' selected' : ''}>${index + 1}</option>`).join('')}</select></label>
          <label class="screen-workbench-selection"${graph.basic ? '' : ' hidden'}><input type="checkbox" data-generic-object-selected${selected.objectSelected ? ' checked' : ''}>已选过对象</label>
          <span data-generic-inputs hidden><select data-generic-option aria-label="输入选项"></select>${[['up', '↑'], ['down', '↓'], ['left', '←'], ['right', '→'], ['a', 'A'], ['b', 'B']].map(([input, label]) =>
            `<button class="button" type="button" data-generic-input="${input}">${label}</button>`).join('')}</span>
          <span data-generic-trade-inputs hidden><label>报价 <input type="number" data-generic-amount min="0" max="9999999" step="1" aria-label="交易报价"></label>
            <label>随机输入 <input type="number" data-generic-random min="0" max="255" step="1" aria-label="随机输入"></label></span>
          <label data-generic-quantity-input hidden>数量 <input type="number" data-generic-quantity min="0" step="1" aria-label="数量"></label>${previewToolbarMarkup}${previewScene ? interfacePreviewSceneMarkup() : ''}`,
        canvasMarkup: '<canvas width="256" height="240" data-generic-canvas aria-label="通用商店状态画面"></canvas>',
        zoomStatusMarkup: '<span data-generic-temporary></span><span data-generic-frame-status role="status"></span>'}),
      inspectorTitle: selected.edge ? '转移' : '属性', inspectorMarkup: '<div data-generic-inspector></div>',
      bottomMarkup: workbench.graphMarkup(),
    });
  }

  async function regionPreview(root) {
    const generation = (paintGenerations.get(root) || 0) + 1;
    paintGenerations.set(root, generation);
    const isCurrent = () => root.isConnected && paintGenerations.get(root) === generation;
    const selected = selection(), node = model.graph.nodes.find(node => node.id === selected.node);
    const source = genericShopPreview(node, model.command, model.previews);
    const canvas = root.querySelector('[data-generic-canvas]'), context = canvas.getContext('2d');
    const clearFrame = () => {
      if (model.graph.device) context.clearRect(0, 0, 256, 240);
      else {context.fillStyle = '#000'; context.fillRect(0, 0, 256, 240);}
    };
    canvas.dataset.genericPainting = '';
    root.querySelector('[data-generic-frame-status]').textContent = '';
    if (selected.executionAdapter && selected.path && selected.previewSession.state.execution.status === 'returned') {
      clearFrame();
      root.querySelector('[data-generic-temporary]').textContent = '已返回场景交互';
      canvas.dataset.genericState = node.id;
      canvas.dataset.genericRegions = '[]';
      delete canvas.uiGenericShopFrame;
      delete canvas.dataset.genericPainting;
      return {regions: [], source: null, temporary: []};
    }
    if (!source) {
      clearFrame();
      root.querySelector('[data-generic-temporary]').textContent = selected.previewSession.state.execution?.callLabel || '';
      canvas.dataset.genericState = node.id;
      delete canvas.uiGenericShopFrame;
      delete canvas.dataset.genericRegions;
      delete canvas.dataset.genericPainting;
      return {regions: node.regions.map(region => ({...region, sources: [region.source], components: []})), source: null, temporary: []};
    }
    try {
      const plan = selected.restoredPreview?.domainResults.framePlan || await workbench.preview();
      if (!isCurrent()) return null;
      const {preview, lower} = plan;
      const regions = await paintInterfaceStateFrame(canvas, node.regions, {
        resolve: region => plan.contents[region.id],
        paint: (surface, regionSource) => paintUiConstructionSemanticPreview(surface, regionSource,
          {isCurrent, backgroundCanvas: canvas}),
        read: uiConstructionPreviewRegion, isCurrent,
        decorate: (region, {area, source: regionSource}) => {
          const slots = genericShopRegionSlots(area, region, model.previews);
          const label = region.id === 'selection' ? slots.some(slot => /^submenu-(role|vehicle):/u.test(slot.id))
            ? '人物·战车选择' : '主菜单' : region.label;
          return {...region, label, ...(region.id === 'selection' && lower
            ? {cursor: lower.cursor, dependsOn: lower.dependsOn, retention: '对象列表保留至退出商店'} : {}),
            sources: [region.source, region.reference, regionSource.id,
              ...new Set(region.components.map(component => component.recordId).filter(Boolean))],
            slots, preview: area.preview};
        }});
      if (!regions || !isCurrent()) return null;
      if (!selected.previewSession) resetPreviewHistory();
      if (selected.executionAdapter && selected.path) {
        selected.previewSession.project({windows: Object.entries(plan.contents).map(([id, content]) => ({id, content})),
          domainResults: {...selected.previewSession.state.domainResults, framePlan: plan}});
      } else if (!selected.restoredPreview) {
        selected.previewSession.capture(genericShopPreviewSnapshot(model, selected, plan, interfacePreviewContext()));
        if (selected.path) selected.previewPositions.set(selected.step, selected.previewSession.position);
      }
      delete selected.restoredPreview;
      const execution = selected.executionAdapter && selected.path ? selected.previewSession.state.execution : null;
      root.querySelector('[data-generic-temporary]').textContent = execution
        ? model.graph.device ? execution.reason || node.label
          : `金钱 ${selected.previewSession.state.fields[`save.slot.${selected.previewSession.state.context.slot}.gold`]} · 成交 ${execution.transactions.length}${execution.reason ? ` · 未确认：${execution.reason}` : execution.status === 'returned' ? ' · 已返回场景交互' : ''}`
        : preview.service_preview_state?.conditions.length
        ? `已临时满足：${preview.service_preview_state.conditions.map(row => row.label).join('、')}` : '';
      root.querySelector('[data-generic-temporary]').title = root.querySelector('[data-generic-temporary]').textContent;
      canvas.dataset.genericState = node.id;
      canvas.dataset.genericRegions = JSON.stringify(regions.map(({components, slots, preview, ...region}) => region));
      canvas.uiGenericShopFrame = {regions, preview};
      return {regions, source, temporary: preview.service_preview_state?.conditions || []};
    } catch (error) {
      editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
      if (isCurrent()) {
        const status = root.querySelector('[data-generic-frame-status]');
        status.textContent = status.title = error.message;
      }
      return null;
    } finally {
      if (isCurrent()) delete canvas.dataset.genericPainting;
    }
  }

  function retainScrollRange(scroller, content) {
    content.style.minHeight = scroller.scrollTop > 0 ? `${content.getBoundingClientRect().height}px` : '';
  }

  function widgetFactsMarkup(widget) {
    const {bounds, components = []} = widget;
    return `<dl class="screen-workbench-facts"><div><dt>位置</dt><dd>${bounds.x}, ${bounds.y}</dd></div>
      <div><dt>尺寸</dt><dd>${bounds.width} × ${bounds.height}</dd></div>
      <div><dt>来源</dt><dd>${esc([...new Set(components.map(row => row.recordId))].join('、'))}</dd></div></dl>`;
  }

  function positionRuntimePanel(root) {
    const panel = root.ownerDocument.querySelector('[data-runtime-page-panel]');
    if (!panel) return;
    panel.open = false;
    root.querySelector('.workspace-inspector').append(panel);
  }

  async function inspector(root, result, rerender) {
    const generation = (inspectorGenerations.get(root) || 0) + 1;
    inspectorGenerations.set(root, generation);
    const isCurrent = () => root.isConnected && inspectorGenerations.get(root) === generation;
    const selected = selection(), host = root.querySelector('[data-generic-inspector]');
    const edge = model.graph.edges.find(edge => edge.id === selected.edge);
    if (edge) {
      root.querySelector('.workspace-inspector > h3').textContent = '转移';
      const members = model.graph.edges.filter(row => row.id === edge.id || selected.edgeIds?.includes(row.id));
      host.innerHTML = `<dl><dt>输入 / 选项</dt><dd>${esc([...new Set(members.map(row => row.input))].join(' / '))}</dd><dt>条件</dt><dd>${esc([...new Set(members.map(row => row.condition).filter(Boolean))].join('；') || '无附加条件')}</dd>
        <dt>来源</dt><dd>${esc(model.graph.nodes.find(node => node.id === edge.from)?.label)}</dd><dt>去向</dt><dd>${esc(model.graph.nodes.find(node => node.id === edge.to)?.label || '应用返回')}</dd>${evidenceVisible ? `<dt>证据</dt><dd>${esc(edge.evidence || '未确认')}</dd>` : ''}</dl>
        ${members.map(member => `<h4>${esc(member.input)}</h4>${member.routes.map(route => `<p>控制段：${route.controls.map(index => String(index).padStart(2, '0')).join(' → ')}${route.arrival == null ? '' : ` → ${String(route.arrival).padStart(2, '0')}（到输入等待）`}</p>${route.declarations.map(row =>
          `<dl><dt>${esc(row.label)} · ${row.confirmed ? '局部已确认' : '未确认'}</dt><dd>读取：${esc(row.reads.join('、'))}</dd><dd>效果：${esc(row.writes.join('、') || '无写入')}</dd>${evidenceVisible ? `<dd>证据：${esc(row.evidence)}</dd>` : ''}</dl>`).join('')}`).join('')}`).join('')}`;
      return;
    }
    const declarations = result?.regions || [];
    const widget = model.widgets.find(row => row.id === selected.widget);
    const region = widget?.region;
    const node = model.graph.nodes.find(node => node.id === selected.node);
    root.querySelector('.workspace-inspector > h3').textContent = widget?.label || '属性';
    if (mountComponent && await mountComponent(host, widget, {model, rerender, isCurrent})) return;
    if (widget?.textEditor) {
      host.innerHTML = fixedTextEditorMarkup({...widget.textEditor, editorId: `${namespace}:${widget.id}`, label: widget.label});
      await bindFixedTextEditors(host, {onSaved: ({reset}) => rerender({refreshInspector: Boolean(reset)})})?.ready;
      if (isCurrent()) positionRuntimePanel(root);
      return;
    }
    if (!region) {
      const snapshot = selected.executionAdapter && selected.path && (model.graph.special || model.graph.device)
        ? selected.previewSession.state.domainResults : null;
      const laserItem = snapshot?.laser && state.project.game_data.items.records.find(row => row.id === snapshot.laser.item);
      host.innerHTML = `${node.pause.kind === 'unknown' && node.publishedPreview ? '' : `<p>${esc(node.input)}</p>`}${result?.temporary.length ? `<p>服务临时状态：${result.temporary.map(row => esc(row.label)).join('、')}</p>` : ''}
      ${selected.executionAdapter && selected.path ? `<p class="muted">快照按当前字段推进；未确认效果在提交前停下。${evidenceVisible ? `<br>证据：${esc(selected.executionAdapter.evidence)}` : ''}</p>` : ''}
      ${snapshot?.party ? `<dl><dt>当前队伍</dt><dd>${snapshot.party.map(row => esc(`${['猎人', '机械师', '战士'][row.role]}：${row.status === 255 ? '尸体' : '存活'} · ${row.vehicle < 128 ? `战车 ${row.vehicle + 1}` : '步行'}`)).join('<br>')}</dd></dl>` : ''}
      ${snapshot?.laser ? `<dl><dt>镜片排列</dt><dd>${snapshot.laser.arrangement.map(id => id ? id.toString(16).toUpperCase() : '空').join(' → ')}</dd><dt>组合结果</dt><dd>${esc(`物品 ${snapshot.laser.item.toString(16).toUpperCase()}${laserItem ? ` · ${currentTextReference(itemNameRecordId(laserItem)).label}` : ''}`)}</dd></dl>` : ''}
      ${snapshot?.parkedVehicle ? `<p>${esc(snapshot.parkedVehicle.positionStatus)}</p>` : ''}
      ${snapshot?.revival ? `<p>${esc(snapshot.revival.animationStatus)}</p>` : ''}
      ${snapshot?.call ? `<p>结局交接：${esc(snapshot.call.pendingEffects.join('、'))}</p>` : ''}
      ${snapshot?.scene ? scenePositionPickerMarkup({entries: state.project.scenes?.editable_scenes || [],
        sceneId: snapshot.scene.sceneId, x: snapshot.scene.x, y: snapshot.scene.y, readOnly: true, label: '到达楼层'}) : ''}
      ${snapshot?.donation ? `<p>${snapshot.donation.paid ? `已扣款 ${snapshot.donation.amount}` : '未扣款'} · 事件 ${esc(snapshot.donation.event)} ${snapshot.donation.eventSet ? '已置位' : '未置位'}<br>捐款自然入口未确认</p>` : ''}
      ${evidenceVisible ? `<p class="muted">输入等待证据：${esc(node.pause.evidence || '未确认')}</p>` : ''}<table class="generic-shop-declarations"><thead><tr><th>区域</th><th>显隐</th><th>光标</th></tr></thead><tbody>${node.regions.map(row => {
      const declaration = declarations.find(item => item.id === row.id);
      return `<tr><td>${esc(declaration?.label || row.label)}</td><td>${declaration?.visible == null ? '未确认' : declaration.visible ? '显示' : '隐藏'}</td><td>${declaration?.cursor ? '◀' : ''}</td></tr>`;
    }).join('')}</tbody></table>${inspectorMarkup}<div data-generic-field-controls></div>`;
      await mountInterfaceWidgetFields(host.querySelector('[data-generic-field-controls]'), widgetFields(widget, model),
        {getObject: (resource, handle) => db.getFieldObject(resource, handle), isCurrent});
      if (!isCurrent()) return;
      await bindInspector(host, {rerender, isCurrent});
      if (!isCurrent()) return;
      host.querySelectorAll('[data-scene-position-picker]').forEach(picker =>
        hydrateScenePositionPicker(picker, {entries: state.project.scenes?.editable_scenes || []}));
      return;
    }
    const components = widget.components || [];
    host.innerHTML = `${widgetFactsMarkup(widget)}
      <div data-generic-field-controls></div><div data-generic-text-controls></div>`;
    const fieldHost = host.querySelector('[data-generic-field-controls]');
    const mode = result?.source?.preview.shop_menu?.mode;
    await mountInterfaceWidgetFields(fieldHost, [...genericShopWidgetFields(widget,
      {mode, record: model.record, family: model.family}), ...widgetFields(widget, model)],
    {getObject: (resource, handle) => db.getFieldObject(resource, handle), isCurrent});
    if (!isCurrent()) return;
    if (region === 'selection') {
      host.querySelector('[data-generic-field-controls]').innerHTML = widget.controlsMarkup || '';
      await paintFieldMenuIcons(root);
      return;
    }
    const records = new Map();
    for (const component of components) {
      if (typeof component.recordId !== 'string' || !component.recordId.startsWith('record:')
          || component.recordId.startsWith('record:03:')) continue;
      const record = state.project.text_record_edits?.records?.[component.recordId];
      if (!record?.editable) continue;
      if (!Number.isInteger(component.offset) || !Number.isInteger(component.length) || component.length < 1) continue;
      if (!textRecordRuntimeWritableRanges(record).some(range => component.offset >= range.offset
        && component.offset + component.length <= range.offset + range.length)) continue;
      if (!records.has(component.recordId)) records.set(component.recordId, new Map());
      records.get(component.recordId).set(component.offset, component.length);
    }
    const textHost = host.querySelector('[data-generic-text-controls]');
    textHost.innerHTML = [...records].map(([recordId, ranges]) =>
      fixedTextEditorMarkup({recordId, editorId: `${namespace}:${region}:${recordId}`, compact: true,
        ranges: fixedTextRecordRangesWithPadding(recordId,
          [...ranges].sort(([a], [b]) => a - b).map(([offset, length]) => ({offset, length})))
          .reduce((merged, {offset, length}) => {
          const last = merged.at(-1);
          if (last && offset <= last.offset + last.length) last.length = Math.max(last.length, offset + length - last.offset);
          else merged.push({offset, length});
          return merged;
        }, []), label: widget.label})).join('');
    await bindFixedTextEditors(textHost, {
      onDraft: () => {root.querySelector('[data-generic-canvas]').dataset.genericPainting = '';},
      onSaved: rerender,
      onState: () => {
        if (host.querySelector('[aria-invalid="true"]')) delete root.querySelector('[data-generic-canvas]').dataset.genericPainting;
      },
    })?.ready;
    if (!isCurrent()) return;
    positionRuntimePanel(root);
  }

  async function bind(root, {rerender}) {
    root = root.querySelector(`[data-screen-workbench="${namespace}"]`);
    if (!root) return;
    const selected = selection();
    if (!selected.previewSession) resetPreviewHistory();
    const report = error => {
      if (root.isConnected) {
        const status = root.querySelector('[data-generic-frame-status]');
        status.textContent = status.title = error.message;
      }
    };
    let result = null, refreshGeneration = 0, selectionGeneration = 0;
    const graphController = workbench.bind(root, {cacheKey: `${namespace}-graph:${selected.family}`});
    const refreshSelection = async ({keepInspector = false} = {}) => {
      const generation = ++selectionGeneration;
      root.dataset.genericSelecting = '';
      root.querySelectorAll('[data-generic-widget]').forEach(button =>
        button.closest('.element-tree-node').classList.toggle('is-selected', button.dataset.genericWidget === selected.widget));
      root.querySelectorAll('[data-generic-edge]').forEach(edge =>
        edge.classList.toggle('selected', JSON.parse(edge.dataset.genericEdgeIds).includes(selected.edge)));
      const widget = model.widgets?.find(row => row.id === selected.widget);
      const bounds = !selected.edge && widget?.bounds;
      let outline = root.querySelector('[data-interface-selection]');
      if (bounds) {
        if (!outline) {
          outline = document.createElement('div');
          outline.dataset.interfaceSelection = '';
          root.querySelector('[data-generic-canvas]').parentElement.append(outline);
        }
        outline.hidden = false;
        outline.dataset.bounds = JSON.stringify(bounds);
        const {x, y, width, height} = bounds;
        Object.assign(outline.style, {left: `${x / 256 * 100}%`, top: `${y / 240 * 100}%`,
          width: `${width / 256 * 100}%`, height: `${height / 240 * 100}%`});
      } else if (outline) outline.hidden = true;
      const scroller = root.querySelector('.workspace-inspector');
      const {scrollTop, scrollLeft} = scroller;
      retainScrollRange(scroller, root.querySelector('[data-generic-inspector]'));
      try {
        if (keepInspector && bounds) {
          const facts = root.querySelector('[data-generic-inspector] > .screen-workbench-facts');
          if (facts) facts.outerHTML = widgetFactsMarkup(widget);
        } else if (!keepInspector) await inspector(root, result, ({refreshInspector = false} = {}) => refresh({reload: true,
          keepInspector: !refreshInspector && !root.hasAttribute('data-generic-selecting')}));
      }
      finally {
        if (selectionGeneration === generation) {
          scroller.scrollTop = scrollTop; scroller.scrollLeft = scrollLeft;
          delete root.dataset.genericSelecting;
        }
      }
    };
    const refresh = async ({reload = false, keepInspector = false} = {}) => {
      const generation = ++refreshGeneration;
      inspectorGenerations.set(root, (inspectorGenerations.get(root) || 0) + 1);
      const isCurrent = () => root.isConnected && refreshGeneration === generation;
      root.dataset.genericRefreshing = '';
      try {
        if (reload) {resetPreviewHistory(); await prepareModel();}
        if (!isCurrent()) return;
        if (model.graph.basic) {
          model.party = await readParty(model.command);
          if (!isCurrent()) return;
          const context = selected.executionAdapter && selected.path
            ? selected.previewSession.state.context : interfacePreviewContext();
          if (!selected.executionAdapter || !selected.path) {
            context.role = model.party.role; context.vehicle = model.party.vehicle;
          }
          root.querySelector('[data-generic-preview="role"]').value = context.role;
          root.querySelector('[data-generic-preview="vehicle"]').value = context.vehicle;
          model.paths = genericShopPaths(model.graph, model.party.count);
          const active = model.paths.find(path => path.id === selected.path);
          if (active && !selected.executionAdapter) {
            selected.step = Math.min(selected.step, active.nodes.length - 1);
            selected.node = active.nodes[selected.step];
          }
        }
        if ((model.graph.basic || model.graph.service || model.graph.device) && selected.path && !selected.executionAdapter)
          await workbench.initialize();
        if (!isCurrent()) return;
        const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
        if (execution) for (const key of ['slot', 'role', 'vehicle'])
          root.querySelector(`[data-generic-preview="${key}"]`).value = execution.context[key];
        const path = execution || model.paths.find(path => path.id === selected.path);
        const objectSelected = root.querySelector('[data-generic-object-selected]');
        objectSelected.checked = execution ? Boolean(execution.execution.objectList)
          : Boolean(genericShopSelection(model.graph, selected, model.paths, model.party?.count)?.list);
        objectSelected.disabled = Boolean(path) || !model.graph.basic || model.party.count <= 1
          || model.graph.nodes.find(node => node.id === selected.node).selectionMode !== 'switch';
        root.querySelector('[data-generic-path]').value = selected.path;
        root.querySelector('[data-generic-step="-1"]').disabled = !execution || selected.previewSession.position === 0;
        root.querySelector('[data-generic-step="1"]').disabled = !execution || execution.execution.status !== 'waiting';
        root.querySelector('[data-generic-path-position]').textContent = execution ? `输入 ${selected.previewSession.position}` : '';
        const inputs = root.querySelector('[data-generic-inputs]');
        inputs.hidden = !execution;
        const options = execution ? workbench.options(execution) : [];
        const option = root.querySelector('[data-generic-option]');
        option.innerHTML = options.map((label, index) => {
          const item = /^物品 [0-9A-F]+$/u.test(label) ? state.project.game_data.items.records.find(row =>
            row.id === Number.parseInt(label.slice(3), 16)) : null;
          const name = item ? currentTextReference(itemNameRecordId(item)).label
            : label.startsWith('record:') ? currentTextReference(label).label : label;
          return `<option value="${index}"${index === execution.selections.choice ? ' selected' : ''}>${esc(name)}</option>`;
        }).join('');
        option.hidden = !options.length;
        const tradeInputs = root.querySelector('[data-generic-trade-inputs]');
        tradeInputs.hidden = !execution || ![0x2C, 0x22].includes(model.command.command_id);
        root.querySelector('[data-generic-amount]').parentElement.hidden = model.command.command_id === 0x22;
        const quantityInput = root.querySelector('[data-generic-quantity-input]');
        const previewAmount = !execution && quantityPreview && genericShopPreview(
          model.graph.nodes.find(node => node.id === selected.node), model.command, model.previews)?.preview?.shop_menu?.service_amount;
        quantityInput.hidden = !execution?.pause?.quantity && !previewAmount;
        const quantity = root.querySelector('[data-generic-quantity]');
        quantity.value = execution?.execution.quantity?.value ?? (previewAmount ? interfacePreviewContext().service_amount ?? 0 : 0);
        quantity.max = execution?.execution.quantity?.maximum ?? (previewAmount ? 65535 : 0);
        quantity.disabled = !previewAmount && execution?.execution.status !== 'waiting';
        for (const [selector, value] of [['amount', execution?.context.service_amount], ['random', execution?.randomInputs[0]]]) {
          const control = root.querySelector(`[data-generic-${selector}]`);
          control.value = value ?? 0;
          control.disabled = execution?.execution.status !== 'waiting' || model.command.command_id === 0x2C && execution?.control !== 0;
        }
        inputs.querySelectorAll('button').forEach(button => {
          button.disabled = execution?.execution.status !== 'waiting'
            || !options.length && !['a', 'b'].includes(button.dataset.genericInput);
        });
        workbench.refreshGraph(root);
        graphController?.layout();
        const next = await regionPreview(root);
        if (!isCurrent()) return;
        const widgets = [...await genericShopWidgets(next, model.graph.nodes.find(node => node.id === selected.node), model.record, model.family),
          ...componentNodes(model, next)];
        if (!isCurrent()) return;
        result = next;
        model.widgets = widgets;
        if (!keepInspector && !widgets.some(widget => widget.id === selected.widget)) selected.widget = 'screen';
        const scroller = root.querySelector('.workspace-tree'), {scrollTop, scrollLeft} = scroller;
        retainScrollRange(scroller, root.querySelector('[data-generic-widget-tree]'));
        root.querySelector('[data-generic-widget-tree]').innerHTML = elementTree({nodes: widgets,
          selectedId: selected.widget, showIcons: false,
          buttonAttributes: widget => ({'data-generic-widget': widget.id})});
        scroller.scrollTop = scrollTop; scroller.scrollLeft = scrollLeft;
        await refreshSelection({keepInspector});
      } finally {if (isCurrent()) delete root.dataset.genericRefreshing;}
    };
    const change = (changes, {structure = false} = {}) => {
      if (['family', 'instance', 'path', 'objectSelected'].some(key => key in changes && changes[key] !== selected[key]))
        resetPreviewHistory();
      Object.assign(selected, changes);
      const update = structure ? rerenderElementTreeKeepingSelectionVisible(
        root.querySelector('.element-tree-node.is-selected > button'), rerender) : refresh();
      return update.catch(report);
    };
    const chooseNode = id => {
      if (model.widgets?.find(widget => widget.id === selected.widget)?.textEditor) selected.widget = 'screen';
      onNodeChange(model.graph.nodes.find(node => node.id === id));
      return change({node: id, edge: null, ...(selected.path ? {path: '', step: 0} : {})});
    };
    root.querySelector('[data-generic-family]')?.addEventListener('change', event => change({
      family: Number(event.target.value), instance: 0, node: null, widget: 'screen', edge: null, path: '', step: 0}, {structure: true}));
    root.querySelector('[data-generic-full-graph]').addEventListener('click', () => change({fullGraph: !selected.fullGraph, edge: null}, {structure: true}));
    const picker = root.querySelector('[data-generic-instance]')?.closest('[data-module-reference-picker]');
    bindReferencePicker(picker, {onSelect: value => {
      onInstanceChange(Number(value));
      return change({instance: Number(value)}, {structure: true});
    }});
    root.querySelector('[data-generic-path]').addEventListener('change', event => {
      const path = model.paths.find(row => row.id === event.target.value);
      if (model.widgets?.find(widget => widget.id === selected.widget)?.textEditor) selected.widget = 'screen';
      change({path: event.target.value === 'input' ? 'input' : path?.id || '', step: 0,
        node: path?.nodes[0] || selected.node, edge: null});
    });
    root.querySelector('[data-generic-object-selected]').addEventListener('change', event =>
      change({objectSelected: event.target.checked}));
    root.querySelectorAll('[data-generic-step]').forEach(button => button.addEventListener('click', () => {
      if (Number(button.dataset.genericStep) > 0) {void input({type: 'a'}).catch(report); return;}
      const snapshot = selected.previewSession?.previous();
      if (snapshot) {
        selected.restoredPreview = snapshot;
        Object.assign(interfacePreviewContext(), snapshot.context);
      }
      if (snapshot) change({step: selected.previewSession.position, node: snapshot.node, edge: null});
    }));
    const input = async value => {
      if (!selected.executionAdapter || root.hasAttribute('data-generic-refreshing')) return;
      const snapshot = workbench.advance(value);
      delete selected.restoredPreview;
      await change({step: selected.previewSession.position, node: snapshot.node, edge: null});
    };
    root.querySelectorAll('[data-generic-input]').forEach(button => button.addEventListener('click', () => {
      void input({type: button.dataset.genericInput}).catch(report);
    }));
    root.querySelector('[data-generic-option]').addEventListener('change', event => {
      void input({type: 'option', index: Number(event.target.value)}).catch(report);
    });
    for (const type of ['amount', 'random']) root.querySelector(`[data-generic-${type}]`).addEventListener('change', event => {
      void input({type, value: Number(event.target.value)}).catch(report);
    });
    root.querySelector('[data-generic-quantity]').addEventListener('change', event => {
      if (quantityPreview && !selected.executionAdapter && event.target.checkValidity()) {
        interfacePreviewContext().service_amount = Number(event.target.value);
        resetPreviewHistory();
        void refresh().catch(report);
        return;
      }
      void input({type: 'amount', value: Number(event.target.value)}).catch(report);
    });
    const activate = event => {
      const element = event.target.closest('[data-generic-node], [data-generic-edge], [data-generic-widget]');
      if (!element || !root.contains(element)) return;
      if (event.type === 'keydown') {
        if (!element.matches('[data-generic-node], [data-generic-edge]') || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
      }
      if (element.dataset.genericWidget) {
        workbench.selectComponent(element.dataset.genericWidget);
        const widget = model.widgets.find(widget => widget.id === element.dataset.genericWidget);
        if (widget?.textEditor || widget?.nodeId && widget.nodeId !== selected.node) {
          onNodeChange(model.graph.nodes.find(node => node.id === widget.nodeId));
          void change({node: widget.nodeId || selected.node, path: '', step: 0}).catch(report);
        } else void refreshSelection().catch(report);
      } else if (element.dataset.genericNode) void chooseNode(element.dataset.genericNode);
      else {
        Object.assign(selected, {edge: element.dataset.genericEdge, edgeIds: JSON.parse(element.dataset.genericEdgeIds)});
        void refreshSelection().catch(report);
      }
    };
    root.addEventListener('click', activate);
    root.addEventListener('keydown', activate);
    root.querySelectorAll('[data-generic-preview]').forEach(select => select.addEventListener('change', () => {
      resetPreviewHistory();
      interfacePreviewContext()[select.dataset.genericPreview] = Number(select.value);
      if (select.dataset.genericPreview === 'slot' && selected.path) selected.step = 0;
      void refresh().catch(report);
    }));
    root.addEventListener('field-object-saved', () => {void refresh({reload: true}).catch(report);});
    bindPreviewControls(root, {refresh: () => refresh().catch(report)});
    bindScreenWorkbenchBottomResize({namespace, root: root.parentElement});
    bindScreenWorkbenchZoom({namespace, root: root.parentElement, zoom: selected.zoom, onChange: zoom => {selected.zoom = zoom;}});
    if (previewScene) await bindInterfacePreviewScene(root, {rerender});
    try {await refresh();} catch (error) {report(error);}
  }
  return {render, bind};
}
