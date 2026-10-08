// @editor-module 序列化遭遇消息引用与四类候选权重。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";
import {byteTableFieldObjectCodec} from "./field-object.js";
export const ENCOUNTER_MESSAGE_COMPILER_ID = "encounter-message-parameters/v1";
export const ENCOUNTER_MESSAGE_COMPONENT_CODEC = "metalmaxcn.encounter-message-parameter";
const OWNER = "encounter-trigger-runtime";
const FIELDS = ["when_result_code_is_zero", "when_result_code_is_standard", "when_result_code_is_field_effect"];
const hex2 = value => value.toString(16).toUpperCase().padStart(2, "0");
const weightHandle = id => `${OWNER}:class:${hex2(id)}`;
const weightFragment = id => `${OWNER}.selection-weights.${hex2(id)}`;
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function encounterMessageComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown encounter message owner");
  return [{fragmentId: `${OWNER}.dispatch-result-parameter-table`, length: 15},
    ...Array.from({length: 4}, (_, id) => ({fragmentId: weightFragment(id), length: 14}))];
}
export function encounterMessageAssetSchema(resourceId) {
  encounterMessageComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
const messageCodec = byteTableFieldObjectCodec({resourceId: OWNER,
  fragmentId: encounterMessageComponentSpecs(OWNER)[0].fragmentId,
  fields: FIELDS.flatMap(name => Array.from({length: 5}, (_, context) => [`${OWNER}:context:${context}`, name]))});
const weightCodecs = Array.from({length: 4}, (_, id) => byteTableFieldObjectCodec({resourceId: OWNER,
  fragmentId: weightFragment(id), fields: Array.from({length: 14}, (_, slot) =>
    [weightHandle(id), `weight.${slot}`])}));
export const encounterMessageFieldObjectCodec = Object.freeze({
  serializeField: field => (field.entityHandle.includes(":class:")
    ? weightCodecs[Number.parseInt(field.entityHandle.split(":").at(-1), 16)] : messageCodec).serializeField(field),
  validatePreimage: (fields, id, baseline) => (weightCodecs.find(codec =>
    codec.objects()[0].id === id) || messageCodec).validatePreimage(fields, id, baseline),
});

const CONTEXT_LABELS = ["无结果消息", "标准结果消息", "字段效果消息"];
const CONTEXT_HANDLES = Array.from({length: 5}, (_, context) => `${OWNER}:context:${context}`);
// 三列都是 region 05 正文记录引用：候选取自已发布的文本文档，筛选 region 5。
const encounterMessageFieldObjectEditor = Object.freeze({
  label: "结果消息分派参数",
  rows: CONTEXT_HANDLES,
  rowLabels: CONTEXT_HANDLES.map((_, context) => `上下文 ${context}`),
  columns: FIELDS.map((name, column) => ({name, label: CONTEXT_LABELS[column],
    semantic: {kind: "text-record", targetModule: "text-record", region: 5},
    candidates: {document: "project.text-catalog", documentPath: ["records"],
      filter: {path: ["region"], values: [5]}, value: ["record"], label: ["node_id", "display_text"]}})),
});
export function encounterMessageObjects() {
  return [...messageCodec.objects().map(definition => ({...definition,
    label: encounterMessageFieldObjectEditor.label,
    editor: {kind: "reference-table", ...encounterMessageFieldObjectEditor}})),
  ...weightCodecs.flatMap((codec, id) => codec.objects().map(definition => ({...definition,
    label: `候选权重 · 类别 ${id}`, editor: {kind: "numeric-table", rows: [weightHandle(id)],
      rowLabels: [`类别 ${id}`], columns: Array.from({length: 14}, (_, slot) =>
        ({name: `weight.${slot}`, label: `槽 ${slot} 权重`, min: 0, max: 255}))}}))),
  {id: `${OWNER}.selection-algorithm`, label: "候选选择算法", fragmentIds: [],
    fields: [[`${OWNER}:selection`, "algorithm"]], editor: {kind: "numeric-table",
      rows: [`${OWNER}:selection`], columns: [{name: "algorithm", label: "选择算法", text: true}]}}];
}
function validateEncounterMessageAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === encounterMessageAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === encounterMessageAssetSchema(OWNER), "encounter message identity/policy drift");
    const allowed = doc.message_record_ids;
    requireValue(Array.isArray(allowed) && allowed.length > 0
      && allowed.every((v, i) => Number.isInteger(v) && v >= 0 && v <= 255 && (!i || v > allowed[i - 1])),
    "invalid published region-05 record identities");
    const rows = doc.views?.dispatch_result_parameters;
    requireValue(Array.isArray(rows) && rows.length === 5, "expected five encounter contexts");
    rows.forEach((row, index) => {
      requireValue(row.context_id === index, "encounter context identity/order drift");
      for (const field of FIELDS) requireValue(Number.isInteger(row[field]) && allowed.includes(row[field]),
        "消息必须引用已发布的 region 05 正文记录");
    });
    const profiles = doc.views.random_encounter_profile_families;
    requireValue(profiles?.length === 4 && profiles.every((profile, id) =>
      profile.profile_id === id && profile.selection_weights?.length === 14
      && profile.selection_weights.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
      && profile.selection_weights.reduce((sum, value) => sum + value, 0) > 0
      && profile.selection_weights.reduce((sum, value) => sum + value, 0) <= 255),
    "候选权重须为四类各 14 个字节，每类总和须为 1–255");
  }
  const expected = structuredClone(original);
  for (const field of FIELDS) asset.document.views.dispatch_result_parameters.forEach((row, index) => {
    expected.document.views.dispatch_result_parameters[index][field] = row[field];
  });
  asset.document.views.random_encounter_profile_families.forEach((profile, id) => {
    expected.document.views.random_encounter_profile_families[id].selection_weights = profile.selection_weights;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改遭遇消息引用与候选权重");
}

export function encounterMessageFieldDescriptions(document) {
  const rows = document?.views?.dispatch_result_parameters, seen = new Set();
  requireValue(document?.module_id === OWNER && rows?.length === 5, "encounter field collection drift");
  return rows.flatMap((row, index) => {
    requireValue(Number.isInteger(row.context_id) && row.context_id >= 0 && row.context_id < 5
      && !seen.has(row.context_id), "encounter field identity drift");
    seen.add(row.context_id);
    return FIELDS.map((fieldName, column) => ({resourceId: OWNER,
      entityHandle: `${OWNER}:context:${row.context_id}`, fieldName,
      documentPath: ["views", "dispatch_result_parameters", index, fieldName], defaultValue: row[fieldName],
      fragmentId: encounterMessageComponentSpecs(OWNER)[0].fragmentId,
      offsetInFragment: column * 5 + row.context_id, byteLength: 1}));
  }).concat(document.views.random_encounter_profile_families.flatMap((profile, id) => {
    requireValue(profile.profile_id === id && profile.selection_weights?.length === 14,
      "遇敌类别权重字段不完整");
    return profile.selection_weights.map((value, slot) => ({resourceId: OWNER,
      entityHandle: weightHandle(id), fieldName: `weight.${slot}`, defaultValue: value,
      documentPath: ["views", "random_encounter_profile_families", id, "selection_weights", slot],
      fragmentId: weightFragment(id), offsetInFragment: slot, byteLength: 1}));
  })).concat({resourceId: OWNER, entityHandle: `${OWNER}:selection`, fieldName: "algorithm",
    defaultValue: document.views.random_encounter_selection_algorithm,
    documentPath: ["views", "random_encounter_selection_algorithm"], readOnly: true,
    edit_policy: "immutable", immutable_reason: "选择算法由 ROM 例程定义"});
}
export function validateEncounterMessageFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, encounterMessageFieldDescriptions, validateEncounterMessageAsset);
}
export function encodeEncounterMessageFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(15), seen = new Set();
  const weights = Array.from({length: 4}, () => new Uint8Array(14));
  const weightSeen = new Set();
  for (const field of fields) {
    if (field.entityHandle === `${OWNER}:selection` && field.fieldName === "algorithm") {
      requireValue(field.resourceId === OWNER && field.value === field.defaultValue, "选择算法不能修改");
      continue;
    }
    const profile = /^encounter-trigger-runtime:class:0([0-3])$/u.exec(field.entityHandle);
    if (profile) {
      const slot = /^weight\.(\d+)$/u.exec(field.fieldName);
      const value = defaults ? field.defaultValue : field.value;
      const key = `${profile[1]}:${slot?.[1]}`;
      requireValue(field.resourceId === OWNER && slot && Number(slot[1]) < 14
        && !weightSeen.has(key) && Number.isInteger(value) && value >= 0 && value <= 255,
      "遇敌权重字段身份或值无效");
      weightSeen.add(key); weights[Number(profile[1])][Number(slot[1])] = value;
      continue;
    }
    const match = /^encounter-trigger-runtime:context:([0-4])$/u.exec(field.entityHandle);
    const column = FIELDS.indexOf(field.fieldName), value = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === OWNER && match && column >= 0, "encounter build field identity drift");
    const index = column * 5 + Number(match[1]);
    requireValue(!seen.has(index) && Number.isInteger(value) && value >= 0 && value <= 255,
      "encounter build field value drift");
    seen.add(index); payload[index] = value;
  }
  requireValue(seen.size === 15 && weightSeen.size === 56, "encounter build fields incomplete");
  requireValue(weights.every(row => row.reduce((sum, value) => sum + value, 0) > 0
    && row.reduce((sum, value) => sum + value, 0) <= 255), "遇敌权重总和须为 1–255");
  return [{fragment_id: encounterMessageComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []},
    ...weights.map((payload, id) => ({fragment_id: weightFragment(id), payload, relocations: []}))];
}
