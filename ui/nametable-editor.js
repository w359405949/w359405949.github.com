// @editor-module 通用 nametable 编辑器
//
// 一张 nametable 就是定长格子表：前 columns×rows 字节是 tile 编号，尾部是属性
// 表，一格属性管 4×4 tile。游戏里哪一屏用它、字节存在 CHR 还是 PRG、改动写到
// 哪个资源——全是调用方的事。所以这里只要几何、数据和两个写回回调，不认识任何
// 具体画面。
//
// 图块字节一律由调用方传入，并且应当来自 shared-chr-bank 的 original/working
// （engine/editor/core/media-assets.js）。本模块不自己取 CHR，也不写 CHR：
// 图元编辑是跨模块的通用能力，不能让每个用到 nametable 的页面各长一份。

import {nesPalette, uiPutRgb} from "../render/nes.js";

const NAMETABLE_COLUMNS = 32;
const NAMETABLE_ROWS = 30;
const NAMETABLE_ATTRIBUTE_BASE = 0x3C0;
export const TILE_BYTES = 16;
export const PALETTE_MAX = 0x3F;
export const PICKER_COLUMNS = 16;
export const PICKER_TILES = 256;

const OUTLINE = [236, 88, 180];

export const defaultGeometry = Object.freeze({
  columns: NAMETABLE_COLUMNS,
  rows: NAMETABLE_ROWS,
  attributeBase: NAMETABLE_ATTRIBUTE_BASE,
});

/** 属性表一格管 4×4 tile，组号由行列的第 1 位选出。 */
function attributeGroupAt(tiles, geometry, row, column) {
  const attribute = tiles[
    geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4)
  ];
  return (attribute >> (((row & 2) << 1) | (column & 2))) & 0x03;
}

/** 返回改写后的属性字节；调用方决定要不要落到自己的数据上。 */
export function attributeByteWith(current, row, column, group) {
  const shift = ((row & 2) << 1) | (column & 2);
  return (current & ~(0x03 << shift)) | ((group & 0x03) << shift);
}

export function attributeIndexAt(geometry, row, column) {
  return geometry.attributeBase + Math.floor(row / 4) * 8 + Math.floor(column / 4);
}

function groupColours(palette, group, background) {
  const colours = [0, 1, 2, 3].map(index =>
    nesPalette[Number(palette[group * 4 + index] || 0) & PALETTE_MAX]
  );
  // 每个 tile 的颜色 0 都取整屏通用色，这是 PPU 行为而不是分组色。
  if (background) colours[0] = background;
  return colours;
}

function paintTilePixels(image, patterns, tile, originX, originY, colours) {
  const offset = Number(tile) * TILE_BYTES;
  if (offset + TILE_BYTES > patterns.length) return;
  for (let y = 0; y < 8; y += 1) {
    const low = patterns[offset + y];
    const high = patterns[offset + 8 + y];
    for (let x = 0; x < 8; x += 1) {
      const shift = 7 - x;
      const value = ((low >> shift) & 1) | (((high >> shift) & 1) << 1);
      uiPutRgb(image.data, image.width, originX + x, originY + y, colours[value]);
    }
  }
}

/**
 * 框一个区域。`dash` 是虚线周期（前一半实、后一半虚），给 0 画实线。
 *
 * 同一屏上常要同时框几种含义不同的区域——「这个组件的地盘」和「它实际占了
 * 多少格」不该长得一样重。颜色与线型因此可调，默认仍是原来的粉色虚线。
 */
export function outlineBox(image, box, {colour = OUTLINE, dash = 4} = {}) {
  const right = box.x + box.width - 1;
  const bottom = box.y + box.height - 1;
  const on = offset => !dash || offset % dash < dash / 2;
  for (let x = box.x; x <= right; x += 1) {
    if (!on(x - box.x)) continue;
    uiPutRgb(image.data, image.width, x, box.y, colour);
    uiPutRgb(image.data, image.width, x, bottom, colour);
  }
  for (let y = box.y; y <= bottom; y += 1) {
    if (!on(y - box.y)) continue;
    uiPutRgb(image.data, image.width, box.x, y, colour);
    uiPutRgb(image.data, image.width, right, y, colour);
  }
}

function fillBackground(image, colour) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) uiPutRgb(image.data, image.width, x, y, colour);
  }
}

/**
 * 把一张 nametable 画进 image。
 *
 * `tiles` 是完整的一页（tile 区 + 属性区），`patterns` 是本屏映射后的图案表，
 * `palette` 是 32 字节整版调色板。精灵之类的叠加层由调用方在返回后自己画。
 */
export function paintNametable(image, {tiles, patterns, palette, geometry = defaultGeometry}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintTilePixels(
        image, patterns, tiles[row * geometry.columns + column],
        column * 8, row * 8,
        groupColours(palette, attributeGroupAt(tiles, geometry, row, column), background)
      );
    }
  }
  return background;
}

/**
 * 按 PPU 的取景方式画一屏：若干页拼成一个平面，滚动量在平面上截一个窗口。
 *
 * 编辑视图按 nametable 原点画一页，那是「你能改哪一格」的视图；跑起来看到的却是
 * 滚动影子截出来的窗口，越过页边界就接上相邻的那一页，并在平面边界处绕回。
 * 两者只差这一个函数，所以别在调用方里另写一遍带取模的合成循环。
 *
 * `pages` 是按页排布的二维数组（`pages[行][列]`），每项是一整页格子表或 null。
 * 相邻关系由调用方按镜像方式给出——本模块不认识镜像寄存器。
 */
export function paintNametableWindow(image, {
  pages, patterns, palette, scrollX = 0, scrollY = 0, geometry = defaultGeometry,
}) {
  const background = nesPalette[Number(palette[0] || 0x0F) & PALETTE_MAX];
  fillBackground(image, background);
  const planeColumns = pages[0].length * geometry.columns;
  const planeRows = pages.length * geometry.rows;
  const originColumn = Math.floor(scrollX / 8);
  const originRow = Math.floor(scrollY / 8);
  // 多画一列一行：滚动量不是 8 的倍数时，首尾各有半格露在窗口里。
  const columns = Math.ceil(image.width / 8) + 1;
  const rows = Math.ceil(image.height / 8) + 1;
  for (let row = 0; row < rows; row += 1) {
    const planeRow = (originRow + row) % planeRows;
    for (let column = 0; column < columns; column += 1) {
      const planeColumn = (originColumn + column) % planeColumns;
      const page = pages[Math.floor(planeRow / geometry.rows)]
        [Math.floor(planeColumn / geometry.columns)];
      if (!page) continue;
      const pageRow = planeRow % geometry.rows;
      const pageColumn = planeColumn % geometry.columns;
      paintTilePixels(
        image, patterns, page[pageRow * geometry.columns + pageColumn],
        (originColumn + column) * 8 - scrollX,
        (originRow + row) * 8 - scrollY,
        groupColours(palette, attributeGroupAt(page, geometry, pageRow, pageColumn),
          background)
      );
    }
  }
  return background;
}

function cellFromEvent(canvas, event, geometry = defaultGeometry) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * geometry.columns);
  const row = Math.floor((event.clientY - rect.top) / rect.height * geometry.rows);
  if (row < 0 || row >= geometry.rows || column < 0 || column >= geometry.columns) {
    return null;
  }
  return {row, column};
}

export function pickerTileFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const column = Math.floor((event.clientX - rect.left) / rect.width * PICKER_COLUMNS);
  const rows = PICKER_TILES / PICKER_COLUMNS;
  const row = Math.floor((event.clientY - rect.top) / rect.height * rows);
  const tile = row * PICKER_COLUMNS + column;
  return tile >= 0 && tile < PICKER_TILES ? tile : null;
}

/**
 * 绑定「按住拖动连续画」。
 *
 * `paint(cell)` 由调用方实现：它拿到格子坐标，自己决定改 tile 还是改属性、
 * 改到哪份数据上，返回是否真的变了。`onStroke` 在一笔开始前调用，适合压撤销栈。
 */
export function bindNametablePainting(canvas, {
  enabled = true, geometry = defaultGeometry, paint, onStroke, onChange,
}) {
  if (!canvas || !enabled || typeof paint !== "function") return;
  let pointer = null;
  const stop = event => {
    if (pointer === null) return;
    if (event?.pointerId != null && event.pointerId !== pointer) return;
    if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    pointer = null;
  };
  const apply = event => {
    const cell = cellFromEvent(canvas, event, geometry);
    if (cell && paint(cell)) onChange?.();
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (typeof enabled === 'function' && !enabled()) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    onStroke?.();
    apply(event);
  });
  canvas.addEventListener("pointermove", event => {
    if (event.pointerId !== pointer) return;
    if ((event.buttons & 1) === 0) {
      stop(event);
      return;
    }
    apply(event);
  });
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("lostpointercapture", stop);
}
