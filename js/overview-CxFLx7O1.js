import { applySceneTownNames, applyTeleportDestinationNames, applyFacilityConfigurationProjection, prepareHiddenTeleportDestination, $, esc, tableValueStack, renderModuleComponent, resourceForwardReferenceCell } from './element-tree-DsgOBeTK.js';
import { state } from './emulator-DynsZsth.js';
import { db, prepareAttackChrEntryContext, TEXT_RECORDS_RESOURCE_ID, sharedJsonValue, UI_FACILITY_PARAMETER_RESOURCE_IDS, applyUiFacilityParameterProjection, mutableJsonProjection, monsterFormationFootprints, characterMapCandidateSourcesAvailable, recomputeCharacterMapCandidates, createTextRecordEncoding, createTextReferenceIndex, applyCurrentTextReferencesToProject, applyTextCatalogToStoryProject, DATA_SCHEMAS, hasFieldDocumentView, isProjectFieldContainerGetter, hex } from './battle-result-script-runtime-B_EClFew.js';
import { loadResourceRangeAssociationManifest, loadResourceRangeAssociationShard, storyEditableView, STORY_PAGE_VIEW_IDS } from './package-schema-paths-gCIepLXx.js';
import { cloneValidatedJson } from './visual-metasprites-DJP54-bV.js';
import { SECTIONS_BY_VIEW, RESOURCE_DOMAINS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW, DATA_ASSETS_BY_VIEW, ALL_RESOURCE_INDEX_DOMAINS } from './page-package-inputs-DcoC8ZQj.js';

// @editor-module 从字节地图发布的资源关联范围构成字段对象视图。

const catalogsByDatabase = new WeakMap();

function associatedRange(source) {
  const space = String(source?.space || "");
  const start = Number(source?.offset);
  const length = Number(source?.length);
  const end = start + length;
  if (!["prg", "chr", "sram"].includes(space) || !Number.isInteger(start)
      || start < 0 || !Number.isInteger(length) || length < 1
      || !Number.isSafeInteger(end)) {
    throw new Error(`资源关联范围无效：${space}:${start}+${length}`);
  }
  return Object.freeze({...source, space, offset: start, length: end - start});
}

async function createResourceRangeFieldViews(manifest, shards) {
  const sourceByUid = new Map();
  for (const shard of Object.values(shards)) {
    for (const [uid, ranges] of Object.entries(shard.by_uid)) sourceByUid.set(uid, ranges);
  }
  const byUid = new Map([...sourceByUid].map(([uid, ranges]) => [uid,
    Array.isArray(ranges) ? Object.freeze(ranges.map(range =>
      associatedRange(range))) : null]));
  const loadedShards = Object.freeze(Object.keys(shards).sort());
  return Object.freeze({
    has: uid => byUid.has(uid),
    ranges: uid => byUid.get(uid),
    loadedShards,
    expectedShard(uid) {
      const prefix = String(uid || "").split(":", 1)[0];
      return manifest.uid_prefix_shards?.[prefix] || null;
    },
  });
}

async function loadResourceRangeFieldViews(database, shards,
  {all = false, uids = [], domainForUid = () => null} = {}) {
  let manifest;
  try {manifest = await loadResourceRangeAssociationManifest(database);}
  catch {return {catalog: null, loaded: [], failures: ["project.resource-byte-ranges"]};}
  const requested = new Set(all ? Object.keys(manifest.shards) : shards);
  for (const uid of uids) {
    const prefix = String(uid || "").split(":", 1)[0];
    const shard = domainForUid(uid) || manifest.uid_prefix_shards?.[prefix];
    if (shard) requested.add(shard);
  }
  const names = [...requested].filter(name => Object.hasOwn(manifest.shards, name)).sort();
  const values = await Promise.all(names.map(name =>
    loadResourceRangeAssociationShard(database, manifest, name).catch(() => null)));
  let catalogs = catalogsByDatabase.get(database);
  if (!catalogs) catalogsByDatabase.set(database, catalogs = new Map());
  const key = names.join("\u0000");
  const cached = catalogs.get(key);
  if (cached?.manifest === manifest && values.every((value, index) => value === cached.values[index])) {
    return cached.result;
  }
  const documents = {};
  const failures = [];
  for (let index = 0; index < names.length; index += 1) {
    if (values[index]) documents[names[index]] = values[index];
    else failures.push(`resource-byte-ranges.${names[index]}`);
  }
  const pending = createResourceRangeFieldViews(manifest, documents).then(catalog =>
    ({catalog, loaded: Object.keys(documents).sort(), failures}));
  const entry = {manifest, values, result: pending};
  catalogs.set(key, entry);
  try {return await pending;}
  catch (error) {
    if (catalogs.get(key) === entry) catalogs.delete(key);
    throw error;
  }
}

// @editor-module 从发布文档准备人物与载具槽位形状，提供装备掩码草稿。

// Published slot declarations never come from a resolved Working document.
// Scope the prepared documents to the project object, just like view-data.
const documents = new WeakMap();
const paths = {
  "vehicle-preset": "game/data/vehicles.json",
  "character-initial-record": "game/data/characters.json",
};

async function prepareEquipmentSlotShape(schema, project) {
  if (!Object.hasOwn(paths, schema)) return;
  const value = await db.getPackageDocument(paths[schema]);
  if (!value) throw new Error(`${schema} 缺少发布槽位结构`);
  let prepared = documents.get(project);
  if (!prepared) documents.set(project, prepared = new Map());
  prepared.set(schema, value);
}

function vehicleSlotShape(project, presetId) {
  const preset = documents.get(project)?.get("vehicle-preset")?.presets
    .find(entry => Number(entry.preset_id) === Number(presetId));
  if (!Array.isArray(preset?.equipped_mask?.slots) ||
      !Array.isArray(preset?.mount_mask?.slots)) {
    throw new Error(`战车 ${presetId} 缺少发布槽位结构`);
  }
  return preset;
}

function characterSlotShape(project) {
  const slots = documents.get(project)?.get("character-initial-record")?.equipment_slot_flags?.slots;
  if (!Array.isArray(slots)) throw new Error("人物缺少发布槽位结构");
  return slots;
}

// Missing values remain missing; neither opening nor editing another field
// may manufacture a mask. A whole-record Original reset can restore it.
function draftEquipmentMask(value) {
  return value === undefined || value === null ? null : Number(value);
}

function vehicleMountableSlots(item) {
  return Array.isArray(item?.mountable_slots) ? item.mountable_slots : [];
}

function vehicleAssignedSlot(project, draft, column, item) {
  const candidates = vehicleMountableSlots(item);
  const selected = draft.slot_assignments?.[column];
  if (selected !== null && selected !== undefined) return candidates.includes(selected) ? selected : null;
  const initial = vehicleSlotShape(project, draft.preset_id).loadout[column]?.slot_id;
  return candidates.includes(initial) ? initial : null;
}

// @editor-module 浏览器预览声音偏好。
const STORAGE_KEY = "mmeditor.preview-sound";
const listeners = new Set();
let storageFailed = false;

function previewSoundEnabled() {
  if (storageFailed) return false;
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    storageFailed = true;
    return false;
  }
}

function setPreviewSoundEnabled(enabled) {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, String(Boolean(enabled)));
    storageFailed = false;
  } catch {
    storageFailed = true;
    enabled = false;
  }
  enabled = Boolean(enabled) && previewSoundEnabled();
  for (const listener of listeners) listener(enabled);
  return enabled;
}

function subscribePreviewSound(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// @editor-module 从当前 UI 布局单元的交集推导公共窗口组件。
// Public windows derived from the current UI layout model. No published cache.
// The set algorithm treats each layout cell as an opaque identity; only the
// layout adapter reads/writes the existing logical-cell representation.

const MIN_SHARED_CELLS = 8;
const MIN_MEMBER_RECORDS = 2;
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const intersection = (left, right) => new Set([...left].filter(value => right.has(value)));
const groupKey = members => JSON.stringify([...members].sort(compare));

function closedRecordGroups(records) {
  const owners = new Map();
  for (const [id, cells] of records) {
    for (const cell of cells) {
      if (!owners.has(cell)) owners.set(cell, new Set());
      owners.get(cell).add(id);
    }
  }
  const seeds = new Map();
  for (const members of owners.values()) {
    if (members.size >= MIN_MEMBER_RECORDS) seeds.set(groupKey(members), members);
  }
  const closed = new Map(seeds);
  let frontier = [...seeds.values()];
  while (frontier.length) {
    const fresh = [];
    for (const left of frontier) {
      for (const right of seeds.values()) {
        const meet = intersection(left, right);
        if (meet.size < MIN_MEMBER_RECORDS) continue;
        const key = groupKey(meet);
        if (closed.has(key)) continue;
        closed.set(key, meet);
        fresh.push(meet);
      }
    }
    frontier = fresh;
  }
  // Equal scores use the ordered member identities, independent of insertion
  // order or the host's set iteration. Component IDs follow this stable order.
  return [...closed].sort(([left], [right]) => compare(left, right)).map(([, group]) => group);
}

function factorComponents(records) {
  const remaining = new Map([...records].map(([id, cells]) => [id, new Set(cells)]));
  const components = [];
  while (true) {
    let best = null;
    for (const group of closedRecordGroups(remaining)) {
      const members = [...group].sort(compare);
      let shared = new Set(remaining.get(members[0]));
      for (const member of members.slice(1)) shared = intersection(shared, remaining.get(member));
      if (shared.size < MIN_SHARED_CELLS) continue;
      const saved = shared.size * (members.length - 1);
      if (!best || saved > best.saved_cells) best = {members, cells: shared, saved_cells: saved};
    }
    if (!best) return components;
    components.push(best);
    for (const member of best.members) {
      for (const cell of best.cells) remaining.get(member).delete(cell);
    }
  }
}

function layoutCells(layout, values) {
  const cells = new Set();
  for (const pair of layout.render?.logical_tile_writes || []) {
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !pair.every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error(`UI layout ${layout.id}: invalid logical cell`);
    }
    const key = JSON.stringify(pair);
    values.set(key, pair.slice());
    cells.add(key);
  }
  return cells;
}

/** Build the complete component document from the published layout semantics. */
function buildUiComponents(construction) {
  const layouts = new Map((construction?.static_assets?.layouts || []).map(layout => [String(layout.id), layout]));
  if (!layouts.size) throw new Error("UI components: no layout records");
  const widths = new Set([...layouts.values()].map(layout => layout.render?.logical_width_tiles || 0).filter(Boolean));
  if (widths.size !== 1) throw new Error("UI components: inconsistent logical layout widths");
  const [width] = widths;
  if (!Number.isSafeInteger(width) || width <= 0) throw new Error("UI components: invalid logical layout width");
  const values = new Map();
  const records = new Map();
  for (const [id, layout] of layouts) {
    const cells = layoutCells(layout, values);
    if (cells.size) records.set(id, cells);
  }
  const assigned = new Map([...records.keys()].map(id => [id, new Set()]));
  const components = factorComponents(records).map((item, index) => {
    for (const member of item.members) {
      for (const cell of item.cells) assigned.get(member).add(cell);
    }
    const writes = [...item.cells].map(cell => values.get(cell)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const rows = writes.map(([position]) => Math.floor(position / width));
    const columns = writes.map(([position]) => position % width);
    return {
      id: `ui-component:${String(index + 1).padStart(2, "0")}`,
      kind: "shared-window",
      members: item.members,
      member_count: item.members.length,
      shared_cells: item.cells.size,
      saved_cells: item.saved_cells,
      bounds: {first_row: Math.min(...rows), last_row: Math.max(...rows),
        first_column: Math.min(...columns), last_column: Math.max(...columns)},
      logical_tile_writes: writes,
    };
  });
  const membership = [...records].sort(([a], [b]) => compare(a, b)).map(([id, cells]) => ({
    record: id,
    total_cells: cells.size,
    shared_cells: assigned.get(id).size,
    private_cells: cells.size - assigned.get(id).size,
    components: components.filter(component => component.members.includes(id)).map(component => component.id),
  }));
  const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
  return {
    schema: "metalmaxcn.ui-components",
    source_rom: construction.source_rom ?? null,
    source_sha256: construction.source_sha256 ?? null,
    method: {
      input: "static_assets.layouts[].render.logical_tile_writes",
      unit: "(logical_position, tile)",
      grouping: "closed concepts over record membership",
      selection: "greedy by shared_cells * (member_count - 1), deducted after each pick",
      min_shared_cells: MIN_SHARED_CELLS,
      min_member_records: MIN_MEMBER_RECORDS,
      note: "游戏无组件概念，公共窗口由提取结果的结构分析导出，而非 ROM 里的显式引用",
    },
    summary: {
      layout_records: records.size,
      components: components.length,
      total_cells: sum(membership, "total_cells"),
      shared_cells: sum(membership, "shared_cells"),
      private_cells: sum(membership, "private_cells"),
      saved_cells: sum(components, "saved_cells"),
      records_with_components: membership.filter(record => record.components.length).length,
    },
    components,
    records: membership,
  };
}

// @editor-module 经 DB 准备导航正文并投影到旧视图所需的 project 形状。
//
// init 只拿首页元数据。每次 render 在分派当前视图之前调用 prepareViewData，正文
// 统一经 project-db 读取、缓存并挂到旧视图仍在消费的 project 形状上。这个挂载层
// 是迁移桥，不拥有数据：package / repository 仍是唯一来源，缓存生命周期由 db 管。


const DATA_PROJECTION_KEYS = Object.freeze({
  "character-initial-record": "characters",
  "fixed-text-slot": "text_slots",
  monster: "monsters",
  "battle-test-point": "battle_test",
  item: "items",
  "vehicle-preset": "vehicles",
  "shell-record": "shells",
  "wanted-record": "wanted",
});

const MONSTER_RECORD_DATA_ASSETS = Object.freeze([
  "enemy-action", "enemy-action-pattern", "attack-visual", "battle-result-script",
]);

// 这些页面同步渲染当前字形映射后的文字，不能再借由无关 data 表恰好首次加载
// 来触发投影。声明为页面依赖后，冷启动直达与任意访问顺序得到相同结果。
const VIEWS_WITH_CURRENT_TEXT = new Set([
  "scenes", "actors", "story", ...STORY_PAGE_VIEW_IDS, "text", "audio", "attack-effects",
  "characters", "vehicles", "monsters", "equipment", "items", "save",
  "wanted", "wanted-ui", "shops", "jukebox", "vending", "frograce", "teleport",
  "computercontroller", "interfaceui",
  'monster-formations',
]);

const VIEWS_WITH_RESOURCE_RANGES = new Set([
  "scenes", "actors", "story", ...STORY_PAGE_VIEW_IDS, "attack-effects", "battle-test", "battleactors",
  "text", "wanted", "wanted-ui",
  "characters", "vehicles", "monsters", "equipment", "items",
  "shells", "audio", "shops", "jukebox",
  'monster-formations',
  "vending", "frograce", "teleport", "computercontroller", "interfaceui",
]);

const BYTE_MAP_GLOBAL_RANGE_VIEWS = new Set();

// Byte-map-native rows have no resource-index domain.  Only pages which
// render those stable UIDs declare the extra shard explicitly.
const RESOURCE_RANGE_EXTRA_SHARDS_BY_VIEW = Object.freeze({
  characters: Object.freeze(["native-save"]),
});

// 索引领域回答“引用指向谁”，地址分片回答“本页展示谁的物理位置”，两者不是
// 同一个闭包。怪物页会显示 battle/visual 引用，但物理地址只展示怪物自身与遇敌区。
const failuresByView = new Map();
const dataDocumentSources = new Map();
const projectionDocumentSources = new Map();
const resourceIndexSources = new Map();
const resourceIndexDirectTargets = new Map();
let lastTextCatalog = null;
let lastCharacterMap = null;
let lastTextRecords = null;
let lastTextFonts = null;
let sceneActorSource = null;
let facilityConfigurationSource = null;
let audioInstructionSource = null;
const storyOperandSources = new WeakMap();

const CHILD_PROJECTIONS_BY_PARENT = Object.freeze({
  "project.scenes": Object.freeze(["project.scenes.logic"]),
  "project.visuals": Object.freeze([
    "weapon-attack-parameter", "monster-visual-layout",
  ]),
  "project.ui": Object.freeze([
    "project.ui.editor", "project.ui.interfaces", "project.ui.dispatch",
    "project.ui.templates",
  ]),
  "project.audio": Object.freeze(["audio-sequence"]),
});

// The legacy project projection adds current text labels to records. Give it
// mutable containers while keeping every field leaf as the DB's live getter.
function copyFieldDocumentView(value) {
  if (!value || typeof value !== "object") return value;
  const result = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (Array.isArray(value) && key === "length") continue;
    const container = isProjectFieldContainerGetter(descriptor.get);
    if (container || descriptor.value && typeof descriptor.value === 'object') {
      const replace = value => Object.defineProperty(result, key, {
        value, enumerable: descriptor.enumerable, writable: true, configurable: true,
      });
      Object.defineProperty(result, key, {enumerable: descriptor.enumerable, configurable: true,
        get() {
          const copy = copyFieldDocumentView(container ? descriptor.get() : descriptor.value);
          replace(copy);
          return copy;
        }, set: replace});
    } else Object.defineProperty(result, key, Object.hasOwn(descriptor, 'value')
      ? {...descriptor, writable: true, configurable: true} : {...descriptor, configurable: true});
  }
  return result;
}

async function storyFieldDraft(property, resourceId, source) {
  if (state.project[property] && projectionDocumentSources.get(property) === source)
    return state.project[property];
  const draft = await db.getResourceDraft(resourceId);
  projectionDocumentSources.set(property, source);
  return draft;
}

function rebuildBattleTestProjection(document_) {
  if (!Array.isArray(document_?.formations)) {
    throw new Error("battle-test-point formations projection is missing");
  }
  const selected = document_.formations.find(formation =>
    Number(formation.id) === Number(document_.encounter_id)
  );
  if (!selected) {
    throw new Error(
      `battle-test-point formation ${document_.encounter_id} is missing`,
    );
  }
  // selected_formation is a compatibility projection, not another editable
  // source.  Never trust a cached copy after encounter/formations changed.
  if (Object.getOwnPropertyDescriptor(document_, "selected_formation")?.get) {
    Object.defineProperty(document_, "selected_formation", {enumerable: true, configurable: true,
      get: () => document_.formations.find(row => row.id === document_.encounter_id)});
  } else document_.selected_formation = cloneValidatedJson(selected);
}

function attachProjectSection(schema, document_) {
  const project = state.project;
  if (!project) return;
  // 可变投影隔离容器，只读 UI 索引复用 DB 正文。
  if (projectionDocumentSources.get(schema) === document_) return;
  const value = ["project.ui.editor", "audio-sequence"].includes(schema) ? document_
    : ['project.story', 'project.ui.interfaces', 'project.ui.dispatch', 'project.ui.templates'].includes(schema)
      ? mutableJsonProjection(document_) : cloneValidatedJson(document_);
  if (schema === "project.ui") {
    // Compute before marking the source loaded: invalid input must fail on
    // retry instead of reusing an older component library.
    const components = buildUiComponents(value.construction);
    value.construction.components_data = components;
  }
  // 父节点被单独失效并重载时会整体替换对象。它下面的 DB 子文档可能仍是热缓存，
  // 所以必须让本轮后续 attach 再挂一次，不能被 source 身份的 fast path 跳过。
  for (const child of CHILD_PROJECTIONS_BY_PARENT[schema] || []) {
    projectionDocumentSources.delete(child);
  }
  if (schema === "project.game-data") dataDocumentSources.clear();
  if (schema === "project.scenes") sceneActorSource = null;
  if (schema === "project.facilities") facilityConfigurationSource = null;
  if (schema === "project.ui") lastCharacterMap = null;
  projectionDocumentSources.set(schema, document_);
  if (schema === "project.runtime") project.runtime = value;
  else if (schema === "project.scenes") project.scenes = value;
  else if (schema === "project.scenes.logic") {
    project.scenes ||= {};
    project.scenes.logic = value;
  }
  else if (schema === "project.visuals") project.visuals = value;
  else if (schema === "weapon-attack-parameter") {
    project.visuals ||= {};
    project.visuals.weapon_effect_catalog ||= {};
    project.visuals.weapon_effect_catalog.asset_catalog_data = value;
  }
  else if (schema === "monster-visual-layout") {
    project.visuals ||= {};
    project.visuals.monster_formation_footprints = cloneValidatedJson(
      monsterFormationFootprints(document_),
    );
  }
  else if (schema === "project.game-data") project.game_data = value;
  else if (schema === "project.ui") project.ui = value;
  else if (schema === "project.ui.editor") {
    project.ui ||= {};
    project.ui.editor = value;
  }
  else if (schema === "project.ui.interfaces") {
    project.ui ||= {};
    project.ui.construction ||= {};
    project.ui.construction.interfaces = value;
  }
  else if (schema === "project.ui.dispatch") {
    project.ui ||= {};
    project.ui.construction ||= {};
    project.ui.construction.menu_dispatch_data = value;
  }
  else if (schema === "project.ui.templates") {
    project.ui ||= {};
    project.ui.construction ||= {};
    project.ui.construction.templates_data = value;
  }
  else if (schema === "project.story") project.story = value;
  else if (schema === "field-scene-lifecycle-service") {
    project.field_scene_lifecycle = value;
  }
  else if (schema === "project.boot-presentation") project.boot_presentation = value;
  else if (schema === "project.text-fonts") project.text_fonts = value;
  else if (schema === "project.audio") project.audio = value;
  else if (schema === "audio-sequence") {
    project.audio ||= {};
    project.audio.sequence_graph = value;
  }
  else if (schema === "project.facilities") project.facilities = value;
  else if (schema === "project.wanted") project.wanted = value;
}

async function loadDocuments(schemas, failures) {
  const missing = Symbol("view-data-missing");
  // fetch 可以并行，挂载必须按声明顺序，父节点永远先于子节点。
  const values = await Promise.all(schemas.map(schema =>
    db.getDocument(schema, missing)
  ));
  for (let index = 0; index < schemas.length; index += 1) {
    if (values[index] === missing) failures.push(schemas[index]);
    else attachProjectSection(schemas[index], values[index]);
  }
}

/** 当前视图只保留所需资源 UID 与字段对象的关联视图。 */
async function loadResourceRangeShards(
  shards,
  failures = [],
  {all = false, uids = []} = {},
) {
  const result = await loadResourceRangeFieldViews(db, shards,
    {all, uids, domainForUid: resourceDomain});
  failures.push(...result.failures);
  state.resourceRangeFieldViews = result.catalog;
  return new Set(result.loaded);
}

async function loadEffectiveDataAssets(view, failures) {
  const schemas = [
    ...(DATA_ASSETS_BY_VIEW[view] || []),
    ...(view === "monsters" && state.recordId != null
      ? MONSTER_RECORD_DATA_ASSETS : []),
  ];
  if (!schemas.length || !state.project) return false;
  const missing = Symbol("data-asset-missing");
  const values = await Promise.all(schemas.map(async schema => {
    await prepareEquipmentSlotShape(schema, state.project);
    return db.getDocument(schema, missing);
  }));
  let changed = false;
  for (let index = 0; index < schemas.length; index += 1) {
    const schema = schemas[index];
    const value = values[index];
    const key = DATA_PROJECTION_KEYS[schema];
    if (value === missing) {
      failures.push(schema);
      // package game-data 带的是导入期快照，不是 repository authority。有效值读取
      // 失败时必须 fail closed，不能继续显示静态 original 或上一次访问留下的投影。
      dataDocumentSources.delete(schema);
      if (key && state.project.game_data) delete state.project.game_data[key];
      continue;
    }
    if (!key) continue;
    state.project.game_data ||= {};
    if (dataDocumentSources.get(schema) === value) continue;
    changed = true;
    dataDocumentSources.set(schema, value);
    // Field views retain their getters and shared nested values. Legacy data
    // editors still need a clone because they mutate their projection records.
    const previous = state.project.game_data[key];
    const ownerResource = DATA_SCHEMAS[schema]?.source?.resourceId ?? schema;
    const projection = hasFieldDocumentView(ownerResource)
      ? copyFieldDocumentView(value) : cloneValidatedJson(value);
    if (schema === "battle-test-point") rebuildBattleTestProjection(projection);
    // writeback_state 是 Web 发布器根据 component/preimage 生成的只读派生信息，
    // 不属于 repository document。只显式保留这一项；working 删除的其他顶层字段
    // 必须真的消失，不能被旧 package 快照补回来。
    if (!Object.hasOwn(projection, "writeback_state") && previous?.writeback_state) {
      projection.writeback_state = cloneValidatedJson(previous.writeback_state);
    }
    state.project.game_data[key] = projection;
  }
  return changed;
}

async function applyCurrentTextProjection({force = false, failures} = {}) {
  if (!state.project?.manifest?.character_map_catalog) return;
  const missing = Symbol("text-projection-missing");
  const [characterMap, sourceCatalog, textRecords, textFonts] = await Promise.all([
    db.getDocument("text.character-map", missing),
    db.getDocument("project.text-references", missing),
    db.getDocument(TEXT_RECORDS_RESOURCE_ID, missing),
    db.getDocument("project.text-fonts", missing),
  ]);
  if (characterMap === missing || sourceCatalog === missing || textRecords === missing || textFonts === missing) {
    if (textFonts === missing) failures?.push("project.text-fonts");
    if (characterMap === missing) failures?.push("text.character-map");
    if (sourceCatalog === missing) failures?.push("project.text-references");
    if (textRecords === missing && VIEWS_WITH_CURRENT_TEXT.has(state.view)) {
      failures?.push(TEXT_RECORDS_RESOURCE_ID);
    }
    return;
  }
  if (!force && characterMap === lastCharacterMap &&
      sourceCatalog === lastTextCatalog && textRecords === lastTextRecords && textFonts === lastTextFonts) return;
  const currentCharacterMap = characterMapCandidateSourcesAvailable(
    state.project.game_data,
  )
    ? recomputeCharacterMapCandidates(
      characterMap,
      sourceCatalog,
      state.project.game_data,
    )
    : characterMap;
  const encoding = createTextRecordEncoding(currentCharacterMap, sourceCatalog, textFonts);
  // 整份目录刷新推到最后需要它的那一处（文字页自己建目录）：这里只发布一张按
  // node_id 现查的引用表，几何形状与「刷新 + 铺有效字节」两条路径共用。
  const referenceIndex = createTextReferenceIndex({
    catalog: sourceCatalog,
    characterMapDocument: currentCharacterMap,
    recordsDocument: textRecords,
    encoding,
  });
  applyCurrentTextReferencesToProject(
    state.project,
    sourceCatalog,
    currentCharacterMap,
    {referenceIndex},
  );
  applyTextCatalogToStoryProject(state.project, sourceCatalog, {referenceIndex});
  state.project.text_record_edits = textRecords;
  state.project.text_record_dirty = Boolean(
    db.metadata(TEXT_RECORDS_RESOURCE_ID)?.dirty,
  );
  state.project.text_record_encoding = encoding;
  lastCharacterMap = characterMap;
  lastTextCatalog = sourceCatalog;
  lastTextRecords = textRecords;
  lastTextFonts = textFonts;
}

async function ensureAudioCommandLabelsData({commands = null} = {}) {
  const failures = [];
  if (!projectionDocumentSources.has('project.facilities')) {
    const path = state.browserPackageManifest?.browser_prepared_inputs?.audio_labels;
    if (path) attachProjectSection('project.facilities', await db.getPackageDocument(path, undefined, {readonly: true}));
    else await loadDocuments(["project.facilities"], failures);
  }
  if (commands && !failures.length) {
    const entry = state.project.facilities?.configuration_loader?.pointer_entries
      ?.find(item => Number(item.family_id) === 0x0A);
    const goods = entry?.value_namespace?.goods || [];
    if (!commands.some(command => goods.some(good => Number(good.value) === Number(command)
        && (good.text_record || good.resource_uid)))) return;
  }
  await loadResourceIndexDomains(["text"], failures, {includeDirectTargets: false});
  await applyCurrentTextProjection({failures});
  if (failures.length) throw new Error(`曲名读取失败：${failures.join("、")}`);
}

async function ensureAudioSequenceData({withProject = false} = {}) {
  const failures = [];
  await loadDocuments([...(withProject ? ["project.audio"] : []), "audio-sequence"], failures);
  if (failures.length) throw new Error(`音序读取失败：${failures.join("、")}`);
}

function resourceDomain(uid) {
  const prefix = String(uid || "").split(":", 1)[0];
  return state.project?.resource_index?.uid_domains?.[prefix] || null;
}

async function loadResourceIndexDomains(
  domains,
  failures = [],
  {includeDirectTargets = true} = {},
) {
  const unique = [...new Set(domains.filter(domain =>
    ALL_RESOURCE_INDEX_DOMAINS.includes(domain)
  ))];
  const missing = Symbol("resource-index-missing");
  const documents = await Promise.all(unique.map(domain =>
    db.getDocument(`resource-index.${domain}`, missing)
  ));
  state.project.resource_index ||= {};
  state.project.resource_index.by_domain ||= {};
  const loadedDomains = new Set();
  const directTargets = new Set();
  for (let index = 0; index < unique.length; index += 1) {
    const domain = unique[index];
    const document_ = documents[index];
    if (document_ === missing) {
      failures.push(`resource-index.${domain}`);
      continue;
    }
    loadedDomains.add(domain);
    if (resourceIndexSources.get(domain) !== document_) {
      resourceIndexSources.set(domain, document_);
      state.project.resource_index.by_domain[domain] = cloneValidatedJson(document_);
      if (domain === "audio") audioInstructionSource = null;
      if (domain === "text") lastCharacterMap = null;
    }
    let targets = resourceIndexDirectTargets.get(domain);
    if (targets?.source !== document_) {
      const domains = new Set();
      for (const record of document_) {
        for (const edge of record?.references || []) {
          const targetDomain = resourceDomain(edge?.target);
          if (targetDomain) domains.add(targetDomain);
        }
      }
      targets = {source: document_, domains};
      resourceIndexDirectTargets.set(domain, targets);
    }
    for (const target of targets.domains) {
      if (!unique.includes(target)) directTargets.add(target);
    }
  }
  if (!includeDirectTargets) return loadedDomains;
  // 只补当前记录直接指向的模块，不递归追引用闭包。
  const targetDomains = [...directTargets].filter(domain =>
    ALL_RESOURCE_INDEX_DOMAINS.includes(domain)
  );
  const targetDocuments = await Promise.all(targetDomains.map(domain =>
    db.getDocument(`resource-index.${domain}`, missing)
  ));
  for (let index = 0; index < targetDomains.length; index += 1) {
    if (targetDocuments[index] === missing) {
      failures.push(`resource-index.${targetDomains[index]}`);
    } else {
      const domain = targetDomains[index];
      loadedDomains.add(domain);
      if (resourceIndexSources.get(domain) !== targetDocuments[index]) {
        resourceIndexSources.set(domain, targetDocuments[index]);
        state.project.resource_index.by_domain[domain] = cloneValidatedJson(targetDocuments[index]);
      }
    }
  }
  return loadedDomains;
}

async function loadAudioInstructionIndex(failures) {
  const missing = Symbol("audio-instruction-index-missing");
  const records = await db.getDocument("resource-index.audio-instructions", missing);
  if (records === missing) {
    failures.push("resource-index.audio-instructions");
    return;
  }
  if (audioInstructionSource === records) return;
  audioInstructionSource = records;
  const current = state.project.resource_index?.by_domain?.audio || [];
  state.project.resource_index.by_domain.audio = [
    ...current.filter(record => record?.kind !== "audio-sequence-instruction"),
    ...cloneValidatedJson(records),
  ];
}

async function ensureResourceIndexForUid(uid) {
  const domain = resourceDomain(uid);
  if (!domain) return false;
  const failures = [];
  await loadResourceIndexDomains(
    [domain],
    failures,
    {includeDirectTargets: false},
  );
  return failures.length === 0;
}

async function ensureResourceNavigationData(uid) {
  const failures = [];
  await ensureResourceIndexForUid(uid);
  await loadResourceRangeShards([], failures, {uids: [uid]});
  await loadDocuments(["project.ui", "project.ui.editor"], failures);
  return failures;
}

async function searchResourceHandles(value) {
  const query = String(value).trim().toLowerCase();
  if (!query) return [];
  const prefixes = state.project?.resource_index?.uid_domains || {};
  const prefix = query.split(":", 1)[0];
  const domain = query.includes(":")
    ? Object.entries(prefixes).find(([key]) => key.toLowerCase() === prefix)?.[1] : null;
  const domains = domain ? [domain] : ALL_RESOURCE_INDEX_DOMAINS;
  const failures = [];
  await loadResourceIndexDomains(domains, failures, {includeDirectTargets: false});
  if (domains.includes("audio")) await loadAudioInstructionIndex(failures);
  if (failures.length) throw new Error(`句柄索引读取失败：${failures.join("、")}`);
  const records = new Map();
  for (const name of domains) {
    for (const record of state.project.resource_index.by_domain[name] || []) {
      if (record.uid?.toLowerCase().includes(query)) records.set(record.uid, record);
    }
  }
  return [...records.values()].sort((a, b) => a.uid.localeCompare(b.uid));
}

async function loadBattlePlacement(failures) {
  const document = await db.getResourceDocument("battle-engine", null);
  if (!document) failures.push("battle-engine");
  // Replace even on failure so an earlier project's/default list cannot survive.
  if (state.project) state.project.battle_engine = document ? cloneValidatedJson(document) : null;
}

/**
 * 按需备齐「战斗场景」那套正文。
 *
 * 它原本只在 `interfaceui/battle-scene` 那一页加载。怪物记录页要把同一个场景内嵌
 * 进来编发射点，也得有 `project.visuals`（`monster_formation_footprints` 在里面），
 * 否则 `battleScenePreviewCatalog(...).monsters` 是空的、编队排不出敌人。
 *
 * **按需，不是把整张怪物表都拖慢**：只有真的打开某只怪物的记录页时才付这份代价。
 */
async function ensureBattleSceneData({includeInventory = false} = {}) {
  const failures = [];
  await loadBattlePlacement(failures);
  await loadDocuments([
    "project.visuals",
    "weapon-attack-parameter",
    "monster-visual-layout",
  ], failures);
  await prepareAttackChrEntryContext();
  await loadResourceIndexDomains(["visual", "battle"], failures);
  if (includeInventory) {
    const service = await db.getResourceDocument("battle-item-service", null);
    if (!service) failures.push("battle-item-service");
    else state.project.game_data.battle_item_service = cloneValidatedJson(service);
  }
  return failures;
}

function viewDataFailures(view = state.view) {
  return failuresByView.get(view) || [];
}

function resetViewData() {
  failuresByView.clear();
  dataDocumentSources.clear();
  projectionDocumentSources.clear();
  resourceIndexSources.clear();
  resourceIndexDirectTargets.clear();
  lastTextCatalog = null;
  lastCharacterMap = null;
  lastTextRecords = null;
  lastTextFonts = null;
  sceneActorSource = null;
  facilityConfigurationSource = null;
  audioInstructionSource = null;
}

/** 为一个导航页备齐正文；首页调用不会访问任何分页 schema。 */
async function prepareViewData(view = state.view) {
  const bootView = ["cutscene-boot-logo", "cutscene-title"].includes(view);
  const storyDocument = await db.prepareStoryPageDocument(view === 'story-page' ? state.storyPageId : storyEditableView(view) ? view : null);
  const dependencyView = storyDocument ? 'story-page' : view;
  if (storyEditableView(view)) await db.assertStoryPageWorking(view);
  if (view === 'save' && state.savePageSection === 'location') {
    state.resourceRangeFieldViews = null;
    failuresByView.set(view, []);
    return [];
  }
  const storyPreview = STORY_PAGE_VIEW_IDS.includes(view);
  const storyDocuments = storyPreview ? Promise.all([
    db.getDocument("text.character-map"),
    db.getDocument("project.text-references"),
    db.getDocument(TEXT_RECORDS_RESOURCE_ID),
    db.getDocument("project.text-fonts"),
    db.getDocument("shared-chr-bank"),
    ...(storyEditableView(view) ? [db.getDocument("project.text-catalog"),
      db.getDocument("cutscene"), db.getDocument("scene-actor"),
      db.getResourceDocument("story-autonomous-script"), db.getResourceDocument("story-interaction-script")] : []),
  ]) : null;
  // 并行准备的拒绝由后续 await 交给页面。
  storyDocuments?.catch(() => {});
  const failures = [];
  const sceneOverview = view === "scenes" && !state.sceneSlug && !state.interactionFlow;
  const battleSceneComposer = view === "interfaceui"
    && state.interfacePage === "battle-scene";
  const nameEntryVehiclePortrait = view === "interfaceui"
    && (state.interfacePage === "name-entry" || state.interfacePage === 'interaction-service'
      && state.resourceId === 'application-command:31');
  const faxDestinations = view === 'interfaceui' && state.interfacePage === 'field-item-fax';
  const interfaceInputPath = view === 'interfaceui' && state.interfacePage !== 'field-investigation'
    && state.browserPackageManifest?.browser_prepared_inputs?.interface_pages?.[state.interfacePage];
  const prepared = state.browserPackageManifest?.browser_prepared_inputs;
  const storyInputPath = storyPreview && dependencyView !== 'story-page' && view !== 'ending' && prepared?.story_ui;
  const sections = [
    ...(sceneOverview ? ["project.scenes"] : (SECTIONS_BY_VIEW[dependencyView] || [])),
    ...(battleSceneComposer || nameEntryVehiclePortrait
      ? ["project.visuals", "weapon-attack-parameter"] : []),
    ...(battleSceneComposer ? ["monster-visual-layout"] : []),
    ...(storyPreview && previewSoundEnabled() ? ["audio-sequence"] : []),
    ...(storyPreview ? ["project.visuals"] : []),
    ...(faxDestinations || view === 'interfaceui' && state.interfacePage === 'noah-control-terminal'
      ? ['project.facilities'] : []),
    ...(view === 'interfaceui' && state.interfacePage === 'wanted-office-service'
      ? ['project.scenes'] : []),
  ].filter(schema => (!interfaceInputPath || !schema.startsWith('project.ui'))
    && (!storyInputPath || (schema !== 'project.ui'
      && (schema !== 'project.facilities' || !prepared.audio_labels)))
    && (!bootView || !['project.audio', 'audio-sequence'].includes(schema) || previewSoundEnabled()));
  const documents = loadDocuments(sections, failures);
  const interfaceInputs = interfaceInputPath ? db.getPackageDocument(interfaceInputPath, undefined, {readonly: true})
    .then(sharedJsonValue).then(inputs => {
      for (const [schema, document] of Object.entries(inputs)) attachProjectSection(schema, document);
    }) : null;
  interfaceInputs?.catch(() => {});
  const storyInputs = storyInputPath ? (async () => {
    attachProjectSection('project.ui', await db.getPackageDocument(storyInputPath, undefined, {readonly: true}));
  })() : null;
  storyInputs?.catch(() => {});
  const declaredResourceDomains = sceneOverview ? ["scene", "package"] : battleSceneComposer
    ? [...(RESOURCE_DOMAINS_BY_VIEW[dependencyView] || []), "visual", "battle"]
    : RESOURCE_DOMAINS_BY_VIEW[dependencyView] || [];
  const resourceDomains = [...new Set([
    ...declaredResourceDomains,
    ...(VIEWS_WITH_CURRENT_TEXT.has(view) ? ["text"] : []),
  ])];
  const indexes = loadResourceIndexDomains(resourceDomains, failures, {
    includeDirectTargets: view !== "bytemap-chr" && !interfaceInputPath,
  });
  indexes.catch(() => {});
  const ranges = VIEWS_WITH_RESOURCE_RANGES.has(view) ? indexes.then(loadedDomains => {
    const rangeDomains = RESOURCE_RANGE_DOMAINS_BY_VIEW[view] || resourceDomains;
    return loadResourceRangeFieldViews(db, [
      ...rangeDomains.filter(domain => loadedDomains.has(domain)),
      ...(RESOURCE_RANGE_EXTRA_SHARDS_BY_VIEW[view] || []),
    ], {all: BYTE_MAP_GLOBAL_RANGE_VIEWS.has(view), domainForUid: resourceDomain});
  }) : null;
  ranges?.catch(() => {});
  const pageSchemas = sceneOverview ? [] : DATA_ASSETS_BY_VIEW[dependencyView] || [];
  const prefetch = Promise.all([
    ...pageSchemas.map(schema => db.getDocument(schema)),
    ...(VIEWS_WITH_CURRENT_TEXT.has(view) || pageSchemas.length ? [
      db.getDocument("text.character-map"), db.getDocument("project.text-references"),
      db.getDocument(TEXT_RECORDS_RESOURCE_ID), db.getDocument("project.text-fonts"),
    ] : []),
    ...(sections.includes("project.ui") ? [db.getDocument("shared-chr-bank"), db.getResourceDocument("char")] : []),
    ...(["scenes", "shops", "jukebox", "vending"].includes(view) && !sceneOverview
      ? [db.getDocument("facility-config")] : []),
    ...(bootView ? [db.getDocument("boot-presentation"), db.getResourceDocument("shared-chr-bank")] : []),
  ]);
  prefetch.catch(() => {});
  const storyData = storyPreview ? Promise.all((DATA_ASSETS_BY_VIEW[dependencyView] || [])
    .map(schema => db.getDocument(schema))) : null;
  await documents;
  if (interfaceInputs) await interfaceInputs;
  if (storyInputs) await storyInputs;
  await prefetch;
  if (sections.includes('weapon-attack-parameter') || ['characters', 'vehicles'].includes(view))
    await prepareAttackChrEntryContext();
  if (view === 'battle-test') {
    const {prepareStoryBattleEntry} = await import('./element-tree-DsgOBeTK.js').then(function (n) { return n.storyBattleEntry; });
    state.project.gomez_battle_entry = await prepareStoryBattleEntry('story-f5-f9', state.project.story);
  }
  if (bootView) {
    const edits = await db.getDocument("boot-presentation");
    const screenId = view === "cutscene-boot-logo" ? "boot-logo" : "title";
    const screen = edits?.screens.find(screen => screen.id === screenId);
    await ensureAudioCommandLabelsData({commands: [screen?.parameters.sound_command]});
  }
  if (battleSceneComposer || ["battle-test", "battleactors", 'monster-formations'].includes(view)) {
    await loadBattlePlacement(failures);
  }
  if (storyData) await storyData;
  const dataChanged = sceneOverview ? false : await loadEffectiveDataAssets(dependencyView, failures);
  if (storyDocuments) await storyDocuments;
  // 文字投影会就地刷新当前页已经挂上的资源索引，因此相关 domain 必须先到位。
  // 反过来会让首次打开文字页时仍显示提取期的 unicode/status/label。
  const loadedResourceDomains = await indexes;
  if (loadedResourceDomains.has("audio")) await ensureAudioCommandLabelsData();
  if (dataChanged || VIEWS_WITH_CURRENT_TEXT.has(view)) {
    await applyCurrentTextProjection({force: dataChanged, failures});
  }
  applySceneTownNames(state.project);
  applyTeleportDestinationNames(state.project);
  if (view === "audio") {
    await loadAudioInstructionIndex(failures);
    const storage = await db.getResourceDocument("dpcm-storage");
    if (Array.isArray(storage?.sample_views)) {
      const runs = new Map(storage.physical_components.map(run => [run.id, run.delta_bytes]));
      const views = new Map(storage.sample_views.map(sample => [sample.sample_id, sample]));
      const audio = state.project.audio;
      state.project.audio = {...audio, dpcm: {...audio.dpcm,
        samples: audio.dpcm.samples.map(sample => {
          const view = views.get(sample.id);
          const bytes = view && runs.get(view.component_id);
          if (!bytes || view.byte_offset < 0 || view.byte_offset + view.length > bytes.length
            || view.length !== sample.sample_length) throw new Error("DPCM shared sample view is invalid");
          return {...sample, raw_bytes: bytes.slice(view.byte_offset, view.byte_offset + view.length)};
        }),
      }};
    }
  }
  if (ranges) {
    const result = await ranges;
    failures.push(...result.failures);
    state.resourceRangeFieldViews = result.catalog;
  } else state.resourceRangeFieldViews = null;
  if (["cutscene-boot-logo", "cutscene-title"].includes(view)) {
    // 只读分析走 package，可编辑值走 repository。两者分开取，页面才能同时显示
    // 「ROM 原值」和「当前有效值」，而不是把 working 覆盖误当成 ROM 内容。
    const missing = Symbol("boot-presentation-missing");
    const edits = await db.getDocument("boot-presentation", missing);
    if (edits === missing) failures.push("boot-presentation");
    else if (state.project) {
      state.project.boot_presentation_edits = cloneValidatedJson(edits);
      state.project.boot_presentation_dirty = Boolean(
        db.metadata("boot-presentation")?.dirty
      );
    }
  }
  if (storyEditableView(view)) {
    // 只读分析走 project.story，可编辑值走 repository。两者分开取，页面才能同时
    // 显示「ROM 原值」和「当前有效值」。
    const missing = Symbol("cutscene-missing");
    const edits = await db.getDocument("cutscene", missing);
    if (edits === missing) failures.push("cutscene");
    else if (state.project) {
      if (!state.project.story_cutscene_edits || projectionDocumentSources.get("story_cutscene_edits") !== edits) {
        state.project.story_cutscene_edits = copyFieldDocumentView(edits);
        projectionDocumentSources.set("story_cutscene_edits", edits);
      }
      state.project.story_cutscene_dirty = Boolean(
        db.metadata("cutscene")?.dirty
      );
      const {projectStoryOperands} = await import('./element-tree-DsgOBeTK.js').then(function (n) { return n.storyFieldRouting; });
      const [autonomous, interaction, actors] = await Promise.all([
        db.getResourceDocument("story-autonomous-script", null),
        db.getResourceDocument("story-interaction-script", null), db.getDocument("scene-actor", null),
      ]);
      if (!autonomous) throw new Error("story-autonomous-script 正文缺失");
      const [autonomousDraft, interactionDraft, actorDraft] = await Promise.all([
        storyFieldDraft("story_autonomous_edits", "story-autonomous-script", autonomous),
        storyFieldDraft("story_interaction_edits", "story-interaction-script", interaction),
        actors ? storyFieldDraft("story_scene_actor_edits", "scene-actor", actors) : null,
      ]);
      state.project.story_autonomous_edits = autonomousDraft;
      state.project.story_interaction_edits = interactionDraft;
      if (storyOperandSources.get(state.project.story_cutscene_edits) !== autonomousDraft) {
        projectStoryOperands(state.project.story_cutscene_edits, autonomousDraft);
        storyOperandSources.set(state.project.story_cutscene_edits, autonomousDraft);
      }
      if (!actors) failures.push("scene-actor");
      else {
        state.project.story_scene_actor_edits = actorDraft;
        state.project.story_scene_actor_dirty = Boolean(db.metadata("scene-actor")?.dirty);
      }
    }
  }
  if (["scenes", "shops"].includes(view) && !sceneOverview) {
    const missing = Symbol("scene-actors-missing");
    const actors = await db.getDocument("scene-actor", missing);
    if (actors === missing) failures.push("scene-actor");
    else if (state.project.scenes && sceneActorSource !== actors) {
      sceneActorSource = actors;
      state.project.scenes.actors = actors;
    }
  }
  if (["scenes", "investigation", "shops", "jukebox", "vending"].includes(view)
      && state.project.facilities) {
    const missing = Symbol("facility-configuration-missing");
    const configuration = await db.getDocument("facility-config", missing);
    if (configuration === missing) failures.push("facility-config");
    else if (facilityConfigurationSource !== configuration) {
      facilityConfigurationSource = configuration;
      applyFacilityConfigurationProjection(
        state.project,
        configuration,
        db.metadata("facility-config")?.dirty,
      );
    }
  }
  const uniqueFailures = [...new Set(failures)];
  if (view === 'save') await prepareHiddenTeleportDestination(state.project);
  if ((['scenes', 'frograce', 'teleport'].includes(view) || faxDestinations) && state.project.facilities) {
    const documents = await Promise.all(UI_FACILITY_PARAMETER_RESOURCE_IDS.map(async resourceId =>
      [resourceId, await db.getResourceDocument(resourceId)]));
    applyUiFacilityParameterProjection(state.project.facilities, new Map(documents));
  }
  failuresByView.set(view, uniqueFailures);
  return uniqueFailures;
}

// @editor-module 空页按当前视图的取数状态显示内容。

function empty() {
  if (viewDataFailures(state.view).length > 0) {
    return `<div class="empty"><b>数据未能加载</b><span>刷新页面重试；状态栏有失败的数据名。</span></div>`;
  }
  return $("#empty-template").innerHTML;
}

// @editor-module 资产卡片与徽章
//
// 来源：拆分前 engine/editor/app.js 第 973-997 行。


function assets() {
  const all = state.project?.manifest?.assets || [];
  const q = state.query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(asset => JSON.stringify(asset).toLowerCase().includes(q));
}

function badge(asset) {
  const confidence = asset.confidence || "confirmed";
  return `<span class="badge ${esc(confidence)}">${esc(confidence)}</span>`;
}

// @editor-module 场景概览与资源表

function sceneInvestigationLayerCount(summary) {
  return Number(summary?.investigation_points || 0)
    + Number(summary?.investigation_special_points || 0)
    + Number(summary?.metatile_investigation_points || 0);
}

function sceneResourceUid(entry) {
  return `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function normalizeSceneFilter(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[×＊*]/g, "x")
    .replace(/\s+/g, " ");
}

function sceneFilterText(entry) {
  const id = Number(entry.id);
  const idHex = id.toString(16).toUpperCase().padStart(2, "0");
  const width = Number(entry.width) || 0;
  const height = Number(entry.height) || 0;
  return normalizeSceneFilter([
    id,
    idHex,
    `0x${idHex}`,
    `$${idHex}`,
    sceneResourceUid(entry),
    entry.id_hex,
    entry.slug,
    entry.name,
    `${width}x${height}`,
    `${width * 16}x${height * 16}`,
  ].join(" "));
}

function sceneMatchesFilter(entry, query) {
  const terms = normalizeSceneFilter(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = sceneFilterText(entry);
  return terms.every(term => text.includes(term));
}

function applySceneOverviewFilter(root = document) {
  const input = root.querySelector("[data-scene-list-filter]");
  if (!input) return 0;
  const query = normalizeSceneFilter(input.value);
  const terms = query.split(" ").filter(Boolean);
  const rows = [...root.querySelectorAll("[data-scene-list-row]")];
  let visible = 0;
  for (const row of rows) {
    const pinned = row.dataset.sceneResourceId === state.resourceId;
    const globalMatch = row.dataset.sceneGlobalMatch !== "0";
    const localMatch = terms.every(term => row.dataset.sceneListSearch.includes(term));
    row.hidden = !(pinned || (globalMatch && localMatch));
    if (!row.hidden) visible += 1;
  }
  const count = root.querySelector("[data-scene-list-count]");
  if (count) count.textContent = String(visible);
  const table = root.querySelector("[data-scene-list-table]");
  if (table) table.hidden = visible === 0;
  const emptyState = root.querySelector("[data-scene-list-empty]");
  if (emptyState) emptyState.hidden = visible !== 0;
  const clear = root.querySelector("[data-scene-list-filter-clear]");
  if (clear) clear.disabled = !input.value;
  return visible;
}

function bindSceneOverviewFilter(root = document, onChange = null) {
  const input = root.querySelector("[data-scene-list-filter]");
  if (!input || input.dataset.sceneListFilterBound === "1") return;
  input.dataset.sceneListFilterBound = "1";
  const update = () => {
    state.sceneListFilter = input.value;
    if (String(state.resourceId || "").startsWith("scene:")) {
      state.resourceId = null;
      root.querySelectorAll(".resource-target-focus").forEach(node =>
        node.classList.remove("resource-target-focus")
      );
    }
    applySceneOverviewFilter(root);
    onChange?.();
  };
  input.addEventListener("input", update);
  root.querySelector("[data-scene-list-filter-clear]")?.addEventListener("click", () => {
    if (!input.value) return;
    input.value = "";
    update();
    input.focus({preventScroll: true});
  });
  applySceneOverviewFilter(root);
}

function renderSceneOverview() {
  const scenes = state.project.scenes || {};
  const entries = scenes.editable_scenes || [];
  const q = state.query;
  const localFilter = state.sceneListFilter || "";
  const resourceTarget = String(state.resourceId || "");
  const candidates = entries.filter(entry =>
    sceneMatchesFilter(entry, q) || sceneResourceUid(entry) === resourceTarget
  );
  const visible = candidates.filter(entry =>
    sceneResourceUid(entry) === resourceTarget || sceneMatchesFilter(entry, localFilter)
  );
  const rows = candidates.map(entry => {
    const counts = entry.logic_summary || {};
    const pointTransitions = Number(counts.point_transitions || 0);
    const boundaryExits = Number(counts.boundary_exits || 0);
    const resourceUid = sceneResourceUid(entry);
    const pinned = resourceUid === resourceTarget;
    const globalMatch = sceneMatchesFilter(entry, q);
    const localMatch = sceneMatchesFilter(entry, localFilter);
    return `<tr class="${entry.id === 0 ? "world" : ""}" data-scene-open="${esc(entry.slug)}" tabindex="0" role="link" aria-label="${esc(entry.name)}"
      data-scene-list-row="${esc(entry.slug)}"
      data-scene-resource-id="${resourceUid}"
      data-scene-global-match="${globalMatch ? "1" : "0"}"
      data-scene-list-search="${esc(sceneFilterText(entry))}"${pinned || (globalMatch && localMatch) ? "" : " hidden"}>
      <td><button class="resource-uid" type="button" data-resource-query="${resourceUid}">${resourceUid}</button></td>
      <td>${renderModuleComponent("scene-header-map", "preview", {
        entry, sceneId: entry.id, width: 110, height: 66, interactive: false,
      })}</td>
      <td><b>${esc(entry.name)}</b></td>
      <td class="mono num">${entry.width}</td>
      <td class="mono num">${entry.height}</td>
      <td class="mono num">${entry.width * 16} × ${entry.height * 16}</td>
      <td class="mono num">${Number(counts.actors || 0)}</td>
      <td class="mono num">${Number(counts.treasures || 0)}</td>
      <td class="mono num" title="设施 ${Number(counts.investigation_points || 0)} / 专用坐标 ${Number(counts.investigation_special_points || 0)} / 图块行为 ${Number(counts.metatile_investigation_points || 0)}">${sceneInvestigationLayerCount(counts)}</td>
      <td class="mono num">${pointTransitions}</td>
      <td class="mono num">${boundaryExits}</td>
      <td class="mono num">${Number(counts.event_triggers || 0)}</td>
      <td>${resourceForwardReferenceCell(resourceUid)}</td>
    </tr>`;
  }).join("");
  return `<div class="section-line"><h2>场景列表</h2><span><b data-scene-list-count>${visible.length}</b> / ${entries.length} ROM 重建预览</span></div>
    <div class="scene-list-filter-bar">
      <label class="scene-list-filter-label" for="scene-list-filter">过滤场景</label>
      <input id="scene-list-filter" type="search" data-scene-list-filter
        value="${esc(localFilter)}" placeholder="ID、名称或尺寸，例如 $98、城镇、18×12"
        autocomplete="off" spellcheck="false">
      <button class="button ghost" type="button" data-scene-list-filter-clear${localFilter ? "" : " disabled"}>清除</button>
    </div>
    ${candidates.length ? `<div class="table-wrap scene-overview-table" data-scene-list-table${visible.length ? "" : " hidden"}><table>
      <thead><tr>
        <th>资源 ID</th><th>缩略图</th><th>场景名称</th>
        <th>宽</th><th>高</th><th>像素尺寸</th>
        <th>NPC</th><th>调查物</th><th>调查交互</th><th>坐标传送</th><th>边界出口</th><th>坐标事件</th>
        <th>引用资产</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>` : ""}
    <div class="empty scene-list-empty" data-scene-list-empty${visible.length ? " hidden" : ""}><b>没有匹配的场景</b></div>`;
}

function renderSceneResources() {
  const list = assets().filter(a => a.kind?.startsWith("map.") || a.kind?.includes("map-stream"));
  const catalog = state.project.scenes?.catalog || [];
  const realScenes = state.project.scenes?.real_scene_count ?? catalog.filter(item => item.editable).length;
  if (!list.length && !catalog.length) return empty();
  return `${renderSceneOverview()}
    <details class="wide-card scene-catalog-details">
      <summary>场景入口与底层地图资产（${realScenes} 个场景 · ${catalog.length} 条索引记录）</summary>
      <div class="table-wrap scene-catalog"><table>
      <thead><tr><th>资源 ID</th><th>游戏索引 ID</th><th>名称</th><th>尺寸</th><th>METATILE 页</th></tr></thead>
      <tbody>${catalog.map(item => {
        const resourceUid = `scene:${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`;
        const editable = (state.project.scenes?.editable_scenes || []).find(scene => Number(scene.id) === Number(item.id));
        return `<tr>
        <td><button class="resource-uid" type="button" data-resource-query="${resourceUid}">${resourceUid}</button></td>
        <td class="mono">${esc(item.id_hex)}</td>
        <td><b>${esc(editable?.name || editable?.slug || `场景 ${item.id_hex}`)}</b></td>
        <td class="mono">${item.width ?? "—"} × ${item.height ?? "—"}</td>
        <td class="mono">${tableValueStack((item.metatile_pages || []).map(x => hex(x,2)))}</td>
      </tr>`;
      }).join("")}</tbody>
      </table></div>
      <div class="section-line"><h2>其他地图资产</h2><span>${list.length} ASSETS</span></div>
      <div class="table-wrap scene-asset-table"><table>
        <thead><tr><th>资源 ID</th><th>资产 ID</th><th>名称</th><th>类型</th><th>可信度</th></tr></thead>
        <tbody>${list.map(a => {
          const resourceUid = `asset:${a.id}`;
          return `<tr>
            <td><button class="resource-uid" type="button" data-resource-query="${esc(resourceUid)}">${esc(resourceUid)}</button></td>
            <td class="mono">${esc(a.id)}</td>
            <td><b>${esc(a.name || "未命名")}</b></td>
            <td class="mono">${esc(a.kind)}</td>
            <td>${badge(a)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </details>`;
}

var overview = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindSceneOverviewFilter: bindSceneOverviewFilter,
  renderSceneResources: renderSceneResources,
  sceneInvestigationLayerCount: sceneInvestigationLayerCount,
  sceneResourceUid: sceneResourceUid
});

export { characterSlotShape, copyFieldDocumentView, draftEquipmentMask, empty, ensureAudioCommandLabelsData, ensureAudioSequenceData, ensureBattleSceneData, ensureResourceNavigationData, overview, prepareViewData, previewSoundEnabled, renderSceneResources, resetViewData, sceneInvestigationLayerCount, sceneResourceUid, searchResourceHandles, setPreviewSoundEnabled, subscribePreviewSound, vehicleAssignedSlot, vehicleMountableSlots, vehicleSlotShape };
