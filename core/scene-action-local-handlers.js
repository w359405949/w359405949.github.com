// @editor-module 局部动作只经所属字段接口执行，未闭合的外部调用交回调用方。
export function applySceneActionLocalMutation(operation, {read, write}, operands, direction) {
  if (operation === "set-direction") write("actor.direction", direction);
  else if (operation === "set-motion-attributes") write("actor.motionAttributes", operands[0]);
  else if (operation === "set-actor-position") {
    write("actor.x", operands[0]); write("actor.y", operands[1]);
  } else if (operation === "set-actor-type") write("actor.type", operands[0]);
  else if (operation === "decrement-actor-type") write("actor.type", (read("actor.type") - 1) & 255);
  else return false;
  return true;
}
const role = index => {
  const name = ["hunter", "mechanic", "soldier"][index];
  if (!name) throw new TypeError("场景动作人物槽不在已确认范围");
  return `save.active.role.${name}`;
};
const flag = (kind, id) => `save.active.${kind}.${id.toString(16).toUpperCase().padStart(2, "0")}`;

export function executeSceneActionLocalHandler(source, {read, write, readVector, actor, slot}) {
  const [opcode, ...operands] = source.commandBytes;
  const operation = source.semantic?.operation;
  const actorRead = id => read(id, actor), actorWrite = (id, value) => write(id, value, actor);
  const event = (kind, id, value) => {
    if (value === undefined) {
      write("scratch.savedX", actor); write("scratch.savedY", (opcode * 2) & 255);
      return read(flag(kind, id));
    }
    write(flag(kind, id), value);
  };
  if (operation === "end-actor-script") return 0;
  if (operation === "set-global-parameter") {
    const banks = [...readVector("display.chrShadow")]; banks[1] = operands[0];
    write("display.chrShadow", banks); return 2;
  }
  if (operation === "relative-cursor-advance") return operands[0];
  if (applySceneActionLocalMutation(operation, {read: actorRead, write: actorWrite}, operands, opcode - 0x0C))
    return operation === "set-actor-position" ? 3 : ["set-direction", "decrement-actor-type"].includes(operation) ? 1 : 2;
  if (operation === "move-actor-off-map") {actorWrite("actor.x", 0xCF); actorWrite("actor.y", 0xCF); return 1;}
  if (operation === "initialize-actor-motion-state") {
    actorWrite("actor.motionPhase", 0x20); actorWrite("actor.movementResult", 0); return 1;
  }
  if (operation === "set-packed-camera-relative-position") {
    actorWrite("actor.x", (read("field.cameraX") + (operands[0] >> 4)) & 255);
    actorWrite("actor.y", (read("field.cameraY") + (operands[0] & 15)) & 255); return 2;
  }
  if (operation === "set-direct-frame-id" || operation === "set-actor-type-animation-renderer") {
    write("render.marker", operation === "set-direct-frame-id" ? 0x44 : 0x83, slot);
    actorWrite("actor.type", operands[0]); return 2;
  }
  if (operation === "adopt-runtime-entity-state") {
    for (const [target, source] of [["actor.type", "party.renderState"], ["actor.x", "party.x"],
      ["actor.y", "party.y"], ["actor.direction", "party.direction"]]) actorWrite(target, read(source, operands[0]));
    write("party.renderState", 0, operands[0]); return 2;
  }
  if (operation === "set-runtime-entity-move-direction") {
    write("party.motionDirection", operands[0] & 15, operands[0] >> 4); return 2;
  }
  if (operation === "clear-runtime-entity-render-slots") {
    for (let index = 3; index >= 0; index--) write("party.renderState", 0, index);
    return 1;
  }
  if (operation === "transfer-actor-to-runtime-entity") {
    let target = 0;
    while (target < 3 && read("party.order", target) !== operands[0]) target++;
    for (const [destination, source] of [["party.renderState", "actor.type"],
      ["party.x", "actor.x"], ["party.y", "actor.y"], ["party.direction", "actor.direction"]])
      write(destination, actorRead(source), target);
    actorWrite("actor.y", 0x8F); return 2;
  }
  if (operation === "countdown-relative-branch") {
    const counter = ((read("render.loopCounter", slot) || operands[1]) - 1) & 255;
    write("render.loopCounter", counter, slot); return counter === 0 ? 3 : operands[0];
  }
  if (operation === "wait-operand-frames" || operation === "wait") {
    if (operation === "wait") {
      const window = [...source.commandBytes]; window[1] = source.semantic.frames;
      write("dispatch.commandWindow", window); operands[0] = window[1];
    }
    const counter = ((read("render.waitCounter", slot) || operands[0]) - 1) & 255;
    write("render.waitCounter", counter, slot); return counter === 0 ? operation === "wait" ? 1 : 2 : 0;
  }
  if (operation === "set-event-flag") {event("global_event_flag", operands[0], 1); return 2;}
  if (operation === "clear-event-flag") {event("global_event_flag", operands[0], 0); return 2;}
  if (operation === "remove-actor" || operation === "remove-actor-if-event-flag-set") {
    if (operation === "remove-actor-if-event-flag-set" && !event("global_event_flag", operands[0])) return 2;
    actorWrite("actor.type", 255);
    write("render.marker", 0, slot); write("render.actionState", 0, slot); return 0;
  }
  if (operation === "branch-if-event-flag-clear") return event("global_event_flag", operands[0]) ? 3 : operands[1];
  if (operation === "wait-event-flag-set") return event("global_event_flag", operands[0]) ? 2 : 0;
  if (operation === "branch-if-investigation-acquired")
    return read(flag("treasure_collected_flag", operands[0])) ? operands[1] : 3;
  if (operation === "branch-if-runtime-result-nonzero") return read("parameter.result") ? operands[0] : 2;
  if (operation === "branch-on-player-position-exact")
    return read("party.x", 0) === operands[0] && read("party.y", 0) === operands[1] ? 4 : operands[2];
  if (operation === "branch-on-player-position-rectangle") {
    const x = read("party.x", 0), y = read("party.y", 0);
    return x >= operands[0] && x < operands[1] && y >= operands[2] && y < operands[3] ? 6 : operands[4];
  }
  if (operation === "branch-on-player-direction") return read("party.direction", 0) === operands[0] ? 3 : operands[1];
  if (operation === "branch-if-runtime-slot-empty") return read(`${role(operands[0])}.present`) ? 3 : operands[1];
  if (operation === "branch-if-party-member-alive") return read(`${role(operands[0])}.isDead`) ? 3 : operands[1];
  if (operation === "branch-if-party-not-riding")
    return [0, 1, 2].some(index => read(`${role(index)}.present`) >= 128) ? 2 : operands[0];
  if (operation === "branch-if-party-money-insufficient")
    return read("save.active.gold") >= operands[0] ? 3 : operands[1];
  if (operation === "subtract-party-money") {
    write("save.active.gold", (read("save.active.gold") - operands[0]) & 0xFFFFFF); return 2;
  }
  const stores = {"set-dialogue-actor-parameter": "parameter.dialogueActor", "set-story-parameter": "parameter.story",
    "set-runtime-parameter-$9c": "parameter.frameCountdown", "set-runtime-parameter-$a2": "parameter.animationStep"};
  if (stores[operation]) {write(stores[operation], operands[0]); return 2;}
  if (operation === "set-story-state") {
    write("control.storyState", operands[0]); write("control.mainMode", 3); return 3;
  }
  if (operation === "toggle-player-control-lock") {write("control.controlLock", read("control.controlLock") ^ 255); return 1;}
  if (operation === "replace-runtime-entity-scene") {
    write("field.sceneId", operands[1]);
    for (let index = 10; index >= 0; index--) {
      const id = `save.active.field_object.${index}.scene_id`;
      if (read(id) === operands[0]) write(id, operands[1]);
    }
    return 3;
  }
  if (operation === "enter-dedicated-field-mode") {write("control.mainMode", operands[0]); return 0;}
  return null;
}
