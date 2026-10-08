// @editor-module 简单服务从当前字段准备输入现场并投影本次窗口。
import {simpleServiceExecution} from './simple-service-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {facilityRuntimeCodeValues} from '../core/facility-runtime-code-sources.js';
import {genericShopPreview} from './generic-shop-frames.js';

export async function startSimpleServiceExecution(model, selected, dependencies) {
  const cid = model.command.command_id;
  const [rawFields, items, interfaces, selectionLayout, selectionMovement] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
  ]);
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', goods: 'shop-goods-selector',
    service: 'service-list-selector', category: 'sale-inventory-category-selector',
    inventory: 'sale-inventory-item-selector'};
  const navigationValues = await fieldSubmenuCodeValues(Object.values(names), read);
  const goods = model.record.slots.length ? await Promise.all(model.record.slots.map((_, index) =>
    dependencies.readField('facility-config', model.record.id, `slot:${index}`).then(field => field.value))) : [];
  const priceNames = goods.map(id => cid === 0x16 ? `inn-price-${id}`
    : cid === 0x19 ? `service-decoration-price-${id}` : `service-bar-price-${id}`);
  const priceValues = cid === 0x16 ? await facilityRuntimeCodeValues(priceNames, read)
    : [0x17, 0x18, 0x19].includes(cid) ? await fieldSubmenuCodeValues(priceNames, read) : null;
  const codes = cid === 0x16 ? priceValues : priceValues
    ? Object.fromEntries(priceNames.map(name => [name, fieldSubmenuCodeValue(priceValues, name)])) : {};
  const trade = cid === 0x2C ? {
    prices: await Promise.all(Array.from({length: 8}, (_, index) =>
      dependencies.readField('application-command', 'application-command:2C:00', `value${index}`).then(field => field.value))),
    thresholds: await Promise.all(Array.from({length: 8}, (_, index) =>
      dependencies.readField('application-command', 'application-command:2C:01', `value${index}`).then(field => field.value))),
  } : null;
  const adapter = simpleServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    goods, items, codes, trade, navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(navigationValues, name)]))}});
  const fields = Object.fromEntries(rawFields.all(`save.slot.${dependencies.context.slot}.`)
    .map(field => [field.fieldId, structuredClone(field.value)]));
  const initial = adapter.initial({fields, context: dependencies.context});
  selected.executionAdapter = adapter;
  selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

export async function simpleServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  const context = execution?.context || dependencies.context;
  preview.runtime_context = {...preview.runtime_context, save_slot: context.slot, role_slot: context.role,
    vehicle_slot: context.vehicle, shop_instance: selected.instance,
    ...(execution ? {list_choice_index: execution.execution.goods,
      choice_index: execution.selections.choice, shop_item_index: execution.execution.goods,
      sale_item_index: selected.executionAdapter.saleIndex(execution)} : {})};
  if (execution) {
    preview.service_preview_state = {values: execution.fields, selection: context, terminal: {}, conditions: []};
    if (preview.shop_menu?.sale_item_bar)
      preview.shop_menu.sale_item_bar = execution.execution.category ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  preview = await dependencies.resolveMenu(preview);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}
