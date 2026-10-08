// @editor-module 场景角色绘制路径与当前像素。
import {db} from '../core/project-db.js';
import {ACTOR_ENTRY_SCENE_OBJECT, peekActorAppearance, actorSetBanks,
  actorSetSources, actorPoseForAppearance, actorTiles} from './actor-atlas.js';
import {metaspriteContextSources} from './metasprite.js';
import {createRaster, paintChrTile} from './chr-raster.js';

const byteHex = value => `0x${Number(value).toString(16).toUpperCase().padStart(2, '0')}`;
const sourcesByDocument = new WeakMap();

export function actorAppearanceContextForScene(scene) {
  const raw = scene?.header?.[15];
  return {pair: Number(scene?.id) === 0 ? 0x94
    : Number.isInteger(raw) && raw >= 0 && raw <= 255 ? raw & 0xfe : null,
    entryPoint: ACTOR_ENTRY_SCENE_OBJECT};
}

export function sceneActorVisualDescriptor(record) {
  const marker = Number(record?.render_slot_marker || 0);
  const id = Number(record?.actor_type);
  if (marker === 0) {
    const appearance = peekActorAppearance(id, {entryPoint: ACTOR_ENTRY_SCENE_OBJECT});
    return {marker, source: 'actor-visual', kind: 'actor-motion',
      label: appearance?.motionLabel || `无有效角色运动 ${byteHex(id)}`, appearance};
  }
  return {marker, source: 'metasprite-record',
    kind: marker === 1 ? 'direct-frame' : 'generic-metasprite',
    label: `${marker === 1 ? '直接帧' : '通用 metasprite'} ${byteHex(id)}`, appearance: null};
}

export async function sceneActorVisualRaster(record, scene) {
  const {pair} = actorAppearanceContextForScene(scene);
  if (pair === null || !record) return null;
  const [actorDocument, chrDocument, metaspriteDocument, visuals] = await Promise.all([
    db.getDocument('actor-visual'), db.getDocument('shared-chr-bank'), db.getDocument('metasprite-record'),
    db.getDocument('project.visuals'),
  ]);
  let cache = sourcesByDocument.get(chrDocument);
  if (!cache || cache.actorDocument !== actorDocument || cache.metaspriteDocument !== metaspriteDocument
      || cache.visuals !== visuals) {
    cache = {actorDocument, metaspriteDocument, visuals, actors: new Map(), metasprites: new Map()};
    sourcesByDocument.set(chrDocument, cache);
  }
  const descriptor = sceneActorVisualDescriptor(record);
  if (descriptor.kind === 'actor-motion') {
    if (!descriptor.appearance) return null;
    const pose = actorPoseForAppearance(descriptor.appearance,
      {direction: ['up', 'down', 'left', 'right'][Number(record.direction)] || 'down', step: 0});
    if (pose.frame === 0) return null;
    if (!cache.actors.has(pair)) cache.actors.set(pair, actorSetSources(pair));
    const {tiles, recipe} = await cache.actors.get(pair);
    const raster = createRaster(16, 16, null);
    for (const sprite of actorTiles(pose.frame, recipe, pose.oamAttributes)) {
      paintChrTile(raster.data, 16, sprite.x * 8, sprite.y * 8, tiles[sprite.tile],
        recipe.palettes[sprite.palette], {hflip: sprite.hflip, vflip: sprite.vflip, background: null});
    }
    return {...raster, offsetX: 0, offsetY: pose.screenOffsetY};
  }
  if (Number(record.actor_type) === 0) return null;
  if (!cache.metasprites.has(pair)) {
    const palettes = [...actorDocument.field_sprite_palettes].sort((a, b) => a.id - b.id)
      .flatMap(row => row.colors);
    cache.metasprites.set(pair, metaspriteContextSources(actorSetBanks(pair, visuals), palettes));
  }
  const sources = await cache.metasprites.get(pair);
  const rows = descriptor.kind === 'direct-frame' ? sources.recipe.directFrames : sources.recipe.genericObjects;
  const item = rows.find(row => row.id === Number(record.actor_type));
  const sprites = item?.sprites?.filter(sprite => !sprite.transparentTile) || [];
  if (!sprites.length) return null;
  const minX = Math.min(...sprites.map(sprite => sprite.x));
  const minY = Math.min(...sprites.map(sprite => sprite.y));
  const width = Math.max(...sprites.map(sprite => sprite.x)) + 8 - minX;
  const height = Math.max(...sprites.map(sprite => sprite.y)) + 8 - minY;
  const raster = createRaster(width, height, null);
  for (const sprite of sprites) paintChrTile(raster.data, width, sprite.x - minX, sprite.y - minY,
    sources.tiles[sprite.tile], sources.palettes.slice(sprite.palette * 4, sprite.palette * 4 + 4),
    {hflip: sprite.horizontalFlip, vflip: sprite.verticalFlip, background: null});
  return {...raster, offsetX: minX, offsetY: minY + 1};
}
