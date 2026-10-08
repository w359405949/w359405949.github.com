// @editor-module 通用组合图与打包帧的纯解码，渲染和离线导入共用。
const GENERIC_POINTER_COUNT = 55;
const GENERIC_DATA_CPU = 0x80b6;
const DIRECT_FRAME_POINTER_COUNT = 0x46;
const DIRECT_FRAME_DATA_CPU = 0x915a;
export const FLIP_PATTERNS = Object.freeze([0x00, 0x55, 0xaa, 0x33]);
const signed = value => (value > 0x7f ? value - 0x100 : value);

/** `mm_visual._generic_objects` 的镜像。 */
export function decodeGenericObjects(pointerTable, data) {
  const dataEnd = GENERIC_DATA_CPU + data.length;
  const objects = [];
  for (let id = 0; id < GENERIC_POINTER_COUNT; id += 1) {
    const pointer = pointerTable[id];
    if (pointer < GENERIC_DATA_CPU || pointer >= dataEnd) {
      objects.push({id, pointer, runtimeGenerated: true, sprites: []});
      continue;
    }
    const cursor = pointer - GENERIC_DATA_CPU;
    const count = data[cursor];
    const end = cursor + 1 + count * 4;
    if (end > data.length) {
      throw new TypeError(`generic metasprite ${id.toString(16)} 越出记录区`);
    }
    const sprites = [];
    for (let index = 0; index < count; index += 1) {
      const base = cursor + 1 + index * 4;
      const attribute = data[base + 2];
      sprites.push({
        x: signed(data[base + 3]),
        y: signed(data[base]),
        tile: data[base + 1],
        attribute,
        palette: attribute & 3,
        horizontalFlip: Boolean(attribute & 0x40),
        verticalFlip: Boolean(attribute & 0x80),
        transparentTile: false,
      });
    }
    objects.push({id, pointer, runtimeGenerated: false, sprites});
  }
  return objects;
}

/** `mm_visual._direct_frame_objects` 的镜像。 */
export function decodeDirectFrames(pointerTable, data) {
  const dataEnd = DIRECT_FRAME_DATA_CPU + data.length;
  const objects = [];
  for (let id = 0; id < DIRECT_FRAME_POINTER_COUNT; id += 1) {
    const pointer = pointerTable[id];
    if (pointer < DIRECT_FRAME_DATA_CPU || pointer >= dataEnd) {
      objects.push({id, pointer, runtimeGenerated: true, sprites: []});
      continue;
    }
    const cursor = pointer - DIRECT_FRAME_DATA_CPU;
    if (cursor + 2 > data.length) {
      throw new TypeError(`direct frame ${id.toString(16)} 缺少打包头`);
    }
    const anchor = data[cursor];
    const grid = data[cursor + 1];
    const columns = ((grid >> 2) & 0x07) + 1;
    const rows = (grid >> 5) + 1;
    const tileCount = columns * rows;
    const end = cursor + 2 + tileCount;
    if (end > data.length) {
      throw new TypeError(`direct frame ${id.toString(16)} 越出记录区`);
    }
    const originX = -(anchor & 0x1c);
    const originY = 4 - ((anchor & 0xe0) >> 3);
    const palette = anchor & 0x03;
    const flipPattern = FLIP_PATTERNS[grid & 0x03];
    const sprites = [];
    for (let index = 0; index < tileCount; index += 1) {
      const tile = data[cursor + 2 + index];
      const column = index % columns;
      const flip = Boolean((flipPattern << column) & 0x20);
      sprites.push({
        x: originX + column * 8,
        y: originY + Math.floor(index / columns) * 8,
        tile,
        attribute: palette | (flip ? 0x40 : 0),
        palette,
        horizontalFlip: flip,
        verticalFlip: false,
        transparentTile: tile === 0,
      });
    }
    objects.push({
      id, pointer, runtimeGenerated: false, anchor, grid,
      originX, originY, columns, rows, sprites,
    });
  }
  return objects;
}
