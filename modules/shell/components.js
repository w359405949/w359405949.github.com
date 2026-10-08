// @editor-module shell-record owner 的 14 项候选与战斗摘要
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {currentTextReference} from "../../core/resource-index.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const SHELL_MODULE_ID = "shell-record";

function shellId(value) {
  const result = Number(value?.id ?? value);
  return Number.isInteger(result) && result >= 0 && result <= 0x0d ? result : null;
}

function idHex(value) {
  const id = shellId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function byteHex(value) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result <= 0xff
    ? result.toString(16).toUpperCase().padStart(2, "0") : "??";
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = shellId(entry);
  if (direct !== null) return direct;
  const match = /^(?:shell-record|shell):([0-9a-f]{1,2})$/iu.exec(
    String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : shellId(value);
}

function nameHandle(entry) {
  const region = String(entry?.name_text_region || "0D").toUpperCase();
  const record = Number(entry?.name_text_record_id);
  return /^[0-9A-F]{2}$/u.test(region) && Number.isInteger(record)
    ? `record:${region}:${String(record).padStart(3, "0")}` : "";
}

function shellName(entry) {
  const handle = nameHandle(entry);
  return handle ? currentTextReference(handle).label || String(entry?.name || "")
    : String(entry?.name || `炮弹 $${idHex(entry)}`);
}

function shellSummary(entry) {
  const price = Number(entry?.price?.value);
  return [
    entry?.special === false ? "普通弹" : "特殊炮弹",
    Number.isFinite(price) ? `${price} G` : "",
  ].filter(Boolean).join(" · ");
}

function shellPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>炮弹引用未解析</small></span>`;
  }
  const resolved = entry || {id};
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(shellName(resolved))}</b><small>${esc(shellSummary(resolved))}</small>
  </span>`;
}

function shellReferenceItem(entry) {
  const id = shellId(entry);
  if (id === null) return null;
  const hex = idHex(id);
  const name = shellName(entry);
  const summary = shellSummary(entry);
  const parameter = Number(entry?.damage_parameter);
  return {
    value: String(id),
    label: `${hex} · ${name}`,
    description: summary,
    meta: `shell-record:${hex}`,
    preview: shellPreviewMarkup({entry}),
    filter: [id, hex, `shell:${hex}`, `shell-record:${hex}`, name, summary, parameter]
      .filter(value => value !== null && value !== undefined).join(" ").toLowerCase(),
  };
}

async function prepareShellComponent(props) {
  try {
    const documentValue = await db.getDocument(SHELL_MODULE_ID, null);
    const entries = documentValue?.records;
    if (!Array.isArray(entries)) throw new TypeError(`${SHELL_MODULE_ID} 缺少 records 候选表`);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => shellId(entry) === requestedId) || null,
      error: entries.length ? "" : `${SHELL_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function shellReferencePickerMarkup({
  entries = [], value = null, label = "炮弹", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: SHELL_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(SHELL_MODULE_ID, {
  item: shellReferenceItem,
  className: "shell-reference-field",
  filterLabel: "过滤炮弹",
  filterPlaceholder: "ID／当前名称／普通或特殊／视觉",
});

registerModuleComponent(SHELL_MODULE_ID, "reference", {
  prepare: prepareShellComponent,
  render: shellReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(SHELL_MODULE_ID, kind, {
    prepare: prepareShellComponent,
    render: shellPreviewMarkup,
  });
}
