import {esc} from "../core/dom.js";
import {facilityConfigurationLabel} from '../modules/facility/configuration-summary.js';
import {moduleComponentDefinition, renderModuleComponent} from "./module-components.js";
import {referencePickerMarkup} from "./reference-picker.js";

function productMarkup(product) {
  const owner = product.item?.category?.owner;
  const moduleId = owner === "tank" ? "tank-item" : "human-item";
  const icon = product.item && moduleComponentDefinition(moduleId, "preview")
    ? renderModuleComponent(moduleId, "preview", {entry: product.item})
    : `<span class="scene-shop-product-glyph" aria-hidden="true">物</span>`;
  return `<span class="scene-shop-product">${icon}<span>${esc(product.label)}</span></span>`;
}

function shopConfigurationPreview(products, emptyLabel = '') {
  return products.length
    ? `<span class="scene-shop-products">${products.map(productMarkup).join('')}</span>`
    : emptyLabel ? `<span class="scene-shop-products-empty">${esc(emptyLabel)}</span>` : '';
}

export function shopConfigurationPicker({
  family, recordId, productsForRecord, controlAttribute, controlValue = "", className = "",
  label = "售卖配置", countLabel = "项货品", emptyLabel = "没有货品",
  filterLabel = "搜索实例或货品", filterPlaceholder = "实例编号或货品名称",
  labelForRecord = record => facilityConfigurationLabel({...family, id: record.id}, record.values),
  currentLabelForRecord = null,
}) {
  const items = (family.records || []).map(record => {
    const products = productsForRecord(family, record);
    return {
      value: String(Number(record.id)),
      label: labelForRecord(record),
      currentLabel: currentLabelForRecord?.(record) || '',
      disabled: record.disabled === true,
      description: `${products.length} ${countLabel}`,
      filter: [labelForRecord(record), record.id_hex, record.id, ...products.map(product => product.label)].join(" "),
      details: shopConfigurationPreview(products, emptyLabel),
    };
  });
  return referencePickerMarkup({
    moduleId: "facility-config",
    value: String(recordId),
    label,
    items,
    className: `shop-configuration-picker ${className}`.trim(),
    filterLabel,
    filterPlaceholder,
    compact: true,
    previewPanel: true,
    controlMarkup: `<select hidden ${controlAttribute}="${esc(controlValue)}">${
      (family.records || []).map(record => `<option value="${Number(record.id)}"${
        Number(record.id) === Number(recordId) ? " selected" : ""}${record.disabled ? ' disabled' : ''}>${esc(labelForRecord(record))}</option>`).join("")
    }</select>`,
  });
}
