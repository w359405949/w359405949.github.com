// @editor-module 战斗人物 / 狼 / 载具共用绘制器
import {BATTLE_ACTOR_CHR_BANKS} from "../core/battle-actor-assets.js";
import {createRaster} from "./chr-raster.js";
import {metaspriteContextSources, metaspriteObjectImage} from "./metasprite.js";
import {
  battleActionPlacements,
  paintBattleAction,
} from "./weapon-effect-vm.js";

export async function battleActorSources() {
  return metaspriteContextSources(BATTLE_ACTOR_CHR_BANKS);
}

function gameAnchorOffsetFromSprites(sprites) {
  if (!sprites?.length) return {x: 0, y: 0};
  const left = Math.min(...sprites.map(item => Number(item.x)));
  const top = Math.min(...sprites.map(item => Number(item.y)));
  const right = Math.max(...sprites.map(item => Number(item.x) + 8));
  const bottom = Math.max(...sprites.map(item => Number(item.y) + 8));
  return {
    x: -(left + right) / 2,
    y: -(top + bottom) / 2 - 1,
  };
}

/** 返回将“组合器视觉中心”转为该图形游戏坐标锚点的偏移。 */
export function battleActorGameAnchorOffset(sources, action) {
  if (!action) return {x: 0, y: 0};
  if (action.kind === "battle-action") {
    const sprites = battleActionPlacements(action.resource).map(
      ([, x, y]) => ({x, y}),
    );
    return gameAnchorOffsetFromSprites(sprites);
  }
  const objects = action.resource?.kind === "direct-frame"
    ? sources?.recipe?.directFrames : sources?.recipe?.genericObjects;
  const item = objects?.find(entry => entry.id === Number(action.id));
  return gameAnchorOffsetFromSprites(
    (item?.sprites || []).filter(sprite => !sprite.transparentTile),
  );
}

export function battleActorImage(
  sources,
  action,
  {size = 96, scale = 1, background = null} = {},
) {
  if (!action) return null;
  if (action.kind === "battle-action") {
    const raster = createRaster(size, size, background);
    paintBattleAction(
      raster,
      action.resource,
      sources.tiles,
      sources.palettes,
      Math.floor(size / 2),
      Math.floor(size / 2),
      {scale},
    );
    return raster;
  }
  const objects = action.resource?.kind === "direct-frame"
    ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = objects.find(entry => entry.id === Number(action.id));
  return item ? metaspriteObjectImage(sources, item, {
    size,
    scale,
    background,
  }) : null;
}
