// @editor-module 背景调色板源 53 条（每条 9 字节），按 owner 文档的三块落位。
// 写入许可未发布：保留编辑、关闭写入，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const PALETTE_OWNER = "palette";
const PALETTE_SCHEMA = "metalmaxcn.semantic-owner.palette";
const RECORDS = "records";
const FIELD = "background_palette_source";
const WIDTH = 9;

// 三块按文档记录的先后顺序拼起来：121552（162 B = 18 条）、121723（198 B = 22 条）、
// 121930（117 B = 13 条）；判据是 ROM 三段与文档 477 字节逐字节一致。
const BLOCKS = [
  {name: "background-sources-00-11", first: 0, length: 18, fragmentId: "palette.background-sources-00-11"},
  {name: "background-sources-12-27", first: 18, length: 22, fragmentId: "palette.background-sources-12-27"},
  {name: "background-sources-28-34", first: 40, length: 13, fragmentId: "palette.background-sources-28-34"},
];

// 第 54 条记录：地图道具专用画面的整屏调色板种子（8 字节）。
// 它的物理位置没有发布，按第 16 条照常登记字段对象（保留编辑与重置），只是不参与构建。
const SEED = {name: "palette-seed", first: 53, length: 1, width: 8,
  label: "调色板种子（地图道具专用画面）", path: ["records", 53, "palette_seed"]};

const TABLES = [...BLOCKS.map(block => ({name: block.name, length: block.length,
  label: `背景调色板源 ${block.first}–${block.first + block.length - 1}（每条 ${WIDTH} 字节）`,
  fragmentId: block.fragmentId, array: true, arrayWidth: WIDTH,
  pathAt: index => [RECORDS, block.first + index, FIELD],
  labelAt: index => `调色板 ${String(block.first + index).padStart(2, "0")}`})),
  {name: SEED.name, length: SEED.length, label: SEED.label, fragmentId: null,
    array: true, arrayWidth: SEED.width, pathAt: () => SEED.path,
    labelAt: () => "调色板种子"},
  // 已发布的反向清单：哪些场景用到这条调色板（不占 ROM 字节，只展示，不参与构建）。
  {name: "scene-references", length: 53, label: "场景引用（哪些场景用到这条调色板）",
    fragmentId: null, array: true, text: true,
    immutableReason: "反向引用由场景使用的调色板句柄决定",
    pathAt: index => [RECORDS, index, "scene_references"],
    labelAt: index => `调色板 ${String(index).padStart(2, "0")}`}];

const codec = createNamedByteTablesOwner({owner: PALETTE_OWNER, schema: PALETTE_SCHEMA,
  tables: TABLES, writeback: ROM_WRITE_PENDING});

export function paletteObjects(document, context) {
  return codec.objects(document, context).map(object => ({...object,
    editor: {...object.editor, columns: object.editor.columns.map(column =>
      column.array && !column.text
        ? {...column, min: 0, max: 255, semantic: {kind: "palette-array", palette: "nes"}}
        : column)},
  }));
}
export const serializePaletteField = codec.serializeField;
export const paletteFieldOwner = codec.fieldOwner;
