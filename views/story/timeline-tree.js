// @editor-module 剧情时间轴按执行对象与指令语义组织的轨道投影。
import {storyActorObjectId} from "./trace.js";
import {storyPlayerConditionLabel} from "./player-control.js";
import {timelineSummaryBlocks} from "../../ui/timeline-tree.js";
import {storyMovementGroups, storyMovementInstructions} from '../../core/story-movement.js';
import {globalEventFlagHandle} from '../../core/global-event-flags.js';

const hexId = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const groups = {
  text: ["对话窗口", "▤", "object:dialogue"], camera: ["镜头／画面", "▣", "object:camera"],
  interface: ["界面", "▤", "object:interface"],
  flags: ["事件位", "⚑"], audio: ["音频", "♪", "object:audio"],
  input: ["输入", "⌨", "object:input"], flow: ["流程", "↪", "object:flow"],
};
const actorSpanIndexes = new WeakMap();

function timelineActorSpans(frames, shots, actorsAt) {
  const cached = actorSpanIndexes.get(frames);
  if (cached?.shots === shots && cached.actorsAt === actorsAt) return cached.spans;
  const spansByActor = new Map();
  for (const shot of shots) {
    for (let frame = shot.start; frame < Math.min(shot.end, frames.length); frame += 1) {
      for (const actor of actorsAt(frames[frame] || {})) {
        const id = storyActorObjectId(shot.id, actor);
        if (!spansByActor.has(id)) spansByActor.set(id, []);
        const spans = spansByActor.get(id);
        if (spans.at(-1)?.end === frame) spans.at(-1).end = frame + 1;
        else spans.push({start: frame, end: frame + 1});
      }
    }
  }
  actorSpanIndexes.set(frames, {shots, actorsAt, spans: spansByActor});
  return spansByActor;
}

function concurrentCommands(blocks) {
  let actorKey, end = -Infinity, otherEnd = -Infinity;
  for (const block of blocks) {
    const command = block.command;
    if (block.start < (command.actorKey === actorKey ? otherEnd : end)) return true;
    const commandEnd = Number(command.end);
    if (!Number.isFinite(commandEnd)) continue;
    if (command.actorKey === actorKey) end = Math.max(end, commandEnd);
    else if (commandEnd > end) {
      otherEnd = end;
      end = commandEnd;
      actorKey = command.actorKey;
    } else otherEnd = Math.max(otherEnd, commandEnd);
  }
  return false;
}
export function storyTimelineTree({lanes: sources, trace, frames, actorsAt, objectLabels = new Map(), programs = []}) {
  const objectsById = new Map(trace.objects.map(object => [object.id, object]));
  const shotsById = new Map(trace.shots.map(shot => [shot.id, shot]));
  const roots = new Map();
  const children = new Map();
  const mappings = [];
  let actorFolder = null;
  const root = (id, label, icon, objectId = null) => {
    if (!roots.has(id)) roots.set(id, {id, label, icon, objectId, objectRoot: Boolean(objectId), kind: "key", blocks: []});
    return roots.get(id);
  };
  const group = name => {
    const [label, icon, objectId] = groups[name];
    return root(label, label, icon, objectId);
  };
  const actorRoot = (shotId, actor, variantId) => {
    const objectId = storyActorObjectId(shotId, actor);
    const object = objectsById.get(objectId);
    const shot = shotsById.get(shotId);
    const identity = actor.fieldEntityIndex !== undefined ? `临时实体-${actor.fieldEntityIndex}`
      : actor.partySlot != null ? `队伍-${hexId(actor.partySlot)}`
        : `角色-${hexId(object?.variantId ?? variantId)}:${hexId(actor.actorSlot)}`;
    const id = trace.shots.length > 1 ? `幕-${hexId(shot?.index || 0)}/${identity}` : identity;
    const label = objectLabels.get(objectId) || identity.replaceAll("-", " ");
    const lane = root(id, trace.shots.length > 1 ? `第 ${shot.index + 1} 幕 · ${label}` : label, "♟", objectId);
    lane.actorRoot = true;
    if (actorFolder) lane.parentId = actorFolder.id;
    return lane;
  };
  const actorsGroup = () => {
    actorFolder = root("角色", "角色", "♟");
    for (const lane of roots.values()) if (lane.actorRoot) lane.parentId = actorFolder.id;
    return actorFolder;
  };
  const child = (parent, property) => {
    const id = `${parent.id}/${property}`;
    if (!children.has(id)) children.set(id, {id, parentId: parent.id, objectId: parent.objectId,
      label: property, kind: "key", fields: [], blocks: [], sourceRows: []});
    return children.get(id);
  };
  const actorForRun = run => {
    const actor = frames[run.start]?.actors?.find(item => item.actorSlot === run.actorSlot)
      || {actorSlot: run.actorSlot};
    return actorRoot(run.shotId, actor, run.variantId);
  };
  actorsGroup();
  const commandTarget = run => {
    const operation = run.operation;
    if (["set-event-flag", "clear-event-flag"].includes(operation)) {
      const folder = group("flags");
      const flag = root(`${folder.id}/${hexId(run.operands[0])}`, globalEventFlagHandle(run.operands[0]), "⚑", `object:flag:${run.operands[0]}`);
      flag.parentId = folder.id;
      flag.flagId = run.operands[0];
      return flag;
    }
    if (operation === "start-blocking-ui-action") return group("interface");
    if (["start-blocking-dialogue", "start-event-selected-dialogue",
      "set-dialogue-actor-parameter"].includes(operation)) return group("text");
    if (operation === "sound-command") return group("audio");
    if (operation === "toggle-player-control-lock") return group("input");
    if (operation === "drive-scripted-input") return group("input");
    if (["switch-scene-inside-story-state", "advance-global-screen-effect", "set-story-state"].includes(operation)) {
      return group("camera");
    }
    if (["terminate-or-change-mode", "end-story-state", "clear-story-state-and-mode",
      "enter-dedicated-field-mode", "end-story-state-with-scene-context", "start-scripted-encounter",
      "subtract-party-money", "replace-party-item", "grant-party-item-and-branch"].includes(operation)) return group("flow");
    if (operation === "clear-runtime-entity-render-slots") return group("flow");
    if (operation === "clear-runtime-party-slot") return group("flow");
    if (operation === "replace-runtime-player-actor-type") return group("flow");
    const snapshot = frames[run.start] || {};
    if (["transfer-actor-to-runtime-entity", "relocate-runtime-target", "set-runtime-entity-move-direction",
      "restore-party-member-health"].includes(operation)) {
      const reference = run.targetActor;
      const target = reference && [...actorsAt(snapshot), ...(snapshot.partyActors || []),
        ...(snapshot.temporaryEntities || [])].find(actor => reference.partySlot != null
          ? actor.partySlot === reference.partySlot : actor.fieldEntityIndex === reference.fieldEntityIndex);
      if (target) return actorRoot(run.shotId, target, snapshot.variantId);
      return group("flow");
    }
    return actorForRun(run);
  };
  const runs = new Map(trace.commands.map(run => [run.id, run]));
  for (const source of sources) {
    source.blocks.forEach((block, index) => {
      const run = runs.get(block.data?.["story-node"]);
      if (!run) throw new Error(`剧情指令无执行来源：${source.id}`);
      const target = commandTarget(run);
      const lane = child(target, run.operation === "toggle-player-control-lock" ? "玩家操控" : "指令");
      lane.blocks.push({...block,
        sourceRow: source.id, sourceBlock: index, fields: source.fields || [],
        originalLabel: source.originalLabel, operation: run?.operation});
      lane.fields = [...new Map([...lane.fields, ...(source.fields || [])].map(field => [field.identity, field])).values()];
      if (!lane.sourceRows.includes(source.id)) lane.sourceRows.push(source.id);
      mappings.push({sourceRow: source.id, sourceBlock: index, nodeId: block.data?.["story-node"],
        target: lane.id, operation: run?.operation || source.id});
    });
  }
  for (const object of trace.objects.filter(item => item.kind === "actor")) {
    const snapshot = frames[object.start] || {};
    const actor = [...(snapshot.actors || []), ...(snapshot.partyActors || []),
      ...(snapshot.temporaryEntities || [])].find(item => storyActorObjectId(object.shotId, item) === object.id);
    if (actor) actorRoot(object.shotId, actor, snapshot.variantId);
  }
  group("camera");
  group("text");
  group("audio");
  group("interface");
  for (const segment of trace.playerSegments || []) {
    const lane = child(group("input"), "玩家操控");
    const block = (start, id, label, frames, source = null) => ({start, ...(frames ? {frames} : {}),
      label, title: label, tone: "command", data: {"story-node": id}, fields: [],
      command: source ? trace.commands.findLast(run => run.variantId === Number(source.variantId ?? segment.variantId)
        && run.actorSlot === Number(source.actorSlot) && run.scriptKind === source.scriptKind
        && run.programId === Number(source.programId) && run.cursor === source.command.cursor && run.start <= start) : null,
      runtimeSource: source ? null : "storyPlayerSegments / previewFieldInputs"});
    if (!trace.drivers?.some(driver => driver.property === "lock" && driver.start === segment.start
        && driver.value === 0)) lane.blocks.push(block(segment.start, `${segment.id}:release`, "解除操控", null, segment.release));
    lane.blocks.push(block(segment.start + 1, segment.id, "玩家操控（预览模拟输入）", Math.max(1, segment.end - segment.start - 1)));
    if (segment.trigger) lane.blocks.push(block(segment.end, `${segment.id}:trigger`,
      storyPlayerConditionLabel(segment.trigger.condition), null, segment.trigger));
  }
  if (actorFolder) {
    const paths = new Map();
    for (const parent of roots.values()) {
      if (!parent.actorRoot) continue;
      const id = parent.id;
      parent.id = `${actorFolder.id}/${id}`;
      for (const lane of children.values()) {
        if (lane.parentId !== id) continue;
        paths.set(lane.id, `${actorFolder.id}/${lane.id}`);
        lane.id = paths.get(lane.id);
        lane.parentId = parent.id;
      }
    }
    for (const mapping of mappings) mapping.target = paths.get(mapping.target) || mapping.target;
  }
  const ordered = [];
  for (const parent of roots.values()) {
    ordered.push(parent);
    for (const lane of children.values()) {
      if (lane.parentId !== parent.id) continue;
      lane.blocks.sort((a, b) => a.start - b.start);
      if (lane.label === "玩家操控" || lane.blocks.some(block => !block.command)) {
        lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        ordered.push(lane);
        continue;
      }
      const concurrent = concurrentCommands(lane.blocks);
      lane.concurrent = concurrent;
      lane.blocks.forEach(block => { block.frames = Math.max(1, block.command.frames); });
      if (!concurrent && parent.objectId !== "object:dialogue") {
        parent.blocks = lane.blocks;
        parent.fields = lane.fields;
        parent.sourceRows = lane.sourceRows;
        parent.control = `<small>${parent.blocks.length}</small>`;
        for (const mapping of mappings) if (mapping.target === lane.id) mapping.target = parent.id;
        parent.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        continue;
      }
      if (!concurrent) {
        lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
        ordered.push(lane);
        continue;
      }
      const streams = new Map();
      for (const block of lane.blocks) {
        const run = block.command;
        if (!streams.has(run.actorKey)) streams.set(run.actorKey, {
          id: `${parent.id}/来源-${hexId(run.variantId)}:${hexId(run.actorSlot)}`,
          parentId: parent.id, objectId: parent.objectId, kind: "key",
          label: `来源 ${hexId(run.variantId)}:${hexId(run.actorSlot)}`, blocks: [], fields: [], sourceRows: [],
        });
        const stream = streams.get(run.actorKey);
        block.title += ` · 并行来源 ${run.actorKey}`;
        block.data = {...block.data, "story-block-index": stream.blocks.length};
        stream.blocks.push(block);
        stream.fields.push(...block.fields);
        stream.sourceRows.push(block.sourceRow);
        const mapping = mappings.find(item => item.nodeId === run.id);
        mapping.target = stream.id;
      }
      parent.control = `<small>${lane.blocks.length}</small>`;
      for (const stream of streams.values()) {
        stream.fields = [...new Map(stream.fields.map(field => [field.identity, field])).values()];
        stream.sourceRows = [...new Set(stream.sourceRows)];
        stream.control = `<small>${stream.blocks.length}</small>`;
        ordered.push(stream);
      }
    }
  }
  const commandBlocks = new Map(ordered.flatMap(lane => lane.blocks.map(block => [block.command?.id, block])));
  const driverEnds = new Map();
  const nextDrivers = new Map();
  for (const driver of [...(trace.drivers || [])].sort((a, b) => b.start - a.start)) {
    const key = `${driver.objectId}/${driver.property}`;
    const end = driver.group === "actor" ? shotsById.get(driver.shotId)?.end ?? frames.length : frames.length;
    driverEnds.set(driver.id, Math.min(nextDrivers.get(key) ?? end, end));
    nextDrivers.set(key, driver.start);
  }
  const actorSpans = timelineActorSpans(frames, trace.shots, actorsAt);
  for (const driver of trace.drivers || []) {
    let parent = [...roots.values()].find(lane => lane.objectId === driver.objectId);
    if (!parent && driver.group === "actor") {
      parent = actorRoot(driver.shotId, driver.actor, frames[driver.start]?.variantId);
      if (actorFolder && !parent.id.startsWith(`${actorFolder.id}/`)) parent.id = `${actorFolder.id}/${parent.id}`;
    }
    if (!parent && driver.group === "flags") {
      const folder = group("flags");
      const flagId = Number(driver.objectId.split(":").at(-1));
      parent = root(`${folder.id}/${hexId(flagId)}`, globalEventFlagHandle(flagId), "⚑", driver.objectId);
      parent.parentId = folder.id;
      parent.flagId = flagId;
    }
    if (!parent) parent = group(driver.group === "dialogue" ? "text" : driver.group);
    if (!ordered.includes(parent)) {
      if (parent.parentId) {
        const folder = [...roots.values()].find(lane => lane.id === parent.parentId);
        if (folder && !ordered.includes(folder)) ordered.push(folder);
      }
      ordered.push(parent);
    }
    const id = driver.group === "audio" && driver.property === "trigger" ? `${parent.id}/触发/${driver.audioKind}`
      : driver.property === "lock" ? `${parent.id}/玩家操控`
      : driver.property === "dialogue" ? `${parent.id}/台词` : `${parent.id}/状态/${driver.property}`;
    let lane = ordered.find(lane => lane.id === id);
    if (!lane) {
      lane = {id, parentId: parent.id, objectId: parent.objectId, label: driver.property === "lock" ? "玩家操控"
        : driver.property === "dialogue" ? "台词" : driver.label,
        kind: "key", blocks: [], fields: [], sourceRows: []};
      const end = ordered.findLastIndex(lane => lane.id === parent.id || lane.parentId === parent.id);
      ordered.splice(end + 1, 0, lane);
    }
    const sourceBlock = commandBlocks.get(driver.command?.id);
    const valueLabel = driver.property === "scene" ? `${driver.before ? `离开 ${hexId(driver.before.scene)} → ` : ""}场景 ${hexId(driver.value.scene)}`
      : driver.group === "interface" ? driver.value?.label || "隐藏"
        : driver.property === "dialogue" ? driver.value ? "台词" : "隐藏"
        : driver.property === "visibility" ? driver.value ? "显示" : "隐藏"
          : driver.property === "flag" ? driver.value ? "置位" : "清除"
            : driver.property === "lock" ? driver.value ? "锁定操控" : "解除操控" : driver.label;
    const actorEnd = driver.group === "actor" && driver.property !== "visibility"
      ? actorSpans.get(driver.objectId)?.find(span => span.start <= driver.start && driver.start < span.end)?.end : null;
    const end = ["trigger", "confirm"].includes(driver.property) || driver.property === "dialogue" && !driver.value
      ? driver.end : Math.min(driverEnds.get(driver.id), actorEnd ?? frames.length);
    if (driver.property === "lock" && sourceBlock?.start === driver.start && lane.blocks.includes(sourceBlock)) {
      sourceBlock.driver = driver;
      sourceBlock.frames = Math.max(1, end - driver.start);
      sourceBlock.label = valueLabel;
      sourceBlock.title = `${valueLabel} · ${driver.source}`;
      sourceBlock.data = {...sourceBlock.data, "story-node": driver.id, "story-driver-key": "true",
        "story-player-control-key": "true"};
      mappings.push({nodeId: driver.id, target: lane.id, operation: driver.property});
      continue;
    }
    const block = {start: driver.start, frames: Math.max(1, end - driver.start),
      label: valueLabel, title: `${valueLabel} · ${driver.source}`, tone: "command",
      driver, command: driver.command, fields: sourceBlock?.fields || [],
      data: {"story-node": driver.id, "story-driver-key": "true", "story-block-index": lane.blocks.length,
        ...(driver.property === "lock" ? {"story-player-control-key": "true"} : {})}};
    lane.blocks.push(block);
    mappings.push({nodeId: driver.id, target: lane.id, operation: driver.property});
  }
  const dialogue = group("text");
  for (let frame = 0; frame < frames.length; frame += 1) {
    if (!frames[frame].dialogue) continue;
    const previous = dialogue.blocks.at(-1);
    if (previous && previous.start + previous.frames === frame) {
      previous.frames += 1;
      continue;
    }
    const driver = trace.drivers?.find(driver => driver.property === "dialogue" && driver.start === frame);
    dialogue.blocks.push({start: frame, frames: 1, label: "对话窗口", title: "对话窗口", tone: "command", dialogueWindow: true,
      command: driver?.command, fields: commandBlocks.get(driver?.command?.id)?.fields || [],
      data: {"story-node": driver?.id || `dialogue-window:${frame}`}});
  }
  dialogue.summaryBlocks = dialogue.blocks;
  const movements = storyMovementGroups(trace.commands);
  for (const lane of ordered) {
    const grouped = new Map();
    lane.blocks = lane.blocks.filter(block => {
      const runs = movements.get(block.command?.id);
      if (!runs) return true;
      const first = runs[0];
      const previous = grouped.get(first.id);
      if (previous) {
        previous.frames = Math.max(previous.start + previous.frames, block.start + block.frames) - previous.start;
        if (previous.driver && block.driver) previous.driver = {...previous.driver,
          value: block.driver.value, changes: [...previous.driver.changes, ...block.driver.changes]};
        return false;
      }
      grouped.set(first.id, block);
      const instructions = programs.length ? storyMovementInstructions(first, programs) : runs;
      block.command = {...first, movementRuns: runs, movementInstructions: instructions};
      block.label = `走 ${instructions.length} 格`;
      block.title += ` · ${instructions.length} 步`;
      return true;
    });
    lane.keyMinWidth = 8;
    for (const block of lane.blocks) block.frames = Math.max(1, block.frames || 1);
    lane.blocks.sort((left, right) => left.start - right.start);
    lane.blocks.forEach((block, index) => block.data = {...block.data, "story-block-index": index});
    if (lane !== dialogue && lane.blocks.some(block => block.command) && ordered.some(child => child.parentId === lane.id)) {
      const starts = new Set(lane.blocks.map(block => block.start));
      lane.summaryBlocks = [...lane.blocks,
        ...timelineSummaryBlocks(ordered, lane.id).filter(block => !starts.has(block.start)
          && !lane.blocks.some(key => key.start <= block.start && block.start < key.start + (key.frames || 1)))];
    }
  }
  return {lanes: ordered, mappings};
}
