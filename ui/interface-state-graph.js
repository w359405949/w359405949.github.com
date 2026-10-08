// @editor-module 状态图控件按注入的身份、标签与显示投影保持局部刷新。
import {interfaceGraphConnections, fullInterfaceGraphPositions, nearbyInterfaceGraphPositions} from '../render/interface-state-graph.js';
import {esc} from '../core/dom.js';
import {canvasViewportControls, bindCanvasViewport} from './canvas-viewport.js';

const focusedNodes = new Map();

function syncInterfaceGraphElement(target, source, attributes = true, dataPrefix) {
  for (const attribute of attributes ? [...target.attributes] : []) if (!source.hasAttribute(attribute.name))
    target.removeAttribute(attribute.name);
  for (const attribute of attributes ? source.attributes : []) if (target.getAttribute(attribute.name) !== attribute.value)
    target.setAttribute(attribute.name, attribute.value);
  const key = element => element.nodeType === 1
    ? element.dataset[`${dataPrefix}Node`] || element.dataset[`${dataPrefix}Edge`] || element.tagName : '#text';
  const remaining = [...target.childNodes];
  let next = target.firstChild;
  for (const child of source.childNodes) {
    const previous = remaining.find(node => key(node) === key(child));
    if (previous) {
      remaining.splice(remaining.indexOf(previous), 1);
      if (child.nodeType === 1) syncInterfaceGraphElement(previous, child, true, dataPrefix);
      else if (previous.textContent !== child.textContent) previous.textContent = child.textContent;
      if (previous === next) next = next.nextSibling;
      else target.insertBefore(previous, next);
    } else target.insertBefore(child.cloneNode(true), next);
  }
  remaining.forEach(node => node.remove());
}

export function refreshInterfaceStateGraph(root, options) {
  const {namespace, dataPrefix} = options.presentation;
  const template = document.createElement('template');
  template.innerHTML = interfaceStateGraphMarkup(options);
  const surface = root.querySelector(`.${namespace}-graph svg`);
  const active = root.ownerDocument.activeElement;
  const next = template.content.querySelector('svg');
  // 视口的缩放和平移属于控制器；状态内容只更新 SVG 的几何与选中态。
  for (const name of ['width', 'height', 'viewBox']) surface.setAttribute(name, next.getAttribute(name));
  syncInterfaceGraphElement(surface, next, false, dataPrefix);
  if (surface.contains(active)) active.focus({preventScroll: true});
  root.querySelector(`[data-${dataPrefix}-visible-edges]`).textContent = template.content.querySelector(`[data-${dataPrefix}-visible-edges]`).textContent;
}

export function bindInterfaceStateGraph(root, {cacheKey, selected, presentation}) {
  const {namespace, dataPrefix} = presentation;
  const viewport = root.querySelector(`.${namespace}-graph`), surface = viewport?.querySelector('svg');
  if (!surface) return null;
  const key = `${cacheKey}:${selected.fullGraph ? 'full' : 'nearby'}`;
  let focusPending = focusedNodes.get(key) !== selected.node;
  let viewWidth = viewport.clientWidth, viewHeight = viewport.clientHeight;
  const controller = bindCanvasViewport({viewport, surface, controls: root.querySelector(`.${namespace}-graph-toolbar`),
    key, size: () => surface.viewBox.baseVal, zoom: selected.fullGraph ? 'fit' : 1, onLayout: () => {
      const resized = viewWidth !== viewport.clientWidth || viewHeight !== viewport.clientHeight;
      viewWidth = viewport.clientWidth; viewHeight = viewport.clientHeight;
      if (!focusPending && !resized) return;
      focusPending = false;
      const node = surface.querySelector(`[data-${dataPrefix}-node="${CSS.escape(selected.node)}"]`);
      if (!node) return;
      const bounds = node.getBoundingClientRect(), frame = viewport.getBoundingClientRect(), padding = 12;
      const shift = (start, end, min, max) => end - start > max - min
        ? (min + max - start - end) / 2 : start < min ? min - start : end > max ? max - end : 0;
      controller.panBy(shift(bounds.left, bounds.right, frame.left + padding, frame.right - padding),
        shift(bounds.top, bounds.bottom, frame.top + padding, frame.bottom - padding));
    }});
  focusedNodes.set(key, selected.node);
  return controller;
}

const short = text => text.length > 16 ? `${text.slice(0, 15)}…` : text;

export function interfaceStateGraphMarkup({graph, selected, paths, available, presentation}) {
  const {namespace, dataPrefix, count, notice, exitLabel} = presentation;
  const active = paths.find(path => path.id === selected.path);
  const pathEdges = new Set(active?.edges.map(edge => edge.id));
  const links = interfaceGraphConnections(graph, selected, pathEdges);
  const local = nearbyInterfaceGraphPositions(graph, selected, links, active);
  const positions = selected.fullGraph ? fullInterfaceGraphPositions(graph) : local.positions;
  const edgeMarkup = links.map((link, index) => {
    const from = positions.get(link.from), to = positions.get(link.to);
    if (!from || !to) return '';
    const backward = to.x < from.x, self = to.x === from.x;
    const x1 = backward ? from.x : from.x + 176, y1 = from.y + 23;
    const x2 = backward || self ? to.x + 176 : to.x, y2 = to.y + (self ? 36 : 23);
    const labelX = self ? x1 + 112 : (x1 + x2) / 2;
    const lane = selected.fullGraph ? (y1 + y2) / 2 : 55 + index * 72;
    const bend = self ? 120 : Math.max(28, Math.abs(x2 - x1) / 2);
    const route = selected.fullGraph
      ? `M${x1},${y1} C${x1 + (backward ? -bend : bend)},${y1 + (backward || self ? 48 : 0)} ${x2 + (backward ? bend : self ? bend : -bend)},${y2 + (backward || self ? 48 : 0)} ${x2},${y2}`
      : `M${x1},${y1} H${labelX - 104} V${lane} H${labelX + 104} V${y2} H${x2}`;
    const condition = link.annotation ? short(link.annotation) : link.unknown ? '条件／效果未确认' : short(link.condition);
    return `<g class="interface-state-edge ${namespace}-edge${link.onPath ? ' on-path' : ''}${link.selected ? ' selected' : ''}"
      data-${dataPrefix}-edge="${esc(link.id)}" data-${dataPrefix}-edge-ids="${esc(JSON.stringify(link.members.map(edge => edge.id)))}"
      tabindex="0" role="button" aria-label="${esc(`${link.input} ${link.condition}`)}">
      <title>${esc(`${link.input} · ${link.condition || '无附加条件'}`)}</title>
      <path class="interface-state-edge-hit ${namespace}-edge-hit" d="${route}"/><path class="interface-state-edge-line ${namespace}-edge-line" d="${route}" marker-end="url(#${namespace}-arrow)"/>
      ${selected.fullGraph ? '' : `<rect class="interface-state-edge-label-box ${namespace}-edge-label-box" x="${labelX - 96}" y="${lane - 21}" width="192" height="38" rx="3"/>`}
      <text class="interface-state-edge-label ${namespace}-edge-label" x="${labelX}" y="${lane - 6}">${esc(short(link.input))}</text>
      ${condition ? `<text class="interface-state-edge-condition ${namespace}-edge-condition" x="${labelX}" y="${lane + 8}">${esc(condition)}</text>` : ''}
    </g>`;
  }).join('');
  const nodeMarkup = graph.nodes.map(node => {
    const position = positions.get(node.id), known = Boolean(node.reference) || available(node);
    return `<g class="interface-state-node ${namespace}-node${node.reference ? ' reference' : ''}${selected.node === node.id ? ' selected' : ''}${known ? '' : ' unresolved'}${!selected.fullGraph && !local.activeNodes.has(node.id) ? ' dimmed' : ''}"
      transform="translate(${position.x},${position.y})" data-${dataPrefix}-node="${esc(node.id)}"${node.reference ? ` data-state-reference="${esc(node.id)}" data-state-reference-source="${esc(node.reference.sourceId)}"` : ''} tabindex="0" role="button" aria-label="${esc(node.label)}${node.reference ? ' · 跳到状态机入口' : ''}">
      <title>${esc(node.label)}${known ? '' : ' · 画面未确认'}</title><rect width="176" height="46" rx="4"/>
      <text x="88" y="27">${esc(node.label)}${node.reference ? ' ↗' : ''}</text></g>`;
  }).join('');
  const exit = positions.get(null);
  const width = Math.max(400, ...[...positions.values()].map(position => position.x + 310));
  const height = Math.max(180, links.length * (selected.fullGraph ? 0 : 72) + 96,
    ...[...positions.values()].map(position => position.y + 80));
  return `<div class="interface-state-graph-panel ${namespace}-graph-panel"><header class="interface-state-graph-toolbar ${namespace}-graph-toolbar">
    <button type="button" class="button ghost" data-${dataPrefix}-full-graph aria-pressed="${Boolean(selected.fullGraph)}">全图</button>
    <span class="muted" data-${dataPrefix}-graph-count>${esc(count)}${notice ? ` · ${esc(notice)}` : ''}</span>
    <span class="muted" data-${dataPrefix}-visible-edges>${links.reduce((count, link) => count + link.members.length, 0)} / ${graph.edges.length} 条转移 · ${links.length} 条连线</span>
    ${canvasViewportControls('状态机图缩放')}
    </header><div class="interface-state-graph ${namespace}-graph${selected.fullGraph ? ' full' : ''}" tabindex="0" aria-label="只读状态机图"
      title="滚轮或＋／−缩放；左键或中键拖动、方向键平移">
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="${namespace}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z"/></marker></defs>
      ${edgeMarkup}${nodeMarkup}${exit ? `<g class="interface-state-exit ${namespace}-exit" transform="translate(${exit.x},${exit.y})"><circle cx="8" cy="23" r="8"/><circle cx="8" cy="23" r="4"/><text x="24" y="27">${esc(exitLabel)}</text></g>` : ''}
    </svg></div></div>`;
}
