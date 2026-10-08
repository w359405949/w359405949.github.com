// @editor-module 简单服务把应用暂停点与现有显示阶段适配为公共状态图。
import {foldInterfaceStateGraph} from './interface-state-graph.js';
import {interfaceApplicationPrograms} from './interface-application-execution.js';
import {facilityServiceStatePreviews} from '../core/facility-service-previews.js';
import {SHOP_REGIONS} from './generic-shop-frames.js';
import {simpleServiceNativeOperation} from './simple-service-native.js';

export const SIMPLE_SERVICE_COMMANDS = Object.freeze([0x16, 0x17, 0x18, 0x19, 0x1E, 0x24, 0x2C, 0x2E, 0x2F]);
export const SIMPLE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/simple-service-input/observations.json';

const menus = new Map([
  [0x16, {3: 'inn-service-room-select'}],
  [0x17, {5: 'bar-service-order-list', 10: 'bar-service-drinker-select'}],
  [0x18, {5: 'bar-service-alternate-order-list', 10: 'bar-service-alternate-drinker-select'}],
  [0x19, {3: 'interior-decoration-shop-list'}],
  [0x1E, {1: 'herbal-medicine-vendor-goods'}],
  [0x24, {2: 'special-item-buyer-actors', 6: 'special-item-buyer-category', 9: 'special-item-buyer-inventory'}],
  [0x2C, {0: 'vehicle-trade-amount'}],
  [0x2F, {6: 'paralysis-massage-service-target'}],
]);

export function simpleServiceGraph(command, text, previews, branches = [], {
  menuNodes = menus.get(command.command_id) || {}, nativeOperation = simpleServiceNativeOperation,
  evidence = SIMPLE_SERVICE_EVIDENCE, callbackTargets = {}, previewFor = () => null,
} = {}) {
  const programs = interfaceApplicationPrograms(command, text);
  const resource = `application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`;
  const candidates = previews.filter(preview => preview.shop_menu?.resource_id === resource
    && !preview.id.startsWith('constructor:private-'));
  const sourceFor = (segment, event) => {
    const adapted = previewFor(segment, event);
    if (adapted) return adapted;
    if (event.type === 'menu' && menuNodes[segment.index])
      return previews.find(row => row.id === `constructor:${menuNodes[segment.index]}`);
    const action = event.action || segment.actions.filter(row => row.record).at(-1);
    const branch = branches.find(row => row.id === segment.id);
    const body = branch?.bodies.find(row => row.id === action?.id);
    const declared = branch && facilityServiceStatePreviews(branch, body, previews, {}, branches);
    return declared?.[0] || candidates.find(row => row.shop_menu.welcome_handle?.endsWith(`:${action?.prg_offset}`));
  };
  const graph = foldInterfaceStateGraph({entry: {control: 0, position: 0}, evidence,
    enter: location => programs[location.control] ? location : null,
    positionKey: location => `${location.control}:${location.position}:${Boolean(location.resumed)}`,
    setup: () => [],
    pause: location => {
      const segment = command.dialogue_flow.segments[location.control];
      const event = programs[location.control][location.position];
      if (!event || location.resumed || !['pause', 'menu'].includes(event.type)) return null;
      const preview = sourceFor(segment, event);
      const cursor = event.type === 'menu' ? event.operation.operands[0] === 1 ? 'selection' : 'list'
        : event.kind === 'choice' ? 'dialogue' : null;
      return {id: `service:${location.control}:${event.ordinal}`, label: preview?.visible_state
        || preview?.interface_state || `${command.label} · ${location.control}:${event.ordinal}`,
        segment, position: location.position, action: event.action, publishedPreview: preview,
        pause: {kind: event.kind, ordinal: event.ordinal,
          confirmedWaits: programs[location.control].slice(0, location.position).filter(row => row.type === 'pause'
            && row.kind === 'wait' && row.action?.id === event.action?.id).length,
          evidence: event.token ? `${event.action.record}/bytes:${event.token.offset}`
            : `PRG:${event.offset.toString(16).toUpperCase()}`},
        input: event.kind === 'choice' ? '是 / 否；B 取消' : event.type === 'menu'
          ? '方向键选择；A 确定；B 返回' : 'A / B 继续',
        regions: SHOP_REGIONS.map(region => ({...region, visible: true, cursor: region.id === cursor,
          source: preview?.id || '显示阶段未确认', retention: '所属显示阶段与本次预览窗口'}))};
    },
    branches: location => {
      const event = programs[location.control][location.position], op = event?.operation?.opcode;
      const next = {control: location.control, position: location.position + 1};
      const declaration = op === undefined ? [] : [nativeOperation(event.operation, command.command_id)];
      if (!programs[location.control][next.position] || op === 0xD1 || op >= 0xD5 && op !== 0xD2) {
        const segment = command.dialogue_flow.segments[location.control], term = segment.terminator;
        if (!term) return (callbackTargets[location.control] || []).map(target => ({
          location: {control: target, position: 0}, declarations: declaration}));
        const targets = [0xF7, 0xF8, 0xF9, 0xFC].includes(term.opcode) ? term.operands.slice(1)
          : term.reason === 'application-vm-indexed-segment-table-end'
            ? term.successor_segment_ids.map(id => Number(id.split(':').at(-1)))
            : term.opcode >= 0xFE ? [term.opcode] : term.operands;
        return targets.map((target, index) => ({exit: target >= 0xFE,
          location: {control: target, position: 0}, declarations: op === undefined ? []
            : [nativeOperation(event.operation, command.command_id, index)],
          input: term.opcode === 0xF7 ? index ? 'B 返回' : 'A 确定' : null}));
      }
      return [{location: next, declarations: declaration}];
    },
    resume: node => ({location: {control: node.segment.index,
      position: node.position + (node.pause.kind === 'menu' ? 0 : 1), resumed: node.pause.kind === 'menu'},
      controls: [node.segment.index], input: node.pause.kind === 'choice' ? '选择后继续' : '继续'}),
  });
  const bodies = command.dialogue_flow.segments.flatMap(segment => segment.actions.filter(action => action.record
    && !graph.nodes.some(node => node.action?.id === action.id)).map(action =>
    sourceFor(segment, {action})).filter(Boolean));
  const displayStages = [...new Map([...candidates, ...bodies].map(preview => [preview.id, preview])).values()];
  const missing = displayStages.filter(preview => !graph.nodes.some(node =>
    node.publishedPreview?.id === preview.id || node.publishedPreview?.service_response?.template_id === preview.id));
  graph.nodes.push(...missing.map(preview => ({id: preview.id, label: preview.visible_state || preview.interface_state,
    publishedPreview: preview, pause: {kind: 'unknown', evidence: preview.id},
    input: '已发布显示阶段；暂停点或自然到达未确认',
    regions: SHOP_REGIONS.map(region => ({...region, visible: true, cursor: false,
      source: preview.id, retention: '已发布显示阶段'}))})));
  if (command.command_id === 0x2C) {
    const introduction = previews.find(row => row.id === 'constructor:vehicle-trade-introduction');
    const pauses = (text.records['record:0B:158']?.protected_ranges || []).filter(token =>
      ['page-break-or-repeat-end', 'wait-for-confirm-marker', 'open-choice-selector-alias', 'open-choice-selector'].includes(token.semantic));
    const nodes = pauses.map((token, index) => ({id: `service:trade-introduction:${index}`,
      label: token.semantic.startsWith('open-choice') ? '战车交易提议确认' : '战车交易前置正文',
      publishedPreview: introduction, introductionPosition: index,
      pause: {kind: token.semantic.startsWith('open-choice') ? 'choice' : 'wait',
        confirmedWaits: index, evidence: SIMPLE_SERVICE_EVIDENCE + '#trade-entry'}, input: 'A / B 继续',
      regions: SHOP_REGIONS.map(region => ({...region, visible: true,
        cursor: region.id === 'dialogue' && token.semantic.startsWith('open-choice'),
        source: introduction?.id || '未确认', retention: '交互 30 前置正文'}))}));
    const edges = nodes.flatMap((node, index) => [{id: `trade-entry:${index}`, from: node.id,
      to: nodes[index + 1]?.id || graph.entry, input: node.pause.kind === 'choice' ? '是' : 'A / B 继续',
      unknown: false, evidence: SIMPLE_SERVICE_EVIDENCE, routes: [{controls: [], declarations: []}]},
      ...(node.pause.kind === 'choice' ? [{id: 'trade-entry:decline', from: node.id, to: null, input: '否 / B 取消',
        unknown: false, evidence: SIMPLE_SERVICE_EVIDENCE, routes: [{controls: [], declarations: []}]}] : [])]);
    graph.nodes.unshift(...nodes); graph.edges.unshift(...edges);
    graph.entry = nodes[0]?.id || graph.entry;
  }
  return {...graph, basic: false, service: true};
}
