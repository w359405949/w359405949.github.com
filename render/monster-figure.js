// @editor-module 怪物战斗图形的浏览器现画
//
// 像素权威是 `shared-chr-bank` 的 2bpp 位面，配方权威是可编辑的 `monster-visual-layout`
// 正文。这里不消费任何预渲染 PNG，也不读 `game/visuals/index.json` 那份提取期
// 派生视图——派生视图已经把 bank_code/dimension 展开成 chr_banks/width/height/
// tiles，改了原始字段它不会跟着变。
//
// 与 Python 侧 `mm_visual._render_monster` 的对应关系（两边必须逐像素一致）：
//   bank 选择   `_monster_bank_set`
//   流长度      `_monster_stream_length`
//   布局解码    `decode_monster_layout`（$02FEBE-$02FFBA 建的 nametable 矩阵）
//   双调色板    `_monster_dual_palette_layouts`（$17:$BED6 的 $FF 分隔属性图）
//   取图块      `_monster_tile`
//   上色        `_paint_tile`（色号 0 = 透明衬底）

import {loadChrBankBytes} from "../core/media-assets.js";
import {
  MONSTER_SEQUENTIAL_GRAPHICS,
  monsterVisualRecipes,
} from "../core/monster-visual-recipes.js";
import {db} from "../core/project-db.js";
import {nesPalette} from "./nes.js";

// 与 Python 预览一致的显示衬底色。它只是「透明」的可见表示，不是 NES 颜色。
const FIGURE_MATTE = Object.freeze([11, 14, 16]);

const paintedMonsterCanvases = new WeakSet();

async function monsterRecipes() {
  const document_ = await db.getDocument("monster-visual-layout", null);
  if (!document_) throw new TypeError("monster-visual-layout 配方正文不可用");
  return monsterVisualRecipes(document_);
}

/** `_monster_tile`：把 tile 号解成 8×8 的 4 色索引。 */
function decodeTile(banks, tileId, sequential) {
  let bankIndex;
  let local;
  if (sequential && banks.length === 1) {
    bankIndex = 0;
    local = tileId & 0x3f;
  } else {
    bankIndex = Math.floor(tileId / 0x40);
    local = tileId % 0x40;
  }
  if (bankIndex >= banks.length) {
    throw new TypeError(`怪物图块 ${tileId.toString(16)} 超出已映射的 CHR 页`);
  }
  const bank = banks[bankIndex];
  const start = local * 16;
  const pixels = new Uint8Array(64);
  for (let row = 0; row < 8; row += 1) {
    const low = bank[start + row];
    const high = bank[start + row + 8];
    for (let column = 0; column < 8; column += 1) {
      const bit = 7 - column;
      pixels[row * 8 + column] =
        ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
    }
  }
  return pixels;
}

/**
 * 解析一个怪物图形的完整绘制输入。
 *
 * `enemyId` 决定调色板（同一图形不同敌人可以换色）；不给就用该图形的第一个敌人。
 */
export async function monsterFigureSources({
  graphicId, enemyId = null, paletteIds = null,
}) {
  const {byGraphic, byEnemy, palettes} = await monsterRecipes();
  let figure = null;
  let enemy = null;
  if (enemyId !== null && enemyId !== undefined && enemyId !== "") {
    enemy = byEnemy.get(Number(enemyId)) || null;
    if (enemy) figure = byGraphic.get(enemy.graphicId) || null;
  }
  if (!figure) {
    const id = Number(graphicId ?? enemy?.graphicId);
    figure = byGraphic.get(id) || null;
    if (!enemy) {
      for (const candidate of byEnemy.values()) {
        if (candidate.graphicId === id) {
          enemy = candidate;
          break;
        }
      }
    }
  }
  if (!figure) throw new TypeError(`怪物图形 ${graphicId} 不在 monster-visual-layout 里`);
  // **显式调色板优先。** 「这个图形换成那组色是什么样」是选色时唯一要回答的问题；
  // 没有这条覆盖，就只能拿某只怪物现有的配色去预览，等于看不到候选。
  const effectivePaletteIds = Array.isArray(paletteIds) && paletteIds.length
    ? paletteIds.map(Number)
    : (enemy?.paletteIds?.length ? enemy.paletteIds : [0]);
  const resolved = effectivePaletteIds.map(id => {
    const palette = palettes.get(Number(id));
    if (!palette) throw new TypeError(`怪物调色板 ${id} 缺失`);
    return palette;
  });
  // 直接 tilemap 会故意指向尚未分配的战斗槽；游戏在 $BFC0 装页之前把它们初始化
  // 成共享战斗页 $13，这里照做，否则会误报「超出已映射的 CHR 页」。
  const bankIds = [...figure.banks];
  if (figure.id >= MONSTER_SEQUENTIAL_GRAPHICS) {
    while (bankIds.length < 4) bankIds.push(0x13);
  }
  const banks = await Promise.all(bankIds.map(loadChrBankBytes));
  return {figure, banks, palettes: resolved};
}

/**
 * 按 `_render_monster` 的几何算出 RGBA 像素。
 *
 * 刻意不碰 DOM：返回裸缓冲区，`ImageData` 只在真正要画到 canvas 时才构造。
 * 对拍合同就是直接调它，Node 里没有 `ImageData` 也能跑。
 *
 * `scale` 是逻辑像素倍率，四周留 4 个逻辑像素的边——和 Python 预览完全一致，
 * 这样两边才能逐像素比。
 */
export function monsterFigureImage(
  {figure, banks, palettes}, scale = 4,
  {background = FIGURE_MATTE} = {},
) {
  const padding = 4;
  const width = (figure.widthTiles * 8 + padding * 2) * scale;
  const height = (figure.heightTiles * 8 + padding * 2) * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  if (background) {
    const [matteR, matteG, matteB] = background;
    for (let index = 0; index < data.length; index += 4) {
      data[index] = matteR;
      data[index + 1] = matteG;
      data[index + 2] = matteB;
      data[index + 3] = 255;
    }
  }
  const attributeWidth = Math.max(1, figure.widthTiles >> 1);
  const cells = figure.dual && palettes.length > 1 ? figure.dual.cells : null;
  const sequential = figure.id < MONSTER_SEQUENTIAL_GRAPHICS;
  figure.tiles.forEach((tileId, index) => {
    if (tileId === null) return;
    const tile = decodeTile(banks, tileId, sequential);
    const originX = (padding + (index % figure.widthTiles) * 8) * scale;
    const originY = (padding
      + Math.floor(index / figure.widthTiles) * 8) * scale;
    let component = 0;
    if (cells) {
      const attributeIndex =
        Math.floor(Math.floor(index / figure.widthTiles) / 2) * attributeWidth
        + Math.floor((index % figure.widthTiles) / 2);
      if (attributeIndex < cells.length) component = cells[attributeIndex];
    }
    const palette = palettes[component] || palettes[0];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const colorIndex = tile[y * 8 + x];
        if (colorIndex === 0) continue;   // 色号 0 是透明，保留衬底
        const [red, green, blue] = nesPalette[palette[colorIndex] & 0x3f];
        for (let sy = 0; sy < scale; sy += 1) {
          const rowStart = ((originY + y * scale + sy) * width) * 4;
          for (let sx = 0; sx < scale; sx += 1) {
            const target = rowStart + (originX + x * scale + sx) * 4;
            data[target] = red;
            data[target + 1] = green;
            data[target + 2] = blue;
            data[target + 3] = 255;
          }
        }
      }
    }
  });
  return {width, height, data};
}

/**
 * 把一个怪物图形画进 canvas。
 *
 * `box` 给定时画成固定见方画布并居中（取代原来 320×320 的 thumbnail PNG），
 * 否则按 `scale` 画成原始尺寸（取代 previews PNG）。
 */
async function paintMonsterFigure(canvas, {
  graphicId, enemyId, scale = 4, box = 0, paletteIds = null,
}) {
  const sources = await monsterFigureSources({graphicId, enemyId, paletteIds});
  const {figure} = sources;
  let effectiveScale = scale;
  if (box) {
    const logicalWidth = figure.widthTiles * 8 + 8;
    const logicalHeight = figure.heightTiles * 8 + 8;
    effectiveScale = Math.max(1, Math.min(
      5,
      Math.floor(box / logicalWidth),
      Math.floor(box / logicalHeight)));
  }
  const {width, height, data} = monsterFigureImage(sources, effectiveScale);
  const context = canvas.getContext("2d", {willReadFrequently: false});
  if (!context) return;
  const image = new ImageData(data, width, height);
  if (box) {
    // **`box` 是下限不是上限。** 整数缩放最小就是 1 倍，79 个怪物图形里有 13 个
    // 那时仍然超出方框（最大 104×136）——按 box 裁掉，画面上就只剩中间一截。
    // 画布取 box 与内容的较大者，整只怪物一定在里面；显示尺寸交给 CSS 去收。
    const canvasWidth = Math.max(box, width);
    const canvasHeight = Math.max(box, height);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.fillStyle = `rgb(${FIGURE_MATTE.join(",")})`;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.putImageData(
      image,
      Math.floor((canvasWidth - width) / 2),
      Math.floor((canvasHeight - height) / 2));
  } else {
    canvas.width = width;
    canvas.height = height;
    context.putImageData(image, 0, 0);
  }
  canvas.dataset.monsterFigurePainted = "1";
  paintedMonsterCanvases.add(canvas);
}

/**
 * 渲染后统一扫一遍 `[data-monster-figure]` 并批量画。
 *
 * 与 `paintUiConstructionCanvases` 同一形状：共享正文只取一次，没有目标就直接
 * 返回，绝不为一张缩略图单独拉一次配方。
 */
export async function paintMonsterFigureCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-monster-figure]")];
  if (!canvases.length) return;
  try {
    await monsterRecipes();
  } catch (error) {
    canvases.forEach(canvas => {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    });
    return;
  }
  await Promise.all(canvases.map(async canvas => {
    if (paintedMonsterCanvases.has(canvas)) return;
    try {
      await paintMonsterFigure(canvas, {
        graphicId: canvas.dataset.monsterFigure === ""
          ? null : Number(canvas.dataset.monsterFigure),
        enemyId: canvas.dataset.monsterFigureEnemy === undefined
          ? null : Number(canvas.dataset.monsterFigureEnemy),
        scale: Number(canvas.dataset.monsterFigureScale || 4),
        box: Number(canvas.dataset.monsterFigureBox || 0),
        paletteIds: canvas.dataset.monsterFigurePalettes
          ? canvas.dataset.monsterFigurePalettes.split(",").map(Number) : null,
      });
      delete canvas.dataset.monsterFigureError;
    } catch (error) {
      canvas.dataset.monsterFigureError = String(error?.message || error);
    }
  }));
}

/** 给消费方用的标记生成器，避免每个视图各拼一遍 dataset。 */
export function monsterFigureCanvas({
  graphicId = null, enemyId = null, box = 0, scale = 4, className = "", label = "",
  paletteIds = null,
} = {}) {
  const attributes = [
    `data-monster-figure="${graphicId === null ? "" : Number(graphicId)}"`,
    Array.isArray(paletteIds) && paletteIds.length
      ? `data-monster-figure-palettes="${paletteIds.map(Number).join(",")}"` : "",
    enemyId === null || enemyId === undefined
      ? "" : `data-monster-figure-enemy="${Number(enemyId)}"`,
    box ? `data-monster-figure-box="${Number(box)}"` : "",
    scale !== 4 ? `data-monster-figure-scale="${Number(scale)}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}
