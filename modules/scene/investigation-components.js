// @editor-module 调查命令与六个特殊调查实体的引用供给
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const LOGIC_DOCUMENT_ID = "project.scenes.logic";
const SCENE_DOCUMENT_ID = "project.scenes";
const COMMAND_MODULE_ID = "investigation-command";
const SPECIAL_MODULE_ID = "investigation-special";

function byteId(value) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result <= 0xff ? result : null;
}

function hexByte(value) {
  const id = byteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function commandIdentity(entry) {
  const id = byteId(entry?.command_id);
  return id === null ? "" : `investigation-command:${hexByte(id)}`;
}

function requestedCommand(props = {}) {
  const fromEntry = byteId(props.entry?.command_id);
  if (fromEntry !== null) return {commandId: fromEntry, selector: null};
  const match = /^investigation-command:([0-9a-f]{1,2})$/iu.exec(
    String(props.handle || "").trim());
  if (match) return {commandId: Number.parseInt(match[1], 16), selector: null};
  return {commandId: null, selector: byteId(props.value)};
}

function commandSummary(entry) {
  const count = Number(entry?.instance_count);
  const state = entry?.semantic_status === "confirmed-purpose" ? "用途已确认"
    : entry?.semantic_status === "investigation-associated-unused" ? "当前未布点"
      : "用途推定";
  return [Number.isInteger(count) ? `${count} 个实例` : "", state]
    .filter(Boolean).join(" · ");
}

function commandPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const requested = requestedCommand({entry, handle, value});
  const id = byteId(entry?.command_id) ?? requested.commandId;
  if (id === null && requested.selector === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>调查命令引用未解析</small></span>`;
  }
  const label = String(entry?.facility_label || `调查命令 $${hexByte(id)}`);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(label)}</b><small>${esc(commandSummary(entry || {}))}</small>
  </span>`;
}

function commandReferenceItem(entry) {
  const selector = byteId(entry?.selector);
  const commandId = byteId(entry?.command_id);
  if (selector === null || commandId === null) return null;
  const identity = commandIdentity(entry);
  const label = String(entry?.facility_label || `调查命令 $${hexByte(commandId)}`);
  const summary = commandSummary(entry);
  return {
    // 消费字段存 selector；命令 ID 只由 owner 在候选与句柄之间解释。
    value: String(selector),
    label: `${hexByte(commandId)} · ${label}`,
    description: `选择码 $${hexByte(selector)}`,
    meta: summary,
    preview: commandPreviewMarkup({entry}),
    filter: [selector, hexByte(selector), commandId, hexByte(commandId), identity,
      label, summary, entry?.investigation_evidence].filter(Boolean).join(" ").toLowerCase(),
  };
}

function specialIdentity(entry) {
  const sceneId = byteId(entry?.scene_id);
  const id = byteId(entry?.id);
  return sceneId === null || id === null
    ? "" : `investigation-special:${hexByte(sceneId)}:${hexByte(id)}`;
}

function requestedSpecial(props = {}) {
  const direct = specialIdentity(props.entry);
  if (direct) return direct;
  const reference = String(props.handle || props.value || "").trim();
  return /^investigation-special:[0-9a-f]{2}:[0-9a-f]{2}$/iu.test(reference)
    ? reference.toUpperCase().replace("INVESTIGATION-SPECIAL", "investigation-special") : "";
}

function specialLocation(entry) {
  const x = byteId(entry?.x);
  const y = byteId(entry?.y);
  return `${String(entry?.scene_name || `场景 $${hexByte(entry?.scene_id)}`)} · ${
    x === null || y === null ? "坐标未知" : `(${x}, ${y})`}`;
}

function specialPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "",
} = {}) {
  const identity = requestedSpecial({entry, handle, value});
  if (!identity) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>特殊调查引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(String(entry?.label || identity))}</b>
    <small>${esc(entry ? specialLocation(entry) : identity)}</small>
  </span>`;
}

function specialReferenceItem(entry) {
  const identity = specialIdentity(entry);
  if (!identity) return null;
  const label = String(entry?.label || identity);
  const location = specialLocation(entry);
  const description = String(entry?.description || "");
  return {
    value: identity,
    label,
    description: location,
    meta: description,
    preview: specialPreviewMarkup({entry}),
    filter: [identity, entry?.id, hexByte(entry?.id), label, location, description,
      entry?.kind, entry?.semantic_status].filter(Boolean).join(" ").toLowerCase(),
  };
}

function sceneNames(documentValue) {
  return new Map((documentValue?.editable_scenes || []).map(entry => [
    Number(entry.id), String(entry.name || entry.slug || `场景 $${hexByte(entry.id)}`),
  ]));
}

async function prepareInvestigationComponent(props) {
  try {
    const logic = await db.getDocument(LOGIC_DOCUMENT_ID, null);
    const moduleId = String(props.moduleId || "");
    if (moduleId === COMMAND_MODULE_ID) {
      const entries = logic?.investigation_handler_commands;
      if (!Array.isArray(entries)) {
        throw new TypeError(`${LOGIC_DOCUMENT_ID} 缺少 investigation_handler_commands`);
      }
      const requested = requestedCommand(props);
      return {
        ...props,
        entries,
        entry: props.entry || entries.find(entry => requested.commandId !== null
          ? byteId(entry.command_id) === requested.commandId
          : byteId(entry.selector) === requested.selector) || null,
        error: entries.length ? "" : `${COMMAND_MODULE_ID} 的静态候选值域为空`,
      };
    }
    if (moduleId !== SPECIAL_MODULE_ID) {
      throw new TypeError(`调查引用模块无效：${moduleId || "（空）"}`);
    }
    const rows = logic?.investigation_special_points;
    if (!Array.isArray(rows)) {
      throw new TypeError(`${LOGIC_DOCUMENT_ID} 缺少 investigation_special_points`);
    }
    const sceneDocument = await db.getDocument(SCENE_DOCUMENT_ID, null);
    const names = sceneNames(sceneDocument);
    const entries = rows.map(entry => ({
      ...entry,
      scene_name: names.get(Number(entry.scene_id)) || `场景 $${hexByte(entry.scene_id)}`,
    }));
    const requested = requestedSpecial(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => specialIdentity(entry) === requested) || null,
      error: entries.length ? "" : `${SPECIAL_MODULE_ID} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function investigationReferencePickerMarkup({
  moduleId, entries = [], value = null, label = "", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value,
    label: label || (moduleId === COMMAND_MODULE_ID ? "调查命令" : "特殊调查点"),
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, item, preview, placeholder] of [
  [COMMAND_MODULE_ID, commandReferenceItem, commandPreviewMarkup, "命令 ID／用途／实例"],
  [SPECIAL_MODULE_ID, specialReferenceItem, specialPreviewMarkup, "句柄／场景／坐标／用途"],
]) {
  registerReferenceFieldPresentation(moduleId, {
    item,
    className: "investigation-reference-field",
    filterLabel: `过滤${moduleId === COMMAND_MODULE_ID ? "调查命令" : "特殊调查点"}`,
    filterPlaceholder: placeholder,
  });
  registerModuleComponent(moduleId, "reference", {
    prepare: prepareInvestigationComponent,
    render: investigationReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });
  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareInvestigationComponent,
      render: preview,
    });
  }
}
