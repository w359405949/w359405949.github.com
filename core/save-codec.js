// @editor-module 按统一字节地图读取、修改 SRAM 字段并生成初始存档与校验和。

import {playerTileFromSaveCamera} from "./save-position.js";
import {saveFieldStatusRecord, saveRoleDrivingRecord, saveRoleDeathRecord, saveRoleNumbRecord} from "./save-field-status.js";
import {projectFieldDraftRevision} from "./project-field-draft.js";
import {createRuntimeFieldState} from "./runtime-workspace-owner.js";
import {applyJsonChanges} from "./project-store-values.js";

const SAVE_ADDRESS_SPACE = "sram";

/** 存档数值计算只保留字段位置、编码与归属；物理检视器读取完整注解。 */
export function saveRuntimeFieldDocument(document) {
  const keys = ['address', 'binding', 'field_id', 'fields', 'range_id', 'resource_address_bindings',
    'resource_owner', 'runtime_cpu', 'source', 'status', 'decoded_label'];
  return {schema: 'metalmaxcn.save-runtime-fields', address_spaces: document.address_spaces, annotations: saveAnnotations(document).map(record =>
    Object.fromEntries(keys.filter(key => Object.hasOwn(record, key)).map(key => [key, record[key]])))};
}

// Persistence is an opaque projection of the already decoded byte buffer.
// The existing Working diff stores the current file only when it differs;
// no second SRAM layout or field writer is introduced here.
export function saveCurrentValue(bytes, name = "metalmaxcn-current.sav", drafts = {}) {
  // A loaded/edited file remains the current file when ROM defaults change.
  // Keep that opaque value atomic in Working; field patches still belong here.
  return {bytes: Array.from(bytes), name, drafts};
}

/** 按已声明字段把本次存档修改写到最新字节；共享字节保留其它字段的位。 */
export function applySaveCurrentChanges(current, previous, next, byteMap, fieldIds = []) {
  const result = applyJsonChanges(current, previous, next);
  for (const id of fieldIds) {
    if (Object.hasOwn(next.drafts, id)) result.drafts[id] = next.drafts[id];
    else delete result.drafts[id];
  }
  if (!byteMap || previous.bytes.length !== next.bytes.length || current.bytes.length !== next.bytes.length)
    return result;
  const selected = new Map(), partial = new Map(), complete = new Map();
  for (const record of saveFieldBindings(byteMap).values()) {
    if (record.status !== "exact" || record.binding?.editable !== true || record.binding.derivation) continue;
    const {offset, length} = record.address;
    const mask = record.binding.encoding === "bit" ? record.binding.bit_mask
      : record.binding.allowed_changed_mask ?? 255;
    const explicit = fieldIds.includes(record.field_id);
    const changed = explicit || Array.from({length}, (_, index) => offset + index)
      .some(at => ((previous.bytes[at] ^ next.bytes[at]) & mask) !== 0);
    const masks = explicit ? selected : mask === 255 ? complete : partial;
    if (changed) for (let index = 0; index < length; index++) {
      const at = offset + index;
      masks.set(at, (masks.get(at) || 0) | mask);
    }
  }
  for (const at of new Set([...selected.keys(), ...partial.keys(), ...complete.keys()])) {
    const mask = selected.get(at) ?? partial.get(at) ?? complete.get(at);
    result.bytes[at] = (current.bytes[at] & ~mask) | (next.bytes[at] & mask);
  }
  return result;
}

export function saveCurrentDrafts(value, byteMap) {
  const drafts = value?.drafts ?? {};
  if (!drafts || typeof drafts !== "object" || Array.isArray(drafts)) {
    throw new SaveCodecError("存档 Working 字段草稿无效");
  }
  return Object.fromEntries(Object.entries(drafts).map(([fieldId, draft]) => {
    const record = fieldRecord(byteMap, fieldId);
    if (record.status === "exact" && record.binding?.editable === true) {
      throw new SaveCodecError(`有写入许可字段不得另存草稿：${fieldId}`);
    }
    const normalized = normalizeSaveDraftFieldValue(record, draft);
    return [fieldId, normalized instanceof Uint8Array ? [...normalized] : normalized];
  }));
}

export function saveCurrentBytes(value, initial) {
  if (!Array.isArray(value?.bytes) || value.bytes.length !== initial.length) {
    throw new SaveCodecError("存档 Working 长度无效");
  }
  const bytes = initial.slice();
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = value.bytes[index];
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new SaveCodecError("存档 Working 含无效字节");
    }
    bytes[index] = byte;
  }
  return bytes;
}

export class SaveCodecError extends Error {
  constructor(message) {
    super(message);
    this.name = "SaveCodecError";
  }
}

function requireByteMap(document_) {
  if (!document_ || typeof document_ !== "object" || Array.isArray(document_)) {
    throw new SaveCodecError("存档需要统一字节地图文档");
  }
  if (!Array.isArray(document_.address_spaces) || !Array.isArray(document_.annotations)) {
    throw new SaveCodecError("统一字节地图缺少 address_spaces 或 annotations");
  }
  return document_;
}

export function saveAddressSpace(document_) {
  const byteMap = requireByteMap(document_);
  const matches = byteMap.address_spaces.filter(item =>
    item && typeof item === "object" && item.id === SAVE_ADDRESS_SPACE);
  if (matches.length !== 1) {
    throw new SaveCodecError("统一字节地图必须精确声明一个 sram 地址空间");
  }
  const space = matches[0];
  if (!Number.isInteger(space.length) || space.length < 1) {
    throw new SaveCodecError("sram 地址空间大小无效");
  }
  return space;
}

export function saveAnnotations(document_) {
  const byteMap = requireByteMap(document_);
  return byteMap.annotations.filter(record => record?.address?.space === SAVE_ADDRESS_SPACE);
}

const PROPERTY_STORAGE_FIELD = /^save\.slot\.(1|2)\.property_storage\.(item|paired_condition)\.(\d{1,2})$/u;
const VEHICLE_EQUIPMENT_STATE_FIELD = /^save\.slot\.(1|2)\.vehicle\.(\d{1,2})\.equipment_state\.(main_gun|sub_gun|special|c_unit|engine|chassis)$/u;
const VEHICLE_EQUIPMENT_STATE_COLUMNS = Object.freeze({
  main_gun: 0, sub_gun: 1, special: 2, c_unit: 3, engine: 4, chassis: 5,
});

function publishedVehicleShellRecord(record) {
  const match = /^save\.slot\.([12])\.vehicle\.(\d+)\.shell_(type|count)\.([0-5])$/.exec(record.field_id || "");
  if (!match) return record;
  const slot = Number(match[1]), vehicle = Number(match[2]), column = Number(match[4]);
  const base = match[3] === "type" ? 802 : 397;
  const slotBase = slot === 1 ? 0x800 : 0xc00;
  const local = base + 6 * vehicle + column, offset = slotBase + local;
  const previous = slotBase + base + 11 * column + vehicle;
  if (vehicle > 10 || record.resource_owner?.resource_id !== "save-vehicle"
      || record.address?.space !== "sram" || record.address.length !== 1
      || ![previous, offset].includes(record.address.offset)
      || record.address.end_exclusive !== record.address.offset + 1
      || record.binding?.encoding !== "u8" || record.binding.slot !== slot
      || record.binding.vehicle !== vehicle) throw new SaveCodecError(`战车炮弹字段发布关系漂移：${record.field_id}`);
  return {...record, address: {...record.address, offset, end_exclusive: offset + 1},
    cpu_address: 0x6000 + offset, runtime_cpu: 0x6400 + local,
    binding: {...record.binding, slot_offset: local}};
}

function publishedVehicleEquipmentStateRecord(record) {
  const match = VEHICLE_EQUIPMENT_STATE_FIELD.exec(String(record?.field_id || ""));
  if (!match) return record;
  const slot = Number(match[1]), vehicle = Number(match[2]);
  const column = VEHICLE_EQUIPMENT_STATE_COLUMNS[match[3]];
  const offset = (slot === 1 ? 0x800 : 0xc00) + 309 + column * 11 + vehicle;
  const binding = record.binding || {};
  if (vehicle > 10 || record.resource_owner?.resource_id !== "save-vehicle"
      || record.address?.space !== SAVE_ADDRESS_SPACE || record.address.offset !== offset
      || record.address.length !== 1 || record.address.end_exclusive !== offset + 1
      || binding.encoding !== "u8" || binding.slot !== slot
      || binding.vehicle !== vehicle || binding.equipment_column !== column) {
    throw new SaveCodecError(`战车装备状态字段发布关系漂移：${record.field_id}`);
  }
  return {...record, status: "exact", binding: {...binding, editable: true,
    control: "select", allowed_changed_mask: 0xc0, derivation: undefined}};
}

// 逆向发布物把原有财产保管目录项的写入边界收敛为两槽各 64 对单字节字段。
// 物理位置仍只取字节地图记录；这里校验发布关系并附加写入许可。
function publishedPropertyStorageRecord(record) {
  const match = PROPERTY_STORAGE_FIELD.exec(String(record?.field_id || ""));
  if (!match) return record;
  const slot = Number(match[1]), kind = match[2], storageSlot = Number(match[3]);
  const slotBase = slot === 1 ? 0x800 : 0xc00;
  const slotOffset = (kind === "item" ? 0x294 : 0x2d4) + storageSlot;
  const binding = record.binding || {};
  if (storageSlot < 0 || storageSlot >= 64 || record.resource_owner?.resource_id !== "property-storage"
      || record.address?.space !== SAVE_ADDRESS_SPACE || record.address.offset !== slotBase + slotOffset
      || record.address.length !== 1 || record.address.end_exclusive !== slotBase + slotOffset + 1
      || binding.encoding !== "u8" || binding.slot !== slot || binding.storage_slot !== storageSlot) {
    throw new SaveCodecError(`财产保管字段发布关系漂移：${record.field_id}`);
  }
  return {...record, status: "exact", binding: {...binding, editable: true, slot_offset: slotOffset,
    preserve_adjacent_bytes: true, recompute_slot_checksum: true,
    ...(kind === "item"
      ? {control: "select", min: 0, max: 0xdd, item_resource_domain: "item-entry"}
      : {control: "number", min: 0, max: 0xff, paired_item_slot: storageSlot,
        applicable_item_id_min: 0x41, applicable_item_id_max: 0x98,
        allowed_changed_mask: 0xc0})}};
}

function addressOf(record, total) {
  const address = record?.address;
  if (!address || address.space !== SAVE_ADDRESS_SPACE) {
    throw new SaveCodecError("存档字段没有有效的 sram 地址");
  }
  const offset = address.offset;
  const length = address.length;
  if (!Number.isInteger(offset) || !Number.isInteger(length) || length < 1
      || address.end_exclusive !== offset + length || offset < 0 || offset + length > total) {
    throw new SaveCodecError("存档字段的统一字节地图边界不一致");
  }
  return {offset, length, endExclusive: offset + length};
}

function bytesOf(value, document_) {
  let bytes;
  if (value instanceof Uint8Array) bytes = value;
  else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
  else if (ArrayBuffer.isView(value)) {
    bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else {
    throw new SaveCodecError("存档必须是 ArrayBuffer 或 Uint8Array");
  }
  const expected = saveAddressSpace(document_).length;
  if (bytes.byteLength !== expected) {
    throw new SaveCodecError(
      `存档是 ${bytes.byteLength} 字节；字节地图要求精确 ${expected} 字节，不是 Mesen 即时存档`,
    );
  }
  return bytes;
}

const saveBindingsCache = new WeakMap();

function indexedSaveFieldBindings(document_) {
  if (saveBindingsCache.has(document_)) return saveBindingsCache.get(document_);
  const total = saveAddressSpace(document_).length;
  const fields = new Map();
  for (const record of saveAnnotations(document_)) {
    if (record.field_id == null) continue;
    if (typeof record.field_id !== "string" || !record.field_id) {
      throw new SaveCodecError("sram field_id 必须是非空字符串");
    }
    addressOf(record, total);
    if (!record.binding || typeof record.binding !== "object" || Array.isArray(record.binding)) {
      throw new SaveCodecError(`存档字段 ${record.field_id} 缺少 binding`);
    }
    if (fields.has(record.field_id)) {
      throw new SaveCodecError(`存档字段 field_id 重复：${record.field_id}`);
    }
    fields.set(record.field_id, publishedVehicleShellRecord(publishedVehicleEquipmentStateRecord(
      publishedPropertyStorageRecord(record))));
  }
  for (const record of [...fields.values()]) {
    const status = saveFieldStatusRecord(record);
    if (status && !fields.has(status.field_id)) fields.set(status.field_id, status);
    const driving = saveRoleDrivingRecord(record);
    if (driving && !fields.has(driving.field_id)) fields.set(driving.field_id, driving);
    const dead = saveRoleDeathRecord(record);
    if (dead && !fields.has(dead.field_id)) fields.set(dead.field_id, dead);
    const numb = saveRoleNumbRecord(record);
    if (numb && !fields.has(numb.field_id)) fields.set(numb.field_id, numb);
  }
  if (Object.isFrozen(document_)) saveBindingsCache.set(document_, fields);
  return fields;
}

export function saveFieldBindings(document_) {
  return new Map(indexedSaveFieldBindings(document_));
}

export function saveRuntimeMemory({byteMap, saveValue, slot = 1}) {
  if (![1, 2].includes(slot)) throw new SaveCodecError("存档现场槽号无效");
  const bytes = saveCurrentBytes(saveValue,
    new Uint8Array(saveAddressSpace(byteMap).length));
  if (!bytes || bytes.length !== saveAddressSpace(byteMap).length)
    throw new SaveCodecError("存档现场缺少存档值");
  const fields = saveFieldBindings(byteMap);
  const memory = {ram: Array(2048).fill(null), sram: Array(bytes.length).fill(null)};
  for (const record of fields.values()) {
    if (record.binding.slot !== 1 || !Number.isInteger(record.runtime_cpu)) continue;
    const source = fields.get(record.field_id.replace(/^save\.slot\.1\./, `save.slot.${slot}.`));
    if (!source || source.address.length !== record.address.length)
      throw new SaveCodecError(`存档现场绑定缺失：${record.field_id}`);
    const cpu = record.runtime_cpu;
    const space = cpu < 0x800 ? "ram" : cpu >= 0x6000 && cpu < 0x8000 ? "sram" : null;
    const offset = space === "sram" ? cpu - 0x6000 : cpu;
    if (!space || offset + record.address.length > memory[space].length)
      throw new SaveCodecError(`存档现场运行地址无效：${record.field_id}`);
    memory[space].splice(offset, record.address.length,
      ...bytes.slice(source.address.offset, source.address.end_exclusive));
  }
  return memory;
}

// 现场只使用符号表的运行地址；存档编辑许可不授予现场推测语义的权限。
export function createSaveRuntimeState({byteMap, memory = {}, resourceId, runtimeDocument}) {
  if (!["save-role", "save-vehicle", "save-container", "property-storage"].includes(resourceId))
    throw new SaveCodecError("存档现场字段对象无效");
  const lengths = {ram: 2048, sram: saveAddressSpace(byteMap).length};
  const backing = Object.fromEntries(Object.entries(lengths).map(([space, length]) => {
    const source = memory[space] === undefined ? Array(length).fill(null) : Array.from(memory[space]);
    if (source.length !== length || source.some(value => value !== null
      && (!Number.isInteger(value) || value < 0 || value > 255)))
      throw new SaveCodecError(`存档现场 ${space} 原像无效`);
    return [space, source];
  }));
  const sources = [...saveFieldBindings(byteMap).values()].filter(record =>
    record.binding.slot === 1 && record.resource_owner?.resource_id === resourceId);
  const mappings = sources.filter(record => Number.isInteger(record.runtime_cpu));
  const definitions = sources.flatMap(record => {
    const mapping = Number.isInteger(record.runtime_cpu) ? record : mappings.find(parent =>
      parent.address.offset <= record.address.offset
      && record.address.end_exclusive <= parent.address.end_exclusive);
    if (!mapping) return [];
    const cpu = mapping.runtime_cpu + record.address.offset - mapping.address.offset;
    // 场景号、相机和队伍计数由 runtime-workspace 持有。
    if (cpu < 0x0413 || cpu >= 0x0800 && cpu < 0x6000) return [];
    const physical = {space: cpu < 0x0800 ? "ram" : "sram", offset: cpu < 0x0800 ? cpu : cpu - 0x6000,
      length: record.address.length};
    const id = record.field_id.replace(/^save\.slot\.1\./, "save.active.");
    const entity = /^save\.active\.role\.(hunter|mechanic|soldier)\./.exec(id)
      || /^save\.active\.vehicle\.(\d+)\./.exec(id)
      || /^save\.active\.property_storage\.(?:item|paired_condition)\.(\d+)$/.exec(id);
    const index = !entity ? 0 : resourceId === "save-role" ? ["hunter", "mechanic", "soldier"].indexOf(entity[1])
      : Number(entity[1]);
    if (!Number.isInteger(index) || index < 0)
      throw new SaveCodecError(`存档现场缺少记录身份：${id}`);
    const bound = {...record, address: {...physical, space: "sram", end_exclusive: physical.offset + physical.length}};
    return [{id, handle: `${resourceId}:${index.toString(16).toUpperCase().padStart(2, "0")}`,
      physical, bound, knowledge: record.status === "exact" ? "confirmed" : "unknown",
      evidence: structuredClone(record.source?.evidence || [])}];
  });
  // 场景槽只消费人物状态的符号位；其它状态位保持各自的确认范围。
  if (resourceId === "save-role") {
    for (const role of ["hunter", "mechanic", "soldier"]) {
      const source = definitions.find(spec => spec.id === `save.active.role.${role}.status`);
      if (!source) continue;
      definitions.push({...source, id: `save.active.role.${role}.animationSuppressed`, knowledge: "confirmed",
        bound: {...source.bound, binding: {...source.bound.binding, encoding: "bit", bit_index: 7, bit_mask: 128}},
        evidence: [{location: "project/evidence/reverse-engineering/scene-actor-remaining-census/context.asm",
          resource_id: "scene-actor-runtime", address: {space: "prg", offset: 0x34339, length: 5}, raw_hex: "B9 7B 64 30 21"}]});
      definitions.push({...source, id: `save.active.role.${role}.isDead`, knowledge: "confirmed",
        runtimePredicate: "equals-FF",
        evidence: [{location: "project/evidence/reverse-engineering/scene-actor-remaining-census/context.asm",
          resource_id: "scene-actor-runtime", address: {space: "prg", offset: 0x340A0, length: 5},
          raw_hex: "BD 7B 64 C9 FF"}]});
    }
  }
  for (const spec of definitions) spec.local = {...spec.bound, address: {space: "sram", offset: 0,
    length: spec.physical.length, end_exclusive: spec.physical.length}};
  const byId = new Map(definitions.map(spec => [spec.id, spec]));
  if (byId.size !== definitions.length || !definitions.length)
    throw new SaveCodecError("存档现场字段缺失或重复");
  const raw = spec => backing[spec.physical.space].slice(spec.physical.offset,
    spec.physical.offset + spec.physical.length);
  const decode = (spec, bytes) => {
    if (spec.knowledge !== "confirmed" || bytes.includes(null)) return null;
    if (spec.runtimePredicate === "equals-FF") return bytes[0] === 255 ? 1 : 0;
    const value = readRecord(Uint8Array.from(bytes), spec.local);
    return value instanceof Uint8Array ? [...value] : value;
  };
  const field = (id, index = 0) => {
    const spec = byId.get(id);
    if (!spec || index !== 0) throw new SaveCodecError(`未知存档现场字段：${id}:${index}`);
    return Object.freeze({resourceId, fieldName: id, handle: spec.handle, index: 0,
      physical: Object.freeze({...spec.physical}), knowledge: spec.knowledge,
      writable: spec.knowledge === "confirmed" && !spec.runtimePredicate,
      evidence: structuredClone(spec.evidence),
      get rawBytes() {return raw(spec);}, get value() {return decode(spec, raw(spec));},
      set value(value) {
        if (spec.runtimePredicate) throw new SaveCodecError(`${id} 是只读判定`);
        if (spec.knowledge !== "confirmed") throw new SaveCodecError(`${id} 的语义未知`);
        const target = backing[spec.physical.space], encoding = spec.bound.binding.encoding;
        if (["bit", "marker"].includes(encoding) && target[spec.physical.offset] === null)
          throw new SaveCodecError(`${id} 缺少同字节原像`);
        const bytes = Uint8Array.from(raw(spec), byte => byte ?? 0);
        const bound = {...spec.local, binding: {...spec.bound.binding, min: 0,
          max: ["bit", "marker"].includes(encoding) ? 1 : 256 ** spec.physical.length - 1}};
        if (encoding === "bit") writeBitField(bytes, bound, value);
        else if (encoding === "marker") writeNormalizedField(bytes, bound, normalizedInteger(value, bound));
        else if (["u8", "u16le", "u24le"].includes(encoding)) writeIntegerField(bytes, bound, value);
        else if (["bytes", "bitset"].includes(encoding)) writeByteSequenceField(bytes, bound, value);
        else throw new SaveCodecError(`存档现场编码未知：${encoding}`);
        target.splice(spec.physical.offset, spec.physical.length, ...bytes);
      }});
  };
  const project = spec => ({handle: spec.handle, field: spec.id, index: 0, knowledge: spec.knowledge,
    raw_bytes: raw(spec), value: decode(spec, raw(spec))});
  const provider = Object.freeze({resourceId, field, fields: () => definitions.map(spec => field(spec.id)),
    capture: () => ({resource_id: resourceId, fields: definitions.map(project)}),
    restore(snapshot) {
      if (snapshot?.resource_id !== resourceId || !Array.isArray(snapshot.fields)
          || snapshot.fields.length !== definitions.length)
        throw new SaveCodecError("存档现场缺少所属字段");
      const inputs = new Map(snapshot.fields.map(row => [row.field, row]));
      if (inputs.size !== definitions.length) throw new SaveCodecError("存档现场字段重复");
      const prepared = new Map();
      for (const spec of definitions) {
        const row = inputs.get(spec.id);
        if (row?.handle !== spec.handle || row.index !== 0 || row.knowledge !== spec.knowledge
            || !Array.isArray(row.raw_bytes) || row.raw_bytes.length !== spec.physical.length
            || Array.from(row.raw_bytes).some(byte => byte !== null && (!Number.isInteger(byte) || byte < 0 || byte > 255))
            || JSON.stringify(row.value) !== JSON.stringify(decode(spec, row.raw_bytes)))
          throw new SaveCodecError(`${spec.id} 的现场与符号表不符`);
        row.raw_bytes.forEach((value, index) => {
          const key = `${spec.physical.space}:${spec.physical.offset + index}`;
          if (prepared.has(key) && prepared.get(key) !== value)
            throw new SaveCodecError("存档现场同字节原像不一致");
          prepared.set(key, value);
        });
      }
      for (const [key, value] of prepared) {
        const [space, offset] = key.split(":");
        backing[space][Number(offset)] = value;
      }
    },
    exportMemory: () => structuredClone(backing),
  });
  if (runtimeDocument === undefined) return provider;
  if (resourceId !== "save-container") throw new SaveCodecError("显示现场不属于此存档字段对象");
  const display = createRuntimeFieldState({document: runtimeDocument, memory, resourceId});
  const existing = provider.fields(), added = display.fields();
  const occupied = new Set(existing.flatMap(field => Array.from({length: field.physical.length},
    (_, index) => `${field.physical.space}:${field.physical.offset + index}`)));
  if (added.some(field => definitions.some(spec => spec.id === field.fieldName)
    || Array.from({length: field.physical.length}, (_, index) =>
      `${field.physical.space}:${field.physical.offset + index}`).some(key => occupied.has(key))))
    throw new SaveCodecError("显示现场与存档字段重复占用字节");
  const addedIds = new Set(added.map(field => field.fieldName));
  const capture = () => ({resource_id: resourceId,
    fields: [...provider.capture().fields, ...display.capture().fields]});
  return Object.freeze({resourceId,
    field: (id, index = 0) => addedIds.has(id) ? display.field(id, index) : field(id, index),
    fields: () => [...existing, ...added], capture,
    restore(snapshot) {
      if (snapshot?.resource_id !== resourceId || !Array.isArray(snapshot.fields)
        || snapshot.fields.length !== existing.length + added.length)
        throw new SaveCodecError("存档显示现场缺少所属字段");
      const before = capture();
      const restoreParts = record => {
        provider.restore({resource_id: resourceId, fields: record.fields.filter(row => !addedIds.has(row.field))});
        display.restore({resource_id: resourceId, fields: record.fields.filter(row => addedIds.has(row.field))});
      };
      try {restoreParts(snapshot);}
      catch (error) {restoreParts(before); throw error;}
    },
    exportMemory() {
      const result = provider.exportMemory(), displayMemory = display.exportMemory();
      for (const field of added) {
        const {space, offset, length} = field.physical;
        result[space].splice(offset, length, ...displayMemory[space].slice(offset, offset + length));
      }
      return result;
    },
  });
}

/**
 * 当前存档域的字段提供器；它只投影既有 field_id，不把 SRAM Working 登记为项目资源。
 * selectedSlot/currentBytes/originalBytes 可给函数，使同一提供器跟随当前存档上下文。
 */
export function createSaveContextFieldProvider({
  byteMap, currentBytes, originalBytes, selectedSlot,
}) {
  const current = value => typeof value === "function" ? value() : value;
  let cachedByteMap = null;
  let cachedBindings = null;
  const bindingsFor = () => {
    const document_ = current(byteMap);
    if (document_ !== cachedByteMap) {
      cachedByteMap = document_;
      cachedBindings = null;
      objectCache.clear();
    }
    return cachedBindings ||= saveFieldBindings(document_);
  };
  const objectCache = new Map();
  const slotValue = () => {
    const slot = Number(current(selectedSlot));
    if (!Number.isInteger(slot) || slot < 1)
      throw new SaveCodecError(`存档上下文槽号无效：${slot}`);
    return slot;
  };
  const identities = resourceId => {
    const slot = slotValue();
    const prefix = `save.slot.${slot}.`;
    const rows = [];
    for (const [fieldId, record] of bindingsFor()) {
      if (record.resource_owner?.resource_id !== resourceId) continue;
      if (resourceId === "save-container" && fieldId.startsWith("save.directory.")) {
        rows.push({record, fieldId, entityHandle: "save-container:directory",
          fieldName: fieldId.slice("save.directory.".length)});
        continue;
      }
      if (!fieldId.startsWith(prefix)) continue;
      if (resourceId === "property-storage") {
        const match = /^save\.slot\.(\d+)\.property_storage\.(item|paired_condition)\.(\d+)$/u.exec(fieldId);
        if (!match || Number(match[1]) !== slot || Number(match[3]) >= 64)
          throw new SaveCodecError(`财产保管字段身份无效：${fieldId}`);
        rows.push({record, fieldId, entityHandle: `property-storage:${match[3]}`,
          fieldName: match[2]});
        continue;
      }
      if (resourceId === "save-container") {
        rows.push({record, fieldId, entityHandle: `save-container:${slot}`,
          fieldName: fieldId.slice(prefix.length)});
        continue;
      }
      const vehicle = resourceId === "save-vehicle"
        ? /^save\.slot\.(1|2)\.vehicle\.(\d{1,2})\.(.+)$/u.exec(fieldId) : null;
      if (vehicle) {
        const persistentSlot = Number(vehicle[2]);
        if (Number(vehicle[1]) !== slot || persistentSlot > 10)
          throw new SaveCodecError(`战车存档字段身份无效：${fieldId}`);
        rows.push({record, fieldId, entityHandle: `save-vehicle:${persistentSlot}`,
          fieldName: vehicle[3]});
        continue;
      }
      const address = (record.resource_address_bindings ?? []).find(binding =>
        typeof binding?.resource_id === "string"
          && binding.resource_id.startsWith(`${resourceId}:${slot}:`));
      if (!address) continue;
      const identity = address.resource_id.slice(`${resourceId}:${slot}:`.length);
      const parts = fieldId.slice(prefix.length).split(".");
      const identityAt = parts.indexOf(identity);
      if (!identity || identityAt < 0 || identityAt === parts.length - 1)
        throw new SaveCodecError(`存档字段缺少逻辑记录身份：${fieldId}`);
      rows.push({record, fieldId, entityHandle: `${resourceId}:${identity}`,
        fieldName: parts.slice(identityAt + 1).join(".")});
    }
    return rows;
  };
  const fieldOf = row => {
    const field = {
      resourceId: row.record.resource_owner.resource_id,
      entityHandle: row.entityHandle,
      fieldName: row.fieldName,
      fieldId: row.fieldId,
      binding: row.record.binding,
      physical: row.record.address,
      status: row.record.status,
      resourceAddressBindings: row.record.resource_address_bindings ?? [],
    };
    Object.defineProperties(field, {
      value: {enumerable: true, get: () => readSaveBoundField(
        current(currentBytes), row.record, current(byteMap))},
      defaultValue: {enumerable: true, get: () => readSaveBoundField(
        current(originalBytes), row.record, current(byteMap))},
      dirty: {enumerable: true, get() {
        const left = field.value, right = field.defaultValue;
        return left instanceof Uint8Array && right instanceof Uint8Array
          ? left.length !== right.length || left.some((value, index) => value !== right[index])
          : !Object.is(left, right);
      }},
    });
    return Object.freeze(field);
  };
  const objectsFor = resourceId => {
    bindingsFor();
    const key = `${slotValue()}\u0000${resourceId}`;
    let objects = objectCache.get(key);
    if (!objects) {
      const groups = new Map();
      for (const row of identities(resourceId)) {
        let object = groups.get(row.entityHandle);
        if (!object) groups.set(row.entityHandle, object = {id: row.entityHandle, fields: []});
        object.fields.push(fieldOf(row));
      }
      objects = Object.freeze([...groups.values()].map(object =>
        Object.freeze({...object, fields: Object.freeze(object.fields)})));
      objectCache.set(key, objects);
    }
    return objects;
  };
  return Object.freeze({
    id: "save-context",
    matchingRentalVehicleSlots(presetId, candidates) {
      if (!Number.isInteger(presetId) || presetId < 8 || presetId > 17
          || JSON.stringify(candidates) !== "[8,9,10]")
        throw new SaveCodecError("出租车型关系超出已发布持久槽域");
      const bindings = bindingsFor();
      return candidates.filter((persistentSlot, rentalSlot) => {
        const fieldId = `save.slot.${slotValue()}.active_rental_vehicle_preset.${rentalSlot}`;
        const record = bindings.get(fieldId);
        if (!record || record.binding?.rental_slot !== rentalSlot)
          throw new SaveCodecError(`出租实例缺少预设字段：${fieldId}`);
        return readSaveField(current(currentBytes), fieldId, current(byteMap)) === presetId;
      });
    },
    async getFieldObjects(resourceId) {
      return objectsFor(resourceId);
    },
    async getField(resourceId, entityHandle, fieldName) {
      const object = (await this.getFieldObjects(resourceId))
        .find(candidate => candidate.id === entityHandle);
      const field = object?.fields.find(candidate => candidate.fieldName === fieldName);
      if (!field) throw new TypeError(`未登记存档字段：${entityHandle}/${fieldName}`);
      return field;
    },
  });
}

function fieldRecord(document_, fieldId) {
  const record = indexedSaveFieldBindings(document_).get(fieldId);
  if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
  return record;
}

function rangeRecord(document_, rangeId) {
  const total = saveAddressSpace(document_).length;
  const matches = saveAnnotations(document_).filter(record => record.range_id === rangeId);
  if (matches.length !== 1) {
    throw new SaveCodecError(`统一字节地图必须精确声明范围 ${rangeId}`);
  }
  addressOf(matches[0], total);
  return matches[0];
}

function readUnsigned(bytes, offset, length) {
  let result = 0;
  for (let index = 0; index < length; index += 1) {
    result += bytes[offset + index] * (2 ** (index * 8));
  }
  return result;
}

function bitMaskOf(record, total) {
  const address = addressOf(record, total);
  const binding = record.binding || {};
  const mask = binding.bit_mask;
  if (address.length !== 1 || !Number.isInteger(mask)
      || mask < 1 || mask > 0xff || (mask & (mask - 1)) !== 0) {
    throw new SaveCodecError(`${record.field_id} 缺少有效的单字节位掩码`);
  }
  if (binding.bit_index != null
      && (!Number.isInteger(binding.bit_index)
        || binding.bit_index < 0 || binding.bit_index > 7
        || mask !== (1 << binding.bit_index))) {
    throw new SaveCodecError(`${record.field_id} 的位序号与位掩码冲突`);
  }
  return {address, mask};
}

function readRecord(bytes, record) {
  const address = addressOf(record, bytes.length);
  const encoding = record.binding?.encoding;
  if (["u8", "u16le", "u24le"].includes(encoding)) {
    const expected = {u8: 1, u16le: 2, u24le: 3}[encoding];
    if (address.length !== expected) {
      throw new SaveCodecError(`字段 ${record.field_id} 的宽度与 ${encoding} 冲突`);
    }
    return readUnsigned(bytes, address.offset, address.length);
  }
  if (["bytes", "bitset"].includes(encoding)) {
    return bytes.slice(address.offset, address.endExclusive);
  }
  if (encoding === "marker") {
    markerValues(record, bytes.length);
    return Number(bytes[address.offset] === record.binding.marker_value);
  }
  if (encoding === "bit") {
    const {address: bitAddress, mask} = bitMaskOf(record, bytes.length);
    if (bytes[bitAddress.offset] === record.binding.excluded_raw_value) return 0;
    return (bytes[bitAddress.offset] & mask) === 0 ? 0 : 1;
  }
  throw new SaveCodecError(`不支持的存档字段编码：${encoding}`);
}

export function readSaveField(value, fieldId, byteMap) {
  return readSaveBoundField(value, fieldRecord(byteMap, fieldId), byteMap);
}

export function readSaveBoundField(value, record, byteMap) {
  const bytes = bytesOf(value, byteMap);
  return readRecord(bytes, record);
}

/** Logical item slots; consumers do not edit or interpret the encoded array. */
export function readSaveItemSlots(bytes, fieldId, byteMap) {
  const record = fieldRecord(byteMap, fieldId);
  if (record.binding.control !== "item-list") {
    throw new SaveCodecError(`${fieldId} 不是物品栏`);
  }
  return Array.from(readSaveField(bytes, fieldId, byteMap));
}



function computeSlotChecksum(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.byteLength < 1) {
    throw new SaveCodecError("槽校验范围不能为空");
  }
  // The slot length is part of the byte-map range definition.  Keeping it out
  // of the codec avoids a second, save-only copy of the physical layout.
  let checksum = bytes.byteLength - 1;
  for (const byte of bytes) checksum = (checksum + (byte ^ 0xff)) & 0xffff;
  return checksum;
}

function metadataRecord(document_, slot, name) {
  return fieldRecord(document_, `save.directory.slot.${slot}.${name}`);
}

function requireSlot(slot) {
  if (typeof slot !== "number" || !Number.isInteger(slot) || ![1, 2].includes(slot)) {
    throw new SaveCodecError(`槽号必须是整数 1 或 2，实际 ${slot}`);
  }
  return slot;
}

export function getSaveSlotStatus(value, slot, byteMap) {
  requireSlot(slot);
  const bytes = bytesOf(value, byteMap);
  const slotAddress = addressOf(rangeRecord(byteMap, `save.slot.${slot}.record`), bytes.length);
  const markerRecord = metadataRecord(byteMap, slot, "valid_marker");
  const expectedMarker = markerRecord.binding?.expected;
  if (!Number.isInteger(expectedMarker) || expectedMarker < 0 || expectedMarker > 0xff) {
    throw new SaveCodecError("有效标记字段缺少 expected 字节");
  }
  const marker = readRecord(bytes, markerRecord);
  const low = readRecord(bytes, metadataRecord(byteMap, slot, "checksum_low"));
  const high = readRecord(bytes, metadataRecord(byteMap, slot, "checksum_high"));
  const storedChecksum = low | (high << 8);
  const computedChecksum = computeSlotChecksum(bytes.slice(slotAddress.offset, slotAddress.endExclusive));
  return {
    slot,
    marker,
    expectedMarker,
    storedChecksum,
    computedChecksum,
    markerValid: marker === expectedMarker,
    checksumValid: storedChecksum === computedChecksum,
    valid: marker === expectedMarker && storedChecksum === computedChecksum,
  };
}

function normalizedInteger(value, record) {
  const binding = record.binding || {};
  if ((binding.control === "checkbox" || binding.encoding === "bit")
      && typeof value === "boolean") value = Number(value);
  if (!Number.isSafeInteger(value)) {
    throw new SaveCodecError(`${record.field_id} 必须是整数`);
  }
  const address = record.address;
  const bit = binding.encoding === "bit";
  if (bit && ((binding.min ?? 0) !== 0 || (binding.max ?? 1) !== 1)) {
    throw new SaveCodecError(`${record.field_id} 的 bit 取值范围必须是 0–1`);
  }
  const minimum = bit ? 0 : binding.min ?? 0;
  const maximum = bit ? 1
    : binding.max ?? (2 ** (address.length * 8)) - 1;
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)
      || value < minimum || value > maximum) {
    throw new SaveCodecError(`${record.field_id} 必须在 ${minimum}–${maximum} 之间`);
  }
  return value;
}

function validateWritable(record) {
  if (record.status !== "exact" || record.binding?.editable !== true) {
    throw new SaveCodecError(`存档字段只读：${record.field_id}`);
  }
  if (!["u8", "u16le", "u24le", "bytes", "bit", "marker"].includes(record.binding?.encoding)) {
    throw new SaveCodecError(`可编辑字段编码不受支持：${record.binding?.encoding}`);
  }
}

function writeIntegerField(output, record, value) {
  const normalized = normalizedInteger(value, record);
  const {offset, length} = addressOf(record, output.length);
  let remaining = normalized;
  for (let index = 0; index < length; index += 1) {
    output[offset + index] = remaining & 0xff;
    remaining = Math.floor(remaining / 0x100);
  }
}

function writeBitField(output, record, value) {
  const normalized = normalizedInteger(value, record);
  const {address, mask} = bitMaskOf(record, output.length);
  if (output[address.offset] === record.binding.excluded_raw_value) {
    if (normalized) throw new SaveCodecError(`死亡人物不能设置酸蚀：${record.field_id}`);
    return;
  }
  output[address.offset] = normalized === 0
    ? output[address.offset] & ~mask
    : output[address.offset] | mask;
}

function markerValues(record, total) {
  const address = addressOf(record, total);
  const {marker_value: marker, clear_value: clear} = record.binding;
  if (address.length !== 1 || !Number.isInteger(marker) || marker < 0 || marker > 255
      || !Number.isInteger(clear) || clear < 0 || clear > 255 || marker === clear)
    throw new SaveCodecError(`${record.field_id} 缺少有效的字节标记`);
  return {address, marker, clear};
}

function writeByteSequenceField(output, record, value) {
  const {offset, length} = addressOf(record, output.length);
  const source = value instanceof Uint8Array ? [...value]
    : Array.isArray(value) ? value : null;
  if (!source || source.length !== length) {
    throw new SaveCodecError(
      `${record.field_id} 必须提供精确 ${length} 个字节`,
    );
  }
  if (source.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 0xff)) {
    throw new SaveCodecError(`${record.field_id} 包含无效字节`);
  }
  const values = Uint8Array.from(source);
  output.set(values, offset);
}

function writeInitialField(output, byteMap, fieldId, value) {
  const record = fieldRecord(byteMap, fieldId);
  const encoding = record.binding?.encoding;
  if (["u8", "u16le", "u24le"].includes(encoding)) {
    writeIntegerField(output, record, value);
    return;
  }
  if (["bytes", "bitset"].includes(encoding)) {
    writeByteSequenceField(output, record, value);
    return;
  }
  if (encoding === "bit") {
    writeBitField(output, record, value);
    return;
  }
  throw new SaveCodecError(`初始存档字段编码不受支持：${encoding}`);
}

function normalizedWritableValue(record, value) {
  validateWritable(record);
  if (["u8", "u16le", "u24le", "bit", "marker"].includes(record.binding?.encoding)) {
    return normalizedInteger(value, record);
  }
  const source = value instanceof Uint8Array ? [...value]
    : Array.isArray(value) ? value : null;
  const length = Number(record.address?.length);
  if (!source || source.length !== length) {
    throw new SaveCodecError(
      `${record.field_id} 必须提供精确 ${length} 个字节`,
    );
  }
  if (source.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 0xff)) {
    throw new SaveCodecError(`${record.field_id} 包含无效字节`);
  }
  return Uint8Array.from(source);
}

export function normalizeSaveDraftFieldValue(record, value) {
  const encoding = record.binding?.encoding;
  if (["u8", "u16le", "u24le", "bit", "marker"].includes(encoding)) {
    return normalizedInteger(value, record);
  }
  if (["bytes", "bitset"].includes(encoding)) {
    const source = value instanceof Uint8Array ? [...value] : value;
    const length = Number(record.address?.length);
    if (!Array.isArray(source) || source.length !== length
        || source.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
      throw new SaveCodecError(`${record.field_id} 必须提供精确 ${length} 个字节`);
    }
    return Uint8Array.from(source);
  }
  throw new SaveCodecError(`存档字段编码不受支持：${encoding}`);
}

function writeNormalizedField(output, record, value, byteMap) {
  const encoding = record.binding?.encoding;
  if (encoding === "bytes" && value instanceof Uint8Array) {
    const {offset} = addressOf(record, output.length);
    output.set(value, offset);
    return;
  }
  if (encoding === "marker") {
    const {address, marker, clear} = markerValues(record, output.length);
    if (value) output[address.offset] = marker;
    else if (output[address.offset] === marker) output[address.offset] = clear;
    return;
  }
  if (["u8", "u16le", "u24le"].includes(encoding)) {
    if (record.binding?.allowed_changed_mask !== undefined) {
      const mask = record.binding.allowed_changed_mask;
      const {offset, length} = addressOf(record, output.length);
      if (length !== 1 || !Number.isInteger(mask) || mask < 1 || mask > 0xff
          || ((output[offset] ^ value) & ~mask) !== 0) {
        throw new SaveCodecError(`存档字段超出许可状态位：${record.field_id}`);
      }
    }
    writeIntegerField(output, record, value);
    return;
  }
  if (encoding === "bit") {
    if (value && record.binding.driving_vehicle_field) {
      const slot = record.binding.slot;
      const vehicle = readSaveField(output, record.binding.driving_vehicle_field, byteMap);
      const {offset} = addressOf(record, output.length);
      if (!(output[offset] & 0x7f)
          || readSaveField(output, record.binding.driving_status_field, byteMap) === 255)
        throw new SaveCodecError(`乘车人物须在队且存活：${record.field_id}`);
      const available = vehicle < 8 ? saveVehicleAcquired(output, slot, vehicle, byteMap)
        : vehicle < 11 && readSaveField(output,
          `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`, byteMap) >= 8
          && readSaveField(output,
            `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`, byteMap) <= 17;
      if (!Number.isInteger(vehicle) || vehicle < 0 || !available)
        throw new SaveCodecError(`乘车缺少有效的已取得战车引用：${record.field_id}`);
    }
    // Read-modify-write the output being assembled, not the source bytes.
    // Consecutive edits to sibling bits in one physical byte therefore compose.
    writeBitField(output, record, value);
    return;
  }
  throw new SaveCodecError(`可编辑字段编码不受支持：${encoding}`);
}

function writeMetadataByte(output, record, value) {
  const {offset, length} = addressOf(record, output.length);
  if (length !== 1 || !Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new SaveCodecError("游戏管理的存档元数据必须是一个字节");
  }
  output[offset] = value;
}

function finalizeSaveSlots(output, byteMap) {
  for (const slot of [1, 2]) {
    const slotAddress = addressOf(
      rangeRecord(byteMap, `save.slot.${slot}.record`),
      output.length,
    );
    const marker = metadataRecord(byteMap, slot, "valid_marker");
    const expectedMarker = marker.binding?.expected;
    if (!Number.isInteger(expectedMarker) ||
        expectedMarker < 0 || expectedMarker > 0xff) {
      throw new SaveCodecError("有效标记字段缺少 expected 字节");
    }
    writeMetadataByte(output, marker, expectedMarker);
    const checksum = computeSlotChecksum(
      output.slice(slotAddress.offset, slotAddress.endExclusive),
    );
    writeMetadataByte(
      output,
      metadataRecord(byteMap, slot, "checksum_low"),
      checksum & 0xff,
    );
    writeMetadataByte(
      output,
      metadataRecord(byteMap, slot, "checksum_high"),
      checksum >> 8,
    );
  }
  return output;
}

/** 保留槽激活标记，并按字段目录重算两个槽的校验和。 */
export function recomputeSaveChecksums(value, byteMap) {
  const output = new Uint8Array(bytesOf(value, byteMap));
  for (const slot of [1, 2]) {
    const slotAddress = addressOf(
      rangeRecord(byteMap, `save.slot.${slot}.record`),
      output.length,
    );
    const checksum = computeSlotChecksum(
      output.slice(slotAddress.offset, slotAddress.endExclusive),
    );
    writeMetadataByte(
      output,
      metadataRecord(byteMap, slot, "checksum_low"),
      checksum & 0xff,
    );
    writeMetadataByte(
      output,
      metadataRecord(byteMap, slot, "checksum_high"),
      checksum >> 8,
    );
  }
  return output;
}

const ACQUISITION_PARTS = Object.freeze([
  "main_gun", "sub_gun", "special", "c_unit", "engine", "chassis",
]);

const vehicleTemplateCache = new WeakMap();

function vehicleTemplate(key, inputs, create) {
  const documents = [inputs.vehicles, inputs.items, inputs.overlays];
  const versions = documents.map(projectFieldDraftRevision);
  if (versions.some(version => version === null)) return create();
  let templates = vehicleTemplateCache.get(inputs.vehicles);
  if (!templates) vehicleTemplateCache.set(inputs.vehicles, templates = new Map());
  let entry = templates.get(key);
  if (!entry || documents.some((document_, index) => document_ !== entry.documents[index]
      || versions[index] !== entry.versions[index])) {
    entry = {documents, versions, value: Object.freeze(create())};
    templates.set(key, entry);
  }
  return {...entry.value};
}

export function saveVehicleAcquisitionFlag(fieldId) {
  const match = /^save\.slot\.([12])\.global_event_flag\.0([89A-F])$/.exec(fieldId);
  return match ? {slot: Number(match[1]), vehicle: parseInt(match[2], 16) - 8} : null;
}

// 自有战车从 18:0390 进入初始化，保留重量、SP、姓名、道具与额外携带列。
export function saveVehicleAcquisitionTemplate(vehicle, inputs) {
  const {vehicles, items, overlays} = inputs;
  const preset = vehicles?.presets?.find(row => Number(row.preset_id) === vehicle);
  if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle >= 8 || !preset)
    throw new SaveCodecError("缺少自有战车取得预设");
  return vehicleTemplate(`acquisition:${vehicle}`, inputs,
    () => saveVehiclePresetTemplate(preset, {items, overlays}));
}

function saveVehiclePresetTemplate(preset, {items, overlays}) {
  const values = {
    defense: semanticInteger(preset.defense, "取得防御"),
    ammo_capacity: semanticInteger(preset.ammo_capacity, "取得弹仓容量"),
    equipped_mask_raw: semanticInteger(preset.equipped_mask, "取得装备掩码"),
    mount_mask_raw: semanticInteger(preset.mount_mask, "取得挂载许可"),
    condition_raw: 0,
  };
  ACQUISITION_PARTS.forEach((part, column) => {
    const itemId = semanticInteger(preset.loadout?.[column]?.item_id, "取得装备");
    let state = 0;
    if (itemId !== 0 && itemId < 0x75) {
      const item = items?.records?.find(row => Number(row.id) === itemId);
      const flags = semanticInteger(item?.equipment?.raw_flags, "取得装备容量码");
      const code = flags & 7;
      state = semanticInteger(code === 7 ? overlays?.zero_prefixed_ascending_bit_masks?.[0]
        : overlays?.level_value_codebook?.[code], "取得装备弹数");
    }
    values[`equipment.${part}`] = itemId;
    values[`equipment_state.${part}`] = state;
    values[`equipped.${part}`] = Number(Boolean(values.equipped_mask_raw & (0x80 >> column)));
    values[`${part}_damaged`] = Number(Boolean(state & 0x80));
  });
  ["main_gun", "sub_gun", "special"].forEach((part, column) => {
    values[`mount_permission.${part}`] = Number(Boolean(values.mount_mask_raw & (0x80 >> column)));
  });
  for (let column = 0; column < 6; column += 1) {
    values[`shell_type.${column}`] = 255;
    values[`shell_count.${column}`] = 0;
  }
  return values;
}

// 出租初始化 18:0367 在共用初始化前只改姓名中的车型码、底盘重量与 SP。
export function saveRentalVehicleTemplate(presetId, inputs) {
  const {vehicles, items, overlays} = inputs;
  const preset = vehicles?.presets?.find(row => Number(row.preset_id) === presetId);
  if (!Number.isInteger(presetId) || !vehicles?.views?.rental?.preset_ids?.includes(presetId)
      || !preset) throw new SaveCodecError("缺少出租战车预设");
  return vehicleTemplate(`rental:${presetId}`, inputs, () => ({...saveVehiclePresetTemplate(preset, {items, overlays}),
    chassis_weight: semanticInteger(preset.chassis_weight, "出租底盘重量"),
    sp: semanticInteger(preset.initial_sp, "出租初始 SP"),
    nameCode: semanticInteger(preset.rental_name?.name_code, "出租名称码")}));
}

// 菜单初值只派生预设初始化与新游戏模板，不创建或修改当前存档。
export function saveVehicleMenuInitialValues(presetId, inputs) {
  const {vehicles, items, saveVehicles} = inputs;
  const preset = vehicles?.presets?.find(row => Number(row.preset_id) === presetId);
  if (!preset) throw new SaveCodecError("缺少战车菜单初值预设");
  const rental = vehicles.views.rental.preset_ids.includes(presetId);
  const values = rental ? saveRentalVehicleTemplate(presetId, inputs)
    : saveVehicleAcquisitionTemplate(presetId, inputs);
  const blocks = saveVehicles?.new_game_default_template?.blocks;
  const prefix = blocks?.find(block => block.id === "save-vehicle.initial-template-prefix")?.values;
  if (!prefix) throw new SaveCodecError("缺少战车新游戏模板");
  const chassis = items.records.find(row => Number(row.id) === Number(preset.loadout[5].item_id));
  const name = rental ? prefix.slice(0, 7) : null;
  if (name) name[3] = values.nameCode;
  return {...values,
    vehicle_slot: rental ? 8 : Number(preset.vehicle_slot),
    chassis_weight: rental ? values.chassis_weight : ROM_INITIAL_CHASSIS_WEIGHT[preset.vehicle_slot],
    sp: rental ? values.sp : ROM_INITIAL_SP[preset.vehicle_slot],
    inventory: Array(vehicles.runtime_inventories.bars.find(bar => bar.id === "items").slots).fill(0),
    shell_counts: Array.from({length: 6}, (_, index) => values[`shell_count.${index}`]),
    name_source: rental ? {raw_hex: name.map(value => value.toString(16).toUpperCase().padStart(2, "0")).join(" "),
      length: name.length, terminator: 0x9F, padding: 0xFF} : chassis?.name_source,
  };
}

// 填充只初始化租车例程写过的字段，并保留其他车位与额外携带列。
export function fillSaveRentalVehicle(source, {slot, vehicle, presetId, template, byteMap}) {
  requireSlot(slot);
  if (!Number.isInteger(vehicle) || vehicle < 8 || vehicle > 10 || !template
      || !Number.isInteger(presetId) || presetId < 8 || presetId > 17)
    throw new SaveCodecError("出租战车填充参数无效");
  const output = new Uint8Array(bytesOf(source, byteMap));
  const prefix = `save.slot.${slot}.`;
  const vehiclePrefix = `${prefix}vehicle.${vehicle}.`;
  for (const [suffix, value] of Object.entries(template)) {
    if (suffix === "nameCode") continue;
    const id = `${vehiclePrefix}${suffix}`;
    if (fieldRecord(byteMap, id).binding?.encoding !== "bit")
      writeInitialField(output, byteMap, id, value);
  }
  const nameId = `${vehiclePrefix}name_codes`;
  const name = Uint8Array.from(readSaveField(output, nameId, byteMap));
  name[3] = template.nameCode;
  writeInitialField(output, byteMap, nameId, name);
  const formationId = `${prefix}entity_scene_object_slots`;
  const formation = Uint8Array.from(readSaveField(output, formationId, byteMap));
  formation[vehicle - 4] = presetId;
  const parkingPrefix = `${prefix}field_object.${vehicle}.`;
  const roles = ["hunter", "mechanic", "soldier"];
  let rider = formation.slice(0, 4).indexOf(vehicle);
  if (rider < 0) rider = roles.findIndex((role, index) => formation[index] >= 0x80
    && readSaveField(output, `${prefix}role.${role}.present`, byteMap));
  if (rider < 0 && formation[3] >= 0x80) rider = 3;
  if (rider >= 0) {
    formation[rider] = vehicle;
    writeInitialField(output, byteMap, `${parkingPrefix}scene_id`, 255);
    if (rider < 3) {
      const flagsId = `${prefix}role.${roles[rider]}.present`;
      writeInitialField(output, byteMap, flagsId, readSaveField(output, flagsId, byteMap) | 0x80);
    }
  } else if (readSaveField(output, `${parkingPrefix}scene_id`, byteMap) >= 0xFE) {
    const {x, y} = playerTileFromSaveCamera(readSaveField(output, `${prefix}camera_x`, byteMap),
      readSaveField(output, `${prefix}camera_y`, byteMap));
    writeInitialField(output, byteMap, `${parkingPrefix}scene_id`, readSaveField(output, `${prefix}scene_id`, byteMap));
    writeInitialField(output, byteMap, `${parkingPrefix}x`, x);
    writeInitialField(output, byteMap, `${parkingPrefix}y`, y);
  }
  writeInitialField(output, byteMap, formationId, formation);
  return patchSaveFields(output, {}, {activateSlot: slot, byteMap});
}

export function saveVehicleAcquisitionField(fieldId) {
  const match = /^save\.slot\.([12])\.vehicle\.([0-7])\.(.+)$/.exec(fieldId);
  if (!match) return null;
  const suffix = match[3];
  const overwritten = ["defense", "ammo_capacity", "equipped_mask_raw", "mount_mask_raw", "condition_raw", "acid"]
    .includes(suffix) || /^(?:equipment|equipment_state|equipped|mount_permission)\.(?:main_gun|sub_gun|special|c_unit|engine|chassis)$/.test(suffix)
    || /^(?:main_gun|sub_gun|special|c_unit|engine|chassis)_damaged$/.test(suffix)
    || /^shell_(?:type|count)\.[0-5]$/.test(suffix);
  return overwritten ? {slot: Number(match[1]), vehicle: Number(match[2]), suffix} : null;
}

export function saveVehicleAcquired(bytes, slot, vehicle, byteMap) {
  return Boolean(readSaveField(bytes,
    `save.slot.${slot}.global_event_flag.${(vehicle + 8).toString(16).toUpperCase().padStart(2, "0")}`, byteMap));
}

// 取得是存档域的关联写入，内部初始化不扩大单字段的写入许可。
export function setSaveVehicleAcquisition(source, initial, {slot, vehicle, acquired, template, byteMap}) {
  requireSlot(slot);
  if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle >= 8 || typeof acquired !== "boolean")
    throw new SaveCodecError("战车取得状态无效");
  const output = new Uint8Array(bytesOf(source, byteMap));
  const origin = bytesOf(initial, byteMap);
  if (saveVehicleAcquired(output, slot, vehicle, byteMap) === acquired) return output;
  const prefix = `save.slot.${slot}.`;
  const vehiclePrefix = `${prefix}vehicle.${vehicle}.`;
  if (!template) throw new SaveCodecError("战车取得模板尚未就绪");
  for (const [suffix, value] of Object.entries(template)) {
    const id = `${vehiclePrefix}${suffix}`;
    const record = fieldRecord(byteMap, id);
    if (record.binding?.encoding === "bit") continue;
    writeInitialField(output, byteMap, id, acquired ? value : readSaveField(origin, id, byteMap));
  }
  writeInitialField(output, byteMap,
    `${prefix}global_event_flag.${(vehicle + 8).toString(16).toUpperCase().padStart(2, "0")}`, Number(acquired));
  const formationId = `${prefix}entity_scene_object_slots`;
  const formation = Uint8Array.from(readSaveField(output, formationId, byteMap));
  const parkingPrefix = `${prefix}field_object.${vehicle}.`;
  if (acquired) {
    const roles = ["hunter", "mechanic", "soldier"];
    const rider = roles.findIndex((role, index) => formation[index] >= 0x80
      && readSaveField(output, `${prefix}role.${role}.present`, byteMap));
    if (formation.slice(0, 4).includes(vehicle)) {
      writeInitialField(output, byteMap, `${parkingPrefix}scene_id`, 255);
    } else if (rider >= 0 || formation[3] >= 0x80) {
      formation[rider >= 0 ? rider : 3] = vehicle;
      writeInitialField(output, byteMap, `${parkingPrefix}scene_id`, 255);
    } else {
      const {x, y} = playerTileFromSaveCamera(
        readSaveField(output, `${prefix}camera_x`, byteMap),
        readSaveField(output, `${prefix}camera_y`, byteMap));
      writeInitialField(output, byteMap, `${parkingPrefix}scene_id`, readSaveField(output, `${prefix}scene_id`, byteMap));
      writeInitialField(output, byteMap, `${parkingPrefix}x`, x);
      writeInitialField(output, byteMap, `${parkingPrefix}y`, y);
    }
  } else {
    for (let index = 0; index < 4; index += 1) if (formation[index] === vehicle) formation[index] = 255;
    for (const suffix of ["scene_id", "x", "y", "state_raw"]) {
      const id = `${parkingPrefix}${suffix}`;
      writeInitialField(output, byteMap, id, readSaveField(origin, id, byteMap));
    }
  }
  writeInitialField(output, byteMap, formationId, formation);
  if (vehicle === 4) writeInitialField(output, byteMap, `${prefix}treasure_collected_flag.51`,
    acquired ? 1 : readSaveField(origin, `${prefix}treasure_collected_flag.51`, byteMap));
  return patchSaveFields(output, {}, {activateSlot: slot, byteMap});
}

/**
 * Build a deterministic schema-only baseline for isolated codec consumers.
 *
 * Unknown bytes remain zero.  Declared scalar fields use their explicit
 * default when present, otherwise their legal minimum (normally zero).  Both
 * slots are initialized as valid records, so the resulting Original can be
 * edited and downloaded immediately instead of treating a .sav file as a
 * prerequisite. The project Original then supplies fixed initial values
 * through createRomInitialSave().
 */
function createDefaultSave(byteMap) {
  const total = saveAddressSpace(byteMap).length;
  const output = new Uint8Array(total);

  for (const record of saveFieldBindings(byteMap).values()) {
    if (!["u8", "u16le", "u24le", "bit"].includes(record.binding?.encoding)) continue;
    const value = record.binding.default ?? record.binding.min ?? 0;
    if (record.binding.encoding === "bit") writeBitField(output, record, value);
    else writeIntegerField(output, record, value);
  }

  return finalizeSaveSlots(output, byteMap);
}

function semanticInteger(value, label, keys = [
  "value", "internal_units", "raw", "item_id",
]) {
  if (typeof value === "boolean") return Number(value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of keys) {
      if (Object.hasOwn(value, key)) {
        value = value[key];
        break;
      }
    }
  }
  if (!Number.isSafeInteger(value)) {
    throw new SaveCodecError(`${label} 不是可写入存档的整数`);
  }
  return value;
}

function semanticBytes(values, length, label) {
  if (!Array.isArray(values) || values.length !== length) {
    throw new SaveCodecError(`${label} 必须包含 ${length} 项`);
  }
  return values.map((value, index) => semanticInteger(
    value,
    `${label}[${index}]`,
  ));
}

function hexByteSequence(value, length, label) {
  if (typeof value !== "string") {
    throw new SaveCodecError(`${label} 缺少十六进制字节`);
  }
  const compact = value.replace(/\s/g, "");
  if (!/^[0-9a-f]*$/i.test(compact) || compact.length !== length * 2) {
    throw new SaveCodecError(`${label} 必须是 ${length} 字节十六进制串`);
  }
  return Array.from({length}, (_, index) =>
    Number.parseInt(compact.slice(index * 2, index * 2 + 2), 16));
}

const ROM_INITIAL_ROLE_FIELDS = Object.freeze([
  "max_hp", "current_hp", "attack", "defense", "present", "status",
  "level", "strength", "intelligence", "speed", "vitality",
  "battle_skill", "repair_skill", "driving_skill", "slot_flags",
  "experience",
]);

// PRG 028132–02815D initializes eleven persistent chassis weights and SP values.
const ROM_INITIAL_CHASSIS_WEIGHT = Object.freeze([
  400, 350, 300, 750, 1550, 1050, 1300, 1600, 0, 0, 0,
]);
const ROM_INITIAL_SP = Object.freeze([
  30, 40, 80, 120, 0, 323, 808, 1600, 0, 0, 0,
]);

// Post-name SRAM keeps unowned vehicle fields zero and all mount masks FF.
const ROM_INITIAL_MOUNT_MASK = 0xff;

// A no-slot name-entry SRAM image has $9F throughout $640F–$6446.
const NEW_GAME_UNNAMED_VEHICLE_CODES = Object.freeze(Array(7).fill(0x9f));

// PRG 0280A7–0280BB initializes the three empty rental instance names.
const ROM_INITIAL_RENTAL_NAME_CODES = Object.freeze([
  0x1d, 0x0a, 0x21, 0x00, 0x96, 0xff, 0x9f,
]);

// PRG 038E1F–038E45 loads the three disabled object slots' coordinates.
const ROM_INITIAL_DISABLED_OBJECT_COORDS = Object.freeze({
  8: Object.freeze([0x15, 0x86]),
  9: Object.freeze([0x12, 0xab]),
  10: Object.freeze([0x04, 0xe0]),
});

/**
 * Construct the valid dual-slot save from original ROM semantics.
 *
 * Original semantic assets, ROM templates, and new-game SRAM supply values.
 * The unified byte map supplies addresses, widths, markers, and checksums.
 */
export function createRomInitialSave(byteMap, {characters, vehicles, textSlots}) {
  const characterInitial = characters?.rom_initial;
  const roles = characterInitial?.roles;
  if (!characterInitial || !Array.isArray(roles) || roles.length !== 3) {
    throw new SaveCodecError("角色语义资产缺少三名角色的 ROM 初始值");
  }
  const defaultNamePreset = characters?.name_initialization?.preset_sets
    ?.find(preset => Number(preset?.id) === 0);
  const defaultNames = new Map(
    (defaultNamePreset?.role_names || []).map(row => [
      Number(row?.role_id), textSlots?.slots?.[row?.source?.slot_id],
    ]),
  );
  if (defaultNames.size !== 3 || [...defaultNames.values()].some(value => !value)) {
    throw new SaveCodecError("角色语义资产缺少空输入姓名预设");
  }
  const placements = vehicles?.initial_placement?.records;
  if (!Array.isArray(placements) || placements.length !== 8) {
    throw new SaveCodecError("战车语义资产缺少 8 辆玩家战车的初始停放值");
  }
  const disabledVehicleSlots = vehicles?.initial_placement?.disabled_slots;
  if (!Array.isArray(disabledVehicleSlots) ||
      disabledVehicleSlots.length !== 3) {
    throw new SaveCodecError("战车语义资产缺少 3 个停用持久车位标记");
  }

  const output = createDefaultSave(byteMap);
  for (const slot of [1, 2]) {
    // PRG 0280BC precedes the three-byte initial gold in the new-game copy.
    writeInitialField(output, byteMap,
      `save.slot.${slot}.adventure_data_settings`, 0x04);
    // PRG 038297–0382A3 initializes $61–$63 to 03 FE 02 on the new-game path.
    writeInitialField(output, byteMap, `save.slot.${slot}.scene_id`, 0x03);
    writeInitialField(output, byteMap, `save.slot.${slot}.camera_x`, 0xfe);
    writeInitialField(output, byteMap, `save.slot.${slot}.camera_y`, 0x02);
    // PRG 034097–0340D4 counts present roles and the optional fourth entity.
    writeInitialField(output, byteMap, `save.slot.${slot}.party_entity_state_raw`,
      roles.filter(role => semanticInteger(role.present, `${role.slug}.present`) !== 0 &&
        semanticInteger(role.status, `${role.slug}.status`) !== 0xff).length);
    writeInitialField(output, byteMap,
      `save.slot.${slot}.entity_scene_object_slots`, Array(10).fill(0xff));
    writeInitialField(
      output,
      byteMap,
      `save.slot.${slot}.gold`,
      semanticInteger(characterInitial.gold, "角色初始金钱"),
    );
    for (const role of roles) {
      const slug = String(role?.slug || "");
      if (!slug) throw new SaveCodecError("角色 ROM 初始值缺少 slug");
      const nameFieldId = `save.slot.${slot}.role.${slug}.name_codes`;
      const nameRecord = fieldRecord(byteMap, nameFieldId);
      const namePayload = hexByteSequence(
        defaultNames.get(Number(role.id))?.raw_hex,
        4,
        `${slug} 默认姓名`,
      );
      const terminator = nameRecord.binding?.terminator ?? 0x9f;
      if (!Number.isInteger(terminator) || terminator < 0 || terminator > 0xff) {
        throw new SaveCodecError(`${nameFieldId} 缺少姓名终止符`);
      }
      writeInitialField(
        output,
        byteMap,
        nameFieldId,
        [...namePayload, terminator],
      );
      for (const field of ROM_INITIAL_ROLE_FIELDS) {
        writeInitialField(
          output,
          byteMap,
          `save.slot.${slot}.role.${slug}.${field}`,
          semanticInteger(role[field], `${slug}.${field}`),
        );
      }
      for (const field of ["equipment", "inventory"]) {
        writeInitialField(
          output,
          byteMap,
          `save.slot.${slot}.role.${slug}.${field}`,
          semanticBytes(role[field], 8, `${slug}.${field}`),
        );
      }
    }

    for (let vehicleSlot = 0; vehicleSlot < 11; vehicleSlot += 1) {
      const prefix = `save.slot.${slot}.vehicle.${vehicleSlot}`;
      writeInitialField(output, byteMap, `${prefix}.chassis_weight`,
        ROM_INITIAL_CHASSIS_WEIGHT[vehicleSlot]);
      writeInitialField(output, byteMap, `${prefix}.sp`,
        ROM_INITIAL_SP[vehicleSlot]);
      writeInitialField(output, byteMap,
        `${prefix}.mount_mask_raw`, ROM_INITIAL_MOUNT_MASK);
    }

    for (let vehicleSlot = 0; vehicleSlot < 8; vehicleSlot += 1) {
      writeInitialField(output, byteMap,
        `save.slot.${slot}.vehicle.${vehicleSlot}.name_codes`,
        [...NEW_GAME_UNNAMED_VEHICLE_CODES]);
    }
    for (const vehicleSlot of [8, 9, 10]) {
      writeInitialField(output, byteMap,
        `save.slot.${slot}.vehicle.${vehicleSlot}.name_codes`,
        [...ROM_INITIAL_RENTAL_NAME_CODES]);
    }

    for (const placement of placements) {
      const vehicleSlot = semanticInteger(
        placement.vehicle_slot,
        "战车初始停放槽",
      );
      const prefix = `save.slot.${slot}.field_object.${vehicleSlot}`;
      writeInitialField(
        output,
        byteMap,
        `${prefix}.scene_id`,
        placement.placed
          ? semanticInteger(placement.scene_id, `${prefix}.scene_id`)
          : 0xff,
      );
      writeInitialField(
        output,
        byteMap,
        `${prefix}.x`,
        semanticInteger(placement.x, `${prefix}.x`),
      );
      writeInitialField(
        output,
        byteMap,
        `${prefix}.y`,
        semanticInteger(placement.y, `${prefix}.y`),
      );
      writeInitialField(output, byteMap, `${prefix}.state_raw`,
        vehicleSlot === 6 ? 0 : 2);
    }
    for (const disabled of disabledVehicleSlots) {
      const vehicleSlot = semanticInteger(disabled.slot, "停用战车槽");
      const coordinates = ROM_INITIAL_DISABLED_OBJECT_COORDS[vehicleSlot];
      if (!coordinates) {
        throw new SaveCodecError(`停用战车槽不在 ROM 初始化域：${vehicleSlot}`);
      }
      const marker = Number.isSafeInteger(disabled.marker)
        ? disabled.marker
        : typeof disabled.marker_hex === "string" &&
          /^0x[0-9a-f]+$/i.test(disabled.marker_hex)
          ? Number.parseInt(disabled.marker_hex.slice(2), 16)
          : Number.NaN;
      writeInitialField(
        output,
        byteMap,
        `save.slot.${slot}.field_object.${vehicleSlot}.scene_id`,
        semanticInteger(marker, `停用战车槽 ${vehicleSlot} 标记`),
      );
      writeInitialField(output, byteMap,
        `save.slot.${slot}.field_object.${vehicleSlot}.x`, coordinates[0]);
      writeInitialField(output, byteMap,
        `save.slot.${slot}.field_object.${vehicleSlot}.y`, coordinates[1]);
      writeInitialField(output, byteMap,
        `save.slot.${slot}.field_object.${vehicleSlot}.state_raw`, 2);
    }
  }
  return finalizeSaveSlots(output, byteMap);
}

export function patchSaveFields(source, edits, {activateSlot = null, byteMap} = {}) {
  const sourceBytes = bytesOf(source, byteMap);
  if (!edits || typeof edits !== "object" || Array.isArray(edits)) {
    throw new SaveCodecError("edits 必须是以 field_id 为键的对象");
  }
  const fields = saveFieldBindings(byteMap);
  const selected = [];
  const touchedSlots = new Set();
  const derivedVehicles = new Map();
  const equippedEdits = new Map();
  for (const [fieldId, value] of Object.entries(edits)) {
    const record = fields.get(fieldId);
    if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
    const slot = record.binding?.slot;
    requireSlot(slot);
    const normalized = normalizedWritableValue(record, value);
    selected.push([record, normalized]);
    touchedSlots.add(slot);
    const column = record.binding?.equipment_column;
    const vehicle = record.binding?.vehicle;
    if (/^save\.slot\.[12]\.vehicle\.\d+\.equipment\.[a-z_0-9]+$/.test(fieldId)
        && Number.isInteger(column) && column >= 0 && column < 6
        && Number.isInteger(vehicle) && vehicle >= 0 && vehicle < 11) {
      derivedVehicles.set(`${slot}:${vehicle}`, {slot, vehicle});
    }
    if (/^save\.slot\.[12]\.vehicle\.\d+\.equipped\.(main_gun|sub_gun|special|c_unit|engine|chassis)$/.test(fieldId)
        && Number.isInteger(vehicle) && vehicle >= 0 && vehicle < 11) {
      derivedVehicles.set(`${slot}:${vehicle}`, {slot, vehicle});
      equippedEdits.set(fieldId, normalized);
    }
  }
  if (activateSlot !== null) {
    requireSlot(activateSlot);
    touchedSlots.add(activateSlot);
  }
  // Do not call the possibly overridden slice() of a Uint8Array subclass
  // (notably Node.js Buffer); patching must always own a detached copy.
  const output = new Uint8Array(sourceBytes);
  for (const [record, value] of selected) {
    writeNormalizedField(output, record, value, byteMap);
  }
  for (const {slot, vehicle} of derivedVehicles.values()) {
    const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
    const mask = fields.get(`${prefix}equipped_mask_raw`);
    if (mask?.binding?.derivation !== "vehicle-equipped-bits") {
      throw new SaveCodecError(`${prefix}equipped_mask_raw 缺少逐位声明`);
    }
    const maskAddress = addressOf(mask, output.length);
    let equipped = output[maskAddress.offset];
    const names = ["main_gun", "sub_gun", "special", "c_unit", "engine", "chassis"];
    for (let column = 0; column < 6; column += 1) {
      const item = [...fields.values()].find(record =>
        record.binding?.slot === slot && record.binding?.vehicle === vehicle
        && record.binding?.equipment_column === column
        && record.field_id.startsWith(`${prefix}equipment.`));
      if (!item) throw new SaveCodecError(`${prefix}equipment 缺少物理列 ${column}`);
      const itemAddress = addressOf(item, output.length);
      if (output[itemAddress.offset] === 0) {
        if (equippedEdits.get(`${prefix}equipped.${names[column]}`) === 1) {
          throw new SaveCodecError(`${prefix}equipped.${names[column]} 不可装备空物品列`);
        }
        equipped &= ~(0x80 >> column);
      }
    }
    output[maskAddress.offset] = equipped;
  }
  for (const slot of [...touchedSlots].sort()) {
    const slotAddress = addressOf(rangeRecord(byteMap, `save.slot.${slot}.record`), output.length);
    const marker = metadataRecord(byteMap, slot, "valid_marker");
    writeMetadataByte(output, marker, marker.binding.expected);
    const checksum = computeSlotChecksum(output.slice(slotAddress.offset, slotAddress.endExclusive));
    writeMetadataByte(output, metadataRecord(byteMap, slot, "checksum_low"), checksum & 0xff);
    writeMetadataByte(output, metadataRecord(byteMap, slot, "checksum_high"), checksum >> 8);
  }
  if (activateSlot !== null) {
    writeMetadataByte(output, fieldRecord(byteMap, "save.directory.selected_slot"), activateSlot);
  }
  return output;
}

export function equipSaveVehicleCarryMain(source, {slot, vehicle, column, items, byteMap} = {}) {
  requireSlot(slot);
  if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle >= 11 || ![6, 7].includes(column)) {
    throw new SaveCodecError("战车携带列须为第 7 或第 8 列");
  }
  const fields = saveFieldBindings(byteMap);
  const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
  const names = {0: "main_gun", 1: "sub_gun", 6: "generic_7", 7: "generic_8"};
  const itemAt = index => {
    const record = fields.get(`${prefix}equipment.${names[index]}`);
    if (record?.status !== "exact" || record.binding?.editable !== true
        || record.binding?.slot !== slot || record.binding?.vehicle !== vehicle
        || record.binding?.equipment_column !== index) {
      throw new SaveCodecError(`战车装备物品列 ${index + 1} 未发布为精确可写字段`);
    }
    return record;
  };
  const stateAt = index => {
    const record = fields.get(`${prefix}equipment_state.${names[index]}`);
    if (!record || record.binding?.slot !== slot || record.binding?.vehicle !== vehicle
        || record.binding?.equipment_column !== index) {
      throw new SaveCodecError(`战车装备状态列 ${index + 1} 未发布`);
    }
    return record;
  };
  const firstItem = itemAt(0), freeItem = itemAt(1), carriedItem = itemAt(column);
  const firstState = stateAt(0), freeState = stateAt(1), carriedState = stateAt(column);
  const output = new Uint8Array(bytesOf(source, byteMap));
  const at = record => {
    const address = addressOf(record, output.length);
    if (address.length !== 1 || record.resource_owner?.resource_id !== "save-vehicle") {
      throw new SaveCodecError(`战车装备字段物理绑定无效：${record.field_id}`);
    }
    return address.offset;
  };
  const firstItemAt = at(firstItem), freeItemAt = at(freeItem), carriedItemAt = at(carriedItem);
  const firstStateAt = at(firstState), freeStateAt = at(freeState), carriedStateAt = at(carriedState);
  if (firstItemAt - firstStateAt !== 242 || freeItemAt - freeStateAt !== 242
      || carriedItemAt - carriedStateAt !== 242
      || freeItemAt - firstItemAt !== 11 || carriedItemAt - firstItemAt !== column * 11) {
    throw new SaveCodecError("战车装备物品与逐列状态的发布关系不一致");
  }
  const mask = fields.get(`${prefix}equipped.main_gun`);
  const maskValue = mask ? output[at(mask)] : 0;
  if (mask?.binding?.bit_mask !== 0x80 || mask.binding?.slot !== slot
      || mask.binding?.vehicle !== vehicle || (maskValue & 0xc3) !== 0x80) {
    throw new SaveCodecError("当前战车主炮装备状态超出已查实范围");
  }
  const oldItem = output[firstItemAt], nextItem = output[carriedItemAt];
  const mainGun = id => Array.isArray(items) && items.some(item => Number(item.id) === id
    && Array.isArray(item.mountable_slots) && item.mountable_slots.length === 1
    && item.mountable_slots[0] === "main_gun");
  if (!mainGun(oldItem) || !mainGun(nextItem) || output[freeItemAt] !== 0
      || output[freeStateAt] !== 0 || output[carriedStateAt] !== 0) {
    throw new SaveCodecError("第 7、8 列主炮替换仅支持已查实的空第二列状态");
  }
  const otherColumn = column === 6 ? 7 : 6;
  if (output[at(itemAt(otherColumn))] !== 0 || output[at(stateAt(otherColumn))] !== 0) {
    throw new SaveCodecError("第 7、8 列的另一携带列须为空");
  }
  for (const [index, name] of ["special", "c_unit", "engine", "chassis"].entries()) {
    const equipmentColumn = index + 2;
    const itemRecord = fields.get(`${prefix}equipment.${name}`);
    const stateRecord = fields.get(`${prefix}equipment_state.${name}`);
    if (itemRecord?.binding?.equipment_column !== equipmentColumn
        || stateRecord?.binding?.equipment_column !== equipmentColumn) {
      throw new SaveCodecError(`战车装备列 ${equipmentColumn + 1} 未发布`);
    }
    const id = output[at(itemRecord)], state = output[at(stateRecord)];
    const mounted = Boolean(maskValue & (0x80 >> equipmentColumn));
    if (id === 0 ? mounted || state !== 0 : !mounted || !items.some(item =>
      Number(item.id) === id && item.mountable_slots?.length === 1
      && item.mountable_slots[0] === name)) {
      throw new SaveCodecError("战车其余部件须已按部件列装载");
    }
  }
  output[firstItemAt] = nextItem;
  output[freeItemAt] = oldItem;
  output[carriedItemAt] = 0;
  output[freeStateAt] = output[firstStateAt];
  output[firstStateAt] = 0;
  const slotAddress = addressOf(rangeRecord(byteMap, `save.slot.${slot}.record`), output.length);
  const checksum = computeSlotChecksum(output.slice(slotAddress.offset, slotAddress.endExclusive));
  writeMetadataByte(output, metadataRecord(byteMap, slot, "checksum_low"), checksum & 0xff);
  writeMetadataByte(output, metadataRecord(byteMap, slot, "checksum_high"), checksum >> 8);
  return output;
}

/** 只在字节地图发布精确的 00/25 取值域后切换槽标记。 */
export function setSaveSlotActivation(source, slot, active, byteMap) {
  requireSlot(slot);
  if (typeof active !== "boolean") {
    throw new SaveCodecError("存档槽激活值必须是布尔值");
  }
  const output = new Uint8Array(bytesOf(source, byteMap));
  const marker = metadataRecord(byteMap, slot, "valid_marker");
  validateWritable(marker);
  const expected = marker.binding?.expected;
  const allowed = marker.binding?.allowed_raw_values;
  if (expected !== 0x25 || !Array.isArray(allowed)
      || allowed.length !== 2 || allowed[0] !== 0 || allowed[1] !== expected) {
    throw new SaveCodecError(`${marker.field_id} 未发布精确的 00/25 激活取值域`);
  }
  writeMetadataByte(output, marker, active ? expected : 0);
  return output;
}

// 系统预览的文件操作只返回独立字节，复用存档字段对象的范围与校验。
export function previewSaveFileOperation(source, {operation, slot, from = slot}, byteMap) {
  requireSlot(slot); requireSlot(from);
  const output = new Uint8Array(bytesOf(source, byteMap));
  const range = (number, suffix) => addressOf(rangeRecord(byteMap, `save.slot.${number}.${suffix}`), output.length);
  if (operation === 'delete') {
    const checksum = metadataRecord(byteMap, slot, 'checksum_low');
    writeMetadataByte(output, checksum, (readRecord(output, checksum) + 1) & 255);
    writeMetadataByte(output, metadataRecord(byteMap, slot, 'valid_marker'), 0);
    output[fieldRecord(byteMap, `save.slot.${slot}.role.hunter.name_codes`).address.offset] = 159;
    output[fieldRecord(byteMap, `save.slot.${slot}.role.hunter.level`).address.offset] = 0;
    return output;
  }
  if (!['clone', 'save'].includes(operation)) throw new SaveCodecError('预览文件操作无效');
  if (operation === 'clone' && !getSaveSlotStatus(output, from, byteMap).valid) throw new SaveCodecError('来源存档无效');
  const suffixes = operation === 'clone' ? ['record'] : ['segment.active-save', 'segment.global-event-flags',
    'segment.treasure-flags', 'segment.field-object-state', 'segment.field-location'];
  for (const suffix of suffixes) {
    const left = range(from, suffix), right = range(slot, suffix);
    if (left.length !== right.length) throw new SaveCodecError('预览文件范围不匹配');
    output.set(output.slice(left.offset, left.endExclusive), right.offset);
  }
  writeMetadataByte(output, metadataRecord(byteMap, slot, 'valid_marker'),
    metadataRecord(byteMap, slot, 'valid_marker').binding.expected);
  const destination = range(slot, 'record');
  const checksum = computeSlotChecksum(output.slice(destination.offset, destination.endExclusive));
  writeMetadataByte(output, metadataRecord(byteMap, slot, 'checksum_low'), checksum & 255);
  writeMetadataByte(output, metadataRecord(byteMap, slot, 'checksum_high'), checksum >> 8);
  return output;
}

export function previewSaveFileFields(source, byteMap) {
  const bindings = saveFieldBindings(byteMap);
  return Object.fromEntries([1, 2].flatMap(slot => ['name_codes', 'level', 'present'].map(field => {
    const id = `save.slot.${slot}.role.hunter.${field}`;
    return [id, readSaveBoundField(source, bindings.get(id), byteMap)];
  })));
}

export function changedSaveOffsets(before, after, byteMap) {
  const left = bytesOf(before, byteMap);
  const right = bytesOf(after, byteMap);
  const result = [];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) result.push(index);
  }
  return result;
}
