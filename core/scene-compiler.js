// @editor-module 编码场景语义组件并组成逻辑槽位映像。
// Pure browser encoder for semantic Scene resources.
//
// This is a direct ES-module port of engine/tools/mm_scene_compiler.py.  The
// semantic encoders produce named logical components.  compileSceneAssetFields()
// then composes changed component slices into complete logical slot images;
// it never receives a ROM buffer or a physical destination address.

import {BUNDLE_SCHEMA, sha256Hex} from "./rom-linker.js";

export const SCENE_COMPILER_ID = "scene-config/v1";
export const SCENE_BUILD_ASSET_ID = "scene.config";
export const SCENE_CATALOG_PATH = "game/scenes/catalog.json";
export const SCENE_COMPONENT_CATALOG_PATH = "game/scenes/components.json";
const SCENE_COMPONENT_CODEC = SCENE_COMPILER_ID;
const SCENE_COMPONENT_CODEC_VERSION = "1";
const SCENE_ENCODER = SCENE_COMPILER_ID;
const SCENE_ENCODER_VERSION = "1";

export const SCENE_ID_MAXIMUM = 0xef;
export const ACTOR_INTERACTION_SCRIPT_COUNT = 0x100;
export const ACTOR_AUTONOMOUS_SCRIPT_COUNT = 0xa9;
export const ACTOR_DIRECT_TEXT_RECORD_COUNTS = Object.freeze([
  0, 139, 171, 25, 43, 215, 191, 165,
  41, 23, 223, 198, 37, 102, 208, 69,
]);
const SCENE_ACTOR_BYTE_FIELD_SPECS = Object.freeze([
  Object.freeze({
    label: "角色类型 / 初始朝向（bits 2–7 / 0–1）",
    min: 0,
    max: 0xff,
    bit_fields: Object.freeze([
      Object.freeze({
        label: "角色类型", mask: 0xfc, shift: 2, min: 0, max: 0x3f,
      }),
      Object.freeze({
        label: "初始朝向", mask: 0x03, shift: 0, min: 0, max: 3,
      }),
    ]),
  }),
  Object.freeze({
    label: "初始 X / 渲染属性高位（bits 0–5 / 6–7）",
    min: 0,
    max: 0xff,
    bit_fields: Object.freeze([
      Object.freeze({
        label: "初始 X", mask: 0x3f, shift: 0, min: 0, max: 0x3f,
      }),
      Object.freeze({
        label: "渲染属性 X 部分", mask: 0xc0, shift: 6, min: 0, max: 3,
      }),
    ]),
  }),
  Object.freeze({
    label: "初始 Y / 渲染属性高位（bits 0–5 / 6–7）",
    min: 0,
    max: 0xff,
    bit_fields: Object.freeze([
      Object.freeze({
        label: "初始 Y", mask: 0x3f, shift: 0, min: 0, max: 0x3f,
      }),
      Object.freeze({
        label: "渲染属性 Y 部分", mask: 0xc0, shift: 6, min: 0, max: 3,
      }),
    ]),
  }),
  Object.freeze({
    label: "交互 selector / 渲染槽 flags（bits 2–7 / 0–1）",
    min: 0,
    max: 0xff,
    bit_fields: Object.freeze([
      Object.freeze({
        label: "交互 selector", mask: 0xfc, shift: 2, min: 0, max: 0x3f,
      }),
      Object.freeze({
        label: "渲染槽 flags", mask: 0x03, shift: 0, min: 0, max: 3,
      }),
    ]),
  }),
  Object.freeze({label: "交互脚本 / 文本记录 id", min: 0, max: 0xff}),
  Object.freeze({
    label: "自动动作脚本 id",
    min: 0,
    max: ACTOR_AUTONOMOUS_SCRIPT_COUNT - 1,
  }),
]);
const INVESTIGATION_KNOWN_INSTANCE_COUNTS = Object.freeze([
  9, 10, 2, 5, null, 3, null, null, null, null, null,
]);
export function validateSceneInvestigationSelector(selector, instanceId) {
  const knownCount = INVESTIGATION_KNOWN_INSTANCE_COUNTS[selector];
  if (knownCount !== null && instanceId >= knownCount) {
    throw new SceneEncodingError(
      `investigation instance ${instanceId} exceeds selector ${selector}`,
    );
  }
}
const SHA256 = /^[0-9a-f]{64}$/;

class SceneEncodingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "SceneEncodingError";
  }
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key =>
    `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SceneEncodingError(`${label} must be an object`);
  }
  return value;
}

function array(value, label) {
  if (!Array.isArray(value)) {
    throw new SceneEncodingError(`${label} must be an array`);
  }
  return value;
}

function integer(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new SceneEncodingError(
      `${label} must be an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

function byte(value, label, maximum = 0xff) {
  return integer(value, label, 0, maximum);
}

function identifier(value, label) {
  if (typeof value !== "string" || !value) {
    throw new SceneEncodingError(`${label} must be a non-empty string`);
  }
  return value;
}

function hexId(value) {
  return value.toString(16).padStart(2, "0");
}

function component(target, componentId, resourceId, payload) {
  identifier(componentId, "component_id");
  identifier(resourceId, "resource_id");
  if (!(payload instanceof Uint8Array) || !payload.length) {
    throw new SceneEncodingError(`${componentId}: payload must be non-empty bytes`);
  }
  const previous = target.get(componentId);
  if (previous && (previous.resource_id !== resourceId ||
      previous.payload.length !== payload.length ||
      previous.payload.some((value, index) => value !== payload[index]))) {
    throw new SceneEncodingError(`scene component conflict: ${componentId}`);
  }
  target.set(componentId, {component_id: componentId, resource_id: resourceId, payload});
}

export function encodeMapTokenFields(data) {
  const tokens = [];
  let cursor = 0;
  while (cursor < data.length) {
    let end = cursor + 1;
    while (end < data.length && data[end] === data[cursor] &&
        end - cursor < 0x7f) {
      end += 1;
    }
    const count = end - cursor;
    const value = data[cursor];
    if (value === 0 || count >= 3) {
      tokens.push(0, value, count);
    } else {
      for (let index = cursor; index < end; index += 1) tokens.push(data[index]);
    }
    cursor = end;
  }
  return tokens;
}

function pack7Bit(tokens, outputBytes, trailingValue) {
  const minimum = Math.ceil(tokens.length * 7 / 8);
  if (outputBytes < minimum) {
    throw new SceneEncodingError(
      `${tokens.length} scene tokens need ${minimum} bytes; allocation has ${outputBytes}`,
    );
  }
  const padding = outputBytes * 8 - tokens.length * 7;
  const trailingLimit = 2 ** padding;
  if (!Number.isSafeInteger(trailingValue) || trailingValue < 0 ||
      trailingValue >= trailingLimit) {
    throw new SceneEncodingError("trailing packed-bit value does not fit its padding");
  }
  const output = new Uint8Array(outputBytes);
  let bitOffset = 0;
  const writeBits = (value, width) => {
    for (let shift = width - 1; shift >= 0; shift -= 1) {
      if ((value >> shift) & 1) {
        output[Math.floor(bitOffset / 8)] |= 1 << (7 - (bitOffset % 8));
      }
      bitOffset += 1;
    }
  };
  for (const token of tokens) writeBits(byte(token, "scene token", 0x7f), 7);
  writeBits(trailingValue, padding);
  return output;
}

/** Shared scene map encoder with the unpadded token count needed by import validation. */
export function encodeSceneMapStreamFields({data, allocationBytes, trailingValue, allowExpansion = false}) {
  const tokens = encodeMapTokenFields(data);
  const capacity = Math.floor(allocationBytes * 8 / 7);
  if (allowExpansion) {
    const expandedBytes = Math.ceil(tokens.length / 8) * 7;
    return {bytes: pack7Bit(tokens.concat(Array(8 - tokens.length % 8).fill(0x7f)).slice(0, expandedBytes * 8 / 7), expandedBytes, 0), usedTokens: tokens.length};
  }
  if (tokens.length > capacity) {
    throw new SceneEncodingError(
      `encoded scene map needs ${tokens.length} tokens; allocation holds ${capacity}`,
    );
  }
  const usedTokens = tokens.length;
  while (tokens.length < capacity) tokens.push(0x7f);
  return {bytes: pack7Bit(tokens, allocationBytes, trailingValue), usedTokens};
}

function logicComponents(logicValue) {
  const logic = object(logicValue, "scene logic");
  const sceneId = byte(logic.scene_id, "logic.scene_id", SCENE_ID_MAXIMUM);
  const prefix = `scene.logic.${hexId(sceneId)}`;
  const layers = object(logic.layers, "logic.layers");
  const result = [];

  for (const row of array(layers.treasures, "logic.layers.treasures")) {
    const rowId = byte(row.id, "treasure.id");
    const compiledFields = Array.isArray(row.compiled_fields)
      ? row.compiled_fields.map(field => String(field))
      : ["x", "y", "content_id"];
    const expectedFields = compiledFields.includes("scene_id")
      ? ["scene_id", "x", "y", "content_id"]
      : ["x", "y", "content_id"];
    if (stableJson(compiledFields) !== stableJson(expectedFields)) {
      throw new SceneEncodingError(
        `treasure ${hexId(rowId)} has an invalid compiled field contract`,
      );
    }
    for (const field of compiledFields) {
      const maximum = field === "content_id" ? 0xfb : 0xff;
      const value = byte(row[field], `treasure.${field}`, maximum);
      if (field === "scene_id" && value !== sceneId) {
        throw new SceneEncodingError(
          `treasure ${hexId(rowId)} cannot leave scene ${hexId(sceneId)} `
          + "without being re-keyed as a different semantic entity",
        );
      }
      result.push([
        `${prefix}.treasure.${hexId(rowId)}.${field}`,
        Uint8Array.of(value),
      ]);
    }
  }

  for (const row of array(
    layers.investigation_points,
    "logic.layers.investigation_points",
  )) {
    const rowId = byte(row.id, "investigation.id");
    const selector = byte(row.handler_selector, "investigation.handler_selector", 10);
    const instanceId = byte(row.instance_id, "investigation.instance_id", 0x0f);
    validateSceneInvestigationSelector(selector, instanceId);
    for (const [field, value] of [
      ["x", byte(row.x, "investigation.x")],
      ["y", byte(row.y, "investigation.y")],
      ["packed-handler-instance", (instanceId << 4) | selector],
    ]) {
      result.push([
        `${prefix}.investigation.${hexId(rowId)}.${field}`,
        Uint8Array.of(value),
      ]);
    }
  }

  const transitions = object(layers.transitions, "logic.layers.transitions");
  for (const row of array(transitions.boundary_exits, "boundary_exits")) {
    const rowId = byte(row.id, "boundary.id");
    result.push([
      `${prefix}.boundary.${hexId(rowId)}.target`,
      Uint8Array.of(
        byte(row.destination_scene_id, "boundary.scene", SCENE_ID_MAXIMUM),
        byte(row.destination_x, "boundary.x"),
        byte(row.destination_y, "boundary.y"),
      ),
    ]);
  }
  for (const row of array(transitions.point_transitions, "point_transitions")) {
    const rowId = byte(row.id, "transition.id");
    result.push([
      `${prefix}.transition.${hexId(rowId)}.x`,
      Uint8Array.of(byte(row.x, "transition.x")),
    ]);
    result.push([
      `${prefix}.transition.${hexId(rowId)}.y`,
      Uint8Array.of(byte(row.y, "transition.y")),
    ]);
    result.push([
      `${prefix}.transition.${hexId(rowId)}.target`,
      Uint8Array.of(
        byte(row.destination_scene_id, "transition.scene", SCENE_ID_MAXIMUM),
        byte(row.destination_x, "transition.destination_x"),
        byte(row.destination_y, "transition.destination_y"),
      ),
    ]);
  }
  return result;
}

/** Publish the logical component encoder for the offline Python bridge. */
export function encodeSceneLogicComponentFields({logic} = {}) {
  return logicComponents(logic);
}

export function validateActorInteraction(record, label) {
  const selector = byte(record.text_region, `${label}.text_region`, 0x3f);
  const argument = byte(record.interaction_or_record_id,
    `${label}.interaction_or_record_id`);
  const autonomous = byte(record.autonomous_script_id,
    `${label}.autonomous_script_id`, ACTOR_AUTONOMOUS_SCRIPT_COUNT - 1);
  if (selector === 0 && argument >= ACTOR_INTERACTION_SCRIPT_COUNT) {
    throw new SceneEncodingError(`${label}: interaction script is out of range`);
  }
  if (selector > 0 && selector < 0x10 &&
      argument >= ACTOR_DIRECT_TEXT_RECORD_COUNTS[selector]) {
    throw new SceneEncodingError(`${label}: dialogue record is out of range`);
  }
  return {selector, argument, autonomous};
}

export function encodeSceneActorRecordFields(record, label = "scene actor") {
  const value = object(record, label);
  const actorType = byte(value.actor_type, `${label}.actor_type`, 0x3f);
  const direction = byte(value.direction, `${label}.direction`, 3);
  const x = byte(value.x, `${label}.x`, 0x3f);
  const y = byte(value.y, `${label}.y`, 0x3f);
  const attributes = byte(value.direction_attributes,
    `${label}.direction_attributes`, 0xf0);
  if (attributes & 0x0f) {
    throw new SceneEncodingError(`${label}.direction_attributes only uses bits F0`);
  }
  const marker = byte(value.render_slot_marker, `${label}.render_slot_marker`, 3);
  const {selector, argument, autonomous} = validateActorInteraction(value, label);
  return Uint8Array.of(
    (actorType << 2) | direction,
    x | (attributes & 0xc0),
    y | ((attributes & 0x30) << 2),
    (selector << 2) | marker,
    argument,
    autonomous,
  );
}

/**
 * Apply one encoded byte back to the semantic scene-actor record.
 *
 * 剧情工作台只知道“第几个定长字节”和上面的控件描述；位拆装继续由场景
 * 角色基础模块拥有，消费页不复刻 byte0–byte5 的编码规则。
 */
export function applySceneActorRecordByte(
  record,
  byteIndex,
  encodedValue,
  label = "scene actor",
) {
  const value = object(record, label);
  const index = integer(byteIndex, `${label}.byte_index`, 0, 5);
  const encoded = byte(encodedValue, `${label}.encoded_byte`);
  const attributes = byte(
    value.direction_attributes,
    `${label}.direction_attributes`,
    0xf0,
  );
  if (attributes & 0x0f) {
    throw new SceneEncodingError(`${label}.direction_attributes only uses bits F0`);
  }
  if (index === 0) {
    value.actor_type = encoded >> 2;
    value.direction = encoded & 0x03;
  } else if (index === 1) {
    value.x = encoded & 0x3f;
    value.direction_attributes = (attributes & 0x30) | (encoded & 0xc0);
  } else if (index === 2) {
    value.y = encoded & 0x3f;
    value.direction_attributes = (attributes & 0xc0) | ((encoded & 0xc0) >> 2);
  } else if (index === 3) {
    value.text_region = encoded >> 2;
    value.render_slot_marker = encoded & 0x03;
  } else if (index === 4) {
    value.interaction_or_record_id = encoded;
  } else {
    value.autonomous_script_id = byte(
      encoded,
      `${label}.autonomous_script_id`,
      ACTOR_AUTONOMOUS_SCRIPT_COUNT - 1,
    );
  }
  return value;
}

/** Publish the fixed-byte edit projection owned by scene-actor. */
export function sceneActorEditableByteFields(record) {
  const value = object(record, "scene actor");
  const uid = identifier(value.uid, "scene actor uid");
  const entryId = byte(value.entry_id, `${uid}.entry_id`);
  const recordId = byte(value.id, `${uid}.id`);
  const prgOffset = integer(
    value.source?.offset,
    `${uid}.source.offset`,
  );
  const entry = entryId.toString(16).padStart(2, "0");
  const item = recordId.toString(16).padStart(2, "0");
  return SCENE_ACTOR_BYTE_FIELD_SPECS.map((spec, byteIndex) => ({
    id: `actor-${entry}-${item}-byte-${byteIndex}`,
    kind: "actor-record",
    resource_id: "scene-actor",
    scene_actor_uid: uid,
    scene_actor_byte_index: byteIndex,
    prg_offset: prgOffset + byteIndex,
    length: 1,
    label: `角色 ${recordId + 1} · ${spec.label}`,
    min: Number(spec.min),
    max: Number(spec.max),
    ...(spec.bit_fields ? {bit_fields: spec.bit_fields} : {}),
  }));
}

/** Normalize field-produced Scene components and attach their original hashes. */
export async function collectSceneComponentFields(fieldComponents, descriptors) {
  if (!fieldComponents || typeof fieldComponents[Symbol.iterator] !== "function") {
    throw new SceneEncodingError("scene field components must be iterable");
  }
  const originalHashes = new Map();
  for (const descriptor of descriptors || []) {
    const componentId = identifier(descriptor.component_id, "component_id");
    if (originalHashes.has(componentId) || !SHA256.test(descriptor.original_sha256)) {
      throw new SceneEncodingError(`invalid/duplicate component descriptor ${componentId}`);
    }
    originalHashes.set(componentId, descriptor.original_sha256);
  }
  const encoded = new Map();
  for (const item of fieldComponents) component(encoded, item.component_id, item.resource_id, item.payload);
  return Promise.all([...encoded.keys()].sort().map(async componentId => {
    const item = encoded.get(componentId);
    const payloadSha256 = await sha256Hex(item.payload);
    const originalSha256 = originalHashes.get(componentId) || payloadSha256;
    return {
      ...item,
      payload_sha256: payloadSha256,
      original_sha256: originalSha256,
      changed: payloadSha256 !== originalSha256,
    };
  }));
}

/**
 * Compose changed logical component intervals into complete slot fragments.
 * Slices and preimages are target-injected logical data; no ROM offsets enter
 * this function.
 */
export async function compileSceneAssetFields({components, slices, slotPreimages}) {
  if (!Array.isArray(components) || !components.length || !Array.isArray(slices)) {
    throw new SceneEncodingError("scene components/slices are invalid");
  }
  if (!(slotPreimages instanceof Map) || !slotPreimages.size) {
    throw new SceneEncodingError("scene slot preimages must be a non-empty Map");
  }
  const componentsById = new Map();
  for (const item of components) {
    const componentId = identifier(item.component_id, "component_id");
    if (componentsById.has(componentId) || !(item.payload instanceof Uint8Array) ||
        !SHA256.test(item.original_sha256)) {
      throw new SceneEncodingError(`invalid/duplicate scene component ${componentId}`);
    }
    componentsById.set(componentId, item);
  }
  const hashedComponents = await Promise.all([...componentsById.values()].map(async item => {
    const payloadSha256 = await sha256Hex(item.payload);
    return {...item, payload_sha256: payloadSha256,
      changed: payloadSha256 !== item.original_sha256};
  }));
  for (const item of hashedComponents) componentsById.set(item.component_id, item);
  const byComponent = new Map();
  for (const item of slices) {
    const componentId = identifier(item.component_id, "slice.component_id");
    identifier(item.slot_id, "slice.slot_id");
    integer(item.component_offset, "slice.component_offset");
    integer(item.slot_offset, "slice.slot_offset");
    integer(item.length, "slice.length", 1);
    if (!byComponent.has(componentId)) byComponent.set(componentId, []);
    byComponent.get(componentId).push(item);
  }
  const componentIds = [...componentsById.keys()].sort();
  const slicedIds = [...byComponent.keys()].sort();
  if (stableJson(componentIds) !== stableJson(slicedIds)) {
    throw new SceneEncodingError("scene slot plan component identity mismatch");
  }

  const output = new Map();
  for (const [slotId, preimage] of slotPreimages) {
    identifier(slotId, "slot preimage ID");
    if (!(preimage instanceof Uint8Array) || !preimage.length) {
      throw new SceneEncodingError(`${slotId}: invalid slot preimage`);
    }
    output.set(slotId, preimage.slice());
  }
  const proposed = new Map();
  for (const componentId of componentIds) {
    const item = componentsById.get(componentId);
    const selected = byComponent.get(componentId).slice().sort((left, right) =>
      left.component_offset - right.component_offset);
    let cursor = 0;
    for (const slice of selected) {
      if (slice.component_offset !== cursor) {
        throw new SceneEncodingError(
          `scene component ${componentId} slot plan has a gap/overlap`,
        );
      }
      const slot = output.get(slice.slot_id);
      if (!slot || slice.slot_offset + slice.length > slot.length) {
        throw new SceneEncodingError(`${componentId}: slice escapes its slot preimage`);
      }
      cursor += slice.length;
    }
    if (cursor !== item.payload.length) {
      throw new SceneEncodingError(`${componentId}: slot coverage is incomplete`);
    }
    if (!item.changed) continue;
    for (const slice of selected) {
      const payload = item.payload.subarray(
        slice.component_offset,
        slice.component_offset + slice.length,
      );
      payload.forEach((value, relative) => {
        const offset = slice.slot_offset + relative;
        const key = stableJson([slice.slot_id, offset]);
        const previous = proposed.get(key);
        if (previous && previous.value !== value) {
          throw new SceneEncodingError(
            `changed scene components ${previous.component_id} and ${componentId} ` +
            `disagree in slot ${slice.slot_id}`,
          );
        }
        proposed.set(key, {
          slot_id: slice.slot_id,
          offset,
          value,
          component_id: componentId,
        });
      });
    }
  }
  for (const proposal of [...proposed.values()].sort((left, right) =>
    left.slot_id.localeCompare(right.slot_id) || left.offset - right.offset)) {
    output.get(proposal.slot_id)[proposal.offset] = proposal.value;
  }

  const fragments = await Promise.all([...output.keys()].sort().map(async slotId => {
    const payload = output.get(slotId);
    return {
      asset_id: SCENE_BUILD_ASSET_ID,
      fragment_id: slotId,
      slot_id: slotId,
      payload,
      payload_sha256: await sha256Hex(payload),
      codec: SCENE_COMPONENT_CODEC,
      codec_version: SCENE_COMPONENT_CODEC_VERSION,
      alignment: 1,
      relocations: [],
    };
  }));
  const inputManifest = [...componentsById.values()].map(item => ({
    component_id: item.component_id,
    resource_id: item.resource_id,
    payload_sha256: item.payload_sha256,
  })).sort((left, right) => left.component_id.localeCompare(right.component_id));
  return {
    schema: BUNDLE_SCHEMA,
    asset_id: SCENE_BUILD_ASSET_ID,
    encoder: SCENE_ENCODER,
    encoder_version: SCENE_ENCODER_VERSION,
    input_sha256: await sha256Hex(
      new TextEncoder().encode(stableJson(inputManifest)),
    ),
    fragments,
  };
}
