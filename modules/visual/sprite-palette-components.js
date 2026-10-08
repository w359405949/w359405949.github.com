// @editor-module 战斗精灵调色板 owner 的精确引用供给
//
// 候选只读取 sprite-palette 正文；消费页得到实际色块与目标身份，不接触旧表
// 位置、调色板编码细节或 owner 的入站使用方。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {nesPalette} from "../../render/nes.js";
import {paletteSwatches} from "../../ui/palette-swatches.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const SPRITE_PALETTE_MODULE_ID = "sprite-palette";
const EXPECTED_RECORDS = 32;
const EXPECTED_SCHEMA = "metalmaxcn.semantic-owner.sprite-palette.document";

function paletteId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 0 && number < EXPECTED_RECORDS
    ? number : null;
}

function idHex(value) {
  const id = paletteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle(value) {
  const match = /^sprite-palette:([0-9a-f]{1,2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = paletteId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${SPRITE_PALETTE_MODULE_ID}:${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = paletteId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : paletteId(value);
}

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function colorSwatches(colors) {
  return paletteSwatches(colors, {
    className: "palette-swatches",
    label: "四色预览",
    swatchAttributes: (_value, index) => `data-sprite-palette-swatch="${index}"`,
  });
}

function spritePalettePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  const colors = Array.isArray(entry?.colors) ? entry.colors : [];
  if (id === null || error || (entry && colors.length !== 4)) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>调色板 ?</b><small>${esc(error || "战斗精灵调色板引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>战斗精灵调色板 ${idHex(id)}</b>
    ${colors.length ? colorSwatches(colors) : ""}
    <small>战斗精灵四色</small>
  </span>`;
}

function spritePaletteReferenceItem(entry, reference = null) {
  let semanticEntry;
  try {
    semanticEntry = Array.isArray(entry?.colors) ? entry : sanitizePaletteEntry(entry);
  } catch (_error) {
    return null;
  }
  const id = paletteId(semanticEntry);
  const handle = normalizeHandle(semanticEntry?.handle);
  if (id === null || !handle) return null;
  const summary = "战斗精灵四色";
  return {
    value: declaredText(semanticEntry, reference?.key) || String(id),
    label: `${idHex(id)} · 战斗精灵调色板`,
    description: summary,
    meta: handle,
    preview: spritePalettePreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex(id), handle, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function sanitizePaletteEntry(record) {
  const colors = Array.isArray(record?.runtime_four_color_form)
    ? record.runtime_four_color_form.map(Number) : [];
  if (colors.length !== 4 || colors.some(value =>
    !Number.isInteger(value) || value < 0 || value >= nesPalette.length)) {
    throw new TypeError(`${record?.handle || "sprite-palette"} 缺少有效四色正文`);
  }
  return {
    id: record.id,
    id_hex: record.id_hex,
    handle: record.handle,
    colors,
  };
}

function validateEntries(documentValue) {
  const records = documentValue?.records;
  if (documentValue?.schema !== EXPECTED_SCHEMA
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS
      || Number(documentValue?.record_count) !== records.length) {
    throw new TypeError(`${SPRITE_PALETTE_MODULE_ID} 必须发布 ${EXPECTED_RECORDS} 条 owner 记录`);
  }
  const entries = records.map(sanitizePaletteEntry);
  const handles = entries.map(entry => normalizeHandle(entry.handle));
  if (handles.some((handle, index) =>
    !handle || handle !== `${SPRITE_PALETTE_MODULE_ID}:${idHex(entries[index])}`)
      || new Set(handles).size !== entries.length) {
    throw new TypeError(`${SPRITE_PALETTE_MODULE_ID} 的候选身份为空或重复`);
  }
  return entries;
}

async function prepareSpritePaletteComponent(props) {
  try {
    const entries = validateEntries(
      await db.getResourceDocument(SPRITE_PALETTE_MODULE_ID, null),
    );
    const requested = requestedId(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => entry.id === requested) || null,
      error: "",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function spritePaletteReferencePickerMarkup({
  entries = [], value = null, label = "战斗精灵调色板", controlMarkup = "",
  componentAttributes = "", error = "", reference = null,
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: SPRITE_PALETTE_MODULE_ID, key: ["id"]},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(SPRITE_PALETTE_MODULE_ID, {
  item: spritePaletteReferenceItem,
  className: "sprite-palette-reference-field",
  filterLabel: "过滤战斗精灵调色板",
  filterPlaceholder: "ID／句柄／颜色",
});

registerModuleComponent(SPRITE_PALETTE_MODULE_ID, "reference", {
  prepare: prepareSpritePaletteComponent,
  render: spritePaletteReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(SPRITE_PALETTE_MODULE_ID, kind, {
    prepare: prepareSpritePaletteComponent,
    render: spritePalettePreviewMarkup,
  });
}
