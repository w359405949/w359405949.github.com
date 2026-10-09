import { editorLog, fileUrl } from './project-store-values-klefznSR.js';
import { recordUid, blitRaster, monsterFigureImage, ACTOR_ANCHOR, cleanAnimationFrames, currentTextReferenceLink, createRaster, paintBattleAction, attackFramePalettes, monsterFigureSources, esc, hex } from './monster-figure-C07vG7yu.js';
import { battleActorCatalog, vehiclePresetChoices, vehiclePresetEntry, battleActorAction, battleContextTextSlot, createBattleContextValues, prepareUiTextSlot, uiBindTextSlotConfirmation, battleActorSources, prepareUiBattleStatusSlot, vehiclePortraitImage, battleActorImage, battleActorGameAnchorOffset, battleActorActionFromStateDelta, battleMessageCalls, uiJsRenderSources, uiSceneWindowSurface, battleActorActionAtFrame } from './charset-BJ0aS3Xk.js';
import { state, startNesFrameClock, nesVideoStandard, nesFrameDurationMs } from './emulator-Bl-sLXnd.js';
import { battleItemPresentation, itemNameRecordId, decodeFixedTextRecord, textRecordNodeId, currentActorNameSource, createSaveCurrentFieldObjects, textSlotRuntimeParameters, textSlotProviderBindings, textRecord, renderCodeFields, db, effectiveTextRecordSources, prepareAttackChrEntryContext } from './scene-actors-Cftr7mCE.js';
import { uiTemplateBinding, uiTemplateBindings, replaceHistoryUrl, currentViewUrl, bindScreenWorkbenchZoom, screenWorkbench, screenWorkbenchCanvasStage } from './preview-sound-DHDXA99x.js';

// @editor-module 把四敌群展开为九实例，并按占用网格重放死亡、召唤和支援排布。
//
// 四个敌群槽是「怪物种类 × 数量」，不是四个屏幕坐标。开战时它们会展开为
// 最多九个运行实例；召唤/支援则先按当前实例重建 6×8 占用网格，只给新实例
// 找空位，不重新排列既有怪物。

const BATTLE_ENEMY_GROUP_SLOTS = 4;
const BATTLE_ENEMY_INSTANCE_SLOTS = 9;
const BATTLE_ENEMY_GRID_COLUMNS = 6;
const BATTLE_ENEMY_GRID_ROWS = 8;
const BATTLE_ENEMY_GRID_CELL_PIXELS = 16;
const BATTLE_ENEMY_GRID_LEFT = BATTLE_ENEMY_GRID_CELL_PIXELS;
const BATTLE_ENEMY_GRID_TOP = BATTLE_ENEMY_GRID_CELL_PIXELS;

const gridSize = BATTLE_ENEMY_GRID_COLUMNS * BATTLE_ENEMY_GRID_ROWS;

// battle-engine owns both the current selector references and scan profiles.
// Resolve once per replay; all later joins and manual choices use that snapshot.
function placementRules(document) {
  const references = document?.monster_references;
  if (!Array.isArray(references) || references.length !== 18
      || references.some(ref => ref?.resource_id !== "monster-profile"
        || !Number.isInteger(ref.record_id) || ref.record_id < 0 || ref.record_id > 255)) {
    throw new Error("battle-engine 缺少有效的特殊安放怪物名单");
  }
  const profiles = document?.profiles;
  if (!Array.isArray(profiles) || profiles.length !== 2) {
    throw new Error("battle-engine 缺少安放扫描配置");
  }
  const rows = ["listed-special-monsters", "all-other-monsters"].map((kind, id) => {
    const matches = profiles.filter(profile => profile.id === id && profile.applies_to === kind);
    const profile = matches.length === 1 ? matches[0] : null;
    const values = [profile?.search_start_cell, profile?.row_end_subtract_cells,
      profile?.search_stop_cell];
    if (values.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
      throw new Error("battle-engine 安放扫描配置无效");
    }
    const [start, subtract, stop] = values;
    const visited = new Set();
    const result = [];
    let cell = start;
    do {
      if (visited.has(cell) || cell >= gridSize || cell % BATTLE_ENEMY_GRID_COLUMNS) {
        throw new Error("battle-engine 安放扫描不能在有效网格内终止");
      }
      visited.add(cell);
      result.push(cell / BATTLE_ENEMY_GRID_COLUMNS);
      cell = (cell + BATTLE_ENEMY_GRID_COLUMNS - subtract + 256) % 256;
    } while (cell !== stop);
    return result;
  });
  return {listedIds: new Set(references.map(ref => ref.record_id)), rows};
}

const integer$1 = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isInteger(result) ? result : fallback;
};

function footprintMap(footprints) {
  if (footprints instanceof Map) return footprints;
  return new Map((footprints || []).map(item => [Number(item.monsterId), item]));
}

function normalizedFootprint(footprints, monsterId) {
  const source = footprints.get(Number(monsterId));
  if (!source) return null;
  const widthCells = integer$1(source.widthCells);
  const heightCells = integer$1(source.heightCells);
  if (widthCells < 1 || widthCells > BATTLE_ENEMY_GRID_COLUMNS
      || heightCells < 1 || heightCells > BATTLE_ENEMY_GRID_ROWS) {
    return null;
  }
  return {
    monsterId: Number(monsterId),
    graphicId: integer$1(source.graphicId),
    widthCells,
    heightCells,
    widthPixels: integer$1(
      source.widthPixels,
      widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    ),
    heightPixels: integer$1(
      source.heightPixels,
      heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    ),
    attackAnchors: Array.isArray(source.attackAnchors)
      ? source.attackAnchors.map(anchor => anchor ? {
        x: integer$1(anchor.x),
        y: integer$1(anchor.y),
        recordId: integer$1(anchor.recordId),
        redirected: Boolean(anchor.redirected),
      } : null)
      : [],
  };
}

function cellsFor(left, top, footprint) {
  const result = [];
  for (let row = top; row < top + footprint.heightCells; row += 1) {
    for (let column = left; column < left + footprint.widthCells; column += 1) {
      result.push(row * BATTLE_ENEMY_GRID_COLUMNS + column);
    }
  }
  return result;
}

function seekPlacement(grid, monsterId, footprint, rules) {
  const rows = rules.rows[rules.listedIds.has(Number(monsterId)) ? 0 : 1];
  // 搜索坐标是足迹左下角；RAM 中保存的 y 则是足迹顶边加一。
  for (const anchorRow of rows) {
    const top = anchorRow - footprint.heightCells + 1;
    if (top < 0) continue;
    for (let left = 0; left < BATTLE_ENEMY_GRID_COLUMNS; left += 1) {
      if (left + footprint.widthCells > BATTLE_ENEMY_GRID_COLUMNS) continue;
      const cells = cellsFor(left, top, footprint);
      if (cells.some(index => grid[index])) continue;
      for (const index of cells) grid[index] = true;
      return {
        anchor: anchorRow * BATTLE_ENEMY_GRID_COLUMNS + left,
        left,
        top,
      };
    }
  }
  return null;
}

function refreshPixelPosition(instance) {
  instance.pixelX = instance.cellX * BATTLE_ENEMY_GRID_CELL_PIXELS;
  instance.pixelY = instance.cellY * BATTLE_ENEMY_GRID_CELL_PIXELS;
  instance.x = instance.pixelX + instance.widthPixels / 2;
  instance.y = instance.pixelY + instance.heightPixels / 2;
  return instance;
}

function createInstance({
  slot,
  groupIndex,
  ordinal,
  monsterId,
  footprint,
  placement,
  phase,
  eventIndex = null,
}) {
  return refreshPixelPosition({
    slot,
    visible: true,
    groupIndex,
    ordinal,
    monsterId: Number(monsterId),
    graphicId: footprint.graphicId,
    phase,
    eventIndex,
    gridAnchor: placement.anchor,
    cellX: placement.left + 1,
    cellY: placement.top + 1,
    widthCells: footprint.widthCells,
    heightCells: footprint.heightCells,
    widthPixels: footprint.widthPixels,
    heightPixels: footprint.heightPixels,
    attackAnchors: footprint.attackAnchors,
  });
}

/** 按当前屏幕坐标重建 `$716F` 占用网格；增援入口走的正是这条路径。 */
function occupancyFromSlots(slots) {
  const grid = Array(gridSize).fill(false);
  for (let slot = BATTLE_ENEMY_INSTANCE_SLOTS - 1; slot >= 0; slot -= 1) {
    const instance = slots[slot];
    if (!instance) continue;
    const left = instance.cellX - 1;
    const top = instance.cellY - 1;
    const footprint = {
      widthCells: instance.widthCells,
      heightCells: instance.heightCells,
    };
    for (const index of cellsFor(left, top, footprint)) {
      if (index >= 0 && index < grid.length) grid[index] = true;
    }
  }
  return grid;
}

function reject(state, eventIndex, code, reason) {
  state.rejections.push({eventIndex, code, reason});
}

/** 四个敌群展开为九个运行实例，并执行开战专属的整体纵向校正。 */
function initializeEnemyFormation(groups, footprints, placementDocument) {
  const footprintByMonster = footprintMap(footprints);
  const state = {
    groups: Array.from({length: BATTLE_ENEMY_GROUP_SLOTS}, () => ({
      monsterId: null,
      count: 0,
    })),
    slots: Array(BATTLE_ENEMY_INSTANCE_SLOTS).fill(null),
    grid: Array(gridSize).fill(false),
    initialVerticalOffset: 0,
    rejections: [],
  };
  try {
    state.placementRules = placementRules(placementDocument);
  } catch (error) {
    reject(state, null, "invalid-placement-rules", error.message);
    return state;
  }
  let nextSlot = 0;
  for (let groupIndex = 0; groupIndex < BATTLE_ENEMY_GROUP_SLOTS; groupIndex += 1) {
    const source = groups?.[groupIndex] || {};
    const monsterId = integer$1(source.monsterId, -1);
    const desiredCount = Math.max(0, integer$1(source.count));
    state.groups[groupIndex].monsterId = monsterId >= 0 ? monsterId : null;
    for (let ordinal = 1; ordinal <= desiredCount; ordinal += 1) {
      if (nextSlot >= BATTLE_ENEMY_INSTANCE_SLOTS) {
        reject(state, null, "initial-instance-limit", "开战实例超过九个");
        break;
      }
      const footprint = normalizedFootprint(footprintByMonster, monsterId);
      if (!footprint) {
        reject(state, null, "missing-footprint", `怪物 ${monsterId} 缺少有效占格`);
        break;
      }
      const placement = seekPlacement(state.grid, monsterId, footprint, state.placementRules);
      if (!placement) {
        reject(state, null, "initial-grid-full", `怪物 ${monsterId} 无法放入开战网格`);
        break;
      }
      state.slots[nextSlot] = createInstance({
        slot: nextSlot,
        groupIndex,
        ordinal,
        monsterId,
        footprint,
        placement,
        phase: "initial",
      });
      state.groups[groupIndex].count += 1;
      nextSlot += 1;
    }
  }

  const firstOccupied = state.grid.findIndex(Boolean);
  if (firstOccupied >= 0) {
    const firstRow = Math.floor(firstOccupied / BATTLE_ENEMY_GRID_COLUMNS);
    state.initialVerticalOffset = Math.floor(firstRow / 2);
    for (const instance of state.slots) {
      if (!instance) continue;
      instance.cellY -= state.initialVerticalOffset;
      refreshPixelPosition(instance);
    }
  }
  state.grid = occupancyFromSlots(state.slots);
  return state;
}

function cloneFormationState(source) {
  return {
    ...source,
    groups: source.groups.map(group => ({...group})),
    slots: source.slots.map(instance => instance ? {...instance} : null),
    grid: [...source.grid],
    rejections: source.rejections.map(item => ({...item})),
  };
}

function refreshManualGroups(state) {
  const counts = Array(BATTLE_ENEMY_GROUP_SLOTS).fill(0);
  for (const instance of state.slots) {
    if (!instance) continue;
    const groupIndex = integer$1(instance.groupIndex, -1);
    if (groupIndex < 0 || groupIndex >= counts.length) continue;
    counts[groupIndex] += 1;
    instance.ordinal = counts[groupIndex];
  }
  state.groups.forEach((group, index) => {
    group.count = counts[index];
    if (!group.count) group.monsterId = null;
  });
}

function manualGroupIndex(state, monsterId, releasedGroupIndex) {
  const existing = state.groups.findIndex(
    group => group.count > 0 && Number(group.monsterId) === Number(monsterId),
  );
  if (existing >= 0) return existing;
  if (releasedGroupIndex >= 0
      && state.groups[releasedGroupIndex]?.count === 0) {
    return releasedGroupIndex;
  }
  for (let index = BATTLE_ENEMY_GROUP_SLOTS - 1; index >= 0; index -= 1) {
    if (state.groups[index].count === 0) return index;
  }
  return -1;
}

function setManualEnemySlot(state, footprintByMonster, slot, monsterId) {
  const previous = state.slots[slot];
  if (monsterId === null) {
    if (previous) state.slots[slot] = null;
    refreshManualGroups(state);
    state.grid = occupancyFromSlots(state.slots);
    return null;
  }
  if (previous && Number(previous.monsterId) === Number(monsterId)) {
    previous.phase = "manual";
    return null;
  }
  const releasedGroupIndex = previous ? Number(previous.groupIndex) : -1;
  if (previous) state.slots[slot] = null;
  refreshManualGroups(state);
  const groupIndex = manualGroupIndex(
    state,
    Number(monsterId),
    releasedGroupIndex,
  );
  if (groupIndex < 0) return {
    code: "manual-group-limit",
    reason: "手动槽位不能同时使用超过四种怪物",
  };
  const footprint = normalizedFootprint(footprintByMonster, monsterId);
  if (!footprint) return {
    code: "missing-footprint",
    reason: `怪物 ${monsterId} 缺少有效占格`,
  };
  const grid = occupancyFromSlots(state.slots);
  const placement = seekPlacement(grid, monsterId, footprint, state.placementRules);
  if (!placement) return {
    code: "manual-grid-full",
    reason: `怪物 ${monsterId} 找不到可用网格位置`,
  };
  const group = state.groups[groupIndex];
  group.monsterId = Number(monsterId);
  group.count += 1;
  state.slots[slot] = createInstance({
    slot,
    groupIndex,
    ordinal: group.count,
    monsterId,
    footprint,
    placement,
    phase: "manual",
  });
  refreshManualGroups(state);
  state.grid = grid;
  return null;
}

/**
 * Apply editor-only per-instance choices on top of the ROM formation result.
 * Slot identity remains fixed, while footprint and position still go through
 * the shared placement algorithm. Missing keys mean “follow automatic layout”;
 * an explicit null means an intentionally empty slot.
 */
function applyEnemySlotOverrides(formation, overrides, footprints) {
  let state = cloneFormationState(formation);
  if (!state.placementRules) return state;
  const footprintByMonster = footprintMap(footprints);
  for (let slot = 0; slot < BATTLE_ENEMY_INSTANCE_SLOTS; slot += 1) {
    if (!Object.prototype.hasOwnProperty.call(overrides || {}, slot)) continue;
    const value = overrides[slot];
    const monsterId = value === null ? null : integer$1(value, -1);
    if (monsterId !== null && monsterId < 0) continue;
    const snapshot = cloneFormationState(state);
    const error = setManualEnemySlot(state, footprintByMonster, slot, monsterId);
    if (!error) continue;
    state = snapshot;
    state.rejections.push({
      eventIndex: null,
      slot,
      code: error.code,
      reason: error.reason,
    });
  }
  return state;
}

function highestEmptySlot(slots) {
  for (let slot = BATTLE_ENEMY_INSTANCE_SLOTS - 1; slot >= 0; slot -= 1) {
    if (!slots[slot]) return slot;
  }
  return -1;
}

function joinMonster(state, footprintByMonster, {
  eventIndex,
  groupIndex,
  monsterId,
}) {
  const slot = highestEmptySlot(state.slots);
  if (slot < 0) {
    reject(state, eventIndex, "runtime-instance-limit", "没有空闲的九实例槽");
    return;
  }
  const footprint = normalizedFootprint(footprintByMonster, monsterId);
  if (!footprint) {
    reject(state, eventIndex, "missing-footprint", `怪物 ${monsterId} 缺少有效占格`);
    return;
  }
  const grid = occupancyFromSlots(state.slots);
  const placement = seekPlacement(grid, monsterId, footprint, state.placementRules);
  if (!placement) {
    reject(state, eventIndex, "reinforcement-grid-full", `怪物 ${monsterId} 找不到增援空位`);
    return;
  }
  const group = state.groups[groupIndex];
  group.monsterId = Number(monsterId);
  group.count += 1;
  state.slots[slot] = createInstance({
    slot,
    groupIndex,
    ordinal: group.count,
    monsterId,
    footprint,
    placement,
    phase: "reinforcement",
    eventIndex,
  });
  state.grid = grid;
}

function applyEvent(state, event, eventIndex, footprintByMonster) {
  if (event?.type === "remove") {
    const slot = integer$1(event.slot, -1);
    const instance = state.slots[slot];
    if (!instance) {
      reject(state, eventIndex, "remove-empty-slot", `敌方实例槽 ${slot + 1} 已为空`);
      return;
    }
    state.slots[slot] = null;
    const group = state.groups[instance.groupIndex];
    group.count = Math.max(0, group.count - 1);
    state.grid = occupancyFromSlots(state.slots);
    return;
  }
  if (event?.type === "join-same") {
    const groupIndex = integer$1(event.groupIndex, -1);
    const group = state.groups[groupIndex];
    if (!group || group.count < 1 || group.monsterId === null) {
      reject(state, eventIndex, "missing-source-group", "召唤必须选择一个仍有实例的敌群");
      return;
    }
    joinMonster(state, footprintByMonster, {
      eventIndex,
      groupIndex,
      monsterId: group.monsterId,
    });
    return;
  }
  if (event?.type === "join-new") {
    let groupIndex = -1;
    for (let index = BATTLE_ENEMY_GROUP_SLOTS - 1; index >= 0; index -= 1) {
      if (state.groups[index].count === 0) {
        groupIndex = index;
        break;
      }
    }
    if (groupIndex < 0) {
      reject(state, eventIndex, "runtime-group-limit", "没有空闲的四敌群槽");
      return;
    }
    joinMonster(state, footprintByMonster, {
      eventIndex,
      groupIndex,
      monsterId: integer$1(event.monsterId, -1),
    });
    return;
  }
  reject(state, eventIndex, "unknown-event", "无法识别的战斗中途事件");
}

/** 从开战配置重放死亡、召唤和支援，得到当前九实例 RAM 语义状态。 */
function replayEnemyFormation(groups, events, footprints, placementDocument) {
  const state = initializeEnemyFormation(groups, footprints, placementDocument);
  if (!state.placementRules) return state;
  const footprintByMonster = footprintMap(footprints);
  for (let index = 0; index < (events || []).length; index += 1) {
    applyEvent(state, events[index], index, footprintByMonster);
  }
  return state;
}

// @editor-module 编排战斗预览配置、参战实体、攻击来源和消息窗口。

/**
 * 这条行动说的那句战斗文本，取**当前**文本记录，不取 `text_hint`。
 *
 * `text_hint` 是抽取期随 enemy-action 一起投影下来的一份副本；改了文本记录它不会
 * 跟着变。要能改就得读当前正文，改不了（记录不可编辑、字符映射没到位）时才退回
 * 那份副本，并说清为什么只能看。
 */
function messageState(action) {
  const nodeId = String(action?.fields?.message?.value || "");
  const hint = String(action?.fields?.message?.text_hint || "");
  const encoding = state.project?.text_record_encoding;
  const document_ = state.project?.text_record_edits;
  if (!nodeId) return {nodeId: "", text: hint, editable: false, reason: "没有消息记录"};
  if (!document_ || !encoding) {
    return {nodeId, text: hint, editable: false, reason: "当前项目没有可用字符映射"};
  }
  let record = null;
  try {
    record = textRecord(document_, nodeId);
  } catch (_error) {
    record = null;
  }
  if (!record) {
    return {nodeId, text: hint, editable: false, reason: "当前项目没有这条文本记录"};
  }
  let text = hint;
  try {
    text = decodeFixedTextRecord(record, encoding).text;
  } catch (error) {
    return {nodeId, text: hint, editable: false, reason: error?.message || String(error)};
  }
  if (!record.editable) {
    return {
      nodeId, text, editable: false,
      reason: record.readonly_reason || "这条文本记录不可逐字编辑",
    };
  }
  return {
    nodeId, text, editable: true, reason: "",
    capacity: Number(record.editable_byte_capacity),
  };
}

const BATTLE_SCENE_PARTY_SLOTS = 3;
const BATTLE_SCENE_ENEMY_GROUP_SLOTS = BATTLE_ENEMY_GROUP_SLOTS;
const BATTLE_SCENE_ENEMY_SLOTS = BATTLE_ENEMY_INSTANCE_SLOTS;
const BATTLE_SCENE_WIDTH = 256;
const BATTLE_SCENE_HEIGHT = 240;
const BATTLE_SCENE_FIELD_HEIGHT = 144;

/** 消费已发布的屏幕像素层；不从采样画面或底层格子反推窗口。 */
function battleMessageWindow(templates, stateId, {recordIds = [], slotIds = [], templateId = "", sceneId = ""} = {}) {
  const binding = uiTemplateBinding(templates, stateId, {recordIds, templateId, sceneId});
  if (!binding) {
    return {stateId, layers: [], reason: templates?.unbound_states?.find(
      item => item.state === stateId,
    )?.reason || `未发布 ${stateId} 的消息窗绑定`};
  }
  const template = templates.templates?.find(item => item.id === binding.template);
  if (template?.viewport?.coordinate_space !== "screen-pixels") {
    throw new Error(`${binding.template} 没有屏幕像素布局`);
  }
  const layers = (template.frame_layers || []).map(layer => {
    const window = templates.scene_windows?.find(item => item.id === layer.window);
    if (layer.kind !== "scene_window_raster"
        || window?.raster?.format !== "indexed-color-rows"
        || !layer.rectangle) {
      throw new Error(`${binding.template} 的窗口像素层不可用`);
    }
    return {windowId: window.id, rectangle: layer.rectangle, raster: window.raster};
  });
  if (!layers.length) throw new Error(`${binding.template} 没有窗口像素层`);
  const textSlot = (slot, fill, textRecordRef) => {
    if (!slot?.geometry || !textRecordRef) {
      throw new Error(`${binding.template} 缺少文字槽位几何／记录引用`);
    }
    return {textRecordRef, geometry: slot.geometry, fonts: slot.fonts,
      ...textSlotProviderBindings(fill), ...textSlotRuntimeParameters(templates, slot)};
  };
  // 槽位的顺序与几何由模板声明；未带本次记录时仍消费原状态的 fills。
  const messageSlots = (template.content_slots || []).filter(slot =>
    slot.role === "message" && slot.fillable === true);
  const missingRecords = recordIds.slice(messageSlots.length);
  const reason = missingRecords.length
    ? `当前状态 ${stateId} 已发布 ${messageSlots.length} 个正文槽位，本次 ${recordIds.length} 条消息缺 ${missingRecords.length} 个槽位：${missingRecords.join("、")}（UI 消息提取）`
    : "";
  const textSlots = recordIds.length ? recordIds.map((recordId, index) => {
    const slot = slotIds.length
      ? messageSlots.find(item => item.id === slotIds[index]) : messageSlots[index];
    const reference = {resource_id: "text-record", node_id: recordId};
    if (!slot) return {textRecordRef: reference, unavailableReason: reason};
    // 原 fill 的调用参数只能留给同一记录，不能借给换入的消息。
    const fill = binding.fills?.find(item => item.slot === slot.id
      && item.text_record_ref?.resource_id === reference.resource_id
      && item.text_record_ref?.node_id === recordId);
    return textSlot(slot, fill, fill?.text_record_ref || reference);
  }) : (binding.fills || []).map(fill => textSlot(
    template.content_slots?.find(item => item.id === fill.slot), fill, fill.text_record_ref,
  ));
  const located = [...(binding.fills || []).map(fill => fill.text_record_ref?.node_id),
    ...(binding.deferred_records || [])];
  const messagePhases = textSlots.flatMap((slot, index) => located.includes(slot.textRecordRef?.node_id)
    && slot.geometry ? [{state: stateId, template: template.id,
      slot: slotIds[index] || (recordIds.length ? messageSlots[index]?.id : binding.fills[index]?.slot),
      text_record_ref: slot.textRecordRef, retain_previous: false}] : []);
  return {stateId, templateId: template.id, layers, textSlots, messagePhases, reason};
}

/** Consume each phase's own slot and explicit preceding-text retention. */
function battleMessageSequenceWindow(templates, phases, phaseCount = phases.length) {
  if (!Number.isInteger(phaseCount) || phaseCount < 1 || phaseCount > phases.length) {
    throw new Error("消息阶段超出已发布序列");
  }
  let window;
  let visible = [];
  let declaredVisible = [];
  const phaseSlots = new Map();
  for (const [index, phase] of phases.entries()) {
    const reference = phase.text_record_ref;
    const binding = uiTemplateBinding(templates, phase.state, {
      recordIds: [reference?.node_id], templateId: phase.template || "",
    });
    const template = templates.templates.find(row => row.id === binding?.template);
    const located = [...(binding?.fills || []).map(fill => fill.text_record_ref?.node_id),
      ...(binding?.deferred_records || [])];
    if (reference?.resource_id !== "text-record" || !located.includes(reference.node_id)
        || !template?.content_slots?.some(slot => slot.id === phase.slot
          && slot.role === "message" && slot.fillable === true)
        || typeof phase.retain_previous !== "boolean" || (index === 0 && phase.retain_previous)) {
      throw new Error(`阶段 ${index + 1} 的记录、状态、槽位或前文保留关系无效`);
    }
    const retained = phase.retain_phase_indices;
    if (retained !== undefined && (!Array.isArray(retained)
        || new Set(retained).size !== retained.length
        || retained.some(value => !Number.isInteger(value) || !declaredVisible.includes(value))
        || phase.retain_previous !== (retained.length > 0))) {
      throw new Error(`阶段 ${index + 1} 的保留阶段无效`);
    }
    declaredVisible = [...(retained ?? (phase.retain_previous ? declaredVisible : [])), index];
    if (index >= phaseCount) continue;
    window = battleMessageWindow(templates, phase.state, {
      recordIds: [reference.node_id], slotIds: [phase.slot], templateId: phase.template || "",
    });
    if (retained !== undefined) visible = retained.flatMap(value => phaseSlots.get(value));
    else if (!phase.retain_previous) visible = [];
    const slots = window.textSlots.map(slot => ({...slot,
      phaseIndex: index,
      includesItemName: phase.includes_item_name === true,
      previewPlaceholders: phase.preview_placeholders,
      enemyActionReference: phase.enemy_action_reference}));
    phaseSlots.set(index, slots);
    visible.push(...slots);
  }
  return {...window, textSlots: visible, messagePhases: structuredClone(phases.slice(0, phaseCount)),
    phaseCount, totalPhases: phases.length};
}

/** Resolve the visible end of a published item sequence, including retained text. */
function battleItemMessageWindow(templates, item, outcomeId = "") {
  const effect = item?.battle_use_effect;
  const recordIds = (effect?.text_outputs || []).map(output => output.text_record?.node_id).filter(Boolean);
  const resultScript = Number.isInteger(effect?.result_selector)
    ? recordUid("battle-result-script", effect.result_selector) : null;
  const sequences = (templates?.battle_message_sequences || []).filter(sequence =>
    !sequence.enemy_action_reference && sequence.result_script === resultScript
      && (sequence.item_reference === undefined
        || sequence.item_reference === recordUid(item.category.id, item.id)));
  // Existing single-record bindings still serve primary use messages. Several
  // records require a witnessed sequence; their array order is not a layout.
  if (!sequences.length && recordIds.length <= 1) return null;
  const blocked = reason => ({stateId: "", layers: [], reason, textSlots: recordIds.map(nodeId => ({
    textRecordRef: {resource_id: "text-record", node_id: nodeId}, unavailableReason: reason,
  }))});
  if (sequences.length !== 1) {
    return blocked(`当前道具结果 ${resultScript || "未确认"} 尚无唯一的消息顺序与前文保留声明（UI 消息提取）`);
  }
  try {
    const sequence = sequences[0];
    let {phases, unresolved_reason: unresolvedReason} = sequence;
    const outcomes = sequence.outcomes || [];
    const references = phases?.map(phase => phase.text_record_ref?.node_id) || [];
    if (!references.length || references.length !== recordIds.length
        || [...references].sort().some((id, index) => id !== [...recordIds].sort()[index])) {
      throw new Error("阶段记录与当前道具消息引用不一致");
    }
    if (outcomeId) {
      const selected = outcomes.filter(outcome => outcome.id === outcomeId);
      if (selected.length !== 1 || !Array.isArray(selected[0].phases)) {
        throw new Error("未发布所选结果");
      }
      phases = [...phases, ...selected[0].phases];
      unresolvedReason = selected[0].unresolved_reason || "";
    }
    const window = battleMessageSequenceWindow(templates, phases);
    return {...window, sequenceId: resultScript,
      outcomes: outcomes.map(({id, label}) => ({id, label})), outcomeId,
      sequenceComplete: !unresolvedReason, reason: unresolvedReason || window.reason};
  } catch (error) {
    return blocked(`当前道具结果 ${resultScript} 的消息声明无效：${error.message}`);
  }
}

/** Enemy results require the selected action and the witnessed script branch. */
function battleEnemyMessageWindow(templates, action, {
  outcomeId = "", phaseCount = null, resultRecords = [],
} = {}) {
  if (!action?.handle) return null;
  const sequences = (templates?.battle_message_sequences || []).filter(sequence =>
    sequence.enemy_action_reference === action?.handle);
  if (!sequences.length) return null;
  const recordId = action?.fields?.message?.value;
  try {
    if (sequences.length !== 1) throw new Error("行动没有唯一的消息序列");
    const sequence = sequences[0];
    if (sequence.result_script !== action.fields?.result_script?.value
        || sequence.phases?.length !== 1
        || sequence.phases[0].text_record_ref?.node_id !== recordId) {
      throw new Error("当前行动的提示或结果脚本与采集声明不一致");
    }
    if (!sequence.result_script_dependencies?.length
        || sequence.result_script_dependencies.some(expected => {
          const current = resultRecords.find(record => record.handle === expected.handle);
          return JSON.stringify(current?.raw_bytes) !== JSON.stringify(expected.raw_bytes);
        })) throw new Error("当前结果脚本与已取证分支不一致");
    const outcomes = sequence.outcomes || [];
    const selected = outcomeId ? outcomes.find(outcome => outcome.id === outcomeId) : null;
    if (outcomeId && !selected) throw new Error("未发布所选敌方结果");
    const phases = [...sequence.phases, ...(selected?.phases || [])].map(phase => ({
      ...phase, enemy_action_reference: action.handle,
    }));
    const window = battleMessageSequenceWindow(templates, phases, phaseCount ?? phases.length);
    const unresolvedReason = selected ? selected.unresolved_reason : sequence.unresolved_reason;
    return {...window, sequenceId: action.handle,
      outcomes: outcomes.map(({id, label}) => ({id, label})), outcomeId,
      sequenceComplete: !unresolvedReason && window.phaseCount === window.totalPhases,
      reason: unresolvedReason || window.reason};
  } catch (error) {
    const reason = `当前敌方行动 ${action.handle} 的消息声明不可用：${error.message}`;
    return {stateId: "", layers: [], reason, textSlots: [{
      textRecordRef: {resource_id: "text-record", node_id: recordId}, unavailableReason: reason,
    }]};
  }
}

/** Bind this invocation; the shared text renderer selects each record's own insertion. */
function battleMessageTextSlot(slot, {attack, action, monster, saveSlot, project, runtime = null,
  actor = null, catalog = null, saveFields = null, battleContext = null, messageContext = null}) {
  if (!slot.runtimeParameters) return slot;
  if (battleContext) return battleContextTextSlot(slot,
    createBattleContextValues({...battleContext, catalog: slot.runtimeParameters}), messageContext);
  const partyAction = attack?.side === "party";
  const vehicle = partyAction && attack.attacker?.riding
    ? battleScenePartyVehicle(catalog || battleScenePreviewCatalog(project), attack.attacker) : null;
  // 17:075E-0777 prepares D4's monster reference through 17:1052 before
  // showing this enemy-action's message. This does not describe later results.
  const enemyAction = attack?.side === "enemy"
    && action?.fields?.message?.value === slot.textRecordRef?.node_id;
  const enemyResult = attack?.side === "enemy" && action?.handle
    && slot.enemyActionReference === action.handle;
  const invocation = {kind: runtime ? "battle-sequence" : partyAction ? "party-action" : enemyAction ? "enemy-action"
    : enemyResult ? "enemy-result" : null, saveSlot,
    runtime,
    monster: enemyAction && monster?.id === attack.attacker?.monsterId ? monster : null,
    enemyGroupCount: enemyAction ? attack.attackerGroupCount : null,
    item: partyAction && attack.channel === "item" ? attack.source?.source.item : null,
    shell: partyAction && attack.channel === "shell" ? attack.source?.source : null,
    actor: !partyAction ? null : actor || (attack.attacker?.riding
      ? {kind: "vehicle", id: vehicle?.preset?.vehicle_slot}
      : {kind: "role", id: attack.attacker?.roleId})};
  return {...slot, invocation, resolveRuntimeParameter({source, text_record_ref, invocation: current}) {
    // An explicit preview declaration belongs to this selected outcome's phase.
    // It does not manufacture runtime identity, values, or a missing text slot.
    const placeholder = slot.previewPlaceholders?.[source];
    if (placeholder && ((current.kind === "party-action" && current.item)
        || current.kind === "enemy-result")) {
      return {...placeholder, status: "placeholder"};
    }
    const observed = current.kind === "battle-sequence"
      ? current.runtime?.placeholdersByRecord?.[slot.textRecordRef?.node_id]?.[source]
        || current.runtime?.placeholders?.[source] : null;
    if (observed?.text && observed.label) return {...observed, status: "placeholder"};
    switch (source) {
      case "ui-text-provider-workspace.current-string":
        return current.kind === "party-action"
          ? currentActorNameSource({saveSlot: current.saveSlot, actor: current.actor,
            fieldObjects: state.saveCurrentBytes && state.saveByteMapDocument
              ? (saveFields || createSaveCurrentFieldObjects(state))
                .all(`save.slot.${current.saveSlot}.${current.actor?.kind}.`) : null})
          : {status: "unavailable", reason: "缺少本次消息的出手者调用现场（battle-engine／预览调用方）"};
      case "ui-text-provider-zero-page-overlays.current-record": {
        if (current.shell && slot.includesShellName === true) {
          const shell = current.shell;
          return shell.name_authority === "rom-region-0D-record-runtime-verified"
            && shell.name_text_region === "0D" && Number.isInteger(shell.name_text_record_id)
            ? {status: "available", value: {resource_id: "text-record",
              node_id: textRecordNodeId(0x0d, shell.name_text_record_id)}}
            : {status: "unavailable", reason: "当前炮弹缺少名称文本引用"};
        }
        if (current.kind === "battle-sequence" && current.runtime?.monsterNameRef) {
          return {status: "available", value: current.runtime.monsterNameRef};
        }
        if (current.kind === "enemy-action") {
          const reference = current.monster?.name_reference;
          return reference?.mapping_status === "confirmed" && reference.node_id
            ? {status: "available", value: {resource_id: "text-record", node_id: reference.node_id}}
            : {status: "unavailable", reason: "当前出手怪物缺少权威名称文本引用（monster-profile／text-record）"};
        }
        // 发布的道具输出声明本次提示包含所选物品名；只交权威记录引用，不拼名字。
        const item = current.item;
        const itemMessage = item?.battle_use_effect?.text_outputs?.find(output =>
          output.includes_item_name === true
            && output.text_record?.node_id === text_record_ref.node_id);
        if (itemMessage || (item && slot.includesItemName === true
            && slot.textRecordRef?.node_id === text_record_ref.node_id)) {
          const nodeId = itemNameRecordId(item);
          return nodeId
            ? {status: "available", value: {resource_id: "text-record", node_id: nodeId}}
            : {status: "unavailable", reason: "当前道具缺少权威名称文本引用（item-entry／text-record）"};
        }
        return {status: "unavailable", reason: "缺少本次消息的敌群／目标／物品文本引用取值接口（battle-result-script／battle-target-context-service／battle-item-service）"};
      }
      case "ui-text-provider-workspace.target-instance-suffix":
        // 17:105D-1069 terminates the suffix for a group of fewer than two.
        // Multiple-instance labels still require the owner's encoded source.
        if ((current.kind === "enemy-action" && current.enemyGroupCount === 1)
            || (current.kind === "battle-sequence" && current.runtime?.enemyGroupCount === 1)) {
          return {status: "empty"};
        }
        return {status: "unavailable", reason: "缺少本次目标实例后缀值（battle-target-context-service）"};
      case "ui-text-provider-zero-page-overlays.battle-quantity":
        return {status: "unavailable", reason: "缺少本次战斗结算数值（battle-result-script／伤害与回复数值服务）"};
      default:
        return {status: "unavailable", reason: `参数来源 ${source} 尚无本次调用的取值接口`};
    }
  }};
}

/** 四类装备攻击入口；炮弹属于独立的库存选择，不占装备槽。 */
const BATTLE_SCENE_PARTY_ATTACK_CHANNELS = Object.freeze([
  Object.freeze({key: "melee", label: "白刃战", categoryId: "human-weapon"}),
  Object.freeze({
    key: "main", label: "主炮", categoryId: "tank-main-gun", loadoutSlotId: "main_gun",
  }),
  Object.freeze({
    key: "sub", label: "副炮", categoryId: "tank-sub-gun", loadoutSlotId: "sub_gun",
  }),
  Object.freeze({
    key: "special", label: "S-E", categoryId: "tank-special", loadoutSlotId: "special",
  }),
]);

const PARTY_ATTACK_CHANNEL_KEYS = new Set(
  [...BATTLE_SCENE_PARTY_ATTACK_CHANNELS.map(item => item.key), "shell", "item"],
);

// PRG:02E04A/02E0B3 adds a party-count offset to the anchors from PRG:02E089/02E0B1.
// The four battle-role sprites have their visual center 8 pixels before the game anchor.
const PARTY_GAME_X = 0xE8;
const PARTY_GAME_Y = Object.freeze([0x38, 0x58, 0x78]);
const PARTY_COUNT_Y_OFFSET = Object.freeze([0, 0x20, 0x10, 0]);
const PARTY_VISUAL_CENTER_OFFSET = 8;
function battlePartyVisualPosition(index, activeCount) {
  const count = clamp(activeCount, 0, BATTLE_SCENE_PARTY_SLOTS);
  return {
    x: PARTY_GAME_X - PARTY_VISUAL_CENTER_OFFSET,
    y: PARTY_GAME_Y[index] + PARTY_COUNT_Y_OFFSET[count]
      - PARTY_VISUAL_CENTER_OFFSET,
  };
}
// AttackCmd12_AlternateSpawnObject 固定 X=$D8；我方战斗精灵的游戏 X
// 基准是 $E8，因此敌方 `$12` 受击对象位于目标游戏锚点左侧 16 像素。
const ENEMY_IMPACT_X_FROM_PARTY_GAME_ANCHOR = -16;

const integer = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isInteger(result) ? result : fallback;
};

const clamp = (value, minimum, maximum) =>
  Math.max(minimum, Math.min(maximum, integer(value, minimum)));

function weaponAssets(project) {
  return project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function roleRecords(project) {
  return project?.game_data?.characters?.rom_initial?.roles || [];
}

function monsterRecords(project) {
  return project?.game_data?.monsters?.records || [];
}

function attackEquipmentRecords(project, assets) {
  const itemsById = new Map(
    (project?.game_data?.items?.records || []).map(item => [Number(item.id), item]),
  );
  const effectiveRecord = snapshot => {
    const item = itemsById.get(Number(snapshot.id));
    const visualCode = Number(item?.attack_visual?.visual_code);
    const scope = item?.equipment?.target_scope || null;
    if (!item || !Number.isInteger(visualCode)) return null;
    return {
      id: Number(item.id),
      id_hex: item.id_hex,
      name: item.name,
      owner: item.category?.owner,
      category: item.category,
      category_id: item.category?.id,
      category_name: item.category?.name,
      launch_anchor_profile_id: snapshot.launch_anchor_profile_id
        || item.category?.id,
      visual_code: visualCode,
      visual_code_hex: item.attack_visual.visual_code_hex,
      visual_resource: item.attack_visual.resource_id,
      visual_source: item.attack_visual.source,
      target_scope: scope?.id || null,
      target_scope_label: scope?.label || null,
      item,
    };
  };
  return {
    human: (assets.human_weapons || []).map(effectiveRecord).filter(Boolean),
    tank: (assets.tank_weapons || []).map(effectiveRecord).filter(Boolean),
  };
}

function effectLabel(item) {
  return item.display_name || item.stable_name || item.label
    || `攻击视觉 ${item.visual_code_hex || item.visual_code}`;
}

const ATTACK_SCOPES = new Set(["single", "group", "all"]);

function semanticAttackScope(source) {
  const value = String(source?.target_scope || "");
  return ATTACK_SCOPES.has(value) ? value : null;
}

function expandedMonsterAttackProfiles(profiles) {
  return (profiles || []).flatMap(profile => {
    const modes = [profile?.attack_modes, profile?.attacks, profile?.modes]
      .find(Array.isArray);
    if (!modes?.length) return [{...profile, modeIndex: 0}];
    return modes.map((mode, modeIndex) => ({
      ...profile,
      ...mode,
      monster_id: profile.monster_id,
      monster_id_hex: profile.monster_id_hex,
      monster_name_hint: profile.monster_name_hint,
      modeIndex,
    }));
  });
}

/** 当前项目可供编排器引用的基础资产目录。 */
function battleScenePreviewCatalog(project) {
  const assets = weaponAssets(project);
  // 武器图形包拥有共享动画脚本与锚点，不拥有装备到动画编号的当前配置。
  // 映射、名称和攻击范围都从 item-entry 的有效文档即时投影，保存装备后战斗
  // 场景无需重新提取或重载图形包即可使用新特效。
  const equipment = attackEquipmentRecords(project, assets);
  const actorCatalog = battleActorCatalog(project);
  const clips = (assets.clean_animations?.catalog
    || assets.clean_animations?.clips || []).filter(
    item => item.preview_status !== "opaque-preserved-not-rendered"
  );
  const clipByCode = new Map(clips.map(item => [Number(item.visual_code), item]));
  const launchAnchorProfiles = assets.attack_launch_anchor_profiles || [];
  const launchAnchorProfileById = new Map(
    launchAnchorProfiles.map(item => [String(item.id), item]),
  );
  const appearances = actorCatalog.appearances;
  const normalAppearances = appearances.filter(item => item.kind !== "vehicle");
  const vehicleAppearances = appearances.filter(item => item.kind === "vehicle");
  const battleSprites = actorCatalog.actions;
  const footprintByMonster = new Map(
    (project?.visuals?.monster_formation_footprints || []).map(
      item => [Number(item.monsterId), item],
    ),
  );
  const monsters = monsterRecords(project).map(record => ({
    id: Number(record.id),
    label: record.name || `怪物 ${record.id_hex || record.id}`,
    record,
    footprint: footprintByMonster.get(Number(record.id)) || null,
  })).filter(item => item.footprint);
  const roles = roleRecords(project).slice(0, BATTLE_SCENE_PARTY_SLOTS).map(role => ({
    id: Number(role.id),
    label: role.name || role.slug || `角色 ${Number(role.id) + 1}`,
    role,
  }));

  const attackSources = [{
    key: "auto", group: "自动", label: "按攻击方当前配置", visualCode: null,
  }];
  const humanWeaponSources = [];
  const tankWeaponSources = [];
  for (const [group, entries] of [
    ["人类武器", equipment.human],
    ["战车武器", equipment.tank],
  ]) {
    for (const item of entries) {
      const visualCode = Number(item.visual_code);
      const source = {
        key: `${item.owner}:${Number(item.id)}`,
        group,
        label: `${item.name || `${group} ${item.id_hex}`} · ${
          item.target_scope_label || "范围未标注"
        } · ${item.visual_code_hex}`,
        actionLabel: item.name || `${group} ${item.id_hex}`,
        visualCode,
        visualAvailable: clipByCode.has(visualCode),
        targetScope: semanticAttackScope(item),
        launchAnchorProfileId: String(item.launch_anchor_profile_id || ""),
        launchAnchorProfile: launchAnchorProfileById.get(
          String(item.launch_anchor_profile_id || ""),
        ) || null,
        source: item,
      };
      attackSources.push(source);
      (group === "人类武器" ? humanWeaponSources : tankWeaponSources).push(source);
    }
  }
  const partyWeaponSources = [...humanWeaponSources, ...tankWeaponSources];
  const partyAttackChannels = BATTLE_SCENE_PARTY_ATTACK_CHANNELS.map(channel => ({
    ...channel,
    launchAnchorProfile: launchAnchorProfileById.get(channel.categoryId) || null,
    sources: partyWeaponSources.filter(
      source => channel.loadoutSlotId
        ? (project.game_data.items?.records || []).find(item => Number(item.id) === Number(source.source?.id))
          ?.mountable_slots?.includes(channel.loadoutSlotId)
        : String(source.source?.category_id) === channel.categoryId,
    ),
  }));
  const shellAttackChannel = {
    key: "shell", label: "炮弹", anchorLabel: "主炮",
    launchAnchorProfile: launchAnchorProfileById.get("tank-main-gun") || null,
    sources: (project?.game_data?.shells?.records || []).map(record => {
      const visualCode = record.visual_code == null ? null : Number(record.visual_code);
      const label = record.name || `炮弹 ${record.id_hex || record.id}`;
      return {
        key: `shell:${Number(record.id)}`, group: "炮弹", label, actionLabel: label,
        visualCode,
        visualAvailable: Number.isInteger(visualCode) && clipByCode.has(visualCode),
        source: record,
      };
    }),
  };
  attackSources.push(...shellAttackChannel.sources);
  const itemService = project?.game_data?.battle_item_service;
  const presentations = new Map([
    ...(itemService?.human_item_presentations || []),
    ...(itemService?.vehicle_item_presentations || []),
  ].map(entry => [entry.item_reference, battleItemPresentation(itemService, entry)]));
  const clipByReference = new Map(clips.map(clip => [
    recordUid("attack-visual", clip.visual_code), clip,
  ]));
  const itemAttackChannel = {
    key: "item", label: "道具",
    sources: (project?.game_data?.items?.records || []).filter(item =>
      ["human-item", "tank-item"].includes(item.category?.id),
    ).map(item => {
      const key = recordUid(item.category.id, item.id);
      const nameRecord = project?.text_record_edits?.records?.[itemNameRecordId(item)];
      const name = nameRecord && project?.text_record_encoding
        ? decodeFixedTextRecord(nameRecord, project.text_record_encoding).text : item.name;
      const presentation = presentations.get(key);
      const status = presentation?.status || "unpublished";
      const clip = status === "attack-visual-confirmed"
        ? clipByReference.get(presentation.visual_reference) : null;
      const scope = {
        "random-enemy-in-selected-group": "single",
        "selected-enemy-group": "group",
        "all-active-enemies": "all",
      }[presentation?.target_scope];
      const reason = status === "no-attack-visual" ? "本来不播放攻击视觉"
        : status === "unresolved" ? "尚未判清，不表示游戏没有动画"
          : status !== "attack-visual-confirmed" ? "尚无已发布的战斗表现判定，不表示游戏没有动画"
            : !clip ? "攻击视觉已发布，但当前没有可解码片段"
              : !scope ? "道具目标范围尚未支持" : "";
      return {
        key, group: "道具", label: name, actionLabel: name,
        visualCode: clip?.visual_code ?? null,
        visualAvailable: Boolean(clip && scope),
        launchAnchorProfile: item.category.id === "human-item"
          ? launchAnchorProfileById.get("human-weapon") || null : null,
        targetScope: scope || null,
        presentationStatus: status, reason,
        targetScopeNote: presentation?.target_scope === "random-enemy-in-selected-group"
          ? "游戏在所选组内随机取单体；预览使用锚定目标" : "",
        source: {id: Number(item.id), item, presentation},
      };
    }),
  };
  attackSources.push(...itemAttackChannel.sources);
  const monsterAttacks = new Map();
  for (const profile of expandedMonsterAttackProfiles(
    assets.monster_attack_profiles,
  )) {
    const visualCode = profile.visual_code == null
      ? null : Number(profile.visual_code);
    const visualAvailable = Number.isInteger(visualCode)
      && clipByCode.has(visualCode);
    const monsterId = Number(profile.monster_id);
    const modes = monsterAttacks.get(monsterId) || [];
    const key = modes.length
      ? `monster:${monsterId}:${profile.mode_id ?? modes.length}`
      : `monster:${monsterId}`;
    const source = {
      key,
      group: "怪物行动",
      label: `${profile.monster_name_hint || `怪物 ${profile.monster_id_hex}`} · ${
        profile.visual_code_hex
      }`,
      actionLabel: profile.attack_name || profile.mode_name || profile.name
        || profile.label || `攻击 ${profile.visual_code_hex}`,
      visualCode,
      visualAvailable,
      targetScope: semanticAttackScope(profile),
      selectionSlot: Number(profile.selection_slots?.[0] ?? 0),
      selectionSlots: (profile.selection_slots || []).map(Number),
      source: profile,
    };
    modes.push(source);
    monsterAttacks.set(monsterId, modes);
    attackSources.push(source);
  }
  for (const clip of clips) {
    attackSources.push({
      key: `visual:${Number(clip.visual_code)}`,
      group: "直接选择特效",
      label: effectLabel(clip),
      visualCode: Number(clip.visual_code),
      targetScope: semanticAttackScope(clip),
      source: clip,
    });
  }
  const attackSourceByKey = new Map(
    attackSources.map(item => [item.key, item]),
  );
  const appearanceByChassis = new Map(
    vehicleAppearances.map(item => [Number(item.chassisId), item]),
  );
  const vehicleDocument = project?.game_data?.vehicles || {};
  // 18 条 preset 才是载具身份；player/rental 只是权威数据发布的两种用途视图。
  // 每条 preset 只引用自己的底盘外观，并把语义 loadout 投影到三个战车攻击入口。
  const vehiclePresets = vehiclePresetChoices(undefined, vehicleDocument).flatMap(
    ({preset, group, groupLabel}) => {
      const appearance = appearanceByChassis.get(Number(preset?.chassis_id));
      if (!preset || !appearance) return [];
      const attacks = Object.fromEntries(
        partyAttackChannels.filter(channel => channel.loadoutSlotId).map(channel => {
          const slot = (preset.loadout || []).find(
            item => String(item.slot_id) === channel.loadoutSlotId,
          );
          const sourceKey = slot?.empty
            ? "" : `${slot?.category?.owner}:${Number(slot?.item_id)}`;
          const source = attackSourceByKey.get(sourceKey);
          return [
            channel.key,
            source?.source?.category_id === channel.categoryId ? source.key : "",
          ];
        }),
      );
      const id = Number(preset.preset_id);
      // 出租战车用出租名，玩家战车照旧用底盘名。
      const entry = vehiclePresetEntry(preset, group);
      return [{
        id,
        key: `vehicle-preset:${id}`,
        label: entry.label,
        groupId: group,
        groupLabel,
        appearanceKey: appearance.key,
        attacks,
        preset,
      }];
    });
  return {
    roles,
    appearances,
    normalAppearances,
    vehicleAppearances,
    appearanceByKey: actorCatalog.appearanceByKey,
    battleSprites,
    battleSpriteByKey: actorCatalog.actionByKey,
    actorCatalog,
    launchAnchorProfiles,
    launchAnchorProfileById,
    monsters,
    footprints: footprintByMonster,
    placementDocument: project?.battle_engine?.special_monster_placement,
    attackSources,
    attackSourceByKey,
    clipByCode,
    monsterProfiles: new Map(
      [...monsterAttacks].map(([monsterId, modes]) => [
        monsterId,
        modes[0]?.source || null,
      ])
    ),
    monsterAttacks,
    humanWeaponSources,
    tankWeaponSources,
    partyWeaponSources,
    partyAttackChannels,
    shellAttackChannel,
    itemAttackChannel,
    partyAttackChannelByKey: new Map(
      [...partyAttackChannels, shellAttackChannel, itemAttackChannel].map(item => [item.key, item]),
    ),
    vehiclePresets,
    vehiclePresetById: new Map(vehiclePresets.map(item => [item.id, item])),
    humanWeapons: new Map(
      equipment.human.map(item => [Number(item.id), item])
    ),
    tankWeapons: new Map(
      equipment.tank.map(item => [Number(item.id), item])
    ),
  };
}

function defaultNormalAppearanceForRole(catalog, roleId) {
  return catalog.normalAppearances.find(
    item => item.partyRoleId === Number(roleId),
  ) || catalog.normalAppearances[0] || null;
}

function defaultPartyMeleeSource(catalog, role) {
  for (const slot of role?.equipment || []) {
    const weapon = catalog.humanWeapons.get(Number(slot.item_id));
    if (!weapon) continue;
    const source = catalog.attackSourceByKey.get(
      `${weapon.owner}:${Number(weapon.id)}`,
    );
    if (source) return source;
  }
  return catalog.humanWeaponSources[0] || null;
}

function defaultPartyAttacks(catalog, role, vehiclePreset) {
  const melee = defaultPartyMeleeSource(catalog, role);
  return Object.fromEntries([...catalog.partyAttackChannelByKey.values()].map(channel => [
    channel.key,
    channel.key === "melee"
      ? melee?.key || "" : vehiclePreset?.attacks?.[channel.key] || "",
  ]));
}

function withFormation(value, catalog) {
  const formation = applyEnemySlotOverrides(
    replayEnemyFormation(
      value.enemyGroups,
      value.enemyEvents,
      catalog.footprints,
      catalog.placementDocument,
    ),
    value.manualEnemySlots,
    catalog.footprints,
  );
  return {...value, enemies: formation.slots, formation};
}

/** 首次进入页面时的非持久预览状态。 */
function battleScenePreviewDefaults(project, catalog = battleScenePreviewCatalog(project)) {
  const activePartyCount = catalog.roles.slice(0, BATTLE_SCENE_PARTY_SLOTS)
    .filter(item => item?.role?.present).length;
  const worm = catalog.monsters.find(item => item.label.includes("杀人虫"))
    || catalog.monsters[0] || null;
  const monsterId = worm?.id ?? catalog.monsters[0]?.id ?? 0;
  const party = Array.from({length: BATTLE_SCENE_PARTY_SLOTS}, (_, index) => {
    const roleId = catalog.roles[index]?.id ?? index;
    const appearance = defaultNormalAppearanceForRole(catalog, roleId);
    const vehiclePreset = catalog.vehiclePresets[0] || null;
    const position = battlePartyVisualPosition(index, activePartyCount);
    return {
      roleId,
      companion: null,
      visible: Boolean(catalog.roles[index]?.role?.present),
      normalAppearance: appearance?.key || "",
      vehiclePresetId: vehiclePreset?.id ?? null,
      riding: false,
      attacks: defaultPartyAttacks(
        catalog, catalog.roles[index]?.role, vehiclePreset,
      ),
      x: position.x,
      y: position.y,
    };
  });
  return withFormation({
    guides: true,
    party,
    enemyGroups: Array.from(
      {length: BATTLE_SCENE_ENEMY_GROUP_SLOTS},
      (_, index) => ({monsterId, count: index === 0 && worm ? 2 : 0}),
    ),
    enemyEvents: [],
    manualEnemySlots: {},
    reinforcement: {
      mode: "same-group",
      groupIndex: 0,
      monsterId,
    },
    attack: {
      side: "party",
      attacker: 0,
      target: 0,
      partyTarget: 0,
      enemyTarget: 0,
      channel: "melee",
      source: party[0]?.attacks?.melee || "auto",
      scope: "auto",
      frame: 0,
      playNonce: 0,
    },
  }, catalog);
}

/**
 * 把 battle-test-point 的固定四敌群编队接到共享战斗场景模型。
 *
 * 消费端只传 formation id；它不解释怪物槽、占格或战斗图形。空敌群沿用一个
 * 有效的占位 monster id，但数量保持 0，避免把无效的 ROM 空槽伪装成怪物。
 */
function battleScenePreviewForFormation(
  project,
  formationId,
  {guides = false} = {},
) {
  const requestedId = integer(formationId, -1);
  const formation = (project?.game_data?.battle_test?.formations || []).find(
    item => Number(item.id) === requestedId,
  );
  if (!formation) {
    throw new TypeError(`battle-test-point 缺少编队 ${requestedId}`);
  }
  if (!Array.isArray(formation.slots)
      || formation.slots.length !== BATTLE_SCENE_ENEMY_GROUP_SLOTS) {
    throw new TypeError(`编队 ${requestedId} 不是四敌群结构`);
  }
  const catalog = battleScenePreviewCatalog(project);
  const monsterIds = new Set(catalog.monsters.map(item => Number(item.id)));
  const totalCount = formation.slots.reduce((total, slot, index) => {
    const count = Number(slot?.count);
    const monsterId = Number(slot?.monster_id);
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError(`编队 ${requestedId} 敌群 ${index} 数量无效`);
    }
    if (count > 0 && !monsterIds.has(monsterId)) {
      throw new TypeError(
        `编队 ${requestedId} 敌群 ${index} 引用不可绘制怪物 ${monsterId}`,
      );
    }
    return total + count;
  }, 0);
  if (totalCount > BATTLE_SCENE_ENEMY_SLOTS) {
    throw new TypeError(`编队 ${requestedId} 超过九个敌人运行槽`);
  }
  const defaults = battleScenePreviewDefaults(project);
  const enemyGroups = Array.from(
    {length: BATTLE_SCENE_ENEMY_GROUP_SLOTS},
    (_, index) => {
      const slot = formation.slots?.[index] || null;
      const count = Math.max(0, integer(slot?.count, 0));
      return {
        monsterId: count > 0
          ? integer(slot?.monster_id, defaults.enemyGroups[index].monsterId)
          : defaults.enemyGroups[index].monsterId,
        count,
      };
    },
  );
  return normalizeBattleScenePreview({
    ...defaults,
    guides: Boolean(guides),
    enemyGroups,
    enemyEvents: [],
    manualEnemySlots: {},
    attack: {
      ...defaults.attack,
      enemyTarget: 0,
      target: defaults.attack.side === "enemy"
        ? defaults.attack.partyTarget : 0,
      frame: 0,
      playNonce: 0,
    },
  }, project);
}

function normalizeEvents(events, monsterIds, fallbackMonsterId) {
  return (Array.isArray(events) ? events : []).slice(0, 128).flatMap(event => {
    if (event?.type === "remove") {
      return [{type: "remove", slot: clamp(
        event.slot, 0, BATTLE_SCENE_ENEMY_SLOTS - 1,
      )}];
    }
    if (event?.type === "join-same") {
      return [{type: "join-same", groupIndex: clamp(
        event.groupIndex, 0, BATTLE_SCENE_ENEMY_GROUP_SLOTS - 1,
      )}];
    }
    if (event?.type === "join-new") {
      const monsterId = integer(event.monsterId, fallbackMonsterId);
      return [{
        type: "join-new",
        monsterId: monsterIds.has(monsterId) ? monsterId : fallbackMonsterId,
      }];
    }
    return [];
  });
}

function normalizeManualEnemySlots(value, monsterIds) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  for (let slot = 0; slot < BATTLE_SCENE_ENEMY_SLOTS; slot += 1) {
    if (!Object.prototype.hasOwnProperty.call(source, slot)) continue;
    if (source[slot] === null) {
      result[slot] = null;
      continue;
    }
    const monsterId = integer(source[slot], -1);
    if (monsterIds.has(monsterId)) result[slot] = monsterId;
  }
  return result;
}

function activeEnemySelection(requested, enemies) {
  const selected = clamp(requested, 0, BATTLE_SCENE_ENEMY_SLOTS - 1);
  if (enemies[selected]) return selected;
  const first = enemies.findIndex(Boolean);
  return first < 0 ? 0 : first;
}

function activePartySelection(requested, party) {
  const selected = clamp(requested, 0, BATTLE_SCENE_PARTY_SLOTS - 1);
  if (party[selected]?.visible) return selected;
  const first = party.findIndex(item => item?.visible);
  return first < 0 ? 0 : first;
}

/** 防止热重载后的草稿引用已经不存在的下拉项，并重放排布事件。 */
function normalizeBattleScenePreview(value, project, catalog = battleScenePreviewCatalog(project)) {
  const defaults = battleScenePreviewDefaults(project, catalog);
  const monsterIds = new Set(catalog.monsters.map(item => item.id));
  const normalAppearanceKeys = new Set(
    catalog.normalAppearances.map(item => item.key),
  );
  const source = value && typeof value === "object" ? value : {};
  const party = Array.from({length: BATTLE_SCENE_PARTY_SLOTS}, (_, index) => {
    const item = source.party?.[index] || {};
    const roleId = defaults.party[index].roleId;
    const normalAppearance = normalAppearanceKeys.has(String(item.normalAppearance))
      ? String(item.normalAppearance) : defaults.party[index].normalAppearance;
    const requestedVehiclePresetId = integer(
      item.vehiclePresetId,
      defaults.party[index].vehiclePresetId,
    );
    const vehiclePreset = catalog.vehiclePresetById.get(requestedVehiclePresetId)
      || catalog.vehiclePresetById.get(defaults.party[index].vehiclePresetId)
      || null;
    const vehiclePresetId = vehiclePreset?.id ?? null;
    const riding = vehiclePreset
      ? (item.riding === undefined ? defaults.party[index].riding : Boolean(item.riding))
      : false;
    const requestedAttacks = item.attacks && typeof item.attacks === "object"
      ? item.attacks : {};
    const fallbackAttacks = defaultPartyAttacks(
      catalog,
      catalog.roles[index]?.role,
      vehiclePreset,
    );
    const attacks = Object.fromEntries([...catalog.partyAttackChannelByKey.values()].map(channel => {
      const keys = new Set(channel.sources.map(entry => entry.key));
      const hasRequested = Object.prototype.hasOwnProperty.call(
        requestedAttacks, channel.key,
      );
      const requested = String(requestedAttacks[channel.key] || "");
      return [
        channel.key,
        hasRequested && (keys.has(requested)
            || (channel.key !== "melee" && requested === ""))
          ? requested
          : fallbackAttacks[channel.key] || "",
      ];
    }));
    return {
      roleId,
      companion: item.companion === 'redwolf' ? 'redwolf' : null,
      visible: item.visible === undefined ? defaults.party[index].visible : Boolean(item.visible),
      normalAppearance,
      vehiclePresetId,
      riding,
      attacks,
      x: clamp(item.x ?? defaults.party[index].x, 8, BATTLE_SCENE_WIDTH - 8),
      y: clamp(item.y ?? defaults.party[index].y, 8, BATTLE_SCENE_FIELD_HEIGHT - 8),
    };
  });
  let remaining = BATTLE_SCENE_ENEMY_SLOTS;
  const enemyGroups = Array.from(
    {length: BATTLE_SCENE_ENEMY_GROUP_SLOTS},
    (_, index) => {
      const item = source.enemyGroups?.[index] || {};
      const fallback = defaults.enemyGroups[index];
      const requestedMonster = integer(item.monsterId, fallback.monsterId);
      const monsterId = monsterIds.has(requestedMonster)
        ? requestedMonster : fallback.monsterId;
      const count = Math.min(
        remaining,
        clamp(item.count ?? fallback.count, 0, BATTLE_SCENE_ENEMY_SLOTS),
      );
      remaining -= count;
      return {monsterId, count};
    },
  );
  const fallbackMonsterId = defaults.reinforcement.monsterId;
  const enemyEvents = normalizeEvents(
    source.enemyEvents,
    monsterIds,
    fallbackMonsterId,
  );
  const reinforcementSource = source.reinforcement || {};
  const requestedReinforcementMonster = integer(
    reinforcementSource.monsterId,
    fallbackMonsterId,
  );
  const base = withFormation({
    guides: source.guides === undefined ? defaults.guides : Boolean(source.guides),
    party,
    enemyGroups,
    enemyEvents,
    manualEnemySlots: normalizeManualEnemySlots(
      source.manualEnemySlots,
      monsterIds,
    ),
    reinforcement: {
      mode: reinforcementSource.mode === "new-group" ? "new-group" : "same-group",
      groupIndex: clamp(
        reinforcementSource.groupIndex,
        0,
        BATTLE_SCENE_ENEMY_GROUP_SLOTS - 1,
      ),
      monsterId: monsterIds.has(requestedReinforcementMonster)
        ? requestedReinforcementMonster : fallbackMonsterId,
    },
  }, catalog);
  const attack = source.attack || {};
  const side = attack.side === "enemy" ? "enemy" : "party";
  const partyTarget = activePartySelection(
    attack.partyTarget ?? (side === "enemy" ? attack.target : 0),
    base.party,
  );
  const enemyTarget = activeEnemySelection(
    attack.enemyTarget ?? (side === "party" ? attack.target : 0),
    base.enemies,
  );
  const attacker = side === "enemy"
    ? activeEnemySelection(attack.attacker ?? 0, base.enemies)
    : clamp(attack.attacker ?? 0, 0, BATTLE_SCENE_PARTY_SLOTS - 1);
  const channel = PARTY_ATTACK_CHANNEL_KEYS.has(String(attack.channel))
    ? String(attack.channel) : "melee";
  const enemySourceKeys = new Set(
    [
      ...(catalog.monsterAttacks.get(Number(base.enemies[attacker]?.monsterId)) || [])
        .map(item => item.key),
      ...[...catalog.clipByCode.keys()].map(visualCode => `visual:${visualCode}`),
    ],
  );
  const visualSource = battleSceneAttackVisualSource(catalog, attack.visualReference);
  const selectedSource = visualSource?.key || (side === "party"
    ? base.party[attacker]?.attacks?.[channel] || "auto"
    : enemySourceKeys.has(String(attack.source)) ? String(attack.source) : "auto");
  return {
    ...base,
    attack: {
      side,
      attacker,
      visualReference: visualSource ? attack.visualReference : null,
      target: side === "enemy" ? partyTarget : enemyTarget,
      partyTarget,
      enemyTarget,
      channel,
      source: selectedSource,
      scope: attack.scope === "single" || attack.scope === "group"
          || attack.scope === "all"
        ? attack.scope : "auto",
      // **行动序号要留下来。** 一个攻击方式常常覆盖好几个槽（目录按视觉去重），
      // 而发射点是逐槽取的；不带着它走，播放就会拿这个方式第一个槽的发射点。
      selectionSlot: Number.isInteger(Number(attack.selectionSlot))
        && Number(attack.selectionSlot) >= 0 && Number(attack.selectionSlot) <= 5
        ? Number(attack.selectionSlot)
        : null,
      frame: Math.max(0, integer(attack.frame, 0)),
      playNonce: Math.max(0, integer(attack.playNonce, 0)),
    },
  };
}


function battleScenePartyVehicle(catalog, member) {
  if (member?.vehiclePresetId === null
      || member?.vehiclePresetId === undefined
      || member?.vehiclePresetId === "") return null;
  return catalog?.vehiclePresetById?.get(Number(member?.vehiclePresetId)) || null;
}

/** 乘坐状态决定当前渲染普通形象还是所选 preset 引用的底盘形象。 */
function battleScenePartyAppearanceKey(catalog, member) {
  const vehicle = battleScenePartyVehicle(catalog, member);
  return String(
    member?.riding && vehicle?.appearanceKey
      ? vehicle.appearanceKey
      : member?.normalAppearance || "",
  );
}

function battleSceneSprite(catalog, appearanceKey, actionKey) {
  return battleActorAction(catalog.actorCatalog, appearanceKey, actionKey);
}

function battleSceneEntityAnchor(preview, side, index) {
  const collection = side === "enemy" ? preview.enemies : preview.party;
  return collection?.[Number(index)] || null;
}

// 我方编辑坐标是组合器中的视觉中心；游戏坐标锚点依图形布局
// 另行计算并由调用方传入。敌方 `$12` 目标锚点位于占格横向中心、
// 图形高度的 3/4 处。

function battleSceneEntityEffectAnchor(side, entity) {
  if (!entity) return null;
  if (side === "enemy") {
    const top = Number(entity.pixelY);
    const height = Number(entity.heightPixels);
    return {
      x: Number(entity.x),
      y: Number.isFinite(top) && Number.isFinite(height)
        ? top + height * 3 / 4
        : Number(entity.y),
    };
  }
  return {
    x: Number(entity.x),
    y: Number(entity.y),
  };
}

/** 按 `$13` 的方向分支解析攻击源锚点。 */
function battleSceneAttackLaunchAnchor(
  attack,
  target,
  actorGameAnchorOffset = null,
) {
  const attacker = attack?.attacker;
  if (!attacker) return null;
  if (attack.side === "enemy") {
    const selectionSlot = Math.max(
      0,
      Math.min(5, Number(attack.selectionSlot) || 0),
    );
    const anchor = attacker.attackAnchors?.[selectionSlot] || null;
    if (anchor) {
      return {
        x: Number(attacker.pixelX) + Number(anchor.x),
        y: Number(attacker.pixelY) + Number(anchor.y),
      };
    }
    return battleSceneEntityEffectAnchor("enemy", attacker);
  }
  const profile = attack.launchAnchorProfile;
  if (!profile || !target) {
    return battleSceneEntityEffectAnchor(attack.side, attacker);
  }
  const direction = Number(target.x) < Number(attacker.x) ? -1 : 1;
  const offsetX = Number(actorGameAnchorOffset?.x) || 0;
  const offsetY = Number(actorGameAnchorOffset?.y) || 0;
  // Published launch-y domain / AttackCmd13 $BB49..$BB52:
  // CLC; ADC vertical offset; SBC upward byte (no SEC in between).
  // Keep the addition carry for SBC, then store the resulting coordinate byte.
  // Offscreen bytes remain offscreen; the object renderer owns clipping.
  const sumY = Number(attacker.y) + offsetY;
  const borrow = sumY < 256 ? 1 : 0;
  return {
    x: (Number(attacker.x)
      + offsetX
      + direction * (Number(profile.forward_offset_pixels) || 0)) & 255,
    y: ((sumY & 255)
      - (Number(profile.upward_offset_pixels) || 0) - borrow) & 255,
  };
}

/** `$12` 按方向分支使用目标侧的运行时坐标规则。 */
function battleSceneAttackImpactAnchor(
  attack,
  target,
  targetGameAnchorOffset = null,
) {
  if (attack?.targetSide === "party" && target) {
    return {
      x: Number(target.x)
        + (Number(targetGameAnchorOffset?.x) || 0)
        + ENEMY_IMPACT_X_FROM_PARTY_GAME_ANCHOR,
      y: Number(target.y) + (Number(targetGameAnchorOffset?.y) || 0),
    };
  }
  return battleSceneEntityEffectAnchor(attack?.targetSide, target);
}

function battleSceneActiveEnemySlots(preview) {
  return preview.enemies.flatMap((item, index) => item ? [index] : []);
}

/** 敌方返回可执行动作；友方返回装备目录，炮弹另见 shellAttackChannel。 */
function battleSceneEntityAttackSources(catalog, preview, side, index) {
  {
    const monsterId = preview.enemies?.[Number(index)]?.monsterId;
    return catalog.monsterAttacks.get(Number(monsterId)) || [];
  }
}

const ATTACK_SCOPE_LABELS = Object.freeze({
  single: "单体",
  group: "一组",
  all: "全体",
});

function scopedTargetEntries(preview, side, requestedIndex, scope) {
  const collection = side === "enemy" ? preview.enemies : preview.party;
  const requested = collection?.[Number(requestedIndex)] || null;
  const active = (collection || []).flatMap((entity, index) =>
    entity?.visible ? [{index, entity}] : []
  );
  let result;
  if (scope === "all") {
    result = active;
  } else if (scope === "group") {
    result = requested && Number.isInteger(Number(requested.groupIndex))
      ? active.filter(entry => entry.entity.groupIndex === requested.groupIndex)
      : active;
  } else {
    result = requested?.visible
      ? [{index: Number(requestedIndex), entity: requested}]
      : [];
  }
  // BuildWeaponAttackTargetList 与 FindNextActiveBattleActorByVisualGroup
  // 都按运行槽从小到大生成列表；组/全体不是“先播光标所在目标”。
  return result.sort((left, right) => left.index - right.index);
}

/** 炮弹引用当前主炮作为载体；普通弹与特殊弹遵循各自发布的执行语义。 */
function resolveShellAttackSource(shell, attacker, catalog) {
  if (!catalog.shellAttackChannel.sources.includes(shell)) {
    return {source: null, reason: "请选择炮弹"};
  }
  const record = shell.source;
  if (record.execution?.carrier !== "selected vehicle main gun"
      || typeof record.special !== "boolean") {
    return {source: shell, reason: "炮弹执行语义尚未支持"};
  }
  if (!attacker?.riding || !battleScenePartyVehicle(catalog, attacker)) {
    return {source: shell, reason: "炮弹需要乘坐战车"};
  }
  const carrier = catalog.partyAttackChannelByKey.get("main").sources.find(
    item => item.key === attacker.attacks?.main,
  );
  if (!carrier) return {source: shell, reason: "炮弹需要装备主炮"};
  // shell-record 明示普通弹跳过特殊弹表；特殊弹缺视觉时不能拿主炮补上。
  const visualCode = record.special ? shell.visualCode
    : carrier.source.item?.attack_visual?.visual_code == null ? null : carrier.visualCode;
  return {
    source: {
      ...shell,
      label: `${shell.label} · ${record.special ? "特殊弹" : "随主炮"} · ${carrier.actionLabel}`,
      visualCode,
      visualAvailable: Number.isInteger(visualCode) && catalog.clipByCode.has(visualCode),
      targetScope: semanticAttackScope(record) || carrier.targetScope,
      launchAnchorProfile: carrier.launchAnchorProfile,
    },
    reason: "",
  };
}

function battleSceneAttackVisualSource(catalog, reference) {
  return reference ? catalog.attackSources.find(source => source.key === `visual:${source.visualCode}`
    && recordUid('attack-visual', source.visualCode) === reference) : null;
}

/** 解析攻击视觉与单体/敌群/全体目标集合，返回 VM 的统一攻击描述。 */
function resolveBattleSceneAttack(preview, project, catalog = battleScenePreviewCatalog(project)) {
  const side = preview.attack.side === "enemy" ? "enemy" : "party";
  const attacker = battleSceneEntityAnchor(preview, side, preview.attack.attacker);
  const targetSide = side === "enemy" ? "party" : "enemy";
  let source;
  let sourceReason = "";
  const visualSource = battleSceneAttackVisualSource(catalog, preview.attack.visualReference);
  if (visualSource) source = visualSource;
  else if (side === "party") {
    const channel = PARTY_ATTACK_CHANNEL_KEYS.has(String(preview.attack.channel))
      ? String(preview.attack.channel) : "melee";
    source = catalog.attackSourceByKey.get(
      String(attacker?.attacks?.[channel] || preview.attack.source),
    ) || null;
    if (channel === "shell") {
      const resolved = resolveShellAttackSource(source, attacker, catalog);
      source = resolved.source;
      sourceReason = resolved.reason;
    } else if (channel === "item") {
      if (!catalog.itemAttackChannel.sources.includes(source)) {
        source = null;
        sourceReason = "未配置道具";
      } else sourceReason = source.reason;
    }
  } else {
    source = catalog.attackSources.find(
      item => item.key === preview.attack.source,
    ) || null;
    if (!source || source.key === "auto") {
      source = catalog.monsterAttacks.get(Number(attacker?.monsterId))?.[0] || null;
    }
  }
  const requestedScope = String(preview.attack.scope || "auto");
  const scope = requestedScope === "auto"
    ? source?.targetScope || semanticAttackScope(source?.source) || "single"
    : ATTACK_SCOPES.has(requestedScope) ? requestedScope : "single";
  const targetEntries = scopedTargetEntries(
    preview,
    targetSide,
    preview.attack.target,
    scope,
  );
  const target = targetEntries[0]?.entity || null;
  const visualCode = source?.visualCode == null
    ? null : Number(source.visualCode);
  const clip = Number.isInteger(visualCode)
    ? catalog.clipByCode.get(visualCode) || null : null;
  let reason = "";
  if (!attacker?.visible) reason = "攻击方当前不在场";
  else if (sourceReason) reason = sourceReason;
  else if (!targetEntries.length) reason = "目标当前不在场";
  else if (!Number.isInteger(visualCode) || !clip) reason = "没有可解码的攻击视觉";
  return {
    side,
    channel: side === "party" ? String(preview.attack.channel || "melee") : null,
    targetSide,
    attackerIndex: Number(preview.attack.attacker),
    attacker,
    attackerGroupCount: side === "enemy"
      ? preview.formation?.groups?.[attacker?.groupIndex]?.count : null,
    target,
    targets: targetEntries.map(entry => entry.entity),
    targetIndices: targetEntries.map(entry => entry.index),
    scope,
    scopeLabel: ATTACK_SCOPE_LABELS[scope],
    source,
    selectionSlot: Number.isInteger(preview.attack.selectionSlot)
      ? Number(preview.attack.selectionSlot)
      : Number(source?.selectionSlot) || 0,
    launchAnchorProfile: (side === "party" && catalog.partyAttackChannelByKey.get(preview.attack.channel)?.loadoutSlotId
      ? catalog.partyAttackChannelByKey.get(preview.attack.channel).launchAnchorProfile
      : source?.launchAnchorProfile) || null,
    visualCode,
    clip,
    available: !reason,
    reason,
  };
}

// @editor-module 战斗表现子模式的背景闪烁与扫描线揭示。


async function battlePresentationParameters(readField) {
  const fields = await renderCodeFields(['blink-frames', 'reveal-frames', 'reveal-first-latch',
    'reveal-latch-step', 'reveal-bottom'], readField);
  return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value]));
}

function battlePresentationFrame(submode, frame, parameters) {
  if (![1, 4].includes(submode)) return {count: 0, visible: true};
  const names = submode === 1 ? ['blink-frames']
    : ['reveal-frames', 'reveal-first-latch', 'reveal-latch-step', 'reveal-bottom'];
  if (names.some(name => !Number.isInteger(parameters?.[name])))
    throw new TypeError('缺少战斗表现子模式参数');
  const count = parameters[submode === 1 ? 'blink-frames' : 'reveal-frames'];
  const index = Math.max(0, Math.min(count, Math.floor(frame)));
  if (submode === 1) return {count, visible: index < count && index % 2 === 1};
  // MMC3 扫描线锁存值以零起算，切换后的首行是锁存值加一。
  if (submode === 4) return {count, visible: true, clip: {
    top: parameters['reveal-first-latch'] + 1 - parameters['reveal-latch-step'] * index,
    bottom: parameters['reveal-bottom'],
  }};
  return {count: 0, visible: true};
}

// @editor-module 战斗场景的共享合成预览
//
// 这层只做组合：角色仍由 metasprite-record 现解，敌人仍由 monster-visual-layout
// 现解，攻击效果仍由 weapon-effect-vm 执行。敌方坐标来自共享的 ROM 排布算法，
// 这里不保存也不解释另一套位置规则。


/** 消息跟随本次来源；视觉编号不能代替当前行动或道具的文本引用。 */
async function battleSceneMessageSource({attack = null, action = null, recordId = undefined,
  runtime = null} = {}) {
  if (Number.isInteger(runtime?.monsterId)) {
    const monster = (await db.getAll("monster", [])).find(item => item.id === runtime.monsterId);
    const reference = monster?.name_reference;
    runtime = {...runtime, monsterNameRef: reference?.mapping_status === "confirmed"
      ? {resource_id: "text-record", node_id: reference.node_id} : null};
  }
  const source = attack?.source?.source;
  if (!action && source?.action_resource) {
    const actions = await db.getDocument("enemy-action", null);
    action = actions?.records?.find(record => record.handle === source.action_resource);
  }
  if (action) return {
    action, item: null, attack: attack?.side === "enemy" ? attack : null,
    resultRecords: (await db.getResourceDocument("battle-result-script", null))?.records || [],
    monster: attack?.side === "enemy"
      ? (await db.getAll("monster", [])).find(record => record.id === attack.attacker?.monsterId) : null,
    recordIds: recordId === undefined ? [action.fields?.message?.value].filter(Boolean)
      : [recordId].filter(Boolean),
    empty: recordId === null,
    runtime,
  };
  const item = attack?.channel === "item" ? source?.item : null;
  return {attack, item, action: null, empty: recordId === null, runtime,
    recordIds: recordId === undefined ? (item?.battle_use_effect?.text_outputs || [])
      .map(output => output.text_record?.node_id).filter(Boolean) : [recordId].filter(Boolean)};
}

/** 行动目录与播放入口消费同一消息来源，不给每类来源另建窗口。 */


/** Explicit preview choices do not predict or modify the game's random result. */
function bindBattleMessageOutcomes(canvas, prepared) {
  const root = canvas.closest("[data-battle-scene-preview-host]");
  const anchor = root?.querySelector("[data-battle-scene-simulation-status]");
  if (!anchor) return;
  let label = root.querySelector("[data-battle-outcomes]");
  const outcomes = prepared.messageWindow?.outcomes || [];
  if (!outcomes.length) {
    label?.remove();
    root.querySelector("[data-battle-result-editors]")?.remove();
    return;
  }
  if (!label) {
    label = document.createElement("label");
    label.dataset.battleOutcomes = "";
    label.append("结果预览 ");
    const select = document.createElement("select");
    select.dataset.battleOutcome = "";
    label.append(select);
    anchor.after(label);
    select.addEventListener("change", async () => {
      const current = preparedCompositions.get(canvas);
      if (!current) return;
      const token = (paintTokens.get(canvas) || 0) + 1;
      paintTokens.set(canvas, token);
      stopPlayback(canvas);
      const messageSource = {...current.messageSource, outcomeId: select.value};
      const repository = state.projectRepository;
      try {
        const messageWindow = await prepareMessageWindow("", null, state.project,
          messageSource, current.messageSaveSlot);
        if (paintTokens.get(canvas) !== token || !canvas.isConnected
            || state.projectRepository !== repository) return;
        drawPrepared(canvas, {...current, messageSource, messageWindow});
        updateStatus(canvas, "");
      } catch (error) {
        editorLog.error("预览", `操作失败：${error?.message || error}`, error);
        if (paintTokens.get(canvas) === token) updateStatus(canvas, error.message, true);
      }
    });
  }
  const select = label.querySelector("select");
  const options = [{id: "", label: "请选择"}, ...outcomes];
  const signature = JSON.stringify(options);
  if (select.dataset.options !== signature) {
    select.replaceChildren(...options.map(({id, label}) => new Option(label, id)));
    select.dataset.options = signature;
  }
  select.value = prepared.messageWindow.outcomeId || "";
  // 结果文字引用与画布使用同一文本槽。
  const primary = new Set(prepared.messageSource.recordIds || []);
  const records = [...new Set((prepared.messageWindow.textSlots || [])
    .map(slot => slot.textRecordRef?.node_id).filter(id => id && !primary.has(id)))];
  const previousEditors = root.querySelector("[data-battle-result-editors]");
  const recordSignature = JSON.stringify(records);
  if (previousEditors?.dataset.records !== recordSignature) {
    const editors = document.createElement("div");
    editors.dataset.battleResultEditors = "";
    editors.dataset.records = recordSignature;
    editors.innerHTML = records.map(recordId =>
      `<p>结果战斗文本 ${currentTextReferenceLink(recordId)}</p>`).join("");
    editors.querySelectorAll("[data-resource-target]").forEach(link => {
      link.addEventListener("click", event => {
        event.stopImmediatePropagation();
        void import('./preview-sound-DHDXA99x.js').then(function (n) { return n.resourceNav; }).then(({navigateToResourceTarget}) =>
          navigateToResourceTarget(link.dataset.resourceTarget));
      });
    });
    previousEditors?.remove();
    label.after(editors);
  }
}
const PARTY_SPRITE_BOX = 96;
const ENEMY_GROUP_COLORS = Object.freeze([
  "#ff8f72", "#ffbf69", "#d58cff", "#75df9b",
]);
const runtimeImageCache = new Map();
const playbackTimers = new WeakMap();
const paintTokens = new WeakMap();
const preparedCompositions = new WeakMap();
const preparedFrameIndices = new WeakMap();
const messageSurfaces = new WeakMap();

function messageSurface(layer) {
  let bySize = messageSurfaces.get(layer.raster);
  if (!bySize) messageSurfaces.set(layer.raster, bySize = new Map());
  const key = `${layer.rectangle.width}:${layer.rectangle.height}`;
  if (!bySize.has(key)) bySize.set(key, uiSceneWindowSurface(layer.raster, layer.rectangle));
  return {surface: bySize.get(key), rectangle: layer.rectangle};
}

async function refreshMessageText(canvas) {
  const prepared = preparedCompositions.get(canvas);
  const window = prepared?.messageWindow;
  if (!window?.textSlots?.length) return;
  stopPlayback(canvas);
  paintTokens.set(canvas, (paintTokens.get(canvas) || 0) + 1);
  const outputs = await Promise.all(window.textSlots.map(slot => prepareUiTextSlot({
    ...slot, recordDocument: state.project?.text_record_edits,
  })));
  if (preparedCompositions.get(canvas) !== prepared || !canvas.isConnected) return;
  window.textOutputs = outputs;
  drawPrepared(canvas, prepared, preparedFrameIndices.get(canvas));
}

function currentPreview(project = state.project, sourcePreview = null, catalog) {
  const preview = normalizeBattleScenePreview(
    sourcePreview ?? state.battleScenePreview,
    project,
    catalog,
  );
  if (sourcePreview === null) state.battleScenePreview = preview;
  return preview;
}

function runtimeImage(url) {
  if (!url) return Promise.resolve(null);
  if (!runtimeImageCache.has(url)) {
    runtimeImageCache.set(url, new Promise(resolve => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image), {once: true});
      image.addEventListener("error", () => resolve(null), {once: true});
      image.src = url;
    }));
  }
  return runtimeImageCache.get(url);
}

function alphaBlit(target, source, centerX, centerY, clip = null) {
  if (!source?.data?.length) return;
  const left = Math.round(centerX - source.width / 2);
  const top = Math.round(centerY - source.height / 2);
  const startX = Math.max(0, -left);
  const endX = Math.min(source.width, target.width - left);
  const startY = Math.max(0, (clip?.top ?? 0) - top);
  const endY = Math.min(source.height, (clip?.bottom ?? target.height) - top);
  for (let sourceY = startY; sourceY < endY; sourceY += 1) {
    for (let sourceX = startX; sourceX < endX; sourceX += 1) {
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceIndex + 3];
      if (!alpha) continue;
      const targetIndex = (
        (top + sourceY) * target.width + left + sourceX
      ) * 4;
      if (alpha === 255 || target.data[targetIndex + 3] === 0) {
        target.data[targetIndex] = source.data[sourceIndex];
        target.data[targetIndex + 1] = source.data[sourceIndex + 1];
        target.data[targetIndex + 2] = source.data[sourceIndex + 2];
        target.data[targetIndex + 3] = alpha;
        continue;
      }
      const ratio = alpha / 255;
      const inverse = 1 - ratio;
      target.data[targetIndex] = Math.round(
        source.data[sourceIndex] * ratio + target.data[targetIndex] * inverse,
      );
      target.data[targetIndex + 1] = Math.round(
        source.data[sourceIndex + 1] * ratio
          + target.data[targetIndex + 1] * inverse,
      );
      target.data[targetIndex + 2] = Math.round(
        source.data[sourceIndex + 2] * ratio
          + target.data[targetIndex + 2] * inverse,
      );
      target.data[targetIndex + 3] = 255;
    }
  }
}

async function prepareMessageWindow(runtimeUrl, stateId, project, messageSource, messageSaveSlot = null,
  messageSequence = null, catalog = null, sources = null) {
  const {attack} = messageSource;
  const scene = runtimeUrl ? project?.ui?.scenes?.find(item =>
    fileUrl(`game/ui/${item.preview}`) === runtimeUrl) : null;
  if (!stateId && runtimeUrl) {
    stateId = [scene, ...(scene?.interface_links || [])].find(
      item => item?.interface_id === "battle-messages",
    )?.interface_state_id;
    // 命令／目标等非消息场景仍由原来的场景预览负责。
    if (!stateId) return null;
  }
  // 显式场景状态消费自己的 fill；按来源演出时才按当前记录查状态，不能强塞到指定布局。
  const recordIds = stateId ? [] : messageSource.recordIds;
  const templates = await db.getDocument("project.ui.templates", null);
  if (messageSource.empty) {
    const frame = battleMessageWindow(templates, "battle-messages.action");
    return {...frame, empty: true, textSlots: [], textOutputs: [], layers: frame.layers.map(messageSurface)};
  }
  let window = null;
  if (messageSequence?.length) {
    try {window = battleMessageSequenceWindow(templates, messageSequence);}
    catch (error) {
      const reason = `本次行动消息序列未确认：${error.message}`;
      window = {stateId: '', layers: [], reason, textSlots: recordIds.map(recordId => ({
        textRecordRef: {resource_id: 'text-record', node_id: recordId}, unavailableReason: reason,
      }))};
    }
  }
  window ||= !stateId && messageSource.item
    ? battleItemMessageWindow(templates, messageSource.item, messageSource.outcomeId) : null;
  if (!stateId && !window && messageSource.action) {
    window = battleEnemyMessageWindow(templates, messageSource.action, messageSource);
  }
  if (!stateId && !window) {
    const states = recordIds.map(recordId => uiTemplateBindings(templates).filter(binding =>
      binding.interface === "battle-messages"
      && !templates.templates.find(template => template.id === binding.template)?.requires_message_sequence && [
        ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id),
        ...(binding.deferred_records || []),
      ].includes(recordId),
    ));
    if (states.length && states.every(bindings => bindings.length === 1
        && bindings[0].state === states[0][0]?.state)) {
      stateId = states[0][0].state;
    } else if (!recordIds.length && attack?.side === "party" && attack.channel !== "item") {
      // 没有专属消息时继续消费已发布的行动窗 fill，缺值由共用文字入口说明。
      stateId = "battle-messages.action";
    } else {
      // 缺布局也保留本次消息交给文字入口；没有像素声明就不制造可绘制的槽位。
      window = {stateId: "", layers: [], reason: "", textSlots: recordIds.length
        ? recordIds.map((recordId, index) => ({
          textRecordRef: {resource_id: "text-record", node_id: recordId},
          unavailableReason: states[index].length !== 1
            ? `当前消息 ${recordId} 尚无唯一的已发布状态布局绑定（UI 消息提取）`
            : `当前消息 ${recordId} 已绑定 ${states[index][0].state}，本次消息尚无共同的已发布状态布局（UI 消息提取）`,
        }))
        : [{unavailableReason: "当前来源未发布战斗消息引用（enemy-action／battle-item-service）"}]};
    }
  }
  window ??= battleMessageWindow(templates, stateId, {recordIds,
    sceneId: scene?.interface_state_id === stateId ? scene.id : ""});
  if (attack?.channel === "shell" && !messageSequence?.length && !messageSource.recordIds.length) {
    // ExecuteSpecialShellAttack 保留出手提示，再在行动窗第二行显示发射记录。
    const calls = await battleMessageCalls();
    const primary = battleMessageWindow(templates, "battle-messages.action");
    const firing = battleMessageWindow(templates, "battle-messages.action", {recordIds: [calls['shell-firing']]});
    window = {...primary, textSlots: [...primary.textSlots, ...firing.textSlots.map(slot => ({
      ...slot, includesShellName: true,
      geometry: {...slot.geometry, first_line: slot.geometry.second_line},
    }))]};
  }
  // 怪物宿主始终展示已发布的行动窗框；缺记录落点仍交共用入口报缺，
  // 不把 action 的正文槽位或 fill 借给尚未绑定的记录。
  if (messageSource.action && !window.layers.length) {
    const frame = battleMessageWindow(templates, "battle-messages.action");
    window = {...window, layers: frame.layers, templateId: frame.templateId};
  }
  // A rendered primary prompt does not establish the item's later result.
  // Keep its proven text visible while reporting the missing result sequence.
  if (messageSource.item && !window.sequenceId) {
    window.reason = [window.reason,
      "本次道具的后续效果消息尚未完整发布，已显示的使用提示不代表效果文本完整",
    ].filter(Boolean).join("；");
  }
  let textSlots = window.textSlots || [];
  if (!textSlots.length) {
    textSlots = [{unavailableReason: window.reason
      || `当前状态 ${stateId} 尚无正文槽位绑定（UI 消息提取）`}];
  }
  textSlots = textSlots.map(slot => battleMessageTextSlot(slot, {
    attack, action: messageSource.action, monster: messageSource.monster,
    saveSlot: messageSaveSlot, project, runtime: messageSource.runtime, actor: messageSource.actor, catalog,
    saveFields: sources?.saveFields,
  }));
  if (sources && textSlots.some(slot => !slot.unavailableReason))
    sources.textRecords ||= effectiveTextRecordSources(null, project?.text_record_edits);
  const textOutputs = await Promise.all(textSlots.map(slot => prepareUiTextSlot({
    ...slot, recordDocument: project?.text_record_edits,
    recordSources: sources?.textRecords,
    waitMarker: messageSource.runtime?.waitForInput ? "battle-command" : "battle-message",
  })));
  return {...window, textSlots, textOutputs, layers: window.layers.map(messageSurface)};
}

async function prepareComposition(preview, runtimeUrl, project, messageWindowState, messageSaveSlot, messageSource,
  statusWindow = null, messageSequence = null, enemyPaletteMonsterId = null, previousEnemyScene = null,
  catalog = null, sources = null, actorSources = null) {
  actorSources ||= await battleActorSources();
  catalog ||= battleScenePreviewCatalog(project);
  const partySprites = preview.party.map(member => battleSceneSprite(
    catalog,
    battleScenePartyAppearanceKey(catalog, member),
  ));
  const partyActions = [...new Map(preview.party.flatMap(member => {
    const appearance = catalog.appearanceByKey.get(
      battleScenePartyAppearanceKey(catalog, member),
    );
    return (appearance?.stateActions || appearance?.actions || [])
      .map(item => [item.key, item]);
  })).values()];
  const enemyIds = [...new Set(
    [...preview.enemies, ...(previousEnemyScene?.enemies || [])]
      .filter(item => item?.visible).map(item => item.monsterId),
  )];
  const selectedAttack = resolveBattleSceneAttack(preview, project, catalog);
  const textOnlyAction = selectedAttack.side === "enemy"
    && messageSource.action?.fields?.visual_and_counter_initializer?.value === null;
  const attack = textOnlyAction
    ? {...selectedAttack, available: false, visualCode: null, reason: "当前行动没有攻击视觉"}
    : selectedAttack;
  const messageWindow = await prepareMessageWindow(runtimeUrl, messageWindowState, project,
    messageSource, messageSaveSlot, messageSequence, catalog, sources);
  const statusSlot = statusWindow ? await prepareUiBattleStatusSlot(statusWindow, project) : null;
  const enemySource = enemyId => {
    if (!sources) return monsterFigureSources({enemyId});
    sources.enemySources ||= new Map();
    if (!sources.enemySources.has(enemyId)) sources.enemySources.set(enemyId, monsterFigureSources({enemyId}));
    return sources.enemySources.get(enemyId);
  };
  const [paletteSource, background, ...enemySources] = await Promise.all([
    enemyPaletteMonsterId == null ? null : enemySource(enemyPaletteMonsterId),
    messageWindow ? null : runtimeImage(runtimeUrl),
    ...enemyIds.map(enemySource),
  ]);
  const actorRasters = sources?.actorRasters || new Map();
  const partyRasters = new Map(partyActions.map(action => {
    if (!actorRasters.has(action.key)) actorRasters.set(action.key,
      action.actorKind === 'vehicle' ? vehiclePortraitImage({sources: actorSources, action},
        {size: PARTY_SPRITE_BOX, scale: 1, background: null})
        : battleActorImage(actorSources, action, {size: PARTY_SPRITE_BOX, scale: 1, background: null}));
    return [action.key, actorRasters.get(action.key)];
  }));
  const partyGameAnchorOffsets = partySprites.map(action =>
    battleActorGameAnchorOffset(actorSources, action)
  );
  const partyActionGameAnchorOffsets = new Map(partyActions.map(action => [
    action.key, battleActorGameAnchorOffset(actorSources, action),
  ]));
  // SelectWeaponCoreEffect 使用当前装备效果码选择持握图形。
  const weaponEffect = attack.channel === "melee" && !attack.attacker?.riding
    ? Number(attack.source?.source?.item?.equipment?.battle_effect_code) : 0;
  const weaponAction = weaponEffect > 0 && weaponEffect < 8
    ? {kind: "metasprite", id: 0x0d + weaponEffect} : null;
  const weaponRaster = weaponAction
    ? battleActorImage(actorSources, weaponAction, {size: PARTY_SPRITE_BOX, scale: 1, background: null}) : null;
  const weaponGameAnchorOffset = battleActorGameAnchorOffset(actorSources, weaponAction);
  const enemyRasters = new Map(enemyIds.map((enemyId, index) => [
    enemyId,
    monsterFigureImage(paletteSource ? {...enemySources[index], palettes: paletteSource.palettes}
      : enemySources[index], 1, {background: null}),
  ]));
  const effectAssets = project?.visuals
    ?.weapon_effect_catalog?.asset_catalog_data || null;
  const launchAnchor = battleSceneAttackLaunchAnchor(attack, attack.target,
    attack.side === "party" ? partyGameAnchorOffsets[attack.attackerIndex] : null);
  const impactAnchor = battleSceneAttackImpactAnchor(attack, attack.target,
    attack.targetSide === "party" ? partyGameAnchorOffsets[attack.targetIndices[0]] : null);
  const animationOptions = launchAnchor && impactAnchor ? {
    actorAnchor: ACTOR_ANCHOR,
    targetAnchor: [ACTOR_ANCHOR[0] + Math.abs(impactAnchor.x - launchAnchor.x),
      ACTOR_ANCHOR[1] + impactAnchor.y - launchAnchor.y],
    gamePath: true,
  } : {};
  const animation = attack.available && effectAssets
    ? await cleanAnimationFrames(effectAssets, attack.visualCode, animationOptions)
    : null;
  // 先核实本次状态轨需要的资源；缺图不能等播放到半途才失败。
  const animatedPartyIndices = attack.side === "enemy"
    ? attack.targetIndices : [attack.attackerIndex];
  for (const index of animatedPartyIndices) {
    const appearanceKey = battleScenePartyAppearanceKey(catalog, preview.party[index]);
    for (const frame of animation?.frames || []) {
      battleActorActionFromStateDelta(catalog.actorCatalog, appearanceKey, undefined,
        frame.actorStateDelta);
    }
  }
  return {
    preview,
    previousEnemyScene,
    catalog,
    background,
    messageSource,
    messageSaveSlot,
    messageWindow,
    statusSlot,
    statusWindow,
    partySprites,
    partyRasters,
    partyGameAnchorOffsets,
    partyActionGameAnchorOffsets,
    weaponRaster,
    weaponGameAnchorOffset,
    enemyRasters,
    attack,
    animation,
  };
}

function playbackFrame(prepared, frameIndex = null) {
  const frames = prepared.animation?.frames || [];
  const targets = prepared.attack.targets || [];
  const clipFrameCount = frames.length;
  const requestedImpactStart = Number(prepared.animation?.impactFrameStart);
  const impactFrameStart = Number.isFinite(requestedImpactStart)
    ? Math.max(0, Math.min(Math.trunc(requestedImpactStart), clipFrameCount))
    : clipFrameCount;
  const impactFrameCount = Math.max(0, clipFrameCount - impactFrameStart);
  const totalFrameCount = targets.length
    ? clipFrameCount + impactFrameCount * Math.max(0, targets.length - 1)
    : 0;
  if (frameIndex === null || !clipFrameCount || !targets.length) {
    return {
      frame: null,
      frameIndex: null,
      localFrameIndex: null,
      phaseFrameIndex: null,
      phase: null,
      targetOrdinal: null,
      targetIndex: null,
      target: targets[0] || null,
      clipFrameCount,
      impactFrameStart,
      impactFrameCount,
      totalFrameCount,
    };
  }
  const resolvedFrameIndex = Math.max(
    0,
    Math.min(Number(frameIndex) || 0, totalFrameCount - 1),
  );
  const repeatedImpact = resolvedFrameIndex >= clipFrameCount && impactFrameCount > 0;
  const repeatedFrameIndex = Math.max(0, resolvedFrameIndex - clipFrameCount);
  const targetOrdinal = repeatedImpact
    ? 1 + Math.floor(repeatedFrameIndex / impactFrameCount) : 0;
  const phaseFrameIndex = repeatedImpact
    ? repeatedFrameIndex % impactFrameCount : resolvedFrameIndex;
  const localFrameIndex = repeatedImpact
    ? impactFrameStart + phaseFrameIndex : resolvedFrameIndex;
  return {
    frame: frames[localFrameIndex],
    frameIndex: resolvedFrameIndex,
    localFrameIndex,
    phaseFrameIndex,
    phase: repeatedImpact ? "impact-repeat" : "attack",
    targetOrdinal,
    targetIndex: prepared.attack.targetIndices[targetOrdinal],
    target: targets[targetOrdinal],
    clipFrameCount,
    impactFrameStart,
    impactFrameCount,
    totalFrameCount,
  };
}

function actorXDelta(frame, side) {
  if (!frame) return 0;
  return Number(side === "enemy"
    ? frame.actorXDeltaAlternate : frame.actorXDeltaNormal) || 0;
}

function mapEffectObject(item, sourceAnchor, impactAnchor, animation) {
  const [cleanActorX, cleanActorY] = animation.actorAnchor;
  const [cleanTargetX, cleanTargetY] = animation.targetAnchor;
  const reverse = Number(impactAnchor.x) < Number(sourceAnchor.x);
  if (item.spawnAnchor === "target") {
    return {
      x: Math.round(Number(impactAnchor.x) + (Number(item.x) - cleanTargetX) * (reverse ? -1 : 1)),
      y: Math.round(Number(impactAnchor.y) + Number(item.y) - cleanTargetY),
      flipX: Boolean(item.flipX) !== reverse,
    };
  }
  const progress = (Number(item.x) - cleanActorX)
    / (cleanTargetX - cleanActorX || 1);
  const cleanPathY = cleanActorY
    + (cleanTargetY - cleanActorY) * progress;
  const x = Number(sourceAnchor.x)
    + (Number(impactAnchor.x) - Number(sourceAnchor.x)) * progress;
  const y = Number(sourceAnchor.y)
    + (Number(impactAnchor.y) - Number(sourceAnchor.y)) * progress
    + (Number(item.y) - cleanPathY);
  return {
    x: Math.round(x),
    y: Math.round(y),
    flipX: Boolean(item.flipX) !== reverse,
  };
}

function compositionRaster(prepared, frameIndex = null) {
  const raster = createRaster(
    BATTLE_SCENE_WIDTH,
    BATTLE_SCENE_HEIGHT,
    null,
  );
  const playback = playbackFrame(prepared, frameIndex);
  const repeatedImpact = playback.phase === "impact-repeat";
  // `$0331/$14/$15` 的 X/Y 不是抽象的“攻击者轨”。`$D1` 在我方攻击时
  // 指向我方攻击者，在敌方攻击时则指向当前我方受击者。
  const activePartyActorIndex = playback.frame
    ? prepared.attack.side === "enemy"
      ? Number(playback.targetIndex)
      : repeatedImpact ? null : Number(prepared.attack.attackerIndex)
    : null;
  const currentActorXDelta = activePartyActorIndex === null
    ? 0 : actorXDelta(playback.frame, prepared.attack.side);
  if (prepared.presentation?.clip && prepared.previousEnemyScene) {
    prepared.previousEnemyScene.enemies.forEach(enemy => {
      if (enemy?.visible) alphaBlit(raster, prepared.enemyRasters.get(Number(enemy.monsterId)),
        enemy.x, enemy.y, {top: 0, bottom: prepared.presentation.clip.top});
    });
  }
  prepared.preview.enemies.forEach((enemy, index) => {
    if (!enemy?.visible || prepared.presentation?.visible === false) return;
    alphaBlit(
      raster,
      prepared.enemyRasters.get(Number(enemy.monsterId)),
      enemy.x,
      enemy.y,
      prepared.presentation?.clip,
    );
  });
  const partyFrameKeys = [];
  prepared.preview.party.forEach((member, index) => {
    const isActiveActor = activePartyActorIndex === index;
    const action = isActiveActor
      ? battleActorActionFromStateDelta(
        prepared.catalog.actorCatalog,
        battleScenePartyAppearanceKey(prepared.catalog, member),
        undefined,
        playback.frame.actorStateDelta,
      )
      : prepared.partySprites[index];
    partyFrameKeys.push(action?.key || "");
    if (!member.visible) return;
    const baseAnchor = prepared.partyGameAnchorOffsets[index];
    const actionAnchor = prepared.partyActionGameAnchorOffsets.get(action?.key) || baseAnchor;
    alphaBlit(
      raster,
      prepared.partyRasters.get(action?.key),
      Number(member.x) + baseAnchor.x - actionAnchor.x + (isActiveActor ? currentActorXDelta : 0),
      Number(member.y) + baseAnchor.y - actionAnchor.y,
    );
  });
  if (playback.frame && prepared.weaponRaster) {
    const index = prepared.attack.attackerIndex;
    const member = prepared.preview.party[index];
    const anchor = prepared.partyGameAnchorOffsets[index];
    alphaBlit(raster, prepared.weaponRaster,
      Number(member.x) + anchor.x - prepared.weaponGameAnchorOffset.x,
      Number(member.y) + anchor.y - prepared.weaponGameAnchorOffset.y);
  }
  let paintedEffectObjects = 0;
  let launchAnchor = null;
  let impactAnchor = null;
  if (playback.frame && playback.target) {
    const frame = playback.frame;
    // `$13` 使用方向各自的固定源锚点，并不跟随 `$14/$15` 的角色位移量；
    // 位移只作用于 `$D1` 指向的我方图形。目标端复用 `$12` 的侧别锚点。
    launchAnchor = battleSceneAttackLaunchAnchor(
      prepared.attack,
      playback.target,
      prepared.attack.side === "party"
        ? prepared.partyGameAnchorOffsets[prepared.attack.attackerIndex]
        : null,
    );
    impactAnchor = battleSceneAttackImpactAnchor(
      prepared.attack,
      playback.target,
      prepared.attack.targetSide === "party"
        ? prepared.partyGameAnchorOffsets[playback.targetIndex]
        : null,
    );
    const tiles = prepared.animation.tilesByBank.get(frame.effectBank);
    if (tiles) {
      const frameObjects = frame.objects || [];
      // `$02` 一类脚本不在发射段与命中段之间清对象；后续目标只保留其中
      // 从 `$12` 目标锚点生成的对象，不能把仍在状态槽里的炮口/弹道对象再画一遍。
      const effectObjects = repeatedImpact
          && prepared.animation.impactUsesTargetObjects
        ? frameObjects.filter(item => item.spawnAnchor === "target")
        : frameObjects;
      for (const item of effectObjects) {
        const action = prepared.animation.actionById.get(Number(item.action));
        if (!action?.available) continue;
        const mapped = mapEffectObject(
          item,
          launchAnchor,
          impactAnchor,
          prepared.animation,
        );
        paintBattleAction(
          raster,
          action,
          tiles,
          attackFramePalettes(frame, prepared.animation.palettes),
          mapped.x,
          mapped.y,
          {
            gameAnchor: true, flipX: mapped.flipX,
            // RenderBattleObject $87A4..$87BA, battle mode 02:
            // reject tile origins with nonzero coordinate high bytes, and
            // effect-object rows at/after $90. Do not clamp the launch byte.
            tileVisible: (x, y) => x >= 0 && x < 256
              && y >= 0 && y < BATTLE_SCENE_FIELD_HEIGHT,
          },
        );
        paintedEffectObjects += 1;
      }
    }
  }
  raster.paintedEffectObjects = paintedEffectObjects;
  raster.partyFrameKeys = partyFrameKeys;
  raster.playback = playback;
  raster.actorXDelta = currentActorXDelta;
  raster.activePartyActorIndex = activePartyActorIndex;
  raster.actorRole = activePartyActorIndex === null
    ? "" : prepared.attack.side === "enemy" ? "target" : "attacker";
  raster.launchAnchor = launchAnchor;
  raster.impactAnchor = impactAnchor;
  return raster;
}

function drawFormationGrid(context, preview) {
  if (!preview.guides) return;
  context.save();
  for (const enemy of preview.enemies) {
    if (!enemy?.visible) continue;
    const color = ENEMY_GROUP_COLORS[enemy.groupIndex] || ENEMY_GROUP_COLORS[0];
    context.fillStyle = `${color}24`;
    context.strokeStyle = `${color}b8`;
    context.lineWidth = 1;
    context.fillRect(
      enemy.pixelX,
      enemy.pixelY,
      enemy.widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
      enemy.heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    );
    context.strokeRect(
      enemy.pixelX + 0.5,
      enemy.pixelY + 0.5,
      enemy.widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS - 1,
      enemy.heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS - 1,
    );
  }
  context.strokeStyle = "rgba(114, 229, 255, .28)";
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 0; column <= BATTLE_ENEMY_GRID_COLUMNS; column += 1) {
    const x = BATTLE_ENEMY_GRID_LEFT
      + column * BATTLE_ENEMY_GRID_CELL_PIXELS + 0.5;
    context.moveTo(x, BATTLE_ENEMY_GRID_TOP);
    context.lineTo(
      x,
      BATTLE_ENEMY_GRID_TOP
        + BATTLE_ENEMY_GRID_ROWS * BATTLE_ENEMY_GRID_CELL_PIXELS,
    );
  }
  for (let row = 0; row <= BATTLE_ENEMY_GRID_ROWS; row += 1) {
    const y = BATTLE_ENEMY_GRID_TOP
      + row * BATTLE_ENEMY_GRID_CELL_PIXELS + 0.5;
    context.moveTo(BATTLE_ENEMY_GRID_LEFT, y);
    context.lineTo(
      BATTLE_ENEMY_GRID_LEFT
        + BATTLE_ENEMY_GRID_COLUMNS * BATTLE_ENEMY_GRID_CELL_PIXELS,
      y,
    );
  }
  context.stroke();
  context.restore();
}

function opaqueRasterBounds(raster, centerX, centerY) {
  if (!raster?.data?.length) return null;
  let minX = raster.width;
  let minY = raster.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      if (!raster.data[(y * raster.width + x) * 4 + 3]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const rasterLeft = Math.round(centerX - raster.width / 2);
  const rasterTop = Math.round(centerY - raster.height / 2);
  return {
    left: rasterLeft + minX,
    top: rasterTop + minY,
    right: rasterLeft + maxX + 1,
    bottom: rasterTop + maxY + 1,
  };
}

function attackTargetBounds(prepared, targets = prepared.attack.targets) {
  const bounds = targets.flatMap(entity => {
    const raster = prepared.attack.targetSide === "enemy"
      ? prepared.enemyRasters.get(Number(entity.monsterId))
      : prepared.partyRasters.get(battleSceneSprite(
          prepared.catalog,
          battleScenePartyAppearanceKey(prepared.catalog, entity),
        )?.key);
    const value = opaqueRasterBounds(raster, entity.x, entity.y);
    return value ? [value] : [];
  });
  if (!bounds.length) return null;
  return {
    left: Math.min(...bounds.map(item => item.left)),
    top: Math.min(...bounds.map(item => item.top)),
    right: Math.max(...bounds.map(item => item.right)),
    bottom: Math.max(...bounds.map(item => item.bottom)),
  };
}

function drawGuideLabelsAndTargetFrame(context, prepared, playback) {
  if (!prepared.preview.guides) return;
  context.save();
  context.font = "8px monospace";
  context.textBaseline = "bottom";
  context.lineWidth = 1;
  const drawLabel = (item, label, color) => {
    context.fillStyle = color;
    context.fillText(label, item.x + 6, item.y + 3);
  };
  prepared.preview.party.forEach((item, index) => {
    if (item.visible) drawLabel(item, `P${index + 1}`, "#72e5ff");
  });
  prepared.preview.enemies.forEach((item, index) => {
    if (item?.visible) drawLabel(
      item,
      `E${index + 1}/G${item.groupIndex + 1}`,
      ENEMY_GROUP_COLORS[item.groupIndex] || ENEMY_GROUP_COLORS[0],
    );
  });
  const targetBounds = attackTargetBounds(prepared);
  if (targetBounds) {
    const padding = 3;
    const left = Math.max(1, targetBounds.left - padding);
    const top = Math.max(1, targetBounds.top - padding);
    const right = Math.min(BATTLE_SCENE_WIDTH - 1, targetBounds.right + padding);
    const bottom = Math.min(
      BATTLE_SCENE_FIELD_HEIGHT - 1,
      targetBounds.bottom + padding,
    );
    context.strokeStyle = "#ffe05c";
    context.lineWidth = 2;
    context.strokeRect(
      left + 0.5,
      top + 0.5,
      Math.max(1, right - left - 1),
      Math.max(1, bottom - top - 1),
    );
    const label = `${prepared.attack.scopeLabel} · ${
      prepared.attack.targetIndices.map(index =>
        `${prepared.attack.targetSide === "enemy" ? "E" : "P"}${index + 1}`
      ).join("、")
    }`;
    const labelWidth = context.measureText(label).width + 4;
    const labelTop = top >= 10 ? top - 10 : top + 2;
    context.fillStyle = "rgba(0, 0, 0, .85)";
    context.fillRect(left, labelTop, labelWidth, 9);
    context.fillStyle = "#ffe05c";
    context.fillText(label, left + 2, labelTop + 8);
  }
  if (playback?.frame && playback.target) {
    const activeBounds = attackTargetBounds(prepared, [playback.target]);
    if (activeBounds) {
      const padding = 1;
      const left = Math.max(1, activeBounds.left - padding);
      const top = Math.max(1, activeBounds.top - padding);
      const right = Math.min(
        BATTLE_SCENE_WIDTH - 1,
        activeBounds.right + padding,
      );
      const bottom = Math.min(
        BATTLE_SCENE_FIELD_HEIGHT - 1,
        activeBounds.bottom + padding,
      );
      context.strokeStyle = "#72e5ff";
      context.lineWidth = 1;
      context.strokeRect(
        left + 0.5,
        top + 0.5,
        Math.max(1, right - left - 1),
        Math.max(1, bottom - top - 1),
      );
    }
  }
  context.restore();
}

function updateStatus(canvas, text, error = false, passive = false) {
  const root = canvas.closest(
    "[data-battle-scene-preview-host], [data-screen-workbench]",
  ) || document;
  const status = root.querySelector("[data-battle-scene-simulation-status]");
  if (status) {
    const errorsOnly = status.hasAttribute("data-battle-scene-status-errors-only");
    status.textContent = errorsOnly && (passive || !error) ? ""
      : [text, errorsOnly ? "" : canvas.dataset.battleSceneWindowNote].filter(Boolean).join("；");
    status.classList.toggle("invalid", error && Boolean(status.textContent));
  }
}

function drawPrepared(canvas, prepared, frameIndex = null, drawing = null) {
  preparedCompositions.set(canvas, prepared);
  preparedFrameIndices.set(canvas, frameIndex);
  bindBattleMessageOutcomes(canvas, prepared);
  if (!drawing || canvas.width !== BATTLE_SCENE_WIDTH) canvas.width = BATTLE_SCENE_WIDTH;
  if (!drawing || canvas.height !== BATTLE_SCENE_HEIGHT) canvas.height = BATTLE_SCENE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const messageWindow = prepared.messageWindow;
  canvas.dataset.battleSceneWindowState = messageWindow?.stateId || "";
  canvas.dataset.battleSceneWindowTemplate = messageWindow?.templateId || "";
  canvas.dataset.battleSceneWindowNote = messageWindow
    ? [...new Set([messageWindow.reason, ...(messageWindow.textOutputs || []).map(output => output.reason),
      messageWindow.layers.length && !messageWindow.empty && !messageWindow.textSlots?.length
        ? "仅显示已发布窗框，当前来源尚无可填入的正文绑定" : ""].filter(Boolean))].join("；")
    : "";
  canvas.dataset.battleSceneTextRecords = (messageWindow?.textOutputs || []).map(output => output.recordId).join(",");
  canvas.dataset.battleSceneTextStates = (messageWindow?.textOutputs || []).map(output => output.status).join(",");
  const placeholders = (messageWindow?.textOutputs || []).flatMap(output =>
    (output.placeholders || []).map(item => ({...item, slotRecord: output.recordId})));
  canvas.dataset.battleSceneTextPlaceholders = JSON.stringify(placeholders);
  canvas.dataset.battleSceneItemMessageStatus = prepared.messageSource?.item
    ? messageWindow?.sequenceId && messageWindow.sequenceComplete && messageWindow.textOutputs?.length
      && messageWindow.textOutputs.every(output => output.status === "complete")
      ? placeholders.length ? "structure-complete" : "complete" : "incomplete"
    : "";
  canvas.dataset.battleSceneEnemyMessageStatus = prepared.messageSource?.action
    ? messageWindow?.sequenceId && messageWindow.sequenceComplete && messageWindow.textOutputs?.length
      && messageWindow.textOutputs.every(output => output.status === "complete")
      ? placeholders.length ? "structure-complete" : "complete" : "incomplete"
    : "";
  canvas.dataset.battleSceneMessagePhase = messageWindow?.totalPhases
    ? `${messageWindow.phaseCount}/${messageWindow.totalPhases}` : "";
  if (prepared.background) {
    context.drawImage(
      prepared.background,
      0,
      BATTLE_SCENE_FIELD_HEIGHT,
      BATTLE_SCENE_WIDTH,
      BATTLE_SCENE_HEIGHT - BATTLE_SCENE_FIELD_HEIGHT,
      0,
      BATTLE_SCENE_FIELD_HEIGHT,
      BATTLE_SCENE_WIDTH,
      BATTLE_SCENE_HEIGHT - BATTLE_SCENE_FIELD_HEIGHT,
    );
  }
  drawFormationGrid(context, prepared.preview);
  const composition = compositionRaster(prepared, frameIndex);
  const overlay = drawing?.overlay || document.createElement("canvas");
  if (drawing) {
    if (overlay.width !== composition.width) overlay.width = composition.width;
    if (overlay.height !== composition.height) overlay.height = composition.height;
    overlay.getContext("2d").putImageData(new ImageData(composition.data,
      composition.width, composition.height), 0, 0);
  } else blitRaster(overlay, composition);
  context.drawImage(overlay, 0, 0);
  for (const layer of [...(messageWindow?.layers || []), ...(messageWindow?.textOutputs || [])]) {
    if (layer.surface) context.drawImage(layer.surface, layer.rectangle.x, layer.rectangle.y);
  }
  if (prepared.statusSlot?.surface) context.drawImage(prepared.statusSlot.surface,
    prepared.statusSlot.rectangle.x, prepared.statusSlot.rectangle.y);
  canvas.dataset.battleSceneStatusWindow = prepared.statusWindow
    ? `${prepared.statusWindow.label}:${prepared.statusWindow.value}` : "";
  const pending = messageWindow?.textOutputs?.find(output => output.status === "waiting")
    || messageWindow?.textOutputs?.find(output => output.status === "blocked");
  uiBindTextSlotConfirmation(canvas, pending, next => {
    const index = messageWindow.textOutputs.indexOf(pending);
    if (index < 0 || preparedCompositions.get(canvas) !== prepared) return;
    messageWindow.textOutputs[index] = next;
    drawPrepared(canvas, prepared, preparedFrameIndices.get(canvas));
  });
  drawGuideLabelsAndTargetFrame(context, prepared, composition.playback);
  canvas.dataset.battleSceneComposerPainted = "1";
  canvas.dataset.battleScenePartyVisible = String(
    prepared.preview.party.filter(item => item.visible).length,
  );
  canvas.dataset.battleSceneEnemiesVisible = String(
    prepared.preview.enemies.filter(item => item?.visible).length,
  );
  canvas.dataset.battleScenePartyPositions = prepared.preview.party
    .map(item => `${item.x},${item.y}`).join(";");
  canvas.dataset.battleSceneEnemyPositions = prepared.preview.enemies
    .map(item => item ? `${item.x},${item.y}` : "empty").join(";");
  canvas.dataset.battleSceneAttackAvailable = String(prepared.attack.available);
  canvas.dataset.battleSceneGrid = `${BATTLE_ENEMY_GRID_COLUMNS}x${
    BATTLE_ENEMY_GRID_ROWS
  }`;
  canvas.dataset.battleSceneTargetScope = prepared.attack.scope;
  // 发射点逐槽取，而一个攻击方式常覆盖好几个槽：这一格说明这次到底用了哪一槽。
  canvas.dataset.battleSceneAttackSelectionSlot = String(
    prepared.attack.selectionSlot,
  );
  canvas.dataset.battleSceneTargetCount = String(prepared.attack.targets.length);
  canvas.dataset.battleSceneTargetIndices = prepared.attack.targetIndices.join(",");
  canvas.dataset.battleSceneAttackVisualCode = prepared.attack.visualCode == null
    ? "" : String(prepared.attack.visualCode);
  canvas.dataset.battleSceneAttackChannel = prepared.attack.channel || "";
  canvas.dataset.battleSceneLaunchAnchorProfile = String(
    prepared.attack.launchAnchorProfile?.id || "",
  );
  canvas.dataset.battleSceneAppearanceKeys = prepared.preview.party
    .map(item => battleScenePartyAppearanceKey(prepared.catalog, item)).join(";");
  canvas.dataset.battleSceneNormalAppearanceKeys = prepared.preview.party
    .map(item => item.normalAppearance).join(";");
  canvas.dataset.battleSceneVehicleAppearanceKeys = prepared.preview.party
    .map(item => battleScenePartyVehicle(
      prepared.catalog, item,
    )?.appearanceKey || "").join(";");
  canvas.dataset.battleSceneVehiclePresetIds = prepared.preview.party
    .map(item => item.vehiclePresetId ?? "").join(";");
  canvas.dataset.battleSceneRidingStates = prepared.preview.party
    .map(item => String(Boolean(item.riding))).join(";");
  canvas.dataset.battleSceneActionKeys = prepared.preview.party
    .map((item, index) => prepared.partySprites[index]?.pose || "").join(";");
  canvas.dataset.battleSceneSpriteKeys = prepared.partySprites
    .map(item => item?.key || "").join(";");
  canvas.dataset.battleSceneActorFrameKeys = composition.partyFrameKeys.join(";");
  canvas.dataset.battleSceneActorAnimated = String(
    frameIndex !== null && composition.activePartyActorIndex !== null,
  );
  const playback = composition.playback;
  canvas.dataset.battleSceneAttackTotalFrames = String(
    playback?.totalFrameCount || 0,
  );
  canvas.dataset.battleSceneAttackClipFrames = String(
    playback?.clipFrameCount || 0,
  );
  canvas.dataset.battleSceneAttackImpactStartFrame = String(
    playback?.impactFrameStart || 0,
  );
  canvas.dataset.battleSceneAttackImpactFrames = String(
    playback?.impactFrameCount || 0,
  );
  canvas.dataset.battleScenePlaybackPhase = playback?.phase || "";
  canvas.dataset.battleSceneLocalAttackFrame = playback?.localFrameIndex == null
    ? "" : String(playback.localFrameIndex);
  canvas.dataset.battleSceneActiveTargetOrdinal = playback?.targetOrdinal == null
    ? "" : String(playback.targetOrdinal);
  canvas.dataset.battleSceneActiveTargetIndex = playback?.targetIndex == null
    ? "" : String(playback.targetIndex);
  canvas.dataset.battleSceneActorStateDelta = playback?.frame
    ? String(Number(playback.frame.actorStateDelta) || 0) : "";
  canvas.dataset.battleSceneActorXDelta = playback?.frame
    ? String(composition.actorXDelta || 0) : "";
  canvas.dataset.battleSceneActorRole = composition.actorRole || "";
  canvas.dataset.battleSceneActivePartyActorIndex =
    composition.activePartyActorIndex === null
      ? "" : String(composition.activePartyActorIndex);
  canvas.dataset.battleSceneLaunchAnchor = composition.launchAnchor
    ? `${Math.round(composition.launchAnchor.x)},${Math.round(
      composition.launchAnchor.y,
    )}` : "";
  canvas.dataset.battleSceneImpactAnchor = composition.impactAnchor
    ? `${Math.round(composition.impactAnchor.x)},${Math.round(
      composition.impactAnchor.y,
    )}` : "";
  const video = nesVideoStandard(prepared.videoStandard ?? state.battleVideoStandard);
  canvas.dataset.battleSceneVideoStandard = video.key;
  canvas.dataset.battleScenePlaybackHz = video.hz.toFixed(5);
  canvas.dataset.battleSceneFrameDurationMs = nesFrameDurationMs(video.key).toFixed(4);
  canvas.dataset.battleSceneAttackFrame = frameIndex === null
    ? "" : String(frameIndex);
  canvas.dataset.battleSceneEffectObjects = String(
    composition.paintedEffectObjects || 0,
  );
  delete canvas.dataset.battleSceneComposerError;
}

function stopPlayback(canvas) {
  const timer = playbackTimers.get(canvas);
  timer?.cancel?.();
  playbackTimers.delete(canvas);
}

async function paintCanvas(canvas, {
  project = state.project,
  preview: sourcePreview = null,
  messageAction = null,
  messageWindowState = null,
  messageSaveSlot = null,
  messageRecordId = undefined,
  messageRuntime = null,
  statusWindow = null,
  messageSequence = null,
  enemyPaletteMonsterId = null,
  previousEnemyScene = null,
} = {}) {
  stopPlayback(canvas);
  canvas.dataset.battleSceneComposerPainted = "0";
  delete canvas.dataset.battleSceneComposerError;
  const token = (paintTokens.get(canvas) || 0) + 1;
  paintTokens.set(canvas, token);
  const preview = currentPreview(project, sourcePreview);
  try {
    const messageSource = await battleSceneMessageSource({
      attack: resolveBattleSceneAttack(preview, project), action: messageAction,
      recordId: messageRecordId, runtime: messageRuntime,
    });
    const prepared = await prepareComposition(
      preview,
      String(canvas.dataset.battleSceneRuntimePreview || ""),
      project,
      messageWindowState,
      messageSaveSlot,
      messageSource,
      statusWindow,
      messageSequence,
      enemyPaletteMonsterId,
      previousEnemyScene,
    );
    if (paintTokens.get(canvas) !== token || !canvas.isConnected) return;
    drawPrepared(canvas, prepared);
    const sourceLabel = prepared.messageSource.action?.name_hint
      || prepared.attack.source?.label || "未选择攻击视觉";
    updateStatus(
      canvas,
      prepared.attack.available
        ? `${sourceLabel} · ${prepared.attack.scopeLabel} · 选择武器或动作后播放攻击动画`
        : prepared.messageSource.action
          ? `${sourceLabel} · 文字演示就绪，点击播放这条行动`
          : `${sourceLabel} · ${prepared.attack.reason}`,
      !prepared.attack.available && !prepared.messageSource.action,
      true,
    );
  } catch (error) {
    if (paintTokens.get(canvas) !== token) return;
    canvas.dataset.battleSceneComposerError = String(error?.message || error);
    updateStatus(canvas, `预览失败：${error?.message || error}`, true);
    editorLog.error("预览", "战斗场景合成失败", error);
  }
}

/** 重画页面上所有战斗编排画布；坐标输入时可以直接调用，不必重建 DOM。 */
async function paintBattleSceneComposerCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-scene-composer]")];
  await Promise.all(canvases.map(canvas => paintCanvas(canvas)));
}

/** 用指定预览绘制单张画布；只读预设借此复用渲染器而不覆盖战斗页草稿。 */
async function paintBattleSceneComposerCanvas(canvas, options = {}) {
  if (!canvas) return false;
  await paintCanvas(canvas, options);
  return canvas.dataset.battleSceneComposerPainted === "1";
}

/** 战斗画面独立的绘制输入共用一份并行准备。 */
function prepareBattleSceneComposerSources() {
  return Promise.all([prepareAttackChrEntryContext(), battleActorSources(), db.getDocument("project.ui", null).then(ui =>
    uiJsRenderSources(ui.construction))]);
}

/** 播放投影按输入准备，逐帧绘制只读取本次投影。 */
async function prepareBattleSceneComposerPlayback({project = state.project,
  preview: sourcePreview, messageRecordId = null, messageRuntime = null,
  messageSequence = null, phase = "", presentation = 0,
  enemyPaletteMonsterId = null, previousEnemyScene = null, paintOverlay = null,
  messageSaveSlot = null, statusWindow = null, messageOutcomeId = "", messageActor = null,
  catalog = null, sources = null} = {}) {
  // 目录在本次输入准备内复用，先加载当前人物配方再创建目录。
  const [, actorSources] = await (sources?.ready || prepareBattleSceneComposerSources());
  catalog ||= battleScenePreviewCatalog(project);
  const preview = currentPreview(project, sourcePreview, catalog);
  const messageSource = await battleSceneMessageSource({
    attack: resolveBattleSceneAttack(preview, project, catalog),
    recordId: phase === "single-action" ? undefined : messageRecordId, runtime: messageRuntime,
  });
  if (phase === "single-action") {
    messageSource.outcomeId = messageOutcomeId;
    messageSource.actor = messageActor;
  } else if (messageOutcomeId) messageSource.outcomeId = messageOutcomeId;
  const prepared = await prepareComposition(preview, "", project, null, messageSaveSlot,
    messageSource, statusWindow, messageSequence, enemyPaletteMonsterId, previousEnemyScene, catalog, sources, actorSources);
  prepared.videoStandard = state.battleVideoStandard;
  const playback = playbackFrame(prepared, 0);
  const start = phase === "damage" ? playback.impactFrameStart : 0;
  const end = phase === "attack" ? playback.impactFrameStart : playback.totalFrameCount;
  const animated = ["attack", "damage", "single-action"].includes(phase) && start < end;
  const presentationParameters = [1, 4].includes(presentation) ? await battlePresentationParameters() : null;
  const presentationCount = battlePresentationFrame(presentation, 0, presentationParameters).count;
  const surface = document.createElement("canvas");
  const drawing = {overlay: document.createElement("canvas")};
  const count = (animated ? end - start : 0)
    + (!animated || presentationCount ? presentationCount + 1 : 0);
  const columns = Math.min(16, count), atlas = document.createElement("canvas");
  const metadata = Array(count), completed = new Set();
  let disposed = false, snapshot = null, context = null, lastFrame = -1;
  const prepareFrame = index => {
    if (disposed) throw new Error("播放剪辑已释放");
    if (completed.has(index)) return;
    const animationCount = animated ? end - start : 0;
    const current = index < animationCount ? prepared
      : {...prepared, presentation: battlePresentationFrame(presentation, index - animationCount, presentationParameters)};
    if (lastFrame !== index) {
      drawPrepared(surface, current, index < animationCount ? start + index : null, drawing);
      paintOverlay?.(surface);
      metadata[index] = {...surface.dataset};
      lastFrame = index;
    }
    if (context) {
      context.drawImage(surface, (index % columns) * surface.width,
        Math.floor(index / columns) * surface.height);
      completed.add(index);
    }
  };
  return {
    outcomes: prepared.messageWindow?.outcomes || [],
    messagePhase: prepared.messageWindow?.messagePhases?.at(-1) || null,
    frameCount: animated || presentationCount ? count : 0,
    snapshot({isCurrent = () => true} = {}) {
      return snapshot ||= (async () => {
        const current = () => !disposed && isCurrent();
        if (!current()) return null;
        atlas.width = columns * BATTLE_SCENE_WIDTH;
        atlas.height = Math.ceil(count / columns) * BATTLE_SCENE_HEIGHT;
        context = atlas.getContext("2d");
        // 图集按短批次补齐，播放与跳转同步准备所需帧。
        let batchStarted = performance.now();
        for (let index = 0; index < count; index++) {
          if (!current()) return null;
          prepareFrame(index);
          if (performance.now() - batchStarted >= 8) {
            await new Promise(resolve => setTimeout(resolve, 0));
            batchStarted = performance.now();
          }
        }
        if (!current()) return null;
        const image = await new Promise(resolve => atlas.toBlob(resolve, "image/png"));
        if (!current()) return null;
        if (!image) throw new Error("播放帧缓存失败");
        return {image, columns, width: surface.width, height: surface.height,
          frameCount: this.frameCount, messagePhase: this.messagePhase, metadata};
      })();
    },
    dispose() {disposed = true; atlas.width = atlas.height = 0; surface.width = surface.height = 0;},
    paint(canvas, frameIndex = 0) {
      const index = Math.max(0, Math.min(count - 1, frameIndex));
      prepareFrame(index);
      const output = canvas.getContext("2d");
      output.clearRect(0, 0, canvas.width, canvas.height);
      if (completed.has(index)) output.drawImage(atlas, (index % columns) * surface.width,
        Math.floor(index / columns) * surface.height, surface.width, surface.height,
        0, 0, surface.width, surface.height);
      else output.drawImage(surface, 0, 0);
      Object.assign(canvas.dataset, metadata[index]);
    },
  };
}

/** PNG 帧图集恢复为只读播放投影。 */
async function restoreBattleSceneComposerPlayback({image, columns, width, height, frameCount, messagePhase, metadata}) {
  const atlas = await createImageBitmap(image);
  return {
    frameCount,
    messagePhase,
    dispose() {atlas.close();},
    async snapshot() {return {image, columns, width, height, frameCount, messagePhase, metadata};},
    paint(canvas, frameIndex = 0) {
      const index = Math.max(0, Math.min(metadata.length - 1, frameIndex));
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(atlas, (index % columns) * width, Math.floor(index / columns) * height,
        width, height, 0, 0, width, height);
      Object.assign(canvas.dataset, metadata[index]);
    },
  };
}

/** 绘出同一套已准备资产的指定攻击剪辑帧。 */
function paintBattleSceneComposerFrame(canvas, frameIndex) {
  const prepared = preparedCompositions.get(canvas);
  if (!prepared || !Number.isInteger(frameIndex) || frameIndex < 0
      || frameIndex >= playbackFrame(prepared, frameIndex).totalFrameCount) return false;
  drawPrepared(canvas, prepared, frameIndex);
  return true;
}

/**
 * 按所选 PAL / NTSC 的逐帧时钟播放一次当前双方攻击。
 *
 * `preview` 与 `paintBattleSceneComposerCanvas` 对齐：内嵌进别的页时，画的是传进来
 * 的那一套，播的也得是同一套。原来这里写死取战斗场景页的草稿，内嵌就会「画的是这
 * 只怪物、播的是战斗页那一套」。
 */
async function playBattleSceneComposerAttack(canvas = null, {
  project = state.project,
  preview: sourcePreview = null,
  messageSaveSlot = null,
  messageAction = null,
  messageOutcome = null,
} = {}) {
  const target = canvas || document.querySelector(
    "canvas[data-battle-scene-composer]",
  );
  if (!target) return false;
  stopPlayback(target);
  const token = (paintTokens.get(target) || 0) + 1;
  paintTokens.set(target, token);
  const preview = currentPreview(project, sourcePreview);
  try {
    const messageSource = await battleSceneMessageSource({
      attack: resolveBattleSceneAttack(preview, project), action: messageAction,
    });
    const previousSource = preparedCompositions.get(target)?.messageSource;
    if (messageSource.action && messageOutcome?.actionReference === messageSource.action.handle) {
      messageSource.outcomeId = messageOutcome.id;
      messageSource.phaseCount = 1;
    } else if (messageSource.action && previousSource?.action?.handle === messageSource.action.handle) {
      messageSource.outcomeId = previousSource.outcomeId || "";
      messageSource.phaseCount = 1;
    }
    const prepared = await prepareComposition(
      preview,
      String(target.dataset.battleSceneRuntimePreview || ""),
      project,
      null,
      messageSaveSlot,
      messageSource,
    );
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    const sourceLabel = prepared.messageSource.action?.name_hint
      || prepared.attack.source?.label || "攻击视觉";
    const messageStages = [];
    const totalMessagePhases = messageSource.action ? prepared.messageWindow?.totalPhases || 0 : 0;
    for (let phaseCount = 2; phaseCount <= totalMessagePhases; phaseCount++) {
      const nextSource = {...messageSource, phaseCount};
      messageStages.push({...prepared, messageSource: nextSource,
        messageWindow: await prepareMessageWindow("", null, project, nextSource, messageSaveSlot)});
    }
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    const current = () => target.isConnected && paintTokens.get(target) === token;
    const finish = latest => {
      if (!current()) return;
      stopPlayback(target);
      drawPrepared(target, latest);
      updateStatus(target, `${sourceLabel} · 播放完成${messageStages.length
        ? ` · 结果消息 ${latest.messageWindow.phaseCount}/${latest.messageWindow.totalPhases}` : ""}`);
    };
    let messageStageIndex = 0;
    const advanceMessage = () => {
      if (!current()) return;
      const next = messageStages[messageStageIndex++];
      if (!next) { finish(prepared); return; }
      drawPrepared(target, next);
      if (messageStageIndex === messageStages.length) { finish(next); return; }
      updateStatus(target, `${sourceLabel} · 结果消息 ${next.messageWindow.phaseCount}/${next.messageWindow.totalPhases}`);
      playbackTimers.set(target, startNesFrameClock({standard: state.battleVideoStandard,
        frameCount: 60, shouldContinue: current, onFrame: () => {}, onComplete: advanceMessage}));
    };
    const frames = prepared.animation?.frames || [];
    if (!prepared.attack.available || !frames.length) {
      drawPrepared(target, prepared);
      if (prepared.messageSource.action) {
        if (messageStages.length) {
          updateStatus(target, `${sourceLabel} · 正在演示行动提示`);
          // Text-only previews hold each message for 60 preview frames, independent of ROM timing.
          playbackTimers.set(target, startNesFrameClock({standard: state.battleVideoStandard,
            frameCount: 60, shouldContinue: current, onFrame: () => {}, onComplete: advanceMessage}));
          return true;
        }
        const outputs = prepared.messageWindow?.textOutputs || [];
        const complete = outputs.length && outputs.every(output => output.status === "complete");
        updateStatus(target, `${sourceLabel} · ${complete
          ? "文字演示完成"
          : `已演示消息窗；文字未完整显示：${target.dataset.battleSceneWindowNote}`}`);
        return true;
      }
      updateStatus(
        target,
        `${sourceLabel} · ${prepared.attack.reason || "该攻击视觉没有可播放帧"}`,
        true,
      );
      return false;
    }
    const totalFrameCount = playbackFrame(prepared, 0).totalFrameCount;
    const playbackStatus = frameIndex => {
      const playback = playbackFrame(prepared, frameIndex);
      const targetStatus = prepared.attack.targets.length > 1
        ? ` · 目标 ${playback.targetOrdinal + 1}/${prepared.attack.targets.length}`
        : "";
      const phaseStatus = playback.phase === "impact-repeat"
        ? `受击 ${playback.phaseFrameIndex + 1}/${playback.impactFrameCount}`
        : `首轮 ${playback.localFrameIndex + 1}/${playback.clipFrameCount}`;
      return `正在播放 ${sourceLabel}${
        targetStatus
      } · ${phaseStatus} · 总帧 ${
        playback.frameIndex + 1
      }/${totalFrameCount}`;
    };
    let index = 0;
    drawPrepared(target, prepared, index);
    updateStatus(target, playbackStatus(index));
    const timer = startNesFrameClock({
      standard: state.battleVideoStandard,
      frameCount: totalFrameCount,
      shouldContinue: () => target.isConnected
        && paintTokens.get(target) === token,
      onFrame: nextIndex => {
        index = nextIndex;
        drawPrepared(target, prepared, index);
        updateStatus(target, playbackStatus(index));
      },
      onComplete: advanceMessage,
    });
    playbackTimers.set(target, timer);
    return true;
  } catch (error) {
    editorLog.error("预览", `操作失败：${error?.message || error}`, error);
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    target.dataset.battleSceneComposerError = String(error?.message || error);
    updateStatus(target, `攻击模拟失败：${error?.message || error}`, true);
    return false;
  }
}

var battleSceneComposer = /*#__PURE__*/Object.freeze({
  __proto__: null,
  paintBattleSceneComposerCanvas: paintBattleSceneComposerCanvas,
  paintBattleSceneComposerCanvases: paintBattleSceneComposerCanvases,
  paintBattleSceneComposerFrame: paintBattleSceneComposerFrame,
  playBattleSceneComposerAttack: playBattleSceneComposerAttack,
  prepareBattleSceneComposerPlayback: prepareBattleSceneComposerPlayback,
  prepareBattleSceneComposerSources: prepareBattleSceneComposerSources,
  refreshMessageText: refreshMessageText,
  restoreBattleSceneComposerPlayback: restoreBattleSceneComposerPlayback
});

// @editor-module 战斗形象与动作的统一工作台

const previewClocks = new WeakMap();

function selectedModel(project = state.project) {
  const catalog = battleActorCatalog(project);
  let appearance = catalog.appearanceByKey.get(
    String(state.battleActorAppearance || ""),
  ) || catalog.appearances[0] || null;
  state.battleActorAppearance = appearance?.key || null;
  let action = battleActorAction(
    catalog,
    appearance?.key,
    state.battleActorAction,
  );
  state.battleActorAction = action?.pose || null;
  return {catalog, appearance, action};
}

function appearanceTypeLabel(appearance) {
  if (appearance?.kind === "vehicle") return "载具";
  if (appearance?.kind === "npc") return "NPC";
  return "主角团";
}

function sourceFacts(action) {
  if (!action) return [];
  if (action.kind === "battle-action") {
    return [
      ["基础资产", action.resourceUid],
      ["底盘", action.chassisIdHex],
      ["战斗动作", hex(action.id, 2)],
      ["布局", `${action.resource.columns} × ${action.resource.rows} 图块`],
      ["调色板", `子调色板 ${action.resource.palette_id}`],
    ];
  }
  return [
    ["基础资产", action.resourceUid],
    ["组合精灵", hex(action.id, 2)],
    ["姿势", action.poseLabel || action.pose],
    ["精灵数", action.resource?.sprite_count ?? "—"],
    ["CHR 上下文", "$24 / $25 / $26 / $27"],
    ["识别", action.resource?.identification_status || "—"],
  ];
}

function renderBattleActors(project = state.project) {
  const {catalog, appearance, action} = selectedModel(project);
  if (!appearance || !action) {
    return ``;
  }
  const video = nesVideoStandard(state.battleVideoStandard);
  return screenWorkbench({namespace: 'battleactors', className: 'battle-actor-workbench',
    attributes: {'data-battle-actor-workbench': ''},
    toolbarMarkup: `<header class="battle-actor-head">
      <div><p class="eyebrow">SHARED BATTLE ACTOR ASSETS</p>
        <h2>战斗角色形象与动作</h2>
      </div></header>`,
    stageToolbarMarkup: `<div class="battle-actor-video-controls" role="group" aria-label="NES 视频制式">
        ${Object.values({ntsc: nesVideoStandard("ntsc"), pal: nesVideoStandard("pal")})
          .map(item => `<button class="button ${video.key === item.key ? "primary" : "ghost"}"
            type="button" data-battle-video-standard="${item.key}"
            aria-pressed="${video.key === item.key}">${esc(item.label)}</button>`).join("")}
        <button class="button" type="button" data-battle-actor-play
          aria-pressed="${state.battleActorPlaying}">${
            state.battleActorPlaying ? "暂停动作" : "播放动作"
          }</button>
      </div>`,
    treeTitle: null, treeClassName: 'battle-actor-roster',
    treeAttributes: {'aria-label': '战斗形象目录'},
    treeMarkup: `<div class="battle-actor-roster-head"><b>战斗形象</b></div>
      ${catalog.appearances.map(item => {
          const selected = item.key === appearance.key;
          return `<button class="battle-actor-roster-row${selected ? " is-selected" : ""}"
            type="button" data-battle-actor-select="${esc(item.key)}"
            aria-current="${selected ? "true" : "false"}">
            <span><b>${esc(item.label)}</b></span>
          </button>`;
        }).join("")}`,
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'battleactors', canvasMarkup: `<canvas width="192" height="192" data-battle-actor-preview
              data-battle-actor-appearance="${esc(appearance.key)}"
              data-battle-actor-action="${esc(action.pose)}"
              aria-label="${esc(appearance.label)}动作预览"></canvas>`}),
    inspectorTitle: null, inspectorClassName: 'battle-actor-editor',
    inspectorMarkup: `<div class="battle-actor-stage-copy">
            <canvas width="64" height="64" data-battle-actor-thumbnail
              data-battle-actor-appearance="${esc(appearance.key)}"
              data-battle-actor-action="${esc(battleActorAction(catalog, appearance.key, appearance.defaultAction)?.pose || '')}"></canvas>
            <span class="badge confirmed">${appearanceTypeLabel(appearance)}</span>
            <h3>${esc(appearance.label)}</h3>
            <p>${appearance.actions.length} 个动作 / 姿势 · ${catalog.appearances.length} 类战斗形象</p>
            <p>当前动作：<b>${esc(action.poseLabel || action.label)}</b></p>
            <div class="battle-actor-apply-row"><span>应用到战斗场景：</span>
              ${[0, 1, 2].map(index => `<button class="button ghost" type="button"
                data-battle-actor-apply-slot="${index}">P${index + 1}</button>`).join("")}
            </div>
          </div>
        <section class="battle-actor-action-editor">
          <header><div><p class="eyebrow">ACTION / POSE</p><h3>动作与姿势</h3></div>
            </header>
          <div class="battle-actor-action-list">
            ${appearance.actions.map(item => `<button class="battle-actor-action-row${
              item.key === action.key ? " is-selected" : ""
            }" type="button" data-battle-actor-action-select="${esc(item.pose)}">
              <span><b>${esc(item.poseLabel || item.label)}</b>
                <small>${esc(item.resourceUid)}</small></span>
              <span class="mono">${item.kind === "battle-action"
                ? hex(item.id, 2) : hex(item.id, 2)}</span>
            </button>`).join("")}
          </div>
        </section>
        <section class="battle-actor-source">
          <header><div><p class="eyebrow">SOURCE ASSET</p><h3>当前基础资产</h3></div>
            <button class="resource-uid" type="button"
              data-resource-query="${esc(action.resourceUid)}">${esc(action.resourceUid)}</button>
          </header>
          <dl>${sourceFacts(action).map(([label, value]) =>
            `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
        </section>`,
  });
}

function stopPreview(canvas) {
  previewClocks.get(canvas)?.cancel?.();
  previewClocks.delete(canvas);
}

async function paintBattleActorCanvases(root = document) {
  const canvases = [...root.querySelectorAll(
    "canvas[data-battle-actor-thumbnail], canvas[data-battle-actor-preview]",
  )];
  if (!canvases.length) return;
  bindScreenWorkbenchZoom({namespace: 'battleactors', root});
  const {catalog} = selectedModel();
  const sources = await battleActorSources();
  for (const canvas of canvases) {
    stopPreview(canvas);
    const appearanceKey = canvas.dataset.battleActorAppearance;
    const actionKey = canvas.dataset.battleActorAction;
    const isPreview = canvas.hasAttribute("data-battle-actor-preview");
    const size = isPreview ? 192 : 64;
    const draw = (frameIndex = null, frameCount = 0) => {
      const action = battleActorActionAtFrame(
        catalog,
        appearanceKey,
        actionKey,
        frameIndex,
        frameCount,
      );
      const paint = action.actorKind === 'vehicle'
        ? options => vehiclePortraitImage({sources, action}, options)
        : options => battleActorImage(sources, action, options);
      const raster = paint({
        size,
        scale: isPreview ? 3 : 1,
        background: [0, 0, 0],
      });
      if (!raster) return;
      blitRaster(canvas, raster);
      canvas.dataset.battleActorPainted = "1";
      canvas.dataset.battleActorFrame = frameIndex === null ? "" : String(frameIndex);
      canvas.dataset.battleActorFrameKey = action?.key || "";
    };
    draw();
    if (!isPreview) continue;
    const video = nesVideoStandard(state.battleVideoStandard);
    const frameCount = Math.round(video.hz);
    canvas.dataset.battleActorStandard = video.key;
    canvas.dataset.battleActorPlaybackHz = video.hz.toFixed(5);
    canvas.dataset.battleActorFrameCount = String(frameCount);
    canvas.dataset.battleActorFrameDurationMs = nesFrameDurationMs(video.key)
      .toFixed(4);
    if (!state.battleActorPlaying) continue;
    const appearance = catalog.appearanceByKey.get(appearanceKey);
    if ((appearance?.actions || []).length < 2) continue;
    draw(0, frameCount);
    const clock = startNesFrameClock({
      standard: video.key,
      frameCount,
      loop: true,
      shouldContinue: () => canvas.isConnected,
      onFrame: index => draw(index, frameCount),
    });
    previewClocks.set(canvas, clock);
  }
}

function bindBattleActorWorkbench({rerender = async () => {}} = {}) {
  document.querySelectorAll("[data-battle-actor-select]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleActorAppearance = button.dataset.battleActorSelect;
      state.battleActorAction = null;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-actor-action-select]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleActorAction = button.dataset.battleActorActionSelect;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-video-standard]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleVideoStandard = button.dataset.battleVideoStandard;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelector("[data-battle-actor-play]")?.addEventListener("click", () => {
    state.battleActorPlaying = !state.battleActorPlaying;
    replaceHistoryUrl(currentViewUrl());
    void rerender();
  });
  document.querySelectorAll("[data-battle-actor-apply-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.battleActorApplySlot);
      const preview = normalizeBattleScenePreview(
        state.battleScenePreview,
        state.project,
      );
      const previewCatalog = battleScenePreviewCatalog(state.project);
      const appearance = battleActorCatalog(state.project).appearanceByKey.get(
        String(state.battleActorAppearance || ""),
      );
      if (appearance?.kind === "vehicle") {
        const currentPreset = previewCatalog.vehiclePresetById.get(
          Number(preview.party[slot].vehiclePresetId),
        );
        const vehiclePreset = currentPreset?.appearanceKey === appearance.key
          ? currentPreset
          : previewCatalog.vehiclePresets.find(
            item => item.appearanceKey === appearance.key,
          );
        if (vehiclePreset) {
          preview.party[slot].vehiclePresetId = vehiclePreset.id;
          preview.party[slot].attacks = {
            ...preview.party[slot].attacks,
            ...vehiclePreset.attacks,
          };
          preview.party[slot].riding = true;
        }
      } else if (appearance) {
        preview.party[slot].normalAppearance = appearance.key;
        preview.party[slot].riding = false;
      }
      state.battleScenePreview = normalizeBattleScenePreview(preview, state.project);
      button.textContent = `P${slot + 1} · 已应用`;
    });
  });
}

var battleActors = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindBattleActorWorkbench: bindBattleActorWorkbench,
  paintBattleActorCanvases: paintBattleActorCanvases,
  renderBattleActors: renderBattleActors
});

export { BATTLE_SCENE_ENEMY_GROUP_SLOTS, BATTLE_SCENE_ENEMY_SLOTS, BATTLE_SCENE_PARTY_SLOTS, battleActors, battleMessageSequenceWindow, battlePartyVisualPosition, battleSceneActiveEnemySlots, battleSceneAttackLaunchAnchor, battleSceneComposer, battleSceneEntityAttackSources, battleScenePartyAppearanceKey, battleScenePartyVehicle, battleScenePreviewCatalog, battleScenePreviewDefaults, battleScenePreviewForFormation, messageState, normalizeBattleScenePreview, paintBattleSceneComposerCanvas, paintBattleSceneComposerFrame, playBattleSceneComposerAttack, prepareBattleSceneComposerPlayback, prepareBattleSceneComposerSources, refreshMessageText, replayEnemyFormation, resolveBattleSceneAttack, restoreBattleSceneComposerPlayback };
