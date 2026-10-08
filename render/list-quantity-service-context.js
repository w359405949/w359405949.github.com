// @editor-module 多层服务取得当前字段并把执行现场传给既有语义预览。
import {listQuantityServiceExecution} from './list-quantity-service-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {facilityRuntimeCodeValues} from '../core/facility-runtime-code-sources.js';
import {genericShopPreview} from './generic-shop-frames.js';

export async function startListQuantityServiceExecution(model, selected, dependencies) {
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', goods: 'shop-goods-selector', weapon: 'supply-weapon-selector',
    category: 'sale-inventory-category-selector', inventory: 'sale-inventory-item-selector',
    storage: 'storage-withdraw-selector', shell: 'shell-sale-selector'};
  const [raw, items, shells, overlays, effects, interfaces, selectionLayout, selectionMovement, selectors, codes] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readDocument('shell-record'),
    dependencies.readDocument('shared-indexed-byte-overlays'), dependencies.readDocument('role-equipment-derived'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(names), read), facilityRuntimeCodeValues(['equipment-quantity-unit-price',
      'armor-price-rounding-bias', 'armor-price-divisor', 'armor-equipment-item-limit'], read),
  ]);
  const count = model.record.id ? (await dependencies.readField('facility-config', model.record.id, 'payload_length')).value : 0;
  const goods = await Promise.all(Array.from({length: count}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const rows = raw.all(`save.slot.${dependencies.context.slot}.`);
  const adapter = listQuantityServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    items, shells, overlays, effects, codes, goods, fieldStatuses: Object.fromEntries(rows.map(row => [row.fieldId, row.status])),
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(selectors, name)]))}});
  const initial = adapter.initial({fields: Object.fromEntries(rows.map(row => [row.fieldId, structuredClone(row.value)])),
    context: {...dependencies.context, service_amount: 0}});
  selected.executionAdapter = adapter; selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

export async function listQuantityServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  if (node.pause.kind === 'choice') preview.selection_cursor = {
    resource_id: 'selection-layout', kind: 'inline-text-confirm', protocol: 'text-confirmation'};
  if (execution) {
    const e = execution.execution;
    const menu = preview.shop_menu || {};
    const listIndex = menu.service_weapon_menu || menu.ammunition_selection ? e.weaponChoice
      : menu.shell_goods ? e.goods : menu.callback_prompt_handle ? e.armorChoice ?? 0
      : menu.retained_service_prompt ? e.supplyChoice ?? 0 : execution.selections.choice;
    const index = menu.service_weapon_menu || menu.ammunition_selection ? e.weaponChoice
      : execution.control === 49 ? e.stored - e.storagePage : execution.selections.choice;
    preview.runtime_context = {...preview.runtime_context, save_slot: execution.context.slot,
      role_slot: execution.context.role, vehicle_slot: execution.context.vehicle, shop_instance: selected.instance,
      choice_index: index, list_choice_index: listIndex,
      shop_item_index: e.goods, sale_item_index: selected.executionAdapter.saleIndex(execution),
      stored_item_index: e.stored, first_row: e.storagePage, shell_index: e.shellSlot ?? 0};
    preview.service_preview_state = {values: execution.fields, selection: execution.context, terminal: {}, conditions: []};
    if (preview.shop_menu?.sale_item_bar)
      preview.shop_menu.sale_item_bar = selected.executionAdapter.inventoryKind(execution) ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  if (execution?.execution.callbackWait) {
    preview.shop_menu = {...preview.shop_menu, welcome_record: execution.execution.callbackWait.record};
    preview.runtime_context.confirmed_waits = 0;
    delete preview.selection_cursor;
    for (const layer of preview.layers.filter(layer => layer.shop_welcome)) {
      layer.record = execution.execution.callbackWait.record; layer.inline_confirm = false;
    }
  }
  preview = await dependencies.resolveMenu(preview);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}
