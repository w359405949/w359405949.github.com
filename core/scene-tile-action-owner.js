// @editor-module 调查机关的语义字段；代码参数不声明 ROM 写入许可。
import {createRecordsOwner} from './records-owner.js';

export const TILE_ACTION_OWNER = 'nearby-object-investigation-service';
export const TILE_ACTION_HANDLE = `${TILE_ACTION_OWNER}:02`;

const fields = createRecordsOwner({
  owner: TILE_ACTION_OWNER,
  schema: `metalmaxcn.field-ui-module.asset.${TILE_ACTION_OWNER}`,
  fields: ['audio_command', 'replacement_metatile'],
  validateFieldValue(field, value) {
    const maximum = 127;
    if (!Number.isInteger(value) || value < 0 || value > maximum)
      throw new TypeError(`${field.fieldName} 必须是 0–${maximum} 的整数`);
  },
  editor: ({handle}) => ({kind: 'numeric-table', rows: [handle], columns: [
    {name: 'audio_command', label: '音效', min: 0, max: 127,
      semantic: {kind: 'reference', targetModule: 'audio-command', picker: 'generic'},
      candidates: {resourceId: 'audio-command', documentPath: ['records'],
        value: ['id'], label: ['label'], filter: {path: ['kind'], values: ['sound-effect']}}},
    {name: 'replacement_metatile', label: '变为元图块', min: 0, max: 127,
      semantic: {kind: 'image'}, metatile: {context: 'scene'}},
  ]}),
});

export const sceneTileActionFieldOwner = Object.freeze({...fields,
  describe: document => fields.describe(document).map(field => ({...field,
    sourceAddress: document.records.find(record => record.handle === field.entityHandle)
      .sources[field.fieldName === 'audio_command' ? 'audio' : 'metatile'],
  })),
});
