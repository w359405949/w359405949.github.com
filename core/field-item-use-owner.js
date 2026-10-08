// @editor-module 场景使用登记（field-item-use）字段对象：一条登记一个对象，逐字段读写与重置。
// 写入许可未发布（byte-map `write_unit: unavailable`）：保留编辑、关闭写入，构建保留 Original。
import {createRecordsOwner} from "./records-owner.js";

const FIELD_ITEM_USE_OWNER = "field-item-use";
const FIELD_ITEM_USE_SCHEMA = "metalmaxcn.module-asset.field-item-use";
/** 逐字段可读写的登记字段；`sources` 是证据，不当字段暴露。 */
const FIELD_ITEM_USE_FIELDS = Object.freeze([
  "item_reference", "dispatch_index", "target_required", "consumption",
  "effect_family", "parameter_records", "text_record_references",
]);

export const fieldItemUseFieldOwner = createRecordsOwner({
  owner: FIELD_ITEM_USE_OWNER, schema: FIELD_ITEM_USE_SCHEMA,
  fields: FIELD_ITEM_USE_FIELDS,
});
