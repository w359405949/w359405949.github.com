// @editor-module 两张经物理符号表确认的场景数据表，写入许可尚未发布。
import {createPhysicalByteBlocksOwner} from "./physical-byte-blocks-owner.js";

function withSourceAddresses(codec) {
  const describe = document => codec.fieldDescriptions(document).map(field => {
    const block = document.blocks.find(entry =>
      field.entityHandle === `${codec.owner}:${entry.id}`);
    const index = Number(field.fieldName.slice("value".length));
    if (!block || !Number.isInteger(index) || index < 0 || index >= block.values.length
        || block.address?.space !== "prg" || block.address.length !== block.values.length)
      throw new TypeError(`${codec.owner} 字段物理来源无效`);
    return {...field, sourceAddress: {space: "prg", offset: block.address.offset + index,
      length: 1, end_exclusive: block.address.offset + index + 1}};
  });
  return Object.freeze({...codec,
    fieldOwner: Object.freeze({...codec.fieldOwner, describe})});
}

export const fieldMapQueryTableOwner = withSourceAddresses(createPhysicalByteBlocksOwner({
  owner: "field-map-query-service",
  schema: "metalmaxcn.field-ui-module.asset.field-map-query-service",
  blocksPath: ["blocks"],
}));

export const sceneActorRuntimeTableOwner = withSourceAddresses(createPhysicalByteBlocksOwner({
  owner: "scene-actor-runtime",
  schema: "metalmaxcn.field-ui-module.asset.scene-actor-runtime",
  blocksPath: ["blocks"],
}));
