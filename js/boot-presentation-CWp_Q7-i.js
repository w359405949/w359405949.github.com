import { PALETTE_MAX, decodeChrTiles, paintNametable, decodeWebByteArray, composeChrPatternTable, nesPalette, uiPutRgb, uiPaintResolvedMetasprite, TILE_BYTES, paintNametableWindow, defaultGeometry, $, showEditorError, bindNametablePainting, prepareModuleComponent, renderModuleComponent, esc, hydrateModuleComponents, configureChrContextTileSelector, outlineBox, resetToOriginalButton, applyResetToOriginalStates, bindTextInputEvents, bindFieldResetToOriginalButtons, hex, audioCommandLabel, attributeIndexAt, attributeByteWith } from './monster-figure-C07vG7yu.js';
import './components-WokSyCfC.js';
import { bindPreviewSound, bindScreenWorkbenchZoom, screenWorkbenchCanvasStage, screenWorkbench, ensureAudioCommandLabelsData, previewSoundControl, previewSoundEnabled, ensureAudioSequenceData, createAudioTimelinePlayer } from './preview-sound-DHDXA99x.js';
import { bindSystemStateController, systemTitleControls } from './system-state-controller-2LgSXlEc.js';
import { db, createAutoSave } from './scene-actors-Cftr7mCE.js';
import { state } from './emulator-Bl-sLXnd.js';
import { mountFieldObjectInlineControls, fieldObjectInputMarkup } from './rectangle-preset-controls-MtKWNScU.js';
import { ELEMENT_TREE_LABELS, elementTreeTypeLabel, elementTree, defineElementTreeTypes, ELEMENT_TREE_ICONS } from './charset-BJ0aS3Xk.js';
import { bindTimelinePlayer, framesToSeconds, timelinePlayer, timelineViewportControls, syncTimelinePlayer, secondsToFrames } from './timeline-player-C0h-EABn.js';
import { nesColorCss, nesColorGrid } from './entity-detail-D8pHuYrZ.js';
import { panel } from './record-BbPQSBBw.js';
import './project-store-values-klefznSR.js';
import './write-access-marker-Q1IasgBx.js';
import './writeback-capabilities-CGLIL9l3.js';
import './baseline-assembly-C0KRII8X.js';
import './page-runtime-paths-_6fUGFtn.js';
import './story-component-labels-C9k8orBA.js';
import './components-wbruLTYI.js';
import './text-record-structure-editor-COmgY10x.js';

// 开机时间轴按已发布计数语义与当前值计算逐帧状态。

const FRAMES_PER_SECOND = 60.0988;

/** 立即数参数的有效值：改过的优先，否则用文档里的 ROM 原值。 */
function parameterValue(screen, values, id) {
  const edited = values?.parameters?.[id];
  if (edited !== undefined && edited !== null) return Number(edited);
  const published = (screen?.parameters || []).find(item => item.id === id);
  return Number(published?.value ?? 0);
}

function parameterDomain(screen, id) {
  return (screen.parameters || []).find(item => item.id === id)?.semantic_edit_domain;
}

// 只消费已发布的计数形状，不执行公式字符串，也不按参数名维护零值表。
// 公式与数值域必须一致；新形状需要显式对齐，不能静默退回 raw 字节。
function domainCycle(domain) {
  const {minimum, maximum} = domain.allowed_integer_values || {};
  if (domain.status !== "confirmed" || minimum !== 0
      || !Number.isInteger(maximum) || maximum < 1) {
    throw new Error("开机时间轴：不支持的计数语义域");
  }
  return maximum + 1;
}

/** 参数的等帧次数按已发布的计数域计算。 */
function parameterFrames(screen, values, id) {
  const value = parameterValue(screen, values, id);
  const domain = parameterDomain(screen, id);
  if (!domain) return Math.max(0, value);
  if (domain.status === "confirmed" && domain.iteration_count === "value") {
    const {minimum, maximum} = domain.allowed_integer_values || {};
    if (!Number.isInteger(minimum) || minimum < 1 || !Number.isInteger(maximum)
        || maximum < minimum || !Number.isInteger(value) || value < minimum || value > maximum)
      throw new Error(`开机时间轴：参数超出计数语义域 ${id}`);
    return value;
  }
  const cycle = domainCycle(domain);
  if (domain.iteration_count !== `value if value != 0 else ${cycle}`) {
    throw new Error(`开机时间轴：不支持的倒数语义域 ${id}`);
  }
  return value === 0 ? cycle : value;
}

function fadeSteps(screen, values, fadeId) {
  const edited = values?.fades?.[fadeId];
  if (Array.isArray(edited)) return edited;
  return (screen.fades || []).find(item => item.id === fadeId)?.steps || [];
}

function fadeTargets(screen, fadeId) {
  return (screen.fades || []).find(item => item.id === fadeId)?.palette_offsets || [];
}

/** 这一步占多少帧。规则来自已发布计数语义。 */
function stepFrames(screen, values, step) {
  if (step.kind === "wait") {
    return parameterFrames(screen, values, step.frames_parameter);
  }
  if (step.kind === "fade") {
    return parameterFrames(screen, values, step.frames_parameter)
      * Number(step.steps || 0);
  }
  if (step.kind === "scroll") {
    const {span, pace} = scrollTiming(screen, values, step);
    return span * pace;
  }
  return 0;
}

function scrollTiming(screen, values, step) {
  const from = parameterValue(screen, values, step.from_parameter);
  const to = parameterValue(screen, values, step.to_parameter);
  const domain = parameterDomain(screen, step.from_parameter);
  const cycle = domainCycle(domain || {});
  const formula = `((${step.to_parameter} - ${step.from_parameter} - 1) & ${cycle - 1}) + 1`;
  const pace = domain.frame_wait_calls_per_iteration;
  for (const id of [step.from_parameter, step.to_parameter]) {
    const endpoint = parameterDomain(screen, id) || {};
    const paired = endpoint.paired_parameters;
    if (domainCycle(endpoint) !== cycle
        || paired?.[0] !== step.from_parameter || paired?.[1] !== step.to_parameter
        || endpoint.iteration_count !== formula
        || endpoint.frame_wait_calls_per_iteration !== pace
        || !Number.isInteger(pace) || pace < 1) {
      throw new Error("开机时间轴：不支持的滚动语义域");
    }
  }
  // 先递增再比较；相等也必须走完整个已发布数值域。
  return {span: ((to - from - 1) & (cycle - 1)) + 1, pace, cycle};
}

/**
 * 把时间轴摊成段。`start` 含、`end` 不含；帧数为 0 的步是瞬时事件，两者相等。
 */
function timelineTrack(screen, values) {
  const timeline = screen?.timeline;
  if (!timeline) return null;
  let cursor = 0;
  const segments = (timeline.steps || []).map(step => {
    const frames = stepFrames(screen, values, step);
    const segment = {...step, frames, start: cursor, end: cursor + frames};
    cursor += frames;
    return segment;
  });
  return {segments, totalFrames: cursor, framesPerSecond: FRAMES_PER_SECOND};
}

function segmentAt(track, frame) {
  return track.segments.find(item => frame >= item.start && frame < item.end)
    || track.segments.filter(item => item.start <= frame).at(-1)
    || track.segments[0]
    || null;
}

/**
 * 第 `frame` 帧的屏幕状态。
 *
 * 起点由文档的 `timeline.initial` 给出：整版调色板被压成一个颜色、精灵关着，
 * 所以标题的每一组颜色都是渐显上来的，而不是「先有画面再变色」。
 */
function timelineStateAt(screen, values, frame) {
  const timeline = screen?.timeline;
  const track = timelineTrack(screen, values);
  if (!timeline || !track) return null;
  const initial = timeline.initial || {};
  const palette = new Array(32).fill(Number(initial.palette_fill ?? 0x0F));
  const state = {
    palette,
    // 滚动取哪两个参数由文档给出：两屏的名字不同（scroll_y / scroll_y_start），
    // 按屏 id 猜名字就是把那份差异抄进前端。
    scrollX: parameterValue(screen, values, initial.scroll_x_parameter),
    scrollY: parameterValue(screen, values, initial.scroll_y_parameter),
    spritesVisible: Boolean(initial.sprites_visible),
    segment: segmentAt(track, frame),
    track,
  };
  for (const segment of track.segments) {
    if (frame < segment.start) break;
    applySegment(screen, values, state, segment, Math.min(frame - segment.start, segment.frames));
  }
  return state;
}

function applySegment(screen, values, state, segment, elapsed) {
  if (segment.kind === "fade") {
    const steps = fadeSteps(screen, values, segment.fade);
    const perStep = parameterFrames(screen, values, segment.frames_parameter);
    // 每一步是「先等 N 帧，再把 4 字节写下去」，所以第 k 步在第 k×N 帧生效。
    const written = perStep > 0
      ? Math.min(steps.length, Math.floor(elapsed / perStep)) : steps.length;
    for (let index = 0; index < written; index += 1) {
      for (const offset of fadeTargets(screen, segment.fade)) {
        for (let slot = 0; slot < steps[index].length; slot += 1) {
          state.palette[offset + slot] = Number(steps[index][slot]);
        }
      }
    }
    return;
  }
  if (segment.kind === "scroll") {
    const from = parameterValue(screen, values, segment.from_parameter);
    const {span, pace, cycle} = scrollTiming(screen, values, segment);
    const moved = Math.min(span, Math.floor(elapsed / pace));
    state.scrollY = elapsed >= segment.frames
      ? Number(segment.reset_value ?? 0) : (from + moved) & (cycle - 1);
    return;
  }
  if (segment.kind === "sprites") {
    state.spritesVisible = Boolean(segment.sprites_visible);
    return;
  }
  // 整版装载：一次写完 32 字节，没有过程。Logo 屏的「出现」和「压黑」都是它。
  if (segment.kind === "palette") {
    const fill = segment.palette_fill;
    const source = fill === undefined || fill === null
      ? paletteEntries(values.palette)
      : new Array(32).fill(Number(fill));
    for (let index = 0; index < state.palette.length; index += 1) {
      state.palette[index] = Number(source[index] ?? 0x0F);
    }
  }
}

/** 标题那 16 字节两组装同一份，补齐成 32 再用。 */
function paletteEntries(palette) {
  const source = palette || [];
  return source.length === 16 ? [...source, ...source] : [...source];
}

// @editor-module 开机演出视觉字段对象的画面、回放与候选预览。

const SCREEN_HEIGHT$1 = 240;
const PATTERN_TABLE_BYTES$1 = 256 * TILE_BYTES;

const bootPreviewMissingBanks = new Set();

function bootPreviewPaletteEntries(values) {
  const source = values || [];
  return source.length === 16 ? [...source, ...source] : [...source];
}

function slotBanks(slot, values) {
  const register = String(slot.register);
  const bank = Number(values?.chr_banks?.[register] ?? slot.bank) & 0xFF;
  const count = Number(slot.length) / 0x400;
  const first = count > 1 ? bank & 0xFE : bank;
  return Array.from({length: count}, (_, step) => (first + step) & 0xFF);
}

async function patternTable(screen, values, base) {
  const table = new Uint8Array(PATTERN_TABLE_BYTES$1);
  const slots = (screen.chr_slots || []).filter(slot => {
    const slotBase = Number(slot.ppu_base);
    return slotBase >= base && slotBase < base + PATTERN_TABLE_BYTES$1;
  });
  const parts = await Promise.all(slots.map(async slot => {
    const length = Number(slot.length);
    if (slot.storage === "chr-ram") {
      const bytes = await decodeWebByteArray(slot.bytes, "开机演出 CHR-RAM 字模");
      return bytes.subarray(0, length);
    }
    try {
      const bytes = await composeChrPatternTable(slotBanks(slot, values));
      return bytes.subarray(0, length);
    } catch (error) {
      for (const bank of slotBanks(slot, values)) bootPreviewMissingBanks.add(bank);
      throw error;
    }
  }));
  parts.forEach((bytes, index) => table.set(bytes, Number(slots[index].ppu_base) - base));
  return table;
}

function paintSprite(image, patterns, sprite, entries) {
  const y0 = (Number(sprite.row) * 8 - 1) & 0xFF;
  const x0 = (Number(sprite.column) * 8 - 5) & 0xFF;
  uiPaintResolvedMetasprite(image, {
    sprites: [{tile: Number(sprite.tile), x: x0, y: y0}],
    palette_sets: [[0, 1, 2, 3].map(index => Number(entries[16 + index] || 0) & PALETTE_MAX)],
  }, [{first_tile: 0, last_tile: patterns.length / TILE_BYTES - 1, patterns}], {});
}

async function bootPreviewScene(screen, values) {
  bootPreviewMissingBanks.clear();
  return {
    patterns: await patternTable(screen, values, Number(screen.background_pattern_base)),
    spritePatterns: await patternTable(screen, values, Number(screen.sprite_pattern_base)),
  };
}

async function bootPreviewEditImage(context, screen, values, binding = null) {
  if (binding) return bootPreviewStateImage(context, screen, values, binding);
  bootPreviewMissingBanks.clear();
  const image = context.createImageData(256, SCREEN_HEIGHT$1);
  const entries = bootPreviewPaletteEntries(values.palette);
  const patterns = await patternTable(screen, values, Number(screen.background_pattern_base));
  paintNametable(image, {tiles: values.nametable || [], patterns,
    palette: entries, geometry: defaultGeometry});
  if (values.sprites?.length) {
    const spritePatterns = await patternTable(screen, values,
      Number(screen.sprite_pattern_base));
    for (const sprite of values.sprites) paintSprite(image, spritePatterns, sprite, entries);
  }
  return image;
}

function bootPreviewPlaybackImage(context, scene, pages, moment, sprites) {
  const image = context.createImageData(256, SCREEN_HEIGHT$1);
  paintNametableWindow(image, {pages, patterns: scene.patterns,
    palette: moment.palette, scrollX: moment.scrollX, scrollY: moment.scrollY,
    geometry: defaultGeometry});
  if (moment.spritesVisible) {
    for (const sprite of sprites || []) {
      paintSprite(image, scene.spritePatterns, sprite, moment.palette);
    }
  }
  return image;
}

async function bootPreviewStateImage(context, document, values, binding) {
  if (binding?.renderer !== "boot-presentation" || binding.resource_id !== "boot-presentation"
      || document.ppu?.mirroring !== "vertical")
    throw new TypeError("启动状态构建绑定无效");
  const screen = document.screens.find(item => item.id === binding.screen_id);
  const current = values.screens.find(item => item.id === binding.screen_id);
  const segment = timelineTrack(screen, current)?.segments.find(item => item.id === binding.timeline_segment);
  if (!segment || !["start", "end"].includes(binding.segment_position))
    throw new TypeError("启动状态时间轴绑定无效");
  const pages = [[0x2000, 0x2400].map(base => {
    const page = document.screens.find(item => Number(item.nametable?.ppu_base) === base);
    return values.screens.find(item => item.id === page?.id)?.nametable;
  })];
  const moment = timelineStateAt(screen, current, segment[binding.segment_position]);
  const image = bootPreviewPlaybackImage(context, await bootPreviewScene(screen, current),
    pages, moment, current.sprites);
  if (!binding.background_left_visible) {
    const colour = nesPalette[moment.palette[0] & PALETTE_MAX];
    for (let y = 0; y < SCREEN_HEIGHT$1; y += 1)
      for (let x = 0; x < 8; x += 1) uiPutRgb(image.data, image.width, x, y, colour);
  }
  return image;
}

async function bootChrTileContext(screen, values, group) {
  const palette = bootPreviewPaletteEntries(values.palette).slice(group * 4, group * 4 + 4);
  palette[0] = Number(values.palette[0] || 0x0F) & PALETTE_MAX;
  return {key: screen.id,
    tiles: decodeChrTiles(await patternTable(screen, values, Number(screen.background_pattern_base))),
    palette};
}

const bootChrContextAdapter = Object.freeze({
  clone: value => structuredClone(value),
  key: context => context.key,
  equal: (left, right) => left.tile === right.tile,
  token: reference => `0x${reference.tile.toString(16).toUpperCase().padStart(2, '0')}`,
  pixels: (context, reference) => {
    const pixels = context.tiles[reference.tile];
    if (!pixels) throw new RangeError('图块不在启动画面 CHR 上下文中');
    return {pixels, palette: context.palette, opaque: true};
  },
  candidates: context => context.tiles.map((pixels, tile) => ({reference: {tile},
    pixels, palette: context.palette, opaque: true})),
});

// @editor-module 开机演出：启动 Logo 与标题画面

let bootAudioPlayer = null;

// 这一页一次只编辑一屏，恢复目标唯一；共用按钮仍要一个 itemId。
const RESET_ITEM_ID = "boot-screen";

const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 240;
const PATTERN_TABLE_BYTES = 0x1000;

const RESOURCE_ID = "boot-presentation";

// 草稿是「当前屏的可编辑值」的一份可变副本，改动先落在它上面再写回 working 层
// （见 commit）。它存在的理由只是「渲染要同步拿到最新值」，不是一个待保存状态。
let draft = null;
let selectedElement = null;
let selectedSegment = null;
let selectionGeneration = 0;
// 画笔没有模式开关：选中图像组件后，右栏的图块选择器和属性组行同时在那儿，
// 点哪个就用哪个。brushKind 记的是「上次点的是哪一种」，不是一个要人先切换的
// 状态。
//
// 默认拿组 0 的属性画笔：整行不高亮的话，没人看得出「组 N」是可以点的。选它
// 而不是选 tile 画笔，是因为默认 tile 画笔会是 tile $00（空白），点一下画面
// 就抹掉一格；属性画笔最多是把一个 2×2 象限换个配色，看得见也改得回来。
let brushKind = "attributes";
let brushTile = 0;
let brushGroup = 0;
let saveNotice = "";
// 画布缩放。"fit" 是自动铺满舞台；数字是手动倍率。缩放只改 canvas 的 CSS 宽度，
// 位图始终是 256×240，落笔按比例换算，所以任意倍率都不会画偏。
let zoom = "fit";
const timelineViewports = new Map();

const analysisScreen = id =>
  (state.project?.boot_presentation?.screens || []).find(item => item.id === id);
// db 取回的是资产里的 document 本体（project-db 已经拆掉 resource_id/codec 外壳），
// 所以这里直接读 screens，不要再套一层 document。
const editsScreen = id =>
  (state.project?.boot_presentation_edits?.screens || [])
    .find(item => item.id === id);

const screenIdFor = view =>
  view === "cutscene-boot-logo" ? "boot-logo" : "title";

function bootPresentationScreen(view) {
  return analysisScreen(screenIdFor(view));
}

function cloneEdits(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

/** 当前屏的有效值：草稿优先，否则 repository 现值。 */
function effective(view) {
  const id = screenIdFor(view);
  if (draft?.id === id) return draft;
  return editsScreen(id) || null;
}

function ensureDraft(view) {
  const id = screenIdFor(view);
  if (draft?.id === id) return draft;
  const source = editsScreen(id);
  if (!source) return null;
  draft = cloneEdits(source);
  return draft;
}

/**
 * 绘制即保存：没有「保存」按钮，每一次改动都写进 working 层。
 *
 * 但落盘不能和每一格画笔一一对应——一笔拖过去就是几十次改动，而一次写入要克隆
 * 整份草稿（含 1 KiB nametable）再走一趟 IndexedDB 事务。所以合并成尾随写入：
 * 最后一次改动之后 SAVE_DELAY 毫秒才真的写，写入之间串行排队。
 *
 * 计时器和排队都在模块作用域，**不随页面重绘取消**：写入认的是屏 id，不是当前
 * 视图，所以哪怕改完立刻切走，那一笔仍会落到它自己那一屏上。
 */
const autoSave = createAutoSave(
  payload => writeScreen(payload),
  {onError: error => saySaveState(`保存失败：${error.message}`)},
);

function commit(view) {
  const id = screenIdFor(view);
  // **payload 在这里就取好**：改完立刻切走，这一笔仍落在它原来那一屏上。
  const payload = draft?.id === id ? cloneEdits(draft) : null;
  if (payload) autoSave.commit(id, payload);
}

function cancelPendingSave() {
  autoSave.cancel();
}

/** 存盘状态只写进那一行提示，不重绘页面——重绘会打断正在敲字或正在画的人。 */
function saySaveState(text) {
  saveNotice = text;
  const node = $("#boot-save-state");
  if (node) node.textContent = text;
}

async function writeScreen(payload) {
  const fields = screenFields(await db.getFields(RESOURCE_ID), payload.id);
  if (!fields.length) throw new Error(`${payload.id}: 字段对象未登记`);
  const changes = fields.map(field => ({field,
    value: valueAt(payload, field.documentPath.slice(2))})).filter(({field, value}) =>
    JSON.stringify(value) !== JSON.stringify(field.value));
  if (changes.length) await db.writeFields(changes, {expectedVersion: fields[0].version});
  saySaveState("");
  refreshResetState(payload.id);
}

function screenFields(fields, screenId) {
  return fields.filter(field => field.entityHandle.startsWith(`${RESOURCE_ID}:${screenId}.`));
}

function valueAt(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

/**
 * 「还原」能不能按，问的是 working 层与导入时的 base 有没有差异——这只有
 * repository 知道。不要拿分析文档去反推原始可编辑值：那等于把提取器的映射
 * 在前端再写一遍，两边迟早对不上。
 */
async function refreshResetState(screenId) {
  const button = $("[data-reset-to-original]");
  if (!button) return;
  try {
    const dirty = screenFields(await db.getFields(RESOURCE_ID), screenId)
      .some(field => field.hasOverride);
    if ($("[data-reset-to-original]") === button) {
      applyResetToOriginalStates(document, {[RESET_ITEM_ID]: dirty});
    }
  } catch (error) {
    saySaveState(`开机演出还原状态读取失败：${error?.message || error}`);
  }
}

// ——— 演出回放 ————————————————————————————————————————————————————
//
// 编辑视图和回放视图画的不是同一件事，所以它们是两条路：
//
//   编辑态  按 nametable 原点画自己这一页，格子与画笔一一对应；这是「你能改
//           哪一格」的视图，不该被滚动量搅动。
//   回放态  按 PPU 的取景方式画：两页拼成一个平面，滚动影子截出一屏，调色板
//           取自时间轴第 N 帧的状态。这是「跑起来屏幕上是什么」。
//
// 两者差一个 ($13, $15)：docs/metalmaxcn_disassembly.md 里长期记着的那个
// (12, −8) 像素缺口，就是回放这条路补上的。全部由包里的 ROM 数据算出来，
// 不读模拟器也不读 trace。回放期间画笔停用——画面已经不是格子对格子了，
// 那时候落笔只会画偏。
let playhead = null;   // null = 编辑态；数字 = 停在第几帧
let playbackView = null;
let playing = false;
let playAnchor = null; // {frame, time}：按真实时间推进，不按 rAF 次数
let playbackScene = null;

/** 回放每帧都要重画，图案表不能每帧重拼；改动一律作废这份缓存。 */
async function buildPlaybackScene(view) {
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!screen || !values) return null;
  const scene = {view, ...await bootPreviewScene(screen, values)};
  playbackScene = scene;
  return scene;
}

/**
 * 屏幕平面：两页各自装在哪个 nametable 由文档给出，谁和谁相邻由镜像方式决定。
 *
 * 纵向镜像时 $2000 与 $2400 左右相邻、纵向在同一页内绕回，所以平面是一行两页。
 * 别的镜像方式本 ROM 不出现，遇上就不画——猜一个排布出来只会画出假象。
 */
function playbackPages(view) {
  const document_ = state.project.boot_presentation;
  if (document_?.ppu?.mirroring !== "vertical") return null;
  const bases = [0x2000, 0x2400];
  const pages = bases.map(base => {
    const analysis = (document_.screens || []).find(
      item => Number(item.nametable?.ppu_base) === base);
    if (!analysis) return null;
    // 当前屏取草稿，另一屏取 repository 现值——两页都在同一个资源里。
    const values = analysis.id === screenIdFor(view)
      ? effective(view) : editsScreen(analysis.id);
    return values?.nametable || null;
  });
  return [pages];
}

/** 画第 frame 帧。图元没就绪时先取再画，不阻塞调用方。 */
function paintPlaybackFrame(view, frame) {
  const canvas = $("#boot-screen");
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!canvas || !screen || !values) return;
  if (playbackScene?.view !== view) {
    buildPlaybackScene(view)
      .then(scene => {
        reportBootPresentationPatterns();
        // 只有真的拼出来才回来重画，否则这里会自己叫自己叫到底。
        if (scene) paintPlaybackFrame(view, playhead ?? frame);
      })
      .catch(error => showEditorError(canvas.parentElement, "演出回放图元读取失败", error));
    return;
  }
  const pages = playbackPages(view);
  const moment = timelineStateAt(screen, values, frame);
  if (!pages || !moment) return;
  const context = canvas.getContext("2d");
  const image = bootPreviewPlaybackImage(context, playbackScene, pages, moment,
    values.sprites);
  context.putImageData(image, 0, 0);
}

/** 把一屏画进 canvas；选中的元素加一圈虚线框。 */
async function paintBootPresentationCanvas(view) {
  const canvas = $("#boot-screen");
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!canvas || !screen || !values) return;
  if (playhead !== null) {
    if (playbackScene?.view !== view) await buildPlaybackScene(view);
    paintPlaybackFrame(view, playhead);
    return;
  }
  const context = canvas.getContext("2d");
  const image = await bootPreviewEditImage(context, screen, values);
  // 三种框，权重分明：
  //   地盘   选中组件能占的整片区域，实线亮框——这才是「你能画到哪儿」
  //   内容   它当前实际占了多少格，暗虚线小框，从属于地盘
  //   文字块 画笔碰不得的格子，独立颜色标出来，免得画不上去像坏了
  const element = (screen.elements || []).find(item => item.id === selectedElement);
  if (element) {
    if (element.territory_pixel_bounds) {
      outlineBox(image, element.territory_pixel_bounds, {dash: 0});
    }
    outlineBox(image, element.pixel_bounds, {colour: BOUNDS_OUTLINE});
    if (COMPONENT_KINDS[element.kind]?.capabilities.includes("paint")) {
      for (const other of protectedTextElements(screen)) {
        outlineBox(image, other.pixel_bounds, {colour: PROTECTED_OUTLINE, dash: 2});
      }
    }
  }
  context.putImageData(image, 0, 0);
}

// 内容框比地盘框暗一档；文字块用另一种颜色，表示「不归当前画笔管」。
const BOUNDS_OUTLINE = [120, 70, 100];
const PROTECTED_OUTLINE = [216, 162, 74];

/**
 * 画笔碰不得的格子：文字组件占的那一块。
 *
 * 硬件上这些格子和别处没有区别，图像画笔完全可以覆盖它们——但那样改出来的
 * 「文字」不再是文字组件认得的东西，它的输入框会立刻显示成认不出的格子。
 * NES 上文字总是压在背景之上，不存在反过来的浪费，所以层级固定：文字优先，
 * 它那一块只能由它自己的面板改。
 */
function protectedTextElements(screen) {
  return (screen.elements || []).filter(item => item.kind === "text" && item.text);
}

function isProtectedCell(screen, row, column) {
  return protectedTextElements(screen).some(item =>
    row >= item.bounds.top && row <= item.bounds.bottom
    && column >= item.bounds.left && column <= item.bounds.right
  );
}

/** 图块候选使用本屏当前 CHR 上下文。 */
async function paintBootPatternPicker(view) {
  const element = document.querySelector('[data-boot-brush]');
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!element || !screen || !values) return;
  const context = await bootChrTileContext(screen, values, brushGroup);
  if (!element.isConnected) return;
  configureChrContextTileSelector(element, {
    contexts: [context], references: [{tile: brushTile}], columns: 1, rows: 1,
    adapter: bootChrContextAdapter,
  });
}

function swatch(value, extra = "") {
  const colour = Number(value) & PALETTE_MAX;
  return `<span class="boot-swatch" style="background:${nesColorCss(colour)}"
    ${extra}>${hex(colour, 2)}</span>`;
}

// ——— 取色 ————————————————————————————————————————————————————————
//
// 一个颜色只用一个控件：色块本身就是按钮，点开在下面摊开 64 色 NES 调色板，
// 点一格就换。原来是「色块 + 一个填 0-63 的数字框」——同一个值说两遍，而且
// 要人记住哪个编号是什么颜色。
//
// 同时只开一个取色器。id 编码了这个颜色落在哪儿，applyColour 按它分派。
let openColourField = null;

function colourButton(id, value, {disabled = false, title = ""} = {}) {
  const colour = Number(value) & PALETTE_MAX;
  return `<button type="button" class="boot-swatch boot-swatch--pick${
    openColourField === id ? " is-open" : ""
  }" style="background:${nesColorCss(colour)}"
    data-boot-colour="${esc(id)}" ${disabled ? "disabled" : ""}
    ${title ? `title="${esc(title)}"` : ""}>${hex(colour, 2)}</button>`;
}

/** 64 色 NES 调色板，按 PPU 的 16×4 排布。 */
function colourGrid(id, current) {
  return nesColorGrid({
    current,
    pickAttribute: "data-boot-colour-value",
    cellAttributes: () => `data-boot-colour-pick="${esc(id)}"`,
  });
}

/** 取色器开在哪一行下面：id 前缀匹配就摊在这一行之后。 */
function colourGridFor(prefix, current) {
  return openColourField?.startsWith(prefix)
    ? colourGrid(openColourField, current) : "";
}

// ——— UI 树 ————————————————————————————————————————————————————————
//
// 屏是根，画面元素是它的组件。层级由**覆盖关系**决定，不是另外记一份结构：
// 一个元素的格子范围完整落在另一个里面，它就是那个的子节点（标题画面的金色
// 字压在山形背景上）；互不相交就并列（启动 Logo 的厂商标与 PRESENTS 行）。
// 这样树永远是 elements 的一个视图，不会和它对不上——ROM 里本来也只有一张
// 32×30 的 nametable，元素是这张表上互相认得出的区域，没有第二份层级数据。
//
// 部分相交（谁也不含谁）目前不存在；真出现时按并列处理，不凭空造父节点。
const SCREEN_NODE = "screen";

function contains(outer, inner) {
  return outer.top <= inner.top && outer.left <= inner.left
    && outer.bottom >= inner.bottom && outer.right >= inner.right
    && (outer.rows * outer.columns) > (inner.rows * inner.columns);
}

/** 把 elements 摊成一棵树的深度优先序列：[{element, depth}]。 */
function elementNodes(screen) {
  const elements = screen.elements || [];
  const area = bounds => bounds.rows * bounds.columns;
  const parentOf = element => {
    // 多个候选父节点时取最小的那个：直接父节点才是层级上真正的那一层。
    let best = null;
    for (const other of elements) {
      if (other === element || !contains(other.bounds, element.bounds)) continue;
      if (!best || area(other.bounds) < area(best.bounds)) best = other;
    }
    return best;
  };
  const childrenOf = parent => elements.filter(item => parentOf(item) === parent);
  const walk = (parent, depth) => childrenOf(parent).flatMap(element =>
    [{element, depth}, ...walk(element, depth + 1)]
  );
  return walk(null, 1);
}

function treeMarkup(screen) {
  const track = timelineTrack(screen, effective(playbackView));
  const segments = (track?.segments || []).map(segment => ({
    id: `segment:${segment.id}`, kind: "segment", label: segment.label.replace('PUSH START', '开始提示'),
    detail: segmentTitle(segment), depth: 1,
  }));
  const geometry = screen.nametable || {};
  const root = {
    id: SCREEN_NODE,
    kind: "screen",
    label: screen.label,
    detail: `${track?.segments.length || 0} 段 · ${Number(geometry.columns || 32)}×${
      Number(geometry.rows || 30)} 格`,
    depth: 0,
  };
  const children = elementNodes(screen).map(({element, depth}) => ({
    id: element.id,
    kind: element.kind,
    label: ({'title-letters': '标题字', 'push-start': '开始提示',
      'copyright-publisher': '发行商版权行', 'copyright-developer': '开发商版权行',
      'presents-line': '厂商标题行'})[element.id] || element.label,
    detail: `${elementTreeTypeLabel(
      BOOT_ELEMENT_TREE_TYPES,
      element.kind,
      ELEMENT_TREE_LABELS.component,
    )} · ${element.bounds.rows}×${
      element.bounds.columns} 格 · 行 ${element.bounds.top} 列 ${element.bounds.left}`,
    depth,
  }));
  return elementTree({
    nodes: [root, ...segments, ...children].map(node => ({...node,
      hoverDetail: node.detail, detail: '', labelMarkup: esc(node.label), detailMarkup: ''})),
    types: BOOT_ELEMENT_TREE_TYPES,
    showIcons: false,
    selectedId: selectedSegment ? `segment:${selectedSegment}` : selectedElement || SCREEN_NODE,
    buttonAttributes: node => ({"data-boot-node": node.id, title: node.label}),
  });
}

function screenDetails(screen, values) {
  const nametable = screen.nametable || {};
  const timing = screen.timing || {};
  return `<dl class="boot-facts">
      <div><dt>画面</dt><dd class="mono">${Number(nametable.columns || 32)}×${
        Number(nametable.rows || 30)} 格 · ${SCREEN_WIDTH}×${SCREEN_HEIGHT} 像素</dd></div>
      <div><dt>组件</dt><dd>${(screen.elements || []).length} 个</dd></div>
      <div><dt>停留</dt><dd>${timing.hold_frames
        ? `${timing.hold_frames} 帧` : "—"}</dd></div>
    </dl>
    <div class="boot-swatches">${Array.from({length: 4}, (_, group) =>
      `<div class="boot-swatch-row"><b>组 ${group}</b>${
        bootPreviewPaletteEntries(values.palette).slice(group * 4, group * 4 + 4)
          .map(value => swatch(value)).join("")}</div>`).join("")}</div>
    ${bankChoices(screen, screen.chr_slots || [])}`;
}

// ——— 组件能力 ————————————————————————————————————————————————————————
//
// 一个组件能做什么，由「它是什么类型」和「这一屏的硬限制允许什么」共同决定，
// 不由页面写死。图像组件能画笔改格、能换 CHR bank；文本组件改的是字，但前提
// 是这一屏有字形表——标题屏的字模散落在图形页里，只有用到的那十几个字存在，
// 打不出第十七个字；Logo 屏的字来自 CHR-RAM 那 128 个连续拉丁字模，可以自由
// 打字。同一个「文本组件」，两屏给出的可用集不同，这就是能力要从数据里算、
// 不能写死在组件类型上的原因。
const COMPONENT_KINDS = Object.freeze({
  background: {
    label: ELEMENT_TREE_LABELS.image,
    capabilities: ["paint", "chr-bank"],
  },
  text: {label: ELEMENT_TREE_LABELS.text, capabilities: ["type"]},
});

const BOOT_ELEMENT_TREE_TYPES = defineElementTreeTypes({
  screen: {icon: ELEMENT_TREE_ICONS.group, label: ELEMENT_TREE_LABELS.screen},
  segment: {icon: ELEMENT_TREE_ICONS.action, label: "演出段"},
  background: {
    icon: ELEMENT_TREE_ICONS.layer,
    label: COMPONENT_KINDS.background.label,
  },
  text: {icon: ELEMENT_TREE_ICONS.text, label: COMPONENT_KINDS.text.label},
});

/**
 * 这一屏能打的字 → 屏上的 tile 编号。
 *
 * 这里是**使用现场的适配器**，不是字库的一部分。字库（project.text-fonts）只说
 * 「字形序号 $0A 是 A」；这一屏说「我把字库挂在窗口 $80」。两者相加才是 tile
 * 编号。所以同一个字库换一屏挂载，这里算出来的 tile 就不同，而字库不用改。
 *
 * 标题屏那种 opportunistic 字模不属于任何字库，它的字符→tile 由本屏自己登记，
 * 直接用。
 */
function fontGlyphs(screen) {
  const binding = screen?.font;
  const glyphs = new Map();
  if (!binding) return glyphs;
  if (binding.kind === "opportunistic") {
    for (const [character, tile] of Object.entries(binding.glyphs || {})) {
      glyphs.set(character, {tile, witnessed: true});
    }
    return glyphs;
  }
  const font = (state.project?.text_fonts?.fonts || []).find(
    item => item.id === binding.font_ref
  );
  if (!font) return glyphs;
  const base = Number(binding.window_first_tile) || 0;
  const witnessed = new Set(font.witnessed || []);
  for (const [index, character] of Object.entries(font.glyphs || {})) {
    glyphs.set(character, {
      tile: base + Number(index),
      witnessed: witnessed.has(Number(index)),
    });
  }
  if (binding.blank_tile !== undefined && binding.blank_tile !== null) {
    glyphs.set(" ", {tile: Number(binding.blank_tile), witnessed: true});
  }
  return glyphs;
}

/** 当前 nametable 上这一行读出来是什么字。nametable 是唯一真相，文字是它的视图。 */
function decodeElementText(values, element, screen) {
  const info = element.text;
  const byTile = new Map();
  for (const [character, {tile}] of fontGlyphs(screen)) {
    if (!byTile.has(tile)) byTile.set(tile, character);
  }
  const tiles = values.nametable || [];
  let text = "";
  let readable = true;
  for (let column = 0; column < element.bounds.columns; column += 1) {
    const tile = tiles[info.row * defaultGeometry.columns + info.column + column];
    const character = byTile.get(tile);
    if (character === undefined) {
      readable = false;
      text += "�";
      continue;
    }
    text += character;
  }
  return {text: text.replace(/\s+$/, ""), readable};
}

/** 把字排成 tile 序列。字库里没有的字符不猜、不替换，原样报回去。 */
function encodeText(text, element, screen) {
  const glyphs = fontGlyphs(screen);
  const blank = Number(screen.font?.blank_tile ?? 0);
  const tiles = [];
  const rejected = [];
  const candidates = [];
  for (const character of text) {
    const glyph = glyphs.get(character);
    if (!glyph) {
      rejected.push(character);
      continue;
    }
    // 没有实测证据的字形是按字库排布推出来的，打出来要人核一眼。
    if (!glyph.witnessed) candidates.push(character);
    tiles.push(glyph.tile);
  }
  while (tiles.length < element.bounds.columns) tiles.push(blank);
  return {tiles, rejected, candidates};
}

/** CHR 窗口只放置所属字段对象的引用选择器。 */
function bankChoices(screen, slots) {
  if (!slots.length) return "";
  return Array.from({length: Math.ceil(slots.length / 2)}, (_, row) =>
    `<div class="boot-tool-row"><small>${row === 0 ? "图案组" : ""}</small>
      <div class="boot-bank-row">${slots.slice(row * 2, row * 2 + 2).map(slot =>
        `<div class="boot-bank"><small>图案组 ${(screen.chr_slots || []).indexOf(slot) + 1}</small>
          <div data-boot-bank-reference="${esc(String(slot.register))}"></div></div>`
      ).join("")}</div></div>`).join("");
}

function imageComponentEditor(screen, values, element, entries, sharedPalette) {
  // 元素的 tile 编号落在哪个 1 KiB 窗口，就只给哪个窗口的 bank——整屏六个
  // 寄存器摊开在页面底部时，没人看得出哪个管的是这个图。
  const base = Number(screen.background_pattern_base) || 0;
  const [first, last] = element.tile_range || [0, 0];
  const slots = (screen.chr_slots || []).filter(slot => {
    const start = Number(slot.ppu_base);
    const end = start + Number(slot.length);
    return base + last * 16 >= start && base + first * 16 < end;
  });
  return `<div class="boot-component">
    <div class="boot-tool-row">
      <small>图块</small>
      <attack-chr-tile-selector data-boot-brush aria-label="选择图案画笔"></attack-chr-tile-selector>
    </div>
    <small>${(screen.chr_slots || []).filter(slot => Number(slot.ppu_base) >= base
      && Number(slot.ppu_base) < base + PATTERN_TABLE_BYTES)
      .sort((left, right) => Number(left.ppu_base) - Number(right.ppu_base))
      .map(slot => slot.storage === 'chr-ram' ? '固定字形' : '图案').join(' · ')}</small>

    ${paletteEditor(element, entries, sharedPalette, {brush: true})}

    ${bankChoices(screen, slots)}
  </div>`;
}

/** CHR bank 的候选、过滤与预览由共用引用组件提供。 */
async function paintBootBankPickers(view) {
  const hosts = [...document.querySelectorAll('[data-boot-bank-reference]')];
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!hosts.length || !screen || !values) return;
  const prepared = await prepareModuleComponent('shared-chr-bank', 'reference');
  for (const host of hosts) {
    if (!host.isConnected) continue;
    const register = host.dataset.bootBankReference;
    const slot = (screen.chr_slots || []).find(item => String(item.register) === register);
    if (!slot) continue;
    const value = Number(values.chr_banks?.[register] ?? slot.bank);
    host.innerHTML = renderModuleComponent('shared-chr-bank', 'reference', {...prepared,
      value, label: `图案组 ${(screen.chr_slots || []).indexOf(slot) + 1}`, picker: {compact: true, previewPanel: true, lazyOptions: true},
      controlMarkup: `<input type="number" min="0" max="255" value="${value}" hidden
        data-boot-chr-bank="${esc(register)}">`,
    });
    await hydrateModuleComponents(host);
  }
}

/** 文本组件：直接填字。字库能不能支撑，由这一屏的 font 决定。 */
function textComponentEditor(screen, values, element, entries, sharedPalette) {
  const binding = screen.font;
  const info = element.text;
  const glyphs = fontGlyphs(screen);
  if (!binding || !info || !glyphs.size) {
    return `<div class="boot-component">
      <label class="boot-text-field">
        <small>显示的字</small>
        <input type="text" value="" disabled>
      </label>
    </div>`;
  }
  const current = decodeElementText(values, element, screen);
  const available = [...glyphs.keys()].filter(character => character !== " ").join("");
  return `<div class="boot-component">
    <label class="boot-text-field"
      title="最多 ${element.bounds.columns} 字">
      <small>显示的字 <b class="mono">${current.text.length}/${element.bounds.columns}</b></small>
      ${fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.nametable`,
        name: 'value0', type: 'text', value: current.text,
        className: current.readable ? '' : 'is-unreadable',
        attributes: `id="boot-text" maxlength="${element.bounds.columns}" spellcheck="false"
          data-boot-text="${esc(element.id)}" aria-label="${esc(element.label)}的文字"`})}
    </label>
    <p class="boot-note" id="boot-text-note" hidden></p>
    <div class="boot-tool-row">
      <small>可用字形</small>
      <p class="boot-glyphs">${esc(available)}</p>
    </div>
    ${paletteEditor(element, entries, sharedPalette)}
  </div>`;
}

function componentEditor(screen, values, element, entries, sharedPalette) {
  const kind = COMPONENT_KINDS[element.kind];
  if (!kind) return "";
  if (kind.capabilities.includes("type")) {
    return textComponentEditor(screen, values, element, entries, sharedPalette);
  }
  return imageComponentEditor(screen, values, element, entries, sharedPalette);
}

/**
 * 调色板，行首就是画笔。
 *
 * 属性组和调色板本来是同一件事的两半：一行 = 一支画笔（属性组）+ 它蘸的四个
 * 颜色。原来拆成「四个组按钮」和「一张按组分行的表」两节摆着，人得自己在两处
 * 之间对号入座。合成一行之后，点行首是**用这支画笔**，点后面的色块是**调这支
 * 画笔的颜色**。
 *
 * 图像组件四组都列出来：要在这片地盘上铺一片新颜色，就得先拿一支当前没用到的
 * 画笔去涂。文本组件没有画笔，只列它自己用的那一组。
 *
 * 能不能改色按**本组件用没用到这一组**决定。厂商标只用了组 0/1/2，从它这里改
 * 组 3 的颜色，改的是别人（PRESENTS 行）的颜色——那不该从这个组件的面板发生。
 */
function paletteEditor(element, entries, sharedPalette, {brush = false} = {}) {
  const used = new Set(element.palette_groups?.length
    ? element.palette_groups
    : [element.palette?.group].filter(group => group !== undefined));
  const groups = brush ? [0, 1, 2, 3] : [...used];
  if (!groups.length) return "";
  const shared = sharedPalette ? "；本屏背景与精灵共用同一份，改一处两处都变" : "";
  return `<div class="boot-tool-row">
    <small>${brush ? "属性组画笔与配色" : "调色板"}</small>
    ${groups.map(group => {
      const editable = used.has(group);
      // 「当前是哪一组」和「手上拿的是哪支画笔」是两件事：拿起图块画笔时组不会
      // 消失——图块仍然按这一组的四色显示、落笔也按这一组。所以组框常驻，只有
      // 属性画笔真正装填时才额外高亮。以前两者共用一个 is-armed，一点图块整行
      // 的框就没了，看着像组选择被清掉了。
      const currentGroup = brush && brushGroup === group;
      const armed = currentGroup && brushKind === "attributes";
      const open = openColourField?.startsWith(`palette:${group}:`);
      const current = open
        ? entries[group * 4 + Number(openColourField.split(":")[2])] : 0;
      return `<div class="boot-swatch-row${currentGroup ? " is-current" : ""}${
        armed ? " is-armed" : ""}">
        ${brush ? `<button class="button ghost boot-group${
          currentGroup ? " is-active" : ""}${editable ? "" : " boot-group--unused"}"
          data-boot-brush-group="${group}"
          title="用组 ${group} 的属性画笔${
            editable ? "" : "（本组件当前没有用到这一组）"}">组 ${group}</button>`
          : `<b>组 ${group}</b>`}
        ${[0, 1, 2, 3].map(index => colourButton(
          `palette:${group}:${index}`,
          entries[group * 4 + index],
          {
            disabled: !editable || (index === 0 && group !== 0),
            title: index === 0
              ? "第 0 色是整屏通用色，四组共用，在组 0 里改"
              : editable
                ? `组 ${group} 第 ${index} 色${shared}`
                : `本组件没有用到组 ${group}，改它只会影响别的组件`,
          },
        )).join("")}
      </div>
      ${open ? colourGrid(openColourField, current) : ""}`;
    }).join("")}
  </div>`;
}

/** 组件事实与编辑控件分开呈现。 */
function elementCard(element) {
  const bounds = element.bounds;
  return `<article class="boot-element">
    <dl class="boot-facts">
      <div><dt>类别</dt><dd>${esc(elementTreeTypeLabel(
        BOOT_ELEMENT_TREE_TYPES,
        element.kind,
        ELEMENT_TREE_LABELS.component,
      ))}</dd></div>
      <div title="判定这个组件时用的行带，也是画笔能覆盖的整片区域；画面上是那个实线框"
        ><dt>地盘</dt><dd class="mono">${element.territory
          ? `行 ${element.territory.top}-${element.territory.bottom}${
            element.territory.attribute_group === null ? ""
              : ` · 组 ${element.territory.attribute_group}`}`
          : "—"}</dd></div>
      <div title="在地盘里实测出来的当前内容范围；画面上是那个暗色虚线框"
        ><dt>内容</dt><dd class="mono">行 ${bounds.top}-${bounds.bottom} ·
        列 ${bounds.left}-${bounds.right}</dd></div>
      <div><dt>格数</dt><dd class="mono">${element.tile_count} 格 /
        ${element.distinct_tiles} 种</dd></div>
      <div><dt>渐显段</dt><dd>${element.fade ? esc(element.fade) : "随整屏淡入"}</dd></div>
    </dl>
  </article>`;
}

function parameterRows(screen, values) {
  return (screen.parameters || []).map(parameter => {
    const current = values.parameters?.[parameter.id] ?? parameter.value;
    const changed = current !== parameter.value;
    return `<tr${changed ? ' class="is-changed"' : ""}>
      <td>${esc(parameterLabel(parameter.label))}</td>
      <td>${fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.parameters`,
        name: parameter.id, value: current, min: 0, max: 255,
        attributes: `step="1" data-boot-parameter="${esc(parameter.id)}"
          aria-label="${esc(parameterLabel(parameter.label))}"`})}</td>
      <td class="mono">${hex(parameter.value, 2)}</td>
    </tr>`;
  }).join("");
}

function parameterLabel(label) {
  return String(label || "").replace(/\s*\$[0-9A-F]{2}$/i, "");
}

function spriteRows(screen, values) {
  const original = screen.sprites?.entries || [];
  return (values.sprites || []).map((sprite, index) => {
    const source = original[index] || {};
    const changed = sprite.row !== source.row || sprite.column !== source.column
      || sprite.tile !== source.tile;
    return `<tr${changed ? ' class="is-changed"' : ""}>
      <td class="mono">${index}</td>
      ${screen.id === "title" ? "" : `<td>${fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.sprites.tile`,
        name: `value${index}`, value: sprite.tile, min: 0, max: 255,
        attributes: `step="1" data-boot-sprite="${index}" data-boot-field="tile"
          aria-label="第 ${index} 个精灵 tile"`})}</td>`}
      <td>${fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.sprites.row`,
        name: `value${index}`, value: sprite.row, min: 0, max: 29,
        attributes: `step="1" data-boot-sprite="${index}" data-boot-field="row"
          aria-label="第 ${index} 个精灵行"`})}</td>
      <td>${fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.sprites.column`,
        name: `value${index}`, value: sprite.column, min: 0, max: 31,
        attributes: `step="1" data-boot-sprite="${index}" data-boot-field="column"
          aria-label="第 ${index} 个精灵列"`})}</td>
      <td class="mono">x=${(sprite.column * 8 - 5) & 0xFF} y=${(sprite.row * 8 - 1) & 0xFF}</td>
    </tr>`;
  }).join("");
}

// ——— 演出时间轴 ————————————————————————————————————————————————
//
// 这一屏的时间相关的东西只有这一处：走带、每条轨道、以及轨道上那几个能改的
// 字节。原来「拖动条在画面下、帧数在下面的表里填空」是把同一件事拆成两处看，
// 改一个数字要在两块之间来回对。
//
// 轨道按**帧**定位：块的左边界和宽度都是 起止帧 / 总帧数，所有轨道共用这一套
// 映射，所以竖着看是同一时刻。段是文档给的编排，本页不排；帧数按当前编辑值
// 现算，把「每段等待」从 90 改成 30，条上四段一起变短——它们本来就是同一个
// 立即数，这件事在轨道上一眼能看出来，在表里看不出来。
//
// 曲线只呈现，不能拉：滚动那条折线的形状（线性、每 2 帧 1 像素）是循环体的
// 形状，写死在机器码里。能改的只有端点值，所以端点是输入框而不是拖拽手柄——
// 手柄会让人以为形状也能改。
function timelinePanel(screen, values) {
  const track = timelineTrack(screen, values);
  if (!track || !track.totalFrames) return "";
  // 改短等待后，播放头也收回新的末帧，不能保留超出轨道的画面与读数。
  if (playhead !== null) playhead = Math.min(playhead, track.totalFrames);
  const frame = playhead ?? track.totalFrames;
  const live = playhead !== null;
  const seconds = framesToSeconds(track.totalFrames).toFixed(2);
  return `<section class="presentation-timeline">${timelinePlayer({
    id: `boot:${screen.id}`,
    title: screen.timeline.label || "演出时间轴",
    step: true,
    totalFrames: track.totalFrames,
    frame,
    playing,
    live,
    status: phaseText(track, frame, selectedSegment),
    lanes: bootLanes(screen, values, track),
    labelWidth: 360,
    viewport: timelineViewports.get(screen.id) || {},
    // 刻度轴是均匀帧刻度，段边界另画成记号——两者回答的不是同一个问题。
    markers: track.segments.filter(segment => segment.start > 0).map(segment => ({
      frame: segment.start,
      tone: segment.frames > 0 ? "event" : "instant",
      title: segmentTitle(segment),
    })),
    transport: `<button type="button" class="button ghost" id="boot-playback-exit"
      ${live ? "" : "disabled"}
      title="回到编辑视图">编辑</button>${previewSoundControl()}${timelineViewportControls()}`,
    footer: `${keyframeEditor(screen, values, track)}
      ${colourGridFor("fade:", openFadeColour(screen, values))}
      <p class="boot-note" id="boot-playback-note">${esc(playbackNote(live))}</p>
      <details class="boot-timeline-reference">
        <summary>参数与渐显 · ${track.totalFrames} 帧（≈${seconds} s）</summary>
        ${referenceTables(screen, values)}
      </details>`,
  })}</section>`;
}

/** 打开中的取色器落在哪个渐变步上——取色格要拿当前值高亮。 */
function openFadeColour(screen, values) {
  if (!openColourField?.startsWith("fade:")) return 0;
  const [, ...rest] = openColourField.split(":");
  const slot = Number(rest.pop());
  const step = Number(rest.pop());
  const fade = rest.join(":");
  return (values.fades?.[fade]
    || (screen.fades || []).find(item => item.id === fade)?.steps
    || [])[step]?.[slot] ?? 0;
}

function laneNumber(screen, id, value, {min = 0, max = 255, title = ""} = {}) {
  return fieldObjectInputMarkup({handle: `${RESOURCE_ID}:${screen.id}.parameters`,
    name: id, value, min, max, className: 'tl-number',
    attributes: `step="1" data-boot-timeline-parameter="${esc(id)}"
      ${title ? `title="${esc(title)}"` : ""} aria-label="${esc(title || id)}"`});
}

const swatchColour = nesColorCss;

/**
 * 开机演出装配哪些轨道。
 *
 * 轨道按**语义**分行，不按 timeline.steps 逐条列：同一个参数驱动的几段属于同一
 * 行（等待就是四段一行），这样「改一个数四段一起动」是看得见的。哪些行成立完全
 * 由文档里有哪些步决定——Logo 屏没有渐显与滚动，那几行自然不出现。
 */
function bootLanes(screen, values, track) {
  const lanes = [{id: "segment", label: "演出段", kind: "span",
    control: `<small>${track.segments.length} 段</small>`,
    blocks: track.segments.map(segment => ({start: segment.start, frames: segment.frames,
      label: segment.label, title: segmentTitle(segment), tone: "shot",
      data: {"boot-segment": segment.id}})),
  }];
  const parameter = id => parameterValue(screen, values, id);
  const initial = screen.timeline.initial || {};

  const waits = track.segments.filter(segment => segment.kind === "wait");
  if (waits.length) {
    const id = waits[0].frames_parameter;
    lanes.push({
      id: "wait",
      label: waits.length > 1 ? "等待" : waits[0].label,
      control: laneNumber(screen, id, parameter(id), {title: "帧数"}),
      kind: "span",
      blocks: waits.map(segment => ({
        start: segment.start, frames: segment.frames, label: segment.frames,
        tone: "wait", title: segmentTitle(segment),
      })),
    });
  }

  for (const segment of track.segments.filter(item => item.kind === "fade")) {
    const fade = (screen.fades || []).find(item => item.id === segment.fade);
    const steps = values.fades?.[segment.fade] || fade?.steps || [];
    const perStep = parameterFrames(screen, values, segment.frames_parameter);
    lanes.push({
      id: `fade:${segment.fade}`,
      label: segment.label,
      control: `${laneNumber(screen, segment.frames_parameter, parameter(segment.frames_parameter), {title: "每步帧数"})}
        <small>帧 × ${steps.length} 步</small>`,
      kind: "key",
      // 一步只有几帧宽（6 帧 ≈ 轨道的 1%），四个能点的色块塞不进去，所以块里
      // 只画那 4 个颜色本身——它是关键帧的样子，不是控件。点它选中，颜色到
      // 下面那条编辑栏里改。
      blocks: steps.map((step, index) => ({
        start: segment.start + index * perStep,
        frames: perStep,
        colours: step.map(swatchColour),
        tone: "fade",
        selected: selectedFadeStep?.fade === segment.fade
          && selectedFadeStep?.index === index,
        data: {"boot-fade-step": `${segment.fade}:${index}`},
        title: `${segment.label} 第 ${index + 1} 步　第 ${
          segment.start + (index + 1) * perStep} 帧写入　点开改颜色`,
      })),
    });
  }

  for (const segment of track.segments.filter(item => item.kind === "palette")) {
    lanes.push({
      id: `palette:${segment.id}`,
      label: segment.label,
      control: `<small>整版</small>`,
      kind: "key",
      blocks: [{
        start: segment.start,
        colours: paletteAt(screen, values, segment).slice(0, 16).map(swatchColour),
        tone: "palette",
        title: `${segment.label}　第 ${segment.start} 帧`,
      }],
    });
  }

  const sound = track.segments.find(segment => segment.kind === "sound");
  if (sound) {
    lanes.push({
      id: "sound",
      label: sound.label,
      control: `<b>${esc(audioCommandLabel(parameter(sound.value_parameter)))}</b> ` + laneNumber(screen, sound.value_parameter,
        parameter(sound.value_parameter), {title: "声音命令"}),
      kind: "key",
      blocks: [{
        start: sound.start, label: "♪", tone: "sound",
        title: `${sound.label} · ${audioCommandLabel(parameter(sound.value_parameter))}　第 ${sound.start} 帧`,
      }],
    });
  }

  const scroll = track.segments.find(segment => segment.kind === "scroll");
  if (scroll) {
    lanes.push({
      id: "scroll-y",
      label: "纵向滚动",
      control: `${laneNumber(screen, scroll.from_parameter, parameter(scroll.from_parameter),
        {title: "起点"})}<small>→</small>${laneNumber(screen,
        scroll.to_parameter, parameter(scroll.to_parameter), {title: "终点"})}`,
      kind: "curve",
      curve: scrollCurve(screen, values, track, scroll),
    });
  } else {
    lanes.push({
      id: "scroll-y",
      label: "纵向滚动",
      control: laneNumber(screen, initial.scroll_y_parameter,
        parameter(initial.scroll_y_parameter), {title: "整屏纵向偏移"}),
      kind: "flat",
    });
  }

  lanes.push({
    id: "scroll-x",
    label: "横向滚动",
    control: laneNumber(screen, initial.scroll_x_parameter,
      parameter(initial.scroll_x_parameter), {title: "整屏横向偏移"}),
    kind: "flat",
  });

  const sprites = track.segments.find(segment => segment.kind === "sprites");
  if (sprites) {
    lanes.push({
      id: "sprites",
      label: "精灵显示",
      control: `<small>改不了</small>`,
      kind: "span",
      blocks: [
        {start: 0, frames: sprites.start, label: "关", tone: "off",
         title: "精灵未显示"},
        {start: sprites.start, frames: track.totalFrames - sprites.start,
         label: "开", tone: "on", title: segmentTitle(sprites)},
      ],
    });
  }
  return lanes;
}

/** 某一步装载的整版调色板：文档说是屏的那份就取屏的，说是填充就填。 */
function paletteAt(screen, values, segment) {
  const fill = segment.palette_fill;
  return fill === undefined || fill === null
    ? bootPreviewPaletteEntries(values.palette) : new Array(32).fill(Number(fill));
}

/**
 * 滚动那条曲线的数据。壳负责画，本函数只给点：横轴是帧、纵轴是 $15 的真实值域。
 *
 * 循环跑完 $15 会归 0。240 与 0 在 nametable 上是同一处，所以那一步默认不画成
 * 落差——但如果终点被改成别的值，归零就真是一次跳变，那时必须画出来。
 */
function scrollCurve(screen, values, track, segment) {
  const from = parameterValue(screen, values, segment.from_parameter);
  const to = parameterValue(screen, values, segment.to_parameter);
  const reset = Number(segment.reset_value ?? 0);
  const height = defaultGeometry.rows * 8;
  const wrap = value => ((value % height) + height) % height;
  const tail = wrap(to) === wrap(reset) ? to : reset;
  const {span, pace, cycle} = scrollTiming(screen, values, segment);
  const points = [[0, from], [segment.start, from]];
  // 起终点相等仍走一圈；跨零处画出跳变，不能把整段画成水平线。
  for (let increment = 1; increment <= span; increment += 1) {
    const value = (from + increment) & (cycle - 1);
    const frame = segment.start + increment * pace;
    if (value === 0) points.push([frame, cycle - 1]);
    points.push([frame, value]);
  }
  points.push([segment.end, tail], [track.totalFrames, tail]);
  return {
    min: 0,
    max: cycle - 1,
    points,
    markers: [{frame: segment.start, label: from}, {frame: segment.end, label: to}],
  };
}

// 选中的渐变步。轨道上的块太窄，放不下四个能点的色块，所以颜色在这条编辑栏
// 里改；块只负责「在哪一帧、是什么颜色」。
let selectedFadeStep = null;

/** 选中步的四个颜色。没选中时也占一行，免得选中/不选中之间高度跳一下。 */
function keyframeEditor(screen, values, track) {
  const fade = (screen.fades || []).find(item => item.id === selectedFadeStep?.fade);
  const segment = track.segments.find(item => item.fade === selectedFadeStep?.fade);
  if (!fade || !segment) {
    return `<div class="boot-timeline-keyframe is-empty"
      >${(screen.fades || []).length
        ? "点轨道上的渐变步，在这里改那一步的四个颜色"
        : "这一屏没有分段渐显：整版调色板一次装完"}</div>`;
  }
  const index = selectedFadeStep.index;
  const steps = values.fades?.[fade.id] || fade.steps;
  const step = steps[index] || [];
  const perStep = parameterFrames(screen, values, segment.frames_parameter);
  return `<div class="boot-timeline-keyframe">
    <b>${esc(fade.label)}</b>
    <small>第 ${index + 1} / ${steps.length} 步
      第 ${segment.start + (index + 1) * perStep} 帧显示</small>
    ${step.map((value, slot) => colourButton(
      `fade:${fade.id}:${index}:${slot}`, value,
      {title: `第 ${index + 1} 步第 ${slot} 色`},
    )).join("")}
  </div>`;
}

function referenceTables(screen, values) {
  const parameters = `<div class="table-wrap"><table>
    <thead><tr><th>参数</th><th>当前</th><th>原值</th></tr></thead>
    <tbody>${(screen.parameters || []).map(item => {
      const current = values.parameters?.[item.id] ?? item.value;
      return `<tr${current !== item.value ? ' class="is-changed"' : ""}>
        <td>${esc(parameterLabel(item.label))}</td><td class="mono">${current}</td>
        <td class="mono">${hex(item.value, 2)}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
  const fades = (screen.fades || []).length ? `<div class="table-wrap"><table>
    <thead><tr><th>渐显段</th><th>驱动的元素</th></tr></thead>
    <tbody>${(screen.fades || []).map(fade => `<tr>
      <td>${esc(fade.label)}</td>
      <td>${esc((screen.elements || []).filter(item => item.fade === fade.id)
        .map(item => item.label).join("、") || "—")}</td>
    </tr>`).join("")}</tbody></table></div>` : "";
  return parameters + fades;
}

function phaseText(track, frame, selectedId = null) {
  const segment = track.segments.find(segment => segment.id === selectedId) || segmentAt(track, frame);
  if (!segment) return "";
  const position = `段 ${track.segments.indexOf(segment) + 1} / ${track.segments.length}`;
  return segment.frames > 0
    ? `${position} · ${segment.label}　第 ${segment.start}-${segment.end - 1} 帧`
    : `${position} · ${segment.label}　第 ${segment.start} 帧`;
}

function segmentTitle(segment) {
  const span = segment.frames > 0
    ? `第 ${segment.start}-${segment.end - 1} 帧，共 ${segment.frames} 帧`
    : `第 ${segment.start} 帧，瞬时`;
  return [segment.label, span].join("　");
}

/**
 * 拖动、播放、点段都走这里：只改画面与进度条自己那几处，**不整页重绘**。
 *
 * 不重绘不是为了省时间：拖动中的重绘会把滑块本身换掉，指针捕获跟着丢，一拖
 * 就断。所以进出回放态该变的东西（光标、画笔、按钮、说明）都在这里就地改，
 * 画笔的真正守门在 paintCell。
 */
function seekPlayback(view, frame) {
  const screen = bootPresentationScreen(view);
  const track = timelineTrack(screen, effective(view));
  if (!track) return;
  playhead = Math.max(0, Math.min(track.totalFrames, Math.round(frame)));
  paintPlaybackFrame(view, playhead);
  syncPlaybackControls(view, track);
}

function exitPlayback() {
  stopPlayback();
  selectedSegment = null;
  playhead = null;
  rerenderPlayback?.();
}

// 走带、读数、播放头都归 ui/timeline-player.js；本页只补自己那几处：编辑按钮、
// 说明行、画布光标。
function syncPlaybackControls(view, track) {
  const live = playhead !== null;
  const frame = playhead ?? track.totalFrames;
  syncBootSegment(view, track, frame);
  syncTimelinePlayer(timelineRoot(), {
    frame,
    totalFrames: track.totalFrames,
    playing,
    live,
    status: phaseText(track, frame, selectedSegment),
    currentBlockFrame: segmentAt(track, frame)?.start ?? null,
  });
  const exit = $("#boot-playback-exit");
  if (exit) exit.disabled = !live;
  const note = $("#boot-playback-note");
  if (note) note.textContent = playbackNote(live);
  // 回放中画笔停用，光标不能再是十字——那会让人以为落笔有效。
  const canvas = $("#boot-screen");
  if (canvas && live) {
    canvas.classList.remove("boot-canvas--paint");
    canvas.classList.add("boot-canvas--idle");
  }
}

function bootSegmentInspector(screen, values, segment) {
  if (!segment) return "";
  return `<article data-boot-segment-inspector="${esc(segment.id)}">
    <dl class="boot-facts"><div><dt>帧</dt><dd>${segment.start}–${
      segment.frames ? segment.end - 1 : segment.start}</dd></div>
      <div><dt>类型</dt><dd>${esc(segment.kind)}</dd></div>
      <div><dt>时长</dt><dd>${segment.frames}</dd></div>${
      [segment.frames_parameter, segment.value_parameter, segment.from_parameter,
        segment.to_parameter].filter(Boolean).map(id => `<div><dt>${esc(id)}</dt>
          <dd>${parameterValue(screen, values, id)}</dd></div>`).join("")}
    </dl></article>`;
}

function syncBootSegment(view, track, frame) {
  const preferred = timelineRoot()?.dataset.bootSelectedSegment;
  if (timelineRoot()) delete timelineRoot().dataset.bootSelectedSegment;
  const segment = track.segments.find(segment => segment.id === preferred) || segmentAt(track, frame);
  if (!segment) return;
  document.querySelectorAll("[data-boot-node]").forEach(button => {
    const selected = button.dataset.bootNode === `segment:${segment.id}`;
    button.setAttribute("aria-pressed", String(selected));
    button.closest(".element-tree-node")?.classList.toggle("is-selected", selected);
  });
  const inspector = inspectorNode();
  if (selectedSegment === segment.id
      && inspector?.querySelector(`[data-boot-segment-inspector="${segment.id}"]`)) return;
  selectionGeneration++;
  if (inspector) delete inspector.closest('[data-screen-workbench]').dataset.bootSelecting;
  selectedElement = null;
  selectedSegment = segment.id;
  const screen = bootPresentationScreen(view);
  if (inspector) inspector.innerHTML = `<h3>${esc(segment.label)}</h3>${
    bootSegmentInspector(screen, effective(view), segment)}`;
}

const timelineRoot = () => document.querySelector(`[data-tl^="boot:"]`);

const playbackNote = live => live
  ? "运行时画面"
  : "编辑画面";

// rerender 由 bind 传进来；只有退出回放要整页重绘一次，帧推进不需要。
let rerenderPlayback = null;

/** 走带交互全归壳；本页只交出「多少帧」「现在第几帧」和一个跳过规则。 */
function bindTimelineScrub(view) {
  const screen = bootPresentationScreen(view);
  const total = () => timelineTrack(screen, effective(view))?.totalFrames ?? 0;
  timelineRoot()?.addEventListener("click", event => {
    const segment = event.target.closest?.("[data-boot-segment]")?.dataset.bootSegment;
    if (segment) timelineRoot().dataset.bootSelectedSegment = segment;
  }, true);
  bindTimelinePlayer(timelineRoot(), {
    totalFrames: total,
    currentFrame: () => playhead ?? total(),
    onSeek: frame => {
      stopPlayback();
      seekPlayback(view, frame);
    },
    onToggle: () => togglePlayback(view),
    onViewport: value => timelineViewports.set(screen.id, value),
    // 色块是取色器的开关，不是定位点；它自己处理这次点击。
    skip: event => Boolean(event.target.closest?.("[data-boot-colour]")),
  });
}

function stopPlayback() {
  playing = false;
  playAnchor = null;
  bootAudioPlayer?.dispose();
  bootAudioPlayer = null;
}

function togglePlayback(view) {
  const screen = bootPresentationScreen(view);
  const track = timelineTrack(screen, effective(view));
  if (!track) return;
  if (playing) {
    stopPlayback();
    syncPlaybackControls(view, track);
    return;
  }
  // 停在终点时再按播放，就是从头再来一遍。
  const from = (playhead ?? track.totalFrames) >= track.totalFrames ? 0 : playhead;
  playing = true;
  playAnchor = {frame: from, time: performance.now()};
  startBootAudio(view, screen, track);
  seekPlayback(view, from);
  requestAnimationFrame(() => advancePlayback(view));
}

async function startBootAudio(view, screen, track) {
  bootAudioPlayer?.dispose();
  bootAudioPlayer = null;
  if (!previewSoundEnabled()) return;
  const anchor = playAnchor;
  try {
    await ensureAudioSequenceData({withProject: true});
  } catch (error) {
    if (playAnchor === anchor && playbackView === view && state.view === view)
      showEditorError(document.querySelector("#content"), "剧情声音播放失败", error);
    return;
  }
  if (!playing || playAnchor !== anchor || playbackView !== view || !previewSoundEnabled()) return;
  const values = effective(view);
  const events = track.segments.filter(segment => segment.kind === "sound").map(segment => ({
    frame: segment.start,
    command_id: parameterValue(screen, values, segment.value_parameter),
  }));
  if (view === "cutscene-title" && !events.length) {
    const logo = bootPresentationScreen("cutscene-boot-logo");
    const logoValues = effective("cutscene-boot-logo");
    const logoTrack = timelineTrack(logo, logoValues);
    for (const segment of logoTrack?.segments || []) {
      if (segment.kind === "sound") events.push({frame: segment.start - logoTrack.totalFrames,
        command_id: parameterValue(logo, logoValues, segment.value_parameter)});
    }
  }
  bootAudioPlayer = createAudioTimelinePlayer(state.project.audio, events, track.totalFrames);
  void bootAudioPlayer.play(() => Math.min(track.totalFrames,
    playAnchor.frame + secondsToFrames((performance.now() - playAnchor.time) / 1000))).catch(error =>
    showEditorError(document.querySelector("#content"), "剧情声音播放失败", error));
}

/** 按真实时间推进，不按 rAF 次数——掉帧时快进而不是放慢。 */
function advancePlayback(view) {
  if (!playing || playhead === null) return;
  const screen = bootPresentationScreen(view);
  const track = timelineTrack(screen, effective(view));
  if (!track || !$("#boot-screen")) {
    stopPlayback();
    return;
  }
  const elapsed = (performance.now() - playAnchor.time) / 1000;
  const frame = playAnchor.frame + secondsToFrames(elapsed);
  if (frame >= track.totalFrames) {
    stopPlayback();
    playhead = track.totalFrames;
    paintPlaybackFrame(view, playhead);
    syncPlaybackControls(view, track);
    return;
  }
  playhead = Math.floor(frame);
  paintPlaybackFrame(view, playhead);
  syncPlaybackControls(view, track);
  requestAnimationFrame(() => advancePlayback(view));
}

function bootInspectorContent(screen, values) {
  const selected = (screen.elements || []).find(element => element.id === selectedElement);
  const segment = selectedSegment && timelineTrack(screen, values)?.segments.find(segment => segment.id === selectedSegment);
  return {
    title: segment ? segment.label : selected?.label || screen.label,
    markup: segment ? bootSegmentInspector(screen, values, segment)
      : selected ? componentEditor(screen, values, selected, bootPreviewPaletteEntries(values.palette),
        (values.palette || []).length === 16) + elementCard(selected) : screenDetails(screen, values),
  };
}

async function refreshBootSelection(view, redraw) {
  const generation = ++selectionGeneration;
  const screen = bootPresentationScreen(view), inspector = inspectorNode();
  if (!screen || !inspector) return;
  const isCurrent = () => inspector.isConnected && generation === selectionGeneration && playbackView === view;
  const workbench = inspector.closest('[data-screen-workbench]');
  workbench.dataset.bootSelecting = '';
  try {
    const content = bootInspectorContent(screen, effective(view));
    const {scrollTop, scrollLeft} = inspector;
    inspector.innerHTML = `<h3>${esc(content.title)}</h3>${content.markup}`;
    const selectedId = selectedSegment ? `segment:${selectedSegment}` : selectedElement || SCREEN_NODE;
    document.querySelectorAll('[data-boot-node]').forEach(button => {
      const selected = button.dataset.bootNode === selectedId;
      button.closest('.element-tree-node')?.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const element = screen.elements?.find(element => element.id === selectedElement);
    const paintable = Boolean(COMPONENT_KINDS[element?.kind]?.capabilities.includes('paint') && brushKind && playhead === null);
    const canvas = $('#boot-screen');
    canvas.classList.toggle('boot-canvas--paint', paintable);
    canvas.classList.toggle('boot-canvas--idle', !paintable);
    inspector.scrollTop = scrollTop; inspector.scrollLeft = scrollLeft;
    const fields = await db.getFields(RESOURCE_ID);
    if (!isCurrent()) return;
    await mountFieldObjectInlineControls(inspector, fields);
    await Promise.all([paintBootPresentationCanvas(view), paintBootPatternPicker(view), paintBootBankPickers(view)]);
    if (!isCurrent()) return;
    bindBootControls(view, inspector, redraw);
    inspector.scrollTop = scrollTop; inspector.scrollLeft = scrollLeft;
    reportBootPresentationPatterns();
  } finally {if (isCurrent()) delete workbench.dataset.bootSelecting;}
}

function renderBootPresentation(view) {
  // 换屏就退出回放：进度条是这一屏时间轴的视图，跟着人走到另一屏就没有意义了。
  if (playbackView !== view) {
    stopPlayback();
    playhead = null;
    playbackScene = null;
    selectedFadeStep = null;
    selectedSegment = null;
    playbackView = view;
  }
  const screen = bootPresentationScreen(view);
  const values = effective(view);
  if (!screen) {
    return `<div class="empty"><b>开机演出数据未加载</b>
      <span>需要 package 里的 game/boot/presentation/index.json；
      运行 <code>engine.tools.mm_boot_presentation</code> 生成。</span></div>`;
  }
  if (!values) {
    return `<div class="empty"><b>可编辑值未加载</b>
      <span>repository 里没有 boot-presentation；重新导入项目后重试。</span></div>`;
  }
  const selected = (screen.elements || []).find(
    element => element.id === selectedElement
  );
  // 光标只在真的能画的时候变成十字：选中文本组件或屏根时画布不接管指针，
  // 这时给十字就是在骗人。
  const paintable = Boolean(
    COMPONENT_KINDS[selected?.kind]?.capabilities.includes("paint") && brushKind
    && playhead === null
  );

  // 舞台只放画面本身。工具跟着选中的组件走，在右边的检视器里——画笔对文本
  // 组件和屏根本身都不成立，摆在画面上方就必须先猜它作用在谁身上。
  const stage = screenWorkbenchCanvasStage({
    namespace: "boot",
    toolbarMarkup: resetToOriginalButton(RESET_ITEM_ID, {
      title: "丢弃这一屏的全部改动，退回导入时的 ROM 原始状态",
      dirty: false,
    }),
    canvasMarkup: `<canvas id="boot-screen" width="${SCREEN_WIDTH}"
      height="${SCREEN_HEIGHT}"
      class="boot-canvas--${paintable ? "paint" : "idle"}"
      aria-label="${esc(screen.label)}预览"></canvas>`,
  });

  const inspector = bootInspectorContent(screen, values);
  const system = screen.id === 'title' ? systemTitleControls() : null;
  const workbench = screenWorkbench({
    namespace: "boot",
    heightMode: 'timeline',
    className: "boot-workspace",
    treeTitle: "演出结构",
    treeMarkup: treeMarkup(screen),
    stageMarkup: stage,
    stageToolbarMarkup: system ? `${system.toolbar}${system.inputs}` : '',
    bottomMarkup: system?.bottom || '',
    bottomSize: system ? 'resizable' : 'content',
    inspectorTitle: inspector.title,
    inspectorMarkup: inspector.markup,
  });

  // 有时间轴的屏使用轨道；其余屏显示参数表。
  const parameters = screen.timeline
    ? timelinePanel(screen, values)
    : panel("动画参数", `
      <div class="table-wrap"><table>
        <thead><tr><th>参数</th><th>值</th><th>原值</th></tr></thead>
        <tbody>${parameterRows(screen, values)}</tbody>
      </table></div>`, {wide: true});

  const sprites = (values.sprites || []).length ? panel("精灵", `
    <div class="table-wrap"><table>
      <thead><tr><th>#</th>${screen.id === "title" ? "" : "<th>图案</th>"}<th>行</th><th>列</th><th>展开坐标</th></tr></thead>
      <tbody>${spriteRows(screen, values)}</tbody>
    </table></div>`, {wide: true}) : "";

  // 工作台与时间轴均为 #content 的直接子节点。
  return `${workbench}${parameters}<div class="boot-presentation">
    <div><p class="boot-note boot-note--warn" id="boot-chr-missing" hidden></p>
      <p class="boot-note" id="boot-save-state" role="status">${esc(saveNotice)}</p></div>
    ${sprites}
  </div>`;
}

function reportBootPresentationPatterns() {
  const node = $("#boot-chr-missing");
  if (!node) return;
  node.hidden = true;
  node.textContent = "";
  node.dataset.missingBanks = JSON.stringify([...bootPreviewMissingBanks].sort((a, b) => a - b));
}

function repaint(view) {
  // 图元或 bank 改过之后回放缓存就不作数了；下一帧自己重拼。
  playbackScene = null;
  const screenRoot = $("#boot-screen")?.parentElement;
  const pickerRoot = document.querySelector('[data-boot-brush]')?.parentElement;
  // These event-driven painters do not return to render(); report at each panel.
  paintBootPresentationCanvas(view)
    .then(reportBootPresentationPatterns)
    .catch(error => showEditorError(screenRoot, "开机演出预览重绘失败", error));
  // 选中图像组件时选择器就在右栏，一直存在；没有它时函数自己会早退。
  paintBootPatternPicker(view).catch(error =>
    showEditorError(pickerRoot, "图块选择器重绘失败", error));
}

/** 画一格。画笔是 tile 就改格子索引，是属性组就改覆盖它的那一格属性。
 *  写到哪份数据上完全是本页的事——共享编辑器只负责几何与交互。 */
function paintCell(view, cell) {
  // 回放中画布画的是运行时窗口，格子和坐标已经对不上了，落笔一定画偏。
  if (playhead !== null) return false;
  // 没挑过画笔就什么都不画：右栏的选择器一直在那儿，但在人点它之前，
  // 画布上的一次点击不该改掉任何格子。
  if (!brushKind) return false;
  const current = ensureDraft(view);
  if (!current) return false;
  const screen = bootPresentationScreen(view);
  // 画笔只在选中组件的地盘里生效。地盘是整条行带（32 列全宽），所以图仍然
  // 能改大改小；越过行带就是别人的地方了，那里画出来的格子不归任何组件管。
  const territory = (screen?.elements || [])
    .find(item => item.id === selectedElement)?.territory;
  if (territory && (cell.row < territory.top || cell.row > territory.bottom
    || cell.column < territory.left || cell.column > territory.right)) {
    return false;
  }
  if (brushKind === "tiles") {
    // 文字块只能由文本组件自己的输入框改。画笔盖上去，改出来的东西文字组件
    // 认不出，它的输入框会当场变成一串认不出的格子——那不是编辑，是破坏。
    // 属性组画笔不拦：一格属性管 4×4，本来就跨组件，那是硬件事实。
    if (isProtectedCell(screen, cell.row, cell.column)) return false;
    const index = cell.row * defaultGeometry.columns + cell.column;
    if (current.nametable[index] === brushTile) return false;
    current.nametable[index] = brushTile;
    return true;
  }
  const index = attributeIndexAt(defaultGeometry, cell.row, cell.column);
  const next = attributeByteWith(
    current.nametable[index], cell.row, cell.column, brushGroup
  );
  if (current.nametable[index] === next) return false;
  current.nametable[index] = next;
  return true;
}

// 整页重绘按控件身份恢复焦点与检视器滚动位置。
let placeToRestore = null;

const inspectorNode = () =>
  document.querySelector(".boot-workspace .workspace-inspector");

const FOCUS_KEYS = [
  "bootColour", "bootColourPick", "bootColourValue",
  "bootBrushGroup", "bootNode",
];

function capturePlace(focusOverride = null) {
  const active = document.activeElement;
  // 点开取色器的那颗色块在选完色之后就没了（面板收起），所以调用方可以直接
  // 指定焦点该落回谁身上，而不是记录一个马上要消失的控件。
  const focus = focusOverride || FOCUS_KEYS
    .filter(key => active?.dataset?.[key] !== undefined)
    .map(key => [key, active.dataset[key]]);
  placeToRestore = {
    inspector: inspectorNode()?.scrollTop || 0,
    focus: focus.length ? focus : null,
  };
}

function restorePlace() {
  const place = placeToRestore;
  placeToRestore = null;
  if (!place) return;
  if (place.focus) {
    const selector = place.focus
      .map(([key, value]) => `[data-${key.replace(/[A-Z]/g, c =>
        `-${c.toLowerCase()}`)}="${CSS.escape(value)}"]`)
      .join("");
    // 先聚焦再定滚动：focus 默认会把元素滚进视口，那正是要避免的跳动。
    document.querySelector(selector)?.focus({preventScroll: true});
  }
  const inspector = inspectorNode();
  if (inspector) inspector.scrollTop = place.inspector;
}

async function bindBootPresentation(view, {rerender}) {
  const navigation = state.navigationGeneration;
  bindPreviewSound(document.querySelector('[data-tl^="boot:"]'), () => {
    const screen = bootPresentationScreen(view);
    const track = timelineTrack(screen, effective(view));
    if (track) startBootAudio(view, screen, track);
  });
  const screen = bootPresentationScreen(view);
  if (!screen) return;
  if (view === 'cutscene-title') bindSystemStateController(document.querySelector('#content'), {rerender,
    prepareInput: () => {stopPlayback(); seekPlayback(view, timelineTrack(screen, effective(view)).totalFrames);}});
  await db.getFields(RESOURCE_ID).then(fields => {
    if (navigation === state.navigationGeneration)
      mountFieldObjectInlineControls(document.querySelector('#content'), fields);
  })
    .catch(error => saySaveState(`开机演出字段控件载入失败：${error?.message || error}`));
  if (navigation !== state.navigationGeneration) return;
  rerenderPlayback = rerender;
  // 本轮渲染已经完成（画布、选择器都画好了），可以把上一轮的位置放回去。
  restorePlace();
  // 舞台尺寸只有渲染完才量得到，所以缩放在这里落地。
  bindScreenWorkbenchZoom({
    namespace: "boot",
    canPan: event => event.button === 1 || !$("#boot-screen").classList.contains("boot-canvas--paint"),
    zoom,
    onChange: value => { zoom = value; },
  });
  await refreshResetState(screenIdFor(view));
  if (navigation !== state.navigationGeneration) return;
  const redraw = async (focusOverride = null) => {
    capturePlace(focusOverride);
    try {
      await ensureAudioCommandLabelsData({commands: [
        parameterValue(screen, effective(view), 'sound_command'),
      ]});
      if (navigation === state.navigationGeneration) return rerender();
    } catch (error) {
      if (navigation === state.navigationGeneration)
        showEditorError(document.querySelector('#content'), '曲名读取失败', error);
    }
  };

  // 时间轴：点或拖到哪一帧，画布就画哪一帧。拖动中不整页重绘——重绘会把正在
  // 拖的那个元素换掉，指针捕获跟着丢，一拖就断。
  bindTimelineScrub(view);

  $("#boot-playback-exit")?.addEventListener("click", () => exitPlayback());

  // 点渐变步：播放头已经被 pointerdown 挪到那一帧了（画布就停在那一刻），
  // 这里只补上「选中它」，颜色到下面那条编辑栏里改。
  document.querySelectorAll("[data-boot-fade-step]").forEach(node =>
    node.addEventListener("click", () => {
      const [fade, index] = node.dataset.bootFadeStep.split(":");
      selectedFadeStep = {fade, index: Number(index)};
      openColourField = null;
      redraw();
    })
  );

  // 轨道上的值：改完时间轴要重排（段变长变短），所以走整页重绘，不是就地改数。
  document.querySelectorAll("[data-boot-timeline-parameter]").forEach(node =>
    node.addEventListener("change", () => {
      const current = ensureDraft(view);
      if (!current) return;
      const value = Math.min(255, Math.max(0, Number(node.value) || 0));
      node.value = String(value);
      current.parameters[node.dataset.bootTimelineParameter] = value;
      commit(view);
      repaint(view);
      redraw([["bootTimelineParameter", node.dataset.bootTimelineParameter]]);
    })
  );

  document.querySelectorAll("[data-boot-node]").forEach(node =>
    node.addEventListener("click", () => {
      const id = node.dataset.bootNode;
      if (id.startsWith("segment:")) {
        const segment = timelineTrack(screen, effective(view))?.segments
          .find(segment => id === `segment:${segment.id}`);
        if (segment) {
          stopPlayback();
          timelineRoot().dataset.bootSelectedSegment = segment.id;
          seekPlayback(view, segment.start);
        }
        return;
      }
      const next = id === SCREEN_NODE ? null : id;
      if (next === selectedElement && !selectedSegment) return;
      selectedSegment = null;
      selectedElement = next;
      void refreshBootSelection(view, redraw).catch(error =>
        showEditorError(inspectorNode(), '演出组件选择失败', error));
    })
  );

  bindBootControls(view, document, redraw);
  bindNametablePainting($("#boot-screen"), {
    enabled: () => Boolean(COMPONENT_KINDS[screen.elements?.find(element => element.id === selectedElement)?.kind]
      ?.capabilities.includes('paint') && playhead === null),
    geometry: defaultGeometry,
    paint: cell => paintCell(view, cell),
    onChange: () => {repaint(view); commit(view);},
  });
  void bindBootScreenReset(view, redraw);
}

function bindBootControls(view, root, redraw) {
  const screen = bootPresentationScreen(view);
  const $ = selector => root.querySelector(selector);
  root.querySelectorAll("[data-boot-brush-group]").forEach(node =>
    node.addEventListener("click", () => {
      brushGroup = Number(node.dataset.bootBrushGroup);
      brushKind = "attributes";
      redraw();
    })
  );

  // 文字直接写进 nametable：文本组件是那张格子表的一个视图，不是第二份数据。
  // 因此没有「保存文字」这一步，改字和用画笔改格子落在同一个草稿上。
  bindTextInputEvents($("#boot-text"), {onInput: () => {
    const input = $("#boot-text");
    const note = $("#boot-text-note");
    const element = (screen.elements || []).find(
      item => item.id === input.dataset.bootText
    );
    if (!element || !screen.font) return;
    // 字库只有大写字模，小写不是「打不出」而是同一个字——就地转换，并把
    // 转换结果写回输入框，免得看到的和画面上的不一致。
    const text = input.value.toUpperCase();
    if (text !== input.value) {
      const caret = input.selectionStart;
      input.value = text;
      input.setSelectionRange(caret, caret);
    }
    const {tiles, rejected, candidates} = encodeText(text, element, screen);
    const say = (text) => {
      if (!note) return;
      note.textContent = text;
      note.hidden = !text;
    };
    if (rejected.length) {
      say(`字库里没有 ${[...new Set(rejected)].join(" ")}`);
      return;
    }
    const current = ensureDraft(view);
    if (!current) return;
    // 不逐个按键压撤销栈：那会为每一次敲键克隆一整份草稿（含 1 KiB nametable）。
    const info = element.text;
    for (let column = 0; column < tiles.length; column += 1) {
      current.nametable[info.row * defaultGeometry.columns + info.column + column]
        = tiles[column];
    }
    say(candidates.length
      ? `${[...new Set(candidates)].join(" ")} 用的是推导字形，请核对预览`
      : "");
    repaint(view);
    commit(view);
  }});

  // 点色块开/关取色器，点色格落值。两处颜色（组调色板、渐显步）共用同一套
  // 控件，id 里编码了它落在哪儿。
  root.querySelectorAll("[data-boot-colour]").forEach(node =>
    node.addEventListener("click", () => {
      const id = node.dataset.bootColour;
      openColourField = openColourField === id ? null : id;
      redraw();
    })
  );

  root.querySelectorAll("[data-boot-colour-pick]").forEach(node =>
    node.addEventListener("nes-colour-confirm", () => {
      const current = ensureDraft(view);
      if (!current) return;
      const value = Number(node.dataset.bootColourValue) & PALETTE_MAX;
      const [kind, ...rest] = node.dataset.bootColourPick.split(":");
      if (kind === "palette") {
        const [group, index] = rest.map(Number);
        current.palette[group * 4 + index] = value;
      } else if (kind === "fade") {
        const slot = Number(rest.pop());
        const step = Number(rest.pop());
        current.fades[rest.join(":")][step][slot] = value;
      }
      openColourField = null;
      repaint(view);
      commit(view);
      // 焦点回到刚才点开的那颗色块：连着改一组四个颜色时不必每次重新找位置。
      redraw([["bootColour", node.dataset.bootColourPick]]);
    })
  );

  root.querySelectorAll("[data-boot-parameter]").forEach(node =>
    node.addEventListener("change", () => {
      const current = ensureDraft(view);
      if (!current) return;
      const value = Math.min(255, Math.max(0, Number(node.value) || 0));
      node.value = String(value);
      current.parameters[node.dataset.bootParameter] = value;
      node.closest("tr")?.classList.toggle("is-changed", value !== (
        (screen.parameters || []).find(
          item => item.id === node.dataset.bootParameter)?.value
      ));
      commit(view);
    })
  );

  root.querySelectorAll("[data-boot-chr-bank]").forEach(node =>
    node.addEventListener("change", () => {
      const current = ensureDraft(view);
      if (!current) return;
      const value = Math.min(255, Math.max(0, Number(node.value) || 0));
      node.value = String(value);
      current.chr_banks[node.dataset.bootChrBank] = value;
      const slot = (screen.chr_slots || []).find(
        item => String(item.register) === node.dataset.bootChrBank);
      node.closest("tr")?.classList.toggle(
        "is-changed", value !== Number(slot?.bank));
      repaint(view);
      commit(view);
    })
  );

  root.querySelectorAll("[data-boot-sprite]").forEach(node =>
    node.addEventListener("change", () => {
      const current = ensureDraft(view);
      if (!current) return;
      const index = Number(node.dataset.bootSprite);
      const field = node.dataset.bootField;
      const limit = field === "tile" ? 255 : field === "row" ? 29 : 31;
      const value = Math.min(limit, Math.max(0, Number(node.value) || 0));
      node.value = String(value);
      current.sprites[index][field] = value;
      repaint(view);
      commit(view);
    })
  );

  root.querySelector('[data-boot-brush]')?.addEventListener('change', event => {
    if (event.target !== event.currentTarget || !event.detail?.references) return;
    brushTile = event.detail.references[0].tile;
    brushKind = "tiles";
    redraw();
  });

}

async function bindBootScreenReset(view, redraw) {
  const screenId = screenIdFor(view);
  try {
    const fields = screenFields(await db.getFields(RESOURCE_ID), screenId);
    if (!fields.length) throw new Error(`${screenId}: 字段对象未登记`);
    bindFieldResetToOriginalButtons(document, new Map([[RESET_ITEM_ID, fields]]), {
      database: db,
      beforeReset: async () => {
        // 先取消待写入的那一笔：让它在还原之后才落盘，改动就又回来了。
        cancelPendingSave();
        await autoSave.settled();
      },
      afterReset: async () => {
        draft = null;
        saveNotice = "";
        redraw();
      },
      onError: error => {
        saveNotice = `还原失败：${error.message}`;
        redraw();
      },
    });
    await refreshResetState(screenId);
  } catch (error) {
    saySaveState(`开机演出字段加载失败：${error?.message || error}`);
  }
}

export { bindBootPresentation, paintBootBankPickers, paintBootPatternPicker, paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns };
