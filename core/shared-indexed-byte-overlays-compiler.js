// @editor-module 共享索引字节叠加：31 个 ROM 字节，升序/交互/降序掩码是同一批字节的多处视图。
// 一个字节一个字段对象，多处文档位置共用同一个对象（多源同步）；物理位置取自 owner 文档三块，
// 写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const SHARED_INDEXED_BYTE_OVERLAYS_OWNER = "shared-indexed-byte-overlays";
const SHARED_INDEXED_BYTE_OVERLAYS_SCHEMA = "metalmaxcn.field-ui-module.asset.shared-indexed-byte-overlays";
const LEVEL = "level_value_codebook";
const ASCENDING = "zero_prefixed_ascending_bit_masks";
const INTERACTION = "interaction_flag_set_masks";
const DESCENDING = "descending_bit_masks";
const EQUIPMENT = "descending_equipment_masks";

// 块 A（517863，23 B）：等级码表 7 + 升序掩码 9 + 降序掩码 7；升序与降序在 0x80 那个字节上重叠。
function fixedPaths(index) {
  if (index < 7) return [[LEVEL, index]];
  if (index === 7) return [[ASCENDING, 0]];
  if (index < 15) return [[ASCENDING, index - 7], [INTERACTION, index - 8]];
  if (index === 15) return [[ASCENDING, 8], [INTERACTION, 7], [DESCENDING, 0]];
  return [[DESCENDING, index - 15]];
}

function fixedLabel(index) {
  return fixedPaths(index).map(path => `${path[0]}[${path[1]}]`).join(" + ");
}

const TABLES = [
  {name: "fixed-index-tables", label: "等级码表／升序掩码／降序掩码（23 B）", length: 23,
    fragmentId: "shared-indexed-byte-overlays.fixed-index-tables", pathsAt: fixedPaths, labelAt: fixedLabel},
  {name: "equipment-mask-prefix", label: "装备掩码前缀（255／127／63）", length: 3,
    fragmentId: "shared-indexed-byte-overlays.equipment-mask-prefix",
    pathsAt: index => [[EQUIPMENT, index]]},
  {name: "equipment-mask-drop-threshold-tail", label: "装备掩码阈值尾段（31／15／7／3／1）", length: 5,
    fragmentId: "shared-indexed-byte-overlays.equipment-mask-drop-threshold-tail",
    pathsAt: index => [[EQUIPMENT, index + 3]]},
];

const codec = createNamedByteTablesOwner({owner: SHARED_INDEXED_BYTE_OVERLAYS_OWNER,
  schema: SHARED_INDEXED_BYTE_OVERLAYS_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const sharedIndexedByteOverlaysObjects = codec.objects;
export const serializeSharedIndexedByteOverlaysField = codec.serializeField;
export const sharedIndexedByteOverlaysFieldOwner = codec.fieldOwner;
