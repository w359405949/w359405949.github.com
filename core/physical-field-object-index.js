// @editor-module 按字段对象身份反查 PRG、CHR 与 SRAM 物理范围。
import {db} from "./project-db.js";
import {ADDRESS_SPACE_IDS} from "./physical-address.js";
import {saveFieldBindings} from "./save-codec.js";
import {createPrgPhysicalFieldObjects} from "./prg-physical-field-objects.js";
import {createChrPhysicalFieldObjects} from "./chr-physical-field-objects.js";
import {createSavePhysicalFieldObjects} from "./save-physical-field-objects.js";
import {loadPhysicalFieldSourceIndex} from "./physical-field-object-sources.js";

let cachedManifest = null;
let cachedIndex = null;
let cachedCoverage = null;
const bankCatalogs = new WeakMap();

async function mapLimited(values, limit, project) {
  const output = Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(limit, values.length)}, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await project(values[index]);
    }
  }));
  return output;
}

function addRange(index, object) {
  if (!object.role || object.resourceId.endsWith(".unassigned")) return;
  const physical = object.physical;
  const range = {
    resourceId: object.resourceId, role: object.role,
    ...(object.owner?.elementIndex == null ? {} : {elementIndex: object.owner.elementIndex}),
    ...(object.owner?.elementCount == null ? {} : {elementCount: object.owner.elementCount}),
    space: physical.space, offset: physical.offset,
    length: physical.length, endExclusive: physical.end_exclusive,
    record: object.meaning || object.id,
  };
  if (!index.has(range.resourceId)) index.set(range.resourceId, new Map());
  const key = [range.role, range.space, range.offset, range.length].join("\u0000");
  index.get(range.resourceId).set(key, range);
}

async function loadBank(manifest, space, descriptor) {
  if (!bankCatalogs.has(manifest)) bankCatalogs.set(manifest, new Map());
  const cache = bankCatalogs.get(manifest);
  if (cache.has(descriptor.path)) return cache.get(descriptor.path);
  const pending = buildBank(manifest, space, descriptor);
  cache.set(descriptor.path, pending);
  try {return await pending;}
  catch (error) {cache.delete(descriptor.path); throw error;}
}

async function buildBank(manifest, space, descriptor) {
  const bank = await db.getPackageDocument(descriptor.path, null);
  if (!bank || bank.space !== space) throw new Error(`${space} bank 字段对象来源无效`);
  if (space === "chr") return createChrPhysicalFieldObjects(bank);
  const pages = await Promise.all((bank.record_pages || []).map(page =>
    db.getPackageDocument(page.path, null)));
  if (pages.some(page => !page || !Array.isArray(page.records?.annotations))) {
    throw new Error(`${space} record page 字段对象来源无效`);
  }
  if (space === "prg") {
    return createPrgPhysicalFieldObjects(pages,
      {offset: bank.address.offset, length: bank.address.length});
  }
  const document_ = {...manifest,
    annotations: pages.flatMap(page => page.records.annotations)};
  const fields = [...saveFieldBindings(document_)].map(([id, record]) => ({
    id, resourceId: "save-current", role: `field:${id}`, physical: record.address,
  }));
  return createSavePhysicalFieldObjects(document_, fields, {});
}

async function loadPhysicalFieldObjectIndex() {
  const manifest = await loadPhysicalFieldSourceIndex(db);
  if (!manifest?.bank_shards) throw new Error("物理字段对象缺少地址空间清单");
  if (manifest === cachedManifest && cachedIndex) return cachedIndex;
  cachedManifest = manifest;
  cachedCoverage = null;
  const pending = (async () => {
    const index = new Map();
    const coverage = {};
    for (const space of ADDRESS_SPACE_IDS) {
      const descriptors = manifest.bank_shards[space] || [];
      const catalogs = await mapLimited(descriptors, 8, descriptor =>
        loadBank(manifest, space, descriptor));
      coverage[space] = Object.freeze({
        total: catalogs.reduce((count, catalog) => count + catalog.total, 0),
        uncovered: catalogs.reduce((count, catalog) => count + catalog.uncovered, 0),
        objects: catalogs.reduce((count, catalog) => count + catalog.objects.length, 0),
      });
      for (const catalog of catalogs) for (const object of catalog.objects) addRange(index, object);
    }
    cachedCoverage = Object.freeze(coverage);
    return new Map([...index].map(([id, ranges]) => [id,
      [...ranges.values()].sort((left, right) =>
        ADDRESS_SPACE_IDS.indexOf(left.space) - ADDRESS_SPACE_IDS.indexOf(right.space)
          || left.offset - right.offset || left.length - right.length
          || left.role.localeCompare(right.role, "zh-CN")),
    ]));
  })();
  cachedIndex = pending;
  try {
    return await pending;
  } catch (error) {
    if (cachedManifest === manifest) {
      cachedManifest = null; cachedIndex = null; cachedCoverage = null;
    }
    throw error;
  }
}

export async function loadPhysicalFieldObjectCoverage() {
  await loadPhysicalFieldObjectIndex();
  return cachedCoverage;
}

export async function findPhysicalFieldObjectRanges(resourceId) {
  const id = String(resourceId || "").trim();
  if (!id) return [];
  const index = await loadPhysicalFieldObjectIndex();
  return (index.get(id) || []).map(range => ({...range}));
}
