// @editor-module 条件音频固定表的引用域校验和逻辑片段编码。
import {canonicalJsonEqual} from "./project-store-values.js";
export const CONDITIONAL_AUDIO_COMPILER_ID = "conditional-audio/v1";
export const CONDITIONAL_AUDIO_COMPONENT_CODEC = "metalmaxcn.conditional-audio";
const OWNER = "field-scene-lifecycle-service";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function conditionalAudioComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown conditional audio owner");
  return [{fragmentId: `${OWNER}.remap-private-tables`, length: 27},
    {fragmentId: `${OWNER}.scene-remap-table`, length: 9}];
}
export function conditionalAudioAssetSchema(resourceId) {
  conditionalAudioComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
// Complete-candidate validation remains separate from serialization. Only
// encodeConditionalAudioFields emits bytes, from the shared field instances.
function validateConditionalAudioAsset(asset, original) {
  const fields = original?.document?.conditional_audio_fields;
  requireValue(Array.isArray(fields) && fields.length === 27, "缺少条件音频字段许可");
  const expected = structuredClone(original);
  const offsets = new Set();
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === conditionalAudioAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === conditionalAudioAssetSchema(OWNER), "conditional audio identity/policy drift");
    requireValue(Array.isArray(doc.records) && doc.records.length >= 9, "缺少条件音频记录");
    for (const field of fields) {
      const row = doc.records[field.priority_index], domain = field.semantic_edit_domain;
      requireValue(field.web_editable === true && field.length === 1 && domain?.status === "confirmed"
        && Number.isInteger(field.offset) && field.offset >= 0 && field.offset < 27
        && Number.isInteger(field.priority_index) && field.priority_index >= 0 && field.priority_index < 9
        && Array.isArray(domain.allowed_reference_values) && Array.isArray(domain.allowed_raw_values)
        && domain.allowed_reference_values.length === domain.allowed_raw_values.length,
      "条件音频字段许可无效");
      requireValue(row?.handle === field.record_handle && row.kind === "conditional-audio", "条件音频行身份或顺序改变");
      const index = domain.allowed_reference_values.indexOf(row[field.record_field]);
      requireValue(index >= 0, "条件音频引用超出已发布域");
      const raw = domain.allowed_raw_values[index];
      requireValue(Number.isInteger(raw) && raw >= 0 && raw <= 255, "条件音频值不是字节");
      if (candidate === asset) {
        offsets.add(field.offset);
        expected.document.records[field.priority_index][field.record_field] = row[field.record_field];
      }
    }
    requireValue(canonicalJsonEqual(doc.conditional_audio_fields, fields), "条件音频字段许可被修改");
  }
  requireValue(offsets.size === 27, "条件音频字段位置重复");
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改条件音频的 27 个引用字段");
  conditionalAudioFieldDescriptions(asset.document);
}

// The record handle is published by the owner. priority_index is an execution
// order/codec locator, never a field's identity or its current array position.
export function conditionalAudioFieldDescriptions(document) {
  const declarations = document?.conditional_audio_fields;
  requireValue(document?.module_id === OWNER && Array.isArray(declarations)
    && declarations.length === 27 && Array.isArray(document.records), "缺少条件音频字段许可");
  const handles = new Map();
  document.records.forEach((row, index) => {
    requireValue(!handles.has(row.handle), "条件音频行身份重复");
    handles.set(row.handle, index);
  });
  const identities = new Set(), offsets = new Set();
  return declarations.map(field => {
    const index = handles.get(field.record_handle), domain = field.semantic_edit_domain;
    const key = JSON.stringify([field.record_handle, field.record_field]);
    requireValue(typeof field.record_handle === "string" && typeof field.record_field === "string"
      && index !== undefined && document.records[index].kind === "conditional-audio"
      && field.web_editable === true && field.length === 1 && domain?.status === "confirmed"
      && Number.isInteger(field.offset) && field.offset >= 0 && field.offset < 27
      && Number.isInteger(field.priority_index) && field.priority_index >= 0 && field.priority_index < 9
      && !identities.has(key) && !offsets.has(field.offset)
      && Array.isArray(domain.allowed_reference_values) && Array.isArray(domain.allowed_raw_values)
      && domain.allowed_reference_values.length > 0
      && domain.allowed_reference_values.length === domain.allowed_raw_values.length,
    "条件音频字段许可或身份无效");
    identities.add(key); offsets.add(field.offset);
    return {resourceId: OWNER, entityHandle: field.record_handle, fieldName: field.record_field,
      documentPath: ["records", index, field.record_field],
      defaultValue: document.records[index][field.record_field],
      fragmentId: conditionalAudioComponentSpecs(OWNER)[0].fragmentId,
      offsetInFragment: field.offset, byteLength: 1,
      serialization: {offset: field.offset, references: domain.allowed_reference_values,
        rawValues: domain.allowed_raw_values}};
  });
}

export function validateConditionalAudioFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(conditionalAudioFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    requireValue(row.resource_id === OWNER && field && !seen.has(key), "条件音频覆盖身份无效");
    seen.add(key);
    candidate.document.records[field.documentPath[1]][field.fieldName] = row.value;
  }
  // Preserve the existing complete-candidate checks, including all protected
  // lifecycle rows and immutable domain declarations.
  validateConditionalAudioAsset(candidate, original);
}

function encodeValues(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(27), seen = new Set(), identities = new Set();
  for (const field of fields) {
    const codec = field.serialization, key = JSON.stringify([field.entityHandle, field.fieldName]);
    requireValue(field.resourceId === OWNER && typeof field.entityHandle === "string"
      && typeof field.fieldName === "string" && !identities.has(key)
      && Number.isInteger(codec?.offset) && codec.offset >= 0 && codec.offset < 27
      && !seen.has(codec.offset), "条件音频序列化字段身份无效");
    const value = defaults ? field.defaultValue : field.value;
    const index = codec.references.indexOf(value), raw = codec.rawValues[index];
    requireValue(index >= 0 && Number.isInteger(raw) && raw >= 0 && raw <= 255,
      "条件音频引用超出已发布域");
    seen.add(codec.offset); identities.add(key); payload[codec.offset] = raw;
  }
  requireValue(seen.size === 27, "条件音频序列化字段不完整");
  return [{fragment_id: conditionalAudioComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}

export const encodeConditionalAudioFields = encodeValues;


export function conditionalAudioObjects(document) {
  conditionalAudioFieldDescriptions(document);
  const references = [
    ["scene_reference", "场景", "scene-header-map", 0],
    ["global_event_flag_reference", "事件位", "global-event-flag", 9],
    ["audio_command_reference", "音频命令", "audio-command", 18],
  ];
  for (const [name, , , domainIndex] of references) {
    const domain = document.conditional_audio_fields[domainIndex];
    requireValue(domain?.record_field === name && document.conditional_audio_fields
      .filter(field => field.record_field === name)
      .every(field => canonicalJsonEqual(field.semantic_edit_domain.allowed_reference_values,
        domain.semantic_edit_domain.allowed_reference_values)),
    `条件音频 ${name} 候选域不一致`);
  }
  return [{id: `${OWNER}.remap-private-tables`, label: "条件音频",
    fragmentIds: [`${OWNER}.remap-private-tables`],
    fields: document.conditional_audio_fields.map(field => [field.record_handle, field.record_field]),
    editor: {kind: "reference-table",
      rows: document.records.slice(0, 9).map(row => row.handle),
      columns: references.map(([name, label, targetModule, domainIndex]) => ({
        name, label, semantic: {kind: "reference", targetModule, picker: "generic"}, candidates: {
          resourceId: OWNER,
          documentPath: ["conditional_audio_fields", domainIndex,
            "semantic_edit_domain", "allowed_reference_values"],
          value: [], label: [],
        },
      })), protectedRows: document.records.slice(9)}}];
}

export function serializeConditionalAudioField(field) {
  const index = field.serialization.references.indexOf(field.value), raw = field.serialization.rawValues[index];
  requireValue(field.resourceId === OWNER && index >= 0 && Number.isInteger(raw) && raw >= 0 && raw <= 255,
    "条件音频字段值超出许可");
  return new Uint8Array([raw]);
}


export function validateConditionalAudioPreimage(fields, fragmentId, baseline) {
  requireValue(fragmentId === `${OWNER}.remap-private-tables` && baseline.length === 27, "条件音频原像长度或身份改变");
  for (const field of fields) {
    const codec = field.serialization, index = codec.references.indexOf(field.defaultValue);
    requireValue(index >= 0 && codec.rawValues[index] === baseline[codec.offset], "条件音频 Origin 与基线原像不同");
  }
}
