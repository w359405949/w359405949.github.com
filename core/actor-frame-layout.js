// @editor-module 角色单帧四象限的纯计算，供渲染与导入共用。
import {ACTOR_FRAME_COUNT} from "./visual-compiler.js";
export const ACTOR_MOTION_SINGLE = "single-frame";
export const ACTOR_MOTION_DIRECTIONLESS = "directionless-sequence";
export const ACTOR_MOTION_DIRECTIONAL = "directional-4x2";

// PRG $02636A 减 4，$026474 的两组纵偏移为 1/9 与 2/10，OAM 显示行再加 1。
export function actorFrameScreenOffsetY(frame, {descriptors}) {
  const id = integer(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  return -2 + (descriptors[id] >>> 7);
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}


export function actorTiles(
  frame, {descriptors, tileA, tileB, deltas}, oamAttributes = 0,
) {
  const id = integer(frame, "角色帧", 0, ACTOR_FRAME_COUNT - 1);
  const attributes = integer(oamAttributes, "角色 OAM 属性", 0, 0xff);
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
