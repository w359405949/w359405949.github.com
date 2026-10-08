// @editor-module 菜单应用对话沿用调用方窗口、当前文本与预览对象。
import {state} from '../../core/state.js';
import {db} from '../../core/project-db.js';
import {saveFields} from '../../core/save-editor-session.js';
import {interfacePreviewContext} from '../../core/interface-preview-context.js';
import {interfacePreviewItemValue} from '../../core/interface-preview-items.js';
import {itemEffectPagesForItem} from '../../core/ui-page-registry.js';
import {fieldMenuRolePreview, fieldMenuVehiclePreview} from './field-menu.js';
import {textRecordRuntimeTokens, textRecordNodeId} from '../../core/text-record-project.js';
import {currentTextChoiceLabel} from '../../core/resource-index.js';
import {dialoguePreviewFrames} from '../text/dialogue-preview.js';

const ARMOR = 'vehicle-status.armor-confirm';
const FAX = 'human-items.fax-destination-select';
const RESULT_ENTRY = 'vehicle-status.armor-result:';
const FAX_ENTRY = 'human-items.fax-dialogue';

function faxDialogueLayer(preview = null) {
  const source = preview || state.project?.ui?.construction?.menu_dispatch_data?.previews
    ?.find(row => row.interface_state_id === FAX);
  const layer = source?.layers?.find(row => row.dialogue_runtime && !row.glyph_cache_only);
  if (!layer?.record) throw new TypeError('传真应用缺少对话构造引用');
  return layer;
}

export function menuApplicationEntry(entry, preview) {
  if (entry.groupId === 'field-armor-confirm') return {...entry, entryId: `${RESULT_ENTRY}${entry.index}`,
    targetLabel: '选择后续', action: false};
  if (entry.groupId !== 'field-tool-actions' || entry.index !== 0 || !saveFields.ready()) return entry;
  const context = interfacePreviewContext();
  preview = context.kind === 'role' ? fieldMenuRolePreview(preview, context.role)
    : fieldMenuVehiclePreview(preview, context.vehicle, 'human-items');
  const binding = preview?.layers?.find(layer => layer.runtime_save_item)?.runtime_save_item;
  if (!binding) return entry;
  preview = {...preview, runtime_context: {...preview.runtime_context,
    item_overrides: context.itemSelections?.get(`${context.slot}:${context.actor}`)}};
  const values = binding.field_ids
    ? binding.field_ids.map(id => interfacePreviewItemValue(preview, id, saveFields.object(id).value))
    : interfacePreviewItemValue(preview, binding.field_id, saveFields.object(binding.field_id).value);
  const itemId = values[context.inventory_index ?? binding.index];
  const item = db.peek(`item:${Number(itemId).toString(16).toUpperCase().padStart(2, '0')}`);
  const page = itemEffectPagesForItem(item || {}).find(page => page.itemEffect === 'fax');
  if (!page) return entry;
  return {...entry, pageId: page.id, screenId: `ui-screen:interface:human-items:state:${FAX}`,
    targetStateId: FAX, entryId: `${FAX_ENTRY}:0`, targetLabel: page.label, action: false};
}

function armorChoice(index) {
  const group = state.project?.ui?.construction?.menu_dispatch_data?.choice_groups
    ?.find(group => group.interface_state_ids?.includes(ARMOR));
  const choice = group?.choices.find(choice => choice.index === index);
  const record = state.project?.text_record_edits?.records?.[group?.record];
  const branch = record && textRecordRuntimeTokens(record, state.project.text_record_encoding,
    state.project.text_record_edits).find(token => token.token === 0xEB);
  return {label: currentTextChoiceLabel(choice?.label_reference),
    record: branch ? textRecordNodeId(record.region_id, branch.operands[index]) : choice?.continuation_record};
}

export function menuApplicationDialogueSteps(steps) {
  return steps.flatMap(step => {
    if (step.entryId?.startsWith(RESULT_ENTRY)) return [{...step,
      label: `拆装甲：${armorChoice(Number(step.entryId.slice(RESULT_ENTRY.length))).label}`}];
    if (step.entryId !== FAX_ENTRY) return [step];
    const frames = dialoguePreviewFrames(faxDialogueLayer().record);
    return frames.map((frame, index) => ({...step, entryId: `${FAX_ENTRY}:${index}`,
      label: `传真：对话 ${index + 1} / ${frames.length}`}));
  });
}

export function menuApplicationDialoguePreview(preview, entry = state.interfacePageEntry) {
  if (!preview) return preview;
  const armor = preview.interface_state_id === ARMOR
    || preview.interface_state_id === 'vehicle-status.armor-amount';
  if (armor) {
    const result = entry?.startsWith(RESULT_ENTRY);
    const choice = result ? Number(entry.slice(RESULT_ENTRY.length)) : null;
    const record = result ? armorChoice(choice).record : null;
    return {...preview, menu_application: {kind: 'armor', choice},
      field_submenu_vehicle: {vehicle: 0, subtract_selected: false},
      layers: preview.layers.map(layer => layer.armor_amount?.removed && layer.inline_confirm && result
        ? {...layer, record, inline_confirm: false, dialogue_runtime: true} : layer),
      runtime_context: {...preview.runtime_context, ...(result ? {choice_index: choice, confirmed_waits: 0} : {})},
      ...(result ? {selection_cursor: null} : {})};
  }
  if (preview.interface_state_id !== FAX) return preview;
  const dialogue = entry?.startsWith(`${FAX_ENTRY}:`);
  const frameIndex = dialogue ? Number(entry.slice(FAX_ENTRY.length + 1)) : null;
  const body = faxDialogueLayer(preview);
  const frames = dialoguePreviewFrames(body.record);
  const frame = dialogue ? frames[frameIndex] : null;
  const waiting = dialogue && frameIndex < frames.length - 1;
  const layers = preview.layers.map(layer => layer === body
    ? {...layer, runtime_save_item: preview.layers.find(layer => layer.runtime_save_item)?.runtime_save_item,
      ...(frame ? {page_index: frame.pageIndex} : {})} : layer);
  const bodyIndex = preview.layers.indexOf(body);
  return {...preview, menu_application: {kind: 'fax', phase: dialogue ? 'dialogue' : 'destinations'},
    layers: waiting ? layers.slice(0, bodyIndex + 1) : layers,
    runtime_context: {...preview.runtime_context, ...(frame ? {confirmed_waits: frame.confirmedWaits} : {})},
    ...(waiting ? {selection_cursor: null, fax_destinations: null,
      menu_highlight: {...preview.menu_highlight, show_cursor: true}} : {})};
}
