// @editor-module 剧情玩家操控区段与实际等待条件的投影。
export function storyPlayerSegments(compiled) {
  const frames = compiled.frames || [];
  const segments = [];
  for (let start = 0; start < frames.length; start += 1) {
    const snapshot = frames[start];
    const released = snapshot.actors?.find(actor => actor.currentCommand?.operation === "toggle-player-control-lock"
      && actor.currentCommand.controlLock === 0);
    if (!released || snapshot.controlLock !== 0 || frames[start - 1]?.controlLock === 0) continue;
    let end = start + 1;
    while (end < frames.length && frames[end].controlLock === 0
      && frames[end].sceneId === snapshot.sceneId) end += 1;
    const conditions = new Map();
    for (let frame = start; frame < end; frame += 1) {
      for (const actor of frames[frame].actors || []) {
        const command = actor.currentCommand;
        const condition = command?.playerCondition;
        if (!condition) continue;
        const {satisfied, ...predicate} = condition;
        const key = `${frames[frame].variantId}:${actor.actorSlot}:${actor.scriptKind}:${actor.scriptId}:${command.cursor}`;
        if (!conditions.has(key) && !satisfied) conditions.set(key, {
          key, condition: predicate, actorSlot: actor.actorSlot, variantId: frames[frame].variantId,
          scriptKind: actor.scriptKind, programId: actor.scriptId, command,
          start: frame, satisfiedAt: null,
        });
        const wait = conditions.get(key);
        if (wait && satisfied && wait.satisfiedAt === null) wait.satisfiedAt = frame;
      }
    }
    const waits = [...conditions.values()];
    const regions = waits.filter(wait => wait.condition.kind !== "event-flag");
    const trigger = (regions.length ? regions : waits).filter(wait => wait.satisfiedAt !== null)
      .sort((a, b) => a.satisfiedAt - b.satisfiedAt)[0];
    // 操控返回的最终帧没有自由移动区段。
    if (end === start + 1 && !waits.length) continue;
    if (end === frames.length && compiled.controlReturned && !regions.length) continue;
    segments.push({id: `player:${start}`, start, end: trigger?.satisfiedAt ?? end,
      sceneId: snapshot.sceneId, variantId: snapshot.variantId,
      release: {actorSlot: released.actorSlot, scriptKind: released.scriptKind,
        programId: released.scriptId, command: released.currentCommand},
      waits, regions, trigger, resumed: end < frames.length,
      inputs: snapshot.previewFieldInputs || []});
    start = end - 1;
  }
  return segments;
}

export function storyPlayerRegion(condition) {
  return condition.kind === "player-position"
    ? {left: condition.x, right: condition.x + 1, top: condition.y, bottom: condition.y + 1}
    : condition.kind === "player-rectangle" ? condition : null;
}

export function storyPlayerConditionLabel(condition) {
  return condition.kind === "event-flag" ? "触发：满足事件条件" : "触发：玩家进入区域";
}
