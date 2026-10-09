import './components-BtgMeFr-.js';
import './components-BzBzUfap.js';
import { prepareStoryReferenceDetails, paintStoryReferenceDetails } from './interaction-components-cOINn83e.js';
import './zone-components-3vA-12jF.js';
import './components-3dCXHuuQ.js';
import './components-CzR4vjXT.js';
import './text-record-structure-editor-nkc-6gHL.js';
import { storyCommandOperandReference, mountStoryInsertedOperand, storyTextMarkup, storyTextHandle, storyScriptHandle, storySceneLink, storyResourceMarkup } from './visual-components-jpzfYr1D.js';
import './components-DyJFa-y0.js';
import './components-DqADvo3I.js';
import './step-effects-eGj8g2ZS.js';
import './components-D8GMS6HI.js';
import './document-controls-CnG0ytdg.js';
import './components-DMn22Gww.js';
import './actor-appearance-C7XjeDLZ.js';
import { registerModuleComponent, esc, registerModuleComponentFallback, currentTextReference, metaspriteContextSources, blitRaster, metaspriteObjectImage, byteRecords, nesPalette, storySceneActions, storySceneActionPresentation, prepareModuleComponent, physicalLocationMarkup, prepareStorySceneActions, resourceForwardReferenceCell, recordUid, $ } from './element-tree-DsgOBeTK.js';
import { replaceHistoryUrl, render } from './ui-editor-nodes-CtPdwTyu.js';
import { state } from './emulator-DynsZsth.js';
import { db, healingRange, decodeGenericObjects, decodeDirectFrames, VISUAL_ACTORS_RESOURCE_ID, hex } from './battle-result-script-runtime-B_EClFew.js';
import { handleMarkup, actorAppearanceContextForScene, actorAtlasCanvas, peekActorAppearance, handleTextMarkup, ACTOR_ENTRY_SCENE_OBJECT, actorMotionCatalogFromDocument, ACTOR_ENTRY_TYPE_SELECTOR, ACTOR_MOTION_DIRECTIONAL, ACTOR_MOTION_DIRECTIONLESS, ACTOR_MOTION_SINGLE, actorPoseForAppearance, paintActorAtlasCanvases } from './preview-DMSrQMyk.js';
import { registerReferenceFieldPresentation, hydrateReferenceFieldPickers, referenceFieldPickerMarkup, configureAnimatedResourcePicker } from './scene-elevators-N46oPTJC.js';
import { editorLog, fileUrl } from './visual-metasprites-DJP54-bV.js';
import { saveEventHref, eventFlagReferenceMarkup } from './timeline-player-y3hI_sah.js';
import { paletteSwatches, recordPage, panel, fields } from './record-BUqGpJTU.js';
import { dataTable } from './pattern-pixel-editor-B8puYQ8A.js';
import { sceneCameraByte, sceneCameraCoordinate } from './ui-construction-preview-C97hIjGW.js';
import { mountFieldObjectArrayPosition, mountFieldObjectArrayReference, mountFieldObjectField } from './rectangle-preset-controls-vTa_haKM.js';

// @editor-module actor-motion owner 的静态候选、显示名与预览
//
// 43 条动作只从源码点名的 actor-visual/motions 读取；不遍历模块图、manifest
// 或运行时资源来猜。动作像素依赖调用方的 CHR context，因此通用封面如实预览
// 动作类别和帧序列，不拿任意 CHR bank 冒充精确画面。


const ACTOR_MOTION_MODULE_ID = "actor-motion";
const ACTOR_MOTION_RESOURCE_ID = "actor-visual";

const MOTION_KIND_LABELS = Object.freeze({
  "single-frame": "单帧",
  "directional-4x2": "四方向动作",
  "directionless-sequence": "无方向序列",
  "directional-4x2-tail": "四方向帧表尾部",
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

function frameSummary$1(entry) {
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
    <small>${esc(`${motionKind(resolved)} · ${frameSummary$1(resolved)}`)}</small>
  </span>`;
}

function actorMotionReferenceItem(entry) {
  const id = motionId(entry);
  if (!id) return null;
  const name = motionName(entry);
  const kind = motionKind(entry);
  const frames = frameSummary$1(entry);
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

function actorMotionRows$1(documentValue) {
  const motions = documentValue?.motions;
  if (!Array.isArray(motions)) {
    throw new TypeError(`${ACTOR_MOTION_RESOURCE_ID} 缺少 motions 候选表`);
  }
  return motions;
}

async function prepareActorMotionComponent(props) {
  try {
    const documentValue = await db.getResourceDocument(ACTOR_MOTION_RESOURCE_ID, null);
    const entries = actorMotionRows$1(documentValue);
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

// @editor-module 其余战斗 owner 的精确引用供给
//
// 候选分别固定读取 attack-visual-aux-script 与 battle-action 正文。渲染前只保留
// owner 的语义身份、动作摘要与模块引用，不把脚本编码、指针或配置字节带进消费页。


const ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID = "attack-visual-aux-script";
const BATTLE_ACTION_MODULE_ID = "battle-action";

const DEFINITIONS = Object.freeze({
  [ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID]: Object.freeze({
    resourceId: ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID,
    schema: "metalmaxcn.weapon-effect.asset.attack-visual-aux-script.document",
    expectedRecords: 26,
    firstId: 0,
    lastId: 25,
    sanitize: sanitizeAuxScript,
    item: auxScriptReferenceItem,
    preview: auxScriptPreviewMarkup,
    label: "攻击视觉辅助脚本",
    filterLabel: "过滤攻击视觉辅助脚本",
    filterPlaceholder: "ID／句柄／动作／引用关系",
  }),
  [BATTLE_ACTION_MODULE_ID]: Object.freeze({
    resourceId: BATTLE_ACTION_MODULE_ID,
    schema: "metalmaxcn.module-asset.battle-action",
    expectedRecords: 254,
    firstId: 1,
    lastId: 254,
    sanitize: sanitizeBattleAction,
    item: battleActionReferenceItem,
    preview: battleActionPreviewMarkup,
    label: "战斗动作",
    filterLabel: "过滤战斗动作",
    filterPlaceholder: "ID／句柄／布局／调色板",
  }),
});

function valueAtPath$5(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText$5(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath$5(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function declaredOpaqueItem(entry, reference) {
  const value = declaredText$5(entry, reference?.key);
  if (!value) return null;
  const label = declaredText$5(entry, reference?.name) || value;
  const description = declaredText$5(entry, reference?.description);
  const meta = declaredText$5(entry, reference?.meta) || value;
  return {
    value,
    label,
    description,
    meta,
    preview: `<span class="module-reference-data-preview" aria-hidden="true">
      <b>${esc(label)}</b>${description ? `<small>${esc(description)}</small>` : ""}
    </span>`,
    filter: [value, label, description, meta].filter(Boolean).join(" ").toLowerCase(),
  };
}

function moduleDefinition(moduleId) {
  const definition = DEFINITIONS[String(moduleId || "")];
  if (!definition) throw new TypeError(`未知战斗引用模块：${moduleId || "（空）"}`);
  return definition;
}

function moduleIdValue(moduleId, value) {
  if (value === null || value === undefined || value === "") return null;
  const definition = moduleDefinition(moduleId);
  const number = Number(value);
  return Number.isInteger(number)
    && number >= definition.firstId
    && number <= definition.lastId ? number : null;
}

function idHex$4(moduleId, value) {
  const id = moduleIdValue(moduleId, value?.id ?? value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle$3(moduleId, value) {
  moduleDefinition(moduleId);
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`^${escaped}:([0-9a-f]{1,2})$`, "iu")
    .exec(String(value || "").trim());
  if (!match) return "";
  const id = moduleIdValue(moduleId, Number.parseInt(match[1], 16));
  return id === null ? "" : `${moduleId}:${idHex$4(moduleId, id)}`;
}

function requestedId$3(moduleId, {entry = null, handle = "", value = ""} = {}) {
  const direct = moduleIdValue(moduleId, entry?.id);
  if (direct !== null) return direct;
  const normalized = normalizeHandle$3(moduleId, handle || value);
  return normalized
    ? Number.parseInt(normalized.split(":").at(-1), 16)
    : moduleIdValue(moduleId, value);
}

function recordHandle(moduleId, entry) {
  const direct = normalizeHandle$3(moduleId, entry?.handle);
  const id = moduleIdValue(moduleId, entry?.id);
  return direct || (id === null ? "" : `${moduleId}:${idHex$4(moduleId, id)}`);
}

function semanticCommandName(value) {
  return String(value || "").trim().replaceAll("_", " ");
}

function sanitizeAuxScript(entry) {
  if (entry?.owner !== ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID
      || !Array.isArray(entry?.commands) || !Array.isArray(entry?.direct_references)) {
    throw new TypeError(`${entry?.handle || ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID} 缺少动作或引用摘要`);
  }
  const commandNames = entry.commands.map(command => semanticCommandName(command?.name));
  if (commandNames.some(name => !name) || typeof entry?.decode_status !== "string") {
    throw new TypeError(`${entry?.handle || ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID} 的语义摘要无效`);
  }
  const targets = [...new Set(entry.direct_references
    .map(reference => String(reference?.target || "")).filter(Boolean))];
  return {
    id: entry?.id,
    id_hex: entry?.id_hex,
    handle: entry?.handle,
    decode_status: entry?.decode_status,
    command_names: commandNames,
    direct_targets: targets,
  };
}

function auxScriptSummary(entry) {
  const actions = Array.isArray(entry?.command_names) ? entry.command_names : [];
  return `${actions.length} 条动作`;
}

function auxScriptPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId$3(ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID, {entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>辅助脚本 ?</b><small>${esc(error || "攻击视觉辅助脚本引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>辅助脚本 ${idHex$4(ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID, id)}</b>
    <small>${esc(entry ? auxScriptSummary(entry) : "攻击视觉动作流程")}</small>
  </span>`;
}

function auxScriptReferenceItem(entry, reference = null) {
  const moduleId = ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID;
  let semanticEntry = entry;
  if (!Array.isArray(entry?.command_names)) {
    try {
      semanticEntry = sanitizeAuxScript(entry);
    } catch (_error) {
      return declaredOpaqueItem(entry, reference);
    }
  }
  const id = moduleIdValue(moduleId, semanticEntry?.id);
  const handle = recordHandle(moduleId, semanticEntry);
  // The shared mechanism contract injects opaque, non-owner rows to test dispatch.
  // Preserve their declared identity without normalizing it into an owner alias;
  // the exact component's own published table is still validated below.
  if (id === null || !handle) return declaredOpaqueItem(entry, reference);
  const summary = auxScriptSummary(semanticEntry);
  const names = semanticEntry.command_names || [];
  return {
    value: declaredText$5(semanticEntry, reference?.key) || String(id),
    label: `${idHex$4(moduleId, id)} · 攻击视觉辅助脚本`,
    description: summary,
    meta: handle,
    preview: auxScriptPreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex$4(moduleId, id), handle, summary, ...names,
      ...(semanticEntry.direct_targets || [])]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function sanitizeBattleAction(entry) {
  const paletteId = Number(entry?.palette_id);
  const columns = Number(entry?.columns);
  const rows = Number(entry?.rows);
  const available = entry?.available === true;
  const layoutReference = entry?.layout_reference
    ? String(entry.layout_reference) : "";
  if (typeof entry?.available !== "boolean"
      || !Number.isInteger(columns) || columns < 1
      || !Number.isInteger(rows) || rows < 1
      || !Number.isInteger(paletteId) || paletteId < 0 || paletteId > 0x1f
      || (available && !/^battle-object-layout:[0-9a-f]{3}$/iu.test(layoutReference))) {
    throw new TypeError(`${entry?.handle || BATTLE_ACTION_MODULE_ID} 的语义布局无效`);
  }
  return {
    id: entry?.id,
    id_hex: entry?.id_hex,
    handle: entry?.handle,
    columns,
    rows,
    available,
    layout_reference: layoutReference,
    palette_reference: `sprite-palette:${paletteId.toString(16).toUpperCase().padStart(2, "0")}`,
  };
}

function battleActionSummary(entry) {
  if (!entry?.available) return "保留动作槽 · 当前没有可用布局";
  return [
    `${entry.columns}×${entry.rows} 对象布局`,
  ].join(" · ");
}

function battleActionPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId$3(BATTLE_ACTION_MODULE_ID, {entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>战斗动作 ?</b><small>${esc(error || "战斗动作引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>战斗动作 ${idHex$4(BATTLE_ACTION_MODULE_ID, id)}</b>
    <small>${esc(entry ? battleActionSummary(entry) : "战斗对象编排")}</small>
  </span>`;
}

function battleActionReferenceItem(entry, reference = null) {
  const moduleId = BATTLE_ACTION_MODULE_ID;
  let semanticEntry = entry;
  if (!Object.hasOwn(entry || {}, "palette_reference")) {
    try {
      semanticEntry = sanitizeBattleAction(entry);
    } catch (_error) {
      return declaredOpaqueItem(entry, reference);
    }
  }
  const id = moduleIdValue(moduleId, semanticEntry?.id);
  const handle = recordHandle(moduleId, semanticEntry);
  if (id === null || !handle) return declaredOpaqueItem(entry, reference);
  const summary = battleActionSummary(semanticEntry);
  return {
    value: declaredText$5(semanticEntry, reference?.key) || String(id),
    label: `${idHex$4(moduleId, id)} · 战斗动作`,
    description: summary,
    meta: handle,
    preview: battleActionPreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex$4(moduleId, id), handle, summary,
      semanticEntry.layout_reference, semanticEntry.palette_reference]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function validateRows(moduleId, documentValue) {
  const definition = moduleDefinition(moduleId);
  if (!documentValue || documentValue.schema !== definition.schema) {
    throw new TypeError(`${definition.resourceId} owner 正文无效`);
  }
  const records = documentValue.records;
  if (!Array.isArray(records) || records.length !== definition.expectedRecords
      || Number(documentValue.record_count) !== records.length) {
    throw new TypeError(`${definition.resourceId} 必须发布 ${definition.expectedRecords} 条记录`);
  }
  const entries = records.map(definition.sanitize);
  const identities = entries.map(entry => recordHandle(moduleId, entry));
  const consistent = entries.every((entry, index) => {
    const id = moduleIdValue(moduleId, entry.id);
    return id !== null && identities[index] === `${moduleId}:${idHex$4(moduleId, id)}`;
  });
  if (!consistent || identities.some(identity => !identity)
      || new Set(identities).size !== entries.length) {
    throw new TypeError(`${definition.resourceId} 的候选身份为空或重复`);
  }
  return entries;
}

async function prepareBattleReferenceComponent(props) {
  try {
    const definition = moduleDefinition(props.moduleId);
    const entries = validateRows(
      props.moduleId,
      await db.getResourceDocument(definition.resourceId, null),
    );
    const requested = requestedId$3(props.moduleId, props);
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

function battleReferencePickerMarkup({
  moduleId, entries = [], value = null, label = "", controlMarkup = "",
  componentAttributes = "", error = "", reference = null,
} = {}) {
  const definition = moduleDefinition(moduleId);
  return referenceFieldPickerMarkup({
    reference: reference || {module: moduleId, key: ["id"]},
    rows: entries,
    value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, definition] of Object.entries(DEFINITIONS)) {
  registerReferenceFieldPresentation(moduleId, {
    item: definition.item,
    className: `${moduleId}-reference-field`,
    filterLabel: definition.filterLabel,
    filterPlaceholder: definition.filterPlaceholder,
  });
  registerModuleComponent(moduleId, "reference", {
    prepare: prepareBattleReferenceComponent,
    render: battleReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });
  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareBattleReferenceComponent,
      render: definition.preview,
    });
  }
}

// @editor-module audio-sequence owner 的音色包络与音序流候选呈现。
// 候选身份始终服从字段声明的 owner 表；本组件只补 owner 专有的显示信息。


const AUDIO_SEQUENCE_GRAPH_MODULE_ID = "audio-sequence";

const ENVELOPE_REFERENCE = Object.freeze({
  module: AUDIO_SEQUENCE_GRAPH_MODULE_ID,
  key: Object.freeze(["pointer"]),
  name: Object.freeze(["pointer_hex"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["id_hex"])}),
});

function envelopePointer(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xffff ? number : null;
}

function pointerFromReference({entry = null, handle = "", value = ""} = {}) {
  const entryPointer = envelopePointer(entry?.pointer);
  if (entryPointer !== null) return entryPointer;
  const text = String(handle || value || "").trim();
  if (!text) return null;
  const parsed = /^0x[0-9a-f]+$/iu.test(text)
    ? Number.parseInt(text.slice(2), 16) : Number(text);
  return envelopePointer(parsed);
}

function selectableEnvelope(entry) {
  return envelopePointer(entry?.pointer) !== null
    && entry?.program && typeof entry.program === "object"
    && !String(entry?.status || "").startsWith("invalid-reserved-sentinel");
}

function pointerHex(entry) {
  const pointer = envelopePointer(entry?.pointer);
  return String(entry?.pointer_hex
    || (pointer === null ? "????" : `0x${pointer.toString(16).toUpperCase().padStart(4, "0")}`));
}

function voiceId(entry) {
  return String(entry?.id_hex ?? entry?.id ?? "?");
}

function envelopeSummary(entry) {
  const count = Number(entry?.step_count);
  return [
    `音色 ${voiceId(entry)}`,
    Number.isInteger(count) && count >= 0 ? `${count} 个包络步` : "包络长度未定",
    String(entry?.status || "状态未定"),
  ].join(" · ");
}

function envelopePreviewMarkup({
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const pointer = pointerFromReference({entry, handle, value});
  if (pointer === null || !entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "音色包络引用未解析")}</small></span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-audio-sequence-envelope="${esc(String(pointer))}">
    <b>音色 ${esc(voiceId(entry))}</b><small>音色包络程序</small>
  </span>`;
}

function envelopeReferenceItem(entry) {
  const pointer = envelopePointer(entry.pointer);
  if (pointer === null) return null;
  const summary = envelopeSummary(entry);
  return {
    value: String(pointer),
    label: `音色 ${voiceId(entry)}`,
    description: "音色包络程序",
    meta: '',
    preview: envelopePreviewMarkup({entry}),
    filter: [pointer, pointerHex(entry), voiceId(entry), summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function streamReferenceItem(entry) {
  const pointer = envelopePointer(entry?.entry_pointer);
  if (pointer === null || !Array.isArray(entry?.source_command_ids)
      || !entry.source_command_ids.length) return null;
  const commandIds = entry.source_command_ids.map(value => String(value));
  const commandLabel = `命令 ${commandIds.join(" / ")}`;
  const channel = String(entry.channel_label || entry.channel_key || "声道未定");
  const parserMode = String(entry.parser_mode || "解析模式未定");
  const status = String(entry.status || "状态未定");
  return {
    value: String(pointer),
    label: commandLabel,
    description: channel,
    meta: '',
    preview: `<span class="module-reference-data-preview">
      <b>${esc(channel)}</b><small>${esc(commandLabel)}</small></span>`,
    filter: [commandIds.join(" "), channel, entry.channel_key, parserMode, status]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function audioSequenceReferenceItem(entry, reference) {
  return reference?.key?.length === 1 && reference.key[0] === "entry_pointer"
    ? streamReferenceItem(entry) : envelopeReferenceItem(entry);
}

function envelopeCandidate(entry) {
  const stepCount = Number(entry.program.instruction_count ?? entry.length);
  if (!Number.isInteger(stepCount) || stepCount < 0) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID}.voice_table 包络步数无效`);
  }
  return {
    pointer: envelopePointer(entry.pointer),
    pointer_hex: pointerHex(entry),
    id: entry.id,
    id_hex: voiceId(entry),
    status: String(entry.status || "状态未定"),
    step_count: stepCount,
  };
}

function envelopeRows(documentValue) {
  if (!Array.isArray(documentValue?.voice_table)) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID} 缺少 voice_table 候选表`);
  }
  // 组件边界只交付 picker 所需的语义投影。地址范围、原始程序与编码细节
  // 仍留在 sequence-graph owner 正文里，不暴露给消费字段。
  const rows = documentValue.voice_table.filter(selectableEnvelope)
    .map(envelopeCandidate);
  const pointers = rows.map(entry => envelopePointer(entry.pointer));
  if (new Set(pointers).size !== pointers.length) {
    throw new TypeError(`${AUDIO_SEQUENCE_GRAPH_MODULE_ID}.voice_table 候选键不唯一`);
  }
  return rows;
}

async function prepareEnvelopeComponent(props) {
  try {
    const documentValue = await db.getResourceDocument(AUDIO_SEQUENCE_GRAPH_MODULE_ID, null);
    const entries = envelopeRows(documentValue);
    const requestedPointer = pointerFromReference(props);
    return {
      ...props,
      entries,
      entry: entries.find(entry =>
        envelopePointer(entry.pointer) === requestedPointer) || null,
      error: entries.length ? "" : "音色包络的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], entry: null,
      error: `候选项不可用：${error?.message || error}`};
  }
}

function envelopeReferenceMarkup({
  entries = [],
  value = null,
  label = "音色包络",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: ENVELOPE_REFERENCE,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(AUDIO_SEQUENCE_GRAPH_MODULE_ID, {
  item: audioSequenceReferenceItem,
  currentLabel: entry => entry.entry_pointer == null ? `音色 ${voiceId(entry)}`
    : `命令 ${(entry.source_command_ids || []).join(' / ')}`,
  className: "audio-sequence-reference-field audio-sequence-envelope-reference-field",
  filterLabel: "过滤音序资源",
  filterPlaceholder: "音色／命令／声道",
});

registerModuleComponent(AUDIO_SEQUENCE_GRAPH_MODULE_ID, "reference", {
  prepare: prepareEnvelopeComponent,
  render: envelopeReferenceMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(AUDIO_SEQUENCE_GRAPH_MODULE_ID, kind, {
    prepare: prepareEnvelopeComponent,
    render: envelopePreviewMarkup,
  });
}

// @editor-module 每个 owner 的保底身份组件

// 字段对象没有自己的导航入口与页面，所以身份只显示，不给链接。
function ownerIdentity({moduleId, module = null, handle = "", value = ""}) {
  const identity = String(handle || value || moduleId);
  return {
    identity,
    title: module?.title || moduleId,
  };
}

function genericModulePreviewMarkup({
  moduleId,
  module = null,
  handle = "",
  value = "",
  compact = false,
  componentAttributes = "",
} = {}) {
  const owner = ownerIdentity({moduleId, module, handle, value});
  return `<span class="module-identity-preview${compact ? " compact" : ""}" ${componentAttributes}>
    <span class="module-identity-glyph" aria-hidden="true">${esc(
      owner.title.slice(0, 1).toUpperCase())}</span>
    <span><b>${esc(owner.title)}</b><small class="mono">${esc(owner.identity)}</small></span>
  </span>`;
}

function genericModuleReferenceMarkup({
  moduleId,
  module = null,
  handle = "",
  value = "",
  controlMarkup = "",
  componentAttributes = "",
} = {}) {
  return `<span class="module-generic-reference" ${componentAttributes}>
    ${genericModulePreviewMarkup({moduleId, module, handle, value, compact: true})}
    ${controlMarkup ? `<span class="module-generic-reference-control">${controlMarkup}</span>` : ""}
  </span>`;
}

function syncGenericModuleReferences(root) {
  const hosts = [
    ...(root.matches?.('.module-generic-reference') ? [root] : []),
    ...root.querySelectorAll('.module-generic-reference'),
  ];
  for (const host of hosts) {
    const control = host.querySelector('select, input');
    const identity = host.querySelector('.module-identity-preview small.mono');
    if (control && identity) identity.textContent = control.value;
  }
}

registerModuleComponentFallback("preview", {render: genericModulePreviewMarkup});
registerModuleComponentFallback("cover", {render: genericModulePreviewMarkup});
registerModuleComponentFallback("reference", {
  render: genericModuleReferenceMarkup, sync: syncGenericModuleReferences,
});

// @editor-module field-item-use owner 的引用供给
//
// 38 项候选只来自正式发布的 field-item-use owner 正文；item-entry 与文本区只补
// 当前道具名称，不参与拼候选值域。消费端只看到行为句柄与用途摘要，不接触 handler、
// 字节偏移或分发表的物理编码。


const FIELD_ITEM_USE_MODULE_ID = "field-item-use";
const FIELD_ITEM_USE_RESOURCE_ID = FIELD_ITEM_USE_MODULE_ID;
const ITEM_DIRECTORY_RESOURCE_ID = "item-entry";

function valueAtPath$4(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText$4(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath$4(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function byteId$3(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 0xff ? number : null;
}

function hexByte$2(value) {
  const id = byteId$3(value);
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
  const id = byteId$3(entry?.id);
  return id === null ? "" : `${FIELD_ITEM_USE_MODULE_ID}:${hexByte$2(id)}`;
}

function requestedFieldItemUseHandle({entry = null, handle = "", value = ""} = {}) {
  const direct = fieldItemUseHandle(entry)
    || normalizeFieldItemUseHandle(handle || value);
  if (direct) return direct;
  const id = byteId$3(value);
  return id === null ? "" : `${FIELD_ITEM_USE_MODULE_ID}:${hexByte$2(id)}`;
}

function itemReferenceForRecord(item) {
  const owner = String(item?.category?.owner || "");
  const id = byteId$3(item?.id);
  return id === null || !["human", "tank"].includes(owner)
    ? "" : `${owner}-item:${hexByte$2(id)}`;
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

function itemNameRecord$1(item) {
  const id = byteId$3(item?.name_text_record_id);
  const region = Number.parseInt(String(item?.name_text_region ?? ""), 16);
  return id === null || !Number.isInteger(region) || region < 0 || region > 0xff
    ? ""
    : `record:${hexByte$2(region)}:${String(id).padStart(3, "0")}`;
}

function currentItemName$1(entry) {
  const item = activeItemRecord(entry);
  const fallback = String(item?.name || "").trim();
  const textRecord = itemNameRecord$1(item);
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
    family.label || "",
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
      <b>${esc(identity)}</b>${error ? `<small role="alert">${esc(error)}</small>` : ''}</span>`;
  }
  if (!entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>场景道具行为</b><small>${esc(identity)}</small></span>`;
  }
  const effect = String(entry?.effect_family?.label || "");
  const detail = itemCategoryLabel(entry);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc([currentItemName$1(entry), effect].filter(Boolean).join(' · '))}</b><small>${esc(detail)}</small>
  </span>`;
}

function fieldItemUseReferenceItem(entry, reference = null) {
  const handle = fieldItemUseHandle(entry);
  const id = byteId$3(entry?.id);
  if (!handle || id === null) return null;
  const itemName = currentItemName$1(entry);
  const description = declaredText$4(entry, reference?.description)
    || effectDescription(entry);
  const meta = declaredText$4(entry, reference?.meta) || [
    handle,
    itemCategoryLabel(entry),
  ].join(" · ");
  const textLabels = currentTextLabels(entry);
  return {
    value: declaredText$4(entry, reference?.key) || handle,
    label: `${hexByte$2(id)} · ${itemName}`,
    description,
    meta,
    preview: fieldItemUsePreviewMarkup({entry}),
    filter: [
      id,
      hexByte$2(id),
      `0x${hexByte$2(id)}`,
      `$${hexByte$2(id)}`,
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
    const id = byteId$3(entry?.id);
    const handle = normalizeFieldItemUseHandle(entry?.handle);
    const itemReference = normalizeItemReference(entry?.item_reference);
    if (id === null || handle !== `${FIELD_ITEM_USE_MODULE_ID}:${hexByte$2(id)}`
        || itemReference.split(":").at(-1) !== hexByte$2(id)) {
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

// @editor-module party-healing-service owner 的精确引用供给
//
// 四项候选固定来自回复服务正文；这里只展示游戏规则数值及其道具引用，不复制
// 道具名称，也不把代码来源范围带进消费页。


const PARTY_HEALING_SERVICE_MODULE_ID = "party-healing-service";
const EXPECTED_SCHEMA$2 = "metalmaxcn.module-asset.party-healing-service";
const EXPECTED_RECORDS$2 = 4;

function healingId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 0xa9 && number <= 0xac ? number : null;
}

function idHex$3(value) {
  const id = healingId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle$2(value) {
  const match = /^party-healing-service:([0-9a-f]{2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = healingId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${PARTY_HEALING_SERVICE_MODULE_ID}:${idHex$3(id)}`;
}

function requestedId$2({entry = null, handle = "", value = ""} = {}) {
  const direct = healingId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle$2(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : healingId(value);
}

function valueAtPath$3(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText$3(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath$3(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function healingSummary(entry) {
  const range = healingRange(entry);
  return `回复 ${range.minimum_healing}–${range.maximum_healing} HP`;
}

function healingPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId$2({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>回复规则 ?</b><small>${esc(error || "队伍回复规则引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(entry ? healingSummary(entry) : `回复规则 ${idHex$3(id)}`)}</b>
    <small>${esc(entry?.item_reference || "队伍道具回复服务")}</small>
  </span>`;
}

function healingReferenceItem(entry, reference = null) {
  const id = healingId(entry);
  const handle = normalizeHandle$2(entry?.handle);
  if (id === null || !handle) return null;
  const summary = healingSummary(entry);
  return {
    value: declaredText$3(entry, reference?.key) || handle,
    label: `${idHex$3(id)} · 队伍回复规则`,
    description: summary,
    meta: `${handle} · ${entry.item_reference}`,
    preview: healingPreviewMarkup({entry}),
    filter: [id, idHex$3(id), handle, entry.item_reference, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function validateEntries$2(documentValue) {
  const records = documentValue?.records;
  if (documentValue?.schema !== EXPECTED_SCHEMA$2
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS$2
      || Number(documentValue?.record_count) !== records.length) {
    throw new TypeError(`${PARTY_HEALING_SERVICE_MODULE_ID} 必须发布 ${EXPECTED_RECORDS$2} 条 owner 记录`);
  }
  const entries = records.map(record => {
    const id = healingId(record);
    const handle = normalizeHandle$2(record?.handle);
    const itemReference = String(record?.item_reference || "");
    const base = Number(record?.base_healing);
    if (id === null || handle !== `${PARTY_HEALING_SERVICE_MODULE_ID}:${idHex$3(id)}`
        || itemReference !== `human-item:${idHex$3(id)}`
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
    const entries = validateEntries$2(
      await db.getResourceDocument(PARTY_HEALING_SERVICE_MODULE_ID, null),
    );
    const requested = requestedId$2(props);
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

// @editor-module metasprite owner 的 55 项候选与上下文预览
//
// 像素上下文只认资源索引发布的 uses-sprite-context；组件内部再沿该不透明 UID
// 解出图案表。消费页不传 bank，也不会在 DOM 里看到 bank。候选仍从当前
// metasprite-record 正文经 owner 解码器现解，编辑记录区后结构与像素都会同步。


const METASPRITE_MODULE_ID = "metasprite";
const METASPRITE_DOCUMENT_ID = "metasprite-record";
const VISUAL_RESOURCE_INDEX_ID = "resource-index.visual";
const SPRITE_CONTEXT_RELATION = "uses-sprite-context";
const CHR_BANK_RELATION = "uses-chr-bank";
const BATTLE_CONTEXT_STATUS = "battle-ui";
const POINTER_COUNT$1 = 55;

function byteId$2(value) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result < POINTER_COUNT$1 ? result : null;
}

function idFromReference({entry = null, handle = "", value = ""} = {}) {
  const direct = byteId$2(entry?.id);
  if (direct !== null) return direct;
  const match = /^metasprite:([0-9a-f]{1,2})$/iu.exec(String(handle || "").trim());
  return match ? Number.parseInt(match[1], 16) : byteId$2(value);
}

function idHex$2(value) {
  const id = byteId$2(value?.id ?? value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function objectBounds(entry) {
  const sprites = Array.isArray(entry?.sprites) ? entry.sprites : [];
  if (!sprites.length) return null;
  const xs = sprites.map(sprite => Number(sprite.x));
  const ys = sprites.map(sprite => Number(sprite.y));
  return {
    width: Math.max(...xs) + 8 - Math.min(...xs),
    height: Math.max(...ys) + 8 - Math.min(...ys),
  };
}

function objectSummary(entry) {
  if (!Array.isArray(entry?.sprites) && entry?.runtimeGenerated === undefined) {
    return "组合精灵记录 · 结构由 owner 从当前正文现解";
  }
  if (entry?.runtimeGenerated) return "运行时生成 · 无静态 sprite 记录";
  const sprites = Array.isArray(entry?.sprites) ? entry.sprites : [];
  const bounds = objectBounds(entry);
  return `${sprites.length} 枚 OAM sprite${
    bounds ? ` · ${bounds.width}×${bounds.height} px` : ""}${
    entry?.previewContext?.label ? ` · ${entry.previewContext.label}` : ""}`;
}

function objectLabel(entry) {
  return `Metasprite ${idHex$2(entry)}`;
}

function indexedRow(rows, uid) {
  return rows.find(row => row?.uid === uid) || null;
}

function spriteContextBankIds(context) {
  const references = Array.isArray(context?.references) ? context.references : [];
  const bankEdges = references.filter(edge => edge?.relation === CHR_BANK_RELATION);
  if (bankEdges.length !== 4) {
    throw new TypeError(`${context?.uid || "sprite context"} 缺少四条 ${CHR_BANK_RELATION} 关系`);
  }
  const banks = bankEdges.map(edge => {
    const match = /^chr-bank:([0-9a-f]{2})$/iu.exec(String(edge?.target || ""));
    if (!match) {
      throw new TypeError(`${context.uid} 的 ${CHR_BANK_RELATION} 目标无效`);
    }
    return Number.parseInt(match[1], 16);
  });
  if (new Set(banks).size !== banks.length) {
    throw new TypeError(`${context.uid} 的 ${CHR_BANK_RELATION} 目标重复`);
  }
  return banks;
}

/**
 * 把 metasprite 的资源身份收敛成一个不透明 sprite-context UID。
 * CHR bank 只在本 owner 的绘制 hook 内部解开，不作为返回值泄漏给消费页。
 */
function metaspritePreviewContext(rows, value) {
  if (!Array.isArray(rows)) {
    throw new TypeError(`${VISUAL_RESOURCE_INDEX_ID} 正文不可用`);
  }
  const id = byteId$2(value?.id ?? value);
  if (id === null || id === 0) return null;
  const uid = `${METASPRITE_MODULE_ID}:${idHex$2(id)}`;
  const resource = indexedRow(rows, uid);
  const contextEdges = (resource?.references || []).filter(
    edge => edge?.relation === SPRITE_CONTEXT_RELATION,
  );
  if (contextEdges.length !== 1) {
    throw new TypeError(`${uid} 缺少唯一 ${SPRITE_CONTEXT_RELATION} 关系`);
  }
  const contextUid = String(contextEdges[0].target || "");
  const context = indexedRow(rows, contextUid);
  if (!context || context.kind !== "sprite-context") {
    throw new TypeError(`${uid} 指向的 ${contextUid || "sprite context"} 未发布`);
  }
  if (context.status !== BATTLE_CONTEXT_STATUS) {
    throw new TypeError(`${contextUid} 没有已发布的 metasprite 调色板上下文`);
  }
  // 在准备阶段就验证整条已发布关系；返回给渲染层的仍只有不透明 UID。
  spriteContextBankIds(context);
  return Object.freeze({
    uid: contextUid,
    label: String(context.label || contextUid),
  });
}

function pixelPreviewMarkup(entry, componentAttributes) {
  const id = byteId$2(entry?.id);
  const context = entry?.previewContext;
  if (id === null || id === 0 || entry?.runtimeGenerated) return "";
  const label = [objectLabel(entry), context?.label].filter(Boolean).join(" · ");
  return `<span class="module-reference-data-preview" ${componentAttributes}
    style="position:relative;padding:0" title="${esc(label)}">
    <canvas width="64" height="64" data-metasprite-owner-preview
      data-metasprite-resource="${METASPRITE_MODULE_ID}:${esc(idHex$2(id))}"
      style="display:block;width:100%;height:100%;image-rendering:pixelated"
      aria-label="${esc(label)}"></canvas>
    <small style="position:absolute;right:2px;bottom:1px;padding:0 2px;background:#090c0ecc">${
      esc(idHex$2(id))}</small>
  </span>`;
}

function metaspritePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = idFromReference({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || "Metasprite 引用未解析")}</small></span>`;
  }
  const resolved = entry || {id, runtimeGenerated: id === 0, sprites: []};
  const pixelPreview = pixelPreviewMarkup(resolved, componentAttributes);
  if (pixelPreview) return pixelPreview;
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(objectLabel(resolved))}</b><small>${esc(objectSummary(resolved))}</small>
  </span>`;
}

function metaspriteReferenceItem(entry) {
  const id = byteId$2(entry?.id);
  if (id === null) return null;
  const hex = idHex$2(id);
  const summary = objectSummary(entry);
  return {
    value: String(id),
    label: `${hex} · ${objectLabel(entry)}`,
    description: summary,
    meta: `metasprite:${hex}`,
    preview: metaspritePreviewMarkup({entry}),
    filter: [id, hex, `0x${hex}`, `$${hex}`, `metasprite:${hex}`, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function decodeMetaspriteRows(documentValue) {
  const records = documentValue?.generic_pointers;
  if (!Array.isArray(records) || records.length !== POINTER_COUNT$1) {
    throw new TypeError(`${METASPRITE_DOCUMENT_ID} 缺少 55 条 generic_pointers`);
  }
  const pointers = new Uint16Array(POINTER_COUNT$1);
  const seen = new Set();
  for (const record of records) {
    const id = byteId$2(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (id === null || seen.has(id) || !Number.isInteger(pointer)
        || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${METASPRITE_DOCUMENT_ID} 的 generic pointer 无效`);
    }
    pointers[id] = pointer;
    seen.add(id);
  }
  return decodeGenericObjects(
    pointers,
    byteRecords(documentValue?.generic_record_region, "generic_record_region"),
  );
}

function metaspriteRowsWithContexts(documentValue, resourceIndex) {
  return decodeMetaspriteRows(documentValue).map(entry => entry.runtimeGenerated
    ? entry
    : {...entry, previewContext: metaspritePreviewContext(resourceIndex, entry)});
}

async function prepareMetaspriteComponent(props) {
  try {
    const [documentValue, resourceIndex] = await Promise.all([
      db.getDocument(METASPRITE_DOCUMENT_ID, null),
      db.getDocument(VISUAL_RESOURCE_INDEX_ID, null),
    ]);
    const entries = metaspriteRowsWithContexts(documentValue, resourceIndex);
    const requestedId = idFromReference(props);
    return {
      ...props,
      entries,
      entry: entries.find(entry => entry.id === requestedId) || props.entry || null,
      error: entries.length ? "" : "metasprite 的静态候选值域为空",
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function metaspriteReferencePickerMarkup({
  entries = [], value = null, label = "Metasprite", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: METASPRITE_MODULE_ID},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

function paintMetaspritePreviewError(canvas, error) {
  const message = String(error?.message || error);
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#170b0b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#ff6b6b";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(8, 8);
    context.lineTo(canvas.width - 8, canvas.height - 8);
    context.moveTo(canvas.width - 8, 8);
    context.lineTo(8, canvas.height - 8);
    context.stroke();
  }
  canvas.dataset.metaspriteOwnerError = message;
  canvas.title = message;
}

/** 绘制 hook 只消费不透明 context UID；bank 解析不会进入调用方标记。 */
async function paintMetaspriteOwnerPreviews(root = document) {
  const selector = "canvas[data-metasprite-owner-preview]";
  const canvases = [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ].filter(canvas => canvas.dataset.metaspriteOwnerPainted !== "1");
  if (!canvases.length) return;
  const resourceIndex = await db.getDocument(VISUAL_RESOURCE_INDEX_ID, null);
  for (const canvas of canvases) {
    try {
      const id = idFromReference({handle: canvas.dataset.metaspriteResource});
      const previewContext = metaspritePreviewContext(resourceIndex, id);
      const context = indexedRow(resourceIndex || [], previewContext?.uid);
      const sources = await metaspriteContextSources(spriteContextBankIds(context));
      const entry = sources.recipe.genericObjects.find(item => item.id === id);
      if (!entry || entry.runtimeGenerated) {
        throw new TypeError(`metasprite ${idHex$2(id)} 没有静态像素记录`);
      }
      blitRaster(canvas, metaspriteObjectImage(sources, entry, {size: 64, scale: 3}));
      canvas.dataset.metaspriteOwnerPainted = "1";
      delete canvas.dataset.metaspriteOwnerError;
    } catch (error) {
      paintMetaspritePreviewError(canvas, error);
    }
  }
}

registerReferenceFieldPresentation(METASPRITE_MODULE_ID, {
  item: metaspriteReferenceItem,
  paint: paintMetaspriteOwnerPreviews,
  className: "metasprite-reference-field",
  filterLabel: "过滤 Metasprite",
  filterPlaceholder: "ID／sprite 数／尺寸／运行时记录",
});

registerModuleComponent(METASPRITE_MODULE_ID, "reference", {
  prepare: prepareMetaspriteComponent,
  render: metaspriteReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(METASPRITE_MODULE_ID, kind, {
    prepare: prepareMetaspriteComponent,
    render: metaspritePreviewMarkup,
    hydrate: paintMetaspriteOwnerPreviews,
  });
}

// @editor-module direct-frame owner 的精确引用供给
//
// 候选身份固定来自 direct-frame 正文；结构由 metasprite-record 正文交给既有 owner
// 解码器。这里刻意不选择 CHR bank 或调色板，只展示能由 owner 独立确认的网格结构。


const DIRECT_FRAME_MODULE_ID = "direct-frame";
const DIRECT_FRAME_STRUCTURE_RESOURCE_ID = "metasprite-record";
const EXPECTED_RECORDS$1 = 69;
const POINTER_COUNT = 70;
const EXPECTED_SCHEMA$1 = "metalmaxcn.semantic-owner.direct-frame.document";

function frameId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 1 && number <= EXPECTED_RECORDS$1
    ? number : null;
}

function idHex$1(value) {
  const id = frameId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle$1(value) {
  const match = /^direct-frame:([0-9a-f]{1,2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = frameId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${DIRECT_FRAME_MODULE_ID}:${idHex$1(id)}`;
}

function requestedId$1({entry = null, handle = "", value = ""} = {}) {
  const direct = frameId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle$1(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : frameId(value);
}

function valueAtPath$2(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText$2(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath$2(entry, path);
  return value === null || value === undefined ? "" : String(value);
}

function decodeStructure(documentValue) {
  const records = documentValue?.direct_frame_pointers;
  if (!Array.isArray(records) || records.length !== POINTER_COUNT) {
    throw new TypeError(`${DIRECT_FRAME_STRUCTURE_RESOURCE_ID} 缺少 ${POINTER_COUNT} 条直接帧指针记录`);
  }
  const pointers = new Uint16Array(POINTER_COUNT);
  const seen = new Set();
  for (const record of records) {
    const id = Number(record?.id);
    const pointer = Number(record?.pointer_cpu);
    if (!Number.isInteger(id) || id < 0 || id >= POINTER_COUNT || seen.has(id)
        || !Number.isInteger(pointer) || pointer < 0 || pointer > 0xffff) {
      throw new TypeError(`${DIRECT_FRAME_STRUCTURE_RESOURCE_ID} 的直接帧指针记录无效`);
    }
    pointers[id] = pointer;
    seen.add(id);
  }
  const decoded = decodeDirectFrames(
    pointers,
    byteRecords(documentValue?.direct_frame_record_region, "direct_frame_record_region"),
  );
  return new Map(decoded.map(frame => [frame.id, {
    runtimeGenerated: Boolean(frame.runtimeGenerated),
    columns: Number(frame.columns),
    rows: Number(frame.rows),
    spriteCount: Array.isArray(frame.sprites) ? frame.sprites.length : 0,
    visibleSpriteCount: Array.isArray(frame.sprites)
      ? frame.sprites.filter(sprite => !sprite.transparentTile).length : 0,
  }]));
}

function validateEntries$1(ownerDocument, structureDocument) {
  const records = ownerDocument?.records;
  if (ownerDocument?.schema !== EXPECTED_SCHEMA$1
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS$1
      || Number(ownerDocument?.record_count) !== records.length) {
    throw new TypeError(`${DIRECT_FRAME_MODULE_ID} 必须发布 ${EXPECTED_RECORDS$1} 条 owner 记录`);
  }
  const structures = decodeStructure(structureDocument);
  const entries = records.map(record => {
    const id = frameId(record);
    const handle = normalizeHandle$1(record?.handle);
    const structure = structures.get(id);
    if (id === null || handle !== `${DIRECT_FRAME_MODULE_ID}:${idHex$1(id)}`
        || !structure || structure.runtimeGenerated
        || !Number.isInteger(structure.columns) || !Number.isInteger(structure.rows)) {
      throw new TypeError(`${record?.handle || DIRECT_FRAME_MODULE_ID} 缺少可用结构`);
    }
    return {id, id_hex: record.id_hex, handle, structure};
  });
  if (new Set(entries.map(entry => entry.handle)).size !== entries.length) {
    throw new TypeError(`${DIRECT_FRAME_MODULE_ID} 的候选身份重复`);
  }
  return entries;
}

function frameSummary(entry) {
  const structure = entry?.structure;
  if (!structure) return "网格结构由直接帧 owner 提供";
  return `${structure.columns}×${structure.rows} 网格 · ${
    structure.visibleSpriteCount} 个可见 sprite · ${structure.spriteCount} 个网格槽`;
}

function directFramePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId$1({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>直接帧 ?</b><small>${esc(error || "直接帧引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}
    data-direct-frame-structure="${idHex$1(id)}">
    <b>${handleMarkup(`${DIRECT_FRAME_MODULE_ID}:${idHex$1(id)}`)}</b>
    <small>${esc(entry ? frameSummary(entry) : "结构预览等待 owner 正文")}</small>
  </span>`;
}

function directFrameReferenceItem(entry, reference = null) {
  const id = frameId(entry);
  const handle = normalizeHandle$1(entry?.handle);
  if (id === null || !handle) return null;
  const summary = frameSummary(entry);
  return {
    value: declaredText$2(entry, reference?.key) || handle,
    group: 'frame', groupLabel: '单帧形象', compactLabel: handle,
    label: '直接帧',
    description: summary,
    meta: handle,
    preview: directFramePreviewMarkup({entry}),
    filter: [id, idHex$1(id), handle, summary].join(" ").toLowerCase(),
  };
}

async function prepareDirectFrameComponent(props) {
  try {
    const [ownerDocument, structureDocument] = await Promise.all([
      db.getResourceDocument(DIRECT_FRAME_MODULE_ID, null),
      db.getResourceDocument(DIRECT_FRAME_STRUCTURE_RESOURCE_ID, null),
    ]);
    const entries = validateEntries$1(ownerDocument, structureDocument);
    const requested = requestedId$1(props);
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

function directFrameReferencePickerMarkup({
  entries = [], value = null, label = "直接帧", controlMarkup = "",
  componentAttributes = "", error = "", reference = null, picker = {},
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: DIRECT_FRAME_MODULE_ID, key: ["handle"]},
    picker,
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(DIRECT_FRAME_MODULE_ID, {
  item: directFrameReferenceItem,
  className: "direct-frame-reference-field",
  filterLabel: "过滤直接帧",
  filterPlaceholder: "ID／句柄／网格／sprite 数",
});

registerModuleComponent(DIRECT_FRAME_MODULE_ID, "reference", {
  prepare: prepareDirectFrameComponent,
  render: directFrameReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(DIRECT_FRAME_MODULE_ID, kind, {
    prepare: prepareDirectFrameComponent,
    render: directFramePreviewMarkup,
  });
}

// @editor-module 调查命令与六个特殊调查实体的引用供给

const LOGIC_DOCUMENT_ID = "project.scenes.logic";
const SCENE_DOCUMENT_ID = "project.scenes";
const COMMAND_MODULE_ID = "investigation-command";
const SPECIAL_MODULE_ID = "investigation-special";

function byteId$1(value) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result <= 0xff ? result : null;
}

function hexByte$1(value) {
  const id = byteId$1(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function commandIdentity(entry) {
  const id = byteId$1(entry?.command_id);
  return id === null ? "" : `investigation-command:${hexByte$1(id)}`;
}

function requestedCommand(props = {}) {
  const fromEntry = byteId$1(props.entry?.command_id);
  if (fromEntry !== null) return {commandId: fromEntry, selector: null};
  const match = /^investigation-command:([0-9a-f]{1,2})$/iu.exec(
    String(props.handle || "").trim());
  if (match) return {commandId: Number.parseInt(match[1], 16), selector: null};
  return {commandId: null, selector: byteId$1(props.value)};
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
  const id = byteId$1(entry?.command_id) ?? requested.commandId;
  if (id === null && requested.selector === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>调查命令引用未解析</small></span>`;
  }
  const label = String(entry?.facility_label || `调查命令 $${hexByte$1(id)}`);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(label)}</b><small>${esc(commandSummary(entry || {}))}</small>
  </span>`;
}

function commandReferenceItem(entry) {
  const selector = byteId$1(entry?.selector);
  const commandId = byteId$1(entry?.command_id);
  if (selector === null || commandId === null) return null;
  const identity = commandIdentity(entry);
  const label = String(entry?.facility_label || `调查命令 $${hexByte$1(commandId)}`);
  const summary = commandSummary(entry);
  return {
    // 消费字段存 selector；命令 ID 只由 owner 在候选与句柄之间解释。
    value: String(selector),
    label: `${hexByte$1(commandId)} · ${label}`,
    description: `选择码 $${hexByte$1(selector)}`,
    meta: summary,
    preview: commandPreviewMarkup({entry}),
    filter: [selector, hexByte$1(selector), commandId, hexByte$1(commandId), identity,
      label, summary, entry?.investigation_evidence].filter(Boolean).join(" ").toLowerCase(),
  };
}

function specialIdentity(entry) {
  const sceneId = byteId$1(entry?.scene_id);
  const id = byteId$1(entry?.id);
  return sceneId === null || id === null
    ? "" : `investigation-special:${hexByte$1(sceneId)}:${hexByte$1(id)}`;
}

function requestedSpecial(props = {}) {
  const direct = specialIdentity(props.entry);
  if (direct) return direct;
  const reference = String(props.handle || props.value || "").trim();
  return /^investigation-special:[0-9a-f]{2}:[0-9a-f]{2}$/iu.test(reference)
    ? reference.toUpperCase().replace("INVESTIGATION-SPECIAL", "investigation-special") : "";
}

function specialLocation(entry) {
  const x = byteId$1(entry?.x);
  const y = byteId$1(entry?.y);
  return `${String(entry?.scene_name || `场景 $${hexByte$1(entry?.scene_id)}`)} · ${
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
    filter: [identity, entry?.id, hexByte$1(entry?.id), label, location, description,
      entry?.kind, entry?.semantic_status].filter(Boolean).join(" ").toLowerCase(),
  };
}

function sceneNames(documentValue) {
  return new Map((documentValue?.editable_scenes || []).map(entry => [
    Number(entry.id), String(entry.name || entry.slug || `场景 $${hexByte$1(entry.id)}`),
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
          ? byteId$1(entry.command_id) === requested.commandId
          : byteId$1(entry.selector) === requested.selector) || null,
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
      scene_name: names.get(Number(entry.scene_id)) || `场景 $${hexByte$1(entry.scene_id)}`,
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

// @editor-module investigation / treasure owner 的引用供给
//
// 两类记录都从源码点名的 project.scenes.logic 平铺表读取；不遍历 240 个场景
// 资源来拼候选。场景名与宝物内容只作当前显示投影，实体键仍是各 owner 的数值 ID。


const SCENE_LOGIC_DOCUMENT_ID$1 = "project.scenes.logic";
const SCENE_CATALOG_DOCUMENT_ID$1 = "project.scenes";
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

function sceneName$1(entry) {
  return String(entry?.scene_name || `场景 ${sceneIdHex(entry)}`);
}

function locationLabel(entry) {
  const x = Number(entry?.x);
  const y = Number(entry?.y);
  const coordinate = Number.isInteger(x) && Number.isInteger(y) ? `(${x}, ${y})` : "坐标未知";
  return `${sceneName$1(entry)} · ${coordinate}`;
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
  const resolved = entry || {};
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
    throw new TypeError(`${SCENE_LOGIC_DOCUMENT_ID$1} 缺少 ${definition.rows} 候选表`);
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
      db.getDocument(SCENE_LOGIC_DOCUMENT_ID$1, null),
      db.getDocument(SCENE_CATALOG_DOCUMENT_ID$1, null),
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

// @editor-module transition / boundary owner 的引用供给
//
// 两类候选只读源码点名的 project.scenes.logic 平铺表；不遍历场景资源、manifest
// 或模块图。复合句柄仍是唯一候选键，场景目录只补当前显示名。


const TRANSITION_MODULE_ID = "transition";
const BOUNDARY_MODULE_ID = "boundary";
const SCENE_LOGIC_DOCUMENT_ID = "project.scenes.logic";

const SCENE_CATALOG_DOCUMENT_ID = "project.scenes";
const TRANSITION_TARGET_OWNER_BY_HANDLE = Object.freeze({
  "transition:00:4A": "boundary:01:00",
});

const TRANSFER_MODULES = Object.freeze({
  [TRANSITION_MODULE_ID]: Object.freeze({
    rows: "point_transitions",
    label: "点转场",
    filterLabel: "过滤点转场",
  }),
  [BOUNDARY_MODULE_ID]: Object.freeze({
    rows: "boundary_exits",
    label: "场景边界",
    filterLabel: "过滤场景边界",
  }),
});

const DIRECTION_LABELS = Object.freeze({
  up: "上边界",
  right: "右边界",
  down: "下边界",
  left: "左边界",
  "all-boundaries": "全边界",
});

function transferModule(moduleId) {
  const id = String(moduleId || "");
  const definition = TRANSFER_MODULES[id];
  if (!definition) throw new TypeError(`场景转场引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function valueAtPath$1(value, path = []) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object"
        || !Object.hasOwn(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function declaredText$1(entry, path) {
  if (!Array.isArray(path)) return "";
  const value = valueAtPath$1(entry, path);
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

function normalizeTransferHandle(value, moduleId) {
  const definition = transferModule(moduleId);
  const parts = String(value || "").trim().split(":");
  if (parts.length !== 3 || parts[0].toLowerCase() !== definition.id
      || !/^[0-9a-f]{1,2}$/iu.test(parts[1])
      || !/^[0-9a-f]{1,2}$/iu.test(parts[2])) return "";
  return `${definition.id}:${parts[1].toUpperCase().padStart(2, "0")}:${
    parts[2].toUpperCase().padStart(2, "0")}`;
}

/** Exact cross-owner target relationships published by the module graph. */
function transitionTargetOwner(value) {
  const handle = normalizeTransferHandle(value, TRANSITION_MODULE_ID);
  return handle ? TRANSITION_TARGET_OWNER_BY_HANDLE[handle] || "" : "";
}

function transferHandle(entry, moduleId) {
  const direct = normalizeTransferHandle(
    entry?.resource_id || entry?.handle || entry?.uid,
    moduleId,
  );
  if (direct) return direct;
  const sceneId = byteId(entry?.scene_id);
  const rowId = byteId(entry?.id);
  return sceneId === null || rowId === null
    ? "" : `${moduleId}:${hexByte(sceneId)}:${hexByte(rowId)}`;
}

function requestedTransferHandle({moduleId, entry = null, handle = "", value = ""} = {}) {
  return transferHandle(entry, moduleId)
    || normalizeTransferHandle(handle || value, moduleId);
}

function sceneName(entry, role) {
  const property = role === "destination" ? "destination_scene_name" : "source_scene_name";
  const idProperty = role === "destination" ? "destination_scene_id" : "scene_id";
  return String(entry?.[property] || `场景 $${hexByte(entry?.[idProperty])}`);
}

function coordinate(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : "?";
}

function directionLabel(entry) {
  const direction = String(entry?.direction || "");
  return DIRECTION_LABELS[direction] || direction || "方向未定";
}

function transferRoute(entry) {
  return `${sceneName(entry, "source")} (${coordinate(entry?.x)}, ${coordinate(entry?.y)})`
    + ` → ${sceneName(entry, "destination")} (${
      coordinate(entry?.destination_x)}, ${coordinate(entry?.destination_y)})`;
}

function transferTitle(entry, moduleId) {
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  if (rowName) return rowName;
  const source = sceneName(entry, "source");
  const target = sceneName(entry, "destination");
  return moduleId === BOUNDARY_MODULE_ID
    ? `${source} ${directionLabel(entry)} → ${target}`
    : `${source} → ${target}`;
}

function transferMeta(entry, moduleId) {
  return transferHandle(entry, moduleId);
}

function transferPreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = transferModule(moduleId);
  const identity = requestedTransferHandle({moduleId, entry, handle, value});
  if (!identity || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(error || `${definition.label}引用未解析`)}</small></span>`;
  }
  if (!entry) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>${esc(definition.label)}</b><small>${esc(identity)}</small></span>`;
  }
  const detail = moduleId === BOUNDARY_MODULE_ID
    ? `${directionLabel(entry)} · ${transferRoute(entry)}` : transferRoute(entry);
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(transferTitle(entry, moduleId))}</b><small>${esc(detail)}</small>
  </span>`;
}

function transferReferenceItem(entry, reference = null) {
  const moduleId = String(reference?.module || "");
  const definition = transferModule(moduleId);
  const handle = transferHandle(entry, moduleId);
  if (!handle) return null;
  const identity = handle.split(":").slice(1).join(":");
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  const declaredDescription = declaredText$1(entry, reference?.description);
  const description = declaredDescription || transferRoute(entry);
  const declaredValue = declaredText$1(entry, reference?.key);
  return {
    value: declaredValue || handle,
    label: rowName
      ? `${identity} · ${rowName}`
      : `${identity} · ${transferTitle(entry, moduleId)}`,
    description,
    meta: declaredText$1(entry, reference?.meta) || transferMeta(entry, moduleId),
    preview: transferPreviewMarkup({moduleId, entry}),
    filter: [
      handle,
      identity,
      rowName,
      description,
      definition.label,
      directionLabel(entry),
      entry?.scene_id,
      entry?.scene_id_hex,
      entry?.id,
      entry?.id_hex,
      entry?.x,
      entry?.y,
      entry?.destination_scene_id,
      entry?.destination_scene_id_hex,
      entry?.destination_x,
      entry?.destination_y,
      entry?.source_scene_slug,
      entry?.destination_scene_slug,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function transferRows(documentValue, moduleId) {
  const definition = transferModule(moduleId);
  const rows = documentValue?.[definition.rows];
  if (!Array.isArray(rows)) {
    throw new TypeError(`${SCENE_LOGIC_DOCUMENT_ID} 缺少 ${definition.rows} 静态候选表`);
  }
  return rows;
}

function enrichTransferRows(rows, sceneDocument) {
  const sceneById = new Map((sceneDocument?.editable_scenes || []).map(scene => [
    byteId(scene?.id),
    scene,
  ]));
  return rows.map(entry => {
    const source = sceneById.get(byteId(entry?.scene_id));
    const destination = sceneById.get(byteId(entry?.destination_scene_id));
    return {
      ...entry,
      source_scene_name: String(source?.name || source?.slug || ""),
      source_scene_slug: String(source?.slug || ""),
      destination_scene_name: String(destination?.name || destination?.slug || ""),
      destination_scene_slug: String(destination?.slug || ""),
    };
  });
}

function currentTransferRows(sceneAsset, sceneId, moduleId) {
  const definition = transferModule(moduleId);
  if (sceneAsset?.resource_id !== `scene:${hexByte(sceneId)}`
      || Number(sceneAsset?.document?.scene_id) !== sceneId) {
    throw new TypeError(`scene:${hexByte(sceneId)} 的当前正文身份不一致`);
  }
  const rows = sceneAsset.document?.logic?.layers?.transitions?.[definition.rows];
  if (!Array.isArray(rows)) {
    throw new TypeError(`scene:${hexByte(sceneId)} 缺少当前 ${definition.rows}`);
  }
  return new Map(rows.map(entry => [byteId(entry?.id), entry]));
}

// 候选集合仍完全由 project.scenes.logic 的静态平铺表决定。这里只读取已经存在的
// scene:* working，覆盖同一候选的当前语义值；不从 working 增删或发现候选。唯一的
// split-owner 关系也从真正 owner 的 working 取目标值，不回写另一份副本。
async function overlayCurrentTransferValues(rows, moduleId) {
  const repository = state.projectRepository;
  if (!repository || typeof repository.listWorking !== "function"
      || typeof repository.resolve !== "function") return rows;
  const relevantIds = new Set(rows.map(entry => byteId(entry?.scene_id)));
  if (moduleId === TRANSITION_MODULE_ID) {
    for (const entry of rows) {
      const owner = transitionTargetOwner(transferHandle(entry, moduleId));
      const ownerParts = owner.split(":");
      if (ownerParts.length === 3) relevantIds.add(Number.parseInt(ownerParts[1], 16));
    }
  }
  const working = await repository.listWorking();
  const selectedIds = [...new Set(working.flatMap(record => {
    const match = /^scene:([0-9a-f]{2})$/iu.exec(String(record?.resource_id || ""));
    if (!match) return [];
    const sceneId = Number.parseInt(match[1], 16);
    return relevantIds.has(sceneId) ? [sceneId] : [];
  }))].sort((left, right) => left - right);
  if (!selectedIds.length) return rows;
  const assetsByScene = new Map(await Promise.all(selectedIds.map(async sceneId => {
    const resolved = await repository.resolve(`scene:${hexByte(sceneId)}`, {
      materialize: false,
    });
    return [sceneId, resolved?.value];
  })));
  return rows.map(entry => {
    const sceneId = byteId(entry?.scene_id);
    const rowId = byteId(entry?.id);
    const currentAsset = assetsByScene.get(sceneId);
    const current = currentAsset
      ? currentTransferRows(currentAsset, sceneId, moduleId).get(rowId)
      : null;
    if (!current) {
      if (currentAsset) {
        throw new TypeError(`${transferHandle(entry, moduleId)} 在当前场景正文中不存在`);
      }
    }
    const result = {
      ...entry,
      ...(current ? {
        ...(moduleId === TRANSITION_MODULE_ID ? {
          x: current.x,
          y: current.y,
        } : {}),
        destination_scene_id: current.destination_scene_id,
        destination_x: current.destination_x,
        destination_y: current.destination_y,
      } : {}),
    };
    if (moduleId !== TRANSITION_MODULE_ID) return result;
    const targetOwner = transitionTargetOwner(transferHandle(entry, moduleId));
    if (!targetOwner) return result;
    const [, ownerSceneHex, ownerRowHex] = targetOwner.split(":");
    const ownerSceneId = Number.parseInt(ownerSceneHex, 16);
    const ownerAsset = assetsByScene.get(ownerSceneId);
    if (!ownerAsset) return result;
    const ownerRow = currentTransferRows(
      ownerAsset,
      ownerSceneId,
      BOUNDARY_MODULE_ID,
    ).get(Number.parseInt(ownerRowHex, 16));
    if (!ownerRow) {
      throw new TypeError(`${targetOwner} 在当前场景正文中不存在`);
    }
    return {
      ...result,
      destination_scene_id: ownerRow.destination_scene_id,
      destination_x: ownerRow.destination_x,
      destination_y: ownerRow.destination_y,
    };
  });
}

async function prepareTransferComponent(props) {
  const moduleId = String(props.moduleId || "");
  transferModule(moduleId);
  try {
    const [logicDocument, sceneDocument] = await Promise.all([
      db.getDocument(SCENE_LOGIC_DOCUMENT_ID, null),
      db.getDocument(SCENE_CATALOG_DOCUMENT_ID, null),
    ]);
    const currentRows = await overlayCurrentTransferValues(
      transferRows(logicDocument, moduleId),
      moduleId,
    );
    const entries = enrichTransferRows(currentRows, sceneDocument);
    const identities = entries.map(entry => transferHandle(entry, moduleId));
    if (identities.some(identity => !identity)
        || new Set(identities).size !== identities.length) {
      throw new TypeError(`${moduleId} 的候选句柄为空或重复`);
    }
    const requested = requestedTransferHandle({...props, moduleId});
    return {
      ...props,
      entries,
      entry: props.entry
        || entries.find(entry => transferHandle(entry, moduleId) === requested) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function transferReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = transferModule(moduleId);
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value: normalizeTransferHandle(value, moduleId) || value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, definition] of Object.entries(TRANSFER_MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: transferReferenceItem,
    className: "scene-transfer-reference-field",
    filterLabel: definition.filterLabel,
    filterPlaceholder: "句柄／源场景／目标场景／坐标／方向",
  });

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareTransferComponent,
    render: transferReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareTransferComponent,
      render: transferPreviewMarkup,
    });
  }
}

// @editor-module 战斗精灵调色板 owner 的精确引用供给
//
// 候选只读取 sprite-palette 正文；消费页得到实际色块与目标身份，不接触旧表
// 位置、调色板编码细节或 owner 的入站使用方。


const SPRITE_PALETTE_MODULE_ID = "sprite-palette";
const EXPECTED_RECORDS = 32;
const EXPECTED_SCHEMA = "metalmaxcn.semantic-owner.sprite-palette.document";

function paletteId(value) {
  const number = Number(value?.id ?? value);
  return Number.isInteger(number) && number >= 0 && number < EXPECTED_RECORDS
    ? number : null;
}

function idHex(value) {
  const id = paletteId(value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle(value) {
  const match = /^sprite-palette:([0-9a-f]{1,2})$/iu.exec(String(value || "").trim());
  if (!match) return "";
  const id = paletteId(Number.parseInt(match[1], 16));
  return id === null ? "" : `${SPRITE_PALETTE_MODULE_ID}:${idHex(id)}`;
}

function requestedId({entry = null, handle = "", value = ""} = {}) {
  const direct = paletteId(entry);
  if (direct !== null) return direct;
  const normalized = normalizeHandle(handle || value);
  return normalized ? Number.parseInt(normalized.split(":").at(-1), 16) : paletteId(value);
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

function colorSwatches(colors) {
  return paletteSwatches(colors, {
    className: "palette-swatches",
    label: "四色预览",
    swatchAttributes: (_value, index) => `data-sprite-palette-swatch="${index}"`,
  });
}

function spritePalettePreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = requestedId({entry, handle, value});
  const colors = Array.isArray(entry?.colors) ? entry.colors : [];
  if (id === null || error || (entry && colors.length !== 4)) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>调色板 ?</b><small>${esc(error || "战斗精灵调色板引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>战斗精灵调色板 ${idHex(id)}</b>
    ${colors.length ? colorSwatches(colors) : ""}
    <small>战斗精灵四色</small>
  </span>`;
}

function spritePaletteReferenceItem(entry, reference = null) {
  let semanticEntry;
  try {
    semanticEntry = Array.isArray(entry?.colors) ? entry : sanitizePaletteEntry(entry);
  } catch (_error) {
    return null;
  }
  const id = paletteId(semanticEntry);
  const handle = normalizeHandle(semanticEntry?.handle);
  if (id === null || !handle) return null;
  const summary = "战斗精灵四色";
  return {
    value: declaredText(semanticEntry, reference?.key) || String(id),
    label: `${idHex(id)} · 战斗精灵调色板`,
    description: summary,
    meta: handle,
    preview: spritePalettePreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex(id), handle, summary]
      .filter(Boolean).join(" ").toLowerCase(),
  };
}

function sanitizePaletteEntry(record) {
  const colors = Array.isArray(record?.runtime_four_color_form)
    ? record.runtime_four_color_form.map(Number) : [];
  if (colors.length !== 4 || colors.some(value =>
    !Number.isInteger(value) || value < 0 || value >= nesPalette.length)) {
    throw new TypeError(`${record?.handle || "sprite-palette"} 缺少有效四色正文`);
  }
  return {
    id: record.id,
    id_hex: record.id_hex,
    handle: record.handle,
    colors,
  };
}

function validateEntries(documentValue) {
  const records = documentValue?.records;
  if (documentValue?.schema !== EXPECTED_SCHEMA
      || !Array.isArray(records) || records.length !== EXPECTED_RECORDS
      || Number(documentValue?.record_count) !== records.length) {
    throw new TypeError(`${SPRITE_PALETTE_MODULE_ID} 必须发布 ${EXPECTED_RECORDS} 条 owner 记录`);
  }
  const entries = records.map(sanitizePaletteEntry);
  const handles = entries.map(entry => normalizeHandle(entry.handle));
  if (handles.some((handle, index) =>
    !handle || handle !== `${SPRITE_PALETTE_MODULE_ID}:${idHex(entries[index])}`)
      || new Set(handles).size !== entries.length) {
    throw new TypeError(`${SPRITE_PALETTE_MODULE_ID} 的候选身份为空或重复`);
  }
  return entries;
}

async function prepareSpritePaletteComponent(props) {
  try {
    const entries = validateEntries(
      await db.getResourceDocument(SPRITE_PALETTE_MODULE_ID, null),
    );
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

function spritePaletteReferencePickerMarkup({
  entries = [], value = null, label = "战斗精灵调色板", controlMarkup = "",
  componentAttributes = "", error = "", reference = null,
} = {}) {
  return referenceFieldPickerMarkup({
    reference: reference || {module: SPRITE_PALETTE_MODULE_ID, key: ["id"]},
    rows: entries,
    value,
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

registerReferenceFieldPresentation(SPRITE_PALETTE_MODULE_ID, {
  item: spritePaletteReferenceItem,
  className: "sprite-palette-reference-field",
  filterLabel: "过滤战斗精灵调色板",
  filterPlaceholder: "ID／句柄／颜色",
});

registerModuleComponent(SPRITE_PALETTE_MODULE_ID, "reference", {
  prepare: prepareSpritePaletteComponent,
  render: spritePaletteReferencePickerMarkup,
  hydrate: hydrateReferenceFieldPickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(SPRITE_PALETTE_MODULE_ID, kind, {
    prepare: prepareSpritePaletteComponent,
    render: spritePalettePreviewMarkup,
  });
}

// @editor-module 全部 owner 组件的唯一装配入口
//
// `ui/module-components.js` 的可嵌入能力靠副作用登记：文件没被 import，那一格就是空的。
//
// **这份清单只此一份。** 谁要"所有模块的处理器都在场"就 import 本文件：模块工作台
// 要它才渲染得出 editor，处理器登记页要它才数得准。抄第二份清单的后果不是报错，
// 是那一页少了几行而没人看得出来——恰恰是这两张表最该防住的事。
//
// 新增 owner 组件文件时加在这里，按路径排序。

var components = /*#__PURE__*/Object.freeze({
  __proto__: null
});

// @editor-module 自主脚本字段对象为场景提供语义操作数控件。

async function mountStorySceneActions(host, record, context, database, sceneId = Number(record.entry_id)) {
  const scripts = context.autonomous || await database.getResourceDocument('story-autonomous-script');
  if (!host.isConnected) return;
  const actions = storySceneActions(record, scripts, context.story);
  if (!actions.length) return;
  const handles = [...new Set(actions.flatMap(action => {
    const presentation = storySceneActionPresentation(action);
    return presentation ? [...presentation.operands.map(({index}) => action.operandFields[index].entityHandle),
      ...(presentation.destination ? [action.handle] : [])] : [];
  }))];
  const objects = new Map(await Promise.all(handles.map(async handle => [handle,
    await database.getFieldObject('story-autonomous-script', handle)])));
  const references = new Map(await Promise.all([...new Set(actions.flatMap(action =>
    (storySceneActionPresentation(action)?.operands || []).map(({index}) =>
      storyCommandOperandReference(action.command, action.semantic, index, action.operands)?.module)
      .filter(module => module && module !== 'scene-header-map')))].map(async module =>
    [module, await prepareModuleComponent(module === 'global-event-flag' ? 'save-container' : module,
      module === 'global-event-flag' ? 'event-flag-reference' : 'reference')])));
  const appearance = references.has('actor-type') ? actorAppearanceContextForScene(
    (await database.getResourceDocument(`scene:${sceneId.toString(16).toUpperCase().padStart(2, '0')}`)).scene) : null;
  if (!host.isConnected) return;
  const section = document.createElement('section');
  section.dataset.storySceneActions = actions[0].handle;
  const labels = context.story.browser_vm.scene_action_labels?.find(row =>
    row.handle === actions[0].handle);
  section.innerHTML = `<h3>${esc(labels?.label || '自主动作')} <a class="editor-inline-link"
    href="?view=actors&actorPart=story&storyKind=autonomous&record=${Number(record.autonomous_script_id)}">↗</a></h3>
    <table class="data-table field-object-action-table"><thead><tr><th>动作</th><th>值</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead><tbody></tbody></table>`;
  host.append(section);
  const body = section.querySelector('tbody');
  const rowControls = label => {
    const row = body.insertRow();
    row.insertCell().textContent = label;
    const control = row.insertCell(), resetHost = row.insertCell();
    resetHost.className = 'reset-column';
    return {control, resetHost};
  };
  const operand = async (action, index, label) => {
    const {control, resetHost} = rowControls(label);
    control.dataset.storySceneOperand = `${action.cursor}:${index}`;
    const field = action.operandFields[index];
    if (field.tokenId) {
      mountStoryInsertedOperand(control, objects.get(field.entityHandle), {...field, label});
      return;
    }
    const options = {entityHandle: field.entityHandle, fieldName: 'bytecode',
      byteIndex: field.byteIndex, label, resetHost};
    const target = storyCommandOperandReference(action.command, action.semantic, index, action.operands);
    if (target) {
      control.dataset.storySceneReference = target.module;
      control.classList.add('field-object-linked-reference');
      const variableRegion = target.module === 'text-record' && action.command.opcode === 0x26;
      await mountFieldObjectArrayReference(control, objects.get(field.entityHandle), {...options,
        indices: variableRegion ? [action.operandFields[0].byteIndex, field.byteIndex] : [field.byteIndex],
        moduleId: target.module === 'global-event-flag' ? 'save-container' : target.module,
        kind: target.module === 'global-event-flag' ? 'event-flag-reference' : 'reference',
        prepared: {...references.get(target.module),
          ...(target.module === 'actor-type' ? appearance : {}),
          ...(target.module === 'text-record' && !variableRegion ? {regionId: target.regionId} : {}),
          ...(target.module === 'direct-frame' ? {reference: {module: target.module, key: ['id']}} : {})},
        ...(target.module === 'actor-type' ? {candidateSelector: '[data-actor-appearance-option]',
          candidateValue: row => row.dataset.actorAppearanceOption} : {}),
        ...(variableRegion ? {
          decode: ([region, record]) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`,
          encode: value => [parseInt(value.split(':')[1], 16), Number(value.split(':')[2])],
        } : {}),
      });
      if (target.module === 'global-event-flag') control.insertAdjacentHTML('beforeend',
        `<a class="editor-inline-link" href="${esc(saveEventHref(1, action.operands[index]))}">↗</a>`);
    } else mountFieldObjectField(control, objects.get(field.entityHandle), options);
  };
  const position = (action, indices, label, destination = false) => {
    const {control, resetHost} = rowControls(label);
    control.dataset.storyScenePosition = `${action.cursor}:${indices.join(',')}`;
    if (destination) control.dataset.storySceneDestination = String(action.cursor);
    const fields = indices.map(index => action.operandFields[index]);
    const handle = fields[0].entityHandle;
    if (fields.some(field => field.entityHandle !== handle)) throw new TypeError('坐标组跨脚本字段');
    mountFieldObjectArrayPosition(control, objects.get(handle), {entityHandle: handle,
      fieldName: 'bytecode', indices: fields.map(field => field.byteIndex),
      entries: context.scenes.editable_scenes, label, resetHost,
      ...(destination ? {anchor: [8, 7], decodeCoordinate: sceneCameraCoordinate,
        encodeCoordinate: sceneCameraByte} : {sceneId}),
    });
  };
  for (const action of actions) {
    const presentation = storySceneActionPresentation(action);
    if (!presentation) continue;
    const start = body.rows.length;
    const coordinates = ['set-actor-position', 'move-actor-to-position',
      'branch-on-player-position-exact'].includes(action.operation) ? [[0, 1]]
      : ['branch-on-player-position-rectangle', 'wander-inside-rectangle'].includes(action.operation)
        ? [[0, 2], [1, 3]] : [];
    if (action.command.instructionSource?.kind === 'sequence') coordinates.length = 0;
    const grouped = new Set(coordinates.flat());
    for (const [part, indices] of coordinates.entries()) position(action, indices,
      coordinates.length === 1 ? presentation.label : `${presentation.label} · ${part ? '上界' : '起点'}`);
    for (const {index, label} of presentation.operands) {
      if (grouped.has(index) || action.command.opcode === 0x26 && index === 0) continue;
      await operand(action, index, label);
    }
    if (presentation.destination && action.command.instructionSource?.kind !== 'sequence') {
      position(action, [0, 1, 2], labels?.destinations?.[action.cursor] || '目的地', true);
    } else if (presentation.destination) {
      for (const index of [0, 1, 2]) await operand(action, index, ['场景', 'X', 'Y'][index]);
    }
    if (body.rows.length === start) {
      const row = body.insertRow();
      row.insertCell().textContent = presentation.label;
      row.insertCell().textContent = presentation.value;
      row.insertCell().textContent = '—';
    }
    const first = body.rows[start];
    first.dataset.storySceneCommand = String(action.cursor);
    first.dataset.storySceneOperation = action.operation;
    first.cells[0].title = presentation.label;
    if (presentation.operands.length && presentation.value)
      first.cells[0].append(` · ${presentation.value}`);
  }
  if (!body.rows.length) section.remove();
  else section.dataset.storySceneActionsReady = '1';
}

// @editor-module 剧情序列目录与 trace 诊断







//
// 来源：拆分前 engine/editor/app.js 第 4737-4992 行。






// 动作脚本三个来源共用一张表。族的顺序、标签和一句话说明只在这里登记一次。
const STORY_SCRIPT_KINDS = {
  autonomous: ["角色自动动作", "场景角色记录 byte 5 直接选择的 bank $12 流程"],
  interaction: ["交互与事件动作", "无文本区角色记录 byte 4 选择的 bank $13 流程"],
  inline: ["文本内联动作", "文本控制码 $F5 直接调用同一套动作处理器"],
};

function storyScriptEntries(kind) {
  const story = state.project.story || {};
  if (kind === "inline") return story.inline_actions || [];
  return story[kind]?.entries || [];
}

function storyScriptKind() {
  return STORY_SCRIPT_KINDS[state.storyKind] ? state.storyKind : "autonomous";
}

function storyScriptUid(kind, id) {
  return `story:${kind}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`;
}

// 列表与记录页共用同一份过滤后的顺序，否则「下一条」会跳到列表里看不见的行。
function storyScriptRows(kind = storyScriptKind()) {
  const source = storyScriptEntries(kind);
  const q = state.query.trim().toLowerCase();
  if (!q) return source;
  return source.filter(item => JSON.stringify(item).toLowerCase().includes(q));
}

function storyScriptById(kind, recordId) {
  const key = kind === "inline" ? "opcode" : "id";
  return storyScriptEntries(kind).find(
    item => String(item[key]) === String(recordId)
  ) || null;
}

function renderStorySequences() {
  const story = state.project.story || {};
  story.summary || {};
  if (!Object.keys(STORY_SCRIPT_KINDS).some(kind => storyScriptEntries(kind).length)) {
    return ``;
  }
  const kind = storyScriptKind();
  state.storyKind = kind;
  const source = storyScriptEntries(kind);
  const rows = storyScriptRows(kind);
  const tabs = `<div class="data-tabs story-kind-tabs" role="tablist" aria-label="动作脚本来源">
    ${Object.entries(STORY_SCRIPT_KINDS).map(([id, [label]]) => `<button class="button ${kind === id ? "primary" : "ghost"}" data-story-kind="${id}">
      ${esc(label)} <small>${storyScriptEntries(id).length}</small>
    </button>`).join("")}
  </div>`;
  const hint = ``;
  const table = kind === "inline"
    ? dataTable({
      columns: storyInlineColumns(),
      rows,
      rowId: row => row.opcode,
      recordRoute: row => `story-inline/${row.opcode}`,
      selectedId: state.recordId,
      total: source.length,
      empty: "没有匹配的内联动作",
    })
    : dataTable({
      columns: storyScriptColumns(kind),
      rows,
      rowId: row => row.id,
      recordRoute: row => `story-script/${row.id}`,
      selectedId: state.recordId,
      total: source.length,
      empty: "没有匹配的脚本",
    });
  return `${tabs}${hint}${table}`;
}

function storyScriptColumns(kind) {
  return [
    {key: "uid", label: "资源 ID", mono: true, width: 280, sticky: true,
      cell: row => {
        const uid = storyScriptUid(kind, row.id);
        return `<button class="resource-uid" type="button" data-resource-query="${uid}">${handleMarkup(storyScriptHandle(kind, row.id))}</button>`;
      }},
    {key: "id_hex", label: "游戏索引 ID", mono: true, width: 280, sticky: true,
      cell: row => handleMarkup(storyScriptHandle(kind, row.id))},
    {key: "label", label: "名称", width: 190,
      cell: row => `<span class="record-link">${esc(
        row.label || `${kind === "autonomous" ? "自动动作" : "交互动作"} ${row.id_hex}`
      )}</span>`},
    {key: "preview", label: "缩略图", width: 92,
      cell: row => row.primary_actor_sprite_recipe
        ? `<span class="story-table-actor">${actorAtlasCanvas({
            pair: row.primary_actor_sprite_recipe.actor_set,
            actorType: row.primary_actor_sprite_recipe.actor_type,
            entryPoint: row.primary_actor_sprite_recipe.entry_point,
          })}</span>`
        : `<span class="resource-empty">无</span>`},
    {key: "reachable_command_count", label: "可达命令", mono: true, align: "right", width: 76},
    {key: "cursors", label: "游标数", mono: true, align: "right", width: 66,
      cell: row => String((row.reachable_cursors || []).length)},
    {key: "categories", label: "分类", width: 120,
      cell: row => esc((row.categories || []).join(" ") || "—")},
    {key: "first_command", label: "首命令", mono: true, width: 130,
      cell: row => {
        const command = (row.command_preview || [])[0];
        return command
          ? `<span title="${esc(command.raw_window_hex)}">${esc(command.opcode_hex)} ${esc(command.name)}</span>`
          : "—";
      }},
    {key: "reference_count", label: "引用数", mono: true, align: "right", width: 66},
    {key: "validation_tags", label: "验证标记", width: 140,
      cell: row => esc((row.validation_tags || []).join(" ") || "—")},
    {key: "issues", label: "问题", mono: true, align: "right", width: 56,
      cell: row => String((row.issues || []).length)},
    {key: "refs", label: "引用资产", width: 150,
      cell: row => resourceForwardReferenceCell(storyScriptUid(kind, row.id))},
    {key: "status", label: "状态", width: 100},
  ];
}

function storyInlineColumns() {
  return [
    {key: "uid", label: "资源 ID", mono: true, width: 150, sticky: true,
      cell: row => {
        const uid = storyScriptUid("inline", row.opcode);
        return `<button class="resource-uid" type="button" data-resource-query="${uid}">${handleMarkup(storyScriptUid("inline", row.opcode))}</button>`;
      }},
    {key: "opcode_hex", label: "游戏索引 ID", mono: true, width: 96, sticky: true,
      cell: row => handleMarkup(storyScriptUid("inline", row.opcode))},
    {key: "name", label: "名称", width: 190,
      cell: row => `<span class="record-link">${esc(row.name)}</span>`},
    {key: "category", label: "类别", width: 130},
    {key: "usage_count", label: "文本调用数", mono: true, align: "right", width: 90},
    {key: "first_use", label: "首个调用位置", mono: true, width: 200,
      cell: row => {
        const use = (row.usages || [])[0];
        return use
          ? storyTextMarkup(storyTextHandle(use.region_id, use.record_id))
          : "—";
      }},
    {key: "regions", label: "涉及文本区", mono: true, width: 150,
      cell: row => esc([...new Set((row.usages || []).map(use => use.region_id_hex))].join(" ") || "—")},
  ];
}

// ---------------------------------------------------------------------------
// 记录页：表格放不下的东西——角色图形、完整命令表、逐条引用、原始字节。
// ---------------------------------------------------------------------------

function renderStoryScriptRecord(recordId) {
  const kind = storyScriptKind();
  const entry = storyScriptById(kind, recordId);
  if (!entry) return null;
  const rows = storyScriptRows(kind);
  const key = kind === "inline" ? "opcode" : "id";
  const index = rows.findIndex(item => String(item[key]) === String(recordId));
  const neighbours = {
    prevId: index > 0 ? rows[index - 1][key] : null,
    nextId: index >= 0 && index < rows.length - 1 ? rows[index + 1][key] : null,
  };
  return kind === "inline"
    ? storyInlineRecord(entry, neighbours)
    : storyScriptRecord(kind, entry, neighbours);
}

function storyScriptRecord(kind, entry, neighbours) {
  const uid = storyScriptUid(kind, entry.id);
  const label = entry.label || `${kind === "autonomous" ? "自动动作" : "交互动作"} ${entry.id_hex}`;
  entry.encoded_range || {};
  const spriteRecipes = entry.actor_sprite_recipes || [];
  const commands = entry.command_preview || [];
  const references = entry.references || [];
  const panels = [
    panel("基本信息", fields([
      ["游戏索引 ID", handleMarkup(storyScriptHandle(kind, entry.id))],
      ["名称", esc(label)],
      ["来源", esc(STORY_SCRIPT_KINDS[kind][0])],
      ["状态", esc(entry.status || "—")],
      ["分类", esc((entry.categories || []).join(" ") || "—")],
      ["验证标记", esc((entry.validation_tags || []).join(" ") || "—")],
      ["资产源文件", `<a href="${fileUrl(`game/story/${entry.path}`)}" target="_blank">${esc(entry.path)} ↗</a>`],
    ])),
    panel("指针与命令", fields([
      ["可达命令数", String(entry.reachable_command_count || 0)],
      ["可达游标", `<code>${esc((entry.reachable_cursors_hex || []).join(" ") || "—")}</code>`],
    ])),
    panel(`绑定角色图形${spriteRecipes.length ? `（${spriteRecipes.length}）` : ""}`, spriteRecipes.length
      ? `<div class="record-preview-strip">${spriteRecipes.map(recipe =>
        actorAtlasCanvas({
          pair: recipe.actor_set,
          actorType: recipe.actor_type,
          entryPoint: recipe.entry_point,
          label: `${esc(label)} 绑定角色图形`,
        })
      ).join("")}</div>`
      : `<span class="resource-empty">逻辑对象或不可见对象</span>`),
    panel("引用关系", fields([
      ["场景引用数", String(entry.reference_count || 0)],
      ["引用资产", resourceForwardReferenceCell(uid)],
    ])),
    ...(entry.state_references?.length ? [panel("存档状态引用", entry.state_references.map(reference => {
      const flag = eventFlagReferenceMarkup(reference.flag_id);
      const links = [1, 2].map(slot =>
        `<a class="editor-inline-link" href="${esc(saveEventHref(slot, reference.flag_id))}">槽 ${slot} 事件位</a>`).join(" · ");
      const access = reference.operation === "set-after-victory" ? "战斗胜利写入"
        : reference.access === "write" ? "写入" : "读取";
      return `<p data-story-event-flag="${reference.flag_id}">${flag} · ${access} · ${links}</p>`;
    }).join(""))] : []),
    panel("原始字节", entry.encoded_bytes_preview_hex
      ? `<code class="record-bytes">${esc(entry.encoded_bytes_preview_hex)}</code>`
      : ``),
    panel("字段对象", `<div id="story-script-field-object" data-story-script-field-object="${esc(kind)}:${Number(entry.id)}"></div>`),
    panel("动作与台词", '<div data-story-script-details></div>', {wide: true, flat: true}),
    panel("命令表", commands.length
      ? `<div class="table-wrap"><table class="record-subtable">
        <thead><tr><th>游标</th><th>OPCODE</th><th>名称</th><th>类别</th><th>原始窗口</th></tr></thead>
        <tbody>${commands.map(command => `<tr>
          <td class="mono">${esc(command.cursor_hex)}</td>
          <td class="mono">${esc(command.opcode_hex)}</td>
          <td>${esc(command.name)}</td>
          <td>${esc(command.category)}</td>
          <td class="mono">${esc(command.raw_window_hex)}</td>
        </tr>`).join("")}</tbody></table></div>`
      : ``,
      {wide: true}),
  ];
  if ((entry.issues || []).length) {
    panels.push(panel("问题", `<ul class="record-issues">${entry.issues.map(
      issue => `<li>${esc(typeof issue === "string" ? issue : JSON.stringify(issue))}</li>`
    ).join("")}</ul>`, {wide: true}));
  }
  panels.push(panel(`引用它的场景角色记录（${references.length}）`, references.length
    ? `<div class="table-wrap"><table class="record-subtable">
      <thead><tr><th>资源 ID</th><th>场景</th><th>记录</th><th>类型</th>
        <th>X</th><th>Y</th><th>朝向</th><th>调色板</th><th>渲染来源</th><th>运动 / 图形</th>
        <th>文本区</th><th>交互/记录 ID</th><th>原始字节</th></tr></thead>
      <tbody>${references.map(ref => {
        const marker = Number(ref.render_slot_marker || 0);
        const appearance = marker === 0 ? peekActorAppearance(
          Number(ref.actor_type), {entryPoint: ACTOR_ENTRY_SCENE_OBJECT},
        ) : null;
        const visualSource = marker === 0 ? "actor-visual" : "metasprite-record";
        const visualLabel = marker === 0
          ? appearance?.motionLabel || "无有效角色运动"
          : marker === 1
            ? `直接帧 ${recordUid("direct-frame", ref.actor_type)}`
            : `通用 metasprite ${recordUid("metasprite", ref.actor_type)}`;
        return `<tr>
        <td><button class="resource-uid" type="button" data-resource-query="${esc(ref.uid)}">${handleMarkup(ref.uid)}</button></td>
        <td class="mono">${Number(ref.scene_actor_entry_id) <= 0xEF ? storySceneLink(ref.scene_actor_entry_id)
          : handleMarkup(recordUid("scene-actor-list", ref.scene_actor_entry_id))}</td>
        <td class="mono">${handleMarkup(ref.uid)}</td>
        <td class="mono">${storyResourceMarkup(recordUid(marker === 1 ? "direct-frame" : marker ? "metasprite" : "actor-type", ref.actor_type))}</td>
        <td class="mono right">${esc(ref.x)}</td>
        <td class="mono right">${esc(ref.y)}</td>
        <td>${esc(ref.direction || "—")}</td>
        <td class="mono right">${esc(ref.palette)}</td>
        <td class="mono">${esc(visualSource)}</td>
        <td>${handleTextMarkup(visualLabel)}</td>
        <td class="mono">${esc(ref.text_region_hex || "—")}</td>
        <td class="mono">${ref.text_region ? storyTextMarkup(storyTextHandle(ref.text_region, ref.interaction_or_record_id))
          : ref.interaction_or_record_id ? handleMarkup(storyScriptHandle("interaction", ref.interaction_or_record_id)) : "—"}</td>
        <td class="mono">${esc(ref.raw_hex)}</td>
      </tr>`;
      }).join("")}</tbody></table></div>`
    : ``, {wide: true}));
  return recordPage({
    title: label,
    uid: storyScriptHandle(kind, entry.id),
    physicalRows: [
      {label: "脚本入口", address: {space: "prg", offset: entry.pointer_prg}},
      {label: "入口指针", address: {space: "prg", offset: entry.pointer_entry_prg}},
    ].filter(row => Number.isInteger(row.address.offset)),
    backLabel: "返回动作脚本",
    ...neighbours,
    panels,
  });
}

async function bindStoryScriptCommandAddresses() {
  if (state.recordId == null || state.actorVisualTab !== "story") return;
  const entry = storyScriptById(storyScriptKind(), state.recordId);
  if (!entry?.path) return;
  const host = document.querySelector("[data-physical-location]");
  if (!host) return;
  const source = await db.getPackageDocument(`game/story/${entry.path}`, null);
  if (source?.id !== entry.id || source?.kind !== storyScriptKind()) return;
  if (!host.isConnected) return;
  const open = host.open;
  host.outerHTML = physicalLocationMarkup({uid: storyScriptUid(storyScriptKind(), entry.id),
    rows: (source.commands || []).filter(command => Number.isInteger(command.prg_offset))
      .map(command => ({label: `命令 ${command.cursor_hex}`,
        address: {space: "prg", offset: command.prg_offset}}))});
  if (open) document.querySelector("[data-physical-location]").open = true;
  const fieldHost = document.querySelector("[data-story-script-field-object]");
  if (!fieldHost) return;
  const resourceId = `story-${storyScriptKind()}-script`;
  const handle = `${resourceId}:script:${Number(entry.id).toString(16).toUpperCase().padStart(2, "0")}`;
  try {
    const object = await db.getFieldObject(resourceId, handle);
    if (!fieldHost.isConnected) return;
    const bytecode = object.fields.find(field => field.entityHandle === handle
      && field.fieldName === "bytecode")?.value;
    if (!Array.isArray(bytecode)) throw new Error(`${handle}.bytecode 不存在`);
    await object.mount(fieldHost, {rowHandles: [handle], compactIdentity: true});
    const detailsHost = document.querySelector('[data-story-script-details]');
    if (detailsHost) {
      const refresh = async () => {
        const [details] = await prepareStoryReferenceDetails(
          await db.getResourceDocument(resourceId), storyScriptKind(), [entry]);
        if (!detailsHost.isConnected) return;
        detailsHost.innerHTML = details.details;
        await paintStoryReferenceDetails(detailsHost);
      };
      await refresh();
      object.fields.find(field => field.entityHandle === handle && field.fieldName === 'bytecode')
        ?.bind(detailsHost, (_node, _value, _field, reason) => {
          if (reason !== 'initial') void refresh().catch(error => {
            editorLog.error("剧情", `操作失败：${error?.message || error}`, error);
            detailsHost.textContent = error.message;
            detailsHost.setAttribute('role', 'alert');
          });
        });
    }
    if (storyScriptKind() === 'autonomous') {
      const record = {autonomous_script_id: Number(entry.id)};
      const scenes = await db.getDocument('project.scenes');
      const actors = await db.getAll('scene-actor', []);
      const actor = actors.find(row => Number(row.autonomous_script_id) === Number(entry.id));
      const shot = state.project.story.browser_vm?.sequences?.flatMap(sequence => sequence.shots || [])
        .find(shot => Number(shot.variant_id) === Number(actor?.entry_id));
      const sceneId = Number(actor?.entry_id) < 0xf0 ? Number(actor.entry_id) : Number(shot?.scene_id ?? 0);
      const autonomous = await prepareStorySceneActions([record],
        await db.getResourceDocument(resourceId), state.project.story, db);
      await mountStorySceneActions(fieldHost, record,
        {autonomous, story: state.project.story, scenes}, db, sceneId);
    }
  } catch (error) {
    editorLog.error("剧情", `操作失败：${error?.message || error}`, error);
    if (fieldHost.isConnected) fieldHost.textContent = error?.message || String(error);
  }
}

function storyInlineRecord(entry, neighbours) {
  const uid = storyScriptUid("inline", entry.opcode);
  const usages = entry.usages || [];
  return recordPage({
    title: entry.name,
    uid,
    backLabel: "返回动作脚本",
    ...neighbours,
    panels: [
      panel("基本信息", fields([
        ["游戏索引 ID", handleMarkup(uid)],
        ["名称", esc(entry.name)],
        ["类别", esc(entry.category)],
        ["涉及文本区", esc([...new Set(usages.map(use => use.region_id_hex))].join(" ") || "—")],
      ])),
      panel("引用关系", fields([
        ["文本调用数", String(entry.usage_count || 0)],
      ])),
      panel(`文本调用位置（${usages.length}）`, usages.length
        ? `<div class="table-wrap"><table class="record-subtable">
          <thead><tr><th>文本区</th><th>记录</th><th>OPCODE</th><th>来源文件</th></tr></thead>
          <tbody>${usages.map(use => `<tr>
            <td class="mono">${esc(use.region_id_hex)}</td>
            <td class="mono">${storyTextMarkup(storyTextHandle(use.region_id, use.record_id))}</td>
            <td class="mono">${esc(use.opcode_hex)}</td>
            <td class="mono">${esc(use.source || "—")}</td>
          </tr>`).join("")}</tbody></table></div>`
        : ``, {wide: true}),
    ],
  });
}

function storyPlaybackScenarios() {
  return state.project.story?.playback?.scenarios || [];
}


function storyClock(frames, fps = 60) {
  const seconds = Math.max(0, frames) / fps;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

var catalog = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindStoryScriptCommandAddresses: bindStoryScriptCommandAddresses,
  renderStoryScriptRecord: renderStoryScriptRecord,
  renderStorySequences: renderStorySequences,
  storyClock: storyClock,
  storyPlaybackScenarios: storyPlaybackScenarios
});

// @editor-module 场景角色形象与运动权威表
//
// 页面按 actor-visual.motions 的完整运动单位展示，不再把每个动画帧列成一个
// 独立形象。actor_types 只是 ROM 选择值到 motion/OAM 的引用；CHR set 只提供像素。



const motionKindLabels = Object.freeze({
  [ACTOR_MOTION_SINGLE]: "单帧",
  [ACTOR_MOTION_DIRECTIONLESS]: "多帧 · 无方向",
  [ACTOR_MOTION_DIRECTIONAL]: "普通行走 · 2 帧 4 向",
});

const entryPointLabels = new Map([
  [ACTOR_ENTRY_TYPE_SELECTOR, "类型选择入口"],
  [ACTOR_ENTRY_SCENE_OBJECT, "场景入口"],
]);

function actorMotionRows(pair, motion) {
  const variants = motion.appearanceVariants.length
    ? motion.appearanceVariants
    : [{
      actorType: null,
      entryPoint: null,
      appearance: motion.previewAppearance,
      poses: motion.previewPoses,
    }];
  const rowSpan = variants.length;
  return `<tbody class="actor-motion-group">${variants.map((variant, index) => {
    const appearance = variant.appearance;
    const poses = variant.poses;
    const frames = poses.map(pose => pose.frame);
    const attributes = poses.map(pose => pose.oamAttributes);
    const typeLabel = appearance.id === null ? "—" : hex(appearance.id, 2);
    const entryLabel = appearance.id === null
      ? "—"
      : entryPointLabels.get(variant.entryPoint) || (variant.entryPoint ? "其他入口" : "默认");
    const groupCells = index ? "" : `
      <td class="actor-motion-resource" rowspan="${rowSpan}"><button class="resource-uid" type="button"
        data-resource-query="${esc(motion.resourceId)}">${esc(motion.resourceId)}</button></td>
      <td class="actor-motion-name" rowspan="${rowSpan}"><b>${esc(motion.label)}</b></td>
      <td class="actor-motion-kind" rowspan="${rowSpan}">${esc(motionKindLabels[motion.kind] || motion.kind)}</td>`;
    return `<tr>${groupCells}
      <td>${appearance.resourceId
        ? `<button class="resource-uid" type="button" data-resource-query="${esc(appearance.resourceId)}">${esc(appearance.resourceId)}</button>`
        : `<span class="mono">${esc(typeLabel)}</span>`}</td>
      <td>${esc(entryLabel)}</td>
      <td class="actor-motion-preview-cell"><span class="actor-motion-strip"
        style="--actor-motion-columns:${poses.length}">${actorAtlasCanvas({
          pair,
          frames,
          attributes,
          scale: 2,
          palette: appearance.palette,
          className: "actor-motion-canvas",
          label: `${typeLabel} · ${entryLabel} · ${appearance.motionLabel}`,
        })}</span></td>
    </tr>`;
  }).join("")}</tbody>`;
}

function renderActorAppearances() {
  const actorDocument = db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null);
  const sets = state.project?.visuals?.actors?.sets || [];
  if (!actorDocument) {
    return `<div class="empty"><b>角色形象基础表未能加载</b><span>当前项目缺少 ${VISUAL_ACTORS_RESOURCE_ID} 的有效正文。</span></div>`;
  }
  if (!sets.length) {
    return ``;
  }

  const selectedSet = sets.find(item => Number(item.id) === Number(state.actorSet))
    || sets[0];
  state.actorSet = Number(selectedSet.id);

  let catalog;
  try {
    catalog = actorMotionCatalogFromDocument(actorDocument);
  } catch (error) {
    return `<div class="empty"><b>角色形象基础表无效</b><span>${esc(error?.message || error)}</span></div>`;
  }

  const appearanceCount = catalog.reduce(
    (count, motion) => count + motion.appearanceVariants.length,
    0,
  );
  return `<section class="actor-appearance-page">
    <div class="section-line actor-appearance-page-heading">
      <div><h2>角色形象与运动表</h2></div>
      <span>${catalog.length} 个完整运动 · ${appearanceCount} 个类型 / 入口外观 · 当前 ${esc(selectedSet.id_hex || hex(selectedSet.id, 2))}</span>
    </div>
    <div class="actor-appearance-page-toolbar">
      <div><span>预览场景图案</span>
        <animated-resource-picker id="actor-set" class="image-column-picker"
          aria-label="预览场景图案"
          data-animated-resource-value="${Number(selectedSet.id)}"></animated-resource-picker>
      </div>
      <p><button class="resource-uid" type="button" data-resource-query="actor-visual.type-frame-bases">actor-visual</button></p>
    </div>
    <div class="table-wrap actor-motion-table" aria-label="角色形象与运动表"><table>
      <thead><tr><th>资源 ID</th><th>运动名称</th><th>运动模型</th>
        <th>角色类型</th><th>引用入口</th><th>动画预览</th></tr></thead>
      ${catalog.map(item => actorMotionRows(selectedSet.id, item)).join("")}
    </table></div>
  </section>`;
}

function configureActorSetPicker(picker) {
  if (!picker) return;
  const catalog = actorMotionCatalogFromDocument(db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null));
  const appearances = catalog.flatMap(motion => motion.appearanceVariants)
    .map(variant => variant.appearance);
  configureAnimatedResourcePicker(picker, {
    value: state.actorSet,
    options: (state.project?.visuals?.actors?.sets || []).map(item => ({
      value: item.id, label: item.label || `SET ${item.id_hex || hex(item.id, 2)}`, set: item,
    })),
    renderPreview: option => {
      const animation = (option.set.animations || []).find(item =>
        item.depends_on_scene_chr && item.actor_type_ids?.length);
      const appearance = appearances.find(item =>
        Number(item?.id) === Number(animation?.actor_type_ids?.[0]))
        || appearances.find(item => item?.id !== null);
      const pose = actorPoseForAppearance(appearance, {direction: "down", step: 0});
      return actorAtlasCanvas({
        pair: option.set.id, frames: [pose.frame], attributes: [pose.oamAttributes],
        scale: 3, palette: pose.palette, label: option.label,
      });
    },
    paintPreview: root => paintActorAtlasCanvases(root),
  });
}

function renderActors() {
  const active = state.actorVisualTab === "story" ? "story" : "sprites";
  state.actorVisualTab = active;
  const tabs = `<div class="data-tabs battle-visual-tabs" role="tablist" aria-label="角色形象与动作脚本分类">
    <button class="button ${active === "sprites" ? "primary" : "ghost"}" data-actor-visual-tab="sprites">角色形象表</button>
    <button class="button ${active === "story" ? "primary" : "ghost"}" data-actor-visual-tab="story">关联动作脚本 <small>动作脚本</small></button>
  </div>`;
  return tabs + (active === "story" ? renderStorySequences() : renderActorAppearances());
}

var actors = /*#__PURE__*/Object.freeze({
  __proto__: null,
  configureActorSetPicker: configureActorSetPicker,
  renderActors: renderActors
});

// @editor-module 角色形象表的 CHR 预览上下文绑定

function bindVisualEditor() {
  configureActorSetPicker($("#actor-set"));
  $("#actor-set")?.addEventListener("change", event => {
    if (event.target !== event.currentTarget) return;
    state.actorSet = Number(event.target.value);
    const url = new URL(location.href);
    url.searchParams.set("actorSet", String(state.actorSet));
    replaceHistoryUrl(url);
    render();
  });
}

var actorsBind = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindVisualEditor: bindVisualEditor
});

export { actors, actorsBind, catalog, components };
