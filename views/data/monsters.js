// @editor-module 怪物属性字段对象与编辑
import {bindFixedTextEditors, fixedTextEditorMarkup, fixedTextRecordText} from "../../ui/fixed-text-editor.js";
import {$, esc, hex} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {entityFacetFields, loadEntityCatalog} from "../../core/entities.js";
import {
  audioCommandLabel,
  resourceForwardReferenceCell,
} from "../../core/resource-index.js";
import {buildLogButton} from "../../core/rom-build.js";
import {state} from "../../core/state.js";
import {zonesByMonster} from "../../views/scenes/encounter.js";
import {dataTable} from "../../ui/table.js";
import {
  mountFieldObjectEditor,
  mountFieldObjectNumber,
  mountFieldObjectReset,
  mountFieldObjectSelect,
} from "../../ui/field-object-editor.js";
import {fieldAddressTable} from "../../ui/field-address-table.js";
import {ITEM_CATEGORIES} from "../../ui/item-picker.js";
import {
  attackVisualAssets,
  configureAttackVisualPicker,
} from "../../ui/attack-visual-picker.js";
import {fields, panel, recordPage} from "../../ui/record.js";
import {handleMarkup} from "../../ui/handle.js";
import {monsterFigureCanvas} from "../../render/monster-figure.js";
import {bindMonsterAttributeDetails} from "../../modules/monster/components.js";
import {monsterAttackAnchorMarkup} from "./monster-attack-anchor.js";
import {monsterFigureFieldMarkup} from "./monster-figure-field.js";
import {
  bindMonsterAttackEffectPreviews,
  monsterAttackProfile,
} from "./monster-attack-effects.js";



//
// 来源：拆分前 engine/editor/app.js 第 9368-9488;10987-11086 行。


const monsterRecordFields = [
  ["flags", "总标志"], ["packed_a", "压缩属性 A"], ["packed_b", "压缩属性 B"],
  ["hp", "HP"], ["attack", "攻击"], ["defense", "防御"], ["speed", "速度"],
  ["attack_code", "攻击码"], ["defense_code", "防御码"],
  ["experience_code", "经验值"], ["gold_code", "掉落金钱"],
];

export function copyEditorDraft(value) {
  return JSON.parse(JSON.stringify(value));
}

let monsterNameEditors = null;
let monsterNameHandles = null;

export async function prepareMonsterNameFacets(monsters) {
  const catalog = await loadEntityCatalog();
  const facets = await Promise.all(monsters.map(monster =>
    entityFacetFields(db, catalog.handleFor("monster", Number(monster.id)),
      "name", {catalog})));
  return new Map(monsters.map((monster, index) => {
    const records = facets[index].records;
    if (records.length !== 1) throw new TypeError(`怪物名称切面记录数无效：${monster.id}`);
    return [Number(monster.id), records[0].entityHandle];
  }));
}

export function useMonsterNameFacets(handles) {
  monsterNameHandles = handles;
}

function monsterNameRecordId(monster) {
  const handle = monsterNameHandles?.get(Number(monster.id));
  if (!handle) throw new TypeError(`怪物名称切面未准备：${monster.id}`);
  return handle;
}

function monsterNameDecodedText(monster) {
  return fixedTextRecordText(monsterNameRecordId(monster));
}

function monsterNameControl(monster) {
  return fixedTextEditorMarkup({
    recordId: monsterNameRecordId(monster),
    label: "名称", mode: "exact", compact: true,
  });
}

function monsterNameDraftError() {
  return monsterNameEditors?.error || "";
}

function monsterEditorStatus() {
  if (state.monsterBuilding) return "正在生成新的 ROM…";
  if (state.monsterMessage) return state.monsterMessage;
  return monsterNameDraftError();
}

function monsterEditorToolbar() {
  const error = monsterNameDraftError();
  const status = monsterEditorStatus();
  return `<div class="data-editor-toolbar">
    <p id="monster-save-state"
      class="${error ? "invalid" : ""}" ${status ? "" : "hidden"}>${esc(status)}</p>
    ${buildLogButton()}
  </div>`;
}

/**
 * 一只怪物的攻击视效条目。**条数不定**——现算下来 1 条 41 只、2 条 36 只、
 * 3 条 26 只、4 条 25 只、5 条 3 只，所以按实际条数渲染，不设固定格数。
 * 有条目但 `visual_code` 为空的（该槽没有可解码视效）如实留白，不补一个假编号。
 */
function monsterAttackVisualEntries(monsterId) {
  const selectors = attackVisualAssets().enemy_attack_selectors || [];
  return selectors.filter(selector =>
    (selector.enemy_ids || []).some(id => Number(id) === Number(monsterId)));
}

function monsterAttackVisualCell(monster) {
  const entries = monsterAttackVisualEntries(monster.id);
  if (!entries.length) return `<span class="resource-empty">—</span>`;
  return `<div class="monster-attack-visual-cell">${entries.map(entry =>
    entry.visual_code === null || entry.visual_code === undefined
      ? `<span class="resource-empty" data-monster-attack-visual-empty
          >${esc(entry.id_hex || "")} 无视效</span>`
      : `<animated-resource-picker data-monster-list-attack-visual
          data-monster-id="${Number(monster.id)}"
          data-selector-id="${Number(entry.id)}"
          data-visual-code="${Number(entry.visual_code)}"
          disabled></animated-resource-picker>`
  ).join("")}</div>`;
}

function monsterDropCell(monster) {
  const drop = monster?.drop;
  if (!drop?.item || !drop?.probability) return `<span class="resource-empty">掉落数据缺失</span>`;
  if (!drop.participates || drop.item.kind === "not-participating")
    return `<span title="怪物 ID &lt; 0x18，不在掉落表内">不参与掉落</span>`;
  const probability = drop.probability;
  return `<div class="monster-drop-editor">
    <span data-monster-drop-object="${esc(monsterUid(monster))}"></span>
    <small>概率档 ${esc(probability.tier)} · ${esc(probability.numerator)}/${esc(probability.denominator)}</small>
  </div>`;
}

function monsterDerivedValue(monster, key) {
  return `<span data-monster-derived="${key}" data-monster-id="${monster.id}">${esc(monster[key])}</span>`;
}

export function renderMonsterData(data, monsters) {
  const q = state.monsterFilter.trim().toLowerCase();
  const visible = monsters.filter(monster =>
    !q || `${monster.id} ${monster.id_hex} ${monsterNameDecodedText(monster)} ${monster.graphic_id} ${monster.graphic_id_hex}`.toLowerCase().includes(q)
  );
  const numberColumn = (field, label) => ({
    key: field,
    label,
    align: "right",
    width: 78,
    cell: monster => monsterNumberInput(monster, field),
  });
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: monster => handleMarkup(monsterUid(monster))},
    {key: "name", label: "名称", sticky: true, width: 132,
      cell: monster => monsterNameControl(monster)},
    // **形象与调色板是一个字段，不是两列。** NES 上图形只有 2 bit 像素索引，颜色
    // 全由 palette 决定——两者必须成对才画得出一个画面。所以一格里两个下拉、
    // 一张预览；拆成两列就会各画一张同一个东西的图。候选与色块来自已注册的
    // monster-graphic / monster-palette 组件，这里不另造。
    {key: "graphic", label: "形象与调色板", width: 300, mono: true,
      cell: monster => monsterFigureFieldMarkup(monster.id)},
    numberColumn("hp", "HP"),
    {key: "attack", label: "攻击", width: 174,
      cell: monster => `<div class="monster-attribute-group">${monsterNumberInput(monster, "attack")}
        <small>码 ${monsterDerivedValue(monster, "attack_code_hex")} · 附加 ${monsterDerivedValue(monster, "attack_aux")}</small></div>`},
    {key: "defense", label: "防御", width: 174,
      cell: monster => `<div class="monster-attribute-group">${monsterNumberInput(monster, "defense")}
        <small>码 ${monsterDerivedValue(monster, "defense_code_hex")} · 附加 ${monsterDerivedValue(monster, "defense_aux")}</small></div>`},
    numberColumn("speed", "速度"),
    numberColumn("experience", "经验"),
    numberColumn("gold", "金钱"),
    {key: "drop", label: "掉落", width: 210,
      cell: monster => monsterDropCell(monster)},
    {key: "attack_visual", label: "攻击特效", width: 250,
      cell: monster => monsterAttackVisualCell(monster)},
    {key: "flags", label: "标志", mono: true, width: 64,
      cell: monster => monsterDerivedValue(monster, "flags_hex")},
    {key: "zones", label: "遇敌区", align: "right", width: 64,
      cell: monster => encounterZoneCell(Number(monster.id))},
    // 「出现编队」原来只在另一张 131 行的怪物表里。遇敌区和编队是两件事：
    // 前者是「在哪片地上遇到」，后者是「遇到时和谁一起出现」。
    {key: "formations", label: "出现编队", width: 96,
      cell: monster => monsterFormationCell(monster)},
    {key: "name_record", label: "名称记录", mono: true, align: "right", width: 82,
      cell: monster => esc(monster.name_text_record_id)},
    {key: "reset-original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: monster => `<span data-monster-reset-object="${esc(monsterUid(monster))}"></span>`},
  ];
  return `<form id="monster-editor">
      <style>#monster-editor .monster-attribute-group {display:grid;gap:3px}
        #monster-editor .monster-attribute-group small {white-space:nowrap;opacity:.75}</style>
      ${monsterEditorToolbar()}
      <div class="data-filter">
        <span>⌕</span>
        <input id="monster-filter" value="${esc(state.monsterFilter)}" placeholder="按怪物 ID、已知名称或图形 ID 过滤…">
      </div>
      ${dataTable({
        columns,
        rows: visible,
        rowId: monster => monster.id,
        recordRoute: monster => `monsters/${monster.id}`,
        total: monsters.length,
        virtualKey: 'monsters',
      })}
    </form>`;
}

function monsterUid(monster) {
  return `monster:${Number(monster.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function monsterNumberInput(monster, field, reset = false) {
  const metadata = field === "speed" ? {multiplier: 1} : monster[field];
  const multiplier = Number(metadata?.multiplier || 1);
  return `<span data-monster-number-object="${esc(monsterUid(monster))}"
    data-monster-field="${esc(field)}" data-monster-step="${multiplier}"
    data-monster-max="${255 * multiplier}" data-monster-field-reset="${reset}"></span>`;
}

/** 记录页主表显示字段值，物理位置由共用折叠区承载。 */
export function renderMonsterRecord(monsters, monsterId) {
  const index = monsters.findIndex(monster => Number(monster.id) === Number(monsterId));
  if (index < 0) return null;
  const monster = monsters[index];
  const displayName = monsterNameDecodedText(monster)
    || `怪物 ${monster.id_hex}`;
  const uid = monsterUid(monster);
  const zones = zonesByMonster().get(Number(monster.id)) || [];
  const valueFor = row => {
    const fieldKey = row.fieldKey || row.key;
    if (!monsterRecordFields.some(([key]) => key === fieldKey)) return null;
    const field = {experience_code: "experience", gold_code: "gold"}[fieldKey] || fieldKey;
    return `${monsterNumberInput(monster, field, true)}${
      ["attack_code", "defense_code", "experience", "gold"].includes(field)
        ? `<small data-monster-attribute-detail="${esc(field)}"></small>` : ""}`;
  };
  const addressTable = fieldAddressTable({
    uid,
    fields: monsterRecordFields,
    valueFor,
    showStatus: false,
    pageStatus: {
      selection: uid,
      dirty: "",
    },
  });
  const page = recordPage({
    title: displayName,
    uid,
    backLabel: "怪物属性",
    prevId: index > 0 ? monsters[index - 1].id : null,
    nextId: index < monsters.length - 1 ? monsters[index + 1].id : null,
    panels: [
      panel("字段", `${addressTable}${monster.drop?.participates
        ? `<div data-monster-object-editor="${esc(uid)}"></div>` : ""}`, {wide: true, flat: true}),
      panel("基本信息", fields([
        ["游戏索引 ID", `<span class="mono">${esc(monster.id_hex)}</span>`],
        ["图形 ID", esc(monster.graphic_id_hex)],
        ["名称文本记录", `#${esc(monster.name_text_record_id)}`],
        ["名称", monsterNameControl(monster)],
      ])),
      panel("战斗图形", `<div class="record-preview">${monsterFigureCanvas({
        enemyId: monster.id,
        scale: 4,
        label: monster.name || "",
      })}</div>`),
      monsterRuntimePanel(monster),
      panel("随机遇敌区", zones.length
        ? fields(zones.map(zone => [
          hex(zone.zoneId, 2), "出现",
        ]))
        : `<div class="record-preview"><span class="resource-empty">未出现在任何遇敌区</span></div>`),
      panel("引用关系", fields([
        ["被引用数", resourceForwardReferenceCell(uid)],
      ])),
      // 行动清单与发射点是一件事的两面，放在同一场战斗里编：发射点是相对怪物占格
      // 的像素偏移，炮口一类本来就落在图形之外，单看立绘判断不了那个点在哪；而
      // 「这一槽做什么、说什么话、用哪条特效」正是选哪个发射点的依据。
      panel("攻击行动与发射点", monsterAttackAnchorMarkup(monster.id), {wide: true}),
    ],
  });
  return `<form id="monster-editor">
    ${monsterEditorToolbar()}
    ${page}
  </form>`;
}

/**
 * 攻击与特效的运行时事实。
 *
 * 这些原来只在「怪物攻击与战斗测试」那张 131 行的表里，一行铺开十几列——可它们
 * 逐怪物、又只在看单只时才有用，放回怪物记录页。选择槽/打包值/重复类是行动选择
 * 的三个码，对象动作/音效/CHR 页是那条特效跑起来会用到的东西。
 */
function monsterRuntimePanel(monster) {
  const profile = monsterAttackProfile(monster.id);
  if (!profile) {
    return panel("攻击运行时", `<div class="record-preview"><span
      class="resource-empty">这只怪物没有攻击档案</span></div>`);
  }
  const list = values => (values || []).map(value => hex(Number(value), 2)).join(" / ") || "—";
  return panel("攻击运行时", fields([
    ["共享攻击特效", profile.visual_resource
      ? `<button class="resource-inline-link" type="button"
        data-resource-target="${esc(profile.visual_resource)}">${
          esc(profile.visual_code_hex)}</button>`
      : "—"],
    ["选择槽", profile.selector_resource
      ? `<button class="resource-inline-link" type="button"
        data-resource-target="${esc(profile.selector_resource)}">${
          esc(profile.selector_id_hex)}</button>`
      : "—"],
    ["打包值", `<span class="mono">${esc(profile.selector_packed_hex || "—")}</span>`],
    ["重复类", `<span class="mono">${esc(profile.repeat_counter_class_hex || "—")}</span>`],
    ["战斗对象动作", `<span class="mono">${list(profile.object_actions)}</span>`],
    ["音效", esc((profile.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
  ]));
}

/** 「遇到它时是哪一组编队」。档案里已经算好，这里只把引用按钮铺出来。 */
function monsterFormationCell(monster) {
  const profile = monsterAttackProfile(monster.id);
  const uids = profile?.encounter_formation_resources || [];
  if (!uids.length) return "—";
  return uids.map((uid, index) => `<button class="resource-inline-link" type="button"
    data-resource-target="${esc(uid)}">${esc(
      Number(profile.encounter_formation_ids[index])
        .toString(16).toUpperCase().padStart(2, "0"))}</button>`).join("");
}

// 「这只怪物会在哪些随机遇敌区出现」。和引用列同一个规矩：总表里只给条数。
// 最多的怪物出没于 15 个区，全铺出来这一列会比怪物名还宽；悬停可看具体是哪些区。
function encounterZoneCell(monsterId) {
  const zones = zonesByMonster().get(monsterId) || [];
  if (!zones.length) return `<span class="resource-empty">—</span>`;
  const list = zones.map(z => hex(z.zoneId, 2)).join("\n");
  return `<span class="resource-reference-count" title="${esc(list)}">${zones.length}</span>`;
}


function updateMonsterEditorState(message = "") {
  state.monsterMessage = message;
  const status = $("#monster-save-state");
  const error = monsterNameDraftError();
  if (status) {
    const label = monsterEditorStatus();
    status.textContent = label;
    status.hidden = !label;
    status.classList.toggle("invalid", Boolean(error));
  }
}

export function bindMonsterEditor() {
  const form = $("#monster-editor");
  if (!form || form.dataset.monsterFieldObjects) return;
  form.dataset.monsterFieldObjects = "loading";
  form.addEventListener("submit", event => event.preventDefault());
  monsterNameEditors = bindFixedTextEditors(form, {
    reuse: monsterNameEditors,
    onState: () => updateMonsterEditorState(),
  });
  const catalogPromise = loadEntityCatalog();
  const objects = new Map();
  const objectFor = async handle => {
    if (!objects.has(handle)) objects.set(handle, (async () => {
      const catalog = await catalogPromise;
      const [attributes, rewards] = await Promise.all(["attributes", "rewards"].map(
        facetId => entityFacetFields(db, handle, facetId, {catalog})));
      const object = attributes.objects.find(candidate =>
        attributes.fields.some(field => candidate.fields.includes(field)));
      if (!object) throw new TypeError(`怪物切面缺少字段对象：${handle}`);
      const declared = new Set([...attributes.fields, ...rewards.fields]);
      if (object.fields.some(field => !declared.has(field)))
        throw new TypeError(`怪物字段未归入切面：${handle}`);
      return object;
    })());
    return objects.get(handle);
  };
  let mountedOnce = false;
  const mount = async () => {
    if (mountedOnce) monsterNameEditors = bindFixedTextEditors(form, {reuse: monsterNameEditors,
      onState: () => updateMonsterEditorState()});
    mountedOnce = true;
    if (!form.isConnected) return;
    const targets = [...form.querySelectorAll(
      "[data-monster-number-object], [data-monster-drop-object], [data-monster-reset-object], [data-monster-object-editor]",
    )].map(host => host.dataset.monsterNumberObject || host.dataset.monsterDropObject
      || host.dataset.monsterResetObject || host.dataset.monsterObjectEditor);
    await Promise.all([...new Set(targets)].map(objectFor));
    if (!form.isConnected) return;
    for (const host of form.querySelectorAll("[data-monster-number-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterNumberObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterNumberObject}`);
      mountFieldObjectNumber(host, object, host.dataset.monsterField, {
        min: 0, max: Number(host.dataset.monsterMax), step: Number(host.dataset.monsterStep),
        reset: host.dataset.monsterFieldReset === "true",
      });
    }
    if (form.querySelector('[data-monster-attribute-detail]'))
      await bindMonsterAttributeDetails(form, await objectFor(form.querySelector('[data-monster-number-object]').dataset.monsterNumberObject));
    await Promise.all([...form.querySelectorAll("[data-monster-drop-object]")].map(async host => {
      if (host.dataset.fieldMounted) return null;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterDropObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterDropObject}`);
      return mountFieldObjectSelect(host, object, "drop.item_id", {
        reset: false, itemCategories: ITEM_CATEGORIES,
      });
    }));
    for (const host of form.querySelectorAll("[data-monster-reset-object]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterResetObject);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterResetObject}`);
      mountFieldObjectReset(host, object);
    }
    for (const host of form.querySelectorAll("[data-monster-object-editor]")) {
      if (host.dataset.fieldMounted) continue;
      host.dataset.fieldMounted = "true";
      const object = await objectFor(host.dataset.monsterObjectEditor);
      if (!object) throw new TypeError(`怪物字段对象不存在：${host.dataset.monsterObjectEditor}`);
      const represented = [...form.querySelectorAll('[data-monster-number-object]')]
        .filter(control => control.dataset.monsterNumberObject === object.id)
        .map(control => control.dataset.monsterField);
      const suppressedFieldKeys = new Set(represented.map(name =>
        JSON.stringify([object.resourceId, object.id, name])));
      await mountFieldObjectEditor(host, object, {suppressedFieldKeys, compactIdentity: true, stacked: true});
    }
    await monsterNameEditors.ready;
    if (!form.isConnected) return;
    form.dataset.monsterFieldObjects = "ready";
    updateMonsterEditorState();
  };
  form.addEventListener("virtual-table-rows", () => {
    void mount().catch(error => updateMonsterEditorState(`字段绑定失败：${error?.message || error}`));
    form.querySelectorAll("animated-resource-picker[data-monster-list-attack-visual]")
      .forEach(picker => configureAttackVisualPicker(picker, {
        value: picker.dataset.visualCode, preview: false,
      }));
  });
  void mount().catch(error => updateMonsterEditorState(`字段绑定失败：${error?.message || error}`));
  form.querySelectorAll("animated-resource-picker[data-monster-list-attack-visual]")
    .forEach(picker => configureAttackVisualPicker(picker, {
      value: picker.dataset.visualCode, preview: false,
    }));
}

/** 怪物记录页的攻击特效组件走记录页统一收尾入口。 */
export function bindMonsterRecord() {
  void bindMonsterAttackEffectPreviews(document).catch(error => updateMonsterEditorState(`攻击特效读取失败：${error.message}`));
}
