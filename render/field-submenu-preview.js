// @editor-module 下级菜单名称由当前存档字段提供，文字位置沿用已确认的构造调用。
import {servicePreviewFields, servicePreviewContext} from '../core/service-preview-state.js';
import {state} from '../core/state.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {db} from '../core/project-db.js';
import {currentTextReference} from '../core/resource-index.js';
import {vehicleWeightProviderScript} from '../views/status-ui.js';
import {wantedBountyForTarget} from '../views/wanted-preview.js';
import {selectionLayoutFieldOwner, selectionCursorCoordinates} from '../core/selection-layout-owner.js';
import {vehicleStatusParts, vehicleStatusPartArtForSelector} from '../modules/vehicle/components.js';
import {saveVehicleMenuInitialValues} from '../core/save-codec.js';
import {interfaceTextSlot, interfaceItemSlotProviders,
  interfaceItemProviders, interfaceRecordProviders} from './interface-slots.js';
import {interfacePreviewItemValue, registerInterfacePreviewItem} from '../core/interface-preview-items.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {roleEquipmentStats, roleEquipmentComparison} from '../core/role-equipment-derived.js';
import {itemEquipmentValues} from '../core/item-equipment-values.js';
import {textRecordNodeId} from '../core/text-record-project.js';

import {uiTileRectangleServiceFieldOwner, textRenderRuntimeFieldOwner} from '../core/field-ui-block-owners.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue, DIALOGUE_CODE_PARAMETER_NAMES,
  dialogueRuntimeParameters} from '../core/field-submenu-code-sources.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];
const PARTS = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'];
const CATEGORIES = ['tank-main-gun', 'tank-sub-gun', 'tank-special', 'tank-c-unit', 'tank-engine', 'tank-chassis'];

export function fieldSubmenuComponentRecords(preview) {
  const records = new Set(preview.component_records || []);
  for (const layer of preview.layers || []) {
    if (layer.mode_settings) for (const record of ['record:08:032', 'record:08:033']) records.add(record);
  }
  return [...records];
}

export async function resolveFieldSubmenuPreview(preview, {readCodeField} = {}) {
  if (!preview.layers?.some(layer => ['window_clear', 'field_cache_window'].includes(layer.kind) || layer.save_party_names || layer.provider_save_names
      || layer.provider_save_values || layer.save_equipment || layer.gold_bell_digits || layer.armor_amount
      || layer.repair_components || layer.vehicle_mount_candidates || layer.party_vehicle_sp
      || layer.human_equipment_stats || layer.human_equipment_comparison || layer.dialogue_runtime)
      && !preview.field_submenu_vehicle && !preview.field_overview && !preview.menu_highlight
      && !preview.mode_settings && !preview.field_use_result && !preview.fax_destinations
      && !preview.wanted_defeat_history) return preview;
  preview = {...preview, component_slots: [...(preview.component_slots || [])]};
  const componentRecords = new Set(preview.component_records || []);
  const vehicleCode = preview.field_submenu_vehicle ? await fieldSubmenuCodeValues([
    'storage-condition-record-base', 'vehicle-category-text-region', 'vehicle-condition-text-region', 'shell-provider-text-region',
    'weight-sign-record-negative', 'weight-sign-text-region', 'service-list-row-step',
    'shell-weapon-row-record', 'shell-weapon-row-origin', 'wanted-intelligence-text-region',
    'service-weapon-row-record', 'service-weapon-row-origin'], readCodeField) : null;
  const vehicleValue = name => fieldSubmenuCodeValue(vehicleCode, name);
  const categoryRegion = vehicleCode ? vehicleValue('vehicle-category-text-region') : null;
  const conditionRegion = vehicleCode ? vehicleValue('vehicle-condition-text-region') : null;
  const conditionBase = vehicleCode ? vehicleValue('storage-condition-record-base') : null;
  const shellRegion = vehicleCode ? vehicleValue('shell-provider-text-region') : null;
  for (const layer of preview.layers) {
    if (layer.vehicle_part_detail) for (const record of ['record:02:067', 'record:02:068']) componentRecords.add(record);
    if (layer.vehicle_status_items || layer.vehicle_mount_candidates) {
      [...(layer.vehicle_status_items ? CATEGORIES.keys() : [0, 1, 2])]
        .forEach(id => componentRecords.add(textRecordNodeId(categoryRegion, id)));
      if (layer.vehicle_status_items) for (let index = 0; index < 3; index++)
        componentRecords.add(textRecordNodeId(conditionRegion, conditionBase + index));
    }
    if (layer.vehicle_shells) for (let id = 0; id < 14; id++) componentRecords.add(textRecordNodeId(shellRegion, id));
    if (layer.vehicle_shell_weapons) for (let id = vehicleValue('shell-weapon-row-record') - 1;
      id <= vehicleValue('shell-weapon-row-record'); id++) componentRecords.add(
        textRecordNodeId(vehicleValue('wanted-intelligence-text-region'), id));
  }
  if (preview.vehicle_investigation === true) {
    const values = await fieldSubmenuCodeValues(['investigation-vehicle-record', 'field-item-text-region'], readCodeField);
    const record = `record:${fieldSubmenuCodeValue(values, 'field-item-text-region').toString(16).toUpperCase().padStart(2, '0')}:${String(fieldSubmenuCodeValue(values, 'investigation-vehicle-record')).padStart(3, '0')}`;
    preview.layers = preview.layers.map(layer => {
      if (!layer.dialogue_runtime) return layer;
      const providers = interfaceRecordProviders({record}, [0xE8, 0xFC, 0xFD]);
      if (providers.length !== 1) throw new TypeError('战车调查缺少姓名提供器构造');
      return {...layer, record, provider_save_names: {
        [providers[0]]: Object.values(layer.provider_save_names)[0]}};
    });
  }
  if (preview.field_overview || preview.layers.some(layer => layer.save_party_names || layer.provider_save_names)) {
    const values = await fieldSubmenuCodeValues(['provider-pointer-low', 'provider-pointer-high'], readCodeField);
    const address = fieldSubmenuCodeValue(values, 'provider-pointer-low')
      | fieldSubmenuCodeValue(values, 'provider-pointer-high') << 8;
    if (address !== 0x051D) throw new TypeError('姓名提供器地址缺少已发布的存档映射');
  }
  const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
  const equipmentMarkers = preview.layers.some(layer => Array.isArray(layer.save_equipment?.items))
    ? await fieldSubmenuCodeValues(PARTS.slice(0, 6).map((_, index) =>
      `shop-equipment-category-marker-${index + 6}`), readCodeField) : null;
  const dialogue = preview.layers.some(layer => layer.dialogue_runtime)
    ? dialogueRuntimeParameters(await fieldSubmenuCodeValues(DIALOGUE_CODE_PARAMETER_NAMES, readCodeField)) : null;
  const dialogueOrigin = preview.layers.some(layer => layer.dialogue_common_origin)
    ? await fieldSubmenuCodeValues(['menu-text-origin-low', 'menu-text-origin-high'], readCodeField) : null;
  let storyDialogue = null;
  if (preview.story_dialogue_source) {
    const source = preview.story_dialogue_source;
    const bytecode = (await db.getField(source.resource_id, source.entity_handle, source.field)).value;
    const offset = source.command_offset;
    if (bytecode[offset] !== 0x02 || bytecode[offset + 2] !== 0x37)
      throw new TypeError('遭遇前对话缺少已确认的脚本分支');
    const values = await fieldSubmenuCodeValues(['story-dialogue-region-02'], readCodeField);
    const region = fieldSubmenuCodeValue(values, 'story-dialogue-region-02');
    storyDialogue = `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(bytecode[offset + 1]).padStart(3, '0')}`;
  }
  const slot = Number(preview.runtime_context?.save_slot ?? 1);
  const prefix = `save.slot.${slot}`;
  const hasModeSettings = preview.mode_settings || preview.layers.some(layer => layer.mode_settings);
  const modeSettings = hasModeSettings ? fields.object(`${prefix}.adventure_data_settings`).value : null;
  const modeOrigin = hasModeSettings ? await fieldSubmenuCodeValues(
    ['submenu-text-origin', 'menu-text-origin-low', 'menu-text-origin-high'], readCodeField) : null;
  const goldResult = preview.layers.some(layer => layer.gold_bell_result)
    ? await fieldSubmenuCodeValues(['service-money-result-record', 'field-item-text-region'], readCodeField) : null;
  const resultValues = preview.field_use_result || preview.layers.some(layer => layer.field_use_result) ? await fieldSubmenuCodeValues(
    ['field-item-result-origin', 'field-item-repair-skill-threshold', 'field-item-repair-failure-record',
      'menu-text-origin-low', 'menu-text-origin-high'], readCodeField) : null;
  const equipmentResult = preview.layers.some(layer => layer.human_equipment_result)
    ? await fieldSubmenuCodeValues(['human-equipment-result-record', 'field-item-text-region',
      'field-item-result-origin', 'menu-text-origin-low', 'menu-text-origin-high'], readCodeField) : null;
  const historyValues = preview.wanted_defeat_history ? await fieldSubmenuCodeValues(
    ['defeat-history-origin', 'full-screen-text-origin-low', 'full-screen-text-origin-high',
      'wanted-history-first-target', 'wanted-history-row-record', 'wanted-history-claim-base',
      'wanted-history-target-limit', 'field-item-text-region', 'wanted-name-text-region', 'service-list-row-step'], readCodeField) : null;
  const historyOrigin = historyValues ? fieldSubmenuCodeValue(historyValues, 'defeat-history-origin')
    + fieldSubmenuCodeValue(historyValues, 'full-screen-text-origin-low')
    + (fieldSubmenuCodeValue(historyValues, 'full-screen-text-origin-high') - 0x60) * 256 : null;
  if (preview.field_use_result) {
    const role = ROLES[preview.runtime_context?.actor ?? 0];
    const index = preview.runtime_context?.inventory_index ?? 0;
    const itemId = fields.object(`${prefix}.role.${role}.inventory`).value[index];
    const item = await db.get(`item:${itemId.toString(16).toUpperCase().padStart(2, '0')}`, null);
    if (item?.use_effect?.handler?.prg_offset !== preview.field_use_result.handler_prg_offset
        || role === 'mechanic' || fields.object(`${prefix}.role.${role}.repair_skill`).value
          >= fieldSubmenuCodeValue(resultValues, 'field-item-repair-skill-threshold'))
      throw new TypeError('工具结果缺少当前分支的构造来源');
  }
  const ammoCodes = preview.layers.some(layer => layer.vehicle_shell_weapons)
    ? await db.getResourceDocument('shared-indexed-byte-overlays', null) : null;
  const ammoPool = preview.layers.some(layer => layer.service_ammunition_weapons)
    ? await fieldSubmenuCodeValues(['supply-weapon-first-glyph', 'supply-weapon-next-glyph',
      'supply-weapon-infinite-glyph'], readCodeField) : null;
  const vehicle = preview.field_submenu_vehicle?.current_context
    ? {...preview.field_submenu_vehicle, vehicle: servicePreviewContext(preview, interfacePreviewContext()).vehicle}
    : preview.field_submenu_vehicle;
  const initialInputs = vehicle?.preset_id == null ? null : await Promise.all([
    db.getResourceDocument('vehicle-preset', null), db.getResourceDocument('item-entry', null),
    db.getResourceDocument('shared-indexed-byte-overlays', null), db.getResourceDocument('save-vehicle', null),
  ]);
  const initial = initialInputs ? saveVehicleMenuInitialValues(vehicle.preset_id, {
    vehicles: initialInputs[0], items: initialInputs[1], overlays: initialInputs[2], saveVehicles: initialInputs[3],
  }) : null;
  const vehiclePath = vehicle ? `${prefix}.vehicle.${vehicle.vehicle}` : null;
  const valueOf = fieldId => interfacePreviewItemValue(preview, fieldId,
    initial && fieldId.startsWith(`${vehiclePath}.`)
      ? initial[fieldId.slice(vehiclePath.length + 1)] : fields.object(fieldId).value);
  const selection = preview.menu_highlight || preview.retained_selection_cursors?.length
    || preview.layers.some(layer => layer.repair_components)
    ? await db.getResourceDocument('selection-layout', null) : null;
  const mountItems = preview.layers.some(layer => layer.vehicle_mount_candidates)
    ? await db.getResourceDocument('item-entry', null) : null;
  const statusParts = preview.layers.some(layer => layer.kind === 'vehicle_status_parts')
    ? await db.getResourceDocument('ui-vehicle-status', null) : null;
  const roleStatus = preview.layers.some(layer => layer.record === 'record:03:014')
    ? await db.getResourceDocument('ui-role-status') : null;
  const statusWords = preview.layers.some(layer => layer.party_vehicle_sp)
    ? await db.getResourceDocument('fixed-text-slot', null) : null;
  const equipmentRoles = new Map();
  for (const layer of preview.layers) {
    const path = layer.human_equipment_stats || layer.human_equipment_comparison;
    if (!path || equipmentRoles.has(path)) continue;
    const role = Object.fromEntries(['strength', 'speed', 'vitality', 'equipment', 'slot_flags']
      .map(field => [field, valueOf(`${path}.${field}`)]));
    const {items, itemValue} = await itemEquipmentValues([...role.equipment], db);
    equipmentRoles.set(path, {role, items, itemValue, stats: roleEquipmentStats(role, itemValue)});
  }
  let vehicleValues = null;
  const detailCodes = preview.layers.some(layer => layer.vehicle_part_detail)
    ? await db.getResourceDocument('shared-indexed-byte-overlays', null) : null;
  const detailValues = detailCodes ? await fieldSubmenuCodeValues(['vehicle-part-detail-frame',
    'vehicle-part-detail-body', 'vehicle-part-detail-clear-selector', 'vehicle-part-detail-clear-low',
    'vehicle-part-detail-clear-high', 'vehicle-part-detail-clear-width', 'vehicle-part-detail-clear-rows',
    'shell-name-text-region', 'field-item-text-region', 'runtime-action-record-region',
    'shop-tank-target-record-base'], readCodeField) : null;
  const detailValue = name => fieldSubmenuCodeValue(detailValues, name);
  if (vehicle) {
    const path = vehiclePath;
    const indices = (initial ? PARTS.slice(0, 6) : PARTS).map((part, index) => index)
      .filter(index => valueOf(`${path}.equipment.${PARTS[index]}`));
    const ids = indices.map(index => valueOf(`${path}.equipment.${PARTS[index]}`));
    const items = await Promise.all(ids.map(id => db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null)));
    if (items.some(item => !item?.name_source)) throw new TypeError('战车携带物缺少文字来源');
    const selected = items[preview.runtime_context?.equipment_index ?? 0];
    const total = valueOf(`${path}.chassis_weight`) + valueOf(`${path}.sp`)
      + items.reduce((sum, item) => sum + (item.tank_weight?.internal_units ?? 0), 0);
    const engineId = valueOf(`${path}.equipment.engine`);
    const engine = items.find(item => item.id === engineId);
    const capacity = valueOf(`${path}.equipped.engine`) ? engine?.engine_capacity?.internal_units ?? 0 : 0;
    const weight = total - (vehicle.subtract_selected === false ? 0 : selected?.tank_weight?.internal_units ?? 0);
    vehicleValues = {path, selected, weight, capacity, indices, ids, items,
      sp: valueOf(`${path}.sp`)};
  }
  const nameLayer = (layer, fieldId, cursor) => {
    const field = fields.object(fieldId);
    return {...layer, save_party_names: null, cursor,
      provider_scripts: {}, provider_script_hex: {7:
        fixedRuntimeTextScriptHex(saveNameTextSource(field, field.value))}};
  };
  const layers = preview.layers.flatMap(original => {
    const layer = interfaceItemSlotProviders({...original});
    if (layer.wanted_history_header) layer.cursor = historyOrigin;
    if (layer.story_dialogue) layer.record = storyDialogue;
    if (layer.field_use_result) {
      const read = name => fieldSubmenuCodeValue(resultValues, name);
      layer.record = layer.field_result_record || `record:02:${String(read('field-item-repair-failure-record')).padStart(3, '0')}`;
      layer.cursor = read('field-item-result-origin') + read('menu-text-origin-low')
        + (read('menu-text-origin-high') - 0x60) * 256;
    }
    if (layer.human_equipment_result) {
      const read = name => fieldSubmenuCodeValue(equipmentResult, name);
      const flags = fields.object(layer.human_equipment_result).value;
      const index = preview.runtime_context?.equipment_index ?? 0;
      const record = read('human-equipment-result-record') + Number(!(flags & (0x80 >> index)));
      layer.record = `record:${read('field-item-text-region').toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`;
      layer.cursor = read('field-item-result-origin') + read('menu-text-origin-low')
        + (read('menu-text-origin-high') - 0x60) * 256;
    }
    if (layer.mode_settings) {
      const read = name => fieldSubmenuCodeValue(modeOrigin, name);
      layer.cursor = read('submenu-text-origin') + read('menu-text-origin-low')
        + (read('menu-text-origin-high') - 0x60) * 256;
      layer.provider_constants = {29: (modeSettings & 7) + 1};
      layer.provider_record_pairs = {15: {region: 8, record: 32 + Number(Boolean(modeSettings & 0x40))}};
      layer.runtime_record_pair = {region: 8, record: 32 + Number(Boolean(modeSettings & 0x20))};
    }
    if (layer.gold_bell_result) layer.record = textRecordNodeId(
      fieldSubmenuCodeValue(goldResult, 'field-item-text-region'), fieldSubmenuCodeValue(goldResult, 'service-money-result-record'));
    if (layer.dialogue_runtime) Object.assign(layer, {dialogue_runtime: dialogue,
      frame_counter: preview.runtime_context?.frame_counter,
      confirmed_waits: layer.record_calls ? layer.confirmed_waits
        : layer.dialogue_history ? Infinity : preview.runtime_context?.confirmed_waits ?? Infinity,
      confirm_input: preview.runtime_context?.confirm_input ?? dialogue.wait.input_mask});
    if (layer.dialogue_common_origin) {
      layer.cursor = dialogue.text_origin + fieldSubmenuCodeValue(dialogueOrigin, 'menu-text-origin-low')
        + (fieldSubmenuCodeValue(dialogueOrigin, 'menu-text-origin-high') - 0x60) * 256;
      layer.line_origin = dialogue.line_origin;
      layer.prefix_record = `record:${dialogue.prefix_region.toString(16).toUpperCase().padStart(2, '0')}:${String(layer.dialogue_prefix).padStart(3, '0')}`;
    }
    for (const [provider, fieldId] of Object.entries(layer.provider_save_names || {})) {
      const field = initial && fieldId === `${vehiclePath}.name_codes` ? null : fields.object(fieldId);
      layer.provider_script_hex = {...layer.provider_script_hex, [provider]:
        fixedRuntimeTextScriptHex(field ? saveNameTextSource(field, field.value) : initial.name_source)};
    }
    if (roleStatus && layer.record === 'record:03:014') {
      const current = layer.provider_save_values?.[22];
      const match = current?.match(/\.role\.(hunter|mechanic|soldier)\.experience$/u);
      if (match) {
        const index = ROLES.indexOf(match[1]);
        const offset = roleStatus.blocks.find(block => block.id === 'experience-offset-table').values[index];
        layer.provider_save_values = {...layer.provider_save_values, 22:
          current.replace(`.role.${match[1]}.`, `.role.${ROLES[offset / 3]}.`)};
      }
    }
    for (const [provider, fieldId] of Object.entries(layer.provider_save_values || {}))
      layer.provider_constants = {...layer.provider_constants, [provider]: valueOf(fieldId)};
    if (layer.human_equipment_stats) {
      const {stats} = equipmentRoles.get(layer.human_equipment_stats);
      layer.provider_constants = {...layer.provider_constants, 37: stats.attack, 38: stats.defense};
    }
    if (layer.gold_bell_digits) {
      const threshold = fields.object(layer.gold_bell_digits).value;
      const digits = layer.gold_bell_digit_values ?? String(threshold).padStart(7, '0').split('').map(Number);
      if (digits.length !== 7) throw new TypeError('金铃阈值超出七位数字范围');
      layer.provider_constants = {...layer.provider_constants,
        ...Object.fromEntries([29, 30, 31, 60, 32, 33, 34].map((provider, index) => [provider, digits[index]]))};
    }
    if (layer.armor_amount) {
      const current = valueOf(layer.armor_amount.field_id);
      const amount = preview.runtime_context?.armor_value ?? (preview.menu_application?.kind === 'armor'
        ? Math.max(0, current - 1) : current);
      if (!Number.isInteger(amount) || amount < 0 || amount > current)
        throw new TypeError('装甲瓦片数量超出当前存档范围');
      if (preview.menu_application?.kind === 'armor') preview.menu_application = {...preview.menu_application,
        sp: current, remaining_sp: amount, removed_sp: current - amount};
      layer.provider_constants = {...layer.provider_constants,
        [layer.armor_amount.provider]: layer.armor_amount.removed ? current - amount : amount};
    }
    if (layer.human_equipment_comparison) {
      const {role, items, itemValue, stats} = equipmentRoles.get(layer.human_equipment_comparison);
      const values = roleEquipmentComparison(role, items,
        preview.runtime_context?.equipment_index ?? preview.runtime_context?.choice_index ?? 0, itemValue, stats);
      if (!values) return [{...layer, kind: 'empty'}];
      layer.provider_constants = {...layer.provider_constants, 35: values.attack, 36: values.defense};
    }
    if (layer.save_equipment) {
      const ids = layer.save_equipment.items;
      const equipment = Array.isArray(ids) ? ids.map(valueOf) : valueOf(ids);
      const flags = fields.object(layer.save_equipment.flags).value;
      const indices = [...equipment].map((_, index) => index)
        .filter(index => !layer.save_equipment.pack_nonzero || equipment[index]);
      layer.equipment_slots = {...layer.equipment_slots,
        values: indices.map(index => ({item_id: equipment[index]})),
        ...(Array.isArray(ids) ? {marker_objects: indices.map((index, packed) => {
          const assigned = layer.preview_equipment_assignments ? layer.preview_equipment_assignments[packed] : index;
          if (assigned == null || !(flags & (0x80 >> index)) && !layer.preview_equipment_assignments) return null;
          if (assigned >= 6) throw new TypeError('后备携带位的装备标记未确认');
          return fieldSubmenuCodeValue(equipmentMarkers, `shop-equipment-category-marker-${assigned + 6}`);
        })} : {}),
        flags: Object.fromEntries(indices.map((source, index) =>
          [`slot_${index}`, layer.preview_equipment_assignments
            ? layer.preview_equipment_assignments[index] != null : Boolean(flags & (0x80 >> source))]))};
    }
    if (layer.vehicle_equipment_statistics) layer.provider_constants = {
      ...layer.provider_constants, 37: vehicleValues.selected?.attack?.value ?? 0,
      38: vehicleValues.selected?.defense?.value ?? 0};
    if (layer.vehicle_part_detail_frame) layer.record = textRecordNodeId(
      detailValue('shell-name-text-region'), detailValue('vehicle-part-detail-frame'));
    if (layer.kind === 'vehicle_part_detail_clear') {
      if (detailValue('vehicle-part-detail-clear-selector') !== 0x26)
        throw new TypeError('部件详情清除选择量未确认');
      const origin = (detailValue('vehicle-part-detail-clear-low')
        | detailValue('vehicle-part-detail-clear-high') << 8) - 0x6000;
      return [{...layer, kind: 'tile_fill', x: origin & 31, y: origin >> 5,
        width: detailValue('vehicle-part-detail-clear-width'), height: detailValue('vehicle-part-detail-clear-rows'), tile: 0xFF}];
    }
    if (layer.vehicle_part_detail) {
      const item = vehicleValues.selected, chassis = item.id >= 0x91;
      const capacityCode = item.equipment?.raw_flags & 7;
      layer.record = textRecordNodeId(detailValue('shell-name-text-region'), detailValue('vehicle-part-detail-body'));
      layer.records = [{id: 'vehicle-part-detail-empty', raw_hex: '9F'}];
      layer.provider_records = {18: chassis || item.id < 0x75
        ? textRecordNodeId(detailValue('field-item-text-region'), capacityCode === 7 && !chassis ? 68 : 67)
        : 'vehicle-part-detail-empty', ...(item.id < 0x75 ? {} : {20: 'vehicle-part-detail-empty'})};
      if (item.id < 0x75) layer.provider_record_pairs = {20: {
        region: detailValue('runtime-action-record-region'),
        record: detailValue('shop-tank-target-record-base') + ((item.equipment.raw_flags & 0x18) >> 3)}};
      layer.provider_constants = {
        17: chassis ? valueOf(`${vehicleValues.path}.ammo_capacity`) : detailCodes.level_value_codebook[capacityCode],
        58: item.id < 0x75 ? item.attack?.value ?? 0 : 0,
        53: chassis ? valueOf(`${vehicleValues.path}.defense`) : item.defense?.value ?? 0};
      layer.provider_script_hex = {54: vehicleWeightProviderScript(chassis
        ? valueOf(`${vehicleValues.path}.chassis_weight`) : item.tank_weight.internal_units)};
    }
    if (layer.vehicle_transfer_weight) {
      const difference = vehicleValues.capacity - vehicleValues.weight;
      const providers = interfaceRecordProviders(layer, [0xFC, 0xFD]);
      const signs = interfaceRecordProviders(layer, [0xFA, 0xFB]);
      if (providers.length !== 3 || signs.length !== 1) throw new TypeError('战车重量缺少提供器构造');
      layer.provider_script_hex = {
        ...layer.provider_script_hex, ...Object.fromEntries(providers.map((provider, index) =>
          [provider, vehicleWeightProviderScript([vehicleValues.weight, vehicleValues.capacity, Math.abs(difference)][index])]))};
      layer.provider_record_pairs = {...layer.provider_record_pairs, [signs[0]]:
        {region: vehicleValue('weight-sign-text-region'), record: vehicleValue('weight-sign-record-negative') - Number(difference >= 0)}};
    }
    if (layer.vehicle_status_heading) layer.provider_constants = {
      ...layer.provider_constants, ...Object.fromEntries(interfaceRecordProviders(layer, [0xF8, 0xF9])
        .map((provider, index) => [provider, [vehicleValues.sp,
          vehicleValues.sp + Math.max(0, vehicleValues.capacity - vehicleValues.weight)][index]]))};
    if (layer.vehicle_status_items) {
      const itemProviders = interfaceItemProviders(layer);
      const categoryProviders = layer.vehicle_status_items === 'names'
        ? interfaceRecordProviders(layer, [0xFA, 0xFB]).filter((_, index) => !(index % 2)) : [];
      const weightProviders = layer.vehicle_status_items === 'names' ? []
        : interfaceRecordProviders(layer, [0xFC, 0xFD]);
      layer.provider_record_pairs = {};
      layer.provider_script_hex = {};
      layer.records = [];
      layer.provider_records = {};
      const indices = [...vehicleValues.indices,
        ...PARTS.map((_, index) => index).filter(index => !vehicleValues.indices.includes(index))];
      indices.forEach((sourceIndex, index) => {
        const source = `${vehicleValues.path}.equipment.${PARTS[sourceIndex]}`;
        registerInterfacePreviewItem(preview, `vehicle-carry:${index}`, source, valueOf(source) ?? 0);
      });
      vehicleValues.items.forEach((item, index) => {
        if (layer.vehicle_status_items === 'names') {
          const id = `vehicle-status-name:${index}`;
          layer.records.push({id, raw_hex: fixedRuntimeTextScriptHex(item.name_source)});
          layer.provider_records[itemProviders[index]] = id;
          const column = vehicleValues.indices[index];
          if (valueOf(`${vehicleValues.path}.equipped_mask_raw`) & (0x80 >> column))
            layer.provider_record_pairs[categoryProviders[index]] = {region: categoryRegion, record: column};
        } else {
          const part = PARTS[vehicleValues.indices[index]];
          const condition = valueOf(`${vehicleValues.path}.equipment_state.${part}`);
          layer.provider_record_pairs[itemProviders[index]] = {region: conditionRegion,
            record: conditionBase + Number(Boolean(condition & 0x80)) + Number(Boolean(condition & 0x40))};
          const weight = part === 'chassis' ? valueOf(`${vehicleValues.path}.chassis_weight`)
            : item.tank_weight?.internal_units;
          if (!Number.isInteger(weight)) throw new TypeError('战车详情缺少部件重量');
          layer.provider_script_hex[weightProviders[index]] = vehicleWeightProviderScript(weight);
        }
      });
    }
    if (layer.kind === 'vehicle_portrait' && vehicle?.page === 'status') {
      const chassis = valueOf(`${vehicleValues.path}.equipment.chassis`);
      layer.chassis_id = chassis;
    }
    if (layer.kind === 'vehicle_status_parts') {
      const chassis = valueOf(`${vehicleValues.path}.equipment.chassis`);
      const mask = valueOf(`${vehicleValues.path}.equipped_mask_raw`);
      const parts = PARTS.slice(0, 5).flatMap((part, column) => vehicleStatusParts(statusParts, chassis, mask,
        valueOf(`${vehicleValues.path}.equipment_state.${part}`))
        .filter(row => row.physical_column === column));
      return [{...layer, parts, document: statusParts}];
    }
    if (layer.vehicle_shells) {
      const itemProviders = interfaceItemProviders(layer);
      const numberProviders = interfaceRecordProviders(layer, [0xF8, 0xF9]);
      const path = vehicleValues.path;
      const counts = Array.from({length: 6}, (_, index) => valueOf(`${path}.shell_count.${index}`));
      counts.forEach((count, index) => registerInterfacePreviewItem(preview, `vehicle-shell:${index}`,
        `${path}.shell_type.${index}`, count ? valueOf(`${path}.shell_type.${index}`) : 255,
        null, {countSource: `${path}.shell_count.${index}`, count}));
      layer.provider_constants = {[numberProviders[0]]: counts.reduce((sum, count) => sum + count, 0),
        [numberProviders[1]]: valueOf(`${path}.ammo_capacity`),
        ...Object.fromEntries(numberProviders.slice(2).map((provider, index) => [provider, counts[index]]))};
      layer.provider_record_pairs = Object.fromEntries(counts.map((count, index) => {
        const type = valueOf(`${path}.shell_type.${index}`);
        return count && type < 14 ? [itemProviders[index], {region: shellRegion, record: type}] : null;
      }).filter(Boolean));
    }
    if (layer.vehicle_shell_weapons) {
      const rowStep = vehicleValue('service-list-row-step');
      const origin = vehicleValue(layer.service_ammunition_weapons ? 'service-weapon-row-origin' : 'shell-weapon-row-origin');
      const recordBase = vehicleValue(layer.service_ammunition_weapons ? 'service-weapon-row-record' : 'shell-weapon-row-record');
      const rowRecord = finite => textRecordNodeId(vehicleValue('wanted-intelligence-text-region'), recordBase - Number(finite));
      for (let column = 0; column < 3; column++) preview.component_slots.push(
        interfaceTextSlot(`shell-weapon:${column}`, `武器 ${column + 1}`, origin + rowStep * column,
          {width: 136, sourceRecord: layer.record}));
      let ammunitionRow = 0;
      return vehicleValues.items.flatMap((item, index) => {
        const column = vehicleValues.indices[index];
        if (layer.service_ammunition_weapons ? item.id >= 0x75
          : column >= 3 || !valueOf(`${vehicleValues.path}.equipped.${PARTS[column]}`)) return [];
        const current = valueOf(`${vehicleValues.path}.equipment_state.${PARTS[column]}`) & 0x3F;
        const code = item.equipment?.raw_flags & 7;
        const maximum = code === 7 ? ammoCodes.zero_prefixed_ascending_bit_masks[0]
          : ammoCodes.level_value_codebook[code];
        if (!Number.isInteger(maximum)) throw new TypeError('弹仓武器缺少弹数属性');
        const row = layer.service_ammunition_weapons ? ammunitionRow++ : column;
        const record = rowRecord(layer.service_ammunition_weapons ? item.id < 0x65 : item.category.id !== 'tank-sub-gun');
        const names = interfaceRecordProviders({record}, [0xFA, 0xFB]);
        const numbers = interfaceRecordProviders({record}, [0xF8, 0xF9]);
        const nameProvider = names.at(-1);
        return [{...layer, record, cursor: origin + rowStep * row,
          ...(ammoPool ? {inline_glyph_pool_reset: {lead: 0x2F, pool: 1,
            value: fieldSubmenuCodeValue(ammoPool, item.id >= 0x65 ? 'supply-weapon-infinite-glyph'
              : row % 4 ? 'supply-weapon-next-glyph' : 'supply-weapon-first-glyph')}} : {}),
          records: [{id: `shell-weapon:${column}`,
          raw_hex: fixedRuntimeTextScriptHex(item.name_source)}], provider_records: {[nameProvider]: `shell-weapon:${column}`},
          provider_constants: Object.fromEntries(numbers.map((provider, index) => [provider, [current, maximum][index]])),
          ...(layer.service_ammunition_weapons ? {provider_record_pairs: {[names[0]]: {region: categoryRegion,
            record: column < 6 && valueOf(`${vehicleValues.path}.equipped.${PARTS[column]}`) ? column : 255}}} : {})}];
      });
    }
    if (layer.repair_components) {
      const path = `${prefix}.vehicle.${layer.repair_components.vehicle}`;
      return PARTS.slice(0, 6).flatMap((part, index) => {
        const point = selectionCursorCoordinates(selection, preview.selection_cursor, index);
        preview.component_slots.push({id: `repair-part:${index}`, label: `部件 ${index + 1}`,
          bounds: {x: point.x + 16, y: point.y + 1, width: 8, height: 8}});
        const condition = fields.object(`${path}.equipment_state.${part}`).value;
        if (!fields.object(`${path}.equipped.${part}`).value
            || Number(Boolean(condition & 0x80)) + Number(Boolean(condition & 0x40)) !== 1) return [];
        return [{kind: 'generic_metasprite', object_id: '0x2F', anchor_x: point.x + 16,
          anchor_y: point.y, oam_y_bias: 1, pattern_profiles: ['sprite-chr:27-40-7F']}];
      });
    }
    if (layer.vehicle_mount_candidates) {
      for (let row = 0; row < 3; row++) preview.component_slots.push(
        interfaceTextSlot(`mount-part:${row}`, `部件 ${row + 1}`, 654 + row * 64,
          {width: 128, sourceRecord: layer.record}));
      const path = `${prefix}.vehicle.${layer.vehicle_mount_candidates.vehicle}`;
      const index = preview.runtime_context?.equipment_index ?? 0;
      const ids = PARTS.map(part => fields.object(`${path}.equipment.${part}`).value).filter(Boolean);
      const item = mountItems?.records?.find(row => row.id === ids[index]);
      if (!ids.length) return [];
      if (!item?.mountable_slots) throw new TypeError('挂载选择缺少物品挂载语义');
      const candidates = PARTS.slice(0, 3).filter(part => item.mountable_slots.includes(part)
        && fields.object(`${path}.mount_permission.${part}`).value);
      const assignments = layer.vehicle_mount_candidates.assignments;
      return candidates.map((part, row) => ({...layer, cursor: 654 + row * 64,
        provider_record_pairs: {41: {region: 8, record: PARTS.indexOf(part)},
          42: {region: 0, record: assignments ? assignments.find(item => item.part === part)?.id ?? 255
            : fields.object(`${path}.equipped.${part}`).value ? fields.object(`${path}.equipment.${part}`).value : 255}}}));
    }
    if (layer.party_vehicle_sp) {
      for (let index = 0; index < 4; index++) preview.component_slots.push(
        interfaceTextSlot(`submenu-vehicle:${index}`, `战车 ${index + 1}`, 662 + 64 * index,
          {width: 88, sourceRecord: layer.record}));
      return [...fields.object(`${prefix}.entity_scene_object_slots`).value].slice(0, 4)
        .flatMap((vehicle, index) => {
          if (vehicle >= 0x80 || vehicle === 0x24) return [];
          const condition = fields.object(`${prefix}.vehicle.${vehicle}.condition_raw`).value;
          const word = condition ? 10 + Math.floor(Math.log2(condition)) : 9;
          const id = `vehicle-status-word:${index}`;
          const source = statusWords.slots[`ui-status:${word.toString(16).toUpperCase().padStart(2, '0')}`];
          const cursor = 662 + 64 * index;
          return [{...layer, cursor, provider_constants: {10: fields.object(`${prefix}.vehicle.${vehicle}.sp`).value}},
            {kind: 'script', record: id, cursor, glyph_pixel_y_offset: -4,
              records: [{id, raw_hex: fixedRuntimeTextScriptHex(source)}]}];
        });
    }
    const mode = layer.save_party_names;
    if (!mode) return [layer];
    const result = [];
    const origin = Number(layer.cursor ?? 654);
    const declareName = (id, label, cursor, width = 64) => preview.component_slots.push(
      interfaceTextSlot(id, label, cursor, {width, sourceRecord: layer.record}));
    if (mode === 'board') {
      for (let row = 0; row < 3; row++) declareName(`board-row:${row}`, `人物 ${row + 1}`, origin + row * 64, 144);
      const vehicles = fields.object(`${prefix}.entity_scene_object_slots`).value;
      const present = ROLES.map((role, index) => ({role, index,
        status: fields.object(`${prefix}.role.${role}.status`).value}))
        .filter(({role}) => fields.object(`${prefix}.role.${role}.present`).value);
      const rows = [...present.filter(row => row.status !== 255), ...present.filter(row => row.status === 255)];
      rows.forEach(({role, index, status}, row) => {
        const cursor = origin + row * 64;
        const vehicle = vehicles[index];
        if (status !== 255 && vehicle < 0x80 && vehicle !== 0x24) {
          if (vehicle > 10) throw new TypeError(`队伍战车 ${vehicle} 缺少存档名称字段`);
          result.push(nameLayer({...layer, record: 'record:02:020'},
            `${prefix}.vehicle.${vehicle}.name_codes`, cursor));
        }
        result.push(nameLayer(layer, `${prefix}.role.${role}.name_codes`, cursor));
      });
      return result;
    }
    if (mode === 'characters' || mode === 'pairs') ROLES.forEach((role, index) => {
      declareName(`submenu-role:${index}`, `人物 ${index + 1}`, origin + index * 64);
      if (fields.object(`${prefix}.role.${role}.present`).value)
        result.push(nameLayer(layer, `${prefix}.role.${role}.name_codes`, origin + index * 64));
    });
    if (mode === 'vehicles' || mode === 'pairs') {
      const vehicles = fields.object(`${prefix}.entity_scene_object_slots`).value;
      for (let index = 0; index < 4; index++) {
        declareName(`submenu-vehicle:${index}`, `战车 ${index + 1}`,
          origin + (mode === 'pairs' ? 8 : 0) + index * 64, 88);
        const vehicle = vehicles[index];
        if (vehicle >= 0x80 || vehicle === 0x24) continue;
        if (vehicle > 10) throw new TypeError(`队伍战车 ${vehicle} 缺少存档名称字段`);
        const cursor = origin + (mode === 'pairs' ? 8 : 0) + index * 64;
        result.push(nameLayer(layer, `${prefix}.vehicle.${vehicle}.name_codes`, cursor));
        if (mode === 'pairs' && index === 3) result.push({...layer,
          record: 'record:02:021', save_party_names: null, cursor: origin + index * 64});
      }
    }
    if (mode === 'rental-vehicles') {
      let row = 0;
      for (let rentalSlot = 2; rentalSlot >= 0; rentalSlot--) {
        const preset = fields.object(`${prefix}.active_rental_vehicle_preset.${rentalSlot}`).value;
        if (preset >= 0x80) continue;
        const cursor = origin + row++ * 64;
        declareName(`rental-vehicle:${rentalSlot}`, `出租战车 ${rentalSlot + 1}`, cursor, 88);
        result.push(nameLayer(layer, `${prefix}.vehicle.${8 + rentalSlot}.name_codes`, cursor));
      }
    }
    if (!['characters', 'vehicles', 'pairs', 'rental-vehicles'].includes(mode))
      throw new TypeError(`下级菜单姓名构造 ${mode} 未声明`);
    return result;
  });
  if (preview.wanted_defeat_history) {
    const [wantedDocument, itemDocument] = await Promise.all([
      db.getResourceDocument('wanted-record', null), db.getResourceDocument('item-entry', null),
    ]);
    let cursor = historyOrigin;
    preview.preview_wanted_rows = {};
    const historyValue = name => fieldSubmenuCodeValue(historyValues, name);
    const recordBase = historyValue('wanted-history-row-record');
    const rowRecord = claimed => textRecordNodeId(historyValue('field-item-text-region'), recordBase + Number(claimed));
    [false, true].forEach(claimed => componentRecords.add(rowRecord(claimed)));
    for (let wanted = historyValue('wanted-history-first-target'); wanted < historyValue('wanted-history-target-limit'); wanted++) {
      cursor += historyValue('service-list-row-step');
      const nameRecord = textRecordNodeId(historyValue('wanted-name-text-region'), wanted);
      componentRecords.add(nameRecord);
      preview.component_slots.push(interfaceTextSlot(`wanted-history:${wanted}`,
        `赏金首 ${wanted} · ${currentTextReference(nameRecord).label}`, cursor,
        {width: 224, pixelYOffset: -8, sourceRecord: nameRecord}));
      const savedLevel = fields.object(`${prefix}.wanted_defeat_level_at_victory.${wanted}`).value;
      const savedClaimed = fields.object(`${prefix}.global_event_flag.${(wanted + historyValue('wanted-history-claim-base')).toString(16).toUpperCase().padStart(2, '0')}`).value;
      const override = preview.runtime_context?.wanted_history_overrides?.[wanted];
      const defeated = override?.defeated ?? Boolean(savedLevel);
      const claimed = override?.claimed ?? Boolean(savedClaimed);
      const level = defeated ? savedLevel || 1 : 0;
      preview.preview_wanted_rows[`wanted-history:${wanted}`] = {wanted, defeated, claimed, level};
      if (!defeated) continue;
      const record = rowRecord(claimed);
      const numbers = interfaceRecordProviders({record}, [0xF8, 0xF9]);
      const names = interfaceRecordProviders({record}, [0xFA, 0xFB]);
      layers.push({kind: 'script', record, cursor, glyph_pixel_y_offset: -4,
        provider_constants: Object.fromEntries(numbers.map((provider, index) => [provider,
          [wanted, level, wantedBountyForTarget(wanted, wantedDocument.bounty_codes, itemDocument.equipment_editor.numeric_codes)][index]])),
        provider_records: {[names[0]]: nameRecord}});
    }
  }
  if (preview.fax_destinations) {
    const document = await db.getResourceDocument('ui-facility:teleport-terminal', null);
    let cursor = preview.fax_destinations.cursor;
    for (let index = 0; index < 12; index++) {
      preview.component_slots.push(interfaceTextSlot(`fax-destination:${index}`, `目的地 ${index + 1}`, cursor,
        {sourceRecord: `record:0D:${String(48 + index).padStart(3, '0')}`}));
      if (fields.object(`${prefix}.teleport_destination.${index}.unlocked`).value)
        layers.push({kind: 'script', record: `record:0D:${String(48 + index).padStart(3, '0')}`,
          cursor, glyph_pixel_y_offset: -4});
      if (index < 11) cursor += document.destination_list_cursor_steps[index];
    }
  }
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    if (!['window_clear', 'field_cache_window'].includes(layer.kind)) continue;
    const document = await db.getResourceDocument('ui-tile-rectangle-service', null);
    const preset = layer.source.selector_resource_id
      ? textRenderRuntimeFieldOwner.fieldOwner.windowClearPreset(
        await db.getResourceDocument(layer.source.selector_resource_id, null)) : layer.source.preset;
    const rectangle = uiTileRectangleServiceFieldOwner.fieldOwner.rectanglePreset(document, preset);
    layers[index] = {...layer, kind: layer.kind === 'field_cache_window' ? 'cached_field_tiles' : 'tile_fill', x: rectangle.logical_origin % 32,
      y: Math.floor(rectangle.logical_origin / 32), width: rectangle.width_tiles,
      height: rectangle.rows, tile: 0xFF};
  }
  if (preview.menu_highlight && !preview.menu_highlight.hidden) {
    const binding = preview.menu_highlight;
    const index = preview.runtime_context?.parent_choice_index ?? binding.choice_index;
    const codeValues = await fieldSubmenuCodeValues(['category-highlight-x-bias', 'highlight-metasprite-id',
      'category-selection-layout', 'category-selection-domain'], readCodeField);
    const source = binding.preset === 'overview-category'
      ? {...binding, selector: fieldSubmenuCodeValue(codeValues, 'category-selection-layout')} : binding;
    if (binding.preset === 'overview-category' && index >= fieldSubmenuCodeValue(codeValues, 'category-selection-domain'))
      throw new TypeError('一览高亮序号超出代码字段的选择域');
    const point = selectionCursorCoordinates(selection, source, index);
    const highlight = selectionLayoutFieldOwner.highlightCoordinates(selection, source, index,
      binding.preset ?? 'parent-menu', codeValues);
    layers.push({kind: 'generic_metasprite', object_id: fieldSubmenuCodeValue(codeValues, 'highlight-metasprite-id'),
      anchor_x: highlight.x, anchor_y: highlight.y, oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:27-40-7F']});
    if (binding.show_cursor) layers.push({kind: 'generic_metasprite', object_id: '0x30',
      anchor_x: point.x, anchor_y: point.y, oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:27-40-7F']});
  }
  for (const binding of preview.retained_selection_cursors || []) {
    const point = selectionCursorCoordinates(selection, binding,
      binding.choice_index ?? preview.runtime_context?.equipment_index ?? 0);
    layers.push({kind: 'generic_metasprite', object_id: '0x30',
      anchor_x: point.x, anchor_y: point.y, oam_y_bias: 1,
      pattern_profiles: ['sprite-chr:27-40-7F']});
  }
  if (preview.submenu_join || preview.actor_selection_join || preview.ammunition_list_join) {
    const prefix = preview.ammunition_list_join ? 'ammunition-list-join'
      : preview.actor_selection_join ? 'actor-selection-join' : 'submenu-join';
    const values = await fieldSubmenuCodeValues([`${prefix}-tile`,
      `${prefix}-origin-low`, `${prefix}-origin-high`], readCodeField);
    const origin = fieldSubmenuCodeValue(values, `${prefix}-origin-low`)
      | fieldSubmenuCodeValue(values, `${prefix}-origin-high`) << 8;
    if (origin < 0x6000 || origin >= 0x63C0) throw new TypeError('子菜单接点超出逻辑画面缓冲区');
    const join = {kind: 'tile_writes', writes: [[origin - 0x6000,
      fieldSubmenuCodeValue(values, `${prefix}-tile`)]]};
    if (preview.submenu_join_before_content)
      layers.splice(layers.findIndex(layer => layer.kind === 'script'), 0, join);
    else layers.push(join);
  }
  for (const layer of layers.filter(layer => layer.kind === 'vehicle_status_parts')) {
    const selectors = await db.getResourceDocument('vehicle-visual-selector');
    const chassis = layer.parts[0]?.chassis_id;
    const bank = selectors.status_sprite_chr_banks.find(row => row.chassis_id === chassis)?.chr_bank;
    if (chassis === undefined) continue;
    layer.art = await vehicleStatusPartArtForSelector(layer.document, chassis, bank);
  }
  return {...preview, layers, component_records: [...componentRecords]};
}
