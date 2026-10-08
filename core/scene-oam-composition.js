// @editor-module OAM 所属计算保留继承字节、写入顺序、裁剪与八位游标。
import {requireFrameByte, requireFrameVector} from './frame-state-values.js';

const byte = (value, name) => requireFrameByte({[name]: value}, name);
const vector = (value, length, name) => requireFrameVector(value, length, name);
const primaryOrders = Object.freeze([
  [0, 1, 15], [14, -1, -1], [15, -1, -1], [0, 1, 16],
]);
const secondaryOrders = Object.freeze([[1, 1, 16], [15, -1, 0]]);

function target(input) {
  const cursor = byte(input.cursor, 'oam-cursor');
  if (cursor & 3) throw new TypeError('oam-cursor-alignment');
  return {oam: [...vector(input.oam, 256, 'oam-shadow')], cursor, writes: [], sprites: []};
}
function write(output, offset, value) {
  output.oam[offset] = value & 255;
  output.writes.push({offset, value: value & 255});
}
function quartet(output, y, tile, attributes, x) {
  write(output, output.cursor + 1, tile);
  write(output, output.cursor + 3, x);
  write(output, output.cursor, y);
  write(output, output.cursor + 2, attributes);
  output.sprites.push({x: x & 255, y: y & 255, tile, attribute: attributes});
  output.cursor = (output.cursor + 4) & 255;
}

// PRG $026000：横向越界仍写四字节并隐藏 Y，下一条复用当前游标。
export function writeCountedOam(input, object, x, y) {
  const output = target(input);
  byte(x, 'oam-x'); byte(y, 'oam-y');
  if (!Array.isArray(object?.sprites) || !object.sprites.length) throw new TypeError('counted-metasprite');
  for (const sprite of object.sprites) {
    if (![sprite.x, sprite.y].every(value => Number.isInteger(value) && value >= -128 && value <= 127))
      throw new TypeError('counted-metasprite-offset');
    byte(sprite.tile, 'metasprite-tile'); byte(sprite.attribute, 'metasprite-attribute');
    const rawX = sprite.x & 255, sum = x + rawX, screenX = sum & 255;
    const screenY = (y + sprite.y) & 255;
    write(output, output.cursor, screenY);
    write(output, output.cursor + 1, sprite.tile);
    write(output, output.cursor + 2, sprite.attribute);
    write(output, output.cursor + 3, screenX);
    if ((((screenX >>> 1) | (sum > 255 ? 128 : 0)) ^ rawX) & 128) {
      write(output, output.cursor, 0xEF);
    } else {
      output.sprites.push({x: screenX, y: screenY, tile: sprite.tile, attribute: sprite.attribute});
      output.cursor = (output.cursor + 4) & 255;
    }
  }
  return output;
}

// PRG $02635C/$026422：翻转位与调色板只随接纳的象限推进。
function writeActorOam(input, frame, slot, tables) {
  const output = target(input);
  const descriptor = byte(frame?.descriptor, 'actor-descriptor');
  const deltas = vector(tables?.deltas, 16, 'actor-tile-deltas');
  const maps = vector(tables?.quadrantMaps, 32, 'actor-quadrant-maps');
  const deltaX = vector(tables?.xDeltas, 4, 'actor-x-deltas');
  const deltaY = vector(tables?.yDeltas, 8, 'actor-y-deltas');
  const attributes = byte(slot.attributes, 'actor-attributes');
  const x = byte(slot.xLow, 'actor-x-low') | byte(slot.xHigh, 'actor-x-high') << 8;
  const y = ((byte(slot.yLow, 'actor-y-low') | byte(slot.yHigh, 'actor-y-high') << 8) - 4) & 65535;
  const tiles = [byte(frame.tile_a, 'actor-tile-a'), (frame.tile_a + deltas[descriptor & 7]) & 255,
    byte(frame.tile_b, 'actor-tile-b'), (frame.tile_b + deltas[8 + (descriptor & 7)]) & 255];
  let flips = (descriptor & 0x78) >>> 3, palette = attributes & 15;
  if (attributes & 0x40) {
    flips = maps[flips];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[1], tiles[0], tiles[3], tiles[2]];
  }
  if (attributes & 0x80) {
    flips = maps[16 + flips]; palette = maps[16 + palette];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[2], tiles[3], tiles[0], tiles[1]];
  }
  flips = (flips << 3) & 255;
  for (let quadrant = 3; quadrant >= 0; quadrant--) {
    const screenX = (x + deltaX[quadrant]) & 65535;
    write(output, output.cursor + 3, screenX);
    if (screenX >>> 8) continue;
    const screenY = (y + deltaY[quadrant | ((descriptor & 128) ? 4 : 0)]) & 65535;
    write(output, output.cursor, screenY);
    if (screenY >>> 8) continue;
    write(output, output.cursor + 1, tiles[quadrant]);
    const attribute = ((flips & 0x40) ^ (attributes & 0xC0)) | palette;
    flips = (flips << 1) & 255;
    write(output, output.cursor + 2, attribute);
    output.sprites.push({x: screenX, y: screenY, tile: tiles[quadrant], attribute});
    if (quadrant === 2) palette >>>= 2;
    output.cursor = (output.cursor + 4) & 255;
  }
  return output;
}

// PRG $027031：首列坐标取低字节，列步进溢出后跳过下一格。
function writePackedOam(input, object, x, y) {
  const output = target(input);
  byte(x, 'packed-x'); byte(y, 'packed-y');
  byte(object?.anchor, 'packed-anchor'); byte(object?.grid, 'packed-grid');
  const columns = ((object.grid >>> 2) & 7) + 1, rows = (object.grid >>> 5) + 1;
  if (!Array.isArray(object.sprites) || object.sprites.length !== rows * columns)
    throw new TypeError('packed-grid');
  const originX = (x - (object.anchor & 0x1C)) & 255;
  let screenY = (y + 4 - ((object.anchor & 0xE0) >>> 3)) & 255;
  for (let row = 0; row < rows; row++) {
    let screenX = originX, clipped = false;
    for (let column = 0; column < columns; column++) {
      const sprite = object.sprites[row * columns + column];
      byte(sprite.tile, 'packed-tile'); byte(sprite.attribute, 'packed-attribute');
      if (!clipped && sprite.tile) quartet(output, screenY, sprite.tile, sprite.attribute, screenX);
      const sum = screenX + 8;
      clipped = sum > 255;
      screenX = sum & 255;
    }
    screenY = (screenY + 8) & 255;
  }
  return output;
}

// PRG $026701：原点与列步进保留进位，战斗模式裁掉槽 3..15 的下侧。
function writeBattleOam(input, object, slot, index, mode) {
  const output = target(input);
  const origin = byte(object?.origin, 'battle-origin');
  const {columns, rows, palette, tiles} = object;
  if (![columns, rows].every(value => Number.isInteger(value) && value >= 1 && value <= 8))
    throw new TypeError('battle-grid');
  vector(tiles, columns * rows, 'battle-tiles');
  if (byte(palette, 'battle-palette') > 3) throw new TypeError('battle-palette');
  const flip = byte(slot.descriptor, 'battle-descriptor') & 1;
  const x = byte(slot.x, 'battle-x'), y = byte(slot.y, 'battle-y');
  byte(index, 'battle-slot'); byte(mode, 'battle-mode');
  const inverse = flip ? 0 : 255;
  const xSum = (((origin & 0xF0) >>> 2) ^ inverse) + x;
  const highSum = inverse + Number(index >= 13 && x < 128 && mode === 2) + Number(xSum > 255);
  let screenY = ((origin & 15) << 2 ^ 255) + y;
  let yHigh = (255 + Number(screenY > 255)) & 255;
  screenY &= 255;
  for (let row = 0; row < rows; row++) {
    let screenX = xSum & 255, xHigh = highSum & 255;
    for (let column = 0; column < columns; column++) {
      const tile = tiles[row * columns + column];
      if (!(xHigh | yHigh) && !(mode === 2 && index >= 3 && screenY >= 0x90) && tile)
        quartet(output, screenY, tile, palette | (flip ? 0x40 : 0), screenX);
      const sum = screenX + (flip ? 0xF8 : 8);
      screenX = sum & 255;
      xHigh = (xHigh + (flip ? 255 : 0) + Number(sum > 255)) & 255;
    }
    const sum = screenY + 8;
    screenY = sum & 255;
    yHigh = (yHigh + Number(sum > 255)) & 255;
  }
  return output;
}

export function createSceneOamServices({state, sources}) {
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const value = field(id, index);
    if (value.knowledge !== 'confirmed' || value.value === null) throw new TypeError(id);
    return value.value;
  };
  const scalar = id => byte(read(id), id);
  const primary = index => ({descriptor: byte(read('render.marker', index), 'render.marker'),
    frame: byte(read('render.frame', index), 'render.frame'),
    xLow: byte(read('render.screenXLow', index), 'render.screenXLow'),
    xHigh: byte(read('render.screenXHigh', index), 'render.screenXHigh'),
    yLow: byte(read('render.screenYLow', index), 'render.screenYLow'),
    yHigh: byte(read('render.screenYHigh', index), 'render.screenYHigh'),
    attributes: byte(read('render.attributes', index), 'render.attributes')});
  const secondary = index => ({descriptor: byte(read('oam.secondaryDescriptor', index), 'secondary-descriptor'),
    frame: byte(read('oam.secondaryFrame', index), 'secondary-frame'),
    x: byte(read('oam.secondaryX', index), 'secondary-x'), y: byte(read('oam.secondaryY', index), 'secondary-y')});
  return Object.freeze({compose({entry = 'primary'} = {}) {
    const before = state.capture();
    try {
      if (!['primary', 'secondary', 'append-secondary'].includes(entry)) throw new TypeError('oam-entry');
      let output = target({oam: read('display.oamShadow'), cursor: entry === 'append-secondary' ? scalar('dispatch.renderSlot') : 0});
      const writes = [], slots = [], sprites = [];
      if (entry !== 'append-secondary') {
        for (let at = 0; at < 256; at += 4) write(output, at, 0xEF);
        output.cursor = 0;
      }
      const merge = result => {
        writes.push(...output.writes, ...result.writes); sprites.push(...result.sprites);
        output = {...result, writes: []};
      };
      const counted = slot => writeCountedOam(output, sources.counted(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const packed = slot => writePackedOam(output, sources.packed(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const actor = slot => writeActorOam(output, sources.actorFrame(slot.frame), slot, sources.actorTables());
      const draw = (group, index, slot, forced = null) => {
        if (!slot.frame) return;
        const kind = forced || (slot.descriptor & 128 ? group === 'primary' ? 'actor' : 'battle'
          : slot.descriptor & 64 ? 'packed' : 'counted');
        slots.push({group, index, kind});
        merge(kind === 'actor' ? actor(slot) : kind === 'packed' ? packed(slot) : kind === 'counted'
          ? counted(slot) : writeBattleOam(output, sources.battle(slot.frame), slot, index, scalar('control.mainMode')));
      };
      const phase = scalar('display.frameCounter') & 1;
      if (entry === 'primary') {
        const profile = scalar('parameter.story');
        if (profile >= primaryOrders.length) throw new TypeError('primary-oam-profile');
        if (!profile) draw('primary', 15, primary(15), 'actor');
        const [start, step, end] = primaryOrders[profile || phase];
        for (let index = start; index !== end; index += step) draw('primary', index, primary(index));
      }
      if (entry !== 'primary' || scalar('control.displayProfile')) {
        draw('secondary', 0, secondary(0), 'counted');
        const [start, step, end] = secondaryOrders[phase];
        for (let index = start; index !== end; index += step) draw('secondary', index, secondary(index));
      }
      writes.push(...output.writes);
      field('display.oamShadow').value = output.oam;
      field('dispatch.renderSlot').value = output.cursor;
      field('display.oamPending').value = 255;
      return {status: 'available', state: state.capture(), oam: output.oam, cursor: output.cursor,
        writes, slots, sprites, effects: [{kind: 'oam-dma-request', value: 255}],
        ...(entry === 'primary' ? {randomSnapshot: [scalar('random.high'), scalar('random.low')]} : {})};
    } catch (error) {
      state.restore(before);
      return {status: 'unavailable', missing: [error.message]};
    }
  }});
}
