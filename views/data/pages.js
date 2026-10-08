// @editor-module 七个数值页入口
import {bindFixedTextEditors, fixedTextEditorMarkup, fixedTextRecordText} from "../../ui/fixed-text-editor.js";
import {empty, render} from "../../main.js";
import {$, esc} from "../../core/dom.js";
import {resourceForwardReferenceCell} from "../../core/resource-index.js";
import {
  dataTable,
} from "../../ui/table.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {mountFieldObjectAttackVisual, mountFieldObjectNumericCodeValue} from "../../ui/field-object-editor.js";
import {loadWritebackCapabilities} from "../../core/writeback-capabilities.js";
import {textRecordNodeId} from "../../core/text-record-project.js";
import {renderCharacterData} from "../../views/data/characters.js";
import {renderItemData, renderItemUseData} from "../../views/data/items.js";
import {renderMonsterData} from "../../views/data/monsters.js";
import {renderVehicleData} from "../../views/data/vehicles.js";
import {attackVisualCanvas} from "../../render/weapon-effect-vm.js";
import {fields, panel, recordPage} from "../../ui/record.js";
import {handleMarkup} from "../../ui/handle.js";




//
// 来源：拆分前 engine/editor/app.js 第 9178-9251 行。


export function renderCharacterPage() {
  const data = state.project.game_data || {};
  const roles = data.characters?.rom_initial?.roles || [];
  return roles.length ? renderCharacterData(data, roles) : empty();
}

export function renderVehiclePage(records = []) {
  const data = state.project.game_data || {};
  return records.length ? renderVehicleData(data, records) : empty();
}

export function renderMonsterPage(monsters = []) {
  const data = state.project.game_data || {};
  return monsters.length ? renderMonsterData(data, monsters) : empty();
}

export async function renderHumanEquipmentPage() {
  const items = (await db.readResource("item-entry")).value.document;
  return items.records?.length ? renderItemData({items}, items.records, "human-equipment") : empty();
}

export async function renderTankEquipmentPage() {
  const items = (await db.readResource("item-entry")).value.document;
  return items.records?.length ? renderItemData({items}, items.records, "tank-equipment") : empty();
}

export function renderItemsPage() {
  const data = state.project.game_data || {};
  const items = data.items?.records || [];
  return items.length ? renderItemUseData(data, items) : empty();
}

let shellNameMessage = "";
let shellNameEditors = null;
function shellNameRecordId(shell) {
  if (shell?.name_text_record_id === null
      || shell?.name_text_record_id === undefined
      || shell?.name_text_record_id === "") return null;
  const region = Number.parseInt(String(shell?.name_text_region || ""), 16);
  const record = Number(shell?.name_text_record_id);
  if (!Number.isInteger(region) || !Number.isInteger(record) || record < 0) return null;
  return textRecordNodeId(region, record);
}


function shellNameDecodedText(shell) {
  return fixedTextRecordText(shellNameRecordId(shell));
}

function shellNameControl(shell) {
  return fixedTextEditorMarkup({
    recordId: shellNameRecordId(shell),
    label: "名称", mode: "exact", compact: true,
  });
}

function shellNameDraftError() {
  return shellNameEditors?.error || "";
}

function shellEditorStatus() {
  if (shellNameMessage) return shellNameMessage;
  const error = shellNameDraftError();
  if (error) return `无法保存：${error}`;
  return "";
}

function shellEditorToolbar() {
  const error = shellNameDraftError();
  const status = shellEditorStatus();
  return `<div class="data-editor-toolbar">
    <p id="shell-save-state" class="${error ? "invalid" : ""}"
      ${status ? "" : "hidden"}>${esc(status)}</p>
  </div>`;
}

function shellVisualLink(shell) {
  if (shell.visual_code == null) {
    return `<span class="resource-empty">主炮普通弹特效</span>`;
  }
  return `<span class="shell-attack-visual-control"
    data-shell-visual-object="${esc(shellUid(shell))}"></span>`;
}

export async function renderShellPage() {
  const data = (await db.readResource("shell-record")).value.document;
  const records = data.records || [];
  if (!records.length) return empty();
  const q = `${state.query} ${state.shellFilter}`.trim().toLowerCase();
  const visible = records.filter(shell => !q || [
    shellUid(shell), shell.id, shell.id_hex, shellNameDecodedText(shell),
    shell.special ? "特殊炮弹" : "普通炮弹",
    shell.parameter_raw_hex, shell.damage_parameter, shell.result_selector_hex,
    shell.visual_code_hex, shell.visual_packed_hex, shell.visual_variant,
  ].join(" ").toLowerCase().includes(q));
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: shell => handleMarkup(shellUid(shell))},
    {key: "name", label: "名称", sticky: true, width: 120,
      cell: shell => shellNameControl(shell)},
    {key: "type", label: "类型", width: 88,
      cell: shell => shell.special ? "特殊炮弹" : "普通炮弹"},
    {key: "price", label: "售货单价", width: 170,
      cell: shell => `<span data-shell-price-object="${esc(shellUid(shell))}"></span>
        <span data-shell-price-unbound title="暂时不写进 ROM">◇</span>`},
    {key: "damage", label: "伤害参数", align: "right", mono: true, width: 92,
      cell: shell => shell.special
        ? `<span title="RAW ${esc(shell.parameter_raw_hex)}">${esc(shell.damage_parameter)}</span>` : "—"},
    {key: "selector", label: "结果选择码", mono: true, align: "right", width: 100,
      cell: shell => shell.special
        ? `<span title="($raw >> 4) + $95">${esc(shell.result_selector_hex)}</span>` : "—"},
    {key: "visual", label: "攻击特效", width: 260,
      cell: shell => shellVisualLink(shell)},
  ];
  return `<form id="shell-editor">
    ${shellEditorToolbar()}
    <div class="data-filter">
      <span>⌕</span>
      <input id="shell-filter" value="${esc(state.shellFilter)}" placeholder="按资源 ID、名称、特效编号或结果选择码过滤…">
    </div>
    ${dataTable({
      columns,
      rows: visible,
      rowId: shell => shell.id,
      recordRoute: shell => `shells/${shell.id}`,
    })}
    <div class="wide-card"></div>
  </form>`;
}

function shellUid(shell) {
  return `shell:${Number(shell.id).toString(16).toUpperCase().padStart(2, "0")}`;
}


function updateShellEditorState(message = null) {
  if (message !== null) shellNameMessage = message;
  const status = $("#shell-save-state");
  const error = shellNameDraftError();
  if (!status) return;
  const text = shellEditorStatus();
  status.textContent = text;
  status.hidden = !text;
  status.classList.toggle("invalid", Boolean(error));
}

export async function bindShellEditor(root = $("#shell-editor")) {
  if (!root) return;
  root.addEventListener("submit", event => event.preventDefault());
  shellNameEditors = bindFixedTextEditors(root, {
    onState: () => updateShellEditorState(""),
  });
  const objects = new Map((await db.getFieldObjects("shell-record"))
    .map(object => [object.id, object]));
  const numericCodes = (await db.readResource("item-entry")).value.document.equipment_editor.numeric_codes;
  for (const host of root.querySelectorAll("[data-shell-price-object]")) {
    if (!host.isConnected) return;
    const object = objects.get(host.dataset.shellPriceObject);
    if (!object) throw new TypeError(`炮弹字段对象不存在：${host.dataset.shellPriceObject}`);
    mountFieldObjectNumericCodeValue(host, object, "price.raw_code", numericCodes, {reset: true});
  }
  for (const host of root.querySelectorAll("[data-shell-visual-object]")) {
    if (!host.isConnected) return;
    const object = objects.get(host.dataset.shellVisualObject);
    if (!object) throw new TypeError(`炮弹字段对象不存在：${host.dataset.shellVisualObject}`);
    mountFieldObjectAttackVisual(host, object, "visual_packed", {preview: state.recordId !== null && state.recordId !== undefined});
  }
  void loadWritebackCapabilities(state.projectRepository,
    state.browserPackageManifest || state.browserProjectManifest).then(capabilities => {
    if (!root.isConnected) return;
    const bound = capabilities.byResource.get("shell-record")?.state === "bound";
    root.querySelectorAll("[data-shell-price-unbound]").forEach(mark => {mark.hidden = bound;});
  });
  await shellNameEditors.ready;
  root.dataset.shellFieldsReady = "true";
  updateShellEditorState();
}

function shellDetailValue(key, value) {
  return `<span data-shell-detail="${key}">${value ?? "—"}</span>`;
}

function shellRecordPreview(shell, name) {
  if (shell.visual_code == null) {
    return panel("攻击特效预览", `<div class="record-preview">
      <span class="resource-empty">普通弹使用所选主炮自身的攻击特效</span>
    </div>`);
  }
  const detail = `${shell.visual_code_hex} · 打包值 ${shell.visual_packed_hex} · 变体 ${shell.visual_variant}`;
  return panel("攻击特效预览", `<div class="record-preview shell-record-preview" title="${esc(detail)}">
    ${attackVisualCanvas({
      visualCode: shell.visual_code,
      play: true,
      segment: "full",
      label: `${name} · ${shell.visual_code_hex}`,
    })}
  </div>`);
}

/** 炮弹没有 field: 级登记；记录页只使用已登记的整体范围。 */
export async function renderShellRecord(recordId) {
  const data = (await db.readResource("shell-record")).value.document;
  const records = data.records || [];
  const index = records.findIndex(shell => Number(shell.id) === Number(recordId));
  if (index < 0) return null;
  const shell = records[index];
  const uid = shellUid(shell);
  const name = shellNameDecodedText(shell);
  const runtime = data.runtime_layout || {};
  const validation = shell.runtime_validation || {};
  const damage = shell.special
    ? `${esc(shell.damage_parameter)} · RAW ${esc(shell.parameter_raw_hex)}` : "—";
  return `<div id="shell-editor">${recordPage({
    title: name || shell.name,
    uid,
    physicalRows: [
      {label: "选择入口", address: shell.execution?.selection_entry},
      {label: "效果入口", address: shell.execution?.effect_entry},
      {label: "参数", address: shell.sources?.parameter},
      {label: "特效", address: shell.sources?.visual},
    ].filter(row => row.address),
    backLabel: "炮弹效果",
    prevId: index > 0 ? records[index - 1].id : null,
    nextId: index < records.length - 1 ? records[index + 1].id : null,
    panels: [
      panel("炮弹配置", fields([
        ["游戏索引 ID", shellDetailValue("game-id", `<span class="mono">${esc(
          shell.id_hex
        )}</span>`)],
        ["名称文本记录", shellDetailValue("name-record", `<span class="mono">${esc(
          shellNameRecordId(shell) || "—"
        )}</span>`)],
        ["名称", shellNameControl(shell)],
        ["类型", shellDetailValue("type", shell.special ? "特殊炮弹" : "普通炮弹")],
        ["售卖单价", shellDetailValue("price", `<span data-shell-price-object="${esc(uid)}"></span>
          <span data-shell-price-unbound title="暂时不写进 ROM">◇</span>`)],
        ["伤害参数", shellDetailValue("damage", damage)],
        ["结果选择码", shellDetailValue(
          "selector", shell.special ? `<span class="mono">${esc(shell.result_selector_hex)}</span>` : "—",
        )],
        ["攻击特效", shellDetailValue("visual", shellVisualLink(shell))],
      ])),
      shellRecordPreview(shell, name || shell.name),
      panel("执行来源", fields([
        ["承载", shellDetailValue("carrier", esc(shell.execution?.carrier || "—"))],
        ["执行说明", shellDetailValue("execution-note", esc(shell.execution?.note || "—"))],
      ])),
      panel("运行时布局与验证", fields([
        ["每车槽数", esc(runtime.slots_per_vehicle ?? "—")],
        ["验证存档", esc(validation.save_state || "—")],
        ["采集证据", esc(validation.capture_id || "—")],
      ])),
      panel("引用关系", `<div data-shell-detail="references">${fields([
        ["被引用数", resourceForwardReferenceCell(uid)],
      ])}</div>`),
    ],
  })}</div>`;
}
