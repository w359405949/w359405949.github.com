// @editor-module 剧情执行链与存档事件位的双向引用投影。
import {storyViewForSequenceId, storySequencePreludeIdForView, storyPageDefinitionForView} from "./story-view-config.js";
const storiesByFlag = new WeakMap();

export function storyEventReferences(sequenceId, story) {
  const sequence = story?.browser_vm?.sequences?.find(row => row.id === sequenceId);
  if (!sequence) return [];
  const lists = [...(story.browser_vm.variants || []),
    ...(story.browser_vm.continuation_actor_lists || []),
    ...(story.browser_vm.extended_actor_lists || []),
    ...(story.browser_vm.interaction_actor_lists || [])];
  const ids = new Set([...(sequence.variant_ids || []),
    ...(sequence.shots || []).map(row => row.variant_id)]);
  const selectedLists = lists.filter(row => ids.has(row.id));
  const autonomous = new Set(sequence.source_script_ids || []);
  for (const list of selectedLists) for (const actor of list.actors || []) {
    autonomous.add(actor.autonomous_script_id);
  }
  const interaction = new Set();
  if (sequence.interaction_trigger) interaction.add(sequence.interaction_trigger.script_id);
  for (const list of selectedLists) if (list.initial_state_source?.kind === "rom-interaction-script") {
    interaction.add(list.initial_state_source.script_id);
  }
  const references = new Map();
  for (const source of story.browser_vm.wait_state_model?.external_writers || []) {
    if (!ids.has(source.actor_list_id)) continue;
    if (!references.has(source.flag_id)) references.set(source.flag_id,
      {flag_id: source.flag_id, accesses: new Set(), sources: []});
    const row = references.get(source.flag_id);
    row.accesses.add("外部写入");
    row.sources.push(source);
  }
  for (const [kind, scripts] of [["autonomous", autonomous], ["interaction", interaction]]) {
    for (const script of story[kind]?.entries || []) {
      if (!scripts.has(script.id)) continue;
      for (const reference of script.state_references || []) {
        const flag = reference.flag_id;
        if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
        const row = references.get(flag);
        row.accesses.add(reference.operation === "set-after-victory" ? "战斗胜利写入"
          : reference.access === "write" ? "写入" : "读取");
        row.sources.push({kind, script_id: script.id, ...reference});
      }
    }
  }
  const events = (story.browser_vm.entry_events || []).filter(row => row.sequence_id === sequenceId);
  for (const event of events) for (const flag of event.completion_flags || []) {
    if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
    references.get(flag).completion = true;
    if ((event.victory_flags || []).includes(flag)) {
      references.get(flag).accesses.add("战斗胜利写入");
    }
  }
  for (const event of events) if (event.entry_music) {
    const flag = event.entry_music.flag_id;
    if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
    const row = references.get(flag);
    row.accesses.add("读取（入口音乐）");
    row.sources.push({kind: "scene-entry-music", ...event.entry_music});
  }
  if (sequence.ending_animation) {
    const flags = new Set([sequence.ending_animation.audio?.event_flag,
      ...sequence.ending_animation.timeline.filter(stage => stage.conditional)
        .map(stage => stage.event_flag)].filter(Number.isInteger));
    for (const flag of flags) {
      if (!references.has(flag)) references.set(flag, {flag_id: flag, accesses: new Set(), sources: []});
      const row = references.get(flag);
      row.accesses.add("读取（结局分支）");
      row.sources.push({kind: "ending-machine-code", flag_id: flag,
        evidence: story.caller_audit?.ending_credits_runtime?.machine_loops});
    }
  }
  const transient = new Set(story.browser_vm.control_state_model?.scene_reload_cleared_event_flags || []);
  const preludeId = storySequencePreludeIdForView(storyViewForSequenceId(sequenceId));
  if (preludeId && preludeId !== sequenceId) {
    for (const reference of storyEventReferences(preludeId, story)) {
      if (!references.has(reference.flag_id)) references.set(reference.flag_id,
        {...reference, accesses: new Set(reference.accesses)});
      else {
        const target = references.get(reference.flag_id);
        reference.accesses.forEach(access => target.accesses.add(access));
        target.sources.push(...reference.sources);
        target.completion ||= reference.completion;
      }
    }
  }
  return [...references.values()].sort((a, b) => a.flag_id - b.flag_id).map(row => ({
    ...row, accesses: [...row.accesses], transient: transient.has(row.flag_id),
  }));
}

export function storiesForEventFlag(flagId, story) {
  if (!story) return [];
  if (storiesByFlag.has(story)) return storiesByFlag.get(story).get(Number(flagId)) || [];
  const result = new Map();
  for (const sequence of story.browser_vm?.sequences || []) {
    const view = storyViewForSequenceId(sequence.id);
    if (!view) continue;
    for (const reference of storyEventReferences(sequence.id, story)) {
      if (!result.has(reference.flag_id)) result.set(reference.flag_id, []);
      result.get(reference.flag_id).push({...reference, sequence_id: sequence.id,
        label: storyPageDefinitionForView(view)?.title || sequence.label || sequence.id,
        href: `?view=${encodeURIComponent(view)}&storySequence=${encodeURIComponent(sequence.id)}&storyPaused=1`});
    }
  }
  for (const kind of ["autonomous", "interaction"]) {
    for (const script of story[kind]?.entries || []) {
      for (const reference of script.state_references || []) {
        const flag = reference.flag_id;
        if (!result.has(flag)) result.set(flag, []);
        const rows = result.get(flag);
        if (rows.some(row => row.sources?.some(source =>
          source.kind === kind && source.script_id === script.id))) continue;
        const scriptKey = `${kind}:${script.id}`;
        const existing = rows.find(row => row.script_key === scriptKey);
        const access = reference.operation === "set-after-victory" ? "战斗胜利写入"
          : reference.access === "write" ? "写入" : "读取";
        if (existing) {
          if (!existing.accesses.includes(access)) existing.accesses.push(access);
          continue;
        }
        const scenes = [...new Set((story.npc_catalog?.records || [])
          .filter(actor => actor[`${kind}_script`]?.id === script.id)
          .flatMap(actor => (actor.scenes || []).map(scene => scene.name)))];
        rows.push({flag_id: flag, script_key: scriptKey, accesses: [access],
          label: `${scenes.join("、") || "剧情"} · ${script.label || script.id_hex}`,
          href: `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}#story-script-field-object`});
      }
    }
  }
  storiesByFlag.set(story, result);
  return result.get(Number(flagId)) || [];
}
