// @editor-module 描述怪物双色板草稿字段，未获写入许可时构建保留 Original。
import {fieldRomValue, ROM_WRITE_PENDING, validateFieldOverrides} from "./field-codec.js";

const MONSTER_PALETTE_PAIR_OWNER = "monster-palette-pair";
export const MONSTER_PALETTE_PAIR_FRAGMENT = "monster-visual-layout.palette-pairs";
const COUNT = 27;
const NAMES = Object.freeze(["first_palette_id", "second_palette_id"]);
const handle = id => `${MONSTER_PALETTE_PAIR_OWNER}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const require = (condition, message) => {if (!condition) throw new TypeError(message);};
const palette = value => {
  require(Number.isInteger(value) && value >= 0 && value < 74, "怪物双色板引用超出已有色板集合");
  return value;
};

function monsterPalettePairFieldDescriptions(document) {
  require(document?.record_count === COUNT && Array.isArray(document.records)
    && document.records.length === COUNT, "monster-palette-pair 记录集合不完整或不是唯一记录");
  const seen = new Set();
  return document.records.flatMap((row, position) => {
    require(Number.isInteger(row.id) && row.id >= 0x80 && row.id < 0x80 + COUNT
      && row.handle === handle(row.id) && !seen.has(row.id), "monster-palette-pair 稳定身份无效或重复");
    seen.add(row.id);
    return NAMES.map((fieldName, slot) => ({
      resourceId: MONSTER_PALETTE_PAIR_OWNER, entityHandle: row.handle, recordId: row.id,
      fieldName, defaultValue: palette(row[fieldName]),
      writeback: ROM_WRITE_PENDING,
      documentPath: ["records", position, fieldName],
      fragmentId: MONSTER_PALETTE_PAIR_FRAGMENT, offsetInFragment: (row.id - 0x80) * 2 + slot, byteLength: 1,
    }));
  });
}

export function monsterPalettePairObjects(document) {
  const fields = monsterPalettePairFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `怪物双色组合 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [MONSTER_PALETTE_PAIR_FRAGMENT],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName, label: field.fieldName === "first_palette_id" ? "第一色板" : "第二色板",
      min: 0, max: 73,
    }))},
  }));
}

export function serializeMonsterPalettePairField(field) {
  if (field?.resourceId !== MONSTER_PALETTE_PAIR_OWNER || !Number.isInteger(field.value)
      || field.value < 0 || field.value >= 74) {
    throw new TypeError("monster-palette-pair 字段值无效");
  }
  return new Uint8Array([field.value]);
}

function projectMonsterPalettePairFieldView(document) {
  for (const row of document.records) for (const slot of ["first", "second"]) {
    Object.defineProperty(row, `${slot}_palette_reference`, {enumerable: true, configurable: true,
      get: () => `monster-palette:${row[`${slot}_palette_id`].toString(16).toUpperCase().padStart(2, "0")}`});
  }
}

function validateMonsterPalettePairFieldOverrides(original, overrides) {
  require(original?.resource_id === MONSTER_PALETTE_PAIR_OWNER, "怪物双色板资产身份无效");
  validateFieldOverrides(original, overrides, monsterPalettePairFieldDescriptions,
    candidate => monsterPalettePairFieldDescriptions(candidate.document));
}

function encodeMonsterPalettePairFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === MONSTER_PALETTE_PAIR_OWNER && !values.has(key), "怪物双色板字段重复或来自其他 owner");
    palette(field.value);
    const value = palette(fieldRomValue(field, {defaults}));
    values.set(key, value);
  }
  const payload = new Uint8Array(COUNT * 2);
  for (let index = 0; index < COUNT; index++) for (const [slot, name] of NAMES.entries()) {
    const key = JSON.stringify([handle(0x80 + index), name]);
    require(values.has(key), "怪物双色板构建字段缺失");
    payload[index * 2 + slot] = values.get(key);
    values.delete(key);
  }
  require(values.size === 0, "怪物双色板含未登记字段");
  return [{fragment_id: MONSTER_PALETTE_PAIR_FRAGMENT, payload, relocations: []}];
}

export const monsterPalettePairFieldOwner = Object.freeze({
  compilerId: "visual-core/v1", bindingResourceId: "monster-visual-layout",
  fragmentIds: Object.freeze([MONSTER_PALETTE_PAIR_FRAGMENT]),
  describe: monsterPalettePairFieldDescriptions, validate: validateMonsterPalettePairFieldOverrides,
  encode: encodeMonsterPalettePairFields, documentView: true, legacyClosed: true,
  projectView: projectMonsterPalettePairFieldView, projectImportView: projectMonsterPalettePairFieldView,
  writeback: ROM_WRITE_PENDING,
});

export function monsterPalettePairImportAsset(records) {
  const asset = {resource_id: MONSTER_PALETTE_PAIR_OWNER, document: {record_count: COUNT,
    records: records.map(row => ({...row, id: row.id + 0x80, handle: handle(row.id + 0x80)}))}};
  projectMonsterPalettePairFieldView(asset.document);
  return structuredClone(asset);
}
