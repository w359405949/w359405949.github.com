// @editor-module investigation / treasure owner 的引用供给
//
// 两类记录都从源码点名的 project.scenes.logic 平铺表读取；不遍历 240 个场景
// 资源来拼候选。场景名与宝物内容只作当前显示投影，实体键仍是各 owner 的数值 ID。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {currentTextReference} from "../../core/resource-index.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const SCENE_LOGIC_DOCUMENT_ID = "project.scenes.logic";
const SCENE_CATALOG_DOCUMENT_ID = "project.scenes";
const ITEM_RESOURCE_ID = "item-entry";

const OBJECT_MODULES = Object.freeze({
  investigation: Object.freeze({
    rows: "investigation_points",
    label: "普通调查",
  }),
  treasure: Object.freeze({
    rows: "treasures",
    label: "调查物／宝箱",
  }),
});

function objectModule(moduleId) {
  const id = String(moduleId || "");
  const definition = OBJECT_MODULES[id];
  if (!definition) throw new TypeError(`场景对象引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function objectId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function objectIdFromReference({moduleId, entry = null, handle = "", value = ""} = {}) {
  const fromEntry = objectId(entry);
  if (fromEntry !== null) return fromEntry;
  const definition = objectModule(moduleId);
  const reference = String(handle || "").trim();
  const [prefix, encodedId, extra] = reference.split(":");
  if (prefix === definition.id && extra === undefined && /^[0-9a-f]{1,2}$/iu.test(encodedId || "")) {
    return Number.parseInt(encodedId, 16);
  }
  return objectId({id: value});
}

function objectIdHex(entry) {
  const id = objectId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function sceneIdHex(entry) {
  const id = Number(entry?.scene_id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff
    ? id.toString(16).toUpperCase().padStart(2, "0") : "??";
}

function sceneName(entry) {
  return String(entry?.scene_name || `场景 ${sceneIdHex(entry)}`);
}

function locationLabel(entry) {
  const x = Number(entry?.x);
  const y = Number(entry?.y);
  const coordinate = Number.isInteger(x) && Number.isInteger(y) ? `(${x}, ${y})` : "坐标未知";
  return `${sceneName(entry)} · ${coordinate}`;
}

function itemNameRecord(entry) {
  const direct = String(entry?.name_reference?.node_id || "");
  if (/^record:[0-9a-f]{2}:[0-9]{3}$/iu.test(direct)) return direct;
  const id = Number(entry?.name_text_record_id);
  const region = Number.parseInt(String(entry?.name_text_region ?? "00"), 16);
  if (!Number.isInteger(id) || id < 0 || id > 999
      || !Number.isInteger(region) || region < 0 || region > 0xff) return "";
  const regionHex = region.toString(16).toUpperCase().padStart(2, "0");
  return `record:${regionHex}:${String(id).padStart(3, "0")}`;
}

function currentItemName(entry, fallback) {
  const record = itemNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function investigationName(entry) {
  return String(entry?.facility_label || entry?.label
    || (entry?.command_id_hex ? `调查命令 ${entry.command_id_hex}` : "普通调查"));
}

function treasureName(entry) {
  if (entry?.content_label) return String(entry.content_label);
  if (entry?.content_kind === "money-reward-code") {
    const value = Number(entry?.money_base_value);
    return Number.isFinite(value) ? `金钱 ${value.toLocaleString()}` : "金钱奖励";
  }
  const itemId = Number(entry?.item_id ?? entry?.content_id);
  return Number.isInteger(itemId)
    ? `物品 $${itemId.toString(16).toUpperCase().padStart(2, "0")}` : "未知内容";
}

function objectName(entry, moduleId) {
  return moduleId === "investigation" ? investigationName(entry) : treasureName(entry);
}

function objectMeta(entry, moduleId) {
  if (moduleId === "investigation") {
    const command = String(entry?.command_id_hex || "");
    const instance = Number(entry?.instance_id);
    return [command ? `命令 ${command}` : "", Number.isInteger(instance) ? `实例 ${instance}` : ""]
      .filter(Boolean).join(" · ");
  }
  const content = Number(entry?.content_id);
  return Number.isInteger(content)
    ? `内容 $${content.toString(16).toUpperCase().padStart(2, "0")}` : "";
}

function sceneObjectPreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const definition = objectModule(moduleId);
  const id = objectIdFromReference({moduleId, entry, handle, value});
  const resolved = entry || {id};
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(definition.label)}引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-scene-object-module="${esc(moduleId)}" data-scene-object-id="${id}">
    <b>${esc(objectName(resolved, moduleId))}</b>
    <small>${esc(locationLabel(resolved))}</small>
  </span>`;
}

function sceneObjectReferenceItem(entry, reference) {
  const moduleId = String(reference?.module || "");
  objectModule(moduleId);
  const id = objectId(entry);
  if (id === null) return null;
  const idHex = objectIdHex(entry);
  const name = objectName(entry, moduleId);
  const location = locationLabel(entry);
  const meta = objectMeta(entry, moduleId);
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description: location,
    meta,
    preview: sceneObjectPreviewMarkup({moduleId, entry}),
    filter: [id, idHex, `0x${idHex}`, `$${idHex}`, `${moduleId}:${idHex}`,
      name, location, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

function sceneObjectRows(documentValue, moduleId) {
  const definition = objectModule(moduleId);
  const rows = documentValue?.[definition.rows];
  if (!Array.isArray(rows)) {
    throw new TypeError(`${SCENE_LOGIC_DOCUMENT_ID} 缺少 ${definition.rows} 候选表`);
  }
  return rows;
}

function enrichSceneObjects(rows, moduleId, sceneDocument, itemDocument) {
  const sceneById = new Map((sceneDocument?.editable_scenes || []).map(entry =>
    [Number(entry.id), entry]));
  const itemById = new Map((itemDocument?.records || []).map(entry =>
    [Number(entry.id), entry]));
  return rows.map(entry => {
    const scene = sceneById.get(Number(entry.scene_id));
    const enriched = {
      ...entry,
      scene_name: String(scene?.name || scene?.slug || `场景 ${sceneIdHex(entry)}`),
    };
    if (moduleId !== "treasure" || entry.content_kind !== "item") return enriched;
    const item = itemById.get(Number(entry.item_id ?? entry.content_id));
    const itemId = Number(entry.item_id ?? entry.content_id);
    const itemHex = Number.isInteger(itemId)
      ? itemId.toString(16).toUpperCase().padStart(2, "0") : "??";
    const fallback = String(item?.name || `物品 $${itemHex}`);
    return {
      ...enriched,
      content_label: item ? currentItemName(item, fallback) : fallback,
    };
  });
}

async function prepareSceneObjectComponent(props) {
  const moduleId = String(props.moduleId || "");
  objectModule(moduleId);
  try {
    const [logicDocument, sceneDocument, itemDocument] = await Promise.all([
      db.getDocument(SCENE_LOGIC_DOCUMENT_ID, null),
      db.getDocument(SCENE_CATALOG_DOCUMENT_ID, null),
      moduleId === "treasure" ? db.getResourceDocument(ITEM_RESOURCE_ID, null) : null,
    ]);
    const entries = enrichSceneObjects(
      sceneObjectRows(logicDocument, moduleId),
      moduleId,
      sceneDocument,
      itemDocument,
    ).sort((left, right) => Number(left.id) - Number(right.id));
    const requestedId = objectIdFromReference({...props, moduleId});
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => objectId(entry) === requestedId) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function sceneObjectReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = objectModule(moduleId);
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, definition] of Object.entries(OBJECT_MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: sceneObjectReferenceItem,
    className: "scene-object-reference-field",
    filterLabel: `过滤${definition.label}`,
    filterPlaceholder: "ID／场景／坐标／内容",
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareSceneObjectComponent,
      render: sceneObjectPreviewMarkup,
    });
  }

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareSceneObjectComponent,
    render: sceneObjectReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });
}
