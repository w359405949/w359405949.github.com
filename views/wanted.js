// @editor-module 通缉令与勇士办事处引用所属构造、目标配置及当前存档字段。

import {editorLog} from "../core/editor-log.js";
import {$, esc, hex} from "../core/dom.js";
import {globalEventFlagHandle} from '../core/global-event-flags.js';
import {eventFlagReferenceMarkup} from '../modules/save/event-flags.js';
import {flushAllAutoSaves, trackAutoSavePreparation} from "../core/auto-save.js";
import {db} from "../core/project-db.js";
import {
  requireBrowserProjectRepository,
  resetProjectFields,
} from "../core/project-data.js";
import {currentViewUrl, replaceHistoryUrl} from "../core/router.js";
import {physicalLocationMarkup} from "../ui/physical-location.js";
import {state} from "../core/state.js";
import {interfacePreviewContext} from "../core/interface-preview-context.js";
import {machineStateControls, machineStatePreview, bindMachineStateController} from './machine-state-controller.js';
import {createSaveCurrentFieldObjects, ensureSaveCurrentFieldObjects} from "../core/save-build.js";
import {currentTextReference} from "../core/resource-index.js";
import {textRecordRuntimeWritableRanges} from '../core/text-record-project.js';
import {saveBattleCatalog} from "../core/save-page-links.js";
import {targetBattleState} from "../core/battle-state-catalog.js";
import {resolveWantedAppearanceLocations} from "../core/wanted-appearance.js";
import {
  bindFieldResetToOriginalButtons,
  resetToOriginalButton,
} from "../ui/table.js";
import {
  bindGameUiWorkbench,
  gameUiWorkbenchPreviewSelection,
  renderGameUiWorkbench,
  selectedGameUiWorkbenchNode,
} from "./game-ui-workbench.js";
import {wantedMonsterWindow, paintWantedPosterVisual, wantedDefeatedOverlayAsset} from "../modules/visual/wanted-poster-preview.js";
import {uiComponentSelectionBounds} from '../modules/visual/ui-construction-preview.js';
import {monsterFigureCanvas, paintMonsterFigureCanvases} from "../render/monster-figure.js";
import {referencePickerMarkup, bindReferencePicker, setReferencePickerValue} from "../ui/reference-picker.js";
import {renderModuleComponent} from "../ui/module-components.js";
import "../modules/monster/components.js";
import {paintVisibleSceneThumbnailCanvases} from "../modules/scene/preview.js";
import {hydrateScenePositionPicker, scenePositionPickerMarkup} from "../modules/scene/components.js";
import {CONFIRMED_WANTED_BOSS_IDS, cloneWantedDocument, isConfirmedWantedBoss, resolveWantedPreviewModel, setWantedTargetId, wantedBountyForTarget, wantedBossName, wantedTargetId, wantedTargetPair, wantedDefeatedEventFlag, wantedRecordId as recordId} from "./wanted-preview.js";


let wantedPreviewPaintRevision = 0;
let wantedImportedDocument = null;
let wantedImportedRepository = null;
let wantedImportedRevision = null;
let wantedPersistedAssetDirty = null;
let wantedFieldsByPair = new Map();
let wantedViewProject = null;
let wantedEncounterDocument = null;
let wantedEncounterLoading = null;
let wantedAppearanceReview = null;
let wantedAppearanceStory = null;
let wantedSceneActorsDocument = null;
let wantedAppearanceVersions = [];
const wantedSaveFields = createSaveCurrentFieldObjects(state);

function wantedDefeatedValue(targetId) {
  if (!wantedSaveFields.ready()) return null;
  const {wanted} = targetBattleState(saveBattleCatalog(), targetId);
  if (!wanted) return null;
  const slot = state.savePageSlot === 2 ? 2 : 1;
  const flag = wanted.defeat_flag.toString(16).toUpperCase().padStart(2, "0");
  const field = wantedSaveFields.find(`save.slot.${slot}.global_event_flag.${flag}`);
  return field ? Number(field.value) > 0 : null;
}

function wantedPosterStampValue(targetId) {
  if (!wantedSaveFields.ready()) return null;
  const flag = hex(wantedDefeatedEventFlag(targetId, wantedDocument()), 2).slice(2);
  const slot = state.savePageSlot === 2 ? 2 : 1;
  return Boolean(wantedSaveFields.object(`save.slot.${slot}.global_event_flag.${flag}`).value);
}

function wantedDefeatedLabel(targetId) {
  const value = wantedDefeatedValue(targetId);
  return value === null ? "—" : value ? "已击破" : "未击破";
}

function wantedDefeatedMarkup(targetId, {named = false} = {}) {
  const slot = state.savePageSlot === 2 ? 2 : 1;
  const {wanted, entries} = targetBattleState(saveBattleCatalog(), targetId);
  const status = (flagId, label, activeLabel, attribute) => {
    const flag = flagId.toString(16).toUpperCase().padStart(2, "0");
    const field = wantedSaveFields.ready()
      ? wantedSaveFields.find(`save.slot.${slot}.global_event_flag.${flag}`) : null;
    return `<span ${attribute}="${targetId}">${label}：${field ? Number(field.value) ? activeLabel : "未" + activeLabel.slice(1) : "—"}</span>
      ${eventFlagReferenceMarkup(flagId, {slot, label: named ? `${label}标志` : null, attributes: attribute === "data-wanted-defeated-status"
        ? `data-wanted-save-link="${targetId}"` : ''})}`;
  };
  if (wanted) return status(wanted.defeat_flag, "击破", "已击破", "data-wanted-defeated-status")
    + " · " + status(wanted.claim_flag, "领取", "已领取", "data-wanted-claimed-status");
  const flags = [...new Set(entries.filter(row => row.shadowed_by == null)
    .map(row => row.suppression_flag ?? row.victory_flag).filter(Number.isInteger))];
  return flags.map(flag => status(flag, entries.some(row => row.one_time && row.suppression_flag === flag)
    ? "击破" : "战斗结果", "已击破", "data-wanted-defeated-status")).join(" · ")
    + `${flags.length ? " · " : "击破：— · "}<span data-wanted-claimed-status="${targetId}">领取：—</span>`;
}

function wantedProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function assertWantedProjectSession(repository, revision) {
  if (state.projectRepository !== repository ||
      wantedProjectRevision() !== revision) {
    throw new Error("项目会话已切换，请在当前通缉令页重试");
  }
}

function wantedDocument() {
  return state.project?.wanted || null;
}

function wantedConfiguration() {
  return state.project?.game_data?.wanted || null;
}

function wantedNumericCodes() {
  return state.project?.game_data?.items?.equipment_editor?.numeric_codes || [];
}

function wantedMonsters() {
  return (state.project?.game_data?.monsters?.records || []).map(monster => {
    const reference = monster.name_reference?.node_id || recordId(
      Number.parseInt(monster.name_text_region || "01", 16), Number(monster.name_text_record_id));
    return {...monster, name: currentTextReference(reference).label || monster.name};
  });
}

function wantedBountyCodes() {
  const readonly = state.project?.wanted?.bounty_code_table?.entries?.find(row =>
    Number(row.wanted_id) === 0);
  return [...(readonly ? [{wanted_id: 0, raw_code: readonly.code}] : []),
    ...(state.wantedView?.bounty_codes || [])];
}

function wantedBountyAmount(id) {
  return wantedBountyForTarget(id, wantedBountyCodes(), wantedNumericCodes(), 0);
}

function wantedBountyDirty(id) {
  if (!wantedImportedDocument) return wantedAssetDirty();
  return state.wantedView?.bounty_codes?.[id - 1]?.raw_code !==
    wantedImportedDocument.bounty_codes?.[id - 1]?.raw_code;
}

export function ensureWantedView() {
  if (state.wantedView && wantedViewProject === state.project) return;
  const document = wantedConfiguration();
  if (!document) return;
  state.wantedView = cloneWantedDocument(document);
  wantedViewProject = state.project;
  state.wantedMessage = "";
  wantedFieldsByPair = new Map();
  wantedImportedDocument = null;
  wantedImportedRepository = null;
  wantedImportedRevision = null;
  wantedPersistedAssetDirty = null;
  wantedEncounterDocument = null;
  wantedEncounterLoading = null;
  wantedAppearanceReview = null;
  wantedAppearanceStory = null;
  wantedSceneActorsDocument = null;
  wantedAppearanceVersions = [];
}

function wantedAppearance(targetId) {
  if (!wantedEncounterDocument) return "";
  const entries = state.project?.scenes?.editable_scenes || [];
  const {locations, missing} = resolveWantedAppearanceLocations({targetId,
    review: wantedAppearanceReview, story: wantedAppearanceStory,
    actors: wantedSceneActorsDocument, zones: wantedEncounterDocument, scenes: entries});
  return `<span class="wanted-appearance"><span class="wanted-location-list">${locations.map(location =>
    `<span class="wanted-location">${scenePositionPickerMarkup({entries, ...location,
      x: null, y: null, readOnly: true, deferCandidates: true,
      positionText: location.sources.join(' · '),
    })}</span>`).join('')}</span>${missing.map(message => `<small>${esc(message)}</small>`).join('')}</span>`;
}

const WANTED_APPEARANCE_RESOURCES = ['scene-encounter-zone', 'scene-actor', 'encounter-event-flag-map'];

function loadWantedEncounterDocument(rerender) {
  if (wantedEncounterDocument && WANTED_APPEARANCE_RESOURCES.some((id, index) =>
    wantedAppearanceVersions[index] !== (db.metadata(id)?.version ?? null))) {
    wantedEncounterDocument = null;
  }
  if (wantedEncounterDocument || wantedEncounterLoading) return;
  const project = state.project;
  const loading = Promise.all([
    db.getDocument("scene-encounter-zone", null), db.getDocument("scene-actor", null),
    db.getResourceDocument('encounter-event-flag-map', null), db.getDocument('project.story', null),
  ]).then(([value, actors, flags, story]) => {
    if (state.project !== project) return;
    const missing = [!value && '遇敌区', !actors && '场景角色',
      !flags?.battle_state_review && '战斗入口对应', !story && '入场剧情'].filter(Boolean);
    if (missing.length) throw new Error(`缺少${missing.join('、')}数据`);
    wantedEncounterDocument = value;
    wantedSceneActorsDocument = actors;
    wantedAppearanceReview = flags.battle_state_review;
    wantedAppearanceStory = story;
    wantedAppearanceVersions = WANTED_APPEARANCE_RESOURCES.map(id => db.metadata(id)?.version ?? null);
    return rerender();
  }).catch(error => {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`出现方式读取失败：${error.message}`);});
  wantedEncounterLoading = loading;
  void loading.finally(() => {
    if (wantedEncounterLoading === loading) wantedEncounterLoading = null;
  });
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function wantedAssetDirty() {
  const metadata = db.metadata("wanted-record");
  if (metadata) return Boolean(metadata.dirty);
  if (wantedImportedRepository === state.projectRepository &&
      wantedImportedRevision === wantedProjectRevision() &&
      typeof wantedPersistedAssetDirty === "boolean") {
    return wantedPersistedAssetDirty;
  }
  return false;
}

function wantedPairDirty(index) {
  const checkIndex = index === "default" ? "default" : Number(index);
  if (!wantedImportedDocument) {
    // The immutable base is loaded immediately after binding. Until then,
    // retain a conservative enabled state when this asset or local draft is dirty.
    return wantedAssetDirty();
  }
  return !sameJson(
    wantedTargetPair(state.wantedView, checkIndex),
    wantedTargetPair(wantedImportedDocument, checkIndex),
  );
}

function wantedSelectedPairDirty() {
  return wantedPairDirty(state.wantedTargetIndex);
}

async function wantedResetSnapshot(repository) {
  const revision = wantedProjectRevision();
  const [resolved, original, fields] = await Promise.all([
    db.readResource("wanted-record"), repository.getOriginal("wanted-record"), db.getFields("wanted-record"),
  ]);
  const imported = original?.value;
  if (!imported?.document?.default_pair || !Array.isArray(imported.document.targets)) {
    throw new Error("wanted-record 的 Original / 导入值不可用");
  }
  assertWantedProjectSession(repository, revision);
  wantedImportedDocument = cloneWantedDocument(imported.document);
  wantedImportedRepository = repository;
  wantedImportedRevision = revision;
  wantedPersistedAssetDirty = fields.some(field => field.hasOverride);
  return {imported, revision, fields, version: resolved.version};
}

function wantedEditorStatus() {
  return state.wantedMessage || "";
}

function selectedWantedTargetId() {
  return wantedTargetId(
    state.wantedView,
    state.wantedTargetIndex,
    state.wantedTargetSide,
  );
}

function effectiveWantedPair(staticPair, editablePair) {
  if (!staticPair || !editablePair) return staticPair;
  const highTarget = Number(editablePair.high_target_id);
  const lowTarget = Number(editablePair.low_target_id);
  return {
    ...staticPair,
    packed: (highTarget << 4) | lowTarget,
    packed_hex: hex((highTarget << 4) | lowTarget, 2),
    high: {
      ...(staticPair.high || {}),
      formation_id: highTarget,
      formation_id_hex: hex(highTarget, 2),
    },
    low: {
      ...(staticPair.low || {}),
      formation_id: lowTarget,
      formation_id_hex: hex(lowTarget, 2),
    },
  };
}

function sceneNamesById() {
  const entries = state.project?.scenes?.editable_scenes || [];
  return new Map(entries.map(entry => [Number(entry.id), entry]));
}

function wantedPreviewById(previewId) {
  return (state.project?.ui?.construction?.menu_dispatch_data?.previews || [])
    .find(item => item.id === previewId) || null;
}

const WANTED_OFFICE_SCREENS = [
  {node: 'wanted:office-menu', preview: 'constructor:wanted-information-office-menu', label: '勇士办事处菜单'},
  {node: 'wanted:intelligence', preview: 'constructor:wanted-information-intelligence', label: '通缉情报'},
  {node: 'wanted:bounty-claim', preview: 'constructor:wanted-information-bounty-claim', label: '领奖确认'},
];
const WANTED_MACHINE_DEFINITION = {commandId: 0x25};

function selectedWantedOfficeScreen(document) {
  const node = selectedGameUiWorkbenchNode(WANTED_UI_NAMESPACE, wantedUiNodes(document))?.id;
  return WANTED_OFFICE_SCREENS.find(screen => screen.node === node) || null;
}

function resolveWantedOfficePreview(canvas) {
  if (!canvas?.dataset.wantedUiWorkbench) return null;
  const screen = selectedWantedOfficeScreen(wantedDocument());
  const preview = screen && wantedPreviewById(screen.preview);
  return preview ? machineStatePreview({...preview, runtime_context: {...preview.runtime_context,
    save_slot: interfacePreviewContext().slot}}, WANTED_MACHINE_DEFINITION) : null;
}

/** Resolve a poster through the WANTED component's one construction model. */
function resolveWantedPreview(
  previewOrId = "constructor:wanted-poster-screen",
  {targetId = null, defeated = null} = {},
) {
  const preview = typeof previewOrId === "object"
    ? previewOrId
    : wantedPreviewById(previewOrId);
  return resolveWantedPreviewModel({
    preview,
    formations: state.project?.game_data?.battle_test?.formations || [],
    monsters: wantedMonsters(),
    bountyCodes: wantedBountyCodes(),
    numericCodes: wantedNumericCodes(),
    targetId: targetId ?? selectedWantedTargetId() ?? 1,
    defeated: defeated ?? wantedPosterStampValue(targetId ?? selectedWantedTargetId() ?? 1),
    defeatedOverlay: wantedDefeatedOverlayAsset(preview, wantedDocument()),
    wantedDocument: wantedDocument(),
  });
}

async function paintWantedPreviewCanvasWithResources(
  canvas,
  {
    previewOrId = canvas?.dataset.wantedPreview
      || "constructor:wanted-poster-screen",
    targetId = null,
    defeated = null,
    isCurrent = () => true,
  } = {},
) {
  if (!canvas || !isCurrent()) return null;
  const officeScreen = canvas.dataset.wantedUiWorkbench && selectedWantedOfficeScreen(wantedDocument());
  const office = resolveWantedOfficePreview(canvas);
  if (officeScreen) {
    if (!office) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.wantedPreviewRenderer = 'published-wanted-office';
      return null;
    }
    const {paintUiConstructionSemanticPreview} = await import('../modules/visual/ui-construction-preview.js');
    const result = await paintUiConstructionSemanticPreview(canvas, office, {isCurrent});
    if (result && isCurrent()) canvas.dataset.wantedPreviewRenderer = 'published-wanted-office';
    return result;
  }
  const resolved = resolveWantedPreview(previewOrId, {targetId, defeated});
  if (!resolved) return null;
  if (canvas.dataset.wantedUiWorkbench) {
    const machine = machineStatePreview(resolved.preview, WANTED_MACHINE_DEFINITION);
    if (!machine || machine.machine_return) {
      if (!machine) {canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return null;}
      const {paintUiConstructionSemanticPreview} = await import('../modules/visual/ui-construction-preview.js');
      return paintUiConstructionSemanticPreview(canvas, machine, {isCurrent});
    }
  }
  const selection = canvas.dataset.wantedUiWorkbench
    ? gameUiWorkbenchPreviewSelection(
        WANTED_UI_NAMESPACE,
        wantedUiNodes(wantedDocument()),
      )
    : null;
  await paintWantedPosterVisual(
    canvas, resolved, selection ? {...resolved.preview, selection} : resolved.preview,
    isCurrent,
  );
  if (!isCurrent()) return null;
  canvas.dataset.wantedPreviewRenderer = "dedicated-wanted-poster";
  canvas.dataset.wantedPreviewTarget = String(resolved.targetId);
  canvas.dataset.wantedPreviewFormation = String(resolved.formationId);
  canvas.dataset.wantedPreviewBounty = String(resolved.bounty);
  canvas.dataset.wantedPreviewDefeated = String(resolved.defeated);
  canvas.dataset.wantedPreviewDefeatedFlag = String(
    resolved.defeatedEventFlag,
  );
  canvas.dataset.wantedPreviewAccuracy = resolved.accuracy;
  return resolved;
}

/** Paint one WANTED poster for any consumer, including a story stage. */
export async function paintWantedPreviewCanvas(canvas, options = {}) {
  return paintWantedPreviewCanvasWithResources(canvas, options);
}

/** Paint every dedicated WANTED canvas; generic menu painting intentionally ignores it. */
export async function paintWantedPreviewCanvases() {
  const canvases = [...document.querySelectorAll("canvas[data-wanted-preview]")];
  if (!canvases.length) return;
  const revision = ++wantedPreviewPaintRevision;
  await Promise.all(canvases.map(canvas => paintWantedPreviewCanvasWithResources(
    canvas,
    {
      isCurrent: () => (
        revision === wantedPreviewPaintRevision && canvas.isConnected
      ),
    },
  )));
}

function updateWantedEditorStatus(message = null, root = document) {
  if (message !== null) state.wantedMessage = message;
  const selectedDirty = wantedSelectedPairDirty();
  const status = root.querySelector("#wanted-save-state");
  if (status) {
    status.textContent = wantedEditorStatus();
    status.hidden = !state.wantedMessage;
  }
  const originalState = root.querySelector("#wanted-original-state");
  if (originalState) {
    originalState.textContent = wantedImportedDocument
      ? selectedDirty ? "● 当前项已修改" : "当前项与 Original 一致"
      : "正在核对当前项 Original…";
    originalState.classList.toggle("dirty", selectedDirty);
  }
  const allResetButtons = root.querySelectorAll("[data-reset-to-original]");
  for (const button of allResetButtons) {
    const rowId = button.dataset.resetToOriginal;
    const isDirty = rowId.startsWith("bounty:")
      ? wantedBountyDirty(Number(rowId.slice(7))) : wantedPairDirty(rowId);
    button.dataset.originalDirty = String(isDirty);
    button.classList.toggle("dirty", isDirty);
    button.disabled = !isDirty;
  }
}

async function prepareWantedReset(index = state.wantedTargetIndex) {
  const repository = requireBrowserProjectRepository(state);
  await flushAllAutoSaves();
  const snapshot = await wantedResetSnapshot(repository);
  const isBounty = String(index).startsWith("bounty:");
  const resetIndex = index === "default" ? "default" : Number(isBounty ? String(index).slice(7) : index);
  const handle = isBounty ? `wanted-record:bounty:${resetIndex}`
    : resetIndex === "default" ? "wanted-record:default-pair" : `wanted-record:target:${resetIndex}`;
  const selected = snapshot.fields.filter(field => field.entityHandle === handle);
  if (selected.length !== (isBounty ? 1 : 2)) throw new Error("通缉字段绑定不完整");
  return {repository, snapshot, expectedVersion: snapshot.version, resetIndex, selected,
    changed: selected.some(field => field.hasOverride)};
}

async function finishWantedReset(context, refresh) {
  const {repository, snapshot, changed} = context;
  assertWantedProjectSession(repository, snapshot.revision);
  const reset = await db.readResource("wanted-record");
  wantedPersistedAssetDirty = Boolean(reset.dirty);
  state.wantedView = cloneWantedDocument(reset.value.document);
  state.wantedMessage = changed
    ? "当前项已重置；其他项的编辑已保留" : "当前项已是导入值；其他项的编辑未改变";
  await refresh();
}


const wantedFieldBindings = new WeakMap();
async function bindWantedFieldControls(root = document.querySelector("#content"), refresh = async () => {}) {
  if (!root) return;
  for (const unbind of wantedFieldBindings.get(root) || []) unbind();
  const bindings = [];
  wantedFieldBindings.set(root, bindings);
  const fields = await db.getFields("wanted-record");
  if (!root.isConnected || wantedFieldBindings.get(root) !== bindings) return;
  wantedFieldsByPair = new Map(fields.map(field => [
    `${field.recordId || "default"}:${field.fieldName}`, field,
  ]));
  let initializing = true, repaintQueued = false;
  for (const field of fields) bindings.push(field.bind(root, (host, value) => {
    const index = field.recordId || "default";
    if (field.fieldName === "raw_code") {
      const row = state.wantedView?.bounty_codes?.[Number(index) - 1];
      if (!row) return;
      row.raw_code = value;
      const input = host.querySelector(`[data-wanted-bounty-id="${index}"]`);
      if (input) input.value = String(wantedBountyAmount(Number(index)));
      if (!initializing && !repaintQueued) {
        repaintQueued = true;
        queueMicrotask(() => {
          repaintQueued = false;
          if (root.isConnected && wantedFieldBindings.get(root) === bindings)
            void paintWantedPreviewCanvases().catch(error => {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`预览失败：${error.message}`);});
        });
      }
      wantedPersistedAssetDirty = fields.some(item => item.hasOverride);
      updateWantedEditorStatus(null, host);
      return;
    }
    const pair = wantedTargetPair(state.wantedView, index);
    if (!pair) return;
    pair[field.fieldName] = value;
    const targetSide = field.fieldName === "high_target_id" ? "high" : "low";
    const select = host.querySelector(
      `[data-wanted-select-target="${index}"][data-wanted-target-side="${targetSide}"]`
    );
    if (select) {
      select.value = String(value);
      const picker = select.closest("[data-module-reference-picker]");
      if (picker) void setReferencePickerValue(picker, value, {paint: paintMonsterFigureCanvases});
    }
    if (String(state.wantedTargetIndex) === String(index) && state.wantedTargetSide === targetSide) {
      if (!initializing && !repaintQueued) {
        repaintQueued = true;
        queueMicrotask(() => {
          repaintQueued = false;
          if (root.isConnected && wantedFieldBindings.get(root) === bindings)
            void paintWantedPreviewCanvases().catch(error => {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`预览失败：${error.message}`);});
        });
      }
    }
    wantedPersistedAssetDirty = fields.some(item => item.hasOverride);
    updateWantedEditorStatus(null, host);
  }));
  initializing = false;
  await paintWantedPreviewCanvases();
  const selections = new Map(fields.map(field => [field.fieldName === "raw_code"
    ? `bounty:${field.recordId}` : String(field.recordId || "default"),
    fields.filter(item => item.entityHandle === field.entityHandle)]));
  bindFieldResetToOriginalButtons(root, selections, {database: db,
    beforeReset: selection => prepareWantedReset(selection[0].fieldName === "raw_code"
      ? `bounty:${selection[0].recordId}` : selection[0].recordId || "default"),
    afterReset: (_selection, context) => finishWantedReset(context, refresh),
    confirmMessage: itemId => String(itemId).startsWith("bounty:")
      ? `重置目标 ${String(itemId).slice(7)} 的赏金？其他目标保持不变。`
      : itemId === "default"
      ? "重置默认目标对的目标？其他 12 条场景记录不会改变。"
      : `重置场景 ${itemId} 的通缉目标？其他记录不会改变。`,
    onError: error => updateWantedEditorStatus(`重置失败：${error.message}`),
  });
  root.dataset.wantedFieldsReady = "true";
}

/** Bind the target-pair fields and repaint from their shared Working view. */
export function bindWantedEditor({rerender, renderPreview = paintWantedPreviewCanvases} = {}) {
  const refresh = () => {
    replaceHistoryUrl(currentViewUrl());
    if (typeof rerender === "function") return Promise.resolve(rerender());
    updateWantedEditorStatus();
    return Promise.resolve(renderPreview());
  };
  if (state.view === "wanted-ui" && !wantedSaveFields.ready()) {
    const project = state.project;
    const view = state.view;
    void ensureSaveCurrentFieldObjects(state, wantedSaveFields).then(() => {
      if (state.project === project && state.view === view) return refresh();
    }).catch(error => {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`存档读取失败：${error.message}`);});
  }
  if (state.view === "wanted") {
    loadWantedEncounterDocument(refresh);
    const root = document.querySelector("#wanted-record-page");
    root?.querySelectorAll("[data-scene-position-picker]").forEach(picker =>
      hydrateScenePositionPicker(picker, {entries: state.project?.scenes?.editable_scenes || []}));
    if (root) void paintVisibleSceneThumbnailCanvases(root, {
      isCurrent: () => state.view === "wanted",
    })
      .catch(error => {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`场景预览失败：${error.message}`);});
  }
  document.querySelector("[data-wanted-target-row]")?.addEventListener("change", event => {
    state.wantedTargetIndex = event.currentTarget.value === "default"
      ? "default" : Number(event.currentTarget.value);
    refresh().catch(error => editorLog.error("预览", `通缉预览失败：${error.message || error}`, error));
  });
  document.querySelector("select[data-wanted-preview-side]")?.addEventListener("change", event => {
    state.wantedTargetSide = event.currentTarget.value === "low" ? "low" : "high";
    refresh().catch(error => editorLog.error("预览", `通缉预览失败：${error.message || error}`, error));
  });
  document.querySelectorAll("[data-wanted-select-target]").forEach(select => {
    select.addEventListener("change", event => {
      const rowId = event.currentTarget.dataset.wantedSelectTarget;
      const index = rowId === "default" ? "default" : Number(rowId);
      const side = event.currentTarget.dataset.wantedTargetSide === "low" ? "low" : "high";
      const field = wantedFieldsByPair.get(`${index}:${side}_target_id`);
      if (!field) {
        updateWantedEditorStatus("目标字段尚未就绪");
        return;
      }
      const raw = event.currentTarget.value;
      const targetId = Number(raw);
      if (!raw || !Number.isInteger(targetId) || targetId < 0 || targetId > 15 ||
          ![...event.currentTarget.options].some(option => option.value === raw)) {
        event.currentTarget.value = String(field.value);
        updateWantedEditorStatus("通缉目标序号必须是已列出的 0–15 整数");
        return;
      }
      setWantedTargetId(state.wantedView, index, side, targetId);
      state.wantedTargetIndex = index;
      state.wantedTargetSide = side;
      state.wantedMessage = "";
      void trackAutoSavePreparation(db.writeFields([{field, value: targetId}])).then(() => {
        updateWantedEditorStatus();
        return refresh();
      }).catch(error => {
        editorLog.error("通缉", `操作失败：${error?.message || error}`, error);
        setWantedTargetId(state.wantedView, index, side, field.value);
        updateWantedEditorStatus(`保存失败：${error?.message || error}`);
      });
    });
  });
  document.querySelectorAll("[data-wanted-boss-picker]").forEach(picker =>
    bindReferencePicker(picker, {paint: paintMonsterFigureCanvases}));
  bindReferencePicker(document.querySelector("[data-wanted-target-row-picker]"));
  document.querySelectorAll("[data-wanted-bounty-id]").forEach(input => {
    input.addEventListener("change", event => {
      const id = Number(event.currentTarget.dataset.wantedBountyId);
      const field = wantedFieldsByPair.get(`${id}:raw_code`);
      const amount = Number(event.currentTarget.value);
      const candidates = wantedNumericCodes().filter(row => row.available && row.value === amount);
      if (!field || !event.currentTarget.value || !Number.isInteger(amount) || !candidates.length) {
        event.currentTarget.value = String(wantedBountyAmount(id));
        updateWantedEditorStatus("赏金必须是共享数值码表中可编码的金额");
        return;
      }
      const code = candidates.some(row => row.raw_code === field.value)
        ? field.value : candidates[0].raw_code;
      state.wantedView.bounty_codes[id - 1].raw_code = code;
      state.wantedMessage = "";
      void trackAutoSavePreparation(db.writeFields([{field, value: code}])).then(() => {
        updateWantedEditorStatus();
        return refresh();
      }).catch(error => {
        editorLog.error("通缉", `操作失败：${error?.message || error}`, error);
        state.wantedView.bounty_codes[id - 1].raw_code = field.value;
        updateWantedEditorStatus(`保存失败：${error?.message || error}`);
      });
    });
  });
  const resetRoot = document.querySelector("#content") || document;
  void bindWantedFieldControls(resetRoot, refresh).catch(error =>
    {editorLog.error("通缉", `操作失败：${error?.message || error}`, error); return updateWantedEditorStatus(`字段读取失败：${error.message}`);});
  if (document.querySelector("[data-wanted-select-target]")) {
    const repository = state.projectRepository;
    if (repository) {
      wantedResetSnapshot(repository)
        .then(() => updateWantedEditorStatus(state.wantedMessage))
        .catch(error => {
          editorLog.error("通缉", `操作失败：${error?.message || error}`, error);
          if (state.projectRepository === repository) {
            updateWantedEditorStatus(`Original 读取失败：${error.message}`);
          }
        });
    }
  }
}

function wantedTargetRowOptions() {
  const scenes = sceneNamesById();
  return [
    `<option value="default" ${state.wantedTargetIndex === "default" ? "selected" : ""}>默认目标（未命中场景）</option>`,
    ...(state.wantedView?.targets || []).map(row => {
      const selected = Number(state.wantedTargetIndex) === Number(row.index);
      const scene = scenes.get(Number(row.scene_id));
      return `<option value="${Number(row.index)}" ${selected ? "selected" : ""}>${
        String(row.index).padStart(2, "0")
      } · ${esc(scene?.name || `场景 ${hex(Number(row.scene_id), 2)}`)}</option>`;
    }),
  ].join("");
}

function wantedBossSelectOptions(selectedId) {
  const formations = state.project?.game_data?.battle_test?.formations || [];
  const monsters = wantedMonsters();
  const bountyTable = state.project?.wanted?.bounty_code_table || null;
  const selectedNum = Number(selectedId);
  return CONFIRMED_WANTED_BOSS_IDS.map(id => {
    const isSelected = id === selectedNum;
    const name = wantedBossName(id, {formations, monsters, bountyTable});
    return `<option value="${id}" ${isSelected ? "selected" : ""}>${esc(name)}</option>`;
  }).join("");
}

function wantedTargetRowPicker() {
  const scenes = sceneNamesById();
  return referencePickerMarkup({
    moduleId: "wanted-record", value: state.wantedTargetIndex, label: "场景配置",
    grouped: true, compact: true, previewPanel: true,
    componentAttributes: "data-wanted-target-row-picker",
    items: [{value: "default", label: "默认目标", description: "未命中场景",
      group: "default", groupLabel: "默认"},
      ...(state.wantedView?.targets || []).map(row => ({
        value: row.index, label: `场景配置 ${Number(row.index)}`,
        group: "scene", groupLabel: "场景",
        description: scenes.get(Number(row.scene_id))?.name || `场景 ${hex(Number(row.scene_id), 2)}`,
        meta: `目标 ${row.high_target_id} / ${row.low_target_id}`,
      }))],
    controlMarkup: `<select data-wanted-target-row>${wantedTargetRowOptions()}</select>`,
  });
}

function wantedTargetLocationControls() {
  const formations = state.project?.game_data?.battle_test?.formations || [];
  const monsters = wantedMonsters();
  const bountyTable = state.project?.wanted?.bounty_code_table || null;
  const currentTargetId = selectedWantedTargetId() ?? 0;
  const currentBossName = wantedBossName(currentTargetId, {formations, monsters, bountyTable});
  return `${wantedTargetRowPicker()}
    <label><small>目标位置</small><select data-wanted-preview-side>
      <option value="high" ${state.wantedTargetSide === "high" ? "selected" : ""}>目标 1</option>
      <option value="low" ${state.wantedTargetSide === "low" ? "selected" : ""}>目标 2</option>
    </select></label>
    ${wantedBossPicker(currentTargetId, state.wantedTargetIndex, state.wantedTargetSide)}
    <label><small>赏金 G</small>${currentTargetId > 0 && currentTargetId <= 11
      ? `<input type="number" min="0" step="1" data-wanted-bounty-id="${currentTargetId}" value="${wantedBountyAmount(currentTargetId)}" aria-label="${esc(currentBossName)}赏金">`
      : `<b>${wantedBountyAmount(currentTargetId)}</b>`}</label>`;
}

function wantedBossPicker(selectedId, index, side) {
  const formations = state.project?.game_data?.battle_test?.formations || [];
  const monsters = wantedMonsters();
  const bountyTable = state.project?.wanted?.bounty_code_table;
  const items = CONFIRMED_WANTED_BOSS_IDS.map(id => {
    const name = wantedBossName(id, {formations, monsters, bountyTable});
    const formation = formations.find(row => Number(row.id) === id);
    const monsterId = formation?.slots?.find(slot => Number(slot.count) > 0)?.monster_id;
    const entry = monsters.find(row => Number(row.id) === Number(monsterId));
    return {value: String(id), label: `目标 ${id}`, description: name,
      preview: entry ? renderModuleComponent("monster-profile", "preview", {entry, value: monsterId, box: 48}) : ""};
  });
  return referencePickerMarkup({moduleId: "wanted-record", value: selectedId,
    label: "赏金首", items, compact: true, previewPanel: true, componentAttributes: "data-wanted-boss-picker",
    controlMarkup: `<select data-wanted-select-target="${esc(index)}" data-wanted-target-side="${side}">${wantedBossSelectOptions(selectedId)}</select>`});
}

const WANTED_UI_NAMESPACE = "wanted-poster";

function wantedUiNodes(document) {
  const resolved = resolveWantedPreview(
    document?.web_reconstruction?.preview_id || "constructor:wanted-poster-screen",
  );
  const targetId = resolved?.targetId ?? selectedWantedTargetId() ?? 1;
  const layers = resolved?.preview.layers || [];
  const layout = layers.find(layer => layer.kind === 'layout');
  const body = layers.find(layer => layer.kind === 'script' && layer.runtime_content);
  const nameRecord = body?.runtime_record_pair;
  const text = state.project?.text_record_edits?.records?.[body?.record];
  const bountyRanges = (text?.protected_ranges || []).filter(range =>
    range.semantic === 'format-runtime-value-df');
  const bountyEnd = bountyRanges.length ? Math.max(...bountyRanges.map(range => range.offset + range.length)) : null;
  const currencyRanges = text && bountyEnd !== null ? textRecordRuntimeWritableRanges(text)
    .filter(range => range.offset >= bountyEnd) : [];
  const titleRanges = (state.project?.text_record_edits?.records?.[layout?.record]?.protected_ranges || [])
    .filter(range => range.semantic === 'wanted-title');
  const titleBounds = uiComponentSelectionBounds(titleRanges.map(range => ({...range,
    recordId: layout?.record})), {record_id: layout?.record, ranges: titleRanges});
  const monsterWindow = document?.monster_window?.layout_record === layout?.record
    ? wantedMonsterWindow(document) : null;
  return [
    {
      id: "wanted:screen", kind: "screen", label: "通缉令界面",
      servicePreview: wantedPreviewById('constructor:wanted-poster-screen'),
      detail: "画面 · 256×240 像素", depth: 0,
      facts: [
        {label: "画面来源", value: "通缉令画面构造", handle: "constructor:wanted-poster-screen"},
        {label: "当前目标", value: resolved?.boss?.name || `目标 ${targetId}`},
        {label: "当前赏金", value: `${resolved?.bounty ?? 0}G`},
      ],
      note: "固定标题、海报底板、动态目标与赏金各自引用权威基础资源；目标可在“目标配置与场景”分页修改。",
    },
    {
      id: "wanted:layout", kind: "layout", label: "海报底板与布局",
      detail: `布局 · ${layout?.record || '—'}`, depth: 1,
      selection: {record_id: layout?.record},
      facts: [
        {label: "布局记录", value: layout?.record || '—', mono: true},
        {label: "来源", value: "通缉令画面构造"},
      ],
      note: "纸张、边框与 WANTED 图案由同一布局记录拥有；这里不复制第二套海报绘制。",
    },
    {
      id: "wanted:title", kind: "image", label: "标题图案",
      detail: `图像 · ${layout?.record || '—'} 固定图块`, depth: 1,
      selection: titleBounds ? {record_id: layout?.record, ranges: titleRanges, bounds: titleBounds} : null,
      facts: [
        {label: "来源", value: layout?.record || '—', mono: true},
        {label: '标题范围', value: titleBounds ? '当前字段范围' : '缺失'},
        {label: "写回", value: "布局图块当前只读"},
      ],
      note: "标题范围引用正文声明的只读图块组件。",
    },
    {
      id: "wanted:monster", kind: "image", label: "目标怪物图形",
      detail: "动态图像 · 固定编队代表图", depth: 1,
      selection: monsterWindow ? {bounds: monsterWindow} : null,
      facts: [
        {label: "固定编队", value: String(resolved?.formationId ?? "—")},
        {label: "代表图数", value: String(resolved?.representatives?.length || 0)},
        {label: '图像窗口', value: monsterWindow ? '当前声明范围' : '缺失'},
        {label: '放置关系', value: resolved?.monsterPlacement ? '当前声明' : '缺失'},
      ],
      note: "图形由当前目标对应的固定编队和怪物图像资源生成，不在界面分页修改怪物属性。",
    },
    {
      id: "wanted:name", kind: "dynamic", label: "目标名称",
      detail: `动态文字 · ${nameRecord}`, depth: 1,
      selection: {record_id: nameRecord},
      facts: [
        {label: "名称记录", value: nameRecord, mono: true},
        {label: "当前名称", value: resolved?.boss?.name || "—"},
        {label: "编辑位置", value: "目标 / 名称数据"},
      ],
      note: "目标名由通缉目标配置选择，不是海报固定字段名；这里只显示它在当前画面中的位置。",
    },
    {
      id: "wanted:bounty", kind: "dynamic", label: "赏金数值",
      detail: "动态数值 · provider $DF", depth: 1,
      selection: {record_id: body?.record, ranges: bountyRanges},
      facts: [
        {label: "当前赏金", value: String(resolved?.bounty ?? 0)},
        {label: "提供器", value: "$DF", mono: true},
      ],
      note: "赏金是目标配置派生值，不会被当成界面文字保存。",
    },
    {
      id: "wanted:currency", kind: "text", label: "赏金单位",
      detail: `文本 · ${body?.record || '—'} · 可编辑`, depth: 1,
      recordId: body?.record,
      editorId: "wanted:currency",
      editorLabel: "赏金单位",
      ranges: currencyRanges,
      selection: {
        record_id: body?.record,
        ranges: currencyRanges,
      },
      facts: [{label: "文字记录", value: body?.record || '—', mono: true}],
      description: "只编辑赏金数值后的固定单位；目标名称和数值提供器保持不变。",
    },
    {
      id: "wanted:defeated", kind: "image", label: "已击破覆盖图",
      detail: "动态图像 · 事件位控制", depth: 1,
      selection: {bounds: {
        x: resolved?.defeatedOverlay.x,
        y: resolved?.defeatedOverlay.y,
        width: resolved?.defeatedOverlay.width,
        height: resolved?.defeatedOverlay.height,
      }},
      facts: [
        {label: "当前状态", value: wantedDefeatedLabel(resolved?.targetId ?? 1)},
        {label: "存档槽", value: state.savePageSlot === 2 ? "2" : "1"},
        {label: "覆盖图事件位", value: resolved?.defeatedEventFlag == null ? '—'
          : globalEventFlagHandle(resolved.defeatedEventFlag), referenceLabel: '领赏标志'},
      ],
      note: "击破状态读取当前存档等级；覆盖图按游戏路径读取领赏事件位。",
    },
    ...WANTED_OFFICE_SCREENS.filter(screen => wantedPreviewById(screen.preview)).map(screen => ({
      id: screen.node, kind: 'screen', label: screen.label, depth: 0,
      servicePreview: wantedPreviewById(screen.preview),
      detail: '画面 · application-command:25',
      facts: [{label: '画面来源', value: `${screen.label}画面构造`, handle: screen.preview},
        ...wantedPreviewById(screen.preview).layers.filter(layer => layer.kind === 'script')
          .map(layer => ({label: '文字记录', value: layer.record || '—', mono: true}))],
    })),
  ];
}

function renderWantedPosterWorkbench(document) {
  const previewId = document.web_reconstruction?.preview_id
    || "constructor:wanted-poster-screen";
  if (!wantedPreviewById(previewId)) {
    return ``;
  }
  const office = selectedWantedOfficeScreen(document);
  const nodes = wantedUiNodes(document);
  const selected = selectedGameUiWorkbenchNode(WANTED_UI_NAMESPACE, nodes);
  const machineState = machineStateControls({id: 'wanted-information', definition: WANTED_MACHINE_DEFINITION,
    nodes, preview: wantedPreviewById(previewId)}, {namespace: WANTED_UI_NAMESPACE, pageId: 'wanted-ui', poster: !office,
    targetId: selectedWantedTargetId()});
  return renderGameUiWorkbench({
    namespace: WANTED_UI_NAMESPACE,
    id: "wanted-ui-workbench",
    className: "wanted-ui-workbench",
    nodes,
    toolbarMarkup: office ? '' : wantedTargetLocationControls(),
    stageToolbarMarkup: `${machineState.toolbar}${machineState.inputs}`,
    bottomMarkup: machineState.bottom,
    bottomSize: 'resizable', bottomFit: true, textOnlyTree: true,
    inspectorExtraHidden: Boolean(office) || selected?.kind !== 'screen',
    inspectorExtraMarkup: office ? '' : `<div class="page-global-info">
      <a href="?view=wanted${state.savePageSlot === 2 ? '&amp;saveSlot=2' : ''}" title="通缉令目标配置" aria-label="通缉令目标配置">通缉令目标配置 ↗</a>
      <div class="wanted-defeated-toggle">
        <small>存档槽 ${state.savePageSlot === 2 ? 2 : 1} · 击破状态</small>
        ${wantedDefeatedMarkup(selectedWantedTargetId() ?? 1, {named: true})}
      </div></div>`,
    canvasMarkup: `<canvas width="256" height="240"
      data-wanted-preview="${esc(previewId)}"
      data-wanted-ui-workbench="true"
      aria-label="${office ? office.label : '通缉令动态配置草稿'}预览"></canvas>`,
    footerBadge: office ? '游戏界面权威资源' : "通缉令专用渲染接口",
    footerText: office ? '办事处窗口与正文引用应用命令，金币引用当前存档。'
      : "底板、怪物、目标名、赏金和击破覆盖图由同一通缉令 renderer 合成。",
  });
}

export function bindWantedUiWorkbench({
  rerender = async () => {},
  repaint = paintWantedPreviewCanvases,
} = {}) {
  if (state.view !== "wanted-ui") return null;
  const document = wantedDocument();
  if (!document) return null;
  bindMachineStateController(globalThis.document.querySelector('#wanted-ui-workbench'), {rerender});
  return bindGameUiWorkbench({
    namespace: WANTED_UI_NAMESPACE,
    nodes: wantedUiNodes(document),
    rerender,
    repaint,
    updateInspectorOnSelection: true,
    selectPreview: node => {
      const office = WANTED_OFFICE_SCREENS.some(screen => screen.node === node?.id);
      const canvas = globalThis.document.querySelector('[data-wanted-ui-workbench]');
      const showingOffice = canvas?.dataset.wantedPreviewRenderer === 'published-wanted-office';
      if (office || showingOffice) void rerender();
      else void repaint();
    },
  });
}

function renderWantedPosterUi(document) {
  return renderWantedPosterWorkbench(document);
}

export async function renderWantedPosters() {
  if (state.view === 'wanted-ui') {
    await Promise.all([db.getResourceDocument('application-command:25'), db.getDocument('project.ui.interfaces')]);
  }
  ensureWantedView();
  const document = wantedDocument();
  if (!document || !state.wantedView) {
    return ``;
  }
  if (state.view === "wanted-ui") {
    return renderWantedPosterUi(document);
  }
  const scenes = sceneNamesById();
  const editableByIndex = new Map((state.wantedView.targets || []).map(row => [
    Number(row.index), row,
  ]));
  const entries = (document.entries || []).map(entry => ({
    ...effectiveWantedPair(entry, editableByIndex.get(Number(entry.index))),
  }));

  const defaultPair = effectiveWantedPair(
    document.default_pair,
    state.wantedView.default_pair,
  );
  const sceneLabel = id => {
    const entry = scenes.get(Number(id));
    return entry ? entry.name : `场景 ${hex(Number(id), 2)}`;
  };

  const defaultDirty = wantedPairDirty("default");
  const defaultHigh = state.wantedView.default_pair.high_target_id;
  const defaultLow = state.wantedView.default_pair.low_target_id;
  const formations = state.project?.game_data?.battle_test?.formations || [];
  const monsters = wantedMonsters();
  const bountyTable = state.project?.wanted?.bounty_code_table || null;

  return `<section id="wanted-record-page">
    <style>#wanted-record-page .wanted-target-name {display:flex;align-items:center;gap:10px;min-width:150px}
      #wanted-record-page .wanted-target-name canvas {flex:none}
      #wanted-record-page .wanted-target-name span {display:grid;gap:3px}
      #wanted-record-page .wanted-target-name small {opacity:.7}
      #wanted-record-page .wanted-appearance {display:grid;gap:4px;min-width:144px}
      #wanted-record-page .wanted-appearance small {opacity:.7}
      #wanted-record-page .wanted-location-list {display:flex;flex-wrap:wrap;gap:10px}
      #wanted-record-page .wanted-location {min-width:150px}
      #wanted-record-page .wanted-poster-mapping {margin-top:24px}
      #wanted-record-page .data-editor-toolbar:has(#wanted-save-state[hidden]) {display:none}
      #wanted-record-page .wanted-poster-mapping summary {cursor:pointer;font-weight:600;margin-bottom:12px}</style>
    <div class="data-editor-toolbar">
      <p id="wanted-save-state" ${state.wantedMessage ? "" : "hidden"}>${esc(wantedEditorStatus())}</p>
    </div>
    <div class="section-line"><h2>通缉目标配置</h2><a href="?view=wanted-ui${state.savePageSlot === 2 ? '&amp;saveSlot=2' : ''}" title="通缉令界面" aria-label="通缉令界面">↗</a></div>
    <div class="table-wrap"><table>
      <thead><tr><th>目标</th><th>赏金 G</th><th>出现方式</th><th>操作</th></tr></thead>
      <tbody>${CONFIRMED_WANTED_BOSS_IDS.map(id => {
        const dirty = wantedBountyDirty(id);
        const formation = formations.find(row => Number(row.id) === id);
        const monsterId = formation?.slots?.find(slot => Number(slot.count) > 0)?.monster_id;
        const name = wantedBossName(id, {formations, monsters, bountyTable});
        return `<tr id="wanted-target-${id}" data-wanted-target-id="${id}"><td><span class="wanted-target-name">${
          monsterId !== null && monsterId !== undefined && Number.isInteger(Number(monsterId))
            ? monsterFigureCanvas({enemyId: Number(monsterId), box: 48, label: `${name}形象`}) : ""
        }<span><b><button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${Number(id).toString(16).toUpperCase().padStart(2, '0')}">${esc(name)}</button></b><small>目标 ${id}</small></span></span></td>
          <td><input type="number" min="0" step="1" data-wanted-bounty-id="${id}"
                value="${wantedBountyAmount(id)}" aria-label="目标 ${id} 赏金金额"></td>
          <td>${wantedAppearance(id)}</td>
          <td>${resetToOriginalButton(`bounty:${id}`, {
            title: `重置目标 ${id} 的赏金`, disabled: !dirty, dirty,
          })}</td></tr>`;
      }).join("")}</tbody>
    </table></div>

    <details class="wanted-poster-mapping"><summary>通缉令海报的场景目标对</summary>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>#</th><th>场景</th><th>场景 ID</th>
        <th>目标 1</th><th>目标 2</th>
        <th>操作</th>
      </tr></thead>
      <tbody>
        <tr>
          <td class="mono right">0</td>
          <td>默认目标（未命中场景）</td>
          <td class="mono">—</td>
          <td><select class="wanted-boss-select" data-wanted-select-target="default" data-wanted-target-side="high">${wantedBossSelectOptions(defaultHigh)}</select></td>
          <td><select class="wanted-boss-select" data-wanted-select-target="default" data-wanted-target-side="low">${wantedBossSelectOptions(defaultLow)}</select></td>
          <td>${resetToOriginalButton("default", {
            title: "重置默认目标对；十二条场景记录保持不变",
            disabled: !defaultDirty,
            dirty: defaultDirty,
          })}</td>
        </tr>
        ${entries.map(entry => {
          const rowDirty = wantedPairDirty(entry.index);
          const draftRow = editableByIndex.get(Number(entry.index));
          const highVal = draftRow ? draftRow.high_target_id : entry.high.formation_id;
          const lowVal = draftRow ? draftRow.low_target_id : entry.low.formation_id;
          return `<tr>
            <td class="mono right">${entry.index}</td>
            <td>${esc(sceneLabel(entry.scene_id))}</td>
            <td class="mono">${esc(entry.scene_id_hex)}</td>
            <td><select class="wanted-boss-select" data-wanted-select-target="${entry.index}" data-wanted-target-side="high">${wantedBossSelectOptions(highVal)}</select></td>
            <td><select class="wanted-boss-select" data-wanted-select-target="${entry.index}" data-wanted-target-side="low">${wantedBossSelectOptions(lowVal)}</select></td>
            <td>${resetToOriginalButton(entry.index, {
              title: `重置场景 ${entry.index} 的通缉目标；其他记录保持不变`,
              disabled: !rowDirty,
              dirty: rowDirty,
            })}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>

    </details>
    ${physicalLocationMarkup({rows: [
      {label: "默认目标", address: defaultPair?.source || document.default_pair?.source || document.target_table?.address},
      ...entries.map(entry => ({label: `场景 ${entry.index}`, address: entry.target_source})),
      ...(document.bounty_code_table?.entries || []).filter(row => isConfirmedWantedBoss(row.wanted_id)).map(row => ({
        label: `赏金目标 ${row.wanted_id}`, address: row.source,
      })),
    ].filter(row => row.address)})}
    </section>`;
}
