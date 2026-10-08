// @editor-module 打包属性四分区掩码常量（保留/清除掩码各 4 字节）。
// 写入许可未发布（owner 文档 writeback_constraints 为 unavailable）：保留编辑、关闭写入，
// 构建保留 Original，页面按「↛ 暂不进 ROM」标明。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const PACKED_ATTRIBUTE_QUADRANT_MASK_SET_OWNER = "packed-attribute-quadrant-mask-set";
const PACKED_ATTRIBUTE_QUADRANT_MASK_SET_SCHEMA =
  "metalmaxcn.semantic-owner.packed-attribute-quadrant-mask-set";
const FRAGMENT = "packed-attribute-quadrant-mask-set.keep-and-clear";

// 一段 8 字节块按语义拆两表：前 4 字节是保留掩码（0/85/170/255），后 4 字节是清除掩码（252/243/207/63）。
const TABLES = [
  {name: "1B57_1B5B", label: "保留掩码（top-left／top-right／bottom-left／bottom-right）", length: 4,
    fragmentId: FRAGMENT, path: ["1B57_1B5B"],
    labelAt: index => ["top-left", "top-right", "bottom-left", "bottom-right"][index] ?? `元素 ${index}`},
  {name: "1B5B_1B5F", label: "清除掩码（top-left／top-right／bottom-left／bottom-right）", length: 4,
    fragmentId: FRAGMENT, path: ["1B5B_1B5F"],
    labelAt: index => ["top-left", "top-right", "bottom-left", "bottom-right"][index] ?? `元素 ${index}`},
];

const codec = createNamedByteTablesOwner({owner: PACKED_ATTRIBUTE_QUADRANT_MASK_SET_OWNER,
  schema: PACKED_ATTRIBUTE_QUADRANT_MASK_SET_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const packedAttributeQuadrantMaskSetObjects = codec.objects;
export const serializePackedAttributeQuadrantMaskSetField = codec.serializeField;
export const packedAttributeQuadrantMaskSetFieldOwner = codec.fieldOwner;
