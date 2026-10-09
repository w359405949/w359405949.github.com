import { esc } from './element-tree-DsgOBeTK.js';
import { editorLog } from './visual-metasprites-DJP54-bV.js';
import { pickerTileFromEvent, sceneHasElevatorDispatch, fieldElevatorInstance, metatileBehaviorCode } from './pattern-pixel-editor-B8puYQ8A.js';
import { handleTextMarkup, sceneMetatileAttributeRecords, sceneRuntimeMap, sceneMapCell } from './preview-DMSrQMyk.js';
import { uiFacilityElevatorDestinationScene } from './battle-result-script-runtime-B_EClFew.js';

// @editor-module 浮层选择器共用过滤、选值与预览交互。
// 组与候选只由点击或键盘操作切换。

function pickerVisibleOptions(options, {
  query = "", category = "", searchText, group, page = 0, pageSize = Infinity,
}) {
  const terms = String(query).trim().toLocaleLowerCase("zh-CN").split(/\s+/u).filter(Boolean);
  const matches = options.filter(option => (!category || group(option) === category)
    && terms.every(term => String(searchText(option) || "")
      .toLocaleLowerCase("zh-CN").includes(term)));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const selectedPage = Math.max(0, Math.min(page, pages - 1));
  return {matches, pages, page: selectedPage,
    visible: new Set(matches.slice(selectedPage * pageSize, (selectedPage + 1) * pageSize))};
}

function markPickerSelection(options, value, valueOf, activeClass = "active") {
  options.forEach(option => {
    const selected = String(valueOf(option)) === String(value);
    option.classList.toggle(activeClass, selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function openPickerSurface(surface, {filter = null, selected = null} = {}) {
  if (!surface) return;
  if (surface.tagName === "DIALOG") {
    if (!surface.open) surface.showModal();
  } else surface.open = true;
  requestAnimationFrame(() => {
    filter?.focus({preventScroll: true});
    selected?.scrollIntoView({block: "nearest"});
  });
}

function closePickerSurface(surface) {
  if (!surface?.open) return;
  if (surface.tagName === "DIALOG") surface.close();
  else surface.open = false;
}

const pickerPreviews = new WeakMap();

function bindPickerConfirmation(surface, {
  host = surface, confirm, onOpen = null, canConfirm = () => true,
} = {}) {
  if (!surface || !host) return {refresh() {}};
  const actions = document.createElement('div');
  actions.className = 'picker-actions';
  actions.innerHTML = '<button class="button ghost" type="button" data-picker-cancel>取消</button>'
    + '<button class="button" type="button" data-picker-confirm>确认</button>';
  host.append(actions);
  const button = actions.querySelector('[data-picker-confirm]');
  const refresh = () => {button.disabled = !canConfirm();};
  let busy = false;
  const submit = async () => {
    if (!surface.open || busy || !canConfirm()) return;
    busy = true;
    try {
      if (await confirm() !== false) closePickerSurface(surface);
    } finally {
      busy = false;
      refresh();
    }
  };
  button.addEventListener('click', () => void submit());
  actions.querySelector('[data-picker-cancel]').addEventListener('click', () => closePickerSurface(surface));
  surface.addEventListener('keydown', event => {
    if (!surface.open || event.target.closest('details, dialog') !== surface) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePickerSurface(surface);
    } else if (event.key === 'Enter' && !event.isComposing) {
      const target = event.target.closest('button, summary, a, textarea');
      if (target && target.getAttribute('role') !== 'option') return;
      event.preventDefault();
      event.stopPropagation();
      void submit();
    }
  });
  surface.addEventListener('toggle', () => {
    if (surface.open) onOpen?.();
    refresh();
  });
  refresh();
  return {refresh};
}

function bindPickerPreview(list, {selector, render, initial = null,
  onConfirm = null, selected = null} = {}) {
  if (!list) return;
  if (pickerPreviews.has(list)) {
    const state = pickerPreviews.get(list);
    state.render = render;
    state.onConfirm = onConfirm;
    state.selected = selected;
    if (initial) void state.show(initial);
    return state.show;
  }
  list.dataset.pickerPreviewBound = '1';
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  list.before(body);
  body.append(list, detail);
  const state = {render, show: null, onConfirm, selected, pending: null};
  pickerPreviews.set(list, state);
  let generation = 0;
  const show = async candidate => {
    const current = ++generation;
    if (!candidate) {detail.replaceChildren(); return;}
    try {
      const content = await state.render(candidate);
      if (current !== generation || !detail.isConnected) return;
      detail.removeAttribute('role');
      if (content instanceof globalThis.Node) detail.replaceChildren(content);
      else detail.innerHTML = String(content || '');
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (current !== generation) return;
      detail.textContent = error.message;
      detail.setAttribute('role', 'alert');
    }
  };
  state.show = show;
  let confirmation = null;
  for (const eventName of ['click', 'focusin']) list.addEventListener(eventName, event => {
    const candidate = event.target.closest(selector);
    if (!candidate || !list.contains(candidate) || candidate.disabled) return;
    if (state.onConfirm) {
      state.pending = candidate;
      markPickerSelection(list.querySelectorAll(selector), true, option => option === candidate);
      confirmation.refresh();
    }
    void show(candidate);
  });
  const surface = list.closest('details, dialog');
  if (surface && onConfirm) confirmation = bindPickerConfirmation(surface, {
    host: surface.tagName === 'DIALOG' ? surface : body.parentElement,
    canConfirm: () => Boolean(state.pending && !state.pending.disabled),
    confirm: () => state.onConfirm(state.pending),
    onOpen: () => {
      state.pending = state.selected?.() || null;
      markPickerSelection(list.querySelectorAll(selector), true, option => option === state.pending);
      if (state.pending) void show(state.pending);
    },
  });
  surface?.addEventListener('toggle', () => {
    if (surface.open) {
      const candidate = list.querySelector('[aria-selected="true"]') || list.querySelector(selector);
      if (candidate) void show(candidate);
    }
  });
  if (initial) void show(initial);
  return show;
}

function bindCanvasPickerPreview(canvas, {list = canvas, cellWidth = 8, cellHeight = 8,
  label = index => String(index), selected = () => 0, onConfirm = null,
  allowed = () => true} = {}) {
  if (!canvas || canvas.dataset.pickerPreviewBound === '1') return;
  canvas.dataset.pickerPreviewBound = '1';
  canvas.tabIndex = 0;
  const body = document.createElement('div');
  body.className = 'picker-candidates-body';
  const detail = document.createElement('div');
  detail.className = 'picker-candidate-preview';
  const image = document.createElement('canvas');
  image.width = cellWidth;
  image.height = cellHeight;
  const name = document.createElement('b');
  detail.append(name, image);
  list.before(body);
  body.append(list, detail);
  const paint = (column, row) => {
    name.textContent = label(row * Math.floor(canvas.width / cellWidth) + column);
    image.getContext('2d').clearRect(0, 0, cellWidth, cellHeight);
    image.getContext('2d').drawImage(canvas, column * cellWidth, row * cellHeight,
      cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
  };
  let pending = selected();
  const columns = Math.floor(canvas.width / cellWidth);
  const choose = index => {
    pending = index;
    paint(index % columns, Math.floor(index / columns));
    confirmation?.refresh();
  };
  const surface = canvas.closest('details');
  const confirmation = surface && onConfirm ? bindPickerConfirmation(surface, {
    host: body.parentElement,
    canConfirm: () => pending !== null && allowed(pending),
    confirm: () => onConfirm(pending),
    onOpen: () => choose(selected()),
  }) : null;
  canvas.addEventListener('click', event => {
    const index = pickerTileFromEvent(canvas, event, {columns, rows: Math.floor(canvas.height / cellHeight)});
    if (index !== null) choose(index);
  });
  canvas.addEventListener('keydown', event => {
    const delta = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns}[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    choose(Math.max(0, Math.min(columns * Math.floor(canvas.height / cellHeight) - 1, (pending ?? 0) + delta)));
  });
  if (!onConfirm) surface?.addEventListener('toggle', () => {if (surface.open) choose(selected());});
}

// @editor-module 带动画缩略图的资源选择器
//
// 原生 select 的 option 不能承载 canvas。本组件只负责选择器交互与可见性：候选的
// 标记、绘制和播放启停由 owner 注入，因此装备视觉脚本与 battle-action operand
// 仍各自只从自己的 owner 取数、写回自己的既有入口。
//
// **一个对话框里可以并排放几栏候选**（`panes`）。有些选择本来就是几条引用一起
// 定的——怪物的形象与调色板就是：图形只有 2 bit 像素索引，颜色全由 palette 决定，
// 单看哪一边都判断不了配出来是什么样。并排放，才能一边挑一边看另一边的效果。
// 不给 `panes` 时只显示一栏。


const ELEMENT_NAME = "animated-resource-picker";
const configurations = new WeakMap();
const normalizedOptions = new WeakSet();
const confirmations = new WeakMap();

function normalizedOption(option) {
  if (normalizedOptions.has(option)) return option;
  const value = String(option?.value ?? "");
  const handle = String(option?.handle || value);
  const label = String(option?.label || handle);
  const normalized = Object.freeze({
    ...option,
    value,
    handle,
    label,
    disabled: Boolean(option?.disabled),
    searchText: [
      value,
      handle,
      label,
      option?.searchText || "",
    ].join(" ").toLocaleLowerCase("zh-CN"),
  });
  normalizedOptions.add(normalized);
  return normalized;
}

const prepareAnimatedResourceOptions = options => Object.freeze(options.map(normalizedOption));

function configuration(element) {
  return configurations.get(element) || null;
}

function currentOption(element) {
  const config = configuration(element);
  return config?.options.find(option => option.value === element.value) || null;
}

function previewRoot(card) {
  return card?.querySelector?.("[data-animated-resource-preview]") || null;
}

function setCardPlayback(element, card, active) {
  const root = previewRoot(card);
  const config = configuration(element);
  if (root && config?.setPreviewActive) {
    config.setPreviewActive(root, Boolean(active));
  }
  if (card) card.dataset.previewActive = String(Boolean(active));
}

async function mountCardPreview(element, card, option, current = false) {
  const config = configuration(element);
  if (!config || !card || card.dataset.previewMounted === "1") return;
  const root = previewRoot(card);
  if (!root) return;
  card.dataset.previewMounted = "1";
  try {
    const panes = current ? config.panes : config.pendingPanes || config.panes;
    const markup = config.renderPreview?.(option, {current,
      values: Object.fromEntries(panes.map(pane => [pane.id, pane.value]))}) || "";
    if (markup instanceof globalThis.Node) root.replaceChildren(markup);
    else root.innerHTML = String(markup);
    await config.paintPreview?.(root, option, {current});
    if (!card.isConnected) return;
    card.dataset.previewState = "ready";
  } catch (error) {
    editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
    card.dataset.previewState = "error";
    card.dataset.previewError = String(error?.message || error);
    root.textContent = "预览失败";
  }
}

function candidateMarkup(option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "animated-resource-option";
  button.dataset.animatedResourceOption = option.value;
  button.dataset.resourceHandle = option.handle;
  button.disabled = option.disabled;
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", "false");
  const preview = document.createElement("span");
  preview.className = "animated-resource-option-preview";
  preview.dataset.animatedResourcePreview = "";
  preview.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "animated-resource-option-label";
  label.textContent = option.label;
  button.append(preview, label);
  return button;
}

function stopCandidatePreviews(element) {
  element.querySelectorAll?.("[data-animated-resource-option], [data-animated-resource-detail-card]").forEach(card =>
    setCardPlayback(element, card, false)
  );
}

function refreshCandidatePreview(element) {
  const cards = [...element.querySelectorAll('[data-animated-resource-option]:not([hidden])')];
  const card = cards.find(card => card.getAttribute('aria-selected') === 'true') || cards[0];
  if (card) void showCandidatePreview(element, card);
  else {
    stopCandidatePreviews(element);
    element.querySelector('[data-animated-resource-detail]')?.replaceChildren();
  }
}

async function showCandidatePreview(element, candidate) {
  const config = configuration(element), pane = paneOf(element, candidate);
  const detail = element.querySelector('[data-animated-resource-detail]');
  const option = pane?.options.find(option => option.value === candidate.dataset.animatedResourceOption);
  if (!config || !detail || !option) return;
  const key = `${pane.id}:${option.value}`;
  if (detail.dataset.previewKey === key && detail.firstChild) return;
  stopCandidatePreviews(element);
  const card = document.createElement('div');
  card.dataset.animatedResourceDetailCard = '';
  const label = document.createElement('b');
  label.textContent = option.label;
  const preview = document.createElement('div');
  preview.dataset.animatedResourcePreview = '';
  card.append(label, preview);
  detail.dataset.previewKey = key;
  detail.replaceChildren(card);
  await mountCardPreview(element, card, option);
  setCardPlayback(element, card, card.isConnected && element.dataset.animatedResourceOpen === 'true');
}

function applyFilter(element) {
  const config = configuration(element);
  const input = element.querySelector("[data-animated-resource-filter]");
  const cards = [...element.querySelectorAll?.("[data-animated-resource-option]") || []];
  const optionOf = card => config?.options.find(item =>
    item.value === card.dataset.animatedResourceOption);
  const {visible} = pickerVisibleOptions(cards.filter(optionOf), {
    query: input?.value, category: config?.category,
    searchText: card => optionOf(card)?.searchText,
    group: card => optionOf(card)?.group || '',
  });
  let shown = 0;
  cards.forEach(card => {
    const hidden = !visible.has(card);
    card.hidden = hidden;
    if (hidden) setCardPlayback(element, card, false);
    else shown += 1;
  });
  element.dataset.animatedResourceFilteredCount = String(shown);
  const status = element.querySelector("[data-animated-resource-filter-status]");
  if (status) status.textContent = `${shown} / ${config?.options.length || 0} 个候选`;
  element.querySelectorAll("[data-animated-resource-group]").forEach(group => {
    group.hidden = ![...group.querySelectorAll("[data-animated-resource-option]")].some(card => !card.hidden);
  });
  refreshCandidatePreview(element);
}

function closePicker(element) {
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  closePickerSurface(dialog);
  stopCandidatePreviews(element);
  element.dataset.animatedResourceOpen = "false";
  const config = configuration(element);
  if (config) config.pendingPanes = null;
}

function openPicker(element) {
  if (element.disabled) return;
  const config = configuration(element);
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  if (!config || !dialog) return;
  for (const pane of config.panes) {
    const grid = element.querySelector(
      `[data-animated-resource-grid="${CSS.escape(pane.id)}"]`);
    if (!grid) continue;
    if (!grid.childElementCount) {
      const fragment = document.createDocumentFragment();
      const groups = new Map();
      pane.options.forEach(option => {
        if (option.group === undefined) { fragment.append(candidateMarkup(option)); return; }
        if (!groups.has(option.group)) {
          const section = document.createElement("section");
          section.dataset.animatedResourceGroup = option.group;
          const heading = document.createElement("h3");
          heading.textContent = option.groupLabel || "其他";
          section.append(heading);
          groups.set(option.group, section);
          fragment.append(section);
        }
        groups.get(option.group).append(candidateMarkup(option));
      });
      grid.append(fragment);
    }
  }
  if (config.panes.length === 1) config.panes[0].value = element.value;
  config.pendingPanes = config.panes.map(pane => ({...pane}));
  markSelection(element);
  const input = element.querySelector("[data-animated-resource-filter]");
  if (input) input.value = "";
  openPickerSurface(dialog, {filter: input,
    selected: element.querySelector("[aria-selected=\"true\"]")});
  config.category = config.options.find(option => option.value === element.value)?.group || '';
  element.querySelectorAll('[data-animated-resource-category]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.animatedResourceCategory === config.category)));
  element.dataset.animatedResourceOpen = "true";
  element.querySelector('[data-animated-resource-detail]').replaceChildren();
  applyFilter(element);
}

/** 每一栏一个网格。只有一栏时不写栏头——那时它就是从前那个单栏选择器。 */
function renderPanes(element) {
  const config = configuration(element);
  const host = element.querySelector("[data-animated-resource-panes]");
  if (!config || !host) return;
  host.dataset.animatedResourcePaneCount = String(config.panes.length);
  host.replaceChildren();
  for (const pane of config.panes) {
    const column = document.createElement("div");
    column.className = "animated-resource-pane";
    column.dataset.animatedResourcePane = pane.id;
    if (config.panes.length > 1 && pane.label) {
      const heading = document.createElement("b");
      heading.className = "animated-resource-pane-label";
      heading.textContent = pane.label;
      column.append(heading);
    }
    const grid = document.createElement("div");
    grid.className = "animated-resource-grid";
    grid.dataset.animatedResourceGrid = pane.id;
    grid.setAttribute("role", "listbox");
    column.append(grid);
    host.append(column);
  }
}

function paneOf(element, card) {
  const config = configuration(element);
  const id = String(card.closest("[data-animated-resource-pane]")
    ?.dataset.animatedResourcePane ?? "");
  return (config?.pendingPanes || config?.panes)?.find(pane => pane.id === id) || null;
}

// 点击只更新待确认组合；预览按组合重画。
function pickCandidate(element, card) {
  const config = configuration(element);
  const pane = paneOf(element, card);
  if (!config || !pane || card.disabled) return;
  pane.value = String(card.dataset.animatedResourceOption);
  markSelection(element);
  // 另一栏画的是「配上这一栏的新值会是什么样」，所以它们的预览必须作废重画。
  element.querySelectorAll("[data-animated-resource-option]").forEach(item => {
    if (item.closest("[data-animated-resource-pane]") === card.closest(
      "[data-animated-resource-pane]")) return;
    item.dataset.previewMounted = "0";
    const root = previewRoot(item);
    if (root) root.replaceChildren();
  });
  element.querySelector('[data-animated-resource-detail]').replaceChildren();
  void showCandidatePreview(element, card);
  config.confirmation?.refresh();
}

function markSelection(element) {
  const config = configuration(element);
  if (!config) return;
  for (const pane of config.pendingPanes || config.panes) {
    markPickerSelection(element.querySelectorAll(
      `[data-animated-resource-pane="${CSS.escape(pane.id)}"] [data-animated-resource-option]`,
    ), pane.value, card => card.dataset.animatedResourceOption, "selected");
  }
}

function triggerCard(element) {
  return element.querySelector("[data-animated-resource-current]");
}

function paneLabels(element) {
  const config = configuration(element);
  if (!config || config.panes.length < 2) return "";
  return config.panes.map(pane =>
    pane.options.find(item => item.value === pane.value)?.label || pane.value)
    .join(" · ");
}

function renderCurrent(element) {
  const config = configuration(element);
  const option = currentOption(element);
  const card = triggerCard(element);
  if (!config || !card) return;
  setCardPlayback(element, card, false);
  card.dataset.previewMounted = "0";
  card.dataset.animatedResourceCurrent = option?.value || "";
  card.dataset.resourceHandle = option?.handle || "";
  const label = card.querySelector("[data-animated-resource-current-label]");
  if (label) {
    // **当前项的写法归 owner。** 有些引用写成文字就没了信息——调色板写成
    // 「双 00」占一行还看不出是什么色；给了 renderLabel 就由 owner 自己画。
    if (config.renderLabel) {
      label.innerHTML = String(config.renderLabel({
        panes: config.panes,
        values: Object.fromEntries(config.panes.map(pane => [pane.id, pane.value])),
      }) || "");
    } else {
      label.textContent = paneLabels(element)
        || option?.label || `未知候选 ${element.value}`;
    }
  }
  const root = previewRoot(card);
  if (root) root.replaceChildren();
  if (!option) return;
  // 画布自己的 viewport observer 决定当前按钮是否启播；这里不把表外的几十个
  // 当前项全部强制启动。
  void mountCardPreview(element, card, option, true);
}

function renderSkeleton(element) {
  if (element.dataset.animatedResourceBound === "1") return;
  element.dataset.animatedResourceBound = "1";
  element.innerHTML = `<button class="animated-resource-trigger" type="button"
      data-animated-resource-trigger aria-haspopup="dialog">
    <span class="animated-resource-current" data-animated-resource-current>
      <span class="animated-resource-current-preview"
        data-animated-resource-preview aria-hidden="true"></span>
      <span class="animated-resource-current-label"
        data-animated-resource-current-label></span>
    </span>
    <span class="animated-resource-chevron" aria-hidden="true">▾</span>
  </button>
  <dialog class="animated-resource-dialog" data-animated-resource-dialog>
    <div class="animated-resource-toolbar">
      <label>按编号 / 名称过滤
        <input type="search" autocomplete="off"
          data-animated-resource-filter placeholder="输入编号或名称">
      </label>
      <span data-animated-resource-filter-status></span>
      <button class="button ghost" type="button" data-animated-resource-close>关闭</button>
    </div>
    <div class="animated-resource-body">
      <div class="animated-resource-panes" data-animated-resource-panes></div>
      <div class="animated-resource-detail" data-animated-resource-detail></div>
    </div>
  </dialog>`;
  element.querySelector("[data-animated-resource-trigger]")?.addEventListener(
    "click", () => openPicker(element),
  );
  element.querySelector("[data-animated-resource-filter]")?.addEventListener(
    "input", () => {
      configuration(element).category = "";
      element.querySelectorAll("[data-animated-resource-category]").forEach(button =>
        button.setAttribute("aria-pressed", String(!button.dataset.animatedResourceCategory)));
      applyFilter(element);
    },
  );
  const dialog = element.querySelector("dialog[data-animated-resource-dialog]");
  const confirmation = bindPickerConfirmation(dialog, {
    canConfirm: () => !element.disabled && Boolean(configuration(element)?.pendingPanes?.every(pane =>
      pane.options.some(option => option.value === pane.value && !option.disabled))),
    confirm: () => {
      const config = configuration(element);
      config.panes.forEach((pane, index) => {pane.value = config.pendingPanes[index].value;});
      element.dataset.animatedResourceValue = config.panes[0].value;
      renderCurrent(element);
      element.dispatchEvent(new Event('change', {bubbles: true}));
    },
  });
  confirmations.set(element, confirmation);
  element.querySelector("[data-animated-resource-close]")?.addEventListener(
    "click", () => closePicker(element),
  );
  dialog?.addEventListener("close", () => closePicker(element));
  dialog?.addEventListener("click", event => {
    if (event.target === dialog) closePicker(element);
  });
  element.querySelector("[data-animated-resource-panes]")?.addEventListener(
    "click", event => {
      const card = event.target.closest?.("[data-animated-resource-option]");
      if (!card || card.disabled) return;
      pickCandidate(element, card);
    },
  );
  element.querySelector('[data-animated-resource-panes]').addEventListener('focusin', event => {
    const card = event.target.closest('[data-animated-resource-option]');
    if (card) pickCandidate(element, card);
  });
}

const HTMLElementBase = globalThis.HTMLElement || class {};

class AnimatedResourcePicker extends HTMLElementBase {
  connectedCallback() {
    renderSkeleton(this);
    if (configuration(this)) renderCurrent(this);
  }

  disconnectedCallback() {
    stopCandidatePreviews(this);
    setCardPlayback(this, triggerCard(this), false);
  }

  get value() {
    return String(this.dataset.animatedResourceValue || "");
  }

  set value(value) {
    const next = String(value ?? "");
    if (this.dataset.animatedResourceValue === next) return;
    this.dataset.animatedResourceValue = next;
    const config = configuration(this);
    if (config?.panes.length === 1) config.panes[0].value = next;
    renderCurrent(this);
  }

  get options() {
    return configuration(this)?.options || [];
  }

  /** 多栏时每一栏各自的当前值；单栏时只有那一栏。 */
  get values() {
    return Object.fromEntries(
      (configuration(this)?.panes || []).map(pane => [pane.id, pane.value]));
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
    const trigger = this.querySelector("[data-animated-resource-trigger]");
    if (trigger) trigger.disabled = Boolean(value);
    if (value) closePicker(this);
  }

  open() {
    openPicker(this);
  }

  close() {
    closePicker(this);
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, AnimatedResourcePicker);
}

/** 给已有元素安装 owner 候选与预览回调；重复调用会刷新当前项并丢弃旧候选 DOM。 */
function configureAnimatedResourcePicker(element, {
  options = [],
  value = "",
  panes = null,
  renderPreview = null,
  renderLabel = null,
  paintPreview = null,
  setPreviewActive = null,
} = {}) {
  if (!element?.matches?.(ELEMENT_NAME)) {
    throw new TypeError(`${ELEMENT_NAME} element is required`);
  }
  renderSkeleton(element);
  stopCandidatePreviews(element);
  const normalizedPanes = (Array.isArray(panes) && panes.length
    ? panes
    : [{id: "", label: "", options, value}]
  ).map(pane => ({
    id: String(pane.id ?? ""),
    label: String(pane.label ?? ""),
    options: (pane.options || []).map(normalizedOption),
    value: String(pane.value ?? ""),
  }));
  const normalized = normalizedPanes.flatMap(pane => pane.options);
  configurations.set(element, {
    panes: normalizedPanes,
    options: normalized,
    renderPreview,
    renderLabel,
    paintPreview,
    setPreviewActive,
    confirmation: confirmations.get(element),
  });
  element.dataset.animatedResourceOptionCount = String(normalized.length);
  element.dataset.animatedResourcePaneCount = String(normalizedPanes.length);
  renderPanes(element);
  element.querySelector("[data-animated-resource-categories]")?.remove();
  const groups = new Map(normalized.map(option => [option.group || '', option.groupLabel]));
  if (groups.size > 1) {
    const categories = document.createElement("div");
    categories.className = 'module-reference-picker-groups';
    categories.dataset.animatedResourceCategories = "";
    for (const [id, label] of [["", "全部"], ...[...groups].filter(([id]) => id)]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button ghost";
      button.textContent = label;
      button.dataset.animatedResourceCategory = id;
      button.setAttribute("aria-pressed", String(!id));
      button.addEventListener("click", () => {
        configuration(element).category = id;
        categories.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
        applyFilter(element);
      });
      categories.append(button);
    }
    element.querySelector('.animated-resource-body').before(categories);
  }
  element.dataset.animatedResourceValue = String(
    panes ? normalizedPanes[0].value : (value ?? ""));
  renderCurrent(element);
  element.disabled = element.hasAttribute("disabled");
  const label = element.getAttribute("aria-label");
  if (label) {
    element.querySelector("[data-animated-resource-trigger]").setAttribute("aria-label", label);
    element.querySelector("[data-animated-resource-dialog]").setAttribute("aria-label", label);
  }
  return element;
}

// @editor-module 各 owner 共用的富引用下拉框交互骨架
//
// owner 负责候选项、名称、封面和补充说明；本文件只负责过滤、键盘、惰性绘制、
// 当前项同步和 change 事件。它不认识 scene / actor / item 等业务 ID。


if (typeof document !== "undefined") document.addEventListener("pointerdown", event => {
  document.querySelectorAll(".module-reference-picker[open], .scene-position-picker[open], .actor-appearance-details[open], .fixed-tile-choice[open], .boot-choice[open], .nes-colour-choice[open]")
    .forEach(details => {
      if (details.matches(".scene-position-panel .module-reference-picker")) return;
      if (event.target === details || !details.contains(event.target)) details.open = false;
    });
});

if (typeof document !== 'undefined') document.addEventListener('wheel', event => {
  const groups = event.target.closest?.('.module-reference-picker-groups');
  if (!groups || groups.scrollWidth <= groups.clientWidth) return;
  const previous = groups.scrollLeft;
  groups.scrollLeft += event.deltaX || event.deltaY;
  if (groups.scrollLeft !== previous) event.preventDefault();
}, {passive: false});

const UNAVAILABLE_TITLES = Object.freeze({
  "unpublished-resource": "没有已发布资源",
  "path-mismatch": "候选路径不匹配",
  "empty-domain": "引用值域为空",
});

const ownerEnhancements = new Map();

function registerReferencePickerEnhancement(moduleId, enhance) {
  if (ownerEnhancements.has(moduleId) || typeof enhance !== 'function')
    throw new TypeError(`引用选择器增强登记无效：${moduleId}`);
  ownerEnhancements.set(moduleId, enhance);
}

function unavailableTitle(kind, busy) {
  if (busy) return "正在读取候选项";
  return UNAVAILABLE_TITLES[kind] || "引用候选不可用";
}

function normalizedItem(item, index) {
  if (!item || typeof item !== "object") {
    throw new TypeError(`引用候选 ${index} 不是对象`);
  }
  const value = String(item.value ?? "");
  const empty = item.empty === true;
  if (!value && !empty) throw new TypeError(`引用候选 ${index} 缺少 value`);
  return {
    value,
    controlValue: String(item.controlValue ?? value),
    empty,
    group: String(item.group ?? ""),
    groupLabel: String(item.groupLabel ?? ""),
    label: String(item.label ?? value),
    currentLabel: String(item.currentLabel ?? ''),
    description: String(item.description ?? ""),
    meta: String(item.meta ?? ""),
    preview: String(item.preview ?? ""),
    details: String(item.details ?? ""),
    filter: [value, item.currentLabel, item.filter ?? [item.label, item.description, item.meta]
      .filter(Boolean).join(" ")].filter(Boolean).join(' ').toLowerCase(),
    disabled: item.disabled === true,
    previewOnly: item.previewOnly === true,
  };
}

function currentMarkup(item, label, disabled = false, compact = false, summaryOnly = false,
  previewOnlySummary = false) {
  return `${item.preview && !summaryOnly ? `<span class="module-reference-picker-preview"
      data-reference-picker-current-preview>${item.preview}</span>` : ""}
    ${previewOnlySummary && item.preview ? '' : `<span class="module-reference-picker-current-copy"
      data-reference-picker-current-copy>
      ${compact ? "" : `<small>${esc(label)}</small>`}<b>${handleTextMarkup(item.currentLabel || item.label)}</b>
      ${!compact && item.description ? `<small>${handleTextMarkup(item.description)}</small>` : ""}
    </span>`}
    <i data-reference-picker-current-meta>${summaryOnly ? "" : handleTextMarkup(item.meta)}${disabled ? ""
      : '<em aria-hidden="true">⌄</em>'}</i>`;
}

function optionMarkup(item, selected) {
  return `<button type="button"
    class="module-reference-picker-option${selected ? " active" : ""}${item.preview ? " has-preview" : ""}${item.details ? " has-details" : ""}"
    data-reference-picker-option="${esc(item.value)}"
    data-reference-picker-control-value="${esc(item.controlValue)}"
    data-reference-picker-current-label="${esc(item.currentLabel)}"
    ${item.previewOnly ? 'data-reference-picker-preview-only' : ''}
    data-reference-picker-search="${esc(item.filter)}"
    role="option" aria-selected="${selected}"${item.disabled
      ? item.previewOnly ? ' aria-disabled="true"' : ' disabled' : ''}>
    ${item.preview ? `<span class="module-reference-picker-preview"
      data-reference-picker-option-preview><template data-reference-picker-preview-content>${item.preview}</template></span>` : ""}
    <span class="module-reference-picker-option-copy"
      data-reference-picker-option-copy>
      <b>${handleTextMarkup(item.label)}</b>${item.description ? `<small>${handleTextMarkup(item.description)}</small>` : ""}
    </span>
    <code data-reference-picker-option-meta>${handleTextMarkup(item.meta)}</code>
    ${item.details ? `<span class="module-reference-picker-option-details">${item.details}</span>` : ""}
  </button>`;
}

function groupedOptionsMarkup(options, selectedValue) {
  const groups = new Map();
  for (const item of options) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  return [...groups].map(([id, items]) => `<div role="group"
    data-reference-picker-group="${esc(id)}" aria-label="${esc(items[0].groupLabel || "空栏")}">
    ${id ? `<h4>${esc(items[0].groupLabel)}</h4>` : ""}
    ${items.map(item => optionMarkup(item, item.value === selectedValue)).join("")}
  </div>`).join("");
}

function groupNavigationMarkup(groups) {
  if (groups.size <= 1) return '';
  return `<nav class="module-reference-picker-groups" aria-label="按类别选择">
    <button type="button" data-reference-picker-category="" aria-pressed="true">全部</button>
    ${[...groups].filter(([id]) => id).map(([id, name]) => `<button type="button"
      data-reference-picker-category="${esc(id)}" aria-pressed="false">${esc(name)}</button>`).join('')}
  </nav>`;
}

function referenceMenuMarkup({options, selectedValue, filterLabel, filterPlaceholder,
  grouped, previewPanel, pageSize, label}) {
  return `<label class="module-reference-picker-filter"><span>${esc(filterLabel)}</span>
      <input type="search" data-reference-picker-filter
        placeholder="${esc(filterPlaceholder)}" autocomplete="off">
    </label>
    ${grouped ? groupNavigationMarkup(new Map(options.map(item => [item.group, item.groupLabel]))) : ''}
    ${previewPanel ? '<div class="module-reference-picker-body">' : ''}
    <div class="module-reference-picker-list" data-reference-picker-list
      role="listbox" aria-label="${esc(label)}候选列表">
      ${options.length
        ? grouped ? groupedOptionsMarkup(options, selectedValue)
          : options.map(item => optionMarkup(item, item.value === selectedValue)).join("")
        : `<p class="module-reference-picker-empty">没有可用候选</p>`}
    </div>
    ${previewPanel ? '<div class="module-reference-picker-detail" data-reference-picker-detail></div></div>' : ''}
    ${pageSize > 0 ? `<nav data-reference-picker-pagination data-page-size="${Number(pageSize)}" aria-label="候选分页"><button type="button" data-reference-picker-previous>上一页</button><span data-reference-picker-page></span><button type="button" data-reference-picker-next>下一页</button></nav>` : ""}`;
}

function mountReferenceMenu(deferred) {
  deferred.insertAdjacentHTML('beforebegin', referenceMenuMarkup(JSON.parse(deferred.textContent)));
  deferred.remove();
}

function refreshReferencePickerGroups(picker) {
  const menu = picker.querySelector('.module-reference-picker-menu');
  const groups = new Map([...picker.querySelectorAll('[data-reference-picker-list] > [data-reference-picker-group]')]
    .map(group => [group.dataset.referencePickerGroup, group.getAttribute('aria-label')]));
  menu.querySelector('.module-reference-picker-groups')?.remove();
  menu.querySelector('.module-reference-picker-filter').insertAdjacentHTML('afterend', groupNavigationMarkup(groups));
  picker.dispatchEvent(new Event('reference-picker-groups-change'));
}

/**
 * `controlMarkup` 是消费页原有的精确值控件；通用选择器只派发 input/change，
 * 不接管保存。没有原生控件的组合工作台可监听 `module-reference-change`。
 */
function referencePickerMarkup({
  moduleId,
  value,
  label = "引用",
  items = [],
  current = null,
  controlMarkup = "",
  componentAttributes = "",
  className = "",
  filterLabel = "过滤候选",
  filterPlaceholder = "按 ID、名称或属性过滤",
  unavailableReason = "",
  unavailableKind = "",
  busy = false,
  disabled = false,
  pageSize = 0,
  grouped = true,
  compact = false,
  previewPanel = true,
  previewOnlySummary = false,
  lazyOptions = false,
} = {}) {
  const options = items.map(normalizedItem);
  const selectedValue = String(value ?? "");
  const selected = current
    ? normalizedItem(current, -1)
    : options.find(item => item.value === selectedValue)
      || normalizedItem({value: selectedValue || "—", label: selectedValue || "未选择"}, -1);
  const reason = String(unavailableReason || "");
  if (previewOnlySummary) className = `${className} reference-preview-only-summary`.trim();
  if (previewPanel && !className.split(/\s/u).includes('reference-preview-panel')) {
    className = `${className} reference-preview-panel`.trim();
  }
  const summaryOnly = className.split(/\s/u).includes('reference-detail-field');
  const unavailableState = busy ? "loading" : reason
    ? String(unavailableKind || "load-failed") : "";
  const unavailableData = busy || ['unpublished-resource', 'empty-domain'].includes(unavailableState);
  const controlsDisabled = disabled || unavailableData || !options.length;
  const menu = {options, selectedValue, filterLabel, filterPlaceholder, grouped, previewPanel, pageSize, label};
  const pickerMarkup = reason && unavailableData
    ? `<div class="module-reference-picker-disabled${selected.preview ? ' has-preview' : ''}"
        data-reference-picker-unavailable data-reference-picker-unavailable-kind="${esc(unavailableState)}" aria-disabled="true">
        ${currentMarkup({...selected, description: ''}, label, true, compact, summaryOnly, previewOnlySummary)}
      </div>`
    : reason
    ? `<div class="module-reference-picker-unavailable${busy ? " loading" : " error"}"
        data-reference-picker-unavailable
        data-reference-picker-unavailable-kind="${esc(unavailableState)}"
        role="${busy ? "status" : "alert"}"
        aria-live="polite">
        ${selected.preview ? `<span class="module-reference-picker-preview">${selected.preview}</span>` : ""}
        <span class="module-reference-picker-current-copy">
          <small>${esc(label)}</small>
          <b>${esc(unavailableTitle(unavailableState, busy))}</b>
          <small data-reference-picker-unavailable-reason>${esc(reason)}</small>
        </span>
        <code>${esc(String(moduleId || ""))}</code>
      </div>`
    : controlsDisabled ? `<div class="module-reference-picker-disabled${selected.preview ? " has-preview" : ""}">
        ${currentMarkup(selected, label, true, compact, summaryOnly, previewOnlySummary)}
      </div>`
    : `<details class="module-reference-picker${compact ? " compact" : ""}">
      <summary aria-label="${esc(label)}" class="${selected.preview && !summaryOnly ? "has-preview" : ""}">${currentMarkup(selected, label, false, compact, summaryOnly, previewOnlySummary)}</summary>
      <div class="module-reference-picker-menu">
        ${lazyOptions ? `<script type="application/json" data-reference-picker-lazy-menu>${
          JSON.stringify(menu).replaceAll('<', '\\u003c')}</script>` : referenceMenuMarkup(menu)}
      </div>
    </details>`;
  return `<section class="module-reference-field${compact ? " compact" : ""}${className ? ` ${esc(className)}` : ""}"
    ${componentAttributes} data-module-reference-picker
    data-module-reference-module="${esc(String(moduleId || ""))}"
    data-module-reference-value="${esc(selectedValue)}"${busy ? " aria-busy=\"true\"" : ""}
    ${controlsDisabled ? 'data-reference-picker-disabled="true" aria-disabled="true"' : ""}>
    ${pickerMarkup}
    ${controlMarkup && !controlsDisabled ? `<div class="module-reference-native"
      data-module-reference-value-control>${controlMarkup}</div>` : ""}
  </section>`;
}

function nativeControl(picker) {
  return picker.querySelector(
    ":scope > [data-module-reference-value-control] input,"
    + ":scope > [data-module-reference-value-control] select",
  );
}

function previewMarkup(node) {
  return node?.querySelector(':scope > template[data-reference-picker-preview-content]')?.innerHTML
    ?? node?.innerHTML ?? '';
}

function copyOptionToCurrent(picker, option) {
  let preview = picker.querySelector("[data-reference-picker-current-preview]");
  const compact = picker.querySelector(':scope > details')?.classList.contains('compact');
  const summaryOnly = picker.classList.contains('reference-detail-field');
  const optionPreview = summaryOnly ? null : option.querySelector("[data-reference-picker-option-preview]");
  const current = picker.querySelector(".module-reference-picker > summary");
  const currentCopy = picker.querySelector("[data-reference-picker-current-copy]");
  const meta = picker.querySelector("[data-reference-picker-current-meta]");
  if (picker.dataset.referencePickerEmpty === "true") {
    preview?.remove();
    current?.classList.remove("has-preview");
    if (currentCopy) currentCopy.innerHTML = `<small>${esc(
      currentCopy.querySelector("small")?.textContent || "引用")}</small><b>空</b>`;
    if (meta) meta.innerHTML = '<em aria-hidden="true">⌄</em>';
    return;
  }
  if (optionPreview && !preview && current) {
    preview = document.createElement("span");
    preview.className = "module-reference-picker-preview";
    preview.dataset.referencePickerCurrentPreview = "";
    current.prepend(preview);
  }
  if (preview && optionPreview) preview.innerHTML = previewMarkup(optionPreview);
  else if (preview) preview.remove();
  current?.classList.toggle("has-preview", Boolean(optionPreview));
  const optionCopy = option.querySelector("[data-reference-picker-option-copy]");
  if (currentCopy && optionCopy) {
    const fieldLabel = currentCopy.querySelector("small")?.textContent || "引用";
    currentCopy.innerHTML = option.dataset.referencePickerCurrentLabel
      ? `<b>${handleTextMarkup(option.dataset.referencePickerCurrentLabel)}</b>`
      : compact ? optionCopy.querySelector('b').outerHTML
        : `<small>${esc(fieldLabel)}</small>${optionCopy.innerHTML}`;
  }
  const optionMeta = option.querySelector("[data-reference-picker-option-meta]");
  if (meta) {
    meta.innerHTML = `${summaryOnly ? '' : handleTextMarkup(optionMeta?.textContent || "")}<em aria-hidden="true">⌄</em>`;
  }
}

/** 引用的空态只改变呈现，保留原生值与候选。 */
function setReferencePickerEmpty(picker, empty) {
  picker.dataset.referencePickerEmpty = String(Boolean(empty));
  const option = [...picker.querySelectorAll("[data-reference-picker-option]")]
    .find(candidate => candidate.dataset.referencePickerOption === picker.dataset.moduleReferenceValue);
  if (option) copyOptionToCurrent(picker, option);
}

/** 共享字段变化后更新候选呈现，保留选值与交互绑定。 */
function updateReferencePickerItem(picker, item) {
  updateReferencePickerItems(picker, [item]);
}

const itemBatchIdentities = new WeakMap();
let nextItemBatchIdentity = 0;

function updateReferencePickerItems(picker, items, source = null) {
  let identity = null;
  if (source) {
    if (!itemBatchIdentities.has(source)) itemBatchIdentities.set(source, String(++nextItemBatchIdentity));
    identity = itemBatchIdentities.get(source);
    if (picker.dataset.referencePickerItemBatch === identity) return;
  }
  const options = new Map([...picker.querySelectorAll('[data-reference-picker-option]')]
    .map(option => [option.dataset.referencePickerOption, option]));
  const selected = items.map(item => normalizedItem(item, -1))
    .filter(item => options.has(item.value));
  if (!selected.length) return;
  const template = document.createElement("template");
  template.innerHTML = selected.map(item => optionMarkup(item,
    options.get(item.value).getAttribute('aria-selected') === 'true')).join('');
  const rendered = [...template.content.children];
  selected.forEach((normalized, index) => {
    const option = options.get(normalized.value);
    option.replaceChildren(...rendered[index].childNodes);
    option.dataset.referencePickerSearch = normalized.filter;
    option.dataset.referencePickerCurrentLabel = normalized.currentLabel;
    option.dataset.referencePickerControlValue = normalized.controlValue;
    option.classList.toggle("has-preview", Boolean(normalized.preview));
    option.classList.toggle("has-details", Boolean(normalized.details));
    if (picker.dataset.moduleReferenceValue === normalized.value) copyOptionToCurrent(picker, option);
  });
  if (identity) picker.dataset.referencePickerItemBatch = identity;
  else delete picker.dataset.referencePickerItemBatch;
}

function referenceChangeEvent(picker, value, previousValue) {
  return new CustomEvent("module-reference-change", {
    bubbles: true,
    detail: {
      moduleId: picker.dataset.moduleReferenceModule,
      value,
      previousValue,
    },
  });
}

/** 同步当前项，可供消费页的 Original 恢复或关联字段联动使用。 */
async function setReferencePickerValue(
  picker,
  value,
  {emit = false, paint = null} = {},
) {
  const normalized = String(value ?? "");
  const option = [...picker.querySelectorAll("[data-reference-picker-option]")]
    .find(candidate => candidate.dataset.referencePickerOption === normalized);
  const previousValue = picker.dataset.moduleReferenceValue || "";
  picker.dataset.moduleReferenceValue = normalized;
  markPickerSelection(picker.querySelectorAll("[data-reference-picker-option]"),
    true, candidate => candidate === option);
  if (option) copyOptionToCurrent(picker, option);
  const control = nativeControl(picker);
  const controlValue = option?.dataset.referencePickerControlValue ?? normalized;
  if (control && control.value !== controlValue) control.value = controlValue;
  // 选值和保存不能等待 owner 的像素预览；场景缩略图可能需要异步加载多份资产。
  // 先沿消费页原有的 input/change 路径提交，再补画当前封面。
  if (emit) {
    if (control) {
      control.dispatchEvent(new Event("input", {bubbles: true}));
      control.dispatchEvent(new Event("change", {bubbles: true}));
    }
    picker.dispatchEvent(referenceChangeEvent(picker, normalized, previousValue));
  }
  if (paint) {
    const currentPreview = picker.querySelector("[data-reference-picker-current-preview]");
    if (currentPreview) await paint(currentPreview);
  }
  return Boolean(option);
}

/**
 * 给 owner 生成的引用框装上统一行为。`paint` 只接收局部根节点，因而场景、角色、
 * 怪物等模块仍使用自己的像素渲染器。
 */
const controlRenderers = new WeakMap();
function bindReferenceControlProjection(control, render) {
  let renderers = controlRenderers.get(control);
  if (!renderers) controlRenderers.set(control, renderers = new Set());
  renderers.add(render);
}
// Field bindings project a value without synthesizing an edit or a save event.
function syncReferencePickerControl(control) {
  return Promise.all([...(controlRenderers.get(control) || [])].map(render => render()));
}

function bindReferencePicker(picker, {paint = null, preview = null, onSelect = null, onOpen = null} = {}) {
  if (!picker?.matches?.("[data-module-reference-picker]")
      || picker.dataset.moduleReferenceBound === "1") return;
  const deferred = picker.querySelector('[data-reference-picker-lazy-menu]');
  const menuDetails = picker.querySelector(':scope > details');
  if (deferred && !menuDetails.open) {
    if (picker.dataset.referenceMenuDeferred === '1') return;
    picker.dataset.referenceMenuDeferred = '1';
    const control = nativeControl(picker);
    const mount = () => {
      if (!deferred.isConnected) return;
      mountReferenceMenu(deferred);
      menuDetails.removeEventListener('toggle', open);
      control?.removeEventListener('input', input);
      bindReferencePicker(picker, {paint, preview, onSelect, onOpen});
    };
    const open = () => {if (menuDetails.open) mount();};
    const sync = () => {
      if (!deferred.isConnected) return;
      mount();
      return setReferencePickerValue(picker, control.value, {paint});
    };
    const input = () => {void sync();};
    menuDetails.addEventListener('toggle', open);
    if (control) {
      control.addEventListener('input', input);
      bindReferenceControlProjection(control, sync);
    }
    const current = picker.querySelector('[data-reference-picker-current-preview]');
    if (current && paint) void paint(current);
    return;
  }
  if (deferred) mountReferenceMenu(deferred);
  picker.dataset.moduleReferenceBound = "1";
  ownerEnhancements.get(picker.dataset.moduleReferenceModule)?.(picker);
  const details = picker.querySelector(":scope > details");
  const summary = details?.querySelector(":scope > summary");
  const list = picker.querySelector("[data-reference-picker-list]");
  const options = [...picker.querySelectorAll("[data-reference-picker-option]")];
  const detail = picker.querySelector('[data-reference-picker-detail]');
  let previewGeneration = 0;
  const showPreview = async option => {
    if (!detail || !option) return;
    const generation = ++previewGeneration;
    try {
      const content = option.querySelector('.module-reference-picker-option-details')
        || option.querySelector('[data-reference-picker-option-preview]');
      const markup = preview ? await preview(option.dataset.referencePickerOption)
        : `${option.querySelector('[data-reference-picker-option-copy]').outerHTML}
          ${option.querySelector('[data-reference-picker-option-meta]').outerHTML}
          ${previewMarkup(content)}`;
      if (generation !== previewGeneration || !detail.isConnected) return;
      detail.removeAttribute('role');
      detail.innerHTML = markup;
      detail.querySelectorAll('[data-compact]').forEach(node => {node.dataset.compact = '0';});
      if (paint) await paint(detail);
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (generation !== previewGeneration) return;
      detail.textContent = error?.message || String(error);
      detail.setAttribute('role', 'alert');
    }
  };
  let pending = null;
  let confirmation = null;
  const stage = option => {
    if (option.disabled || nativeControl(picker)?.disabled) return;
    pending = option;
    markPickerSelection(options, true, candidate => candidate === pending);
    confirmation?.refresh();
    void showPreview(option);
  };
  const resetPending = () => {
    pending = options.find(option => option.dataset.referencePickerOption === picker.dataset.moduleReferenceValue) || null;
    markPickerSelection(options, true, candidate => candidate === pending);
    confirmation?.refresh();
  };
  const customConfirmation = picker.dataset.referencePickerCustomConfirm === 'true';
  if (!customConfirmation) {
    confirmation = bindPickerConfirmation(details, {
      host: picker.querySelector('.module-reference-picker-menu'),
      canConfirm: () => Boolean(pending && !pending.disabled
        && !pending.hasAttribute('data-reference-picker-preview-only') && !nativeControl(picker)?.disabled),
      confirm: async () => {
        const value = pending.dataset.referencePickerOption;
        await setReferencePickerValue(picker, value, {emit: true, paint});
        await onSelect?.(value);
      },
    });
    options.forEach(option => option.addEventListener('focus', () => stage(option)));
  }
  let paintQueue = Promise.resolve();
  const enqueuePaint = node => {
    if (!node || node.dataset.referencePreviewQueued === "1") return;
    node.dataset.referencePreviewQueued = "1";
    paintQueue = paintQueue.then(async () => {
      const option = node.closest('[data-reference-picker-option]');
      if (!node.isConnected || option && (!details?.open || option.hidden
          || option.dataset.referencePreviewVisible !== 'true')) {
        delete node.dataset.referencePreviewQueued;
        return;
      }
      const template = node.querySelector(':scope > template[data-reference-picker-preview-content]');
      if (template && node.dataset.referencePreviewMounted !== '1') {
        node.append(template.content.cloneNode(true));
        node.dataset.referencePreviewMounted = '1';
      }
      await paint?.(node);
    });
  };
  enqueuePaint(picker.querySelector("[data-reference-picker-current-preview]"));
  let observer = null;

  const filter = picker.querySelector("[data-reference-picker-filter]");
  const pagination = picker.querySelector("[data-reference-picker-pagination]");
  const pageSize = Number(pagination?.dataset.pageSize) || options.length || 1;
  const selectedCategory = () => options.find(option => option.getAttribute('aria-selected') === 'true')
    ?.closest('[data-reference-picker-group]')?.dataset.referencePickerGroup || '';
  let category = selectedCategory();
  let page = 0;
  const updatePage = () => {
    const result = pickerVisibleOptions(options, {query: filter.value, category, page, pageSize,
      searchText: option => option.dataset.referencePickerSearch,
      group: option => option.closest("[data-reference-picker-group]")?.dataset.referencePickerGroup});
    const {matches, pages, visible} = result;
    page = result.page;
    options.forEach(option => {
      const hidden = !visible.has(option);
      if (option.hidden !== hidden) option.hidden = hidden;
    });
    list?.querySelectorAll('[data-reference-picker-group]').forEach(group => {
      group.hidden = ![...group.querySelectorAll("[data-reference-picker-option]")]
        .some(option => visible.has(option));
    });
    picker.querySelectorAll('[data-reference-picker-category]').forEach(button => {
      if (button.closest('[data-module-reference-picker]') === picker)
        button.setAttribute('aria-pressed', String(button.dataset.referencePickerCategory === category));
    });
    if (pagination) {
      pagination.querySelector("[data-reference-picker-page]").textContent = `${page + 1} / ${pages} · ${matches.length} 项`;
      pagination.querySelector("[data-reference-picker-previous]").disabled = page === 0;
      pagination.querySelector("[data-reference-picker-next]").disabled = page === pages - 1;
    }
    if (list) list.scrollTop = 0;
    if (details?.open) {
      observeMenu();
      const candidate = options.find(option => visible.has(option)
        && option.getAttribute('aria-selected') === 'true') || options.find(option => visible.has(option));
      if (candidate) void showPreview(candidate);
      else if (detail) { previewGeneration += 1; detail.replaceChildren(); }
    }
  };
  pagination?.querySelector("[data-reference-picker-previous]").addEventListener("click", () => { page -= 1; updatePage(); });
  pagination?.querySelector("[data-reference-picker-next]").addEventListener("click", () => { page += 1; updatePage(); });
  picker.addEventListener('reference-picker-groups-change', () => {
    category = filter?.value ? '' : selectedCategory();
    page = 0;
    updatePage();
  });
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-reference-picker-category]');
    if (!button || button.closest('[data-module-reference-picker]') !== picker) return;
    category = button.dataset.referencePickerCategory;
    page = 0;
    updatePage();
  });
  filter?.addEventListener("input", () => {
    page = 0;
    category = "";
    updatePage();
  });
  filter?.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown") return;
    const first = options.find(option => !option.hidden && !option.disabled);
    if (!first) return;
    event.preventDefault();
    first.focus();
  });
  const observeMenu = () => {
    observer?.disconnect();
    if (detail) return;
    options.forEach(option => { option.dataset.referencePreviewVisible = 'false'; });
    const visibleOptions = options.filter(option => !option.hidden
      && option.querySelector('[data-reference-picker-option-preview]'));
    if (typeof IntersectionObserver === "function" && list) {
      observer ||= new IntersectionObserver(records => {
        records.forEach(record => {
          const option = record.target;
          const visible = details?.open && !option.hidden && record.isIntersecting;
          option.dataset.referencePreviewVisible = String(Boolean(visible));
          if (visible) enqueuePaint(option.querySelector('[data-reference-picker-option-preview]'));
        });
      }, {root: list, rootMargin: "0px", threshold: 0.01});
      visibleOptions.forEach(option => observer.observe(option));
    } else {
      const bounds = list?.getBoundingClientRect();
      visibleOptions.forEach(option => {
        const rect = option.getBoundingClientRect();
        const visible = bounds && rect.bottom > bounds.top && rect.top < bounds.bottom;
        option.dataset.referencePreviewVisible = String(Boolean(visible));
        if (visible) enqueuePaint(option.querySelector('[data-reference-picker-option-preview]'));
      });
    }
  };
  const initializeMenu = () => {
    if (!customConfirmation) resetPending();
    onOpen?.();
    if (filter) updatePage();
    observeMenu();
  };
  if (details?.open) initializeMenu();
  details?.addEventListener("toggle", () => {
    if (!details.open) {
      observer?.disconnect();
      options.forEach(option => { option.dataset.referencePreviewVisible = 'false'; });
      return;
    }
    initializeMenu();
    openPickerSurface(details, {filter,
      selected: picker.querySelector('[aria-selected="true"]')});
  });
  details?.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !details.open) return;
    event.preventDefault();
    event.stopPropagation();
    closePickerSurface(details);
    summary?.focus();
  });
  options.forEach(option => option.addEventListener("click", async () => {
    if (option.disabled || nativeControl(picker)?.disabled) return;
    if (!customConfirmation) {stage(option); return;}
    if (option.hasAttribute('data-reference-picker-preview-only')) {
      await showPreview(option);
      return;
    }
    if (option.disabled) return;
    void showPreview(option);
    const value = option.dataset.referencePickerOption;
    const changed = value !== picker.dataset.moduleReferenceValue;
    await setReferencePickerValue(picker, value, {emit: changed, paint});
    onSelect?.(value);
    if (details && !details.closest(".scene-position-panel")) closePickerSurface(details);
  }));
  const control = nativeControl(picker);
  const sync = () => {
    const controlValue = control.value;
    const option = options.find(candidate =>
      candidate.dataset.referencePickerControlValue === controlValue);
    return setReferencePickerValue(
      picker,
      option?.dataset.referencePickerOption ?? controlValue,
      {paint},
    );
  };
  if (control) {
    bindReferenceControlProjection(control, sync);
    control.addEventListener("input", sync);
  }
}

/** Enhance an existing value control without replacing its owner/save listeners. */
function bindGroupedReferenceSelect(select) {
  if (select.closest(".carry-item-picker")) return;
  const host = document.createElement("div");
  host.className = "carry-item-picker plain-reference-picker";
  const picker = document.createElement("animated-resource-picker");
  picker.setAttribute("aria-label", select.getAttribute("aria-label") || "选择装备");
  select.before(host);
  host.append(picker, select);
  select.hidden = true;
  host.addEventListener("click", event => event.stopPropagation());
  configureAnimatedResourcePicker(picker, {
    options: [...select.options].map(option => ({
      value: option.value, label: option.textContent, disabled: option.disabled,
      group: option.dataset.referenceGroup || "", groupLabel: option.dataset.referenceGroupLabel || "空",
    })),
    value: select.value,
  });
  picker.disabled = select.disabled;
  picker.addEventListener("change", event => {
    if (event.target !== picker) return;
    event.stopPropagation();
    if (select.disabled) return;
    select.value = picker.value;
    select.dispatchEvent(new Event("input", {bubbles: true}));
    select.dispatchEvent(new Event("change", {bubbles: true}));
  });
  select.addEventListener("input", () => { picker.value = select.value; });
  select.addEventListener("change", () => { picker.value = select.value; });
  new MutationObserver(() => { picker.disabled = select.disabled; })
    .observe(select, {attributes: true, attributeFilter: ["disabled"]});
}

function equipmentItemChoices(items, {inventory = false, allowedIds = null} = {}) {
  return items.filter(item => {
    const id = Number(item.id);
    if (allowedIds && !allowedIds.has(id)) return false;
    if (id === 0) return true;
    if (item.category?.owner !== "human" && !allowedIds) return false;
    return inventory || allowedIds !== null || item.category?.id !== "human-item";
  }).map(item => ({
    value: String(Number(item.id)),
    label: `${item.id_hex} · ${item.name}${Number(item.id) ? `［${item.category.name}］` : ""}`,
    group: Number(item.id) ? item.category?.id || "" : "",
    groupLabel: Number(item.id) ? item.category?.name || "" : "",
  }));
}

// @editor-module 表字段与 owner 引用选择器之间的通用装配层
//
// 字段声明提供候选表与键；字段对象可登记当前显示名、预览与必要的准备步骤。


const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const presentations = new Map();

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function genericPreview(reference, row, label, meta) {
  const configured = reference?.preview?.path
    ? valueAtPath(row, reference.preview.path) : "";
  const text = String(configured ?? "");
  const glyph = (text || label || "?").trim().slice(0, 2) || "?";
  return `<span class="module-reference-data-preview" aria-hidden="true">
    <b>${esc(glyph)}</b>${meta ? `<small>${esc(meta)}</small>` : ""}
  </span>`;
}

function genericItem(row, reference, index) {
  if (!row || typeof row !== "object") {
    throw new TypeError(`引用候选表第 ${index + 1} 行不是对象`);
  }
  const rawValue = valueAtPath(row, reference.key);
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new TypeError(`引用候选表第 ${index + 1} 行缺少声明的键`);
  }
  const value = String(rawValue);
  const rawLabel = valueAtPath(row, reference.name);
  const label = String(rawLabel ?? value);
  const description = reference.description
    ? String(valueAtPath(row, reference.description) ?? "") : "";
  const meta = reference.meta
    ? String(valueAtPath(row, reference.meta) ?? "") : value;
  return {
    value,
    rawValue,
    label,
    description,
    meta,
    preview: genericPreview(reference, row, label, meta),
    filter: [value, label, description, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

function requireModuleId(moduleId) {
  const value = String(moduleId || "");
  if (!MODULE_ID.test(value)) {
    throw new TypeError(`引用呈现模块 ID 无效：${value || "（空）"}`);
  }
  return value;
}

/** owner 登记候选行怎样成为 picker item；字段机制仍只看静态声明。 */
function registerReferenceFieldPresentation(moduleId, definition) {
  const id = requireModuleId(moduleId);
  if (!definition || typeof definition !== "object"
      || typeof definition.item !== "function") {
    throw new TypeError(`${id}: 引用呈现必须提供 item`);
  }
  if (definition.paint !== undefined && typeof definition.paint !== "function") {
    throw new TypeError(`${id}: 引用呈现 paint 必须是函数`);
  }
  for (const key of ["prepare", "currentLabel"]) {
    if (definition[key] !== undefined && typeof definition[key] !== "function") {
      throw new TypeError(`${id}: 引用呈现 ${key} 必须是函数`);
    }
  }
  if (presentations.has(id)) throw new TypeError(`引用呈现重复登记：${id}`);
  presentations.set(id, Object.freeze({...definition}));
}

function presentationFor(moduleId) {
  return presentations.get(requireModuleId(moduleId)) || null;
}

async function prepareReferenceFieldPresentation(moduleId) {
  await presentationFor(moduleId)?.prepare?.();
}

function referenceFieldCurrentLabel(moduleId, row, fallback) {
  return presentationFor(moduleId)?.currentLabel?.(row) ?? fallback;
}

function presentedItem(row, reference, index, moduleId) {
  const presentation = presentationFor(moduleId);
  const itemFactory = presentation?.item || genericItem;
  const declared = genericItem(row, reference, index);
  const item = itemFactory(row, reference, index);
  if (!item) return item;
  const resolved = !presentation || !Array.isArray(reference?.name) ? item : {
    ...item,
    label: referenceFieldCurrentLabel(moduleId, row, declared.label),
    filter: [item.filter, declared.filter].filter(Boolean).join(" ").toLowerCase(),
  };
  return {...resolved, rawValue: declared.rawValue};
}

function declaredKeyPickerItem(item, reference) {
  if (!item || !Array.isArray(reference?.key)) return item;
  const value = String(item.rawValue);
  // owner 自己直接生成 picker 时可以自定 value；字段声明一旦给出 key，候选身份与
  // 原生控件写回值都必须服从这个键。只读 owner 预览仍可展示 owner 的句柄身份。
  return {...item, value, controlValue: value};
}

function multiTargetItem(row, reference, index, moduleId) {
  const {targets: _targets, ...sharedReference} = reference;
  const targetReference = {...sharedReference, module: moduleId};
  const item = presentedItem(row, targetReference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不属于发布归属模块 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

function candidateUnionItem(row, reference, index) {
  const moduleId = requireModuleId(reference?.module);
  const item = presentedItem(row, reference, index, moduleId);
  if (!item) {
    throw new TypeError(`引用候选表第 ${index + 1} 行不能呈现为 ${moduleId}`);
  }
  return {
    ...item,
    description: [moduleId, item.description].filter(Boolean).join(" · "),
    filter: [item.filter, moduleId].filter(Boolean).join(" ").toLowerCase(),
  };
}

function declaredSentinelItems(reference, items) {
  const nullable = reference?.nullable;
  const sentinels = reference?.sentinels || [];
  if (nullable === undefined && !sentinels.length) return items;
  const candidateValues = new Set();
  const candidates = items.map((item, index) => {
    if (!new Set(["number", "string"]).has(typeof item.rawValue)
        || (typeof item.rawValue === "number" && !Number.isFinite(item.rawValue))) {
      throw new TypeError(`带哨兵引用候选 ${index + 1} 的原始键不是数字或字符串`);
    }
    const pickerValue = String(item.rawValue);
    candidateValues.add(pickerValue);
    return {
      ...item,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(item.rawValue),
    };
  });
  const exactSentinels = sentinels.map(sentinel => {
    const pickerValue = String(sentinel.value);
    if (candidateValues.has(pickerValue)) {
      throw new TypeError(`声明哨兵 ${pickerValue} 与目标候选键冲突`);
    }
    return {
      value: pickerValue,
      controlValue: nullable === undefined
        ? pickerValue : JSON.stringify(sentinel.value),
      label: sentinel.label,
      description: sentinel.description || "明确的非引用保留值",
      meta: sentinel.meta ?? pickerValue,
      preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>—</b></span>',
      filter: [pickerValue, sentinel.label, sentinel.description, sentinel.meta]
        .filter(Boolean).join(" ").toLowerCase(),
    };
  });
  const nullSentinel = nullable === undefined ? [] : [{
    value: "",
    controlValue: "null",
    empty: true,
    label: nullable.label,
    description: nullable.description || "明确的空引用哨兵",
    meta: nullable.meta || "null",
    preview: '<span class="module-reference-data-preview" aria-hidden="true"><b>∅</b></span>',
    filter: ["null", nullable.label, nullable.description]
      .filter(Boolean).join(" ").toLowerCase(),
  }];
  return [...nullSentinel, ...exactSentinels, ...candidates];
}

/**
 * 把一张已经按静态声明取出的目标表装进统一 picker。场景等 owner 可以登记像素
 * 呈现；没有专有呈现的表仍使用声明的 name/description/meta/preview.path。
 */
function referenceFieldPickerMarkup({
  reference,
  rows = [],
  rowModules = [],
  rowReferences = [],
  candidatePresentation = "owner",
  candidateControlValue = null,
  value = null,
  label = "引用",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  unavailableKind = "",
  pending = false,
  picker = {},
} = {}) {
  if (!Array.isArray(rows)) throw new TypeError("引用候选不是数组");
  if (!["owner", "declared"].includes(candidatePresentation)) {
    throw new TypeError(`引用候选呈现方式无效：${String(candidatePresentation)}`);
  }
  if (candidateControlValue !== null && typeof candidateControlValue !== "function") {
    throw new TypeError("引用候选 control value 转换器必须是函数");
  }
  const multiTarget = reference?.targets !== undefined;
  const candidateUnion = reference?.container?.kind === "candidate-union";
  const crossTarget = multiTarget || candidateUnion;
  if (crossTarget && candidatePresentation !== "owner") {
    throw new TypeError("跨目标引用不能绕过逐 owner 候选呈现");
  }
  const targetModules = candidateUnion
    ? reference.container.domains.map(domain => requireModuleId(domain.reference?.module))
    : multiTarget
    ? reference.targets.domains.map(domain => requireModuleId(domain.module))
    : [requireModuleId(reference?.module)];
  if (multiTarget && (!Array.isArray(rowModules) || rowModules.length !== rows.length)) {
    throw new TypeError("多目标引用候选必须逐行携带发布归属模块");
  }
  if (candidateUnion && (!Array.isArray(rowReferences)
      || rowReferences.length !== rows.length)) {
    throw new TypeError("跨表引用候选必须逐行携带静态 owner 表声明");
  }
  const moduleId = crossTarget ? "multi-target" : targetModules[0];
  const presentation = crossTarget || candidatePresentation === "declared"
    ? null : presentationFor(moduleId);
  const targetItems = rows.map((row, index) => {
    let item;
    if (candidateUnion) {
      const rowReference = rowReferences[index];
      item = declaredKeyPickerItem(
        candidateUnionItem(row, rowReference, index),
        rowReference,
      );
    } else {
      item = declaredKeyPickerItem(multiTarget
        ? multiTargetItem(row, reference, index, requireModuleId(rowModules[index]))
        : candidatePresentation === "declared"
          ? genericItem(row, reference, index)
          : presentedItem(row, reference, index, moduleId), reference);
    }
    if (!item || candidateControlValue === null) return item;
    return {
      ...item,
      controlValue: String(candidateControlValue(item.rawValue, row, index)),
    };
  }).filter(Boolean);
  const items = declaredSentinelItems(reference, targetItems).map(item => ({...item,
    ...(picker.compact && picker.previewPanel ? {label: item.compactLabel || item.label} : {}),
    ...(picker.identityOnly ? {currentLabel: item.value} : {}),
  }));
  const selectedValue = String(value ?? "");
  const current = items.find(item => String(item.value) === selectedValue) || {
    value: selectedValue || "—",
    label: selectedValue || "未选择",
    description: selectedValue ? "目标表中没有这个键" : "尚未选择引用",
    meta: "",
    preview: "",
  };
  let unavailableReason = String(error || "");
  let unavailableState = String(unavailableKind || "");
  if (!pending && !unavailableReason && !targetItems.length) {
    unavailableReason = "候选表已读取且路径匹配，但 owner 呈现后的引用值域为空";
    unavailableState = "empty-domain";
  }
  return referencePickerMarkup({
    ...picker,
    moduleId,
    value: selectedValue,
    label,
    items,
    current,
    controlMarkup,
    componentAttributes: [
      componentAttributes,
      crossTarget ? `data-module-reference-targets="${esc(targetModules.join(","))}"` : "",
      candidatePresentation === "declared"
        ? 'data-module-reference-candidate-presentation="declared"' : "",
    ].filter(Boolean).join(" "),
    className: [
      "module-table-reference-field",
      picker.previewPanel ? 'reference-detail-field' : '',
      presentation?.className,
      ...(crossTarget ? [...new Set(targetModules.map(target =>
        presentationFor(target)?.className).filter(Boolean))] : []),
    ]
      .filter(Boolean).join(" "),
    filterLabel: presentation?.filterLabel || "过滤候选",
    filterPlaceholder: presentation?.filterPlaceholder || "按键、名称或说明过滤",
    unavailableReason: pending ? "正在读取声明的候选表" : unavailableReason,
    unavailableKind: pending ? "loading" : unavailableState,
    busy: pending,
  });
}

/** 给字段表或 owner 自己生成的 picker 装上同一套交互与惰性预览。 */
function hydrateReferenceFieldPickers(root = document, {paint = undefined} = {}) {
  const selector = "[data-module-reference-picker]";
  const pickers = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
  pickers.forEach(picker => {
    const declaredCandidates = picker.dataset.moduleReferenceCandidatePresentation === "declared";
    const presentation = declaredCandidates
      ? null : presentationFor(picker.dataset.moduleReferenceModule);
    let pickerPaint = paint;
    if (pickerPaint === undefined) {
      const targetModules = String(picker.dataset.moduleReferenceTargets || "")
        .split(",").filter(Boolean);
      const painters = [...new Set(targetModules.map(moduleId =>
        presentationFor(moduleId)?.paint).filter(candidate => typeof candidate === "function"))];
      pickerPaint = painters.length
        ? async target => {
          for (const painter of painters) await painter(target);
        }
        : presentation?.paint || null;
    }
    bindReferencePicker(picker, {
      paint: pickerPaint,
    });
  });
}

// @editor-module 从场景与元图块当前值投影电梯触发格。

async function loadElevatorMetatiles(database) {
  const [pages, sets, terrain] = await Promise.all([
    database.getResourceDocument("metatile-page", null),
    database.getResourceDocument("metatile-set", null),
    database.getResourceDocument("field-terrain-behavior-service", null),
  ]);
  return {pages, sets, terrain};
}

function sceneElevatorPoints(scene, metatiles) {
  if (!scene || !metatiles || !sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain)) return [];
  if (!elevatorBehaviorEnabled(metatiles.terrain)) return [];
  const attributes = sceneMetatileAttributeRecords(scene, metatiles).flatMap(record =>
    record.metatile_attributes || record.metatile_attribute_page || []);
  return (sceneRuntimeMap(scene) || []).flatMap((row, y) => row.flatMap((tile, x) => {
    const attribute = attributes[tile];
    if (!Number.isInteger(attribute)) return [];
    const instanceId = fieldElevatorInstance(Number(scene.id), metatileBehaviorCode(attribute), metatiles.terrain);
    if (instanceId === null) return [];
    const id = y * scene.width + x;
    return [{id, x, y, instance_id: instanceId,
      configuration_handle: `application-config-instance:0F:${String(instanceId).padStart(2, "0")}`,
      map_handle: `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}:map:${sceneMapCell(scene, x, y).sourceY.toString(16).toUpperCase().padStart(2, "0")}`}];
  }));
}

async function loadSceneElevators(database, scenes) {
  const metatiles = await loadElevatorMetatiles(database);
  const groups = await Promise.all(scenes.filter(scene => sceneHasElevatorDispatch(Number(scene.id), metatiles.terrain))
    .map(async scene => {
      const handle = `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}`;
      const document = await database.getResourceDocument(handle, null);
      if (!document?.scene) throw new TypeError(`${handle} 缺少场景正文`);
      return sceneElevatorPoints(document?.scene, metatiles)
        .map(elevator => ({scene, elevator, selection: `elevator:${elevator.id}`}));
    }));
  return groups.flat();
}

function sceneElevatorDestinations(elevator, values, facilities, scenes) {
  return [...values].reverse().map((value, selection) => {
    const sceneId = uiFacilityElevatorDestinationScene(facilities, elevator.instance_id, selection);
    const scene = scenes.editable_scenes.find(row => Number(row.id) === sceneId);
    const x = elevator.x, y = (elevator.y + 1) & 255;
    return {value, selection, sceneId, scene, x, y,
      href: scene ? `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
        sceneMode: 'logic', scenePoint: `${x},${y}`})}` : null};
  });
}

function elevatorBehaviorEnabled(terrain) {
  const values = terrain?.blocks?.find(block =>
    block.id === "field-terrain-behavior-service.whitelist-b075")?.values;
  if (!values) throw new TypeError("地形行为白名单正文不完整");
  const terminator = values.indexOf(0);
  return values.slice(0, terminator < 0 ? values.length : terminator).includes(0x11);
}

export { bindCanvasPickerPreview, bindGroupedReferenceSelect, bindPickerConfirmation, bindPickerPreview, bindReferenceControlProjection, bindReferencePicker, closePickerSurface, configureAnimatedResourcePicker, equipmentItemChoices, hydrateReferenceFieldPickers, loadElevatorMetatiles, loadSceneElevators, markPickerSelection, openPickerSurface, pickerVisibleOptions, prepareAnimatedResourceOptions, prepareReferenceFieldPresentation, referenceFieldCurrentLabel, referenceFieldPickerMarkup, referencePickerMarkup, refreshReferencePickerGroups, registerReferenceFieldPresentation, registerReferencePickerEnhancement, sceneElevatorDestinations, sceneElevatorPoints, setReferencePickerEmpty, setReferencePickerValue, syncReferencePickerControl, updateReferencePickerItem, updateReferencePickerItems };
