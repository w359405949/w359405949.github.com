import { esc, requireBrowserProjectRepository, bindTextInputEvents, showEditorError } from './interface-state-preview-Dlotqlmn.js';
import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { pickerTileFromEvent, sceneHasElevatorDispatch, fieldElevatorInstance, metatileBehaviorCode, inlineRuntimeEditorMarkup, resetToOriginalButton, bindInlineRuntimeEditors, bindFieldResetToOriginalButtons, setGroupExpanded, groupExpanded } from './battle-result-script-runtime-BSeJpUGH.js';
import { handleTextMarkup } from './record-6_wsSDi2.js';
import { uiFacilityElevatorDestinationScene, sceneMetatileAttributeRecords, sceneRuntimeMap, sceneMapCell, db, textRecord, decodeFixedTextRecord, textRecordEditorSelection, decodeFixedTextRecordSelection, textRecordEditorText, TEXT_RECORDS_RESOURCE_ID, hasPendingAutoSaves, flushAllAutoSaves, exactFixedTextRecordBytes, fixedTextRecordBytes, textRecordEditorBytes, installEncodedTextRecord, textRecordEditorTokens, textRecordRuntimeWritableRanges } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';

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
const pickerPainters = new WeakMap();

function bindReferencePickerPainter(picker, paint) {
  pickerPainters.set(picker, paint);
}

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
  const column = menu.querySelector('.reference-picker-group-column');
  if (column) column.innerHTML = groupNavigationMarkup(groups);
  else menu.querySelector('.module-reference-picker-filter').insertAdjacentHTML('afterend', groupNavigationMarkup(groups));
  picker.dispatchEvent(new Event('reference-picker-groups-change'));
}

function mountReferencePickerColumns(picker, {detail = null} = {}) {
  const menu = picker.querySelector('.module-reference-picker-menu');
  const list = menu.querySelector('[data-reference-picker-list]');
  const navigation = menu.querySelector('.module-reference-picker-groups');
  const layout = menu.querySelector('.module-reference-picker-body') || document.createElement('div');
  layout.className = 'module-reference-picker-body reference-picker-columns';
  const groupsColumn = document.createElement('div');
  groupsColumn.className = 'reference-picker-group-column';
  if (navigation) groupsColumn.append(navigation);
  const candidatesColumn = document.createElement('div');
  candidatesColumn.className = 'reference-picker-candidates-column';
  candidatesColumn.append(list);
  const preview = detail || menu.querySelector('[data-reference-picker-detail]') || document.createElement('div');
  preview.classList.add('reference-picker-preview-column');
  layout.replaceChildren(groupsColumn, candidatesColumn, preview);
  if (!layout.isConnected) menu.append(layout);
  picker.classList.add('reference-picker-group-columns');
  return {layout, groupsColumn, candidatesColumn, preview};
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
  groupColumn = false,
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
  if (groupColumn) className = `${className} reference-picker-group-columns`.trim();
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
  const painter = paint || pickerPainters.get(picker);
  if (painter) {
    const currentPreview = picker.querySelector("[data-reference-picker-current-preview]");
    if (currentPreview) await painter(currentPreview);
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
  if (paint) bindReferencePickerPainter(picker, paint);
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
  if (menuDetails && picker.classList.contains('reference-picker-group-columns')
      && !picker.querySelector('.reference-picker-columns')) mountReferencePickerColumns(picker);
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
      detail.querySelectorAll('[data-module-component-hydrated]').forEach(node => {
        delete node.dataset.moduleComponentHydrated;
      });
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

// @editor-module text-record 的共用定长文字组件
//
// 页面只声明要编辑哪条稳定 record ID。本组件统一负责 Unicode 输入、按完整
// 字符截断、空字节补齐、保护结构命令与固定图块、延迟写入 working 层及单条还原；剧情、
// 游戏 UI 等消费者不再各写一套 text-record 保存循环。exact 模式拒绝任何字节数
// 变化；readonly 模式只投影同一条记录，不创建输入或保存入口。


const cloneJson = value => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const boundRoots = new WeakMap();
const liveControllers = new Set();

async function flushFixedTextEditors() {
  for (const reference of liveControllers) {
    const controller = reference.deref();
    if (!controller) {
      liveControllers.delete(reference);
      continue;
    }
    if (controller.error) throw new Error(controller.error);
    await controller.flush();
  }
}

function fixedTextFieldInputMarkup({value, label, maxLength = null,
  className = '', attributes = ''} = {}) {
  return `<input${className ? ` class="${esc(className)}"` : ''} type="text"
    value="${esc(value)}" aria-label="${esc(label)}" aria-invalid="false"
    autocomplete="off" spellcheck="false"${
      maxLength === null ? '' : ` maxlength="${esc(maxLength)}"`} ${attributes}>`;
}

function fixedTextInput(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-input="${CSS.escape(String(editorId || ""))}"], [data-runtime-editor-id="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function fixedTextState(root, editorId) {
  return root?.querySelector?.(
    `[data-fixed-text-save-state="${CSS.escape(String(editorId || ""))}"]`,
  ) || null;
}

function sayFixedTextState(root, editorId, message, {invalid = false} = {}) {
  const input = fixedTextInput(root, editorId);
  if (input) {
    input.setAttribute("aria-invalid", String(invalid));
    input.setCustomValidity?.(invalid ? message : "");
  }
  const status = fixedTextState(root, editorId);
  if (status) {
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle("invalid", invalid);
  }
}

function fixedTextResultMessage(result) {
  if (result?.truncated_characters) {
    return `已按容量截断 ${result.truncated_characters} 个字`;
  }
  if (result?.padded_bytes) {
    return `剩余 ${result.padded_bytes} B 已自动补空`;
  }
  return "";
}

/** Unicode projection for plain-text consumers (titles, filters and options). */
function fixedTextRecordText(recordId, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = document_?.records?.[recordId];
  if (!record || !encoding) return "";
  return decodeFixedTextRecord(record, encoding).text;
}

/** 画面文字片段包含其后同一可写区间的补空字节。 */
function fixedTextRecordRangesWithPadding(recordId, ranges, {
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
} = {}) {
  const record = textRecord(document_, recordId);
  const paddingEnds = new Map();
  for (const token of textRecordEditorTokens(record, encoding).reverse()) {
    if (token.kind !== 'padding') continue;
    const end = token.offset + token.bytes.length;
    paddingEnds.set(token.offset, paddingEnds.get(end) ?? end);
  }
  const writable = textRecordRuntimeWritableRanges(record);
  return ranges.map(({offset, length}) => {
    const span = writable.find(span => offset >= span.offset && offset + length <= span.offset + span.length);
    const end = Math.min(paddingEnds.get(offset + length) ?? offset + length,
      span ? span.offset + span.length : offset + length);
    return {offset, length: end - offset};
  });
}

/** 生成一条固定容量文字输入；内容始终从 text-record 当前文档现场解码。 */
function fixedTextEditorMarkup({
  recordId,
  editorId = recordId,
  ranges = null,
  document: document_ = state.project?.text_record_edits,
  encoding = state.project?.text_record_encoding,
  label = "字段名",
  description = "",
  className = "",
  mode = "capacity",
  compact = false,
  readonly = false,
  reset = true,
  resetOnly = false,
  runtime = true,
} = {}) {
  const id = String(recordId || "");
  const editor = String(editorId || id);
  let record = null;
  let decoded = null;
  let failure = "";
  try {
    record = document_ ? textRecord(document_, id) : null;
    if (!record) failure = "当前项目没有这条定长文字记录。";
    else if (!encoding) failure = "当前项目没有可用字符映射。";
    else decoded = ranges === null || ranges === undefined
      ? decodeFixedTextRecord(record, encoding)
      : runtime ? textRecordEditorSelection(record, encoding, document_, ranges)
        : decodeFixedTextRecordSelection(record, encoding, ranges);
  } catch (error) {
    failure = error?.message || String(error);
  }
  const capacity = Number(
    decoded?.editable_byte_capacity ?? record?.editable_byte_capacity,
  ) || 0;
  const editable = Boolean(!readonly && record?.editable && decoded && capacity > 0 && !failure);
  const reason = editable
    ? mode === "exact"
      ? `定长替换必须保持 ${capacity} 个编码字节；不足或超出均拒绝保存。`
      : runtime ? `固定容量；不足自动补空，超出拒绝写入，结构命令和固定图块保持原位。`
        : `固定 ${capacity} 个文字字节；不足自动补空，超出按完整字符截断，结构命令和固定图块保持原位。`
    : failure || record?.readonly_reason || "这条记录不可逐字编辑。";
  if (readonly || !editable) {
    return `<span class="fixed-text-readonly" data-fixed-text-record="${esc(id)}"
      data-fixed-text-runtime="${runtime}"
      data-fixed-text-ranges="${esc(ranges ? JSON.stringify(ranges) : "")}"
      title="${esc(readonly ? description : reason)}">${esc(record && encoding && !ranges
        ? textRecordEditorText(record, encoding) : decoded?.text || "—")}</span>`;
  }
  const serializedRanges = ranges === null || ranges === undefined
    ? "" : JSON.stringify(ranges);
  return `<div class="fixed-text-editor${compact ? " fixed-text-editor--compact" : ""}${className ? ` ${esc(className)}` : ""}"
    data-fixed-text-editor="${esc(editor)}"
    data-fixed-text-runtime="${runtime}"
    data-fixed-text-record="${esc(id)}"
    data-fixed-text-ranges="${esc(serializedRanges)}">
    ${resetOnly ? "" : `<label class="fixed-text-editor-field" title="${esc(description || reason)}">
      ${compact ? "" : `<span><b>${esc(label)}</b><small>${esc(id)}</small></span>`}
      ${runtime ? inlineRuntimeEditorMarkup(document_, id, encoding, {ranges, editorId: editor, label, mode}) : fixedTextFieldInputMarkup({value: decoded?.text || '', label,
        attributes: `data-fixed-text-input="${esc(editor)}"
          data-fixed-text-record="${esc(id)}"
          data-fixed-text-ranges="${esc(serializedRanges)}"
          data-fixed-text-mode="${esc(mode)}"${editable ? '' : ' disabled'}`})}
    </label>`}
    <div class="fixed-text-editor-actions">
      ${resetOnly ? "" : `<span data-fixed-text-save-state="${esc(editor)}" aria-live="polite" hidden></span>`}
      ${reset ? resetToOriginalButton(editor, {
        title: serializedRanges
          ? "只把这个字段恢复到 Original；同一条记录的其他字段保留"
          : "把这条文字恢复到 Original；同一资源里的其他编辑保留",
        disabled: !editable,
      }) : ""}
    </div>
  </div>`;
}

/**
 * 绑定一个根节点下的全部固定文字输入。回调只处理页面自己的投影/重绘；编码、
 * 校验与还原由本组件拥有，写入的等待、排队与失败记账归字段层的自动写入链。
 */
function bindFixedTextEditors(root, {
  database = db,
  reuse = null,
  getDocument = () => state.project?.text_record_edits || null,
  getEncoding = () => state.project?.text_record_encoding || null,
  getRepository = () => requireBrowserProjectRepository(state),
  onDraft = () => {},
  onSaved = null,
  onReset = async () => {},
  onState = () => {},
} = {}) {
  if (!root) return null;
  if (boundRoots.has(root)) {
    const controller = boundRoots.get(root);
    controller.refreshBindings();
    return controller;
  }
  if (reuse?.rebind(root)) return reuse;
  const project = state.project;
  const repository = getRepository();
  const revision = state.browserProjectManifest?.active_original_revision_id;
  const sessionMatches = () => state.project === project &&
    state.projectRepository === repository &&
    state.browserProjectManifest?.active_original_revision_id === revision;
  const notifySaved = async event => {
    if (sessionMatches()) {
      project.text_record_edits = event.saved.value.document;
      project.text_record_dirty = Boolean(event.saved.dirty);
    }
    if (onSaved) await onSaved(event);
    refreshRuntimeEditors({resetRecordId: event.reset ? event.recordId : null});
  };
  const refreshRuntimeEditors = ({resetRecordId = null} = {}) => bindInlineRuntimeEditors(root, {
    getDocument, getEncoding, resetRecordId,
    beforeEdit: async () => {
      await flush();
      if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    },
    onSaved: async () => {
      const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
      await notifySaved({saved, changes: [], root});
    },
    onInput: handleInput,
  });
  let generation = 0;
  const latest = new Map();
  const pending = new Map();
  const invalid = new Map();
  const saving = new Map();

  const queue = (editorId, recordId, ranges, result) => {
    const changeGeneration = ++generation;
    latest.set(editorId, changeGeneration);
    pending.set(editorId, {
      editorId,
      recordId,
      ranges,
      bytes: result.bytes.slice(),
      result,
      generation: changeGeneration,
    });
    onState();
    // 等待防抖、排队与正在提交都归字段层那一条链（`core/project-db.js`）：
    // 这一笔不进任何自建计时器，改动立即排进去，状态栏从同一份记账读。
    void flush().catch(error => showEditorError(root, "定长文字自动写入失败", error));
  };

  const flush = async () => {
    const changes = [...pending.values()].sort(
      (left, right) => left.generation - right.generation,
    );
    if (!changes.length) {
      // 只有还在字段层链上的写入：等它落定，好让调用方看到落盘后的值。
      if (hasPendingAutoSaves()) await flushAllAutoSaves();
      return;
    }
    for (const change of changes) saving.set(change.editorId, change);
    await (async () => {
      try {
        if (state.browserProjectManifest?.active_original_revision_id !== revision ||
            state.projectRepository !== repository) {
          throw new Error("项目会话已切换，请重新打开文字编辑器");
        }
        const grouped = new Map();
        for (const change of changes) {
          const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, change.recordId, "bytes");
          let entry = grouped.get(field);
          if (!entry) grouped.set(field, entry = {field, value: [...field.value], indices: new Set()});
          const ranges = change.ranges || field.editableRanges;
          for (const range of ranges) for (let offset = range.offset; offset < range.offset + range.length; offset++) {
            entry.value[offset] = change.bytes[offset];
            entry.indices.add(offset);
          }
        }
        const writes = [...grouped.values()].map(({field, value, indices}) => {
          const selection = [];
          for (const offset of [...indices].sort((a, b) => a - b)) {
            const last = selection.at(-1);
            if (last && last.offset + last.length === offset) last.length++;
            else selection.push({offset, length: 1});
          }
          return {field, value, selection};
        });
        await database.writeFields(writes, {expectedVersion: writes[0].field.version});
        const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
        await notifySaved({saved, changes, root});
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              root.querySelector("[data-runtime-inline]") ? "" : fixedTextResultMessage(change.result),
            );
          }
        }
      } catch (error) {
        for (const change of changes) {
          if (latest.get(change.editorId) === change.generation) {
            sayFixedTextState(
              root,
              change.editorId,
              `保存失败：${error?.message || error}`,
              {invalid: true},
            );
          }
        }
        throw error;
      } finally {
        for (const change of changes) {
          // 这一笔落定才把同代次的待写清掉：更新的一笔仍留着，写的是更全的值。
          if (latest.get(change.editorId) === change.generation) pending.delete(change.editorId);
          if (saving.get(change.editorId) === change) saving.delete(change.editorId);
        }
        onState();
      }
    })();
  };

  const handleInput = input => {
    if (input.disabled || input.readOnly) return;
    const editorId = String(input?.dataset.fixedTextInput || "");
    const recordId = String(input?.dataset.fixedTextRecord || "");
    const ranges = input?.dataset.fixedTextRanges
      ? JSON.parse(input.dataset.fixedTextRanges) : null;
    const source = getDocument();
    const encoding = getEncoding();
    if (!editorId || !recordId || !source || !encoding) return;
    const document_ = cloneJson(source);
    let result;
    try {
      const encode = input.dataset.fixedTextMode === "exact"
        ? exactFixedTextRecordBytes : fixedTextRecordBytes;
      result = input.runtimeSegment ? textRecordEditorBytes(document_, recordId, input.value,
        encoding, ranges, {exact: input.dataset.fixedTextMode === 'exact'}) : encode(
        document_, recordId, input.value, encoding, ranges,
      );
    } catch (error) {
      result = {ok: false, reason: `不能编码：${error?.message || error}`};
    }
    if (!result.ok) {
      const suffix = result.unsupported?.length
        ? `：${result.unsupported.join(" ")}` : "";
      const reason = `${result.reason}${suffix}`;
      invalid.set(editorId, {recordId, ranges, reason});
      pending.delete(editorId);
      latest.set(editorId, ++generation);
      sayFixedTextState(root, editorId, reason, {invalid: true});
      onState();
      return;
    }
    invalid.delete(editorId);
    installEncodedTextRecord(document_, result);
    input.value = result.text;
    if (input.runtimeSegment && result.truncated_characters) input.runtimeSegment.textContent = result.text || "\u200B";
    input.setAttribute("aria-invalid", "false");
    onDraft({
      document: document_, result, editorId, recordId, ranges, input, root,
    });
    sayFixedTextState(root, editorId, input.runtimeSegment ? "" : fixedTextResultMessage(result));
    queue(editorId, recordId, ranges, result);
  };

  // 身份读容器：`.fixed-text-editor` 上本来就有 editor / record / ranges，
  // 共用按钮只带 itemId，不再重复挂一份。
  const prepareReset = async (recordId, ranges) => {
    const matches = change => change.recordId === recordId &&
      (ranges === null || change.ranges?.every(range => ranges.some(selection =>
        range.offset >= selection.offset && range.offset + range.length <= selection.offset + selection.length)));
    for (const [id, change] of pending) if (matches(change)) pending.delete(id);
    for (const [id, change] of invalid) if (matches(change)) invalid.delete(id);
    for (const input of root.querySelectorAll("[data-fixed-text-input]")) {
      const inputRanges = input.dataset.fixedTextRanges ? JSON.parse(input.dataset.fixedTextRanges) : null;
      if (matches({recordId: input.dataset.fixedTextRecord, ranges: inputRanges})) input.__fieldResetPending = true;
    }
    await flush();
    if (!sessionMatches()) throw new Error("项目会话已切换，请重新打开文字编辑器");
    const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
    return {field, expectedVersion: field.version, fieldOptions: {selection: ranges}, recordId, ranges};
  };
  const finishReset = async ({recordId, ranges}) => {
    const saved = await database.readResource(TEXT_RECORDS_RESOURCE_ID);
    await notifySaved({saved, changes: [], root, reset: true, recordId, ranges});
    onState();
    return saved;
  };
  const resetRecord = async (recordId, ranges = null) => {
    const context = await prepareReset(recordId, ranges);
    await context.field.reset({...context.fieldOptions, expectedVersion: context.expectedVersion});
    return finishReset(context);
  };
  const boundFields = new WeakSet();
  let ready = Promise.resolve();
  const bindFields = async () => {
    const hosts = root.querySelectorAll("[data-fixed-text-record]");
    for (const host of hosts) {
      if (boundFields.has(host)) continue;
      boundFields.add(host);
      const recordId = host.dataset.fixedTextRecord;
      const field = await database.getField(TEXT_RECORDS_RESOURCE_ID, recordId, "bytes");
      if (!host.isConnected || !sessionMatches()) continue;
      const ranges = host.dataset.fixedTextRanges ? JSON.parse(host.dataset.fixedTextRanges) : null;
      const editorId = host.dataset.fixedTextInput || host.dataset.fixedTextEditor;
      let previousText;
      field.bind(host, (element, bytes) => {
        const record = {...textRecord(getDocument(), recordId), bytes};
        const decoded = ranges
          ? host.dataset.fixedTextRuntime === 'true'
            ? textRecordEditorSelection(record, getEncoding(), getDocument(), ranges)
            : decodeFixedTextRecordSelection(record, getEncoding(), ranges)
          : decodeFixedTextRecord(record, getEncoding());
        if (element.matches("[data-fixed-text-input]")) {
          if (element.__fieldResetPending || (!pending.has(editorId) && !saving.has(editorId) && !invalid.has(editorId)
              && (previousText === undefined || element.value === previousText))) element.value = decoded.text;
          delete element.__fieldResetPending;
        } else if (element.matches(".fixed-text-readonly")) element.textContent = decoded.text || "—";
        previousText = decoded.text;
      });
      if (host.matches("[data-fixed-text-editor]")) bindFieldResetToOriginalButtons(host,
        new Map([[editorId, field]]), {
          dirtyFor: field => ranges ? ranges.some(({offset, length}) =>
            field.value.slice(offset, offset + length).some((value, index) =>
              value !== field.defaultValue[offset + index])) : field.hasOverride,
          beforeReset: () => prepareReset(recordId, ranges),
          afterReset: async (_field, context) => {
            const saved = await finishReset(context);
            await onReset({saved, editorId, recordId, ranges, root});
            sayFixedTextState(root, editorId, "");
          },
          onError: error => sayFixedTextState(root, editorId, `还原失败：${error?.message || error}`, {invalid: true}),
        });
    }
  };

  const refreshBindings = () => {
    refreshRuntimeEditors();
    ready = bindFields();
    void ready.catch(error => showEditorError(root, "文字字段绑定失败", error));
    return ready;
  };

  const bindRoot = () => {
    bindTextInputEvents(root, {selector: '[data-fixed-text-input]', onInput: event => {
      if (event.composedPath().find(node => boundRoots.has(node)) !== root) return;
      const input = event.target.closest?.("[data-fixed-text-input]");
      if (input) handleInput(input);
    }});
    refreshBindings();
  };

  const controller = Object.freeze({
    // A list/detail rerender replaces the form, not the pending text edit.
    // Keep its queue and validation so a later invalid input cancels the same
    // pending record. Never transfer a controller between project sessions.
    rebind(nextRoot) {
      if (root.isConnected || !sessionMatches()) return false;
      boundRoots.delete(root);
      root = nextRoot;
      boundRoots.set(root, controller);
      bindRoot();
      return true;
    },
    // 落定这一页的待写：字段层的链没有自建计时器，直接等它跑完。
    flush,
    resetRecord,
    prepareReset,
    finishReset,
    refreshBindings,
    get ready() { return ready; },
    isDirty(recordId) {
      return [...pending.values(), ...saving.values(), ...invalid.values()]
        .some(change => change.recordId === recordId);
    },
    get error() { return invalid.values().next().value?.reason || ""; },
    get dirtyCount() {
      return new Set([...pending.values(), ...saving.values(), ...invalid.values()]
        .map(change => change.recordId)).size;
    },
    get pending() { return pending.size > 0 || saving.size > 0; },
  });
  boundRoots.set(root, controller);
  liveControllers.add(new WeakRef(controller));
  bindRoot();
  return controller;
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
  lanes = lanes.map(lane => ({...lane,
    expanded: groupExpanded(`timeline:${id}:${lane.id}`, lane.expanded !== false)}));
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
      setGroupExpanded(`timeline:${coordinateRoot.dataset.tl}:${toggle.dataset.tlExpand}`, expanded);
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

export { bindCanvasPickerPreview, bindFixedTextEditors, bindGroupedReferenceSelect, bindPickerConfirmation, bindPickerPreview, bindReferenceControlProjection, bindReferencePicker, bindReferencePickerPainter, bindTimelinePlayer, closePickerSurface, configureAnimatedResourcePicker, equipmentItemChoices, fixedTextEditorMarkup, fixedTextFieldInputMarkup, fixedTextRecordRangesWithPadding, fixedTextRecordText, flushFixedTextEditors, framesToSeconds, hydrateReferenceFieldPickers, loadElevatorMetatiles, loadSceneElevators, markPickerSelection, mountReferencePickerColumns, openPickerSurface, pickerVisibleOptions, prepareAnimatedResourceOptions, prepareReferenceFieldPresentation, prepareTimelineKeys, referenceFieldCurrentLabel, referenceFieldPickerMarkup, referencePickerMarkup, refreshReferencePickerGroups, registerReferenceFieldPresentation, registerReferencePickerEnhancement, registerTimelineKeyRecords, sceneElevatorDestinations, sceneElevatorPoints, secondsToFrames, setReferencePickerEmpty, setReferencePickerValue, syncReferencePickerControl, syncTimelinePlayer, syncTimelineTree, syncTimelineViewport, timelineFrameAt, timelinePlayer, timelineSelectedBlocks, timelineSummaryBlocks, timelineViewportControls, updateReferencePickerItem, updateReferencePickerItems };
