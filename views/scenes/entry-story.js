// @editor-module 场景进场时可到达的剧情入口。
import {esc} from "../../core/dom.js";
import {state} from "../../core/state.js";
import {sceneEntryStoryItemsForProject} from "../../core/scene-entry-interactions.js";
import {renderSceneInteractionLinks} from "./logic.js";
import {renderSceneStoryInspector} from "./story-detail.js";

export function sceneEntryStoryItems(sceneId) {
  return sceneEntryStoryItemsForProject(sceneId, state.project.story || {});
}

export function renderSceneEntryStoryInspector(item) {
  return renderSceneStoryInspector(item, renderSceneInteractionLinks(item, "entry-story")
    + `<div data-scene-interaction-configurations="${esc(item.key)}"></div>`);
}
