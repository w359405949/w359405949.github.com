// @editor-module 设施配置摘要只使用当前字段值与已发布的槽位语义。
import {currentTextReference, recordUid} from '../../core/resource-index.js';
import {itemNameRecordId, textRecordNodeId} from '../../core/text-record-project.js';
import {db} from '../../core/project-db.js';
import {facilityRuntimeCodeValues} from '../../core/facility-runtime-code-sources.js';
import {vehicleName} from '../../core/vehicle-preset-views.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

export async function facilityConfigurationSummaryContext() {
  const [items, shells, vehicles, codeValues] = await Promise.all([
    db.getResourceDocument('item-entry'),
    db.getResourceDocument('shell-record'),
    db.getResourceDocument('vehicle-preset'),
    facilityRuntimeCodeValues(['inn-price-37', 'inn-price-38', 'inn-price-39']),
  ]);
  return {items, shells, vehicles, innPrices: Object.fromEntries([37, 38, 39].map(value => {
    const price = items.equipment_editor.numeric_codes.find(row =>
      row.raw_code === codeValues[`inn-price-${value}`]);
    return [value, price?.available && Number.isSafeInteger(price.value) ? price.value & 0xffff : null];
  }))};
}

function valueName(entry, value, namespace, context) {
  if (namespace === 'item') {
    const item = (context.items || db.peekResourceDocument('item-entry'))?.records.find(row => Number(row.id) === value);
    return currentTextReference(itemNameRecordId(item)).label || recordUid('item-entry', value);
  }
  if (namespace === 'shell') {
    const shell = (context.shells || db.peekResourceDocument('shell-record'))?.records.find(row => Number(row.id) === value);
    const record = shell?.name_text_record_id != null && shell?.name_text_region
      ? textRecordNodeId(Number.parseInt(shell.name_text_region, 16), shell.name_text_record_id) : null;
    return currentTextReference(record).label || recordUid('shell-record', value);
  }
  if (namespace === 'vehicle-preset') {
    const preset = (context.vehicles || db.peekResourceDocument('vehicle-preset'))?.presets.find(row => Number(row.preset_id) === value);
    return preset ? vehicleName(preset) : recordUid('vehicle-preset', value);
  }
  const good = entry.value_namespace?.goods?.find(row => Number(row.value) === value);
  const name = good ? currentTextReference(good.text_record || good.resource_uid).label : hex(value);
  const price = context.innPrices?.[value];
  return Number(entry.family_id) === 6 && Number.isInteger(price) ? `${name} ${price}G/人` : name;
}

export function facilityConfigurationSummary(entry, values = entry.values || [], context = entry.summaryContext || {}) {
  const family = Number(entry.family_id);
  if (family === 15) return `楼层 ${values.slice().reverse().slice(0, 3).join('、')}${values.length > 3 ? `…（${values.length} 层）` : ''}`;
  if (entry.value_namespace?.namespace === 'unknown')
    return `数值 ${values.slice(-4).map(value => hex(value)).join('、')}`;
  const slots = entry.value_namespace?.slot_schema?.slots;
  const names = values.flatMap((value, index) => {
    const slot = slots?.find(row => Number(row.slot) === index);
    if (slots && slot?.role !== 'product') return [];
    return [valueName(entry, Number(value), slot?.namespace || entry.value_namespace?.namespace, context)];
  });
  return `${names.slice(0, 3).join('、')}${names.length > 3 ? `…（${names.length} 项）` : ''}`;
}

export function facilityConfigurationLabel(entry, values = entry.values, recordId = entry.id, {showHandle = true} = {}) {
  const summary = facilityConfigurationSummary(entry, values);
  const handle = `application-config-instance:${hex(Number(entry.family_id))}:${hex(Number(recordId))}`;
  return showHandle ? summary ? `${summary} · ${handle}` : handle : `${summary || '配置'} · ${Number(recordId) + 1}`;
}
