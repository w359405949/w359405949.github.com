// @editor-module 战斗视觉、敌方行动与对象布局的引用供给
//
// 三个候选表都由刚发布的 owner 正文固定点名；这里不扫描 manifest、模块图或
// 资源目录。字段声明若点名 reference.name，通用装配层仍以候选行自己的名称为准，
// 本文件只补 owner 预览、说明与过滤信息。

import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {recordUid} from "../../core/resource-index.js";
import {
  attackVisualCanvas,
  paintAttackVisualCanvases,
} from "../../render/weapon-effect-vm.js";
import {registerModuleComponent} from "../../ui/module-components.js";
import {
  hydrateReferenceFieldPickers,
  referenceFieldPickerMarkup,
  registerReferenceFieldPresentation,
} from "../../ui/reference-field.js";
import {
  paintTileGridCells,
  paintTileGridLines,
  renderTileGridCanvas,
} from "../../views/tile-grid.js";

const ATTACK_VISUAL_MODULE_ID = "attack-visual";
const ENEMY_ACTION_MODULE_ID = "enemy-action";
export const BATTLE_OBJECT_LAYOUT_MODULE_ID = "battle-object-layout";
const BATTLE_RESULT_SCRIPT_MODULE_ID = "battle-result-script";

const MODULES = Object.freeze({
  [ATTACK_VISUAL_MODULE_ID]: Object.freeze({
    resourceId: ATTACK_VISUAL_MODULE_ID,
    item: attackVisualReferenceItem,
    preview: attackVisualPreviewMarkup,
    paint: paintAttackVisualCanvases,
    className: "attack-visual-reference-field",
    filterLabel: "过滤攻击视觉",
    filterPlaceholder: "ID／句柄／命令／引用目标",
  }),
  [ENEMY_ACTION_MODULE_ID]: Object.freeze({
    resourceId: ENEMY_ACTION_MODULE_ID,
    item: enemyActionReferenceItem,
    preview: enemyActionPreviewMarkup,
    paint: paintAttackVisualCanvases,
    className: "enemy-action-reference-field",
    filterLabel: "过滤敌方行动",
    filterPlaceholder: "ID／名称／消息／结果／视觉／怪物",
  }),
  [BATTLE_OBJECT_LAYOUT_MODULE_ID]: Object.freeze({
    resourceId: BATTLE_OBJECT_LAYOUT_MODULE_ID,
    item: battleObjectLayoutReferenceItem,
    preview: battleObjectLayoutPreviewMarkup,
    paint: paintBattleObjectLayoutGridPreviews,
    className: "battle-object-layout-reference-field",
    filterLabel: "过滤战斗对象布局",
    filterPlaceholder: "句柄／尺寸／原点／引用动作",
  }),
  [BATTLE_RESULT_SCRIPT_MODULE_ID]: Object.freeze({
    resourceId: BATTLE_RESULT_SCRIPT_MODULE_ID,
    item: battleResultScriptReferenceItem,
    preview: battleResultScriptPreviewMarkup,
    className: "battle-result-script-reference-field",
    filterLabel: "过滤战斗结果脚本",
    filterPlaceholder: "ID／句柄／长度／起始字节",
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

function referenceValue(entry, reference, fallback) {
  const declared = declaredText(entry, reference?.key);
  return declared || String(fallback ?? "");
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

function idFromHandle(value, prefixes) {
  const choices = prefixes.map(prefix => prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
  const match = new RegExp(`^(?:${choices.join("|")}):([0-9a-f]{1,2})$`, "iu")
    .exec(String(value || "").trim());
  return match ? Number.parseInt(match[1], 16) : null;
}

function attackVisualId({entry = null, handle = "", value = ""} = {}) {
  return byteId(entry?.id)
    ?? idFromHandle(entry?.handle, [ATTACK_VISUAL_MODULE_ID, "visual"])
    ?? idFromHandle(handle || value, [ATTACK_VISUAL_MODULE_ID, "visual"])
    ?? byteId(value);
}

function attackVisualHandle(entry) {
  const direct = String(entry?.handle || "").trim();
  if (/^(?:attack-visual|visual):[0-9a-f]{1,2}$/iu.test(direct)) return direct;
  const id = attackVisualId({entry});
  return id === null ? "" : `${ATTACK_VISUAL_MODULE_ID}:${hexByte(id)}`;
}

function attackVisualPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = attackVisualId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>攻击视觉未解析</b><small>${esc(error || "攻击视觉引用未解析")}</small>
    </span>`;
  }
  const idHex = hexByte(id);
  if (entry?.decode_status === "opaque-unreferenced-slot") {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>${recordUid(ATTACK_VISUAL_MODULE_ID, id)}</b><small>保留未引用</small>
    </span>`;
  }
  return `<span class="equipment-attack-visual-preview" ${componentAttributes}>
    ${attackVisualCanvas({
      visualCode: id,
      segment: "impact",
      className: "equipment-attack-visual-canvas",
      label: esc(`攻击视觉 $${idHex}`),
    })}
    <small>$${idHex}</small>
  </span>`;
}

function attackVisualReferenceItem(entry, reference = null) {
  const id = attackVisualId({entry});
  if (id === null) return null;
  const idHex = hexByte(id);
  const handle = attackVisualHandle(entry);
  const rowName = String(entry?.name || entry?.display_name || entry?.stable_name || "").trim();
  const description = String(entry?.summary || "").trim() || "攻击视觉";
  const commands = Array.isArray(entry?.commands) ? entry.commands : [];
  const references = Array.isArray(entry?.direct_references) ? entry.direct_references : [];
  return {
    value: referenceValue(entry, reference, id),
    label: rowName || `${idHex} · 攻击视觉`,
    description,
    meta: declaredText(entry, reference?.meta) || handle,
    preview: attackVisualPreviewMarkup({entry}),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      handle,
      rowName,
      description,
      ...commands.flatMap(command => [
        command?.name,
        command?.opcode_hex,
        ...(command?.operands || []).flatMap(operand => [
          operand?.name,
          operand?.value,
          operand?.value_hex,
        ]),
      ]),
      ...references.flatMap(target => [target?.target, target?.field, target?.relation]),
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function enemyActionId({entry = null, handle = "", value = ""} = {}) {
  return byteId(entry?.id)
    ?? idFromHandle(entry?.handle, [ENEMY_ACTION_MODULE_ID])
    ?? idFromHandle(handle || value, [ENEMY_ACTION_MODULE_ID])
    ?? byteId(value);
}

function enemyActionHandle(entry) {
  const direct = String(entry?.handle || "").trim();
  if (/^enemy-action:[0-9a-f]{1,2}$/iu.test(direct)) return direct;
  const id = enemyActionId({entry});
  return id === null ? "" : `${ENEMY_ACTION_MODULE_ID}:${hexByte(id)}`;
}

function enemyActionFields(entry) {
  const fields = entry?.fields || {};
  return {
    message: fields.message || {},
    result: fields.result_script || {},
    visual: fields.visual_and_counter_initializer || {},
  };
}

function enemyActionDescription(entry) {
  const {result, visual} = enemyActionFields(entry);
  return [
    result.reference || `结果脚本 $${hexByte(result.value)}`,
    visual.visual_reference || "无静态攻击视觉",
  ].join(" · ");
}

function enemyActionPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = enemyActionId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>ACT ?</b><small>${esc(error || "敌方行动引用未解析")}</small>
    </span>`;
  }
  const idHex = hexByte(id);
  const {result, visual} = enemyActionFields(entry);
  const visualId = byteId(visual.visual_selector ?? entry?.visual_code);
  if (visualId === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>ACT ${idHex}</b><small>RESULT $${hexByte(result.value)} · 无视觉</small>
    </span>`;
  }
  return `<span class="equipment-attack-visual-preview" ${componentAttributes}>
    ${attackVisualCanvas({
      visualCode: visualId,
      segment: "impact",
      className: "equipment-attack-visual-canvas",
      label: esc(`敌方行动 $${idHex} · 攻击视觉 $${hexByte(visualId)}`),
    })}
    <small>${recordUid(ENEMY_ACTION_MODULE_ID, id)} · ${
      recordUid(ATTACK_VISUAL_MODULE_ID, visualId)}</small>
  </span>`;
}

function enemyActionReferenceItem(entry, reference = null) {
  const id = enemyActionId({entry});
  if (id === null) return null;
  const idHex = hexByte(id);
  const handle = enemyActionHandle(entry);
  const rowName = String(entry?.name || entry?.name_hint || "").trim();
  const declaredDescription = declaredText(entry, reference?.description);
  const description = declaredDescription || String(entry?.summary || "").trim()
    || enemyActionDescription(entry);
  const {message, result, visual} = enemyActionFields(entry);
  return {
    value: referenceValue(entry, reference, id),
    label: rowName ? `${idHex} · ${rowName}` : `${idHex} · 敌方行动`,
    description,
    meta: declaredText(entry, reference?.meta) || handle,
    preview: enemyActionPreviewMarkup({entry}),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      handle,
      rowName,
      description,
      message.reference,
      message.text_hint,
      result.reference,
      result.value,
      result.value_hex,
      visual.raw,
      visual.raw_hex,
      visual.visual_selector,
      visual.visual_selector_hex,
      visual.visual_reference,
      visual.repeat_counter_class,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function layoutHandle(value) {
  const direct = String(value || "").trim();
  const match = /^battle-object-layout:([0-9a-f]{1,3})$/iu.exec(direct);
  return match
    ? `${BATTLE_OBJECT_LAYOUT_MODULE_ID}:${match[1].toUpperCase().padStart(3, "0")}`
    : "";
}

function battleObjectLayoutHandle(entry) {
  return layoutHandle(entry?.handle || entry?.uid);
}

function battleObjectLayoutShape(entry) {
  const shape = entry?.shape_contract || {};
  return {
    columns: Number(shape.columns),
    rows: Number(shape.rows),
    width: Number(shape.width_pixels),
    height: Number(shape.height_pixels),
    bytes: Number(shape.byte_length),
    tiles: Number(shape.tile_count),
  };
}

function battleObjectLayoutDescription(entry) {
  const shape = battleObjectLayoutShape(entry);
  return `${shape.tiles} 个逻辑 tile`;
}

function battleObjectLayoutPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const identity = battleObjectLayoutHandle(entry) || layoutHandle(handle || value);
  const shape = battleObjectLayoutShape(entry);
  const hasGrid = Number.isInteger(shape.columns) && shape.columns > 0
    && Number.isInteger(shape.rows) && shape.rows > 0;
  if (!identity || !Number.isInteger(shape.tiles)
      || (!Number.isInteger(shape.bytes) && !hasGrid) || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>LAYOUT ?</b><small>${esc(error || identity || "战斗对象布局引用未解析")}</small>
    </span>`;
  }
  const grid = hasGrid ? renderTileGridCanvas({
    owner: BATTLE_OBJECT_LAYOUT_MODULE_ID,
    role: "layout-preview",
    columns: shape.columns,
    rows: shape.rows,
    cellWidth: 6,
    className: "battle-object-layout-grid",
    label: `${identity} 的 ${shape.columns}×${shape.rows} 静态布局`,
    readOnly: true,
    data: {"battle-object-layout-grid": identity},
  }) : "";
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    ${grid}
    <b>${hasGrid
      ? `${shape.columns}×${shape.rows} · ${shape.width}×${shape.height}px`
      : `${shape.tiles} TILE 定长槽`}</b>
    <small>${hasGrid ? "静态对象布局" : "形状由 action config 解释"}</small>
  </span>`;
}

/**
 * owner 没有调用方图案上下文时只画结构格，不读取或展示裸 tile ID。
 * 后续消费页可在同一公共组件上提供自己的不透明单格 painter。
 */
function paintBattleObjectLayoutGridPreviews(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-object-layout-grid]")];
  for (const canvas of canvases) {
    if (canvas.dataset.battleObjectLayoutGridPainted === "1") continue;
    paintTileGridCells(canvas, ({context, column, row, x, y, width, height}) => {
      context.fillStyle = (column + row) % 2 ? "#344047" : "#253038";
      context.fillRect(x, y, width, height);
    });
    paintTileGridLines(canvas.getContext("2d"), {
      color: "rgba(216,242,49,.55)",
      lineWidth: 1,
    });
    canvas.dataset.battleObjectLayoutGridPainted = "1";
  }
}

function battleObjectLayoutReferenceItem(entry, reference = null) {
  const handle = battleObjectLayoutHandle(entry);
  if (!handle) return null;
  const suffix = handle.split(":").at(-1);
  const shape = battleObjectLayoutShape(entry);
  const rowName = String(entry?.name || entry?.label || "").trim();
  const declaredDescription = declaredText(entry, reference?.description);
  const description = declaredDescription || String(entry?.summary || "").trim()
    || battleObjectLayoutDescription(entry);
  const origin = entry?.fields?.origin || {};
  return {
    value: referenceValue(entry, reference, handle),
    label: rowName || `${suffix} · ${shape.tiles} tile 对象布局`,
    description,
    meta: declaredText(entry, reference?.meta) || handle,
    preview: battleObjectLayoutPreviewMarkup({entry}),
    filter: [
      handle,
      suffix,
      rowName,
      description,
      shape.bytes,
      shape.tiles,
      origin.x_quarter_tiles,
      origin.y_quarter_tiles,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function battleResultScriptId({entry = null, handle = "", value = ""} = {}) {
  return byteId(entry?.id)
    ?? idFromHandle(entry?.handle, [BATTLE_RESULT_SCRIPT_MODULE_ID])
    ?? idFromHandle(handle || value, [BATTLE_RESULT_SCRIPT_MODULE_ID])
    ?? byteId(value);
}

function battleResultScriptHandle(entry) {
  const id = battleResultScriptId({entry});
  return id === null ? "" : `${BATTLE_RESULT_SCRIPT_MODULE_ID}:${hexByte(id)}`;
}

function battleResultScriptBytes(entry) {
  return Array.isArray(entry?.raw_bytes)
    ? entry.raw_bytes.map(Number).filter(byte => byteId(byte) !== null)
    : [];
}

function battleResultScriptLead(entry) {
  const bytes = battleResultScriptBytes(entry);
  if (!bytes.length) return "没有已发布字节";
  const lead = bytes.slice(0, 8).map(byte => hexByte(byte)).join(" ");
  return `${lead}${bytes.length > 8 ? " …" : ""}`;
}

function battleResultScriptPreviewMarkup({
  entry = null, handle = "", value = "", componentAttributes = "", error = "",
} = {}) {
  const id = battleResultScriptId({entry, handle, value});
  if (id === null || error) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>RESULT ?</b><small>${esc(error || "战斗结果脚本引用未解析")}</small>
    </span>`;
  }
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  const summary = entry?.battle_item_attack_route ? "攻击效果"
    : entry?.battle_item_non_attack_route ? "非攻击效果" : "战斗结果脚本";
  return `<span class="module-reference-data-preview" ${componentAttributes}>
    <b>${esc(rowName || `RESULT $${hexByte(id)}`)}</b><small>${esc(summary)}</small>
  </span>`;
}

function battleResultScriptReferenceItem(entry, reference = null) {
  const id = battleResultScriptId({entry});
  if (id === null) return null;
  const idHex = hexByte(id);
  const handle = battleResultScriptHandle(entry);
  const rowName = String(entry?.name || entry?.display_name || entry?.label || "").trim();
  const description = String(entry?.summary || "").trim() || "战斗结果脚本";
  const lead = battleResultScriptLead(entry);
  return {
    value: referenceValue(entry, reference, id),
    label: rowName ? `${idHex} · ${rowName}` : `${idHex} · 战斗结果脚本`,
    description,
    meta: handle,
    preview: battleResultScriptPreviewMarkup({entry}),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      handle,
      rowName,
      description,
      lead,
      entry?.raw_hex,
      entry?.decode_status,
    ].filter(value => value !== null && value !== undefined && value !== "")
      .join(" ").toLowerCase(),
  };
}

function requestedIdentity(moduleId, props) {
  if (moduleId === ATTACK_VISUAL_MODULE_ID) return attackVisualId(props);
  if (moduleId === ENEMY_ACTION_MODULE_ID) return enemyActionId(props);
  if (moduleId === BATTLE_OBJECT_LAYOUT_MODULE_ID) {
    return battleObjectLayoutHandle(props?.entry) || layoutHandle(props?.handle || props?.value);
  }
  if (moduleId === BATTLE_RESULT_SCRIPT_MODULE_ID) return battleResultScriptId(props);
  return null;
}

function entryIdentity(moduleId, entry) {
  if (moduleId === ATTACK_VISUAL_MODULE_ID) return attackVisualId({entry});
  if (moduleId === ENEMY_ACTION_MODULE_ID) return enemyActionId({entry});
  if (moduleId === BATTLE_OBJECT_LAYOUT_MODULE_ID) return battleObjectLayoutHandle(entry);
  if (moduleId === BATTLE_RESULT_SCRIPT_MODULE_ID) return battleResultScriptId({entry});
  return null;
}

function normalizedPickerValue(moduleId, value) {
  if (moduleId === ATTACK_VISUAL_MODULE_ID) {
    return attackVisualId({value}) ?? value;
  }
  if (moduleId === ENEMY_ACTION_MODULE_ID) {
    return enemyActionId({value}) ?? value;
  }
  if (moduleId === BATTLE_OBJECT_LAYOUT_MODULE_ID) return layoutHandle(value) || value;
  if (moduleId === BATTLE_RESULT_SCRIPT_MODULE_ID) {
    return battleResultScriptId({value}) ?? value;
  }
  return value;
}

// 候选供给只交目标自身的身份与预览；入站关系留在 owner 正文，不能漏进引用方。
function candidateEntry(moduleId, entry) {
  if (!entry || typeof entry !== "object") return entry;
  if (moduleId === ENEMY_ACTION_MODULE_ID) {
    const {current_monster_users: _users, ...candidate} = entry;
    return candidate;
  }
  if (moduleId === BATTLE_OBJECT_LAYOUT_MODULE_ID) {
    const {
      incoming_action_handles: _actions,
      incoming_reference_count: _count,
      shared_entity: _shared,
      ...candidate
    } = entry;
    return candidate;
  }
  return entry;
}

async function prepareBattleComponent(props) {
  const definition = MODULES[props.moduleId];
  try {
    if (!definition) throw new TypeError(`未知战斗供给模块：${props.moduleId || "（空）"}`);
    const documentValue = await db.getResourceDocument(definition.resourceId, null);
    const entries = documentValue?.records;
    if (!Array.isArray(entries)) {
      throw new TypeError(`${definition.resourceId} 缺少 records 静态候选表`);
    }
    const declaredCount = Number(documentValue?.record_count);
    if (!Number.isInteger(declaredCount) || declaredCount !== entries.length) {
      throw new TypeError(`${definition.resourceId} record_count 与 records 不一致`);
    }
    const identities = entries.map(entry => entryIdentity(props.moduleId, entry));
    if (identities.some(identity => identity === null || identity === "")
        || new Set(identities.map(String)).size !== entries.length) {
      throw new TypeError(`${definition.resourceId} 的候选身份为空或重复`);
    }
    const requested = requestedIdentity(props.moduleId, props);
    const candidates = entries.map(entry => candidateEntry(props.moduleId, entry));
    return {
      ...props,
      entries: candidates,
      entry: props.entry
        ? candidateEntry(props.moduleId, props.entry)
        : candidates.find(entry =>
          String(entryIdentity(props.moduleId, entry)) === String(requested)) || null,
      error: entries.length ? "" : `${props.moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {...props, entries: [], error: `候选项不可用：${error?.message || error}`};
  }
}

function battleReferencePickerMarkup({
  moduleId, entries = [], value = null, label = "战斗资源", controlMarkup = "",
  componentAttributes = "", error = "",
} = {}) {
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows: entries,
    value: normalizedPickerValue(moduleId, value),
    label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

for (const [moduleId, definition] of Object.entries(MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: definition.item,
    paint: definition.paint,
    className: definition.className,
    filterLabel: definition.filterLabel,
    filterPlaceholder: definition.filterPlaceholder,
  });
  registerModuleComponent(moduleId, "reference", {
    prepare: prepareBattleComponent,
    render: battleReferencePickerMarkup,
    hydrate: hydrateReferenceFieldPickers,
  });
  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareBattleComponent,
      render: definition.preview,
      ...(definition.paint ? {hydrate: definition.paint} : {}),
    });
  }
}
