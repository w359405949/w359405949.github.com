// @editor-module 简单服务的原生声明区分已确认局部效果与完整执行边界。
import {INVENTORY_TRANSACTION_EVIDENCE} from './carried-inventory.js';

const evidence = 'project/evidence/reverse-engineering/simple-service-input/observations.json';
const labels = new Map([
  [0xAE, '累加收购资金并封顶'], [0xB4, '删除所选物品并重算装备'],
  [0xB3, '重建当前类别列表'], [0xD9, '按携带栏首零检查当前列表'],
  [0x90, '保留本次输入报价'], [0x93, '显示携带栏类别'], [0x95, '选择人物道具语义'],
  [0x99, '准备当前商品列表'], [0x9A, '读取所选草药与报价'], [0x9B, '恢复商品选择'],
  [0x9C, '提交资金差额'], [0x9D, '交付草药到首个空位'], [0x9E, '准备人物携带栏'],
  [0xAF, '提交已选事件位'], [0xB5, '读取收购物品与折半报价并检查价格哨兵'], [0xBA, '检查人物道具栏末槽'], [0xBB, '绑定当前接收人物'],
  [0xBC, '提交资金差额'], [0xBD, '清除数量临时值'], [0xBF, '初始化携带栏类别'],
  [0xC1, '选择猎人姓名'], [0xC2, '选择当前人物姓名'], [0xC3, '显示人物选择窗口'],
  [0xC4, '显示当前服务配置列表'], [0xC5, '读取服务名称与价格码'], [0xC7, '按当前数量计算报价'],
  [0xC8, '重置选择位置'], [0xC9, '选择正文区域 07'], [0xCA, '选择正文区域 10'],
  [0xCE, '准备交易金额输入'], [0xCF, '读取脚本定额'], [0xD1, '接续唯一后继'],
  [0xD5, '读取本次条件或确认结果'], [0xD8, '检查人物状态高位'], [0xDB, '检查当前队伍数量'],
  [0xDC, '检查当前金钱与报价'], [0xDE, '检查人物死亡标记'], [0xDF, '检查当前战车数量'],
  [0xE5, '检查步行人物'], [0xEE, '检查装饰品持有事件'], [0xF3, '按当前价格码、阈值与随机输入判定交易'],
  [0xF7, '等待选择或取消输入'], [0xFE, '返回调用方'], [0xFF, '返回调用方'],
]);
const callbacks = new Map([[0xA7B4, '准备草药商人携带栏'], [0xEEB3, '准备人物选择窗口'],
  [0xA358, '统计当前战车'], [0xB15B, '设置调用实例临时值'],
  [0xA810, '将收购报价再次折半'], [0xA1EB, '清除所选人物状态高位']]);

export function simpleServiceNativeOperation(operation, cid, branch = null) {
  const op = operation.opcode;
  const callback = op === 0xD2 ? operation.operands[0] | operation.operands[1] << 8 : null;
  if (cid === 0x2E && (callback === 0xF514 || op === 0xDF)) return {
    label: callback === 0xF514 ? '清洗队伍战车、移除特殊携带物并返回原服务'
      : branch === null ? '检查人物乘车标志' : branch ? '有人乘车' : '无人乘车',
    reads: ['人物乘车标志', '队伍战车', '战车状态、携带物及底盘重量'],
    writes: callback === 0xF514 ? ['战车状态、携带物、底盘重量与事件 00'] : ['当前条件分支'],
    confirmed: true, evidence: 'project/evidence/reverse-engineering/special-service-round2/observations.json#wash'};
  const innRest = cid === 0x16 && callback === 0xA353;
  const unknown = (op === 0xAE || op === 0xB4) && cid !== 0x24
    || op === 0xD2 && !callbacks.has(callback) && !innRest || !labels.has(op) && op !== 0xD2;
  let label = callback !== null ? callbacks.get(callback) : labels.get(op);
  if (branch !== null && op === 0xDC) label = branch ? '金钱不足' : '金钱足够';
  if (branch !== null && op === 0xEE) label = branch ? '已持有装饰品' : '尚未持有装饰品';
  if (branch !== null && op === 0xDE) label = branch ? '人物死亡' : '人物未死亡';
  if (branch !== null && op === 0xD8) label = branch ? '人物状态高位已置位' : '人物状态高位未置位';
  return {label: innRest ? '设置休息模式并按自然旅馆调用者恢复存活队员 HP 与房间落点'
    : label || `原生 $${op.toString(16).toUpperCase()} 的完整效果未确认`,
    reads: ['当前预览字段、选择及已发布调用参数'],
    writes: unknown ? ['完整效果未确认'] : ['本次临时状态与已确认字段效果'],
    confirmed: !unknown, evidence: cid === 0x24 && [0xAE, 0xB3, 0xB4, 0xD9].includes(op)
      ? INVENTORY_TRANSACTION_EVIDENCE : cid === 0x16
      ? 'project/evidence/reverse-engineering/small-service-groups/observations.json' : evidence};
}
