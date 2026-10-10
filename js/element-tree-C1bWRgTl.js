import { state, applyStoryTimelineRowRoute, writeTabParam, BATTLE_SIMULATOR_ROUTE_KEYS, HISTORY_STATE_KEYS, views, normalizeNesVideoStandard, tabFromParams, readBattleSimulatorRequest, ROM_MAP_TYPE_OPTIONS, defaultTab } from './emulator-Bpa8EsFw.js';
import { storyPlaybackView } from './baseline-assembly-DW8BWbDB.js';
import { render, normalizeShopPageRoute, normalizeBattlePageRoute, normalizeInterfacePageId } from './editor-renderer-n2nBwXk_.js';
import { $, esc, bindCanvasViewport, canvasViewportControls } from './interface-state-preview-Dlotqlmn.js';
import { hasPendingAutoSaves, flushAllAutoSaves } from './prg-loaders-DnCSmXk9.js';

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

// @editor-module 页头的标题、分页、页面级控件与操作共用一个组件。

const attributesMarkup$2 = attributes => Object.entries(attributes).map(([key, value]) =>
  value == null || value === false ? '' : ` ${esc(key)}="${esc(value === true ? '' : value)}"`).join('');

function pageHeaderMarkup({title, actionsMarkup = ''} = {}) {
  return `<header class="page-head page-header-row" data-page-header>
    <div class="page-header-title"><h1 id="view-title">${esc(title || '')}</h1>
      <p class="eyebrow" id="view-kicker" hidden></p></div>
    <div class="page-header-tabs" data-page-header-slot="tabs"></div>
    <div class="page-header-controls" data-page-header-slot="controls"></div>
    <div class="head-actions">${actionsMarkup}</div>
  </header>`;
}

function pageHeaderTabs({label, tabs, active, attribute}) {
  return `<nav class="page-header-tab-list" data-page-header-part="tabs" role="tablist" aria-label="${esc(label)}">
    ${tabs.map(({id, label: text, markup}) => `<button type="button" class="page-header-tab" role="tab"
      ${esc(attribute)}="${esc(id)}" aria-selected="${id === active}">${markup ?? esc(text)}</button>`).join('')}
  </nav>`;
}

function pageHeaderControls(markup, attributes = {}) {
  return `<div data-page-header-part="controls"${attributesMarkup$2(attributes)}>${markup}</div>`;
}

let placement = null;

function restorePageHeader() {
  if (!placement) return;
  for (const {element, marker} of placement.moves.reverse()) marker.replaceWith(element);
  placement.space?.remove();
  placement.marker.replaceWith(placement.head);
  placement.externalWorkbench?.classList.add('screen-workbench--with-toolbar');
  if (placement.workbench && !placement.hadToolbar)
    placement.workbench.classList.remove('screen-workbench--with-toolbar');
  placement = null;
}

function mountPageHeader({content, head}) {
  restorePageHeader();
  const panels = '.workspace-tree, .workspace-stage, .workspace-inspector, .screen-workbench-bottom, .record-body';
  const workbench = [...content.querySelectorAll('[data-screen-workbench]')].find(element =>
    !element.closest(panels) && (element.dataset.screenWorkbenchHeader === 'external' || element.getClientRects().length));
  const parts = [...content.querySelectorAll('[data-page-header-part]')].filter(element =>
    !element.closest(panels) && !element.parentElement.closest('[data-page-header-part]')
    && (!element.closest('[data-screen-workbench]') || element.closest('[data-screen-workbench]') === workbench));
  if (!parts.length && !workbench) {
    head.style.margin = '1px 0 -1px';
    document.body.dataset.compactPageHeader = 'true';
    return;
  }
  const external = workbench?.dataset.screenWorkbenchHeader === 'external';
  const headerWorkbench = !external && (workbench?.classList.contains('screen-workbench--embedded')
    || parts.some(element => element.closest('[data-screen-workbench]') === workbench)) ? workbench : null;
  let container = parts[0];
  while (container?.parentElement !== content && container?.parentElement) container = container.parentElement;
  const host = external ? parts[0]?.parentElement || content : headerWorkbench || parts[0]?.closest('form')
    || (container?.matches('[data-page-header-part]') ? content : container) || content;
  const marker = document.createComment('page-header');
  head.before(marker);
  placement = {head, marker, workbench: headerWorkbench,
    externalWorkbench: external && workbench.classList.contains('screen-workbench--with-toolbar') ? workbench : null,
    hadToolbar: workbench?.classList.contains('screen-workbench--with-toolbar'), moves: []};
  placement.externalWorkbench?.classList.remove('screen-workbench--with-toolbar');
  head.style.margin = '0';
  const overlay = !headerWorkbench && !external && !parts[0]?.closest('form')
    && document.body.dataset.pageKind === 'list' && content.clientWidth < content.getBoundingClientRect().width;
  if (overlay) {
    placement.space = document.createElement('div');
    placement.space.className = 'page-header-space';
    placement.space.setAttribute('aria-hidden', 'true');
    host.prepend(placement.space);
    head.style.margin = '1px 0 -33px';
  } else host.prepend(head);
  if (headerWorkbench) headerWorkbench.classList.add('screen-workbench--with-toolbar');
  for (const element of parts) {
    const marker = document.createComment('page-header-content');
    element.before(marker);
    head.querySelector(`[data-page-header-slot="${element.dataset.pageHeaderPart}"]`).append(element);
    placement.moves.push({element, marker});
  }
  if (!overlay) {
    const row = head.getBoundingClientRect(), body = content.getBoundingClientRect();
    const top = row.top - body.top + content.scrollTop, left = row.left - body.left + content.scrollLeft;
    const hostStyle = getComputedStyle(host);
    const available = host.clientWidth - Number.parseFloat(hostStyle.paddingLeft) - Number.parseFloat(hostStyle.paddingRight);
    const right = available - row.width + left;
    const gap = !headerWorkbench && workbench && !external ? Number.parseFloat(hostStyle.rowGap) || 0 : 0;
    head.style.margin = `${-top}px ${right}px ${top - gap + (external ? 8 : 0)}px ${-left}px`;
  }
  for (const value of head.querySelectorAll('h1, p, .record-title')) value.title ||= value.textContent.trim();
  document.body.dataset.compactPageHeader = 'true';
}

// @editor-module 三栏编辑页的骨架、预览排布与画布缩放。

const attributesMarkup$1 = attributes => Object.entries(attributes || {}).map(([name, value]) =>
  value === false || value == null ? '' : ` ${esc(name)}="${esc(value === true ? '' : value)}"`).join('');

function workbenchRoot(namespace, root = document) {
  const selector = `[data-screen-workbench="${CSS.escape(String(namespace || ""))}"]`;
  return root?.matches?.(selector) ? root : root?.querySelector?.(selector) || null;
}

function workbenchCanvas(namespace, root = document) {
  const workbench = workbenchRoot(namespace, root);
  return [...(workbench?.querySelectorAll(".screen-workbench-canvas-box canvas") || [])]
    .find(canvas => canvas.closest('[data-screen-workbench]') === workbench) || null;
}

/** 共用三栏骨架；bottomMarkup 是三栏下方可选的通栏操作区。 */
function screenWorkbench({
  namespace,
  className = "",
  id = "",
  attributes = {},
  heightMode = "page",
  balancedPanels = false,
  toolbarMarkup = "",
  treeTitle = "UI 树",
  treeMarkup = "",
  treeClassName = "",
  treeAttributes = {},
  treeScroll = "panel",
  stageMarkup = "",
  stageToolbarMarkup = "",
  inspectorTitle = "属性",
  inspectorMarkup = "",
  inspectorClassName = "",
  inspectorAttributes = {},
  inspectorScroll = "panel",
  bottomMarkup = "",
  bottomScroll = "panel",
  bottomSize = "content",
  bottomFit = false,
} = {}) {
  return `<div${id ? ` id="${esc(id)}"` : ""}
    class="workspace screen-workbench${
      bottomMarkup ? " screen-workbench--with-bottom" : ""
    }${toolbarMarkup ? " screen-workbench--with-toolbar" : ""
    }${heightMode === 'timeline' ? ' screen-workbench--with-timeline' : ''
    }${heightMode === 'fill' || bottomMarkup && bottomFit ? ' screen-workbench--fill-space' : ''
    }${heightMode === 'embedded' ? ' screen-workbench--embedded' : ''
    }${bottomMarkup && bottomSize === 'compact' ? ' screen-workbench--compact-bottom' : ''
    }${bottomMarkup && bottomSize === 'resizable' ? ' screen-workbench--resizable-bottom' : ''
    }${bottomFit ? ' screen-workbench--fit-bottom' : ''
    }${stageMarkup ? "" : " screen-workbench--no-stage"
    }${balancedPanels ? " screen-workbench--balanced-panels" : ""
    }${className ? ` ${esc(className)}` : ""}"
    data-screen-workbench="${esc(namespace)}"${attributesMarkup$1(attributes)}>
    ${toolbarMarkup ? pageHeaderControls(toolbarMarkup, {class: "screen-workbench-top", "data-screen-workbench-page-header": namespace}) : ''}
    <aside class="workspace-tree${treeScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${treeClassName ? ` ${esc(treeClassName)}` : ''}"${attributesMarkup$1(treeAttributes)}>
      ${treeTitle == null ? '' : `<h3>${esc(treeTitle)}</h3>`}
      ${treeMarkup}
    </aside>
    ${stageMarkup ? `<div class="workspace-stage">${stageToolbarMarkup ? `<div class="screen-workbench-stage-toolbar">${stageToolbarMarkup}</div>` : ''}${stageMarkup}</div>` : ""}
    <aside class="workspace-inspector${inspectorScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${
      inspectorClassName ? ` ${esc(inspectorClassName)}` : ""
    }"${attributesMarkup$1(inspectorAttributes)}>
      ${inspectorTitle == null ? '' : `<h3>${esc(inspectorTitle)}</h3>`}
      ${inspectorMarkup}
    </aside>
    ${bottomMarkup ? `<section class="screen-workbench-bottom${bottomScroll === 'body' ? ' screen-workbench-bottom--body-scroll' : ''}">
      ${bottomSize === 'resizable' ? '<div class="screen-workbench-bottom-grip" data-workbench-bottom-grip role="separator" aria-label="调整状态机通栏高度" aria-orientation="horizontal" tabindex="0"></div>' : ''}
      ${bottomMarkup}
    </section>` : ""}
  </div>`;
}

/** 画面正文由调用方提供。 */
function screenWorkbenchCanvasStage({
  namespace,
  canvasMarkup = "",
  toolbarMarkup = "",
  zoomStatusMarkup = "",
  footerMarkup = "",
  className = "",
  attributes = {},
  viewportClassName = "",
  viewportAttributes = {},
  zoomMarkup = canvasViewportControls(),
  sizing = "compact",
} = {}) {
  return `<div class="screen-workbench-preview screen-workbench-preview--${esc(sizing)}${
    className ? ` ${esc(className)}` : ""
  }"${attributesMarkup$1(attributes)}>
    ${toolbarMarkup || zoomMarkup ? `<div class="screen-workbench-toolbar">
      ${toolbarMarkup}
      ${zoomMarkup ? `<div class="screen-workbench-zoom">${zoomMarkup}${zoomStatusMarkup}</div>` : ''}
    </div>` : ""}
    <div class="screen-workbench-canvas-box${viewportClassName ? ` ${esc(viewportClassName)}` : ''}"
      data-screen-workbench-canvas-box="${esc(namespace)}"${attributesMarkup$1(viewportAttributes)}>
      ${canvasMarkup}
    </div>
    ${footerMarkup}
  </div>`;
}

function bindScreenWorkbenchZoom({namespace, zoom = "fit", onChange = () => {},
  canPan = () => true, root = document, canvasRoot = null, bindViewport = bindCanvasViewport} = {}) {
  const workbench = workbenchRoot(namespace, root);
  const canvas = canvasRoot ? canvasRoot.querySelector('.screen-workbench-canvas-box canvas')
    : workbenchCanvas(namespace, root);
  const viewport = canvas?.closest(".screen-workbench-canvas-box");
  if (!viewport) return null;
  const zoomControls = (canvasRoot || workbench).querySelector('.screen-workbench-zoom');
  const toolbar = workbench.querySelector('.workspace-stage > .screen-workbench-stage-toolbar');
  const previewToolbar = zoomControls?.closest('.screen-workbench-toolbar');
  if (!canvasRoot && toolbar && previewToolbar?.children.length === 1) {
    toolbar.append(zoomControls);
    previewToolbar.remove();
  }
  const updateAspectRatio = () => {
    viewport.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
  };
  updateAspectRatio();
  let surface = viewport.querySelector("[data-canvas-viewport-stack]");
  if (!surface) {
    surface = document.createElement("div");
    surface.dataset.canvasViewportStack = "";
    surface.append(...viewport.childNodes);
    viewport.append(surface);
  }
  viewport.tabIndex = 0;
  viewport.title = '滚轮或＋／−缩放；左键或中键拖动、方向键平移';
  return bindViewport({viewport, surface, canvas, controls: zoomControls, zoom, onChange,
    onLayout: updateAspectRatio,
    key: `screen:${namespace}:${new URL(location.href).searchParams.get("view") || ""}`,
    size: () => canvas, sizeElement: canvas, canPan});
}

/** 填满工作台的附属面板放入检查器，通栏高度只在图与预览间分配。 */
function bindScreenWorkbenchBottomResize({namespace, root = document, height = null,
  minCanvasHeight = 120, fitWorkbench = true, initialRatio = .5, storageKey = `workbench-bottom:${namespace}`,
  onChange = () => {}} = {}) {
  const workbench = workbenchRoot(namespace, root), grip = workbench?.querySelector('[data-workbench-bottom-grip]');
  if (!grip) return;
  if (fitWorkbench) {
    const inspector = workbench.querySelector('.workspace-inspector');
    const containers = new Set([workbench.parentElement, workbench.closest('#content')].filter(Boolean));
    for (const panel of [...containers].flatMap(container => [...container.children]))
      if (panel.matches('.page-module-editors, [data-scene-destination-users]')) inspector.append(panel);
  }
  const stage = workbench.querySelector('.workspace-stage');
  const viewport = workbench.querySelector('.screen-workbench-canvas-box');
  let requestedHeight = height;
  if (storageKey) {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (saved > 0) requestedHeight = saved;
    } catch { /* 浏览者存储不可用时使用初值。 */ }
  }
  let drag = null;
  const available = () => workbench.clientHeight - (workbench.querySelector(':scope > [data-page-header], :scope > .screen-workbench-top')?.offsetHeight || 0) - 1;
  const stageChrome = () => viewport?.querySelector('canvas')
    ? Math.max(0, stage.offsetHeight - viewport.clientHeight)
    : stage.querySelector('.screen-workbench-stage-toolbar')?.offsetHeight || 0;
  const limits = () => ({min: 120, max: fitWorkbench
    ? Math.max(120, available() - stageChrome() - minCanvasHeight)
    : Math.max(160, Math.round(window.innerHeight * .8))});
  const resize = (next, remember = false) => {
    const {min, max} = limits();
    height = Math.max(min, Math.min(max, Math.round(next)));
    workbench.style.setProperty('--workbench-bottom-height', `${height}px`);
    grip.setAttribute('aria-valuemin', min); grip.setAttribute('aria-valuemax', max);
    grip.setAttribute('aria-valuenow', height); grip.setAttribute('aria-valuetext', `${height} 像素`);
    if (remember) {
      requestedHeight = height;
      if (storageKey) {
        try {localStorage.setItem(storageKey, String(height));} catch { /* 页内高度继续有效。 */ }
      }
    }
    onChange(height);
  };
  const minimum = () => {
    const chrome = stageChrome();
    workbench.style.setProperty('--workbench-stage-min-height', `${Math.ceil(chrome + minCanvasHeight)}px`);
    workbench.style.setProperty('--workbench-toolbar-height', `${workbench.querySelector(':scope > [data-page-header], :scope > .screen-workbench-top')?.offsetHeight || 0}px`);
  };
  minimum(); resize(requestedHeight ?? available() * initialRatio);
  let resizeFrame = null;
  const observer = new ResizeObserver(() => {
    if (!workbench.isConnected) {
      observer.disconnect();
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
      return;
    }
    if (resizeFrame !== null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      if (!workbench.isConnected) {observer.disconnect(); return;}
      minimum();
      if (fitWorkbench) resize(requestedHeight ?? available() * initialRatio);
    });
  });
  observer.observe(stage);
  if (fitWorkbench) observer.observe(workbench);
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = {id: event.pointerId, y: event.clientY, height};
    grip.setPointerCapture(event.pointerId); grip.classList.add('dragging');
  });
  grip.addEventListener('pointermove', event => {
    if (event.pointerId === drag?.id) resize(drag.height + drag.y - event.clientY, true);
  });
  const release = event => {
    if (event.pointerId !== drag?.id) return;
    drag = null; grip.classList.remove('dragging');
    if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) grip.addEventListener(type, release);
  grip.addEventListener('keydown', event => {
    const {min, max} = limits();
    const next = {ArrowUp: height + 40, ArrowDown: height - 40, Home: min, End: max}[event.key];
    if (next == null) return;
    event.preventDefault(); resize(next, true);
  });
}

// @editor-module 跨视图共用的可选元素树
//
// 调用方把本域数据摊成带 id/kind/label/detail/depth 的顺序节点；本模块只负责
// 树容器与节点行。beforeNode/afterNode 是行两侧的插槽，供某一页放可见性开关、
// 跳转或地址等附加件，不把这些域知识带进共用行。重绘交互统一走文件末尾的入口，
// 由它恢复树的观察位置、选中节点可见性和被替换按钮的焦点。


// 字形只有这一份。调用方仍负责把自己的 kind 登记到哪一种字形和哪一个类型名。
const ELEMENT_TREE_ICONS = Object.freeze({
  group: "▣",
  layer: "▧",
  text: "T",
  target: "⌖",
  actor: "♟",
  layout: "▤",
  list: "☷",
  item: "○",
  action: "→",
  overlay: "◇",
  component: "◫",
  preview: "▶",
  fallback: "·",
});

// 同一概念在不同页面沿用各自原有措辞；页面只把 kind 登记到这些既有显示词。
const ELEMENT_TREE_LABELS = Object.freeze({
  interface: "界面",
  previewBackdrop: "预览背景",
  layout: "布局",
  writing: "文字",
  options: "选项列表",
  option: "选项",
  action: "行为",
  overlay: "叠加层",
  component: "组件",
  runtimePreview: "运行预览",
  screen: "画面",
  image: "图像",
  text: "文本",
  presentation: "演出",
  shot: "幕",
  camera: "镜头",
  actor: "角色",
  fallback: "节点",
});

/** 建立本页的 kind → {icon, label} 词表。 */
function defineElementTreeTypes(entries) {
  return Object.freeze(Object.fromEntries(
    Object.entries(entries || {}).map(([kind, entry]) => [
      kind,
      Object.freeze({...entry}),
    ]),
  ));
}

function elementTreeTypeLabel(
  types,
  kind,
  fallback = ELEMENT_TREE_LABELS.fallback,
) {
  return types?.[kind]?.label || kind || fallback;
}

function attributesMarkup(attributes) {
  return Object.entries(attributes || {}).map(([name, value]) => {
    if (value === undefined || value === null || value === false) return "";
    if (value === true) return ` ${esc(name)}`;
    return ` ${esc(name)}="${esc(value)}"`;
  }).join("");
}

/** 只画节点行；供局部重建树内容时复用，行结构仍只有这一份。 */
function elementTreeRows({
  nodes = [],
  types = {},
  selectedId = null,
  rowAttributes = () => ({}),
  buttonAttributes = () => ({}),
  iconAttributes = () => ({}),
  showIcons = true,
  beforeNode = () => "",
  afterNode = () => "",
} = {}) {
  return nodes.map(node => {
    const selected = node.id === selectedId;
    const type = types?.[node.kind] || {};
    const depth = Number.isFinite(Number(node.depth)) ? Number(node.depth) : 0;
    return `<div class="element-tree-node${selected ? " is-selected" : ""}"
      style="--element-tree-depth:${depth}"${
        attributesMarkup(rowAttributes(node, selected))}>
      ${beforeNode(node, selected)}
      <button type="button" class="element-tree-node-button"${
        attributesMarkup(buttonAttributes(node, selected))}>
        ${showIcons ? `<span class="element-tree-node-icon"${
          attributesMarkup(iconAttributes(node, selected))}>${
          esc(type.icon || ELEMENT_TREE_ICONS.fallback)}</span>` : ""}
        <span class="element-tree-node-copy"><b>${node.labelMarkup ?? esc(node.label)}</b>${
          node.detailMarkup || node.detail ? `<small>${node.detailMarkup ?? esc(node.detail)}</small>` : ""}</span>
      </button>
      ${afterNode(node, selected)}
    </div>`;
  }).join("");
}

/** 画完整树；className 只给页面自己的布局壳追加类名。 */
function elementTree({
  className = "",
  attributes = {},
  empty = "",
  ...rowOptions
} = {}) {
  const rows = elementTreeRows(rowOptions);
  return `<div class="element-tree${className ? ` ${esc(className)}` : ""}"${
    attributesMarkup(attributes)}>${rows || empty}</div>`;
}

function verticalScrollContainer(tree) {
  const ownerDocument = tree?.ownerDocument;
  const view = ownerDocument?.defaultView;
  for (let node = tree; node && node !== ownerDocument?.body
      && node !== ownerDocument?.documentElement; node = node.parentElement) {
    const overflow = view?.getComputedStyle(node)?.overflowY || "";
    if (/^(auto|scroll|overlay)$/.test(overflow)
        && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function visibleVerticalBounds(scroller, tree) {
  const bounds = scroller.getBoundingClientRect();
  let top = bounds.top + scroller.clientTop;
  let bottom = top + scroller.clientHeight;
  if (scroller === tree) return {top, bottom};

  // screen-workbench 的标题黏在滚动栏顶部。它不是树的一部分，但会盖住滚到
  // 最上沿的节点；这里按实际几何扣掉这类黏性兄弟，不把页面或域布局写进组件。
  for (const child of scroller.children) {
    if (child === tree
        || tree.contains(child)
        || getComputedStyle(child).position !== "sticky") continue;
    const childBounds = child.getBoundingClientRect();
    if (childBounds.top <= top && childBounds.bottom > top) {
      top = Math.min(bottom, childBounds.bottom);
    } else if (childBounds.top < bottom && childBounds.bottom >= bottom) {
      bottom = Math.max(top, childBounds.top);
    }
  }
  return {top, bottom};
}

function revealSelectedElementTreeNode(tree, scroller) {
  const selected = tree?.querySelector(
    ".element-tree-node.is-selected > .element-tree-node-button",
  );
  if (!selected || !scroller) return selected;
  const row = selected.closest(".element-tree-node") || selected;
  const {top, bottom} = visibleVerticalBounds(scroller, tree);
  const bounds = row.getBoundingClientRect();
  if (bounds.top < top) scroller.scrollTop += bounds.top - top;
  else if (bounds.bottom > bottom) scroller.scrollTop += bounds.bottom - bottom;
  return selected;
}

/**
 * 执行一次会重建树 DOM 的更新，并让新树里的选中节点仍可见。
 *
 * 旧 scrollTop 只作为新树的观察起点：选中节点若因筛选或结构变化移出视口，
 * 会再滚到最近边缘。滚动只写树自身或最近的非页面滚动容器。只有触发按钮原本
 * 持有焦点时，才把焦点放回新按钮，并用 preventScroll 避免牵动整页。
 */
async function rerenderElementTreeKeepingSelectionVisible(
  trigger,
  rerender,
) {
  const tree = trigger?.closest?.(".element-tree") || null;
  const root = tree?.getRootNode?.() || null;
  const trees = root?.querySelectorAll ? [...root.querySelectorAll(".element-tree")] : [];
  const treeIndex = trees.indexOf(tree);
  const scroller = verticalScrollContainer(tree);
  const scrollTop = scroller?.scrollTop || 0;
  const restoreFocus = trigger === trigger?.ownerDocument?.activeElement;

  await rerender();
  if (!tree) return null;

  const nextTrees = root?.querySelectorAll
    ? [...root.querySelectorAll(".element-tree")] : [];
  const nextTree = tree.isConnected ? tree : nextTrees[treeIndex] || null;
  const nextScroller = verticalScrollContainer(nextTree);
  if (nextScroller) nextScroller.scrollTop = scrollTop;
  const selected = revealSelectedElementTreeNode(nextTree, nextScroller);
  if (restoreFocus) selected?.focus({preventScroll: true});
  return selected;
}

export { ELEMENT_TREE_ICONS, ELEMENT_TREE_LABELS, acceptHistoryNavigation, allowEditorNavigation, applyInterfacePreviewSceneRoute, bindInternalPageLinks, bindScreenWorkbenchBottomResize, bindScreenWorkbenchZoom, configureEditorNavigation, currentViewUrl, defineElementTreeTypes, elementTree, elementTreeRows, elementTreeTypeLabel, ensureInterfacePreviewActor, focusByteMapTarget, interfacePreviewContext, interfacePreviewWantedHistoryOverrides, mountPageHeader, navigateInternalUrl, navigateView, openRecord, pageHeaderControls, pageHeaderMarkup, pageHeaderTabs, pushCurrentHistory, recordViewHref, rememberCurrentHistoryEntry, replaceHistoryUrl, rerenderElementTreeKeepingSelectionVisible, restoreEditorHistory, restorePageHeader, screenWorkbench, screenWorkbenchCanvasStage, selectInterfacePreviewBoundScene, selectInterfacePreviewContext, uiEditorNodeMap, uiEditorScreenForResource };
