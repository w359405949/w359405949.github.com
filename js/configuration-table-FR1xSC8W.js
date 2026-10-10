import { db, fieldSubmenuCodeValues, textRecordNodeId, fieldSubmenuCodeValue } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { createSaveCurrentFieldObjects, saveVehicleAcquisitionTemplate, saveRentalVehicleTemplate, openSaveWorkspace } from './physical-field-object-windows-DnQmS3eb.js';
import { esc, resourcePhysicalAddressSummary } from './interface-state-preview-Dlotqlmn.js';
import { dataTable } from './battle-result-script-runtime-BSeJpUGH.js';

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

// @editor-module 配置表只组织实例行与字段列，编辑和重置由所属字段对象提供。

function configurationPhysicalTitle(address, values = []) {
  address = address?.address || address;
  const cpu = address?.cpu_address ?? address?.cpu;
  const location = address ? [address.space?.toUpperCase(),
    Number.isInteger(address.offset) ? `偏移 $${address.offset.toString(16).toUpperCase()}` : '',
    address.bank === undefined ? '' : `bank ${address.bank}`,
    Number.isInteger(cpu) ? `CPU $${cpu.toString(16).toUpperCase().padStart(4, '0')}` : cpu || ''].filter(Boolean).join(' · ') : '';
  return [location, values.length ? values.map(value => Number(value).toString(16)
    .toUpperCase().padStart(2, '0')).join(' ') : ''].filter(Boolean).join('\n');
}

function configurationTable(options) {
  return `<div class="compact-config">${dataTable({...options, reportStatus: false})}</div>`;
}

function fieldColumnWidth(column) {
  if (column.width) return column.width;
  if (column.name.startsWith('slot:')) return 220;
  if (column.semantic?.targetModule === 'scene-header-map') return 280;
  if (column.candidates || column.reference || column.semantic?.kind === 'reference'
      || column.semantic?.kind === 'coordinate') return 220;
  return column.text || column.array || column.linked ? 180 : 100;
}

async function mountConfigurationFieldTable(host, objects, options = {}) {
  const {prefixColumns = [], physicalAddresses = new Map(), ...fieldOptions} = options;
  const columnMap = new Map();
  for (const object of objects) for (const column of object.definition.editor.columns) {
    if (column.name === 'payload_length' || columnMap.has(column.name)) continue;
    columnMap.set(column.name, column);
  }
  const columns = [...columnMap.values()];
  if (!columns.length) {host.replaceChildren(); return;}
  const rows = objects.flatMap(object => object.definition.editor.rows);
  const handles = rows.map(row => typeof row === 'string' ? row : row.handle);
  const handleWidth = Math.max(240, ...handles.map(handle => String(handle).length * 7.5 + 24));
  host.innerHTML = configurationTable({columns: [
    {key: 'handle', label: '句柄', width: handleWidth},
    ...prefixColumns,
    ...columns.map(column => ({key: column.name,
      label: column.name.startsWith('slot:') ? `项目 ${Number(column.name.slice(5)) + 1}` : column.label,
      width: fieldColumnWidth(column)})),
    {key: 'reset', label: '', width: 36, reset: true},
  ], rows: []});
  const table = host.querySelector('table');
  table.querySelector('tbody').remove();
  const containers = objects.map(object => {
    const body = host.ownerDocument.createElement('tbody');
    body.dataset.configurationObject = object.id;
    table.append(body);
    return body;
  });
  for (let index = 0; index < objects.length; index++) {
    if (!host.isConnected) return;
    const prefixCells = new Map(objects[index].definition.editor.rows.map(row => {
      const handle = typeof row === 'string' ? row : row.handle;
      return [handle, prefixColumns.map(column => `<td>${column.cell
        ? column.cell(handle) : esc(handle)}</td>`).join('')];
    }));
    const rowTitles = new Map(objects[index].definition.editor.rows.map(row => {
      const handle = typeof row === 'string' ? row : row.handle;
      return [handle, [...(physicalAddresses.get(handle) ?? resourcePhysicalAddressSummary(handle).ranges).map(address =>
        configurationPhysicalTitle(address)), ...objects[index].fields.filter(field => field.entityHandle === handle).map(field =>
        `${field.fieldName}: ${configurationPhysicalTitle(field.sourceAddress || field.physical,
          Number.isInteger(field.value) ? [field.value] : [])}`)].filter(Boolean).join('\n')];
    }));
    await objects[index].mount(containers[index], {...fieldOptions, tablePrefixCells: prefixCells, tableRowTitles: rowTitles,
      tableBody: true, tableColumns: columns.map(column => column.name)});
  }
  if (![...table.tBodies].some(body => body.rows.length)) host.replaceChildren();
}

export { battleMenuCalls, configurationPhysicalTitle, configurationTable, configureSaveEditorCallbacks, interfacePatternBanks, mountConfigurationFieldTable, prepareSaveEditorWorkspace, saveEditorSession, saveFields };
