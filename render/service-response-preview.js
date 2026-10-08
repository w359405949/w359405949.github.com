// @editor-module 服务回应的选项与参数取当前正文和全局预览选择。
import {servicePreviewFields, servicePreviewContext} from '../core/service-preview-state.js';
import {db} from '../core/project-db.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {state} from '../core/state.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {storagePreviewEntries} from '../core/storage-preview-entries.js';

export async function resolveServiceResponsePreview(preview, {readCodeField} = {}) {
  if (!preview.service_response) return preview;
  const text = await db.getResourceDocument('text-record', null);
  const context = servicePreviewContext(preview, interfacePreviewContext());
  const codes = await fieldSubmenuCodeValues(['dialogue-prefix-region'], readCodeField);
  const prefixRegion = fieldSubmenuCodeValue(codes, 'dialogue-prefix-region');
  const prefixRecord = `record:${prefixRegion.toString(16).toUpperCase().padStart(2, '0')}:000`;
  const vehicles = preview.shop_menu.mode?.includes('vehicle');
  let nameSelectionIndex = context.role * 2;
  if (vehicles && preview.service_response.parameters.some(binding => binding.value_source?.operation === 'current-shop-actor-name')) {
    const save = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
    const slot = preview.runtime_context?.save_slot ?? context.slot;
    const driver = ['hunter', 'mechanic', 'soldier'].findIndex(role =>
      save.object(`save.slot.${slot}.role.${role}.present`).value
      && save.object(`save.slot.${slot}.role.${role}.current_vehicle`).value === context.vehicle);
    if (driver < 0) throw new TypeError('服务回应缺少所选战车的名称选择');
    nameSelectionIndex = driver * 2;
  }
  let saleItem;
  let storedItem;
  if (preview.shop_menu.stored_item_selection) {
    const save = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
    const entries = storagePreviewEntries(save, preview.runtime_context?.save_slot ?? context.slot,
      {sorted: true});
    const index = preview.runtime_context?.stored_item_index ?? preview.runtime_context?.choice_index ?? 0;
    if (!Number.isInteger(index) || index < 0 || index >= entries.length || !entries[index].id)
      throw new TypeError('保管物回应缺少当前所选物品');
    storedItem = entries[index].id;
    saleItem = storedItem;
  }
  if (!preview.shop_menu.sale_item_bar
      && !preview.shop_menu.stored_item_selection
      && preview.service_response.parameters.some(binding => binding.value_source?.operation === 'current-item-name')) {
    const configuration = await db.getResourceDocument('facility-config');
    const reference = configuration.families.find(row => row.id === preview.service_response.config_family)
      ?.records.find(row => row.id === (preview.runtime_context?.shop_instance ?? 0));
    if (!reference) throw new TypeError('服务回应缺少当前商品配置');
    saleItem = (await db.getField('facility-config', reference.record_id,
      `slot:${preview.runtime_context?.shop_item_index ?? 0}`)).value;
  }
  let confirm = false;
  const layers = preview.layers.map(layer => {
    if (!layer.shop_welcome) return layer;
    const record = text.records[layer.record];
    if (!record) throw new TypeError('服务回应缺少当前正文');
    const inline = record.protected_ranges.some(range => [0xE3, 0xEB].includes(range.token));
    confirm ||= inline;
    return {...layer, inline_confirm: inline,
      continuation_prefix_record: layer.continuation_prefix_record || layer.prefix_record || prefixRecord,
      facility_parameter_context: {...layer.facility_parameter_context,
        saveSlot: preview.runtime_context?.save_slot ?? context.slot,
        role: context.role, vehicle: context.vehicle, ...(saleItem === undefined ? {} : {saleItem}),
        ...(storedItem === undefined ? {} : {storedItem}),
        nameSelectionIndex, nameSelectionKind: vehicles ? 0 : 1}};
  });
  return {...preview, layers, ...(confirm && preview.service_response_keep_selection_cursor && preview.selection_cursor
    && preview.selection_cursor.kind !== 'inline-text-confirm'
    ? {retained_selection_cursors: [...(preview.retained_selection_cursors || []), preview.selection_cursor]} : {}),
    ...(confirm ? {selection_cursor: {
    resource_id: 'selection-layout', kind: 'inline-text-confirm', protocol: 'text-confirmation'}} : {})};
}
