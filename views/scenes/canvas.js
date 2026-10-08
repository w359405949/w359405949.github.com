// @editor-module 场景画布绘制
import {editorLog} from "../../core/editor-log.js";
import {render} from "../../main.js";
import {$} from "../../core/dom.js";
import {state} from "../../core/state.js";
import {sceneMapCell} from '../../core/scene-runtime-map.js';
import {sceneEventFlagMap} from '../../core/scene-map-rewrites.js';
import {saveFields} from '../../core/save-editor-session.js';
import {conditionalEntranceCells, conditionalEntranceState, conditionalSceneRecord} from '../../core/conditional-entrances.js';
import {sceneMapRewritePreview, sceneMapRewriteControlsMarkup} from '../../modules/scene/map-rewrites.js';
import {
  bindSceneLogicPanel,
  queueSceneWorkbenchSave,
  sceneOriginalResetAutoSaveHooks,
} from "../../views/scenes/interact.js";
import {sceneBoundarySides, sceneLogicObjects, sceneObjectCoordinate, sceneObjectCoordinateLabel, selectedSceneLogicObject} from "../../views/scenes/logic.js";
import {bindEncounterZonePanel, sceneEncounterPreview, renderEncounterZonePanel, renderEncounterZoneSidebar} from "../../views/scenes/encounter.js";
import {renderSceneLogicInspector, renderSceneObjectList, renderSceneTileInspector,
  renderWorldSceneTileInspector, sceneRootSelected} from "../../views/scenes/workbench.js";
import {hydrateSceneMetatileInspector} from "../metatiles.js";
import {loadNpcCurrentTexts} from "../../views/text/catalog.js";
import {invalidateSceneSurface} from '../../modules/scene/visual-preview.js';
import {paintScenePreview, paintScenePreviewCell, scenePreviewController} from '../../modules/scene/preview.js';











//
// 来源：拆分前 engine/editor/app.js 第 9123-9340 行。










export function updateSceneSelectedCoordinate() {
  const selectedCoordinate = $("#scene-selected-coordinate");
  const selectedObject = state.sceneEditMode === "logic" ? selectedSceneLogicObject() : null;
  const selectedLabel = selectedObject ? sceneObjectCoordinateLabel(selectedObject) : state.sceneTileSelection?.join(", ");
  if (selectedCoordinate) selectedCoordinate.textContent = selectedLabel ? `选中 ${selectedLabel}` : "";
}

export function drawScene() {
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

export function markSceneDirty() {
  // state.scene 是编辑草稿，会原地改 map/logic。整图缓存必须在每次编辑时作废，
  // 否则随后进入剧情页会拿到本次草稿的旧 surface。
  invalidateSceneSurface(state.scene);
  state.sceneDirty = true;
  queueSceneWorkbenchSave();
}

export function paintScene({x, y}) {
  if (x < 0 || y < 0 || x >= state.scene.width || y >= state.scene.height) return false;
  const cell = sceneMapCell(state.scene, x, y);
  if (cell?.sourceY == null || state.scene.map[cell.sourceY][cell.sourceX] === state.selectedMetatile) return false;
  state.scene.map[cell.sourceY][cell.sourceX] = state.selectedMetatile;
  markSceneDirty();
  if (state.scene.runtime_map) drawScene();
  else drawSceneCell(x, y);
  return true;
}

export function refreshSceneLogicPanel() {
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
      }, sceneOriginalResetAutoSaveHooks);
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
