// @editor-module 带动画缩略图的资源选择器
//
// 原生 select 的 option 不能承载 canvas。本组件只负责选择器交互与可见性：候选的
// 标记、绘制和播放启停由 owner 注入，因此装备视觉脚本与 battle-action operand
// 仍各自只从自己的 owner 取数、写回自己的既有入口。
//
// **一个对话框里可以并排放几栏候选**（`panes`）。有些选择本来就是几条引用一起
// 定的——怪物的形象与调色板就是：图形只有 2 bit 像素索引，颜色全由 palette 决定，
// 单看哪一边都判断不了配出来是什么样。并排放，才能一边挑一边看另一边的效果。
// 不给 `panes` 就是一栏，行为与从前完全一致。

import {editorLog} from "../core/editor-log.js";
import {closePickerSurface, markPickerSelection, openPickerSurface, pickerVisibleOptions} from "./picker-interaction.js";

const ELEMENT_NAME = "animated-resource-picker";
const configurations = new WeakMap();
const normalizedOptions = new WeakSet();

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

export const prepareAnimatedResourceOptions = options => Object.freeze(options.map(normalizedOption));

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
    const markup = config.renderPreview?.(option, {current}) || "";
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
  return config?.panes.find(pane => pane.id === id) || null;
}

/**
 * 选中一个候选。
 *
 * 单栏时选完即关——那一栏就是全部答案。**多栏时不关**：另一栏的预览按这一栏的
 * 新值重画，用户要看着结果再定另一半，关掉就看不到了。
 */
function pickCandidate(element, card) {
  const config = configuration(element);
  const pane = paneOf(element, card);
  if (!config || !pane) return;
  pane.value = String(card.dataset.animatedResourceOption);
  if (config.panes.length === 1) {
    element.value = pane.value;
    closePicker(element);
    element.dispatchEvent(new Event("change", {bubbles: true}));
    return;
  }
  element.dataset.animatedResourceValue = String(config.panes[0].value);
  markSelection(element);
  // 另一栏画的是「配上这一栏的新值会是什么样」，所以它们的预览必须作废重画。
  element.querySelectorAll("[data-animated-resource-option]").forEach(item => {
    if (item.closest("[data-animated-resource-pane]") === card.closest(
      "[data-animated-resource-pane]")) return;
    item.dataset.previewMounted = "0";
    const root = previewRoot(item);
    if (root) root.replaceChildren();
  });
  renderCurrent(element);
  element.querySelector('[data-animated-resource-detail]').replaceChildren();
  refreshCandidatePreview(element);
  element.dispatchEvent(new Event("change", {bubbles: true}));
}

function markSelection(element) {
  const config = configuration(element);
  if (!config) return;
  for (const pane of config.panes) {
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
  for (const eventName of ['pointerover', 'focusin']) {
    element.querySelector('[data-animated-resource-panes]').addEventListener(eventName, event => {
      const card = event.target.closest('[data-animated-resource-option]');
      if (card) void showCandidatePreview(element, card);
    });
  }
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
export function configureAnimatedResourcePicker(element, {
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
