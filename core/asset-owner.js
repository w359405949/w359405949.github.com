// @editor-module 具名整屏资产：身份固定，图块与属性字节保留编辑 Working。
import {createRecordsOwner} from "./records-owner.js";

const ASSET_OWNER = "asset";
const ASSET_SCHEMA = "metalmaxcn.semantic-owner.asset";

export const assetFieldOwner = createRecordsOwner({
  owner: ASSET_OWNER, schema: ASSET_SCHEMA,
  fields: record => Object.keys(record ?? {}),
  readOnlyFields: ["id"],
  immutableReasons: {id: "记录身份由 handle 决定"},
  validateFieldValue(field, value, original) {
    if (field.fieldName !== "nametable_attribute") return;
    if (!value || Object.keys(value).sort().join() !== "attributes,nametable")
      throw new TypeError("整屏图块与属性结构无效");
    for (const name of ["nametable", "attributes"]) {
      if (!Array.isArray(value[name]) || value[name].length !== original[name].length
          || value[name].some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255))
        throw new TypeError("整屏图块与属性字节必须保持已发布长度和字节域");
    }
  },
});
