// @editor-module 从字节地图发布的资源关联范围构成字段对象视图。
import {loadResourceRangeAssociationManifest, loadResourceRangeAssociationShard}
  from "./physical-field-object-sources.js";

const catalogsByDatabase = new WeakMap();

function associatedRange(source) {
  const space = String(source?.space || "");
  const start = Number(source?.offset);
  const length = Number(source?.length);
  const end = start + length;
  if (!["prg", "chr", "sram"].includes(space) || !Number.isInteger(start)
      || start < 0 || !Number.isInteger(length) || length < 1
      || !Number.isSafeInteger(end)) {
    throw new Error(`资源关联范围无效：${space}:${start}+${length}`);
  }
  return Object.freeze({...source, space, offset: start, length: end - start});
}

async function createResourceRangeFieldViews(manifest, shards) {
  const sourceByUid = new Map();
  for (const shard of Object.values(shards)) {
    for (const [uid, ranges] of Object.entries(shard.by_uid)) sourceByUid.set(uid, ranges);
  }
  const byUid = new Map([...sourceByUid].map(([uid, ranges]) => [uid,
    Array.isArray(ranges) ? Object.freeze(ranges.map(range =>
      associatedRange(range))) : null]));
  const loadedShards = Object.freeze(Object.keys(shards).sort());
  return Object.freeze({
    has: uid => byUid.has(uid),
    ranges: uid => byUid.get(uid),
    loadedShards,
    expectedShard(uid) {
      const prefix = String(uid || "").split(":", 1)[0];
      return manifest.uid_prefix_shards?.[prefix] || null;
    },
  });
}

export async function loadResourceRangeFieldViews(database, shards,
  {all = false, uids = [], domainForUid = () => null} = {}) {
  let manifest;
  try {manifest = await loadResourceRangeAssociationManifest(database);}
  catch {return {catalog: null, loaded: [], failures: ["project.resource-byte-ranges"]};}
  const requested = new Set(all ? Object.keys(manifest.shards) : shards);
  for (const uid of uids) {
    const prefix = String(uid || "").split(":", 1)[0];
    const shard = domainForUid(uid) || manifest.uid_prefix_shards?.[prefix];
    if (shard) requested.add(shard);
  }
  const names = [...requested].filter(name => Object.hasOwn(manifest.shards, name)).sort();
  const values = await Promise.all(names.map(name =>
    loadResourceRangeAssociationShard(database, manifest, name).catch(() => null)));
  let catalogs = catalogsByDatabase.get(database);
  if (!catalogs) catalogsByDatabase.set(database, catalogs = new Map());
  const key = names.join("\u0000");
  const cached = catalogs.get(key);
  if (cached?.manifest === manifest && values.every((value, index) => value === cached.values[index])) {
    return cached.result;
  }
  const documents = {};
  const failures = [];
  for (let index = 0; index < names.length; index += 1) {
    if (values[index]) documents[names[index]] = values[index];
    else failures.push(`resource-byte-ranges.${names[index]}`);
  }
  const pending = createResourceRangeFieldViews(manifest, documents).then(catalog =>
    ({catalog, loaded: Object.keys(documents).sort(), failures}));
  const entry = {manifest, values, result: pending};
  catalogs.set(key, entry);
  try {return await pending;}
  catch (error) {
    if (catalogs.get(key) === entry) catalogs.delete(key);
    throw error;
  }
}
