// @editor-module 描述怪物三色记录的共享字段，按字段值生成逻辑片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {validateFieldOverrides} from "./field-codec.js";

const MONSTER_PALETTE_OWNER = "monster-palette";
export const MONSTER_PALETTE_FRAGMENT = "monster-visual-layout.palette-colors";
const COUNT = 74;
const handle = id => `${MONSTER_PALETTE_OWNER}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const require = (condition, message) => {if (!condition) throw new TypeError(message);};
const color = value => {
  require(Number.isInteger(value) && value >= 0 && value < 64, "怪物色板颜色超出 NES 色号范围");
  return value;
};

function monsterPaletteFieldDescriptions(document) {
  require(document?.record_count === COUNT && Array.isArray(document.records)
    && document.records.length === COUNT, "monster-palette 记录集合不完整或不是唯一记录");
  const seen = new Set();
  return document.records.flatMap((row, position) => {
    require(Number.isInteger(row.id) && row.id >= 0 && row.id < COUNT
      && row.handle === handle(row.id) && !seen.has(row.id), "monster-palette 稳定身份无效或重复");
    seen.add(row.id);
    require(Array.isArray(row.colors) && row.colors.length === 3, "怪物色板必须有三个可见颜色");
    return row.colors.map((value, slot) => ({
      resourceId: MONSTER_PALETTE_OWNER, entityHandle: row.handle, recordId: row.id,
      fieldName: `color_${slot}`, defaultValue: color(value),
      documentPath: ["records", position, "colors", slot],
      fragmentId: MONSTER_PALETTE_FRAGMENT, offsetInFragment: row.id * 3 + slot, byteLength: 1,
    }));
  });
}

export function monsterPaletteObjects(document) {
  const fields = monsterPaletteFieldDescriptions(document);
  const grouped = new Map();
  for (const field of fields) {
    const rows = grouped.get(field.entityHandle) || [];
    rows.push(field); grouped.set(field.entityHandle, rows);
  }
  return [...grouped.entries()].map(([entityHandle, rows]) => ({
    id: entityHandle,
    label: `怪物调色板 · ${entityHandle.split(":").at(-1)}`,
    fragmentIds: [MONSTER_PALETTE_FRAGMENT],
    fields: rows.map(field => [field.entityHandle, field.fieldName]),
    editor: {kind: "numeric-table", rows: [entityHandle], columns: rows.map(field => ({
      name: field.fieldName, label: `颜色 ${field.fieldName.split("_").at(-1)}`, min: 0, max: 63,
      semantic: {kind: "palette-index", palette: "nes"},
    }))},
  }));
}

export function serializeMonsterPaletteField(field) {
  if (field?.resourceId !== MONSTER_PALETTE_OWNER || !Number.isInteger(field.value)
      || field.value < 0 || field.value >= 64) {
    throw new TypeError("monster-palette 字段值无效");
  }
  return new Uint8Array([field.value]);
}

function validateAsset(asset, original) {
  require(asset?.resource_id === MONSTER_PALETTE_OWNER
    && original?.resource_id === MONSTER_PALETTE_OWNER, "怪物色板资产身份无效");
  monsterPaletteFieldDescriptions(asset.document);
  const expected = structuredClone(original);
  for (const field of monsterPaletteFieldDescriptions(original.document)) {
    const path = field.documentPath;
    path.slice(0, -1).reduce((node, key) => node[key], expected.document)[path.at(-1)] =
      color(path.reduce((node, key) => node?.[key], asset.document));
  }
  require(canonicalJsonEqual(asset, expected), "怪物色板只允许修改颜色，不能改写身份、许可或结构");
}

function validateMonsterPaletteFieldOverrides(original, overrides) {
  validateFieldOverrides(original, overrides, monsterPaletteFieldDescriptions, validateAsset);
}

function encodeMonsterPaletteFields(fields, {defaults = false} = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === MONSTER_PALETTE_OWNER && !values.has(key), "怪物色板字段重复或来自其他 owner");
    values.set(key, color(defaults ? field.defaultValue : field.value));
  }
  const payload = new Uint8Array(COUNT * 3);
  for (let id = 0; id < COUNT; id++) for (let slot = 0; slot < 3; slot++) {
    const key = JSON.stringify([handle(id), `color_${slot}`]);
    require(values.has(key), "怪物色板构建字段缺失");
    payload[id * 3 + slot] = values.get(key);
    values.delete(key);
  }
  require(values.size === 0, "怪物色板含未登记字段");
  return [{fragment_id: MONSTER_PALETTE_FRAGMENT, payload, relocations: []}];
}

export const monsterPaletteFieldOwner = Object.freeze({
  compilerId: "visual-core/v1", bindingResourceId: "monster-visual-layout",
  fragmentIds: Object.freeze([MONSTER_PALETTE_FRAGMENT]),
  describe: monsterPaletteFieldDescriptions, validate: validateMonsterPaletteFieldOverrides,
  encode: encodeMonsterPaletteFields, documentView: true, legacyClosed: true,
});

export function monsterPaletteImportAsset(records) {
  return {resource_id: MONSTER_PALETTE_OWNER, document: {record_count: COUNT,
    records: records.map(row => ({...row, handle: handle(row.id)}))}};
}
