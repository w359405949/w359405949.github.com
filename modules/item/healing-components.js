// @editor-module party-healing-service owner 的精确引用供给
//
// 四项候选固定来自回复服务正文；这里只展示游戏规则数值及其道具引用，不复制
// 道具名称，也不把代码来源范围带进消费页。

import {esc} from "../../core/dom.js";
import {healingRange} from "../../core/item-service-compiler.js";
import {db} from "../../core/project-db.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const PARTY_HEALING_SERVICE_MODULE_ID = "party-healing-service";
const EXPECTED_SCHEMA = "metalmaxcn.module-asset.party-healing-service";
const EXPECTED_RECORDS = 4;

function healingId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 0xa9 && number <= 0xac ? number : null;
}

function idHex(value) {
  const id = healingId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle(value) {
  const match = /^party-healing-service:([0-9a-f]{2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = healingId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${PARTY_HEALING_SERVICE_MODULE_ID}:${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = healingId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : healingId(value);
}

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

function healingSummary(entry) {
  const range = healingRange(entry);
  return `回复 ${range.minimum_healing}–${range.maximum_healing} HP`;
}

function healingPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>回复规则 ?</b><small>${esc(error || "队伍回复规则引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(entry ? healingSummary(entry) : `回复规则 ${idHex(id)}`)}</b>
    <small>${esc(entry?.item_reference || "队伍道具回复服务")}</small>
  </span>`;
}

function healingReferenceItem(entry, reference = null) {
  const id = healingId(entry);
  const handle = normalizeHandle(entry?.handle);
  if (id === null || !handle) return null;
  const summary = healingSummary(entry);
  return {
    value: declaredText(entry, reference?.key) || handle,
    label: `${idHex(id)} · 队伍回复规则`,
    description: summary,
    meta: `${handle} · ${entry.item_reference}`,
    preview: healingPreviewMarkup({entry}),
    filter: [id, idHex(id), handle, entry.item_reference, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function validateEntries(documentValue) {
  const records = documentValue?.records;
  if (documentValue?.schema !== EXPECTED_SCHEMA
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS
      || Number(documentValue?.record_count) !== records.length) {
    throw new TypeError(`${PARTY_HEALING_SERVICE_MODULE_ID} 必须发布 ${EXPECTED_RECORDS} 条 owner 记录`);
  }
  const entries = records.map(record => {
    const id = healingId(record);
    const handle = normalizeHandle(record?.handle);
    const itemReference = String(record?.item_reference || "");
    const base = Number(record?.base_healing);
    if (id === null || handle !== `${PARTY_HEALING_SERVICE_MODULE_ID}:${idHex(id)}`
        || itemReference !== `human-item:${idHex(id)}`
        || !Number.isInteger(base) || base < 0 || base > 65535) {
      throw new TypeError(`${record?.handle || PARTY_HEALING_SERVICE_MODULE_ID} 回复规则无效`);
    }
    return {
      id,
      id_hex: record.id_hex,
      handle,
      item_reference: itemReference,
      base_healing: base,
    };
  });
  if (new Set(entries.map(entry => entry.handle)).size !== entries.length) {
    throw new TypeError(`${PARTY_HEALING_SERVICE_MODULE_ID} 的候选身份重复`);
  }
  return entries;
}

async function prepareHealingComponent(props) {
  try {
    const entries = validateEntries(
      await db.getResourceDocument(PARTY_HEALING_SERVICE_MODULE_ID, null),
    );
    const requested = requestedId(props);
    return {
      ...props,
      entries,
      entry: entries.find(entry => entry.id === requested) || null,
      error: "",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function healingReferencePickerMarkup({
  entries = [], value = null, label = "队伍回复规则", controlMarkup = "",
  componentAttributes = "", error = "", reference = null,
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: PARTY_HEALING_SERVICE_MODULE_ID, key: ["handle"]},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(PARTY_HEALING_SERVICE_MODULE_ID, {
  item: healingReferenceItem,
  className: "party-healing-service-reference-field",
  filterLabel: "过滤队伍回复规则",
  filterPlaceholder: "ID／句柄／道具／回复范围",
});

registerModuleComponent(PARTY_HEALING_SERVICE_MODULE_ID, "reference", {
  prepare: prepareHealingComponent,
  render: healingReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(PARTY_HEALING_SERVICE_MODULE_ID, kind, {
    prepare: prepareHealingComponent,
    render: healingPreviewMarkup,
  });
}
