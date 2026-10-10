import { recordUid, esc, audioCommandLabel, currentTextReference, registerModuleComponent, renderModuleComponent, $, resourceForwardReferenceCell, itemResourceUid, attackVisualCanvas, resourcePhysicalAddressSummary, paintBattleActionCanvases, indexedResource, plainTextRecordReferences, battleActionCanvas } from './interface-state-preview-Dlotqlmn.js';
import { handleMarkup, fields, recordPage, panel } from './record-6_wsSDi2.js';
import { state } from './emulator-Bpa8EsFw.js';
import { dedicatedUiPageForScreen, itemEffectPagesForItem } from './editor-renderer-n2nBwXk_.js';
import { eventFlagReferenceMarkup } from './scene-encounter-probabilities-C0m_IdC-.js';
import './visual-metasprites-IDA0o2Z8.js';
import { db, itemNameRecordId, hex } from './prg-loaders-DnCSmXk9.js';
import { hydrateScenePositionPicker, scenePositionPickerMarkup } from './components-DbJXuRMn.js';
import { bindFixedTextEditors, fixedTextRecordText, referencePickerMarkup, fixedTextEditorMarkup } from './timeline-player-YCH7Y-3h.js';
import { mountFieldObjectSelect, mountFieldObjectNumericCodeValue, mountFieldObjectNumber, mountFieldObjectBitmask, mountFieldObjectSet, mountFieldObjectAttackVisual, mountFieldObjectReset, mountFieldObjectEditor, attackVisualOptionLabel, mountFieldObjectChoice } from './field-object-editor-Blro4OF0.js';
import { dataTable, battleResultStatusEffects, resetToOriginalButton } from './battle-result-script-runtime-BSeJpUGH.js';
import './components-DFg4zDq1.js';
import './components-D8Tpyo4s.js';
import { fieldAddressTable } from './field-address-table-BnL1Mgdy.js';

// @editor-module 剧情资源身份与公共句柄显示。

function storyScriptHandle(kind, id) {
  if (id === null || id === undefined || !Number.isInteger(Number(id)) || Number(id) < 0) return null;
  return recordUid(`story-${kind || "autonomous"}-script:script`, id);
}

function storyAudioLabel(id) {
  const label = audioCommandLabel(id);
  return label.startsWith("音频命令 0x") ? recordUid("audio-command", id) : label;
}

function storyShotLabel(label) {
  return String(label || "").replace(/\bLIST\s*\$([0-9a-f]{2})\b/giu,
    (_, id) => recordUid("scene-actor-list", Number.parseInt(id, 16)));
}

function storyActorHandle(variantId, slot) {
  if (variantId === null || variantId === undefined || !Number.isInteger(Number(variantId))
      || slot === null || slot === undefined || !Number.isInteger(Number(slot))) return null;
  return recordUid(recordUid("scene-actor", variantId), slot);
}

function storyTextHandle(regionId, recordId) {
  if (!Number.isInteger(regionId) || regionId < 0
      || !Number.isInteger(recordId) || recordId < 0) return null;
  return `${recordUid("record", regionId)}:${String(recordId).padStart(3, "0")}`;
}

function storyResourceMarkup(handle, label = "", target = handle) {
  if (!handle) return "—";
  if (String(handle).startsWith('global-event-flag:')) return eventFlagReferenceMarkup(handle);
  const identity = handleMarkup(handle);
  const copy = label && label !== handle ? `${esc(label)} · ${identity}` : identity;
  return target ? `<button type="button" class="resource-inline-link"
    data-resource-target="${esc(target)}" title="${esc(handle)}">${copy}</button>` : copy;
}

function storyInterfaceMarkup(interfaceState) {
  if (!interfaceState?.screen) return "—";
  return [interfaceState.screen, interfaceState.textScreen].filter(Boolean).map(id => {
    const screen = state.project?.ui?.editor?.screens?.find(row => row.id === id);
    const destination = dedicatedUiPageForScreen(screen);
    if (!destination) return storyResourceMarkup(id);
    const params = new URLSearchParams({view: destination.view});
    if (destination.interfacePage) params.set("interface", destination.interfacePage);
    params.set("interfaceScreen", id);
    if (destination.interfacePage === "ending-credits" && interfaceState.context?.record)
      params.set("interfaceRecord", interfaceState.context.record);
    if (destination.view === "wanted-ui" && interfaceState.target != null)
      params.set("wantedTarget", interfaceState.target);
    return `<a class="editor-inline-link" data-story-interface-reference href="?${esc(params)}"
      title="${esc(id)}">${esc(screen?.interface_state || screen?.label || id)} ↗</a>`;
  }).join(" · ");
}

function storyScriptMarkup(kind, id, overflowBytes = 0, {location = null, reason = null} = {}) {
  return storyResourceMarkup(storyScriptHandle(kind, id), "", recordUid(`story:${kind || "autonomous"}`, id))
    + (location ? ` <span data-script-location>${location === "farjump-page" ? "远跳页" : "原池"}</span>` : "")
    + (overflowBytes || reason ? ` <span data-script-unwritten title="未进 ROM（${esc(reason || `容量不足，超出 ${overflowBytes} 字节`)}）">↛</span>` : "");
}

function storyTextMarkup(reference) {
  if (!reference) return "—";
  const current = currentTextReference(reference);
  return storyResourceMarkup(reference, current.label, current.uid);
}

// @editor-module 将剧情场景身份呈现为场景页面链接并更新链接目标。


function sceneIdValue(sceneId) {
  if (sceneId === null || sceneId === undefined || String(sceneId).trim() === "") {
    return null;
  }
  const id = Number(sceneId);
  // 场景目录的合法 ID 是 00–EF；F0–FF 是特殊角色表等运行时选择器，不得伪装成
  // 可跳转地图资源。
  return Number.isInteger(id) && id >= 0 && id <= 0xef ? id : null;
}

/** 剧情只持有场景资源引用；具体 slug 由统一资源导航在点击时解析。 */
function storySceneResourceUid(sceneId) {
  const id = sceneIdValue(sceneId);
  return id === null
    ? null
    : recordUid("scene", id);
}

/** 剧情里所有可见场景号共用的跳转组件。 */
function storySceneLink(sceneId, label = null, {role = null} = {}) {
  const id = sceneIdValue(sceneId);
  const uid = storySceneResourceUid(id);
  const roleAttribute = role ? ` data-role="${esc(role)}"` : "";
  if (label === "↗") return `<button type="button" class="resource-inline-link"
    ${uid ? `data-resource-target="${esc(uid)}"` : "disabled"} title="场景详情">↗</button>`;
  return `<span class="story-scene-link"${roleAttribute}
    data-story-scene-link="${id ?? ""}">${sceneMarkup(id)}</span>`;
}

function sceneMarkup(id) {
  return id === null ? "—" : scenePositionPickerMarkup({
    entries: state.project?.scenes?.editable_scenes || [], sceneId: id,
    x: null, y: null, disabled: true, label: "场景",
  });
}

/** 播放器切换幕时重建场景位置选择器。 */
function updateStorySceneLink(node, sceneId) {
  if (!node) return;
  const id = sceneIdValue(sceneId);
  if (node.dataset.storySceneLink === String(id ?? "")) return;
  node.dataset.storySceneLink = String(id ?? "");
  node.innerHTML = sceneMarkup(id);
  hydrateScenePositionPicker(node.querySelector("[data-scene-position-picker]"));
}

// @editor-module 场景移动结算字段对象提供固定效果与存档状态关联。
// 固定规则以 project/evidence/chassis-step-regen/observations.json 为依据。

registerModuleComponent('field-step-resolution-service', 'movement-effects', {
  render: ({chassisDetail = false}) => fields([
    ['逐格回复', '人物 HP +1／格 · 最大 HP 封顶'],
    ['生效对象', '<span title="更换底盘保持效果；不检查乘车、在队或死亡标志。">绑定战车 02 的人物</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=vehicle-2" title="持久战车槽 02">↗</a>'],
    ...(!chassisDetail ? [['关联底盘', '<a href="?view=equipment&amp;equipmentDomain=tank&amp;record=147#field-step-effects" title="战车槽 02 的原始底盘详情">↗</a>']] : []),
  ]),
});

registerModuleComponent('field-status-damage-service', 'movement-effects', {
  render: () => fields([
    ['人物酸蚀', '<span title="人物未乘车且未死亡时每格扣 1 HP；归零写死亡标记。">HP −1／格</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=role-hunter" title="人物酸蚀状态">↗</a>'],
    ['战车酸蚀', '<span title="当前移动队伍绑定的酸蚀战车每格扣 1 SP，最低为零。">SP −1／格</span> · <a href="?view=save&amp;saveSection=party&amp;saveEntity=vehicle-0" title="战车酸蚀状态">↗</a>'],
  ]),
});

registerModuleComponent('field-exploration-runtime', 'movement-effects', {
  render: ({componentAttributes = '', chassisDetail = false}) => `<div data-field-step-effects ${componentAttributes}>
    ${renderModuleComponent('field-step-resolution-service', 'movement-effects', {chassisDetail})}
    ${renderModuleComponent('field-status-damage-service', 'movement-effects')}
    ${fields([['结算顺序', '<span title="先回复 HP，再生成并结算酸蚀扣减；HP 已满且人物酸蚀时，本格仍会扣 1 HP。">回复 → 酸蚀扣减</span>']])}
  </div>`,
});

// @editor-module 装备、道具与炮弹表

// CPU 地址的十六进制写法不再随数据发布（它是纯派生量），在这里现算。
const cpuHex = holder => holder?.cpu_address == null
  ? "" : hex(Number(holder.cpu_address), 4);



//
// 来源：拆分前 engine/editor/app.js 第 9673-9954 行。


function statusLabel(status) {
  return {
    "empty": "空栏",
    "static-equipment-record": "静态装备属性",
    "runtime-chassis-record": "底盘属性在运行时记录",
    "field-use-decoded": "使用入口已解码并实机验证",
    "field-use-default-refusal": "未登记：统一不可使用",
    "field-use-rejected": "道具 ID 上限检查拒绝",
    "battle-use-decoded": "战斗效果已登记",
    "battle-use-unregistered": "战斗中未登记",
  }[status] || status || "—";
}

const ITEM_USE_CATEGORY_IDS = new Set(["human-item", "tank-item"]);
const ITEM_USE_MODES = Object.freeze({
  field: {
    effectKey: "use_effect",
    resourcePrefix: "field-item-use",
    dispatchUid: "field-item-dispatch",
  },
  battle: {
    effectKey: "battle_use_effect",
    resourcePrefix: "battle-item-use",
    dispatchUid: "battle-item-dispatch",
  },
});

let itemNameEditors = null;

function itemNameDecodedText(item) {
  return fixedTextRecordText(itemNameRecordId(item));
}

function itemNameControl(item) {
  return fixedTextEditorMarkup({
    recordId: itemNameRecordId(item),
    label: "名称", mode: "exact", compact: true,
  });
}

function itemNameDraftError() {
  return itemNameEditors?.error || "";
}

function itemEditorToolbar() {
  const error = itemEditorDraftError();
  const status = equipmentEditorStatus();
  return `<div data-page-header-part="controls" class="data-editor-toolbar">
    <p id="equipment-save-state" class="${error ? "invalid" : ""}"
      ${status ? "" : "hidden"}>${esc(status)}</p>
  </div>`;
}

function itemEditorForm(content) {
  return `<form id="equipment-editor">
    ${itemEditorToolbar()}
    ${content}
  </form>`;
}

function itemUseModeConfig(mode) {
  const config = ITEM_USE_MODES[mode];
  if (!config) throw new TypeError(`未知道具使用域：${mode}`);
  return config;
}

function itemUseItems(items) {
  return items.filter(item => ITEM_USE_CATEGORY_IDS.has(item.category?.id));
}

function itemUseUid(item, mode) {
  const prefix = itemUseModeConfig(mode).resourcePrefix;
  return `${prefix}:${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function consumptionLabel(value) {
  return {
    "never": "不消耗",
    "on-success": "成功时消耗",
    "context-dependent": "由场景 / 状态决定",
  }[value] || value || "—";
}

function renderItemUseTextOutputs(usage) {
  const outputs = usage?.text_outputs || [];
  if (!outputs.length) {
    return "";
  }
  const titles = outputs.map(output =>
    `${output.label || output.role || "文字"} · ${output.condition || "always"} · ${output.text_record?.node_id || ""}`
  ).filter(Boolean);
  const recordIds = outputs.map(output => output.text_record?.node_id).filter(Boolean);
  const titleAttr = titles.length ? ` title="${esc(titles.join("；"))}"` : "";
  return `<span class="item-use-text-output"${titleAttr}>${plainTextRecordReferences(recordIds, "")}</span>`;
}

function renderItemUseData(data, items) {
  const domainItems = itemUseItems(items);
  const filterValue = state.fieldItemFilter;
  const selectedCategory = state.fieldItemCategory;
  const categoryIds = new Set(domainItems.map(item => item.category?.id));
  const categories = (data.items?.categories || []).filter(category => categoryIds.has(category.id));
  const query = `${state.query} ${filterValue}`.trim().toLowerCase();
  const visible = domainItems.filter(item => {
    const field = item.use_effect || {};
    const battle = item.battle_use_effect || {};
    const search = [item.id, item.id_hex, itemNameDecodedText(item), item.category?.name,
      field.effect_family?.label, ...usageParameters(field), field.status,
      battle.result_selector_hex, battle.status,
      ...(field.text_outputs || []).map(output => output.text_record?.node_id),
      ...(battle.text_outputs || []).map(output => output.text_record?.node_id),
    ].join(" ").toLowerCase();
    return (selectedCategory === "all" || item.category?.id === selectedCategory)
      && (!query || search.includes(query));
  });
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: item => handleMarkup(itemUid(item))},
    {key: "name", label: "道具", sticky: true, width: 132,
      cell: item => itemNameControl(item)},
    {key: "category", label: "分类", width: 100,
      cell: item => esc(item.category?.name || "—")},
    {key: "price", label: "价格", align: "right", width: 105,
      cell: item => equipmentNumericControl(item, "priceCode")},
    {key: "field_effect", label: "非战斗效果", width: 150,
      cell: item => esc(item.use_effect?.effect_family?.label || statusLabel(item.use_effect?.status))},
    {key: "field_text", label: "非战斗文本", width: 240,
      cell: item => renderItemUseTextOutputs(item.use_effect)},
    {key: "battle_effect", label: "战斗结果", width: 115,
      cell: item => esc(item.battle_use_effect?.result_selector_hex || statusLabel(item.battle_use_effect?.status))},
    {key: "battle_text", label: "战斗文本", width: 240,
      cell: item => renderItemUseTextOutputs(item.battle_use_effect)},
    {key: "original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: item => resetToOriginalButton(Number(item.id), {
        title: "恢复这一件道具名称的 Original；其他道具编辑会保留",
      })},
  ];
  return itemEditorForm(`<div class="data-filter item-filter">
    <span>⌕</span>
    <input id="field-item-filter" value="${esc(filterValue)}" placeholder="按 ID、名称、效果或文本过滤…">
    <select id="field-item-category">
      <option value="all">全部道具（${domainItems.length}）</option>
      ${categories.map(category => `<option value="${esc(category.id)}" ${
        selectedCategory === category.id ? "selected" : ""
      }>${esc(category.name)}（${domainItems.filter(item => item.category?.id === category.id).length}）</option>`).join("")}
    </select>
    <small>${visible.length} / ${domainItems.length} 条记录</small>
  </div>${dataTable({columns, rows: visible, rowId: item => item.id,
    recordRoute: item => `items/${item.id}`, total: domainItems.length,
    virtualKey: "items"})}`);
}

function usageParameters(usage) {
  return (usage?.parameters || []).map(parameter => {
    const value = parameter.id === "hp" ? `${parameter.minimum}–${parameter.maximum}`
      : parameter.id === "sp" ? `+${parameter.value}` : (parameter.value_hex || parameter.value);
    return `${parameter.label} ${value}`;
  });
}

function itemUseRecordFieldValue(item, row) {
  if (row.fieldKey === "name") return itemNameControl(item);
  return row.fieldKey === "price" ? equipmentNumericControl(item, "priceCode", true) : null;
}

function itemUseReference(handle, label = handle) {
  return `<button class="resource-uid" type="button" data-resource-target="${esc(handle)}">${esc(label)}</button>`;
}

function itemUseEffectFields(item, usage, mode) {
  const config = itemUseModeConfig(mode);
  const resultRecords = db.peekDocument('battle-result-script', null)?.records || [];
  const resultRecord = resultRecords.find(record => record.id === usage.result_selector);
  const common = [
    ["使用记录", itemUseReference(itemUseUid(item, mode))],
    ["调度索引", `<span class="mono">${esc(usage.dispatch_index_hex ?? "")}</span>`],
    ["调度", `<button class="resource-uid" type="button" data-resource-query="${config.dispatchUid}">${config.dispatchUid}</button>`],
  ];
  if (mode === "field") {
    const family = usage.effect_family || {};
    return [
      ...common,
      ["效果", esc(family.label || "")],
      ["生效条件", esc(family.detail || "")],
      ["处理器", usage.handler ? "非战斗道具处理器" : ""],
      ...(['clear-poison', 'wax'].includes(family.id) ? [["状态",
        renderModuleComponent(family.id === 'wax' ? 'save-vehicle' : 'save-role',
          'status-reference', {operation: 'clear'})]] : []),
      ["目标选择", usage.target_required == null ? "" : usage.target_required ? "选择队员" : "无需选择队员"],
      ["消耗规则", esc(usage.consumption ? consumptionLabel(usage.consumption) : "")],
      ["效果页", itemEffectPagesForItem(item).map(page =>
        `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=${esc(page.id)}">${esc(page.label)} ↗</a>`
      ).join(" · ")],
    ];
  }
  const resultHandle = Number.isInteger(usage.result_selector)
    ? recordUid("battle-result-script", usage.result_selector) : "";
  return [
    ...common,
    ["处理器", resultHandle ? itemUseReference(resultHandle) : ""],
    ["处理器正文", `<code class="record-bytes">${esc(resultRecord?.raw_hex || "")}</code>`],
    ["目标选择", usage.target_required == null ? "" : usage.target_required ? "选择目标" : "无需选择目标"],
    ["消耗规则", esc(usage.consumption ? consumptionLabel(usage.consumption) : "")],
    ...battleResultStatusEffects(
      resultRecord, handle => resultRecords.find(record => record.handle === handle),
    ).map(effect => [effect.target === 'role' ? '人物状态' : '战车状态',
      renderModuleComponent(effect.target === 'role' ? 'save-role' : 'save-vehicle', 'status-reference', effect)]),
    ["库存域", ({vehicle: "战车道具槽", human: "角色道具槽"})[usage.inventory_domain] || ""],
  ];
}

function itemUseParameterFields(usage) {
  const parameters = usage.parameters || [];
  if (!parameters.length) {
    return fields([["参数", Array.isArray(usage.parameters) ? "无" : ""]]);
  }
  return fields(parameters.flatMap(parameter => {
    const value = parameter.id === "hp"
      ? `${parameter.minimum}–${parameter.maximum}`
      : parameter.id === "sp"
        ? `+${parameter.value}`
        : parameter.value_hex || parameter.value;
    return [
      [parameter.label || parameter.id, `<span class="mono">${esc(value)}</span>`],
      ...(parameter.id === "hp" ? [["基础回复", esc(parameter.value)]] : []),
      ...(parameter.formula ? [["公式", `<span class="mono">${esc(parameter.formula)}</span>`]] : []),
    ];
  }));
}

function itemUseTextFields(item, usage, mode, renderedTexts) {
  const outputs = [...(usage.text_outputs || [])];
  for (const edge of indexedResource(itemUseUid(item, mode))?.references || []) {
    if (!edge.target.startsWith("ui-script:")) continue;
    const recordId = `record:${edge.target.slice("ui-script:".length)}`;
    if (!outputs.some(output => output.text_record?.node_id === recordId)) {
      outputs.push({label: edge.relation, text_record: {node_id: recordId}});
    }
  }
  if (!outputs.length) return "";
  const grouped = new Map();
  for (const output of outputs) {
    const id = output.text_record?.node_id;
    const key = id || output.role || output.label;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(output);
  }
  return [...grouped.values()].map(records => {
    const roles = [...new Set(records.map(output => output.label || output.role || "文字"))].join(" / ");
    const conditions = [...new Set(records.map(output => output.condition === "always" ? "始终"
      : output.condition).filter(Boolean))].join("；");
    const id = records[0].text_record?.node_id;
    const reference = id ? itemUseReference(`ui-script:${id.slice("record:".length)}`, id) : "";
    const editor = id ? fixedTextEditorMarkup({recordId: id,
      editorId: `${mode}:${id}`, label: roles, compact: true, mode: "exact"}) : "";
    let body = reference;
    if (id && !renderedTexts.has(id)) body = editor.includes('data-fixed-text-editor=')
      ? editor : plainTextRecordReferences([id], "");
    if (id) renderedTexts.add(id);
    return fields([[roles, `${body}${body === reference ? "" : reference}`], ["条件", esc(conditions)]]);
  }).join("");
}

function itemUsePhysicalRows(data, item, uid) {
  const rows = [
    ...resourcePhysicalAddressSummary(uid).ranges.map(address => ({label: address.role || "道具记录", address})),
    ...["field_use", "battle_use"].flatMap(kind => Object.entries(
      data.items?.[kind]?.entrypoints || {}).map(([label, address]) => ({label, address}))),
    {label: `非战斗处理器 ${cpuHex(item.use_effect?.handler)}`, address: item.use_effect?.handler?.source},
    {label: "战斗结果脚本", address: db.peekDocument('battle-result-script', null)?.records
      ?.find(record => record.id === item.battle_use_effect?.result_selector)?.source},
    ...["field", "battle"].flatMap(mode => resourcePhysicalAddressSummary(
      itemUseUid(item, mode)).ranges.map(address => ({label: `${mode === "field" ? "非战斗" : "战斗"}使用记录`, address}))),
  ].filter(row => row.address);
  const byRange = new Map();
  for (const row of rows) {
    const address = row.address;
    const key = `${address.space || "prg"}:${address.offset ?? address.prg_offset}:${address.length}`;
    const previous = byRange.get(key);
    if (previous) previous.labels.add(row.label);
    else byRange.set(key, {...row, labels: new Set([row.label])});
  }
  return [...byRange.values()].map(({labels, ...row}) => ({...row, label: [...labels].join(" / ")}));
}

function renderItemUseRecord(data, items, itemId) {
  const domainItems = itemUseItems(items);
  const index = domainItems.findIndex(item => Number(item.id) === Number(itemId));
  if (index < 0) return null;
  const item = domainItems[index];
  const uid = itemUid(item);
  const renderedTexts = new Set([itemNameRecordId(item)]);
  const addressTable = fieldAddressTable({
    uid, fields: [["name", "名称"], ["price", "价格"]],
    fieldRoles: ["name", "price"],
    valueFor: row => itemUseRecordFieldValue(item, row),
    showStatus: false,
    pageStatus: {selection: uid},
  });
  return itemEditorForm(recordPage({
    title: itemNameDecodedText(item), uid, backLabel: "道具",
    physicalUid: null,
    physicalRows: itemUsePhysicalRows(data, item, uid),
    physicalContent: fields(["human", "vehicle"].filter(domain => item.battle_use_effect?.inventory_domain === domain)
      .map(domain => ["战斗库存起点", `<span class="mono">${esc(
        data.items?.battle_use?.runtime_layout?.[`${domain}_inventory_base_cpu_hex`] || "")}</span>`])),
    prevId: index > 0 ? domainItems[index - 1].id : null,
    nextId: index < domainItems.length - 1 ? domainItems[index + 1].id : null,
    panels: [panel("字段", `${addressTable}${fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["分类", esc(item.category?.name || "—")],
      ["归属", esc(item.category?.owner || "—")],
      ["名称文本记录", itemUseReference(`ui-script:${itemNameRecordId(item).slice("record:".length)}`, itemNameRecordId(item))],
    ])}`, {wide: true, flat: true}),
      itemUsePanels(item, "field", renderedTexts),
      itemUsePanels(item, "battle", renderedTexts)],
  }));
}

function itemUsePanels(item, mode, renderedTexts) {
  const usage = item[itemUseModeConfig(mode).effectKey] || {};
  const label = mode === "field" ? "非战斗效果" : "战斗效果";
  return panel(label, `<div data-item-use-mode="${mode}">
    ${fields(itemUseEffectFields(item, usage, mode))}
    ${itemUseParameterFields(usage)}
    <h4>输出文字</h4>${itemUseTextFields(item, usage, mode, renderedTexts)}
  </div>`, {wide: true, flat: true});
}

const ITEM_CATEGORY_IDS = new Set(["empty", "human-item", "tank-item"]);
const EQUIPMENT_DOMAINS = Object.freeze({
  "human-equipment": {
    prefix: "human-", label: "人类装备",
  },
  "tank-equipment": {
    prefix: "tank-", label: "战车装备",
  },
});

function equipmentDomainConfig(domain) {
  return EQUIPMENT_DOMAINS[domain] || null;
}

function allEquipmentItems(items) {
  return items.filter(item => !ITEM_CATEGORY_IDS.has(item.category?.id));
}

function equipmentItemsForDomain(items, domain) {
  const config = equipmentDomainConfig(domain);
  if (!config) throw new TypeError(`未知装备域：${domain}`);
  return allEquipmentItems(items).filter(item =>
    String(item.category?.id || "").startsWith(config.prefix)
  );
}

function equipmentCategoryLabel(item) {
  return String(item.category?.name || "—").replace(/^人类装备·|^战车装备·/u, "");
}

function equipmentCategoryCell(item, domain) {
  return `<span class="equipment-category-cell">${renderModuleComponent(
    domain === "human-equipment" ? "human-item" : "tank-item", "preview", {entry: item},
  )}<span title="${esc(item.category?.name || "")}">${esc(equipmentCategoryLabel(item))}</span></span>`;
}

function renderItemData(data, items, domain = "human-equipment") {
  const equipmentConfig = equipmentDomainConfig(domain);
  if (!equipmentConfig) throw new TypeError(`未知装备域：${domain}`);
  const domainItems = equipmentItemsForDomain(items, domain);
  const filterValue = state.equipmentFilter;
  const requestedCategory = state.equipmentCategory;
  const q = `${state.query} ${filterValue}`.trim().toLowerCase();
  const categories = (data.items?.categories || []).filter(category =>
    !ITEM_CATEGORY_IDS.has(category.id) && category.id.startsWith(equipmentConfig.prefix)
  );
  const selectedCategory = requestedCategory === "all"
      || categories.some(category => category.id === requestedCategory)
    ? requestedCategory : "all";
  const visible = domainItems.filter(item => {
    const inCategory = selectedCategory === "all" || item.category.id === selectedCategory;
    const haystack = `${item.id} ${item.id_hex} ${itemNameDecodedText(item)} ${item.category.id} ${item.category.name}`.toLowerCase();
    return inCategory && (!q || haystack.includes(q));
  });
  const filterControls = `<div class="data-filter item-filter">
    <span>⌕</span>
    <input id="equipment-filter" value="${esc(filterValue)}" placeholder="按 ID、中文名称或分类过滤…">
    <select id="equipment-category">
      <option value="all">全部分类（${domainItems.length}）</option>
      ${categories.map(category => `<option value="${esc(category.id)}" ${selectedCategory === category.id ? "selected" : ""}>${esc(category.name)}（${category.record_count}）</option>`).join("")}
    </select>
  </div>`;
  // 装备导航页保留可编辑字段；详情中的物理位置交给共用折叠区。
  const isHumanEquipment = domain === "human-equipment";
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: item => handleMarkup(itemUid(item))},
    {key: "name", label: "名称", sticky: true, width: 132,
      cell: item => itemNameControl(item)},
    {key: "category", label: "分类 / 装备位", width: 132,
      cell: item => equipmentCategoryCell(item, domain)},
    {key: "attack", label: "攻击", width: 108,
      cell: item => equipmentNumericControl(item, "attackCode")},
    {key: "defense", label: "防御", width: 108,
      cell: item => equipmentNumericControl(item, "defenseCode")},
    ...(!isHumanEquipment ? [
      {key: "weight", label: "重量 RAW (×0.1t)", align: "right", width: 124,
        cell: item => equipmentWeightControl(item)},
      {key: "capacity", label: "载重 (t)", align: "right", width: 88,
        cell: item => equipmentCapacityControl(item)},
    ] : []),
    {key: "price", label: "价格", width: 120,
      cell: item => equipmentNumericControl(item, "priceCode")},
    ...(isHumanEquipment ? [
      {key: "roles", label: "可装备角色", width: 230,
        cell: item => equipmentRoleControls(item)},
    ] : [{key: "mountable_slots", label: "可装位", width: 230,
      cell: item => equipmentMountableControls(item)}]),
    {key: "scope", label: "攻击范围", width: 116,
      cell: item => equipmentScopeControl(item)},
    {key: "flags", label: "装备标志", mono: true, width: 92,
      cell: item => equipmentFlagsCell(item)},
    {key: "effect", label: "核心效果对象（7 种）", width: 250,
      title: "决定攻击时生成哪一种核心效果对象；7 种固定对象，另有运行时构造项",
      cell: item => equipmentCoreEffectControl(item)},
    {key: "attack_visual", label: "视觉脚本（79 条）", width: 220,
      title: "决定发射、弹道与击中的动画演出；从 79 条视觉脚本中选择",
      cell: item => equipmentAttackVisualControl(item)},
    {key: "name_record", label: "名称记录", mono: true, align: "right", width: 82,
      cell: item => esc(item.name_text_record_id)},
    {key: "original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: item => `<span data-equipment-reset-object="${esc(itemFieldHandle(item))}"></span>`},
  ];
  return `<form id="equipment-editor">
    <div class="section-line"><h2>${equipmentConfig.label}</h2><span>${visible.length} / ${domainItems.length} 条记录</span></div>
    ${itemEditorToolbar()}
    ${filterControls}
    ${dataTable({
      columns,
      rows: visible,
      rowId: item => item.id,
      recordRoute: item => `${domain}/${item.id}`,
      total: domainItems.length,
      virtualKey: `equipment:${domain}`,
    })}

  </form>`;
}

function itemUid(item) {
  return itemResourceUid(item);
}

function itemFieldHandle(item) {
  return `item-entry:item:${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function equipmentRoles(item) {
  const roles = item.equipment?.roles || [];
  if (roles.length) return roles.map(role => role.name);
  return item.category.owner === "tank" && item.id <= 0x90 ? ["战车专用"] : [];
}

function effectAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function attackVisualCatalog() {
  const clean = effectAssets().clean_animations || {};
  return clean.catalog || clean.clips || [];
}

function itemEditorDraftError() {
  return itemNameDraftError();
}

function equipmentEditorStatus() {
  return state.equipmentMessage || itemEditorDraftError();
}

function updateEquipmentEditorState(message = "") {
  state.equipmentMessage = message;
  const status = $("#equipment-save-state");
  if (!status) return;
  const label = equipmentEditorStatus();
  status.textContent = label;
  status.hidden = !label;
  status.classList.toggle("invalid", Boolean(itemEditorDraftError()));
}

function equipmentFieldHost(item, fieldName, kind, reset = false) {
  return `<span data-equipment-object="${esc(itemFieldHandle(item))}"
    data-equipment-field="${esc(fieldName)}" data-equipment-kind="${esc(kind)}"
    data-equipment-field-reset="${reset}"></span>`;
}

function equipmentNumericControl(item, field, reset = false) {
  const names = {attackCode: "attack.raw_code", defenseCode: "defense.raw_code",
    priceCode: "price.raw_code"};
  const key = field.replace(/Code$/, "");
  return item[key] ? equipmentFieldHost(item, names[field], "mapped-number", reset) : "—";
}

function equipmentWeightControl(item, reset = false) {
  return item.tank_weight ? `${equipmentFieldHost(item, "tank_weight.raw", "number", reset)}<small>× 0.1 t</small>` : "—";
}

function equipmentCapacityControl(item, reset = false) {
  return item.engine_capacity ? `${equipmentFieldHost(item, "engine_capacity.raw", "number", reset)}<small>t</small>` : "—";
}

function equipmentRoleControls(item) {
  if (item.equipment?.role_mask == null) return item.category.owner === "tank" && Number(item.id) <= 0x90
    ? `<span class="resource-empty">战车专用</span>` : "—";
  return equipmentFieldHost(item, "equipment.role_mask", "bitmask");
}

function equipmentMountableControls(item) {
  if (!Array.isArray(item.mountable_slots)) return "—";
  if (["tank-main-gun", "tank-sub-gun", "tank-special"].includes(item.category.id))
    return equipmentFieldHost(item, "mountable_slots", "set");
  const labels = {c_unit: "C 装置", engine: "引擎", chassis: "底盘"};
  return item.mountable_slots.map(slot => esc(labels[slot] || slot)).join("、") || "—";
}

function equipmentScopeControl(item) {
  return item.equipment?.target_scope
    ? equipmentFieldHost(item, "equipment.target_scope.bits", "select") : "—";
}

function equipmentFlagsCell(item) {
  return item.equipment?.raw_flags_hex
    ? `<span class="mono" data-equipment-derived-flags="${esc(itemFieldHandle(item))}">${
      esc(item.equipment.raw_flags_hex)}</span>` : "—";
}

function equipmentCoreEffectControl(item) {
  return item.equipment ? equipmentFieldHost(item, "equipment.battle_effect_code", "core-effect") : "—";
}

function coreEffectStreams() {
  return effectAssets().effect_streams || [];
}

function coreEffectPreview(stream) {
  if (stream.action_code == null) return `<span class="equipment-core-runtime">运行时构造</span>`;
  const context = (effectAssets().clean_animations?.action_previews?.context_atlases || [])
    .find(entry => (entry.used_actions || []).includes(stream.action_code));
  return context ? battleActionCanvas({effectBank: context.chr_effect_bank,
    action: stream.action_code, label: `核心效果 ${stream.effect_code_hex}`})
    : `<span class="resource-empty">无已发布图像上下文</span>`;
}

function mountCoreEffectPicker(host, object, streams) {
  if (streams.length !== 8 || streams.some((stream, index) => stream.effect_code !== index))
    throw new TypeError("核心效果对象目录与已发布候选不一致");
  mountFieldObjectChoice(host, object, {
    entityHandle: object.id, fieldName: "equipment.battle_effect_code", label: "核心效果对象",
    optionsMarkup: value => streams.map(stream => `<option value="${stream.effect_code}"${
      Number(value) === stream.effect_code ? " selected" : ""}>${esc(
        stream.label || `效果对象 ${stream.effect_code_hex}`)}</option>`).join(""),
    pickerMarkup: (value, controlMarkup) => referencePickerMarkup({
      moduleId: "effect-stream", value, label: "核心效果对象", controlMarkup,
      compact: true, pageSize: 8,
      items: streams.map(stream => ({
        value: stream.effect_code, label: stream.label || `效果对象 ${stream.effect_code_hex}`,
        meta: stream.effect_code_hex,
        description: stream.storage_kind === "runtime-generated" ? "运行时构造" : "ROM 固定对象",
        preview: coreEffectPreview(stream),
      })),
    }),
    paintPreview: preview => paintBattleActionCanvases(preview),
  });
}

function equipmentAttackVisualControl(item) {
  return item.attack_visual
    ? equipmentFieldHost(item, "attack_visual.visual_code", "visual") : "—";
}

function renderEquipmentAttackVisualPreview(item) {
  const code = item.attack_visual?.visual_code;
  if (!Number.isInteger(code)) return `<div class="record-preview"><span class="resource-empty">该装备不触发攻击动画</span></div>`;
  const selected = attackVisualCatalog().find(clip => Number(clip.visual_code) === code);
  return `<div class="equipment-attack-preview equipment-record-attack-preview">${
    selected?.preview_status !== "opaque-preserved-not-rendered"
      ? attackVisualCanvas({visualCode: code, play: true, segment: "full",
        label: `${item.name} · ${selected ? attackVisualOptionLabel(selected) : hex(code, 2)}`})
      : `<span class="resource-empty">该特效槽无法预览</span>`
  }</div>`;
}

function bindEquipmentEditor() {
  const root = $("#equipment-editor");
  if (!root || root.dataset.equipmentFieldObjects) return;
  root.dataset.equipmentFieldObjects = "loading";
  root.addEventListener("submit", event => event.preventDefault());
  itemNameEditors = bindFixedTextEditors(root, {
    reuse: itemNameEditors,
    onState: () => updateEquipmentEditorState(),
  });
  const objectsPromise = db.getFieldObjects("item-entry").then(objects =>
    new Map(objects.map(object => [object.id, object])));
  const numericCodesPromise = db.readResource("item-entry").then(saved =>
    saved.value.document.equipment_editor.numeric_codes);
  let mountedOnce = false;
  const mount = async () => {
    if (mountedOnce) itemNameEditors = bindFixedTextEditors(root, {reuse: itemNameEditors,
      onState: () => updateEquipmentEditorState()});
    mountedOnce = true;
    const [objects, numericCodes] = await Promise.all([objectsPromise, numericCodesPromise]);
    const streams = coreEffectStreams();
    if (!root.isConnected) return;
    const asynchronous = [];
    for (const host of root.querySelectorAll("[data-equipment-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = objects.get(host.dataset.equipmentObject);
      if (!object) throw new TypeError(`物品字段对象不存在：${host.dataset.equipmentObject}`);
      const fieldName = host.dataset.equipmentField;
      const reset = host.dataset.equipmentFieldReset === "true";
      if (host.dataset.equipmentKind === "select")
        asynchronous.push(mountFieldObjectSelect(host, object, fieldName, {reset: false}));
      else if (host.dataset.equipmentKind === "mapped-number")
        mountFieldObjectNumericCodeValue(host, object, fieldName, numericCodes, {reset});
      else if (host.dataset.equipmentKind === "core-effect")
        mountCoreEffectPicker(host, object, streams);
      else if (host.dataset.equipmentKind === "number")
        mountFieldObjectNumber(host, object, fieldName, {min: 0, max: 255, reset});
      else if (host.dataset.equipmentKind === "bitmask")
        asynchronous.push(mountFieldObjectBitmask(host, object, fieldName));
      else if (host.dataset.equipmentKind === "set")
        mountFieldObjectSet(host, object, fieldName);
      else if (host.dataset.equipmentKind === "visual")
        mountFieldObjectAttackVisual(host, object, fieldName,
          {preview: state.recordId != null, reset: state.recordId != null});
      else throw new TypeError(`未知物品字段控件：${host.dataset.equipmentKind}`);
    }
    await Promise.all(asynchronous);
    for (const host of root.querySelectorAll("[data-equipment-reset-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = objects.get(host.dataset.equipmentResetObject);
      if (!object) throw new TypeError(`物品字段对象不存在：${host.dataset.equipmentResetObject}`);
      mountFieldObjectReset(host, object);
    }
    for (const host of root.querySelectorAll("[data-equipment-object-editor]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = objects.get(host.dataset.equipmentObjectEditor);
      if (!object) throw new TypeError(`物品字段对象不存在：${host.dataset.equipmentObjectEditor}`);
      const represented = [...root.querySelectorAll("[data-equipment-object]")]
        .filter(control => control.dataset.equipmentObject === object.id)
        .map(control => control.dataset.equipmentField);
      const suppressedFieldKeys = new Set(represented.map(name =>
        JSON.stringify([object.resourceId, object.id, name])));
      await mountFieldObjectEditor(host, object, {suppressedFieldKeys, compactIdentity: true, stacked: true});
    }
    for (const node of root.querySelectorAll("[data-equipment-derived-flags]")) {
      if (node.dataset.fieldMounted) continue;
      node.dataset.fieldMounted = "true";
      const object = objects.get(node.dataset.equipmentDerivedFlags);
      if (!object) continue;
      const refresh = async () => {
        const document_ = (await db.readResource("item-entry")).value.document;
        const item = document_.records.find(record => Number(record.id) === object.fields[0].recordId);
        if (!node.isConnected || !item?.equipment) return;
        node.textContent = item.equipment.raw_flags_hex;
      };
      for (const field of object.fields.filter(field => ["equipment.battle_effect_code",
        "equipment.role_mask", "mountable_slots", "equipment.target_scope.bits", "equipment.unresolved_bits"].includes(field.fieldName))) {
        field.bind(node, (_target, _value, _field, reason) => {
          if (reason !== "initial") void refresh().catch(error => updateEquipmentEditorState(`属性投影读取失败：${error.message}`));
        });
      }
    }
    await itemNameEditors.ready;
    if (!root.isConnected) return;
    root.dataset.equipmentFieldObjects = "ready";
    updateEquipmentEditorState();
  };
  root.addEventListener("virtual-table-rows", () => {
    void mount().catch(error => updateEquipmentEditorState(`字段绑定失败：${error?.message || error}`));
  });
  void mount().catch(error => updateEquipmentEditorState(`字段绑定失败：${error?.message || error}`));
}

const EQUIPMENT_FIELD_DEFINITIONS = [
  ["name", "名称"],
  ["attack", "攻击"],
  ["defense", "防御"],
  ["tank_weight", "重量"],
  ["engine_capacity", "载重"],
  ["price", "价格"],
  ["equipment", "装备标志"],
];

const EQUIPMENT_FIELD_KEYS_BY_CATEGORY = Object.freeze({
  "human-head": ["name", "defense", "price", "equipment"],
  "human-body": ["name", "defense", "price", "equipment"],
  "human-feet": ["name", "defense", "price", "equipment"],
  "human-protector": ["name", "defense", "price", "equipment"],
  "human-hands": ["name", "defense", "price", "equipment"],
  "human-weapon": ["name", "attack", "price", "equipment"],
  "tank-main-gun": ["name", "attack", "defense", "tank_weight", "price", "equipment"],
  "tank-special": ["name", "attack", "defense", "tank_weight", "price", "equipment"],
  "tank-sub-gun": ["name", "attack", "defense", "tank_weight", "price", "equipment"],
  "tank-c-unit": ["name", "defense", "tank_weight", "price"],
  "tank-engine": ["name", "defense", "tank_weight", "engine_capacity", "price"],
  "tank-chassis": ["name", "price"],
});

function equipmentFieldDefinitions(item) {
  const keys = EQUIPMENT_FIELD_KEYS_BY_CATEGORY[item.category?.id];
  if (!keys) throw new TypeError(`装备分类没有字段定义：${item.category?.id || "（空）"}`);
  const included = new Set(keys);
  return EQUIPMENT_FIELD_DEFINITIONS.filter(([key]) => included.has(key));
}

function equipmentFieldValue(item, fieldKey) {
  if (fieldKey === "name") return itemNameControl(item);
  if (["price", "attack", "defense"].includes(fieldKey))
    return equipmentNumericControl(item, `${fieldKey}Code`, true);
  if (fieldKey === "tank_weight") return equipmentWeightControl(item, true);
  if (fieldKey === "engine_capacity") return equipmentCapacityControl(item, true);
  if (fieldKey !== "equipment") return null;
  return `${equipmentFlagsCell(item)}${fields([
    ...(item.equipment?.role_mask == null ? [["可装备", equipmentRoles(item).map(esc).join("、") || "—"]] : []),
    ["核心效果对象", equipmentCoreEffectControl(item)],
    ...(Array.isArray(item.mountable_slots) ? [["可装位", equipmentMountableControls(item)]] : []),
  ])}<div data-equipment-object-editor="${esc(itemFieldHandle(item))}"></div>`;
}

/** 记录页按装备子分类对账字段，物理位置交给共用折叠区。 */
async function renderEquipmentRecord(items, itemId, domain) {
  items = (await db.readResource("item-entry")).value.document.records;
  const domainItems = equipmentItemsForDomain(items, domain);
  const index = domainItems.findIndex(item => Number(item.id) === Number(itemId));
  if (index < 0) return null;
  const item = domainItems[index];
  const uid = itemUid(item);
  const addressTable = fieldAddressTable({
    uid,
    fields: equipmentFieldDefinitions(item),
    fieldRoles: ["name", "price"],
    valueFor: row => equipmentFieldValue(item, row.fieldKey),
    showStatus: false,
    pageStatus: {
      selection: uid,
      dirty: "",
    },
  });
  return `<form id="equipment-editor">${recordPage({
    title: itemNameDecodedText(item),
    uid,
    backLabel: equipmentDomainConfig(domain).label,
    prevId: index > 0 ? domainItems[index - 1].id : null,
    nextId: index < domainItems.length - 1 ? domainItems[index + 1].id : null,
    panels: [
      panel("字段", `${addressTable}${!item.equipment
        ? `<div data-equipment-object-editor="${esc(itemFieldHandle(item))}"></div>` : ""}`, {wide: true, flat: true}),
      panel("基本信息", fields([
        ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
        ["分类 / 装备位", equipmentCategoryCell(item, domain)],
        ["名称文本记录", `#${esc(item.name_text_record_id)}`],
      ])),
      ...(item.category?.id === 'tank-chassis' && item.id === 0x93
        ? [panel('场景移动效果', `<div id="field-step-effects">${renderModuleComponent(
          'field-exploration-runtime', 'movement-effects', {chassisDetail: true})}</div>`)] : []),
      panel("引用关系", fields([
        ["被引用数", resourceForwardReferenceCell(uid)],
      ])),
      ...(item.attack_visual
        ? [panel("攻击特效", `${renderEquipmentAttackVisualPreview(item)}${
          equipmentAttackVisualControl(item)}`)]
        : []),
    ],
  })}</form>`;
}

var items = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindEquipmentEditor: bindEquipmentEditor,
  renderEquipmentRecord: renderEquipmentRecord,
  renderItemData: renderItemData,
  renderItemUseData: renderItemUseData,
  renderItemUseRecord: renderItemUseRecord
});

export { items, renderItemData, renderItemUseData, storyActorHandle, storyAudioLabel, storyInterfaceMarkup, storyResourceMarkup, storySceneLink, storyScriptHandle, storyScriptMarkup, storyShotLabel, storyTextHandle, storyTextMarkup, updateStorySceneLink };
