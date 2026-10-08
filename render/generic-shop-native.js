// @editor-module 商店声明只引用已核对的处理器与明确保留的缺口。
import {INVENTORY_TRANSACTION_EVIDENCE} from './carried-inventory.js';

const evidence = 'project/evidence/reverse-engineering/generic-shop-stable-frames/context.asm';
const inputEvidence = 'project/evidence/reverse-engineering/generic-shop-input/observations.json';
const menuEvidence = 'project/evidence/reverse-engineering/menu-shop-declarations/observations.json';
const saleEvidence = 'project/evidence/reverse-engineering/menu-shop-sale-continuations/observations.json';
const menuRow = (id, label, reads, writes) => ({label, reads, writes, confirmed: true,
  evidence: `${menuEvidence}#${id}`});
const row = (label, reads, writes, offset, confirmed = true) => ({label, reads, writes,
  evidence: `${evidence}#PRG-${offset}`, confirmed});

export function shopNativeOperation(operation, segment, branch) {
  const op = operation.opcode, first = branch === 0;
  if (op === 0xC8) return menuRow('C8', '选择位置归零', [], ['$D2 = 0']);
  if (op === 0xDF) return menuRow('DF', first ? '队伍乘车高位为零' : '队伍有乘车高位',
    ['$6478–$647A（人物在队与乘车标志）'], ['后继索引 = OR(人物标志) 的 $80 位是否非零']);
  if (op === 0x99) return menuRow('99', '初始化商品页并按商品数是否 ≥ 5 选择后继',
    ['$055E（商品数）', '$055F…（商品）', '$D4'],
    ['$D5、$DD、$D3、$055C、$055D = 0', '$055B = $D4 − 1', '$CF = $84', '商品详情、四行列表与滚动标记']);
  if (op === 0x9A) return menuRow('9A', '保存页内位置并读取当前商品与报价',
    ['$D2', '$055D', '$055F…（商品）'], ['$0598 = $D2', '$E2（商品）', '$DF–$E1（报价）']);
  if (op === 0xBF) return menuRow('BF', '准备出售对象并清除保存的栏位位置',
    ['$D6', '$D2', '$6764…（队伍车位）'], ['$0598 = 0', '$D0（出售对象）', '出售提示']);
  if (op === 0x93) return menuRow('93', '恢复出售类别并准备物品列表',
    ['$0598', '$D6', '当前对象携带栏与安装标志'],
    ['$D4 = 2', '$D2、$DD = $0598', '$D3（类别）', '$C8／$C9（携带栏）', '$CF = $80', '出售列表与安装标记']);
  if (op === 0xB3) return menuRow('B3', '按当前类别重建出售列表',
    ['$D3', '当前对象携带栏与安装标志'], ['列表工作区、安装标记与商品窗口']);
  if (op === 0xD9) return menuRow('D9', first ? '当前类别列表为空' : '当前类别列表非空',
    ['$D2', '$D3', '$DE', '$D0', '设备紧缩列表项数或携带栏首零扫描'],
    ['$0598 = $D2', '$D4（列表项数）', '$D1（对象栏偏移）', '非空时 $CF = $7E']);
  if (op === 0xDC) return row(first ? '金钱 ≥ 当前报价' : '金钱 < 当前报价',
    ['$645D–$645F（金钱）', '$DF–$E1（报价）'], ['$0534–$0536 = 金钱 − 报价；此处不提交金钱'], '030150');
  if (op === 0x9C) return row('提交金钱差额并刷新金额窗口',
    ['$0534–$0536'], ['$645D–$645F'], '030178');
  if (op === 0x9B) return row('恢复物品栏位置并设置选择布局',
    ['$0598'], ['$D2 = $0598', '$CF = $84'], '07EB7E');
  if (op === 0xBA) return row('检查接收栏末槽是否为空',
    ['$0559', '$D0', '($CA),Y（接收栏）'], ['$D5：空位为 0，非空为 1'], '07EDAB');
  if (op === 0xB5) return row(branch == null ? '读取价格码并过滤 ≥ $E0 的价格哨兵' : first ? '价格码 ≥ $E0；拒绝收购' : '价格码 < $E0；进入部件检查',
    ['($C8),$D1+$D2', '价格码表 $8451,X'], ['$D5：哨兵为 0，可售价格为 1'], '0309C8');
  if (op === 0xEA) return {label: branch == null ? '检查列表安装标记与底盘索引'
    : first ? '列表安装标记为零；物品可售' : '列表安装标记非零；设备禁售',
    reads: ['$E2（物品）', '战车设备紧缩列表安装标记；人物与道具列表标记为零；底盘使用索引 2'],
    writes: ['后继索引；清除显示标记'], confirmed: true, evidence: `${saleEvidence}#sale-condition`};
  if (op === 0xE4) return {label: first ? '当前对象可接收商品' : '当前对象装备资格拒绝',
    reads: ['商店类别', '当前商品装备位掩码', '人物位或战车安装位掩码'], writes: ['分支索引'],
    confirmed: true, evidence: `${inputEvidence}#qualification`};
  if (op === 0x9D) return {label: '写入接收栏首个空位', reads: ['当前商品', '接收栏', '设备初始状态表'],
    writes: ['预览携带栏；战车设备初始状态'], confirmed: true, evidence: `${inputEvidence}#purchase-commit`};
  if (op === 0xAE || op === 0xB4) return {label: op === 0xAE ? '24 位累加收购资金并封顶' : '删除所选物品并同步装备派生字段',
    reads: ['当前出售对象、报价、所选物理槽、安装标记与配对状态'],
    writes: [op === 0xAE ? '当前金钱' : '携带栏、设备状态、装备位与人物攻防及特殊效果'],
    confirmed: true, evidence: `${INVENTORY_TRANSACTION_EVIDENCE}#sale-commit`};
  if (op === 0xBB) return row('初始化接收对象并检查出租车编号',
    ['$D2', '$D6', '$EBAC 返回值'], ['$D1 = $D2 >> 1；战车编号 ≥ 8 时增加 $D5'], '0301C6');
  if (op === 0xE0) return row(first ? '战车对象分支' : '人物对象分支',
    ['$D6'], ['索引 = $D6 > 0 ? $D6 − 1 : 0'], '0300B7');
  if (op === 0xDE) return row(first ? '角色状态不等于 $FF' : '角色状态等于 $FF',
    ['$D0', '$D1', '$647B,X'], ['分支索引'], '0300DF');
  if (op === 0xDB) return {label: [12, 20].includes(segment.index)
    ? first ? '一人／一车：跳过选择' : '多人／多车：选择对象'
    : first ? '可选对象数量为 1' : '可选对象数量不为 1',
    reads: ['$64（对象数量）'], writes: ['$DE = $64'], confirmed: true,
    objectCount: first ? 'single' : 'multiple',
    evidence: `PRG:${operation.prg_offset.toString(16).toUpperCase()}; project/config/metalmaxcn.facility_helpers.json#control_opcodes/opcode-DB-call-state`};
  if (op === 0xC3) return {...row('绘制人物／战车列表',
    ['$D6（对象类别）', '当前队伍'], ['清除左下矩形 $3C；绘制人物／战车名称'], '07ED63'),
    evidence: 'project/assets/runtime/metalmaxcn/analysis/disassembly/all-offsets/3F.lst#PRG-07ED63',
    selectionList: true};
  if (op === 0xD5 && segment.index === 41) return row(first ? '接收栏有空位' : '接收栏已满', ['$D5（BA 结果）'], [], '07EDAB');
  if (op === 0xD5 && segment.index === 30) return shopNativeOperation({opcode: 0xB5}, segment, branch);
  if (op === 0xD5) return menuRow('D5', `读取条件索引${branch == null ? '' : ` ${branch} `}并选择后继`,
    ['$D5', '当前控制段的后继表'], ['$BA／$BB（后继控制位置）或 $05A4（返回标记）']);
  if (op === 0xD2) {
    const address = operation.operands[0] | operation.operands[1] << 8;
    if (address === 0xA915) return menuRow('A915', '清除四个装备资格显示标记', [], ['$032C–$032F = 0']);
    if (address === 0xA797) return menuRow('A797', '复制商品配置与商店文字并选择携带栏',
      ['当前商品配置', '$E5（商店类别）', '对应的 21 个文字记录编号'],
      ['$055E（商品数）', '$055F…（商品）', '$0559 = $E5', '$D6 = $E5 & 2', '$CA／$CB（携带栏）', '$0544–$0558（文字编号）']);
    if (address === 0xEEBC) return row('计算人物／战车装备资格标记',
      ['$E2', '$E5', '$6478,X', '$6764,X', '$6717,Y', '$8274,Y', '$E6F6,X'],
      ['$0530–$0533 清零，符合位掩码者写 $15'], '0201F0');
    if (address === 0xEEC5) return row('准备对象选择的资格显示与坐标',
      ['$0559', '$0530–$0533'], ['$032C–$032F', '$033C–$033F', '$034C–$034F'], '020232');
    if (address === 0xA9F2) return {label: '检查购买后的战车载重',
      reads: ['当前商品重量', '当前战车携带设备、装甲、底盘与已安装引擎'], writes: ['超重分支索引'],
      confirmed: true, evidence: `${inputEvidence}#vehicle-load`};
    return {label: `回调 $${address.toString(16).toUpperCase()} · 效果未确认`, reads: ['未确认'], writes: ['未确认'],
      confirmed: false, evidence: 'project/config/metalmaxcn.facility_helpers.json'};
  }
  if ([0xD1, 0xD4, 0xF7, 0x8F, 0xFE, 0xCB].includes(op)) return null;
  return {label: `原生 $${op.toString(16).toUpperCase()} · 条件／效果未确认`, reads: ['未确认'],
    writes: ['未确认'], confirmed: false, evidence: 'project/evidence/ui-flow-inventory/native-handlers.json'};
}
