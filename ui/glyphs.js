// @editor-module 字形与字库图集绘制
//
// 来源：拆分前 engine/editor/app.js 第 683-748 行。

import {uiPaintPattern, uiPutRgb} from "../render/nes.js";
import {render} from "../main.js";
import {uiConstructionModel} from "../modules/visual/ui-construction-preview.js";

export function uiPaintCoreFontTile(canvas, tileId, patterns, corePatterns) {
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(8, 8);
  uiPaintFontTile(image, Number(tileId), patterns, corePatterns, 0, 0);
  context.putImageData(image, 0, 0);
}

export function uiPaintFontTile(image, tileId, patterns, corePatterns, x, y, profiles = [], palette = null) {
  uiPaintPattern(image.data, image.width, image.height, patterns, corePatterns, tileId, x, y, profiles, palette);
}

export function uiGlyphId(model, lead, selector) {
  const page = (model.font?.pages || []).find(item => item.lead === lead);
  return page?.glyph_ids?.[selector] ?? null;
}

export function uiPaintGlyph(
  pixels, width, glyphData, glyphId, originX, originY, colour
) {
  const stride = Number(uiConstructionModel().font?.format?.bytes_per_glyph || 18);
  const offset = Number(glyphId) * stride;
  if (glyphId == null || offset < 0 || offset + stride > glyphData.length) return;
  for (let strip = 0; strip < 3; strip += 1) {
    for (let pair = 0; pair < 6; pair += 1) {
      const value = glyphData[offset + strip * 6 + pair];
      for (let localX = 0; localX < 4; localX += 1) {
        const x = originX + strip * 4 + localX;
        if ((value >> (7 - localX)) & 1) {
          const y = originY + pair * 2;
          uiPutRgb(
            pixels, width, x, y,
            typeof colour === "function" ? colour(x, y) : colour
          );
        }
        if ((value >> (3 - localX)) & 1) {
          const y = originY + pair * 2 + 1;
          uiPutRgb(
            pixels, width, x, y,
            typeof colour === "function" ? colour(x, y) : colour
          );
        }
      }
    }
  }
}

// 文字图块只保存按字符绘制的像素，不以运行时缓存槽选择字形。
export function uiWriteGlyphCells(cells, glyphData, glyphId, originX, originY) {
  const left = Math.floor(originX / 8) * 8, top = originY - 4;
  const image = {data: new Uint8ClampedArray(16 * 16 * 4)};
  const continuation = originX - left === 4;
  if (continuation) for (let row = 0; row < 2; row++) {
    const cell = cells.get(((top / 8 + row) * 32 + left / 8) & 1023);
    if (!cell) continue;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++)
      if (cell[y * 8 + x]) image.data[((row * 8 + y) * 16 + x) * 4] = 255;
  }
  uiPaintGlyph(image.data, 16, glyphData, glyphId, originX - left, 4, [255, 255, 255]);
  const positions = [];
  for (let column = 0; column < 2; column++) for (let row = 0; row < 2; row++) {
    const position = ((top / 8 + row) * 32 + left / 8 + column) & 1023;
    const pixels = new Uint8Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
      pixels[y * 8 + x] = Number(image.data[((row * 8 + y) * 16 + column * 8 + x) * 4] !== 0);
    cells.set(position, pixels);
    positions.push(position);
  }
  return positions;
}

export function uiPaintGlyphCell(image, position, pixels, palette) {
  const left = position % 32 * 8, top = (position >> 5) * 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++)
    uiPutRgb(image.data, image.width, left + x, top + y, palette[pixels[y * 8 + x]]);
}

const fontAtlasLayouts = new WeakMap();

/** Paint one committed bitmap into an already rendered atlas. */
function uiPaintFontAtlasGlyph(canvas, model, glyphId, bitmap) {
  const layout = fontAtlasLayouts.get(canvas);
  if (!layout || layout.model !== model || canvas.width !== layout.width ||
      canvas.height !== layout.height) return false;
  if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId >= layout.count) {
    throw new TypeError("未发布的字形图集位置");
  }
  const {cell, columns} = layout;
  const context = canvas.getContext("2d");
  const image = context.createImageData(cell, cell);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data.set([7, 10, 11, 255], offset);
  }
  uiPaintGlyph(image.data, cell, bitmap, 0, 1, 1, [228, 235, 225]);
  context.putImageData(image, (glyphId % columns) * cell,
    Math.floor(glyphId / columns) * cell);
  return true;
}

export function uiPaintFontAtlas(canvas, model, glyphData) {
  const columns = 64;
  const cell = 14;
  const rows = Math.ceil(Number(model.font?.glyph_count || 0) / columns);
  canvas.width = columns * cell;
  canvas.height = rows * cell;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(canvas.width, canvas.height);
  const background = [7, 10, 11];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    image.data[offset] = background[0];
    image.data[offset + 1] = background[1];
    image.data[offset + 2] = background[2];
    image.data[offset + 3] = 255;
  }
  for (let glyphId = 0; glyphId < Number(model.font?.glyph_count || 0); glyphId += 1) {
    uiPaintGlyph(
      image.data, canvas.width, glyphData, glyphId,
      (glyphId % columns) * cell + 1,
      Math.floor(glyphId / columns) * cell + 1,
      [228, 235, 225]
    );
  }
  context.putImageData(image, 0, 0);
  fontAtlasLayouts.set(canvas, {model, columns, cell,
    count: Number(model.font?.glyph_count || 0), width: canvas.width, height: canvas.height});
}

// The same field instance owns all mounted bitmap projections. Hosts supply only
// placement; they never relay edits to other views or subscribe to repository events.
const glyphFieldBindings = new WeakMap();
export function bindGlyphField(canvas, field, {model = null, glyphId = null} = {}) {
  let bindings = glyphFieldBindings.get(canvas);
  if (!bindings) glyphFieldBindings.set(canvas, bindings = new Map());
  const key = glyphId ?? "single";
  bindings.get(key)?.();
  const render = model
    ? (target, bitmap) => uiPaintFontAtlasGlyph(target, model, glyphId, bitmap)
    : paintGlyphBitmap;
  bindings.set(key, field.bind(canvas, render));
}

export function paintGlyphBitmap(canvas, bitmap) {
  const context = canvas.getContext("2d");
  const image = context.createImageData(12, 12);
  for (let i = 0; i < image.data.length; i += 4) image.data.set([7, 10, 11, 255], i);
  uiPaintGlyph(image.data, 12, bitmap, 0, 0, 0, [228, 235, 225]);
  context.putImageData(image, 0, 0);
}
