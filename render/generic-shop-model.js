// @editor-module 商店原型把输入等待点之间的控制段折叠到只读转移。
import {SHOP_REGIONS, stableShopFrame} from './generic-shop-frames.js';
import {shopNativeOperation} from './generic-shop-native.js';
import {foldInterfaceStateGraph, publishedInterfaceStateGraph} from './interface-state-graph.js';
import {simpleServiceGraph, SIMPLE_SERVICE_COMMANDS} from './simple-service-model.js';
import {listQuantityServiceGraph, LIST_QUANTITY_COMMANDS} from './list-quantity-service-model.js';
import {specialServiceGraph, SPECIAL_SERVICE_COMMANDS} from './special-service-model.js';
import {deviceServiceGraph} from './device-service-model.js';
export {genericShopPreview} from './generic-shop-frames.js';

const PAUSES = {'wait-for-confirm-marker': 'wait', 'open-choice-selector': 'choice',
  'open-choice-selector-alias': 'choice', 'page-break-or-repeat-end': 'page'};
const PATHS = [
  {id: 'purchase', label: '购买成功', segments: [1, 3, 4, 6, 8, 36, 11, 12, 14, 15, 45, 50, 41, 17, 19, 6]},
  {id: 'funds', label: '余额不足', segments: [1, 3, 4, 6, 8, 9, 10, 6]},
  {id: 'refused', label: '出售被拒', segments: [1, 3, 39, 20, 22, 23, 43, 24, 25, 27, 29, 30, 31, 29]},
];
function inputFor(segment, index) {
  const op = segment.terminator.opcode;
  if (op === 0xF7) return ['A 确定', 'B 返回'][index];
  if (op === 0x8F) return ['购买', '出售', '退出'][index];
  if (op === 0xD5 && [7, 11, 16, 18, 32, 46, 52].includes(segment.index)) return ['是', '否'][index];
  return null;
}

export function genericShopGraph(command, textDocument, previews, branches, {catalog, invocation} = {}) {
  if (command.command_id === 0x1F) {
    const graph = deviceServiceGraph(command, textDocument, previews, catalog, invocation);
    for (const node of graph.nodes) node.regions = node.regions.map(region => ({...region, id: 'device'}));
    return graph;
  }
  const basic = command.command_id >= 0x10 && command.command_id <= 0x13;
  if (!basic && SPECIAL_SERVICE_COMMANDS.includes(command.command_id))
    return specialServiceGraph(command, textDocument, previews, branches);
  if (!basic && LIST_QUANTITY_COMMANDS.includes(command.command_id))
    return listQuantityServiceGraph(command, textDocument, previews, branches);
  if (!basic) return SIMPLE_SERVICE_COMMANDS.includes(command.command_id)
    ? simpleServiceGraph(command, textDocument, previews, branches) : publishedShopGraph(command, previews);
  const segments = command.dialogue_flow.segments;
  const pauses = new Map(segments.map(segment => {
    const points = [];
    for (const action of segment.actions.filter(action => action.record)) {
      let confirmedWaits = 0;
      for (const token of textDocument?.records?.[action.record]?.protected_ranges || []) {
        if (!PAUSES[token.semantic]) continue;
        points.push({kind: PAUSES[token.semantic], action, token, confirmedWaits,
          ordinal: points.length, evidence: `${action.record}/bytes:${token.offset}`});
        if (PAUSES[token.semantic] !== 'choice') confirmedWaits++;
      }
    }
    if (segment.terminator?.opcode === 0xF7) points.push({kind: 'menu', ordinal: points.length,
      evidence: `PRG:${segment.terminator.prg_offset.toString(16).toUpperCase()}; F7 → PRG:07ED1F`});
    return [segment.index, points];
  }));
  const graph = foldInterfaceStateGraph({
    entry: {control: 0, ordinal: 0, response: null},
    evidence: 'project/evidence/reverse-engineering/generic-shop-stable-frames/observations.json',
    enter: location => {
      const segment = segments[location.control];
      if (!segment) return null;
      const action = segment.actions.filter(row => row.record).at(-1);
      return {...location, response: location.ordinal === 0 && action
        ? {segment: location.control, action} : location.response};
    },
    positionKey: location => JSON.stringify([location.control, location.ordinal, location.response?.segment,
      location.response?.action?.prg_offset]),
    pause: ({control, ordinal, response}) => {
      const pause = pauses.get(control)[ordinal];
      return pause ? stableShopFrame(segments[control], pause, pause.action, response, command) : null;
    },
    setup: ({control, ordinal}) => {
      const segment = segments[control], pause = pauses.get(control)[ordinal];
      const limit = pause.action?.prg_offset ?? segment.terminator.prg_offset;
      const previous = pauses.get(control)[ordinal - 1]?.action?.prg_offset ?? -1;
      return (segment.operations || []).filter(operation => operation.prg_offset < limit && operation.prg_offset > previous)
        .map(operation => shopNativeOperation(operation, segment, null)).filter(Boolean);
    },
    branches: ({control, ordinal, response}) => {
      const segment = segments[control], term = segment.terminator, previousPause = pauses.get(control)[ordinal - 1];
      const effects = (segment.operations || []).filter(operation => operation.opcode !== term?.opcode
        && (ordinal === 0 || previousPause?.kind !== 'menu' && operation.prg_offset > previousPause?.action.prg_offset))
        .map(operation => shopNativeOperation(operation, segment, null)).filter(Boolean);
      if (!term) return [];
      const branches = [];
      if (term.opcode === 0xFE && term.reason !== 'application-vm-indexed-segment-table-end')
        branches.push({exit: true, declarations: effects});
      for (const [branch, target] of (term.successor_segment_ids || []).entries()) {
        if (command.command_id === 0x13 && term.opcode === 0xE0 && branch === 0
          || command.command_id >= 0x12 && [15, 23].includes(control) && branch === 1) continue;
        const input = inputFor(segment, branch), native = input ? null : shopNativeOperation(term, segment, branch);
        branches.push({location: {control: Number(target.split(':').at(-1)), ordinal: 0, response},
          declarations: [...effects, ...(native ? [native] : [])], input});
      }
      return branches;
    },
    resume: node => ({location: {control: node.segment.index, ordinal: node.pause.ordinal + 1, response: node.response},
      controls: [node.segment.index], input: node.pause.kind === 'choice' ? null : '继续'}),
  });
  graph.basic = basic; graph.command = command.command_id;
  for (const edge of graph.edges) edge.annotation = [...new Set(edge.routes.flatMap(route =>
    route.declarations.filter(row => row.objectCount).map(row => row.label)))].join('；');
  const histories = new Map(graph.nodes.map(node => [node.id, new Set()]));
  const visits = [{id: graph.entry, list: false}];
  for (let index = 0; index < visits.length; index++) {
    const visit = visits[index], known = histories.get(visit.id);
    if (!known || known.has(visit.list)) continue;
    known.add(visit.list);
    for (const edge of graph.edges.filter(edge => edge.from === visit.id && edge.to)) {
      for (const route of edge.routes) {
        if (route.declarations.some(row => row.objectCount === 'single')) continue;
        visits.push({id: edge.to, list: visit.list || route.declarations.some(row => row.selectionList)});
      }
    }
  }
  for (const node of graph.nodes) {
    const history = histories.get(node.id);
    node.selectionMode = history.size > 1 ? 'switch' : history.has(true) ? 'list' : 'menu';
  }
  return graph;
}

function publishedShopGraph(command, previews) {
  const resource = `application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`;
  const graph = publishedInterfaceStateGraph({previews,
    accepts: preview => preview.shop_menu?.resource_id === resource && !preview.id.startsWith('constructor:private-'),
    node: preview => ({id: preview.id, label: preview.interface_state || preview.visible_state, publishedPreview: preview,
      pause: {kind: 'unknown'}, input: '等待输入方式未确认', regions: SHOP_REGIONS.map(region => ({...region,
        visible: true, cursor: false, source: preview.id, retention: '已发布阶段；稳定输入与转移未确认'}))}),
    fallback: {id: 'unknown-frame', label: '画面未确认', pause: {kind: 'unknown'},
    input: '当前应用没有已发布的对应预览构造', regions: SHOP_REGIONS.map(region => ({...region,
      visible: null, cursor: false, source: '未确认', retention: '未确认'}))}});
  return {...graph, basic: false};
}

export function genericShopPaths(graph, objectCount) {
  if (!graph.basic) return [];
  return PATHS.map(path => {
    const segments = path.segments.map(index => objectCount === 1
      ? index === 14 ? 13 : index === 22 ? 21 : index : index);
    const sequence = graph.command <= 0x11 ? segments.flatMap(index =>
      index === 36 ? [36, 37] : index === 39 ? [39, 40] : index === 50 ? [50, 51] : [index]) : segments;
    const nodes = [graph.entry], edges = [];
    let position = 0;
    while (position < sequence.length - 1) {
      const from = graph.nodes.find(node => node.id === nodes.at(-1));
      const candidate = graph.edges.flatMap(edge => edge.from === from.id && edge.to
        ? edge.routes.map(route => ({edge, route, target: graph.nodes.find(node => node.id === edge.to)})) : [])
        .find(({route, target}) => route.controls.every((control, index) => sequence[position + index] === control)
          && target.segment.index === sequence[position + route.controls.length]
          || route.controls.length === 1 && target.segment.index === sequence[position] && target.pause.ordinal > from.pause.ordinal);
      if (!candidate) break;
      edges.push({...candidate.edge, route: candidate.route}); nodes.push(candidate.edge.to);
      if (candidate.route.controls.length !== 1 || candidate.target.segment.index !== from.segment.index)
        position += candidate.route.controls.length;
    }
    return {...path, nodes, edges, available: position === sequence.length - 1};
  });
}

export function genericShopSelection(graph, selected, paths, objectCount) {
  if (!graph.basic) return null;
  const node = graph.nodes.find(node => node.id === selected.node);
  const path = paths.find(path => path.id === selected.path);
  const history = path?.nodes.slice(0, selected.step + 1)
    .map(id => graph.nodes.find(row => row.id === id)).filter(row => [14, 22].includes(row.segment.index));
  const list = objectCount > 1 && (path ? Boolean(history.length)
    : node.selectionMode === 'list' || node.selectionMode === 'switch' && Boolean(selected.objectSelected));
  const selector = [14, 22].includes(node.segment.index);
  return {list, cursor: list && selector,
    dependsOn: objectCount <= 1 ? '固定' : path ? '路径历史' : node.selectionMode === 'switch' ? '开关' : '固定',
    source: list ? history?.at(-1) || graph.nodes.find(row => row.segment.index ===
      (node.binding.startsWith('sale') || [44, 54].includes(node.segment.index) ? 22 : 14)) : null};
}
