// @editor-module 随机遇敌区域的显示与编辑
import {editorLog} from "../../core/editor-log.js";
import {encounterZoneColor} from '../../modules/scene/preview.js';
import {$, esc, hex} from "../../core/dom.js";
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';

const $$ = (selector) => [...document.querySelectorAll(selector)];
import {monsterFigureCanvas, paintMonsterFigureCanvases} from "../../render/monster-figure.js";
import {bindResourceQueries} from "../../main.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {battleModeForPendingEventFlag} from "../../core/battle-mode.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {handleMarkup} from "../../ui/handle.js";
import {encounterCandidate, encounterFormationGroups, encounterZoneProbabilities} from "../../core/scene-encounter-probabilities.js";
import {
  refreshSceneDraftDirty,
} from "./original-reset.js";


//
// 遇敌区是跨场景共享的全局语义资产，因此它不随单个 scene:XX 保存。
// 首次打开会从浏览器项目的 original 物化 scene-encounter-zone working；
// 后续读取和保存都只操作 working.value.document。场景 logic 中的
// layers.encounter_zone 只是一份只读投影。

const ENCOUNTER_ZONE_RESOURCE_ID = "scene-encounter-zone";
let encounterRules = null;
let encounterFormations = [];
let encounterProfiles = [];
let encounterEventMap = [];
let encounterAlgorithm = "";
const probabilityCache = new Map();
const probabilityConditions = {meter: 255, cycleLength: null, protectedSteps: false};
const probabilityEventFlags = new Set();

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}


export async function loadEncounterZones() {
  const [runtime, formations, eventMap] = await Promise.all([
    db.getResourceDocument("encounter-trigger-runtime", null), db.getResourceDocument("encounter-formation", null),
    db.getResourceDocument("encounter-event-flag-map", null),
  ]);
  encounterRules = runtime?.views?.random_encounter_group_rules ?? null;
  encounterFormations = formations?.records || [];
  encounterProfiles = runtime?.views?.random_encounter_profile_families || [];
  encounterAlgorithm = runtime?.views?.random_encounter_selection_algorithm || "";
  encounterEventMap = (eventMap?.encounter_selector_to_global_event_flag || [])
    .map(row => row.global_event_flag_id);
  probabilityCache.clear();
  zoneMonsterCacheSource = null;
  if (state.sceneEncounter) return state.sceneEncounter;
  const resolved = await db.getDocument("scene-encounter-zone", null);
  if (!resolved) throw new Error("随机遇敌区数据未能加载");
  const document = cloneJson(resolved);
  state.sceneEncounter = document;
  state.sceneEncounterVersion = db.metadata("scene-encounter-zone")?.version ?? null;
  state.sceneOriginalEncounter = cloneJson(document);
  state.sceneEncounterDirty = false;
  return document;
}

function encounterZone(zoneId) {
  return state.sceneEncounter?.zones?.[Number(zoneId)] || null;
}

/** 当前场景的遇敌区归属；世界地图返回逐区块的网格视图。 */
function sceneEncounterBinding() {
  const document = state.sceneEncounter;
  const sceneId = Number(state.sceneEntry?.id ?? -1);
  if (!document || sceneId < 0) return null;
  if (sceneId === 0) {
    return {kind: "world-grid", blocks: document.world_grid.blocks,
      blockSize: Number(document.world_grid.block_cell_size)};
  }
  const first = Number(document.scene_zones.first_scene_id);
  const last = Number(document.scene_zones.last_scene_id);
  if (sceneId < first || sceneId > last) {
    return {kind: "implicit-zero", zoneId: 0};
  }
  return {kind: "scene", zoneId: Number(
    document.scene_zones.assignments[sceneId - first].zone_id
  ), index: sceneId - first};
}

/** 把 zone ID 映射成稳定的覆盖色；zone $00 表示不遇敌。 */
export function sceneEncounterPreview() {
  return state.sceneEditMode === 'encounters' ? {binding: sceneEncounterBinding(),
    activeZone: activeEncounterZoneId(), pickedIndex: state.sceneEncounterBlock} : null;
}

/** 世界地图上某一格所属的区块；非世界地图返回 null。 */
function encounterBlockAt(x, y) {
  const binding = sceneEncounterBinding();
  if (binding?.kind !== "world-grid") return null;
  const size = binding.blockSize;
  const grid = Number(state.sceneEncounter.world_grid.blocks_x);
  const index = Math.floor(y / size) * grid + Math.floor(x / size);
  return state.sceneEncounter.world_grid.blocks[index] || null;
}

/** 世界地图上某一格属于哪个 zone。用于点选。 */
export function encounterZoneAt(x, y) {
  const block = encounterBlockAt(x, y);
  return block ? Number(block.zone_id) : null;
}

/** 世界地图上某一格落在第几个区块。点选时用来记住"点中的是哪一块"。 */
export function encounterBlockIndexAt(x, y) {
  const binding = sceneEncounterBinding();
  if (binding?.kind !== "world-grid") return null;
  const size = binding.blockSize;
  const grid = Number(state.sceneEncounter.world_grid.blocks_x);
  const index = Math.floor(y / size) * grid + Math.floor(x / size);
  return state.sceneEncounter.world_grid.blocks[index] ? index : null;
}

/** 世界地图上点击某个 16×16 区块时改写它的 zone。 */
export function paintEncounterBlock(x, y, refresh) {
  if (state.sceneEncounterBrush === null || state.sceneEncounterBrush === undefined) return false;
  const block = encounterBlockAt(x, y);
  if (!block || Number(block.zone_id) === Number(state.sceneEncounterBrush)) return false;
  const zoneId = Number(state.sceneEncounterBrush);
  const index = Number(block.index);
  const document = state.sceneEncounter;
  block.zone_id = zoneId;
  block.zone_id_hex = hex(block.zone_id, 2);
  refreshSceneDraftDirty();
  void db.getFieldObject(ENCOUNTER_ZONE_RESOURCE_ID, "scene.encounter.world-grid")
    .then(async object => {
      const handle = `${ENCOUNTER_ZONE_RESOURCE_ID}:world:${hex(index, 2).slice(2)}`;
      const field = object.fields.find(item => item.entityHandle === handle && item.fieldName === "zone_id");
      if (!field) throw new Error(`${handle} 没有已发布字段`);
      await field.set(zoneId);
      if (state.sceneEncounter !== document) return;
      const original = state.sceneOriginalEncounter.world_grid.blocks.find(row => Number(row.index) === index);
      if (!original) throw new Error(`${handle} 本地 Original 记录不存在`);
      original.zone_id = zoneId;
      original.zone_id_hex = hex(zoneId, 2);
      refreshSceneDraftDirty();
      refresh?.();
    }).catch(error => {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      if (state.sceneEncounter !== document) return;
      const original = state.sceneOriginalEncounter.world_grid.blocks.find(row => Number(row.index) === index);
      if (original) Object.assign(block, cloneJson(original));
      refreshSceneDraftDirty();
      const status = $("#scene-save-state");
      if (status) {status.hidden = false; status.textContent = `保存失败：${error?.message || error}`;}
      refresh?.();
    });
  return true;
}

// 候选槽按怪物或编队引用连接属性页。

function monsterRecords() {
  return state.project?.game_data?.monsters?.records || [];
}

function monsterById(monsterId) {
  const id = Number(monsterId);
  return monsterRecords().find(record => Number(record.id) === id) || null;
}

function monsterResourceUid(monsterId) {
  return `monster:${hex(Number(monsterId), 2).replace("0x", "").toUpperCase()}`;
}

function monsterStatLine(monster) {
  if (!monster) return "";
  const value = field => Number(monster[field]?.value ?? monster[field] ?? 0);
  return `HP ${value("hp")} · 攻 ${value("attack")} · 防 ${value("defense")}`
    + ` · 经验 ${value("experience")} · 金 ${value("gold")}`;
}

function monsterSlotCell(entry) {
  const candidate = encounterCandidate(entry);
  if (!candidate.empty && candidate.kind === "formation") {
    const formation = encounterFormations.find(row => Number(row.id) === candidate.value);
    const groups = formation ? encounterFormationGroups(encounterFormations, candidate.value) : [];
    const label = groups.map(group => `${monsterById(group.monsterId)?.name
      || monsterResourceUid(group.monsterId)}×${group.count}`).join(" + ") || (formation ? "空编队" : "编队未发布");
    return `<td class="encounter-monster"><button type="button" class="resource-inline-link" data-resource-target="${esc(candidate.reference)}" title="${esc(candidate.reference)}">编队 $${candidate.value.toString(16).toUpperCase().padStart(2, "0")} · ${esc(label)}</button></td>`;
  }
  const monsterId = Number(entry.monster_id);
  if (entry.empty) {
    return `<td class="encounter-monster slot-empty">
      <span class="encounter-monster-detail slot-empty">不会出现</span>
    </td>`;
  }
  const monster = monsterById(monsterId);
  const uid = monsterResourceUid(monsterId);
  const thumbnail = monster
    ? monsterFigureCanvas({enemyId: monster.id, box: 48})
    : `<i class="encounter-monster-nothumb"></i>`;
  return `<td class="encounter-monster">
    <button type="button" class="encounter-monster-detail" data-resource-target="${esc(uid)}"
      title="打开怪物属性 · ${esc(uid)}">
      ${thumbnail}<span><b>${esc(monster?.name || "未登记怪物")}</b><small>${esc(monsterStatLine(monster) || uid)}</small></span>
    </button>
  </td>`;
}

function renderZoneDetail(zone) {
  if (!zone) return "";
  const klass = state.sceneEncounter.classes[Number(zone.config) & 3];
  const key = JSON.stringify([zone.zone_id, zone.config, zone.entries.map(row => row.monster_id), probabilityConditions, [...probabilityEventFlags].sort()]);
  let probabilities = probabilityCache.get(key);
  if (!probabilities) {
    try {
      probabilities = encounterZoneProbabilities(state.sceneEncounter, zone,
        {rules: encounterRules, formations: encounterFormations, profiles: encounterProfiles,
          eventFlagMap: encounterEventMap, eventFlags: probabilityEventFlags, ...probabilityConditions});
    } catch (error) {
      probabilities = {states: 0, slots: [], monsters: [], error: error.message};
    }
    probabilityCache.set(key, probabilities);
  }
  const gatedFlags = new Map();
  for (const entry of zone.entries.filter(entry => Number(entry.slot) >= 10
    && Number(entry.monster_id) > 0 && Number(entry.monster_id) < 16)) {
    const flag = Number(encounterEventMap[entry.monster_id]);
    if (!gatedFlags.has(flag)) gatedFlags.set(flag, []);
    gatedFlags.get(flag).push(Number(entry.slot));
  }
  const ordinaryMode = battleModeForPendingEventFlag(0);
  const modes = new Map([[ordinaryMode.musicCommand, ordinaryMode]]);
  for (const flag of gatedFlags.keys()) {
    const mode = battleModeForPendingEventFlag(flag);
    modes.set(mode.musicCommand, mode);
  }
  const monsters = new Set(probabilities.monsters.map(row => row.monsterId));
  for (const entry of Number(zone.zone_id) ? zone.entries : []) {
    const candidate = encounterCandidate(entry);
    if (candidate.empty) continue;
    if (candidate.kind === "monster") monsters.add(candidate.value);
    else for (const group of encounterFormationGroups(encounterFormations, candidate.value)) monsters.add(group.monsterId);
  }
  return `<div class="encounter-zone-detail">
    ${handleMarkup(`scene-encounter-zone:zone:${hex(Number(zone.zone_id), 2).slice(2)}`)}
    <div class="encounter-zone-config" data-encounter-field-object="${Number(zone.zone_id)}">
      <label>类别 <span data-encounter-config-choice="class"></span></label>
      <label>伏击阈值 <span data-encounter-config-choice="ambush"></span></label>
      <label>计量初值 <span data-encounter-config-choice="meter"></span></label>
      <label>保留位 <span data-encounter-config-choice="reserved"></span></label>
      <span data-encounter-zone-reset></span>
    </div>
    <p class="encounter-probability-basis">修改类别 ${Number(zone.config) & 3} 权重会作用于该类别全部遇敌区；${esc(encounterAlgorithm)}</p>
    <p class="encounter-probability-basis">${[...modes.values()].map(mode => `${esc(mode.label)} · ${esc(audioCommandLabel(mode.musicCommand))}`).join("；")}</p>
    <div class="encounter-probability-conditions">
      <label>步数计量 <input type="number" min="0" max="255" data-encounter-probability="meter" value="${probabilityConditions.meter}"></label>
      <label>随机状态 <select data-encounter-probability="cycleLength"><option value="all"${probabilityConditions.cycleLength === null ? " selected" : ""}>全部 65536 状态等权</option>${[53,132,353].map(value => `<option value="${value}"${value === probabilityConditions.cycleLength ? " selected" : ""}>周期 ${value} 相位等权</option>`).join("")}</select></label>
      <label><input type="checkbox" data-encounter-probability="protectedSteps"${probabilityConditions.protectedSteps ? " checked" : ""}> 保护步数</label>
      ${[...gatedFlags].map(([flag, slots]) => `<label><input type="checkbox" data-encounter-event-flag="${flag}"${probabilityEventFlags.has(flag) ? " checked" : ""}> ${eventFlagReferenceMarkup(flag)}：跳过槽 ${slots.join("、")}</label>`).join("")}
    </div>
    <table class="encounter-entry-table">
      <thead><tr><th>槽</th><th>怪物／编队</th><th>权重</th><th>抽槽率</th></tr></thead>
      <tbody>${zone.entries.map(entry => {
        const slot = Number(entry.slot);
        const share = (probabilities.slots.find(row => row.slot === slot)?.probability || 0) * 100;
        const gated = slot >= 10 && Number(entry.monster_id) > 0 && Number(entry.monster_id) < 16;
        const flag = gated ? Number(encounterEventMap[entry.monster_id]) : null;
        const mode = battleModeForPendingEventFlag(flag || 0);
        const selector = slot >= 4 && slot < 12 ? Number(klass.multi_group_selectors[slot - 4]) : null;
        const sizeCode = Number(klass.group_size_codes[slot]);
        const groupLabel = slot >= 10 && Number(entry.monster_id) ? encounterFormationGroups(encounterFormations, Number(entry.monster_id))
          .map(group => `${monsterById(group.monsterId)?.name || monsterResourceUid(group.monsterId)}×${group.count}`).join(" + ")
          : `${sizeCode >> 4}–${sizeCode & 15} 只`;
        return `<tr class="${Number(entry.monster_id) === 0 ? "slot-empty" : ""}">
          <td>${slot}</td>
          <td class="encounter-monster"><span data-encounter-entry-choice="${slot}"></span>${Number(entry.monster_id)
            ? slot >= 10 ? `<button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${hex(Number(entry.monster_id), 2).slice(2)}" title="编队">↗</button>`
              : `<button class="editor-inline-link" type="button" data-resource-target="${esc(monsterResourceUid(entry.monster_id))}" title="怪物">↗</button>` : ""}</td>
          <td><span data-encounter-weight="${slot}"></span></td>
          <td>${share.toFixed(2)}%</td>
        </tr>${Number(entry.monster_id) ? `<tr class="encounter-entry-facts"><td colspan="4" title="${selector === null ? "" : `后续随机高字节大于 ${encounterRules?.remap_thresholds[selector >> 5]} 时，以重映射组 ${(selector & 30) >> 1} 和随机低两位选槽`}">${esc(groupLabel)}${selector === null ? " · 单组" : ` · 最多 ${state.sceneEncounter.shared_tables.group_counts[selector & 1]} 组 · 规则 ${hex(selector, 2)}`}${mode.musicCommand !== ordinaryMode.musicCommand ? ` · ${esc(mode.label)}` : ""}</td></tr>` : ""}`;
      }).join("")}</tbody>
    </table>
    <p class="encounter-probability-basis">活动权重 ${probabilities.totalWeight || 0} · 触发状态 ${probabilities.states}${probabilities.error ? ` · ${esc(probabilities.error)}` : ""}</p>
    ${encounterRules ? `<table class="encounter-entry-table encounter-monster-probabilities"><thead><tr><th>实际怪物</th><th>每场出现率</th></tr></thead><tbody>${[...monsters].sort((a, b) => a - b).map(id => `<tr data-encounter-monster="${id}">${monsterSlotCell({slot: 0, monster_id: id, empty: false})}<td>${((probabilities.monsters.find(row => row.monsterId === id)?.probability || 0) * 100).toFixed(2)}%</td></tr>`).join("")}</tbody></table>` : ""}
    ${physicalLocationMarkup({rows: [
      {label: "配置", address: zone.config_source},
      {label: "怪物槽", address: zone.entries_source},
    ].filter(row => row.address)})}
  </div>`;
}

// 遇敌区反向索引按原始怪物槽与编队内容投影，字段保存时失效。
let zoneMonsterCache = null;
let zoneMonsterCacheSource = null;

export function zonesByMonster() {
  const document = state.sceneEncounter;
  if (!document) return new Map();
  if (zoneMonsterCache && zoneMonsterCacheSource === document) return zoneMonsterCache;
  const index = new Map();
  for (const zone of document.zones || []) {
    const zoneId = Number(zone.zone_id);
    if (!zoneId) continue;
    for (const entry of zone.entries || []) {
      if (entry.empty) continue;
      const candidate = encounterCandidate(entry);
      const ids = candidate.kind === "monster" ? [candidate.value]
        : encounterFormations.some(row => Number(row.id) === candidate.value)
          ? encounterFormationGroups(encounterFormations, candidate.value).map(group => group.monsterId) : [];
      for (const id of ids) {
        if (!index.has(id)) index.set(id, []);
        const zones = index.get(id);
        if (!zones.some(item => item.zoneId === zoneId)) zones.push({zoneId});
      }
    }
  }
  zoneMonsterCache = index;
  zoneMonsterCacheSource = document;
  return index;
}

/** 当前遇敌区模式下正在查看/编辑的 zone；世界地图看 inspect，其它场景看归属。 */
function activeEncounterZoneId() {
  const binding = sceneEncounterBinding();
  if (binding?.kind === "world-grid") {
    const used = binding.blocks.map(block => Number(block.zone_id));
    return Number(state.sceneEncounterInspect ?? used.find(Boolean) ?? 0);
  }
  return binding?.kind === "scene" ? Number(binding.zoneId) : null;
}

/**
 * 遇敌区模式的侧边栏：94 个 zone 全列出来，标出本场景/本地图用到的那些。
 * 世界地图上它同时充当画笔选择器——选中即成为画笔，与画布直接对应。
 */
export function renderEncounterZoneSidebar() {
  if (!state.sceneEncounter) return `<div class="encounter-zone-sidebar"></div>`;
  const binding = sceneEncounterBinding();
  const zones = state.sceneEncounter.zones || [];
  const active = activeEncounterZoneId();
  const worldGrid = binding?.kind === "world-grid";
  const inUse = new Set(
    worldGrid
      ? binding.blocks.map(block => Number(block.zone_id))
      : binding?.kind === "scene" ? [Number(binding.zoneId)] : []
  );
  const brush = state.sceneEncounterBrush;
  return `<div class="encounter-zone-sidebar">
    <div class="encounter-zone-sidebar-head">
      <span>遇敌区域</span><b>${zones.length}</b>
    </div>
    ${worldGrid ? `
    <label class="check"><input type="checkbox" data-encounter-paint ${
      brush === null || brush === undefined ? "" : "checked"
    }> 启用画笔（关闭则点击为选中）</label>` : ""}
    <div class="encounter-zone-list">${zones.map(zone => {
      const id = Number(zone.zone_id);
      const monsters = [...zonesByMonster()].filter(([, rows]) => rows.some(row => row.zoneId === id)).length;
      return `<div class="encounter-zone-row-wrapper">
        <div role="button" tabindex="0" class="encounter-zone-row ${id === active ? "active" : ""} ${
          inUse.has(id) ? "in-use" : ""
        }" data-encounter-zone="${id}">
          <i style="background:rgb(${encounterZoneColor(id).join(",")})"></i>
          <span>${handleMarkup(`scene-encounter-zone:zone:${hex(id, 2).slice(2)}`, {inline: true})}<small>${
            id === 0 ? "不遇敌" : `${monsters} 种怪物`
          }</small></span>
        </div>
      </div>`;
    }).join("")}</div>
  </div>`;
}

export function renderEncounterZonePanel() {
  if (!state.sceneEncounter) return "";
  const binding = sceneEncounterBinding();
  if (!binding) return "";
  if (binding.kind === "implicit-zero") return "";
  if (binding.kind === "world-grid") {
    const used = [...new Set(binding.blocks.map(block => Number(block.zone_id)))].sort((a, b) => a - b);
    const active = activeEncounterZoneId();
    return `<section class="encounter-zone-panel">
      <header><h3>遇敌区域</h3><b>${used.length} 个区域 · ${binding.blocks.length} 个区块</b></header>
      ${state.sceneEncounterBlock === null ? ``
        : `<div data-encounter-side-field-object="world:${Number(state.sceneEncounterBlock)}"></div>`}
      ${renderZoneDetail(encounterZone(active))}
    </section>`;
  }
  const zone = encounterZone(binding.zoneId);
  return `<section class="encounter-zone-panel">
    <header><h3>遇敌区域</h3></header>
    <div data-encounter-side-field-object="scene:${Number(state.sceneEntry.id)}"></div>
    ${renderZoneDetail(zone)}
  </section>`;
}

async function mountEncounterSideFields(refresh) {
  const host = $("[data-encounter-side-field-object]");
  if (!host) return;
  const [kind, idText] = host.dataset.encounterSideFieldObject.split(":");
  const id = Number(idText);
  const handle = `${ENCOUNTER_ZONE_RESOURCE_ID}:${kind}:${hex(id, 2).slice(2)}`;
  const objectId = kind === "scene" ? "scene.encounter.scene-table" : "scene.encounter.world-grid";
  try {
    const object = await db.getFieldObject(ENCOUNTER_ZONE_RESOURCE_ID, objectId);
    if (!host.isConnected) return;
    if (!object.fields.some(field => field.entityHandle === handle))
      throw new Error(`${handle} 没有已发布字段`);
    host.addEventListener("field-object-saved", event => {
      if (!host.isConnected) return;
      const changed = Array.isArray(event.detail.fields)
        ? event.detail.fields : [event.detail.fields];
      for (const field of changed) {
        if (field.entityHandle !== handle || field.fieldName !== "zone_id") continue;
        const path = kind === "scene" ? ["scene_zones", "assignments"] : ["world_grid", "blocks"];
        const identity = kind === "scene" ? "scene_id" : "index";
        for (const document of [state.sceneEncounter, state.sceneOriginalEncounter]) {
          const record = path.reduce((node, key) => node?.[key], document)
            ?.find(row => Number(row[identity]) === id);
          if (!record) throw new Error(`${handle} 本地记录不存在`);
          record.zone_id = Number(field.value);
          record.zone_id_hex = hex(field.value, 2);
        }
      }
      refreshSceneDraftDirty();
      refresh();
    });
    await object.mount(host, {rowHandles: [handle]});
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

async function mountEncounterZoneFields(refresh) {
  const anchor = $("[data-encounter-field-object]");
  if (!anchor) return;
  const host = anchor.closest(".encounter-zone-detail");
  const zoneId = Number(anchor.dataset.encounterFieldObject);
  const objectId = `${ENCOUNTER_ZONE_RESOURCE_ID}:zone:${zoneId.toString(16).toUpperCase().padStart(2, "0")}`;
  try {
    const object = await db.getFieldObject(ENCOUNTER_ZONE_RESOURCE_ID, objectId);
    if (!host.isConnected) return;
    host.addEventListener("field-object-saved", async () => {
      if (!host.isConnected || !state.sceneEncounter?.zones?.[zoneId]) return;
      await loadEncounterZones();
      if (!host.isConnected) return;
      const zone = cloneJson(state.sceneEncounter.zones[zoneId]);
      for (const field of object.fields) {
        if (field.fieldName === "config") zone.config = Number(field.value);
        else if (field.fieldName.startsWith("entry.")) {
          const slot = Number(field.fieldName.slice(6));
          const value = Number(field.value);
          zone.entries[slot].monster_id = value;
          zone.entries[slot].monster_id_hex = hex(value, 2);
          zone.entries[slot].empty = value === 0;
          const gated = slot >= 10 && value > 0 && value < 16;
          zone.entries[slot].event_flag_gated = gated;
          zone.entries[slot].event_flag_hex = gated
            ? hex(Number(encounterEventMap[value]), 2) : null;
        }
      }
      applyConfigBits(zone);
      zone.active_entry_count = zone.entries.filter(entry => !entry.empty).length;
      zone.selection_weight_total = zone.entries.reduce((total, entry) => total
        + (entry.empty ? 0 : Number(encounterProfiles[zone.class_id].selection_weights[entry.slot])), 0);
      state.sceneEncounter.zones[zoneId] = zone;
      zoneMonsterCacheSource = null;
      state.sceneOriginalEncounter.zones[zoneId] = cloneJson(zone);
      refreshSceneDraftDirty();
      refresh();
    });
    await object.mount(host, {encounterZoneDetail: true, sharedTables: state.sceneEncounter.shared_tables});
    if (!host.isConnected) return;
    const weights = await db.getFieldObject("encounter-trigger-runtime",
      `encounter-trigger-runtime.selection-weights.${hex(Number(object.fields.find(field =>
        field.fieldName === "config").value) & 3, 2).slice(2)}`);
    if (host.isConnected) await weights.mount(host, {encounterWeightSlots: true});
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

export function bindEncounterZonePanel(
  refresh,
) {
  for (const input of $$("[data-encounter-probability]")) input.addEventListener("change", () => {
    const key = input.dataset.encounterProbability;
    const value = input.type === "checkbox" ? input.checked : input.value === "all" ? null : Number(input.value);
    if (key === "meter" && (!Number.isInteger(value) || value < 0 || value > 255)) return;
    probabilityConditions[key] = value;
    refresh();
  });
  for (const input of $$("[data-encounter-event-flag]")) input.addEventListener("change", () => {
    const flag = Number(input.dataset.encounterEventFlag);
    if (input.checked) probabilityEventFlags.add(flag);
    else probabilityEventFlags.delete(flag);
    refresh();
  });
  // 槽位里跳"怪物属性"的按钮是面板重绘出来的，每次重绘都要重新接上导航。
  bindResourceQueries($("#scene-encounter-panel") || document);
  // 侧栏 zone 列表：选中即查看；画笔开着时选中的同时就是画笔颜色。
  for (const row of $$("[data-encounter-zone]")) {
    const select = () => {
      const id = Number(row.dataset.encounterZone);
      state.sceneEncounterInspect = id;
      const painting = state.sceneEncounterBrush !== null
        && state.sceneEncounterBrush !== undefined;
      if (painting) state.sceneEncounterBrush = id;
      refresh();
    };
    row.addEventListener("click", event => {
      if (event.target.closest?.(".record-handle") && String(document.getSelection())) return;
      select();
    });
    row.addEventListener("keydown", event => {
      if (event.target !== row || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      select();
    });
  }
  const paint = $("[data-encounter-paint]");
  if (paint) paint.addEventListener("change", () => {
    state.sceneEncounterBrush = paint.checked ? activeEncounterZoneId() : null;
    refresh();
  });
  void mountEncounterZoneFields(refresh);
  void mountEncounterSideFields(refresh);
  void paintMonsterFigureCanvases($("#scene-encounter-panel") || document);
}

/** 本地重算配置字节的派生字段，保存后由 Python 端再权威刷新一次。 */
function applyConfigBits(zone) {
  const value = Number(zone.config);
  const shared = state.sceneEncounter.shared_tables;
  zone.config_hex = hex(value, 2);
  zone.class_id = value & 3;
  zone.ambush_threshold_index = (value >> 2) & 3;
  zone.ambush_threshold = shared.ambush_thresholds[zone.ambush_threshold_index];
  zone.meter_initial_index = (value >> 4) & 3;
  zone.meter_initial_value = shared.meter_initial_values[zone.meter_initial_index];
  zone.config_reserved_bits = (value >> 6) & 3;
}
