// @editor-module 剧情 VM 执行轨迹的三栏投影
import {storyCompiledDialogueRuns, storySnapshotActors} from "./vm.js";
import {storyPlayerSegments} from "./player-control.js";
import {storyDriverTrace} from "./driver-trace.js";

const traces = new WeakMap();

function commandRuns(compiled) {
  const frames = compiled.frames || [];
  const active = new Map();
  const previousTerminal = new Map();
  const runs = [];
  const close = (actorKey, end) => {
    const run = active.get(actorKey);
    if (!run) return;
    active.delete(actorKey);
    const boundedEnd = Math.max(run.start + 1, Number(end) || 0);
    run.frames = boundedEnd - run.start;
    runs.push(run);
  };
  frames.forEach((snapshot, frame) => {
    const present = new Set();
    for (const actor of snapshot.actors || []) {
      const variantId = Number(snapshot.variantId);
      const actorSlot = Number(actor.actorSlot);
      const actorKey = `${variantId}:${actorSlot}`;
      present.add(actorKey);
      const command = actor.currentCommand;
      const scriptKind = String(actor.scriptKind || "autonomous");
      const programId = Number(actor.scriptId);
      const cursor = Number(command?.cursor);
      const opcode = Number(command?.opcode);
      if (!command || !Number.isInteger(programId)
          || !Number.isInteger(cursor) || !Number.isInteger(opcode)) {
        close(actorKey, frame);
        previousTerminal.delete(actorKey);
        continue;
      }
      const previous = active.get(actorKey) || previousTerminal.get(actorKey);
      const identity = previous?.scriptKind === scriptKind && previous.programId === programId
        && previous.cursor === cursor && previous.opcode === opcode ? previous.identity
        : `${scriptKind}:${programId}:${cursor}:${opcode}`;
      if (active.get(actorKey)?.identity !== identity) {
        close(actorKey, frame);
      }
      const terminal = Boolean(actor.ended || actor.blocked);
      if (terminal && previousTerminal.get(actorKey)?.identity === identity) {
        close(actorKey, frame);
        continue;
      }
      if (!terminal) previousTerminal.delete(actorKey);
      if (!active.has(actorKey)) {
        active.set(actorKey, {
          actorKey,
          actorSlot,
          variantId,
          scriptKind,
          programId,
          instructionId: command.instructionId,
          instructionSource: command.instructionSource,
          structureScriptId: command.structureScriptId,
          cursor,
          cursorHex: command.cursorHex,
          opcode,
          opcodeHex: command.opcodeHex,
          operation: command.operation,
          operands: command.operands || [],
          nextCursor: command.nextCursor,
          targetActor: command.targetActor,
          runtimeResult: command.runtimeResult,
          identity,
          start: frame,
        });
      }
      // 终止或阻塞命令只占终止帧，残留 currentCommand 不延长轨道。
      if (terminal) {
        const run = active.get(actorKey);
        close(actorKey, frame + 1);
        previousTerminal.set(actorKey, run);
      }
    }
    for (const actorKey of active.keys()) {
      if (!present.has(actorKey)) close(actorKey, frame);
    }
    for (const actorKey of previousTerminal.keys()) {
      if (!present.has(actorKey)) previousTerminal.delete(actorKey);
    }
  });
  const end = Math.max(frames.length, Number(compiled.duration) || 0);
  for (const actorKey of active.keys()) close(actorKey, end);
  return runs;
}


export function storyExecutionTrace(compiled) {
  if (traces.has(compiled)) return traces.get(compiled);
  const actorFrames = new WeakMap();
  const actorsAt = snapshot => {
    let actors = actorFrames.get(snapshot);
    if (!actors) {
      actors = storySnapshotActors(snapshot);
      actorFrames.set(snapshot, actors);
    }
    return actors;
  };
  const playerSegments = storyPlayerSegments(compiled);
  const boundaries = new Map((compiled.shots || []).map(shot => [Number(shot.frame), shot]));
  for (const segment of playerSegments) {
    for (const [frame, label] of [[Math.min(segment.start + 1, segment.end), "玩家操控"],
      ...(segment.trigger ? [[segment.end, "触发续演"]] : [])]) {
      const snapshot = compiled.frames[frame];
      if (!snapshot) continue;
      boundaries.set(frame, {...boundaries.get(frame), frame, variantId: snapshot.variantId,
        sceneId: snapshot.sceneId, context: snapshot.context, label});
    }
  }
  const shots = [...boundaries.values()].sort((a, b) => a.frame - b.frame).map((shot, index, all) => ({
    ...shot,
    id: `shot:${index}:${Number(shot.variantId)}`,
    index,
    start: Number(shot.frame) || 0,
    end: Number(all[index + 1]?.frame ?? compiled.duration),
  }));
  const shotAt = frame => shots.findLast(shot => shot.start <= frame);
  const occurrences = new Map();
  const regularRuns = commandRuns(compiled);
  // 加载期间的指令归进场键，保留其操作数编辑入口。
  const initializationRuns = commandRuns({frames: compiled.frames?.[0]?.initializationFrames || []})
    .filter(run => !regularRuns.some(item => item.actorKey === run.actorKey && item.identity === run.identity))
    .map(run => ({...run, start: 0, frames: 1}));
  const orderedShots = shots.every((shot, index) => index === 0
    || shots[index - 1].start <= shot.start && shots[index - 1].end <= shot.end);
  const commands = [];
  for (const run of [...initializationRuns, ...regularRuns]) {
    const end = run.start + run.frames;
    let first = 0, limit = shots.length;
    while (orderedShots && first < limit) {
      const middle = (first + limit) >>> 1;
      if (shots[middle].end <= run.start) first = middle + 1;
      else limit = middle;
    }
    for (let index = first; index < shots.length && (!orderedShots || shots[index].start < end); index += 1) {
      const shot = shots[index];
      if (!(run.start < shot.end && end > shot.start)) continue;
      commands.push({...run, shotId: shot.id, start: Math.max(run.start, shot.start),
        end: Math.min(end, shot.end)});
    }
  }
  commands.sort((a, b) => a.start - b.start || a.actorSlot - b.actorSlot);
  commands.forEach((run, index) => {
    const key = `${run.actorKey}/${run.scriptKind}/${run.programId}/${run.instructionId}`;
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    run.frames = run.end - run.start;
    run.id = run.instructionId ? `command:${key}/${occurrence}` : `command:${run.start}:${index}`;
  });
  const dialogues = shots.flatMap(shot => storyCompiledDialogueRuns(compiled,
    {start: shot.start, end: Math.min(shot.end, compiled.frames?.length || 0)}, true))
    .map((run, index) => {
      const source = compiled.frames[run.start].dialogue;
      const pages = source.pages ? source.pages.map(page => [...page]) : [];
      if (!pages.length) {
        for (let frame = run.start; frame < run.end; frame += 1) {
          const dialogue = compiled.frames[frame].dialogue;
          pages[dialogue.pageIndex || 0] = [...(dialogue.lines || [])];
        }
      }
      return {...run, id: `dialogue:${run.start}:${index}`, shotId: shotAt(run.start)?.id,
        dialogue: {...source, pages, text: source.text || pages.flat().join("\n")}};
    });
  const cameras = [];
  for (const shot of shots) {
    let previous = null;
    let previousSnapshot = null;
    for (let frame = shot.start; frame < shot.end; frame += 1) {
      const snapshot = compiled.frames[frame] || {};
      if (previousSnapshot && snapshot.sceneId === previousSnapshot.sceneId
          && snapshot.cameraKnown === previousSnapshot.cameraKnown
          && snapshot.cameraTileOriginX === previousSnapshot.cameraTileOriginX
          && snapshot.cameraTileOriginY === previousSnapshot.cameraTileOriginY) continue;
      const identity = JSON.stringify([snapshot.sceneId, snapshot.cameraKnown,
        snapshot.cameraTileOriginX, snapshot.cameraTileOriginY]);
      if (identity === previous) continue;
      if (cameras.at(-1)?.shotId === shot.id) cameras.at(-1).end = frame;
      cameras.push({id: `camera:${frame}:${cameras.length}`, start: frame,
        end: shot.end, shotId: shot.id, snapshot});
      previous = identity;
      previousSnapshot = snapshot;
    }
  }
  const audio = (compiled.audioEvents || []).map((event, index) => ({
    ...event, id: `audio:${event.frame}:${index}`, start: Number(event.frame) || 0,
    end: (Number(event.frame) || 0) + 1, shotId: shotAt(event.frame)?.id,
  }));
  const actors = shots.flatMap(shot => {
    const objects = new Map();
    const appeared = new Set();
    const commanded = new Set();
    for (let frame = shot.start; frame < shot.end; frame += 1) {
      const snapshot = compiled.frames[frame] || {};
      if (!snapshot.actors?.length && !snapshot.partyActors?.length && !snapshot.temporaryEntities?.length) continue;
      for (const source of snapshot.actors || []) {
        const target = source.currentCommand?.targetActor;
        if (!target) continue;
        const matches = actor => target.partySlot != null ? actor.partySlot === target.partySlot
          : actor.fieldEntityIndex === target.fieldEntityIndex;
        const actor = snapshot.partyActors?.find(matches) || snapshot.temporaryEntities?.find(matches);
        if (actor) commanded.add(storyActorObjectId(shot.id, actor));
      }
      for (const actor of actorsAt(snapshot)) {
        if (!actor.hidden) appeared.add(storyActorObjectId(shot.id, actor));
      }
      for (const actor of [...(snapshot.actors || []), ...(snapshot.partyActors || []),
          ...(snapshot.temporaryEntities || [])]) {
        const id = storyActorObjectId(shot.id, actor);
        if (actor.currentCommand) commanded.add(id);
        if (!objects.has(id)) objects.set(id, {id, kind: "actor", refs: [],
          shotId: shot.id, variantId: shot.variantId, start: shot.start, end: shot.end,
          partySlot: actor.partySlot, actorSlot: actor.actorSlot,
          fieldEntityIndex: actor.fieldEntityIndex});
        const object = objects.get(id);
        if (!object.refs.some(ref => ref.variantId === snapshot.variantId
            && ref.actorSlot === actor.actorSlot)) {
          object.refs.push({variantId: snapshot.variantId, actorSlot: actor.actorSlot});
        }
      }
    }
    return [...objects.values()].filter(actor => appeared.has(actor.id) || commanded.has(actor.id));
  });
  const stateDrivers = storyDriverTrace(compiled, {shots, commands}, actorsAt);
  const actorObjects = new Map(actors.map(actor => [actor.id, actor]));
  for (const object of stateDrivers.objects) if (!actorObjects.has(object.id)) actorObjects.set(object.id, object);
  const trace = {shots, commands, dialogues, cameras, audio, playerSegments,
    drivers: stateDrivers.drivers, driverChanges: stateDrivers.changes,
    objects: [...actorObjects.values(), {id: "object:dialogue", kind: "text"},
      {id: "object:interface", kind: "interface"},
      {id: "object:camera", kind: "camera"}, {id: "object:audio", kind: "audio"},
      ...(playerSegments.length ? [{id: "object:input", kind: "player-input"}] : [])]};
  traces.set(compiled, trace);
  return trace;
}

export function storyActorObjectId(shotId, actor) {
  if (actor.fieldEntityIndex !== undefined) return `${shotId}:object:entity:${actor.fieldEntityIndex}`;
  return actor.partySlot === null || actor.partySlot === undefined
    ? `${shotId}:object:actor:${actor.actorSlot}` : `${shotId}:object:party:${actor.partySlot}`;
}

export function storyTraceObjectAt(compiled, object, frame) {
  const snapshot = compiled.frames?.[frame] || {};
  if (object.kind !== "actor") return {snapshot};
  const withinShot = frame >= object.start && frame < object.end;
  const actor = withinShot ? storySnapshotActors(snapshot)
    .find(actor => storyActorObjectId(object.shotId, actor) === object.id) : null;
  return {snapshot, actor, withinShot};
}
