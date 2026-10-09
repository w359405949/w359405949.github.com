import { nesPalette, esc, markPickerSelection, bindPickerConfirmation, dataTable, setStatus } from './monster-figure-C07vG7yu.js';
import { physicalLocationMarkup } from './writeback-capabilities-CGLIL9l3.js';

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

// @editor-module 人物与战车共用的实体详情分组。


function entityDetailFieldTableMarkup({fields = [], pageStatus = null} = {}) {
  const has = key => fields.some(field => field[key] !== undefined);
  const columns = [
    {key: "label", label: "字段", width: 230, sticky: true,
      cell: field => field.labelMarkup || esc(field.label || field.id)},
    {key: "value", label: "当前值", width: 340, wrap: true,
      cell: field => field.valueMarkup ?? "—"},
    ...(has("resetMarkup") ? [{key: "reset", label: "", title: "恢复原值", width: 36, reset: true,
      cell: field => field.resetMarkup ?? ""}] : []),
  ];
  const markup = dataTable({reportStatus: false, rows: fields,
    rowId: field => field.id, columns});
  if (pageStatus) setStatus({...pageStatus, address: ""});
  return `<div class="entity-detail-field-table"${pageStatus
    ? ` data-field-address-table data-field-address-row-count="${fields.length}"` : ""}>${markup}</div>`;
}

const equipmentStyle = `<style>
  .record-grid > .entity-detail-page {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .entity-detail-page .entity-equipment-heading,
  .entity-detail-page .entity-equipment-row {
    grid-template-columns: 94px minmax(190px, 1.5fr) minmax(136px, 1fr) minmax(82px, .55fr) minmax(116px, auto);
    gap: 10px;
    min-width: 680px;
    padding: 6px 8px;
  }
  .entity-detail-page .entity-equipment--inventory .entity-equipment-heading,
  .entity-detail-page .entity-equipment--inventory .entity-equipment-row {
    grid-template-columns: 94px minmax(190px, 1.1fr) minmax(220px, 1fr) minmax(130px, .55fr);
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:last-child {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:first-child {
    font-weight: 600;
    white-space: nowrap;
  }
  .entity-detail-page .entity-equipment-row > [role="cell"]:first-child small {
    font-weight: 400;
  }
</style>`;

function entityDetailEquipmentMarkup({rows = [], inventory = false} = {}) {
  const headings = inventory ? ["携带槽", "物品", "战斗文本", "操作"]
    : ["携带槽", "物品", "所在槽", "状态", "操作"];
  return `${equipmentStyle}<div class="entity-equipment${inventory ? " entity-equipment--inventory" : ""}" role="table">
    <div class="entity-equipment-heading" role="row">${headings.map(label =>
      `<b role="columnheader">${esc(label)}</b>`).join("")}</div>
    ${rows.map(row => `<div class="entity-equipment-row" role="row" data-entity-equipment-row="${esc(row.id)}" ${row.attributes || ""}>
      <span role="cell">${row.labelMarkup || esc(row.label)}</span>
      <div role="cell">${row.itemMarkup || "—"}</div>
      ${inventory ? `<div role="cell">${row.statusMarkup || "—"}</div>`
    : `<div role="cell">${row.stateMarkup || "—"}</div>
      <div role="cell">${row.statusMarkup || "—"}</div>`}
      <div role="cell">${row.actionsMarkup ?? `${row.resetMarkup || ""}${row.previewMarkup || ""}`}</div>
    </div>`).join("")}</div>`;
}

function entityDetailPageMarkup({title, sections = [], heading = true, physicalRows = []} = {}) {
  return `<div class="entity-detail-page record-panel--wide">${heading
    ? `<header class="entity-detail-heading"><h2>${esc(title)}</h2></header>` : ""}
    ${entityDetailSectionsMarkup({sections})}${physicalRows.length
      ? physicalLocationMarkup({rows: physicalRows}) : ""}</div>`;
}

function entityAddressFields(rows) {
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    labelMarkup: `<div class="table-cell-stack" data-field-address-key="${esc(row.key)}">
      <b>${esc(row.label)}</b>${row.label === row.key ? ""
        : `<small class="mono">${esc(row.key)}</small>`}</div>`,
    valueMarkup: row.value === null || row.value === undefined || row.value === ""
      ? '<span class="resource-empty">—</span>' : String(row.value),
  }));
}

const SECTION_ORDER = ["appearance", "fields", "equipment", "equipment-state",
  "inventory", "shells", "crew", "placement", "other"];

function entityDetailSection(id, label, content, {wide = true, flat = true} = {}) {
  return {id, label, content, wide, flat};
}

function entityDetailPanel(label, content, options = {}) {
  const id = /视觉绑定|形象|立绘/.test(label) ? "appearance"
    : /装备|携带物|战斗预览/.test(label) ? "equipment"
      : /停放|位置/.test(label) ? "placement" : "other";
  return entityDetailSection(id, label, content, options);
}

function entityDetailSectionsMarkup({sections = []} = {}) {
  const ordered = sections.filter(section => section?.content || section?.fields)
    .map((section, index) => ({section, index})).sort((left, right) => {
      const rank = entry => {
        if (Number.isFinite(entry.section.order)) return entry.section.order;
        const value = SECTION_ORDER.indexOf(entry.section.kind || entry.section.id);
        return value < 0 ? SECTION_ORDER.length : value;
      };
      return rank(left) - rank(right) || left.index - right.index;
    });
  return `<div class="entity-detail-groups">${ordered.map(({section}) =>
    `<section class="record-panel entity-detail-group${section.wide ? " record-panel--wide" : ""}${
      section.flat ? " record-panel--flat" : ""}"
      ${section.anchor ? `id="${esc(section.anchor)}"` : ""}
      data-entity-detail-group="${esc(section.id)}">
      <h3>${esc(section.label)}${section.headingSuffixMarkup || ""}</h3>
      ${section.renderFields ? section.renderFields(section.fields || []) : section.content}
    </section>`).join("")}</div>`;
}

function entityDetailSelectorMarkup({entities = [], selected = "", componentAttributes = ""} = {}) {
  return `<div class="entity-detail-layout" ${componentAttributes}>
    <nav class="entity-detail-list" aria-label="实体列表">${entities.map(entity =>
      `<button type="button" data-entity-detail-select="${esc(entity.id)}"
        aria-current="${entity.id === selected ? "page" : "false"}">
        ${entity.previewMarkup || ""}<span>${esc(entity.label)}</span>
      </button>`).join("")}</nav>
    <div class="entity-detail-content">${entities.map(entity =>
      `<section data-entity-detail="${esc(entity.id)}"${entity.id === selected ? "" : " hidden"}>
        ${entityDetailPageMarkup({title: entity.label, sections: entity.groups,
          physicalRows: entity.physicalRows || []})}
      </section>`).join("")}</div>
  </div>`;
}

function bindEntityDetailSelector(root) {
  if (!root) return;
  root.querySelectorAll("[data-entity-detail-select]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = button.dataset.entityDetailSelect;
      root.querySelectorAll("[data-entity-detail-select]").forEach(candidate =>
        candidate.setAttribute("aria-current", String(candidate === button ? "page" : "false")));
      root.querySelectorAll("[data-entity-detail]").forEach(detail => {
        detail.hidden = detail.dataset.entityDetail !== selected;
      });
    });
  });
}

export { bindEntityDetailSelector, entityAddressFields, entityDetailEquipmentMarkup, entityDetailFieldTableMarkup, entityDetailPageMarkup, entityDetailPanel, entityDetailSection, entityDetailSelectorMarkup, nesColorCss, nesColorGrid, paletteSwatches };
