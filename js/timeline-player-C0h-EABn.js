import { esc, loadSceneViewportById, loadSceneSurfaceById, paintFieldPalette, paintSceneMap, paintSceneRuntimeMap, paintSceneMetatileCells, blitRaster, bindCanvasViewport, loadSceneResourceDocumentById, paintSceneLogicMarkers, paintSceneBoundaryMarkers, loadStorySceneMetatileRenderer, canvasViewportControls, loadSceneRegionById, sceneMapCell, paintSceneMapCell, handleTextMarkup } from './monster-figure-C07vG7yu.js';
import { state } from './emulator-Bl-sLXnd.js';
import { db } from './scene-actors-Cftr7mCE.js';
import { sceneActorVisualRaster } from './write-access-marker-Q1IasgBx.js';

// @editor-module 可复用的二维格画布外壳与交互几何
//
// 这里只拥有画布尺寸、格坐标换算和逐格绘制循环。格子表示地图图块、战斗对象
// 布局还是别的领域数据，由调用方决定；图案解码、调色板、业务叠层和保存规则都
// 留在各自 owner 内。


const positiveInteger = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new TypeError(`${label} 必须是正整数`);
  }
  return number;
};

function declaredGeometry({columns, rows, cellWidth, cellHeight}) {
  const normalizedCellWidth = positiveInteger(cellWidth, "格宽");
  const normalizedCellHeight = positiveInteger(cellHeight, "格高");
  const normalizedColumns = positiveInteger(columns, "列数");
  const normalizedRows = positiveInteger(rows, "行数");
  return {
    columns: normalizedColumns,
    rows: normalizedRows,
    cellWidth: normalizedCellWidth,
    cellHeight: normalizedCellHeight,
    width: normalizedColumns * normalizedCellWidth,
    height: normalizedRows * normalizedCellHeight,
  };
}

function additionalDataAttributes(data) {
  return Object.entries(data || {}).map(([key, value]) => {
    if (!/^[a-z][a-z0-9-]*$/u.test(key) || key.startsWith("tile-grid-")) {
      throw new TypeError(`二维格画布 data 属性无效：${key}`);
    }
    return ` data-${key}="${esc(value)}"`;
  }).join("");
}

/**
 * 输出领域无关的二维格 canvas。调用方只声明语义 owner、格数与显示尺寸；
 * 不把 tile 编号、bank、地址或编码宽度放进公共组件。
 */
function renderTileGridCanvas({
  id = "",
  owner,
  role = "grid",
  columns,
  rows,
  cellWidth,
  cellHeight = cellWidth,
  className = "",
  style = "",
  label = "二维格画布",
  readOnly = false,
  data = {},
} = {}) {
  const geometry = declaredGeometry({columns, rows, cellWidth, cellHeight});
  if (!String(owner || "").trim()) throw new TypeError("二维格画布缺少 owner");
  return `<canvas${id ? ` id="${esc(id)}"` : ""}${
    className ? ` class="${esc(className)}"` : ""
  } width="${geometry.width}" height="${geometry.height}"${
    style ? ` style="${esc(style)}"` : ""
  } aria-label="${esc(label)}"${additionalDataAttributes(data)}
    data-tile-grid-component="tile-grid/v1"
    data-tile-grid-owner="${esc(owner)}"
    data-tile-grid-role="${esc(role)}"
    data-tile-grid-columns="${geometry.columns}"
    data-tile-grid-rows="${geometry.rows}"
    data-tile-grid-cell-width="${geometry.cellWidth}"
    data-tile-grid-cell-height="${geometry.cellHeight}"
    data-tile-grid-read-only="${readOnly ? "true" : "false"}"></canvas>`;
}

/** 只从公共组件声明读取几何，领域代码不再各写一份固定除数。 */
function tileGridGeometry(canvas) {
  if (!canvas?.dataset) throw new TypeError("二维格画布不存在");
  const geometry = declaredGeometry({
    columns: canvas.dataset.tileGridColumns,
    rows: canvas.dataset.tileGridRows,
    cellWidth: canvas.dataset.tileGridCellWidth,
    cellHeight: canvas.dataset.tileGridCellHeight,
  });
  if (Number(canvas.width) !== geometry.width || Number(canvas.height) !== geometry.height) {
    throw new TypeError("二维格画布尺寸与格声明不一致");
  }
  return geometry;
}

function contextGeometry(context, options) {
  const explicit = [
    options.columns,
    options.rows,
    options.cellWidth,
    options.cellHeight,
  ].every(value => value !== undefined);
  return explicit
    ? declaredGeometry(options)
    : tileGridGeometry(options.canvas || context?.canvas);
}

/** 在已有领域画面上叠加公共格线；不参与格内内容的解释。 */
function paintTileGridLines(context, {
  canvas = null,
  columns,
  rows,
  cellWidth,
  cellHeight,
  color = "rgba(216,242,49,.28)",
  lineWidth = 0.5,
} = {}) {
  if (!context) throw new TypeError("二维格画布缺少绘图上下文");
  const geometry = contextGeometry(context, {
    canvas, columns, rows, cellWidth, cellHeight,
  });
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  for (let column = 0; column <= geometry.columns; column += 1) {
    const x = column * geometry.cellWidth;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, geometry.height);
    context.stroke();
  }
  for (let row = 0; row <= geometry.rows; row += 1) {
    const y = row * geometry.cellHeight;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(geometry.width, y);
    context.stroke();
  }
  return geometry;
}

/**
 * 领域提供单格 painter，公共组件只负责遍历和坐标。适合静态矩阵预览，也能作为
 * 后续带 owner 上下文的逐格编辑画布底座。
 */
function paintTileGridCells(canvas, paintCell, {clear = true} = {}) {
  if (typeof paintCell !== "function") throw new TypeError("二维格画布缺少单格 painter");
  const geometry = tileGridGeometry(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new TypeError("二维格画布无法取得绘图上下文");
  if (clear) context.clearRect(0, 0, geometry.width, geometry.height);
  let painted = 0;
  for (let row = 0; row < geometry.rows; row += 1) {
    for (let column = 0; column < geometry.columns; column += 1) {
      paintCell({
        canvas,
        context,
        column,
        row,
        x: column * geometry.cellWidth,
        y: row * geometry.cellHeight,
        width: geometry.cellWidth,
        height: geometry.cellHeight,
      });
      painted += 1;
    }
  }
  canvas.dataset.tileGridPaintedCells = String(painted);
  return painted;
}

// @editor-module 全站场景预览的画布、视口、选点与叠加层。

const previews = new WeakMap();
const paintRevisions = new WeakMap();
const previewRequests = new WeakMap();

const scenePreviewControls = canvasViewportControls;
function sceneAnnotationsMarkup(annotations = []) {
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
const scenePreviewCanvasMarkup = options => renderTileGridCanvas({owner: 'scene-header-map',
  role: 'map', cellWidth: 16, ...options});

function scenePreviewMarkup({label = '场景预览', canvasAttributes = '', height = 240,
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

function scenePreviewController(canvas) { return previews.get(canvas); }

function bindScenePreview({root, canvas = root?.querySelector('canvas'),
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

function paintScenePreview(canvas, drawing = {}) {
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

function paintScenePreviewCell(canvas, scene, renderer, x, y, {grid = false} = {}) {
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

async function loadScenePreviewSourceById(sceneId, {view = 'map', ...options} = {}) {
  return view === 'viewport' ? await loadSceneViewportById(sceneId, options)
    : view === 'detailed' ? await loadSceneDetailedSurfaceById(sceneId, options)
    : await loadSceneSurfaceById(sceneId, options);
}

async function paintScenePreviewById(canvas, sceneId, {isCurrent = () => true, ...options} = {}) {
  const token = {};
  previewRequests.set(canvas, token);
  const source = await loadScenePreviewSourceById(sceneId, options);
  if (previewRequests.get(canvas) !== token || !isCurrent() || !source) return null;
  await (previews.get(canvas)?.draw({surface: source, ...options}) || paintScenePreview(canvas, {surface: source, ...options}));
  return source;
}

function positionSceneAnnotations(host, {cellSize, sourceX = 0, sourceY = 0,
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

function setScenePreviewPoint(root, {x, y, width, height, annotations = []} = {}) {
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


function encounterZoneColor(zoneId) {
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
    const unchanged = view.region === region;
    view.region = region;
    canvas.hidden = !region;
    if (!region) return;
    if (!unchanged) void paintScenePreview(canvas, {surface: region.canvas});
    positionPreviewMapExtension(view);
  }).catch(error => {
    if (view.revision !== revision || !view.isCurrent()) return;
    view.key = null;
    view.onError?.(error);
  });
}

function paintScenePreviewTiles(canvas, {tiles = [], sceneId, cameraX = 0, cameraY = 0, scrollOffsetY = 0, animationPhase, paletteDecrement = 0, backgroundFlash = false, context, stage}) {
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

function syncScenePreviewRegions(screen, regions, camera, dimensions) {
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

function syncScenePreviewObjects(layer, rows) {
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

// @editor-module 时间轴轨道层级与区段边界投影。
function timelineTreeRows(lanes) {
  const byId = new Map(lanes.map(lane => [lane.id, lane]));
  if (byId.size !== lanes.length) throw new Error("时间轴行 ID 重复");
  const children = new Map();
  for (const lane of lanes) {
    if (lane.parentId && !byId.has(lane.parentId)) throw new Error(`时间轴父轨不存在：${lane.parentId}`);
    const parent = byId.has(lane.parentId) ? lane.parentId : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(lane);
  }
  const rows = [];
  const visit = (lane, depth, hidden) => {
    const descendants = children.get(lane.id) || [];
    rows.push({...lane, depth, hidden, hasChildren: descendants.length > 0});
    for (const child of descendants) visit(child, depth + 1, hidden || lane.expanded === false);
  };
  for (const lane of children.get(null) || []) visit(lane, 0, false);
  if (rows.length !== lanes.length) throw new Error("时间轴父子关系成环");
  return rows;
}

function timelineDescendants(lanes, id) {
  const descendants = [];
  const visit = parent => {
    for (const lane of lanes.filter(item => item.parentId === parent)) {
      descendants.push(lane);
      visit(lane.id);
    }
  };
  visit(id);
  return descendants;
}

function timelineSummaryBlocks(lanes, id) {
  const frames = new Set();
  for (const lane of timelineDescendants(lanes, id)) {
    for (const block of lane.blocks || []) {
      frames.add(block.start);
      if (block.frames) frames.add(block.start + block.frames);
    }
    for (const [frame] of lane.curve?.points || []) frames.add(frame);
  }
  return [...frames].sort((a, b) => a - b).map(start => ({start, tone: "summary"}));
}

function timelineSelectedBlocks(lanes, id, frame, blockIndex = null) {
  const lane = lanes.find(item => item.id === id);
  if (!lane) return [];
  const descendants = timelineDescendants(lanes, id);
  if (!descendants.length) return blockIndex === null ? [] : [{laneId: id, blockIndex}];
  return [...(blockIndex === null ? [] : [{laneId: id, blockIndex}]),
    ...descendants.flatMap(child => (child.blocks || []).flatMap((block, index) =>
      block.start === frame || block.frames && block.start + block.frames === frame
        ? [{laneId: child.id, blockIndex: index}] : []))];
}

// @editor-module 时间轴键通过紧凑记录挂载为原生节点。
const prepared = new WeakMap();
const layouts = new WeakMap();
const recordGroups = new WeakMap();
const mountedRoots = new WeakSet();
const deferredStyles = new WeakMap();

function rememberTimelineKeyStyle(node, css) {
  if (deferredStyles.has(node) || node.classList.contains('is-selected') || node.classList.contains('is-current')) return;
  if (!css) return;
  deferredStyles.set(node, {css, changed: false});
  node.setAttribute('style', '');
}

function deferTimelineKeyStyle(node) {
  rememberTimelineKeyStyle(node, node.getAttribute('style'));
}

function restoreTimelineKeyStyle(node) {
  const style = deferredStyles.get(node);
  if (!style) return;
  node.setAttribute('style', style.css);
  if (style.changed) {
    const left = style.left ?? node.style.left, width = style.width ?? node.style.width;
    node.style.left = left; node.style.width = width;
  }
  deferredStyles.delete(node);
}

function setTimelineKeyStyle(node, property, value) {
  const style = deferredStyles.get(node);
  if (style) {style[property] = value; style.changed = true;}
  else node.style[property] = value;
}

function timelineKeyLayout(lane) {
  const cached = layouts.get(lane);
  if (cached && cached.first === lane.firstElementChild && cached.last === lane.lastElementChild
      && cached.count === lane.childElementCount) return cached;
  const keys = [...lane.querySelectorAll('[data-tl-frame]')].map(node => ({node,
    start: Number(node.dataset.tlPosition ?? node.dataset.tlFrame),
    frames: Number(node.dataset.tlDuration) || 1,
    empty: !node.firstChild,
    decoration: node.classList.contains('tl-block--palette') || node.classList.contains('tl-block--diamond')
      || node.hasAttribute('data-story-timing-changed')}));
  return rememberKeyLayout(lane, keys);
}

function rememberKeyLayout(lane, keys) {
  keys.sort((a, b) => a.start - b.start);
  keys.forEach((key, index) => {key.available = (keys[index + 1]?.start ?? Infinity) - key.start;});
  const layout = {keys, allInteger: keys.every(key => Number.isInteger(key.start)),
    first: lane.firstElementChild, last: lane.lastElementChild, count: lane.childElementCount};
  layouts.set(lane, layout);
  return layout;
}

function timelineKeyRecords(records, groups = null) {
  if (groups) {
    const index = groups.push(records) - 1;
    return `<script type="application/json" data-tl-key-records data-tl-key-group="${index}"></script>`;
  }
  for (const record of records) if (record[4]) record[4] = Object.fromEntries(
    Object.entries(record[4]).map(([key, value]) => [key, String(value)]));
  return '<script type="application/json" data-tl-key-records>' + JSON.stringify(records).replaceAll('<', '\\u003c') + '</script>';
}

function timelineKeyUnpainted(start, frames, available, rect, range, min, ratio, empty, decoration) {
  const span = range.end - range.start;
  const width = Math.min(Math.max(min, (frames || 1) / span * rect.width), available / span * rect.width);
  const left = (rect.x + (start - range.start) / span * rect.width) * ratio, right = left + width * ratio;
  const margin = Math.max(0.05, ratio / 24);
  const distance = value => Math.abs(value - Math.floor(value) - 0.5);
  return ratio === 1 && rect.width > 0 && empty && !decoration && Number.isInteger(start) && width * ratio < 0.2
    && left > (rect.x + 8) * ratio && right < (rect.x + rect.width - 8) * ratio
    && distance(left) > margin && distance(right) > margin && Math.round(left) === Math.round(right);
}

function timelineKeysPrepared(lane, rect, range, ratio) {
  const old = prepared.get(lane);
  return old && old.x === rect.x && old.width === rect.width && old.start === range.start
    && old.end === range.end && old.ratio === ratio && old.first === lane.firstElementChild
    && old.last === lane.lastElementChild && old.count === lane.childElementCount;
}

function rememberTimelineKeys(lane, rect, range, ratio) {
  prepared.set(lane, {x: rect.x, width: rect.width, ...range, ratio,
    first: lane.firstElementChild, last: lane.lastElementChild, count: lane.childElementCount});
}

function registerTimelineKeyRecords(root, groups) {
  if (groups) recordGroups.set(root, groups);
}

function prepareTimelineKeys(root, groups = null) {
  registerTimelineKeyRecords(root, groups);
  const sources = [...root.querySelectorAll('[data-tl-key-records]')];
  if (!root.isConnected) return;
  if (!sources.length) {mountedRoots.add(root); return;}
  const range = {start: Number(root.dataset.tlStart), end: Number(root.dataset.tlEnd)};
  const ratio = root.ownerDocument.defaultView.devicePixelRatio || 1;
  const rects = sources.map(source => source.closest('[data-tl-lane]').getBoundingClientRect());
  const templates = new Map();
  const jobs = sources.map((source, sourceIndex) => {
    const lane = source.closest('[data-tl-lane]');
    const records = source.hasAttribute('data-tl-key-group')
      ? recordGroups.get(root)?.[Number(source.dataset.tlKeyGroup)] : JSON.parse(source.textContent);
    if (!records) throw new Error('时间轴键记录不可用');
    const keys = records.map(record => ({start: Number(record[0]), frames: Number(record[1]) || 1, empty: true,
      decoration: record[2] === 'palette' || record[2] === 'diamond'
        || Object.hasOwn(record[4] || {}, 'story-timing-changed')}));
    const layout = rememberKeyLayout(lane, [...keys]);
    const rect = rects[sourceIndex], min = Number(lane.dataset.tlKeyMinWidth);
    for (const key of keys) key.hidden = layout.allInteger && timelineKeyUnpainted(key.start, key.frames,
      key.available, rect, range, min, ratio, key.empty, key.decoration);
    const nodes = records.map(([start, frames, tone, selected, data, title, left, width], index) => {
      const className = 'tl-block tl-block--' + tone + (selected ? ' is-selected' : '');
      if (!templates.has(className)) {
        const template = root.ownerDocument.createElement('span');
        template.className = className;
        templates.set(className, template);
      }
      const node = templates.get(className).cloneNode(false);
      const css = `left:${left}%;width:${width}`;
      if (keys[index].hidden && !selected) rememberTimelineKeyStyle(node, css);
      else node.setAttribute('style', css);
      node.toggleAttribute('data-tl-unpainted', keys[index].hidden);
      for (const [key, value] of Object.entries(data || {})) node.setAttribute('data-' + key, String(value));
      node.setAttribute('data-tl-frame', Math.round(Number(start) || 0));
      if (!Number.isInteger(Number(start))) node.setAttribute('data-tl-position', Number(start) || 0);
      if (Number(frames) !== 1) node.setAttribute('data-tl-duration', Math.max(Number(frames) || 0, 0));
      if (title) {node.title = title; node.setAttribute('aria-label', title);}
      keys[index].node = node;
      return node;
    });
    return {source, lane, nodes, layout, rect};
  });
  jobs.forEach(({source, lane, nodes, layout, rect}) => {
    const marker = mountedRoots.has(root) ? null : root.ownerDocument.createComment('');
    if (marker) lane.replaceWith(marker);
    try {
      source.replaceWith(...nodes);
    } finally {
      marker?.replaceWith(lane);
    }
    Object.assign(layout, {first: lane.firstElementChild, last: lane.lastElementChild, count: lane.childElementCount});
    rememberTimelineKeys(lane, rect, range, ratio);
  });
  mountedRoots.add(root);
}

// @editor-module 树形时间轴按视窗更新轨道与键的可见性。
const bound = new WeakMap();
const geometry = new WeakMap();
const forwarded = new WeakSet();

function syncKeyVisibility(lanes, rects, root) {
  const span = Number(root.dataset.tlEnd) - Number(root.dataset.tlStart);
  if (!(span > 0)) return;
  const ratio = root.ownerDocument.defaultView.devicePixelRatio || 1;
  const range = {start: Number(root.dataset.tlStart), end: Number(root.dataset.tlEnd)};
  lanes.forEach((lane, laneIndex) => {
    if (!lane.hasAttribute('data-tl-key-min-width')) return;
    const rect = rects[laneIndex], min = Number(lane.dataset.tlKeyMinWidth);
    geometry.delete(lane);
    if (timelineKeysPrepared(lane, rect, range, ratio)) return;
    const {keys, allInteger} = timelineKeyLayout(lane);
    keys.forEach(({node, start, frames, available, empty, decoration}) => {
      const hidden = allInteger && timelineKeyUnpainted(start, frames,
        available, rect, range, min, ratio, empty, decoration);
      if (!hidden) restoreTimelineKeyStyle(node);
      if (node.hasAttribute('data-tl-unpainted') !== hidden) node.toggleAttribute('data-tl-unpainted', hidden);
      if (hidden) deferTimelineKeyStyle(node);
    });
    rememberTimelineKeys(lane, rect, range, ratio);
  });
}

function keyAt(lane, event) {
  let cached = geometry.get(lane);
  if (!cached) {
    if (!lane.querySelector('[data-tl-unpainted]')) return null;
    cached = {nodes: [...lane.querySelectorAll('[data-tl-frame]')], boxes: null};
    geometry.set(lane, cached);
  }
  if (!cached.boxes) {
    const hidden = cached.nodes.filter(node => node.hasAttribute('data-tl-unpainted'));
    hidden.forEach(node => {restoreTimelineKeyStyle(node); node.removeAttribute('data-tl-unpainted');});
    const laneRect = lane.getBoundingClientRect();
    cached.boxes = cached.nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return {left: rect.left - laneRect.left, top: rect.top - laneRect.top, width: rect.width, height: rect.height};
    });
    hidden.forEach(node => {node.setAttribute('data-tl-unpainted', ''); deferTimelineKeyStyle(node);});
  }
  const rect = lane.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
  for (let index = cached.boxes.length - 1; index >= 0; index -= 1) {
    const box = cached.boxes[index];
    if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height)
      return cached.nodes[index];
  }
  return null;
}

function syncTimelineVisibility(root, keys = true) {
  const scroll = root?.querySelector('.tl-tree-scroll');
  if (!scroll || !root.isConnected) return;
  const watch = bound.get(scroll);
  if (watch && !watch.active) {
    watch.active = true; watch.observer.observe(scroll);
    watch.keys.observe(root, {subtree: true, attributes: true, attributeFilter: ['class']});
  }
  const box = scroll.getBoundingClientRect();
  const lanes = [...scroll.querySelectorAll('[data-tl-lane]')];
  const rects = lanes.map(lane => lane.getBoundingClientRect());
  if (keys) syncKeyVisibility(lanes, rects, root);
  lanes.forEach((lane, index) => {
    const rect = rects[index];
    const visibility = !lane.hidden && rect.bottom > box.top && rect.top < box.bottom ? 'visible' : 'hidden';
    lane.style.contentVisibility = visibility;
    const label = lane.previousElementSibling;
    if (root.classList.contains('tl--fixed-rows') && label?.classList.contains('tl-label'))
      label.style.contentVisibility = visibility;
  });
}

function bindTimelineVisibility(root) {
  const scroll = root.querySelector('.tl-tree-scroll');
  if (!scroll || bound.has(scroll)) return;
  const relay = event => {
    if (forwarded.has(event)) return;
    const lane = event.target.closest?.('[data-tl-lane]');
    if (!lane || !root.contains(lane)) return;
    if (event.target.closest?.('[data-tl-frame]') || event.button === 1
        || lane.hasPointerCapture?.(event.pointerId) || root.classList.contains('is-panning')) return;
    const key = keyAt(lane, event);
    if (!key || key === event.target.closest?.('[data-tl-frame]')) return;
    const copy = new event.constructor(event.type, event);
    forwarded.add(copy);
    event.stopImmediatePropagation();
    key.dispatchEvent(copy);
    if (copy.defaultPrevented) event.preventDefault();
  };
  for (const type of ['pointerdown', 'pointerover', 'pointermove', 'click', 'dblclick']) root.addEventListener(type, relay, true);
  scroll.addEventListener('scroll', () => syncTimelineVisibility(root, false), {passive: true});
  const watch = {active: true, observer: new ResizeObserver(() => {
    if (!root.isConnected) {watch.observer.disconnect(); watch.keys.disconnect(); watch.active = false; return;}
    syncTimelineVisibility(root);
  }), keys: new MutationObserver(changes => {
    for (const {target} of changes) {
      if (!target.hasAttribute('data-tl-frame') || !target.hasAttribute('data-tl-unpainted')) continue;
      if (target.classList.contains('is-selected') || target.classList.contains('is-current')) restoreTimelineKeyStyle(target);
      else deferTimelineKeyStyle(target);
    }
  })};
  bound.set(scroll, watch);
  watch.observer.observe(scroll);
  watch.keys.observe(root, {subtree: true, attributes: true, attributeFilter: ['class']});
}

// @editor-module 时间轴可选视窗、缩放与平移。
function timelineViewport(total, stored = {}) {
  const margin = Math.max(60, total / 2);
  const min = -margin, max = total + margin;
  const zoom = Math.min(32, Math.max(0.5, Number(stored?.zoom) || 1));
  const span = (max - min) / zoom;
  const center = Number.isFinite(stored?.center) ? stored.center : total / 2;
  return {totalFrames: total, min, max, zoom, start: center - span / 2, end: center + span / 2};
}

function timelinePercent(frame, range) {
  return typeof range === 'number' ? (range > 0 ? frame / range * 100 : 0)
    : (frame - range.start) / (range.end - range.start) * 100;
}

function timelineRuler(range) {
  const span = range.end - range.start;
  const power = 10 ** Math.floor(Math.log10(span / 10));
  const step = Math.max(1, [1, 2, 5, 10].find(value => value * power >= span / 10) * power);
  const ticks = [];
  for (let frame = Math.ceil(range.start / step) * step; frame <= range.end; frame += step)
    ticks.push(`<span class="tl-tick" style="left:${timelinePercent(frame, range)}%">${Number(frame.toFixed(3))}</span>`);
  return ticks.join('');
}

function timelineViewportControls() {
  return `<label class="tl-zoom" title="滚轮以指针为中心缩放">缩放 <input type="range" min="-1" max="5" step="0.05" value="0" data-tl-zoom aria-label="时间轴缩放"></label>
    <button type="button" class="button ghost" data-tl-fit>适应</button>`;
}

function timelineFrameAt(root, node, event, total) {
  const rect = node.getBoundingClientRect();
  if (!rect.width) return null;
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const start = Number(root.dataset.tlStart || 0);
  const end = root.hasAttribute('data-tl-end') ? Number(root.dataset.tlEnd) : total;
  return Math.round(start + ratio * (end - start));
}

function timelineKeyWidths(blocks, span, minWidth) {
  return blocks.map((block, index) => ({start: block.start, frames: block.frames, index})).sort((a, b) => a.start - b.start)
    .map((block, index, sorted) => {
      const available = (sorted[index + 1]?.start ?? Infinity) - block.start;
      const duration = (block.frames || 1) / span * 100;
      const minimum = `max(${minWidth}px, ${duration}%)`;
      const width = available <= (block.frames || 1) ? `${available / span * 100}%`
        : Number.isFinite(available) ? `min(${minimum}, ${available / span * 100}%)` : minimum;
      return {index: block.index, width};
    });
}

function syncTimelineKeyLayout(root, range) {
  for (const lane of root.querySelectorAll('[data-tl-key-min-width]')) {
    const nodes = [...lane.querySelectorAll('[data-tl-frame]')];
    const layout = timelineKeyWidths(nodes.map(node => ({start: Number(node.dataset.tlFrame),
      frames: Number(node.dataset.tlDuration) || 1})), range.end - range.start, Number(lane.dataset.tlKeyMinWidth));
    for (const {index, width} of layout) {
      const node = nodes[index];
      setTimelineKeyStyle(node, 'width', width);
    }
    lane.style.height = '22px';
  }
}

function syncTimelineViewport(root, total, stored, onChange, positionsReady = false) {
  if (!root?.hasAttribute('data-tl-viewport')) return;
  prepareTimelineKeys(root);
  const range = timelineViewport(total, stored);
  root.dataset.tlStart = range.start;
  root.dataset.tlEnd = range.end;
  root.dataset.tlScale = range.zoom;
  const ruler = root.querySelector('[data-tl-ruler]');
  ruler.title = '点按定位；滚轮缩放，空白处左键或任意处中键拖动平移；方向键 ±1 帧，Shift ±10，Home／End 到两端';
  let ticks = ruler.querySelector('[data-tl-ticks]');
  if (!ticks) { ticks = document.createElement('span'); ticks.dataset.tlTicks = ''; ruler.append(ticks); }
  ticks.innerHTML = timelineRuler(range);
  for (const node of positionsReady ? [] : root.querySelectorAll('[data-tl-position], [data-tl-frame]')) {
    setTimelineKeyStyle(node, 'left', `${timelinePercent(Number(node.dataset.tlPosition ?? node.dataset.tlFrame), range)}%`);
    if (node.hasAttribute('data-tl-duration'))
      setTimelineKeyStyle(node, 'width', `${Number(node.dataset.tlDuration) / (range.end - range.start) * 100}%`);
  }
  for (const node of root.querySelectorAll('[data-tl-curve-points]')) {
    node.querySelector('polyline').setAttribute('points', JSON.parse(node.dataset.tlCurvePoints)
      .map(([frame, y]) => `${timelinePercent(frame, range)},${y}`).join(' '));
  }
  if (!positionsReady) syncTimelineKeyLayout(root, range);
  const zero = timelinePercent(0, range), end = timelinePercent(total, range);
  root.style.setProperty('--tl-used-start', `${zero}%`);
  root.style.setProperty('--tl-used-end', `${end}%`);
  const frame = Number(ruler.getAttribute('aria-valuenow'));
  root.querySelector('.tl-playhead')?.style.setProperty('--tl-playhead', String(timelinePercent(frame, range) / 100));
  const zoom = root.querySelector('[data-tl-zoom]');
  if (zoom) zoom.value = Math.log2(range.zoom);
  const pan = root.querySelector('[data-tl-pan]');
  if (pan) {
    pan.min = range.min - (range.end - range.start) / 2;
    pan.max = range.max + (range.end - range.start) / 2;
    pan.value = (range.start + range.end) / 2;
  }
  root.querySelector('[data-tl-range]').textContent = `${Math.floor(range.start)} … ${Math.ceil(range.end)} 帧`;
  if (!positionsReady) syncTimelineVisibility(root);
  onChange?.({zoom: range.zoom, center: (range.start + range.end) / 2});
}

function bindTimelineViewport(root, {totalFrames, onViewport, skip}) {
  if (!root.hasAttribute('data-tl-viewport')) return;
  const current = () => ({zoom: Number(root.dataset.tlScale),
    center: (Number(root.dataset.tlStart) + Number(root.dataset.tlEnd)) / 2});
  const apply = value => syncTimelineViewport(root, totalFrames(), value, onViewport);
  root.querySelector('[data-tl-fit]')?.addEventListener('click', () => apply({zoom: 1}));
  root.querySelector('[data-tl-zoom]')?.addEventListener('input', event =>
    apply({...current(), zoom: 2 ** Number(event.target.value)}));
  root.querySelector('[data-tl-pan]')?.addEventListener('input', event =>
    apply({...current(), center: Number(event.target.value)}));
  root.addEventListener('wheel', event => {
    const node = event.target.closest?.('[data-tl-lane], [data-tl-ruler]');
    if (!node || !root.contains(node) || !event.deltaY) return;
    event.preventDefault();
    const old = current();
    const rect = node.getBoundingClientRect();
    if (!rect.width) return;
    const span = Number(root.dataset.tlEnd) - Number(root.dataset.tlStart);
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
    const zoom = timelineViewport(totalFrames(), {zoom: old.zoom * Math.exp(-delta * 0.002)}).zoom;
    apply({zoom, center: old.center + (ratio - 0.5) * (span - span * old.zoom / zoom)});
  }, {passive: false});
  let drag = null, suppressClick = false;
  root.addEventListener('pointerdown', event => {
    const lane = event.target.closest?.('[data-tl-lane], [data-tl-ruler]');
    const node = lane || (event.button === 1 ? root.querySelector('[data-tl-ruler]') : null);
    if (!node || !root.contains(node) || ![0, 1].includes(event.button) || drag) return;
    if (event.button === 0 && node.hasAttribute('data-tl-ruler')) return;
    if (event.button === 0 && (event.target.closest?.('[data-tl-frame], input, select, button, a, [contenteditable], animated-resource-picker') || skip?.(event))) return;
    const width = node.getBoundingClientRect().width;
    if (!width) return;
    const scroll = root.querySelector('.tl-tree-scroll');
    suppressClick = false;
    drag = {id: event.pointerId, button: event.button, node, x: event.clientX, y: event.clientY, dx: 0,
      scroll, scrollTop: scroll?.scrollTop || 0,
      ...current(), span: Number(root.dataset.tlEnd) - Number(root.dataset.tlStart), width, moved: false};
    node.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }, {capture: true});
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    const previous = drag;
    drag = null;
    root.classList.remove('is-panning');
    if (previous.node.hasPointerCapture?.(event.pointerId)) previous.node.releasePointerCapture(event.pointerId);
    if (previous.moved) setTimeout(() => { suppressClick = false; }, 0);
  };
  root.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    event.stopPropagation();
    if (!(event.buttons & (drag.button === 0 ? 1 : 4))) { release(event); return; }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!dx && !dy && !drag.moved) return;
    drag.moved = true;
    suppressClick = true;
    root.classList.add('is-panning');
    if (drag.scroll) drag.scroll.scrollTop = drag.scrollTop - dy;
    if (dx !== drag.dx) {
      apply({zoom: drag.zoom, center: drag.center - dx * drag.span / drag.width});
      drag.dx = dx;
    }
    event.preventDefault();
  }, {capture: true});
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, release);
  root.addEventListener('click', event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, {capture: true});
  root.addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });
  syncTimelineViewport(root, totalFrames(), current(), onViewport, true);
}

function timelineViewportPan() {
  return `<div class="tl-pan"><label title="空白处左键或任意处中键拖动平移">平移 <input data-tl-pan type="range" step="any" aria-label="时间轴横向位置"></label><samp data-tl-range></samp></div>`;
}

// @editor-module 通用动画走带：一个壳，若干可插拔的轨道
//
// ROM 里的动画不止一处，性质还不同：开机演出是直线代码解出来的步骤表，剧情是
// opcode VM 逐帧模拟出来的快照，武器特效是第三套脚本。它们唯一的共同点是
// 「按帧推进，每帧有一个可渲染的状态」——所以共用的应该正好是这一点，不能多。
//
// 分工：
//   壳（本模块）   走带、总体时间刻度轴、播放头、坐标映射、指针与键盘定位
//   轨道（调用方） 每条轨道画什么，由调用方按下面的描述给数据
//   渲染器（调用方）把第 N 帧的状态画成一屏
//
// 壳不认识调色板、角色、战斗对象，也不认识 ROM。它只知道「总共多少帧」和
// 「每条轨道上有哪些块落在哪一帧」。所有「帧 → 百分比」的换算只在这里发生：
// 两处各算一遍，缩放窗口时刻度和播放头就会对不齐。
//
// 轨道描述（调用方给的纯数据，不含 DOM）：
//
//   {id, label, note, control, kind, blocks|curve|body}
//     kind "span"   有起止的区间：等待、显示开关
//     kind "key"    某一帧发生的一次写入：渐显步、音频命令
//     kind "curve"  按帧变化的数值：滚动量、坐标
//     kind "flat"   整段恒定的值
//     kind "custom" 调用方自己给 body HTML，仍然用壳的坐标映射
//   control 是标签区的 HTML（输入框之类），由调用方决定可编辑性——壳不假设
//   轨道可编辑，那是各域自己的事。
//
// 详见 docs/metalmaxcn_animation_timeline.md。


const LABEL_WIDTH = 148;
const treeBoundRoots = new WeakSet();

/** NTSC 一帧的长度。刻度轴按秒标注时用它换算。 */
const NTSC_FPS = 60.0988;

function framesToSeconds(frames, fps = NTSC_FPS) {
  return frames / fps;
}

function secondsToFrames(seconds, fps = NTSC_FPS) {
  return seconds * fps;
}

// 总体刻度轴的步长候选（帧）。
//
// 刻度按**帧**而不是按秒：帧是 ROM 自己的单位——等待数的是 `LDX #$5A` 那 90
// 帧，滚动是每 2 帧挪 1 像素——而秒要先假定制式（NTSC / PAL 一帧多长不同），
// 假定一变刻度就不准。秒只作为读数里的折算值出现，并注明按哪个帧率算的。
//
// 刻度与段边界是两回事：段边界回答「什么时候发生了什么」，刻度轴给的是均匀
// 比例尺。只画段边界的话，90 帧和 96 帧看起来一样长也没人察觉。
const TICK_FRAMES = [
  5, 10, 15, 20, 30, 50, 60, 100, 120, 150, 200, 300, 500, 600, 1000, 1200,
  2000, 3000, 5000, 6000, 10000,
];

function rulerScale(totalFrames) {
  const step = TICK_FRAMES.find(value => totalFrames / value <= 12)
    ?? TICK_FRAMES.at(-1);
  const ticks = [];
  for (let frame = 0; frame <= totalFrames; frame += step) ticks.push({frame});
  return {step, ticks};
}

const percent = timelinePercent;

/**
 * 帧号 → 定宽读数。位数补齐后配等宽字体，宽度不随内容浮动，同一行的东西不抖。
 *
 * 帧是主读数，秒只是折算：写成 `≈` 并在标题里注明按哪个帧率算的，换制式时不会
 * 有人把它当成确定值。
 */
function frameReadout(frame, totalFrames, fps = NTSC_FPS) {
  const total = String(totalFrames);
  const seconds = framesToSeconds(frame, fps).toFixed(2);
  const totalSeconds = framesToSeconds(totalFrames, fps).toFixed(2);
  return `${String(frame).padStart(total.length, " ")} / ${total} 帧　`
    + `≈${seconds.padStart(totalSeconds.length, " ")} / ${totalSeconds} s`;
}

function blockMarkup(block, total, kind, tree = false, keyWidth = null) {
  const left = tree && !block.frames && typeof total === 'number'
    ? `clamp(6px, ${percent(Number(block.start) || 0, total)}%, calc(100% - 6px))`
    : `${percent(Number(block.start) || 0, total)}%`;
  const width = keyWidth !== null ? `;width:${keyWidth}` : kind === "key" && !block.frames
    ? "" : `;width:${percent(Math.max(Number(block.frames) || 0, 0), typeof total === 'number' ? total : total.end - total.start)}%`;
  const colours = (block.colours || []).map(colour =>
    `<i style="background:${colour}"></i>`).join("");
  const data = Object.entries(block.data || {}).map(([key, value]) =>
    `data-${esc(key)}="${esc(String(value))}"`).join(" ");
  const title = block.title ? esc(block.title) : '';
  return `<span class="tl-block tl-block--${esc(block.tone || kind)}${tree && !block.frames ? " tl-block--diamond" : ""}${
    block.selected ? " is-selected" : ""
  }" style="left:${left}${width}${keyWidth !== null ? '' : tree && (!block.frames || block.stackIndex != null) ? `;top:${6 + (block.stackIndex || 0) * 12}px` : ""}" ${data}
    data-tl-frame="${Math.round(Number(block.start) || 0)}"
    ${typeof total === 'number' ? '' : `data-tl-position="${Number(block.start) || 0}"${width ? ` data-tl-duration="${Math.max(Number(block.frames) || 0, 0)}"` : ''}`}
    ${title ? `title="${title}" aria-label="${title}"` : ""}
    >${colours}${block.labelMarkup ?? (block.label === undefined ? "" : esc(String(block.label)))}</span>`;
}

// 一条数值曲线。SVG 铺满轨道，横轴是帧、纵轴是这条量的真实值域——拿真实值域
// 画，端点改了线的高低立刻跟着变，不会画出一条永远好看的假线。
function curveMarkup(curve, total) {
  const min = Number(curve.min ?? 0);
  const max = Number(curve.max ?? 255);
  const span = max - min || 1;
  const points = (curve.points || []).map(([frame, value]) =>
    `${percent(frame, total).toFixed(2)},${
      (100 - ((value - min) / span) * 100).toFixed(2)}`
  ).join(" ");
  const markers = (curve.markers || []).map(marker =>
    `<span class="tl-value" style="left:${percent(marker.frame, total)}%" ${typeof total === 'number' ? '' : `data-tl-position="${marker.frame}"`}
      >${esc(String(marker.label))}</span>`).join("");
  return `<svg class="tl-curve" viewBox="0 0 100 100" preserveAspectRatio="none" ${typeof total === 'number' ? '' : `data-tl-curve-points="${esc(JSON.stringify((curve.points || []).map(([frame, value]) => [frame, 100 - ((value - min) / span) * 100])))}"`}
    aria-hidden="true"><polyline points="${points}" /></svg>${markers}`;
}

function laneBody(lane, total, tree = false, keyRecords = null) {
  if (lane.kind === "custom") return lane.body || "";
  if (lane.kind === "curve") return curveMarkup(lane.curve || {}, total);
  if (lane.kind === "flat") return typeof total === 'number' ? `<span class="tl-flat"></span>`
    : `<span class="tl-flat" data-tl-position="0" data-tl-duration="${total.totalFrames}" style="left:${percent(0, total)}%;width:${percent(total.totalFrames, total.end - total.start)}%"></span>`;
  if (!lane.blocks?.length) return '';
  const stacks = new Map();
  const keyWidths = lane.keyMinWidth && typeof total !== 'number' ? new Map(timelineKeyWidths(
    lane.blocks || [], total.end - total.start, lane.keyMinWidth).map(({index, width}) => [index, width])) : null;
  if (tree && keyWidths && (lane.blocks || []).every(block => !block.colours?.length
      && (block.labelMarkup === '' || block.labelMarkup == null && (block.label === undefined || block.label === '')))) {
    return timelineKeyRecords((lane.blocks || []).map((block, index) => [block.start, block.frames || 1,
      block.tone || lane.kind, Boolean(block.selected), block.data, block.title,
      percent(Number(block.start) || 0, total), keyWidths.get(index)]), keyRecords);
  }
  return (lane.blocks || []).map((block, index) => {
    const stackIndex = block.stackIndex ?? stacks.get(block.start) ?? 0;
    if (!block.frames) stacks.set(block.start, stackIndex + 1);
    return blockMarkup(!block.frames || block.stackIndex != null ? {...block, stackIndex} : block, total, lane.kind, tree, keyWidths?.get(index) ?? null);
  }).join("");
}

/**
 * 画一个走带。`id` 把同一页上的多个走带分开——剧情页可能同时有好几条。
 *
 * `markers` 是刻度轴上那一层：段边界、循环点、结束点这些「事件位置」。它和均匀
 * 刻度画在同一条上但用不同记号，因为两者回答的是不同的问题。
 */
function timelinePlayer({
  id, totalFrames, frame, playing = false, live = false, fps = NTSC_FPS,
  lanes = [], markers = [], transport = "", status = "", footer = "",
  labelWidth = LABEL_WIDTH,
  title = "", step = false, viewport = null, toolbar = "", keyRecords = null,
}) {
  const range = viewport ? timelineViewport(totalFrames, viewport) : totalFrames;
  const scale = rulerScale(totalFrames);
  const ticks = scale.ticks.map(tick => `<span class="tl-tick"
    style="left:${percent(tick.frame, totalFrames)}%">${tick.frame}</span>`).join("");
  const marks = markers.map(marker => `<b class="tl-marker tl-marker--${
    esc(marker.tone || "event")}" style="left:${percent(marker.frame, range)}%" ${viewport ? `data-tl-position="${marker.frame}"` : ''}
    title="${esc(marker.title || marker.label || "")}"></b>`).join("");
  const tree = lanes.some(lane => lane.parentId);
  const scrollTracks = tree || Boolean(viewport);
  const fixedRows = tree && viewport && lanes.every(lane => lane.keyMinWidth
    && (!lane.control || /^<small>\d+<\/small>$/u.test(lane.control)));
  const rows = timelineTreeRows(lanes).map(lane => {
    const data = Object.entries(lane.data || {}).map(([key, value]) =>
      `data-${esc(key)}="${esc(String(value))}"`).join(" ");
    const hierarchy = tree ? ` data-tl-row="${esc(lane.id)}"${lane.parentId ? ` data-tl-parent="${esc(lane.parentId)}"` : ""}${lane.hidden ? " hidden" : ""}` : "";
    const toggle = lane.hasChildren ? `<button type="button" class="tl-tree-toggle"
      data-tl-expand="${esc(lane.id)}" aria-expanded="${lane.expanded !== false}"
      aria-label="${esc(lane.label)}">${lane.expanded === false ? "▸" : "▾"}</button>` : "";
    const body = lane.hasChildren ? {...lane, blocks: lane.summaryBlocks || timelineSummaryBlocks(lanes, lane.id), kind: "key"} : lane;
    if (lane.keyMinWidth) body.blocks = (body.blocks || []).map(block => block.frames ? block : {...block, frames: 1});
    const stacks = new Map();
    for (const block of body.blocks || []) {
      if (!block.frames) stacks.set(block.start, (stacks.get(block.start) || 0) + 1);
    }
    const rowHeight = lane.keyMinWidth && viewport ? 22 : Math.max(22, ...[...stacks.values()].map(count => count * 12 + 10), ...(body.blocks || []).map(block => (block.stackIndex || 0) * 12 + 22));
    const height = tree ? ` style="height:${rowHeight}px;content-visibility:hidden"` : "";
    return `<div class="tl-label" ${data}${hierarchy}${tree ? ` style="--tl-depth:${lane.depth}${fixedRows ? ';content-visibility:hidden' : ''}"` : ""}${
      lane.note ? ` title="${esc(lane.note)}"` : ""
    }>${toggle}${tree ? `<span class="tl-tree-icon" aria-hidden="true">${esc(lane.icon || (lane.hasChildren ? "▣" : "◇"))}</span>` : ""}<b>${lane.labelMarkup ?? esc(lane.label)}</b>${lane.control || ""}</div>
    <div class="tl-lane" data-tl-lane="${esc(lane.id)}" ${lane.keyMinWidth ? `data-tl-key-min-width="${lane.keyMinWidth}"` : ""} ${data}${hierarchy}${height}
      >${laneBody(body, range, tree, keyRecords)}</div>`;
  }).join("");
  return `<div class="tl${live ? " is-live" : ""}${tree ? " tl--tree" : ""}${fixedRows ? ' tl--fixed-rows' : ''}" data-tl="${esc(id)}"
    ${viewport ? `data-tl-viewport data-tl-start="${range.start}" data-tl-end="${range.end}" data-tl-scale="${range.zoom}"` : ''}
    style="--tl-label:${labelWidth}px${viewport ? `;--tl-used-start:${percent(0, range)}%;--tl-used-end:${percent(totalFrames, range)}%` : ''}">
    <div class="tl-transport">
      <button type="button" class="button ${title ? "primary" : "ghost"}" data-tl-play
        title="按帧率播放；再按暂停">${playing ? "暂停" : "播放"}</button>
      ${step ? `<button type="button" class="button ghost" data-tl-step
        title="暂停并前进一帧">单步</button>` : ""}
      ${transport}
      <b class="mono tl-readout"
        title="帧是 ROM 自己的单位；秒按 ${fps.toFixed(4)} Hz 折算，制式不同秒数不同"
        ><i aria-hidden="true" data-tl-readout-size>${esc(frameReadout(totalFrames, totalFrames, fps))}</i><samp data-tl-readout>${esc(frameReadout(frame, totalFrames, fps))}</samp></b>
      <span class="tl-status" data-tl-status>${handleTextMarkup(status)}</span>
    </div>
    ${title ? `<h3 class="tl-title">${esc(title)}</h3>` : ""}
    ${toolbar}
    ${scrollTracks ? '<div class="tl-tree-scroll">' : ""}<div class="tl-grid">
      <i class="tl-playhead" style="--tl-playhead:${percent(frame, range) / 100}"></i>
      <div class="tl-corner">帧</div>
      <div class="tl-ruler" data-tl-ruler tabindex="0" role="slider"
        aria-label="播放进度" aria-valuemin="0" aria-valuemax="${totalFrames}"
        aria-valuenow="${frame}"
        title="刻度每 ${scale.step} 帧一格；点或拖到任意位置，方向键 ±1 帧，Shift ±10，Home/End 到两端"
        >${viewport ? `<span data-tl-ticks>${timelineRuler(range)}</span>` : ticks}${marks}</div>
      ${rows}
    </div>${scrollTracks ? "</div>" : ""}
    ${viewport ? timelineViewportPan() : ''}${footer}
  </div>`;
}

/**
 * 播放头只由刻度行定位，轨道保留选中、缩放与平移。
 *
 * 不整页重绘——重绘会把正在拖的元素换掉，指针捕获跟着丢，一拖就断。调用方在
 * `onSeek` 里只更新画面与读数（用 syncTimelinePlayer）。
 */
function bindTimelinePlayer(root, {
  totalFrames, onSeek, onToggle, currentFrame, skip, onExpand, onViewport, coordinateRoot = root, keyRecords = null,
}) {
  if (!root) return;
  prepareTimelineKeys(root, keyRecords);
  bindTimelineVisibility(root);
  if (root.matches('[data-tl]')) bindTimelineTooltip(root);
  if (root.querySelector("[data-tl-expand]") && !treeBoundRoots.has(root)) {
    treeBoundRoots.add(root);
    root.addEventListener("click", event => {
      const toggle = event.target.closest?.("[data-tl-expand]");
      if (!toggle || !root.contains(toggle)) return;
      event.stopPropagation();
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      const expansions = new Map([...root.querySelectorAll("[data-tl-expand]")]
        .map(node => [node.dataset.tlExpand, node === toggle ? expanded : node.getAttribute("aria-expanded") === "true"]));
      syncTimelineTree(root, expansions);
      onExpand?.(toggle.dataset.tlExpand, expanded);
    });
  }
  const frameAt = (node, event) => {
    return timelineFrameAt(coordinateRoot, node, event, totalFrames());
  };
  const scrub = node => {
    node.addEventListener("pointerdown", event => {
      if (event.button) return;
      if (skip?.(event)) return;
      const frame = frameAt(node, event);
      if (frame === null) return;
      node.setPointerCapture?.(event.pointerId);
      onSeek(frame);
      event.preventDefault();
    });
    node.addEventListener("pointermove", event => {
      if (!node.hasPointerCapture?.(event.pointerId)) return;
      const frame = frameAt(node, event);
      if (frame !== null) onSeek(frame);
    });
  };
  const ruler = root.querySelector("[data-tl-ruler]");
  bindTimelineViewport(root, {totalFrames, onViewport, skip});
  syncTimelineVisibility(root);
  if (ruler) scrub(ruler);
  root.querySelector("[data-tl-play]")?.addEventListener("click", () => onToggle?.());
  root.querySelector("[data-tl-step]")?.addEventListener("click", () =>
    onSeek(Math.min(totalFrames(), currentFrame() + 1)));

  const STEPS = {ArrowLeft: -1, ArrowRight: 1, ArrowDown: -1, ArrowUp: 1};
  ruler?.addEventListener("keydown", event => {
    if (event.key === "Home" || event.key === "End") {
      onSeek(event.key === "Home" ? 0 : totalFrames());
    } else if (STEPS[event.key]) {
      onSeek(currentFrame() + STEPS[event.key] * (event.shiftKey ? 10 : 1));
    } else if (event.key === " " || event.key === "Enter") {
      onToggle?.();
    } else {
      return;
    }
    event.preventDefault();
  });
}

function bindTimelineTooltip(root) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tl-tooltip';
  tooltip.setAttribute('popover', 'manual');
  tooltip.setAttribute('role', 'tooltip');
  root.append(tooltip);
  let hovered = null, title = '';
  const hide = () => {
    if (hovered) hovered.title = title;
    hovered = null;
    tooltip.hidePopover();
  };
  const show = event => {
    const block = event.target.closest?.('.tl-block[title]');
    if (!block || event.buttons || hovered === block) return;
    hide();
    hovered = block;
    title = block.title;
    tooltip.textContent = title;
    block.removeAttribute('title');
    tooltip.showPopover();
    const rect = tooltip.getBoundingClientRect();
    const viewport = tooltip.ownerDocument.documentElement;
    tooltip.style.left = `${Math.max(8, Math.min(event.clientX + 12, viewport.clientWidth - rect.width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(event.clientY + 16, viewport.clientHeight - rect.height - 8))}px`;
  };
  root.addEventListener('pointerover', show);
  root.addEventListener('pointermove', show);
  root.addEventListener('pointerout', event => {
    if (hovered && !hovered.contains(event.relatedTarget)) hide();
  });
  root.addEventListener('pointerdown', hide, true);
  root.addEventListener('wheel', hide, {passive: true});
  root.addEventListener('scroll', hide, true);
}

function syncTimelineTree(root, expansions) {
  const parents = new Map([...root.querySelectorAll("[data-tl-lane]")]
    .map(node => [node.dataset.tlLane, node.dataset.tlParent]));
  root.querySelectorAll("[data-tl-expand]").forEach(toggle => {
    const expanded = expansions.get(toggle.dataset.tlExpand) !== false;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "▾" : "▸";
  });
  root.querySelectorAll("[data-tl-row]").forEach(node => {
    let parent = node.dataset.tlParent;
    let hidden = false;
    while (parent) {
      hidden ||= expansions.get(parent) === false;
      parent = parents.get(parent);
    }
    node.hidden = hidden;
  });
  syncTimelineVisibility(root);
  if (root.hasAttribute('data-tl-viewport')) syncTimelineViewport(root,
    Number(root.querySelector('[data-tl-ruler]').getAttribute('aria-valuemax')),
    {zoom: Number(root.dataset.tlScale), center: (Number(root.dataset.tlStart) + Number(root.dataset.tlEnd)) / 2});
}

/** 帧推进时只改这几处：播放头、读数、状态、当前块高亮。不重绘 DOM。 */
function syncTimelinePlayer(root, {
  frame, totalFrames, playing = false, live = false, status = "",
  currentBlockFrame = null, fps = NTSC_FPS,
}) {
  if (!root) return;
  if (treeBoundRoots.has(root)) prepareTimelineKeys(root);
  const range = root.hasAttribute('data-tl-viewport')
    ? {start: Number(root.dataset.tlStart), end: Number(root.dataset.tlEnd)} : totalFrames;
  root.querySelector(".tl-playhead")?.style.setProperty("--tl-playhead", String(percent(frame, range) / 100));
  root.classList.toggle("is-live", live);
  root.querySelector("[data-tl-ruler]")?.setAttribute("aria-valuenow", String(frame));
  const readout = root.querySelector("[data-tl-readout]");
  if (readout) {
    const text = frameReadout(frame, totalFrames, fps);
    if (readout.childNodes.length === 1 && readout.firstChild.nodeType === globalThis.Node.TEXT_NODE) readout.firstChild.nodeValue = text;
    else readout.textContent = text;
  }
  const sizing = root.querySelector("[data-tl-readout-size]");
  const sizingText = frameReadout(totalFrames, totalFrames, fps);
  if (sizing && sizing.textContent !== sizingText) sizing.textContent = sizingText;
  const label = root.querySelector("[data-tl-status]");
  if (label) {
    const markup = handleTextMarkup(status);
    if (label.innerHTML !== markup) label.innerHTML = markup;
  }
  const play = root.querySelector("[data-tl-play]");
  const playLabel = playing ? "暂停" : "播放";
  if (play && play.textContent !== playLabel) play.textContent = playLabel;
  root.querySelectorAll("[data-tl-frame].is-current").forEach(node => {
    if (Number(node.dataset.tlFrame) !== currentBlockFrame) node.classList.remove("is-current");
  });
  if (currentBlockFrame !== null && Number.isFinite(currentBlockFrame)) {
    root.querySelectorAll(`[data-tl-frame="${currentBlockFrame}"]`).forEach(node => node.classList.add("is-current"));
  }
}

export { bindScenePreview, bindTimelinePlayer, encounterZoneColor, framesToSeconds, loadScenePreviewSourceById, paintScenePreview, paintScenePreviewById, paintScenePreviewCell, paintScenePreviewTiles, paintTileGridCells, paintTileGridLines, positionSceneAnnotations, prepareTimelineKeys, registerTimelineKeyRecords, renderTileGridCanvas, sceneAnnotationsMarkup, scenePreviewCanvasMarkup, scenePreviewController, scenePreviewControls, scenePreviewMarkup, secondsToFrames, setScenePreviewPoint, syncScenePreviewObjects, syncScenePreviewRegions, syncTimelinePlayer, syncTimelineTree, syncTimelineViewport, timelineFrameAt, timelinePlayer, timelineSelectedBlocks, timelineSummaryBlocks, timelineViewportControls };
