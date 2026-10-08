// @editor-module 界面预览对象与临时物品共用预览上下文。

import {esc} from "../core/dom.js";
import {state} from "../core/state.js";
import {db} from "../core/project-db.js";
import {HUMAN_EQUIPMENT_CATEGORIES, TANK_EQUIPMENT_CATEGORIES,
  itemPickerFieldMarkup, hydrateItemPickers} from "./item-picker.js";
import {bindReferencePicker, referencePickerMarkup} from "./reference-picker.js";
import {paintVehicleBattlePortraitCanvases, vehiclePresetReferenceItem} from "../modules/vehicle/components.js";
import {interfacePreviewContext, selectInterfacePreviewContext, ensureInterfacePreviewActor} from '../core/interface-preview-context.js';
import {interfacePreviewActorEntries} from './interface-value-selection.js';
import {interfacePageDefinition} from "../core/ui-page-registry.js";
import {vehiclePresetChoices} from '../core/vehicle-preset-views.js';
import {interfaceItemSlotProviders} from '../render/interface-slots.js';
import {hydrateModuleComponents} from './module-components.js';
import {currentTextReference, indexedResource} from '../core/resource-index.js';
import {textRecordRuntimeTokens} from '../core/text-record-project.js';

export function fieldMenuPreviewObject(pageId) {
  const context = interfacePreviewContext();
  const kind = context.kind;
  return {kind, id: context[kind]};
}

export function prepareFieldMenuPreviewObject(entityTypes) {
  const context = interfacePreviewContext();
  const allowedGroups = ['player', 'rental'].filter(group =>
    entityTypes.includes(group === 'player' ? 'vehicle' : 'rental'));
  const extraEntries = interfacePreviewActorEntries(context.slot, entityTypes);
  ensureInterfacePreviewActor([
    ...extraEntries.map(entry => ({actor: entry.value})),
    ...vehiclePresetChoices(allowedGroups).map(({preset}) => ({actor: `rom-vehicle:${preset.preset_id}`})),
  ]);
  return {allowedGroups, extraEntries};
}

export function fieldMenuObjectMarkup(pageId, entityTypes) {
  const {allowedGroups, extraEntries} = prepareFieldMenuPreviewObject(entityTypes);
  if (!allowedGroups.length && !extraEntries.length) return '';
  const context = interfacePreviewContext();
  const selected = fieldMenuPreviewObject(pageId);
  const value = context.kind !== selected.kind || context.actor.startsWith('rom-vehicle:')
    ? String(selected.id) : context.actor;
  return `<div class="interface-preview-object" data-field-menu-object="${esc(pageId)}">
    ${referencePickerMarkup({moduleId: 'vehicle-preset', value, label: '预览对象',
      compact: true, grouped: true, previewPanel: true,
      items: [...extraEntries, ...vehiclePresetChoices(allowedGroups).map(({preset, group}) => ({
        ...vehiclePresetReferenceItem(preset), meta: '', group,
        groupLabel: group === 'rental' ? '出租战车' : '战车',
      }))]})}
  </div>`;
}

export function bindFieldMenuObject(root = document, {rerender = () => {}, onSelect = () => {}} = {}) {
  root.querySelectorAll('[data-field-menu-object]').forEach(host => {
    bindReferencePicker(host.querySelector('[data-module-reference-picker]'), {
      paint: paintVehicleBattlePortraitCanvases, onSelect: value => {
        selectInterfacePreviewContext('actor', String(value).includes(':') ? String(value) : `rom-vehicle:${value}`);
        const selected = fieldMenuPreviewObject(host.dataset.fieldMenuObject);
        onSelect(host.dataset.fieldMenuObject, selected);
        void rerender();
      },
    });
  });
}

export function fieldMenuLoadoutKind(pageId) {
  pageId = interfacePageDefinition(pageId)?.loadoutPage || pageId;
  return {"human-equipment": "equipment", "human-items": "inventory",
    "vehicle-equipment-shells": "shells"}[pageId] || null;
}

export function fieldMenuLoadoutNodes(pageId, screenId, preview = null) {
  const layer = (preview?.layers || []).map(interfaceItemSlotProviders)
    .find(layer => layer.provider_save_items || layer.provider_record_sequence || layer.provider_record_sequences
      || layer.vehicle_status_items || layer.vehicle_shells);
  if (!layer?.component_slot_providers) return [];
  const sources = new Map();
  const pending = [layer.record], seen = new Set();
  const document = state.project?.text_record_edits, encoding = state.project?.text_record_encoding;
  while (pending.length) {
    const recordId = pending.pop();
    if (!recordId || seen.has(recordId)) continue;
    seen.add(recordId);
    const record = document?.records?.[recordId];
    if (record && encoding) for (const token of textRecordRuntimeTokens(record, encoding, document)) {
      const slot = [0xFA, 0xFB, 0xFC, 0xFD].includes(token.token)
        && layer.component_slot_providers[token.operands[0]];
      if (!slot) continue;
      if (!sources.has(slot.id)) sources.set(slot.id, []);
      sources.get(slot.id).push({recordId, offset: token.offset, length: token.bytes.length});
    }
    for (const reference of indexedResource(currentTextReference(recordId).uid)?.references || [])
      if (reference.relation === 'includes-record') pending.push(indexedResource(reference.target)?.game_id);
  }
  return Object.values(layer.component_slot_providers).map((slot, index) => ({
    id: slot.id, kind: "dynamic", depth: 1, screenId, label: slot.label, fixedSlot: true,
    textComponents: true, slotIndex: index, slotSources: sources.get(slot.id) || [],
    sourceRecord: layer.record, selection: {slot_id: slot.id},
    controlsMarkup: fieldMenuPreviewSlotMarkup(slot.id),
  }));
}

export function fieldMenuPreviewSlotMarkup(id) {
  return /^(field-loadout:|vehicle-carry:|vehicle-shell:)/u.test(id)
    ? `<div data-field-menu-loadout="${esc(id)}"></div>` : '';
}

export function fieldMenuPreviewItemOverrides() {
  const context = interfacePreviewContext();
  const selections = context.itemSelections ||= new Map();
  const key = `${context.slot}:${context.actor}`;
  if (!selections.has(key)) selections.set(key, {});
  return selections.get(key);
}

export async function bindFieldMenuLoadout(root = document, {repaint = () => {}} = {}) {
  const hosts = [...root.querySelectorAll("[data-field-menu-loadout]")];
  if (!hosts.length) return;
  const project = state.project;
  const items = (await db.getResourceDocument('item-entry')).records;
  if (project !== state.project) return;
  for (const host of hosts) {
    if (!host.isConnected || host.dataset.previewItemReady) continue;
    const id = host.dataset.fieldMenuLoadout;
    const preview = document.querySelector('[data-interface-page-workbench]')?.uiResolvedPreview;
    const slot = preview?.preview_item_slots?.[id];
    if (!slot) continue;
    host.dataset.previewItemReady = '1';
    const shell = id.startsWith('vehicle-shell:');
    const vehicle = id.startsWith('vehicle-carry:') || slot.source.includes('.vehicle.');
    const categories = shell ? ['shell'] : id.includes(':equipment:') || id.startsWith('vehicle-carry:')
      ? vehicle ? TANK_EQUIPMENT_CATEGORIES : HUMAN_EQUIPMENT_CATEGORIES
      : [vehicle ? 'tank-item' : 'human-item'];
    host.innerHTML = itemPickerFieldMarkup({records: shell ? [] : items,
      shells: project.game_data.shells?.records || [], value: slot.value,
      allowedCategories: categories, emptyValue: shell ? 255 : 0, label: '预览物品',
      controlMarkup: `<input type="hidden" value="${slot.value}" data-interface-preview-item>`});
    const overrides = fieldMenuPreviewItemOverrides();
    host.querySelector('[data-interface-preview-item]').addEventListener('input', event => {
      const value = Number(event.currentTarget.value);
      overrides[slot.source] = {...overrides[slot.source], [slot.index ?? 'value']: value};
      if (shell && slot.countSource) overrides[slot.countSource] = {
        value: value === 255 ? 0 : Math.max(1, slot.count)};
      void repaint();
    });
    hydrateItemPickers(host);
    await hydrateModuleComponents(host);
  }
}
