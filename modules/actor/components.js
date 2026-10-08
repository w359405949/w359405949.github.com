// @editor-module actor-motion owner 的静态候选、显示名与预览
//
// 43 条动作只从源码点名的 actor-visual/motions 读取；不遍历模块图、manifest
// 或运行时资源来猜。动作像素依赖调用方的 CHR context，因此通用封面如实预览
// 动作类别和帧序列，不拿任意 CHR bank 冒充精确画面。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

const ACTOR_MOTION_MODULE_ID = "actor-motion";
const ACTOR_MOTION_RESOURCE_ID = "actor-visual";

const MOTION_KIND_LABELS = Object.freeze({
  "single-frame": "单帧",
  "directional-4x2": "四方向动作",
  "directionless-sequence": "无方向序列",
});

function motionId(entry) {
  const id = String(entry?.id || "").trim();
  return /^[a-z0-9][a-z0-9-]*$/u.test(id) ? id : "";
}

function motionIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const fromEntry = motionId(entry);
  if (fromEntry) return fromEntry;
  const reference = String(handle || value || "").trim();
  const match = /^actor-motion:([a-z0-9][a-z0-9-]*)$/u.exec(reference);
  return match ? match[1] : (/^[a-z0-9][a-z0-9-]*$/u.test(reference) ? reference : "");
}

function motionKind(entry) {
  const kind = String(entry?.kind || "");
  return MOTION_KIND_LABELS[kind] || kind || "角色动作";
}

function motionName(entry) {
  const id = motionId(entry);
  return String(entry?.label || (id ? `角色动作 ${id}` : "未知角色动作"));
}

function motionFrames(entry) {
  return Array.isArray(entry?.frame_ids)
    ? entry.frame_ids.filter(value => Number.isInteger(Number(value))).map(Number)
    : [];
}

function frameSummary(entry) {
  const frames = motionFrames(entry);
  if (!frames.length) return "没有帧";
  const visible = frames.slice(0, 6).map(value =>
    `$${value.toString(16).toUpperCase().padStart(2, "0")}`);
  return `${frames.length} 帧 · ${visible.join(" ")}${frames.length > visible.length ? " …" : ""}`;
}

function actorMotionPreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const id = motionIdFromReference({entry, handle, value});
  const resolved = entry || {id};
  if (!id) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>角色动作引用未解析</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-actor-motion-reference="${esc(id)}">
    <b>${esc(motionName(resolved))}</b>
    <small>${esc(`${motionKind(resolved)} · ${frameSummary(resolved)}`)}</small>
  </span>`;
}

function actorMotionReferenceItem(entry) {
  const id = motionId(entry);
  if (!id) return null;
  const name = motionName(entry);
  const kind = motionKind(entry);
  const frames = frameSummary(entry);
  return {
    value: id,
    label: name,
    description: kind,
    meta: frames,
    preview: actorMotionPreviewMarkup({entry}),
    filter: [id, `actor-motion:${id}`, name, kind, frames]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function actorMotionRows(documentValue) {
  const motions = documentValue?.motions;
  if (!Array.isArray(motions)) {
    throw new TypeError(`${ACTOR_MOTION_RESOURCE_ID} 缺少 motions 候选表`);
  }
  return motions;
}

async function prepareActorMotionComponent(props) {
  try {
    const documentValue = await db.getResourceDocument(ACTOR_MOTION_RESOURCE_ID, null);
    const entries = actorMotionRows(documentValue);
    const requestedId = motionIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => motionId(entry) === requestedId) || null,
      error: entries.length ? "" : "actor-motion 的静态候选值域为空",
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function actorMotionReferencePickerMarkup({
  entries = [],
  value = null,
  label = "角色动作",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: ACTOR_MOTION_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(ACTOR_MOTION_MODULE_ID, {
  item: actorMotionReferenceItem,
  className: "actor-motion-reference-field",
  filterLabel: "过滤角色动作",
  filterPlaceholder: "动作 ID／名称／类别／帧",
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(ACTOR_MOTION_MODULE_ID, kind, {
    prepare: prepareActorMotionComponent,
    render: actorMotionPreviewMarkup,
  });
}

registerModuleComponent(ACTOR_MOTION_MODULE_ID, "reference", {
  prepare: prepareActorMotionComponent,
  render: actorMotionReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});
