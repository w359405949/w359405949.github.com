// @editor-module 场景选取、缩放与编辑器绑定
import {editorLog} from "../../core/editor-log.js";
import {bindScenePreview, scenePreviewController} from '../../modules/scene/preview.js';
import {render} from "../../main.js";
import {$, esc, hex} from "../../core/dom.js";
import {createSceneWorkbenchAutoSave} from "../../core/scene-workbench-auto-save.js";
import {bindInternalPageLinks, currentViewUrl, pushCurrentHistory, rememberCurrentHistoryEntry, replaceHistoryUrl} from "../../core/router.js";
import {
  saveVehicleView,
  vehicleViewDirty,
  vehicleViewSaveSnapshot,
} from "../../core/vehicle-field-session.js";
import {state} from "../../core/state.js";
import {configureSceneMetatileSelector} from '../../ui/scene-metatile-selector.js';
import {drawScene, markSceneDirty, paintScene, refreshSceneLogicPanel, updateSceneSelectedCoordinate} from "../../views/scenes/canvas.js";
import {
  bindEncounterZonePanel,
  encounterBlockIndexAt,
  encounterZoneAt,
  paintEncounterBlock,
} from "../../views/scenes/encounter.js";
import {sceneBoundaryFocusCoordinate, sceneBoundaryMatchesCell, sceneLogicFieldSpecs, sceneLogicObjects, sceneObjectCoordinate, selectedSceneLogicObject} from "../../views/scenes/logic.js";
import {
  loadSceneMetatileRenderer,
  loadWorldMetatileRenderer,
  loadSceneSurface,
} from "../../modules/scene/visual-preview.js";
import {sceneResourceUid} from "../../views/scenes/overview.js";
import {hydrateModuleComponents} from "../../ui/module-components.js";
import {paintMetaspriteCanvases} from "../../render/metasprite.js";
import {paintActorAtlasCanvases} from '../../render/actor-atlas.js';
import {bindSceneBattleTestFormationEditor} from "../battle-bind.js";
import {mountSceneLogicFieldObject, mountSceneTileFieldReset, mountSceneTileMapReset} from "./workbench.js";
import {mountWorldTideScene} from '../../modules/scene/tide-preview.js';
import {mountSceneBattleFormationEditors} from "./battle-formation-editor.js";
import {hydrateSceneMetatileInspector} from "../metatiles.js";
import {bindSceneBgm} from "./bgm.js";
import {sceneMapRewriteContains} from '../../core/scene-map-rewrites.js';
import {mountSceneMapRewrite} from '../../modules/scene/map-rewrites.js';










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

export const queueSceneWorkbenchSave = sceneWorkbenchAutoSave.queue;
const cancelSceneWorkbenchSave = sceneWorkbenchAutoSave.cancel;

export const sceneOriginalResetAutoSaveHooks = Object.freeze({
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

export async function openSceneSlug(slug) {
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

export function bindSceneLogicPanel() {
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

export async function bindSceneEditor() {
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
  sceneFitObserver.observe($(".scene-layer-bar"));
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
    if (brush) configureSceneMetatileSelector(brush, {
      images: renderer.metatiles, value: state.selectedMetatile, presentation: 'list', onSelect: value => {
        state.selectedMetatile = value;
        state.sceneTileSelection = null;
        document.querySelectorAll("[data-selected-metatile-id]").forEach(node => {
          node.textContent = hex(state.selectedMetatile, 2);
        });
        document.querySelectorAll("[data-selected-metatile-def]").forEach(node => {
          node.textContent = state.scene.metatile_definitions[state.selectedMetatile]
            .map(value => hex(value, 2)).join(" ");
        });
        refreshSceneLogicPanel();
        updateSceneSelectedCoordinate();
      },
    });

  }

}
