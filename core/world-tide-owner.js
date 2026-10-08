// @editor-module 世界潮汐切换表的字段对象。
import {createRecordsOwner} from './records-owner.js';

export const WORLD_TIDE_OWNER = 'field-exploration-runtime';
export const WORLD_TIDE_HANDLE = `${WORLD_TIDE_OWNER}:00`;
const columns = [
  ['north_high', '涨潮 · 北侧地形'], ['north_low', '退潮 · 北侧地形'],
  ['south_high', '涨潮 · 洞口地形'], ['south_low', '退潮 · 洞口地形'],
];
const owner = createRecordsOwner({owner: WORLD_TIDE_OWNER,
  schema: `metalmaxcn.field-ui-module.asset.${WORLD_TIDE_OWNER}`,
  fields: columns.map(([name]) => name),
  validateFieldValue(field, value) {
    if (!Number.isInteger(value) || value < 0 || value > 255)
      throw new TypeError(`${field.fieldName} 必须是 0–255 的整数`);
  },
  editor: ({handle}) => ({kind: 'numeric-table', rows: [handle],
    columns: columns.map(([name, label]) => ({name, label, min: 0, max: 255}))}),
});
export const worldTideFieldOwner = Object.freeze({...owner,
  describe: document => owner.describe(document).map(field => ({...field,
    sourceAddress: document.records.find(record => record.handle === field.entityHandle)
      .sources[field.fieldName],
  })),
});
