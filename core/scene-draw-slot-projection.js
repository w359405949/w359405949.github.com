// @editor-module 场景角色运行时按所属现场投影相机和五类槽，动作与 OAM 服务由调用方接续。
import {createSceneActionStateExecution} from "./scene-action-state-execution.js";
import {sceneDrawMotionSpeeds} from "./scene-draw-code-sources.js";
import {actorTypeRuntimeValues, vehicleFieldActorType} from "./visual-runtime-values.js";

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (value, name) => {
  if (!byte(value)) throw new TypeError(name);
  return value;
};
const unavailable = missing => ({status: "unavailable", missing});

function sourceBytes(document, id, offset, length) {
  const block = document?.blocks?.find(row => row.id === `scene-actor-runtime.${id}`);
  const start = block?.address?.offset, values = block?.values;
  if (!Number.isInteger(start) || !Array.isArray(values) || values.some(value => !byte(value))
    || offset < start || offset + length > start + values.length) throw new TypeError(id);
  return values.slice(offset - start, offset - start + length);
}

function sceneDrawProjectionParameters(document) {
  const motion = (offset, length) => sourceBytes(document, "world-pixel-deltas", offset, length);
  return {world_y_low: motion(0x344BA, 64), world_x_low: motion(0x344DA, 64),
    world_y_high: motion(0x3451A, 64), world_x_high: motion(0x3453A, 64),
    cull_lower: sourceBytes(document, "slot-cull-boundaries", 0x34462, 3),
    cull_upper: sourceBytes(document, "slot-cull-boundaries", 0x34465, 3),
    direction_frame_offsets: sourceBytes(document, "map-actor-frame-selector-tables", 0x34597, 4),
    direction_attributes: sourceBytes(document, "map-actor-frame-selector-tables", 0x3459B, 3)};
}

export async function loadSceneDrawProjectionParameters({readDocument, readField}) {
  if (typeof readDocument !== "function") throw new TypeError("场景投影缺少注入仓库");
  const [document, partyMotionSpeeds] = await Promise.all([
    readDocument("scene-actor-runtime"), sceneDrawMotionSpeeds(readField),
  ]);
  return {...sceneDrawProjectionParameters(document), party_motion_speeds: partyMotionSpeeds};
}

function projectSceneWorldPixels(parameters, {phase, direction, x, y}) {
  for (const [name, value] of Object.entries({phase, direction, x, y})) requireByte(value, name);
  const shiftedPhase = direction === 0 ? phase : phase >> 1;
  const index = direction === 0 ? 0 : (((direction - 1) << 4) & 255) | shiftedPhase;
  const offset = axis => requireByte(parameters?.[`world_${axis}_low`]?.[index], `world-${axis}-low:${index}`)
    | requireByte(parameters?.[`world_${axis}_high`]?.[index], `world-${axis}-high:${index}`) << 8;
  return {x: ((((x + 9) & 255) << 4) + offset("x")) & 65535,
    y: ((((y + 8) & 255) << 4) + offset("y")) & 65535,
    phase: shiftedPhase, index};
}

function selectSceneActorFrame(parameters, {frameBase, attributes, direction, phase, rightAttributes}) {
  for (const [name, value] of Object.entries({frameBase, attributes, direction, phase})) requireByte(value, name);
  return {frame: (frameBase + requireByte(parameters?.direction_frame_offsets?.[direction], "actor-direction-offset")
      + ((phase >> 4) & 1)) & 255,
    attributes: attributes | requireByte(direction === 3 ? rightAttributes
      : parameters?.direction_attributes?.[direction], "actor-direction-attributes")};
}

export function createSceneDrawSlotServices({state, parameters, readDocument,
  actionOptions = {}, createActionExecution = null}) {
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const current = field(id, index), value = current.value;
    if (current.knowledge !== "confirmed" || !Number.isInteger(value) || value < 0 || value > 65535)
      throw new TypeError(`${id}:${index}`);
    return value;
  };
  const write = (id, value, index = 0) => {field(id, index).value = value;};
  const world = () => {
    const value = projectSceneWorldPixels(parameters, {phase: read("projection.motionPhase"),
      direction: read("projection.motionDirection"), x: read("projection.tileX"), y: read("projection.tileY")});
    if (read("projection.motionDirection") !== 0) write("projection.motionPhase", value.phase);
    write("projection.worldY", value.y); write("projection.worldX", value.x);
    return value;
  };
  const camera = () => {
    write("projection.motionPhase", read("field.movementStatus"));
    write("projection.motionDirection", read("field.cameraMotionDirection"));
    write("projection.tileX", read("field.cameraX")); write("projection.tileY", read("field.cameraY"));
    const value = world();
    write("field.cameraPixelX", value.x); write("field.cameraPixelY", value.y);
    return {x: value.x, y: value.y};
  };
  const clipped = (slot, reason) => {
    write("render.frame", 0, slot);
    return {visible: false, reason};
  };
  function projectPosition(slot, family, index) {
    if (family === "encounter") {
      write("projection.motionPhase", 0);
    } else {
      write("projection.motionPhase", read(`${family}.motionPhase`, index));
      write("projection.motionDirection", read(`${family}.${family === "party" ? "motionDirection" : "movementResult"}`, index));
    }
    const positionField = name => family === "encounter" ? read(`save.active.field_object.${index}.${name}`)
      : read(`${family}.${name}`, index);
    write("projection.tileX", positionField("x")); write("projection.tileY", positionField("y"));
    const value = world();
    const x = (value.x - read("field.cameraPixelX")) & 65535;
    write("render.screenXLow", x & 255, slot);
    if (x >> 8) return clipped(slot, "x-high");
    write("render.screenXHigh", 0, slot);
    const y = (value.y - read("field.cameraPixelY")) & 65535;
    write("render.screenYLow", y & 255, slot);
    if (y >> 8) return clipped(slot, "y-high");
    write("render.screenYHigh", 0, slot);
    const profile = read("control.displayProfile");
    if (profile >= 3) return clipped(slot, "display-profile");
    const lower = requireByte(parameters?.cull_lower?.[profile], "cull-lower");
    const upper = requireByte(parameters?.cull_upper?.[profile], "cull-upper");
    if (y < lower || y >= upper) return clipped(slot, "y-boundary");
    return {visible: true, x, y};
  }
  function select(slot, type, direction, phase) {
    if (typeof readDocument !== "function") throw new TypeError("actor-frame-service");
    const pose = selectSceneActorFrame(parameters, {...actorTypeRuntimeValues(readDocument("actor-visual"), type),
      direction, phase, rightAttributes: direction === 3 ? actorTypeRuntimeValues(readDocument("actor-visual"), 0).frameBase : undefined});
    write("render.frame", requireByte(pose?.frame, "actor-frame"), slot);
    write("render.attributes", requireByte(pose?.attributes, "actor-attributes"), slot);
  }
  function actorPose(slot) {
    const actor = read("render.actorIndex", slot);
    let position = {visible: null, reason: "command-negative"};
    if (field("dispatch.commandWindow").value?.[0] < 128) {
      position = projectPosition(slot, "actor", actor);
      if (!position.visible) return position;
    }
    const type = read("actor.type", actor);
    if (type >= 128) return {...position, retained: true};
    if (type === 0 || read("render.marker", slot) < 128) {
      write("render.frame", type, slot);
      return position;
    }
    write("scratch.tileX", read("actor.direction", actor));
    const attributes = read("actor.motionAttributes", actor);
    const phase = (attributes & 64 ? (attributes << 1) & 255 : read("actor.motionPhase", actor)) & 31;
    select(slot, type, read("scratch.tileX"), phase);
    return position;
  }
  function partyPose(slot, direct) {
    const index = read("render.actorIndex", slot), type = read("party.renderState", index);
    if (!direct && type === 0) {write("render.frame", 0, slot); return {visible: false, reason: "empty-party"};}
    let phase = read("party.motionPhase", index);
    if (phase) {
      const speed = requireByte(parameters?.party_motion_speeds?.[read("party.motionSpeed")], "party-motion-speed");
      phase = (phase - speed) & 255;
      write("party.motionPhase", phase, index);
    }
    if (!direct) write("scratch.tileY", phase);
    const position = projectPosition(slot, "party", index);
    if (!position.visible) return position;
    if (direct) {write("render.frame", read("party.renderState", index), slot); return position;}
    write("scratch.tileX", read("party.direction", index));
    const animationGate = read("party.animationGate");
    const role = read("party.order", index);
    const roleName = ["hunter", "mechanic", "soldier"][role];
    if (!roleName && role !== 3) throw new TypeError("party-order-role");
    const suppressed = roleName ? read(`save.active.role.${roleName}.animationSuppressed`) !== 0
      : read("save.active.role.hunter.level") >= 128;
    const blink = read("party.blinkDirection");
    if (suppressed || animationGate >= 128) phase = 0;
    else if (blink > 0 && blink < 128 && read("parameter.animationStep") !== 0) {
      if (blink - 1 === read("party.direction", 0)) {
        if (read("party.motionSpeed") !== 2) phase = 0;
        else {
          phase = (read("display.frameCounter") << 1) & 255;
          write("scratch.tileY", phase);
        }
      } else {phase = (phase << 1) & 255; write("scratch.tileY", phase);}
    }
    select(slot, type, read("scratch.tileX"), phase);
    return position;
  }
  function encounterPose(slot) {
    const index = read("render.actorIndex", slot);
    write("dispatch.encounterIndex", index);
    const position = projectPosition(slot, "encounter", index);
    if (!position.visible) return position;
    write("scratch.tileX", read(`save.active.field_object.${index}.state_raw`));
    const preset = index < 8 ? index : read(`save.active.active_rental_vehicle_preset.${index - 8}`);
    if (typeof readDocument !== "function") throw new TypeError("vehicle-actor-type-service");
    select(slot, vehicleFieldActorType(readDocument("vehicle-visual-selector"), preset), read("scratch.tileX"), 0);
    return position;
  }
  const project = slot => ({slot, marker: read("render.marker", slot),
    x_low: read("render.screenXLow", slot), x_high: read("render.screenXHigh", slot),
    y_low: read("render.screenYLow", slot), y_high: read("render.screenYHigh", slot),
    frame: read("render.frame", slot), attributes: read("render.attributes", slot)});
  const transaction = operation => {
    const before = state.capture();
    try {return {status: "available", ...operation(), state: state.capture()};}
    catch (error) {state.restore(before); return unavailable([error.message]);}
  };
  function createExecution({projectCamera = true, advanceActions = true,
    slots = Array.from({length: 16}, (_, index) => 15 - index)} = {}) {
    if (!Array.isArray(slots) || slots.some(slot => !Number.isInteger(slot) || slot < 0 || slot > 15))
      throw new TypeError("scene-render-slots");
    let current = null, cancelled = false;
    function* run() {
      const projections = [], effects = [];
      const cameraPosition = projectCamera ? camera() : {x: read("field.cameraPixelX"), y: read("field.cameraPixelY")};
      for (const slot of slots) {
        write("dispatch.renderSlot", slot);
        const marker = read("render.marker", slot), kind = marker & 63;
        let position = {visible: false, reason: "empty-slot"};
        if (marker !== 0) {
          if (kind === 1 || kind === 2) position = partyPose(slot, kind === 2);
          else if (kind === 3 || kind === 4) {
            if (advanceActions) {
              const execution = createActionExecution ? createActionExecution(slot)
                : createSceneActionStateExecution({...actionOptions, state, renderSlot: slot});
              let action = execution.advance();
              while (action.status === "pending") {
                const response = yield action;
                action = execution.advance(response);
              }
              if (action.status !== "complete") {yield action; return;}
              state.restore(action.state);
              effects.push(...(action.effects || []));
            }
            position = actorPose(slot);
          } else if (kind === 5) position = encounterPose(slot);
          else throw new TypeError(`render-marker-class:${kind}`);
        }
        projections.push({...project(slot), ...position});
      }
      return {camera: cameraPosition, slots: projections, effects};
    }
    const execution = run();
    return Object.freeze({advance(response) {
      if (cancelled) throw new TypeError("scene-draw-cancelled");
      if (current && current.status !== "pending") return current;
      if (current?.status === "pending" && response?.status !== "available") return current;
      const before = state.capture();
      try {
        const next = execution.next(response);
        current = next.done ? {status: "available", ...next.value, state: state.capture()} : next.value;
      } catch (error) {state.restore(before); current = unavailable([error.message]); execution.return();}
      return current;
    }, cancel() {cancelled = true; execution.return();}});
  }
  return Object.freeze({createExecution,
    projectCamera: () => transaction(() => ({camera: camera()})),
    projectWorld: () => transaction(() => ({world: world()})),
    projectActorPose: slot => transaction(() => {
      write("dispatch.renderSlot", slot);
      return {slots: [{...actorPose(slot), ...project(slot)}]};
    }),
    capture: () => state.capture(), restore: snapshot => state.restore(snapshot)});
}
