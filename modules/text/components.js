// @editor-module 文本记录 owner 的可嵌入当前值预览
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {handleTextMarkup} from "../../ui/handle.js";
import {currentTextReference, textRecordDisplayText} from "../../core/resource-index.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";
import {
  loadCurrentTextRecordDisplays,
  textCatalogDocument,
  textClassLabels,
} from "../../views/text/catalog.js";

const TEXT_RECORDS_MODULE_ID = "text-record";

function textRecordHandle(handle, value) {
  const reference = String(handle || value || "").trim();
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(reference)) return reference;
  const script = /^ui-script:([0-9a-f]{2}):([0-9]{3})$/iu.exec(reference);
  return script ? `record:${script[1].toUpperCase()}:${script[2]}` : "";
}

function textRecordPreviewMarkup({
  handle = "",
  value = "",
  compact = true,
  componentAttributes = "",
  displayText = undefined,
} = {}) {
  const record = textRecordHandle(handle, value);
  return `<span class="text-module-preview" ${componentAttributes}>
    <span class="text-module-preview-value" ${displayText === undefined ? `data-current-text-record="${esc(record)}"` : ''}
      data-compact="${compact ? "1" : "0"}"
      data-empty-label="${record ? "没有可直接显示的静态文字" : "文本句柄未解析"}">
      ${displayText === undefined ? '<span class="resource-empty">正在读取当前文字…</span>' : esc(displayText)}
    </span>
    <small class="mono">${handleTextMarkup(record || handle || value || "—")}</small>
  </span>`;
}

function textRecordIdentity(entry) {
  const nodeId = String(entry?.node_id || "");
  return /^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(nodeId) ? nodeId : "";
}

function textRecordRegion(entry) {
  const value = String(entry?.region_hex || entry?.region_id_hex || "").toUpperCase();
  if (/^[0-9A-F]{2}$/u.test(value)) return value;
  const region = Number(entry?.region_id);
  return Number.isInteger(region) && region >= 0 && region <= 0xff
    ? region.toString(16).toUpperCase().padStart(2, "0") : "??";
}

function textRecordNumber(entry) {
  const direct = Number(entry?.record ?? entry?.id);
  if (Number.isInteger(direct) && direct >= 0 && direct <= 999) {
    return String(direct).padStart(3, "0");
  }
  return textRecordIdentity(entry).split(":").at(-1) || "???";
}

function textRecordKind(entry) {
  const kind = String(entry?.text_classification?.kind || "control");
  return textClassLabels[kind] || kind;
}

function textRecordName(entry) {
  return currentTextReference(entry?.node_id).label || textRecordDisplayText(entry)
    || String(entry?.known_label || entry?.region_name || "没有可直接显示的静态文字");
}

function textRecordMeta(entry) {
  const capacity = Number(entry?.capacity ?? entry?.length ?? entry?.bytes?.length);
  const glyphs = Number(entry?.glyph_tokens);
  return [
    Number.isInteger(capacity) ? `${capacity} B` : "",
    Number.isInteger(glyphs) ? `${glyphs} 字形` : "",
  ].filter(Boolean).join(" · ");
}

function textRecordReferenceItem(entry) {
  const handle = textRecordIdentity(entry);
  if (!handle) return null;
  const region = textRecordRegion(entry);
  const record = textRecordNumber(entry);
  const name = textRecordName(entry);
  const kind = textRecordKind(entry);
  const regionName = String(entry?.region_name || `文本区 ${region}`);
  const meta = textRecordMeta(entry);
  return {
    value: handle,
    compactLabel: `${handle} · ${name}`,
    group: region,
    groupLabel: regionName,
    label: name,
    description: `${regionName} · ${kind}`,
    meta: `${handle} · ${meta}`,
    preview: textRecordPreviewMarkup({handle}),
    filter: [handle, `ui-script:${region}:${record}`, region, record,
      name, regionName, kind, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareTextReferenceComponent(props) {
  try {
    const documentValue = await textCatalogDocument();
    const entries = documentValue?.records;
    if (!Array.isArray(entries)) {
      throw new TypeError("project.text-catalog 缺少 records 候选表");
    }
    const requested = textRecordHandle(props.handle, props.value);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => textRecordIdentity(entry) === requested) || null,
      error: entries.length ? "" : "text-record 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function textRecordReferencePickerMarkup({
  entries = db.peekDocument('project.text-catalog', null)?.records || [],
  value = null,
  label = "文本记录",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
  regionId = null,
  picker = {},
} = {}) {
  const regional = Number.isInteger(regionId);
  const region = regional ? regionId.toString(16).toUpperCase().padStart(2, "0") : null;
  return referenceFieldPickerMarkup({
    reference: {module: TEXT_RECORDS_MODULE_ID},
    picker,
    rows: regional ? entries.filter(entry => textRecordIdentity(entry).startsWith(`record:${region}:`)) : entries,
    value: regional ? `record:${region}:${Number(value).toString().padStart(3, "0")}`
      : textRecordHandle("", value) || value,
    candidateControlValue: regional ? (_key, entry) =>
      Number(textRecordIdentity(entry).split(":").at(-1)) : null,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(TEXT_RECORDS_MODULE_ID, {
  item: textRecordReferenceItem,
  paint: loadCurrentTextRecordDisplays,
  className: "text-record-reference-field",
  filterLabel: "过滤文本记录",
  filterPlaceholder: "句柄／文本区／当前文字／类别",
});

registerModuleComponent(TEXT_RECORDS_MODULE_ID, "reference", {
  prepare: prepareTextReferenceComponent,
  render: textRecordReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(TEXT_RECORDS_MODULE_ID, kind, {
    render: textRecordPreviewMarkup,
    hydrate: loadCurrentTextRecordDisplays,
  });
}
