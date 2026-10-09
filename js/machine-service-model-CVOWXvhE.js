import { foldInterfaceStateGraph, publishedInterfaceStateGraph } from './story-component-labels-BPQiH9EW.js';
import { SPECIAL_SERVICE_COMMANDS, LIST_QUANTITY_COMMANDS, SIMPLE_SERVICE_COMMANDS, DEVICE_SERVICE_COMMANDS } from './battle-result-script-runtime-B_EClFew.js';
import { interfacePreviewState } from './element-tree-DsgOBeTK.js';
import { facilityServiceStatePreviews, controllerServicePreview, elevatorServicePreview, vendingServiceResponsePreview } from './service-preview-scene-76gf-8YL.js';
import { roleEquipmentStats, SERVICE_ROLES, SERVICE_PARTS } from './ui-construction-preview-C97hIjGW.js';

// @editor-module 区域投影统一屏幕坐标、层次、裁剪与领域内容来源。
const interfaceBoundsOverlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x
  && a.y < b.y + b.height && a.y + a.height > b.y;

function intersectInterfaceBounds(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
}

const interfaceComponentBounds = components => components.reduce((bounds, row) => {
  if (!bounds) return {...row.bounds};
  const x = Math.min(bounds.x, row.bounds.x), y = Math.min(bounds.y, row.bounds.y);
  return {x, y, width: Math.max(bounds.x + bounds.width, row.bounds.x + row.bounds.width) - x,
    height: Math.max(bounds.y + bounds.height, row.bounds.y + row.bounds.height) - y};
}, null);

function interfaceStateRegions(regions) {
  const ids = new Set();
  return regions.map((region, order) => {
    if (!region.id || ids.has(region.id)) throw new TypeError('区域须有唯一组件身份');
    ids.add(region.id);
    const bounds = {...region.bounds};
    if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(bounds[key]))
        || bounds.width <= 0 || bounds.height <= 0) throw new TypeError(`区域尺寸无效：${region.id}`);
    return {...region, bounds, layer: region.layer ?? order,
      clip: region.clip === false ? null : {...(region.clip || bounds)},
      content: region.content ?? region.reference ?? region.source ?? null};
  }).sort((a, b) => a.layer - b.layer);
}

async function projectInterfaceRegions(regions, {resolve, paint, read, decorate = region => region,
  isCurrent = () => true}) {
  const surfaces = new Map(), projected = [];
  for (const region of interfaceStateRegions(regions)) {
    const source = await resolve(region);
    let surface = surfaces.get(source);
    if (region.visible && !surface) {
      surface = await paint(source);
      surfaces.set(source, surface);
    }
    if (!isCurrent()) return null;
    const area = region.visible ? read(surface, region.bounds) : {components: [], slots: []};
    projected.push(await decorate({...region, components: area.components, slots: area.slots,
      preview: area.preview}, {area, source, surface}));
  }
  return projected;
}

function interfaceRegionComponents(region) {
  return (region.components || []).map(component => ({...component, bounds: {...component.bounds,
    x: component.bounds.x + region.bounds.x, y: component.bounds.y + region.bounds.y}}));
}

// @editor-module 商店稳定画面声明各区域的来源、显隐与输入光标。
const SHOP_REGIONS = Object.freeze(interfaceStateRegions([
  {id: 'name', label: '店名', bounds: {x: 0, y: 0, width: 80, height: 144}},
  {id: 'list', label: '商品 / 服务列表', bounds: {x: 80, y: 0, width: 176, height: 144}},
  {id: 'selection', label: '主菜单', bounds: {x: 0, y: 144, width: 88, height: 96}},
  {id: 'dialogue', label: '对话', bounds: {x: 88, y: 144, width: 168, height: 96}},
]));
const LABELS = {1: '买卖菜单', 2: '告别', 6: '商品选择', 7: '继续交易', 9: '余额不足',
  11: '购买确认', 14: '购买对象选择', 16: '携带已满询问', 18: '死亡对象询问',
  19: '购买完成', 22: '出售对象选择', 25: '出售栏切换', 29: '出售物品选择',
  32: '出售报价', 38: '没有战车', 42: '出租车购买拒绝', 44: '出租车出售拒绝',
  46: '装备资格询问', 49: '携带已满', 52: '超重确认', 54: '部件禁售'};
const RESPONSES = {10: '取消购买', 28: '空物品栏', 31: '拒绝收购', 33: '取消报价', 34: '出售后选择'};
const BINDINGS = {1: 'buy-sell', 2: 'buy-sell', 6: 'goods', 7: 'goods', 9: 'insufficient-funds',
  11: 'confirm', 14: 'actor-select', 16: 'actor-select', 18: 'actor-select', 19: 'actor-select',
  22: 'sale-actors', 25: 'sale-category', 29: 'sale-inventory', 32: 'sale-offer', 38: 'buy-sell',
  42: 'actor-select', 44: 'rental-guard', 46: 'actor-select', 49: 'actor-select', 52: 'actor-select', 54: 'part-guard'};

function stableShopFrame(segment, pause, action, response, command) {
  const index = segment.index, responseIndex = response?.segment;
  const variant = [6, 25, 29].includes(index) && RESPONSES[responseIndex] ? `-${responseIndex}` : '';
  const cursor = pause.kind === 'menu' ? [14, 22].includes(index) ? 'selection' : 'list'
    : pause.kind === 'choice' ? 'dialogue' : null;
  const binding = BINDINGS[index];
  const label = variant ? RESPONSES[responseIndex] : LABELS[index] || command.label;
  const resource = `application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`;
  const content = action || response?.action;
  return {id: `frame:${index}${variant}:${pause.ordinal}`,
    label: `${label}${pause.kind === 'page' ? '（翻页）' : pause.kind === 'wait' ? '（确认）' : ''}`,
    segment, pause, action: action || response?.action, binding, response,
    input: pause.kind === 'menu' ? '方向键选择；A 确定；B 返回' : pause.kind === 'choice' ? '是 / 否' : 'A / B 继续',
    regions: SHOP_REGIONS.map(region => ({...region, visible: true, cursor: cursor === region.id,
      source: region.id === 'name' ? '当前商店标题与金额窗口'
        : region.id === 'list' ? `${binding} 的当前列表与继承窗口`
        : region.id === 'selection' ? [14, 22].includes(index) ? '当前预览人物／战车与选择窗口' : '继承的界面窗口'
        : '当前应用正文与内嵌输入', binding,
      reference: region.id === 'dialogue' && content ? content.provider_slot !== undefined
        ? `${resource}:runtime-record-slot:${content.provider_slot}` : `${resource}:text-record:${content.prg_offset}`
        : `已发布 ${resource}/${binding} 构造`, retention: '对应预览构造；原生窗口续接未确认'}))};
}

function genericShopPreview(node, command, previews) {
  if (!node) return null;
  if (node.publishedPreview) {
    const preview = structuredClone(node.publishedPreview);
    if (node.pause.kind !== 'unknown') {
      preview.runtime_context = {...preview.runtime_context, confirmed_waits: node.pause.confirmedWaits || 0};
      for (const layer of preview.layers.filter(layer => layer.shop_welcome))
        layer.inline_confirm = node.pause.kind === 'choice';
    }
    return {preview, source: node.id, status: 'published'};
  }
  const resourceId = `application-command:${command.command_id.toString(16).toUpperCase().padStart(2, '0')}`;
  const candidates = previews.filter(preview => preview.shop_menu?.resource_id === resourceId && !preview.id.startsWith('constructor:private-'));
  let binding = node.binding;
  if (command.command_id <= 0x11 && binding === 'actor-select') binding = 'vehicle-select';
  const exact = candidates.find(preview => preview.id.endsWith(`-${binding}`))
    || binding === 'insufficient-funds' && candidates.find(preview => preview.id.endsWith('-goods'));
  if (!exact) return null;
  const preview = structuredClone(exact), action = node.action;
  const custom = action && (node.pause.kind !== 'menu' || node.response && RESPONSES[node.response.segment]);
  // 行内确认复用已发布购买确认的声明，由文本运行时解析选项文字。
  const confirmation = custom && node.pause.kind === 'choice'
    ? candidates.find(candidate => candidate.id.endsWith('-confirm')) : null;
  const applyConfirmation = target => {
    if (!confirmation || target.selection_cursor?.kind === 'inline-text-confirm') return;
    target.selection_cursor = {...structuredClone(confirmation.selection_cursor),
      source_evidence: 'project/evidence/reverse-engineering/generic-shop-confirm-states/observations.json'};
    target.field_sources = [...(target.field_sources || []),
      ...(confirmation.field_sources || []).filter(source => source.role === 'cursor')];
  };
  if (custom) {
    preview.shop_menu.welcome_handle = action.provider_slot !== undefined ? `${resourceId}:runtime-record-slot:${action.provider_slot}`
      : `${resourceId}:text-record:${action.prg_offset}`;
    delete preview.shop_menu.welcome_slot;
    for (const layer of preview.layers.filter(layer => layer.shop_welcome)) {
      layer.record = action.record; layer.inline_confirm = node.pause.kind === 'choice';
    }
    applyConfirmation(preview);
  }
  preview.runtime_context = {...preview.runtime_context, confirmed_waits: node.pause.confirmedWaits || 0};
  const dialoguePreview = custom && binding === 'goods'
    ? structuredClone(candidates.find(candidate => candidate.id.endsWith('-welcome'))) : null;
  if (dialoguePreview) {
    dialoguePreview.shop_menu.welcome_handle = preview.shop_menu.welcome_handle;
    delete dialoguePreview.shop_menu.welcome_slot;
    for (const layer of dialoguePreview.layers.filter(layer => layer.shop_welcome)) {
      layer.record = action.record; layer.inline_confirm = node.pause.kind === 'choice';
    }
    applyConfirmation(dialoguePreview);
  }
  return {preview, dialoguePreview, source: exact.id, status: custom ? 'composed' : 'published'};
}

// @editor-module 库存事务按原生处理器保留配对状态与装备派生字段。

function carriedInventoryCount(items) {
  const first = items.indexOf(0);
  return first < 0 ? items.length : first;
}

function removeCarriedItem(items, index) {
  if (items.length !== 8 || !Number.isInteger(index) || index < 0 || index >= carriedInventoryCount(items))
    throw new RangeError('所选道具不在当前八槽携带栏');
  const result = [...items];
  result.splice(index, 1); result.push(0);
  return result;
}

const INVENTORY_TRANSACTION_EVIDENCE = 'project/evidence/reverse-engineering/inventory-transactions/observations.json';

function creditedGold(gold, quote) {
  if (![gold, quote].every(value => Number.isInteger(value) && value >= 0 && value <= 0xFFFFFF))
    throw new RangeError('收购资金与报价须为 24 位无符号数');
  return Math.min((gold + quote) & 0xFFFFFF, 9999999);
}

function inventoryStatusBranch(index, read) {
  if (!Number.isInteger(index) || index < 0 || index > 7)
    throw new RangeError('人物状态读取索引超出已确认字段');
  const field = index < 3 ? 'status' : index < 6 ? 'level' : 'strength';
  return Number(read(`role.${SERVICE_ROLES[index % 3]}.${field}`) === 255);
}

function inventorySaleBranch(id, installed) {
  return id >= 0x91 && id < 0x99 ? 2 : Number(Boolean(installed));
}

function inventoryRemoval({vehicle, object, category, index, read, items, effects, overlays}) {
  const path = suffix => `${object}.${suffix}`;
  const updates = [];
  const write = (suffix, value) => updates.push([path(suffix), value]);
  if (!vehicle || category) {
    const suffix = category ? 'inventory' : 'equipment';
    const values = vehicle ? Array.from({length: 8}, (_, slot) => read(path(`item.${slot}`))) : [...read(path(suffix))];
    const next = removeCarriedItem(values, index);
    if (vehicle) next.forEach((id, slot) => write(`item.${slot}`, id));
    else write(suffix, next);
    if (!vehicle && !category) {
      const tail = overlays?.descending_equipment_masks?.[index];
      if (!Number.isInteger(tail)) throw new TypeError('人物装备移位掩码未确认');
      const old = read(path('slot_flags')), flags = ((old << 1) & tail) | (old & (tail ^ 255));
      const stats = roleEquipmentStats({equipment: next, slot_flags: flags,
        ...Object.fromEntries(['strength', 'speed', 'vitality'].map(field => [field, read(path(field))]))}, id => {
        const value = items.find(row => row.id === id)?.[id < 0x23 ? 'defense' : 'attack']?.value;
        if (!Number.isInteger(value)) throw new TypeError('人物装备攻防数值未确认');
        return value;
      });
      if (effects?.records?.length !== 3) throw new TypeError('人物装备特殊效果物品表未确认');
      let special = 0, armorSlot = 255;
      next.forEach((id, slot) => {
        if (!(flags & (0x80 >> slot)) || id >= 0x23) return;
        if (id >= 0x18 && id < 0x1D) armorSlot = slot;
        const effect = effects.records.findIndex(row => row.item_reference === `human-item:${id.toString(16).toUpperCase().padStart(2, '0')}`);
        if (effect >= 0) {
          const mask = overlays.zero_prefixed_ascending_bit_masks[effect + 1];
          if (!Number.isInteger(mask)) throw new TypeError('人物特殊效果位掩码未确认');
          special |= mask;
        }
      });
      write('slot_flags', flags);
      for (const [field, value] of Object.entries(stats)) write(field, value);
      write('equipment_special_effects_raw', special);
      const role = SERVICE_ROLES.indexOf(object.split('.').at(-1));
      const slots = [...read('entity_scene_object_slots')];
      slots[7 + role] = armorSlot === 255 ? 255 : role * 8 + armorSlot;
      updates.push(['entity_scene_object_slots', slots]);
      return {updates, armorSlot};
    }
    return {updates};
  }
  const mask = read(path('equipped_mask_raw'));
  if (mask & 3) throw new TypeError('第七、八设备槽安装标记超出已确认安装域');
  const rows = SERVICE_PARTS.flatMap((part, slot) => {
    const id = read(path(`equipment.${part}`));
    return id ? [{id, condition: read(path(`equipment_state.${part}`)), installed: Boolean(mask & (0x80 >> slot)), slot}] : [];
  });
  const selected = rows.findIndex(row => row.slot === index);
  if (selected < 0) throw new RangeError('所选设备不在当前紧缩列表');
  rows.splice(selected, 1);
  const slots = Array(8).fill(null);
  for (const row of rows.filter(row => row.installed)) slots[row.slot] = row;
  for (const row of rows.filter(row => !row.installed)) slots[slots.indexOf(null)] = row;
  let nextMask = 0;
  slots.forEach((row, slot) => {
    if (!row?.installed) return;
    const mask = overlays?.descending_bit_masks?.[slot];
    if (!Number.isInteger(mask)) throw new TypeError('设备安装位掩码未确认');
    nextMask |= mask;
  });
  SERVICE_PARTS.forEach((part, slot) => {
    const row = slots[slot];
    write(`equipment.${part}`, row?.id || 0);
    write(`equipment_state.${part}`, row?.condition || 0);
    write(`equipped.${part}`, Number(Boolean(nextMask & (0x80 >> slot))));
  });
  write('equipped_mask_raw', nextMask);
  return {updates};
}

function commitInventoryRemoval(state, plan, put, object) {
  for (const [suffix, value] of plan.updates) put(state, suffix, value);
  if (plan.armorSlot !== undefined) {
    const role = SERVICE_ROLES.indexOf(object.split('.').at(-1));
    state.execution.armorSlots = {...state.execution.armorSlots,
      [role]: plan.armorSlot === 255 ? 255 : role * 8 + plan.armorSlot};
  }
}

// @editor-module 商店声明只引用已核对的处理器与明确保留的缺口。

const evidence$1 = 'project/evidence/reverse-engineering/generic-shop-stable-frames/context.asm';
const inputEvidence = 'project/evidence/reverse-engineering/generic-shop-input/observations.json';
const menuEvidence = 'project/evidence/reverse-engineering/menu-shop-declarations/observations.json';
const saleEvidence = 'project/evidence/reverse-engineering/menu-shop-sale-continuations/observations.json';
const menuRow = (id, label, reads, writes) => ({label, reads, writes, confirmed: true,
  evidence: `${menuEvidence}#${id}`});
const row = (label, reads, writes, offset, confirmed = true) => ({label, reads, writes,
  evidence: `${evidence$1}#PRG-${offset}`, confirmed});

function shopNativeOperation(operation, segment, branch) {
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

// @editor-module 应用输入执行器按正文暂停与领域效果推进隔离状态。

const waits = new Set(['wait-for-confirm-marker', 'page-break-or-repeat-end']);
const choices = new Set(['open-choice-selector', 'open-choice-selector-alias']);

function interfaceApplicationPrograms(command, text) {
  return command.dialogue_flow.segments.map(segment => {
    const events = (segment.operations || []).map(operation => ({operation, offset: operation.prg_offset}));
    for (const action of segment.actions.filter(row => row.record)) {
      const existing = events.find(row => row.offset === action.prg_offset);
      if (existing) existing.action = action;
      else events.push({action, offset: action.prg_offset});
    }
    events.sort((a, b) => a.offset - b.offset);
    let ordinal = 0;
    return events.flatMap(event => event.action ? [{...event, type: 'text'},
      ...(text.records[event.action.record]?.protected_ranges || []).filter(token => waits.has(token.semantic) || choices.has(token.semantic))
        .map(token => ({type: 'pause', action: event.action, ordinal: ordinal++,
          kind: choices.has(token.semantic) ? 'choice' : 'wait', token}))]
      : event.operation.opcode === 0xF7 ? [{...event, type: 'menu', kind: 'menu', ordinal: ordinal++}]
      : [{...event, type: 'operation'}]);
  });
}

function interfaceApplicationExecution({command, graph, text, evidence, domain}) {
  const programs = interfaceApplicationPrograms(command, text);
  const block = (state, reason) => {
    state.execution.status = 'unknown'; state.execution.reason = reason;
    state.execution.trace.push({control: state.control, status: 'unknown', reason, evidence});
  };
  const changeSegment = (state, target) => {
    state.control = target; state.execution.position = 0; state.pause = null;
    state.execution.trace.push({control: target, evidence});
  };
  const returned = (state, marker) => {
    state.execution.status = 'returned'; state.execution.returnMarker = marker;
    state.returnStack.pop(); state.pause = null; state.windows = [];
  };
  const branch = (state, segment, index) => {
    const term = segment.terminator;
    if (!term) return block(state, `控制段 ${segment.index} 的调用续接未确认`);
    const target = term.reason === 'application-vm-indexed-segment-table-end'
      ? Number(term.successor_segment_ids[index]?.split(':').at(-1))
      : term.operands[([0xF7, 0xF8, 0xF9, 0xFC].includes(term.opcode) ? 1 : 0) + index];
    if (!Number.isInteger(target)) return block(state, `控制段 ${segment.index} 的分支 ${index} 未确认`);
    if (target >= 0xFE) return returned(state, target);
    if (!programs[target]) return block(state, `控制段 ${segment.index} 的目标 ${target} 未确认`);
    changeSegment(state, target);
  };
  const helpers = {block, branch, changeSegment};
  const adapter = domain(helpers);
  const options = state => state.execution?.status === 'waiting' ? adapter.options(state) : [];
  const settle = state => {
    const seen = new Set();
    while (state.execution.status === 'running') {
      const key = JSON.stringify([state.control, state.execution.position, state.fields, state.execution.branch]);
      if (seen.has(key)) {block(state, `控制段 ${state.control} 缺少有进展的续接`); break;}
      seen.add(key);
      const segment = command.dialogue_flow.segments[state.control];
      const event = programs[state.control]?.[state.execution.position];
      if (!event) {branch(state, segment, adapter.fallthrough?.(state, segment) ?? 0); continue;}
      if (event.type === 'pause' || event.type === 'menu') {
        const node = adapter.pauseNode(state, event, segment);
        if (!node) {block(state, `控制段 ${state.control} 的暂停点没有稳定画面`); break;}
        state.node = node.id; state.pause = {...node.pause}; state.execution.status = 'waiting';
        adapter.preparePause(state, event, segment);
        break;
      }
      state.execution.position++;
      if (event.type === 'text') {
        state.execution.response = segment.index;
        state.execution.responseAction = event.action;
        state.execution.trace.push({control: state.control, record: event.action.record,
          source: event.action.id, evidence});
        continue;
      }
      const op = event.operation.opcode;
      if (op === 0xD1) branch(state, segment, 0);
      else if (op === 0xD5) branch(state, segment, state.execution.branch);
      else if (op >= 0xFE) {
        if (segment.terminator.reason === 'application-vm-indexed-segment-table-end') branch(state, segment, state.execution.choice);
        else returned(state, op);
      } else adapter.operate(state, event.operation, segment);
    }
    return state;
  };
  return {
    evidence, options, ...adapter.exports,
    resume: state => settle(state),
    initial({fields, context, caller = 'scene-interaction'}) {
      const state = interfacePreviewState({context, entry: graph.entry, node: graph.entry, control: 0, fields,
        returnStack: [{caller}], execution: {status: 'running', position: 0, choice: 0, branch: 0,
          goods: 0, category: 0, sale: 0, objectList: null, transactions: [], trace: [], response: null,
          ...adapter.initial}});
      return settle(state);
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting') return state;
      const list = options(state), oldChoice = state.selections.choice;
      if (input.type === 'option' || ['up', 'down', 'left', 'right'].includes(input.type)) {
        if (!list.length) return state;
        const index = input.type === 'option' ? input.index
          : adapter.directionChoice(state, ['up', 'down', 'left', 'right'].indexOf(input.type) + 1, list.length);
        if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new RangeError('输入选项超出当前选择域');
        state.selections.choice = index;
        state.execution.trace.push({node: state.node, input: input.type, from: oldChoice, selection: index, evidence});
        adapter.select(state, index);
        return state;
      }
      if (!['a', 'b'].includes(input.type)) throw new TypeError('未声明的预览输入');
      const e = state.execution;
      e.trace.push({node: state.node, input: input.type, selection: state.selections.choice, evidence});
      e.status = 'running';
      if (state.pause.kind === 'menu') {
        if (input.type === 'a' && !list.length && !adapter.acceptEmptyMenu?.(state)) {e.status = 'waiting'; return state;}
        e.choice = state.selections.choice;
        adapter.select(state, e.choice, input);
        branch(state, command.dialogue_flow.segments[state.control], input.type === 'a' ? 0 : 1);
      } else {
        if (state.pause.kind === 'choice') e.branch = input.type === 'b' ? 1 : state.selections.choice;
        e.position++;
      }
      return settle(state);
    },
  };
}

// @editor-module 简单服务的原生声明区分已确认局部效果与完整执行边界。

const evidence = 'project/evidence/reverse-engineering/simple-service-input/observations.json';
const labels$1 = new Map([
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
const callbacks$2 = new Map([[0xA7B4, '准备草药商人携带栏'], [0xEEB3, '准备人物选择窗口'],
  [0xA358, '统计当前战车'], [0xB15B, '设置调用实例临时值'],
  [0xA810, '将收购报价再次折半'], [0xA1EB, '清除所选人物状态高位']]);

function simpleServiceNativeOperation(operation, cid, branch = null) {
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
    || op === 0xD2 && !callbacks$2.has(callback) && !innRest || !labels$1.has(op) && op !== 0xD2;
  let label = callback !== null ? callbacks$2.get(callback) : labels$1.get(op);
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

// @editor-module 简单服务把应用暂停点与现有显示阶段适配为公共状态图。


const SIMPLE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/simple-service-input/observations.json';

const menus$3 = new Map([
  [0x16, {3: 'inn-service-room-select'}],
  [0x17, {5: 'bar-service-order-list', 10: 'bar-service-drinker-select'}],
  [0x18, {5: 'bar-service-alternate-order-list', 10: 'bar-service-alternate-drinker-select'}],
  [0x19, {3: 'interior-decoration-shop-list'}],
  [0x1E, {1: 'herbal-medicine-vendor-goods'}],
  [0x24, {2: 'special-item-buyer-actors', 6: 'special-item-buyer-category', 9: 'special-item-buyer-inventory'}],
  [0x2C, {0: 'vehicle-trade-amount'}],
  [0x2F, {6: 'paralysis-massage-service-target'}],
]);

function simpleServiceGraph(command, text, previews, branches = [], {
  menuNodes = menus$3.get(command.command_id) || {}, nativeOperation = simpleServiceNativeOperation,
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

// @editor-module 多层列表服务引用原应用的暂停点、构造与确认边界。


const LIST_QUANTITY_EVIDENCE = 'project/evidence/reverse-engineering/list-quantity-service-input/observations.json';
const menus$2 = {
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
const labels = new Map([[0xC4, '显示当前炮弹商品列表'], [0xEA, '检查当前物品安装标记与底盘禁售'],
  [0xEB, '检查物品编号是否超出 DC'], [0x94, '设置对象类别'], [0x96, '准备数量窗口'], [0x97, '恢复武器列表位置'],
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
    0xB027, 0xA28C, 0xA4F6, 0xA58E, 0xA6E3, 0xAC33, 0xA9D9, 0xA13E, 0xF49B, 0xB03E, 0xA0DF, 0xABCE, 0xA601].includes(callback)

    || !labels.has(op) && callback === null && ![0x93, 0x9C, 0xAE, 0xBA, 0xBC, 0xBF, 0xC3, 0xC9, 0xD1, 0xD5, 0xD9, 0xE0, 0xFE, 0xFF].includes(op);
  return {label: callback !== null ? `领域调用 ${callback.toString(16).toUpperCase()}`
    : labels.get(op) || `原生 ${op.toString(16).toUpperCase()}`, confirmed: !unknown,
    reads: ['当前预览字段与所选物理槽'], writes: ['本次快照'], evidence: [0xC4, 0xEA, 0xEB, 0xAE].includes(op) || [0xF49B, 0xB03E, 0xA0DF, 0xABCE, 0xA601].includes(callback) ? INVENTORY_TRANSACTION_EVIDENCE : LIST_QUANTITY_EVIDENCE};
}

function listQuantityServiceGraph(command, text, previews, branches) {
  const callbackTargets = Object.fromEntries(command.dialogue_flow.segments.filter(segment =>
    segment.operations?.some(operation => operation.opcode === 0xD2
      && operation.operands[0] === 0xDF && operation.operands[1] === 0xA0)
    && segment.callback_continuation?.confirmation_status === 'confirmed').map(segment => [segment.index,
    segment.callback_continuation.reads.filter(read => read.confirmation_status === 'confirmed')
      .map(read => read.value)]));
  return {...simpleServiceGraph(command, text, previews, branches, {menuNodes: menus$2[command.command_id],
    nativeOperation: listQuantityNativeOperation, evidence: LIST_QUANTITY_EVIDENCE, callbackTargets}), quantities: true};
}

// @editor-module 专用服务把已确认调用续接投影到公共状态图。


const SPECIAL_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/special-service-input/observations.json';
const SPECIAL_SERVICE_CALL_EVIDENCE = 'project/evidence/reverse-engineering/special-service-calls/observations.json';
const windowEvidence = 'project/evidence/reverse-engineering/service-window-boundaries/observations.json';
const menus$1 = {
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
const callbacks$1 = {33: {21: [12, 39]}, 35: {8: [10, 9]}, 43: {8: [10, 9], 11: [9, 8]}};
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

function specialServiceGraph(command, text, previews, branches) {
  const graph = simpleServiceGraph(command, text, previews, branches, {
    menuNodes: menus$1[command.command_id], callbackTargets: callbacks$1[command.command_id],
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

// @editor-module 设备状态图复用已有构造并保留领域调用的确认边界。


const DEVICE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/device-service-input/observations.json';
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

function deviceServiceGraph(command, text, previews, catalog, invocation = {}) {
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
        {...edge('device:password-alarm', 'device:password-alarm', '结果未接受 · 保留调用栈', true),
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

// @editor-module 商店原型把输入等待点之间的控制段折叠到只读转移。

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

function genericShopGraph(command, textDocument, previews, branches, {catalog, invocation} = {}) {
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
    fallback: {id: 'unknown-frame', label: '画面', pause: {kind: 'unknown'},
    input: '当前应用没有已发布的对应预览构造', regions: SHOP_REGIONS.map(region => ({...region,
      visible: null, cursor: false, source: '未确认', retention: '未确认'}))}});
  return {...graph, basic: false};
}

function genericShopPaths(graph, objectCount) {
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

function genericShopSelection(graph, selected, paths, objectCount) {
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

// @editor-module 机器与通缉服务把应用暂停点和领域边界交给公共状态图。


const MACHINE_SERVICE_EVIDENCE = 'project/evidence/reverse-engineering/machine-service-input/observations.json';
const menus = {26: {1: 'jukebox-screen'}, 37: {0: 'wanted-information-office-menu'},
  45: {3: 'teleport-terminal-screen'}, 53: {0: 'next-level-experience-screen'}};
const callbacks = new Map([[0xAE92, '构造当前配置曲目'], [0xAEBB, '提交所选声音并返回曲目列表'],
  [0xADD7, '构造开放目的地列表'], [0xF46E, '检查所选目的地'],
  [0xAE4D, '显示经验标题'], [0xEEAA, '按当前队伍计算升级经验'],
  [0xEECE, '按事务所参数读取情报'], [0xB105, '扫描击破履历与领取位'],
  [0xB10C, '扫描下一个可领取目标'], [0xA17B, '刷新金钱窗口']]);

function machineServiceGraph(command, text, previews, catalog, invocation = {}) {
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

export { DEVICE_SERVICE_EVIDENCE, LIST_QUANTITY_EVIDENCE, MACHINE_SERVICE_EVIDENCE, SIMPLE_SERVICE_EVIDENCE, SPECIAL_SERVICE_EVIDENCE, carriedInventoryCount, commitInventoryRemoval, creditedGold, genericShopGraph, genericShopPaths, genericShopPreview, genericShopSelection, interfaceApplicationExecution, interfaceBoundsOverlap, interfaceComponentBounds, interfaceRegionComponents, intersectInterfaceBounds, inventoryRemoval, inventorySaleBranch, inventoryStatusBranch, machineServiceGraph, projectInterfaceRegions, removeCarriedItem };
