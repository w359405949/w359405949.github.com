// @editor-module 时间轴可选视窗、缩放与平移。
export function timelineViewport(total, stored = {}) {
  const margin = Math.max(60, total / 2);
  const min = -margin, max = total + margin;
  const zoom = Math.min(32, Math.max(0.5, Number(stored?.zoom) || 1));
  const span = (max - min) / zoom;
  const center = Number.isFinite(stored?.center) ? stored.center : total / 2;
  return {totalFrames: total, min, max, zoom, start: center - span / 2, end: center + span / 2};
}

export function timelinePercent(frame, range) {
  return typeof range === 'number' ? (range > 0 ? frame / range * 100 : 0)
    : (frame - range.start) / (range.end - range.start) * 100;
}

export function timelineRuler(range) {
  const span = range.end - range.start;
  const power = 10 ** Math.floor(Math.log10(span / 10));
  const step = Math.max(1, [1, 2, 5, 10].find(value => value * power >= span / 10) * power);
  const ticks = [];
  for (let frame = Math.ceil(range.start / step) * step; frame <= range.end; frame += step)
    ticks.push(`<span class="tl-tick" style="left:${timelinePercent(frame, range)}%">${Number(frame.toFixed(3))}</span>`);
  return ticks.join('');
}

export function timelineViewportControls() {
  return `<label class="tl-zoom" title="滚轮以指针为中心缩放">缩放 <input type="range" min="-1" max="5" step="0.05" value="0" data-tl-zoom aria-label="时间轴缩放"></label>
    <button type="button" class="button ghost" data-tl-fit>适应</button>`;
}

export function timelineFrameAt(root, node, event, total) {
  const rect = node.getBoundingClientRect();
  if (!rect.width) return null;
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const start = Number(root.dataset.tlStart || 0);
  const end = root.hasAttribute('data-tl-end') ? Number(root.dataset.tlEnd) : total;
  return Math.round(start + ratio * (end - start));
}

export function timelineKeyWidths(blocks, span, minWidth) {
  return blocks.map((block, index) => ({...block, index})).sort((a, b) => a.start - b.start)
    .map((block, index, sorted) => {
      const available = (sorted[index + 1]?.start ?? Infinity) - block.start;
      const duration = (block.frames || 1) / span * 100;
      const minimum = `max(${minWidth}px, ${duration}%)`;
      const width = Number.isFinite(available) ? `min(${minimum}, ${available / span * 100}%)` : minimum;
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
      node.style.width = width;
      node.style.top = '2px';
      node.style.height = '18px';
      node.style.bottom = 'auto';
    }
    lane.style.height = '22px';
  }
}

export function syncTimelineViewport(root, total, stored, onChange, positionsReady = false) {
  if (!root?.hasAttribute('data-tl-viewport')) return;
  const range = timelineViewport(total, stored);
  root.dataset.tlStart = range.start;
  root.dataset.tlEnd = range.end;
  root.dataset.tlScale = range.zoom;
  const ruler = root.querySelector('[data-tl-ruler]');
  ruler.title = '点按定位；滚轮缩放，空白处左键或任意处中键拖动平移；方向键 ±1 帧，Shift ±10，Home／End 到两端';
  let ticks = ruler.querySelector('[data-tl-ticks]');
  if (!ticks) { ticks = document.createElement('span'); ticks.dataset.tlTicks = ''; ruler.append(ticks); }
  ticks.innerHTML = timelineRuler(range);
  for (const node of positionsReady ? [] : root.querySelectorAll('[data-tl-position]')) {
    node.style.left = `${timelinePercent(Number(node.dataset.tlPosition), range)}%`;
    if (node.hasAttribute('data-tl-duration'))
      node.style.width = `${Number(node.dataset.tlDuration) / (range.end - range.start) * 100}%`;
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
  onChange?.({zoom: range.zoom, center: (range.start + range.end) / 2});
}

export function bindTimelineViewport(root, {totalFrames, onViewport, skip}) {
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
    const node = event.target.closest?.('[data-tl-lane], [data-tl-ruler]');
    if (!node || !root.contains(node) || ![0, 1].includes(event.button) || drag) return;
    if (event.button === 0 && node.hasAttribute('data-tl-ruler')) return;
    if (event.button === 0 && (event.target.closest?.('[data-tl-frame], input, select, button, a, [contenteditable], animated-resource-picker') || skip?.(event))) return;
    const width = node.getBoundingClientRect().width;
    if (!width) return;
    suppressClick = false;
    drag = {id: event.pointerId, button: event.button, node, x: event.clientX,
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
    if (!drag.moved && Math.abs(dx) < 4) return;
    drag.moved = true;
    suppressClick = true;
    root.classList.add('is-panning');
    apply({zoom: drag.zoom, center: drag.center - dx * drag.span / drag.width});
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

export function timelineViewportPan() {
  return `<div class="tl-pan"><label title="空白处左键或任意处中键拖动平移">平移 <input data-tl-pan type="range" step="any" aria-label="时间轴横向位置"></label><samp data-tl-range></samp></div>`;
}
