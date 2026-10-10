import { esc, createRaster, paintChrTile, blitRaster, byteRecords, composeChrPatternTable, decodeChrTiles, metaspriteContextSources, nesPalette, bindCanvasViewport, canvasViewportControls, resourcePhysicalAddressSummary, compactResourceAddress, physicalAddressLink, directPhysicalAddress } from './interface-state-preview-Dlotqlmn.js';
import { state } from './emulator-Bpa8EsFw.js';
import { db, projectSceneMetatileSources, ACTOR_FRAME_COUNT, sceneFieldChrAnimation, sceneRuntimeMetatileOverlays, sceneRuntimeMetatileId, ACTIVE_PROJECT_ID, sceneMapCell } from './prg-loaders-DnCSmXk9.js';
import { canonicalJsonStringify } from './visual-metasprites-IDA0o2Z8.js';

// @editor-module 可选中复制的记录句柄。

function shortHandleLabel(handle) {
  const value = String(handle || ""), match = /^[a-z][a-z0-9-]*(?::[0-9A-F]{2})*:([0-9A-F]{2}):([0-9A-F]{32})$/u.exec(value);
  return match ? `${match[1]}:${match[2].slice(0, 8)}…` : value;
}

function handleMarkup(handle, {label = shortHandleLabel(handle), title = handle} = {}) {
  const value = String(handle || "");
  if (!value) return "";
  return `<span class="record-handle" data-resource-handle="${esc(value)}"${title === null ? '' : ` title="${esc(title)}"`}>${esc(label)}</span>`;
}

function handleTextMarkup(text) {
  const source = String(text || "");
  let cursor = 0;
  let markup = "";
  for (const match of source.matchAll(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu)) {
    markup += esc(source.slice(cursor, match.index)) + handleMarkup(match[0]);
    cursor = match.index + match[0].length;
  }
  return markup + esc(source.slice(cursor));
}

const cache = new WeakMap();

async function projectSceneMetatiles(scene, {edits = []} = {}) {
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null),
    db.getResourceDocument("metatile-set", null),
  ]);
  if (edits.length) return projectSceneMetatileSources(scene, {pages, sets, edits});
  const previous = cache.get(scene);
  if (previous?.pages === pages && previous.sets === sets) return previous.value;
  const value = projectSceneMetatileSources(scene, {pages, sets});
  cache.set(scene, {pages, sets, value});
  return value;
}

// @editor-module 角色单帧四象限的纯计算，供渲染与导入共用。
const ACTOR_MOTION_SINGLE = "single-frame";
const ACTOR_MOTION_DIRECTIONLESS = "directionless-sequence";
const ACTOR_MOTION_DIRECTIONAL = "directional-4x2";
const ACTOR_MOTION_DIRECTIONAL_TAIL = "directional-4x2-tail";

// PRG $02636A 减 4，$026474 的两组纵偏移为 1/9 与 2/10，OAM 显示行再加 1。
function actorFrameScreenOffsetY(frame, {descriptors}) {
  const id = integer$3(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  return -2 + (descriptors[id] >>> 7);
}

function integer$3(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}


function actorTiles(
  frame, {descriptors, tileA, tileB, deltas}, oamAttributes = 0,
) {
  const id = integer$3(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  const attributes = integer$3(oamAttributes, "角色 OAM 属性", 0, 0xff);
  const descriptor = descriptors[id];
  const selector = descriptor & 0x07;
  const signed = value => (value > 0x7f ? value - 0x100 : value);
  const deltaA = signed(deltas[selector]);
  const deltaB = signed(deltas[8 + selector]);
  const values = [
    tileA[id],
    (tileA[id] + deltaA) & 0xff,
    tileB[id],
    (tileB[id] + deltaB) & 0xff,
  ];
  const globalHflip = Boolean(attributes & 0x40);
  const globalVflip = Boolean(attributes & 0x80);
  return values.map((tile, quadrant) => ({
    tile,
    x: (quadrant & 1) ^ Number(globalHflip),
    y: (quadrant >> 1) ^ Number(globalVflip),
    hflip: Boolean(descriptor & (1 << (quadrant + 3))) !== globalHflip,
    vflip: globalVflip,
    // 低两位选择身体，其上两位选择头部；调色板随图块一起翻转。
    palette: (attributes >> (quadrant < 2 ? 2 : 0)) & 0x03,
  }));
}

// @editor-module 场景角色形象与运动的共享浏览器渲染器
//
// `actor-visual.motions` 是场景、剧情舞台和角色页唯一的取帧权威。角色类型只引用
// motion_id 并附带 OAM 属性；消费端不得再从帧号连续性猜测“六帧动画”。运动明确分为：
// 单帧、无方向序列，以及四方向 × 两步（左右共用侧面帧，右向水平翻转）。
//
// 像素来自 `shared-chr-bank`。角色的三张帧表、tile delta、OAM 属性和调色板均由
// `actor-visual` 当前 working 正文提供，保存任一正文都会通过 identity 缓存自然失效。


const ACTOR_ENTRY_TYPE_SELECTOR = "type-selector";
const ACTOR_ENTRY_SCENE_OBJECT = "scene-object";
const ACTOR_MOTION_KINDS = new Set([
  ACTOR_MOTION_SINGLE,
  ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_DIRECTIONAL,
  ACTOR_MOTION_DIRECTIONAL_TAIL,
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

function integer$2(value, label, minimum, maximum) {
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
  const steps = integer$2(
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
      frameIndexes: raw.frame_indexes.map((value, frameIndex) => integer$2(
        value,
        `方向 ${id} 帧索引 ${frameIndex}`,
        0,
        5,
      )),
      oamAttributeOr: integer$2(
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
      const frames = raw.frame_ids.map((value, frameIndex) => integer$2(
        value,
        `角色运动 ${id} 帧 ${frameIndex}`,
        0,
        ACTOR_FRAME_COUNT - 1,
      ));
      const expected = kind === ACTOR_MOTION_SINGLE ? 1
        : kind === ACTOR_MOTION_DIRECTIONAL ? 6 : null;
      if ((expected !== null && frames.length !== expected)
          || (kind === ACTOR_MOTION_DIRECTIONAL_TAIL && frames.length !== 3)
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
    const id = integer$2(frame?.id, "角色帧 id", 0, ACTOR_FRAME_COUNT - 1);
    if (seenFrames.has(id)) throw new TypeError(`角色帧 id 重复：${id}`);
    seenFrames.add(id);
    for (const [target, name] of [[descriptors, "descriptor"], [tileA, "tile_a"], [tileB, "tile_b"]]) {
      let value;
      Object.defineProperty(target, id, {enumerable: true,
        get: () => value ??= integer$2(frame[name], `角色帧 ${id} ${name}`, 0, 0xff)});
    }
  }

  const deltas = byteRecords(document_.tile_deltas, "tile_deltas");
  if (deltas.length !== 16) throw new TypeError("tile_deltas 必须是 16 字节");
  const palettes = [];
  for (const record of document_.field_sprite_palettes || []) {
    const id = integer$2(record?.id, "场景精灵调色板 id", 0, 3);
    if (!Array.isArray(record.colors) || record.colors.length !== 4) {
      throw new TypeError(`场景精灵调色板 ${id} 必须是 4 色`);
    }
    palettes[id] = record.colors.map((value, index) => integer$2(
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
    const id = integer$2(raw?.id, `角色类型 ${index} id`, 0, 0x3e);
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
      get oamAttributes() {return oamAttributes ??= integer$2(
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
  const frameIndex = [ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(motion.kind)
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
function actorPoseForAppearance(
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
  const directional = [ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(appearance.motionKind);
  if (directional) {
    const selector = appearance.directionalSelector;
    const entry = selector?.directions?.get(direction)
      || selector?.directions?.get("down");
    if (!entry) throw new TypeError("角色形象缺少四方向选择器");
    frameIndex = entry.frameIndexes[modulo(step, entry.frameIndexes.length)];
    if (frameIndex >= appearance.frames.length) {
      throw new TypeError(`角色运动 ${appearance.motionId} 的 ${direction} 第 ${modulo(step, 2)} 步超出帧表`);
    }
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
    step: directional
      ? modulo(step, 2) : frameIndex,
    oamAttributes,
    palette: oamAttributes & 0x03,
    horizontalFlip: Boolean(oamAttributes & 0x40),
    verticalFlip: Boolean(oamAttributes & 0x80),
  };
}

/** 生成完整语义预览：普通行走显示下/上/左/右各两帧。 */
function actorPreviewPoses(appearance) {
  if ([ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONAL_TAIL].includes(appearance.motionKind)) {
    return PREVIEW_DIRECTION_IDS.flatMap(direction => [0, 1].filter(step =>
      appearance.directionalSelector.directions.get(direction).frameIndexes[step] < appearance.frames.length).map(step => (
      actorPoseForAppearance(appearance, {direction, step})
    )));
  }
  return appearance.frames.map((_, sequenceIndex) => actorPoseForAppearance(
    appearance, {sequenceIndex},
  ));
}

/** 从一份 `actor-visual` 正文生成角色类型目录；浏览器合同也走这条纯函数。 */
function actorAppearanceCatalogFromDocument(
  document_, {entryPoint = ACTOR_ENTRY_TYPE_SELECTOR} = {},
) {
  const recipe = buildRecipe(document_);
  return [...recipe.actorTypes.keys()].sort((left, right) => left - right)
    .map(id => actorAppearanceFromRecipe(recipe, id, entryPoint));
}

/** 从同一正文生成去重后的运动目录，不把动画帧冒充成独立形象。 */
function actorMotionCatalogFromDocument(document_) {
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
async function actorAppearanceCatalog(
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
function peekActorAppearance(
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
function actorSetBanks(pair, visuals = db.peekDocument('project.visuals', null)) {
  const id = integer$2(pair, "角色集 pair", 0, 0xff);
  const context = visuals?.actors?.sets?.find(row => Number(row.id) === id)
    || visuals?.metasprites?.contexts?.find(row => Number(row.pair) === id);
  const banks = context?.pattern_table?.banks;
  if (!Array.isArray(banks) || banks.length !== 4)
    throw new TypeError(`角色集 ${id} 缺少图案表上下文`);
  return banks.map((bank, index) => integer$2(bank, `角色集 ${id} 图案页 ${index}`, 0, 255));
}

/** 候选封面只取该类型的已发布消费上下文，未确认时返回 null。 */
function actorAppearanceThumbnail(appearance, visuals = db.peekDocument('project.visuals', null)) {
  const actors = visuals?.actors;
  const direct = actors?.special_assets.find(asset => asset.playback === 'single-frame-observed'
    && asset.context_pairs.length && asset.actor_type_ids.includes(appearance.id));
  const pose = actorPoseForAppearance(appearance, {direction: direct ? 'up' : 'down', step: 0});
  const entries = actors?.scene_actor_entries.filter(entry =>
    entry.records.some(record => record.actor_type === appearance.id));
  const sceneSets = actors?.sets.filter(set => set.scene_ids.some(sceneId =>
    entries.some(entry => entry.id === sceneId)));
  const vehicleSet = !sceneSets?.length && visuals.vehicle_selectors?.map_actor_types
    .some(record => record.actor_type === appearance.id)
    ? actors.sets.find(set => set.kind === 'world-map-runtime') : null;
  const pairs = [...new Set(sceneSets?.length ? sceneSets.map(set => set.id)
    : vehicleSet ? [vehicleSet.id]
    : [...entries.flatMap(entry => entry.context_pairs),
      ...actors.special_assets.filter(asset => asset.actor_type_ids.includes(appearance.id))
        .flatMap(asset => asset.context_pairs)])]
    .sort((left, right) => left - right);
  if (!pairs.length) return null;
  const set = actors.sets.find(item => item.id === pairs[0]);
  if (!set) throw new TypeError(`角色类型 ${appearance.id} 缺少角色图块集`);
  return {...pose, pair: set.id};
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
function actorAtlasImage(
  {tiles, recipe}, poses, scale = 4, paletteId = null,
) {
  const paletteIds = paletteId === null || paletteId === undefined
    ? [0, 1, 2, 3]
    : [integer$2(paletteId, "角色图集调色板", 0, 3)];
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
async function actorSetSources(pair) {
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
async function paintActorAtlasCanvases(root = document) {
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
async function actorSpriteSheetUrl(recipe) {
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
function actorAtlasCanvas({
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

var actorAtlas = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ACTOR_ENTRY_SCENE_OBJECT: ACTOR_ENTRY_SCENE_OBJECT,
  ACTOR_ENTRY_TYPE_SELECTOR: ACTOR_ENTRY_TYPE_SELECTOR,
  ACTOR_MOTION_DIRECTIONAL: ACTOR_MOTION_DIRECTIONAL,
  ACTOR_MOTION_DIRECTIONAL_TAIL: ACTOR_MOTION_DIRECTIONAL_TAIL,
  ACTOR_MOTION_DIRECTIONLESS: ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_SINGLE: ACTOR_MOTION_SINGLE,
  actorAppearanceCatalog: actorAppearanceCatalog,
  actorAppearanceCatalogFromDocument: actorAppearanceCatalogFromDocument,
  actorAppearanceThumbnail: actorAppearanceThumbnail,
  actorAtlasCanvas: actorAtlasCanvas,
  actorAtlasImage: actorAtlasImage,
  actorMotionCatalogFromDocument: actorMotionCatalogFromDocument,
  actorPoseForAppearance: actorPoseForAppearance,
  actorPreviewPoses: actorPreviewPoses,
  actorSetBanks: actorSetBanks,
  actorSetSources: actorSetSources,
  actorSpriteSheetUrl: actorSpriteSheetUrl,
  actorTiles: actorTiles,
  paintActorAtlasCanvases: paintActorAtlasCanvases,
  peekActorAppearance: peekActorAppearance
});

// @editor-module 场景角色绘制路径与当前像素。

const byteHex = value => `0x${Number(value).toString(16).toUpperCase().padStart(2, '0')}`;
const sourcesByDocument = new WeakMap();

function actorAppearanceContextForScene(scene) {
  const raw = scene?.header?.[15];
  return {pair: Number(scene?.id) === 0 ? 0x94
    : Number.isInteger(raw) && raw >= 0 && raw <= 255 ? raw & 0xfe : null,
    entryPoint: ACTOR_ENTRY_SCENE_OBJECT};
}

function sceneActorVisualDescriptor(record) {
  const marker = Number(record?.render_slot_marker || 0);
  const id = Number(record?.actor_type);
  if (marker === 0) {
    const appearance = peekActorAppearance(id, {entryPoint: ACTOR_ENTRY_SCENE_OBJECT});
    return {marker, source: 'actor-visual', kind: 'actor-motion',
      label: appearance?.motionLabel || `无有效角色运动 ${byteHex(id)}`, appearance};
  }
  return {marker, source: 'metasprite-record',
    kind: marker === 1 ? 'direct-frame' : 'generic-metasprite',
    label: `${marker === 1 ? '直接帧' : '通用 metasprite'} ${byteHex(id)}`, appearance: null};
}

async function sceneActorVisualRaster(record, scene) {
  const {pair} = actorAppearanceContextForScene(scene);
  if (pair === null || !record) return null;
  const [actorDocument, chrDocument, metaspriteDocument, visuals] = await Promise.all([
    db.getDocument('actor-visual'), db.getDocument('shared-chr-bank'), db.getDocument('metasprite-record'),
    db.getDocument('project.visuals'),
  ]);
  let cache = sourcesByDocument.get(chrDocument);
  if (!cache || cache.actorDocument !== actorDocument || cache.metaspriteDocument !== metaspriteDocument
      || cache.visuals !== visuals) {
    cache = {actorDocument, metaspriteDocument, visuals, actors: new Map(), metasprites: new Map()};
    sourcesByDocument.set(chrDocument, cache);
  }
  const descriptor = sceneActorVisualDescriptor(record);
  if (descriptor.kind === 'actor-motion') {
    if (!descriptor.appearance) return null;
    const pose = actorPoseForAppearance(descriptor.appearance,
      {direction: ['up', 'down', 'left', 'right'][Number(record.direction)] || 'down', step: 0});
    if (pose.frame === 0) return null;
    if (!cache.actors.has(pair)) cache.actors.set(pair, actorSetSources(pair));
    const {tiles, recipe} = await cache.actors.get(pair);
    const raster = createRaster(16, 16, null);
    for (const sprite of actorTiles(pose.frame, recipe, pose.oamAttributes)) {
      paintChrTile(raster.data, 16, sprite.x * 8, sprite.y * 8, tiles[sprite.tile],
        recipe.palettes[sprite.palette], {hflip: sprite.hflip, vflip: sprite.vflip, background: null});
    }
    return {...raster, offsetX: 0, offsetY: pose.screenOffsetY};
  }
  if (Number(record.actor_type) === 0) return null;
  if (!cache.metasprites.has(pair)) {
    const palettes = [...actorDocument.field_sprite_palettes].sort((a, b) => a.id - b.id)
      .flatMap(row => row.colors);
    cache.metasprites.set(pair, metaspriteContextSources(actorSetBanks(pair, visuals), palettes));
  }
  const sources = await cache.metasprites.get(pair);
  const rows = descriptor.kind === 'direct-frame' ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = rows.find(row => row.id === Number(record.actor_type));
  const sprites = item?.sprites?.filter(sprite => !sprite.transparentTile) || [];
  if (!sprites.length) return null;
  const minX = Math.min(...sprites.map(sprite => sprite.x));
  const minY = Math.min(...sprites.map(sprite => sprite.y));
  const width = Math.max(...sprites.map(sprite => sprite.x)) + 8 - minX;
  const height = Math.max(...sprites.map(sprite => sprite.y)) + 8 - minY;
  const raster = createRaster(width, height, null);
  for (const sprite of sprites) paintChrTile(raster.data, width, sprite.x - minX, sprite.y - minY,
    sources.tiles[sprite.tile], sources.palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
    {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip, background: null});
  return {...raster, offsetX: minX, offsetY: minY + 1};
}

// @editor-module 场景渐显按 NES 色号的亮度减量绘制。

const colors = new Map(nesPalette.map((rgb, index) => [rgb.join(","), index]));
const sheets = new Map();

// PRG $07E0A8–$07E0C8 将 $30 归为 $20，亮度减量越界时取 $0F。
function fieldPaletteColor(color, decrement) {
  const source = color === 0x30 ? 0x20 : color;
  const brightness = ((source & 0xf0) - decrement) & 0xff;
  return brightness < 0x40 ? brightness | (color & 0x0f) : 0x0f;
}

function paintFieldPalette(context, decrement, flash = false) {
  if (!decrement && !flash) return;
  const image = context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    if (!image.data[index + 3]) continue;
    const rgb = Array.from(image.data.slice(index, index + 3)).join(",");
    const color = flash && rgb === nesPalette[0x0f].join(",") ? 0x0f : colors.get(rgb);
    if (color === undefined) continue;
    // PRG $07E1C8–$07E1E0 保留 $0F，其余色号取下一档灰阶并将 $40 归为 $30。
    const gray = color === 0x0f ? 0x0f : Math.min(0x30, (color & 0xf0) + 0x10);
    image.data.set(nesPalette[flash ? gray : fieldPaletteColor(color, decrement)], index);
  }
  context.putImageData(image, 0, 0);
}

async function fieldPaletteSheetUrl(source, decrement) {
  if (!decrement) return source;
  const key = `${decrement}:${source}`;
  if (!sheets.has(key)) sheets.set(key, (async () => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    paintFieldPalette(context, decrement);
    return canvas.toDataURL();
  })());
  return sheets.get(key);
}

// @editor-module 可复用的二维格画布外壳与交互几何
//
// 这里只拥有画布尺寸、格坐标换算和逐格绘制循环。格子表示地图图块、战斗对象
// 布局还是别的领域数据，由调用方决定；图案解码、调色板、业务叠层和保存规则都
// 留在各自 owner 内。


const positiveInteger$1 = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`${label} 必须是正整数`);
  }
  return number;
};

function declaredGeometry({columns, rows, cellWidth, cellHeight}) {
  const normalizedCellWidth = positiveInteger$1(cellWidth, "格宽");
  const normalizedCellHeight = positiveInteger$1(cellHeight, "格高");
  const normalizedColumns = positiveInteger$1(columns, "列数");
  const normalizedRows = positiveInteger$1(rows, "行数");
  return {
    columns: normalizedColumns,
    rows: normalizedRows,
    cellWidth: normalizedCellWidth,
    cellHeight: normalizedCellHeight,
    width: normalizedColumns * normalizedCellWidth,
    height: normalizedRows * normalizedCellHeight,
  };
}

function additionalDataAttributes(data) {
  return Object.entries(data || {}).map(([key, value]) => {
    if (!/^[a-z][a-z0-9-]*$/u.test(key) || key.startsWith("tile-grid-")) {
      throw new TypeError(`二维格画布 data 属性无效：${key}`);
    }
    return ` data-${key}="${esc(value)}"`;
  }).join("");
}

/**
 * 输出领域无关的二维格 canvas。调用方只声明语义 owner、格数与显示尺寸；
 * 不把 tile 编号、bank、地址或编码宽度放进公共组件。
 */
function renderTileGridCanvas({
  id = "",
  owner,
  role = "grid",
  columns,
  rows,
  cellWidth,
  cellHeight = cellWidth,
  className = "",
  style = "",
  label = "二维格画布",
  readOnly = false,
  data = {},
} = {}) {
  const geometry = declaredGeometry({columns, rows, cellWidth, cellHeight});
  if (!String(owner || "").trim()) throw new TypeError("二维格画布缺少 owner");
  return `<canvas${id ? ` id="${esc(id)}"` : ""}${
    className ? ` class="${esc(className)}"` : ""
  } width="${geometry.width}" height="${geometry.height}"${
    style ? ` style="${esc(style)}"` : ""
  } aria-label="${esc(label)}"${additionalDataAttributes(data)}
    data-tile-grid-component="tile-grid/v1"
    data-tile-grid-owner="${esc(owner)}"
    data-tile-grid-role="${esc(role)}"
    data-tile-grid-columns="${geometry.columns}"
    data-tile-grid-rows="${geometry.rows}"
    data-tile-grid-cell-width="${geometry.cellWidth}"
    data-tile-grid-cell-height="${geometry.cellHeight}"
    data-tile-grid-read-only="${readOnly ? "true" : "false"}"></canvas>`;
}

/** 只从公共组件声明读取几何，领域代码不再各写一份固定除数。 */
function tileGridGeometry(canvas) {
  if (!canvas?.dataset) throw new TypeError("二维格画布不存在");
  const geometry = declaredGeometry({
    columns: canvas.dataset.tileGridColumns,
    rows: canvas.dataset.tileGridRows,
    cellWidth: canvas.dataset.tileGridCellWidth,
    cellHeight: canvas.dataset.tileGridCellHeight,
  });
  if (Number(canvas.width) !== geometry.width || Number(canvas.height) !== geometry.height) {
    throw new TypeError("二维格画布尺寸与格声明不一致");
  }
  return geometry;
}

function contextGeometry(context, options) {
  const explicit = [
    options.columns,
    options.rows,
    options.cellWidth,
    options.cellHeight,
  ].every(value => value !== undefined);
  return explicit
    ? declaredGeometry(options)
    : tileGridGeometry(options.canvas || context?.canvas);
}

/** 在已有领域画面上叠加公共格线；不参与格内内容的解释。 */
function paintTileGridLines(context, {
  canvas = null,
  columns,
  rows,
  cellWidth,
  cellHeight,
  color = "rgba(216,242,49,.28)",
  lineWidth = 0.5,
} = {}) {
  if (!context) throw new TypeError("二维格画布缺少绘图上下文");
  const geometry = contextGeometry(context, {
    canvas, columns, rows, cellWidth, cellHeight,
  });
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  for (let column = 0; column <= geometry.columns; column += 1) {
    const x = column * geometry.cellWidth;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, geometry.height);
    context.stroke();
  }
  for (let row = 0; row <= geometry.rows; row += 1) {
    const y = row * geometry.cellHeight;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(geometry.width, y);
    context.stroke();
  }
  return geometry;
}

/**
 * 领域提供单格 painter，公共组件只负责遍历和坐标。适合静态矩阵预览，也能作为
 * 后续带 owner 上下文的逐格编辑画布底座。
 */
function paintTileGridCells(canvas, paintCell, {clear = true} = {}) {
  if (typeof paintCell !== "function") throw new TypeError("二维格画布缺少单格 painter");
  const geometry = tileGridGeometry(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new TypeError("二维格画布无法取得绘图上下文");
  if (clear) context.clearRect(0, 0, geometry.width, geometry.height);
  let painted = 0;
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintCell({
        canvas,
        context,
        column,
        row,
        x: column * geometry.cellWidth,
        y: row * geometry.cellHeight,
        width: geometry.cellWidth,
        height: geometry.cellHeight,
      });
      painted += 1;
    }
  }
  canvas.dataset.tileGridPaintedCells = String(painted);
  return painted;
}

// @editor-module 管理可丢弃的媒体预览缓存。
// 删除缓存后，媒体预览由当前字段对象重绘。
// 缓存不进入项目导出与构建输入。

const PREVIEW_CACHE_DATABASE_NAME = "metalmaxcn-preview-cache";
const PREVIEW_CACHE_DATABASE_VERSION = 3;
const PREVIEW_CACHE_STORE = "previews";
const PREVIEW_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const PREVIEW_CACHE_MAX_ENTRIES = 512;

const INDEX_BY_PROJECT = "by_project";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return result;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || new Error("preview cache IndexedDB request failed"),
    );
  });
}

function transactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error || new Error("preview cache transaction aborted"),
    );
    transaction.onerror = () => {
      // transaction abort owns the rejection so the original IDB error wins.
    };
  });
}

async function transact(database, mode, callback) {
  const transaction = database.transaction(PREVIEW_CACHE_STORE, mode);
  const completion = transactionCompletion(transaction);
  try {
    const result = await callback(transaction.objectStore(PREVIEW_CACHE_STORE));
    await completion;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch (_abortError) {
      // The request may already have aborted the transaction.
    }
    try {
      await completion;
    } catch (_transactionError) {
      // Preserve the more specific callback/request error.
    }
    throw error;
  }
}

function openPreviewCacheDatabase({
  name = PREVIEW_CACHE_DATABASE_NAME,
  indexedDBFactory = globalThis.indexedDB,
} = {}) {
  if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable for preview cache"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDBFactory.open(name, PREVIEW_CACHE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains("package_json")) {
        database.deleteObjectStore("package_json");
      }
      if (!database.objectStoreNames.contains(PREVIEW_CACHE_STORE)) {
        const store = database.createObjectStore(PREVIEW_CACHE_STORE, {
          keyPath: ["project_id", "cache_key"],
        });
        store.createIndex(INDEX_BY_PROJECT, "project_id", {unique: false});
      }
    };
    request.onerror = () => {
      settled = true;
      reject(request.error || new Error("failed to open preview cache"));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("preview cache upgrade is blocked by another tab"));
    };
    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

function copyRecord(record) {
  if (!record) return null;
  const {data, ...metadata} = record;
  return {...metadata, data};
}

class IndexedDbPreviewCache {
  static async open(options = {}) {
    const database = await openPreviewCacheDatabase(options);
    return new IndexedDbPreviewCache(database);
  }

  constructor(database) {
    if (!database || typeof database.transaction !== "function") {
      throw new TypeError("preview cache requires an open IDBDatabase");
    }
    this.database = database;
  }

  close() {
    this.database.close();
  }

  async get(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      const record = await requestResult(store.get([project, key]));
      if (!record) return null;
      record.last_accessed_at = Date.now();
      store.put(record);
      return copyRecord(record);
    });
  }

  async put(projectId, cacheKey, data, {
    width,
    height,
    mediaType = "image/png",
  } = {}) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    if (!(data instanceof Blob)) {
      throw new TypeError("preview cache data must be a Blob");
    }
    const now = Date.now();
    const record = {
      schema: "metalmaxcn.derived-preview/v1",
      project_id: project,
      cache_key: key,
      media_type: data.type || mediaType,
      width: positiveInteger(width, "width"),
      height: positiveInteger(height, "height"),
      byte_length: data.size,
      created_at: now,
      last_accessed_at: now,
      data,
    };
    return transact(this.database, "readwrite", async store => {
      store.put(record);
      return copyRecord(record);
    });
  }

  async delete(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      store.delete([project, key]);
    });
  }

  async deleteProject(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readwrite", async store => {
      const index = store.index(INDEX_BY_PROJECT);
      const keys = await requestResult(index.getAllKeys(project));
      keys.forEach(key => store.delete(key));
      return keys.length;
    });
  }

  async stats(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readonly", async store => {
      const records = await requestResult(store.index(INDEX_BY_PROJECT).getAll(project));
      return records.reduce((summary, record) => ({
        entries: summary.entries + 1,
        bytes: summary.bytes + Math.max(0, Number(record.byte_length) || 0),
        lastAccessedAt: Math.max(
          summary.lastAccessedAt,
          Number(record.last_accessed_at) || Number(record.created_at) || 0,
        ),
      }), {entries: 0, bytes: 0, lastAccessedAt: 0});
    });
  }

  async prune({
    maxBytes = PREVIEW_CACHE_MAX_BYTES,
    maxEntries = PREVIEW_CACHE_MAX_ENTRIES,
  } = {}) {
    const byteLimit = positiveInteger(maxBytes, "maxBytes");
    const entryLimit = positiveInteger(maxEntries, "maxEntries");
    return transact(this.database, "readwrite", async store => {
      const records = await requestResult(store.getAll());
      records.sort((left, right) =>
        Number(right.last_accessed_at || 0) - Number(left.last_accessed_at || 0)
        || Number(right.created_at || 0) - Number(left.created_at || 0));
      let keptEntries = 0;
      let keptBytes = 0;
      let deletedEntries = 0;
      for (const record of records) {
        const size = Math.max(0, Number(record.byte_length) || 0);
        const keep = keptEntries < entryLimit && keptBytes + size <= byteLimit;
        if (keep) {
          keptEntries += 1;
          keptBytes += size;
        } else {
          store.delete([record.project_id, record.cache_key]);
          deletedEntries += 1;
        }
      }
      return {keptEntries, keptBytes, deletedEntries};
    });
  }
}

let sharedCachePromise = null;

function announcePreviewCacheChange(projectId = null) {
  if (typeof globalThis.dispatchEvent !== "function"
      || typeof globalThis.CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent("mmeditor:preview-cache-change", {
    detail: {projectId},
  }));
}

async function sharedCache() {
  if (!sharedCachePromise) {
    sharedCachePromise = IndexedDbPreviewCache.open().then(async cache => {
      await cache.prune();
      return cache;
    }).catch(() => null);
  }
  return sharedCachePromise;
}

/** 缓存故障永远退化成 miss，不能让派生视图阻断编辑器。 */
async function getPreviewCacheEntry(projectId, cacheKey) {
  try {
    return await (await sharedCache())?.get(projectId, cacheKey) || null;
  } catch (_error) {
    return null;
  }
}

async function putPreviewCacheEntry(projectId, cacheKey, data, metadata) {
  try {
    const result = await (await sharedCache())?.put(projectId, cacheKey, data, metadata) || null;
    if (result) announcePreviewCacheChange(projectId);
    return result;
  } catch (_error) {
    return null;
  }
}

async function deletePreviewCacheEntry(projectId, cacheKey) {
  try {
    await (await sharedCache())?.delete(projectId, cacheKey);
    announcePreviewCacheChange(projectId);
  } catch (_error) {
    // A corrupt cache entry is still only a cache miss.
  }
}

async function deletePreviewCacheProject(projectId) {
  try {
    const deleted = await (await sharedCache())?.deleteProject(projectId) || 0;
    announcePreviewCacheChange(projectId);
    return deleted;
  } catch (_error) {
    return 0;
  }
}

async function previewCacheProjectStats(projectId) {
  try {
    return await (await sharedCache())?.stats(projectId) || {
      entries: 0,
      bytes: 0,
      lastAccessedAt: 0,
    };
  } catch (_error) {
    return null;
  }
}

async function prunePreviewCache(options) {
  try {
    const result = await (await sharedCache())?.prune(options) || null;
    if (result?.deletedEntries) announcePreviewCacheChange(null);
    return result;
  } catch (_error) {
    return null;
  }
}

// @editor-module 调色板运行时字段对象的场景 CHR 动画预览。

function fieldChrAnimationRecipe(document) {
  return document?.field_chr_animation || null;
}

function fieldChrAnimationDuration(recipe, scene) {
  if (Number(scene?.id) === 0) return Number(recipe?.world?.step_frames) || 0;
  if (!recipe || !sceneFieldChrAnimation(scene)) return 0;
  return Number(scene.id) === recipe.slow_scene_id
    ? recipe.slow_step_frames : recipe.step_frames;
}

function fieldChrAnimationMask(recipe, scene) {
  return Number(scene?.id) === 0 ? recipe.world.phase_mask : recipe.phase_mask;
}

function advanceFieldChrAnimation(animation, recipe, scene, step) {
  const duration = fieldChrAnimationDuration(recipe, scene);
  if (!duration) return;
  animation.timer += 1;
  if (animation.timer < duration) return;
  animation.timer = 0;
  animation.phase = (animation.phase + step) & fieldChrAnimationMask(recipe, scene);
}

const loopClocks = new WeakMap();

function fieldChrAnimationPlaybackPhase(compiled, frameIndex, rawFrame) {
  const snapshot = compiled.frames[frameIndex];
  if (!snapshot?.backgroundAnimationClock?.duration) return snapshot?.backgroundAnimationPhase;
  const start = compiled.loopStart;
  if (start == null || rawFrame < compiled.duration) return snapshot.backgroundAnimationPhase;
  let profile = loopClocks.get(compiled);
  if (!profile) {
    const cycle = compiled.frames.slice(start);
    const first = cycle.find(frame => frame.backgroundAnimationClock);
    const clock = {...(first?.backgroundAnimationVisibleClock || first?.backgroundAnimationClock)};
    const phases = [], seen = new Map();
    while (!seen.has(clock.timer)) {
      seen.set(clock.timer, phases.length);
      for (const frame of cycle) {
        phases.push(clock.phase);
        const tick = frame.backgroundAnimationVisibleClock || frame.backgroundAnimationClock;
        if (!tick?.duration) continue;
        clock.timer += 1;
        if (clock.timer < tick.duration) continue;
        clock.timer = 0;
        clock.phase = (clock.phase + tick.step) & tick.mask;
      }
    }
    const repeat = seen.get(clock.timer);
    profile = {phases, repeat, length: phases.length - repeat,
      delta: clock.phase - phases[repeat], mask: clock.mask};
    loopClocks.set(compiled, profile);
  }
  const offset = rawFrame - start;
  if (offset < profile.phases.length) return profile.phases[offset];
  const cycles = Math.floor((offset - profile.repeat) / profile.length);
  return (profile.phases[profile.repeat + (offset - profile.repeat) % profile.length]
    + cycles * profile.delta) & profile.mask;
}

function fieldChrAnimationBanks(scene, recipe, phase) {
  const banks = scene.render?.mmc3_banks;
  if (phase == null || !recipe || !sceneFieldChrAnimation(scene)) return banks;
  const result = [...banks];
  const firstBank = Number(scene.id) === recipe.first_bank_scene_id;
  result[firstBank ? 0 : 2] = recipe.banks[firstBank
    ? (phase & recipe.phase_mask) >> 1 : phase % recipe.banks.length];
  return result;
}

function worldChrAnimationBank(recipe, phase) {
  return phase == null || !recipe?.world ? null
    : recipe.world.banks[phase & recipe.world.phase_mask];
}

function worldRegionalChrAnimationBanks(recipe, banks, camera, phases) {
  const result = [...banks];
  for (const region of recipe?.world?.regional || []) {
    if (camera.x < region.min_x || camera.x >= region.max_x
        || camera.y < region.min_y || camera.y >= region.max_y) continue;
    const phase = phases?.[region.phase_slot];
    if (!Number.isInteger(phase) || !Number.isInteger(region.banks[phase]))
      throw new TypeError('世界地图区域动画缺少有效相位');
    result[region.register] = region.banks[phase];
  }
  return result;
}

// @editor-module 场景视觉字段对象提供普通场景、世界地图及剧情引用的预览与可点选单元。
// Browser scene raster sources.  Everything here comes from semantic JSON:
// scene:* supplies metatiles/palette/bank selection and shared-chr-bank supplies
// the editable NES 2bpp planes.  No ROM baseline, build result, or package
// binary is a valid preview dependency.


const renderersByScene = new WeakMap();
const worldRenderersByScene = new WeakMap();

// 世界地图的四组地理 CHR 不是简单的四象限，边界来自渲染器 $AF50。
// 与 `mm_scene._world_zone` 必须逐格一致。
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 256;
const WORLD_ZONE_NAMES = Object.freeze(
  ["northwest", "northeast", "southwest", "southeast"]);
const SCENE_THUMBNAIL_CACHE_SCHEMA = "scene-thumbnail/v2";
const sceneThumbnailSourceDigests = new WeakMap();
const sceneThumbnailBankDigests = new WeakMap();

/** `mm_scene._world_zone` 的镜像：按 metatile 坐标选地理 CHR 组。 */
function worldZoneAt(x, y) {
  if (x < 0x80 && y < 0x91) return "northwest";
  if (y < 0x61) return "northeast";
  if (x < 0x60) return "southwest";
  return "southeast";
}

function integer$1(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  }
  return result;
}

function sceneResourceId(sceneId) {
  const id = integer$1(sceneId, "scene_id", 0, 0xff);
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
    runtime_map: scene?.runtime_map || null,
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

function sceneThumbnailDigest(cache, object, value) {
  // 字段视图须按当前值取快照，同一对象原地编辑后须重新计算摘要。
  const source = JSON.stringify(value);
  const previous = cache.get(object);
  if (previous?.source === source) return previous.digest;
  const digest = sha256Text(canonicalJsonStringify(JSON.parse(source)));
  cache.set(object, {source, digest});
  return digest;
}

async function sceneThumbnailCacheKey(
  sceneId,
  {cellSize, width, height, includeRuntime, crop},
) {
  const document_ = await loadSceneResourceDocumentById(sceneId);
  const scene = document_?.scene || document_;
  if (!scene) return null;
  const overlays = includeRuntime ? sceneRuntimeMetatileOverlays(scene, document_?.logic) : [];
  return db.reusePreviewProjection(SCENE_THUMBNAIL_CACHE_SCHEMA,
    [scene, regionRevisions.get(scene) || 0, cellSize, width, height,
      includeRuntime, crop, canonicalJsonStringify(overlays)], async () => {
      const projected = await projectSceneMetatiles(scene);
      const visualDocument = await db.getDocument("shared-chr-bank", null);
      if (!visualDocument || !Array.isArray(visualDocument.banks)) return null;
      const sceneDigest = await sceneThumbnailDigest(
        sceneThumbnailSourceDigests, scene, sceneThumbnailSource(projected),
      );
      if (!sceneDigest) return null;
      const bankDigests = [];
      for (const id of sceneThumbnailChrBankIds(projected)) {
        const bank = visualDocument.banks.find(item => Number(item?.id) === id);
        if (!bank) return null;
        const digest = await sceneThumbnailDigest(sceneThumbnailBankDigests, bank, bank);
        if (!digest) return null;
        bankDigests.push([id, digest]);
      }
      const digest = await sha256Text(canonicalJsonStringify({
        schema: SCENE_THUMBNAIL_CACHE_SCHEMA,
        scene_id: Number(sceneId),
        cell_size: Number(cellSize),
        width: Number(width),
        height: Number(height),
        include_runtime: includeRuntime,
        runtime_overlays: overlays,
        crop: crop || null,
        scene_sha256: sceneDigest,
        chr_banks: bankDigests,
      }));
      return digest ? `${SCENE_THUMBNAIL_CACHE_SCHEMA}:${digest}` : null;
    }, {sources: [{kind: "field", id: sceneResourceId(sceneId)}]});
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
async function loadSceneResourceDocumentById(sceneId) {
  const id = integer$1(sceneId, "scene_id", 0, 0xff);
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
    integer$1(value, `render.mmc3_banks[${index}]`, 0, 0xff));
  const palette = scene.render?.background_palette;
  if (palette?.format !== "nes-system-palette-indices/v1" ||
      !Array.isArray(palette.colors) || palette.colors.length !== 16) {
    throw new TypeError("普通场景缺少 16 色 JSON 背景 palette");
  }
  const colors = Uint8Array.from(palette.colors.map((value, index) =>
    integer$1(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
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
    definition.forEach((value, quadrant) => integer$1(
      value,
      `metatile_definitions[${metatileId}][${quadrant}]`,
      0,
      0xff,
    ));
  });
  scene.metatile_palette_ids.forEach((value, metatileId) => integer$1(
    value, `metatile_palette_ids[${metatileId}]`, 0, 3,
  ));
  return {banks, palette: colors};
}

/** Decode one 8×8 NES 2bpp tile from a composed 4 KiB pattern table. */
function decodeSceneTile(patternTable, tileId) {
  if (!(patternTable instanceof Uint8Array) || patternTable.length !== 0x1000) {
    throw new TypeError("场景 pattern table 必须是 4 KiB Uint8Array");
  }
  const id = integer$1(tileId, "tile_id", 0, 0xff);
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
  const id = integer$1(metatileId, "metatile_id", 0, Math.max(0, count - 1));
  const data = new Uint8ClampedArray(16 * 16 * 4);
  const paletteId = integer$1(
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
async function loadSceneMetatileRenderer(scene, {animationPhase = null,
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
    integer$1(value, `render.background_palette.colors[${index}]`, 0, 0x3f)));
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
      integer$1(value, `render.zones.${name}.mmc3_banks[${index}]`, 0, 0xff)));
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
async function loadWorldMetatileRenderer(scene, {animationPhase = null,
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

function paintSceneMetatileCells(context, scene, renderer, cells, {zone = null} = {}) {
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
function paintSceneMap(
  context,
  scene,
  renderer,
  {cellSize = 16, region = null, wrap = false} = {},
) {
  if (!context || typeof context.drawImage !== "function") {
    throw new TypeError("场景绘制需要 Canvas 2D context");
  }
  const size = integer$1(cellSize, "cellSize", 1, 16);
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
  const size = integer$1(cellSize, "cellSize", 1, 16);
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
function paintSceneRuntimeMap(
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
function paintSceneMapCell(
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
  const size = integer$1(cellSize, "cellSize", 1, 16);
  const {width, height} = sceneMapSize(scene);
  const cellX = integer$1(x, "scene_x", 0, width - 1);
  const cellY = integer$1(y, "scene_y", 0, height - 1);
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

function invalidateSceneSurface(scene) {
  if (!scene || typeof scene !== "object") return;
  surfacesByScene.delete(scene);
  runtimeSurfacesByScene.delete(scene);
  regionRevisions.set(scene, (regionRevisions.get(scene) || 0) + 1);
  sceneThumbnailSourceDigests.delete(scene);
}

async function loadSceneSurface(scene, {cellSize = 16, animationPhase = null} = {}) {
  if (!scene || typeof scene !== "object") return null;
  const size = integer$1(cellSize, "cellSize", 1, 16);
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
  const size = integer$1(cellSize, "cellSize", 1, 16);
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
async function loadSceneSurfaceById(
  sceneId,
  {includeRuntime = true, ...options} = {},
) {
  const id = integer$1(sceneId, "scene_id", 0, 0xff);
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
async function loadSceneRegionById(sceneId, {
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
async function loadSceneViewportById(sceneId, {
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
function paintSceneLogicMarkers(context, objects, {width, height, cellSize = 16, actorImages = false} = {}) {
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

function paintSceneBoundaryMarkers(context, records, {width, height, cellSize = 16} = {}) {
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
async function paintSceneThumbnailCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-scene-thumb]")].filter(canvas => {
    const menu = canvas.closest(".module-reference-picker-menu");
    return !menu || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
  await paintSceneThumbnailBatch(canvases);
}

/** 列表只等首屏；滚动和过滤后进入视口的行继续复用同一个 painter。 */
function paintVisibleSceneThumbnailCanvases(root, {isCurrent}) {
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
      const cacheOptions = fixedSize && {cellSize, ...fixedSize,
        includeRuntime: !mapContent, crop: canvas.dataset.sceneThumbCrop || null};
      const projectId = sceneThumbnailCacheProjectId();
      let cacheKey = null;
      if (cacheOptions) {
        try {
          cacheKey = await sceneThumbnailCacheKey(
            sceneId,
            cacheOptions,
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
        // 异步绘制期间依赖改变时不得把图像写入旧键。
        const currentKey = await sceneThumbnailCacheKey(sceneId, cacheOptions);
        const stored = blob && currentKey === cacheKey && await putPreviewCacheEntry(
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
async function loadStorySceneMetatileRenderer(context, options = {}) {
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

// @editor-module 全站场景预览的画布、视口、选点与叠加层。

const previews = new WeakMap();
const paintRevisions = new WeakMap();
const previewRequests = new WeakMap();

const scenePreviewControls = canvasViewportControls;
function sceneAnnotationsMarkup(annotations = []) {
  return annotations.map(({kind, x, y, width, height, label = ''}) => {
    if (!['point', 'area'].includes(kind) || !Number.isFinite(x) || !Number.isFinite(y)
        || kind === 'area' && (!(width > 0) || !(height > 0)))
      throw new TypeError('场景叠加层坐标无效');
    return `<span class="${kind === 'point' ? 'scene-position-point' : 'scene-point-marker'}"
      data-scene-annotation="${kind}" data-scene-x="${x}" data-scene-y="${y}"
      ${kind === 'area' ? `data-scene-width="${width}" data-scene-height="${height}"` : ''}
      aria-label="${esc(label)}"></span>`;
  }).join('');
}
const scenePreviewCanvasMarkup = options => renderTileGridCanvas({owner: 'scene-header-map',
  role: 'map', cellWidth: 16, ...options});

function scenePreviewMarkup({label = '场景预览', canvasAttributes = '', height = 240,
  viewportClassName = '', surfaceClassName = ''} = {}) {
  return `<div class="scene-preview" data-scene-preview>
    <div class="scene-preview-toolbar">${scenePreviewControls('场景缩放')}
      <label class="check"><input type="checkbox" data-scene-preview-grid> 网格</label></div>
    <div class="scene-preview-viewport ${esc(viewportClassName)}" data-scene-preview-viewport tabindex="0" role="region"
      aria-label="${esc(label)}" style="--scene-preview-height:${Number(height)}px">
      <div class="scene-preview-surface ${esc(surfaceClassName)}" data-scene-preview-surface data-canvas-viewport-stack>
        <canvas aria-label="${esc(label)}" ${canvasAttributes}></canvas>
        <span data-scene-preview-annotations aria-hidden="true"></span>
        <span class="scene-point-marker" data-scene-preview-point hidden aria-hidden="true"></span>
      </div>
    </div>
  </div>`;
}

function scenePreviewController(canvas) { return previews.get(canvas); }

function bindScenePreview({root, canvas = root?.querySelector('canvas'),
  viewport = root?.querySelector('[data-scene-preview-viewport]'),
  surface = root?.querySelector('[data-scene-preview-surface]') || canvas,
  controls = root, geometry = () => ({width: canvas.width / 16, height: canvas.height / 16, cellSize: 16}),
  onSelect = null, onHover = null, brush = null, onObjectSelect = null, objectAttribute = 'scenePreviewObject',
  mapExtension = null, onMapError = null, ...options} = {}) {
  if (!canvas || !viewport) return null;
  const existing = previews.get(canvas);
  if (existing) { existing.setCallbacks({onSelect, onHover, brush, onObjectSelect}); return existing; }
  let callbacks = {onSelect, onHover, brush, onObjectSelect};
  let painting = null;
  const listeners = [];
  const listen = (node, name, callback) => {
    node.addEventListener(name, callback);
    listeners.push(() => node.removeEventListener(name, callback));
  };
  const extension = mapExtension ? {viewport, screen: surface, canvas: mapExtension,
    dimensions: {viewportWidth: 256, viewportHeight: 240}, snapshot: null, onError: onMapError,
    isCurrent: options.isCurrent || (() => viewport.isConnected)} : null;
  const onLayout = options.onLayout;
  const controller = bindCanvasViewport({viewport, surface, controls, size: () => canvas,
    sizeElement: canvas, ...options, onLayout: () => {
    onLayout?.();
    if (extension) {
      extension.width = viewport.clientWidth;
      extension.height = viewport.clientHeight;
      paintPreviewMapExtension(extension);
    }
  }});
  const cell = event => scenePreviewCellFromPointer(canvas, event, geometry());
  listen(viewport, 'pointerdown', () => viewport.focus({preventScroll: true}));
  listen(canvas, 'click', event => {
    if (!callbacks.onSelect) return;
    const point = cell(event); if (point) callbacks.onSelect(point, event);
  });
  listen(canvas, 'pointermove', event => {if (callbacks.onHover) callbacks.onHover(cell(event), event);});
  listen(canvas, 'pointerleave', event => callbacks.onHover?.(null, event));
  const stopPainting = event => {
    if (painting === null || event?.pointerId != null && event.pointerId !== painting) return;
    const pointerId = painting;
    painting = null;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    callbacks.brush?.end?.();
  };
  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || !callbacks.brush?.enabled()) return;
    const point = cell(event);
    if (!point) return;
    painting = event.pointerId;
    canvas.setPointerCapture(painting);
    callbacks.brush.begin?.(point, event);
    callbacks.brush.paint(point, event);
  });
  listen(canvas, 'pointermove', event => {
    if (event.pointerId !== painting) return;
    if ((event.buttons & 1) === 0 || !callbacks.brush?.enabled()) {stopPainting(event); return;}
    const point = cell(event);
    if (point) callbacks.brush.paint(point, event);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, name, stopPainting);
  const selectObject = event => {
    const object = event.target.closest?.('[data-' + objectAttribute.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ']');
    if (object) callbacks.onObjectSelect?.(object.dataset[objectAttribute], event);
  };
  listen(viewport, 'click', selectObject);
  listen(viewport, 'keydown', event => {
    if (!['Enter', ' '].includes(event.key) || !callbacks.onObjectSelect) return;
    event.preventDefault(); selectObject(event);
  });
  let lastDrawing = null;
  const grid = root?.querySelector('[data-scene-preview-grid]');
  if (grid) listen(grid, 'change', () => {if (lastDrawing) void preview.draw(lastDrawing);});
  const preview = {...controller, cell,
    setCallbacks: next => {callbacks = {...callbacks, ...next};},
    centerCell: (x, y) => controller.center((x + .5) * (geometry().cellSize || 16),
      (y + .5) * (geometry().cellSize || 16)),
    draw: drawing => {lastDrawing = drawing; return paintScenePreview(canvas, {...drawing,
      grid: grid ? grid.checked : drawing.grid});},
    setMapExtension: (snapshot, dimensions) => {
      if (!extension) return;
      extension.snapshot = snapshot; extension.dimensions = dimensions;
      paintPreviewMapExtension(extension);
    },
    invalidateMapExtension: () => {
      if (!extension) return;
      extension.revision = (extension.revision || 0) + 1;
      extension.key = null;
    },
    destroy: () => {stopPainting(); listeners.forEach(remove => remove()); controller.destroy(); previews.delete(canvas);},
  };
  previews.set(canvas, preview);
  return preview;
}

function paintLogic(context, drawing) {
  if (!drawing.markers && !drawing.boundaries) return;
  const dimensions = {width: Number(drawing.scene.width), height: Number(drawing.scene.height),
    cellSize: drawing.cellSize || 16, actorImages: drawing.actorImages || false};
  paintSceneLogicMarkers(context, drawing.markers || [], dimensions);
  paintSceneBoundaryMarkers(context, drawing.boundaries || [], dimensions);
}

function paintSceneGrid(context, geometry = {}) {
  paintTileGridLines(context, {...geometry, color: 'rgba(0,0,0,.65)', lineWidth: 2});
  paintTileGridLines(context, {...geometry, color: 'rgba(255,255,255,.65)', lineWidth: 1});
}

function paintScenePreview(canvas, drawing = {}) {
  const revision = (paintRevisions.get(canvas) || 0) + 1;
  paintRevisions.set(canvas, revision);
  const {scene, logic, renderer, surface, raster, bounds, cellSize = 16} = drawing;
  const width = raster?.width || surface?.width || (bounds?.width ?? scene?.width) * cellSize;
  const height = raster?.height || surface?.height || (bounds?.height ?? scene?.height) * cellSize;
  if (!width || !height) return Promise.resolve();
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.dataset.tileGridColumns = width / cellSize;
  canvas.dataset.tileGridRows = height / cellSize;
  canvas.dataset.tileGridCellWidth = cellSize;
  canvas.dataset.tileGridCellHeight = cellSize;
  const context = canvas.getContext('2d');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  if (raster) context.putImageData(new ImageData(raster.data, width, height), 0, 0);
  else if (surface) {
    const scroll = ((Number(drawing.scrollY || 0) % height) + height) % height;
    context.drawImage(surface, 0, -scroll);
    if (scroll) context.drawImage(surface, 0, height - scroll);
    if (drawing.paletteDecrement || drawing.backgroundFlash)
      paintFieldPalette(context, drawing.paletteDecrement || 0, drawing.backgroundFlash || false);
  } else if (renderer) {
    if (bounds) context.translate(-bounds.x * cellSize, -bounds.y * cellSize);
    const options = {cellSize, visibleLayers: drawing.visibleLayers, actionOverlays: drawing.actionOverlays || [],
      ...(bounds ? {region: {x: bounds.x * cellSize, y: bounds.y * cellSize, width, height}} : {})};
    if (drawing.runtime === false) paintSceneMap(context, scene, renderer, options);
    else paintSceneRuntimeMap(context, scene, logic, renderer, options);
  }
  if (drawing.cells?.length && renderer) {
    context.save();
    if (surface) context.translate(-Number(drawing.cameraX || 0) * cellSize, -Number(drawing.cameraY || 0) * cellSize);
    paintSceneMetatileCells(context, scene, renderer, drawing.cells);
    context.restore();
  }
  if (drawing.grid) {
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    paintSceneGrid(context);
    context.restore();
  }
  if (drawing.encounters) paintPreviewEncounterZones(context, drawing.encounters, scene);
  if (drawing.rewrites) paintPreviewRewriteRegions(context, drawing.rewrites, drawing.selectedRewrite);
  paintLogic(context, drawing);
  const point = drawing.focusPoint;
  const focusBounds = drawing.focusBounds || scene;
  if (point && point[0] >= 0 && point[1] >= 0 && point[0] < focusBounds.width && point[1] < focusBounds.height) {
    context.strokeStyle = '#fff'; context.lineWidth = 3;
    context.strokeRect(point[0] * cellSize + 1, point[1] * cellSize + 1, cellSize - 2, cellSize - 2);
  }
  const actors = drawing.actors || [];
  // 角色图层结束后重画对象标记，空角色图层保持同一顺序。
  if (!actors.length && !drawing.actorLayer) return Promise.resolve();
  const connected = canvas.isConnected;
  canvas.dataset.sceneActorsPainted = 'pending';
  return Promise.all(actors.map(async actor => ({...actor,
    raster: actor.raster || await sceneActorVisualRaster(actor.record, scene)}))).then(rows => {
    if (paintRevisions.get(canvas) !== revision || connected && !canvas.isConnected) return;
    for (const {raster, x, y} of rows) {
      if (!raster) continue;
      const image = document.createElement('canvas');
      blitRaster(image, raster);
      context.drawImage(image, (x - Number(drawing.cameraX || 0)) * cellSize + raster.offsetX,
        (y - Number(drawing.cameraY || 0)) * cellSize + raster.offsetY);
    }
    paintLogic(context, drawing);
    canvas.dataset.sceneActorsPainted = '1';
  }).catch(error => {
    if (paintRevisions.get(canvas) === revision) canvas.dataset.sceneActorsPainted = 'error';
    throw error;
  });
}

function paintScenePreviewCell(canvas, scene, renderer, x, y, {grid = false} = {}) {
  const geometry = tileGridGeometry(canvas);
  const context = canvas.getContext('2d');
  if (!paintSceneMapCell(context, scene, renderer, x, y) || !grid) return;
  const cell = document.createElement('canvas');
  cell.width = geometry.cellWidth; cell.height = geometry.cellHeight;
  const drawing = cell.getContext('2d');
  paintSceneMapCell(drawing, scene, renderer, x, y, {targetX: 0, targetY: 0});
  paintSceneGrid(drawing, {columns: 1, rows: 1,
    cellWidth: geometry.cellWidth, cellHeight: geometry.cellHeight});
  context.drawImage(cell, x * geometry.cellWidth, y * geometry.cellHeight);
}

async function loadScenePreviewSourceById(sceneId, {view = 'map', ...options} = {}) {
  return view === 'viewport' ? await loadSceneViewportById(sceneId, options)
    : view === 'detailed' ? await loadSceneDetailedSurfaceById(sceneId, options)
    : await loadSceneSurfaceById(sceneId, options);
}

async function paintScenePreviewById(canvas, sceneId, {isCurrent = () => true, ...options} = {}) {
  const token = {};
  previewRequests.set(canvas, token);
  const source = await loadScenePreviewSourceById(sceneId, options);
  if (previewRequests.get(canvas) !== token || !isCurrent() || !source) return null;
  await (previews.get(canvas)?.draw({surface: source, ...options}) || paintScenePreview(canvas, {surface: source, ...options}));
  return source;
}

function positionSceneAnnotations(host, {cellSize, sourceX = 0, sourceY = 0,
  sourceWidth, sourceHeight, displayWidth, displayHeight} = {}) {
  if (!host || !sourceWidth || !sourceHeight) return;
  const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const offsetX = (displayWidth - sourceWidth * scale) / 2;
  const offsetY = (displayHeight - sourceHeight * scale) / 2;
  for (const marker of host.querySelectorAll('[data-scene-annotation]')) {
    const x = Number(marker.dataset.sceneX) * cellSize;
    const y = Number(marker.dataset.sceneY) * cellSize;
    const point = marker.dataset.sceneAnnotation === 'point';
    marker.style.left = `${offsetX + (x - sourceX + (point ? cellSize / 2 : 0)) * scale}px`;
    marker.style.top = `${offsetY + (y - sourceY + (point ? cellSize / 2 : 0)) * scale}px`;
    if (!point) {
      marker.style.width = `${Number(marker.dataset.sceneWidth) * cellSize * scale}px`;
      marker.style.height = `${Number(marker.dataset.sceneHeight) * cellSize * scale}px`;
    }
  }
}

function setScenePreviewPoint(root, {x, y, width, height, annotations = []} = {}) {
  const marker = root.querySelector('[data-scene-preview-point]');
  if (marker) {
    marker.hidden = !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height;
    marker.style.left = `${x / width * 100}%`; marker.style.top = `${y / height * 100}%`;
    marker.style.width = `${100 / width}%`; marker.style.height = `${100 / height}%`;
  }
  const layer = root.querySelector('[data-scene-preview-annotations]');
  if (!layer) return;
  layer.replaceChildren(...annotations.map(node => node.cloneNode(true)));
  positionSceneAnnotations(layer, {cellSize: 1, sourceWidth: width, sourceHeight: height,
    displayWidth: width, displayHeight: height});
  for (const node of layer.children) {
    for (const key of ['left', 'width']) node.style[key] = `${Number.parseFloat(node.style[key]) / width * 100}%`;
    for (const key of ['top', 'height']) node.style[key] = `${Number.parseFloat(node.style[key]) / height * 100}%`;
  }
}

function paintPreviewRewriteRegions(context, rewrites, selectedKey) {
  context.save();
  for (const rewrite of [...rewrites.filter(row => row.key !== selectedKey),
    ...rewrites.filter(row => row.key === selectedKey)]) {
    const selected = rewrite.key === selectedKey;
    const color = `hsl(${Number(rewrite.eventFlag) * 47 % 360} 70% 60%)`;
    context.fillStyle = color;
    context.globalAlpha = selected ? .22 : .10;
    for (const row of rewrite.regions)
      context.fillRect(row.x * 16, row.y * 16, row.width * 16, row.height * 16);
    context.globalAlpha = 1;
    context.strokeStyle = selected ? '#fff' : color;
    context.lineWidth = selected ? 3 : 1;
    for (const row of rewrite.regions)
      context.strokeRect(row.x * 16 + 1, row.y * 16 + 1, row.width * 16 - 2, row.height * 16 - 2);
  }
  context.restore();
}


function encounterZoneColor(zoneId) {
  const value = Number(zoneId);
  if (!value) return [70, 84, 92];
  const hue = (value * 47) % 360;
  const light = 46 + (value % 3) * 8;
  return hslToRgb(hue, 62, light);
}

function hslToRgb(h, s, l) {
  const saturation = s / 100, lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x] : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map(value => Math.round((value + m) * 255));
}

function paintPreviewEncounterZones(context, {binding, activeZone, pickedIndex}, scene) {
  if (!binding) return;
  const cell = 16;
  context.save();
  context.font = "bold 9px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (binding.kind === "world-grid") {
    const size = binding.blockSize * cell;
    for (const [index, block] of binding.blocks.entries()) {
      const zoneId = Number(block.zone_id);
      const selected = zoneId === activeZone;
      const picked = index === pickedIndex;
      const [r, g, b] = encounterZoneColor(zoneId);
      const left = Number(block.cell_x) * cell, top = Number(block.cell_y) * cell;
      context.fillStyle = `rgba(${r},${g},${b},${
        selected ? (zoneId ? .58 : .34) : (zoneId ? .26 : .12)
      })`;
      context.fillRect(left, top, size, size);
      context.strokeStyle = selected ? "#fff" : `rgba(${r},${g},${b},.65)`;
      context.lineWidth = selected ? 3 : 1;
      context.strokeRect(left + .5, top + .5, size - 1, size - 1);
      context.fillStyle = selected ? "#000" : "rgba(7,16,19,.75)";
      context.fillText(zoneId.toString(16).toUpperCase().padStart(2, "0"),
        left + size / 2, top + size / 2);
      if (picked) {
        context.save();
        context.setLineDash([6, 4]);
        context.strokeStyle = "#d8f231";
        context.lineWidth = 3;
        context.strokeRect(left + 2, top + 2, size - 4, size - 4);
        context.restore();
      }
    }
    context.restore();
    return;
  }
  const zoneId = Number(binding.zoneId);
  const [r, g, b] = encounterZoneColor(zoneId);
  const width = Number(scene.width) * cell;
  const height = Number(scene.height) * cell;
  context.fillStyle = `rgba(${r},${g},${b},${zoneId ? .2 : .1})`;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = `rgba(${r},${g},${b},.95)`;
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, width - 3, height - 3);
  context.strokeStyle = "#fff";
  context.lineWidth = 1;
  context.strokeRect(4.5, 4.5, width - 9, height - 9);
  context.restore();
}


function positionPreviewMapExtension(view) {
  const {canvas, region, snapshot, dimensions} = view;
  if (!region || !snapshot) return;
  const pose = [region.x, region.y, Number(snapshot.cameraX || 0),
    Number(snapshot.cameraY || 0), region.canvas.width, region.canvas.height,
    dimensions.viewportWidth, dimensions.viewportHeight].join(":");
  if (view.pose === pose) return;
  view.pose = pose;
  canvas.style.left = `${(region.x - Number(snapshot.cameraX || 0) * 16) / dimensions.viewportWidth * 100}%`;
  canvas.style.top = `${(region.y - Number(snapshot.cameraY || 0) * 16) / dimensions.viewportHeight * 100}%`;
  canvas.style.width = `${region.canvas.width / dimensions.viewportWidth * 100}%`;
  canvas.style.height = `${region.canvas.height / dimensions.viewportHeight * 100}%`;
}

function paintPreviewMapExtension(view) {
  if (!view.isCurrent()) return;
  const {viewport, screen, canvas, snapshot} = view;
  const sceneId = snapshot?.sceneId;
  if (sceneId == null || snapshot?.hidden) {
    canvas.hidden = true;
    view.key = null;
    return;
  }
  const scale = Number.parseFloat(screen.style.width) / view.dimensions.viewportWidth;
  if (!(scale > 0) || !view.width || !view.height) return;
  const x = Number(snapshot.cameraX || 0) * 16 - Number.parseFloat(screen.style.left) / scale;
  const y = Number(snapshot.cameraY || 0) * 16 - Number.parseFloat(screen.style.top) / scale;
  const left = Math.floor(x / 256) * 256, top = Math.floor(y / 256) * 256;
  const right = Math.ceil((x + view.width / scale) / 256) * 256;
  const bottom = Math.ceil((y + view.height / scale) / 256) * 256;
  const key = JSON.stringify([sceneId, left, top, right, bottom,
    snapshot.animationPhase, snapshot.fieldTiles]);
  const documents = ["scene", "shared-chr-bank", "metatile-page", "metatile-set", "palette-runtime-service"]
    .map(id => id === "shared-chr-bank" ? db.peekDocument(id, null)
      : db.peekResourceDocument(id === "scene" ? `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, "0")}` : id, null));
  positionPreviewMapExtension(view);
  if (view.key === key && documents.every((item, index) => item === view.documents[index])) return;
  view.key = key;
  view.documents = documents;
  const revision = view.revision = (view.revision || 0) + 1;
  loadSceneRegionById(Number(sceneId), {x: left, y: top, width: right - left, height: bottom - top,
    animationPhase: snapshot.animationPhase, fieldTiles: snapshot.fieldTiles}).then(region => {
    if (view.revision !== revision || view.key !== key || !view.isCurrent()) return;
    const unchanged = view.region === region;
    view.region = region;
    canvas.hidden = !region;
    if (!region) return;
    if (!unchanged) void paintScenePreview(canvas, {surface: region.canvas});
    positionPreviewMapExtension(view);
  }).catch(error => {
    if (view.revision !== revision || !view.isCurrent()) return;
    view.key = null;
    view.onError?.(error);
  });
}

function paintScenePreviewTiles(canvas, {tiles = [], sceneId, cameraX = 0, cameraY = 0, scrollOffsetY = 0, animationPhase, paletteDecrement = 0, backgroundFlash = false, context, stage}) {
  if (!canvas) return;
  if (canvas.width !== stage.viewportWidth) {
    canvas.width = stage.viewportWidth;
  }
  if (canvas.height !== stage.viewportHeight) {
    canvas.height = stage.viewportHeight;
  }
  if (!tiles.length || !context) {
    if (!canvas.hidden) canvas.hidden = true;
    delete canvas.dataset.drawKey;
    return;
  }
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  drawing.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.hidden) canvas.hidden = false;
  const drawKey = JSON.stringify([
    Number(sceneId),
    cameraX,
    cameraY,
    scrollOffsetY,
    animationPhase,
    paletteDecrement,
    tiles,
  ]);
  canvas.dataset.drawKey = drawKey;
  return loadStorySceneMetatileRenderer(context, {animationPhase}).then(renderer => {
    if (!renderer || canvas.dataset.drawKey !== drawKey) return;
    drawing.clearRect(0, 0, canvas.width, canvas.height);
    for (const tile of tiles) {
      const source = renderer.metatiles[Number(tile.tileId) & 0x7F];
      if (!source) continue;
      const x = (Number(tile.x) - cameraX) * stage.tileSize;
      const y = (Number(tile.y) - cameraY) * stage.tileSize - scrollOffsetY;
      drawing.drawImage(source, x, y);
      if (scrollOffsetY) drawing.drawImage(source, x,
        y + (scrollOffsetY > 0 ? stage.viewportHeight : -stage.viewportHeight));
    }
    paintFieldPalette(drawing, Number(paletteDecrement) || 0,
      backgroundFlash);
  });
}

const actorLayers = new WeakMap();
const playerRegions = new WeakMap();

function syncScenePreviewRegions(screen, regions, camera, dimensions) {
  if (!screen) return;
  let layer = playerRegions.get(screen);
  if (!layer) {
    layer = document.createElement("div");
    layer.dataset.scenePreviewRegions = "true";
    Object.assign(layer.style, {position: "absolute", inset: "0", pointerEvents: "none", zIndex: "350"});
    screen.append(layer);
    playerRegions.set(screen, layer);
  }
  while (layer.children.length > regions.length) layer.lastElementChild.remove();
  regions.forEach((wait, index) => {
    let box = layer.children[index];
    if (!box) {
      box = document.createElement("button");
      box.type = "button";

      box.setAttribute("aria-label", "触发区域");
      Object.assign(box.style, {position: "absolute", border: "2px dashed #ffca55", background: "#ffca5518",
        padding: "0", pointerEvents: "auto", boxSizing: "border-box"});
      layer.append(box);
    }
    for (const [key, value] of Object.entries(wait.attributes || {})) box.setAttribute(key, value);
    const region = wait.region;
    box.title = wait.title || '';
    box.style.left = `${(region.left - Number(camera.x || 0)) * 16 / dimensions.viewportWidth * 100}%`;
    box.style.top = `${((region.top - Number(camera.y || 0)) * 16
      - Number(camera.scrollY || 0)) / dimensions.viewportHeight * 100}%`;
    box.style.width = `${(region.right - region.left) * 16 / dimensions.viewportWidth * 100}%`;
    box.style.height = `${(region.bottom - region.top) * 16 / dimensions.viewportHeight * 100}%`;
  });
}

function syncScenePreviewObjects(layer, rows) {
  if (!layer) return;
  let actors = actorLayers.get(layer);
  if (!actors) actorLayers.set(layer, actors = new Map());
  const present = new Set();
  let cursor = layer.firstElementChild;
  for (const {id, attributes, styles} of rows) {
    present.add(id);
    let cached = actors.get(id);
    if (!cached) {
      cached = {element: document.createElement("span"), attributes: {}, styles: {}};
      actors.set(id, cached);
    }
    const {element} = cached;
    for (const name of Object.keys(cached.attributes)) {
      if (!(name in attributes)) element.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (cached.attributes[name] !== value) element.setAttribute(name, value);
    }
    for (const name of Object.keys(cached.styles)) {
      if (!(name in styles)) element.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(styles)) {
      if (cached.styles[name] !== value) element.style.setProperty(name, value);
    }
    if (element !== cursor) layer.insertBefore(element, cursor);
    cursor = element.nextElementSibling;
    cached.attributes = attributes;
    cached.styles = styles;
  }
  for (const [id, cached] of actors) {
    if (present.has(id)) continue;
    cached.element.remove();
    actors.delete(id);
  }
}

/** 把显示画布上的指针换成场景字段对象的一格。 */
function scenePreviewCellFromPointer(canvas, event, {
  cellSize = 16, width, height, scene = null,
} = {}) {
  const size = integer(cellSize, "cellSize", 1, 16);
  const columns = integer(width ?? scene?.width, "scene_width", 1, 256);
  const rows = integer(height ?? scene?.height, "scene_height", 1, 256);
  const rect = canvas.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) {
    throw new TypeError("场景画布没有可用的显示尺寸");
  }
  const x = Math.floor((Number(event.clientX) - rect.left) * canvas.width / rect.width / size);
  const y = Math.floor((Number(event.clientY) - rect.top) * canvas.height / rect.height / size);
  if (x < 0 || y < 0 || x >= columns || y >= rows) return null;
  return {x, y, metatileId: scene ? sceneMapCell(scene, x, y)?.metatileId ?? null : null};
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum)
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  return result;
}

/** 引用预览在运行时地图上叠加同一套场景逻辑对象。 */
async function loadSceneDetailedSurfaceById(sceneId, {cellSize = 16} = {}) {
  const id = Number(sceneId);
  const [document_, surface] = await Promise.all([
    loadSceneResourceDocumentById(id), loadSceneSurfaceById(id, {cellSize}),
  ]);
  if (!surface) return null;
  const logic = document_?.logic;
  if (!logic?.layers) return surface;
  const canvas = document.createElement("canvas");
  canvas.width = surface.width;
  canvas.height = surface.height;
  const layers = logic.layers;
  const actorRefs = [
    ...(layers.actors?.records || []),
    ...(layers.actors?.dynamic_variants || []).flatMap(row => row.actor_list?.records || []),
  ];
  const actors = actorRefs.length
    ? state.sceneActors || state.project?.scenes?.actors || await db.getDocument("scene-actor", null)
    : null;
  const actorByUid = new Map((actors?.records || []).map(record => [record.uid, record]));
  const rows = [];
  const add = (kind, records) => (records || []).forEach(record =>
    rows.push({kind, record, x: Number(record.x), y: Number(record.y)}));
  add("actor", actorRefs.map(reference => actorByUid.get(reference.uid)).filter(Boolean));
  add("treasure", layers.treasures);
  add("investigation", layers.investigation_points);
  add("investigation-special", layers.investigation_special_points);
  add("investigation-tile", layers.metatile_investigation_points);
  add("transition", layers.transitions?.point_transitions);
  add("event", layers.event_triggers);
  add("vehicle", Object.values(state.vehicleDraft?.placement || {}).filter(record =>
    record.placed && Number(record.scene_id) === id));
  const scene = document_.scene || document_;
  const boundaries = [
    ...(layers.transitions?.boundary_exits || []),
    ...(layers.transitions?.dynamic_boundary_return ? [layers.transitions.dynamic_boundary_return] : []),
  ].map(record => ({record}));
  await paintScenePreview(canvas, {scene, surface, markers: rows, boundaries, cellSize});
  return canvas;
}

// @editor-module 详情页共用的物理位置折叠区。


function physicalLocationMarkup({uid = null, rows = [], content = ""} = {}) {
  const entries = [...(uid
    ? resourcePhysicalAddressSummary(uid).ranges.map((address, index) => ({
      label: address.role || `片段 ${index + 1}`, address,
    })) : []), ...rows].map(row => {
      const source = row.address?.offset == null && row.address?.prg_offset != null
        ? {...row.address, space: row.address.space || "prg",
          offset: Number(row.address.prg_offset)} : row.address;
      return {...row, address: source};
    }).filter(row => row.address?.offset != null
      && Number.isInteger(Number(row.address.offset)));
  if (!entries.length) return "";
  const singleResource = uid && rows.length === 0 && entries.length === 1;
  return `<details class="physical-location" data-physical-location data-collapse-key="physical-location">
    <summary>物理位置</summary>
    <div class="table-wrap"><table><thead><tr><th>字段</th><th>地址</th><th>字节数</th></tr></thead>
      <tbody>${entries.map(row => `<tr><th>${esc(row.label || row.key || "片段")}</th>
        <td>${singleResource ? compactResourceAddress(uid)
          : row.address.prg_offset != null ? physicalAddressLink(row.address)
            : directPhysicalAddress(row.address)}</td>
        <td>${Number.isInteger(Number(row.length ?? row.address?.length))
          ? esc(String(row.length ?? row.address.length)) : "—"}</td></tr>`).join("")}</tbody>
    </table></div>${content}
  </details>`;
}

// @editor-module 记录页：从列表点进来的单条明细
//
// 记录页保留字段值与编辑控件，并在末尾提供一个默认折叠的物理位置区。


/**
 * 记录页外框。`back` 是回到列表的标签，`prev`/`next` 是同一张表里的相邻记录，
 * 让人不必回列表就能顺着看下去。
 */
function recordPage({
  title,
  uid = "",
  backLabel = "返回列表",
  prevId = null,
  nextId = null,
  panels = [],
  physicalRows = [],
  physicalContent = "",
  physicalUid = uid,
}) {
  const location = physicalLocationMarkup({uid: physicalUid, rows: physicalRows, content: physicalContent});
  return `<div class="record-head">
      <button class="record-back" type="button" data-record-back>← ${esc(backLabel)}</button>
      <span class="record-title">${esc(title)}</span>
      ${handleMarkup(uid)}
      <div class="record-nav">
        <button class="button ghost" type="button" data-record-prev
          ${prevId === null ? "disabled" : `data-target="${esc(prevId)}"`}>上一条</button>
        <button class="button ghost" type="button" data-record-next
          ${nextId === null ? "disabled" : `data-target="${esc(nextId)}"`}>下一条</button>
      </div>
    </div>
    <div class="page-body"><div class="record-grid">${panels.join("")}${
      location ? `<section class="record-panel record-panel--wide record-panel--flat">${
        location}</section>` : ""}</div></div>`;
}

/** `wide` 横跨整行；`flat` 为画布、长表移除卡片外框与嵌套纵向滚动。 */
function panel(title, body, {wide = false, flat = false} = {}) {
  return `<section class="record-panel${wide || flat ? " record-panel--wide" : ""}${flat ? " record-panel--flat" : ""}">
    <h3>${esc(title)}</h3>${body}</section>`;
}

/** 字段表。值可以是 HTML（比如内联输入框），所以不在这里转义。 */
function fields(rows) {
  return `<div class="record-fields">${rows.map(([label, value]) =>
    `<div class="record-field">
      <span class="record-field-label">${esc(label)}</span>
      <span class="record-field-value">${value ?? "—"}</span>
    </div>`).join("")}</div>`;
}

/** 图像预览槽。像素图一律 pixelated，不要让浏览器插值糊掉图块。 */

/** 画布预览槽：由视图自己在绑定期绘制。 */

/** 音频试听槽。控件由视图接管，这里只固定版式。 */

export { ACTOR_ENTRY_SCENE_OBJECT, ACTOR_ENTRY_TYPE_SELECTOR, ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONLESS, ACTOR_MOTION_SINGLE, actorAppearanceCatalog, actorAppearanceCatalogFromDocument, actorAppearanceContextForScene, actorAppearanceThumbnail, actorAtlas, actorAtlasCanvas, actorAtlasImage, actorMotionCatalogFromDocument, actorPoseForAppearance, actorPreviewPoses, actorSetBanks, actorSetSources, actorSpriteSheetUrl, advanceFieldChrAnimation, bindScenePreview, deletePreviewCacheProject, encounterZoneColor, fieldChrAnimationBanks, fieldChrAnimationDuration, fieldChrAnimationMask, fieldChrAnimationPlaybackPhase, fieldChrAnimationRecipe, fieldPaletteSheetUrl, fields, handleMarkup, handleTextMarkup, invalidateSceneSurface, loadSceneMetatileRenderer, loadScenePreviewSourceById, loadSceneSurface, loadWorldMetatileRenderer, paintActorAtlasCanvases, paintSceneMetatileCells, paintScenePreview, paintScenePreviewById, paintScenePreviewCell, paintScenePreviewTiles, paintSceneThumbnailCanvases, paintTileGridCells, paintTileGridLines, paintVisibleSceneThumbnailCanvases, panel, peekActorAppearance, physicalLocationMarkup, positionSceneAnnotations, previewCacheProjectStats, recordPage, renderTileGridCanvas, sceneActorVisualDescriptor, sceneActorVisualRaster, sceneAnnotationsMarkup, scenePreviewCanvasMarkup, scenePreviewController, scenePreviewControls, scenePreviewMarkup, setScenePreviewPoint, shortHandleLabel, syncScenePreviewObjects, syncScenePreviewRegions, worldChrAnimationBank, worldRegionalChrAnimationBanks, worldZoneAt };
