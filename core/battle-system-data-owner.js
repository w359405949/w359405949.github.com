// @editor-module 已确认的数据块按原始 u8 登记，代码字节不进入字段对象。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

export const BATTLE_SYSTEM_DATA_IDS = Object.freeze([
  "controller-input-service",
  "cpu-interrupt-vector-table",
  "code-module",
  "palette-runtime-service",
]);
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};

function recordsOf(moduleId, document) {
  requireValue(BATTLE_SYSTEM_DATA_IDS.includes(moduleId)
    && document?.module_id === moduleId && Array.isArray(document.records)
    && document.records.length > 0, `${moduleId} 数据块资源无效`);
  for (const record of document.records) {
    const address = record?.address;
    requireValue(typeof record?.id === "string" && record.id.startsWith(`${moduleId}.`)
      && typeof record.label === "string"
      && address?.space === "prg" && Number.isSafeInteger(address.offset)
      && Number.isSafeInteger(address.length) && address.length > 0
      && address.end_exclusive === address.offset + address.length
      && Array.isArray(record.values) && record.values.length === address.length
      && record.values.every(value => Number.isInteger(value) && value >= 0 && value <= 255),
    `${moduleId} 数据块值或物理范围无效`);
  }
  return document.records;
}

function descriptions(moduleId, document) {
  return recordsOf(moduleId, document).flatMap((record, recordIndex) =>
    record.values.map((value, byteIndex) => ({
      resourceId: moduleId,
      entityHandle: `${record.id}:${byteIndex.toString(16).toUpperCase().padStart(2, "0")}`,
      fieldName: "value", documentPath: ["records", recordIndex, "values", byteIndex],
      defaultValue: value, writeback: ROM_WRITE_PENDING,
      publishedAddress: {space: "prg", offset: record.address.offset + byteIndex,
        length: 1, end_exclusive: record.address.offset + byteIndex + 1},
    })));
}

function objects(moduleId, document) {
  const rows = descriptions(moduleId, document);
  return [{id: moduleId, label: moduleId, fragmentIds: [],
    fields: rows.map(row => [row.entityHandle, row.fieldName]),
    editor: {kind: "numeric-table", rows: rows.map(row => row.entityHandle),
      rowLabels: rows.map(row => row.entityHandle),
      columns: [{name: "value", label: "原始数据字节", min: 0, max: 255}]}}];
}

function validateAsset(moduleId, candidate, original) {
  const schema = `metalmaxcn.module-asset.${moduleId}`;
  requireValue(candidate?.schema === schema && original?.schema === schema
    && candidate.resource_id === moduleId && original.resource_id === moduleId,
  `${moduleId} 资源身份无效`);
  const expected = structuredClone(original);
  const records = recordsOf(moduleId, candidate.document);
  recordsOf(moduleId, original.document);
  records.forEach((record, index) => {
    expected.document.records[index].values = [...record.values];
  });
  requireValue(canonicalJsonEqual(candidate, expected),
    `${moduleId} 只允许修改已确认的数据字节`);
}

export function battleSystemDataFieldOwner(moduleId) {
  requireValue(BATTLE_SYSTEM_DATA_IDS.includes(moduleId), `未知系统数据节点：${moduleId}`);
  const describe = document => descriptions(moduleId, document);
  return Object.freeze({
    compilerId: `${moduleId}/data/v1`, describe,
    validate: (original, overrides) => validateFieldOverrides(original, overrides,
      describe, (candidate, basis) => validateAsset(moduleId, candidate, basis)),
    encode: () => [], objects: document => objects(moduleId, document),
    objectCount: () => 1, documentView: true, legacyClosed: true,
  });
}
