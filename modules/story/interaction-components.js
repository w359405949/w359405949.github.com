// @editor-module story-interaction-script owner 的精确引用供给
//
// 108 项候选固定来自 story-interaction-script 正文。引用卡只展示 owner 发布的标签与
// 稳定资源身份；opcode 流保持不透明，不在消费页另造一份剧情解释器。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {recordUid} from "../../core/resource-index.js";
import {interactionEditorHref, interactionEditorLink} from '../../ui/interaction-editor-links.js';
import {prepareStoryReferenceDetails, paintStoryReferenceDetails} from './reference-details.js';
import {registerModuleComponent} from "../../ui/module-components.js";
import {updateReferencePickerItem} from '../../ui/reference-picker.js';
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const INTERACTION_MODULE_ID = "story-interaction-script";
const EXPECTED_SCHEMA = "metalmaxcn.story.asset.interaction";
const EXPECTED_SCRIPTS = 108;

function scriptId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 1 && number <= EXPECTED_SCRIPTS
    ? number : null;
}

function idHex(value) {
  const id = scriptId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeResourceId(value) {
  const match = /^story-interaction-script\.script\.([0-9a-f]{2})$/iu.exec(
    String(value || "").trim(),
  );
  if (!match) return "";
  const id = scriptId(Number.parseInt(match[1], 16));
  return id === null ? "" : `story-interaction-script.script.${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = scriptId(entry);
  if (direct !== null) return direct;
  const resourceId = normalizeResourceId(handle || value);
  return resourceId ? Number.parseInt(resourceId.split(".").at(-1), 16) : scriptId(value);
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

function interactionPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>交互动作 ?</b><small>${esc(error || "交互动作脚本引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>交互 ${idHex(id)}</b><small>场景交互</small>
  </span>`;
}

function interactionReferenceItem(entry, reference = null) {
  const id = scriptId(entry);
  const resourceId = normalizeResourceId(entry?.resource_id);
  const label = String(entry?.label || "").trim();
  if (id === null || !resourceId || !label) return null;
  return {
    value: declaredText(entry, reference?.key) || String(id),
    group: 'interaction', groupLabel: '交互动作',
    label,
    description: "场景角色交互流程",
    meta: recordUid(`${INTERACTION_MODULE_ID}:script`, id),
    preview: interactionPreviewMarkup({entry}),
    details: `${entry.pickerDetails || ''}${interactionEditorLink(interactionEditorHref(recordUid(`${INTERACTION_MODULE_ID}:script`, id)))}`,
    filter: [id, idHex(id), label, resourceId, "场景角色交互流程"]
      .join(" ").toLowerCase(),
  };
}

function validateEntries(documentValue) {
  const scripts = documentValue?.scripts;
  if (documentValue?.schema !== EXPECTED_SCHEMA
      || Number(documentValue?.first_valid_id) !== 1
      || Number(documentValue?.pointer_count) !== EXPECTED_SCRIPTS + 1
      || !Array.isArray(scripts) || scripts.length !== EXPECTED_SCRIPTS) {
    throw new TypeError(`${INTERACTION_MODULE_ID} 必须发布 ${EXPECTED_SCRIPTS} 项脚本候选`);
  }
  const entries = scripts.map(script => {
    const id = scriptId(script);
    const resourceId = normalizeResourceId(script?.resource_id);
    const label = String(script?.label || "").trim();
    if (id === null || resourceId !== `story-interaction-script.script.${idHex(id)}`
        || !label || !Array.isArray(script?.bytecode)) {
      throw new TypeError(`${script?.resource_id || INTERACTION_MODULE_ID} 脚本候选无效`);
    }
    return {id, resource_id: resourceId, label};
  });
  if (new Set(entries.map(entry => entry.id)).size !== entries.length
      || new Set(entries.map(entry => entry.resource_id)).size !== entries.length) {
    throw new TypeError(`${INTERACTION_MODULE_ID} 的候选身份重复`);
  }
  return entries;
}

async function prepareInteractionComponent(props) {
  try {
    const document = await db.getResourceDocument(INTERACTION_MODULE_ID, null);
    const entries = await prepareStoryReferenceDetails(document, 'interaction', validateEntries(document));
    const requested = requestedId(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => entry.id === requested) || null,
      error: "",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function interactionReferencePickerMarkup({
  entries = [], value = null, label = "交互动作脚本", controlMarkup = "",
  componentAttributes = "", error = "", reference = null, picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: INTERACTION_MODULE_ID, key: ["id"]},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(INTERACTION_MODULE_ID, {
  item: interactionReferenceItem,
  paint: paintStoryReferenceDetails,
  className: "interaction-script-reference-field",
  filterLabel: "过滤交互动作脚本",
  filterPlaceholder: "ID／脚本名称／资源身份",
});

async function hydrateInteractionReferences(root) {
  if (root.classList.contains('reference-detail-field')) {
    const prepared = await prepareInteractionComponent({});
    if (prepared.error) throw new TypeError(prepared.error);
    for (const entry of prepared.entries) updateReferencePickerItem(root, interactionReferenceItem(entry));
  }
  hydrateReferenceFieldPickers(root);
}

registerModuleComponent(INTERACTION_MODULE_ID, "reference", {
  prepare: prepareInteractionComponent,
  render: interactionReferencePickerMarkup,
  hydrate: hydrateInteractionReferences,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(INTERACTION_MODULE_ID, kind, {
    prepare: prepareInteractionComponent,
    render: interactionPreviewMarkup,
  });
}
