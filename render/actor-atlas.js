// @editor-module 场景角色形象与运动的共享浏览器渲染器
//
// `actor-visual.motions` 是场景、剧情舞台和角色页唯一的取帧权威。角色类型只引用
// motion_id 并附带 OAM 属性；消费端不得再从帧号连续性猜测“六帧动画”。运动明确分为：
// 单帧、无方向序列，以及四方向 × 两步（左右共用侧面帧，右向水平翻转）。
//
// 像素来自 `shared-chr-bank`。角色的三张帧表、tile delta、OAM 属性和调色板均由
// `actor-visual` 当前 working 正文提供，保存任一正文都会通过 identity 缓存自然失效。

import {db} from "../core/project-db.js";
import {composeChrPatternTable} from "../core/media-assets.js";
import {
  blitRaster, byteRecords, createRaster, decodeChrTiles, paintChrTile,
} from "./chr-raster.js";

export const ACTOR_ENTRY_TYPE_SELECTOR = "type-selector";
export const ACTOR_ENTRY_SCENE_OBJECT = "scene-object";

import {ACTOR_FRAME_COUNT} from "../core/visual-compiler.js";
import {actorTiles, actorFrameScreenOffsetY, ACTOR_MOTION_SINGLE, ACTOR_MOTION_DIRECTIONLESS, ACTOR_MOTION_DIRECTIONAL} from "../core/actor-frame-layout.js";
export {actorTiles, ACTOR_MOTION_SINGLE, ACTOR_MOTION_DIRECTIONLESS, ACTOR_MOTION_DIRECTIONAL};
const ACTOR_MOTION_KINDS = new Set([
  ACTOR_MOTION_SINGLE,
  ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_DIRECTIONAL,
]);
const DIRECTION_IDS = Object.freeze(["up", "down", "left", "right"]);
const PREVIEW_DIRECTION_IDS = Object.freeze([
  "down",
  ...DIRECTION_IDS.filter(id => id !== "down"),
]);

const recipeCaches = new WeakMap();
const atlasCaches = new WeakMap();
const catalogCaches = new WeakMap();
const canvasPaints = new WeakMap();
let atlasInputRequest = null;

function atlasInputs() {
  const documents = ['shared-chr-bank', 'actor-visual', 'project.visuals']
    .map(schema => db.peekDocument(schema, null));
  if (documents.every(Boolean)) return Promise.resolve(documents);
  if ((documents[0] || documents[1]) && atlasInputRequest
      && documents.every((value, index) => value === atlasInputRequest.documents[index]))
    return atlasInputRequest.promise;
  const request = {documents, promise: Promise.all([
    db.getDocument('shared-chr-bank', null), db.getDocument('actor-visual', null),
    db.getDocument('project.visuals', null),
  ])};
  atlasInputRequest = request;
  const clear = () => {if (atlasInputRequest === request) atlasInputRequest = null;};
  request.promise.then(clear, clear);
  return request.promise;
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}

function modulo(value, divisor) {
  return ((Number(value) % divisor) + divisor) % divisor;
}

/**
 * 一帧四个象限的 tile、落点和最终翻转。
 *
 * descriptor 的四个水平翻转位先作用在各象限；角色类型 OAM 的 $40/$80 是整张
 * 16×16 形象的水平/垂直翻转，因此既重排象限，也切换每个 8×8 tile 的翻转。
 */

function directionalSelector(document_) {
  const source = document_?.directional_selector;
  if (!source || typeof source !== "object") {
    throw new TypeError("actor-visual 缺少 directional_selector");
  }
  const steps = integer(
    source.steps_per_direction,
    "directional_selector.steps_per_direction",
    1,
    8,
  );
  if (steps !== 2) {
    throw new TypeError("directional-4x2 必须每方向两帧");
  }
  const directions = new Map();
  for (const [index, raw] of (source.directions || []).entries()) {
    const id = String(raw?.id || "");
    if (!DIRECTION_IDS.includes(id) || directions.has(id)) {
      throw new TypeError(`方向选择器 ${index} 的 id 无效：${id}`);
    }
    if (!Array.isArray(raw.frame_indexes) || raw.frame_indexes.length !== steps) {
      throw new TypeError(`方向 ${id} 必须引用 ${steps} 个帧索引`);
    }
    directions.set(id, {
      id,
      frameIndexes: raw.frame_indexes.map((value, frameIndex) => integer(
        value,
        `方向 ${id} 帧索引 ${frameIndex}`,
        0,
        5,
      )),
      oamAttributeOr: integer(
        raw.oam_attribute_or,
        `方向 ${id} OAM 属性`,
        0,
        0xff,
      ),
    });
  }
  if (DIRECTION_IDS.some(id => !directions.has(id))) {
    throw new TypeError("directional_selector 必须包含上、下、左、右");
  }
  return {stepsPerDirection: steps, directions};
}

function motionRecords(document_) {
  if (!Array.isArray(document_?.motions) || !document_.motions.length) {
    throw new TypeError("actor-visual 缺少 motions");
  }
  const motions = new Map();
  for (const [index, raw] of document_.motions.entries()) {
    const id = String(raw?.id || "");
    const resourceId = String(raw?.resource_id || "");
    const kind = String(raw?.kind || "");
    if (!id || motions.has(id)) {
      throw new TypeError(`角色运动 ${index} 的 id 无效或重复：${id}`);
    }
    if (resourceId !== `actor-motion:${id}`) {
      throw new TypeError(`角色运动 ${id} 缺少有效资源 ID`);
    }
    if (!ACTOR_MOTION_KINDS.has(kind)) {
      throw new TypeError(`角色运动 ${id} 的类型无效：${kind}`);
    }
    const readFrames = () => {
      if (!Array.isArray(raw.frame_ids)) {
        throw new TypeError(`角色运动 ${id} 缺少 frame_ids`);
      }
      const frames = raw.frame_ids.map((value, frameIndex) => integer(
        value,
        `角色运动 ${id} 帧 ${frameIndex}`,
        0,
        ACTOR_FRAME_COUNT - 1,
      ));
      const expected = kind === ACTOR_MOTION_SINGLE ? 1
        : kind === ACTOR_MOTION_DIRECTIONAL ? 6 : null;
      if ((expected !== null && frames.length !== expected)
          || (kind === ACTOR_MOTION_DIRECTIONLESS
            && (frames.length < 2 || frames.length > 6))) {
        throw new TypeError(`角色运动 ${id} 的帧数与 ${kind} 不符`);
      }
      if (frames.some((frame, frameIndex) => frame !== frames[0] + frameIndex)) {
        throw new TypeError(`角色运动 ${id} 的选择帧必须连续`);
      }
      return frames;
    };
    let projectedFrames;
    motions.set(id, {
      id,
      resourceId,
      kind,
      label: String(raw.label || id),
      get frames() {return projectedFrames ||= readFrames();},
    });
  }
  return motions;
}

function buildRecipe(document_) {
  const frames = document_?.frames;
  if (!Array.isArray(frames) || frames.length !== ACTOR_FRAME_COUNT) {
    throw new TypeError(`actor-visual.frames 必须有 ${ACTOR_FRAME_COUNT} 条`);
  }
  const descriptors = new Array(ACTOR_FRAME_COUNT);
  const tileA = new Array(ACTOR_FRAME_COUNT);
  const tileB = new Array(ACTOR_FRAME_COUNT);
  const seenFrames = new Set();
  for (const frame of frames) {
    const id = integer(frame?.id, "角色帧 id", 0, ACTOR_FRAME_COUNT - 1);
    if (seenFrames.has(id)) throw new TypeError(`角色帧 id 重复：${id}`);
    seenFrames.add(id);
    for (const [target, name] of [[descriptors, "descriptor"], [tileA, "tile_a"], [tileB, "tile_b"]]) {
      let value;
      Object.defineProperty(target, id, {enumerable: true,
        get: () => value ??= integer(frame[name], `角色帧 ${id} ${name}`, 0, 0xff)});
    }
  }

  const deltas = byteRecords(document_.tile_deltas, "tile_deltas");
  if (deltas.length !== 16) throw new TypeError("tile_deltas 必须是 16 字节");
  const palettes = [];
  for (const record of document_.field_sprite_palettes || []) {
    const id = integer(record?.id, "场景精灵调色板 id", 0, 3);
    if (!Array.isArray(record.colors) || record.colors.length !== 4) {
      throw new TypeError(`场景精灵调色板 ${id} 必须是 4 色`);
    }
    palettes[id] = record.colors.map((value, index) => integer(
      value, `场景精灵调色板 ${id} 色 ${index}`, 0, 0x3f,
    ));
  }
  if (palettes.length !== 4 || palettes.some(item => !item)) {
    throw new TypeError("actor-visual 必须发布四组场景精灵调色板");
  }

  const selector = directionalSelector(document_);
  const motions = motionRecords(document_);
  const actorTypes = new Map();
  for (const [index, raw] of (document_.actor_types || []).entries()) {
    const id = integer(raw?.id, `角色类型 ${index} id`, 0, 0x3e);
    const resourceId = String(raw?.resource_id || "");
    const motionId = String(raw?.motion_id || "");
    if (actorTypes.has(id)) throw new TypeError(`角色类型 id 重复：${id}`);
    if (resourceId !== `actor-type:${id.toString(16).toUpperCase().padStart(2, "0")}`) {
      throw new TypeError(`角色类型 ${id} 缺少有效资源 ID`);
    }
    if (!motions.has(motionId)) {
      throw new TypeError(`角色类型 ${id} 引用了不存在的运动：${motionId}`);
    }
    const overrides = new Map();
    for (const [overrideIndex, override] of (raw.entry_overrides || []).entries()) {
      const entryPoint = String(override?.entry_point || "");
      const overrideMotion = String(override?.motion_id || "");
      if (!entryPoint || overrides.has(entryPoint) || !motions.has(overrideMotion)) {
        throw new TypeError(`角色类型 ${id} 的入口覆盖 ${overrideIndex} 无效`);
      }
      overrides.set(entryPoint, overrideMotion);
    }
    let oamAttributes;
    actorTypes.set(id, {
      id,
      resourceId,
      motionId,
      get oamAttributes() {return oamAttributes ??= integer(
        raw.oam_attributes,
        `角色类型 ${id} OAM 属性`,
        0,
        0xff,
      );},
      entryOverrides: overrides,
    });
  }
  if (actorTypes.size !== 63) {
    throw new TypeError("actor-visual 必须发布 63 个角色类型");
  }
  return {
    descriptors,
    tileA,
    tileB,
    deltas,
    palettes,
    selector,
    motions,
    actorTypes,
  };
}

async function actorRecipe() {
  const document_ = db.peekDocument('actor-visual', null) || await db.getDocument("actor-visual", null);
  if (!document_) throw new TypeError("actor-visual 配方正文不可用");
  return actorRecipeFromDocument(document_);
}

function actorRecipeFromDocument(document_) {
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  return recipe;
}

function representativeFrameForMotion(motion, selector) {
  const frameIndex = motion.kind === ACTOR_MOTION_DIRECTIONAL
    ? selector.directions.get("down").frameIndexes[0]
    : 0;
  return motion.frames[frameIndex];
}

function actorAppearanceFromRecipe(
  recipe, actorType, entryPoint = ACTOR_ENTRY_TYPE_SELECTOR,
) {
  const id = Number(actorType);
  const type = recipe.actorTypes.get(id);
  if (!type) throw new TypeError(`actor-visual 没有角色类型：${actorType}`);
  const motionId = type.entryOverrides.get(entryPoint) || type.motionId;
  const motion = recipe.motions.get(motionId);
  if (!motion) throw new TypeError(`角色类型 ${id} 的运动 ${motionId} 不存在`);
  return {
    id,
    resourceId: type.resourceId,
    motionId,
    motionResourceId: motion.resourceId,
    motionKind: motion.kind,
    motionLabel: motion.label,
    frames: [...motion.frames],
    screenOffsetsY: motion.frames.map(frame => actorFrameScreenOffsetY(frame, recipe)),
    representativeFrame: representativeFrameForMotion(motion, recipe.selector),
    entryPoint,
    oamAttributes: type.oamAttributes,
    palette: type.oamAttributes & 0x03,
    directionalSelector: recipe.selector,
  };
}

/** 按运动语义取某一时刻的实际帧与最终 OAM 翻转。 */
export function actorPoseForAppearance(
  appearance,
  {direction = "down", step = 0, sequenceIndex = null} = {},
) {
  if (!appearance || !Array.isArray(appearance.frames)
      || !appearance.frames.length) {
    throw new TypeError("角色形象缺少运动帧");
  }
  let frameIndex = 0;
  let directionId = null;
  let directionAttributes = 0;
  if (appearance.motionKind === ACTOR_MOTION_DIRECTIONAL) {
    const selector = appearance.directionalSelector;
    const entry = selector?.directions?.get(direction)
      || selector?.directions?.get("down");
    if (!entry) throw new TypeError("角色形象缺少四方向选择器");
    frameIndex = entry.frameIndexes[modulo(step, entry.frameIndexes.length)];
    directionId = entry.id;
    directionAttributes = entry.oamAttributeOr;
  } else if (appearance.motionKind === ACTOR_MOTION_DIRECTIONLESS) {
    frameIndex = modulo(sequenceIndex ?? step, appearance.frames.length);
  }
  const oamAttributes = appearance.oamAttributes | directionAttributes;
  return {
    frame: appearance.frames[frameIndex],
    frameIndex,
    screenOffsetY: appearance.screenOffsetsY?.[frameIndex] ?? 0,
    direction: directionId,
    step: appearance.motionKind === ACTOR_MOTION_DIRECTIONAL
      ? modulo(step, 2) : frameIndex,
    oamAttributes,
    palette: oamAttributes & 0x03,
    horizontalFlip: Boolean(oamAttributes & 0x40),
    verticalFlip: Boolean(oamAttributes & 0x80),
  };
}

/** 生成完整语义预览：普通行走显示下/上/左/右各两帧。 */
export function actorPreviewPoses(appearance) {
  if (appearance.motionKind === ACTOR_MOTION_DIRECTIONAL) {
    return PREVIEW_DIRECTION_IDS.flatMap(direction => [0, 1].map(step => (
      actorPoseForAppearance(appearance, {direction, step})
    )));
  }
  return appearance.frames.map((_, sequenceIndex) => actorPoseForAppearance(
    appearance, {sequenceIndex},
  ));
}

/** 从一份 `actor-visual` 正文生成角色类型目录；浏览器合同也走这条纯函数。 */
export function actorAppearanceCatalogFromDocument(
  document_, {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const recipe = buildRecipe(document_);
  return [...recipe.actorTypes.keys()].sort((left, right) => left - right)
    .map(id => actorAppearanceFromRecipe(recipe, id, entryPoint));
}

/** 从同一正文生成去重后的运动目录，不把动画帧冒充成独立形象。 */
export function actorMotionCatalogFromDocument(document_) {
  const recipe = buildRecipe(document_);
  return [...recipe.motions.values()].map(motion => {
    const primaryTypes = [...recipe.actorTypes.values()]
      .filter(type => type.motionId === motion.id)
      .map(type => type.id);
    const entryReferences = [...recipe.actorTypes.values()].flatMap(type => (
      [...type.entryOverrides.entries()]
        .filter(([, motionId]) => motionId === motion.id)
        .map(([entryPoint]) => ({actorType: type.id, entryPoint}))
    ));
    const appearanceVariants = [
      ...primaryTypes.map(actorType => ({
        actorType,
        entryPoint: ACTOR_ENTRY_TYPE_SELECTOR,
        appearance: actorAppearanceFromRecipe(
          recipe, actorType, ACTOR_ENTRY_TYPE_SELECTOR,
        ),
      })),
      ...entryReferences.map(reference => ({
        ...reference,
        appearance: actorAppearanceFromRecipe(
          recipe, reference.actorType, reference.entryPoint,
        ),
      })),
    ].map(variant => ({
      ...variant,
      poses: actorPreviewPoses(variant.appearance),
    }));
    const previewAppearance = appearanceVariants[0]?.appearance || {
      id: null,
      resourceId: null,
      motionId: motion.id,
      motionResourceId: motion.resourceId,
      motionKind: motion.kind,
      motionLabel: motion.label,
      frames: [...motion.frames],
      representativeFrame: representativeFrameForMotion(motion, recipe.selector),
      entryPoint: null,
      oamAttributes: 0,
      palette: 0,
      directionalSelector: recipe.selector,
    };
    return {
      id: motion.id,
      resourceId: motion.resourceId,
      kind: motion.kind,
      label: motion.label,
      frames: [...motion.frames],
      primaryActorTypes: primaryTypes,
      entryReferences,
      appearanceVariants,
      previewAppearance,
      previewPoses: appearanceVariants[0]?.poses
        || actorPreviewPoses(previewAppearance),
    };
  });
}

/** 读取当前 working 生效值，而不是提取期派生的剧情/场景投影。 */
export async function actorAppearanceCatalog(
  {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const recipe = await actorRecipe();
  let catalogs = catalogCaches.get(recipe);
  if (!catalogs) catalogCaches.set(recipe, catalogs = new Map());
  if (!catalogs.has(entryPoint)) catalogs.set(entryPoint,
    [...recipe.actorTypes.keys()].sort((left, right) => left - right)
      .map(id => actorAppearanceFromRecipe(recipe, id, entryPoint)));
  return catalogs.get(entryPoint);
}

/** 已准备好 actor-visual 时供逐帧舞台同步读取；未加载或类型无效则返回 null。 */
export function peekActorAppearance(
  actorType, {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const document_ = db.peekDocument("actor-visual", null);
  if (!document_) return null;
  let recipe = recipeCaches.get(document_);
  if (!recipe) {
    recipe = buildRecipe(document_);
    recipeCaches.set(document_, recipe);
  }
  try {
    return actorAppearanceFromRecipe(recipe, actorType, entryPoint);
  } catch {
    return null;
  }
}

/** 角色集 `pair` 的四页图案表 bank 顺序。 */
export function actorSetBanks(pair, visuals = db.peekDocument('project.visuals', null)) {
  const id = integer(pair, "角色集 pair", 0, 0xff);
  const context = visuals?.actors?.sets?.find(row => Number(row.id) === id)
    || visuals?.metasprites?.contexts?.find(row => Number(row.pair) === id);
  const banks = context?.pattern_table?.banks;
  if (!Array.isArray(banks) || banks.length !== 4)
    throw new TypeError(`角色集 ${id} 缺少图案表上下文`);
  return banks.map((bank, index) => integer(bank, `角色集 ${id} 图案页 ${index}`, 0, 255));
}

function normalizedPoses(frames, attributes = []) {
  return frames.map((frame, index) => ({
    frame: Number(frame),
    oamAttributes: attributes[index] === undefined ? null : Number(attributes[index]),
  }));
}

/**
 * 横向每个 pose 16 px；纵向各行选择身体调色板，头部按属性取色。
 * 传入 paletteId 时只画该行。
 * 单帧缩略图应使用单行模式，避免靠 CSS 位移整张 atlas 时露出相邻行。
 */
export function actorAtlasImage(
  {tiles, recipe}, poses, scale = 4, paletteId = null,
) {
  const paletteIds = paletteId === null || paletteId === undefined
    ? [0, 1, 2, 3]
    : [integer(paletteId, "角色图集调色板", 0, 3)];
  const width = poses.length * 16 * scale;
  const height = paletteIds.length * 16 * scale;
  const raster = createRaster(width, height);
  paletteIds.forEach((sourcePaletteId, row) => {
    poses.forEach((pose, column) => {
      const attributes = pose.oamAttributes === null || pose.oamAttributes === undefined
        ? sourcePaletteId * 5 : (pose.oamAttributes & 0xfc) | sourcePaletteId;
      actorTiles(pose.frame, recipe, attributes)
        .forEach(({tile, x, y, hflip, vflip, palette}) => {
          paintChrTile(
            raster.data,
            width,
            (column * 16 + x * 8) * scale,
            (row * 16 + y * 8) * scale,
            tiles[tile],
            recipe.palettes[palette],
            {hflip, vflip, scale},
          );
        });
    });
  });
  return raster;
}

/** 取一个角色集的绘制输入（图案表已解开、配方已归一）。 */
export async function actorSetSources(pair) {
  const [recipe, visuals] = await Promise.all([actorRecipe(),
    db.peekDocument('project.visuals', null) || db.getDocument('project.visuals')]);
  return actorSetSourcesFromRecipe(pair, recipe, visuals);
}

async function actorSetSourcesFromRecipe(pair, recipe, visuals) {
  const patternTable = await composeChrPatternTable(actorSetBanks(pair, visuals));
  return {recipe, tiles: decodeChrTiles(patternTable), patternTable};
}

/** 按角色类型引用或明确 pose 序列画图集。 */

/** 渲染后统一扫一遍 `[data-actor-atlas]` 并批量画。 */
export async function paintActorAtlasCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-actor-atlas]")]
    .filter(canvas => canvas.dataset.actorAtlasPainted !== '1' && canvas.isConnected);
  if (!canvases.length) return;
  let chrDocument;
  let actorDocument;
  let visuals;
  try {
    [chrDocument, actorDocument, visuals] = await atlasInputs();
  } catch (error) {
    canvases.forEach(canvas => {
      canvas.dataset.actorAtlasError = String(error?.message || error);
    });
    return;
  }
  if (!chrDocument || typeof chrDocument !== "object"
      || !actorDocument || typeof actorDocument !== "object") {
    canvases.forEach(canvas => {
      canvas.dataset.actorAtlasError = "shared-chr-bank / actor-visual 正文不可用";
    });
    return;
  }
  let byPair = atlasCaches.get(chrDocument);
  if (!byPair || byPair.actorDocument !== actorDocument || byPair.visuals !== visuals) {
    byPair = {actorDocument, visuals, sources: new Map(), rasters: new Map()};
    atlasCaches.set(chrDocument, byPair);
  }
  await Promise.all(canvases.map(canvas => paintActorCanvas(canvas, byPair)));
}

async function paintActorCanvas(canvas, byPair) {
  if (canvas.dataset.actorAtlasPainted === '1' || !canvas.isConnected) return;
  const pending = canvasPaints.get(canvas);
  if (pending) return pending;
  const painting = (async () => {
    try {
      const pair = Number(canvas.dataset.actorAtlas);
      if (!byPair.sources.has(pair)) {
        const request = actorSetSourcesFromRecipe(pair,
          actorRecipeFromDocument(byPair.actorDocument), byPair.visuals);
        byPair.sources.set(pair, request);
        request.catch(() => {
          if (byPair.sources.get(pair) === request) byPair.sources.delete(pair);
        });
      }
      const sources = await byPair.sources.get(pair);
      if (!canvas.isConnected) return;
      let poses;
      if (canvas.dataset.actorAtlasType !== undefined) {
        const appearance = actorAppearanceFromRecipe(
          sources.recipe,
          Number(canvas.dataset.actorAtlasType),
          canvas.dataset.actorAtlasEntry || ACTOR_ENTRY_TYPE_SELECTOR,
        );
        poses = normalizedPoses(
          appearance.frames,
          appearance.frames.map(() => appearance.oamAttributes),
        );
      } else {
        const frames = String(canvas.dataset.actorAtlasFrames || "")
          .split(",").filter(Boolean).map(Number);
        const attributes = String(canvas.dataset.actorAtlasAttributes || "")
          .split(",").filter(Boolean).map(Number);
        poses = normalizedPoses(frames, attributes);
      }
      if (!poses.length) throw new TypeError("角色图集没有要绘制的 pose");
      const palette = canvas.dataset.actorAtlasPalette === undefined
        ? null : Number(canvas.dataset.actorAtlasPalette);
      const scale = Number(canvas.dataset.actorAtlasScale || 4);
      const key = JSON.stringify([pair, poses, scale, palette]);
      if (!byPair.rasters.has(key)) byPair.rasters.set(key,
        actorAtlasImage(sources, poses, scale, palette));
      blitRaster(canvas, byPair.rasters.get(key));
      canvas.dataset.actorAtlasPainted = "1";
      delete canvas.dataset.actorAtlasError;
    } catch (error) {
      canvas.dataset.actorAtlasError = String(error?.message || error);
    }
  })();
  canvasPaints.set(canvas, painting);
  try {await painting;}
  finally {if (canvasPaints.get(canvas) === painting) canvasPaints.delete(canvas);}
}

// 剧情舞台使用横向物理帧、纵向四组身体调色板的透明精灵表。运动类别和实际列索引由
// actorPoseForAppearance 选择；单帧与三帧序列不再被强行套进六列 CSS。
const spriteSheetUrlCaches = new WeakMap();

/** 把一条语义 actor-sprite-recipe 画成 data URL。 */
export async function actorSpriteSheetUrl(recipe) {
  const pair = Number(recipe?.actor_set);
  if (!Number.isInteger(pair)) return null;
  const chrDocument = await db.getDocument("shared-chr-bank", null);
  const actorDocument = await db.getDocument("actor-visual", null);
  if (!chrDocument || !actorDocument) return null;
  let actorRecipeDocument = recipeCaches.get(actorDocument);
  if (!actorRecipeDocument) {
    actorRecipeDocument = buildRecipe(actorDocument);
    recipeCaches.set(actorDocument, actorRecipeDocument);
  }
  const actorType = Number(recipe?.actor_type);
  const entryPoint = String(recipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR);
  const appearance = Number.isInteger(actorType)
    ? actorAppearanceFromRecipe(actorRecipeDocument, actorType, entryPoint)
    : null;
  const frames = appearance?.frames
    || (Array.isArray(recipe?.frames) ? recipe.frames.map(Number) : []);
  if (!frames.length) return null;
  const headPalette = appearance ? (appearance.oamAttributes >> 2) & 0x03 : null;
  let byActor = spriteSheetUrlCaches.get(chrDocument);
  if (!byActor || byActor.actorDocument !== actorDocument) {
    byActor = {actorDocument, urls: new Map(), sources: new Map()};
    spriteSheetUrlCaches.set(chrDocument, byActor);
  }
  const key = `${pair}:${frames.join(",")}:${headPalette ?? "row"}`;
  if (byActor.urls.has(key)) return byActor.urls.get(key);
  if (!byActor.sources.has(pair)) {
    byActor.sources.set(pair, await actorSetSources(pair));
  }
  const sources = byActor.sources.get(pair);
  const scale = 4;
  const width = frames.length * 16 * scale;
  const height = 4 * 16 * scale;
  const raster = createRaster(width, height, null);
  for (let paletteId = 0; paletteId < 4; paletteId += 1) {
    const attributes = ((headPalette ?? paletteId) << 2) | paletteId;
    frames.forEach((frame, column) => {
      actorTiles(frame, sources.recipe, attributes)
        .forEach(({tile, x, y, hflip, vflip, palette}) => {
          paintChrTile(
            raster.data,
            width,
            (column * 16 + x * 8) * scale,
            (paletteId * 16 + y * 8) * scale,
            sources.tiles[tile],
            sources.recipe.palettes[palette],
            {hflip, vflip, scale, background: null},
          );
        });
    });
  }
  const canvas = document.createElement("canvas");
  blitRaster(canvas, raster);
  const url = canvas.toDataURL("image/png");
  byActor.urls.set(key, url);
  return url;
}

/** 给消费方用的标记生成器。 */
export function actorAtlasCanvas({
  pair,
  actorType = null,
  entryPoint = ACTOR_ENTRY_TYPE_SELECTOR,
  frames = null,
  attributes = null,
  scale = 4,
  palette = null,
  className = "",
  label = "",
  style = "",
} = {}) {
  const canvasAttributes = [
    `data-actor-atlas="${Number(pair)}"`,
    actorType !== null && actorType !== undefined
      ? `data-actor-atlas-type="${Number(actorType)}"` : "",
    entryPoint !== ACTOR_ENTRY_TYPE_SELECTOR
      ? `data-actor-atlas-entry="${entryPoint}"` : "",
    Array.isArray(frames) && frames.length
      ? `data-actor-atlas-frames="${frames.map(Number).join(",")}"` : "",
    Array.isArray(attributes) && attributes.length
      ? `data-actor-atlas-attributes="${attributes.map(Number).join(",")}"` : "",
    scale !== 4 ? `data-actor-atlas-scale="${Number(scale)}"` : "",
    palette !== null && palette !== undefined
      ? `data-actor-atlas-palette="${Number(palette)}"` : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
    style ? `style="${style}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${canvasAttributes}></canvas>`;
}
