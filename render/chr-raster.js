// @editor-module CHR 图块光栅化的共享底座
//
// 每个「配方 + shared-chr-bank → 像素」的渲染器都要做同两件事：从图案表里解一个
// 8×8 的 2bpp 图块，然后按调色板画到某个坐标上。这里只放这两件事，别的都不放。
//
// 与 Python 侧的对应（两边必须逐像素一致）：
//   `decodeChrTile`  ← `mm_trace_analyze.decode_chr_tile`
//   `paintChrTile`   ← `mm_visual._paint_tile`
//
// **色号 0 是透明**，画成 `background`（默认与 Python 预览同一个显示衬底色）。
// 那不是 NES 的颜色，只是「透明」的可见表示；真正需要 alpha 的场合传
// `transparent: true` 且 `background: null`。

import {nesPalette} from "./nes.js";

/** Python 预览用的显示衬底色。黑色轮廓在深色背景上才看得见。 */
const MATTE = Object.freeze([11, 14, 16]);

/** 从 4 KiB（或更长）图案表里解出一个 8×8 图块的 4 色索引。 */
export function decodeChrTile(patternTable, tileId) {
  const start = tileId * 16;
  if (start < 0 || start + 16 > patternTable.length) {
    throw new RangeError(`图块 ${tileId} 超出图案表（${patternTable.length} 字节）`);
  }
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = patternTable[start + row];
    const high = patternTable[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] = ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/** 一次解开整张图案表，避免同一图块被反复解。 */
export function decodeChrTiles(patternTable) {
  const count = Math.floor(patternTable.length / 16);
  const tiles = new Array(count);
  for (let id = 0; id < count; id += 1) tiles[id] = decodeChrTile(patternTable, id);
  return tiles;
}

/**
 * 把一个已解开的图块画进 RGBA 缓冲区。
 *
 * `palette` 是 4 个 NES 系统调色板下标。`transparent` 为真时色号 0 不落笔
 * （`background` 为 null）或落成衬底色。
 */
export function paintChrTile(data, imageWidth, originX, originY, tile, palette, {
  hflip = false, vflip = false, scale = 1,
  transparent = true, background = MATTE,
} = {}) {
  for (let y = 0; y < 8; y += 1) {
    const sourceY = vflip ? 7 - y : y;
    for (let x = 0; x < 8; x += 1) {
      const sourceX = hflip ? 7 - x : x;
      const colorIndex = tile[sourceY * 8 + sourceX];
      let color;
      let alpha = 255;
      if (transparent && colorIndex === 0) {
        if (!background) continue;          // 真 alpha：这一格不落笔
        color = background;
      } else {
        color = nesPalette[palette[colorIndex] & 0x3f];
      }
      for (let sy = 0; sy < scale; sy += 1) {
        const row = (originY + y * scale + sy) * imageWidth;
        for (let sx = 0; sx < scale; sx += 1) {
          const target = (row + originX + x * scale + sx) * 4;
          if (target < 0 || target + 3 >= data.length) continue;
          data[target] = color[0];
          data[target + 1] = color[1];
          data[target + 2] = color[2];
          data[target + 3] = alpha;
        }
      }
    }
  }
}

/** 建一块填好衬底色的 RGBA 缓冲区；`background` 为 null 则全透明。 */
export function createRaster(width, height, background = MATTE) {
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [red, green, blue] = background;
    const pixel = new Uint8ClampedArray([red, green, blue, 255]);
    new Uint32Array(data.buffer).fill(new Uint32Array(pixel.buffer)[0]);
  }
  return {width, height, data};
}

/** 把 RGBA 缓冲区画进 canvas。canvas 尺寸随之调整。 */
export function blitRaster(canvas, raster) {
  canvas.width = raster.width;
  canvas.height = raster.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.putImageData(new ImageData(raster.data, raster.width, raster.height), 0, 0);
}

/** `{id, value}` 稳定字节记录 → 扁平 Uint8Array。 */
export function byteRecords(records, label) {
  if (!Array.isArray(records) || !records.length) {
    throw new TypeError(`${label}: 缺少稳定字节记录`);
  }
  const result = new Uint8Array(records.length);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const value = Number(record?.value);
    if (!Number.isInteger(id) || id < 0 || id >= records.length || seen.has(id)) {
      throw new TypeError(`${label}: 字节记录 id ${record?.id} 无效或重复`);
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new TypeError(`${label}[${id}]: 字节值必须是 0..255`);
    }
    result[id] = value;
    seen.add(id);
  }
  return result;
}
