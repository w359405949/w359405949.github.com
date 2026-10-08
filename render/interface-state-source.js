// @editor-module 状态机来源从页面入口与领域协议派生，身份不含预览选择。
import {EDITOR_PAGES} from '../core/editor-pages.js';
import {INTERFACE_PAGE_DEFINITIONS, SERVICE_FAMILY_PAGES} from '../core/ui-page-registry.js';
import {FIELD_MENU_STATE_PAGES} from './field-menu-state-machine.js';
import {FIELD_MENU_NAVIGATION} from '../core/field-menu-tree.js';
import {BATTLE_INTERFACE_PAGES} from './battle-command-state-machine.js';
import {SYSTEM_STATE_PAGES} from './system-state-model.js';
import {SIMPLE_SERVICE_COMMANDS} from './simple-service-model.js';
import {LIST_QUANTITY_COMMANDS} from './list-quantity-service-model.js';
import {SPECIAL_SERVICE_COMMANDS} from './special-service-model.js';
import {MACHINE_SERVICE_COMMANDS} from './machine-service-model.js';
import {interfaceGraphConnections, publishedInterfaceStateGraph} from './interface-state-graph.js';

const applicationHandle = id => `application-command:${Number(id).toString(16).toUpperCase().padStart(2, '0')}`;
const reference = (resourceId, handle = null, field = null) => ({resourceId, handle, field});

function applicationDomain(id) {
  if ([0x31, 0x34].includes(id)) return 'system';
  if (MACHINE_SERVICE_COMMANDS.includes(id)) return 'machine';
  if ([0x10, 0x11, 0x12, 0x13, ...SIMPLE_SERVICE_COMMANDS,
    ...LIST_QUANTITY_COMMANDS, ...SPECIAL_SERVICE_COMMANDS].includes(id)) return 'shop';
  return 'published';
}

function pageIdentity(id) {
  if ([...FIELD_MENU_STATE_PAGES, 'field-board-exit', 'field-investigation'].includes(id))
    return {domain: 'menu', key: id};
  if (id === 'field-dialogue') return {domain: 'dialogue', key: id};
  if (SYSTEM_STATE_PAGES.includes(id)) return {domain: 'system', key: id};
  if (BATTLE_INTERFACE_PAGES.includes(id)) return {domain: 'battle', key: 'battle-command'};
  if (['battle-messages', 'battle-results'].includes(id)) return {domain: 'battle', key: id};
  return {domain: 'published', key: id};
}

function interfaceStateSourceIdentity({commandId = null, pageId = null} = {}) {
  if (commandId != null) {
    const id = Number(commandId);
    if (!Number.isInteger(id) || id < 0 || id > 255) throw new TypeError('状态机命令入口无效');
    if (id === 0x31) return {id: 'system:name-entry', domain: 'system', key: 'name-entry'};
    if (id === 0x34) return {id: 'system:save-management', domain: 'system', key: 'save-management'};
    return {id: `application:${id.toString(16).toUpperCase().padStart(2, '0')}`,
      domain: applicationDomain(id), key: applicationHandle(id)};
  }
  if (!pageId) throw new TypeError('状态机缺少稳定入口');
  const identity = pageIdentity(pageId);
  return {id: `${identity.domain}:${identity.key}`, ...identity};
}

// 入口身份只含页面、变体与入口键，实例与执行位置保留在调用现场。
function sourceEntry(identity, entry, pageId = null) {
  const key = [entry.pageId || pageId || identity.key, entry.variant, entry.request, entry.id]
    .filter(value => value != null && value !== '').map(value => encodeURIComponent(value)).join('/');
  return {...entry, pageId: entry.pageId || pageId || null,
    identity: {id: `${identity.id}/entry/${key}`, sourceId: identity.id, key}};
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
export function interfaceStatePageGraph(graph, pageId, {parent = null, pageLabel = id => id} = {}) {
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

// 来源清单只合并既有入口，共享程序引用仍由命令当前值提供。
export function interfaceStateSources({commands = []} = {}) {
  const sources = new Map();
  const add = (request, entry, label, program = null) => {
    const identity = interfaceStateSourceIdentity(request);
    if (!sources.has(identity.id)) sources.set(identity.id, {identity, label, entries: [], references: [],
      contextRequirements: ['preview-context'], capabilities: {view: true, input: false,
        fields: false, structure: false, apply: false, export: false, rom: false},
      open: ({previews = [], selection}) => {
        const pageId = sources.get(identity.id).entries[0]?.pageId || request.pageId;
        const page = INTERFACE_PAGE_DEFINITIONS.find(row => row.id === pageId)
          || SERVICE_FAMILY_PAGES.find(row => row.id === pageId)
          || {id: pageId || identity.key, label, interfaceIds: []};
        const command = request.commandId == null ? null
          : commands.find(row => row.command_id === request.commandId) || {command_id: request.commandId};
        return publishedInterfaceStateSource({definition: page, command, previews, selection});
      }});
    const source = sources.get(identity.id);
    if (entry) {
      const described = sourceEntry(identity, entry, request.pageId);
      if (!source.entries.some(row => row.identity.id === described.identity.id)) source.entries.push(described);
    }
    if (request.commandId != null) {
      const handle = applicationHandle(request.commandId);
      if (!source.references.some(row => row.handle === handle))
        source.references.push(reference('application-command', handle));
    }
    if (program && !source.references.some(row => row.handle === program))
      source.references.push(reference('application-program', program));
    return source;
  };
  for (const page of INTERFACE_PAGE_DEFINITIONS) {
    if (page.commandIds?.length || SERVICE_FAMILY_PAGES.some(service => service.id === page.id)) continue;
    add({pageId: page.id}, {pageId: page.id, route: {view: 'interfaceui', interface: page.id}}, page.label);
    if (page.id === 'name-entry') for (const screen of page.screenIds || []) {
      const variant = screen.match(/^ui-screen:constructor:([^:]+-name)$/u)?.[1];
      if (variant) add({pageId: page.id}, {pageId: page.id, variant,
        route: {view: 'interfaceui', interface: page.id, interfaceScreen: screen}}, page.label);
    }
  }
  for (const entry of FIELD_MENU_NAVIGATION) add({pageId: entry.pageId},
    {pageId: entry.pageId, request: entry.flowId,
      route: {view: 'interfaceui', interface: entry.pageId, interfaceScreen: entry.screenId,
        ...(entry.entryId ? {interfaceEntry: entry.entryId} : {})}}, entry.label);
  for (const page of SERVICE_FAMILY_PAGES) {
    const command = commands.find(row => row.command_id === page.commandId);
    add({commandId: page.commandId}, {pageId: page.id, commandId: page.commandId,
      ...(applicationDomain(page.commandId) === 'machine' ? {variant: 'service'} : {}), route: page.route},
      page.label, command?.program_reference);
  }
  for (const command of commands) add({commandId: command.command_id},
    null, command.label, command.program_reference);
  const title = EDITOR_PAGES.find(page => page.route?.view === 'cutscene-title');
  if (title) add({pageId: 'startup-load'}, {pageId: title.id, variant: 'title', route: title.route}, title.label);
  const poster = EDITOR_PAGES.find(page => page.route?.view === 'wanted-ui');
  if (poster) for (const variant of ['poster', 'service'])
    add({commandId: 0x25}, {pageId: poster.id, variant, route: poster.route}, poster.label);
  return [...sources.values()];
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

export function createInterfaceStateSource({identity: providedIdentity = null, command = null, pageId = null, entry = {},
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
