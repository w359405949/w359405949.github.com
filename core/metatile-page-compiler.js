// @editor-module 元图块页 55 条内容（每条 definition 页 64 行 × 4 字节、attribute 页 64 字节）。
// 组成可写全部四字节；属性只写调色板低两位。
import {METATILE_COMPILER_ID, METATILE_WRITE_PERMISSION, metatileRomField,
  validateMetatilePreimage} from "./metatile-writeback.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const METATILE_PAGE_OWNER = "metatile-page";
const METATILE_PAGE_SCHEMA = "metalmaxcn.semantic-owner.metatile-page";
const RECORDS = "records";
const DEFINITIONS = "metatile_definition_page";
const ATTRIBUTES = "metatile_attribute_page";
// definition 页 = 64 个元图块，每个 4 个 CHR 图块编号；attribute 页 = 64 个字节。
const DEFINITION_ROWS = 64;
const DEFINITION_WIDTH = 4;
const ATTRIBUTE_ROWS = 64;

// 一条记录拆成两个字段对象：它们在已发布字节地图里分属两个 CHR bank 的两段
// （`metatile-page.definitions` bank 212、`metatile-page.attributes` bank 225），
// 因此按发布角色取名，句柄取记录的稳定编号（`metatile-page:00` 的后缀）。
const tables = document => (document?.[RECORDS] || []).flatMap((record, index) => {
  const suffix = String(record.handle || "").split(":").at(-1);
  if (!suffix) throw new TypeError("元图块页记录缺少稳定编号");
  const id = `${METATILE_PAGE_OWNER}:${suffix}`;
  return [
    {name: `definitions-${suffix}`, label: `元图块 definition 页 ${id}（64 行 × 4 字节）`,
      length: 1, fragmentId: `metatile-page.definitions-${suffix}`,
      matrix: {rows: DEFINITION_ROWS, width: DEFINITION_WIDTH, columns: DEFINITION_WIDTH},
      pathAt: () => [RECORDS, index, DEFINITIONS]},
    {name: `attributes-${suffix}`, label: `元图块 attribute 页 ${id}（64 字节）`,
      length: 1, fragmentId: `metatile-page.attributes-${suffix}`,
      matrix: {rows: ATTRIBUTE_ROWS, width: 1, columns: 8},
      pathAt: () => [RECORDS, index, ATTRIBUTES]},
  ];
});

const codec = createNamedByteTablesOwner({owner: METATILE_PAGE_OWNER,
  schema: METATILE_PAGE_SCHEMA, tables, writeback: METATILE_WRITE_PERMISSION});

export const metatilePageObjects = (document, context) => codec.objects(document, context)
  .map(object => ({...object, editor: {...object.editor,
    columns: object.editor.columns.map(column => column.matrix
      ? {...column, semantic: {kind: "raw-bytes"}} : column)}}));
export const serializeMetatilePageField = field => codec.serializeField(metatileRomField(field));
export const metatilePageFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: METATILE_COMPILER_ID,
  validatePreimage: validateMetatilePreimage,
  encode: (fields, options) => codec.encodeFields(fields.map(field => metatileRomField(field, options)), options)});
