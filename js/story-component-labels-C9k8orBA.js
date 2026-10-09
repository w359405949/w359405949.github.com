import { currentTextReference, recordUid, esc, canvasViewportControls, bindCanvasViewport, showEditorError, currentTextChoiceLabel, indexedResource } from './monster-figure-C07vG7yu.js';
import { db, facilityRuntimeCodeValues, itemNameRecordId, textRecordNodeId, interfacePreviewState, interfaceGraphConnections, nearbyInterfaceGraphPositions, fullInterfaceGraphPositions, createInterfaceStateSource, interfaceStateSources, textRecordEditorTokens, textRecord, decodeFixedTextRecord, foldInterfaceStateGraph, STORY_DIALOGUE_OPERATIONS } from './scene-actors-Cftr7mCE.js';
import { vehicleName, executeSceneActionLocalHandler } from './charset-BJ0aS3Xk.js';
import { navigateInternalUrl, interfacePreviewContext, selectInterfacePreviewContext, replaceHistoryUrl, currentViewUrl } from './preview-sound-DHDXA99x.js';
import { state } from './emulator-Bl-sLXnd.js';
import { editorLog } from './project-store-values-klefznSR.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker } from './components-wbruLTYI.js';
import { storyPageDefinitionForView, storyViewForSequenceId } from './baseline-assembly-C0KRII8X.js';

// @editor-module 设施配置摘要只使用当前字段值与已发布的槽位语义。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

async function facilityConfigurationSummaryContext() {
  const [items, shells, vehicles, codeValues] = await Promise.all([
    db.getResourceDocument('item-entry'),
    db.getResourceDocument('shell-record'),
    db.getResourceDocument('vehicle-preset'),
    facilityRuntimeCodeValues(['inn-price-37', 'inn-price-38', 'inn-price-39']),
  ]);
  return {items, shells, vehicles, innPrices: Object.fromEntries([37, 38, 39].map(value => {
    const price = items.equipment_editor.numeric_codes.find(row =>
      row.raw_code === codeValues[`inn-price-${value}`]);
    return [value, price?.available && Number.isSafeInteger(price.value) ? price.value & 0xffff : null];
  }))};
}

function valueName(entry, value, namespace, context) {
  if (namespace === 'item') {
    const item = (context.items || db.peekResourceDocument('item-entry'))?.records.find(row => Number(row.id) === value);
    return currentTextReference(itemNameRecordId(item)).label || recordUid('item-entry', value);
  }
  if (namespace === 'shell') {
    const shell = (context.shells || db.peekResourceDocument('shell-record'))?.records.find(row => Number(row.id) === value);
    const record = shell?.name_text_record_id != null && shell?.name_text_region
      ? textRecordNodeId(Number.parseInt(shell.name_text_region, 16), shell.name_text_record_id) : null;
    return currentTextReference(record).label || recordUid('shell-record', value);
  }
  if (namespace === 'vehicle-preset') {
    const preset = (context.vehicles || db.peekResourceDocument('vehicle-preset'))?.presets.find(row => Number(row.preset_id) === value);
    return preset ? vehicleName(preset) : recordUid('vehicle-preset', value);
  }
  const good = entry.value_namespace?.goods?.find(row => Number(row.value) === value);
  const name = good ? currentTextReference(good.text_record || good.resource_uid).label : hex(value);
  const price = context.innPrices?.[value];
  return Number(entry.family_id) === 6 && Number.isInteger(price) ? `${name} ${price}G/人` : name;
}

function facilityConfigurationSummary(entry, values = entry.values || [], context = entry.summaryContext || {}) {
  const family = Number(entry.family_id);
  if (family === 15) return `楼层 ${values.slice().reverse().slice(0, 3).join('、')}${values.length > 3 ? `…（${values.length} 层）` : ''}`;
  if (entry.value_namespace?.namespace === 'unknown')
    return `数值 ${values.slice(-4).map(value => hex(value)).join('、')}`;
  const slots = entry.value_namespace?.slot_schema?.slots;
  const names = values.flatMap((value, index) => {
    const slot = slots?.find(row => Number(row.slot) === index);
    if (slots && slot?.role !== 'product') return [];
    return [valueName(entry, Number(value), slot?.namespace || entry.value_namespace?.namespace, context)];
  });
  return `${names.slice(0, 3).join('、')}${names.length > 3 ? `…（${names.length} 项）` : ''}`;
}

function facilityConfigurationLabel(entry, values = entry.values, recordId = entry.id, {showHandle = true} = {}) {
  const summary = facilityConfigurationSummary(entry, values);
  const handle = `application-config-instance:${hex(Number(entry.family_id))}:${hex(Number(recordId))}`;
  return showHandle ? summary ? `${summary} · ${handle}` : handle : `${summary || '配置'} · ${Number(recordId) + 1}`;
}

// @editor-module 战斗结果沿稳定画面推进，提交后恢复原调用现场。

const BATTLE_RESULT_EVIDENCE = 'project/evidence/reverse-engineering/battle-result-settlement/observations.json';
const nodeId = phase => `battle-results.${phase}`;

function battleResultCompletionConfirmed(completion, fields, slot, applied = [], scene) {
  const prefix = `save.slot.${slot}.`;
  const invocation = completion?.invocation;
  const expected = {...invocation?.sourceFields, ...Object.fromEntries(applied.map(effect => [effect.field, effect.value]))};
  return completion?.confirmed === true && ['victory', 'defeat'].includes(completion.outcome)
    && (!invocation || invocation.saveSlot === slot && invocation.sourceFields
      && (invocation.sceneId === undefined || invocation.sourceFields[`${prefix}scene_id`] === invocation.sceneId)
      && (invocation.sceneId === undefined || completion.sceneReturn?.context?.sceneId === invocation.sceneId)
      && (scene?.sceneId === undefined || invocation.sceneId === undefined || scene.sceneId === invocation.sceneId)
      && Object.entries(expected).every(([field, value]) =>
        field.startsWith(prefix) && Object.hasOwn(fields, field) && JSON.stringify(fields[field]) === JSON.stringify(value)))
    && completion.sceneReturn?.context && ['resume', 'reload'].includes(completion.sceneReturn.mode)
    && completion.rewards?.status === 'available'
    && Array.isArray(completion.effects) && Array.isArray(completion.eventFlags)
    && completion.eventFlags.every(flag => Number.isInteger(flag) && flag >= 0 && flag <= 255)
    && completion.effects.every(effect => typeof effect?.field === 'string'
      && effect.field.startsWith(prefix) && Object.hasOwn(fields, effect.field) && effect.value !== undefined)
    && (!completion.stages || ['entry', 'rewards', 'drop'].every(phase => Array.isArray(completion.stages[phase])
      && completion.stages[phase].every(effect => completion.effects.some(row => row.field === effect.field
        && JSON.stringify(row.value) === JSON.stringify(effect.value)))));
}

/** 调用者只接收同一存档组已有字段的完整效果。 */
function applyBattleResultEffects(state, completion) {
  if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
      state.execution?.appliedEffects, state.context.scene)) return false;
  for (const effect of completion.effects) state.fields[effect.field] = structuredClone(effect.value);
  state.fields.eventFlags = [...new Set([...(state.fields.eventFlags || []), ...completion.eventFlags])];
  state.context.scene = {...state.context.scene, ...completion.sceneReturn.context};
  state.context.storyState = completion.sceneReturn.context.storyState;
  state.domainResults.sceneReturn = structuredClone(completion.sceneReturn);
  return true;
}

function battleResultGraph(previews = []) {
  const nodes = [['victory', '胜利'], ['defeat', '失败'], ['rewards', '经验 / 金钱'],
    ['drop', '掉落'], ['story-commit', '剧情状态提交']].map(([phase, label]) => ({id: nodeId(phase), phase, label,
      publishedPreview: previews.find(row => row.id === `constructor:battle-result-${phase}`),
      role: phase === 'story-commit' ? 'action' : 'screen'}));
  const routes = [['victory', 'rewards', '有击破经验'], ['victory', 'story-commit', '没有击破经验'],
    ['defeat', 'story-commit', '败北恢复'], ['rewards', 'rewards', '确认经验值后显示金钱'],
    ['rewards', 'drop', '奖励确认结束且触发掉落'],
    ['rewards', 'story-commit', '奖励确认结束且未触发掉落'], ['drop', 'story-commit', '提交已确认部分'],
    ['story-commit', null, '返回调用者']].map(([from, to, condition], index) => ({id: `battle-result:${index}`,
      from: nodeId(from), to: to ? nodeId(to) : null, input: from === 'story-commit' || condition === '没有击破经验' ? '自然返回' : 'A / B',
      condition, evidence: BATTLE_RESULT_EVIDENCE}));
  return {nodes, transitions: routes, edges: routes.map(row => ({...row, routes: [row]})), entry: nodeId('victory')};
}

/** 返回效果只写本次预览字段；未知胜负保留完整调用栈。 */
function battleResultExecution(completion) {
  completion = structuredClone(completion);
  const stages = completion?.stages || {entry: [], rewards: completion?.effects || [], drop: []};
  const apply = (state, phase) => {
    for (const effect of stages[phase]) {
      state.fields[effect.field] = structuredClone(effect.value);
      state.execution.appliedEffects.push(structuredClone(effect));
    }
  };
  const pause = (state, phase) => {
    state.node = nodeId(phase); state.pause = {kind: 'confirm', evidence: BATTLE_RESULT_EVIDENCE};
    state.windows = [{id: 'battle-result', phase}];
    return state;
  };
  const complete = state => {
    if (!applyBattleResultEffects(state, completion)) {
      state.execution.status = 'unknown'; state.execution.reason = '战斗返回字段与调用现场不一致；未提交结果';
      return state;
    }
    state.node = nodeId('story-commit'); state.pause = null; state.windows = [];
    state.returnStack.pop(); state.execution.status = 'returned';
    state.execution.reason = completion.sceneReturn.handoff ? '已交接败北剧情' : '已返回调用者';
    return state;
  };
  return {
    initial({fields = {}, context = {}, returnStack = []} = {}) {
      const valid = battleResultCompletionConfirmed(completion, fields, context.slot, [], context.scene);
      const state = interfacePreviewState({fields, context, returnStack,
        domainResults: {battleResult: completion}, execution: {status: valid ? 'waiting' : 'unknown', trace: [], appliedEffects: [],
          reason: valid ? '' : [...(completion?.missing || []), '战斗完成效果未确认；未提交结果'].join('；')}});
      if (valid) apply(state, 'entry');
      if (valid && completion.outcome === 'victory' && !completion.rewards.experience) return complete(state);
      return pause(state, completion?.outcome === 'defeat' ? 'defeat' : 'victory');
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting' || !['a', 'b'].includes(input.type)) return state;
      if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
          state.execution.appliedEffects, state.context.scene)) {
        state.execution.status = 'unknown'; state.execution.reason = '战斗结果与本次调用字段不一致；未继续提交';
        return state;
      }
      const phase = state.node.split('.').at(-1);
      state.execution.trace.push({node: state.node, input: input.type, evidence: BATTLE_RESULT_EVIDENCE});
      if (phase === 'victory' && completion.rewards.experience) {
        state.selections.reward = 'experience'; return pause(state, 'rewards');
      }
      if (phase === 'rewards') {
        if (state.selections.reward === 'experience' && completion.rewards.gold) {
          state.selections.reward = 'gold'; return pause(state, 'rewards');
        }
        apply(state, 'rewards'); apply(state, 'drop');
        if (completion.drop) return pause(state, 'drop');
      }
      return complete(state);
    },
  };
}

// @editor-module 状态图控件按注入的身份、标签与显示投影保持局部刷新。

const focusedNodes = new Map();

function syncInterfaceGraphElement(target, source, attributes = true, dataPrefix) {
  for (const attribute of attributes ? [...target.attributes] : []) if (!source.hasAttribute(attribute.name))
    target.removeAttribute(attribute.name);
  for (const attribute of attributes ? source.attributes : []) if (target.getAttribute(attribute.name) !== attribute.value)
    target.setAttribute(attribute.name, attribute.value);
  const key = element => element.nodeType === 1
    ? element.dataset[`${dataPrefix}Node`] || element.dataset[`${dataPrefix}Edge`] || element.tagName : '#text';
  const remaining = [...target.childNodes];
  let next = target.firstChild;
  for (const child of source.childNodes) {
    const previous = remaining.find(node => key(node) === key(child));
    if (previous) {
      remaining.splice(remaining.indexOf(previous), 1);
      if (child.nodeType === 1) syncInterfaceGraphElement(previous, child, true, dataPrefix);
      else if (previous.textContent !== child.textContent) previous.textContent = child.textContent;
      if (previous === next) next = next.nextSibling;
      else target.insertBefore(previous, next);
    } else target.insertBefore(child.cloneNode(true), next);
  }
  remaining.forEach(node => node.remove());
}

function refreshInterfaceStateGraph(root, options) {
  const {namespace, dataPrefix} = options.presentation;
  const template = document.createElement('template');
  template.innerHTML = interfaceStateGraphMarkup(options);
  const surface = root.querySelector(`.${namespace}-graph svg`);
  const active = root.ownerDocument.activeElement;
  const next = template.content.querySelector('svg');
  // 视口的缩放和平移属于控制器；状态内容只更新 SVG 的几何与选中态。
  for (const name of ['width', 'height', 'viewBox']) surface.setAttribute(name, next.getAttribute(name));
  syncInterfaceGraphElement(surface, next, false, dataPrefix);
  if (surface.contains(active)) active.focus({preventScroll: true});
  root.querySelector(`[data-${dataPrefix}-visible-edges]`).textContent = template.content.querySelector(`[data-${dataPrefix}-visible-edges]`).textContent;
}

function bindInterfaceStateGraph(root, {cacheKey, selected, presentation}) {
  const {namespace, dataPrefix} = presentation;
  const viewport = root.querySelector(`.${namespace}-graph`), surface = viewport?.querySelector('svg');
  if (!surface) return null;
  const key = `${cacheKey}:${selected.fullGraph ? 'full' : 'nearby'}`;
  let focusPending = focusedNodes.get(key) !== selected.node;
  let viewWidth = viewport.clientWidth, viewHeight = viewport.clientHeight;
  const controller = bindCanvasViewport({viewport, surface, controls: root.querySelector(`.${namespace}-graph-toolbar`),
    key, size: () => surface.viewBox.baseVal, zoom: selected.fullGraph ? 'fit' : 1, onLayout: () => {
      const resized = viewWidth !== viewport.clientWidth || viewHeight !== viewport.clientHeight;
      viewWidth = viewport.clientWidth; viewHeight = viewport.clientHeight;
      if (!focusPending && !resized) return;
      focusPending = false;
      const node = surface.querySelector(`[data-${dataPrefix}-node="${CSS.escape(selected.node)}"]`);
      if (!node) return;
      const bounds = node.getBoundingClientRect(), frame = viewport.getBoundingClientRect(), padding = 12;
      const shift = (start, end, min, max) => end - start > max - min
        ? (min + max - start - end) / 2 : start < min ? min - start : end > max ? max - end : 0;
      controller.panBy(shift(bounds.left, bounds.right, frame.left + padding, frame.right - padding),
        shift(bounds.top, bounds.bottom, frame.top + padding, frame.bottom - padding));
    }});
  focusedNodes.set(key, selected.node);
  return controller;
}

const short = text => text.length > 16 ? `${text.slice(0, 15)}…` : text;

function interfaceStateGraphMarkup({graph, selected, paths, available, presentation}) {
  const {namespace, dataPrefix, count, notice, exitLabel} = presentation;
  const active = paths.find(path => path.id === selected.path);
  const pathEdges = new Set(active?.edges.map(edge => edge.id));
  const links = interfaceGraphConnections(graph, selected, pathEdges);
  const local = nearbyInterfaceGraphPositions(graph, selected, links, active);
  const positions = selected.fullGraph ? fullInterfaceGraphPositions(graph) : local.positions;
  const edgeMarkup = links.map((link, index) => {
    const from = positions.get(link.from), to = positions.get(link.to);
    if (!from || !to) return '';
    const backward = to.x < from.x, self = to.x === from.x;
    const x1 = backward ? from.x : from.x + 176, y1 = from.y + 23;
    const x2 = backward || self ? to.x + 176 : to.x, y2 = to.y + (self ? 36 : 23);
    const labelX = self ? x1 + 112 : (x1 + x2) / 2;
    const lane = selected.fullGraph ? (y1 + y2) / 2 : 55 + index * 72;
    const bend = self ? 120 : Math.max(28, Math.abs(x2 - x1) / 2);
    const route = selected.fullGraph
      ? `M${x1},${y1} C${x1 + (backward ? -bend : bend)},${y1 + (backward || self ? 48 : 0)} ${x2 + (backward ? bend : self ? bend : -bend)},${y2 + (backward || self ? 48 : 0)} ${x2},${y2}`
      : `M${x1},${y1} H${labelX - 104} V${lane} H${labelX + 104} V${y2} H${x2}`;
    const condition = link.unknown ? '' : short(link.annotation || link.condition);
    return `<g class="interface-state-edge ${namespace}-edge${link.onPath ? ' on-path' : ''}${link.selected ? ' selected' : ''}"
      data-${dataPrefix}-edge="${esc(link.id)}" data-${dataPrefix}-edge-ids="${esc(JSON.stringify(link.members.map(edge => edge.id)))}"
      tabindex="0" role="button" aria-label="${esc(`${link.input} ${link.condition}`)}">
      <title>${esc(`${link.input} · ${link.condition || '无附加条件'}`)}</title>
      <path class="interface-state-edge-hit ${namespace}-edge-hit" d="${route}"/><path class="interface-state-edge-line ${namespace}-edge-line" d="${route}" marker-end="url(#${namespace}-arrow)"/>
      ${selected.fullGraph ? '' : `<rect class="interface-state-edge-label-box ${namespace}-edge-label-box" x="${labelX - 96}" y="${lane - 21}" width="192" height="38" rx="3"/>`}
      <text class="interface-state-edge-label ${namespace}-edge-label" x="${labelX}" y="${lane - 6}">${esc(short(link.input))}</text>
      ${condition ? `<text class="interface-state-edge-condition ${namespace}-edge-condition" x="${labelX}" y="${lane + 8}">${esc(condition)}</text>` : ''}
    </g>`;
  }).join('');
  const nodeMarkup = graph.nodes.map(node => {
    const position = positions.get(node.id), known = Boolean(node.reference) || available(node);
    return `<g class="interface-state-node ${namespace}-node${node.reference ? ' reference' : ''}${selected.node === node.id ? ' selected' : ''}${known ? '' : ' unresolved'}${!selected.fullGraph && !local.activeNodes.has(node.id) ? ' dimmed' : ''}"
      transform="translate(${position.x},${position.y})" data-${dataPrefix}-node="${esc(node.id)}"${node.reference ? ` data-state-reference="${esc(node.id)}" data-state-reference-source="${esc(node.reference.sourceId)}"` : ''} tabindex="0" role="button" aria-label="${esc(node.label)}${node.reference ? ' · 跳到状态机入口' : ''}">
      <title>${esc(node.label)}${known ? '' : ' · 画面未确认'}</title><rect width="176" height="46" rx="4"/>
      <text x="88" y="27">${esc(node.label)}${node.reference ? ' ↗' : ''}</text></g>`;
  }).join('');
  const exit = positions.get(null);
  const width = Math.max(400, ...[...positions.values()].map(position => position.x + 310));
  const height = Math.max(180, links.length * (selected.fullGraph ? 0 : 72) + 96,
    ...[...positions.values()].map(position => position.y + 80));
  return `<div class="interface-state-graph-panel ${namespace}-graph-panel"><header class="interface-state-graph-toolbar ${namespace}-graph-toolbar">
    <button type="button" class="button ghost" data-${dataPrefix}-full-graph aria-pressed="${Boolean(selected.fullGraph)}">全图</button>
    <span class="muted" data-${dataPrefix}-graph-count>${esc(count)}${notice ? ` · ${esc(notice)}` : ''}</span>
    <span class="muted" data-${dataPrefix}-visible-edges>${links.reduce((count, link) => count + link.members.length, 0)} / ${graph.edges.length} 条转移 · ${links.length} 条连线</span>
    ${canvasViewportControls('状态机图缩放')}
    </header><div class="interface-state-graph ${namespace}-graph${selected.fullGraph ? ' full' : ''}" tabindex="0" aria-label="只读状态机图"
      title="滚轮或＋／−缩放；左键或中键拖动、方向键平移">
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="${namespace}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z"/></marker></defs>
      ${edgeMarkup}${nodeMarkup}${exit ? `<g class="interface-state-exit ${namespace}-exit" transform="translate(${exit.x},${exit.y})"><circle cx="8" cy="23" r="8"/><circle cx="8" cy="23" r="4"/><text x="24" y="27">${esc(exitLabel)}</text></g>` : ''}
    </svg></div></div>`;
}

// @editor-module 公共宿主调用领域来源，图、画布和字段控件沿用现有组件。

const hosts = new WeakMap();
const referenceRoots = new WeakSet();
const sources = new Map();
let repository = null;

function interfaceStateWorkbench(root) {return hosts.get(root) || null;}

function createInterfaceStateWorkbench({source, presentation, available = () => true, followReference = null}) {
  if (repository !== state.projectRepository) {sources.clear(); repository = state.projectRepository;}
  sources.set(source.identity.id, source);
  const options = () => ({graph: source.graph(), selected: source.selection(), paths: source.paths(),
    available, presentation: typeof presentation === 'function' ? presentation(source.graph()) : presentation});
  const attach = root => {
    hosts.set(root, host);
    root.dataset.stateMachineSource = source.identity.id;
    root.dataset.stateMachineDomain = source.identity.domain;
    root.dataset.stateMachineEntry = source.entry.identity.id;
    root.dataset.stateMachinePath = source.paths().find(path => path.id === source.selection().path)?.identity.id || '';
  };
  const host = {
    source,
    followReference: followReference || (async reference => {
      const route = {...reference.entry.route};
      const results = source.selection().path ? source.execution.calls()?.results : null;
      const destination = results?.scene || results?.sceneReturn?.context;
      const sceneId = destination?.sceneId ?? reference.entry.sceneId;
      if (route.view === 'scenes' && sceneId != null) {
        const scenes = await db.getDocument('project.scenes');
        const scene = scenes.editable_scenes.find(row => Number(row.id) === Number(sceneId));
        if (!scene) throw new TypeError('引用的场景入口不存在');
        route.scene = scene.slug;
        if (Number.isInteger(destination?.x) && Number.isInteger(destination?.y)) route.scenePoint = `${destination.x},${destination.y}`;
      }
      const target = sources.get(reference.sourceId);
      if (target) {
        const selected = target.selection();
        selected.path = ''; selected.node = reference.nodeId || target.graph().entry;
        delete selected.session; delete selected.previewSession;
        delete selected.adapter; delete selected.executionAdapter;
      }
      return navigateInternalUrl(`?${new URLSearchParams(route)}`);
    }),
    sources: interfaceStateSources,
    graphMarkup: () => interfaceStateGraphMarkup(options()),
    refreshGraph: root => {attach(root); return refreshInterfaceStateGraph(root, options());},
    bind(root, {cacheKey = source.identity.id} = {}) {
      attach(root);
      if (!referenceRoots.has(root)) {
        referenceRoots.add(root);
        const follow = event => {
          if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
          const element = event.target.closest('[data-state-reference]');
          const current = hosts.get(root);
          const node = element && current.source.graph().nodes.find(row => row.id === element.dataset.stateReference);
          if (!node?.reference) return;
          event.preventDefault(); event.stopImmediatePropagation();
          void Promise.resolve().then(() => current.followReference(node.reference))
            .catch(error => showEditorError(root, '状态机引用', error));
        };
        root.addEventListener('click', follow, {capture: true});
        root.addEventListener('keydown', follow, {capture: true});
      }
      return bindInterfaceStateGraph(root, {cacheKey, selected: source.selection(), presentation: options().presentation});
    },
    initialize: (...args) => source.execution.initialize?.(...args),
    inputs: (...args) => source.execution.inputs(...args),
    options: (...args) => source.execution.options(...args),
    advance: (...args) => source.execution.advance?.(...args),
    preview: (...args) => source.execution.preview?.(...args),
    calls: (...args) => source.execution.calls(...args),
    complete: (...args) => source.execution.complete(...args),
    components: () => source.components.current(),
    selectComponent: (...args) => source.components.select?.(...args),
    fields: (...args) => source.components.fields(...args),
    mountFields: (...args) => source.components.mount?.(...args),
  };
  return host;
}

function createInterfaceStateControllerWorkbench({source: providedSource = null, selection, initialize = null, advance = null,
  inputs = () => [], preview = null, components = {}, presentation, available, followReference, ...description}) {
  const session = () => selection().session || selection().previewSession;
  const adapter = () => selection().adapter || selection().executionAdapter;
  const source = providedSource || createInterfaceStateSource({...description, selection, components, execution: {
    initialize, inputs,
    options: snapshot => adapter()?.options?.(snapshot || session()?.state) || [],
    advance: advance || (initialize ? input => session().advance(input, adapter()) : null),
    preview,
    calls: () => {
      const snapshot = session()?.state;
      return snapshot ? {returnStack: snapshot.returnStack, results: snapshot.domainResults,
        status: snapshot.execution?.status} : null;
    },
    complete: () => {
      const snapshot = session()?.state;
      return ['returned', 'called', 'terminal'].includes(snapshot?.execution?.status) ? snapshot.domainResults : null;
    },
  }});
  return createInterfaceStateWorkbench({source, presentation, available, followReference});
}

// @editor-module 组件项名引用文字语义、字段绑定与列表槽位。

const RECORD_NAMES = {
  '02:000': '人物 1 状态', '02:001': '人物 2 状态', '02:002': '人物 3 状态',
  '02:003': '战车状态', '02:004': '携带列表', '02:005': '携带列表前六项', '02:008': '姓名',
  '02:009': '工具处理命令', '02:015': '强度命令与金钱', '02:016': '装备处理命令',
  '02:018': '所选物品', '02:020': '乘坐战车', '02:024': '冒险设置', '02:025': '战车部件状态',
  '02:026': '装载数量', '02:032': '人物状态', '02:033': '状态分隔线',
  '02:037': '挂载部件与装备', '02:038': '等级', '02:039': '战车编号与名称',
  '02:040': '战车价格', '02:041': '战车列表标题', '02:042': '战斗数据命令',
  '02:043': '装备处理命令', '02:045': '战车名称与装甲', '02:046': '拆装甲确认',
  '02:047': '经验值分类', '02:048': '读档命令与存档槽', '02:049': '买卖命令',
  '02:050': '所持金钱', '02:051': '商品与价格', '02:054': '补给类型命令',
  '02:057': '弹药装载命令', '02:058': '租借命令', '02:066': '家中服务命令',
  '02:071': '战车部件名称', '02:072': '数量与上限', '02:074': '传真窗口',
  '02:078': '战车命名与候选字', '02:079': '姓名与升级经验', '02:081': '升级经验标题',
  '02:085': '返回地面确认', '02:087': '传送基地提示', '02:088': '存档槽选择',
  '02:091': '使用失败反馈', '02:094': '金额输入与金钱', '02:100': '拆装甲结果',
  '02:101': '拆装甲取消反馈', '02:104': '装备结果', '02:109': '丢弃确认',
  '03:000': '人物装备信息', '03:001': '人物编号与姓名', '03:002': '人物信息边框',
  '03:003': '战车状态', '03:004': '人物攻击与防御', '03:005': '装备标题边框',
  '03:006': '装备攻击与防御比较', '03:007': '主菜单窗口', '03:008': '列表窗口',
  '03:010': '战斗命令窗口', '03:011': '战斗状态窗口', '03:012': '命名窗口',
  '03:013': '人物详情窗口', '03:014': '人物能力', '03:015': '人物装备列表',
  '03:016': '商品与价格窗口', '03:017': '对话窗口', '03:019': '画面清除区域',
  '03:023': '密码终端窗口', '04:000': '战车炮弹', '04:001': '部件状态分隔线',
  '04:002': '部件重量与载重', '04:003': '部件名称', '04:022': '服务标题',
  '0C:000': '文字起点', '0C:001': '说话人', '0C:006': '对话前缀',
  '12:000': '物品与属性', '12:001': '部件名称与防御',
  '12:002': '战车编号与名称', '12:004': '战车部件标题', '12:006': '战车编号与名称',
  '12:007': '弹药列表标题', '12:009': '部件与弹药', '12:010': '部件弹药数量',
  '12:011': '物品与部件', '12:014': '战车名称与装甲', '12:017': '携带装备与部件',
  '12:018': '携带装备状态与重量', '12:019': '装甲与载重标题', '12:020': '战车图像窗口',
  '09:001': '携带列表', '09:007': '候选字符', '09:009': '候选字符',
  '08:027': '防御参数', '08:028': '攻击参数', '11:159': '回应称呼', '15:015': '通缉信息标题',
};

const FIELD_NAMES = {
  name_codes: '姓名', level: '等级', status: '状态', condition_raw: '损坏状态',
  current_hp: '当前 HP', max_hp: '最大 HP', attack: '攻击', defense: '防御', gold: '金钱',
  sp: '装甲', battle_skill: '战斗等级', repair_skill: '修理等级', driving_skill: '驾驶等级',
  vitality: '体力', speed: '速度', intelligence: '智力', strength: '强度', experience: '经验值',
};

const RECORD_FIELDS = {
  '02:000': {0: '姓名', 23: '状态', 3: '当前 HP'},
  '02:001': {1: '姓名', 23: '状态', 4: '当前 HP'},
  '02:002': {2: '姓名', 23: '状态', 5: '当前 HP'},
  '02:003': {23: '状态'}, '02:037': {41: '挂载部件', 42: '装备名称'},
  '02:032': {7: '姓名', 15: '等级', 23: '状态', 29: '当前 HP', 31: '最大 HP'},
  '02:039': {9: '战车状态'}, '02:040': {11: '价格'}, '02:042': {14: '金钟金额'},
  '02:045': {8: '剩余装甲'}, '02:047': {68: '仿生类经验', 67: '电子类经验', 69: '其他类经验'},
  '02:046': {15: '拆除数量'}, '02:100': {15: '拆除数量'},
  '02:048': {63: '存档槽 1 姓名', 64: '存档槽 2 姓名', 65: '存档槽 1 等级', 66: '存档槽 2 等级'},
  '02:051': {10: '商品名称', 11: '价格'}, '02:079': {7: '姓名', 10: '等级', 11: '升级经验'},
  '02:088': {63: '存档槽 1 姓名', 64: '存档槽 2 姓名'},
  '02:094': {6: '金钱', 29: '金额第 1 位', 30: '金额第 2 位', 31: '金额第 3 位',
    60: '金额第 4 位', 32: '金额第 5 位', 33: '金额第 6 位', 34: '金额第 7 位'},
  '03:001': {29: '人物编号'}, '03:003': {39: '重量', 59: '载重', 55: '超载状态', 47: '剩余载重'},
  '03:004': {37: '攻击', 38: '防御'}, '03:006': {35: '攻击变化', 36: '防御变化'},
  '04:000': {39: '炮弹总数', 40: '弹仓容量', 29: '炮弹位 1 数量', 30: '炮弹位 2 数量',
    31: '炮弹位 3 数量', 60: '炮弹位 4 数量', 32: '炮弹位 5 数量', 33: '炮弹位 6 数量'},
  '04:002': {10: '武器名称', 16: '当前弹药', 17: '最大弹药'}, '04:003': {10: '武器名称'},
  '02:072': {55: '数量单位', 8: '当前数量', 9: '最大数量'},
  '12:000': {10: '物品名称', 16: '数量'}, '12:001': {39: '部件名称'},
  '12:002': {15: '战车编号', 7: '战车名称'}, '12:006': {56: '战车编号', 7: '战车名称'},
  '12:009': {15: '部件名称', 29: '弹药数量'}, '12:010': {39: '剩余弹药'},
  '12:011': {10: '物品名称', 15: '部件名称'}, '12:014': {7: '战车名称', 8: '当前装甲', 10: '最大装甲'},
  '15:016': {56: '击败等级'}, '07:032': {10: '弹仓增加量'},
  '06:117': {15: '弹药数量'},
};

const FORMULA_NAMES = {
  'item-buy-name': '购买物品', 'item-sell-name': '出售物品', 'stored-item-name': '保管物品',
  'item-buy-price': '购买价格', 'item-sell-price': '出售价格', 'quarter-item-price': '收购价格',
  'shop-actor-name': '顾客姓名', 'role-name': '人物姓名', 'vehicle-name': '战车名称',
  'hunter-name': '猎人姓名', 'last-party-vehicle-name': '队伍战车名称', 'equipment-name': '装备名称',
  'equipment-quantity': '装备数量', 'equipment-quantity-cost': '装备费用', 'configured-name': '配置名称',
  'service-amount': '指定数量', 'ammunition-deficit': '所需弹药', 'ammunition-deficit-cost': '装满弹药费用',
  'ammunition-input-cost': '弹药费用', 'armor-input-cost': '装甲费用', 'vehicle-armor-deficit': '所需装甲',
  'party-count': '队伍人数', 'inn-cost': '住宿费用', 'party-repair-cost': '队伍修理费用', 'repair-cost': '修理费用',
  'chassis-capacity-cost': '弹仓改造费用', 'chassis-weight-cost': '底盘改造费用',
  'chassis-upgrade-deficit': '改造载重差额', 'upgrade-category-name': '改造部件',
  'engine-upgrade-price': '引擎改造费用', 'upgraded-engine-name': '改造后引擎',
  'wanted-name': '通缉目标', 'wanted-bounty': '赏金', 'destination-name': '传送基地',
};

const recordKey = id => String(id || '').replace(/^record:/u, '');
const literalName = text => String(text || '').replace(/〔[^〕]*〕/gu, '').trim();
const choiceName = text => literalName(text).replace(/\s+/gu, ' ').replace(/[：:]+$/u, '').trim();

function componentTextSummary(text, fallback = '') {
  const content = literalName(text).replace(/\s+/gu, '').replace(/^[，、：:。！？…]+/u, '');
  const sentence = content.match(/^[^。！？!?]+[。！？!?]?/u)?.[0] || '';
  return sentence.length > 20 ? `${sentence.slice(0, 20)}…` : sentence || fallback;
}

function uiRecordComponentLabel(recordId, {layout = false, fallback = '界面文字'} = {}) {
  const named = RECORD_NAMES[recordKey(recordId)];
  if (named) return named;
  if (layout) return fallback.endsWith('窗口') ? fallback : `${fallback}窗口`;
  return componentTextSummary(currentTextReference(recordId).label, fallback);
}

function uiImageComponentLabel(source) {
  return source === 'selection-cursor' ? '光标' : '图像';
}

function distinctUiComponentLabels(nodes) {
  const parents = [], siblings = new Map();
  const rows = nodes.map(node => {
    const depth = node.depth || 0;
    parents.length = Math.min(parents.length, depth);
    const parent = parents.at(-1);
    const label = node.label === parent?.label ? `${node.label}组件` : node.label;
    const key = JSON.stringify([parent?.id, label]);
    const group = siblings.get(key) || [];
    const row = {...node, label};
    group.push(row); siblings.set(key, group);
    parents[depth] = row;
    return row;
  });
  for (const group of siblings.values()) if (group.length > 1)
    group.forEach((node, index) => {node.label += ` ${index + 1}`;});
  return rows;
}

function includesRecord(parent, child, seen = new Set()) {
  if (parent === child) return true;
  if (!parent || seen.has(parent)) return false;
  seen.add(parent);
  return (indexedResource(currentTextReference(parent).uid)?.references || []).some(reference =>
    reference.relation === 'includes-record' && includesRecord(indexedResource(reference.target)?.game_id, child, seen));
}

function providerLabel(recordId, provider, preview) {
  for (const layer of preview?.layers || []) {
    if (!includesRecord(layer.record, recordId)) continue;
    const path = layer.provider_save_names?.[provider] || layer.provider_save_values?.[provider]
      || layer.provider_scripts?.[provider] || layer.provider_values?.[provider];
    const field = typeof path === 'string' && FIELD_NAMES[path.split('.').at(-1)];
    if (field) return field;
    const itemIndex = layer.provider_save_items?.providers?.indexOf(provider) ?? -1;
    if (itemIndex >= 0) return `携带位 ${itemIndex + 1}`;
    const slot = layer.component_slot_providers?.[provider];
    if (slot) return slot.label;
  }
  return RECORD_FIELDS[recordKey(recordId)]?.[provider] || null;
}

function insertionLabel(item, recordId, preview) {
  for (const layer of preview?.layers || []) {
    const binding = layer.facility_parameter_bindings?.find(binding => binding.record === recordId
      && (binding.provider != null ? binding.provider === item.operands[0]
        : binding.token === item.token && binding.record_relative_offset === item.offset));
    const name = FORMULA_NAMES[binding?.value_source?.formula_id];
    if (name) return name;
  }
  const key = recordKey(recordId), provider = item.operands[0];
  if (key === '02:039' && provider === 10) return item.token === 0xFA ? '战车名称' : '战车编号';
  if (key === '02:003' && provider === 10) return '装甲';
  if (key === '12:000' && provider === 16 && preview?.field_overview?.kind === 'defense') return '防御';
  if (['02:004', '02:005', '03:015', '09:001'].includes(key)) {
    const index = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (index >= 0) return `携带位 ${index + 1}`;
  }
  if (key === '12:017') {
    const part = [39, 41, 42, 43, 44, 45, 46, 47].indexOf(provider);
    const carry = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (part >= 0) return `携带位 ${part + 1} 装备部件`;
    if (carry >= 0) return `携带位 ${carry + 1} 物品`;
  }
  if (key === '12:018') {
    const weight = [39, 59, 47, 48, 49, 50, 51, 52].indexOf(provider);
    const condition = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (weight >= 0) return `携带位 ${weight + 1} 重量`;
    if (condition >= 0) return `携带位 ${condition + 1} 损坏状态`;
  }
  if (key === '04:000') {
    const index = [15, 16, 18, 20, 22, 24].indexOf(provider);
    if (index >= 0 && item.token === 0xFA) return `炮弹位 ${index + 1} 名称`;
  }
  if ([0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD].includes(item.token)) {
    const field = providerLabel(recordId, item.operands[0], preview);
    if (field) return field;
    return `${uiRecordComponentLabel(recordId)}${[0xF8, 0xF9].includes(item.token) ? '数值' : '名称'}`;
  }
  if (item.token === 0xE8) return '姓名';
  if (item.token === 0xE9) return ['15:016', '15:017'].includes(key) ? '通缉目标'
    : key === '02:094' ? '金额提示' : key.startsWith('02:') ? '所选物品' : '引用名称';
  if (item.token === 0xE2) return ['record:06:035', 'record:06:156'].includes(recordId) ? '价格' : '数量';
  const region = {0xEA: 0x13, 0xEC: 0x14, 0xF2: 0x09, 0xF3: 0x11}[item.token];
  const target = item.token === 0xF7 ? textRecordNodeId(item.operands[1], item.operands[0])
    : region != null ? textRecordNodeId(region, item.operands[0]) : null;
  if (['record:02:005', 'record:09:001'].includes(target)) return `${uiRecordComponentLabel(target)}引用`;
  return target ? uiRecordComponentLabel(target, {fallback: key === '04:000' ? '炮弹统计标题'
    : `${uiRecordComponentLabel(recordId)}字样`}) : null;
}

function uiTextComponentLabel(record, component, preview = null) {
  const tokens = textRecordEditorTokens(record, state.project.text_record_encoding, state.project.text_record_edits)
    .filter(item => component.ranges.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length));
  const fields = [...new Set(tokens.filter(item => item.kind === 'fill')
    .map(item => insertionLabel(item, record.node_id, preview)).filter(Boolean))];
  if (fields.length) return fields.join(' / ');
  const text = literalName(component.text).replace(/^[，：…\s]+|[，：…\s]+$/gu, '');
  return componentTextSummary(text) || (tokens.some(item => item.kind === 'text'
    && item.text.startsWith('〔字节:')) ? '状态图标' : '间隔');
}

function uiChoiceComponentLabel(group, choice, fallback) {
  const source = group?.choice_source;
  const index = Number(choice?.index);
  if (!source || !Number.isInteger(index)) return choiceName(currentTextChoiceLabel(choice?.label_reference) || fallback);
  switch (source.kind) {
    case 'carried-items': case 'carried-equipment': case 'carried-vehicle-equipment': return `携带位 ${index + 1}`;
    case 'party-members-with-all': return index === source.all_index ? '全员' : `人物 ${index}`;
    case 'party-character-vehicle-pairs': return `${index % 2 ? '战车' : '人物'} ${Math.floor(index / 2) + 1}`;
    case 'party-vehicle-pairs': return `战车 ${Math.floor(index / 2) + 1}`;
    case 'party-characters': return `人物 ${index + 1}`;
    case 'confirm-cycles-party-character': return '切换人物';
    case 'owned-vehicle-slots': return `战车 ${index + 1}`;
    case 'owned-vehicle-pairs': return `战车 ${(source.index_to_vehicle?.[index] ?? index) + 1}`;
    case 'vehicle-components': return ['主炮', '副炮', 'S-E', 'C 装置', '引擎', '底盘'][index];
    case 'eligible-weapon-mounts': return `挂载位 ${index + 1}`;
    case 'decimal-digits': return `数位 ${index + 1}`;
    case 'paged-damaged-vehicle-parts': return `损坏部件行 ${index + 1}`;
    case 'paged-vehicle-box-items': return `车载道具行 ${index + 1}`;
    case 'flag-gated-text-records': case 'equipment-attribute-selector':
      return choiceName(currentTextChoiceLabel({record: source.records[index]})) || (() => {
        const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(source.records[index]);
        return match ? uiRecordComponentLabel(textRecordNodeId(parseInt(match[1], 16), parseInt(match[2], 16)),
          {fallback}) : fallback;
      })();
    default: return fallback;
  }
}

// @editor-module 界面工作台共用场景位置选择与黑底清除。

function interfacePreviewSceneMarkup() {
  return '<span class="screen-workbench-selection" data-interface-preview-scene></span>';
}

async function bindInterfacePreviewScene(root, {rerender}) {
  const host = root?.querySelector('[data-interface-preview-scene]');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = 'loading';
  try {
    const entries = (await db.getDocument('project.scenes')).editable_scenes;
    if (!host.isConnected) return;
    const {scene, boundScene} = interfacePreviewContext();
    host.innerHTML = `<span>预览场景</span>${scenePositionPickerMarkup({entries,
      sceneId: scene?.sceneId ?? -1, x: scene?.x ?? 8, y: scene?.y ?? 7,
      label: '预览场景', minSceneId: -1, deferCandidates: true, readOnly: Boolean(boundScene), specialValueLabels: {'-1': '黑底'}})}
      <button class="button ghost" type="button" data-interface-preview-scene-clear${scene && !boundScene ? '' : ' disabled'} aria-label="清除预览场景">×</button>
      ${interfacePreviewContext().service ? `<span>配置 ${esc(interfacePreviewContext().service.argument)}</span>` : ''}
      <small data-interface-preview-scene-error role="status" hidden></small>`;
    if (!scene) host.querySelector('[data-scene-position-current]').hidden = true;
    const change = async value => {
      selectInterfacePreviewContext('scene', value);
      replaceHistoryUrl(currentViewUrl());
      await rerender();
    };
    hydrateScenePositionPicker(host.querySelector('[data-scene-position-picker]'), {entries,
      onConfirm: async value => {
        if (value.sceneId === -1) return change(null);
        if (!entries.some(entry => Number(entry.id) === value.sceneId)) return false;
        await change(value);
      }});
    host.querySelector('[data-interface-preview-scene-clear]').addEventListener('click', () => void change(null));
    host.dataset.ready = '1';
  } catch (error) {
    editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
    host.innerHTML = `<span role="status">${esc(error.message)}</span>`;
    delete host.dataset.ready;
  }
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

// @editor-module 角色项名引用当前说话人文字与已发布交互用途。

function dialogueSpeakerName(reference) {
  if (!/^record:0C:[0-9]{3}$/u.test(String(reference || ''))) return '';
  const text = currentTextReference(reference).label;
  const name = text.split('「')[0].trim();
  return text.includes('「') && name && !name.includes('〔') ? name : '';
}

function sceneActorName(record) {
  const entry = state.project?.story?.npc_catalog?.records?.find(row => row.uid === record?.uid);
  if (entry?.label) return {label: entry.label, nameSource: '剧情文案与场景用途'};
  const references = Number(record?.text_region) > 0 && Number(record.text_region) < 0x10
    ? [`record:${Number(record.text_region).toString(16).toUpperCase().padStart(2, '0')}:${
      String(record.interaction_or_record_id).padStart(3, '0')}`]
    : (entry?.text_references || []).filter(row => row.found).map(row => row.node_id);
  for (const reference of references) {
    const name = dialogueSpeakerName(reference);
    if (name) return {label: name, nameSource: `说话人前缀 · ${reference}`};
  }
  if (entry?.service?.label) return {label: entry.service.label, nameSource: '服务用途'};
  const text = references.map(reference => componentTextSummary(currentTextReference(reference).label)).find(Boolean);
  if (text) return {label: `对话角色 · ${text}`, treeLabel: '对话角色', nameSource: '交互正文'};
  return {label: record ? Number(record.autonomous_script_id) ? '场景动作角色' : '场景角色'
    : '临时角色', nameSource: ''};
}

// @editor-module 剧情组件项名只保留剧情用途与场景名称。

function storyComponentLabel(label) {
  return String(label || '')
    .replace(/scene-actor:[0-9A-F]+:[0-9A-F]+|角色\s+[0-9A-F]{2}[·:][0-9A-F]{2}/gu, '角色')
    .replace(/编队\s+\$?[0-9A-F]{2}\s*剧情战/gu, '剧情战斗')
    .replace(/encounter-formation:[0-9A-F]+|编队\s+\$?[0-9A-F]{2}/gu, '剧情战斗')
    .replace(/MODE\s+\$[0-9A-F]+\s*·?\s*/gu, '')
    .replace(/scene-actor-list:[0-9A-F]+|story-interaction-script:script:[0-9A-F]+/gu, '')
    .replace(/场景\s*\$[0-9A-F]+/gu, '场景')
    .replace(/\s+[0-9A-F]{2}(?:\s*[\/–→]\s*[0-9A-F]{2})*$/u, '')
    .replace(/\s+/gu, ' ').replace(/^[\s/·–]+|[\s/·–]+$/gu, '') || '剧情演出';
}

function storySequenceComponentLabel(sequenceId, fallback) {
  const page = storyPageDefinitionForView(storyViewForSequenceId(sequenceId));
  return storyComponentLabel(page?.sequenceId ? page.title : fallback);
}

export { applyBattleResultEffects, battleResultExecution, battleResultGraph, bindInterfacePreviewScene, createInterfaceStateControllerWorkbench, dialogueSpeakerName, dialogueStateExecution, dialogueStateModel, distinctUiComponentLabels, facilityConfigurationLabel, facilityConfigurationSummary, facilityConfigurationSummaryContext, interfacePreviewSceneMarkup, interfaceStateGraphMarkup, interfaceStateWorkbench, sceneActorName, storyComponentLabel, storySequenceComponentLabel, uiChoiceComponentLabel, uiImageComponentLabel, uiRecordComponentLabel, uiTextComponentLabel };
