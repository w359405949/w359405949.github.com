// @editor-module 统一读取 package 与 repository 正文，管理缓存、预热、失效和换项目竞态。
//
// 页面只提供 `schema:path...` 或文档 schema，由 db 决定正文来自静态 package 还是
// 浏览器 repository。同一套缓存负责按键表、导航复合文档、失效和换项目竞态。
// 引用键以 schema 标识取数表，reader 解释记录路径；表级缓存不按记录键选分片；预热只加载直接引用的表。
// 仓库资产以资源 ID 标识，包内路径只是本次读取位置。
// DATA_SCHEMAS 登记分页正文、资源正文与引用表；invalidateResource() 作废资源缓存，reset() 清空项目缓存。

import {createAutoSave, clearAutoSaveErrors} from "./auto-save.js";
import {editorLog} from "./editor-log.js";
import {createFieldObject} from "./field-object.js";
import {trackProjectFieldProjection, projectFieldContainerGetter} from "./project-field-draft.js";
import {PACKAGE_SCHEMA_PATHS} from "./package-schema-paths.js";
import {packageJson, readonlyPackageJson, discardPackagePrefetch} from "./package-io.js";
import {state} from "./state.js";
import {storyPageDefinitionForView, setCurrentStoryPageDefinition} from "./story-view-config.js";
import {blankStoryPage, isStoryPageDocument, parseStoryPageJson, validateStoryPageReferences,
  createStoryPageRepository, storyPageJsonDefinition, storySequenceJson, storyPageBrowserVm} from './story-page-json.js';
import {StoryPageDataError, isStoryScriptResource, validateStoryPageWorking} from "./story-page-working.js";
import {createStoryPageScriptCodec} from './story-page-scripts.js';
import {storyScriptWritePlan} from "./story-script-layout.js";
import {createTextRecordEncoding, decodeFixedTextRecord} from './text-record-project.js';
import {fieldOwner, hasFieldOwner, hasFieldDocumentView} from "./field-owners.js";
import {EXTENDED_APPLICATION_COMMANDS, applicationCommandId} from './application-program-format.js';
import {applicationProgramWithMetadata} from './application-program.js';
import {validateExtendedApplicationProgram} from './application-program-compiler.js';
import {createInterfaceStateDocumentMethods} from './interface-state-document-db.js';
import {createInterfaceStateDocumentRepository} from './interface-state-document-repository.js';
import {isWorkingDirty, canonicalJsonEqual, cloneValidatedJson, freezeValidatedJson} from "./project-store-values.js";
import {sha256Hex} from "./rom-linker.js";
import {fieldStoredValue, fieldRomValue, fieldAssetPaths} from "./field-codec.js";
import {candidateSourceIdentity, resolveCandidateValues, atPath as candidatePath} from "./field-candidates.js";
import {createStaticPackageBootstrapProvider, BOOTSTRAP_DIGEST_KEY} from "./project-bootstrap.js";
import {MONSTER_VISUAL_OWNER_IDS, MONSTER_VISUAL_RESOURCE_ID} from "./monster-visual-owners.js";
import {sharedJsonValue} from "./shared-json.js";
import {fieldSourceFileName} from './field-source-path.js';
import {buildUiEditorIndex} from "./ui-editor-project.js";
import {
  loadAudioProjectDocument,
  loadUiProjectDocument,
  loadVisualsProjectDocument,
} from "./project-documents.js";

const MISSING = Symbol("project-db-missing");

function validateFieldPhysicalDeclaration(resourceId, description, owner = {}) {
  if (description.fragmentId === undefined && !description.readOnly
      && owner.physicalWriteback !== false
      && owner.defaultSourceKind !== "annotation"
      && description.writeback?.state !== "unpermitted") {
    throw new TypeError(`${resourceId} 可写字段缺少物理引用：${description.entityHandle}/${description.fieldName}`);
  }
}

/**
 * binding 的分片、来源与 target 的 slot 表按资源建索引。
 *
 * 取首个匹配与原来的 `Array.find` 同义；索引在会话建立时建一次，字段定位按分片号、
 * 来源范围与 slot 号直接取，不再逐字段扫表。
 */
const fieldBindingIndexes = new WeakMap();
const fieldSlotIndexes = new WeakMap();

function fieldLocationIndex(binding, target) {
  let index = binding && fieldBindingIndexes.get(binding);
  if (!index) {
    const components = new Map();
    for (const entry of binding?.input?.components
        ?? (binding?.input?.component ? [{...binding.input.component, asset_offset: 0}] : [])) {
      const key = entry.fragment_id ?? entry.component_id;
      if (!components.has(key)) components.set(key, entry);
    }
    const sources = new Map();
    for (const entry of binding?.sources ?? []) {
      const key = `${entry.asset_offset}:${entry.length}`;
      if (!sources.has(key)) sources.set(key, entry);
    }
    index = {components, sources};
    if (binding) fieldBindingIndexes.set(binding, index);
  }
  const slotRows = target?.build_map?.slots;
  let slots = slotRows && fieldSlotIndexes.get(slotRows);
  if (!slots) {
    slots = new Map();
    for (const entry of slotRows ?? []) {
      if (!slots.has(entry.slot_id)) slots.set(entry.slot_id, entry);
    }
    if (slotRows) fieldSlotIndexes.set(slotRows, slots);
  }
  return {
    component: fragmentId => index.components.get(fragmentId),
    source: (assetOffset, length) => index.sources.get(`${assetOffset}:${length}`),
    slot: slotId => slots.get(slotId),
  };
}

const pkg = (path, {readonly = false} = {}) => Object.freeze({kind: "package", path, ...(readonly ? {readonly: true} : {})});
const repo = resourceId => Object.freeze({kind: "repository", resourceId});

const gameDataProjectSource = Object.freeze({
  kind: "computed",
  load() {
    // Domain documents are attached from the effective repository by
    // view-data.  This stable container replaces the retired Python aggregate.
    return {schema: "metalmaxcn.game-data-index"};
  },
});

async function optionalPackageJson(loadJson, path) {
  try {
    return await loadJson(path);
  } catch (error) {
    if (String(error?.message || error) === `${path}: HTTP 404`) return null;
    throw error;
  }
}

const uiEditorProjectionSource = Object.freeze({
  kind: "package",
  async load({loadJson, packageManifest}) {
    const shared = packageManifest?.browser_prepared_inputs?.ui_editor_shared;
    if (shared) return sharedJsonValue(await loadJson(shared));
    const path = packageManifest?.browser_prepared_inputs?.ui_editor;
    if (path) return loadJson(path);
    const [
      dispatch,
      textCatalog,
      staticLayouts,
      compositions,
      interfaces,
      facilities,
      runtimeUi,
    ] = await Promise.all(PACKAGE_SCHEMA_PATHS["project.ui.editor"].map((path, index) =>
      index >= 5
        ? optionalPackageJson(loadJson, path) : loadJson(path)));
    return freezeValidatedJson(buildUiEditorIndex({
      dispatch,
      textCatalog,
      staticLayouts,
      compositions,
      interfaces,
      facilities,
      runtimeUi,
    }));
  },
});

const audioProjectSource = Object.freeze({
  kind: "package",
  load: ({loadJson}) => loadAudioProjectDocument(loadJson),
});

const uiProjectSource = Object.freeze({
  kind: "package",
  load: ({loadJson}) => loadUiProjectDocument(loadJson),
});

const visualsProjectSource = Object.freeze({
  kind: "package",
  load: ({loadJson}) => loadVisualsProjectDocument(loadJson),
});

// Original 同时发布平铺正文与 document 包装；仓库保留原形状，DB 在读取边界解包。
// 显式存在但损坏的 document 不能退回外层，否则会把坏正文冒充成有效资产。
function repositoryDocument(value, resourceId) {
  const isObject = candidate => candidate !== null
    && typeof candidate === "object" && !Array.isArray(candidate);
  if (!isObject(value)) {
    throw new TypeError(`${resourceId}: repository 资产正文无效`);
  }
  const document_ = Object.hasOwn(value, "document") ? value.document : value;
  if (!isObject(document_)) {
    throw new TypeError(`${resourceId}: repository 资产正文无效`);
  }
  return document_;
}

// 导航页消费的复合投影也走同一个缓存与竞态边界。它们不是 UID 表，因此只通过
// getDocument/peekDocument 读取；表记录仍然使用 get/getAll/warm/peek。
//
// 项目文档直接读唯一权威正文；少量跨文件形状在浏览器现场装配。game-data 按页从
// repository 组装，UI editor 从 construction 与运行证据派生，都不发布第二份聚合。
const PROJECT_DOCUMENT_SCHEMAS = Object.freeze({
  "project.runtime": Object.freeze({source: pkg(PACKAGE_SCHEMA_PATHS["project.runtime"][0])}),
  "project.scenes": Object.freeze({source: pkg(PACKAGE_SCHEMA_PATHS["project.scenes"][0], {readonly: true})}),
  "project.scenes.logic": Object.freeze({source: pkg(PACKAGE_SCHEMA_PATHS["project.scenes.logic"][0], {readonly: true})}),
  "project.scenes.interaction-sources": Object.freeze({
    source: Object.freeze({kind: 'package', load: loadSceneInteractionSources}),
  }),
  "project.visuals": Object.freeze({source: visualsProjectSource}),
  "weapon-attack-parameter": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["weapon-attack-parameter"][0]),
  }),
  "project.game-data": Object.freeze({source: gameDataProjectSource}),
  "project.ui": Object.freeze({source: uiProjectSource}),
  "project.ui.editor": Object.freeze({source: uiEditorProjectionSource}),
  "project.ui.interfaces": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.ui.interfaces"][0], {readonly: true}),
  }),
  'project.ui.frame-commits': Object.freeze({source: Object.freeze({kind: 'package',
    async load({loadJson, packageManifest}) {
      const path = packageManifest?.browser_prepared_inputs?.frame_commits;
      if (path) return loadJson(path);
      const {frame_commit_sources, application_window_sources} = await loadJson(PACKAGE_SCHEMA_PATHS['project.ui.interfaces'][0]);
      return {frame_commit_sources, application_window_sources};
    },
  })}),
  'project.save.fields': Object.freeze({source: Object.freeze({kind: 'package',
    async load({loadJson, packageManifest}) {
      const path = packageManifest?.browser_prepared_inputs?.save_fields;
      if (path) return sharedJsonValue(await loadJson(path));
      return (await import('./physical-field-object-document.js')).loadByteMapSpace('sram', {allPages: true});
    },
  })}),
  "project.ui.dispatch": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.ui.dispatch"][0], {readonly: true}),
  }),
  "project.ui.templates": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.ui.templates"][0], {readonly: true}),
  }),
  "project.story": Object.freeze({source: Object.freeze({kind: 'package',
    async load({loadJson, packageManifest}) {
      const path = packageManifest?.browser_prepared_inputs?.story_shared;
      return path ? sharedJsonValue(await loadJson(path)) : loadJson(PACKAGE_SCHEMA_PATHS['project.story'][0]);
    },
  })}),
  // 开机演出是 story 之外的另一份权威：它跑在主循环稳定之前，两屏的
  // nametable 存在 CHR-ROM 里，与剧情 VM 不共用任何 ROM 范围。
  "project.boot-presentation": Object.freeze({
    source: pkg("game/boot/presentation/index.json"),
  }),
  // 字库登记表：字形序号 → 字符。谁要显示或编辑文字都从这里取，不许自己
  // 按字库偏移解一份（见 AGENTS.md「基础资产模块」）。
  "project.text-fonts": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.text-fonts"][0], {readonly: true}),
  }),
  "project.audio": Object.freeze({source: audioProjectSource}),
  "audio-sequence": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["audio-sequence"][0], {readonly: true}),
  }),
  "project.facilities": Object.freeze({source: pkg(PACKAGE_SCHEMA_PATHS["project.facilities"][0])}),
  "project.wanted": Object.freeze({source: pkg(PACKAGE_SCHEMA_PATHS["project.wanted"][0])}),
  "project.text-catalog": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.text-catalog"][0], {readonly: true}),
  }),
  "project.text-references": Object.freeze({source: Object.freeze({kind: 'package',
    load: ({loadJson, packageManifest}) => loadJson(packageManifest?.browser_prepared_inputs?.text_references
      || PACKAGE_SCHEMA_PATHS['project.text-catalog'][0]),
  })}),
  "project.text-providers": Object.freeze({
    source: pkg(PACKAGE_SCHEMA_PATHS["project.text-providers"][0], {readonly: true}),
  }),
});

const RESOURCE_INDEX_DOMAINS = Object.freeze([
  "audio", "battle", "code", "data", "package", "rom", "runtime",
  "scene", "story", "text", "ui", "visual",
]);

const RESOURCE_INDEX_SCHEMAS = Object.freeze(Object.fromEntries(
  RESOURCE_INDEX_DOMAINS.map(domain => [
    `resource-index.${domain}`,
    Object.freeze({source: pkg(`web-project/index/${domain}.json`, {readonly: true})}),
  ]),
));

const SCENE_OBJECT_KINDS = Object.freeze([
  ["treasure", layers => layers?.treasures],
  ["investigation", layers => layers?.investigation_points],
  ["investigation-special", layers => layers?.investigation_special_points],
  ["investigation-tile", layers => layers?.metatile_investigation_points],
  ["transition", layers => layers?.transitions?.point_transitions],
  ["boundary", layers => layers?.transitions?.boundary_exits],
  ["event", layers => layers?.event_triggers],
]);

/** 存档域自己的 Working 缓冲：它的取消归存档域，不归项目资源的字段入口。 */
const SAVE_DOMAIN_RESOURCE_ID = "save-current";

function ownPath(value, path) {
  let current = value;
  for (const key of path) {
    if (current === null || current === undefined ||
        (typeof current !== "object" && typeof current !== "function") ||
        !Object.hasOwn(current, key)) return MISSING;
    current = current[key];
  }
  return current;
}

function atPath(document_, at) {
  if (!at) return document_;
  return ownPath(document_, Array.isArray(at) ? at : String(at).split("."));
}

/** UID 中数值索引的规范形式：大写十六进制，至少两位，不截断高位。 */
function hexId(value) {
  if (Number.isInteger(value) && value >= 0) {
    return value.toString(16).toUpperCase().padStart(2, "0");
  }
  const text = String(value ?? "").trim();
  const digits = text.match(/^0x([0-9a-f]+)$/i)?.[1]
    || text.match(/^([0-9a-f]+)$/i)?.[1];
  return digits ? digits.toUpperCase().padStart(2, "0") : text;
}

const SCENE_ENTITY_KINDS = new Set(SCENE_OBJECT_KINDS.map(([kind]) => kind));

/** 七类场景实体使用各自 owner 的句柄，不再经过退休的 scene-object 聚合前缀。 */
export function sceneEntityResourceUid(kind, sceneId, recordId) {
  const owner = String(kind || "");
  const scene = Number(sceneId);
  const record = Number(recordId);
  if (!SCENE_ENTITY_KINDS.has(owner)
      || !Number.isInteger(scene) || scene < 0
      || !Number.isInteger(record) || record < 0) {
    throw new TypeError(
      `无效的场景实体句柄参数：${owner}:${String(sceneId)}:${String(recordId)}`,
    );
  }
  return `${owner}:${hexId(scene)}:${hexId(record)}`;
}

function readSceneActor(document_, path, context) {
  if (path.length < 2) return MISSING;
  let index = context.memo.get("records");
  if (!index) {
    const records = atPath(document_, "records");
    if (!Array.isArray(records)) return MISSING;
    index = new Map(records.map(record => [
      `${hexId(record?.entry_id)}:${hexId(record?.id)}`,
      record,
    ]));
    context.memo.set("records", index);
  }
  const record = index.get(`${hexId(path[0])}:${hexId(path[1])}`);
  if (record === undefined) return MISSING;
  return ownPath(record, path.slice(2));
}

async function parallelMap(values, mapper, concurrency = 12) {
  const results = new Array(values.length);
  let cursor = 0;
  const workers = Array.from(
    {length: Math.min(concurrency, values.length)},
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** 将 240 份场景 logic 的七类对象归一成使用真实 owner 句柄的一张运行时表。 */
async function loadSceneObjects({loadJson}) {
  const index = await loadJson("game/scenes/index.json");
  const scenes = index?.editable_scenes;
  if (!Array.isArray(scenes)) throw new TypeError("场景索引缺少 editable_scenes");
  const documents = await parallelMap(scenes, async scene => {
    if (typeof scene?.logic !== "string" || !scene.logic) {
      throw new TypeError(`场景 ${scene?.id ?? "?"} 缺少 logic 路径`);
    }
    return loadJson(`game/scenes/${scene.logic}`);
  });
  const records = [];
  for (const document_ of documents) {
    const sceneId = Number(document_?.scene_id);
    if (!Number.isInteger(sceneId) || sceneId < 0 ||
        !document_?.layers || typeof document_.layers !== "object") {
      throw new TypeError("场景 logic 正文结构无效");
    }
    for (const [kind, select] of SCENE_OBJECT_KINDS) {
      const values = select(document_.layers) || [];
      if (!Array.isArray(values)) {
        throw new TypeError(`场景 ${hexId(sceneId)} 的 ${kind} 不是数组`);
      }
      for (const record of values) {
        if (!record || typeof record !== "object" || record.id === undefined) {
          throw new TypeError(`场景 ${hexId(sceneId)} 的 ${kind} 记录无效`);
        }
        const recordSceneId = record.scene_id ?? sceneId;
        records.push({
          ...record,
          scene_id: recordSceneId,
          scene_id_hex: record.scene_id_hex || `0x${hexId(recordSceneId)}`,
          scene_object_kind: kind,
          scene_object_uid: sceneEntityResourceUid(
            kind, recordSceneId, record.id,
          ),
        });
      }
    }
  }
  return {records};
}

async function loadSceneInteractionSources({loadJson}) {
  const index = await loadJson('game/scenes/index.json');
  if (!Array.isArray(index?.editable_scenes)) throw new TypeError('场景索引缺少 editable_scenes');
  const records = await parallelMap(index.editable_scenes, async scene => {
    const logic = await loadJson(`game/scenes/${scene.logic}`);
    if (!logic?.layers) throw new TypeError(`${scene.slug} 缺交互正文`);
    return {scene, logic};
  });
  return {records};
}

function readSceneObject(document_, path, context) {
  if (path.length < 3) return MISSING;
  let index = context.memo.get("records");
  if (!index) {
    if (!Array.isArray(document_?.records)) return MISSING;
    index = new Map(document_.records.map(record => [
      `${hexId(record?.scene_id)}:${record?.scene_object_kind}:${hexId(record?.id)}`,
      record,
    ]));
    context.memo.set("records", index);
  }
  const record = index.get(
    `${hexId(path[0])}:${path[1]}:${hexId(path[2])}`,
  );
  if (record === undefined) return MISSING;
  return ownPath(record, path.slice(3));
}

/**
 * 统一注册表：固定导航文档与 UID 表共用来源、缓存、失效和竞态语义。动态场景及
 * package 分片不冒充固定表，分别走下方按 resource ID / path 缓存的正文入口。
 */
export const DATA_SCHEMAS = Object.freeze({
  ...PROJECT_DOCUMENT_SCHEMAS,
  ...RESOURCE_INDEX_SCHEMAS,
  "resource-index.audio-instructions": Object.freeze({
    source: pkg("web-project/index/audio-instructions.json"),
  }),
  "character-initial-record": Object.freeze({source: repo("character-initial-record")}),
  "fixed-text-slot": Object.freeze({source: repo("fixed-text-slot")}),
  "battle-test-point": Object.freeze({source: repo("battle-test-point")}),
  "vehicle-preset": Object.freeze({source: repo("vehicle-preset")}),
  "shell-record": Object.freeze({source: repo("shell-record")}),
  "wanted-record": Object.freeze({source: repo("wanted-record")}),
  "facility-config": Object.freeze({source: repo("facility-config")}),
  "scene-encounter-zone": Object.freeze({source: repo("scene-encounter-zone")}),
  // 剧情演出的只读分析走 project.story；可编辑值走这里，改动落在 working 层。
  "cutscene": Object.freeze({source: repo("cutscene")}),
  // 场景与镜头选择的唯一 owner。剧情页只按语义 resource ID 取只读正文，
  // 不再从 cutscene 复制同一组 scene/origin 值。
  "field-scene-lifecycle-service": Object.freeze({
    source: repo("field-scene-lifecycle-service"),
  }),
  // 开机演出的可编辑值。分析文档（地址、图块、code_driven）仍是只读 package
  // 文档；能改的那些值走 repository，改动落在 working 层。
  "boot-presentation": Object.freeze({source: repo("boot-presentation")}),
  "text.character-map": Object.freeze({source: repo("text.character-map")}),
  // 全部 UI 文本记录的定长可编辑层；目录与物理地址仍由 project.text-catalog 提供。
  "text-record": Object.freeze({source: repo("text-record")}),
  // CHR 的浏览器权威不是 layout/*.bin，而是可编辑 shared-chr-bank Original/Working
  // 里的逐 bank / tile 位面。UI、设施和场景预览都通过这一张图像基础表组装。
  "shared-chr-bank": Object.freeze({source: repo("shared-chr-bank")}),
  // 怪物战斗图形的**配方**权威。注意取的是 repository 而不是 game/visuals/index.json：
  // 后者是提取期算好的派生视图（已经展开成 chr_banks/width/height/tiles），改了
  // bank_code 或 dimension 它不会跟着变。现画必须从这份可编辑正文重新解码，
  // 否则编辑不生效——这正是不发布预渲染 PNG 的理由。
  "monster-visual-layout": Object.freeze({source: repo("monster-visual-layout")}),
  // 角色六帧地图动画的配方：帧描述符、tile delta 表、场景精灵调色板。
  // 同 monster-visual-layout 的理由——派生 index 里的 `frame_tiles` 是提取期算好的，
  // 改了 descriptor 它不会跟着变。
  "actor-visual": Object.freeze({source: repo("actor-visual")}),
  "vehicle-visual-selector": Object.freeze({source: repo("vehicle-visual-selector")}),
  "metasprite-record": Object.freeze({source: repo("metasprite-record")}),
  // 怪物页的攻击特效沿模块图逐跳读取当前 Working owner：怪物行动路径、
  // 六槽模式和视觉脚本各自仍由自己的资源拥有，页面不消费提取期复制字段。
  "enemy-action": Object.freeze({source: repo("enemy-action")}),
  "battle-result-script": Object.freeze({source: repo("battle-result-script")}),
  "enemy-action-pattern": Object.freeze({source: repo("enemy-action-pattern")}),
  "attack-visual": Object.freeze({source: repo("attack-visual")}),
  item: Object.freeze({source: repo("item-entry"), at: "records"}),
  monster: Object.freeze({source: repo("monster-profile"), at: "records"}),
  "scene-actor": Object.freeze({
    source: repo("scene-actor"),
    at: "records",
    read: readSceneActor,
  }),
  "scene-object": Object.freeze({
    source: Object.freeze({kind: "package", load: loadSceneObjects}),
    at: "records",
    read: readSceneObject,
  }),
});

function parseKey(key) {
  if (typeof key !== "string") return null;
  const separator = key.indexOf(":");
  if (separator <= 0 || separator === key.length - 1) return null;
  return {
    schema: key.slice(0, separator),
    path: key.slice(separator + 1).split(":"),
  };
}

/**
 * 创建一个按键取数实例。公开 factory 让行为契约能注入最小 registry/provider；应用
 * 使用下面导出的单例 db。
 */
export function createProjectDb({
  schemas = DATA_SCHEMAS,
  packageLoader = packageJson,
  repository = () => state.projectRepository,
  packageManifest = () => state.browserPackageManifest,
  storyPage = () => storyPageDefinitionForView(state.view)?.view,
  reportError = (message, error) => editorLog.error("数据载入", message, error),
} = {}) {
  let epoch = 0;
  const packageReads = new Map();
  let storyDocumentRepository = null;
  let storyDocumentContext = null;
  let storyScriptCodec = null;
  const baseRepository = () => typeof repository === 'function' ? repository() : repository;
  const activeRepository = () => storyDocumentRepository || baseRepository();

  async function storyPageScripts() {
    if (!storyScriptCodec) {
      const source = await load('project.story');
      const assets = await Promise.all(['story-autonomous-script', 'story-interaction-script', 'scene-actor']
        .map(async id => (await baseRepository().getOriginal(id)).value));
      const actors = assets.pop();
      storyScriptCodec = createStoryPageScriptCodec(source.document.browser_vm, assets, actors.document ?? actors);
    }
    return storyScriptCodec;
  }

  async function prepareStoryPageDocument(page) {
    const store = baseRepository();
    if (storyDocumentContext?.page === page && storyDocumentContext.store === store) return storyDocumentContext.document;
    const record = page && await store.readStoryPageDocument(page);
    if (isStoryPageDocument(record)) validateStoryPageWorking(record);
    const changed = storyDocumentRepository || isStoryPageDocument(record);
    if (changed) reset({preservePrefetch: true, preserveStoryDocument: true});
    storyDocumentContext = {page, store, document: isStoryPageDocument(record) ? record.overrides.document : null};
    storyDocumentRepository = storyDocumentContext.document ? createStoryPageRepository(store, page, record, {
      scripts: await storyPageScripts(), onChange: document => {storyDocumentContext.document = document;},
    }) : null;
    setCurrentStoryPageDefinition(storyDocumentContext.document ? {...storyPageJsonDefinition(storyDocumentContext.document,
      (await storyPageScripts()).slotsFor(storyDocumentContext.document)),
      view: page.startsWith('custom-') ? 'story-page' : page,
      editorOnly: !record.overrides.rom_entries?.length} : null);
    return storyDocumentContext.document;
  }

  async function listStoryPageDocuments() {
    return (await baseRepository().listStoryPageWorking()).filter(isStoryPageDocument)
      .map(record => ({id: record.resource_id.slice('story-page-working:'.length), title: record.overrides.document.title}));
  }

  async function createStoryPageDocument() {
    const id = `custom-${crypto.randomUUID()}`;
    await baseRepository().updateStoryPageDocument(id, () => blankStoryPage());
    return id;
  }

  async function getStoryPageEditor(page) {
    const store = baseRepository(), scripts = await storyPageScripts();
    const record = await store.readStoryPageDocument(page);
    if (!isStoryPageDocument(record)) throw new TypeError('剧情页不存在');
    validateStoryPageWorking(record);
    return {document: cloneValidatedJson(record.overrides.document), scripts,
      async change(change) {
        const next = await store.updateStoryPageDocument(page, async current => {
          const document = await change(cloneValidatedJson(current.overrides.document));
          scripts.validate(document);
          if (current.overrides.rom_entries?.length) {
            for (const entry of current.overrides.rom_entries)
              if (!document.programs.some(program => program.key === entry.key && program.kind === entry.kind))
                throw new TypeError('已绑定的指令序列不能删除或改变类型');
            for (const program of document.programs) scripts.serializeProgram(program);
          }
          return document;
        });
        storyDocumentContext = null;
        return cloneValidatedJson(next.overrides.document);
      }};
  }

  async function importStoryPageDocument(page, text) {
    const document = parseStoryPageJson(text);
    (await storyPageScripts()).validate(document);
    const story = await getDocument('project.story');
    await validateStoryPageReferences(document, baseRepository(), story.browser_vm?.sequences || []);
    const validationDb = createProjectDb({repository: baseRepository(), packageManifest, packageLoader});
    const reasons = [];
    for (const row of document.fields) {
      try {
        const field = await validationDb.getField(row.resource, row.handle, row.field);
        await validationDb.validateFieldValues([{field, value: fieldStoredValue(field, row.value)}]);
      } catch (error) {reasons.push(`${row.handle}.${row.field}：${error.message}`);}
    }
    if (reasons.length) throw new TypeError(reasons.join('\n'));
    const previous = await baseRepository().readStoryPageDocument(page);
    if (previous?.overrides.rom_entries?.length) {
      for (const program of document.programs) (await storyPageScripts()).serializeProgram(program);
      if (previous.overrides.rom_entries.length !== document.programs.length)
        throw new TypeError('已绑定剧情页的指令序列数量不能超过入口容量');
    }
    await baseRepository().updateStoryPageDocument(page, () => document);
    storyDocumentContext = null;
    return document;
  }

  async function storyPageInteractionEntries() {
    const scripts = await storyPageScripts();
    const entries = await Promise.all((await baseRepository().listStoryPageWorking()).filter(isStoryPageDocument).map(async record => {
      validateStoryPageWorking(record);
      const document = record.overrides.document, page = record.resource_id.slice('story-page-working:'.length);
      const textDisplays = new Map();
      if (document.fields.some(row => row.resource === 'text-record' || row.resource === 'text.character-map')) {
        const scoped = createProjectDb({repository: createStoryPageRepository(baseRepository(), page, record, {scripts}),
          packageManifest, packageLoader});
        const [texts, characters, catalog, fonts] = await Promise.all(['text-record', 'text.character-map',
          'project.text-catalog', 'project.text-fonts'].map(id => scoped.getDocument(id)));
        const encoding = createTextRecordEncoding(characters, catalog, fonts);
        for (const program of document.programs) for (const instruction of program.instructions)
          for (const argument of instruction.arguments) if (typeof argument.value === 'string' && argument.value.startsWith('record:')) {
            const record = texts.records[argument.value];
            if (record) textDisplays.set(argument.value, decodeFixedTextRecord(record, encoding).text);
          }
      }
      return document.programs.filter(program => program.kind === 'interaction').map(program => ({
        page, key: program.key, label: document.title, textDisplays,
        id: record.overrides.rom_entries?.find(entry => entry.key === program.key)?.script_id,
        program: scripts.projectPrograms(document).find(row => row.id === scripts.slotsFor(document).get(program.key)
          && row.kind === 'interaction'),
      }));
    }));
    return entries.flat();
  }

  async function allocateStoryPageInteraction(page, key) {
    const scripts = await storyPageScripts();
    const record = await baseRepository().allocateStoryPageRomEntries(page, scripts.serializeProgram);
    const entry = record.overrides.rom_entries.find(entry => entry.key === key && entry.kind === 'interaction');
    if (!entry) throw new TypeError('剧情页缺少交互指令序列');
    return {text_region: 0, interaction_or_record_id: entry.script_id};
  }

  async function extendedApplicationCommands() {
    return Promise.all(EXTENDED_APPLICATION_COMMANDS.map(command => getResourceDocument(applicationCommandId(command))));
  }

  async function allocateApplicationProgram(program, requestedCommand = null, stateDocument = null) {
    const origin = await getResourceDocument('application-program');
    const metadata = applicationProgramWithMetadata(origin, program);
    validateExtendedApplicationProgram(metadata, origin, {text: await getResourceDocument('text-record'),
      selection: await getResourceDocument('selection-layout')});
    await extendedApplicationCommands();
    const allocation = await baseRepository().allocateApplicationProgram(program, requestedCommand, stateDocument);
    await refreshFields('application-program');
    await refreshFields(allocation.command);
    return allocation;
  }

  async function deleteStoryPageDocument(page) {
    const record = await baseRepository().readStoryPageDocument(page);
    if (!isStoryPageDocument(record)) throw new TypeError('剧情页不存在');
    const database = storyDocumentRepository ? createProjectDb({repository: baseRepository(), packageManifest, packageLoader}) : api;
    const fields = await database.getField('scene-actor');
    const entries = record.overrides.rom_entries || [];
    const changes = [];
    for (const field of fields.filter(field => field.fieldName === 'interaction_or_record_id')) {
      const selector = fields.find(row => row.entityHandle === field.entityHandle && row.fieldName === 'text_region');
      if (selector.value !== 0 || !entries.some(entry => entry.kind === 'interaction' && entry.script_id === field.value)) continue;
      changes.push(...[field, selector].filter(row => row.hasOverride).map(field => ({field, value: field.defaultValue, reset: true})));
    }
    if (changes.length) await database.writeFields(changes);
    await baseRepository().resetStoryPageWorking(page);
    if (storyDocumentContext?.page === page) reset();
    await syncStoryFarjumpCodeWorking();
  }

  async function exportStoryPageDocument(page) {
    const store = baseRepository();
    const record = await store.readStoryPageDocument(page);
    if (isStoryPageDocument(record)) {
      return cloneValidatedJson(record.overrides.document);
    }
    const definition = storyPageDefinitionForView(page);
    const document = blankStoryPage(definition.title);
    const story = await getDocument('project.story');
    const sequence = id => {
      const source = story.browser_vm.sequences.find(row => row.id === id);
      if (!source) throw new TypeError(`执行链不存在：${id}`);
      return storySequenceJson(source);
    };
    document.sequences = (definition.sequenceIds || (definition.sequenceId ? [definition.sequenceId]
      : state.storySequenceId ? [state.storySequenceId] : []))
      .map(sequence);
    document.prelude = definition.preludeSequenceId ? sequence(definition.preludeSequenceId) : null;
    const currentAssets = await Promise.all(['story-autonomous-script', 'story-interaction-script'].map(getResourceDraft));
    const ids = [...document.sequences, ...(document.prelude ? [document.prelude] : [])].map(row => row.content.id);
    Object.assign(document, (await storyPageScripts()).exportContent(story.browser_vm.sequences.filter(row => ids.includes(row.id)),
      currentAssets, await getDocument('scene-actor')));
    for (const stop of definition.unimplementedStops || []) {
      const program = document.programs.find(row => row.kind === 'interaction' && row.slot === stop.scriptId);
      const instruction = program?.instructions.find(row => row.cursor === stop.cursor);
      if (instruction) instruction.effect = stop.effect;
    }
    for (const id of await store.listFieldWorkingResourceIds()) {
      if (!hasFieldOwner(id) || !await store.hasOriginal(id)) continue;
      if (isStoryScriptResource(id)) continue;
      const snapshot = await store.getFieldState(id);
      for (const row of snapshot.overrides) document.fields.push({resource: id, handle: row.entity_handle, field: row.field_name, value: row.value});
    }
    document.fields.sort((a, b) => JSON.stringify([a.resource, a.handle, a.field]).localeCompare(JSON.stringify([b.resource, b.handle, b.field])));
    return document;
  }
  const packageSnapshotOrigins = new WeakMap();
  function readPackage(path, {readonly = false} = {}) {
    let pending = packageReads.get(path);
    if (!pending) {
      pending = Promise.resolve().then(() => packageLoader === packageJson
        ? readonlyPackageJson(path) : packageLoader(path)).then(value => {
          const original = freezeValidatedJson(value);
          if (original && typeof original === "object") packageSnapshotOrigins.set(original, original);
          return original;
        });
      packageReads.set(path, pending);
      const clear = () => {if (packageReads.get(path) === pending) packageReads.delete(path);};
      pending.catch(clear);
    }
    return readonly ? pending : pending.then(value => {
      const copy = cloneValidatedJson(value);
      if (copy && typeof copy === "object") packageSnapshotOrigins.set(copy, value);
      return copy;
    });
  }
  const versions = new Map();
  const cache = new Map();
  const inflight = new Map();
  const manifestReads = new WeakMap();
  function fieldManifest(store) {
    let pending = manifestReads.get(store);
    if (!pending) {
      pending = Promise.resolve().then(() => store.getManifest());
      manifestReads.set(store, pending);
      const clear = () => {if (manifestReads.get(store) === pending) manifestReads.delete(store);};
      pending.then(clear, clear);
    }
    return pending;
  }
  // 少数正文的键本身就是动态资源 ID / package 分片路径（单个场景、UI 文本区、
  // 字节地图 shard）。它们仍共享 DB 生命周期，但不能伪装成一张固定 schema 表。
  const directVersions = new Map();
  const directCache = new Map();
  const directInflight = new Map();
  const unknownReported = new Set();
  const fieldResources = new Map();
  const readOnlyFieldResources = new Map();
  let fieldTargetParts = new WeakMap();
  let fieldTargets = new WeakMap();
  const previewCaptures = new Set();
  const previewRead = (kind, id) => {
    for (const capture of previewCaptures) capture.set(`${kind}:${id}`, {kind, id});
  };
  // 字段写入的唯一节拍器：每个资源一条链，写入串行、同字段合并。控件、批量编辑与
  // 重置都排进同一条链，保存状态与失败记账因此只有一份（`core/auto-save.js`）。
  const fieldWriteChains = new Map();
  let farjumpActivationChain = Promise.resolve();

  function syncStoryFarjumpCodeWorking() {
    const startedEpoch = epoch;
    const synchronize = async () => {
      if (epoch !== startedEpoch) throw new Error("剧情代码激活会话已改变");
      const assets = await Promise.all(["story-autonomous-script", "story-interaction-script"].map(getResourceDraft));
      if (!assets.every(asset => asset.farjump?.enabled === true)) return;
      let active = assets.some(asset => storyScriptWritePlan(asset).remoteScripts.length > 0);
      const pages = await baseRepository().listStoryPageWorking?.() || [];
      if (pages.some(record => record.overrides.rom_entries?.length)) {
        const snapshot = await baseRepository().getFieldState('scene-actor', {includeOriginal: true});
        const values = new Map(fieldOwner('scene-actor').describe(snapshot.original.value.document ?? snapshot.original.value)
          .map(field => {
            const override = snapshot.overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
            return [JSON.stringify([field.entityHandle, field.fieldName]), override ? fieldStoredValue(field, override.value) : field.defaultValue];
          }));
        active ||= pages.some(record => record.overrides.rom_entries?.some(entry => entry.kind === 'interaction'
          && [...values].some(([key, value]) => {
            const [handle, name] = JSON.parse(key);
            return name === 'interaction_or_record_id' && value === entry.script_id
              && values.get(JSON.stringify([handle, 'text_region'])) === 0;
          })));
      }
      const identities = [["story-script-reader", ["story-script-reader:00"]],
        ["scene-actor-runtime", ["autonomous-gate", "interaction-gate", "glyph-guard", "interaction-call", "interaction-pointer"]
          .map(id => `scene-actor-runtime:farjump:${id}`)]];
      for (const [resourceId, handles] of identities) {
        const fields = await Promise.all(handles.map(handle => getField(resourceId, handle, "enabled")));
        if (epoch !== startedEpoch) throw new Error("剧情代码激活会话已改变");
        const changes = fields.filter(field => active ? !field.hasOverride || field.value !== true : field.hasOverride)
          .map(field => ({field, value: active, reset: !active}));
        if (changes.length) await writeFields(changes);
      }
    };
    farjumpActivationChain = farjumpActivationChain.then(synchronize, synchronize);
    return farjumpActivationChain;
  }
  let sceneMapActivationChain = Promise.resolve();
  function syncSceneMapCodeWorking() {
    const startedEpoch = epoch;
    const synchronize = async () => {
      if (epoch !== startedEpoch) throw new Error('地图代码激活会话已改变');
      const ids = await baseRepository().listFieldWorkingResourceIds();
      let active = false;
      for (const id of ids.filter(id => /^scene:[0-9A-F]{2}$/.test(id) && id !== 'scene:00')) {
        const fields = await getField(id);
        active ||= fields.some(field => field.mapCodec && field.hasOverride);
        if (active) break;
      }
      if (epoch !== startedEpoch) throw new Error('地图代码激活会话已改变');
      const fields = await Promise.all(['00', '01'].map(id => getField('scene-data-stream-service', `scene-data-stream-service:${id}`, 'enabled')));
      const changes = fields.filter(field => active ? !field.hasOverride || field.value !== true : field.hasOverride)
        .map(field => ({field, value: active, reset: !active}));
      if (changes.length) await writeFields(changes);
    };
    sceneMapActivationChain = sceneMapActivationChain.then(synchronize, synchronize);
    return sceneMapActivationChain;
  }
  let fieldRepository = null;
  let fieldPackage = null;
  let originalRevisionRead = null;

  function activeOriginalRevision(store) {
    if (originalRevisionRead?.store === store) return originalRevisionRead.promise;
    const pending = {store, promise: store.activeOriginalRevisionId()};
    originalRevisionRead = pending;
    const clear = () => {if (originalRevisionRead === pending) originalRevisionRead = null;};
    pending.promise.then(clear, clear);
    return pending.promise;
  }

  function fieldWriteChain(resourceId) {
    let chain = fieldWriteChains.get(resourceId);
    if (!chain) fieldWriteChains.set(resourceId, chain = createAutoSave(
      task => task.run(),
      // 等待防抖、排队与正在提交都归这一条链（页面不再自建计时器）；失败按这一份资源的
      // 这几个字段记账：同一份的另一处写成功不替它解除。
      {scope: task => [resourceId, ...task.fields]},
    ));
    return chain;
  }

  function freezeFieldData(value) {
    if (value && typeof value === "object") {
      if (Object.isFrozen(value)) return value;
      for (const key of Object.keys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (Object.hasOwn(descriptor, "value")) freezeFieldData(descriptor.value);
      }
      Object.freeze(value);
    }
    return value;
  }

  function immutableFieldTargetPart(value) {
    if (!value || typeof value !== "object") return value;
    let snapshot = fieldTargetParts.get(value);
    if (!snapshot) {
      snapshot = packageSnapshotOrigins.get(value) || freezeValidatedJson(cloneValidatedJson(value));
      fieldTargetParts.set(value, snapshot);
    }
    return snapshot;
  }

  /**
   * Shared field instances; values publish only after a validated IDB commit.
   * 一份资源一份会话：普通取数、分页取数与实体切面拿到同一批实例与同一份快照；
   * 分页只决定 describe 的范围（`describeScope`），不另开一套实例。
   */
  async function getField(resourceId, entityHandle, fieldName, {describeOptions = {}, deferDescription = false} = {}) {
    const owner = fieldOwner(resourceId);
    for (const dependency of owner.dependencies || []) previewRead("repository", dependency);
    const currentRepository = activeRepository();
    const currentPackage = typeof packageManifest === "function" ? packageManifest() : packageManifest;
    if (!currentRepository) throw new TypeError("当前项目 repository 不可用");
    if (fieldRepository !== currentRepository || fieldPackage !== currentPackage) {
      fieldResources.clear();
      readOnlyFieldResources.clear();
      fieldTargetParts = new WeakMap();
      fieldTargets = new WeakMap();
      referenceCandidateCache.clear();
      fieldRepository = currentRepository;
      fieldPackage = currentPackage;
      subscribeWorking(currentRepository);
    }
    if (owner.hasReadOnlyField?.(entityHandle, fieldName)) {
      let pending = readOnlyFieldResources.get(resourceId);
      if (!pending) {
        pending = collectPreviewSources(() => owner.loadReadOnlyFields({database: api}));
        readOnlyFieldResources.set(resourceId, pending);
        pending.catch(() => {
          if (readOnlyFieldResources.get(resourceId) === pending) readOnlyFieldResources.delete(resourceId);
        });
      }
      const {value: fields, sources} = await pending;
      if (readOnlyFieldResources.get(resourceId) !== pending
          || activeRepository() !== currentRepository
          || (typeof packageManifest === 'function' ? packageManifest() : packageManifest) !== currentPackage)
        throw new Error("只读字段来源已改变");
      for (const source of sources) previewRead(source.kind, source.id);
      return owner.loadReadOnlyField(entityHandle, fieldName, fields);
    }
    previewRead("field", resourceId);
    let pending = fieldResources.get(resourceId);
    if (!pending) {
      const startedEpoch = epoch;
      pending = (async () => {
        const manifestPromise = fieldManifest(currentRepository);
        const targetsPromise = manifestPromise.then(async manifest => {
          const targetManifest = manifest.default_target && (!currentPackage?.default_target
            || (manifest[BOOTSTRAP_DIGEST_KEY]
              && manifest[BOOTSTRAP_DIGEST_KEY] === currentPackage[BOOTSTRAP_DIGEST_KEY]))
            ? manifest : currentPackage;
          const source = currentPackage?.browser_prepared_inputs?.field_sources;
          const targetId = targetManifest?.default_target;
          if (source?.target_id === targetId && canonicalJsonEqual(
            targetManifest.targets?.[targetId], currentPackage.targets?.[targetId])) {
            const id = owner.bindingResourceId ?? resourceId;
            const document = await getPackageDocument(`${source.path}/${fieldSourceFileName(id)}`, undefined, {readonly: true});
            return {targetManifest, targets: {[targetId]: document.target}};
          }
          let pendingTargets = targetManifest && fieldTargets.get(targetManifest);
          if (!pendingTargets) {
            pendingTargets = createStaticPackageBootstrapProvider({
              readJson: path => getPackageDocument(path, undefined, {readonly: true}),
            }).loadTargets(targetManifest || {}).then(targets => Object.fromEntries(
              Object.entries(targets).map(([id, target]) => [id, Object.freeze(Object.fromEntries(
                Object.entries(target).map(([key, value]) => [key, immutableFieldTargetPart(value)]),
              ))]),
            ));
            if (targetManifest) {
              fieldTargets.set(targetManifest, pendingTargets);
              pendingTargets.catch(() => {
                if (fieldTargets.get(targetManifest) === pendingTargets) fieldTargets.delete(targetManifest);
              });
            }
          }
          return {targetManifest, targets: await pendingTargets};
        });
        const [manifest, fieldState, {targetManifest, targets}] = await Promise.all([
          manifestPromise,
          currentRepository.getFieldState(resourceId, {includeOriginal: true}),
          targetsPromise,
        ]);
        const {original, ...snapshot} = fieldState;
        if (!original?.value || !manifest?.project_id) throw new TypeError("字段缺少 Original / 项目身份");
        const targetId = targetManifest?.default_target;
        // 同一份目标正文的不可变快照由全部字段会话共用。
        const target = targets[targetId];
        const bindingResourceId = owner.bindingResourceId ?? resourceId;
        const binding = target?.bindings?.bindings?.find(entry => entry.asset_id === bindingResourceId);
        if (bindingResourceId !== resourceId) {
          const route = currentPackage?.browser_original_assets?.find(row => row.resource_id === resourceId)?.build_route;
          const writeback = original.value.document?.writeback;
          const componentOwner = route === undefined && binding?.input?.components?.some(row => row.resource_id === resourceId);
          const projectionOwner = route?.kind === "projection" && route.resource_id === bindingResourceId
            && route.compiler_id === owner.compilerId
            && writeback?.binding_resource_id === bindingResourceId
            && writeback.compiler_id === owner.compilerId
            && JSON.stringify(writeback.fragment_ids) === JSON.stringify(owner.fragmentIds);
          if (!componentOwner && !projectionOwner)
            throw new TypeError(`${resourceId} 字段构建投影未发布或已改变`);
        }
        if (binding && binding.compiler_id !== owner.compilerId) {
          throw new TypeError(`${resourceId} 字段 codec 与 binding 不一致`);
        }
        const alive = () => epoch === startedEpoch
          && fieldResources.get(resourceId) === pending
          && (activeRepository()) === currentRepository
          && (typeof packageManifest === "function" ? packageManifest() : packageManifest) === currentPackage;
        if (snapshot.revisionId !== original.revision_id) throw new Error("字段默认来源在读取期间改变");
        const fields = new Map();
        fields.aliases = new Map();
        fields.bindings = new Map();
        fields.snapshot = freezeFieldData(snapshot);
        fields.repository = currentRepository;
        // 会话建立时已取的 Original 留在这里：分页读与全量读都用它，不再逐次回读
        // （shared-chr-bank 的 Original 是 5 MB，回读一次约 0.17 秒）。revision 与
        // snapshot 的一致性在下面断言过，会话失效由 epoch/repository 变化判定。
        fields.original = original;
        let indexedSnapshot, overrides;
        fields.override = key => {
          if (!fields.snapshot.overrides.length) return undefined;
          if (indexedSnapshot !== fields.snapshot) {
            overrides = new Map(fields.snapshot.overrides.map(entry =>
              [JSON.stringify([entry.entity_handle, entry.field_name]), entry]));
            indexedSnapshot = fields.snapshot;
          }
          return overrides.get(key);
        };
        fields.alive = alive;
        const document_ = repositoryDocument(original.value, resourceId);
        const preparedPath = currentPackage?.browser_prepared_inputs?.field_descriptions?.[resourceId];
        const prepared = preparedPath && !owner.documentScopes ? await readPackage(preparedPath, {readonly: true}) : null;
        const descriptions = prepared?.descriptions.map(description => ({...description,
          defaultValue: ownPath(document_, description.documentPath)}));
        fields.describe = options => descriptions || owner.describe(document_, {asset: original.value, ...options});
        // 分片、来源与 slot 表按资源建索引，字段定位才不必每个字段线性扫全表。
        // text-record 有 2557 片、8198 个 slot，逐字段扫是二次方。
        const locationIndex = fieldLocationIndex(binding, target);
        // 同一字段身份只构造一次实例：分页与会话合并都复用它，不造第二份。
        const addField = description => {
          const key = JSON.stringify([description.entityHandle, description.fieldName]);
          const existing = fields.get(key) || fields.aliases.get(key);
          if (existing) return existing;
          validateFieldPhysicalDeclaration(resourceId, description, owner);
          const {fragmentId, offsetInFragment, byteLength, byteOffsetsInFragment, additionalFragments = [],
            publishedAddress, defaultValue, ...identity} = description;
          let physical = null;
          if (publishedAddress !== undefined) {
            if (description.writeback?.state !== "unpermitted"
                || publishedAddress?.space !== "prg"
                || !Number.isSafeInteger(publishedAddress.offset)
                || !Number.isSafeInteger(publishedAddress.length)
                || publishedAddress.length < 1
                || publishedAddress.end_exclusive !== publishedAddress.offset + publishedAddress.length) {
              throw new TypeError(`${resourceId} 字段发布地址无效`);
            }
            physical = {kind: "published-address", address: structuredClone(publishedAddress)};
          }
          // Semantic/read-only fields may have no physical fragment.  A
          // published binding only authorizes locating fields that actually
          // declare one; absence of fragmentId is the explicit no-address
          // shape, not a malformed physical reference.
          if (binding && description.fragmentId !== undefined) {
            const slotHasBindingSource = (entry, slot) => slot && (
              slot.owner === bindingResourceId ||
              (typeof slot.atomic_group === "string" && slot.atomic_group.length > 0 &&
                slot.owner === `asset-group:${slot.atomic_group}` &&
                slot.region === entry.region &&
                slot.file_offset + entry.offset_in_slot === entry.file_offset)
            );
            const locate = ({fragmentId, offsetInFragment, byteLength, byteOffsetsInFragment}) => {
              const component = locationIndex.component(fragmentId);
              const source = component
                ? locationIndex.source(component.asset_offset, component.length) : undefined;
              const slot = source ? locationIndex.slot(source.slot_id) : undefined;
              const offsets = byteOffsetsInFragment ?? Array.from({length: byteLength}, (_, byte) => offsetInFragment + byte);
              if (!component
                  || (owner.fragmentIds && !owner.fragmentIds.includes(fragmentId))
                  || !Number.isSafeInteger(byteLength) || byteLength < 1 || !Array.isArray(offsets)
                  || offsets.length !== byteLength || new Set(offsets).size !== byteLength || offsets[0] !== offsetInFragment
                  || offsets.some(offset => !Number.isSafeInteger(offset) || offset < 0 || offset >= component.length)) {
                throw new TypeError(`${resourceId} 字段物理引用无效：${fragmentId}`);
              }
              if (source && slotHasBindingSource(source, slot)
                  && Number.isInteger(source.offset_in_slot)
                  && source.offset_in_slot + component.length <= slot.capacity) {
                return {targetId, binding, component, source, slot, offsetInFragment, byteLength,
                  ...(byteOffsetsInFragment ? {byteOffsetsInFragment: [...byteOffsetsInFragment]} : {})};
              }
              if (byteOffsetsInFragment || offsetInFragment !== 0 || byteLength !== component.length) {
                throw new TypeError(`${resourceId} 字段物理引用无效：${fragmentId}`);
              }
              const locations = (binding.sources || []).filter(entry =>
                entry.asset_offset >= component.asset_offset
                && entry.asset_offset + entry.length <= component.asset_offset + component.length)
                .sort((left, right) => left.asset_offset - right.asset_offset)
                .map(entry => ({source: entry, slot: locationIndex.slot(entry.slot_id)}));
              let cursor = component.asset_offset;
              if (!locations.length || locations.some(location => {
                const valid = location.source.asset_offset === cursor &&
                  slotHasBindingSource(location.source, location.slot)
                  && Number.isInteger(location.source.offset_in_slot)
                  && location.source.offset_in_slot + location.source.length <= location.slot.capacity;
                cursor += location.source.length;
                return !valid;
              }) || cursor !== component.asset_offset + component.length) {
                throw new TypeError(`${resourceId} 字段物理引用无效：${fragmentId}`);
              }
              return {targetId, binding, component, offsetInFragment, byteLength,
                locations: locations.map(({source: part, slot: partSlot}) => ({
                  targetId, binding, component, source: part, slot: partSlot,
                  offsetInFragment: part.asset_offset - component.asset_offset,
                  byteLength: part.length,
                }))};
            };
            physical = locate(description);
            if (!Array.isArray(additionalFragments)) throw new TypeError("字段附加物理引用必须是数组");
            if (additionalFragments.length) {
              const locations = [physical, ...additionalFragments.map(locate)];
              const keys = locations.flatMap(location => (location.locations || [location])).flatMap(location => (location.byteOffsetsInFragment ??
                Array.from({length: location.byteLength}, (_, index) => location.offsetInFragment + index))
                .map(offset => `${location.component.fragment_id}:${offset}`));
              if (new Set(keys).size !== keys.length) throw new TypeError("字段物理引用重复");
              physical = {...physical, locations};
            }
          }
          const data = freezeFieldData({...identity, moduleId: resourceId,
            key: [manifest.project_id, resourceId, identity.entityHandle, identity.fieldName],
            source: {kind: owner.defaultSourceKind ?? "rom", revisionId: original.revision_id},
            defaultValue, physical,
          });
          const field = {};
          for (const key of Object.keys(data)) Object.defineProperty(field, key, {
            enumerable: true, get() {
              if (!alive()) throw new Error("字段会话已失效，请重新解引用");
              return data[key];
            },
          });
          const currentOverride = () => {
            if (!alive()) throw new Error("字段会话已失效，请重新解引用");
            return fields.override(key);
          };
          let valueOverride, effectiveValue;
          for (const [key, read] of Object.entries({
            value: () => {
              const override = currentOverride();
              if (!override) return data.defaultValue;
              if (valueOverride !== override) {
                effectiveValue = freezeFieldData(fieldStoredValue(data, override.value));
                valueOverride = override;
              }
              return effectiveValue;
            },
            workingValue: () => currentOverride()?.value,
            romValue: () => fieldRomValue(field),
            hasOverride: () => currentOverride() !== undefined,
            dirty: () => currentOverride() !== undefined,
            version: () => {currentOverride(); return fields.snapshot.version;},
          })) Object.defineProperty(field, key, {enumerable: true, get: read});
          field.bind = (target, render) => {
            if (!alive()) throw new Error("字段会话已失效，请重新解引用");
            if (!target || typeof render !== "function") throw new TypeError("字段绑定需要目标与绘制器");
            let bindings = fields.bindings.get(field);
            if (!bindings) fields.bindings.set(field, bindings = new Set());
            const binding = {target: new WeakRef(target), render};
            render(target, field.value, field, "initial");
            bindings.add(binding);
            return () => bindings.delete(binding);
          };
          // 版本在写入链执行那一刻取（见 `writeFields`），连笔编辑不会自己顶掉自己。
          field.set = (value, options = {}) => {
            const captured = {...options, storyPage: options.storyPage ?? storyPage()};
            return import("./project-data.js").then(({setProjectField}) => setProjectField(api, field, value, captured));
          };
          field.reset = (options = {}) => {
            const captured = {...options, storyPage: options.storyPage ?? storyPage()};
            return import("./project-data.js").then(({resetProjectField}) => resetProjectField(api, field, captured));
          };
          Object.defineProperty(field, "_fieldSession", {value: fields});
          fields.set(key, Object.freeze(field));
          for (const alias of identity.entityAliases || []) {
            const aliasKey = JSON.stringify([alias, identity.fieldName]);
            if (fields.has(aliasKey) || fields.aliases.has(aliasKey)) throw new TypeError("字段别名重复");
            fields.aliases.set(aliasKey, field);
          }
          return field;
        };
        fields.addField = addField;
        fields.scopes = new Set();
        // 分页只收窄 describe 的范围；重复描述同一身份时复用实例，不重复登记。
        fields.describeScope = options => {
          const scopeKey = JSON.stringify([options.objectOffset ?? null, options.objectLimit ?? null]);
          if (fields.scopes.has(scopeKey)) return;
          fields.scopes.add(scopeKey);
          for (const description of fields.describe(options))
            addField(description);
        };
        if (!deferDescription && entityHandle === undefined) fields.describeScope(describeOptions);
        if (!alive()) throw new Error("字段加载期间项目已改变");
        return fields;
      })();
      fieldResources.set(resourceId, pending);
    }
    let fields;
    try {
      fields = await pending;
      pending.session = fields;
      await refreshFields(resourceId);
    } catch (error) {
      if (fieldResources.get(resourceId) === pending) fieldResources.delete(resourceId);
      throw error;
    }
    if (entityHandle === undefined) {
      // 普通清单补齐全量；字段对象分页只描述请求的范围。
      if (!deferDescription) fields.describeScope(describeOptions);
      return [...fields.values()];
    }
    const key = JSON.stringify([entityHandle, fieldName]);
    let field = fields.get(key) || fields.aliases.get(key);
    if (!field && fields.descriptions?.has(key)) field = fields.addField(fields.descriptions.get(key));
    if (!field) {
      if (!fields.descriptions?.has(key)) {
        fields.descriptions ||= new Map();
        const asset = fields.original.value;
        const document_ = repositoryDocument(asset, resourceId);
        const options = owner.fieldScope?.(document_, entityHandle, fieldName) || {};
        for (const description of fields.describe(options))
          for (const handle of [description.entityHandle, ...(description.entityAliases || [])])
            fields.descriptions.set(JSON.stringify([handle, description.fieldName]), description);
      }
      if (fields.descriptions.has(key)) fields.addField(fields.descriptions.get(key));
      field = fields.get(key) || fields.aliases.get(key);
    }
    if (!field) throw new TypeError(`未登记字段：${entityHandle}/${fieldName}`);
    return field;
  }

  function fieldRevision(resourceId) {
    const session = fieldResources.get(resourceId)?.session;
    if (!session?.alive()) return null;
    return `${session.snapshot.revisionId}:${session.snapshot.version}`;
  }

  function peekFieldSession(resourceId) {
    const fields = fieldResources.get(resourceId)?.session;
    if (!fields?.alive()) return null;
    previewRead('field', resourceId);
    for (const dependency of fieldOwner(resourceId).dependencies || []) previewRead('repository', dependency);
    return fields;
  }

  function peekField(resourceId, entityHandle, fieldName) {
    const fields = peekFieldSession(resourceId);
    if (!fields) return null;
    const key = JSON.stringify([entityHandle, fieldName]);
    return fields.get(key) || fields.aliases.get(key) || null;
  }

  function peekFieldObject(resourceId, id) {
    const fields = peekFieldSession(resourceId);
    return fields?.objectInstances?.get(id) || null;
  }

  async function getFieldObjects(resourceId, {offset = 0, limit = undefined} = {}) {
    const owner = fieldOwner(resourceId);
    if (!owner.objects) throw new TypeError(`模块未声明字段对象：${resourceId}`);
    if (limit !== undefined) {
      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1)
        throw new TypeError("字段对象分页范围无效");
      // 分页只收窄这一页的 describe 范围；字段实例、快照与绑定仍归同一份会话，
      // 因此分页实例与普通实例是同一批对象，写入与重置立刻互相可见。
      await getField(resourceId, undefined, undefined, {
        describeOptions: {objectOffset: offset, objectLimit: limit},
      });
      const fields = await fieldResources.get(resourceId);
      if (!fields.alive()) throw new Error("字段对象来源已改变");
      const original = fields.original;
      const produced = owner.objects(repositoryDocument(original.value, resourceId),
        {asset: original.value, offset, limit});
      // 全量 owner 按请求范围裁剪定义，分页 owner 保留已裁剪的定义。
      const definitions = produced.length > limit ? produced.slice(offset, offset + limit) : produced;
      // 对象函数不吃分页参数的 owner：这一页的定义会伸到未描述的范围，退回全量描述。
      const missing = definitions.some(definition => definition.fields.some(([handle, name]) =>
        !fields.get(JSON.stringify([handle, name]))));
      if (missing) fields.describeScope({});
      return Object.freeze(definitions.map(definition =>
        createFieldObject(freezeFieldData(definition), fields, api, owner)));
    }
    await getField(resourceId);
    const fields = await fieldResources.get(resourceId);
    const createObjects = definitions => Object.freeze(definitions.map(definition => {
      fields.objectInstances ||= new Map();
      if (!fields.objectInstances.has(definition.id)) fields.objectInstances.set(definition.id,
        createFieldObject(freezeFieldData(definition), fields, api, owner));
      return fields.objectInstances.get(definition.id);
    }));
    if (!fields.objects) fields.objects = (async () => {
      if (!fields.alive()) throw new Error("字段对象来源已改变");
      const definitions = owner.objects(repositoryDocument(fields.original.value, resourceId),
        {asset: fields.original.value});
      if (new Set(definitions.map(row => row.id)).size !== definitions.length) throw new TypeError("字段对象身份重复");
      return createObjects(definitions);
    })();
    return fields.objects;
  }

  async function getFieldObjectCount(resourceId) {
    const owner = fieldOwner(resourceId);
    if (!owner.objects) throw new TypeError(`模块未声明字段对象：${resourceId}`);
    if (typeof owner.objectCount === "function") {
      // 已有会话就用它的 Original；没有会话不为一次计数单开一份。
      const session = fieldResources.get(resourceId);
      const currentRepository = activeRepository();
      const original = session
        ? (await session).original : await currentRepository.getOriginal(resourceId);
      const count = owner.objectCount(repositoryDocument(original.value, resourceId),
        {asset: original.value});
      if (!Number.isInteger(count) || count < 0) throw new TypeError("字段对象总数无效");
      return count;
    }
    return (await getFieldObjects(resourceId)).length;
  }

  async function getFieldObject(resourceId, id) {
    const owner = fieldOwner(resourceId);
    if (!owner.objects) throw new TypeError(`模块未声明字段对象：${resourceId}`);
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    const fields = await fieldResources.get(resourceId);
    if (!fields.alive()) throw new Error('字段对象来源已改变');
    fields.objectInstances ||= new Map();
    if (fields.objectInstances.has(id)) return fields.objectInstances.get(id);
    if (!fields.objectDefinitions) {
      const definitions = owner.objects(repositoryDocument(fields.original.value, resourceId),
        {asset: fields.original.value});
      const indexed = new Map(definitions.map(definition => [definition.id, definition]));
      if (indexed.size !== definitions.length) throw new TypeError('字段对象身份重复');
      fields.objectDefinitions = indexed;
    }
    const definition = fields.objectDefinitions.get(id);
    if (!definition) throw new TypeError(`字段对象不存在：${resourceId}/${id}`);
    const selected = await Promise.all(definition.fields.map(([handle, name]) => getField(resourceId, handle, name)));
    if (!fields.alive()) throw new Error('字段对象来源已改变');
    if (!fields.objectInstances.has(id)) fields.objectInstances.set(id,
      createFieldObject(freezeFieldData(definition), selected, api, owner));
    return fields.objectInstances.get(id);
  }

  async function readBuildFields(resourceId, buildRepository, revisionId) {
    if (storyDocumentRepository) return createProjectDb({repository: baseRepository(),
      packageManifest: typeof packageManifest === 'function' ? packageManifest() : packageManifest,
      packageLoader}).readBuildFields(resourceId, buildRepository, revisionId);
    const current = baseRepository;
    if (current() !== buildRepository) throw new Error("构建与字段不属于同一项目会话");
    const fields = await getField(resourceId);
    await refreshFields(resourceId);
    if (fields.some(field => field.source.revisionId !== revisionId)) {
      throw new Error("构建与字段默认来源不一致");
    }
    const assertCurrent = async () => {
      const snapshot = await buildRepository.getFieldState(resourceId);
      if (current() !== buildRepository || snapshot.revisionId !== revisionId) {
        throw new Error("构建与字段默认来源不一致");
      }
    };
    return {fields, assertCurrent};
  }

  /** A read-only document-shaped view. Editable leaves read the shared objects. */
  async function readResource(resourceId) {
    const store = activeRepository();
    if (!hasFieldDocumentView(resourceId)) return store.resolve(resourceId, {materialize: false, fieldDb: api});
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    // 会话建立时取到的 Original 就是本会话快照的默认来源，不再回读整份值
    // （text-record 是 2.9 MB）；激活的 revision 变了仍要 fail closed。
    const session = await fieldResources.get(resourceId);
    if (await activeOriginalRevision(store) !== session.original.revision_id) {
      throw new Error("字段默认来源在投影期间改变");
    }
    if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
    if (!session.view) {
      const pending = projectFieldResource(resourceId, store, session);
      session.view = pending;
      pending.catch(() => {if (session.view === pending) session.view = null;});
    }
    return session.view;
  }

  async function projectFieldResource(resourceId, store, session) {
    const original = session.original;
    const owner = fieldOwner(resourceId);
    const copy = node => Array.isArray(node) ? [...node] : {...node};
    // 只读投影只复制字段路径上的容器，其余正文与 Origin 共用。
    const mutableProjection = owner.projectView && !owner.projectViewReadonly;
    let value = mutableProjection ? cloneValidatedJson(original.value) : null;
    const paths = new Map();
    session.descriptions ||= new Map();
    const describePaths = (options = {}, paths = new Map(), prefix = []) => {
      for (const description of session.describe(options)) {
        const descriptionKey = JSON.stringify([description.entityHandle, description.fieldName]);
        const defaultValue = freezeFieldData(description.defaultValue);
        for (const handle of [description.entityHandle, ...(description.entityAliases || [])]) {
          session.descriptions.set(JSON.stringify([handle, description.fieldName]), description);
        }
        let field;
        const currentField = () => field ||= session.addField(description);
        const currentValue = () => {
          if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
          if (!owner.materializeOnRead && !field && !session.override(descriptionKey)) return defaultValue;
          return currentField().value;
        };
        for (const fullPath of fieldAssetPaths(description)) {
          const path = fullPath.slice(prefix.length);
          if (mutableProjection) {
            const parent = path.slice(0, -1).reduce((row, key) => row[key], value);
            Object.defineProperty(parent, path.at(-1), {enumerable: true, get: currentValue});
          } else {
            let node = paths;
            for (const key of path.slice(0, -1)) {
              if (!node.has(String(key))) node.set(String(key), new Map());
              node = node.get(String(key));
            }
            node.set(String(path.at(-1)), currentValue);
          }
        }
      }
      return paths;
    };
    const projectContainer = (source, paths) => {
      const result = copy(source);
      for (const [key, entry] of paths) {
        let child;
        const get = typeof entry === "function" ? entry
          : projectFieldContainerGetter(() => child ||= projectContainer(source[key], entry));
        Object.defineProperty(result, key, {enumerable: true, get});
      }
      return Object.freeze(result);
    };
    const scopes = owner.documentScopes?.(repositoryDocument(original.value, resourceId));
    if (scopes) {
      for (const scope of scopes) {
        const path = [...(original.value.document ? ['document'] : []), ...scope.path];
        let node = paths;
        for (const key of path.slice(0, -1)) {
          if (!node.has(String(key))) node.set(String(key), new Map());
          node = node.get(String(key));
        }
        let child;
        node.set(String(path.at(-1)), projectFieldContainerGetter(() => {
          if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
          return child ||= projectContainer(ownPath(original.value, path),
            describePaths(scope.describeOptions, new Map(), path));
        }));
      }
    } else describePaths({}, paths);
    if (!mutableProjection) value = projectContainer(freezeValidatedJson(original.value), paths);
    await owner.projectView?.(value.document, {
      repository: store, revisionId: original.revision_id,
      originDocument: repositoryDocument(original.value, resourceId),
    });
    if (owner.projectView) freezeFieldData(value);
    trackProjectFieldProjection(value, original.value, () => session.snapshot.version);
    trackProjectFieldProjection(repositoryDocument(value, resourceId),
      repositoryDocument(original.value, resourceId), () => session.snapshot.version);
    if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
    return {value, revision_id: original.revision_id,
      get version() {
        if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
        return session.snapshot.version;
      },
      get dirty() {
        if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
        return session.snapshot.overrides.length > 0;
      }};
  }

  async function getResourceDraft(resourceId) {
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    const session = await fieldResources.get(resourceId);
    if (await activeOriginalRevision(session.repository) !== session.original.revision_id)
      throw new Error("字段默认来源在草稿准备期间改变");
    const asset = session.original.value;
    if (!session.draftPaths) {
      session.draftPaths = new Map();
      for (const description of fieldOwner(resourceId).describe(repositoryDocument(asset, resourceId), {asset})) {
        let field;
        const resolve = () => field ||= session.addField(description);
        for (const path of description.documentPaths || [description.documentPath])
          session.draftPaths.set(JSON.stringify(path), resolve);
      }
    }
    const {createProjectFieldDraft} = await import("./project-field-draft.js");
    return createProjectFieldDraft(freezeValidatedJson(repositoryDocument(asset, resourceId)), session.draftPaths, {version: () => {
      if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
      return session.snapshot.version;
    }});
  }

  async function getFieldSelectionSource(resourceId) {
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    const session = await fieldResources.get(resourceId);
    if (await activeOriginalRevision(session.repository) !== session.original.revision_id)
      throw new Error("字段选区默认来源已改变");
    if (!session.selectionSource) {
      const original = session.original.value;
      session.selectionSource = {
        original,
        fields: fieldOwner(resourceId).describe(repositoryDocument(original, resourceId), {asset: original}),
        resolve: description => session.addField(description),
        overridden: description => {
          if (!session.alive()) throw new Error("字段会话已失效，请重新解引用");
          return session.snapshot.overrides.some(entry => entry.entity_handle === description.entityHandle
            && entry.field_name === description.fieldName);
        },
        get version() {if (!session.alive()) throw new Error("字段会话已失效，请重新解引用"); return session.snapshot.version;},
        get dirty() {if (!session.alive()) throw new Error("字段会话已失效，请重新解引用"); return session.snapshot.overrides.length > 0;},
      };
    }
    return session.selectionSource;
  }

  /**
   * 字段写入的唯一入口：排进本资源的写入链，返回这一笔落定的 Promise。
   * 每笔写入在仓库事务中基于最新 Working 提交。
   */
  async function writeField(field, value, options) {
    await writeFields([{field, value, reset: options?.reset === true, selection: options?.selection}], options);
    return field;
  }

  function writeFields(changes, options) {
    if (!Array.isArray(changes) || !changes.length) throw new TypeError("字段批次不能为空");
    const resourceId = changes[0]?.field?.resourceId, seen = new Set();
    for (const {field} of changes) {
      if (!field || field.resourceId !== resourceId || seen.has(field))
        throw new Error("字段不属于当前 DB 会话或批次身份重复");
      seen.add(field);
    }
    // 保存合并键须包含字段身份与数组选区。
    const key = JSON.stringify(changes.map(({field, selection}) =>
      [field.entityHandle, field.fieldName, ...(selection === undefined ? [] : [selection])]).sort());
    const page = isStoryScriptResource(resourceId) ? options?.storyPage ?? storyPage() : undefined;
    return fieldWriteChain(resourceId).commit(`${page || ""}:${key}`, {
      fields: changes.map(change => change.field),
      run: () => commitFieldWrite(resourceId, changes, {...options, storyPage: page}),
    });
  }

  // 有候选声明的字段只接受已发布候选：非法引用在落 Working 之前就被拒。
  // 三条声明都认：字段自带的 `serialization.references`、owner 的 `referenceCandidates`
  // （值为整段时直接比，值为一张表时按 `elementPath` 逐条比）。
  const referenceCandidateCache = new Map();

  async function declaredReferenceRule(field) {
    const declared = field.serialization?.references;
    if (Array.isArray(declared)) return {values: declared, elementPath: null};
    const owner = fieldOwner(field.resourceId);
    const rule = typeof owner.referenceCandidates === "function"
      ? owner.referenceCandidates(field) : null;
    if (!rule) return null;
    const source = rule.source ?? rule;
    const key = candidateSourceIdentity(source);
    if (!referenceCandidateCache.has(key))
      referenceCandidateCache.set(key, resolveCandidateValues(api, source));
    return {values: await referenceCandidateCache.get(key), elementPath: rule.elementPath ?? null};
  }

  function valueInCandidates(allowed, value) {
    return allowed.some(candidate => candidate === value
      || (candidate && value && typeof candidate === "object" && typeof value === "object"
        && canonicalJsonEqual(candidate, value)));
  }

  /** 整段就是一个值的字段（一张表）按 `elementPath` 取出每个元素；形状不认识就返回 null。 */
  function candidateElements(value, elementPath) {
    const entries = Array.isArray(value)
      ? value
      : (value && typeof value === "object" ? Object.values(value) : null);
    if (!entries) return null;
    return entries.map(entry => candidatePath(entry, elementPath));
  }

  async function assertReferenceCandidates(changes) {
    for (const change of changes) {
      if (change.reset || change.value === undefined) continue;
      const field = change.field;
      const value = change.value;
      // 发布正文里的原值永远放行：候选表是给新值用的，不是用来锁死 Origin 的。
      if (value === field.defaultValue) continue;
      const rule = await declaredReferenceRule(field);
      if (!rule) continue;
      if (!rule.elementPath) {
        if (!valueInCandidates(rule.values, value)) {
          throw new TypeError(`${field.entityHandle}.${field.fieldName} 不是已发布候选：${
            JSON.stringify(value)}`);
        }
        continue;
      }
      const elements = candidateElements(value, rule.elementPath);
      if (!elements) continue;
      const originElements = new Set((candidateElements(field.defaultValue, rule.elementPath) || [])
        .map(element => JSON.stringify(element)));
      for (const element of elements) {
        if (element === undefined) continue;
        if (originElements.has(JSON.stringify(element))) continue;
        if (!valueInCandidates(rule.values, element)) {
          throw new TypeError(`${field.entityHandle}.${field.fieldName} 的元素不是已发布候选：${
            JSON.stringify(element)}`);
        }
      }
    }
  }

  async function commitFieldWrite(resourceId, changes, options) {
    const seen = new Set();
    const fields = changes[0]?.field?._fieldSession || await fieldResources.get(resourceId);
    for (const {field} of changes) {
      if (!field || field.resourceId !== resourceId || seen.has(field)
          || fields.get(JSON.stringify([field.entityHandle, field.fieldName])) !== field)
        throw new Error("字段不属于当前 DB 会话或批次身份重复");
      seen.add(field);
    }
    if (!fields.alive()) throw new Error("字段会话已失效");
    await assertReferenceCandidates(changes);
    const previous = fields.snapshot;
    const snapshot = await fields.repository.writeFieldValues(resourceId, changes.map(({field, value, reset = false, selection}) =>
      ({entityHandle: field.entityHandle, fieldName: field.fieldName, value, reset, selection})),
    {...options, expectedRevisionId: changes[0].field.source.revisionId});
    if (!fields.alive()) throw new Error("字段写入已提交，但会话已改变，请重新解引用");
    fields.snapshot = freezeFieldData(snapshot);
    invalidateFieldProjections(resourceId);
    // 控件先接收本次提交，再接收其它字段的外部修改。
    for (const {field, reset} of changes) publishFieldBindings(fields, field, reset ? "reset" : "write");
    for (const field of fields.values()) {
      if (seen.has(field)) continue;
      const before = previous.overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
      const after = snapshot.overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
      if (!canonicalJsonEqual(before ?? null, after ?? null)) publishFieldBindings(fields, field);
    }
    if ((isStoryScriptResource(resourceId) || resourceId === 'scene-actor') && !storyDocumentRepository)
      await syncStoryFarjumpCodeWorking();
    if (/^scene:[0-9A-F]{2}$/.test(resourceId) && !storyDocumentRepository) await syncSceneMapCodeWorking();
    return changes.map(({field}) => field);
  }

  // 派生正文须先失效，再通知视图；字段实例保持当前会话身份。
  function invalidateFieldProjections(resourceId) {
    if (MONSTER_VISUAL_OWNER_IDS.includes(resourceId)) invalidateResource(MONSTER_VISUAL_RESOURCE_ID);
    invalidateDirect("repository", resourceId);
    for (const [schema, spec] of Object.entries(schemas)) {
      if (spec.source?.kind === "repository" && spec.source.resourceId === resourceId) invalidate(schema);
    }
  }

  function publishFieldBindings(fields, changed = null, reason = "refresh") {
    const entries = changed ? [[changed, fields.bindings.get(changed) || []]] : fields.bindings;
    for (const [field, bindings] of entries) {
      for (const binding of bindings) {
        const target = binding.target.deref();
        if (!target || target.isConnected === false) {bindings.delete(binding); continue;}
        // A broken renderer must not turn a committed storage write into a failed save.
        try {binding.render(target, field.value, field, reason);} catch (error) {queueMicrotask(() => {throw error;});}
      }
    }
  }

  async function refreshFields(resourceId) {
    const pending = fieldResources.get(resourceId);
    if (!pending) return;
    const fields = await pending;
    if (fields.refreshPromise) return fields.refreshPromise;
    const request = (async () => {
      do {
        fields.refreshAgain = false;
        const observed = fields.snapshot;
        const snapshot = await fields.repository.getFieldState(resourceId);
        if (!fields.alive() || fields.snapshot.revisionId !== snapshot.revisionId) {
          fieldResources.delete(resourceId);
          throw new Error("字段默认来源或会话已改变，请重新解引用");
        }
        if (fields.snapshot !== observed) continue;
        if (snapshot.version === observed.version && canonicalJsonEqual(snapshot.overrides, observed.overrides)) continue;
        fields.snapshot = freezeFieldData(snapshot);
        invalidateFieldProjections(resourceId);
        publishFieldBindings(fields);
      } while (fields.refreshAgain);
    })();
    fields.refreshPromise = request;
    try {await request;}
    finally {if (fields.refreshPromise === request) fields.refreshPromise = null;}
  }

  let workingSubscription = null;
  function subscribeWorking(repository) {
    workingSubscription?.();
    workingSubscription = repository.subscribeWorking?.(() => {
      for (const [schema, spec] of Object.entries(schemas)) if (spec.source?.kind === "repository") invalidate(schema);
      for (const id of fieldResources.keys()) {
        const session = fieldResources.get(id).session;
        if (session?.refreshPromise) session.refreshAgain = true;
        refreshFields(id).catch(error => console.error(error));
      }
      for (const key of directCache.keys()) if (key.startsWith("repository:"))
        invalidateDirect("repository", key.slice("repository:".length));
    });
  }

  async function discardFieldWorking(resourceId) {
    const currentRepository = activeRepository();
    const result = await currentRepository.discardFieldWorking(resourceId);
    invalidateResource(resourceId);
    if (isStoryScriptResource(resourceId) || resourceId === 'scene-actor') await syncStoryFarjumpCodeWorking();
    if (/^scene:[0-9A-F]{2}$/.test(resourceId)) await syncSceneMapCodeWorking();
    return result;
  }

  async function storyScriptOwner(resourceId, scriptId) {
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    return (await fieldResources.get(resourceId)).snapshot.storyOwners?.[scriptId] ?? null;
  }

  async function resetStoryPageWorking(page) {
    if (storyDocumentContext?.document) {
      const page = storyDocumentContext.page;
      const record = await baseRepository().readStoryPageDocument(page);
      const changed = [...new Set([...record.overrides.document.fields.map(row => row.resource),
        ...record.overrides.document.programs.map(row => `story-${row.kind}-script`)])];
      const scripts = await storyPageScripts();
      await baseRepository().updateStoryPageDocument(page, current =>
        ({...current.overrides.document, fields: [], programs: scripts.resetPrograms(current.overrides.document)}));
      storyDocumentContext = null;
      await prepareStoryPageDocument(page);
      for (const id of changed) await refreshFields(id);
      return changed;
    }
    for (const id of ["story-autonomous-script", "story-interaction-script"])
      await fieldWriteChains.get(id)?.flush();
    const currentRepository = activeRepository();
    const changed = await currentRepository.resetStoryPageWorking(page);
    for (const id of changed) await refreshFields(id);
    if (changed.length) await syncStoryFarjumpCodeWorking();
    return changed;
  }

  async function assertStoryPageWorking(page) {
    const store = activeRepository();
    await store.assertStoryPageWorking(page);
  }

  /**
   * Working inventory is another view of the held fields, never a value copy.
   *
   * 每行都带 `ownership`，按归属走对应重置入口：
   * - `save-domain`：存档域缓冲（`save-current`），取消由存档域自己的入口负责；
   * - `project-fields`：项目资源且已有字段对象，整资源回 Original 走 `discardFieldWorking`；
   * - `project-document`：项目资源但还没有字段对象（只剩整文档写入），要先补字段声明；
   * - `invalid`：当前版本没有 Original，也没有字段 owner 的旧资源号，只能显式清理。
   */
  async function listWorkingAssets() {
    const store = activeRepository();
    const [legacy, fieldIds, storyPages] = await Promise.all([
      store.listWorking(), store.listFieldWorkingResourceIds(), store.listStoryPageWorking(),
    ]);
    const storyErrors = [];
    for (const record of storyPages) {
      try {validateStoryPageWorking(record);}
      catch (error) {
        if (!(error instanceof StoryPageDataError)) throw error;
        storyErrors.push({resource_id: record.resource_id, asset_schema: record.asset_schema,
          format: "story-page", ownership: "story-page", storyPage: error.storyPage,
          version: record.version, dirty: true, error: error.message});
      }
    }
    const old = new Map(legacy.map(record => [record.resource_id, record]));
    const ids = [...new Set([...old.keys(), ...fieldIds])].sort();
    const load = async resourceId => {
      const record = old.get(resourceId);
      const {overrides: _overrides, ...metadata} = record || {resource_id: resourceId};
      if (resourceId === SAVE_DOMAIN_RESOURCE_ID) {
        return {...metadata, format: "document", ownership: "save-domain", dirty: isWorkingDirty(record)};
      }
      const ownership = hasFieldOwner(resourceId) ? "project-fields" : "project-document";
      if (ownership === "project-document") {
        if (!await store.hasOriginal(resourceId)) {
          return {...metadata, format: "invalid", ownership: "invalid", dirty: true};
        }
        return {...metadata, format: "document", ownership, dirty: isWorkingDirty(record)};
      }
      try {
        const fields = await getField(resourceId);
        const source = await store.getOriginal(resourceId);
        const collection = await fieldResources.get(resourceId);
        if (!collection?.alive() || collection.repository !== store
            || fields.some(field => field.source.revisionId !== source?.revision_id))
          throw new Error("修改清单加载期间字段会话或默认来源已改变");
        // 两个读数都只取会话快照：字段会话可能因为构建换仓储而失效，
        // 页面重绘不该因此抛错（失效后点重置会由绑定回调报错并提示刷新）。
        return Object.freeze({resource_id: resourceId, format: "fields", ownership, fields: Object.freeze(fields),
          asset_schema: source.asset_schema, codec: source.codec,
          get dirty() {return collection.snapshot.overrides.length > 0;},
          get version() {return collection.snapshot.meta?.version ?? null;},
          get stale() {return !collection.alive();},
        });
      } catch (error) {
        // Invalid defaults/Working need their own diagnostic. A document reset
        // cannot stand in for resolving that field owner's error.
        return {...metadata, format: "fields", ownership, fields: [], dirty: true, error: error.message};
      }
    };
    const result = new Array(ids.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const index = cursor++;
        result[index] = await load(ids[index]);
      }
    };
    await Promise.all(Array.from({length: Math.min(8, ids.length)}, worker));
    return [...result.filter(working => working.dirty || working.error), ...storyErrors];
  }

  // 正在加载什么、加载完几件：只有 db 知道，因为只有 db 决定正文从哪来、
  // 什么时候真的去取。页面订阅这份状态显示进度，不自己数请求。
  const loading = new Map();
  const progressListeners = new Set();
  let finishedSinceIdle = 0;

  function progressSnapshot() {
    const active = [...loading.values()];
    return Object.freeze({
      active: active.length,
      done: finishedSinceIdle,
      total: finishedSinceIdle + active.length,
      labels: Object.freeze(active.slice(0, 3)),
    });
  }

  function publishProgress() {
    if (!loading.size) finishedSinceIdle = 0;
    const snapshot = progressSnapshot();
    for (const listener of progressListeners) {
      try {
        listener(snapshot);
      } catch {
        // 进度只是显示；订阅者出错不能影响取数。
      }
    }
  }

  function beginLoad(key, label) {
    loading.set(key, label);
    publishProgress();
  }

  function endLoad(key) {
    if (!loading.delete(key)) return;
    finishedSinceIdle += 1;
    publishProgress();
  }

  /** 订阅 db 加载进度；返回退订函数，并立即回调一次当前状态。 */
  function subscribeProgress(listener) {
    if (typeof listener !== "function") return () => {};
    progressListeners.add(listener);
    listener(progressSnapshot());
    return () => progressListeners.delete(listener);
  }

  const versionOf = schema => versions.get(schema) || 0;
  const directVersionOf = key => directVersions.get(key) || 0;

  function report(...args) {
    try {
      reportError(...args);
    } catch {
      // 诊断设施自身不能破坏“取不到只返回 fallback”的契约。
    }
  }

  function specOfTable(schema, {complain = true} = {}) {
    if (Object.hasOwn(schemas, schema)) return schemas[schema];
    if (complain && !unknownReported.has(schema)) {
      unknownReported.add(schema);
      report(`未登记的数据表：${schema}`);
    }
    return null;
  }

  // 正文按 schema 缓存，所以**一张表的正文不能取决于键里的路径**：否则
  // `ui-script:05:…` 和 `ui-script:11:…` 是两份不同的分片文件，却都缓存在
  // `ui-script` 名下，先到的那份会被后来的读取当成自己的正文——静默读到错的记录。
  //
  // 分片型的表照 scene-object 的做法：用 `source.load` 把各分片合成一张完整的表。
  // 因此 load 拿不到 path，这个约束是结构上的，不靠注释维持。
  async function sourceDocument(spec) {
    if (!spec?.source || typeof spec.source !== "object") {
      throw new TypeError("数据表缺少 source");
    }
    if (spec.source.kind === "package") {
      if (typeof spec.source.load === "function") {
        return {
          document: await spec.source.load({loadJson: path => readPackage(path, {readonly: true}),
            packageManifest: typeof packageManifest === "function" ? packageManifest() : packageManifest}),
          metadata: Object.freeze({kind: "package"}),
        };
      }
      if (typeof spec.source.path === "function") {
        throw new TypeError(
          "package source path 不能按键的路径选文件；分片型请用 source.load 合成整表",
        );
      }
      const sourcePath = spec.source.path;
      if (typeof sourcePath !== "string" || !sourcePath) {
        throw new TypeError("package source path 无效");
      }
      return {
        document: await readPackage(sourcePath, {readonly: spec.source.readonly === true}),
        metadata: Object.freeze({kind: "package", path: sourcePath}),
      };
    }
    if (spec.source.kind === "repository") {
      const entry = await loadDirect("repository", spec.source.resourceId);
      if (!entry) throw new Error(`${spec.source.resourceId}: repository 正文不可用`);
      return entry;
    }
    if (spec.source.kind === "computed" &&
        typeof spec.source.load === "function") {
      return {
        document: await spec.source.load(),
        metadata: Object.freeze({kind: "computed"}),
      };
    }
    throw new TypeError(`不支持的数据来源：${spec.source.kind}`);
  }

  async function load(schema) {
    previewRead("table", schema);
    const spec = specOfTable(schema);
    if (spec?.source?.kind === "repository") {
      await loadDirect("repository", spec.source.resourceId);
    }
    const cached = cache.get(schema);
    if (cached) return cached;
    if (!spec) return null;

    const pending = inflight.get(schema);
    if (pending) return pending;

    const startedEpoch = epoch;
    const startedVersion = versionOf(schema);
    let request;
    request = (async () => {
      beginLoad(`table:${schema}`, schema);
      try {
        const source = await sourceDocument(spec);
        const entry = {
          document: source.document,
          metadata: source.metadata,
          index: null,
          memo: new Map(),
        };
        if (epoch === startedEpoch && versionOf(schema) === startedVersion) {
          cache.set(schema, entry);
          return entry;
        }
        return null;
      } catch (error) {
        report(`数据表 ${schema} 加载失败`, error);
        return null;
      } finally {
        endLoad(`table:${schema}`);
        if (inflight.get(schema) === request) inflight.delete(schema);
      }
    })();
    inflight.set(schema, request);
    return request;
  }

  function collection(entry, spec) {
    if (typeof spec.all === "function") {
      const value = spec.all(entry.document, {memo: entry.memo});
      return value === undefined ? MISSING : value;
    }
    return atPath(entry.document, spec.at);
  }

  function defaultRead(entry, spec, path) {
    const records = collection(entry, spec);
    if (!Array.isArray(records) || !path.length) return MISSING;
    if (!entry.index) {
      entry.index = new Map();
      for (const record of records) {
        if (!record || typeof record !== "object" || record.id === undefined) continue;
        entry.index.set(hexId(record.id), record);
      }
    }
    const record = entry.index.get(hexId(path[0]));
    if (record === undefined) return MISSING;
    return ownPath(record, path.slice(1));
  }

  function readCached(schema, path) {
    const spec = specOfTable(schema);
    const entry = cache.get(schema);
    if (!spec || !entry) return MISSING;
    try {
      if (typeof spec.read === "function") {
        const value = spec.read(entry.document, path, {memo: entry.memo});
        return value === undefined ? MISSING : value;
      }
      return defaultRead(entry, spec, path);
    } catch (error) {
      report(`数据表 ${schema} 读取失败`, error);
      return MISSING;
    }
  }

  async function get(key, fallback) {
    const parsed = parseKey(key);
    if (!parsed) return fallback;
    if (!specOfTable(parsed.schema)) return fallback;
    await load(parsed.schema);
    const value = readCached(parsed.schema, parsed.path);
    return value === MISSING ? fallback : value;
  }

  async function getAll(schema, fallback) {
    if (typeof schema !== "string" || !schema || !specOfTable(schema)) {
      return fallback;
    }
    const entry = await load(schema);
    if (!entry) return fallback;
    try {
      const value = collection(entry, schemas[schema]);
      return value === MISSING ? fallback : value;
    } catch (error) {
      report(`数据表 ${schema} 读取失败`, error);
      return fallback;
    }
  }

  async function loadDirect(kind, identifier) {
    previewRead(kind, identifier);
    if (typeof identifier !== "string" || !identifier.trim()) return null;
    const key = `${kind}:${identifier}`;
    if (kind === "repository") {
      if (hasFieldOwner(identifier)) await refreshFields(identifier);
      else if (directCache.has(key) && activeRepository()?.getWorking) {
        const working = await activeRepository().getWorking(identifier);
        if ((working?.version ?? null) !== directCache.get(key)?.metadata.version) {
          invalidateDirect(kind, identifier);
          for (const [schema, spec] of Object.entries(schemas)) if (spec.source?.kind === "repository"
            && spec.source.resourceId === identifier) invalidate(schema);
        }
      }
    }
    const cached = directCache.get(key);
    if (cached) return cached;
    const pending = directInflight.get(key);
    if (pending) return pending;

    const startedEpoch = epoch;
    const startedVersion = directVersionOf(key);
    let request;
    request = (async () => {
      beginLoad(key, identifier);
      try {
        let entry;
        if (kind === "package") {
          const original = await readPackage(identifier, {readonly: true});
          let document;
          entry = {
            original,
            get document() {
              if (document === undefined) {
                document = cloneValidatedJson(original);
                if (document && typeof document === "object") packageSnapshotOrigins.set(document, original);
              }
              return document;
            },
            metadata: Object.freeze({kind, path: identifier}),
          };
        } else if (kind === "repository") {
          const projectRepository = typeof repository === "function"
            ? repository() : repository;
          if (!projectRepository || typeof projectRepository.resolve !== "function") {
            throw new TypeError("当前项目 repository 不可用");
          }
          const resolved = await readResource(identifier);
          entry = {
            document: repositoryDocument(resolved?.value, identifier),
            metadata: Object.freeze({
              kind,
              resourceId: identifier,
              version: resolved.version ?? null,
              dirty: Boolean(resolved.dirty),
            }),
          };
        } else {
          throw new TypeError(`不支持的动态数据来源：${kind}`);
        }
        if (epoch === startedEpoch && directVersionOf(key) === startedVersion) {
          directCache.set(key, entry);
          return entry;
        }
        return null;
      } catch (error) {
        report(`${kind} 正文 ${identifier} 加载失败`, error);
        if (error instanceof StoryPageDataError) throw error;
        return null;
      } finally {
        endLoad(key);
        if (directInflight.get(key) === request) directInflight.delete(key);
      }
    })();
    directInflight.set(key, request);
    return request;
  }

  /** 读取一张表背后的完整正文；复合导航投影只使用这个入口。 */
  async function getDocument(schema, fallback) {
    if (typeof schema !== "string" || !schema || !specOfTable(schema)) {
      return fallback;
    }
    const entry = await load(schema);
    if (schema === 'project.story' && entry && storyDocumentContext?.document) {
      if (storyDocumentContext.storySource !== entry.document) {
        const source = entry.document;
        storyDocumentContext.storySource = source;
        storyDocumentContext.storyProjection = {...source,
          browser_vm: storyPageBrowserVm(source.browser_vm, storyDocumentContext.document, await storyPageScripts(),
            () => storyDocumentContext.document)};
      }
      return storyDocumentContext.storyProjection;
    }
    return entry ? entry.document : fallback;
  }

  /** getDocument 的同步版本。调用方必须先在当前分页的异步准备阶段取过正文。 */
  function peekDocument(schema, fallback) {
    if (typeof schema !== "string" || !schema ||
        !specOfTable(schema, {complain: false})) return fallback;
    previewRead('table', schema);
    return cache.get(schema)?.document ?? fallback;
  }

  function isLoaded(schema) {
    return cache.has(schema);
  }

  function metadata(schema, fallback = null) {
    return cache.get(schema)?.metadata ?? fallback;
  }

  async function getPackageDocument(path, fallback, {readonly = false} = {}) {
    const entry = await loadDirect("package", path);
    return entry ? readonly ? entry.original : entry.document : fallback;
  }

  async function getResourceDocument(resourceId, fallback) {
    const entry = await loadDirect("repository", resourceId);
    return entry ? entry.document : fallback;
  }

  /** 已准备的字段对象正文由 DB 当前缓存投影。 */
  function peekResourceDocument(resourceId, fallback = null) {
    previewRead('repository', resourceId);
    return directCache.get(`repository:${resourceId}`)?.document ?? fallback;
  }

  function packageMetadata(path, fallback = null) {
    return directCache.get(`package:${path}`)?.metadata ?? fallback;
  }

  function resourceMetadata(resourceId, fallback = null) {
    return directCache.get(`repository:${resourceId}`)?.metadata ?? fallback;
  }

  function peek(key, fallback) {
    const parsed = parseKey(key);
    if (!parsed) return fallback;
    if (!specOfTable(parsed.schema)) return fallback;
    const value = readCached(parsed.schema, parsed.path);
    return value === MISSING ? fallback : value;
  }

  async function warm(payload) {
    const wanted = new Set();
    const seen = new WeakSet();

    function visit(value) {
      if (typeof value === "string") {
        const parsed = parseKey(value);
        if (parsed && specOfTable(parsed.schema, {complain: false})) {
          wanted.add(parsed.schema);
        }
        return;
      }
      if (!value || typeof value !== "object") return;
      if (seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      Object.values(value).forEach(visit);
    }

    visit(payload);
    await Promise.all([...wanted].map(schema => load(schema)));
  }

  const previewDigest = value => sha256Hex(new TextEncoder().encode(JSON.stringify(value)));
  const previewBodyDigests = new WeakMap();
  const previewOriginDigests = new Map();
  const previewRepository = () => activeRepository();
  async function readPreviewOriginal(resourceId) {
    await getField(resourceId, undefined, undefined, {deferDescription: true});
    const session = await fieldResources.get(resourceId);
    const revision = await activeOriginalRevision(session.repository);
    if (!session.alive() || revision !== session.original.revision_id)
      throw new Error("预览的 Origin 已改变，请重新准备输入");
    return session.original;
  }
  function previewLoadedSources() {
    return [
      ...[...cache.keys()].map(id => ({kind: "table", id})),
      ...[...directCache.keys()].map(key => ({kind: key.slice(0, key.indexOf(":")), id: key.slice(key.indexOf(":") + 1)})),
      ...[...fieldResources.keys()].map(id => ({kind: "field", id})),
    ];
  }
  async function previewSource({kind, id}) {
    if (kind === "table") return getDocument(id, null);
    if (kind === "save") return (await previewRepository().getWorking(id))?.overrides ?? null;
    return (await loadDirect(kind, id))?.document;
  }

  async function previewSourceDigest(source) {
    if (source.kind === "field") {
      const store = previewRepository();
      const {original, overrides} = await store.getFieldState(source.id, {includeOriginal: true});
      // 已读取的 Origin 按仓库不可变快照复用正文摘要，Working 始终重读。
      let cached = previewOriginDigests.get(source.id);
      if (!cached || cached.epoch !== epoch || cached.store !== store
          || cached.revision !== original?.revision_id) {
        cached = {epoch, store, revision: original?.revision_id, digest: previewDigest(original?.value)};
        previewOriginDigests.set(source.id, cached);
      }
      return previewDigest({original: await cached.digest, overrides});
    }
    const value = await previewSource(source);
    return previewBodyDigest(source, value);
  }

  function previewBodyDigest(source, value) {
    // 正文身份与字段快照共同决定摘要复用，失效后的正文重新计算。
    if (!value || typeof value !== "object" || source.kind === "save")
      return previewDigest(value);
    const snapshots = [...fieldResources.values()].map(entry => entry.session?.snapshot);
    const key = `${source.kind}:${source.id}`;
    const version = source.kind === "table" ? versionOf(source.id) : directVersionOf(key);
    const cached = previewBodyDigests.get(value);
    if (cached?.epoch === epoch && cached.store === previewRepository()
        && cached.key === key && cached.version === version
        && snapshots.length === cached.snapshots.length
        && snapshots.every((snapshot, index) => snapshot === cached.snapshots[index])) return cached.digest;
    const digest = previewDigest(value);
    previewBodyDigests.set(value, {epoch, store: previewRepository(), key, version, snapshots, digest});
    return digest;
  }

  /** 持久预览只复用输入与当前正文均相同的投影。 */
  async function readPreviewCache(id, input) {
    const store = previewRepository();
    const record = await store.getBlob(`preview:${id}`);
    if (!record || record.input !== await previewDigest(input)) return null;
    const matches = await Promise.all(record.sources.map(async source =>
      source.digest === await previewSourceDigest(source)));
    return store === previewRepository() && matches.every(Boolean) ? record : null;
  }

  async function collectPreviewSources(prepare, {includeLoaded = false} = {}) {
    const capture = new Map((includeLoaded ? previewLoadedSources() : [])
      .map(source => [`${source.kind}:${source.id}`, source]));
    previewCaptures.add(capture);
    try {return {value: await prepare(), sources: [...capture.values()]};}
    finally {previewCaptures.delete(capture);}
  }

  const previewProjections = new Map();
  const projectionVersion = ({kind, id}) => kind === 'table' ? versionOf(id)
    : `${directVersionOf(`${kind === 'field' ? 'repository' : kind}:${id}`)}:${fieldRevision(id)}`;
  const sameProjectionVersion = (before, after) => before === after || typeof before === 'string'
    && before.endsWith(':null') && after.startsWith(before.slice(0, -4))
    && (after.endsWith(':0') || after.endsWith(':null'));
  const projectionCurrent = entry => entry.epoch === epoch && entry.sources.every(source => {
    const version = projectionVersion(source);
    if (!sameProjectionVersion(source.version, version)) return false;
    source.version = version; return true;
  });

  function isPreviewProjectionCurrent(id, value) {
    return (previewProjections.get(id) || []).some(entry => entry.value === value && projectionCurrent(entry));
  }

  /** 内存预览投影只复用相同输入与所属字段的当前版本。 */
  async function reusePreviewProjection(id, input, prepare, {sources: observed = []} = {}) {
    const entries = (previewProjections.get(id) || []).filter(projectionCurrent);
    previewProjections.set(id, entries);
    const existing = entries.find(entry => entry.input.length === input.length
      && entry.input.every((value, index) => value === input[index]));
    if (existing) {
      for (const source of existing.sources) previewRead(source.kind, source.id);
      return existing.value;
    }
    const startedEpoch = epoch;
    const before = new Map(previewLoadedSources().map(source =>
      [`${source.kind}:${source.id}`, projectionVersion(source)]));
    const {value, sources} = await collectPreviewSources(prepare);
    const versions = [...new Map([...sources, ...observed].map(source =>
      [`${source.kind}:${source.id}`, source])).values()]
      .map(source => ({...source, version: projectionVersion(source)}));
    if (startedEpoch === epoch && versions.every(source => !before.has(`${source.kind}:${source.id}`)
        || sameProjectionVersion(before.get(`${source.kind}:${source.id}`), source.version))) {
      entries.push({epoch, input: [...input], sources: versions, value});
      if (entries.length > 32) entries.shift();
    }
    return value;
  }

  const previewWrites = new Map();
  const previewWriteQueues = new Map();

  /** 预览依赖在准备结束时固定，延后写入不得采用后来的字段值。 */
  async function preparePreviewCache(id, input, {sources = null} = {}) {
    const store = previewRepository();
    const startedEpoch = epoch, token = {};
    previewWrites.set(id, token);
    const inputJson = JSON.stringify(input);
    const observed = sources || previewLoadedSources();
    const fields = new Set(observed.filter(source => source.kind === "field").map(source => source.id));
    const dependencies = [...new Map(observed.map(source => [`${source.kind}:${source.id}`, source])).values()].filter(source =>
      source.kind === "table" ? !fields.has(schemas[source.id]?.source?.resourceId)
        : source.kind !== "repository" || !fields.has(source.id));
    const saveBytes = state.saveCurrentBytes, saveDrafts = state.saveDraftFields;
    const hasSave = dependencies.some(source => source.kind === "save");
    const captured = await Promise.all(dependencies.map(async source => {
      if (source.kind === "field") {
        const session = fieldResources.get(source.id)?.session;
        const snapshot = session?.snapshot;
        const {original, overrides} = session
          ? {original: session.original, overrides: snapshot.overrides}
          : await store.getFieldState(source.id, {includeOriginal: true});
        return {source, session, snapshot, original, overrides};
      }
      const version = source.kind === "table" ? versionOf(source.id)
        : directVersionOf(`${source.kind}:${source.id}`);
      return {source, version, value: await previewSource(source)};
    }));
    const current = () => startedEpoch === epoch && store === previewRepository()
      && previewWrites.get(id) === token
      && (!hasSave || saveBytes === state.saveCurrentBytes && saveDrafts === state.saveDraftFields)
      && captured.every(entry => !entry.session
        ? entry.version === undefined || entry.version === (entry.source.kind === "table"
          ? versionOf(entry.source.id) : directVersionOf(`${entry.source.kind}:${entry.source.id}`))
        : entry.session.alive() && entry.snapshot === entry.session.snapshot);
    return async (data, {contentType = data.type, isCurrent = () => true} = {}) => {
      if (!current() || !isCurrent()) return false;
      const snapshot = [];
      for (const entry of captured) {
        if (!current() || !isCurrent()) return false;
        const {source} = entry;
        let digest;
        if (source.kind === "field") {
          let cached = previewOriginDigests.get(source.id);
          if (!cached || cached.epoch !== startedEpoch || cached.store !== store
              || cached.revision !== entry.original?.revision_id) {
            cached = {epoch: startedEpoch, store, revision: entry.original?.revision_id,
              digest: previewDigest(entry.original?.value)};
            previewOriginDigests.set(source.id, cached);
          }
          digest = await previewDigest({original: await cached.digest, overrides: entry.overrides});
        } else digest = await previewBodyDigest(source, entry.value);
        snapshot.push({...source, digest});
      }
      const inputDigest = await sha256Hex(new TextEncoder().encode(inputJson));
      const pending = (previewWriteQueues.get(id) || Promise.resolve()).catch(() => {}).then(async () => {
        if (!current() || !isCurrent()) return false;
        await store.putBlob(`preview:${id}`, data, {kind: "preview", input: inputDigest, sources: snapshot, contentType});
        return true;
      });
      previewWriteQueues.set(id, pending);
      try {return await pending;}
      finally {if (previewWriteQueues.get(id) === pending) previewWriteQueues.delete(id);}
    };
  }

  async function writePreviewCache(id, input, data, {contentType = data.type, sources = null} = {}) {
    const write = await preparePreviewCache(id, input, {sources});
    return write(data, {contentType});
  }

  function invalidate(schema) {
    if (typeof schema !== "string" || !schema || !specOfTable(schema)) return;
    const source = schemas[schema].source;
    if (source?.kind === "package") {packageReads.clear(); if (packageLoader === packageJson) discardPackagePrefetch();}
    if (source?.kind === "repository") invalidateDirect("repository", source.resourceId);
    versions.set(schema, versionOf(schema) + 1);
    cache.delete(schema);
    inflight.delete(schema);
  }

  function invalidateDirect(kind, identifier) {
    if (kind === "package") {packageReads.delete(identifier); if (packageLoader === packageJson) discardPackagePrefetch(identifier);}
    if (kind === "repository") fieldResources.get(identifier)?.then(fields => {fields.view = null;}, () => {});
    const key = `${kind}:${identifier}`;
    directVersions.set(key, directVersionOf(key) + 1);
    directCache.delete(key);
    directInflight.delete(key);
  }

  /** 保存一个 repository 资产后，同时作废它对应的固定表与动态正文缓存。 */
  function invalidateResource(resourceId) {
    previewOriginDigests.delete(resourceId);
    if (typeof resourceId !== "string" || !resourceId) return;
    fieldResources.delete(resourceId);
    readOnlyFieldResources.delete(resourceId);
    // 候选来源可能就是这份资源：正文一改，已读的候选作废。
    referenceCandidateCache.clear();
    if (MONSTER_VISUAL_OWNER_IDS.includes(resourceId)) invalidateResource(MONSTER_VISUAL_RESOURCE_ID);
    invalidateDirect("repository", resourceId);
    for (const [schema, spec] of Object.entries(schemas)) {
      if (spec?.source?.kind === "repository" &&
          spec.source.resourceId === resourceId) invalidate(schema);
    }
  }

  function invalidatePackage(path) {
    if (typeof path !== "string" || !path) return;
    fieldResources.clear();
    readOnlyFieldResources.clear();
    fieldTargetParts = new WeakMap();
    fieldTargets = new WeakMap();
    referenceCandidateCache.clear();
    invalidateDirect("package", path);
    for (const [schema, spec] of Object.entries(schemas)) {
      if (spec?.source?.kind === "package" && spec.source.path === path) {
        invalidate(schema);
      }
    }
  }

  function reset({preservePrefetch = false, preserveStoryDocument = false} = {}) {
    workingSubscription?.();
    workingSubscription = null;
    if (!preserveStoryDocument) {
      storyDocumentContext = null;
      storyDocumentRepository = null;
      storyScriptCodec = null;
      setCurrentStoryPageDefinition(null);
    }
    if (!preservePrefetch && packageLoader === packageJson) discardPackagePrefetch();
    epoch += 1;
    previewProjections.clear();
    previewOriginDigests.clear();
    packageReads.clear();
    fieldResources.clear();
    readOnlyFieldResources.clear();
    fieldTargetParts = new WeakMap();
    fieldTargets = new WeakMap();
    referenceCandidateCache.clear();
    // 换项目：上一份会话的待写与失败都不再属于当前项目。
    for (const chain of fieldWriteChains.values()) chain.cancel();
    fieldWriteChains.clear();
    clearAutoSaveErrors();
    fieldRepository = null;
    fieldPackage = null;
    versions.clear();
    cache.clear();
    inflight.clear();
    directVersions.clear();
    directCache.clear();
    directInflight.clear();
    unknownReported.clear();
  }

  const api = {
    validateFieldValues: assertReferenceCandidates,
    prepareStoryPageDocument, listStoryPageDocuments, createStoryPageDocument, importStoryPageDocument, exportStoryPageDocument,
    storyPageInteractionEntries, allocateStoryPageInteraction, extendedApplicationCommands, allocateApplicationProgram, deleteStoryPageDocument, getStoryPageEditor,
    readResource, getResourceDraft, getFieldSelectionSource, fieldRevision, peekField, peekFieldObject, getFieldObject, getFieldObjects, getFieldObjectCount, getField, getFields: resourceId => getField(resourceId), readBuildFields, writeField, writeFields, refreshFields, discardFieldWorking, listWorkingAssets, storyScriptOwner, resetStoryPageWorking, assertStoryPageWorking,
    get, getAll, getDocument, peekDocument, isLoaded, metadata,
    getPackageDocument, getResourceDocument, peekResourceDocument, packageMetadata, resourceMetadata,
    warm, peek, invalidate, invalidatePackage, invalidateResource, reset,
    subscribeProgress,
    readPreviewCache, writePreviewCache, preparePreviewCache, collectPreviewSources, readPreviewOriginal,
    reusePreviewProjection, isPreviewProjectionCurrent,
  };
  Object.assign(api, createInterfaceStateDocumentMethods(api, baseRepository, (id, update) =>
    createProjectDb({repository: createInterfaceStateDocumentRepository(baseRepository(), id, {update}),
      packageManifest, packageLoader})));
  return Object.freeze(api);
}

export const db = createProjectDb();
