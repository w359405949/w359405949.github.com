// @editor-module 显示提交只通过所属字段访问现场，PPU 与 OAM 设备现场由调用方注入。
import {commitFrameNmi, completeFrameNmiTail, requireFrameByte, requireFrameVector} from "./frame-commit-semantics.js";
import {completeRasterFrame, commitRasterIrq} from './raster-interrupt-semantics.js';
import {cloneFrameValue, sameFrameVector} from './frame-state-values.js';

const scalars = Object.freeze({
  nmi_mode: "display.nmiMode", frame_counter: "display.frameCounter",
  display_profile: "control.displayProfile", brightness_countdown: "parameter.frameCountdown",
  main_queue_length: "display.mainQueueLength", contiguous_length: "display.contiguousLength",
  span_count: "display.spanCount", palette_pending: "display.palettePending",
  secondary_queue_length: "display.secondaryQueueLength", oam_pending: "display.oamPending",
  contiguous_low: "display.contiguousLow", contiguous_high: "display.contiguousHigh",
  ppu_ctrl_shadow: "display.ppuCtrlShadow", ppu_mask_shadow: "display.ppuMaskShadow",
  scroll_x_shadow: "display.scrollXShadow", scroll_y_shadow: "display.scrollYShadow",
  raster_ctrl: "display.rasterCtrl", raster_phase: "display.rasterPhase",
  dynamic_irq_latch: "display.dynamicIrqLatch", irq_handler_index: "display.irqHandlerIndex",
  nametable_xor: "display.nametableXor",
  nametable_page: "display.nametablePage", raster_address: "display.rasterAddress",
  raster_restore_ctrl: "scratch.savedY", raster_transfer_count: "display.rasterTransferCount",
});
const vectors = Object.freeze({
  chr_shadow: ["display.chrShadow", 6], raster_chr_banks: ["display.rasterChrBanks", 6],
  primary_chr_banks: ["display.primaryChrBanks", 6],
  main_queue: ["display.mainQueue", 352], palette_shadow: ["display.paletteShadow", 32],
  oam_shadow: ["display.oamShadow", 256],
});
const glyphScalars = Object.freeze({pending: "glyph.pending", first_half: "glyph.firstHalf",
  second_half: "glyph.secondHalf", address_low: "glyph.addressLow", address_high: "glyph.addressHigh"});
const deviceVectors = Object.freeze({chr_banks: 6, chr_ram: 2048, nametables: 2048, ppu_palette: 32, oam: 256});
const unavailable = missing => ({status: "unavailable", missing});
const scalarFields = Object.entries(scalars), vectorFields = Object.entries(vectors);
const glyphFields = Object.entries(glyphScalars), deviceFields = Object.entries(deviceVectors);
const outputKeys = [...Object.keys(deviceVectors), "chr_mode", "ppu_ctrl", "ppu_mask",
  "scroll_x", "scroll_y", "irq_latch", "irq_enabled", "raster_complete", "ppu_address"];

function validateDeviceFields(device) {
  for (const [key, length] of deviceFields) requireFrameVector(device?.[key], length, key);
  for (const key of ["chr_mode", "ppu_ctrl", "ppu_mask", "scroll_x", "scroll_y", "irq_latch"])
    requireFrameByte(device || {}, key);
  if (device.chr_mode > 1 || !["vertical", "horizontal"].includes(device.mirroring)
    || typeof device.irq_enabled !== "boolean") throw new TypeError("display-device-state");
}

function validateDevice(device, packed = false) {
  validateDeviceFields(device);
  if (!packed) return cloneFrameValue(device);
  const input = cloneFrameValue(Object.fromEntries(Object.entries(device).filter(([key]) => !Object.hasOwn(deviceVectors, key))));
  for (const key of Object.keys(deviceVectors))
    input[key] = Array.isArray(device[key]) ? Uint8Array.from(device[key]) : cloneFrameValue(device[key]);
  return input;
}

export const packSceneDisplayDevice = device => validateDevice(device, true);

export function unpackSceneDisplayDevice(input, device) {
  const output = {...input};
  for (const key of Object.keys(deviceVectors))
    if (Array.isArray(device[key])) output[key] = Array.from(input[key]);
  return output;
}

function unpackFrame(input, device) {
  const output = unpackSceneDisplayDevice(input, device);
  for (const key of Object.keys(vectors)) output[key] = Array.from(input[key]);
  output.glyph = {...input.glyph, tiles: Array.from(input.glyph.tiles), patterns: Array.from(input.glyph.patterns)};
  return output;
}

export function unpackSceneDisplayRaster(result, device) {
  if (result.status !== 'available') return result;
  return {...result, state: unpackFrame(result.state, device), frame: {...result.frame,
    phases: result.frame.phases.map(phase => ({...phase, chr_banks: Array.isArray(device.chr_banks)
      ? Array.from(phase.chr_banks) : phase.chr_banks}))}};
}

function sameDevice(before, after, vectorTypes) {
  if (!after || typeof after !== "object") return false;
  const keys = Object.keys(before);
  return keys.length === Object.keys(after).length && keys.every(key => {
    if (!Object.hasOwn(after, key)) return false;
    const left = before[key], right = after[key];
    return Array.isArray(left) || ArrayBuffer.isView(left)
      ? (Array.isArray(right) || ArrayBuffer.isView(right))
        && Object.getPrototypeOf(right) === vectorTypes[key] && sameFrameVector(left, right)
      : left === right;
  });
}

export function createSceneDisplayServices({state, catalog}) {
  let pending = null;
  const packedFields = new WeakMap();
  const packField = (value, length, id) => {
    requireFrameVector(value, length, id);
    if (Array.isArray(value) && Object.isFrozen(value)) {
      let packed = packedFields.get(value);
      if (!packed) {packed = Uint8Array.from(value); packedFields.set(value, packed);}
      return packed;
    }
    return Uint8Array.from(value);
  };
  const field = id => state.field(id);
  const read = id => {
    const current = field(id);
    if (current.knowledge !== "confirmed" || current.value === null) throw new TypeError(id);
    return current.value;
  };
  const project = (device, owned = false) => {
    if (!owned) validateDeviceFields(device);
    const input = {...device};
    for (const [key] of deviceFields)
      if (Array.isArray(input[key])) input[key] = Uint8Array.from(input[key]);
    for (const [key, id] of scalarFields) input[key] = read(id);
    for (const [key, [id, length]] of vectorFields)
      input[key] = packField(read(id), length, id);
    input.nmi_worker = read("display.nmiWorker") === 0xD22F ? "normal-display" : null;
    input.irq_handler = read("display.irqHandler");
    input.glyph = {};
    for (const [key, id] of glyphFields) input.glyph[key] = read(id);
    input.glyph.tiles = packField(read("glyph.tiles"), 4, "glyph.tiles");
    input.glyph.patterns = packField(read("glyph.patterns"), 48, "glyph.patterns");
    return input;
  };
  const capture = device => ({schema: "metalmaxcn.scene-display-state",
    fields: state.capture(), device: validateDevice(device)});
  const restoreFields = snapshot => {
    if (snapshot?.schema !== "metalmaxcn.scene-display-state") throw new TypeError("scene-display-state");
    const device = validateDevice(snapshot.device);
    state.restore(snapshot.fields);
    return device;
  };
  const apply = (input, output, device, glyphUpload = false) => {
    for (const [key, id] of scalarFields)
      if (output[key] !== input[key]) field(id).value = output[key];
    for (const [key, [id]] of vectorFields)
      if (!sameFrameVector(output[key], input[key])) field(id).value = [...output[key]];
    if (output.irq_handler !== input.irq_handler) field("display.irqHandler").value = output.irq_handler;
    for (const [key, id] of glyphFields)
      if (output.glyph[key] !== input.glyph[key]) field(id).value = output.glyph[key];
    if (glyphUpload && input.glyph.pending === 0 && (input.glyph.first_half || input.glyph.second_half))
      field("scratch.transferPointer").value = input.glyph.first_half ? 0x67A8 : 0x67B8;
    const display = {...device};
    for (const key of outputKeys)
      if (output[key] !== undefined) display[key] = output[key];
    if (output.ppu_address === undefined) delete display.ppu_address;
    return display;
  };
  return Object.freeze({capture,
    rasterFrame(device) {
      try {
        const result = completeRasterFrame(catalog, project(device));
        return unpackSceneDisplayRaster(result, device);
      }
      catch (error) {return unavailable([error.message]);}
    },
    commitIrq(device) {
      if (pending) return unavailable(['nmi-audio-continuation']);
      const before = state.capture();
      try {
        const input = project(device), result = commitRasterIrq(catalog, input);
        if (result.status !== 'available') return result;
        return {status: 'available', display: unpackSceneDisplayDevice(apply(input, result.state, device), device), state: state.capture(),
          effects: result.effects};
      } catch (error) {state.restore(before); return unavailable([error.message]);}
    },
    commitRaster(device) {
      if (pending) return unavailable(['nmi-audio-continuation']);
      const before = state.capture();
      try {
        const input = project(device), result = completeRasterFrame(catalog, input);
        if (result.status !== 'available') return result;
        return {status: 'available', display: unpackSceneDisplayDevice(apply(input, result.state, device), device), state: state.capture(),
          effects: result.effects, frame: unpackSceneDisplayRaster(result, device).frame};
      } catch (error) {state.restore(before); return unavailable([error.message]);}
    },
    restore(snapshot) {
      const device = restoreFields(snapshot);
      pending = null;
      return device;
    },
    commitNmi(device, {advanceAudio} = {}) {
      if (pending) return unavailable(["nmi-audio-continuation"]);
      const inputDevice = device;
      const before = state.capture();
      try {
        const preceding = project(device), raster = completeRasterFrame(catalog, preceding);
        if (raster.status !== 'available') return raster;
        device = apply(preceding, raster.state, device);
        const input = project(device, true);
        let audioInput = input, audioDevice = device, outputDevice = inputDevice, audioCalled = false;
        const result = commitFrameNmi(catalog, input, {advanceAudio: graphics => {
          if (advanceAudio === undefined) return {status: "pending"};
          if (typeof advanceAudio !== "function") return unavailable(["audio-frame-service"]);
          audioCalled = true;
          const display = apply(input, graphics, device, true);
          const fields = state.capture();
          const audioDisplay = unpackSceneDisplayDevice(cloneFrameValue(display), inputDevice);
          const vectorTypes = Object.fromEntries(Object.keys(deviceVectors)
            .map(key => [key, Object.getPrototypeOf(audioDisplay[key])]));
          const audio = advanceAudio({state: fields, display: audioDisplay});
          if (audio?.status !== "available") return audio || unavailable(["audio-frame-service"]);
          outputDevice = audio.display;
          if (state.isCapturedState?.(fields) && audio.state === fields && sameDevice(display, audio.display, vectorTypes)) {
            state.restore(fields);
            audioDevice = display; audioInput = graphics;
            return {status: "available", state: {...graphics, main_queue: graphics.main_queue.slice()}, effects: audio.effects || []};
          }
          audioDevice = restoreFields({schema: "metalmaxcn.scene-display-state", fields: audio.state, device: audio.display});
          audioInput = project(audioDevice);
          return {status: "available", state: cloneFrameValue(audioInput), effects: audio.effects || []};
        }});
        if (!["available", "pending"].includes(result.status)) {state.restore(before); return result;}
        const display = unpackSceneDisplayDevice(apply(audioInput, result.state, audioDevice, !audioCalled), outputDevice);
        const response = {status: result.status, state: state.capture(), display,
          effects: [...raster.effects, ...result.effects]};
        if (result.status === "pending") {
          response.effects.push({kind: "audio-frame"});
          response.continuation = {phase: "nmi-audio"};
          pending = response;
        }
        return response;
      } catch (error) {
        state.restore(before);
        return unavailable([error.message]);
      }
    },
    resumeNmi(continuation, audio) {
      if (continuation !== pending || !pending) return unavailable(["nmi-audio-continuation"]);
      if (audio?.status !== "available") return pending;
      const before = state.capture();
      try {
        const display = restoreFields({schema: "metalmaxcn.scene-display-state", fields: audio.state, device: audio.display});
        const input = project(display), result = completeFrameNmiTail(catalog, input);
        if (result.status !== "available") {state.restore(before); return result;}
        const response = {status: "available", state: null, display: unpackSceneDisplayDevice(apply(input, result.state, display), display),
          effects: [...pending.effects, ...(audio.effects || [])]};
        response.state = state.capture(); pending = null;
        return response;
      } catch (error) {state.restore(before); return unavailable([error.message]);}
    },
  });
}
