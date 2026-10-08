// @editor-module 通缉令视觉合成与已发布覆盖图投影
import {db} from '../../core/project-db.js';
import {loadChrBankBytes} from '../../core/media-assets.js';
import {replayEnemyFormation} from '../../core/battle-enemy-formation.js';
import {monsterFormationFootprints} from '../../core/monster-visual-recipes.js';
import {state} from "../../core/state.js";
import {monsterFigureImage, monsterFigureSources} from "../../render/monster-figure.js";
import {metaspriteProjectedSources, metaspriteObjectImage} from "../../render/metasprite.js";
import {blitRaster} from "../../render/chr-raster.js";
import {paintUiConstructionSemanticPreview, uiComponentSelectionBounds, uiPaintSelectionOutline} from "./ui-construction-preview.js";
import {interfacePreviewContext} from '../../core/interface-preview-context.js';

export function wantedMonsterWindow(document) {
  const bounds = document?.monster_window?.bounds;
  return bounds && ['x', 'y', 'width', 'height'].every(key => Number.isInteger(bounds[key]))
    && bounds.width > 0 && bounds.height > 0 ? {...bounds} : null;
}

export function wantedDefeatedOverlayAsset(preview, document) {
  const context = state.project?.visuals?.metasprites?.wanted_defeated_overlay;
  const declaration = document?.defeated_overlay?.direct_frame;
  const resourceId = declaration?.resource_id;
  const frame = /^direct-frame:([0-9A-F]+)$/u.exec(resourceId || '');
  if (
    context?.consumer_id !== "ui-wanted:defeated-overlay"
    || !frame || !declaration
    || !['x', 'y', 'width', 'height', 'chr_bank'].every(field => Number.isInteger(declaration[field]))
    || !Array.isArray(context?.palette)
    || context.palette.length !== 4
  ) return null;
  return {
    ...context,
    ...declaration,
    resourceId,
    slot: declaration.slot,
    frameId: Number.parseInt(frame[1], 16),
    rendererSelector: Number(declaration.renderer_selector),
    chrBank: declaration.chr_bank,
    patternSourceBank: Number(context.chr_bank),
  };
}

async function wantedMonsterFigureSurface(enemyId) {
  const sources = await monsterFigureSources({enemyId});
  const {width, height, data} = monsterFigureImage(sources, 1, {background: null});
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  const context = surface.getContext("2d", {willReadFrequently: false});
  const image = context.createImageData(width, height);
  image.data.set(data);
  context.putImageData(image, 0, 0);
  return {surface, left: 4, top: 4, width: width - 8, height: height - 8};
}

// 盖章使用当前直接帧、图案页与构造落点。
async function paintWantedDefeatedOverlay(
  canvas, resolved, isCurrent = () => true
) {
  if (!canvas || !resolved?.defeated) return;
  const overlay = resolved.defeatedOverlay;
  if (!overlay || !Array.isArray(overlay.palette)) {
    canvas.dataset.wantedDefeatedOverlayError = "击破直接帧缺少已发布的 CHR 图案投影";
    return;
  }
  const patterns = overlay.chrBank === overlay.patternSourceBank
    ? overlay.chr_pattern : await loadChrBankBytes(overlay.chrBank);
  if (!patterns || patterns.length !== 0x400)
    throw new TypeError('通缉盖章缺少当前图案页投影');
  const sources = await metaspriteProjectedSources(Array.from(patterns), overlay.palette);
  const frame = sources.recipe.directFrames.find(item => item.id === overlay.frameId);
  if (!frame) throw new TypeError('通缉盖章缺少当前直接帧');
  if (!isCurrent()) return;
  if (frame.sprites.some(sprite => !sprite.transparentTile
    && (!sources.tiles[sprite.tile] || sources.palettes.length < (sprite.palette + 1) * 4)))
    throw new TypeError('通缉盖章的直接帧缺少当前图案或调色板');
  const surface = document.createElement("canvas");
  blitRaster(surface, metaspriteObjectImage(sources, frame, {
    size: overlay.width, scale: 1, background: null,
  }));
  if (!isCurrent()) return;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(
    surface,
    0, 0, surface.width, surface.height,
    overlay.x,
    overlay.y,
    overlay.width,
    overlay.height,
  );
  delete canvas.dataset.wantedDefeatedOverlayError;
}

/** Overlay the canonical monster-visual-layout figures after the ROM poster base. */
async function paintWantedMonsterOverlay(
  canvas,
  resolved,
  isCurrent = () => true,
  loadFigure = wantedMonsterFigureSurface,
) {
  if (!canvas || !resolved) return;
  const placement = resolved.monsterPlacement;
  if (!Number.isInteger(placement?.cell_pixels) || placement.cell_pixels < 1
      || !['x', 'y'].every(key => Number.isInteger(placement.offset_cells?.[key]))) {
    canvas.dataset.wantedMonsterOverlayError = '通缉令缺少编队放置关系';
    return;
  }
  const loaded = await Promise.allSettled(
    resolved.representatives.map(async representative => ({
      representative,
      image: await loadFigure(representative.monster_id),
    })),
  );
  const images = loaded
    .filter(result => result.status === "fulfilled" && result.value.image)
    .map(result => result.value);
  if (!isCurrent()) return;
  canvas.dataset.wantedMonsterOverlayCount = String(images.length);
  if (!images.length) {
    canvas.dataset.wantedMonsterOverlayError = loaded
      .filter(result => result.status === "rejected")
      .map(result => String(result.reason?.message || result.reason))
      .join("；") || "当前编队没有可绘制的怪物图形";
    return;
  }
  delete canvas.dataset.wantedMonsterOverlayError;

  const [visuals, engine] = await Promise.all([
    db.getResourceDocument('monster-visual-layout', null),
    db.getResourceDocument('battle-engine', null),
  ]);
  const groups = resolved.representatives.map(representative => ({
    monsterId: representative.monster_id, count: representative.count,
  }));
  const formation = replayEnemyFormation(groups, [], monsterFormationFootprints(visuals),
    engine.special_monster_placement);
  if (formation.rejections.length) throw new TypeError(formation.rejections[0].reason);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  for (const instance of formation.slots.filter(Boolean)) {
    const source = images.find(image => image.representative.monster_id === instance.monsterId);
    if (!source) continue;
    const image = source.image;
    context.drawImage(image.surface, image.left, image.top, image.width, image.height,
      instance.pixelX + placement.offset_cells.x * placement.cell_pixels,
      instance.pixelY + placement.offset_cells.y * placement.cell_pixels, image.width, image.height);
  }
}

export async function paintWantedPosterVisual(canvas, resolved, preview, isCurrent = () => true) {
  const base = {...preview, selection: null};
  const projection = await db.reusePreviewProjection('wanted-poster-base', [
    JSON.stringify(base), JSON.stringify(interfacePreviewContext().scene), state.project?.text_record_edits,
  ], async () => {
    const surface = document.createElement('canvas');
    const painted = await paintUiConstructionSemanticPreview(surface, base, {backgroundCanvas: canvas});
    const properties = Object.fromEntries(['uiDrawnComponents', 'uiComponentSlots', 'uiResolvedPreview',
      'componentTrace', 'interfacePixels', 'uiInterfacePixelMask'].map(key => [key, surface[key]]));
    return {painted, properties, dataset: {...surface.dataset},
      image: surface.getContext('2d').getImageData(0, 0, surface.width, surface.height)};
  }, {sources: [{kind: 'field', id: 'text-record'}]});
  if (!projection || !isCurrent()) return null;
  const {image: origin, properties} = projection;
  canvas.width = origin.width;
  canvas.height = origin.height;
  Object.assign(canvas, properties);
  for (const key of ['uiTextSlotStates', 'facilityPreviewGaps', 'interfacePreviewRandomActors', 'interfacePreviewSceneError']) {
    if (projection.dataset[key] !== undefined) canvas.dataset[key] = projection.dataset[key];
    else delete canvas.dataset[key];
  }
  const bounds = preview.selection?.bounds
    || uiComponentSelectionBounds(properties.uiDrawnComponents, preview.selection);
  const image = new ImageData(new Uint8ClampedArray(origin.data), origin.width, origin.height);
  if (bounds) {
    uiPaintSelectionOutline(image, bounds);
    canvas.dataset.uiSelectionBounds = JSON.stringify(bounds);
  } else delete canvas.dataset.uiSelectionBounds;
  if (properties.uiResolvedPreview?.interface_preview_background) {
    for (let pixel = 0; pixel < properties.uiInterfacePixelMask.length; pixel++) {
      if (!properties.uiInterfacePixelMask[pixel]) image.data.set(origin.data.subarray(pixel * 4, pixel * 4 + 4), pixel * 4);
    }
  }
  canvas.getContext('2d').putImageData(image, 0, 0);
  await paintWantedMonsterOverlay(canvas, resolved, isCurrent);
  await paintWantedDefeatedOverlay(canvas, resolved, isCurrent);
  return {...projection.painted, surface: canvas, selectionBounds: bounds};
}
