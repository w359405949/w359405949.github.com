// @editor-module 界面值选择器引用人物、存档槽与击破记录。
import {esc} from '../core/dom.js';
import {state} from '../core/state.js';
import {saveFields} from '../core/save-editor-session.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {referencePickerMarkup, bindReferencePicker} from './reference-picker.js';
import {interfaceValueSelection, selectInterfaceValue} from '../render/interface-value-preview.js';
import {FIELD_GLYPH_ENTRY_PATHS} from '../core/field-glyph-cache-path.js';
import {interfacePreviewActorType} from '../core/interface-preview-scope.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];
const ROLE_LABELS = ['猎人', '机械师', '士兵'];

function picker(pageId, field, label, items) {
  const selected = String(interfaceValueSelection(pageId)[field]);
  return referencePickerMarkup({moduleId: 'save-current', label, value: selected,
    grouped: true, compact: true, items,
    componentAttributes: `data-interface-value-picker="${field}"`,
    controlMarkup: `<select aria-label="${esc(label)}">${items.map(item =>
      `<option value="${esc(item.value)}"${String(item.value) === selected ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}</select>`});
}

function slotEntries() {
  return [1, 2].map(slot => {
    const active = saveFields.ready() && saveFields.slotStatus(slot).valid;
    const name = active ? saveFields.object(`save.slot.${slot}.role.hunter.name_codes`).nameText : '';
    const level = active ? saveFields.object(`save.slot.${slot}.role.hunter.level`).value : null;
    return {value: slot, label: `预览组 ${slot}${active ? ` · ${name} · L:${level}` : ''}`, group: 'preview', groupLabel: '预览',
      description: active ? `${name} · 等级 ${level}` : saveFields.ready() ? '空槽' : '',
      meta: ''};
  });
}

export function interfacePreviewActorEntries(slot, entityTypes) {
  const initial = state.project?.game_data?.characters?.rom_initial?.roles || [];
  const entries = initial.map(role => ({
    value: `rom-role:${role.id}`, label: role.name, group: 'role', groupLabel: '人物',
    description: ROLE_LABELS[role.id], meta: '',
  }));
  const allowed = entries => entries.filter(entry => entityTypes.includes(
    interfacePreviewActorType(entry.value, state.project?.game_data?.vehicles)));
  if (!saveFields.ready() || !saveFields.slotStatus(slot).valid) return allowed(entries);
  ROLES.forEach((role, id) => {
    const prefix = `save.slot.${slot}.role.${role}`;
    if (!saveFields.object(`${prefix}.present`).value) return;
    entries.push({value: `save-role:${id}`, label: saveFields.object(`${prefix}.name_codes`).nameText,
      group: 'role', groupLabel: '人物', description: ROLE_LABELS[id], meta: ''});
  });
  for (let id = 0; id < 11; id++) {
    if (!saveFields.vehicleAcquired(slot, id)) continue;
    const prefix = `save.slot.${slot}.vehicle.${id}`;
    entries.push({value: `save-vehicle:${id}`, label: saveFields.object(`${prefix}.name_codes`).nameText,
      group: id < 8 ? 'player' : 'rental', groupLabel: id < 8 ? '战车' : '出租战车', meta: ''});
  }
  return allowed(entries);
}

export function interfaceValueSelectionMarkup(pageId, {glyphEntryPaths = false, entityTypes = []} = {}) {
  const selected = interfaceValueSelection(pageId);
  const slots = entityTypes.includes('save-slot');
  const wanted = entityTypes.includes('wanted-record');
  if (!slots && !wanted && !glyphEntryPaths) return '';
  const entries = wanted ? Array.from({length: 11}, (_, index) => {
    const id = index + 1;
    const path = `save.slot.${selected.slot}.wanted_defeat_level_at_victory.${id}`;
    const level = saveFields.ready() && saveFields.slotStatus(selected.slot).valid
      ? saveFields.object(path).value : 0;
    return {value: id, label: `赏金首 ${id}`, group: 'wanted', groupLabel: '击破记录',
      description: level ? `击破等级 ${level}` : '未击破',
      meta: `wanted-record:${id.toString(16).toUpperCase().padStart(2, '0')}`};
  }) : [];
  return `<div class="interface-preview-values" data-interface-value-selection="${esc(pageId)}">
    ${slots ? picker(pageId, 'slot', '预览组', slotEntries()) : ''}
    ${wanted ? picker(pageId, 'wanted', '击破记录', entries) : ''}
    ${glyphEntryPaths ? `<label class="screen-workbench-selection"><span>进入路径</span>
      <select data-interface-glyph-entry-path>${FIELD_GLYPH_ENTRY_PATHS.map(path =>
        `<option value="${path.id}"${selected.glyph_entry_path === path.id ? ' selected' : ''}>${path.label}</option>`).join('')}</select></label>` : ''}
  </div>`;
}

export async function bindInterfaceValueSelection(root, {rerender = () => {}} = {}) {
  const host = root.querySelector('[data-interface-value-selection]');
  if (!host) return;
  const pageId = host.dataset.interfaceValueSelection;
  const glyphPath = host.querySelector('[data-interface-glyph-entry-path]');
  if (glyphPath) glyphPath.onchange = () => {
    selectInterfaceValue(pageId, 'glyph_entry_path', glyphPath.value);
    void rerender();
  };
  host.querySelectorAll('[data-interface-value-picker]').forEach(picker =>
    bindReferencePicker(picker, {onSelect: value => {
      const field = picker.dataset.interfaceValuePicker;
      selectInterfaceValue(pageId, field, field === 'actor' ? value : Number(value));
      if (field === 'actor') {
        const vehicle = String(value).startsWith('save-vehicle:');
        const screen = state.interfacePageScreen || '';
        if (/battle-party-status\.(human|vehicle)$/u.test(screen))
          state.interfacePageScreen = `ui-screen:interface:battle-party-status:state:battle-party-status.${vehicle ? 'vehicle' : 'human'}`;
        if (/battle-items-equipment\.(human-items|vehicle-items)$/u.test(screen))
          state.interfacePageScreen = `ui-screen:interface:battle-items-equipment:state:battle-items-equipment.${vehicle ? 'vehicle-items' : 'human-items'}`;
      }
      void rerender();
    }}));
  const ready = saveFields.ready();
  await ensureSaveCurrentFieldObjects(state, saveFields);
  if (!ready && state.interfacePage === pageId) void rerender();
}
