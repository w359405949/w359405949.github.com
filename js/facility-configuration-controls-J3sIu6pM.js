import { dataTable, setStatus, expandResourceByteRangeSlots, esc, resetToOriginalButton, bindFieldResetToOriginalButtons, fixedTextEditorMarkup, bindFixedTextEditors } from './monster-figure-C07vG7yu.js';
import { INVENTORY_TRANSACTION_EVIDENCE, deviceServiceGraph, SPECIAL_SERVICE_COMMANDS, specialServiceGraph, LIST_QUANTITY_COMMANDS, listQuantityServiceGraph, SIMPLE_SERVICE_COMMANDS, simpleServiceGraph, foldInterfaceStateGraph, publishedInterfaceStateGraph, SHOP_REGIONS, stableShopFrame, projectFieldDraftOrigin, textRecordComponents, decodeFixedTextRecord, decodeFixedTextRecordSelection, textRecordListReferenceChoices, textRecordEditorBytes, createTextRecordEncoding } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { mountLinkedFieldChoice, mountFieldObjectEditor } from './rectangle-preset-controls-MtKWNScU.js';

// @editor-module 详情页字段值表与已登记物理片段的对账
//
// 字段定义与字节地图取并集；物理片段由记录页的折叠区显示。


function normalizedFieldDefinitions(fields) {
  if (!Array.isArray(fields)) {
    throw new TypeError("fields 必须是 [key, label] 或 {key, label} 的数组");
  }
  const keys = new Set();
  return fields.map(definition => {
    const key = String(Array.isArray(definition)
      ? definition[0] : definition?.key ?? "");
    if (!key) throw new TypeError("字段定义缺少 key");
    if (keys.has(key)) throw new TypeError(`字段定义重复：${key}`);
    keys.add(key);
    const rawLabel = Array.isArray(definition) ? definition[1] : definition?.label;
    return {key, label: String(rawLabel ?? key)};
  });
}

function normalizedFieldRoles(fieldRoles) {
  if (!Array.isArray(fieldRoles)) {
    throw new TypeError("fieldRoles 必须是 role 字符串数组");
  }
  const roles = new Set();
  for (const rawRole of fieldRoles) {
    const role = String(rawRole || "");
    if (!role) throw new TypeError("fieldRoles 不能包含空 role");
    if (roles.has(role)) throw new TypeError(`fieldRoles 重复：${role}`);
    roles.add(role);
  }
  return roles;
}

function declarationForRole(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

function slotLabel(range, declarations) {
  const declaration = declarationForRole(declarations, range.role);
  const declared = declaration?.label;
  if (typeof declared === "function") {
    return String(declared(range.slotIndex, range));
  }
  const base = String(declared || range.role || range.key);
  return range.slotIndex === null ? base : `${base} ${range.slotIndex + 1}`;
}

function rowFromRange(range, {key, label, origin, kind}) {
  return {
    key,
    label,
    origin,
    kind,
    role: range?.role || `field:${key}`,
    fieldKey: range?.fieldKey ?? (kind === "field" ? key : null),
    slotIndex: range?.slotIndex ?? null,
    hasRange: Boolean(range),
    address: range || null,
    space: range?.space || null,
    offset: range?.offset ?? null,
    length: range?.length ?? null,
    status: range?.status || null,
  };
}

/**
 * 对账字段定义与物理片段，并返回表格行。
 *
 * `fields` 保持调用方顺序；同 key 有多段地址时每段各占一行。范围侧独有的
 * `field:` 以及声明展开后的槽行接在其后。`valueFor(row)` 返回值单元格 HTML。
 * `fieldRoles` 可把调用方指定的非 `field:` role 按同名字段参与对账；默认不启用，
 * 原语本身不认识任何业务 role。
 */
function reconcileFieldAddressRows({
  uid,
  fields = [],
  fieldRoles = [],
  slotDeclarations = {},
  valueFor = () => null,
} = {}) {
  if (typeof valueFor !== "function") throw new TypeError("valueFor 必须是函数");
  const definitions = normalizedFieldDefinitions(fields);
  const declaredFieldRoles = normalizedFieldRoles(fieldRoles);
  const ranges = expandResourceByteRangeSlots(uid, slotDeclarations).map(range =>
    range.fieldKey === null && declaredFieldRoles.has(range.role)
      ? {...range, key: range.role, fieldKey: range.role}
      : range
  );
  const fieldRanges = ranges.filter(
    range => range.fieldKey !== null && range.slotIndex === null,
  );
  const otherRanges = ranges.filter(
    range => range.fieldKey === null || range.slotIndex !== null,
  );
  const rangesByField = new Map();
  for (const range of fieldRanges) {
    if (!rangesByField.has(range.fieldKey)) rangesByField.set(range.fieldKey, []);
    rangesByField.get(range.fieldKey).push(range);
  }

  const declaredKeys = new Set(definitions.map(definition => definition.key));
  const rows = [];
  for (const definition of definitions) {
    const matches = rangesByField.get(definition.key) || [];
    if (!matches.length) {
      rows.push(rowFromRange(null, {
        ...definition,
        origin: "definition",
        kind: "field",
      }));
      continue;
    }
    for (const range of matches) {
      rows.push(rowFromRange(range, {
        ...definition,
        origin: "definition+range",
        kind: "field",
      }));
    }
  }
  for (const range of fieldRanges) {
    if (declaredKeys.has(range.fieldKey)) continue;
    rows.push(rowFromRange(range, {
      key: range.fieldKey,
      label: range.fieldKey,
      origin: "range",
      kind: "field",
    }));
  }
  for (const range of otherRanges) {
    const label = slotLabel(range, slotDeclarations);
    const key = range.key || range.role;
    if (!key || !label) continue;
    rows.push(rowFromRange(range, {
      key,
      label,
      origin: "range",
      kind: range.slotIndex === null ? "range" : "slot",
    }));
  }

  return rows.map((row, index) => {
    const identified = {...row, id: `${row.kind}:${row.key}:${index}`};
    return {...identified, value: valueFor(identified)};
  });
}

function fieldCell(row) {
  const key = `<small class="mono">${esc(row.key)}</small>`;
  return `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
    <b>${esc(row.label)}</b>${row.label === row.key ? "" : key}
  </div>`;
}

function valueCell(row) {
  return row.value === null || row.value === undefined || row.value === ""
    ? '<span class="resource-empty">—</span>' : String(row.value);
}

function statusCell(row) {
  return row.hasRange
    ? `<span data-field-address-status="${esc(row.status || "未分级")}">${
      esc(row.status || "未分级")
    }</span>`
    : '<span class="resource-unregistered" data-field-address-status="未登记">未登记</span>';
}

const FIELD_ADDRESS_COLUMNS = [
  {key: "label", label: "字段", width: 190, sticky: true, cell: fieldCell},
  {key: "value", label: "值", width: 180, wrap: true, cell: valueCell},
  {key: "status", label: "状态", width: 110, cell: statusCell},
];

/**
 * 构造详情页字段地址表。
 *
 * `dataTable` 会把字段行数写成“记录数”；这对详情页是错误语义。因此表生成后用
 * 调用方给的 `pageStatus` 覆盖四个状态槽，默认全部清空，上一页状态也不会残留。
 * 已按用途分块的页面可传入 reconcileFieldAddressRows 的 rows 子集，其余行由各块展示。
 */
function fieldAddressTable({pageStatus = {}, rows = null, showStatus = true, ...options} = {}) {
  rows ??= reconcileFieldAddressRows(options);
  const markup = dataTable({
    columns: showStatus ? FIELD_ADDRESS_COLUMNS : FIELD_ADDRESS_COLUMNS.filter(column => column.key !== "status"),
    rows,
    rowId: row => row.id,
    empty: "没有字段或物理片段",
  });
  setStatus({...pageStatus, address: ""});
  return `<div class="field-address-table" data-field-address-table
    data-field-address-row-count="${rows.length}">${markup}</div>`;
}

// @editor-module 商店声明只引用已核对的处理器与明确保留的缺口。

const evidence = 'project/evidence/reverse-engineering/generic-shop-stable-frames/context.asm';
const inputEvidence = 'project/evidence/reverse-engineering/generic-shop-input/observations.json';
const menuEvidence = 'project/evidence/reverse-engineering/menu-shop-declarations/observations.json';
const saleEvidence = 'project/evidence/reverse-engineering/menu-shop-sale-continuations/observations.json';
const menuRow = (id, label, reads, writes) => ({label, reads, writes, confirmed: true,
  evidence: `${menuEvidence}#${id}`});
const row = (label, reads, writes, offset, confirmed = true) => ({label, reads, writes,
  evidence: `${evidence}#PRG-${offset}`, confirmed});

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

// @editor-module 文字记录所属控件共用定长文字与脚本参数编辑器。

async function mountTextRecordControls(host, object, {onSaved = () => {}} = {}) {
  const database = object.database;
  let document = await database.getDocument('text-record');
  const href = `?${new URLSearchParams({view: 'text', textMode: 'records',
    textRegion: object.id.split(':')[1], textKind: 'all', textSearch: object.id})}`;
  const link = `<a class="editor-inline-link" data-scene-destination="${esc(href)}"
    href="${esc(href)}" title="${esc(object.id)}" aria-label="跳转到 ${esc(object.id)}">↗</a>`;
  const encoding = state.project?.text_record_encoding || createTextRecordEncoding(
    await database.getDocument('text.character-map'), await database.getDocument('project.text-catalog'),
    await database.getDocument('project.text-fonts'));
  if (!document.records[object.id]?.editable) {
    await mountFieldObjectEditor(host, object,
      {rowHandles: [object.id], compactIdentity: true, stacked: true});
    host.insertAdjacentHTML('afterbegin', fixedTextEditorMarkup({recordId: object.id,
      document, encoding, readonly: true}) + link);
    return;
  }
  const recordId = object.id;
  host.innerHTML = fixedTextEditorMarkup({recordId, document, encoding,
    label: recordId, compact: true, runtime: true});
  (host.querySelector('.fixed-text-editor-field') || host).insertAdjacentHTML('beforeend', link);
  const controller = bindFixedTextEditors(host, {database, getDocument: () => document,
    getEncoding: () => encoding, onSaved: async event => {
      document = event.saved.value.document;
      await onSaved(event);
    }});
  await controller.ready;
  host.dataset.fieldObjectReady = object.id;
}

async function mountTextRecordOrderControls(host, object, {group, recordContent = false,
  onSaved = () => {}, references = ''}) {
  const document = await object.database.getDocument('text-record');
  const origin = projectFieldDraftOrigin(document) || document;
  const record = origin.records[object.id];
  const encoding = state.project.text_record_encoding;
  if (record.byte_variants || record.list_order && record.list_order.group_id === group?.id) {
    const field = object.fields.find(field => field.fieldName === 'bytes');
    const choices = [{values: [[...field.value]], label: '当前内容'}];
    if (record.byte_variants) choices.push(...record.byte_variants.map(bytes => ({values: [bytes],
      label: `图块 ${bytes.slice(0, -1).map(value => value.toString(16).toUpperCase()).join(' ')}`})));
    else {
      const slots = record.list_order.slots;
      for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
        const bytes = [...field.value];
        slots[first].offsets.forEach((offset, index) => {
          const other = slots[second].offsets[index];
          bytes[offset] = field.value[other]; bytes[other] = field.value[offset];
        });
        choices.push({values: [bytes], label: `${first + 1} ↔ ${second + 1}`});
      }
    }
    host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}${record.byte_variants
      ? '' : '<p>命令按选项序号执行。</p>'}${references}`;
    mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
      {label: record.byte_variants ? '固定图块字样' : '图块顺序'});
    bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (recordContent) {
    await mountTextRecordControls(host, object);
    const field = object.fields.find(field => field.fieldName === 'bytes');
    let ready = false;
    field.bind(host, () => {if (ready) void onSaved();});
    ready = true;
    return;
  }
  if (!record?.editable || group.record !== object.id || !encoding) return;
  const components = textRecordComponents(record, encoding);
  const lines = decodeFixedTextRecord(record, encoding).formatted_text.split('\n');
  const slots = group.choices.map(choice => components.find(component => component.kind === 'text'
    && (choice.visible_text || lines[choice.label_reference?.line] || '').trim().startsWith(component.text.trim())))
    .filter(Boolean);
  if (new Set(slots).size !== slots.length) return;
  const field = object.fields.find(field => field.fieldName === 'bytes');
  const current = {...origin, records: {...origin.records,
    [object.id]: {...record, bytes: [...field.value]}}};
  const labels = slots.map(slot => decodeFixedTextRecordSelection({...record,
    bytes: [...field.value]}, encoding, slot.ranges).text.trim());
  const choices = [{values: [[...field.value]], label: '当前顺序'}];
  if (group.id === 'commands:41-44') choices.push(...textRecordListReferenceChoices({...record,
    bytes: [...field.value]}, encoding, origin));
  for (let first = 0; first < slots.length; first++) for (let second = first + 1; second < slots.length; second++) {
    try {
      const one = textRecordEditorBytes(current, object.id, labels[second], encoding, slots[first].ranges);
      if (!one.ok) continue;
      const swapped = {...current, records: {...current.records,
        [object.id]: {...record, bytes: one.bytes}}};
      const two = textRecordEditorBytes(swapped, object.id, labels[first], encoding, slots[second].ranges);
      if (!two.ok) continue;
      choices.push({values: [two.bytes], label: `${first + 1} ↔ ${second + 1} · ${labels[first]} / ${labels[second]}`});
    } catch (_) {}
  }
  host.innerHTML = `<div data-text-list-order></div>${resetToOriginalButton(object.id)}<p>命令按选项序号执行。</p>${references}<div data-text-list-content></div>`;
  mountLinkedFieldChoice(host.querySelector('[data-text-list-order]'), object, ['bytes'], choices,
    {label: '文字顺序'});
  bindFieldResetToOriginalButtons(host, new Map([[object.id, field]]), {afterReset: onSaved});
  if (choices.length === 1 || slots.length !== group.choices.length)
    await mountTextRecordControls(host.querySelector('[data-text-list-content]'), object);
  let ready = false;
  field.bind(host, () => {if (ready) void onSaved();});
  ready = true;
}

var textRecordControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountTextRecordControls: mountTextRecordControls,
  mountTextRecordOrderControls: mountTextRecordOrderControls
});

// @editor-module 设施配置所属控件使用已发布的槽位用途与引用命名空间。

async function mountFacilityConfigurationControls(host, object, options) {
  const [document, facilities] = await Promise.all([
    object.database.getDocument('facility-config'), object.database.getDocument('project.facilities'),
  ]);
  const family = document.families.find(row => row.records.some(record => record.record_id === object.id));
  const entry = facilities.configuration_loader.pointer_entries.find(row => Number(row.family_id) === Number(family.id));
  const namespace = entry.value_namespace;
  const columns = object.definition.editor.columns.map(column => {
    if (!column.name.startsWith('slot:')) return column;
    const slot = Number(column.name.slice(5));
    const schema = namespace?.slot_schema?.slots.find(row => Number(row.slot) === slot);
    const domain = schema?.namespace || (namespace?.slot_schema ? null : namespace?.namespace);
    const label = schema?.label || `${namespace?.goods_label || '项目'} ${slot + 1}`;
    const base = {...column, label};
    if (Number(family.id) === 0x0a) return {...base,
      candidates: {resourceId: 'audio-command', documentPath: ['records'], value: ['id'], label: ['label', 'id'],
        filter: {path: ['id'], values: namespace.goods.map(row => Number(row.value))}}};
    if (domain === 'item') return {...base, semantic: {kind: 'reference', targetModule: 'item-entry'},
      candidates: {resourceId: 'item-entry', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'shell') return {...base, semantic: {kind: 'reference', targetModule: 'shell-record'},
      candidates: {resourceId: 'shell-record', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'service-goods') return {...base, candidates: {document: 'project.facilities',
      documentPath: ['configuration_loader', 'pointer_entries', facilities.configuration_loader.pointer_entries.indexOf(entry),
        'value_namespace', 'goods'], value: ['value'], label: ['value'], textReference: ['text_record']}};
    return base;
  });
  return mountFieldObjectEditor(host, {...object, definition: {...object.definition,
    editor: {...object.definition.editor, columns}}}, options);
}

var facilityConfigurationControls = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountFacilityConfigurationControls: mountFacilityConfigurationControls
});

export { facilityConfigurationControls, fieldAddressTable, genericShopGraph, genericShopPaths, genericShopSelection, reconcileFieldAddressRows, textRecordControls };
