// @editor-module 机器与通缉服务把应用暂停点和领域边界交给公共状态图。
import {simpleServiceGraph} from './simple-service-model.js';
import {simpleServiceNativeOperation} from './simple-service-native.js';
import {interfaceStateRegions} from './interface-state-regions.js';
import {DEVICE_SERVICE_COMMANDS, deviceServiceGraph} from './device-service-model.js';

export const MACHINE_SERVICE_COMMANDS = Object.freeze([0x1A, 0x25, 0x2D, 0x35, ...DEVICE_SERVICE_COMMANDS]);
export const MACHINE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/machine-service-input/observations.json';
const menus = {26: {1: 'jukebox-screen'}, 37: {0: 'wanted-information-office-menu'},
  45: {3: 'teleport-terminal-screen'}, 53: {0: 'next-level-experience-screen'}};
const callbacks = new Map([[0xAE92, '构造当前配置曲目'], [0xAEBB, '提交所选声音并返回曲目列表'],
  [0xADD7, '构造开放目的地列表'], [0xF46E, '检查所选目的地'],
  [0xAE4D, '显示经验标题'], [0xEEAA, '按当前队伍计算升级经验'],
  [0xEECE, '按事务所参数读取情报'], [0xB105, '扫描击破履历与领取位'],
  [0xB10C, '扫描下一个可领取目标'], [0xA17B, '刷新金钱窗口']]);

export function machineServiceGraph(command, text, previews, catalog, invocation = {}) {
  if (DEVICE_SERVICE_COMMANDS.includes(command.command_id))
    return deviceServiceGraph(command, text, previews, catalog, invocation);
  const graph = simpleServiceGraph(command, text, previews, catalog.application_branch_sources, {
    menuNodes: menus[command.command_id], evidence: MACHINE_SERVICE_EVIDENCE,
    nativeOperation: (operation, cid, branch) => {
      const source = simpleServiceNativeOperation(operation, cid, branch);
      const callback = operation.opcode === 0xD2 && (operation.operands[0] | operation.operands[1] << 8);
      const confirmed = [0x1A, 0x35, 0x2D, 0x25].includes(cid) && (callbacks.has(callback)
        || source.confirmed || [0xB0, 0xAE, 0xCC, 0xCD, 0xD3, 0xD4, 0xF2].includes(operation.opcode));
      return {...source, label: callbacks.get(callback) || source.label,
        writes: confirmed ? ['本次临时状态与已确认字段效果'] : source.writes,
        confirmed, evidence: [0x1A, 0x35].includes(cid)
          ? 'project/evidence/reverse-engineering/small-service-groups/observations.json' : MACHINE_SERVICE_EVIDENCE,
        ...([0x1A, 0x35].includes(cid) ? {scope: '当前配置列表、声音请求与原生 F7 返回；经验限于未触发升级的已发布等级区间；声音持续时间由音频字段对象负责'} : {})};
    },
  });
  const owner = {26: 'jukebox', 37: 'wanted-information', 45: 'teleport-terminal',
    53: 'experience-information-terminal'}[command.command_id];
  const states = catalog.interfaces.find(row => row.id === owner)?.states || [];
  for (const node of graph.nodes) {
    const declared = states.find(row => row.id === node.publishedPreview?.interface_state_id);
    node.label = declared?.label || command.label;
    node.regions = command.command_id === 0x1A || command.command_id === 0x35
      ? interfaceStateRegions([{id: 'screen', label: '界面', bounds: {x: 0, y: 0, width: 256, height: 240},
        visible: true, source: node.publishedPreview?.id}]) : node.regions;
  }
  const boundaries = [{id: 'machine:teleport', state: 'teleport-terminal.teleport', label: '传送场景交接'},
    {id: 'machine:intelligence', state: 'wanted-information.intelligence', label: '通缉情报',
      preview: 'constructor:wanted-information-intelligence'}];
  for (const boundary of boundaries.filter(row => states.some(state => state.id === row.state)))
    graph.nodes.push({id: boundary.id, label: boundary.label, stateId: boundary.state,
      publishedPreview: previews.find(row => row.id === boundary.preview),
      pause: {kind: 'call', evidence: MACHINE_SERVICE_EVIDENCE}, input: '领域交接', regions: []});
  if (command.command_id === 0x2D) {
    const teleport = graph.nodes.find(row => row.id === 'machine:teleport');
    teleport.referenceTarget = {pageId: 'scenes', label: '场景进入',
      route: {view: 'scenes'}};
    teleport.input = '进入时空隧道';
    graph.edges.push({id: 'machine:teleport:return', from: teleport.id, to: null,
      input: '场景装载完成', unknown: false, evidence: MACHINE_SERVICE_EVIDENCE, routes: []});
  }
  if (command.command_id === 0x25) {
    const intelligence = graph.nodes.find(row => row.id === 'machine:intelligence');
    intelligence.pause.kind = 'wait'; intelligence.input = 'A / B 继续';
    for (const edge of graph.edges.filter(row => row.routes.some(route => route.controls.includes(3))))
      edge.to = intelligence.id;
    graph.edges.push({id: 'machine:intelligence:return', from: intelligence.id, to: null,
      input: 'A / B 继续', unknown: false, evidence: MACHINE_SERVICE_EVIDENCE, routes: []});
  }
  const covered = new Set(graph.nodes.map(row => row.publishedPreview?.interface_state_id || row.stateId));
  for (const declared of states.filter(row => !covered.has(row.id))) {
    const preview = previews.find(row => row.interface_state_id === declared.id)
      || declared.id === 'jukebox.selected' && previews.find(row => row.id === 'constructor:jukebox-screen')
      || declared.id === 'experience-information-terminal.title' && previews.find(row => row.id === 'constructor:next-level-experience-screen');
    graph.nodes.push({id: declared.id, label: declared.label, stateId: declared.id, publishedPreview: preview,
      pause: {kind: declared.status === 'unreachable' ? 'unreachable'
        : declared.ui_role === 'screen' ? 'view' : 'call', evidence: MACHINE_SERVICE_EVIDENCE},
      input: declared.status === 'unreachable' ? '不可达' : declared.ui_role === 'screen' ? '自由查看' : '领域交接', regions: []});
  }
  if (invocation.poster) {
    graph.entry = 'wanted-information.poster';
    const poster = graph.nodes.find(row => row.id === graph.entry);
    poster.pause.kind = 'wait'; poster.input = 'A / B 返回';
    graph.edges.push({id: 'machine:poster:return', from: poster.id, to: null,
      input: 'A / B 返回', unknown: false, evidence: MACHINE_SERVICE_EVIDENCE, routes: []});
  }
  return {...graph, machine: true, command: command.command_id, states, poster: Boolean(invocation.poster)};
}
