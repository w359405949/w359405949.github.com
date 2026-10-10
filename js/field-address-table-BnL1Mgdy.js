import { nesPalette, esc, expandResourceByteRangeSlots } from './interface-state-preview-Dlotqlmn.js';
import { markPickerSelection, bindPickerConfirmation } from './timeline-player-YCH7Y-3h.js';
import { dataTable, setStatus } from './battle-result-script-runtime-BSeJpUGH.js';

// @editor-module NES 颜色的唯一呈现出口
//
// 「把一个 0..$3F 的色号画成一块颜色」这件事，全项目此前有六处各写一遍
// （怪物调色板、精灵调色板、视觉引用、战斗列表、调色板作者页，还有一处新加的），
// 每处自己算 `nesPalette[id]`、自己拼 `background:rgb(...)`、自己决定标不标色号。
// 取色格更明显：`boot-presentation` 写了一份，`attack-stage-catalog` 直接借用了
// 它的 CSS 类名——**样式已经在共用，代码却没有**。收在这里。
//
// 这里只管「画成什么样」。**哪些色号属于哪条记录、改了写回哪个模块，都不在这**——
// 那是各 owner 自己的事，收进来就会变成第二处调色板语义。


if (typeof document !== "undefined") {
  const choices = new WeakMap();
  const preview = cell => {
    const detail = cell.closest('.nes-colour-choice')?.querySelector('.picker-candidate-preview');
    if (!detail) return;
    const index = Number(cell.dataset.nesColourIndex);
    detail.innerHTML = `<b>${nesColorHex(index)}</b><span class="nes-colour-preview" style="background:${nesColorCss(index)}"></span>`;
  };
  const bind = details => {
    if (choices.has(details)) return choices.get(details);
    const state = {pending: details.querySelector('.is-current'), confirmation: null};
    choices.set(details, state);
    state.confirmation = bindPickerConfirmation(details, {
      host: details.querySelector('.nes-colour-choice-panel'),
      canConfirm: () => Boolean(state.pending && !state.pending.disabled),
      onOpen: () => {
        state.pending = details.querySelector('.is-current');
        markPickerSelection(details.querySelectorAll('[data-nes-colour-index]'), true,
          cell => cell === state.pending);
        if (state.pending) preview(state.pending);
      },
      confirm: () => state.pending.dispatchEvent(new Event('nes-colour-confirm', {bubbles: true})),
    });
    return state;
  };
  document.addEventListener('toggle', event => {
    if (event.target.matches?.('.nes-colour-choice') && event.target.open) bind(event.target);
  }, true);
  for (const eventName of ['click', 'focusin']) document.addEventListener(eventName, event => {
    const cell = event.target.closest?.('[data-nes-colour-index]');
    if (!cell || cell.disabled) return;
    const details = cell.closest('.nes-colour-choice');
    const state = bind(details);
    state.pending = cell;
    markPickerSelection(details.querySelectorAll('[data-nes-colour-index]'), true, option => option === cell);
    state.confirmation.refresh();
    preview(cell);
  });
  const filter = details => {
    const query = details.querySelector("[data-nes-colour-search]")?.value.trim().toLowerCase() || "";
    const group = details.dataset.nesColourGroup || "";
    details.querySelectorAll("[data-nes-colour-index]").forEach(cell => {
      const index = Number(cell.dataset.nesColourIndex);
      cell.hidden = Boolean((group && Math.floor(index / 16) !== Number(group))
        || (query && !`${index} ${nesColorHex(index).toLowerCase()}`.includes(query)));
    });
  };
  document.addEventListener("input", event => {
    if (event.target.matches?.("[data-nes-colour-search]")) filter(event.target.closest(".nes-colour-choice"));
  });
  document.addEventListener("click", event => {
    const group = event.target.closest?.("[data-nes-colour-group]");
    if (group) {
      const details = group.closest(".nes-colour-choice");
      details.dataset.nesColourGroup = group.dataset.nesColourGroup;
      details.querySelectorAll("[data-nes-colour-group]").forEach(button =>
        button.setAttribute("aria-pressed", String(button === group)));
      filter(details);
    }
  });
}

const NES_COLOR_MAX = 0x3f;

function nesColorIndex(value) {
  return Number(value) & NES_COLOR_MAX;
}

function nesColorHex(value) {
  return `$${nesColorIndex(value).toString(16).toUpperCase().padStart(2, "0")}`;
}

/** `rgb(r, g, b)`。**只此一处**——空格式与逗号式混用过，比对样式时很难发现。 */
function nesColorCss(value) {
  const [red, green, blue] = nesPalette[nesColorIndex(value)] || [0, 0, 0];
  return `rgb(${red}, ${green}, ${blue})`;
}

/**
 * 一条色块。
 *
 * 尺寸交给 CSS：调用方给 `className`，样式写在自己那一节。以前各处把宽高写死在
 * 行内（6×12 / 10×14 / 13×13），换一处就得翻三个文件。
 *
 * `label` 给了就是有意义的图形（`aria-label`），不给就是纯装饰（`aria-hidden`）——
 * 一串没有名字的色块对读屏来说只是噪音。
 */
function paletteSwatches(colors, {
  className = "palette-swatches",
  swatchClassName = "",
  label = "",
  swatchAttributes = () => "",
} = {}) {
  const values = Array.isArray(colors) ? colors : [];
  return `<span class="${esc(className)}" ${
    label ? `aria-label="${esc(label)}"` : 'aria-hidden="true"'
  }>${values.map((value, index) => {
    const extra = String(swatchAttributes(value, index) || "");
    return `<i ${swatchClassName ? `class="${esc(swatchClassName)}" ` : ""}style="--swatch:${
      nesColorCss(value)}" title="${nesColorHex(value)}" ${extra}></i>`;
  }).join("")}</span>`;
}

/**
 * 64 色取色格，按 PPU 的 16×4 排布。
 *
 * `pickAttribute` 是每一格上携带色号的属性名——各页的事件委托认的是自己的属性，
 * 不统一成一个名字，是因为一页上可能同时开着好几个取色格，靠属性名区分归谁管。
 */
function nesColorGrid({
  current = null,
  pickAttribute = "data-nes-colour-pick",
  gridAttributes = "",
  cellAttributes = () => "",
} = {}) {
  const selected = current === null || current === undefined
    ? null : nesColorIndex(current);
  return `<details class="nes-colour-choice" open>
    <summary>${selected === null ? "选择 NES 颜色" : `NES 颜色 ${nesColorHex(selected)}`}</summary>
    <div class="nes-colour-choice-panel">
      <label class="module-reference-picker-filter">搜索色号
        <input type="search" data-nes-colour-search placeholder="十进制或 $ 十六进制"></label>
      <nav class="module-reference-picker-groups" aria-label="颜色分组">
        <button type="button" data-nes-colour-group="" aria-pressed="true">全部</button>
        ${[0, 1, 2, 3].map(group => `<button type="button" data-nes-colour-group="${group}"
          aria-pressed="false">$${(group * 16).toString(16).toUpperCase()}–$${(group * 16 + 15).toString(16).toUpperCase()}</button>`).join("")}
      </nav>
      <div class="picker-candidates-body"><div class="nes-colour-grid" ${gridAttributes}>${
    nesPalette.slice(0, NES_COLOR_MAX + 1).map((_rgb, index) => `<button type="button"
      class="nes-colour-cell${index === selected ? " is-current" : ""}"
      style="--swatch:${nesColorCss(index)}"
      data-nes-colour-index="${index}"
      role="option" aria-selected="${index === selected}"
      ${pickAttribute}="${index}" title="${nesColorHex(index)}"
      aria-label="NES 颜色 ${nesColorHex(index)}"
      ${String(cellAttributes(index) || "")}></button>`).join("")}</div>
      <div class="picker-candidate-preview">${selected === null ? '' : `<b>${nesColorHex(selected)}</b><span class="nes-colour-preview" style="background:${nesColorCss(selected)}"></span>`}</div></div>
    </div>
  </details>`;
}

// @editor-module 详情页字段值表与已登记物理片段的对账
//
// 字段定义与字节地图取并集；物理片段由记录页的折叠区显示。


function normalizedFieldDefinitions(fields) {
  if (!Array.isArray(fields)) {
    throw new TypeError("fields 必须是 [key, label] 或 {key, label} 的数组");
  }
  const keys = new Set();
  return fields.map(definition => {
    const key = String(Array.isArray(definition)
      ? definition[0] : definition?.key ?? "");
    if (!key) throw new TypeError("字段定义缺少 key");
    if (keys.has(key)) throw new TypeError(`字段定义重复：${key}`);
    keys.add(key);
    const rawLabel = Array.isArray(definition) ? definition[1] : definition?.label;
    return {key, label: String(rawLabel ?? key)};
  });
}

function normalizedFieldRoles(fieldRoles) {
  if (!Array.isArray(fieldRoles)) {
    throw new TypeError("fieldRoles 必须是 role 字符串数组");
  }
  const roles = new Set();
  for (const rawRole of fieldRoles) {
    const role = String(rawRole || "");
    if (!role) throw new TypeError("fieldRoles 不能包含空 role");
    if (roles.has(role)) throw new TypeError(`fieldRoles 重复：${role}`);
    roles.add(role);
  }
  return roles;
}

function declarationForRole(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

function slotLabel(range, declarations) {
  const declaration = declarationForRole(declarations, range.role);
  const declared = declaration?.label;
  if (typeof declared === "function") {
    return String(declared(range.slotIndex, range));
  }
  const base = String(declared || range.role || range.key);
  return range.slotIndex === null ? base : `${base} ${range.slotIndex + 1}`;
}

function rowFromRange(range, {key, label, origin, kind}) {
  return {
    key,
    label,
    origin,
    kind,
    role: range?.role || `field:${key}`,
    fieldKey: range?.fieldKey ?? (kind === "field" ? key : null),
    slotIndex: range?.slotIndex ?? null,
    hasRange: Boolean(range),
    address: range || null,
    space: range?.space || null,
    offset: range?.offset ?? null,
    length: range?.length ?? null,
    status: range?.status || null,
  };
}

/**
 * 对账字段定义与物理片段，并返回表格行。
 *
 * `fields` 保持调用方顺序；同 key 有多段地址时每段各占一行。范围侧独有的
 * `field:` 以及声明展开后的槽行接在其后。`valueFor(row)` 返回值单元格 HTML。
 * `fieldRoles` 可把调用方指定的非 `field:` role 按同名字段参与对账；默认不启用，
 * 原语本身不认识任何业务 role。
 */
function reconcileFieldAddressRows({
  uid,
  fields = [],
  fieldRoles = [],
  slotDeclarations = {},
  valueFor = () => null,
} = {}) {
  if (typeof valueFor !== "function") throw new TypeError("valueFor 必须是函数");
  const definitions = normalizedFieldDefinitions(fields);
  const declaredFieldRoles = normalizedFieldRoles(fieldRoles);
  const ranges = expandResourceByteRangeSlots(uid, slotDeclarations).map(range =>
    range.fieldKey === null && declaredFieldRoles.has(range.role)
      ? {...range, key: range.role, fieldKey: range.role}
      : range
  );
  const fieldRanges = ranges.filter(
    range => range.fieldKey !== null && range.slotIndex === null,
  );
  const otherRanges = ranges.filter(
    range => range.fieldKey === null || range.slotIndex !== null,
  );
  const rangesByField = new Map();
  for (const range of fieldRanges) {
    if (!rangesByField.has(range.fieldKey)) rangesByField.set(range.fieldKey, []);
    rangesByField.get(range.fieldKey).push(range);
  }

  const declaredKeys = new Set(definitions.map(definition => definition.key));
  const rows = [];
  for (const definition of definitions) {
    const matches = rangesByField.get(definition.key) || [];
    if (!matches.length) {
      rows.push(rowFromRange(null, {
        ...definition,
        origin: "definition",
        kind: "field",
      }));
      continue;
    }
    for (const range of matches) {
      rows.push(rowFromRange(range, {
        ...definition,
        origin: "definition+range",
        kind: "field",
      }));
    }
  }
  for (const range of fieldRanges) {
    if (declaredKeys.has(range.fieldKey)) continue;
    rows.push(rowFromRange(range, {
      key: range.fieldKey,
      label: range.fieldKey,
      origin: "range",
      kind: "field",
    }));
  }
  for (const range of otherRanges) {
    const label = slotLabel(range, slotDeclarations);
    const key = range.key || range.role;
    if (!key || !label) continue;
    rows.push(rowFromRange(range, {
      key,
      label,
      origin: "range",
      kind: range.slotIndex === null ? "range" : "slot",
    }));
  }

  return rows.map((row, index) => {
    const identified = {...row, id: `${row.kind}:${row.key}:${index}`};
    return {...identified, value: valueFor(identified)};
  });
}

function fieldCell(row) {
  const key = `<small class="mono">${esc(row.key)}</small>`;
  return `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
    <b>${esc(row.label)}</b>${row.label === row.key ? "" : key}
  </div>`;
}

function valueCell(row) {
  return row.value === null || row.value === undefined || row.value === ""
    ? '<span class="resource-empty">—</span>' : String(row.value);
}

function statusCell(row) {
  return row.hasRange
    ? `<span data-field-address-status="${esc(row.status || "未分级")}">${
      esc(row.status || "未分级")
    }</span>`
    : '<span class="resource-unregistered" data-field-address-status="未登记">未登记</span>';
}

const FIELD_ADDRESS_COLUMNS = [
  {key: "label", label: "字段", width: 190, sticky: true, cell: fieldCell},
  {key: "value", label: "值", width: 180, wrap: true, cell: valueCell},
  {key: "status", label: "状态", width: 110, cell: statusCell},
];

/**
 * 构造详情页字段地址表。
 *
 * `dataTable` 会把字段行数写成“记录数”；这对详情页是错误语义。因此表生成后用
 * 调用方给的 `pageStatus` 覆盖四个状态槽，默认全部清空，上一页状态也不会残留。
 * 已按用途分块的页面可传入 reconcileFieldAddressRows 的 rows 子集，其余行由各块展示。
 */
function fieldAddressTable({pageStatus = {}, rows = null, showStatus = true, ...options} = {}) {
  rows ??= reconcileFieldAddressRows(options);
  const markup = dataTable({
    columns: showStatus ? FIELD_ADDRESS_COLUMNS : FIELD_ADDRESS_COLUMNS.filter(column => column.key !== "status"),
    rows,
    rowId: row => row.id,
    empty: "没有字段或物理片段",
  });
  setStatus({...pageStatus, address: ""});
  return `<div class="field-address-table" data-field-address-table
    data-field-address-row-count="${rows.length}">${markup}</div>`;
}

export { fieldAddressTable, nesColorCss, nesColorGrid, paletteSwatches, reconcileFieldAddressRows };
