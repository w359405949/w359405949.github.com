// @editor-module 设备状态图复用已有构造并保留领域调用的确认边界。
import {simpleServiceGraph} from './simple-service-model.js';
import {controllerServicePreview, elevatorServicePreview, vendingServiceResponsePreview} from '../core/terminal-service-previews.js';
import {interfaceStateRegions} from './interface-state-regions.js';
import {simpleServiceNativeOperation} from './simple-service-native.js';

export const DEVICE_SERVICE_COMMANDS = Object.freeze([0x1B, 0x1C, 0x1D, 0x1F, 0x32, 0x36, 0x37, 0x38]);
export const DEVICE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/device-service-input/observations.json';
const terminalEvidence = 'project/evidence/reverse-engineering/terminal-alarm-completion/observations.json';
const owners = {27: ['vending-machines'], 28: ['vending-machines'],
  29: ['configured-investigation-facility'], 31: ['unresolved-dynamic-list-application'],
  50: ['frog-race'], 54: ['control-terminals'], 55: ['noah-control-terminal', 'control-terminals'], 56: ['control-terminals']};
const regions = preview => interfaceStateRegions([{id: 'screen', label: '界面',
  bounds: {x: 0, y: 0, width: 256, height: 240}, visible: Boolean(preview), source: preview?.id}]);
const node = (id, label, preview, kind = 'menu') => ({id, label, publishedPreview: preview,
  pause: {kind, evidence: DEVICE_SERVICE_EVIDENCE}, regions: regions(preview),
  input: kind === 'menu' ? '方向键选择；A 确定；B 返回' : kind === 'wait' ? 'A / B 继续' : '领域交接'});
const edge = (from, to, input, unknown = false) => ({id: `${from}:${input}`, from, to, input,
  unknown, evidence: DEVICE_SERVICE_EVIDENCE, routes: [{controls: [], declarations: []}]});

const vendingEvidence = 'project/evidence/reverse-engineering/vending-declarations/observations.json';
const vendingOperations = new Map([
  [0x91, ['准备人物领取选择', ['在队人物'], ['人物选择与临时光标']]],
  [0xA5, ['准备战车购买选择', ['队伍战车'], ['战车选择与临时光标']]],
  [0xA6, ['追加所选弹种与数量', ['所选战车、弹种槽与数量'], ['弹种与数量']]],
  [0xA7, ['释放临时光标', [], ['临时光标']]],
  [0xAB, ['检查弹仓剩余容量', ['所选战车弹数、容量与购买数量'], ['容量分支']]],
  [0xAC, ['查找已有弹种或首个空种类槽', ['所选战车弹种'], ['弹种槽与种类容量分支']]],
  [0xB1, ['提交投币声音并准备设备显示', ['当前设备显示'], ['声音请求与设备显示请求']]],
  [0xB2, ['读取所选商品、数量与报价', ['当前配置、商品数值码与元数据选择'], ['商品、数量、报价与数量高位分支']]],
  [0xB7, ['恢复战车与商品选择', ['本次商品选择'], ['商品选择与窗口请求']]],
  [0xB8, ['绑定本次接收人物并恢复商品选择', ['本次人物与商品选择'], ['接收人物与商品选择']]],
  [0xB9, ['读取并绘制六格商品配置', ['当前设备实例配置'], ['商品配置指针与六格显示请求']]],
  [0xB6, ['设置领取光标', [], ['临时光标']]],
  [0xD7, ['交付已中奖的配置奖品', ['已中奖结果、接收人物背包与配置奖品'], ['背包首个空格或容量不足分支']]],
  [0xDD, ['等待小球完成并检查中奖位置', ['小球初值、随机初值与逐帧输入'], ['小球完成结果与中奖分支']]],
  [0xEF, ['按剩余背包容量追加商品', ['接收人物背包、所选商品与数量'], ['背包物品或容量不足分支']]],
]);
const vendingCallbacks = new Map([
  [0xA6DE, ['累加所选战车装甲', ['所选战车装甲与完整数量字节'], ['装甲值']]],
  [0xB055, ['提交主炮装填量并保留状态高位', ['容量检查结果与主炮状态'], ['主炮弹数']]],
  [0xB0CC, ['检查主炮安装、种类与装填上限', ['安装标志、主炮种类、当前弹数与购买数量'], ['装填量或拒绝分支']]],
  [0xB383, ['提交中奖声音', [], ['声音请求']]],
]);

function vendingServiceNativeOperation(operation, cid, branch = null) {
  const fallback = simpleServiceNativeOperation(operation, cid, branch);
  if (![0x1B, 0x1C, 0x1D].includes(cid)) return fallback;
  if (cid === 0x1B && operation.opcode === 0xD5 && branch === 1) return {...fallback,
    label: '数量高位已置位，返回商品选择', confirmed: true,
    evidence: 'project/evidence/reverse-engineering/vending-high-quantity/observations.json',
    reads: ['本次 B2 数量高位分支'], writes: ['商品选择续接']};
  const callback = operation.opcode === 0xD2 ? operation.operands[0] | operation.operands[1] << 8 : null;
  const declaration = callback === null ? vendingOperations.get(operation.opcode) : vendingCallbacks.get(callback);
  if (!declaration) return fallback;
  const [label, reads, writes] = declaration;
  return {label, reads, writes, confirmed: true, evidence: vendingEvidence,
    scope: '六格售货机配置的局部调用、字段与后继；完整窗口承接归 G12'};
}

function frogServiceNativeOperation(operation, cid, branch = null) {
  const source = simpleServiceNativeOperation(operation, cid, branch);
  const callback = operation.opcode === 0xD2 ? operation.operands[0] | operation.operands[1] << 8 : null;
  const labels = new Map([[0xAE56, '初始化首轮计数与下注窗口'], [0xB388, '推进轮数并请求下注声音'],
    [0xA48B, '初始化参赛青蛙与赔率'], [0xB3AA, '等待比赛完成并比较所选青蛙'], [0xB383, '请求获胜声音']]);
  const confirmed = callback === null
    ? source.confirmed || [0xA7, 0xBD, 0xB1, 0xCC, 0xD0, 0xD3, 0xAE].includes(operation.opcode)
    : labels.has(callback);
  return {...source, label: labels.get(callback) || source.label, confirmed,
    evidence: 'project/evidence/reverse-engineering/small-service-groups/observations.json',
    scope: '当前下注参数、扣款、显式随机现场的比赛完成、奖金与再次下注；缺少本帧随机输入仍阻断执行'};
}

export function deviceServiceGraph(command, text, previews, catalog, invocation = {}) {
  const cid = command.command_id;
  const states = catalog.interfaces.filter(row => owners[cid].includes(row.id)).flatMap(row => row.states);
  let graph;
  if (cid >= 0x36) {
    const source = segment => controllerServicePreview(previews,
      `application-dialogue-flow:${cid.toString(16).toUpperCase()}:segment:${segment}`, invocation);
    const entry = node('device:keyboard', cid === 0x37 ? '密码输入' : '控制器待机', source('01'));
    entry.stateIds = cid === 0x37 ? ['control-terminals.idle', 'noah-control-terminal.frame', 'noah-control-terminal.input']
      : ['control-terminals.idle'];
    const nodes = [entry], edges = [edge(entry.id, entry.id, '方向键 / 数字键'),
      edge(entry.id, 'device:scene-return', 'B / EXIT 返回')];
    if (cid === 0x37) {
      nodes.push({...node('device:password-result', '密码比较结果', source('05'), 'wait'),
        stateIds: ['control-terminals.feedback', 'noah-control-terminal.result']});
      nodes.push({...node('device:password-alarm', '防御机器战斗', null, 'battle'),
        referenceTarget: {pageId: 'battle-command-target', nodeId: 'battle-command-target.command', label: '战斗命令与目标选择'}});
      edges.push(edge(entry.id, 'device:password-result', '输入完成'),
        edge('device:password-result', 'device:scene-return', '等待结束 · 密码通过'),
        edge('device:password-result', 'device:password-alarm', '等待结束 · 密码错误'),
        edge('device:password-alarm', 'device:scene-return', '已确认战斗结果'),
        {...edge('device:password-alarm', 'device:password-alarm', '未确认结果 · 保留调用栈', true),
          evidence: terminalEvidence, condition: '结果不完整或与本次报警调用现场不符；不提交效果'},
        edge('device:scene-return', entry.id, 'A · 再次调查'));
    } else {
      nodes.push({...node('device:controller-commit', '控制器事件提交', source('03'), 'call'),
        stateIds: ['control-terminals.state-change']});
      edges.push(edge(entry.id, 'device:controller-commit', 'OPEN / CLOSE'),
        edge('device:controller-commit', 'device:scene-return', '场景恢复'));
    }
    nodes.push({...node('device:scene-return', '返回调查场景', null, 'call'),
      referenceTarget: {pageId: 'scenes', label: '调查场景', sceneId: invocation.sceneId,
        route: {view: 'scenes'}}});
    graph = {nodes, edges, entry: entry.id, transitions: edges, initializations: [], boundaries: []};
  } else {
    graph = simpleServiceGraph(command, text, previews, catalog.application_branch_sources, {
      evidence: DEVICE_SERVICE_EVIDENCE,
      ...([0x1B, 0x1C, 0x1D].includes(cid) ? {nativeOperation: vendingServiceNativeOperation} : {}),
      ...(cid === 0x32 ? {nativeOperation: frogServiceNativeOperation} : {}),
      callbackTargets: cid === 0x32 ? {6: [7, 8]} : {},
      previewFor: (segment, event) => cid === 0x1F ? elevatorServicePreview('application-dialogue-flow:1F:segment:00')
        : cid >= 0x1B && cid <= 0x1D ? vendingServiceResponsePreview(previews,
          event.action?.id || segment.id) : null,
    });
    for (const row of graph.nodes) {
      if ([0x1B, 0x1C, 0x1D, 0x1F].includes(cid) && row.publishedPreview) row.publishedPreview = {...row.publishedPreview,
        facility_call_context: {...invocation}, runtime_context: {...row.publishedPreview.runtime_context,
          ...(invocation.argument !== undefined ? {facility_instance: invocation.argument} : {})}};
      row.regions = regions(row.publishedPreview);
    }
    if (cid === 0x1F) {
      graph.nodes.push({...node('device:elevator-arrival', '到达楼层', null, 'call'),
        referenceTarget: {pageId: 'scenes', label: '场景进入',
          route: {view: 'scenes'}}});
      graph.edges = graph.edges.map(row => row.to === null && /A 确定|B 返回/u.test(row.input)
        ? {...row, to: 'device:elevator-arrival', unknown: false} : row);
      graph.edges.push(edge('device:elevator-arrival', null, '返回场景'));
    }
  }
  const covered = new Set(graph.nodes.flatMap(row => [...(row.stateIds || []),
    ...(row.publishedPreview?.interface_state_ids || []), row.publishedPreview?.interface_state_id]));
  for (const declared of states.filter(row => !covered.has(row.id))) {
    const preview = previews.find(row => row.interface_state_id === declared.id);
    const row = node(declared.id, declared.label, preview, declared.ui_role === 'screen' ? 'view' : 'call');
    row.stateId = declared.id;
    row.input = declared.status === 'unresolved' ? '未确认' : row.input;
    graph.nodes.push(row);
  }
  return {...graph, machine: true, device: true, command: cid, states};
}
