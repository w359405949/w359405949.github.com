// @editor-module 其余战斗 owner 的精确引用供给
//
// 候选分别固定读取 attack-visual-aux-script 与 battle-action 正文。渲染前只保留
// owner 的语义身份、动作摘要与模块引用，不把脚本编码、指针或配置字节带进消费页。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";

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

function declaredOpaqueItem(entry, reference) {
  const value = declaredText(entry, reference?.key);
  if (!value) return null;
  const label = declaredText(entry, reference?.name) || value;
  const description = declaredText(entry, reference?.description);
  const meta = declaredText(entry, reference?.meta) || value;
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

function idHex(moduleId, value) {
  const id = moduleIdValue(moduleId, value?.id ?? value);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

function normalizeHandle(moduleId, value) {
  moduleDefinition(moduleId);
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`^${escaped}:([0-9a-f]{1,2})$`, "iu")
    .exec(String(value || "").trim());
  if (!match) return "";
  const id = moduleIdValue(moduleId, Number.parseInt(match[1], 16));
  return id === null ? "" : `${moduleId}:${idHex(moduleId, id)}`;
}

function requestedId(moduleId, {entry = null, handle = "", value = ""} = {}) {
  const direct = moduleIdValue(moduleId, entry?.id);
  if (direct !== null) return direct;
  const normalized = normalizeHandle(moduleId, handle || value);
  return normalized
    ? Number.parseInt(normalized.split(":").at(-1), 16)
    : moduleIdValue(moduleId, value);
}

function recordHandle(moduleId, entry) {
  const direct = normalizeHandle(moduleId, entry?.handle);
  const id = moduleIdValue(moduleId, entry?.id);
  return direct || (id === null ? "" : `${moduleId}:${idHex(moduleId, id)}`);
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
  const id = requestedId(ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID, {entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>辅助脚本 ?</b><small>${esc(error || "攻击视觉辅助脚本引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>辅助脚本 ${idHex(ATTACK_VISUAL_AUX_SCRIPT_MODULE_ID, id)}</b>
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
    value: declaredText(semanticEntry, reference?.key) || String(id),
    label: `${idHex(moduleId, id)} · 攻击视觉辅助脚本`,
    description: summary,
    meta: handle,
    preview: auxScriptPreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex(moduleId, id), handle, summary, ...names,
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
  const id = requestedId(BATTLE_ACTION_MODULE_ID, {entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>战斗动作 ?</b><small>${esc(error || "战斗动作引用未解析")}</small>
    </span>`;
  }
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>战斗动作 ${idHex(BATTLE_ACTION_MODULE_ID, id)}</b>
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
    value: declaredText(semanticEntry, reference?.key) || String(id),
    label: `${idHex(moduleId, id)} · 战斗动作`,
    description: summary,
    meta: handle,
    preview: battleActionPreviewMarkup({entry: semanticEntry}),
    filter: [id, idHex(moduleId, id), handle, summary,
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
    return id !== null && identities[index] === `${moduleId}:${idHex(moduleId, id)}`;
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
    const requested = requestedId(props.moduleId, props);
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
