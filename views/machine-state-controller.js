// @editor-module 机器状态控制复用现有组件树、工作台与领域预览。
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {bindTextInputEvents, esc} from '../core/dom.js';
import {currentTextReference} from '../core/resource-index.js';
import {uiRecordComponentLabel} from '../core/ui-component-labels.js';
import {prepareModuleComponent, renderModuleComponent} from '../ui/module-components.js';
import '../modules/audio/components.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {serviceInvocation} from '../render/service-preview.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {machineServiceGraph, MACHINE_SERVICE_COMMANDS} from '../render/machine-service-model.js';
import {startMachineServiceExecution, machineServicePreview} from '../render/machine-service-context.js';
import {createInterfaceStateControllerWorkbench} from '../ui/interface-state-workbench.js';
import {bindScreenWorkbenchBottomResize} from '../ui/screen-workbench.js';
import {showEditorError} from '../ui/editor-error.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../modules/scene/components.js';
import {selectGameUiWorkbenchNode, selectedGameUiWorkbenchNode, gameUiStateComponents} from './game-ui-workbench.js';
import {battleSimulationMarkup, bindBattleSimulation} from '../ui/battle-simulation-player.js';
import {battleScenePreviewForFormation} from '../core/battle-scene-preview.js';
import {prepareViewData, ensureBattleSceneData} from '../core/view-data.js';
import {interfacePreviewSceneImage} from '../render/interface-preview-scene.js';
import {screenWorkbenchCanvasStage} from '../ui/screen-workbench.js';

const sessions = new Map();
const boundRoots = new WeakSet();
const presentation = {namespace: 'machine-state', dataPrefix: 'machine-state', exitLabel: '返回调用者', notice: ''};
const commandId = definition => definition?.commandId ?? definition?.commandIds?.[0];
const current = cid => {
  const repository = state.projectRepository;
  if (!sessions.has(repository)) sessions.set(repository, new Map());
  const commands = sessions.get(repository);
  if (!commands.has(cid)) commands.set(cid, {path: '', node: null, edge: null, fullGraph: false});
  return commands.get(cid);
};

export function machineStateControls(model, {namespace = `interface-page:${model.id}`, pageId = model.id, poster = false, targetId = null} = {}) {
  const cid = commandId(model.definition);
  if (!MACHINE_SERVICE_COMMANDS.includes(cid)) return null;
  const resource = `application-command:${cid.toString(16).toUpperCase().padStart(2, '0')}`;
  const command = db.peekResourceDocument(resource)
    || state.project.facilities?.applications?.commands.find(row => row.command_id === cid);
  const previews = state.project.ui.construction.menu_dispatch_data.previews;
  const catalog = state.project.ui.construction.interfaces || db.peekDocument('project.ui.interfaces');
  const selected = current(cid), context = interfacePreviewContext();
  const vending = [0x1B, 0x1C, 0x1D].includes(cid);
  if (vending && !context.deviceInput) context.deviceInput = {random: {high: 0, low: 0}, position: 0};
  const instance = context.service?.command === cid ? context.service.argument : 0;
  const inputKey = JSON.stringify([namespace, context.slot, instance, context.service?.entryHandle, context.scene, targetId, context.deviceInput]);
  if (selected.inputKey !== inputKey) {selected.path = ''; delete selected.session; selected.node = null;}
  selected.inputKey = inputKey;
  selected.context = structuredClone(context);
  if (!selected.path) selected.poster = poster;
  selected.posterTarget = targetId;
  selected.namespace = namespace;
  const invocation = serviceInvocation({command: cid, instance}, context.scene?.sceneId,
    context.service?.entryHandle || model.preview?.facility_screen?.entry_handle);
  selected.invocation = invocation;
  selected.model = {command, previews, graph: machineServiceGraph(command, state.project.text_record_edits, previews, catalog,
    {...invocation, poster: selected.poster})};
  selected.nodes = model.nodes;
  const graph = selected.model.graph;
  for (const node of graph.nodes) if (node.action?.record)
    node.label = uiRecordComponentLabel(node.action.record, {fallback: node.label});
  const component = selectedGameUiWorkbenchNode(namespace, model.nodes);
  const source = component?.servicePreview || model.preview;
  if (selected.path && selected.session) selected.node = selected.session.state.node;
  else if (!selected.node || selected.component !== component?.id && source) {
    selected.node = component?.serviceFragment && graph.nodes.find(row => row.action?.id === component.serviceFragment)?.id
      || source?.id && graph.nodes.find(row => row.publishedPreview?.id === source.id)?.id || graph.entry;
  }
  selected.component = component?.id;
  selected.workbench = createInterfaceStateControllerWorkbench({command, selection: () => selected,
    contextRequirements: ['preview-context', 'save-fields', 'service-invocation', 'device-inputs'],
    entry: {pageId, commandId: cid, instance, invocation, variant: selected.poster ? 'poster' : 'service', targetId},
    graph: () => selected.model.graph, presentation: {...presentation, count: `${graph.nodes.length} 个节点`},
    available: node => Boolean(node.publishedPreview), initialize: () => initialize(selected),
    inputs: () => {
      const snapshot = selected.path ? selected.session?.state : null;
      if (snapshot?.execution.status === 'waiting') return ['up', 'down', 'left', 'right', 'a', 'b',
        ...(selected.adapter.options(snapshot).length ? ['option'] : []), ...(cid === 0x37 ? ['password'] : [])];
      if (snapshot?.execution.status === 'animating') return ['frame'];
      if (snapshot?.execution.status === 'battle') return ['battle-result'];
      if (cid === 0x2D && snapshot?.execution.status === 'returned' && snapshot.domainResults.teleport?.phase === 'selected') return ['scene-entry'];
      if (cid === 0x37 && snapshot?.execution.status === 'returned'
          && !snapshot.domainResults.sceneReturn?.handoff) return ['a'];
      return [];
    },
    preview: fallback => selected.model ? machineServicePreview(selected.model, selected, fallback) : fallback,
    components: gameUiStateComponents(namespace, () => model.nodes)});
  const snapshot = selected.path ? selected.session?.state : null;
  const labels = snapshot ? selected.workbench.options(snapshot).map((label, index) => cid === 0x1A
    ? currentTextReference(`record:0D:${String(selected.goods[index]).padStart(3, '0')}`).label || `曲目 ${index + 1}`
    : label.startsWith('record:') ? currentTextReference(label).label : label) : [];
  const audio = snapshot?.domainResults.audio;
  const scene = snapshot?.domainResults.scene || snapshot?.domainResults.windowRestore?.scene;
  const tunnel = cid === 0x2D && snapshot?.execution.status === 'returned'
    && snapshot.domainResults.teleport?.phase === 'selected';
  const password = snapshot?.domainResults.password;
  const controller = snapshot?.domainResults.controller;
  const controlled = snapshot?.domainResults.controlledObjects;
  const retry = cid === 0x37 && snapshot?.execution.status === 'returned'
    && !snapshot.domainResults.sceneReturn?.handoff;
  const result = audio ? `已提交：${esc(currentTextReference(`record:0D:${String(audio.commandId).padStart(3, '0')}`).label)}
    ${renderModuleComponent('audio-command', selected.audioReference ? 'reference' : 'preview',
      selected.audioReference || {value: audio.commandId})}`
    : scene ? `${password ? password.matched ? '密码相符' : '密码不符'
      : controller ? `控制器预览：${controller.value ? '开启' : '关闭'}` : ''}${scenePositionPickerMarkup({entries: state.project.scenes?.editable_scenes || [],
      sceneId: scene.sceneId, x: scene.x, y: scene.y, readOnly: true,
      label: cid === 0x2D ? '传送落点' : cid === 0x1F ? '到达楼层' : '返回调查场景'})}`
    : password ? `${password.matched ? '密码相符' : '密码不符'}`
    : controller ? `控制器预览：${controller.value ? '开启' : '关闭'}`
    : snapshot?.execution.transactions.filter(row => row.type === 'bounty').map(row => `目标 ${row.wanted}：赏金 ${row.amount}G，余额 ${row.gold}G`).join('；') || '';
  return {toolbar: `<label class="screen-workbench-selection">路径 <select data-machine-state-path="${cid}">
      <option value="">自由查看</option><option value="input"${snapshot ? ' selected' : ''}>输入推进</option></select></label>
    ${vending ? [['high', '随机高字节', 255], ['low', '随机低字节', 255], ['position', '小球起点', 15]].map(([name, label, max]) =>
      `<label>${label}<input type="number" min="0" max="${max}" data-machine-state-device-input="${name}" value="${name === 'position' ? context.deviceInput.position : context.deviceInput.random?.[name] ?? 0}"${snapshot ? ' disabled' : ''}></label>`).join('') : ''}
    <button class="button" type="button" data-machine-state-previous${!snapshot || selected.session.position === 0 ? ' disabled' : ''}>上一步</button>
    <button class="button" type="button" data-machine-state-next${!snapshot || selected.session.position >= selected.session.snapshots.length - 1 ? ' disabled' : ''}>下一步</button>`,
    inputs: snapshot ? `${cid === 0x37 ? `<label>预览密码 <input data-machine-state-password inputmode="numeric" maxlength="6"
      value="${esc(snapshot.execution.password || '')}"${snapshot.execution.status === 'waiting' ? '' : ' disabled'}></label>` : ''}
      <select data-machine-state-option aria-label="输入选项"${labels.length ? '' : ' hidden'}>${labels.map((label, index) =>
      `<option value="${index}"${snapshot.selections.choice === index ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select>
      ${['up', 'down', 'left', 'right', 'a', 'b'].map((input, index) => `<button class="button" type="button" data-machine-state-input="${input}"${snapshot.execution.status === 'waiting' || retry && input === 'a' ? '' : ' disabled'}>${['↑', '↓', '←', '→', retry ? 'A · 再次调查' : 'A', 'B'][index]}</button>`).join('')}
      ${tunnel ? '<button class="button" type="button" data-machine-state-input="scene-entry">进入时空隧道</button>' : ''}
      <span data-machine-state-status>${esc(snapshot.execution.reason || (snapshot.execution.status === 'returned' ? '已返回调用者'
        : graph.nodes.find(row => row.id === snapshot.node)?.label || ''))}</span><span data-machine-state-result>${result}${controlled
          ? controlled.status === 'confirmed' ? `<span>${controlled.actors.map(actor =>
            `${esc(actor.handle)}：${actor.actorType === 255 ? '已移除' : actor.actorType === 0 ? '不绘制' : '显示'} (${actor.x}, ${actor.y})`).join('；')}${controlled.tiles.length ? `；门格变化 ${controlled.tiles.length} 格` : ''}</span>`
            : `<span>${esc(controlled.status === 'deferred' ? '受控对象待场景装载或自主动作续接' : controlled.reason || '受控对象效果未确认')}；未提交对象效果</span>` : ''}</span>` : '',
    domainMarkup: snapshot?.execution.status === 'returned' && ([0x1A, 0x35, 0x32].includes(cid) && snapshot.domainResults.windowRestore?.scene
        || snapshot.view.deviceScene?.sceneId === snapshot.context.scene?.sceneId)
      ? screenWorkbenchCanvasStage({namespace, sizing: 'fill', zoomMarkup: '',
        canvasMarkup: '<canvas width="256" height="240" data-machine-state-scene aria-label="返回调查场景预览"></canvas>'})
      : snapshot?.execution.status === 'battle' ? `<div data-machine-state-battle style="display:flex;flex:1;min-height:0">${battleSimulationMarkup({workbench: {
      bottomSize: 'compact', attributes: {style: 'grid-template-columns:minmax(0, 1fr);height:100%;width:100%'},
      treeAttributes: {hidden: true, style: 'display:none'}, inspectorAttributes: {hidden: true, style: 'display:none'},
    }})}</div>` : null,
    bottom: selected.workbench.graphMarkup(), graph};
}

export function machineStatePreview(preview, definition) {
  const cid = commandId(definition);
  if (!MACHINE_SERVICE_COMMANDS.includes(cid)) return preview;
  const selected = current(cid);
  return selected.workbench ? selected.workbench.preview(preview)
    : selected.model ? machineServicePreview(selected.model, selected, preview) : preview;
}

function selectNode(selected, id) {
  selected.node = id;
  const node = selected.model.graph.nodes.find(row => row.id === id);
  const component = node?.action?.id && selected.nodes.find(row => row.serviceFragment === node.action.id)
    || node?.publishedPreview?.id && selected.nodes.find(row => row.servicePreview?.id === node.publishedPreview.id)
    || selected.nodes.find(row => row.id === ({'constructor:wanted-poster-screen': 'wanted:screen',
      'constructor:wanted-information-office-menu': 'wanted:office-menu',
      'constructor:wanted-information-intelligence': 'wanted:intelligence',
      'constructor:wanted-information-bounty-claim': 'wanted:bounty-claim'})[node?.publishedPreview?.id]);
  if (component) {
    selectGameUiWorkbenchNode(selected.namespace, component.id);
    selected.component = component.id;
    if (selected.namespace.startsWith('interface-page:')) state.interfacePageEntry = component.serviceFragment || component.serviceStage || null;
  }
}

async function initialize(selected) {
  const cid = selected.model.command.command_id;
  const context = structuredClone(interfacePreviewContext());
  if (selected.poster) context.wanted = selected.posterTarget;
  context.service = {...context.service, command: cid,
    argument: context.service?.command === cid ? context.service.argument : 0,
    entryHandle: selected.invocation.entryHandle || context.service?.entryHandle};
  Object.assign(selected, await startMachineServiceExecution(selected.model, context, {
    text: state.project.text_record_edits, readFields: () => ensureSaveCurrentFieldObjects(state),
    readDocument: resource => resource.startsWith('project.') ? db.getDocument(resource) : db.getResourceDocument(resource),
    readInterfaces: () => db.getDocument('project.ui.interfaces'),
    readField: (resource, handle, name) => db.getField(resource, handle, name),
    readPackageDocument: path => db.getPackageDocument(path),
  }));
  selected.path = 'input'; selectNode(selected, selected.session.state.node);
}

export function bindMachineStateController(root, {rerender}) {
  const control = root?.querySelector('[data-machine-state-path]');
  if (!control || boundRoots.has(root)) return;
  boundRoots.add(root);
  const selected = current(Number(control.dataset.machineStatePath));
  root.querySelectorAll('[data-machine-state-result] [data-scene-position-picker]').forEach(picker =>
    hydrateScenePositionPicker(picker, {entries: state.project.scenes?.editable_scenes || []}));
  bindScreenWorkbenchBottomResize({root, namespace: selected.namespace});
  selected.workbench.bind(root, {cacheKey: `machine-state:${selected.model.command.command_id}`});
  const perform = task => async event => {
    try {
      await task(event);
      const audio = selected.path && selected.session?.state.domainResults.audio;
      selected.audioReference = audio ? await prepareModuleComponent('audio-command', 'reference', {
        value: audio.commandId, allowedValues: [audio.commandId], label: '提交声音',
      }) : null;
      await rerender();
    }
    catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '机器输入', error);}
  };
  control.addEventListener('change', perform(async event => {
    if (!event.target.value) {selected.path = ''; delete selected.session; return;}
    await selected.workbench.initialize();
  }));
  root.querySelector('[data-machine-state-previous]')?.addEventListener('click', perform(() => {
    selected.session.previous(); selectNode(selected, selected.session.state.node);
  }));
  root.querySelector('[data-machine-state-next]')?.addEventListener('click', perform(() => {
    selected.session.next(); selectNode(selected, selected.session.state.node);
  }));
  const advance = input => {selected.workbench.advance(input); selectNode(selected, selected.session.state.node);};
  const sceneCanvas = root.querySelector('[data-machine-state-scene]');
  if (sceneCanvas) {
    const snapshot = selected.session.state;
    void interfacePreviewSceneImage(snapshot).then(image => {
      if (image && root.isConnected && selected.session.state === snapshot)
        sceneCanvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    }).catch(error => showEditorError(root, '场景返回', error));
  }
  const battleHost = root.querySelector('[data-machine-state-battle]');
  if (battleHost) {
    const session = selected.session, running = session.state, call = running.domainResults.battleCall;
    const isCurrent = () => root.isConnected && selected.session === session && session.state.execution.status === 'battle';
    void (async () => {
      try {
        await prepareViewData('text');
        await prepareViewData('monster-formations');
        const failures = await ensureBattleSceneData({includeInventory: true});
        if (failures.length) throw new Error(`战斗资源不可用：${failures.join('、')}`);
        await prepareViewData('interfaceui');
        if (!isCurrent()) return;
        const player = battleHost.querySelector('[data-battle-simulation]');
        await bindBattleSimulation(player, {project: state.project,
          preview: battleScenePreviewForFormation(state.project, call.formationId),
          encounter: {kind: 'encounter', saveSlot: running.context.slot, fields: running.fields,
            ...call, scene: running.context.scene, fieldEncounter: false},
          onComplete: result => {
            if (!isCurrent()) return;
            advance({type: 'battle-result', result: result.completion});
            void rerender().catch(error => showEditorError(root, '战斗返回', error));
          }});
        if (isCurrent() && player.dataset.simulationReady !== 'true')
          throw new Error(player.querySelector('[data-simulation-error]').textContent || '战斗完成结果未确认');
      } catch (error) {
        if (!isCurrent()) return;
        advance({type: 'battle-result', result: {outcome: 'unknown', confirmed: false, missing: [error.message]}});
        await rerender();
      }
    })();
  }
  if (selected.path && selected.session?.state.execution.status === 'animating') {
    const session = selected.session;
    requestAnimationFrame(async () => {
      if (!root.isConnected || selected.session !== session || session.state.execution.status !== 'animating') return;
      try {advance({type: 'frame'}); await rerender();}
      catch (error) {showEditorError(root.querySelector('.workspace-inspector'), '设备帧', error);}
    });
  }
  root.querySelector('[data-machine-state-option]')?.addEventListener('change', perform(event => advance({type: 'option', index: Number(event.target.value)})));
  bindTextInputEvents(root.querySelector('[data-machine-state-password]'), {onChange: perform(event =>
    advance({type: 'password', value: event.target.value}))});
  root.querySelectorAll('[data-machine-state-device-input]').forEach(element => element.addEventListener('change', perform(event => {
    const name = element.dataset.machineStateDeviceInput, value = Number(event.target.value);
    if (!Number.isInteger(value) || value < 0 || value > (name === 'position' ? 15 : 255))
      throw new RangeError('设备输入超出当前字节域');
    const input = interfacePreviewContext().deviceInput;
    if (name === 'position') input.position = value;
    else input.random[name] = value;
  })));
  root.querySelectorAll('[data-machine-state-input]').forEach(button => button.addEventListener('click', perform(() => advance({type: button.dataset.machineStateInput}))));
  root.querySelectorAll('[data-machine-state-node]').forEach(button => button.addEventListener('click', perform(() => {
    selected.path = ''; delete selected.session; selected.edge = null; selectNode(selected, button.dataset.machineStateNode);
  })));
  root.querySelector('[data-machine-state-full-graph]')?.addEventListener('click', perform(() => {selected.fullGraph = !selected.fullGraph;}));
  root.querySelectorAll('[data-machine-state-edge]').forEach(button => button.addEventListener('click', () => {
    const edge = selected.model.graph.edges.find(row => row.id === button.dataset.machineStateEdge);
    if (!edge) return;
    selected.edge = edge.id;
    root.querySelector('[data-game-ui-inspector-detail]').innerHTML = `<dl><dt>输入</dt><dd>${esc(edge.input)}</dd>
      <dt>去向</dt><dd>${esc(selected.model.graph.nodes.find(row => row.id === edge.to)?.label || '返回调用者')}</dd></dl>`;
  }));
  root.addEventListener('field-object-saved', () => {selected.path = ''; delete selected.session;});
  root.querySelectorAll('select').forEach(element => {
    if (element.matches('[data-machine-state-path], [data-machine-state-option]')) return;
    element.addEventListener('change', () => {selected.path = ''; delete selected.session;}, {capture: true});
  });
}
