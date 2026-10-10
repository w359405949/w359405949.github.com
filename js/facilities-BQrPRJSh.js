import { replaceHistoryUrl, currentViewUrl, interfacePreviewContext, pageHeaderTabs, pageHeaderControls } from './element-tree-C1bWRgTl.js';
import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { currentTextReferenceLink, esc, prepareModuleComponent, renderModuleComponent, hydrateModuleComponents, currentTextReference, audioCommandLabel, resourceForwardReferenceCell } from './interface-state-preview-Dlotqlmn.js';
import { handleMarkup } from './record-6_wsSDi2.js';
import { eventFlagReferenceMarkup, eventFlagTextMarkup } from './scene-encounter-probabilities-C0m_IdC-.js';
import { state, resolveTab } from './emulator-Bpa8EsFw.js';
import { createSaveCurrentFieldObjects, ensureSaveCurrentFieldObjects } from './physical-field-object-windows-DnQmS3eb.js';
import { vendingServiceResponsePreview, controllerServicePreview, vendingServiceResponseEntries } from './service-preview-scene-CPwiqon9.js';
import { fieldSubmenuCodeSource, db, fieldSubmenuCodeValues, fieldSubmenuCodeValue, UI_FACILITY_PARAMETER_RESOURCE_IDS, hiddenTeleportDestination, HIDDEN_TELEPORT_RESOURCE_ID, FIELD_SUBMENU_CODE_PARAMETERS, textRecordRuntimeTokens, textRecordEditorTokens, textRecordComponents, hex, ITEM_CATEGORIES } from './prg-loaders-DnCSmXk9.js';
import { controllerTargetsMarkup } from './system-state-model-zPjxuFk6.js';
import { controllerSceneHref, controllerHref } from './battle-result-state-machine-BbK2hSud.js';
import { resolveFacilityScreenPreview } from './ui-construction-preview-BuoQ5mM6.js';
import { facilityConfigurationLabel } from './configuration-summary-m9SZR_6_.js';
import './components-D0Rv67Tu.js';
import { shopConfigurationPicker } from './interface-state-frame-ZrXRl0fR.js';
import { bindReferencePicker } from './timeline-player-YCH7Y-3h.js';
import { configurationPhysicalTitle, mountConfigurationFieldTable, configurationTable } from './configuration-table-FR1xSC8W.js';
import { itemPickerFieldMarkup } from './attack-chr-tile-selector-Bv5xCQyz.js';
import './components-DZ4_ZF2v.js';
import './device-service-context-B5xDhK9J.js';
import { bindFacilityFieldControls, commitShopConfiguration, facilityOriginalResetControl } from './shops-CokyNsz7.js';
import { bindGameUiWorkbench, selectedGameUiWorkbenchNode, gameUiWorkbenchPreviewSelection, renderGameUiWorkbench } from './game-ui-workbench-Dsg65sF-.js';
import { serviceFamilyPage } from './editor-renderer-n2nBwXk_.js';
import { bindInterfacePageWorkbench, resolveInterfacePageEditorPreview, interfacePageModel, renderInterfacePage } from './interface-pages-Z6ds5_V3.js';
import './baseline-assembly-DW8BWbDB.js';
import './global-random-DAuRNoyj.js';
import './battle-result-script-runtime-BSeJpUGH.js';
import './overview-BWR5QCHz.js';
import './page-package-inputs-Dzxj7YGf.js';
import './page-runtime-paths-BvtuMnH7.js';
import './machine-service-model-B-6y5baD.js';
import './story-component-labels-CSjCRgXX.js';
import './components-DbJXuRMn.js';
import './field-object-editor-Blro4OF0.js';
import './field-address-table-BnL1Mgdy.js';
import './text-record-structure-editor-BB8pdofu.js';
import './service-pages-0AX3Py0f.js';
import './components-DsypHVsJ.js';
import './vehicles-WSVbAWyX.js';
import './entity-detail-r8jOlBq7.js';
import './vehicle-field-session-CTl5UxXM.js';
import './characters-9PuC5Hfq.js';
import './battle-actors-Ci6buYr0.js';
import './actor-appearance-BNElc4Fg.js';
import './battle-scene-composer-HUmwkrPp.js';
import './battle-simulation-player-CgsqKnB3.js';
import './sram-WFVGNGUM.js';
import './emulator-vuonD__1.js';
import './asset-compiler-B1MJV5At.js';
import './chr-Davc17Y-.js';
import './monsters-Ws_LrYb6.js';
import './encounter-ybfuhcXm.js';
import './preview-sound-CiEAOXPD.js';
import './visual-components-V1BURRSa.js';
import './charset-j6-kYKbE.js';
import './components-BIpJ3l3a.js';
import './components-DFg4zDq1.js';
import './scene-actor-interaction-picker-D6QFBEMg.js';
import './interaction-components-DjtMdVmW.js';
import './document-controls-C8YiQAPz.js';
import './text-record-controls-Ca9jGqUd.js';
import './components-D8Tpyo4s.js';
import './generic-shop-BGLHBrHc.js';
import './machine-state-controller-BC0tIHJk.js';
import './system-state-controller-CY2WlfQd.js';

// @editor-module 设施配置与设备帧交给所属整屏构造呈现。

function configurablePreview(preview, kind, configuration) {
  if (!preview) return null;
  if (preview.facility_screen?.kind !== kind)
    throw new TypeError(`设施预览缺少 ${kind} 构造来源`);
  return {...structuredClone(preview), live_configuration: configuration};
}

function buildJukeboxLivePreview(preview, values) {
  return configurablePreview(preview, 'jukebox', {family_id: 0x0A, values: [...values]});
}

function buildTeleportTerminalPreview(preview, destinations, options = {}) {
  const dialogue = options.dialogue;
  if (!dialogue?.text_record) throw new TypeError('传送终端缺少当前流程文字');
  const result = configurablePreview(preview, 'teleport', {
    destinations: structuredClone(destinations),
    active_destination_ids: options.activeDestinationIds,
    dialogue_state_id: dialogue.id, dialogue_record: dialogue.text_record,
    dialogue_page_index: dialogue.page_index,
  });
  return {...result, layers: result.layers.map(layer => layer.teleport_body
    ? {...layer, record: dialogue.text_record, page_index: dialogue.page_index} : layer)};
}

function buildVendingLivePreview(preview, familyId, values) {
  const result = configurablePreview(preview, 'vending', {family_id: Number(familyId), values: [...values]});
  if (Number(familyId) !== (result.facility_screen.configuration_family
    ?? Number.parseInt(result.facility_screen.resource_id?.split(':')[1], 16) - 0x10))
    throw new TypeError('售货机配置族与所属构造不一致');
  return result;
}

// @editor-module 设施页面引用所属配置、界面构造与当前存档字段。


function facilityDisplayLabel(facility) {
  if (facility?.id === "frog-race") return "青蛙赛跑";
  if (facility?.id === "computer-controller") return "计算机控制器";
  return facility?.label || "设施";
}

function facilityConfigurationUid(facilityId, configurationId) {
  return `ui-facility:${facilityId}:config:${Number(configurationId).toString(16).toUpperCase().padStart(2, "0")}`;
}

function facilityParameterMarkup(facilityId) {
  return `<div data-facility-parameter-fields="${esc(facilityId)}"></div>`;
}

async function mountFacilityParameters() {
  for (const host of document.querySelectorAll('[data-facility-parameter-fields]')) {
    if (host.dataset.facilityParametersReady) continue;
    try {
      const facilityId = host.dataset.facilityParameterFields;
      const resources = UI_FACILITY_PARAMETER_RESOURCE_IDS.filter(id => id.startsWith(`ui-facility:${facilityId}:`));
      const objects = (await Promise.all(resources.map(id => db.getFieldObjects(id)))).flat();
      if (!host.isConnected) return;
      const facility = state.project.facilities.facilities.find(row => row.id === facilityId);
      const configuration = facility.configuration;
      const idOf = handle => Number.parseInt(handle.split(':').at(-1), 16);
      const prefixColumns = facilityId === 'teleport-terminal' ? [
        {key: 'destination', label: '目的地', width: 180, cell: handle => {
          const row = configuration.destinations.find(row => Number(row.id) === idOf(handle));
          return row ? currentTextReferenceLink(row.text_record) : '隐藏目的地';
        }},
        {key: 'flag', label: '开放标志', width: 240, cell: handle => {
          const row = configuration.destinations.find(row => Number(row.id) === idOf(handle));
          if (row) return eventFlagReferenceMarkup(row.availability_flag);
          const hidden = hiddenTeleportDestination(state.project);
          return `${hidden.trigger_flags.map(flag => `${eventFlagReferenceMarkup(flag.id)} = ${flag.value}`).join(' 且 ')} → ${eventFlagReferenceMarkup(hidden.set_flag)} = 1`;
        }},
      ] : [{key: 'instances', label: '场景实例', width: 340, cell: handle =>
        facilityInstanceCell(configuration.variants.find(row => Number(row.id) === idOf(handle))?.instances)}];
      const hidden = facilityId === 'teleport-terminal' && hiddenTeleportDestination(state.project);
      const physicalAddresses = new Map(hidden ? [[HIDDEN_TELEPORT_RESOURCE_ID,
        [hidden.scene_id_address, hidden.coordinate_x_address, hidden.coordinate_y_address]]] : []);
      await mountConfigurationFieldTable(host, objects, {prefixColumns, physicalAddresses});
      host.dataset.facilityParametersReady = 'true';
    } catch (error) {
      editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
      host.innerHTML = `<p role="alert">${esc(error.message || error)}</p>`;
      host.dataset.facilityParametersReady = 'error';
    }
  }
}

function facilityConfigurationEntry(familyId) {
  return (state.project?.facilities?.configuration_loader?.pointer_entries || [])
    .find(entry => Number(entry.family_id) === Number(familyId)) || null;
}

function facilityConfigurationRecord(familyId, recordId) {
  const entry = facilityConfigurationEntry(familyId);
  const records = entry?.records || [];
  return records.find(record => Number(record.id) === Number(recordId))
    || records[0] || null;
}

function configurationDraftKey(familyId, recordId) {
  return `${Number(familyId)}:${Number(recordId)}`;
}

/**
 * 专用设施页与通用 shops 编辑器共用同一份草稿。这里绝不回读
 * facility-config.variants：那是生成期说明投影，working 保存后不会更新。
 */
function facilityConfigurationDraftValues(familyId, recordId) {
  const record = facilityConfigurationRecord(familyId, recordId);
  if (!record) return [];
  const key = configurationDraftKey(familyId, record.id);
  return state.shopView?.[key] || record.values || [];
}

function selectedConfigurationRecord(familyId, requestedId) {
  const entry = facilityConfigurationEntry(familyId);
  const record = facilityConfigurationRecord(familyId, requestedId);
  return {entry, record};
}

function facilitySaveToolbar() {
  return `<div class="data-editor-toolbar">
    <p id="shop-save-state" ${state.shopMessage ? "" : "hidden"}>${esc(
      state.shopMessage || ""
    )}</p>
  </div>`;
}

function optionList(records, selected, labelOf, nameFirst = false) {
  const value = Number(selected);
  const options = (records || []).map(record => {
    const id = Number(record.id);
    return `<option value="${id}" ${id === value ? "selected" : ""}>${esc(
      nameFirst ? `${labelOf(record)} · ${hex(id, 2)}` : `${hex(id, 2)} · ${labelOf(record)}`
    )}</option>`;
  });
  if (!(records || []).some(record => Number(record.id) === value)) {
    options.unshift(`<option value="${value}" selected>${esc(`${hex(value, 2)} · 表外值`)}</option>`);
  }
  return options.join("");
}

function shopSlotAttributes(familyId, recordId, slot) {
  return `data-shop-family="${Number(familyId)}" data-shop-record="${Number(recordId)}" data-shop-slot="${Number(slot)}"`;
}

function vendingItemPicker(familyId, recordId, slot, value) {
  const dual = familyId === 13 && slot < 6;
  const shell = [12, 13].includes(familyId) && slot < 6;
  const records = shell ? state.project?.game_data?.shells?.records || []
    : state.project?.game_data?.items?.records || [];
  const overflow = familyId === 13 && slot < 6
    ? {id: 14, name: currentTextReference('record:0D:014').label || 'record:0D:014'} : null;
  return itemPickerFieldMarkup({
    records: dual ? state.project?.game_data?.items?.records || [] : shell ? [] : records,
    shells: shell ? records : [], value,
    extraChoices: overflow ? [{value: '14', label: overflow.name, group: 'vending-values', groupLabel: '商品'}] : [],
    label: slot === 12 ? "抽奖奖品" : `商品 ${slot + 1}`,
    allowedCategories: dual ? ["shell", "human-item"] : shell ? ["shell"]
      : slot === 12 ? ITEM_CATEGORIES : ["human-item"],
    emptyValue: shell ? null : 0,
    controlMarkup: `<select class="shop-slot" ${shopSlotAttributes(familyId, recordId, slot)}>${
      optionList(overflow ? [...records, overflow] : records, value, item => item.name || "未命名")}</select>`,
  });
}

function renderJukeboxConfigurationEditor() {
  const {entry, record} = selectedConfigurationRecord(0x0A, state.jukeboxPreviewConfiguration);
  if (!entry || !record) return "";
  state.jukeboxPreviewConfiguration = Number(record.id);
  const count = Math.max(...entry.records.map(row => facilityConfigurationDraftValues(0x0A, row.id).length));
  return `<div data-facility-original-scope>${configurationTable({columns: [
      {key: 'handle', label: '句柄', width: 292, cell: row =>
        `<span title="${esc(configurationPhysicalTitle(row.address, facilityConfigurationDraftValues(0x0A, row.id)))}">${handleMarkup(facilityConfigurationUid('jukebox', row.id), {title: null})}</span>`},
      ...Array.from({length: count}, (_, slot) => ({key: `track:${slot}`, label: `曲目 #${slot + 1}`, width: 180,
        cell: row => {
          const values = facilityConfigurationDraftValues(0x0A, row.id);
          return slot < values.length ? `<div data-jukebox-track="${slot}"><input type="number" class="shop-slot" hidden min="0" max="255" value="${Number(values[slot])}" ${shopSlotAttributes(0x0A, row.id, slot)}></div>` : '';
        }})),
      {key: 'reset', label: '', reset: true, width: 36, cell: row =>
        facilityOriginalResetControl({kind: 'record', familyId: 0x0A, recordId: row.id})},
    ], rows: entry.records, rowId: row => facilityConfigurationUid('jukebox', row.id)})}</div>`;
}

async function mountJukeboxTracks() {
  const hosts = [...document.querySelectorAll('[data-jukebox-track]')];
  if (!hosts.length) return;
  const entry = facilityConfigurationEntry(0x0A);
  const prepared = await prepareModuleComponent('audio-command', 'reference', {
    allowedValues: (entry.value_namespace?.goods || []).map(good => Number(good.value)),
  });
  for (const host of hosts) {
    if (!host.isConnected) continue;
    const control = host.querySelector('.shop-slot');
    host.innerHTML = renderModuleComponent('audio-command', 'reference', {...prepared,
      value: control.value, label: `曲目 #${Number(host.dataset.jukeboxTrack) + 1}`,
      picker: {compact: true, previewPanel: true},
      controlMarkup: control.outerHTML,
    });
    host.querySelector('.shop-slot').replaceWith(control);
    await hydrateModuleComponents(host);
  }
}

function vendingFamilyAndRecord() {
  const familyId = [11, 12, 13].includes(Number(state.vendingPreviewFamily)) ? Number(state.vendingPreviewFamily) : 12;
  const selected = selectedConfigurationRecord(
    familyId, state.vendingPreviewConfiguration
  );
  state.vendingPreviewFamily = familyId;
  if (selected.record) state.vendingPreviewConfiguration = Number(selected.record.id);
  return {familyId, ...selected};
}

function vendingUnitPrice(familyId, productId) {
  const records = Number(productId) < 14 ? state.project?.game_data?.shells?.records || []
    : state.project?.game_data?.items?.records || [];
  const record = Number(productId) === 14 ? null
    : records.find(item => Number(item.id) === Number(productId));
  const rawValue = record?.price?.value;
  const value = Number(rawValue);
  if (rawValue !== null && rawValue !== undefined && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function renderVendingConfigurationEditor() {
  const {familyId, entry, record} = vendingFamilyAndRecord();
  if (!entry || !record) return "";
  const valuesOf = row => facilityConfigurationDraftValues(familyId, row.id);
  const columns = [
    {key: 'handle', label: '句柄', width: 348, cell: row => {
      const variant = state.project.facilities.facilities.find(item => item.id === 'vending-machine')
        ?.configuration.variants.find(item => Number(item.family_id) === familyId && Number(item.family_configuration_id) === Number(row.id));
      const handle = variant ? facilityConfigurationUid('vending-machine', variant.id)
        : `application-config-instance:${Number(familyId).toString(16).toUpperCase().padStart(2, '0')}:${Number(row.id).toString(16).toUpperCase().padStart(2, '0')}`;
      return `<span data-vending-configuration="${Number(row.id)}" data-configuration-physical title="${esc(configurationPhysicalTitle(row.address, valuesOf(row)))}">${handleMarkup(handle, {title: null})}</span>`;
    }},
    ...Array.from({length: 6}, (_, slot) => ({key: `product:${slot}`, label: `商品 ${slot + 1}`, width: 220, cell: row => {
      const values = valuesOf(row), product = Number(values[slot]), raw = Number(values[slot + 6] || 0);
      const amount = familyId === 13 ? raw : raw & 127;
      const price = vendingUnitPrice(familyId, product);
      return `<div${product === 14 ? ` data-vending-overflow-price="${amount}" data-vending-price-title` : ''}
        title="${price == null ? '' : `${price & 255}G × ${amount} = ${(price & 255) * amount}G`}">${vendingItemPicker(familyId, row.id, slot, product)}</div>`;
    }})),
    ...Array.from({length: 6}, (_, slot) => ({key: `amount:${slot}`, label: `数量 ${slot + 1}`, width: 90, cell: row => {
      const raw = Number(valuesOf(row)[slot + 6] || 0);
      return `<input class="inline-data-input configuration-amount" type="number" min="0" max="${familyId === 13 ? 255 : 127}" value="${familyId === 13 ? raw : raw & 127}"
        data-vending-amount ${shopSlotAttributes(familyId, row.id, slot + 6)}>`;
    }})),
    ...(familyId === 13 ? [] : Array.from({length: 6}, (_, slot) => ({key: `special:${slot}`, label: `特殊 ${slot + 1}`, width: 60, cell: row =>
      `<input type="checkbox" aria-label="特殊 ${slot + 1}" data-vending-special ${shopSlotAttributes(familyId, row.id, slot + 6)} ${Number(valuesOf(row)[slot + 6]) & 128 ? 'checked' : ''}>`}))),
    {key: 'prize', label: '奖品', width: 220, cell: row => valuesOf(row).length > 12
      ? vendingItemPicker(familyId, row.id, 12, valuesOf(row)[12]) : ''},
    {key: 'reset', label: '', width: 210, reset: true, cell: row => `<div class="shop-instance-actions">${
      Array.from({length: 6}, (_, slot) => facilityOriginalResetControl({kind: 'vending-pair', familyId, recordId: row.id, slot})).join('')}${valuesOf(row).length > 12
      ? facilityOriginalResetControl({kind: 'vending-prize', familyId, recordId: row.id}) : ''}</div>`},
  ];
  return `<div data-facility-original-scope>${configurationTable({columns, rows: entry.records, rowId: row => row.id})}</div>`;
}


function facilityInstanceCell(instances) {
  if (!(instances || []).length) return `<span class="resource-empty">ROM 中未引用</span>`;
  return `<div class="table-cell-stack">${instances.map(instance => {
    const uid = instance.scene_object_uid;
    return `<button class="resource-inline-link" type="button" data-resource-target="${esc(uid)}">场景 ${esc(instance.scene_id_hex)} · (${instance.x}, ${instance.y}) · 调查点 ${esc(instance.point_id_hex)}</button>`;
  }).join("")}</div>`;
}


function renderFacilityRoutines(facility) {
  if (!facility?.entrypoints?.length) return "";
  return configurationTable({columns: [
    {key: 'handle', label: '句柄', width: 370, cell: row => `<span title="${esc(row.name)}">${handleMarkup(`ui-facility:${facility.id}:routine:${Number(row.index).toString(16).toUpperCase().padStart(2, '0')}`, {title: null})}</span>`},
    {key: 'function', label: '功能', width: 460, cell: row => eventFlagTextMarkup(row.description)},
    {key: 'facility', label: '设施', width: 180, cell: row => `<button class="resource-inline-link" type="button" data-resource-target="ui-facility:${facility.id}">${esc(facilityDisplayLabel(facility))}</button>`},
  ], rows: (facility?.entrypoints || []).map((entry, index) => ({...entry, index}))});
}

function renderComputerControllerConfiguration(facility) {
  const controls = facility.configuration?.controls || [];
  const observed = facility.observed_instance || {};
  return `${configurationTable({columns: [
    {key: 'id', label: '输入', width: 100, cell: row => `<span title="${esc(row.id)}">${esc(row.label)}</span>`},
    {key: 'kind', label: '类型', width: 100, cell: row => row.kind === 'numeric-key' ? '数字键' : row.kind === 'exit-command' ? '退出' : '状态控制'},
    {key: 'source', label: '界面记录', width: 320, cell: row => currentTextReferenceLink(row.source_record)},
  ], rows: controls})}
    <div class="section-line"><h2>场景控制台</h2></div>${configurationTable({columns: [
      {key: 'handle', label: '句柄', width: 280, cell: row => `<span title="${esc(row.scene_object_uid === observed.scene_object_uid ? '即时存档 2 · 界面调用已确认' : '')}">${handleMarkup(row.scene_object_uid, {title: null})}</span><button class="resource-inline-link" type="button" data-resource-target="${esc(row.scene_object_uid)}" aria-label="调查点">↗</button>`},
      {key: 'scene', label: '场景', width: 130, cell: row => handleMarkup(`scene:${Number(row.scene_id).toString(16).toUpperCase().padStart(2, '0')}`)},
      {key: 'command', label: '命令', width: 70, cell: row => esc(row.command_id_hex)},
      {key: 'instance', label: '实例', width: 70, cell: row => esc(row.instance_id_hex)},
      {key: 'position', label: '坐标', width: 110, cell: row => `<a class="editor-inline-link" data-controller-link="controller" href="${esc(controllerHref(row, state.project))}">(${Number(row.x)}, ${Number(row.y)}) ↗</a>`},
      {key: 'targets', label: '受控对象与事件位', width: 480, cell: row => `<div data-controller-instance="${esc(row.scene_object_uid)}">${controllerTargetsMarkup(row, state.project)}</div>`},
      {key: 'references', label: '引用', width: 280, cell: row => resourceForwardReferenceCell(row.scene_object_uid)},
    ], rows: facility.instances || [], rowId: row => row.scene_object_uid})}`;
}

function renderTeleportConfiguration(facility) {
  const hidden = hiddenTeleportDestination(state.project);
  return `<div id="hidden-teleport">${facilityParameterMarkup(facility.id)}</div>${hidden ? `<div class="data-editor-toolbar"><a class="editor-inline-link" href="${esc(controllerSceneHref(hidden.gate.scene_id, state.project, {point: [hidden.gate.cells[0].x, hidden.gate.cells[0].y]}))}" title="隐藏目的地大门">↗</a></div>` : ''}
    <div class="section-line"><h2>传送器入口</h2></div>${configurationTable({columns: [
      {key: 'handle', label: '句柄', width: 280, cell: row => `${handleMarkup(row.scene_object_uid)}<button class="resource-inline-link" type="button" data-resource-target="${esc(row.scene_object_uid)}" aria-label="调查点">↗</button>`},
      {key: 'scene', label: '场景', width: 130, cell: row => esc(row.scene_id_hex)},
      {key: 'command', label: '命令', width: 70, cell: row => esc(row.command_id_hex)},
      {key: 'instance', label: '实例', width: 70, cell: row => esc(row.instance_id_hex)},
      {key: 'position', label: '坐标', width: 100, cell: row => `${Number(row.x)}, ${Number(row.y)}`},
      {key: 'references', label: '引用', width: 300, cell: row => resourceForwardReferenceCell(row.scene_object_uid)},
    ], rows: facility.instances || [], rowId: row => row.scene_object_uid})}`;
}

function renderTeleportTerminal() {
  const facility = (state.project.facilities?.facilities || [])
    .find(item => item.id === "teleport-terminal");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面与流程"], ["config", "目的地与入口"]]);
  if (state.facilityTab === "ui") {
    return `${tabs}${renderFacilityUi(facility)}`;
  }
  return `${tabs}${renderTeleportConfiguration(facility)}${renderFacilityRoutines(facility)}`;
}

function renderComputerController() {
  const facility = (state.project.facilities?.facilities || [])
    .find(item => item.id === "computer-controller");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面"], ["config", "控制与实例"]]);
  if (state.facilityTab === "ui") return `${tabs}${renderFacilityUi(facility)}`;
  return `${tabs}${renderComputerControllerConfiguration(facility)}${renderFacilityRoutines(facility)}`;
}

function renderJukebox() {
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === "jukebox");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面"], ["config", "配置"]]);
  if (state.facilityTab === "ui") return `${tabs}${renderFacilityUi(facility)}`;
  return `${tabs}${renderJukeboxConfigurationEditor()}`;
}

// 设施页只保留界面 / 配置的职责分页；全部界面分页共用同一工作台。
function facilityTabs(tabs) {
  state.facilityTab = resolveTab("facility", tabs.map(([id]) => id), state.facilityTab);
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === FACILITY_VIEW_IDS[state.view]);
  return pageHeaderTabs({label: facilityDisplayLabel(facility), tabs: tabs.map(([id, label]) => ({id, label})),
    active: state.facilityTab, attribute: 'data-facility-tab'})
    + pageHeaderControls(facilityWorkbenchToolbar(facility) + facilitySaveToolbar());
}

function specialScreenAsset(id) {
  return (state.project.ui?.construction?.static_assets?.special_screens || [])
    .find(item => item.id === id) || null;
}

function constructionPreviewAsset(id) {
  return (state.project.ui?.construction?.menu_dispatch_data?.previews || [])
    .find(item => item.id === id) || null;
}

async function resolveFacilityMenuPreview(canvas, preview) {
  const definition = canvas?.dataset.interfacePageWorkbench ? facilityServiceDefinition() : null;
  if (definition) preview = resolveInterfacePageEditorPreview(canvas, preview, definition);
  const facilityId = definition ? FACILITY_VIEW_IDS[state.view] : canvas?.dataset?.facilityUiWorkbench || null;
  const facility = (state.project.facilities?.facilities || [])
    .find(item => item.id === facilityId) || null;
  const nodes = definition ? interfacePageModel(definition.id, definition).nodes : facility ? facilityUiNodes(facility) : [];
  const namespace = definition ? canvas.closest('[data-screen-workbench]')?.dataset.screenWorkbench : facilityUiNamespace(facility);
  const selected = facility
    ? selectedGameUiWorkbenchNode(namespace, nodes) : null;
  if (definition) return preview;
  let resolved = preview;
  if (preview?.id === 'constructor:frog-race-screen') {
    resolved = constructionPreviewAsset('constructor:frog-race-wager') || preview;
  } else if (preview?.id === "constructor:jukebox-screen") {
    const {record} = selectedConfigurationRecord(
      0x0A, state.jukeboxPreviewConfiguration
    );
    const track = selected?.id?.match(/:track:(\d+)$/u);
    resolved = preview.facility_screen ? {...preview, runtime_context: {...preview.runtime_context,
      facility_instance: record?.id ?? 0, choice_index: track ? Number(track[1]) : 0}} : buildJukeboxLivePreview(
      preview,
      facilityConfigurationDraftValues(0x0A, record?.id)
    );
  } else if (preview?.id === "constructor:vending-machine-screen") {
    const {familyId, record} = vendingFamilyAndRecord();
    const product = selected?.id?.match(/:product:(\d+)$/u);
    if (product) state.vendingPreviewChoice = Number(product[1]);
    const response = selected?.serviceResponseSource;
    const source = response || Number(familyId) !== 11 ? vendingServiceResponsePreview(
      state.project.ui.construction.menu_dispatch_data.previews,
      response || `application-dialogue-flow:${Number(familyId) === 12 ? '1C' : '1D'}:segment:01:action:00`)
      : selected?.id === 'vending-machine:coin-response'
        ? constructionPreviewAsset('constructor:vending-machine-coin-drop') : preview;
    resolved = source?.facility_screen
      ? {...source, runtime_context: {...source.runtime_context,
        facility_instance: record?.id ?? 0, choice_index: state.vendingPreviewChoice ?? 0}}
      : buildVendingLivePreview(
      preview, familyId,
      facilityConfigurationDraftValues(familyId, record?.id),
      state.project,
    );
  } else if (preview?.id === 'constructor:computer-controller-screen') {
    const context = interfacePreviewContext();
    const instance = facility?.instances?.find(row => row.command_id === context.service?.command
      && row.instance_id === context.service?.argument && row.scene_id === context.scene?.sceneId);
    const command = instance?.command_id ?? 0x36;
    const entryHandle = instance ? `scene:${instance.scene_id.toString(16).toUpperCase().padStart(2, '0')}:investigation:${instance.point_id.toString(16).toUpperCase().padStart(2, '0')}`
      : preview.facility_screen.entry_handle;
    resolved = controllerServicePreview(state.project.ui.construction.menu_dispatch_data.previews,
      `application-dialogue-flow:${command.toString(16).toUpperCase()}:segment:00`, {entryHandle}) || preview;
  } else if (preview?.id === "constructor:teleport-terminal-screen") {
    const teleport = facility || (state.project.facilities?.facilities || [])
      .find(item => item.id === "teleport-terminal");
    const destinations = teleport?.configuration?.destinations || [];
    const states = teleport?.runtime_states || [];
    const {saveStateMask: mask} = ensureTeleportPreviewState(teleport);
    const dialogue = selected?.previewDialogue || states.find(item =>
      item.id === state.teleportPreviewDialogue) || states[0] || null;
    const destination = selected?.id?.match(/:destination:(\d+)$/u);
    if (preview.facility_screen) {
      if (!dialogue?.text_record) throw new TypeError('传送终端缺少当前流程文字');
      const parameters = await fieldSubmenuCodeValues(['shop-text-region']);
      const candidates = state.project.ui.construction.menu_dispatch_data.previews.filter(item =>
        item.shop_menu?.resource_id === preview.facility_screen.resource_id
        && item.shop_menu?.welcome_handle);
      let source = null;
      for (const candidate of candidates) {
        const handle = candidate.shop_menu.welcome_handle;
        const id = (await db.getField(candidate.shop_menu.resource_id, handle, 'record_id')).value;
        if (uiTextRecordId(fieldSubmenuCodeValue(parameters, 'shop-text-region').toString(16), id)
          === dialogue.text_record) {source = candidate; break;}
      }
      if (!source) throw new TypeError(`传送状态缺少当前应用正文：${dialogue.text_record}`);
      resolved = {...source, runtime_context: {...source.runtime_context,
        save_slot: interfacePreviewContext().slot, choice_index: destination ? Number(destination[1]) : 0},
        layers: source.layers.map(layer => layer.teleport_body || layer.shop_welcome
          ? {...layer, page_index: dialogue.page_index} : layer)};
    } else resolved = buildTeleportTerminalPreview(
      preview, destinations, {
        activeDestinationIds: destinations
          .filter(destination => mask & (1 << Number(destination.id)))
          .map(destination => Number(destination.id)),
        dialogue,
      }
    );
  }
  const selection = facility
    ? gameUiWorkbenchPreviewSelection(namespace, nodes)
    : null;
  return selection && resolved ? {...resolved, selection} : resolved;
}

// 设施 ID ↔ Web constructor / 整屏模板资产 ↔ 界面目录里的界面族。
const FACILITY_UI_SCREENS = {
  "vending-machine": {
    screen: "vending-machine-screen", interface: "vending-machines",
    live_preview: "vending",
  },
  jukebox: {
    screen: "jukebox-screen", interface: "jukebox", live_preview: "jukebox",
  },
  "frog-race": {screen: "frog-race-screen", interface: "frog-race"},
  "teleport-terminal": {
    preview: "constructor:teleport-terminal-screen",
    interface: "teleport-terminal",
    live_preview: "teleport",
  },
  "computer-controller": {
    preview: "constructor:computer-controller-screen",
    interface: "control-terminals",
  },
};

const FACILITY_VIEW_IDS = Object.freeze({
  jukebox: "jukebox",
  vending: "vending-machine",
  frograce: "frog-race",
  teleport: "teleport-terminal",
  computercontroller: "computer-controller",
});

function facilityUiNamespace(facility) {
  return `facility-ui:${facility?.id || "unknown"}`;
}

function uiTextRecordId(region, id) {
  return `record:${String(region).toUpperCase().padStart(2, "0")}:${
    Number(id).toString().padStart(3, "0")}`;
}

function recordSelection(recordId, ranges = null) {
  return {
    record_id: recordId,
    ...(ranges ? {ranges: ranges.map(range => ({...range}))} : {}),
  };
}

function facilityTextNode({
  facility,
  id,
  label,
  recordId,
  ranges = null,
  depth = 2,
  note = "",
  selection = null,
  editors = null,
  facts = [],
  ...extra
}) {
  return {
    id: `${facility.id}:${id}`,
    kind: "text",
    label,
    detail: `文本 · ${recordId} · 可编辑`,
    depth,
    recordId: editors ? null : recordId,
    ranges,
    editorId: `${facility.id}:${id}`,
    editorLabel: "界面文字",
    description: note || `只修改“${label}”自己的固定文字容量；布局命令和动态值保持不变。`,
    editors,
    selection: selection || recordSelection(recordId, ranges),
    facts: [{label: "文字记录", value: recordId, mono: true}, ...facts],
    note,
    ...extra,
  };
}

function facilityFrameNodes(facility, binding, screen, previewId) {
  const preview = constructionPreviewAsset(previewId);
  return [
    {
      id: `${facility.id}:screen`,
      kind: "screen",
      label: `${facilityDisplayLabel(facility)}界面`,
      detail: "画面 · 256×240 像素",
      depth: 0,
      facts: [
        {label: "画面资源", value: previewId, mono: true},
        {label: "界面族", value: binding.interface, mono: true},
        {label: "尺寸", value: "256×240 像素"},
      ],
      note: "左侧区分固定界面资源、可编辑文字组件和运行时配置内容；配置值只用于预览，不会被当成界面文字保存。",
    },
    {
      id: `${facility.id}:layout`,
      kind: "layout",
      label: screen ? "整屏模板与布局" : "窗口与布局",
      detail: screen
        ? "图像 · 整屏布局"
        : `布局 · ${(preview?.layers || []).filter(layer => layer.record)
          .map(layer => layer.record).join(" / ") || "ROM 构造记录"}`,
      depth: 1,
      selection: {bounds: {x: 0, y: 0, width: 256, height: 240}},
      facts: screen ? [] : [
        {label: "构造记录", value: (preview?.layers || [])
          .filter(layer => layer.record).map(layer => layer.record).join(" / ") || "—", mono: true},
        {label: "来源", value: "游戏界面 constructor"},
      ],
      note: screen
        ? ""
        : "窗口、坐标与图块由游戏界面的同一份 ROM 构造记录拥有，本页只引用，不复制布局。",
    },
  ];
}

function jukeboxUiNodes(facility, binding, screen, previewId) {
  const {record} = selectedConfigurationRecord(
    0x0A, state.jukeboxPreviewConfiguration,
  );
  const values = record
    ? facilityConfigurationDraftValues(0x0A, record.id) : [];
  const tracks = values.slice(0, 4).map((value, index) => {
    const recordId = uiTextRecordId("0D", value);
    return {
      id: `${facility.id}:track:${index}`,
      kind: "dynamic",
      label: `曲目 ${index + 1}`,
      detail: `动态文字 · ${recordId}`,
      depth: 2,
      selection: recordSelection(recordId),
      facts: [
        {label: "文字来源", value: recordId, mono: true},
        {label: "配置槽", value: String(index + 1)},
        {label: "编辑位置", value: "配置分页 / 对应名称资产"},
      ],
      note: "曲目记录由当前配置槽选择，是运行时内容，不在界面分页把它伪装成固定字段名。",
    };
  });
  return [
    ...facilityFrameNodes(facility, binding, screen, previewId),
    {
      id: `${facility.id}:tracks`, kind: "group", label: "当前曲目列表",
      detail: "组件组 · 配置草稿填入", depth: 1,
      selection: {bounds: {x: 56, y: 148, width: 176, height: 72}},
      facts: [{label: "可见曲目", value: String(tracks.length)}],
      note: "曲目 ID 在“配置”分页修改；这里用当前草稿生成实画像素。",
    },
    ...tracks,
    {
      id: `${facility.id}:cursor`, kind: "image", label: "选中光标",
      detail: "图像", depth: 1,
      selection: {bounds: {x: 56, y: 157, width: 16, height: 16}},
      facts: [],
    },
  ];
}

function vendingUiNodes(facility, binding, screen, previewId) {
  const {familyId, record} = vendingFamilyAndRecord();
  const responses = vendingServiceResponseEntries(Number(familyId));
  const values = record
    ? facilityConfigurationDraftValues(familyId, record.id) : [];
  const region = Number(familyId) === 0x0B ? "00" : "0D";
  const products = values.slice(0, 6).map((value, index) => {
    const recordId = uiTextRecordId(region, value);
    return {
      id: `${facility.id}:product:${index}`,
      kind: "dynamic",
      label: `商品槽 ${index + 1}`,
      detail: `动态文字 · ${recordId}`,
      depth: 2,
      selection: recordSelection(recordId),
      facts: [
        {label: "名称记录", value: recordId, mono: true},
        {label: "商品 ID", value: hex(Number(value), 2), mono: true},
        {label: "编辑位置", value: "配置分页 / 商品数据"},
      ],
      note: "商品名、数量与价格来自当前商品配置，不属于固定界面字段名。",
    };
  });
  return [
    ...facilityFrameNodes(facility, binding, screen, previewId),
    {
      id: `${facility.id}:products`, kind: "group", label: "商品格",
      detail: "组件组 · 6 个配置槽", depth: 1,
      selection: {bounds: {x: 8, y: 24, width: 240, height: 96}},
      facts: [{label: "当前类型", value: Number(familyId) === 0x0B ? "道具" : "炮弹"}],
      note: "商品、数量和单价在配置分页修改；画布只读取草稿并实时合成。",
    },
    ...products,
    {
      id: `${facility.id}:values`, kind: "dynamic", label: "数量、价格与所持金",
      detail: "动态数值 · 当前配置填入", depth: 1,
      selection: {bounds: {x: 0, y: 16, width: 256, height: 104}},
      facts: [
        {label: "数量槽", value: "6"},
        {label: "价格", value: "商品单价 × 数量"},
      ],
      note: "这些是运行时数值，不会在界面文字编辑器中保存。",
    },
    {
      id: `${facility.id}:messages`, kind: "group", label: "交互提示",
      detail: "组件组 · text-record", depth: 1,
    },
    facilityTextNode({
      facility, id: "prompt-who", label: "购买对象提示",
      recordId: "record:10:111",
      serviceResponseSource: responses.find(row => row.party)?.source,
      note: "购买对象由当前存档队伍提供。",
    }),
    facilityTextNode({
      facility, id: "prompt-buy", label: "购买内容提示",
      recordId: "record:10:108",
      serviceResponseSource: responses.find(row => row.segment === '01')?.source,
      note: "售货机进入商品选择时使用的固定提示。",
    }),
    facilityTextNode({
      facility, id: "coin-response", label: "投币回应",
      recordId: "record:10:110",
      serviceResponseSource: responses.find(row => row.label === '投币回应')?.source,
    }),
    ...responses.filter(row => !row.party && !['商品选择', '投币回应'].includes(row.label)).map(row => ({
      ...facilityTextNode({facility, id: `response:${row.segment}`, label: row.label,
        recordId: row.record || (row.segment === '07' ? 'record:10:109' : 'record:10:112')}),
      serviceResponseSource: row.source,
    })),
  ];
}

function projectedFacilityTextNodes(facility, binding, screen, previewId) {
  const projection = state.facilitySupportingTextProjection;
  const current = projection?.facilityId === facility.id
    && db.isPreviewProjectionCurrent('facility-supporting-text', projection);
  return [...facilityFrameNodes(facility, binding, screen, previewId),
    {id: `${facility.id}:labels`, kind: 'group', depth: 1,
      label: facility.id === 'frog-race' ? '赛跑文字组件' : '面板文字组件'},
    ...(current ? projection.nodes : [])];
}

async function prepareFacilitySupportingText(facility) {
  const previews = state.project.ui.construction.menu_dispatch_data.previews;
  const context = interfacePreviewContext();
  const text = state.project.text_record_edits;
  return db.reusePreviewProjection('facility-supporting-text', [facility.id,
    JSON.stringify(previews), JSON.stringify(context), text], async () => {
    const sources = facility.id === 'frog-race' ? previews.filter(preview =>
      ['frog-wager', 'frog-race'].includes(preview.facility_screen?.kind))
      : [constructionPreviewAsset('constructor:computer-controller-screen')];
    if (!sources.length || sources.some(source => !source))
      throw new TypeError('设施文字缺少所属构造');
    const records = new Map();
    const labels = new Map();
    let controller = null;
    const append = (recordId, source) => {
      if (!recordId || records.has(recordId)) return;
      const record = text?.records?.[recordId];
      if (!record) throw new TypeError(`设施文字缺少当前记录：${recordId}`);
      records.set(recordId, source);
      for (const token of textRecordRuntimeTokens(record, state.project.text_record_encoding, text)) {
        if (token.token === 0xF7 && token.operands?.length === 2)
          append(uiTextRecordId(token.operands[1].toString(16), token.operands[0]), recordId);
      }
    };
    for (const source of sources) {
      const resolved = await resolveFacilityScreenPreview({...structuredClone(source),
        runtime_context: {...source.runtime_context, save_slot: context.slot}});
      if (facility.id === 'computer-controller') controller = resolved;
      for (const layer of resolved.layers) {
        if (layer.kind !== 'script') continue;
        append(layer.record, source.id);
        if (layer.runtime_record_pair) append(layer.runtime_record_pair, source.id);
        for (const reference of Object.values(layer.provider_records || {})) append(reference, source.id);
        if (facility.id === 'frog-race') {
          if (layer.provider_save_values?.[6]) labels.set(layer.record, {label: '下注金额单位', fixed: true});
          if (layer.provider_records?.[10]) {
            labels.set(layer.record, {label: '赛果分隔符', fixed: true});
            const name = layer.provider_records[10];
            if (!labels.has(name)) labels.set(name, {label: `赛手名 ${[...labels.values()]
              .filter(row => row.label.startsWith('赛手名')).length + 1}`});
          }
        }
      }
    }
    if (facility.id === 'frog-race') {
      const types = FIELD_SUBMENU_CODE_PARAMETERS.filter(parameter => /^frog-type-\d+$/u.test(parameter.name));
      const parameters = await fieldSubmenuCodeValues(['confirm-text-region', 'confirm-text-record',
        'frog-name-base', ...types.map(parameter => parameter.name)]);
      const nameRegion = [...labels].find(([, value]) => value.label.startsWith('赛手名'))?.[0].split(':')[1];
      if (!nameRegion) throw new TypeError('赛手名字缺少当前文字区域');
      for (const parameter of types) {
        const name = uiTextRecordId(nameRegion, fieldSubmenuCodeValue(parameters, 'frog-name-base')
          + fieldSubmenuCodeValue(parameters, parameter.name));
        append(name, parameter.entity_handle);
        if (!labels.has(name)) labels.set(name, {label: `赛手名 ${[...labels.values()]
          .filter(row => row.label.startsWith('赛手名')).length + 1}`});
      }
      append(uiTextRecordId(fieldSubmenuCodeValue(parameters, 'confirm-text-region').toString(16),
        fieldSubmenuCodeValue(parameters, 'confirm-text-record')),
        fieldSubmenuCodeSource('confirm-text-record').entity_handle);
      labels.set(uiTextRecordId(fieldSubmenuCodeValue(parameters, 'confirm-text-region').toString(16),
        fieldSubmenuCodeValue(parameters, 'confirm-text-record')), {label: '确认选项'});
    }
    const nodes = controller ? controllerTextComponents(facility, controller, text)
      : [...records].map(([recordId, source], index) =>
      facilityTextNode({facility, id: `current-text:${recordId}`,
        label: labels.get(recordId)?.label || `界面文字 ${index + 1}`,
        recordId, ...(labels.get(recordId)?.fixed ? {ranges: fixedFacilityTextComponents(recordId, text)
          .flatMap(part => part.ranges)} : {}),
        facts: [{label: '构造来源', value: source, mono: true}]}));
    return {facilityId: facility.id, nodes};
  });
}

function fixedFacilityTextComponents(recordId, text) {
  const encoding = state.project.text_record_encoding;
  const record = text.records[recordId];
  if (!record) throw new TypeError(`设施缺少当前文字记录：${recordId}`);
  const tokens = textRecordEditorTokens(record, encoding);
  return textRecordComponents(record, encoding).flatMap(component => {
    const ranges = tokens.filter(token => ['text', 'padding'].includes(token.kind)
      && component.ranges.some(range => token.offset >= range.offset
        && token.offset + token.bytes.length <= range.offset + range.length))
      .map(token => ({offset: token.offset, length: token.bytes.length}));
    return ranges.length ? [{recordId, ranges, text: tokens.filter(token => ranges.some(range =>
      token.offset === range.offset)).map(token => token.text).join('')}] : [];
  });
}

function controllerTextComponents(facility, preview, text) {
  const encoding = state.project.text_record_encoding;
  const fixedComponents = recordId => fixedFacilityTextComponents(recordId, text);
  const keyboard = preview.layers.find(layer => layer.controller_keyboard)?.record;
  const status = preview.layers.find(layer => layer.controller_status)?.record;
  const statusRecord = text.records[status];
  const include = statusRecord && textRecordRuntimeTokens(statusRecord, encoding, text)
    .find(token => token.token === 0xF7 && token.operands?.length === 2);
  const included = include ? uiTextRecordId(include.operands[1].toString(16), include.operands[0]) : null;
  const header = included ? fixedComponents(included) : [];
  const statusParts = fixedComponents(status);
  const opening = header.length > 1 && statusParts.length
    ? [header.at(-1), statusParts[0]] : null;
  const textNode = (part, id, label) => facilityTextNode({facility, id, label,
    recordId: part.recordId, ranges: part.ranges});
  const keys = fixedComponents(keyboard);
  const digits = keys.filter(part => /^[0-9]$/u.test(part.text));
  return [
    ...(opening ? header.slice(0, -1).map((part, index) => textNode(part, `title:${index}`, '控制室标题')) : []),
    ...(digits.length ? [textNode({recordId: keyboard, ranges: digits.flatMap(part => part.ranges)},
      'digits', '数字键')] : []),
    ...keys.filter(part => !digits.includes(part)).map((part, index) => textNode(part, `key:${index}`, '退出按键')),
    ...(opening ? [facilityTextNode({facility, id: 'open', label: '开启按键', recordId: status,
      selection: recordSelection(status, opening[1].ranges),
      editors: opening.map((part, index) => ({type: 'text', ...part,
        editorId: `${facility.id}:open:${index}`, label: `开启按键文字 ${index + 1}`,
        description: '文字范围由当前包含记录与接续组件提供。'})),
      facts: [{label: '组合来源', value: opening.map(part => part.recordId).join(' + '), mono: true}]})] : []),
    ...(opening ? statusParts.slice(1) : statusParts).map((part, index) =>
      textNode(part, `status:${index}`, index === 0 ? '关闭按键' : `状态文字 ${index + 1}`)),
    {id: `${facility.id}:cursor`, kind: 'image', label: '输入光标', depth: 1,
      facts: [{label: '来源', value: preview.selection_cursor?.resource_id || '缺失', mono: true}]},
  ];
}

function frogRaceUiNodes(facility, binding, screen, previewId) {
  return [...projectedFacilityTextNodes(facility, binding, screen, previewId),
    {id: `${facility.id}:runtime`, kind: 'dynamic', label: '下注、比赛与结果状态', depth: 1,
      facts: [{label: '下注', value: 'frog-race.wager', mono: true},
        {label: '比赛', value: 'frog-race.race', mono: true},
        {label: '结果', value: 'frog-race.result', mono: true}]}];
}

function ensureTeleportPreviewState(facility) {
  const destinations = facility.configuration?.destinations || [];
  const fields = createSaveCurrentFieldObjects(state), slot = interfacePreviewContext().slot;
  const saveStateMask = destinations.reduce((mask, destination) => (
    fields.ready() && fields.object(`save.slot.${slot}.teleport_destination.${Number(destination.id)}.unlocked`).value
      ? mask | (1 << Number(destination.id)) : mask
  ), 0);
  state.teleportPreviewFlags = saveStateMask;
  const states = facility.runtime_states || [];
  const selectedState = states.find(item =>
    item.id === state.teleportPreviewDialogue) || states[0] || null;
  state.teleportPreviewDialogue = selectedState?.id || "travel-confirmation";
  return {destinations, saveStateMask, states, selectedState};
}

function teleportUiNodes(facility, binding, screen, previewId) {
  const {destinations, states} = ensureTeleportPreviewState(facility);
  const text = state.project.text_record_edits;
  const pageBoundaries = record => record.protected_ranges.filter(range =>
    ['page-break-or-repeat-end', 'set-page-style-and-break'].includes(range.semantic)
      && range.repeat_role !== 'delimiter');
  const dialogueStates = [...states];
  for (const recordId of new Set(states.map(item => item.text_record))) {
    const record = text.records[recordId];
    if (!record) throw new TypeError('传送状态缺少当前文字记录');
    for (let page = 0; page <= pageBoundaries(record).length; page++) {
      if (!dialogueStates.some(item => item.text_record === recordId && Number(item.page_index) === page))
        dialogueStates.push({id: `record-page:${recordId}:${page}`, label: `正文分页 ${page + 1}`,
          text_record: recordId, page_index: page});
    }
  }
  const dialogueNodes = dialogueStates.flatMap(item => {
    const record = text.records[item.text_record];
    if (!record) throw new TypeError('传送状态缺少当前文字记录');
    const boundaries = pageBoundaries(record);
    const page = Number(item.page_index);
    if (!Number.isInteger(page) || page < 0 || page > boundaries.length)
      throw new TypeError('传送状态缺少当前正文分页');
    const start = page ? boundaries[page - 1].offset + boundaries[page - 1].length : 0;
    const end = boundaries[page]?.offset ?? record.bytes.length;
    return textRecordComponents(record, state.project.text_record_encoding, text,
      [{offset: start, length: end - start}]).map((component, index) =>
      facilityTextNode({facility, id: `dialogue:${item.id}:${index}`,
        label: component.text || item.label, recordId: item.text_record,
        ranges: component.ranges, previewDialogue: item,
        facts: [{label: '流程状态', value: item.label}, {label: '正文分页', value: String(page)}]}));
  });
  const destinationNodes = destinations.map(destination => {
    const id = Number(destination.id);
    const active = Boolean(state.teleportPreviewFlags & (1 << id));
    return facilityTextNode({
      facility,
      id: `destination:${id}`,
      label: `传送地点 ${id + 1}`,
      recordId: destination.text_record,
      detail: `文本 · ${destination.text_record} · ${active ? "当前渲染" : "当前隐藏"}`,
      selection: recordSelection(destination.text_record),
      facts: [
        {label: "开放位", value: destination.availability_flag_hex, mono: true},
      ],
      controlsMarkup: `<label class="teleport-destination-toggle ${active ? "active" : ""}">
        <input type="checkbox" data-teleport-destination="${id}" ${active ? "checked" : ""}>
        <span>当前存档开放</span>
      </label>`,
      note: "地点开放状态引用全局预览工具栏所选存档槽的目的地字段。",
    });
  });
  return [
    ...facilityFrameNodes(facility, binding, screen, previewId),
    ...states.map(item => ({id: `${facility.id}:preview-state:${item.id}`,
      kind: 'group', label: item.label, depth: 1, previewDialogue: item,
      facts: [{label: '流程状态', value: item.label}],
    })),
    {
      id: `${facility.id}:destinations`, kind: "group", label: "传送地点列表",
      detail: "组件组 · 12 个地点", depth: 1,
      selection: {bounds: {x: 16, y: 8, width: 224, height: 80}},
      facts: [
        {label: "地点数", value: String(destinations.length)},
        {label: "开放 mask", value: `0x${state.teleportPreviewFlags.toString(16).toUpperCase().padStart(3, "0")}`, mono: true},
      ],
    },
    ...destinationNodes,
    {
      id: `${facility.id}:dialogue`, kind: "group", label: "下方流程文字",
      detail: "组件组 · 分页文字", depth: 1,
      selection: {bounds: {x: 0, y: 96, width: 256, height: 144}},
    },
    ...dialogueNodes,
    {
      id: `${facility.id}:cursor`, kind: "image", label: "终端选择光标",
      detail: "图像 · 通用组合精灵", depth: 1,
      facts: [{label: "图案表", value: "sprite-chr:27-40-7F", mono: true}],
      note: "光标与下方应用框共用游戏界面的基础资源。",
    },
  ];
}

function computerControllerUiNodes(facility, binding, screen, previewId) {
  return projectedFacilityTextNodes(facility, binding, screen, previewId);
}

function facilityUiNodes(facility) {
  const binding = FACILITY_UI_SCREENS[facility?.id];
  if (!binding) return [];
  const screen = binding.screen ? specialScreenAsset(binding.screen) : null;
  const previewId = binding.preview
    || (binding.screen ? `constructor:${binding.screen}` : null);
  if (facility.id === "jukebox") {
    return jukeboxUiNodes(facility, binding, screen, previewId);
  }
  if (facility.id === "vending-machine") {
    return vendingUiNodes(facility, binding, screen, previewId);
  }
  if (facility.id === "frog-race") {
    return frogRaceUiNodes(facility, binding, screen, previewId);
  }
  if (facility.id === "teleport-terminal") {
    return teleportUiNodes(facility, binding, screen, previewId);
  }
  return computerControllerUiNodes(facility, binding, screen, previewId);
}

function facilityConfigurationPicker(entry, record, controlAttribute, label) {
  return `<div class="screen-workbench-selection"><span>${esc(label)}</span>${shopConfigurationPicker({
    family: entry, recordId: record.id, controlAttribute, label,
    countLabel: '配置项', emptyLabel: '',
    labelForRecord: candidate => facilityConfigurationLabel({...entry, id: candidate.id},
      facilityConfigurationDraftValues(entry.family_id, candidate.id)),
    currentLabelForRecord: candidate => facilityConfigurationLabel({...entry, id: candidate.id},
      facilityConfigurationDraftValues(entry.family_id, candidate.id), candidate.id, {showHandle: false}),
    filterLabel: '搜索配置', filterPlaceholder: '实例编号或配置内容',
    productsForRecord: (family, candidate) =>
      facilityConfigurationDraftValues(family.family_id, candidate.id).map((value, index) => ({
        label: Number(family.family_id) === 0x0A ? audioCommandLabel(value)
          : `${index + 1} · ${family.value_namespace?.goods?.find(good => Number(good.value) === Number(value))?.label || value}`,
        price: null,
      })),
  })}</div>`;
}

function facilityWorkbenchToolbar(facility) {
  if (facility.id === "jukebox") {
    const {entry, record} = selectedConfigurationRecord(
      0x0A, state.jukeboxPreviewConfiguration,
    );
    return entry && record ? facilityConfigurationPicker(entry, record, 'data-jukebox-preview-configuration', '预览配置') : "";
  }
  if (facility.id === "vending-machine") {
    const {familyId, entry, record} = vendingFamilyAndRecord();
    return entry && record ? `<label class="screen-workbench-selection">
      <span>类型</span><select data-vending-preview-family>
        <option value="11" ${familyId === 0x0B ? "selected" : ""}>道具自动售货机</option>
        <option value="12" ${familyId === 0x0C ? "selected" : ""}>炮弹自动售货机</option>
        <option value="13" ${familyId === 0x0D ? "selected" : ""}>双配置设施</option>
      </select>
    </label>${facilityConfigurationPicker(entry, record, 'data-vending-preview-configuration', '预览配置')}` : "";
  }
  if (facility.id === "teleport-terminal") {
    return `<button class="button ghost" type="button"
      data-teleport-restore-save7>恢复 ROM 初始开放状态</button>`;
  }
  return "";
}

function activeFacilityDialoguePreview(facility, nodes) {
  const selected = selectedGameUiWorkbenchNode(
    facilityUiNamespace(facility), nodes,
  );
  if (selected?.dialoguePreview?.recordId) {
    return {
      kind: "overlay",
      recordId: selected.dialoguePreview.recordId,
      pageIndex: Math.max(0, Number(selected.dialoguePreview.pageIndex) || 0),
      label: selected.dialoguePreview.label || selected.label,
    };
  }
  if (selected?.previewDialogue?.text_record) {
    return {
      kind: "native",
      recordId: selected.previewDialogue.text_record,
      pageIndex: Math.max(0, Number(selected.previewDialogue.page_index) || 0),
      label: selected.previewDialogue.label || selected.label,
    };
  }
  return null;
}

function renderFacilityWorkbench(facility) {
  const identity = handleMarkup(`ui-facility:${facility.id}`, {label: facilityDisplayLabel(facility)});
  const definition = facilityServiceDefinition();
  if (definition) return renderInterfacePage({definition, inspectorExtraMarkup: identity});
  const binding = FACILITY_UI_SCREENS[facility?.id];
  const previewId = binding?.preview
    || (binding?.screen ? `constructor:${binding.screen}` : null);
  if (!binding || !previewId || !constructionPreviewAsset(previewId)) {
    return identity;
  }
  const nodes = facilityUiNodes(facility);
  const namespace = facilityUiNamespace(facility);
  const dialoguePreview = activeFacilityDialoguePreview(facility, nodes);
  const dialogueClass = dialoguePreview
    ? ` facility-ui-canvas-stack--dialogue-${dialoguePreview.kind} ui-dialogue-preview-active`
    : "";
  const mainCanvas = `<canvas width="256" height="240"
    data-ui-menu-preview="${esc(previewId)}"
    data-facility-ui-workbench="${esc(facility.id)}"
    aria-label="${esc(facilityDisplayLabel(facility))}界面预览"></canvas>`;
  const dialogueCanvas = dialoguePreview?.kind === "overlay"
    ? `<canvas width="256" height="240"
        data-ui-dialogue-preview="${esc(dialoguePreview.recordId)}"
        data-ui-dialogue-page="${dialoguePreview.pageIndex}"
        data-ui-dialogue-field-window="true"
        aria-label="${esc(dialoguePreview.label)}临时对话预览"></canvas>`
    : "";
  return renderGameUiWorkbench({
    heightMode: 'fill',
    namespace,
    id: "facility-ui-workbench",
    className: `facility-ui-workbench facility-ui-workbench-${facility.id}`,
    nodes,
    inspectorExtraMarkup: identity,
    canvasMarkup: `<div class="facility-ui-canvas-stack${dialogueClass}"
      ${dialoguePreview ? `data-facility-dialogue-preview="${esc(
        dialoguePreview.recordId
      )}"` : ""}>
      ${mainCanvas}${dialogueCanvas}
      ${dialoguePreview ? `<span class="ui-dialogue-preview-badge">
        临时对话预览 · ${esc(dialoguePreview.label)}
      </span>` : ""}
    </div>`,
    footerBadge: dialoguePreview ? "临时对话预览" : "游戏界面权威资源",
    footerText: dialoguePreview
      ? dialoguePreview.kind === "overlay"
        ? "共用场景对话窗口作为独立透明层叠加；点击左侧其他组件即可返回正常画面。"
        : "当前只切换流程对话内容；点击左侧其他组件即可返回正常画面。"
      : binding.screen
        ? "固定模板来自 CHR 基础资产；配置值和运行状态只作为当前预览数据。"
        : "布局与文字来自 text-record；运行状态只选择当前预览内容。",
  });
}

/** Bind the common workbench used by every facility UI page. */
async function bindFacilityUiWorkbench({
  rerender = async () => {},
  repaint = () => {},
} = {}) {
  const facilityId = FACILITY_VIEW_IDS[state.view];
  const facility = (state.project?.facilities?.facilities || [])
    .find(item => item.id === facilityId);
  if (!facility || state.facilityTab !== "ui") return null;
  if (['frog-race', 'computer-controller'].includes(facility.id)) {
    const previous = state.facilitySupportingTextProjection;
    try {
      state.facilitySupportingTextProjection = await prepareFacilitySupportingText(facility);
    } catch (error) {
      state.facilitySupportingTextProjection = null;
      throw error;
    }
    if (previous !== state.facilitySupportingTextProjection) {await rerender(); return;}
  }
  const definition = facilityServiceDefinition();
  if (definition) return bindInterfacePageWorkbench({definition, rerender, repaint});
  let dialogue = JSON.stringify(activeFacilityDialoguePreview(facility, facilityUiNodes(facility)));
  return bindGameUiWorkbench({
    namespace: facilityUiNamespace(facility),
    nodes: facilityUiNodes(facility),
    rerender,
    repaint,
    selectPreview: () => {
      const next = JSON.stringify(activeFacilityDialoguePreview(facility, facilityUiNodes(facility)));
      if (next !== dialogue) {dialogue = next; void rerender();}
      else void repaint();
    },
    onSelect: node => {
      if (node?.previewDialogue) {
        state.teleportPreviewDialogue = node.previewDialogue.id;
        replaceHistoryUrl(currentViewUrl());
      }
    },
  });
}

function facilityServiceDefinition() {
  const terminalCommand = interfacePreviewContext().service?.command;
  const command = {jukebox: 0x1A, vending: Number(state.vendingPreviewFamily) + 0x10,
    frograce: 0x32, teleport: 0x2D,
    computercontroller: [0x36, 0x37, 0x38].includes(terminalCommand) ? terminalCommand : 0x36}[state.view];
  const definition = serviceFamilyPage(command);
  if (!definition) return null;
  const argument = state.view === 'vending' ? state.vendingPreviewConfiguration
    : state.view === 'jukebox' ? state.jukeboxPreviewConfiguration
    : interfacePreviewContext().service?.command === command ? interfacePreviewContext().service.argument : 0;
  interfacePreviewContext().service = {...interfacePreviewContext().service, command, argument: Number(argument) || 0};
  const facility = state.project?.facilities?.facilities?.find(row => row.id === FACILITY_VIEW_IDS[state.view]);
  return {...definition, supportingNodes: facility ? facilityUiNodes(facility)
    .filter(node => !['screen', 'layout'].includes(node.kind)) : []};
}

/** 设施「界面」分页：Web 重建、界面状态与运行采集对照。 */
function renderFacilityUi(facility) {
  return renderFacilityWorkbench(facility);
}

function renderVending() {
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === "vending-machine");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面"], ["config", "配置"]]);
  if (state.facilityTab === "ui") return `${tabs}${renderFacilityUi(facility)}`;
  return `${tabs}${renderVendingConfigurationEditor()}`;
}

/** 绑定专用设施页中不是普通 `.shop-slot` 的复合字段与配置选择器。 */
function bindFacilityConfigurationEditor(onChange) {
  const priceSource = fieldSubmenuCodeSource('vending-shell-overflow-price-code');
  if (document.querySelector('[data-vending-overflow-price]')) void Promise.all([
    db.getField(priceSource.resource_id, priceSource.entity_handle, priceSource.field),
    db.getResourceDocument('item-entry'),
  ]).then(([code, items]) => {
    const price = items.equipment_editor.numeric_codes.find(row => row.raw_code === code.value);
    if (!price?.available) throw new TypeError('索引14价格码没有当前数值');
    const unit = price.value & 255;
    for (const host of document.querySelectorAll('[data-vending-overflow-price]')) {
      const amount = Number(host.dataset.vendingOverflowPrice);
      if (host.hasAttribute("data-vending-price-title")) host.title = `${unit}G × ${amount} = ${unit * amount}G`;
      else host.innerHTML = `${unit}G × ${amount} = <b>${unit * amount}G</b>`;
    }
  }).catch(error => {state.shopMessage = error.message;});
  document.querySelectorAll('.facility-ui-workbench [data-module-reference-picker], [data-jukebox-preview-configuration], [data-vending-preview-configuration]')
    .forEach(node => bindReferencePicker(node.closest('[data-module-reference-picker]')));
  void mountFacilityParameters();
  void mountJukeboxTracks().then(() => bindFacilityFieldControls()).catch(error => {state.shopMessage = error.message;});
  const addressRoots = document.querySelectorAll('[data-vending-configuration]');
  if (addressRoots.length) {
    const {familyId, entry} = vendingFamilyAndRecord();
    for (const addressRoot of addressRoots) {
      const id = Number(addressRoot.dataset.vendingConfiguration);
      const record = entry.records.find(record => Number(record.id) === id);
      const ownerId = `family-${familyId.toString(16).padStart(2, "0")}-record-${id.toString(16).padStart(2, "0")}`;
      void db.getPackageDocument("game/field-ui/catalog.json", null)
        .then(catalog => catalog?.resources?.find(item =>
          item.module_id === "ui-facility" &&
          item.edit_route?.owner_ref?.resource_id === "facility-config" &&
          item.edit_route?.owner_ref?.record_id === ownerId))
        .then(item => item?.path ? db.getPackageDocument(item.path, null) : null)
        .then(asset => {
          const source = asset?.document;
          if (!addressRoot?.isConnected || source?.family_id !== familyId ||
              source.family_configuration_id !== id ||
              source.record_address?.offset !== record.address?.offset) return;
          addressRoot.title += '\n' + [
            {label: "配置记录", address: record.address},
            ...(source.slots || []).flatMap(pair => [
              {label: `商品 ${Number(pair.index) + 1}`, address: pair.product_address},
              {label: `数量 ${Number(pair.index) + 1}`, address: pair.amount_address},
            ]),
            {label: "奖品", address: source.prize_address},
          ].filter(row => row.address).map(row => `${row.label}: ${configurationPhysicalTitle(row.address)}`).join('\n');
        }).catch(error => {state.shopMessage = error.message;});
    }
  }
  const changed = ({persist = false} = {}) => {
    if (persist) commitShopConfiguration();
    if (typeof onChange === "function") onChange();
  };
  document.querySelector("[data-jukebox-preview-configuration]")
    ?.addEventListener("change", event => {
      state.jukeboxPreviewConfiguration = Number(event.currentTarget.value);
      replaceHistoryUrl(currentViewUrl());
      changed();
    });
  document.querySelector("[data-vending-preview-family]")
    ?.addEventListener("change", event => {
      state.vendingPreviewFamily = Number(event.currentTarget.value);
      state.vendingPreviewConfiguration = 0;
      replaceHistoryUrl(currentViewUrl());
      changed();
    });
  document.querySelector("[data-vending-preview-configuration]")
    ?.addEventListener("change", event => {
      state.vendingPreviewConfiguration = Number(event.currentTarget.value);
      replaceHistoryUrl(currentViewUrl());
      changed();
    });
  document.querySelectorAll("[data-vending-amount]").forEach(node =>
    node.addEventListener("change", () => {
      const key = configurationDraftKey(
        node.dataset.shopFamily, node.dataset.shopRecord
      );
      const slot = Number(node.dataset.shopSlot);
      const values = state.shopView?.[key];
      if (!values || slot >= values.length) return;
      const wholeQuantity = Number(node.dataset.shopFamily) === 13;
      const special = wholeQuantity ? 0 : Number(values[slot] || 0) & 0x80;
      const amount = Number(node.value);
      const maximum = wholeQuantity ? 255 : 127;
      if (!node.value.trim() || !Number.isInteger(amount) || amount < 0 || amount > maximum) {
        node.value = String(Number(values[slot]) & maximum);
        state.shopMessage = `输入无效：数量须为 0–${maximum} 的整数`;
        const status = document.querySelector("#shop-save-state");
        if (status) {status.textContent = state.shopMessage; status.hidden = false;}
        return;
      }
      values[slot] = special | amount;
      changed({persist: true});
    })
  );
  document.querySelectorAll("[data-vending-special]").forEach(node =>
    node.addEventListener("change", () => {
      const key = configurationDraftKey(
        node.dataset.shopFamily, node.dataset.shopRecord
      );
      const slot = Number(node.dataset.shopSlot);
      const values = state.shopView?.[key];
      if (!values || slot >= values.length) return;
      values[slot] = (Number(values[slot] || 0) & 0x7F)
        | (node.checked ? 0x80 : 0);
      changed({persist: true});
    })
  );
}

// 传送开放控件写入当前存档字段，流程控件只选择正文阶段。
function bindTeleportPreviewControls(onChange) {
  void mountFacilityParameters();
  const rerender = () => {
    replaceHistoryUrl(currentViewUrl());
    if (typeof onChange === "function") onChange();
  };
  if (!createSaveCurrentFieldObjects(state).ready())
    void ensureSaveCurrentFieldObjects(state).then(rerender).catch(error => {state.shopMessage = error.message;});
  document.querySelectorAll("[data-teleport-destination]").forEach(node =>
    node.addEventListener("change", async () => {
      const destinationId = Math.max(
        0, Math.min(11, Number(node.dataset.teleportDestination) || 0)
      );
      const fields = await ensureSaveCurrentFieldObjects(state);
      fields.object(`save.slot.${interfacePreviewContext().slot}.teleport_destination.${destinationId}.unlocked`).set(node.checked);
      rerender();
    })
  );
  document.querySelectorAll("[data-teleport-dialogue-state]").forEach(node =>
    node.addEventListener("click", () => {
      const dialogueId = String(node.dataset.teleportDialogueState || "");
      if (!dialogueId || dialogueId === state.teleportPreviewDialogue) return;
      state.teleportPreviewDialogue = dialogueId;
      rerender();
    })
  );
  document.querySelector("[data-teleport-restore-save7]")
    ?.addEventListener("click", async () => {
      const fields = await ensureSaveCurrentFieldObjects(state), slot = interfacePreviewContext().slot;
      fields.resetFields(Array.from({length: 12}, (_, index) => `save.slot.${slot}.teleport_destination.${index}.unlocked`));
      rerender();
    });
}

function renderFrogRace() {
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === "frog-race");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面"], ["config", "配置"]]);
  if (state.facilityTab === "ui") return `${tabs}${renderFacilityUi(facility)}`;
  return `${tabs}${facilityParameterMarkup(facility.id)}${renderFacilityRoutines(facility)}`;
}

export { bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview };
