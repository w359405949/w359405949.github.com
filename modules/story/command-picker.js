// @editor-module 指令按用途与动作分组，动作配置在预览区选择。
import {esc} from '../../core/dom.js';
import {STORY_COMMAND_GROUPS, storyCommandCatalog} from '../../core/story-command-presentation.js';
import {referencePickerMarkup, bindReferencePicker, setReferencePickerValue,
  updateReferencePickerItem} from '../../ui/reference-picker.js';

function commandFamilies(declarations, semantics) {
  const families = new Map();
  for (const command of storyCommandCatalog(declarations, semantics)) {
    const semantic = semantics.get(command.opcode);
    const key = semantic?.operation || `opcode:${command.opcode}`;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(command);
  }
  return [...families].map(([value, commands]) => ({value, commands,
    group: commands[0].group,
    label: commands.length > 1 ? commands[0].label.split(' · ')[0] : commands[0].label}));
}

function familyItem(family, opcode) {
  const command = family.commands.find(row => row.opcode === opcode) || family.commands[0];
  return {value: family.value, controlValue: command.opcode, label: family.label,
    currentLabel: command.label, group: family.group, groupLabel: family.group,
    previewOnly: family.commands.length > 1,
    filter: family.commands.map(row => `${row.label} ${row.description} ${row.code} 0x${row.code}`).join(' ')};
}

export function storyCommandPickerMarkup({resourceId, declarations, semantics, opcode = 0x19}) {
  const families = commandFamilies(declarations, semantics);
  const current = families.find(family => family.commands.some(row => row.opcode === opcode));
  return referencePickerMarkup({moduleId: resourceId, label: '插入指令',
    value: current?.value, items: STORY_COMMAND_GROUPS.flatMap(group => families.filter(family => family.group === group)
      .map(family => familyItem(family, opcode))),
    grouped: true, compact: true, previewPanel: true, pageSize: 48,
    className: 'reference-detail-field story-command-picker',
    filterLabel: '搜索指令', filterPlaceholder: '名称／指令码',
    controlMarkup: `<input type="hidden" data-script-opcode value="${opcode}">`});
}

export function bindStoryCommandPicker(picker, {declarations, semantics}) {
  const families = commandFamilies(declarations, semantics);
  const control = picker.querySelector('[data-script-opcode]');
  const chosen = new Map(families.map(family => [family.value,
    family.commands.some(command => command.opcode === Number(control.value)) ? Number(control.value) : family.commands[0].opcode]));
  const preview = value => {
    const family = families.find(row => row.value === value);
    if (!family) return '';
    const command = family.commands.find(row => row.opcode === chosen.get(value));
    return `<h4>${esc(family.label)}</h4><p>${esc(command.description)}</p>
      <dl class="story-inspector-fields" data-story-command-parameters${command.operands.length ? '' : ' hidden'}><dt>参数</dt><dd>${esc(command.operands.join(' · '))}</dd></dl>
      ${family.commands.length > 1 ? referencePickerMarkup({moduleId: picker.dataset.moduleReferenceModule,
        label: '配置', compact: true, value: chosen.get(value),
        componentAttributes: `data-story-command-family="${esc(value)}"`,
        items: family.commands.map(row => ({value: row.opcode, label: row.label, meta: row.code})),
        controlMarkup: `<input type="hidden" value="${chosen.get(value)}">`}) : ''}`;
  };
  bindReferencePicker(picker, {preview, paint: root => {
    const secondary = root.querySelector('[data-story-command-family]');
    if (!secondary) return;
    const family = families.find(row => row.value === secondary.dataset.storyCommandFamily);
    bindReferencePicker(secondary, {onSelect: value => {
      const opcode = Number(value);
      chosen.set(family.value, opcode);
      const command = family.commands.find(row => row.opcode === opcode);
      const parameters = root.querySelector('[data-story-command-parameters]');
      parameters.hidden = !command.operands.length;
      parameters.querySelector('dd').textContent = command.operands.join(' · ');
      updateReferencePickerItem(picker, familyItem(family, opcode));
      void setReferencePickerValue(picker, family.value);
      control.value = String(opcode);
      control.dispatchEvent(new Event('change', {bubbles: true}));
    }});
  }});
}
