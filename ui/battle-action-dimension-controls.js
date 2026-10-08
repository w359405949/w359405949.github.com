// @editor-module 动作尺寸选择同笔修改行列并保持布局图块容量。
import {mountFieldObjectControls} from '../core/field-object.js';
import {mountLinkedFieldChoice} from './field-object-editor.js';

export async function mountBattleActionDimensionControls(host, object, options) {
  const columns = object.fields.find(field => field.fieldName === 'columns');
  const rows = object.fields.find(field => field.fieldName === 'rows');
  const count = columns.value * rows.value;
  const choices = Array.from({length: 8}, (_, index) => index + 1)
    .filter(columns => count % columns === 0 && count / columns <= 8)
    .map(columns => ({values: [columns, count / columns], label: `${columns} × ${count / columns}`}));
  const suppressedFieldKeys = new Set(options.suppressedFieldKeys);
  for (const field of [columns, rows]) suppressedFieldKeys.add(JSON.stringify(
    [field.resourceId, field.entityHandle, field.fieldName]));
  await mountFieldObjectControls(host, object, {...options, suppressedFieldKeys});
  const shape = document.createElement('div'); host.prepend(shape);
  mountLinkedFieldChoice(shape, object, ['columns', 'rows'], choices, {label: '图块列 × 行'});
}
