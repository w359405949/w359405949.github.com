// @editor-module 场景角色运行时的剧情门桩定值代码字段。
import {ROM_WRITE_PENDING, fieldRomValue, validateFieldOverrides} from "./field-codec.js";
import {canonicalJsonEqual} from "./project-store-values.js";

const OWNER = "scene-actor-runtime";
const SPECS = Object.freeze([
  ["autonomous-gate", 8], ["interaction-gate", 12], ["glyph-guard", 14], ["interaction-call", 3],
  ["interaction-pointer", 14],
]);
const requireValue = (condition, message) => {if (!condition) throw new TypeError(message);};
const byteArray = (value, length) => Array.isArray(value) && value.length === length
  && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255);
const isGate = field => SPECS.some(([id]) => field.fragmentId === `${OWNER}.${id}`
  || field.physical?.component?.fragment_id === `${OWNER}.${id}`);

function describe(document) {
  if (document.farjump === undefined) return [];
  const products = document.farjump.products;
  requireValue(Array.isArray(products) && products.length === SPECS.length, "剧情门桩 Origin 无效");
  return SPECS.map(([id, length], index) => {
    const product = products[index];
    requireValue(product.id === id && typeof product.enabled === "boolean"
      && byteArray(product.approved_bytes, length) && byteArray(product.original_bytes, length),
    "剧情门桩定值产物无效");
    return {resourceId: OWNER, entityHandle: `${OWNER}:farjump:${id}`, fieldName: "enabled",
      documentPath: ["farjump", "products", index, "enabled"], defaultValue: false,
      fragmentId: `${OWNER}.${id}`, offsetInFragment: 0, byteLength: length,
      approvedBytes: product.approved_bytes, originalBytes: product.original_bytes,
      ...(product.write_permission?.status === "approved" ? {} : {writeback: ROM_WRITE_PENDING})};
  });
}

function checkField(field) {
  const spec = SPECS.find(([id]) => field?.entityHandle === `${OWNER}:farjump:${id}`);
  requireValue(spec && field.resourceId === OWNER && field.fieldName === "enabled"
    && field.defaultValue === false && typeof field.value === "boolean"
    && byteArray(field.approvedBytes, spec[1]) && byteArray(field.originalBytes, spec[1]),
  "剧情门桩代码字段无效");
}

export function withStoryFarjumpGateFields(base) {
  return Object.freeze({...base, compilerId: "story-farjump-code/v1",
    describe: document => [...base.describe(document), ...describe(document)],
    validate(original, overrides) {
      const gates = new Set(describe(original.document).map(field => field.entityHandle));
      base.validate(original, overrides.filter(override => !gates.has(override.entity_handle)));
      const selected = overrides.filter(override => gates.has(override.entity_handle));
      if (!selected.length) return;
      validateFieldOverrides(original, selected, describe, (current, origin) => {
        const expected = structuredClone(origin);
        current.document.farjump.products.forEach((product, index) => {
          requireValue(typeof product.enabled === "boolean", "剧情门桩激活字段须为布尔值");
          expected.document.farjump.products[index].enabled = product.enabled;
        });
        requireValue(canonicalJsonEqual(current, expected), "剧情门桩只能激活审定的定值产物");
      });
    },
    objects: document => [...base.objects(document), ...describe(document).map(field => ({
      id: field.entityHandle, label: "剧情门桩", fragmentIds: [field.fragmentId],
      fields: [[field.entityHandle, field.fieldName]],
    }))],
    encode(fields, options = {}) {
      const gates = fields.filter(isGate);
      return [...base.encode(fields.filter(field => !isGate(field)), options), ...gates.map(field => {
        checkField(field);
        return {fragment_id: field.fragmentId || field.physical.component.fragment_id,
          payload: Uint8Array.from(fieldRomValue(field, options) ? field.approvedBytes : field.originalBytes),
          relocations: []};
      })];
    },
    serializeField(field) {
      if (!isGate(field)) return base.serializeField(field);
      checkField(field);
      requireValue(field.value === true && field.writeback?.state !== "unpermitted",
        "剧情门桩没有激活 Working 或写入许可");
      return Uint8Array.from(field.approvedBytes);
    },
    validatePreimage(fields, fragmentId, baseline) {
      const field = fields.find(field => (field.fragmentId || field.physical?.component?.fragment_id) === fragmentId);
      checkField(field);
      requireValue(field.originalBytes.length === baseline.length
        && field.originalBytes.every((byte, index) => byte === baseline[index]), "剧情门桩 Origin 与绑定原像不同");
    },
  });
}
