// @editor-module 三个模块资产/派生引用的记录型字段对象，只写声明（共用件在 records-owner.js）。
// 写入许可未发布的字段按约束 10／16 保留编辑、关闭写入；派生引用视图按约束 48 只读。
import {createRecordsOwner} from "./records-owner.js";

/** `battle-result-script`：正文只有 raw_bytes；其余记录键均由正文或来源派生。 */
export const battleResultScriptFieldOwner = createRecordsOwner({
  owner: "battle-result-script", schema: "metalmaxcn.module-asset.battle-result-script",
  fields: ["raw_bytes"],
  editor: ({record, handle}) => ({kind: "numeric-table", rows: [handle],
    columns: [{name: "raw_bytes", label: "原始字节", array: true,
      length: record.raw_bytes.length, min: 0, max: 255,
      semantic: {kind: "raw-bytes"}}]}),
});

/** `encounter-formation`：正文只有 slots；标签、统计与来源均为派生。 */
const MONSTER_CANDIDATES = Object.freeze({
  resourceId: "monster-profile", documentPath: ["records"],
  value: {path: ["id"], hex: 2, prefix: "monster:"}, label: ["id_hex", "name"],
});

export const encounterFormationFieldOwner = createRecordsOwner({
  owner: "encounter-formation", schema: "metalmaxcn.module-asset.encounter-formation",
  fields: ["slots"],
  editor: ({record, handle}) => ({
    kind: "reference-table",
    rows: record.slots.map((_, element) => ({handle, element})),
    rowLabels: record.slots.map(slot => `槽位 ${slot.slot}`),
    columns: [
      {name: "slots", label: "槽位", element: {path: ["slot"]}, readOnly: true},
      {name: "slots", label: "怪物选择", element: {path: ["monster_reference"]},
        candidateKey: "slots.monster_reference", candidates: MONSTER_CANDIDATES,
        nullable: true, nullLabel: "空"},
      {name: "slots", label: "数量", element: {path: ["count"]}, min: 0, max: 0xff},
      {name: "slots", label: "启用", element: {path: ["active"]}, boolean: true},
    ],
  }),
  validateFieldValue(field, value, original) {
    if (field.fieldName !== "slots" || !Array.isArray(value) || !Array.isArray(original)
        || value.length !== 4 || original.length !== 4)
      throw new TypeError("encounter-formation: slots 必须保留四个槽位");
    value.forEach((slot, index) => {
      if (!slot || slot.slot !== original[index].slot
          || !(slot.monster_reference === null
            || /^monster:[0-9A-F]{2}$/u.test(slot.monster_reference))
          || !Number.isInteger(slot.count) || slot.count < 0 || slot.count > 0xff
          || typeof slot.active !== "boolean")
        throw new TypeError(`encounter-formation: 槽位 ${index} 的结构无效`);
    });
  },
});

/** `direct-frame`：指针槽归本 owner；身份由记录句柄确定。 */
export const directFrameFieldOwner = createRecordsOwner({
  owner: "direct-frame", schema: "metalmaxcn.semantic-owner.direct-frame",
  fields: record => Object.keys(record ?? {}),
  readOnlyFields: ["id", "id_hex"],
  immutableReasons: {id: "记录身份由 handle 决定", id_hex: "十六进制身份由 id 决定"},
  validateFieldValue(field, value, original) {
    if (field.fieldName !== "pointer") return;
    const hex = Number.isInteger(value?.value)
      ? `0x${value.value.toString(16).toUpperCase().padStart(4, "0")}` : null;
    if (!hex || value.value < 0 || value.value > 0xffff || value.value_hex !== hex
        || value.encoding !== original.encoding
        || value.target_resource_id !== original.target_resource_id
        || value.target_component_id !== original.target_component_id
        || Object.keys(value).sort().join() !== Object.keys(original).sort().join())
      throw new TypeError("直接帧指针只接受 16 位原值，目标与编码保持不变");
  },
});
