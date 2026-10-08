// @editor-module 剧情舞台的地图外延与对象点选。
import {scenePreviewControls, bindScenePreview, syncScenePreviewObjects, syncScenePreviewRegions} from '../../modules/scene/preview.js';
import {showEditorError} from "../../ui/editor-error.js";
import {storyPlayerRegion} from "./player-control.js";

const controllers = new WeakMap();

export function syncStoryPlayerRegions(screen, snapshot, segments, dimensions) {
  const regions = segments.filter(segment => segment.sceneId === snapshot.sceneId)
    .flatMap(segment => segment.regions.map(wait => {
      const region = storyPlayerRegion(wait.condition);
      return {...wait, region, attributes: {'data-story-stage-object': 'object:input'},
        title: `触发区域：${region.left}≤X<${region.right}、${region.top}≤Y<${region.bottom}；脚本操作数写入 ROM`};
    }));
  syncScenePreviewRegions(screen, regions, {x: snapshot.cameraTileOriginX,
    y: snapshot.cameraTileOriginY, scrollY: snapshot.screenScrollOffsetY}, dimensions);
}

export function syncStoryStageMap(stage, snapshot, dimensions) {
  controllers.get(stage)?.setMapExtension(snapshot ? {sceneId: snapshot.context?.scene_id,
    hidden: stage.querySelector('[data-role="story-vm-screen"]')?.dataset.storyFullScreen === 'true',
    cameraX: snapshot.cameraTileOriginX, cameraY: snapshot.cameraTileOriginY,
    animationPhase: snapshot.backgroundAnimationPhase, fieldTiles: snapshot.fieldTiles} : null, dimensions);
}

export function storyStageZoomMarkup() {
  return scenePreviewControls("舞台缩放");
}

export function bindStoryStage(stage, view, onSelect) {
  if (controllers.has(stage)) return;
  const viewport = stage.querySelector("[data-story-stage-viewport]");
  const screen = stage.querySelector('[data-role="story-vm-screen"]');
  if (!viewport || !screen) return;
  const controller = bindScenePreview({viewport, surface: screen,
    canvas: screen.querySelector('[data-role="story-vm-background"]'), controls: stage,
    key: `story:${view}`, size: () => ({width: Number(screen.dataset.stageWidth) || 256,
      height: Number(screen.dataset.stageHeight) || 240}), sizeElement: screen,
    onObjectSelect: onSelect, objectAttribute: 'storyStageObject',
    mapExtension: screen.querySelector('[data-role="story-vm-map"]'),
    onMapError: error => showEditorError(viewport, '场景地图预览失败', error)});
  const tooltip = document.createElement("span");
  tooltip.className = "story-stage-tooltip";
  tooltip.hidden = true;
  viewport.append(tooltip);
  viewport.addEventListener("pointermove", event => {
    const actor = event.target.closest?.("[data-story-stage-object]");
    tooltip.hidden = !actor || viewport.classList.contains("is-panning");
    if (actor) tooltip.textContent = actor.getAttribute("aria-label");
  });
  viewport.addEventListener("pointerleave", () => { tooltip.hidden = true; });
  controllers.set(stage, controller);
}

export function storyStageActorAttributes(objectId, label, selectedId) {
  return {"data-story-stage-object": String(objectId), role: "button", tabindex: "0",
    "aria-label": label, "aria-pressed": String(objectId === selectedId)};
}

export const syncStoryStageActors = syncScenePreviewObjects;
