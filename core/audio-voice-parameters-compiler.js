// @editor-module 编码音色 owner 的固定包络入口表，只接受已发布入口，不持有 ROM 地址。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
export const AUDIO_VOICE_COMPILER_ID = "audio-voice-parameters/v1";
export const AUDIO_VOICE_COMPONENT_CODEC = "metalmaxcn.audio-voice-parameter";
const OWNER = "audio-voice";
const FIELDS = ["envelope_pointer_low", "envelope_pointer_high"];
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function audioVoiceComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown audio voice owner");
  return [{fragmentId: `${OWNER}.envelope-pointers`, length: 32}];
}
export function audioVoiceAssetSchema(resourceId) {
  audioVoiceComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateAudioVoiceAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === audioVoiceAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === audioVoiceAssetSchema(OWNER), "audio voice identity/policy drift");
    requireValue(doc.record_count === 16 && doc.owned_byte_count === 32
      && Array.isArray(doc.records) && doc.records.length === 16, "expected 16 audio voice pointers");
    doc.records.forEach((row, index) => {
      requireValue(row.id === index && row.handle === `audio-voice:${index.toString(16).toUpperCase().padStart(2, "0")}`,
        "audio voice identity/order drift");
      requireValue(FIELDS.every(field => Number.isInteger(row[field]) && row[field] >= 0 && row[field] <= 255),
        "音色包络指针字段必须为字节");
    });
  }
  const pointerKey = row => FIELDS.map(field => row[field]).join(":");
  const targets = new Set(original.document.records.map(pointerKey));
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    requireValue(targets.has(pointerKey(row)), "音色目标必须是已发布的包络入口");
    for (const field of FIELDS) {
      expected.document.records[index][field] = row[field];
    }
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改音色包络入口，身份和布局不可修改");
}

export function audioVoiceFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER && document.records?.length === 16, "audio voice field collection drift");
  const seen = new Set();
  return document.records.flatMap((row, index) => {
    requireValue(Number.isInteger(row.id) && row.id >= 0 && row.id < 16
      && row.handle === `${OWNER}:${row.id.toString(16).toUpperCase().padStart(2, "0")}`
      && !seen.has(row.id), "audio voice field identity drift");
    seen.add(row.id);
    return FIELDS.map((fieldName, column) => ({resourceId: OWNER, entityHandle: row.handle, fieldName,
      documentPath: ["records", index, fieldName], defaultValue: row[fieldName],
      fragmentId: audioVoiceComponentSpecs(OWNER)[0].fragmentId, offsetInFragment: row.id * 2 + column, byteLength: 1}));
  });
}
export function validateAudioVoiceFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, audioVoiceFieldDescriptions, validateAudioVoiceAsset);
}
export function encodeAudioVoiceFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(32), seen = new Set();
  for (const field of fields) {
    const match = /^audio-voice:([0-9A-F]{2})$/u.exec(field.entityHandle), column = FIELDS.indexOf(field.fieldName);
    const id = match ? Number.parseInt(match[1], 16) : -1, value = defaults ? field.defaultValue : field.value;
    const index = id * 2 + column;
    requireValue(field.resourceId === OWNER && id >= 0 && id < 16 && column >= 0 && !seen.has(index)
      && Number.isInteger(value) && value >= 0 && value <= 255, "audio voice build field identity/value drift");
    seen.add(index); payload[index] = value;
  }
  requireValue(seen.size === 32, "audio voice build fields incomplete");
  return [{fragment_id: audioVoiceComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}

function voiceFieldOffset(field) {
  const match = /^audio-voice:([0-9A-F]{2})$/u.exec(field.entityHandle), column = FIELDS.indexOf(field.fieldName);
  const id = match ? Number.parseInt(match[1], 16) : -1;
  requireValue(field.resourceId === OWNER && id >= 0 && id < 16 && column >= 0,
    "audio voice build field identity/value drift");
  return id * 2 + column;
}

export function audioVoiceObjects(document) {
  const handles = [...new Set(audioVoiceFieldDescriptions(document).map(field => field.entityHandle))];
  return [{id: `${OWNER}.envelope-pointers`, label: "音色包络入口", fragmentIds: [`${OWNER}.envelope-pointers`],
    fields: audioVoiceFieldDescriptions(document).map(field => [field.entityHandle, field.fieldName]),
    // 低字节在前，一个入口就是一个 u16 指针；候选是已发布音色表里的入口。
    editor: {kind: "numeric-table", rows: handles, rowLabels: handles,
      columns: [{name: "envelope_pointer", label: "包络程序入口",
        semantic: {kind: "reference", targetModule: "audio-sequence"},
        linked: {fields: ["envelope_pointer_low", "envelope_pointer_high"], littleEndian: true},
        candidates: {resourceId: "audio-sequence", documentPath: ["voice_table"],
          value: ["pointer"], label: ["id_hex", "pointer_hex"]}}]}}];
}

export function serializeAudioVoiceField(field) {
  voiceFieldOffset(field);
  const value = field.value;
  requireValue(Number.isInteger(value) && value >= 0 && value <= 255, "audio voice build field identity/value drift");
  return new Uint8Array([value]);
}

export function validateAudioVoicePreimage(fields, fragmentId, baseline) {
  requireValue(fragmentId === `${OWNER}.envelope-pointers` && baseline.length === 32 && fields.length === 32,
    "audio voice Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const offset = voiceFieldOffset(field);
    requireValue(!seen.has(offset) && baseline[offset] === field.defaultValue,
      "audio voice Origin differs from bound baseline");
    seen.add(offset);
  }
}
