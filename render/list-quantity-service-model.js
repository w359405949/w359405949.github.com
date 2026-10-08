// @editor-module 多层列表服务引用原应用的暂停点、构造与确认边界。
import {simpleServiceGraph} from './simple-service-model.js';

export const LIST_QUANTITY_COMMANDS = Object.freeze([0x15, 0x20, 0x26]);
export const LIST_QUANTITY_EVIDENCE = 'project/evidence/reverse-engineering/list-quantity-service-input/observations.json';
const menus = {
  21: {1: 'special-shell-shop-buy-sell', 5: 'private-special-shell-shop-ordinary-menu',
    7: 'special-shell-shop-special-goods', 10: 'special-shell-shop-special-actors',
    20: 'special-shell-shop-buy-actors', 22: 'special-shell-shop-buy-weapons',
    26: 'special-shell-shop-ordinary-quantity', 35: 'special-shell-shop-sale-actors',
    37: 'special-shell-shop-sale-quantity', 42: 'special-shell-shop-special-quantity',
    44: 'special-shell-shop-sale-inventory'},
  32: {1: 'vehicle-supply-service-supply-type', 6: 'vehicle-supply-service-ammunition',
    15: 'vehicle-supply-service-ammunition-vehicle-select', 18: 'vehicle-supply-service-ammunition-component-select',
    27: 'vehicle-supply-service-armor-vehicle-select', 28: 'vehicle-supply-service-armor-fill-menu',
    36: 'vehicle-supply-service-armor-quantity-input', 38: 'vehicle-supply-service-ammunition-quantity-input'},
  38: {2: 'storage-service-deposit-withdraw', 7: 'storage-service-category',
    11: 'storage-service-actor-select', 16: 'storage-service-item-list', 19: 'storage-service-deposit-location',
    36: 'storage-service-withdraw-actor-select', 49: 'storage-service-withdraw-list'},
};
const labels = new Map([[0x94, '设置对象类别'], [0x96, '准备数量窗口'], [0x97, '恢复武器列表位置'],
  [0xA6, '提交所选弹种与数量'], [0xA7, '清除本次数量窗口'], [0xA8, '读取所选武器与当前弹数'],
  [0xA9, '计算弹药缺额与当前报价'], [0xAA, '补充所选武器弹数'], [0xAB, '检查特殊弹仓容量'],
  [0xAC, '检查弹种槽'], [0xAD, '接受非零数量并计价'], [0xB6, '重置当前列表选择'],
  [0xBB, '绑定所选接收对象并检查出租车'], [0xBD, '清除报价累加器'], [0xC5, '读取所选弹种与当前单价'],
  [0xC6, '保存补给类别'], [0xD4, '打开脚本声明菜单'], [0xD6, '检查所选战车武器列表'],
  [0xDA, '接受非零数量并按设备计价'], [0xDC, '检查当前资金与报价'], [0xDF, '检查当前战车队伍'],
  [0xE3, '读取补给类别'], [0xE9, '检查保管栏尾槽'], [0xEC, '排序保管物与配对状态并检查空栏'],
  [0xF0, '检查特殊弹仓剩余容量'], [0xF1, '检查可出售炮弹'], [0xF7, '确认或取消当前输入']]);

function listQuantityNativeOperation(operation, cid) {
  const op = operation.opcode;
  const callback = op === 0xD2 ? operation.operands[0] | operation.operands[1] << 8 : null;
  const unknown = callback !== null && ![0xA1AA, 0xAC12, 0xABEC, 0xF4C6, 0xB098, 0xB074,
    0xB027, 0xA28C, 0xA4F6, 0xA58E, 0xA6E3, 0xAC33, 0xA9D9, 0xA13E].includes(callback)
    || cid === 0x26 && op === 0xEA || cid === 0x15 && op === 0xAE
    || !labels.has(op) && callback === null && ![0x93, 0x9C, 0xAE, 0xBA, 0xBC, 0xBF, 0xC3, 0xC9, 0xD1, 0xD5, 0xD9, 0xE0, 0xFE, 0xFF].includes(op);
  return {label: callback !== null ? `领域调用 ${callback.toString(16).toUpperCase()}`
    : labels.get(op) || `原生 ${op.toString(16).toUpperCase()}`, confirmed: !unknown,
    reads: ['当前预览字段与所选物理槽'], writes: ['本次快照；未确认效果在执行处阻断'], evidence: LIST_QUANTITY_EVIDENCE};
}

export function listQuantityServiceGraph(command, text, previews, branches) {
  const callbackTargets = Object.fromEntries(command.dialogue_flow.segments.filter(segment =>
    segment.operations?.some(operation => operation.opcode === 0xD2
      && operation.operands[0] === 0xDF && operation.operands[1] === 0xA0)
    && segment.callback_continuation?.confirmation_status === 'confirmed').map(segment => [segment.index,
    segment.callback_continuation.reads.filter(read => read.confirmation_status === 'confirmed')
      .map(read => read.value)]));
  return {...simpleServiceGraph(command, text, previews, branches, {menuNodes: menus[command.command_id],
    nativeOperation: listQuantityNativeOperation, evidence: LIST_QUANTITY_EVIDENCE, callbackTargets}), quantities: true};
}
