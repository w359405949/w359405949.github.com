// @editor-module 数据网格：列宽由列声明决定，长内容在单元格内换行。
// 列宽总和决定表格最小宽度，放不下时横向滚动。

import {clearAutoSaveErrorsOf} from "../core/auto-save.js";
import {esc} from "../core/dom.js";
import {setTableStatus} from "./shell.js";

const DEFAULT_COLUMN_WIDTH = 120;
const virtualTables = new Map();
const virtualTableBindings = new WeakMap();
const VIRTUAL_WINDOW = 18;
const VIRTUAL_ROW_HEIGHT = 52;

function columnWidth(column) {
  const declared = Number(column.width);
  return Number.isFinite(declared) && declared > 0
    ? declared
    : DEFAULT_COLUMN_WIDTH;
}
function contentWidth(value) {
  return Array.from(String(value ?? "")).reduce((total, character) =>
    total + (character.codePointAt(0) > 0xff ? 12 : 8), 24);
}

function fitColumn(column, rows) {
  if (!column.fit || column.width !== undefined || column.sticky) return column;
  let width = contentWidth(column.label);
  for (const row of rows) {
    width = Math.max(width, contentWidth(column.fitValue?.(row) ?? row[column.key]));
    if (width >= 240) break;
  }
  return {...column, width: Math.max(48, Math.min(240, width))};
}
/** 列定义 → <colgroup>，让宽度由列声明而不是内容决定。 */
function columnGroup(columns) {
  const declaredGrow = columns.findIndex(column => column.grow && !column.sticky);
  const growIndex = declaredGrow >= 0 ? declaredGrow : columns.reduce((selected, column, index) =>
    !column.sticky && (selected < 0
      || columnWidth(column) >= columnWidth(columns[selected])) ? index : selected, -1);
  return `<colgroup>${columns.map((column, index) =>
    index === growIndex ? "<col>" : `<col style="width:${columnWidth(column)}px">`
  ).join("")}</colgroup>`;
}

function tableMinWidth(columns) {
  return columns.reduce((total, column) => total + columnWidth(column), 0);
}

function headerCell(column, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  return `<th${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}
    ${column.title ? `title="${esc(column.title)}"` : ""}${column.reset ? ' aria-label="恢复原值"' : ''}>${esc(column.label)}</th>`;
}

// 前置固定列的偏移由前面几列的宽度累加。固定列应显式给 width；漏写时也要
// 使用统一兜底，否则浏览器无法在横向滚动时把它们钉住。
let stickyWidths = [];
function stickyOffset(index) {
  return stickyWidths.slice(0, index).reduce((total, width) => total + width, 0);
}

function bodyCell(column, row, index) {
  const classes = [
    column.reset ? "reset-column" : "",
    column.mono ? "mono" : "",
    column.align === "right" ? "right" : "",
    column.wrap ? "wrap" : "",
    column.sticky ? "sticky-col" : "",
  ].filter(Boolean).join(" ");
  const content = column.cell
    ? column.cell(row)
    : esc(row[column.key] ?? "");
  return `<td${classes ? ` class="${classes}"` : ""}
    ${column.sticky ? `style="left:${stickyOffset(index)}px"` : ""}>${content}</td>`;
}

/**
 * 不要在视图 CSS 里给表格补最小宽度：那会复制并漂移列定义。表被压扁时，
 * 请在 columns 的对应列声明 width；这里是汇总列宽并把最小宽度落到表格的唯一入口。
 */
export function dataTable({
  columns,
  rows,
  renderRow = null,
  rowId = row => row.id,
  recordRoute = null,
  selectedId = null,
  empty = "没有匹配的记录",
  total = null,
  dirty = 0,
  reportStatus = true,
  virtualKey = null,
}) {
  // 行数报给状态栏。以前每页顶部都用一个大字方块说「N 条记录」——表格自己就在
  // 显示这件事，方块只是把工作区往下推。
  if (reportStatus) setTableStatus(rows.length, total === null ? rows.length : total, {dirty});
  const visible = columns.filter(column => column.hidden !== true)
    .map(column => fitColumn(column, rows));
  const widths = visible.map(column =>
    column.sticky ? columnWidth(column) : 0);
  stickyWidths = widths;
  const minWidth = tableMinWidth(visible);
  const rowHtml = row => {
    stickyWidths = widths;
    const id = rowId(row);
    const route = recordRoute ? recordRoute(row) : null;
    if (renderRow) return renderRow(row);
    return `<tr data-row-id="${esc(id)}"
      ${route ? `data-record-link="${esc(route)}"` : ""}
      ${String(id) === String(selectedId) ? 'aria-selected="true"' : ""}
    >${visible.map((column, index) => bodyCell(column, row, index)).join("")}</tr>`;
  };
  if (virtualKey !== null) virtualTables.set(virtualKey, {rows, rowHtml, columns: visible.length});
  if (!rows.length) {
    return `<div class="table-wrap"><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
      <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
      <tbody><tr><td class="table-empty" colspan="${visible.length}">${esc(empty)}</td></tr></tbody>
    </table></div>`;
  }
  return `<div class="table-wrap${virtualKey !== null ? ' virtual-table-wrap' : ''}"${virtualKey !== null ? ` data-virtual-table="${esc(virtualKey)}"` : ''}><table class="data-table" style="min-width:${minWidth}px;table-layout:fixed">${columnGroup(visible)}
    <thead><tr>${visible.map(headerCell).join("")}</tr></thead>
    <tbody>${(virtualKey !== null ? rows.slice(0, VIRTUAL_WINDOW) : rows).map(rowHtml).join("")}${virtualKey !== null ? spacer(rows.length - VIRTUAL_WINDOW, visible.length, VIRTUAL_ROW_HEIGHT) : ''}</tbody>
  </table></div>`;
}

function spacer(count, columns, height) {
  return count > 0 ? `<tr class="virtual-table-spacer" data-virtual-count="${count}" aria-hidden="true"><td colspan="${columns}" style="height:${count * height}px"></td></tr>` : '';
}

export function bindVirtualTables(root, open, afterRowsMounted = () => {}) {
  virtualTableBindings.get(root)?.();
  const cleanups = [];
  virtualTableBindings.set(root, () => cleanups.forEach(cleanup => cleanup()));
  root.querySelectorAll('[data-virtual-table]').forEach(wrap => {
    const source = virtualTables.get(wrap.dataset.virtualTable);
    if (!source) return;
    const view = wrap.ownerDocument.defaultView;
    let scroller = wrap.parentElement;
    while (scroller && !/^(auto|scroll|overlay)$/u.test(view.getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    scroller ||= wrap.ownerDocument.scrollingElement;
    const scrollTarget = scroller === wrap.ownerDocument.scrollingElement ? view : scroller;
    const body = wrap.querySelector('tbody');
    let first = 0;
    let mountedCount = Math.min(source.rows.length, VIRTUAL_WINDOW);
    let rowHeight = VIRTUAL_ROW_HEIGHT;
    let pinnedBottom = false;
    const measure = () => {
      const heights = [...body.querySelectorAll('tr[data-row-id]')]
        .map(row => row.getBoundingClientRect().height).filter(height => height > 0)
        .sort((left, right) => left - right);
      const measured = heights[Math.floor(heights.length / 2)];
      if (!measured || Math.abs(measured - rowHeight) < 1) return;
      rowHeight = measured;
      body.querySelectorAll('.virtual-table-spacer').forEach(row => {
        row.firstElementChild.style.height = `${Number(row.dataset.virtualCount) * rowHeight}px`;
      });
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    const observer = new ResizeObserver(() => {measure(); update();});
    const observeRows = () => {
      observer.disconnect();
      observer.observe(scroller);
      body.querySelectorAll('tr[data-row-id]').forEach(row => observer.observe(row));
    };
    const update = () => {
      if (!wrap.isConnected) return;
      const viewportTop = scrollTarget === view ? 0
        : scroller.getBoundingClientRect().top + scroller.clientTop;
      const viewportHeight = scrollTarget === view ? view.innerHeight : scroller.clientHeight;
      const offset = Math.max(0, viewportTop - body.getBoundingClientRect().top);
      pinnedBottom = scroller.scrollTop > 0
        && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      const count = Math.min(source.rows.length, Math.max(VIRTUAL_WINDOW,
        Math.ceil(viewportHeight / rowHeight) + 8));
      const next = Math.min(Math.max(0, Math.floor(offset / rowHeight) - 4),
        Math.max(0, source.rows.length - count));
      if (next === first && count === mountedCount) return;
      first = next;
      mountedCount = count;
      body.innerHTML = spacer(first, source.columns, rowHeight)
        + source.rows.slice(first, first + count).map(source.rowHtml).join('')
        + spacer(source.rows.length - first - count, source.columns, rowHeight);
      observeRows();
      bindRecordLinks(body, open);
      wrap.dispatchEvent(new CustomEvent('virtual-table-rows', {bubbles: true}));
      afterRowsMounted(wrap);
      if (pinnedBottom) scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    };
    observeRows();
    scrollTarget.addEventListener('scroll', update, {passive: true});
    view.addEventListener('resize', update);
    cleanups.push(() => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', update);
      view.removeEventListener('resize', update);
    });
    update();
  });
}

/**
 * 行点击 → 记录页。只在没点到交互元件时触发，否则表内编辑会被劫持。
 */
export function bindRecordLinks(root, open) {
  root.querySelectorAll("tr[data-record-link]").forEach(row => {
    row.addEventListener("click", event => {
      if (event.target.closest("input, select, textarea, button, a, label, details, summary")) return;
      open(row.dataset.recordLink, row.dataset.rowId);
    });
  });
}

/** 单元格里的次要说明。默认与主值同一行，避免把行高撑成两三倍。 */
function sub(text) {
  return text ? `<small>${esc(text)}</small>` : "";
}

/** 主值 + 次要说明的标准组合。 */
function primary(value, note = "") {
  return `<div class="table-cell-stack"><b>${esc(value)}</b>${sub(note)}</div>`;
}

/** Standard action cell for restoring one persisted record to its original. */
export function resetToOriginalButton(itemId, {
  title = "只恢复这一项；同一资源中的其他编辑会保留",
  disabled = false,
  dirty = null,
  label = null,
  attributes = {},
  ...unsupported
} = {}) {
  if (Object.keys(unsupported).length) {
    throw new TypeError(`Unsupported reset options: ${Object.keys(unsupported).join(", ")}`);
  }
  if (itemId === undefined || itemId === null || itemId === "") {
    throw new TypeError("itemId is required");
  }
  const knownDirty = typeof dirty === "boolean";
  const isDisabled = disabled || (label === null ? dirty !== true : dirty === false);
  const extra = Object.entries(attributes).map(([name, value]) => {
    if (!/^data-[a-z0-9-]+$/u.test(name) || name === 'data-reset-to-original')
      throw new TypeError(`Unsupported reset attribute: ${name}`);
    return `${name}="${esc(String(value))}"`;
  }).join(' ');
  const hint = `恢复原值：${title}`;
  return `<button class="button ghost reset-to-original${label === null ? " reset-icon" : ""}${dirty === true ? " dirty" : ""}" type="button"
    data-reset-to-original="${esc(String(itemId))}"
    ${knownDirty ? `data-original-dirty="${dirty}"` : ""}
    ${extra} aria-label="${esc(label ?? hint)}" title="${esc(hint)}" ${isDisabled ? "disabled" : ""}>${label === null ? '<span aria-hidden="true">↺</span>' : esc(label)}</button>`;
}

/** Apply a batch selectionStates result without issuing per-row DB reads. */
export function applyResetToOriginalStates(root, states, {busy = false} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (!states || typeof states !== "object") {
    throw new TypeError("states must be an object or Map");
  }
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    const key = button.dataset.resetToOriginal;
    const dirty = states instanceof Map ? states.get(key) : states[key];
    if (typeof dirty !== "boolean") return;
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle("dirty", dirty);
    button.disabled = busy || !dirty;
  });
}

/**
 * Bind every standard per-item reset button below root.  Pages own projection
 * refresh and error messaging; this helper centralizes confirmation and the
 * in-flight disabled state.
 */
export function bindResetToOriginalButtons(root, onReset, {
  confirmMessage = null,
  states = null,
  busy = false,
} = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    throw new TypeError("root must be a DOM container");
  }
  if (typeof onReset !== "function") {
    throw new TypeError("onReset must be callable");
  }
  if (states) applyResetToOriginalStates(root, states, {busy});
  root.querySelectorAll("[data-reset-to-original]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled || button.dataset.resetPending === "true") return;
      button.resetCompletion = (async () => {
        const itemId = button.dataset.resetToOriginal;
        const question = typeof confirmMessage === "function"
          ? confirmMessage(itemId, button)
          : confirmMessage;
        if (question && typeof globalThis.confirm === "function" &&
            !globalThis.confirm(question)) return;
        button.dataset.resetPending = "true";
        button.setAttribute("aria-busy", "true");
        button.disabled = true;
        try {
          await onReset(itemId, button);
        } finally {
          if (button.isConnected) {
            delete button.dataset.resetPending;
            button.removeAttribute("aria-busy");
            button.disabled = button.dataset.originalDirty === "false";
          }
        }
      })();
      return button.resetCompletion;
    });
  });
}

/** Field hosts use the standard control and delegate deletion to the field object. */
export function bindFieldResetToOriginalButtons(root, fields, {
  beforeReset = null, afterReset = null, database = null, resourceId = null,
  changesFor = null, confirmMessage = null, onError = null,
  dirtyFor = selection => (Array.isArray(selection) ? selection : [selection])
    .some(field => field.hasOverride),
} = {}) {
  if (!(fields instanceof Map)) throw new TypeError("fields must be a Map");
  for (const button of root.querySelectorAll('[data-reset-to-original]')) {
    const selection = fields.get(button.dataset.resetToOriginal);
    const selected = Array.isArray(selection) ? selection : [selection];
    if (!selected.length || selected.some(field => !field || typeof field.bind !== 'function')) continue;
    const refresh = () => applyResetToOriginalStates(button.parentElement,
      new Map([[button.dataset.resetToOriginal, dirtyFor(selection)]]),
      {busy: button.dataset.resetPending === 'true'});
    let initializing = true;
    for (const field of selected) field.bind(button, () => {
      if (!initializing) refresh();
    });
    initializing = false;
    refresh();
  }
  bindResetToOriginalButtons(root, async key => {
    try {
      const selection = fields.get(key);
      const selected = Array.isArray(selection) ? selection : [selection];
      if (!selected.length || selected.some(field => !field || typeof field.reset !== "function")) {
        throw new TypeError(`未绑定重置字段：${key}`);
      }
      const context = await beforeReset?.(selection);
      // 版本只在调用方点名要固定时才传；其余交给字段层在写入那一刻取。
      const version = context?.expectedVersion;
      const saved = database ? await resetFieldObjectChanges(database,
        changesFor?.(selection, context) ??
          selected.map(field => ({field, reset: true, ...context?.fieldOptions})),
        {expectedVersion: version, resourceId, key}) : null;
      if (!database) for (const field of selected)
        await field.reset({...context?.fieldOptions, expectedVersion: version});
      // 只有恢复 Origin 真的成功才解除这一处失败；同一处可能同时挂在别的链上。
      // 失败的重置不动任何失败——原来那处保存失败要继续报。
      if (!database) clearAutoSaveErrorsOf(resetScopesOf(selection, key));
      await afterReset?.(selection, context, saved);
    } catch (error) {
      if (!onError) throw error;
      onError(error);
    }
  }, {confirmMessage});
}

/** Commit one atomic field-object reset batch and optionally reload its resource. */
async function resetFieldObjectChanges(database, changes, {
  expectedVersion = undefined, resourceId = null, key = null,
} = {}) {
  if (!Array.isArray(changes) || !changes.length ||
      changes.some(change => !change?.field || (change.reset !== true && !('value' in change))))
    throw new TypeError('字段对象重置批次无效');
  await database.writeFields(changes, {expectedVersion});
  clearAutoSaveErrorsOf(resetScopesOf(changes.map(change => change.field), key));
  return resourceId ? database.readResource(resourceId) : undefined;
}

// 重置的解除范围：这一处的字段与它们所属资源（旧入口按资源记账）。
function resetScopesOf(selection, key) {
  const selected = Array.isArray(selection) ? selection : [selection];
  const scopes = [key];
  for (const field of selected) {
    if (!field) continue;
    scopes.push(field);
    if (field.resourceId !== undefined) scopes.push(field.resourceId);
  }
  return scopes;
}
