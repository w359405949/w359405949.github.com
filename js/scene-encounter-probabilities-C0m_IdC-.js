import { storyEventReferences, esc, registerModuleComponent } from './interface-state-preview-Dlotqlmn.js';
import { globalEventFlagEntry, prepareGlobalEventFlags, globalRandomCycles, advanceGlobalRandom } from './global-random-DAuRNoyj.js';
import { db, WORLD_TIDE_OWNER, prepareHiddenTeleportDestination, hiddenTeleportFlags } from './prg-loaders-DnCSmXk9.js';

// @editor-module 按已确认的读写路径关联战斗入口与存档事件位。

const hexId = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function resolveBattleStateCatalog({review = {}, story = {}, actors = {}, zones = {}} = {}) {
  const wantedByFormation = new Map((review.formation_targets || [])
    .map(row => [row.formation_id, row.wanted_id]));
  const actorByUid = new Map((actors.records || []).map(row => [row.uid, row]));
  const entries = (story.world_event_triggers?.entries || []).map(row => ({
    id: `event:${hexId(row.scene_id)}:${hexId(row.id)}`,
    scene_id: row.scene_id, object_key: `event:${row.id}`, kind: "coordinate",
    x: row.trigger_x, y: row.trigger_y, formation_id: row.encounter_formation_id,
    victory_flag: row.event_flag, suppression_flag: row.event_flag, one_time: true,
    shadowed_by: (review.coordinate_exceptions || []).find(item => item.event_id === row.id)
      ?.shadowed_by_event_id ?? null,
  }));
  for (const battle of review.script_battles || []) {
    const users = (story.npc_catalog?.records || []).filter(actor =>
      actor[`${battle.kind}_script`]?.id === battle.script_id);
    for (const user of users) {
      const actor = actorByUid.get(user.uid);
      const contexts = user.scenes?.length ? user.scenes
        : (story.story_mode_contexts?.entries || [])
          .filter(row => row.scene_actor_entry === user.entry_id);
      for (const context of contexts) entries.push({
        ...battle, id: `${battle.kind}:${hexId(battle.script_id)}:${battle.cursor}:${user.uid}:${hexId(context.scene_id ?? context.id)}`,
        scene_id: context.scene_id ?? context.id, object_key: `actor:${user.record_id}`,
        actor_uid: user.uid, x: actor?.x ?? null, y: actor?.y ?? null,
      });
    }
  }
  for (const row of review.investigation_battles || []) entries.push({
    ...row, id: `${hexId(row.scene_id)}:${row.object_key}`, kind: "investigation",
  });
  const flagMap = review.wanted_targets || [];
  for (const zone of zones.zones || []) {
    if (!Number(zone.zone_id)) continue;
    for (const row of zone.entries || []) {
      if (row.empty || row.slot < 10) continue;
      const wanted = flagMap.find(target => target.defeat_flag === row.event_flag
        && target.wanted_id === Number(row.monster_id));
      if (!wanted) continue;
      const locations = [
        ...(zones.scene_zones?.assignments || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: item.scene_id, x: null, y: null})),
        ...(zones.world_grid?.blocks || []).filter(item => item.zone_id === zone.zone_id)
          .map(item => ({scene_id: 0, x: item.block_x, y: item.block_y})),
      ];
      for (const location of locations) entries.push({
        ...location, id: `zone:${hexId(zone.zone_id)}:${row.slot}:${hexId(location.scene_id)}:${location.x ?? ""},${location.y ?? ""}`,
        kind: "random", object_key: "", zone_id: zone.zone_id, slot: row.slot,
        ...(location.scene_id === 0 ? {block_cell_size: Number(zones.world_grid?.block_cell_size)} : {}),
        formation_id: Number(row.monster_id), wanted_id: wanted.wanted_id,
        victory_flag: wanted.defeat_flag, suppression_flag: wanted.defeat_flag, one_time: true,
      });
    }
  }
  return {
    wanted: flagMap,
    entries: [...new Map(entries.map(row => [row.id, row])).values()].map(row => ({...row,
      wanted_id: row.wanted_id ?? wantedByFormation.get(row.formation_id) ?? null})),
    formation_targets: review.formation_targets || [],
  };
}

function battleFlagSections(catalog) {
  const sections = new Map();
  for (const row of catalog.entries) {
    if (row.one_time && row.shadowed_by == null && row.suppression_flag != null)
      sections.set(row.suppression_flag, row.wanted_id == null ? "battles" : "wanted");
  }
  for (const row of catalog.wanted) {
    sections.set(row.defeat_flag, "wanted");
    sections.set(row.claim_flag, "wanted");
  }
  return sections;
}

function targetBattleState(catalog, targetId) {
  const canonical = catalog.formation_targets.find(row => row.formation_id === Number(targetId));
  const wanted = canonical ? catalog.wanted.find(row => row.wanted_id === canonical.wanted_id) : null;
  return {wanted, entries: catalog.entries.filter(row => wanted
    ? row.wanted_id === wanted.wanted_id : row.formation_id === Number(targetId))};
}

// @editor-module 存档事件字段的页面地址。


const SAVE_EVENT_SECTIONS = Object.freeze([
  ["vehicle-acquisition", "战车取得"],
  ["treasures", "调查物取得"],
  ["home-decor", "家庭装饰"],
  ["teleport", "时空隧道"],
  ["wanted", "赏金首"],
  ["battles", "一次性战斗"],
  ["global", "剧情与全局事件"],
  ["extension", "扩展状态位"],
  ["unknown", "未知用途"],
]);

// 引用图的 story-interaction-script 与 battle-result-script 声明事件位 $4C。
const FIXED_GLOBAL_FLAGS = [0x4C];
let referencedGlobalFlags = new Set(FIXED_GLOBAL_FLAGS);
let battleCatalog = resolveBattleStateCatalog();
let battleSections = new Map();
let hiddenFlags = new Set();
let acquisitionFlags = new Set();
function saveBattleCatalog() { return battleCatalog; }

async function prepareSaveEventLinks() {
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

function saveEventSection(flagId, {treasure = false} = {}) {
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

function saveEventHref(slot, flagId, {treasure = false} = {}) {
  const flag = Number(flagId);
  const section = saveEventSection(flag, {treasure});
  const anchor = `save-event-bit-${slot}-${treasure ? "treasure" : "global"}-${
    flag.toString(16).toUpperCase().padStart(2, "0")}`;
  return `?view=save${Number(slot) === 2 ? "&saveSlot=2" : ""}&saveSection=${
    treasure || ['vehicle-acquisition', 'home-decor', 'wanted'].includes(section) ? section : 'global'}#${anchor}`;
}

// @editor-module 全局事件位字段对象的只读引用显示。

function eventFlagReferenceMarkup(value, {slot = 1, attributes = '', link = true, compact = false, label = null} = {}) {
  const row = globalEventFlagEntry(value);
  if (!row) return '—';
  const identity = `<span class="record-handle" data-resource-handle="${row.handle}">${row.handle}</span>`;
  const content = label == null ? `${identity}${compact ? '' : ` · <span data-event-flag-purpose>${esc(row.label)}</span>`}`
    : `<span data-resource-handle="${row.handle}">${esc(label)}</span>`;
  const title = label == null ? compact ? row.label : null : `${row.handle} · ${row.label}`;
  const props = `data-event-flag-reference="${row.handle}"${title ? ` title="${esc(title)}"` : ''} ${attributes}`;
  return link ? `<a class="editor-inline-link" ${props} href="${esc(saveEventHref(slot, row.id))}">${content} ↗</a>`
    : `<span ${props}>${content}</span>`;
}

function eventFlagTextMarkup(text, {label = null} = {}) {
  const source = String(text || '').replace(/(?:0x|\$)([0-9A-F]{1,2})(?=\s*(?:读取|写入|修改)记录)/giu,
    (_, id) => `global-event-flag:${id.toUpperCase().padStart(2, '0')}`)
    .replace(/(?:全局事件\s*flag|全局事件位|事件位|global event flag|\bFLAG)\s*`?(?:0x|\$)([0-9A-F]{1,2})`?(?:\s*([-–])\s*`?\$([0-9A-F]{1,2})`?)?/giu,
    (_, first, separator, last) => `global-event-flag:${first.toUpperCase().padStart(2, '0')}${
      last ? `${separator}global-event-flag:${last.toUpperCase().padStart(2, '0')}` : ''}`);
  let result = '', cursor = 0;
  for (const match of source.matchAll(/global-event-flag:([0-9A-F]{2})\b/gu)) {
    result += esc(source.slice(cursor, match.index)) + eventFlagReferenceMarkup(match[0], {label});
    cursor = match.index + match[0].length;
  }
  return result + esc(source.slice(cursor));
}

registerModuleComponent('global-event-flag', 'reference', {
  prepare: async props => {await prepareGlobalEventFlags(); return props;},
  render: ({value, componentAttributes, slot, compact, label}) => eventFlagReferenceMarkup(value,
    {slot, attributes: componentAttributes, compact, label}),
});

// @editor-module 按随机状态、事件条件及编组规则投影遇敌候选。

const hex2 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function encounterCandidate(entry) {
  const value = Number(entry.monster_id);
  return {slot: Number(entry.slot), value, empty: value === 0,
    kind: Number(entry.slot) >= 10 ? "formation" : "monster",
    reference: value === 0 ? null : `${Number(entry.slot) >= 10
      ? "encounter-formation" : "monster"}:${hex2(value)}`};
}

function encounterFormationGroups(formations, id) {
  const record = formations.find(row => Number(row.id ?? row.record_id) === id);
  if (!record) throw new Error(`编队 encounter-formation:${hex2(id)} 未发布`);
  const groups = [];
  let capacity = 9;
  for (const slot of record.slots || []) {
    const count = Number(slot.count);
    if (!count || !capacity) break;
    const match = /^monster:([0-9A-F]{2})$/u.exec(slot.monster_reference ?? slot.monster_resource ?? "");
    const monsterId = match ? Number.parseInt(match[1], 16) : Number(slot.monster_id);
    if (!Number.isInteger(monsterId)) throw new Error(`编队 ${id} 的怪物引用无效`);
    const quantity = Math.min(count, capacity);
    groups.push({monsterId, count: quantity});
    capacity -= quantity;
  }
  return groups;
}

function remapSlot(rules, formations, index) {
  if (index < rules.remap_slots.length) return Number(rules.remap_slots[index]);
  if (index >= 48) throw new Error(`遇敌重映射索引 ${index} 超出已确认范围`);
  const record = formations.find(row => Number(row.id ?? row.record_id) === 0);
  const slot = record?.slots?.[Math.floor((index - 40) / 2)];
  if (!slot) throw new Error("遇敌重映射缺少编队 :00 的共用尾部");
  if ((index - 40) & 1) return Number(slot.count);
  const match = /^monster:([0-9A-F]{2})$/u.exec(slot.monster_reference ?? slot.monster_resource ?? "");
  return match ? Number.parseInt(match[1], 16) : Number(slot.monster_id ?? 0);
}

function groupQuantity(code, randomLow) {
  const minimum = code >> 4, maximum = code & 15;
  let y = maximum;
  const choices = new Array(8);
  for (let index = 7; index >= 0; index -= 1) {
    choices[index] = y;
    y = (y - 1) & 255;
    if (y < minimum) y = choices[7];
  }
  return choices[randomLow & 7];
}

function rollGroups(zone, klass, document, rules, formations, initialSlot, random) {
  const groups = [];
  let capacity = 9, slot = initialSlot;
  const selector = slot >= 4 && slot < 12 ? Number(klass.multi_group_selectors[slot - 4]) : null;
  const count = selector === null ? 1 : Number(document.shared_tables.group_counts[selector & 1]);
  const append = group => {
    // B934 先写组号，再按剩余九只容量裁剪数量。
    const quantity = Math.min(capacity, group.count);
    groups.push({monsterId: group.monsterId, count: quantity});
    capacity -= quantity;
  };
  for (let index = 0; index < count; index += 1) {
    random = advanceGlobalRandom(random.high, random.low);
    const entry = zone.entries[slot];
    if (!entry) throw new Error(`遇敌重映射槽 ${slot} 不存在`);
    const candidate = encounterCandidate(entry);
    if (!candidate.empty) {
      if (candidate.kind === "formation") {
        for (const group of encounterFormationGroups(formations, candidate.value)) append(group);
      } else append({monsterId: candidate.value,
        count: groupQuantity(Number(klass.group_size_codes[slot]), random.low)});
    }
    if (index + 1 === count || slot < 4 || slot >= 12) break;
    const rule = Number(klass.multi_group_selectors[slot - 4]);
    if (random.high <= Number(rules.remap_thresholds[rule >> 5])) break;
    slot = remapSlot(rules, formations, ((rule & 0x1e) << 1) + (random.low & 3));
  }
  return groups.filter(group => group.count > 0);
}

function encounterZoneProbabilities(document, zone, {rules, formations = [],
  profiles, eventFlagMap, eventFlags = new Set(), meter = 255, protectedSteps = false, cycleLength = null} = {}) {
  if (!Number(zone.zone_id)) return {slots: [], monsters: [], formations: [], outcomes: [], states: 0};
  const klass = document.classes[Number(zone.config) & 3];
  const weights = profiles?.find(row => row.profile_id === (Number(zone.config) & 3))?.selection_weights;
  if (weights?.length !== 14) throw new Error("遇敌候选权重字段不完整");
  const active = zone.entries.map(encounterCandidate).filter(candidate => !candidate.empty
    && !(candidate.slot >= 10 && candidate.value < 16
      && eventFlags.has(Number(eventFlagMap[candidate.value]))));
  if (!active.length) return {slots: [], monsters: [], formations: [], outcomes: [], states: 0,
    error: "全部候选已被过滤；ROM 没有空候选保护"};
  const boundaries = [];
  let total = 0;
  for (const candidate of active) {
    boundaries.push(total);
    total = (total + Number(weights[candidate.slot])) & 255;
  }
  if (!total) throw new Error("遇敌权重累计为零");
  const slotCounts = new Map(), monsterCounts = new Map(), formationCounts = new Map(), outcomes = new Map();
  let states = 0;
  const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
  const seeds = cycleLength === null ? Array.from({length: 65536}, (_, index) => index)
    : globalRandomCycles().find(cycle => cycle.length === cycleLength);
  if (!seeds) throw new Error(`随机周期 ${cycleLength} 不存在`);
  for (const seed of seeds) {
    const previousHigh = seed >> 8, previousLow = seed & 255;
    const random = advanceGlobalRandom(previousHigh, previousLow);
    if (random.high > (meter >> (protectedSteps ? 3 : 1))) continue;
    states += 1;
    const remainder = ((random.workspaceHigh << 8) | random.low) % total;
    let index = active.length - 1;
    while (index > 0 && remainder < boundaries[index]) index -= 1;
    const candidate = active[index];
    increment(slotCounts, candidate.slot);
    if (candidate.kind === "formation") increment(formationCounts, candidate.value);
    if (!rules) continue;
    const groups = rollGroups(zone, klass, document, rules, formations, candidate.slot, random);
    for (const id of new Set(groups.map(group => group.monsterId))) increment(monsterCounts, id);
    const key = JSON.stringify(groups);
    increment(outcomes, key);
  }
  const rows = (map, idName) => [...map].map(([id, count]) => ({[idName]: id,
    states: count, probability: states ? count / states : 0}));
  return {states, totalWeight: total, slots: rows(slotCounts, "slot"),
    monsters: rows(monsterCounts, "monsterId"), formations: rows(formationCounts, "formationId"),
    outcomes: [...outcomes].map(([key, count]) => ({groups: JSON.parse(key), states: count,
      probability: states ? count / states : 0}))};
}

export { SAVE_EVENT_SECTIONS, encounterCandidate, encounterFormationGroups, encounterZoneProbabilities, eventFlagReferenceMarkup, eventFlagTextMarkup, prepareSaveEventLinks, resolveBattleStateCatalog, saveBattleCatalog, saveEventHref, saveEventSection, targetBattleState };
