// @editor-module 音频操作码的处理器指针按已发布音频图逐项登记。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

const OWNER = "audio-opcode";
const FIELD = "handler_pointer";
const SCHEMA = "metalmaxcn.module-asset.audio-opcode";
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};

function recordsOf(document) {
  const records = document?.records;
  requireValue(Array.isArray(records) && records.length === 84,
    `${OWNER} 必须包含 $90-$E3 的 84 个处理器指针`);
  records.forEach((row, index) => {
    const handle = `${OWNER}:${(index + 0x90).toString(16).toUpperCase()}`;
    const address = row?.pointer_field;
    requireValue(row?.handle === handle && Number.isInteger(row.handler_pointer)
      && row.handler_pointer >= 0 && row.handler_pointer <= 0xffff
      && address?.space === "prg" && Number.isSafeInteger(address.offset)
      && address.length === 2 && address.end_exclusive === address.offset + 2,
    `${OWNER} 处理器指针或物理位置无效：${handle}`);
  });
  return records;
}

function audioOpcodeFieldDescriptions(document) {
  return recordsOf(document).map((row, index) => ({
    resourceId: OWNER, entityHandle: row.handle, fieldName: FIELD,
    documentPath: ["records", index, FIELD], defaultValue: row.handler_pointer,
    publishedAddress: row.pointer_field, writeback: ROM_WRITE_PENDING,
  }));
}

function audioOpcodeObjects(document) {
  const records = recordsOf(document);
  return [{id: OWNER, label: "音频操作码处理器指针", fragmentIds: [],
    fields: records.map(row => [row.handle, FIELD]),
    editor: {kind: "numeric-table", rows: records.map(row => row.handle),
      rowLabels: records.map(row => row.label || row.handle),
      columns: [{name: FIELD, label: "处理器地址", min: 0, max: 0xffff}]}}];
}

function validateAsset(candidate, original) {
  requireValue(candidate?.schema === SCHEMA && original?.schema === SCHEMA
    && candidate.resource_id === OWNER && original.resource_id === OWNER,
  `${OWNER} 资源身份无效`);
  const expected = structuredClone(original);
  const rows = recordsOf(candidate.document);
  recordsOf(original.document);
  rows.forEach((row, index) => {expected.document.records[index][FIELD] = row[FIELD];});
  requireValue(canonicalJsonEqual(candidate, expected),
    `${OWNER} 只允许修改处理器指针值`);
}

function validateAudioOpcodeFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, audioOpcodeFieldDescriptions, validateAsset);
}

export const audioOpcodeFieldOwner = Object.freeze({
  compilerId: "audio-opcode/v1", describe: audioOpcodeFieldDescriptions,
  validate: validateAudioOpcodeFieldOverrides, encode: () => [],
  objects: audioOpcodeObjects, objectCount: () => 1,
  documentView: true, legacyClosed: true,
});
