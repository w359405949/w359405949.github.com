// @editor-module 反汇编代码字节的只读字段对象。
import {loadPhysicalFieldSourceIndex, loadResourceRangeAssociationManifest,
  loadResourceRangeAssociationShard} from "./physical-field-object-sources.js";
import {createPrgPhysicalFieldObjects} from "./prg-physical-field-objects.js";
import {FIELD_SUBMENU_CODE_PARAMETERS} from './field-submenu-code-sources.js';
import {FACILITY_RUNTIME_CODE_PARAMETERS} from './facility-runtime-code-sources.js';
import {BATTLE_CONDITION_CODE_PARAMETERS} from './battle-condition-code-sources.js';
import {SCENE_DRAW_CODE_PARAMETERS} from './scene-draw-code-sources.js';
import {RENDER_CODE_PARAMETERS} from './render-code-sources.js';
import {fieldSourceFileName} from './field-source-path.js';

export const READ_ONLY_CODE_PARAMETERS = Object.freeze([...FIELD_SUBMENU_CODE_PARAMETERS, ...FACILITY_RUNTIME_CODE_PARAMETERS,
  ...BATTLE_CONDITION_CODE_PARAMETERS, ...SCENE_DRAW_CODE_PARAMETERS, ...RENDER_CODE_PARAMETERS]
  .filter(row => row.readOnly !== false));
const CODE_PARAMETERS = READ_ONLY_CODE_PARAMETERS;

export const codeFieldSourcePath = resourceId => `web-project/code-fields/${fieldSourceFileName(resourceId)}`;

function parameterField(row, fieldObjectId, value) {
  return Object.freeze({resourceId: row.resource_id, entityHandle: row.entity_handle, fieldName: row.field,
    fieldObjectId, readOnly: true, edit_policy: 'immutable', defaultValue: value, value,
    sourceAddress: row.physical, physical: row.physical, hasOverride: false,
    writeback: Object.freeze({state: 'unpermitted'})});
}

const sourcesByDatabase = new WeakMap();

function decode(envelope) {
  if (envelope?.encoding !== "base64" || typeof envelope.data !== "string")
    throw new TypeError("代码字段对象缺少字节地图正文");
  const raw = atob(envelope.data);
  if (raw.length !== envelope.length) throw new TypeError("代码字段对象正文长度不符");
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

async function sources(database = null) {
  const db = database || (await import("./project-db.js")).db;
  const [byteMap, manifest, graph] = await Promise.all([
    loadPhysicalFieldSourceIndex(db),
    loadResourceRangeAssociationManifest(db),
    db.getPackageDocument("metadata/module-graph.json", null, {readonly: true}),
  ]);
  if (graph?.schema !== "metalmaxcn.module-graph"
      || !graph.handle_normalization || typeof graph.handle_normalization !== "object")
    throw new TypeError("代码字段对象缺少模块图句柄归一关系");
  const cached = sourcesByDatabase.get(db);
  if (cached?.byteMap === byteMap && cached.manifest === manifest && cached.graph === graph) return cached;
  const source = {db, byteMap, manifest, graph, banks: new Map()};
  sourcesByDatabase.set(db, source);
  return source;
}

function ownerIdsFor(source, resourceId) {
  const ids = new Set([resourceId]);
  for (const [handle, normalization] of Object.entries(source.graph?.handle_normalization || {})) {
    if (handle.startsWith("code-module:") && normalization?.to === resourceId)
      ids.add(handle);
  }
  return ids;
}

async function rangesFor(source, resourceIds) {
  const load = key => loadResourceRangeAssociationShard(source.db, source.manifest, key);
  const common = await Promise.all([load("native"), load("code")]);
  const found = common.flatMap(shard => [...resourceIds].flatMap(id => shard?.by_uid?.[id] || []));
  if (found.length) return found;
  const others = await Promise.all(Object.keys(source.manifest.shards)
    .filter(key => key !== "native" && key !== "code").map(load));
  return others.flatMap(shard => [...resourceIds].flatMap(id => shard?.by_uid?.[id] || []));
}

async function bankAt(source, offset) {
  const index = Math.floor(offset / 0x2000);
  const descriptor = source.byteMap.bank_shards?.prg?.[index];
  if (!descriptor) throw new RangeError(`代码字节超出 PRG：${offset}`);
  const bank = await source.db.getPackageDocument(descriptor.path, null, {readonly: true});
  const cached = source.banks.get(index);
  if (cached?.document === bank) return cached.value;
  if (bank?.space !== "prg" || bank.address?.offset !== index * 0x2000)
    throw new TypeError(`PRG bank ${index} 无效`);
  const value = {offset: bank.address.offset, bytes: decode(bank.bytes),
    kinds: decode(bank.disassembly?.classification),
    ids: bank.disassembly?.classification_ids, pages: bank.record_pages, owners: new Map()};
  source.banks.set(index, {document: bank, value});
  return value;
}

function object(resourceId, start, values) {
  const origin = Uint8Array.from(values);
  const id = `${resourceId}:code:${start.toString(16).toUpperCase()}`;
  const fields = CODE_PARAMETERS.filter(row => row.resource_id === resourceId
    && row.physical.offset >= start && row.physical.offset < start + origin.length).map(row => {
    const value = origin[row.physical.offset - start];
    return parameterField(row, id, value);
  });
  const physical = Object.freeze({space: "prg", offset: start,
    length: origin.length, endExclusive: start + origin.length});
  return Object.freeze({id, fields: Object.freeze(fields),
    resourceId, get origin() {return Uint8Array.from(origin);},
    working: null, edited: false, physical,
    writeback: Object.freeze({state: "unpermitted"}),
    mount(host) {
      const label = document.createElement("div");
      label.className = "code-segment-field-object";
      label.dataset.fieldObjectId = this.id;
      const preview = [...origin.slice(0, 32)].map(value =>
        value.toString(16).toUpperCase().padStart(2, "0")).join(" ");
      label.textContent = `${resourceId} · PRG $${start.toString(16).toUpperCase().padStart(6, "0")} · ${origin.length} B · 只读 · ${preview}${origin.length > 32 ? " …" : ""}`;
      host.append(label);
      return label;
    },
  });
}

function parameterRanges(ranges, resourceId) {
  const groups = [];
  for (const range of [...ranges].sort((left, right) => left.offset - right.offset)) {
    let group = groups.at(-1);
    if (!group || range.offset > group.end) {
      group = {start: range.offset, end: range.offset + range.length, ranges: []};
      groups.push(group);
    }
    group.end = Math.max(group.end, range.offset + range.length);
    group.ranges.push(range);
  }
  const parameters = CODE_PARAMETERS.filter(row => row.resource_id === resourceId);
  const selected = new Set(groups.filter(group => parameters.some(row =>
    row.physical.offset >= group.start && row.physical.offset < group.end)).flatMap(group => group.ranges));
  return ranges.filter(range => selected.has(range));
}

export async function loadCodeSegmentFieldObjects(resourceId, database = null, readOnly = false) {
  const source = await sources(database);
  const canonicalId = resourceId.startsWith("code-module:")
    ? source.graph?.handle_normalization?.[resourceId]?.to || resourceId : resourceId;
  const ownerIds = ownerIdsFor(source, canonicalId);
  let ranges = (await rangesFor(source, ownerIds))
    .filter(range => range.space === "prg");
  for (const range of ranges) {
    if (!Number.isInteger(range.offset) || !Number.isInteger(range.length)
        || range.offset < 0 || range.length < 1) throw new TypeError(`${resourceId} 范围无效`);
  }
  if (readOnly) ranges = parameterRanges(ranges, canonicalId);
  const confirmedInstructions = new Set(CODE_PARAMETERS
    .filter(row => row.resource_id === canonicalId)
    .flatMap(row => [row.physical.offset - 1, row.physical.offset]));
  const values = new Map();
  for (const range of ranges) {
    for (let offset = range.offset; offset < range.offset + range.length;) {
      const bank = await bankAt(source, offset);
      const end = Math.min(range.offset + range.length, bank.offset + bank.bytes.length);
      const pages = bank.pages.filter(page => page.address.offset < end
        && page.address.end_exclusive > offset);
      const documents = [];
      for (const page of pages) {
        const document = await source.db.getPackageDocument(page.path, null, {readonly: true});
        if (!Array.isArray(document?.records?.annotations))
          throw new TypeError(`${resourceId} owner 记录页无效`);
        documents.push(document);
      }
      const key = pages.map(page => page.path).join('\u0000');
      let cached = bank.owners.get(key);
      if (!cached || documents.some((document, index) => document !== cached.documents[index])) {
        cached = {documents, byByte: createPrgPhysicalFieldObjects(documents,
          {offset: bank.offset, length: bank.bytes.length, bytes: bank.bytes}).byByte};
        bank.owners.set(key, cached);
      }
      const owned = cached.byByte;
      for (let at = offset; at < end; at++) {
        const local = at - bank.offset;
        if (ownerIds.has(owned[local]?.resourceId)
            && (bank.kinds[local] === bank.ids.code
              || bank.kinds[local] === bank.ids["code-fragment"]
              || confirmedInstructions.has(at)))
          values.set(at, bank.bytes[local]);
      }
      offset = end;
    }
  }
  const offsets = [...values.keys()].sort((a, b) => a - b);
  const objects = [];
  let start = null, bytes = [];
  for (const offset of offsets) {
    if (start !== null && offset !== start + bytes.length) {
      objects.push(object(canonicalId, start, bytes));
      start = null; bytes = [];
    }
    if (start === null) start = offset;
    bytes.push(values.get(offset));
  }
  if (start !== null) objects.push(object(canonicalId, start, bytes));
  return Object.freeze(objects);
}

function codeSegmentFieldOwner(resourceId) {
  return Object.freeze({physicalWriteback: false,
    loadObjects: ({database = null, readOnly = false} = {}) => loadCodeSegmentFieldObjects(resourceId, database, readOnly),
    hasReadOnlyField: (handle, name) => CODE_PARAMETERS.some(row =>
      row.resource_id === resourceId && row.entity_handle === handle && row.field === name),
    async loadReadOnlyFields({database = null} = {}) {
      const db = database || (await import('./project-db.js')).db;
      const document = await db.getPackageDocument(codeFieldSourcePath(resourceId), null, {readonly: true});
      if (document?.schema !== 'metalmaxcn.code-fields' || document.resource_id !== resourceId
          || !Array.isArray(document.fields)) throw new TypeError(`${resourceId} 只读代码字段正文无效`);
      const descriptions = new Map(CODE_PARAMETERS.filter(row => row.resource_id === resourceId)
        .map(row => [JSON.stringify([row.entity_handle, row.field]), row]));
      const keys = new Set(document.fields.map(row => JSON.stringify([row.entityHandle, row.fieldName])));
      if (keys.size !== document.fields.length || keys.size !== descriptions.size)
        throw new TypeError(`${resourceId} 只读代码字段声明不符`);
      return Object.freeze(document.fields.map(row => {
        const description = descriptions.get(JSON.stringify([row.entityHandle, row.fieldName]));
        if (!description || !Number.isInteger(row.value) || row.value < 0 || row.value > 255
            || typeof row.fieldObjectId !== 'string' || !row.fieldObjectId.startsWith(`${resourceId}:code:`))
          throw new TypeError(`${row.entityHandle}/${row.fieldName} 只读代码字段无效`);
        return parameterField(description, row.fieldObjectId, row.value);
      }));
    },
    async loadReadOnlyField(handle, name, fields = null) {
      fields ||= await this.loadReadOnlyFields();
      const field = fields.find(row => row.entityHandle === handle && row.fieldName === name);
      if (!field) throw new TypeError(`只读代码字段不存在：${handle}/${name}`);
      return field;
    }});
}

export function withCodeSegmentFields(resourceId, dataOwner = null) {
  const code = codeSegmentFieldOwner(resourceId);
  return Object.freeze(dataOwner ? {...dataOwner, loadObjects: code.loadObjects,
    hasReadOnlyField: code.hasReadOnlyField, loadReadOnlyFields: code.loadReadOnlyFields,
    loadReadOnlyField: code.loadReadOnlyField} : code);
}
