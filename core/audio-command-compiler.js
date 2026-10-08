// @editor-module 音频命令 128 条：每条命令记自己的 header 指针与（有值时的）mask/兼容性 bitset 指针。
// 发布文档里缺值的键不登记（null 不等于 0），因此各条记录登记的字段数不同；记录身份取发布句柄。
// 写入许可未发布、无独立归属文档：按约束 16 保留编辑、关闭写入，构建保留 Original。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

const AUDIO_COMMAND_OWNER = "audio-command";
const AUDIO_COMMAND_SCHEMA = "metalmaxcn.module-asset.audio-command";
const RECORDS = "records";
const REFERENCES = "track_sequence_references";

// 每条命令可能有的字节字段，取自旧字段表的列（噪声音序指针两列在发布文档里没有路径，未列）。
const COMMAND_KEYS = Object.freeze([
  {name: "channel_mask_and_kind", label: "声道 mask / 音乐音效标志"},
  {name: "compatibility_mask_pointer_low", label: "兼容性 bitset 指针低字节"},
  {name: "compatibility_mask_pointer_high", label: "兼容性 bitset 指针高字节"},
  {name: "pointer_low", label: "命令 header 指针低字节"},
  {name: "pointer_high", label: "命令 header 指针高字节"},
]);

const handleOf = record => {
  const handle = String(record?.handle || "");
  if (!handle || !handle.startsWith(`${AUDIO_COMMAND_OWNER}:`))
    throw new TypeError("音频命令记录缺少稳定句柄");
  return handle;
};

const tables = document => {
  const records = document?.[RECORDS];
  if (!Array.isArray(records) || !records.length) throw new TypeError("音频命令文档没有记录");
  return [
    ...records.map((record, position) => {
      const keys = COMMAND_KEYS.filter(key => Number.isInteger(record[key.name]));
      if (!keys.length) throw new TypeError(`音频命令 ${handleOf(record)} 没有可登记的命令字节`);
      return {name: handleOf(record).slice(AUDIO_COMMAND_OWNER.length + 1),
        label: String(record.label || handleOf(record)), fragmentId: null,
        keys, pathBase: [RECORDS, position]};
    }),
    // 已发布的音序引用清单（哪些音轨用这条命令）：不占 ROM 字节，只展示。
    {name: "track-sequence-references", label: "音序引用（哪些音轨用这条命令）",
      fragmentId: null, array: true, text: true, length: records.length,
      immutableReason: "反向引用由音轨的命令句柄决定",
      pathAt: index => [RECORDS, index, REFERENCES],
      labelAt: index => handleOf(records[index])},
  ];
};

const codec = createNamedByteTablesOwner({owner: AUDIO_COMMAND_OWNER,
  schema: AUDIO_COMMAND_SCHEMA, tables, writeback: ROM_WRITE_PENDING});

export const audioCommandObjects = (...args) => codec.objects(...args).map(object => ({
  ...object, editor: {...object.editor,
    columns: object.editor.columns.map(column => column.name === "channel_mask_and_kind"
      ? {...column, semantic: {kind: "bit-labels"}, bits: [
        {value: 1, label: "声道 bit0"}, {value: 2, label: "声道 bit1"},
        {value: 4, label: "声道 bit2"}, {value: 8, label: "声道 bit3"},
        {value: 128, label: "音效"},
      ]} : column)},
}));
export const serializeAudioCommandField = codec.serializeField;
export const audioCommandFieldOwner = codec.fieldOwner;
