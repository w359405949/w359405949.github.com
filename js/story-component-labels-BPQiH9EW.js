import { esc, canvasViewportControls, bindCanvasViewport, showEditorError, currentTextReference, currentTextChoiceLabel, indexedResource } from './element-tree-DsgOBeTK.js';
import { SERVICE_FAMILY_PAGES } from './story-event-links-CRjG_25M.js';
import { interfaceStateSourceIdentity, sourceEntry, reference, applicationHandle, interfaceStateSources as interfaceStateSources$1, db, textRecordEditorTokens, textRecordNodeId } from './battle-result-script-runtime-B_EClFew.js';
import { navigateInternalUrl, interfacePreviewContext, selectInterfacePreviewContext, replaceHistoryUrl, currentViewUrl } from './ui-editor-nodes-CtPdwTyu.js';
import { state } from './emulator-DynsZsth.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker } from './components-DqADvo3I.js';
import { storyPageDefinitionForView, storyViewForSequenceId } from './package-schema-paths-gCIepLXx.js';

// @editor-module 状态图按领域提供的暂停、控制与分支声明折叠并保留原始转移。
function foldInterfaceStateGraph(adapter) {
  const nodes = new Map(), transitions = [], queue = [], initializations = [], boundaries = [];
  const walk = (from, location, controls, declarations, input, visited, steps = []) => {
    const current = adapter.enter(location);
    if (!current) return;
    const key = adapter.positionKey(current);
    if (visited.has(key)) {
      boundaries.push({from: from?.id ?? null, location: current, reason: 'no-progress-cycle'});
      return;
    }
    const seen = new Set([...visited, key]);
    const node = adapter.pause(current);
    if (node) {
      if (!nodes.has(node.id)) {nodes.set(node.id, node); queue.push(node);}
      const setup = adapter.setup(current);
      if (from) transitions.push({from: from.id, to: node.id, controls,
        arrival: current.control, declarations: [...declarations, ...setup], input: input || '继续', steps});
      else initializations.push({to: node.id, controls, declarations: [...declarations, ...setup], steps});
      return;
    }
    const nextControls = controls.at(-1) === current.control ? controls : [...controls, current.control];
    for (const branch of adapter.branches(current)) {
      const effects = [...declarations, ...branch.declarations];
      const nextSteps = [...steps, {location: current, input: branch.input,
        condition: branch.condition ?? null, effects: branch.effects || [],
        call: branch.call ?? null, returnTo: branch.returnTo ?? null, evidence: branch.evidence ?? adapter.evidence}];
      if (branch.exit) transitions.push({from: from?.id ?? null, to: null,
        controls: nextControls, declarations: effects, input: input || branch.input || '继续 / 返回', steps: nextSteps});
      else walk(from, branch.location, nextControls, effects, branch.input || input, seen, nextSteps);
    }
  };
  walk(null, adapter.entry, [], [], null, new Set());
  const entry = nodes.values().next().value?.id;
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index], continuation = adapter.resume(node);
    walk(node, continuation.location, continuation.controls, [], continuation.input, new Set());
  }
  const raw = transitions.filter(edge => edge.from).map((edge, index) => ({...edge, id: `transition:${index}`,
    evidence: adapter.evidence,
    executable: false}));
  const merged = new Map();
  for (const route of raw) {
    const id = `${route.from}>${route.to || 'exit'}:${route.input}`;
    if (!merged.has(id)) merged.set(id, {id, from: route.from, to: route.to, input: route.input, routes: []});
    merged.get(id).routes.push(route);
  }
  const edges = [...merged.values()].map(edge => ({...edge,
    unknown: edge.routes.some(route => route.declarations.some(row => !row.confirmed)),
    condition: [...new Set(edge.routes.flatMap(route => route.declarations.map(row => row.label)))].join('；'),
    evidence: adapter.evidence}));
  return {nodes: [...nodes.values()], edges, transitions: raw, entry, initializations, boundaries};
}

function publishedInterfaceStateGraph({previews, accepts, node, fallback}) {
  const nodes = previews.filter(accepts).map(node);
  if (!nodes.length) nodes.push(fallback);
  return {nodes, edges: [], transitions: [], entry: nodes[0]?.id, initializations: [], boundaries: []};
}

function interfaceGraphConnections(graph, selected, pathEdges) {
  const merged = new Map();
  for (const edge of graph.edges) {
    if (!selected.fullGraph && edge.from !== selected.node && edge.to !== selected.node && !pathEdges.has(edge.id)) continue;
    const key = JSON.stringify([edge.from, edge.to]);
    if (!merged.has(key)) merged.set(key, {from: edge.from, to: edge.to, members: []});
    merged.get(key).members.push(edge);
  }
  return [...merged.values()].map(connection => ({...connection, id: connection.members[0].id,
    input: [...new Set(connection.members.map(edge => edge.input))].join(' / '),
    condition: [...new Set(connection.members.map(edge => edge.condition).filter(Boolean))].join('；'),
    unknown: connection.members.some(edge => edge.unknown),
    annotation: [...new Set(connection.members.map(edge => edge.annotation).filter(Boolean))].join('；'),
    selected: connection.members.some(edge => edge.id === selected.edge),
    onPath: connection.members.some(edge => pathEdges.has(edge.id))}));
}

function fullInterfaceGraphPositions(graph) {
  const depths = new Map([[graph.entry, 0]]), queue = [graph.entry];
  while (queue.length) {
    const from = queue.shift();
    for (const edge of graph.edges.filter(edge => edge.from === from && edge.to)) {
      if (depths.has(edge.to)) continue;
      depths.set(edge.to, depths.get(from) + 1); queue.push(edge.to);
    }
  }
  const rows = new Map(), positions = new Map();
  for (const node of graph.nodes) {
    const column = depths.get(node.id) ?? Math.max(0, ...depths.values()) + 1;
    const row = rows.get(column) || 0; rows.set(column, row + 1);
    positions.set(node.id, {x: 24 + column * 360, y: 32 + row * 96});
  }
  if (graph.edges.some(edge => edge.to === null)) positions.set(null,
    {x: Math.max(24, ...[...positions.values()].map(position => position.x)) + 360, y: 32});
  return positions;
}

function nearbyInterfaceGraphPositions(graph, selected, links, active) {
  const positions = new Map(), activeNodes = new Set([selected.node]);
  const path = [...new Set(active?.nodes || [])], focusIndex = path.indexOf(selected.node);
  const focusColumn = Math.max(1, focusIndex);
  positions.set(selected.node, {x: 24 + focusColumn * 416, y: 32});
  const columnOf = id => path.includes(id) ? path.indexOf(id) + (focusIndex === 0 ? 1 : 0)
    : links.some(link => link.to === id && link.from === selected.node) ? focusColumn + 1 : focusColumn - 1;
  for (const [index, link] of links.entries()) for (const id of [link.from, link.to]) {
    activeNodes.add(id);
    if (!positions.has(id)) positions.set(id, {x: 24 + columnOf(id) * 416, y: 32 + index * 72});
  }
  for (const [index, node] of graph.nodes.filter(node => node.navigationOnly).entries()) {
    activeNodes.add(node.id);
    positions.set(node.id, {x: 24, y: 32 + index * 72});
  }
  const restY = 128 + links.length * 72;
  let rest = 0;
  for (const node of graph.nodes) if (!positions.has(node.id)) {
    positions.set(node.id, {x: 24 + rest % 4 * 240, y: restY + Math.floor(rest / 4) * 72}); rest++;
  }
  return {positions, activeNodes};
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

// @editor-module 状态机预览为来源目录注入状态图打开能力。

function interfaceStateSources(options = {}) {
  return interfaceStateSources$1({...options, openSource: publishedInterfaceStateSource});
}



function interfaceStateReferenceNode({id, label, identity: providedIdentity = null, pageId = null, commandId = null, nodeId = null,
  stateId = null, entryId = null, sceneId = null, argument = null, route = null, ...description}) {
  const identity = providedIdentity || interfaceStateSourceIdentity({pageId, commandId});
  const destination = {...(route || {
    view: 'interfaceui', interface: pageId,
    ...(stateId ? {interfaceScreen: `ui-screen:interface:${stateId.split('.')[0]}:state:${stateId}`} : {}),
    ...(entryId || nodeId ? {interfaceEntry: entryId || nodeId} : {}),
  })};
  if (commandId != null && argument != null) Object.assign(destination, {
    previewCommand: commandId, previewArgument: argument,
    ...(destination.view === 'shops' ? {shopConfig: argument} : {}),
  });
  const entry = sourceEntry(identity, {pageId, id: nodeId, sceneId, instance: argument, route: destination});
  return {id, label, ...description, role: 'reference', regions: [],
    reference: {sourceId: identity.id, label, nodeId, entry}};
}

function interfaceStateReferenceGraph(graph) {
  return {...graph, nodes: graph.nodes.map(node => {
    if (!node.referenceTarget) return node;
    const {referenceTarget: target, ...description} = node;
    const page = target.commandId == null ? null
      : SERVICE_FAMILY_PAGES.find(row => row.commandId === target.commandId);
    return interfaceStateReferenceNode({...description, ...target,
      pageId: target.pageId || page?.id || (target.commandId != null ? 'interaction-service' : null),
      route: target.route || page?.route || (target.commandId != null
        ? {view: 'interfaceui', interface: 'interaction-service', resource: applicationHandle(target.commandId)} : null),
      label: target.label || page?.label || node.label});
  })};
}

// 图投影只持有当前来源的节点与跨来源入口；领域执行仍消费完整协议。
function interfaceStatePageGraph(graph, pageId, {parent = null, pageLabel = id => id} = {}) {
  const local = graph.nodes.filter(node => node.pageId === pageId), ids = new Set(local.map(node => node.id));
  const references = new Map();
  const referenceFor = target => {
    if (!references.has(target.id)) references.set(target.id, interfaceStateReferenceNode({
      id: `reference:${target.id}`, label: pageLabel(target.pageId), pageId: target.pageId,
      nodeId: target.id, stateId: target.stateId, entryId: target.entryId,
      boundary: target.boundary, evidence: target.evidence,
    }));
    return references.get(target.id).id;
  };
  const project = edges => edges.filter(edge => ids.has(edge.from)).map(edge => {
    const target = graph.nodes.find(node => node.id === edge.to);
    return target && !ids.has(target.id) ? {...edge, to: referenceFor(target), target: edge.to} : edge;
  });
  const edges = project(graph.edges), transitions = project(graph.transitions || []);
  if (parent && !references.has(parent.id)) {
    referenceFor(parent);
    references.get(parent.id).navigationOnly = true;
  }
  return {...graph, nodes: [...local, ...references.values()], edges, transitions,
    entry: ids.has(graph.entry) ? graph.entry : local[0]?.id};
}


function interfaceStateFieldReferences(bindings = []) {
  return bindings.flatMap(binding => (binding.columns?.length ? binding.columns : [binding.field || binding.fieldName || null])
    .map(field => ({resourceId: binding.resourceId || binding.resource,
      handle: binding.handle ?? binding.entityHandle ?? null, field,
      ...(binding.ranges ? {ranges: binding.ranges} : {})})));
}

function interfaceStateGraphProjection(graph, selected = {}, paths = []) {
  const active = paths.find(path => path.id === selected.path);
  return {graph, nodes: graph.nodes, transitions: graph.transitions || [],
    connections: interfaceGraphConnections(graph, selected, new Set(active?.edges?.map(edge => edge.id))),
    pauses: graph.nodes.filter(node => node.pause),
    regions: graph.nodes.flatMap(node => (node.regions || []).map(region => ({node: node.id, region}))),
    evidence: [...new Set([...graph.nodes, ...(graph.transitions || []), ...graph.edges]
      .flatMap(row => row.evidence || row.pause?.evidence || []).filter(Boolean))],
    boundaries: [...(graph.boundaries || []), ...graph.nodes.filter(node => node.boundary || node.role === 'call' || node.reference),
      ...graph.edges.filter(edge => edge.unknown)]};
}

function createInterfaceStateSource({identity: providedIdentity = null, command = null, pageId = null, entry = {},
  references = () => [], graph, paths = () => [], selection, execution = {}, components = {},
  contextRequirements = ['preview-context'], capabilities = {}}) {
  const identity = providedIdentity || interfaceStateSourceIdentity({commandId: command?.command_id, pageId});
  const describedPaths = () => paths().map(path => ({...path,
    identity: {id: `${identity.id}/path/${encodeURIComponent(path.id)}`, sourceId: identity.id, key: path.id}}));
  const fields = id => interfaceStateFieldReferences(components.fields?.(id) || []);
  const source = {
    identity, entry: sourceEntry(identity, entry, pageId), contextRequirements,
    references: () => [
      ...(command ? [reference('application-command', applicationHandle(command.command_id))] : []),
      ...(command?.program_reference ? [reference('application-program', command.program_reference)] : []),
      ...references(),
      ...(components.current?.() || []).flatMap(component => fields(component.id)),
    ],
    graph: () => interfaceStateReferenceGraph(graph()), paths: describedPaths, selection,
    projection: () => interfaceStateGraphProjection(source.graph(), selection(), describedPaths()),
    execution: {
      initialize: execution.initialize || null,
      inputs: execution.inputs || (() => []),
      options: execution.options || (() => []),
      advance: execution.advance || null,
      preview: execution.preview || null,
      calls: execution.calls || (() => null),
      complete: execution.complete || (() => null),
    },
    components: {
      current: components.current || (() => []),
      selected: components.selected || (() => null),
      select: components.select || null,
      fields,
      mount: components.mount || null,
    },
    capabilities: {view: true, input: Boolean(execution.initialize && execution.advance),
      fields: Boolean(components.mount), structure: false, apply: false, export: false, rom: false,
      ...capabilities},
  };
  return source;
}

function publishedInterfaceStateSource({definition, command = null, previews, selection}) {
  const ids = new Set(definition.interfaceIds || [definition.id]);
  const states = new Set(definition.stateIds || []);
  const screens = new Set(definition.screenIds || []);
  const graph = publishedInterfaceStateGraph({previews,
    accepts: preview => states.size ? states.has(preview.interface_state_id)
      : [preview.interface_id, ...(preview.interface_ids || [])].some(id => ids.has(id))
        || screens.has(`ui-screen:${preview.id}`),
    node: preview => ({id: preview.id, label: preview.interface_state || definition.label,
      publishedPreview: preview, regions: []}),
    fallback: {id: definition.id, label: definition.label, boundary: true, regions: []}});
  return createInterfaceStateSource({command, pageId: definition.id, entry: {pageId: definition.id},
    graph: () => graph, selection,
    references: () => [...screens].map(handle => reference('ui-screen', handle)),
    execution: {preview: () => graph.nodes.find(node => node.id === selection().node)?.publishedPreview || null}});
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

export { bindInterfacePreviewScene, createInterfaceStateControllerWorkbench, createInterfaceStateSource, dialogueSpeakerName, distinctUiComponentLabels, foldInterfaceStateGraph, interfacePreviewSceneMarkup, interfaceStateGraphMarkup, interfaceStatePageGraph, interfaceStateSources, interfaceStateWorkbench, publishedInterfaceStateGraph, sceneActorName, storyComponentLabel, storySequenceComponentLabel, uiChoiceComponentLabel, uiImageComponentLabel, uiRecordComponentLabel, uiTextComponentLabel };
