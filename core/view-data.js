// @editor-module 经 DB 准备导航正文并投影到旧视图所需的 project 形状。
//
// init 只拿首页元数据。每次 render 在分派当前视图之前调用 prepareViewData，正文
// 统一经 project-db 读取、缓存并挂到旧视图仍在消费的 project 形状上。这个挂载层
// 是迁移桥，不拥有数据：package / repository 仍是唯一来源，缓存生命周期由 db 管。

import {
  applyCurrentTextReferencesToProject,
  characterMapCandidateSourcesAvailable,
  recomputeCharacterMapCandidates,
} from "./character-map-project.js";
import {applyFacilityConfigurationProjection} from "./project-data.js";
import {UI_FACILITY_PARAMETER_RESOURCE_IDS, applyUiFacilityParameterProjection} from './ui-facility-record-owner.js';
import {prepareHiddenTeleportDestination} from './teleport-hidden-destination.js';
import {applySceneTownNames, applyTeleportDestinationNames} from './scene-town-names.js';
import {monsterFormationFootprints} from "./monster-visual-recipes.js";
import {db, DATA_SCHEMAS} from "./project-db.js";
import {prepareAttackChrEntryContext} from './render-code-sources.js';
import {loadResourceRangeFieldViews} from "./resource-range-field-views.js";
import {hasFieldDocumentView} from "./field-owners.js";
import {prepareEquipmentSlotShape} from "./equipment-slot-shape.js";
import {state} from "./state.js";
import {cloneValidatedJson as cloneJson} from "./project-store-values.js";
import {isProjectFieldContainerGetter} from "./project-field-draft.js";
import {previewSoundEnabled} from "../audio/preview-preference.js";
import {sharedJsonValue} from './shared-json.js';
import {mutableJsonProjection} from './mutable-json-projection.js';
import {buildUiComponents} from "./ui-components.js";
import {
  STORY_PAGE_VIEW_IDS,
  storyEditableView,
} from "./story-view-config.js";
import {
  applyTextCatalogToStoryProject,
  createTextRecordEncoding,
  createTextReferenceIndex,
  TEXT_RECORDS_RESOURCE_ID,
} from "./text-record-project.js";

import {ALL_RESOURCE_INDEX_DOMAINS, SECTIONS_BY_VIEW, DATA_ASSETS_BY_VIEW, RESOURCE_DOMAINS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW}
  from "./view-data-dependencies.js";

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
export function copyFieldDocumentView(value) {
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
  } else document_.selected_formation = cloneJson(selected);
}

function attachProjectSection(schema, document_) {
  const project = state.project;
  if (!project) return;
  // 可变投影隔离容器，只读 UI 索引复用 DB 正文。
  if (projectionDocumentSources.get(schema) === document_) return;
  const value = ["project.ui.editor", "audio-sequence"].includes(schema) ? document_
    : ['project.story', 'project.ui.interfaces', 'project.ui.dispatch', 'project.ui.templates'].includes(schema)
      ? mutableJsonProjection(document_) : cloneJson(document_);
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
    project.visuals.monster_formation_footprints = cloneJson(
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
      ? copyFieldDocumentView(value) : cloneJson(value);
    if (schema === "battle-test-point") rebuildBattleTestProjection(projection);
    // writeback_state 是 Web 发布器根据 component/preimage 生成的只读派生信息，
    // 不属于 repository document。只显式保留这一项；working 删除的其他顶层字段
    // 必须真的消失，不能被旧 package 快照补回来。
    if (!Object.hasOwn(projection, "writeback_state") && previous?.writeback_state) {
      projection.writeback_state = cloneJson(previous.writeback_state);
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

export async function ensureAudioCommandLabelsData({commands = null} = {}) {
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

export async function ensureAudioSequenceData({withProject = false} = {}) {
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
      state.project.resource_index.by_domain[domain] = cloneJson(document_);
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
        state.project.resource_index.by_domain[domain] = cloneJson(targetDocuments[index]);
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
    ...cloneJson(records),
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

export async function ensureResourceNavigationData(uid) {
  const failures = [];
  await ensureResourceIndexForUid(uid);
  await loadResourceRangeShards([], failures, {uids: [uid]});
  await loadDocuments(["project.ui", "project.ui.editor"], failures);
  return failures;
}

export async function searchResourceHandles(value) {
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
  if (state.project) state.project.battle_engine = document ? cloneJson(document) : null;
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
export async function ensureBattleSceneData({includeInventory = false} = {}) {
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
    else state.project.game_data.battle_item_service = cloneJson(service);
  }
  return failures;
}

export function viewDataFailures(view = state.view) {
  return failuresByView.get(view) || [];
}

export function resetViewData() {
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
export async function prepareViewData(view = state.view) {
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
  const sceneOverview = view === "scenes" && !state.sceneSlug && state.sceneListTab === "scenes";
  const sceneDirectory = view === "scenes" && !state.sceneSlug && state.sceneListTab !== "scenes";
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
    ...(sceneOverview ? ["project.scenes"] : sceneDirectory && state.sceneListTab === "actors"
      ? ["project.scenes", "project.story"] : (SECTIONS_BY_VIEW[dependencyView] || [])),
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
  if (view === 'gomez-red-wolf-battle') {
    const {prepareStoryBattleEntry} = await import('./story-battle-entry.js');
    state.project.gomez_battle_entry = await prepareStoryBattleEntry('story-f5-f9', state.project.story);
  }
  if (bootView) {
    const edits = await db.getDocument("boot-presentation");
    const screenId = view === "cutscene-boot-logo" ? "boot-logo" : "title";
    const screen = edits?.screens.find(screen => screen.id === screenId);
    await ensureAudioCommandLabelsData({commands: [screen?.parameters.sound_command]});
  }
  if (battleSceneComposer || ["battle-test", "battleactors", "gomez-red-wolf-battle", 'monster-formations'].includes(view)) {
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
      state.project.boot_presentation_edits = cloneJson(edits);
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
      const {projectStoryOperands} = await import("./story-field-routing.js");
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
