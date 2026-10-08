// @editor-module 在独立怪物图形 owner 与视觉编译投影之间转换，保持共享布局身份。
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";
import {fieldRomValue, validateFieldOverrides, fieldByteLength} from "./field-codec.js";

export const MONSTER_GRAPHIC_OWNER = "monster-graphic";
export const MONSTER_GRAPHIC_FRAGMENTS = Object.freeze([
  "monster-visual-layout.graphic-bank-codes", "monster-visual-layout.special-bank-roots",
  "monster-visual-layout.dimensions", "monster-visual-layout.sequential-tile-offsets",
  "monster-visual-layout.layout-pointers", "monster-visual-layout.layout-region",
  "monster-visual-layout.dual-palette-layouts",
]);

const GRAPHIC_COUNT = 79;
const SEQUENTIAL_GRAPHIC_COUNT = 72;
const SPECIAL_BANK_COUNT = 7;
const LAYOUT_BYTES = 862;
const DUAL_PALETTE_BYTES = 108;
const handle = id => `${MONSTER_GRAPHIC_OWNER}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const require = (condition, message) => {if (!condition) throw new TypeError(message);};

function graphicField(entityHandle, fieldName, defaultValue, documentPath,
  fragmentId, offsetInFragment, byteLength = 1) {
  return {resourceId: MONSTER_GRAPHIC_OWNER, entityHandle, fieldName, defaultValue,
    documentPath, fragmentId, offsetInFragment, byteLength};
}

export function monsterGraphicFieldDescriptions(document) {
  require(document?.record_count === GRAPHIC_COUNT && Array.isArray(document.records)
    && document.records.length === GRAPHIC_COUNT, "monster-graphic 记录集合不完整");
  const fields = [];
  document.records.forEach((row, position) => {
    require(row.handle === handle(row.id) && row.id === position,
      "monster-graphic 记录身份改变");
    fields.push(graphicField(row.handle, "bank_code", row.bank_code,
      ["records", position, "bank_code"], MONSTER_GRAPHIC_FRAGMENTS[0], row.id));
    fields.push(graphicField(row.handle, "dimension", row.packed_dimension,
      ["records", position, "packed_dimension"], MONSTER_GRAPHIC_FRAGMENTS[2], row.id));
    fields.push(graphicField(row.handle, "layout_pointer_cpu", row.pointer.value,
      ["records", position, "pointer", "value"], MONSTER_GRAPHIC_FRAGMENTS[4], row.id * 2, 2));
    if (row.id < SEQUENTIAL_GRAPHIC_COUNT) {
      fields.push(graphicField(row.handle, "tile_offset", row.tile_offset,
        ["records", position, "tile_offset"], MONSTER_GRAPHIC_FRAGMENTS[3], row.id));
    }
  });
  document.special_bank_roots.forEach((row, position) => {
    require(row.bank_code === 0xf0 + position, "monster-graphic special bank identity changed");
    fields.push(graphicField(`${MONSTER_GRAPHIC_OWNER}:special-bank:${position}`, "first_bank",
      row.first_bank, ["special_bank_roots", position, "first_bank"],
      MONSTER_GRAPHIC_FRAGMENTS[1], position));
  });
  document.layout_streams.forEach((value, position) => fields.push(graphicField(
    `${MONSTER_GRAPHIC_OWNER}:layout:${position}`, "value", value,
    ["layout_streams", position], MONSTER_GRAPHIC_FRAGMENTS[5], position)));
  document.dual_palette_layout_region.forEach((row, position) => fields.push(graphicField(
    `${MONSTER_GRAPHIC_OWNER}:dual-palette:${position}`, "value", row.value,
    ["dual_palette_layout_region", position, "value"], MONSTER_GRAPHIC_FRAGMENTS[6], position)));
  require(document.special_bank_roots.length === SPECIAL_BANK_COUNT
    && document.layout_streams.length === LAYOUT_BYTES
    && document.dual_palette_layout_region.length === DUAL_PALETTE_BYTES,
  "monster-graphic 连续表长度改变");
  return fields;
}

const GRAPHIC_EDITOR_LABELS = Object.freeze({
  bank_code: "图形 bank",
  dimension: "尺寸码",
  layout_pointer_cpu: "布局指针",
  tile_offset: "连续图块偏移",
  first_bank: "首 bank",
  value: "原值",
});

export function monsterGraphicObjects(document) {
  const grouped = new Map();
  for (const field of monsterGraphicFieldDescriptions(document)) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `怪物图形 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [...new Set(rows.map(field => field.fragmentId))],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName, label: GRAPHIC_EDITOR_LABELS[field.fieldName] || field.fieldName,
      min: 0, max: field.byteLength === 2 ? 0xffff : 0xff,
    }))},
  }));
}

export function serializeMonsterGraphicField(field) {
  if (field?.resourceId !== MONSTER_GRAPHIC_OWNER || !Number.isInteger(field.value)
      || field.value < 0 || field.value > (fieldByteLength(field) === 2 ? 0xffff : 0xff)) {
    throw new TypeError("monster-graphic 字段值无效");
  }
  return fieldByteLength(field) === 2
    ? new Uint8Array([field.value & 0xff, field.value >> 8])
    : new Uint8Array([field.value]);
}

function visualFieldsFromOwner(document) {
  return {
    graphics: document.records.map(row => ({id: row.id, bank_code: row.bank_code,
      dimension: row.packed_dimension, tile_offset: row.tile_offset,
      layout_pointer_cpu: row.pointer.value})),
    special_bank_roots: document.special_bank_roots.map((row, id) => ({id, value: row.first_bank})),
    layout_region: document.layout_streams.map((value, id) => ({id, value})),
    dual_palette_layout_region: document.dual_palette_layout_region.map(row => ({...row})),
  };
}

export function validateMonsterGraphicFieldOverrides(original, overrides) {
    validateFieldOverrides(original, overrides, monsterGraphicFieldDescriptions,
    candidate => {
      const projected = visualFieldsFromOwner(candidate.document);
      monsterGraphicFromVisual(original, projected);
    });
}

export function encodeMonsterGraphicFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === MONSTER_GRAPHIC_OWNER && !values.has(key),
      "monster-graphic 字段身份重复或来自其他 owner");
    values.set(key, fieldRomValue(field, {defaults}));
  }
  const take = (entityHandle, fieldName) => {
    const key = JSON.stringify([entityHandle, fieldName]);
    require(values.has(key), `monster-graphic 字段缺失 ${key}`);
    const value = values.get(key); values.delete(key); return value;
  };
  const bytes = new Map(MONSTER_GRAPHIC_FRAGMENTS.map(id => [id, new Uint8Array(
    id.endsWith("graphic-bank-codes") || id.endsWith("dimensions") ? GRAPHIC_COUNT
      : id.endsWith("special-bank-roots") ? SPECIAL_BANK_COUNT
        : id.endsWith("sequential-tile-offsets") ? SEQUENTIAL_GRAPHIC_COUNT
        : id.endsWith("layout-pointers") ? GRAPHIC_COUNT * 2
          : id.endsWith("dual-palette-layouts") ? DUAL_PALETTE_BYTES : LAYOUT_BYTES)]));
  for (let id = 0; id < GRAPHIC_COUNT; id += 1) {
    const entity = handle(id);
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[0])[id] = take(entity, "bank_code");
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[2])[id] = take(entity, "dimension");
    const pointer = take(entity, "layout_pointer_cpu");
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[4])[id * 2] = pointer & 0xff;
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[4])[id * 2 + 1] = pointer >> 8;
    if (id < SEQUENTIAL_GRAPHIC_COUNT)
      bytes.get(MONSTER_GRAPHIC_FRAGMENTS[3])[id] = take(entity, "tile_offset");
  }
  for (let id = 0; id < SPECIAL_BANK_COUNT; id += 1)
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[1])[id] = take(
      `${MONSTER_GRAPHIC_OWNER}:special-bank:${id}`, "first_bank");
  for (let id = 0; id < LAYOUT_BYTES; id += 1)
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[5])[id] = take(
      `${MONSTER_GRAPHIC_OWNER}:layout:${id}`, "value");
  for (let id = 0; id < 108; id += 1)
    bytes.get(MONSTER_GRAPHIC_FRAGMENTS[6])[id] = take(
      `${MONSTER_GRAPHIC_OWNER}:dual-palette:${id}`, "value");
  require(values.size === 0, "monster-graphic 含未登记字段");
  return MONSTER_GRAPHIC_FRAGMENTS.map(fragment_id => ({fragment_id,
    payload: bytes.get(fragment_id), relocations: []}));
}

export function monsterGraphicFields(documentValue) {
  return {
    graphics: documentValue.graphics.map(({id, bank_code, dimension, tile_offset, layout_pointer_cpu}) =>
      ({id, bank_code, dimension, tile_offset, layout_pointer_cpu})),
    special_bank_roots: documentValue.special_bank_roots,
    layout_region: documentValue.layout_region,
    dual_palette_layout_region: documentValue.dual_palette_layout_region,
  };
}

/** Build one atomic field batch for a composite graphic save or reset. */

export function installMonsterGraphicFields(documentValue, fields) {
  documentValue.graphics = fields.graphics.map(row => ({
    ...documentValue.graphics?.find(item => item.id === row.id), ...cloneJson(row),
  }));
  documentValue.special_bank_roots = cloneJson(fields.special_bank_roots);
  documentValue.layout_region = cloneJson(fields.layout_region);
  documentValue.dual_palette_layout_region = cloneJson(fields.dual_palette_layout_region);
  return documentValue;
}

/** This projection has no storage identity; visual-core/v1 remains the encoder. */
export function projectMonsterGraphic(documentValue, owner) {
  return installMonsterGraphicFields(documentValue, {graphics: owner.records.map(row => ({
    id: row.id, bank_code: row.bank_code, dimension: row.packed_dimension,
    tile_offset: row.tile_offset, layout_pointer_cpu: row.pointer.value,
  })),
  special_bank_roots: owner.special_bank_roots.map((row, id) => ({
    id, value: row.first_bank,
  })),
  layout_region: owner.layout_streams.map((value, id) => ({id, value})),
  dual_palette_layout_region: owner.dual_palette_layout_region.map(row => ({
    id: row.id, value: row.value,
  })),
  });
}

function uint(value, maximum, label) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new TypeError(`monster-graphic ${label} 超出 0..${maximum}`);
  }
  return value;
}

const hex = (value, width) => value.toString(16).toUpperCase().padStart(width, "0");

/** Translate all six tables together; pointers address one shared fixed region. */
function monsterGraphicFromVisual(original, documentValue) {
  const next = cloneJson(original);
  const owner = next.document;
  const base = original.document.records[0].pointer.value
    - original.document.records[0].layout_stream_reference.offset;
  if (documentValue.graphics.length !== owner.records.length
      || documentValue.special_bank_roots.length !== owner.special_bank_roots.length
      || documentValue.layout_region.length !== owner.layout_streams.length
      || documentValue.dual_palette_layout_region.length !== owner.dual_palette_layout_region.length) {
    throw new TypeError("monster-graphic 固定表长度改变");
  }
  owner.layout_streams = documentValue.layout_region.map((row, id) => {
    if (row.id !== id) throw new TypeError("monster-graphic 布局记录身份改变");
    return uint(row.value, 255, "layout_streams");
  });
  owner.dual_palette_layout_region = documentValue.dual_palette_layout_region.map((row, id) => {
    if (row.id !== id) throw new TypeError("monster-graphic 双色布局记录身份改变");
    return uint(row.value, 255, "dual_palette_layout_region");
  });
  owner.special_bank_roots.forEach((root, id) => {
    const source = documentValue.special_bank_roots[id];
    if (source.id !== id) throw new TypeError("monster-graphic 图案页组合身份改变");
    root.first_bank = uint(source.value, 255, "first_bank");
    root.first_bank_hex = `0x${hex(root.first_bank, 2)}`;
  });
  owner.records.forEach((row, id) => {
    const source = documentValue.graphics[id];
    if (source.id !== row.id) throw new TypeError("monster-graphic 记录身份改变");
    row.bank_code = uint(source.bank_code, 255, "bank_code");
    row.packed_dimension = uint(source.dimension, 255, "packed_dimension");
    row.tile_offset = row.tile_offset === null ? null
      : uint(source.tile_offset, 255, "tile_offset");
    if (row.tile_offset === null && source.tile_offset !== null) {
      throw new TypeError("monster-graphic 逐格图案不能有连续偏移");
    }
    const pointer = uint(source.layout_pointer_cpu, 65535, "pointer");
    row.pointer.value = pointer;
    row.pointer.value_hex = `0x${hex(pointer, 4)}`;
    const cells = (row.packed_dimension >> 4) * (row.packed_dimension & 15) * 4;
    const length = row.tile_offset === null ? cells : Math.ceil(cells / 8);
    const offset = pointer - base;
    if (!cells || offset < 0 || offset + length > owner.layout_streams.length) {
      throw new TypeError("monster-graphic 指针/尺寸超出共享布局流");
    }
    row.layout_stream_reference = {region: "layout_streams", offset, length};
    const root = row.bank_code < 0xF0 ? row.bank_code
      : owner.special_bank_roots[row.bank_code - 0xF0]?.first_bank;
    if (root === undefined) throw new TypeError("monster-graphic 图案页组合不存在");
    row.chr_bank_references = Array.from({length: row.bank_code < 0xF0 ? 1 : 3},
      (_, index) => `chr-bank:${hex(root + index, 2)}`);
  });
  return next;
}

export function validateMonsterGraphic(value, original) {
  const projected = projectMonsterGraphic({}, value.document);
  const expected = monsterGraphicFromVisual(original, projected);
  if (!canonicalJsonEqual(value, expected)) {
    throw new TypeError("monster-graphic 身份、声明或派生引用与可写字段不一致");
  }
}
