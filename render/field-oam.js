// @editor-module 场景精灵按纵向重叠区间裁剪。
import {spriteVisibleBands} from './frame-composition.js';
export function applyFieldSpriteLimit(actors, viewportWidth, viewportHeight) {
  const sprites = [], groups = new Map();
  for (const actor of [...actors].sort((left, right) => right.oam.priority - left.oam.priority)) {
    const {cells, left, top, size, horizontalFlip, verticalFlip} = actor.oam;
    groups.set(actor, []);
    for (const cell of cells) {
      const x = horizontalFlip ? size - cell.x - 8 : cell.x;
      const y = verticalFlip ? size - cell.y - 8 : cell.y;
      if (left + x + 8 <= 0 || left + x >= viewportWidth) continue;
      const sprite = {cell, y: Math.round(top + y), height: 8};
      sprites.push(sprite); groups.get(actor).push(sprite);
    }
  }
  const visibility = spriteVisibleBands(sprites.slice(0, 64), viewportHeight);
  for (const [actor, submitted] of groups) {
    const rectangles = [];
    let clipped = false;
    for (const sprite of submitted) {
      const bands = visibility.get(sprite) || [];
      const visible = Math.max(0, Math.min(viewportHeight, sprite.y + 8) - Math.max(0, sprite.y));
      if (bands.reduce((sum, band) => sum + band.bottom - band.top, 0) < visible) clipped = true;
      for (const band of bands) {
        const y = actor.oam.verticalFlip ? sprite.cell.y + 8 - (band.bottom - sprite.y)
          : sprite.cell.y + band.top - sprite.y;
        rectangles.push(`<rect x="${sprite.cell.x}" y="${y}" width="8" height="${band.bottom - band.top}" fill="white"/>`);
      }
    }
    if (!clipped) continue;
    const {size} = actor.oam;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${rectangles.join("")}</svg>`;
    actor.styles["mask-image"] = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    actor.styles["mask-size"] = "100% 100%";
  }
}
