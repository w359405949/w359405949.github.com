// @editor-module 世界元图块组成可写，属性只写调色板低两位；普通场景页对只持引用。
import {METATILE_COMPILER_ID, METATILE_WRITE_PERMISSION, metatileRomField,
  validateMetatilePreimage} from "./metatile-writeback.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const METATILE_SET_OWNER = "metatile-set";
const METATILE_SET_SCHEMA = "metalmaxcn.semantic-owner.metatile-set";
const RECORDS = "records";
const DEFINITIONS = "metatile_definitions";
const ATTRIBUTES = "metatile_attributes";
const LOWER = "lower_metatile_page";
const UPPER = "upper_metatile_page";
const SCENES = "scene_references";

const handleOf = record => {
  const handle = String(record?.handle || "");
  if (!handle) throw new TypeError("元图块集记录缺少稳定编号");
  return handle;
};

// 表声明由发布文档推出：自持记录（有 definition/attribute 段）建字节字段；页对记录只读展示。
const tables = document => {
  const records = document?.[RECORDS];
  if (!Array.isArray(records) || !records.length) throw new TypeError("元图块集文档没有记录");
  const owned = records.map((record, index) => ({record, index})).filter(({record}) => record?.[DEFINITIONS]);
  if (owned.length !== 1) throw new TypeError("元图块集自持记录不唯一");
  const {record: world, index: worldIndex} = owned[0];
  const rows = world[DEFINITIONS].length;
  if (handleOf(world) !== "metatile-set:00" || rows !== 187 || world[ATTRIBUTES]?.length !== rows)
    throw new TypeError("元图块集世界定义/属性页形状不一致");
  const views = records.map((record, index) => ({record, index})).filter(({record}) => record?.[LOWER]);
  return [
    {name: `${handleOf(world).split(":").at(-1)}-definitions`,
      label: `世界地图定义页 ${handleOf(world)}（${rows} 行 × 4 字节）`,
      length: 1, fragmentId: "metatile-set.definitions-00", matrix: {rows, width: 4, columns: 4},
      pathAt: () => [RECORDS, worldIndex, DEFINITIONS]},
    {name: `${handleOf(world).split(":").at(-1)}-attributes`,
      label: `世界地图属性页 ${handleOf(world)}（${rows} 字节）`,
      length: 1, fragmentId: "metatile-set.attributes-00", matrix: {rows, width: 1, columns: 8},
      pathAt: () => [RECORDS, worldIndex, ATTRIBUTES]},
    // 页对是场景 header 的投影：归属在场景那一侧，这里只按已发布文档展示。
    {name: "lower-pages", label: "下页对（指向元图块页记录）", length: views.length,
      fragmentId: null, text: true,
      immutableReason: "下页对引用由场景 header 的下页选择决定",
      pathAt: index => [RECORDS, views[index].index, LOWER],
      labelAt: index => `${handleOf(views[index].record)} 的下页`},
    {name: "upper-pages", label: "上页对（指向元图块页记录）", length: views.length,
      fragmentId: null, text: true,
      immutableReason: "上页对引用由场景 header 的上页选择决定",
      pathAt: index => [RECORDS, views[index].index, UPPER],
      labelAt: index => `${handleOf(views[index].record)} 的上页`},
    // 已发布引用清单：哪些场景用到这组元图块（不占 ROM 字节，只展示）。
    {name: "scene-references", label: "场景引用（哪些场景用到这组元图块）", length: records.length,
      fragmentId: null, array: true, text: true,
      immutableReason: "场景反向引用清单由各场景的元图块页选择决定",
      pathAt: index => [RECORDS, index, SCENES],
      labelAt: index => handleOf(records[index])},
  ];
};

const codec = createNamedByteTablesOwner({owner: METATILE_SET_OWNER,
  schema: METATILE_SET_SCHEMA, tables, writeback: METATILE_WRITE_PERMISSION});

export const metatileSetObjects = (document, context) => codec.objects(document, context)
  .map(object => ({...object, editor: {...object.editor,
    columns: object.editor.columns.map(column => column.matrix
      ? {...column, semantic: {kind: "raw-bytes"}} : column)}}));
export const serializeMetatileSetField = field => codec.serializeField(metatileRomField(field));
export const metatileSetFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: METATILE_COMPILER_ID,
  validatePreimage: validateMetatilePreimage,
  encode: (fields, options) => codec.encodeFields(fields.map(field => metatileRomField(field, options)), options)});
