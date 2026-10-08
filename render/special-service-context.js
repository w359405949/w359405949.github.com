// @editor-module 专用服务取得当前字段并复用已发布画面的组件与控件。
import {specialServiceExecution} from './special-service-execution.js';
import {InterfacePreviewSession} from './interface-state-preview.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {facilityRuntimeCodeValues} from '../core/facility-runtime-code-sources.js';
import {genericShopPreview} from './generic-shop-frames.js';

export async function startSpecialServiceExecution(model, selected, dependencies) {
  const read = source => dependencies.readField(source.resource_id, source.entity_handle, source.field);
  const names = {actors: 'shop-actor-selector', service: 'service-list-selector', rental: 'rental-list-selector', lens: 'laser-arrangement-selector'};
  const [raw, items, vehicles, overlays, interfaces, selectionLayout, selectionMovement, selectors, codes] = await Promise.all([
    dependencies.readFields(), dependencies.readDocument('item-entry'), dependencies.readDocument('vehicle-preset'),
    dependencies.readDocument('shared-indexed-byte-overlays'), dependencies.readInterfaces(),
    dependencies.readDocument('selection-layout'), dependencies.readDocument('code-module'),
    fieldSubmenuCodeValues(Object.values(names), read), facilityRuntimeCodeValues(['minor-repair-price',
      'armor-equipment-item-limit', ...Array.from({length: 10}, (_, index) => `chassis-weight-price-${index}`),
      ...Array.from({length: 5}, (_, index) => `chassis-upgrade-weight-${index}`)], read),
  ]);
  const count = model.record.id ? (await dependencies.readField('facility-config', model.record.id, 'payload_length')).value : 0;
  const goods = await Promise.all(Array.from({length: count}, async (_, index) =>
    (await dependencies.readField('facility-config', model.record.id, `slot:${index}`)).value));
  const rows = raw.all(`save.slot.${dependencies.context.slot}.`);
  const adapter = specialServiceExecution({command: model.command, graph: model.graph, text: dependencies.text,
    items, vehicles, overlays, codes, goods, fieldStatuses: Object.fromEntries(rows.map(row => [row.fieldId, row.status])),
    navigation: {catalog: interfaces.application_window_sources, selectionLayout, selectionMovement,
      selectors: Object.fromEntries(Object.entries(names).map(([key, name]) => [key, fieldSubmenuCodeValue(selectors, name)]))}});
  const context = {...dependencies.context,
    activeSaveSlot: raw.find('save.directory.selected_slot')?.value};
  const initial = adapter.initial({fields: Object.fromEntries(rows.map(row => [row.fieldId, structuredClone(row.value)])), context});
  selected.executionAdapter = adapter; selected.previewSession = new InterfacePreviewSession(initial);
  selected.node = initial.node; selected.step = 0; delete selected.restoredPreview;
  return initial;
}

export async function specialServiceFramePlan(model, selected, dependencies) {
  const node = model.graph.nodes.find(row => row.id === selected.node);
  const source = genericShopPreview(node, model.command, model.previews);
  if (!source) return null;
  const execution = selected.executionAdapter && selected.path ? selected.previewSession.state : null;
  let preview = source.preview;
  if (node.pause.kind === 'choice') preview.selection_cursor = {
    resource_id: 'selection-layout', kind: 'inline-text-confirm', protocol: 'text-confirmation'};
  if (execution) {
    const e = execution.execution;
    preview.runtime_context = {...preview.runtime_context, save_slot: execution.context.slot,
      role_slot: execution.context.role, vehicle_slot: execution.context.vehicle, shop_instance: selected.instance,
      choice_index: execution.selections.choice, list_choice_index: execution.selections.choice,
      shop_item_index: e.rentalChoice ?? 0, upgrade_kind: e.project, upgrade_part: e.hole,
      service_amount: execution.context.service_amount,
      service_part: e.weapon, lens_arrangement: e.arrangement, laser_item: e.item};
    preview.service_preview_state = {values: execution.fields, selection: execution.context,
      terminal: {service_amount: execution.context.service_amount, repair_part: e.weapon,
        upgrade_kind: e.project, upgrade_part: e.hole}, conditions: []};
  } else preview = await dependencies.resolveConditions(preview);
  preview = await dependencies.resolveMenu(preview);
  if (execution?.pause?.kind === 'menu') execution.execution.menuSelector = preview.selection_cursor?.selector;
  if (execution?.execution.arrangement) preview.layers = preview.layers.map(layer =>
    layer.kind === 'laser_lens_runtime' ? {...layer,
      slots: execution.execution.arrangement.flatMap((id, index) => id ? [index] : [])} : layer);
  return {source, preview, lower: null, contents: Object.fromEntries(node.regions.map(region => [region.id, preview]))};
}
