// @editor-module 字形缓存只维护文字执行与窗口提交的 ROM 现场，不提供预览字形。

export function createFieldGlyphCache(patterns, parameters, tiles = null) {
  return {patterns: Uint8Array.from(patterns), parameters,
    tiles: tiles || new Uint8Array(0x400).fill(0xFF),
    pools: Array(3).fill(parameters.first_tile), tail: null,
    get nextTile() {return this.pools[0];},
    set nextTile(value) {this.pools[0] = value;}};
}

// 0A:9D3F..9EC9 的窗口标记与输出指针共同选择池和回绕区间。
function allocateFieldGlyphTile(cache, cursor) {
  const p = cache.parameters, tiles = cache.tiles;
  if (p.linear) {
    let tile = cache.pools[0];
    if (p.wrap_tile !== undefined && tile >= p.wrap_tile) tile = p.reset_tile;
    if (tile === p.reserved_tile) tile += p.reserved_count;
    if (!Number.isInteger(tile) || tile < 0x16 || tile + 1 >= (p.end_tile ?? p.wrap_tile ?? 0x62))
      throw new TypeError('字形缓存槽超出已确认的分配范围');
    cache.pools[0] = tile + 2;
    return tile;
  }
  const page = 0x60 + (cursor >> 8), column = cursor & 0xFF;
  let pool = 0, first = null, end = p.wrap_tile;
  let skipReserved = true;
  if (tiles[0x2A] === p.status_marker) {
    if (page < 0x62 && !(column & 0x10) && (column & 15) < 10) {
      pool = 1; end = p.status_name_end; skipReserved = false;
    } else if (page < 0x62) {
      pool = 2; first = p.status_name_end;
      end = tiles[0x395] === p.status_extended_marker ? p.status_extended_start : p.status_body_start;
      skipReserved = false;
    } else {
      first = tiles[0x395] === p.status_extended_marker ? p.status_extended_start : p.status_body_start;
    }
  } else if (tiles[0x240] === p.menu_marker || tiles[0x30] === p.header_marker
      || tiles[0x255] === p.choice_marker) {
    if (page < 0x62 || (page === 0x62 && column < 0x50)) {
      pool = 1; end = p.menu_body_start; skipReserved = false;
    } else first = p.menu_body_start;
  } else if (tiles[0x2A0] === p.dialogue_marker) {
    first = p.dialogue_first_tile;
  } else if (tiles[0x38B] === p.split_marker) {
    if (page < 0x61) {
      pool = 1; end = p.split_middle_start; skipReserved = false;
    } else if (page < 0x62 || (page === 0x62 && column < 0x40)) {
      pool = 2; first = p.split_middle_start; end = p.split_body_start; skipReserved = false;
    } else first = p.split_body_start;
  }
  let tile = cache.pools[pool];
  if (first !== null && tile < first || tile >= end) tile = first ?? p.reset_tile;
  if (skipReserved && tile === p.reserved_tile) tile += p.reserved_count;
  cache.pools[pool] = (tile + 1) & 255;
  return tile;
}

export function writeFieldGlyph(cache, glyph, cursor, continuation = false) {
  if (glyph.length !== 18) throw new TypeError('字形缓存需要十八字节字形');
  if (!cache.parameters.linear && !continuation)
    cache.fontBanks = [cache.parameters.font_low_bank, cache.parameters.font_high_bank];
  const pair = () => {
    const top = allocateFieldGlyphTile(cache, cursor);
    cache.tiles[(cursor - 32) & 0x3FF] = top;
    const bottom = cache.parameters.linear ? top + 1 : allocateFieldGlyphTile(cache, cursor);
    cache.tiles[cursor & 0x3FF] = bottom;
    return [top, bottom];
  };
  const left = continuation ? cache.tail : pair();
  if (!left) throw new TypeError('半字形缺少前置字形');
  const leftPosition = continuation ? cursor - 1 : cursor++;
  const right = pair();
  const rightPosition = cursor;
  const leftPlane = continuation ? cache.tailPlane.slice() : new Uint8Array(16);
  const rightPlane = new Uint8Array(16);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const packed = glyph[Math.floor(x / 4) * 6 + Math.floor(y / 2)];
      if (!((packed >> (7 - x % 4 - (y % 2) * 4)) & 1)) continue;
      const px = x + (continuation ? 4 : 0);
      const plane = px < 8 ? leftPlane : rightPlane;
      plane[y + 4] |= 1 << (7 - px % 8);
    }
  }
  const writes = [];
  for (const [position, column, plane] of [[leftPosition, left, leftPlane], [rightPosition, right, rightPlane]]) {
    for (let row = 0; row < 2; row++) {
      const tile = column[row];
      cache.patterns.set(plane.subarray(row * 8, row * 8 + 8), tile * 16);
      const at = (position - 32 + row * 32) & 0x3FF;
      cache.tiles[at] = tile;
      writes.push({position: at, tile});
    }
  }
  cache.tail = right;
  cache.tailPlane = rightPlane;
  return writes;
}

export function copyFieldGlyphTiles(cache, {source, target, width, rows, source_step, target_step}) {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < width; column++)
      cache.tiles[(target + column) & 0x3FF] = cache.tiles[(source + column) & 0x3FF];
    source += source_step;
    target += target_step;
  }
}
