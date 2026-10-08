// @editor-module 设施配置所属控件使用已发布的槽位用途与引用命名空间。
import {mountFieldObjectEditor} from './field-object-editor.js';

export async function mountFacilityConfigurationControls(host, object, options) {
  const [document, facilities] = await Promise.all([
    object.database.getDocument('facility-config'), object.database.getDocument('project.facilities'),
  ]);
  const family = document.families.find(row => row.records.some(record => record.record_id === object.id));
  const entry = facilities.configuration_loader.pointer_entries.find(row => Number(row.family_id) === Number(family.id));
  const namespace = entry.value_namespace;
  const columns = object.definition.editor.columns.map(column => {
    if (!column.name.startsWith('slot:')) return column;
    const slot = Number(column.name.slice(5));
    const schema = namespace?.slot_schema?.slots.find(row => Number(row.slot) === slot);
    const domain = schema?.namespace || (namespace?.slot_schema ? null : namespace?.namespace);
    const label = schema?.label || `${namespace?.goods_label || '项目'} ${slot + 1}`;
    const base = {...column, label};
    if (Number(family.id) === 0x0a) return {...base,
      candidates: {resourceId: 'audio-command', documentPath: ['records'], value: ['id'], label: ['label', 'id'],
        filter: {path: ['id'], values: namespace.goods.map(row => Number(row.value))}}};
    if (domain === 'item') return {...base, semantic: {kind: 'reference', targetModule: 'item-entry'},
      candidates: {resourceId: 'item-entry', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'shell') return {...base, semantic: {kind: 'reference', targetModule: 'shell-record'},
      candidates: {resourceId: 'shell-record', documentPath: ['records'], value: ['id'], label: ['name', 'id']}};
    if (domain === 'service-goods') return {...base, candidates: {document: 'project.facilities',
      documentPath: ['configuration_loader', 'pointer_entries', facilities.configuration_loader.pointer_entries.indexOf(entry),
        'value_namespace', 'goods'], value: ['value'], label: ['value'], textReference: ['text_record']}};
    return base;
  });
  return mountFieldObjectEditor(host, {...object, definition: {...object.definition,
    editor: {...object.definition.editor, columns}}}, options);
}
