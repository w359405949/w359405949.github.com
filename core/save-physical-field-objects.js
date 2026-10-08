// @editor-module 为存档未细分的物理字节建立无写入许可的字段对象。
import {formatPhysicalAddress} from "./physical-address.js";

function validAddress(address, length) {
  const start = Number(address?.offset);
  const end = Number(address?.end_exclusive);
  return address?.space === "sram" && Number.isInteger(start) && start >= 0
    && Number.isInteger(end) && end > start && end <= length
    && Number(address.length) === end - start;
}

export function createSavePhysicalFieldObjects(document_, fields, state_) {
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

export function projectSavePhysicalAnnotations(document_, catalog) {
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
