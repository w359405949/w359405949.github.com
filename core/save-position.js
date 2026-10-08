// @editor-module 在存档相机原点与角色所在地图格之间换算。
const AXES = Object.freeze({x: 8, y: 7});

function byte(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 255)
    throw new RangeError(`${label} 须为 0–255 的整数`);
  return value;
}

export function playerTileFromSaveCamera(cameraX, cameraY) {
  return {
    x: (byte(cameraX, "相机 X") + AXES.x) & 0xff,
    y: (byte(cameraY, "相机 Y") + AXES.y) & 0xff,
  };
}

export function saveCameraFromPlayerTile(x, y) {
  return {
    cameraX: (byte(x, "角色 X") - AXES.x + 256) & 0xff,
    cameraY: (byte(y, "角色 Y") - AXES.y + 256) & 0xff,
  };
}
