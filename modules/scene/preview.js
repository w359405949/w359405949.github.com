// @editor-module 全站场景预览的画布、视口、选点与叠加层。
import {esc} from '../../core/dom.js';
import {state} from '../../core/state.js';
import {sceneMapCell} from '../../core/scene-runtime-map.js';
import {db} from '../../core/project-db.js';
import {sceneActorVisualRaster} from '../../render/scene-actor-appearance.js';
import {blitRaster} from '../../render/chr-raster.js';
import {paintFieldPalette} from '../../render/field-palette.js';
import {canvasViewportControls, bindCanvasViewport} from '../../ui/canvas-viewport.js';
import {renderTileGridCanvas, paintTileGridLines, tileGridGeometry} from '../../views/tile-grid.js';
import {
  paintSceneMap, paintSceneRuntimeMap, paintSceneMapCell, paintSceneMetatileCells,
  paintSceneLogicMarkers, paintSceneBoundaryMarkers,
  loadSceneSurfaceById, loadSceneResourceDocumentById, loadSceneViewportById,
  loadSceneRegionById, loadStorySceneMetatileRenderer,
} from './visual-preview.js';
export {paintSceneThumbnailCanvases, paintVisibleSceneThumbnailCanvases} from './visual-preview.js';

const previews = new WeakMap();
const paintRevisions = new WeakMap();
const previewRequests = new WeakMap();

export const scenePreviewControls = canvasViewportControls;
export function sceneAnnotationsMarkup(annotations = []) {
  return annotations.map(({kind, x, y, width, height, label = ''}) => {
    if (!['point', 'area'].includes(kind) || !Number.isFinite(x) || !Number.isFinite(y)
        || kind === 'area' && (!(width > 0) || !(height > 0)))
      throw new TypeError('场景叠加层坐标无效');
    return `<span class="${kind === 'point' ? 'scene-position-point' : 'scene-point-marker'}"
      data-scene-annotation="${kind}" data-scene-x="${x}" data-scene-y="${y}"
      ${kind === 'area' ? `data-scene-width="${width}" data-scene-height="${height}"` : ''}
      aria-label="${esc(label)}"></span>`;
  }).join('');
}
export const scenePreviewCanvasMarkup = options => renderTileGridCanvas({owner: 'scene-header-map',
  role: 'map', cellWidth: 16, ...options});

export function scenePreviewMarkup({label = '场景预览', canvasAttributes = '', height = 240,
  viewportClassName = '', surfaceClassName = ''} = {}) {
  return `<div class="scene-preview" data-scene-preview>
    <div class="scene-preview-toolbar">${scenePreviewControls('场景缩放')}
      <label class="check"><input type="checkbox" data-scene-preview-grid> 网格</label></div>
    <div class="scene-preview-viewport ${esc(viewportClassName)}" data-scene-preview-viewport tabindex="0" role="region"
      aria-label="${esc(label)}" style="--scene-preview-height:${Number(height)}px">
      <div class="scene-preview-surface ${esc(surfaceClassName)}" data-scene-preview-surface data-canvas-viewport-stack>
        <canvas aria-label="${esc(label)}" ${canvasAttributes}></canvas>
        <span data-scene-preview-annotations aria-hidden="true"></span>
        <span class="scene-point-marker" data-scene-preview-point hidden aria-hidden="true"></span>
      </div>
    </div>
  </div>`;
}

export function scenePreviewController(canvas) { return previews.get(canvas); }

export function bindScenePreview({root, canvas = root?.querySelector('canvas'),
  viewport = root?.querySelector('[data-scene-preview-viewport]'),
  surface = root?.querySelector('[data-scene-preview-surface]') || canvas,
  controls = root, geometry = () => ({width: canvas.width / 16, height: canvas.height / 16, cellSize: 16}),
  onSelect = null, onHover = null, brush = null, onObjectSelect = null, objectAttribute = 'scenePreviewObject',
  mapExtension = null, onMapError = null, ...options} = {}) {
  if (!canvas || !viewport) return null;
  const existing = previews.get(canvas);
  if (existing) { existing.setCallbacks({onSelect, onHover, brush, onObjectSelect}); return existing; }
  let callbacks = {onSelect, onHover, brush, onObjectSelect};
  let painting = null;
  const listeners = [];
  const listen = (node, name, callback) => {
    node.addEventListener(name, callback);
    listeners.push(() => node.removeEventListener(name, callback));
  };
  const extension = mapExtension ? {viewport, screen: surface, canvas: mapExtension,
    dimensions: {viewportWidth: 256, viewportHeight: 240}, snapshot: null, onError: onMapError,
    isCurrent: options.isCurrent || (() => viewport.isConnected)} : null;
  const onLayout = options.onLayout;
  const controller = bindCanvasViewport({viewport, surface, controls, size: () => canvas,
    sizeElement: canvas, ...options, onLayout: () => {
    onLayout?.();
    if (extension) {
      extension.width = viewport.clientWidth;
      extension.height = viewport.clientHeight;
      paintPreviewMapExtension(extension);
    }
  }});
  const cell = event => scenePreviewCellFromPointer(canvas, event, geometry());
  listen(viewport, 'pointerdown', () => viewport.focus({preventScroll: true}));
  listen(canvas, 'click', event => {
    if (!callbacks.onSelect) return;
    const point = cell(event); if (point) callbacks.onSelect(point, event);
  });
  listen(canvas, 'pointermove', event => {if (callbacks.onHover) callbacks.onHover(cell(event), event);});
  listen(canvas, 'pointerleave', event => callbacks.onHover?.(null, event));
  const stopPainting = event => {
    if (painting === null || event?.pointerId != null && event.pointerId !== painting) return;
    const pointerId = painting;
    painting = null;
    if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    callbacks.brush?.end?.();
  };
  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || !callbacks.brush?.enabled()) return;
    const point = cell(event);
    if (!point) return;
    painting = event.pointerId;
    canvas.setPointerCapture(painting);
    callbacks.brush.begin?.(point, event);
    callbacks.brush.paint(point, event);
  });
  listen(canvas, 'pointermove', event => {
    if (event.pointerId !== painting) return;
    if ((event.buttons & 1) === 0 || !callbacks.brush?.enabled()) {stopPainting(event); return;}
    const point = cell(event);
    if (point) callbacks.brush.paint(point, event);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(canvas, name, stopPainting);
  const selectObject = event => {
    const object = event.target.closest?.('[data-' + objectAttribute.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ']');
    if (object) callbacks.onObjectSelect?.(object.dataset[objectAttribute], event);
  };
  listen(viewport, 'click', selectObject);
  listen(viewport, 'keydown', event => {
    if (!['Enter', ' '].includes(event.key) || !callbacks.onObjectSelect) return;
    event.preventDefault(); selectObject(event);
  });
  let lastDrawing = null;
  const grid = root?.querySelector('[data-scene-preview-grid]');
  if (grid) listen(grid, 'change', () => {if (lastDrawing) void preview.draw(lastDrawing);});
  const preview = {...controller, cell,
    setCallbacks: next => {callbacks = {...callbacks, ...next};},
    centerCell: (x, y) => controller.center((x + .5) * (geometry().cellSize || 16),
      (y + .5) * (geometry().cellSize || 16)),
    draw: drawing => {lastDrawing = drawing; return paintScenePreview(canvas, {...drawing,
      grid: grid ? grid.checked : drawing.grid});},
    setMapExtension: (snapshot, dimensions) => {
      if (!extension) return;
      extension.snapshot = snapshot; extension.dimensions = dimensions;
      paintPreviewMapExtension(extension);
    },
    invalidateMapExtension: () => {
      if (!extension) return;
      extension.revision = (extension.revision || 0) + 1;
      extension.key = null;
    },
    destroy: () => {stopPainting(); listeners.forEach(remove => remove()); controller.destroy(); previews.delete(canvas);},
  };
  previews.set(canvas, preview);
  return preview;
}

function paintLogic(context, drawing) {
  if (!drawing.markers && !drawing.boundaries) return;
  const dimensions = {width: Number(drawing.scene.width), height: Number(drawing.scene.height),
    cellSize: drawing.cellSize || 16, actorImages: drawing.actorImages || false};
  paintSceneLogicMarkers(context, drawing.markers || [], dimensions);
  paintSceneBoundaryMarkers(context, drawing.boundaries || [], dimensions);
}

function paintSceneGrid(context, geometry = {}) {
  paintTileGridLines(context, {...geometry, color: 'rgba(0,0,0,.65)', lineWidth: 2});
  paintTileGridLines(context, {...geometry, color: 'rgba(255,255,255,.65)', lineWidth: 1});
}

export function paintScenePreview(canvas, drawing = {}) {
  const revision = (paintRevisions.get(canvas) || 0) + 1;
  paintRevisions.set(canvas, revision);
  const {scene, logic, renderer, surface, raster, bounds, cellSize = 16} = drawing;
  const width = raster?.width || surface?.width || (bounds?.width ?? scene?.width) * cellSize;
  const height = raster?.height || surface?.height || (bounds?.height ?? scene?.height) * cellSize;
  if (!width || !height) return Promise.resolve();
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.dataset.tileGridColumns = width / cellSize;
  canvas.dataset.tileGridRows = height / cellSize;
  canvas.dataset.tileGridCellWidth = cellSize;
  canvas.dataset.tileGridCellHeight = cellSize;
  const context = canvas.getContext('2d');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  if (raster) context.putImageData(new ImageData(raster.data, width, height), 0, 0);
  else if (surface) {
    const scroll = ((Number(drawing.scrollY || 0) % height) + height) % height;
    context.drawImage(surface, 0, -scroll);
    if (scroll) context.drawImage(surface, 0, height - scroll);
    if (drawing.paletteDecrement || drawing.backgroundFlash)
      paintFieldPalette(context, drawing.paletteDecrement || 0, drawing.backgroundFlash || false);
  } else if (renderer) {
    if (bounds) context.translate(-bounds.x * cellSize, -bounds.y * cellSize);
    const options = {cellSize, visibleLayers: drawing.visibleLayers, actionOverlays: drawing.actionOverlays || [],
      ...(bounds ? {region: {x: bounds.x * cellSize, y: bounds.y * cellSize, width, height}} : {})};
    if (drawing.runtime === false) paintSceneMap(context, scene, renderer, options);
    else paintSceneRuntimeMap(context, scene, logic, renderer, options);
  }
  if (drawing.cells?.length && renderer) {
    context.save();
    if (surface) context.translate(-Number(drawing.cameraX || 0) * cellSize, -Number(drawing.cameraY || 0) * cellSize);
    paintSceneMetatileCells(context, scene, renderer, drawing.cells);
    context.restore();
  }
  if (drawing.grid) {
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    paintSceneGrid(context);
    context.restore();
  }
  if (drawing.encounters) paintPreviewEncounterZones(context, drawing.encounters, scene);
  if (drawing.rewrites) paintPreviewRewriteRegions(context, drawing.rewrites, drawing.selectedRewrite);
  paintLogic(context, drawing);
  const point = drawing.focusPoint;
  const focusBounds = drawing.focusBounds || scene;
  if (point && point[0] >= 0 && point[1] >= 0 && point[0] < focusBounds.width && point[1] < focusBounds.height) {
    context.strokeStyle = '#fff'; context.lineWidth = 3;
    context.strokeRect(point[0] * cellSize + 1, point[1] * cellSize + 1, cellSize - 2, cellSize - 2);
  }
  const actors = drawing.actors || [];
  // 角色图层结束后重画对象标记，空角色图层保持同一顺序。
  if (!actors.length && !drawing.actorLayer) return Promise.resolve();
  const connected = canvas.isConnected;
  canvas.dataset.sceneActorsPainted = 'pending';
  return Promise.all(actors.map(async actor => ({...actor,
    raster: actor.raster || await sceneActorVisualRaster(actor.record, scene)}))).then(rows => {
    if (paintRevisions.get(canvas) !== revision || connected && !canvas.isConnected) return;
    for (const {raster, x, y} of rows) {
      if (!raster) continue;
      const image = document.createElement('canvas');
      blitRaster(image, raster);
      context.drawImage(image, (x - Number(drawing.cameraX || 0)) * cellSize + raster.offsetX,
        (y - Number(drawing.cameraY || 0)) * cellSize + raster.offsetY);
    }
    paintLogic(context, drawing);
    canvas.dataset.sceneActorsPainted = '1';
  }).catch(error => {
    if (paintRevisions.get(canvas) === revision) canvas.dataset.sceneActorsPainted = 'error';
    throw error;
  });
}

export function paintScenePreviewCell(canvas, scene, renderer, x, y, {grid = false} = {}) {
  const geometry = tileGridGeometry(canvas);
  const context = canvas.getContext('2d');
  if (!paintSceneMapCell(context, scene, renderer, x, y) || !grid) return;
  const cell = document.createElement('canvas');
  cell.width = geometry.cellWidth; cell.height = geometry.cellHeight;
  const drawing = cell.getContext('2d');
  paintSceneMapCell(drawing, scene, renderer, x, y, {targetX: 0, targetY: 0});
  paintSceneGrid(drawing, {columns: 1, rows: 1,
    cellWidth: geometry.cellWidth, cellHeight: geometry.cellHeight});
  context.drawImage(cell, x * geometry.cellWidth, y * geometry.cellHeight);
}

export async function loadScenePreviewSourceById(sceneId, {view = 'map', ...options} = {}) {
  return view === 'viewport' ? await loadSceneViewportById(sceneId, options)
    : view === 'detailed' ? await loadSceneDetailedSurfaceById(sceneId, options)
    : await loadSceneSurfaceById(sceneId, options);
}

export async function paintScenePreviewById(canvas, sceneId, {isCurrent = () => true, ...options} = {}) {
  const token = {};
  previewRequests.set(canvas, token);
  const source = await loadScenePreviewSourceById(sceneId, options);
  if (previewRequests.get(canvas) !== token || !isCurrent() || !source) return null;
  await (previews.get(canvas)?.draw({surface: source, ...options}) || paintScenePreview(canvas, {surface: source, ...options}));
  return source;
}

export function positionSceneAnnotations(host, {cellSize, sourceX = 0, sourceY = 0,
  sourceWidth, sourceHeight, displayWidth, displayHeight} = {}) {
  if (!host || !sourceWidth || !sourceHeight) return;
  const scale = Math.min(displayWidth / sourceWidth, displayHeight / sourceHeight);
  const offsetX = (displayWidth - sourceWidth * scale) / 2;
  const offsetY = (displayHeight - sourceHeight * scale) / 2;
  for (const marker of host.querySelectorAll('[data-scene-annotation]')) {
    const x = Number(marker.dataset.sceneX) * cellSize;
    const y = Number(marker.dataset.sceneY) * cellSize;
    const point = marker.dataset.sceneAnnotation === 'point';
    marker.style.left = `${offsetX + (x - sourceX + (point ? cellSize / 2 : 0)) * scale}px`;
    marker.style.top = `${offsetY + (y - sourceY + (point ? cellSize / 2 : 0)) * scale}px`;
    if (!point) {
      marker.style.width = `${Number(marker.dataset.sceneWidth) * cellSize * scale}px`;
      marker.style.height = `${Number(marker.dataset.sceneHeight) * cellSize * scale}px`;
    }
  }
}

export function setScenePreviewPoint(root, {x, y, width, height, annotations = []} = {}) {
  const marker = root.querySelector('[data-scene-preview-point]');
  if (marker) {
    marker.hidden = !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height;
    marker.style.left = `${x / width * 100}%`; marker.style.top = `${y / height * 100}%`;
    marker.style.width = `${100 / width}%`; marker.style.height = `${100 / height}%`;
  }
  const layer = root.querySelector('[data-scene-preview-annotations]');
  if (!layer) return;
  layer.replaceChildren(...annotations.map(node => node.cloneNode(true)));
  positionSceneAnnotations(layer, {cellSize: 1, sourceWidth: width, sourceHeight: height,
    displayWidth: width, displayHeight: height});
  for (const node of layer.children) {
    for (const key of ['left', 'width']) node.style[key] = `${Number.parseFloat(node.style[key]) / width * 100}%`;
    for (const key of ['top', 'height']) node.style[key] = `${Number.parseFloat(node.style[key]) / height * 100}%`;
  }
}

function paintPreviewRewriteRegions(context, rewrites, selectedKey) {
  context.save();
  for (const rewrite of [...rewrites.filter(row => row.key !== selectedKey),
    ...rewrites.filter(row => row.key === selectedKey)]) {
    const selected = rewrite.key === selectedKey;
    const color = `hsl(${Number(rewrite.eventFlag) * 47 % 360} 70% 60%)`;
    context.fillStyle = color;
    context.globalAlpha = selected ? .22 : .10;
    for (const row of rewrite.regions)
      context.fillRect(row.x * 16, row.y * 16, row.width * 16, row.height * 16);
    context.globalAlpha = 1;
    context.strokeStyle = selected ? '#fff' : color;
    context.lineWidth = selected ? 3 : 1;
    for (const row of rewrite.regions)
      context.strokeRect(row.x * 16 + 1, row.y * 16 + 1, row.width * 16 - 2, row.height * 16 - 2);
  }
  context.restore();
}


export function encounterZoneColor(zoneId) {
  const value = Number(zoneId);
  if (!value) return [70, 84, 92];
  const hue = (value * 47) % 360;
  const light = 46 + (value % 3) * 8;
  return hslToRgb(hue, 62, light);
}

function hslToRgb(h, s, l) {
  const saturation = s / 100, lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x] : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map(value => Math.round((value + m) * 255));
}

function paintPreviewEncounterZones(context, {binding, activeZone, pickedIndex}, scene) {
  if (!binding) return;
  const cell = 16;
  context.save();
  context.font = "bold 9px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (binding.kind === "world-grid") {
    const size = binding.blockSize * cell;
    for (const [index, block] of binding.blocks.entries()) {
      const zoneId = Number(block.zone_id);
      const selected = zoneId === activeZone;
      const picked = index === pickedIndex;
      const [r, g, b] = encounterZoneColor(zoneId);
      const left = Number(block.cell_x) * cell, top = Number(block.cell_y) * cell;
      context.fillStyle = `rgba(${r},${g},${b},${
        selected ? (zoneId ? .58 : .34) : (zoneId ? .26 : .12)
      })`;
      context.fillRect(left, top, size, size);
      context.strokeStyle = selected ? "#fff" : `rgba(${r},${g},${b},.65)`;
      context.lineWidth = selected ? 3 : 1;
      context.strokeRect(left + .5, top + .5, size - 1, size - 1);
      context.fillStyle = selected ? "#000" : "rgba(7,16,19,.75)";
      context.fillText(zoneId.toString(16).toUpperCase().padStart(2, "0"),
        left + size / 2, top + size / 2);
      if (picked) {
        context.save();
        context.setLineDash([6, 4]);
        context.strokeStyle = "#d8f231";
        context.lineWidth = 3;
        context.strokeRect(left + 2, top + 2, size - 4, size - 4);
        context.restore();
      }
    }
    context.restore();
    return;
  }
  const zoneId = Number(binding.zoneId);
  const [r, g, b] = encounterZoneColor(zoneId);
  const width = Number(scene.width) * cell;
  const height = Number(scene.height) * cell;
  context.fillStyle = `rgba(${r},${g},${b},${zoneId ? .2 : .1})`;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = `rgba(${r},${g},${b},.95)`;
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, width - 3, height - 3);
  context.strokeStyle = "#fff";
  context.lineWidth = 1;
  context.strokeRect(4.5, 4.5, width - 9, height - 9);
  context.restore();
}


function positionPreviewMapExtension(view) {
  const {canvas, region, snapshot, dimensions} = view;
  if (!region || !snapshot) return;
  const pose = [region.x, region.y, Number(snapshot.cameraX || 0),
    Number(snapshot.cameraY || 0), region.canvas.width, region.canvas.height,
    dimensions.viewportWidth, dimensions.viewportHeight].join(":");
  if (view.pose === pose) return;
  view.pose = pose;
  canvas.style.left = `${(region.x - Number(snapshot.cameraX || 0) * 16) / dimensions.viewportWidth * 100}%`;
  canvas.style.top = `${(region.y - Number(snapshot.cameraY || 0) * 16) / dimensions.viewportHeight * 100}%`;
  canvas.style.width = `${region.canvas.width / dimensions.viewportWidth * 100}%`;
  canvas.style.height = `${region.canvas.height / dimensions.viewportHeight * 100}%`;
}

function paintPreviewMapExtension(view) {
  if (!view.isCurrent()) return;
  const {viewport, screen, canvas, snapshot} = view;
  const sceneId = snapshot?.sceneId;
  if (sceneId == null || snapshot?.hidden) {
    canvas.hidden = true;
    view.key = null;
    return;
  }
  const scale = Number.parseFloat(screen.style.width) / view.dimensions.viewportWidth;
  if (!(scale > 0) || !view.width || !view.height) return;
  const x = Number(snapshot.cameraX || 0) * 16 - Number.parseFloat(screen.style.left) / scale;
  const y = Number(snapshot.cameraY || 0) * 16 - Number.parseFloat(screen.style.top) / scale;
  const left = Math.floor(x / 256) * 256, top = Math.floor(y / 256) * 256;
  const right = Math.ceil((x + view.width / scale) / 256) * 256;
  const bottom = Math.ceil((y + view.height / scale) / 256) * 256;
  const key = JSON.stringify([sceneId, left, top, right, bottom,
    snapshot.animationPhase, snapshot.fieldTiles]);
  const documents = ["scene", "shared-chr-bank", "metatile-page", "metatile-set", "palette-runtime-service"]
    .map(id => id === "shared-chr-bank" ? db.peekDocument(id, null)
      : db.peekResourceDocument(id === "scene" ? `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, "0")}` : id, null));
  positionPreviewMapExtension(view);
  if (view.key === key && documents.every((item, index) => item === view.documents[index])) return;
  view.key = key;
  view.documents = documents;
  const revision = view.revision = (view.revision || 0) + 1;
  loadSceneRegionById(Number(sceneId), {x: left, y: top, width: right - left, height: bottom - top,
    animationPhase: snapshot.animationPhase, fieldTiles: snapshot.fieldTiles}).then(region => {
    if (view.revision !== revision || view.key !== key || !view.isCurrent()) return;
    view.region = region;
    canvas.hidden = !region;
    if (!region) return;
    void paintScenePreview(canvas, {surface: region.canvas});
    positionPreviewMapExtension(view);
  }).catch(error => {
    if (view.revision !== revision || !view.isCurrent()) return;
    view.key = null;
    view.onError?.(error);
  });
}

export function paintScenePreviewTiles(canvas, {tiles = [], sceneId, cameraX = 0, cameraY = 0, scrollOffsetY = 0, animationPhase, paletteDecrement = 0, backgroundFlash = false, context, stage}) {
  if (!canvas) return;
  if (canvas.width !== stage.viewportWidth) {
    canvas.width = stage.viewportWidth;
  }
  if (canvas.height !== stage.viewportHeight) {
    canvas.height = stage.viewportHeight;
  }
  if (!tiles.length || !context) {
    if (!canvas.hidden) canvas.hidden = true;
    delete canvas.dataset.drawKey;
    return;
  }
  const drawing = canvas.getContext("2d");
  drawing.imageSmoothingEnabled = false;
  drawing.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.hidden) canvas.hidden = false;
  const drawKey = JSON.stringify([
    Number(sceneId),
    cameraX,
    cameraY,
    scrollOffsetY,
    animationPhase,
    paletteDecrement,
    tiles,
  ]);
  canvas.dataset.drawKey = drawKey;
  return loadStorySceneMetatileRenderer(context, {animationPhase}).then(renderer => {
    if (!renderer || canvas.dataset.drawKey !== drawKey) return;
    drawing.clearRect(0, 0, canvas.width, canvas.height);
    for (const tile of tiles) {
      const source = renderer.metatiles[Number(tile.tileId) & 0x7F];
      if (!source) continue;
      const x = (Number(tile.x) - cameraX) * stage.tileSize;
      const y = (Number(tile.y) - cameraY) * stage.tileSize - scrollOffsetY;
      drawing.drawImage(source, x, y);
      if (scrollOffsetY) drawing.drawImage(source, x,
        y + (scrollOffsetY > 0 ? stage.viewportHeight : -stage.viewportHeight));
    }
    paintFieldPalette(drawing, Number(paletteDecrement) || 0,
      backgroundFlash);
  });
}

const actorLayers = new WeakMap();
const playerRegions = new WeakMap();

export function syncScenePreviewRegions(screen, regions, camera, dimensions) {
  if (!screen) return;
  let layer = playerRegions.get(screen);
  if (!layer) {
    layer = document.createElement("div");
    layer.dataset.scenePreviewRegions = "true";
    Object.assign(layer.style, {position: "absolute", inset: "0", pointerEvents: "none", zIndex: "350"});
    screen.append(layer);
    playerRegions.set(screen, layer);
  }
  while (layer.children.length > regions.length) layer.lastElementChild.remove();
  regions.forEach((wait, index) => {
    let box = layer.children[index];
    if (!box) {
      box = document.createElement("button");
      box.type = "button";

      box.setAttribute("aria-label", "触发区域");
      Object.assign(box.style, {position: "absolute", border: "2px dashed #ffca55", background: "#ffca5518",
        padding: "0", pointerEvents: "auto", boxSizing: "border-box"});
      layer.append(box);
    }
    for (const [key, value] of Object.entries(wait.attributes || {})) box.setAttribute(key, value);
    const region = wait.region;
    box.title = wait.title || '';
    box.style.left = `${(region.left - Number(camera.x || 0)) * 16 / dimensions.viewportWidth * 100}%`;
    box.style.top = `${((region.top - Number(camera.y || 0)) * 16
      - Number(camera.scrollY || 0)) / dimensions.viewportHeight * 100}%`;
    box.style.width = `${(region.right - region.left) * 16 / dimensions.viewportWidth * 100}%`;
    box.style.height = `${(region.bottom - region.top) * 16 / dimensions.viewportHeight * 100}%`;
  });
}

export function syncScenePreviewObjects(layer, rows) {
  if (!layer) return;
  let actors = actorLayers.get(layer);
  if (!actors) actorLayers.set(layer, actors = new Map());
  const present = new Set();
  let cursor = layer.firstElementChild;
  for (const {id, attributes, styles} of rows) {
    present.add(id);
    let cached = actors.get(id);
    if (!cached) {
      cached = {element: document.createElement("span"), attributes: {}, styles: {}};
      actors.set(id, cached);
    }
    const {element} = cached;
    for (const name of Object.keys(cached.attributes)) {
      if (!(name in attributes)) element.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      if (cached.attributes[name] !== value) element.setAttribute(name, value);
    }
    for (const name of Object.keys(cached.styles)) {
      if (!(name in styles)) element.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(styles)) {
      if (cached.styles[name] !== value) element.style.setProperty(name, value);
    }
    if (element !== cursor) layer.insertBefore(element, cursor);
    cursor = element.nextElementSibling;
    cached.attributes = attributes;
    cached.styles = styles;
  }
  for (const [id, cached] of actors) {
    if (present.has(id)) continue;
    cached.element.remove();
    actors.delete(id);
  }
}

/** 把显示画布上的指针换成场景字段对象的一格。 */
function scenePreviewCellFromPointer(canvas, event, {
  cellSize = 16, width, height, scene = null,
} = {}) {
  const size = integer(cellSize, "cellSize", 1, 16);
  const columns = integer(width ?? scene?.width, "scene_width", 1, 256);
  const rows = integer(height ?? scene?.height, "scene_height", 1, 256);
  const rect = canvas.getBoundingClientRect();
  if (!(rect.width > 0) || !(rect.height > 0)) {
    throw new TypeError("场景画布没有可用的显示尺寸");
  }
  const x = Math.floor((Number(event.clientX) - rect.left) * canvas.width / rect.width / size);
  const y = Math.floor((Number(event.clientY) - rect.top) * canvas.height / rect.height / size);
  if (x < 0 || y < 0 || x >= columns || y >= rows) return null;
  return {x, y, metatileId: scene ? sceneMapCell(scene, x, y)?.metatileId ?? null : null};
}

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum)
    throw new TypeError(`${label}: 必须是 ${minimum}..${maximum} 的整数`);
  return result;
}

/** 引用预览在运行时地图上叠加同一套场景逻辑对象。 */
async function loadSceneDetailedSurfaceById(sceneId, {cellSize = 16} = {}) {
  const id = Number(sceneId);
  const [document_, surface] = await Promise.all([
    loadSceneResourceDocumentById(id), loadSceneSurfaceById(id, {cellSize}),
  ]);
  if (!surface) return null;
  const logic = document_?.logic;
  if (!logic?.layers) return surface;
  const canvas = document.createElement("canvas");
  canvas.width = surface.width;
  canvas.height = surface.height;
  const layers = logic.layers;
  const actorRefs = [
    ...(layers.actors?.records || []),
    ...(layers.actors?.dynamic_variants || []).flatMap(row => row.actor_list?.records || []),
  ];
  const actors = actorRefs.length
    ? state.sceneActors || state.project?.scenes?.actors || await db.getDocument("scene-actor", null)
    : null;
  const actorByUid = new Map((actors?.records || []).map(record => [record.uid, record]));
  const rows = [];
  const add = (kind, records) => (records || []).forEach(record =>
    rows.push({kind, record, x: Number(record.x), y: Number(record.y)}));
  add("actor", actorRefs.map(reference => actorByUid.get(reference.uid)).filter(Boolean));
  add("treasure", layers.treasures);
  add("investigation", layers.investigation_points);
  add("investigation-special", layers.investigation_special_points);
  add("investigation-tile", layers.metatile_investigation_points);
  add("transition", layers.transitions?.point_transitions);
  add("event", layers.event_triggers);
  add("vehicle", Object.values(state.vehicleDraft?.placement || {}).filter(record =>
    record.placed && Number(record.scene_id) === id));
  const scene = document_.scene || document_;
  const boundaries = [
    ...(layers.transitions?.boundary_exits || []),
    ...(layers.transitions?.dynamic_boundary_return ? [layers.transitions.dynamic_boundary_return] : []),
  ].map(record => ({record}));
  await paintScenePreview(canvas, {scene, surface, markers: rows, boundaries, cellSize});
  return canvas;
}
