import { storyPlaybackView, storyViewForSequenceId, STORY_PAGE_DEFINITIONS } from './package-schema-paths-gCIepLXx.js';
import { normalizeInterfacePageId, normalizeShopPageRoute, normalizeBattlePageRoute } from './story-event-links-CRjG_25M.js';
import { siteUrl } from './visual-metasprites-DJP54-bV.js';

// @editor-module 集中定义视图分页顺序、默认页及 URL 参数解析。
//
// 「商店的默认分页是界面页」这一个事实，之前写在四个地方共十一处：初始状态、
// 路由恢复、地址栏写入、视图内兜底。改一次默认值要同步改十一处，漏掉任何一处
// 都会表现成「顺序换了但默认没换」。
//
// 这里只登记两件事：分页有哪些、默认是哪个。其余四层全部从这里读。

/** 每个分页组：id 顺序即显示顺序，第一个是默认页。 */
const TAB_GROUPS = {
  // 角色与战车都区分 ROM 新游戏模板和本地电池存档。
  character: {
    stateKey: "characterTab",
    param: "characterTab",
    ids: ["initial", "save"],
  },
  vehicle: {
    stateKey: "vehicleTab",
    param: "vehicleTab",
    ids: ["initial", "rental", "save"],
  },
  // 商店与服务。`catalog` 只在拥有私有商品目录的族出现，由视图按需追加。
  shop: {
    stateKey: "shopTab",
    param: "shopTab",
    ids: ["ui", "config", "catalog", "buyer"],
  },
  // 设施机器（点唱机 / 售货机 / 青蛙机 / 传送终端 / 计算机控制器）。
  facility: {
    stateKey: "facilityTab",
    param: "facilityTab",
    ids: ["ui", "config"],
  },
  wanted: {
    stateKey: "wantedTab",
    param: "wantedTab",
    ids: ["ui", "data"],
  },
  battleTestEnemy: {
    stateKey: "battleTestEnemyTab",
    param: "battleTestEnemyTab",
    ids: ["entry", "formation"],
  },
  battleTestParty: {
    stateKey: "battleTestPartyTab",
    param: "battleTestPartyTab",
    ids: ["p1", "p2", "p3"],
  },
};

/** 默认分页 = 列表里的第一个。顺序和默认由同一处决定，不会再各说各的。 */
function defaultTab(group) {
  return TAB_GROUPS[group].ids[0];
}

/** 从 URL 参数解析分页；不认识的值一律回落到默认页。 */
function tabFromParams(group, params) {
  const {param, ids} = TAB_GROUPS[group];
  const value = params.get(param) ?? (group === 'facility' ? params.get('facility') : null);
  return ids.includes(value) ? value : defaultTab(group);
}

/**
 * 写地址栏：等于默认值就不写。否则每个链接都会挂一串与默认值相同的查询参数，
 * 分享出去的链接也看不出到底哪一项是被特意选中的。
 */
function writeTabParam(group, url, value) {
  const {param} = TAB_GROUPS[group];
  if (value && value !== defaultTab(group)) url.searchParams.set(param, value);
  else url.searchParams.delete(param);
}

/** 视图内兜底：当前分页不在本页实际提供的分页列表里时回落。 */
function resolveTab(group, available, current) {
  return available.includes(current) ? current : defaultTab(group);
}

// @editor-module 剧情时间轴投影的稳定行标识与路由。

// 行 ID 标识页面投影，不登记为字段对象或记录句柄。
function storyTimelineRowId(view, sequenceId, laneId) {
  return `story-row:${sequenceId}/${laneId}`;
}

function applyStoryTimelineRowRoute(params) {
  const match = /^story-row:([a-z0-9-]+)\/(.+)$/u
    .exec(params.get("storyRow") || "");
  if (!match) return;
  const view = storyPlaybackView(params.get('view')) ? params.get('view') : storyViewForSequenceId(match[1]);
  if (!view) return;
  params.set('view', view);
  params.set('storySequence', match[1]);
}

// @editor-module 定义 NES 制式帧率并驱动预览帧时钟。
const NES_VIDEO_STANDARDS = Object.freeze({
  ntsc: Object.freeze({key: "ntsc", label: "NTSC · 60.10 Hz", hz: 60.0988}),
  pal: Object.freeze({key: "pal", label: "PAL · 50.01 Hz", hz: 50.00698}),
});

function normalizeNesVideoStandard(value) {
  return String(value).toLowerCase() === "pal" ? "pal" : "ntsc";
}

function nesVideoStandard(value) {
  return NES_VIDEO_STANDARDS[normalizeNesVideoStandard(value)];
}

function nesFrameDurationMs(value) {
  return 1000 / nesVideoStandard(value).hz;
}

const now = () => globalThis.performance?.now?.() ?? Date.now();

/**
 * 用目标时间而不是固定间隔累加，避免浏览器定时器误差把长动画越播越慢。
 * 调用方负责先绘制第 0 帧；时钟从第 1 帧开始推进。
 */
function startNesFrameClock({
  standard = "ntsc",
  frameCount,
  loop = false,
  onFrame,
  onComplete = () => {},
  shouldContinue = () => true,
} = {}) {
  const count = Math.max(0, Number(frameCount) || 0);
  const duration = nesFrameDurationMs(standard);
  let index = 0;
  let timer = null;
  let cancelled = false;
  let epoch = now();

  const cancel = () => {
    cancelled = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  if (count === 0) {
    onComplete();
    return {cancel, duration, standard: normalizeNesVideoStandard(standard)};
  }
  // A one-frame clip deliberately falls through: the caller has already
  // painted frame 0, and the normal clock keeps it visible for one real NES
  // frame before completing (or continues checking it when loop=true).
  const schedule = () => {
    if (cancelled) return;
    const due = epoch + (index + 1) * duration;
    timer = setTimeout(tick, Math.max(0, due - now()));
  };
  const tick = () => {
    timer = null;
    if (cancelled || !shouldContinue()) {
      cancel();
      return;
    }
    index += 1;
    if (index >= count) {
      if (!loop) {
        cancel();
        onComplete();
        return;
      }
      index = 0;
      epoch = now();
    }
    onFrame(index);
    schedule();
  };
  schedule();
  return {cancel, duration, standard: normalizeNesVideoStandard(standard)};
}

// @editor-module 战斗入口携带阵容与事件输入进入模拟器。
const numeric = ['battleFormation', 'battleMonster', 'battleFlag', 'battleStoryState'];
const BATTLE_SIMULATOR_ROUTE_KEYS = [...numeric, 'battleSource', 'battlePreset', 'battleMode'];
const BATTLE_SIMULATOR_MODES = [
  {id: 'full-demo', label: '完整演示'},
  {id: 'attack-test', label: '攻击测试'},
];

function battleSimulatorMode(request) {
  return BATTLE_SIMULATOR_MODES.some(mode => mode.id === request.battleMode) ? request.battleMode
    : request.battlePreset === 'redwolf' ? 'full-demo' : 'attack-test';
}

function readBattleSimulatorRequest(params) {
  const request = Object.fromEntries(BATTLE_SIMULATOR_ROUTE_KEYS.filter(key => params.has(key))
    .map(key => [key, numeric.includes(key) ? Number(params.get(key)) : params.get(key)]));
  request.battleMode = battleSimulatorMode(request);
  return request;
}

function battleSimulatorHref(entry, candidate = entry) {
  const query = new URLSearchParams({view: 'battle-test', battleSource: entry.source || entry.trigger || ''});
  const formation = candidate.formationId ?? (candidate.kind === 'formation'
    ? Number.parseInt(candidate.reference.split(':').at(-1), 16) : null);
  if (Number.isInteger(formation)) query.set('battleFormation', formation);
  else if (Number.isInteger(candidate.monsterId)) query.set('battleMonster', candidate.monsterId);
  else return null;
  query.set('battleFlag', candidate.flag ?? entry.flag ?? 0);
  query.set('battleStoryState', entry.storyState ?? 0);
  if (entry.storyState === 6) query.set('battlePreset', 'redwolf');
  return `?${query}`;
}

// @editor-module 保存全局状态、视图注册表与 ROM 字节地图常量。
// 全局状态只有这一份：具名导入使用，不另建模块级可变全局；局部缓存跟随所属模块。


const queryParams = new URLSearchParams(
  typeof location === "undefined" ? "" : location.search,
);
applyStoryTimelineRowRoute(queryParams);
const normalizedPageRoute = [normalizeShopPageRoute(queryParams), normalizeBattlePageRoute(queryParams)].some(Boolean);
if (normalizedPageRoute
    && typeof location !== "undefined" && typeof history !== "undefined") {
  const canonical = new URL(location.href);
  canonical.search = queryParams.toString();
  canonical.hash = "";
  history.replaceState(history.state, "", canonical);
}
if (typeof location !== "undefined" && typeof history !== "undefined"
    && ["fielditems", "battleitems"].includes(queryParams.get("view"))) {
  const canonical = new URL(location.href);
  canonical.searchParams.set("view", "items");
  history.replaceState(history.state, "", canonical);
}
if (typeof location !== "undefined" && typeof history !== "undefined"
    && queryParams.get("view") === "wanted" && queryParams.get("wantedTab") === "ui") {
  const canonical = new URL(location.href);
  canonical.searchParams.set("view", "wanted-ui");
  canonical.searchParams.delete("wantedTab");
  history.replaceState(history.state, "", canonical);
}
const ROM_MAP_TYPE_OPTIONS = [
  {key: "semantic", label: "字段已解码", className: "data"},
  {key: "code", label: "功能代码", className: "code"},
  {key: "config", label: "结构化配置（字段待细化）", className: "config"},
  {key: "script", label: "脚本 / 命令流", className: "script"},
  {key: "text", label: "文本 / 名称", className: "textdata"},
  {key: "content", label: "图形 / 内容资源", className: "contentdata"},
  {key: "font", label: "字库图形", className: "fontdata"},
  {key: "mixed", label: "混合代码 / 内联数据", className: "mixed"},
  {key: "mirror", label: "历史镜像 / 扩容填充", className: "mirror"},
  {key: "provisional", label: "候选范围", className: "provisional"},
  {key: "unknown", label: "尚未划分", className: "unknown"},
];
const ROM_MAP_FUNCTION_MODULES = [
  {id: "scenes", label: "地图与场景", view: "scenes"},
  {id: "actors", label: "角色形象表", view: "actors"},
  {id: "story", label: "剧情与动画", view: null},
  {id: "battle", label: "攻击特效", view: "attack-effects"},
  {id: "ui", label: "游戏界面", view: "interfaceui"},
  {id: "text", label: "文本与字库", view: "text"},
  {id: "characters", label: "人物属性", view: "characters"},
  {id: "vehicles", label: "战车属性", view: "vehicles"},
  {id: "monsters", label: "怪物属性", view: "monsters"},
  {id: "equipment", label: "装备属性", view: "equipment"},
  {id: "fielditems", label: "非战斗道具", view: "items"},
  {id: "battleitems", label: "战斗道具", view: "items"},
  {id: "shells", label: "炮弹效果", view: "shells"},
  {id: "npcs", label: "NPC 交互", view: "scenes"},
  {id: "audio", label: "音乐与音效", view: "audio"},
  {id: "investigation", label: "调查交互", view: "scenes"},
  {id: "jukebox", label: "自动点唱机", view: "jukebox"},
  {id: "vending", label: "自动售货机", view: "vending"},
  {id: "frograce", label: "青蛙赛跑", view: "frograce"},
  {id: "teleport", label: "时空隧道", view: "teleport"},
  {id: "computercontroller", label: "计算机控制器", view: "computercontroller"},
  {id: "saves", label: "存档字节地图", view: "bytemap-sram"},
  {id: "shared", label: "跨模块公共数据", view: null},
  {id: "unassigned", label: "已确认但模块待归属", view: null},
];
const ROM_MAP_FUNCTION_MODULE_BY_ID = new Map(
  ROM_MAP_FUNCTION_MODULES.map(module => [module.id, module])
);
const ROM_MAP_FUNCTION_MODULE_PRIORITY = [
  "saves", "computercontroller", "teleport", "jukebox", "vending", "frograce", "investigation",
  "fielditems", "battleitems", "shells", "characters", "vehicles",
  "monsters", "equipment", "npcs", "audio", "text", "ui", "story",
  "battle", "actors", "scenes", "shared", "unassigned",
];
const romMapTypeParam = queryParams.has("romTypes") ? queryParams.get("romTypes") : null;
const initialRomMapTypes = romMapTypeParam == null
  ? ROM_MAP_TYPE_OPTIONS.map(option => option.key)
  : romMapTypeParam.split(",").filter(key => ROM_MAP_TYPE_OPTIONS.some(option => option.key === key));
const state = {
  project: null,
  resourceRangeFieldViews: null,
  projectRepository: null,
  browserProjectManifest: null,
  // 当前静态包的只读资源目录；project manifest 只保存浏览器仓库状态，不能拿它
  // 代替 package.browser_original_assets 给模块 editor 枚举行数据。
  browserPackageManifest: null,
  projectBootstrapStatus: "idle",
  projectBootstrapError: "",
  projectStateLoaded: false,
  projectStateLoading: false,
  projectStateError: "",
  projectWorkingAssets: [],
  projectWorkingLoaded: false,
  projectWorkingQuery: "",
  projectWorkingLimit: 100,
  browserBuildRunning: false,
  buildRomSelected: true,
  buildSaveSelected: true,
  browserBuildError: "",
  browserBuildEvents: [],
  browserBuildCurrentEvent: null,
  browserBuildReport: null,
  browserBuildRom: null,
  browserBuildSave: null,
  // 电池存档只驻留浏览器内存：ROM 初始值是一份可重建基线，载入文件只替换
  // 唯一的当前值，不另存一份 imported Original，也不进入项目历史快照。
  saveRomInitialBytes: null,
  saveCurrentBytes: null,
  saveDraftFields: {},
  saveCurrentName: "",
  saveCurrentSource: "rom-initial",
  saveByteMapDocument: null,
  saveByteMapLoading: false,
  saveByteMapAttempted: false,
  saveSelectedOffset: queryParams.has("sramOffset")
    && Number.isInteger(Number(queryParams.get("sramOffset")))
    && Number(queryParams.get("sramOffset")) >= 0
    ? Number(queryParams.get("sramOffset"))
    : null,
  // explorerUi 是从上面的可持久 selection 与页面默认筛选派生出的易失缓存。
  // 历史恢复时必须重建，不能把后来地址页的 selection/filter 倒灌进旧历史项。
  saveExplorerUi: null,
  saveError: "",
  saveMessage: "",
  view: queryParams.get("view") === "wanted" && queryParams.get("wantedTab") === "ui" ? "wanted-ui"
    : ["fielditems", "battleitems"].includes(queryParams.get("view")) ? "items"
    : queryParams.get("view") === "battle" ? (queryParams.get("battlePart") === "profiles" ? "battle-test" : "attack-effects")
    : queryParams.get("view") || "home",
  // 所有导航意图共享的代次。资源跳转会先异步准备目标页；期间若发生普通导航、
  // 历史恢复或另一次渲染，旧跳转必须停止，不能在请求返回后覆盖用户的新选择。
  navigationGeneration: 0,
  query: "",
  resourceId: queryParams.get("resource"),
  // 引用图目录与模块字段表自己的当前页：字段表由页面承载，这两个字段只服务
  // 它内部的分页与错误提示，不是导航状态。
  moduleCatalog: null,
  moduleTableId: null,
  moduleOffset: 0,
  moduleMessage: "",
  // 记录页：列表点开的那一条。null 表示停在列表页。
  recordId: queryParams.get("record"),
  selected: null,
  scene: null,
  sceneEntry: null,
  sceneSlug: queryParams.get("scene"),
  interactionFlow: queryParams.get('interactionFlow'),
  sceneListFilter: queryParams.get("sceneFilter") || "",
  sceneOriginalMap: null,
  sceneLogic: null,
  sceneEntrancePreview: null,
  sceneTileActions: null,
  sceneOriginalLogic: null,
  // 场景角色记录的可编辑草稿。它不在 sceneLogic 里——记录归超集
  // （game/scenes/actors.json）管，logic.json 只存 uid 引用。
  sceneActors: null,
  sceneStoryDocuments: null,
  sceneWorldEvents: null,
  sceneEncounterFormations: null,
  sceneActorsOriginal: null,
  sceneLogicSelection: queryParams.get("sceneObject"),
  sceneTileActionPreview: null,
  sceneMapRewritePreview: null,
  sceneMapRewriteScenes: null,
  sceneFocusPoint: /^\d{1,3},\d{1,3}$/.test(queryParams.get("scenePoint") || "")
    ? queryParams.get("scenePoint").split(",").map(Number) : null,
  // 初次加载不会走 applyRouteUrl，所以这里也要认 URL——否则从怪物列表
  // 复制出去的遇敌区链接，粘贴后会退回逻辑对象模式。
  sceneEditMode: ["logic", "tiles", "encounters"].includes(queryParams.get("sceneMode"))
    ? queryParams.get("sceneMode") : "logic",
  // 遇敌区不在这里：它已经是独立的 sceneEditMode（"encounters"），
  // 而不是逻辑对象模式下的一个可勾选图层。
  sceneLayers: {actors: true, treasures: true, investigations: true, transitions: true, events: true, vehicles: true},
  sceneEncounter: null,
  sceneEncounterVersion: null,
  sceneOriginalEncounter: null,
  sceneEncounterDirty: false,
  sceneEncounterBrush: null,
  sceneEncounterInspect: queryParams.has("encounterZone")
    ? Number(queryParams.get("encounterZone")) : null,
  // 点中的那一个区块（世界地图 16×16 网格的下标）。zone 与区块是一对多：
  // 只记 zone 的话，点哪一块都是整片高亮，看不出自己点中了谁。
  sceneEncounterBlock: null,
  // 世界地图现画后的离屏画面。以前这里是一张 <img>（成品 PNG），
  // 现在是 loadSceneSurface 画出来的 canvas。
  sceneSurface: null,
  sceneWorldRaw: null,
  sceneTideDocument: null,
  sceneZoom: Math.max(0.125, Math.min(64, Number(queryParams.get("sceneZoom")) || 0.5)),
  sceneZoomSlug: queryParams.get("scene"),
  sceneZoomAuto: !queryParams.has("sceneZoom"),
  sceneBuilding: false,
  sceneMessage: "",
  // 场景编辑器与剧情舞台共用视觉字段对象产出的 metatile renderer；编辑页只缓存
  // 当前场景这一份，整图拼装规则不在 canvas.js 另写。
  sceneRenderer: null,
  // 草稿属于哪个浏览器项目；换项目后不能让上一项目的未保存场景遮住新 repository。
  sceneDraftRepository: null,
  sceneCellCanvas: null,
  selectedMetatile: 48,
  // 图块模式当前选中的地图格；画笔 ID 与目标格是两个独立概念。
  sceneTileSelection: null,
  sceneTileHistory: null,
  sceneDirty: false,
  sceneAssetVersion: null,
  sceneActorsVersion: null,
  sceneGrid: true,
  actorSet: queryParams.has("actorSet") && Number.isInteger(Number(queryParams.get("actorSet")))
    ? Number(queryParams.get("actorSet")) : null,
  actorVisualTab: ["sprites", "story"].includes(queryParams.get("actorPart"))
    ? queryParams.get("actorPart") : "sprites",
  storyPlayback: queryParams.get("storyPlayback") || "opening-expulsion",
  // 工作台左栏选中的执行链。以前每一行都自带一个 256×240 播放器，几十条一起跑；
  // 现在只有选中的这一条在舞台上播，表格退回纯数据。
  storySequenceId: queryParams.get("storySequence") || null,
  storyPageId: queryParams.get('storyPage') || null,
  storyTimelineRowId: queryParams.get("storyRow") || null,
  storyKind: ["autonomous", "interaction", "inline"].includes(queryParams.get("storyKind"))
    ? queryParams.get("storyKind") : "autonomous",
  storyFrame: Math.max(0, Number(queryParams.get("storyFrame")) || 0),
  storyPlaying: queryParams.get("storyPaused") !== "1",
  // 每条剧情各自的帧游标与播放开关（key 为 variant id）。剧情长度差得很多，
  // 共用一个全局帧号会让短的一直在循环、长的还没开始。
  storyCardFrame: new Map(),
  storyCardPaused: new Set(),
  // 每条剧情独立的主角团队预览状态。key 是 sequence id，value 是当前参与
  // VM 分支并允许在舞台渲染的队伍槽 Set；没有覆盖时取 character-initial-record 的 present。
  storyPartyPreviewSlots: new Map(),
  storyPartyPreviewVehicles: new Map(),
  storyBranchPreviewConditions: new Map(),
  storyExternalPreviewResults: new Map(),
  storyMovementTimingBaselines: new Map(),
  storyPlayerPreviewInputs: new Map(),
  storySpeed: 1,
  storyTimer: null,
  storyLastTick: null,
  weaponVisual: queryParams.get("weaponVisual") !== null
    ? Number.parseInt(queryParams.get("weaponVisual"), 16) : null,
  // 战斗场景页的临时编排，不属于 ROM working：只保存槽位显隐、站位和基础资产引用。
  battleScenePreview: null,
  // 下方对象操作台的页签是纯编辑器状态，不进入临时编排或项目覆盖。
  battleSceneControlTab: "party",
  // 战斗 VM 的每个状态就是一个 NES 帧；制式只决定浏览器回放时钟。
  battleVideoStandard: normalizeNesVideoStandard(queryParams.get("battleStandard")),
  battleActorAppearance: queryParams.get("battleActor"),
  battleActorAction: queryParams.get("battleAction"),
  battleActorPlaying: queryParams.get("battleActorPaused") !== "1",
  nameEntryVehicleChassis: Math.max(0x91, Math.min(
    0x98,
    Number.parseInt(queryParams.get("nameEntryVehicle") || "91", 16) || 0x91,
  )),
  textRegion: queryParams.get("textRegion") || "all",
  textKind: ["text", "all", "sentence", "name", "label", "template", "fragment", "control"].includes(
    queryParams.get("textKind")
  ) ? queryParams.get("textKind") : "text",
  textSearch: queryParams.get("textSearch") || "",
  textRenderToken: 0,
  textMode: queryParams.get("textMode") === "charset" ? "charset" : "records",
  charsetSearch: queryParams.get("charsetSearch") || "",
  charsetStatus: queryParams.get("charsetStatus") || "all",
  charsetPage: Math.max(0, Number(queryParams.get("charsetPage")) || 0),
  charsetEditorMode: queryParams.get("charsetEditor") === "rows" ? "rows" : "bulk",
  charsetWorkingDirty: false,
  charsetMessage: "",
  monsterFilter: "",
  fieldItemFilter: "",
  fieldItemCategory: "all",
  shellFilter: "",
  equipmentFilter: "",
  equipmentCategory: "all",
  equipmentDraft: null,
  equipmentOriginal: null,
  equipmentMessage: "",
  characterDraft: null,
  characterOriginal: null,
  characterVisualSaving: false,
  characterBuilding: false,
  characterMessage: "",
  characterTab: tabFromParams("character", queryParams),
  characterSaveSlot: Number(queryParams.get("characterSaveSlot")) === 2 ? 2 : 1,
  savePageSlot: Number(queryParams.get("saveSlot")) === 2 ? 2 : 1,
  savePageSection: queryParams.get("saveSection") || "location",
  savePageEntity: queryParams.get("saveEntity") || "team",
  vehicleDraft: null,
  vehicleOriginal: null,
  vehicleDirty: false,
  vehicleBuilding: false,
  vehicleMessage: "",
  vehicleTab: tabFromParams("vehicle", queryParams),
  vehicleSaveSlot: Number(queryParams.get("vehicleSaveSlot")) === 2 ? 2 : 1,
  monsterDraft: null,
  monsterOriginal: null,
  monsterBuilding: false,
  monsterMessage: "",
  battleTestView: null,
  battleSimulatorRequest: readBattleSimulatorRequest(queryParams),
  battleSimulatorPartyStats: {},
  battleTestPersistedView: null,
  battleTestBuilding: false,
  battleTestMessage: "",
  romMapBank: queryParams.get("romBank") || "prg-07",
  romMapBytes: null,
  romMapAnnotations: null,
  romMapDisassembly: null,
  romMapDisassemblyError: "",
  romMapSelectedOffset: queryParams.has("romOffset") && Number.isFinite(Number(queryParams.get("romOffset")))
    ? Number(queryParams.get("romOffset")) : 0xE533,
  romMapPrgSections: null,
  romMapPrgBankMetadata: null,
  romMapVirtualFrame: null,
  romMapExplorerUi: null,
  romMapSearch: queryParams.get("romSearch") || "",
  romMapSemanticScope: ["address", "value"].includes(queryParams.get("romSemantic"))
    ? queryParams.get("romSemantic") : "all",
  romMapValueSearch: queryParams.get("romValue") || "",
  romMapValueCompare: ["eq", "ne", "gt", "gte", "lt", "lte"].includes(queryParams.get("romCompare"))
    ? queryParams.get("romCompare") : "eq",
  romMapValueWidth: queryParams.get("romWidth") === "2" ? 2 : 1,
  romMapValueScope: queryParams.get("romScope") === "known" ? "known" : "all",
  romMapTypeFilters: initialRomMapTypes,
  romMapSearchIndex: null,
  romMapFilteredOffsets: null,
  romMapFilterResult: null,
  romMapChrBank: Math.max(0, Math.min(255, Number(queryParams.get("chrBank")) || 0)),
  romMapChrTile: Math.max(0, Math.min(16383, Number(queryParams.get("chrTile")) || 0)),
  romMapChrBytes: null,
  romMapChrSections: null,
  romMapChrReferences: null,
  // 根清单里每个 CHR bank 的登记范围条数；用来在页面上点名未登记的 bank，
  // 不额外读取任何 bank JSON。
  romMapChrBankDirectory: null,
  // bank → 图块起始字节的偏移（0-15）。少数 bank 的图块并不从 bank 首字节对齐，
  // 整张图连续排布时需要按 bank 单独纠偏；默认全 0，改动只影响显示。
  romMapChrBankAlign: new Map(),
  shopFamily: Number(queryParams.get("shopFamily") ?? 0),
  // 分页的顺序与默认值都在 core/tabs.js 登记，这里只解析 URL。
  shopTab: tabFromParams("shop", queryParams),
  shopPreviewRecord: Math.max(0, Number(queryParams.get("shopConfig") ?? 0) || 0),
  shopPreviewPage: Math.max(0, Number(queryParams.get("shopPage") ?? 0) || 0),
  shopPreviewDialogue: queryParams.get("shopDialogue") || "",
  // 非战斗菜单与商店外服务共用一个 UI 工作台实现；每个导航入口和 URL 都保留
  // 自己的 interface 身份。screen 只记录当前页选中的 canonical state，不复制预览。
  interfacePage: normalizeInterfacePageId(queryParams.get("interface")),
  interfacePageScreen: queryParams.get("interfaceScreen"),
  interfacePageEntry: queryParams.get("interfaceEntry"),
  interfacePageRecord: queryParams.get("interfaceRecord"),
  laserLensPreviewSlots: [],
  // 设施页（计算机控制器 / 自动点唱机 / 自动售货机 / 青蛙赛跑）的分页：配置与界面分开两页。
  facilityTab: tabFromParams("facility", queryParams),
  jukeboxPreviewConfiguration: Math.max(
    0, Number(queryParams.get("jukeboxConfig") ?? 1) || 0
  ),
  vendingPreviewFamily: [11, 12, 13].includes(Number(queryParams.get("vendingFamily")))
    ? Number(queryParams.get("vendingFamily")) : 12,
  vendingPreviewConfiguration: Math.max(
    0, Number(queryParams.get("vendingConfig") ?? 1) || 0
  ),
  // null 表示首次装载时采用存档 7 的 $30/$32；0 是有效的“全部关闭”。
  teleportPreviewFlags: queryParams.has("teleportFlags")
    ? Math.max(0, Math.min(0x0FFF,
      Number.parseInt(queryParams.get("teleportFlags"), 16) || 0))
    : null,
  teleportPreviewDialogue: queryParams.get("teleportDialogue") || "travel-confirmation",
  // 通缉令页保留目标/场景数据，同时把完整海报重建独立放在界面分页。
  wantedTab: tabFromParams("wanted", queryParams),
  battleTestEnemyTab: tabFromParams("battleTestEnemy", queryParams),
  battleTestPartyTab: tabFromParams("battleTestParty", queryParams),
  wantedTargetIndex: !queryParams.has("wantedTarget")
    || queryParams.get("wantedTarget") === "default"
    ? "default"
    : Math.max(1, Math.min(12, Number(queryParams.get("wantedTarget")) || 1)),
  wantedTargetSide: queryParams.get("wantedSide") === "low" ? "low" : "high",
  wantedView: null,
  wantedMessage: "",
  // 出租车没有自己的草稿：十八条 preset 共用 state.vehicleDraft，
  // 出租店页只是它的 rental 视图。这里只留本页自己的 UI 状态。
  rentalMessage: "",
  shopView: null,
  shopPersistedView: null,
  shopMessage: "",
  // 游戏模拟器要载入的构建 ID；local:<sha256> 表示浏览器本地导入。
  // 为空时运行页等待用户从 IndexedDB 构建或 File API ROM 中选择。
  emulatorRom: queryParams.get("rom") || null,
};

const STORY_PAGE_VIEWS = Object.freeze(Object.fromEntries(
  STORY_PAGE_DEFINITIONS.map(definition => [
    definition.view,
    [definition.eyebrow, definition.title, definition.description],
  ]),
));

const views = {
  home: ["PROJECT OVERVIEW", "项目概览", "查看项目来源、ROM 布局、解析覆盖和可编辑内容。"],
  save: ["BATTERY SAVE", "存档", "编辑当前电池存档的槽状态、人物、战车、事件和其他字段。"],
  scenes: ["MAPS AND SCENES", "地图与场景", "浏览和编辑地图、NPC、调查物、门与传送、边界出口和坐标事件。"],
  metatiles: ["METATILES", "元图块", "浏览元图块记录、CHR 像素、属性和引用场景。"],
  actors: ["CHARACTER APPEARANCES", "角色形象表", "查看场景 NPC 的角色形象，并切换预览场景核对实际像素。"],
  ...STORY_PAGE_VIEWS,
  "attack-effects": ["ATTACK EFFECTS", "攻击特效", "浏览攻击动画、动作脚本及其 ROM 来源，并追踪装备和怪物的引用。"],
  "battle-test": ["BATTLE SCENE", "战斗模拟器", "配置双方阵容，选择完整演示或攻击测试。"],
  'monster-formations': ['MONSTER FORMATIONS', '怪物编队', '编辑固定编队并查看战斗入口。'],
  battleactors: ["BATTLE ACTORS", "战斗角色形象与动作", "统一处理三名主角、NPC 狼和八辆载具的战斗形象、动作与 PAL / NTSC 逐帧预览。"],
  text: ["TEXT AND FONT", "文本与字库", "统一浏览文本区、记录引用关系、当前文字与 ROM 字形。"],
  characters: ["CHARACTER ATTRIBUTES", "人物属性", ""],
  vehicles: ["VEHICLE ATTRIBUTES", "战车属性", ""],
  monsters: ["DATA CONFIGURATION", "怪物属性", "浏览并编辑怪物战斗属性、抗性、奖励及图形与特效引用。"],
  equipment: ["DATA CONFIGURATION", "装备属性", "列出人类和战车装备的攻防、重量、载重、价格、兼容性与战斗特效引用。"],
  items: ["ITEMS", "道具", "按道具列出非战斗与战斗使用效果、文本和来源。"],
  shells: ["SHELL EFFECTS", "炮弹效果", "列出炮弹类型、特殊效果参数、主炮叠加入口与共享战斗特效引用。"],
  audio: ["MUSIC AND SOUND", "音乐与音效", "浏览并试听声音命令、音乐轨道、声道、音序事件、音色包络与 DPCM 样本。"],
  wanted: ["WANTED POSTERS", "通缉令", "按场景配置赏金首目标，并即时预览对应编队、名称、赏金、击破状态与海报画面。"],
  "wanted-ui": ["WANTED POSTERS", "通缉令界面", "查看和编辑通缉令画面。"],
  shops: ["SHOPS AND SERVICES", "商店与服务", "浏览和编辑各类商店、旅馆、酒吧、战车出租与其他服务的商品和参数。"],
  'generic-shop': ['STATE MACHINE', '状态机', '导入流程，编辑独立文档并应用选定字段。'],
  interfaceui: ["GAME INTERFACE", "游戏界面", "查看 canonical UI 状态，并编辑它们实际引用的界面文字。"],
  jukebox: ["FACILITY APPLICATION", "自动点唱机", "组合查看曲目选择表、声音命令、界面文本和运行确认入口。"],
  vending: ["FACILITY APPLICATION", "自动售货机", "组合查看 19 套商品配置、数量标志、抽奖奖品、界面文本和购买流程入口。"],
  frograce: ["FROG RACE", "青蛙赛跑", "查看各档下注价格、场景调查点、金钱状态、共享界面和赛跑流程入口。"],
  teleport: ["TELEPORT TERMINAL", "时空隧道", "查看存档 7 的传送终端实机画面、当前已开启地点、ROM 内 12 个目的地、落点坐标与完整运行流程。"],
  computercontroller: ["COMPUTER CONTROLLER", "计算机控制器", "查看典型整屏控制器、数字键与 OPEN / CLOSE / EXIT，以及命令 $36 / $37 / $38 的场景实例和应用脚本。"],
  // 开机路径不在 15 项 field mode 表里：它发生在进入主循环之前，因此不属于
  // 剧情清单已审计的那批，单独列出。
  "cutscene-boot-logo": ["BOOT LOGO", "启动 Logo", "ROM 载入后、进入标题前的厂商 / 版权画面。代码驱动，仅可调整内容。"],
  "cutscene-title": ["TITLE SCREEN", "标题画面", "标题画面与其待机演示。代码驱动，仅可调整内容。"],
  // 每个已声明的地址空间一个页面。三者共用同一份统一字节地图与同一个浏览器
  // 组件，只有寻址方式与专属语义不同——所以是三个入口，不是一个页面里的开关。
  "bytemap-prg": ["PRG BYTE MAP", "PRG 字节地图", "按物理地址 prg:<offset> 查看 512 KiB 程序与数据的字段语义、区块类型与写回路径。"],
  "bytemap-chr": ["CHR BYTE MAP", "CHR 字节地图", "按 NES 2BPP 图块浏览 256 KiB 图形存储，并显示每个 1 KiB bank 的已知引用。"],
  "bytemap-sram": ["SRAM BYTE MAP", "SRAM 字节地图", "逐字节查看 8 KiB 电池 SRAM；两个存档槽只是其中一段用途视图，按已登记 field_id 定点修改。"],
  log: ["SESSION LOG", "日志", "查看本页会话的任务、进度与错误。"],
  build: ["PROJECT AND BUILD", "项目与构建", "管理项目版本，构建并下载 ROM 与构建报告；查看每项资产的写入位置、容量、哈希与最终差异。"],
  emulator: ["GAME EMULATOR", "游戏模拟器", "直接运行最新构建或本地 ROM，并按 ROM 内容隔离存档与测试进度。"],
};
if (!views[state.view]) state.view = "home";

const HISTORY_STATE_KEYS = [
  "view", "query", "resourceId", "recordId", "sceneSlug", "interactionFlow", "sceneLogicSelection", "sceneZoom",
  "sceneZoomSlug", "sceneZoomAuto",
  "sceneListFilter", "sceneEditMode", "sceneEncounterInspect",
  "actorSet", "actorVisualTab", "storyPlayback",
  "storyKind", "storyPageId", "storySequenceId", "storyTimelineRowId", "storyFrame", "storyPlaying",
  "battleVideoStandard", "battleActorAppearance", "battleActorAction",
  "battleActorPlaying",
  "nameEntryVehicleChassis",
  "textRegion",
  "textKind", "textSearch", "textMode", "charsetSearch", "charsetStatus",
  "charsetPage", "charsetEditorMode", "romMapBank",
  "romMapSelectedOffset", "romMapSearch",
  "romMapSemanticScope", "romMapValueSearch", "romMapValueCompare",
  "romMapValueWidth", "romMapValueScope", "romMapTypeFilters",
  "romMapChrBank", "romMapChrTile", "emulatorRom", "shopFamily", "shopTab",
  "interfacePage", "interfacePageScreen", "interfacePageEntry", "interfacePageRecord",
  "characterTab", "characterSaveSlot", "savePageSlot", "savePageSection", "savePageEntity",
  "vehicleTab", "vehicleSaveSlot",
  "shopPreviewRecord", "shopPreviewPage", "shopPreviewDialogue",
  "facilityTab", "jukeboxPreviewConfiguration", "vendingPreviewFamily",
  "vendingPreviewConfiguration", "teleportPreviewFlags",
  "teleportPreviewDialogue", "wantedTab", "wantedTargetIndex",
  "wantedTargetSide",
  "saveSelectedOffset",
];

// @editor-module 游戏模拟器：把独立运行页嵌进编辑器
//
// 视图本身只产出一个 <iframe>。真正的模拟器逻辑在 engine/editor/emulator.js，
// 跑在 iframe 自己的文档里。
//
// 为什么隔离到 iframe 而不是内联进 SPA：
//   1. EmulatorJS 没有 destroy API。实例启动后即使把容器从 DOM 里摘掉，WASM、
//      requestAnimationFrame 和音频仍在跑。而 render() 每次都整块重写 #content，
//      内联的话一切换视图就会留下一个既看不见又停不掉、还在出声的僵尸实例。
//      卸载 iframe 会让浏览器回收整个文档，是唯一可靠的停止方式。
//   2. 上游把 emulator.min.css 追加到 document.head、把 emscripten 核心的 blob
//      <script> 追加到 document.body。关在 iframe 里，这些副作用碰不到编辑器。
//   3. 键盘事件不会外泄：EmulatorJS 把按键绑在自己的容器上，而编辑器在 document
//      上监听 Ctrl+K / Escape。同文档的话游戏内按 K 会抢走搜索框焦点。


function renderEmulator() {
  const roms = state.project?.manifest?.rom;
  const name = roms?.source_name || "metalmaxcn.nes";
  // data-rom 是 render() 判断"能否复用现有 iframe"的依据：同一个 ROM 就留着别动，
  // 换了 ROM（比如刚点完"运行新 ROM"）才允许重建。
  const rom = state.emulatorRom || "latest";
  const src = `${siteUrl("emulator.html")}?rom=${encodeURIComponent(rom)}` ;
  return `
    <div class="section-line">
      <h2>运行 ${name}</h2>
      <a class="button ghost" href="${src}" target="_blank" rel="noopener" title="独立窗口" aria-label="独立窗口">↗</a>
    </div>
    <div class="emulator-stage">
      <iframe
        id="emulator-frame"
        data-rom="${rom}"
        src="${src}"
        title="游戏模拟器"
        allow="gamepad *; autoplay"></iframe>
    </div>
  `;
}

var emulator = /*#__PURE__*/Object.freeze({
  __proto__: null,
  renderEmulator: renderEmulator
});

export { BATTLE_SIMULATOR_MODES, BATTLE_SIMULATOR_ROUTE_KEYS, HISTORY_STATE_KEYS, ROM_MAP_FUNCTION_MODULES, ROM_MAP_FUNCTION_MODULE_BY_ID, ROM_MAP_FUNCTION_MODULE_PRIORITY, ROM_MAP_TYPE_OPTIONS, applyStoryTimelineRowRoute, battleSimulatorHref, battleSimulatorMode, defaultTab, emulator, nesFrameDurationMs, nesVideoStandard, normalizeNesVideoStandard, readBattleSimulatorRequest, resolveTab, startNesFrameClock, state, storyTimelineRowId, tabFromParams, views, writeTabParam };
