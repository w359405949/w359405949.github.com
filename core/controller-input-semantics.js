// @editor-module 一号手柄服务从按键输入计算三次锁存及所属输入字段。
import {requireFrameByte, requireFrameVector} from "./frame-commit-semantics.js";

const unavailable = missing => ({status: "unavailable", missing});
const buttons = Object.freeze({a: 128, b: 64, select: 32, start: 16, up: 8, down: 4, left: 2, right: 1});

function controllerButtonMask(input) {
  if (!input || typeof input !== "object") throw new TypeError("controller-buttons");
  let value = 0;
  for (const [name, mask] of Object.entries(buttons)) {
    if (typeof input[name] !== "boolean") throw new TypeError(`controller-buttons.${name}`);
    if (input[name]) value |= mask;
  }
  return value;
}

export function resolveControllerSamples(catalog, input, samples) {
  const state = structuredClone(input);
  try {
    requireFrameVector(samples, 3, "controller-read-samples");
    const [first, second, third] = samples;
    const value = first === second || first === third ? first : second === third ? second : null;
    state.controller_samples = [...samples];
    if (value !== null) {
      state.controller_edges = (value ^ requireFrameByte(state, "controller_previous")) & value;
      state.controller_previous = value;
      state.direction_index = requireFrameVector(catalog?.controller_directions, 16,
        "controller-direction-source")[value & 15];
      state.controller_samples[0] = value;
    }
    return {status: "available", state, effects: [{kind: "controller-poll", samples: [...samples]}]};
  } catch (error) {return unavailable([error.message]);}
}

function pollControllerInput(catalog, input, {readButtons, buttons: heldButtons} = {}) {
  const samples = [];
  let cycles = 2;
  try {
    if (typeof readButtons !== "function" && heldButtons === undefined) throw new Error("controller-buttons");
    for (let sample = 2; sample >= 0; sample--) {
      // STY $4016 的高电平锁存发生在本轮第六个周期。
      const value = controllerButtonMask(typeof readButtons === "function"
        ? readButtons({sample, cycle_offset: cycles + 6}) : heldButtons);
      samples[sample] = value;
      const ones = [...Array(8).keys()].reduce((sum, bit) => sum + ((value >> bit) & 1), 0);
      // BPL 从 D10D 跳到 D0F5 时跨页。
      cycles += 14 + 167 - ones + 2 + (sample ? 4 : 2);
    }
    const result = resolveControllerSamples(catalog, input, samples);
    if (result.status !== "available") return result;
    const [first, second, third] = samples;
    cycles += first === second ? 9 + 35 : first === third ? 14 + 35
      : second === third ? 21 + 35 : 22 + 6;
    return {...result, cycles, timing_scope: "no-interrupts-or-bus-stalls"};
  } catch (error) {return unavailable([error.message]);}
}

export function createControllerInputServices({state, catalog}) {
  return Object.freeze({
    poll(input) {
      try {
        const fields = Object.fromEntries(["current", "edges", "direction", "samples"].map(name => {
          const field = state.field(`controller.${name}`);
          if (field.knowledge !== "confirmed") throw new TypeError(`controller.${name}`);
          return [name, field];
        }));
        const before = {
          controller_previous: fields.current.value,
          controller_edges: fields.edges.value,
          direction_index: fields.direction.value,
        };
        for (const key of Object.keys(before)) requireFrameByte(before, key);
        const result = pollControllerInput(catalog, before, input);
        if (result.status !== "available") return result;
        fields.samples.value = result.state.controller_samples;
        fields.current.value = result.state.controller_previous;
        fields.edges.value = result.state.controller_edges;
        fields.direction.value = result.state.direction_index;
        return {...result, state: state.capture()};
      } catch (error) {return unavailable([error.message]);}
    },
  });
}
