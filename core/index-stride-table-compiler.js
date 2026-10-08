// @editor-module 索引倍率偏移表（三、五、六、七、八、十一倍）；写入许可未发布，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const INDEX_STRIDE_TABLE_OWNER = "index-stride-table";
const INDEX_STRIDE_TABLE_SCHEMA = "metalmaxcn.field-ui-module.asset.index-stride-table";

const TABLES = [
  {name: "index_times_three_offsets", label: "三倍索引偏移表", length: 16,
    fragmentId: "index-stride-table.index-times-three"},
  {name: "index_times_five_offsets", label: "五倍索引偏移表", length: 3,
    fragmentId: "index-stride-table.index-times-five"},
  {name: "index_times_six_offsets", label: "六倍索引偏移表", length: 19,
    fragmentId: "index-stride-table.index-times-six"},
  {name: "index_times_seven_offsets", label: "七倍索引偏移表", length: 11,
    fragmentId: "index-stride-table.index-times-seven"},
  {name: "index_times_eight_offsets", label: "八倍索引偏移表", length: 11,
    fragmentId: "index-stride-table.index-times-eight"},
  {name: "index_times_eleven_offsets", label: "十一倍索引偏移表", length: 8,
    fragmentId: "index-stride-table.index-times-eleven"},
];

const codec = createNamedByteTablesOwner({owner: INDEX_STRIDE_TABLE_OWNER,
  schema: INDEX_STRIDE_TABLE_SCHEMA, tables: TABLES, writeback: ROM_WRITE_PENDING});

export const indexStrideTableObjects = codec.objects;
export const serializeIndexStrideTableField = codec.serializeField;
export const indexStrideTableFieldOwner = codec.fieldOwner;
