// @editor-module 剧情字段对象的进场镜头与场景坐标语义。

export function fieldCameraOrigin(sceneId, mapX, mapY) {
  const x = Number(mapX) - 8;
  const y = Number(mapY) - 7;
  return Number(sceneId) === 0
    ? [((x % 256) + 256) % 256, ((y % 256) + 256) % 256]
    : [x, y];
}

export function sceneCameraCoordinate(sceneId, value, extent = 128) {
  const byte = Number(value) & 0xff;
  return Number(sceneId) !== 0 && byte >= Math.max(128, extent) ? byte - 0x100 : byte;
}

export function sceneCameraByte(sceneId, value) {
  const minimum = Number(sceneId) === 0 ? 0 : -128;
  const maximum = Number(sceneId) === 0 ? 255 : 127;
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new TypeError('目的地超出脚本相机坐标范围');
  return value & 0xff;
}

// 已确认的独立预览入口；实时现场的相机覆盖拥有优先权。
export const STORY_PREVIEW_ENTRY_CAMERAS = Object.freeze({
  246: Object.freeze({
    x: -2, y: -4,
    backgroundSceneId: 9,
    sceneRouteIndex: 1,
    evidence: "PRG:02911E -> 035EF2 inherits $62/$63; scene:09 terminal selects $05AA=1; Mesen natural entry camera=FE,FC",
  }),
});
