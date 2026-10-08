// @editor-module 剧情逐帧状态驱动与对象轨的投影。
import {storyInterfaceState} from "../../core/story-interface.js";
import {globalEventFlagHandle} from '../../core/global-event-flags.js';

const omitted = value => value === undefined || typeof value === 'function' || typeof value === 'symbol';
function same(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object'
      || left.toJSON || right.toJSON) return JSON.stringify(left) === JSON.stringify(right);
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (index in left && left[index] !== right[index] && !same(omitted(left[index]) ? null : left[index],
        omitted(right[index]) ? null : right[index])) return false;
    }
    return true;
  }
  const keys = Object.keys(left), otherKeys = Object.keys(right);
  let matchingKeys = keys.length === otherKeys.length;
  for (let index = 0; matchingKeys && index < keys.length; index += 1)
    matchingKeys = keys[index] === otherKeys[index];
  if (matchingKeys) {
    for (const key of keys) if (!same(left[key], right[key])) return false;
    return true;
  }
  const leftKeys = keys.filter(key => !omitted(left[key]));
  const rightKeys = otherKeys.filter(key => !omitted(right[key]));
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]
    && same(left[key], right[key]));
}
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const actorId = (shot, actor) => actor.fieldEntityIndex !== undefined
  ? `${shot.id}:object:entity:${actor.fieldEntityIndex}`
  : actor.partySlot == null ? `${shot.id}:object:actor:${actor.actorSlot}`
    : `${shot.id}:object:party:${actor.partySlot}`;

// 字段与处理器的对应只用于连接已有脚本键；运行时变化不倒推脚本操作数。
const operations = {
  scene: ["switch-scene-inside-story-state", "set-story-state", "replace-runtime-entity-scene"],
  camera: ["drive-scripted-input", "switch-scene-inside-story-state", "set-story-state"],
  scroll: ["advance-global-screen-effect"],
  lock: ["toggle-player-control-lock"], input: ["drive-scripted-input"],
  dialogue: ["start-blocking-dialogue", "start-blocking-ui-action", "start-event-selected-dialogue"],
  flag: ["set-event-flag", "clear-event-flag"],
  position: ["set-actor-position", "set-packed-camera-relative-position", "move-actor-to-position",
    "attempt-tile-step", "drive-scripted-input", "follow-rom-waypoint-loop", "step-by-rom-direction-table",
    "step-toward-story-target", "step-toward-story-target-until-adjacent", "advance-wander-motion",
    "wander-inside-rectangle", "relocate-runtime-target", "transfer-actor-to-runtime-entity"],
  direction: ["set-direction", "face-opposite-runtime-direction", "set-runtime-entity-move-direction"],
  appearance: ["set-actor-type", "set-actor-type-animation-renderer", "set-direct-frame-id",
    "decrement-actor-type", "play-table-driven-actor-transformation"],
  visibility: ["remove-actor", "move-actor-off-map", "remove-actor-if-event-flag-set", "pop-story-actor-slot"],
  offset: ["play-render-slot-offset-sequence", "play-rom-recovery-effect"],
  motion: ["set-motion-attributes", "initialize-actor-motion-state"],
  tiles: ["mutate-field-tile-near-actor", "write-field-tile-at-actor", "refresh-field-state"],
  mode: ["terminate-or-change-mode", "end-story-state", "clear-story-state-and-mode",
    "enter-dedicated-field-mode", "end-story-state-with-scene-context", "start-scripted-encounter"],
  story: ["set-story-state", "end-story-state", "clear-story-state-and-mode", "start-scripted-encounter",
    "end-story-state-with-scene-context"],
  battle: ["start-scripted-encounter"], service: ["enter-field-travel-service"],
  parameters: ["set-global-parameter", "set-story-parameter", "set-dialogue-actor-parameter",
    "set-runtime-party-slot-index", "set-runtime-parameter-$9c", "set-runtime-parameter-$a2",
    "adopt-runtime-entity-state", "set-runtime-entity-move-direction"],
  result: ["find-party-item-and-branch", "grant-party-item-and-branch", "replace-party-item"],
  money: ["subtract-party-money"], inventory: ["replace-party-item", "grant-party-item-and-branch"],
  members: ["restore-party-member-health"], vehicles: ["park-selected-vehicle", "release-selected-vehicle"],
  party: ["join-party-and-remove-scene-actor", "clear-runtime-party-slot"],
  entities: ["push-temporary-field-entity", "clear-runtime-entity-render-slots"],
  execution: ["end-actor-script", "terminate-or-change-mode", "enter-dedicated-field-mode"],
  music: ["sound-command"], "music-status": ["sound-command"], "audio-fade": ["sound-command"],
};

function interfaceState(snapshot) {
  return storyInterfaceState(snapshot);
}

const emptyActors = [];
function sameDialogue(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (left.regionId === right.regionId || same(left.regionId, right.regionId))
    && (left.recordId === right.recordId || same(left.recordId, right.recordId))
    && (left.pageIndex === right.pageIndex || same(left.pageIndex, right.pageIndex))
    && (left.lines === right.lines || same(left.lines, right.lines))
    && (left.prefixRecordId === right.prefixRecordId || same(left.prefixRecordId, right.prefixRecordId))
    && (left.interactionWindow === right.interactionWindow || same(left.interactionWindow, right.interactionWindow))
    && (left.operation === right.operation || same(left.operation, right.operation))
    && (left.uiScreenId === right.uiScreenId || same(left.uiScreenId, right.uiScreenId))
    && (left.uiPreviewContext === right.uiPreviewContext || same(left.uiPreviewContext, right.uiPreviewContext));
}
function sameDriverActor(actor, other) {
  return !(actor.actorSlot !== other.actorSlot
        || actor.partySlot !== other.partySlot
        || actor.fieldEntityIndex !== other.fieldEntityIndex
        || actor.x !== other.x
        || actor.y !== other.y
        || actor.direction !== other.direction
        || actor.actorType !== other.actorType
        || actor.renderMode !== other.renderMode
        || actor.palette !== other.palette
        || actor.hidden !== other.hidden
        || actor.screenOffsetX !== other.screenOffsetX
        || actor.screenOffsetY !== other.screenOffsetY
        || actor.motionAttributes !== other.motionAttributes
        || actor.ended !== other.ended
        || actor.blocked !== other.blocked);
}
function sameDriverActors(left, right) {
  return left.length === right.length && left.every((actor, index) => sameDriverActor(actor, right[index]));
}
function sameDriverGlobals(left, right) {
  return (left.sceneId === right.sceneId || same(left.sceneId, right.sceneId))
    && (left.actorListId === right.actorListId || same(left.actorListId, right.actorListId))
    && (left.playerMapX === right.playerMapX || same(left.playerMapX, right.playerMapX))
    && (left.playerMapY === right.playerMapY || same(left.playerMapY, right.playerMapY))
    && (left.cameraTileOriginX === right.cameraTileOriginX || same(left.cameraTileOriginX, right.cameraTileOriginX))
    && (left.cameraTileOriginY === right.cameraTileOriginY || same(left.cameraTileOriginY, right.cameraTileOriginY))
    && (left.cameraKnown === right.cameraKnown || same(left.cameraKnown, right.cameraKnown))
    && (left.screenScrollOffsetY === right.screenScrollOffsetY || same(left.screenScrollOffsetY, right.screenScrollOffsetY))
    && (left.fieldPresentation === right.fieldPresentation || same(left.fieldPresentation, right.fieldPresentation))
    && (left.endingFill === right.endingFill || same(left.endingFill, right.endingFill))
    && (left.backgroundAnimationPhase === right.backgroundAnimationPhase || same(left.backgroundAnimationPhase, right.backgroundAnimationPhase))
    && (left.controlLock === right.controlLock || same(left.controlLock, right.controlLock))
    && (left.scriptedInput === right.scriptedInput || same(left.scriptedInput, right.scriptedInput))
    && (left.mode === right.mode || same(left.mode, right.mode))
    && (left.storyState === right.storyState || same(left.storyState, right.storyState))
    && (left.battleEntry === right.battleEntry || same(left.battleEntry, right.battleEntry))
    && (left.fieldServiceEntry === right.fieldServiceEntry || same(left.fieldServiceEntry, right.fieldServiceEntry))
    && (left.runtimeResultD5 === right.runtimeResultD5 || same(left.runtimeResultD5, right.runtimeResultD5))
    && (left.fieldEntityCount === right.fieldEntityCount || same(left.fieldEntityCount, right.fieldEntityCount))
    && (left.temporaryEntityValue === right.temporaryEntityValue || same(left.temporaryEntityValue, right.temporaryEntityValue))
    && (left.parameters === right.parameters || same(left.parameters, right.parameters))
    && (left.partyMoney === right.partyMoney || same(left.partyMoney, right.partyMoney))
    && (left.partyInventories === right.partyInventories || same(left.partyInventories, right.partyInventories))
    && (left.partyEquipment === right.partyEquipment || same(left.partyEquipment, right.partyEquipment))
    && (left.partyMembers === right.partyMembers || same(left.partyMembers, right.partyMembers))
    && (left.vehicles === right.vehicles || same(left.vehicles, right.vehicles))
    && (left.runtimePartySlots === right.runtimePartySlots || same(left.runtimePartySlots, right.runtimePartySlots))
    && (left.fieldTiles === right.fieldTiles || same(left.fieldTiles, right.fieldTiles))
    && sameDialogue(left.dialogue, right.dialogue)
    && (left.variantId === right.variantId || same(left.dialogue, right.dialogue))
    && (left.eventFlags === right.eventFlags || same(left.eventFlags, right.eventFlags))
    && (left.endingOperation === right.endingOperation || same(left.endingOperation, right.endingOperation))
    && (left.endingStageId === right.endingStageId || same(left.endingStageId, right.endingStageId))
    && (left.endingStageLabel === right.endingStageLabel || same(left.endingStageLabel, right.endingStageLabel))
    && (left.endingWantedTargetId === right.endingWantedTargetId || same(left.endingWantedTargetId, right.endingWantedTargetId))
    && (left.endingWantedDefeated === right.endingWantedDefeated || same(left.endingWantedDefeated, right.endingWantedDefeated))
    && left.audioState?.currentMusicCommandId === right.audioState?.currentMusicCommandId
    && left.audioState?.musicStatus === right.audioState?.musicStatus
    && left.audioState?.fadeControlId === right.audioState?.fadeControlId;
}

export function storySnapshotInterface(snapshot) {
  return interfaceState(snapshot || {});
}

export function storyDriverTrace(compiled, {shots, commands}, actorsAt) {
  const drivers = [];
  const changes = [];
  const objects = new Map();
  const last = new Map();
  const actorValueKeys = new Map();
  let previous = new Map();
  const activeCommands = new Map();
  for (const run of commands) {
    if (!activeCommands.has(run.start)) activeCommands.set(run.start, []);
    activeCommands.get(run.start).push(run);
  }
  let active = [];
  const put = (values, objectId, group, property, label, value, runtimeSource, actor = null) => {
    const key = `${objectId}/${property}`;
    const old = previous.get(key);
    if (same(old?.value, value)) {
      if (old) {
        values.set(key, old);
      }
      return;
    }
    const item = {objectId, group, property, label, value, runtimeSource, actor};
    values.set(key, item);
  };
  const recordChanges = (values, snapshot, frame, shot) => {
    for (const [key, item] of values) {
      if (item.bookkeeping || item === previous.get(key)) continue;
      const before = previous.get(key)?.value;
      // 初值只列实际载入、显示和输入；其他字段须发生变化才成为驱动。
      if (frame === 0 && !["scene", "camera", "visibility", "dialogue", "lock", "input", "music", "music-status", "audio-fade", "field-fade"].includes(item.property)) continue;
      if (frame === 0 && (item.value == null || item.value === false)) continue;
      const sourceOperations = item.group === "interface" ? ["start-blocking-ui-action"] : operations[item.property] || [];
      const sourceCommand = active.findLast(run => sourceOperations.includes(run.operation)
        && (item.group !== "actor" || (run.actorSlot === item.actor?.actorSlot
          && run.variantId === snapshot.variantId))
        && (item.group !== "flags" || run.operands[0] === Number(item.objectId.split(":").at(-1))));
      const interfaceScreen = item.group === 'interface' ? item.value?.screen : null;
      const runtimeSource = interfaceScreen
        ? `${item.runtimeSource} / ${interfaceScreen}`
        : item.runtimeSource;
      const source = sourceCommand ? `script / ${sourceCommand.scriptKind}:${sourceCommand.programId} / ${sourceCommand.cursor}`
        : snapshot.endingOperation && snapshot.endingOperation !== "actor-list-vm"
          ? `${runtimeSource} / ${snapshot.endingStageId} / ${snapshot.endingOperation}` : runtimeSource;
      const change = {frame, objectId: item.objectId, property: item.property,
        before: before ?? null, value: item.value ?? null, source, commandId: sourceCommand?.id || null};
      changes.push(change);
      let driver = last.get(key);
      if (driver && driver.end === frame && driver.source === source && driver.command?.id === sourceCommand?.id) {
        driver.end = frame + 1;
        driver.value = item.value;
        driver.changes.push(change);
      } else {
        driver = {id: `driver:${frame}:${drivers.length}`, ...item, start: frame, end: frame + 1,
          shotId: shot.id, before, source, command: sourceCommand, changes: [change]};
        drivers.push(driver);
        last.set(key, driver);
      }
    }
  };
  const frames = compiled.frames || [];
  let previousSnapshot;
  let previousActors = [];
  let previousShot;
  let removedVisibility = false;
  const orderedShots = shots.every((shot, index) => index === 0 || shots[index - 1].start <= shot.start);
  let shotIndex = -1;
  frames.forEach((snapshot, frame) => {
    if (orderedShots) while (shotIndex + 1 < shots.length && shots[shotIndex + 1].start <= frame) shotIndex += 1;
    const shot = orderedShots ? shots[shotIndex] : shots.findLast(shot => shot.start <= frame);
    if (!shot) return;
    if (active.length) active = active.filter(run => frame < run.end);
    const starting = activeCommands.get(frame);
    if (starting) active.push(...starting);
    const currentActors = snapshot.actors?.length || snapshot.partyActors?.length || snapshot.temporaryEntities?.length
      ? actorsAt(snapshot) : emptyActors;
    const globalsUnchanged = previousSnapshot && previousShot === shot
      && sameDriverGlobals(previousSnapshot, snapshot);
    if (globalsUnchanged && sameDriverActors(previousActors, currentActors)) {
      if (removedVisibility) {
        const present = new Set(currentActors.map(actor => actorId(shot, actor)));
        for (const [key, item] of previous)
          if (item.group === 'actor' && !present.has(item.objectId)) previous.delete(key);
        removedVisibility = false;
      }
      // 淡入淡出单独变化时，只更新淡入淡出轨。
      if (!same(previousSnapshot.endingFadeOpacity, snapshot.endingFadeOpacity)) {
        const values = new Map();
        put(values, "object:camera", "camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0,
          "buildStoryVmSequence / fadeOpacity");
        recordChanges(values, snapshot, frame, shot);
        for (const [key, item] of values) previous.set(key, item);
        for (const [key, item] of previous) {
          if (item.group === "flags" && !item.value
              && !(snapshot.eventFlags || []).includes(Number(item.objectId.split(":").at(-1)))) previous.delete(key);
        }
      }
      previousSnapshot = snapshot;
      previousActors = currentActors;
      return;
    }
    const values = new Map();
    const global = (group, property, label, value, source) => put(values, `object:${group}`, group,
      property, label, value, source);
    const field = snapshot.fieldDriver;
    const fieldSource = field?.kind === "scene-transition"
      ? `${field.owner} / transition:${hex(field.sourceSceneId)}:${hex(field.transitionId)} / ROM PRG ${[field.coordinateSource, field.targetSource].filter(Boolean).map(source => `$${hex(source.offset).padStart(6, "0")}`).join(" / ")} / (${field.sourceX},${field.sourceY}) → ${hex(field.destinationSceneId)} (${field.destinationX},${field.destinationY})`
      : field?.kind === "terrain-motion"
        ? `${field.owner} / ROM PRG $029034 / $0290E4 / $029116 / behavior $${hex(field.behaviorCode)} / ${field.direction} / (${field.x},${field.y}) / ${field.duration} 帧`
        : null;
    if (globalsUnchanged) {
      for (const [key, item] of previous) {
        if (item.group === "actor") continue;
        if (item.group === "flags" && !item.value
            && !(snapshot.eventFlags || []).includes(Number(item.objectId.split(":").at(-1)))) continue;
        values.set(key, item);
      }
      global("camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0,
        "buildStoryVmSequence / fadeOpacity");
    } else {
      // 玩家落点只在加载帧显示；移动另归位置轨。
      const oldScene = previous.get("object:camera/scene");
      const scene = oldScene && oldScene.value.scene === snapshot.sceneId
        && oldScene.value.actorList === snapshot.actorListId ? oldScene.value
        : {scene: snapshot.sceneId, actorList: snapshot.actorListId,
          player: [snapshot.playerMapX, snapshot.playerMapY]};
      global("camera", "scene", "场景", scene, field?.kind === "scene-transition" ? fieldSource
        : "buildStoryVmVariant / settleTransition / scene initialiser");
      global("camera", "camera", "相机", [snapshot.cameraTileOriginX, snapshot.cameraTileOriginY,
        snapshot.cameraKnown], fieldSource
          || "buildStoryVmVariant / advancePreviewFieldInput / settleTransition");
      global("camera", "scroll", "滚屏", snapshot.screenScrollOffsetY ?? 0, "advance-global-screen-effect");
      global("camera", "fade", "淡入淡出", snapshot.endingFadeOpacity ?? 0, "buildStoryVmSequence / fadeOpacity");
      global("camera", "field-fade", "场景渐显", snapshot.fieldPresentation ? {
        phase: snapshot.fieldPresentation.phase, decrement: snapshot.fieldPresentation.paletteDecrement,
      } : null, "buildStoryVmVariant / fieldPresentation");
      global("camera", "fill", "底色", snapshot.endingFill ?? null, "buildStoryVmSequence / appendMachineStage");
      global("camera", "animation", "背景动画", snapshot.backgroundAnimationPhase ?? null,
        "advanceFieldChrAnimation");
      global("input", "lock", "操控锁", snapshot.controlLock, "buildStoryVmVariant / settleTransition");
      global("input", "input", "自动输入", snapshot.scriptedInput, "buildStoryVmVariant / drive-scripted-input");
      global("flow", "mode", "模式", snapshot.mode, "buildStoryVmVariant / requestTransition / settleTransition");
      global("flow", "story", "剧情状态", snapshot.storyState, "buildStoryVmVariant / requestTransition");
      global("flow", "battle", "战斗入口", snapshot.battleEntry ?? null, "start-scripted-encounter");
      global("flow", "service", "旅行入口", snapshot.fieldServiceEntry ?? null, "enter-field-travel-service");
      global("flow", "result", "运行结果", snapshot.runtimeResultD5, "buildStoryVmVariant / runtimeResultD5");
      global("flow", "entities", "实体槽", [snapshot.fieldEntityCount, snapshot.temporaryEntityValue],
        "buildStoryVmVariant / push-temporary-field-entity");
      global("flow", "parameters", "参数", snapshot.parameters, "buildStoryVmVariant / parameters");
      global("flow", "money", "金钱", snapshot.partyMoney, "subtract-party-money");
      global("flow", "inventory", "携带物", [snapshot.partyInventories, snapshot.partyEquipment],
        "STORY_PARTY_ITEM_OPERATIONS");
      global("flow", "members", "队伍状态", snapshot.partyMembers, "restore-party-member-health");
      global("flow", "vehicles", "战车状态", snapshot.vehicles, "buildStoryVmVariant / vehicles");
      global("flow", "party", "队伍槽", snapshot.runtimePartySlots, "buildStoryVmVariant / runtimePartySlots");
      global("camera", "tiles", "场景格", snapshot.fieldTiles || [], "sceneInteractionTileChanges / settleTransition");
      global("dialogue", "dialogue", "对话窗口", snapshot.dialogue ? {
        region: snapshot.dialogue.regionId, record: snapshot.dialogue.recordId,
        page: snapshot.dialogue.pageIndex, lines: snapshot.dialogue.lines,
        prefix: snapshot.dialogue.prefixRecordId, interaction: snapshot.dialogue.interactionWindow,
      } : null, "buildStoryVmVariant / activeDialogue / buildStoryVmSequence / dialogueForStage");
      global("interface", "visibility", "显隐", interfaceState(snapshot), "buildStoryVmSequence / appendMachineStage");
      global("audio", "music", "音乐", snapshot.audioState?.currentMusicCommandId ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      global("audio", "music-status", "播放状态", snapshot.audioState?.musicStatus ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      global("audio", "audio-fade", "音乐淡出", snapshot.audioState?.fadeControlId ?? null,
        "applyStoryAudioEvent / advanceStoryAudioState");
      const flags = new Set([...(snapshot.eventFlags || []), ...(previous.get("flags")?.value || [])]);
      for (const flag of flags) put(values, `object:flag:${flag}`, "flags", "flag", globalEventFlagHandle(flag),
        (snapshot.eventFlags || []).includes(flag), "buildStoryVmVariant / eventFlags / settleTransition");
      values.set("flags", {value: snapshot.eventFlags || [], bookkeeping: true});
    }
    const previousActorsById = new Map(previousShot === shot
      ? previousActors.map(actor => [actorId(shot, actor), actor]) : []);
    for (const actor of currentActors) {
      const id = actorId(shot, actor);
      const object = objects.get(id);
      if (!object || object.variantId !== snapshot.variantId || object.actorSlot !== actor.actorSlot
          || object.partySlot !== actor.partySlot || object.fieldEntityIndex !== actor.fieldEntityIndex)
        objects.set(id, {id, kind: "actor", shotId: shot.id, variantId: snapshot.variantId,
        start: shot.start, end: shot.end, actorSlot: actor.actorSlot, partySlot: actor.partySlot,
        fieldEntityIndex: actor.fieldEntityIndex,
        refs: [{variantId: snapshot.variantId, actorSlot: actor.actorSlot}]});
      const previousActor = previousActorsById.get(id);
      if (previousActor && sameDriverActor(previousActor, actor)) {
        let keys = actorValueKeys.get(id);
        if (!keys) {
          keys = ["position", "direction", "appearance", "visibility", "offset", "motion", "execution"]
            .map(property => `${id}/${property}`);
          actorValueKeys.set(id, keys);
        }
        for (const key of keys) {
          const item = previous.get(key);
          if (item) values.set(key, item);
        }
        continue;
      }
      const actorValue = (property, label, value, source) => put(values, id, "actor", property,
        label, value, source, actor);
      actorValue("position", "位置", [actor.x, actor.y], actor.partySlot != null && fieldSource
        ? fieldSource : "buildStoryVmVariant / actor.motion / advanceStoryFieldStep");
      actorValue("direction", "朝向", actor.direction, "buildStoryVmVariant / actor.direction");
      actorValue("appearance", "形象", [actor.actorType, actor.renderMode, actor.palette],
        "buildStoryVmVariant / actor rendering");
      actorValue("visibility", "显隐", !actor.hidden && (actor.renderMode === "type-animation" || actor.actorType !== 0),
        "buildStoryVmVariant / actor list / runtimePartySlots");
      actorValue("offset", "画面偏移", [actor.screenOffsetX || 0, actor.screenOffsetY || 0],
        "play-render-slot-offset-sequence / play-rom-recovery-effect");
      actorValue("motion", "运动属性", actor.motionAttributes, "buildStoryVmVariant / motionAttributes");
      actorValue("execution", "执行状态", [actor.ended, actor.blocked], "buildStoryVmVariant / actor dispatch");
    }
    removedVisibility = false;
    for (const [key, old] of previous) {
      if (old.group !== "actor" || values.has(key)) continue;
      if (old.property === "visibility" && old.value) {
        const actor = previousActors.findLast(actor => actorId(previousShot, actor) === old.objectId) || old.actor;
        put(values, old.objectId, old.group, old.property, old.label, false,
          "buildStoryVmVariant / actor list / settleTransition", actor);
        removedVisibility = true;
      }
    }
    recordChanges(values, snapshot, frame, shot);
    previous = values;
    previousSnapshot = snapshot;
    previousActors = currentActors;
    previousShot = shot;
  });
  // 界面显示键覆盖整个可见区段，隐藏键独立保留。
  const interfaces = drivers.filter(driver => driver.group === "interface");
  interfaces.forEach((driver, index) => {
    if (driver.value) driver.end = interfaces[index + 1]?.start ?? frames.length;
  });
  for (const event of compiled.audioEvents || []) {
    const command = commands.find(run => run.start === Number(event.frame)
      && run.programId === event.script_id && run.cursor === event.cursor
      && run.actorSlot === event.actor_slot && run.variantId === event.variant_id);
    drivers.push({
    id: `driver:audio:${drivers.length}`, group: "audio", objectId: "object:audio", property: "trigger",
    label: event.kind === "sound-effect" ? "音效" : event.kind === "fade-control" ? "音频控制" : "音乐命令",
    audioKind: event.kind, start: Number(event.frame), end: Number(event.frame) + 1,
    value: {command: `${event.kind === "fade-control" ? "audio-control" : "audio-command"}:${hex(event.command_id)}`, dispatch: event.dispatch},
    source: `applyStoryAudioEvent / ${event.dispatch}`, command, changes: [],
    });
  }
  for (const event of compiled.uiAutoInputs || []) drivers.push({
    id: `driver:confirm:${drivers.length}`, group: "input", objectId: "object:input", property: "confirm",
    label: "自动确认", start: Number(event.frame), end: Number(event.frame) + Math.max(1, Number(event.waitFrames) || 1),
    value: event, source: "buildStoryVmVariant / preview_input_policy", changes: [],
  });
  return {drivers, changes, objects: [...objects.values()]};
}
