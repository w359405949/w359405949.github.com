// @editor-module 剧情时间轴投影的稳定行标识与路由。
import {storyPlaybackView, storyViewForSequenceId} from "./story-view-config.js";

// 行 ID 标识页面投影，不登记为字段对象或记录句柄。
export function storyTimelineRowId(view, sequenceId, laneId) {
  return `story-row:${sequenceId}/${laneId}`;
}

export function applyStoryTimelineRowRoute(params) {
  const match = /^story-row:([a-z0-9-]+)\/(.+)$/u
    .exec(params.get("storyRow") || "");
  if (!match) return;
  const view = storyPlaybackView(params.get('view')) ? params.get('view') : storyViewForSequenceId(match[1]);
  if (!view) return;
  params.set('view', view);
  params.set('storySequence', match[1]);
}
