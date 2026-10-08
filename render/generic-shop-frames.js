// @editor-module 商店稳定画面声明各区域的来源、显隐与输入光标。
import {interfaceStateRegions} from './interface-state-regions.js';
export const SHOP_REGIONS = Object.freeze(interfaceStateRegions([
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

export function stableShopFrame(segment, pause, action, response, command) {
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

export function genericShopPreview(node, command, previews) {
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
