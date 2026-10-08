// @editor-module 存档事件字段的页面地址。

import {db} from "./project-db.js";
import {resolveBattleStateCatalog, battleFlagSections} from "./battle-state-catalog.js";
import {storyEventReferences} from "./story-event-links.js";
import {prepareHiddenTeleportDestination, hiddenTeleportFlags} from './teleport-hidden-destination.js';
import {WORLD_TIDE_OWNER} from './world-tide-owner.js';
import {globalEventFlagEntry} from './global-event-flags.js';

export const SAVE_EVENT_SECTIONS = Object.freeze([
  ["vehicle-acquisition", "战车取得"],
  ["treasures", "调查物取得"],
  ["home-decor", "家庭装饰"],
  ["teleport", "时空隧道"],
  ["wanted", "赏金首"],
  ["battles", "一次性战斗"],
  ["global", "剧情与全局事件"],
  ["unknown", "未知用途"],
]);

// 引用图的 story-interaction-script 与 battle-result-script 声明事件位 $4C。
const FIXED_GLOBAL_FLAGS = [0x4C];
let referencedGlobalFlags = new Set(FIXED_GLOBAL_FLAGS);
let battleCatalog = resolveBattleStateCatalog();
let battleSections = new Map();
let hiddenFlags = new Set();
let acquisitionFlags = new Set();
export function saveBattleCatalog() { return battleCatalog; }

export async function prepareSaveEventLinks() {
  const [story, encounters, lifecycle, actors, zones, facilities, sceneLogic, tide, investigation] = await Promise.all([
    db.getDocument("project.story", null),
    db.getResourceDocument("encounter-event-flag-map", null),
    db.getResourceDocument("field-scene-lifecycle-service", null),
    db.getDocument("scene-actor", null),
    db.getDocument("scene-encounter-zone", null),
    db.getDocument("project.facilities", null),
    db.getDocument("project.scenes.logic", null),
    db.getResourceDocument(WORLD_TIDE_OWNER, null),
    db.getResourceDocument('nearby-object-investigation-service', null),
  ]);
  battleCatalog = resolveBattleStateCatalog({review: encounters?.battle_state_review,
    story: story || {}, actors: actors || {}, zones: zones || {}});
  battleSections = battleFlagSections(battleCatalog);
  const project = {facilities};
  await prepareHiddenTeleportDestination(project);
  hiddenFlags = new Set(hiddenTeleportFlags(project).map(flag => flag.id));
  acquisitionFlags = new Set((investigation?.reward_calls || []).flatMap(call =>
    call.acquisition_condition ? [Number.parseInt(call.acquisition_condition.flag_reference.split(':').at(-1), 16)] : []));
  referencedGlobalFlags = new Set([
    ...FIXED_GLOBAL_FLAGS,
    ...(sceneLogic?.point_transitions || []).flatMap(record => record.appearance_condition?.flags || []),
    ...(tide?.persistent ? [tide.event_flag] : []),
    ...(facilities?.facilities || []).filter(row => row.id === 'computer-controller')
      .flatMap(row => (row.instances || []).flatMap(instance => [instance.switch?.event_flag_reference,
        instance.switch?.failure_flag_reference].filter(Boolean).map(reference =>
        Number.parseInt(reference.split(':').at(-1), 16)))),
    ...(story?.world_event_triggers?.entries || []).map(row => Number(row.event_flag)),
    ...(story?.browser_vm?.entry_events || []).flatMap(row => row.completion_flags || []),
    ...(story?.browser_vm?.sequences || []).flatMap(sequence =>
      storyEventReferences(sequence.id, story).map(reference => reference.flag_id)),
    ...[...(story?.npc_catalog?.records || []), ...(story?.autonomous?.entries || []),
      ...(story?.interaction?.entries || [])].flatMap(row =>
      (row.state_references || []).map(reference => Number(reference.flag_id))),
    ...(encounters?.encounter_selector_to_global_event_flag || [])
      .map(row => Number(row.global_event_flag_id)),
    ...(lifecycle?.records || []).flatMap(row => {
      const match = /^global-event-flag:([0-9A-F]{2})$/i.exec(row.global_event_flag_reference || "");
      return match ? [parseInt(match[1], 16)] : [];
    }),
  ]);
}

export function saveEventSection(flagId, {treasure = false} = {}) {
  const flag = Number(flagId);
  if (treasure) return flag === 0x51 ? "vehicle-acquisition" : flag < 0x5B ? "treasures" : "unknown";
  const purpose = globalEventFlagEntry(flag)?.label;
  if (purpose?.startsWith('已购装饰品')) return 'home-decor';
  if (/战车.*取得状态位/u.test(purpose || '')) return 'vehicle-acquisition';
  if (flag >= 8 && flag <= 15) return "vehicle-acquisition";
  if (acquisitionFlags.has(flag)) return 'treasures';
  if (flag >= 0x30 && flag <= 0x3B) return "teleport";
  if (hiddenFlags.has(flag)) return 'teleport';
  if (battleSections.has(flag)) return battleSections.get(flag);
  if (flag >= 0x60 && flag <= 0x6A) return "wanted";
  return referencedGlobalFlags.has(flag) || (purpose && purpose !== '未知用途') ? "global" : "unknown";
}

export function saveEventHref(slot, flagId, {treasure = false} = {}) {
  const flag = Number(flagId);
  const section = saveEventSection(flag, {treasure});
  const anchor = `save-event-bit-${slot}-${treasure ? "treasure" : "global"}-${
    flag.toString(16).toUpperCase().padStart(2, "0")}`;
  return `?view=save${Number(slot) === 2 ? "&saveSlot=2" : ""}&saveSection=${
    treasure || ['vehicle-acquisition', 'home-decor', 'wanted'].includes(section) ? section : 'global'}#${anchor}`;
}
