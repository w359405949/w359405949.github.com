import { state, applyStoryTimelineRowRoute, writeTabParam, BATTLE_SIMULATOR_ROUTE_KEYS, HISTORY_STATE_KEYS, views, normalizeNesVideoStandard, tabFromParams, readBattleSimulatorRequest, ROM_MAP_TYPE_OPTIONS, defaultTab } from './emulator-DynsZsth.js';
import { storyPlaybackView } from './package-schema-paths-gCIepLXx.js';
import { normalizeShopPageRoute, normalizeBattlePageRoute, normalizeInterfacePageId } from './story-event-links-CRjG_25M.js';
import { $ } from './element-tree-DsgOBeTK.js';
import { hasPendingAutoSaves, flushAllAutoSaves } from './battle-result-script-runtime-B_EClFew.js';

// @editor-module 页面刷新由入口注入渲染器，调用方不依赖入口模块。
let renderer;

function configureEditorRenderer(callback) {
  renderer = callback;
}

function render() {
  if (!renderer) throw new TypeError('编辑器渲染器尚未注册');
  return renderer();
}

// @editor-module 导航守卫与编辑器卸载由入口注入。
let navigation;

function configureEditorNavigation(callbacks) {
  navigation = callbacks;
}

function allowEditorNavigation(value) {
  if (!navigation) throw new TypeError('编辑器导航守卫尚未注册');
  return navigation.allow(value);
}

function suspendEditor() {
  if (!navigation) throw new TypeError('编辑器导航守卫尚未注册');
  return navigation.suspend();
}

// @editor-module 界面预览上下文随项目保留，页面与组件只读取同一份选择。

function interfacePreviewContext() {
  const contexts = state.interfacePreviewContexts ||= new Map();
  const key = state.projectRepository;
  if (!contexts.has(key)) contexts.set(key, {
    slot: 1, actor: 'rom-role:0', wanted: 1, kind: 'role', role: 0, vehicle: 0,
    partyRoles: [0], dropRoll: 0, scene: null, manualScene: null, boundScene: null, service: null,
  });
  return contexts.get(key);
}

function selectInterfacePreviewContext(field, value) {
  const context = interfacePreviewContext();
  if (field === 'scene') {
    context.manualScene = value;
    context.scene = context.boundScene || value;
    return context;
  }
  context[field] = value;
  if (field !== 'actor') return context;
  const [kind, token] = String(value).split(':');
  const id = Number(token);
  if (!Number.isInteger(id)) throw new TypeError('界面预览对象无效');
  if (kind.endsWith('role')) {
    context.kind = 'role';
    context.role = id;
    state.fieldMenuRole = id;
  } else if (kind.endsWith('vehicle')) {
    context.kind = 'vehicle';
    context.vehicle = id;
  }
  return context;
}

function selectInterfacePreviewBoundScene(scene) {
  const context = interfacePreviewContext();
  context.boundScene = scene;
  context.scene = scene || context.manualScene;
  return context;
}

function applyInterfacePreviewSceneRoute(params) {
  if (!params.has('previewScene') && !params.has('previewCommand')) return;
  const context = interfacePreviewContext();
  if (params.has('previewScene')) {
    const sceneId = Number(params.get('previewScene'));
    const point = String(params.get('previewPoint') || '8,7').split(',').map(Number);
    if (Number.isInteger(sceneId) && sceneId >= 0 && sceneId <= 255 && point.length === 2
        && point.every(value => Number.isInteger(value) && value >= 0 && value <= 255))
      selectInterfacePreviewContext('scene', {sceneId, x: point[0], y: point[1]});
  }
  const command = params.has('previewCommand') ? Number(params.get('previewCommand')) : null;
  const argument = params.has('previewArgument') ? Number(params.get('previewArgument')) : 0;
  if (Number.isInteger(command) && command >= 0 && command <= 255
      && Number.isInteger(argument) && argument >= 0 && argument <= 255) {
    context.service = {command, argument, entryHandle: params.get('previewEntryHandle') || null,
      scene: params.has('previewScene') ? context.manualScene : null,
      routeScene: params.has('previewScene') ? context.manualScene : null, locationKey: `${command}:${argument}`};
    if (params.has('previewScene') || !params.has('previewArgument')) context.manualScene = null;
    selectInterfacePreviewBoundScene(context.service.scene);
  }
}

function interfacePreviewWantedHistoryOverrides() {
  const context = interfacePreviewContext();
  const selections = context.wantedHistorySelections ||= new Map();
  if (!selections.has(context.slot)) selections.set(context.slot, {});
  return selections.get(context.slot);
}

function ensureInterfacePreviewActor(entries) {
  const context = interfacePreviewContext();
  if (entries.length && !entries.some(entry => entry.actor === context.actor))
    selectInterfacePreviewContext('actor', entries[0].actor);
  return context;
}

// @editor-module 管理 URL 路由、历史状态与视图导航。


let historyPosition = Number(history.state?.mmEditorPosition || 0);

function historyValue(value) {
  return Array.isArray(value) ? [...value] : value;
}

function editorHistorySnapshot(scrollX = window.scrollX, scrollY = window.scrollY) {
  const snapshot = {scrollX, scrollY};
  for (const key of HISTORY_STATE_KEYS) snapshot[key] = historyValue(state[key]);
  return snapshot;
}

function restoreEditorHistory(snapshot) {
  for (const key of HISTORY_STATE_KEYS) {
    if (Object.hasOwn(snapshot, key)) state[key] = historyValue(snapshot[key]);
  }
  if (!views[state.view]) state.view = "home";
  // 两个逐字节 explorer 都持有 selection、筛选结果和虚拟滚动帧的派生缓存。
  // 快照保存的是上面的标量状态；返回旧历史项时必须从标量重建，否则后来打开的
  // B 地址会覆盖旧历史项 A，旧筛选还可能把 A 行完全隐藏。
  state.romMapExplorerUi = null;
  state.saveExplorerUi = null;
}

function replaceHistoryUrl(url = location.href) {
  history.replaceState({mmEditor: editorHistorySnapshot(), mmEditorPosition: historyPosition}, "", url);
}

async function acceptHistoryNavigation(entry) {
  const nextPosition = Number(entry?.mmEditorPosition || 0);
  if (!await allowEditorNavigation(location.href)) {
    history.go(historyPosition - nextPosition);
    return false;
  }
  historyPosition = nextPosition;
  suspendEditor();
  return true;
}

function rememberCurrentHistoryEntry() {
  replaceHistoryUrl(location.href);
}

function currentViewUrl() {
  const url = new URL(location.origin + location.pathname);
  if (['interfaceui', 'shops', 'wanted-ui', 'jukebox', 'vending', 'frograce', 'teleport',
    'computercontroller'].includes(state.view)) {
    const {scene, service} = interfacePreviewContext();
    if (scene) {
      url.searchParams.set('previewScene', scene.sceneId);
      url.searchParams.set('previewPoint', `${scene.x},${scene.y}`);
    }
    if (service) {
      url.searchParams.set('previewCommand', service.command);
      url.searchParams.set('previewArgument', service.argument);
      if (service.entryHandle) url.searchParams.set('previewEntryHandle', service.entryHandle);
    }
  }
  url.searchParams.set("view", state.view);
  if (state.resourceId) url.searchParams.set("resource", state.resourceId);
  if (state.recordId !== null && state.recordId !== undefined) {
    url.searchParams.set("record", state.recordId);
  }
  if (state.view === "scenes") {
    if (state.interactionFlow) url.searchParams.set('interactionFlow', state.interactionFlow);
    if (state.sceneSlug) url.searchParams.set("scene", state.sceneSlug);
    if (state.sceneLogicSelection) url.searchParams.set("sceneObject", state.sceneLogicSelection);
    if (state.sceneFocusPoint) url.searchParams.set("scenePoint", state.sceneFocusPoint.join(","));
    if (state.sceneListFilter) url.searchParams.set("sceneFilter", state.sceneListFilter);
    if (state.sceneZoomSlug === state.sceneSlug && !state.sceneZoomAuto)
      url.searchParams.set("sceneZoom", state.sceneZoom);
    if (state.sceneEditMode !== "logic") url.searchParams.set("sceneMode", state.sceneEditMode);
    if (state.sceneEditMode === "encounters" && state.sceneEncounterInspect !== null) {
      url.searchParams.set("encounterZone", state.sceneEncounterInspect);
    }
  }
  if (state.view === "actors") {
    url.searchParams.set("actorPart", state.actorVisualTab);
    if (state.actorSet !== null) url.searchParams.set("actorSet", String(state.actorSet));
    if (state.actorVisualTab === "story" && state.storyKind) {
      url.searchParams.set("storyKind", state.storyKind);
    }
  }
  // 剧情播放器共用同一个执行链身份，选中的 sequence 一律写进 URL。
  if (state.storyPageId) url.searchParams.set('storyPage', state.storyPageId);
  if (storyPlaybackView(state.view) && state.storySequenceId) {
    url.searchParams.set("storySequence", state.storySequenceId);
    if (state.storyTimelineRowId) {
      const rowRoute = new URLSearchParams({storyRow: state.storyTimelineRowId});
      applyStoryTimelineRowRoute(rowRoute);
      if (rowRoute.get("view") === state.view
          && rowRoute.get("storySequence") === state.storySequenceId) {
        url.searchParams.set("storyRow", state.storyTimelineRowId);
      }
    }
  }
  if (state.view === "battleactors") {
    if (state.battleActorAppearance) {
      url.searchParams.set("battleActor", state.battleActorAppearance);
    }
    if (state.battleActorAction) url.searchParams.set("battleAction", state.battleActorAction);
    if (!state.battleActorPlaying) url.searchParams.set("battleActorPaused", "1");
  }
  if (state.battleVideoStandard !== "ntsc"
      && ["battleactors", "interfaceui", "battle-test"].includes(state.view)) {
    url.searchParams.set("battleStandard", state.battleVideoStandard);
  }
  if (state.view === "text") {
    url.searchParams.set("textMode", state.textMode);
    url.searchParams.set("textRegion", state.textRegion);
    url.searchParams.set("textKind", state.textKind);
    if (state.textSearch) url.searchParams.set("textSearch", state.textSearch);
    if (state.charsetSearch) url.searchParams.set("charsetSearch", state.charsetSearch);
    if (state.charsetStatus !== "all") url.searchParams.set("charsetStatus", state.charsetStatus);
    if (state.charsetPage) url.searchParams.set("charsetPage", state.charsetPage);
    url.searchParams.set("charsetEditor", state.charsetEditorMode);
  }
  // 地址空间由视图 ID 表达（bytemap-prg / -chr / -sram），不再有 romRegion 开关。
  if (state.view === "bytemap-chr") {
    url.searchParams.set("chrTile", state.romMapChrTile);
  }
  if (state.view === "bytemap-prg") {
    url.searchParams.set("romOffset", state.romMapSelectedOffset);
  }
  if (state.view === "bytemap-sram"
      && state.saveSelectedOffset !== null
      && state.saveSelectedOffset !== undefined
      && Number.isInteger(Number(state.saveSelectedOffset))) {
    url.searchParams.set("sramOffset", Number(state.saveSelectedOffset));
  }
  if (state.view === "characters") {
    writeTabParam("character", url, state.characterTab);
    if (Number(state.characterSaveSlot) === 2) {
      url.searchParams.set("characterSaveSlot", "2");
    }
  }
  if (state.view === "battle-test") {
    for (const key of BATTLE_SIMULATOR_ROUTE_KEYS) if (state.battleSimulatorRequest[key] != null)
      url.searchParams.set(key, state.battleSimulatorRequest[key]);
    writeTabParam("battleTestEnemy", url, state.battleTestEnemyTab);
    writeTabParam("battleTestParty", url, state.battleTestPartyTab);
  }
  if (state.view === "save") {
    if (Number(state.savePageSlot) === 2) url.searchParams.set("saveSlot", "2");
    if (state.savePageSection !== "location") {
      url.searchParams.set("saveSection", state.savePageSection);
    }
    if (state.savePageEntity !== "team") {
      url.searchParams.set("saveEntity", state.savePageEntity);
    }
  }
  if (state.view === "vehicles") {
    writeTabParam("vehicle", url, state.vehicleTab);
    if (Number(state.vehicleSaveSlot) === 2) {
      url.searchParams.set("vehicleSaveSlot", "2");
    }
  }
  if (state.view === "shops") {
    url.searchParams.set("shopFamily", state.shopFamily);
    writeTabParam("shop", url, state.shopTab);
    if (["ui", "buyer"].includes(state.shopTab) && state.interfacePageScreen)
      url.searchParams.set("interfaceScreen", state.interfacePageScreen);
    if (Number(state.shopPreviewRecord)) {
      url.searchParams.set("shopConfig", state.shopPreviewRecord);
    }
    if (Number(state.shopPreviewPage)) {
      url.searchParams.set("shopPage", state.shopPreviewPage);
    }
    if (state.shopPreviewDialogue) {
      url.searchParams.set("shopDialogue", state.shopPreviewDialogue);
    }
  }
  if (state.view === "interfaceui") {
    url.searchParams.set("interface", state.interfacePage);
    if (state.interfacePageScreen) {
      url.searchParams.set("interfaceScreen", state.interfacePageScreen);
    }
    if (state.interfacePageEntry) url.searchParams.set('interfaceEntry', state.interfacePageEntry);
    if (state.interfacePageRecord) url.searchParams.set("interfaceRecord", state.interfacePageRecord);
    if (state.interfacePage === "name-entry"
        && Number(state.nameEntryVehicleChassis) !== 0x91) {
      url.searchParams.set(
        "nameEntryVehicle",
        Number(state.nameEntryVehicleChassis).toString(16).toUpperCase(),
      );
    }
  }
  if (['shops', 'jukebox', 'vending', 'frograce', 'teleport', 'computercontroller'].includes(state.view)
      && state.interfacePageEntry) url.searchParams.set('interfaceEntry', state.interfacePageEntry);
  if (state.view === "wanted" || state.view === "wanted-ui") {
    if (state.savePageSlot === 2) url.searchParams.set("saveSlot", "2");
    url.searchParams.set("wantedTarget", state.wantedTargetIndex);
    url.searchParams.set("wantedSide", state.wantedTargetSide);
  }
  if (["jukebox", "vending", "frograce", "teleport", "computercontroller"].includes(state.view)) {
    writeTabParam("facility", url, state.facilityTab);
  }
  if (state.view === "jukebox") {
    url.searchParams.set("jukeboxConfig", state.jukeboxPreviewConfiguration);
  }
  if (state.view === "vending") {
    url.searchParams.set("vendingFamily", state.vendingPreviewFamily);
    url.searchParams.set("vendingConfig", state.vendingPreviewConfiguration);
  }
  if (state.view === "teleport") {
    if (state.teleportPreviewFlags !== null) {
      url.searchParams.set(
        "teleportFlags",
        Math.max(0, Math.min(0x0FFF, Number(state.teleportPreviewFlags) || 0))
          .toString(16).toUpperCase().padStart(3, "0")
      );
    }
    if (state.teleportPreviewDialogue
        && state.teleportPreviewDialogue !== "travel-confirmation") {
      url.searchParams.set("teleportDialogue", state.teleportPreviewDialogue);
    }
  }
  if (state.view === "emulator" && state.emulatorRom) {
    url.searchParams.set("rom", state.emulatorRom);
  }
  return url;
}

function recordViewHref(view, record, {tabGroup = null, tab = null} = {}) {
  const url = new URL(location.origin + location.pathname);
  url.searchParams.set("view", view);
  if (tabGroup) writeTabParam(tabGroup, url, tab);
  url.searchParams.set("record", String(record));
  return `${url.search}`.replaceAll("&", "&amp;");
}

function pushCurrentHistory(url = currentViewUrl()) {
  suspendEditor();
  historyPosition += 1;
  history.pushState({mmEditor: editorHistorySnapshot(0, 0), mmEditorPosition: historyPosition}, "", url);
}

/**
 * 把物理地址深链落实到字节地图的真实 explorer selection。
 *
 * 只改顶层 offset 不够：PRG/SRAM 页面打开过一次后会优先复用各自的 explorerUi，
 * 其中旧 selectedOffset 和过滤结果会盖掉新 URL。地址链接没有携带筛选条件时就
 * 丢弃这份旧 UI，让目标行在下一次 render/bind 时实际可见并滚到中央。
 */
function focusByteMapTarget(target, {clearFilters = true} = {}) {
  const focus = Number(target?.focus);
  if (!Number.isInteger(focus) || focus < 0) return false;
  if (target.space === "prg") {
    state.romMapSelectedOffset = focus;
    if (clearFilters) {
      state.romMapSearch = "";
      state.romMapSemanticScope = "all";
      state.romMapValueSearch = "";
      state.romMapValueCompare = "eq";
      state.romMapValueWidth = 1;
      state.romMapValueScope = "all";
      state.romMapTypeFilters = ROM_MAP_TYPE_OPTIONS.map(option => option.key);
      state.romMapSearchIndex = null;
      state.romMapFilteredOffsets = null;
      state.romMapFilterResult = null;
      state.romMapVirtualFrame = null;
      state.romMapExplorerUi = null;
    } else if (state.romMapExplorerUi) {
      state.romMapExplorerUi.selectedOffset = focus;
    }
    return true;
  }
  if (target.space === "chr") {
    state.romMapChrTile = focus;
    return true;
  }
  if (target.space === "sram") {
    state.saveSelectedOffset = focus;
    state.saveExplorerUi = clearFilters
      ? {selectedOffset: focus}
      : {...(state.saveExplorerUi || {}), selectedOffset: focus};
    return true;
  }
  return false;
}

/**
 * 切换视图。配置族与独立界面页各自共用一个视图实现，所以"同视图但换了业务页"
 * 必须当作真正的导航处理——否则点击相邻入口只会滚回顶部。
 */
async function navigateView(view, options = {}) {
  if (view === "interfaceui" && options.interfacePage === "battle-scene") {
    view = "battle-test";
    options = {...options, interfacePage: undefined};
  }
  if (!views[view]) return;
  // 即使点击的是当前页且下面直接滚回顶部，也要使尚在等待 DB 的旧资源跳转失效。
  state.navigationGeneration += 1;
  const family = options.shopFamily;
  const interfacePage = options.interfacePage;
  const sameFamily = family === undefined
    || Number(state.shopFamily) === Number(family);
  const sameInterfacePage = interfacePage === undefined
    || state.interfacePage === normalizeInterfacePageId(interfacePage);
  // 已经停在这个视图的列表页时点导航只是回到顶部；但如果正开着记录页，
  // 点同一个入口应当理解为「回列表」。
  if (state.view === view && sameFamily && sameInterfacePage && !state.interactionFlow
      && !state.resourceId && !state.recordId) {
    window.scrollTo({top: 0, left: 0, behavior: "auto"});
    return;
  }
  if (!await allowEditorNavigation(new URL(`?view=${view}`, location.href))) return;
  // 切视图前先把防抖窗口里的 Working 写入排进链：视图一换，挂载的控件就没了，
  // 那一笔必须落在它原来的目标上（`core/auto-save.js` 的节拍器约定）。
  if (hasPendingAutoSaves()) await flushAllAutoSaves();
  rememberCurrentHistoryEntry();
  state.view = view;
  state.interactionFlow = null;
  state.resourceId = null;
  state.recordId = null;
  if (family !== undefined) {
    const familyChanged = Number(state.shopFamily) !== Number(family);
    state.shopFamily = Number(family);
    if (familyChanged) {
      state.shopTab = defaultTab("shop");
      state.interfacePageScreen = null;
      state.shopPreviewRecord = 0;
      state.shopPreviewPage = 0;
      state.shopPreviewDialogue = "";
    }
  }
  if (interfacePage !== undefined) {
    const normalized = normalizeInterfacePageId(interfacePage);
    const interfaceChanged = state.interfacePage !== normalized;
    state.interfacePage = normalized;
    if (interfaceChanged) {
      state.interfacePageScreen = null;
      state.interfacePageRecord = null;
    }
  }
  pushCurrentHistory();
  await render();
  window.scrollTo(0, 0);
}

function applyRouteUrl(url) {
  const params = url.searchParams;
  state.interactionFlow = params.get('interactionFlow');
  applyInterfacePreviewSceneRoute(params);
  applyStoryTimelineRowRoute(params);
  if (normalizeShopPageRoute(params)) url.hash = "";
  normalizeBattlePageRoute(params);
  const requested = params.get("view") || "home";
  if (["fielditems", "battleitems"].includes(requested)) params.set("view", "items");
  state.view = requested === "wanted" && params.get("wantedTab") === "ui" ? "wanted-ui"
    : ["fielditems", "battleitems"].includes(requested) ? "items"
    : requested === "battle" ? (params.get("battlePart") === "profiles" ? "battle-test" : "attack-effects")
    : views[requested] ? requested : "home";
  state.resourceId = params.get("resource");
  state.recordId = params.get("record");
  if (['shops', 'jukebox', 'vending', 'frograce', 'teleport', 'computercontroller'].includes(state.view))
    state.interfacePageEntry = params.get('interfaceEntry');
  state.battleVideoStandard = normalizeNesVideoStandard(
    params.get("battleStandard") || state.battleVideoStandard,
  );
  if (state.view === "scenes") {
    state.sceneSlug = params.get("scene");
    state.sceneLogicSelection = params.get("sceneObject");
    state.sceneFocusPoint = /^\d{1,3},\d{1,3}$/.test(params.get("scenePoint") || "")
      ? params.get("scenePoint").split(",").map(Number) : null;
    state.sceneListFilter = params.get("sceneFilter") || "";
    state.sceneZoomSlug = state.sceneSlug;
    state.sceneZoomAuto = !params.has("sceneZoom");
    if (params.has("sceneZoom")) {
      state.sceneZoom = Math.max(0.125, Math.min(64, Number(params.get("sceneZoom")) || 0.5));
    }
    state.sceneEditMode = ["logic", "tiles", "encounters"].includes(params.get("sceneMode"))
      ? params.get("sceneMode") : "logic";
    state.sceneEncounterInspect = params.has("encounterZone")
      ? Number(params.get("encounterZone")) : state.sceneEncounterInspect;
  } else if (state.view === "actors") {
    state.actorVisualTab = ["sprites", "story"].includes(params.get("actorPart"))
      ? params.get("actorPart") : "sprites";
    state.actorSet = params.has("actorSet") && Number.isInteger(Number(params.get("actorSet")))
      ? Number(params.get("actorSet")) : null;
    if (["autonomous", "interaction", "inline"].includes(params.get("storyKind"))) {
      state.storyKind = params.get("storyKind");
    }
  }
  if (storyPlaybackView(state.view)) {
    state.storyPageId = params.get('storyPage') || null;
    state.storySequenceId = params.get("storySequence") || null;
    state.storyTimelineRowId = params.get("storyRow") || null;
  }
  if (state.view === "battleactors") {
    state.battleActorAppearance = params.get("battleActor");
    state.battleActorAction = params.get("battleAction");
    state.battleActorPlaying = params.get("battleActorPaused") !== "1";
  } else if (state.view === "text") {
    state.textMode = params.get("textMode") === "charset" ? "charset" : "records";
    state.textRegion = params.get("textRegion") || "all";
    state.textKind = params.get("textKind") || "text";
    state.textSearch = params.get("textSearch") || "";
    state.charsetSearch = params.get("charsetSearch") || "";
    state.charsetStatus = params.get("charsetStatus") || "all";
    state.charsetPage = Math.max(0, Number(params.get("charsetPage")) || 0);
    state.charsetEditorMode = params.get("charsetEditor") === "rows" ? "rows" : "bulk";
  } else if (state.view === "characters") {
    state.characterTab = tabFromParams("character", params);
    state.characterSaveSlot = Number(params.get("characterSaveSlot")) === 2 ? 2 : 1;
  } else if (state.view === "battle-test") {
    state.battleSimulatorRequest = readBattleSimulatorRequest(params);
    state.battleTestEnemyTab = tabFromParams("battleTestEnemy", params);
    state.battleTestPartyTab = tabFromParams("battleTestParty", params);
  } else if (state.view === "save") {
    state.savePageSlot = Number(params.get("saveSlot")) === 2 ? 2 : 1;
    state.savePageSection = params.get("saveSection") || "location";
    state.savePageEntity = params.get("saveEntity") || "team";
  } else if (state.view === "vehicles") {
    state.vehicleTab = tabFromParams("vehicle", params);
    state.vehicleSaveSlot = Number(params.get("vehicleSaveSlot")) === 2 ? 2 : 1;
  } else if (state.view === "shops") {
    if (params.has("shopFamily")) state.shopFamily = Number(params.get("shopFamily"));
    state.shopTab = tabFromParams("shop", params);
    state.interfacePageScreen = ["ui", "buyer"].includes(state.shopTab) ? params.get("interfaceScreen") : null;
    state.shopPreviewRecord = Math.max(
      0, Number(params.get("shopConfig") ?? 0) || 0
    );
    state.shopPreviewPage = Math.max(
      0, Number(params.get("shopPage") ?? 0) || 0
    );
    state.shopPreviewDialogue = params.get("shopDialogue") || "";
  } else if (state.view === "interfaceui") {
    state.interfacePage = normalizeInterfacePageId(
      params.get("interface"),
    );
    state.interfacePageScreen = params.get("interfaceScreen");
    state.interfacePageEntry = params.get('interfaceEntry');
    state.interfacePageRecord = params.get("interfaceRecord");
  } else if (state.view === "wanted" || state.view === "wanted-ui") {
    state.wantedTargetIndex = !params.has("wantedTarget")
      || params.get("wantedTarget") === "default"
      ? "default"
      : Math.max(1, Math.min(12, Number(params.get("wantedTarget")) || 1));
    state.wantedTargetSide = params.get("wantedSide") === "low" ? "low" : "high";
    if (params.has("saveSlot")) state.savePageSlot = Number(params.get("saveSlot")) === 2 ? 2 : 1;
  } else if (state.view === "jukebox") {
    state.facilityTab = tabFromParams("facility", params);
    state.jukeboxPreviewConfiguration = Math.max(
      0, Number(params.get("jukeboxConfig") ?? 1) || 0
    );
  } else if (state.view === "vending") {
    state.facilityTab = tabFromParams("facility", params);
    state.vendingPreviewFamily = [11, 12, 13].includes(Number(params.get("vendingFamily")))
      ? Number(params.get("vendingFamily")) : 12;
    state.vendingPreviewConfiguration = Math.max(
      0, Number(params.get("vendingConfig") ?? 1) || 0
    );
  } else if (state.view === "teleport") {
    state.facilityTab = tabFromParams("facility", params);
    state.teleportPreviewFlags = params.has("teleportFlags")
      ? Math.max(0, Math.min(0x0FFF,
        Number.parseInt(params.get("teleportFlags"), 16) || 0))
      : null;
    state.teleportPreviewDialogue = params.get("teleportDialogue")
      || "travel-confirmation";
  } else if (["frograce", "computercontroller"].includes(state.view)) {
    state.facilityTab = tabFromParams("facility", params);
  } else if (state.view === "emulator") {
    state.emulatorRom = params.get("rom");
  } else if (state.view.startsWith("bytemap-")) {
    if (params.has("romOffset")) {
      const offset = Number(params.get("romOffset"));
      if (Number.isInteger(offset) && offset >= 0) {
        const hasFilters = [
          "romSearch", "romSemantic", "romValue", "romCompare",
          "romWidth", "romScope", "romTypes",
        ].some(key => params.has(key));
        focusByteMapTarget(
          {space: "prg", focus: offset},
          {clearFilters: !hasFilters},
        );
      }
    }
    if (params.has("chrTile")) {
      focusByteMapTarget({space: "chr", focus: Number(params.get("chrTile"))});
    }
    if (params.has("sramOffset")) {
      const offset = Number(params.get("sramOffset"));
      if (Number.isInteger(offset) && offset >= 0) {
        focusByteMapTarget({space: "sram", focus: offset});
      }
    }
    state.romMapSearch = params.get("romSearch") || "";
  }
}

async function navigateInternalUrl(value) {
  if (!await allowEditorNavigation(value)) return false;
  if (hasPendingAutoSaves()) await flushAllAutoSaves();
  state.navigationGeneration += 1;
  const url = value instanceof URL ? value : new URL(value, location.href);
  rememberCurrentHistoryEntry();
  applyRouteUrl(url);
  state.query = "";
  const input = $("#search");
  if (input) input.value = "";
  pushCurrentHistory(url);
  await render();
  const anchor = url.hash ? document.querySelector(url.hash) : null;
  if (anchor) anchor.scrollIntoView({block: "start"});
  else window.scrollTo(0, 0);
  return true;
}

function bindInternalPageLinks(root = document) {
  for (const node of root.querySelectorAll('a[href]')) {
    if (node.__internalPageLinkBound) continue;
    const url = new URL(node.href, location.href);
    if (node.target || node.hasAttribute('download') || node.dataset.sceneOpen || node.dataset.resourceTarget
        || url.origin !== location.origin || url.pathname !== location.pathname
        || !url.searchParams.has('view')) continue;
    node.__internalPageLinkBound = true;
    node.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      void navigateInternalUrl(url);
    });
  }
}

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

// @editor-module 记录导航更新历史并请求页面刷新。

function openRecord(recordId) {
  state.recordId = recordId === null || recordId === undefined ? null : String(recordId);
  const url = currentViewUrl();
  if (state.view === "equipment") {
    url.searchParams.set(
      "equipmentDomain",
      new URL(location.href).searchParams.get("equipmentDomain") === "tank" ? "tank" : "human",
    );
  }
  pushCurrentHistory(url);
  render();
}

// @editor-module 从界面投影取得节点索引。
function uiEditorNodeMap(document) {
  const nodes = document.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) return new Map();
  return new Map(Object.entries(nodes));
}

function uiEditorScreenForResource(uid, document) {
  if (!document?.screens?.length) return null;
  const nodes = uiEditorNodeMap(document);
  const matches = value => value === uid || String(value || "").endsWith(`:${uid}`);
  for (const screen of document.screens) {
    if ((screen.references || []).some(reference => matches(reference.target))) return screen;
    const pending = [screen.root_node];
    const visited = new Set();
    while (pending.length) {
      const nodeId = pending.pop();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodes.get(nodeId);
      if (!node) continue;
      if (matches(node.source?.resource_uid)) return screen;
      if ((node.references || []).some(reference => matches(reference.target))) return screen;
      pending.push(...(node.children || []));
    }
  }
  return null;
}

export { acceptHistoryNavigation, allowEditorNavigation, applyInterfacePreviewSceneRoute, bindInternalPageLinks, configureEditorNavigation, configureEditorRenderer, currentViewUrl, ensureInterfacePreviewActor, focusByteMapTarget, interfacePreviewContext, interfacePreviewWantedHistoryOverrides, navigateInternalUrl, navigateView, openRecord, pushCurrentHistory, recordViewHref, rememberCurrentHistoryEntry, render, replaceHistoryUrl, restoreEditorHistory, selectInterfacePreviewBoundScene, selectInterfacePreviewContext, uiEditorNodeMap, uiEditorScreenForResource };
