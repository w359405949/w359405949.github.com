// @editor-module 战车概览按当前存档取得状态、携带物和属性，文字构造引用已发布记录。
import {servicePreviewFields} from '../core/service-preview-state.js';
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {vehicleWeightProviderScript} from '../views/status-ui.js';
import {uiTileRectangleServiceFieldOwner, textRenderRuntimeFieldOwner} from '../core/field-ui-block-owners.js';
import {interfaceTextSlot} from './interface-slots.js';
import {storagePreviewEntries} from '../core/storage-preview-entries.js';
import {fieldOverviewCalls} from '../core/field-overview-calls.js';
import {interfaceRecordProviders} from './interface-slots.js';
import {textRecordNodeId} from '../core/text-record-project.js';

const PARTS = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis'];
const CARRY_PARTS = [...PARTS, 'generic_7', 'generic_8'];

export async function resolveFieldOverviewPreview(preview, {readCodeField} = {}) {
  const binding = preview.field_overview;
  if (!binding) return preview;
  preview = {...preview, component_slots: [...(preview.component_slots || [])]};
  const calls = await fieldOverviewCalls(binding, readCodeField);
  const provider = (record, tokens, index = 0) => {
    const value = interfaceRecordProviders({record}, tokens)[index];
    if (value === undefined) throw new TypeError(`概览 ${record} 缺少提供器构造`);
    return value;
  };
  const numbers = (record, values) => Object.fromEntries(interfaceRecordProviders({record}, [0xF8, 0xF9])
    .map((id, index) => [id, values[index]]));
  const nameScript = (record, value) => ({[provider(record, [0xE8, 0xFC, 0xFD])]: value});
  const pairs = (record, values) => Object.fromEntries(interfaceRecordProviders({record}, [0xFA, 0xFB])
    .map((id, index) => [id, values[index]]));
  const conditionPair = condition => ({region: calls.condition_region, record: calls.condition_base
    + Number(Boolean(condition & 0x80)) + Number(Boolean(condition & 0x40))});
  const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state));
  let clearLayer = null;
  if (binding.clear_rectangle) {
    const document = await db.getResourceDocument('ui-tile-rectangle-service', null);
    const rectangle = uiTileRectangleServiceFieldOwner.fieldOwner.rectanglePreset(document, binding.clear_rectangle);
    clearLayer = {kind: 'tile_fill', x: rectangle.logical_origin % 32,
      y: Math.floor(rectangle.logical_origin / 32), width: rectangle.width_tiles,
      height: rectangle.rows, tile: 0xFF};
  }
  const prefix = `save.slot.${preview.runtime_context?.save_slot ?? 1}`;
  const part = binding.kind === 'defense' ? preview.runtime_context?.component_index ?? 0 : binding.part;
  const attribute = binding.kind === 'defense' ? 2 : preview.runtime_context?.attribute_index ?? 0;
  const script = (record, cursor, values = {}) => ({kind: 'script', record, cursor,
    glyph_pixel_y_offset: -4, ...values});
  const rows = [];
  if (binding.kind === 'box' || binding.kind === 'damage') {
    for (let index = 0; index < 8; index++) preview.component_slots.push(
      interfaceTextSlot(`overview-row:${index}`, `条目 ${index + 1}`,
        (binding.kind === 'box' ? calls.box_origin : calls.damage_origin) + index * calls.row_step, {width: 216}));
  } else {
    for (let vehicle = 0; vehicle < 8; vehicle++) {
      const grid = binding.kind === 'vehicle-grid' || binding.kind === 'vehicles';
      preview.component_slots.push(interfaceTextSlot(`overview-vehicle:${vehicle}`, `战车 ${vehicle + 1}`,
        binding.kind === 'vehicle-grid' ? (vehicle < 4 ? calls.grid_left_origin : calls.grid_right_origin) + vehicle % 4 * calls.row_step
          : binding.kind === 'vehicles' ? calls.icon_origin + vehicle % 4 * 7 + Math.floor(vehicle / 4) * 256
          : (binding.kind === 'weight' ? calls.weight_origin : calls.name_origin) + vehicle * calls.row_step,
        {width: binding.kind === 'vehicles' ? 56 : grid ? 104 : 232,
          height: binding.kind === 'vehicles' ? 64 : 16}));
    }
  }
  const itemSource = async (id, key) => {
    const item = await db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null);
    if (!item?.name_source) throw new TypeError('一览携带物缺少文字来源');
    return {id: key, raw_hex: fixedRuntimeTextScriptHex(item.name_source)};
  };
  if (binding.kind === 'box') {
    const page = preview.runtime_context?.first_row ?? 0;
    const entries = storagePreviewEntries(fields, preview.runtime_context?.save_slot ?? 1,
      {sorted: binding.sort_storage});
    for (let index = page; index < Math.min(page + 8, 64); index++) {
      const {id, condition} = entries[index];
      if (!id) break;
      const key = `overview-box:${index}`;
      const record = textRecordNodeId(calls.text_region, calls.box_record_base
        + (id >= 0x41 && id < 0x99 ? id < 0x65 ? 2 : 1 : 0));
      rows.push(script(record, calls.box_origin + calls.row_step * (index - page), {
        provider_records: {[provider(record, [0xFA, 0xFB])]: key}, records: [await itemSource(id, key)],
        provider_constants: numbers(record, [condition & 0x3F]),
        provider_record_pairs: Object.fromEntries(interfaceRecordProviders({record}, [0xFA, 0xFB]).slice(1)
          .map(id => [id, conditionPair(condition)]))}));
    }
  } else if (binding.kind === 'damage') {
    const entries = [];
    const vehicles = binding.vehicle_source === 'party'
      ? [...fields.object(`${prefix}.entity_scene_object_slots`).value.slice(0, 4)].filter(vehicle => vehicle < 128)
      : Array.from({length: 8}, (_, vehicle) => vehicle);
    for (const vehicle of vehicles) {
      if (vehicle > 10) throw new TypeError('损坏设备列表缺少已确认的战车位');
      const path = `${prefix}.vehicle.${vehicle}`;
      const damaged = CARRY_PARTS.filter(part => fields.object(`${path}.equipment.${part}`).value
        && fields.object(`${path}.equipment_state.${part}`).value & 0xC0);
      if (!damaged.length) continue;
      const name = fields.object(`${path}.name_codes`);
      entries.push(script(calls.name_record, 0, {provider_constants: numbers(calls.name_record, [vehicle + 1]),
        provider_script_hex: nameScript(calls.name_record, fixedRuntimeTextScriptHex(saveNameTextSource(name, name.value)))}));
      for (const part of damaged) {
        const id = fields.object(`${path}.equipment.${part}`).value;
        const condition = fields.object(`${path}.equipment_state.${part}`).value;
        const key = `overview-damage:${vehicle}:${part}`;
        entries.push(script(calls.damage_record, 0, {provider_records: {[provider(calls.damage_record, [0xFA, 0xFB])]: key},
          records: [await itemSource(id, key)], provider_record_pairs: {
            [provider(calls.damage_record, [0xFA, 0xFB], 1)]: conditionPair(condition)}}));
      }
    }
    const page = preview.runtime_context?.first_row ?? 0;
    rows.push(...entries.slice(page, page + 8).map((layer, index) => ({...layer, cursor: calls.damage_origin + index * calls.row_step})));
  }
  for (let vehicle = 0; vehicle < 8; vehicle++) {
    if (binding.kind === 'box' || binding.kind === 'damage') break;
    const acquired = fields.object(`${prefix}.global_event_flag.${(vehicle + 8).toString(16).toUpperCase().padStart(2, '0')}`).value;
    const path = `${prefix}.vehicle.${vehicle}`;
    const name = fields.object(`${path}.name_codes`);
    const nameHex = fixedRuntimeTextScriptHex(saveNameTextSource(name, name.value));
    if (binding.kind === 'vehicle-grid') {
      rows.push(script(calls.grid_record, (vehicle < 4 ? calls.grid_left_origin : calls.grid_right_origin) + vehicle % 4 * calls.row_step,
        {overview_role: 'footer', provider_script_hex: nameScript(calls.grid_record, acquired ? nameHex : '9F'),
          provider_constants: numbers(calls.grid_record, [vehicle + 1])}));
      continue;
    }
    if (!acquired) continue;
    if (['attack', 'weight', 'armor'].includes(binding.kind)) {
      const cursor = (binding.kind === 'weight' ? calls.weight_origin : calls.name_origin) + vehicle * calls.row_step;
      if (binding.kind === 'attack') {
        const attacks = await Promise.all(PARTS.slice(0, 3).map(async part => {
          if (!fields.object(`${path}.equipped.${part}`).value) return 0;
          const id = fields.object(`${path}.equipment.${part}`).value;
          const item = await db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null);
          if (!Number.isInteger(item?.attack?.value)) throw new TypeError('攻击汇总缺少武器攻击字段');
          return item.attack.value;
        }));
        rows.push(script(calls.name_record, cursor, {provider_script_hex: nameScript(calls.name_record, nameHex),
          provider_constants: numbers(calls.name_record, [vehicle + 1])}),
          script(calls.attack_record, calls.attack_origin + vehicle * calls.row_step, {
            provider_constants: numbers(calls.attack_record, attacks)}));
      } else {
        const ids = CARRY_PARTS.map(part => fields.object(`${path}.equipment.${part}`).value);
        const items = await Promise.all(ids.map(id => id ? db.get(
          `item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null) : null));
        const sp = fields.object(`${path}.sp`).value;
        const weight = fields.object(`${path}.chassis_weight`).value + sp + items.reduce((sum, item) =>
          sum + (item && item.id < 0x91 ? item.tank_weight?.internal_units ?? 0 : 0), 0);
        const capacity = fields.object(`${path}.equipped.engine`).value
          ? items[4]?.engine_capacity?.internal_units ?? 0 : 0;
        if (binding.kind === 'weight') rows.push(script(calls.weight_record, cursor, {
          provider_script_hex: Object.fromEntries(interfaceRecordProviders({record: calls.weight_record}, [0xFC, 0xFD])
            .map((id, index) => [id, [nameHex, ...[capacity, weight, Math.abs(capacity - weight)]
              .map(value => vehicleWeightProviderScript(value, {unit: false}))][index]])),
          provider_record_pairs: pairs(calls.weight_record, [{region: calls.sign_region,
            record: capacity < weight ? calls.sign_negative : calls.sign_positive}])}));
        else rows.push(script(calls.armor_record, cursor, {provider_script_hex: nameScript(calls.armor_record, nameHex),
          provider_constants: numbers(calls.armor_record, [vehicle + 1, sp, Math.max(0, capacity - weight + sp)])}));
      }
      continue;
    }
    if (binding.kind === 'vehicles') {
      const record = textRecordNodeId(calls.shell_region, calls.icon_record_base + vehicle);
      rows.push(script(record, calls.icon_origin, {provider_script_hex: nameScript(record, nameHex),
        provider_constants: numbers(record, [vehicle + 1])}));
      continue;
    }
    rows.push(script(calls.name_record, calls.name_origin + vehicle * calls.row_step,
      {provider_script_hex: nameScript(calls.name_record, nameHex), provider_constants: numbers(calls.name_record, [vehicle + 1])}));
    const partName = PARTS[part];
    if (!partName) throw new TypeError('概览部件索引越界');
    const nameCursor = (binding.kind === 'defense' ? calls.defense_name_origin : calls.part_name_origin) + vehicle * calls.row_step;
    if (!fields.object(`${path}.equipped.${partName}`).value) {
      if (part < 3 && !fields.object(`${path}.mount_permission.${partName}`).value)
        rows.push(script(calls.unmounted_record, nameCursor, {runtime_record_pair: {region: calls.shell_region, record: calls.unmounted_name_record}}));
      continue;
    }
    const id = fields.object(`${path}.equipment.${partName}`).value;
    const item = await db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null);
    if (!item?.name_source) throw new TypeError('概览部件缺少文字来源');
    const itemRecord = `overview-item:${vehicle}`;
    rows.push(script(binding.kind === 'defense' ? calls.defense_record : calls.part_record, nameCursor,
      {runtime_record_pair: itemRecord, records: [{id: itemRecord,
        raw_hex: fixedRuntimeTextScriptHex(item.name_source)}],
        ...(binding.kind === 'defense' ? {provider_records: {[provider(calls.defense_record, [0xFA, 0xFB])]: itemRecord},
          provider_constants: numbers(calls.defense_record, [partName === 'chassis' ? fields.object(`${path}.defense`).value
            : item.defense?.value])} : {})}));
    if (binding.kind === 'defense') continue;
    const cursor = calls.value_origin + vehicle * calls.row_step;
    if (attribute === 0) {
      const condition = fields.object(`${path}.equipment_state.${partName}`).value;
      rows.push(script(calls.condition_record, cursor, {provider_record_pairs: pairs(calls.condition_record, [conditionPair(condition)])}));
    } else if (attribute === 1) {
      const weight = partName === 'chassis' ? fields.object(`${path}.chassis_weight`).value
        : item.tank_weight?.internal_units;
      if (!Number.isInteger(weight)) throw new TypeError('概览部件缺少重量字段');
      rows.push(script(calls.part_weight_record, cursor,
        {provider_script_hex: {[provider(calls.part_weight_record, [0xFC, 0xFD])]: vehicleWeightProviderScript(weight)}}));
    } else if (attribute === 2 || attribute === 3) {
      const value = partName === 'chassis' ? fields.object(`${path}.defense`).value
        : item[attribute === 2 ? 'defense' : 'attack']?.value;
      if (!Number.isInteger(value)) throw new TypeError('概览部件缺少属性字段');
      rows.push(script(calls.number_record, cursor, {provider_constants: numbers(calls.number_record, [value])}));
    } else throw new TypeError('概览属性索引越界');
  }
  const layers = preview.layers.flatMap(layer => layer.save_overview_rows ? rows : [{...layer, ...(layer.overview_role ? {record: calls[`${layer.overview_role}_record`]} : {})}]);
  if (binding.kind === 'vehicle-grid' || binding.kind === 'vehicles') {
    const frame = binding.kind === 'vehicles' ? layers.findIndex(layer => layer.overview_role === 'frame') : -1;
    if (frame >= 0) {
      const [layer] = layers.splice(frame, 1);
      layers.splice(layers.findIndex(layer => layer.category_transfer), 0, layer);
    }
    const footer = layers.findIndex(layer => layer.overview_role === 'footer');
    if (footer >= 0) {
      const menu = layers.splice(footer);
      layers.splice(1, 0, ...menu);
      const document = await db.getResourceDocument('ui-tile-rectangle-service', null);
      const parent = uiTileRectangleServiceFieldOwner.fieldOwner.rectanglePreset(document, '00');
      for (const layer of layers) {
        if (layer.kind !== 'script' || layer.record.startsWith(`record:${calls.text_region.toString(16).toUpperCase().padStart(2, '0')}:`)) continue;
        layer.text_transfer_regions = [{source_x: 0, source_y: 0, x: 0, y: 0,
          width: parent.width_tiles * 8, height: Math.floor(parent.logical_origin / 32) * 8}];
      }
    }
  }
  if (preview.overview_category) {
    const document = await db.getResourceDocument('text-render-runtime', null);
    for (const layer of layers) {
      if (!layer.category_transfer) continue;
      const transfers = ['08', '0A'].map(id => textRenderRuntimeFieldOwner.fieldOwner.tileTransferPreset(document, id));
      layer.cursor = transfers[0].logical_origin;
      layer.glyph_pixel_y_offset = 4;
      layer.literal_tile_pixel_y_offset = (Math.floor(transfers[1].logical_origin / 32)
        - Math.floor(transfers[0].logical_origin / 32)) * 8;
      layer.text_transfer_regions = transfers.map(transfer => ({
        source_x: transfer.logical_origin % 32 * 8, source_y: Math.floor(transfer.logical_origin / 32) * 8,
        x: transfer.column_offset * 8, y: transfer.row_offset * 8,
        width: transfer.width_tiles * 8, height: transfer.rows * 8,
      }));
    }
  }
  if (clearLayer) {
    const footer = layers.findIndex(layer => layer.overview_role === 'frame');
    const parentClear = layers[0]?.kind === 'tile_fill' && preview.overview_category ? 1 : 0;
    if (footer >= 0) layers.splice(parentClear, 0, ...layers.splice(footer, 1));
    layers.splice(parentClear + 1, 0, clearLayer);
    layers.push(script(calls.clear_record, calls.clear_origin, {overview_role: 'clear'}));
  }
  if (binding.kind === 'defense') {
    const header = layers.findIndex(layer => layer.kind === 'script');
    layers.splice(header, 0, script(calls.defense_header_record, calls.defense_header_origin, {provider_record_pairs:
      pairs(calls.defense_header_record, [{region: calls.part_region, record: part}])}));
    // 防御概览在属性绘制后重绘部件行。
    layers.push(...rows.filter(layer => layer.record === calls.defense_record).map(layer => structuredClone(layer)));
  } else if (binding.kind === 'attributes') {
    const header = layers.findIndex(layer => layer.kind === 'script');
    layers.splice(header, 0, script(calls.part_record, calls.part_header_origin, {runtime_record_pair: {region: calls.part_region, record: part}}));
    layers.push(script(calls.part_record, calls.attribute_header_origin, {runtime_record_pair: {region: calls.part_region, record: calls.attribute_record_base + attribute}}));
  }
  return {...preview, layers};
}
