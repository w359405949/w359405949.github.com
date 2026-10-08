// @editor-module 队伍标题与状态词按构造入口读取当前存档和所属代码字段。
import {servicePreviewFields} from '../core/service-preview-state.js';
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {interfaceRecordProviders, interfaceTextSlot} from './interface-slots.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];
const PARTS = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'];

export async function resolveFieldPartySummaryPreview(preview, {readCodeField} = {}) {
  if (!preview.party_summary) return preview;
  preview = {...preview, component_slots: [...(preview.component_slots || [])]};
  const overview = preview.party_summary === 'overview';
  if (!overview && preview.party_summary !== 'menu') throw new TypeError('队伍标题构造入口无效');
  const names = overview ? ['party-overview-role-origin', 'party-overview-footer-origin', 'party-overview-vehicle-origin',
    'submenu-text-origin', 'menu-text-origin-low', 'menu-text-origin-high',
      'party-overview-role-record', 'party-overview-vehicle-record', 'party-overview-footer-record',
      'party-overview-tow-record', 'party-overview-tow-origin', 'field-item-text-region', 'service-list-row-step']
    : ['party-menu-role-origin', 'party-menu-role-step', 'party-menu-vehicle-origin', 'menu-text-origin-low', 'menu-text-origin-high', 'party-menu-vehicle-record', 'field-item-text-region'];
  const values = await fieldSubmenuCodeValues(names, readCodeField);
  const read = name => fieldSubmenuCodeValue(values, name);
  const region = read('field-item-text-region').toString(16).toUpperCase().padStart(2, '0');
  const record = id => `record:${region}:${String(id).padStart(3, '0')}`;
  const roleBase = preview.layers.find(layer => layer.party_summary_rows)?.record;
  if (!roleBase) throw new TypeError('队伍标题缺少正文构造引用');
  const roleRecord = index => overview ? record(read('party-overview-role-record'))
    : roleBase.replace(/\d+$/u, value => String(Number(value) + index).padStart(3, '0'));
  const vehicleRecord = record(read(overview ? 'party-overview-vehicle-record' : 'party-menu-vehicle-record'));
  const providers = (id, tokens) => interfaceRecordProviders({record: id}, tokens);
  const rowStep = overview ? read('service-list-row-step') : read('party-menu-role-step');
  const fields = servicePreviewFields(preview.retained_party_summary_values
    ? {...preview, service_preview_state: {values: preview.retained_party_summary_values}} : preview,
    await ensureSaveCurrentFieldObjects(state));
  const words = await db.getResourceDocument('fixed-text-slot', null);
  const prefix = `save.slot.${preview.runtime_context?.save_slot ?? 1}`;
  const origin = overview ? read('party-overview-role-origin')
    : read('party-menu-role-origin') + read('menu-text-origin-low') + (read('menu-text-origin-high') - 0x60) * 256;
  const rows = ROLES.flatMap((role, index) => {
    const path = `${prefix}.role.${role}`;
    preview.component_slots.push(interfaceTextSlot(`party-role:${index}`, `人物 ${index + 1}`,
      origin + index * rowStep,
      {width: overview ? 224 : 128, height: overview ? 16 : 24,
        sourceRecord: roleRecord(index)}));
    if (!fields.object(`${path}.present`).value) return [];
    const status = fields.object(`${path}.status`).value;
    const word = status === 0xFF ? 8 : status ? 1 + Math.floor(Math.log2(status)) : 0;
    const slot = words.slots[`ui-status:${word.toString(16).toUpperCase().padStart(2, '0')}`];
    const name = fields.object(`${path}.name_codes`);
    const [nameProvider, statusProvider] = providers(roleRecord(index), [0xFC, 0xFD]);
    const numberProviders = providers(roleRecord(index), [0xF8, 0xF9]);
    if (nameProvider === undefined || overview && (statusProvider === undefined || numberProviders.length !== 3)
        || !overview && numberProviders.length !== 1) throw new TypeError('人物标题缺少提供器构造');
    return [{kind: 'script', record: roleRecord(index),
      cursor: origin + index * rowStep,
      provider_script_hex: {[nameProvider]: fixedRuntimeTextScriptHex(saveNameTextSource(name, name.value)),
        ...(statusProvider !== undefined ? {[statusProvider]: fixedRuntimeTextScriptHex(slot)} : {})},
      provider_constants: overview ? Object.fromEntries(numberProviders.map((provider, column) => [provider,
        fields.object(`${path}.${['level', 'current_hp', 'max_hp'][column]}`).value]))
        : {[numberProviders[0]]: fields.object(`${path}.current_hp`).value}}];
  });
  const menuOrigin = read('menu-text-origin-low') + (read('menu-text-origin-high') - 0x60) * 256;
  const vehicles = fields.object(`${prefix}.entity_scene_object_slots`).value;
  for (let index = 0; index < (overview ? 4 : 3); index++) {
    const vehicle = vehicles[index];
    preview.component_slots.push(interfaceTextSlot(`party-vehicle:${index}`, `战车 ${index + 1}`,
      overview ? 0x100 + read('party-overview-vehicle-origin') + index * rowStep
        : menuOrigin + read('party-menu-vehicle-origin') + index * read('party-menu-role-step'),
      {width: overview ? 104 : 64, height: overview ? 16 : 24,
        sourceRecord: vehicleRecord}));
    if (vehicle >= 0x80 || vehicle === 0x24) continue;
    const path = `${prefix}.vehicle.${vehicle}`;
    const condition = fields.object(`${path}.condition_raw`).value;
    const word = condition ? 10 + Math.floor(Math.log2(condition)) : 9;
    const status = fixedRuntimeTextScriptHex(words.slots[`ui-status:${word.toString(16).toUpperCase().padStart(2, '0')}`]);
    const sp = fields.object(`${path}.sp`).value;
    const stringProviders = providers(vehicleRecord, [0xFC, 0xFD]);
    const numberProviders = providers(vehicleRecord, [0xF8, 0xF9]);
    if (stringProviders.length !== (overview ? 2 : 1) || numberProviders.length !== (overview ? 2 : 1))
      throw new TypeError('战车标题缺少提供器构造');
    const layer = {kind: 'script', record: vehicleRecord,
      cursor: overview ? 0x100 + read('party-overview-vehicle-origin') + index * rowStep
        : menuOrigin + read('party-menu-vehicle-origin') + index * read('party-menu-role-step'),
      provider_script_hex: {[stringProviders.at(-1)]: status}, provider_constants: {[numberProviders.at(-1)]: sp}};
    if (overview) {
      const name = fields.object(`${path}.name_codes`);
      const ids = PARTS.map(part => fields.object(`${path}.equipment.${part}`).value);
      const items = await Promise.all(ids.map(id => id ? db.get(`item:${id.toString(16).toUpperCase().padStart(2, '0')}`, null) : null));
      const capacity = fields.object(`${path}.equipped.engine`).value
        ? items[4]?.engine_capacity?.internal_units ?? 0 : 0;
      const weight = fields.object(`${path}.chassis_weight`).value + sp
        + items.reduce((sum, item) => sum + (item?.tank_weight?.internal_units ?? 0), 0);
      layer.provider_script_hex[stringProviders[0]] = fixedRuntimeTextScriptHex(saveNameTextSource(name, name.value));
      layer.provider_constants = {[numberProviders[0]]: sp, [numberProviders[1]]: sp + Math.max(0, capacity - weight)};
    }
    rows.push(layer);
  }
  if (overview) {
    rows.push({kind: 'layout', record: record(read('party-overview-footer-record')),
      shift: 0x100 + read('party-overview-footer-origin')});
    if (vehicles[3] < 0x80 && vehicles[3] !== 0x24) rows.push({kind: 'script',
      record: record(read('party-overview-tow-record')), cursor: 0x200 + read('party-overview-tow-origin')});
  }
  return {...preview, layers: preview.layers.flatMap(layer => layer.party_summary_rows ? rows
    : [{...layer, ...(layer.party_summary_footer ? {cursor: read('submenu-text-origin') + menuOrigin} : {})}])};
}
