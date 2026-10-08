// @editor-module char 持有正文字形与已确认核心字形，序列化只写有绑定的位图。
import {canonicalJsonEqual} from "./project-store-values.js";
export const NARRATIVE_GLYPHS_COMPILER_ID = "narrative-glyphs/v1";
export const NARRATIVE_GLYPHS_COMPONENT_CODEC = "metalmaxcn.narrative-glyphs";
const hex = value => value.toString(16).toUpperCase().padStart(2, "0");
const rows = [];
// The codec's lead/selector identity domain; no CPU or ROM addresses.
for (let page = 0; page < 11; page += 1) {
  const rowCount = page === 10 ? 10 : [14, 14, 4][page % 3];
  for (let row = 0; row < rowCount; row += 1) {
    const count = page === 10 && row === 9 ? 6 : 14;
    const lead = hex(0x24 + page), first = row * 16;
    rows.push({fragmentId: `char.narrative-glyphs-${lead}-${hex(first)}-${hex(first + count - 1)}`,
      length: count * 18, handles: Array.from({length: count}, (_, i) => `font-glyph:${lead}:${hex(first + i)}`)});
  }
}
function requireValue(condition, message) {if (!condition) throw new TypeError(message);}
export function narrativeGlyphComponentSpecs(resourceId) {
  requireValue(resourceId === "char", "unknown narrative glyph owner");
  return rows.map(({fragmentId, length}) => ({fragmentId, length}));
}
export function narrativeGlyphAssetSchema(resourceId) {
  narrativeGlyphComponentSpecs(resourceId);
  return "metalmaxcn.semantic-owner.char";
}
// Field identity and placement within a component use the encoder's exact domain.
// Array position in an imported document is never a field identity.
const recordIndexes = new WeakMap();
function glyphRecordIndex(document) {
  requireValue(Array.isArray(document?.records) && document.records.length === 1711, "char 字形数量无效");
  if (recordIndexes.has(document)) return recordIndexes.get(document);
  const byHandle = new Map(document.records.map((record, index) => [record.handle, {record, index}]));
  requireValue(byHandle.size === document.records.length, "char 重复字段身份");
  if (Object.isFrozen(document.records)) recordIndexes.set(document, byHandle);
  return byHandle;
}
export function narrativeGlyphDocumentScopes(document) {
  return [...glyphRecordIndex(document)].map(([handle, {index}]) => ({
    path: ['records', index], describeOptions: {handle},
  }));
}
export function narrativeGlyphFieldScope(document, handle) {
  requireValue(glyphRecordIndex(document).has(handle), `未发布字形：${handle}`);
  return {handle};
}
export function narrativeGlyphFieldDescriptions(document, {handle: selectedHandle} = {}) {
  const byHandle = glyphRecordIndex(document);
  const narrative = rows.flatMap(row => row.handles.flatMap((handle, index) => {
    if (selectedHandle !== undefined && selectedHandle !== handle) return [];
    const entry = byHandle.get(handle), record = entry?.record, bitmap = record?.narrative_glyph_bitmap;
    requireValue(record?.kind === "narrative-12x12" && Array.isArray(bitmap) && bitmap.length === 18
      && bitmap.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255), "char 字形身份或 18 B 位图无效");
    return [{resourceId: "char", entityHandle: handle, fieldName: "narrative_glyph_bitmap",
      lead: record.lead, selector: record.selector,
      documentPath: ["records", entry.index, "narrative_glyph_bitmap"], defaultValue: bitmap,
      fragmentId: row.fragmentId, offsetInFragment: index * 18, byteLength: 18}];
  }));
  const core = document.records.slice(1672).flatMap((record, index) => {
    if (selectedHandle !== undefined && selectedHandle !== record.handle) return [];
    requireValue(record.kind === 'core-8x8' && record.handle === `font-core-glyph:${hex(record.glyph_index)}`
      && Array.isArray(record.core_glyph_bitmap) && record.core_glyph_bitmap.length === 16
      && record.core_glyph_bitmap.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255),
    'char 核心字形身份或 16 B 位图无效');
    return [{resourceId: 'char', entityHandle: record.handle, fieldName: 'core_glyph_bitmap',
      documentPath: ['records', 1672 + index, 'core_glyph_bitmap'], defaultValue: record.core_glyph_bitmap,
      writeback: {state: 'unpermitted'}}];
  });
  return [...narrative, ...core];
}

/** Validate the whole candidate without producing serialized bytes. */
export function validateNarrativeGlyphFieldOverrides(original, overrides) {
  const candidate = structuredClone(original);
  const records = new Map(candidate.document.records.map(record => [record.handle, record]));
  const fields = new Set(narrativeGlyphFieldDescriptions(original.document).map(field => field.entityHandle));
  const seen = new Set();
  for (const override of overrides) {
    requireValue(override.resource_id === "char"
      && ['narrative_glyph_bitmap', 'core_glyph_bitmap'].includes(override.field_name) && fields.has(override.entity_handle)
      && !seen.has(override.entity_handle), "char 字段覆盖身份无效或重复");
    seen.add(override.entity_handle);
    const record = records.get(override.entity_handle);
    requireValue(override.field_name === (record.kind === 'core-8x8' ? 'core_glyph_bitmap' : 'narrative_glyph_bitmap'),
      'char 字形字段身份无效');
    record[override.field_name] = override.value;
  }
  validateNarrativeGlyphAsset(candidate, original);
}
function requireNarrativeGlyphRecords(document) {
  const records = document?.records;
  const handles = rows.flatMap(row => row.handles);
  requireValue(Array.isArray(records) && records.length === 1711, "char 字形数量无效");
  records.slice(0, 1672).forEach((record, index) => {
    const bitmap = record.narrative_glyph_bitmap;
    requireValue(record.kind === "narrative-12x12" && record.handle === handles[index]
      && Array.isArray(bitmap) && bitmap.length === 18
      && bitmap.every(b => Number.isInteger(b) && b >= 0 && b <= 255), "char 字形身份或 18 B 位图无效");
  });
  return records.slice(0, 1672);
}
function validateNarrativeGlyphAsset(asset, original) {
  for (const value of [asset, original]) {
    requireValue(value?.resource_id === "char" && value.schema === narrativeGlyphAssetSchema("char"),
      "narrative glyph identity/schema drift");
    requireNarrativeGlyphRecords(value.document);
    narrativeGlyphFieldDescriptions(value.document);
  }
  const expected = structuredClone(original), records = asset.document.records.slice(0, 1672);
  records.forEach((record, index) => {
    expected.document.records[index].narrative_glyph_bitmap = record.narrative_glyph_bitmap;
  });
  asset.document.records.slice(1672).forEach((record, index) => {
    expected.document.records[1672 + index].core_glyph_bitmap = record.core_glyph_bitmap;
  });
  requireValue(canonicalJsonEqual(asset, expected), "只允许修改字形位图");
}

/** Serialize the shared session objects; never reconstruct an effective char document. */
export function encodeNarrativeGlyphFields(fields, {defaults = false} = {}) {
  const byHandle = new Map();
  for (const field of fields) {
    if (field.resourceId === 'char' && field.fieldName === 'core_glyph_bitmap') continue;
    requireValue(field.resourceId === "char" && field.fieldName === "narrative_glyph_bitmap"
      && !byHandle.has(field.entityHandle), "char 字段身份无效或重复");
    const bitmap = defaults ? field.defaultValue : field.value;
    requireValue(Array.isArray(bitmap) && bitmap.length === 18
      && bitmap.every(b => Number.isInteger(b) && b >= 0 && b <= 255), "char 字段位图无效");
    byHandle.set(field.entityHandle, bitmap);
  }
  requireValue(byHandle.size === 1672 && rows.every(row => row.handles.every(h => byHandle.has(h))),
    "char 字段集合不完整");
  return encodeGlyphValues(byHandle);
}

function encodeGlyphValues(byHandle) {
  return rows.map(row => ({fragment_id: row.fragmentId,
    payload: Uint8Array.from(row.handles.flatMap(h => byHandle.get(h))), relocations: []}));
}

const glyphPositions = new Map(rows.flatMap(row => row.handles.map((handle, index) =>
  [handle, {fragmentId: row.fragmentId, offset: index * 18}])));
function glyphFieldPosition(field) {
  const position = glyphPositions.get(field.entityHandle);
  requireValue(field.resourceId === "char" && field.fieldName === "narrative_glyph_bitmap" && position, "char 字段身份无效");
  return position;
}
export function narrativeGlyphObjectCount() {
  return rows.length + 39;
}

export function narrativeGlyphObjects(document, {offset = 0, limit = undefined} = {}) {
  const objects = rows.map(row => {
    const first = row.handles[0].split(":").slice(1).join(":");
    const last = row.handles.at(-1).split(":").slice(1).join(":");
    return {id: row.fragmentId, label: `正文字形 $${first}–$${last}`, fragmentIds: [row.fragmentId],
      fields: row.handles.map(handle => [handle, "narrative_glyph_bitmap"]),
      editor: {kind: "numeric-table", rows: row.handles, rowLabels: row.handles,
        columns: [{name: "narrative_glyph_bitmap", label: "叙述字形位图", array: true,
          length: 18, min: 0, max: 0xff}]}};
  });
  objects.push(...document.records.slice(1672).map(record => ({
    id: record.handle, label: record.character_annotation || record.handle, fragmentIds: [],
    fields: [[record.handle, 'core_glyph_bitmap']],
    editor: {kind: 'numeric-table', rows: [record.handle], columns: [{name: 'core_glyph_bitmap',
      label: '核心字形位图', array: true, length: 16, min: 0, max: 255}]},
  })));
  return objects.slice(offset, limit === undefined ? undefined : offset + limit);
}
export function serializeNarrativeGlyphField(field) {
  if (field.resourceId === 'char' && field.fieldName === 'core_glyph_bitmap') {
    requireValue(Array.isArray(field.value) && field.value.length === 16
      && field.value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255), 'char 核心位图无效');
    return Uint8Array.from(field.value);
  }
  glyphFieldPosition(field);
  const bitmap = field.value;
  requireValue(Array.isArray(bitmap) && bitmap.length === 18
    && bitmap.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255), "char 字段位图无效");
  return Uint8Array.from(bitmap);
}
export function validateNarrativeGlyphPreimage(fields, fragmentId, baseline) {
  const row = rows.find(row => row.fragmentId === fragmentId);
  requireValue(row && baseline.length === row.length && fields.length === row.handles.length, "glyph Origin table identity/length drift");
  const seen = new Set();
  for (const field of fields) {
    const position = glyphFieldPosition(field), bitmap = field.defaultValue;
    requireValue(position.fragmentId === fragmentId && !seen.has(position.offset), "glyph Origin field identity drift");
    requireValue(Array.isArray(bitmap) && bitmap.length === 18
      && bitmap.every((byte, index) => byte === baseline[position.offset + index]), "glyph Origin differs from bound baseline");
    seen.add(position.offset);
  }
}
