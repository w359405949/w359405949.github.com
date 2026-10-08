// @editor-module 把固定文本记录接入 AssetCompiler，按绑定生成逻辑片段。
// Fixed text records enter the existing AssetCompiler/RomLinker pipeline here.
// Only binding sources provide placement; record IDs are the fragment IDs.
import {BUNDLE_SCHEMA, sha256Hex} from "./rom-linker.js";
import {canonicalJsonEqual, canonicalJsonStringify, isPlainJsonObject} from "./project-store-values.js";
import {CHARACTER_MAP_RESOURCE_ID, requireCharacterMapAsset} from "./character-map-project.js";
import {SPARSE_ARRAY_FORMAT, validateFieldOverrides} from "./field-codec.js";
import {textRecordStructureFields} from './text-record-structure.js';
import {
  requireTextRecordsDocument, textRecordRuntimeWritableRanges, validateFixedTextRecordAsset,
  TEXT_RECORDS_RESOURCE_ID, TEXT_RECORDS_ASSET_SCHEMA,
} from "./text-record-project.js";

export const FIXED_TEXT_COMPILER_ID = "fixed-text/v1";
const FIXED_TEXT_COMPONENT_CODEC = "metalmaxcn.fixed-text-record";

function requireValue(condition, message) {
  if (!condition) throw new TypeError(`fixed-text: ${message}`);
}

function exactObject(value, fields, label) {
  requireValue(isPlainJsonObject(value)
    && canonicalJsonEqual(Object.keys(value).sort(), [...fields].sort()), `${label} shape mismatch`);
  return value;
}

export function fixedTextInputLength(input) {
  exactObject(input, ["resource_id", "asset_schema", "components"], "input");
  requireValue(input.resource_id === TEXT_RECORDS_RESOURCE_ID
    && input.asset_schema === TEXT_RECORDS_ASSET_SCHEMA, "asset identity/schema mismatch");
  requireValue(Array.isArray(input.components) && input.components.length > 0, "empty components");
  const seen = new Set();
  let cursor = 0;
  for (const raw of input.components) {
    const component = exactObject(raw,
      ["fragment_id", "asset_offset", "length", "original_sha256"], "component");
    requireValue(/^record:[0-9A-F]{2}:[0-9]{3}$/u.test(component.fragment_id)
      && !seen.has(component.fragment_id), "duplicate/invalid record ID");
    requireValue(Number.isSafeInteger(component.length) && component.length > 0
      && component.asset_offset === cursor, "components must form a compact fixed-capacity image");
    requireValue(typeof component.original_sha256 === "string"
      && /^[0-9a-f]{64}$/u.test(component.original_sha256), "invalid component preimage hash");
    seen.add(component.fragment_id);
    cursor += component.length;
    requireValue(Number.isSafeInteger(cursor), "component image exceeds safe integer size");
  }
  return cursor;
}

export function fixedTextInput(binding) {
  requireValue(binding.compiler_id === FIXED_TEXT_COMPILER_ID
    && binding.asset_id === TEXT_RECORDS_RESOURCE_ID, "binding identity mismatch");
  const cursor = fixedTextInputLength(binding.input);
  requireValue(cursor === binding.source_length, "source length mismatch");
  return binding.input;
}

export function fixedTextDocumentScopes(document_) {
  requireTextRecordsDocument(document_);
  return Object.keys(document_.records).map(recordId => ({
    path: ['records', recordId], describeOptions: {recordId},
  }));
}

export function fixedTextFieldScope(document_, recordId) {
  if (!Object.hasOwn(document_.records, recordId)) throw new TypeError(`未发布文字记录：${recordId}`);
  return {recordId};
}

export function fixedTextFieldDescriptions(document_, {recordId} = {}) {
  requireTextRecordsDocument(document_);
  const records = recordId === undefined ? Object.values(document_.records)
    : [document_.records[fixedTextFieldScope(document_, recordId).recordId]];
  return records.map(record => ({
    resourceId: TEXT_RECORDS_RESOURCE_ID, entityHandle: record.node_id, fieldName: "bytes",
    documentPath: ["records", record.node_id, "bytes"], recordId: record.node_id,
    defaultValue: record.bytes, workingFormat: SPARSE_ARRAY_FORMAT,
    editableRanges: [...(record.editable ? textRecordRuntimeWritableRanges(record) : []),
      ...textRecordStructureFields(document_, record.node_id).map(({offset, length}) => ({offset, length}))],
    fragmentId: record.node_id, offsetInFragment: 0, byteLength: record.capacity,
  }));
}

/**
 * 一条文字记录一个字段对象（约束第 13 条：记录本身就是它独占的片段）。
 * 值是该记录的字节数组，按数组列承载（约束第 84 轮裁定：不逐字节铺开）。
 */
export function fixedTextObjects(document) {
  return fixedTextFieldDescriptions(document).map(field => ({
    id: field.entityHandle,
    label: `文字记录 · ${field.entityHandle}`,
    fragmentIds: [field.fragmentId],
    fields: [[field.entityHandle, field.fieldName]],
    editor: {kind: "numeric-table", rows: [field.entityHandle], rowLabels: [field.entityHandle],
      columns: [{name: field.fieldName, label: "记录字节（逗号分隔）", array: true,
        length: field.byteLength, min: 0, max: 0xff}]},
  }));
}

/** 一条文字记录一个字段对象、独占一个片段：Working 值就是该记录的字节。 */
export function serializeFixedTextField(field) {
  const bytes = field?.value;
  requireValue(field?.resourceId === TEXT_RECORDS_RESOURCE_ID && field.fieldName === "bytes"
    && field.entityHandle === field.recordId
    && Array.isArray(bytes) && bytes.length === field.defaultValue.length
    && bytes.every(value => Number.isInteger(value) && value >= 0 && value <= 255),
  "文字记录字段身份或值无效");
  return Uint8Array.from(bytes);
}

export function validateFixedTextFieldOverrides(original, overrides, dependencies) {
  const font = dependencies?.[CHARACTER_MAP_RESOURCE_ID];
  requireCharacterMapAsset(font);
  validateFieldOverrides(original, overrides, fixedTextFieldDescriptions,
    (candidate, before) => validateFixedTextRecordAsset(candidate, before, font.document));
}

export function encodeFixedTextFields(fields, {defaults = false} = {}) {
  const payloads = new Map();
  for (const field of fields) {
    const bytes = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === TEXT_RECORDS_RESOURCE_ID && field.fieldName === "bytes"
      && field.entityHandle === field.recordId && !payloads.has(field.recordId)
      && Array.isArray(bytes) && bytes.length === field.defaultValue.length
      && bytes.every(value => Number.isInteger(value) && value >= 0 && value <= 255), "invalid record field");
    payloads.set(field.recordId, Uint8Array.from(bytes));
  }
  return payloads;
}

export async function compileFixedTextFields(context, bindings,
  {onProgress = null, writeback = null} = {}) {
  requireValue(bindings.length === 1, "requires exactly one text-record binding");
  const binding = bindings[0];
  const input = fixedTextInput(binding);
  const repository = context.repository;
  requireValue(typeof repository?.getManifest === "function"
    && typeof repository?.getOriginal === "function", "repository lacks Original/field access");
  const database = context.fieldDb || (await import("./project-db.js")).db;
  const revisionId = (await repository.getManifest()).active_original_revision_id;
  const snapshot = await database.readBuildFields(TEXT_RECORDS_RESOURCE_ID, repository, revisionId);
  requireValue(typeof revisionId === "string" && revisionId.length > 0, "effective revision is missing");
  const [original, font] = await Promise.all([
    repository.getOriginal(TEXT_RECORDS_RESOURCE_ID, {revisionId}),
    repository.getOriginal(CHARACTER_MAP_RESOURCE_ID, {revisionId}),
  ]);
  requireValue(original?.revision_id === revisionId && font?.revision_id === revisionId,
    "Original/font revision mismatch");
  requireCharacterMapAsset(font.value);
  const payloads = encodeFixedTextFields(snapshot.fields);
  const expectedIds = [...payloads.keys()].sort();
  requireValue(canonicalJsonEqual(input.components.map(component => component.fragment_id).sort(), expectedIds),
    "binding must cover the exact record set; unbound edits must not disappear");
  requireValue(Array.isArray(binding.sources) && binding.sources.length === input.components.length,
    "each record must map to exactly one source");
  const sources = new Map();
  const slotIds = new Set();
  for (const source of binding.sources) {
    requireValue(!sources.has(source.asset_offset) && !slotIds.has(source.slot_id),
      "duplicate component source/slot; shared bytes require owner publication");
    sources.set(source.asset_offset, source);
    slotIds.add(source.slot_id);
  }
  const physicalRanges = [];
  const componentSources = new Map();
  for (const component of input.components) {
    const source = sources.get(component.asset_offset);
    const slot = source && context.slots.get(source.slot_id);
    const payload = payloads.get(component.fragment_id);
    const field = snapshot.fields.find(value => value.recordId === component.fragment_id);
    const physical = field?.physical;
    requireValue(physical?.binding.asset_id === TEXT_RECORDS_RESOURCE_ID
      && canonicalJsonEqual(physical.component, component)
      && ["asset_offset", "file_offset", "slot_id", "offset_in_slot", "length"].every(key => physical.source[key] === source?.[key])
      && physical.slot.slot_id === slot?.slot_id, "field physical source differs from build binding");
    requireValue(payload.length === component.length && source?.length === component.length
      && source.offset_in_slot === 0 && slot?.capacity === component.length
      && slot.owner === TEXT_RECORDS_RESOURCE_ID && slot.file_offset === source.file_offset
      && !slot.alias_of && !slot.mirror_of, `${component.fragment_id}: source escapes its exact owner slot`);
    requireValue(Number.isSafeInteger(source.file_offset) && source.file_offset >= 0
      && source.file_offset + component.length <= context.baseline.length, "source escapes baseline");
    physicalRanges.push([source.file_offset, source.file_offset + component.length]);
    const baseline = context.baseline.subarray(source.file_offset, source.file_offset + component.length);
    const before = original.value.document.records[component.fragment_id].bytes;
    requireValue(before.every((byte, index) => byte === baseline[index])
      && await sha256Hex(baseline) === component.original_sha256,
    `${component.fragment_id}: Original/binding/baseline disagreement`);
    componentSources.set(component.fragment_id, source);
  }
  physicalRanges.sort((left, right) => left[0] - right[0]);
  requireValue(physicalRanges.every((range, index) => index === 0 || range[0] >= physicalRanges[index - 1][1]),
    "record slots overlap; shared bytes require owner publication");
  const fragments = [];
  let changed = false;
  if (writeback?.perFieldObjectIds([binding]).has(TEXT_RECORDS_RESOURCE_ID)) {
    // 只发被编辑且有许可的记录片段；未编辑的记录不重写（合同 3.3）。
    const working = await writeback.workingFieldFragments({database, resourceId: TEXT_RECORDS_RESOURCE_ID,
      componentSources, baseline: context.baseline, codec: FIXED_TEXT_COMPONENT_CODEC, codecVersion: "1",
      workingResourceIds: await writeback.workingFieldResourceIds(context.repository)});
    fragments.push(...working.fragments);
    changed = working.changed;
  } else for (const component of input.components) {
    const source = componentSources.get(component.fragment_id);
    const payload = payloads.get(component.fragment_id);
    const baseline = context.baseline.subarray(source.file_offset, source.file_offset + component.length);
    changed ||= payload.some((byte, index) => byte !== baseline[index]);
    fragments.push({asset_id: TEXT_RECORDS_RESOURCE_ID, fragment_id: component.fragment_id,
      slot_id: source.slot_id, payload, payload_sha256: await sha256Hex(payload),
      codec: FIXED_TEXT_COMPONENT_CODEC, codec_version: "1", alignment: 1, relocations: []});
  }
  const inputSha256 = await sha256Hex(new TextEncoder().encode(canonicalJsonStringify(
    snapshot.fields.map(field => [field.key, field.value]))));
  await snapshot.assertCurrent();
  if (onProgress) await onProgress({stage: "compile", event_type: "asset-compiled",
    status: changed ? "success" : "skipped-clean", asset_id: TEXT_RECORDS_RESOURCE_ID,
    encoder: FIXED_TEXT_COMPILER_ID, input_sha256: inputSha256,
    message: `${fragments.length} fixed text record fragment(s)`});
  return {compiler_id: FIXED_TEXT_COMPILER_ID, compiled_asset_ids: [TEXT_RECORDS_RESOURCE_ID],
    changed_asset_ids: changed ? [TEXT_RECORDS_RESOURCE_ID] : [],
    bundles: [{schema: BUNDLE_SCHEMA, asset_id: TEXT_RECORDS_RESOURCE_ID,
      encoder: FIXED_TEXT_COMPILER_ID, encoder_version: "1", input_sha256: inputSha256, fragments}]};
}
