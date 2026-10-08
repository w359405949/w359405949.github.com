// @editor-module 商店阶段适配器提供临时上下文、区域内容与窗口历史。
import {genericShopPreview, genericShopSelection} from './generic-shop-model.js';
import {genericShopServicePreview} from './generic-shop-service-preview.js';
import {interfacePreviewState} from './interface-state-preview.js';
import {interfaceBoundsOverlap} from './interface-state-regions.js';
import {genericShopExecution} from './generic-shop-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {startSimpleServiceExecution, simpleServiceFramePlan} from './simple-service-context.js';
import {startListQuantityServiceExecution, listQuantityServiceFramePlan} from './list-quantity-service-context.js';
import {startSpecialServiceExecution, specialServiceFramePlan} from './special-service-context.js';
import {startDeviceServiceExecution, deviceServicePreview} from './device-service-context.js';

export async function startGenericShopExecution(model, selected, dependencies) {
  if (model.graph.device) {
    const context = {...structuredClone(dependencies.context),
      service: {...dependencies.context.service, command: model.command.command_id, argument: selected.instance}};
    const {adapter, session} = await startDeviceServiceExecution(model, context, dependencies);
    selected.executionAdapter = adapter;
    selected.previewSession = session;
    selected.node = session.state.node; selected.step = 0;
    delete selected.restoredPreview;
    return session.state;
  }
  if (model.graph.special) return startSpecialServiceExecution(model, selected, dependencies);
  if (model.graph.quantities) return startListQuantityServiceExecution(model, selected, dependencies);
  if (model.graph.service) return startSimpleServiceExecution(model, selected, dependencies);
  const selectorNames = {1: 'shop-menu-selector', 6: 'shop-goods-selector', 14: 'shop-actor-selector',
    22: 'shop-actor-selector', 25: 'sale-inventory-category-selector', 29: 'sale-inventory-item-selector'};
  const [rawFields, items, overlays, count, interfaces, selectionLayout, selectionMovement, codeValues] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'),
    dependencies.readDocument('shared-indexed-byte-overlays'),
    dependencies.readField('facility-config', model.record.id, 'payload_length'),
    dependencies.readInterfaces(), dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(selectorNames), source => dependencies.readField(source.resource_id, source.entity_handle, source.field)),
  ]);
  const goods = await Promise.all(Array.from({length: count.value}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const fields = Object.fromEntries(rawFields.all(`save.slot.${dependencies.context.slot}.`)
    .map(field => [field.fieldId, structuredClone(field.value)]));
  const prefix = `save.slot.${dependencies.context.slot}.`;
  if (selected.path === 'funds') fields[prefix + 'gold'] = 0;
  const adapter = genericShopExecution({command: model.command, graph: model.graph,
    text: dependencies.text, goods, items: items.records, ammunition: [0, ...overlays.level_value_codebook],
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(selectorNames).map(([control, name]) => [control, fieldSubmenuCodeValue(codeValues, name)]))}});
  const initial = adapter.initial({fields, context: dependencies.context});
  if (selected.path === 'refused') initial.selections.choice = 1;
  selected.executionAdapter = adapter;
  selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0;
  delete selected.restoredPreview;
  return initial;
}

export async function genericShopFramePlan(model, selected, dependencies) {
  if (model.graph.special) return specialServiceFramePlan(model, selected, dependencies);
  if (model.graph.quantities) return listQuantityServiceFramePlan(model, selected, dependencies);
  if (model.graph.service && !model.graph.device) return simpleServiceFramePlan(model, selected, dependencies);
  const node = model.graph.nodes.find(node => node.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  if (model.graph.device) {
    const preview = deviceServicePreview(model, {...selected, session: selected.previewSession}, source.preview);
    preview.runtime_context = {...preview.runtime_context, save_slot: dependencies.context.slot,
      facility_instance: selected.instance};
    return {source, preview, lower: null, contents: {device: preview}};
  }
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  const context = structuredClone(execution?.context || dependencies.context);
  let preview = {...structuredClone(source.preview), runtime_context: {...source.preview.runtime_context,
    save_slot: context.slot, role_slot: context.role, vehicle_slot: context.vehicle,
    shop_instance: selected.instance,
    ...(execution ? {choice_index: execution.selections.choice, shop_item_index: execution.execution.goods,
      sale_item_index: selected.executionAdapter.saleIndex(execution),
      list_choice_index: execution.selections.choice} :
      selected.path && node.binding === 'buy-sell' ? {choice_index: selected.path === 'refused' ? 1 : 0} : {})}};
  if (execution) {
    preview.service_preview_state = {values: execution.fields,
      selection: execution.context, terminal: {}, conditions: []};
    if (preview.shop_menu.sale_item_bar) preview.shop_menu.sale_item_bar = execution.execution.category ? 'inventory' : 'equipment';
  } else preview = await dependencies.resolveConditions(preview);
  const path = model.paths.find(path => path.id === selected.path);
  if (!execution) preview = await genericShopServicePreview(preview, {...dependencies,
    path: selected.path, record: model.record, command: model.command,
    final: path && selected.step === path.nodes.length - 1});
  preview = await dependencies.resolveMenu(preview);
  const lower = execution ? {list: Boolean(execution.execution.objectList),
    cursor: [14, 22].includes(execution.control), dependsOn: '输入历史',
    source: model.graph.nodes.find(row => row.segment.index === execution.execution.objectList)}
    : genericShopSelection(model.graph, selected, model.paths, model.party?.count);
  let selectionPreview = null;
  if (lower) {
    const template = lower.list ? genericShopPreview(lower.source, model.command, model.previews)?.preview
      : model.previews.find(row => row.interface_state_id === 'field-command-menu.main');
    if (!template) throw new TypeError('商店左下区缺少对应预览构造');
    selectionPreview = {...structuredClone(template), runtime_context: {...template.runtime_context,
      ...preview.runtime_context, cursor_hidden: !lower.cursor}, service_preview_state: preview.service_preview_state};
    if (!lower.cursor) {
      delete selectionPreview.selection_cursor;
      delete selectionPreview.selection_cursors;
      delete selectionPreview.retained_selection_cursors;
      delete selectionPreview.menu_highlight;
    }
  }
  const dialoguePreview = source.dialoguePreview ? {...source.dialoguePreview,
    runtime_context: preview.runtime_context, service_preview_state: preview.service_preview_state} : null;
  return {source, preview, lower, contents: {name: preview, list: preview,
    selection: selectionPreview || preview, dialogue: dialoguePreview || preview}};
}

export function genericShopPreviewSnapshot(model, selected, plan, context) {
  return interfacePreviewState({context, entry: model.graph.entry, node: selected.node,
    control: model.graph.nodes.find(node => node.id === selected.node)?.segment?.index ?? null,
    pause: model.graph.nodes.find(node => node.id === selected.node)?.pause,
    fields: plan?.preview.service_preview_state?.values || {},
    windows: Object.entries(plan?.contents || {}).map(([id, content]) => ({id, content,
      cursor: id === 'selection' ? plan.lower?.cursor : null})),
    selections: plan?.preview.service_preview_state?.selection || {},
    domainResults: {framePlan: plan},
    view: {path: selected.path, step: selected.step, objectSelected: selected.objectSelected, mode: 'sample-view'}});
}

export function genericShopRegionSlots(area, region, previews) {
  const overlaps = slot => interfaceBoundsOverlap(slot.bounds, region.bounds);
  const slots = area.slots.filter(overlaps);
  const names = slot => /^submenu-(role|vehicle):/u.test(slot.id) && overlaps(slot);
  if (region.id !== 'selection' || slots.some(names)) return slots;
  const preview = area.preview;
  const menu = previews.find(row => row.interface_state_id === 'field-command-menu.main')
    ?.layers.find(layer => layer.kind === 'layout');
  const lowerLayout = layer => layer.kind === 'layout' && layer.record === menu?.record && layer.shift === menu?.shift;
  if (!preview?.layers.some(layer => lowerLayout(layer) && layer.preserve_glyph_cache_tiles)) return slots;
  for (const stage of [...(preview.glyph_cache_history || [])].reverse()) {
    const inherited = (stage.component_slots || []).filter(names);
    if (inherited.length) return [...slots, ...inherited];
    if (stage.layers.some(layer => lowerLayout(layer) && !layer.preserve_glyph_cache_tiles)) break;
  }
  return slots;
}
