// @editor-module 战斗菜单调用引用代码字段与当前 CHR 映射。
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from './field-submenu-code-sources.js';
import {textRecordNodeId} from './text-record-project.js';
import {state} from './state.js';

export async function battleMenuCalls(readField, construction = state.project?.ui?.construction) {
  const vehicleSelector = construction?.menu_dispatch_data?.battle_menu?.vehicle_selector?.selector;
  if (!Number.isInteger(vehicleSelector)) throw new TypeError('战车战斗命令缺少选择构造');
  const names = ['battle-menu-human-layout', 'battle-menu-vehicle-layout', 'battle-menu-human-selector',
    'battle-menu-name-record', 'battle-target-selector', 'battle-target-origin', 'battle-target-record',
    'battle-equipment-selector', 'battle-shell-selector', 'battle-shell-record', 'battle-shell-count-record',
    'battle-menu-layout-region', 'field-item-text-region', 'service-list-row-step', 'shell-provider-text-region',
    'battle-menu-name-origin-low', 'battle-menu-name-origin-high',
    'battle-menu-body-origin-low', 'battle-menu-body-origin-high', 'overview-part-region'];
  const values = await fieldSubmenuCodeValues(names, readField);
  const value = name => fieldSubmenuCodeValue(values, name);
  const origin = name => value(`${name}-low`) + (value(`${name}-high`) - 0x60) * 256;
  const record = name => textRecordNodeId(value('field-item-text-region'), value(name));
  const banks = await Promise.all([4, 5].map(register => readField({resource_id: 'chr-bank-mapping-service',
    entity_handle: 'chr-bank-mapping-service:preset:0', field: `register_${register}`})));
  if (banks.some(field => !Number.isInteger(field?.value))) throw new TypeError('战斗菜单缺少 CHR 映射');
  const pattern_profiles = banks.map((field, index) =>
    `chr-bank:${field.value.toString(16).toUpperCase().padStart(2, '0')}-${index ? 'C0-FF' : '80-BF'}`);
  return {
    layouts: Object.fromEntries(['human', 'vehicle'].map(kind => [kind,
      textRecordNodeId(value('battle-menu-layout-region'), value(`battle-menu-${kind}-layout`))])),
    pattern_profiles, body_origin: origin('battle-menu-body-origin'), name_origin: origin('battle-menu-name-origin'),
    part_names: [0, 1, 2].map(part => textRecordNodeId(value('overview-part-region'), part)),
    human_selector: value('battle-menu-human-selector'),
    vehicle_selector: vehicleSelector,
    equipment_selector: value('battle-equipment-selector'), shell_selector: value('battle-shell-selector'),
    name_record: record('battle-menu-name-record'), shell_record: record('battle-shell-record'),
    shell_count_record: record('battle-shell-count-record'), shell_region: value('shell-provider-text-region'),
    target_record: record('battle-target-record'), target_selector: value('battle-target-selector'),
    target_origin: origin('battle-menu-body-origin') + value('battle-target-origin'),
    row_step: value('service-list-row-step'),
  };
}
