import { canonicalJsonEqual, editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { scenePreviewController, paintScenePreview, invalidateSceneSurface, paintScenePreviewCell, bindScenePreview, loadSceneSurface, loadWorldMetatileRenderer, loadSceneMetatileRenderer, paintActorAtlasCanvases } from './record-6_wsSDi2.js';
import { render } from './editor-renderer-n2nBwXk_.js';
import { requireBrowserProjectRepository, $, esc, hydrateModuleComponents, paintMetaspriteCanvases } from './interface-state-preview-Dlotqlmn.js';
import { replaceHistoryUrl, currentViewUrl, rememberCurrentHistoryEntry, pushCurrentHistory, bindInternalPageLinks } from './element-tree-C1bWRgTl.js';
import { state } from './emulator-Bpa8EsFw.js';
import { configureSceneMetatileSelector, setSceneMetatileValue } from './field-object-editor-Blro4OF0.js';
import { createAutoSave, db, sceneConfigFieldChanges, sceneMapCell, hex } from './prg-loaders-DnCSmXk9.js';
import { selectedSceneLogicObject, sceneMapRewritePreview, sceneLogicObjects, sceneObjectCoordinate, sceneEventFlagMap, sceneObjectCoordinateLabel, sceneBoundarySides, mountWorldTideScene, mountSceneTileMapReset, sceneMapRewriteControlsMarkup, sceneRootSelected, renderSceneTileInspector, renderSceneObjectInspector, renderSceneObjectList, mountBombardment, mountSceneMapRewrite, bindSceneBgm, bindSceneRemapCollection, bindSceneCellActions, mountSceneTileFieldReset, mountSceneLogicFieldObject, sceneBoundaryFocusCoordinate, sceneObjectsAtCell, sceneLogicFieldSpecs } from './workbench-Csop3iHv.js';
import { saveFields } from './configuration-table-FR1xSC8W.js';
import { conditionalSceneRecord, conditionalEntranceCells, conditionalEntranceState } from './battle-result-state-machine-BbK2hSud.js';
import { saveSceneActors, refreshSceneDraftDirty, sceneActorSaveSnapshot, sceneEncounterPreview, bindEncounterZonePanel, renderEncounterZonePanel, renderEncounterZoneSidebar, encounterBlockIndexAt, paintEncounterBlock, encounterZoneAt } from './encounter-ybfuhcXm.js';
import { vehicleViewDirty, vehicleViewSaveSnapshot, saveVehicleView } from './vehicle-field-session-CTl5UxXM.js';
import { sceneResourceUid } from './overview-BWR5QCHz.js';
import { bindSceneBattleTestFormationEditor } from './monster-formations-5lr06780.js';
import { hydrateSceneMetatileInspector } from './metatiles-DLyAWu6R.js';
import { loadNpcCurrentTexts } from './charset-j6-kYKbE.js';
import { setGroupExpanded } from './battle-result-script-runtime-BSeJpUGH.js';
import './baseline-assembly-DW8BWbDB.js';
import './attack-chr-tile-selector-Bv5xCQyz.js';
import './timeline-player-YCH7Y-3h.js';
import './field-address-table-BnL1Mgdy.js';
import './components-DbJXuRMn.js';
import './text-record-structure-editor-BB8pdofu.js';
import './story-component-labels-CSjCRgXX.js';
import './scene-actor-interaction-picker-D6QFBEMg.js';
import './interface-state-frame-ZrXRl0fR.js';
import './configuration-summary-m9SZR_6_.js';
import './page-runtime-paths-BvtuMnH7.js';
import './physical-field-object-windows-DnQmS3eb.js';
import './ui-construction-preview-BuoQ5mM6.js';
import './global-random-DAuRNoyj.js';
import './machine-service-model-B-6y5baD.js';
import './service-preview-scene-CPwiqon9.js';
import './system-state-model-zPjxuFk6.js';
import './scene-encounter-probabilities-C0m_IdC-.js';
import './interaction-components-DjtMdVmW.js';
import './document-controls-C8YiQAPz.js';
import './text-record-controls-Ca9jGqUd.js';
import './components-DZ4_ZF2v.js';
import './components-BIpJ3l3a.js';
import './items-BwRIA2t-.js';
import './components-DFg4zDq1.js';
import './components-D8Tpyo4s.js';
import './shops-CokyNsz7.js';
import './service-pages-0AX3Py0f.js';
import './device-service-context-B5xDhK9J.js';
import './components-DsypHVsJ.js';
import './vehicles-WSVbAWyX.js';
import './entity-detail-r8jOlBq7.js';
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
import './visual-components-V1BURRSa.js';
import './actors-bind-Dz7Oe1bO.js';
import './components-D0Rv67Tu.js';
import './zone-components-uS5LhJDu.js';
import './components-DdhMoIz3.js';
import './reference-fields-DasyxcV4.js';
import './components-C2dkTMIc.js';
import './preview-sound-CiEAOXPD.js';
import './page-package-inputs-Dzxj7YGf.js';
import './battle-BjJmxVSY.js';
import './metatile-edit-session-CkenLTKq.js';

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

// @editor-module 场景自动保存与重置共用调度状态。

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

// @editor-module 场景画布绘制

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
      ? sceneLogicObjects().flatMap(item => item.rewrite ? [item.rewrite] : item.bombardment ? [item.bombardment] : []) : null,
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
    if (item.rewrite || item.bombardment) continue;
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

// @editor-module 场景选取、缩放与编辑器绑定

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
  const bombardment = selectedSceneLogicObject()?.bombardment;
  if (bombardment) void mountBombardment(bombardment, {refresh: refreshSceneLogicPanel, draw: drawScene})
    .catch(error => {
      const host = document.querySelector('[data-scene-bombardment]');
      if (host?.dataset.sceneBombardment === bombardment.key)
        host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    });
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
  bindSceneRemapCollection(document, () => {refreshSceneLogicPanel(); drawScene();});
  bindSceneCellActions(document, () => {refreshSceneLogicPanel(); drawScene();});
  document.querySelectorAll("[data-scene-object]").forEach(node => {
    const select = () => {
      state.sceneLogicSelection = node.dataset.sceneObject;
      const point = selectedSceneLogicObject() && sceneObjectCoordinate(selectedSceneLogicObject());
      if (point) state.sceneTileSelection = point;
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
  if (x < 0 || y < 0 || x >= state.scene.width || y >= state.scene.height) return;
  state.sceneTileSelection = [x, y];
  const matches = sceneObjectsAtCell(state.scene, sceneLogicObjects(), x, y);
  if (matches.length) {
    const current = matches.findIndex(item => item.key === state.sceneLogicSelection);
    state.sceneLogicSelection = matches[(current + 1) % matches.length].key;
    refreshSceneLogicPanel();
    drawScene();
    centerSceneLogicSelection();
    return;
  }
  if (!event.shiftKey) {
    state.sceneLogicSelection = null;
    refreshSceneLogicPanel();
    drawScene();
    return;
  }
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
  document.querySelectorAll('[data-scene-group-link]').forEach(node => {
    node.addEventListener('click', () => {
      const group = document.querySelector(`[data-scene-object-group="${node.dataset.sceneGroupLink}"]`);
      if (!group) return;
      setGroupExpanded(group.dataset.collapseKey, true);
      group.open = true;
      const tree = group.closest('.workspace-tree');
      const summary = group.querySelector('summary');
      if (tree) tree.scrollTop += summary.getBoundingClientRect().top
        - tree.getBoundingClientRect().top - tree.clientTop;
      summary.focus({preventScroll: true});
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
    : renderSceneObjectInspector();
  void hydrateSceneMetatileInspector();
  if (mode === "encounters") return;
  const list = $("#scene-object-list");
  if (list) list.outerHTML = renderSceneObjectList();
  bindSceneLogicPanel();
  if (selectedSceneLogicObject()?.kind === "actor") void loadNpcCurrentTexts();
}

export { bindSceneEditor, openSceneSlug };
