// @editor-module 剧情等待条件、同场景写入者与结束方式的只读投影。
import {storyViewForSequenceId} from "./story-view-config.js";

export function storyWaitKey(listId, actor, command) {
  return `${listId}:${actor.scriptKind}:${actor.scriptId}:${command.cursor}`;
}

export function storyWaitCondition(command, semantic) {
  const values = command.operands || [];
  if (semantic?.operation === "wait-event-flag-set") {
    return {kind: "event-flag", flagId: Number(values[0])};
  }
  if (semantic?.operation === "branch-on-player-position-exact") {
    return {kind: "player-position", x: Number(values[0]), y: Number(values[1])};
  }
  if (semantic?.operation === "branch-on-player-position-rectangle") {
    return {kind: "player-rectangle", left: Number(values[0]), right: Number(values[1]),
      top: Number(values[2]), bottom: Number(values[3])};
  }
  return null;
}

function storyWaitSatisfied(condition, snapshot) {
  if (condition.kind === "event-flag") return (snapshot.eventFlags || []).includes(condition.flagId);
  if (condition.kind === "player-position") return snapshot.playerMapX === condition.x
    && snapshot.playerMapY === condition.y;
  return snapshot.playerMapX >= condition.left && snapshot.playerMapX < condition.right
    && snapshot.playerMapY >= condition.top && snapshot.playerMapY < condition.bottom;
}

function scriptWriter(story, list, actor, kind, command, operation) {
  const sequence = story.browser_vm.sequences.find(row => row.entry_variant_id === list.id
    && (kind === "interaction" ? row.interaction_trigger?.actor_record_id === actor.record_id
      : !row.interaction_trigger));
  const view = sequence && storyViewForSequenceId(sequence.id);
  return {kind, scriptId: kind === "interaction" ? actor.interaction_or_record_id : actor.autonomous_script_id,
    actorHandle: `scene-actor:${list.id.toString(16).toUpperCase().padStart(2, "0")}:${
      actor.record_id.toString(16).toUpperCase().padStart(2, "0")}`,
    cursor: command.cursor, operation,
    href: view && kind === "interaction" ? `?view=${view}&storySequence=${sequence.id}&storyPaused=1`
      : `?view=actors&actorPart=story&storyKind=${kind}&record=${kind === "interaction"
        ? actor.interaction_or_record_id : actor.autonomous_script_id}#story-script-field-object`};
}

function storyWaitWriters(story, listId, condition) {
  if (condition.kind !== "event-flag") return [{label: "玩家移动", kind: "player"}];
  const vm = story.browser_vm;
  const list = [...vm.variants, ...vm.continuation_actor_lists,
    ...vm.extended_actor_lists, ...vm.interaction_actor_lists].find(row => row.id === listId);
  const semantics = new Map(vm.opcode_semantics.map(row => [row.opcode, row]));
  const writers = [];
  for (const actor of list?.actors || []) for (const kind of ["autonomous", "interaction"]) {
    const scriptId = kind === "autonomous" ? actor.autonomous_script_id : actor.interaction_or_record_id;
    const program = vm.programs.find(row => row.kind === kind && row.id === scriptId);
    for (const command of program?.commands || []) {
      const operation = semantics.get(command.opcode)?.operation;
      if (operation === "set-event-flag" && command.operands[0] === condition.flagId
          || operation === "start-scripted-encounter" && command.operands[1] === condition.flagId) {
        writers.push(scriptWriter(story, list, actor, kind, command, operation));
      }
    }
  }
  return [...writers, ...(vm.wait_state_model?.external_writers || [])
    .filter(row => row.actor_list_id === listId && row.flag_id === condition.flagId)];
}

export function storyWaitingConditions(compiled, story) {
  const snapshot = compiled.frames?.at(-1);
  if (!snapshot || compiled.controlReturned || compiled.battleEntry) return [];
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row => [row.opcode, row]));
  const waits = [];
  for (const actor of snapshot.actors || []) {
    if (actor.ended || actor.blocked || actor.motion) continue;
    const program = story.browser_vm.programs.find(row => row.kind === actor.scriptKind && row.id === actor.scriptId);
    // 坐标分支回跳后的游标与实际执行的条件指令分开。
    const command = program?.commands.find(row => row.cursor === actor.currentCommand?.cursor)
      || program?.commands.find(row => row.cursor === actor.cursor);
    const condition = command && storyWaitCondition(command, semantics.get(command.opcode));
    if (!condition || storyWaitSatisfied(condition, snapshot)) continue;
    const key = storyWaitKey(snapshot.actorListId, actor, command);
    if (waits.some(row => row.key === key)) continue;
    waits.push({key, actorSlot: actor.actorSlot, scriptKind: actor.scriptKind,
      scriptId: actor.scriptId, cursor: command.cursor, condition,
      writers: storyWaitWriters(story, snapshot.actorListId, condition)});
  }
  return waits;
}

export function storyCompletionLabel(compiled, story) {
  if (compiled.completion === "terminal-ending-loop") return "ROM 持续动作 · 等待 RESET";
  if ((story.browser_vm.wait_state_model?.continuous_actor_lists || [])
    .includes(compiled.finalControlState.actorListId)) return "ROM 持续动作";
  if (compiled.controlReturned) return "操控返回";
  if (compiled.completion === "interaction-returned") return "交互返回";
  if (compiled.battleEntry) return "战斗出口";
  if (storyWaitingConditions(compiled, story).length) return "等待条件";
  if (compiled.completion === "waiting-for-story-continuation") return "等待剧情续段";
  if (compiled.completion === "dedicated-field-mode") return "专用模式";
  if (compiled.completion === "field-service-entry") return "场景服务入口";
  if (compiled.completion === "state-routed-story-preview") return "剧情续段边界";
  if (compiled.completion === "ambient-settled") return "脚本结束";
  if (compiled.completion === "ambient-loop") return "ROM 持续动作";
  if (compiled.blockedReasons?.length) return "运行依赖阻塞";
  if (compiled.finalControlState.controlLock !== 0) return "操控仍锁定";
  return compiled.executionStop?.kind === "limit" ? "执行上限" : "状态停滞";
}
