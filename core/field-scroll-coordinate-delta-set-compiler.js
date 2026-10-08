// @editor-module 场景滚动坐标增量表：按方向（5 个索引）分三张表，共 15 字节。
// 物理位置取 owner 文档一块（514888），写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const FIELD_SCROLL_COORDINATE_DELTA_SET_OWNER = "field-scroll-coordinate-delta-set";
const FIELD_SCROLL_COORDINATE_DELTA_SET_SCHEMA =
  "metalmaxcn.field-ui-module.asset.field-scroll-coordinate-delta-set";
const DIRECTION_TABLES = "direction_indexed_tables";
const DIRECTIONS = 5;

const TABLES = [
  {name: "field_buffer_origin_delta_by_direction", label: "字段缓冲原点增量（按方向）", length: DIRECTIONS,
    fragmentId: "field-scroll-coordinate-delta-set.direction-indexed-tables",
    path: [DIRECTION_TABLES, "field_buffer_origin_delta_by_direction"]},
  {name: "exposed_strip_coordinate_delta_by_direction", label: "外露条带坐标增量（按方向）", length: DIRECTIONS,
    fragmentId: "field-scroll-coordinate-delta-set.direction-indexed-tables",
    path: [DIRECTION_TABLES, "exposed_strip_coordinate_delta_by_direction"]},
  {name: "attribute_cell_coordinate_delta_by_direction", label: "属性单元坐标增量（按方向）", length: DIRECTIONS,
    fragmentId: "field-scroll-coordinate-delta-set.direction-indexed-tables",
    path: [DIRECTION_TABLES, "attribute_cell_coordinate_delta_by_direction"]},
];

const codec = createNamedByteTablesOwner({owner: FIELD_SCROLL_COORDINATE_DELTA_SET_OWNER,
  schema: FIELD_SCROLL_COORDINATE_DELTA_SET_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const fieldScrollCoordinateDeltaSetObjects = codec.objects;
export const serializeFieldScrollCoordinateDeltaSetField = codec.serializeField;
export const fieldScrollCoordinateDeltaSetFieldOwner = codec.fieldOwner;
