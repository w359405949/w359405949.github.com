import { paintMonsterFigureCanvases, registerModuleComponent, esc, monsterFigureCanvas } from './interface-state-preview-Dlotqlmn.js';
import { db, monsterVisualRecipes } from './prg-loaders-DnCSmXk9.js';
import { paletteSwatches } from './field-address-table-BnL1Mgdy.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup } from './timeline-player-YCH7Y-3h.js';

// @editor-module 怪物图形、调色板与配对 owner 的引用供给

const VISUAL_DOCUMENT_ID = "monster-visual-layout";
const PALETTE_MODULE_ID = "monster-palette";
const PAIR_MODULE_ID = "monster-palette-pair";
const GRAPHIC_MODULE_ID = "monster-graphic";

function byteId(value) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result <= 0xff ? result : null;
}

function idHex(value) {
  const id = byteId(value?.id ?? value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function idFromReference({moduleId, entry = null, handle = "", value = ""} = {}) {
  const direct = byteId(entry?.id);
  if (direct !== null) return direct;
  const match = new RegExp(`^${moduleId}:([0-9a-f]{1,2})$`, "iu")
    .exec(String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : byteId(value);
}

function swatchLine(colors, label = "") {
  return `<span class="monster-palette-line">${
    label ? `<small>${esc(label)}</small>` : ""}${
    paletteSwatches(colors, {className: "palette-swatches is-wide"})}</span>`;
}

function palettePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({moduleId: PALETTE_MODULE_ID, entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>怪物调色板引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>调色板 ${idHex(id)}</b>${swatchLine(entry?.colors)}
  </span>`;
}

function paletteReferenceItem(entry) {
  const id = byteId(entry?.id);
  if (id === null) return null;
  const hex = idHex(id);
  const colors = (entry.colors || []).map(value => `$${idHex(value)}`).join(" ");
  return {
    value: String(id),
    label: `${hex} · 怪物调色板`,
    description: colors,
    meta: `monster-palette:${hex}`,
    preview: palettePreviewMarkup({entry}),
    filter: [id, hex, `monster-palette:${hex}`, colors].join(" ").toLowerCase(),
  };
}

function pairPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({moduleId: PAIR_MODULE_ID, entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>怪物双调色板引用未解析</small></span>`;
  }
  const firstId = byteId(entry?.first_palette_id);
  const secondId = byteId(entry?.second_palette_id);
  const hasColors = Array.isArray(entry?.first_palette?.colors)
    && Array.isArray(entry?.second_palette?.colors);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>双调色板 ${idHex(id)}</b>
    ${hasColors
      ? `${swatchLine(entry.first_palette.colors, firstId === null ? "P?" : `P${idHex(firstId)}`)}
        ${swatchLine(entry.second_palette.colors, secondId === null ? "P?" : `P${idHex(secondId)}`)}`
      : `<small>调色板 ${idHex(firstId)} + ${idHex(secondId)}</small>`}
  </span>`;
}

function pairReferenceItem(entry) {
  const id = byteId(entry?.id);
  if (id === null) return null;
  const hex = idHex(id);
  const pair = `${idHex(entry.first_palette_id)} + ${idHex(entry.second_palette_id)}`;
  return {
    value: String(id),
    label: `${hex} · 双调色板 ${pair}`,
    description: `两套怪物背景调色板`,
    meta: `monster-palette-pair:${hex}`,
    preview: pairPreviewMarkup({entry}),
    filter: [id, hex, `monster-palette-pair:${hex}`, pair].join(" ").toLowerCase(),
  };
}

function graphicSummary(entry) {
  const figure = entry?.figure;
  return figure
    ? `${figure.widthTiles * 8}×${figure.heightTiles * 8} px · ${figure.banks.length} 个图案页`
    : "图形结构未解析";
}

function graphicPreviewMarkup(entry, box = 52) {
  const id = byteId(entry?.id);
  if (id === null) return "";
  return `<span class="monster-module-preview">
    ${monsterFigureCanvas({
      graphicId: id,
      box,
      className: "monster-module-preview-canvas",
      label: `怪物图形 ${idHex(id)}`,
    })}
    <small class="mono">${esc(graphicSummary(entry))}</small>
  </span>`;
}

function graphicReferenceItem(entry) {
  const id = byteId(entry?.id);
  if (id === null) return null;
  const hex = idHex(id);
  const summary = graphicSummary(entry);
  return {
    value: String(id),
    label: `${hex} · 怪物图形`,
    description: summary,
    meta: `monster-graphic:${hex}`,
    preview: graphicPreviewMarkup(entry),
    filter: [id, hex, `monster-graphic:${hex}`, summary].join(" ").toLowerCase(),
  };
}

function visualRows(documentValue, moduleId) {
  if (!documentValue || typeof documentValue !== "object") {
    throw new TypeError(`${VISUAL_DOCUMENT_ID} 正文不可用`);
  }
  if (moduleId === PALETTE_MODULE_ID) return documentValue.palettes;
  if (moduleId === PAIR_MODULE_ID) {
    const palettes = new Map((documentValue.palettes || []).map(entry => [Number(entry.id), entry]));
    return (documentValue.palette_pairs || []).map(entry => ({
      ...entry,
      first_palette: palettes.get(Number(entry.first_palette_id)) || null,
      second_palette: palettes.get(Number(entry.second_palette_id)) || null,
    }));
  }
  if (moduleId === GRAPHIC_MODULE_ID) {
    const recipes = monsterVisualRecipes(documentValue);
    return (documentValue.graphics || []).map(entry => ({
      ...entry,
      figure: recipes.byGraphic.get(Number(entry.id)) || null,
    }));
  }
  throw new TypeError(`怪物视觉引用模块无效：${moduleId || "（空）"}`);
}

async function prepareMonsterVisualComponent(props) {
  try {
    const documentValue = props.documentValue
      ?? await db.getDocument(VISUAL_DOCUMENT_ID, null);
    const entries = visualRows(documentValue, props.moduleId);
    if (!Array.isArray(entries)) {
      throw new TypeError(`${props.moduleId} 缺少静态候选表`);
    }
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => byteId(entry.id) === requestedId) || null,
      error: entries.length ? "" : `${props.moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function monsterVisualReferencePickerMarkup({
  moduleId, entries = [], value = null, label = "怪物视觉", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, item, preview, placeholder] of [
  [PALETTE_MODULE_ID, paletteReferenceItem, palettePreviewMarkup, "ID／颜色值"],
  [PAIR_MODULE_ID, pairReferenceItem, pairPreviewMarkup, "ID／两项调色板"],
  [GRAPHIC_MODULE_ID, graphicReferenceItem, null, "ID／像素尺寸／图案页数"],
]) {
  registerReferenceFieldPresentation(moduleId, {
    item,
    paint: moduleId === GRAPHIC_MODULE_ID ? paintMonsterFigureCanvases : undefined,
    className: "monster-visual-reference-field",
    filterLabel: `过滤${moduleId === GRAPHIC_MODULE_ID ? "怪物图形" : "怪物调色板"}`,
    filterPlaceholder: placeholder,
  });
  registerModuleComponent(moduleId, "reference", {
    prepare: prepareMonsterVisualComponent,
    render: monsterVisualReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });
  if (preview) {
    for (const kind of ["preview", "cover"]) {
      registerModuleComponent(moduleId, kind, {
        prepare: prepareMonsterVisualComponent,
        render: preview,
      });
    }
  }
}
