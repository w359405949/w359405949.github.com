// @editor-module 场景视觉字段对象提供普通场景、世界地图及剧情引用的预览与可点选单元。
// Browser scene raster sources.  Everything here comes from semantic JSON:
// scene:* supplies metatiles/palette/bank selection and shared-chr-bank supplies
// the editable NES 2bpp planes.  No ROM baseline, build result, or package
// binary is a valid preview dependency.

import {composeChrPatternTable} from "../../core/media-assets.js";
import {projectSceneMetatiles} from "../../core/metatile-projection.js";
import {sceneMapCell, sceneRuntimeMetatileId, sceneRuntimeMetatileOverlays} from "../../core/scene-runtime-map.js";
import {db} from "../../core/project-db.js";
import {canonicalJsonStringify} from "../../core/project-store-values.js";
import {ACTIVE_PROJECT_ID} from "../../core/project-session.js";
import {
  deletePreviewCacheEntry,
  getPreviewCacheEntry,
  prunePreviewCache,
  putPreviewCacheEntry,
} from "../../core/preview-cache.js";
import {state} from "../../core/state.js";
import {nesPalette} from "../../render/nes.js";
import {fieldChrAnimationRecipe, fieldChrAnimationBanks, worldChrAnimationBank} from "../../core/field-chr-animation.js";

const renderersByScene = new WeakMap();
const worldRenderersByScene = new WeakMap();

// 世界地图的四组地理 CHR 不是简单的四象限，边界来自渲染器 $AF50。
// 与 `mm_scene._world_zone` 必须逐格一致。
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 256;
const WORLD_ZONE_NAMES = Object.freeze(
  ["northwest", "northeast", "southwest", "southeast"]);
const SCENE_MAP_THUMBNAIL_CACHE_SCHEMA = "scene-map-thumbnail/v1";
const sceneThumbnailSourceDigests = new WeakMap();
const sceneThumbnailBankDigests = new WeakMap();

/** `mm_scene._world_zone` 的镜像：按 metatile 坐标选地理 CHR 组。 */
export function worldZoneAt(x, y) {
  if (x < 0x80 && y < 0x91) return "northwest";
  if (y < 0x61) return "northeast";
  if (x < 0x60) return "southwest";
  return "southeast";
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  }
  return result;
}

function sceneResourceId(sceneId) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  return `scene:${id.toString(16).toUpperCase().padStart(2, "0")}`;
}

async function sha256Text(value) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder !== "function") return null;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sceneThumbnailSource(scene) {
  const render = scene?.render || {};
  return {
    id: Number(scene?.id),
    preview_only: Boolean(scene?.preview_only),
    width: Number(scene?.width),
    height: Number(scene?.height),
    map: scene?.map || null,
    metatile_definitions: scene?.metatile_definitions || null,
    metatile_palette_ids: scene?.metatile_palette_ids || null,
    render: {
      background_palette: render.background_palette || null,
      mmc3_banks: render.mmc3_banks || null,
      zones: render.zones || null,
    },
  };
}

function sceneThumbnailChrBankIds(scene) {
  const source = Number(scene?.id) === 0
    ? (scene?.render?.zones || []).flatMap(zone => zone?.mmc3_banks || [])
    : scene?.render?.mmc3_banks || [];
  const result = [];
  const seen = new Set();
  for (const rawId of source) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id < 0 || id > 0xff || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

async function sceneThumbnailSourceDigest(scene) {
  if (sceneThumbnailSourceDigests.has(scene)) {
    return sceneThumbnailSourceDigests.get(scene);
  }
  const promise = sha256Text(canonicalJsonStringify(sceneThumbnailSource(scene)));
  sceneThumbnailSourceDigests.set(scene, promise);
  return promise;
}

async function sceneThumbnailBankDigest(bank) {
  if (sceneThumbnailBankDigests.has(bank)) {
    return sceneThumbnailBankDigests.get(bank);
  }
  // DB field views expose live getters. Hash their current values without
  // treating those accessors as a persistent JSON document.
  const promise = sha256Text(canonicalJsonStringify(structuredClone(bank)));
  sceneThumbnailBankDigests.set(bank, promise);
  return promise;
}

async function sceneMapThumbnailCacheKey(
  sceneId,
  {cellSize, width, height},
) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || !Array.isArray(visualDocument.banks)) return null;
  const sceneDigest = await sceneThumbnailSourceDigest(scene);
  if (!sceneDigest) return null;
  const bankDigests = [];
  for (const id of sceneThumbnailChrBankIds(scene)) {
    const bank = visualDocument.banks.find(item => Number(item?.id) === id);
    if (!bank) return null;
    const digest = await sceneThumbnailBankDigest(bank);
    if (!digest) return null;
    bankDigests.push([id, digest]);
  }
  const digest = await sha256Text(canonicalJsonStringify({
    schema: SCENE_MAP_THUMBNAIL_CACHE_SCHEMA,
    scene_id: Number(sceneId),
    cell_size: Number(cellSize),
    width: Number(width),
    height: Number(height),
    scene_sha256: sceneDigest,
    chr_banks: bankDigests,
  }));
  return digest ? `${SCENE_MAP_THUMBNAIL_CACHE_SCHEMA}:${digest}` : null;
}

function sceneThumbnailCacheProjectId() {
  const projectId = state.projectRepository?.projectId;
  return typeof projectId === "string" && projectId
    ? projectId : ACTIVE_PROJECT_ID;
}

/**
 * 当前会话里场景编辑器的草稿也是场景模块的有效正文。
 *
 * 草稿尚未保存时不能进 IndexedDB，但同一编辑器会话内的缩略图、目标预览与剧情舞台
 * 都必须看见它；否则这些消费者读 repository 时会各自得到另一张“当前场景”。
 */
function activeSceneEditorDocument(sceneId) {
  if (Number(state.sceneEntry?.id) !== Number(sceneId)
      || Number(state.scene?.id) !== Number(sceneId)
      || !state.scene || typeof state.scene !== "object"
      || state.sceneDraftRepository !== state.projectRepository) return null;
  return {scene: state.scene, logic: state.sceneLogic || null};
}

/** 以场景编辑草稿优先、浏览器 repository 次之，解析一份当前场景正文。 */
export async function loadSceneResourceDocumentById(sceneId) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  return activeSceneEditorDocument(id)
    || db.getResourceDocument(sceneResourceId(id), null);
}

/** Validate and normalize the JSON-only recipe for one regular scene. */
function sceneRenderRecipe(scene) {
  if (!scene || typeof scene !== "object") {
    throw new TypeError("场景渲染正文不可用");
  }
  if (scene.preview_only) return null;
  const bankValues = scene.render?.mmc3_banks;
  if (!Array.isArray(bankValues) || bankValues.length !== 4) {
    throw new TypeError("普通场景必须声明四个 MMC3 背景 CHR bank");
  }
  const banks = bankValues.map((value, index) =>
    integer(value, `render.mmc3_banks[${index}]`, 0, 0xff));
  const palette = scene.render?.background_palette;
  if (palette?.format !== "nes-system-palette-indices/v1" ||
      !Array.isArray(palette.colors) || palette.colors.length !== 16) {
    throw new TypeError("普通场景缺少 16 色 JSON 背景 palette");
  }
  const colors = Uint8Array.from(palette.colors.map((value, index) =>
    integer(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
  if (!Array.isArray(scene.metatile_definitions) ||
      scene.metatile_definitions.length !== 128 ||
      scene.metatile_definitions.some(item => !Array.isArray(item) || item.length !== 4)) {
    throw new TypeError("普通场景必须包含 128 个四象限 metatile 定义");
  }
  if (!Array.isArray(scene.metatile_palette_ids) ||
      scene.metatile_palette_ids.length !== 128) {
    throw new TypeError("普通场景必须包含 128 个 metatile palette ID");
  }
  scene.metatile_definitions.forEach((definition, metatileId) => {
    definition.forEach((value, quadrant) => integer(
      value,
      `metatile_definitions[${metatileId}][${quadrant}]`,
      0,
      0xff,
    ));
  });
  scene.metatile_palette_ids.forEach((value, metatileId) => integer(
    value, `metatile_palette_ids[${metatileId}]`, 0, 3,
  ));
  return {banks, palette: colors};
}

/** Decode one 8×8 NES 2bpp tile from a composed 4 KiB pattern table. */
function decodeSceneTile(patternTable, tileId) {
  if (!(patternTable instanceof Uint8Array) || patternTable.length !== 0x1000) {
    throw new TypeError("场景 pattern table 必须是 4 KiB Uint8Array");
  }
  const id = integer(tileId, "tile_id", 0, 0xff);
  const start = id * 16;
  const result = new Uint8Array(64);
  for (let y = 0; y < 8; y += 1) {
    const low = patternTable[start + y];
    const high = patternTable[start + y + 8];
    for (let x = 0; x < 8; x += 1) {
      const bit = 7 - x;
      result[y * 8 + x] = ((high >> bit) & 1) * 2 + ((low >> bit) & 1);
    }
  }
  return result;
}

/**
 * Rasterize one 16×16 metatile into a reusable canvas.
 *
 * 上界取该场景自己的定义表长度：普通场景是 128，世界地图是 187。写死 0x7F 会把
 * 世界地图挡在门外，而世界地图用的是同一套 metatile 语义。
 */
function sceneMetatileImage(scene, patternTable, palette, metatileId) {
  const count = Array.isArray(scene?.metatile_definitions)
    ? scene.metatile_definitions.length : 0;
  const id = integer(metatileId, "metatile_id", 0, Math.max(0, count - 1));
  const data = new Uint8ClampedArray(16 * 16 * 4);
  const paletteId = integer(
    scene.metatile_palette_ids[id], `metatile_palette_ids[${id}]`, 0, 3,
  );
  scene.metatile_definitions[id].forEach((rawTileId, quadrant) => {
    const tile = decodeSceneTile(patternTable, rawTileId);
    const qx = (quadrant & 1) * 8;
    const qy = (quadrant >> 1) * 8;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const colorIndex = tile[y * 8 + x];
        const colorId = palette[paletteId * 4 + colorIndex] & 0x3f;
        const color = nesPalette[colorId];
        const target = ((qy + y) * 16 + qx + x) * 4;
        data[target] = color[0];
        data[target + 1] = color[1];
        data[target + 2] = color[2];
        data[target + 3] = 255;
      }
    }
  });
  return {width: 16, height: 16, data};
}

/**
 * Rasterize one 16×16 metatile into a reusable canvas.
 *
 * 像素计算在 `sceneMetatileImage` 里，不碰 DOM——对拍合同要在 Node 里跑它。
 */
function createSceneMetatileCanvas(
  scene, patternTable, palette, metatileId,
) {
  const {width, height, data} = sceneMetatileImage(
    scene, patternTable, palette, metatileId);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

/**
 * Resolve one regular scene's live raster sources.
 *
 * The two-level WeakMap makes cache identity depend on both effective scene
 * JSON and effective shared-chr-bank JSON.  Saving either asset, switching project,
 * or resetting project-db therefore cannot reuse stale pixels.
 */
export async function loadSceneMetatileRenderer(scene, {animationPhase = null,
  metatileEdits = [], transformPatternTable = null} = {}) {
  scene = await projectSceneMetatiles(scene, {edits: metatileEdits});
  const recipe = sceneRenderRecipe(scene);
  if (!recipe) return null;
  const animation = animationPhase == null ? null
    : fieldChrAnimationRecipe(await db.getResourceDocument("palette-runtime-service", null));
  const banks = fieldChrAnimationBanks(scene, animation, animationPhase);
  const key = banks.join(":");
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || typeof visualDocument !== "object") {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  let byVisual = renderersByScene.get(scene);
  if (!byVisual) {
    byVisual = new WeakMap();
    renderersByScene.set(scene, byVisual);
  }
  let byBanks = byVisual.get(visualDocument);
  if (!byBanks) { byBanks = new Map(); byVisual.set(visualDocument, byBanks); }
  const cached = transformPatternTable ? null : byBanks.get(key);
  if (cached) return cached;
  let promise;
  promise = (async () => {
    const patternTable = await composeChrPatternTable(banks);
    transformPatternTable?.(patternTable, banks);
    // An invalidate/project switch can land while four banks are loading.
    // Never publish that mixed generation under the old document identity.
    const currentVisual = await db.getDocument("shared-chr-bank", null);
    if (currentVisual !== visualDocument) {
      byVisual.delete(visualDocument);
      return loadSceneMetatileRenderer(scene, {animationPhase, metatileEdits, transformPatternTable});
    }
    const metatiles = Array.from({length: 128}, (_, id) =>
      createSceneMetatileCanvas(scene, patternTable, recipe.palette, id));
    return {metatiles};
  })().catch(error => {
    if (byBanks.get(key) === promise) byBanks.delete(key);
    throw error;
  });
  if (!transformPatternTable) byBanks.set(key, promise);
  return promise;
}

/**
 * 校验并归一世界地图的渲染配方。
 *
 * 世界地图和普通场景是同一套 metatile 语义，差别只有一条：它把画面分成四个地理
 * 区，每区挂一组 CHR bank（`render.zones[].mmc3_banks`），因此同一个 metatile 号
 * 在不同区会画出不同图案。`preview_only` 说的是「背景当前不可编辑」，不是
 * 「只能看预渲染图」——像素照样是包内 JSON 的纯函数。
 */
function worldRenderRecipe(scene) {
  if (!scene || typeof scene !== "object") {
    throw new TypeError("世界地图渲染正文不可用");
  }
  if (Number(scene.id) !== 0) return null;
  const palette = scene.render?.background_palette;
  if (!Array.isArray(palette?.colors) || palette.colors.length !== 16) {
    throw new TypeError("世界地图缺少 16 色 JSON 背景 palette");
  }
  const colors = Uint8Array.from(palette.colors.map((value, index) =>
    integer(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
  const zones = new Map();
  for (const zone of scene.render?.zones || []) {
    const name = String(zone?.name || "");
    if (!WORLD_ZONE_NAMES.includes(name)) {
      throw new TypeError(`世界地图地理区名无效：${name}`);
    }
    const banks = zone?.mmc3_banks;
    if (!Array.isArray(banks) || banks.length !== 4) {
      throw new TypeError(`世界地图 ${name} 必须声明四个 CHR bank`);
    }
    zones.set(name, banks.map((value, index) =>
      integer(value, `render.zones.${name}.mmc3_banks[${index}]`, 0, 0xff)));
  }
  for (const name of WORLD_ZONE_NAMES) {
    if (!zones.has(name)) throw new TypeError(`世界地图缺少地理区 ${name}`);
  }
  if (!Array.isArray(scene.metatile_definitions)
      || !Array.isArray(scene.metatile_palette_ids)
      || scene.metatile_definitions.length !== scene.metatile_palette_ids.length) {
    throw new TypeError("世界地图的 metatile 定义与 palette ID 数量不一致");
  }
  if (!Array.isArray(scene.map) || scene.map.length !== WORLD_HEIGHT
      || scene.map.some(row => !Array.isArray(row) || row.length !== WORLD_WIDTH)) {
    throw new TypeError(`世界地图必须是 ${WORLD_WIDTH}×${WORLD_HEIGHT} 的 metatile 表`);
  }
  return {zones, palette: colors};
}

// 世界地图画布按场景正文、shared-chr-bank 正文与动画 CHR bank 缓存。
export async function loadWorldMetatileRenderer(scene, {animationPhase = null,
  metatileEdits = [], transformPatternTable = null} = {}) {
  scene = await projectSceneMetatiles(scene, {edits: metatileEdits});
  const recipe = worldRenderRecipe(scene);
  if (!recipe) return null;
  const visualDocument = await db.getDocument("shared-chr-bank", null);
  if (!visualDocument || typeof visualDocument !== "object") {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  let byVisual = worldRenderersByScene.get(scene);
  if (!byVisual) {
    byVisual = new WeakMap();
    worldRenderersByScene.set(scene, byVisual);
  }
  let byBank = byVisual.get(visualDocument);
  if (!byBank) { byBank = new Map(); byVisual.set(visualDocument, byBank); }
  const animation = animationPhase == null ? null
    : fieldChrAnimationRecipe(await db.getResourceDocument("palette-runtime-service", null));
  const animationBank = worldChrAnimationBank(animation, animationPhase);
  const cached = transformPatternTable ? null : byBank.get(animationBank);
  if (cached) return cached;
  let promise;
  promise = (async () => {
    const count = scene.metatile_definitions.length;
    const zones = new Map();
    for (const name of WORLD_ZONE_NAMES) {
      const banks = [...recipe.zones.get(name)];
      if (animationBank !== null) banks[0] = animationBank;
      const patternTable = await composeChrPatternTable(banks);
      transformPatternTable?.(patternTable, banks);
      zones.set(name, {
        metatiles: Array.from({length: count}, (_, id) =>
          createSceneMetatileCanvas(scene, patternTable, recipe.palette, id)),
      });
    }
    // 四组 bank 加载期间可能发生保存或项目切换；别把混代的结果挂在旧 identity 上。
    const currentVisual = await db.getDocument("shared-chr-bank", null);
    if (currentVisual !== visualDocument) {
      byVisual.delete(visualDocument);
      return loadWorldMetatileRenderer(scene, {animationPhase, metatileEdits, transformPatternTable});
    }
    return {zones, zoneAt: worldZoneAt};
  })().catch(error => {
    if (byBank.get(animationBank) === promise) {
      byBank.delete(animationBank);
    }
    throw error;
  });
  if (!transformPatternTable) byBank.set(animationBank, promise);
  return promise;
}

function sceneMapSize(scene) {
  const rows = scene?.map;
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])
      || !rows[0].length) {
    throw new TypeError("场景缺少非空 metatile 地图");
  }
  const width = rows[0].length;
  if (rows.some(row => !Array.isArray(row) || row.length !== width)) {
    throw new TypeError("场景 metatile 地图必须是矩形");
  }
  return {rows, width: Number(scene.width), height: Number(scene.height)};
}

function sceneCellMetatile(scene, renderer, x, y) {
  return sceneMetatileAt(scene, renderer, x, y, sceneRuntimeMetatileId(scene, x, y));
}

function sceneMetatileAt(scene, renderer, x, y, metatileId, zone = null) {
  const tiles = Number(scene.id) === 0
    ? renderer?.zones?.get(zone || worldZoneAt(x, y))?.metatiles
    : renderer?.metatiles;
  return tiles?.[Number(metatileId)] || null;
}

export function paintSceneMetatileCells(context, scene, renderer, cells, {zone = null} = {}) {
  context.imageSmoothingEnabled = false;
  for (const {x, y, metatile_id} of cells) {
    const tile = sceneMetatileAt(scene, renderer, x, y, metatile_id, zone);
    if (tile) context.drawImage(tile, x * 16, y * 16, 16, 16);
  }
}

/**
 * 场景模块的原始地图流拼装入口。
 *
 * 图块编辑器和场景资产列表必须看这一层；剧情、传送目标缩略图和场景逻辑视图
 * 在它之上统一走 `paintSceneRuntimeMap`，再叠加场景加载器产生的运行时 metatile。
 */
export function paintSceneMap(
  context,
  scene,
  renderer,
  {cellSize = 16, region = null, wrap = false} = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const {width, height} = sceneMapSize(scene);
  context.imageSmoothingEnabled = false;
  const left = region ? Math.floor(region.x / size) : 0;
  const top = region ? Math.floor(region.y / size) : 0;
  const right = region ? Math.ceil((region.x + region.width) / size) : width;
  const bottom = region ? Math.ceil((region.y + region.height) / size) : height;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const sourceX = wrap ? ((x % width) + width) % width : x;
      const sourceY = wrap ? ((y % height) + height) % height : y;
      if (sourceX < 0 || sourceY < 0 || sourceX >= width || sourceY >= height) continue;
      const tile = sceneCellMetatile(scene, renderer, sourceX, sourceY);
      if (tile) {
        context.drawImage(
          tile,
          x * size,
          y * size,
          size,
          size,
        );
      }
    }
  }
  return {width: width * size, height: height * size};
}

/**
 * 绘制场景加载器在运行时注入的 metatile 层。
 *
 * 这类图块不在 `scene.map` 的地图流里。以宝箱为例，地图流保存的是地面，加载器再按
 * `logic.layers.treasures[].runtime_metatile_overlay` 把未取得宝箱写进 SRAM 地图。字段
 * 来自场景基础模块已经解出的运行语义；消费端只负责合成，不复刻 ROM 偏移或算法。
 *
 * 扫描所有逻辑层而不是写死 treasures：今后其他场景对象只要发布同一语义字段，也会
 * 自动进入同一合成管线。`visibleLayers` 只供场景编辑器隐藏诊断层；剧情和传送目标
 * 缩略图默认显示全部运行时图层。
 */
function paintSceneRuntimeMetatileOverlays(
  context,
  scene,
  logic,
  renderer,
  {
    cellSize = 16,
    visibleLayers = null,
    resolveMetatileId = null,
  } = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  context.imageSmoothingEnabled = false;
  let painted = 0;
  for (const {x, y, metatileId} of sceneRuntimeMetatileOverlays(scene, logic, {visibleLayers, resolveMetatileId})) {
    const tile = sceneMetatileAt(scene, renderer, x, y, metatileId);
    if (!tile) continue;
    context.drawImage(tile, x * size, y * size, size, size);
    painted += 1;
  }
  return painted;
}

/**
 * 场景模块唯一的运行时画面合成入口：原始地图 + 场景加载器注入的 metatile 层。
 * 编辑器的图块模式仍显式调用 `paintSceneMap`，因为那里编辑的是原始地图流。
 */
export function paintSceneRuntimeMap(
  context,
  scene,
  logic,
  renderer,
  options = {},
) {
  const bounds = paintSceneMap(context, scene, renderer, options);
  const runtimeMetatileOverlays = paintSceneRuntimeMetatileOverlays(
    context, scene, logic, renderer, options,
  );
  for (const overlay of options.actionOverlays || []) {
    if (Number(overlay.sceneId) !== Number(scene.id)) continue;
    const tile = sceneMetatileAt(scene, renderer, overlay.x, overlay.y, overlay.metatileId);
    const size = options.cellSize ?? 16;
    if (tile) context.drawImage(tile, overlay.x * size, overlay.y * size, size, size);
  }
  return {...bounds, runtimeMetatileOverlays};
}

/** 用同一套场景拼装规则重画一个格；供场景编辑器的画笔即时反馈使用。 */
export function paintSceneMapCell(
  context,
  scene,
  renderer,
  x,
  y,
  {cellSize = 16, targetX = null, targetY = null} = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const {width, height} = sceneMapSize(scene);
  const cellX = integer(x, "scene_x", 0, width - 1);
  const cellY = integer(y, "scene_y", 0, height - 1);
  const tile = sceneCellMetatile(scene, renderer, cellX, cellY);
  if (!tile) return false;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    tile,
    targetX === null ? cellX * size : Number(targetX),
    targetY === null ? cellY * size : Number(targetY),
    size,
    size,
  );
  return true;
}

/**
 * 把整张场景画进一块离屏 canvas，按 metatile 尺寸缩放。
 *
 * 这是原始地图面的离屏缓存。场景资产列表直接使用它；传送目标预览和剧情舞台通过
 * `loadSceneRuntimeSurface` 在这一语义之上叠加场景逻辑，不再各自读取或拼装 PNG。
 *
 * `cellSize` 是第一层缩放——16 是原尺寸，列表页用 8 保留更多图块内容。列表随后
 * 把整张 surface 等比放进固定显示画布，并可把最终 PNG 写入独立的可丢弃预览缓存；
 * 它不是包内资产，也不进入项目导出。
 *
 * 本函数的内存缓存以「场景正文 identity × metatile renderer identity × cellSize」
 * 为键；场景保存会换正文，shared-chr-bank 保存会换 renderer。编辑中的同一草稿原地改
 * map 时，由 invalidateSceneSurface 显式作废。
 */
const surfacesByScene = new WeakMap();
const runtimeSurfacesByScene = new WeakMap();
const regionRevisions = new WeakMap();

export function invalidateSceneSurface(scene) {
  if (!scene || typeof scene !== "object") return;
  surfacesByScene.delete(scene);
  runtimeSurfacesByScene.delete(scene);
  regionRevisions.set(scene, (regionRevisions.get(scene) || 0) + 1);
  sceneThumbnailSourceDigests.delete(scene);
}

export async function loadSceneSurface(scene, {cellSize = 16, animationPhase = null} = {}) {
  if (!scene || typeof scene !== "object") return null;
  const size = integer(cellSize, "cellSize", 1, 16);
  const world = Number(scene.id) === 0;
  const renderer = world
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  let byRenderer = surfacesByScene.get(scene);
  if (!byRenderer) {
    byRenderer = new WeakMap();
    surfacesByScene.set(scene, byRenderer);
  }
  let bySize = byRenderer.get(renderer);
  if (!bySize) {
    bySize = new Map();
    byRenderer.set(renderer, bySize);
  }
  const cached = bySize.get(size);
  if (cached) return cached;
  const promise = (async () => {
    const {width, height} = sceneMapSize(scene);
    const canvas = document.createElement("canvas");
    canvas.width = width * size;
    canvas.height = height * size;
    const context = canvas.getContext("2d");
    paintSceneMap(context, scene, renderer, {cellSize: size});
    return canvas;
  })().catch(error => {
    if (bySize.get(size) === promise) bySize.delete(size);
    throw error;
  });
  bySize.set(size, promise);
  return promise;
}

/** 把场景正文与逻辑正文合成为加载后的运行时画面。 */
async function loadSceneRuntimeSurface(
  scene,
  logic,
  {cellSize = 16, animationPhase = null} = {},
) {
  if (!scene || typeof scene !== "object") return null;
  if (!logic || typeof logic !== "object") {
    return loadSceneSurface(scene, {cellSize, animationPhase});
  }
  const size = integer(cellSize, "cellSize", 1, 16);
  const renderer = Number(scene.id) === 0
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  let byLogic = runtimeSurfacesByScene.get(scene);
  if (!byLogic) {
    byLogic = new WeakMap();
    runtimeSurfacesByScene.set(scene, byLogic);
  }
  let byRenderer = byLogic.get(logic);
  if (!byRenderer) {
    byRenderer = new WeakMap();
    byLogic.set(logic, byRenderer);
  }
  let bySize = byRenderer.get(renderer);
  if (!bySize) {
    bySize = new Map();
    byRenderer.set(renderer, bySize);
  }
  const cached = bySize.get(size);
  if (cached) return cached;
  const promise = (async () => {
    const {width, height} = sceneMapSize(scene);
    const canvas = document.createElement("canvas");
    canvas.width = width * size;
    canvas.height = height * size;
    paintSceneRuntimeMap(
      canvas.getContext("2d"), scene, logic, renderer, {cellSize: size},
    );
    return canvas;
  })().catch(error => {
    if (bySize.get(size) === promise) bySize.delete(size);
    throw error;
  });
  bySize.set(size, promise);
  return promise;
}

/**
 * 按场景 ID 画整张场景。
 *
 * 传送目标与剧情默认看加载后的运行时画面；地图资产列表显式传
 * `includeRuntime: false`，使其内容与图块编辑器的原始地图面一致。
 */
export async function loadSceneSurfaceById(
  sceneId,
  {includeRuntime = true, ...options} = {},
) {
  const id = integer(sceneId, "scene_id", 0, 0xff);
  const document_ = await loadSceneResourceDocumentById(id);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  return includeRuntime
    ? loadSceneRuntimeSurface(scene, document_?.logic || null, options)
    : loadSceneSurface(scene, options);
}

const animatedViewportsBySurface = new WeakMap();
const regionsByRenderer = new WeakMap();

// 可见地图按正文、图块绘制器与区域缓存，剧情改写在运行时叠层之后绘制。
export async function loadSceneRegionById(sceneId, {
  x = 0, y = 0, width = 256, height = 240, animationPhase = null, fieldTiles = [],
} = {}) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const renderer = Number(scene.id) === 0
    ? await loadWorldMetatileRenderer(scene, {animationPhase})
    : await loadSceneMetatileRenderer(scene, {animationPhase});
  if (!renderer) return null;
  const mapWidth = Number(scene.width) * 16, mapHeight = Number(scene.height) * 16;
  const left = Math.max(0, Math.floor(x / 256) * 256);
  const top = Math.max(0, Math.floor(y / 256) * 256);
  const right = Math.min(mapWidth, Math.ceil((x + width) / 256) * 256);
  const bottom = Math.min(mapHeight, Math.ceil((y + height) / 256) * 256);
  if (right <= left || bottom <= top) return null;
  let cached = regionsByRenderer.get(renderer);
  const revision = regionRevisions.get(scene) || 0;
  if (!cached || cached.scene !== scene || cached.logic !== document_?.logic || cached.revision !== revision) {
    cached = {scene, logic: document_?.logic, revision, regions: new Map()};
    regionsByRenderer.set(renderer, cached);
  }
  const key = JSON.stringify([left, top, right, bottom, fieldTiles]);
  if (cached.regions.has(key)) return cached.regions.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = right - left;
  canvas.height = bottom - top;
  const drawing = canvas.getContext("2d");
  drawing.translate(-left, -top);
  paintSceneRuntimeMap(drawing, scene, document_?.logic, renderer, {
    region: {x: left, y: top, width: canvas.width, height: canvas.height},
    actionOverlays: fieldTiles.map(tile => ({sceneId: Number(scene.id),
      x: Number(tile.x), y: Number(tile.y), metatileId: Number(tile.tileId) & 0x7F})),
  });
  const result = {canvas, x: left, y: top};
  cached.regions.set(key, result);
  if (cached.regions.size > 8) cached.regions.delete(cached.regions.keys().next().value);
  return result;
}

/** 场景字段对象按相机取样完整视口；本地图外使用加载器的背景图块。 */
export async function loadSceneViewportById(sceneId, {
  cameraX = 0, cameraY = 0, width = 256, height = 240, cellSize = 16, animationPhase = null,
} = {}) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const surface = Number(scene.id) === 0 ? null
    : await loadSceneSurfaceById(sceneId, {cellSize, animationPhase});
  if (Number(scene.id) !== 0 && !surface) return null;
  const viewportKey = `${cameraX}:${cameraY}:${width}:${height}:${cellSize}`;
  const cached = animationPhase == null ? null : animatedViewportsBySurface.get(surface);
  if (cached?.key === viewportKey) return cached.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  if (Number(scene.id) === 0) {
    // PRG $028F58..$028F98 按相机原点为整个视口选择同一组 CHR。
    const renderer = await loadWorldMetatileRenderer(scene, {animationPhase});
    const tiles = renderer.zones.get(worldZoneAt(cameraX & 0xff, cameraY & 0xff)).metatiles;
    const viewportRenderer = {...renderer, zones: new Map([...renderer.zones.keys()]
      .map(zone => [zone, {metatiles: tiles}]))};
    drawing.save();
    drawing.translate(-cameraX * cellSize, -cameraY * cellSize);
    paintSceneMap(drawing, scene, viewportRenderer, {cellSize, wrap: true,
      region: {x: cameraX * cellSize, y: cameraY * cellSize, width, height}});
    drawing.restore();
    for (const wrapY of [0, 256]) {
      for (const wrapX of [0, 256]) {
        drawing.save();
        drawing.translate((wrapX - cameraX) * cellSize, (wrapY - cameraY) * cellSize);
        paintSceneRuntimeMetatileOverlays(drawing, scene, document_?.logic, viewportRenderer,
          {cellSize});
        drawing.restore();
      }
    }
  } else {
    // $A7AD 将扩展记录后四字节复制到 $8B..$8E；$DD94 越界取 $8D。
    const renderer = await loadSceneMetatileRenderer(scene, {animationPhase});
    const tile = renderer?.metatiles[Number(scene.header_extension?.[6])];
    if (tile) {
      const offsetX = -((cameraX % 1 + 1) % 1) * cellSize;
      const offsetY = -((cameraY % 1 + 1) % 1) * cellSize;
      const pattern = drawing.createPattern(tile, "repeat");
      pattern.setTransform({a: cellSize / tile.width, d: cellSize / tile.height,
        e: offsetX, f: offsetY});
      drawing.fillStyle = pattern;
      drawing.fillRect(0, 0, width, height);
    }
    drawing.drawImage(surface, -cameraX * cellSize, -cameraY * cellSize);
    if (animationPhase != null) animatedViewportsBySurface.set(surface, {key: viewportKey, canvas});
  }
  return canvas;
}

const sceneMarkerColors = {
  actor: [34, 211, 238], treasure: [246, 190, 48], vehicle: [255, 122, 24],
  investigation: [190, 126, 255], "investigation-special": [255, 126, 210],
  "investigation-tile": [139, 104, 220], transition: [220, 242, 49], elevator: [220, 242, 49],
  event: [239, 89, 108], tide: [40, 200, 190],
};

/** 场景详情与引用预览共用的逻辑图层标记。 */
export function paintSceneLogicMarkers(context, objects, {width, height, cellSize = 16, actorImages = false} = {}) {
  const scale = cellSize / 16;
  context.save();
  context.font = `bold ${Math.max(6, 8 * scale)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const {kind, record, x, y, selected = false} of objects) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0
        || x >= width || y >= height || !sceneMarkerColors[kind]) continue;
    const [red, green, blue] = sceneMarkerColors[kind];
    const markerText = kind === 'tide' ? ['↑', '↓', '←', '→'][record.direction]
      : kind === "elevator" ? "E" : kind === "investigation-tile"
      ? String(record.behavior_code_hex || "").replace(/^0x/, "")
      : Number(record.id).toString(16).toUpperCase();
    if (kind === 'actor' && actorImages) {
      if (selected) {
        context.strokeStyle = '#fff'; context.lineWidth = 2 * scale;
        context.strokeRect(x * cellSize + scale, y * cellSize + scale, cellSize - 2 * scale, cellSize - 2 * scale);
      }
      context.fillStyle = 'rgba(7,16,19,.78)';
      context.fillRect(x * cellSize, y * cellSize, 7 * scale, 7 * scale);
      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fillText(markerText, x * cellSize + 3.5 * scale, y * cellSize + 3.5 * scale);
      continue;
    }
    if (kind === "treasure" && record.runtime_metatile_overlay) {
      context.strokeStyle = selected ? "#fff" : `rgba(${red},${green},${blue},.95)`;
      context.lineWidth = (selected ? 2.5 : 1.5) * scale;
      context.strokeRect(x * cellSize + scale, y * cellSize + scale,
        cellSize - 2 * scale, cellSize - 2 * scale);
      context.fillStyle = "rgba(7,16,19,.78)";
      context.fillRect(x * cellSize + scale, y * cellSize + scale, 8 * scale, 7 * scale);
      context.textAlign = "left";
      context.fillStyle = `rgb(${red},${green},${blue})`;
      context.fillText(markerText, x * cellSize + 2.5 * scale, y * cellSize + 5 * scale);
      context.textAlign = "center";
      continue;
    }
    const cx = (x + .5) * cellSize, cy = (y + .5) * cellSize;
    context.fillStyle = `rgba(${red},${green},${blue},.82)`;
    context.fillRect(cx - 6 * scale, cy - 6 * scale, 12 * scale, 12 * scale);
    context.strokeStyle = selected ? "#fff" : "rgba(0,0,0,.8)";
    context.lineWidth = (selected ? 2 : 1) * scale;
    context.strokeRect(cx - 6.5 * scale, cy - 6.5 * scale, 13 * scale, 13 * scale);
    context.fillStyle = "#071013";
    context.fillText(markerText, cx, cy + .5 * scale);
  }
  context.restore();
}

export function paintSceneBoundaryMarkers(context, records, {width, height, cellSize = 16} = {}) {
  const pixelWidth = width * cellSize, pixelHeight = height * cellSize;
  const scale = cellSize / 16;
  context.save();
  context.font = `bold ${Math.max(6, 8 * scale)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const {record, sides = null, selected = false} of records) {
    const direction = sides || {1: ["up"], 2: ["down"], 3: ["left"], 4: ["right"]}[
      Number(record.direction_code)] || ["up", "down", "left", "right"];
    const destination = Number(record.destination_scene_id).toString(16).toUpperCase().padStart(2, "0");
    for (const side of direction) {
      const geometry = {
        up: {fill: [0, 0, pixelWidth, 7 * scale], line: [0, 2.5 * scale, pixelWidth, 2.5 * scale], text: [pixelWidth / 2, 4 * scale], arrow: "↑"},
        down: {fill: [0, pixelHeight - 7 * scale, pixelWidth, 7 * scale], line: [0, pixelHeight - 2.5 * scale, pixelWidth, pixelHeight - 2.5 * scale], text: [pixelWidth / 2, pixelHeight - 4 * scale], arrow: "↓"},
        left: {fill: [0, 0, 7 * scale, pixelHeight], line: [2.5 * scale, 0, 2.5 * scale, pixelHeight], text: [4 * scale, pixelHeight / 2], arrow: "←"},
        right: {fill: [pixelWidth - 7 * scale, 0, 7 * scale, pixelHeight], line: [pixelWidth - 2.5 * scale, 0, pixelWidth - 2.5 * scale, pixelHeight], text: [pixelWidth - 4 * scale, pixelHeight / 2], arrow: "→"},
      }[side];
      context.fillStyle = `rgba(132,204,22,${selected ? ".72" : ".42"})`;
      context.fillRect(...geometry.fill);
      context.beginPath();
      context.moveTo(geometry.line[0], geometry.line[1]);
      context.lineTo(geometry.line[2], geometry.line[3]);
      context.strokeStyle = selected ? "#fff" : "rgb(132,204,22)";
      context.lineWidth = (selected ? 3 : 1.5) * scale;
      context.stroke();
      context.fillStyle = selected ? "#fff" : "#071013";
      context.fillText(`${geometry.arrow}${destination}`, geometry.text[0], geometry.text[1]);
    }
  }
  context.restore();
}

function fixedSceneThumbnailSize(canvas) {
  const width = Number(canvas.dataset.sceneThumbWidth);
  const height = Number(canvas.dataset.sceneThumbHeight);
  return Number.isInteger(width) && width > 0
      && Number.isInteger(height) && height > 0
    ? {width, height} : null;
}

function sceneThumbnailCrop(canvas, surface, cellSize) {
  const value = canvas.dataset.sceneThumbCrop;
  if (!value) return null;
  const match = /^(\d+),(\d+),(\d+),(\d+)$/u.exec(value);
  if (!match) throw new Error("Invalid scene thumbnail crop");
  const [x, y, width, height] = match.slice(1).map(Number);
  if (!width || !height || (x + width) * cellSize > surface.width
      || (y + height) * cellSize > surface.height) {
    throw new Error("Scene thumbnail crop exceeds the map");
  }
  return {x: x * cellSize, y: y * cellSize,
    width: width * cellSize, height: height * cellSize};
}

function paintSceneThumbnailSurface(canvas, surface, fixedSize = null, crop = null) {
  if (fixedSize) {
    canvas.width = fixedSize.width;
    canvas.height = fixedSize.height;
  } else {
    canvas.width = surface.width;
    canvas.height = surface.height;
  }
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  if (!fixedSize) {
    context.drawImage(surface, 0, 0);
    return;
  }
  const source = crop || {x: 0, y: 0, width: surface.width, height: surface.height};
  const scale = Math.min(
    fixedSize.width / source.width,
    fixedSize.height / source.height,
  );
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const x = Math.floor((fixedSize.width - width) / 2);
  const y = Math.floor((fixedSize.height - height) / 2);
  context.drawImage(surface, source.x, source.y, source.width, source.height,
    x, y, width, height);
}

async function paintSceneThumbnailCacheRecord(canvas, record, fixedSize) {
  if (!record || !(record.data instanceof Blob)
      || Number(record.width) !== fixedSize.width
      || Number(record.height) !== fixedSize.height
      || typeof createImageBitmap !== "function") return false;
  const bitmap = await createImageBitmap(record.data);
  try {
    canvas.width = fixedSize.width;
    canvas.height = fixedSize.height;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(bitmap, 0, 0);
    return true;
  } finally {
    bitmap.close?.();
  }
}

function sceneThumbnailPngBlob(canvas) {
  if (typeof canvas.toBlob !== "function") return Promise.resolve(null);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), "image/png");
  });
}

/**
 * 渲染后统一扫一遍 `[data-scene-thumb]` 并批量画。
 *
 * 与 `paintUiConstructionCanvases` / `paintMonsterFigureCanvases` 同一形状。240 个
 * 场景各自要四页 CHR，所以**逐个 await**而不是 `Promise.all`：并发全部展开会同时
 * 持有 240 张离屏画面。列表页先用 8 px/metatile 保住图块内容，再等比放入固定画布，
 * 并缓存这张最终 PNG；其他场景缩略图也按至少 8 px/metatile 取样。
 */
export async function paintSceneThumbnailCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-scene-thumb]")].filter(canvas => {
    const menu = canvas.closest(".module-reference-picker-menu");
    return !menu || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
  await paintSceneThumbnailBatch(canvases);
}

/** 列表只等首屏；滚动和过滤后进入视口的行继续复用同一个 painter。 */
export function paintVisibleSceneThumbnailCanvases(root, {isCurrent}) {
  const canvases = [...root.querySelectorAll("canvas[data-scene-thumb]")];
  if (!canvases.length) return Promise.resolve();
  return new Promise(resolve => {
    const pending = new Set();
    let painting = false;
    let firstBatch = true;
    const active = () => root.isConnected && isCurrent();
    const stop = () => {
      visibility.disconnect();
      lifecycle.disconnect();
      pending.clear();
      resolve();
    };
    const paintPending = async () => {
      if (painting) return;
      if (!active()) { stop(); return; }
      painting = true;
      const initial = firstBatch;
      firstBatch = false;
      const batch = [...pending];
      pending.clear();
      batch.forEach(canvas => visibility.unobserve(canvas));
      await paintSceneThumbnailBatch(batch, active);
      painting = false;
      if (initial) resolve();
      if (!active()) stop();
      else if (pending.size) void paintPending();
    };
    const visibility = new IntersectionObserver(entries => {
      if (!active()) { stop(); return; }
      for (const entry of entries) {
        if (entry.isIntersecting) pending.add(entry.target);
        else pending.delete(entry.target);
      }
      void paintPending();
    });
    // #content 本身会复用；换页/重渲染后按 generation 清理旧观察器和队列。
    const lifecycle = new MutationObserver(() => {
      if (!active()) stop();
    });
    lifecycle.observe(root, {childList: true, subtree: true});
    canvases.forEach(canvas => visibility.observe(canvas));
  });
}

async function paintSceneThumbnailBatch(canvases, isCurrent = () => true) {
  if (!canvases.length) return;
  let wroteCache = false;
  for (const canvas of canvases) {
    // 缓存命中也要在两张之间给输入和滚动一次处理机会。
    if (canvas !== canvases[0]) await new Promise(resolve => setTimeout(resolve, 0));
    if (!isCurrent()) break;
    if (canvas.dataset.sceneThumbPainted === "1" || !canvas.isConnected) continue;
    try {
      const sceneId = Number(canvas.dataset.sceneThumb);
      const cellSize = Number(canvas.dataset.sceneThumbCell || 4);
      const mapContent = canvas.dataset.sceneThumbContent === "map";
      const fixedSize = fixedSceneThumbnailSize(canvas);
      const cacheEligible = mapContent && Boolean(fixedSize)
        && !canvas.dataset.sceneThumbCrop;
      const projectId = sceneThumbnailCacheProjectId();
      let cacheKey = null;
      if (cacheEligible) {
        try {
          cacheKey = await sceneMapThumbnailCacheKey(
            sceneId,
            {cellSize, ...fixedSize},
          );
        } catch (_cacheKeyError) {
          cacheKey = null;
        }
      }
      if (cacheKey) {
        const record = await getPreviewCacheEntry(projectId, cacheKey);
        if (!isCurrent()) break;
        if (!canvas.isConnected) continue;
        if (record) {
          try {
            if (await paintSceneThumbnailCacheRecord(canvas, record, fixedSize)) {
              canvas.dataset.sceneThumbPainted = "1";
              canvas.dataset.sceneThumbCache = "hit";
              delete canvas.dataset.sceneThumbCacheStored;
              delete canvas.dataset.sceneThumbError;
              continue;
            }
          } catch (_cacheDecodeError) {
            // Corrupt/unsupported image data is deleted, then rendered normally.
          }
          await deletePreviewCacheEntry(projectId, cacheKey);
        }
      }
      const surface = await loadSceneSurfaceById(
        sceneId,
        {
          cellSize,
          includeRuntime: !mapContent,
        });
      if (!isCurrent()) break;
      if (!canvas.isConnected) continue;
      if (!surface) continue;
      paintSceneThumbnailSurface(
        canvas, surface, fixedSize, sceneThumbnailCrop(canvas, surface, cellSize),
      );
      canvas.dataset.sceneThumbPainted = "1";
      canvas.dataset.sceneThumbCache = cacheKey ? "miss" : "bypass";
      delete canvas.dataset.sceneThumbError;
      if (cacheKey) {
        const blob = await sceneThumbnailPngBlob(canvas);
        const stored = blob && await putPreviewCacheEntry(
          projectId,
          cacheKey,
          blob,
          {width: fixedSize.width, height: fixedSize.height},
        );
        if (stored) {
          canvas.dataset.sceneThumbCacheStored = "1";
          wroteCache = true;
        }
      }
    } catch (error) {
      canvas.dataset.sceneThumbError = String(error?.message || error);
    }
  }
  if (wroteCache) await prunePreviewCache();
}

/** Resolve a story scene context through repository JSON, then package JSON. */
export async function loadStorySceneMetatileRenderer(context, options = {}) {
  if (!context || typeof context !== "object") return null;
  const numericId = Number(context.scene_id);
  let document_ = Number.isInteger(numericId) && numericId >= 0 && numericId <= 0xff
    ? await loadSceneResourceDocumentById(numericId)
    : null;
  if (!document_ && typeof context.package === "string" && context.package) {
    document_ = await db.getPackageDocument(context.package, null);
  }
  const scene = document_?.scene || document_;
  if (!scene || Number(scene.id) === 0 || scene.preview_only) return null;
  return loadSceneMetatileRenderer(scene, options);
}
