// @editor-module 运行工作区按所属字段保存现场字节，未知语义与缺失原像保持未知。
const OWNER = "runtime-workspace";
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const widths = Object.freeze({u8: 1, u16le: 2});

export function validateRuntimeStateDefinition(document, resourceId) {
  const definition = document?.runtime_state;
  requireValue(definition?.resource_id === resourceId && /^[a-z][a-z0-9-]*$/.test(resourceId) && Array.isArray(definition.fields)
    && definition.fields.length > 0, "运行工作区缺少字段声明");
  const spaces = new Map();
  for (const space of definition.spaces || []) {
    requireValue(["ram", "sram"].includes(space.id) && !spaces.has(space.id)
      && Number.isInteger(space.length) && space.length > 0, "运行工作区空间声明无效");
    spaces.set(space.id, space.length);
  }
  const ids = new Set(), handles = new Set(), occupied = new Set();
  for (const spec of definition.fields) {
    const {physical, count, width, encoding, knowledge} = spec;
    requireValue(typeof spec.id === "string" && !ids.has(spec.id)
      && new RegExp(`^${resourceId}:[0-9A-F]{2}$`).test(spec.handle) && !handles.has(spec.handle)
      && ["confirmed", "unknown"].includes(knowledge)
      && Number.isInteger(count) && count > 0 && count <= 256
      && Number.isInteger(width) && width > 0
      && (encoding === "bytes" || widths[encoding] === width)
      && (knowledge !== "unknown" || encoding === "bytes"), "运行工作区字段声明无效");
    ids.add(spec.id); handles.add(spec.handle);
    const length = spaces.get(physical?.space);
    requireValue(Number.isInteger(physical?.offset) && physical.offset >= 0
      && physical.length === width * count && physical.offset + physical.length <= length,
    `${spec.id} 的物理范围无效`);
    requireValue(Array.isArray(spec.evidence) && spec.evidence.length > 0
      && spec.evidence.every(source => typeof source.location === "string"),
    `${spec.id} 缺少证据`);
    for (let offset = physical.offset; offset < physical.offset + physical.length; offset += 1) {
      const key = `${physical.space}:${offset}`;
      if (!spec.view_of) {
        requireValue(!occupied.has(key), `运行工作区字段重复占用 ${key}`);
        occupied.add(key);
      }
    }
  }
  for (const spec of definition.fields.filter(spec => spec.view_of)) {
    const parent = definition.fields.find(field => field.id === spec.view_of);
    requireValue(parent && !parent.view_of && parent.encoding === "bytes"
      && parent.physical.space === spec.physical.space
      && parent.physical.offset <= spec.physical.offset
      && spec.physical.offset + spec.physical.length <= parent.physical.offset + parent.physical.length,
    `${spec.id} 的叠加视图不属于原像字段`);
  }
  return definition;
}

export const validateRuntimeWorkspaceDefinition = document => validateRuntimeStateDefinition(document, OWNER);

const decode = (spec, raw) => {
  if (spec.knowledge === "unknown" || raw.some(value => value === null)) return null;
  if (spec.encoding === "bytes") return [...raw];
  return raw.reduce((value, current, index) => value + current * 256 ** index, 0);
};
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function createRuntimeFieldState({document, memory = {}, resourceId = OWNER}) {
  const definition = structuredClone(validateRuntimeStateDefinition(document, resourceId));
  const backing = {};
  for (const space of definition.spaces) {
    const source = memory[space.id];
    requireValue(source === undefined || ((Array.isArray(source) || source instanceof Uint8Array)
      && source.length === space.length && Array.from(source).every(value => value === null || byte(value))),
    `运行工作区 ${space.id} 原像无效`);
    backing[space.id] = source === undefined ? Array(space.length).fill(null) : Array.from(source);
  }
  const records = definition.fields.flatMap(spec => Array.from({length: spec.count}, (_, index) => {
    const offset = spec.physical.offset + index * spec.width;
    return {spec, index, offset,
      handle: spec.count === 1 ? spec.handle : `${spec.handle}:${index.toString(16).toUpperCase().padStart(2, "0")}`};
  }));
  const byField = new Map(records.map(record => [`${record.spec.id}:${record.index}`, record]));
  const rawBytes = record => backing[record.spec.physical.space].slice(record.offset, record.offset + record.spec.width);
  const find = (id, index) => {
    const record = byField.get(`${id}:${index}`);
    requireValue(record, `运行工作区字段不存在：${id}:${index}`);
    return record;
  };
  const project = record => ({handle: record.handle, field: record.spec.id, index: record.index,
    knowledge: record.spec.knowledge, raw_bytes: rawBytes(record), value: decode(record.spec, rawBytes(record))});
  function write(id, value, index = 0) {
    const record = find(id, index), {spec, offset} = record;
    requireValue(spec.knowledge === "confirmed", `${id} 的语义未知`);
    let raw;
    if (spec.encoding === "bytes") {
      requireValue(Array.isArray(value) && value.length === spec.width && Array.from(value).every(byte), `${id} 的字节值无效`);
      raw = value;
    } else {
      requireValue(Number.isInteger(value) && value >= 0 && value < 256 ** spec.width, `${id} 的数值无效`);
      raw = Array.from({length: spec.width}, (_, at) => Math.floor(value / 256 ** at) & 255);
    }
    backing[spec.physical.space].splice(offset, spec.width, ...raw);
  }
  function writeBytes(id, values, start = 0, index = 0) {
    const record = find(id, index), {spec, offset} = record;
    requireValue(spec.knowledge === "confirmed" && spec.encoding === "bytes"
      && Array.isArray(values) && values.every(byte) && Number.isInteger(start) && start >= 0
      && start + values.length <= spec.width, `${id} 的字节范围无效`);
    backing[spec.physical.space].splice(offset + start, values.length, ...values);
  }
  function restore(snapshot) {
    requireValue(snapshot?.resource_id === resourceId && Array.isArray(snapshot.fields)
      && snapshot.fields.length === records.length, "场景动作现场缺少所属字段");
    const input = new Map(snapshot.fields.map(field => [field.handle, field]));
    requireValue(input.size === records.length, "场景动作现场句柄重复");
    const prepared = new Map();
    for (const record of records) {
      const field = input.get(record.handle), {spec} = record;
      requireValue(field?.field === spec.id && field.index === record.index
        && field.knowledge === spec.knowledge && Array.isArray(field.raw_bytes)
        && field.raw_bytes.length === spec.width && Array.from(field.raw_bytes).every(value => value === null || byte(value))
        && sameValue(field.value, decode(spec, field.raw_bytes)), `${record.handle} 的现场与字段声明不符`);
      field.raw_bytes.forEach((value, index) => {
        const key = `${spec.physical.space}:${record.offset + index}`;
        requireValue(!prepared.has(key) || prepared.get(key) === value, "运行工作区叠加视图原像不一致");
        prepared.set(key, value);
      });
    }
    for (const [key, value] of prepared) {
      const [space, offset] = key.split(":");
      backing[space][Number(offset)] = value;
    }
  }
  const fieldView = record => {
      const {spec} = record;
      return Object.freeze({resourceId, handle: record.handle, fieldName: spec.id,
        index: record.index,
        knowledge: spec.knowledge, evidence: structuredClone(spec.evidence),
        writable: spec.knowledge === "confirmed",
        physical: Object.freeze({...spec.physical, offset: record.offset, length: spec.width}),
        get value() {return decode(spec, rawBytes(record));},
        get rawBytes() {return rawBytes(record);},
        set value(value) {write(spec.id, value, record.index);}});
  };
  return Object.freeze({resourceId,
    read: (id, index = 0) => decode(find(id, index).spec, rawBytes(find(id, index))), write, writeBytes,
    field: (id, index = 0) => fieldView(find(id, index)),
    capture: () => ({resource_id: resourceId, fields: records.map(project)}), restore,
    fields: () => records.map(fieldView),
    exportMemory: () => structuredClone(backing),
  });
}

export const runtimeWorkspaceFieldOwner = Object.freeze({resourceId: OWNER,
  describe: () => [], objects: () => [], documentView: true,
  createState: options => createRuntimeFieldState({...options, resourceId: OWNER})});
