// @editor-module 按随机状态、事件条件及编组规则投影遇敌候选。
import {advanceGlobalRandom, globalRandomCycles} from "./global-random.js";

const hex2 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

export function encounterCandidate(entry) {
  const value = Number(entry.monster_id);
  return {slot: Number(entry.slot), value, empty: value === 0,
    kind: Number(entry.slot) >= 10 ? "formation" : "monster",
    reference: value === 0 ? null : `${Number(entry.slot) >= 10
      ? "encounter-formation" : "monster"}:${hex2(value)}`};
}

export function encounterFormationGroups(formations, id) {
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

export function encounterZoneProbabilities(document, zone, {rules, formations = [],
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
