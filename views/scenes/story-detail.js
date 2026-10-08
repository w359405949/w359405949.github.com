// @editor-module 场景进场剧情与关联剧情共用只读详情和剧情页入口。
import {esc} from "../../core/dom.js";
import {state} from "../../core/state.js";
import {sceneEntryStoryItemsForProject} from "../../core/scene-entry-interactions.js";
import {sceneRelatedStories} from "../../core/scene-related-stories.js";
import {storyPageDefinitionForView, storyViewForSequenceId} from "../../core/story-view-config.js";
import {handleMarkup} from "../../ui/handle.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {fields} from "../../ui/record.js";

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

export function renderSceneStoryInspector(item, extraMarkup = "") {
  const story = state.project.story || {};
  const sceneId = state.sceneEntry.id;
  const sequence = story.browser_vm?.sequences?.find(row => row.id === item.id);
  const inventory = story.cutscene_inventory?.entries?.find(row => row.id === item.id);
  const entry = sceneEntryStoryItemsForProject(sceneId, story).find(row => row.id === item.id);
  const event = story.browser_vm?.entry_events?.find(row => row.sequence_id === item.id);
  const related = sceneRelatedStories(sceneId, story).find(row => row.id === item.id);
  const view = storyViewForSequenceId(item.id) || "story-sequence";
  const page = storyPageDefinitionForView(view);
  const href = `?${new URLSearchParams({view, storySequence: item.id, storyPaused: "1"})}`;
  const actors = sequence?.trigger_actor_handles || (sequence?.interaction_trigger
    ? [`scene-actor:${hex(sequence.entry_variant_id)}:${hex(sequence.interaction_trigger.actor_record_id)}`]
    : []);
  const owners = actors.length ? actors : (inventory?.actor_list_ids || sequence?.variant_ids || [])
    .map(id => `scene-actor-list:${hex(id)}`);
  const trigger = item.trigger || entry?.trigger || event?.trigger
    || (sequence?.interaction_trigger ? "与所属角色交互" : "未确认");
  const relations = item.relations || related?.relations || [];
  const summary = page?.description || [relations.join(" · "),
    sequence?.shots?.length ? `${sequence.shots.length} 幕演出` : ""].filter(Boolean).join("；") || "未确认";
  const location = physicalLocationMarkup({rows: (event?.evidence_prg_offsets || [])
    .map((offset, index) => ({label: `进场证据 ${index + 1}`, address: {space: "prg", offset}}))});
  const evidence = location ? "" : item.evidence || entry?.evidence;
  return `<div class="scene-object-editor scene-link-inspector" data-scene-story="${esc(item.id)}"${
    item.key.startsWith("related-story:") ? ` data-scene-related-story="${esc(item.id)}"` : ""}>
    <h2>剧情详情</h2>
    ${fields([
      ["剧情名", `${esc(item.label)}<br>${handleMarkup(`story-sequence:${item.id}`)}`],
      ["触发条件", esc(trigger)],
      ["角色或入口", owners.map(handleMarkup).join(" · ") || "未确认"],
      ["摘要", esc(summary)],
    ])}
    <p><a class="record-link" data-scene-story-link href="${esc(href)}"
      aria-label="剧情编辑页" title="剧情编辑页">↗</a></p>
    ${relations.length ? `<p>${esc(relations.join(" · "))}</p>` : ""}
    ${evidence ? `<small>${esc(evidence)}</small>` : ""}
    ${extraMarkup}${location}</div>`;
}
