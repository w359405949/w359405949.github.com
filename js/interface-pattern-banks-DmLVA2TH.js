import { db, fieldSubmenuCodeValues, textRecordNodeId, fieldSubmenuCodeValue } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { createSaveCurrentFieldObjects, saveVehicleAcquisitionTemplate, saveRentalVehicleTemplate, openSaveWorkspace } from './prg-loaders-BmwiQmdC.js';

// @editor-module 在页面装载期间准备同一份存档字段会话与 Working。

let callbacks = {};
function configureSaveEditorCallbacks(next) {callbacks = next;}
const saveFields = createSaveCurrentFieldObjects(state, {
  rentalVehicleTemplate: presetId => saveRentalVehicleTemplate(presetId, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  vehicleAcquisitionTemplate: vehicle => saveVehicleAcquisitionTemplate(vehicle, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  onChanged: message => callbacks.onChanged?.(message),
  onError: error => {
    state.saveError = String(error?.message || error);
    callbacks.onError?.(error);
  },
});

let preparing = null;
async function prepareWorkspace({physical}) {
  if (!saveFields.loaded()) {
    if (state.saveByteMapLoading || state.saveByteMapAttempted) return;
    state.saveByteMapLoading = true;
    state.saveByteMapAttempted = true;
    try {
      await saveFields.load(physical ? {allPages: !state.saveRomInitialBytes} : {runtime: true});
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
    } finally {
      state.saveByteMapLoading = false;
    }
  }
  if (!saveFields.loaded()) return;
  if (physical && !saveFields.complete())
    await saveFields.load({allPages: true});
  // 存档深链须补齐目标页的语义记录。
  const selectedOffset = Number(state.saveSelectedOffset ?? 0);
  if (physical && saveFields.pendingPage(selectedOffset)) {
    await saveFields.load({pageOffsets: [selectedOffset]});
  }
  // 双槽初值只从项目 Origin 语义资产生成。
  if (!state.saveRomInitialBytes) {
    try {
      if (physical && !saveFields.complete()) await saveFields.load({allPages: true});
      const initial = await saveFields.initial(state.projectRepository);
      await openSaveWorkspace(state, initial, {
        message: "已生成",
      });
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
      state.saveMessage = `ROM 初始存档生成失败：${state.saveError}`;
    }
  }
}
function prepareSaveEditorWorkspace({physical = ['save', 'bytemap-sram'].includes(state.view)} = {}) {
  if (!preparing) preparing = prepareWorkspace({physical}).finally(() => {preparing = null;});
  return preparing.then(() => physical && saveFields.loaded() && !saveFields.complete()
    ? prepareSaveEditorWorkspace({physical: true}) : undefined);
}

var saveEditorSession = /*#__PURE__*/Object.freeze({
  __proto__: null,
  configureSaveEditorCallbacks: configureSaveEditorCallbacks,
  prepareSaveEditorWorkspace: prepareSaveEditorWorkspace,
  saveFields: saveFields
});

// @editor-module 战斗菜单调用引用代码字段与当前 CHR 映射。

async function battleMenuCalls(readField, construction = state.project?.ui?.construction) {
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

// @editor-module 界面图案页分组供像素编辑与页面交换共用。
function interfacePatternBanks(group, model, vehicleSelectors = null) {
  let banks;
  if (group === 'vehicle') {
    const selectors = vehicleSelectors?.status_sprite_chr_banks;
    if (!selectors?.length) throw new TypeError('战车图案页缺少选择表');
    banks = selectors.flatMap(row => [row.chr_bank & 0xFE, (row.chr_bank & 0xFE) + 1]);
  } else {
    const previews = model?.menu_dispatch_data?.previews || [];
    const sources = group === 'menu' ? previews.filter(row => row.interface_state_id === 'field-command-menu.main')
      : previews.filter(row => row.satellite_save);
    const profiles = model?.static_assets?.chr?.profile_pattern_tables;
    if (!sources.length || !profiles) throw new TypeError('界面图案页缺少构造声明');
    const ids = sources.flatMap(row => [...(row.pattern_profiles || []),
      ...row.layers.flatMap(layer => layer.pattern_profiles || [])]);
    if (group === 'menu') {
      const dialogue = previews.find(row => row.interface_state_id === 'walking-dialogue.start');
      const sprites = dialogue?.layers?.filter(layer => layer.kind === 'generic_metasprite');
      if (!sprites?.length) throw new TypeError('菜单光标缺少图案页构造');
      const font = model.menu_dispatch_data.pattern_groups?.menu?.font_profile;
      if (!font) throw new TypeError('菜单字形缺少图案页声明');
      ids.push(...sprites.flatMap(layer => layer.pattern_profiles || []), font);
    }
    banks = [...(group === 'menu' ? model.static_assets.chr.pattern_table_web?.banks || [] : []),
      ...ids.map(id => {
        const reference = profiles.find(row => row.id === id)?.web_source;
        if (reference?.resource_id !== 'shared-chr-bank' || !Number.isInteger(reference.bank))
          throw new TypeError(`界面图案页缺少引用：${id}`);
        return reference.bank;
      })];
  }
  if (!banks.length || banks.some(bank => !Number.isInteger(bank))) throw new TypeError('界面图案页分组缺失');
  return [...new Set(banks)];
}

export { battleMenuCalls, configureSaveEditorCallbacks, interfacePatternBanks, prepareSaveEditorWorkspace, saveEditorSession, saveFields };
