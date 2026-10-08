// @editor-module ROM metasprite 与打包直接帧的浏览器现画
//
// 配方权威是可编辑的 `metasprite-record`：两张指针表加两段紧凑记录区。
// **注意它存的是原始字节，不是解好的 sprite 列表**——`generic_objects` /
// `direct_frames` 那种带 `sprites[]` 的形状只存在于提取期派生的
// `game/visuals/index.json` 里。改了记录区，派生视图不会跟着变，所以这里必须
// 自己重新解码。
//
// 与 Python 侧的对应：
//   `decodeGenericObjects`   ← `mm_visual._generic_objects`（$80B6 记录区）
//   `decodeDirectFrames`     ← `mm_visual._direct_frame_objects`（$915A 打包网格）
//   `metaspriteObjectImage`  ← `mm_visual._render_metasprite_object`
//   `genericSheetImage`      ← `mm_visual._render_generic_sheet`
//   `directFrameSheetImage`  ← `mm_visual._render_direct_frame_sheet`

import {fieldOwner} from "../core/field-owners.js";
import {db} from "../core/project-db.js";
import {composeChrPatternTable} from "../core/media-assets.js";
import {
  blitRaster, byteRecords, createRaster, decodeChrTiles, paintChrTile,
} from "./chr-raster.js";

const GENERIC_POINTER_COUNT = 55;
const DIRECT_FRAME_POINTER_COUNT = 0x46;
// 打包直接帧的四种水平翻转位型（`grid & 3` 选一种，按列左移取 bit 5）。

import {decodeGenericObjects, decodeDirectFrames} from "../core/metasprite-layout.js";
export {decodeGenericObjects, decodeDirectFrames};

const recipeCaches = new WeakMap();
const sourceCaches = new WeakMap();

// 战斗上下文的调色板：ROM 只存三色，backdrop 由渲染器补 $0F。
const UNIVERSAL_BACKGROUND = 0x0f;

/** 指针表发布成 `{id, pointer_cpu}`（已经是 16 位），不是裸字节。 */
function pointerRecords(records, count, label) {
  if (!Array.isArray(records) || records.length !== count) {
    throw new TypeError(`${label}: 需要 ${count} 条指针记录`);
  }
  const table = new Uint16Array(count);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (!Number.isInteger(id) || id < 0 || id >= count || seen.has(id)) {
      throw new TypeError(`${label}: 指针 id ${record?.id} 无效或重复`);
    }
    if (!Number.isInteger(pointer) || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${label}[${id}]: pointer_cpu 必须是 u16`);
    }
    table[id] = pointer;
    seen.add(id);
  }
  return table;
}


function buildRecipe(document_) {
  const genericPointers = pointerRecords(
    document_?.generic_pointers, GENERIC_POINTER_COUNT, "generic_pointers");
  const genericData = byteRecords(
    document_?.generic_record_region, "generic_record_region");
  const directPointers = pointerRecords(
    document_?.direct_frame_pointers, DIRECT_FRAME_POINTER_COUNT,
    "direct_frame_pointers");
  const directData = byteRecords(
    document_?.direct_frame_record_region, "direct_frame_record_region");
  // 每组补上 backdrop，成为渲染器要的 4 色一组。
  const battle = [];
  for (const record of document_?.battle_sprite_palettes || []) {
    const colors = record?.colors;
    if (!Array.isArray(colors) || colors.length !== 3) {
      throw new TypeError(`战斗精灵调色板 ${record?.id} 必须是 3 色`);
    }
    battle[Number(record.id)] = [UNIVERSAL_BACKGROUND,
      ...colors.map(value => Number(value) & 0x3f)];
  }
  if (!battle.length || battle.some(item => !item)) {
    throw new TypeError("metasprite-record 缺少战斗精灵调色板");
  }
  return {
    genericObjects: decodeGenericObjects(genericPointers, genericData),
    directFrames: decodeDirectFrames(directPointers, directData),
    battlePalettes: Uint8Array.from(battle.flat()),
  };
}

async function metaspriteRecipe() {
  const document_ = await db.getDocument("metasprite-record", null);
  if (!document_) throw new TypeError("metasprite-record 配方正文不可用");
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  return recipe;
}

export async function genericMetaspriteObject(objectId) {
  const handle = `metasprite:${Number(objectId).toString(16).toUpperCase().padStart(2, '0')}`;
  const [document, pointer] = await Promise.all([
    db.getDocument('metasprite-record', null), db.getField('metasprite', handle, 'pointer_cpu'),
  ]);
  const owner = fieldOwner('metasprite-record');
  const object = owner.genericObject(document, {id: Number(objectId), handle, pointer});
  if (![3, 48, ...Array.from({length: 12}, (_, index) => 0x16 + index)].includes(Number(objectId))) return object;
  const header = object.source_fields[1];
  const count = await db.getField(header.resource_id, header.entity_handle, header.field);
  return owner.genericObject(document, {id: Number(objectId), handle, pointer, capacity: count.defaultValue});
}

export async function directMetaspriteFrame(frameId) {
  const recipe = await metaspriteRecipe();
  const frame = recipe.directFrames.find(row => row.id === frameId);
  if (!frame || frame.runtimeGenerated) throw new TypeError('直接帧缺少当前所属记录');
  return frame;
}

function spriteBounds(sprites) {
  const xs = sprites.map(sprite => sprite.x);
  const ys = sprites.map(sprite => sprite.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    minX, minY,
    width: Math.max(...xs) + 8 - minX,
    height: Math.max(...ys) + 8 - minY,
  };
}

/** `mm_visual._render_metasprite_object`：定尺画布 + 居中 + 自适应缩放。 */
export function metaspriteObjectImage(
  {tiles, palettes}, item,
  {size = 192, scale = 4, background = undefined} = {},
) {
  const raster = createRaster(size, size, background);
  const sprites = (item?.sprites || []).filter(sprite => !sprite.transparentTile);
  if (!sprites.length) return raster;
  const bounds = spriteBounds(sprites);
  const padding = 8;
  const fitScale = Math.min(
    scale,
    Math.max(1, Math.floor((size - padding * 2) / Math.max(1, bounds.width))),
    Math.max(1, Math.floor((size - padding * 2) / Math.max(1, bounds.height))));
  const originX = Math.floor((size - bounds.width * fitScale) / 2)
    - bounds.minX * fitScale;
  const originY = Math.floor((size - bounds.height * fitScale) / 2)
    - bounds.minY * fitScale;
  for (const sprite of sprites) {
    paintChrTile(
      raster.data, size,
      originX + sprite.x * fitScale, originY + sprite.y * fitScale,
      tiles[sprite.tile], palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
      {
        hflip: sprite.horizontalFlip,
        vflip: sprite.verticalFlip,
        scale: fitScale,
        background,
      });
  }
  return raster;
}

/** `mm_visual._render_generic_sheet`：8 列 × 64 px 网格组合表。 */
export function genericSheetImage({tiles, palettes}, objects, scale = 3) {
  const cell = 64;
  const columns = 8;
  const rows = Math.ceil(objects.length / columns);
  const width = columns * cell * scale;
  const raster = createRaster(width, rows * cell * scale);
  for (const item of objects) {
    const sprites = item.sprites || [];
    if (!sprites.length) continue;
    const bounds = spriteBounds(sprites);
    const cellX = (item.id % columns) * cell;
    const cellY = Math.floor(item.id / columns) * cell;
    const originX = cellX + Math.floor((cell - bounds.width) / 2) - bounds.minX;
    const originY = cellY + Math.floor((cell - bounds.height) / 2) - bounds.minY;
    for (const sprite of sprites) {
      paintChrTile(
        raster.data, width,
        (originX + sprite.x) * scale, (originY + sprite.y) * scale,
        tiles[sprite.tile],
        palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
        {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip, scale});
    }
  }
  return raster;
}

/** 取一个 metasprite 上下文的绘制输入。`banks` 就是该上下文的四页图案表。 */
export async function metaspriteContextSources(banks, palettes = null) {
  const recipe = await metaspriteRecipe();
  const chrDocument = await db.getDocument("shared-chr-bank", null);
  let byKey = sourceCaches.get(chrDocument);
  if (!byKey || byKey.recipe !== recipe) {
    byKey = {recipe, tiles: new Map()};
    sourceCaches.set(chrDocument, byKey);
  }
  const key = banks.join(",");
  if (!byKey.tiles.has(key)) {
    byKey.tiles.set(key, decodeChrTiles(await composeChrPatternTable(banks)));
  }
  return {
    recipe,
    tiles: byKey.tiles.get(key),
    palettes: palettes ? Uint8Array.from(palettes) : recipe.battlePalettes,
  };
}

/** 当前直接帧正文与已发布的只读 CHR 投影组合。 */
export async function metaspriteProjectedSources(patternTable, palettes) {
  return {
    recipe: await metaspriteRecipe(),
    tiles: decodeChrTiles(Uint8Array.from(patternTable)),
    palettes: Uint8Array.from(palettes),
  };
}

/**
 * 渲染后统一扫一遍 `[data-metasprite]` 并批量画。
 *
 * `data-metasprite-banks` 是该上下文的图案表 bank 顺序（逗号分隔），
 * `data-metasprite-kind` 取 `generic-sheet` / `direct-sheet` / `object` / `direct-frame`，
 * `data-metasprite-id` 只在单个对象时需要。
 */
export async function paintMetaspriteCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-metasprite]")];
  if (!canvases.length) return;
  for (const canvas of canvases) {
    if (canvas.dataset.metaspritePainted === "1" || !canvas.isConnected) continue;
    try {
      const banks = String(canvas.dataset.metaspriteBanks || "")
        .split(",").filter(Boolean).map(Number);
      if (!banks.length) throw new TypeError("缺少 metasprite 图案表 bank 顺序");
      const palettes = String(canvas.dataset.metaspritePalettes || "")
        .split(",").filter(Boolean).map(Number);
      const sources = await metaspriteContextSources(
        banks, palettes.length ? palettes : null);
      const kind = canvas.dataset.metaspriteKind || "generic-sheet";
      let raster;
      if (kind === "generic-sheet") {
        raster = genericSheetImage(sources, sources.recipe.genericObjects);
      } else if (kind === "direct-sheet") {
        raster = genericSheetImage(sources, sources.recipe.directFrames);
      } else {
        const id = Number(canvas.dataset.metaspriteId);
        const list = kind === "direct-frame"
          ? sources.recipe.directFrames : sources.recipe.genericObjects;
        const item = list.find(entry => entry.id === id);
        if (!item) throw new TypeError(`metasprite ${kind} ${id} 不存在`);
        raster = metaspriteObjectImage(sources, item, {
          size: Number(canvas.dataset.metaspriteSize || 192),
        });
      }
      blitRaster(canvas, raster);
      canvas.dataset.metaspritePainted = "1";
      delete canvas.dataset.metaspriteError;
    } catch (error) {
      canvas.dataset.metaspriteError = String(error?.message || error);
    }
  }
}

// 剧情舞台的 metasprite 精灵表：一格 64 px 的透明画布，横向复制 6 列、纵向 4 行，
// 好让 `background-position` 那套定位方式对所有精灵一致。以前是包内
// `playback/sprites/{generic,direct}-*.png`——而它们其实早就没生成了（见
// `mm_story._playback_metasprite_recipe` 的注释）。
const stageSheetCaches = new WeakMap();

export async function metaspriteStageOamCells(recipe) {
  const source = await metaspriteRecipe();
  const list = recipe.kind === "direct-frame" ? source.directFrames : source.genericObjects;
  const item = list.find(entry => entry.id === Number(recipe.id));
  const origin = Number(recipe.cell_size || 64) >> 1;
  // PRG $027093 跳过直接帧的零图块；通用组合图的透明图块仍提交 OAM。
  return (item?.sprites || []).filter(sprite => !sprite.transparentTile)
    .map(sprite => ({x: origin + sprite.x, y: origin + sprite.y + 1}));
}

/** 把一条 `metalmaxcn.metasprite-render-recipe` 画成舞台精灵表 data URL。 */
export async function metaspriteStageSheetUrl(recipe) {
  const banks = Array.isArray(recipe?.chr_banks) ? recipe.chr_banks.map(Number) : [];
  const id = Number(recipe?.id);
  const kind = String(recipe?.kind || "");
  if (!banks.length || !Number.isInteger(id) || !kind) return null;
  const chrDocument = await db.getDocument("shared-chr-bank", null);
  const actorDocument = await db.getDocument("actor-visual", null);
  const fieldPalettes = [...(actorDocument?.field_sprite_palettes || [])]
    .sort((left, right) => Number(left.id) - Number(right.id))
    .flatMap(record => record.colors || []);
  if (fieldPalettes.length !== 16) {
    throw new TypeError("actor-visual 缺少四组场景精灵调色板");
  }
  const sources = await metaspriteContextSources(banks, fieldPalettes);
  let cache = stageSheetCaches.get(chrDocument);
  if (!cache || cache.recipe !== sources.recipe
      || cache.actorDocument !== actorDocument) {
    cache = {recipe: sources.recipe, actorDocument, urls: new Map()};
    stageSheetCaches.set(chrDocument, cache);
  }
  const key = `${kind}:${id}:${banks.join(",")}:${recipe?.palette_override ?? ""}`;
  if (cache.urls.has(key)) return cache.urls.get(key);

  const list = kind === "direct-frame"
    ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = list.find(entry => entry.id === id);
  if (!item) return null;
  const cellSize = Number(recipe?.cell_size || 64);
  const origin = cellSize >> 1;
  const override = recipe?.palette_override;
  // 真 alpha：色号 0 完全不落笔，黑色轮廓照样盖住背景，和 OAM 一致。
  const cellRaster = createRaster(cellSize, cellSize, null);
  for (const sprite of item.sprites) {
    if (sprite.transparentTile) continue;
    const paletteId = override === null || override === undefined
      ? sprite.palette : Number(override);
    // OAM 纵坐标指向显示行的前一行。
    paintChrTile(
      cellRaster.data, cellSize,
      origin + sprite.x, origin + sprite.y + 1,
      sources.tiles[sprite.tile],
      sources.palettes.slice(paletteId * 4, paletteId * 4 + 4),
      {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip,
        background: null});
  }
  const canvas = document.createElement("canvas");
  canvas.width = cellSize * 6;
  canvas.height = cellSize * 4;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.imageSmoothingEnabled = false;
  const cell = document.createElement("canvas");
  blitRaster(cell, cellRaster);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      context.drawImage(cell, column * cellSize, row * cellSize);
    }
  }
  const url = canvas.toDataURL("image/png");
  cache.urls.set(key, url);
  return url;
}

/** 给消费方用的标记生成器。 */
export function metaspriteCanvas({
  banks, kind = "generic-sheet", id = null, size = 0, palettes = null,
  className = "", label = "",
} = {}) {
  const attributes = [
    'data-metasprite=""',
    `data-metasprite-banks="${(banks || []).map(Number).join(",")}"`,
    `data-metasprite-kind="${kind}"`,
    id === null || id === undefined ? "" : `data-metasprite-id="${Number(id)}"`,
    size ? `data-metasprite-size="${Number(size)}"` : "",
    Array.isArray(palettes) && palettes.length
      ? `data-metasprite-palettes="${palettes.map(Number).join(",")}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}
