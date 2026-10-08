// @editor-module 专用服务把已确认调用续接投影到公共状态图。
import {simpleServiceGraph} from './simple-service-model.js';
import {simpleServiceNativeOperation} from './simple-service-native.js';

export const SPECIAL_SERVICE_COMMANDS = Object.freeze([0x14, 0x21, 0x22, 0x23, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x30]);
export const SPECIAL_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/special-service-input/observations.json';
const SPECIAL_SERVICE_CALL_EVIDENCE = 'project/evidence/reverse-engineering/special-service-calls/observations.json';
const windowEvidence = 'project/evidence/reverse-engineering/service-window-boundaries/observations.json';
const menus = {
  20: {1: 'vehicle-rental-service-terms', 5: 'vehicle-rental-service-rental-menu',
    8: 'vehicle-rental-service-vehicle-list', 10: 'vehicle-rental-service-actor-select', 19: 'vehicle-rental-service-return-select'},
  33: {0: 'family-home-service-menu', 9: 'family-home-service-repair-scope',
    16: 'family-home-service-repair-component-select', 25: 'family-home-service-amount-input', 36: 'family-home-service-amount-input'},
  34: {2: 'minchi-revival-service-menu', 6: 'minchi-revival-service-corpse-select'},
  35: {3: 'chassis-modification-service-vehicle-select', 11: 'chassis-modification-service-project-menu',
    22: 'chassis-modification-service-holes-menu'},
  39: {1: 'chassis-modification-service-advice-menu'},
  40: {3: 'engine-modification-service-vehicle-select'},
  41: {19: 'vehicle-repair-service-scope', 20: 'vehicle-repair-service-component-select'},
  42: {5: 'school-donation-service-question'},
  43: {9: 'laser-cannon-lens-service-arrangement'},
};
const callbacks = {33: {21: [12, 39]}, 35: {8: [10, 9]}, 43: {8: [10, 9], 11: [9, 8]}};
const effects = new Map([
  [0x98, '回收活动出租位并刷新队伍'], [0x9F, '收集镜片并保留借用标志'],
  [0xA0, '准备首项损坏设备报价'], [0xA1, '准备修理范围'], [0xA2, '累加损坏设备报价'],
  [0xA3, '重建带战车标题的修理列表'], [0xA4, '恢复列表设备损坏位'],
  [0xA7, '清除临时光标对象'], [0xBE, '恢复所选设备损坏位'], [0xC0, '初始化出租战车并乘车'],
  [0xE1, '检查当前乘车状态'], [0xE2, '检查归还车辆是否在队伍中'],
  [0xE6, '检查弹仓上限并报价'], [0xE7, '检查守备力资格并按守备力档位报价'],
  [0xE8, '检查孔位许可并报价'], [0xED, '跳过战车标题并绑定修理设备'],
  [0xF4, '按本次随机输入判定复活'], [0xF5, '比较本次金额与十'],
  [0xF8, '检查已声明事件位'], [0xF9, '检查猎人等级门槛'],
  [0xFA, '比较金额与猎人等级平方'],
  [0xFB, '统计活动出租位'], [0xFC, '比较金额与脚本因子平方'], [0xFD, '检查发动机安装、损坏与最高级'],
]);
const callbackEffects = new Map([
  [0xFA99, '准备出租配置选择'], [0xA1F4, '显示出租参数'], [0xA4AF, '读取出租预设'],
  [0xA450, '列出活动出租位'], [0xA43F, '归还所选出租位'],
  [0xAA69, '按底盘状态接续服务'], [0xA27B, '显示当前战车参数'],
  [0xAA48, '读取下一等级发动机差价'], [0xAA42, '提升发动机设备编号'],
  [0xAAA4, '检查底盘增重后的载重'], [0xA146, '提交底盘增量'],
  [0xFC00, '清除角色状态并恢复 HP 与候选状态'],
  [0xB169, '清空镜片排列'], [0xB221, '读取下一枚镜片'], [0xB1A1, '填入空镜片槽'],
  [0xEF02, '按逆序匹配表计算激光炮'], [0xB1B9, '查找已携带激光炮'],
  [0xB1D5, '替换已携带激光炮'], [0xA7BB, '准备激光炮交付'], [0xB487, '显示家中服务菜单'],
  [0xB47A, '按调用者活动存档槽分支'],
]);

export function specialServiceGraph(command, text, previews, branches) {
  const graph = simpleServiceGraph(command, text, previews, branches, {
    menuNodes: menus[command.command_id], callbackTargets: callbacks[command.command_id],
    evidence: SPECIAL_SERVICE_EVIDENCE,
    nativeOperation: (operation, cid, branch) => {
      if (operation.opcode === 0xD4) return {
        label: '构造服务菜单、绑定窗口选择子并重置选择',
        reads: ['脚本菜单记录与窗口选择子'], writes: ['菜单窗口', '当前窗口选择子与选择位置'],
        confirmed: true, evidence: `${windowEvidence}#D4`};
      if (operation.opcode === 0xB6) return {
        label: '启用当前选择光标并保留选择位置',
        reads: [], writes: ['光标对象显示标志'],
        confirmed: true, evidence: `${windowEvidence}#B6`};
      if (cid === 0x23 && operation.opcode === 0xC6) return {
        label: '将所选菜单项目保留为改造项目', reads: ['当前菜单选择 D2'], writes: ['改造项目 D3'],
        confirmed: true, evidence: `${SPECIAL_SERVICE_CALL_EVIDENCE}#selection`};
      if ([0x21, 0x29].includes(cid) && operation.opcode === 0xF6) return {
        label: branch === null ? '重建损坏设备列表并按含标题行的行数分支'
          : ['没有损坏设备', '多个损坏设备或多个战车标题', '一个战车标题和一个损坏设备'][branch],
        reads: ['当前队伍战车、设备及配对损坏状态'], writes: ['修理列表', '修理行数 D4 与 0599'],
        confirmed: true, evidence: `${SPECIAL_SERVICE_CALL_EVIDENCE}#repair`};
      if ([0x21, 0x29].includes(cid) && operation.opcode === 0xD0
          && [0x16, 0x9E].includes(operation.operands[0])) return {
        label: operation.operands[0] === 0x16 ? '构造修理范围窗口并重置选择' : '构造修理设备窗口并重置选择',
        reads: ['脚本窗口选择子', '修理列表'], writes: ['当前窗口选择子与选择位置'],
        confirmed: true, evidence: 'project/evidence/reverse-engineering/special-service-round2/observations.json#repair-window'};
      if (operation.opcode === 0xDF) return {
        label: branch === null ? '检查人物乘车标志' : branch ? '有人乘车' : '无人乘车',
        reads: ['人物乘车标志'], writes: ['当前条件分支'], confirmed: true,
        evidence: 'project/evidence/reverse-engineering/menu-shop-declarations/observations.json'};
      const fallback = simpleServiceNativeOperation(operation, cid, branch);
      const label = operation.opcode === 0xD2
        ? callbackEffects.get(operation.operands[0] | operation.operands[1] << 8) : effects.get(operation.opcode);
      const unknown = operation.opcode === 0x92;
      return {...fallback, ...(label ? {label, confirmed: true} : {}), ...(unknown ? {confirmed: false} : {}),
        evidence: SPECIAL_SERVICE_EVIDENCE};
    },
  });
  if (command.command_id === 0x21) {
    graph.nodes.push({id: 'special:ending', label: '结局调用边界',
      referenceTarget: {pageId: 'ending-credits', nodeId: 'ending-retirement', label: '结局'},
      input: '保存活动状态与事件交给结局领域', pause: {kind: 'call', evidence: SPECIAL_SERVICE_EVIDENCE}, regions: []});
    graph.edges = graph.edges.map(edge => edge.to === null && edge.routes.some(route => route.controls.includes(39))
      ? {...edge, to: 'special:ending'} : edge);
  }
  return {...graph, special: true};
}
