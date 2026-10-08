// @editor-module 画布视口的缩放、平移与坐标换算。
import {esc} from "../core/dom.js";

const scales = [0.125, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 16, 24, 32, 48, 64];
const presets = scales.filter(scale => scale <= 16);
const controllers = new WeakMap();
const pendingLayouts = new Map();
let layoutFrame = null;

export function flushCanvasViewportLayouts() {
  if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
  layoutFrame = null;
  const jobs = [...pendingLayouts.values()];
  pendingLayouts.clear();
  const measurements = jobs.map(job => job.measure());
  const applied = jobs.map((job, index) => job.apply(measurements[index]));
  jobs.forEach((job, index) => {if (applied[index]) job.after();});
}

function scheduleLayout(viewport, job) {
  pendingLayouts.set(viewport, job);
  if (layoutFrame === null) layoutFrame = requestAnimationFrame(flushCanvasViewportLayouts);
}

const clampScale = value => Math.max(0.125, Math.min(64, Number(value)));

export function canvasViewportControls(label = "画布缩放") {
  return `<div class="canvas-viewport-controls">
    <button type="button" class="button ghost" data-canvas-zoom-step="-1" title="缩小">−</button>
    <input type="range" min="-3" max="6" step="0.001" value="0" data-canvas-zoom-range aria-label="${esc(label)}">
    <select data-canvas-zoom aria-label="缩放档位"><option value="fit">适应</option>${presets.map(scale =>
      `<option value="${scale}">${scale * 100}%</option>`).join("")}<option value="custom" disabled>自定</option></select>
    <button type="button" class="button ghost" data-canvas-zoom-step="1" title="放大">＋</button>
    <button type="button" class="button ghost" data-canvas-zoom-fit>适应</button>
    <output data-canvas-zoom-value></output>
  </div>`;
}

export function canvasViewportPoint(surface, point, {width, height} = {}) {
  const rect = surface.getBoundingClientRect();
  return {x: (point.clientX - rect.left) * (width || surface.width) / rect.width,
    y: (point.clientY - rect.top) * (height || surface.height) / rect.height};
}

export function bindCanvasViewport({viewport, surface, controls, key, size = () => surface,
  sizeElement = surface, zoom = "fit", fitAlignment = {x: .5, y: .5},
  onChange = () => {}, onLayout = () => {}, canPan = () => true} = {}) {
  if (!viewport || !surface || !controls) return null;
  if (controllers.has(viewport)) return controllers.get(viewport);
  const storageKey = `canvas-viewport:${key}`;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch { /* 本机值缺失时使用初值。 */ }
  let mode = saved?.zoom === "fit" ? "fit"
    : Number.isFinite(saved?.zoom) ? clampScale(saved.zoom) : zoom;
  let panX = Number.isFinite(saved?.x) ? saved.x : 0;
  let panY = Number.isFinite(saved?.y) ? saved.y : 0;
  let scale = 1;
  let drag = null;
  let suppressClick = false;
  const listeners = [];
  const listen = (target, event, callback, options = {}) => {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  };
  viewport.classList.add("canvas-viewport");
  surface.dataset.canvasViewportSurface = "";
  const geometry = () => {
    const dimensions = size();
    const width = Number(dimensions.width) || 256, height = Number(dimensions.height) || 240;
    const viewportWidth = viewport.clientWidth, viewportHeight = viewport.clientHeight;
    const fit = Math.min(viewportWidth / width, viewportHeight / height);
    const pixelSurface = surface.matches("canvas") || surface.querySelector("canvas");
    return {width, height, viewportWidth, viewportHeight,
      fit: pixelSurface && fit >= 1 ? Math.floor(fit) : fit};
  };
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({zoom: mode, x: panX, y: panY})); }
    catch { /* 本机存储不可用时保留页内值。 */ }
    onChange(mode);
  };
  const applyLayout = ({width, height, viewportWidth, viewportHeight, fit}) => {
    if (!(fit > 0)) return;
    scale = mode === "fit" ? fit : clampScale(mode);
    surface.style.width = `${width * scale}px`;
    surface.style.height = `${height * scale}px`;
    surface.style.left = `${(viewportWidth - width * scale) * (mode === "fit" ? fitAlignment.x : .5) + panX}px`;
    surface.style.top = `${(viewportHeight - height * scale) * (mode === "fit" ? fitAlignment.y : .5) + panY}px`;
    const range = controls.querySelector("[data-canvas-zoom-range]");
    const percentage = `${Math.round(scale * 1000) / 10}%`;
    range.value = String(Math.log2(scale));
    range.setAttribute("aria-valuetext", percentage);
    controls.querySelector("[data-canvas-zoom]").value = mode === "fit" ? "fit"
      : presets.includes(scale) ? String(scale) : "custom";
    controls.querySelector("[data-canvas-zoom-value]").textContent = percentage;
    return true;
  };
  const layout = () => {
    pendingLayouts.delete(viewport);
    if (applyLayout(geometry())) onLayout();
  };
  const schedule = () => scheduleLayout(viewport, {measure: geometry, apply: applyLayout, after: onLayout});
  const setZoom = (next, point = null) => {
    if (next === "fit" && !point) {
      panX = 0; panY = 0; mode = "fit";
      schedule(); persist();
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const x = point ? point.clientX - rect.left - viewport.clientLeft - viewport.clientWidth / 2 : 0;
    const y = point ? point.clientY - rect.top - viewport.clientTop - viewport.clientHeight / 2 : 0;
    const {width, height, viewportWidth, viewportHeight, fit} = geometry();
    const offsetX = panX + (mode === "fit" ? (viewportWidth - width * scale) * (fitAlignment.x - .5) : 0);
    const offsetY = panY + (mode === "fit" ? (viewportHeight - height * scale) * (fitAlignment.y - .5) : 0);
    const nextScale = next === "fit" ? fit : clampScale(next);
    if (!(nextScale > 0)) return;
    panX = next === "fit" ? 0 : x - (x - offsetX) * nextScale / scale;
    panY = next === "fit" ? 0 : y - (y - offsetY) * nextScale / scale;
    mode = next === "fit" ? "fit" : nextScale;
    layout();
    persist();
  };
  const panBy = (x, y) => { panX += x; panY += y; layout(); persist(); };
  const step = direction => setZoom(direction > 0
    ? scales.find(value => value > scale + .001) ?? scales.at(-1)
    : scales.findLast(value => value < scale - .001) ?? scales[0]);
  listen(controls.querySelector("[data-canvas-zoom]"), "change", event =>
    setZoom(event.target.value === "fit" ? "fit" : Number(event.target.value)));
  listen(controls.querySelector("[data-canvas-zoom-range]"), "input", event => setZoom(2 ** Number(event.target.value)));
  controls.querySelectorAll("[data-canvas-zoom-step]").forEach(button =>
    listen(button, "click", () => step(Number(button.dataset.canvasZoomStep))));
  listen(controls.querySelector("[data-canvas-zoom-fit]"), "click", () => setZoom("fit"));
  listen(viewport, "wheel", event => {
    if (!event.deltaY) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    setZoom(scale * Math.exp(-delta * .0015), event);
  }, {passive: false});
  listen(viewport, "pointerdown", event => {
    suppressClick = false;
    if (![0, 1].includes(event.button) || !canPan(event)) return;
    if (event.button === 1) event.preventDefault();
    viewport.ownerDocument.getSelection()?.removeAllRanges();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, panX, panY, moved: false};
  });
  for (const type of ["selectstart", "dragstart"]) listen(viewport, type, event => {
    if (drag) event.preventDefault();
  });
  listen(viewport, "pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    if ((event.buttons & 5) === 0) { release(event); return; }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) viewport.setPointerCapture(event.pointerId);
    drag.moved = true;
    suppressClick = true;
    viewport.classList.add("is-panning");
    panX = drag.panX + dx;
    panY = drag.panY + dy;
    layout();
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    if (drag.moved) persist();
    drag = null;
    viewport.classList.remove("is-panning");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(viewport, type, release);
  listen(viewport, "click", event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, {capture: true});
  listen(viewport, "auxclick", event => { if (event.button === 1) event.preventDefault(); });
  listen(viewport, "keydown", event => {
    if (event.target !== viewport || event.altKey || event.metaKey) return;
    const directions = {ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40]};
    if (["+", "=", "-", "_"].includes(event.key)) step(["+", "="].includes(event.key) ? 1 : -1);
    else if (event.key === "0") setZoom(1);
    else if (directions[event.key]) panBy(...directions[event.key].map(value => value * (event.shiftKey ? 4 : 1)));
    else return;
    event.preventDefault();
  });
  const observer = new ResizeObserver(() => {
    if (!viewport.isConnected) { controller.destroy(); return; }
    schedule();
  });
  const dimensions = new MutationObserver(schedule);
  dimensions.observe(sizeElement, {attributes: true,
    attributeFilter: ["width", "height", "data-stage-width", "data-stage-height"]});
  const controller = {layout: schedule, setZoom, panBy, zoom: () => mode,
    point: point => canvasViewportPoint(surface, point, geometry()),
    center: (x, y) => {
      const {width, height} = geometry();
      panX = (width / 2 - x) * scale;
      panY = (height / 2 - y) * scale;
      layout(); persist();
    },
    destroy: () => {
      observer.disconnect(); dimensions.disconnect();
      pendingLayouts.delete(viewport);
      listeners.forEach(remove => remove());
      controllers.delete(viewport);
    }};
  controllers.set(viewport, controller);
  observer.observe(viewport);
  schedule();
  return controller;
}
