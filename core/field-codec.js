// @editor-module 共用稀疏字段候选校验；字节编码仍由各域直接读取字段对象。
import {canonicalJsonEqual} from "./project-store-values.js";

export const SPARSE_ARRAY_FORMAT = "sparse-array/v1";

export const ROM_WRITE_PENDING = Object.freeze({target: "rom", state: "unpermitted",
  missing: Object.freeze(["replacement-permission"])});

// 当前值保持可编辑；未获写入许可的字段只序列化其 Origin。
// 描述里的 `fragmentId`／`offsetInFragment`／`byteLength` 在字段对象上搬进了 `physical`；
// 序列化与原像校验两处都按同一读法取值，两种形状都能读。
export const fieldFragmentId = field => field?.physical?.component?.fragment_id
  ?? field?.physical?.component?.component_id ?? field?.fragmentId;
export const fieldOffsetInFragment = field => field?.physical?.offsetInFragment ?? field?.offsetInFragment;
export const fieldByteLength = field => field?.physical?.byteLength ?? field?.byteLength;

export const fieldByteOffsets = field => {
  const physical = field?.physical;
  const offsets = physical?.byteOffsetsInFragment ?? field?.byteOffsetsInFragment;
  if (Array.isArray(offsets)) return offsets;
  const start = fieldOffsetInFragment(field), length = fieldByteLength(field);
  return Number.isInteger(start) && Number.isInteger(length)
    ? Array.from({length}, (_, index) => start + index) : [];
};

export function fieldRomValue(field, {defaults = false} = {}) {
  return defaults || field.writeback?.state === "unpermitted" ? field.defaultValue : field.value;
}

export function fieldAssetPaths(field) {
  return field.assetPath ? [field.assetPath]
    : (field.documentPaths || [field.documentPath]).map(path => ["document", ...path]);
}

// 数组坐标只选择字段值内部的位置，不参与字段身份。
export function fieldStoredValue(field, stored) {
  if (field.workingFormat !== SPARSE_ARRAY_FORMAT) return structuredClone(stored);
  if (!stored || stored.kind !== SPARSE_ARRAY_FORMAT || !Array.isArray(stored.entries)
      || Object.keys(stored).sort().join() !== "entries,kind" || !stored.entries.length)
    throw new TypeError("数组字段 Working 格式无效");
  const value = structuredClone(field.defaultValue);
  let previous = -1;
  for (const entry of stored.entries) {
    if (!entry || Object.keys(entry).sort().join() !== "index,value"
        || !Number.isSafeInteger(entry.index) || entry.index <= previous || entry.index >= value.length)
      throw new TypeError("数组字段 Working 坐标无效");
    previous = entry.index;
    value[entry.index] = structuredClone(entry.value);
  }
  return value;
}

function fieldArraySelection(field, selection) {
  if (field.workingFormat !== SPARSE_ARRAY_FORMAT || !Array.isArray(field.defaultValue))
    throw new TypeError("该字段不支持数组选区");
  if (selection == null) return field.defaultValue.map((_, index) => index);
  if (!Array.isArray(selection) || !selection.length) throw new TypeError("字段选区不能为空");
  const indices = [];
  let end = 0;
  for (const range of selection) {
    if (!range || Object.keys(range).sort().join() !== "length,offset"
        || !Number.isSafeInteger(range.offset) || !Number.isSafeInteger(range.length)
        || range.offset < end || range.length < 1 || range.offset + range.length > field.defaultValue.length)
      throw new TypeError("字段选区越界或重叠");
    end = range.offset + range.length;
    for (let index = range.offset; index < end; index++) indices.push(index);
  }
  return indices;
}

export function changeArrayFieldWorking(field, previous, {value, reset, selection}) {
  const indices = fieldArraySelection(field, selection);
  if (!reset && (!Array.isArray(value) || value.length !== field.defaultValue.length))
    throw new TypeError("数组字段容量不能改变");
  if (previous !== undefined) fieldStoredValue(field, previous);
  const entries = new Map((previous?.entries || []).map(entry => [entry.index, entry.value]));
  for (const index of indices) {
    if (reset || canonicalJsonEqual(value[index], field.defaultValue[index])) entries.delete(index);
    else entries.set(index, structuredClone(value[index]));
  }
  return entries.size ? {kind: SPARSE_ARRAY_FORMAT,
    entries: [...entries].sort((a, b) => a[0] - b[0]).map(([index, value]) => ({index, value}))} : undefined;
}

export function validateFieldOverrides(original, overrides, describe, validate) {
  const candidate = structuredClone(original);
  const descriptions = new Map(describe(original.document, {asset: original})
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]), field = descriptions.get(key);
    if (row.resource_id !== original.resource_id || !field || seen.has(key))
      throw new TypeError("字段覆盖身份重复或未登记");
    seen.add(key);
    for (const path of fieldAssetPaths(field)) {
      const parent = path.slice(0, -1).reduce((node, part) => node[part], candidate);
      parent[path.at(-1)] = fieldStoredValue(field, row.value);
    }
  }
  validate(candidate, original);
}

// 文档导入只把值交给同一 owner 的字段描述、候选校验与编码器。
export function importFieldDocument(asset, original, owner, dependencies = {}) {
  const expected = structuredClone(original), overrides = [];
  const fields = owner.describe(original.document, {asset: original}).map(description => {
    const paths = fieldAssetPaths(description);
    const value = paths[0].reduce((node, key) => node?.[key], asset);
    for (const path of paths) {
      if (!canonicalJsonEqual(value, path.reduce((node, key) => node?.[key], asset)))
        throw new TypeError("字段导入的别名值不一致");
      const parent = path.slice(0, -1).reduce((node, key) => node[key], expected);
      parent[path.at(-1)] = value;
    }
    const hasOverride = !canonicalJsonEqual(value, description.defaultValue);
    if (hasOverride) overrides.push({resource_id: description.resourceId,
      entity_handle: description.entityHandle, field_name: description.fieldName,
      value: description.workingFormat === SPARSE_ARRAY_FORMAT
        ? changeArrayFieldWorking(description, undefined, {value, reset: false}) : value});
    return Object.freeze({...description, hasOverride,
      working: hasOverride ? value : undefined, value});
  });
  owner.projectImportView?.(expected.document);
  if (!canonicalJsonEqual(asset, owner.projectImportView ? structuredClone(expected) : expected))
    throw new TypeError("字段导入不能修改身份、布局或证据");
  owner.validate(original, overrides, dependencies);
  return {fields, overrides};
}

export function encodeImportedDocumentFields(asset, original, owner, dependencies = {}) {
  return owner.encode(importFieldDocument(asset, original, owner, dependencies).fields);
}
