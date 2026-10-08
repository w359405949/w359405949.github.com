// @editor-module 记录型字段 owner 共用件：一条记录一个字段对象，逐字段给 documentPath。
// 声明形状相同的模块只写声明（约束 32）；写入许可未发布时字段带 ROM_WRITE_PENDING。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";
import {mountFieldObjectControls} from "./field-object.js";

/** 记录字段清单：定长列表，或按文档里的记录现推（记录键去掉证据键）。 */
function readFields(spec, record, handle, handleField) {
  const fields = typeof spec.fields === "function" ? spec.fields(record, handle) : spec.fields;
  if (!Array.isArray(fields) || !fields.length)
    throw new TypeError(`${spec.owner}: 记录 ${handle} 没有字段清单`);
  const evidence = new Set([...(spec.evidenceFields ?? ["sources"]), handleField]);
  const names = fields.filter(name => !evidence.has(name));
  if (!names.length || names.some(name => typeof name !== "string" || !name))
    throw new TypeError(`${spec.owner}: 记录 ${handle} 的字段清单无效`);
  return names;
}

/**
 * 记录型字段 owner：`{owner, schema, resourcePrefix?, recordsPath?, handleField?, fields, readOnlyFields?}`。
 * `fields` 给数组即定长，给函数则按记录现推。
 */
export function createRecordsOwner(spec) {
  const {owner, schema, recordsPath = "records", handleField = "handle"} = spec;
  const readOnly = new Set(spec.readOnlyFields ?? []);
  if (!owner || !schema) throw new TypeError("记录型 owner 声明缺少 owner／schema");

  function recordsOf(document) {
    const records = document?.[recordsPath];
    if (!Array.isArray(records) || !records.length)
      throw new TypeError(`${owner}: 文档缺少 ${recordsPath}`);
    return records;
  }

  function fieldDescriptions(document) {
    const seen = new Set();
    return recordsOf(document).flatMap((record, index) => {
      const handle = record?.[handleField];
      if (typeof handle !== "string" || !handle.startsWith(`${owner}:`))
        throw new TypeError(`${owner}: 记录句柄无效：${handle}`);
      if (seen.has(handle)) throw new TypeError(`${owner}: 记录句柄重复：${handle}`);
      seen.add(handle);
      return readFields(spec, record, handle, handleField).map(fieldName => ({
        resourceId: owner, entityHandle: handle, recordId: record.id,
        fieldName, defaultValue: record[fieldName], documentPath: [recordsPath, index, fieldName],
        ...(spec.readOnlyAll === true || readOnly.has(fieldName)
          ? {readOnly: true, edit_policy: "immutable",
            immutable_reason: spec.immutableReasons?.[fieldName]} : {}),
        writeback: ROM_WRITE_PENDING,
      }));
    });
  }

  function objects(document, {offset = 0, limit} = {}) {
    const records = recordsOf(document);
    const recordByHandle = new Map(records.map(record => [record?.[handleField], record]));
    const byHandle = new Map();
    for (const field of fieldDescriptions(document)) {
      const rows = byHandle.get(field.entityHandle) || [];
      rows.push(field);
      byHandle.set(field.entityHandle, rows);
    }
    const listed = [...byHandle].map(([handle, rows]) => ({
      id: handle, label: `${owner} ${handle.slice(owner.length + 1)}`, fragmentIds: [],
      fields: rows.map(row => [row.entityHandle, row.fieldName]),
      editor: typeof spec.editor === "function"
        ? spec.editor({record: recordByHandle.get(handle), handle, fields: rows})
        : {kind: "numeric-table", rows: [handle], rowLabels: [handle],
        columns: rows.map(row => ({name: row.fieldName, label: row.fieldName,
          ...(Number.isInteger(row.defaultValue) ? {} : {text: true})}))},
    }));
    // 承载页按对象分页取数：声明只描述形状，切片在这里做。
    return limit === undefined ? listed.slice(offset) : listed.slice(offset, offset + limit);
  }

  /**
   * 只许改已登记的字段：把**候选**在已登记位置上的值搬进 Original 的副本再比，
   * 相等即「除已登记字段外一字未动」。搬 Original 自己的默认值再比是把判断写反了。
   */
  function validateAsset(candidate, original) {
    const expected = structuredClone(original);
    for (const field of fieldDescriptions(original.document)) {
      const path = field.documentPath;
      const value = path.reduce((node, step) => (node === undefined ? undefined : node[step]),
        candidate.document);
      if (typeof spec.validateFieldValue === "function")
        spec.validateFieldValue(field, value, path.reduce((node, step) => node[step], original.document));
      const parent = path.slice(0, -1).reduce((node, step) => node[step], expected.document);
      parent[path.at(-1)] = value;
    }
    if (!canonicalJsonEqual(candidate, expected))
      throw new TypeError(`${owner}: 仅可修改已登记的字段`);
  }

  /** 只读字段不接受修改：派生引用视图（约束 48）靠这一步挡住写入，不靠界面。 */
  function validateOverrides(original, overrides) {
    const readOnly = new Map(fieldDescriptions(original.document)
      .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field.readOnly === true]));
    for (const row of overrides) {
      if (readOnly.get(JSON.stringify([row.entity_handle, row.field_name])) === true) {
        throw new TypeError(`${owner}: 只读字段不接受修改：${row.entity_handle}/${row.field_name}`);
      }
    }
    validateFieldOverrides(original, overrides, fieldDescriptions, validateAsset);
  }

  return Object.freeze({
    describe: fieldDescriptions, objects,
    validate: validateOverrides,
    encode: () => [], controls: mountFieldObjectControls,
    defaultSourceKind: "rom", writeback: ROM_WRITE_PENDING,
    documentView: true, legacyClosed: true,
  });
}
