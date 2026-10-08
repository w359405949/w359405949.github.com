// @editor-module 未归入设施物理块的例程逐字节字段；ROM 写入许可未发布。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

export const UI_FACILITY_ROUTINE_RESOURCE_IDS = Object.freeze([
  "ui-facility:frog-race:routine:03",
  "ui-facility:frog-race:routine:05",
  ...Array.from({length: 5}, (_, id) =>
    `ui-facility:teleport-terminal:routine:${id.toString(16).toUpperCase().padStart(2, "0")}`),
]);
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

function resourceIdOf(asset) {
  const resourceId = asset?.resource_id;
  require(UI_FACILITY_ROUTINE_RESOURCE_IDS.includes(resourceId)
    && asset.schema === "metalmaxcn.field-ui-module.asset.ui-facility"
    && asset.edit_policy === "mutable", "设施例程资源身份无效");
  return resourceId;
}

function describe(document, {asset} = {}) {
  const resourceId = resourceIdOf(asset);
  const address = document?.address;
  const values = document?.values;
  require(address?.space === "prg" && Number.isInteger(address.offset)
    && address.offset >= 0 && Number.isInteger(address.length)
    && Array.isArray(values) && values.length === address.length
    && values.every(value => Number.isInteger(value) && value >= 0 && value <= 255),
  "设施例程原始字节无效");
  return values.map((value, index) => ({resourceId, entityHandle: resourceId,
    fieldName: `byte_${index}`, defaultValue: value,
    documentPath: ["values", index], writeback: ROM_WRITE_PENDING}));
}

function objects(document, {asset} = {}) {
  const resourceId = resourceIdOf(asset);
  const fields = describe(document, {asset});
  return [{id: resourceId, label: document.name || resourceId,
    fragmentIds: [], fields: fields.map(field => [resourceId, field.fieldName]),
    editor: {kind: "numeric-table", rows: [resourceId],
      columns: fields.map((field, index) => ({name: field.fieldName,
        label: `字节 ${index}`, min: 0, max: 255}))}}];
}

function validate(candidate, original) {
  const resourceId = resourceIdOf(original);
  require(candidate?.resource_id === resourceId && candidate.schema === original.schema
    && candidate.edit_policy === original.edit_policy
    && Array.isArray(candidate.document?.values)
    && candidate.document.values.length === original.document.values.length
    && candidate.document.values.every(value => Number.isInteger(value)
      && value >= 0 && value <= 255), "设施例程字节取值无效");
  const expected = structuredClone(original);
  expected.document.values = [...candidate.document.values];
  require(canonicalJsonEqual(candidate, expected), "设施例程只允许修改已登记字节");
}

export function uiFacilityRoutineFieldOwner(resourceId) {
  require(UI_FACILITY_ROUTINE_RESOURCE_IDS.includes(resourceId),
    "设施例程 owner 身份无效");
  return Object.freeze({compilerId: null, physicalWriteback: false,
    writeback: ROM_WRITE_PENDING, describe, objects,
    validate: (original, overrides) => validateFieldOverrides(
      original, overrides, describe, validate),
    encode: () => [], documentView: true, legacyClosed: true});
}
