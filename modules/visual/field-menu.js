// @editor-module 非战斗菜单组件引用布局图块与文本选区。

import {hex} from "../../core/dom.js";
import {FIELD_MAIN_MENU_LABELS} from "../../core/field-menu-tree.js";
import {state} from "../../core/state.js";
import {interfacePreviewContext} from '../../core/interface-preview-context.js';
import {saveFields} from '../../core/save-editor-session.js';
import {playerTileFromSaveCamera} from '../../core/save-position.js';
import {uiPaintPattern} from "../../render/nes.js";
import {uiConstructionModel, uiDialogueActorName, uiJsRenderSources} from "./ui-construction-preview.js";
import {resolveStatusUiPreview} from "../../views/status-ui.js";
import {interfaceRecordProviders, interfaceItemSlotProviders} from '../../render/interface-slots.js';

export function fieldMenuCurrentInvestigationPreview() {
  const slot = interfacePreviewContext().slot;
  if (!saveFields.ready() || !saveFields.slotStatus(slot).valid) return null;
  const prefix = `save.slot.${slot}`;
  const scene = saveFields.object(`${prefix}.scene_id`).value;
  const position = playerTileFromSaveCamera(saveFields.object(`${prefix}.camera_x`).value,
    saveFields.object(`${prefix}.camera_y`).value);
  for (let vehicle = 10; vehicle >= 0; vehicle--) {
    const target = `${prefix}.field_object.${vehicle}`;
    if (saveFields.object(`${target}.scene_id`).value !== scene
        || saveFields.object(`${target}.x`).value !== position.x
        || saveFields.object(`${target}.y`).value !== position.y) continue;
    const source = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
      item.interface_state_id === 'walking-dialogue.start');
    const record = source?.vehicle_investigation?.record;
    if (!record) throw new TypeError('战车调查缺少文字调用');
    const preview = fieldMenuInteractionPreview(record, 'field-investigation');
    if (!preview) return null;
    return {...preview, runtime_context: {...preview.runtime_context,
      save_slot: slot, investigation_target: target, scene, ...position},
      vehicle_investigation: true,
      layers: preview.layers.filter(layer => !layer.interaction_prefix)
        .map(layer => layer.dialogue_runtime
        ? {...layer, provider_scripts: {}, provider_save_names: {
          [interfaceRecordProviders(layer, [0xE8, 0xFC, 0xFD])[0]]: `${prefix}.vehicle.${vehicle}.name_codes`}} : layer)};
  }
  return null;
}

export function fieldMenuInteractionPreview(record, pageId) {
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.id === 'constructor:field-dialogue-no-target');
  if (!preview) return null;
  const body = preview.layers.findLast(layer => layer.kind === 'script');
  if (!body) return null;
  const icons = fieldMenuIcons(preview);
  const menuIndex = FIELD_MAIN_MENU_LABELS.indexOf(pageId === 'field-investigation' ? '调查' : '对话');
  const icon = icons.find(item => item.index === menuIndex);
  const origin = icons[0];
  const actorName = uiDialogueActorName(Number(state.fieldMenuRole || 0));
  return {...preview, runtime_context: {target: record}, layers: preview.layers.map(layer =>
    layer === body ? {...layer, record, page_index: 0,
      provider_scripts: {...layer.provider_scripts,
        ...(actorName ? {7: `text_slots.slots.${actorName.source}`} : {})}}
      : icon && origin && layer.kind === 'generic_metasprite' ? {...layer,
        anchor_x: layer.anchor_x + icon.bounds.x - origin.bounds.x,
        anchor_y: layer.anchor_y + icon.bounds.y - origin.bounds.y,
      } : {...layer})};
}

export function fieldMenuRolePreview(preview, roleId) {
  return resolveStatusUiPreview(preview, {kind: "character-status", role_slot: roleId}, state.project);
}

export function fieldMenuLoadoutSelection(preview, index) {
  for (const layer of (preview?.layers || []).map(layer => interfaceItemSlotProviders(layer))) {
    const savedProvider = layer.provider_save_items?.providers?.[index];
    if (savedProvider !== undefined) return {record_id: `save-item-provider:${savedProvider}`};
    const sequences = [...(layer.provider_record_sequences || []),
      ...(layer.provider_record_sequence ? [layer.provider_record_sequence] : [])];
    const provider = sequences.find(sequence => sequence.providers?.[index] !== undefined)
      ?.providers[index];
    if (provider !== undefined) return {record_id: `provider:${provider}`};
  }
  return null;
}

export function fieldMenuVehiclePreview(preview, presetId, pageId, {
  source = interfacePreviewContext().actor.startsWith('save-vehicle:') ? 'save' : 'rom',
} = {}) {
  if (!preview) return preview;
  if (source === 'save' && preview.layers?.some(layer => layer.runtime_save_item)) {
    const slot = interfacePreviewContext().slot;
    const vehicle = Number(presetId);
    preview = {...preview, runtime_context: {...preview.runtime_context, save_slot: slot},
      layers: preview.layers.map(layer => {
        if (!layer.runtime_save_item) return layer;
        const {field_id, index, index_context, ...binding} = layer.runtime_save_item;
        if (field_id?.includes('.vehicle.')) return {...layer, runtime_save_item: {
          ...layer.runtime_save_item, field_id: field_id.replace(/^save\.slot\.[12]\./u, `save.slot.${slot}.`)
            .replace(/\.vehicle\.\d+\./gu, `.vehicle.${vehicle}.`)}};
        return {...layer, runtime_save_item: {...binding,
          field_ids: Array.from({length: 8}, (_, item) => `save.slot.${slot}.vehicle.${vehicle}.item.${item}`),
          index, index_context}};
      })};
  }
  if (preview.field_submenu_vehicle) {
    if (source === 'save') {
      const vehicle = Number(presetId);
      const slot = interfacePreviewContext().slot;
      const resolved = JSON.parse(JSON.stringify(preview), (key, value) => typeof value === 'string'
        ? value.replace(/^save\.slot\.[12]\./u, `save.slot.${slot}.`)
          .replace(/\.vehicle\.\d+\./gu, `.vehicle.${vehicle}.`) : value);
      const {preset_id, ...binding} = resolved.field_submenu_vehicle;
      resolved.field_submenu_vehicle = {...binding, vehicle};
      resolved.runtime_context = {...resolved.runtime_context, save_slot: slot};
      return resolved;
    }
    const preset = state.project?.game_data?.vehicles?.presets
      ?.find(row => Number(row.preset_id) === Number(presetId));
    if (!preset) throw new TypeError(`战车预设 ${presetId} 不存在`);
    return {...preview,
      field_submenu_vehicle: {...preview.field_submenu_vehicle, preset_id: Number(presetId)},
      runtime_context: {...preview.runtime_context, source: "rom-initial"}};
  }
  return preview;
}

function fieldMenuIcons(preview) {
  const layer = preview?.layers?.find(item => item.kind === "layout");
  if (!layer) return [];
  const layout = uiConstructionModel().static_assets?.layouts?.find(item => item.id === layer.record);
  const cells = new Map(layout?.render?.logical_tile_writes || []);
  return Array.from({length: 8}, (_, index) => {
    const column = 2 + (index % 2) * 5;
    const row = 2 + Math.floor(index / 2) * 2;
    const positions = Array.from({length: 8}, (_, cell) => (row + Math.floor(cell / 4)) * 32 + column + cell % 4);
    return {id: `field-menu-icon:${index}`, index, recordId: layer.record,
      tiles: positions.map(position => cells.get(position)),
      bounds: {x: column * 8, y: (row + Number(layer.shift || 0) / 32) * 8,
        width: 32, height: 16}};
  });
}

function fieldMenuIconMarkup(index) {
  return `<canvas width="32" height="16" data-field-menu-icon="${index}"
    aria-label="${FIELD_MAIN_MENU_LABELS[index]}"></canvas>`;
}

export function fieldMenuIconNodes(preview, screenId) {
  return fieldMenuIcons(preview).map(icon => ({id: icon.id, kind: "image",
    label: FIELD_MAIN_MENU_LABELS[icon.index], depth: 1, screenId,
    labelMarkup: `${fieldMenuIconMarkup(icon.index)}<span>${FIELD_MAIN_MENU_LABELS[icon.index]}</span>`,
    selection: {bounds: icon.bounds},
    controlsMarkup: `<div class="field-menu-icon-inspector">${fieldMenuIconMarkup(icon.index)}
      <details><summary>物理位置</summary><nav aria-label="图标图块">${icon.tiles.map(tile => {
        const bank = tile < 0xC0 ? 0x0A : 0x0B;
        const localTile = tile & 0x3F;
        return `<a class="editor-inline-link" href="?view=bytemap-chr&amp;chrTile=${bank * 64 + localTile}">
          ${hex(bank, 2)}:${hex(localTile, 2)} ↗</a>`;
      }).join(" ")}</nav></details></div>`,
  }));
}

export async function paintFieldMenuIcons(root = document) {
  const canvases = [...root.querySelectorAll("[data-field-menu-icon]")];
  if (!canvases.length) return;
  const project = state.project;
  const {patterns, corePatterns} = await uiJsRenderSources();
  if (state.project !== project) return;
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.interface_state_id === 'field-command-menu.main');
  if (!preview) throw new TypeError('主菜单图标缺少窗口构造');
  const icons = fieldMenuIcons(preview);
  for (const canvas of canvases) {
    if (!canvas.isConnected) continue;
    const icon = icons[Number(canvas.dataset.fieldMenuIcon)];
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(32, 16);
    icon.tiles.forEach((tile, index) => uiPaintPattern(pixels.data, 32, 16,
      patterns, corePatterns, tile, index % 4 * 8, Math.floor(index / 4) * 8,
      [], [0x0F, 0x30, 0x10, 0x00]));
    context.imageSmoothingEnabled = false;
    context.putImageData(pixels, 0, 0);
  }
}

export function startupLoadNodes(screenId) {
  const preview = uiConstructionModel().menu_dispatch_data?.previews?.find(item =>
    item.interface_state_id === 'save-management.file-menu');
  const recordId = preview?.layers?.find(layer => layer.save_slot_values && !layer.glyph_cache_only)?.record;
  if (!recordId) throw new TypeError('读档菜单缺少正文构造');
  return [
    {id: "startup:title", kind: "text", label: "标题", depth: 1, screenId,
      recordId, ranges: [{offset: 2, length: 9}]},
    ...[{label: "存档槽 1", offset: 13, length: 11,
        ranges: [{offset: 13, length: 4}, {offset: 19, length: 5}]},
      {label: "存档槽 2", offset: 26, length: 11,
        ranges: [{offset: 26, length: 4}, {offset: 32, length: 5}]},
      {label: "继续命令", offset: 41, length: 4},
      {label: "移动记录命令", offset: 50, length: 8},
      {label: "重新开始命令", offset: 60, length: 8},
      {label: "删除记录命令", offset: 72, length: 6}].map((entry, index) => ({
        id: `startup:entry:${index}`, kind: "text", label: entry.label,
        depth: 1, screenId, recordId, editorMode: "exact",
        ranges: entry.ranges || [{offset: entry.offset, length: entry.length}],
        selection: {record_id: recordId, ranges: [{offset: entry.offset, length: entry.length}]},
      })),
  ];
}
