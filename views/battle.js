// @editor-module 战斗视觉与战斗测试草稿
//
// 来源：拆分前 engine/editor/app.js 第 7525-7792 行。

import {editorLog} from "../core/editor-log.js";
import {$, esc, hex} from "../core/dom.js";
import {handleMarkup} from '../ui/handle.js';
import {visualUrl} from "../core/package-io.js";
import {db} from "../core/project-db.js";
import {audioCommandLabel, recordUid, resourceForwardReferenceCell, resourceLabel} from "../core/resource-index.js";
import {state} from "../core/state.js";
import {elementTree} from '../ui/element-tree.js';
import {battleFirstMonsterId, battleModeForPendingEventFlag} from "../core/battle-mode.js";
import {battleSimulationMarkup} from "../ui/battle-simulation-player.js";
import {datasetFacts} from "../ui/shell.js";
import {nesPalette} from "../render/nes.js";
import {paletteSwatches} from "../ui/palette-swatches.js";
import {monsterFigureCanvas} from "../render/monster-figure.js";
import {attackVisualCanvas, battleActionCanvas} from "../render/weapon-effect-vm.js";
import {BATTLE_OBJECT_LAYOUT_MODULE_ID} from "../modules/battle/components.js";
import {scenePositionPickerMarkup} from "../modules/scene/components.js";
import {
  hydrateModuleComponents,
  prepareModuleComponent,
  renderModuleComponent,
} from "../ui/module-components.js";
import {fields, panel, recordPage} from "../ui/record.js";
import {physicalLocationMarkup} from "../ui/physical-location.js";
import {dataTable, resetToOriginalButton} from "../ui/table.js";
import {copyEditorDraft} from "../views/data/monsters.js";
import {buildLogButton} from "../core/rom-build.js";
import {inPageTabs} from "../ui/in-page-tabs.js";
import {screenWorkbench} from "../ui/screen-workbench.js";
import "./battle-effects/attack-visual-authoring.js";
import "../modules/monster/components.js";
import {
  hydrateAttackVisualSegmentEditors,
  renderAttackVisualSegmentCell,
  renderAttackVisualSegmentEditor,
} from "./battle-effects/attack-visual-segment-editor.js";
import {attackVisualTimelineMarkup} from "./battle-effects/attack-visual-timeline.js";

let battleTestRootSelected = true;
export function setBattleTestRootSelected(selected) {
  battleTestRootSelected = Boolean(selected);
}

const ATTACK_PREVIEW_SEGMENTS = Object.freeze([
  ["launch", "发射"],
  ["trajectory", "弹道"],
  ["impact", "击中"],
  ["full", "完整"],
]);

const ATTACK_EFFECT_LIST_ELEMENT = "attack-effect-list";
const BATTLE_OBJECT_LAYOUT_LIST_ELEMENT = "battle-object-layout-list";

function normalizedAttackEffectFilter(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

/** Apply one catalog's local filter without changing either of the other two lists. */
function filterAttackEffectList(root, query) {
  if (!root?.querySelectorAll) throw new TypeError("attack effect list root is required");
  const wanted = normalizedAttackEffectFilter(query);
  const rows = [...root.querySelectorAll("tbody tr[data-row-id]")];
  const shown = rows.filter(row => {
    const searchable = normalizedAttackEffectFilter(
      `${row.dataset.rowId || ""} ${row.textContent || ""}`,
    );
    row.hidden = Boolean(wanted) && !searchable.includes(wanted);
    return !row.hidden;
  });
  root.dataset.filteredCount = String(shown.length);
  const status = root.querySelector("[data-attack-effect-filter-status]");
  if (status) {
    status.dataset.visibleCount = String(shown.length);
    status.textContent = `${shown.length} / ${rows.length} 个匹配`;
  }
  const locate = root.querySelector("[data-attack-effect-locate]");
  if (locate) locate.disabled = shown.length === 0;
  return shown;
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ATTACK_EFFECT_LIST_ELEMENT)) {
  globalThis.customElements.define(ATTACK_EFFECT_LIST_ELEMENT, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.attackEffectFilterBound === "1") return;
      if (this.dataset.attackEffectList === "primary") {
        void hydrateAttackVisualSegmentEditors(this).catch(error => {
          this.dataset.attackVisualSegmentEditorsState = "error";
          this.dataset.attackVisualSegmentEditorsError = String(
            error?.message || error,
          );
        });
      }
      const form = this.querySelector("[data-attack-effect-filter-form]");
      const input = this.querySelector("[data-attack-effect-filter]");
      if (!form || !input) return;
      this.dataset.attackEffectFilterBound = "1";
      input.addEventListener("input", () => filterAttackEffectList(this, input.value));
      form.addEventListener("submit", event => {
        event.preventDefault();
        filterAttackEffectList(this, input.value)[0]?.click();
      });
      filterAttackEffectList(this, input.value);
    }
  });
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(BATTLE_OBJECT_LAYOUT_LIST_ELEMENT)) {
  globalThis.customElements.define(BATTLE_OBJECT_LAYOUT_LIST_ELEMENT, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.battleObjectLayoutListBound === "1") return;
      this.dataset.battleObjectLayoutListBound = "1";
      void loadBattleObjectLayoutList(this).catch(error => {
        editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
        if (!this.isConnected) return;
        this.dataset.layoutLoadState = "error";
        this.innerHTML = `<p class="resource-empty" data-battle-object-layout-list-error>${esc(
          error?.message || error,
        )}</p>`;
      });
    }
  });
}

function byteUid(prefix, value) {
  return `${prefix}:${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
}

function attackVisualUid(item) {
  return byteUid("attack-visual", item.visual_code);
}

function effectStreamUid(item) {
  return byteUid("effect-stream", item.effect_code);
}

function attackScriptUid(space, item) {
  if (space === "auxiliary") {
    return byteUid("attack-visual-aux-script", item.id);
  }
  return byteUid("attack-visual", item.id);
}

// 脚本和攻击视觉会引用同一个发布资源。记录页身份必须保留记录类别，
// 否则主脚本 $00 会被同号攻击视觉记录截获；资源 UID 仍只用于地址、引用与 owner。
function attackScriptRecordId(space, item) {
  return `${space === "auxiliary" ? "attack-visual-aux-script" : "attack-script"}:${
    Number(item.id).toString(16).toUpperCase().padStart(2, "0")
  }`;
}

function battleActionUid(item) {
  return byteUid("battle-action", item.id);
}

function attackEffectListMarkup({
  kind,
  className,
  rows,
  columns,
  rowId,
  recordRoute,
  publishedCount,
  total,
  placeholder,
  extraAttributes = "",
}) {
  return `<${ATTACK_EFFECT_LIST_ELEMENT} class="${esc(className)}"
    style="display:block" data-attack-effect-list="${esc(kind)}"
    data-published-count="${Number(publishedCount)}"
    data-filtered-count="${rows.length}" ${extraAttributes}>
    <form class="data-filter" data-attack-effect-filter-form>
      <span>筛选 / 定位</span>
      <input type="search" autocomplete="off" data-attack-effect-filter
        aria-label="筛选${esc(kind)}攻击特效记录" placeholder="${esc(placeholder)}">
      <button class="button ghost" type="submit" data-attack-effect-locate title="首个匹配" aria-label="首个匹配">↗</button>
      <small data-attack-effect-filter-status data-visible-count="${rows.length}">${
        rows.length
      } / ${rows.length} 个匹配</small>
    </form>
    ${dataTable({columns, rows, rowId, recordRoute, total})}
  </${ATTACK_EFFECT_LIST_ELEMENT}>`;
}

function handleCodeList(handles, dataAttribute) {
  const values = [...new Set((handles || []).map(String).filter(Boolean))];
  if (!values.length) return "—";
  return `<div class="record-resource-links">${values.map(handle =>
    `<code data-${dataAttribute}="${esc(handle)}">${esc(handle)}</code>`
  ).join("")}</div>`;
}

function battleObjectLayoutSelectionMarkup(entry, effectAssets) {
  const handle = String(entry?.handle || "");
  const actionHandles = [...new Set(
    (entry?.incoming_action_handles || []).map(String).filter(Boolean),
  )];
  const actionSet = new Set(actionHandles);
  const primaryHandles = attackEffectCompositionRoots(effectAssets, closure =>
    (closure.object_actions || []).some(action =>
      actionSet.has(byteUid("battle-action", action))
    )
  );
  return `<div data-attack-effect-preview="layout" data-layout-handle="${esc(handle)}">
    ${renderModuleComponent(BATTLE_OBJECT_LAYOUT_MODULE_ID, "preview", {entry, handle})}
    ${fields([["原点", `${esc(entry.fields?.origin?.x_quarter_tiles ?? "—")}, ${
      esc(entry.fields?.origin?.y_quarter_tiles ?? "—")} 个 1/4 tile`]])}
    ${physicalLocationMarkup({uid: handle, rows: entry.source ? [{label: "布局", address: entry.source}] : []})}
    <div data-attack-effect-usage="layout" data-action-count="${actionHandles.length}"
      data-primary-count="${primaryHandles.length}">${fields([
        ["动作入口", handleCodeList(actionHandles, "layout-action")],
        ["主脚本组合", handleCodeList(primaryHandles, "layout-primary")],
      ])}</div>
  </div>`;
}

async function loadBattleObjectLayoutList(root) {
  root.dataset.layoutLoadState = "loading";
  const [prepared, ownerDocument] = await Promise.all([
    prepareModuleComponent(
      BATTLE_OBJECT_LAYOUT_MODULE_ID,
      "reference",
      {label: "效果对象共享布局"},
    ),
    db.getResourceDocument(BATTLE_OBJECT_LAYOUT_MODULE_ID, null),
  ]);
  if (!root.isConnected) return;
  const candidates = Array.isArray(prepared.entries) ? prepared.entries : [];
  const entries = Array.isArray(ownerDocument?.records) ? ownerDocument.records : [];
  if (prepared.error || !candidates.length || !entries.length) {
    throw new Error(prepared.error || "battle-object-layout 的发布候选为空");
  }
  if (candidates.length !== entries.length) {
    throw new Error("battle-object-layout owner 正文与引用候选数量不一致");
  }
  const expectedCount = Number(root.dataset.expectedCount);
  if (Number.isInteger(expectedCount) && expectedCount !== entries.length) {
    throw new Error(
      `battle-object-layout owner 候选数量不一致：${entries.length}/${expectedCount}`,
    );
  }
  const initialHandle = String(entries[0].handle || "");
  root.dataset.publishedCount = String(entries.length);
  root.innerHTML = `${renderModuleComponent(
    BATTLE_OBJECT_LAYOUT_MODULE_ID,
    "reference",
    {...prepared, value: initialHandle, label: "效果对象共享布局"},
  )}<div class="wide-card weapon-effect-note" data-battle-object-layout-selection>${
    battleObjectLayoutSelectionMarkup(
      entries[0], state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {},
    )
  }</div>`;
  await hydrateModuleComponents(root);
  if (!root.isConnected) return;

  const picker = root.querySelector("[data-module-reference-picker]");
  const options = [...root.querySelectorAll("[data-reference-picker-option]")];
  const selection = root.querySelector("[data-battle-object-layout-selection]");
  if (!picker || !selection || options.length !== entries.length) {
    throw new Error("battle-object-layout owner 选择器未完整水合");
  }
  root.addEventListener("module-reference-change", event => {
    const entry = entries.find(candidate =>
      String(candidate.handle) === String(event.detail?.value)
    );
    if (!entry) return;
    selection.innerHTML = battleObjectLayoutSelectionMarkup(
      entry,
      state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {},
    );
  });
  root.dataset.layoutLoadState = "ready";
}

function battleFigureUid(item) {
  return item.figure_kind === "monster"
    ? byteUid("monster-figure", item.id)
    : item.resource_id;
}

function monsterPaletteMarkup(item) {
  return (item.palettes || []).map((palette, paletteIndex) =>
    `<div class="monster-palette-line"><small>P${paletteIndex}</small>${
      paletteSwatches(palette, {className: "palette-swatches is-wide"})
    }<span>${(item.palette_ids_hex || [])[paletteIndex] || ""}</span></div>`).join("");
}

function attackEffectSegmentPreview(item, label, segment, segmentLabel) {
  return item.preview_status === "opaque-preserved-not-rendered"
    ? `<span class="resource-empty">未引用不透明槽</span>`
    : `<figure class="attack-effect-segment"
      data-attack-visual-segment-card="${segment}">
      <figcaption>${segmentLabel}</figcaption>
      ${attackVisualCanvas({
        visualCode: item.visual_code,
        play: true,
        segment,
        label: `${label} · ${segmentLabel}`,
      })}
      <small data-attack-visual-status>解析中…</small>
    </figure>`;
}

function attackScriptCommandSummary(script) {
  const commands = (script?.commands || []).filter(command => !command.marker);
  if (!commands.length) return "";
  const names = commands.slice(0, 4).map(command => command.name || command.opcode_hex);
  return `${names.join(" → ")}${commands.length > names.length ? " …" : ""}`;
}

function battleObjectLayoutPreview(item) {
  if (item.available === false) {
    return `<span class="module-reference-data-preview"
      data-battle-object-layout-preview="missing">
      <b>未使用的动作槽</b><small>发布记录明确标为指针空洞</small>
    </span>`;
  }
  const columns = Number(item.columns);
  const rows = Number(item.rows);
  const width = Number(item.width);
  const height = Number(item.height);
  const knownShape = [columns, rows, width, height].every(Number.isFinite);
  return `<span class="module-reference-data-preview"
    data-battle-object-layout-preview="${knownShape ? "published" : "missing"}"
    data-layout-columns="${knownShape ? columns : "missing"}"
    data-layout-rows="${knownShape ? rows : "missing"}">
    <b>${knownShape ? `${columns}×${rows} 布局` : ""}</b>
    <small>${knownShape ? `${width}×${height}px` : ""}</small>
  </span>`;
}

const BATTLE_TEST_ENTRY_FIELDS = Object.freeze([
  "enabled",
  "repeatable",
  "scene_id",
  "x",
  "y",
  "state_flag",
  "encounter_id",
  "intro_text_record_id",
  "completed_text_record_id",
]);

export const BATTLE_TEST_ENTRY_RESET_KEY = "entry";

export function battleTestFormationResetKey(formationId) {
  const id = Number(formationId);
  if (!Number.isInteger(id)) throw new TypeError("formation id must be an integer");
  return `formation:${id}`;
}

export function battleTestFormation(document_, formationId) {
  if (!Array.isArray(document_?.formations)) {
    throw new Error("battle-test-point 编队文档不完整");
  }
  const id = Number(formationId);
  const formation = document_.formations.find(row => Number(row.id) === id);
  if (!formation || !Array.isArray(formation.slots) || formation.slots.length !== 4) {
    throw new Error(`battle-test-point 缺少编队 ${formationId}`);
  }
  return formation;
}

export function battleTestFormationDraft(formation) {
  return [...formation.slots].sort((a, b) => a.slot - b.slot).map(slot => ({
    monster_id: Number(slot.monster_id),
    count: Number(slot.count),
  }));
}

export const BATTLE_TEST_EMPTY_FORMATION_SLOT = "__empty__";

function renderBattleTestFormationControls(formationDraft, monsters = [], formationId) {
  return `<div class="table-wrap"><table class="battle-formation-slots">
    <thead><tr><th>槽</th><th>怪物</th><th>数量</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead>
    <tbody>${formationDraft.map((slot, index) => {
    const active = Number(slot.count) !== 0;
    const handle = `encounter-formation:${Number(formationId).toString(16).toUpperCase().padStart(2, "0")}:slot:${index}`;
    const controlMarkup = `<input type="hidden" data-battle-formation-slot="${index}" data-battle-formation-field="monster_id" data-battle-empty-monster-id="${Number(slot.monster_id)}" value="${active ? Number(slot.monster_id) : BATTLE_TEST_EMPTY_FORMATION_SLOT}">`;
    return `<tr><td>${index + 1}</td><td class="field-object-linked-reference">${renderModuleComponent("monster-profile", "reference", {
      entries: monsters, value: active ? slot.monster_id : BATTLE_TEST_EMPTY_FORMATION_SLOT,
      emptyValue: BATTLE_TEST_EMPTY_FORMATION_SLOT, label: "怪物", controlMarkup,
    })}</td><td><input type="number" min="0" max="9" aria-label="槽 ${index + 1} 数量" data-battle-formation-slot="${index}" data-battle-formation-field="count" value="${slot.count}" ${active ? "" : "disabled"}></td><td>${resetToOriginalButton(handle, {title: "重置这一槽怪物与数量；其他槽和测试入口保留"})}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

/** 编队 label 是提取期快照；编辑器必须按当前槽和当前怪物名现算。 */
export function battleTestFormationDisplayLabel(formation, monsters = []) {
  const names = new Map(monsters.map(monster => [
    Number(monster.id),
    monster.name || `怪物 ${hex(monster.id, 2)}`,
  ]));
  const groups = (formation?.slots || []).flatMap(slot => {
    const count = Number(slot.count);
    if (!Number.isInteger(count) || count < 1) return [];
    const monsterId = Number(slot.monster_id);
    return [`${names.get(monsterId) || `怪物 ${hex(monsterId, 2)}`} ×${count}`];
  });
  return groups.join(" / ") || "无有效怪物";
}

/** `selected_formation` is a derived copy, never an independent authority. */
export function rebuildBattleSelectedFormation(document_) {
  const formation = battleTestFormation(document_, document_.encounter_id);
  if (Object.getOwnPropertyDescriptor(document_, "selected_formation")?.get) {
    Object.defineProperty(document_, "selected_formation", {enumerable: true, configurable: true,
      get: () => battleTestFormation(document_, document_.encounter_id)});
  } else document_.selected_formation = copyEditorDraft(formation);
  return document_.selected_formation;
}

export function battleTestDraftFromDocument(configuration) {
  const selected = battleTestFormation(configuration, configuration.encounter_id);
  return {
    table_sha256: configuration.writeback_state?.current_sha256 || "",
    enabled: Boolean(configuration.enabled),
    repeatable: configuration.repeatable !== false,
    scene_id: Number(configuration.scene_id || 0),
    x: Number(configuration.x || 0),
    y: Number(configuration.y || 0),
    state_flag: Number(configuration.state_flag || 0),
    encounter_id: Number(configuration.encounter_id || 0),
    intro_text_record_id: Number(configuration.intro_text_record_id || 0),
    completed_text_record_id: Number(configuration.completed_text_record_id || 0),
    formation: battleTestFormationDraft(selected),
  };
}

function battleTestEntryResetSelectors() {
  return BATTLE_TEST_ENTRY_FIELDS.map(field => ({
    kind: "path",
    path: ["document", field],
  }));
}

function battleTestFormationResetSelector(formationId) {
  return {
    kind: "item",
    collectionPath: ["document", "formations"],
    identityKey: "id",
    identityValue: Number(formationId),
  };
}


function selectedEntryFields(value) {
  return Object.fromEntries(BATTLE_TEST_ENTRY_FIELDS.map(field => [
    field,
    value?.[field],
  ]));
}

export function battleTestEntryLocalDirty(draft, baseline) {
  return JSON.stringify(selectedEntryFields(draft)) !==
    JSON.stringify(selectedEntryFields(baseline));
}

export function battleTestFormationLocalDirty(draft, document_) {
  if (!draft) return false;
  const saved = battleTestFormation(document_, draft.encounter_id);
  return JSON.stringify(draft.formation) !==
    JSON.stringify(battleTestFormationDraft(saved));
}

/** Fail closed before an entry reset would hide an invalid local formation edit. */
export function battleTestEntryResetBlockedReason(draft, document_, baseDocument) {
  if (!draft) return "战斗测试草稿不可用，请刷新页面";
  const targetFormationId = Number(baseDocument?.encounter_id);
  if (!Number.isInteger(targetFormationId)) {
    return "battle-test-point 导入 original 的 encounter_id 无效";
  }
  if (targetFormationId === Number(draft.encounter_id)) return null;
  if (!battleTestFormationLocalDirty(draft, document_)) return null;
  return "入口 Original 会切换当前编队；请先修正该编队，或先用“当前编队 Reset / Original”处理当前编辑";
}

/** Restore only entry fields in the local draft; keep the active formation draft. */
export function battleTestDraftAfterEntryReset(draft, document_) {
  const next = copyEditorDraft(draft);
  const previousFormationId = Number(next.encounter_id);
  for (const field of BATTLE_TEST_ENTRY_FIELDS) next[field] = document_[field];
  if (Number(next.encounter_id) !== previousFormationId) {
    next.formation = battleTestFormationDraft(
      battleTestFormation(document_, next.encounter_id),
    );
  }
  return next;
}

/** Restore only the selected formation draft; entry-field drafts remain intact. */
export function battleTestDraftAfterFormationReset(draft, document_, formationId) {
  const next = copyEditorDraft(draft);
  if (Number(next.encounter_id) !== Number(formationId)) return next;
  next.formation = battleTestFormationDraft(
    battleTestFormation(document_, formationId),
  );
  return next;
}

/** Merge persisted Original state with the current local edit for both controls. */
export function updateBattleTestOriginalControls(root, {
  persistedStates = new Map(),
  localStates = new Map(),
  busy = false,
} = {}) {
  if (!root?.querySelectorAll) return;
  for (const control of root.querySelectorAll("[data-battle-original-control]")) {
    const key = control.dataset.battleOriginalControl;
    const persistedDirty = persistedStates instanceof Map
      ? persistedStates.get(key) : persistedStates[key];
    const localDirty = (localStates instanceof Map
      ? localStates.get(key) : localStates[key]) === true;
    const known = typeof persistedDirty === "boolean";
    const dirty = localDirty || persistedDirty === true;
    control.classList.toggle("is-persisted-dirty", persistedDirty === true);
    control.classList.toggle("is-local-dirty", localDirty);
    const button = control.querySelector("[data-reset-to-original]");
    if (!button) continue;
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle("dirty", dirty);
    button.disabled = busy || !dirty || (!known && !localDirty);
    button.title = persistedDirty
      ? "恢复原值：只恢复这一项"
      : localDirty
        ? "恢复原值：保留另一项的编辑"
        : known
          ? "恢复原值：当前值与原值一致"
          : "恢复原值：正在读取原值状态…";
  }
}

function ensureBattleTestView(configuration) {
  if (state.battleTestView) return;
  state.battleTestView = battleTestDraftFromDocument(configuration);
  state.battleTestPersistedView = copyEditorDraft(state.battleTestView);
}

export function battleTestViewPending() {
  return Boolean(state.battleTestView && state.battleTestPersistedView) &&
    JSON.stringify(state.battleTestView) !== JSON.stringify(state.battleTestPersistedView);
}

export function battleTestDraftError() {
  const draft = state.battleTestView;
  if (!draft) return "战斗测试记录不可用，请刷新页面";
  const ranges = {scene_id: 0xEF, x: 0xFF, y: 0xFF, state_flag: 0xFF,
    encounter_id: 0x38, intro_text_record_id: 0xFF, completed_text_record_id: 0xFF};
  for (const [field, maximum] of Object.entries(ranges)) {
    if (!Number.isInteger(draft[field]) || draft[field] < 0 || draft[field] > maximum) {
      return `${field} 必须是 0–${maximum} 的整数`;
    }
  }
  return battleTestFormationDraftError(draft.formation);
}

export function battleTestFormationDraftError(formationDraft) {
  if (!Array.isArray(formationDraft) || formationDraft.length !== 4) {
    return "编队必须正好有四个槽";
  }
  let total = 0;
  let emptySeen = false;
  for (const [index, slot] of formationDraft.entries()) {
    if (!Number.isInteger(slot.monster_id) || slot.monster_id < 0 || slot.monster_id > 130) return `槽 ${index + 1} 的怪物 ID 无效`;
    if (!Number.isInteger(slot.count) || slot.count < 0 || slot.count > 9) return `槽 ${index + 1} 的数量必须是 0–9`;
    if (!slot.count) emptySeen = true;
    else if (emptySeen) return "有效编队槽必须连续排列在空槽之前";
    total += slot.count;
  }
  if (total < 1 || total > 9) return "编队怪物总数必须是 1–9";
  return null;
}

export function renderBattleTestFormationInlineEditor(formationId) {
  const configuration = state.project.game_data?.battle_test;
  const monsters = state.project.game_data?.monsters?.records || [];
  const formation = battleTestFormation(configuration, formationId);
  const draft = battleTestFormationDraft(formation);
  const total = draft.reduce((sum, slot) => sum + Number(slot.count || 0), 0);
  const error = battleTestFormationDraftError(draft);
  return `<section class="scene-battle-trigger-action scene-battle-inline-editor"
      data-scene-battle-formation-editor data-formation-id="${Number(formationId)}">
    <div class="section-line"><h2>${handleMarkup(`encounter-formation:${Number(formationId).toString(16).toUpperCase().padStart(2, '0')}`)}</h2>
      <span class="scene-battle-formation-actions">
        <b data-scene-battle-formation-total>${total}</b> / 9 MONSTER SLOTS
        ${resetToOriginalButton("scene-formation", {title: "重置当前编队；其他编队和测试入口保留"})}
      </span>
    </div>
    <p class="scene-battle-formation-alert${error ? " invalid" : ""}"
      data-scene-battle-formation-status ${error ? "" : "hidden"}>${esc(error ? `无法自动保存：${error}` : "")}</p>
    ${renderBattleTestFormationControls(draft, monsters, formationId)}
  </section>`;
}

export function battleTestEditorStatus() {
  if (state.battleTestBuilding) return "正在生成新的 ROM…";
  if (state.battleTestMessage) return state.battleTestMessage;
  const error = battleTestDraftError();
  if (error) return `无法保存：${error}`;
  return "";
}

/**
 * 战斗测试入口。
 *
 * **这里不再列怪物。** 「怪物攻击与特效关联」那张 131 行的表逐怪物一行，和怪物表
 * 是同一批对象；两张表列同一批东西，改哪一张都得记得另一张。它已经并回怪物表
 * （出现编队一列）与怪物记录页（攻击运行时一栏）。
 */
function renderBattleProfiles() {
  const configuration = state.project.game_data?.battle_test || {};
  const monsters = state.project.game_data?.monsters?.records || [];
  ensureBattleTestView(configuration);
  const draft = state.battleTestView;
  const scenes = state.project.scenes?.editable_scenes || [];
  const formations = configuration.formations || [];
  const error = battleTestDraftError();
  const busy = state.battleTestBuilding;
  const entryLocalDirty = battleTestEntryLocalDirty(
    draft,
    state.battleTestPersistedView,
  );
  const battleMode = battleModeForPendingEventFlag(draft.state_flag, battleFirstMonsterId(draft.formation));
  const originalControl = (key, label, title, localDirty) =>
    `<span class="original-reset-control${localDirty ? " is-local-dirty" : ""}"
      data-battle-original-control="${esc(key)}">
      ${resetToOriginalButton(key, {
        title,
        disabled: busy || !localDirty,
        dirty: localDirty ? true : null,
      })}
    </span>`;
  const entryMarkup = `<div data-in-page-tabs-show="entry">
    <div class="section-line"><h2>入口</h2><span>
      <button class="resource-inline-link" type="button"
        data-resource-query="battle-test-point">battle-test-point</button>
      · 场景 $98 图块行为 $7C · 编队 <span data-battle-formation-reference>${hex(draft.encounter_id, 2)}</span></span></div>
      <div class="data-editor-toolbar">
        <p id="battle-test-save-state" class="${error ? "invalid" : ""}" ${battleTestEditorStatus() ? "" : "hidden"}>${esc(battleTestEditorStatus())}</p>
        ${originalControl(
          BATTLE_TEST_ENTRY_RESET_KEY,
          "入口 Reset / Original",
          "只恢复测试入口字段；持久化编队不变。若切换会隐藏当前编队编辑，将拒绝操作",
          entryLocalDirty,
        )}
        ${buildLogButton()}
      </div>
      <div class="character-number-grid">
        <label title="六点专用调查表第 $04 行"><small>启用</small><input type="checkbox" data-battle-test-field="enabled" ${draft.enabled ? "checked" : ""}></label>
        <label title="忽略完成位检查，仍在胜利后提交完成位"><small>重复战斗</small><input type="checkbox" data-battle-test-field="repeatable" ${draft.repeatable ? "checked" : ""}></label>
        ${scenePositionPickerMarkup({entries: scenes, sceneId: draft.scene_id,
          x: draft.x, y: draft.y, label: "目标场景", maxSceneId: 0xEF})}
        <label><small>完成位 ID</small><input type="number" min="0" max="255" data-battle-test-field="state_flag" value="${draft.state_flag}"></label>
        <div class="battle-test-text-field" data-battle-mode-readout title="由完成位决定">${battleMode?.label || "—"} · BGM ${battleMode ? esc(audioCommandLabel(battleMode.musicCommand)) : "—"} · 死亡效果 ${battleMode ? hex(battleMode.deathEffect, 2) : "—"}</div>
        <label><small>遭遇编队</small><select data-battle-test-field="encounter_id">${formations.map(formation => `<option value="${formation.id}" ${Number(formation.id) === draft.encounter_id ? "selected" : ""}>${hex(formation.id, 2)} · ${esc(battleTestFormationDisplayLabel(formation, monsters))}</option>`).join("")}</select></label>
        <button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${Number(draft.encounter_id).toString(16).toUpperCase().padStart(2, '0')}">编辑编队 ↗</button>
        <div class="battle-test-text-field"><small>战前文字</small><span data-battle-text-picker="intro_text_record_id"></span></div>
        <div class="battle-test-text-field"><small>完成文字</small><span data-battle-text-picker="completed_text_record_id"></span></div>
      </div>
    </div>`;
  return `<section class="battle-visual-panel" data-battle-panel="profiles">${screenWorkbench({
    namespace: "battle-test",
    className: "battle-test-workbench",
    treeScroll: 'body', inspectorScroll: 'body',
    treeTitle: null,
    treeMarkup: `${elementTree({showIcons: false,
      nodes: [{id: 'page-root', label: '战斗测试'}, {id: 'party', label: '友方', depth: 1}],
      selectedId: battleTestRootSelected ? 'page-root' : 'party',
      buttonAttributes: (node, selected) => ({'data-battle-test-node': node.id, 'aria-pressed': String(selected)}),
    })}<h3>敌方</h3><form id="battle-test-editor">${inPageTabs({
      id: "battle-test-enemy", label: "敌方配置", active: state.battleTestEnemyTab,
      tabs: [{id: "entry", label: "入口与文字"}, {id: "instances", label: "实例"}],
      content: `${entryMarkup}<div data-in-page-tabs-show="instances"
        data-battle-test-enemy-controls></div>`,
    })}</form>`,
    stageMarkup: `<div class="battle-test-preview screen-workbench-stage-content" data-battle-scene-preview-host aria-label="当前编队战斗预览">
      <h3>预览</h3>
      <p data-battle-test-preview-status aria-live="polite">正在绘制…</p>
      ${battleSimulationMarkup({singleAction: true})}
      <div data-battle-test-preview-controls></div>
      <div data-battle-test-composer-status></div>
    </div>`,
    inspectorTitle: null,
    inspectorMarkup: `<section data-battle-test-root-details${battleTestRootSelected ? '' : ' hidden'}><h3>战斗测试</h3>
      <nav class="page-global-info" aria-label="关联界面">
      <a class="editor-inline-link" href="?view=interfaceui&amp;interface=battle-messages">遭遇与行动提示 ↗</a>
      <a class="editor-inline-link" href="?view=interfaceui&amp;interface=battle-command-target">命令与目标画面 ↗</a>
    </nav></section><section data-battle-test-party-details${battleTestRootSelected ? ' hidden' : ''}>
      <h3>友方</h3><div data-battle-test-composer-controls data-battle-scene-control-dock>${inPageTabs({
      id: "battle-test-party", label: "友方配置", active: state.battleTestPartyTab,
      tabs: [{id: "party", label: "友方"}, {id: "actions", label: "行动"}],
      content: `<div data-in-page-tabs-show="party" data-battle-test-party-controls></div>
        <div data-in-page-tabs-show="actions" data-battle-test-action-controls></div>`,
    })}</div></section>`,
  })}</section>`;
}

export function renderBattle() {
  if (state.view === "battle-test") {
    return renderBattleProfiles();
  }
  const visuals = state.project.visuals || {};
  const weaponCatalog = visuals.weapon_effect_catalog || {};
  const effectAssets = weaponCatalog.asset_catalog_data || {};
  const primaryScripts = effectAssets.scripts?.primary || [];
  const auxiliaryScripts = effectAssets.scripts?.auxiliary || [];
  const effectStreams = effectAssets.effect_streams || [];
  const cleanAnimations = effectAssets.clean_animations || {};
  const allCleanClips = cleanAnimations.catalog || cleanAnimations.clips || [];
  const battleActions = effectAssets.battle_objects?.actions || [];
  const uniqueBattleObjectLayouts = Number(
    effectAssets.battle_objects?.unique_layout_records,
  );
  const enemyFigures = visuals.monsters?.enemies || [];
  const monsterGraphics = visuals.monsters?.graphics || [];
  const battleContext = (visuals.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94);
  const battleObjects = battleContext?.battle_objects || [];
  const monsterRecords = new Map(
    (state.project.game_data?.monsters?.records || [])
      .map(item => [Number(item.id), item])
  );
  const identifiedPartyFigures = battleObjects.filter(item => item.semantic_role);
  const anonymousBattleObjects = battleObjects.filter(item => !item.semantic_role);
  const figures = [
    ...identifiedPartyFigures.map(item => ({...item, figure_kind: "battle-object"})),
    ...enemyFigures.map(item => ({...item, figure_kind: "monster"})),
    ...anonymousBattleObjects.map(item => ({...item, figure_kind: "battle-object"})),
  ];
  if (!figures.length && !allCleanClips.length) {
    return ``;
  }
  const summary = visuals.summary || {};
  const weaponSummary = effectAssets.summary || {};
  const entry = visuals.entrypoints || {};
  const q = state.query.trim().toLowerCase();
  // The visual script namespace is shared.  Caller state ($70E6 bit 0 and
  // $0314 bit 0) selects direction/mirroring; it does not select a second set
  // of enemy assets.
  const cleanClips = allCleanClips;
  const shownCleanClips = cleanClips.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const shownAuxiliaryScripts = auxiliaryScripts.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const shownBattleActions = battleActions.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const attackEquipment = (state.project.game_data?.items?.records || [])
    .filter(item => item.attack_visual?.visual_code != null);
  const humanAttackEquipment = attackEquipment.filter(item =>
    String(item.category?.id || "").startsWith("human-")
  );
  const tankAttackEquipment = attackEquipment.filter(item =>
    String(item.category?.id || "").startsWith("tank-")
  );
  const attackColumns = [
    // **只留资源 ID。** 「游戏索引 ID」就是同一个编号的另一种写法，
    // 「名称」在 ROM 里根本不存在——游戏没有给特效命名这回事，
    // 那一列显示的是工具自己编的名字。分段保存工具条跟着资源 ID 走。
    {key: "resource_id", label: "资源 ID", width: 180,
      cell: item => {
        const uid = attackVisualUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    ...ATTACK_PREVIEW_SEGMENTS.map(([segment, label]) => ({
      key: `preview_${segment}`,
      label,
      width: 180,
      // 标签用资源 ID，不用 `effectName` 编出来的名字——ROM 里没有特效名。
      cell: item => renderAttackVisualSegmentCell(
        item,
        attackVisualUid(item),
        segment,
        label,
      ),
    })),
    // 重置单独成列，和装备表的「恢复」、怪物表的那一列一致。
    {key: "reset", label: "", title: "恢复原值", width: 36, reset: true,
      cell: item => renderAttackVisualSegmentEditor(item, attackVisualUid(item))},
    {key: "frames", label: "帧数", mono: true, align: "right", fit: true,
      fitValue: item => item.frame_count,
      cell: item => item.frame_count == null ? "—" : item.frame_count},
    {key: "phases", label: "阶段", grow: true,
      cell: item => (item.phases || []).map(esc).join(" / ") || "—"},
    {key: "status", label: "状态",
      cell: item => esc(item.preview_status || item.decode_status || "—")},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(attackVisualUid(item))},
  ];
  const streamColumns = [
    {key: "resource_id", label: "资源 ID", width: 150,
      cell: item => {
        const uid = effectStreamUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID",
      cell: item => `<b>${esc(item.effect_code_hex)}</b>`},
    {key: "name", label: "名称", width: 260,
      cell: item => `${esc(item.label || `效果对象流 ${item.effect_code_hex}`)}<small>${
        esc(item.storage_kind || "")
      }</small>`},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(effectStreamUid(item))},
    {key: "action", label: "ACTION", mono: true,
      cell: item => esc(item.action_code_hex || "运行时")},
    {key: "bytes", label: "原始字节", mono: true, width: 280,
      cell: item => esc(item.bytes_hex || "—")},
    {key: "asset", label: "资产", width: 260,
      cell: item => item.path
        ? `<code title="二进制只在构建阶段读取">${esc(item.path)}</code>`
        : `<span>RAM 构造</span>`},
  ];
  const scriptRows = [
    ...primaryScripts.map(item => ({space: "primary", item})),
    ...auxiliaryScripts.map(item => ({space: "auxiliary", item})),
  ];
  const scriptColumns = [
    {key: "resource_id", label: "资源 ID", width: 250,
      cell: row => {
        const uid = attackScriptUid(row.space, row.item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "namespace", label: "命名空间", mono: true,
      cell: row => row.space.toUpperCase()},
    {key: "game_id", label: "游戏索引 ID", mono: true,
      cell: row => esc(row.item.id_hex)},
    {key: "name", label: "名称", width: 210,
      cell: row => `<b>${row.space === "primary" ? "主攻击脚本" : "辅助攻击脚本"} ${
        esc(row.item.id_hex)
      }</b><small>${esc(row.item.decode_status || "decoded")}</small>`},
    {key: "commands", label: "命令", mono: true,
      cell: row => row.item.command_count},
    {key: "references", label: "底层资产引用",
      cell: row => resourceForwardReferenceCell(attackScriptUid(row.space, row.item))},
    {key: "asset", label: "资产",
      cell: row => `<a href="${visualUrl(
        `weapon-effects/${row.item.path.replace(/\.bin$/, ".json")}`,
      )}" target="_blank">JSON ↗</a>`},
  ];
  const auxiliaryColumns = [
    {key: "resource_id", label: "资源 ID", width: 250,
      cell: item => {
        const uid = attackScriptUid("auxiliary", item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID", mono: true, width: 110,
      cell: item => esc(item.id_hex)},
    {key: "commands", label: "命令流", width: 420,
      cell: item => `<b>${esc(item.command_count ?? (item.commands || []).length)} 条</b><small>${
        esc(attackScriptCommandSummary(item))
      }</small>`},
    {key: "status", label: "状态", width: 110,
      cell: item => esc(item.decode_status || "decoded")},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(attackScriptUid("auxiliary", item))},
  ];
  const battleActionColumns = [
    {key: "resource_id", label: "资源 ID",
      cell: item => {
        const uid = battleActionUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID", mono: true,
      cell: item => esc(item.id_hex)},
    {key: "status", label: "状态",
      cell: item => item.available === false ? "指针空洞" : "可用"},
    {key: "layout", label: "布局预览", width: 260,
      cell: battleObjectLayoutPreview},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(battleActionUid(item))},
  ];
  return `
    <section class="battle-visual-panel" data-battle-panel="attacks">
    ${datasetFacts([
      ["可渲染 / 全部特效槽", `<b>${weaponSummary.visual_catalog_rendered || 0}/${weaponSummary.visual_catalog_slots || 0}</b>`],
      ["主 + 辅助脚本", `<b>${weaponSummary.primary_scripts || 0}+${weaponSummary.auxiliary_scripts || 0}</b>`],
      ["效果对象流", `<b>${effectStreams.length}</b>`],
    ])}
    <div class="section-line"><h2>主脚本列表</h2><span>${shownCleanClips.length} / ${primaryScripts.length} 条发布记录</span></div>
    ${attackEffectListMarkup({
      kind: "primary",
      className: "clean-effect-table",
      columns: attackColumns,
      rows: shownCleanClips,
      rowId: attackVisualUid,
      recordRoute: item => `attack-effects/${attackVisualUid(item)}`,
      total: allCleanClips.length,
      publishedCount: primaryScripts.length,
      placeholder: "资源 ID、名称、阶段或状态",
    })}
    <details class="wide-card battle-action-atlas">
      <summary>特效脚本使用的动作与 CHR 组合（${cleanAnimations.action_previews?.used_action_context_count || 0} 组）</summary>
      <div class="battle-action-atlas-grid">${(cleanAnimations.action_previews?.context_atlases || [])
        .flatMap(context => (context.used_actions || []).map(action => `<figure>
          ${battleActionCanvas({
            effectBank: context.chr_effect_bank,
            action,
            label: `ACTION ${hex(action, 2)}`,
          })}
          <figcaption class="mono">${hex(action, 2)}</figcaption>
        </figure>`)).join("")}</div>
      <a href="${visualUrl("weapon-effects/assets/objects/actions.json")}" target="_blank" title="254 项入口、范围与 tile 布局清单" aria-label="254 项入口、范围与 tile 布局清单">↗</a>
    </details>
    <div class="section-line"><h2>辅助脚本列表</h2><span>${shownAuxiliaryScripts.length} / ${auxiliaryScripts.length} 条发布记录</span></div>
    ${attackEffectListMarkup({
      kind: "auxiliary",
      className: "attack-auxiliary-table",
      columns: auxiliaryColumns,
      rows: shownAuxiliaryScripts,
      rowId: item => attackScriptRecordId("auxiliary", item),
      recordRoute: item => `attack-effects/${attackScriptRecordId("auxiliary", item)}`,
      total: auxiliaryScripts.length,
      publishedCount: auxiliaryScripts.length,
      placeholder: "资源 ID、命令名或状态",
    })}
    <div class="section-line"><h2>效果对象列表 · 动作入口</h2><span>${shownBattleActions.length} / ${battleActions.length} 个动作 · ${Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "?"} 个唯一布局</span></div>
    ${attackEffectListMarkup({
      kind: "objects",
      className: "weapon-action-table",
      columns: battleActionColumns,
      rows: shownBattleActions,
      rowId: battleActionUid,
      recordRoute: item => `attack-effects/${battleActionUid(item)}`,
      total: battleActions.length,
      publishedCount: battleActions.length,
      placeholder: "资源 ID、状态或布局尺寸",
      extraAttributes: `data-published-layout-count="${
        Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "missing"
      }"`,
    })}
    <div class="section-line"><h2>效果对象列表 · 共享布局</h2><span>${
      Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "?"
    } 条 owner 发布记录</span></div>
    <${BATTLE_OBJECT_LAYOUT_LIST_ELEMENT} style="display:block"
      data-attack-effect-list="layouts" data-expected-count="${
        Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "missing"
      }">
      <p class="muted" data-battle-object-layout-list-loading>正在读取 battle-object-layout owner 候选…</p>
    </${BATTLE_OBJECT_LAYOUT_LIST_ELEMENT}>
    <div class="section-line"><h2>武器使用哪条视效</h2><span>${attackEquipment.length} 件攻击装备</span></div>
    <div class="wide-card weapon-effect-note clean-effect-note"
      data-attack-effect-composition>
      <div class="record-resource-links">
        <a class="button ghost" href="?view=equipment&amp;equipmentDomain=human"
          data-attack-effect-composition-link="human">编辑人类武器（${humanAttackEquipment.length}）</a>
        <a class="button ghost" href="?view=equipment&amp;equipmentDomain=tank"
          data-attack-effect-composition-link="tank">编辑战车武器（${tankAttackEquipment.length}）</a>
      </div>
    </div>
    <div class="section-line"><h2>特效对象数据</h2><span>${effectStreams.length} 个核心特效码</span></div>
    <div class="weapon-stream-table">${dataTable({
      columns: streamColumns,
      rows: effectStreams,
      rowId: effectStreamUid,
      recordRoute: item => `attack-effects/${effectStreamUid(item)}`,
    })}</div>
    <div class="section-line"><h2>攻击特效脚本</h2><span>${primaryScripts.length} 个主脚本 · ${auxiliaryScripts.length} 个辅助脚本</span></div>
    <div class="weapon-script-table">${dataTable({
      columns: scriptColumns,
      rows: scriptRows,
      rowId: row => attackScriptRecordId(row.space, row.item),
      recordRoute: row => `attack-effects/${attackScriptRecordId(row.space, row.item)}`,
    })}</div>
    </section>
`;
}

function battleRecordReferencePanel(uid) {
  return panel("引用关系", fields([
    ["被引用数", resourceForwardReferenceCell(uid)],
  ]));
}

function resourceButtons(uids, labels = []) {
  const resources = (uids || []).filter(Boolean);
  if (!resources.length) return "—";
  return `<div class="record-resource-links">${resources.map((uid, index) =>
    `<button class="resource-inline-link" type="button"
      data-resource-target="${esc(uid)}">${esc(labels[index] || uid)}</button>`
  ).join("")}</div>`;
}

function byteResourceButtons(prefix, values) {
  return resourceButtons(
    (values || []).map(value => byteUid(prefix, value)),
    (values || []).map(value => hex(value, 2)),
  );
}

function attackEffectCompositionRoots(effectAssets, predicate) {
  const visualCodes = (effectAssets.dependency_closures || [])
    .filter(predicate)
    .map(closure => closure.visual_code)
    .filter(value => value != null)
    .map(Number)
    .filter(Number.isFinite);
  return [...new Set(visualCodes)]
    .sort((left, right) => left - right)
    .map(value => byteUid("attack-visual", value));
}

function attackEffectUsageMarkup(kind, item, effectAssets) {
  const primaryHandles = attackEffectCompositionRoots(effectAssets, closure => {
    if (kind === "auxiliary") {
      return (closure.scripts || []).some(script =>
        script.namespace === "aux" && Number(script.id) === Number(item.id)
      );
    }
    return (closure.object_actions || []).some(action =>
      Number(action) === Number(item.id)
    );
  });
  return `<div data-attack-effect-usage="${esc(kind)}"
    data-primary-count="${primaryHandles.length}">${fields([
      ["主脚本组合", resourceButtons(
        primaryHandles,
        primaryHandles.map(handle => handle.slice(handle.lastIndexOf(":") + 1)),
      )],
      ["组合数", `${primaryHandles.length} 条`],
    ])}</div>`;
}

function hexList(values) {
  return (values || []).map(value => hex(value, 2)).join(" / ") || "—";
}

function attackScriptOperandLabel(operand) {
  return operand.name === "sound_id" ? audioCommandLabel(operand.value)
    : operand.value_hex ?? operand.value ?? "—";
}

function renderAttackScriptCommands(script) {
  const columns = [
    {key: "opcode", label: "操作码", mono: true,
      cell: command => esc(command.opcode_hex || "—")},
    {key: "name", label: "命令",
      cell: command => esc(command.name || "—")},
    {key: "bytes", label: "原始字节", mono: true,
      cell: command => esc(command.bytes_hex || "—")},
    {key: "operands", label: "参数", mono: true,
      cell: command => (command.operands || []).map(operand =>
        `${esc(operand.name || "value")}=${esc(attackScriptOperandLabel(operand))}`
      ).join(" / ") || "—"},
  ];
  return dataTable({
    columns,
    rows: script.commands || [],
    rowId: command => command.offset,
    empty: "",
  });
}

function attackScriptFirstCommandLabel(script) {
  const command = (script?.commands || []).find(item => !item.marker);
  if (!command) return "";
  const operands = (command.operands || []).map(operand =>
    `${operand.name || "value"}=${attackScriptOperandLabel(operand)}`
  );
  return `${command.name || command.opcode_hex || "未知命令"}${
    operands.length ? ` · ${operands.join(" / ")}` : ""
  }`;
}

function attackScriptPreviewMarkup(space, item) {
  const uid = attackScriptUid(space, item);
  return `<div data-attack-effect-signature="${esc(space)}"
    data-script-handle="${esc(uid)}">
    <p class="muted"><b>${esc(uid)}</b> · ${esc(
      item.command_count ?? (item.commands || []).length,
    )} 条命令 · ${esc(attackScriptFirstCommandLabel(item))}</p>
    ${renderAttackScriptCommands(item)}
  </div>`;
}

function battleObjectContextPreviewMarkup(item, effectAssets) {
  if (item.available === false) return "";
  const contexts = (effectAssets.clean_animations?.action_previews?.context_atlases || [])
    .filter(context => (context.used_actions || []).some(action =>
      Number(action) === Number(item.id)
    ));
  if (!contexts.length) {
    return ``;
  }
  return `<div data-battle-object-context-previews data-context-count="${contexts.length}">
    <div class="battle-action-atlas-grid">${contexts.map((context, index) => `<figure>
      ${battleActionCanvas({
        effectBank: context.chr_effect_bank,
        action: item.id,
        label: `战斗对象动作 ${item.id_hex} · 上下文 ${index + 1}`,
      })}
      <figcaption>上下文 ${index + 1}</figcaption>
    </figure>`).join("")}</div>
  </div>`;
}

export function battleRecordContext() {
  const visuals = state.project?.visuals || {};
  const effectAssets = visuals.weapon_effect_catalog?.asset_catalog_data || {};
  const battleContext = (visuals.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94);
  const battleObjects = battleContext?.battle_objects || [];
  const identifiedPartyFigures = battleObjects.filter(item => item.semantic_role);
  const anonymousBattleObjects = battleObjects.filter(item => !item.semantic_role);
  const enemyFigures = visuals.monsters?.enemies || [];
  const figures = [
    ...identifiedPartyFigures.map(item => ({...item, figure_kind: "battle-object"})),
    ...enemyFigures.map(item => ({...item, figure_kind: "monster"})),
    ...anonymousBattleObjects.map(item => ({...item, figure_kind: "battle-object"})),
  ];
  const monsterRecords = new Map(
    (state.project?.game_data?.monsters?.records || [])
      .map(item => [Number(item.id), item]),
  );
  return {
    visuals,
    effectAssets,
    battleContext,
    figures,
    monsterRecords,
    profiles: effectAssets.monster_attack_profiles || [],
    attackVisuals: effectAssets.clean_animations?.catalog
      || effectAssets.clean_animations?.clips || [],
    effectStreams: effectAssets.effect_streams || [],
    scripts: [
      ...(effectAssets.scripts?.primary || []).map(item => ({space: "primary", item})),
      ...(effectAssets.scripts?.auxiliary || []).map(item => ({space: "auxiliary", item})),
    ],
    battleActions: effectAssets.battle_objects?.actions || [],
  };
}

function monsterProfileRecordPanels(profile, context) {
  const uid = profile.monster_resource;
  return [
    panel("怪物与攻击选择", fields([
      ["游戏索引 ID", `<span class="mono">${esc(profile.monster_id_hex)}</span>`],
      ["怪物", esc(resourceLabel(uid, `怪物 ${profile.monster_id_hex}`))],
      ["名称文本记录", resourceButtons(
        [profile.name_text_record], [`01:${String(profile.monster_id).padStart(3, "0")}`],
      )],
      ["出现编队", resourceButtons(
        profile.encounter_formation_resources,
        (profile.encounter_formation_ids || []).map(value => hex(value, 2)),
      )],
      ["攻击码", `<span class="mono">${esc(profile.attack_code_hex)}</span>`],
      ["选择槽", resourceButtons([profile.selector_resource], [profile.selector_id_hex])],
      ["打包值", `<span class="mono">${esc(profile.selector_packed_hex || "—")}</span>`],
      ["重复类", `<span class="mono">${esc(profile.repeat_counter_class_hex || "—")}</span>`],
      ["防御码", `${esc(profile.defense_code_hex)} · AUX ${profile.defense_aux} · ×${
        profile.defense_stat_multiplier
      }`],
    ])),
    panel("攻击特效预览", profile.visual_code == null
      ? `<div class="record-preview"><span class="resource-empty">${
        esc(profile.decode_status || "")
      }</span></div>`
      : `<div class="record-preview">${attackVisualCanvas({
        visualCode: profile.visual_code,
        play: true,
        label: resourceLabel(uid, `怪物 ${profile.monster_id_hex}`),
      })}</div>`),
    panel("运行时关联", fields([
      ["共享攻击特效", resourceButtons(
        [profile.visual_resource], [profile.visual_code_hex || "—"],
      )],
      ["战斗对象动作", byteResourceButtons("battle-action", profile.object_actions)],
      ["音效", esc((profile.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
    ])),
    battleRecordReferencePanel(uid),
  ];
}

function attackVisualRecordPanels(item, context) {
  const uid = attackVisualUid(item);
  const title = item.display_name || item.stable_name || item.label || uid;
  const script = (context.effectAssets.scripts?.primary || []).find(record =>
    Number(record.id) === Number(item.visual_code)
  );
  const dependencies = script?.dependencies || {};
  return [
    panel("时间轴", attackVisualTimelineMarkup(Number(item.visual_code)),
      {wide: true}),
    panel("实际调用链", `<div data-attack-effect-dependency-chain="primary">${fields([
      ["装备选择入口", `<b>${esc(uid)}</b>`],
      ["直接调用主脚本", byteResourceButtons(
        "attack-visual", dependencies.visual_script_ids,
      )],
      ["调用辅助脚本", byteResourceButtons(
        "attack-visual-aux-script", dependencies.auxiliary_script_ids,
      )],
      ["完整对象动作", byteResourceButtons("battle-action", item.action_codes)],
      ["音效", esc((dependencies.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
    ])}</div>`),
    panel("基本信息", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.visual_code_hex)}</span>`],
      ["类型", esc(item.kind || "—")],
      ["说明", esc(item.label || "—")],
      ["帧数", item.frame_count == null ? "—" : esc(item.frame_count)],
      ["阶段", esc((item.phases || []).join(" / ") || "—")],
      ["状态", esc(item.preview_status || item.decode_status || "—")],
      ["使用域", esc((item.domains || []).join(" / ") || "—")],
    ])),
    panel("对象动作", fields([
      ["战斗对象动作", byteResourceButtons("battle-action", item.action_codes)],
      ["特殊炮弹", resourceButtons(
        (item.special_shell_ids || []).map(value => recordUid("shell", value)),
        item.special_shell_names_hint || item.special_shell_ids_hex || [],
      )],
    ])),
    battleRecordReferencePanel(uid),
  ];
}

function effectStreamRecordPanels(item) {
  const uid = effectStreamUid(item);
  return [
    panel("基本信息", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.effect_code_hex)}</span>`],
      ["存储类型", esc(item.storage_kind || "—")],
      ["解码状态", esc(item.decode_status || "—")],
      ["ACTION", `<span class="mono">${esc(item.action_code_hex || "运行时")}</span>`],
      ["资产", item.path
        ? `<code title="二进制只在构建阶段读取">${esc(item.path)}</code>`
        : "RAM 构造"],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(
      item.bytes_hex || "—",
    )}</code>`),
    battleRecordReferencePanel(uid),
  ];
}

function attackScriptRecordPanels(row, context) {
  const {space, item} = row;
  const uid = attackScriptUid(space, item);
  const ownerResource = space === "auxiliary"
    ? "attack-visual-aux-script" : "attack-visual";
  const ownerHandle = byteUid(ownerResource, item.id);
  const dependencies = item.dependencies || {};
  return [
    panel("基本信息", fields([
      ["命名空间", `<span class="mono">${space.toUpperCase()}</span>`],
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["解码状态", esc(item.decode_status || "decoded")],
      ["长度", `${Number(item.length || 0)} bytes`],
      ["终止符", item.terminator == null ? "—" : hex(item.terminator, 2)],
      ["命令数", esc(item.command_count ?? (item.commands || []).length)],
      ["资产", `<a href="${visualUrl(
        `weapon-effects/${item.path.replace(/\.bin$/, ".json")}`,
      )}" target="_blank">${esc(item.path)} ↗</a>`],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(item.bytes_hex || "—")}</code>`),
    panel("命令表", `<div data-attack-effect-preview="${space === "primary" ? "primary" : "auxiliary"}"
      data-command-count="${item.command_count ?? (item.commands || []).length}">${
        attackScriptPreviewMarkup(space, item)
      }</div>`, {wide: true}),
    panel("命令流编辑器", `<attack-visual-command-authoring
      data-attack-visual-resource="${esc(ownerResource)}"
      data-attack-visual-handle="${esc(ownerHandle)}"></attack-visual-command-authoring>`,
    {wide: true}),
    panel("脚本依赖", fields([
      ["主脚本", byteResourceButtons("attack-visual", dependencies.visual_script_ids)],
      ["辅助脚本", byteResourceButtons(
        "attack-visual-aux-script", dependencies.auxiliary_script_ids,
      )],
      ["战斗对象动作", byteResourceButtons("battle-action", dependencies.object_actions)],
      ["音效", esc((dependencies.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
      ["对象槽", `<span class="mono">${(dependencies.object_slots || []).join(" / ") || "—"}</span>`],
    ])),
    ...(space === "auxiliary"
      ? [panel("组合使用情况", attackEffectUsageMarkup(
          "auxiliary", item, context.effectAssets,
        ), {wide: true})]
      : []),
    battleRecordReferencePanel(uid),
  ];
}

function battleFigureRecordPanels(item, context) {
  const uid = battleFigureUid(item);
  const isMonster = item.figure_kind === "monster";
  const monster = isMonster ? context.monsterRecords.get(Number(item.id)) : null;
  const preview = isMonster
    ? monsterFigureCanvas({
        enemyId: item.id,
        scale: 4,
        label: monster?.name || uid,
      })
    : item.preview
      ? `<img src="${visualUrl(item.preview)}" alt="${esc(item.name || uid)}">`
      : ``;
  return [
    panel("战斗图形", `<div class="record-preview">${preview}</div>`),
    panel("结构", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["类型", isMonster
        ? "怪物实例"
        : esc(item.role_label || (item.kind === "direct-frame" ? "直接帧" : "Metasprite"))],
      ["图块数", esc(item.sprite_count ?? "—")],
      ["实机 OAM", item.oam_match
        ? `<span class="mono">${esc((item.oam_match.tiles_hex || []).join(" / "))}</span>`
        : "—"],
    ])),
    panel("图形与调色板", isMonster
      ? fields([
        ["怪物图形", resourceButtons(
          [byteUid("monster-graphic", item.graphic_id)], [item.graphic_id_hex],
        )],
        ["调色板", `${item.palette_kind === "paired" ? "双色组合" : "单色板"} ${
          esc(item.palette_code_hex || "")
        }`],
        ["颜色", monsterPaletteMarkup(item) || "—"],
      ])
      : fields([
        ["CHR BANK", `<span class="mono">${esc(
          (context.battleContext?.chr_banks_hex || []).join(" / ") || "—",
        )}</span>`],
        ["调色板来源", esc(context.battleContext?.palette_source || "—")],
      ])),
    battleRecordReferencePanel(uid),
  ];
}

function battleActionRecordPanels(item, context) {
  const uid = battleActionUid(item);
  return [
    panel("布局预览", `<div data-attack-effect-preview="object">${
      battleObjectLayoutPreview(item)
    }${battleObjectContextPreviewMarkup(item, context.effectAssets)}</div>`, {wide: true}),
    panel("组合使用情况", attackEffectUsageMarkup(
      "object", item, context.effectAssets,
    ), {wide: true}),
    panel("动作布局", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["状态", item.available === false ? "指针空洞" : "可用"],
      ["配置", `<span class="mono">${esc(item.config_hex || "—")}</span>`],
      ["调色板", esc(item.palette_id ?? "—")],
      ["尺寸", `${esc(item.columns ?? "—")} × ${esc(item.rows ?? "—")} tiles`],
      ["原点", `<span class="mono">${esc(item.origin_hex || "—")}</span>`],
      ["布局资产", item.layout_path ? `<code>${esc(item.layout_path)}</code>` : "—"],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(item.bytes_hex || "—")}</code>`),
    panel("图块矩阵", `<code class="record-bytes">${esc(
      (item.tile_matrix || []).map(row => row.map(value => hex(value, 2)).join(" ")).join("\n") || "—",
    )}</code>`),
    battleRecordReferencePanel(uid),
  ];
}

function battleRecordTitle(kind, item, context, uid) {
  if (kind === "monster-profile") {
    return resourceLabel(uid, `怪物 ${item.monster_id_hex}`);
  }
  if (kind === "attack-visual") {
    return item.display_name || item.stable_name || item.label || uid;
  }
  if (kind === "effect-stream") return item.label || `效果对象流 ${item.effect_code_hex}`;
  if (kind === "attack-script") {
    return `${item.space === "primary" ? "主攻击脚本" : "辅助攻击脚本"} ${item.item.id_hex}`;
  }
  if (kind === "battle-figure") {
    if (item.figure_kind === "monster") {
      return context.monsterRecords.get(Number(item.id))?.name || `怪物 ${item.id_hex}`;
    }
    return item.name || item.role_label
      || `${item.kind === "direct-frame" ? "Packed direct frame" : "ROM metasprite"} ${item.id_hex}`;
  }
  if (kind === "battle-action") return `战斗对象动作 ${item.id_hex}`;
  return uid;
}

function battleRecordPanels(kind, item, context) {
  if (kind === "monster-profile") return monsterProfileRecordPanels(item, context);
  if (kind === "attack-visual") return attackVisualRecordPanels(item, context);
  if (kind === "effect-stream") return effectStreamRecordPanels(item);
  if (kind === "attack-script") return attackScriptRecordPanels(item, context);
  if (kind === "battle-figure") return battleFigureRecordPanels(item, context);
  if (kind === "battle-action") return battleActionRecordPanels(item, context);
  return [];
}

/** 战斗目录记录页只展示已登记的物理范围。 */
export function renderBattleRecord(recordId) {
  const context = battleRecordContext();
  const groups = [
    {kind: "monster-profile", rows: context.profiles,
      uidFor: item => item.monster_resource},
    {kind: "attack-visual", rows: context.attackVisuals, uidFor: attackVisualUid},
    {kind: "effect-stream", rows: context.effectStreams, uidFor: effectStreamUid},
    {kind: "attack-script", rows: context.scripts,
      recordIdFor: row => attackScriptRecordId(row.space, row.item),
      uidFor: row => attackScriptUid(row.space, row.item)},
    {kind: "battle-figure", rows: context.figures, uidFor: battleFigureUid},
    // 战斗对象动作由特效记录和脚本依赖引用；保留可直达记录，仍走同一外框。
    {kind: "battle-action", rows: context.battleActions, uidFor: battleActionUid},
  ];
  const wanted = String(recordId);
  for (const group of groups) {
    const recordIdFor = group.recordIdFor || group.uidFor;
    const index = group.rows.findIndex(item => recordIdFor(item) === wanted);
    if (index < 0) continue;
    const item = group.rows[index];
    const uid = group.uidFor(item);
    return recordPage({
      title: battleRecordTitle(group.kind, item, context, uid),
      uid,
      backLabel: state.view === "battle-test" ? "战斗场景与测试" : "攻击特效",
      prevId: index > 0 ? recordIdFor(group.rows[index - 1]) : null,
      nextId: index < group.rows.length - 1 ? recordIdFor(group.rows[index + 1]) : null,
      panels: [
        ...battleRecordPanels(group.kind, item, context),
      ],
    });
  }
  return null;
}
