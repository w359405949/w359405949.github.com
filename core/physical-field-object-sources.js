// @editor-module 物理字段对象读取已发布符号来源。

export const BYTE_MAP_INDEX_PATH = "analysis/byte-map/index.json";
const RESOURCE_RANGE_INDEX_PATH = "analysis/byte-map/resource-byte-ranges.json";

export async function loadPhysicalFieldSourceIndex(database) {
  const manifest = await database.getPackageDocument(BYTE_MAP_INDEX_PATH, null, {readonly: true});
  if (!manifest?.bank_shards || !Array.isArray(manifest.address_spaces)) {
    throw new Error("物理字段对象地址空间清单无效");
  }
  return manifest;
}

export async function loadResourceRangeAssociationManifest(database) {
  const manifest = await database.getPackageDocument(RESOURCE_RANGE_INDEX_PATH, null, {readonly: true});
  if (!manifest?.shards || typeof manifest.shards !== "object") {
    throw new Error("资源关联范围清单无效");
  }
  return manifest;
}

export async function loadResourceRangeAssociationShard(database, manifest, shard) {
  const spec = manifest?.shards?.[shard];
  if (typeof spec?.path !== "string" || !spec.path) return null;
  const document_ = await database.getPackageDocument(spec.path, null, {readonly: true});
  if (document_?.shard !== shard || !document_.by_uid
      || typeof document_.by_uid !== "object") {
    throw new Error(`资源关联范围分片 ${shard} 无效`);
  }
  return document_;
}
