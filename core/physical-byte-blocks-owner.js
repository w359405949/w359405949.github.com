// @editor-module 已发布物理字节块的共用字段 owner；块 id 是字段身份，数组位置只定位正文。
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";

export function createPhysicalByteBlocksOwner({owner, schema, blocksPath}) {
  if (!Array.isArray(blocksPath) || !blocksPath.length)
    throw new TypeError("物理字节块 owner 缺少发布路径");
  return createNamedByteTablesOwner({owner, schema, tables: document => {
    const blocks = blocksPath.reduce((value, key) => value?.[key], document);
    if (!Array.isArray(blocks) || !blocks.length)
      throw new TypeError(`${owner} 缺少发布物理块`);
    return blocks.map((block, index) => {
      if (typeof block?.id !== "string" || !block.id
          || !Array.isArray(block.values) || !block.values.length)
        throw new TypeError(`${owner} 的发布物理块无效`);
      return {name: block.id, label: block.label || block.id, length: block.values.length,
        path: [...blocksPath, index, "values"], fragmentId: null};
    });
  }});
}
