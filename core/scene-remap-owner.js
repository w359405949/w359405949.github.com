// @editor-module 场景生命周期字段对象提供事件条件场景映射的字段、控件与序列化。
import {canonicalJsonEqual} from './project-store-values.js';
import {fieldFragmentId, fieldOffsetInFragment} from './field-codec.js';
import {conditionalAudioFieldDescriptions, validateConditionalAudioFieldOverrides,
  encodeConditionalAudioFields, conditionalAudioObjects, serializeConditionalAudioField,
  validateConditionalAudioPreimage} from './conditional-audio-compiler.js';

export const SCENE_REMAP_OWNER = 'field-scene-lifecycle-service';
const FRAGMENT = `${SCENE_REMAP_OWNER}.scene-remap-table`;
function requireValue(condition, message) {if (!condition) throw new Error(message);}

function remapFieldDescriptions(document) {
  const declarations = document?.scene_remap_fields;
  requireValue(document?.module_id === SCENE_REMAP_OWNER && Array.isArray(declarations)
    && declarations.length === 9, '缺少场景映射字段许可');
  const identities = new Set(), offsets = new Set();
  return declarations.map(field => {
    const index = document.records.findIndex(row => row.handle === field.record_handle);
    const row = document.records[index], domain = field.semantic_edit_domain;
    const key = JSON.stringify([field.record_handle, field.record_field]);
    requireValue(row?.kind === 'scene-remap' && index === 9 + field.priority_index
      && Number.isInteger(field.priority_index) && field.priority_index >= 0 && field.priority_index < 3
      && field.web_editable === true && field.length === 1 && domain?.status === 'confirmed'
      && ['source_scene_reference', 'global_event_flag_reference', 'target_scene_reference'].includes(field.record_field)
      && Number.isInteger(field.offset) && field.offset >= 0 && field.offset < 9
      && !identities.has(key) && !offsets.has(field.offset)
      && Array.isArray(domain.allowed_reference_values) && domain.allowed_reference_values.length > 0
      && Array.isArray(domain.allowed_raw_values)
      && domain.allowed_reference_values.length === domain.allowed_raw_values.length,
    '场景映射字段身份、顺序或许可无效');
    identities.add(key); offsets.add(field.offset);
    return {resourceId: SCENE_REMAP_OWNER, entityHandle: field.record_handle, fieldName: field.record_field,
      documentPath: ['records', index, field.record_field], defaultValue: row[field.record_field],
      fragmentId: FRAGMENT, offsetInFragment: field.offset, byteLength: 1,
      serialization: {offset: field.offset, references: domain.allowed_reference_values,
        rawValues: domain.allowed_raw_values}};
  });
}

export function fieldSceneRuleDescriptions(document) {
  return [...conditionalAudioFieldDescriptions(document), ...remapFieldDescriptions(document)];
}

export function validateFieldSceneRuleOverrides(original, overrides) {
  const fields = fieldSceneRuleDescriptions(original.document);
  const descriptions = new Map(fields.map(field =>
    [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set(), audio = [];
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    requireValue(row.resource_id === SCENE_REMAP_OWNER && field && !seen.has(key), '场景规则覆盖身份无效');
    seen.add(key);
    const index = field.serialization.references.indexOf(row.value);
    requireValue(index >= 0 && Number.isInteger(field.serialization.rawValues[index]), '场景规则引用超出许可');
    if (field.fragmentId !== FRAGMENT) audio.push(row);
  }
  validateConditionalAudioFieldOverrides(original, audio);
}

export function serializeFieldSceneRule(field) {
  return serializeConditionalAudioField(field);
}

export function encodeFieldSceneRules(fields, options = {}) {
  const remap = fields.filter(field => fieldFragmentId(field) === FRAGMENT);
  requireValue(remap.length === 9 && new Set(remap.map(fieldOffsetInFragment)).size === 9,
    '场景映射序列化字段不完整');
  const payload = new Uint8Array(9);
  for (const field of remap) {
    const current = options.defaults ? {...field, value: field.defaultValue} : field;
    payload[fieldOffsetInFragment(field)] = serializeFieldSceneRule(current)[0];
  }
  return [...encodeConditionalAudioFields(fields.filter(field => fieldFragmentId(field) !== FRAGMENT), options),
    {fragment_id: FRAGMENT, payload, relocations: []}];
}

export function validateFieldSceneRulePreimage(fields, fragmentId, baseline) {
  if (fragmentId !== FRAGMENT) return validateConditionalAudioPreimage(fields, fragmentId, baseline);
  requireValue(baseline.length === 9, '场景映射原像长度改变');
  for (const field of fields) requireValue(serializeFieldSceneRule({...field, value: field.defaultValue})[0]
    === baseline[fieldOffsetInFragment(field)], '场景映射 Origin 与基线原像不同');
}

export function fieldSceneRuleObjects(document) {
  const fields = remapFieldDescriptions(document);
  const columns = [['source_scene_reference', '来源场景', 'scene-header-map', 0],
    ['global_event_flag_reference', '事件位', 'global-event-flag', 3],
    ['target_scene_reference', '目的地', 'scene-header-map', 6]];
  for (const [name, , , index] of columns) requireValue(document.scene_remap_fields
    .filter(field => field.record_field === name).every(field => canonicalJsonEqual(
      field.semantic_edit_domain, document.scene_remap_fields[index].semantic_edit_domain)), '场景映射候选域不一致');
  return [...conditionalAudioObjects(document).map(object => ({...object,
    editor: {...object.editor, protectedRows: document.records.slice(12)}})),
  {id: FRAGMENT, label: '场景映射', fragmentIds: [FRAGMENT],
    fields: fields.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: 'reference-table', rows: document.records.slice(9, 12).map(row => row.handle),
      columns: columns.map(([name, label, targetModule, index]) => ({name, label,
        semantic: {kind: 'reference', targetModule, picker: 'generic'}, candidates: {
          resourceId: SCENE_REMAP_OWNER,
          documentPath: ['scene_remap_fields', index, 'semantic_edit_domain', 'allowed_reference_values'],
          value: [], label: []}}))}}];
}

export function controllerSceneRemaps(controllers, lifecycle) {
  const references = new Set(controllers.flatMap(instance => instance.switch?.targets || [])
    .filter(target => target.kind === 'scene-remap').map(target => target.source_reference));
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap' && references.has(row.handle));
}
