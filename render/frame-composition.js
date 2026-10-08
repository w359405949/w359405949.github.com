// @editor-module 当前显示构造按区域、背景图块与精灵直接合成。
import {requireFrameByte, requireFrameVector, sameFrameVector} from '../core/frame-state-values.js';
import {nesPalette, uiPutRgb} from './nes.js';
import {decodeChrTile} from './chr-raster.js';

const decodedPatterns = new WeakMap();
const clip = (left, right) => {
  const x = Math.max(left.x, right.x), y = Math.max(left.y, right.y);
  const width = Math.min(left.x + left.width, right.x + right.width) - x;
  const height = Math.min(left.y + left.height, right.y + right.height) - y;
  return width > 0 && height > 0 ? {x, y, width, height} : null;
};
const screen = {x: 0, y: 0, width: 256, height: 240};

export function uiFrameCompositionInputs(layer) {
  const frame = layer.frame_state;
  const tables = requireFrameVector(frame?.nametables, 2048, 'window-nametables');
  const palette = requireFrameVector(frame.ppu_palette, 32, 'window-palette');
  const oam = requireFrameVector(frame.oam, 256, 'window-oam');
  const ctrl = requireFrameByte(frame, 'ppu_ctrl'), mask = requireFrameByte(frame, 'ppu_mask');
  const scrollX = requireFrameByte(frame, 'scroll_x'), scrollY = requireFrameByte(frame, 'scroll_y');
  if (mask & 225) throw new TypeError('窗口强调色与灰阶尚未确认');
  if (!['horizontal', 'vertical'].includes(frame.mirroring)) throw new TypeError('窗口镜像方式无效');
  if (!Array.isArray(layer.regions) || !layer.regions.length) throw new TypeError('窗口覆盖区域缺失');
  for (const region of layer.regions)
    if (![region.x, region.y, region.width, region.height].every(Number.isInteger)
        || region.width < 1 || region.height < 1) throw new TypeError('窗口覆盖区域无效');
  if (frame.irq_enabled && !layer.raster_frame) throw new TypeError('窗口栅格显示阶段缺失');
  if (scrollY >= 240) throw new TypeError('窗口滚动的非显示行尚未确认');
  const patterns = requireFrameVector(layer.pattern_table, 8192, 'window-current-patterns');
  const phases = layer.raster_frame?.phases || [{line: 0, ppu_ctrl: ctrl, ppu_mask: mask,
    scroll_x: scrollX, scroll_y: scrollY, pattern_table: patterns}];
  let previous = -1;
  for (const phase of phases) {
    const dot = phase.dot ?? 0, time = phase.line * 341 + dot;
    if (!Number.isInteger(phase.line) || phase.line < 0 || phase.line >= 240
        || !Number.isInteger(dot) || dot < 0 || dot > 340 || time <= previous)
      throw new TypeError('窗口栅格显示阶段顺序无效');
    for (const key of ['ppu_ctrl', 'ppu_mask', 'scroll_x', 'scroll_y']) requireFrameByte(phase, key);
    if (phase.ppu_mask & 225) throw new TypeError('窗口强调色与灰阶尚未确认');
    requireFrameVector(phase.pattern_table, 8192, 'window-raster-patterns');
    previous = time;
  }
  if (phases[0]?.line !== 0) throw new TypeError('窗口初始显示阶段缺失');
  return {frame, tables, palette, oam, phases, regions: layer.regions, textCells: layer.text_cells};
}

export function uiFrameCompositionRegions(inputs) {
  const {phases} = inputs;
  const copiedLine = phase => phase.line + ((phase.dot ?? 0) < 257 ? 1 : 2);
  const boundaries = [...new Set([0, 240, ...phases.flatMap(phase =>
    [phase.line, phase.line + 1, copiedLine(phase)])])].filter(y => y <= 240).sort((a, b) => a - b);
  const result = [];
  for (let index = 0; index < boundaries.length - 1; index++) {
    const y = boundaries[index], height = boundaries[index + 1] - y;
    const columns = [...new Set([0, 256, ...phases.filter(phase => phase.line === y)
      .map(phase => Math.min(256, Math.max(0, (phase.dot ?? 0) - 1)))])].sort((a, b) => a - b);
    const copied = phases.findLast(phase => copiedLine(phase) <= y) || phases[0];
    const control = (phases[0].ppu_ctrl & 2) | (copied.ppu_ctrl & 1);
    for (let column = 0; column < columns.length - 1; column++) {
      const x = columns[column], width = columns[column + 1] - x;
      const phase = phases.findLast(phase => phase.line < y
        || phase.line === y && (phase.dot ?? 0) <= x + 1) || phases[0];
      for (const region of inputs.regions) {
        const bounds = clip(clip(region, screen) || {x: 0, y: 0, width: 0, height: 0}, {x, y, width, height});
        if (bounds) result.push({...bounds, phase, control});
      }
    }
  }
  return result;
}

export const uiFrameBackgroundTiles = function* (inputs, region) {
  const {phase, control} = region;
  if (!(phase.ppu_mask & 8)) return;
  const originX = phase.scroll_x + (control & 1) * 256;
  const originY = phase.ppu_address === undefined ? phase.scroll_y + ((control >> 1) & 1) * 240
    : ((phase.ppu_address >> 5) & 31) * 8 + ((phase.ppu_address >> 12) & 7)
      + ((phase.ppu_address >> 11) & 1) * 240 - (phase.scroll_origin_line ?? phase.line);
  const left = Math.max(region.x, phase.ppu_mask & 2 ? 0 : 8);
  for (let y = region.y - ((region.y + originY) % 8 + 8) % 8; y < region.y + region.height; y += 8) {
    const worldY = ((y + originY) % 480 + 480) % 480, tileY = (worldY % 240) >> 3;
    for (let x = left - ((left + originX) & 7); x < region.x + region.width; x += 8) {
      const bounds = clip({x: left, y: region.y, width: region.x + region.width - left, height: region.height},
        {x, y, width: 8, height: 8});
      if (!bounds) continue;
      const worldX = (x + originX) & 511, tileX = (worldX & 255) >> 3;
      const page = (worldX >> 8) + Math.floor(worldY / 240) * 2;
      const base = (inputs.frame.mirroring === 'vertical' ? page & 1 : page >> 1) * 1024;
      const at = base + tileY * 32 + tileX;
      const attribute = inputs.tables[base + 960 + (tileY >> 2) * 8 + (tileX >> 2)];
      yield {x, y, bounds, at, tile: inputs.tables[at] + (phase.ppu_ctrl & 16 ? 256 : 0),
        palette: (attribute >> (((tileY & 2) << 1) | (tileX & 2))) & 3};
    }
  }
};

function pattern(patterns, id) {
  let cache = decodedPatterns.get(patterns);
  if (!cache) {cache = new Map(); decodedPatterns.set(patterns, cache);}
  if (!cache.has(id)) cache.set(id, decodeChrTile(patterns, id));
  return cache.get(id);
}

// 精灵上限只裁剪重叠的纵向区间，画布不执行逐扫描线精灵评估。
export function spriteVisibleBands(sprites, height = 240, limit = 8) {
  const boundaries = [...new Set([0, height, ...sprites.flatMap(sprite =>
    [Math.max(0, Math.min(height, sprite.y)), Math.max(0, Math.min(height, sprite.y + sprite.height))])])].sort((a, b) => a - b);
  const result = new Map(sprites.map(sprite => [sprite, []]));
  for (let index = 0; index < boundaries.length - 1; index++) {
    const top = boundaries[index], bottom = boundaries[index + 1];
    for (const sprite of sprites.filter(sprite => sprite.y <= top && sprite.y + sprite.height >= bottom).slice(0, limit)) {
      const bands = result.get(sprite), last = bands.at(-1);
      if (last?.bottom === top) last.bottom = bottom;
      else bands.push({top, bottom});
    }
  }
  return result;
}

export function uiPaintFrameComposition(image, layer, inputs = uiFrameCompositionInputs(layer), cache = null) {
  const regions = uiFrameCompositionRegions(inputs), {palette, oam} = inputs;
  const signature = JSON.stringify([image.width, image.height, inputs.frame.mirroring, inputs.regions,
    inputs.phases.map(({pattern_table, ...phase}) => phase)]);
  const reused = cache?.signature === signature && sameFrameVector(cache.tables, inputs.tables)
    && sameFrameVector(cache.palette, palette)
    && cache.textCells === inputs.textCells
    && inputs.phases.every((phase, index) => phase.pattern_table === cache.patterns[index]);
  const background = reused ? cache.values : new Uint8Array(image.width * image.height);
  if (reused) for (const region of regions) for (let y = region.y; y < region.y + region.height; y++) {
    const left = (y * image.width + region.x) * 4, right = left + region.width * 4;
    image.data.set(cache.pixels.subarray(left, right), left);
  }
  else for (const region of regions) {
    for (let y = region.y; y < region.y + region.height; y++)
      for (let x = region.x; x < region.x + region.width; x++)
        uiPutRgb(image.data, image.width, x, y, nesPalette[palette[0] & 63]);
    for (const tile of uiFrameBackgroundTiles(inputs, region)) {
      const pixels = inputs.textCells?.get(tile.at) || pattern(region.phase.pattern_table, tile.tile), box = tile.bounds;
      for (let y = box.y; y < box.y + box.height; y++) for (let x = box.x; x < box.x + box.width; x++) {
        const value = pixels[(y - tile.y) * 8 + x - tile.x];
        background[y * image.width + x] = value;
        uiPutRgb(image.data, image.width, x, y, nesPalette[palette[value ? tile.palette * 4 + value : 0] & 63]);
      }
    }
  }
  if (cache && !reused) Object.assign(cache, {signature, tables: inputs.tables.slice(), palette: palette.slice(),
    patterns: inputs.phases.map(phase => phase.pattern_table), textCells: inputs.textCells,
    values: background, pixels: image.data.slice()});
  const occupied = new Uint8Array(background.length);
  for (const region of regions) {
    const {phase} = region;
    if (!(phase.ppu_mask & 16)) continue;
    for (let y = region.y; y < region.y + region.height; y++)
      occupied.fill(0, y * image.width + region.x, y * image.width + region.x + region.width);
    const height = phase.ppu_ctrl & 32 ? 16 : 8;
    const sprites = Array.from({length: 64}, (_, index) => ({index: index * 4, y: oam[index * 4] + 1, height}));
    for (const [sprite, bands] of spriteVisibleBands(sprites)) {
      const {index} = sprite, attribute = oam[index + 2], tile = oam[index + 1], originX = oam[index + 3];
      const base = height === 16 ? (tile & 1) * 256 + (tile & 254) : (phase.ppu_ctrl & 8 ? 256 : 0) + tile;
      for (const band of bands) {
        const box = clip(region, {x: Math.max(originX, phase.ppu_mask & 4 ? 0 : 8), y: band.top,
          width: originX + 8 - Math.max(originX, phase.ppu_mask & 4 ? 0 : 8), height: band.bottom - band.top});
        if (!box) continue;
        for (let y = box.y; y < box.y + box.height; y++) {
          const row = attribute & 128 ? height - 1 - (y - sprite.y) : y - sprite.y;
          const pixels = pattern(phase.pattern_table, base + (row >> 3));
          for (let x = box.x; x < box.x + box.width; x++) {
            const at = y * image.width + x;
            const value = pixels[(row & 7) * 8 + (attribute & 64 ? 7 - (x - originX) : x - originX)];
            if (!value || occupied[at]) continue;
            occupied[at] = 1;
            if (!background[at] || !(attribute & 32))
              uiPutRgb(image.data, image.width, x, y, nesPalette[palette[16 + (attribute & 3) * 4 + value] & 63]);
          }
        }
      }
    }
  }
  return image;
}
