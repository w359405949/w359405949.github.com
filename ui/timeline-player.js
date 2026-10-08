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

import {esc} from "../core/dom.js";
import {handleTextMarkup} from "./handle.js";
import {timelineTreeRows, timelineSummaryBlocks} from "./timeline-tree.js";
import {timelinePercent, timelineFrameAt, timelineViewport, timelineRuler,
  bindTimelineViewport, timelineViewportPan, syncTimelineViewport, timelineKeyWidths} from './timeline-viewport.js';

const LABEL_WIDTH = 148;
const treeBoundRoots = new WeakSet();

/** NTSC 一帧的长度。刻度轴按秒标注时用它换算。 */
const NTSC_FPS = 60.0988;

export function framesToSeconds(frames, fps = NTSC_FPS) {
  return frames / fps;
}

export function secondsToFrames(seconds, fps = NTSC_FPS) {
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
  return `<span class="tl-block tl-block--${esc(block.tone || kind)}${tree && !block.frames ? " tl-block--diamond" : ""}${
    block.selected ? " is-selected" : ""
  }" style="left:${left}${width}${keyWidth !== null ? ';top:2px;height:18px;bottom:auto' : tree && (!block.frames || block.stackIndex != null) ? `;top:${6 + (block.stackIndex || 0) * 12}px` : ""}" ${data}
    data-tl-frame="${Math.round(Number(block.start) || 0)}"
    ${typeof total === 'number' ? '' : `data-tl-position="${Number(block.start) || 0}"${width ? ` data-tl-duration="${Math.max(Number(block.frames) || 0, 0)}"` : ''}`}
    ${block.title ? `title="${esc(block.title)}" aria-label="${esc(block.title)}"` : ""}
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

function laneBody(lane, total, tree = false) {
  if (lane.kind === "custom") return lane.body || "";
  if (lane.kind === "curve") return curveMarkup(lane.curve || {}, total);
  if (lane.kind === "flat") return typeof total === 'number' ? `<span class="tl-flat"></span>`
    : `<span class="tl-flat" data-tl-position="0" data-tl-duration="${total.totalFrames}" style="left:${percent(0, total)}%;width:${percent(total.totalFrames, total.end - total.start)}%"></span>`;
  const stacks = new Map();
  const keyWidths = lane.keyMinWidth && typeof total !== 'number' ? new Map(timelineKeyWidths(
    lane.blocks || [], total.end - total.start, lane.keyMinWidth).map(({index, width}) => [index, width])) : null;
  return (lane.blocks || []).map((block, index) => {
    const stackIndex = block.stackIndex ?? stacks.get(block.start) ?? 0;
    if (!block.frames) stacks.set(block.start, stackIndex + 1);
    return blockMarkup({...block, ...(!block.frames || block.stackIndex != null ? {stackIndex} : {})}, total, lane.kind, tree, keyWidths?.get(index) ?? null);
  }).join("");
}

/**
 * 画一个走带。`id` 把同一页上的多个走带分开——剧情页可能同时有好几条。
 *
 * `markers` 是刻度轴上那一层：段边界、循环点、结束点这些「事件位置」。它和均匀
 * 刻度画在同一条上但用不同记号，因为两者回答的是不同的问题。
 */
export function timelinePlayer({
  id, totalFrames, frame, playing = false, live = false, fps = NTSC_FPS,
  lanes = [], markers = [], transport = "", status = "", footer = "",
  labelWidth = LABEL_WIDTH,
  title = "", step = false, viewport = null, toolbar = "",
}) {
  const range = viewport ? timelineViewport(totalFrames, viewport) : totalFrames;
  const scale = rulerScale(totalFrames);
  const ticks = scale.ticks.map(tick => `<span class="tl-tick"
    style="left:${percent(tick.frame, totalFrames)}%">${tick.frame}</span>`).join("");
  const marks = markers.map(marker => `<b class="tl-marker tl-marker--${
    esc(marker.tone || "event")}" style="left:${percent(marker.frame, range)}%" ${viewport ? `data-tl-position="${marker.frame}"` : ''}
    title="${esc(marker.title || marker.label || "")}"></b>`).join("");
  const tree = lanes.some(lane => lane.parentId);
  const rows = timelineTreeRows(lanes).map(lane => {
    const data = Object.entries(lane.data || {}).map(([key, value]) =>
      `data-${esc(key)}="${esc(String(value))}"`).join(" ");
    const hierarchy = tree ? ` data-tl-row="${esc(lane.id)}"${lane.parentId ? ` data-tl-parent="${esc(lane.parentId)}"` : ""}${lane.hidden ? " hidden" : ""}` : "";
    const toggle = lane.hasChildren ? `<button type="button" class="tl-tree-toggle"
      data-tl-expand="${esc(lane.id)}" aria-expanded="${lane.expanded !== false}"
      aria-label="${esc(lane.label)}">${lane.expanded === false ? "▸" : "▾"}</button>` : "";
    const body = lane.hasChildren ? {...lane, blocks: lane.summaryBlocks || timelineSummaryBlocks(lanes, lane.id), kind: "key"} : lane;
    if (lane.keyMinWidth) body.blocks = (body.blocks || []).map(block => ({...block, frames: block.frames || 1}));
    const stacks = new Map();
    for (const block of body.blocks || []) {
      if (!block.frames) stacks.set(block.start, (stacks.get(block.start) || 0) + 1);
    }
    const height = tree ? ` style="height:${lane.keyMinWidth && viewport ? 22 : Math.max(22, ...[...stacks.values()].map(count => count * 12 + 10), ...(body.blocks || []).map(block => (block.stackIndex || 0) * 12 + 22))}px"` : "";
    return `<div class="tl-label" ${data}${hierarchy}${tree ? ` style="--tl-depth:${lane.depth}"` : ""}${
      lane.note ? ` title="${esc(lane.note)}"` : ""
    }>${toggle}${tree ? `<span class="tl-tree-icon" aria-hidden="true">${esc(lane.icon || (lane.hasChildren ? "▣" : "◇"))}</span>` : ""}<b>${lane.labelMarkup ?? esc(lane.label)}</b>${lane.control || ""}</div>
    <div class="tl-lane" data-tl-lane="${esc(lane.id)}" ${lane.keyMinWidth ? `data-tl-key-min-width="${lane.keyMinWidth}"` : ""} ${data}${hierarchy}${height}
      >${laneBody(body, range, tree)}</div>`;
  }).join("");
  return `<div class="tl${live ? " is-live" : ""}${tree ? " tl--tree" : ""}" data-tl="${esc(id)}"
    ${viewport ? `data-tl-viewport data-tl-start="${range.start}" data-tl-end="${range.end}" data-tl-scale="${range.zoom}"` : ''}
    style="--tl-label:${labelWidth}px">
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
    ${tree ? '<div class="tl-tree-scroll">' : ""}<div class="tl-grid">
      <i class="tl-playhead" style="--tl-playhead:${percent(frame, range) / 100}"></i>
      <div class="tl-corner">帧</div>
      <div class="tl-ruler" data-tl-ruler tabindex="0" role="slider"
        aria-label="播放进度" aria-valuemin="0" aria-valuemax="${totalFrames}"
        aria-valuenow="${frame}"
        title="刻度每 ${scale.step} 帧一格；点或拖到任意位置，方向键 ±1 帧，Shift ±10，Home/End 到两端"
        >${viewport ? `<span data-tl-ticks>${timelineRuler(range)}</span>` : ticks}${marks}</div>
      ${rows}
    </div>${tree ? "</div>" : ""}
    ${viewport ? timelineViewportPan() : ''}${footer}
  </div>`;
}

/**
 * 播放头只由刻度行定位，轨道保留选中、缩放与平移。
 *
 * 不整页重绘——重绘会把正在拖的元素换掉，指针捕获跟着丢，一拖就断。调用方在
 * `onSeek` 里只更新画面与读数（用 syncTimelinePlayer）。
 */
export function bindTimelinePlayer(root, {
  totalFrames, onSeek, onToggle, currentFrame, skip, onExpand, onViewport, coordinateRoot = root,
}) {
  if (!root) return;
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

export function syncTimelineTree(root, expansions) {
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
  if (root.hasAttribute('data-tl-viewport')) syncTimelineViewport(root,
    Number(root.querySelector('[data-tl-ruler]').getAttribute('aria-valuemax')),
    {zoom: Number(root.dataset.tlScale), center: (Number(root.dataset.tlStart) + Number(root.dataset.tlEnd)) / 2});
}

/** 帧推进时只改这几处：播放头、读数、状态、当前块高亮。不重绘 DOM。 */
export function syncTimelinePlayer(root, {
  frame, totalFrames, playing = false, live = false, status = "",
  currentBlockFrame = null, fps = NTSC_FPS,
}) {
  if (!root) return;
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
