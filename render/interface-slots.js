// @editor-module 定长列表的槽位身份与区域由文字构造声明，内容不参与节点计数。

import {state} from '../core/state.js';
import {textRecordProviderCalls} from '../core/text-record-structure.js';

export function interfaceRecordProviders(layer, tokens, records = state.project?.text_record_edits) {
  return textRecordProviderCalls(records, layer.record, tokens).map(call => call.provider);
}

export function interfaceItemProviders(layer, records = state.project?.text_record_edits) {
  const providers = interfaceRecordProviders(layer, [0xFA, 0xFB], records);
  return layer.vehicle_status_items === 'names' ? providers.filter((_, index) => index % 2) : providers;
}

export function interfaceSaveSlotBindings(layer, records = state.project?.text_record_edits) {
  if (!layer.save_slot_values) return null;
  const names = interfaceRecordProviders(layer, [0xFC, 0xFD], records);
  const levels = interfaceRecordProviders(layer, [0xF8, 0xF9], records);
  if (names.length !== 2 || levels.length && levels.length !== names.length)
    throw new TypeError('存档槽文字缺少提供器声明');
  return names.map((name, index) => ({slot: index + 1, name, level: levels[index]}));
}

export function interfaceTextSlot(id, label, cursor, {width = 96, height = 16,
  pixelYOffset = -4, sourceRecord = null, ...fields} = {}) {
  return {id, label, sourceRecord, ...fields,
    bounds: {x: (cursor & 31) * 8, y: (cursor >> 5) * 8 + pixelYOffset, width, height}};
}

export function interfaceItemSlotProviders(layer) {
  if (layer.vehicle_status_items || layer.vehicle_shells) {
    const shells = Boolean(layer.vehicle_shells);
    return {...layer, component_slot_providers: Object.fromEntries(
      interfaceItemProviders(layer).map((provider, index) =>
        [provider, {id: `${shells ? 'vehicle-shell' : 'vehicle-carry'}:${index}`,
          label: `${shells ? '炮弹' : '携带'} ${index + 1}`, ...(shells ? {} : {width: 112})}]))};
  }
  const slots = interfaceSaveSlotBindings(layer);
  if (slots) return {...layer, component_slot_providers: Object.fromEntries(slots.map(({name, slot}) =>
    [name, {id: `save-slot:${slot}`, label: `存档槽 ${slot}`}]))};
  const binding = layer.provider_save_items;
  const sequences = [...(layer.provider_record_sequences || []),
    ...(layer.provider_record_sequence ? [layer.provider_record_sequence] : [])];
  const sequence = sequences.find(row => /\.(equipment|inventory)$/u.test(row.source || ''));
  const declared = binding?.providers || sequence?.providers;
  if (!declared) return layer;
  const providers = interfaceRecordProviders(layer, [0xFA, 0xFB]);
  if (providers.length !== declared.length) throw new TypeError('携带位缺少当前文字提供器构造');
  const path = binding?.field_id || binding?.field_ids?.[0] || sequence?.source;
  const kind = layer.equipment || /\.equipment(?:\.|$)/u.test(path) ? 'equipment' : 'inventory';
  const update = row => row === sequence ? {...row, providers} : row;
  return {...layer,
    ...(binding ? {provider_save_items: {...binding, providers}} : {}),
    ...(layer.provider_record_sequence ? {provider_record_sequence: update(layer.provider_record_sequence)} : {}),
    ...(layer.provider_record_sequences ? {provider_record_sequences: layer.provider_record_sequences.map(update)} : {}),
    component_slot_providers: Object.fromEntries(providers.map((provider, index) =>
    [provider, {id: `field-loadout:${kind}:${index}`, label: `携带 ${index + 1}`}]))};
}
