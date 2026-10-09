import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { physicalLocationMarkup, esc, prepareModuleComponent, renderModuleComponent, hydrateModuleComponents, currentTextReferenceLink, resourceForwardReferenceCell, tableValueStack, hiddenTeleportDestination, itemResourceUid, currentTextReference, audioCommandLabel } from './element-tree-DsgOBeTK.js';
import { handleMarkup } from './preview-DMSrQMyk.js';
import { eventFlagTextMarkup, eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';
import { state, resolveTab } from './emulator-DynsZsth.js';
import { createSaveCurrentFieldObjects, ensureSaveCurrentFieldObjects } from './prg-loaders-BmwiQmdC.js';
import { replaceHistoryUrl, currentViewUrl, interfacePreviewContext } from './ui-editor-nodes-CtPdwTyu.js';
import { vendingServiceResponsePreview, controllerServicePreview, vendingServiceResponseEntries } from './service-preview-scene-76gf-8YL.js';
import { fieldSubmenuCodeSource, db, fieldSubmenuCodeValues, fieldSubmenuCodeValue, FIELD_SUBMENU_CODE_PARAMETERS, UI_FACILITY_PARAMETER_RESOURCE_IDS, HIDDEN_TELEPORT_RESOURCE_ID, hex, textRecordRuntimeTokens, textRecordEditorTokens, textRecordComponents, ITEM_CATEGORIES } from './battle-result-script-runtime-B_EClFew.js';
import { bindHiddenTeleportControls, controllerTargetsMarkup, hiddenTeleportConditionsMarkup } from './teleport-hidden-links-IE1jgp1P.js';
import { bindInterfacePageWorkbench, resolveInterfacePageEditorPreview, interfacePageModel, teleportDestinationsMarkup, renderInterfacePage } from './interface-pages-Cnmx21yc.js';
import { controllerHref } from './battle-result-state-machine-CED-HbAa.js';
import { resolveFacilityScreenPreview } from './ui-construction-preview-C97hIjGW.js';
import { facilityConfigurationLabel } from './configuration-summary-NWu3_nCt.js';
import './components-BtgMeFr-.js';
import { shopConfigurationPicker } from './interface-state-frame-CIpATh0H.js';
import { bindReferencePicker } from './scene-elevators-N46oPTJC.js';
import { dataTable } from './pattern-pixel-editor-B8puYQ8A.js';
import { itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import './components-3dCXHuuQ.js';
import './device-service-context-62eJOnPV.js';
import { bindFacilityFieldControls, commitShopConfiguration, facilityOriginalResetControl } from './shops-DzcKMGb8.js';
import { bindGameUiWorkbench, selectedGameUiWorkbenchNode, gameUiWorkbenchPreviewSelection, renderGameUiWorkbench } from './game-ui-workbench-OnWQkisJ.js';
import { serviceFamilyPage } from './story-event-links-CRjG_25M.js';
import './facility-window-semantics-BvUme8Kk.js';
import './package-schema-paths-gCIepLXx.js';
import './overview-CxFLx7O1.js';
import './page-package-inputs-DcoC8ZQj.js';
import './interface-pattern-banks-DmLVA2TH.js';
import './interaction-components-cOINn83e.js';
import './charset-C-1TZfXo.js';
import './preview-sound-DsPhxRYS.js';
import './document-controls-CnG0ytdg.js';
import './battle-simulation-player-ZYN9IgYB.js';
import './battle-actors-B548R92n.js';
import './page-runtime-paths-C0wxpxf1.js';
import './story-component-labels-BPQiH9EW.js';
import './components-DqADvo3I.js';
import './in-page-tabs-BYzTkeOF.js';
import './components-DyJFa-y0.js';
import './scene-actor-interaction-picker-DgyPSnLd.js';
import './rectangle-preset-controls-vTa_haKM.js';
import './record-BUqGpJTU.js';
import './text-record-structure-editor-nkc-6gHL.js';
import './components-BzBzUfap.js';
import './generic-shop-CNIYVl4D.js';
import './machine-service-model-CVOWXvhE.js';
import './machine-state-controller-BqLOoZvL.js';
import './system-state-controller-CjaW3RRa.js';
import './service-pages-CZwQ_DjO.js';
import './components-D8GMS6HI.js';
import './vehicles-C1pv7I-R.js';
import './vehicle-field-session-CBRi3Az7.js';
import './characters-BFq1hik2.js';
import './actor-appearance-C7XjeDLZ.js';
import './battle-scene-composer-2IiON3Cb.js';
import './sram-CuBZYYNn.js';
import './emulator-ZO0nE59-.js';
import './chr-CWVtqLX5.js';
import './monsters-BPjlt1RQ.js';
import './encounter-DuEBgoNG.js';
import './visual-components-jpzfYr1D.js';

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
  const resources = UI_FACILITY_PARAMETER_RESOURCE_IDS.filter(id =>
    id.startsWith(`ui-facility:${facilityId}:`) && id !== HIDDEN_TELEPORT_RESOURCE_ID);
  return `<section class="panel"><h2>配置字段</h2>${resources.map(id =>
    `<div id="facility-parameters-${id.replaceAll(':', '-')}" data-facility-parameter-fields="${esc(id)}"></div>`).join('')}</section>`;
}

async function mountFacilityParameters() {
  for (const host of document.querySelectorAll('[data-facility-parameter-fields]')) {
    if (host.dataset.facilityParametersReady) continue;
    try {
      const objects = await db.getFieldObjects(host.dataset.facilityParameterFields);
      if (!host.isConnected) return;
      for (const object of objects) await object.mount(host);
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

function configurationOptions(entry, selected) {
  return (entry?.records || []).map(record =>
    `<option value="${Number(record.id)}" ${Number(record.id) === Number(selected) ? "selected" : ""}>${esc(facilityConfigurationLabel({...entry, id: record.id}, facilityConfigurationDraftValues(entry.family_id, record.id)))}</option>`
  ).join("");
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
  const {entry, record} = selectedConfigurationRecord(
    0x0A, state.jukeboxPreviewConfiguration
  );
  if (!entry || !record) return "";
  state.jukeboxPreviewConfiguration = Number(record.id);
  return `${facilitySaveToolbar()}
    <div class="data-editor-toolbar"><label>预览配置<select data-jukebox-preview-configuration>${configurationOptions(entry, record.id)}</select></label></div>
    <div data-facility-original-scope>${dataTable({
      columns: ["配置", "曲目槽", "当前曲目", "Original"]
        .map((label, key) => ({key: String(key), label})),
      rows: entry.records, reportStatus: false,
      renderRow: record => {
        const values = facilityConfigurationDraftValues(0x0A, record.id);
        return `<tr>
        <td>${handleMarkup(facilityConfigurationUid("jukebox", record.id))}${physicalLocationMarkup({rows: [{label: "配置记录", address: record.address}]})}</td>
        <td class="mono">${values.length}</td>
        <td><div class="shop-slots">${values.map((value, slot) =>
          `<div><small>#${slot + 1}</small><div data-jukebox-track="${slot}"><input type="number" class="shop-slot" hidden
            min="0" max="255" value="${Number(value)}" ${shopSlotAttributes(0x0A, record.id, slot)}></div></div>`
        ).join("")}</div></td>
        <td>${facilityOriginalResetControl({
          kind: "record",
          familyId: 0x0A,
          recordId: record.id,
        })}</td>
      </tr>`;
      },
    })}</div>`;
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
  return `${facilitySaveToolbar()}
    <div class="data-editor-toolbar">
      <label>类型<select data-vending-preview-family>
        <option value="11" ${familyId === 0x0B ? "selected" : ""}>道具自动售货机</option>
        <option value="12" ${familyId === 0x0C ? "selected" : ""}>炮弹自动售货机</option>
        <option value="13" ${familyId === 0x0D ? "selected" : ""}>双配置设施</option>
      </select></label>
      <label>预览配置<select data-vending-preview-configuration>${configurationOptions(entry, record.id)}</select></label>
    </div>
    <div data-facility-original-scope>${dataTable({
      columns: ["商品族", "配置", "商品", "数量", "特殊", "单价 / 小计 / Original"]
        .map((label, key) => ({key: String(key), label})),
      rows: entry.records, reportStatus: false,
      renderRow: record => {
        const values = facilityConfigurationDraftValues(familyId, record.id);
        const variant = (state.project.facilities?.facilities || [])
          .find(item => item.id === "vending-machine")?.configuration?.variants
          ?.find(item => Number(item.family_id) === familyId
            && Number(item.family_configuration_id) === Number(record.id));
        return `
        <tr data-vending-configuration="${Number(record.id)}"><td colspan="6">${variant ? handleMarkup(facilityConfigurationUid("vending-machine", variant.id)) : hex(record.id, 2)}${physicalLocationMarkup({rows: [{label: "配置记录", address: record.address}]})}</td></tr>
        ${Array.from({length: Math.min(6, values.length)}, (_, slot) => {
          const productId = Number(values[slot]);
          const amountByte = Number(values[slot + 6] || 0);
          const amount = familyId === 13 ? amountByte : amountByte & 0x7F;
          const price = vendingUnitPrice(familyId, productId);
          const unitPrice = price == null ? null : price & 255;
          return `<tr>
            <td class="mono">#${slot + 1}</td>
            <td class="mono">${hex(productId, 2)}</td>
            <td>${vendingItemPicker(familyId, record.id, slot, productId)}</td>
            <td><input class="inline-data-input" type="number" min="0" max="${familyId === 13 ? 255 : 127}"
              value="${amount}" data-vending-amount data-shop-family="${familyId}"
              data-shop-record="${record.id}" data-shop-slot="${slot + 6}"></td>
            <td>${familyId === 13 ? '—' : `<label class="check"><input type="checkbox" data-vending-special
              data-shop-family="${familyId}" data-shop-record="${record.id}"
              data-shop-slot="${slot + 6}" ${amountByte & 0x80 ? "checked" : ""}> bit7</label>`}</td>
            <td><div class="table-cell-stack">
              <span ${productId === 14 ? `data-vending-overflow-price="${amount}"` : ''}>${unitPrice == null ? "单价缺失" : `${unitPrice}G × ${amount} = <b>${unitPrice * amount}G</b>`}</span>
              ${facilityOriginalResetControl({
                kind: "vending-pair",
                familyId,
                recordId: record.id,
                slot,
              })}
            </div></td>
          </tr>`;
        }).join("")}
        ${values.length > 12 ? `<tr>
          <td colspan="2"><b>抽奖奖品</b></td>
          <td colspan="4"><div class="inline-original-editor">
            ${vendingItemPicker(familyId, record.id, 12, values[12])}
            ${facilityOriginalResetControl({
              kind: "vending-prize",
              familyId,
              recordId: record.id,
            })}
          </div></td>
        </tr>` : ""}
      `;
      },
    })}</div>`;
}

function facilityUiTarget(facility) {
  const uid = `ui-facility:${facility.id}`;
  return `<button class="resource-inline-link" type="button" data-resource-target="${uid}">${esc(facilityDisplayLabel(facility))}界面 · ${uid}</button>`;
}

function facilityInstanceCell(instances) {
  if (!(instances || []).length) return `<span class="resource-empty">ROM 中未引用</span>`;
  return `<div class="table-cell-stack">${instances.map(instance => {
    const uid = instance.scene_object_uid;
    return `<button class="resource-inline-link" type="button" data-resource-target="${esc(uid)}">场景 ${esc(instance.scene_id_hex)} · (${instance.x}, ${instance.y}) · 调查点 ${esc(instance.point_id_hex)}</button>`;
  }).join("")}</div>`;
}

function renderUiFacilities(onlyId = null) {
  const facilities = state.project.facilities?.facilities || [];
  if (!facilities.length) return "";
  const q = state.query.trim().toLowerCase();
  const pageFacilities = onlyId ? facilities.filter(item => item.id === onlyId) : facilities;
  const shown = pageFacilities.filter(item => !q || JSON.stringify(item).toLowerCase().includes(q));
  const audioTarget = (commandId, text) => {
    const uid = `audio-command:${Number(commandId).toString(16).toUpperCase().padStart(2, "0")}`;
    return `<button class="resource-inline-link" type="button" data-resource-target="${uid}">${esc(text || uid)}</button>`;
  };
  const itemNames = new Map((state.project.game_data?.items?.records || []).map(item => [Number(item.id), item.name]));
  const itemTarget = itemId => {
    if (itemId === null || itemId === undefined) return `<span class="resource-empty">无抽奖奖品</span>`;
    const uid = itemResourceUid(itemId);
    return `<button class="resource-inline-link" type="button" data-resource-target="${uid}">${esc(itemNames.get(Number(itemId)) || uid)} · ${uid}</button>`;
  };
  const configuration = facility => {
    const config = facility.configuration || {};
    if (facility.id === "jukebox") {
      return (config.tracks || []).map(track =>
        `<span><small>配置 ${esc(track.configuration_id_hex)} · #${track.index} · ${esc(track.visible_label)}</small>${audioTarget(track.audio_command_id, `声音 ${track.audio_command_id_hex}`)}</span>`
      ).join("");
    }
    if (facility.id === "vending-machine") {
      return [...(config.slots || []).map(slot =>
        `<span><small>#${slot.index} · ${esc(slot.visible_label)} ×${slot.amount} · ${slot.observed_price}G</small><b class="mono">类型 ${esc(slot.type_code_hex)} · 数量/标志 ${esc(slot.amount_flags_hex)}</b></span>`
      ), `<span><small>抽奖奖品</small>${itemTarget(config.prize_item_id)}</span>`, `<span><small>配置目录</small><b>${(config.variants || []).length} 套 · 当前 ${esc(config.active_variant_id_hex)}</b></span>`].join("");
    }
    return [
      `<span><small>实例下注档位</small><b>${(config.variants || []).map(variant => `${variant.price}G`).join(" / ")}</b></span>`,
      `<span><small>价格选择</small><b>实例 $CC 索引</b></span>`,
      ...(config.visible_racers || []).map(racer =>
        `<span><small>#${racer.index} · 运行画面识别</small><b>${esc(racer.visible_label)} ×${racer.observed_odds}</b></span>`
      ),
    ].join("");
  };
  const vending = onlyId === "vending-machine"
    ? facilities.find(facility => facility.id === "vending-machine")
    : null;
  const variants = vending?.configuration?.variants || [];
  const frog = onlyId === "frog-race"
    ? facilities.find(facility => facility.id === "frog-race")
    : null;
  const frogVariants = frog?.configuration?.variants || [];
  const ammoNames = new Map(
    (state.project.game_data?.shells?.records || []).map(shell => [Number(shell.id), shell.name])
  );
  const shownVariants = variants.filter(variant => !q || [
    JSON.stringify(variant),
    ...(variant.slots || []).map(slot => itemNames.get(Number(slot.product_id)) || ammoNames.get(Number(slot.product_id)) || ""),
    itemNames.get(Number(variant.prize_item_id)) || "",
  ].join(" ").toLowerCase().includes(q));
  const variantRows = shownVariants.map(variant => {
    const uid = facilityConfigurationUid("vending-machine", variant.id);
    // 槽数固定为 6：商品与数量各占 6 列，可以按槽位纵向比较不同配置。
    const slots = variant.slots || [];
    const productCells = Array.from({length: 6}, (_, index) => {
      const slot = slots[index];
      if (!slot) return `<td><span class="resource-empty">—</span></td>`;
      return `<td>${variant.family === "item"
        ? itemTarget(slot.product_id)
        : `<span title="${esc(slot.product_id_hex)}">${esc(ammoNames.get(Number(slot.product_id)) || `炮弹类型 ${slot.product_id_hex}`)}</span>`}</td>`;
    }).join("");
    const amountCells = Array.from({length: 6}, (_, index) => {
      const slot = slots[index];
      if (!slot) return `<td class="right"><span class="resource-empty">—</span></td>`;
      return `<td class="right mono" title="${esc(slot.amount_flags_hex)}${
        slot.special_flag ? " · bit7" : ""}">×${slot.amount}${slot.special_flag ? "*" : ""}</td>`;
    }).join("");
    return `<tr data-resource-uid="${uid}">
      <td><button class="resource-uid" type="button" data-resource-query="${uid}">${uid}</button></td>
      <td class="mono" ${variant.active_in_save_state_9 ? 'title="存档 9 当前配置"' : ""}>${esc(variant.id_hex)}${variant.active_in_save_state_9 ? " ●" : ""}</td>
      <td>${variant.family === "item" ? "普通道具" : "炮弹"}</td>
      ${productCells}
      ${amountCells}
      <td>${itemTarget(variant.prize_item_id)}</td>
      <td>${facilityInstanceCell(variant.instances)}</td>
      <td>${facilityUiTarget(vending)}</td>
      <td>${resourceForwardReferenceCell(uid)}</td>
    </tr>`;
  }).join("");
  const title = facilityDisplayLabel(pageFacilities[0]);
  const variantTable = vending ? `
    <div class="section-line"><h2>商品配置</h2><span>${shownVariants.length} / ${variants.length} 条记录 · 9 套道具 + 10 套炮弹</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>资源 ID</th><th>配置 ID</th><th>商品类型</th><th>商品 1</th><th>商品 2</th><th>商品 3</th><th>商品 4</th><th>商品 5</th><th>商品 6</th><th>数量 1</th><th>数量 2</th><th>数量 3</th><th>数量 4</th><th>数量 5</th><th>数量 6</th><th>抽奖奖品</th><th>场景实例</th><th>关联界面</th><th>引用资产</th></tr></thead>
      <tbody>${variantRows}</tbody>
    </table></div>` : "";
  const shownFrogVariants = frogVariants.filter(variant => !q || JSON.stringify(variant).toLowerCase().includes(q));
  const frogVariantTable = frog ? `
    <div class="section-line"><h2>下注价格配置</h2><span>${shownFrogVariants.length} / ${frogVariants.length} 条记录 · 按场景实例索引</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>资源 ID</th><th>配置 ID</th><th>每轮下注</th><th>场景实例</th><th>关联界面</th><th>引用资产</th></tr></thead>
      <tbody>${shownFrogVariants.map(variant => {
        const uid = facilityConfigurationUid("frog-race", variant.id);
        return `<tr data-resource-uid="${uid}">
          <td><button class="resource-uid" type="button" data-resource-query="${uid}">${uid}</button></td>
          <td class="mono"><b>${esc(variant.id_hex)}</b>${variant.active_in_save_state_10 ? "<small>存档 10 当前实例</small>" : ""}</td>
          <td><b>${Number(variant.price)}G</b><small>${esc(variant.price_hex)}</small></td>
          <td>${facilityInstanceCell(variant.instances)}</td>
          <td>${facilityUiTarget(frog)}</td>
          <td>${resourceForwardReferenceCell(uid)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>` : "";
  return `<div class="section-line"><h2>${esc(title)}配置与入口</h2><span>${shown.length} / ${pageFacilities.length} 条记录 · 存档仅作定位证据</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>资源 ID</th><th>名称 / 类型</th><th>运行证据</th><th>ROM 配置 / 观察值</th><th>代码入口</th><th>引用资产</th></tr></thead>
      <tbody>${shown.map(facility => {
        const uid = `ui-facility:${facility.id}`;
        return `<tr data-resource-uid="${uid}">
          <td><button class="resource-uid" type="button" data-resource-query="${uid}">${uid}</button></td>
          <td><b>${esc(facilityDisplayLabel(facility))}</b><small>${esc(facility.kind)}</small></td>
          <td>${tableValueStack([`即时存档 ${facility.save_state_slot}`, facility.evidence])}</td>
          <td><div class="table-cell-stack"${facility.configuration?.layout || facility.configuration?.racer_note ? ` title="${esc(facility.configuration?.layout || facility.configuration?.racer_note)}"` : ""}>${configuration(facility)}</div></td>
          <td>${tableValueStack((facility.entrypoints || []).map(entry => entry.name))}</td>
          <td>${resourceForwardReferenceCell(uid, ["ui-script-record", "audio-command"])}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>${variantTable}${frogVariantTable}`;
}

function renderFacilityRoutines(facility) {
  const q = state.query.trim().toLowerCase();
  const routines = (facility?.entrypoints || []).map((entry, index) => ({...entry, index}))
    .filter(entry => !q || JSON.stringify(entry).toLowerCase().includes(q));
  return `<div class="section-line"><h2>程序入口</h2><span>${routines.length} / ${(facility?.entrypoints || []).length} 个程序 · 已验证</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>资源 ID</th><th>入口 ID</th><th>功能</th><th>所属设施</th></tr></thead>
      <tbody>${routines.map(entry => {
        const uid = `ui-facility:${facility.id}:routine:${Number(entry.index).toString(16).toUpperCase().padStart(2, "0")}`;
        return `<tr data-resource-uid="${uid}">
          <td><button class="resource-uid" type="button" data-resource-query="${uid}">${uid}</button></td>
          <td class="mono"><b>${esc(entry.name)}</b></td>
          <td>${eventFlagTextMarkup(entry.description)}</td>
          <td><button class="resource-inline-link" type="button" data-resource-target="ui-facility:${facility.id}">${esc(facilityDisplayLabel(facility))}</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

function renderComputerControllerConfiguration(facility) {
  const q = state.query.trim().toLowerCase();
  const configuration = facility.configuration || {};
  const controls = (configuration.controls || []).filter(item =>
    !q || JSON.stringify(item).toLowerCase().includes(q)
  );
  const instances = (facility.instances || []).filter(item =>
    !q || JSON.stringify(item).toLowerCase().includes(q)
  );
  const observed = facility.observed_instance || {};
  return `<div class="section-line"><h2>控制面板</h2><span>${controls.length} / ${configuration.control_count || 0} 个输入 · ROM 文本记录</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>输入</th><th>类型</th><th>界面记录</th><th>作用</th></tr></thead>
      <tbody>${controls.map(control => `<tr>
        <td class="mono"><b>${esc(control.label)}</b><small>${esc(control.id)}</small></td>
        <td>${control.kind === "numeric-key" ? "数字键" : control.kind === "exit-command" ? "退出" : "状态控制"}</td>
        <td>${currentTextReferenceLink(control.source_record)}</td>
        <td>${control.kind === "numeric-key"
          ? "写入控制器的实例参数 / 数字选择"
          : control.kind === "exit-command"
            ? "退出整屏控制器并返回场景"
            : "提交设施的 OPEN / CLOSE 状态命令"}</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="section-line"><h2>场景控制台</h2><span>${instances.length} / ${(facility.instances || []).length} 个物理调查点 · 命令 $36 / $37 / $38</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>调查点</th><th>场景</th><th>命令</th><th>实例参数</th><th>坐标</th><th>受控对象与事件位</th><th>运行证据</th><th>引用资产</th></tr></thead>
      <tbody>${instances.map(instance => {
        const uid = instance.scene_object_uid;
        const isObserved = String(uid) === String(observed.scene_object_uid);
        return `<tr data-resource-uid="${esc(uid)}">
          <td>${handleMarkup(uid)}<button class="resource-inline-link" type="button" data-resource-target="${esc(uid)}" title="打开记录">↗</button></td>
          <td class="mono"><b>${esc(instance.scene_id_hex)}</b></td>
          <td class="mono"><b>${esc(instance.command_id_hex)}</b></td>
          <td class="mono">${esc(instance.instance_id_hex)}</td>
          <td><a class="editor-inline-link" data-controller-link="controller" href="${esc(controllerHref(instance, state.project))}">(${Number(instance.x)}, ${Number(instance.y)}) ↗</a></td>
          <td data-controller-instance="${esc(uid)}">${controllerTargetsMarkup(instance, state.project)}</td>
          <td>${isObserved ? "<b title=\"界面调用已确认\">即时存档 2</b>" : "<span class=\"resource-empty\">同族控制台</span>"}</td>
          <td>${resourceForwardReferenceCell(uid)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
}

function renderTeleportConfiguration(facility) {
  const hidden = hiddenTeleportDestination(state.project);
  const q = state.query.trim().toLowerCase();
  const configuration = facility.configuration || {};
  const instances = (facility.instances || []).filter(item =>
    !q || JSON.stringify(item).toLowerCase().includes(q)
  );
  const observed = facility.observed_instance || {};
  return `${teleportDestinationsMarkup(state.project, {query: state.query})}
    ${hidden ? `<section class="panel" id="hidden-teleport"><header><h2>第 13 目的地 · 隐藏目的地</h2></header>
      ${hiddenTeleportConditionsMarkup(state.project)}
      <p>目标 scene:${Number(hidden.scene_id).toString(16).toUpperCase().padStart(2, '0')} ·
        转场相机原点 (${Number(hidden.coordinate_x)}, ${Number(hidden.coordinate_y)}) ·
        人物落点 (${(Number(hidden.coordinate_x) + 8) & 255}, ${(Number(hidden.coordinate_y) + 7) & 255})</p>
      <div data-hidden-teleport-fields></div></section>` : ''}
    <div class="section-line"><h2>传送器入口</h2><span>${instances.length} / ${(facility.instances || []).length} 个调查点 · 12 个场景</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>调查点</th><th>场景</th><th>命令 / 实例</th><th>坐标</th><th>存档证据</th><th>引用资产</th></tr></thead>
      <tbody>${instances.map(instance => {
        const uid = instance.scene_object_uid;
        const isObserved = String(uid) === String(observed.scene_object_uid);
        return `<tr data-resource-uid="${esc(uid)}">
          <td>${handleMarkup(uid)}<button class="resource-inline-link" type="button" data-resource-target="${esc(uid)}" title="打开记录">↗</button></td>
          <td class="mono"><b>${esc(instance.scene_id_hex)}</b></td>
          <td class="mono"><b>${esc(instance.command_id_hex)}</b><small>实例 ${esc(instance.instance_id_hex)}</small></td>
          <td>(${Number(instance.x)}, ${Number(instance.y)})</td>
          <td>${isObserved ? "<b title=\"完整流程已确认\">即时存档 7</b>" : "<span class=\"resource-empty\">同类传送终端</span>"}</td>
          <td>${resourceForwardReferenceCell(uid)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <div class="section-line"><h2>运行状态</h2><span>ROM 配置与运行 RAM 的边界</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>目的地目录</th><th>开放状态</th><th>选择与提交</th><th>落点输出</th></tr></thead>
      <tbody><tr>
        <td>${configuration.destination_count || 0} 项固定目录<small>record:0D:048–059</small></td>
        <td>${(configuration.destinations || []).map(row => eventFlagReferenceMarkup(row.availability_flag)).join(' · ')}</td>
        <td class="mono">${esc(configuration.runtime_list_selector_ram || "")} / ${esc(configuration.selected_destination_ram || "")}</td>
        <td class="mono">${esc(configuration.coordinate_output_ram || "")}<small>X/Y 表</small></td>
      </tr></tbody>
    </table></div>${physicalLocationMarkup({rows: [
      {label: "坐标表", address: configuration.coordinate_table},
    ]})}`;
}

function renderTeleportTerminal() {
  const facility = (state.project.facilities?.facilities || [])
    .find(item => item.id === "teleport-terminal");
  if (!facility) return ``;
  const tabs = facilityTabs([["ui", "界面与流程"], ["config", "目的地与入口"]]);
  if (state.facilityTab === "ui") {
    return `${tabs}${renderFacilityUi(facility)}`;
  }
  return `${tabs}${renderTeleportConfiguration(facility)}${facilityParameterMarkup(facility.id)}${renderFacilityRoutines(facility)}`;
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
  return `<nav class="text-mode-tabs">${tabs.map(([id, text]) =>
    `<button type="button" data-facility-tab="${esc(id)}" class="${
      state.facilityTab === id ? "active" : ""
    }">${esc(text)}</button>`
  ).join("")}</nav>`;
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
  if (definition && (selected?.serviceFragment || selected?.serviceStage)) return preview;
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
    return entry && record ? facilityConfigurationPicker(entry, record, 'data-jukebox-preview-configuration', '曲目配置') : "";
  }
  if (facility.id === "vending-machine") {
    const {familyId, entry, record} = vendingFamilyAndRecord();
    return entry && record ? `<label class="screen-workbench-selection">
      <span>商品类型</span><select data-vending-preview-family>
        <option value="11" ${familyId === 0x0B ? "selected" : ""}>道具</option>
        <option value="12" ${familyId === 0x0C ? "selected" : ""}>炮弹</option>
        <option value="13" ${familyId === 0x0D ? "selected" : ""}>双配置设施</option>
      </select>
    </label>${facilityConfigurationPicker(entry, record, 'data-vending-preview-configuration', '场景配置')}` : "";
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
  if (definition) return renderInterfacePage({definition, toolbarMarkup: facilityWorkbenchToolbar(facility), inspectorExtraMarkup: identity});
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
    toolbarMarkup: facilityWorkbenchToolbar(facility),
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
      host.innerHTML = `${unit}G × ${amount} = <b>${unit * amount}G</b>`;
    }
  }).catch(error => {state.shopMessage = error.message;});
  document.querySelectorAll('.facility-ui-workbench [data-module-reference-picker]')
    .forEach(picker => bindReferencePicker(picker));
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
          const host = addressRoot.querySelector("[data-physical-location]");
          if (!host) return;
          const open = host.open;
          host.outerHTML = physicalLocationMarkup({rows: [
            {label: "配置记录", address: record.address},
            ...(source.slots || []).flatMap(pair => [
              {label: `商品 ${Number(pair.index) + 1}`, address: pair.product_address},
              {label: `数量 ${Number(pair.index) + 1}`, address: pair.amount_address},
            ]),
            {label: "抽奖奖品", address: source.prize_address},
          ].filter(row => row.address)});
          if (open) addressRoot.querySelector("[data-physical-location]").open = true;
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
  void bindHiddenTeleportControls().catch(error => {
    document.querySelector('[data-hidden-teleport-fields]')?.insertAdjacentHTML('beforeend',
      `<p role="alert">${esc(error.message)}</p>`);
  });
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
  return `${tabs}${renderUiFacilities("frog-race")}${facilityParameterMarkup(facility.id)}${renderFacilityRoutines(facility)}${
    physicalLocationMarkup({rows: [{label: "价格表", address: facility.configuration?.price_table}]})}`;
}

export { bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview };
