// @editor-module 发布代码 role 的字段对象身份与物理范围。
import {db} from "./project-db.js";
import {loadPhysicalFieldSourceIndex, loadResourceRangeAssociationManifest,
  loadResourceRangeAssociationShard} from "./physical-field-object-sources.js";

const PREFIX = "code-module:";

function range(value, context) {
  const space = String(value?.space || "");
  const offset = Number(value?.offset);
  const length = Number(value?.length);
  const endExclusive = value?.end_exclusive === undefined
    ? offset + length : Number(value.end_exclusive);
  if (!space || !Number.isInteger(offset) || offset < 0
      || !Number.isInteger(length) || length < 1
      || endExclusive !== offset + length) {
    throw new TypeError(`${context} 没有有效的已发布范围`);
  }
  return {space, offset, length, endExclusive};
}

function overlaps(left, right) {
  return left.space === right.space
    && left.offset < right.endExclusive
    && right.offset < left.endExclusive;
}

function uniqueByPath(values) {
  const unique = new Map();
  for (const value of values) {
    const path = String(value?.path || "");
    if (path && !unique.has(path)) unique.set(path, value);
  }
  return [...unique.values()];
}

async function ownerRecordPages(resourceId, roughRanges) {
  const manifest = await loadPhysicalFieldSourceIndex(db);
  if (!manifest || !manifest.bank_shards || typeof manifest.bank_shards !== "object") {
    throw new Error("统一字节地图没有发布 bank 分片");
  }
  const banks = uniqueByPath(roughRanges.flatMap(rough => {
    const descriptors = manifest.bank_shards?.[rough.space];
    if (!Array.isArray(descriptors)) return [];
    return descriptors.filter(descriptor =>
      overlaps(range(descriptor?.address, `${rough.space} bank 描述`), rough));
  }));
  if (!banks.length) throw new Error(`${resourceId} 的资源范围没有对应字节地图 bank`);
  const bankDocuments = await Promise.all(banks.map(descriptor =>
    db.getPackageDocument(descriptor.path, null)));
  if (bankDocuments.some(bank => !bank || !Array.isArray(bank.record_pages))) {
    throw new Error(`${resourceId} 的字节地图 bank 没有发布 record page`);
  }
  const pages = uniqueByPath(bankDocuments.flatMap(bank =>
    bank.record_pages.filter(descriptor => {
      const pageRange = range(descriptor?.address, `${resourceId} record page`);
      return roughRanges.some(rough => overlaps(pageRange, rough));
    })));
  const documents = await Promise.all(pages.map(descriptor =>
    db.getPackageDocument(descriptor.path, null)));
  if (documents.some(page => !page || !Array.isArray(page.records?.annotations))) {
    throw new Error(`${resourceId} 的字节地图 record page 无效`);
  }
  return documents;
}

export async function loadCodeModuleFieldObjects(moduleId, roles) {
  const id = String(moduleId || "").trim();
  if (!id || id.startsWith(PREFIX)) {
    throw new TypeError(`代码 provider 模块 ID 无效：${id || "（空）"}`);
  }
  const resourceId = `${PREFIX}${id}`;
  const associationManifest = await loadResourceRangeAssociationManifest(db);
  const shard = await loadResourceRangeAssociationShard(db, associationManifest, "code");
  const values = shard?.by_uid?.[resourceId];
  if (!Array.isArray(values) || !values.length) {
    throw new Error(`${resourceId} 没有发布资源字节范围`);
  }
  const roughRanges = values.map((value, index) =>
    range(value, `${resourceId} 资源范围 ${index + 1}`));
  const pages = await ownerRecordPages(resourceId, roughRanges);
  const declared = new Set(roles);
  const found = new Map();
  for (const annotation of pages.flatMap(page => page.records.annotations)) {
    const owner = annotation?.resource_owner;
    if (owner?.resource_id !== resourceId || !declared.has(owner.role)) continue;
    const physical = range(annotation.address, `${resourceId}/${owner.role}`);
    const key = `${physical.space}\u0000${physical.offset}\u0000${physical.length}`;
    if (!found.has(owner.role)) found.set(owner.role, new Map());
    found.get(owner.role).set(key, physical);
  }
  return Object.freeze(roles.map(role => {
    const ranges = [...(found.get(role)?.values() || [])];
    if (ranges.length !== 1) {
      throw new Error(`${resourceId}/${role} 应发布唯一 owner 范围，实际 ${ranges.length}`);
    }
    if (ranges[0].space !== "prg") {
      throw new Error(`${resourceId}/${role} 不是 PRG 代码范围`);
    }
    return Object.freeze({
      id: `${resourceId}/${role}`, resourceId, role,
      physical: Object.freeze(ranges[0]),
      writeback: Object.freeze({state: "unpermitted"}),
    });
  }));
}
