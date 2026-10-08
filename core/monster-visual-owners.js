// @editor-module 把怪物 owner 当前值投影到渲染文档，并校验聚合写入。
// Repository projection of monster owners into the published rendering document.
// This is computed on read; it is never another Working asset.
import {canonicalJsonEqual, cloneJson} from "./project-store-values.js";
import {monsterGraphicFields, installMonsterGraphicFields, projectMonsterGraphic} from "./monster-graphic-owner.js";

export const MONSTER_VISUAL_RESOURCE_ID = "monster-visual-layout";
export const MONSTER_VISUAL_OWNER_IDS = Object.freeze([
  "monster-figure", "monster-palette", "monster-palette-pair", "monster-graphic",
]);

export function monsterOwnerRecord(documentValue, id, owner) {
  const matches = (documentValue?.records || []).filter(row => Number(row.id) === Number(id));
  if (matches.length !== 1) throw new TypeError(`${owner}:${id} 不是唯一记录`);
  return matches[0];
}

// Only the aggregate's pair table uses zero-based indices. Public references
// use the IDs declared by monster-palette-pair, including in authoring pickers.
export function monsterPalettePairs(documentValue) {
  return documentValue.palette_pairs.map(row => ({...row, id: Number(row.id) + 0x80}));
}

export function monsterPaletteIdentity(documentValue, selector) {
  const id = Number(selector);
  const paletteModuleId = id < 0x80 ? "monster-palette" : "monster-palette-pair";
  const rows = paletteModuleId === "monster-palette"
    ? documentValue.palettes : monsterPalettePairs(documentValue);
  monsterOwnerRecord({records: rows}, id, paletteModuleId);
  return {paletteModuleId, paletteId: id};
}

export function monsterPaletteSelector(documentValue, moduleId, id) {
  const identity = monsterPaletteIdentity(documentValue, id);
  if (identity.paletteModuleId !== moduleId) throw new TypeError(`怪物调色板 owner 无效：${moduleId}`);
  return identity.paletteId;
}



export function projectMonsterFigureFields(asset, owner) {
  return {...asset, document: {...asset.document, enemies: asset.document.enemies.map(row => {
    const figure = monsterOwnerRecord(owner.document, row.id, "monster-figure");
    return {...row, get graphic_id() {return figure.graphic_selector;},
      get palette_code() {return figure.palette_selector;}};
  })}};
}

export function projectMonsterVisual(resolved, owners) {
  if (!resolved?.value?.document) throw new TypeError("monster-visual-layout 正文不可用");
  const value = cloneJson(resolved.value);
  const documentValue = value.document;
  const records = owner => {
    const rows = owners[owner]?.value?.document?.records;
    if (!Array.isArray(rows)) throw new TypeError(`${owner} 正文不可用`);
    return rows;
  };
  const figures = records("monster-figure");
  documentValue.enemies = documentValue.enemies.map(enemy => {
    const figure = monsterOwnerRecord({records: figures}, enemy.id, "monster-figure");
    return {...enemy, graphic_id: figure.graphic_selector, palette_code: figure.palette_selector};
  });
  documentValue.palettes = records("monster-palette").map(row => ({
    id: row.id, colors: row.colors,
  }));
  documentValue.palette_pairs = records("monster-palette-pair").map(row => ({
    id: Number(row.id) - 0x80,
    first_palette_id: row.first_palette_id,
    second_palette_id: row.second_palette_id,
  }));
  projectMonsterGraphic(documentValue, owners["monster-graphic"].value.document);
  return {
    ...resolved, value,
    ownerVersions: Object.fromEntries(MONSTER_VISUAL_OWNER_IDS.map(id => [id, owners[id].version])),
  };
}

// Other, still aggregate-owned edits must not persist the read projection.
// Existing aggregate drafts stay untouched, but their owner fields are ignored
// on every read. Attempts to edit those fields through the aggregate fail.
export function monsterAggregateWrite(value, current, raw) {
  const next = cloneJson(value);
  const fields = documentValue => ({
    enemies: documentValue.enemies.map(row => [row.id, row.graphic_id, row.palette_code]),
    palettes: documentValue.palettes,
    palette_pairs: documentValue.palette_pairs,
    ...monsterGraphicFields(documentValue),
  });
  if (!canonicalJsonEqual(fields(value.document), fields(current.value.document))) {
    throw new TypeError("怪物形象、颜色、配对与图形必须写入各自独立 owner");
  }
  next.document.palettes = cloneJson(raw.value.document.palettes);
  next.document.palette_pairs = cloneJson(raw.value.document.palette_pairs);
  installMonsterGraphicFields(next.document, monsterGraphicFields(raw.value.document));
  next.document.enemies = next.document.enemies.map(row => {
    const original = raw.value.document.enemies.find(item => Number(item.id) === Number(row.id));
    if (!original) throw new TypeError(`monster-visual-layout 怪物 ${row.id} 缺失`);
    return {...row, graphic_id: original.graphic_id, palette_code: original.palette_code};
  });
  return next;
}
