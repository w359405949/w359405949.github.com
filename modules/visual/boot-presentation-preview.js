// @editor-module 开机演出视觉字段对象的画面、回放与候选预览。
import {composeChrPatternTable, decodeWebByteArray} from "../../core/media-assets.js";
import {decodeChrTiles} from '../../render/chr-raster.js';
import {defaultGeometry, paintNametable,
  paintNametableWindow,
  PALETTE_MAX, TILE_BYTES} from "../../ui/nametable-editor.js";
import {nesPalette, uiPutRgb, uiPaintResolvedMetasprite} from "../../render/nes.js";
import {timelineTrack, timelineStateAt} from "../../core/boot-timeline.js";

const SCREEN_HEIGHT = 240;
const PATTERN_TABLE_BYTES = 256 * TILE_BYTES;

export const bootPreviewMissingBanks = new Set();

export function bootPreviewPaletteEntries(values) {
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
  const table = new Uint8Array(PATTERN_TABLE_BYTES);
  const slots = (screen.chr_slots || []).filter(slot => {
    const slotBase = Number(slot.ppu_base);
    return slotBase >= base && slotBase < base + PATTERN_TABLE_BYTES;
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

export async function bootPreviewScene(screen, values) {
  bootPreviewMissingBanks.clear();
  return {
    patterns: await patternTable(screen, values, Number(screen.background_pattern_base)),
    spritePatterns: await patternTable(screen, values, Number(screen.sprite_pattern_base)),
  };
}

export async function bootPreviewEditImage(context, screen, values, binding = null) {
  if (binding) return bootPreviewStateImage(context, screen, values, binding);
  bootPreviewMissingBanks.clear();
  const image = context.createImageData(256, SCREEN_HEIGHT);
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

export function bootPreviewPlaybackImage(context, scene, pages, moment, sprites) {
  const image = context.createImageData(256, SCREEN_HEIGHT);
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
    for (let y = 0; y < SCREEN_HEIGHT; y += 1)
      for (let x = 0; x < 8; x += 1) uiPutRgb(image.data, image.width, x, y, colour);
  }
  return image;
}

export async function bootChrTileContext(screen, values, group) {
  const palette = bootPreviewPaletteEntries(values.palette).slice(group * 4, group * 4 + 4);
  palette[0] = Number(values.palette[0] || 0x0F) & PALETTE_MAX;
  return {key: screen.id,
    tiles: decodeChrTiles(await patternTable(screen, values, Number(screen.background_pattern_base))),
    palette};
}

export const bootChrContextAdapter = Object.freeze({
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
