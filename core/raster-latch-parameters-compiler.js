// @editor-module 将首 IRQ latch 与非零 profile 的初始 CHR 标志编码到独立 profile 表。
import {canonicalJsonEqual} from "./project-store-values.js";
import {ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";
import {byteTableFieldObjectCodec} from "./field-object.js";
export const RASTER_LATCH_COMPILER_ID = "raster-latch-parameters/v1";
export const RASTER_LATCH_COMPONENT_CODEC = "metalmaxcn.raster-latch-parameters";
const OWNER = "raster-interrupt-runtime-service";
const FIELD = "raster_profile_first_irq_latch_table";
const CHR_FIELD = "raster_profile_initial_raster_chr_apply_flag_table";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function rasterLatchComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown raster latch owner");
  return [{fragmentId: `${OWNER}.profile-selector-tables`, length: 39}];
}
export function rasterLatchAssetSchema(resourceId) {
  rasterLatchComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
function validateRasterLatchAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === rasterLatchAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === rasterLatchAssetSchema(OWNER), "raster latch identity/policy drift");
    for (const field of ["raster_profile_handler_selector_table", FIELD,
      "raster_profile_initial_raster_chr_apply_flag_table"]) {
      const values = doc[field];
      requireValue(Array.isArray(values) && values.length === 13
        && values.every(v => Number.isInteger(v) && v >= 0 && v <= 255), "每张 profile 表必须含 13 个 0–255 整数");
    }
  }
  const expected = structuredClone(original);
  expected.document.raster_profile_handler_selector_table =
    structuredClone(asset.document.raster_profile_handler_selector_table);
  expected.document[FIELD] = structuredClone(asset.document[FIELD]);
  expected.document[CHR_FIELD] = structuredClone(asset.document[CHR_FIELD]);
  requireValue(canonicalJsonEqual(asset, expected), "仅可修改 profile 表原值；ROM 提取快照保持不变");
}

const TABLES = ["raster_profile_handler_selector_table", FIELD, CHR_FIELD];
const NAMES = ["handler_selector", "first_irq_latch", "initial_chr_apply_flag"];
const protectedField = (column, profile) => column === 0 || (column === 2 && profile === 0);
const rasterByteCodec = byteTableFieldObjectCodec({resourceId: OWNER,
  fragmentId: rasterLatchComponentSpecs(OWNER)[0].fragmentId,
  fields: NAMES.flatMap(name => Array.from({length: 13}, (_, profile) => [`${OWNER}:profile:${profile}`, name]))});
const RASTER_COLUMN_LABELS = Object.freeze({
  handler_selector: "处理器选择槽",
  first_irq_latch: "首 IRQ latch · 0–255（profile 0 禁用 IRQ）",
  initial_chr_apply_flag: "首 IRQ 前应用 CHR（0 关闭，1–255 开启；profile 0 始终跳过）",
});
export const rasterLatchFieldObjectCodec = Object.freeze({...rasterByteCodec,
  objects: () => rasterByteCodec.objects().map(definition => ({...definition, label: "光栅配置档选择器表",
    editor: {kind: "numeric-table", rows: [...new Set(definition.fields.map(([entityHandle]) => entityHandle))],
      rowLabels: Array.from({length: 13}, (_, profile) => `配置 ${profile}`),
      columns: NAMES.map(name => ({name, label: RASTER_COLUMN_LABELS[name], min: 0, max: 0xff}))}})),
  serializeField(field) {
    return rasterByteCodec.serializeField(field);
  },
});
// These are fixed selector-indexed value tables, not reorderable record lists.
export function rasterLatchFieldDescriptions(document) {
  requireValue(document?.module_id === OWNER, "raster field owner drift");
  return TABLES.flatMap((table, column) => {
    requireValue(document[table]?.length === 13, "raster field table drift");
    return Array.from({length: 13}, (_, profile) => ({resourceId: OWNER,
      entityHandle: `${OWNER}:profile:${profile}`, fieldName: NAMES[column],
      documentPath: [table, profile], defaultValue: document[table][profile],
      ...(protectedField(column, profile) ? {writeback: ROM_WRITE_PENDING} : {}),
      fragmentId: rasterLatchComponentSpecs(OWNER)[0].fragmentId, offsetInFragment: column * 13 + profile, byteLength: 1}));
  });
}
export function validateRasterLatchFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, rasterLatchFieldDescriptions, validateRasterLatchAsset);
}
export function encodeRasterLatchFields(fields, {defaults = false} = {}) {
  const payload = new Uint8Array(39), seen = new Set();
  for (const field of fields) {
    const match = /^raster-interrupt-runtime-service:profile:([0-9]|1[0-2])$/u.exec(field.entityHandle);
    const column = NAMES.indexOf(field.fieldName), value = defaults ? field.defaultValue : field.value;
    requireValue(field.resourceId === OWNER && match && column >= 0, "raster build identity drift");
    const profile = Number(match[1]), index = column * 13 + profile;
    requireValue(!seen.has(index) && Number.isInteger(value) && value >= 0 && value <= 255, "raster build value drift");
    seen.add(index); payload[index] = field.writeback?.state === "unpermitted" ? field.defaultValue : value;
  }
  requireValue(seen.size === 39, "raster build fields incomplete");
  return [{fragment_id: rasterLatchComponentSpecs(OWNER)[0].fragmentId, payload, relocations: []}];
}
