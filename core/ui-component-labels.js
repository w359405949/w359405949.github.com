// @editor-module 组件项名引用文字语义、字段绑定与列表槽位。
import {state} from './state.js';
import {currentTextReference, currentTextChoiceLabel, indexedResource} from './resource-index.js';
import {textRecordEditorTokens, textRecordNodeId} from './text-record-project.js';

const RECORD_NAMES = {
  '02:000': '人物 1 状态', '02:001': '人物 2 状态', '02:002': '人物 3 状态',
  '02:003': '战车状态', '02:004': '携带列表', '02:005': '携带列表前六项', '02:008': '姓名',
  '02:009': '工具处理命令', '02:015': '强度命令与金钱', '02:016': '装备处理命令',
  '02:018': '所选物品', '02:020': '乘坐战车', '02:024': '冒险设置', '02:025': '战车部件状态',
  '02:026': '装载数量', '02:032': '人物状态', '02:033': '状态分隔线',
  '02:037': '挂载部件与装备', '02:038': '等级', '02:039': '战车编号与名称',
  '02:040': '战车价格', '02:041': '战车列表标题', '02:042': '战斗数据命令',
  '02:043': '装备处理命令', '02:045': '战车名称与装甲', '02:046': '拆装甲确认',
  '02:047': '经验值分类', '02:048': '读档命令与存档槽', '02:049': '买卖命令',
  '02:050': '所持金钱', '02:051': '商品与价格', '02:054': '补给类型命令',
  '02:057': '弹药装载命令', '02:058': '租借命令', '02:066': '家中服务命令',
  '02:071': '战车部件名称', '02:072': '数量与上限', '02:074': '传真窗口',
  '02:078': '战车命名与候选字', '02:079': '姓名与升级经验', '02:081': '升级经验标题',
  '02:085': '返回地面确认', '02:087': '传送基地提示', '02:088': '存档槽选择',
  '02:091': '使用失败反馈', '02:094': '金额输入与金钱', '02:100': '拆装甲结果',
  '02:101': '拆装甲取消反馈', '02:104': '装备结果', '02:109': '丢弃确认',
  '03:000': '人物装备信息', '03:001': '人物编号与姓名', '03:002': '人物信息边框',
  '03:003': '战车状态', '03:004': '人物攻击与防御', '03:005': '装备标题边框',
  '03:006': '装备攻击与防御比较', '03:007': '主菜单窗口', '03:008': '列表窗口',
  '03:010': '战斗命令窗口', '03:011': '战斗状态窗口', '03:012': '命名窗口',
  '03:013': '人物详情窗口', '03:014': '人物能力', '03:015': '人物装备列表',
  '03:016': '商品与价格窗口', '03:017': '对话窗口', '03:019': '画面清除区域',
  '03:023': '密码终端窗口', '04:000': '战车炮弹', '04:001': '部件状态分隔线',
  '04:002': '部件重量与载重', '04:003': '部件名称', '04:022': '服务标题',
  '0C:000': '文字起点', '0C:001': '说话人', '0C:006': '对话前缀',
  '12:000': '物品与属性', '12:001': '部件名称与防御',
  '12:002': '战车编号与名称', '12:004': '战车部件标题', '12:006': '战车编号与名称',
  '12:007': '弹药列表标题', '12:009': '部件与弹药', '12:010': '部件弹药数量',
  '12:011': '物品与部件', '12:014': '战车名称与装甲', '12:017': '携带装备与部件',
  '12:018': '携带装备状态与重量', '12:019': '装甲与载重标题', '12:020': '战车图像窗口',
  '09:001': '携带列表', '09:007': '候选字符', '09:009': '候选字符',
  '08:027': '防御参数', '08:028': '攻击参数', '11:159': '回应称呼', '15:015': '通缉信息标题',
};

const FIELD_NAMES = {
  name_codes: '姓名', level: '等级', status: '状态', condition_raw: '损坏状态',
  current_hp: '当前 HP', max_hp: '最大 HP', attack: '攻击', defense: '防御', gold: '金钱',
  sp: '装甲', battle_skill: '战斗等级', repair_skill: '修理等级', driving_skill: '驾驶等级',
  vitality: '体力', speed: '速度', intelligence: '智力', strength: '强度', experience: '经验值',
};

const RECORD_FIELDS = {
  '02:000': {0: '姓名', 23: '状态', 3: '当前 HP'},
  '02:001': {1: '姓名', 23: '状态', 4: '当前 HP'},
  '02:002': {2: '姓名', 23: '状态', 5: '当前 HP'},
  '02:003': {23: '状态'}, '02:037': {41: '挂载部件', 42: '装备名称'},
  '02:032': {7: '姓名', 15: '等级', 23: '状态', 29: '当前 HP', 31: '最大 HP'},
  '02:039': {9: '战车状态'}, '02:040': {11: '价格'}, '02:042': {14: '金钟金额'},
  '02:045': {8: '剩余装甲'}, '02:047': {68: '仿生类经验', 67: '电子类经验', 69: '其他类经验'},
  '02:046': {15: '拆除数量'}, '02:100': {15: '拆除数量'},
  '02:048': {63: '存档槽 1 姓名', 64: '存档槽 2 姓名', 65: '存档槽 1 等级', 66: '存档槽 2 等级'},
  '02:051': {10: '商品名称', 11: '价格'}, '02:079': {7: '姓名', 10: '等级', 11: '升级经验'},
  '02:088': {63: '存档槽 1 姓名', 64: '存档槽 2 姓名'},
  '02:094': {6: '金钱', 29: '金额第 1 位', 30: '金额第 2 位', 31: '金额第 3 位',
    60: '金额第 4 位', 32: '金额第 5 位', 33: '金额第 6 位', 34: '金额第 7 位'},
  '03:001': {29: '人物编号'}, '03:003': {39: '重量', 59: '载重', 55: '超载状态', 47: '剩余载重'},
  '03:004': {37: '攻击', 38: '防御'}, '03:006': {35: '攻击变化', 36: '防御变化'},
  '04:000': {39: '炮弹总数', 40: '弹仓容量', 29: '炮弹位 1 数量', 30: '炮弹位 2 数量',
    31: '炮弹位 3 数量', 60: '炮弹位 4 数量', 32: '炮弹位 5 数量', 33: '炮弹位 6 数量'},
  '04:002': {10: '武器名称', 16: '当前弹药', 17: '最大弹药'}, '04:003': {10: '武器名称'},
  '02:072': {55: '数量单位', 8: '当前数量', 9: '最大数量'},
  '12:000': {10: '物品名称', 16: '数量'}, '12:001': {39: '部件名称'},
  '12:002': {15: '战车编号', 7: '战车名称'}, '12:006': {56: '战车编号', 7: '战车名称'},
  '12:009': {15: '部件名称', 29: '弹药数量'}, '12:010': {39: '剩余弹药'},
  '12:011': {10: '物品名称', 15: '部件名称'}, '12:014': {7: '战车名称', 8: '当前装甲', 10: '最大装甲'},
  '15:016': {56: '击败等级'}, '07:032': {10: '弹仓增加量'},
  '06:117': {15: '弹药数量'},
};

const FORMULA_NAMES = {
  'item-buy-name': '购买物品', 'item-sell-name': '出售物品', 'stored-item-name': '保管物品',
  'item-buy-price': '购买价格', 'item-sell-price': '出售价格', 'quarter-item-price': '收购价格',
  'shop-actor-name': '顾客姓名', 'role-name': '人物姓名', 'vehicle-name': '战车名称',
  'hunter-name': '猎人姓名', 'last-party-vehicle-name': '队伍战车名称', 'equipment-name': '装备名称',
  'equipment-quantity': '装备数量', 'equipment-quantity-cost': '装备费用', 'configured-name': '配置名称',
  'service-amount': '指定数量', 'ammunition-deficit': '所需弹药', 'ammunition-deficit-cost': '装满弹药费用',
  'ammunition-input-cost': '弹药费用', 'armor-input-cost': '装甲费用', 'vehicle-armor-deficit': '所需装甲',
  'party-count': '队伍人数', 'inn-cost': '住宿费用', 'party-repair-cost': '队伍修理费用', 'repair-cost': '修理费用',
  'chassis-capacity-cost': '弹仓改造费用', 'chassis-weight-cost': '底盘改造费用',
  'chassis-upgrade-deficit': '改造载重差额', 'upgrade-category-name': '改造部件',
  'engine-upgrade-price': '引擎改造费用', 'upgraded-engine-name': '改造后引擎',
  'wanted-name': '通缉目标', 'wanted-bounty': '赏金', 'destination-name': '传送基地',
};

const recordKey = id => String(id || '').replace(/^record:/u, '');
const literalName = text => String(text || '').replace(/〔[^〕]*〕/gu, '').trim();
const choiceName = text => literalName(text).replace(/\s+/gu, ' ').replace(/[：:]+$/u, '').trim();

export function componentTextSummary(text, fallback = '') {
  const content = literalName(text).replace(/\s+/gu, '').replace(/^[，、：:。！？…]+/u, '');
  const sentence = content.match(/^[^。！？!?]+[。！？!?]?/u)?.[0] || '';
  return sentence.length > 20 ? `${sentence.slice(0, 20)}…` : sentence || fallback;
}

export function uiRecordComponentLabel(recordId, {layout = false, fallback = '界面文字'} = {}) {
  const named = RECORD_NAMES[recordKey(recordId)];
  if (named) return named;
  if (layout) return fallback.endsWith('窗口') ? fallback : `${fallback}窗口`;
  return componentTextSummary(currentTextReference(recordId).label, fallback);
}

export function uiImageComponentLabel(source) {
  return source === 'selection-cursor' ? '光标' : '图像';
}

export function distinctUiComponentLabels(nodes) {
  const parents = [], siblings = new Map();
  const rows = nodes.map(node => {
    const depth = node.depth || 0;
    parents.length = Math.min(parents.length, depth);
    const parent = parents.at(-1);
    const label = node.label === parent?.label ? `${node.label}组件` : node.label;
    const key = JSON.stringify([parent?.id, label]);
    const group = siblings.get(key) || [];
    const row = {...node, label};
    group.push(row); siblings.set(key, group);
    parents[depth] = row;
    return row;
  });
  for (const group of siblings.values()) if (group.length > 1)
    group.forEach((node, index) => {node.label += ` ${index + 1}`;});
  return rows;
}

function includesRecord(parent, child, seen = new Set()) {
  if (parent === child) return true;
  if (!parent || seen.has(parent)) return false;
  seen.add(parent);
  return (indexedResource(currentTextReference(parent).uid)?.references || []).some(reference =>
    reference.relation === 'includes-record' && includesRecord(indexedResource(reference.target)?.game_id, child, seen));
}

function providerLabel(recordId, provider, preview) {
  for (const layer of preview?.layers || []) {
    if (!includesRecord(layer.record, recordId)) continue;
    const path = layer.provider_save_names?.[provider] || layer.provider_save_values?.[provider]
      || layer.provider_scripts?.[provider] || layer.provider_values?.[provider];
    const field = typeof path === 'string' && FIELD_NAMES[path.split('.').at(-1)];
    if (field) return field;
    const itemIndex = layer.provider_save_items?.providers?.indexOf(provider) ?? -1;
    if (itemIndex >= 0) return `携带位 ${itemIndex + 1}`;
    const slot = layer.component_slot_providers?.[provider];
    if (slot) return slot.label;
  }
  return RECORD_FIELDS[recordKey(recordId)]?.[provider] || null;
}

function insertionLabel(item, recordId, preview) {
  for (const layer of preview?.layers || []) {
    const binding = layer.facility_parameter_bindings?.find(binding => binding.record === recordId
      && (binding.provider != null ? binding.provider === item.operands[0]
        : binding.token === item.token && binding.record_relative_offset === item.offset));
    const name = FORMULA_NAMES[binding?.value_source?.formula_id];
    if (name) return name;
  }
  const key = recordKey(recordId), provider = item.operands[0];
  if (key === '02:039' && provider === 10) return item.token === 0xFA ? '战车名称' : '战车编号';
  if (key === '02:003' && provider === 10) return '装甲';
  if (key === '12:000' && provider === 16 && preview?.field_overview?.kind === 'defense') return '防御';
  if (['02:004', '02:005', '03:015', '09:001'].includes(key)) {
    const index = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (index >= 0) return `携带位 ${index + 1}`;
  }
  if (key === '12:017') {
    const part = [39, 41, 42, 43, 44, 45, 46, 47].indexOf(provider);
    const carry = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (part >= 0) return `携带位 ${part + 1} 装备部件`;
    if (carry >= 0) return `携带位 ${carry + 1} 物品`;
  }
  if (key === '12:018') {
    const weight = [39, 59, 47, 48, 49, 50, 51, 52].indexOf(provider);
    const condition = [15, 16, 18, 20, 22, 24, 26, 28].indexOf(provider);
    if (weight >= 0) return `携带位 ${weight + 1} 重量`;
    if (condition >= 0) return `携带位 ${condition + 1} 损坏状态`;
  }
  if (key === '04:000') {
    const index = [15, 16, 18, 20, 22, 24].indexOf(provider);
    if (index >= 0 && item.token === 0xFA) return `炮弹位 ${index + 1} 名称`;
  }
  if ([0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD].includes(item.token)) {
    const field = providerLabel(recordId, item.operands[0], preview);
    if (field) return field;
    return `${uiRecordComponentLabel(recordId)}${[0xF8, 0xF9].includes(item.token) ? '数值' : '名称'}`;
  }
  if (item.token === 0xE8) return '姓名';
  if (item.token === 0xE9) return ['15:016', '15:017'].includes(key) ? '通缉目标'
    : key === '02:094' ? '金额提示' : key.startsWith('02:') ? '所选物品' : '引用名称';
  if (item.token === 0xE2) return ['record:06:035', 'record:06:156'].includes(recordId) ? '价格' : '数量';
  const region = {0xEA: 0x13, 0xEC: 0x14, 0xF2: 0x09, 0xF3: 0x11}[item.token];
  const target = item.token === 0xF7 ? textRecordNodeId(item.operands[1], item.operands[0])
    : region != null ? textRecordNodeId(region, item.operands[0]) : null;
  if (['record:02:005', 'record:09:001'].includes(target)) return `${uiRecordComponentLabel(target)}引用`;
  return target ? uiRecordComponentLabel(target, {fallback: key === '04:000' ? '炮弹统计标题'
    : `${uiRecordComponentLabel(recordId)}字样`}) : null;
}

export function uiTextComponentLabel(record, component, preview = null) {
  const tokens = textRecordEditorTokens(record, state.project.text_record_encoding, state.project.text_record_edits)
    .filter(item => component.ranges.some(range => item.offset >= range.offset
      && item.offset + item.bytes.length <= range.offset + range.length));
  const fields = [...new Set(tokens.filter(item => item.kind === 'fill')
    .map(item => insertionLabel(item, record.node_id, preview)).filter(Boolean))];
  if (fields.length) return fields.join(' / ');
  const text = literalName(component.text).replace(/^[，：…\s]+|[，：…\s]+$/gu, '');
  return componentTextSummary(text) || (tokens.some(item => item.kind === 'text'
    && item.text.startsWith('〔字节:')) ? '状态图标' : '间隔');
}

export function uiChoiceComponentLabel(group, choice, fallback) {
  const source = group?.choice_source;
  const index = Number(choice?.index);
  if (!source || !Number.isInteger(index)) return choiceName(currentTextChoiceLabel(choice?.label_reference) || fallback);
  switch (source.kind) {
    case 'carried-items': case 'carried-equipment': case 'carried-vehicle-equipment': return `携带位 ${index + 1}`;
    case 'party-members-with-all': return index === source.all_index ? '全员' : `人物 ${index}`;
    case 'party-character-vehicle-pairs': return `${index % 2 ? '战车' : '人物'} ${Math.floor(index / 2) + 1}`;
    case 'party-vehicle-pairs': return `战车 ${Math.floor(index / 2) + 1}`;
    case 'party-characters': return `人物 ${index + 1}`;
    case 'confirm-cycles-party-character': return '切换人物';
    case 'owned-vehicle-slots': return `战车 ${index + 1}`;
    case 'owned-vehicle-pairs': return `战车 ${(source.index_to_vehicle?.[index] ?? index) + 1}`;
    case 'vehicle-components': return ['主炮', '副炮', 'S-E', 'C 装置', '引擎', '底盘'][index];
    case 'eligible-weapon-mounts': return `挂载位 ${index + 1}`;
    case 'decimal-digits': return `数位 ${index + 1}`;
    case 'paged-damaged-vehicle-parts': return `损坏部件行 ${index + 1}`;
    case 'paged-vehicle-box-items': return `车载道具行 ${index + 1}`;
    case 'flag-gated-text-records': case 'equipment-attribute-selector':
      return choiceName(currentTextChoiceLabel({record: source.records[index]})) || (() => {
        const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(source.records[index]);
        return match ? uiRecordComponentLabel(textRecordNodeId(parseInt(match[1], 16), parseInt(match[2], 16)),
          {fallback}) : fallback;
      })();
    default: return fallback;
  }
}
