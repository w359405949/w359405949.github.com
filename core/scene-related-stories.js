// @editor-module 剧情目录声明的场景关联投影。
import {storyPageDefinitionForView, storyViewForSequenceId} from "./story-view-config.js";

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

export function sceneRelatedStories(sceneId, story) {
  const sequences = new Map((story?.browser_vm?.sequences || []).map(row => [row.id, row]));
  return (story?.cutscene_inventory?.entries || []).filter(row =>
    row.scene_ids?.includes(Number(sceneId))
  ).map(row => {
    const sequence = sequences.get(row.id);
    const relations = [];
    if (sequence?.interaction_trigger) {
      relations.push(`角色交互 · 角色 ${hex(sequence.entry_variant_id)}·${hex(sequence.interaction_trigger.actor_record_id)}`);
    }
    if (sequence?.kind === "scene-entry-story-sequence"
      || row.entry_evidence?.startsWith("scene-loaded-autonomous-script")) relations.push("进场");
    if (row.entry_evidence?.includes("coordinate-gated")) relations.push("坐标触发");
    if (row.entry_evidence?.includes("interaction-bootstrap")) relations.push("交互启动");
    if (row.entry_evidence?.includes("investigation")) relations.push("调查");
    if (row.player_control_disabled) relations.push("控制锁");
    if (row.scene_ids.length > 1) relations.push("跨场景演出");
    if (!relations.length) relations.push("场景动作");
    const view = storyViewForSequenceId(row.id) || "story-sequence";
    const page = storyPageDefinitionForView(view);
    return {id: row.id, key: `related-story:${row.id}`, handle: `story-sequence:${row.id}`,
      label: sequence?.trigger_label ? sequence.label
        : page?.sequenceId ? page.title : row.label || sequence?.label || row.id, relations,
      href: `?view=${encodeURIComponent(view)}&storySequence=${encodeURIComponent(row.id)}&storyPaused=1`};
  });
}
