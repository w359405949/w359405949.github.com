// @editor-module 战车概览的文字调用引用当前代码字段与构造声明。
import {FIELD_SUBMENU_CODE_PARAMETERS, fieldSubmenuCodeValues, fieldSubmenuCodeValue} from './field-submenu-code-sources.js';
import {textRecordNodeId} from './text-record-project.js';

export async function fieldOverviewCalls(binding, readField) {
  const names = FIELD_SUBMENU_CODE_PARAMETERS.filter(row => row.name.startsWith('overview-')).map(row => row.name);
  names.push('service-list-row-step', 'field-item-text-region', 'shell-name-text-region',
    'storage-condition-record-base', 'runtime-action-record-region', 'weight-sign-record-negative', 'weight-sign-text-region');
  const values = await fieldSubmenuCodeValues(names, readField);
  const value = name => fieldSubmenuCodeValue(values, name);
  const record = name => textRecordNodeId(value('overview-text-region'), value(`overview-${name}-record`));
  if (binding.kind === 'armor' && !binding.armor_record) throw new TypeError('装甲概览缺少文字调用');
  return {
    row_step: value('service-list-row-step'), text_region: value('overview-text-region'),
    part_region: value('overview-part-region'), condition_region: binding.kind === 'box'
      ? value('overview-box-condition-region') : value('runtime-action-record-region'),
    condition_base: value('storage-condition-record-base'), shell_region: value('shell-name-text-region'),
    sign_region: value('weight-sign-text-region'), sign_negative: value('weight-sign-record-negative'),
    sign_positive: value('weight-sign-record-negative') - 1,
    name_record: record('name'), damage_record: record('damage'), attack_record: record('attack'),
    weight_record: record('weight'), grid_record: record('grid'), defense_record: record('defense'),
    unmounted_record: record('unmounted'), part_record: record('part'),
    condition_record: record('condition'), part_weight_record: record('part-weight'), number_record: record('number'),
    frame_record: record('frame'), footer_record: record('footer'), clear_record: record('clear'),
    defense_header_record: record('defense-header'),
    unmounted_name_record: value('overview-unmounted-name-record'), icon_record_base: value('overview-icon-record-base'),
    box_record_base: value('overview-box-record-base'), attribute_record_base: value('overview-attribute-record-base'),
    name_origin: value('overview-name-origin'), attack_origin: value('overview-attack-origin'),
    weight_origin: value('overview-weight-origin'), icon_origin: value('overview-icon-origin'),
    grid_left_origin: 0x200 + value('overview-grid-left-origin'), grid_right_origin: 0x200 + value('overview-grid-right-origin'),
    damage_origin: value('overview-damage-origin'), box_origin: value('overview-box-origin'),
    defense_header_origin: value('overview-defense-header-origin'), defense_name_origin: value('overview-defense-name-origin'),
    part_header_origin: value('overview-part-header-origin'), part_name_origin: value('overview-part-name-origin'),
    attribute_header_origin: value('overview-attribute-header-origin'), value_origin: value('overview-value-origin'),
    clear_origin: 0x200 + value('overview-clear-origin'),
    armor_record: binding.armor_record,
  };
}
