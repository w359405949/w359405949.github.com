import { bindFixedTextEditors, resetToOriginalButton, setTableStatus, bindFieldResetToOriginalButtons, fixedTextEditorMarkup, dataTable, fixedTextRecordText } from './pattern-pixel-editor-B8puYQ8A.js';
import { syncReferencePickerControl, bindGroupedReferenceSelect, hydrateReferenceFieldPickers } from './scene-elevators-N46oPTJC.js';
import { hydrateItemPickers, itemPickerFieldMarkup } from './attack-chr-tile-selector-DxIfuyLU.js';
import { facilityConfigurationSummaryContext, vehicleName, facilityConfigurationSummary, rentalPresets, rentalPresetEntries, chassisName } from './configuration-summary-NWu3_nCt.js';
import { eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';
import { requireBrowserProjectRepository, esc, $, setProjectFields, applyFacilityConfigurationProjection, resourceFieldByteRanges, indexedResource } from './element-tree-DsgOBeTK.js';
import { createShopStateWorkbench } from './service-pages-CZwQ_DjO.js';
import { vehicleUid, vehicleEquipmentSlots } from './vehicles-C1pv7I-R.js';
import { vehiclePresetPickerMarkup, vehiclePresetOptionMarkup } from './in-page-tabs-BYzTkeOF.js';
import { replaceHistoryUrl, currentViewUrl, render, openRecord, recordViewHref } from './ui-editor-nodes-CtPdwTyu.js';
import { state, resolveTab } from './emulator-DynsZsth.js';
import { db, trackAutoSavePreparation, hex, flushAllAutoSaves, ITEM_CATEGORIES, HUMAN_EQUIPMENT_CATEGORIES, TANK_EQUIPMENT_CATEGORIES } from './battle-result-script-runtime-B_EClFew.js';
import { canonicalJsonEqual } from './visual-metasprites-DJP54-bV.js';
import { bindOwnerReferenceList, ownerReferenceListMarkup, withCurrentOwnerRecord, currentOwnerReferenceImpact } from './battle-result-state-machine-CED-HbAa.js';
import { fieldAddressTable } from './rectangle-preset-controls-vTa_haKM.js';
import { panel, fields, recordPage } from './record-BUqGpJTU.js';
import { handleMarkup } from './preview-DMSrQMyk.js';
import { ensureVehicleDraft, vehicleTableDirty, vehiclePresetDraft } from './vehicle-field-session-CBRi3Az7.js';
import './page-runtime-paths-C0wxpxf1.js';
import './package-schema-paths-gCIepLXx.js';
import './facility-window-semantics-BvUme8Kk.js';
import './story-event-links-CRjG_25M.js';
import './service-preview-scene-76gf-8YL.js';
import './ui-construction-preview-C97hIjGW.js';
import './prg-loaders-BmwiQmdC.js';
import './interface-pattern-banks-DmLVA2TH.js';
import './story-component-labels-BPQiH9EW.js';
import './components-DqADvo3I.js';
import './interface-state-frame-CIpATh0H.js';
import './machine-service-model-CVOWXvhE.js';
import './device-service-context-62eJOnPV.js';
import './components-D8GMS6HI.js';
import './overview-CxFLx7O1.js';
import './page-package-inputs-DcoC8ZQj.js';
import './characters-BFq1hik2.js';
import './battle-actors-B548R92n.js';
import './actor-appearance-C7XjeDLZ.js';
import './battle-scene-composer-2IiON3Cb.js';
import './battle-simulation-player-ZYN9IgYB.js';
import './sram-CuBZYYNn.js';
import './emulator-ZO0nE59-.js';
import './chr-CWVtqLX5.js';
import './text-record-structure-editor-nkc-6gHL.js';
import './monsters-BPjlt1RQ.js';
import './encounter-DuEBgoNG.js';
import './preview-sound-DsPhxRYS.js';
import './visual-components-jpzfYr1D.js';

// @editor-module 设施配置族：商店商品与服务参数
function pointerEntries() {
  return state.project?.facilities?.configuration_loader?.pointer_entries || [];
}

function itemRecords() {
  return state.project?.game_data?.items?.records || [];
}

function shellRecords() {
  return state.project?.game_data?.shells?.records || [];
}

// 开孔许可按武器类别取位，不修改携带物品字段。
const MOUNT_BITS = vehicleEquipmentSlots
  .filter(([, , mask]) => mask)
  .map(([, label, mask]) => ({mask, label: `允许挂${label}`, short: label}));

/**
 * 值的命名空间由提取器登记（见 mm_facilities 的 FAMILY_VALUE_NAMESPACES），
 * 前端不按数值范围现猜：
 *   item / shell   → 共用清单，各自已有独立编辑页，不需要"全部商品"分页
 *   service-goods  → 文本区 $0D 里该服务自己的一段商品名，需要"全部商品"分页
 *   vehicle-preset → 出租车型，候选与显示名取载具 preset 用途视图
 *   unknown        → 语义未解，按原始字节编辑
 */
function namespaceOf(entry) {
  return entry?.value_namespace || {namespace: "unknown"};
}

function slotSchemaOf(entry, slot) {
  return (namespaceOf(entry).slot_schema?.slots || [])
    .find(field => Number(field.slot) === Number(slot)) || null;
}

/** service-goods 的商品名走资源索引取当前文字，跟着字符映射进度走。 */
function goodsName(uid) {
  return indexedResource(uid)?.label || null;
}

const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));

let shopGoodsNameMessage = "";
let shopGoodsNameEditors = null;

function shopGoodsNameDraftDirty() {
  return Boolean(shopGoodsNameEditors?.dirtyCount);
}

function shopGoodsNameText(item) {
  return fixedTextRecordText(String(item?.textRecordId || ""));
}

function shopGoodsNameControl(item) {
  return fixedTextEditorMarkup({
    recordId: String(item?.textRecordId || ""),
    label: "名称", mode: "exact", compact: true, reset: false,
  });
}

function goodsOptionsFor(entry) {
  return (namespaceOf(entry).goods || []).map(item => ({
    value: Number(item.value),
    label: shopGoodsNameText({
      label: goodsName(item.resource_uid) || item.value_hex,
      textRecordId: item.text_record,
    }),
    uid: item.resource_uid,
    textRecordId: item.text_record,
    eventFlagReference: item.event_flag_reference,
  }));
}

function goodsPurchaseFlagMarkup(entry, value) {
  const good = (namespaceOf(entry).goods || []).find(item => Number(item.value) === Number(value));
  return good?.event_flag_reference ? eventFlagReferenceMarkup(good.event_flag_reference) : '';
}

function shopInstanceUid(entry, record) {
  const byteId = value => Number(value)
    .toString(16).toUpperCase().padStart(2, "0");
  return `application-config-instance:${byteId(entry.family_id)}:${byteId(record.id)}`;
}

function draftKey(familyId, recordId) {
  return `${familyId}:${recordId}`;
}

function normalizedFacilityResetSpec(spec) {
  const kind = String(spec?.kind || "record");
  const familyId = Number(spec?.familyId);
  const recordId = Number(spec?.recordId);
  const slot = spec?.slot === undefined || spec?.slot === null
    ? null : Number(spec.slot);
  if (!Number.isInteger(familyId) || !Number.isInteger(recordId) ||
      !["record", "vending-pair", "vending-prize"].includes(kind)) {
    throw new TypeError("设施 Original reset 标识无效");
  }
  if (kind === "vending-pair" &&
      (!Number.isInteger(slot) || slot < 0 || slot >= 6)) {
    throw new TypeError("售货机商品行必须指定 0–5 槽");
  }
  return {kind, familyId, recordId, slot};
}

function facilityResetControlKey(spec) {
  const normalized = normalizedFacilityResetSpec(spec);
  return [
    normalized.kind,
    normalized.familyId,
    normalized.recordId,
    normalized.slot ?? "-",
  ].join(":");
}

function facilityFamilyReference(document_, familyId, recordId) {
  const family = (document_?.families || []).find(
    item => Number(item.id) === Number(familyId),
  );
  const reference = (family?.records || []).find(
    item => Number(item.id) === Number(recordId),
  );
  if (!reference || typeof reference.record_id !== "string") {
    throw new Error(`facility-config 缺少 ${familyId}:${recordId}`);
  }
  return reference;
}

function facilityCanonicalAliases(document_, canonicalId) {
  const aliases = [];
  for (const family of document_?.families || []) {
    for (const reference of family.records || []) {
      if (reference.record_id === canonicalId) {
        aliases.push({
          familyId: Number(family.id),
          recordId: Number(reference.id),
        });
      }
    }
  }
  return aliases;
}

/**
 * Resolve UI family/local-record identities to the canonical document record.
 * Vending paths are index-based, so reject any base/value record reordering
 * instead of applying a reset to the wrong physical record.
 */
function facilityResetPlan(document_, spec, {
  baseDocument = document_,
} = {}) {
  const normalized = normalizedFacilityResetSpec(spec);
  const reference = facilityFamilyReference(
    document_,
    normalized.familyId,
    normalized.recordId,
  );
  const canonicalId = reference.record_id;
  const baseReference = facilityFamilyReference(
    baseDocument,
    normalized.familyId,
    normalized.recordId,
  );
  if (baseReference.record_id !== canonicalId) {
    throw new Error(
      `${normalized.familyId}:${normalized.recordId} 在 working/base 中指向不同记录`,
    );
  }
  const recordIndex = (document_?.records || []).findIndex(
    record => record.id === canonicalId,
  );
  const baseRecordIndex = (baseDocument?.records || []).findIndex(
    record => record.id === canonicalId,
  );
  if (recordIndex < 0 || baseRecordIndex < 0) {
    throw new Error(`facility-config 缺少 canonical record ${canonicalId}`);
  }
  const record = document_.records[recordIndex];
  const baseRecord = baseDocument.records[baseRecordIndex];
  const aliases = facilityCanonicalAliases(document_, canonicalId);
  if (normalized.kind === "record") {
    return {
      ...normalized,
      canonicalId,
      aliases,
      selectors: [{
        kind: "item",
        collectionPath: ["document", "records"],
        identityKey: "id",
        identityValue: canonicalId,
      }],
    };
  }
  if (recordIndex !== baseRecordIndex) {
    throw new Error(
      `${canonicalId} 在 working/base 中顺序不同，不能安全执行槽位 reset`,
    );
  }
  const slotIds = normalized.kind === "vending-pair"
    ? [normalized.slot, normalized.slot + 6] : [12];
  for (const slot of slotIds) {
    if (!record.slots?.[slot] || Number(record.slots[slot].id) !== slot) {
      throw new Error(`${canonicalId} 缺少售货机槽 ${slot}`);
    }
    if (!baseRecord.slots?.[slot] ||
        Number(baseRecord.slots[slot].id) !== slot) {
      throw new Error(`${canonicalId} 的 Original 缺少售货机槽 ${slot}`);
    }
  }
  return {
    ...normalized,
    canonicalId,
    aliases,
    paths: slotIds.map(slot => [
      "document", "records", recordIndex, "slots", slot, "value",
    ]),
    selectors: slotIds.map(slot => ({
      kind: "path",
      path: ["document", "records", recordIndex, "slots", slot, "value"],
    })),
  };
}

function facilityResetLocalSelection(values, spec) {
  const normalized = normalizedFacilityResetSpec(spec);
  if (normalized.kind === "record") return values || [];
  if (normalized.kind === "vending-pair") {
    return [values?.[normalized.slot], values?.[normalized.slot + 6]];
  }
  return [values?.[12]];
}

function facilityResetLocalDirty(draft, baseline, spec) {
  const normalized = normalizedFacilityResetSpec(spec);
  const key = draftKey(normalized.familyId, normalized.recordId);
  return !canonicalJsonEqual(
    facilityResetLocalSelection(draft?.[key], normalized),
    facilityResetLocalSelection(baseline?.[key], normalized),
  );
}

/** Replace only the reset selection in draft + last-saved W projection. */
function applyFacilityResetLocalSnapshot(
  draft,
  baseline,
  document_,
  spec,
) {
  const plan = facilityResetPlan(document_, spec);
  const restoredRecord = document_.records.find(
    record => record.id === plan.canonicalId,
  );
  const restored = restoredRecord.slots.map(slot => Number(slot.value));
  const slotIds = plan.kind === "record"
    ? restored.map((_value, slot) => slot)
    : plan.kind === "vending-pair"
      ? [plan.slot, plan.slot + 6] : [12];
  if (plan.kind === "record") {
    const sharedDraft = [...restored];
    const sharedBaseline = [...restored];
    for (const alias of plan.aliases) {
      const key = draftKey(alias.familyId, alias.recordId);
      if (Object.hasOwn(draft || {}, key)) draft[key] = sharedDraft;
      if (Object.hasOwn(baseline || {}, key)) baseline[key] = sharedBaseline;
    }
    return plan;
  }
  for (const alias of plan.aliases) {
    const key = draftKey(alias.familyId, alias.recordId);
    for (const slot of slotIds) {
      if (draft?.[key]) draft[key][slot] = restored[slot];
      if (baseline?.[key]) baseline[key][slot] = restored[slot];
    }
  }
  return plan;
}

function facilityOriginalResetControl(spec, label = "Reset") {
  const normalized = normalizedFacilityResetSpec(spec);
  const key = facilityResetControlKey(normalized);
  return `<span class="original-reset-control"
      data-facility-original-control="${esc(key)}"
      data-facility-reset-kind="${esc(normalized.kind)}"
      data-facility-reset-family="${normalized.familyId}"
      data-facility-reset-record="${normalized.recordId}"
      ${normalized.slot === null ? "" : `data-facility-reset-slot="${normalized.slot}"`}>
    ${resetToOriginalButton(key, {
      title: "恢复这一项的导入 original；其他设施配置编辑会保留",
      disabled: true,
    })}
  </span>`;
}

function selectedFamily() {
  const entries = pointerEntries();
  if (!entries.length) return null;
  return entries.find(
    entry => Number(entry.family_id) !== 13 && Number(entry.family_id) === Number(state.shopFamily)
  ) || entries[0];
}

const PRIVATE_CATALOG_NAMESPACES = new Set(["service-goods", "vehicle-preset"]);

const SHOP_FAMILY_LABELS = new Map([
  [0, "战车装备商店"],
  [1, "战车道具商店"],
  [2, "人类装备商店"],
  [3, "人类道具商店"],
  [4, "战车出租店"],
  [5, "特殊炮弹商店"],
  [6, "旅馆"],
  [7, "酒吧服务 A"],
  [8, "酒吧服务 B"],
  [9, "室内装饰商店"],
  [10, "自动点唱机"],
  [11, "道具自动售货机"],
  [12, "炮弹自动售货机"],
  [14, "草药商人"],
  [15, "电梯"],
]);

function shopFamilyLabel(entry) {
  return SHOP_FAMILY_LABELS.get(Number(entry?.family_id))
    || entry?.label
    || "商店与服务";
}

const NAMESPACE_NOTES = {
  "vehicle-preset": "出租战车取自战车预设表的 $08-$11 区段：这 10 条不绑定"
    + "玩家车位，租用时才实例化，不可改装、不可放道具、"
    + "也不会被玩家占有；详情统一在“战车属性 → 出租战车”编辑。",
  item: "商品取自共用道具表——道具与装备各有独立编辑页，这里不重复列全表。",
  shell: "商品取自共用炮弹表——炮弹效果有独立页面，这里不重复列出全部记录。",
  "service-goods": "商品是本服务自有的一份清单（买了直接使用，不进道具栏），"
    + "所以“全部商品”单独成页放在这个入口下。",
  unknown: "本族负载语义尚未解出，按原始字节编辑，不假装知道它们是什么。",
};

/** 应用命令号 = 族号 + $10（见配置加载器的 family_selector_bias）。 */

/** 一条门店实例卖什么，压成一行摘要，给场景编辑器等外部页面用。 */

/** 页头随配置族走：13 个导航入口共用 shops 一个视图。 */
function shopViewHeading() {
  const entry = selectedFamily();
  if (!entry) return null;
  const namespace = namespaceOf(entry);
  return {
    title: shopFamilyLabel(entry),
    description: `内部编号 ${entry.family_id_hex} · ${entry.record_count} 个场景实例 · `
      + NAMESPACE_NOTES[namespace.namespace],
  };
}

function shopTabs(entry) {
  // 业务数据与游戏画面分属两种编辑职责，所有配置族都保留独立的配置 / 界面页。
  // 只有拥有私有商品目录的服务才额外显示完整目录页。
  const namespace = namespaceOf(entry);
  const tabs = [["ui", "界面"], ["config", "配置"]];
  if ([2, 3].includes(Number(entry.family_id))) tabs.push(["buyer", "收购"]);
  if (PRIVATE_CATALOG_NAMESPACES.has(namespace.namespace)) {
    tabs.push(["catalog", `全部${namespace.goods_label || "商品"}`]);
  }
  state.shopTab = resolveTab("shop", tabs.map(([id]) => id), state.shopTab);
  return `<nav class="text-mode-tabs">${tabs.map(([id, text]) =>
    `<button type="button" data-shop-tab="${id}" class="${
      state.shopTab === id ? "active" : ""
    }">${text}</button>`
  ).join("")}</nav>`;
}

function goodsCatalogModel(entry) {
  const goods = goodsOptionsFor(entry);
  const stockedBy = new Map();
  for (const record of entry.records || []) {
    const values = state.shopView[draftKey(entry.family_id, record.id)] || [];
    for (const value of values) {
      if (!stockedBy.has(value)) stockedBy.set(value, []);
      if (!stockedBy.get(value).includes(record.id_hex)) {
        stockedBy.get(value).push(record.id_hex);
      }
    }
  }
  return {
    rows: goods.map(item => ({
      ...item,
      sellers: stockedBy.get(item.value) || [],
    })),
    stockedCount: stockedBy.size,
  };
}

/** 「全部商品」页：该服务的完整清单，并标出哪些实例在卖。 */
function renderGoodsCatalog(entry) {
  const namespace = namespaceOf(entry);
  const model = goodsCatalogModel(entry);
  const columns = [
    {key: "resource-id", label: "资源 ID", mono: true, sticky: true, width: 224,
      cell: item => handleMarkup(item.uid)},
    {key: "name", label: "名称", width: 180,
      cell: item => shopGoodsNameControl(item)},
    {key: "sellers", label: "被哪些实例出售", width: 210,
      cell: item => item.sellers.length
        ? `<span class="mono">${esc(item.sellers.join(" "))}</span>`
        : `<span class="resource-empty">无实例出售</span>`},
    ...(model.rows.some(item => item.eventFlagReference) ? [
      {key: 'event-flag', label: '购买标志', cell: item => eventFlagReferenceMarkup(item.eventFlagReference)},
    ] : []),
    {key: "original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: item => fixedTextEditorMarkup({
        recordId: item.textRecordId, compact: true, resetOnly: true,
      })},
  ];
  return `
    <div class="wide-card"></div>
    ${shopGoodsNameEditorToolbar()}
    <div class="section-line"><h2>全部${esc(namespace.goods_label || "商品")}</h2>
      <span>${model.rows.length} 项 · ${model.stockedCount} 项已被实例采用</span></div>
    <div data-shop-table="goods">${dataTable({
      columns,
      rows: model.rows,
      rowId: item => item.uid,
      recordRoute: item => `shops/${item.uid}`,
    })}</div>`;
}

/** 出租店只回显出租车型；编辑入口统一指向战车页。 */
function rentalCatalogModel(entry) {
  const presets = rentalPresets();
  ensureVehicleDraft();
  // 顺带刷新整表脏标记：离开页面前的提醒与「构建 ROM」都看整表。
  vehicleTableDirty();
  const offeredBy = new Map();
  for (const record of entry.records || []) {
    const values = state.shopView[draftKey(entry.family_id, record.id)] || [];
    for (const value of values) {
      if (!offeredBy.has(value)) offeredBy.set(value, []);
      if (!offeredBy.get(value).includes(record.id_hex)) {
        offeredBy.get(value).push(record.id_hex);
      }
    }
  }
  return {
    rows: presets.map(preset => {
      const id = Number(preset.preset_id);
      const draft = vehiclePresetDraft(id);
      return {
        preset,
        id,
        draft,
        shops: offeredBy.get(id) || [],
        dirty: JSON.stringify(draft)
          !== JSON.stringify(state.vehicleOriginal?.presets?.[id]),
      };
    }),
    offeredCount: offeredBy.size,
  };
}

function rentalMountControls(row) {
  return MOUNT_BITS.filter(bit => row.draft.mount_mask & bit.mask)
    .map(bit => esc(bit.short)).join(" · ") || "—";
}

function rentalCatalogColumns() {
  return [
    {key: "resource-id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: row => `${handleMarkup(vehicleUid(row.preset))}<a class="editor-inline-link" title="进入战车页详情"
        href="${recordViewHref("vehicles", row.id, {tabGroup: "vehicle", tab: "rental"})}">↗</a>`},
    {key: "chassis", label: "出租车名", width: 170,
      cell: row => `<div class="table-cell-stack">
        <b>${esc(vehicleName(row.preset))}</b>
        <small class="mono">${esc(chassisName(row.preset))} ${
          esc(row.preset.chassis_id_hex)}</small>
      </div>`},
    ...vehicleEquipmentSlots.map(([, label], index) => ({
      key: `equipment-${index}`,
      label,
      width: 178,
      cell: row => {
        const item = itemRecords().find(entry =>
          Number(entry.id) === Number(row.draft.equipment[index]));
        return item ? `${esc(item.id_hex)} · ${esc(item.name)}` : "—";
      },
    })),
    {key: "defense", label: "防御", width: 108,
      cell: row => esc(row.draft.defense)},
    {key: "chassis-weight", label: "底盘重量", width: 138,
      cell: row => `${esc(String(row.draft.chassis_weight_units / 100))} t`},
    {key: "ammo-capacity", label: "弹药容量", width: 108,
      cell: row => esc(row.draft.ammo_capacity)},
    {key: "mount-mask", label: "装配许可", width: 178,
      cell: rentalMountControls},
    {key: "details", label: "详情", width: 104,
      cell: row => `<a href="${recordViewHref("vehicles", row.id, {tabGroup: "vehicle", tab: "rental"})}">编辑</a>`},
  ];
}

function renderRentalCatalog(entry) {
  const model = rentalCatalogModel(entry);
  return `
    <div class="wide-card"></div>
    <div class="section-line"><h2>全部出租战车</h2>
      <span>${model.rows.length} 种 · ${model.offeredCount} 种已被门店出租</span></div>
    <div data-rental-vehicle-editor data-shop-table="rental">${dataTable({
      columns: rentalCatalogColumns(),
      rows: model.rows,
      rowId: row => vehicleUid(row.preset),
      dirty: model.rows.filter(row => row.dirty).length,
    })}</div>
    <div class="wide-card"></div>`;
}

/** 配置视图按 family:record 索引字段值。 */
function linkSharedBarViews(draft) {
  // command $17/$18 共用记录时，配置视图共用数组。
  const serviceA = pointerEntries().find(entry => Number(entry.family_id) === 7);
  for (const record of serviceA?.records || []) {
    const source = draft[draftKey(7, record.id)];
    if (source && draft[draftKey(8, record.id)]) {
      draft[draftKey(8, record.id)] = source;
    }
  }
  return draft;
}

function ensureShopView() {
  if (state.shopView) return;
  const draft = {};
  for (const entry of pointerEntries()) {
    for (const record of entry.records || []) {
      draft[draftKey(entry.family_id, record.id)] = [...(record.values || [])];
    }
  }
  state.shopView = linkSharedBarViews(draft);
  state.shopPersistedView = JSON.parse(JSON.stringify(draft));
}

let facilityPersistedResetStates = new Map();
let facilityResetRefreshGeneration = 0;

function facilityProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function assertFacilityProjectSession(repository, revision, project) {
  if (state.projectRepository !== repository || state.project !== project ||
      facilityProjectRevision() !== revision) {
    throw new Error("项目会话已切换，请在当前设施页重试");
  }
}

function facilityResetSpecFromControl(control) {
  return normalizedFacilityResetSpec({
    kind: control.dataset.facilityResetKind,
    familyId: control.dataset.facilityResetFamily,
    recordId: control.dataset.facilityResetRecord,
    slot: control.dataset.facilityResetSlot,
  });
}

async function facilityConfigurationResetSnapshot() {
  const repository = requireBrowserProjectRepository(state);
  const revision = facilityProjectRevision();
  const project = state.project;
  const resolved = await db.readResource("facility-config");
  if (!resolved?.value?.document) {
    throw new Error("facility-config 当前项目值不可用");
  }
  const original = await repository.getOriginal("facility-config");
  const baseDocument = original?.value?.document;
  if (!baseDocument) {
    throw new Error("facility-config 导入 original 不可用");
  }
  assertFacilityProjectSession(repository, revision, project);
  return {
    repository,
    revision,
    project,
    document: resolved.value.document,
    baseDocument,
    fields: await db.getFields("facility-config"),
    version: resolved.version,
  };
}

function updateFacilityOriginalControls(root) {
  if (!root?.querySelectorAll) return;
  for (const control of root.querySelectorAll(
    "[data-facility-original-control]",
  )) {
    const key = control.dataset.facilityOriginalControl;
    const persistedDirty = facilityPersistedResetStates.get(key);
    const localDirty = facilityResetLocalDirty(
      state.shopView,
      state.shopPersistedView,
      facilityResetSpecFromControl(control),
    );
    const known = typeof persistedDirty === "boolean";
    const dirty = localDirty || persistedDirty === true;
    control.classList.toggle("is-original-dirty", dirty);
    control.classList.toggle("is-persisted-dirty", persistedDirty === true);
    control.classList.toggle("is-unsaved-dirty", localDirty);
    const button = control.querySelector("[data-reset-to-original]");
    if (button) {
      button.dataset.originalDirty = String(dirty);
      button.classList.toggle("dirty", dirty);
      // 重置只清除最新 Working 中选定的字段。
      button.disabled = !dirty || (!known && !localDirty);
      button.title = persistedDirty
        ? "恢复原值：只恢复这一项"
        : localDirty
          ? "恢复原值：只恢复这一项"
          : known
            ? "恢复原值：当前值与原值一致"
            : "恢复原值：正在读取原值状态…";
    }
  }
  for (const row of root.querySelectorAll("tbody tr")) {
    const controls = [...row.querySelectorAll(
      "[data-facility-original-control]",
    )];
    if (!controls.length) continue;
    row.classList.toggle("original-dirty", controls.some(control =>
      control.classList.contains("is-original-dirty") ||
      control.classList.contains("is-persisted-dirty")
    ));
  }
}

async function refreshFacilityOriginalStates(root) {
  if (!root?.querySelectorAll) return;
  const controls = [...root.querySelectorAll(
    "[data-facility-original-control]",
  )];
  if (!controls.length) return;
  const generation = ++facilityResetRefreshGeneration;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await facilityConfigurationResetSnapshot();
    const groups = controls.map(control => {
      const spec = facilityResetSpecFromControl(control);
      const plan = facilityResetPlan(snapshot.document, spec, {
        baseDocument: snapshot.baseDocument,
      });
      return {
        key: control.dataset.facilityOriginalControl,
        fields: facilityFieldsForReset(snapshot.fields, plan),
      };
    });
    const result = {version: snapshot.fields[0].version,
      states: Object.fromEntries(groups.map(group => [group.key, group.fields.some(field => field.hasOverride)]))};
    if (result.version !== snapshot.version) {
      if (attempt === 0) continue;
      throw new Error("facility-config 在读取 reset 状态时已变化");
    }
    if (generation !== facilityResetRefreshGeneration || !root.isConnected ||
        state.projectRepository !== snapshot.repository ||
        state.project !== snapshot.project ||
        facilityProjectRevision() !== snapshot.revision) {
      return;
    }
    facilityPersistedResetStates = new Map(
      Object.entries(result.states || {}),
    );
    updateFacilityOriginalControls(root);
    return;
  }
}

function facilityFieldsForReset(fields, plan) {
  const names = plan.kind === "record" ? null : plan.kind === "vending-pair"
    ? [`slot:${plan.slot}`, `slot:${plan.slot + 6}`] : ["slot:12"];
  const selected = fields.filter(field => field.entityHandle === plan.canonicalId && !field.readOnly
    && (!names || names.includes(field.fieldName)));
  if (!selected.length || names && selected.length !== names.length) throw new Error("设施重置字段未发布");
  return selected;
}

async function facilityOriginalResetContext(spec) {
  const normalized = normalizedFacilityResetSpec(spec);
  requireBrowserProjectRepository(state);
  await flushAllAutoSaves();
  const snapshot = await facilityConfigurationResetSnapshot();
  const plan = facilityResetPlan(snapshot.document, normalized, {
    baseDocument: snapshot.baseDocument,
  });
  const selected = facilityFieldsForReset(snapshot.fields, plan);
  const changed = selected.some(field => field.hasOverride);
  return {...snapshot, normalized, fields: selected, changed, expectedVersion: snapshot.version ?? null};
}

async function finishFacilityOriginalReset(snapshot) {
  const saved = {...await db.readResource("facility-config"), changed: snapshot.changed};
  assertFacilityProjectSession(
    snapshot.repository,
    snapshot.revision,
    snapshot.project,
  );
  applyFacilityResetLocalSnapshot(
    state.shopView,
    state.shopPersistedView,
    saved.value.document,
    snapshot.normalized,
  );
  applyFacilityConfigurationProjection(
    state.project,
    saved.value.document,
    saved.dirty,
  );
  facilityPersistedResetStates = new Map();
  return saved;
}

function bindFacilityOriginalResetButtons(root, fields, document_) {
  const selections = new Map(), specs = new Map();
  for (const control of root.querySelectorAll("[data-facility-original-control]")) {
    const spec = facilityResetSpecFromControl(control);
    const selected = facilityFieldsForReset(fields, facilityResetPlan(document_, spec));
    selections.set(control.dataset.facilityOriginalControl, selected);
    specs.set(selected, spec);
  }
  bindFieldResetToOriginalButtons(root, selections, {
    database: db,
    beforeReset: async selected => {
      const spec = specs.get(selected);
      const localDirty = facilityResetLocalDirty(state.shopView, state.shopPersistedView, spec);
      const context = await facilityOriginalResetContext(spec);
      if (context.fields.length !== selected.length || context.fields.some((field, index) => field !== selected[index])) {
        throw new Error("设施重置字段已改变");
      }
      return {...context, localDirty};
    },
    afterReset: async (_fields, context) => {
      const saved = await finishFacilityOriginalReset(context);
      if (!root.isConnected) return;
      state.shopMessage = saved.changed || context.localDirty
        ? "所选设施配置已恢复为导入 original；其他编辑已保留"
        : "所选设施配置已是导入 original";
      await render();
    },
    onError: error => {
      if (!root.isConnected) return;
      updateShopEditorState(`恢复失败：${error.message}`);
    },
    confirmMessage: () =>
      "恢复这一项的导入 original？同一设施资产中的其他编辑会保留。",
  });
  root.dataset.facilityResetFields = "ready";
}

function shopEditorStatus() {
  return state.shopMessage || "";
}

function shopGoodsNameDraftError() {
  return shopGoodsNameEditors?.error || "";
}

function shopGoodsNameEditorStatus() {
  const error = shopGoodsNameDraftError();
  if (error) return `无法保存：${error}`;
  return shopGoodsNameMessage;
}

function shopGoodsNameEditorToolbar() {
  const dirty = shopGoodsNameDraftDirty();
  const error = shopGoodsNameDraftError();
  const classes = [dirty ? "dirty" : "", error ? "invalid" : ""]
    .filter(Boolean).join(" ");
  return `<div class="data-editor-toolbar" data-shop-goods-name-editor>
    <p id="shop-goods-name-save-state" class="${classes}" ${
      error || shopGoodsNameMessage ? "" : "hidden"}>${esc(
      shopGoodsNameEditorStatus()
    )}</p>
  </div>`;
}

/** 某个族可选值的候选表：[{value, label}]。unknown 返回 null（改用数值输入）。 */
function candidatesForNamespace(kind, entry = null) {
  if (kind === "item") {
    return itemRecords().map(item => ({value: Number(item.id), label: item.name || "未命名",
      group: item.category?.id || "other", groupLabel: item.category?.name || "其他"}));
  }
  if (kind === "shell") {
    return shellRecords().map(shell => ({value: Number(shell.id), label: shell.name || "未命名"}));
  }
  if (kind === "service-goods") return goodsOptionsFor(entry);
  if (kind === "vehicle-preset") return rentalPresetEntries();
  return null;
}

function candidatesFor(entry) {
  return candidatesForNamespace(namespaceOf(entry).namespace, entry);
}

function shopItemCategories(entry, schema) {
  if (schema?.role === "prize") return ITEM_CATEGORIES;
  switch (Number(entry.family_id)) {
    case 0: return TANK_EQUIPMENT_CATEGORIES;
    case 1: return ["tank-item"];
    case 2: return HUMAN_EQUIPMENT_CATEGORIES;
    case 3:
    case 11: return ["human-item"];
    default: return ITEM_CATEGORIES;
  }
}

function valueOptions(candidates, selected) {
  const value = Number(selected);
  const options = candidates.map(item =>
    `<option value="${item.value}" data-reference-group="${esc(item.group || "other")}"
      data-reference-group-label="${esc(item.groupLabel || "其他")}"
      ${item.value === value ? "selected" : ""}>${esc(
      `${hex(item.value, 2)} · ${item.label}`
    )}</option>`
  );
  // 负载是原始字节，可能指向候选表以外的值；保留它，别让下拉框悄悄改掉 ROM 现状。
  if (!candidates.some(item => item.value === value)) {
    options.unshift(
      `<option value="${value}" selected>${esc(`${hex(value, 2)} · 表外值`)}</option>`
    );
  }
  return options.join("");
}

function slotControl(entry, record, slot, value, candidates) {
  const attrs = `data-shop-family="${entry.family_id}" data-shop-record="${record.id}" data-shop-slot="${slot}"`;
  const schema = slotSchemaOf(entry, slot);
  const slotLabel = `槽 ${String(slot + 1).padStart(2, "0")}`;
  if (schema?.role === "amount-flags") {
    const raw = Number(value) & 0xFF;
    return `<div class="shop-slot-field shop-slot-field-packed">
      <span>${slotLabel}</span>
      <div class="shop-packed-control">
        <label><small>数量</small><input class="inline-data-input shop-packed-amount"
          type="number" min="0" max="127" value="${raw & 0x7F}" ${attrs}></label>
        <label class="check"><input type="checkbox" class="shop-packed-flag"
          ${attrs} ${raw & 0x80 ? "checked" : ""}>特殊 bit7</label>
      </div>
    </div>`;
  }
  const slotNamespace = schema?.namespace || namespaceOf(entry).namespace;
  if (slotNamespace === "vehicle-preset") {
    return `<div class="shop-slot-field"><span>${slotLabel}</span>${
      vehiclePresetPickerMarkup({
        allowedGroups: ["rental"],
        value: Number(value),
        label: slotLabel,
        controlMarkup: `<select class="shop-slot" ${attrs}>${
          vehiclePresetOptionMarkup(value, ["rental"])}</select>`,
      })}</div>`;
  }
  const slotCandidates = schema
    ? candidatesForNamespace(schema.namespace, entry) : candidates;
  if (slotCandidates) {
    if (slotNamespace === "item" || slotNamespace === "shell") {
      return `<div class="shop-slot-field"><span>${slotLabel}</span>${itemPickerFieldMarkup({
        records: slotNamespace === "item" ? itemRecords() : [],
        shells: slotNamespace === "shell" ? shellRecords() : [],
        allowedCategories: slotNamespace === "item"
          ? shopItemCategories(entry, schema) : ["shell"],
        emptyValue: slotNamespace === "item" ? 0 : null,
        value, label: slotLabel,
        controlMarkup: `<select class="shop-slot" ${attrs}>${
          valueOptions(slotCandidates, value)}</select>`,
      })}</div>`;
    }
    return `<div class="shop-slot-field"><span>${slotLabel}</span>
      <select class="shop-slot" ${attrs}>${valueOptions(slotCandidates, value)}</select>
      ${(namespaceOf(entry).goods || []).some(item => item.event_flag_reference)
        ? `<span data-shop-purchase-flag>${goodsPurchaseFlagMarkup(entry, value)}</span>` : ''}
    </div>`;
  }
  return `<label class="shop-slot-field"><span>${slotLabel}</span>
    <span class="shop-raw-control"><input class="inline-data-input shop-slot"
      type="number" min="0" max="255" value="${Number(value)}" ${attrs}>
      <small>${esc(hex(Number(value), 2))}</small></span>
  </label>`;
}

function shopValuePrice(entry, value) {
  const namespace = namespaceOf(entry);
  if (namespace.namespace === "item") {
    const item = itemRecords().find(row => Number(row.id) === Number(value));
    return item?.price?.available ? Number(item.price.value) : null;
  }
  if (namespace.namespace === "shell") {
    if (Number(entry.family_id) === 5) return null;
    const shell = shellRecords().find(row => Number(row.id) === Number(value));
    return shell?.price?.value ?? null;
  }
  const goods = (namespace.goods || [])
    .find(item => Number(item.value) === Number(value));
  const raw = goods?.price?.value ?? goods?.price_value;
  return Number.isFinite(Number(raw)) ? Number(raw) : null;
}

function shopConfigurationProducts(entry, record) {
  const values = state.shopView?.[draftKey(entry.family_id, record.id)] || record.values || [];
  const labels = new Map((candidatesFor(entry) || []).map(item => [Number(item.value), item.label]));
  const items = new Map(itemRecords().map(item => [Number(item.id), item]));
  return values.map(value => ({
    value: Number(value),
    label: labels.get(Number(value)) || hex(Number(value), 2),
    price: shopValuePrice(entry, value),
    item: namespaceOf(entry).namespace === "item" ? items.get(Number(value)) : null,
  }));
}

const shopWorkbenches = new Map();

function shopStateWorkbench() {
  const family = state.shopTab === 'buyer' ? 0x124 : Number(state.shopFamily);
  const key = String(family);
  if (!state.shopStateMachines || state.shopStateMachines.repository !== state.projectRepository)
    state.shopStateMachines = {repository: state.projectRepository, selections: new Map()};
  const selections = state.shopStateMachines.selections;
  if (!selections.has(key)) selections.set(key, {family, instance: state.shopPreviewRecord || 0,
    node: null, widget: 'screen', edge: null, path: '', step: 0, objectSelected: false, zoom: 'fit'});
  const selected = selections.get(key);
  if (selected.instance !== state.shopPreviewRecord) {
    selected.instance = state.shopPreviewRecord;
    selected.path = ''; selected.step = 0;
    delete selected.previewSession;
    delete selected.executionAdapter;
    delete selected.restoredPreview;
  }
  if (!shopWorkbenches.has(key)) shopWorkbenches.set(key, createShopStateWorkbench({
    namespace: `shop-state-${key}`, fixedFamily: family,
    selection: () => state.shopStateMachines.selections.get(key),
    evidenceVisible: false, previewScene: true, pathsInPreview: true,
    startAtEntry: state.shopTab === 'buyer',
    getEntry: () => state.shopPreviewDialogue || state.interfacePageEntry || state.interfacePageScreen || '',
    onInstanceChange: instance => {
      state.shopPreviewRecord = instance;
      replaceHistoryUrl(currentViewUrl());
    },
    inspectorMarkup: '<p><a class="editor-inline-link" href="?view=interfaceui&amp;interface=field-dialogue">对话窗口 ↗</a></p>',
    widgetFields: (widget, model) => widget?.id === 'screen' && model.record.id
      ? [{resource: 'facility-config', handle: model.record.id,
        options: {sceneInteractionConfiguration: true, stacked: true, compactIdentity: true}}] : [],
  }));
  return shopWorkbenches.get(key);
}

async function bindShopStateWorkbench(root, {rerender}) {
  if (["ui", "buyer"].includes(state.shopTab)) await shopStateWorkbench().bind(root, {rerender});
}

function shopInstanceRows(entry) {
  return (entry.records || []).map(record => {
    const values = state.shopView[draftKey(entry.family_id, record.id)] || [];
    const original = state.shopPersistedView[draftKey(entry.family_id, record.id)] || [];
    return {
      uid: shopInstanceUid(entry, record),
      record,
      values,
      original,
      dirty: JSON.stringify(values) !== JSON.stringify(original),
    };
  });
}

function renderShopInstanceCards(entry, rows, candidates) {
  setTableStatus(rows.length, rows.length, {
    dirty: rows.filter(row => row.dirty).length,
  });
  return `<div class="shop-instance-grid" data-facility-original-scope
    data-shop-table="instances">${rows.map(row => `
    <article class="shop-instance-card${row.dirty ? " dirty" : ""}"
      id="shop-instance-${String(entry.family_id).padStart(2, "0")}-${String(row.record.id).padStart(2, "0")}"
      data-shop-row-dirty="${row.dirty}">
      <header>
        <div>
          <button type="button" class="record-link resource-record-id"
            data-shop-record-open="${esc(row.uid)}">${esc(row.uid)}</button>
          <span>${esc(facilityConfigurationSummary(entry, row.values))} · ${row.values.length} 个配置槽</span>
        </div>
        <div class="shop-instance-actions">
          ${facilityOriginalResetControl({
            kind: "record",
            familyId: entry.family_id,
            recordId: row.record.id,
          })}
          <button type="button" class="button ghost"
            data-shop-preview-select="${Number(row.record.id)}">预览</button>
        </div>
      </header>
      <div class="shop-slots">${row.values.map((value, slot) =>
        slotControl(entry, row.record, slot, value, candidates)
      ).join("")}</div>
    </article>`).join("")}</div>`;
}

function renderShopInstanceUsers(entry, record) {
  const {actors, elevators} = withCurrentOwnerRecord({kind: "shop-instance",
    familyId: Number(entry.family_id), recordId: Number(record.id)}, state.project,
  () => currentOwnerReferenceImpact(), {elevators: state.shopElevators || []});
  const actorLinks = actors.length ? `<p class="shop-instance-users">使用此配置的场景角色：${actors.map(({actor, scene, selection}) =>
    `<a class="editor-inline-link" href="?view=scenes&amp;scene=${encodeURIComponent(scene.slug)}&amp;sceneObject=${encodeURIComponent(selection)}">${esc(scene.name)} · ${esc(actor.uid)} · ${esc(actor.x)}, ${esc(actor.y)}</a>`
  ).join(" · ")}</p>` : "";
  const elevatorLinks = elevators.length ? `<p class="shop-instance-users" data-shop-elevator-users="${Number(record.id)}">场景电梯：${elevators.map(({elevator, scene, selection}) =>
    `<a class="editor-inline-link" href="?view=scenes&amp;scene=${encodeURIComponent(scene.slug)}&amp;sceneMode=logic&amp;sceneObject=${encodeURIComponent(selection)}">${esc(scene.name)} · (${elevator.x}, ${elevator.y})</a>`
  ).join(" · ")}</p>` : "";
  return actorLinks + elevatorLinks;
}

async function renderShops() {
  const entries = pointerEntries();
  if (!entries.length) {
    return ``;
  }
  ensureShopView();
  const entry = {...selectedFamily(), summaryContext: await facilityConfigurationSummaryContext()};
  state.shopFamily = Number(entry.family_id);
  const namespace = namespaceOf(entry);
  const candidates = candidatesFor(entry);
  const tabs = shopTabs(entry);
  if (["ui", "buyer"].includes(state.shopTab)) {
    return `<div class="shop-page-shell shop-page-ui">${tabs}${await shopStateWorkbench().render()}</div>`;
  }
  if (state.shopTab === "catalog") {
    return `<div class="shop-page-shell shop-page-catalog">${tabs}${
      namespace.namespace === "vehicle-preset"
      ? renderRentalCatalog(entry)
      : renderGoodsCatalog(entry)}</div>`;
  }
  const instanceRows = shopInstanceRows(entry);
  const editableBytes = (entry.records || []).reduce(
    (total, record) => total + Number(record.payload_length || 0), 0,
  );

  return `<div class="shop-page-shell shop-page-config">${tabs}
    <div class="data-editor-toolbar shop-config-toolbar">
      <p id="shop-save-state" ${state.shopMessage ? "" : "hidden"}>${esc(shopEditorStatus())}</p>
    </div>
    <div class="shop-config-meta">
      <div><small>配置族</small><b>${esc(shopFamilyLabel(entry))}</b>
        <span class="mono">${esc(entry.family_id_hex)}</span></div>
      <div><small>数据内容</small><span>${esc(entry.record_payload || "字段含义待确认")}</span></div>
    </div>
    <div class="section-line">
      <h2>${esc(shopFamilyLabel(entry))}</h2>
      <span>${entry.record_count} 条实例 · ${editableBytes} 个可编辑字节</span>
    </div>
    ${renderShopInstanceCards(entry, instanceRows, candidates)}
  </div>`;
}

function renderGoodsCatalogRecord(entry, recordId) {
  const model = goodsCatalogModel(entry);
  const index = model.rows.findIndex(item => item.uid === String(recordId));
  if (index < 0) return null;
  const item = model.rows[index];
  const namespace = namespaceOf(entry);
  return recordPage({
    title: item.label,
    uid: item.uid,
    backLabel: `全部${namespace.goods_label || "商品"}`,
    prevId: index > 0 ? model.rows[index - 1].uid : null,
    nextId: index < model.rows.length - 1 ? model.rows[index + 1].uid : null,
    panels: [
      panel("商品记录", fields([
        ["值", `<span class="mono">${esc(hex(item.value, 2))}</span>`],
        ["当前名称", fixedTextEditorMarkup({
          recordId: item.textRecordId, readonly: true,
        })],
        ...(item.eventFlagReference ? [['购买标志', eventFlagReferenceMarkup(item.eventFlagReference)]] : []),
        ["文本记录", `<button type="button" class="resource-inline-link"
          data-resource-target="${esc(item.uid)}">${esc(item.uid)}</button>`],
        ["采用实例", item.sellers.length
          ? `<span class="mono">${esc(item.sellers.join(" "))}</span>`
          : `<span class="resource-empty">无实例出售</span>`],
      ])),
    ],
  });
}

const RENTAL_FIELD_LABELS = Object.freeze({
  defense: "底盘防御",
  chassis_weight: "底盘重量",
  ammo_capacity: "弹仓容量",
  mount_mask: "挂载位",
});

function rentalFieldDefinitions(uid) {
  const keys = [...new Set(resourceFieldByteRanges(uid)
    .map(range => range.fieldKey)
    .filter(Boolean))];
  return keys.map(key => [key, RENTAL_FIELD_LABELS[key] || key]);
}

function rentalFieldValue(row, draft) {
  const key = row.fieldKey || row.key;
  if (key === "chassis_weight") {
    return `${esc(String(draft.chassis_weight_units / 100))} t · ${
      esc(draft.chassis_weight_units)
    } 内部单位`;
  }
  if (key === "mount_mask") return `<span class="mono">${esc(hex(draft.mount_mask, 2))}</span>`;
  return esc(draft[key] ?? "—");
}

function renderRentalCatalogRecord(entry, recordId) {
  const model = rentalCatalogModel(entry);
  const index = model.rows.findIndex(row => vehicleUid(row.preset) === String(recordId));
  if (index < 0) return null;
  const row = model.rows[index];
  const uid = vehicleUid(row.preset);
  const definitions = rentalFieldDefinitions(uid);
  const contextPanel = panel("出租上下文", fields([
    ["预设 ID", `<span class="mono">${esc(row.preset.preset_id_hex)}</span>`],
    ["底盘 ID", `<span class="mono">${esc(row.preset.chassis_id_hex)}</span>`],
    ["初始装备", `<span class="mono">${esc(
      row.draft.equipment.map(value => hex(value, 2)).join(" "),
    )}</span>`],
    ["门店", row.shops.length
      ? `<span class="mono">${esc(row.shops.join(" "))}</span>`
      : `<span class="resource-empty">无门店</span>`],
  ]));
  const panels = definitions.length
    ? [
        panel("字段", `<div data-shop-record-kind="rental"
            data-shop-record-identity="${esc(uid)}"
            data-shop-record-address="${esc(uid)}">${fieldAddressTable({
              uid,
              fields: definitions,
              showStatus: false,
              valueFor: field => rentalFieldValue(field, row.draft),
              pageStatus: {
                selection: uid,
                dirty: "",
              },
            })}</div>`),
        contextPanel,
      ]
    : [contextPanel];
  return recordPage({
    title: vehicleName(row.preset),
    uid,
    backLabel: "全部出租战车",
    prevId: index > 0 ? vehicleUid(model.rows[index - 1].preset) : null,
    nextId: index < model.rows.length - 1
      ? vehicleUid(model.rows[index + 1].preset) : null,
    panels,
  });
}

function renderShopInstanceRecord(entry, recordId) {
  const rows = shopInstanceRows(entry);
  const index = rows.findIndex(row => row.uid === String(recordId));
  if (index < 0) return null;
  const row = rows[index];
  const record = row.record;
  const valueFields = row.values.map((value, slot) => {
    const schema = slotSchemaOf(entry, slot);
    const label = schema?.label || schema?.role || `配置槽 ${slot + 1}`;
    return [label, `<span class="mono">${esc(hex(value, 2))}</span>`];
  });
  return recordPage({
    title: `${shopFamilyLabel(entry)} · 实例 ${record.id_hex}`,
    uid: row.uid,
    backLabel: shopFamilyLabel(entry),
    prevId: index > 0 ? rows[index - 1].uid : null,
    nextId: index < rows.length - 1 ? rows[index + 1].uid : null,
    panels: [
      panel("实例标识", fields([
        ["实例", `<span class="mono">${esc(record.id_hex)}</span>`],
        ["配置族", `${esc(shopFamilyLabel(entry))} · ${esc(entry.family_id_hex)}`],
        ["条目数", esc(record.payload_length)],
        ["记录步进", `${Number(record.payload_length) + 1} B`],
      ])),
      panel("当前配置", fields(valueFields)),
      ...(Number(entry.family_id) === 15 ? [ownerReferenceListMarkup("使用此配置的场景对象",
        `data-shop-instance-users="${Number(record.id)}"`)] : []),
    ],
  });
}

/** 四张商店表共用的记录页入口。 */
function renderShopRecord(recordId) {
  const entries = pointerEntries();
  if (!entries.length) return null;
  ensureShopView();
  const entry = selectedFamily();
  if (!entry) return null;
  state.shopFamily = Number(entry.family_id);
  if (state.shopTab === "catalog") {
    return namespaceOf(entry).namespace === "vehicle-preset"
      ? renderRentalCatalogRecord(entry, recordId)
      : renderGoodsCatalogRecord(entry, recordId);
  }
  if (state.shopTab === "ui") {
    state.shopPreviewDialogue = String(recordId);
    return null;
  }
  if (state.shopTab === "config") return renderShopInstanceRecord(entry, recordId);
  return null;
}

function updateShopEditorState(message = "") {
  state.shopMessage = message;
  const status = $("#shop-save-state");
  if (status) {
    status.textContent = shopEditorStatus();
    status.hidden = !state.shopMessage;
  }
  if (state.view === "shops" && state.shopTab === "config"
      && document.querySelector('main [data-shop-table="instances"]')) {
    const rows = shopInstanceRows(selectedFamily());
    setTableStatus(rows.length, rows.length, {dirty: rows.filter(row => row.dirty).length});
  }
  const originalRoot = document.querySelector(
    "[data-facility-original-scope]",
  );
  if (originalRoot) updateFacilityOriginalControls(originalRoot);
}

function applyShopView(document, view, baseline) {
  if (!document || !Array.isArray(document.families) ||
      !Array.isArray(document.records)) {
    throw new Error("facility-config 文档不完整");
  }
  const families = new Map(document.families.map(family => [
    Number(family.id), family,
  ]));
  const records = new Map(document.records.map(record => [record.id, record]));
  for (const [key, values] of Object.entries(view || {})) {
    const [familyId, recordId] = key.split(":").map(Number);
    const family = families.get(familyId);
    const reference = (family?.records || []).find(record =>
      Number(record.id) === recordId);
    const record = records.get(reference?.record_id);
    if (!record || !Array.isArray(record.slots) ||
        record.slots.length !== values.length) {
      throw new Error(`facility-config 记录 ${key} 的长度/身份不匹配`);
    }
    for (let index = 0; index < values.length; index += 1) {
      const value = Number(values[index]);
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`facility-config ${key}[${index}] 不是字节`);
      }
      if (!canonicalJsonEqual(values[index], baseline?.[key]?.[index])) record.slots[index].value = value;
    }
  }
}

async function writeShopConfiguration(payload) {
  assertFacilityProjectSession(payload.repository, payload.revision, payload.project);
  const current = await db.readResource("facility-config");
  const candidate = cloneJson(current.value.document);
  applyShopView(candidate, payload.view, payload.baseline);
  const fields = await db.getFields("facility-config");
  const changes = fields.filter(field => !field.readOnly).flatMap(field => {
    const value = field.documentPath.reduce((node, key) => node[key], candidate);
    return canonicalJsonEqual(value, field.value) ? [] : [{field, value}];
  });
  if (changes.length) await setProjectFields(db, changes);
  const saved = await db.readResource("facility-config");
  if (state.projectRepository !== payload.repository ||
      state.project !== payload.project ||
      facilityProjectRevision() !== payload.revision) return;
  const savedValues = {};
  for (const family of saved.value.document.families) for (const reference of family.records) {
    const record = saved.value.document.records.find(row => row.id === reference.record_id);
    savedValues[draftKey(family.id, reference.id)] = record.slots.map(slot => slot.value);
  }
  state.shopPersistedView = linkSharedBarViews(savedValues);
  applyFacilityConfigurationProjection(
    state.project,
    saved.value.document,
    saved.dirty,
  );
  facilityPersistedResetStates = new Map();
  const writeback = state.project?.facilities?.configuration_writeback_state;
  if (writeback) {
    delete writeback.current_sha256;
    writeback.modified = saved.dirty;
  }
  updateShopEditorState();
  const originalRoot = document.querySelector(
    "[data-facility-original-scope]",
  );
  if (originalRoot) {
    void refreshFacilityOriginalStates(originalRoot).catch(error => {
      if (originalRoot.isConnected) {
        updateShopEditorState(`重新读取设施配置 Original 状态失败：${error?.message || error}`);
      }
    });
  }
}

function commitShopConfiguration() {
  try {
    const repository = requireBrowserProjectRepository(state);
    const payload = {
      repository,
      project: state.project,
      revision: facilityProjectRevision(),
      view: cloneJson(state.shopView),
      baseline: cloneJson(state.shopPersistedView),
    };
    updateShopEditorState();
    trackAutoSavePreparation(writeShopConfiguration(payload).catch(error => {
      if (state.projectRepository === repository)
        updateShopEditorState(`保存失败：${error?.message || error}`);
    }));
  } catch (error) {
    updateShopEditorState(`保存失败：${error?.message || error}`);
  }
}

function focusShopPreview(familyId, recordId) {
  if (Number(state.shopFamily) !== Number(familyId)) return;
  state.shopPreviewRecord = Math.max(0, Number(recordId) || 0);
  state.shopPreviewDialogue = "";
  replaceHistoryUrl(currentViewUrl());
}

function updateShopGoodsNameEditorState(message = null) {
  if (message !== null) shopGoodsNameMessage = message;
  const error = shopGoodsNameDraftError();
  const status = $("#shop-goods-name-save-state");
  if (status) {
    status.textContent = shopGoodsNameEditorStatus();
    status.classList.toggle("dirty", shopGoodsNameDraftDirty());
    status.classList.toggle("invalid", Boolean(error));
    status.hidden = !error && !shopGoodsNameMessage;
  }
}

/** 编码结果与记录集合都在输入事件里冻结；防抖结束后不再读取文本框或 draft。 */

const facilityFieldBindings = new WeakMap();
function updateFacilityFieldResetState(root, fields, document_) {
  for (const control of root.querySelectorAll('[data-facility-original-control]')) {
    const plan = facilityResetPlan(document_, facilityResetSpecFromControl(control));
    facilityPersistedResetStates.set(control.dataset.facilityOriginalControl,
      facilityFieldsForReset(fields, plan).some(field => field.hasOverride));
  }
  updateFacilityOriginalControls(root);
}
async function bindFacilityFieldControls(root = document.querySelector("main")) {
  if (!root) return;
  for (const unbind of facilityFieldBindings.get(root) || []) unbind();
  const bindings = [];
  facilityFieldBindings.set(root, bindings);
  const resolved = await db.readResource("facility-config");
  const fields = await db.getFields("facility-config");
  if (!root.isConnected || facilityFieldBindings.get(root) !== bindings) return;
  const document_ = resolved.value.document;
  const controls = [...root.querySelectorAll("[data-shop-family][data-shop-record][data-shop-slot]")];
  for (const field of fields.filter(field => !field.readOnly)) {
    const slot = Number(field.fieldName.slice(5));
    const aliases = facilityCanonicalAliases(document_, field.entityHandle);
    const bound = controls.filter(node => aliases.some(alias => alias.familyId === Number(node.dataset.shopFamily)
      && alias.recordId === Number(node.dataset.shopRecord)) && Number(node.dataset.shopSlot) === slot);
    bindings.push(field.bind(root, (_target, value) => {
      for (const alias of aliases) {
        const key = draftKey(alias.familyId, alias.recordId);
        const draft = state.shopView?.[key], baseline = state.shopPersistedView?.[key];
        if (draft && baseline) {
          if (canonicalJsonEqual(draft[slot], baseline[slot]) || canonicalJsonEqual(draft[slot], value)) draft[slot] = value;
          baseline[slot] = value;
        }
      }
      for (const node of bound) {
        const current = state.shopView?.[draftKey(Number(node.dataset.shopFamily), Number(node.dataset.shopRecord))]?.[slot] ?? value;
        if (node.matches("[data-vending-special], .shop-packed-flag")) node.checked = Boolean(current & 0x80);
        else {
          const packedAmount = node.matches('.shop-packed-amount')
            || node.matches('[data-vending-amount]') && Number(node.dataset.shopFamily) !== 13;
          node.value = String(packedAmount ? current & 0x7F : current);
        }
        // 出租车型的引用控件挂在这个精确值控件上，字段层写完要跟着重画当前项。
        syncReferencePickerControl(node);
        const purchaseFlag = node.closest('.shop-slot-field')?.querySelector('[data-shop-purchase-flag]');
        if (purchaseFlag) purchaseFlag.innerHTML = goodsPurchaseFlagMarkup(
          pointerEntries().find(entry => Number(entry.family_id) === Number(node.dataset.shopFamily)), current);
      }
      const writeback = state.project?.facilities?.configuration_writeback_state;
      if (writeback) writeback.modified = fields.some(field => field.hasOverride);
      if (bound.length) {
        updateFacilityFieldResetState(root, fields, document_);
        updateShopEditorState();
      }
    }));
  }
  updateFacilityFieldResetState(root, fields, document_);
  const resetRoots = root.matches("[data-facility-original-scope]")
    ? [root] : root.querySelectorAll("[data-facility-original-scope]");
  for (const scope of resetRoots) bindFacilityOriginalResetButtons(scope, fields, document_);
}

function bindShopInstanceReferenceLists() {
  document.querySelectorAll('[data-shop-instance-users]').forEach(host =>
    bindOwnerReferenceList(host, () => {
      const entry = selectedFamily();
      const record = entry.records.find(row => Number(row.id) === Number(host.dataset.shopInstanceUsers));
      return renderShopInstanceUsers(entry, record);
    }));
}

function bindShopEditor({onChange} = {}) {
  bindShopInstanceReferenceLists();
  const byteFromControl = (node, maximum, previous) => {
    const value = Number(node.value);
    if (node.value.trim() && Number.isInteger(value) && value >= 0 && value <= maximum
        && (node.tagName !== "SELECT" || [...node.options].some(option => option.value === node.value))) {
      return value;
    }
    node.value = String(previous);
    updateShopEditorState(`输入无效：应为 0–${maximum} 的整数`);
    return null;
  };
  document.querySelectorAll("select.shop-slot").forEach(select => {
    if (select.options.length > 12 && !select.closest('[data-item-picker]'))
      bindGroupedReferenceSelect(select);
  });
  hydrateItemPickers(document);
  document.querySelectorAll("[data-shop-table='instances'] [data-module-reference-picker]")
    .forEach(root => hydrateReferenceFieldPickers(root));
  void bindFacilityFieldControls().catch(error => updateShopEditorState(error.message));
  document.querySelectorAll(".shop-slot").forEach(node =>
    node.addEventListener("change", () => {
      const key = `${Number(node.dataset.shopFamily)}:${Number(node.dataset.shopRecord)}`;
      const slot = Number(node.dataset.shopSlot);
      const values = state.shopView[key];
      if (!values || slot >= values.length) return;
      const value = byteFromControl(node, 255, values[slot]);
      if (value === null) return;
      values[slot] = value;
      focusShopPreview(node.dataset.shopFamily, node.dataset.shopRecord);
      node.closest("tr")?.classList.toggle(
        "dirty",
        JSON.stringify(values) !== JSON.stringify(state.shopPersistedView[key] || []),
      );
      node.closest(".shop-instance-card")?.classList.toggle(
        "dirty",
        JSON.stringify(values) !== JSON.stringify(state.shopPersistedView[key] || []),
      );
      updateShopEditorState();
      commitShopConfiguration();
      if (typeof onChange === "function") onChange();
    })
  );
  document.querySelectorAll(".shop-packed-amount").forEach(node =>
    node.addEventListener("change", () => {
      const key = `${Number(node.dataset.shopFamily)}:${Number(node.dataset.shopRecord)}`;
      const slot = Number(node.dataset.shopSlot);
      const values = state.shopView[key];
      if (!values || slot >= values.length) return;
      const amount = byteFromControl(node, 0x7F, Number(values[slot]) & 0x7F);
      if (amount === null) return;
      values[slot] = (Number(values[slot]) & 0x80) | amount;
      focusShopPreview(node.dataset.shopFamily, node.dataset.shopRecord);
      updateShopEditorState();
      commitShopConfiguration();
      if (typeof onChange === "function") onChange();
    })
  );
  document.querySelectorAll(".shop-packed-flag").forEach(node =>
    node.addEventListener("change", () => {
      const key = `${Number(node.dataset.shopFamily)}:${Number(node.dataset.shopRecord)}`;
      const slot = Number(node.dataset.shopSlot);
      const values = state.shopView[key];
      if (!values || slot >= values.length) return;
      values[slot] = (Number(values[slot]) & 0x7F) | (node.checked ? 0x80 : 0);
      focusShopPreview(node.dataset.shopFamily, node.dataset.shopRecord);
      updateShopEditorState();
      commitShopConfiguration();
      if (typeof onChange === "function") onChange();
    })
  );
  document.querySelectorAll("[data-shop-tab]").forEach(node =>
    node.addEventListener("click", () => {
      if (state.shopTab === node.dataset.shopTab) return;
      state.shopTab = node.dataset.shopTab;
      replaceHistoryUrl(currentViewUrl());
      render();
    })
  );
  shopGoodsNameEditors = bindFixedTextEditors(document.querySelector('[data-shop-table="goods"]'), {
    onState: () => updateShopGoodsNameEditorState(""),
  });
  updateShopGoodsNameEditorState("");
  document.querySelectorAll("[data-shop-preview-select]").forEach(node =>
    node.addEventListener("click", () => {
      state.shopPreviewRecord = Math.max(
        0, Number(node.dataset.shopPreviewSelect) || 0
      );
      state.shopPreviewPage = 0;
      state.shopPreviewDialogue = "";
      if (state.shopTab === "config") state.shopTab = "ui";
      replaceHistoryUrl(currentViewUrl());
      render();
    })
  );
  document.querySelectorAll("[data-shop-record-open]").forEach(node =>
    node.addEventListener("click", () => openRecord(node.dataset.shopRecordOpen))
  );
}

export { bindFacilityFieldControls, bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, commitShopConfiguration, ensureShopView, facilityOriginalResetControl, renderShopRecord, renderShops, shopConfigurationProducts, shopViewHeading };
