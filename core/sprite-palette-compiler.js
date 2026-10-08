// @editor-module 精灵调色板 32 条（每条 3 字节非透明色），另附已发布消费者清单的只读展示。
// 写入许可未发布（发布物 write_unit=unavailable、blocks web_editable 全 false）：保留编辑、关闭写入。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const SPRITE_PALETTE_OWNER = "sprite-palette";
const SPRITE_PALETTE_SCHEMA = "metalmaxcn.semantic-owner.sprite-palette";
const RECORDS = "records";
const FIELDS = "fields";
const COLORS = "nontransparent_colors";
const CONSUMERS = "consumers";
const WIDTH = 3;

const handleOf = record => {
  const handle = String(record?.handle || "");
  if (!handle) throw new TypeError("精灵调色板记录缺少稳定句柄");
  return handle;
};

const tables = document => {
  const records = document?.[RECORDS];
  if (!Array.isArray(records) || !records.length) throw new TypeError("精灵调色板文档没有记录");
  return [
    // 一条记录 3 个非透明色（`runtime_four_color_form` 是它的派生投影，不另立字段）。
    {name: "colors", label: `非透明色（${records.length} 条 × ${WIDTH} 字节）`,
      length: records.length, fragmentId: null, array: true, arrayWidth: WIDTH,
      pathAt: index => [RECORDS, index, FIELDS, COLORS],
      labelAt: index => handleOf(records[index])},
    // 已发布的消费者清单：不占 ROM 字节，只展示。
    {name: "consumers", label: "消费者清单", length: records.length, fragmentId: null,
      array: true, text: true,
      immutableReason: "消费者清单由引用本调色板的记录决定",
      pathAt: index => [RECORDS, index, CONSUMERS],
      labelAt: index => handleOf(records[index])},
  ];
};

const codec = createNamedByteTablesOwner({owner: SPRITE_PALETTE_OWNER,
  schema: SPRITE_PALETTE_SCHEMA, tables, writeback: ROM_WRITE_PENDING});

export function spritePaletteObjects(document, context) {
  return codec.objects(document, context).map(object => ({...object,
    editor: {...object.editor, columns: object.editor.columns.map(column =>
      object.id === 'sprite-palette:colors' && ['value18', 'value19'].includes(column.name)
        ? {...column, min: 0, max: 255,
        semantic: {kind: 'palette-array', palette: 'nes'}} : column)},
  }));
}
export const serializeSpritePaletteField = codec.serializeField;
export const spritePaletteFieldOwner = Object.freeze({...codec.fieldOwner,
  validate(original, overrides) {
    codec.fieldOwner.validate(original, overrides);
    for (const field of overrides.filter(field => field.entity_handle === 'sprite-palette:colors'
      && ['value18', 'value19'].includes(field.field_name)))
      if (field.value.some(value => value > 63)) throw new TypeError('部件调色板颜色超出 NES 色号');
  },
});
