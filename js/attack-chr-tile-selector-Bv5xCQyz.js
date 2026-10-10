import { hydrateModuleComponents, moduleComponentDefinition, renderModuleComponent, esc, nesPalette } from './interface-state-preview-Dlotqlmn.js';
import { bindReferencePickerPainter, bindReferenceControlProjection, referencePickerMarkup, bindReferencePicker, markPickerSelection, bindPickerPreview } from './timeline-player-YCH7Y-3h.js';
import './prg-loaders-DnCSmXk9.js';

// @editor-module 已发布物品目录的分组选择器。

const lazyPickers = new Map();
let lazyPickerId = 0;

function itemPickerEntries({records, shells, allowedCategories, emptyValue, emptyLabel,
  extraChoices, valueForRecord}) {
  const allowed = allowedCategories === null ? null : new Set(allowedCategories);
  const entries = [];
  if (emptyValue !== null) entries.push({value: String(emptyValue), empty: emptyValue === '',
    label: emptyLabel,
    group: "empty", groupLabel: "空", meta: "", filter: emptyLabel});
  for (const record of records) {
    const id = Number(record.id);
    if (id === 0 || allowed && !allowed.has(record.category?.id)) continue;
    const hex = `0x${id.toString(16).toUpperCase().padStart(2, "0")}`;
    const category = record.category;
    const name = String(record.name || hex);
    const previewOwner = category?.owner === "tank" ? "tank-item" : "human-item";
    entries.push({
      value: String(valueForRecord ? valueForRecord(record) : id),
      label: `${hex} · ${name}`,
      group: String(category?.id || "unpublished"),
      groupLabel: String(category?.name || "—"),
      meta: hex,
      preview: moduleComponentDefinition(previewOwner, "preview")
        ? renderModuleComponent(previewOwner, "preview", {entry: record}) : "",
      filter: `${id} ${hex} ${name} ${category?.name || ""}`.toLowerCase(),
    });
  }
  if (!allowed || allowed.has("shell")) for (const shell of shells) {
    const id = Number(shell.id);
    const hex = `0x${id.toString(16).toUpperCase().padStart(2, "0")}`;
    entries.push({value: String(id), label: `${hex} · ${shell.name || hex}`,
      group: "shell", groupLabel: "炮弹", meta: hex,
      preview: '<span class="item-category-glyph" aria-hidden="true">弹</span>',
      filter: `${id} ${hex} ${shell.name || ""} 炮弹`.toLowerCase()});
  }
  return entries.concat(extraChoices);
}

function itemPickerMarkup({records = [], value = 0, label = "物品", fieldId = "", disabled = false,
  arrayIndex = null, compact = false, allowedCategories = null, shells = [],
  emptyValue = 0, emptyLabel = "空"} = {}) {
  return itemPickerFieldMarkup({records, shells, value, label, disabled, compact,
    allowedCategories, emptyValue, emptyLabel, lazy: true,
    componentAttributes: `data-save-item-picker="${esc(fieldId)}"`,
    controlMarkup: `<input type="hidden" value="${esc(value)}"${disabled ? " disabled" : ""}
      ${Number.isInteger(arrayIndex)
        ? `data-save-page-array-field="${esc(fieldId)}" data-save-page-array-index="${arrayIndex}"`
        : `data-save-page-field="${esc(fieldId)}"`}>`,
  });
}

function itemPickerFieldMarkup({records = [], value = 0, label = "物品", disabled = false,
  compact = true, allowedCategories = null, shells = [], emptyValue = 0, emptyLabel = "空",
  extraChoices = [], valueForRecord = null, componentAttributes = "", controlMarkup = "",
  lazy = true, picker = {}} = {}) {
  const presentation = {previewPanel: picker.previewPanel !== false,
    className: picker.previewPanel ? 'reference-detail-field' : '', pageSize: picker.pageSize || 24};
  const config = {records, shells, value, label, disabled, compact,
    allowedCategories, emptyValue, emptyLabel, extraChoices, valueForRecord, presentation};
  const key = lazy && !disabled ? String(++lazyPickerId) : "";
  if (key) lazyPickers.set(key, config);
  const selected = lazy ? records.filter(record => String(valueForRecord
    ? valueForRecord(record) : record.id) === String(value)) : records;
  const selectedShells = lazy ? shells.filter(record => Number(record.id) === Number(value)) : shells;
  const selectedExtras = lazy ? extraChoices.filter(choice => String(choice.value) === String(value)) : extraChoices;
  return referencePickerMarkup({
    moduleId: allowedCategories?.length === 1 && allowedCategories[0] === "shell"
      ? "shell-record" : "item-entry",
    value,
    label,
    items: itemPickerEntries({...config, records: selected, shells: selectedShells,
      extraChoices: selectedExtras}),
    grouped: true,
    disabled,
    compact,
    ...presentation,
    filterLabel: "搜索物品",
    filterPlaceholder: "名称、编号或类别",
    componentAttributes: `${componentAttributes} data-item-picker${key
      ? ` data-item-picker-lazy="${key}"` : ""}`, controlMarkup,
  });
}

function hydrateItemPickers(root = document) {
  root.querySelectorAll("[data-item-picker]").forEach(picker => {
    const key = picker.dataset.itemPickerLazy;
    if (key) {
      const config = lazyPickers.get(key);
      const details = picker.querySelector('details.module-reference-picker');
      if (!config || !details) return;
      lazyPickers.delete(key);
      delete picker.dataset.itemPickerLazy;
      bindReferencePickerPainter(picker, hydrateModuleComponents);
      void hydrateModuleComponents(details);
      const control = picker.querySelector(
        '[data-module-reference-value-control] input, [data-module-reference-value-control] select');
      if (control) {
        const sync = () => {
          if (!details.isConnected || picker.dataset.moduleReferenceValue === control.value) return;
          const records = config.records.filter(record => String(config.valueForRecord
            ? config.valueForRecord(record) : record.id) === control.value);
          const shells = config.shells.filter(record => String(record.id) === control.value);
          const extraChoices = config.extraChoices.filter(choice =>
            String(choice.value) === control.value);
          const markup = referencePickerMarkup({moduleId: "item-entry",
            value: control.value, label: config.label,
            items: itemPickerEntries({...config, records, shells, extraChoices}),
            compact: config.compact, ...config.presentation});
          const template = document.createElement('template');
          template.innerHTML = markup;
          details.querySelector('summary').innerHTML =
            template.content.querySelector('summary').innerHTML;
          picker.dataset.moduleReferenceValue = control.value;
          void hydrateModuleComponents(details);
        };
        control.addEventListener('input', sync);
        bindReferenceControlProjection(control, sync);
      }
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        const full = referencePickerMarkup({moduleId: config.allowedCategories?.length === 1
          && config.allowedCategories[0] === "shell" ? "shell-record" : "item-entry",
          value: picker.dataset.moduleReferenceValue ?? config.value,
          label: config.label,
          items: itemPickerEntries(config), grouped: true, compact: config.compact,
          ...config.presentation, filterLabel: "搜索物品",
          filterPlaceholder: "名称、编号或类别"});
        const template = document.createElement('template');
        template.innerHTML = full;
        const expanded = template.content.querySelector('details.module-reference-picker');
        details.replaceWith(expanded);
        bindReferencePicker(picker, {paint: hydrateModuleComponents});
        expanded.open = true;
        void hydrateModuleComponents(expanded);
      }, {once: true});
      return;
    }
    bindReferencePicker(picker, {paint: hydrateModuleComponents});
    const menu = picker.querySelector("details.module-reference-picker");
    if (!menu || menu.dataset.itemPreviewBound === "1") return;
    menu.dataset.itemPreviewBound = "1";
    menu.addEventListener("toggle", () => {
      if (menu.open) void hydrateModuleComponents(menu);
    });
  });
}

// @editor-module CHR 上下文共用的图块选择与矩阵控件。
//
// 消费页只交入 context reference 与 tile reference，并接回同形状引用。候选枚举、
// context 切换、像素解析和 selector 编码全留在 owner 边界内。


const ELEMENT_NAME = "attack-chr-tile-selector";
const configurations = new WeakMap();
const GRAYS = Object.freeze([
  [24, 28, 31, 255],
  [104, 114, 120, 255],
  [184, 194, 198, 255],
  [248, 250, 250, 255],
]);


function dialogOpen(dialog) {
  return Boolean(dialog?.open || dialog?.hasAttribute?.("open"));
}

function showDialog(dialog) {
  if (!dialog || dialogOpen(dialog)) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog || !dialogOpen(dialog)) return;
  if (typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new Event("close"));
  }
}

function paintPixels(canvas, resolved) {
  const context = canvas?.getContext?.("2d");
  if (!context) return;
  canvas.width = 8;
  canvas.height = 8;
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(8, 8);
  const palette = Array.isArray(resolved.palette) && resolved.palette.length === 4
    ? resolved.palette : null;
  for (let index = 0; index < 64; index += 1) {
    const pixel = Number(resolved.pixels[index]) & 3;
    const color = resolved.transparent || (!resolved.opaque && palette && pixel === 0) ? [0, 0, 0, 0]
      : palette ? [...nesPalette[palette[pixel] & 0x3f], 255] : GRAYS[pixel];
    image.data.set(color, index * 4);
  }
  context.putImageData(image, 0, 0);
  canvas.dataset.attackChrTilePainted = "1";
  canvas.classList.toggle("transparent", Boolean(resolved.transparent));
}

function currentContext(config) {
  return config.contexts[config.contextIndex] || null;
}

function paintMatrix(element) {
  const config = configurations.get(element);
  const context = currentContext(config);
  if (!config || !context) return;
  element.querySelectorAll("canvas[data-attack-chr-matrix-tile]").forEach(canvas => {
    const index = Number(canvas.dataset.attackChrMatrixTile);
    try {
      paintPixels(
        canvas,
        config.adapter.pixels(context, config.references[index]),
      );
      delete canvas.dataset.attackChrTileError;
    } catch (error) {
      canvas.dataset.attackChrTileError = String(error?.message || error);
    }
  });
}

function matrixMarkup(config) {
  return `<div class="attack-chr-tile-matrix" data-attack-chr-tile-matrix
      style="display:grid;grid-template-columns:repeat(${config.columns},minmax(30px,42px));gap:5px">
    ${config.references.map((_, index) => `<button type="button"
      class="attack-chr-tile-cell" data-attack-chr-tile-cell="${index}"
      aria-label="编辑画面格 ${index + 1}" ${config.disabled ? "disabled" : ""}
      style="padding:3px;aspect-ratio:1;min-width:0">
        <canvas data-attack-chr-matrix-tile="${index}" width="8" height="8"
          style="width:100%;height:100%;image-rendering:pixelated"></canvas>
      </button>`).join("")}
  </div>`;
}

function render(element) {
  const config = configurations.get(element);
  if (!config) {
    element.innerHTML = "";
    return;
  }
  element.dataset.attackChrTileCount = String(config.references.length);
  element.dataset.attackChrContextCount = String(config.contexts.length);
  element.dataset.attackChrColumns = String(config.columns);
  element.dataset.attackChrRows = String(config.rows);
  element.innerHTML = `<div class="attack-chr-tile-selector-toolbar"
      style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
    ${config.contexts.length > 1 ? `<label>像素上下文
      <select data-attack-chr-context ${config.disabled ? "disabled" : ""}>${
        config.contexts.map((_, index) => `<option value="${index}" ${
          index === config.contextIndex ? "selected" : ""
        }>${esc(config.contextLabels?.[index] ?? `实机画面 ${index + 1}`)}</option>`).join("")
      }</select></label>` : ""}
    <small data-attack-chr-selector-status></small>
  </div>
  ${matrixMarkup(config)}
  <dialog class="animated-resource-dialog" data-attack-chr-tile-dialog>
    <form class="animated-resource-toolbar" method="dialog">
      <b>选择当前上下文中的图块</b>
      <input type="search" data-attack-chr-filter aria-label="搜索图块" placeholder="搜索图块编号">
      <button class="button ghost" type="submit" value="cancel">关闭</button>
    </form>
    <nav class="module-reference-picker-groups" data-attack-chr-groups aria-label="图块分组"></nav>
    <div data-attack-chr-tile-candidates role="listbox"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:3px;
        max-height:min(70vh,620px);overflow:auto;padding:8px"></div>
  </dialog>`;
  bind(element);
  paintMatrix(element);
}

function renderCandidates(element) {
  const config = configurations.get(element);
  const host = element.querySelector("[data-attack-chr-tile-candidates]");
  const context = currentContext(config);
  if (!config || !host || !context) return;
  const contextKey = config.adapter.key(context);
  if (host.dataset.attackChrContextKey === contextKey && host.childElementCount) return;
  host.replaceChildren();
  host.dataset.attackChrContextKey = contextKey;
  const candidates = config.adapter.candidates(context);
  const selected = config.references[config.selectedIndex];
  const groups = element.querySelector("[data-attack-chr-groups]");
  groups.replaceChildren();
  const all = document.createElement("button");
  all.type = "button";
  all.dataset.attackChrGroup = "";
  all.textContent = "全部";
  groups.append(all);
  for (let first = 0; first < candidates.length; first += 16) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.attackChrGroup = String(first / 16);
    button.textContent = `${first}–${Math.min(first + 15, candidates.length - 1)}`;
    groups.append(button);
  }
  groups.hidden = candidates.length <= 16;
  candidates.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attack-chr-tile-candidate";
    button.dataset.attackChrTileToken = config.adapter.token(candidate.reference);
    button.dataset.attackChrTileIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute(
      "aria-selected",
      String(config.adapter.equal(candidate.reference, selected)),
    );
    button.setAttribute("aria-label", `图块候选 ${config.adapter.token(candidate.reference)}`);
    button.style.cssText = "padding:2px;width:34px;height:34px";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;image-rendering:pixelated";
    paintPixels(canvas, candidate);
    button.append(canvas);
    host.append(button);
  });
  element.dataset.attackChrCandidateCount = String(candidates.length);
  config.showPreview = bindPickerPreview(host, {selector: '[data-attack-chr-tile-token]',
    selected: () => host.querySelector(`[data-attack-chr-tile-token="${CSS.escape(config.adapter.token(config.references[config.selectedIndex]))}"]`),
    onConfirm: button => selectCandidate(element, button.dataset.attackChrTileToken), render: button => {
    const preview = document.createElement('div');
    const label = document.createElement('b');
    label.textContent = button.getAttribute('aria-label');
    const canvas = document.createElement('canvas');
    paintPixels(canvas, candidates[Number(button.dataset.attackChrTileIndex)]);
    preview.append(label, canvas);
    return preview;
  }, initial: host.querySelector('[aria-selected="true"]') || host.firstChild});
}

function filterCandidates(element) {
  const query = element.querySelector("[data-attack-chr-filter]")?.value.trim().toLowerCase() || "";
  const group = element.dataset.attackChrGroup || "";
  element.querySelectorAll("[data-attack-chr-tile-token]").forEach(button => {
    button.hidden = Boolean((group && String(Math.floor(Number(button.dataset.attackChrTileIndex) / 16)) !== group)
      || (query && !`${button.dataset.attackChrTileIndex} ${button.dataset.attackChrTileToken}`.toLowerCase().includes(query)));
  });
  const options = [...element.querySelectorAll('[data-attack-chr-tile-token]')].filter(button => !button.hidden);
  void configurations.get(element).showPreview?.(options.find(button => button.getAttribute('aria-selected') === 'true')
    || options[0]);
}

function openForCell(element, index) {
  const config = configurations.get(element);
  if (!config || config.disabled || !Number.isInteger(index)
      || index < 0 || index >= config.references.length) return;
  config.selectedIndex = index;
  const status = element.querySelector("[data-attack-chr-selector-status]");
  if (status) status.textContent = `正在编辑画面格 ${index + 1}`;
  renderCandidates(element);
  markPickerSelection(element.querySelectorAll('[data-attack-chr-tile-token]'),
    config.adapter.token(config.references[index]), button => button.dataset.attackChrTileToken);
  element.dataset.attackChrGroup = "";
  const filter = element.querySelector("[data-attack-chr-filter]");
  if (filter) filter.value = "";
  filterCandidates(element);
  showDialog(element.querySelector("[data-attack-chr-tile-dialog]"));
}

function selectCandidate(element, token) {
  const config = configurations.get(element);
  if (!config || config.disabled) return;
  const candidate = config.adapter.candidates(currentContext(config))
    .find(item => config.adapter.token(item.reference) === token);
  if (!candidate) throw new TypeError("所选 tile 不在 shared-chr-bank owner 候选中");
  config.references[config.selectedIndex] = config.adapter.clone(candidate.reference);
  closeDialog(element.querySelector("[data-attack-chr-tile-dialog]"));
  render(element);
  element.dispatchEvent(new CustomEvent("change", {
    bubbles: true,
    detail: {references: config.references.map(config.adapter.clone)},
  }));
}

function bind(element) {
  element.querySelector("[data-attack-chr-filter]")?.addEventListener("input", () => filterCandidates(element));
  element.querySelector("[data-attack-chr-groups]")?.addEventListener("click", event => {
    const button = event.target.closest("[data-attack-chr-group]");
    if (!button) return;
    element.dataset.attackChrGroup = button.dataset.attackChrGroup;
    filterCandidates(element);
  });
  element.querySelector("[data-attack-chr-tile-dialog]")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeDialog(event.currentTarget);
  });
  element.querySelector("[data-attack-chr-context]")?.addEventListener(
    "change",
    event => {
      const config = configurations.get(element);
      const index = Number(event.target.value);
      if (!config || !Number.isInteger(index) || !config.contexts[index]) return;
      config.contextIndex = index;
      paintMatrix(element);
      const candidates = element.querySelector("[data-attack-chr-tile-candidates]");
      if (candidates) candidates.replaceChildren();
    },
  );
  element.querySelector("[data-attack-chr-tile-matrix]")?.addEventListener(
    "click",
    event => {
      const cell = event.target.closest?.("[data-attack-chr-tile-cell]");
      if (cell) openForCell(element, Number(cell.dataset.attackChrTileCell));
    },
  );
}

const HTMLElementBase = globalThis.HTMLElement || class {};

class AttackChrTileSelector extends HTMLElementBase {
  connectedCallback() {
    render(this);
  }

  get references() {
    const config = configurations.get(this);
    return config ? config.references.map(config.adapter.clone) : [];
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, AttackChrTileSelector);
}


/**
 * 通用入口只接收 owner 给出的不透明引用及操作；选择器本身不解释 context 或 tile。
 * 攻击专页继续走上面的旧包装，因此它的 DOM 合同和 owner 边界均保持不变。
 */
function configureChrContextTileSelector(element, {
  contexts,
  references,
  columns,
  rows,
  adapter,
  contextLabels = null,
  contextIndex = 0,
  disabled = false,
} = {}) {
  if (!element?.matches?.(ELEMENT_NAME)) {
    throw new TypeError(`${ELEMENT_NAME} element is required`);
  }
  const width = Number(columns);
  const height = Number(rows);
  const requiredOperations = ["clone", "key", "equal", "token", "candidates", "pixels"];
  if (!adapter || requiredOperations.some(name => typeof adapter[name] !== "function")
      || !Number.isInteger(width) || width < 1 || width > 8
      || !Number.isInteger(height) || height < 1 || height > 8
      || !Array.isArray(references) || references.length !== width * height
      || !Array.isArray(contexts) || !contexts.length) {
    throw new TypeError("CHR tile 矩阵的形状、不透明引用或 owner 操作无效");
  }
  if (!Number.isInteger(contextIndex) || contextIndex < 0 || contextIndex >= contexts.length) {
    throw new TypeError("CHR tile 矩阵的上下文序号无效");
  }
  if (contextLabels !== null && (!Array.isArray(contextLabels)
      || contextLabels.length !== contexts.length
      || contextLabels.some(label => typeof label !== "string" || !label))) {
    throw new TypeError("CHR tile 矩阵的上下文标签必须与上下文一一对应");
  }
  contexts.forEach(context => adapter.pixels(context, references[0]));
  references.forEach(reference => adapter.pixels(contexts[0], reference));
  configurations.set(element, {
    contexts: contexts.map(adapter.clone),
    contextLabels: contextLabels === null ? null : [...contextLabels],
    references: references.map(adapter.clone),
    columns: width,
    rows: height,
    contextIndex,
    selectedIndex: 0,
    disabled: Boolean(disabled),
    adapter: Object.freeze({...adapter}),
  });
  render(element);
  return element;
}

/** 换掉当前值的引用而保留所选上下文：字段值在别处改变时只重画这一格。 */
function setChrContextTileReferences(element, references) {
  const config = configurations.get(element);
  if (!config) throw new TypeError("CHR tile 矩阵尚未配置");
  if (!Array.isArray(references) || references.length !== config.references.length) {
    throw new TypeError("CHR tile 矩阵的引用数与其形状不符");
  }
  const next = references.map(config.adapter.clone);
  next.forEach(reference => config.adapter.pixels(config.contexts[config.contextIndex], reference));
  next.forEach((reference, index) => {config.references[index] = reference;});
  render(element);
  return element;
}

export { configureChrContextTileSelector, hydrateItemPickers, itemPickerFieldMarkup, itemPickerMarkup, setChrContextTileReferences };
