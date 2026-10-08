// @editor-module 从怪物行动属性栏搬出的发射点控件。坐标语义与写入由各 owner 提供。
import {esc} from "../core/dom.js";
import {resetToOriginalButton} from "./table.js";
import {canvasViewportPoint} from "./canvas-viewport.js";

export function anchorFieldsMarkup(anchor, anchorSlot, record, {
  prefix = "monster-attack-anchor",
  xLabel = "X（相对占格左边）",
  yLabel = "Y（相对占格顶边）",
  xMin = 0, xMax = 127, yMin = 0, yMax = 127,
  title = "发射点", marker = "",
  readout = `+${anchor.x}, +${anchor.y}`,
} = {}) {
  if (anchor.reason) {
    return `<p class="module-editor-message" data-${prefix}-unavailable>${
      esc(anchor.reason)}　<span class="mono" data-${prefix}-readout>${
      esc(anchor.reason)}</span></p>`;
  }
  return `<div class="monster-attack-anchor-fields">
    <div class="section-line"><h3>${esc(title)}${marker}</h3>
      <span class="mono" data-${prefix}-readout>${esc(readout)}</span></div>
    <label><small>${esc(xLabel)}</small>
      <input type="number" min="${xMin}" max="${xMax}" value="${anchor.x}"
        data-${prefix}-x></label>
    <label><small>${esc(yLabel)}</small>
      <input type="number" min="${yMin}" max="${yMax}" value="${anchor.y}"
        data-${prefix}-y></label>
    ${record && prefix === "monster-attack-anchor"
      ? resetToOriginalButton(record.recordId, {title: "恢复这条发射点记录的原值"}) : ""}
    ${record ? `<small class="mono">记录 ${record.recordId}${
      record.redirected ? " · 按行动槽重定向" : ""}${
      record.sharing > 1 ? ` · 被 ${record.sharing} 处用到` : ""}</small>` : ""}
  </div>`;
}

export function paintAnchorMarkers(host, {canvas, slots, selectedSlot,
  prefix = 'monster-attack-anchor'} = {}) {
  if (!host || !canvas) return;
  host.innerHTML = slots.map(({slot, x, y, scene}) => `<i data-${prefix}-marker="${slot}"
    class="${slot === selectedSlot ? 'is-current' : ''}"
    style="left:${(scene.x / canvas.width * 100).toFixed(2)}%;top:${(scene.y / canvas.height * 100).toFixed(2)}%"
    title="槽 ${slot}　+${x}, +${y}"></i>`).join('');
}

export function bindAnchorMarkerDrag(root, {canvas, origin, selectedSlot, anchor,
  canEdit = () => true, onSelect, onCommit, onError,
  prefix = 'monster-attack-anchor'} = {}) {
  const markerSelector = `[data-${prefix}-marker]`;
  const markerKey = `data-${prefix}-marker`;
  const preview = point => {
    const marker = root.querySelector(`${markerSelector}[${markerKey}="${selectedSlot()}"]`);
    const surface = canvas(), offset = origin();
    if (marker && surface && offset) {
      marker.style.left = `${((offset.x + point.x) / surface.width * 100).toFixed(2)}%`;
      marker.style.top = `${((offset.y + point.y) / surface.height * 100).toFixed(2)}%`;
    }
    const readout = root.querySelector(`[data-${prefix}-readout]`);
    if (readout) readout.textContent = `+${point.x}, +${point.y}`;
    for (const axis of ['x', 'y']) {
      const input = root.querySelector(`[data-${prefix}-${axis}]`);
      if (input) input.value = String(point[axis]);
    }
  };
  const pointAt = event => {
    const surface = canvas(), offset = origin();
    if (!surface || !offset) return null;
    const point = canvasViewportPoint(surface, event);
    for (const axis of ['x', 'y']) {
      const input = root.querySelector(`[data-${prefix}-${axis}]`);
      if (!input || !Number.isFinite(point[axis])) return null;
      point[axis] = Math.max(Number(input.min), Math.min(Number(input.max), Math.round(point[axis] - offset[axis])));
    }
    return point;
  };
  root.addEventListener('pointerdown', event => {
    const marker = event.target.closest?.(markerSelector);
    if (!marker || event.button !== 0) return;
    event.preventDefault();
    const slot = Number(marker.getAttribute(markerKey));
    if (slot !== selectedSlot()) {
      Promise.resolve(onSelect?.(slot)).catch(onError);
      return;
    }
    if (!canEdit() || anchor()?.reason) return;
    let point = pointAt(event);
    if (!point) return;
    const initial = {x: anchor().x, y: anchor().y};
    const pointerId = event.pointerId;
    marker.setPointerCapture(pointerId);
    marker.classList.add('is-dragging');
    preview(point);
    const move = next => {
      if (next.pointerId !== pointerId) return;
      point = pointAt(next) || point;
      preview(point);
    };
    const finish = next => {
      if (next.pointerId !== pointerId) return;
      marker.removeEventListener('pointermove', move);
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) marker.removeEventListener(type, finish);
      marker.classList.remove('is-dragging');
      if (marker.hasPointerCapture(pointerId)) marker.releasePointerCapture(pointerId);
      if (next.type !== 'pointerup') {preview(initial); return;}
      point = pointAt(next) || point;
      preview(point);
      if (point.x !== initial.x || point.y !== initial.y) Promise.resolve(onCommit?.(point)).catch(onError);
    };
    marker.addEventListener('pointermove', move);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) marker.addEventListener(type, finish);
  });
}
