// @editor-module 编码音频 owner 的 96 项 LE16 APU timer 与 16 步原始淡出增量，不持有物理地址。
import {canonicalJsonEqual} from "./project-store-values.js";
import {AUDIO_PERIOD_TABLE_SHAPES} from "./shared-table-shapes.js";
export const AUDIO_PERIOD_COMPILER_ID = "audio-period-parameters/v1";
export const AUDIO_PERIOD_COMPONENT_CODEC = "metalmaxcn.audio-period-parameter";
const OWNER = "audio-driver-section";
function requireValue(condition, message) {if (!condition) throw new Error(message);}
export function audioPeriodComponentSpecs(resourceId) {
  requireValue(resourceId === OWNER, "unknown audio period owner");
  return AUDIO_PERIOD_TABLE_SHAPES.map(shape => ({fragmentId: `${OWNER}.${shape.table}`,
    length: shape.count * shape.width}));
}
export function audioPeriodAssetSchema(resourceId) {
  audioPeriodComponentSpecs(resourceId);
  return `metalmaxcn.module-asset.${OWNER}`;
}
// Candidate validation does not serialize. Only field objects produce bytes.
function validateAudioPeriodAsset(asset, original) {
  for (const candidate of [asset, original]) {
    const doc = candidate?.document;
    requireValue(candidate?.resource_id === OWNER && candidate.schema === audioPeriodAssetSchema(OWNER)
      && candidate.edit_policy === "mutable" && doc?.module_id === OWNER
      && doc.schema === audioPeriodAssetSchema(OWNER), "audio period identity/policy drift");
    requireValue(doc.record_count === AUDIO_PERIOD_TABLE_SHAPES[0].count
      && doc.owned_byte_count === AUDIO_PERIOD_TABLE_SHAPES.reduce((sum, shape) => sum + shape.count * shape.width, 0)
      && doc.table_handle === `${OWNER}:period-table`, "audio period table shape drift");
    requireValue(Array.isArray(doc.records) && doc.records.length === AUDIO_PERIOD_TABLE_SHAPES[0].count, "expected 96 audio periods");
    doc.records.forEach((row, index) => {
      requireValue(row.id === index, "audio period identity/order drift");
      requireValue(Number.isInteger(row.apu_timer) && row.apu_timer >= 0 && row.apu_timer <= 2047,
        "APU 定时值必须是 0–2047 的整数");
    });
    requireValue(Array.isArray(doc.fade_steps) && doc.fade_steps.length === AUDIO_PERIOD_TABLE_SHAPES[1].count, "expected 16 fade increments");
    doc.fade_steps.forEach((row, index) => {
      requireValue(row.id === index, "fade step identity/order drift");
      requireValue(Number.isInteger(row.increment_raw) && row.increment_raw >= 0 && row.increment_raw <= 255,
        "淡出原始增量必须是 0–255 的整数（按 8 位模加法累加）");
    });
  }
  const expected = structuredClone(original);
  asset.document.records.forEach((row, index) => {
    expected.document.records[index].apu_timer = row.apu_timer;
  });
  asset.document.fade_steps.forEach((row, index) => {
    expected.document.fade_steps[index].increment_raw = row.increment_raw;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改 APU 定时值和淡出原始增量，身份和布局不可修改");
}

function encodeValues(periods, fades) {
  const payload = periods.flatMap(value => [value & 255, value >> 8]);
  return [{fragment_id: audioPeriodComponentSpecs(OWNER)[0].fragmentId,
    payload: Uint8Array.from(payload), relocations: []},
  {fragment_id: audioPeriodComponentSpecs(OWNER)[1].fragmentId,
    payload: Uint8Array.from(fades), relocations: []}];
}

// The published row.id is the codec identity; array position is only a view locator.
const tables = Object.freeze([
  {collection: "records", ...AUDIO_PERIOD_TABLE_SHAPES[0], field: "apu_timer", max: 2047},
  {collection: "fade_steps", ...AUDIO_PERIOD_TABLE_SHAPES[1], field: "increment_raw", max: 255},
]);
export function audioPeriodFieldDescriptions(document) {
  return tables.flatMap(table => {
    const records = document?.[table.collection];
    requireValue(Array.isArray(records) && records.length === table.count, "audio field collection drift");
    const seen = new Set();
    return records.map((row, index) => {
      requireValue(Number.isInteger(row.id) && row.id >= 0 && row.id < table.count && !seen.has(row.id),
        "audio field identity drift");
      seen.add(row.id);
      return {resourceId: OWNER, entityHandle: `${OWNER}:${table.table}:${row.id}`,
        fieldName: table.field, recordId: row.id, tableId: table.table,
        documentPath: [table.collection, index, table.field], defaultValue: row[table.field],
        fragmentId: `${OWNER}.${table.table}`, offsetInFragment: row.id * table.width, byteLength: table.width};
    });
  });
}
export function validateAudioPeriodFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const descriptions = new Map(audioPeriodFieldDescriptions(original.document)
    .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
  const seen = new Set();
  for (const row of overrides) {
    const key = JSON.stringify([row.entity_handle, row.field_name]);
    const field = descriptions.get(key);
    requireValue(row.resource_id === OWNER && field && !seen.has(key), "audio field override identity drift");
    seen.add(key);
    const [collection, index, name] = field.documentPath;
    candidate.document[collection][index][name] = row.value;
  }
  validateAudioPeriodAsset(candidate, original);
}
export function encodeAudioPeriodFields(fields, {defaults = false} = {}) {
  const expected = new Map(tables.flatMap(table => Array.from({length: table.count}, (_, id) =>
    [JSON.stringify([`${OWNER}:${table.table}:${id}`, table.field]), {table, id}])));
  const values = new Map(tables.map(table => [table.table, new Array(table.count)]));
  const seen = new Set();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    const identity = expected.get(key);
    requireValue(field.resourceId === OWNER && identity && !seen.has(key), "audio build field identity drift");
    seen.add(key);
    const value = defaults ? field.defaultValue : field.value;
    requireValue(Number.isInteger(value) && value >= 0 && value <= identity.table.max, "audio build field value drift");
    values.get(identity.table.table)[identity.id] = value;
  }
  requireValue(seen.size === expected.size, "audio build field collection incomplete");
  return encodeValues(values.get("period-table"), values.get("fade-curve"));
}

function periodFieldIdentity(field) {
  const match = /^audio-driver-section:(period-table|fade-curve):(0|[1-9]\d*)$/u.exec(field.entityHandle);
  const table = tables.find(table => table.table === match?.[1]);
  const id = Number(match?.[2]);
  requireValue(field.resourceId === OWNER && table && field.fieldName === table.field
    && Number.isSafeInteger(id) && id >= 0 && id < table.count, "audio build field identity drift");
  return {table, id};
}

export function audioPeriodObjects(document) {
  const fields = audioPeriodFieldDescriptions(document);
  return tables.map(table => ({
    id: `${OWNER}.${table.table}`,
    label: table.table === "period-table" ? "音高与淡出 · APU 定时值" : "音高与淡出 · 淡出增量",
    fragmentIds: [`${OWNER}.${table.table}`],
    fields: fields.filter(field => field.tableId === table.table)
      .map(field => [field.entityHandle, field.fieldName]),
    editor: {
      kind: "numeric-table",
      rows: fields.filter(field => field.tableId === table.table).map(field => field.entityHandle),
      columns: [{name: table.field, label: table.field === "apu_timer" ? "APU 定时值" : "淡出原始增量",
        min: 0, max: table.max}],
    },
  }));
}

export function serializeAudioPeriodField(field) {
  const {table} = periodFieldIdentity(field), value = field.value;
  requireValue(Number.isInteger(value) && value >= 0 && value <= table.max, "audio build field value drift");
  return table.width === 2 ? new Uint8Array([value & 255, value >> 8]) : new Uint8Array([value]);
}

export function validateAudioPeriodPreimage(fields, fragmentId, baseline) {
  const table = tables.find(table => fragmentId === `${OWNER}.${table.table}`), seen = new Set();
  requireValue(table && baseline.length === table.count * table.width && fields.length === table.count,
    "audio Origin table identity/length drift");
  for (const field of fields) {
    const identity = periodFieldIdentity(field), offset = identity.id * table.width;
    requireValue(identity.table === table && !seen.has(identity.id), "audio Origin field identity drift");
    const raw = table.width === 2 ? baseline[offset] + baseline[offset + 1] * 256 : baseline[offset];
    requireValue(raw === field.defaultValue && Number.isInteger(field.defaultValue)
      && raw >= 0 && raw <= table.max, "audio Origin differs from bound baseline");
    seen.add(identity.id);
  }
}
