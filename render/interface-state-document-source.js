// @editor-module 文档按领域语义生成只读状态图，物理声明不进入文档。
import {createInterfaceStateSource, interfaceStatePageGraph, interfaceStateSources} from './interface-state-source.js';
import {genericShopGraph, genericShopPreview} from './generic-shop-model.js';
import {machineServiceGraph} from './machine-service-model.js';
import {fieldMenuStateGraph} from './field-menu-state-machine.js';
import {addHumanItemsStateGraph} from './human-items-state-model.js';
import {systemStateGraph} from './system-state-model.js';
import {battleCommandGraph} from './battle-command-state-machine.js';
import {battleResultGraph} from './battle-result-state-machine.js';
import {dialogueStateModel} from './dialogue-state-model.js';
import {projectStoryScriptPrograms} from '../core/story-script-layout.js';

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

export async function openInterfaceStateDocumentSource(document, database, selected, {encoding, previewForNode} = {}) {
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
