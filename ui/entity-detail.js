// @editor-module 人物与战车共用的实体详情分组。

import {esc} from "../core/dom.js";
import {dataTable} from "./table.js";
import {setStatus} from "./shell.js";
import {physicalLocationMarkup} from "./physical-location.js";

export function entityDetailFieldTableMarkup({fields = [], pageStatus = null} = {}) {
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

export function entityDetailEquipmentMarkup({rows = [], inventory = false} = {}) {
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

export function entityDetailPageMarkup({title, sections = [], heading = true, physicalRows = []} = {}) {
  return `<div class="entity-detail-page record-panel--wide">${heading
    ? `<header class="entity-detail-heading"><h2>${esc(title)}</h2></header>` : ""}
    ${entityDetailSectionsMarkup({sections})}${physicalRows.length
      ? physicalLocationMarkup({rows: physicalRows}) : ""}</div>`;
}

export function entityAddressFields(rows) {
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

export function entityDetailSection(id, label, content, {wide = true, flat = true} = {}) {
  return {id, label, content, wide, flat};
}

export function entityDetailPanel(label, content, options = {}) {
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

export function entityDetailSelectorMarkup({entities = [], selected = "", componentAttributes = ""} = {}) {
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

export function bindEntityDetailSelector(root) {
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
