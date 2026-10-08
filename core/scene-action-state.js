// @editor-module 场景动作现场组合所属字段接口，不解释字段对象的字节布局。
import {runtimeWorkspaceFieldOwner} from "./runtime-workspace-owner.js";
import {createSaveRuntimeState, saveRuntimeMemory} from "./save-codec.js";
import {cloneFrameValue, sameFrameVector} from "./frame-state-values.js";
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};
const byteIndexes = () => ({ram: new Map(), sram: new Map()});

export function createSceneActionState({workspaceDocument, saveDocument, saveRuntimeDocument, memory,
  saveValue, saveSlot = 1}) {
  if (saveValue !== undefined) {
    requireValue(memory === undefined, "场景动作不能同时装入存档值与内存现场");
    memory = saveRuntimeMemory({byteMap: saveDocument, saveValue, slot: saveSlot});
  }
  return cacheSceneActionState(composeSceneActionState([
    runtimeWorkspaceFieldOwner.createState({document: workspaceDocument, memory}),
    ...["save-role", "save-vehicle", "save-container", "property-storage"].map(resourceId =>
      createSaveRuntimeState({byteMap: saveDocument, resourceId, memory,
        runtimeDocument: resourceId === "save-container" ? saveRuntimeDocument : undefined})),
  ]));
}

export function composeSceneActionState(providers) {
  requireValue(Array.isArray(providers) && providers.length > 0, "场景动作缺少所属字段接口");
  const owners = new Map(), fields = new Map(), occupied = byteIndexes(), currentBytes = byteIndexes();
  for (const provider of providers) {
    requireValue(typeof provider?.resourceId === "string" && !owners.has(provider.resourceId)
      && ["field", "fields", "capture", "restore"].every(method => typeof provider[method] === "function"),
    "场景动作所属字段接口无效或重复");
    owners.set(provider.resourceId, provider);
    for (const field of provider.fields()) {
      const key = `${field.fieldName}:${field.index ?? 0}`;
      requireValue(field.resourceId === provider.resourceId && !fields.has(key), `场景动作字段重复：${key}`);
      const physical = field.physical;
      requireValue(["ram", "sram"].includes(physical?.space) && Number.isInteger(physical.offset)
        && physical.offset >= 0 && Number.isInteger(physical.length) && physical.length > 0,
      `场景动作字段缺少物理范围：${key}`);
      for (let at = physical.offset; at < physical.offset + physical.length; at++) {
        const owner = occupied[physical.space].get(at);
        requireValue(owner === undefined || owner === provider.resourceId, `场景动作字节归属重叠：${physical.space}:${at}`);
        occupied[physical.space].set(at, provider.resourceId);
        if (field.knowledge === "confirmed") {
          if (!currentBytes[physical.space].has(at)) currentBytes[physical.space].set(at, []);
          currentBytes[physical.space].get(at).push({field, offset: at - physical.offset});
        }
      }
      fields.set(key, field);
    }
  }
  const capture = () => ({schema: "metalmaxcn.scene-action-state", owners: [...owners.values()]
    .map(provider => provider.capture())});
  const restore = snapshot => {
    requireValue(snapshot?.schema === "metalmaxcn.scene-action-state" && Array.isArray(snapshot.owners)
      && snapshot.owners.length === owners.size, "场景动作现场缺少所属字段对象");
    const inputs = new Map(snapshot.owners.map(record => [record.resource_id, record]));
    requireValue(inputs.size === owners.size && [...inputs.keys()].every(id => owners.has(id)),
      "场景动作现场归属不符");
    const before = capture();
    try {
      for (const [id, provider] of owners) provider.restore(inputs.get(id));
    } catch (error) {
      for (const record of before.owners) owners.get(record.resource_id).restore(record);
      throw error;
    }
  };
  return Object.freeze({
    field(id, index = 0) {
      const field = fields.get(`${id}:${index}`);
      requireValue(field, `场景动作字段不存在：${id}:${index}`);
      return field;
    },
    fields: () => [...fields.values()], capture, restore,
    writeBytes(id, values, start = 0, index = 0) {
      const field = fields.get(`${id}:${index}`), provider = owners.get(field?.resourceId);
      requireValue(typeof provider?.writeBytes === "function", `场景动作字段不支持字节范围：${id}:${index}`);
      provider.writeBytes(id, values, start, index);
    },
    readCurrentByte(address) {
      if (!Number.isInteger(address) || address < 0 || address > 65535) return null;
      const space = address < 0x0800 ? "ram" : address >= 0x6000 && address < 0x8000 ? "sram" : null;
      const offset = space === "sram" ? address - 0x6000 : address;
      const values = (currentBytes[space]?.get(offset) || []).map(reference =>
        reference.field.rawBytes[reference.offset]);
      return values.length && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255
        && value === values[0]) ? values[0] : null;
    },
  });
}

function cacheSceneActionState(backing) {
  const snapshots = new WeakSet();
  const freezeField = row => {
    Object.freeze(row.raw_bytes);
    if (Array.isArray(row.value)) Object.freeze(row.value);
    return Object.freeze(row);
  };
  const freezeSnapshot = record => {
    for (const owner of record.owners) {
      for (const row of owner.fields) freezeField(row);
      Object.freeze(owner.fields); Object.freeze(owner);
    }
    Object.freeze(record.owners); snapshots.add(record);
    return Object.freeze(record);
  };
  let snapshot = freezeSnapshot(backing.capture());
  const dirty = new Set(), fields = new Map(), bytes = byteIndexes(), values = new Map(), overlaps = new Map();
  const locations = new Map(snapshot.owners.flatMap((owner, ownerIndex) => owner.fields
    .map((row, rowIndex) => [`${row.field}:${row.index}`, {ownerIndex, rowIndex}])));
  const invalidate = (field, start = 0, length = field.physical.length) => {
    const left = field.physical.offset + start, right = left + length;
    for (const other of overlaps.get(`${field.fieldName}:${field.index}`) || []) {
      if (other.physical.offset >= right || other.physical.offset + other.physical.length <= left) continue;
      const key = `${other.fieldName}:${other.index}`;
      dirty.add(key); values.delete(key);
    }
  };
  for (const field of backing.fields()) {
    const key = `${field.fieldName}:${field.index}`;
    for (let at = field.physical.offset; at < field.physical.offset + field.physical.length; at++) {
      const space = bytes[field.physical.space];
      if (!space.has(at)) space.set(at, []);
      space.get(at).push(key);
    }
    const currentValue = () => {
      if (!values.has(key)) {
        const value = field.value;
        values.set(key, Array.isArray(value) ? Object.freeze(value) : value);
      }
      return values.get(key);
    };
    fields.set(key, Object.freeze({...field,
      get value() {return currentValue();}, get rawBytes() {return field.rawBytes;},
      set value(value) {
        const current = currentValue();
        const unchanged = current === value || Array.isArray(current) && Array.isArray(value) && sameFrameVector(current, value);
        if (unchanged && field.writable) return;
        field.value = value;
        if (!unchanged) invalidate(field);
      }}));
  }
  for (const field of fields.values()) {
    const keys = new Set();
    for (let at = field.physical.offset; at < field.physical.offset + field.physical.length; at++)
      for (const key of bytes[field.physical.space].get(at) || []) keys.add(key);
    overlaps.set(`${field.fieldName}:${field.index}`, [...keys].map(key => fields.get(key)));
  }
  const firstFields = new Map([...fields.values()].filter(field => field.index === 0)
    .map(field => [field.fieldName, field]));
  return Object.freeze({...backing,
    isCapturedState: record => snapshots.has(record),
    field: (id, index = 0) => (index === 0 ? firstFields.get(id) : fields.get(`${id}:${index}`))
      || backing.field(id, index),
    fields: () => [...fields.values()],
    writeBytes(id, values, start = 0, index = 0) {
      backing.writeBytes(id, values, start, index);
      invalidate(fields.get(`${id}:${index}`), start, values.length);
    },
    capture() {
      if (!dirty.size) return snapshot;
      const owners = [...snapshot.owners], changedOwners = new Set();
      for (const key of dirty) {
        const {ownerIndex, rowIndex} = locations.get(key), field = fields.get(key);
        if (!changedOwners.has(ownerIndex)) {
          owners[ownerIndex] = {...owners[ownerIndex], fields: [...owners[ownerIndex].fields]};
          changedOwners.add(ownerIndex);
        }
        owners[ownerIndex].fields[rowIndex] = freezeField({...owners[ownerIndex].fields[rowIndex],
          raw_bytes: field.rawBytes, value: field.value});
      }
      for (const index of changedOwners) {Object.freeze(owners[index].fields); Object.freeze(owners[index]);}
      dirty.clear(); snapshot = Object.freeze({...snapshot, owners: Object.freeze(owners)});
      snapshots.add(snapshot); return snapshot;
    },
    restore(record) {
      if (!dirty.size && record === snapshot) return;
      backing.restore(record);
      snapshot = snapshots.has(record) ? record : freezeSnapshot(cloneFrameValue(record));
      dirty.clear(); values.clear();
    },
  });
}
