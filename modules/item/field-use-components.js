// @editor-module field-item-use owner 的引用供给
//
// 38 项候选只来自正式发布的 field-item-use owner 正文；item-entry 与文本区只补
// 当前道具名称，不参与拼候选值域。消费端只看到行为句柄与用途摘要，不接触 handler、
// 字节偏移或分发表的物理编码。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {currentTextReference} from "../../core/resource-index.js";
import {state} from "../../core/state.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const FIELD_ITEM_USE_MODULE_ID = "field-item-use";
const FIELD_ITEM_USE_RESOURCE_ID = FIELD_ITEM_USE_MODULE_ID;
const ITEM_DIRECTORY_RESOURCE_ID = "item-entry";

function valueAtPath(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function byteId(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function hexByte(value) {
  const id = byteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeFieldItemUseHandle(value) {
  const match = /^field-item-use:([0-9a-f]{1,2})$/iu.exec(String(value || "").trim());
  return match
    ? `${FIELD_ITEM_USE_MODULE_ID}:${match[1].toUpperCase().padStart(2, "0")}`
    : "";
}

function normalizeItemReference(value) {
  const match = /^(human-item|tank-item):([0-9a-f]{1,2})$/iu.exec(
    String(value || "").trim(),
  );
  return match
    ? `${match[1].toLowerCase()}:${match[2].toUpperCase().padStart(2, "0")}`
    : "";
}

function fieldItemUseHandle(entry) {
  const direct = normalizeFieldItemUseHandle(entry?.handle);
  if (direct) return direct;
  const id = byteId(entry?.id);
  return id === null ? "" : `${FIELD_ITEM_USE_MODULE_ID}:${hexByte(id)}`;
}

function requestedFieldItemUseHandle({entry = null, handle = "", value = ""} = {}) {
  const direct = fieldItemUseHandle(entry)
    || normalizeFieldItemUseHandle(handle || value);
  if (direct) return direct;
  const id = byteId(value);
  return id === null ? "" : `${FIELD_ITEM_USE_MODULE_ID}:${hexByte(id)}`;
}

function itemReferenceForRecord(item) {
  const owner = String(item?.category?.owner || "");
  const id = byteId(item?.id);
  return id === null || !["human", "tank"].includes(owner)
    ? "" : `${owner}-item:${hexByte(id)}`;
}

function activeItemRecord(entry) {
  if (entry?.referenced_item) return entry.referenced_item;
  const reference = normalizeItemReference(entry?.item_reference);
  if (!reference) return null;
  const items = state.project?.game_data?.items?.records;
  return Array.isArray(items)
    ? items.find(item => itemReferenceForRecord(item) === reference) || null
    : null;
}

function itemNameRecord(item) {
  const id = byteId(item?.name_text_record_id);
  const region = Number.parseInt(String(item?.name_text_region ?? ""), 16);
  return id === null || !Number.isInteger(region) || region < 0 || region > 0xff
    ? ""
    : `record:${hexByte(region)}:${String(id).padStart(3, "0")}`;
}

function currentItemName(entry) {
  const item = activeItemRecord(entry);
  const fallback = String(item?.name || "").trim();
  const textRecord = itemNameRecord(item);
  const current = textRecord ? currentTextReference(textRecord).label : "";
  return current || fallback || String(entry?.effect_family?.label || "").trim()
    || fieldItemUseHandle(entry);
}

function itemCategoryLabel(entry) {
  const item = activeItemRecord(entry);
  if (item?.category?.name) return String(item.category.name);
  return normalizeItemReference(entry?.item_reference).startsWith("tank-item:")
    ? "战车物品" : "人类物品";
}

function consumptionLabel(value) {
  return ({
    never: "不消耗",
    "on-success": "成功时消耗",
    "context-dependent": "按场景或状态决定",
  })[String(value || "")] || String(value || "消耗规则未发布");
}

function targetLabel(entry) {
  return entry?.target_required ? "需要选择队员" : "无需选择队员";
}

function currentTextLabels(entry) {
  const references = Array.isArray(entry?.text_record_references)
    ? entry.text_record_references : [];
  return references.map(reference => currentTextReference(reference).label).filter(Boolean);
}

function effectDescription(entry) {
  const family = entry?.effect_family || {};
  return [
    family.label || "用途未发布",
  ].map(String).join(" · ");
}

function fieldItemUsePreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const identity = requestedFieldItemUseHandle({entry, handle, value});
  if (!identity || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "场景道具行为引用未解析")}</small></span>`;
  }
  if (!entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>场景道具行为</b><small>${esc(identity)}</small></span>`;
  }
  const effect = String(entry?.effect_family?.label || "用途未发布");
  const detail = itemCategoryLabel(entry);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(`${currentItemName(entry)} · ${effect}`)}</b><small>${esc(detail)}</small>
  </span>`;
}

function fieldItemUseReferenceItem(entry, reference = null) {
  const handle = fieldItemUseHandle(entry);
  const id = byteId(entry?.id);
  if (!handle || id === null) return null;
  const itemName = currentItemName(entry);
  const description = declaredText(entry, reference?.description)
    || effectDescription(entry);
  const meta = declaredText(entry, reference?.meta) || [
    handle,
    itemCategoryLabel(entry),
  ].join(" · ");
  const textLabels = currentTextLabels(entry);
  return {
    value: declaredText(entry, reference?.key) || handle,
    label: `${hexByte(id)} · ${itemName}`,
    description,
    meta,
    preview: fieldItemUsePreviewMarkup({entry}),
    filter: [
      id,
      hexByte(id),
      `0x${hexByte(id)}`,
      `$${hexByte(id)}`,
      handle,
      entry?.item_reference,
      itemName,
      itemCategoryLabel(entry),
      entry?.effect_family?.id,
      entry?.effect_family?.label,
      targetLabel(entry),
      consumptionLabel(entry?.consumption),
      ...(entry?.parameter_records || []).map(record => record?.owner_reference),
      ...(entry?.text_record_references || []),
      ...textLabels,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function validateFieldItemUseRecords(documentValue) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${FIELD_ITEM_USE_RESOURCE_ID} 缺少 records 静态候选表`);
  }
  const declaredCount = Number(documentValue?.record_count);
  if (!Number.isInteger(declaredCount) || declaredCount !== records.length) {
    throw new TypeError(`${FIELD_ITEM_USE_RESOURCE_ID} record_count 与 records 不一致`);
  }
  const handles = [];
  const dispatchIndexes = [];
  for (const entry of records) {
    const id = byteId(entry?.id);
    const handle = normalizeFieldItemUseHandle(entry?.handle);
    const itemReference = normalizeItemReference(entry?.item_reference);
    if (id === null || handle !== `${FIELD_ITEM_USE_MODULE_ID}:${hexByte(id)}`
        || itemReference.split(":").at(-1) !== hexByte(id)) {
      throw new TypeError(`${FIELD_ITEM_USE_RESOURCE_ID} 含身份不一致的候选行`);
    }
    const dispatchIndex = Number(entry?.dispatch_index);
    if (!Number.isInteger(dispatchIndex) || dispatchIndex < 0) {
      throw new TypeError(`${handle} 缺少有效的语义记录顺序`);
    }
    handles.push(handle);
    dispatchIndexes.push(dispatchIndex);
  }
  if (new Set(handles).size !== records.length) {
    throw new TypeError(`${FIELD_ITEM_USE_RESOURCE_ID} 的候选句柄重复`);
  }
  const orderedDispatchIndexes = dispatchIndexes.slice().sort((left, right) => left - right);
  if (orderedDispatchIndexes.some((value, index) => value !== index)) {
    throw new TypeError(`${FIELD_ITEM_USE_RESOURCE_ID} 的语义记录顺序不连续`);
  }
  return records;
}

function itemDirectory(documentValue) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${ITEM_DIRECTORY_RESOURCE_ID} 缺少 records 名称目录`);
  }
  const entries = records.filter(item => itemReferenceForRecord(item));
  const byReference = new Map(entries.map(item => [itemReferenceForRecord(item), item]));
  if (byReference.size !== entries.length) {
    throw new TypeError(`${ITEM_DIRECTORY_RESOURCE_ID} 的道具 owner 身份重复`);
  }
  return byReference;
}

async function prepareFieldItemUseComponent(props) {
  try {
    const [documentValue, itemDocument] = await Promise.all([
      db.getResourceDocument(FIELD_ITEM_USE_RESOURCE_ID, null),
      db.getResourceDocument(ITEM_DIRECTORY_RESOURCE_ID, null),
    ]);
    const records = validateFieldItemUseRecords(documentValue);
    const items = itemDirectory(itemDocument);
    const entries = records.map(entry => {
      const itemReference = normalizeItemReference(entry?.item_reference);
      const referencedItem = items.get(itemReference);
      if (!referencedItem) {
        throw new TypeError(`${entry?.handle || "候选行"} 缺少 ${itemReference} 名称记录`);
      }
      return {...entry, referenced_item: referencedItem};
    });
    const requested = requestedFieldItemUseHandle(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => fieldItemUseHandle(entry) === requested) || null,
      error: entries.length ? "" : `${FIELD_ITEM_USE_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function fieldItemUseReferencePickerMarkup({
  entries = [],
  value = null,
  label = "场景道具行为",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: FIELD_ITEM_USE_MODULE_ID},
    rows: entries,
    value: requestedFieldItemUseHandle({value}) || value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(FIELD_ITEM_USE_MODULE_ID, {
  item: fieldItemUseReferenceItem,
  className: "field-item-use-reference-field",
  filterLabel: "过滤场景道具行为",
  filterPlaceholder: "道具 ID／当前名称／效果／文字／句柄",
});

registerModuleComponent(FIELD_ITEM_USE_MODULE_ID, "reference", {
  prepare: prepareFieldItemUseComponent,
  render: fieldItemUseReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(FIELD_ITEM_USE_MODULE_ID, kind, {
    prepare: prepareFieldItemUseComponent,
    render: fieldItemUsePreviewMarkup,
  });
}
