// @editor-module 选择移动表保留方向掩码与二十个定长序列。
import {createNamedByteTablesOwner} from './named-byte-tables-owner.js';
import {UI_LAYOUT_COMPILER_ID, uiLayoutAssetSchema, encodeUiLayoutFields,
  serializeUiLayoutField, validateUiLayoutPreimage} from './ui-layout-data.js';
import {validateFieldOverrides} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';

const owner = 'code-module', fragmentId = 'code-module.fixed-ui-table-core-a';
const base = createNamedByteTablesOwner({owner, schema: uiLayoutAssetSchema(owner), writeback: null,
  tables: document => document.records.flatMap((record, index) => record.id === 'code-module.ui-mode-command-handlers'
    ? [] : [{name: record.id,
    label: record.label, length: record.values.length, path: ['records', index, 'values'],
    fragmentId: record.id === fragmentId ? fragmentId : null}])});
const describe = document => base.fieldOwner.describe(document).map(field => {
  const index = Number(field.fieldName.slice(5));
  return {...field, offsetInFragment: index, byteLength: 1,
    ...(field.fragmentId !== fragmentId || index < 5 ? {readOnly: true, edit_policy: 'immutable',
      immutable_reason: '只开放选择移动的低四位定长数据'} : {})};
});

function validate(asset, original) {
  const expected = structuredClone(original);
  if (asset?.resource_id !== owner || asset.schema !== uiLayoutAssetSchema(owner))
    throw new TypeError('选择移动表身份无效');
  const row = asset.document?.records?.findIndex(record => record.id === fragmentId);
  const values = asset.document?.records?.[row]?.values;
  if (!Array.isArray(values) || values.length !== 149) throw new TypeError('选择移动表容量不能改变');
  for (let index = 5; index < values.length; index++) {
    if (!Number.isInteger(values[index]) || values[index] < 0 || values[index] > 15)
      throw new TypeError('移动方向只能使用已确认的低四位');
    expected.document.records[row].values[index] = values[index];
  }
  if (!canonicalJsonEqual(asset, expected)) throw new TypeError('只能修改定长选择移动数据');
}

export const selectionMovementFieldOwner = Object.freeze({...base.fieldOwner,
  compilerId: UI_LAYOUT_COMPILER_ID, describe, objects: base.objects,
  validateAsset: validate,
  validate: (original, overrides) => validateFieldOverrides(original, overrides, describe, validate),
  encode: encodeUiLayoutFields, serializeField: serializeUiLayoutField,
  validatePreimage: validateUiLayoutPreimage});
