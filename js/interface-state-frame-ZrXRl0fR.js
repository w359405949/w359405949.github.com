import { esc, moduleComponentDefinition, renderModuleComponent, uiPaintPattern } from './interface-state-preview-Dlotqlmn.js';
import { facilityConfigurationLabel } from './configuration-summary-m9SZR_6_.js';
import { referencePickerMarkup, bindReferencePicker } from './timeline-player-YCH7Y-3h.js';
import { state } from './emulator-Bpa8EsFw.js';
import { saveFields } from './configuration-table-FR1xSC8W.js';
import { ensureSaveCurrentFieldObjects, playerTileFromSaveCamera } from './physical-field-object-windows-DnQmS3eb.js';
import { selectInterfaceValue, interfaceValueSelection, FIELD_GLYPH_ENTRY_PATHS, uiJsRenderSources, uiConstructionModel, resolveStatusUiPreview, interfaceItemSlotProviders, interfaceRecordProviders, uiDialogueActorName } from './ui-construction-preview-BuoQ5mM6.js';
import { fieldMenuNavigationEntry, db, uiCommandDispatchTarget, hex } from './prg-loaders-DnCSmXk9.js';
import { dedicatedUiPageForScreen } from './editor-renderer-n2nBwXk_.js';
import { interfacePreviewContext } from './element-tree-C1bWRgTl.js';
import { interfaceRegionComponents, interfaceComponentBounds, projectInterfaceRegions, intersectInterfaceBounds } from './machine-service-model-B-6y5baD.js';

function productMarkup(product) {
  const owner = product.item?.category?.owner;
  const moduleId = owner === "tank" ? "tank-item" : "human-item";
  const icon = product.item && moduleComponentDefinition(moduleId, "preview")
    ? renderModuleComponent(moduleId, "preview", {entry: product.item})
    : '';
  return `<span class="scene-shop-product${icon ? ' has-preview' : ''}">${icon}<span>${esc(product.label)}</span></span>`;
}

function shopConfigurationPreview(products, emptyLabel = '') {
  return products.length
    ? `<span class="scene-shop-products">${products.map(productMarkup).join('')}</span>`
    : emptyLabel ? `<span class="scene-shop-products-empty">${esc(emptyLabel)}</span>` : '';
}

function shopConfigurationPicker({
  family, recordId, productsForRecord, controlAttribute, controlValue = "", className = "",
  label = "售卖配置", countLabel = "项货品", emptyLabel = "没有货品",
  filterLabel = "搜索实例或货品", filterPlaceholder = "实例编号或货品名称",
  labelForRecord = record => facilityConfigurationLabel({...family, id: record.id}, record.values),
  currentLabelForRecord = null,
}) {
  const items = (family.records || []).map(record => {
    const products = productsForRecord(family, record);
    return {
      value: String(Number(record.id)),
      label: labelForRecord(record),
      currentLabel: currentLabelForRecord?.(record) || '',
      disabled: record.disabled === true,
      description: `${products.length} ${countLabel}`,
      filter: [labelForRecord(record), record.id_hex, record.id, ...products.map(product => product.label)].join(" "),
      details: shopConfigurationPreview(products, emptyLabel),
    };
  });
  return referencePickerMarkup({
    moduleId: "facility-config",
    value: String(recordId),
    label,
    items,
    className: `shop-configuration-picker ${className}`.trim(),
    filterLabel,
    filterPlaceholder,
    compact: true,
    previewPanel: true,
    controlMarkup: `<select hidden ${controlAttribute}="${esc(controlValue)}">${
      (family.records || []).map(record => `<option value="${Number(record.id)}"${
        Number(record.id) === Number(recordId) ? " selected" : ""}${record.disabled ? ' disabled' : ''}>${esc(labelForRecord(record))}</option>`).join("")
    }</select>`,
  });
}

// @editor-module 界面状态的预览实体类型由当前构建来源声明。

const ENTITY_TYPES = ['role', 'vehicle', 'rental', 'save-slot', 'wanted-record'];
const SOURCE_KEYS = ['field_sources', 'satellite_save', 'provider_values', 'provider_scripts',
  'provider_record_sequence', 'provider_record_sequences', 'provider_save_names',
  'provider_save_values', 'provider_save_items', 'save_equipment', 'runtime_save_item',
  'human_equipment_stats', 'human_equipment_comparison', 'provider_source'];

function interfacePreviewEntityTypes(preview) {
  const types = new Set(preview?.preview_entity_types || []);
  const addVehicles = () => {types.add('vehicle'); types.add('rental');};
  const source = value => {
    if (Array.isArray(value)) {value.forEach(source); return;}
    if (value && typeof value === 'object') {Object.values(value).forEach(source); return;}
    if (typeof value !== 'string') return;
    if (/^save\.slot\.\d+(?:\.|$)/u.test(value)) {
      types.add('save-slot');
      if (/\.role\./u.test(value)) types.add('role');
      if (/\.vehicle\./u.test(value)) addVehicles();
    }
    if (/^characters\.rom_initial\.roles\./u.test(value)
        || value.includes('character-init:name-presets:')) types.add('role');
    if (/^vehicles\.presets\./u.test(value)) addVehicles();
    if (value === 'runtime_context.defeat_level') {
      types.add('wanted-record'); types.add('save-slot');
    }
  };
  if (!preview) return [];
  if (preview.field_submenu_vehicle || preview.field_overview) {
    addVehicles(); types.add('save-slot');
  }
  if (preview.party_summary) {
    types.add('role'); addVehicles(); types.add('save-slot');
  }
  SOURCE_KEYS.forEach(key => source(preview[key]));
  for (const layer of preview.layers || []) {
    (layer.preview_entity_types || []).forEach(type => types.add(type));
    if (layer.runtime_save_item) {
      types.add('role'); addVehicles(); types.add('save-slot');
    }
    SOURCE_KEYS.forEach(key => source(layer[key]));
    if (layer.repair_components || layer.vehicle_mount_candidates || layer.party_vehicle_sp) {
      addVehicles(); types.add('save-slot');
    }
    if (layer.save_party_names) {
      types.add('save-slot');
      if (layer.save_party_names !== 'vehicles') types.add('role');
      if (layer.save_party_names !== 'characters') addVehicles();
    }
    if (['record:02:048', 'record:02:088'].includes(layer.record)) types.add('save-slot');
    if (layer.record === 'record:02:079') {types.add('role'); types.add('save-slot');}
  }
  return ENTITY_TYPES.filter(type => types.has(type));
}

function interfacePreviewActorType(actor, vehicles) {
  const [kind, token] = String(actor).split(':');
  if (kind.endsWith('role')) return 'role';
  if (kind === 'save-vehicle') return Number(token) < 8 ? 'vehicle' : 'rental';
  if (kind === 'rom-vehicle') return vehicles?.views?.rental?.preset_ids?.map(Number)
    .includes(Number(token)) ? 'rental' : 'vehicle';
  return null;
}

// @editor-module 界面值选择器引用人物、存档槽与击破记录。

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

function slotEntries(slots = [1, 2]) {
  return slots.map(slot => {
    const active = [1, 2].includes(slot) && saveFields.ready() && saveFields.slotStatus(slot).valid;
    const name = active ? saveFields.object(`save.slot.${slot}.role.hunter.name_codes`).nameText : '';
    const level = active ? saveFields.object(`save.slot.${slot}.role.hunter.level`).value : null;
    return {value: slot, label: `预览组 ${slot}${active ? ` · ${name} · L:${level}` : ''}`, group: 'preview', groupLabel: '预览',
      description: active ? `${name} · 等级 ${level}` : [1, 2].includes(slot) && saveFields.ready() ? '空槽' : '',
      meta: ''};
  });
}

function interfacePreviewSlotPicker({value, slots = [1, 2], controlMarkup = '', componentAttributes = ''}) {
  return referencePickerMarkup({moduleId: 'save-current', label: '预览组', value,
    compact: true, items: slotEntries(slots), controlMarkup, componentAttributes});
}

function interfacePreviewSaveActorEntries(slot, kind) {
  const entries = interfacePreviewActorEntries(slot, kind === 'role' ? ['role'] : ['vehicle', 'rental']);
  return Array.from({length: kind === 'role' ? 3 : 11}, (_, id) => {
    const entry = entries.find(row => row.value === `save-${kind}:${id}`)
      || (kind === 'role' ? entries.find(row => row.value === `rom-role:${id}`) : null);
    return {...entry, value: id, label: entry?.label || (kind === 'role' ? ROLE_LABELS[id] : `战车 ${id + 1}`),
      group: kind === 'role' ? 'role' : id < 8 ? 'player' : 'rental',
      groupLabel: kind === 'role' ? '人物' : id < 8 ? '战车' : '出租战车',
      description: entry?.description || (entry ? '' : kind === 'role' ? '未加入' : '未取得')};
  });
}

function interfacePreviewSaveActorPicker({slot, kind, value, controlMarkup = ''}) {
  return referencePickerMarkup({moduleId: 'save-current', value,
    items: interfacePreviewSaveActorEntries(slot, kind), controlMarkup,
    label: kind === 'role' ? '人物' : '战车', compact: true});
}

function interfacePreviewActorEntries(slot, entityTypes) {
  const initial = state.project?.game_data?.characters?.rom_initial?.roles || [];
  const entries = initial.map(role => ({
    value: `rom-role:${role.id}`, label: role.name, group: 'role', groupLabel: '人物',
    description: ROLE_LABELS[role.id], meta: '',
  }));
  const allowed = entries => entries.filter(entry => entityTypes.includes(
    interfacePreviewActorType(entry.value, state.project?.game_data?.vehicles)));
  if (![1, 2].includes(slot) || !saveFields.ready() || !saveFields.slotStatus(slot).valid) return allowed(entries);
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

function interfaceValueSelectionMarkup(pageId, {glyphEntryPaths = false, entityTypes = []} = {}) {
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
    ${slots ? interfacePreviewSlotPicker({value: selected.slot,
      componentAttributes: 'data-interface-value-picker="slot"',
      controlMarkup: `<select data-interface-value-slot>${[1, 2].map(slot =>
        `<option value="${slot}"${slot === selected.slot ? ' selected' : ''}>${slot}</option>`).join('')}</select>`}) : ''}
    ${wanted ? picker(pageId, 'wanted', '击破记录', entries) : ''}
    ${glyphEntryPaths ? `<label class="screen-workbench-selection"><span>进入路径</span>
      <select data-interface-glyph-entry-path>${FIELD_GLYPH_ENTRY_PATHS.map(path =>
        `<option value="${path.id}"${selected.glyph_entry_path === path.id ? ' selected' : ''}>${path.label}</option>`).join('')}</select></label>` : ''}
  </div>`;
}

async function bindInterfaceValueSelection(root, {rerender = () => {}} = {}) {
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

// @editor-module 非战斗菜单入口按 ROM 命令选择组组织。

const FIELD_MAIN_MENU_LABELS = Object.freeze([
  "对话", "乘降", "强度", "工具", "装备", "炮弹", "调查", "模式",
]);

const MAIN_DESTINATIONS = Object.freeze([
  "field-dialogue", "field-board-exit", "party-strength", "human-items",
  "human-equipment", "vehicle-equipment-shells", "field-investigation", "field-mode",
]);

const FIELD_MENU_PARENTS = Object.freeze(Object.fromEntries([
  ...MAIN_DESTINATIONS.map(id => [id, "non-battle-main-menu"]),
]));

// 画面边界与读取链见 project/evidence/reverse-engineering/field-menu-flow-steps/observations.json。

function fieldMenuEntries(pageId, construction, screens = [], {selectedScreen = null,
  allScreens = screens, choiceLabel = choice => choice.visible_text} = {}) {
  const dispatch = construction?.menu_dispatch_data;
  const preview = dispatch?.previews?.find(preview => preview.interface_state_id === selectedScreen?.interface_state_id
    && preview.interface_entry_id === state.interfacePageEntry)
    || dispatch?.previews?.find(preview => preview.interface_state_id === selectedScreen?.interface_state_id);
  const entryId = preview?.interface_entry_id;
  const activeGroups = (dispatch?.choice_groups || []).filter(group =>
    group.selection_kind && group.interface_state_ids?.includes(selectedScreen?.interface_state_id)
    && (!group.interface_entry_id || group.interface_entry_id === entryId));
  if (activeGroups.length) {
    return activeGroups.flatMap(group => {
      return group.choices.flatMap(choice => {
        const target = allScreens.find(screen => screen.state_ui_role === 'screen'
          && screen.interface_state_id === choice.target_state_id);
        const destination = target && dedicatedUiPageForScreen(target);
        if (group.selection_kind === 'dynamic-list' && !target
            && group.choice_source?.kind !== 'equipment-attribute-selector') return [];
        return [{id: `${group.id}:${choice.index}`, groupId: group.id,
          command: Number(choice.command), index: choice.index,
          sourceStateId: selectedScreen.interface_state_id, targetStateId: choice.target_state_id || null,
          label: choiceLabel(choice) || target?.interface_state || target?.label || `选项 ${choice.index + 1}`,
          pageId: destination?.interfacePage || pageId,
          screenId: target?.id || selectedScreen.id,
          entryId: choice.target_entry_id || null,
          recordId: group.record,
          action: !target,
          basis: (group.rom_chain || []).map(source => `${source.bank.toString(16).toUpperCase()}:${source.cpu}`).join(' → ')}];
      });
    });
  }
  const groupId = {"non-battle-main-menu": "commands:20-27",
    "party-strength": "commands:31-33", "field-mode": "commands:41-44"}[pageId];
  const group = dispatch?.choice_groups?.find(item => item.id === groupId);
  const screenFor = previewId => screens.find(screen => screen.state_ui_role === "screen"
    && (screen.source_preview_id === previewId
    || screen.reconstructed_preview_ids?.includes(previewId)
    || screen.visual_preview?.source_preview_ids?.includes(previewId)));
  if (group) return group.choices.map(choice => {
    const command = Number(choice.command);
    const dispatchDocument = pageId === 'field-mode' ? db.peekResourceDocument('code-module') : null;
    const targetCommand = dispatchDocument?.records?.some(row => row.id === 'code-module.ui-mode-command-handlers')
      ? uiCommandDispatchTarget(dispatchDocument, command) : command;
    const targetIndex = pageId === 'field-mode' ? targetCommand - 0x41 : choice.index;
    const main = pageId === "non-battle-main-menu";
    const previewId = pageId === "party-strength"
      ? ["command:22/31/49", "command:22/32/no-vehicle", "command:22/33"][choice.index]
      : `command:${targetCommand.toString(16).toUpperCase()}`;
    const stateId = pageId === "field-mode"
      ? ["field-command-menu.adventure-data", "field-command-menu.information-setting",
        "field-command-menu.animation-setting", "field-command-menu.audio-setting"][targetIndex]
      : pageId === "party-strength"
        ? ["character-status.detail-select", "vehicle-status.armor-vehicle-select",
          "vehicle-status.overview"][choice.index] : null;
    const screen = (stateId && screens.find(item => item.interface_state_id === stateId))
      || screenFor(previewId);
    const handler = dispatch.entries.find(item => Number(item.command) === targetCommand);
    return {id: `${pageId}:${choice.command}`, command, index: choice.index,
      label: main ? FIELD_MAIN_MENU_LABELS[choice.index] : choice.visible_text,
      ...(pageId === 'field-mode' ? {targetLabel: ['冒险数据', '情报设置', '动画设置', '音响设置'][targetIndex]} : {}),
      pageId: main ? MAIN_DESTINATIONS[choice.index] : pageId,
      screenId: main ? null : (screen || screenFor("command:27"))?.id,
      action: pageId === "field-mode" && targetIndex > 0,
      recordId: group.record,
      basis: `${dispatch.dispatcher.table_prg_offset_hex} → ${handler?.handler_bank_hex}:${handler?.handler_cpu_hex}`};
  });
  if (pageId === "field-investigation") return [{id: "field-investigation:scene",
    label: "场景调查对象", href: "?view=scenes",
    basis: "UiMainCommand26Handler → InvestigateNearbyObjectWithBankGuard"}];
  return [];
}

function fieldMenuParentEntries(construction, selectedScreen, screens = []) {
  if (!selectedScreen) return [];
  const dispatch = construction?.menu_dispatch_data;
  const entryId = state.interfacePageEntry || dispatch?.previews?.find(preview =>
    preview.interface_state_id === selectedScreen.interface_state_id)?.interface_entry_id;
  const seen = new Set();
  return (dispatch?.choice_groups || []).filter(group => group.choices.some(choice =>
    choice.target_state_id === selectedScreen.interface_state_id
    && (!choice.target_entry_id || choice.target_entry_id === entryId))).flatMap(group =>
    screens.filter(screen => group.interface_state_ids?.includes(screen.interface_state_id)
      && screen.state_ui_role === 'screen').flatMap(screen => {
      const destination = dedicatedUiPageForScreen(screen);
      const id = `${screen.id}:${group.interface_entry_id || ''}`;
      if (!destination?.interfacePage || seen.has(id)) return [];
      seen.add(id);
      return [{id, pageId: destination.interfacePage, screenId: screen.id,
        entryId: group.interface_entry_id || null,
        label: fieldMenuNavigationEntry(destination.interfacePage, screen.id, group.interface_entry_id)?.label
          || screen.interface_state || screen.label}];
    }));
}

function fieldMenuHref(entry) {
  if (entry.href) return entry.href;
  const params = new URLSearchParams({view: "interfaceui", interface: entry.pageId});
  if (entry.screenId) params.set("interfaceScreen", entry.screenId);
  if (entry.entryId) params.set('interfaceEntry', entry.entryId);
  return `?${params}`;
}

// @editor-module 非战斗菜单组件引用布局图块与文本选区。


function fieldMenuCurrentInvestigationPreview() {
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

function fieldMenuInteractionPreview(record, pageId) {
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
  return {...preview, runtime_context: {...preview.runtime_context, target: record}, layers: preview.layers.map(layer =>
    layer === body ? {...layer, record, page_index: 0,
      provider_scripts: {...layer.provider_scripts,
        ...(actorName ? {7: `text_slots.slots.${actorName.source}`} : {})}}
      : icon && origin && layer.kind === 'generic_metasprite' ? {...layer,
        anchor_x: layer.anchor_x + icon.bounds.x - origin.bounds.x,
        anchor_y: layer.anchor_y + icon.bounds.y - origin.bounds.y,
      } : {...layer})};
}

function fieldMenuRolePreview(preview, roleId) {
  return resolveStatusUiPreview(preview, {kind: "character-status", role_slot: roleId}, state.project);
}

function fieldMenuLoadoutSelection(preview, index) {
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

function fieldMenuVehiclePreview(preview, presetId, pageId, {
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

function fieldMenuIconNodes(preview, screenId) {
  return fieldMenuIcons(preview).map(icon => ({id: icon.id, kind: "image",
    label: FIELD_MAIN_MENU_LABELS[icon.index], depth: 1, screenId,
    labelMarkup: `${fieldMenuIconMarkup(icon.index)}<span>${FIELD_MAIN_MENU_LABELS[icon.index]}</span>`,
    selection: {bounds: icon.bounds},
    controlsMarkup: `<div class="field-menu-icon-inspector">${fieldMenuIconMarkup(icon.index)}
      <details data-collapse-key="field-menu-icon-location"><summary>物理位置</summary><nav aria-label="图标图块">${icon.tiles.map(tile => {
        const bank = tile < 0xC0 ? 0x0A : 0x0B;
        const localTile = tile & 0x3F;
        return `<a class="editor-inline-link" href="?view=bytemap-chr&amp;chrTile=${bank * 64 + localTile}">
          ${hex(bank, 2)}:${hex(localTile, 2)} ↗</a>`;
      }).join(" ")}</nav></details></div>`,
  }));
}

async function paintFieldMenuIcons(root = document) {
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

function startupLoadNodes(screenId) {
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

// @editor-module 组件树按区域及领域提供的组件声明保留身份与字段引用。

async function interfaceStateTree({label, regions, includeEmpty = true}, describeRegion) {
  const widgets = [{id: 'screen', label, kind: 'screen', depth: 0}];
  for (const region of regions || []) {
    if (!region.visible || !includeEmpty && !region.components?.length && !region.slots?.length && !region.children?.length) continue;
    const components = interfaceRegionComponents(region);
    const declaration = describeRegion ? await describeRegion(region, components, widgets) : region;
    widgets.push({id: region.id, label: `${region.label}窗口`, kind: 'layout', depth: 1,
      parentId: 'screen', layer: region.layer, clip: region.clip,
      region: region.id, bounds: interfaceComponentBounds(declaration.layoutComponents || []) || region.bounds, components});
    const parents = new Map([[1, region.id]]);
    for (const child of declaration.children || []) {
      const depth = child.depth ?? 2;
      widgets.push({...child, depth, region: child.region ?? region.id,
        parentId: child.parentId ?? parents.get(depth - 1) ?? region.id, layer: region.layer, clip: region.clip});
      parents.set(depth, child.id);
    }
  }
  return widgets;
}

// @editor-module 状态画面按区域层次合成领域绘制结果。

async function paintInterfaceStateFrame(canvas, regions, {resolve, paint, read, decorate, isCurrent, background = null}) {
  const frame = canvas.ownerDocument.createElement('canvas');
  frame.width = canvas.width; frame.height = canvas.height;
  const context = frame.getContext('2d');
  context.fillStyle = '#000'; context.fillRect(0, 0, frame.width, frame.height);
  if (background) context.putImageData(new ImageData(background.data, background.width, background.height), 0, 0);
  const projected = await projectInterfaceRegions(regions, {resolve,
    paint: async source => {
      const surface = canvas.ownerDocument.createElement('canvas');
      await paint(surface, source);
      return surface;
    }, read, isCurrent,
    decorate: (region, details) => {
      const bounds = intersectInterfaceBounds(region.bounds, region.clip || region.bounds);
      if (region.visible && bounds) {
        const {x, y, width, height} = bounds;
        context.drawImage(details.surface, x, y, width, height, x, y, width, height);
      }
      return decorate ? decorate(region, details) : region;
    }});
  if (!projected || !isCurrent()) return null;
  canvas.getContext('2d').drawImage(frame, 0, 0);
  return projected;
}

export { FIELD_MENU_PARENTS, bindInterfaceValueSelection, fieldMenuCurrentInvestigationPreview, fieldMenuEntries, fieldMenuHref, fieldMenuIconNodes, fieldMenuInteractionPreview, fieldMenuLoadoutSelection, fieldMenuParentEntries, fieldMenuRolePreview, fieldMenuVehiclePreview, interfacePreviewActorEntries, interfacePreviewEntityTypes, interfacePreviewSaveActorEntries, interfacePreviewSaveActorPicker, interfacePreviewSlotPicker, interfaceStateTree, interfaceValueSelectionMarkup, paintFieldMenuIcons, paintInterfaceStateFrame, shopConfigurationPicker, startupLoadNodes };
