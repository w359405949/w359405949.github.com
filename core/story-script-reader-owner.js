// @editor-module 剧情读取器的定值代码字段与激活许可。
import {ROM_WRITE_PENDING, fieldRomValue, validateFieldOverrides} from "./field-codec.js";
import {canonicalJsonEqual} from "./project-store-values.js";

export const STORY_READER_OWNER = "story-script-reader";
const STORY_READER_COMPILER_ID = "story-farjump-code/v1";
const FRAGMENT = `${STORY_READER_OWNER}.code`;
const HANDLE = `${STORY_READER_OWNER}:00`;
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};
const bytes = value => Array.isArray(value) && value.length === 2048
  && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255);

function describe(document) {
  requireValue(document?.module_id === STORY_READER_OWNER && typeof document.enabled === "boolean"
    && bytes(document.original_bytes) && bytes(document.approved_bytes), "剧情读取器 Origin 定值产物无效");
  return [{resourceId: STORY_READER_OWNER, entityHandle: HANDLE, fieldName: "enabled",
    documentPath: ["enabled"], defaultValue: false, fragmentId: FRAGMENT,
    offsetInFragment: 0, byteLength: 2048, approvedBytes: document.approved_bytes,
    originalBytes: document.original_bytes,
    ...(document.write_permission?.status === "approved" ? {} : {writeback: ROM_WRITE_PENDING})}];
}

function validate(original, overrides) {
  requireValue(original.resource_id === STORY_READER_OWNER, "读取器字段对象身份无效");
  validateFieldOverrides(original, overrides, describe, (current, origin) => {
    const expected = structuredClone(origin);
    requireValue(typeof current.document.enabled === "boolean", "读取器激活字段须为布尔值");
    expected.document.enabled = current.document.enabled;
    requireValue(canonicalJsonEqual(current, expected), "读取器只能激活审定的定值产物");
  });
}

function checkField(field) {
  requireValue(field.resourceId === STORY_READER_OWNER && field.entityHandle === HANDLE
    && field.fieldName === "enabled" && field.defaultValue === false
    && typeof field.value === "boolean" && bytes(field.approvedBytes)
    && bytes(field.originalBytes), "读取器代码字段无效");
}

export const storyScriptReaderFieldOwner = Object.freeze({
  compilerId: STORY_READER_COMPILER_ID,
  documentView: true,
  describe,
  validate,
  objects: document => [{id: HANDLE, label: "剧情读取器", fragmentIds: [FRAGMENT],
    fields: describe(document).map(field => [field.entityHandle, field.fieldName])}],
  encode(fields, {defaults = false} = {}) {
    requireValue(fields.length === 1, "读取器字段数量无效");
    const field = fields[0];
    checkField(field);
    return [{fragment_id: FRAGMENT, payload: Uint8Array.from(
      fieldRomValue(field, {defaults}) ? field.approvedBytes : field.originalBytes), relocations: []}];
  },
  serializeField(field) {
    checkField(field);
    requireValue(field.value === true && field.writeback?.state !== "unpermitted", "读取器没有激活 Working 或写入许可");
    return Uint8Array.from(field.approvedBytes);
  },
  validatePreimage(fields, fragmentId, baseline) {
    requireValue(fields.length === 1 && fragmentId === FRAGMENT, "读取器原像身份无效");
    checkField(fields[0]);
    requireValue(baseline.length === 2048
      && fields[0].originalBytes.every((byte, index) => byte === baseline[index]), "读取器 Origin 与绑定原像不同");
  },
});
