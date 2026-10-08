import {executeSceneActionLocalHandler} from "./scene-action-local-handlers.js";

export {applySceneActionLocalMutation} from "./scene-action-local-handlers.js";

// @editor-module 场景动作分派只读写注入的现场字段，外部调用以续行交回调用方。
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = value => {
  if (!byte(value)) throw new TypeError("场景动作缺少已确认字节");
  return value;
};

export function sceneActionMotionPhase(phase, attributes) {
  return phase === 0 ? 0 : (phase - (1 << (attributes & 3))) & 255;
}

export function createSceneActionStateExecution({state, renderSlot, commandForActor,
  commandForInteraction, commandForInline, movementDeltas = null,
  entry = "autonomous", scriptId = null, cursor = null, randomPolicy = "advance"}) {
  if (!["autonomous", "interaction", "inline"].includes(entry)) throw new TypeError("场景动作调用入口无效");
  if (!["advance", "stationary"].includes(randomPolicy)) throw new TypeError("场景动作随机策略无效");
  if (entry === "autonomous") requireByte(renderSlot);
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const value = field(id, index).value;
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFF)
      throw new TypeError(`场景动作缺少已确认字段：${id}:${index}`);
    return value;
  };
  const write = (id, value, index = 0) => {field(id, index).value = value;};
  const requireActor = index => {field("actor.cursor", index); return index;};
  let current = null, cancelled = false;
  const movementEffects = [];
  const execution = run();
  const access = (actor, slot) => ({read, write, actor, slot,
    readVector(id) {
      const value = field(id).value;
      if (!Array.isArray(value) || !value.every(byte)) throw new TypeError(`场景动作缺少已确认数组：${id}`);
      return value;
    }});
  function* tileStep(actor, direction) {
    if (!movementDeltas || ![movementDeltas.x, movementDeltas.y].every(values =>
      Array.isArray(values) && values.length === 5 && values.every(value =>
        Number.isInteger(value) && value >= -128 && value <= 127)))
      throw new TypeError("场景动作缺少所属方向增量");
    const attributes = read("actor.motionAttributes", actor);
    if (attributes < 0x80) write("actor.direction", direction, actor);
    write("actor.movementResult", direction + 1, actor);
    const x = (read("actor.x", actor) + movementDeltas.x[direction + 1]) & 255;
    const y = (read("actor.y", actor) + movementDeltas.y[direction + 1]) & 255;
    write("scratch.tileX", x); write("scratch.tileY", y);
    if (!(attributes & 0x10)) {
      if (read("control.controlLock") === 0) {
        const count = read("field.partyCount");
        if (count < 1 || count > 4) throw new TypeError("场景动作队伍占位超出已确认字段");
        for (let index = count - 1; index >= 0; index--)
          if (read("party.y", index) === y && read("party.x", index) === x) return false;
        for (let index = 13; index >= 0; index--)
          if (read("actor.type", index) < 0x80 && read("actor.y", index) === y
            && read("actor.x", index) === x) return false;
      }
      const response = yield {status: "pending", state: state.capture(),
        effects: [{kind: "actor-tile-fetch", actor, x, y}],
        continuation: {kind: "actor-tile-fetch", entry, actor}};
      state.restore(response.state);
      movementEffects.push(...(response.effects || []));
      if (response.carry || read("actor.type", actor) < 9 && (response.attribute & 0x7C) === 0x18) return false;
    }
    write("actor.x", read("scratch.tileX"), actor);
    write("actor.y", read("scratch.tileY"), actor);
    write("actor.motionPhase", 0x20, actor);
    return true;
  }
  function* moveToward(actor, x, y) {
    if (read("actor.x", actor) === x && read("actor.y", actor) === y) return true;
    if (read("actor.x", actor) !== x
      && (yield* tileStep(actor, x < read("actor.x", actor) ? 2 : 3))) return false;
    if (read("actor.y", actor) !== y) yield* tileStep(actor, y < read("actor.y", actor) ? 0 : 1);
    return false;
  }
  function* wander(actor, slot, rectangle) {
    const effects = [{kind: "random-actor", actor, policy: randomPolicy}];
    if (randomPolicy === "stationary") return effects;
    const saved = ["x", "y", "motionPhase"].map(name => read(`actor.${name}`, actor));
    if (saved[2] === 0) {
      let ready = true, counter = read("render.waitCounter", slot);
      if (counter) {
        counter = (counter - 1) & 255;
        write("render.waitCounter", counter, slot);
        ready = counter === 0 && read("render.actionState", slot) < 128;
      } else {
        const direction = read("actor.direction", actor), random = read("random.sceneHigh") & 3;
        const next = random < 2 ? direction : direction < 2 ? random : random - 2;
        write("render.actionState", next, slot);
        if (next !== direction) {write("render.waitCounter", 64, slot); ready = false;}
      }
      if (ready) yield* tileStep(actor, read("render.actionState", slot));
    }
    write("random.sceneHigh", (read("random.sceneHigh") >> 1) | ((read("random.sceneLow") & 1) << 7));
    write("random.sceneLow", read("random.sceneLow") >> 1);
    if (rectangle) {
      const x = read("actor.x", actor), y = read("actor.y", actor);
      if (x < rectangle[0] || x >= rectangle[1] || y < rectangle[2] || y >= rectangle[3])
        ["x", "y", "motionPhase"].forEach((name, index) => write(`actor.${name}`, saved[index], actor));
    }
    return [...effects, ...movementEffects.splice(0)];
  }
  function* dispatch(source, actor) {
    if (!source || !Array.isArray(source.commandBytes) || source.commandBytes.length !== 6
        || !source.commandBytes.every(byte) || entry !== "inline" && (!Number.isInteger(source.pointer)
          || source.pointer < 0 || source.pointer > 65535)) {
      yield {status: "blocked", reason: "missing-command-window", state: state.capture(), effects: []};
      return;
    }
    if (entry !== "inline") write("dispatch.scriptPointer", source.pointer);
    write("dispatch.commandWindow", source.commandBytes);
    const slot = read("dispatch.renderSlot"), opcode = source.commandBytes[0];
    const operands = source.commandBytes.slice(1), operation = source.semantic?.operation;
    const local = executeSceneActionLocalHandler(source, access(actor, slot));
    if (local !== null) return {returnValue: requireByte(local), effects: []};
    if (["advance-wander-motion", "wander-inside-rectangle"].includes(operation))
      return {returnValue: operation === "advance-wander-motion" ? 1 : 5,
        effects: yield* wander(actor, slot, operation === "wander-inside-rectangle" ? operands : null)};
    if (operation === "attempt-tile-step")
      return {returnValue: (yield* tileStep(actor, opcode - 0x12)) ? 1 : 0, effects: movementEffects.splice(0)};
    if (operation === "move-actor-to-position")
      return {returnValue: (yield* moveToward(actor, operands[0], operands[1])) ? 3 : 0, effects: movementEffects.splice(0)};
    if (operation === "step-toward-story-target") {
      const window = [...source.commandBytes]; window[1] = read("party.x", 0); window[2] = read("party.y", 0);
      write("dispatch.commandWindow", window);
      yield* moveToward(actor, window[1], window[2]);
      return {returnValue: 1, effects: movementEffects.splice(0)};
    }
    if (!["start-blocking-dialogue", "start-blocking-ui-action", "dispatch-interaction-service"].includes(operation)) {
      yield {status: "blocked", reason: "unconfirmed-command-state", opcode, operation,
        state: state.capture(), effects: []};
      return;
    }
    const service = operation === "dispatch-interaction-service" && operands[0] >= 0x10;
    const guarded = [0x03, 0x26, 0x68].includes(opcode);
    if (opcode !== 0x26) write("parameter.regionId", opcode === 0x48 ? 0x0B : requireByte(source.semantic.region_id));
    if (guarded && (read("control.dialogueGate") === 0 || opcode !== 0x26
      && read("field.movementStatus") < 0x80)) return {returnValue: 0, effects: []};
    if (guarded) write("control.dialogueGate", 0);
    if (opcode === 0x26) write("parameter.regionId", operands[0]);
    write("parameter.recordId", operands[source.semantic?.record_operand_index ?? (opcode === 0x26 ? 1 : 0)]);
    const effect = {kind: service ? "interaction-service" : "dialogue", opcode, operands, actor, renderSlot: slot,
      ...(service ? {selector: operands[0], parameter: operands[1]} : {
        regionId: read("parameter.regionId"), recordId: read("parameter.recordId")})};
    const response = yield {status: "pending", state: state.capture(), effects: [effect],
      continuation: {kind: effect.kind, entry, actor, renderSlot: slot,
        cursor: entry === "interaction" ? read("control.interactionCursor") : read("actor.cursor", actor)}};
    state.restore(response.state);
    if (guarded) {
      write("dispatch.actorIndex", actor); write("dispatch.renderSlot", slot);
      write("control.dialogueGate", opcode === 0x26 ? 3 : 2);
    }
    return {returnValue: opcode === 0x26 ? 3 : 2, effects: response.effects || []};
  }
  function* run() {
    let actor;
    const effects = [];
    if (entry === "autonomous") {
      actor = requireActor(read("render.actorIndex", renderSlot));
      write("dispatch.actorIndex", actor);
      const profile = read("control.displayProfile");
      if (profile !== 0 && actor !== read("control.activeActor")) return {dispatched: false, effects};
      let result = {dispatched: false, returnValue: null, effects};
      if (profile === 0 && read("actor.motionPhase", actor) === 0) {
        const response = yield {status: "pending", state: state.capture(),
          effects: [{kind: "autonomous-script-bank", actor}], continuation: {kind: "autonomous-script-bank", actor}};
        state.restore(response.state); effects.push(...(response.effects || []));
        actor = requireActor(read("dispatch.actorIndex"));
        const dispatched = yield* dispatch(commandForActor(read("actor.autonomousScript", actor), read("actor.cursor", actor)), actor);
        if (!dispatched) return;
        effects.push(...dispatched.effects);
        actor = requireActor(read("dispatch.actorIndex"));
        write("actor.cursor", (read("actor.cursor", actor) + dispatched.returnValue) & 255, actor);
        result = {dispatched: true, returnValue: dispatched.returnValue, effects};
      }
      const phase = read("actor.motionPhase", actor);
      if (phase !== 0) write("actor.motionPhase", sceneActionMotionPhase(phase, read("actor.motionAttributes", actor)), actor);
      return result;
    }
    if (entry === "inline") {
      actor = requireActor(read("dispatch.actorIndex"));
      const result = yield* dispatch(commandForInline(), actor);
      return result && {dispatched: true, ...result};
    }
    const id = scriptId === null ? read("parameter.recordId") : requireByte(scriptId);
    write("control.interactionCursor", cursor === null ? 0 : requireByte(cursor));
    for (let iterations = 0; iterations < 4096; iterations++) {
      actor = requireActor(read("control.activeActor"));
      write("dispatch.actorIndex", actor);
      let slot = 255;
      for (let index = 15; index >= 0; index--) {
        if ([0x83, 0x44].includes(read("render.marker", index)) && read("render.actorIndex", index) === actor) {
          slot = index; break;
        }
      }
      write("dispatch.renderSlot", slot);
      const source = commandForInteraction(id, read("control.interactionCursor"));
      const result = yield* dispatch(source, actor);
      if (!result) return;
      effects.push(...result.effects);
      write("control.interactionCursor", (read("control.interactionCursor") + result.returnValue) & 255);
      if (field("dispatch.commandWindow").value[0] === 0) return {dispatched: true, returnValue: result.returnValue, effects};
    }
    yield {status: "blocked", reason: "interaction-loop-without-frame-boundary", state: state.capture(), effects};
  }
  return {
    advance(response) {
      if (cancelled) throw new TypeError("场景动作续行已取消");
      if (current?.status === "complete" || current?.status === "blocked") return current;
      if (current?.status === "pending" && response?.status !== "available") return current;
      if (current?.status === "pending" && current.continuation.kind === "dialogue"
        && response.confirmed !== true) return current;
      if (current?.status === "pending") {
        if (!response.state) throw new TypeError("场景动作缺少外部返回现场");
        if (current.continuation.kind === "actor-tile-fetch") {
          if (typeof response.carry !== "boolean") throw new TypeError("场景动作缺少取格进位结果");
          requireByte(response.attribute);
        } else if (current.continuation.kind !== "autonomous-script-bank") requireByte(response.returnValue);
        if (response.effects !== undefined && !Array.isArray(response.effects)) throw new TypeError("场景动作外部效果无效");
        const before = state.capture();
        state.restore(response.state); state.restore(before);
      }
      const step = execution.next(response);
      current = step.done ? {status: "complete", ...step.value, state: state.capture()} : step.value;
      return current;
    },
    cancel() {cancelled = true; execution.return();},
  };
}
