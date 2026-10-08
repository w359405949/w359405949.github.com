// @editor-module 三栏编辑页的骨架、预览排布与画布缩放。
import {esc} from "../core/dom.js";
import {canvasViewportControls, bindCanvasViewport} from "./canvas-viewport.js";

const attributesMarkup = attributes => Object.entries(attributes || {}).map(([name, value]) =>
  value === false || value == null ? '' : ` ${esc(name)}="${esc(value === true ? '' : value)}"`).join('');

function workbenchRoot(namespace, root = document) {
  const selector = `[data-screen-workbench="${CSS.escape(String(namespace || ""))}"]`;
  return root?.matches?.(selector) ? root : root?.querySelector?.(selector) || null;
}

function workbenchCanvas(namespace, root = document) {
  const workbench = workbenchRoot(namespace, root);
  return [...(workbench?.querySelectorAll(".screen-workbench-canvas-box canvas") || [])]
    .find(canvas => canvas.closest('[data-screen-workbench]') === workbench) || null;
}

/** 共用三栏骨架；bottomMarkup 是三栏下方可选的通栏操作区。 */
export function screenWorkbench({
  namespace,
  className = "",
  id = "",
  attributes = {},
  heightMode = "page",
  toolbarMarkup = "",
  treeTitle = "UI 树",
  treeMarkup = "",
  treeClassName = "",
  treeAttributes = {},
  treeScroll = "panel",
  stageMarkup = "",
  stageToolbarMarkup = "",
  inspectorTitle = "属性",
  inspectorMarkup = "",
  inspectorClassName = "",
  inspectorAttributes = {},
  inspectorScroll = "panel",
  bottomMarkup = "",
  bottomSize = "content",
  bottomFit = false,
} = {}) {
  return `<div${id ? ` id="${esc(id)}"` : ""}
    class="workspace screen-workbench${
      bottomMarkup ? " screen-workbench--with-bottom" : ""
    }${toolbarMarkup ? " screen-workbench--with-toolbar" : ""
    }${heightMode === 'timeline' ? ' screen-workbench--with-timeline' : ''
    }${heightMode === 'fill' || bottomMarkup && bottomFit ? ' screen-workbench--fill-space' : ''
    }${heightMode === 'embedded' ? ' screen-workbench--embedded' : ''
    }${bottomMarkup && bottomSize === 'compact' ? ' screen-workbench--compact-bottom' : ''
    }${bottomMarkup && bottomSize === 'resizable' ? ' screen-workbench--resizable-bottom' : ''
    }${bottomFit ? ' screen-workbench--fit-bottom' : ''
    }${stageMarkup ? "" : " screen-workbench--no-stage"
    }${className ? ` ${esc(className)}` : ""}"
    data-screen-workbench="${esc(namespace)}"${attributesMarkup(attributes)}>
    ${toolbarMarkup ? `<header class="screen-workbench-top">${toolbarMarkup}</header>` : ''}
    <aside class="workspace-tree${treeScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${treeClassName ? ` ${esc(treeClassName)}` : ''}"${attributesMarkup(treeAttributes)}>
      ${treeTitle == null ? '' : `<h3>${esc(treeTitle)}</h3>`}
      ${treeMarkup}
    </aside>
    ${stageMarkup ? `<div class="workspace-stage">${stageToolbarMarkup ? `<div class="screen-workbench-stage-toolbar">${stageToolbarMarkup}</div>` : ''}${stageMarkup}</div>` : ""}
    <aside class="workspace-inspector${inspectorScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${
      inspectorClassName ? ` ${esc(inspectorClassName)}` : ""
    }"${attributesMarkup(inspectorAttributes)}>
      ${inspectorTitle == null ? '' : `<h3>${esc(inspectorTitle)}</h3>`}
      ${inspectorMarkup}
    </aside>
    ${bottomMarkup ? `<section class="screen-workbench-bottom">
      ${bottomSize === 'resizable' ? '<div class="screen-workbench-bottom-grip" data-workbench-bottom-grip role="separator" aria-label="调整状态机通栏高度" aria-orientation="horizontal" tabindex="0"></div>' : ''}
      ${bottomMarkup}
    </section>` : ""}
  </div>`;
}

/** 画面正文由调用方提供。 */
export function screenWorkbenchCanvasStage({
  namespace,
  canvasMarkup = "",
  toolbarMarkup = "",
  zoomStatusMarkup = "",
  footerMarkup = "",
  className = "",
  attributes = {},
  viewportClassName = "",
  viewportAttributes = {},
  zoomMarkup = canvasViewportControls(),
  sizing = "compact",
} = {}) {
  return `<div class="screen-workbench-preview screen-workbench-preview--${esc(sizing)}${
    className ? ` ${esc(className)}` : ""
  }"${attributesMarkup(attributes)}>
    ${toolbarMarkup || zoomMarkup ? `<div class="screen-workbench-toolbar">
      ${toolbarMarkup}
      ${zoomMarkup ? `<div class="screen-workbench-zoom">${zoomMarkup}${zoomStatusMarkup}</div>` : ''}
    </div>` : ""}
    <div class="screen-workbench-canvas-box${viewportClassName ? ` ${esc(viewportClassName)}` : ''}"
      data-screen-workbench-canvas-box="${esc(namespace)}"${attributesMarkup(viewportAttributes)}>
      ${canvasMarkup}
    </div>
    ${footerMarkup}
  </div>`;
}

export function bindScreenWorkbenchZoom({namespace, zoom = "fit", onChange = () => {},
  canPan = () => true, root = document, bindViewport = bindCanvasViewport} = {}) {
  const workbench = workbenchRoot(namespace, root);
  const canvas = workbenchCanvas(namespace, root);
  const viewport = canvas?.closest(".screen-workbench-canvas-box");
  if (!viewport) return null;
  const zoomControls = workbench.querySelector('.screen-workbench-zoom');
  const toolbar = workbench.querySelector('.workspace-stage > .screen-workbench-stage-toolbar');
  const previewToolbar = zoomControls?.closest('.screen-workbench-toolbar');
  if (toolbar && previewToolbar?.children.length === 1) {
    toolbar.append(zoomControls);
    previewToolbar.remove();
  }
  const updateAspectRatio = () => {
    viewport.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  };
  updateAspectRatio();
  let surface = viewport.querySelector("[data-canvas-viewport-stack]");
  if (!surface) {
    surface = document.createElement("div");
    surface.dataset.canvasViewportStack = "";
    surface.append(...viewport.childNodes);
    viewport.append(surface);
  }
  viewport.tabIndex = 0;
  viewport.title = '滚轮或＋／−缩放；左键或中键拖动、方向键平移';
  return bindViewport({viewport, surface, canvas, controls: zoomControls, zoom, onChange,
    onLayout: updateAspectRatio,
    key: `screen:${namespace}:${new URL(location.href).searchParams.get("view") || ""}`,
    size: () => canvas, sizeElement: canvas, canPan});
}

/** 填满工作台的附属面板放入检查器，通栏高度只在图与预览间分配。 */
export function bindScreenWorkbenchBottomResize({namespace, root = document, height = null,
  minCanvasHeight = 120, fitWorkbench = true, initialRatio = .5, storageKey = `workbench-bottom:${namespace}`,
  onChange = () => {}} = {}) {
  const workbench = workbenchRoot(namespace, root), grip = workbench?.querySelector('[data-workbench-bottom-grip]');
  if (!grip) return;
  if (fitWorkbench) {
    const inspector = workbench.querySelector('.workspace-inspector');
    const containers = new Set([workbench.parentElement, workbench.closest('#content')].filter(Boolean));
    for (const panel of [...containers].flatMap(container => [...container.children]))
      if (panel.matches('.page-module-editors, [data-scene-destination-users]')) inspector.append(panel);
  }
  const stage = workbench.querySelector('.workspace-stage');
  const viewport = workbench.querySelector('.screen-workbench-canvas-box');
  let requestedHeight = height;
  if (storageKey) {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved > 0) requestedHeight = saved;
    } catch { /* 浏览者存储不可用时使用初值。 */ }
  }
  let drag = null;
  const available = () => workbench.clientHeight - (workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0) - 1;
  const stageChrome = () => viewport?.querySelector('canvas')
    ? Math.max(0, stage.offsetHeight - viewport.clientHeight)
    : stage.querySelector('.screen-workbench-stage-toolbar')?.offsetHeight || 0;
  const limits = () => ({min: 120, max: fitWorkbench
    ? Math.max(120, available() - stageChrome() - minCanvasHeight)
    : Math.max(160, Math.round(window.innerHeight * .8))});
  const resize = (next, remember = false) => {
    const {min, max} = limits();
    height = Math.max(min, Math.min(max, Math.round(next)));
    workbench.style.setProperty('--workbench-bottom-height', `${height}px`);
    grip.setAttribute('aria-valuemin', min); grip.setAttribute('aria-valuemax', max);
    grip.setAttribute('aria-valuenow', height); grip.setAttribute('aria-valuetext', `${height} 像素`);
    if (remember) {
      requestedHeight = height;
      if (storageKey) {
        try {localStorage.setItem(storageKey, String(height));} catch { /* 页内高度继续有效。 */ }
      }
    }
    onChange(height);
  };
  const minimum = () => {
    const chrome = stageChrome();
    workbench.style.setProperty('--workbench-stage-min-height', `${Math.ceil(chrome + minCanvasHeight)}px`);
    workbench.style.setProperty('--workbench-toolbar-height', `${workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0}px`);
  };
  minimum(); resize(requestedHeight ?? available() * initialRatio);
  let resizeFrame = null;
  const observer = new ResizeObserver(() => {
    if (!workbench.isConnected) {
      observer.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
      return;
    }
    if (resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!workbench.isConnected) {observer.disconnect(); return;}
      minimum();
      if (fitWorkbench) resize(requestedHeight ?? available() * initialRatio);
    });
  });
  observer.observe(stage);
  if (fitWorkbench) observer.observe(workbench);
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = {id: event.pointerId, y: event.clientY, height};
    grip.setPointerCapture(event.pointerId); grip.classList.add('dragging');
  });
  grip.addEventListener('pointermove', event => {
    if (event.pointerId === drag?.id) resize(drag.height + drag.y - event.clientY, true);
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    drag = null; grip.classList.remove('dragging');
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(type, release);
  grip.addEventListener('keydown', event => {
    const {min, max} = limits();
    const next = {ArrowUp: height + 40, ArrowDown: height - 40, Home: min, End: max}[event.key];
    if (next == null) return;
    event.preventDefault(); resize(next, true);
  });
}
