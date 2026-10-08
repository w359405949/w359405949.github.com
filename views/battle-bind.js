// @editor-module 战斗测试编辑器绑定
//
// 来源：拆分前 engine/editor/app.js 第 144-243 行。

import {editorLog} from "../core/editor-log.js";
import {$, esc, hex} from "../core/dom.js";
import {audioCommandLabel} from "../core/resource-index.js";
import {flushAllAutoSaves, trackAutoSavePreparation} from "../core/auto-save.js";
import {
  requireBrowserProjectRepository,
  resetProjectFields,
  setProjectFields,
} from "../core/project-data.js";
import {state} from "../core/state.js";
import {battleFirstMonsterId, battleModeForPendingEventFlag} from "../core/battle-mode.js";
import {bindBattleSimulation} from "../ui/battle-simulation-player.js";
import {battleSceneComposerControls, bindBattleSceneComposer} from "./battle-scene-composer.js";
import {normalizeBattleScenePreview, battleScenePreviewForFormation} from "../core/battle-scene-preview.js";
import {db} from "../core/project-db.js";
import {bindReferencePicker, referencePickerMarkup, syncReferencePickerControl} from "../ui/reference-picker.js";
import {hydrateModuleComponents} from "../ui/module-components.js";
import {copyFieldDocumentView, ensureBattleSceneData} from "../core/view-data.js";
import {BATTLE_TEST_EMPTY_FORMATION_SLOT, BATTLE_TEST_ENTRY_RESET_KEY, battleTestDraftAfterEntryReset, battleTestDraftAfterFormationReset, battleTestViewPending, battleTestDraftError, battleTestDraftFromDocument, battleTestEditorStatus, battleTestEntryLocalDirty, battleTestEntryResetBlockedReason, battleTestFormation, battleTestFormationDraft, battleTestFormationDisplayLabel, battleTestFormationDraftError, battleTestFormationLocalDirty, battleTestFormationResetKey, rebuildBattleSelectedFormation, updateBattleTestOriginalControls, setBattleTestRootSelected} from "../views/battle.js";
import {copyEditorDraft} from "../views/data/monsters.js";
import {bindFieldResetToOriginalButtons} from "../ui/table.js";
import {render} from "../main.js";
import {hydrateScenePositionPicker, syncScenePositionPicker} from "../modules/scene/components.js";
import {bindInPageTabs} from "../ui/in-page-tabs.js";
import {currentViewUrl, replaceHistoryUrl} from "../core/router.js";

const BATTLE_TEST_RESOURCE_ID = "battle-test-point";

const previewControllers = new WeakMap();

function mountBattleTestComposerControls(panel) {
  const source = document.createElement("div");
  source.innerHTML = battleSceneComposerControls(state.project, {includeInventory: true});
  const party = source.querySelector(".battle-scene-party-section");
  const enemy = source.querySelector(".battle-scene-enemy-section");
  for (const section of [party, enemy]) {
    section.hidden = false;
    section.removeAttribute("role");
    section.removeAttribute("aria-labelledby");
  }
  const actions = panel.querySelector("[data-battle-test-action-controls]");
  actions.replaceChildren();
  for (const row of party.querySelectorAll("[data-battle-scene-party-row]")) {
    const group = document.createElement("section");
    group.className = "battle-test-party-actions";
    group.innerHTML = `<h4>${esc(row.querySelector(".battle-scene-slot-id").textContent)} · ${
      esc(row.querySelector(".battle-scene-object-toggle span").textContent)
    }</h4>`;
    group.append(row.querySelector(".battle-scene-party-attacks"));
    actions.append(group);
  }
  panel.querySelector("[data-battle-test-party-controls]").replaceChildren(party);
  panel.querySelector("[data-battle-test-enemy-controls]").replaceChildren(enemy);
  panel.querySelector("[data-battle-test-preview-controls]").replaceChildren(
    source.querySelector(".battle-scene-preview-actions"),
  );
  panel.querySelector("[data-battle-test-composer-status]").replaceChildren(
    source.querySelector(".battle-scene-control-status"),
  );
}

function bindBattleTestTabs(panel) {
  const selectRoot = selected => {
    setBattleTestRootSelected(selected);
    panel.querySelector('[data-battle-test-root-details]').hidden = !selected;
    panel.querySelector('[data-battle-test-party-details]').hidden = selected;
    for (const button of panel.querySelectorAll('[data-battle-test-node]')) {
      const active = (button.dataset.battleTestNode === 'page-root') === selected;
      button.setAttribute('aria-pressed', String(active));
      button.closest('.element-tree-node').classList.toggle('is-selected', active);
    }
  };
  panel.querySelectorAll('[data-battle-test-node]').forEach(button => {
    button.addEventListener('click', () => selectRoot(button.dataset.battleTestNode === 'page-root'));
  });
  for (const [side, key] of [["enemy", "battleTestEnemyTab"], ["party", "battleTestPartyTab"]]) {
    const root = panel.querySelector(`#battle-test-${side}-panel`).closest("[data-in-page-tabs]");
    let initialized = false;
    bindInPageTabs(root, {onChange: active => {
      state[key] = active;
      if (initialized) selectRoot(false);
      replaceHistoryUrl(currentViewUrl());
    }});
    initialized = true;
  }
}

async function prepareBattleTestPreview(form) {
  const panel = form.closest("[data-battle-panel]");
  const status = panel.querySelector("[data-battle-test-preview-status]");
  const failures = await ensureBattleSceneData({includeInventory: true});
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join("、")}`);
  if (!form.isConnected) return null;
  const model = {signature: "", player: null};
  const syncFormation = () => {
    const draft = state.battleTestView;
    const signature = JSON.stringify([draft.encounter_id, draft.formation]);
    if (signature === model.signature) return;
    const project = state.project;
    const previewProject = {...project, game_data: {...project.game_data,
      battle_test: {...project.game_data.battle_test,
        formations: project.game_data.battle_test.formations.map(formation =>
          Number(formation.id) === draft.encounter_id
            ? {...formation, slots: draft.formation.map((slot, index) => ({
              ...formation.slots[index], monster_id: slot.monster_id, count: slot.count,
            }))} : formation),
      },
    }};
    const formation = battleScenePreviewForFormation(previewProject, draft.encounter_id);
    state.battleScenePreview = normalizeBattleScenePreview({
      ...(state.battleScenePreview || formation), enemyGroups: formation.enemyGroups,
      enemyEvents: [], manualEnemySlots: {},
    }, project);
    model.signature = signature;
  };
  const repaint = () => model.player.update({project: state.project, preview: state.battleScenePreview});
  const controls = () => {
    if (!form.isConnected) return;
    const panes = [...panel.querySelectorAll(".in-page-tab-content")];
    const scrollPositions = panes.map(pane => pane.scrollTop);
    mountBattleTestComposerControls(panel);
    bindBattleSceneComposer({
      rerender: async () => {controls(); await repaint();}, repaint,
      playAttack: () => model.player.update({project: state.project, preview: state.battleScenePreview, autoplay: true}),
    });
    panes.forEach((pane, index) => {pane.scrollTop = scrollPositions[index];});
  };
  syncFormation();
  model.player = await bindBattleSimulation(panel.querySelector("[data-battle-simulation]"),
    {project: state.project, preview: state.battleScenePreview});
  controls();
  status.textContent = "";
  return {update: async () => {syncFormation(); controls(); await repaint();}};
}

async function paintBattleTestPreview(form) {
  if (!form?.isConnected) return;
  const status = form.closest("[data-battle-panel]").querySelector("[data-battle-test-preview-status]");
  try {
    if (!previewControllers.has(form)) {
      const pending = prepareBattleTestPreview(form);
      previewControllers.set(form, pending);
      await pending;
    } else {
      const controller = await previewControllers.get(form);
      if (form.isConnected) await controller?.update();
    }
  } catch (error) {
    editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
    if (form.isConnected) status.textContent = `预览不可用：${error.message || error}`;
  }
}

function syncBattleTestFormationSlotControls(root, slotIndex, slot) {
  const control = root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="monster_id"]`,
  );
  const count = root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="count"]`,
  );
  const active = Number(slot.count) !== 0;
  if (control) {
    control.value = active
      ? String(Number(slot.monster_id))
      : BATTLE_TEST_EMPTY_FORMATION_SLOT;
    control.dataset.battleEmptyMonsterId = String(Number(slot.monster_id));
    void syncReferencePickerControl(control);
  }
  if (count) {
    count.value = String(Number(slot.count));
    count.disabled = !active;
  }
}

function preservedBattleTestFormationMonsterId(root, slotIndex) {
  const value = Number(root?.querySelector?.(
    `[data-battle-formation-slot="${slotIndex}"][data-battle-formation-field="monster_id"]`,
  )?.dataset.battleEmptyMonsterId);
  return Number.isInteger(value) ? value : null;
}

function applyBattleTestFormationControl(formationDraft, input, root = document) {
  const slotIndex = Number(input?.dataset?.battleFormationSlot);
  const field = input?.dataset?.battleFormationField;
  const slot = formationDraft?.[slotIndex];
  if (!slot || !["monster_id", "count"].includes(field)) {
    throw new Error("未知的战斗编队槽控件");
  }
  if (field === "monster_id") {
    if (input.value === BATTLE_TEST_EMPTY_FORMATION_SLOT) {
      // count=0 才是 ROM 的空槽标志；保留 monster_id 原字节，不能拿真实怪物
      // 0x00（电脑墙）冒充空值。
      const preservedMonsterId = preservedBattleTestFormationMonsterId(
        root,
        slotIndex,
      );
      if (preservedMonsterId !== null) slot.monster_id = preservedMonsterId;
      slot.count = 0;
    } else {
      slot.monster_id = Number(input.value);
      if (Number(slot.count) < 1) slot.count = 1;
    }
  } else {
    slot.count = Number(input.value);
    if (slot.count === 0) {
      const preservedMonsterId = preservedBattleTestFormationMonsterId(
        root,
        slotIndex,
      );
      if (preservedMonsterId !== null) slot.monster_id = preservedMonsterId;
    }
  }
  syncBattleTestFormationSlotControls(root, slotIndex, slot);
  return slot;
}

let battlePersistedResetStates = new Map();
let battleResetRefreshGeneration = 0;
let battleTestResetting = false;

function battleTestLocalResetStates() {
  const draft = state.battleTestView;
  const configuration = state.project.game_data?.battle_test;
  if (!draft || !state.battleTestPersistedView || !configuration) return new Map();
  return new Map([
    [BATTLE_TEST_ENTRY_RESET_KEY, battleTestEntryLocalDirty(
      draft,
      state.battleTestPersistedView,
    )],
    [battleTestFormationResetKey(draft.encounter_id),
      battleTestFormationLocalDirty(draft, configuration)],
  ]);
}

function updateBattleTestEditorState(message = null) {
  if (!state.battleTestView || !state.battleTestPersistedView) return;
  if (message !== null) state.battleTestMessage = message;
  const error = battleTestDraftError();
  const form = $("#battle-test-editor"), draft = state.battleTestView;
  const total = draft.formation.reduce((sum, slot) => sum + Number(slot.count || 0), 0);
  const formationSummary = form?.querySelector("[data-battle-formation-summary]");
  if (formationSummary) formationSummary.textContent = `${total} / 9 MONSTER SLOTS`;
  const title = form?.querySelector("[data-battle-formation-title]");
  if (title) title.textContent = `编队 ${hex(draft.encounter_id, 2)}`;
  const reference = form?.closest("[data-battle-panel]")?.querySelector("[data-battle-formation-reference]");
  if (reference) reference.textContent = hex(draft.encounter_id, 2);
  const modeReadout = form?.querySelector("[data-battle-mode-readout]");
  const mode = battleModeForPendingEventFlag(draft.state_flag, battleFirstMonsterId(draft.formation));
  if (modeReadout && mode) modeReadout.textContent = `${mode.label} · BGM ${audioCommandLabel(mode.musicCommand)} · 死亡效果 ${hex(mode.deathEffect, 2)}`;
  const monsters = state.project.game_data?.monsters?.records || [];
  for (const option of form?.querySelectorAll('[data-battle-test-field="encounter_id"] option') || []) {
    const id = Number(option.value);
    const formation = id === draft.encounter_id ? {slots: draft.formation}
      : battleTestFormation(state.project.game_data.battle_test, id);
    const label = `${hex(id, 2)} · ${battleTestFormationDisplayLabel(formation, monsters)}`;
    if (option.textContent !== label) option.textContent = label;
  }
  const status = $("#battle-test-save-state");
  if (status) {
    status.textContent = battleTestEditorStatus();
    status.classList.toggle("invalid", Boolean(error));
    status.hidden = !battleTestEditorStatus();
  }
  updateBattleTestOriginalControls($("#battle-test-editor"), {
    persistedStates: battlePersistedResetStates,
    localStates: battleTestLocalResetStates(),
    busy: battleTestResetting || state.battleTestBuilding,
  });
}

async function battleTestResetSnapshot() {
  const repository = requireBrowserProjectRepository(state);
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  const resolved = await db.readResource(BATTLE_TEST_RESOURCE_ID);
  const original = await repository.getOriginal(BATTLE_TEST_RESOURCE_ID);
  return {repository, fields, document: resolved.value.document,
    baseDocument: original.value.document, version: fields[0].version};
}

const selectedBattleFields = (fields, id) => fields.filter(field => field.recordId === id);
const battleSlotResetGroups = fields => {
  const groups = new Map();
  for (const field of fields.filter(field => Number.isInteger(field.slotId))) {
    if (!groups.has(field.entityHandle)) groups.set(field.entityHandle, []);
    groups.get(field.entityHandle).push(field);
  }
  return groups;
};
const battleResetGroups = fields => new Map([
  ["entry", selectedBattleFields(fields, "entry")],
  ...[...new Set(fields.filter(field => field.recordId !== "entry").map(field => field.recordId))]
    .map(id => [battleTestFormationResetKey(id), selectedBattleFields(fields, id)]),
  ...battleSlotResetGroups(fields),
]);

function applyBattleTestProjection(saved) {
  const previous = state.project.game_data?.battle_test;
  const document_ = copyFieldDocumentView(saved.value.document);
  rebuildBattleSelectedFormation(document_);
  if (!Object.hasOwn(document_, "writeback_state") && previous?.writeback_state) {
    document_.writeback_state = copyEditorDraft(previous.writeback_state);
  }
  state.project.game_data.battle_test = document_;
  return document_;
}

function clearBattleTestPageViewAfterExternalWrite() {
  if ($("#battle-test-editor")?.isConnected) return;
  // 外部字段写入后，下一次进入战斗页须从 Working 重建视图。
  state.battleTestView = null;
  state.battleTestPersistedView = null;
  state.battleTestMessage = "";
  battlePersistedResetStates = new Map();
}

async function persistBattleTestEdit(payload) {
  if (state.projectRepository !== payload.repository || state.project !== payload.project)
    throw new Error("战斗测试项目会话已改变");
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID), changes = [];
  const append = (field, value, before) => {
    if (value !== before && value !== field.value) changes.push({field, value});
  };
  if (payload.kind === "page") for (const field of selectedBattleFields(fields, "entry"))
    append(field, payload.draft[field.fieldName], payload.baseline[field.fieldName]);
  const id = payload.kind === "page" ? payload.draft.encounter_id : payload.formationId;
  const formation = payload.kind === "page" ? payload.draft.formation : payload.formationDraft;
  const baseline = payload.formationBaseline;
  for (const field of selectedBattleFields(fields, id))
    append(field, formation[field.slotId][field.fieldName], baseline[field.slotId][field.fieldName]);
  if (changes.length) await setProjectFields(db, changes, {expectedVersion: fields[0].version});
  return {...await db.readResource(BATTLE_TEST_RESOURCE_ID), changed: changes.length > 0};
}

async function writeBattleTestEdit(payload) {
  try {
    const saved = await persistBattleTestEdit(payload);
    if (state.projectRepository !== payload.repository ||
        state.project !== payload.project) return saved;
    const document_ = applyBattleTestProjection(saved);
    if (payload.kind === "page") {
      if (state.battleTestView === payload.draftTarget) {
        state.battleTestPersistedView = battleTestDraftFromDocument(document_);
        state.battleTestMessage = "";
        battlePersistedResetStates = new Map();
        updateBattleTestEditorState();
        const root = $("#battle-test-editor");
        if (root) {
          void refreshBattleTestOriginalStates(root).catch(error => {
            if (root.isConnected) editorLog.error("后台准备", "战斗测试 Origin 状态刷新失败", error);
          });
        }
      }
    } else {
      clearBattleTestPageViewAfterExternalWrite();
      payload.onSaved?.(saved, document_);
    }
    return saved;
  } catch (error) {
    payload.onError?.(error);
    throw error;
  }
}

function commitBattleTestPage({clearMessage = true} = {}) {
  const draftTarget = state.battleTestView;
  if (!draftTarget) return;
  if (battleTestResetting) {
    updateBattleTestEditorState();
    return;
  }
  const error = battleTestDraftError();
  if (error) {
    updateBattleTestEditorState();
    return;
  }
  try {
    const repository = requireBrowserProjectRepository(state);
    if (clearMessage) state.battleTestMessage = "";
    trackAutoSavePreparation(writeBattleTestEdit({
      kind: "page",
      repository,
      project: state.project,
      draftTarget,
      draft: copyEditorDraft(draftTarget),
      baseline: copyEditorDraft(state.battleTestPersistedView),
      formationBaseline: copyEditorDraft(state.battleTestPersistedView.encounter_id === draftTarget.encounter_id
        ? state.battleTestPersistedView.formation
        : battleTestFormationDraft(battleTestFormation(state.project.game_data.battle_test, draftTarget.encounter_id))),
      onError: error_ => {
        if (state.projectRepository === repository &&
            state.battleTestView === draftTarget) {
          updateBattleTestEditorState(`保存失败：${error_?.message || error_}`);
        }
      },
    }).catch(() => {}));
    updateBattleTestEditorState();
  } catch (error_) {
    updateBattleTestEditorState(`保存失败：${error_?.message || error_}`);
  }
}



async function refreshBattleTestOriginalStates(root) {
  if (!root?.querySelectorAll) return;
  const generation = ++battleResetRefreshGeneration;
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  if (generation !== battleResetRefreshGeneration || !root.isConnected) return;
  battlePersistedResetStates = new Map([...battleResetGroups(fields)].map(([key, selected]) =>
    [key, selected.some(field => field.hasOverride)]));
  updateBattleTestEditorState();
}

async function prepareBattlePageReset(id) {
  const draftTarget = state.battleTestView;
  if (id !== "entry" && Number(draftTarget?.encounter_id) !== id) throw new Error("所选编队已变化，请重新执行重置");
  await flushAllAutoSaves();
  const snapshot = await battleTestResetSnapshot();
  if (id === "entry") {
    const blocked = battleTestEntryResetBlockedReason(draftTarget, snapshot.document, snapshot.baseDocument);
    if (blocked) throw new Error(blocked);
  }
  return {id, snapshot, previousDraft: copyEditorDraft(draftTarget), expectedVersion: snapshot.version,
    selected: selectedBattleFields(snapshot.fields, id)};
}

async function finishBattlePageReset(context) {
  const {id, previousDraft} = context;
  const saved = {...await db.readResource(BATTLE_TEST_RESOURCE_ID), changed: context.changed};
  const document_ = applyBattleTestProjection(saved);
  state.battleTestView = id === "entry" ? battleTestDraftAfterEntryReset(previousDraft, document_)
    : battleTestDraftAfterFormationReset(previousDraft, document_, id);
  state.battleTestPersistedView = battleTestDraftFromDocument(document_);
  battlePersistedResetStates = new Map();
  return saved;
}


function resetConfirmation(itemId) {
  if (itemId.startsWith("encounter-formation:"))
    return "只恢复这一槽怪物与数量；其他槽和测试入口保留。继续吗？";
  return itemId === BATTLE_TEST_ENTRY_RESET_KEY
    ? "只把测试入口字段恢复为本次导入值；持久化编队不会改变。若会隐藏无效的当前编队编辑，操作将被拒绝。继续吗？"
    : "只把当前选中的编队恢复为本次导入值；测试入口和其他编队都会保留。继续吗？";
}

export async function bindSceneBattleTestFormationEditor(root = document, onSaved = null) {
  const editor = root?.querySelector?.("[data-scene-battle-formation-editor]");
  if (!editor || editor.dataset.sceneBattleFormationBound) return;
  editor.dataset.sceneBattleFormationBound = "loading";
  const formationId = Number(editor.dataset.formationId);
  const formation = battleTestFormation(
    state.project.game_data?.battle_test,
    formationId,
  );
  const draft = battleTestFormationDraft(formation);
  const baseline = copyEditorDraft(draft);
  const inputs = [...editor.querySelectorAll("[data-battle-formation-field]")];
  const reset = editor.querySelector('[data-reset-to-original="scene-formation"]');
  // Field loading is asynchronous; an enabled control must already have its
  // change listener, otherwise the first user edit is silently lost.
  inputs.forEach(input => {input.disabled = true;});
  if (reset) reset.disabled = true;
  const fields = selectedBattleFields(await db.getFields(BATTLE_TEST_RESOURCE_ID), formationId);
  const status = editor.querySelector("[data-scene-battle-formation-status]");
  const total = editor.querySelector("[data-scene-battle-formation-total]");
  let resetting = false;

  const syncControls = () => {
    for (const input of inputs) {
      const slotIndex = Number(input.dataset.battleFormationSlot);
      const isEmptyCount = input.dataset.battleFormationField === "count"
        && Number(draft[slotIndex]?.count) === 0;
      input.disabled = resetting || isEmptyCount;
    }
    for (const button of editor.querySelectorAll('[data-reset-to-original]')) button.disabled = resetting;
  };

  const update = (message = "") => {
    const error = battleTestFormationDraftError(draft);
    if (total) {
      total.textContent = String(draft.reduce(
        (sum, slot) => sum + Number(slot.count || 0),
        0,
      ));
    }
    if (status) {
      const alert = message || (error ? `无法自动保存：${error}` : "");
      status.textContent = alert;
      status.hidden = !alert;
      status.classList.toggle("invalid", Boolean(alert));
    }
    syncControls();
  };

  const syncDraftFromProject = () => {
    const current = battleTestFormationDraft(battleTestFormation(
      state.project.game_data?.battle_test,
      formationId,
    ));
    draft.splice(0, draft.length, ...copyEditorDraft(current));
    draft.forEach((slot, slotIndex) => {
      syncBattleTestFormationSlotControls(editor, slotIndex, slot);
    });
  };

  const commit = () => {
    const error = battleTestFormationDraftError(draft);
    if (error) {
      update();
      return;
    }
    try {
      const repository = requireBrowserProjectRepository(state);
      const project = state.project;
      trackAutoSavePreparation(writeBattleTestEdit({
        kind: "formation",
        repository,
        project,
        formationId,
        formationDraft: copyEditorDraft(draft),
        formationBaseline: copyEditorDraft(baseline),
        onSaved: () => {
          if (editor.isConnected) update();
          void onSaved?.();
        },
        onError: error_ => {
          if (editor.isConnected && state.projectRepository === repository &&
              state.project === project) {
            update(`自动保存失败：${error_?.message || error_}`);
          }
        },
      }).catch(() => {}));
      update();
    } catch (error_) {
      update(`自动保存失败：${error_.message}`);
    }
  };

  for (const input of inputs) {
    input.addEventListener("change", event => {
      if (resetting) return;
      const previous = copyEditorDraft(draft);
      applyBattleTestFormationControl(draft, event.target, editor);
      const error = battleTestFormationDraftError(draft);
      if (error) {
        draft.splice(0, draft.length, ...previous);
        previous.forEach((slot, index) => syncBattleTestFormationSlotControls(editor, index, slot));
        update(`输入无效：${error}`);
        return;
      }
      commit();
    });
  }
  await hydrateModuleComponents(editor);
  for (const field of fields) field.bind(editor, () => {
    const slot = field.slotId, name = field.fieldName;
    if (draft[slot][name] === baseline[slot][name]) draft[slot][name] = field.value;
    baseline[slot][name] = field.value;
    syncBattleTestFormationSlotControls(editor, slot, draft[slot]);
    update();
  });
  bindFieldResetToOriginalButtons(editor, new Map([["scene-formation", fields], ...battleSlotResetGroups(fields)]), {
    database: db,
    beforeReset: async () => {
      resetting = true; update(); await flushAllAutoSaves();
      return {expectedVersion: fields[0].version};
    },
    afterReset: async () => {
      try {
        const saved = await db.readResource(BATTLE_TEST_RESOURCE_ID);
        applyBattleTestProjection(saved); syncDraftFromProject();
        baseline.splice(0, baseline.length, ...copyEditorDraft(draft));
        await onSaved?.(saved);
      } finally {resetting = false; if (editor.isConnected) update();}
    },
    onError: error => {resetting = false; update(`重置失败：${error.message}`);},
  });
  update();
  editor.dataset.sceneBattleFormationBound = "1";
}

export async function bindBattleTestEditor() {
  await bindSceneBattleTestFormationEditor();
  $("[data-scene-battle-formation-editor]")?.scrollIntoView({block: "start"});
  const form = $("#battle-test-editor");
  if (!form || !state.battleTestView) return;
  bindBattleTestTabs(form.closest("[data-battle-panel]"));
  const sceneEntries = state.project?.scenes?.editable_scenes || [];
  const scenePicker = form.querySelector('[data-scene-position-picker]');
  hydrateScenePositionPicker(scenePicker, {entries: sceneEntries, onConfirm: ({sceneId, x, y}) => {
    Object.assign(state.battleTestView, {scene_id: sceneId, x, y});
    commitBattleTestPage();
  }});
  const fields = await db.getFields(BATTLE_TEST_RESOURCE_ID);
  const catalog = await db.getDocument("project.text-catalog", null);
  const records = (catalog?.records || []).filter(record =>
    Number(record.region) === 5 && Number.isInteger(record.record) && record.record <= 255);
  if (!records.length) throw new TypeError("战斗测试文字区 05 没有已发布记录候选");
  const items = [{value: 255, label: "未指定", meta: "0xFF"}, ...records.map(record => ({
    value: record.record,
    label: record.display_text || record.unicode_preview || "（无可读文字）",
    meta: record.node_id,
  }))];
  for (const host of form.querySelectorAll("[data-battle-text-picker]")) {
    const field = host.dataset.battleTextPicker;
    const value = state.battleTestView[field];
    host.innerHTML = referencePickerMarkup({
      moduleId: "text-record", value, label: field === "intro_text_record_id" ? "战前文字" : "完成文字",
      items, compact: true, pageSize: 24,
      controlMarkup: `<input type="number" min="0" max="255" data-battle-test-field="${field}" value="${value}">`,
    });
  }
  battlePersistedResetStates = new Map();
  form.addEventListener("submit", event => event.preventDefault());
  form.querySelectorAll("[data-battle-test-field]").forEach(input => {
    const apply = event => {
      const field = event.target.dataset.battleTestField;
      const previous = state.battleTestView[field];
      const value = event.target.type === "checkbox"
        ? event.target.checked : Number(event.target.value);
      if (event.target.type !== "checkbox"
          && (!event.target.value.trim() || !Number.isInteger(value)
            || value < 0 || value > ({scene_id: 0xEF, encounter_id: 0x38}[field] ?? 0xFF)
            || (event.target.tagName === "SELECT" && ![...event.target.options].some(option => option.value === event.target.value)))) {
        event.target.value = String(previous);
        updateBattleTestEditorState(`输入无效：${field} 超出允许范围`);
        return;
      }
      state.battleTestView[field] = value;
      if (field === "encounter_id") {
        const formation = battleTestFormation(
          state.project.game_data?.battle_test,
          state.battleTestView.encounter_id,
        );
        state.battleTestView.formation = battleTestFormationDraft(formation);
        commitBattleTestPage();
        render();
        return;
      }
      commitBattleTestPage();
    };
    input.addEventListener(
      input.matches("select, input[type=checkbox]") ? "change" : "input",
      apply,
    );
  });
  form.querySelectorAll("[data-battle-text-picker] [data-module-reference-picker]")
    .forEach(picker => bindReferencePicker(picker));
  form.querySelectorAll("[data-battle-formation-field]").forEach(input =>
    input.addEventListener(input.dataset.battleFormationField === "monster_id" ? "change" : "input", event => {
      const previous = copyEditorDraft(state.battleTestView.formation);
      applyBattleTestFormationControl(
        state.battleTestView.formation,
        event.target,
        form,
      );
      const error = battleTestFormationDraftError(state.battleTestView.formation);
      if (error) {
        state.battleTestView.formation = previous;
        previous.forEach((slot, index) => syncBattleTestFormationSlotControls(form, index, slot));
        updateBattleTestEditorState(`输入无效：${error}`);
        return;
      }
      commitBattleTestPage();
      void paintBattleTestPreview(form);
    })
  );
  await hydrateModuleComponents(form);
  const resetGroups = battleResetGroups(fields);
  let initializing = true;
  for (const field of fields) field.bind(form, () => {
    const draft = state.battleTestView, baseline = state.battleTestPersistedView;
    if (!draft || !baseline) return;
    if (field.recordId === "entry") {
      const name = field.fieldName, old = baseline[name], clean = draft[name] === old;
      baseline[name] = field.value;
      if (clean) {
        draft[name] = field.value;
        const input = form.querySelector(`[data-battle-test-field="${name}"]`);
        if (input) {if (input.type === "checkbox") input.checked = field.value; else input.value = String(field.value);}
        if (["scene_id", "x", "y"].includes(name)) syncScenePositionPicker(scenePicker, {
          entries: sceneEntries, sceneId: draft.scene_id, x: draft.x, y: draft.y,
        });
        if (name === "encounter_id") {
          draft.formation = battleTestFormationDraft(battleTestFormation(state.project.game_data.battle_test, field.value));
          baseline.formation = copyEditorDraft(draft.formation);
          draft.formation.forEach((slot, index) => syncBattleTestFormationSlotControls(form, index, slot));
          form.querySelectorAll('.battle-formation-slots tbody [data-reset-to-original]').forEach((button, index) => {
            button.dataset.resetToOriginal = fields.find(value =>
              value.recordId === field.value && value.slotId === index).entityHandle;
          });
          const holder = form.querySelector('[data-battle-original-control^="formation:"]');
          if (holder) {holder.dataset.battleOriginalControl = battleTestFormationResetKey(field.value);
            holder.querySelector('[data-reset-to-original]').dataset.resetToOriginal = battleTestFormationResetKey(field.value);}
        }
      }
    } else if (field.recordId === draft.encounter_id && baseline.encounter_id === draft.encounter_id) {
      const slot = field.slotId, name = field.fieldName;
      if (draft.formation[slot][name] === baseline.formation[slot][name]) draft.formation[slot][name] = field.value;
      baseline.formation[slot][name] = field.value;
      syncBattleTestFormationSlotControls(form, slot, draft.formation[slot]);
    }
    if (!initializing) {
      battlePersistedResetStates = new Map([...resetGroups].map(([key, selected]) => [key, selected.some(value => value.hasOverride)]));
      updateBattleTestEditorState();
    }
    if (form.dataset.battleFieldsReady === "true" &&
        (field.recordId === draft.encounter_id ||
          (field.recordId === "entry" && field.fieldName === "encounter_id"))) {
      void paintBattleTestPreview(form);
    }
  });
  initializing = false;
  battlePersistedResetStates = new Map([...resetGroups].map(([key, selected]) => [key, selected.some(value => value.hasOverride)]));
  bindFieldResetToOriginalButtons(form, resetGroups, {
    database: db, confirmMessage: resetConfirmation,
    beforeReset: async selected => {
      battleTestResetting = true; updateBattleTestEditorState();
      const context = await prepareBattlePageReset(selected[0].recordId);
      context.changed = selected.some(field => field.hasOverride);
      return context;
    },
    afterReset: async (_selected, context) => {
      try {await finishBattlePageReset(context); await render();}
      finally {battleTestResetting = false; if (battleTestViewPending() && !battleTestDraftError()) commitBattleTestPage();}
    },
    onError: error => {battleTestResetting = false; updateBattleTestEditorState(`恢复失败：${error.message}`);},
  });
  form.dataset.battleFieldsReady = "true";
  updateBattleTestEditorState(state.battleTestMessage);
  await paintBattleTestPreview(form);
  void refreshBattleTestOriginalStates(form).catch(error => {
    if (form.isConnected) {
      updateBattleTestEditorState(`Original 状态读取失败：${error.message}`);
    }
  });
}
