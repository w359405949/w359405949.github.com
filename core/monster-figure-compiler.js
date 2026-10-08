// @editor-module 描述怪物形象引用草稿，未获写入许可时构建保留 Original。
import {fieldRomValue, ROM_WRITE_PENDING, validateFieldOverrides, fieldFragmentId} from "./field-codec.js";
import {mountFieldObjectControls} from "./field-object.js";

const MONSTER_FIGURE_OWNER = "monster-figure";
export const MONSTER_FIGURE_FRAGMENTS = Object.freeze([
  "monster-visual-layout.enemy-to-graphic", "monster-visual-layout.enemy-palette-codes",
]);
const NAMES = Object.freeze(["graphic_selector", "palette_selector"]);
const COUNT = 131;
const handle = (owner, id) => `${owner}:${id.toString(16).toUpperCase().padStart(2, "0")}`;
const require = (ok, message) => {if (!ok) throw new TypeError(message);};

function selector(name, value) {
  require(Number.isInteger(value) && (name === "graphic_selector" ? value >= 0 && value < 79
    : (value >= 0 && value < 74) || (value >= 0x80 && value <= 0x9a)), "怪物形象引用超出已有候选集合");
  return value;
}

function projectMonsterFigureFieldView(document) {
  for (const row of document.records) {
    Object.defineProperty(row, "graphic_reference", {enumerable: true, configurable: true,
      get: () => handle("monster-graphic", row.graphic_selector)});
    Object.defineProperty(row, "palette_reference", {enumerable: true, configurable: true,
      get: () => handle(row.palette_selector < 0x80 ? "monster-palette" : "monster-palette-pair", row.palette_selector)});
  }
}

function monsterFigureFieldDescriptions(document) {
  require(document?.record_count === COUNT && Array.isArray(document.records)
    && document.records.length === COUNT, "monster-figure 记录集合不完整或不是唯一记录");
  const seen = new Set();
  return document.records.flatMap((row, position) => {
    require(Number.isInteger(row.id) && row.id >= 0 && row.id < COUNT
      && row.handle === handle(MONSTER_FIGURE_OWNER, row.id) && !seen.has(row.id), "monster-figure 稳定身份无效或重复");
    seen.add(row.id);
    return NAMES.map((fieldName, slot) => ({
      resourceId: MONSTER_FIGURE_OWNER, entityHandle: row.handle, recordId: row.id, fieldName,
      defaultValue: selector(fieldName, row[fieldName]), writeback: ROM_WRITE_PENDING,
      documentPath: ["records", position, fieldName], fragmentId: MONSTER_FIGURE_FRAGMENTS[slot],
      offsetInFragment: row.id, byteLength: 1,
    }));
  });
}

function validateMonsterFigureFieldOverrides(original, overrides) {
  require(original?.resource_id === MONSTER_FIGURE_OWNER, "怪物形象资产身份无效");
  validateFieldOverrides(original, overrides, monsterFigureFieldDescriptions,
    candidate => monsterFigureFieldDescriptions(candidate.document));
}

function encodeMonsterFigureFields(fields, options = {}) {
  const values = new Map();
  for (const field of fields) {
    const key = JSON.stringify([field.entityHandle, field.fieldName]);
    require(field.resourceId === MONSTER_FIGURE_OWNER && NAMES.includes(field.fieldName) && !values.has(key),
      "怪物形象字段重复或来自其他 owner");
    selector(field.fieldName, field.value);
    values.set(key, selector(field.fieldName, fieldRomValue(field, options)));
  }
  const result = NAMES.map((name, slot) => {
    const payload = new Uint8Array(COUNT);
    for (let id = 0; id < COUNT; id++) {
      const key = JSON.stringify([handle(MONSTER_FIGURE_OWNER, id), name]);
      require(values.has(key), "怪物形象构建字段缺失");
      payload[id] = values.get(key);
      values.delete(key);
    }
    return {fragment_id: MONSTER_FIGURE_FRAGMENTS[slot], payload, relocations: []};
  });
  require(values.size === 0, "怪物形象含未登记字段");
  return result;
}

const FIGURE_HANDLES = Array.from({length: COUNT}, (_, id) => handle(MONSTER_FIGURE_OWNER, id));
const FIGURE_COLUMN_LABELS = Object.freeze({graphic_selector: "图形选择器", palette_selector: "调色板选择器"});

/** 两个选择器各占一个物理片段：一个片段一个字段对象，一行一只怪物。 */
function monsterFigureObjects() {
  return NAMES.map((name, slot) => ({
    id: MONSTER_FIGURE_FRAGMENTS[slot], label: FIGURE_COLUMN_LABELS[name],
    fragmentIds: [MONSTER_FIGURE_FRAGMENTS[slot]],
    fields: FIGURE_HANDLES.map(handle => [handle, name]),
    editor: {kind: "numeric-table", rows: FIGURE_HANDLES, rowLabels: FIGURE_HANDLES,
      columns: [{name, label: FIGURE_COLUMN_LABELS[name], min: 0, max: 0xff}]},
  }));
}

function serializeMonsterFigureField(field) {
  require(field?.resourceId === MONSTER_FIGURE_OWNER && NAMES.includes(field.fieldName),
    "怪物形象字段身份无效");
  const position = FIGURE_HANDLES.indexOf(field.entityHandle);
  require(position >= 0 && fieldFragmentId(field) === MONSTER_FIGURE_FRAGMENTS[NAMES.indexOf(field.fieldName)],
    "怪物形象字段物理引用无效");
  return new Uint8Array([selector(field.fieldName, field.value)]);
}

function validateMonsterFigurePreimage(fields, fragmentId, baseline) {
  const slot = MONSTER_FIGURE_FRAGMENTS.indexOf(fragmentId);
  require(slot >= 0 && baseline.length === COUNT, "怪物形象 Origin 片段身份或长度不符");
  const seen = new Set();
  for (const field of fields) {
    const position = FIGURE_HANDLES.indexOf(field.entityHandle);
    require(position >= 0 && field.fieldName === NAMES[slot] && !seen.has(position),
      "怪物形象 Origin 字段身份不符");
    seen.add(position);
    require(selector(field.fieldName, field.defaultValue) === baseline[position],
      "怪物形象 Origin 与绑定原像不同");
  }
}

export const monsterFigureFieldOwner = Object.freeze({
  compilerId: "visual-core/v1", bindingResourceId: "monster-visual-layout", fragmentIds: MONSTER_FIGURE_FRAGMENTS,
  describe: monsterFigureFieldDescriptions, validate: validateMonsterFigureFieldOverrides, encode: encodeMonsterFigureFields,
  objects: monsterFigureObjects, serializeField: serializeMonsterFigureField,
  validatePreimage: validateMonsterFigurePreimage, controls: mountFieldObjectControls,
  projectView: projectMonsterFigureFieldView, projectImportView: projectMonsterFigureFieldView,
  documentView: true, legacyClosed: true, writeback: ROM_WRITE_PENDING,
});

export function monsterFigureImportAsset(records) {
  return {resource_id: MONSTER_FIGURE_OWNER, document: {record_count: COUNT,
    records: records.map(row => ({id: row.id, handle: handle(MONSTER_FIGURE_OWNER, row.id),
      graphic_selector: row.graphic_id, palette_selector: row.palette_code,
      graphic_reference: handle("monster-graphic", row.graphic_id),
      palette_reference: handle(row.palette_code < 0x80 ? "monster-palette" : "monster-palette-pair", row.palette_code)}))}};
}
