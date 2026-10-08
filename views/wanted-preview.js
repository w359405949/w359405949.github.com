// @editor-module 将通缉令草稿转换为预览模型，处理目标、赏金与击败覆盖。
// Pure WANTED poster draft model. Keep this module free of DOM, state and
// package imports so the resolver can be exercised without booting the editor.

const WANTED_PREVIEW_ACCURACY_NOTE = "配置草稿预览，非任意编队逐像素精确模拟";

export function wantedDefeatedEventFlag(targetId, document) {
  const base = document?.defeated_overlay?.event_flag?.base;
  if (!Number.isInteger(base)) throw new TypeError('通缉令缺少盖章事件位关系');
  return wantedNumericId(targetId, 1) + base;
}

export const CONFIRMED_WANTED_BOSS_IDS = Object.freeze([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
]);

const ALL_WANTED_TARGET_IDS = Object.freeze([
  0,
  ...CONFIRMED_WANTED_BOSS_IDS,
  12, 13, 14, 15,
]);

export function isConfirmedWantedBoss(targetId, bountyTable = null) {
  const id = wantedNumericId(targetId);
  if (!CONFIRMED_WANTED_BOSS_IDS.includes(id)) return false;
  if (Array.isArray(bountyTable?.entries)) {
    return bountyTable.entries.some(entry => wantedNumericId(entry?.wanted_id) === id);
  }
  return true;
}

export function wantedBossName(targetId, options = {}) {
  const id = wantedNumericId(targetId);
  if (id === null) return "—";

  let formations = [];
  let monsters = [];
  let bountyTable = null;

  if (Array.isArray(options)) {
    monsters = options;
  } else if (options && typeof options === "object") {
    formations = options.formations || [];
    monsters = options.monsters || [];
    bountyTable = options.bountyTable || null;
  }

  if (!isConfirmedWantedBoss(id, bountyTable)) {
    return `未确认（${id}）`;
  }

  const formation = wantedFormation(formations, id);
  if (formation) {
    const activeSlot = (formation.slots || []).find(slot =>
      wantedNumericId(slot?.monster_id) !== null && wantedNumericId(slot?.count, 0) > 0
    );
    if (activeSlot) {
      const monsterId = wantedNumericId(activeSlot.monster_id);
      const monsterMap = wantedMonsterMap(monsters);
      const monster = monsterMap.get(monsterId);
      if (monster?.name) return monster.name;
    }
  }

  const monsterMap = wantedMonsterMap(monsters);
  const monster = monsterMap.get(id);
  if (monster?.name) return monster.name;

  return `赏金首 ${id}`;
}

function wantedNumericId(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function cloneWantedDocument(value) {
  return cloneJson(value);
}

export function wantedTargetPair(document, index = "default") {
  if (!document || typeof document !== "object") return null;
  if (index === "default") return document.default_pair || null;
  const numericIndex = wantedNumericId(index);
  return (document.targets || []).find(row =>
    wantedNumericId(row?.index) === numericIndex) || null;
}

export function wantedTargetId(document, index = "default", side = "high") {
  const pair = wantedTargetPair(document, index);
  return wantedNumericId(pair?.[side === "low" ? "low_target_id" : "high_target_id"]);
}

export function setWantedTargetId(document, index, side, value) {
  const pair = wantedTargetPair(document, index);
  const targetId = wantedNumericId(value);
  if (!pair) throw new RangeError(`通缉目标记录 ${index} 不存在`);
  if (targetId === null || targetId > 0x0f) {
    throw new RangeError("通缉目标序号必须是 0–15 的整数");
  }
  pair[side === "low" ? "low_target_id" : "high_target_id"] = targetId;
  return document;
}


/**
 * Adopt a persisted one-item reset while retaining unsaved edits to every
 * sibling target pair. The selected pair always comes from resetSaved.
 */


export function wantedRecordId(region, id) {
  return `record:${String(region).padStart(2, "0")}:${String(id).padStart(3, "0")}`;
}

function isStaticWantedMonsterLayer(layer) {
  if (layer?.kind !== "tile_writes") return false;
  const role = String(layer.role || "").toLowerCase();
  return role.includes("formation") || role.includes("water-monster") || role.includes("wanted-monster");
}

function wantedFormation(formations, requestedId) {
  const list = Array.isArray(formations) ? formations : [];
  return list.find(entry => wantedNumericId(entry?.id) === requestedId) || null;
}

function wantedMonsterMap(monsters) {
  return new Map((Array.isArray(monsters) ? monsters : [])
    .map(monster => [wantedNumericId(monster?.id), monster]));
}

export function wantedBountyForTarget(targetId, bountyCodes, numericCodes) {
  const id = wantedNumericId(targetId);
  const code = (Array.isArray(bountyCodes) ? bountyCodes : [])
    .find(row => wantedNumericId(row?.wanted_id) === id)?.raw_code;
  const value = (Array.isArray(numericCodes) ? numericCodes : [])
    .find(row => row?.raw_code === code && row?.available)?.value;
  return Number.isInteger(value) ? value : 0;
}

/** Resolve hydrated data into an editor-only poster construction without mutation. */
export function resolveWantedPreviewModel({
  preview,
  formations = [],
  monsters = [],
  bountyCodes = [],
  numericCodes = [],
  targetId = 1,
  defeated = false,
  defeatedOverlay = null,
  wantedDocument = null,
} = {}) {
  if (!preview || typeof preview !== "object") return null;

  const requestedTargetId = wantedNumericId(targetId, 1);
  const formation = wantedFormation(formations, requestedTargetId);
  const resolvedFormationId = requestedTargetId;
  const activeSlots = (Array.isArray(formation?.slots) ? formation.slots : [])
    .filter((slot, index) => index === 0
      && wantedNumericId(slot?.monster_id) !== null && wantedNumericId(slot?.count, 0) > 0);
  const resolvedBounty = wantedBountyForTarget(
    resolvedFormationId,
    bountyCodes,
    numericCodes,
  );
  const monsterMap = wantedMonsterMap(monsters);
  const resolvedBossId = resolvedFormationId;
  const isDefeated = defeated === true;
  const overlayPreview = defeatedOverlay?.graphic_preview
    || defeatedOverlay?.preview || null;

  const representatives = activeSlots.map((slot, index) => {
    const monsterId = wantedNumericId(slot.monster_id, resolvedBossId);
    const monster = monsterMap.get(monsterId) || null;
    return {
      slot_index: wantedNumericId(slot.slot_index, index),
      monster_id: monsterId,
      count: wantedNumericId(slot.count, 1),
      name: monster?.name || `怪物 ${monsterId}`,
      graphic_preview: monster?.graphic_preview || null,
    };
  });
  if (!representatives.length && resolvedBossId !== null) {
    const monster = monsterMap.get(resolvedBossId) || null;
    representatives.push({
      slot_index: 0,
      monster_id: resolvedBossId,
      count: 1,
      name: monster?.name || `怪物 ${resolvedBossId}`,
      graphic_preview: monster?.graphic_preview || null,
    });
  }

  const construction = cloneJson(preview);
  const originalScript = (Array.isArray(preview.layers) ? preview.layers : [])
    .find(layer => layer?.kind === 'script' && layer.runtime_content
      && layer.runtime_record_pair && Number.isInteger(layer.runtime_value_cursor));
  if (!originalScript?.record || !Number.isInteger(originalScript.cursor))
    throw new TypeError('通缉令缺少名称与赏金文字构造');
  const providers = Object.keys(originalScript.provider_constants || {});
  if (providers.length !== 1) throw new TypeError('通缉令缺少赏金提供器绑定');
  const provider = providers[0];
  construction.layers = (Array.isArray(construction.layers) ? construction.layers : [])
    .filter(layer => !isStaticWantedMonsterLayer(layer))
    .filter(layer => !(layer?.kind === 'script' && layer.record === originalScript.record));
  construction.layers.push({
    ...cloneJson(originalScript),
    kind: "script",
    runtime_record_pair: wantedRecordId(originalScript.runtime_record_pair.split(':')[1], resolvedBossId),
    provider_constants: {[provider]: resolvedBounty},
    provider_evidence: {
      ...(originalScript?.provider_evidence || {}),
      [provider]: '当前通缉目标赏金',
    },
    runtime_content: true,
  });

  return {
    preview: construction,
    formation,
    formationId: resolvedFormationId,
    targetId: resolvedFormationId,
    bossId: resolvedBossId,
    boss: monsterMap.get(resolvedBossId) || null,
    bounty: resolvedBounty,
    representatives,
    monsterPlacement: wantedDocument?.monster_placement || null,
    defeated: isDefeated,
    defeatedEventFlag: wantedDefeatedEventFlag(resolvedFormationId, wantedDocument),
    defeatedOverlay: {
      ...(defeatedOverlay ? cloneJson(defeatedOverlay) : {}),
      graphic_preview: overlayPreview,
      visual_signature: defeatedOverlay?.visual_signature || null,
    },
    accuracy: "configuration-draft",
    accuracyNote: WANTED_PREVIEW_ACCURACY_NOTE,
  };
}
