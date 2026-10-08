// @editor-module 人物与战车状态预览共用界面状态、布局与运行数据适配。

import {esc} from "../core/dom.js";
import {runtimeWeightScript} from '../core/runtime-weight-text.js';
export const CHARACTER_STATUS_DETAIL_SCREEN_ID =
  "ui-screen:interface:character-status:state:character-status.detail";

export const VEHICLE_STATUS_DETAIL_SCREEN_ID =
  "ui-screen:interface:vehicle-status:state:vehicle-status.part-detail";
function clonePreview(preview) {
  return preview ? JSON.parse(JSON.stringify(preview)) : null;
}

function itemIdOf(value) {
  return Number(value && typeof value === 'object' ? value.item_id : value);
}

function previewWithoutStatusValues(preview) {
  const resolved = clonePreview(preview);
  delete resolved.field_submenu_vehicle;
  resolved.layers = (resolved.layers || []).filter(layer =>
    !['script', 'vehicle_portrait', 'vehicle_status_parts'].includes(layer.kind));
  return resolved;
}

// 重量提供器输出核心字体脚本，汇总行省略单位图块。
export function vehicleWeightProviderScript(internalUnits, {unit = true} = {}) {
  return runtimeWeightScript(internalUnits, {unit});
}

const nestedValue = (value, path) => String(path).split(".")
  .reduce((current, key) => current?.[key], value);

function resolveCharacterStatusUiPreview(preview, {role, roleId = role?.id, partyMoney} = {}) {
  if (!preview) return preview;
  if (!role) return previewWithoutStatusValues(preview);
  const resolved = clonePreview(preview);
  const sourcePrefix = "characters.rom_initial.roles.0.";
  for (const layer of resolved.layers || []) {
    if (role.slug) {
      const selected = path => typeof path === 'string'
        ? path.replace(/\.role\.[^.]+\./u, `.role.${role.slug}.`) : path;
      for (const key of ['provider_save_items', 'runtime_save_item'])
        if (layer[key]) layer[key].field_id = selected(layer[key].field_id);
      for (const key of ['provider_save_names', 'provider_save_values'])
        if (layer[key]) layer[key] = Object.fromEntries(Object.entries(layer[key])
          .map(([provider, path]) => [provider, selected(path)]));
      if (layer.save_equipment) layer.save_equipment = Object.fromEntries(
        Object.entries(layer.save_equipment).map(([key, path]) => [key, selected(path)]));
      for (const key of ['human_equipment_stats', 'human_equipment_comparison'])
        if (layer[key]) layer[key] = layer[key].replace(/\.role\.[^.]+$/u, `.role.${role.slug}`);
    }
    for (const [provider, path] of Object.entries(layer.provider_values || {})) {
      const field = path.startsWith(sourcePrefix) ? path.slice(sourcePrefix.length) : null;
      const value = field ? nestedValue(role, field)
        : path === "characters.rom_initial.gold.value" ? partyMoney : undefined;
      if (value !== undefined) {
        layer.provider_constants = {...layer.provider_constants, [provider]: value};
      }
      layer.provider_values[provider] = path.replace(sourcePrefix,
        `characters.rom_initial.roles.${roleId}.`);
    }
    for (const [provider, path] of Object.entries(layer.provider_scripts || {})) {
      layer.provider_scripts[provider] = path.replace("character-init:name-presets:1",
        `character-init:name-presets:${Number(roleId) + 1}`);
      if (Number(provider) === 7 && role.name_raw_hex) {
        layer.provider_script_hex = {...layer.provider_script_hex, [provider]: role.name_raw_hex};
      }
    }
    for (const sequence of [layer.provider_record_sequence,
      ...(layer.provider_record_sequences || [])].filter(Boolean)) {
      const field = sequence.source.startsWith(sourcePrefix)
        ? sequence.source.slice(sourcePrefix.length) : null;
      sequence.source = sequence.source.replace(sourcePrefix,
        `characters.rom_initial.roles.${roleId}.`);
      const items = field && nestedValue(role, field);
      if (!Array.isArray(items)) continue;
      sequence.values = items.map(slot => slot && typeof slot === "object" ? slot
        : {[sequence.record_id_field]: slot});
    }
    if (layer.equipment_slots) layer.equipment_slots = {...layer.equipment_slots,
      source: layer.equipment_slots.source?.replace("roles.0.", `roles.${roleId}.`),
      flags_source: layer.equipment_slots.flags_source?.replace("roles.0.", `roles.${roleId}.`),
      values: (role.equipment || []).map(slot => ({item_id: itemIdOf(slot)})),
      flags: role.equipment_slot_flags,
    };
  }
  return resolved;
}

export function resolveStatusUiPreview(preview, context, project, runtime = {}) {
  const gameData = project?.game_data || {};
  if (context?.kind === "character-status") {
    const roleId = context.role_slot == null ? null : Number(context.role_slot);
    const initial = gameData.characters?.rom_initial?.roles?.find(role => Number(role.id) === roleId);
    const member = runtime.partyMembers?.find(role => Number(role.slot) === roleId);
    const role = initial || member ? {...initial, ...member,
      current_hp: member?.currentHp ?? initial?.current_hp,
      max_hp: member?.maxHp ?? initial?.max_hp,
    } : null;
    return resolveCharacterStatusUiPreview(preview, {role, roleId,
      partyMoney: runtime.partyMoney ?? gameData.characters?.rom_initial?.gold?.value});
  }
  if (context?.kind === "vehicle-status") {
    if (!preview?.field_submenu_vehicle) return previewWithoutStatusValues(preview);
    const resolved = clonePreview(preview);
    const presetId = context.preview_fallback_preset_id;
    if (presetId != null) {
      resolved.field_submenu_vehicle.preset_id = Number(presetId);
      resolved.runtime_context = {...resolved.runtime_context, source: 'rom-initial'};
    } else if (context.vehicle_slot != null) {
      const slot = Number(context.vehicle_slot);
      const binding = resolved.field_submenu_vehicle;
      delete binding.preset_id;
      binding.vehicle = slot;
      resolved.layers = JSON.parse(JSON.stringify(resolved.layers), (key, value) => typeof value === 'string'
        ? value.replace(/\.vehicle\.\d+\./gu, `.vehicle.${slot}.`) : value);
    } else return previewWithoutStatusValues(preview);
    return resolved;
  }
  return preview;
}

export function resolveEndingCreditsUiPreview(preview, {record, page_index = 0} = {}, project) {
  if (!preview || !record) return preview;
  preview = project?.ui?.construction?.menu_dispatch_data?.previews?.find(candidate =>
    candidate.interface_ids?.includes("ending-credits")
      && candidate.layers?.some(layer => layer.kind === "script" && layer.record === record))
    || preview;
  return {...preview, transparent_background: true,
    layers: (preview.layers || []).map(layer => layer.kind === "script"
      ? {...layer, record, page_index, provider_scripts: {...layer.provider_scripts,
          0: "text_slots.slots.character-init:name-presets:1",
          1: "text_slots.slots.character-init:name-presets:2",
          2: "text_slots.slots.character-init:name-presets:3"}}
      : layer)};
}

/**
 * All consumers embed canonical interface screens through the same canvas
 * contract. data-role is optional because only the story player needs it.
 */
export function statusUiPreviewCanvas({
  screenId,
  kind,
  selection,
  label,
  className = "",
  role = "",
  hidden = false,
} = {}) {
  return `<canvas class="${esc(className)}" width="256" height="240"
    data-ui-editor-preview="${esc(screenId)}"
    data-status-ui-preview="${esc(kind)}"
    data-status-ui-selection="${esc(selection)}"
    ${role ? `data-role="${esc(role)}"` : ""}
    aria-label="${esc(label)}" ${hidden ? "hidden" : ""}></canvas>`;
}
