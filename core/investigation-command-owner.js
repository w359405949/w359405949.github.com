// @editor-module 调查命令选择器的逐记录字段；ROM 写入许可未发布。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

const PREFIX = "investigation-command:";
const IDS = Object.freeze(["1A", "1B", "1C", "1D", "2D", "32", "33", "35", "36", "37", "38"]);
export const INVESTIGATION_COMMAND_RESOURCE_IDS = Object.freeze(IDS.map(id => PREFIX + id));
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

function identity(asset, document = asset?.document) {
  const resourceId = asset?.resource_id ?? `${PREFIX}${document?.command_id_hex?.slice(2)}`;
  require(INVESTIGATION_COMMAND_RESOURCE_IDS.includes(resourceId)
    && (!asset || (asset.schema === "metalmaxcn.field-ui-module.asset.investigation-command"
      && asset.edit_policy === "mutable")), "调查命令资源身份无效");
  return resourceId;
}

function describe(document, {asset} = {}) {
  const resourceId = identity(asset, document);
  const address = document?.selector_table_entry;
  require(address?.space === "prg" && address.length === 1
    && Number.isInteger(address.offset) && address.offset >= 0
    && document.command_id_hex === `0x${resourceId.slice(PREFIX.length)}`
    && document.investigation_command_selector === Number.parseInt(
      resourceId.slice(PREFIX.length), 16), "调查命令选择器与已发布地址不符");
  return [{resourceId, entityHandle: resourceId,
    fieldName: "investigation_command_selector",
    defaultValue: document.investigation_command_selector,
    documentPath: ["investigation_command_selector"],
    writeback: ROM_WRITE_PENDING}];
}

function objects(document, {asset} = {}) {
  const field = describe(document, {asset})[0];
  return [{id: field.resourceId, label: document.label,
    fragmentIds: [], fields: [[field.entityHandle, field.fieldName]],
    editor: {kind: "numeric-table", rows: [field.entityHandle],
      columns: [{name: field.fieldName, label: "调查命令选择器", min: 0, max: 255}]}}];
}

function validate(candidate, original) {
  identity(candidate);
  require(candidate.resource_id === original.resource_id
    && Number.isInteger(candidate.document?.investigation_command_selector)
    && candidate.document.investigation_command_selector >= 0
    && candidate.document.investigation_command_selector <= 255,
  "调查命令选择器取值无效");
  const expected = structuredClone(original);
  expected.document.investigation_command_selector =
    candidate.document.investigation_command_selector;
  require(canonicalJsonEqual(candidate, expected), "调查命令只允许修改选择器字节");
}

export function investigationCommandFieldOwner(resourceId) {
  require(INVESTIGATION_COMMAND_RESOURCE_IDS.includes(resourceId),
    "调查命令 owner 身份无效");
  return Object.freeze({compilerId: null, physicalWriteback: false,
    writeback: ROM_WRITE_PENDING, describe, objects,
    validate: (original, overrides) => validateFieldOverrides(
      original, overrides, describe, validate),
    encode: () => [], controls: null, documentView: true, legacyClosed: true});
}
