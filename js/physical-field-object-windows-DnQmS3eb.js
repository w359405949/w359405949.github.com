import { projectFieldDraftRevision, createRuntimeFieldState, formatPhysicalAddress, createAutoSave, fixedRuntimeTextBytes, saveNameTextSource, decodeFixedRuntimeText, db, ADDRESS_SPACE_IDS, createPrgPhysicalFieldObjects, loadByteMapIndex, byteMapSpaceDescriptor, loadByteMapBank, byteMapBankDescriptor, loadAllByteMapRecordPages, loadByteMapRecordPagesForOffsets, loadedByteMapRecordPages, buildRomMapPrgAnnotations, projectPrgFieldObjects } from './prg-loaders-DnCSmXk9.js';
import { applyJsonChanges } from './visual-metasprites-IDA0o2Z8.js';
import { loadPhysicalFieldSourceIndex } from './baseline-assembly-DW8BWbDB.js';
import { state } from './emulator-Bpa8EsFw.js';

// @editor-module 在存档相机原点与角色所在地图格之间换算。
const AXES = Object.freeze({x: 8, y: 7});

function byte(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 255)
    throw new RangeError(`${label} 须为 0–255 的整数`);
  return value;
}

function playerTileFromSaveCamera(cameraX, cameraY) {
  return {
    x: (byte(cameraX, "相机 X") + AXES.x) & 0xff,
    y: (byte(cameraY, "相机 Y") + AXES.y) & 0xff,
  };
}

function saveCameraFromPlayerTile(x, y) {
  return {
    cameraX: (byte(x, "角色 X") - AXES.x + 256) & 0xff,
    cameraY: (byte(y, "角色 Y") - AXES.y + 256) & 0xff,
  };
}

// @editor-module 存档状态位与死亡标记引用所属状态字节。

const EVIDENCE = 'project/evidence/field-poison-status/observations.json';

function saveFieldStatusRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.status$/.exec(id);
  const vehicle = /^save\.slot\.([12])\.vehicle\.(\d+)\.condition_raw$/.exec(id);
  if (!role && !vehicle) return null;
  const entity = role || vehicle;
  if (record.address?.space !== 'sram' || record.address.length !== 1
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(entity[1])
      || (role && record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
      || (vehicle && (Number(vehicle[2]) > 10 || record.binding.vehicle !== Number(vehicle[2])))) {
    throw new TypeError(`状态字段声明无效：${id}`);
  }
  const bit = role ? 3 : 2;
  const fieldId = id.replace(/\.(status|condition_raw)$/, '.acid');
  const label = `${record.binding.label.replace(/状态位$/, '')}酸蚀`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: record.resource_owner ? {...record.resource_owner,
      role: `field:${fieldId}`} : undefined,
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    address_meaning: record.address_meaning?.replace(record.binding.label, label),
    aliases: [...(record.aliases || []), label, '酸蚀'],
    algorithm_detail: `读取 bit ${bit}；写入时只改变掩码 $${role ? '08' : '04'}，并重算所属槽校验和。${
      role ? '死亡标记 $FF 不显示酸蚀且禁止开启。' : ''}`,
    confidence: 'static-disassembly-and-mesen-trace-confirmed',
    status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label,
      detail: `bit ${bit}；步行每格扣 ${role ? 'HP' : 'SP'} 1，其他位保持原值。`},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: bit, bit_mask: 1 << bit,
      status_parent_field: id, ...(role ? {excluded_raw_value: 255} : {}),
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []), EVIDENCE]},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/(status|condition_raw)$/, 'acid'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

function saveRoleDeathRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.status$/.exec(id);
  if (!role) return null;
  if (record.resource_owner?.resource_id !== 'save-role'
      || record.address?.space !== 'sram' || record.address.length !== 1
      || record.address.offset !== (Number(role[1]) === 1 ? 0x800 : 0xc00)
        + 0x7b + ['hunter', 'mechanic', 'soldier'].indexOf(role[2])
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(role[1])
      || record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
    throw new TypeError(`死亡字段声明无效：${id}`);
  const fieldId = id.replace(/\.status$/, '.dead');
  const label = `${record.binding.label.replace(/状态位$/, '')}死亡标记`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: {...record.resource_owner, role: `field:${fieldId}`},
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '死亡'],
    algorithm_detail: '状态字节等于 $FF 表示死亡，开启写 $FF，关闭死亡写 $00，存活时关闭保留状态字节。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'marker', meaning: label,
      detail: '死亡由 HP 归零写 $FF，复活清状态为 $00。'},
    binding: {...record.binding, encoding: 'marker', control: 'checkbox', label,
      editable: true, min: 0, max: 1, marker_value: 255, clear_value: 0,
      status_parent_field: id, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/death.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/status$/, 'dead'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

function saveRoleNumbRecord(record) {
  if (!saveRoleDeathRecord(record)) return null;
  const id = record.field_id;
  const fieldId = id.replace(/\.status$/, '.numb');
  const label = `${record.binding.label.replace(/状态位$/, '')}麻木标志`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: {...record.resource_owner, role: `field:${fieldId}`},
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '麻木'],
    algorithm_detail: '麻木读取状态字节 bit 7，死亡标记 $FF 除外；写入保留其余位并重算所属槽校验和。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label, detail: 'bit 7 表示麻木。'},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: 7, bit_mask: 0x80,
      excluded_raw_value: 255, status_parent_field: id,
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/numb.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/status$/, 'numb'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

function saveRoleDrivingRecord(record) {
  const id = record?.field_id || '';
  const role = /^save\.slot\.([12])\.role\.(hunter|mechanic|soldier)\.present$/.exec(id);
  if (!role) return null;
  if (record.address?.space !== 'sram' || record.address.length !== 1
      || record.binding?.encoding !== 'u8' || record.binding.slot !== Number(role[1])
      || record.binding.role !== ['hunter', 'mechanic', 'soldier'].indexOf(role[2]))
    throw new TypeError(`乘车字段声明无效：${id}`);
  const fieldId = id.replace(/\.present$/, '.driving');
  const label = `${record.binding.label.replace(/在队(?:标志)?$/, '')}乘车标志`;
  return {...record, field_id: fieldId, search_key: fieldId,
    record: label, meaning: label, value_meaning: label,
    resource_owner: record.resource_owner ? {...record.resource_owner,
      role: `field:${fieldId}`} : undefined,
    semantic_path: [...(record.semantic_path || []).slice(0, -1), label],
    aliases: [...(record.aliases || []), label, '乘车'],
    algorithm_detail: '乘车读取在队字节的 bit 7，写入保留其他位并重算所属槽校验和。',
    confidence: 'static-disassembly-and-mesen-trace-confirmed', status: 'exact', category: 'config',
    apply_order: Number(record.apply_order || 100) + 1,
    field: {...record.field, encoding: 'bit', meaning: label,
      detail: 'bit 7 表示人物乘车，当前战车引用及取得状态须有效。'},
    binding: {...record.binding, encoding: 'bit', control: 'checkbox', label,
      editable: true, min: 0, max: 1, bit_index: 7, bit_mask: 0x80,
      status_parent_field: id, driving_vehicle_field: id.replace(/\.present$/, '.current_vehicle'),
      driving_status_field: id.replace(/\.present$/, '.status'),
      preserve_other_bits: true, recompute_slot_checksum: true},
    source: {...record.source, evidence: [...(record.source?.evidence || []),
      'project/evidence/reverse-engineering/shop-facility-state-sources/driving.json']},
    resource_address_bindings: (record.resource_address_bindings || []).map(binding =>
      ({...binding, primary: false, role: binding.role?.replace(/present$/, 'driving'),
        display_priority: Number(binding.display_priority || 0) + 0.5})),
  };
}

// @editor-module 按统一字节地图读取、修改 SRAM 字段并生成初始存档与校验和。


const SAVE_ADDRESS_SPACE = "sram";

// Persistence is an opaque projection of the already decoded byte buffer.
// The existing Working diff stores the current file only when it differs;
// no second SRAM layout or field writer is introduced here.
function saveCurrentValue(bytes, name = "metalmaxcn-current.sav", drafts = {}) {
  // A loaded/edited file remains the current file when ROM defaults change.
  // Keep that opaque value atomic in Working; field patches still belong here.
  return {bytes: Array.from(bytes), name, drafts};
}

/** 按已声明字段把本次存档修改写到最新字节；共享字节保留其它字段的位。 */
function applySaveCurrentChanges(current, previous, next, byteMap, fieldIds = []) {
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

function saveCurrentDrafts(value, byteMap) {
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

function saveCurrentBytes(value, initial) {
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

class SaveCodecError extends Error {
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

function saveAddressSpace(document_) {
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

function saveAnnotations(document_) {
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

function saveFieldBindings(document_) {
  return new Map(indexedSaveFieldBindings(document_));
}

// 牵引战车描述符取已发布存档实体尾表的第四项。
function readSaveTowedVehicle(bytes, byteMap, slot = 1) {
  const values = readSaveField(bytes, `save.slot.${slot}.entity_scene_object_slots`, byteMap);
  return values[3];
}

function saveRuntimeMemory({byteMap, saveValue, slot = 1}) {
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
      ...(record.binding.extension_signature ? readRecord(bytes, source)
        : bytes.slice(source.address.offset, source.address.end_exclusive)));
  }
  return memory;
}

// 现场只使用符号表的运行地址；存档编辑许可不授予现场推测语义的权限。
function createSaveRuntimeState({byteMap, memory = {}, resourceId, runtimeDocument}) {
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
  if (resourceId === "save-container") {
    const declaredIds = new Set(definitions.map(spec => spec.id));
    for (const spec of definitions.filter(spec => spec.id.startsWith("save.active.teleport_destination.")
      && spec.bound.binding.encoding === "bit" && Number.isInteger(spec.bound.binding.flag_id))) {
      const id = `save.active.global_event_flag.${spec.bound.binding.flag_id.toString(16).toUpperCase().padStart(2, "0")}`;
      if (declaredIds.has(id)) continue;
      definitions.push({...spec,
        id});
      declaredIds.add(id);
    }
  }
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
    const signature = record.binding?.extension_signature;
    if (signature && !signature.every((byte, index) => bytes[address.endExclusive + index] === byte))
      return new Uint8Array(address.length);
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

function readSaveField(value, fieldId, byteMap) {
  return readSaveBoundField(value, fieldRecord(byteMap, fieldId), byteMap);
}

function readSaveBoundField(value, record, byteMap) {
  const bytes = bytesOf(value, byteMap);
  return readRecord(bytes, record);
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

function getSaveSlotStatus(value, slot, byteMap) {
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
  if (!["u8", "u16le", "u24le", "bytes", "bitset", "bit", "marker"].includes(record.binding?.encoding)) {
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

function normalizeSaveDraftFieldValue(record, value) {
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
  if (["bytes", "bitset"].includes(encoding) && value instanceof Uint8Array) {
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
function recomputeSaveChecksums(value, byteMap) {
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

function saveVehicleAcquisitionFlag(fieldId) {
  const match = /^save\.slot\.([12])\.global_event_flag\.0([89A-F])$/.exec(fieldId);
  return match ? {slot: Number(match[1]), vehicle: parseInt(match[2], 16) - 8} : null;
}

// 自有战车从 18:0390 进入初始化，保留重量、SP、姓名、道具与额外携带列。
function saveVehicleAcquisitionTemplate(vehicle, inputs) {
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
function saveRentalVehicleTemplate(presetId, inputs) {
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
function saveVehicleMenuInitialValues(presetId, inputs) {
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
function fillSaveRentalVehicle(source, {slot, vehicle, presetId, template, byteMap}) {
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

function saveVehicleAcquisitionField(fieldId) {
  const match = /^save\.slot\.([12])\.vehicle\.([0-7])\.(.+)$/.exec(fieldId);
  if (!match) return null;
  const suffix = match[3];
  const overwritten = ["defense", "ammo_capacity", "equipped_mask_raw", "mount_mask_raw", "condition_raw", "acid"]
    .includes(suffix) || /^(?:equipment|equipment_state|equipped|mount_permission)\.(?:main_gun|sub_gun|special|c_unit|engine|chassis)$/.test(suffix)
    || /^(?:main_gun|sub_gun|special|c_unit|engine|chassis)_damaged$/.test(suffix)
    || /^shell_(?:type|count)\.[0-5]$/.test(suffix);
  return overwritten ? {slot: Number(match[1]), vehicle: Number(match[2]), suffix} : null;
}

function saveVehicleAcquired(bytes, slot, vehicle, byteMap) {
  return Boolean(readSaveField(bytes,
    `save.slot.${slot}.global_event_flag.${(vehicle + 8).toString(16).toUpperCase().padStart(2, "0")}`, byteMap));
}

// 取得是存档域的关联写入，内部初始化不扩大单字段的写入许可。
function setSaveVehicleAcquisition(source, initial, {slot, vehicle, acquired, template, byteMap}) {
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
function createRomInitialSave(byteMap, {characters, vehicles, textSlots}) {
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

function patchSaveFields(source, edits, {activateSlot = null, byteMap} = {}) {
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
    if (record.binding.extension_signature) {
      const address = addressOf(record, output.length);
      output.set(record.binding.extension_signature, address.endExclusive);
    }
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

function equipSaveVehicleCarryMain(source, {slot, vehicle, column, items, byteMap} = {}) {
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
function setSaveSlotActivation(source, slot, active, byteMap) {
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
function previewSaveFileOperation(source, {operation, slot, from = slot}, byteMap) {
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

function previewSaveFileFields(source, byteMap) {
  const bindings = saveFieldBindings(byteMap);
  return Object.fromEntries([1, 2].flatMap(slot => ['name_codes', 'level', 'present'].map(field => {
    const id = `save.slot.${slot}.role.hunter.${field}`;
    return [id, readSaveBoundField(source, bindings.get(id), byteMap)];
  })));
}

function changedSaveOffsets(before, after, byteMap) {
  const left = bytesOf(before, byteMap);
  const right = bytesOf(after, byteMap);
  const result = [];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) result.push(index);
  }
  return result;
}

// @editor-module 为存档未细分的物理字节建立无写入许可的字段对象。

function validAddress(address, length) {
  const start = Number(address?.offset);
  const end = Number(address?.end_exclusive);
  return address?.space === "sram" && Number.isInteger(start) && start >= 0
    && Number.isInteger(end) && end > start && end <= length
    && Number(address.length) === end - start;
}

function createSavePhysicalFieldObjects(document_, fields, state_) {
  const length = Number(document_?.address_spaces?.find(space => space.id === "sram")?.length);
  if (!Number.isInteger(length) || length < 1 || !Array.isArray(fields)) {
    throw new TypeError("存档物理字段对象缺少地址空间或字段目录");
  }
  const assigned = Array(length).fill(null);
  const knownFields = new Set(fields);
  for (const field of fields) {
    const address = field.physical;
    if (!validAddress(address, length)) throw new TypeError(`${field.id} 缺少有效 SRAM 物理范围`);
    for (let offset = address.offset; offset < address.end_exclusive; offset += 1) {
      assigned[offset] ||= field;
    }
  }
  const candidates = (document_.annotations || [])
    .filter(record => validAddress(record?.address, length)
      && record.resource_owner?.resource_id && record.resource_owner?.role)
    .sort((left, right) =>
      Number(left.address.length) - Number(right.address.length)
        || Number(right.apply_order || 0) - Number(left.apply_order || 0));
  for (const record of candidates) {
    const {offset: start, end_exclusive: end} = record.address;
    for (let offset = start; offset < end; offset += 1) assigned[offset] ||= record;
  }
  const gaps = [];
  for (let start = 0; start < length;) {
    if (knownFields.has(assigned[start])) {start += 1; continue;}
    const source = assigned[start];
    let end = start + 1;
    while (end < length && assigned[end] === source && !knownFields.has(assigned[end])) end += 1;
    const physical = Object.freeze({space: "sram", offset: start,
      length: end - start, end_exclusive: end});
    const id = `sram.physical:${start.toString(16).padStart(4, "0")}-${end.toString(16).padStart(4, "0")}`;
    gaps.push(Object.freeze({
      id, resourceId: source?.resource_owner?.resource_id || "sram.unassigned",
      role: source?.resource_owner?.role || null,
      physical, meaning: source?.field?.meaning || source?.record || "未细分 SRAM 字节",
      writeback: Object.freeze({state: "unpermitted"}),
      get origin() {return state_.saveRomInitialBytes?.slice(start, end) || null;},
      get working() {return state_.saveCurrentBytes?.slice(start, end) || null;},
      get edited() {
        const origin = this.origin, working = this.working;
        return origin instanceof Uint8Array && working instanceof Uint8Array
          && origin.some((value, index) => value !== working[index]);
      },
    }));
    start = end;
  }
  const objects = Object.freeze([...fields, ...gaps]);
  const covered = new Uint8Array(length);
  const byByte = Array(length).fill(null);
  for (const object of objects) {
    const {offset, end_exclusive: end} = object.physical;
    covered.fill(1, offset, end);
    for (let at = offset; at < end; at += 1) byByte[at] ||= object;
  }
  const rangeById = new Map();
  for (const record of document_.annotations || []) {
    if (!record?.range_id || !validAddress(record.address, length)) continue;
    rangeById.set(record.range_id, Object.freeze({
      range_id: record.range_id, address: Object.freeze({...record.address}),
      record: record.record || "", semantic_path: Object.freeze([...(record.semantic_path || [])]),
      apply_order: Number(record.apply_order || 0),
    }));
  }
  const rangeViews = Object.freeze([...rangeById.values()].sort((left, right) =>
    left.address.offset - right.address.offset
      || right.address.length - left.address.length
      || left.range_id.localeCompare(right.range_id)));
  const rangesByObject = new Map();
  for (const range of rangeViews) {
    const seen = new Set();
    for (let at = range.address.offset; at < range.address.end_exclusive; at += 1) {
      const object = byByte[at];
      if (!object || seen.has(object)) continue;
      seen.add(object);
      if (!rangesByObject.has(object)) rangesByObject.set(object, []);
      rangesByObject.get(object).push(range);
    }
  }
  return Object.freeze({objects, byByte: Object.freeze(byByte), rangeViews,
    rangesByObject, total: length,
    uncovered: covered.reduce((count, value) => count + (value ? 0 : 1), 0)});
}

function adaptedOwner(value) {
  if (!value?.resource_id || !value?.role) return null;
  return {
    resourceId: String(value.resource_id), role: String(value.role),
    ...(value.element_index == null ? {} : {elementIndex: Number(value.element_index)}),
    ...(value.element_count == null ? {} : {elementCount: Number(value.element_count)}),
  };
}

function presentation(record) {
  const address = record.address || {};
  return {
    status: record.status || "classified",
    category: record.category || "data",
    moduleId: record.module_id || null,
    moduleIds: record.module_id ? [record.module_id] : [],
    block: {
      id: record.block_id || record.range_id || null,
      label: record.block_label || record.record || null,
      roundtrip: Boolean(record.writeback_path),
      web_editable: record.binding?.editable === true || Boolean(record.web_editable),
    },
    field: {
      encoding: record.binding?.encoding || record.field?.encoding || "bytes",
      meaning: record.field?.meaning || record.record || "已登记字节",
      detail: record.field?.detail || "",
    },
    fieldId: record.field_id || null,
    rangeId: record.range_id || null,
    binding: record.binding || null,
    rangeStart: Number(address.offset),
    rangeLength: Number(address.length),
    record: record.record || record.field_id || record.range_id || "已登记范围",
    aliases: record.aliases || [],
    resourceOwner: adaptedOwner(record.resource_owner),
    resourceIds: record.resource_ids || [],
    valueAliases: record.value_aliases || [],
    addressMeaning: record.address_meaning
      || [record.record, record.field?.meaning].filter(Boolean).join(" · "),
    algorithmDetail: record.algorithm_detail || "",
    decodedLabel: record.decoded_label,
    valueDescription: record.decoded_label,
    writebackPath: record.writeback_path || null,
    searchKey: record.search_key || record.field_id || record.range_id
      || `${formatPhysicalAddress(address.space, address.offset)}+${Number(address.length).toString(16).toUpperCase()}`,
    mergeGroupId: record.merge_group_id || null,
    semanticPath: Array.isArray(record.semantic_path) ? record.semantic_path.slice() : [],
    semanticDomain: record.semantic_domain || null,
    mirrorOfFieldId: record.mirror_of_field_id || null,
  };
}

function projectSavePhysicalAnnotations(document_, catalog) {
  const projected = Array(catalog.total).fill(null);
  const records = (document_.annotations || [])
    .filter(record => record?.address?.space === "sram")
    .slice()
    .sort((left, right) => Number(left.apply_order || 0) - Number(right.apply_order || 0));
  for (const record of records) {
    const address = record.address;
    if (!validAddress(address, catalog.total)) throw new TypeError("SRAM 注解范围无效");
    const adapted = presentation(record);
    for (let at = address.offset; at < address.end_exclusive; at += 1) {
      const fieldObject = catalog.byByte[at];
      if (!fieldObject) throw new Error(`SRAM ${at} 缺少字段对象`);
      projected[at] = {...adapted, fieldObject};
    }
  }
  return projected;
}

// @editor-module 衔接项目 ROM 初值与当前存档，恢复和持久化存档 Working。
// Browser SAVE build companion for the ROM linker.
//
// The project repository owns the original ROM semantic assets. The unified
// byte map owns every SRAM address and codec. This module only joins those two
// authorities and restores/persists the one current save through Working.


const SAVE_BUILD_BLOB_PREFIX = "save-build:";
const SAVE_BUILD_MEDIA_TYPE = "application/octet-stream";

function saveWorkspaceChanged(state_) {
  return state_.saveRomInitialBytes instanceof Uint8Array
    && state_.saveCurrentBytes instanceof Uint8Array
    && (Boolean(Object.keys(state_.saveDraftFields || {}).length)
      || !equalBytes(state_.saveRomInitialBytes, state_.saveCurrentBytes));
}

const workingQueues = new WeakMap();
const workspaceListeners = new WeakMap();
const workspaceBindings = new WeakMap();

function notifySaveWorkspace(state_) {
  for (const binding of workspaceBindings.get(state_) || []) {
    const target = binding.target.deref();
    if (!target || target.isConnected === false) {workspaceBindings.get(state_).delete(binding); continue;}
    const value = JSON.stringify([binding.object.value, binding.object.edited]);
    if (value === binding.value) continue;
    binding.value = value;
    try {binding.render(target);} catch (error) {console.error(error);}
  }
  workspaceListeners.get(state_)?.();
}

function applySaveChanges(state_, current, previous, next, fieldIds = []) {
  const value = applySaveCurrentChanges(current, previous, next, state_.saveByteMapDocument, fieldIds);
  if (state_.saveByteMapDocument && !equalBytes(Uint8Array.from(value.bytes), Uint8Array.from(next.bytes))) {
    let bytes = recomputeSaveChecksums(Uint8Array.from(value.bytes), state_.saveByteMapDocument);
    for (const slot of [1, 2]) bytes = restoreInitialSlotMetadata(bytes, state_.saveRomInitialBytes, state_.saveByteMapDocument, slot);
    value.bytes = Array.from(bytes);
  }
  return value;
}

function publishSaveValue(state_, value, initial) {
  state_.saveCurrentBytes = saveCurrentBytes(value, initial);
  state_.saveDraftFields = saveCurrentDrafts(value, state_.saveByteMapDocument);
  state_.saveCurrentName = value.name;
  state_.saveCurrentSource = saveWorkspaceChanged(state_) ? "edited" : "rom-initial";
}

function saveWorkingQueue(state_) {
  const repository = state_.projectRepository;
  if (!repository?.resolveSaveCurrent || !repository?.saveSaveCurrent) {
    throw new Error("项目仓库尚未提供存档 Working");
  }
  if (!workingQueues.has(repository)) {
    const session = {version: undefined, value: undefined, error: null, queue: null, intents: new Map(), sequence: 0};
    session.queue = createAutoSave(async ({original, value, previousValue, replace, intents, onError}) => {
      try {
        const saved = await repository.saveSaveCurrent(original, value, {
          previousValue: replace ? undefined : previousValue,
          applyChanges: (current, previous, next) => applySaveChanges(state_, current, previous, next, intents.map(([id]) => id)),
        });
        session.version = saved.version;
        session.value = saved.value;
        for (const [id, sequence] of intents) if (session.intents.get(id) === sequence) session.intents.delete(id);
        if (state_.projectRepository === repository) {
          const draft = saveCurrentValue(state_.saveCurrentBytes, state_.saveCurrentName, state_.saveDraftFields);
          publishSaveValue(state_, applySaveChanges(state_, saved.value, value, draft, [...session.intents.keys()]), state_.saveRomInitialBytes);
          notifySaveWorkspace(state_);
        }
        session.error = null;
      } catch (error) {
        session.error = error;
        onError?.(error);
        throw error;
      }
    });
    workingQueues.set(repository, session);
    repository.subscribeWorking?.(() => {
      if (state_.projectRepository !== repository || !state_.saveRomInitialBytes || session.queue.busy) return;
      openSaveWorkspace(state_, state_.saveRomInitialBytes).then(() => notifySaveWorkspace(state_), error => {
        session.error = error;
        state_.saveError = error.message;
        notifySaveWorkspace(state_);
      });
    });
  }
  return workingQueues.get(repository);
}

/**
 * 按 `field_id` 把当前存档的字段恢复成 ROM 初值，并走同一份 Working 排队。
 *
 * 这是存档域自己的「重置」出口：调用方只报 `field_id`，编解码、槽标记与校验和、
 * 排队与失败上报都留在这里。未知 `field_id`、缺字节地图、缺初值或缺当前存档
 * 一律抛错——不静默跳过，也不拿别的字段顶替。
 */
function resetSaveFields(state_, fieldIds, {onError = null} = {}) {
  if (!Array.isArray(fieldIds) || !fieldIds.length) {
    throw new Error("至少需要一个可还原的存档 field_id");
  }
  const byteMap = state_?.saveByteMapDocument;
  const initial = state_?.saveRomInitialBytes;
  const current = state_?.saveCurrentBytes;
  if (!byteMap) throw new Error("存档字节地图尚未就绪");
  if (!(initial instanceof Uint8Array)) throw new Error("ROM 初始存档尚未就绪");
  if (!(current instanceof Uint8Array)) throw new Error("当前存档尚未打开");
  const fields = saveFieldBindings(byteMap);
  const edits = {};
  const drafts = {...state_.saveDraftFields};
  const slots = new Set();
  for (const fieldId of fieldIds) {
    const record = fields.get(fieldId);
    if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
    const original = readSaveField(initial, fieldId, byteMap);
    const writable = record.status === "exact" && record.binding?.editable === true;
    if (record.binding?.derivation === "vehicle-equipped-bits"
        || record.binding?.derivation === "vehicle-mount-permission-bits"
        || record.binding?.derivation === "vehicle-equipment-damage-bit") {
      delete drafts[fieldId];
    } else if (writable) {
      const mask = record.binding?.allowed_changed_mask;
      edits[fieldId] = Number.isInteger(mask)
        ? (readSaveField(current, fieldId, byteMap) & ~mask) | (original & mask)
        : original;
    } else {
      const raw = readSaveField(current, fieldId, byteMap);
      if (raw instanceof Uint8Array && original instanceof Uint8Array
          ? raw.length === original.length && raw.every((byte, index) => byte === original[index])
          : Object.is(raw, original)) delete drafts[fieldId];
      else drafts[fieldId] = original instanceof Uint8Array ? [...original] : original;
    }
    const slot = Number(record.binding?.slot);
    if (writable && (slot === 1 || slot === 2)) slots.add(slot);
  }
  let bytes = Object.keys(edits).length ? patchSaveFields(current, edits, {byteMap}) : current.slice();
  for (const slot of slots) bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
  state_.saveCurrentBytes = bytes;
  state_.saveDraftFields = drafts;
  if (!saveWorkspaceChanged(state_)) {
    state_.saveCurrentSource = "rom-initial";
    state_.saveCurrentName = "metalmaxcn-current.sav";
  } else {
    state_.saveCurrentSource = "edited";
  }
  queueSaveWorking(state_, {onError: onError ?? undefined, fieldIds});
  return bytes;
}

function resetSaveWorkspace(state_, {onError = null} = {}) {
  if (!(state_?.saveRomInitialBytes instanceof Uint8Array)) {
    throw new Error("ROM 初始存档尚未就绪");
  }
  if (!(state_?.saveCurrentBytes instanceof Uint8Array)) {
    throw new Error("当前存档尚未打开");
  }
  state_.saveCurrentBytes = state_.saveRomInitialBytes.slice();
  state_.saveDraftFields = {};
  state_.saveCurrentName = "metalmaxcn-current.sav";
  state_.saveCurrentSource = "rom-initial";
  queueSaveWorking(state_, {onError: onError ?? undefined, replace: true});
  return state_.saveCurrentBytes;
}

/**
 * 整槽与 ROM 初值逐字节相同时，把该槽目录里的标记与校验和放回初值：
 * 否则「恢复成没动过」的槽会被标成有效存档。
 */
function restoreInitialSlotMetadata(bytes, initial, byteMap, slot) {
  const range = saveAnnotations(byteMap).find(record =>
    record?.address?.space === "sram" && record.range_id === `save.slot.${slot}.record`);
  if (!range) throw new SaveCodecError(`存档字节地图缺少 save.slot.${slot}.record 范围`);
  const {offset, end_exclusive: end} = range.address;
  if (!Number.isInteger(offset) || !Number.isInteger(end)) {
    throw new SaveCodecError(`存档槽 ${slot} 的范围地址无效`);
  }
  for (let at = offset; at < end; at += 1) if (bytes[at] !== initial[at]) return bytes;
  const fields = saveFieldBindings(byteMap);
  const output = new Uint8Array(bytes);
  for (const name of ["valid_marker", "checksum_low", "checksum_high"]) {
    const record = fields.get(`save.directory.slot.${slot}.${name}`);
    if (!record) throw new SaveCodecError(`存档字节地图缺少 save.directory.slot.${slot}.${name}`);
    const {offset: at, end_exclusive: to} = record.address ?? {};
    if (!Number.isInteger(at) || !Number.isInteger(to)) {
      throw new SaveCodecError(`save.directory.slot.${slot}.${name} 的地址无效`);
    }
    output.set(initial.slice(at, to), at);
  }
  return output;
}

/** 存档当前值的字段对象入口，字段身份由统一字节地图声明。 */
function createSaveCurrentFieldObjects(state_, {onChanged = null, onError = null,
  vehicleAcquisitionTemplate = null, rentalVehicleTemplate = null} = {}) {
  if (onChanged) workspaceListeners.set(state_, () => onChanged(null));
  let physicalDocument = null;
  let physicalResult = null;
  const complete = () => {
    const document_ = state_.saveByteMapDocument;
    if (document_?.schema === 'metalmaxcn.save-runtime-fields') return false;
    const bank = document_?.loaded_bank_shards?.[0];
    if (!bank) return Array.isArray(document_?.annotations);
    return Array.isArray(document_.loaded_record_pages)
      && document_.loaded_record_pages.length === bank.record_pages.length;
  };
  const pendingPage = offset => {
    const document_ = state_.saveByteMapDocument;
    const bank = document_?.loaded_bank_shards?.[0];
    if (!bank || !Array.isArray(bank.record_pages)) return false;
    const descriptor = bank.record_pages.find(page =>
      Number(page?.address?.offset) <= offset
        && offset < Number(page?.address?.end_exclusive));
    if (!descriptor) return false;
    return !(document_.loaded_record_pages || []).some(page =>
      page.space === descriptor.space && page.bank === descriptor.bank
        && page.page === descriptor.page);
  };
  const load = async ({runtime = false, ...options} = {}) => {
    if (runtime) {
      const {db} = await import('./prg-loaders-DnCSmXk9.js').then(function (n) { return n.projectDb; });
      state_.saveByteMapDocument = await db.getDocument('project.save.fields');
      return;
    }
    const {loadByteMapSpace} = await import('./prg-loaders-DnCSmXk9.js').then(function (n) { return n.physicalFieldObjectDocument; });
    state_.saveByteMapDocument = await loadByteMapSpace("sram", {
      offset: Number(state_.saveSelectedOffset ?? 0), ...options,
    });
  };
  let cachedDocument = null;
  let cachedRecords = null;
  const fieldObjects = new Map();
  const records = () => {
    const document_ = state_.saveByteMapDocument;
    if (document_ !== cachedDocument || !cachedRecords) {
      cachedDocument = document_;
      cachedRecords = saveFieldBindings(document_);
      fieldObjects.clear();
    }
    return cachedRecords;
  };
  const recordOf = fieldId => {
    const record = records().get(fieldId);
    if (!record) throw new SaveCodecError(`未知存档字节地图字段：${fieldId}`);
    return record;
  };
  const emit = message => onChanged?.(message);
  let acquisitionState = null, acquisitionDocument = null;
  const acquisitionStatuses = new Map();
  const vehicleAcquired = (slot, vehicle) => {
    if (acquisitionState !== state_.saveCurrentBytes || acquisitionDocument !== state_.saveByteMapDocument) {
      acquisitionState = state_.saveCurrentBytes;
      acquisitionDocument = state_.saveByteMapDocument;
      acquisitionStatuses.clear();
    }
    const key = `${slot}:${vehicle}`;
    const rental = vehicle >= 8 ? readSaveField(acquisitionState,
      `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`, acquisitionDocument) : null;
    if (!acquisitionStatuses.has(key)) acquisitionStatuses.set(key,
      vehicle < 8 ? saveVehicleAcquired(acquisitionState, slot, vehicle, acquisitionDocument)
        : Number.isInteger(rental) && rental >= 8 && rental <= 17);
    return acquisitionStatuses.get(key);
  };
  const clearRentalDrafts = (drafts, current, bytes, {slot, vehicle, presetId}) => {
    const template = rentalVehicleTemplate?.(presetId);
    const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
    for (const [id, record] of records()) {
      const initialized = id === `${prefix}name_codes`
        || (id.startsWith(prefix) && Object.hasOwn(template, id.slice(prefix.length)))
        || id === `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`;
      const {offset, end_exclusive: end} = record.address || {};
      if (initialized || (Number.isInteger(offset) && current.slice(offset, end)
        .some((value, index) => value !== bytes[offset + index]))) delete drafts[id];
    }
  };
  const prepareFields = (edits, {fromOrigin = false, initializeRentals = false} = {}) => {
    const initial = state_.saveRomInitialBytes;
    const current = fromOrigin ? initial : state_.saveCurrentBytes;
    const byteMap = state_.saveByteMapDocument;
    if (!(initial instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    const writable = {}, drafts = fromOrigin ? {} : {...state_.saveDraftFields}, slots = new Set();
    let acquisitionBytes = current;
    for (const [fieldId, value] of Object.entries(edits || {})) {
      const acquisition = saveVehicleAcquisitionFlag(fieldId);
      if (!acquisition) continue;
      const acquired = Boolean(normalizeSaveDraftFieldValue(recordOf(fieldId), value));
      if (saveVehicleAcquired(acquisitionBytes, acquisition.slot, acquisition.vehicle, byteMap) === acquired) continue;
      acquisitionBytes = setSaveVehicleAcquisition(acquisitionBytes, initial, {
        ...acquisition, acquired, byteMap,
        template: vehicleAcquisitionTemplate?.(acquisition.vehicle),
      });
      slots.add(acquisition.slot);
      for (const draftId of Object.keys(drafts)) {
        const covered = saveVehicleAcquisitionField(draftId);
        if ((covered?.slot === acquisition.slot && covered.vehicle === acquisition.vehicle)
            || draftId === fieldId
            || draftId === `save.slot.${acquisition.slot}.entity_scene_object_slots`
            || draftId.startsWith(`save.slot.${acquisition.slot}.field_object.${acquisition.vehicle}.`)
            || (/^save\.slot\.[12]\.role\.(hunter|mechanic|soldier)\.current_vehicle$/.test(draftId)
              && Number(recordOf(draftId).binding?.slot) === acquisition.slot
              && readSaveField(current, draftId, byteMap) !== readSaveField(acquisitionBytes, draftId, byteMap)))
          delete drafts[draftId];
      }
    }
    if (initializeRentals) for (const [fieldId, value] of Object.entries(edits || {})) {
      const rental = /^save\.slot\.([12])\.active_rental_vehicle_preset\.([0-2])$/.exec(fieldId);
      if (!rental) continue;
      const presetId = normalizeSaveDraftFieldValue(recordOf(fieldId), value);
      if (presetId < 8 || presetId > 17 || readSaveField(acquisitionBytes, fieldId, byteMap) === presetId) continue;
      const options = {slot: Number(rental[1]), vehicle: Number(rental[2]) + 8, presetId};
      const before = acquisitionBytes;
      acquisitionBytes = fillSaveRentalVehicle(before, {...options,
        template: rentalVehicleTemplate?.(presetId), byteMap});
      clearRentalDrafts(drafts, before, acquisitionBytes, options);
      slots.add(options.slot);
    }
    for (const [fieldId, value] of Object.entries(edits || {})) {
      if (saveVehicleAcquisitionFlag(fieldId)) continue;
      const record = recordOf(fieldId);
      const acquisition = saveVehicleAcquisitionField(fieldId);
      if (acquisition && !saveVehicleAcquired(acquisitionBytes, acquisition.slot,
        acquisition.vehicle, byteMap)) throw new SaveCodecError("未取得战车的模板字段只读");
      if (record.binding?.derivation === "vehicle-equipped-bits"
          || record.binding?.derivation === "vehicle-mount-permission-bits"
          || record.binding?.derivation === "vehicle-equipment-damage-bit") {
        throw new SaveCodecError(`派生存档字段不可独立编辑：${fieldId}`);
      }
      if (record.status === "exact" && record.binding?.editable === true) {
        writable[fieldId] = value;
        delete drafts[fieldId];
        if ([1, 2].includes(Number(record.binding?.slot))) slots.add(Number(record.binding.slot));
      } else {
        const normalized = normalizeSaveDraftFieldValue(record, value);
        const raw = readSaveField(current, fieldId, byteMap);
        const unchanged = normalized instanceof Uint8Array && raw instanceof Uint8Array
          ? normalized.length === raw.length && normalized.every((byte, index) => byte === raw[index])
          : Object.is(normalized, raw);
        if (unchanged) delete drafts[fieldId];
        else drafts[fieldId] = normalized instanceof Uint8Array ? [...normalized] : normalized;
      }
    }
    const ordered = Object.fromEntries(Object.entries(writable).sort(([a], [b]) =>
      Number(Boolean(recordOf(a).binding?.driving_vehicle_field))
      - Number(Boolean(recordOf(b).binding?.driving_vehicle_field))));
    let bytes = Object.keys(writable).length
      ? patchSaveFields(acquisitionBytes, ordered, {byteMap}) : acquisitionBytes.slice();
    for (const fieldId of Object.keys(drafts)) {
      if (["vehicle-equipped-bits", "vehicle-mount-permission-bits",
        "vehicle-equipment-damage-bit"].includes(
        records().get(fieldId)?.binding?.derivation))
        delete drafts[fieldId];
    }
    for (const slot of slots) bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
    if (fromOrigin) {
      const original = saveCurrentValue(initial, "metalmaxcn-current.sav", {});
      const candidate = applySaveChanges(state_, original, original,
        saveCurrentValue(bytes, original.name, drafts), Object.keys(edits || {}));
      return {bytes: saveCurrentBytes(candidate, initial), drafts: saveCurrentDrafts(candidate, byteMap)};
    }
    return {bytes, drafts};
  };
  const writeFields = (edits, {message = null, name, initializeRentals = false} = {}) => {
    const {bytes, drafts} = prepareFields(edits, {initializeRentals});
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    if (!saveWorkspaceChanged(state_)) {
      state_.saveCurrentSource = "rom-initial";
      state_.saveCurrentName = "metalmaxcn-current.sav";
    } else state_.saveCurrentSource = "edited";
    if (name !== undefined) state_.saveCurrentName = name;
    queueSaveWorking(state_, {onError, fieldIds: Object.keys(edits || {})});
    emit(message);
    return bytes;
  };
  const resetFields = (fieldIds, {message = null} = {}) => {
    if (fieldIds.some(saveVehicleAcquisitionFlag)) {
      const edits = Object.fromEntries(fieldIds.map(id => [id,
        readSaveField(state_.saveRomInitialBytes, id, state_.saveByteMapDocument)]));
      return writeFields(edits, {message});
    }
    for (const id of fieldIds) {
      const acquisition = saveVehicleAcquisitionField(id);
      if (acquisition && !saveVehicleAcquired(state_.saveCurrentBytes, acquisition.slot,
        acquisition.vehicle, state_.saveByteMapDocument))
        throw new SaveCodecError("未取得战车的模板字段只读");
    }
    const bytes = resetSaveFields(state_, fieldIds, {onError});
    emit(message);
    return bytes;
  };
  const fillRentalVehicle = ({slot, vehicle, presetId}, {message = null} = {}) => {
    const current = state_.saveCurrentBytes;
    if (!(state_.saveRomInitialBytes instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new SaveCodecError("ROM 初始存档尚未就绪，不能填充出租战车");
    const template = rentalVehicleTemplate?.(presetId);
    const byteMap = state_.saveByteMapDocument;
    const bytes = fillSaveRentalVehicle(current, {slot, vehicle, presetId, template, byteMap});
    const drafts = {...state_.saveDraftFields};
    clearRentalDrafts(drafts, current, bytes, {slot, vehicle, presetId});
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    state_.saveCurrentSource = "edited";
    queueSaveWorking(state_, {onError});
    emit(message);
    return bytes;
  };
  const equipVehicleCarryMain = ({slot, vehicle, column, items}, {message = null} = {}) => {
    if (vehicle < 8 && !vehicleAcquired(slot, vehicle))
      throw new SaveCodecError("未取得战车的模板字段只读");
    const initial = state_.saveRomInitialBytes;
    const current = state_.saveCurrentBytes;
    const byteMap = state_.saveByteMapDocument;
    if (!(initial instanceof Uint8Array) || !(current instanceof Uint8Array)) {
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    }
    let bytes = equipSaveVehicleCarryMain(current, {slot, vehicle, column, items, byteMap});
    bytes = restoreInitialSlotMetadata(bytes, initial, byteMap, slot);
    const drafts = {...state_.saveDraftFields};
    const prefix = `save.slot.${slot}.vehicle.${vehicle}.`;
    for (const name of ["main_gun", "sub_gun", `generic_${column + 1}`]) {
      delete drafts[`${prefix}equipment.${name}`];
      delete drafts[`${prefix}equipment_state.${name}`];
    }
    state_.saveCurrentBytes = bytes;
    state_.saveDraftFields = drafts;
    state_.saveCurrentSource = saveWorkspaceChanged(state_) ? "edited" : "rom-initial";
    if (state_.saveCurrentSource === "rom-initial") {
      state_.saveCurrentName = "metalmaxcn-current.sav";
    }
    queueSaveWorking(state_, {onError});
    emit(message);
    return bytes;
  };
  const activateSlot = (slot, active, {message = null} = {}) => {
    const current = state_.saveCurrentBytes;
    if (!(state_.saveRomInitialBytes instanceof Uint8Array) || !(current instanceof Uint8Array))
      throw new Error("ROM 初始存档尚未就绪，不能修改当前值");
    state_.saveCurrentBytes = setSaveSlotActivation(current, slot, active, state_.saveByteMapDocument);
    queueSaveWorking(state_, {onError});
    emit(message);
    return state_.saveCurrentBytes;
  };
  const resetSlotActivation = (slot, {message = null} = {}) => {
    const fieldId = `save.directory.slot.${slot}.valid_marker`;
    const original = readSaveField(state_.saveRomInitialBytes, fieldId, state_.saveByteMapDocument);
    return activateSlot(slot, original === recordOf(fieldId).binding?.expected, {message});
  };
  const objectFromRecord = (fieldId, record) => {
    const acquisition = saveVehicleAcquisitionField(fieldId);
    const acquisitionPending = () => acquisition && !vehicleAcquired(acquisition.slot, acquisition.vehicle);
    const value = () => !["vehicle-equipped-bits", "vehicle-mount-permission-bits",
      "vehicle-equipment-damage-bit"].includes(
      record.binding?.derivation)
      && Object.hasOwn(state_.saveDraftFields || {}, fieldId)
      ? state_.saveDraftFields[fieldId]
      : readSaveBoundField(state_.saveCurrentBytes, record, state_.saveByteMapDocument);
    const original = () => readSaveBoundField(state_.saveRomInitialBytes, record, state_.saveByteMapDocument);
    const object = {
      id: fieldId, resourceId: "save-current", role: `field:${fieldId}`,
      fieldId, binding: record.binding, status: record.status,
      physical: Object.freeze({...record.address}),
      fieldMeaning: record.field?.meaning || "",
      valueMeaning: record.value_meaning || "",
      meaning: record.meaning || "",
      semanticDomain: record.semantic_domain || "",
      semanticCategory: record.semantic_category || "",
      eventCategory: record.event_category || "",
      destinationReference: record.destination_reference || null,
      displayPriority: record.resource_address_bindings?.[0]?.display_priority ?? 999,
      get value() {return value();},
      get acquisitionPending() {return Boolean(acquisitionPending());},
      get statusUnavailable() {
        return record.binding?.excluded_raw_value !== undefined
          && state_.saveCurrentBytes?.[record.address.offset] === record.binding.excluded_raw_value;
      },
      get displayValue() {return acquisitionPending()
        ? vehicleAcquisitionTemplate?.(acquisition.vehicle)?.[acquisition.suffix] : value();},
      get defaultValue() {return original();},
      get edited() {
        const left = value(), right = original();
        return Array.isArray(left) || left instanceof Uint8Array
          ? JSON.stringify([...left]) !== JSON.stringify([...right]) : !Object.is(left, right);
      },
      set(next, options) {return writeFields({[fieldId]: next}, options);},
      reset(options) {return resetFields([fieldId], options);},
      bind(target, render) {
        if (!workspaceBindings.has(state_)) workspaceBindings.set(state_, new Set());
        const binding = {target: new WeakRef(target), render, object: this,
          value: JSON.stringify([this.value, this.edited])};
        workspaceBindings.get(state_).add(binding);
        render(target);
        return () => workspaceBindings.get(state_)?.delete(binding);
      },
      async mount(host) {
        const {mountSaveCurrentFieldObject} = await import('./field-object-editor-Blro4OF0.js').then(function (n) { return n.fieldObjectEditor; });
        return mountSaveCurrentFieldObject(host, this);
      },
    };
    if (record.binding?.text_codec === "metalmaxcn-runtime-text") Object.defineProperties(object, {
      nameText: {get() {
        return decodeFixedRuntimeText(saveNameTextSource(object, Uint8Array.from(object.displayValue)),
          state_.project?.text_record_encoding).text;
      }},
      setNameText: {value(text, options) {
        const encoded = fixedRuntimeTextBytes(text, saveNameTextSource(object, Uint8Array.from(value())),
          state_.project?.text_record_encoding);
        if (!encoded.ok) throw new SaveCodecError(`${encoded.reason}${encoded.unsupported?.length
          ? `：${encoded.unsupported.join(" ")}` : ""}`);
        return writeFields({[fieldId]: encoded.bytes}, options);
      }},
    });
    return Object.freeze(object);
  };
  const object = fieldId => {
    const record = recordOf(fieldId);
    if (!fieldObjects.has(fieldId)) fieldObjects.set(fieldId, objectFromRecord(fieldId, record));
    return fieldObjects.get(fieldId);
  };
  const slotStatus = slot => getSaveSlotStatus(state_.saveCurrentBytes, slot,
    state_.saveByteMapDocument);
  const slotStatusFor = (bytes, slot) => getSaveSlotStatus(bytes, slot,
    state_.saveByteMapDocument);
  const all = (prefix = "") => [...records()]
    .filter(([fieldId]) => fieldId.startsWith(prefix))
    .map(([fieldId]) => object(fieldId));
  const physical = () => {
    if (!complete()) throw new Error("存档物理字段对象需要完整 SRAM 注解");
    if (physicalDocument !== state_.saveByteMapDocument || !physicalResult) {
      physicalDocument = state_.saveByteMapDocument;
      physicalResult = createSavePhysicalFieldObjects(physicalDocument, all(), state_);
    }
    return physicalResult;
  };
  const projectAnnotations = () => complete()
    ? projectSavePhysicalAnnotations(state_.saveByteMapDocument, physical())
    : Array(state_.saveCurrentBytes?.length || Number(state_.saveByteMapDocument?.address_spaces
      ?.find(space => space.id === "sram")?.length) || 0).fill(null);
  const find = fieldId => {
    const record = records().get(fieldId);
    return record ? object(fieldId) : null;
  };
  return Object.freeze({object, find, all, physical, projectAnnotations,
    rangeViews: () => complete() ? physical().rangeViews : [],
    rangeView: rangeId => complete()
      ? physical().rangeViews.find(view => view.range_id === rangeId) || null : null,
    rangesAt: offset => {
      if (!complete()) return [];
      const catalog = physical();
      return catalog.rangesByObject.get(catalog.byByte[offset])?.filter(view =>
        view.address.offset <= offset && offset < view.address.end_exclusive) || [];
    },
    space: () => saveAddressSpace(state_.saveByteMapDocument),
    loaded: () => Boolean(state_.saveByteMapDocument),
    initial: repository => createProjectInitialSave(repository, state_.saveByteMapDocument),
    changedOffsets: (bytes = state_.saveCurrentBytes) => changedSaveOffsets(
      state_.saveRomInitialBytes, bytes, state_.saveByteMapDocument),
    writeFields, validateFields: prepareFields, flush: () => flushSaveWorking(state_),
    resetFields, fillRentalVehicle, equipVehicleCarryMain, activateSlot, resetSlotActivation,
    slotStatus, slotStatusFor, vehicleAcquired, complete, pendingPage, load,
    ready: () => (complete() || state_.saveByteMapDocument?.schema === 'metalmaxcn.save-runtime-fields')
      && state_.saveRomInitialBytes instanceof Uint8Array
      && state_.saveCurrentBytes instanceof Uint8Array,
    loadedPageCount: () => state_.saveByteMapDocument?.loaded_record_pages?.length || 0,
    addressLoaded: offset => (state_.saveByteMapDocument?.loaded_record_pages || []).some(page =>
      offset >= page.address.offset && offset < page.address.end_exclusive),
    changedByteCount: () => changedSaveOffsets(state_.saveRomInitialBytes,
      state_.saveCurrentBytes, state_.saveByteMapDocument).length});
}

const openingSaveFields = new WeakMap();

async function ensureSaveCurrentFieldObjects(state_, fields = createSaveCurrentFieldObjects(state_)) {
  if (fields.ready()) return fields;
  const repository = state_.projectRepository;
  const pending = openingSaveFields.get(repository);
  if (pending) {
    await pending;
    return fields;
  }
  const opening = (async () => {
    if (!fields.complete()) await fields.load({runtime: true});
    const initial = await fields.initial(repository);
    if (state_.projectRepository !== repository) throw new Error("项目已切换，停止载入上一项目的存档");
    await openSaveWorkspace(state_, initial);
  })();
  openingSaveFields.set(repository, opening);
  try {await opening;} finally {openingSaveFields.delete(repository);}
  return fields;
}

/** Persist the one current buffer, irrespective of which page edited it. */
function queueSaveWorking(state_, {onError, replace = state_.saveCurrentSource === "loaded", fieldIds = []} = {}) {
  if (!state_.saveRomInitialBytes || !state_.saveCurrentBytes) return;
  const session = saveWorkingQueue(state_);
  for (const id of fieldIds) session.intents.set(id, ++session.sequence);
  session.queue.commit("current", {
    original: saveCurrentValue(state_.saveRomInitialBytes),
    value: saveCurrentValue(state_.saveCurrentBytes, state_.saveCurrentName,
      state_.saveDraftFields),
    previousValue: session.value ?? saveCurrentValue(state_.saveRomInitialBytes),
    replace,
    intents: [...session.intents],
    onError,
  });
}

async function flushSaveWorking(state_) {
  const session = workingQueues.get(state_.projectRepository);
  await session?.queue.flush();
  if (session?.error) throw session.error;
}

/** Restore Working before exposing the shared workspace to any consumer. */
async function openSaveWorkspace(state_, initial, options = {}) {
  const repository = state_.projectRepository;
  const session = saveWorkingQueue(state_);
  await flushSaveWorking(state_);
  const resolved = await repository.resolveSaveCurrent(saveCurrentValue(initial));
  if (state_.projectRepository !== repository) throw new Error("项目已切换，停止载入上一项目的存档");
  session.version = resolved.version;
  session.value = resolved.value;
  state_.saveRomInitialBytes = initial.slice();
  publishSaveValue(state_, resolved.value, initial);
  const current = synchronizeSaveWorkspace(state_, initial, options);
  return current;
}

function originalDocument(resolved, resourceId) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== resourceId ||
      !asset.document || typeof asset.document !== "object" ||
      Array.isArray(asset.document)) {
    throw new Error(`${resourceId}: 当前项目缺少有效的语义资产`);
  }
  return asset.document;
}

/** Encode both slots from the project's immutable original ROM assets. */
async function createProjectInitialSave(repository, byteMap) {
  if (!repository || typeof repository.getOriginal !== "function") {
    throw new TypeError("生成存档需要项目 Original 资源读取入口");
  }
  const [characters, vehicles, textSlots] = await Promise.all([
    repository.getOriginal("character-initial-record"),
    repository.getOriginal("vehicle-preset"),
    repository.getOriginal("fixed-text-slot"),
  ]);
  return createRomInitialSave(byteMap, {
    characters: originalDocument(characters, "character-initial-record"),
    vehicles: originalDocument(vehicles, "vehicle-preset"),
    textSlots: originalDocument(textSlots, "fixed-text-slot"),
  });
}

/** Build-time save field operations retain the physical document inside the field layer. */
async function prepareSaveBuildFieldObjects(repository, {originalRepository = repository} = {}) {
  const {db} = await import('./prg-loaders-DnCSmXk9.js').then(function (n) { return n.projectDb; });
  const byteMap = await db.getDocument('project.save.fields');
  const initialSave = await createProjectInitialSave(originalRepository, byteMap);
  return Object.freeze({
    initialSave,
    async openCurrent(state_) {
      state_.saveByteMapDocument = byteMap;
      return openSaveWorkspace(state_, initialSave);
    },
    recomputeChecksums(bytes) {return recomputeSaveChecksums(bytes, byteMap);},
    changedByteCount(bytes) {return changedSaveOffsets(initialSave, bytes, byteMap).length;},
    slotStatus(bytes, slot) {return getSaveSlotStatus(bytes, slot, byteMap);},
  });
}

/** 当前存档的消费方共用字段入口，首次读取时恢复仓库中的 Working。 */
async function prepareSaveCurrentFieldObjects(state_, {originalRepository = state_.projectRepository} = {}) {
  const fields = createSaveCurrentFieldObjects(state_);
  if (!fields.ready()) {
    const prepared = await prepareSaveBuildFieldObjects(state_.projectRepository, {originalRepository});
    await prepared.openCurrent(state_);
  }
  const characters = originalDocument(
    await originalRepository.getOriginal("character-initial-record"), "character-initial-record");
  return {fields, initialRoles: characters.rom_initial.roles,
    source: state_.saveCurrentSource === "rom-initial" ? "ROM 新开局值" : "当前存档"};
}

function equalBytes(left, right) {
  return left instanceof Uint8Array && right instanceof Uint8Array &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

/**
 * Install the original-ROM baseline without replacing a loaded save.
 */
function synchronizeSaveWorkspace(state_, romInitialBytes, {
  message = "",
} = {}) {
  if (!(romInitialBytes instanceof Uint8Array)) {
    throw new TypeError("ROM 初始存档必须是 Uint8Array");
  }
  const initial = romInitialBytes.slice();
  const keepCurrent = state_.saveCurrentBytes instanceof Uint8Array &&
    state_.saveCurrentBytes.length === initial.length &&
    ["loaded", "edited"].includes(state_.saveCurrentSource);
  state_.saveRomInitialBytes = initial;
  if (!keepCurrent) {
    state_.saveCurrentBytes = initial.slice();
    state_.saveDraftFields = {};
    state_.saveCurrentName = "metalmaxcn-current.sav";
    state_.saveCurrentSource = "rom-initial";
  }
  if (message) state_.saveMessage = message;
  return state_.saveCurrentBytes.slice();
}

/** Replace only the single current value with a user-loaded save. */
function installLoadedSave(state_, bytes, name) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("载入存档必须是 Uint8Array");
  }
  state_.saveCurrentBytes = bytes.slice();
  state_.saveDraftFields = {};
  state_.saveCurrentName = name || "metalmaxcn.sav";
  state_.saveCurrentSource = "loaded";
  return state_.saveCurrentBytes;
}

// @editor-module CHR 物理字段对象承载图形资源归属与无归属字节。

function createChrPhysicalFieldObjects(shard, bytes = null) {
  const {offset: base, length} = shard?.address || {};
  if (shard?.space !== "chr" || !Number.isInteger(base) || base < 0
      || !Number.isInteger(length) || length < 1 || !Array.isArray(shard.resources)) {
    throw new TypeError("CHR 字段对象需要有效 bank 与资源范围");
  }
  const views = shard.resources.map((resource, index) => {
    const address = resource?.address || {};
    if (address.space !== "chr" || !Number.isInteger(address.offset)
        || !Number.isInteger(address.end_exclusive)
        || address.end_exclusive <= address.offset
        || address.end_exclusive <= base || address.offset >= base + length) {
      throw new TypeError(`CHR bank ${shard.bank} 资源范围 ${index} 无效`);
    }
    const associations = (resource.associations || []).map(association => {
      const owner = association.metadata?.resource_owner || association.resource_owner;
      return Object.freeze({
        producer: association.producer, status: association.status,
        resourceIds: Object.freeze([...(association.resource_ids || [])]),
        bindings: Object.freeze([...(association.resource_address_bindings || [])]),
        owner: owner?.resource_id && owner?.role ? Object.freeze({
          resourceId: owner.resource_id, role: owner.role,
          elementIndex: owner.element_index, elementCount: owner.element_count,
        }) : null,
      });
    });
    return Object.freeze({address: Object.freeze({...address}),
      associations: Object.freeze(associations), index});
  });
  const preferred = [...views].sort((left, right) =>
    Number(right.associations.some(association => association.owner))
      - Number(left.associations.some(association => association.owner))
      || left.address.length - right.address.length || left.index - right.index);
  const chosen = Array(length).fill(null);
  for (const view of preferred) {
    const start = Math.max(base, view.address.offset) - base;
    const end = Math.min(base + length, view.address.end_exclusive) - base;
    for (let local = start; local < end; local += 1) chosen[local] ||= view;
  }
  const byByte = Array(length).fill(null);
  const objects = [];
  let uncovered = 0;
  for (let local = 0; local < length;) {
    const view = chosen[local];
    if (!view) {uncovered += 1; local += 1; continue;}
    let end = local + 1;
    while (end < length && chosen[end] === view) end += 1;
    const start = base + local;
    const endExclusive = base + end;
    const windowStart = local, windowEnd = end;
    const owner = view.associations.find(association => association.owner)?.owner;
    const related = Object.freeze(views.filter(item =>
      item.address.offset < endExclusive && item.address.end_exclusive > start));
    const object = Object.freeze({
      id: owner ? `${owner.resourceId}/${owner.role}`
        : `chr.unassigned:${start.toString(16).padStart(6, "0")}-${endExclusive.toString(16).padStart(6, "0")}`,
      resourceId: owner?.resourceId || "chr.unassigned",
      role: owner?.role || null,
      physical: Object.freeze({space: "chr", offset: start,
        length: end - local, end_exclusive: endExclusive}),
      owner,
      rangeViews: related,
      writeback: owner ? null : Object.freeze({state: "unpermitted"}),
      get origin() {return bytes?.slice(windowStart, windowEnd) || null;},
      get working() {return null;},
      get edited() {return false;},
    });
    objects.push(object);
    byByte.fill(object, local, end);
    local = end;
  }
  return Object.freeze({bank: shard.bank, objects: Object.freeze(objects), byByte: Object.freeze(byByte),
    rangeViews: Object.freeze(views), total: length, uncovered});
}

// @editor-module 按字段对象身份反查 PRG、CHR 与 SRAM 物理范围。

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

async function loadPhysicalFieldObjectCoverage() {
  await loadPhysicalFieldObjectIndex();
  return cachedCoverage;
}

async function findPhysicalFieldObjectRanges(resourceId) {
  const id = String(resourceId || "").trim();
  if (!id) return [];
  const index = await loadPhysicalFieldObjectIndex();
  return (index.get(id) || []).map(range => ({...range}));
}

// @editor-module PRG 与 CHR 物理字段对象窗口及关联视图。


let loadedPrgManifest = null;
let loadedChrManifest = null;
let chrWindow = null;

function decodeBase64(value) {
  let raw;
  try {
    raw = globalThis.atob(String(value));
  } catch {
    throw new Error("统一字节地图 base64 数据无效");
  }
  const result = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) result[index] = raw.charCodeAt(index);
  return result;
}

// 正文按发布内容直接解码：字节地图的字节就是项目基线，前端不复核它的哈希。
function decodeEnvelope(envelope) {
  return decodeBase64(envelope.data);
}

function uniqueJson(records) {
  const seen = new Set();
  return records.filter(record => {
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assembleBytes(shards, offset, length) {
  const bytes = new Uint8Array(length);
  for (const shard of shards) {
    bytes.set(decodeEnvelope(shard.bytes), shard.address.offset - offset);
  }
  return bytes;
}

function normalizedInstruction(source, windowOffset, windowLength) {
  const physicalStart = Number(source?.prg_offset);
  const size = Number(source?.size || 1);
  if (!Number.isInteger(physicalStart) || !Number.isInteger(size) || size < 1
      || physicalStart + size <= windowOffset
      || physicalStart >= windowOffset + windowLength) return null;
  const instructionBytes = String(source.bytes_hex || "").split(/\s+/).filter(Boolean)
    .map(value => Number.parseInt(value, 16));
  if (instructionBytes.some(value => !Number.isInteger(value) || value < 0 || value > 0xff)) {
    throw new Error(`PRG 指令 ${physicalStart} bytes_hex 无效`);
  }
  return {
    start: physicalStart - windowOffset,
    physicalStart,
    size,
    bytes: instructionBytes,
    mnemonic: source.mnemonic || "???",
    operand: source.operand || "",
    addressingMode: source.addressing_mode || "",
    confidence: source.confidence || "",
    execCount: Number(source.exec_count || 0),
    functionName: source.function || "",
    functionEntry: Number.isFinite(Number(source.function_entry_prg))
      ? Number(source.function_entry_prg) : null,
    domain: source.domain || "unclassified",
    submodes: Array.isArray(source.submodes) ? source.submodes : [],
  };
}

async function loadRomMapDisassembly(shards, {offset, length}) {
  const classification = new Uint8Array(length);
  let classificationIds = null;
  const rawInstructions = [];
  const functions = [];
  const namedRanges = [];
  const xrefs = [];
  const symbols = [];
  const functionSummary = {};
  for (const shard of shards) {
    const source = shard.disassembly;
    const requiredArrays = ["instructions", "functions", "symbols", "named_ranges", "xrefs"];
    if (!source || requiredArrays.some(key => !Array.isArray(source[key]))
        || !source.classification_ids || typeof source.classification_ids !== "object") {
      throw new Error(`PRG bank ${shard.bank} 反汇编 JSON 无效`);
    }
    const decoded = decodeEnvelope(source.classification);
    if (decoded.length !== shard.address.length) {
      throw new Error(`PRG bank ${shard.bank} classification 长度错误`);
    }
    classification.set(decoded, shard.address.offset - offset);
    if (classificationIds
        && JSON.stringify(classificationIds) !== JSON.stringify(source.classification_ids)) {
      throw new Error("PRG bank classification_ids 不一致");
    }
    classificationIds ||= source.classification_ids;
    rawInstructions.push(...source.instructions);
    functions.push(...source.functions);
    symbols.push(...source.symbols);
    namedRanges.push(...source.named_ranges);
    xrefs.push(...source.xrefs);
    Object.assign(functionSummary, source.function_summary || {});
  }
  const instructions = uniqueJson(rawInstructions)
    .map(source => normalizedInstruction(source, offset, length))
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);
  const uniqueFunctions = uniqueJson(functions);
  return {
    classification,
    functionsByEntry: new Map(uniqueFunctions.map(entry => [Number(entry.entry_prg), entry])),
    instructions,
    functionSummary,
    symbols: uniqueJson(symbols),
    namedRanges: uniqueJson(namedRanges),
    classificationIds,
    xrefs: uniqueJson(xrefs),
  };
}

async function loadRomMapPrg(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "prg");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? state.romMapSelectedOffset) || 0,
  ));
  if (loadedPrgManifest && loadedPrgManifest !== manifest) {
    state.romMapLoadedAll = false;
  }
  const all = request.all === true;
  const descriptors = all
    ? manifest.bank_shards.prg
    : [byteMapBankDescriptor(manifest, "prg", selected)];
  const windowOffset = all ? 0 : descriptors[0].address.offset;
  const windowLength = all ? space.length : descriptors[0].address.length;
  const loadKey = `${manifest.source_rom_sha256}:prg:${all ? "all" : descriptors[0].bank}`;
  const shards = await Promise.all(descriptors.map(descriptor =>
    loadByteMapBank(manifest, descriptor)));
  if (all || request.allPages === true) {
    await loadAllByteMapRecordPages(manifest, shards);
  } else {
    await loadByteMapRecordPagesForOffsets(manifest, shards[0], [
      selected, ...(Array.isArray(request.pageOffsets) ? request.pageOffsets : []),
    ]);
  }
  const recordPages = loadedByteMapRecordPages(manifest, shards);
  const pageKey = recordPages
    .map(page => `${page.space}:${page.bank}:${page.page}`).sort().join("|");
  const reuseWindow = loadedPrgManifest === manifest
    && state.romMapLoadKey === loadKey
    && state.romMapBytes && state.romMapDisassembly;
  const [bytes, disassembly] = reuseWindow
    ? [state.romMapBytes, state.romMapDisassembly]
    : await Promise.all([
      assembleBytes(shards, windowOffset, windowLength),
      loadRomMapDisassembly(shards, {offset: windowOffset, length: windowLength}),
    ]);
  state.romMapBytes = bytes;
  state.romMapDisassembly = disassembly;
  if (!reuseWindow || state.romMapPageLoadKey !== pageKey || !state.romMapFieldObjects) {
    const annotations = await buildRomMapPrgAnnotations(recordPages, {
      offset: windowOffset,
      length: windowLength,
      disassembly,
      lookupTables: manifest.lookup_tables,
    });
    const owners = createPrgPhysicalFieldObjects(recordPages,
      {offset: windowOffset, length: windowLength, bytes});
    state.romMapFieldObjects = projectPrgFieldObjects(annotations,
      {offset: windowOffset, bytes, owners: owners.byByte,
        namedRanges: disassembly.namedRanges,
        cpuWindows: shards.map(shard => ({offset: shard.address.offset,
          length: shard.address.length,
          cpuStart: shard.manual?.address?.cpu_start == null ? null
            : Number(shard.manual.address.cpu_start)}))});
    state.romMapAnnotations = state.romMapFieldObjects.byByte.map((object, local) =>
      object?.presentationAt(windowOffset + local) || null);
  }
  state.romMapPrgSections = descriptors;
  state.romMapWindowOffset = windowOffset;
  state.romMapTotalLength = space.length;
  state.romMapLoadedAll = all;
  state.romMapRecordPagesLoaded = recordPages.length;
  state.romMapRecordPagesTotal = shards.reduce(
    (total, shard) => total + shard.record_pages.length, 0,
  );
  state.romMapLoadedRecordPageAddresses = recordPages.map(page => ({...page.address}));
  state.romMapRecordPagesComplete =
    state.romMapRecordPagesLoaded === state.romMapRecordPagesTotal;
  state.romMapLoadKey = loadKey;
  state.romMapPageLoadKey = pageKey;
  state.romMapDisassemblyError = "";
  state.romMapSearchIndex = null;
  state.romMapFilteredOffsets = null;
  state.romMapFilterResult = null;
  state.romMapSelectedOffset = selected;
  loadedPrgManifest = manifest;
  return true;
}

function chrReferenceRecord(uid, range, association, binding = null) {
  return {
    uid,
    label: uid,
    domain: binding?.domain || "unknown",
    kind: binding?.role || "resource",
    producer: association.producer,
    status: association.status,
    start: Number(range.address.offset),
    end: Number(range.address.end_exclusive),
  };
}

function chrShardReferences(manifest, catalog) {
  const bank = Number(catalog.bank);
  const referenceByKey = new Map();
  for (const range of catalog.rangeViews) {
    for (const association of range.associations) {
      const boundIds = new Set();
      for (const binding of association.bindings) {
        const uid = String(binding.resource_id);
        boundIds.add(uid);
        const reference = chrReferenceRecord(uid, range, association, binding);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
      for (const value of association.resourceIds) {
        const uid = String(value);
        if (boundIds.has(uid)) continue;
        const reference = chrReferenceRecord(uid, range, association);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
    }
  }
  const references = [...referenceByKey.values()]
    .sort((left, right) => String(left.label)
      .localeCompare(String(right.label), "zh-CN") || left.start - right.start);
  const knownBanks = new Set();
  if (references.length) knownBanks.add(bank);
  const semanticRanges = catalog.rangeViews.map(range => {
    const resourceIds = [...new Set(range.associations.flatMap(association => [
      ...association.resourceIds,
      ...association.bindings.map(binding => binding.resource_id),
    ]))];
    const roles = [...new Set(range.associations.flatMap(association =>
      association.bindings.map(binding => binding.role)))];
    const statuses = [...new Set(range.associations.map(association => association.status))];
    const signal = [...resourceIds, ...roles].join(" ");
    return {
      id: `chr:${range.address.offset}:${range.address.end_exclusive}`,
      label: resourceIds.length
        ? `${resourceIds[0]}${resourceIds.length > 1 ? ` 等 ${resourceIds.length} 项` : ""}`
        : "CHR 图像资源范围",
      kind: roles.join(" / ") || "image-data",
      status: statuses.join(" / ") || "classified",
      start: Number(range.address.offset),
      end: Number(range.address.end_exclusive),
      isFont: /font|glyph|字库|字模/i.test(signal),
    };
  });
  return {
    byBank: new Map([[bank, references]]),
    referencedBanks: knownBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

function chrReferences(manifest, catalogs) {
  const byBank = new Map();
  const referencedBanks = new Set();
  const semanticRanges = [];
  for (const catalog of catalogs) {
    const projected = chrShardReferences(manifest, catalog);
    for (const [bank, references] of projected.byBank) byBank.set(bank, references);
    for (const bank of projected.referencedBanks) referencedBanks.add(bank);
    semanticRanges.push(...projected.semanticRanges);
  }
  semanticRanges.sort((left, right) => left.start - right.start);
  return {
    byBank,
    referencedBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

async function loadRomMapChr(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "chr");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? Number(state.romMapChrTile || 0) * 16) || 0,
  ));
  const descriptors = manifest.bank_shards.chr;
  const loadKey = `${manifest.source_rom_sha256}:chr:all`;
  if (loadedChrManifest !== manifest || chrWindow?.repository !== state.projectRepository
      || chrWindow?.bytes !== state.romMapChrBytes) {
    chrWindow = {repository: state.projectRepository, bytes: new Uint8Array(space.length),
      catalogs: new Map(), inflight: new Map()};
    loadedChrManifest = manifest;
    state.romMapChrBytes = chrWindow.bytes;
  }
  const window = chrWindow;
  const requested = Array.isArray(request.banks)
    ? descriptors.filter(descriptor => request.banks.includes(Number(descriptor.bank))) : descriptors;
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(16, requested.length)}, async () => {
    while (cursor < requested.length) {
      const descriptor = requested[cursor++], bank = Number(descriptor.bank);
      if (window.catalogs.has(bank)) continue;
      if (!window.inflight.has(bank)) {
        const pending = loadByteMapBank(manifest, descriptor).then(shard => {
          const bytes = assembleBytes([shard], descriptor.address.offset, descriptor.address.length);
          const catalog = createChrPhysicalFieldObjects(shard, bytes);
          if (catalog.uncovered) throw new Error(`CHR Bank ${catalog.bank} 缺少字段对象`);
          window.bytes.set(bytes, descriptor.address.offset);
          window.catalogs.set(bank, catalog);
        }).finally(() => window.inflight.delete(bank));
        window.inflight.set(bank, pending);
      }
      await window.inflight.get(bank);
    }
  }));
  if (window !== chrWindow || window.bytes !== state.romMapChrBytes
      || window.repository !== state.projectRepository) return false;
  const catalogs = [...window.catalogs.values()].sort((left, right) => left.bank - right.bank);
  state.romMapChrFieldObjects = {byBank: window.catalogs, total: Number(space.bank_size)};
  state.romMapChrReferences = chrReferences(manifest, catalogs);
  state.romMapChrReferences.summary.total_ranges = descriptors.reduce((total, descriptor) => total + descriptor.resources, 0);
  state.romMapChrBankDirectory = Object.freeze(descriptors.map(descriptor => Object.freeze({
    bank: Number(descriptor.bank), resources: descriptor.resources,
    offset: Number(descriptor.address.offset), length: Number(descriptor.address.length),
    ...(window.catalogs.has(Number(descriptor.bank)) ? {uncovered: window.catalogs.get(Number(descriptor.bank)).uncovered} : {}),
  })));
  state.romMapChrSections = descriptors;
  state.romMapChrWindowOffset = 0;
  state.romMapChrTotalLength = space.length;
  if (!request.background) {
    state.romMapChrTile = Math.floor(selected / 16);
    state.romMapChrBank = Math.floor(selected / Number(space.bank_size));
  }
  state.romMapChrLoadKey = loadKey;
  loadedChrManifest = manifest;
  return true;
}

export { SAVE_BUILD_BLOB_PREFIX, SAVE_BUILD_MEDIA_TYPE, createSaveCurrentFieldObjects, createSaveRuntimeState, ensureSaveCurrentFieldObjects, findPhysicalFieldObjectRanges, getSaveSlotStatus, installLoadedSave, loadPhysicalFieldObjectCoverage, loadRomMapChr, loadRomMapPrg, openSaveWorkspace, playerTileFromSaveCamera, prepareSaveBuildFieldObjects, prepareSaveCurrentFieldObjects, previewSaveFileFields, previewSaveFileOperation, queueSaveWorking, readSaveField, readSaveTowedVehicle, resetSaveWorkspace, saveAnnotations, saveCameraFromPlayerTile, saveCurrentValue, saveFieldBindings, saveRentalVehicleTemplate, saveRuntimeMemory, saveVehicleAcquisitionFlag, saveVehicleAcquisitionTemplate, saveVehicleMenuInitialValues, saveWorkspaceChanged };
