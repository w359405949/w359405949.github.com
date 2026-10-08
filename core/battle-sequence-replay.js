// @editor-module 将有来源的战斗时间线投影到共享战斗场景，不推算未记录的行动。

import {
  battleScenePreviewForFormation,
  normalizeBattleScenePreview,
} from "./battle-scene-preview.js";

/** 时间线的 step 是一次可观察状态；event 只描述该步，不暗示两步之间没有事件。 */
export function battleSequenceStep(timeline, index, project) {
  if (!timeline || !Array.isArray(timeline.steps) || !timeline.steps.length) {
    throw new TypeError("战斗时间线缺少步骤");
  }
  if (!Number.isInteger(index) || index < 0 || index >= timeline.steps.length) {
    throw new RangeError("战斗时间线步骤越界");
  }
  const step = timeline.steps[index];
  const preview = timeline.preview || battleScenePreviewForFormation(project, timeline.formationId);
  const events = timeline.steps.slice(0, index + 1).flatMap(item => item.enemyEvents || []);
  const party = preview.party.map((member, slot) => ({
    ...member,
    ...(step.party?.[slot] || {}),
  }));
  const projected = normalizeBattleScenePreview({
    ...preview,
    party,
    enemyGroups: (step.enemyGroups || timeline.enemyGroups)?.map((group, slot) => ({
      ...preview.enemyGroups[slot], ...group,
    })) || preview.enemyGroups,
    enemyEvents: events,
    attack: {...preview.attack, ...(step.attack || {})},
    guides: false,
  }, project);
  return {step, preview: projected};
}
