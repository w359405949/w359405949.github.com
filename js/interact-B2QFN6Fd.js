import { canonicalJsonEqual, editorLog } from './project-store-values-klefznSR.js';
import { scenePreviewController, paintScenePreview, paintScenePreviewCell, bindScenePreview } from './timeline-player-C0h-EABn.js';
import { refreshSceneDraftDirty, conditionalSceneRecord, sceneEncounterPreview, conditionalEntranceCells, renderEncounterZonePanel, renderEncounterZoneSidebar, bindEncounterZonePanel, conditionalEntranceState, saveFields, replaceHistoryUrl, currentViewUrl, render, bindInternalPageLinks, rememberCurrentHistoryEntry, pushCurrentHistory, sceneResourceUid, vehicleViewDirty, vehicleViewSaveSnapshot, saveVehicleView, encounterBlockIndexAt, paintEncounterBlock, encounterZoneAt } from './preview-sound-DHDXA99x.js';
import { $, invalidateSceneSurface, sceneMapCell, esc, loadSceneSurface, loadWorldMetatileRenderer, loadSceneMetatileRenderer, hydrateModuleComponents, paintActorAtlasCanvases, hex } from './monster-figure-C07vG7yu.js';
import { createAutoSave, sceneActorSaveSnapshot, requireBrowserProjectRepository, saveSceneActors, db, sceneConfigFieldChanges } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { mountFieldObjectField, configureSceneMetatileSelector, setSceneMetatileValue } from './rectangle-preset-controls-MtKWNScU.js';
import { selectedSceneLogicObject, sceneMapRewritePreview, sceneLogicObjects, sceneObjectCoordinate, sceneEventFlagMap, sceneMapRewriteControlsMarkup, sceneRootSelected, renderSceneTileInspector, renderWorldSceneTileInspector, renderSceneLogicInspector, renderSceneObjectList, sceneObjectCoordinateLabel, sceneBoundarySides, mountWorldTideScene, mountSceneTileMapReset, mountSceneMapRewrite, bindSceneBgm, mountSceneTileFieldReset, mountSceneLogicFieldObject, sceneBoundaryFocusCoordinate, sceneMapRewriteContains, sceneBoundaryMatchesCell, sceneLogicFieldSpecs } from './workbench-KKLw2uwg.js';
import { paintMetaspriteCanvases } from './record-BbPQSBBw.js';
import { bindSceneBattleTestFormationEditor } from './monster-formations-CNxDXbnT.js';
import { mountSceneActorInteractionPicker } from './scene-actor-interaction-picker-hGo800Vj.js';
import { hydrateSceneMetatileInspector } from './metatiles-qXzb88a8.js';
import { loadNpcCurrentTexts } from './charset-BJ0aS3Xk.js';
import './write-access-marker-Q1IasgBx.js';
import './writeback-capabilities-CGLIL9l3.js';
import './baseline-assembly-C0KRII8X.js';
import './page-runtime-paths-_6fUGFtn.js';
import './entity-detail-D8pHuYrZ.js';
import './components-wbruLTYI.js';
import './text-record-structure-editor-COmgY10x.js';
import './story-component-labels-C9k8orBA.js';
import './components-C4C2LoWv.js';
import './step-effects-aB0T4dMU.js';
import './interaction-components-BXNxuJ8s.js';
import './document-controls-Aq8h5H8g.js';
import './shops-BkPXrHg7.js';
import './service-pages-Cn-rFxTV.js';
import './interface-state-frame-DebgoOld.js';
import './facility-configuration-controls-J3sIu6pM.js';
import './components-sq4R7sI1.js';
import './vehicles-BrhQ6qbn.js';
import './characters-B0f3SPfL.js';
import './battle-actors-XIvkcBal.js';
import './npcs-Dhp3qBbI.js';
import './battle-scene-composer-BouUlKQZ.js';
import './generic-shop-CwrAX46z.js';
import './build-log-5Ih3_o65.js';
import './emulator-eSa0Jyze.js';
import './monsters-DSVVpGWY.js';
import './visual-components-CNmZ9fox.js';
import './battle-BewawxnM.js';
import './battle-simulation-player-CZ8Cov7C.js';
import './components-BY2Q9sQf.js';
import './components-WokSyCfC.js';

// @editor-module 场景画布草稿经字段对象统一保存到 Working。

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function sceneResourceId(entry = state.sceneEntry) {
  return `scene:${Number(entry?.id || 0).toString(16).toUpperCase().padStart(2, "0")}`;
}

function sceneProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sessionMatches(payload) {
  return state.projectRepository === payload.repository
    && sceneProjectRevision() === payload.revision
    && state.project === payload.project
    && state.sceneDraftRepository === payload.repository
    && state.scene === payload.sceneDraft
    && state.sceneLogic === payload.logicDraft;
}

function createSceneWorkbenchAutoSave({vehicleDirty, vehicleSnapshot, saveVehicle, updateState}) {
  function snapshot() {
    if (!state.scene || !state.sceneLogic || !state.sceneEntry) return null;
    const sceneChanged = !canonicalJsonEqual(state.scene.map, state.sceneOriginalMap)
      || !canonicalJsonEqual(state.sceneLogic, state.sceneOriginalLogic);
    const actors = sceneActorSaveSnapshot();
    const vehicles = vehicleDirty("player") ? vehicleSnapshot("player") : null;
    refreshSceneDraftDirty();
    if (!sceneChanged && !actors && !vehicles) return null;
    return {
      repository: requireBrowserProjectRepository(state),
      revision: sceneProjectRevision(),
      project: state.project,
      sceneDraft: state.scene,
      logicDraft: state.sceneLogic,
      resourceId: sceneResourceId(),
      scene: sceneChanged ? {map: cloneJson(state.scene.map), logic: cloneJson(state.sceneLogic)} : null,
      sceneBefore: sceneChanged ? {map: cloneJson(state.sceneOriginalMap), logic: cloneJson(state.sceneOriginalLogic)} : null,
      actors,
      vehicles,
    };
  }

  async function write(payload) {
    let completed = false;
    try {
      if (payload.actors) await saveSceneActors(payload.actors);
      if (payload.vehicles) await saveVehicle(payload.vehicles.viewId, payload.vehicles);
      if (payload.scene) {
        const objects = await db.getFieldObjects(payload.resourceId);
        const fields = objects.flatMap(object => object.fields);
        const document = {
          scene: {map: cloneJson(payload.scene.map)},
          logic: {layers: cloneJson(payload.scene.logic.layers)},
        };
        const changes = sceneConfigFieldChanges(fields, document, {previousDocument: {
          scene: {map: payload.sceneBefore.map}, logic: {layers: payload.sceneBefore.logic.layers},
        }});
        if (changes.length) await db.writeFields(changes, {expectedVersion: fields[0].version});
        const saved = await db.readResource(payload.resourceId);
        if (sessionMatches(payload)) {
          state.sceneAssetVersion = saved.version;
          state.sceneOriginalMap = cloneJson(saved.value.document.scene.map);
          state.sceneOriginalLogic = cloneJson(saved.value.document.logic);
          if (canonicalJsonEqual(state.scene.map, payload.scene.map))
            state.scene.map = cloneJson(state.sceneOriginalMap);
          if (canonicalJsonEqual(state.sceneLogic, payload.scene.logic))
            state.sceneLogic = cloneJson(state.sceneOriginalLogic);
        }
      }
      completed = true;
    } finally {
      if (sessionMatches(payload)) {
        refreshSceneDraftDirty();
        updateState();
        if (completed && state.sceneDirty) queue();
      }
    }
  }

  const autosave = createAutoSave(write, {
    onError: (error, sceneDraft) => {
      if (state.scene === sceneDraft) updateState(`保存失败：${error?.message || error}`);
    },
  });

  function queue() {
    const key = state.scene;
    if (!key || state.sceneDraftRepository !== state.projectRepository) return;
    try {
      const payload = snapshot();
      if (!payload) {
        autosave.cancel(key);
        state.sceneDirty = false;
        updateState();
        return;
      }
      updateState();
      autosave.commit(key, payload);
    } catch (error) {
      autosave.cancel(key);
      updateState(`保存失败：${error?.message || error}`);
    }
  }

  async function cancel() {
    const key = state.scene;
    if (key) autosave.cancel(key);
    await autosave.settled();
    if (key) autosave.cancel(key);
  }

  return Object.freeze({queue, cancel});
}

// @editor-module 场景画布绘制











//
// 来源：拆分前 engine/editor/app.js 第 9123-9340 行。










function updateSceneSelectedCoordinate() {
  const selectedCoordinate = $("#scene-selected-coordinate");
  const selectedObject = state.sceneEditMode === "logic" ? selectedSceneLogicObject() : null;
  const selectedLabel = selectedObject ? sceneObjectCoordinateLabel(selectedObject) : state.sceneTileSelection?.join(", ");
  if (selectedCoordinate) selectedCoordinate.textContent = selectedLabel ? `选中 ${selectedLabel}` : "";
}

function drawScene() {
  const canvas = $('#scene-canvas');
  if (!canvas) return;
  updateSceneSelectedCoordinate();
  const selected = selectedSceneLogicObject();
  const rewritePreview = state.sceneEditMode === 'logic' && selected?.rewrite
    ? sceneMapRewritePreview(selected.rewrite) : null;
  const sourceObjectsVisible = !rewritePreview || Number(rewritePreview.scene.id) === Number(state.scene.id);
  const condition = state.sceneEditMode !== 'encounters' && !selected?.rewrite
    ? conditionalSceneRecord(state.sceneEditMode === 'logic' ? selected : null,
      {sceneId: state.sceneEntry.id, point: state.sceneTileSelection, project: state.project,
        sceneLogic: state.sceneLogic, tileActions: state.sceneTileActions,
        logicIndex: state.project.scenes.logic, worldTide: state.sceneTideDocument,
        worldRaw: state.sceneWorldRaw}) : null;
  const actors = sourceObjectsVisible && state.sceneEditMode === 'logic' && state.sceneLayers.actors
    ? sceneLogicObjects().filter(item => item.kind === 'actor').flatMap(item => {
      const point = sceneObjectCoordinate(item);
      return point ? [{record: item.pose ? {...item.record, ...item.pose} : item.record,
        x: point[0], y: point[1]}] : [];
    }) : [];
  const drawing = {
    scene: rewritePreview?.renderer ? rewritePreview.scene : state.scene,
    logic: rewritePreview?.renderer ? rewritePreview.logic : state.sceneLogic,
    renderer: rewritePreview?.renderer || state.sceneRenderer,
    bounds: state.sceneEditMode === 'logic' && selected?.rewrite?.type === 'scene-remap'
      ? selected.rewrite.bounds : null,
    surface: !rewritePreview?.renderer && state.scene.preview_only ? state.sceneSurface : null,
    runtime: state.sceneEditMode === 'logic', visibleLayers: state.sceneLayers,
    cells: conditionalEntranceCells(condition, state.sceneEntrancePreview?.key === condition?.key
      ? state.sceneEntrancePreview : null),
    actionOverlays: state.sceneTileActionPreview?.key === state.sceneLogicSelection ? [state.sceneTileActionPreview] : [],
    grid: state.sceneGrid, encounters: sceneEncounterPreview(),
    rewrites: state.sceneEditMode === 'logic' && state.sceneLayers.events
      ? sceneLogicObjects().flatMap(item => item.rewrite ? [item.rewrite] : []) : null,
    selectedRewrite: state.sceneLogicSelection,
    ...(sourceObjectsVisible ? sceneLogicPreview() : {}),
    actors, actorLayer: sourceObjectsVisible && state.sceneEditMode === 'logic' && state.sceneLayers.actors,
    focusPoint: state.sceneFocusPoint, focusBounds: state.scene,
  };
  if (!drawing.surface && !drawing.renderer) return;
  if (!drawing.surface && !rewritePreview?.renderer && drawing.runtime)
    drawing.scene = sceneEventFlagMap(state.scene, flag => saveFields.find(
      `save.slot.${state.savePageSlot}.global_event_flag.${Number(flag).toString(16).toUpperCase().padStart(2, '0')}`)?.value);
  void (scenePreviewController(canvas)?.draw(drawing) || paintScenePreview(canvas, drawing)).catch(error => {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    const status = $('#scene-save-state');
    if (status && canvas.isConnected) {status.hidden = false; status.textContent = `形象预览失败：${error.message}`;}
  });
}

function drawSceneCell(x, y) {
  const canvas = $('#scene-canvas');
  if (canvas && !state.scene?.preview_only && state.sceneRenderer)
    paintScenePreviewCell(canvas, state.scene, state.sceneRenderer, x, y, {grid: state.sceneGrid});
}

function sceneLogicPreview() {
  if (!state.sceneLogic || state.sceneEditMode !== "logic") return {};
  const markers = [];
  const boundaries = [];
  const selected = selectedSceneLogicObject();
  const condition = conditionalSceneRecord(selected, {sceneId: state.sceneEntry.id,
    autonomous: state.sceneStoryDocuments?.autonomous, project: state.project});
  const preview = state.sceneEntrancePreview?.key === condition?.key
    ? conditionalEntranceState(condition, state.sceneEntrancePreview) : null;
  for (const item of sceneLogicObjects()) {
    if (!state.sceneLayers[item.layer]) continue;
    if (item.rewrite) continue;
    if (item.kind.startsWith("boundary")) {
      boundaries.push({record: item.record, sides: sceneBoundarySides(item.record),
        selected: item.key === state.sceneLogicSelection});
      continue;
    }
    const previewedActor = selected?.kind === 'actor' && preview
      && item.record.uid === selected.record.uid;
    if (previewedActor && (preview.actor_hidden || item.key !== selected.key)) continue;
    const record = previewedActor && preview.actor_pose ? {...item.record, ...preview.actor_pose} : item.record;
    const coordinate = sceneObjectCoordinate({...item, record,
      pose: previewedActor ? preview.actor_pose : item.pose});
    if (!coordinate) continue;
    const [x, y] = coordinate.map(Number);
    markers.push({kind: item.kind, record, x, y,
      selected: item.key === state.sceneLogicSelection});
  }
  return {markers, boundaries, actorImages: true};
}

function markSceneDirty() {
  // state.scene 是编辑草稿，会原地改 map/logic。整图缓存必须在每次编辑时作废，
  // 否则随后进入剧情页会拿到本次草稿的旧 surface。
  invalidateSceneSurface(state.scene);
  state.sceneDirty = true;
  queueSceneWorkbenchSave();
}

function paintScene({x, y}) {
  if (x < 0 || y < 0 || x >= state.scene.width || y >= state.scene.height) return false;
  const cell = sceneMapCell(state.scene, x, y);
  if (cell?.sourceY == null || state.scene.map[cell.sourceY][cell.sourceX] === state.selectedMetatile) return false;
  state.scene.map[cell.sourceY][cell.sourceX] = state.selectedMetatile;
  markSceneDirty();
  if (state.scene.runtime_map) drawScene();
  else drawSceneCell(x, y);
  return true;
}

function refreshSceneLogicPanel() {
  const mode = state.sceneEditMode;
  const rewriteControls = document.querySelector('[data-scene-map-rewrite-controls]');
  if (rewriteControls) rewriteControls.innerHTML = mode === 'logic'
    ? sceneMapRewriteControlsMarkup(selectedSceneLogicObject()?.rewrite) : '';
  const detail = $("#scene-bottom-editor");
  const selection = JSON.stringify([mode, state.sceneLogicSelection,
    state.sceneTileSelection, state.sceneEncounterInspect, state.sceneEncounterBlock]);
  if (detail && detail.dataset.sceneSelection !== selection) {
    detail.dataset.sceneSelection = selection;
    detail.scrollTop = 0;
  }
  const encounter = $("#scene-encounter-panel");
  if (encounter) {
    encounter.innerHTML = mode === "encounters" ? renderEncounterZonePanel() : "";
    if (mode === "encounters") {
      // 侧栏的 zone 列表也归遇敌区面板管：它和画笔、明细是同一份状态。
      const sidebar = $(".scene-tools");
      if (sidebar) sidebar.innerHTML = renderEncounterZoneSidebar();
      bindEncounterZonePanel(() => {
        refreshSceneLogicPanel();
        drawScene();
      });
    }
  }
  const inspector = $("#scene-object-inspector");
  const rootDetails = document.querySelector('[data-scene-root-details]');
  if (rootDetails) rootDetails.hidden = !sceneRootSelected();
  if (inspector) inspector.hidden = sceneRootSelected();
  if (inspector) inspector.innerHTML = mode === "tiles" ? renderSceneTileInspector()
    : mode === "encounters" ? ""
    : `${selectedSceneLogicObject()?.rewrite ? '' : renderWorldSceneTileInspector()}${renderSceneLogicInspector()}`;
  void hydrateSceneMetatileInspector();
  if (mode === "encounters") return;
  const list = $("#scene-object-list");
  if (list) list.outerHTML = renderSceneObjectList();
  bindSceneLogicPanel();
  if (selectedSceneLogicObject()?.kind === "actor") void loadNpcCurrentTexts();
}

async function ownerBinding(host) {
  const kind = host.dataset.sceneBattleFormation;
  if (kind === 'investigation') return {
    object: await db.getFieldObject('battle-test-point', 'battle-test-point.entry'),
    entityHandle: 'battle-test:entry', fieldName: 'encounter_id',
    flagField: 'state_flag'};
  if (kind === "coordinate") {
    const id = Number(host.dataset.battleRecordId);
    const handle = `story.world-event:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject("world-event", "world-event.trigger-tables"),
      entityHandle: handle, fieldName: "encounter_formation_id"};
  }
  if (kind === "script") {
    const resourceId = `story-${host.dataset.battleScriptKind}-script`;
    const handle = `${resourceId}:script:${Number(host.dataset.battleScriptId).toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject(resourceId, handle),
      resourceId, entityHandle: handle, fieldName: "bytecode", byteIndex: Number(host.dataset.battleCursor) + 1};
  }
  return null;
}

async function mountSceneBattleFormationEditors(root, refresh) {
  const hosts = [...(root?.querySelectorAll?.("[data-scene-battle-formation]") || [])];
  if (!hosts.length) return;
  for (const host of hosts) {
    if (!host.isConnected || host.dataset.battleEditorBound) continue;
    host.dataset.battleEditorBound = "1";
    const kind = host.dataset.sceneBattleFormation;
    try {
      const binding = await ownerBinding(host);
      if (!host.isConnected || !binding) continue;
      host.innerHTML = '<div data-battle-field-choice></div>';
      if (binding.resourceId || binding.flagField) host.insertAdjacentHTML("beforeend", `
        <label>完成事件号（战斗类型）<span data-battle-event-flag></span></label>
        ${binding.resourceId ? '<label>剧情状态<span data-battle-story-state></span></label>' : ''}`);
      host.addEventListener("field-object-saved", () => {
        if (!host.isConnected) return;
        void db.getResourceDocument(binding.resourceId || (kind === 'investigation' ? 'battle-test-point' : 'world-event'), null).then(document => {
          if (binding.resourceId) state.sceneStoryDocuments[host.dataset.battleScriptKind] = document;
          else if (kind === 'investigation') state.project.game_data.battle_test = document;
          else state.sceneWorldEvents = document;
          if (host.isConnected) refresh();
        }).catch(error => {
          editorLog.error("场景", `操作失败：${error?.message || error}`, error);
          const status = host.querySelector("[data-field-object-error]");
          if (status) {
            status.textContent = `刷新失败：${error?.message || error}`;
            status.hidden = false;
          }
        });
      });
      await mountSceneActorInteractionPicker(host.querySelector("[data-battle-field-choice]"),
        binding.object, {entityHandle: binding.entityHandle, battle: {fieldName: binding.fieldName, byteIndex: binding.byteIndex}});
      if (binding.flagField) mountFieldObjectField(host.querySelector('[data-battle-event-flag]'), binding.object,
        {entityHandle: binding.entityHandle, fieldName: binding.flagField, label: '完成事件号（战斗类型）', resettable: true});
      if (binding.resourceId) {
        mountFieldObjectField(host.querySelector("[data-battle-event-flag]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 1, label: "完成事件号（战斗类型）"});
        mountFieldObjectField(host.querySelector("[data-battle-story-state]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 2, label: "剧情状态"});
      }
      const link = host.closest('[data-scene-battle-entry]')?.querySelector('[data-resource-target^="encounter-formation:"]');
      if (link) {
        link.setAttribute('aria-label', `跳转到 ${link.textContent}`);
        link.textContent = '↗';
        host.append(link);
      }
    } catch (error) {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
    }
  }
}

// @editor-module 场景选取、缩放与编辑器绑定










//
// 来源：拆分前 engine/editor/app.js 第 9341-9981 行。


function updateSceneWorkbenchState(message = "") {
  state.sceneMessage = message;
  const status = $("#scene-save-state");
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("dirty", message.startsWith("保存失败："));
  }
}

const sceneWorkbenchAutoSave = createSceneWorkbenchAutoSave({
  vehicleDirty: vehicleViewDirty,
  vehicleSnapshot: vehicleViewSaveSnapshot,
  saveVehicle: saveVehicleView,
  updateState: updateSceneWorkbenchState,
});

const queueSceneWorkbenchSave = sceneWorkbenchAutoSave.queue;
const cancelSceneWorkbenchSave = sceneWorkbenchAutoSave.cancel;

const sceneOriginalResetAutoSaveHooks = Object.freeze({
  beforeReset: cancelSceneWorkbenchSave,
  afterReset: () => queueSceneWorkbenchSave(),
});

function updateSceneTileHistoryButtons() {
  for (const action of ['undo', 'redo']) {
    const button = $(`#scene-tile-${action}`);
    if (button) button.disabled = !state.sceneTileHistory?.[action === 'undo' ? 'canUndo' : 'canRedo'];
  }
}

function stepSceneTileHistory(action) {
  if (state.sceneEditMode !== 'tiles' || state.scene?.preview_only) return;
  const map = state.sceneTileHistory?.[action](state.scene.map);
  if (!map) return;
  state.scene.map = map;
  markSceneDirty();
  drawScene();
  refreshSceneLogicPanel();
  updateSceneTileHistoryButtons();
}

function bindSceneTileHistory() {
  for (const action of ['undo', 'redo']) {
    $(`#scene-tile-${action}`)?.addEventListener('click', () => stepSceneTileHistory(action));
  }
  $('.scene-workbench')?.addEventListener('keydown', event => {
    if (state.sceneEditMode !== 'tiles' || state.scene?.preview_only
      || !(event.ctrlKey || event.metaKey) || event.altKey
      || event.target.closest('input, textarea, select') || event.target.isContentEditable) return;
    const key = event.key.toLowerCase();
    const action = key === 'z' ? (event.shiftKey ? 'redo' : 'undo')
      : key === 'y' && !event.shiftKey ? 'redo' : null;
    if (!action) return;
    event.preventDefault();
    stepSceneTileHistory(action);
  });
}









function centerSceneLogicSelection() {
  const selected = selectedSceneLogicObject();
  const coordinate = selected ? sceneObjectCoordinate(selected)
    || sceneBoundaryFocusCoordinate(selected) : null;
  const canvas = $("#scene-canvas");
  const wrap = $(".scene-canvas-wrap");
  if (coordinate && canvas && wrap) {
    const [x, y] = coordinate.map(Number);
    scenePreviewController(canvas)?.centerCell(x, y);
  }
  requestAnimationFrame(() => {
    const tools = $(".scene-tools");
    const selectedRow = [...document.querySelectorAll("[data-scene-object]")].find(
      row => row.dataset.sceneObject === state.sceneLogicSelection
    );
    if (!tools || !selectedRow) return;
    const toolsRect = tools.getBoundingClientRect();
    const rowRect = selectedRow.getBoundingClientRect();
    if (rowRect.top < toolsRect.top) {
      tools.scrollTo({top: tools.scrollTop - (toolsRect.top - rowRect.top) - 8, behavior: "smooth"});
    } else if (rowRect.bottom > toolsRect.bottom) {
      tools.scrollTo({top: tools.scrollTop + (rowRect.bottom - toolsRect.bottom) + 8, behavior: "smooth"});
    }
  });
}

async function openSceneSlug(slug) {
  const next = String(slug || "");
  if (!next || next === state.sceneSlug) return false;
  rememberCurrentHistoryEntry();
  state.sceneSlug = next;
  state.sceneLogicSelection = null;
  state.sceneFocusPoint = null;
  pushCurrentHistory();
  await render();
  return true;
}

function bindSceneLogicPanel() {
  bindInternalPageLinks();
  const rewrite = selectedSceneLogicObject()?.rewrite;
  if (rewrite) void mountSceneMapRewrite(rewrite, {refresh: () => {
    refreshSceneLogicPanel();
    drawScene();
  }, draw: drawScene}).catch(error => {
    const host = document.querySelector('[data-scene-map-rewrite]');
    if (host?.dataset.sceneMapRewrite === rewrite.key)
      host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
  });
  document.querySelectorAll('[data-conditional-entrance-state]').forEach(node => {
    node.addEventListener('click', () => {
      state.sceneEntrancePreview = {key: node.closest('[data-conditional-entrance]').dataset.conditionalEntranceKey,
        stateId: node.dataset.conditionalEntranceState};
      refreshSceneLogicPanel();
      drawScene();
    });
  });
  bindSceneBgm();
  document.querySelectorAll("[data-scene-object]").forEach(node => {
    const select = () => {
      state.sceneLogicSelection = node.dataset.sceneObject;
      refreshSceneLogicPanel();
      drawScene();
      centerSceneLogicSelection();
    };
    node.addEventListener("click", event => {
      if (event.target.closest?.(".record-handle") && String(document.getSelection())) return;
      select();
    });
    node.addEventListener("keydown", event => {
      if (event.target !== node || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      select();
    });
  });
  void mountSceneTileFieldReset(() => {
    refreshSceneLogicPanel();
    drawScene();
  }, sceneOriginalResetAutoSaveHooks);
  void bindSceneBattleTestFormationEditor($("#scene-object-inspector"), () => {
    refreshSceneLogicPanel();
  }).catch(error => editorLog.error("场景准备", "场景编队字段绑定失败", error));
  void hydrateModuleComponents($("#scene-object-inspector"));
  void mountSceneBattleFormationEditors($("#scene-object-inspector"), () => {
    refreshSceneLogicPanel();
    drawScene();
  });
  void paintMetaspriteCanvases($("#scene-object-inspector"));
  void paintActorAtlasCanvases($("#scene-object-inspector"));
  void mountSceneLogicFieldObject(() => {
    refreshSceneLogicPanel();
    drawScene();
  });
}

/** 遇敌区点击选中区块，启用画笔时写入区域。 */
function clickEncounterCell({x, y}) {
  if (state.sceneEditMode !== "encounters") return;
  const painting = state.sceneEncounterBrush !== null
    && state.sceneEncounterBrush !== undefined;
  if (painting) {
    state.sceneEncounterBlock = encounterBlockIndexAt(x, y);
    if (!paintEncounterBlock(x, y, () => {
      refreshSceneLogicPanel();
      drawScene();
    })) {
      drawScene();
      return;
    }
  } else {
    const zoneId = encounterZoneAt(x, y);
    if (zoneId === null) return;
    const blockIndex = encounterBlockIndexAt(x, y);
    if (zoneId === state.sceneEncounterInspect
      && blockIndex === state.sceneEncounterBlock) return;
    state.sceneEncounterInspect = zoneId;
    state.sceneEncounterBlock = blockIndex;
    replaceHistoryUrl(currentViewUrl());
  }
  refreshSceneLogicPanel();
  drawScene();
}

function selectOrMoveSceneObject({x, y}, event) {
  if (state.sceneEditMode !== "logic") return;
  if (x < 0 || y < 0) return;
  const matches = sceneLogicObjects().filter(item => {
    if (!state.sceneLayers[item.layer]) return false;
    if (item.rewrite) return sceneMapRewriteContains(item.rewrite, x, y);
    if (item.kind.startsWith("boundary")) return sceneBoundaryMatchesCell(item, x, y);
    const coordinate = sceneObjectCoordinate(item);
    return coordinate && Number(coordinate[0]) === x && Number(coordinate[1]) === y;
  });
  if (matches.length) {
    const current = matches.findIndex(item => item.key === state.sceneLogicSelection);
    state.sceneLogicSelection = matches[(current + 1) % matches.length].key;
    refreshSceneLogicPanel();
    drawScene();
    centerSceneLogicSelection();
    return;
  }
  if (!event.shiftKey) return;
  if (x >= state.scene.width || y >= state.scene.height) return;
  const selected = selectedSceneLogicObject();
  if (!selected || selected.kind.startsWith("boundary")) return;
  const specs = new Map((sceneLogicFieldSpecs[selected.kind] || []).map(spec => [spec[0], spec]));
  const xField = selected.kind === "event" ? "trigger_x" : "x";
  const yField = selected.kind === "event" ? "trigger_y" : "y";
  const xSpec = specs.get(xField), ySpec = specs.get(yField);
  if (!xSpec || !ySpec || x > xSpec[3] || y > ySpec[3]) return;
  selected.record[xField] = x;
  selected.record[yField] = y;
  markSceneDirty();
  refreshSceneLogicPanel();
  drawScene();
  centerSceneLogicSelection();
}

/** Tile mode keeps the target cell separate from the metatile brush choice. */
function selectSceneTileCell({x, y}, event) {
  if (state.sceneEditMode !== "tiles" && !(state.scene?.preview_only && state.sceneEditMode === "logic" && event.altKey)) return;
  if (x < 0 || y < 0 || x >= Number(state.scene.width) || y >= Number(state.scene.height)) return;
  if (state.sceneTileSelection?.[0] === x && state.sceneTileSelection?.[1] === y) return;
  state.sceneTileSelection = [x, y];
  refreshSceneLogicPanel();
}

let sceneFitObserver = null;

function layoutSceneWorkbench() {
  const wrap = $(".scene-canvas-wrap");
  if (!wrap) return;
  const workbench = wrap.closest(".scene-workbench");
  const content = workbench.parentElement;
  if (window.matchMedia("(min-width: 761px)").matches) {
    const bottomPadding = Number.parseFloat(getComputedStyle(content).paddingBottom);
    const height = Math.max(360, content.getBoundingClientRect().bottom
      - workbench.getBoundingClientRect().top - content.scrollTop - bottomPadding);
    workbench.style.height = `${Math.floor(height)}px`;
  } else workbench.style.removeProperty("height");
}

async function returnToSceneOverview() {
  const returnResourceId = state.sceneEntry
    ? sceneResourceUid(state.sceneEntry)
    : null;
  rememberCurrentHistoryEntry();
  state.resourceId = returnResourceId;
  state.sceneSlug = null;
  pushCurrentHistory();
  await render();
  return true;
}

async function bindSceneEditor() {
  void mountWorldTideScene(state.sceneEntry.id, state.scene).catch(error => {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    const host = document.querySelector('[data-scene-tide-preview]');
    if (host) host.textContent = error.message;
  });
  sceneFitObserver?.disconnect();
  if (!state.scene) return;
  layoutSceneWorkbench();
  bindSceneTileHistory();
  void mountSceneTileMapReset(() => {
    drawScene();
    refreshSceneLogicPanel();
    updateSceneTileHistoryButtons();
  }, sceneOriginalResetAutoSaveHooks);
  bindScenePreview({viewport: $(".scene-canvas-wrap"), canvas: $("#scene-canvas"),
    controls: $(".scene-stage"), key: `scene:${state.sceneEntry.slug}`,
    zoom: state.sceneZoomSlug === state.sceneEntry.slug && !state.sceneZoomAuto ? state.sceneZoom : "fit",
    onChange: zoom => {
      state.sceneZoomSlug = state.sceneEntry.slug;
      state.sceneZoomAuto = zoom === "fit";
      if (zoom !== "fit") state.sceneZoom = zoom;
      replaceHistoryUrl(currentViewUrl());
    },
    canPan: event => event.button === 1 || (state.sceneEditMode !== "tiles" && !event.shiftKey && !event.altKey),
    onSelect: (point, event) => {
      selectOrMoveSceneObject(point, event);
      clickEncounterCell(point);
      selectSceneTileCell(point, event);
      state.sceneTileSelection = [point.x, point.y];
      updateSceneSelectedCoordinate();
    },
    onHover: point => {
      const label = $('#scene-pointer-coordinate');
      if (label) label.textContent = point ? `光标 ${point.x}, ${point.y}` : '';
    },
    brush: {enabled: () => state.sceneEditMode === 'tiles' && !state.scene.preview_only,
      begin: () => {
        state.sceneTileHistory.begin(state.scene.map);
        updateSceneTileHistoryButtons();
      },
      paint: point => {
        if (paintScene(point)) state.sceneTileHistory.changed();
      },
      end: () => {
        state.sceneTileHistory.end();
        updateSceneTileHistoryButtons();
      }},
  });
  sceneFitObserver = new ResizeObserver(layoutSceneWorkbench);
  sceneFitObserver.observe($(".scene-canvas-wrap"));
  sceneFitObserver.observe($("#content"));
  const layers = $(".scene-layer-bar");
  if (layers) sceneFitObserver.observe(layers);
  $("#scene-back").addEventListener("click", () => void returnToSceneOverview());
  document.querySelectorAll("[data-scene-mode]").forEach(node => {
    node.addEventListener("click", async () => {
      if (state.sceneEditMode === node.dataset.sceneMode) return;
      state.sceneTileHistory?.clear();
      state.sceneEditMode = node.dataset.sceneMode;
      replaceHistoryUrl(currentViewUrl());
      await render();
    });
  });
  document.querySelectorAll("[data-scene-layer]").forEach(node => {
    node.addEventListener("change", () => {
      state.sceneLayers[node.dataset.sceneLayer] = node.checked;
      drawScene();
    });
  });
  $("#scene-grid").addEventListener("change", event => {
    state.sceneGrid = event.target.checked;
    drawScene();
  });
  bindSceneLogicPanel();
  void hydrateSceneMetatileInspector();
  if (state.sceneEditMode === "encounters") {
    bindEncounterZonePanel(() => {
      refreshSceneLogicPanel();
      drawScene();
    });
  }

  const canvas = $("#scene-canvas");
  if (state.sceneFocusPoint) requestAnimationFrame(() => {
    const [x, y] = state.sceneFocusPoint;
    if (x < 0 || y < 0 || x >= state.scene.width || y >= state.scene.height) return;
    scenePreviewController(canvas)?.centerCell(x, y);
  });
  if (state.scene.preview_only) {
    // 世界地图的粗格/字典/分区 CHR pipeline 已经解到 scene JSON 里：`map` 是
    // 256×256 的 metatile 表，四组地理 CHR 挂在 `render.zones`。像素因此和普通
    // 场景一样是包内 JSON 的纯函数，不再读那张 4096×4096 的成品 PNG。
    // `preview_only` 现在只表示「背景不可编辑」，不表示「只能看预渲染图」。
    const surface = await loadSceneSurface(state.scene);
    if (!surface) throw new Error("世界地图 JSON 像素渲染器不可用");
    state.metatileCanvases = null;
    state.sceneRenderer = await loadWorldMetatileRenderer(state.scene);
    state.sceneSurface = surface;
    drawScene();
  } else {
    // 普通场景完全从 scene JSON + shared-chr-bank JSON 实时组装。这里不得读取
    // paths.pattern_table/background_palette，也不得依赖 baseline/build ROM。
    const renderer = await loadSceneMetatileRenderer(state.scene);
    if (!renderer) throw new Error("普通场景 JSON 像素渲染器不可用");
    state.sceneSurface = null;
    state.metatileCanvases = renderer.metatiles;
    state.sceneRenderer = renderer;
    drawScene();
    const brush = document.querySelector('[data-scene-brush-selector]');
    if (brush) {
      const selectBrush = value => {
        state.selectedMetatile = value;
        state.sceneTileSelection = null;
        setSceneMetatileValue(brush, value);
        document.querySelectorAll('[data-scene-brush]').forEach(button => {
          const selected = Number(button.dataset.sceneBrush) === value;
          button.setAttribute('aria-pressed', String(selected));
          button.closest('.element-tree-node').classList.toggle('is-selected', selected);
        });
        document.querySelectorAll("[data-selected-metatile-id]").forEach(node => {
          node.textContent = hex(state.selectedMetatile, 2);
        });
        document.querySelectorAll("[data-selected-metatile-def]").forEach(node => {
          node.textContent = state.scene.metatile_definitions[state.selectedMetatile]
            .map(value => hex(value, 2)).join(" ");
        });
        refreshSceneLogicPanel();
        updateSceneSelectedCoordinate();
      };
      configureSceneMetatileSelector(brush, {
        images: renderer.metatiles, value: state.selectedMetatile, onSelect: selectBrush,
      });
      document.querySelectorAll('[data-scene-brush]').forEach(button => {
        button.addEventListener('click', () => selectBrush(Number(button.dataset.sceneBrush)));
      });
    }

  }

}

export { bindSceneEditor, bindSceneLogicPanel, openSceneSlug, queueSceneWorkbenchSave, sceneOriginalResetAutoSaveHooks };
