// @editor-module 校验与编码剧情语义资源，产出紧凑组件载荷。
// Pure semantic encoder for the three Metal Max story resources.
//
// The encoder knows stable resource/component identities and the compact Story
// codecs.  It deliberately knows no ROM path, physical address, bank, BuildMap
// slot, or transport API.  asset-compiler.js injects logical target slots and
// translates component-local pointer relocations at the compiler boundary.

import {sha256Hex} from "./rom-linker.js";
import {fieldFragmentId, fieldOffsetInFragment, fieldStoredValue,
  SPARSE_ARRAY_FORMAT} from "./field-codec.js";
import {assembleStoryScriptLayout, storyScriptWritePlan} from "./story-script-layout.js";

export const STORY_COMPILER_ID = "story-sequences/v1";
export const STORY_ENCODER =
  "story-sequences/v1";
export const STORY_ENCODER_VERSION = "1";
export const STORY_COMPONENT_CODEC = "metalmaxcn.story-component";
export const STORY_COMPONENT_CODEC_VERSION = "1";

export const STORY_RESOURCE_IDS = Object.freeze([
  "story-autonomous-script",
  "story-interaction-script",
  "world-event",
]);

const RESOURCE_KINDS = Object.freeze({
  "story-autonomous-script": "autonomous",
  "story-interaction-script": "interaction",
  "world-event": "world-events",
});

const COMPONENT_IDS = Object.freeze({
  "story-autonomous-script": Object.freeze([
    "story-autonomous-script.pointer-table",
    "story-autonomous-script.stream-pool",
  ]),
  "story-interaction-script": Object.freeze([
    "story-interaction-script.pointer-table",
    "story-interaction-script.stream-pool",
  ]),
  "world-event": Object.freeze([
    "world-event.trigger-tables",
  ]),
});

export const WORLD_EVENT_FIELDS = Object.freeze([
  "scene_id",
  "trigger_x",
  "trigger_y",
  "event_flag",
  "story_state",
  "encounter_formation_id",
]);

class StoryEncodingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "StoryEncodingError";
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
    throw new StoryEncodingError(`${label} must be an object`);
  }
  return value;
}

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new StoryEncodingError(
      `${label} must be an integer from ${minimum} through ${maximum}`,
    );
  }
  return value;
}

const byte = (value, label) => integer(value, label, 0, 0xff);
const word = (value, label) => integer(value, label, 0, 0xffff);

function positive(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new StoryEncodingError(`${label} must be a positive integer`);
  }
  return value;
}

function expectedIntegerSet(start, end) {
  return new Set(Array.from({length: end - start}, (_, index) => start + index));
}

function sameIntegerSet(left, right) {
  if (left.size !== right.size) return false;
  return [...left].every(value => right.has(value));
}

function scriptResourceId(resourceId, scriptId) {
  return `${resourceId}.script.${scriptId.toString(16).padStart(2, "0")}`;
}

export function storyAssetSchema(resourceId) {
  const kind = RESOURCE_KINDS[resourceId];
  if (!kind) throw new StoryEncodingError(`unknown Story resource ${resourceId}`);
  return `metalmaxcn.story.asset.${kind}`;
}

export function storyComponentIds(resourceId) {
  const result = COMPONENT_IDS[resourceId];
  if (!result) throw new StoryEncodingError(`unknown Story resource ${resourceId}`);
  return [...result];
}

function validateScriptAsset(asset, resourceId) {
  const pointerCount = positive(asset.pointer_count, "pointer_count");
  if (pointerCount > 0x100) {
    throw new StoryEncodingError("Story pointer_count cannot exceed 256");
  }
  const firstValidId = byte(asset.first_valid_id, "first_valid_id");
  if (firstValidId >= pointerCount) {
    throw new StoryEncodingError("first_valid_id escapes the pointer table");
  }
  if (!Array.isArray(asset.scripts)) {
    throw new StoryEncodingError("Story scripts must be a JSON array");
  }
  const expectedIds = expectedIntegerSet(firstValidId, pointerCount);
  const scriptsById = new Map();
  asset.scripts.forEach((raw, index) => {
    const script = object(raw, `scripts[${index}]`);
    const scriptId = byte(script.id, `scripts[${index}].id`);
    if (!expectedIds.has(scriptId) || scriptsById.has(scriptId)) {
      throw new StoryEncodingError(
        `invalid or duplicate Story script ID ${scriptId}`,
      );
    }
    if (script.resource_id !== scriptResourceId(resourceId, scriptId)) {
      throw new StoryEncodingError(
        `script ${scriptId.toString(16).padStart(2, "0")} stable resource ID changed`,
      );
    }
    if (!Array.isArray(script.bytecode) || !script.bytecode.length) {
      throw new StoryEncodingError(
        `script ${scriptId.toString(16).padStart(2, "0")} bytecode must be non-empty`,
      );
    }
    script.bytecode.forEach((value, cursor) => byte(
      value,
      `script ${scriptId.toString(16).padStart(2, "0")} bytecode[${cursor}]`,
    ));
    scriptsById.set(scriptId, script);
  });
  if (!sameIntegerSet(new Set(scriptsById.keys()), expectedIds)) {
    throw new StoryEncodingError("Story script IDs differ from the pointer table");
  }
  if (!Array.isArray(asset.stream_order) || asset.stream_order.some(value =>
    !Number.isSafeInteger(value))) {
    throw new StoryEncodingError("stream_order must be an integer array");
  }
  if (asset.stream_order.length !== expectedIds.size ||
      !sameIntegerSet(new Set(asset.stream_order), expectedIds)) {
    throw new StoryEncodingError(
      "stream_order must contain every valid script ID once",
    );
  }
  if (!Array.isArray(asset.unused_pointer_words)) {
    throw new StoryEncodingError(
      "unused_pointer_words must be a JSON array",
    );
  }
  const unusedById = new Map();
  asset.unused_pointer_words.forEach((raw, index) => {
    const entry = object(raw, `unused_pointer_words[${index}]`);
    const entryId = byte(entry.id, `unused_pointer_words[${index}].id`);
    if (entryId >= firstValidId || unusedById.has(entryId)) {
      throw new StoryEncodingError("unused pointer ID is invalid or duplicated");
    }
    unusedById.set(entryId, word(
      entry.encoded_word,
      `unused_pointer_words[${index}].encoded_word`,
    ));
  });
  if (!sameIntegerSet(
    new Set(unusedById.keys()),
    expectedIntegerSet(0, firstValidId),
  )) {
    throw new StoryEncodingError(
      "every non-script pointer entry needs one encoded word",
    );
  }
  return {pointerCount, firstValidId, scriptsById};
}

function validateWorldAsset(asset) {
  const count = positive(asset.record_count, "record_count");
  if (!Array.isArray(asset.records) || asset.records.length !== count) {
    throw new StoryEncodingError(
      "world-event record_count differs from records",
    );
  }
  const recordsById = new Map();
  asset.records.forEach((raw, index) => {
    const record = object(raw, `world event ${index}`);
    const eventId = byte(record.id, `world event ${index}.id`);
    if (eventId >= count || recordsById.has(eventId)) {
      throw new StoryEncodingError("world-event ID is invalid or duplicated");
    }
    const stableId = `story.world-event.${eventId.toString(16).padStart(2, "0")}`;
    if (record.resource_id !== stableId) {
      throw new StoryEncodingError(
        `world event ${eventId.toString(16).padStart(2, "0")} stable ID changed`,
      );
    }
    for (const field of WORLD_EVENT_FIELDS) {
      byte(record[field], `world event ${eventId.toString(16)}.${field}`);
    }
    recordsById.set(eventId, record);
  });
  if (!sameIntegerSet(
    new Set(recordsById.keys()),
    expectedIntegerSet(0, count),
  )) {
    throw new StoryEncodingError(
      "world-event records must have contiguous stable IDs",
    );
  }
  return {count, recordsById};
}

export function validateStoryAsset(value, expectedResourceId = null) {
  const asset = object(value, "Story asset");
  const resourceId = asset.resource_id;
  if (typeof resourceId !== "string" || !RESOURCE_KINDS[resourceId]) {
    throw new StoryEncodingError(`unknown Story resource ${resourceId}`);
  }
  if (expectedResourceId !== null && resourceId !== expectedResourceId) {
    throw new StoryEncodingError(
      `Story resource mismatch: expected ${expectedResourceId}, got ${resourceId}`,
    );
  }
  const kind = RESOURCE_KINDS[resourceId];
  if (asset.kind !== kind) {
    throw new StoryEncodingError(`Story kind changed for ${resourceId}`);
  }
  if (kind === "world-events") validateWorldAsset(asset);
  else validateScriptAsset(asset, resourceId);
  return asset;
}

const WORLD_EVENT_OWNER = "world-event";
const worldEventHandle = id =>
  `story.world-event:${id.toString(16).toUpperCase().padStart(2, "0")}`;

function worldEventAsset(document) {
  const asset = document?.document && document.resource_id === undefined
    ? document.document : document;
  validateStoryAsset(asset, WORLD_EVENT_OWNER);
  return asset;
}

export function worldEventFieldDescriptions(document) {
  const asset = worldEventAsset(document);
  const fields = [];
  for (const [position, record] of asset.records.entries()) {
    for (const [column, fieldName] of WORLD_EVENT_FIELDS.entries()) {
      fields.push({
        resourceId: WORLD_EVENT_OWNER,
        entityHandle: worldEventHandle(record.id),
        recordId: record.id,
        fieldName,
        defaultValue: record[fieldName],
        documentPath: ["records", position, fieldName],
        // world-events is published as a flat semantic asset rather than a
        // {document} wrapper.  Keep the field object's path explicit so the
        // shared DB projection does not manufacture a missing document node.
        assetPath: ["records", position, fieldName],
        fragmentId: storyComponentIds(WORLD_EVENT_OWNER)[0],
        offsetInFragment: column * asset.record_count + record.id,
        byteLength: 1,
      });
    }
  }
  return fields;
}

const WORLD_EVENT_COLUMN_LABELS = Object.freeze({
  scene_id: "目标场景", trigger_x: "触发点 X 坐标", trigger_y: "触发点 Y 坐标",
  event_flag: "完成事件号（战斗类型）", story_state: "剧情状态", encounter_formation_id: "遭遇编队",
});

/** 一张触发表一个字段对象：固定坐标遭遇的 44 条记录，列按已发布六字段铺开。 */
export function worldEventObjects(document) {
  const fields = worldEventFieldDescriptions(document);
  const rows = [...new Set(fields.map(field => field.entityHandle))];
  return [{
    id: storyComponentIds(WORLD_EVENT_OWNER)[0],
    label: "固定坐标遭遇",
    fragmentIds: [storyComponentIds(WORLD_EVENT_OWNER)[0]],
    fields: fields.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows, rowLabels: rows,
      columns: WORLD_EVENT_FIELDS.map(fieldName => ({name: fieldName,
        label: WORLD_EVENT_COLUMN_LABELS[fieldName] ?? fieldName, min: 0, max: 0xff,
        ...(fieldName === "encounter_formation_id"
          ? {semantic: {kind: "reference", targetModule: "encounter-formation"},
            candidates: {resourceId: "encounter-formation", documentPath: ["records"],
              value: ["id"], label: ["id_hex"]}}
          : {}),
        ...(["scene_id", "trigger_x", "trigger_y"].includes(fieldName)
          ? {semantic: {kind: "coordinate", fields: {scene: "scene_id",
            x: "trigger_x", y: "trigger_y"}},
            ...(fieldName === "scene_id" ? {candidates: {
              document: "project.scenes", documentPath: ["editable_scenes"],
              value: ["id"], label: ["name"],
            }} : {})} : {})}))},
  }];
}

export function serializeWorldEventField(field) {
  const column = WORLD_EVENT_FIELDS.indexOf(field?.fieldName);
  if (field?.resourceId !== WORLD_EVENT_OWNER || column < 0 || !Number.isInteger(field.recordId)
      || field.recordId < 0 || !Number.isInteger(field.value) || field.value < 0 || field.value > 0xff)
    throw new StoryEncodingError("world-event field identity or value invalid");
  return new Uint8Array([field.value]);
}

export function validateWorldEventPreimage(fields, fragmentId, baseline) {
  if (fragmentId !== storyComponentIds(WORLD_EVENT_OWNER)[0])
    throw new StoryEncodingError("world-event Origin fragment identity invalid");
  const seen = new Set();
  for (const field of fields) {
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (field.resourceId !== WORLD_EVENT_OWNER || fieldFragmentId(field) !== fragmentId || seen.has(key))
      throw new StoryEncodingError("world-event Origin field identity invalid");
    seen.add(key);
    const expected = [field.defaultValue];
    const offset = fieldOffsetInFragment(field);
    const observed = baseline.subarray(offset, offset + 1);
    if (observed.length !== 1 || observed[0] !== expected[0])
      throw new StoryEncodingError("world-event Origin 与绑定原像不同");
  }
}

function validateWorldEventAsset(asset, original) {
  const current = worldEventAsset(asset);
  const source = worldEventAsset(original);
  const expected = structuredClone(source);
  for (const field of worldEventFieldDescriptions(source)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] =
      structuredClone(path.reduce((node, key) => node[key], current));
  }
  if (stableJson(current) !== stableJson(expected)) {
    throw new StoryEncodingError("world-event fields cannot change identity or layout");
  }
}

export function validateWorldEventFieldOverrides(original, overrides) {
  const source = worldEventAsset(original);
  const descriptions = worldEventFieldDescriptions(source);
  const byKey = new Map(descriptions.map(field =>
    [`${field.entityHandle}:${field.fieldName}`, field]));
  const expected = structuredClone(source);
  for (const override of overrides || []) {
    const field = byKey.get(`${override.entity_handle}:${override.field_name}`);
    if (!field) throw new StoryEncodingError("world-event field identity invalid");
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] = override.value;
  }
  validateWorldEventAsset(expected, source);
}

export function encodeWorldEventFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields || []) {
    const key = `${field.entityHandle}:${field.fieldName}`;
    if (field.resourceId !== WORLD_EVENT_OWNER || values.has(key)) {
      throw new StoryEncodingError("world-event field identity invalid or repeated");
    }
    values.set(key, defaults ? field.defaultValue : field.value);
  }
  // The complete shape is taken from the field set itself; every published
  // world-event byte must be present before serialization.
  if (values.size !== fields.length || fields.length === 0) {
    throw new StoryEncodingError("world-event field batch is empty");
  }
  const count = Math.max(...fields.map(field => Number(field.recordId))) + 1;
  const payload = new Uint8Array(count * WORLD_EVENT_FIELDS.length);
  for (const field of fields) {
    const column = WORLD_EVENT_FIELDS.indexOf(field.fieldName);
    if (column < 0 || !Number.isInteger(field.recordId) || field.recordId < 0
        || field.recordId >= count || !Number.isInteger(values.get(`${field.entityHandle}:${field.fieldName}`))
        || values.get(`${field.entityHandle}:${field.fieldName}`) < 0
        || values.get(`${field.entityHandle}:${field.fieldName}`) > 0xff) {
      throw new StoryEncodingError("world-event field value invalid");
    }
    payload[column * count + field.recordId] = values.get(`${field.entityHandle}:${field.fieldName}`);
  }
  if (fields.length !== count * WORLD_EVENT_FIELDS.length) {
    throw new StoryEncodingError("world-event field batch does not cover the published table");
  }
  return [{fragment_id: storyComponentIds(WORLD_EVENT_OWNER)[0], payload, relocations: []}];
}

const STORY_SCRIPT_RESOURCES = Object.freeze([
  "story-autonomous-script",
  "story-interaction-script",
]);

function storyScriptAsset(document, resourceId) {
  const asset = document?.document && document.resource_id === undefined
    ? document.document : document;
  validateStoryAsset(asset, resourceId);
  if (!STORY_SCRIPT_RESOURCES.includes(resourceId)) {
    throw new StoryEncodingError(`not a script Story resource: ${resourceId}`);
  }
  return asset;
}

const storyScriptHandle = (resourceId, scriptId) =>
  `${resourceId}:script:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;

/** 一个脚本一个数组字段（约束第 13 条：脚本是流里的一段连续字节）。 */
export function storyScriptFieldDescriptions(document, resourceId) {
  const asset = storyScriptAsset(document, resourceId);
  const streamOffsets = new Map();
  let cursor = 0;
  for (const scriptId of asset.stream_order) {
    const script = asset.scripts.find(row => row.id === scriptId);
    if (!script) throw new StoryEncodingError("Story script stream order references an unknown script");
    streamOffsets.set(scriptId, cursor);
    cursor += script.bytecode.length;
  }
  const poolFragmentId = storyComponentIds(resourceId)[1];
  const fields = asset.scripts.map((script, position) => ({
    resourceId,
    entityHandle: storyScriptHandle(resourceId, script.id),
    recordId: script.id,
    fieldName: "bytecode",
    defaultValue: [...script.bytecode],
    documentPath: ["scripts", position, "bytecode"],
    assetPath: ["scripts", position, "bytecode"],
    fragmentId: poolFragmentId,
    offsetInFragment: streamOffsets.get(script.id),
    byteLength: script.bytecode.length,
    workingFormat: SPARSE_ARRAY_FORMAT,
    scriptLength: script.bytecode.length,
    pointerCount: asset.pointer_count,
    firstValidId: asset.first_valid_id,
    streamOrder: [...asset.stream_order],
    ...(asset.layout ? {scriptLayout: asset.layout} : {}),
  }));
  if (asset.layout) fields.push({resourceId,
    entityHandle: `${resourceId}:pool`, fieldName: "sequence", defaultValue: asset.sequence,
    documentPath: ["sequence"], assetPath: ["sequence"], fragmentId: poolFragmentId,
    offsetInFragment: 0, byteLength: asset.layout.capacity, scriptLayout: asset.layout,
    pointerCount: asset.pointer_count, firstValidId: asset.first_valid_id, streamOrder: [...asset.stream_order]});
  if (asset.farjump) for (const field of fields) field.farjump = asset.farjump;
  return fields;
}

/** 一个脚本一个字段对象：一行是该脚本，列是它的字节数组。 */
export function storyScriptObjects(document, resourceId) {
  return storyScriptFieldDescriptions(document, resourceId).map(field => ({
    id: field.entityHandle,
    label: `动作脚本 · ${field.entityHandle}`,
    fragmentIds: [field.fragmentId],
    fields: [[field.entityHandle, field.fieldName]],
    ...(field.fieldName === "sequence" ? {} : {editor: {kind: "numeric-table", rows: [field.entityHandle], rowLabels: [field.entityHandle],
      columns: [{name: field.fieldName, label: "脚本字节（逗号分隔）", array: true,
        length: field.byteLength, min: 0, max: 0xff}]}}),
  }));
}

export function validateStoryScriptFieldOverrides(original, overrides) {
  const source = storyScriptAsset(original, original?.resource_id);
  const descriptions = storyScriptFieldDescriptions(source, source.resource_id);
  const byKey = new Map(descriptions.map(field =>
    [`${field.entityHandle}:${field.fieldName}`, field]));
  const expected = structuredClone(source);
  for (const override of overrides || []) {
    const field = byKey.get(`${override.entity_handle}:${override.field_name}`);
    if (!field) throw new StoryEncodingError("Story script field identity invalid");
    const path = field.documentPath;
    // 数组字段的 Working 以稀疏条目存放：按字段的存储格式还原成完整数组再落到文档上。
    path.slice(0, -1).reduce((node, key) => node[key], expected)[path.at(-1)] =
      fieldStoredValue(field, override.value);
  }
  const current = storyScriptAsset(expected, source.resource_id);
  if (current.layout) assembleStoryScriptLayout(current);
  // validateStoryAsset above checks every byte and all pointer/stream identity.
  if (stableJson(current) !== stableJson(expected)) {
    throw new StoryEncodingError("Story script fields changed identity or layout");
  }
}

export function encodeStoryScriptFields(fields, {defaults = false} = {}) {
  if (!Array.isArray(fields) || !fields.length) {
    throw new StoryEncodingError("Story script field batch is empty");
  }
  const resourceId = fields[0].resourceId;
  if (!STORY_SCRIPT_RESOURCES.includes(resourceId)) {
    throw new StoryEncodingError("Story script field owner is invalid");
  }
  const [pointerFragmentId, poolFragmentId] = storyComponentIds(resourceId);
  const first = fields[0];
  const {pointerCount, firstValidId, streamOrder} = first;
  const byScript = new Map();
  const sequenceField = fields.find(field => field.fieldName === "sequence");
  for (const field of fields.filter(field => field.fieldName !== "sequence")) {
    const key = field.entityHandle;
    if (field.resourceId !== resourceId || field.fieldName !== "bytecode" || byScript.has(key)
        || !Number.isInteger(field.recordId) || !Number.isInteger(field.scriptLength)
        || !Number.isInteger(field.pointerCount) || !Number.isInteger(field.firstValidId)
        || !Array.isArray(field.streamOrder)
        || field.pointerCount !== pointerCount || field.firstValidId !== firstValidId
        || field.streamOrder.length !== streamOrder.length
        || field.streamOrder.some((id, index) => id !== streamOrder[index])) {
      throw new StoryEncodingError("Story script field identity or metadata invalid");
    }
    const value = defaults ? field.defaultValue : field.value;
    if (!Array.isArray(value) || value.length !== field.scriptLength
        || value.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 0xff)) {
      throw new StoryEncodingError("Story script field bytes invalid");
    }
    byScript.set(key, {...field, bytes: value});
  }
  const pool = [];
  const offsets = new Map();
  for (const scriptId of streamOrder) {
    const script = byScript.get(storyScriptHandle(resourceId, scriptId));
    if (!script) throw new StoryEncodingError("Story script field batch is incomplete");
    offsets.set(scriptId, pool.length);
    pool.push(...script.bytes);
  }
  if (byScript.size !== streamOrder.length) {
    throw new StoryEncodingError("Story script field batch has unknown scripts");
  }
  let entries = offsets;
  let payload = Uint8Array.from(pool);
  let omittedScripts = [];
  let remotePages = [];
  if (sequenceField) {
    const current = {layout: sequenceField.scriptLayout, sequence: defaults ? sequenceField.defaultValue : sequenceField.value,
      farjump: first.farjump, stream_order: streamOrder,
      scripts: [...byScript.values()].map(field => ({id: field.recordId, bytecode: field.bytes}))};
    const origin = {...current, sequence: sequenceField.defaultValue,
      scripts: [...byScript.values()].map(field => ({id: field.recordId, bytecode: field.defaultValue}))};
    const plan = storyScriptWritePlan(current, {originAsset: origin});
    if (current.farjump?.enabled) {
      const original = assembleStoryScriptLayout(origin, {virtualPages: true});
      payload = original.bytes;
      entries = original.entries;
      remotePages = plan.remoteScripts.map(page => ({script_id: page.scriptId,
        payload: page.payload, instruction_boundaries: page.signature.map(command => command.cursor)}));
      omittedScripts = plan.drafts.map(page => ({script_id: page.scriptId,
        handle: storyScriptHandle(resourceId, page.scriptId), reason: page.reason,
        overflow_bytes: Math.max(0, page.length - 256)}));
    } else {
      const omitted = new Set(plan.omittedScriptIds);
      // 共用字节组可能跨越数组字段，整组恢复而不留下半条 Working 指令。
      const omittedGroups = current.layout.groups.filter(group => omitted.has(group.script_id));
      const defaultPool = streamOrder.flatMap(id => byScript.get(storyScriptHandle(resourceId, id)).defaultValue);
      for (const group of omittedGroups) pool.splice(group.offset, group.length,
        ...defaultPool.slice(group.offset, group.offset + group.length));
      let cursor = 0;
      current.scripts = streamOrder.map(id => {
        const field = byScript.get(storyScriptHandle(resourceId, id));
        const bytecode = omitted.has(id) ? field.defaultValue : pool.slice(cursor, cursor + field.scriptLength);
        cursor += field.scriptLength;
        return {id, bytecode};
      });
      const assembled = assembleStoryScriptLayout(current, {sequence: plan.sequence, requireCapacity: true});
      payload = assembled.bytes;
      entries = assembled.entries;
      omittedScripts = plan.omittedScriptIds.map(scriptId => ({
        script_id: scriptId, handle: storyScriptHandle(resourceId, scriptId),
        reason: "容量不足", overflow_bytes: plan.overflowBytes,
      }));
    }
  }
  const pointer = new Uint8Array((pointerCount - firstValidId) * 2);
  const relocations = [...entries.keys()].sort((left, right) => left - right).map(scriptId => ({
    offset: (scriptId - firstValidId) * 2,
    target_fragment_id: poolFragmentId,
    target_offset: entries.get(scriptId),
    addend: 0,
  }));
  return [
    {fragment_id: pointerFragmentId, payload: pointer, relocations,
      ...(first.farjump?.enabled ? {remote_pages: remotePages} : {})},
    {fragment_id: poolFragmentId, payload, relocations: [], ...(omittedScripts.length ? {omitted_scripts: omittedScripts} : {})},
  ];
}

/** Python canonical_json_bytes(asset) parity for bundle input identity. */
export async function storyAssetInputSha256(value) {
  const asset = validateStoryAsset(value);
  return sha256Hex(new TextEncoder().encode(stableJson(asset)));
}
