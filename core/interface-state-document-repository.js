// @editor-module 文档仓库代理将字段控件的写入限制在独立文档。
import {fieldOwner} from './field-owners.js';
import {SPARSE_ARRAY_FORMAT, changeArrayFieldWorking, fieldStoredValue} from './field-codec.js';
import {interfaceStateFieldKey} from './interface-state-document.js';
import {canonicalJsonEqual} from './project-store-values.js';

export function createInterfaceStateDocumentRepository(base, id, {update}) {
  const snapshot = async (resourceId, options = {}) => {
    const original = await base.getFieldState(resourceId, {...options, includeOriginal: true});
    const record = await base.readInterfaceStateDocument(id);
    if (!record) throw new TypeError('状态机文档不存在');
    const value = original.original.value;
    const descriptions = fieldOwner(resourceId).describe(value.document || value, {asset: value});
    const overrides = [...original.overrides];
    for (const row of record.overrides.document.fields.filter(row => row.resourceId === resourceId)) {
      const field = descriptions.find(field => field.entityHandle === row.handle && field.fieldName === row.field);
      if (!field) throw new TypeError('文档字段引用不存在');
      const index = overrides.findIndex(entry => entry.entity_handle === row.handle && entry.field_name === row.field);
      if (index >= 0) overrides.splice(index, 1);
      const stored = field.workingFormat === SPARSE_ARRAY_FORMAT
        ? changeArrayFieldWorking(field, undefined, {value: row.value, reset: false, selection: null})
        : canonicalJsonEqual(row.value, field.defaultValue) ? undefined : row.value;
      if (stored !== undefined) overrides.push({resource_id: resourceId,
        entity_handle: row.handle, field_name: row.field, value: stored});
    }
    return {...original, overrides, version: `${original.version}:${record.version}`};
  };
  return new Proxy(base, {get(target, key) {
    if (key === 'getFieldState') return snapshot;
    if (key === 'writeFieldValues') return async (resourceId, changes) => {
      const source = await snapshot(resourceId, {includeDependencies: true});
      const descriptions = fieldOwner(resourceId).describe(source.original.value.document || source.original.value,
        {asset: source.original.value});
      await update(id, document => {
        for (const change of changes) {
          const field = descriptions.find(field => field.entityHandle === change.entityHandle
            && field.fieldName === change.fieldName);
          if (!field || field.readOnly) throw new TypeError('未知或只读文档字段');
          const reference = {resourceId, handle: field.entityHandle, field: field.fieldName};
          const row = document.fields.find(row => interfaceStateFieldKey(row) === interfaceStateFieldKey(reference));
          if (!row) throw new TypeError('字段未导入文档');
          let value = change.reset ? field.defaultValue : change.value;
          if (field.workingFormat === SPARSE_ARRAY_FORMAT) {
            const previous = changeArrayFieldWorking(field, undefined, {value: row.value, reset: false, selection: null});
            const stored = changeArrayFieldWorking(field, previous, {...change, selection: change.selection ?? null});
            value = stored === undefined ? field.defaultValue : fieldStoredValue(field, stored);
          }
          row.value = structuredClone(value);
        }
        return document;
      });
      return snapshot(resourceId);
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}
