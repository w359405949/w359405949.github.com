// @editor-module story-autonomous-script owner 的 169 项脚本候选与流摘要
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {recordUid} from "../../core/resource-index.js";
import {interactionEditorHref, interactionEditorLink} from '../../ui/interaction-editor-links.js';
import {prepareStoryReferenceDetails, paintStoryReferenceDetails} from './reference-details.js';
import {registerModuleComponent} from "../../ui/module-components.js";
import {updateReferencePickerItems} from '../../ui/reference-picker.js';
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const AUTONOMOUS_MODULE_ID = "story-autonomous-script";

function scriptId(value) {
  const result = Number(value?.id ?? value);
  return Number.isInteger(result) && result >= 0 && result <= 0xa8 ? result : null;
}

function idHex(value) {
  const id = scriptId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = scriptId(entry);
  if (direct !== null) return direct;
  const match = /^(?:story:autonomous|story-autonomous-script):([0-9a-f]{1,2})$/iu.exec(
    String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : scriptId(value);
}

function bytecode(entry) {
  return Array.isArray(entry?.bytecode) ? entry.bytecode : [];
}

function scriptSummary(entry) {
  const bytes = bytecode(entry);
  if (!bytes.length) return "空动作";
  const tail = Number(bytes.at(-1));
  return `${bytes.length} B · 末字节 $${tail.toString(16).toUpperCase().padStart(2, "0")}`;
}

function bytecodeLead(entry) {
  const bytes = bytecode(entry);
  return bytes.slice(0, 8).map(value => Number(value).toString(16)
    .toUpperCase().padStart(2, "0")).join(" ") + (bytes.length > 8 ? " …" : "");
}

function scriptLabel(entry) {
  return String(entry?.label || `自动动作 ${idHex(entry)}`);
}

function autonomousPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>自动行动脚本引用未解析</small></span>`;
  }
  const resolved = entry || {id};
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(scriptLabel(resolved))}</b><small>自主动作</small>
  </span>`;
}

function autonomousReferenceItem(entry) {
  const id = scriptId(entry);
  if (id === null) return null;
  const hex = idHex(id);
  const label = scriptLabel(entry);
  const summary = scriptSummary(entry);
  const lead = bytecodeLead(entry);
  return {
    value: String(id),
    group: 'autonomous', groupLabel: '自主动作',
    label,
    description: '自主动作',
    meta: recordUid(`${AUTONOMOUS_MODULE_ID}:script`, id),
    preview: autonomousPreviewMarkup({entry}),
    details: `${entry.pickerDetails || ''}${interactionEditorLink(interactionEditorHref(recordUid(`${AUTONOMOUS_MODULE_ID}:script`, id)))}`,
    filter: [id, hex, `story:autonomous:${hex}`, `story-autonomous-script:${hex}`,
      label, summary, lead].filter(Boolean).join(" ").toLowerCase(),
  };
}

async function prepareAutonomousComponent(props) {
  try {
    const documentValue = db.peekResourceDocument(AUTONOMOUS_MODULE_ID, null)
      || await db.getResourceDocument(AUTONOMOUS_MODULE_ID, null);
    let entries = documentValue?.scripts;
    if (!Array.isArray(entries)) {
      throw new TypeError(`${AUTONOMOUS_MODULE_ID} 缺少 scripts 候选表`);
    }
    entries = await prepareStoryReferenceDetails(documentValue, 'autonomous', entries);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => scriptId(entry) === requestedId) || null,
      error: entries.length ? "" : `${AUTONOMOUS_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function autonomousReferencePickerMarkup({
  entries = [], value = null, label = "自动行动脚本", controlMarkup = "",
  componentAttributes = "", error = "", picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: AUTONOMOUS_MODULE_ID},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(AUTONOMOUS_MODULE_ID, {
  item: autonomousReferenceItem,
  paint: paintStoryReferenceDetails,
  className: "autonomous-reference-field",
  filterLabel: "过滤自动行动脚本",
  filterPlaceholder: "ID／脚本名称／长度／起始字节",
});

async function hydrateAutonomousReferences(root) {
  if (root.classList.contains('reference-detail-field')) {
    const prepared = await prepareAutonomousComponent({});
    if (prepared.error) throw new TypeError(prepared.error);
    updateReferencePickerItems(root, prepared.entries.map(autonomousReferenceItem), prepared.entries);
  }
  hydrateReferenceFieldPickers(root);
}

registerModuleComponent(AUTONOMOUS_MODULE_ID, "reference", {
  prepare: prepareAutonomousComponent,
  render: autonomousReferencePickerMarkup,
  hydrate: hydrateAutonomousReferences,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(AUTONOMOUS_MODULE_ID, kind, {
    prepare: prepareAutonomousComponent,
    render: autonomousPreviewMarkup,
  });
}
