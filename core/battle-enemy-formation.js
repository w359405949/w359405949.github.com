// @editor-module 把四敌群展开为九实例，并按占用网格重放死亡、召唤和支援排布。
//
// 四个敌群槽是「怪物种类 × 数量」，不是四个屏幕坐标。开战时它们会展开为
// 最多九个运行实例；召唤/支援则先按当前实例重建 6×8 占用网格，只给新实例
// 找空位，不重新排列既有怪物。

export const BATTLE_ENEMY_GROUP_SLOTS = 4;
export const BATTLE_ENEMY_INSTANCE_SLOTS = 9;
export const BATTLE_ENEMY_GRID_COLUMNS = 6;
export const BATTLE_ENEMY_GRID_ROWS = 8;
export const BATTLE_ENEMY_GRID_CELL_PIXELS = 16;
export const BATTLE_ENEMY_GRID_LEFT = BATTLE_ENEMY_GRID_CELL_PIXELS;
export const BATTLE_ENEMY_GRID_TOP = BATTLE_ENEMY_GRID_CELL_PIXELS;

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

const integer = (value, fallback = 0) => {
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
  const widthCells = integer(source.widthCells);
  const heightCells = integer(source.heightCells);
  if (widthCells < 1 || widthCells > BATTLE_ENEMY_GRID_COLUMNS
      || heightCells < 1 || heightCells > BATTLE_ENEMY_GRID_ROWS) {
    return null;
  }
  return {
    monsterId: Number(monsterId),
    graphicId: integer(source.graphicId),
    widthCells,
    heightCells,
    widthPixels: integer(
      source.widthPixels,
      widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    ),
    heightPixels: integer(
      source.heightPixels,
      heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    ),
    attackAnchors: Array.isArray(source.attackAnchors)
      ? source.attackAnchors.map(anchor => anchor ? {
        x: integer(anchor.x),
        y: integer(anchor.y),
        recordId: integer(anchor.recordId),
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
    const monsterId = integer(source.monsterId, -1);
    const desiredCount = Math.max(0, integer(source.count));
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
    const groupIndex = integer(instance.groupIndex, -1);
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
export function applyEnemySlotOverrides(formation, overrides, footprints) {
  let state = cloneFormationState(formation);
  if (!state.placementRules) return state;
  const footprintByMonster = footprintMap(footprints);
  for (let slot = 0; slot < BATTLE_ENEMY_INSTANCE_SLOTS; slot += 1) {
    if (!Object.prototype.hasOwnProperty.call(overrides || {}, slot)) continue;
    const value = overrides[slot];
    const monsterId = value === null ? null : integer(value, -1);
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
    const slot = integer(event.slot, -1);
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
    const groupIndex = integer(event.groupIndex, -1);
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
      monsterId: integer(event.monsterId, -1),
    });
    return;
  }
  reject(state, eventIndex, "unknown-event", "无法识别的战斗中途事件");
}

/** 从开战配置重放死亡、召唤和支援，得到当前九实例 RAM 语义状态。 */
export function replayEnemyFormation(groups, events, footprints, placementDocument) {
  const state = initializeEnemyFormation(groups, footprints, placementDocument);
  if (!state.placementRules) return state;
  const footprintByMonster = footprintMap(footprints);
  for (let index = 0; index < (events || []).length; index += 1) {
    applyEvent(state, events[index], index, footprintByMonster);
  }
  return state;
}
