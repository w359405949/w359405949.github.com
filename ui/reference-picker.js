// @editor-module 各 owner 共用的富引用下拉框交互骨架
//
// owner 负责候选项、名称、封面和补充说明；本文件只负责过滤、键盘、惰性绘制、
// 当前项同步和 change 事件。它不认识 scene / actor / item 等业务 ID。

import {editorLog} from "../core/editor-log.js";
import {configureAnimatedResourcePicker} from "./animated-resource-picker.js";
import {closePickerSurface, markPickerSelection, openPickerSurface, pickerVisibleOptions} from "./picker-interaction.js";

import {esc} from "../core/dom.js";
import {handleTextMarkup} from "./handle.js";

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

export function registerReferencePickerEnhancement(moduleId, enhance) {
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
    role="option" aria-selected="${selected}"${item.disabled ? " disabled" : ""}>
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

export function refreshReferencePickerGroups(picker) {
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
export function referencePickerMarkup({
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
  const menu = {options, selectedValue, filterLabel, filterPlaceholder, grouped, previewPanel, pageSize, label};
  const pickerMarkup = reason
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
    : disabled ? `<div class="module-reference-picker-disabled${selected.preview ? " has-preview" : ""}">
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
    ${disabled ? 'data-reference-picker-disabled="true" aria-disabled="true"' : ""}>
    ${pickerMarkup}
    ${controlMarkup && !disabled ? `<div class="module-reference-native"
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
export function setReferencePickerEmpty(picker, empty) {
  picker.dataset.referencePickerEmpty = String(Boolean(empty));
  const option = [...picker.querySelectorAll("[data-reference-picker-option]")]
    .find(candidate => candidate.dataset.referencePickerOption === picker.dataset.moduleReferenceValue);
  if (option) copyOptionToCurrent(picker, option);
}

/** 共享字段变化后更新候选呈现，保留选值与交互绑定。 */
export function updateReferencePickerItem(picker, item) {
  updateReferencePickerItems(picker, [item]);
}

const itemBatchIdentities = new WeakMap();
let nextItemBatchIdentity = 0;

export function updateReferencePickerItems(picker, items, source = null) {
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
export async function setReferencePickerValue(
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
  if (emit && normalized !== previousValue) {
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
export function bindReferenceControlProjection(control, render) {
  let renderers = controlRenderers.get(control);
  if (!renderers) controlRenderers.set(control, renderers = new Set());
  renderers.add(render);
}
// Field bindings project a value without synthesizing an edit or a save event.
export function syncReferencePickerControl(control) {
  return Promise.all([...(controlRenderers.get(control) || [])].map(render => render()));
}

export function bindReferencePicker(picker, {paint = null, preview = null, onSelect = null} = {}) {
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
      bindReferencePicker(picker, {paint, preview, onSelect});
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
  if (detail) options.forEach(option => {
    option.addEventListener('pointerenter', () => void showPreview(option));
    option.addEventListener('focus', () => void showPreview(option));
  });
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
    if (option.hasAttribute('data-reference-picker-preview-only')) {
      await showPreview(option);
      return;
    }
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
export function bindGroupedReferenceSelect(select) {
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

export function equipmentItemChoices(items, {inventory = false, allowedIds = null} = {}) {
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
