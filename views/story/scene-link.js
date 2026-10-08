// @editor-module 将剧情场景身份呈现为场景页面链接并更新链接目标。
import {esc} from "../../core/dom.js";
import {recordUid} from "../../core/resource-index.js";
import {state} from "../../core/state.js";
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from "../../modules/scene/components.js";


function sceneIdValue(sceneId) {
  if (sceneId === null || sceneId === undefined || String(sceneId).trim() === "") {
    return null;
  }
  const id = Number(sceneId);
  // 场景目录的合法 ID 是 00–EF；F0–FF 是特殊角色表等运行时选择器，不得伪装成
  // 可跳转地图资源。
  return Number.isInteger(id) && id >= 0 && id <= 0xef ? id : null;
}

/** 剧情只持有场景资源引用；具体 slug 由统一资源导航在点击时解析。 */
function storySceneResourceUid(sceneId) {
  const id = sceneIdValue(sceneId);
  return id === null
    ? null
    : recordUid("scene", id);
}

/** 剧情里所有可见场景号共用的跳转组件。 */
export function storySceneLink(sceneId, label = null, {role = null} = {}) {
  const id = sceneIdValue(sceneId);
  const uid = storySceneResourceUid(id);
  const roleAttribute = role ? ` data-role="${esc(role)}"` : "";
  if (label === "↗") return `<button type="button" class="resource-inline-link"
    ${uid ? `data-resource-target="${esc(uid)}"` : "disabled"} title="场景详情">↗</button>`;
  return `<span class="story-scene-link"${roleAttribute}
    data-story-scene-link="${id ?? ""}">${sceneMarkup(id)}</span>`;
}

function sceneMarkup(id) {
  return id === null ? "—" : scenePositionPickerMarkup({
    entries: state.project?.scenes?.editable_scenes || [], sceneId: id,
    x: null, y: null, disabled: true, label: "场景",
  });
}

/** 播放器切换幕时重建场景位置选择器。 */
export function updateStorySceneLink(node, sceneId) {
  if (!node) return;
  const id = sceneIdValue(sceneId);
  if (node.dataset.storySceneLink === String(id ?? "")) return;
  node.dataset.storySceneLink = String(id ?? "");
  node.innerHTML = sceneMarkup(id);
  hydrateScenePositionPicker(node.querySelector("[data-scene-position-picker]"));
}
