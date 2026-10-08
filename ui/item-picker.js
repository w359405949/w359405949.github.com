// @editor-module 已发布物品目录的分组选择器。

import {esc} from "../core/dom.js";
import {bindReferenceControlProjection, bindReferencePicker,
  referencePickerMarkup} from "./reference-picker.js";
import {hydrateModuleComponents, moduleComponentDefinition, renderModuleComponent} from "./module-components.js";

export const HUMAN_EQUIPMENT_CATEGORIES = Object.freeze([
  "human-head", "human-body", "human-feet", "human-protector", "human-hands", "human-weapon",
]);
export const TANK_EQUIPMENT_CATEGORIES = Object.freeze([
  "tank-main-gun", "tank-special", "tank-sub-gun", "tank-c-unit", "tank-engine", "tank-chassis",
]);
export const HUMAN_CATEGORIES = Object.freeze([...HUMAN_EQUIPMENT_CATEGORIES, "human-item"]);
export const ITEM_CATEGORIES = Object.freeze([
  ...HUMAN_CATEGORIES, ...TANK_EQUIPMENT_CATEGORIES, "tank-item",
]);
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

export function itemPickerMarkup({records = [], value = 0, label = "物品", fieldId = "", disabled = false,
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

export function itemPickerFieldMarkup({records = [], value = 0, label = "物品", disabled = false,
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

export function hydrateItemPickers(root = document) {
  root.querySelectorAll("[data-item-picker]").forEach(picker => {
    const key = picker.dataset.itemPickerLazy;
    if (key) {
      const config = lazyPickers.get(key);
      const details = picker.querySelector('details.module-reference-picker');
      if (!config || !details) return;
      lazyPickers.delete(key);
      delete picker.dataset.itemPickerLazy;
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
