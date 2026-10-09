import { db, trackAutoSavePreparation, hasPendingAutoSaves, flushAllAutoSaves, TEXT_RECORDS_RESOURCE_ID, sharedJsonValue, prepareAttackChrEntryContext, applyFacilityConfigurationProjection, UI_FACILITY_PARAMETER_RESOURCE_IDS, applyUiFacilityParameterProjection, mutableJsonProjection, monsterFormationFootprints, characterMapCandidateSourcesAvailable, recomputeCharacterMapCandidates, createTextRecordEncoding, createTextReferenceIndex, applyCurrentTextReferencesToProject, applyTextCatalogToStoryProject, DATA_SCHEMAS, hasFieldDocumentView, isProjectFieldContainerGetter, physicalAddressTarget, sceneDefaultMusicCommand, TILE_ACTION_HANDLE, storyScriptBytecode, sceneInteractionBoundObject, STORY_DIALOGUE_OPERATIONS, sceneTreasureContent, WORLD_TIDE_HANDLE, worldCoarsePatternCells, projectFieldDraftOrigin, trackProjectFieldProjection, projectStoryScriptPrograms, projectFieldDraftRevision, SCENE_SERVICE_INSTANCE_COUNTS, HIDDEN_TELEPORT_RESOURCE_ID, loadByteMapIndex, loadByteMapBank, TILE_ACTION_OWNER, WORLD_TIDE_OWNER, controllerSceneRemaps, SCENE_REMAP_OWNER, watchAutoSaveState, createSaveCurrentFieldObjects, saveVehicleAcquisitionTemplate, saveRentalVehicleTemplate, openSaveWorkspace, requireBrowserProjectRepository, ADDRESS_SPACE_IDS, createPrgPhysicalFieldObjects, saveFieldBindings, createSavePhysicalFieldObjects, byteMapSpaceDescriptor, byteMapBankDescriptor, loadAllByteMapRecordPages, loadByteMapRecordPagesForOffsets, loadedByteMapRecordPages, buildRomMapPrgAnnotations, projectPrgFieldObjects, ACTIVE_PROJECT_ID, publishBuildState, reportBuildState, SAVE_BUILD_BLOB_PREFIX, configureFieldObjectControls, autoSaveBusy, autoSaveError, openActiveProjectStore, createStaticPackageBootstrapProvider, openProjectSessionFromPackage, configureBrowserRomBuildProvider, createProjectStoreRomBuildProvider, renderCodeFields, globalRandomCycles, advanceGlobalRandom, changedSceneActors, formatPhysicalAddress, executeFacilityWindowRoutine, resumeFacilityWindowCycle, controllerServicePreview, facilityServiceStatePreviews, hasFieldOwner, fieldOwner } from './scene-actors-Cftr7mCE.js';
import { $, applySceneTownNames, applyTeleportDestinationNames, indexedResource, resourcePrimaryAddress, romMapAddressHref, sceneMetatileAttributeRecords, metatileBehaviorLabel, metatileBehaviorCode, editorErrorMarkup, esc, currentTextReference, registerModuleComponent, registerReferenceFieldPresentation, hydrateItemPickers, itemPickerFieldMarkup, renderModuleComponent, referenceFieldPickerMarkup, hydrateReferenceFieldPickers, loadChrBankBytes, decodeChrTile, paintChrTile, bytes, hex as hex$a, handleTextMarkup, resourceLabel, bindCanvasViewport, canvasViewportControls, deletePreviewCacheProject, previewCacheProjectStats, loadSceneElevators, setStatus, setResourceAlert, bindRecordLinks, bindVirtualTables, showEditorError, hydrateModuleComponents, bindGroupedReferenceSelect, flushCanvasViewportLayouts, bindStoryPageRecovery, paintVisibleSceneThumbnailCanvases, bindSidebarToggle, bindNavigationTree, flushFixedTextEditors, resetToOriginalButton, applyResetToOriginalStates, paintMonsterFigureCanvases as paintMonsterFigureCanvases$1, handleMarkup, audioCommandLabel, monsterFigureCanvas, resourceDomain as resourceDomain$1, currentTextReferenceLink, tableValueStack, resourceForwardReferenceCell } from './monster-figure-C07vG7yu.js';
import { writeAccessMarker } from './write-access-marker-Q1IasgBx.js';
import { canonicalJsonEqual, cloneValidatedJson, siteUrl, editorLog, logProgressText, LOG_LEVELS, logEntryText, applyJsonChanges, deletePackageCache, discardPackagePrefetch, packageCacheStats, RomLinker, sha256Hex, fileUrl } from './project-store-values-klefznSR.js';
import { encounterZoneColor } from './timeline-player-C0h-EABn.js';
import { prepareHiddenTeleportDestination, globalEventFlagHandle, hiddenTeleportGate, prepareGlobalEventFlags, globalEventFlagEntries, globalEventFlagEntry, storiesForEventFlag, hiddenTeleportDestination, hiddenTeleportFlags, eventFlagReferenceMarkup, prepareSaveEventLinks, physicalLocationMarkup } from './writeback-capabilities-CGLIL9l3.js';
import { state, applyStoryTimelineRowRoute, writeTabParam, BATTLE_SIMULATOR_ROUTE_KEYS, HISTORY_STATE_KEYS, normalizeShopPageRoute, normalizeBattlePageRoute, views, normalizeNesVideoStandard, tabFromParams, readBattleSimulatorRequest, normalizeInterfacePageId, ROM_MAP_TYPE_OPTIONS, defaultTab, SHOP_PAGES, SHOP_ITEM_BUYER_ROUTE, itemPageRoute, dedicatedUiPageForScreen, INTERFACE_PAGE_DEFINITIONS, serviceFamilyPage, ROM_MAP_FUNCTION_MODULES, ROM_MAP_FUNCTION_MODULE_BY_ID, ROM_MAP_FUNCTION_MODULE_PRIORITY, editorPageForRoute, editorPageGroups, EDITOR_PAGES, interfacePageDefinition, editorPageRoute, storyNavigationInfo } from './emulator-Bl-sLXnd.js';
import { storyPlaybackView, loadResourceRangeAssociationManifest, loadResourceRangeAssociationShard, storyEditableView, STORY_PAGE_VIEW_IDS, storyViewForSequenceId, loadPhysicalFieldSourceIndex, STORY_PAGE_DEFINITIONS, applyStoryPageNames, storyPageDefinitionForView, EDITABLE_STORY_VIEW_IDS } from './baseline-assembly-C0KRII8X.js';
import { SECTIONS_BY_VIEW, RESOURCE_DOMAINS_BY_VIEW, RESOURCE_RANGE_DOMAINS_BY_VIEW, DATA_ASSETS_BY_VIEW, ALL_RESOURCE_INDEX_DOMAINS, pageRuntimeModulePaths, PAGE_RUNTIME_PATHS } from './page-runtime-paths-_6fUGFtn.js';

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

let active = null;

async function metatileEditSession(handle) {
  const resource = handle.startsWith("metatile-set:") ? "metatile-set" : "metatile-page";
  const suffix = handle.split(":").at(-1);
  const [definitions, attributes] = await Promise.all([
    db.getField(resource, resource === "metatile-set"
      ? `metatile-set:${suffix}-definitions` : `metatile-page:definitions-${suffix}`, "value0"),
    db.getField(resource, resource === "metatile-set"
      ? `metatile-set:${suffix}-attributes` : `metatile-page:attributes-${suffix}`, "value0"),
  ]);
  if (active?.handle === handle && active.definitions === definitions) return active;
  const pending = new Map();
  const session = {
    handle, definitions, attributes, repository: state.projectRepository, saving: null, onChange: null,
    get dirty() {return pending.size > 0;},
    read(field) {return pending.has(field) ? pending.get(field) : field.value;},
    paintChrTable(table, bankIds) {
      for (const [field, value] of pending) if (field.resourceId === "shared-chr-bank") {
        bankIds.forEach((bank, index) => {
          if (Number(bank) === field.recordId) table.set(value,
            index * 1024 + field.tileId * 16 + (field.fieldName === "plane_1" ? 8 : 0));
        });
      }
      return table;
    },
    value(resourceId, entityHandle, fieldName, fallback) {
      for (const [field, value] of pending) if (field.resourceId === resourceId
          && field.entityHandle === entityHandle && field.fieldName === fieldName) return value;
      return fallback;
    },
    set(field, value) {
      if (session.saving) return;
      if (canonicalJsonEqual(value, field.value)) pending.delete(field);
      else pending.set(field, structuredClone(value));
      session.onChange?.();
    },
    discard() {pending.clear(); session.onChange?.();},
    save() {
      if (session.saving) return session.saving;
      const groups = new Map();
      for (const [field, value] of pending) {
        if (!groups.has(field.resourceId)) groups.set(field.resourceId, []);
        groups.get(field.resourceId).push({field, value});
      }
      session.saving = trackAutoSavePreparation((async () => {
        for (const changes of groups.values()) {
          await db.writeFields(changes);
          for (const {field, value} of changes) if (pending.get(field) === value) pending.delete(field);
        }
      })().finally(() => {session.saving = null; session.onChange?.();}));
      session.onChange?.();
      return session.saving;
    },
  };
  active = session;
  return session;
}

async function allowMetatileNavigation(value) {
  if (!active || active.repository !== state.projectRepository) return true;
  if (active.saving) {
    try {await active.saving;} catch {return false;}
  }
  if (!active.dirty) return true;
  const url = value instanceof URL ? value : new URL(value, location.href);
  if (url.searchParams.get("view") === "metatiles"
      && url.searchParams.get("metatile") === active.handle) return true;
  if (!window.confirm("元图块页有未保存改动，放弃改动并继续？")) return false;
  active.discard();
  return true;
}

function suspendMetatileEditor() {
  const editor = document.querySelector("[data-metatile-editor]");
  if (editor) editor.inert = true;
}

window.addEventListener("beforeunload", event => {
  if (active?.repository !== state.projectRepository || !active?.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

// @editor-module 管理 URL 路由、历史状态与视图导航。
//
// 来源：拆分前 engine/editor/app.js 第 13-182 行。


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
  if (!await allowMetatileNavigation(location.href)) {
    history.go(historyPosition - nextPosition);
    return false;
  }
  historyPosition = nextPosition;
  suspendMetatileEditor();
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
    if (!state.sceneSlug && state.sceneListTab !== "scenes") url.searchParams.set("sceneTab", state.sceneListTab);
    if (!state.sceneSlug && state.sceneListTab === "actors" && state.npcRole !== "all") url.searchParams.set("npcRole", state.npcRole);
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
  if (state.view === "npcs" && state.npcRole !== "all") {
    url.searchParams.set("npcRole", state.npcRole);
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
  suspendMetatileEditor();
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
  if (!await allowMetatileNavigation(new URL(`?view=${view}`, location.href))) return;
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
    : ["npcs", "investigation"].includes(requested) ? "scenes"
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
    state.sceneListTab = requested === "npcs" ? "actors" : requested === "investigation" ? "investigation"
      : ["scenes", "actors", "investigation"].includes(params.get("sceneTab")) ? params.get("sceneTab") : "scenes";
    state.npcRole = params.get("npcRole") || "all";
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
  } else if (state.view === "npcs") {
    const role = params.get("npcRole") || "all";
    state.npcRole = role;
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
  if (!await allowMetatileNavigation(value)) return false;
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
  const sceneOverview = view === "scenes" && !state.sceneSlug && !state.interactionFlow && state.sceneListTab === "scenes";
  const sceneDirectory = view === "scenes" && !state.sceneSlug && !state.interactionFlow && state.sceneListTab !== "scenes";
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
  if (view === 'battle-test') {
    const {prepareStoryBattleEntry} = await Promise.resolve().then(function () { return storyBattleEntry; });
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
      const {projectStoryOperands} = await import('./scene-actors-Cftr7mCE.js').then(function (n) { return n.storyFieldRouting; });
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

// @editor-module 从界面投影取得节点索引。
function uiEditorNodeMap(document) {
  const nodes = document.nodes;
  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes)) return new Map();
  return new Map(Object.entries(nodes));
}

// @editor-module 把被引用的资源解析成登记它的界面状态。


function uiEditorScreenForResource(uid) {
  const document = state.project?.ui?.editor;
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

// @editor-module 把资源身份解析为页面路由并执行跳转、聚焦。
//
// 来源：拆分前 engine/editor/app.js 第 331-517 行。


// 界面状态没有自己的页面：落到登记了它的页面（interfaceui 子页，或商店、通缉令、
// 设施等专页）。没有登记的落点返回 false，调用方据此去掉跳转。
function applyUiScreenRoute(route, screen) {
  if (!route || !screen) return false;
  const destination = dedicatedUiPageForScreen(screen);
  if (!destination) return false;
  route.view = destination.view;
  if (destination.view === "shops" && destination.shopTab === "buyer") {
    Object.assign(route, SHOP_ITEM_BUYER_ROUTE, {interfacePageScreen: screen.id});
    return true;
  }
  if (destination.view !== "interfaceui") return true;
  route.interfacePage = destination.interfacePage;
  // 独立的 constructor 证据不等于 canonical state。只有界面状态 screen
  // 才能写进 interfaceScreen；页面会为 constructor 自动选中其关联状态。
  const screenInterface = screen.interface_id ?? screen.metadata?.interface_id;
  route.interfacePageScreen = destination.interfaceIds.includes(screenInterface)
    && Boolean(screen.interface_state_id)
    ? screen.id : null;
  return true;
}

// 应用命令落到登记了该命令的界面页（页面的「菜单命令 / 应用命令」即这些命令号）；
// 同一个命令号被多页登记时取登记顺序在前的一页。
const INTERFACE_PAGE_BY_COMMAND = new Map();
for (const definition of INTERFACE_PAGE_DEFINITIONS) {
  for (const commandId of [
    ...(definition.menuCommandIds || []), ...(definition.commandIds || []),
  ]) {
    if (!INTERFACE_PAGE_BY_COMMAND.has(Number(commandId))) {
      INTERFACE_PAGE_BY_COMMAND.set(Number(commandId), definition.id);
    }
  }
}

const FACILITY_VIEW_BY_UI_FACILITY = Object.freeze({
  "ui-facility:jukebox": "jukebox",
  "ui-facility:vending-machine": "vending",
  "ui-facility:frog-race": "frograce",
  "ui-facility:teleport-terminal": "teleport",
  "ui-facility:computer-controller": "computercontroller",
});

// 不属于商店配置族的三个配置族各有自己的机器页。
const FACILITY_VIEW_BY_CONFIG_FAMILY = Object.freeze({
  0x0A: "jukebox",
  0x0B: "vending",
  0x0C: "vending",
});

function resourceTargetRoute(record) {
  if (!record) return null;
  const routes = {
    "ui-script-record": {view: "text"},
    "font-glyph": {view: "text", textMode: "charset", charsetEditorMode: "rows",
      charsetSearch: record.uid, charsetStatus: "all", charsetPage: 0},
    "font-core-template": {view: "text", textMode: "charset"},
    "font-core-glyph": {view: "text", textMode: "charset"},
    "complete-menu": {view: null},
    "vehicle-portrait": {view: null},
    "actor-motion": {view: "actors", actorVisualTab: "sprites"},
    "actor-type": {view: "actors", actorVisualTab: "sprites"},
    "actor-chr-set": {view: "actors", actorVisualTab: "sprites"},
    "sprite-context": {view: "actors", actorVisualTab: "sprites"},
    "attack-visual": {view: "attack-effects"},
    "attack-visual-aux-script": {view: "attack-effects"},
    "attack-script": {view: "attack-effects"},
    "effect-stream": {view: "attack-effects"},
    "battle-action": {view: "attack-effects"},
    "battle-object-action": {view: "attack-effects"},
    "battle-object-layout": {view: "attack-effects"},
    "enemy-attack-selector": {view: "battle-test"},
    "encounter-formation": {view: "monster-formations"},
    "investigation-battle-test": {view: "battle-test"},
    "monster-graphic": {view: "monsters"},
    "monster-battle-figure": {view: "monsters"},
    // scene 草稿可能正被剧情舞台消费；返回同一场景时保留它，由 renderScenes 的
    // repository identity 判定能否复用，不能在资源路由层先清空。
    "map-scene": {view: "scenes", sceneSlug: null},
    "scene-actor-record": {view: "scenes", sceneSlug: null, sceneListTab: "actors", npcRole: "all"},
    "scene-event": {view: "scenes"},
    "scene-boundary": {view: "scenes"},
    "scene-transition": {view: "scenes"},
    "npc-service-handler": {view: "scenes", sceneSlug: null, sceneListTab: "actors", npcRole: "all"},
    "story-action-script": {view: "actors", actorVisualTab: "story"},
    "inline-story-action": {view: "actors", actorVisualTab: "story", storyKind: "inline"},
    "story-sequence": {view: null},
    "character-template": {view: "characters"},
    "vehicle-template": {view: "vehicles"},
    "monster-stat": {view: "monsters"},
    "item": {view: "items"},
    "field-item-use": {view: "items"},
    "battle-item-use": {view: "items"},
    "field-item-dispatch": {view: "items"},
    "battle-item-dispatch": {view: "items"},
    "special-shell": {view: "shells"},
    "normal-shell": {view: "shells"},
    "audio-command": {view: "audio"},
    "audio-control": {view: "audio"},
    "audio-track": {view: "audio"},
    "audio-sequence-stream": {view: "audio"},
    "audio-sequence-execution": {view: "audio"},
    "audio-sequence-instruction": {view: "audio"},
    "audio-sequence-opcode": {view: "audio"},
    "audio-voice": {view: "audio"},
    "audio-voice-instruction": {view: "audio"},
    "audio-sequence-region": {view: "audio"},
    "audio-driver-section": {view: "audio"},
    "dpcm-sample": {view: "audio"},
    "ui-facility": {view: null},
    "scene-investigation": {view: "scenes"},
    "scene-investigation-special": {view: "scenes"},
    "scene-investigation-tile": {view: "scenes"},
    "scene-treasure": {view: "scenes"},
    "facility-track": {view: "jukebox"},
    "facility-routine": {view: "jukebox"},
    "facility-configuration": {view: "vending"},
    "investigation-command": {view: "scenes", sceneSlug: null, sceneListTab: "investigation"},
    "investigation-configuration": {view: "scenes", sceneSlug: null, sceneListTab: "investigation"},
    "application-command": {view: null},
    "application-configuration-family": {view: null},
  };
  const route = routes[record.kind] ? {...routes[record.kind]} : null;
  if (route && record.kind === "ui-facility") {
    const view = FACILITY_VIEW_BY_UI_FACILITY[record.uid];
    if (!view) return null;
    route.view = view;
    route.facilityTab = "ui";
  }
  if (route && record.kind === "application-configuration-family") {
    const family = Number.parseInt(String(record.uid).split(":").at(-1), 16);
    const shopPage = SHOP_PAGES.find(page => Number(page.route.shopFamily) === family);
    route.view = shopPage || family === 13 ? "shops" : FACILITY_VIEW_BY_CONFIG_FAMILY[family] || null;
    if (route.view === "shops") route.shopFamily = family === 13 ? 0 : family;
    if (family === 13) route.shopTab = "config";
    if (!route.view) return null;
  }
  if (route && record.kind === "application-command") {
    if (record.uid === "application-command:24") return {...route, ...SHOP_ITEM_BUYER_ROUTE,
      interfacePageScreen: null};
    const pageId = INTERFACE_PAGE_BY_COMMAND.get(
      Number.parseInt(String(record.uid).split(":").at(-1), 16),
    );
    route.view = pageId ? "interfaceui" : "scenes";
    if (pageId) {
      route.interfacePage = pageId;
      route.interfacePageScreen = null;
    } else Object.assign(route, {sceneSlug: null, sceneListTab: "actors", npcRole: "all"});
  }
  if (route && (record.kind === "complete-menu" || record.kind === "vehicle-portrait")) {
    const screen = uiEditorScreenForResource(record.uid);
    if (!screen || !applyUiScreenRoute(route, screen)) return null;
  }
  if (route && record.kind === "facility-routine") {
    if (record.uid.includes(":jukebox:")) route.view = "jukebox";
    else if (record.uid.includes(":vending-machine:")) route.view = "vending";
    else if (record.uid.includes(":frog-race:")) route.view = "frograce";
    else if (record.uid.includes(":teleport-terminal:")) route.view = "teleport";
    else if (record.uid.includes(":computer-controller:")) route.view = "computercontroller";
  }
  if (route && record.kind === "facility-configuration") {
    route.facilityTab = "config";
    if (record.uid.includes(":jukebox:")) route.view = "jukebox";
    else if (record.uid.includes(":frog-race:")) route.view = "frograce";
    else if (record.uid.includes(":teleport-terminal:")) route.view = "teleport";
    else if (record.uid.includes(":computer-controller:")) route.view = "computercontroller";
    else route.view = "vending";
  }
  if (route && record.kind === "item") {
    const itemId = Number.parseInt(record.uid.split(":").at(-1), 16);
    const item = state.project?.game_data?.items?.records?.find(item => Number(item.id) === itemId);
    route.view = itemPageRoute(item || {id: itemId}).view;
    route.recordId = Number.isInteger(itemId) ? String(itemId) : null;
  }
  if (route && ["character-template", "vehicle-template", "monster-stat",
    "normal-shell", "special-shell"].includes(record.kind)) {
    route.recordId = String(Number.parseInt(record.uid.split(":").at(-1), 16));
  }
  if (route && ["attack-visual", "attack-visual-aux-script", "attack-script",
    "effect-stream", "battle-object-action", "monster-battle-figure",
    "enemy-attack-selector", "encounter-formation"].includes(record.kind)) {
    route.recordId = record.uid;
  }
  if (route && ["audio-command", "audio-control", "audio-track",
    "audio-sequence-stream", "audio-sequence-execution", "audio-sequence-instruction",
    "audio-sequence-opcode", "audio-voice", "audio-voice-instruction",
    "audio-sequence-region", "audio-driver-section", "dpcm-sample"].includes(record.kind)) {
    route.recordId = record.uid;
  }
  if (route && ["field-item-use", "battle-item-use"].includes(record.kind)) {
    const itemId = Number.parseInt(record.uid.split(":").at(-1), 16);
    route.recordId = Number.isInteger(itemId) ? String(itemId) : null;
  }
  if (route && ["field-item-dispatch", "battle-item-dispatch"].includes(record.kind)) {
    route.recordId = null;
  }
  if (route && record.kind === "story-action-script") {
    route.storyKind = record.uid.includes(":interaction:") ? "interaction" : "autonomous";
    route.recordId = String(Number.parseInt(record.uid.split(":").at(-1), 16));
  }
  if (route && record.kind === "inline-story-action") {
    route.recordId = String(Number.parseInt(record.uid.split(":").at(-1), 16));
  }
  if (route && record.kind === "story-sequence") {
    const sequenceId = String(record.uid || "").replace(/^story-sequence:/u, "");
    const dedicatedView = storyViewForSequenceId(
      sequenceId,
    ) || "story-sequence";
    route.view = dedicatedView;
    route.storySequenceId = sequenceId;
  }
  return route;
}

async function navigateToResourceTarget(uid) {
  const navigationGeneration = ++state.navigationGeneration;
  const stillCurrent = () => navigationGeneration === state.navigationGeneration;
  const clearQuery = () => {
    state.query = "";
    const input = $("#search");
    if (input) input.value = "";
  };
  const metatile = /^(metatile-page:[0-9A-F]{2}|metatile-set:[0-9A-F]{2})(?::([0-9A-F]{2}))?$/u.exec(uid);
  if (metatile) {
    const owner = metatile[1].startsWith("metatile-set:") ? "metatile-set" : "metatile-page";
    const document = await db.getResourceDocument(owner, null);
    if (!stillCurrent()) return false;
    const page = document?.records?.find(record => record.handle === metatile[1]);
    const definitions = page?.metatile_definitions || page?.metatile_definition_page;
    if (!page || (metatile[2] && (!Array.isArray(definitions)
      || Number.parseInt(metatile[2], 16) >= definitions.length))) return false;
    if (owner === "metatile-set" && (page.kind !== "shared-page-pair" || metatile[2])) return false;
    if (!await allowMetatileNavigation(`?view=metatiles&metatile=${metatile[1]}`)) return false;
    rememberCurrentHistoryEntry();
    state.resourceId = uid;
    state.recordId = null;
    state.view = "metatiles";
    clearQuery();
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", "metatiles");
    url.searchParams.set("resource", uid);
    url.searchParams.set("metatile", metatile[1]);
    url.searchParams.set("tile", String(Number.parseInt(metatile[2] || "00", 16)));
    pushCurrentHistory(url);
    await render();
    return true;
  }
  const encounterZone = /^scene-encounter-zone:zone:([0-9A-F]{2})$/u.exec(uid);
  if (encounterZone) {
    const [scenes, zones] = await Promise.all([
      db.getDocument("project.scenes", null), db.getDocument("scene-encounter-zone", null),
    ]);
    if (!stillCurrent()) return false;
    const zoneId = Number.parseInt(encounterZone[1], 16);
    const block = zones?.world_grid?.blocks?.find(row => Number(row.zone_id) === zoneId);
    const assignment = zones?.scene_zones?.assignments?.find(row => Number(row.zone_id) === zoneId
      && scenes?.editable_scenes?.some(scene => Number(scene.id) === Number(row.scene_id)));
    const scene = scenes?.editable_scenes?.find(item => Number(item.id)
      === (block || !assignment ? 0 : Number(assignment.scene_id)));
    if (!scene || !zones?.zones?.some(zone => Number(zone.zone_id) === zoneId)) return false;
    if (!await allowMetatileNavigation("?view=scenes")) return false;
    if (!stillCurrent()) return false;
    rememberCurrentHistoryEntry();
    Object.assign(state, {resourceId: uid, recordId: null, view: "scenes",
      sceneSlug: scene.slug, sceneEditMode: "encounters", sceneEncounterInspect: zoneId,
      sceneLogicSelection: null, sceneFocusPoint: block ? [Number(block.cell_x), Number(block.cell_y)] : null,
      sceneEncounterBlock: block ? Number(block.index) : null, sceneEncounterBrush: null,
      sceneZoomSlug: scene.slug, sceneZoomAuto: true});
    clearQuery();
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", "scenes");
    url.searchParams.set("resource", uid);
    url.searchParams.set("scene", scene.slug);
    url.searchParams.set("sceneMode", "encounters");
    url.searchParams.set("encounterZone", String(zoneId));
    if (block) url.searchParams.set("scenePoint", state.sceneFocusPoint.join(","));
    pushCurrentHistory(url);
    await render();
    return true;
  }
  // 全域索引不再随首页预载。先按 UID 前缀取当前 domain，再做同步路由判断。
  await ensureResourceNavigationData(uid);
  if (!stillCurrent()) return false;
  const record = indexedResource(uid);
  if (!record) return false;
  if (!await allowMetatileNavigation("?view=home")) return false;
  // 跳转按钮在很多页都有，而按下它的那一页不一定用过这两份数据：ROM 范围表决定
  // 跳到字节手册的哪个地址，UI 编辑器模型决定该不该进 UI 编辑器。不先备好的话，
  // 轻则静默跳不动，重则本该进编辑器的资源被当成「只有字节地址」跳去字节手册。
  if (record.kind === "chr-bank-1k") {
    const bank = Number.parseInt(record.game_id, 16);
    rememberCurrentHistoryEntry();
    state.resourceId = uid;
    state.view = "bytemap-chr";
    state.romMapChrTile = bank * 64;
    pushCurrentHistory();
    render();
    return true;
  }
  const route = resourceTargetRoute(record);
  if (route && record.kind === "facility-configuration"
      && uid.startsWith("ui-facility:vending-machine:config:")) {
    const configId = Number.parseInt(uid.split(":").at(-1), 16);
    const facilities = await db.getDocument("project.facilities", null);
    if (!stillCurrent()) return false;
    const variant = (facilities?.facilities || [])
      .find(item => item.id === "vending-machine")?.configuration?.variants
      ?.find(item => Number(item.id) === configId);
    if (!variant || !["item", "ammunition"].includes(variant.family)) return false;
    route.vendingPreviewFamily = variant.family === "item" ? 0x0B : 0x0C;
    route.vendingPreviewConfiguration = Number(variant.family_configuration_id);
  }
  if (!route) {
    // ROM 位置的唯一出处是字节地图派生的范围表；没登记就跳不了。
    const romEntry = resourcePrimaryAddress(uid);
    const target = physicalAddressTarget(romEntry);
    const href = romMapAddressHref(romEntry);
    if (!href || !target) return false;
    rememberCurrentHistoryEntry();
    state.resourceId = uid;
    // 地址空间直接决定去哪个页面——三个空间三个视图，没有页内开关。
    state.view = target.view;
    focusByteMapTarget(target);
    const url = new URL(href.replaceAll("&amp;", "&"), location.href);
    url.searchParams.set("resource", uid);
    pushCurrentHistory(url);
    render();
    return false;
  }
  // 资源链接本身只解析路由。目标页正文必须等它真正成为 active view 后由 render()
  // 准备；否则慢跳转被普通导航取消后，旧请求仍会把另一页的 projection 挂进全局状态。
  let targetSceneEntry = null;
  const targetsSceneEditor = record.kind === "map-scene" || record.kind === "scene-actor-record"
    || ["scene-event", "scene-boundary", "scene-transition"].includes(record.kind)
    || record.kind.startsWith("scene-investigation")
    || record.kind === "scene-treasure";
  if (targetsSceneEditor) {
    const [, sceneHex = "00"] = uid.split(":");
    const sceneId = Number.parseInt(sceneHex, 16);
    const scenes = await db.getDocument("project.scenes", null);
    if (!stillCurrent()) return false;
    targetSceneEntry = (scenes?.editable_scenes || []).find(
      item => Number(item.id) === sceneId,
    );
  }
  if (targetsSceneEditor && !targetSceneEntry) return false;
  rememberCurrentHistoryEntry();
  state.recordId = null;
  if (record.kind === "ui-script-record") {
    const [, region = "00", row = "000"] = uid.split(":");
    state.resourceId = uid;
    state.view = "text";
    state.textMode = "records";
    state.textRegion = region;
    state.textKind = "all";
    state.textSearch = `record:${region}:${row}`;
  } else if (record.kind === "map-scene") {
    state.resourceId = uid;
    Object.assign(state, route);
    state.sceneSlug = targetSceneEntry.slug;
    state.sceneLogicSelection = null;
  } else if (targetsSceneEditor) {
    const [, , objectHex = "00"] = uid.split(":");
    const objectKind = ({"scene-actor-record": "actor", "scene-investigation": "investigation",
      "scene-investigation-special": "investigation-special",
      "scene-investigation-tile": "investigation-tile", "scene-treasure": "treasure",
      "scene-transition": "transition", "scene-boundary": "boundary",
      "scene-event": "event"})[record.kind];
    state.resourceId = uid;
    Object.assign(state, route);
    state.sceneSlug = targetSceneEntry.slug;
    state.sceneLogicSelection = `${objectKind}:${Number.parseInt(objectHex, 16)}`;
    state.sceneEditMode = "logic";
  } else {
    state.resourceId = uid;
    Object.assign(state, route);
  }
  clearQuery();
  const url = new URL(location.href);
  [
    "scene", "textRegion", "textKind", "textSearch", "textMode", "charsetSearch",
    "charsetStatus", "charsetPage", "charsetEditor", "actorPart", "npcRole",
    "storyKind", "battlePart", "data", "interface", "interfaceScreen",
    "record", "sceneObject", "sceneMode", "encounterZone", "metatile", "tile",
    "storySequence", "facility", "vendingFamily", "vendingConfig",
  ].forEach(key => url.searchParams.delete(key));
  url.searchParams.set("view", state.view);
  url.searchParams.set("resource", uid);
  if (state.view === "equipment" && record.kind === "item") {
    url.searchParams.set("equipmentDomain",
      uid.startsWith("tank-item:") ? "tank" : "human");
  }
  if (state.view === "shops") {
    url.searchParams.set("shopFamily", state.shopFamily);
    writeTabParam("shop", url, state.shopTab);
    if (state.shopTab === "buyer" && state.interfacePageScreen)
      url.searchParams.set("interfaceScreen", state.interfacePageScreen);
  }
  if (state.facilityTab && ["jukebox", "vending", "frograce", "teleport", "computercontroller"].includes(state.view)) {
    url.searchParams.set("facility", state.facilityTab);
  }
  if (state.view === "vending" && state.facilityTab === "config") {
    url.searchParams.set("vendingFamily", String(state.vendingPreviewFamily));
    url.searchParams.set("vendingConfig", String(state.vendingPreviewConfiguration));
  }
  if (state.view === "text") {
    url.searchParams.set("textMode", state.textMode);
    url.searchParams.set("textRegion", state.textRegion);
    url.searchParams.set("textKind", state.textKind);
    url.searchParams.set("textSearch", state.textSearch);
    if (state.textMode === "charset") {
      url.searchParams.set("charsetSearch", state.charsetSearch);
      url.searchParams.set("charsetEditor", state.charsetEditorMode);
    }
  }
  if (state.view === "actors") {
    url.searchParams.set("actorPart", state.actorVisualTab);
    if (state.actorSet !== null) url.searchParams.set("actorSet", String(state.actorSet));
    if (state.actorVisualTab === "story" && state.storyKind) {
      url.searchParams.set("storyKind", state.storyKind);
    }
  }
  if (state.view === "interfaceui") {
    url.searchParams.set("interface", state.interfacePage);
    if (state.interfacePageScreen) {
      url.searchParams.set("interfaceScreen", state.interfacePageScreen);
    }
  }
  if (state.storySequenceId && record.kind === "story-sequence") {
    url.searchParams.set("storySequence", state.storySequenceId);
  }
  if (state.view === "scenes" && state.sceneSlug) url.searchParams.set("scene", state.sceneSlug);
  else if (state.view === "scenes" && state.sceneListTab !== "scenes") url.searchParams.set("sceneTab", state.sceneListTab);
  if (state.view === "scenes" && state.sceneLogicSelection) url.searchParams.set("sceneObject", state.sceneLogicSelection);
  if (state.recordId !== null) url.searchParams.set("record", state.recordId);
  pushCurrentHistory(url);
  await render();
  if (route.recordId !== undefined && route.recordId !== null && state.recordId === null) return false;
  return [...document.querySelectorAll("[data-resource-query], [data-resource-handle]")]
    .some(node => (node.dataset.resourceQuery || node.dataset.resourceHandle) === uid);
}

function focusResourceTarget(selectedButton = null) {
  if (!state.resourceId) return;
  const button = selectedButton?.dataset.resourceQuery === state.resourceId
    ? selectedButton : [...document.querySelectorAll("[data-resource-query], [data-resource-handle]")]
      .find(node => (node.dataset.resourceQuery || node.dataset.resourceHandle) === state.resourceId);
  const row = button?.closest("tr") || button?.closest("article") || button;
  if (!row) return;
  row.classList.add("resource-target-focus");
  // Scroll the compact UID anchor, not an oversized table row with rowspans;
  // Chromium can otherwise align the far edge of a wide row and leave the
  // selected first column outside the viewport.
  if (!selectedButton) button.scrollIntoView({block: "center", inline: "nearest"});
}

var resourceNav = /*#__PURE__*/Object.freeze({
  __proto__: null,
  focusResourceTarget: focusResourceTarget,
  navigateToResourceTarget: navigateToResourceTarget,
  resourceTargetRoute: resourceTargetRoute
});

// @editor-module 场景音乐与进场剧情入口的纯数据投影。
const hex$9 = (value, width = 2) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

const ENTRY_KINDS = Object.freeze({
  "scene-loaded-autonomous-script": "场景加载后执行自动脚本",
  "coordinate-gated-autonomous-script": "场景加载后由坐标门触发自动脚本",
  "referenced-interaction-bootstrap+coordinate-gated-autonomous-script": "坐标门自动脚本；另有交互入口",
});

function uniqueEntryPath(program, targetCursor) {
  const commands = new Map((program?.commands || []).map(command => [command.cursor, command]));
  const paths = [];
  function walk(cursor, path, visited) {
    if (paths.length > 1 || visited.has(cursor)) return;
    if (cursor === targetCursor) { paths.push(path); return; }
    const command = commands.get(cursor);
    if (!command) return;
    const nextVisited = new Set(visited);
    nextVisited.add(cursor);
    for (const edge of command.edges || []) {
      walk(edge.target_cursor, [...path, {command, edge}], nextVisited);
    }
  }
  walk(0, [], new Set());
  return paths.length === 1 ? paths[0] : null;
}

function entryCondition(story, item) {
  const list = story.browser_vm?.extended_actor_lists?.find(entry =>
    Number(entry.id) === Number(item.actor_list_ids?.[0])
  );
  const constraints = list?.entry_flag_constraints;
  if (!Number.isInteger(constraints?.source_script_id)
    || !Number.isInteger(constraints?.target_control_lock_cursor)) return null;
  const program = story.browser_vm?.programs?.find(entry =>
    entry.kind === "autonomous" && Number(entry.id) === constraints.source_script_id
  );
  const path = uniqueEntryPath(program, constraints.target_control_lock_cursor);
  if (!path) return null;
  const flags = [
    ...(constraints.required_set_flags || []).map(id => `${globalEventFlagHandle(id)} 已置位`),
    ...(constraints.required_clear_flags || []).map(id => `${globalEventFlagHandle(id)} 未置位`),
  ];
  const positions = path.flatMap(({command, edge}) => {
    if (command.opcode === 0x35) return [
      `${hex$9(command.operands[0], 2)}≤X<${hex$9(command.operands[1], 2)}、${
        hex$9(command.operands[2], 2)}≤Y<${hex$9(command.operands[3], 2)}${edge.kind === "normal" ? "" : " 的范围外"}`,
    ];
    if (command.opcode === 0x08) return [
      `X=${hex$9(command.operands[0], 2)}、Y=${hex$9(command.operands[1], 2)}${
        edge.kind === "normal" ? "" : " 以外"}`,
    ];
    return [];
  });
  return {
    trigger: [ENTRY_KINDS[item.entry_evidence], ...flags, ...positions].join("；"),
    evidence: `自动脚本 ${hex$9(constraints.source_script_id, 2)} · 控制锁`,
  };
}

function sceneEntryStoryItemsForProject(sceneId, story) {
  const inventory = story.cutscene_inventory?.entries || [];
  const entries = inventory.filter(item =>
    ENTRY_KINDS[item.entry_evidence]
    && item.scene_ids?.includes(Number(sceneId))
    && storyViewForSequenceId(item.id)
  ).map(item => {
    const condition = entryCondition(story, item);
    return condition ? {id: item.id, label: item.label, ...condition,
      classification: item.classification} : null;
  }).filter(Boolean);
  for (const variant of story.special_actor_lists || []) {
    if (!Number.isInteger(variant.selection?.story_state)) continue;
    const context = story.story_mode_contexts?.entries?.find(item =>
      Number(item.story_state) === Number(variant.selection.story_state)
      && Number(item.scene_actor_entry) === Number(variant.id)
    );
    if (Number(context?.scene_id) !== Number(sceneId)
      || !variant.entry_sources?.sources?.length) continue;
    const sequence = inventory.find(item => item.actor_list_ids?.includes(Number(variant.id))
      && storyViewForSequenceId(item.id));
    if (!sequence) continue;
    entries.unshift({
      id: sequence.id,
      label: sequence.label,
      trigger: `剧情状态 $0481=${hex$9(variant.selection.story_state, 2)} 时选择特殊角色表 ${String(variant.id_hex)}`,
      evidence: `写入来源 ${variant.entry_sources?.sources?.map(source => source.kind === "machine-code-constant-writer"
        ? "常量写入"
        : `自动脚本 ${hex$9(source.script_id, 2)} 执行 ${String(source.opcode_hex)}`
      ).join("、")}`,
      classification: sequence.classification,
    });
  }
  for (const event of story.browser_vm?.entry_events || []) {
    if (event.scene_id !== Number(sceneId) || !storyViewForSequenceId(event.sequence_id)) continue;
    const item = entries.find(row => row.id === event.sequence_id);
    const sequence = story.browser_vm.sequences?.find(row => row.id === event.sequence_id);
    const values = {id: event.sequence_id, label: sequence?.label || event.sequence_id,
      trigger: event.trigger,
      evidence: `ROM ${event.evidence_prg_offsets.map(offset => hex$9(offset, 6)).join(" · ")}`,
      classification: inventory.find(row => row.id === event.sequence_id)?.classification};
    if (item) Object.assign(item, values);
    else entries.push(values);
  }
  return entries.map(item => ({...item, key: `entry-story:${item.id}`}));
}


function sceneBgmItemsForProject(sceneId, document, scenes, commandLabel = id => `曲目 ${hex$9(id, 2)}`, sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const defaultId = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  const defaultAddress = Number(catalog?.header_record_address?.offset) + 0x17;
  const items = Number(sceneId) === 0 ? [5, 24].map(id => ({key: `bgm:world:${id}`,
      label: `世界地图 · ${commandLabel(id)}`, id,
      condition: id === 24 ? "活动存档“是否在队”字节 $6478–$647A 任一字节的 $80 位为 1。"
        : "活动存档“是否在队”字节 $6478–$647A 的 $80 位均为 0。",
      evidence: "加载例程与选曲例程"}))
    : Number.isInteger(defaultId) && defaultId >= 0 && defaultId <= 0xFF
      && Number.isInteger(defaultAddress)
    ? [{key: "bgm:default", label: `默认 · ${commandLabel(defaultId)}`, id: defaultId,
      condition: "场景头默认曲目；条件音乐和运行时覆盖可能改变实际播放。",
      evidence: "场景头"}]
    : [];
  for (const row of document?.records || []) {
    if (row.kind !== "conditional-audio" || row.scene_reference !== `scene:${hex$9(Number(sceneId), 2).slice(2)}`) continue;
    const id = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
    const flag = row.global_event_flag_reference.split(":").at(-1);
    items.push({key: `bgm:${row.handle}`, label: `条件 · ${commandLabel(id)}`, id,
      condition: `global-event-flag:${flag} 已置位；后匹配的条件行优先。`,
      evidence: row.handle});
  }
  return items;
}

function sceneEntryMusicCommand(sceneId, lifecycle, scenes, eventFlags = [], sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const flags = new Set(eventFlags);
  let command = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  if (Number(sceneId) === 0) command = 5;
  for (const row of lifecycle?.records || []) {
    if (row.kind !== "conditional-audio"
        || row.scene_reference !== `scene:${hex$9(sceneId, 2).slice(2)}`) continue;
    const flag = Number.parseInt(row.global_event_flag_reference.split(":").at(-1), 16);
    if (flags.has(flag)) command = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
  }
  return Number.isInteger(command) && command >= 0 && command < 0xF0 ? command : null;
}

// @editor-module 调查后的地图格、同格入口与离场状态。

function sceneTileAction(object, context) {
  if (object.kind !== 'investigation-tile' || Number(object.record.behavior_code) !== 0x54) return null;
  const action = context.tileActions?.records?.find(record => record.handle === TILE_ACTION_HANDLE)
    || context.logicIndex?.investigation_scenery?.map_cell_action;
  if (!action) return null;
  const transition = context.sceneLogic?.layers?.transitions?.point_transitions?.find(record =>
    Number(record.x) === Number(object.record.x) && Number(record.y) === Number(object.record.y));
  let behavior = null;
  if (context.metatilePages && context.metatileSets) {
    const attributes = sceneMetatileAttributeRecords({id: object.sceneId},
      {pages: context.metatilePages, sets: context.metatileSets})
      .flatMap(record => record.metatile_attributes || record.metatile_attribute_page || []);
    const attribute = attributes[Number(action.replacement_metatile)];
    if (Number.isInteger(attribute)) {
      const code = metatileBehaviorCode(attribute);
      behavior = {code, label: metatileBehaviorLabel(code)};
    }
  }
  return {...action, source: action.sources || action.source, transition, behavior,
    persistence: {kind: 'scene-reload', label: '离场复原'}};
}

function sceneTileActionArrival(transition, scenes, logicIndex = null) {
  const scene = scenes?.editable_scenes?.find(row => Number(row.id) === Number(transition.destination_scene_id));
  if (!scene) return null;
  const x = Number(transition.destination_x), y = Number(transition.destination_y);
  const entrance = logicIndex?.point_transitions?.find(record => Number(record.scene_id) === Number(scene.id)
    && Number(record.x) === x && Number(record.y) === y);
  return {scene, x, y, href: `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
    sceneMode: 'logic', scenePoint: `${x},${y}`,
    ...(entrance ? {sceneObject: `transition:${entrance.id}`} : {})})}`};
}

async function sceneTileActionOrigins(object, context, database) {
  if (object.kind !== 'transition') return [];
  const sceneIds = [...new Set((context.logicIndex?.metatile_investigation_points || [])
    .filter(record => Number(record.behavior_code) === 0x54).map(record => Number(record.scene_id)))];
  const documents = await Promise.all(sceneIds.map(id => database.getResourceDocument(
    `scene:${id.toString(16).toUpperCase().padStart(2, '0')}`)));
  return documents.flatMap(document => {
    const sceneId = Number(document.logic.scene_id);
    const scene = context.scenes.editable_scenes.find(row => Number(row.id) === sceneId);
    return document.logic.layers.metatile_investigation_points.flatMap(record => {
      const action = sceneTileAction({kind: 'investigation-tile', record, sceneId},
        {...context, sceneLogic: document.logic});
      const transition = action?.transition;
      if (!transition || Number(transition.destination_scene_id) !== Number(object.sceneId)
        || Number(transition.destination_x) !== Number(object.record.x)
        || Number(transition.destination_y) !== Number(object.record.y)) return [];
      const handle = `investigation-tile:${sceneId.toString(16).toUpperCase().padStart(2, '0')}:${Number(record.id).toString(16).toUpperCase().padStart(2, '0')}`;
      return [{handle, x: record.x, y: record.y, href: `?${new URLSearchParams({view: 'scenes',
        scene: scene.slug, sceneMode: 'logic', sceneObject: `investigation-tile:${record.id}`,
        scenePoint: `${record.x},${record.y}`})}`}];
    });
  });
}

// @editor-module 场景加载状态与角色初始动作的当前值投影。
const hex$8 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneRemapItems(sceneId, lifecycle) {
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap'
    && row.source_scene_reference === `scene:${hex$8(sceneId)}`).map(row => ({
      ...row, key: `scene-state:${row.handle}`, id: row.handle,
      label: `${row.global_event_flag_reference} = 1 → ${row.target_scene_reference}`,
    }));
}

function sceneActorEntryStates(record, scripts, story) {
  const script = scripts?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  if (!script) return [];
  const bytes = scripts.layout ? storyScriptBytecode(scripts, script.id, {lazy: true})
    : {length: script.bytecode.length, byteAt: index => script.bytecode[index]};
  const handlers = new Map((story?.vm?.handlers || []).map(row => [Number(row.opcode), row]));
  const semantics = new Map((story?.browser_vm?.opcode_semantics || []).map(row => [Number(row.opcode), row]));
  const poses = [];
  const emit = (pose, flags, cursor) => {
    if (pose.actor_type >= 0x80 || pose.x < 0 || pose.y < 0 || pose.x >= 64 || pose.y >= 64) return;
    if (pose.actor_type === Number(record.actor_type) && pose.x === Number(record.x)
        && pose.y === Number(record.y) && pose.render_slot_marker === Number(record.render_slot_marker)) return;
    const conditions = [...flags].map(([flag, set]) => `global-event-flag:${hex$8(flag)} = ${Number(set)}`);
    poses.push({...pose, scriptId: Number(script.id), cursor, conditions});
  };
  const walk = (cursor, pose, flags, assignedFlags, visited) => {
    const key = `${cursor}/${JSON.stringify([...flags])}/${JSON.stringify([...assignedFlags])}`;
    if (visited.has(key) || visited.size >= bytes.length) { emit(pose, flags, cursor); return; }
    const opcode = bytes.byteAt(cursor), handler = handlers.get(opcode), semantic = semantics.get(opcode);
    if (!handler || !semantic || (semantic.fidelity !== 'exact' && semantic.operation !== 'sound-command')) {
      emit(pose, flags, cursor); return;
    }
    const nextVisited = new Set(visited).add(key);
    const next = cursor + Number(handler.fixed_advance);
    const operand = index => bytes.byteAt(cursor + 1 + index);
    const step = (target = next, value = pose, condition = flags, assigned = assignedFlags) =>
      walk(target, value, condition, assigned, nextVisited);
    const flagBranch = (flag, set, action) => {
      if (!Number.isInteger(flag)) return;
      if (assignedFlags.has(flag)) {
        if (assignedFlags.get(flag) === set) action(flags);
        return;
      }
      if (flags.has(flag) && flags.get(flag) !== set) return;
      action(new Map(flags).set(flag, set));
    };
    switch (semantic.operation) {
      case 'branch-if-event-flag-clear':
        flagBranch(operand(0), true, condition => step(next, pose, condition));
        flagBranch(operand(0), false, condition => step((cursor + operand(semantic.branch_operand_index)) & 255, pose, condition));
        return;
      case 'remove-actor-if-event-flag-set':
        flagBranch(operand(0), false, condition => step(next, pose, condition));
        return;
      case 'set-event-flag':
      case 'clear-event-flag':
        step(next, pose, flags, new Map(assignedFlags).set(operand(0), semantic.operation === 'set-event-flag'));
        return;
      case 'relative-cursor-advance': step((cursor + operand(0)) & 255); return;
      case 'set-actor-type-animation-renderer':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 0}); return;
      case 'set-actor-type':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0)}); return;
      case 'set-direct-frame-id':
        if (!Number.isInteger(operand(0))) return;
        step(next, {...pose, actor_type: operand(0), render_slot_marker: 1}); return;
      case 'set-actor-position':
        if (!Number.isInteger(operand(0)) || !Number.isInteger(operand(1))) return;
        step(next, {...pose, x: operand(0), y: operand(1)}); return;
      case 'set-direction':
        step(next, {...pose, direction_name: semantic.direction,
          direction: ['up', 'down', 'left', 'right'].indexOf(semantic.direction)}); return;
      case 'sound-command':
        step(); return;
      default: emit(pose, flags, cursor);
    }
  };
  walk(0, {actor_type: Number(record.actor_type), x: Number(record.x), y: Number(record.y),
    render_slot_marker: Number(record.render_slot_marker), direction: Number(record.direction),
    direction_name: record.direction_name}, new Map(), new Map(), new Set());
  return [...new Map(poses.map(pose => [JSON.stringify(pose), pose])).values()];
}

function sceneActorStateObjects(object, scripts, story) {
  return sceneActorEntryStates(object.record, scripts, story).map((pose, index) => ({
    ...object, key: `${object.key}:state:${index}`, pose,
  }));
}

// @editor-module 按已发布的交互语义解析场景对象的承载页面。

const hex$7 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const facilityViews = {jukebox: 'jukebox', 'item-vending-machine': 'vending',
  'ammunition-vending-machine': 'vending', 'frog-race': 'frograce',
  'teleport-terminal': 'teleport', 'computer-controller': 'computercontroller'};

const investigationLayers = [['treasure', 'treasures'], ['investigation-special', 'investigation_special_points'],
  ['investigation', 'investigation_points'], ['investigation-tile', 'metatile_investigation_points']];

function sceneTreasureProbeResolution(object, context) {
  if (object.kind !== 'investigation-tile' || Number(object.record.behavior_code) !== 0x64) return null;
  const records = context.sceneLogic?.layers?.treasures;
  if (!Array.isArray(records)) return {status: 'unknown'};
  // BE3E 只比较场景与坐标；未命中由 BAF6→BB22 直接返回。
  const record = records.filter(record => Number(record.x) === Number(object.record.x)
    && Number(record.y) === Number(object.record.y)
    && Number(record.scene_id ?? object.sceneId) === Number(object.sceneId))
    .sort((a, b) => Number(b.id) - Number(a.id))[0];
  return {status: record ? 'matched' : 'no-match', record,
    evidence: 'project/evidence/scene-gap-runtime-tiles/resolution.json'};
}

function sceneInvestigationResolution(object, context) {
  if (!investigationLayers.some(([kind]) => kind === object.kind)) return null;
  const layers = context.sceneLogic?.layers;
  if (!layers) return null;
  const scene = object.scene || context.scenes?.editable_scenes?.find(row =>
    Number(row.id) === Number(object.sceneId))?.slug;
  const peers = investigationLayers.flatMap(([kind, layer]) => (layers[layer] || [])
    .filter(record => Number(record.x) === Number(object.record.x)
      && Number(record.y) === Number(object.record.y))
    .map(record => ({kind, record, sceneId: object.sceneId, scene,
      key: `${kind}:${record.id}`, uid: `${kind}:${hex$7(object.sceneId)}:${hex$7(record.id)}`})));
  if (peers.length < 2) return null;
  const descending = kind => peers.filter(peer => peer.kind === kind)
    .sort((a, b) => Number(b.record.id) - Number(a.record.id));
  const treasure = descending('treasure')[0], special = descending('investigation-special')[0];
  const facility = descending('investigation')[0], tile = descending('investigation-tile')[0];
  const directTreasure = [0, 0x81].includes(Number(object.sceneId)) || Number(object.sceneId) >= 0xe0;
  const branches = [];
  const add = (condition, effective) => {if (effective) branches.push({condition, effective});};
  // 判定链与朝向门见 project/evidence/link-colocated-investigations/resolution.json。
  if (treasure && directTreasure) add('未取得', treasure);
  const remaining = treasure && directTreasure ? '已取得 · ' : '';
  if (special) add(`${remaining}调查`, special);
  else if (treasure && !directTreasure) add('未取得', treasure);
  else if (tile && facility && [0x6c, 0x70].includes(Number(tile.record.behavior_code))) {
    add(`${remaining}朝上`, facility);
    add(`${remaining}其他朝向`, tile);
  } else add(`${remaining}调查`, tile);
  return {peers, branches, evidence: 'project/evidence/link-colocated-investigations/resolution.json'};
}

function sceneUsageAnchor(scene, key) {
  return `scene-use-${scene}-${key}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function actorInteractionMode(record) {
  const selector = Number(record.text_region), argument = Number(record.interaction_or_record_id);
  if (selector === 0) return argument === 0 ? 'none' : 'interaction-script';
  return selector < 0x10 ? 'direct-dialogue' : 'service-handler';
}

function sceneCoordinateEvent(record, context) {
  const current = context.worldEvents?.records?.find(row => Number(row.id) === Number(record.id));
  return current ? {...record, ...current} : record;
}

function destination(label, query, evidence, extra = {}) {
  if (query.resource?.startsWith('encounter-formation:')) query = {...query, view: 'monster-formations'};
  return {label, query, href: `?${new URLSearchParams(query)}`, evidence, ...extra};
}

function textDestination(record, evidence) {
  const [, region] = record.split(':');
  return destination(record, {view: 'text', textMode: 'records', textRegion: region,
    textKind: 'all', textSearch: record}, evidence, {record});
}

function applicationDestination(command, instance, context) {
  if (Number(command) >= 0x39 && Number(command) <= 0xFF) return {target: destination(`扩展流程 ${hex$7(command)}`,
    {view: 'interfaceui', interface: 'interaction-service', resource: `application-command:${hex$7(command)}`},
    `application-command:${hex$7(command)}`)};
  if (Number(command) === 0x24) return {target: destination('人类物品收购',
    SHOP_ITEM_BUYER_ROUTE, 'application-command:24')};
  const source = (context.facilities?.applications?.commands || [])
    .find(row => Number(row.command_id) === Number(command));
  if (!source) return {gap: `应用命令 ${hex$7(command)} 缺少已发布处理语义。`};
  const evidence = {command: `application-command:${hex$7(command)}`,
    source: source.application_script_pointer_entry, definition: source.evidence};
  const family = source.configuration_family;
  if (Number(command) === 0x30 && source.kind === 'vehicle-rental-service')
    return {target: destination(source.label, {view: 'shops', shopFamily: 4, shopTab: 'flow'},
      {...evidence, carrier: 'project/evidence/scene-gap-misc/resolution.json'})};
  if (Number(family?.family_id) === 13) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 0D 缺少实例 ${hex$7(instance)}。`};
    const target = destination(`investigation-command:${hex$7(command)}:config:${hex$7(instance)}`,
      {view: 'scenes', sceneTab: 'investigation'}, evidence, {instance});
    target.href += `#investigation-command-${hex$7(command)}-config-${hex$7(instance)}`;
    return {target};
  }
  if (family && SHOP_PAGES.some(page => Number(page.route.shopFamily) === Number(family.family_id))) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 ${hex$7(family.family_id)} 缺少实例 ${hex$7(instance)} 的选择规则。`};
    return {target: destination(source.label, {view: 'shops', shopFamily: family.family_id,
      shopTab: 'config', shopConfig: row.id}, evidence,
    {instance: row.id, external: Number(family.family_id) === 15})};
  }
  const facility = context.facilities?.facilities?.find(facility => facility.instances?.some(row =>
    Number(row.command_id) === Number(command)));
  const facilityView = facilityViews[facility?.id] || facilityViews[source.kind]
    || (facility?.id === 'vending-machine' ? 'vending' : null);
  if (facilityView) {
    const query = {view: facilityView, facility: 'config'};
    if (facilityView === 'vending') Object.assign(query, {
      vendingFamily: family?.family_id, vendingConfig: instance});
    if (facilityView === 'jukebox') query.jukeboxConfig = instance;
    return {target: destination(source.label, query, evidence, {instance})};
  }
  if (source.kind === 'wanted-information') return {target: destination(source.label,
    {view: 'wanted-ui'}, evidence)};
  const page = (Number(command) === 0x27 ? INTERFACE_PAGE_DEFINITIONS.find(page => page.id === 'chassis-modification-service') : null)
    || INTERFACE_PAGE_DEFINITIONS.find(page => page.commandIds?.includes(Number(command)))
    || INTERFACE_PAGE_DEFINITIONS.find(page => page.id === source.kind || page.interfaceIds?.includes(source.kind));
  if (page) return {target: destination(page.label,
    {view: 'interfaceui', interface: page.id}, evidence)};
  return {gap: `应用命令 ${hex$7(command)} 的 ${source.kind} 没有已确认的页面对应关系。`};
}

function sceneInteractionDestinations(object, context) {
  if (object.record?.interaction_binding) {
    const bound = sceneInteractionBoundObject(object, context);
    return bound ? sceneInteractionDestinations(bound, {...context, skipInvestigationTakeovers: true})
      : {targets: [], gaps: ['交互绑定的流程不存在。'], applications: [], nonConfigurable: []};
  }
  const {kind, sceneId} = object;
  const record = kind === 'event' ? sceneCoordinateEvent(object.record, context) : object.record;
  const targets = [], gaps = [], applications = [], nonConfigurable = [];
  const addApplication = (command, instance) => {
    const result = applicationDestination(command, instance, context);
    const primary = result.target && {...result.target, application: {command, instance}};
    if (primary) targets.push(primary);
    if (result.gap) gaps.push(result.gap);
    const application = context.facilities?.applications?.commands?.find(row =>
      Number(row.command_id) === Number(command));
    const page = serviceFamilyPage(command);
    if (page && application) {
      const stage = application.dialogue_flow?.segments?.[0];
      const fragment = stage?.actions?.find(action => action.record)?.id || stage?.id;
      const samePage = result.target && result.target.query.view === page.route.view
        && ['interface', 'shopFamily', 'vendingFamily'].every(key => page.route[key] === undefined
          || String(result.target.query[key]) === String(page.route[key]));
      if (samePage) primary.serviceFragment = fragment;
      else targets.push(destination(`${page.label} · 服务流程`, {...page.route,
        ...(page.route.view === 'shops' ? {shopConfig: instance} : {}),
        ...(page.route.view === 'vending' ? {vendingConfig: instance} : {}),
        ...(page.route.view === 'jukebox' ? {jukeboxConfig: instance} : {}),
        ...(fragment ? {interfaceEntry: fragment} : {}), previewCommand: command, previewArgument: instance},
      application.evidence, {application: {command, instance}, serviceFlow: true}));
    }
    applications.push({command, instance, label: application?.label || `应用命令 ${hex$7(command)}`});
    for (const segment of application?.dialogue_flow?.segments || []) {
      for (const action of segment.actions || [])
        if (action.kind === 'text-record' && action.record) {
          const reads = (segment.callback_reads || []).filter(read => read.id === action.id);
          targets.push({...textDestination(action.record, {command: Number(command),
            source: action.source, prgOffset: action.prg_offset}), ...(reads.length ? {callback_reads: reads} : {})});
        }
      for (const read of segment.callback_reads || []) {
        if (read.role === 'text-record') continue;
        const selected = application.dialogue_flow.segments.find(row => row.id === read.selected_segment_id);
        const body = selected?.actions.find(action => action.kind === 'text-record' && action.record);
        const evidence = {command: Number(command), source: 'application-callback-read',
          prgOffset: read.prg_offset, callback_read: read};
        const target = body ? textDestination(body.record, {...evidence, selected_body: body.id}) : result.target;
        if (target) targets.push({...target, callback_reads: [read]});
      }
    }
    for (const read of application?.dialogue_flow?.alternate_text_reads || [])
      targets.push(textDestination(read.record, {command: Number(command), ...read}));
  };
  const addTexts = (rows, evidence) => {
    for (const row of rows || []) targets.push(textDestination(row, evidence));
  };
  const addItem = (id, evidence) => {
    const item = context.items?.find(item => Number(item.id) === Number(id));
    targets.push(destination('调查物品', {...itemPageRoute(item || {id}),
      resource: `item:${hex$7(id)}`}, evidence));
  };
  const source = record.source || record.handler_pointer_source || record.dispatch_source;
  const resolution = sceneInvestigationResolution(object, context);
  if (kind === 'investigation-tile' && !context.skipInvestigationTakeovers) for (const branch of resolution?.branches || []) {
    const effective = branch.effective;
    if (effective.kind === 'investigation-tile') continue;
    targets.push(destination(`接管 · ${branch.condition} · ${effective.uid}`, {
      view: 'scenes', scene: effective.scene, sceneMode: 'logic', sceneObject: effective.key,
    }, resolution.evidence, {effectiveObject: effective.uid, condition: branch.condition}));
    const result = sceneInteractionDestinations({...effective, key: undefined}, context);
    targets.push(...result.targets.map(target => ({...target, effectiveObject: effective.uid,
      condition: branch.condition})));
    gaps.push(...result.gaps);
  }
  if (kind === 'actor') {
    const mode = actorInteractionMode(record);
    if (Number(record.autonomous_script_id) > 0) targets.push(destination(
      `自动动作脚本 ${hex$7(record.autonomous_script_id)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'autonomous', record: Number(record.autonomous_script_id)}, record.uid));
    for (const sequence of context.story?.browser_vm?.sequences || []) {
      const view = storyViewForSequenceId(sequence.id);
      if (view && sequence.trigger_actor_handles?.includes(record.uid)) targets.push(destination(
        sequence.label, {view, storySequence: sequence.id, storyPaused: 1}, record.uid));
    }
    if (mode === 'none') return {targets, gaps, applications, noInteraction: !targets.length};
    if (mode === 'direct-dialogue') {
      addTexts([`record:${hex$7(record.text_region)}:${String(record.interaction_or_record_id).padStart(3, '0')}`], source);
    } else if (mode === 'service-handler') {
      const selector = Number(record.text_region), argument = Number(record.interaction_or_record_id);
      const mapped = (context.story?.npc_catalog?.records || []).map(row => row.service)
        .find(service => service && Number(service.selector) === selector
          && Number(service.argument) === argument);
      if ([0x16, 0x32].includes(selector)) {
        if (mapped?.parameter_source_prg != null) {
          addApplication(selector, mapped.effective_argument);
          for (const target of targets) target.evidence = {...target.evidence,
            parameterSourcePrg: mapped.parameter_source_prg, parameterRule: mapped.parameter_rule};
        }
        else gaps.push(`服务 ${hex$7(selector)} 参数 ${hex$7(argument)} 缺已发布的 ROM 映射表项。`);
      } else addApplication(selector === 0x3F ? argument : selector, selector === 0x3F ? 0 : argument);
    } else {
      const scriptId = Number(record.interaction_or_record_id);
      const page = context.storyPageInteractions?.find(page => page.id === scriptId);
      if (page) {
        targets.push(destination(page.label, {view: 'story-page', storyPage: page.page, storyPaused: 1}, record.uid));
        return {targets, gaps, resolution, applications, nonConfigurable};
      }
      const sequence = context.story?.browser_vm?.sequences?.find(sequence =>
        sequence.interaction_trigger?.script_id === scriptId
        && sequence.entry_variant_id === Number(record.entry_id)
        && sequence.interaction_trigger.actor_record_id === Number(record.id));
      const view = sequence && storyViewForSequenceId(sequence.id);
      if (view) targets.push(destination(sequence.label, {view, storySequence: sequence.id,
        storyPaused: 1}, {actor: source, sequence: sequence.id}));
      else targets.push(destination(`交互脚本 ${hex$7(scriptId)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'interaction', record: scriptId}, source));
      const semantic = !context.changedInteractionScripts?.has(scriptId) && context.story?.npc_catalog?.records?.find(row =>
        Number(row.interaction_script?.id) === scriptId);
      if (!semantic) gaps.push(`交互脚本 ${hex$7(scriptId)} 缺少当前正文的对话与应用去向解析。`);
      else {
        addTexts((semantic.text_references || []).filter(row => row.found).map(row => row.node_id),
          {script: semantic.interaction_script.resource_id});
        for (const effect of semantic.interaction_effects || []) {
          if (effect.kind === 'application-command') addApplication(effect.command_id, effect.argument);
          if (effect.kind === 'scripted-encounter') targets.push(destination(effect.label,
            {view: 'battle-test', resource: effect.formation_resource_id}, effect));
        }
      }
      if (!context.changedInteractionScripts?.has(scriptId)) {
        const program = context.story?.browser_vm?.programs?.find(program =>
          program.kind === 'interaction' && Number(program.id) === scriptId);
        for (const command of program?.commands || []) {
          const operation = STORY_DIALOGUE_OPERATIONS[command.opcode];
          if (operation?.operation !== 'dispatch-interaction-service' || !command.interaction_service) continue;
          const operands = command.currentOperands || command.operands || [];
          const service = operands[operation.region_operand_index];
          const argument = operands[operation.record_operand_index];
          if (Number.isInteger(service) && Number.isInteger(argument)
            && !applications.some(row => Number(row.command) === service && Number(row.instance) === argument))
            addApplication(service, argument);
        }
      }
    }
  } else if (kind === 'investigation') {
    const command = context.logicIndex?.investigation_handler_commands?.find(row =>
      Number(row.selector) === Number(record.handler_selector));
    if (command) addApplication(command.command_id, record.instance_id);
    else gaps.push(`调查选择值 ${hex$7(record.handler_selector)} 缺少已发布的命令映射。`);
  } else if (kind === 'investigation-tile') {
    const behavior = context.logicIndex?.investigation_tile_behavior_catalog?.find(row =>
      Number(row.behavior_code) === Number(record.behavior_code));
    if (!behavior) gaps.push(`行为 ${hex$7(record.behavior_code)} 缺少处理器语义。`);
    else if (behavior.kind.startsWith('wanted-poster-')) {
      const entry = context.wanted?.entries?.find(row => Number(row.scene_id) === Number(sceneId));
      const side = behavior.kind === 'wanted-poster-high-nibble' ? 'high' : 'low';
      const index = entry?.index ?? 'default';
      for (const view of ['wanted', 'wanted-ui']) targets.push(destination(
        view === 'wanted' ? '通缉令目标配置' : '通缉令界面',
        {view, wantedTarget: index, wantedSide: side},
        {dispatch: source, lookup: context.wanted?.resolution,
          target: entry?.target_source || context.wanted?.default_pair?.source}, {instance: index, side}));
      addTexts(behavior.text_records, source);
    } else if (behavior.kind === 'computer-or-facility') {
      addTexts(behavior.text_records, source);
    } else if (behavior.kind === 'treasure-probe') {
      const probe = sceneTreasureProbeResolution(object, context);
      for (const point of probe?.record ? [probe.record] : []) {
        const result = sceneInteractionDestinations({kind: 'treasure', record: point, sceneId}, context);
        targets.push(...result.targets); gaps.push(...result.gaps);
      }
      if (!probe || probe.status === 'unknown') gaps.push('调查物处理器已确认；缺当前场景的调查物坐标表。');
      addTexts(behavior.text_records, source);
      for (const target of targets.filter(target => target.record && !target.condition))
        target.condition = '命中未取得调查物后';
    } else if (record.kind === 'investigation-battle-trigger' && behavior.kind === 'context-scenery') {
      targets.push(destination('调查战斗配置', {view: 'battle-test',
        resource: 'investigation-battle-test:00'}, {dispatch: source, definition: record.description}));
      addTexts(record.text_records, source);
    } else if (behavior.kind === 'context-scenery') {
      const scenery = context.logicIndex?.investigation_scenery;
      if (!scenery) gaps.push('缺已发布的场景调查分支表。');
      else {
        const branch = [...scenery.scenes].reverse().find(row => Number(row.scene_id) === Number(sceneId));
        const texts = branch?.texts || [{...([...scenery.metatiles].reverse().find(row =>
          Number(row.metatile_id) === Number(record.metatile_id)) || scenery.fallback)}];
        for (const row of texts) targets.push({...textDestination(row.record,
          {definition: scenery.evidence, source: row.source || branch?.source}), condition: row.condition});
        for (const item of branch?.items || []) {
          addItem(item.id, {definition: scenery.evidence, source: branch.source});
          targets.at(-1).condition = item.condition;
        }
        if (branch?.investigation_battle) targets.push(destination('调查战斗配置',
          {view: 'battle-test', resource: 'investigation-battle-test:00'}, scenery.evidence));
      }
    } else if (behavior.kind === 'map-cell-action') {
      const scenery = context.logicIndex?.investigation_scenery;
      const action = sceneTileAction(object, context);
      if (!action) gaps.push('缺已发布的地图格替换动作。');
      else {
        targets.push(destination('调查音效', {view: 'audio', record: `audio-command:${hex$7(action.audio_command)}`},
          {definition: scenery.evidence, source: action.source.audio}));
        if (action.transition) {
          const arrival = sceneTileActionArrival(action.transition, context.scenes, context.logicIndex);
          if (arrival) targets.push(destination(`同格入口 → ${arrival.scene.name} (${arrival.x}, ${arrival.y})`,
            {view: 'scenes', scene: arrival.scene.slug, sceneMode: 'logic',
              scenePoint: `${arrival.x},${arrival.y}`},
            {source: action.transition.source}, {tileActionTransition: action.transition}));
        }
        const set = context.metatileSets?.records?.find(row => row.scene_references?.includes(`scene:${hex$7(sceneId)}`));
        if (!set) gaps.push('地图格替换动作缺所属场景的元图块集引用。');
        else {
          const handle = Number(sceneId) === 0 ? set.handle
            : action.replacement_metatile < 64 ? set.lower_metatile_page : set.upper_metatile_page;
          const index = Number(sceneId) === 0 ? action.replacement_metatile : action.replacement_metatile % 64;
          targets.push(destination('调查后的元图块', {view: 'metatiles', metatile: handle,
            tile: index, context: `scene:${hex$7(sceneId)}`},
          {definition: scenery.evidence, source: action.source.metatile}, {metatile: {handle, index}}));
        }
      }
    } else if (behavior.kind === 'machine-status') {
      addTexts(behavior.text_records, source);
      for (const target of targets.filter(target => !target.effectiveObject && target.record))
        target.condition = target.record === 'record:05:009' ? '其他朝向' : '朝上未命中';
    } else if (behavior.kind === 'locked-door') {
      addTexts(behavior.text_records, source);
    } else gaps.push(`${behavior.kind} 已定位处理器；缺此场景此坐标分支实际选择的文字、动作或目标记录。`);
  } else if (kind === 'treasure') {
    const content = sceneTreasureContent(record, context.logicIndex?.treasures || []);
    if (content.kind === 'item') addItem(content.itemId, source);
    if (content.kind === 'buried-vehicle') targets.push(destination('埋藏战车预设',
      {view: 'vehicles', record: content.vehicleSlot}, {source, content: record.resolution_source}));
    const behavior = context.logicIndex?.investigation_tile_behavior_catalog?.find(row => row.kind === 'treasure-probe');
    addTexts(behavior?.text_records, record.resolution_source || source);
  } else if (kind === 'investigation-special') {
    addTexts(record.text_records, source);
    for (const id of record.item_ids || []) addItem(id, source);
    const fixed = context.logicIndex?.investigation_special_points?.find(row =>
      Number(row.id) === Number(record.id) && Number(row.scene_id) === Number(sceneId)
        && row.kind === record.kind)?.fixed_behavior;
    if (record.kind === 'hidden-world-entrance') {
      const scene = fixed?.kind === 'code-fixed-destination' && context.scenes?.editable_scenes?.find(row =>
        Number(row.id) === Number(fixed.destination_scene_id));
      if (scene && fixed.evidence && [fixed.destination_x, fixed.destination_y].every(value =>
        Number.isInteger(value) && value >= 0 && value <= 255)) {
        const label = `目标场景 ${scene.name} · 落点 (${fixed.destination_x},${fixed.destination_y})`;
        nonConfigurable.push({reason: fixed.kind, label, evidence: fixed.evidence});
        targets.push(destination(label, {view: 'scenes', scene: scene.slug, sceneMode: 'logic',
          scenePoint: `${fixed.destination_x},${fixed.destination_y}`}, fixed.evidence, {fixedBehavior: fixed.kind}));
      } else gaps.push('隐藏入口缺已发布的固定目标场景、落点及依据。');
    }
    if (record.kind === 'healing-well') {
      if (fixed?.kind === 'party-max-hp-copy' && fixed.evidence)
        nonConfigurable.push({reason: fixed.kind, label: '确认后将存活队员的 HP 回满，并清除异常状态。', evidence: fixed.evidence});
      else gaps.push('回复泉缺已发布的固定回复行为及依据。');
    }
  } else if (kind === 'transition' || kind === 'boundary') {
    const scene = context.scenes?.editable_scenes?.find(row => Number(row.id) === Number(record.destination_scene_id));
    if (scene) targets.push(destination(scene.name, {view: 'scenes', scene: scene.slug,
      sceneMode: 'logic', scenePoint: `${record.destination_x},${record.destination_y}`}, source));
    else gaps.push('缺目标场景的已发布正文。');
    const handle = `${kind}:${hex$7(sceneId)}:${hex$7(record.id)}`;
    for (const event of context.story?.browser_vm?.entry_events || []) {
      if (!event.transition_handles?.includes(handle)) continue;
      const view = storyViewForSequenceId(event.sequence_id);
      const sequence = context.story.browser_vm.sequences.find(row => row.id === event.sequence_id);
      if (view && sequence) targets.push(destination(sequence.label,
        {view, storySequence: sequence.id, storyPaused: 1}, event.evidence_prg_offsets,
        {condition: event.trigger}));
    }
  } else if (kind === 'boundary-return') {
    nonConfigurable.push({reason: 'runtime-return-not-saved', label: '返回进入前的位置',
      evidence: 'project/evidence/scene-gap-misc/resolution.json'});
  } else if (kind === 'event') {
    if ([0, 0xff].includes(Number(record.story_state))) {
      const formationId = Number(record.encounter_formation_id);
      if (Number.isInteger(formationId) && formationId >= 0 && formationId < 0x39)
        targets.push(destination('坐标遭遇编队', {view: 'battle-test',
          resource: `encounter-formation:${hex$7(formationId)}`},
        {source, definition: 'project/evidence/scene-gap-misc/resolution.json',
          path: 'B9B6→B9E3→B97E', state: record.story_state}));
      else gaps.push(`坐标事件 ${hex$7(record.id)} 缺已发布的遭遇编队。`);
      return {targets, gaps, resolution, applications};
    }
    const lists = context.story?.special_actor_lists?.filter(row =>
      Number(row.selection?.story_state) === Number(record.story_state)) || [];
    const sequence = context.story?.browser_vm?.sequences?.find(row =>
      lists.some(list => row.variant_ids?.includes(Number(list.id))));
    const view = sequence && storyViewForSequenceId(sequence.id);
    if (view) targets.push(destination(sequence.label, {view, storySequence: sequence.id,
      storyPaused: 1}, {source, state: record.story_state}));
    else gaps.push(`剧情状态 ${hex$7(record.story_state)} 缺到已发布剧情序列的入口对应关系。`);
  } else if (kind === 'vehicle') {
    targets.push(destination('战车预设', {view: 'vehicles', record: String(record.vehicle_slot)},
      record.sources, {instance: record.vehicle_slot}));
  } else if (kind === 'elevator') {
    const stage = context.facilities?.applications?.commands?.find(row => Number(row.command_id) === 0x1f)
      ?.dialogue_flow?.segments?.[0];
    targets.push(destination('电梯实例', {view: 'shops', shopFamily: 15, shopTab: 'config',
      shopConfig: record.instance_id}, record.source, {external: true, instance: record.instance_id,
        application: {command: 0x1f, instance: record.instance_id},
        serviceFragment: stage?.actions?.find(action => action.record)?.id || stage?.id}));
  } else if (kind === 'scene-state') {
    const target = context.scenes?.editable_scenes?.find(row =>
      `scene:${hex$7(row.id)}` === record.target_scene_reference);
    if (target) targets.push(destination(record.target_scene_reference,
      {view: 'scenes', scene: target.slug, sceneMode: 'logic'}, record.handle,
      {condition: `${record.global_event_flag_reference} = 1`}));
    else gaps.push(`${record.target_scene_reference} 缺场景承载页。`);
  } else if (kind === 'bgm') {
    targets.push(destination(record.label, {view: 'audio', record: `audio-command:${hex$7(record.id)}`}, record.evidence));
  } else if (kind === 'entry-story') {
    const view = storyViewForSequenceId(record.id);
    if (view) targets.push(destination(record.label, {view, storySequence: record.id, storyPaused: 1}, record.evidence));
    else gaps.push('进场剧情缺已发布的承载页面。');
  } else gaps.push(`${kind} 缺已发布的交互去向解析。`);
  const scene = object.scene || context.scenes?.editable_scenes?.find(row => Number(row.id) === Number(sceneId))?.slug;
  for (const target of targets) if (['teleport', 'computercontroller', 'frograce'].includes(target.query.view)
      && scene && object.key) target.href += `#${sceneUsageAnchor(scene, object.key)}`;
  const destinations = new Map();
  for (const target of targets) {
    const previous = destinations.get(target.href);
    const reads = [...(previous?.callback_reads || []), ...(target.callback_reads || [])];
    destinations.set(target.href, reads.length ? {...previous, ...target,
      ...(previous?.application ? {application: previous.application} : {}),
      callback_reads: reads} : target);
  }
  return {targets: [...destinations.values()], gaps, resolution, applications, nonConfigurable};
}

function enumerateSceneInteractionObjects(scene, sceneLogic, actors, placements = [], context = null) {
  const layers = sceneLogic.layers, sceneId = Number(scene.id);
  const rows = [], byUid = context?.actorsByUid || new Map(actors.map(row => [row.uid, row]));
  const includes = kind => !context?.objectKinds || context.objectKinds.has(kind);
  const add = (kind, record, key, uid = `${kind}:${hex$7(sceneId)}:${hex$7(record.id)}`) => {
    if (includes(kind)) rows.push({kind, record, key, uid, sceneId, scene: scene.slug});
  };
  for (const reference of layers.actors.records || []) {
    if (context?.actorHandles && !context.actorHandles.has(reference.uid)) continue;
    const record = byUid.get(reference.uid);
    if (!record) throw new TypeError(`场景 ${sceneId} 缺角色 ${reference.uid}`);
    add('actor', record, `actor:${reference.id}`, record.uid);
  }
  for (const variant of layers.actors.dynamic_variants || []) for (const reference of variant.actor_list.records || []) {
    if (context?.actorHandles && !context.actorHandles.has(reference.uid)) continue;
    const record = byUid.get(reference.uid);
    if (!record) throw new TypeError(`场景 ${sceneId} 缺替换角色 ${reference.uid}`);
    add('actor', record, `variant-${variant.replacement_entry_id}-actor:${reference.id}`, record.uid);
  }
  for (const [kind, records] of [['treasure', layers.treasures], ['investigation', layers.investigation_points],
    ['investigation-special', layers.investigation_special_points], ['investigation-tile', layers.metatile_investigation_points],
    ['transition', layers.transitions.point_transitions], ['boundary', layers.transitions.boundary_exits],
    ['event', layers.event_triggers], ['elevator', layers.elevator_points]]) {
    if (includes(kind)) for (const record of records || []) add(kind, record, `${kind}:${record.id}`);
  }
  if (layers.transitions.dynamic_boundary_return) add('boundary-return',
    layers.transitions.dynamic_boundary_return, 'boundary:return', `scene:${hex$7(sceneId)}`);
  for (const record of placements.filter(row => row.placed && Number(row.scene_id) === sceneId))
    add('vehicle', record, `vehicle:${record.vehicle_slot}`, `vehicle:${hex$7(record.vehicle_slot)}`);
  if (context) {
    for (const object of [...rows].filter(row => row.kind === 'actor'))
      rows.push(...sceneActorStateObjects(object, context.autonomousScripts, context.story));
    if (includes('scene-state')) for (const item of sceneRemapItems(sceneId, context.bgm))
      add('scene-state', item, item.key, item.handle);
    if (includes('bgm')) for (const item of sceneBgmItemsForProject(sceneId, context.bgm, context.scenes))
      add('bgm', item, item.key, `scene:${hex$7(sceneId)}`);
    for (const item of sceneEntryStoryItemsForProject(sceneId, context.story))
      add('entry-story', item, item.key, `scene:${hex$7(sceneId)}`);
  }
  return rows;
}

// @editor-module 按状态、记录与自有场景选择已发布的界面模板绑定。
function uiTemplateBindings(library) {
  return (library?.bindings || []).flatMap(binding => [binding,
    ...(binding.record_variants || []).map(variant => ({...variant,
      state: binding.state, interface: binding.interface})),
  ]);
}

function uiTemplateBinding(library, stateId, {
  templateId = "", recordIds = [], sceneId = "",
} = {}) {
  const primary = library?.bindings?.find(binding => binding.state === stateId);
  if (!primary) return null;
  let candidates = uiTemplateBindings(library).filter(binding => binding.state === stateId);
  if (templateId) candidates = candidates.filter(binding => binding.template === templateId);
  if (sceneId) {
    const witnessed = candidates.filter(binding => library.templates?.find(
      template => template.id === binding.template)?.source?.scene === sceneId);
    if (witnessed.length) candidates = witnessed;
    else if (primary.record_variants?.length || templateId) return null;
    else if (!templateId && !recordIds.length) return primary;
  }
  if (recordIds.length) {
    const located = candidates.filter(binding => recordIds.every(record => [
      ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id || fill.record),
      ...(binding.deferred_records || []),
    ].includes(record)));
    if (located.length) candidates = located;
    else if (!templateId) return primary;
    else return null;
  }
  if (!templateId && !recordIds.length && !sceneId) return primary;
  return candidates.length === 1 ? candidates[0] : null;
}

function uiScreenTemplateBinding(library, screen) {
  const sceneId = screen?.runtime_preview?.scene_id || String(screen?.runtime_preview?.path || "")
    .match(/(?:^|\/)scenes\/([^/]+)\/[^/]+$/)?.[1] || "";
  return uiTemplateBinding(library, screen?.interface_state_id, {sceneId});
}

// @editor-module 控制器实例与受控对象的已发布引用。

const hex$6 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function controllerInstances(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'computer-controller')?.instances || [];
}

function controllerAt(object, project, sceneLogic) {
  if (!['investigation', 'investigation-tile'].includes(object.kind)) return [];
  const instances = controllerInstances(project);
  const records = object.kind === 'investigation' ? [object.record]
    : (sceneInvestigationResolution(object, {...project, sceneLogic})?.branches || [])
      .filter(branch => branch.effective.kind === 'investigation').map(branch => branch.effective.record);
  return records.flatMap(record => {
    const instance = instances.find(row => Number(row.scene_id) === Number(object.sceneId)
      && Number(row.point_id) === Number(record.id));
    const command = project?.facilities?.investigation?.commands?.find(row =>
      Number(row.selector) === Number(record.handler_selector))?.command_id;
    const control = instances.find(row => Number(row.command_id) === Number(command)
      && Number(row.instance_id) === Number(record.instance_id))?.switch;
    return instance && control ? [{...instance, x: record.x, y: record.y, switch: control}] : [];
  });
}

function controllerFlagId(reference) {
  return Number.parseInt(String(reference).split(':').at(-1), 16);
}

function controllerSceneHref(sceneId, project, {object, point, mode = 'logic'} = {}) {
  const scene = project?.scenes?.editable_scenes?.find(row => Number(row.id) === Number(sceneId));
  if (!scene) return null;
  return `?${new URLSearchParams({view: 'scenes', scene: scene.slug, sceneMode: mode,
    ...(object ? {sceneObject: object} : {}), ...(point ? {scenePoint: point.join(',')} : {})})}`;
}

function controllerHref(instance, project) {
  return controllerSceneHref(instance.scene_id, project, {
    object: `investigation:${instance.point_id}`, point: [instance.x, instance.y],
  });
}

function controllerTargetLabel(target) {
  const coordinates = target.cells ? target.cells.map(cell => `(${cell.x}, ${cell.y})`).join('、')
    : target.x == null ? '' : `(${target.x}, ${target.y})`;
  return `场景 $${hex$6(target.scene_id)} ${coordinates} · ${target.label}`;
}

function controllersForTarget(sceneId, {object, point} = {}, project) {
  return controllerInstances(project).filter(instance => instance.switch?.targets?.some(target =>
    target.kind === 'scene-remap' && !object && !point
      ? [target.scene_id, target.target_scene_id].some(id => Number(id) === Number(sceneId))
      : Number(target.scene_id) === Number(sceneId) && (object
      ? target.scene_object === object
      : point && (target.cells || []).some(cell => cell.x === point[0] && cell.y === point[1]))));
}

function controllersForFlag(flagId, project) {
  return controllerInstances(project).filter(instance => [instance.switch?.event_flag_reference,
    instance.switch?.failure_flag_reference].filter(Boolean).some(reference =>
    controllerFlagId(reference) === Number(flagId)));
}

// @editor-module 潮汐字段对象的入口条件与地图格投影。

function worldTideTriggers(tide, sceneId) {
  const trigger = tide?.trigger;
  return trigger && Number(trigger.scene_id) === Number(sceneId)
    ? [{...trigger, id: 0, handle: WORLD_TIDE_HANDLE, event_flag: tide.event_flag}] : [];
}

function worldTideScenes(tide, lifecycle, sceneId) {
  const flag = `global-event-flag:${Number(tide?.event_flag).toString(16).toUpperCase().padStart(2, '0')}`;
  const row = lifecycle?.records?.find(record => record.kind === 'scene-remap'
    && record.global_event_flag_reference === flag
    && [record.source_scene_reference, record.target_scene_reference].includes(
      `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, '0')}`));
  if (!row) return [];
  return [['high', '涨潮', row.source_scene_reference], ['low', '退潮', row.target_scene_reference]]
    .map(([phase, label, handle]) => ({phase, label, handle,
      sceneId: Number.parseInt(handle.split(':')[1], 16)}));
}

function tideEntrance(object, tide) {
  return tide?.entrance && object?.kind === 'transition'
    && Number(object.sceneId) === Number(tide.entrance.scene_id)
    && object.key === tide.entrance.object;
}

function worldTideCells(raw, tide, phase) {
  if (!raw || !tide) return [];
  const record = tide.records.find(row => row.handle === WORLD_TIDE_HANDLE);
  return tide.blocks.flatMap(block => worldCoarsePatternCells(raw, block.x, block.y,
    record[phase === 'low' ? block.low_field : block.high_field]));
}

function worldTideCondition(tide, raw) {
  const trigger = tide.trigger;
  const direction = ['向上', '向下', '向左', '向右'][trigger.direction];
  const destination = tide.entrance.effective_destination_scene_id;
  return {
    label: '退潮时洞口出现并可进入；涨潮时被海水遮住且无法通行。',
    flags: [tide.event_flag],
    flag_labels: {[tide.event_flag]: '潮汐事件位'},
    persistence: tide.persistent ? '置位为退潮，清位为涨潮，随存档保存。' : '',
    triggers: [{flag: tide.event_flag, reference: WORLD_TIDE_HANDLE,
      label: `${direction}走到世界地图 (${trigger.x},${trigger.y})，每次翻转涨退潮`,
      scene_id: trigger.scene_id, object: 'tide:0', point: [trigger.x, trigger.y]}],
    states: [
      {id: 'before', label: '涨潮', cells: worldTideCells(raw, tide, 'high')},
      {id: 'after', label: '退潮', cells: worldTideCells(raw, tide, 'low')},
    ],
    note: '地形配置影响切换时的地图；重新进场的退潮地形由进场替换表决定。',
    destination: {label: `退潮进场：入口目标 $C6 由同一事件位选择场景 $${
      Number(destination).toString(16).toUpperCase().padStart(2, '0')}`,
      scene_id: destination},
  };
}

// @editor-module 自主脚本在场景中的条件与交互投影。
const hex$5 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

const PRESENTATIONS = new Map([
  ['branch-if-event-flag-clear', ['事件位条件', ['条件事件位', '分支位移']]],
  ['remove-actor-if-event-flag-set', ['条件消失', ['消失事件位']]],
  ['wait-event-flag-set', ['等待事件位', ['等待事件位']]],
  ['set-event-flag', ['写入事件位', ['写入事件位']]],
  ['clear-event-flag', ['清除事件位', ['清除事件位']]],
  ['set-actor-position', ['角色位置', ['位置 X', '位置 Y']]],
  ['move-actor-to-position', ['移动', ['移动 X', '移动 Y']]],
  ['branch-on-player-position-exact', ['玩家位置条件', ['触发 X', '触发 Y', '不匹配位移']]],
  ['branch-on-player-position-rectangle', ['玩家范围条件',
    ['触发 X 起点', '触发 X 上界', '触发 Y 起点', '触发 Y 上界', '范围外位移']]],
  ['branch-on-player-direction', ['玩家朝向条件', ['触发朝向', '不匹配位移']]],
  ['set-motion-attributes', ['移动属性', ['移动属性']]],
  ['start-scripted-encounter', ['战斗', ['战斗编队', '胜利事件位', '剧情状态']]],
  ['end-story-state-with-scene-context', ['退出场景', []]],
  ['relative-cursor-advance', ['跳转', ['跳转位移']]],
  ['countdown-relative-branch', ['循环', ['循环位移', '循环次数']]],
  ['branch-if-runtime-result-nonzero', ['结果条件', ['分支位移']]],
  ['branch-if-runtime-slot-empty', ['空槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-slot-present', ['占用槽条件', ['队伍槽', '分支位移']]],
  ['branch-if-runtime-party-actor-type-absent', ['队伍形象条件', ['角色形象', '分支位移']]],
  ['branch-if-runtime-slot-is-not-player-actor', ['队员条件', ['队伍槽', '分支位移']]],
  ['wander-inside-rectangle', ['移动范围', ['X 起点', 'X 上界', 'Y 起点', 'Y 上界']]],
  ['follow-rom-waypoint-loop', ['循环路径', ['路径']]],
  ['play-render-slot-offset-sequence', ['位置变化序列', ['序列', '角色形象']]],
  ['play-table-driven-actor-transformation', ['形象变化序列', ['序列']]],
  ['set-direct-frame-id', ['单帧形象', ['单帧形象']]],
  ['set-actor-type-animation-renderer', ['动画形象', ['角色形象']]],
  ['set-actor-type', ['角色形象', ['角色形象']]],
  ['replace-runtime-player-actor-type', ['队伍形象替换', ['原形象', '新形象']]],
  ['set-packed-camera-relative-position', ['镜头相对位置', ['相对位置']]],
  ['wait-operand-frames', ['等待', ['等待帧数']]],
  ['drive-scripted-input', ['自动输入', ['移动步数']]],
  ['sound-command', ['音频', ['音频命令']]],
  ['set-dialogue-actor-parameter', ['对话角色', ['对话角色']]],
  ['start-blocking-dialogue', ['文字', ['文字记录']]],
  ['start-blocking-ui-action', ['文字', ['文字记录']]],
  ['advance-global-screen-effect', ['画面效果', ['效果轮数']]],
  ['set-global-parameter', ['全局参数', ['全局参数']]],
  ['set-story-parameter', ['剧情参数', ['剧情参数']]],
  ['set-runtime-parameter-$9c', ['运行参数 9C', ['参数']]],
  ['set-runtime-parameter-$a2', ['运行参数 A2', ['参数']]],
  ['enter-dedicated-field-mode', ['场景模式', ['模式']]],
  ['set-runtime-party-slot-index', ['队伍槽', ['队伍槽']]],
  ['adopt-runtime-entity-state', ['接管现场角色', ['现场角色']]],
  ['transfer-actor-to-runtime-entity', ['转交队伍角色', ['队伍槽']]],
  ['subtract-party-money', ['扣除金钱', ['金额']]],
  ['write-field-tile-at-actor', ['角色位置地形', ['元图块']]],
  ['step-by-rom-direction-table', ['方向表移动', []]],
  ['step-toward-story-target', ['趋向目标', []]],
  ['attempt-tile-step', ['格步', []]],
  ['advance-wander-motion', ['游走', []]],
  ['move-actor-off-map', ['移出场景', []]],
  ['toggle-player-control-lock', ['切换操控锁', []]],
  ['clear-runtime-entity-render-slots', ['清除现场角色', []]],
  ['remove-actor', ['移除角色', []]],
  ['initialize-actor-motion-state', ['初始化移动', []]],
  ['face-opposite-runtime-direction', ['背向玩家', []]],
  ['set-direction', ['朝向', []]],
  ['end-actor-script', ['脚本结束', []]],
  ['set-runtime-entity-direction', ['现场角色朝向', []]],
  ['refresh-field-state', ['刷新场景状态', []]],
  ['mutate-field-tile-near-actor', ['附近地形变化', []]],
  ['pop-story-actor-slot', ['移除末尾角色', []]],
  ['wait', ['等待', []]],
]);

function storySceneDialogueReferences(action) {
  const ui = action.command.blocking_ui;
  if (!ui) return [];
  // 文字区与记录双操作数沿用剧情生产端的 $26 读写定义。
  const variableRegion = action.command.opcode === 0x26;
  const index = variableRegion ? 1 : ui.record_operand_index ?? action.semantic.record_operand_index ?? 0;
  return [{index, regionId: variableRegion ? action.operands[0] : ui.region_id,
    recordId: action.operands[index]}];
}

function storySceneActionPresentation(action) {
  const definition = PRESENTATIONS.get(action.operation);
  if (!definition) return null;
  const [label, names] = definition;
  const labels = action.command.opcode === 0x26 ? ['文字区', '文字记录'] : names;
  const flags = ['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set',
    'wait-event-flag-set', 'set-event-flag', 'clear-event-flag'].includes(action.operation);
  const directions = {up: '上', down: '下', left: '左', right: '右'};
  const value = action.semantic.direction ? directions[action.semantic.direction]
    : action.operation === 'wait' ? `${action.semantic.frames} 帧`
      : action.operation === 'drive-scripted-input' ? directions[
        ['up', 'down', 'left', 'right'][action.semantic.input_value - 1]] : '';
  return {label, value, operands: labels.map((label, index) => ({label, index,
    eventFlag: flags && index === 0 || action.operation === 'start-scripted-encounter' && index === 1})),
    destination: action.operation === 'end-story-state-with-scene-context'};
}

async function prepareStorySceneActions(records, document, story, database) {
  const ids = [...new Set(records.map(row => Number(row.autonomous_script_id)))];
  const entries = ids.filter(id => id > 0 && !story?.browser_vm?.programs?.some(row =>
    row.kind === 'autonomous' && Number(row.id) === id)).map(id =>
    story?.autonomous?.entries?.find(row => Number(row.id) === id)).filter(row => row?.path);
  const programs = await Promise.all(entries.map(entry =>
    database.getPackageDocument(`game/story/${entry.path}`, null)));
  const projection = Object.assign(Object.create(document), {
    scene_action_programs: programs.filter(program => program?.kind === 'autonomous')});
  const origin = projectFieldDraftOrigin(document);
  return origin ? trackProjectFieldProjection(projection, origin,
    () => projectFieldDraftRevision(document)) : projection;
}

function storySceneActions(record, document, story) {
  const script = document?.scripts?.find(row => Number(row.id) === Number(record.autonomous_script_id));
  let programs = [...(story?.browser_vm?.programs || []), ...(document?.scene_action_programs || [])]
    .filter(row => row.kind === 'autonomous');
  if (document?.layout) programs = projectStoryScriptPrograms(document, programs);
  const program = programs
    .find(row => row.kind === 'autonomous' && Number(row.id) === Number(script?.id));
  if (!script || !program) return [];
  const semantics = new Map(story.browser_vm.opcode_semantics.map(row => [row.opcode, row]));
  const segments = (document.scripts || []).map(script => ({script,
    range: story.autonomous.entries.find(row => Number(row.id) === Number(script.id))?.encoded_range}))
    .filter(row => row.range);
  const fieldAt = offset => {
    const segment = segments.find(row => offset >= row.range.start_prg
      && offset < row.range.end_prg_exclusive);
    if (!segment) return null;
    const byteIndex = offset - segment.range.start_prg;
    return {entityHandle: `story-autonomous-script:script:${hex$5(segment.script.id)}`,
      byteIndex, value: segment.script.bytecode[byteIndex]};
  };
  return program.commands.flatMap(command => {
    const cursor = Number(command.cursor);
    const declared = command.instructionBindings;
    const bound = index => {
      const binding = declared?.[index];
      if (!binding) return null;
      return binding.kind === 'sequence' ? {entityHandle: 'story-autonomous-script:pool',
        tokenId: binding.tokenId, operandIndex: binding.index, value: index ? command.currentOperands[index - 1] : command.opcode}
        : {entityHandle: binding.handle, byteIndex: binding.byteIndex,
          value: index ? command.currentOperands[index - 1] : command.opcode};
    };
    const location = declared ? bound(0) : fieldAt(command.prg_offset);
    if (!location || location.value !== command.opcode) return [];
    const semantic = semantics.get(command.opcode);
    if (!semantic) return [];
    const operandFields = Array.from({length: 5}, (_, index) => declared ? bound(index + 1) : fieldAt(command.prg_offset + index + 1));
    return [{cursor, operation: semantic.operation, semantic, command,
      handle: location.entityHandle, byteCursor: location.byteIndex, operandFields,
      operands: operandFields.map(field => field?.value)}];
  });
}

function storyActorCondition(record, document, story, actors) {
  const actions = storySceneActions(record, document, story);
  const action = actions.find(row => row.cursor === 0);
  if (!action || !['branch-if-event-flag-clear', 'remove-actor-if-event-flag-set'].includes(action.operation)) return null;
  const flag = action.operands[0];
  let removedWhenSet = action.operation === 'remove-actor-if-event-flag-set';
  const clearCursor = action.operands[action.semantic.branch_operand_index];
  for (let cursor = action.command.normal_advance; cursor < clearCursor;) {
    const step = actions.find(row => row.cursor === cursor);
    if (!step) break;
    if (step.operation === 'remove-actor') {removedWhenSet = true; break;}
    if (step.semantic.fidelity !== 'exact' || step.command.terminal_side_effect
        || step.command.edges.some(edge => edge.kind !== 'normal')
        || !(step.command.normal_advance > 0)) break;
    cursor += step.command.normal_advance;
  }
  const poses = sceneActorStateObjects({record}, document, story).map(row => row.pose);
  const triggers = (actors?.records || []).filter(row => row.entry_id === record.entry_id)
    .flatMap(actor => storySceneActions(actor, document, story).filter(row =>
      row.operation === 'start-scripted-encounter' && row.operands[1] === flag)
      .map(() => ({flag, label: '战斗胜利', reference: actor.uid,
        scene_id: actor.entry_id, object: `actor:${actor.id}`})));
  return {label: '自主动作条件', flags: [flag], flag_labels: {[flag]: '事件位'},
    triggers, states: [false, true].map(set => ({id: set ? 'set' : 'clear',
      label: `${hex$5(flag)} = ${Number(set)}`, cells: [],
      actor_hidden: set && removedWhenSet,
      actor_pose: poses.find(pose => pose.conditions.includes(`global-event-flag:${hex$5(flag)} = ${Number(set)}`)),
    }))};
}

// @editor-module 条件入口的语义状态与事件位引用。

function conditionalSceneRecord(object, context) {
  if (object?.kind === 'actor') {
    const condition = storyActorCondition(object.record, context.autonomous, context.project?.story,
      context.project?.scenes?.actors);
    return condition ? {key: object.key, appearance_condition: condition} : null;
  }
  if (object?.kind === 'transition') return {
    ...conditionalEntranceRecord(object.record, context), key: object.key,
  };
  const gate = hiddenTeleportGate(context.project);
  if (!gate || Number(context.sceneId) !== gate.scene_id) return null;
  const point = object ? [object.record.x, object.record.y] : context.point;
  return !point || gate.appearance_condition.states[1].cells.some(cell =>
    cell.x === point[0] && cell.y === point[1]) ? gate : null;
}

function conditionalEntranceRecord(record, context) {
  if (record?.appearance_condition) return record;
  if (tideEntrance({kind: 'transition', sceneId: context.sceneId,
    key: `transition:${record.id}`}, context.worldTide)) {
    const condition = worldTideCondition(context.worldTide, context.worldRaw);
    return {...record, appearance_condition: {...condition,
      destination: Number(record.destination_scene_id) === 0xc6 ? condition.destination : null}};
  }
  const investigation = context.sceneLogic?.layers?.metatile_investigation_points?.find(row =>
    Number(row.behavior_code) === 0x54 && row.x === record.x && row.y === record.y);
  if (!investigation) return record;
  const action = sceneTileAction({kind: 'investigation-tile', record: investigation}, context);
  if (!action) return record;
  return {...record, appearance_condition: {
    label: '调查当前地图格后出现入口', flags: [],
    persistence: action.persistence.label,
    triggers: [{label: '调查机关', scene_id: context.sceneId,
      object: `investigation-tile:${investigation.id}`}],
    states: [
      {id: 'before', label: '调查前', cells: []},
      {id: 'after', label: '调查后', cells: [{x: record.x, y: record.y,
        metatile_id: action.replacement_metatile}]},
    ],
  }};
}
function conditionalEntranceState(record, preview) {
  const condition = record?.appearance_condition;
  if (!condition) return null;
  return condition.states.find(row => row.id === preview?.stateId) || condition.states[0];
}

function conditionalEntranceCells(record, preview) {
  return conditionalEntranceState(record, preview)?.cells || [];
}

function conditionalEntrancesForFlag(flagId, logicIndex, tide, project) {
  const records = (logicIndex?.point_transitions || []).filter(record =>
    record.appearance_condition?.flags.includes(Number(flagId)));
  if (tide && Number(flagId) === tide.event_flag) {
    records.push({...tide.entrance, id: Number(tide.entrance.object.split(':')[1]),
      appearance_condition: worldTideCondition(tide)});
  }
  const gate = hiddenTeleportGate(project);
  if (gate?.appearance_condition.flags.includes(Number(flagId))) records.push(gate);
  return records;
}

// @editor-module 场景角色的服务参数按设施配置选择器解析。

function shopConfigurationForActor(actor, pointerEntries) {
  const command = Number(actor?.text_region);
  const argument = Number(actor?.interaction_or_record_id);
  if (!Number.isInteger(command) || !Number.isInteger(argument)
      || !SCENE_SERVICE_INSTANCE_COUNTS.has(command)) return null;
  const familyId = command - 0x10;
  const family = pointerEntries.find(entry => Number(entry.family_id) === familyId);
  if (family?.records?.length !== SCENE_SERVICE_INSTANCE_COUNTS.get(command)) return null;
  const record = family?.records?.find(item => Number(item.id) === argument);
  return record ? {familyId, recordId: argument, family, record} : null;
}

// @editor-module 存档事件位的已发布读写引用投影。

const hex$4 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
let catalog = [];
let unresolvedRomCalls = [];

function eventFlagReferenceCatalog() { return {rows: catalog, unresolvedRomCalls}; }

function collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps}) {
  const rows = globalEventFlagEntries().map(row => ({...row, writes: [], reads: []}));
  const seen = new Set();
  const add = (flag, access, source, href, operation, evidence = null) => {
    const row = globalEventFlagEntry(flag);
    if (!row || !href) return;
    const key = JSON.stringify([row.id, access, source, operation, evidence]);
    if (seen.has(key)) return;
    seen.add(key);
    const location = typeof href === 'string' ? {href} : href;
    rows[row.id][access === 'write' ? 'writes' : 'reads'].push({source, ...location, operation, evidence});
  };
  const sceneHref = (id, object = '', point = {}) => {
    const scene = (scenes?.editable_scenes || []).find(row => Number(row.id) === Number(id));
    return scene ? {href: `?view=scenes&scene=${scene.slug}&sceneMode=logic${object ? `&sceneObject=${object}` : ''}`,
      scenePosition: {sceneId: Number(scene.id), sceneObject: object,
        x: point.x ?? point.trigger_x ?? null, y: point.y ?? point.trigger_y ?? null}} : null;
  };
  for (const kind of ['autonomous', 'interaction']) for (const script of story?.[kind]?.entries || []) {
    for (const ref of script.state_references || []) add(ref.flag_id,
      ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      `story-${kind}-script:script:${hex$4(script.id)}`,
      `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}`,
      ref.operation, ref.source_prg_offset);
  }
  for (const actor of story?.npc_catalog?.records || []) for (const ref of actor.state_references || []) {
    add(ref.flag_id, ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      actor.uid || `scene-actor:${hex$4(actor.entry_id)}:${hex$4(actor.record_id)}`,
      sceneHref(actor.entry_id, `actor:${actor.record_id}`,
        actors.records.find(row => row.uid === actor.uid)), ref.operation, ref.source_prg_offset);
  }
  for (const row of story?.world_event_triggers?.entries || []) {
    const href = sceneHref(row.scene_id, `event:${row.id}`, row);
    add(row.event_flag, 'read', `world-event:${hex$4(row.id)}`, href, '触发检查');
    if (Number(row.event_flag) !== 0 && row.classification === 'coordinate-triggered-encounter')
      add(row.event_flag, 'write', `world-event:${hex$4(row.id)}`, href, '胜利置位');
  }
  for (const writer of story?.browser_vm?.wait_state_model?.external_writers || []) {
    if (writer.confirmation === 'confirmed') add(writer.flag_id, 'write', writer.label, writer.href, '置位', writer.evidence);
  }
  const control = story?.browser_vm?.control_state_model;
  for (const flag of control?.scene_reload_cleared_event_flags || []) add(flag, 'write', '场景初始化',
    `?view=bytemap-prg&romOffset=${control.scene_initializer_prg}`, '清零', control.scene_initializer_prg);
  for (const variant of story?.browser_vm?.variants || []) {
    if (variant.selection?.event_flag === undefined) continue;
    add(variant.selection.event_flag, 'read', `scene-actor-list:${hex$4(variant.id)}`,
      sceneHref(variant.selection.scene_id ?? variant.scene_id, `variant-${variant.id}-actor:0`,
        actors.records.find(row => Number(row.entry_id) === Number(variant.id) && Number(row.id) === 0)), '角色表选择');
  }
  for (const event of story?.browser_vm?.entry_events || []) {
    const view = storyViewForSequenceId(event.sequence_id);
    if (!view) continue;
    const href = `?view=${view}`;
    for (const flag of event.completion_flags || []) add(flag, 'read', event.sequence_id, href, '完成状态');
    if (event.entry_music) add(event.entry_music.flag_id, 'read', event.sequence_id, href, '入口音乐');
  }
  for (const sequence of story?.browser_vm?.sequences || []) {
    const view = storyViewForSequenceId(sequence.id);
    if (!view || !sequence.ending_animation) continue;
    for (const stage of sequence.ending_animation.timeline || []) if (stage.conditional)
      add(stage.event_flag, 'read', sequence.id, `?view=${view}`, '结局分支');
    const flag = sequence.ending_animation.audio?.event_flag;
    if (Number.isInteger(flag)) add(flag, 'read', sequence.id, `?view=${view}`, '结局音乐');
  }
  for (const row of lifecycle?.records || []) add(row.global_event_flag_reference, 'read', row.handle,
    sceneHref(Number.parseInt((row.scene_reference || row.source_scene_reference).split(':')[1], 16),
      `scene-state:${row.handle}`),
    row.kind === 'conditional-audio' ? '入口音乐' : '场景重映射');
  for (const scene of maps) for (const [index, group] of (scene.event_metatile_replacements || []).entries()) {
    add(group.event_flag, 'read', `scene:${hex$4(scene.id)}:event-map:${hex$4(index)}`,
      sceneHref(scene.id, `map-rewrite:scene:${hex$4(scene.id)}:event-map:${hex$4(index)}`), '地图改写');
  }
  for (const family of facilities?.configuration_loader?.pointer_entries || []) {
    for (const good of family.value_namespace?.goods || []) {
      if (!good.event_flag_reference) continue;
      for (const ref of family.value_namespace.event_flag_accesses || []) add(good.event_flag_reference,
        ref.access, good.resource_uid,
        `?view=shops&shopFamily=${family.family_id}&shopTab=catalog&record=${good.resource_uid}`,
        ref.operation, ref.script_prg);
    }
  }
  for (const transition of logic?.point_transitions || []) for (const flag of transition.appearance_condition?.flags || [])
    add(flag, 'read', `transition:${hex$4(transition.scene_id)}:${hex$4(transition.id)}`,
      sceneHref(transition.scene_id, `transition:${transition.id}`, transition), '入口条件');
  for (const facility of facilities?.facilities || []) {
    for (const instance of facility.instances || []) {
      const control = instance.switch;
      if (!control) continue;
      const href = sceneHref(instance.scene_id, `investigation:${instance.point_id}`, instance);
      add(control.event_flag_reference, 'read', instance.scene_object_uid, href, '开关状态');
      add(control.event_flag_reference, 'write', instance.scene_object_uid, href, control.password_required ? '密码正确置位' : '置位／清零');
      if (control.failure_flag_reference) add(control.failure_flag_reference, 'write', instance.scene_object_uid,
        href, '密码错误置位');
    }
    if (facility.id === 'teleport-terminal') for (const destination of facility.configuration?.destinations || []) {
      add(destination.availability_flag, 'read', `传送地点 ${destination.id}`, '?view=teleport&facilityTab=config', '可用状态');
    }
  }
  if (hidden) {
    const href = '?view=teleport&facilityTab=config#hidden-teleport';
    for (const flag of hidden.trigger_flags || []) add(flag.id, 'read', 'ui-facility:hidden-teleport', href, `条件 ${flag.value}`);
    add(hidden.set_flag, 'write', 'ui-facility:hidden-teleport', href, '错误传送置位');
    add(hidden.gate.event_flag, 'read', 'ui-facility:hidden-teleport', sceneHref(hidden.gate.scene_id, '', hidden.gate), '大门条件');
  }
  for (const call of investigation?.reward_calls || []) {
    if (!call.acquisition_condition) continue;
    const flag = call.acquisition_condition.flag_reference;
    const href = '?view=scenes&sceneTab=investigation';
    add(flag, 'read', `调查 · ${call.kind}`, href, '取得条件', call.handler_prg);
    add(flag, 'write', `调查 · ${call.kind}`, href, '取得置位', call.handler_prg);
    if (call.acquisition_condition.clear_on_successful_use) add(flag, 'write',
      call.acquisition_condition.clear_on_successful_use, '?view=items&resource=' + call.acquisition_condition.clear_on_successful_use,
      '使用后清零');
  }
  for (const row of encounters?.encounter_selector_to_global_event_flag || []) if (row.selector !== 0)
    add(row.global_event_flag_id, 'read', `encounter-event-flag-map:${hex$4(row.selector)}`,
      '?view=scenes&sceneTab=encounters', '遭遇禁用检查');
  for (const row of encounters?.battle_state_review?.wanted_targets || []) {
    const href = '?view=wanted';
    add(row.claim_flag, 'read', `通缉目标 ${row.target_id}`, href, '领赏检查');
    add(row.claim_flag, 'write', `通缉目标 ${row.target_id}`, href, '领取置位');
  }
  if (tide) {
    const href = sceneHref(tide.trigger?.scene_id, 'tide:0', tide.trigger);
    add(tide.event_flag, 'read', 'field-exploration-runtime:00', href, '潮汐地形');
    add(tide.event_flag, 'write', 'field-exploration-runtime:00', href, '潮汐切换');
  }
  for (const ref of rom) add(ref.flag, ref.access, ref.source, ref.href, ref.operation, ref.evidence);
  return rows;
}

async function romReferences() {
  const [symbols, xrefs, index] = await Promise.all([
    db.getPackageDocument('analysis/disassembly/symbols.json'),
    db.getPackageDocument('analysis/disassembly/xrefs.json'), loadByteMapIndex(),
  ]);
  const helpers = new Map(['SetGlobalEventFlag', 'ClearGlobalEventFlag', 'TestGlobalEventFlag'].map(name => {
    const symbol = symbols.symbols.find(row => row.name === name);
    return [symbol?.prg_offset, {name, access: name === 'TestGlobalEventFlag' ? 'read' : 'write'}];
  }));
  const calls = [...new Map(xrefs.xrefs.filter(row => ['call', 'jump'].includes(row.kind) && helpers.has(row.to_prg))
    .map(row => [`${row.from_prg}:${row.to_prg}`, row])).values()];
  const banks = [...new Set(calls.map(row => Math.floor(row.from_prg / 0x2000)))];
  const shards = await Promise.all(banks.map(bank => loadByteMapBank(index, index.bank_shards.prg[bank])));
  const instructions = new Map(shards.flatMap(shard => shard.disassembly.instructions).map(row => [row.prg_offset, row]));
  const results = [], unresolved = [];
  for (const call of calls) {
    const helper = helpers.get(call.to_prg);
    const previous = instructions.get(call.from_prg - 2);
    const incoming = xrefs.xrefs.some(row => row.to_prg === call.from_prg && ['call', 'jump', 'branch'].includes(row.kind));
    const match = !incoming && previous?.mnemonic === 'LDA' && previous.addressing_mode === 'Imm'
      ? /^#\$([0-9A-F]{2})$/u.exec(previous.operand) : null;
    const instruction = instructions.get(call.from_prg);
    const record = {access: helper.access, source: instruction?.function || helper.name,
      href: `?view=bytemap-prg&romOffset=${call.from_prg}`, operation: helper.name,
      evidence: call.from_prg};
    if (match) results.push({...record, flag: Number.parseInt(match[1], 16)});
    else unresolved.push(record);
  }
  unresolvedRomCalls = unresolved;
  return results;
}

async function prepareEventFlagReferences() {
  const [story, facilities, logic, scenes, lifecycle, encounters, investigation, tide, hidden, rom, actors] = await Promise.all([
    db.getDocument('project.story'), db.getDocument('project.facilities'),
    db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('field-scene-lifecycle-service'), db.getResourceDocument('encounter-event-flag-map'),
    db.getResourceDocument('nearby-object-investigation-service'), db.getResourceDocument('field-exploration-runtime'),
    db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID), romReferences(), db.getDocument('scene-actor'), prepareGlobalEventFlags(),
  ]);
  const maps = [];
  const sceneEntries = scenes.editable_scenes;
  for (let start = 0; start < sceneEntries.length; start += 12) {
    maps.push(...await Promise.all(sceneEntries.slice(start, start + 12).map(async row =>
      (await db.getResourceDocument(`scene:${hex$4(row.id)}`)).scene)));
  }
  catalog = collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps});
}

// @editor-module 调查物取得位的已发布读写引用投影。

function treasureFlagReferences(index, project) {
  const scenes = new Map((project?.scenes?.editable_scenes || [])
    .map(scene => [Number(scene.id), scene]));
  const writes = [], reads = [];
  const effects = new Map([
    ['spawn-or-materialize-uncollected-metatile', '未取得图块生成'],
    ['collected-metatile-selection', '取得后图块选择'],
  ]);
  for (const row of project?.scenes?.logic?.treasures || []) {
    const model = row.interaction_state;
    const scene = scenes.get(Number(row.scene_id));
    if (!scene || model?.class !== 'treasure-collected-flag' || Number(model.flag_id) !== Number(index)) continue;
    const reference = {source: `treasure:${Number(row.scene_id).toString(16).toUpperCase().padStart(2, '0')}:${
      Number(row.id).toString(16).toUpperCase().padStart(2, '0')} · ${scene.name} · ${row.x}, ${row.y}`,
      href: `?view=scenes&scene=${scene.slug}&sceneObject=treasure:${row.id}`,
      scenePosition: {sceneId: Number(scene.id), x: row.x, y: row.y, sceneObject: `treasure:${row.id}`},
      evidence: model.commit};
    if (model.commit === 'immediate-after-successful-acquisition')
      writes.push({...reference, operation: '取得成功置位'});
    if (Number.isInteger(model.test_helper_cpu)) reads.push({...reference, operation: '取得状态检查'});
    for (const effect of model.effects || []) {
      if (effects.has(effect)) reads.push({...reference, operation: effects.get(effect)});
    }
  }
  return {writes, reads};
}

// @editor-module 反查只回答当前详情中的字段对象被谁引用。

let currentOwner = null;

function ownerReferenceListMarkup(label, attributes = "") {
  return `<details data-owner-reference-list ${attributes}><summary>${esc(label)}</summary><div data-owner-reference-content></div></details>`;
}

function bindOwnerReferenceList(host, load, onLoaded = () => {}) {
  if (!host || host.dataset.ownerReferenceBound) return;
  host.dataset.ownerReferenceBound = "1";
  let pending = false;
  let loaded = false;
  const label = host.querySelector('summary').textContent;
  host.addEventListener("toggle", async () => {
    if (!host.open) {
      loaded = false;
      host.querySelector('[data-owner-reference-content]').innerHTML = '';
      host.querySelector('summary').textContent = label;
      delete host.dataset.ownerReferenceReady;
      return;
    }
    if (pending || loaded) return;
    pending = true;
    try {
      const html = await load();
      if (!host.open) return;
      host.querySelector("[data-owner-reference-content]").innerHTML = html;
      loaded = true;
      onLoaded(host);
      host.dispatchEvent(new CustomEvent('owner-reference-loaded', {bubbles: true}));
      host.dataset.ownerReferenceReady = 'true';
    } catch (error) {
      if (!host.open) return;
      host.querySelector("[data-owner-reference-content]").innerHTML = editorErrorMarkup("引用加载失败", error);
      host.dataset.ownerReferenceReady = 'error';
    } finally {
      pending = false;
    }
  });
}

function withCurrentOwnerRecord(record, project, render, {elevators = []} = {}) {
  const previous = currentOwner;
  currentOwner = {record, project, elevators};
  try { return render(); }
  finally { currentOwner = previous; }
}

function currentOwnerReferenceImpact() {
  if (!currentOwner) throw new TypeError("入站引用只可在当前 owner 行读取");
  const {record, project, elevators} = currentOwner;
  if (record.kind === "scene-destination") return sceneDestinationUsers(record.page, project);
  if (record.kind === "metatile") return metatileUsers(record.handle, project);
  if (record.kind === "story-sequence") return (project?.browser_vm?.sequences || [])
    .filter(row => row.related_sequence_ids?.includes(record.sequence.id)
      && !record.sequence.related_sequence_ids?.includes(row.id) && storyViewForSequenceId(row.id));
  if (record.kind === "ui-template") {
    const states = new Set(uiTemplateBindings(project.library)
      .filter(binding => binding.template === record.id).map(binding => binding.state));
    return (project.document?.screens || []).filter(screen => states.has(screen.interface_state_id));
  }
  if (record.kind === "ui-common-frame") return record.frame.users;
  if (record.kind === 'ui-component-data') return record.users;
  if (record.kind === "controlled-object") return controllersForTarget(record.sceneId, record.selection, project);
  if (record.kind === "shop-instance") {
    const entries = project?.facilities?.configuration_loader?.pointer_entries || [];
    const scenes = new Map((project?.scenes?.editable_scenes || [])
      .map(scene => [Number(scene.id), scene]));
    const actorTables = new Map((project?.scenes?.actors?.tables || [])
      .map(table => [Number(table.entry_id), table]));
    const actors = (project?.scenes?.actors?.records || [])
      .filter(actor => {
        const target = shopConfigurationForActor(actor, entries);
        return target?.familyId === record.familyId
          && target?.recordId === record.recordId;
      })
      .map(actor => {
        const table = actorTables.get(Number(actor.entry_id));
        const variant = table?.owner?.kind === "dynamic-variant";
        const scene = scenes.get(variant
          ? Number(table.owner.scene_id) : Number(actor.entry_id));
        const selection = variant
          ? `variant-${Number(actor.entry_id)}-actor:${Number(actor.id)}`
          : `actor:${Number(actor.id)}`;
        return {actor, scene, selection};
      })
      .filter(item => item.scene);
    return {actors, elevators: record.familyId === 15
      ? elevators.filter(item => item.elevator.instance_id === record.recordId) : []};
  }
  const flag = Number(record.binding?.flag_id);
  const treasure = Number(record.binding?.record_id);
  const isGlobal = /\.global_event_flag\./.test(record.fieldId)
    || record.kind === "global-event-bit";
  const isTreasure = /\.treasure_collected_flag\./.test(record.fieldId);
  const scenes = new Map((project?.scenes?.editable_scenes || [])
    .map(scene => [Number(scene.id), scene]));
  const worldEvents = isGlobal && Number.isInteger(flag)
    ? (project?.story?.world_event_triggers?.entries || [])
      .filter(row => Number(row.event_flag) === flag)
      .flatMap(row => {
        const scene = scenes.get(Number(row.scene_id));
        return scene ? [{scene, row}] : [];
      }) : [];
  const actors = isGlobal && Number.isInteger(flag)
    ? (project?.story?.npc_catalog?.records || [])
      .filter(actor => (actor.state_references || [])
        .some(reference => Number(reference.flag_id) === flag))
      .flatMap(actor => {
        const scene = scenes.get(Number(actor.entry_id));
        return scene ? [{scene, actor, references: actor.state_references
          .filter(reference => Number(reference.flag_id) === flag)}] : [];
      }) : [];
  const scripts = isGlobal && Number.isInteger(flag)
    ? ["autonomous", "interaction"].flatMap(kind =>
      (project?.story?.[kind]?.entries || [])
        .filter(script => (script.state_references || [])
          .some(reference => Number(reference.flag_id) === flag))
        .map(script => ({kind, script, references: script.state_references
          .filter(reference => Number(reference.flag_id) === flag)}))) : [];
  const treasures = isTreasure && Number.isInteger(treasure)
    ? (project?.scenes?.logic?.treasures || [])
      .filter(row => row.interaction_state?.class === "treasure-collected-flag"
        && Number(row.interaction_state.flag_id) === treasure)
      .flatMap(row => {
        const scene = scenes.get(Number(row.scene_id));
        return scene ? [{scene, row}] : [];
      }) : [];
  const stories = isGlobal ? storiesForEventFlag(flag, project?.story) : [];
  const controllers = isGlobal ? controllersForFlag(flag, project) : [];
  const conditionalEntrances = isGlobal
    ? conditionalEntrancesForFlag(flag, project?.scenes?.logic, record.tide, project) : [];
  const hiddenTeleport = isGlobal ? hiddenTeleportDestination(project) : null;
  const hiddenTeleportFlag = isGlobal ? hiddenTeleportFlags(project)
    .find(row => row.id === flag) : null;
  return {worldEvents, actors, scripts, treasures, stories, controllers, conditionalEntrances,
    hiddenTeleport, hiddenTeleportFlag, accesses: isGlobal
      ? eventFlagReferenceCatalog().rows[flag] || {writes: [], reads: []}
      : isTreasure ? treasureFlagReferences(treasure, project) : null};
}

async function metatileUsers(handle, database) {
  const document = await database.getResourceDocument('metatile-set', null);
  const sets = document.records.filter(record => record.handle === handle
    || record.lower_metatile_page === handle || record.upper_metatile_page === handle);
  return {sets, scenes: [...new Set(sets.flatMap(record => record.scene_references || []))].sort()};
}

const hex$3 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const destinationViews = new Set(['shops', 'interfaceui', 'jukebox', 'vending', 'frograce',
  'teleport', 'computercontroller', 'wanted', 'wanted-ui', 'actors', 'text', 'items',
  'equipment', 'battle-test', 'monster-formations', 'vehicles', 'scenes', 'audio', 'metatiles']);

function destinationMatchesPage(target, page) {
  const query = target.query;
  if (query.view !== page.view) return false;
  if (page.view === 'monster-formations' && page.resourceId?.startsWith('encounter-formation:'))
    return query.resource === page.resourceId;
  if (query.resource && query.resource === page.resourceId
      && ['battle-test', 'items', 'equipment'].includes(page.view)) return true;
  if (query.view === 'interfaceui') return query.interface === page.interfacePage;
  if (query.view === 'shops') return Number(query.shopFamily) === Number(page.shopFamily)
    && (query.shopTab === 'buyer' ? page.shopTab === 'buyer' : page.shopTab !== 'buyer')
    && (query.shopConfig == null || Number(query.shopConfig) === Number(page.shopPreviewRecord));
  if (query.view === 'wanted' || query.view === 'wanted-ui')
    return String(query.wantedTarget ?? 'default') === String(page.wantedTargetIndex)
      && String(query.wantedSide ?? 'high') === String(page.wantedTargetSide);
  if (query.view === 'scenes') return query.scene ? query.scene === page.sceneSlug
    : !page.sceneSlug && query.sceneTab === page.sceneListTab;
  if (query.view === 'text') return (page.textRegion === 'all' || query.textRegion === page.textRegion)
    && (!String(page.textSearch || '').startsWith('record:') || query.textSearch === page.textSearch);
  if (query.view === 'battle-test' || query.view === 'items' || query.view === 'equipment') return page.recordId == null
    || query.resource === page.recordId || Number.parseInt(query.resource?.split(':').at(-1), 16) === Number(page.recordId);
  if (query.view === 'actors') return page.actorVisualTab === 'story'
    && query.storyKind === page.storyKind && (page.recordId == null || Number(query.record) === Number(page.recordId));
  if (query.view === 'vehicles') return page.recordId == null || Number(query.record) === Number(page.recordId);
  if (query.view === 'audio') return page.recordId == null || query.record === page.recordId;
  if (query.view === 'metatiles') return query.metatile === page.metatileRecordId;
  if (query.view === 'vending') return Number(query.vendingFamily) === Number(page.vendingPreviewFamily)
    && Number(query.vendingConfig) === Number(page.vendingPreviewConfiguration);
  if (query.view === 'jukebox') return Number(query.jukeboxConfig) === Number(page.jukeboxPreviewConfiguration);
  if (storyPlaybackView(query.view)) return page.storySequenceId == null
    || query.storySequence === page.storySequenceId;
  return true;
}

async function sceneDestinationUsers(page, database) {
  if (!supportsSceneDestinationPage(page.view)) return [];
  if (page.view === 'scenes' && !page.sceneSlug && page.sceneListTab !== 'investigation') return [];
  const [scenes, actors, logicIndex, facilities, wanted, story, vehicles, sources, working, bgm, items, metatileSets, autonomousScripts] = await Promise.all([
    database.getDocument('project.scenes', null), database.getAll('scene-actor', []),
    database.getDocument('project.scenes.logic', null), database.getDocument('project.facilities', null),
    database.getDocument('project.wanted', null), database.getDocument('project.story', null),
    database.getResourceDocument('vehicle-preset', null),
    database.getDocument('project.scenes.interaction-sources', null), database.listWorkingAssets(),
    database.getResourceDocument('field-scene-lifecycle-service', null),
    database.getAll('item', []),
    page.view === 'metatiles' ? database.getResourceDocument('metatile-set', null) : null,
    database.getResourceDocument('story-autonomous-script', null),
  ]);
  const changedInteractionScripts = new Set(working.filter(row => row.resource_id === 'story-interaction-script')
    .flatMap(row => row.fields.filter(field => field.hasOverride)
      .map(field => Number.parseInt(field.entityHandle.split(':').at(-1), 16))));
  const worldEvents = ['battle-test', 'monster-formations'].includes(page.view)
    ? await database.getResourceDocument('world-event', null) : null;
  const context = {scenes, logicIndex, facilities, wanted, story, changedInteractionScripts, bgm, items, worldEvents, metatileSets, autonomousScripts};
  context.actorsByUid = new Map(actors.map(record => [record.uid, record]));
  if (storyPlaybackView(page.view)) {
    context.autonomousScripts = page.project?.story_autonomous_edits || autonomousScripts;
    context.objectKinds = new Set(['actor', 'event', 'entry-story']);
    const sequences = (story.browser_vm?.sequences || []).filter(sequence =>
      destinationMatchesPage({query: {view: storyViewForSequenceId(sequence.id), storySequence: sequence.id}}, page));
    context.actorHandles = new Set(sequences.flatMap(sequence => [
      ...(sequence.trigger_actor_handles || []),
      ...(sequence.interaction_trigger ? [`scene-actor:${hex$3(sequence.entry_variant_id)}:${hex$3(sequence.interaction_trigger.actor_record_id)}`] : []),
    ]));
  }
  if (!scenes?.editable_scenes || !logicIndex || !facilities || !wanted || !story)
    throw new TypeError('场景交互引用正文不完整');
  const placements = context.actorHandles ? [] : vehicles?.initial_placement?.records || [];
  const usages = [];
  const dirty = new Set(working.filter(row => row.dirty).map(row => row.resource_id));
  // 无 Working 的场景用完整已发布表，只有改过的场景才准备字段对象投影。
  for (let offset = 0; offset < sources.records.length; offset += 12) {
    const groups = await Promise.all(sources.records.slice(offset, offset + 12).map(async ({scene, logic}) => {
      const handle = `scene:${hex$3(scene.id)}`;
      if (dirty.has(handle)) {
        const document = await database.getResourceDocument(handle, null);
        if (!document?.logic) throw new TypeError(`${handle} 缺交互正文`);
        logic = document.logic;
      }
      return enumerateSceneInteractionObjects(scene, logic, actors, placements, context).flatMap(object => {
        const targets = sceneInteractionDestinations(object, {...context, sceneLogic: logic}).targets
          .filter(target => !target.external && destinationMatchesPage(target, page));
        return targets.length ? [{object: {...object, sceneName: scene.name}, targets}] : [];
      });
    }));
    usages.push(...groups.flat());
  }
  return usages;
}

function supportsSceneDestinationPage(view) {
  return destinationViews.has(view) || storyPlaybackView(view);
}

// @editor-module 将场景交互去向绑定到承载页共用的配置字段对象。

const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneOwnedInteractionConfigurations(object, context) {
  const ownContext = {...context, skipConfigurationResolution: true};
  const configuration = sceneInteractionConfigurations(object, ownContext);
  const probe = sceneTreasureProbeResolution(object, context);
  if (!probe?.record) return configuration;
  const treasure = sceneInteractionConfigurations({kind: 'treasure', sceneId: object.sceneId,
    record: probe.record}, ownContext);
  const external = new Set(treasure.requests.map(request => `${request.resourceId}/${request.handle}`));
  external.add(`scene:${hex$2(object.sceneId)}/scene:${hex$2(object.sceneId)}:treasure:${hex$2(probe.record.id)}`);
  return {...configuration, requests: configuration.requests.filter(request =>
    !external.has(`${request.resourceId}/${request.handle}`))};
}

function sceneInteractionConfigurations(object, context) {
  if (object.kind === 'tide') return {requests: [{resourceId: WORLD_TIDE_OWNER,
    handle: WORLD_TIDE_HANDLE, label: '潮汐地形'}], gaps: [], unresolved: []};
  const requests = [], gaps = [];
  const add = (target, resourceId, handle, label, fields) => {
    const request = {resourceId, handle, label, fields, condition: target.condition,
      effectiveObject: target.effectiveObject, href: configurationHref(resourceId, handle, target.href, context)};
    requests.push(request);
    return request;
  };
  const result = sceneInteractionDestinations(object,
    {...context, skipInvestigationTakeovers: context.skipConfigurationResolution});
  const remaps = object.kind === 'scene-state' ? [object.record]
    : controllerSceneRemaps(controllerAt(object, context, context.sceneLogic), context.bgm);
  for (const row of remaps) {
    const request = add({}, SCENE_REMAP_OWNER, row.handle, '事件条件场景映射');
    request.inPlace = true;
  }
  if (object.kind === 'investigation-tile' && Number(object.record.behavior_code) === 0x54) {
    add({}, TILE_ACTION_OWNER, TILE_ACTION_HANDLE, '调查', ['audio_command', 'replacement_metatile']);
    for (const target of result.targets) {
      if (target.tileActionTransition) {
        const resourceId = `scene:${hex$2(object.sceneId)}`;
        add(target, resourceId, `${resourceId}:transition:${hex$2(target.tileActionTransition.id)}`,
          '通往场景与落点', ['destination_scene_id', 'destination_x', 'destination_y']);
      }
    }
  }
  if (['transition', 'boundary'].includes(object.kind)) {
    if (tideEntrance(object, context.worldTide)) add({}, WORLD_TIDE_OWNER, WORLD_TIDE_HANDLE,
      '潮汐切换时的地形配置');
    const resourceId = `scene:${hex$2(object.sceneId)}`;
    add(result.targets[0] || {}, resourceId, `${resourceId}:${object.kind}:${hex$2(object.record.id)}`,
      '目标场景与落点', ['destination_scene_id', 'destination_x', 'destination_y']).existingInspector = !object.boundInteraction;
    return {requests, gaps, unresolved: result.gaps};
  }
  if (object.kind === 'scene-state') {
    return {requests, gaps, unresolved: result.gaps};
  }
  if (!['actor', 'treasure', 'investigation-special', 'investigation', 'investigation-tile', 'event', 'elevator', 'vehicle', 'bgm', 'entry-story'].includes(object.kind)) return {requests, gaps, unresolved: result.gaps};
  if (object.kind === 'bgm' && object.record.key === 'bgm:default') {
    const resourceId = `scene:${hex$2(object.sceneId)}`;
    add({}, resourceId, `${resourceId}:music`, '入口音乐', ['command_id']);
  }
  const addFormation = (target, id) => {
    if (!Number.isInteger(Number(id)) || Number(id) < 0 || Number(id) >= 0x39) return;
    for (let slot = 0; slot < 4; slot++) add(target, 'battle-test-point',
      `encounter-formation:${hex$2(id)}:slot:${slot}`, `战斗编队 ${hex$2(id)} · 槽 ${slot + 1}`);
  };
  if (object.kind === 'event') addFormation({}, sceneCoordinateEvent(object.record, context).encounter_formation_id);
  const addReward = record => {
    const content = sceneTreasureContent(record, context.logicIndex?.treasures || []);
    if (content.kind === 'money') {
      if (Number(record.content_id) <= 0xfa) add({}, 'field-reward-resolution-service',
        `field-reward-resolution-service:${hex$2(record.content_id)}`, '金钱奖励倍率');
      else gaps.push(`调查物 ${hex$2(record.id)} 的结果 ${hex$2(record.content_id)} 缺金钱倍率字段引用。`);
    }
  };
  if (object.kind === 'treasure') addReward(object.record);
  if (object.kind === 'investigation-tile') {
    const record = sceneTreasureProbeResolution(object, context)?.record;
    if (record) {
      addReward(record);
      const resourceId = `scene:${hex$2(object.sceneId)}`;
      add({condition: '未取得'}, resourceId, `${resourceId}:treasure:${hex$2(record.id)}`,
        '调查物坐标与内容', ['x', 'y', 'content_id']);
    }
  }
  if (object.kind === 'actor' && actorInteractionMode(object.record) === 'interaction-script'
      && !result.targets.some(target => target.query.view === 'story-page'))
    add(result.targets.find(target => target.query.view === 'actors'
      && target.query.storyKind === 'interaction') || {}, 'story-interaction-script',
      `story-interaction-script:script:${hex$2(object.record.interaction_or_record_id)}`, '交互脚本');
  if (object.kind === 'actor' && Number(object.record.autonomous_script_id) > 0)
    add(result.targets.find(target => target.query.view === 'actors'
      && target.query.storyKind === 'autonomous') || {}, 'story-autonomous-script',
      `story-autonomous-script:script:${hex$2(object.record.autonomous_script_id)}`, '自动动作脚本').physicalOnly = true;
  if (object.kind === 'actor') for (const action of storySceneActions(object.record, context.autonomous, context.story)) {
    if (action.handle !== `story-autonomous-script:script:${hex$2(object.record.autonomous_script_id)}`)
      add({}, 'story-autonomous-script', action.handle, '自动动作脚本').physicalOnly = true;
    for (const {regionId, recordId} of storySceneDialogueReferences(action))
      add({}, 'text-record', `record:${hex$2(regionId)}:${String(recordId).padStart(3, '0')}`, '剧情文字');
    if (action.operation === 'start-scripted-encounter') addFormation({}, action.operands[0]);
  }
  const targets = [...result.targets, ...(result.applications || []).filter(application =>
    !result.targets.some(target => Number(target.application?.command) === Number(application.command)
      && Number(target.application?.instance) === Number(application.instance)))
    .map(application => ({query: {}, label: application.label, application}))];
  for (const target of targets) {
    if (target.metatile) {
      const {handle, index} = target.metatile;
      const [resourceId, suffix] = handle.split(':');
      for (const kind of ['definitions', 'attributes']) {
        const fieldHandle = resourceId === 'metatile-set' ? `${resourceId}:${suffix}-${kind}`
          : `${resourceId}:${kind}-${suffix}`;
        const request = add(target, resourceId, fieldHandle, kind === 'definitions' ? '调查后元图块组成' : '调查后元图块属性', ['value0']);
        request.matrixRowIndices = [index];
        request.physicalOnly = object.kind === 'investigation-tile' && Number(object.record.behavior_code) === 0x54;
      }
    }
    if (target.query.storySequence) {
      const inventory = context.story?.cutscene_inventory;
      const sequence = [...(inventory?.entries || []), ...(inventory?.related_entries || [])]
        .find(row => row.id === target.query.storySequence);
      for (const id of sequence?.source_script_ids || []) add(target, 'story-autonomous-script',
        `story-autonomous-script:script:${hex$2(id)}`, `自动剧情脚本 ${hex$2(id)}`);
      for (const clue of sequence?.dialogue_clues || []) add(target, 'text-record',
        `record:${hex$2(clue.region_id)}:${String(clue.record_id).padStart(3, '0')}`, '剧情文字');
    }
    if (target.query.view === 'audio' && target.query.record?.startsWith('audio-command:'))
      add(target, 'audio-command', target.query.record, '音乐命令').physicalOnly =
        object.kind === 'investigation-tile' && Number(object.record.behavior_code) === 0x54;
    if (target.query.wantedTarget != null) {
      const index = target.query.wantedTarget;
      const handle = index === 'default' ? 'wanted-record:default-pair' : `wanted-record:target:${index}`;
      add(target, 'wanted-record', handle, '通缉令目标');
      const pair = index === 'default' ? context.wantedConfiguration?.default_pair
        : context.wantedConfiguration?.targets.find(row => Number(row.index) === Number(index));
      const id = pair?.[`${target.side}_target_id`];
      if (Number(id) > 0 && Number(id) <= 11) add(target, 'wanted-record', `wanted-record:bounty:${id}`, '目标赏金');
      if (id != null) addFormation(target, id);
    }
    if (['battle-test', 'monster-formations'].includes(target.query.view)) {
      if (target.query.resource?.startsWith('encounter-formation:'))
        addFormation(target, Number.parseInt(target.query.resource.split(':')[1], 16));
      else if (target.query.resource === 'investigation-battle-test:00') {
        add(target, 'battle-test-point', 'battle-test:entry', '调查战斗参数');
        addFormation(target, context.battleTest?.encounter_id);
      }
    }
    if (['items', 'equipment'].includes(target.query.view) && target.query.resource?.startsWith('item:'))
      add(target, 'item-entry', `item-entry:${target.query.resource}`, '奖励物品配置');
    if (target.query.view === 'vehicles') add(target, 'vehicle-preset',
      `vehicle-preset:preset:${hex$2(target.query.record)}`, '战车预设');
    if (target.record) add(target, 'text-record', target.record, '对话与调查文字');
    const service = INTERFACE_PAGE_DEFINITIONS.find(row => row.id === target.query.interface);
    if (service?.configResourceId) add(target, service.configResourceId, null, service.label);
    if (!target.application) continue;
    const {command, instance} = target.application;
    const application = context.facilities.applications.commands.find(row =>
      Number(row.command_id) === Number(command));
    const family = application?.configuration_family;
    const commandResource = `application-command:${hex$2(command)}`;
    add(target, commandResource, commandResource, '应用脚本入口');
    if (family) {
      const alias = context.facilityConfiguration?.families?.find(row =>
        Number(row.id) === Number(family.family_id))?.records.find(row => Number(row.id) === Number(instance));
      const record = context.facilityConfiguration?.records.find(row => row.id === alias?.record_id);
      if (!record) {gaps.push(`配置族 ${hex$2(family.family_id)} 实例 ${hex$2(instance)} 缺字段对象引用。`); continue;}
      if (record.slots.length) add(target, 'facility-config', record.id, `${target.label} · 实例 ${hex$2(instance)}`);
      const namespace = family.value_namespace;
      for (const slot of record.slots) {
        if (Number(family.family_id) === 0x0a) add(target, 'audio-command',
          `audio-command:${hex$2(slot.value)}`, `曲目 ${hex$2(slot.value)}`);
        const schema = namespace?.slot_schema?.slots.find(row => Number(row.slot) === Number(slot.id));
        const domain = schema?.namespace || (namespace?.slot_schema ? null : namespace?.namespace);
        if (domain === 'item') add(target, 'item-entry', `item-entry:item:${hex$2(slot.value)}`,
          `${context.items?.find(row => Number(row.id) === Number(slot.value))?.name || hex$2(slot.value)} · 商品价格`, ['price.raw_code']);
        if (domain === 'shell') add(target, 'shell-record', `shell:${hex$2(slot.value)}`, '炮弹价格', ['price.raw_code']);
        if (domain === 'vehicle-preset') add(target, 'vehicle-preset', `vehicle-preset:preset:${hex$2(slot.value)}`, '出租车型');
        if (domain === 'service-goods') {
          const goods = namespace.goods.find(row => Number(row.value) === Number(slot.value));
          if (goods?.text_record) add(target, 'text-record', goods.text_record, namespace.goods_label || '服务项目');
        }
      }
    }
    if ([0x32, 0x33].includes(Number(command))) add(target,
      `ui-facility:frog-race:config:${hex$2(instance)}`, `ui-facility:frog-race:config:${hex$2(instance)}`, '下注金额');
    if (Number(command) === 0x2d) for (let id = 0; id < 12; id++) add(target,
      `ui-facility:teleport-terminal:config:${hex$2(id)}`,
      `ui-facility:teleport-terminal:config:${hex$2(id)}`, `传送落点 ${hex$2(id)}`);
  }
  if (!context.skipConfigurationResolution) for (const {condition, effective} of result.resolution?.branches || []) {
    if (effective.kind === object.kind && Number(effective.record.id) === Number(object.record.id)) continue;
    const configuration = sceneInteractionConfigurations(effective, {...context, skipConfigurationResolution: true});
    requests.push(...configuration.requests.filter(request => !condition.includes('其他朝向')
      || !request.condition?.startsWith('朝上')).map(request => ({...request,
      condition: request.condition && request.condition !== condition ? `${condition} · ${request.condition}` : condition,
      effectiveObject: effective.uid})));
    gaps.push(...configuration.gaps.map(gap => `${condition} · ${effective.uid} · ${gap}`));
  }
  return {requests: [...new Map(requests.map(request =>
    [`${request.resourceId}/${request.handle}/${request.fields?.join(',') || ''}`, request])).values()], gaps, unresolved: result.gaps};
}

// 每个字段对象的编辑入口由其承载页面提供。
function configurationHref(resourceId, handle, fallback, context) {
  const suffix = handle?.split(':').at(-1);
  if (resourceId.startsWith('story-') && resourceId.endsWith('-script'))
    return `?view=actors&actorPart=story&storyKind=${resourceId.includes('autonomous') ? 'autonomous' : 'interaction'}&record=${parseInt(suffix, 16)}#story-script-field-object`;
  if (resourceId === 'text-record') return `?view=text&textMode=records&textRegion=${handle.split(':')[1]}&textSearch=${encodeURIComponent(handle)}`;
  if (resourceId === 'battle-test-point') return handle.startsWith('encounter-formation:')
    ? `?view=monster-formations&resource=encounter-formation:${handle.split(':')[1]}`
    : '?view=battle-test&resource=investigation-battle-test:00';
  if (resourceId === 'field-reward-resolution-service')
    return '?view=scenes&sceneTab=investigation#scene-reward-parameters';
  if (resourceId.startsWith('application-command:'))
    return `?view=scenes&sceneTab=actors#scene-application-parameters-${resourceId.split(':')[1]}`;
  if (resourceId === 'shell-record') return `?view=shells&record=${parseInt(suffix, 16)}`;
  if (resourceId === 'item-entry') {
    const id = parseInt(suffix, 16);
    const item = context.items?.find(row => Number(row.id) === id) || {id};
    const route = itemPageRoute(item);
    if (route.view === 'equipment') route.equipmentDomain = id >= 0x41 ? 'tank' : 'human';
    return `?${new URLSearchParams(route)}`;
  }
  if (resourceId === 'vehicle-preset') return `?view=vehicles&record=${parseInt(suffix, 16)}`;
  if (resourceId === 'wanted-record' && fallback) {
    const query = new URLSearchParams(fallback.slice(1).split('#')[0]);
    query.set('view', 'wanted');
    return `?${query}`;
  }
  if (resourceId === 'facility-config' && handle?.startsWith('family-0d-'))
    return '?view=scenes&sceneTab=investigation#scene-investigation-parameters';
  if (resourceId.startsWith('ui-facility:') && fallback)
    return `${fallback.split('#')[0]}#facility-parameters-${resourceId.replaceAll(':', '-')}`;
  return fallback;
}

function sceneConfigurationStays(request, object) {
  if (object.boundInteraction) return false;
  return request.existingInspector || request.inPlace || [TILE_ACTION_OWNER, WORLD_TIDE_OWNER].includes(request.resourceId)
    || request.resourceId === `scene:${hex$2(object.sceneId)}`;
}

// @editor-module 场景对象与交互承载页面共用双向入口。

let mountedUsers = null;

function destinationOwnerKey(page) {
  if (!supportsSceneDestinationPage(page.view)) return null;
  const fields = {
    interfaceui: ['interfacePage'], shops: ['shopFamily', 'shopTab', 'recordId'],
    wanted: ['wantedTargetIndex', 'wantedTargetSide'], 'wanted-ui': ['wantedTargetIndex', 'wantedTargetSide'],
    scenes: ['sceneSlug'], text: ['textRegion', 'textSearch'],
    actors: ['actorVisualTab', 'storyKind', 'recordId'], vehicles: ['recordId'],
    audio: ['recordId'], items: ['recordId'], equipment: ['recordId'], 'battle-test': ['recordId', 'resourceId'],
    metatiles: ['metatileRecordId'], vending: ['vendingPreviewFamily', 'vendingPreviewConfiguration'],
    jukebox: ['jukeboxPreviewConfiguration'],
  };
  if (page.view === 'interfaceui' && page.interfacePage === 'interaction-service') return null;
  if (['items', 'equipment', 'battle-test', 'vehicles', 'audio', 'actors'].includes(page.view)
      && page.recordId == null) return null;
  if (page.view === 'actors' && page.actorVisualTab !== 'story') return null;
  if (page.view === 'scenes' && (!page.sceneSlug || page.sceneLogicSelection)) return null;
  if (page.view === 'text' && (page.textMode !== 'records' || !String(page.textSearch || '').startsWith('record:'))) return null;
  if (page.view === 'shops' && page.shopTab !== 'buyer'
      && (page.shopTab !== 'config' || page.recordId == null)) return null;
  if (page.view === 'shops' && Number(page.shopFamily) === 15) return null;
  if (page.view === 'metatiles' && !page.metatileRecordId) return null;
  if (storyPlaybackView(page.view) && !page.storySequenceId) return null;
  return JSON.stringify([page.view, ...(storyPlaybackView(page.view) ? ['storySequenceId'] : fields[page.view] || [])
    .map(field => page[field] ?? null)]);
}

function sceneDestinationUsersMarkup(page) {
  return destinationOwnerKey(page) === null ? ''
    : '<section class="panel" data-scene-destination-users>'
      + ownerReferenceListMarkup('使用此内容的场景对象') + '</section>';
}

function bindSceneDestinationUsers(root, page, database, onLoaded) {
  const key = destinationOwnerKey(page);
  const host = root.querySelector('[data-scene-destination-users]');
  if (!host || key === null) {mountedUsers = null; return;}
  if (mountedUsers?.key === key) {
    mountedUsers.page = {...page};
    host.replaceWith(mountedUsers.host);
    root.querySelector('[data-metatile-reference-header]')?.append(mountedUsers.host);
    return;
  }
  const mounted = {key, host, page: {...page}};
  mountedUsers = mounted;
  root.querySelector('[data-metatile-reference-header]')?.append(host);
  bindOwnerReferenceList(host.querySelector('details'), async () => {
    const ownerPage = {...mounted.page};
    if (ownerPage.view === 'shops') ownerPage.shopPreviewRecord = Number.parseInt(String(ownerPage.recordId).split(':').at(-1), 16);
    const html = await renderSceneDestinationUsers(ownerPage, database);
    const body = document.createElement('template');
    body.innerHTML = html;
    const count = body.content.querySelectorAll('[data-scene-destination-user]').length;
    host.querySelector('summary').textContent = `使用此内容的场景对象 · ${count}`;
    return html;
  }, onLoaded);
}

function destinationLabel(target) {
  return target.record ? currentTextReference(target.record).label || '无可读文字' : target.label;
}

function sceneInterfacePreviewLinks(object, context) {
  if (!['actor', 'investigation', 'investigation-special', 'investigation-tile', 'elevator'].includes(object.kind)) return '';
  const {targets} = sceneInteractionDestinations(object, context);
  const links = new Map();
  const x = Number(object.pose?.x ?? object.record.x), y = Number(object.pose?.y ?? object.record.y);
  if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return '';
  for (const target of targets) {
    if (!target.application || !['shops', 'interfaceui', 'jukebox', 'vending', 'frograce',
      'teleport', 'computercontroller', 'wanted-ui'].includes(target.query.view)) continue;
    const query = new URLSearchParams(target.query);
    if (target.serviceFragment) query.set('interfaceEntry', target.serviceFragment);
    if (target.query.view === 'shops' && target.query.shopTab !== 'buyer') query.set('shopTab', 'ui');
    if (['jukebox', 'vending', 'frograce', 'teleport', 'computercontroller'].includes(target.query.view))
      query.set('facility', 'ui');
    query.set('previewScene', object.sceneId);
    query.set('previewPoint', `${x},${y}`);
    query.set('previewCommand', target.application.command);
    query.set('previewArgument', target.application.instance);
    if (object.kind === 'investigation') query.set('previewEntryHandle',
      `scene:${Number(object.sceneId).toString(16).toUpperCase().padStart(2, '0')}:investigation:${Number(object.record.id).toString(16).toUpperCase().padStart(2, '0')}`);
    const href = `?${query}`;
    links.set(href, `<p class="scene-content-note"><a class="editor-inline-link" data-scene-interface-preview
      href="${esc(href)}"${object.kind === 'elevator'
        ? ` title="${esc(target.label)} · 预览" aria-label="${esc(target.label)} · 预览"` : ''}>${object.kind === 'elevator'
        ? '↗' : `${esc(target.label)} · 预览 ↗`}</a></p>`);
  }
  return [...links.values()].join('');
}

function renderSceneDestinationLinks(object, context) {
  const result = sceneInteractionDestinations(object, context);
  const texts = new Set(sceneOwnedInteractionConfigurations(object, context).requests
    .filter(request => request.resourceId === 'text-record').map(request => request.handle));
  return renderSceneInvestigationResolution(object, context)
    + sceneInterfacePreviewLinks(object, context)
    + (result.nonConfigurable || []).filter(row => !result.targets.some(target => target.fixedBehavior === row.reason))
      .map(row => `<p class="scene-content-note" data-scene-fixed-behavior="${esc(row.reason)}">${esc(row.label)}</p>`).join('')
    + result.targets.filter(target => !target.external && !target.effectiveObject
      && !texts.has(target.record))
    .map(target => {
      const label = `${target.condition && !target.query.sceneObject ? `${esc(target.condition)} · ` : ''}${esc(destinationLabel(target))} ↗`;
      const link = target.query.resource?.startsWith('encounter-formation:')
        ? `<a class="editor-inline-link" data-resource-target="${esc(target.query.resource)}" href="${esc(target.href)}">${label}</a>`
        : `<a class="editor-inline-link" data-scene-destination="${esc(target.href)}" href="${esc(target.href)}"${target.record ? ` title="${esc(target.record)}"` : ''}>${label}</a>`;
      return `<p class="scene-content-note"${target.fixedBehavior ? ` data-scene-fixed-behavior="${esc(target.fixedBehavior)}"` : ''}>${link}</p>`;
    }).join('');
}

function renderSceneInvestigationResolution(object, context) {
  const resolution = sceneInvestigationResolution(object, context);
  if (!resolution) return '';
  return `<div data-scene-investigation-resolution>${resolution.branches.map(({condition, effective}) =>
    `<p class="scene-content-note">${effective.kind === object.kind && Number(effective.record.id) === Number(object.record.id)
      ? `${esc(condition)}本对象生效` : `${esc(condition)}由 <a class="editor-inline-link"
      data-scene-destination="${esc(sceneObjectHref(effective))}"
      href="${esc(sceneObjectHref(effective))}">${esc(effective.uid)} 接管 ↗</a>`}</p>`).join('')}</div>`;
}

function sceneObjectHref(object) {
  return `?${new URLSearchParams({view: 'scenes', scene: object.scene, sceneMode: 'logic', sceneObject: object.key})}`;
}

function consolidateSceneDestinationLinks(inspector) {
  if (!inspector) return;
  const key = link => {
    const url = new URL(link.href);
    url.searchParams.sort();
    return url.pathname + url.search + (/^#(?:scene-.*-parameters|facility-parameters-)/u.test(url.hash) ? url.hash : '');
  };
  for (const link of inspector.querySelectorAll('.scene-content-note > [data-scene-destination]')) {
    if (!link.isConnected) continue;
    const existing = [...inspector.querySelectorAll('a[href]')].find(candidate =>
      candidate !== link && key(candidate) === key(link));
    if (existing) {link.parentElement.remove(); continue;}
    const query = new URL(link.href).searchParams;
    if (query.get('view') !== 'scenes' || !query.has('scene') || query.has('sceneObject')) continue;
    const destination = [...inspector.querySelectorAll('[data-field-object-coordinate]')].find(host =>
      JSON.parse(host.dataset.fieldObjectCoordinate)[1] === 'destination_scene_id');
    const positionLink = destination?.querySelector('a.scene-position-detail-link');
    if (positionLink && new URL(positionLink.href).searchParams.get('scene') === query.get('scene')) {
      positionLink.title = link.textContent.trim();
      positionLink.dataset.sceneDestination = link.dataset.sceneDestination;
      link.parentElement.remove();
    }
  }
  for (const link of inspector.querySelectorAll('[data-scene-interaction-configuration] > p > [data-scene-destination]')) {
    const existing = [...inspector.querySelectorAll('a[href]')].find(candidate =>
      candidate !== link && key(candidate) === key(link));
    if (existing) link.parentElement.remove();
  }
}

function renderSceneDestinationUserRows(usages) {
  if (!usages.length) return '';
  return `<div class="table-wrap"><table><thead><tr><th>对象</th><th>坐标</th><th>使用内容</th></tr></thead><tbody>${usages.map(({object, targets}) =>
    `<tr id="${esc(sceneUsageAnchor(object.scene, object.key))}" data-scene-destination-user="${esc(`${object.scene}/${object.key}`)}">
      <td><a class="editor-inline-link" href="${esc(sceneObjectHref(object))}">${esc(object.uid)} · ${esc(object.sceneName || object.scene)}</a></td>
      <td>${esc(object.pose?.x ?? object.record.x ?? object.record.trigger_x ?? '—')}, ${esc(object.pose?.y ?? object.record.y ?? object.record.trigger_y ?? '—')}</td>
      <td>${targets.map(target => {
        const label = `${esc(destinationLabel(target))}${target.instance == null ? '' : ` · 实例 ${esc(target.instance)}`}`;
        const link = target.query.resource?.startsWith('encounter-formation:')
          ? `<a class="editor-inline-link" data-resource-target="${esc(target.query.resource)}" href="${esc(target.href)}">${label}</a>`
          : `<a class="editor-inline-link" href="${esc(target.href)}"${target.record ? ` title="${esc(target.record)}"` : ''}>${label}</a>`;
        return `${link}${target.condition ? ` · ${esc(target.condition)}` : ''}${target.effectiveObject ? ` · ${esc(target.effectiveObject)}` : ''}`;
      }).join(' · ')}</td></tr>`).join('')}
    </tbody></table></div>`;
}

async function renderSceneDestinationUsers(page, database) {
  const usages = await withCurrentOwnerRecord({kind: "scene-destination", page}, database,
    () => currentOwnerReferenceImpact());
  return renderSceneDestinationUserRows(usages);
}

// @editor-module 控制器、受控对象与存档事件位的往返链接。

function link$1(href, label, role) {
  return href ? `<a class="editor-inline-link" data-controller-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>` : esc(label);
}

function controllerTargetsMarkup(instance, project) {
  const control = instance.switch;
  if (!control) return '';
  const targets = (control.targets || []).map(target => {
    const points = target.cells || (target.x == null ? [] : [{x: target.x, y: target.y}]);
    return `<p>${esc(target.label)} · ${points.length ? points.map(point => link$1(
      controllerSceneHref(target.scene_id, project, {object: target.scene_object,
        point: [point.x, point.y], mode: target.kind === 'map-replacement' ? 'tiles' : 'logic'}),
      `场景 $${Number(target.scene_id).toString(16).toUpperCase()} (${point.x}, ${point.y})`, 'target')).join(' · ')
      : link$1(controllerSceneHref(target.scene_id, project), controllerTargetLabel(target), 'target')}
      ${target.target_scene_id == null ? '' : ` → ${link$1(controllerSceneHref(target.target_scene_id, project),
        `场景 $${Number(target.target_scene_id).toString(16).toUpperCase()}`, 'target')}`}
      ${target.event_flag_reference ? ` · ${eventFlagReferenceMarkup(target.event_flag_reference, {attributes: 'data-controller-link="flag"'})}` : ''}</p>`;
  }).join('');
  const flag = controllerFlagId(control.event_flag_reference);
  return `${targets}<p>${eventFlagReferenceMarkup(flag, {attributes: 'data-controller-link="flag"'})}
    · ${control.password_required ? '正确密码置位'
      : '置位 / 清位 · 可反复切换'}</p>
    ${control.failure_flag_reference ? `<p>密码错误：${eventFlagReferenceMarkup(control.failure_flag_reference, {attributes: 'data-controller-link="flag"'})}</p>` : ''}`;
}

function controllerBacklink(instance, project) {
  return link$1(controllerHref(instance, project), `控制器 ${instance.scene_object_uid} · (${instance.x}, ${instance.y})`, 'controller');
}

function sceneControllerMarkup(object, project, sceneLogic) {
  return controllerAt(object, project, sceneLogic).map(instance => `<div data-controller-chain>
    <p>${controllerBacklink(instance, project)} → 受控对象</p>${controllerTargetsMarkup(instance, project)}</div>`).join('');
}

function controlledObjectMarkup(sceneId, selection, project) {
  return ownerReferenceListMarkup('控制器',
    `data-controlled-object-users="${esc(JSON.stringify({kind: 'controlled-object', sceneId, selection}))}"`);
}

function bindControlledObjectUsers(root, project, onLoaded) {
  root.querySelectorAll('[data-controlled-object-users]').forEach(host =>
    bindOwnerReferenceList(host, () => withCurrentOwnerRecord(
      JSON.parse(host.dataset.controlledObjectUsers), project,
      () => currentOwnerReferenceImpact()).map(instance =>
      `<p data-controlled-object>${controllerBacklink(instance, project)}</p>`).join(''), onLoaded));
}

// @editor-module 实体声明：句柄 + 切面指向字段对象，引用方不再各自解析实体数据。
//
// 权威声明是 `project/config/metalmaxcn.entities.json`（与引用图并列，人工维护）。
// 发布包包含声明引用的关系正文，证据路径只作出处与包内查找键。
// 本模块不导入 DOM、页面状态与界面模块：切面解析是纯函数，取数经注入的数据库。
//
// 切面自带范围：`records` 声明具体记录（可再限定字段名），`fragments` 声明具体片段。
// 取数只回声明范围内的字段，缺记录、缺片段或缺字段名即报错，不退回整资源。

const ENTITY_DECLARATION_SCHEMA = "metalmaxcn.entities";

const ENTITY_SOURCES = Object.freeze([
  siteUrl("package/metadata/entities.json"),
]);

const RUNTIME_KINDS = Object.freeze(["records", "fragments"]);
const FIELD_PROVIDER_IDS = Object.freeze(["save-context"]);
const INDEX_SLOT = "{index}";
const INDEX10_SLOT = "{index10}";
const TAG_SLOT = "{tag}";
const SLOTS = Object.freeze([INDEX_SLOT, INDEX10_SLOT, TAG_SLOT]);
const PREVIEW_SOURCES = Object.freeze({
  "monster.figure": Object.freeze(["monster-visual-layout", "monster-graphic"]),
  "vehicle.visual": Object.freeze(["vehicle-visual-selector", "actor-visual",
    "project.visuals", "weapon-attack-parameter", "ui-vehicle-status"]),
  "vehicle.battle": Object.freeze(["character-initial-record", "monster", "battle-test-point",
    "battle-item-service", "enemy-action", "weapon-attack-parameter"]),
});

function previewSources(target, previewId, catalog = null) {
  const entityClass = catalog ? catalog.instance(target).entityClass : String(target).split(":")[0];
  if (!previewId.startsWith(`${entityClass}.`) || !PREVIEW_SOURCES[previewId])
    throw new TypeError(`未声明的实体预览输入：${target}/${previewId}`);
  return PREVIEW_SOURCES[previewId];
}

/** 同步渲染从已装载的当前正文取预览输入。 */
function entityPeekPreviewInput(database, target, previewId, resourceId) {
  if (!previewSources(target, previewId).includes(resourceId))
    throw new TypeError(`实体预览没有输入：${previewId}/${resourceId}`);
  const value = database.peekDocument(resourceId, null);
  if (!value) throw new TypeError(`实体预览缺少当前正文：${resourceId}`);
  return value;
}

async function previewDocument(database, resourceId) {
  const documentValue = resourceId === "vehicle-visual-selector"
    ? (await database.readResource(resourceId))?.value?.document
    : resourceId === "monster-graphic"
      || resourceId === "ui-vehicle-status" || resourceId === "battle-item-service"
      ? await database.getResourceDocument(resourceId, null)
      : await database.getDocument(resourceId, null);
  if (!documentValue && resourceId !== "ui-vehicle-status")
    throw new TypeError(`实体预览缺少当前正文：${resourceId}`);
  return documentValue;
}

async function entityPreviewInput(database, target, previewId, resourceId,
  {catalog = null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  if (!previewSources(target, previewId, directory).includes(resourceId))
    throw new TypeError(`实体预览没有输入：${previewId}/${resourceId}`);
  return previewDocument(database, resourceId);
}

/** 按当前正文生成列表与记录页的只读记录，不保存展示副本。 */
async function entityDisplayRecords(database, entityClass,
  {catalog = null, project = null, labelFor = () => null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const handles = new Set(directory.instances(entityClass));
  if (entityClass === "monster") {
    const records = await database.getAll("monster", []);
    return Object.freeze(records.map(record => {
      const entityHandle = directory.handleFor("monster", Number(record.id));
      if (!handles.has(entityHandle)) throw new TypeError(`未声明的怪物展示记录：${entityHandle}`);
      return Object.freeze({...record, entityHandle,
        displayName: labelFor(entityHandle, record.name || null)});
    }));
  }
  if (entityClass === "vehicle") {
    const source = project?.game_data?.vehicles;
    if (!source) throw new TypeError("战车展示记录缺少当前项目正文");
    const views = new Map();
    for (const [viewId, view] of Object.entries(source.views || {}))
      for (const id of view.preset_ids || []) {
        const key = Number(id);
        if (!views.has(key)) views.set(key, new Set());
        views.get(key).add(viewId);
      }
    return Object.freeze((source.presets || []).map(record => {
      const entityHandle = directory.handleFor("vehicle", Number(record.preset_id));
      if (!handles.has(entityHandle)) throw new TypeError(`未声明的战车展示记录：${entityHandle}`);
      const chassisName = labelFor(`item:${Number(record.chassis_id).toString(16)
        .toUpperCase().padStart(2, "0")}`, record.chassis_name_hint || "未命名底盘");
      const rentalName = record.rental_name?.list_label
        || record.rental_name?.value || null;
      return Object.freeze({...record, entityHandle, chassisName,
        rentalName, displayName: rentalName || chassisName,
        displayViews: Object.freeze([...(views.get(Number(record.preset_id)) || [])])});
    }));
  }
  throw new TypeError(`实体类没有展示记录：${entityClass}`);
}

/** 跨实体预览只取当前输入；组合与绘制仍由各资源的 owner 负责。 */
async function entityPreviewInputs(database, target, previewId,
  {catalog = null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const entries = await Promise.all(previewSources(target, previewId, directory)
    .map(async resourceId => [resourceId, await previewDocument(database, resourceId)]));
  return Object.freeze(Object.fromEntries(entries));
}

function text(value, what) {
  if (typeof value !== "string" || !value) throw new TypeError(`${what} 缺少文本`);
  return value;
}

function integer$1(value, what, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new TypeError(`${what} 无效：${value}`);
  return value;
}

function textList(value, what) {
  if (!Array.isArray(value) || !value.length) throw new TypeError(`${what} 声明为空`);
  const seen = new Set();
  return Object.freeze(value.map(item => {
    const name = text(item, what);
    if (seen.has(name)) throw new TypeError(`${what} 重复：${name}`);
    seen.add(name);
    return name;
  }));
}

/** 索引集合：count（自 0 起）、index_ranges（多段）与 index_values（显式）三选一。 */
function readIndexValues(entityClass, value) {
  const forms = ["count", "index_ranges", "index_values"].filter(name => value[name] !== undefined);
  if (forms.length !== 1)
    throw new TypeError(`实体 ${entityClass} 的索引集合只给 count／index_ranges／index_values 之一`);
  const index = raw => integer$1(raw, `实体 ${entityClass} 索引`, 0, 0xffffff);
  if (forms[0] === "count")
    return Array.from(
      {length: integer$1(value.count, `实体 ${entityClass} 实例数`, 1, 0x10000)},
      (_, offset) => offset);
  if (forms[0] === "index_values") {
    if (!Array.isArray(value.index_values) || !value.index_values.length)
      throw new TypeError(`实体 ${entityClass} 的 index_values 声明为空`);
    return value.index_values.map(index);
  }
  if (!Array.isArray(value.index_ranges) || !value.index_ranges.length)
    throw new TypeError(`实体 ${entityClass} 的 index_ranges 声明为空`);
  return value.index_ranges.flatMap(range => {
    if (!range || Object.keys(range).sort().join() !== "count,start")
      throw new TypeError(`实体 ${entityClass} 的 index_ranges 条目必须是 {start, count}`);
    const start = index(range.start);
    const count = integer$1(range.count, `实体 ${entityClass} 索引段长度`, 1, 0x10000);
    return Array.from({length: count}, (_, offset) => start + offset);
  });
}

function formatIndex(identity, index, what) {
  if (!Number.isInteger(index) || !identity.indexSet.has(index))
    throw new RangeError(`${what} 序号越界：${index}`);
  return index.toString(identity.indexRadix).toUpperCase()
    .padStart(identity.indexWidth, "0");
}

function readIndexedIdentity(entityClass, value, what) {
  const indexRadix = integer$1(value.index_radix, `${what}序号进制`, 2, 36);
  const indexWidth = integer$1(value.index_width, `${what}序号宽度`, 1, 8);
  const declared = readIndexValues(entityClass, value);
  const indexes = Object.freeze([...new Set(declared)].sort((left, right) => left - right));
  if (indexes.length !== declared.length)
    throw new TypeError(`${what}索引集合有重复`);
  if (indexes.length > 0x10000)
    throw new TypeError(`${what}索引集合过大：${indexes.length}`);
  const limit = indexRadix ** indexWidth;
  if (indexes.some(index => index >= limit))
    throw new TypeError(`${what}索引超出 ${indexRadix}^${indexWidth} 位宽`);
  return Object.freeze({indexRadix, indexWidth, count: indexes.length,
    indexes, indexSet: new Set(indexes)});
}

function readIdentity(entityClass, value) {
  if (value === undefined) return null;
  const prefix = text(value.resource_prefix, `实体 ${entityClass} 序号前缀`);
  if (prefix !== `${entityClass}:`)
    throw new TypeError(`实体 ${entityClass} 序号前缀必须是实体类自己的句柄空间：${prefix}`);
  const source = text(value.source, `实体 ${entityClass} 身份来源`);
  if (value.variants !== undefined) {
    if (value.published_prefix !== undefined || value.index_radix !== undefined
        || value.index_width !== undefined || ["count", "index_ranges", "index_values"]
          .some(name => value[name] !== undefined))
      throw new TypeError(`实体 ${entityClass} 的 variants 与单序号身份字段互斥`);
    if (!Array.isArray(value.variants) || !value.variants.length)
      throw new TypeError(`实体 ${entityClass} 的 variants 声明为空`);
    const tags = new Set();
    const publishedPrefixes = new Set();
    const variants = value.variants.map(raw => {
      if (!raw || typeof raw !== "object")
        throw new TypeError(`实体 ${entityClass} 的 tagged identity 条目无效`);
      const tag = text(raw.tag, `实体 ${entityClass} 身份标签`);
      if (!/^[A-Za-z0-9._-]+$/u.test(tag) || tags.has(tag))
        throw new TypeError(`实体 ${entityClass} 身份标签无效或重复：${tag}`);
      tags.add(tag);
      const indexed = readIndexedIdentity(entityClass, raw, `实体 ${entityClass} 标签 ${tag} 的`);
      const publishedPrefix = text(
        raw.published_prefix, `实体 ${entityClass} 标签 ${tag} 发布前缀`);
      if (!publishedPrefix.endsWith(":") || publishedPrefixes.has(publishedPrefix))
        throw new TypeError(`实体 ${entityClass} 标签 ${tag} 发布前缀无效或重复：${publishedPrefix}`);
      publishedPrefixes.add(publishedPrefix);
      return Object.freeze({tag, publishedPrefix, ...indexed});
    });
    const count = variants.reduce((total, variant) => total + variant.count, 0);
    if (count > 0x10000) throw new TypeError(`实体 ${entityClass} 复合身份集合过大：${count}`);
    const identity = Object.freeze({kind: "tagged", source, resourcePrefix: prefix,
      count, variants: Object.freeze(variants), variantByTag: new Map(variants.map(item => [item.tag, item]))});
    const instances = value.instances;
    if (instances !== undefined) {
      if (!Array.isArray(instances) || !instances.length)
        throw new TypeError(`实体 ${entityClass} 实例清单无效`);
      const expected = variants.flatMap(variant => variant.indexes.map(index =>
        `${entityClass}:${variant.tag}:${formatIndex(
          variant, index, `实体 ${entityClass} 标签 ${variant.tag}`)}`));
      if (JSON.stringify(instances) !== JSON.stringify(expected))
        throw new TypeError(`实体 ${entityClass} 实例清单与发布复合身份不符：${instances.join("、")}`);
    }
    return identity;
  }
  // 发布记录的身份前缀可以不同（如实体类 actor_appearance 的发布记录是 actor-type:XX）：
  // 实体句柄只属于实体，字段对象名不拿来当实体类名。
  const publishedPrefix = value.published_prefix === undefined
    ? prefix : text(value.published_prefix, `实体 ${entityClass} 发布前缀`);
  const indexed = readIndexedIdentity(entityClass, value, `实体 ${entityClass} 的`);
  const identity = Object.freeze({
    kind: "indexed",
    source,
    resourcePrefix: prefix,
    publishedPrefix,
    ...indexed,
  });
  const instances = value.instances;
  if (instances !== undefined) {
    if (!Array.isArray(instances) || !instances.length)
      throw new TypeError(`实体 ${entityClass} 实例清单无效`);
    const expected = identity.indexes.map(index =>
      `${entityClass}:${formatIndex(identity, index, `实体 ${entityClass}`)}`);
    if (JSON.stringify(instances) !== JSON.stringify(expected))
      throw new TypeError(`实体 ${entityClass} 实例清单与发布身份不符：${instances.join("、")}`);
  }
  return identity;
}

function readRuntime(entityClass, facetId, value) {
  if (value === undefined) return null;
  const what = `切面 ${entityClass}.${facetId}`;
  const kind = value.kind;
  if (!RUNTIME_KINDS.includes(kind))
    throw new TypeError(`${what} 运行期解析种类无效：${kind}`);
  const resourceId = text(value.resource_id, `${what} 运行期字段对象`);
  const providerId = value.provider === undefined ? null
    : text(value.provider, `${what} 字段提供器`);
  if (providerId !== null && !FIELD_PROVIDER_IDS.includes(providerId))
    throw new TypeError(`${what} 字段提供器无效：${providerId}`);
  const identityTags = value.identity_tags === undefined ? null
    : textList(value.identity_tags, `${what} identity_tags`);
  const also = value.also === undefined ? [] : value.also;
  if (!Array.isArray(also) || also.some(item => !item || typeof item !== "object"
      || typeof item.resource_id !== "string" || !item.resource_id
      || typeof item.entity_handle !== "string" || !item.entity_handle
      || !Array.isArray(item.fields) || !item.fields.length
      || item.fields.some(name => typeof name !== "string" || !name)))
    throw new TypeError(`${what} 的附加字段声明无效`);
  // 资源名与引用图节点名不一致时写明对应节点（校验两端都要存在，写错要拒）。
  const resourceNode = value.resource_node === undefined ? null
    : text(value.resource_node, `${what} 运行期资源节点`);
  if (kind === "fragments") {
    if (value.records !== undefined || value.from !== undefined)
      throw new TypeError(`${what} 片段切面不得带 records／from`);
    if (also.length) throw new TypeError(`${what} 片段切面不得带附加字段`);
    return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags,
      fragments: textList(value.fragments, `${what} fragments`)});
  }
  if (value.fragments !== undefined) throw new TypeError(`${what} 记录切面不得带 fragments`);
  const fields = value.fields === undefined ? null : textList(value.fields, `${what} fields`);
  if (value.from !== undefined) {
    if (value.records !== undefined) throw new TypeError(`${what} records 与 from 只能给一个`);
    return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags, fields,
      also: Object.freeze(also.map(item => Object.freeze({resourceId: item.resource_id,
        entityHandle: item.entity_handle, fields: Object.freeze([...item.fields])}))),
      from: readRuntimeSource(entityClass, facetId, value.from)});
  }
  const declared = value.records;
  if (!Array.isArray(declared) || !declared.length) throw new TypeError(`${what} records 声明为空`);
  const seen = new Set();
  const records = declared.map(record => {
    if (!record || typeof record !== "object") throw new TypeError(`${what} 记录声明无效`);
    const handle = text(record.entity_handle, `${what} 记录句柄`);
    if (!handle.startsWith(`${resourceId}:`))
      throw new TypeError(`${what} 记录句柄不属于 ${resourceId}：${handle}`);
    if ([...handle.matchAll(/\{([^}]*)\}/gu)].some(match => !SLOTS.includes(`{${match[1]}}`)))
      throw new TypeError(`${what} 记录句柄占位符无效：${handle}`);
    if (seen.has(handle)) throw new TypeError(`${what} 记录句柄重复：${handle}`);
    seen.add(handle);
    return Object.freeze({entityHandle: handle,
      fields: record.fields === undefined ? null : textList(record.fields, `${what} 记录字段`)});
  });
  return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags, fields,
    also: Object.freeze(also.map(item => Object.freeze({resourceId: item.resource_id,
      entityHandle: item.entity_handle, fields: Object.freeze([...item.fields])}))),
    records: Object.freeze(records)});
}

/** 记录由实例正文现查时的来源声明：正文资源 + 路径 + 句柄模板，或按字段值挑这个资源自己的记录。 */
function readRuntimeSource(entityClass, facetId, value) {
  const what = `切面 ${entityClass}.${facetId} 的 from`;
  if (!value || typeof value !== "object") throw new TypeError(`${what} 声明无效`);
  if (value.relation !== undefined) {
    // 已发布引用解析：声明只指向证据里的那条解析，对应关系本身不许在声明里重写。
    for (const key of ["path", "select", "pick", "handle", "handles", "document_path", "resource_id"])
      if (value[key] !== undefined)
        throw new TypeError(`${what} 的 relation 与其他形态互斥`);
    const relation = value.relation;
    if (!relation || typeof relation !== "object") throw new TypeError(`${what} 的 relation 声明无效`);
    const location = text(relation.location, `${what} 的 relation.location`);
    if (!location.startsWith("project/"))
      throw new TypeError(`${what} 的 relation.location 必须是仓库相对路径：${location}`);
    if (!Array.isArray(relation.path) || !relation.path.length
        || relation.path.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 的 relation.path 声明无效`);
    const sourceRoot = relation.source_root;
    if (sourceRoot !== undefined && (!Array.isArray(sourceRoot)
        || sourceRoot.some(step => typeof step !== "string" || !step)))
      throw new TypeError(`${what} 的 relation.source_root 声明无效`);
    const fieldHandleTemplate = relation.field_handle_template === undefined ? null
      : text(relation.field_handle_template, `${what} 的 relation.field_handle_template`);
    if (fieldHandleTemplate !== null && !fieldHandleTemplate.includes("{"))
      throw new TypeError(`${what} 的 relation.field_handle_template 缺少占位符`);
    const fieldHandleList = relation.field_handle_list === undefined ? null
      : text(relation.field_handle_list, `${what} 的 relation.field_handle_list`);
    if (fieldHandleList !== null && fieldHandleTemplate !== null)
      throw new TypeError(`${what} 的 relation 字段句柄列表与模板互斥`);
    let sourceField = null;
    if (relation.source_field !== undefined) {
      const raw = relation.source_field;
      if (!raw || typeof raw !== "object")
        throw new TypeError(`${what} 的 relation.source_field 声明无效`);
      const handleTemplate = text(raw.handle_template,
        `${what} 的 relation.source_field.handle_template`);
      if (!handleTemplate.includes("{"))
        throw new TypeError(`${what} 的 relation.source_field.handle_template 缺少占位符`);
      sourceField = Object.freeze({
        resourceId: text(raw.resource_id, `${what} 的 relation.source_field.resource_id`),
        handleTemplate,
        field: text(raw.field, `${what} 的 relation.source_field.field`),
      });
    }
    return Object.freeze({relation: Object.freeze({location, path: Object.freeze([...relation.path]),
      sourceRoot: Object.freeze(sourceRoot === undefined ? [] : [...sourceRoot]),
      fieldHandleTemplate, fieldHandleList, sourceField}),
      resourceId: null, path: null, pick: null, handles: null, documentPath: null,
      handle: null, select: null, field: null, where: null, condition: null});
  }
  const hasPath = value.path !== undefined || value.resource_id !== undefined;
  const hasSelect = value.select !== undefined;
  if (hasPath === hasSelect)
    throw new TypeError(`${what} 只能给「正文资源 + path + handle」「select」或「正文取值 + handles」之一`);
  if (value.pick !== undefined) {
    if (!hasPath) throw new TypeError(`${what} 的正文取值形态不得同时给 select`);
    if (!Array.isArray(value.path) || !value.path.length
        || value.path.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 缺少 path`);
    if (!Array.isArray(value.pick) || !value.pick.length
        || value.pick.some(index => !Number.isInteger(index) || index < 0))
      throw new TypeError(`${what} 的 pick 声明无效`);
    if (!Array.isArray(value.handles) || !value.handles.length)
      throw new TypeError(`${what} 的 handles 声明为空`);
    const handles = value.handles.map(item => text(item, `${what} 的 handles`));
    if (handles.some(handle => !handle.includes("{value")))
      throw new TypeError(`${what} 的 handles 模板缺少 {value}：${handles.join("、")}`);
    return Object.freeze({
      resourceId: text(value.resource_id, `${what} 的正文资源`),
      path: Object.freeze([...value.path]),
      pick: Object.freeze([...value.pick]),
      handles: Object.freeze(handles),
      relation: null, handle: null, select: null, field: null, where: null, condition: null,
    });
  }
  if (hasSelect) {
    const mapped = value.field !== undefined || value.handle !== undefined;
    if (mapped && (value.field === undefined || value.handle === undefined))
      throw new TypeError(`${what} 按字段值取记录时要同时给 field 与 handle`);
    const handle = mapped ? text(value.handle, `${what} 的 handle`) : null;
    if (mapped && !handle.includes("{value"))
      throw new TypeError(`${what} 的 handle 模板缺少 {value} 占位符：${handle}`);
    return Object.freeze({select: readRuntimeSelect(what, value.select),
      field: mapped ? text(value.field, `${what} 的 field`) : null, handle,
      relation: null, pick: null, handles: null, where: null, condition: null});
  }
  if (!Array.isArray(value.path) || !value.path.length
      || value.path.some(step => typeof step !== "string" || !step))
    throw new TypeError(`${what} 缺少 path`);
  // 目标记录也可以按字段对象自己发布的正文位置（documentPath）找：句柄推不出来时用这一式。
  const documentPath = value.document_path;
  if (documentPath !== undefined) {
    if (value.handle !== undefined || value.handles !== undefined)
      throw new TypeError(`${what} 的 document_path 与 handle 只能给一个`);
    if (!Array.isArray(documentPath) || !documentPath.length
        || documentPath.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 的 document_path 声明无效`);
  }
  let within = null;
  if (value.within !== undefined) {
    if (documentPath !== undefined || value.pick !== undefined)
      throw new TypeError(`${what} 的 within 只能与正文记录形态一起给`);
    within = readRuntimeWithin(what, value.within);
  }
  const templates = (documentPath !== undefined || within !== null) ? null
    : (value.handles === undefined ? [text(value.handle, `${what} 句柄模板`)] : value.handles);
  if (templates !== null && (!Array.isArray(templates) || !templates.length
      || templates.some(item => typeof item !== "string" || !item || !item.includes("{"))))
    throw new TypeError(`${what} 句柄模板至少要有一个含占位符的模板`);
  const handle = templates === null ? null : templates[0];
  let where = null;
  if (value.where !== undefined) {
    if (!value.where || typeof value.where !== "object")
      throw new TypeError(`${what} 的 where 声明无效`);
    const kinds = ["equals", "contains"].filter(name => value.where[name] !== undefined);
    if (kinds.length !== 1)
      throw new TypeError(`${what} 的 where 只能给 equals 或 contains 之一`);
    where = Object.freeze({
      field: text(value.where.field, `${what} 的 where.field`),
      kind: kinds[0],
      value: text(value.where[kinds[0]], `${what} 的 where.${kinds[0]}`),
    });
  }
  let condition = null;
  if (value.condition !== undefined) {
    if (!value.condition || typeof value.condition !== "object")
      throw new TypeError(`${what} 的 condition 声明无效`);
    const kinds = ["equals", "starts_with"].filter(name => value.condition[name] !== undefined);
    if (kinds.length !== 1)
      throw new TypeError(`${what} 的 condition 只能给 equals 或 starts_with 之一`);
    condition = Object.freeze({field: text(value.condition.field, `${what} 的 condition.field`),
      kind: kinds[0], value: text(value.condition[kinds[0]], `${what} 的 condition.${kinds[0]}`)});
  }
  return Object.freeze({
    resourceId: text(value.resource_id, `${what} 的正文资源`),
    path: Object.freeze([...value.path]),
    handle,
    handles: templates === null ? null : Object.freeze([...templates]),
    documentPath: documentPath === undefined ? null : Object.freeze([...documentPath]),
    within,
    relation: null,
    select: null,
    field: null,
    pick: null,
    where, condition,
  });
}

/** 在字段对象自己的记录里按某个字段的值挑：`select.field` 等于 `select.equals` 的那几条。 */
function readRuntimeSelect(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 select 声明无效`);
  return Object.freeze({
    field: text(value.field, `${what} 的 select.field`),
    equals: text(value.equals, `${what} 的 select.equals`),
  });
}

function readFacet(entityClass, facetId, value) {
  const what = `切面 ${entityClass}.${facetId}`;
  if (!value || typeof value !== "object") throw new TypeError(`${what} 声明无效`);
  return Object.freeze({
    id: facetId,
    label: text(value.label, `${what} 标签`),
    fieldObject: text(value.field_object, `${what} 字段对象`),
    page: text(value.page, `${what} 承载页面`),
    recordScope: text(value.record_scope, `${what} 记录范围`),
    runtime: readRuntime(entityClass, facetId, value.runtime),
  });
}

function readEntityClass(entityClass, value) {
  if (!value || typeof value !== "object") throw new TypeError(`实体类 ${entityClass} 声明无效`);
  const declared = value.facets;
  if (!declared || typeof declared !== "object" || !Object.keys(declared).length)
    throw new TypeError(`实体类 ${entityClass} 没有切面`);
  const identity = readIdentity(entityClass, value.identity);
  const facets = {};
  for (const [facetId, facet] of Object.entries(declared))
    facets[facetId] = readFacet(entityClass, facetId, facet);
  return Object.freeze({
    id: entityClass,
    label: text(value.label, `实体类 ${entityClass} 标签`),
    primaryPage: text(value.primary_page, `实体类 ${entityClass} 承载页面`),
    identityScope: text(value.identity_scope, `实体类 ${entityClass} 身份范围`),
    identity,
    facets: Object.freeze(facets),
  });
}

/** 记录句柄占位符：`{index}` 用发布序号文本，`{index10}` 用十进制序号，`{tag}` 用复合身份标签。 */
function substituteSlots(handle, index, indexText, tag = null) {
  if (handle.includes(TAG_SLOT) && tag === null)
    throw new TypeError(`非复合实体身份不能使用 ${TAG_SLOT}：${handle}`);
  return handle.split(INDEX_SLOT).join(indexText).split(INDEX10_SLOT).join(String(index))
    .split(TAG_SLOT).join(tag ?? "");
}

/** 记录字段占位符：`{field}` 取原文，`{field:hexN}` 取 N 位大写十六进制。 */
function substituteRecordSlots(template, record, index, indexText, tag = null) {
  return substituteSlots(template, index, indexText, tag).replace(
    /\{([A-Za-z0-9_.]+)(?::(hex|dec)(\d+)|:(tail))?\}/gu, (match, field, radix, width, tail) => {
      // 字段名可以走点号取嵌套值（`{name_reference.node_id}`）。
      const value = field.split(".").reduce((node, step) => node?.[step], record);
      if (value === undefined || value === null)
        throw new TypeError(`实体切面来源记录缺少 ${field}：${JSON.stringify(record)}`);
      // `:tail` 取已发布句柄的最后一段（如 `metatile-page:03` → `03`），供目标资源自己的命名用。
      if (tail) return String(value).split(":").at(-1);
      if (width === undefined) return String(value);
      if (!Number.isInteger(value) || value < 0)
        throw new TypeError(`实体切面来源记录的 ${field} 不是非负整数：${value}`);
      const digits = value.toString(radix === "dec" ? 10 : 16);
      return (radix === "dec" ? digits : digits.toUpperCase()).padStart(Number(width), "0");
    });
}

/** 嵌套引用清单形态：`path` 指向记录里的数组，`where` 按关系筛，`handles` 映射目标句柄。 */
function readRuntimeWithin(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 within 声明无效`);
  if (!Array.isArray(value.path) || !value.path.length
      || value.path.some(step => typeof step !== "string" || !step))
    throw new TypeError(`${what} 的 within.path 声明无效`);
  if (!value.where || typeof value.where !== "object")
    throw new TypeError(`${what} 的 within.where 声明无效`);
  const kinds = ["equals", "contains"].filter(name => value.where[name] !== undefined);
  if (kinds.length !== 1)
    throw new TypeError(`${what} 的 within.where 只能给 equals 或 contains 之一`);
  const handles = value.handles;
  if (!Array.isArray(handles) || !handles.length
      || handles.some(item => typeof item !== "string" || !item || !item.includes("{")))
    throw new TypeError(`${what} 的 within.handles 至少要有一个含占位符的模板`);
  return Object.freeze({path: Object.freeze([...value.path]),
    where: Object.freeze({field: text(value.where.field, `${what} 的 within.where.field`),
      kind: kinds[0], value: text(value.where[kinds[0]], `${what} 的 within.where.${kinds[0]}`)}),
    handles: Object.freeze([...handles]),
    then: value.then === undefined ? null : readRuntimeWithinThen(what, value.then)});
}

/** 第二跳：拿第一跳映射出来的句柄，去读它字段对象上的某个字段，字段值就是下一层的句柄。 */
function readRuntimeWithinThen(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 within.then 声明无效`);
  const then = Object.freeze({
    resourceId: text(value.resource_id, `${what} 的 within.then.resource_id`),
    field: text(value.field, `${what} 的 within.then.field`),
    handles: value.handles === undefined ? null : value.handles,
  });
  if (then.handles !== null && (!Array.isArray(then.handles) || !then.handles.length
      || then.handles.some(item => typeof item !== "string" || !item.includes("{value"))))
    throw new TypeError(`${what} 的 within.then.handles 模板缺少 {value}：${then.handles}`);
  return then;
}

/** 已发布证据里的占用符：`{id_hex2}`／`{id10}`／`{id}` 都是实例身份，别的一律拒绝。 */
function substitutePublishedSlots(template, index, indexText, tag = null) {
  const text_ = String(template)
    .split("{id_hex2}").join(indexText)
    .split("{id10}").join(String(index))
    .split("{id}").join(String(index))
    .split("{index}").join(indexText)
    .split("{index10}").join(String(index))
    .split("{tag}").join(tag ?? "");
  const leftover = /\{[^}]*\}/u.exec(text_);
  if (leftover) throw new TypeError(`已发布证据的占位符不认识：${leftover[0]}`);
  return text_;
}

const PUBLISHED_RELATION_SCHEMA = "metalmaxcn.published-reference-resolution/v1";
const CROSS_RESOURCE_RELATION_SCHEMA = "metalmaxcn.cross-resource-handle-relations/v1";
const FIELD_OWNER_RESOLUTION_SCHEMA = "metalmaxcn.field-owner-resolutions/v1";
const PUBLISHED_RESOLUTION_KINDS = Object.freeze(["consecutive-u8-values"]);

/** 已发布引用解析里的取值：`resolution` 决定由正文里的哪个数解出几个目标编号。 */
function publishedRelationValues(what, resolution, source) {
  if (!resolution || typeof resolution !== "object")
    throw new TypeError(`${what} 缺少 resolution`);
  if (!PUBLISHED_RESOLUTION_KINDS.includes(resolution.kind))
    throw new TypeError(`${what} 的 resolution.kind 不认识：${resolution.kind}`);
  if (resolution.first !== "source")
    throw new TypeError(`${what} 的 resolution.first 不认识：${resolution.first}`);
  if (resolution.ordered !== true)
    throw new TypeError(`${what} 的 resolution.ordered 不是 true`);
  const count = resolution.count, step = resolution.step;
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(step) || step < 1)
    throw new TypeError(`${what} 的 count／step 无效`);
  const values = [];
  for (let position = 0; position < count; position += 1) {
    const value = source + position * step;
    if (!Number.isInteger(value) || value < 0 || value > 0xff)
      throw new TypeError(`${what} 解出的编号不是 0–255：${value}`);
    values.push(value);
  }
  return values;
}

/** 已发布句柄模板：`{bank}`／`{bank:hex2}`／`{tile}`／`{tile:hex2}`，其余占位符拒绝。 */
function publishedTargetHandle(what, template, bank, tile) {
  const render = (value, width) => (width === undefined ? String(value)
    : value.toString(16).toUpperCase().padStart(Number(width), "0"));
  const handle = String(template).replace(
    /\{(bank|tile)(?::hex(\d+))?\}/gu,
    (match, name, width) => render(name === "bank" ? bank : tile, width));
  const leftover = /\{[^}]*\}/u.exec(handle);
  if (leftover) throw new TypeError(`${what} 的句柄模板占位符不认识：${leftover[0]}`);
  return handle;
}

/** 正文位置模板：整段只有一个占位符时按记录原值取（如 `{id}` 仍是数字），否则当字符串拼。 */
function substituteDocumentPathStep(step, record, index, indexText, tag = null) {
  const whole = /^\{([A-Za-z0-9_.]+)\}$/u.exec(step);
  if (!whole) return substituteRecordSlots(step, record, index, indexText, tag);
  const value = record?.[whole[1]];
  if (value === undefined || value === null)
    throw new TypeError(`实体切面来源记录缺少 ${whole[1]}：${JSON.stringify(record)}`);
  return value;
}

function nonNegativeHex(value, label, width) {
  if (!Number.isInteger(value) || value < 0)
    throw new TypeError(`实体切面来源记录的 ${label} 不是非负整数：${value}`);
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function readPath(source, path) {
  return path.reduce((node, key) =>
    (node === null || node === undefined ? undefined : node[key]), source);
}

/** 校验静态声明并给出实体目录；不合规的切面在这里就拒绝，不带进页面。 */
function createEntityCatalog(declaration, {source = ""} = {}) {
  if (!declaration || typeof declaration !== "object"
      || declaration.schema !== ENTITY_DECLARATION_SCHEMA)
    throw new TypeError(`实体声明 schema 不是 ${ENTITY_DECLARATION_SCHEMA}`);
  const declared = declaration.entity_classes;
  if (!declared || typeof declared !== "object" || !Object.keys(declared).length)
    throw new TypeError("实体声明没有实体类");
  const classes = new Map();
  for (const [entityClass, value] of Object.entries(declared))
    classes.set(entityClass, readEntityClass(entityClass, value));

  function entityClassOf(target) {
    const name = String(target);
    if (!name.includes(":")) {
      const owner = classes.get(name);
      if (!owner) throw new TypeError(`未声明的实体类：${name}`);
      return {owner, index: null, indexText: null, tag: null};
    }
    const [className, ...parts] = name.split(":");
    const owner = classes.get(className);
    if (!owner) throw new TypeError(`未声明的实体类：${className}`);
    const identity = owner.identity;
    if (!identity) throw new TypeError(`实体类 ${owner.id} 没有发布序号身份，不接受实体句柄`);
    let indexed = identity, tag = null, rawIndex = null;
    if (identity.kind === "tagged") {
      if (parts.length !== 2) throw new TypeError(`复合实体句柄形状无效：${name}`);
      [tag, rawIndex] = parts;
      indexed = identity.variantByTag.get(tag);
      if (!indexed) throw new TypeError(`实体 ${owner.id} 没有发布身份标签：${tag}`);
    } else {
      if (parts.length !== 1) throw new TypeError(`实体句柄形状无效：${name}`);
      [rawIndex] = parts;
    }
    const index = Number.parseInt(rawIndex, indexed.indexRadix);
    const indexText = formatIndex(indexed, index, `实体 ${owner.id}${tag ? ` 标签 ${tag}` : ""}`);
    if (indexText !== rawIndex)
      throw new TypeError(`实体句柄序号与发布身份不符：${name}`);
    return {owner, index, indexText, tag};
  }

  const instanceHandles = owner => {
    if (!owner?.identity) throw new TypeError(`实体类 ${owner?.id ?? "（未知）"} 没有发布序号身份`);
    if (owner.identity.kind === "tagged") return owner.identity.variants.flatMap(variant =>
      variant.indexes.map(index => `${owner.id}:${variant.tag}:${
        formatIndex(variant, index, `实体 ${owner.id} 标签 ${variant.tag}`)}`));
    return owner.identity.indexes.map(index =>
      `${owner.id}:${formatIndex(owner.identity, index, `实体 ${owner.id}`)}`);
  };

  const catalog = {
    relationDocument(location) {
      const documents = declaration.runtime_relation_documents;
      if (!documents || !Object.hasOwn(documents, location))
        throw new TypeError(`实体切面关系未发布：${location}`);
      return documents[location];
    },
    source,
    classIds: Object.freeze([...classes.keys()]),
    entityClass: id => classes.get(id) ?? null,
    instances(entityClass) {
      const owner = classes.get(entityClass);
      return Object.freeze(instanceHandles(owner));
    },
    handleFor(entityClass, tagOrIndex, maybeIndex) {
      const owner = classes.get(entityClass);
      if (!owner?.identity) throw new TypeError(`实体类 ${entityClass} 没有发布序号身份`);
      if (owner.identity.kind === "tagged") {
        const tag = String(tagOrIndex), variant = owner.identity.variantByTag.get(tag);
        if (!variant) throw new TypeError(`实体 ${owner.id} 没有发布身份标签：${tag}`);
        return `${owner.id}:${tag}:${formatIndex(variant, maybeIndex, `实体 ${owner.id} 标签 ${tag}`)}`;
      }
      if (maybeIndex !== undefined)
        throw new TypeError(`实体 ${owner.id} 不是复合身份`);
      return `${owner.id}:${formatIndex(owner.identity, tagOrIndex, `实体 ${owner.id}`)}`;
    },
    /** 实体句柄 → 实体类与序号；类名本身表示与实例无关的切面。 */
    instance(handle) {
      const {owner, index, indexText, tag} = entityClassOf(handle);
      return Object.freeze({entityClass: owner.id, index, indexText, tag, handle: String(handle)});
    },
    /** 切面解析：返回声明范围内的记录或片段，不取数。 */
    facet(target, facetId) {
      const {owner, index, indexText, tag} = entityClassOf(target);
      const facet = owner.facets[facetId];
      if (!facet) throw new TypeError(`未声明的切面：${owner.id}.${facetId}`);
      if (!facet.runtime)
        throw new TypeError(`切面尚未接入运行期字段对象：${owner.id}.${facetId}（${facet.fieldObject}）`);
      if (facet.runtime.identityTags && !facet.runtime.identityTags.includes(tag))
        throw new TypeError(`切面 ${owner.id}.${facetId} 不属于身份标签：${tag}`);
      const {kind, resourceId, providerId} = facet.runtime;
      const publishedPrefix = owner.identity?.kind === "tagged"
        ? owner.identity.variantByTag.get(tag)?.publishedPrefix
        : owner.identity?.publishedPrefix;
      const common = {entityClass: owner.id, facetId, label: facet.label,
        fieldObject: facet.fieldObject, page: facet.page, recordScope: facet.recordScope,
        kind, resourceId, providerId, also: facet.runtime.also ?? [],
        index, indexText, tag, entityHandle: String(target),
        publishedHandle: indexText === null ? null : `${publishedPrefix}${indexText}`};
      if (kind === "fragments")
        return Object.freeze({...common, fragments: facet.runtime.fragments});
      if (facet.runtime.from) {
        const {from} = facet.runtime;
        if (indexText === null)
          throw new TypeError(`切面 ${owner.id}.${facetId} 需要实体句柄：${
            from.handle ?? from.select?.equals ?? ""}`);
        return Object.freeze({...common, index, indexText, fields: facet.runtime.fields,
          from: Object.freeze({resourceId: from.resourceId, path: from.path,
            handle: from.handle, select: from.select, field: from.field ?? null,
            pick: from.pick ?? null, handles: from.handles ?? null,
            documentPath: from.documentPath ?? null, where: from.where ?? null,
            within: from.within ?? null, condition: from.condition ?? null,
            relation: from.relation ?? null})});
      }
      return Object.freeze({...common, records: Object.freeze(facet.runtime.records.map(record => {
        if (record.entityHandle.includes("{") && indexText === null)
          throw new TypeError(`切面 ${owner.id}.${facetId} 需要实体句柄：${record.entityHandle}`);
        return Object.freeze({entityHandle: substituteSlots(record.entityHandle, index, indexText, tag),
          fields: record.fields});
      }))});
    },
  };
  return Object.freeze(catalog);
}

async function fetchDeclaration(sources) {
  const {db} = await import('./scene-actors-Cftr7mCE.js').then(function (n) { return n.projectDb; });
  const declaration = await db.getPackageDocument('metadata/entities.json', null, {readonly: true});
  if (!declaration) throw new TypeError('实体声明不可用');
  return {source: sources[0], declaration};
}

let catalogPromise$1 = null;

/** 载入实体目录；`readDeclaration` 供 Node 侧注入，浏览器用发布包/开发配置。 */
function loadEntityCatalog({readDeclaration = fetchDeclaration} = {}) {
  if (!catalogPromise$1) {
    catalogPromise$1 = (async () => {
      const {source, declaration} = await readDeclaration(ENTITY_SOURCES);
      return createEntityCatalog(declaration, {source});
    })().catch(error => {
      catalogPromise$1 = null;
      throw error;
    });
  }
  return catalogPromise$1;
}

/** 按记录句柄从字段对象里取字段；声明了字段名就按名收窄，缺任何一个都报错。 */
function selectFacetFields(resourceId, objects, entries) {
  const all = objects.flatMap(object => object.fields);
  const selected = [];
  for (const record of entries) {
    let fields = all.filter(field => field.entityHandle === record.entityHandle);
    if (!fields.length)
      throw new TypeError(`字段对象缺少记录：${resourceId}/${record.entityHandle}`);
    if (record.fields) {
      const byName = new Map(fields.map(field => [field.fieldName, field]));
      fields = record.fields.map(fieldName => {
        const field = byName.get(fieldName);
        if (!field)
          throw new TypeError(`字段对象缺少字段：${record.entityHandle}/${fieldName}`);
        return field;
      });
    }
    selected.push(...fields);
  }
  return Object.freeze([...new Set(selected)]);
}

/** 记录由实例正文或字段对象自己现查：按声明定出记录集合。 */
async function referencedFacetEntries(database, resolved, objects, readEvidence, provider) {
  const {from} = resolved;
  if (from.relation) {
    // 已发布引用解析：source 取值 → resolution 解编号 → target 按发布文档定位记录。
    const what = `切面来源 ${from.relation.location}#${from.relation.path.join(".")}`;
    const evidence = await readEvidence(from.relation.location);
    const published = readPath(evidence, from.relation.path);
    if (!published || typeof published !== "object")
      throw new TypeError(`${what} 在证据里不存在`);
    if (evidence.schema === FIELD_OWNER_RESOLUTION_SCHEMA) {
      if (published.status !== "confirmed") throw new TypeError(`${what} 尚未确认`);
      if (published.logical_owner_resource_id !== resolved.fieldObject)
        throw new TypeError(`${what} 的逻辑字段对象与切面不一致：${
          published.logical_owner_resource_id} ≠ ${resolved.fieldObject}`);
      const domains = published.identity_domains;
      if (Array.isArray(domains) && !domains.some(domain =>
        resolved.index >= domain.first_item_id && resolved.index <= domain.last_item_id))
        throw new TypeError(`${what} 未发布实体 ${resolved.publishedHandle} 的字段域`);
      const publishedRecord = Array.isArray(published.records)
        ? published.records.find(row => row?.entity_handle === resolved.entityHandle) : null;
      if (Array.isArray(published.records) && !publishedRecord)
        throw new TypeError(`${what} 未发布实体 ${resolved.entityHandle} 的字段 owner`);
      const record = publishedRecord ?? {index: resolved.index};
      const template = from.relation.fieldHandleTemplate ?? published.record_handle_template;
      if (typeof template !== "string" || !template)
        throw new TypeError(`${what} 缺少字段对象句柄模板`);
      const entityHandle = substituteRecordSlots(template, record,
        resolved.index, resolved.indexText, resolved.tag);
      let fields = resolved.fields;
      if (fields === null && published.common_fields) {
        fields = Object.keys(published.common_fields);
        for (const [fieldName, field] of Object.entries(published.optional_fields ?? {})) {
          const condition = field.presence_condition;
          if (resolved.index >= condition.monster_id_minimum
              && resolved.index <= condition.monster_id_maximum) fields.push(fieldName);
        }
      } else if (fields === null && published.fields
          && from.relation.fieldHandleTemplate === null) {
        fields = Object.keys(published.fields);
      }
      return [Object.freeze({entityHandle, fields: fields === null ? null : Object.freeze(fields)})];
    }
    if (evidence.schema === CROSS_RESOURCE_RELATION_SCHEMA) {
      if (published.status !== "confirmed") throw new TypeError(`${what} 尚未确认`);
      const {source, target, condition} = published;
      if (evidence.subject === "vehicle-new-game-template-relations") {
        if (resolved.fieldObject !== "save-vehicle" || resolved.resourceId !== "save-vehicle"
            || resolved.providerId !== null)
          throw new TypeError(`${what} 的战车模板字段对象不一致`);
        const row = published.resolved?.find(item => item.entity_handle === resolved.entityHandle);
        if (!row) {
          if (published.not_applicable?.some(item => item.entity_handle === resolved.entityHandle))
            return [];
          throw new TypeError(`${what} 未发布战车模板关系：${resolved.entityHandle}`);
        }
        if (!Array.isArray(row.template_handles) || !row.template_handles.length
            || row.template_handles.some(handle => typeof handle !== "string"
              || !handle.startsWith("save-vehicle.initial-template-")))
          throw new TypeError(`${what} 的战车模板句柄无效`);
        return row.template_handles.map(entityHandle =>
          Object.freeze({entityHandle, fields: null}));
      }
      if (target?.logical_owner_resource_id === "save-vehicle") {
        if (resolved.providerId !== "save-context" || resolved.resourceId !== "save-vehicle"
            || resolved.fieldObject !== "save-vehicle"
            || typeof provider.matchingRentalVehicleSlots !== "function")
          throw new TypeError(`${what} 缺少战车存档字段提供器`);
        const fixed = published.fixed?.find(row => row.entity_handle === resolved.entityHandle);
        const dynamic = published.dynamic?.find(row => row.entity_handle === resolved.entityHandle);
        if (Boolean(fixed) === Boolean(dynamic) || (fixed ?? dynamic).preset_id !== resolved.index)
          throw new TypeError(`${what} 未发布战车实体关系：${resolved.entityHandle}`);
        const slots = fixed ? [fixed.persistent_vehicle_slot]
          : provider.matchingRentalVehicleSlots(dynamic.preset_id, dynamic.persistent_vehicle_slots);
        if (slots.some(slot => !Number.isInteger(slot) || slot < 0 || slot > 10))
          throw new TypeError(`${what} 持久战车槽越界`);
        return slots.map(slot => Object.freeze({entityHandle: `save-vehicle:${slot}`, fields: null}));
      }
      if (!source || typeof source !== "object" || !target || typeof target !== "object")
        throw new TypeError(`${what} 缺少 source／target`);
      if (target.resource_id !== resolved.fieldObject
          && target.resource_id !== resolved.resourceId)
        throw new TypeError(`${what} 的目标字段对象与切面不一致：${target.resource_id} ≠ ${resolved.fieldObject}/${resolved.resourceId}`);
      if (target.resource_id !== resolved.resourceId
          && from.relation.fieldHandleTemplate === null
          && from.relation.fieldHandleList === null)
        throw new TypeError(`${what} 的目标字段对象需要运行期句柄映射：${resolved.resourceId}`);
      const sourceHandles = new Set([resolved.entityHandle, resolved.publishedHandle]);
      const resolvedRecord = Array.isArray(published.resolved)
        ? published.resolved.find(row => sourceHandles.has(row?.entity_handle)) : null;
      if (Array.isArray(published.resolved) && !resolvedRecord) {
        const notApplicable = (published.not_applicable ?? []).some(row =>
          sourceHandles.has(row?.entity_handle))
          || (published.registered_without_profile ?? []).some(handle => sourceHandles.has(handle));
        if (notApplicable) return [];
        throw new TypeError(`${what} 未发布实体 ${resolved.publishedHandle} 的目标关系`);
      }
      if (resolvedRecord) {
        if (from.relation.fieldHandleList !== null) {
          const logicalHandles = Object.values(resolvedRecord).filter(value =>
            typeof value === "string" && value.startsWith(`${target.resource_id}:`));
          if (target.resource_id !== resolved.resourceId && !logicalHandles.length)
            throw new TypeError(`${what} 缺少目标逻辑句柄`);
          const handles = resolvedRecord[from.relation.fieldHandleList];
          if (!Array.isArray(handles) || !handles.length
              || handles.some(handle => typeof handle !== "string"
                || !handle || (target.resource_id !== resolved.resourceId
                  && !handle.startsWith(`${resolved.resourceId}:`))))
            throw new TypeError(`${what} 缺少运行期字段句柄列表`);
          return [...new Set(handles)].map(entityHandle =>
            Object.freeze({entityHandle, fields: resolved.fields}));
        }
        if (Array.isArray(target.shared_block_ids)) return target.shared_block_ids.map(id =>
          Object.freeze({entityHandle: `${resolved.resourceId}:${id}`, fields: resolved.fields}));
        const templates = [target, published.paired_target]
          .filter(candidate => candidate?.resource_id === target.resource_id)
          .map(candidate => candidate.handle_template);
        const publishedHandles = Object.values(resolvedRecord).filter(value =>
          typeof value === "string" && value.startsWith(`${target.resource_id}:`));
        const handles = from.relation.fieldHandleTemplate === null
          ? (publishedHandles.length ? publishedHandles : templates.map(template =>
            substituteRecordSlots(template, resolvedRecord,
              resolved.index, resolved.indexText, resolved.tag)))
          : [substituteRecordSlots(from.relation.fieldHandleTemplate, resolvedRecord,
            resolved.index, resolved.indexText, resolved.tag)];
        return [...new Set(handles)].map(entityHandle =>
          Object.freeze({entityHandle, fields: resolved.fields}));
      }
      if (from.relation.sourceField) {
        if (published.resolution?.kind !== "graphic-id-times-two"
            || !published.paired_target?.handle_template)
          throw new TypeError(`${what} 的 source_field 解析种类不认识`);
        const spec = from.relation.sourceField;
        const sourceHandle = substituteRecordSlots(spec.handleTemplate, {},
          resolved.index, resolved.indexText, resolved.tag);
        const sourceValue = (await database.getField(spec.resourceId, sourceHandle, spec.field)).value;
        if (!Number.isInteger(sourceValue)
            || sourceValue < published.resolution.source_first
            || sourceValue >= published.resolution.source_first + published.resolution.source_count)
          throw new TypeError(`${what} 的来源字段超出已发布图形域：${sourceValue}`);
        const pairEntries = recordId => {
          const pair = {anchor_byte_index: recordId * published.resolution.anchor_byte_index_multiplier,
            anchor_byte_index_plus_one: recordId * published.resolution.anchor_byte_index_multiplier
              + published.resolution.paired_target_delta};
          return [target.handle_template, published.paired_target.handle_template].map(template =>
            Object.freeze({entityHandle: substituteRecordSlots(template, pair,
              resolved.index, resolved.indexText, resolved.tag), fields: resolved.fields}));
        };
        const entries = pairEntries(sourceValue);
        const slots = published.slot_resolution;
        if (slots === undefined) return entries;
        if (slots.kind !== "x-bit7-low7-plus-selection-slot"
            || slots.selection_slot_count !== 6 || slots.record_count !== 121
            || slots.field_name !== "value")
          throw new TypeError(`${what} 的逐槽锚点解析声明不认识`);
        const pairs = new Map();
        const pairAt = async recordId => {
          if (!pairs.has(recordId)) pairs.set(recordId, (async () => {
            const pair = pairEntries(recordId);
            const [x, y] = await Promise.all(pair.map(entry =>
              database.getField(resolved.resourceId, entry.entityHandle, slots.field_name)));
            return {x: Number(x.value), y: Number(y.value), entries: pair};
          })());
          return pairs.get(recordId);
        };
        const slotRecords = [];
        for (let slot = 0; slot < slots.selection_slot_count; slot += 1) {
          let recordId = sourceValue;
          const visited = new Set();
          while (!visited.has(recordId)) {
            visited.add(recordId);
            if (recordId < 0 || recordId >= slots.record_count) {
              slotRecords.push(Object.freeze({slot, recordId,
                reason: "索引越出锚点表", redirected: visited.size > 1}));
              break;
            }
            const pair = await pairAt(recordId);
            for (const entry of pair.entries) {
              if (!entries.some(item => item.entityHandle === entry.entityHandle)) entries.push(entry);
            }
            if (pair.x & 0x80) {
              recordId = ((pair.x & 0x7f) + slot) & 0xff;
              continue;
            }
            slotRecords.push(Object.freeze({slot, recordId, x: pair.x, y: pair.y,
              reason: pair.y & 0x80 ? "这一槽没有固定源点" : "",
              redirected: visited.size > 1}));
            break;
          }
          if (!slotRecords.some(item => item.slot === slot))
            slotRecords.push(Object.freeze({slot, recordId,
              reason: "锚点重定向成环", redirected: true}));
        }
        entries.slotRecords = Object.freeze(slotRecords);
        return entries;
      }
      const sourceHandle = substituteRecordSlots(source.handle_template, {},
        resolved.index, resolved.indexText, resolved.tag);
      const record = {};
      for (const fieldName of source.fields ?? []) {
        const field = await database.getField(source.resource_id, sourceHandle, fieldName);
        record[fieldName] = field.value;
      }
      if (condition?.identity_tag !== undefined && condition.identity_tag !== resolved.tag) return [];
      if (condition?.field !== undefined) {
        if (!Object.hasOwn(record, condition.field))
          throw new TypeError(`${what} 的条件字段未由 source.fields 发布：${condition.field}`);
        if (condition.equals !== undefined && record[condition.field] !== condition.equals) return [];
        if (condition.not_equals !== undefined && record[condition.field] === condition.not_equals) return [];
      }
      // 先展开证据发布的目标句柄，即使字段 owner 使用自己的记录句柄，也不跳过证据形状校验。
      substituteRecordSlots(target.handle_template, record,
        resolved.index, resolved.indexText, resolved.tag);
      const entityHandle = from.relation.fieldHandleTemplate === null
        ? substituteRecordSlots(target.handle_template, record,
          resolved.index, resolved.indexText, resolved.tag)
        : substituteRecordSlots(from.relation.fieldHandleTemplate, record,
          resolved.index, resolved.indexText, resolved.tag);
      return [Object.freeze({entityHandle, fields: resolved.fields})];
    }
    if (published.schema !== PUBLISHED_RELATION_SCHEMA)
      throw new TypeError(`${what} 的 schema 不认识：${published.schema}`);
    const {source, target} = published;
    if (!source || typeof source !== "object" || !target || typeof target !== "object")
      throw new TypeError(`${what} 缺少 source／target`);
    const sourceId = substitutePublishedSlots(source.resource_id_template,
      resolved.index, resolved.indexText, resolved.tag);
    const sourceDocument = await database.getResourceDocument(sourceId, null);
    if (!sourceDocument) throw new TypeError(`实体切面来源不可用：${sourceId}`);
    const sourceValue = readPath(sourceDocument,
      [...from.relation.sourceRoot, ...source.document_path]);
    if (!Number.isInteger(sourceValue) || sourceValue < 0 || sourceValue > 0xff)
      throw new TypeError(`${what} 的来源值不是 0–255：${sourceValue}`);
    const values = publishedRelationValues(what, published.resolution, sourceValue);
    const targetDocument = await database.getResourceDocument(target.resource_id, null);
    if (!targetDocument) throw new TypeError(`实体切面目标不可用：${target.resource_id}`);
    const bankPath = target.bank_document_path;
    const tilePath = target.tile_document_path;
    if (!Array.isArray(bankPath) || !Array.isArray(tilePath)
        || bankPath.at(-1) !== "{bank}" || !tilePath.includes("{bank}"))
      throw new TypeError(`${what} 的 bank／tile 路径不认识`);
    const banks = readPath(targetDocument, bankPath.slice(0, -1));
    if (!Array.isArray(banks)) throw new TypeError(`${what} 的目标文档缺少 ${bankPath.slice(0, -1).join(".")}`);
    const tileTail = tilePath.slice(tilePath.indexOf("{bank}") + 1);
    const entries = [];
    for (const value of values) {
      const bank = banks.find(row => row?.[target.bank_id_field] === value);
      // 缺 bank 就报错：不假定编号连续、不按数组位置回退。
      if (!bank) throw new TypeError(`${what} 的目标文档里没有 ${target.bank_id_field} 为 ${value} 的 bank`);
      const tiles = readPath(bank, tileTail);
      if (!Array.isArray(tiles) || !tiles.length)
        throw new TypeError(`${what} 的 bank ${value} 没有已发布图块：${tileTail.join(".")}`);
      for (const tile of tiles) {
        const tileId = tile?.[target.tile_id_field];
        if (!Number.isInteger(tileId) || tileId < 0 || tileId > 0xff)
          throw new TypeError(`${what} 的 bank ${value} 里有图块缺少 ${target.tile_id_field}`);
        const entityHandle = publishedTargetHandle(what, target.tile_handle_template, value, tileId);
        if (!entries.some(entry => entry.entityHandle === entityHandle))
          entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    return entries;
  }
  if (!from.path) {
    const target = String(substituteSlots(from.select.equals,
      resolved.index, resolved.indexText, resolved.tag));
    if (!objects.some(object => object.fields.some(field => field.fieldName === from.select.field)))
      throw new TypeError(`字段对象里没有 ${from.select.field}：${resolved.resourceId}`);
    const matched = [];
    for (const object of objects) for (const field of object.fields) {
      if (field.fieldName !== from.select.field) continue;
      if (String(field.value) === target && !matched.includes(field.entityHandle))
        matched.push(field.entityHandle);
    }
    if (!from.field) return matched.map(entityHandle =>
      Object.freeze({entityHandle, fields: resolved.fields}));
    // 第二步：拿选中记录的另一个字段值当句柄（`{value}`／`{value:hexN}`）。
    const handles = [];
    for (const entityHandle of matched) {
      for (const object of objects) for (const field of object.fields) {
        if (field.entityHandle !== entityHandle || field.fieldName !== from.field) continue;
        const mapped = from.handle.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) => {
          if (width === undefined) return String(field.value);
          if (!Number.isInteger(field.value) || field.value < 0)
            throw new TypeError(`字段 ${entityHandle}/${from.field} 不是非负整数：${field.value}`);
          return field.value.toString(16).toUpperCase().padStart(Number(width), "0");
        });
        if (!handles.includes(mapped)) handles.push(mapped);
      }
    }
    return handles.map(entityHandle => Object.freeze({entityHandle, fields: resolved.fields}));
  }
  const sourceId = substituteSlots(from.resourceId, resolved.index, resolved.indexText, resolved.tag);
  const document_ = await database.getResourceDocument(sourceId, null);
  if (!document_) throw new TypeError(`实体切面来源不可用：${sourceId}`);
  const rows = readPath(document_, from.path);
  if (from.pick) {
    // 正文里取几个下标的值，每个值按模板铺成句柄（已发布页／指针这类"由数值选资源"）。
    if (!Array.isArray(rows))
      throw new TypeError(`实体切面来源缺少 ${from.path.join(".")}：${sourceId}`);
    const handles = [];
    for (const index of from.pick) {
      const value = rows[index];
      if (!Number.isInteger(value) || value < 0)
        throw new TypeError(`实体切面来源的 ${from.path.join(".")}[${index}] 不是非负整数：${value}`);
      for (const template of from.handles) {
        const handle = template.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) =>
          width === undefined ? String(value)
            : value.toString(16).toUpperCase().padStart(Number(width), "0"));
        if (!handles.includes(handle)) handles.push(handle);
      }
    }
    return handles.map(entityHandle => Object.freeze({entityHandle, fields: resolved.fields}));
  }
  if (!Array.isArray(rows))
    throw new TypeError(`实体切面来源缺少 ${from.path.join(".")}：${sourceId}`);
  let chosen = rows;
  if (from.where) {
    const want = substituteSlots(from.where.value, resolved.index, resolved.indexText, resolved.tag);
    chosen = rows.filter(row => {
      const value = row?.[from.where.field];
      if (from.where.kind === "contains")
        return Array.isArray(value) && value.map(String).includes(want);
      return String(value) === want;
    });
    if (!chosen.length)
      throw new TypeError(`实体切面来源里没有 ${from.where.field} ${
        from.where.kind === "contains" ? "含" : "等于"} ${want} 的记录：${sourceId}`);
  }
  if (from.condition) {
    chosen = chosen.filter(row => {
      const value = readPath(row, from.condition.field.split("."));
      if (from.condition.kind === "starts_with") return String(value).startsWith(from.condition.value);
      return String(value) === from.condition.value;
    });
    if (!chosen.length) return [];
  }
  if (from.documentPath) {
    // 目标记录按字段对象自己发布的正文位置找：找不到即报错，不退回整资源、不按序号回退。
    const published = objects.flatMap(object => object.fields);
    const entries = [];
    for (const row of chosen) {
      const path = from.documentPath.map(step =>
        substituteDocumentPathStep(step, row, resolved.index, resolved.indexText, resolved.tag));
      const wanted = JSON.stringify(path);
      const matched = published.filter(field => JSON.stringify(field.documentPath) === wanted);
      if (!matched.length)
        throw new TypeError(`字段对象里没有正文位置 ${wanted}：${resolved.resourceId}`);
      for (const field of matched) {
        if (entries.some(entry => entry.entityHandle === field.entityHandle
            && entry.fields[0] === field.fieldName)) continue;
        entries.push(Object.freeze({entityHandle: field.entityHandle, fields: [field.fieldName]}));
      }
    }
    return entries;
  }
  if (from.within) {
    // 已发布引用清单：先按 where 取到该实例的记录，再从它的嵌套引用数组里按关系筛目标句柄。
    const within = from.within;
    const entries = [];
    for (const row of chosen) {
      const rows = readPath(row, within.path);
      if (!Array.isArray(rows))
        throw new TypeError(`实体切面来源记录缺少 ${within.path.join(".")}：${sourceId}`);
      const matched = rows.filter(entry => {
        const value = entry?.[within.where.field];
        if (within.where.kind === "contains")
          return Array.isArray(value) && value.map(String).includes(within.where.value);
        return String(value) === within.where.value;
      });
      for (const entry of matched) for (const template of within.handles) {
        const entityHandle = substituteRecordSlots(
          template, entry, resolved.index, resolved.indexText, resolved.tag);
        if (!entries.some(existing => existing.entityHandle === entityHandle))
          entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    if (!within.then) return entries;
    // 第二跳：第一跳句柄所在的字段对象上读一个字段，字段值就是下一层的句柄。
    const then = within.then;
    const mapped = [];
    for (const entry of entries) {
      // 第一跳句柄属于声明的第二跳资源：不在那儿就由 getField 报错，不换资源顶替。
      const field = await database.getField(then.resourceId, entry.entityHandle, then.field);
      for (const template of then.handles ?? ["{value}"]) {
        const entityHandle = template.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) =>
          width === undefined ? String(field.value)
            : nonNegativeHex(field.value, `${then.field}`, Number(width)));
        if (!mapped.some(existing => existing.entityHandle === entityHandle))
          mapped.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    return mapped;
  }
  const entries = [];
  for (const row of chosen) for (const template of from.handles ?? [from.handle]) {
    const entityHandle = substituteRecordSlots(
      template, row, resolved.index, resolved.indexText, resolved.tag);
    if (!entries.some(entry => entry.entityHandle === entityHandle))
      entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
  }
  return entries;
}

/**
 * 经实体句柄 + 切面取字段对象的共享实例，只回切面声明范围内的字段。
 * 声明里的记录、片段或字段名在字段对象里不存在即报错，不退回整资源。
 * 记录集合可以写在声明里，也可以由实例正文的已发布引用现查（`from`）。
 */
async function entityFacetFields(database, target, facetId,
  {catalog = null, readEvidence = null, fieldProviders = {}} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const resolved = directory.facet(target, facetId);
  const provider = resolved.providerId === null ? database
    : (fieldProviders instanceof Map
      ? fieldProviders.get(resolved.providerId) : fieldProviders[resolved.providerId]);
  if (!provider || typeof provider.getFieldObjects !== "function"
      || typeof provider.getField !== "function")
    throw new TypeError(`实体取数缺少字段提供器：${resolved.providerId ?? "project"}`);
  // 字段对象所在的资源本身也可以是实例资源（如场景资产 `scene:XX`）。
  const resourceId = resolved.resourceId.includes("{")
    ? substituteSlots(resolved.resourceId, resolved.index, resolved.indexText, resolved.tag)
    : resolved.resourceId;
  const withAlso = async fields => {
    const selected = [...fields];
    for (const entry of resolved.also) {
      const handle = substituteSlots(entry.entityHandle,
        resolved.index, resolved.indexText, resolved.tag);
      for (const name of entry.fields) {
        const field = await database.getField(entry.resourceId, handle, name);
        if (!selected.includes(field)) selected.push(field);
      }
    }
    return Object.freeze(selected);
  };
  // 已发布引用形态的切面按句柄直接定位字段：整资源列对象在 CHR 这种上万对象的资源上不可用。
  const relationForm = resolved.kind === "records" && Boolean(resolved.from?.relation);
  const objects = relationForm ? null : await provider.getFieldObjects(resourceId);
  if (resolved.kind === "fragments") {
    const selected = resolved.fragments.map(declared => {
      const fragmentId = declared.includes("{")
        ? substituteSlots(declared, resolved.index, resolved.indexText, resolved.tag)
        : declared;
      const object = objects.find(candidate => candidate.id === fragmentId);
      if (!object) throw new TypeError(`字段对象缺少片段：${resourceId}/${fragmentId}`);
      return object;
    });
    return Object.freeze({...resolved, resourceId, objects: Object.freeze(selected),
      fields: Object.freeze(selected.flatMap(object => object.fields))});
  }
  const entries = resolved.from
    ? await referencedFacetEntries(database, resolved, objects,
      readEvidence ?? (location => directory.relationDocument(location)), provider)
    : resolved.records;
  if (relationForm) {
    if (entries.some(entry => entry.fields === null)) {
      const relationObjects = await provider.getFieldObjects(resourceId);
      const fields = selectFacetFields(resourceId, relationObjects, entries);
      return Object.freeze({...resolved, resourceId, objects: Object.freeze(relationObjects),
        records: Object.freeze(entries), fields: await withAlso(fields)});
    }
    const fields = [];
    for (const entry of entries) for (const name of entry.fields) {
      const field = await provider.getField(resourceId, entry.entityHandle, name);
      if (!fields.includes(field)) fields.push(field);
    }
    return Object.freeze({...resolved, resourceId, objects: Object.freeze([]),
      records: Object.freeze(entries), slotRecords: entries.slotRecords ?? null,
      fields: await withAlso(fields)});
  }
  const fields = selectFacetFields(resourceId, objects, entries);
  return Object.freeze({...resolved, resourceId, objects: Object.freeze(objects),
    records: Object.freeze(entries), fields: await withAlso(fields)});
}

// @editor-module 将 DB 的真实加载批次与进度上报给日志服务。

let unsubscribe$1 = null;
let task = null;

function bindDbProgress() {
  unsubscribe$1?.();
  unsubscribe$1 = db.subscribeProgress(snapshot => {
    if (!snapshot.active) {
      task?.finish({message: "数据载入结束", progress: null});
      task = null;
      return;
    }
    const entry = {source: "数据载入", message: "载入数据", details: snapshot.labels.join("、"),
      progress: {current: snapshot.done, total: snapshot.total}};
    if (!task) task = editorLog.startTask(entry);
    else task.update(entry);
  });
}

// @editor-module 从统一日志服务呈现全局任务与消息并绑定日志入口。

function bindLogStatus(openLog) {
  const bar = document.querySelector("#statusbar");
  if (!bar || bar.dataset.logBound) return;
  bar.dataset.logBound = "true";
  globalThis.addEventListener("error", event => {
    const resource = event.target?.src || event.target?.href;
    const details = {file: event.filename || resource, line: event.lineno, column: event.colno};
    if (!resource && event.target === globalThis && event.error == null
      && event.lineno === 0 && event.colno === 0
      && ["ResizeObserver loop completed with undelivered notifications.",
        "ResizeObserver loop limit exceeded"].includes(event.message)) {
      editorLog.record({source: "ResizeObserver", level: "debug", message: event.message, details});
      return;
    }
    editorLog.error(resource ? "资源载入" : "编辑器", event.message || "资源文件加载失败", event.error,
      {details});
  }, true);
  globalThis.addEventListener("unhandledrejection", event => {
    editorLog.error("编辑器", `未处理的错误：${event.reason?.message || event.reason}`, event.reason);
  });
  let saveTask = null;
  watchAutoSaveState(({busy}) => {
    if (busy && !saveTask) saveTask = editorLog.startTask({source: "保存", message: "保存中"});
    if (!busy && saveTask) {
      saveTask.finish({level: "debug", message: "保存任务结束"});
      saveTask = null;
    }
  });
  let scheduled = false;
  editorLog.subscribe(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const context = editorLog.context();
      for (const key of ["rows", "selection", "dirty", "address"]) {
        document.querySelector(`#status-${key}`).textContent = context[key] || "";
      }
      const tasks = document.querySelector("#status-tasks");
      tasks.innerHTML = editorLog.tasks().map(task => `<span class="log-task" title="${esc(task.message)}">
        <b>${esc(task.source)}</b> ${esc(task.summary || task.message)} ${esc(logProgressText(task.progress))}</span>`).join("");
      const attention = editorLog.attention();
      const message = document.querySelector("#status-message");
      message.hidden = !attention;
      message.dataset.level = attention?.level || "";
      message.textContent = attention ? `${attention.source} · ${attention.message}` : "";
      const dismiss = document.querySelector("#status-dismiss");
      dismiss.hidden = !attention;
      dismiss.dataset.logId = attention?.id || "";
    });
  });
  bar.addEventListener("click", event => {
    if (event.target.closest("#status-dismiss")) {
      editorLog.acknowledge([Number(event.target.closest("#status-dismiss").dataset.logId)]);
      return;
    }
    void openLog();
  });
  bar.addEventListener("keydown", event => {
    if (event.target === bar && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      void openLog();
    }
  });
}

// @editor-module 筛选会话日志并提供详情、调用栈、复制与失败重试。

let source = "";
let level = "";
let visibleCount = 200;
const expanded = new Set();
let unsubscribe = null;

const filteredEntries = () => editorLog.entries().filter(entry => (!source || entry.source === source)
  && (!level || entry.level === level));

function renderLog() {
  const sources = [...new Set(editorLog.entries().map(entry => entry.source))].sort();
  return `<div class="toolbar log-filters">
    <label>来源 <select id="log-source"><option value="">全部来源</option>${sources.map(value =>
      `<option ${source === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label>
    <label>级别 <select id="log-level"><option value="">全部级别</option>${Object.entries(LOG_LEVELS).map(([value, label]) =>
      `<option value="${value}" ${level === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
    <button class="button" id="log-copy">复制筛选日志</button><span id="log-count"></span>
  </div><div id="log-entries" class="log-entries"></div>
    <button class="button ghost" id="log-more" hidden>查看更早日志</button>`;
}

function paintLog(root) {
  if (!root.isConnected) return;
  const all = filteredEntries();
  const visible = all.slice(-visibleCount).reverse();
  root.innerHTML = visible.map(entry => `<details class="log-entry" data-log-id="${entry.id}"
    data-level="${esc(entry.level)}" ${expanded.has(entry.id) ? "open" : ""}>
    <summary><time datetime="${entry.time}">${esc(new Date(entry.time).toLocaleTimeString())}</time>
      <b>${esc(entry.source)}</b><span class="log-level">${LOG_LEVELS[entry.level] || esc(entry.level)}</span>
      <span class="log-message">${esc(entry.message)}</span><span>${esc(logProgressText(entry.progress))}</span></summary>
    <div class="log-detail"><button class="button ghost" data-log-copy="${entry.id}">复制条目</button>
      ${entry.retry ? `<button class="button" data-log-retry="${entry.id}">重试</button>` : ""}
      <p>${esc(entry.time)}</p>${entry.details ? `<h3>详情</h3><pre>${esc(entry.details)}</pre>` : ""}
      ${entry.stack ? `<h3>错误调用栈</h3><pre>${esc(entry.stack)}</pre>` : ""}
    </div></details>`).join("") || '<div class="empty"><b>暂无匹配日志</b></div>';
  const sources = document.querySelector("#log-source");
  for (const value of new Set(editorLog.entries().map(entry => entry.source))) {
    if (![...sources.options].some(option => option.value === value)) sources.add(new Option(value, value));
  }
  document.querySelector("#log-count").textContent = `${visible.length} / ${all.length} 条`;
  document.querySelector("#log-more").hidden = visible.length === all.length;
  editorLog.acknowledge(visible.map(entry => entry.id));
}

function bindLog() {
  unsubscribe?.();
  const root = document.querySelector("#log-entries");
  let scheduled = false;
  let stop = null;
  root.addEventListener("toggle", event => {
    const entry = event.target.closest("[data-log-id]");
    if (!entry) return;
    const id = Number(entry.dataset.logId);
    if (entry.open) expanded.add(id); else expanded.delete(id);
  }, true);
  const copy = async (value, button) => {
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "已复制";
    } catch (error) {editorLog.error("日志", `复制失败：${error.message}`, error);}
  };
  root.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = Number(button.dataset.logCopy || button.dataset.logRetry);
    const entry = editorLog.entries().find(item => item.id === id);
    if (!entry) return;
    if (button.dataset.logCopy) return copy(logEntryText(entry), button);
    button.disabled = true;
    try {await entry.retry();}
    catch (error) {editorLog.error(entry.source, `重试失败：${error.message}`, error);}
    finally {button.disabled = false;}
  });
  for (const selector of ["#log-source", "#log-level"]) document.querySelector(selector).addEventListener("change", () => {
    source = document.querySelector("#log-source").value;
    level = document.querySelector("#log-level").value;
    visibleCount = 200;
    paintLog(root);
  });
  document.querySelector("#log-copy").addEventListener("click", event =>
    copy(filteredEntries().map(logEntryText).join("\n\n"), event.currentTarget));
  document.querySelector("#log-more").addEventListener("click", () => {visibleCount += 200; paintLog(root);});
  paintLog(root);
  stop = editorLog.subscribe(() => {
    if (!root.isConnected) {stop?.(); return;}
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {scheduled = false; paintLog(root);});
  });
  unsubscribe = stop;
}

// @editor-module 在页面装载期间准备同一份存档字段会话与 Working。

let callbacks = {};
function configureSaveEditorCallbacks(next) {callbacks = next;}
const saveFields = createSaveCurrentFieldObjects(state, {
  rentalVehicleTemplate: presetId => saveRentalVehicleTemplate(presetId, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  vehicleAcquisitionTemplate: vehicle => saveVehicleAcquisitionTemplate(vehicle, {
    vehicles: db.peekResourceDocument("vehicle-preset"),
    items: db.peekResourceDocument("item-entry"),
    overlays: db.peekResourceDocument("shared-indexed-byte-overlays"),
  }),
  onChanged: message => callbacks.onChanged?.(message),
  onError: error => {
    state.saveError = String(error?.message || error);
    callbacks.onError?.(error);
  },
});

let preparing = null;
async function prepareWorkspace({physical}) {
  if (!saveFields.loaded()) {
    if (state.saveByteMapLoading || state.saveByteMapAttempted) return;
    state.saveByteMapLoading = true;
    state.saveByteMapAttempted = true;
    try {
      await saveFields.load(physical ? {allPages: !state.saveRomInitialBytes} : {runtime: true});
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
    } finally {
      state.saveByteMapLoading = false;
    }
  }
  if (!saveFields.loaded()) return;
  if (physical && !saveFields.complete())
    await saveFields.load({allPages: true});
  // 存档深链须补齐目标页的语义记录。
  const selectedOffset = Number(state.saveSelectedOffset ?? 0);
  if (physical && saveFields.pendingPage(selectedOffset)) {
    await saveFields.load({pageOffsets: [selectedOffset]});
  }
  // 双槽初值只从项目 Origin 语义资产生成。
  if (!state.saveRomInitialBytes) {
    try {
      if (physical && !saveFields.complete()) await saveFields.load({allPages: true});
      const initial = await saveFields.initial(state.projectRepository);
      await openSaveWorkspace(state, initial, {
        message: "已生成",
      });
      state.saveError = "";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
      state.saveMessage = `ROM 初始存档生成失败：${state.saveError}`;
    }
  }
}
function prepareSaveEditorWorkspace({physical = ['save', 'bytemap-sram'].includes(state.view)} = {}) {
  if (!preparing) preparing = prepareWorkspace({physical}).finally(() => {preparing = null;});
  return preparing.then(() => physical && saveFields.loaded() && !saveFields.complete()
    ? prepareSaveEditorWorkspace({physical: true}) : undefined);
}

// @editor-module 引用图目录经 DB 读取发布声明。

const GRAPH_SCHEMA = "metalmaxcn.module-graph";
const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;

const MODULE_GRAPH_SOURCES = Object.freeze([
  siteUrl("package/metadata/module-graph.json"),
]);

const FAMILY_LABELS = Object.freeze({
  actor: "角色图形",
  application: "应用脚本",
  asset: "资产",
  attack: "攻击视觉",
  audio: "音频",
  battle: "战斗",
  boot: "启动",
  char: "字符",
  character: "人物数据",
  code: "代码服务",
  core: "基础字符",
  data: "游戏数据",
  direct: "直接图形",
  dpcm: "DPCM",
  effect: "效果流",
  encounter: "遇敌",
  enemy: "敌方行为",
  facility: "设施",
  field: "场景功能",
  global: "全局服务",
  indirect: "调用服务",
  inventory: "物品栏",
  investigation: "调查",
  metasprite: "组合精灵",
  metatile: "地图图块",
  monster: "怪物图形",
  new: "新游戏",
  palette: "调色板",
  party: "队伍服务",
  project: "项目聚合",
  property: "财产",
  rental: "出租战车",
  role: "角色服务",
  runtime: "运行时",
  save: "存档",
  scene: "场景",
  shared: "共享表",
  sprite: "精灵调色板",
  story: "剧情",
  terminal: "终端",
  text: "文本",
  ui: "界面",
  vehicle: "战车服务",
  visual: "视觉资产",
  world: "世界地图",
});

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function moduleFamily(moduleId) {
  return moduleId.split(/[.-]/u, 1)[0];
}

const MODULE_TITLES = Object.freeze({
  'battle-item-service': '战斗道具攻击参数',
  'battle-target-hp-update-service': '战斗目标生命值更新服务',
  'vehicle-sp-damage-service': '战车装甲值扣减服务',
  'cpu-interrupt-vector-table': '处理器固定中断向量表',
  'frame-nmi-runtime-service': '帧中断运行服务',
  'dpcm-sample': '差分脉码音频采样',
  'dpcm-storage': '差分脉码音频存储',
  'encounter-event-flag-map': '遭遇选择值与全局事件标志映射',
  'field-item-use': '场景道具使用行为',
  'party-healing-service': '人物生命值回复服务',
  'sprite-palette': '共享精灵调色板',
  'runtime-workspace': '模式叠加的运行工作区',
  'party-vehicle-selection-provider': '队伍战车名称选择服务',
  'role-equipment-service': '人物装备位与物品删除同步服务',
  'vehicle-equipment-service': '战车装备、载重与装甲回复服务',
  'shared-indexed-byte-overlays': '固定页重叠索引表',
  'ui-adventure-data-mode': '冒险资料界面模式',
  'ui-item-session-service': '道具界面会话服务',
  'ui-text-provider-workspace': '界面文字提供者运行工作区',
  'ui-text-provider-zero-page-overlays': '界面文字提供者零页叠加视图',
  'ui-tool-inventory-control': '人物与战车工具物品界面',
  'ui-vehicle-armor-tile-removal': '战车装甲瓦片拆卸界面',
  'ui-vehicle-status': '战车详细状态界面',
  'ui-party-status': '人物标题行共享提供者',
  'shared-chr-bank': '共享图形图块库',
  'field-exploration-runtime': '场景探索帧运行服务',
  'field-movement-resolution-service': '场景移动方向与半步判定服务',
  'chr-bank-mapping-service': '图形页组映射服务',
  'raster-interrupt-runtime-service': '光栅中断显示服务',
  'prg-bank-mapping-service': '程序页组映射服务',
  'prg-bank-window-restore-service': '程序页窗口恢复服务',
  'field-terrain-behavior-service': '场景地形图块行为分发服务',
  'oam-object-rendering-service': '精灵对象渲染服务',
  'ppu-transfer-runtime-service': '图像处理器传输服务',
  'nametable-attribute-coordinate-service': '名称表属性坐标换算服务',
  'packed-attribute-quadrant-mask-set': '属性象限保留与清除掩码',
  'index-stride-table': '索引步长字节偏移表族',
});

function displayTitle(moduleId, summary) {
  if (MODULE_TITLES[moduleId]) return MODULE_TITLES[moduleId];
  const text = String(summary || "").trim();
  const separator = text.search(/[：:]/u);
  if (separator > 0 && separator <= 32) return text.slice(0, separator).trim();
  return text.split(/[；。]/u, 1)[0].trim() || moduleId;
}

function normalizeGraph(document, source) {
  if (!plainObject(document) || document.schema !== GRAPH_SCHEMA
      || !plainObject(document.modules)) {
    throw new TypeError(`${source}: 不是 ${GRAPH_SCHEMA} 模块图`);
  }
  const ids = Object.keys(document.modules).sort((left, right) =>
    left.localeCompare(right, "zh-CN"));
  if (!ids.length) throw new TypeError(`${source}: 模块图没有节点`);
  const idSet = new Set(ids);
  const reverse = new Map(ids.map(id => [id, []]));
  const modules = ids.map(id => {
    if (!MODULE_ID.test(id)) throw new TypeError(`${source}: 模块 ID 无效：${id}`);
    const raw = document.modules[id];
    if (!plainObject(raw)) throw new TypeError(`${source}: ${id} 不是模块定义`);
    const references = plainObject(raw.references)
      ? Object.entries(raw.references).map(([target, field]) => ({
          target,
          field: String(field || ""),
        }))
      : [];
    references.forEach(reference => {
      if (idSet.has(reference.target)) reverse.get(reference.target).push({
        source: id,
        field: reference.field,
      });
    });
    const family = moduleFamily(id);
    return {
      id,
      title: displayTitle(id, raw.summary),
      summary: String(raw.summary || ""),
      family,
      familyLabel: FAMILY_LABELS[family] || family,
      ownsSpaces: Array.isArray(raw.owns_spaces)
        ? raw.owns_spaces.map(String).sort() : [],
      references,
      referencedBy: [],
      byteDefinition: plainObject(raw.byte_definition)
        ? {...raw.byte_definition} : null,
      rootAudit: plainObject(raw.root_audit) ? {...raw.root_audit} : null,
      distinctKinds: plainObject(raw.distinct_kinds) ? {...raw.distinct_kinds} : null,
    };
  });
  const byId = new Map(modules.map(module => [module.id, module]));
  modules.forEach(module => {
    module.referencedBy = reverse.get(module.id)
      .sort((left, right) => left.source.localeCompare(right.source));
    Object.freeze(module.references);
    Object.freeze(module.referencedBy);
    Object.freeze(module.ownsSpaces);
    Object.freeze(module);
  });
  const normalization = plainObject(document.handle_normalization)
    ? Object.entries(document.handle_normalization)
      .filter(([prefix, value]) => prefix && plainObject(value) && idSet.has(value.to))
      .map(([prefix, value]) => ({
        prefix,
        target: value.to,
        why: String(value.why || ""),
      }))
      .sort((left, right) => right.prefix.length - left.prefix.length
        || left.prefix.localeCompare(right.prefix))
    : [];
  const families = [...new Map(modules.map(module => [module.family, {
    id: module.family,
    label: module.familyLabel,
  }])).values()].sort((left, right) =>
    left.label.localeCompare(right.label, "zh-CN") || left.id.localeCompare(right.id));
  return Object.freeze({
    schema: GRAPH_SCHEMA,
    source,
    note: String(document.note || ""),
    modules: Object.freeze(modules),
    families: Object.freeze(families),
    module(moduleId) {
      return byId.get(String(moduleId || "")) || null;
    },
    resolveHandle(handle) {
      const value = String(handle || "").trim();
      if (!value) return null;
      if (byId.has(value)) return {module: byId.get(value), handle: value, normalizedBy: null};
      const normalized = normalization.find(item =>
        value === item.prefix || value.startsWith(`${item.prefix}:`));
      if (normalized) return {
        module: byId.get(normalized.target),
        handle: value,
        normalizedBy: normalized,
      };
      const prefix = value.split(":", 1)[0];
      return byId.has(prefix)
        ? {module: byId.get(prefix), handle: value, normalizedBy: null}
        : null;
    },
  });
}

function createModuleCatalog(document, {source = "memory"} = {}) {
  return normalizeGraph(document, source);
}

let catalogPromise = null;

// 引用图按来源顺序读取，第一个有效来源即为权威。
async function loadModuleCatalog({
  fetcher = null,
  sources = MODULE_GRAPH_SOURCES,
  refresh = false,
} = {}) {
  if (!refresh && catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    const failures = [];
    for (const source of sources) {
      try {
        if (!fetcher && source === MODULE_GRAPH_SOURCES[0]) {
          const {db} = await import('./scene-actors-Cftr7mCE.js').then(function (n) { return n.projectDb; });
          return createModuleCatalog(await db.getPackageDocument("metadata/module-graph.json", null, {readonly: true}), {source});
        }
        if (!fetcher) throw new TypeError('自定义声明来源须注入读取器');
        const response = await fetcher(source, {cache: "no-store"});
        if (!response?.ok) throw new Error(`HTTP ${response?.status || "?"}`);
        return createModuleCatalog(await response.json(), {source});
      } catch (error) {
        failures.push(`${source}: ${error?.message || error}`);
      }
    }
    catalogPromise = null;
    throw new Error(`模块图均不可用：${failures.join("；")}`);
  })();
  return catalogPromise;
}

function moduleResourceDescriptors(moduleId, manifest, catalog = null) {
  const prefix = `${moduleId}:`;
  return (manifest?.browser_original_assets || [])
    .filter(descriptor => descriptor?.resource_id === moduleId
      || String(descriptor?.resource_id || "").startsWith(prefix)
      || catalog?.resolveHandle(descriptor?.resource_id)?.module.id === moduleId)
    .slice()
    .sort((left, right) => left.resource_id.localeCompare(right.resource_id));
}

// @editor-module 音序流的确定性模拟执行
//
// 这是 `mm_audio._resolve_stream_execution` 的浏览器实现。两边跑同一套语义，
// 输出逐字段相同（对拍见 engine/tests/audio_sequence_vm_parity.mjs）。
//
// 为什么要有它：`executions` 是**计算缓存**，不是内容表——每行都是对一条音序流
// 做一次模拟执行留下的轨迹，没有自己的 ROM 地址（地址在 `instructions` 行上）。
// 已发布的 sequence graph、playback 与 DPCM JSON 足以重算；缓存不该进发布包，预览
// 也不该依赖 Python、ROM baseline 或构建产物（见项目生命周期文档 §5）。
//
// 所有运行时事实都从已发布数据读：窗口、预算与栈上限在
// `sequence_graph.decoder`，voice 指针在 `sequence_graph.voice_table`，音高 timer
// 在 `audio.playback.period_table.entries`，时钟与噪声周期也在 `audio.playback`。
// BA 切到未来的自定义周期表时，只有该表也被发布后才能解析；当前严格 fail-closed，
// 绝不按 CPU 地址回退读取 ROM。

const EXECUTION_STATE_FIELDS = Object.freeze([
  "duration_raw",
  "transpose_raw",
  "gate_ratio_raw",
  "fine_timer_offset_raw",
  "duty_state_raw",
  "auto_duty_enabled",
  "auto_duty_interval",
  "envelope_flags_raw",
  "envelope_or_gate_rate_raw",
  "voice_id",
  "voice_pointer",
  "sweep_raw",
  "note_period_reload_enabled",
  "period_table_pointer",
  "tempo_increment_raw",
  "base_timer_raw",
  "sfx_volume_raw",
  "sfx_duty_raw",
  "pitch_mod_limit_or_delay_raw",
  "pitch_mod_phase_increment_raw",
  "pitch_mod_timer_delta_raw",
]);

const hex$1 = (value, width) =>
  `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

const signed8 = (value) => (value < 0x80 ? value : value - 0x100);

/** 八位 DEC-until-zero 计数器把 0 编码成 256 拍。 */
const counterTicks = (value) => (value ? value : 0x100);

/**
 * 与 Python `round(x, 6)` 同值。
 *
 * JS 没有等价内建：`toFixed` 按十进制字符串四舍五入，Python 按 double 的真实值
 * 取最近的六位小数、并列时取偶。这里先用 toFixed 拿候选，再比较两个候选到原值
 * 的距离，平局取偶——和 CPython 的 _Py_dg_dtoa 路径一致。
 */
function round6(value) {
  if (!Number.isFinite(value)) return value;
  const scale = 1e6;
  const scaled = value * scale;
  const low = Math.floor(scaled);
  const high = low + 1;
  const lowDiff = Math.abs(value - low / scale);
  const highDiff = Math.abs(high / scale - value);
  if (lowDiff < highDiff) return low / scale;
  if (highDiff < lowDiff) return high / scale;
  return (low % 2 === 0 ? low : high) / scale;
}

/** 已发布的窗口表 → `_sequence_prg_offset` / `_sequence_cpu_address` 用的形状。 */
function sequenceWindows(decoder) {
  const windows = new Map();
  for (const entry of decoder?.windows || []) {
    const address = entry.address || {};
    const cpuStart = Number(address.cpu_address);
    windows.set(entry.selected_bank ?? null, {
      id: entry.id,
      prgStart: Number(address.offset),
      prgEnd: Number(address.end_exclusive),
      cpuStart,
      cpuEnd: cpuStart + Number(address.length),
    });
  }
  return windows;
}

const BANKED = new Set([0x0d, 0x0e, 0x0f]);

function publishedInteger(value, label, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${label} must be an integer in ${minimum}..${maximum}`);
  }
  return value;
}

/**
 * graph.voice_table 是 voice id → 程序入口的唯一运行时事实来源。
 * 只有已经解码出 program 的行可用于试听；修改后未确认、保留项与缺行都返回 null。
 */
function publishedVoicePointers(graph) {
  if (!Array.isArray(graph?.voice_table)) {
    throw new TypeError("sequence_graph.voice_table must be a published array");
  }
  const pointers = new Map();
  for (const entry of graph.voice_table) {
    const voiceId = publishedInteger(
      entry?.id,
      "sequence_graph.voice_table[].id",
      0,
      0xff,
    );
    if (pointers.has(voiceId)) {
      throw new TypeError(`duplicate sequence_graph.voice_table id ${voiceId}`);
    }
    const decoded = String(entry?.status || "").startsWith("decoded-");
    if (!decoded || !entry?.program) {
      pointers.set(voiceId, null);
      continue;
    }
    pointers.set(
      voiceId,
      publishedInteger(
        entry.pointer,
        `sequence_graph.voice_table[${voiceId}].pointer`,
        0,
        0xffff,
      ),
    );
  }
  return pointers;
}

/** playback.period_table.entries 是 timer 与原始两字节的唯一运行时来源。 */
function publishedPeriodTable(playback) {
  const table = playback?.period_table;
  if (!table || !Array.isArray(table.entries) || !table.entries.length) {
    throw new TypeError(
      "audio.playback.period_table.entries must be a non-empty published array",
    );
  }
  const pointer = publishedInteger(
    table.pointer,
    "audio.playback.period_table.pointer",
    0,
    0xffff,
  );
  const declaredCount = publishedInteger(
    table.entry_count,
    "audio.playback.period_table.entry_count",
    1,
    0x80,
  );
  if (declaredCount !== table.entries.length) {
    throw new TypeError(
      "audio.playback.period_table.entry_count must equal entries.length",
    );
  }
  const sourceAddress = table.pointer_initialiser;
  if (
    !sourceAddress ||
    sourceAddress.space !== "prg" ||
    !Number.isInteger(sourceAddress.offset)
  ) {
    throw new TypeError(
      "audio.playback.period_table.pointer_initialiser must be a published PRG address",
    );
  }
  const entries = table.entries.map((entry, index) => {
    if (entry?.index !== index) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].index must equal ${index}`,
      );
    }
    const timer = publishedInteger(
      entry.timer,
      `audio.playback.period_table.entries[${index}].timer`,
      0,
      0xffff,
    );
    if (
      !Array.isArray(entry.raw_bytes) ||
      entry.raw_bytes.length !== 2 ||
      entry.raw_bytes.some(value => !Number.isInteger(value) || value < 0 || value > 0xff)
    ) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].raw_bytes must contain two bytes`,
      );
    }
    if ((entry.raw_bytes[0] | (entry.raw_bytes[1] << 8)) !== timer) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}] timer/raw_bytes disagree`,
      );
    }
    const address = entry.address;
    if (!address || address.space !== "prg" || !Number.isInteger(address.offset)) {
      throw new TypeError(
        `audio.playback.period_table.entries[${index}].address must be a published PRG address`,
      );
    }
    return {timer, rawBytes: entry.raw_bytes, address};
  });
  return {pointer, entries, sourceAddress};
}

function createSequenceVm({graph, playback, dpcm}) {
  const decoder = graph?.decoder || {};
  // 参数组数是参数表长度除以每组 3 字节（rate/flags、$4012 start、$4013 length），
  // 不是 DPCM 速率表的条目数——两者一个 14 一个 16。
  const dpcmParameterCount = Number(dpcm?.parameter_table?.length ?? 0) / 3;
  const windows = sequenceWindows(decoder);
  const local = windows.get(null);
  const stepBudget = Number(decoder.execution_step_budget_per_stream);
  const eventBudget = Number(decoder.execution_event_budget_per_stream);
  const stackLimits = decoder.stack_limits || {};
  const loopALimit = Number(stackLimits.loop_a);
  const loopBLimit = Number(stackLimits.loop_b);
  const callLimit = Number(stackLimits.call);

  const voicePointers = publishedVoicePointers(graph);
  const periodTable = publishedPeriodTable(playback);
  const defaultPeriodTableCpu = periodTable.pointer;
  const defaultPeriodTableCount = periodTable.entries.length;
  const periodTableSourceAddress = periodTable.sourceAddress;

  const cpuClockHz = Number(playback?.timing?.cpu_clock_hz);
  const noiseTimerPeriods = playback?.noise?.timer_periods_cpu_cycles || [];

  function sequencePrgOffset(cpuAddress, selectedBank) {
    if (cpuAddress >= 0x8000 && cpuAddress < 0xa000 && BANKED.has(selectedBank)) {
      const window = windows.get(selectedBank);
      const prgOffset = window.prgStart + cpuAddress - 0x8000;
      return prgOffset < window.prgEnd ? prgOffset : null;
    }
    if (cpuAddress >= local.cpuStart && cpuAddress < local.cpuEnd) {
      return local.prgStart + cpuAddress - local.cpuStart;
    }
    return null;
  }

  const sequenceContextId = (selectedBank) =>
    selectedBank === null || selectedBank === undefined
      ? "bank-1d-local"
      : `bank-${selectedBank.toString(16).padStart(2, "0")}`;

  const sequenceInstructionId = (selectedBank, parserMode, channelKey, prgOffset) =>
    `audio-seq-i:${sequenceContextId(selectedBank)}:${parserMode}:` +
    `${channelKey}:${prgOffset.toString(16).padStart(6, "0")}`;

  function validVoicePointer(voiceId) {
    return voicePointers.get(voiceId) ?? null;
  }

  function initialExecutionState(parserMode, channelIndex) {
    const music = parserMode === "music";
    const soundEffect = parserMode === "sound-effect";
    return {
      duration_raw: music ? 1 : null,
      transpose_raw: music ? 0 : null,
      gate_ratio_raw: music ? 0 : null,
      fine_timer_offset_raw: music ? 0 : null,
      duty_state_raw: null,
      auto_duty_enabled: music ? false : null,
      auto_duty_interval: null,
      envelope_flags_raw: music ? 0 : null,
      envelope_or_gate_rate_raw: null,
      voice_id: null,
      voice_pointer: null,
      sweep_raw: music && (channelIndex === 0 || channelIndex === 1) ? 0x08 : null,
      note_period_reload_enabled: music ? false : null,
      period_table_pointer: music ? defaultPeriodTableCpu : null,
      // tempo 是全局量而不是每条轨的，所有轨解析完之后才挂到各命令上。
      tempo_increment_raw: null,
      base_timer_raw: soundEffect ? 0 : null,
      sfx_volume_raw: soundEffect ? 0 : null,
      // $A50D 只初始化脉冲声道的 SFX duty；三角/噪声的输出路径不读这个别名，
      // 所以它们的值不编造。
      sfx_duty_raw: soundEffect && (channelIndex === 0 || channelIndex === 1) ? 2 : null,
      pitch_mod_limit_or_delay_raw: null,
      pitch_mod_phase_increment_raw: null,
      pitch_mod_timer_delta_raw: null,
    };
  }

  const stateKey = (state) =>
    JSON.stringify(EXECUTION_STATE_FIELDS.map((field) => state[field]));

  function stateSnapshot(state, index) {
    const snapshot = {index};
    for (const field of EXECUTION_STATE_FIELDS) snapshot[field] = state[field];
    const duration = state.duration_raw;
    snapshot.duration_effective_tempo_ticks =
      duration === null ? null : counterTicks(duration);
    const transpose = state.transpose_raw;
    snapshot.transpose_signed_semitones =
      transpose === null ? null : signed8(transpose);
    const fine = state.fine_timer_offset_raw;
    snapshot.fine_timer_offset_signed = fine === null ? null : signed8(fine);
    for (const field of [
      "voice_pointer",
      "period_table_pointer",
      "tempo_increment_raw",
      "base_timer_raw",
    ]) {
      const value = state[field];
      snapshot[`${field}_hex`] = value === null ? null : hex$1(value, 4);
    }
    return snapshot;
  }

  /** $A935-$A9A2 的定时器查表，逐字段照抄。 */
  function musicNotePlaybackFields({
    channelIndex,
    pitchNibble,
    transposeRaw,
    periodTablePointer,
    fineTimerOffsetRaw,
    periodTableSource,
  }) {
    const transposeSum = (transposeRaw + pitchNibble) & 0xff;
    const sourceAddress = periodTableSource.source_address;
    const sourceFields = {
      period_table_pointer_source_kind: periodTableSource.kind,
      period_table_pointer_source_instruction_id:
        periodTableSource.instruction_id ?? null,
      period_table_pointer_source_prg_offset: sourceAddress.offset,
      period_table_pointer_source_prg_offset_hex: hex$1(sourceAddress.offset, 6),
    };
    if (channelIndex === 3) {
      const timerPeriod = noiseTimerPeriods[pitchNibble];
      return {
        period_table_lookup_status: "not-applicable-noise-channel",
        period_table_pointer: periodTablePointer,
        period_table_pointer_hex: hex$1(periodTablePointer, 4),
        ...sourceFields,
        period_table_index: null,
        period_table_byte_offset: null,
        period_table_entry_prg_offset: null,
        period_table_timer_raw: null,
        fine_timer_offset_raw: fineTimerOffsetRaw,
        fine_timer_offset_signed: signed8(fineTimerOffsetRaw),
        effective_apu_timer: null,
        apu_frequency_hz: null,
        noise_period_index: pitchNibble,
        noise_timer_period_cpu_cycles: timerPeriod,
        noise_shift_register_clock_hz: round6(cpuClockHz / timerPeriod),
        noise_mode_bit: 0,
        noise_register_value: pitchNibble,
      };
    }

    // $A94B-$A953 是八位 ADC 后接 ASL A，所以间接 Y 的字节偏移把 $80-$FF 折回
    // $00-$7F。
    const tableIndex = transposeSum & 0x7f;
    const byteOffset = (transposeSum << 1) & 0xff;
    const entryCpu = (periodTablePointer + byteOffset) & 0xffff;
    let lookupStatus;
    if (periodTablePointer !== defaultPeriodTableCpu) {
      // BA 可以把指针切去任意地址，但 JSON 里没有该表就没有可验证的 timer。
      // 物理地址看起来可映射也不代表它是一张周期表，因此不能回退 ROM 猜读。
      lookupStatus = "unresolved-custom-period-table-not-published";
    } else if (tableIndex >= defaultPeriodTableCount) {
      lookupStatus = "index-outside-confirmed-default-table";
    } else {
      lookupStatus = "resolved-confirmed-default-table";
    }

    const common = {
      period_table_lookup_status: lookupStatus,
      period_table_pointer: periodTablePointer,
      period_table_pointer_hex: hex$1(periodTablePointer, 4),
      ...sourceFields,
      period_table_index_sum_raw: transposeSum,
      period_table_index: tableIndex,
      period_table_byte_offset: byteOffset,
      period_table_entry_cpu: entryCpu,
      period_table_entry_cpu_hex: hex$1(entryCpu, 4),
      fine_timer_offset_raw: fineTimerOffsetRaw,
      fine_timer_offset_signed: signed8(fineTimerOffsetRaw),
    };
    if (!lookupStatus.startsWith("resolved-")) {
      return {
        ...common,
        period_table_entry_prg_offset: null,
        period_table_entry_prg_offset_hex: null,
        period_table_entry_raw_low: null,
        period_table_entry_raw_high: null,
        period_table_timer_raw: null,
        effective_timer_before_11bit_mask: null,
        effective_apu_timer: null,
        apu_frequency_hz: null,
      };
    }

    const entry = periodTable.entries[tableIndex];
    const entryPrg = entry.address.offset;
    const rawLow = entry.rawBytes[0];
    const rawHigh = entry.rawBytes[1];
    const tableTimer = entry.timer;
    const signedOffset = signed8(fineTimerOffsetRaw);
    const unwrappedTimer = tableTimer + signedOffset;
    const timer16 = unwrappedTimer & 0xffff;
    const timer11 = timer16 & 0x07ff;
    const divider = channelIndex === 2 ? 32 : 16;
    return {
      ...common,
      period_table_entry_prg_offset: entryPrg,
      period_table_entry_prg_offset_hex: hex$1(entryPrg, 6),
      period_table_entry_raw_low: rawLow,
      period_table_entry_raw_high: rawHigh,
      period_table_timer_raw: tableTimer,
      period_table_timer_raw_hex: hex$1(tableTimer, 4),
      fine_offset_unwrapped_timer: unwrappedTimer,
      fine_offset_16bit_wrap_status:
        unwrappedTimer >= 0 && unwrappedTimer <= 0xffff ? "no-wrap" : "wrapped-16-bit",
      effective_timer_before_11bit_mask: timer16,
      effective_timer_before_11bit_mask_hex: hex$1(timer16, 4),
      effective_apu_timer: timer11,
      effective_apu_timer_hex: hex$1(timer11, 3),
      apu_timer_register_low: timer11 & 0xff,
      apu_timer_register_high_bits: (timer11 >> 8) & 0x07,
      apu_frequency_divider: divider,
      apu_frequency_hz: round6(cpuClockHz / (divider * (timer11 + 1))),
    };
  }

  /**
   * 跑一条轨，带具体的循环栈与子流调用栈。
   *
   * @param stream 已发布的 `sequence_graph.streams` 行
   * @param instructionsById uid → 已发布的 `sequence_graph.instructions` 行
   */
  function resolveExecution(stream, instructionsById) {
    const streamId = String(stream.id);
    const executionId = streamId.replace("audio-seq-s:", "audio-seq-x:");
    const parserMode = String(stream.parser_mode);
    const selectedBank = stream.selected_sequence_bank ?? null;
    const channelIndex = Number(stream.channel_index);
    const channelKey = String(stream.channel_key);
    if (parserMode !== "music" && parserMode !== "sound-effect") {
      return {
        id: executionId,
        stream_id: streamId,
        parser_mode: parserMode,
        status: "not-resolved-unknown-parser-mode",
        termination: {kind: "unknown-parser-mode"},
        executed_instruction_steps: 0,
        event_count: 0,
        events: [],
        state_snapshots: [],
        resolved_dynamic_edges: [],
      };
    }

    const state = initialExecutionState(parserMode, channelIndex);
    const initialUnknownFields = EXECUTION_STATE_FIELDS.filter(
      (field) => state[field] === null,
    );
    let initialStateEvidence;
    if (parserMode === "sound-effect") {
      initialStateEvidence = {
        base_timer_raw: {value: 0, source: "$A4F9/$A4FC"},
        sfx_volume_raw: {value: 0, source: "$A4FF"},
        effect_delay_counter_raw: {value: 1, source: "$A502-$A504"},
        sfx_duty_raw:
          channelIndex === 0 || channelIndex === 1
            ? {value: 2, source: "$A50B-$A50D"}
            : {
                value: null,
                status:
                  "not-initialised-and-not-read-by-this-channel-output-path",
                source: "$A507-$A519 and $A8D1 channel branch",
              },
      };
    } else {
      initialStateEvidence = {
        duration_raw: {value: 1, source: "$A461-$A466"},
        transpose_raw: {value: 0, source: "$A455"},
        gate_ratio_raw: {value: 0, source: "$A45E"},
        fine_timer_offset_raw: {value: 0, source: "$A45B"},
        envelope_flags_raw: {value: 0, source: "$A452"},
        period_table_pointer: {
          value: defaultPeriodTableCpu,
          value_hex: hex$1(defaultPeriodTableCpu, 4),
          source: "$A069-$A070 driver initialiser",
          source_address: periodTableSourceAddress,
        },
      };
    }
    let periodTableSource = {
      kind: "driver-initialiser",
      pointer_hex: hex$1(defaultPeriodTableCpu, 4),
      source_address: periodTableSourceAddress,
    };

    const stateSnapshots = [];
    const stateSnapshotIndices = new Map();
    const internState = () => {
      const key = stateKey(state);
      const existing = stateSnapshotIndices.get(key);
      if (existing !== undefined) return existing;
      const index = stateSnapshots.length;
      stateSnapshotIndices.set(key, index);
      stateSnapshots.push(stateSnapshot(state, index));
      return index;
    };

    const events = [];
    const initialStateIndex = internState();

    const appendEvent = (instructionId, kind, fields) => {
      if (events.length >= eventBudget) return false;
      const eventIndex = events.length;
      events.push({
        id: `${executionId}:event:${eventIndex}`,
        index: eventIndex,
        kind,
        instruction_id: instructionId,
        state_index: internState(),
        ...fields,
      });
      return true;
    };

    const loopA = [];
    const loopB = [];
    const callStack = [];
    const maxDepths = {loop_a: 0, loop_b: 0, call: 0};
    const instructionCounts = new Map();
    const firstSeenStructuralStates = new Map();
    const seenFullParserStates = new Map();
    let firstStructuralReturn = null;
    const dynamicEdges = new Map();

    function recordDynamicEdge(sourceId, kind, targetCpu) {
      let targetId = null;
      if (targetCpu !== null && targetCpu !== undefined) {
        const targetPrg = sequencePrgOffset(targetCpu, selectedBank);
        if (targetPrg !== null) {
          targetId = sequenceInstructionId(
            selectedBank,
            parserMode,
            channelKey,
            targetPrg,
          );
        }
      }
      const key = `${sourceId}\u0000${kind}\u0000${targetId ?? ""}`;
      let edge = dynamicEdges.get(key);
      if (edge === undefined) {
        edge = {
          source_instruction_id: sourceId,
          target_instruction_id: targetId,
          kind,
          status: "resolved-by-parser-stack-execution",
          occurrence_count: 0,
        };
        if (targetCpu !== null && targetCpu !== undefined) {
          edge.target_pointer = targetCpu;
          edge.target_pointer_hex = hex$1(targetCpu, 4);
        }
        dynamicEdges.set(key, edge);
      }
      edge.occurrence_count += 1;
    }

    const update8 = (field, operation, operand = 1) => {
      const current = state[field];
      if (current === null) return;
      state[field] =
        operation === "add" ? (current + operand) & 0xff : (current - operand) & 0xff;
    };
    const update16 = (field, operation, operand) => {
      const current = state[field];
      if (current === null) return;
      state[field] =
        operation === "add"
          ? (current + operand) & 0xffff
          : (current - operand) & 0xffff;
    };

    let pcCpu = Number(stream.entry_pointer);
    let steps = 0;
    let termination = null;

    while (steps < stepBudget) {
      const controlKey = `${pcCpu}\u0000${JSON.stringify(loopA)}\u0000${JSON.stringify(
        loopB,
      )}\u0000${JSON.stringify(callStack)}`;
      const currentState = stateKey(state);
      const previousStructural = firstSeenStructuralStates.get(controlKey);
      if (previousStructural !== undefined && firstStructuralReturn === null) {
        const [previousStep, previousEvent, previousState] = previousStructural;
        const previousValues = JSON.parse(previousState);
        const currentValues = JSON.parse(currentState);
        const stateChanges = [];
        EXECUTION_STATE_FIELDS.forEach((field, position) => {
          if (previousValues[position] !== currentValues[position]) {
            stateChanges.push({
              field,
              cycle_entry_value: previousValues[position],
              cycle_return_value: currentValues[position],
            });
          }
        });
        firstStructuralReturn = {
          first_structural_return_pointer: pcCpu,
          first_structural_return_pointer_hex: hex$1(pcCpu, 4),
          first_structural_return_start_step: previousStep,
          first_structural_return_step_count: steps - previousStep,
          first_structural_return_start_event_index: previousEvent,
          first_structural_return_event_count: events.length - previousEvent,
          modeled_parser_state_stable_at_first_control_return:
            stateChanges.length === 0,
          modeled_parser_state_changes_at_first_control_return: stateChanges,
        };
      }
      const fullKey = `${controlKey}\u0000${currentState}`;
      const previousFull = seenFullParserStates.get(fullKey);
      if (previousFull !== undefined) {
        const [previousStep, previousEvent] = previousFull;
        termination = {
          kind: "structural-control-cycle",
          structural_cycle_entry_pointer: pcCpu,
          structural_cycle_entry_pointer_hex: hex$1(pcCpu, 4),
          structural_cycle_start_step: previousStep,
          structural_cycle_step_count: steps - previousStep,
          structural_cycle_start_event_index: previousEvent,
          structural_cycle_event_count: events.length - previousEvent,
          modeled_parser_state_cycle_confirmed: true,
          ...(firstStructuralReturn || {}),
        };
        break;
      }
      if (!firstSeenStructuralStates.has(controlKey)) {
        firstSeenStructuralStates.set(controlKey, [
          steps,
          events.length,
          currentState,
        ]);
      }
      seenFullParserStates.set(fullKey, [steps, events.length]);

      const prgOffset = sequencePrgOffset(pcCpu, selectedBank);
      if (prgOffset === null) {
        termination = {
          kind: "outside-confirmed-sequence-windows",
          target_pointer: pcCpu,
          target_pointer_hex: hex$1(pcCpu, 4),
        };
        break;
      }
      const instructionId = sequenceInstructionId(
        selectedBank,
        parserMode,
        channelKey,
        prgOffset,
      );
      const node = instructionsById.get(instructionId);
      if (node === undefined) {
        termination = {
          kind: "instruction-not-in-conservative-graph",
          instruction_id: instructionId,
          target_pointer: pcCpu,
          target_pointer_hex: hex$1(pcCpu, 4),
        };
        break;
      }
      if (String(node.flow) === "unknown-stop") {
        termination = {
          kind: String(node.status),
          instruction_id: instructionId,
          opcode: Number(node.opcode),
        };
        break;
      }

      instructionCounts.set(
        instructionId,
        (instructionCounts.get(instructionId) || 0) + 1,
      );
      steps += 1;
      const opcode = Number(node.opcode);
      const raw = (node.raw_bytes || []).map(Number);
      const operands = raw.slice(1);
      const nextCpu = (pcCpu + Number(node.length)) & 0xffff;

      if (opcode < 0x90) {
        if (parserMode === "music" && opcode < 0x80) {
          state.duration_raw = opcode;
        } else if (parserMode === "music") {
          const pitchNibble = opcode - 0x80;
          const durationRaw = state.duration_raw;
          const transpose = state.transpose_raw;
          const eventFields = {
            raw_value: opcode,
            raw_value_hex: hex$1(opcode, 2),
            pitch_nibble: pitchNibble,
            duration_raw: durationRaw,
            duration_effective_tempo_ticks: counterTicks(durationRaw),
            transpose_raw: transpose,
            transpose_signed_semitones: signed8(transpose),
            ...musicNotePlaybackFields({
              channelIndex,
              pitchNibble,
              transposeRaw: transpose,
              periodTablePointer: state.period_table_pointer,
              fineTimerOffsetRaw: state.fine_timer_offset_raw,
              periodTableSource,
            }),
          };
          if (!appendEvent(instructionId, "note", eventFields)) {
            termination = {kind: "event-budget", limit: eventBudget};
            break;
          }
        } else if (
          !appendEvent(instructionId, "effect-delay", {
            duration_raw: opcode,
            duration_effective_driver_updates: counterTicks(opcode),
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
        pcCpu = nextCpu;
        continue;
      }

      if (opcode === 0x91) update8("transpose_raw", "add", 12);
      else if (opcode === 0x92) update8("transpose_raw", "subtract", 12);
      else if (opcode === 0x93) state.transpose_raw = operands[0];
      else if (opcode === 0x94) state.gate_ratio_raw = operands[0];
      else if (opcode === 0x96) state.duty_state_raw = operands[0];
      else if (opcode === 0x97) {
        state.auto_duty_enabled = true;
        state.auto_duty_interval = operands[0];
      } else if (opcode === 0x98) {
        state.auto_duty_enabled = false;
        state.duty_state_raw = 2;
      } else if (opcode === 0x99) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw = flags === null ? null : (flags | 0x40) & 0xcf;
        state.envelope_or_gate_rate_raw = operands[0];
      } else if (opcode === 0x9a) {
        const flags = state.envelope_flags_raw;
        if (channelIndex === 2) {
          state.envelope_flags_raw = flags === null ? null : (flags | 0x40) & 0xcf;
        } else {
          state.envelope_flags_raw = flags === null ? null : (flags | 0x60) & 0xef;
          state.voice_id = operands[0];
          state.voice_pointer = validVoicePointer(operands[0]);
        }
        state.envelope_or_gate_rate_raw = operands[1];
      } else if (opcode === 0x9b) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw =
          flags === null ? null : ((flags | 0x50) & 0xdf) | operands[0];
      } else if (opcode === 0x9c) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw =
          flags === null ? null : (flags | 0x70) | operands[0];
      } else if (opcode === 0x9d) {
        const flags = state.envelope_flags_raw;
        state.envelope_flags_raw = flags === null ? null : flags & 0x8f;
      } else if (opcode === 0x9e) state.sweep_raw = operands[0];
      else if (opcode === 0x9f) state.note_period_reload_enabled = true;
      else if (opcode === 0xa0) state.note_period_reload_enabled = false;
      else if (opcode === 0xa7) state.sfx_volume_raw = operands[0];
      else if (opcode === 0xa8) {
        state.base_timer_raw = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xa9) state.sfx_duty_raw = operands[0];
      else if (opcode === 0xab) update8("sfx_volume_raw", "add", operands[0]);
      else if (opcode === 0xac) update16("base_timer_raw", "add", operands[0]);
      else if (opcode === 0xad) update8("sfx_volume_raw", "add");
      else if (opcode === 0xaf) update8("sfx_duty_raw", "add");
      else if (opcode === 0xb0) update8("sfx_volume_raw", "subtract", operands[0]);
      else if (opcode === 0xb1) update16("base_timer_raw", "subtract", operands[0]);
      else if (opcode === 0xb2) update8("sfx_volume_raw", "subtract");
      else if (opcode === 0xba) {
        state.period_table_pointer = operands[0] | (operands[1] << 8);
        periodTableSource = {
          kind: "sequence-opcode-BA",
          instruction_id: instructionId,
          pointer: state.period_table_pointer,
          pointer_hex: hex$1(state.period_table_pointer, 4),
          source_address: node.address,
        };
      } else if (opcode === 0xbb) {
        state.tempo_increment_raw = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xc1) state.fine_timer_offset_raw = operands[0];
      else if (opcode === 0xc3) {
        state.pitch_mod_limit_or_delay_raw = operands[0];
        state.pitch_mod_phase_increment_raw = operands[1];
        state.pitch_mod_timer_delta_raw = operands[2];
      } else if (opcode === 0xc4) {
        const parameterId = operands[0];
        if (
          !appendEvent(instructionId, "dpcm-trigger-attempt", {
            dpcm_parameter_id: parameterId,
            dpcm_parameter_status:
              parameterId >= 1 && parameterId <= dpcmParameterCount
                ? "valid-one-based-id"
                : "out-of-range-no-bounds-check",
            gate_condition: "$06FD < 0x0A",
            gate_value_status: "runtime-dependent-not-modeled",
            trigger_status: "conditional-runtime-attempt",
            unconditional_write: {address: 0x4015, address_hex: "0x4015", value: 0x0f},
            gated_writes: "$4010-$4013 followed by $4015=$1F",
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode >= 0xd0 && opcode <= 0xdf) {
        state.gate_ratio_raw = opcode & 0x0f;
      } else if (opcode >= 0xe0 && opcode <= 0xe3) {
        state.duty_state_raw = opcode & 0x0f;
      }

      if (opcode === 0x90) {
        let appended;
        if (parserMode === "music") {
          const durationRaw = state.duration_raw;
          appended = appendEvent(instructionId, "rest", {
            duration_raw: durationRaw,
            duration_effective_tempo_ticks: counterTicks(durationRaw),
          });
        } else {
          appended = appendEvent(instructionId, "silence-yield", {
            duration_status: "opcode-does-not-write-$0613",
          });
        }
        if (!appended) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode === 0xa6) {
        if (
          !appendEvent(instructionId, "effect-delay", {
            duration_raw: operands[0],
            duration_effective_driver_updates: counterTicks(operands[0]),
            parser_semantic_status:
              parserMode === "sound-effect"
                ? "confirmed-sound-effect-parser"
                : "opcode-handler-writes-sfx-counter-in-music-stream",
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      } else if (opcode === 0xb9) {
        const registerBase = 0x4000 + channelIndex * 4;
        const writes = [
          {address: registerBase, address_hex: hex$1(registerBase, 4), value: operands[0]},
          {
            address: registerBase + 2,
            address_hex: hex$1(registerBase + 2, 4),
            value: operands[2],
          },
          {
            address: registerBase + 3,
            address_hex: hex$1(registerBase + 3, 4),
            value: operands[3],
          },
        ];
        if (channelIndex !== 2) {
          writes.splice(1, 0, {
            address: registerBase + 1,
            address_hex: hex$1(registerBase + 1, 4),
            value: operands[1],
          });
        }
        if (
          !appendEvent(instructionId, "raw-apu-frame", {
            register_writes: writes,
            consumed_register_1_value: operands[1],
            consumed_register_1_status:
              channelIndex === 2 ? "ignored-on-triangle" : "written",
            duration_raw: operands[4],
            duration_effective_driver_updates: counterTicks(operands[4]),
          })
        ) {
          termination = {kind: "event-budget", limit: eventBudget};
          break;
        }
      }

      if (opcode === 0xa1 || opcode === 0xa5) {
        pcCpu = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xa2) {
        termination = {kind: "music-channel-stop", instruction_id: instructionId};
        break;
      } else if (opcode === 0xa3) {
        if (loopA.length >= loopALimit) {
          termination = {
            kind: "loop-a-stack-overflow",
            instruction_id: instructionId,
            limit: loopALimit,
          };
          break;
        }
        const encodedCount = operands[0];
        loopA.push([nextCpu, counterTicks(encodedCount), encodedCount]);
        maxDepths.loop_a = Math.max(maxDepths.loop_a, loopA.length);
        pcCpu = nextCpu;
      } else if (opcode === 0xa4) {
        if (!loopA.length) {
          termination = {kind: "unmatched-loop-end-a", instruction_id: instructionId};
          break;
        }
        const frame = loopA[loopA.length - 1];
        const remaining = frame[1] - 1;
        if (remaining) {
          frame[1] = remaining;
          recordDynamicEdge(instructionId, "resolved-loop-a-back", frame[0]);
          pcCpu = frame[0];
        } else {
          loopA.pop();
          recordDynamicEdge(instructionId, "resolved-loop-a-exit", nextCpu);
          pcCpu = nextCpu;
        }
      } else if (opcode === 0xb6) {
        termination = {
          kind: "sound-effect-channel-stop",
          instruction_id: instructionId,
        };
        break;
      } else if (opcode === 0xbc) {
        if (loopB.length >= loopBLimit) {
          termination = {
            kind: "loop-b-stack-overflow",
            instruction_id: instructionId,
            limit: loopBLimit,
          };
          break;
        }
        const encodedCount = operands[0];
        loopB.push([nextCpu, counterTicks(encodedCount), encodedCount]);
        maxDepths.loop_b = Math.max(maxDepths.loop_b, loopB.length);
        pcCpu = nextCpu;
      } else if (opcode === 0xbd) {
        if (!loopB.length) {
          termination = {kind: "unmatched-loop-end-b", instruction_id: instructionId};
          break;
        }
        const frame = loopB[loopB.length - 1];
        const remaining = frame[1] - 1;
        if (remaining) {
          frame[1] = remaining;
          recordDynamicEdge(instructionId, "resolved-loop-b-back", frame[0]);
          pcCpu = frame[0];
        } else {
          loopB.pop();
          recordDynamicEdge(instructionId, "resolved-loop-b-exit", nextCpu);
          pcCpu = nextCpu;
        }
      } else if (opcode === 0xbe) {
        if (callStack.length >= callLimit) {
          termination = {
            kind: "substream-call-stack-overflow",
            instruction_id: instructionId,
            limit: callLimit,
          };
          break;
        }
        callStack.push(nextCpu);
        maxDepths.call = Math.max(maxDepths.call, callStack.length);
        pcCpu = operands[0] | (operands[1] << 8);
      } else if (opcode === 0xbf) {
        if (!callStack.length) {
          termination = {
            kind: "top-level-substream-return",
            instruction_id: instructionId,
          };
          break;
        }
        const continuation = callStack.pop();
        recordDynamicEdge(instructionId, "resolved-substream-return", continuation);
        pcCpu = continuation;
      } else if (opcode === 0xc0) {
        termination = {
          kind: "driver-parse-update-abort",
          instruction_id: instructionId,
          global_mode_value: operands[0],
        };
        break;
      } else {
        pcCpu = nextCpu;
      }
    }
    // 循环正常跑完（没 break）就是撞了步数预算——每个 break 都先写 termination，
    // 所以「termination 仍为空」等价于 Python 那边 while...else 的分支。
    if (termination === null) {
      termination = {kind: "execution-step-budget", limit: stepBudget};
    }
    const terminationKind = String(termination.kind);
    let status;
    if (terminationKind === "structural-control-cycle") {
      status = "resolved-structural-control-cycle";
    } else if (
      terminationKind === "music-channel-stop" ||
      terminationKind === "sound-effect-channel-stop" ||
      terminationKind === "driver-parse-update-abort"
    ) {
      status = "resolved-terminal";
    } else if (terminationKind === "top-level-substream-return") {
      status = "resolved-top-level-return";
    } else {
      status = "partial-explicit-stop";
    }
    const finalStateIndex = internState();

    let playbackLoop;
    if (
      terminationKind === "structural-control-cycle" &&
      termination.modeled_parser_state_cycle_confirmed
    ) {
      const cycleStart = Number(termination.structural_cycle_start_event_index);
      const cycleCount = Number(termination.structural_cycle_event_count);
      playbackLoop = {
        status: "exact-modeled-parser-state-cycle",
        looping: true,
        intro_event_start_index: 0,
        intro_event_count: cycleStart,
        cycle_event_start_index: cycleStart,
        cycle_event_count: cycleCount,
        cycle_step_start: Number(termination.structural_cycle_start_step),
        cycle_step_count: Number(termination.structural_cycle_step_count),
        recommended_preview_event_limit: cycleStart + cycleCount,
        fidelity:
          "exact sequence-parser state and event cycle; per-driver-update envelope, " +
          "auto-duty and pitch-modulation evolution remains synthesiser work",
      };
    } else if (status === "resolved-terminal" || status === "resolved-top-level-return") {
      playbackLoop = {
        status: "finite-event-sequence",
        looping: false,
        intro_event_start_index: 0,
        intro_event_count: events.length,
        cycle_event_start_index: null,
        cycle_event_count: 0,
        recommended_preview_event_limit: events.length,
        fidelity:
          "exact sequence-parser events through terminal; per-driver-update envelope, " +
          "auto-duty and pitch-modulation evolution remains synthesiser work",
      };
    } else {
      playbackLoop = {
        status: "unresolved-disable-automatic-looping",
        looping: null,
        intro_event_start_index: 0,
        intro_event_count: events.length,
        cycle_event_start_index: null,
        cycle_event_count: null,
        recommended_preview_event_limit: events.length,
        fidelity: "execution stopped at an explicit decoder budget or unknown boundary",
      };
    }

    const executedIds = [...instructionCounts.keys()].sort();
    const repeatedCounts = executedIds
      .filter((id) => instructionCounts.get(id) > 1)
      .map((id) => ({instruction_id: id, execution_count: instructionCounts.get(id)}));

    const resolvedDynamicEdges = [...dynamicEdges.values()].sort((left, right) => {
      const leftKey = [
        left.source_instruction_id,
        left.kind,
        left.target_instruction_id || "",
      ];
      const rightKey = [
        right.source_instruction_id,
        right.kind,
        right.target_instruction_id || "",
      ];
      for (let position = 0; position < 3; position += 1) {
        if (leftKey[position] < rightKey[position]) return -1;
        if (leftKey[position] > rightKey[position]) return 1;
      }
      return 0;
    });

    return {
      id: executionId,
      stream_id: streamId,
      parser_mode: parserMode,
      status,
      termination,
      executed_instruction_steps: steps,
      executed_unique_instruction_count: instructionCounts.size,
      executed_instruction_ids: executedIds,
      repeated_instruction_counts: repeatedCounts,
      event_count: events.length,
      events,
      playback_loop: playbackLoop,
      state_snapshots: stateSnapshots,
      initial_state_index: initialStateIndex,
      final_state_index: finalStateIndex,
      initial_unknown_fields: initialUnknownFields,
      initial_state_evidence: initialStateEvidence,
      maximum_stack_depths: maxDepths,
      resolved_dynamic_edges: resolvedDynamicEdges,
    };
  }

  return {resolveExecution};
}

// @editor-module 从音频文档建立音序 VM，按执行身份缓存并按需计算轨迹。
//
// `executions` 不在发布包里：它是对每条音序流做一次模拟执行留下的轨迹，没有自己
// 的 ROM 地址，由已发布的音序图、playback 与 DPCM JSON 就能重算——是计算缓存，
// 不是内容表。存下来要 22.2 MiB，重算 231 条只要 0.6 秒（Python 与浏览器实测
// 同量级），所以两侧都现算。
//
// 这里负责两件事：从该音频文档建一个 VM、按 execution_id 记忆化。它不读取项目
// baseline，也不观察构建状态；因此导入后的 JSON 在，预览就能工作。


// 以完整音频文档身份为键：graph 或 playback 换版本都会随文档一起自然作废。
const caches = new WeakMap();

/**
 * 备好某份音频文档的执行解析器。渲染音乐与音效页之前调用一次。
 *
 * graph 不存在时返回 false；已声明 graph 却缺少运行所需 JSON 时抛出明确错误。
 * 这属于发布包契约损坏，不能偷偷回退到 ROM 或把整页伪装成「暂无执行」。
 */
async function ensureSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  if (!graph || !Array.isArray(graph.streams)) return false;
  const existing = caches.get(audio);
  if (existing?.ready) return true;
  // 失败不缓存：文档 hydrate/修复后，同一个对象可以重新尝试。
  if (existing?.pending) return existing.pending;
  const cache = existing || {ready: false, byId: new Map()};
  caches.set(audio, cache);
  cache.pending = Promise.resolve().then(() => {
    cache.vm = createSequenceVm({
      graph,
      playback: audio.playback,
      dpcm: audio.dpcm,
    });
    cache.instructions = new Map(
      (graph.instructions || []).map(item => [item.id, item]),
    );
    cache.streamsById = new Map(
      (graph.streams || []).map(item => [String(item.execution_id || ""), item]),
    );
    cache.ready = true;
    return true;
  }).finally(() => {
    cache.pending = null;
  });
  return cache.pending;
}

/**
 * 全部执行轨迹，按已发布的 streams 顺序。音乐与音效页的执行/事件总表要它。
 *
 * 231 条一起算是 0.6 秒量级，而且和逐条取共用同一份记忆化结果——先点开总表再
 * 播某一轨，不会算第二遍。
 */
function allSequenceExecutions(audio) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready) return [];
  if (!cache.all) {
    cache.all = (graph.streams || [])
      .map(stream => sequenceExecution(audio, stream.execution_id))
      .filter(Boolean);
  }
  return cache.all;
}

/**
 * 取一条执行轨迹。必须先 `ensureSequenceExecutions`；没备好就返回 null，
 * 调用点按「这条轨没有可用执行」处理。
 */
function sequenceExecution(audio, executionId) {
  const graph = audio?.sequence_graph;
  const cache = graph && caches.get(audio);
  if (!cache?.ready || !executionId) return null;
  const id = String(executionId);
  const memoised = cache.byId.get(id);
  if (memoised !== undefined) return memoised;
  const stream = cache.streamsById.get(id);
  const resolved = stream
    ? cache.vm.resolveExecution(stream, cache.instructions)
    : null;
  cache.byId.set(id, resolved);
  return resolved;
}

// @editor-module 零依赖的 Metal Max 音序试听核心。
//
// 输入是 engine/tools/mm_audio.py 生成的 audio-index/v2 + audio-sequence/v2。
// 音高 timer 与 DPCM 原始字节必须已经内嵌在发布包中。执行轨迹（events /
// state_snapshots）不在包里，由 audio/executions.js 仅依据 audio index 与
// sequence graph JSON 现算——那是计算缓存，不是发布内容。缺少播放字段时
// 返回明确的不可播放原因。AudioContext 只会由
// unlock()/play*() 创建，因此调用方应从 click/pointerup 等用户手势中直接调用
// play*()。


const NES_APU_TIMING = Object.freeze({
  cpuHz: 1789773,
  driverHz: 60.0988,
  defaultSampleRate: 44100,
  // NTSC $4010 rate index 0..15，单位为 CPU cycle / DPCM bit。
  dpcmRateCycles: Object.freeze([
    428, 380, 340, 320, 286, 254, 226, 214,
    190, 160, 142, 128, 106, 85, 72, 54,
  ]),
  // NTSC noise timer period，单位为 CPU cycle / LFSR clock。
  noisePeriodCycles: Object.freeze([
    4, 8, 16, 32, 64, 96, 128, 160,
    202, 254, 380, 508, 762, 1016, 2034, 4068,
  ]),
});

const NES_APU_CHANNEL_KEYS = Object.freeze([
  "pulse-1", "pulse-2", "triangle", "noise", "dpcm",
]);

const DEFAULT_LOOP_PREVIEW_SECONDS = 120;
const DEFAULT_MAX_RENDER_SECONDS = 120;
// 该驱动初始化路径把 DPCM DAC 从 0 开始；调用方仍可显式覆盖以预览其他运行态。
const DEFAULT_DPCM_DAC = 0;
const DUTY_RATIOS = Object.freeze([1 / 8, 1 / 4, 1 / 2, 3 / 4]);

let audibleOwner = null;

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value)));
}

function asBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) return Uint8Array.from(value);
  return null;
}

function uniquePush(target, value) {
  if (value && !target.includes(value)) target.push(value);
}

function nesTndOutput(triangle, noise, dpcm) {
  const input = Number(triangle) / 8227
    + Number(noise) / 12241
    + Number(dpcm) / 22638;
  return input > 0 ? 159.79 / (1 / input + 100) : 0;
}

function commandNumber(value) {
  if (Number.isInteger(value)) return value;
  const text = String(value ?? "").trim();
  if (/^0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text.slice(2), 16);
  if (/^[0-9a-f]{1,2}$/i.test(text) && /[a-f]/i.test(text)) {
    return Number.parseInt(text, 16);
  }
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return Number.NaN;
}

function counterDuration(value) {
  const byte = Number(value) & 0xFF;
  return byte || 0x100;
}

function takeTempoTicks(scheduler, tickCount, raw, driverHz) {
  if (!Number.isInteger(raw)) return null;
  const ticks = Math.max(0, Math.floor(Number(tickCount)));
  const increment = (Number(raw) & 0xFFFF) + 1;
  const tickUpdateOffsets = [];
  let updates = 0;
  while (tickUpdateOffsets.length < ticks) {
    scheduler.accumulator += increment;
    updates += 1;
    if (scheduler.accumulator >= 0x10000) {
      scheduler.accumulator -= 0x10000;
      tickUpdateOffsets.push(updates);
    }
  }
  return {
    updates,
    durationSeconds: updates / driverHz,
    tickBoundariesSeconds: tickUpdateOffsets.map(value => value / driverHz),
  };
}

function elapsedTempoTicks(boundaries, localSeconds) {
  let low = 0;
  let high = boundaries?.length || 0;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (boundaries[middle] <= localSeconds) low = middle + 1;
    else high = middle;
  }
  return low;
}

function eventDurationSeconds(event, state, parserMode, sharedTempoRaw, driverHz) {
  if (parserMode === "music") return Number.NaN;
  const updates = Number(
    event.duration_effective_driver_updates
    ?? (event.duration_raw === undefined ? 0 : counterDuration(event.duration_raw)),
  );
  return Math.max(0, updates) / driverHz;
}

function audioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function userGestureIsUnavailable() {
  const activation = globalThis.navigator?.userActivation;
  return activation && activation.isActive === false;
}

function copySlice(bytes, start, length) {
  const result = bytes.subarray(start, start + length);
  return new Uint8Array(result);
}

/** Decode NES DPCM bits (least-significant bit first) at a requested PCM rate. */
function decodeNesDpcm(bytesInput, {
  rateIndex = 15,
  ratePeriodCpuCycles = null,
  sampleRate = NES_APU_TIMING.defaultSampleRate,
  cpuHz = NES_APU_TIMING.cpuHz,
  initialDac = DEFAULT_DPCM_DAC,
  loop = false,
  maxSeconds = DEFAULT_MAX_RENDER_SECONDS,
} = {}) {
  const bytes = asBytes(bytesInput);
  if (!bytes) throw new TypeError("DPCM bytes must be Uint8Array-compatible");
  const rate = Number(rateIndex);
  const explicitPeriod = Number(ratePeriodCpuCycles);
  if (!(explicitPeriod > 0) && (!Number.isInteger(rate) || rate < 0 || rate > 15)) {
    throw new RangeError("DPCM rateIndex must be 0..15 when no rate period is supplied");
  }
  const outputRate = Math.max(8000, Math.floor(Number(sampleRate)));
  const ratePeriod = explicitPeriod > 0 ? explicitPeriod : NES_APU_TIMING.dpcmRateCycles[rate];
  const bitSeconds = ratePeriod / Number(cpuHz);
  const onePassSeconds = bytes.length * 8 * bitSeconds;
  const duration = loop
    ? Math.max(0, Math.min(Number(maxSeconds), DEFAULT_MAX_RENDER_SECONDS))
    : Math.min(onePassSeconds, Number(maxSeconds));
  const sampleCount = Math.max(1, Math.ceil(duration * outputRate));
  const dacValues = new Float32Array(sampleCount);
  let dac = clamp(Math.floor(initialDac), 0, 127);
  let bitIndex = 0;
  let nextBitTime = 0;
  const totalBits = bytes.length * 8;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const time = sampleIndex / outputRate;
    while (time >= nextBitTime && (loop || bitIndex < totalBits)) {
      const sourceBit = loop ? bitIndex % totalBits : bitIndex;
      const bit = (bytes[sourceBit >> 3] >> (sourceBit & 7)) & 1;
      if (bit) {
        if (dac <= 125) dac += 2;
      } else if (dac >= 2) {
        dac -= 2;
      }
      bitIndex += 1;
      nextBitTime += bitSeconds;
      if (!totalBits) break;
    }
    dacValues[sampleIndex] = dac;
  }
  return {
    sampleRate: outputRate,
    durationSeconds: sampleCount / outputRate,
    bitSeconds,
    initialDac: clamp(Math.floor(initialDac), 0, 127),
    finalDac: dac,
    dacValues,
  };
}

function graphIndexes(audio) {
  const graph = audio?.sequence_graph || {};
  return {
    graph,
    // 执行轨迹不在发布包里，按 execution_id 现算并记忆化（见 executions.js）。
    // 接口保持 `.get(id)`，调用点不用关心它是查表还是现算。
    executions: {get: id => sequenceExecution(audio, id)},
    streams: new Map((graph.streams || []).map(item => [item.id, item])),
    voices: new Map((graph.voice_table || []).map(item => [Number(item.id), item])),
  };
}

function voiceFrames(voice) {
  const program = voice?.program;
  if (!program || !Array.isArray(program.instructions) || !program.instructions.length) return [];
  const instructions = new Map(program.instructions.map(item => [item.id, item]));
  const next = new Map();
  for (const edge of program.edges || []) {
    if (edge.target_instruction_id && !next.has(edge.source_instruction_id)) {
      next.set(edge.source_instruction_id, edge.target_instruction_id);
    }
  }
  const frames = [];
  let duty = null;
  let programIndex = 0;
  let current = program.instructions[0]?.id;
  const visits = new Map();
  while (current && frames.length < 4096) {
    const count = (visits.get(current) || 0) + 1;
    visits.set(current, count);
    if (count > 16) break;
    const instruction = instructions.get(current);
    if (!instruction) break;
    if (instruction.kind === "terminal-silence") {
      frames.push({level: 0, duty, programIndexAfterRead: Math.min(0xFF, programIndex + 1)});
      break;
    }
    if (instruction.kind === "set-inline-duty") {
      duty = Number(instruction.duty_state_raw) & 3;
      programIndex = Math.min(0xFF, programIndex + Number(instruction.raw_bytes?.length || 1));
    } else if (instruction.kind === "level") {
      programIndex = Math.min(0xFF, programIndex + Number(instruction.raw_bytes?.length || 1));
      frames.push({
        level: Number(instruction.level_raw) & 15,
        duty,
        programIndexAfterRead: programIndex,
      });
    }
    current = next.get(current);
  }
  return frames;
}

function findSharedTempo(command, indexes, warnings) {
  const playbackTempo = command.playback?.tempo;
  if (Number.isInteger(playbackTempo?.increment_raw)) {
    return Number(playbackTempo.increment_raw) & 0xFFFF;
  }
  const values = [];
  for (const track of command.tracks || []) {
    const execution = indexes.executions.get(track.execution_id);
    for (const snapshot of execution?.state_snapshots || []) {
      if (snapshot.tempo_increment_raw !== null && snapshot.tempo_increment_raw !== undefined) {
        const value = Number(snapshot.tempo_increment_raw) & 0xFFFF;
        if (!values.includes(value)) values.push(value);
      }
    }
  }
  if (values.length > 1) uniquePush(warnings, "tempo-changes-use-event-state");
  if (!values.length) {
    const resetFallback = playbackTempo?.reset_fallback_increment_raw;
    return Number.isInteger(resetFallback) ? resetFallback & 0xFFFF : null;
  }
  return values[0];
}

function playbackLoop(execution) {
  const proven = execution?.playback_loop;
  if (proven?.status === "exact-modeled-parser-state-cycle"
      && proven.looping === true
      && Number.isInteger(proven.cycle_event_start_index)
      && Number.isInteger(proven.cycle_event_count)
      && proven.cycle_event_count > 0) {
    return {
      start: proven.cycle_event_start_index,
      count: proven.cycle_event_count,
      status: proven.status,
      proven: true,
    };
  }
  return null;
}

function rawApuFields(event, channelKey) {
  const writes = new Map((event.register_writes || []).map(item => [Number(item.address), Number(item.value)]));
  if (channelKey === "triangle") {
    const low = writes.get(0x400A);
    const high = writes.get(0x400B);
    return {
      timer: low === undefined || high === undefined ? null : low | ((high & 7) << 8),
      volume: (writes.get(0x4008) ?? 0) & 0x7F ? 15 : 0,
      duty: null,
    };
  }
  const base = channelKey === "pulse-1" ? 0x4000
    : channelKey === "pulse-2" ? 0x4004 : 0x400C;
  if (channelKey === "noise") {
    const control = writes.get(base);
    const period = writes.get(0x400E);
    return {
      timer: period ?? null,
      volume: control === undefined ? null : control & 15,
      duty: null,
    };
  }
  const control = writes.get(base);
  const low = writes.get(base + 2);
  const high = writes.get(base + 3);
  return {
    timer: low === undefined || high === undefined ? null : low | ((high & 7) << 8),
    volume: control === undefined ? null : control & 15,
    duty: control === undefined ? null : (control >> 6) & 3,
  };
}

function voiceFrameAt(segment, tempoTicks) {
  const frames = segment.envelope || [];
  if (!frames.length) return null;
  const threshold = Number(segment.envelopeThreshold);
  const advancesPerTick = threshold > 0 ? Math.floor(30 / threshold) : 0;
  if (!advancesPerTick || tempoTicks <= 0) return frames[0];
  // note 起点直接读 voice[0]，但 index 仍为 0；第一个 tempo tick 因而再次读
  // voice[0]。其后每 threshold credit 读一个普通 level，inline duty 不额外耗 credit。
  const consumedLevels = tempoTicks * advancesPerTick;
  return frames[Math.min(Math.max(0, consumedLevels - 1), frames.length - 1)];
}

function scaledVoiceLevel(level, gateScale) {
  const raw = Number(level) & 15;
  const gate = Number(gateScale) & 15;
  if (!raw || !gate) return 0;
  return Math.max(1, Math.floor(raw * gate / 16));
}

function envelopeIndexAfterTicks(segment, tempoTicks) {
  if (segment.channelKey === "triangle") return Math.min(0xFF, tempoTicks);
  const threshold = Number(segment.envelopeThreshold);
  if (!(threshold > 0)) return 0;
  const frame = voiceFrameAt(segment, tempoTicks);
  return frame?.programIndexAfterRead || 0;
}

function pitchModTimers(baseTimer, state, segment, tickCount, channelKey) {
  const timers = new Uint16Array(Math.max(1, tickCount + 1));
  timers.fill(Number(baseTimer) & 0x7FF);
  if (channelKey === "noise") return timers;
  const delay = Number(state?.pitch_mod_limit_or_delay_raw) & 0xFF;
  const phaseIncrement = Number(state?.pitch_mod_phase_increment_raw) & 0xFF;
  const delta = Number(state?.pitch_mod_timer_delta_raw) & 0xFFFF;
  if (!phaseIncrement || !delta) return timers;
  const base = Number(baseTimer) & 0x7FF;
  let current = base;
  let phase = 0;
  let quadrant = 0;
  for (let tick = 1; tick <= tickCount; tick += 1) {
    const envelopeIndex = envelopeIndexAfterTicks(segment, tick);
    if (envelopeIndex > delay) {
      const targetQuadrant = phase <= 0x1E ? 1
        : phase <= 0x3E ? 2
          : phase <= 0x5E ? 3 : 4;
      if (targetQuadrant !== quadrant) {
        const subtract = targetQuadrant === 1 || targetQuadrant === 4;
        const target = current + (subtract ? -delta : delta);
        if (target >= 0 && target < 0x700) current = target;
        quadrant = targetQuadrant;
      }
      phase = (phase + phaseIncrement) & 0xFF;
      if (phase & 0x80) {
        phase = 0;
        quadrant = 0;
        current = base;
      }
    }
    timers[tick] = current & 0x7FF;
  }
  return timers;
}

function sweepTimers(baseTimer, sweepRaw, channelKey, duration, driverHz) {
  const sweep = Number(sweepRaw) & 0xFF;
  if (!(sweep & 0x80) || !(sweep & 7)
      || (channelKey !== "pulse-1" && channelKey !== "pulse-2")) return null;
  const halfFrameHz = driverHz * 2;
  const count = Math.max(1, Math.ceil(duration * halfFrameHz) + 1);
  const timers = new Int16Array(count);
  let timer = Number(baseTimer) & 0x7FF;
  const period = ((sweep >> 4) & 7) + 1;
  const shift = sweep & 7;
  for (let clock = 0; clock < count; clock += 1) {
    timers[clock] = timer;
    if ((clock + 1) % period) continue;
    const change = timer >> shift;
    const target = (sweep & 8)
      ? timer - change - (channelKey === "pulse-1" ? 1 : 0)
      : timer + change;
    if (timer < 8 || target < 0 || target > 0x7FF) timer = -1;
    else timer = target;
  }
  return {timers, halfFrameHz};
}

function nativeSegment(
  channelKey, event, state, duration, timer, voice, warningTarget, noisePeriods,
  tickBoundaries, driverHz,
) {
  let volume = 0;
  let duty = null;
  let envelope = null;
  if (event.kind === "raw-apu-frame") {
    const raw = rawApuFields(event, channelKey);
    timer = raw.timer;
    volume = raw.volume ?? 0;
    duty = raw.duty;
    if (channelKey === "triangle") {
      uniquePush(warningTarget, "raw-triangle-linear-counter-frame-approximation");
    }
  } else if (event.kind === "effect-delay") {
    timer = Number(state?.base_timer_raw ?? 0);
    volume = Number(state?.sfx_volume_raw ?? 0) & 15;
    duty = state?.sfx_duty_raw === null || state?.sfx_duty_raw === undefined
      ? null : Number(state.sfx_duty_raw) & 3;
  } else if (event.kind === "note") {
    if (channelKey === "triangle") {
      volume = 15;
    } else {
      envelope = Array.isArray(voice) ? voice : voiceFrames(voice);
      if (!envelope.length) {
        uniquePush(warningTarget, `missing-voice-program:${state?.voice_id ?? "unknown"}`);
        return null;
      }
      volume = envelope[0]?.level ?? 0;
      duty = state?.duty_state_raw === null || state?.duty_state_raw === undefined
        ? null : Number(state.duty_state_raw) & 3;
    }
  }
  if (timer === null || timer === undefined || !Number.isFinite(Number(timer))) return null;
  const segment = {
    channelKey,
    kind: event.kind,
    duration,
    timer: Number(timer),
    noisePeriodCycles: channelKey === "noise"
      ? Number(event.noise_timer_period_cpu_cycles ?? noisePeriods?.[Number(timer) & 15])
      : null,
    volume,
    duty,
    envelope,
    envelopeThreshold: Number(state?.envelope_or_gate_rate_raw),
    gateScale: event.kind === "note" ? Number(state?.gate_ratio_raw) & 15 : 15,
    triangleGateCountdown: channelKey === "triangle" && event.kind === "note"
      ? Number(state?.envelope_or_gate_rate_raw) & 0xFF : Number.POSITIVE_INFINITY,
    tempoTickBoundaries: tickBoundaries || [],
    sweepRaw: Number(state?.sweep_raw) & 0xFF,
    autoDutyEnabled: Boolean(state?.auto_duty_enabled),
    event,
  };
  segment.pitchModTimers = event.kind === "note"
    ? pitchModTimers(
      segment.timer,
      state,
      segment,
      segment.tempoTickBoundaries.length,
      channelKey,
    )
    : Uint16Array.of(segment.timer & 0x7FF);
  segment.sweep = event.kind === "note"
    ? sweepTimers(segment.timer, segment.sweepRaw, channelKey, duration, driverHz)
    : null;
  if (segment.sweep) uniquePush(warningTarget, "hardware-sweep-half-frame-phase-approximation");
  return segment;
}

class MetalMaxNesApuSynth {
  constructor(audio, options = {}) {
    this.audio = audio;
    this.options = options;
    this.sampleRate = Math.max(8000, Math.floor(
      Number(options.sampleRate) || NES_APU_TIMING.defaultSampleRate,
    ));
    const playbackTiming = audio?.playback?.timing || {};
    this.cpuHz = Number(playbackTiming.cpu_clock_hz);
    this.driverHz = Number(playbackTiming.video_frame_rate_hz)
      * Number(playbackTiming.driver_updates_per_video_frame);
    this.maxPreviewSeconds = clamp(
      options.maxPreviewSeconds ?? DEFAULT_LOOP_PREVIEW_SECONDS,
      1,
      DEFAULT_MAX_RENDER_SECONDS,
    );
    this.dpcmGatePolicy = options.dpcmGatePolicy || "skip-unknown";
    this.initialDpcmDac = clamp(
      options.initialDpcmDac
      ?? audio?.playback?.dpcm?.initial_dac_level
      ?? DEFAULT_DPCM_DAC,
      0,
      127,
    );
    this._indexes = graphIndexes(audio);
    this._commandById = new Map((audio?.commands || []).map(item => [Number(item.id), item]));
    this._voiceFrameCache = new Map();
    this._dpcmByteCache = new Map();
    this._decodedDpcmCache = new Map();
    this._noisePeriods = audio?.playback?.noise?.timer_periods_cpu_cycles || [];
    this._listeners = new Set();
    if (typeof options.onState === "function") this._listeners.add(options.onState);
    this._state = Object.freeze({status: "idle"});
    this._volume = clamp(options.volume ?? 0.75, 0, 1);
    this._context = null;
    this._gain = null;
    this._source = null;
    this._channelSources = [];
    this._channelGains = new Map();
    this._channelEnabled = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, true]));
    this._playToken = 0;
  }

  get state() {
    return this._state;
  }

  get volume() {
    return this._volume;
  }

  subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener must be a function");
    this._listeners.add(listener);
    listener(this._state);
    return () => this._listeners.delete(listener);
  }

  _emit(status, details = {}) {
    this._state = Object.freeze({status, ...details});
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (error) {
        globalThis.console?.error?.("audio state listener failed", error);
      }
    }
  }

  setVolume(value) {
    this._volume = clamp(value, 0, 1);
    if (this._gain && this._context) {
      this._gain.gain.setValueAtTime(this._volume, this._context.currentTime);
    }
    return this._volume;
  }

  setChannelEnabled(channelKey, enabled) {
    if (!this._channelEnabled.has(channelKey)) throw new RangeError(`unknown channel: ${channelKey}`);
    this._channelEnabled.set(channelKey, Boolean(enabled));
    const gain = this._channelGains.get(channelKey);
    if (gain && this._context) gain.gain.setValueAtTime(enabled ? 1 : 0, this._context.currentTime);
    return Boolean(enabled);
  }

  isChannelEnabled(channelKey) {
    return this._channelEnabled.get(channelKey) ?? false;
  }

  channelGain(channelKey) {
    const gain = this._channelGains.get(channelKey);
    return gain ? gain.gain.value : this.isChannelEnabled(channelKey) ? 1 : 0;
  }

  _schemaProblem() {
    if (!(this.cpuHz > 0) || !(this.driverHz > 0)) {
      return "missing-ntsc-playback-timing";
    }
    return null;
  }

  async _periodTimer(event, warnings) {
    if (!String(event.period_table_lookup_status || "").startsWith("resolved-")) {
      uniquePush(warnings, `unresolved-period-table:${event.period_table_lookup_status || "missing"}`);
      return null;
    }
    if (!Number.isInteger(event.effective_apu_timer)) {
      uniquePush(warnings, "missing-effective-apu-timer");
      return null;
    }
    return Number(event.effective_apu_timer) & 0x7FF;
  }

  async _dpcmBytes(sample) {
    const id = Number(sample?.id);
    if (this._dpcmByteCache.has(id)) return this._dpcmByteCache.get(id);
    const bytes = asBytes(sample?.raw_bytes);
    if (!bytes || bytes.length !== Number(sample?.sample_length || 0)) return null;
    const copy = copySlice(bytes, 0, bytes.length);
    this._dpcmByteCache.set(id, copy);
    return copy;
  }

  async _decodedDpcm(sample, options) {
    const initialDac = options.initialDpcmDac ?? sample.initial_dac_level;
    const loop = Boolean(options.loop ?? sample.loop);
    const maxSeconds = options.maxSeconds ?? this.maxPreviewSeconds;
    const key = [sample.id, this.sampleRate, initialDac, loop ? maxSeconds : "once"].join(":");
    if (!this._decodedDpcmCache.has(key)) {
      this._decodedDpcmCache.set(key, (async () => {
        const bytes = await this._dpcmBytes(sample);
        if (!bytes) return null;
        return decodeNesDpcm(bytes, {
          rateIndex: sample.rate_index,
          ratePeriodCpuCycles: sample.rate_period_cpu_cycles,
          sampleRate: this.sampleRate,
          cpuHz: this.cpuHz,
          initialDac,
          loop,
          maxSeconds,
        });
      })());
    }
    return this._decodedDpcmCache.get(key);
  }

  _sampleById(id) {
    return (this.audio?.dpcm?.samples || []).find(item => Number(item.id) === Number(id));
  }

  async _dpcmSegment(event, start, options, warnings, assumptions) {
    const sample = this._sampleById(event.dpcm_parameter_id);
    if (!sample) {
      uniquePush(warnings, `missing-dpcm-parameter:${event.dpcm_parameter_id}`);
      return null;
    }
    if (event.trigger_status === "conditional-runtime-attempt") {
      const policy = options.dpcmGatePolicy || this.dpcmGatePolicy;
      if (policy !== "assume-open") {
        uniquePush(warnings, `dpcm-gate-runtime-unknown:${sample.id_hex}`);
        return null;
      }
      uniquePush(assumptions, `assume-$06FD<0x0A-for-dpcm:${sample.id_hex}`);
    }
    const decoded = await this._decodedDpcm(sample, options);
    if (!decoded) {
      uniquePush(warnings, `missing-dpcm-sample-bytes:${sample.id_hex}`);
      return null;
    }
    if (options.initialDpcmDac !== undefined) {
      uniquePush(assumptions, `override-dpcm-initial-dac:${decoded.initialDac}`);
    }
    return {
      channelKey: "dpcm",
      kind: "dpcm",
      start,
      end: start + decoded.durationSeconds,
      dacValues: decoded.dacValues,
      sample,
      event,
    };
  }

  async _compileEventList({
    events, execution, stream, channelKey, start, deadline, sharedTempoRaw,
    options, warnings, assumptions, nativeSegments, dpcmSegments, tempoScheduler,
  }) {
    let cursor = start;
    for (const event of events) {
      if (cursor >= deadline) break;
      const state = execution.state_snapshots?.[event.state_index] || null;
      if (event.kind === "dpcm-trigger-attempt") {
        for (let index = dpcmSegments.length - 1; index >= 0; index -= 1) {
          const active = dpcmSegments[index];
          if (active.start <= cursor && active.end > cursor) {
            // $C4 always writes $4015=$0F before evaluating $06FD, so even a closed
            // runtime gate stops the currently playing DPCM sample.
            active.end = cursor;
            break;
          }
        }
        if (!options.channelKey || options.channelKey === "dpcm") {
          const dpcm = await this._dpcmSegment(event, cursor, options, warnings, assumptions);
          if (dpcm) dpcmSegments.push(dpcm);
        } else if (!options.channelKey) ;
        continue;
      }
      let duration;
      let tickBoundaries = [];
      if (execution.parser_mode === "music") {
        const tickCount = Number(
          event.duration_effective_tempo_ticks
          ?? (event.duration_raw === undefined ? 0 : counterDuration(event.duration_raw)),
        );
        const tempoRaw = state?.tempo_increment_raw ?? sharedTempoRaw;
        const timing = takeTempoTicks(tempoScheduler, tickCount, tempoRaw, this.driverHz);
        if (!timing) {
          uniquePush(warnings, "missing-command-tempo-for-independent-playback");
          continue;
        }
        duration = timing.durationSeconds;
        tickBoundaries = timing.tickBoundariesSeconds;
      } else {
        duration = eventDurationSeconds(
          event, state, execution.parser_mode, sharedTempoRaw, this.driverHz,
        );
      }
      if (!(duration > 0)) continue;
      const end = Math.min(deadline, cursor + duration);
      if (!options.channelKey || options.channelKey === channelKey) {
        if (event.kind !== "rest") {
          let timer = null;
          if (event.kind === "note") {
            if (channelKey === "noise") timer = Number(event.noise_period_index) & 15;
            else timer = await this._periodTimer(event, warnings);
          }
          let voice = state?.voice_id === null || state?.voice_id === undefined
            ? null : this._indexes.voices.get(Number(state.voice_id));
          if (voice) {
            if (!this._voiceFrameCache.has(voice.id)) {
              this._voiceFrameCache.set(voice.id, voiceFrames(voice));
            }
            voice = this._voiceFrameCache.get(voice.id);
          }
          const segment = nativeSegment(
            channelKey, event, state, end - cursor, timer, voice, warnings,
            this._noisePeriods, tickBoundaries, this.driverHz,
          );
          if (segment) {
            segment.start = cursor;
            segment.end = end;
            nativeSegments.push(segment);
            if (segment.autoDutyEnabled) uniquePush(warnings, "auto-duty-not-time-synthesised");
          }
        }
      }
      cursor += duration;
    }
    return cursor;
  }

  async _compileTrack(command, track, sharedTempoRaw, options, result) {
    const execution = this._indexes.executions.get(track.execution_id);
    const stream = this._indexes.streams.get(execution?.stream_id || track.stream_id);
    const channelKey = track.channel_key || stream?.channel_key;
    if (!execution || !stream || !channelKey) {
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: "unplayable",
        reason: "missing-stream-or-execution",
      });
      return;
    }
    if (options.channelKey && options.channelKey !== channelKey && options.channelKey !== "dpcm") {
      return;
    }
    const events = execution.events || [];
    const loop = playbackLoop(execution);
    const deadline = Number(options.maxSeconds ?? this.maxPreviewSeconds);
    let cursor = 0;
    const tempoScheduler = {accumulator: 0};
    const compile = selected => this._compileEventList({
      events: selected,
      execution,
      stream,
      channelKey,
      start: cursor,
      deadline,
      sharedTempoRaw,
      options,
      warnings: result.warnings,
      assumptions: result.assumptions,
      nativeSegments: result.nativeSegments,
      dpcmSegments: result.dpcmSegments,
      tempoScheduler,
    });
    if (loop && loop.count > 0) {
      const prefix = events.slice(0, loop.start);
      const repeated = events.slice(loop.start, loop.start + loop.count);
      cursor = await compile(prefix);
      const firstLoopStart = cursor;
      const before = cursor;
      if (cursor < deadline && repeated.length) cursor = await compile(repeated);
      const passes = cursor > before ? 1 : 0;
      uniquePush(result.loopStatuses, loop.status);
      if (!loop.proven) uniquePush(result.warnings, "structural-loop-state-not-proven-stable");
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: loop.status,
        executionStatus: execution.status,
        durationSeconds: Math.min(cursor, deadline),
        loopStartSeconds: firstLoopStart,
        renderedLoopPasses: passes,
      });
    } else {
      cursor = await compile(events);
      const playbackStatus = execution.playback_loop?.status || execution.status;
      uniquePush(result.loopStatuses, playbackStatus);
      if (execution.termination?.kind === "structural-control-cycle") {
        uniquePush(result.warnings, "structural-loop-not-automatically-repeated");
      }
      result.trackReports.push({
        trackId: track.track_id,
        channelKey,
        status: playbackStatus,
        executionStatus: execution.status,
        durationSeconds: Math.min(cursor, deadline),
      });
    }
    result.durationSeconds = Math.max(result.durationSeconds, Math.min(cursor, deadline));
  }

  _nativeValue(segment, time, noiseState) {
    const local = time - segment.start;
    const tempoTicks = elapsedTempoTicks(segment.tempoTickBoundaries, local);
    let volume = segment.volume & 15;
    let duty = segment.duty;
    if (segment.envelope?.length) {
      const frame = voiceFrameAt(segment, tempoTicks);
      volume = scaledVoiceLevel(frame?.level ?? 0, segment.gateScale);
      if (frame?.duty !== null && frame?.duty !== undefined) duty = frame.duty;
    }
    let timer = segment.pitchModTimers?.[
      Math.min(tempoTicks, (segment.pitchModTimers?.length || 1) - 1)
    ] ?? segment.timer;
    if (segment.sweep) {
      const sweepIndex = Math.min(
        Math.floor(local * segment.sweep.halfFrameHz),
        segment.sweep.timers.length - 1,
      );
      timer = segment.sweep.timers[sweepIndex];
    }
    if (segment.channelKey === "pulse-1" || segment.channelKey === "pulse-2") {
      if (timer < 0) return 0;
      timer &= 0x7FF;
      if (timer < 8 || !volume) return 0;
      const frequency = this.cpuHz / (16 * (timer + 1));
      const phase = (local * frequency) % 1;
      return phase < DUTY_RATIOS[duty ?? 2] ? volume : 0;
    }
    if (segment.channelKey === "triangle") {
      const countdown = segment.triangleGateCountdown;
      if (!(segment.gateScale > 0) || tempoTicks >= countdown) return 0;
      timer &= 0x7FF;
      if (timer < 2 || !volume) return 0;
      const step = Math.floor(local * this.cpuHz / (timer + 1)) & 31;
      return step < 16 ? 15 - step : step - 16;
    }
    if (segment.channelKey === "noise") {
      if (!volume) return 0;
      segment.timer & 15;
      const period = segment.noisePeriodCycles;
      if (!(period > 0)) return 0;
      noiseState.accumulator += this.cpuHz / (period * this.sampleRate);
      while (noiseState.accumulator >= 1) {
        const tap = (segment.timer & 0x80) ? 6 : 1;
        const feedback = (noiseState.lfsr ^ (noiseState.lfsr >> tap)) & 1;
        noiseState.lfsr = (noiseState.lfsr >> 1) | (feedback << 14);
        noiseState.accumulator -= 1;
      }
      return (noiseState.lfsr & 1) ? 0 : volume;
    }
    return 0;
  }

  _mix(result) {
    const requested = Number(result.durationSeconds);
    const dpcmEnd = result.dpcmSegments.reduce((max, item) => Math.max(max, item.end), 0);
    const duration = Math.min(
      Math.max(requested, dpcmEnd, 1 / this.sampleRate),
      result.maxSeconds,
    );
    const sampleCount = Math.max(1, Math.ceil(duration * this.sampleRate));
    const pcm = new Float32Array(sampleCount);
    const channelPcm = Object.fromEntries(NES_APU_CHANNEL_KEYS.map(key => [key, new Float32Array(sampleCount)]));
    const channelFilter = NES_APU_CHANNEL_KEYS.map(() => ({input: 0, output: 0}));
    const byChannel = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, []]));
    for (const segment of result.nativeSegments) byChannel.get(segment.channelKey)?.push(segment);
    for (const segment of result.dpcmSegments) byChannel.get("dpcm").push(segment);
    for (const [channelKey, segments] of byChannel) {
      segments.sort((a, b) => a.start - b.start);
      if (channelKey === "dpcm") {
        for (let index = 1; index < segments.length; index += 1) {
          // $C4 restarts the single DMC unit; a new request truncates the previous sample.
          segments[index - 1].end = Math.min(segments[index - 1].end, segments[index].start);
        }
      }
    }
    const positions = new Map(NES_APU_CHANNEL_KEYS.map(key => [key, 0]));
    const noiseState = {lfsr: 1, accumulator: 0};
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const time = sampleIndex / this.sampleRate;
      const native = {"pulse-1": 0, "pulse-2": 0, triangle: 0, noise: 0, dpcm: 0};
      for (const channelKey of NES_APU_CHANNEL_KEYS) {
        const segments = byChannel.get(channelKey);
        let position = positions.get(channelKey);
        while (position < segments.length && segments[position].end <= time) position += 1;
        positions.set(channelKey, position);
        const segment = segments[position];
        if (!segment || segment.start > time || segment.end <= time) continue;
        if (channelKey === "dpcm") {
          const index = Math.floor((time - segment.start) * this.sampleRate);
          native.dpcm = segment.dacValues[index] ?? 0;
        } else {
          native[channelKey] = this._nativeValue(segment, time, noiseState);
        }
      }
      let previousStage = 0;
      for (let index = 0; index < NES_APU_CHANNEL_KEYS.length; index += 1) {
        const key = NES_APU_CHANNEL_KEYS[index];
        const pulseSum = native["pulse-1"] + (index >= 1 ? native["pulse-2"] : 0);
        const pulse = pulseSum > 0 ? 95.88 / (8128 / pulseSum + 100) : 0;
        const mixed = pulse + nesTndOutput(index >= 2 ? native.triangle : 0,
          index >= 3 ? native.noise : 0, index >= 4 ? native.dpcm : 0);
        // 累积混音逐级求差；全开与原非线性输出一致，关一路时其余声道样本不变。
        const filter = channelFilter[index];
        filter.output = mixed - filter.input + 0.995 * filter.output;
        filter.input = mixed;
        const stage = Math.tanh(filter.output * 2.2);
        channelPcm[key][sampleIndex] = stage - previousStage;
        previousStage = stage;
      }
      pcm[sampleIndex] = previousStage;
    }
    result.pcm = pcm;
    result.channelPcm = channelPcm;
    result.durationSeconds = sampleCount / this.sampleRate;
    result.sampleRate = this.sampleRate;
    result.channelCount = 1;
    result.nativeSegmentCount = result.nativeSegments.length;
    result.dpcmSegmentCount = result.dpcmSegments.length;
    delete result.nativeSegments;
    delete result.dpcmSegments;
    return result;
  }

  async renderCommand(commandId, options = {}) {
    const schemaProblem = this._schemaProblem();
    if (schemaProblem) return {ok: false, status: "unplayable", reason: schemaProblem};
    const id = commandNumber(commandId);
    const command = this._commandById.get(id);
    if (!command) return {ok: false, status: "unplayable", reason: "unknown-command-id"};
    if (!command.available || command.kind === "control") {
      return {
        ok: false,
        status: "unplayable",
        reason: "command-is-control-or-disabled",
        commandId: id,
      };
    }
    const channelKey = options.channelKey || null;
    if (channelKey && !NES_APU_CHANNEL_KEYS.includes(channelKey)) {
      return {ok: false, status: "unplayable", reason: `unknown-channel-key:${channelKey}`};
    }
    const maxSeconds = clamp(
      options.maxSeconds ?? this.maxPreviewSeconds,
      0.05,
      Math.max(DEFAULT_MAX_RENDER_SECONDS, Number(options.timelineSeconds) || 0),
    );
    const result = {
      ok: true,
      status: "rendered",
      commandId: id,
      commandIdHex: command.id_hex,
      commandKind: command.kind,
      canonicalCommandId: command.canonical_command_id,
      channelKey,
      maxSeconds,
      durationSeconds: 0,
      warnings: [],
      assumptions: [],
      loopStatuses: [],
      trackReports: [],
      nativeSegments: [],
      dpcmSegments: [],
      fidelity: {
        driverTiming: "embedded-ntsc-rate-and-16-bit-tempo-accumulator-per-track-preview",
        pitch: "embedded-effective-11-bit-apu-timer-required",
        envelope: "current-ROM-$9A-voice-credit-and-triangle-gate-on-tempo-ticks",
        pitchModulation: "current-ROM-$C3-four-quadrant-timer-state-machine",
        sweep: "current-ROM-$8E-hardware-sweep-with-approximate-half-frame-phase",
        loops: "proven-playback-loop-preferred-otherwise-structural-preview",
        mixing: "NES-nonlinear-channel-formula-with-simple-dc-filter",
      },
    };
    const sharedTempoRaw = findSharedTempo(command, this._indexes, result.warnings);
    result.tempo = {
      sharedIncrementRaw: sharedTempoRaw,
      sharedIncrementHex: Number.isInteger(sharedTempoRaw)
        ? `0x${sharedTempoRaw.toString(16).padStart(4, "0").toUpperCase()}` : null,
      defaultEvidence: command.kind !== "music"
        ? "not-applicable-sound-effect-driver-update-timing"
        : sharedTempoRaw === 0xFFFF
          ? "driver-init-$05F9/$05FA=$FFFF" : "sequence-set-tempo-increment",
      schedulingStatus: command.kind === "music"
        ? "per-track-accumulator-preview" : "driver-update-counts",
    };
    if (command.kind === "music") {
      uniquePush(result.warnings, "tempo-intertrack-scheduling-approximation");
    }
    const seenExecutions = new Set();
    for (const track of command.tracks || []) {
      // Alias headers can expose the same execution more than once. Preserve distinct APU tracks,
      // but never render one execution twice for the same channel.
      const key = `${track.channel_key}:${track.execution_id}`;
      if (seenExecutions.has(key)) continue;
      seenExecutions.add(key);
      await this._compileTrack(command, track, sharedTempoRaw, {...options, channelKey, maxSeconds}, result);
    }
    if (channelKey === "dpcm" && !result.dpcmSegments.length) {
      uniquePush(result.warnings, "command-has-no-renderable-dpcm-trigger");
    }
    const mixed = this._mix(result);
    const peak = mixed.pcm.reduce((value, sample) => Math.max(value, Math.abs(sample)), 0);
    mixed.peak = peak;
    if (peak === 0) {
      mixed.status = "rendered-silence";
      uniquePush(mixed.warnings, "no-audible-segment-from-proven-events");
    } else if (mixed.warnings.length) {
      mixed.status = "rendered-partial";
    }
    return mixed;
  }

  async renderDpcmSample(sampleId, options = {}) {
    const schemaProblem = this._schemaProblem();
    if (schemaProblem) return {ok: false, status: "unplayable", reason: schemaProblem};
    const sample = this._sampleById(sampleId);
    if (!sample) {
      return {ok: false, status: "unplayable", reason: "unknown-dpcm-parameter-id"};
    }
    const bytes = await this._dpcmBytes(sample);
    if (!bytes) {
      return {
        ok: false,
        status: "unplayable",
        reason: "missing-dpcm-sample-bytes",
        sampleId: sample.id,
      };
    }
    const decoded = decodeNesDpcm(bytes, {
      rateIndex: sample.rate_index,
      ratePeriodCpuCycles: sample.rate_period_cpu_cycles,
      sampleRate: options.sampleRate || this.sampleRate,
      cpuHz: this.cpuHz,
      initialDac: options.initialDpcmDac ?? sample.initial_dac_level,
      loop: Boolean(options.loop ?? sample.loop),
      maxSeconds: options.maxSeconds ?? this.maxPreviewSeconds,
    });
    const pcm = new Float32Array(decoded.dacValues.length);
    // $4011=0 is a zero-valued DMC input, not the midpoint of a signed PCM signal.
    // Establish the requested initial DAC as the pre-sample DC baseline, then use
    // the same nonlinear TND transfer and DC filter as command mixing. This keeps
    // a real first-bit transition while avoiding an artificial DAC-0 click.
    let previousInput = nesTndOutput(0, 0, decoded.initialDac);
    let previousOutput = 0;
    let peak = 0;
    for (let index = 0; index < pcm.length; index += 1) {
      const input = nesTndOutput(0, 0, decoded.dacValues[index]);
      const output = input - previousInput + 0.995 * previousOutput;
      previousInput = input;
      previousOutput = output;
      pcm[index] = Math.tanh(output * 2.2);
      peak = Math.max(peak, Math.abs(pcm[index]));
    }
    return {
      ok: true,
      status: "rendered",
      kind: "dpcm-sample",
      sampleId: sample.id,
      sampleIdHex: sample.id_hex,
      sampleRate: decoded.sampleRate,
      channelCount: 1,
      durationSeconds: decoded.durationSeconds,
      pcm,
      channelPcm: {dpcm: pcm},
      peak,
      warnings: [],
      assumptions: options.initialDpcmDac === undefined
        ? [] : [`override-dpcm-initial-dac:${decoded.initialDac}`],
      fidelity: {
        dpcm: "NES-delta-rules-and-NTSC-rate-table",
        mixing: "NES-nonlinear-DMC-TND-formula-with-simple-dc-filter",
        initialDac: options.initialDpcmDac === undefined
          ? "driver-reset-zero" : "caller-override",
      },
    };
  }

  async unlock() {
    try {
      if (!this._context) {
        if (userGestureIsUnavailable() && !this.options.allowContextWithoutUserGesture) {
          const result = {
            ok: false,
            status: "blocked",
            reason: "audio-context-requires-user-gesture",
          };
          this._emit("blocked", result);
          return result;
        }
        const factory = this.options.audioContextFactory;
        const Constructor = audioContextConstructor();
        if (!factory && !Constructor) {
          const result = {ok: false, status: "blocked", reason: "web-audio-api-unavailable"};
          this._emit("blocked", result);
          return result;
        }
        this._context = factory ? factory() : new Constructor({latencyHint: "interactive"});
        this._gain = this._context.createGain();
        this._gain.gain.value = this._volume;
        this._gain.connect(this._context.destination);
      }
      if (this._context.state === "suspended") {
        if (userGestureIsUnavailable() && !this.options.allowContextWithoutUserGesture) {
          const result = {
            ok: false,
            status: "blocked",
            reason: "audio-context-requires-user-gesture",
          };
          this._emit("blocked", result);
          return result;
        }
        await this._context.resume();
      }
      return {ok: true, status: "unlocked", state: this._context.state};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const name = error && typeof error === "object" ? String(error.name || "") : "";
      const failedContext = this._context;
      this._context = null;
      this._gain = null;
      if (failedContext && failedContext.state !== "closed"
          && typeof failedContext.close === "function") {
        try {
          await failedContext.close();
        } catch (_) {
          // Preserve the original construction/resume failure as the reported cause.
        }
      }
      const blocked = name === "NotAllowedError" || name === "SecurityError";
      const status = blocked ? "blocked" : "error";
      const result = {
        ok: false,
        status,
        reason: blocked ? "audio-context-start-blocked" : "audio-context-start-failed",
        error: message,
      };
      this._emit(status, {kind: "audio-context", ...result});
      return result;
    }
  }

  _unlockFailure(unlocked) {
    return {
      ok: false,
      status: unlocked?.status || "unplayable",
      reason: unlocked?.reason || "audio-context-not-unlocked",
      ...(unlocked?.error ? {error: unlocked.error} : {}),
    };
  }

  stop(reason = "user") {
    this._playToken += 1;
    const source = this._source;
    this._source = null;
    for (const channelSource of this._channelSources) {
      channelSource.onended = null;
      try { channelSource.stop(); } catch (_) { /* Already ended. */ }
      channelSource.disconnect();
    }
    this._channelSources = [];
    for (const gain of this._channelGains.values()) gain.disconnect();
    this._channelGains.clear();
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch (_) {
        // AudioBufferSourceNode may already have ended.
      }
      try {
        source.disconnect();
      } catch (_) {
        // A disconnected node is already silent.
      }
    }
    if (audibleOwner === this) audibleOwner = null;
    this._emit("stopped", {reason});
  }

  async _playRendered(rendered, kind, id, options = {}) {
    if (!rendered?.ok) {
      this._emit("unplayable", {
        kind,
        id,
        reason: rendered?.reason || "render-failed",
        rendered,
      });
      return rendered;
    }
    if (!this._context || !this._gain) {
      return {ok: false, status: "unplayable", reason: "audio-context-not-unlocked"};
    }
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    audibleOwner = this;
    const stems = rendered.channelPcm || {dpcm: rendered.pcm};
    const sources = [];
    for (const [key, pcm] of Object.entries(stems)) {
      if (!pcm?.length) continue;
      const buffer = this._context.createBuffer(1, pcm.length, rendered.sampleRate);
      buffer.copyToChannel(pcm, 0);
      const source = this._context.createBufferSource();
      const gain = this._context.createGain();
      gain.gain.value = this.isChannelEnabled(key) ? 1 : 0;
      source.buffer = buffer;
      source.playbackRate.value = Number(options.rate) || 1;
      source.connect(gain);
      gain.connect(this._gain);
      this._channelGains.set(key, gain);
      sources.push(source);
    }
    this._channelSources = sources;
    const source = sources[0];
    this._source = source;
    const token = ++this._playToken;
    source.onended = () => {
      if (this._source !== source || token !== this._playToken) return;
      this._source = null;
      for (const channelSource of this._channelSources) channelSource.disconnect();
      this._channelSources = [];
      for (const gain of this._channelGains.values()) gain.disconnect();
      this._channelGains.clear();
      if (audibleOwner === this) audibleOwner = null;
      this._emit("ended", {kind, id, rendered});
    };
    const startAt = this._context.currentTime + 0.01;
    for (const channelSource of sources) channelSource.start(startAt, Math.max(0, Number(options.offsetSeconds) || 0));
    this._emit("playing", {kind, id, rendered});
    return {...rendered, playback: "started"};
  }

  async playTimeline(rendered, options = {}) {
    const token = ++this._playToken;
    const unlocked = await this.unlock();
    if (token !== this._playToken) return {ok: false, status: "cancelled"};
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    return this._playRendered(rendered, "timeline", options.id, options);
  }

  async playCommand(commandId, options = {}) {
    // unlock() is intentionally the first awaited operation, so AudioContext construction/resume
    // still happens inside the caller's click/pointerup activation.
    const unlocked = await this.unlock();
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    const token = ++this._playToken;
    this._emit("rendering", {kind: "command", id: commandNumber(commandId)});
    try {
      const rendered = await this.renderCommand(commandId, options);
      if (token !== this._playToken) return {ok: false, status: "cancelled", reason: "playback-replaced"};
      return await this._playRendered(rendered, "command", commandNumber(commandId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._emit("error", {kind: "command", id: commandId, error: message});
      return {ok: false, status: "error", reason: message};
    }
  }

  async playDpcmSample(sampleId, options = {}) {
    const unlocked = await this.unlock();
    if (!unlocked.ok) return this._unlockFailure(unlocked);
    if (audibleOwner && audibleOwner !== this) audibleOwner.stop("superseded-by-another-audio-owner");
    if (this._source) this.stop("replaced");
    const token = ++this._playToken;
    this._emit("rendering", {kind: "dpcm-sample", id: Number(sampleId)});
    try {
      const rendered = await this.renderDpcmSample(sampleId, options);
      if (token !== this._playToken) return {ok: false, status: "cancelled", reason: "playback-replaced"};
      return await this._playRendered(rendered, "dpcm-sample", Number(sampleId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._emit("error", {kind: "dpcm-sample", id: sampleId, error: message});
      return {ok: false, status: "error", reason: message};
    }
  }

  async dispose() {
    this.stop("disposed");
    const context = this._context;
    this._context = null;
    this._gain = null;
    if (context && context.state !== "closed") await context.close();
    this._listeners.clear();
  }
}


function createNesApuSynth(audio, options) {
  return new MetalMaxNesApuSynth(audio, options);
}

// @editor-module 用现有合成器按剧情帧合成音乐、音效与淡出。
async function renderAudioTimeline(audio, synth, events, durationFrames, fps = 60) {
  const durationSeconds = Math.max(1 / fps, durationFrames / fps);
  const sampleRate = synth.sampleRate;
  const count = Math.ceil(durationSeconds * sampleRate);
  const channels = ["pulse-1", "pulse-2", "triangle", "noise", "dpcm"];
  const channelPcm = Object.fromEntries(channels.map(key => [key, new Float32Array(count)]));
  const commands = new Map((audio.commands || []).map(command => [Number(command.id), command]));
  const controls = new Map((audio.controls || []).map(control => [Number(control.id), control]));
  const renderedCommands = new Map();
  let music = null;
  const effects = new Map();
  let fade = null;
  let cursor = 0;
  const sorted = events.map((event, index) => ({...event, index}))
    .sort((a, b) => a.frame - b.frame || a.index - b.index);
  const renderSeconds = durationSeconds + Math.max(0, -(Number(sorted[0]?.frame) || 0) / fps);
  const reports = [];
  const mixUntil = end => {
    for (; cursor < end; cursor++) {
      const frame = cursor / sampleRate * fps;
      const fadeSteps = fade ? Math.floor((frame - fade.frame) / fade.interval) : 0;
      if (fade && fadeSteps >= 16) {
        music = null;
        effects.clear();
        fade = null;
      }
      const level = fade ? Math.max(0, 1 - fadeSteps / 16) : 1;
      for (const key of channels) {
        const effect = effects.get(key);
        const effectIndex = effect ? cursor - effect.start : -1;
        const source = effect && effectIndex < effect.pcm.length ? effect : music;
        const pcm = source?.rendered?.channelPcm?.[key] || source?.pcm;
        const index = source ? cursor - source.start : -1;
        if (pcm && index >= 0 && index < pcm.length) channelPcm[key][cursor] = pcm[index] * level;
      }
    }
  };
  for (const event of sorted) {
    const start = Math.min(count, Math.round(Number(event.frame) / fps * sampleRate));
    mixUntil(Math.max(0, start));
    const id = Number(event.command_id);
    const control = controls.get(id);
    if (control) {
      if (!(Number(control.interval) > 0)) throw new Error(`声音控制 ${id} 的步进时长未确认`);
      fade = {frame: Number(event.frame), interval: Number(control.interval)};
      reports.push({frame: event.frame, commandId: id, kind: "fade-control"});
      continue;
    }
    const command = commands.get(id);
    if (!command) throw new Error(`未知剧情声音命令 ${id}`);
    if (command.status === "audio-reset") {
      music = null;
      effects.clear();
      fade = null;
      reports.push({frame: event.frame, commandId: id, kind: "audio-reset"});
      continue;
    }
    let rendered = renderedCommands.get(id);
    if (!rendered) {
      rendered = await synth.renderCommand(id, {maxSeconds: renderSeconds,
        timelineSeconds: renderSeconds, dpcmGatePolicy: "assume-open"});
      if (!rendered.ok) throw new Error(rendered.reason || "剧情声音合成失败");
      if (rendered.trackReports.length && rendered.trackReports.every(track => track.status === "unplayable")) {
        throw new Error(`剧情声音命令 ${id} 缺少可播放音序`);
      }
      renderedCommands.set(id, rendered);
    }
    reports.push({frame: event.frame, commandId: id, kind: command.kind, warnings: rendered.warnings});
    if (command.kind === "music") {
      if (music?.rendered.commandId === id
          && ["scene-entry-music", "queue-sound-command-if-changed"].includes(event.dispatch)) continue;
      music = {rendered, start};
      fade = null;
    } else {
      for (const track of command.tracks || []) {
        const pcm = rendered.channelPcm?.[track.channel_key];
        const report = rendered.trackReports.find(item => item.channelKey === track.channel_key);
        if (pcm) effects.set(track.channel_key, {
          pcm: pcm.subarray(0, Math.ceil(Number(report?.durationSeconds ?? rendered.durationSeconds) * sampleRate)), start});
      }
    }
  }
  mixUntil(count);
  return {ok: true, status: "rendered", sampleRate, durationSeconds, channelPcm,
    reports, fidelity: "existing-command-synth-with-channel-overrides"};
}

// @editor-module 时间轴声音的准备、定位与播放生命周期。

const players = new Set();
subscribePreviewSound(enabled => {
  if (!enabled) for (const player of players) player.stop();
});

function createAudioTimelinePlayer(audio, events, duration, fps = 60) {
  const synth = createNesApuSynth(audio, {dpcmGatePolicy: "assume-open"});
  let token = 0;
  let disposed = false;
  let activated = false;
  let pending = null;
  const prepare = () => {
    pending ||= ensureSequenceExecutions(audio).then(() =>
      renderAudioTimeline(audio, synth, events, duration, fps));
    return pending;
  };
  const player = {
    synth, get ready() { return prepare(); }, get unlocked() { return activated; },
    async play(currentFrame, rate = 1) {
      if (!previewSoundEnabled()) return;
      const serial = ++token;
      const unlocked = await synth.unlock();
      if (serial !== token || disposed) return;
      if (!unlocked.ok) throw new Error(unlocked.error || unlocked.reason);
      activated = true;
      const rendered = await prepare();
      if (serial !== token || disposed) return;
      const frame = typeof currentFrame === "function" ? currentFrame() : currentFrame;
      const result = await synth.playTimeline(rendered, {offsetSeconds: frame / fps, rate});
      if (!result.ok && result.status !== "cancelled") throw new Error(result.reason);
      return result;
    },
    stop() {
      token++;
      synth.stop("timeline-paused");
    },
    dispose() {
      disposed = true;
      token++;
      players.delete(player);
      void synth.dispose();
    },
  };
  players.add(player);
  return player;
}

function stopAudioTimelines() {
  for (const player of [...players]) player.dispose();
}

// @editor-module 固定字段列的静态引用声明与候选表读取
//
// 正式声明可写在单值列的 column.reference；一列绑定多个值时，写在对应的
// column.paths[N].reference。引用数组与带引用子字段的对象仍在同一处声明 container，
// 每个叶子绑定自己的精确数值路径，不把容器序列化成单个 picker 的值。一个候选表
// 同时发布多个实体 owner 时，用 targets.owner/domains 按发布字段分域；禁止把 ID 范围
// 复制进声明。候选来源必须在引用叶子里点名，禁止扫模块图、清单或运行时资源来猜。
// 本文件的 SAMPLE 只用于本机制分支，避免改 static-tables.js 与清单子线撞文件。

const CODEC_ID = /^[a-z0-9][a-z0-9._/-]*$/u;
const opcodeOperandCodecs = new Map();
const encodedScalarCodecs = new Map();
const bitSliceCodecs = new Map();
const linkedFieldCodecs = new Map();
const contextAwareReferenceCodecs = new Map();

const SCENE_HANDLE_REFERENCE_CODEC_ID = "scene/opaque-handle/v1";

const SCENE_REFERENCE = Object.freeze({
  module: "scene-header-map",
  table: Object.freeze({
    document: "project.scenes",
    path: Object.freeze(["editable_scenes"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["name"]),
  description: Object.freeze(["slug"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
});

const SCENE_HANDLE_REFERENCE = Object.freeze({
  module: "scene-header-map",
  table: Object.freeze({
    document: "resource-index.scene",
    path: Object.freeze([]),
  }),
  key: Object.freeze(["uid"]),
  name: Object.freeze(["uid"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["game_id"]),
  preview: Object.freeze({component: "preview"}),
  scope: Object.freeze({
    path: Object.freeze(["kind"]),
    values: Object.freeze(["map-scene"]),
  }),
  container: Object.freeze({
    kind: "encoded-scalar",
    codec: SCENE_HANDLE_REFERENCE_CODEC_ID,
  }),
});

const FIXED_SCENE_REFERENCE_ARRAY = Object.freeze({
  ...SCENE_REFERENCE,
  container: Object.freeze({
    kind: "array",
    length: "fixed",
    size: 5,
    reorder: false,
  }),
});

const SCENE_ACTOR_TYPE_REFERENCE = Object.freeze({
  module: "actor-type",
  table: Object.freeze({
    resource: "actor-visual",
    path: Object.freeze(["actor_types"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["resource_id"]),
  description: Object.freeze(["motion_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({component: "preview"}),
  sentinels: Object.freeze([
    Object.freeze({
      value: 0x3f,
      label: "无形象",
      description: "场景角色明确不选择角色形象",
      meta: "保留值 63",
    }),
  ]),
});


const MONSTER_REFERENCE = Object.freeze({
  module: "monster-profile",
  table: Object.freeze({
    resource: "monster-profile",
    path: Object.freeze(["records"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["name"]),
  description: Object.freeze(["name_reference", "node_id"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["name"])}),
});

const ENCOUNTER_FORMATION_REFERENCE = Object.freeze({
  module: "encounter-formation",
  table: Object.freeze({
    resource: "battle-test-point",
    path: Object.freeze(["formations"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["writeback"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["label"])}),
});

function consumerScopedTextReference(targetPath, sourcePath) {
  return Object.freeze({
    module: "text-record",
    table: Object.freeze({
      document: "project.text-catalog",
      path: Object.freeze(["records"]),
    }),
    key: Object.freeze(["record"]),
    name: Object.freeze(["display_text"]),
    description: Object.freeze(["region_name"]),
    meta: Object.freeze(["node_id"]),
    preview: Object.freeze({path: Object.freeze(["unicode_preview"])}),
    scope: Object.freeze({
      path: Object.freeze([...targetPath]),
      source: Object.freeze([...sourcePath]),
    }),
  });
}

const SCENE_ACTOR_TEXT_REFERENCE = consumerScopedTextReference(
  ["region"],
  ["text_region"],
);

const STORY_INTERACTION_REFERENCE = Object.freeze({
  module: "story-interaction-script",
  table: Object.freeze({
    resource: "story-interaction-script",
    path: Object.freeze(["scripts"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["resource_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({path: Object.freeze(["label"])}),
});

const SCENE_ACTOR_INTERACTION_REFERENCE = Object.freeze({
  container: Object.freeze({
    kind: "consumer-dispatch",
    source: Object.freeze(["interaction_parameter_kind"]),
    domains: Object.freeze([
      Object.freeze({
        values: Object.freeze(["interaction-script-id"]),
        reference: STORY_INTERACTION_REFERENCE,
      }),
      Object.freeze({
        values: Object.freeze(["text-record-id"]),
        reference: SCENE_ACTOR_TEXT_REFERENCE,
      }),
      Object.freeze({
        values: Object.freeze(["service-argument"]),
        passthrough: Object.freeze({
          label: "服务参数",
          description: "当前语义分支是普通服务参数，不指向目标候选表",
        }),
      }),
      Object.freeze({
        values: Object.freeze(["none"]),
        passthrough: Object.freeze({
          label: "无主动交互",
          description: "当前语义分支明确不持有引用",
        }),
      }),
    ]),
  }),
});








const SHELL_VISUAL_REFERENCE_CODEC_ID = "shell-record/visual-selector/v1";
const AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID =
  "audio-voice/envelope-pointer/v1";
const AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID =
  "audio-command/track-sequence-pointer/v1";
const APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID =
  "application-config-family/configuration-pointer/v1";
const INVESTIGATION_HANDLER_SELECTOR_CODEC_ID =
  "investigation/packed-handler-instance/v1";

const SHELL_VISUAL_REFERENCE = Object.freeze({
  module: "attack-visual",
  table: Object.freeze({
    resource: "attack-visual",
    path: Object.freeze(["records"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["handle"]),
  description: Object.freeze(["decode_status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "bit-slice",
    codec: SHELL_VISUAL_REFERENCE_CODEC_ID,
  }),
});

const AUDIO_VOICE_ENVELOPE_REFERENCE = Object.freeze({
  module: "audio-sequence",
  table: Object.freeze({
    resource: "audio-sequence",
    path: Object.freeze(["voice_table"]),
  }),
  key: Object.freeze(["pointer"]),
  name: Object.freeze(["pointer_hex"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({path: Object.freeze(["id_hex"])}),
  sentinels: Object.freeze([
    Object.freeze({
      value: 0xb705,
      label: "保留音色",
      description: "音色表明确保留、没有包络程序入口",
      meta: "0xB705",
    }),
  ]),
  container: Object.freeze({
    kind: "linked-fields",
    codec: AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["envelope_pointer_high"]),
      Object.freeze(["envelope_pointer_low"]),
    ]),
    primary: Object.freeze(["envelope_pointer_high"]),
  }),
});

const AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE = Object.freeze({
  module: "audio-sequence",
  table: Object.freeze({
    document: "audio-sequence",
    path: Object.freeze(["streams"]),
  }),
  key: Object.freeze(["entry_pointer"]),
  name: Object.freeze(["source_command_ids"]),
  description: Object.freeze(["status"]),
  meta: Object.freeze(["channel_label"]),
  preview: Object.freeze({path: Object.freeze(["channel_label"])}),
  container: Object.freeze({
    kind: "linked-fields",
    codec: AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["track_sequence_pointer_high"]),
      Object.freeze(["track_sequence_pointer_low"]),
    ]),
    primary: Object.freeze(["track_sequence_pointer_high"]),
    length: "current",
    reorder: false,
  }),
});

const APPLICATION_CONFIG_FAMILY_REFERENCE = Object.freeze({
  module: "facility-config",
  table: Object.freeze({
    document: "project.facilities",
    path: Object.freeze(["configuration_loader", "pointer_entries"]),
  }),
  key: Object.freeze(["target_cpu"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["record_payload"]),
  meta: Object.freeze(["target_cpu_hex"]),
  preview: Object.freeze({path: Object.freeze(["family_id_hex"])}),
  container: Object.freeze({
    kind: "linked-fields",
    codec: APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID,
    paths: Object.freeze([
      Object.freeze(["configuration_pointer_high"]),
      Object.freeze(["configuration_pointer_low"]),
    ]),
    primary: Object.freeze(["configuration_pointer_high"]),
  }),
});

const INVESTIGATION_HANDLER_REFERENCE = Object.freeze({
  module: "investigation-command",
  table: Object.freeze({
    document: "project.facilities",
    path: Object.freeze(["investigation", "commands"]),
  }),
  key: Object.freeze(["investigation_selector"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["kind"]),
  meta: Object.freeze(["command_id_hex"]),
  preview: Object.freeze({path: Object.freeze(["command_id_hex"])}),
  container: Object.freeze({
    kind: "bit-slice",
    codec: INVESTIGATION_HANDLER_SELECTOR_CODEC_ID,
  }),
});

const DEAD_ACTOR_TYPE_REFERENCE_ARRAY = Object.freeze({
  module: "actor-type",
  table: Object.freeze({
    resource: "actor-visual",
    path: Object.freeze(["actor_types"]),
  }),
  key: Object.freeze(["resource_id"]),
  name: Object.freeze(["resource_id"]),
  description: Object.freeze(["motion_id"]),
  meta: Object.freeze(["id"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "array",
    length: "current",
    reorder: false,
  }),
});

const DEFAULT_FIELD_ITEM_HANDLER_PROVIDER = Object.freeze({
  module: "field-item-use",
  container: Object.freeze({
    kind: "provider-code",
    role: "code:default-field-item-handler",
  }),
});

// battle-test-point 已结构化发布实际 handler 入口；provider 只把该标量交给 owner
// 做身份匹配，不在字段层从 stored pointer 复刻「入口减一」编码。
const BATTLE_TEST_HANDLER_PROVIDER = Object.freeze({
  module: "nearby-object-investigation-service",
  container: Object.freeze({
    kind: "provider-code",
    source: Object.freeze(["handler_cpu"]),
    roles: Object.freeze([
      "code:battle-test-handler",
      "code:original-wardrobe-handler",
    ]),
  }),
});

const ATTACK_VISUAL_COMMANDS_CODEC_ID = "attack-visual/commands/v1";
const ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID =
  "attack-visual-aux-script/commands/v1";

function publishedOperandReference(module, resource, {
  name,
  description,
  preview,
}) {
  return Object.freeze({
    module,
    table: Object.freeze({resource, path: Object.freeze(["records"])}),
    key: Object.freeze(["id"]),
    name: Object.freeze([name]),
    description: Object.freeze([description]),
    meta: Object.freeze(["id_hex"]),
    preview: Object.freeze(preview),
  });
}

const PUBLISHED_ATTACK_VISUAL_OPERAND_REFERENCE = publishedOperandReference(
  "attack-visual",
  "attack-visual",
  {name: "handle", description: "decode_status", preview: {component: "preview"}},
);
const PUBLISHED_AUX_SCRIPT_OPERAND_REFERENCE = publishedOperandReference(
  "attack-visual-aux-script",
  "attack-visual-aux-script",
  {name: "handle", description: "decode_status", preview: {path: Object.freeze(["handle"])}},
);
const PUBLISHED_AUDIO_COMMAND_OPERAND_REFERENCE = publishedOperandReference(
  "audio-command",
  "audio-command",
  {name: "label", description: "status", preview: {component: "preview"}},
);
const PUBLISHED_BATTLE_ACTION_OPERAND_REFERENCE = publishedOperandReference(
  "battle-action",
  "battle-action",
  {name: "handle", description: "layout_reference", preview: {path: Object.freeze(["handle"])}},
);
const PUBLISHED_SPRITE_PALETTE_OPERAND_REFERENCE = publishedOperandReference(
  "sprite-palette",
  "sprite-palette",
  {name: "handle", description: "consumer_status", preview: {path: Object.freeze(["id_hex"])}},
);

function attackVisualCommandReference(codec) {
  return Object.freeze({
    container: Object.freeze({
      kind: "opcode-operands",
      codec,
      references: Object.freeze([
        Object.freeze({
          token: "visual_code",
          label: "嵌套攻击视觉",
          reference: PUBLISHED_ATTACK_VISUAL_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "script_id",
          label: "辅助脚本",
          reference: PUBLISHED_AUX_SCRIPT_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "sound_id",
          label: "音频命令",
          reference: PUBLISHED_AUDIO_COMMAND_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "action",
          label: "战斗动作",
          reference: PUBLISHED_BATTLE_ACTION_OPERAND_REFERENCE,
        }),
        Object.freeze({
          token: "sprite_palette",
          label: "战斗精灵调色板",
          reference: PUBLISHED_SPRITE_PALETTE_OPERAND_REFERENCE,
        }),
      ]),
    }),
  });
}

const ATTACK_VISUAL_COMMAND_REFERENCE = attackVisualCommandReference(
  ATTACK_VISUAL_COMMANDS_CODEC_ID,
);
const ATTACK_VISUAL_AUX_COMMAND_REFERENCE = attackVisualCommandReference(
  ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID,
);


function structuredField(path, label, definition = {}) {
  return Object.freeze({
    path: Object.freeze([...path]),
    label,
    ...definition,
  });
}

function fixedObjectArray(size, fields) {
  return Object.freeze({
    kind: "array",
    length: "fixed",
    size,
    reorder: false,
    fields: Object.freeze(fields),
  });
}

const WANTED_DEFAULT_PAIR_REFERENCE = Object.freeze({
  container: Object.freeze({
    kind: "object",
    fields: Object.freeze([
      structuredField(["high_target_id"], "高半字节编队", {
        reference: ENCOUNTER_FORMATION_REFERENCE,
      }),
      structuredField(["low_target_id"], "低半字节编队", {
        reference: ENCOUNTER_FORMATION_REFERENCE,
      }),
    ]),
  }),
});

const ENCOUNTER_ENTRY_REFERENCE = Object.freeze({
  container: fixedObjectArray(14, [
    structuredField(["slot"], "候选槽", {readOnly: true}),
    structuredField(["monster_id"], "怪物", {reference: MONSTER_REFERENCE}),
  ]),
});

const INVESTIGATION_SPECIAL_COMPOUND_REFERENCE = Object.freeze({
  module: "investigation-special",
  table: Object.freeze({
    document: "project.scenes.logic",
    path: Object.freeze(["investigation_special_points"]),
  }),
  key: Object.freeze(["id"]),
  name: Object.freeze(["label"]),
  description: Object.freeze(["description"]),
  meta: Object.freeze(["id_hex"]),
  preview: Object.freeze({component: "preview"}),
  container: Object.freeze({
    kind: "compound-match",
    bindings: Object.freeze([
      Object.freeze({
        source: Object.freeze(["scene_id"]),
        target: Object.freeze(["scene_id"]),
      }),
      Object.freeze({source: Object.freeze(["x"]), target: Object.freeze(["x"])}),
      Object.freeze({source: Object.freeze(["y"]), target: Object.freeze(["y"])}),
    ]),
  }),
});

const ACTOR_MOTION_CHR_TILE_CODEC_ID = "shared-chr-bank/actor-motion-tile";

function sample(moduleId, tableId, columnId, path, reference) {
  return Object.freeze({
    moduleId,
    tableId,
    columnId,
    path: Object.freeze([...path]),
    reference,
  });
}

/**
 * 已发布的 battle-test component 用 scene/x/y 三个数值共同指向一个专用调查实体。
 * owner 关系只读反查；承载这些引用键的原始数值仍沿字段表自己的写回链编辑。
 */
const COMPOUND_MATCH_REFERENCE_SAMPLE = sample(
  "battle-test-point",
  "component:component",
  "component:scene-id",
  ["scene_id"],
  INVESTIGATION_SPECIAL_COMPOUND_REFERENCE,
);

/** 机制样例；正式逐列清单由 editor-reference-inventory 写回列声明。 */
Object.freeze([
  sample("battle-test-point", "field:fields", "field:scene-id", ["scene_id"],
    SCENE_REFERENCE),
  sample("field-scene-lifecycle-service", "records", "scene_reference",
    ["scene_reference"], SCENE_HANDLE_REFERENCE),
  sample("cutscene", "segment:segment", "segment:story-mode-scene-table",
    ["bytes"], FIXED_SCENE_REFERENCE_ARRAY),
  sample("wanted-record", "component:component", "component:default-pair",
    ["default_pair"], WANTED_DEFAULT_PAIR_REFERENCE),
  sample("encounter-zone", "definition:scene.encounter", "scene.encounter.entries",
    ["entries"], ENCOUNTER_ENTRY_REFERENCE),
  COMPOUND_MATCH_REFERENCE_SAMPLE,
  sample("scene-actor", "field:actor-record", "field:actor-record.actor-type-direction",
    ["actor_type"], SCENE_ACTOR_TYPE_REFERENCE),
  sample(
    "scene-actor",
    "field:actor-record",
    "field:actor-record.interaction-record-service-parameter",
    ["interaction_or_record_id"],
    SCENE_ACTOR_INTERACTION_REFERENCE,
  ),
  sample("shell-record", "field:fields", "field:shell-visual",
    ["visual_packed"], SHELL_VISUAL_REFERENCE),
  sample("audio-voice", "field:fields", "field:envelope-pointer-high",
    ["envelope_pointer_high"], AUDIO_VOICE_ENVELOPE_REFERENCE),
  sample("audio-voice", "field:fields", "field:envelope-pointer-low",
    ["envelope_pointer_low"], AUDIO_VOICE_ENVELOPE_REFERENCE),
  sample("application-config-family", "field:fields", "field:configuration-pointer-high",
    ["configuration_pointer_high"], APPLICATION_CONFIG_FAMILY_REFERENCE),
  sample("application-config-family", "field:fields", "field:configuration-pointer-low",
    ["configuration_pointer_low"], APPLICATION_CONFIG_FAMILY_REFERENCE),
  sample("audio-command", "field:header", "field:header:track-sequence-pointer-high",
    ["track_sequence_pointer_high"], AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE),
  sample("audio-command", "field:header", "field:header:track-sequence-pointer-low",
    ["track_sequence_pointer_low"], AUDIO_COMMAND_TRACK_SEQUENCE_REFERENCE),
  sample(
    "investigation",
    "definition:scene.logic.investigation",
    "scene.logic.investigation.packed-handler-instance",
    ["packed_handler_instance"],
    INVESTIGATION_HANDLER_REFERENCE,
  ),
  sample("party-field-actor-type-map", "declared-fields", "dead_actor_type",
    ["dead_actor_types"], DEAD_ACTOR_TYPE_REFERENCE_ARRAY),
  sample("field-item-dispatch", "declared-fields", "pointer:default-field-item-handler",
    ["default_field_item_handler"], DEFAULT_FIELD_ITEM_HANDLER_PROVIDER),
  sample("attack-visual", "declared-fields", "commands",
    ["commands"], ATTACK_VISUAL_COMMAND_REFERENCE),
  sample("attack-visual-aux-script", "declared-fields", "commands",
    ["commands"], ATTACK_VISUAL_AUX_COMMAND_REFERENCE),
  sample("battle-test-point", "field:fields", "field:handler-pointer",
    ["sources", "handler-pointer"], BATTLE_TEST_HANDLER_PROVIDER),
]);

function registerContextAwareReferenceCodec(codecId, codec) {
  const id = requireCodecId(codecId, "context-aware");
  if (!codec || typeof codec !== "object" || typeof codec.bind !== "function") {
    throw new TypeError(`${id}: context-aware owner codec 必须提供 bind`);
  }
  if (contextAwareReferenceCodecs.has(id)) {
    throw new Error(`context-aware owner codec 重复登记：${id}`);
  }
  contextAwareReferenceCodecs.set(id, Object.freeze({bind: codec.bind}));
}


function requireCodecId(codecId, label = "opcode operand") {
  const id = String(codecId || "");
  if (!CODEC_ID.test(id)) throw new TypeError(`${label} codec ID 无效：${id || "（空）"}`);
  return id;
}

/** owner 独占编码与候选投影知识；字段层只调用不透明操作，并校验投影没有发明目标键。 */
function registerEncodedScalarReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "encoded scalar");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")
      || (definition.candidates !== undefined && typeof definition.candidates !== "function")) {
    throw new TypeError(
      `${id}: encoded scalar codec 必须提供 decode/encode，`
        + "accepts/candidates 若有也必须是函数",
    );
  }
  if (encodedScalarCodecs.has(id)) {
    throw new TypeError(`encoded scalar codec 重复登记：${id}`);
  }
  encodedScalarCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
    candidates: definition.candidates || (rows => rows),
  }));
}

/** 位段布局只在 owner codec；字段层额外证明写回前后的非目标保存态完全一致。 */
function registerBitSliceReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "bit slice");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")) {
    throw new TypeError(
      `${id}: bit slice codec 必须提供 decode/encode，accepts 若有也必须是函数`,
    );
  }
  if (bitSliceCodecs.has(id)) throw new TypeError(`bit slice codec 重复登记：${id}`);
  bitSliceCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
  }));
}

/**
 * 多个存储字段怎样合成一个目标键完全由 owner codec 决定。
 * candidates 可以先把这次静态声明实际加载的候选表投影成 owner 的逻辑目标；
 * accepts 随后收到完整投影，让 owner 能沿发布关系解析值域。通用层只保证投影
 * 没有发明发布表之外的目标键，也不解释句柄或复制 owner 的边界规则。若这个
 * 逻辑目标不是目标模块的通用句柄域，owner 可明确要求按字段声明呈现投影行。
 */
function registerLinkedFieldReferenceCodec(codecId, definition) {
  const id = requireCodecId(codecId, "linked fields");
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function"
      || (definition.accepts !== undefined && typeof definition.accepts !== "function")
      || (definition.candidates !== undefined && typeof definition.candidates !== "function")
      || (definition.context !== undefined && typeof definition.context !== "function")
      || (definition.candidatePresentation !== undefined
        && definition.candidatePresentation !== "declared")) {
    throw new TypeError(
      `${id}: linked fields codec 必须提供 decode/encode，`
        + "accepts/candidates/context 若有也必须是函数，candidatePresentation 只可为 declared",
    );
  }
  if (linkedFieldCodecs.has(id)) {
    throw new TypeError(`linked fields codec 重复登记：${id}`);
  }
  linkedFieldCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
    accepts: definition.accepts || (() => true),
    candidates: definition.candidates || (rows => rows),
    candidatePresentation: definition.candidatePresentation || "owner",
    context: definition.context || null,
  }));
}




/** owner 登记自己的解码与编码；通用字段层不包含任何 opcode 常量或长度规则。 */
function registerOpcodeOperandCodec(codecId, definition) {
  const id = requireCodecId(codecId);
  if (!definition || typeof definition !== "object"
      || typeof definition.decode !== "function"
      || typeof definition.encode !== "function") {
    throw new TypeError(`${id}: opcode operand codec 必须同时提供 decode/encode`);
  }
  if (opcodeOperandCodecs.has(id)) {
    throw new TypeError(`opcode operand codec 重复登记：${id}`);
  }
  opcodeOperandCodecs.set(id, Object.freeze({
    decode: definition.decode,
    encode: definition.encode,
  }));
}

function opcodeOperandCodec(codecId) {
  const id = requireCodecId(codecId);
  const codec = opcodeOperandCodecs.get(id);
  if (!codec) throw new Error(`未登记 owner opcode operand codec：${id}`);
  return codec;
}

function opcodeScalar(value, context) {
  if (!new Set(["number", "string"]).has(typeof value)
      || (typeof value === "number" && !Number.isFinite(value))) {
    throw new TypeError(`${context}.value 必须是有限数值或字符串`);
  }
  return value;
}

/** 保存期必须经过同一个 owner encoder；没有 codec 时绝不按普通字段路径写入。 */
function applyOpcodeOperandEdits(codecId, value, updates) {
  if (!Array.isArray(updates) || !updates.length) {
    throw new TypeError(`${codecId}: opcode operand encoder 没有收到修改`);
  }
  const normalized = updates.map((update, index) => {
    const context = `${codecId}.updates[${index}]`;
    if (!update || typeof update !== "object") throw new TypeError(`${context} 无效`);
    const id = String(update.id ?? "");
    const token = String(update.token || "");
    if (!id || !token) throw new TypeError(`${context} 缺少 owner operand id/token`);
    return Object.freeze({id, token, value: opcodeScalar(update.value, context)});
  });
  const encoded = opcodeOperandCodec(codecId).encode(value, normalized);
  if (encoded === undefined) {
    throw new TypeError(`${codecId}: owner encoder 没有返回编码后的字段值`);
  }
  return encoded;
}













































/**
 * 按声明分组读取候选表并水合。loadRows/paint 只供薄浏览器合同注入；产品路径固定
 * 调用上面的精确表读取器。
 */

// @editor-module human-item / tank-item owner 的引用候选与预览
//
// 两类实体共享 item-entry 发布投影，但候选值域在源码里按 owner 固定分开；这里不扫
// 模块图、manifest 或运行时资源来猜。玩家可见名称仍由 text-record 当前正文水合，
// item-entry 的 name 只在文字正文尚未载入时充当提示。


const HUMAN_ITEM_MODULE_ID = "human-item";
const TANK_ITEM_MODULE_ID = "tank-item";
const ITEM_REFERENCE_RESOURCE_ID = "item-entry";

registerModuleComponent(ITEM_REFERENCE_RESOURCE_ID, 'reference', {
  async prepare(props) {
    const document = await db.getResourceDocument(ITEM_REFERENCE_RESOURCE_ID, null);
    return {...props, records: document.records};
  },
  render: props => `<span ${props.componentAttributes}>${itemPickerFieldMarkup({...props, lazy: false})}</span>`,
  hydrate: hydrateItemPickers,
});

const ITEM_MODULES = Object.freeze({
  [HUMAN_ITEM_MODULE_ID]: Object.freeze({
    owner: "human",
    label: "人类物品",
  }),
  [TANK_ITEM_MODULE_ID]: Object.freeze({
    owner: "tank",
    label: "战车物品",
  }),
});

const ITEM_CATEGORY_GLYPHS = Object.freeze({
  empty: "·",
  "human-head": "盔", "human-body": "衣", "human-feet": "靴",
  "human-protector": "甲", "human-hands": "手", "human-weapon": "刀",
  "tank-main-gun": "炮", "tank-special": "特", "tank-sub-gun": "副",
  "tank-c-unit": "C", "tank-engine": "机", "tank-chassis": "车",
  "human-item": "包", "tank-item": "箱",
});

function itemModule(moduleId) {
  const id = String(moduleId || "");
  const definition = ITEM_MODULES[id];
  if (!definition) throw new TypeError(`物品引用模块无效：${id || "（空）"}`);
  return {id, ...definition};
}

function itemId(entry) {
  if (entry?.id === null || entry?.id === undefined || entry?.id === "") return null;
  const id = Number(entry.id);
  return Number.isInteger(id) && id >= 0 && id <= 0xff ? id : null;
}

function itemIdFromReference({entry = null, handle = "", value = ""} = {}) {
  const fromEntry = itemId(entry);
  if (fromEntry !== null) return fromEntry;
  const reference = String(handle || value || "").trim();
  const match = /^(?:human-item|tank-item):([0-9a-f]{1,2})$/iu.exec(reference);
  if (match) return Number.parseInt(match[1], 16);
  return itemId({id: value});
}

function itemIdHex(entry) {
  const id = itemId(entry);
  return id === null ? "??" : id.toString(16).toUpperCase().padStart(2, "0");
}

// The field stores a typed owner handle; the existing item picker uses the
// published numeric id. Keep this conversion in the item owner.
registerEncodedScalarReferenceCodec("human-item/handle/v1", {
  decode(value) {
    if (typeof value !== "string" || !/^human-item:[0-9A-F]{2}$/u.test(value)) {
      throw new TypeError("人物物品引用必须使用规范句柄");
    }
    return itemIdFromReference({handle: value});
  },
  encode(_source, target) {
    const id = itemId({id: target});
    if (id === null) throw new TypeError("人物物品候选编号无效");
    return `${HUMAN_ITEM_MODULE_ID}:${itemIdHex({id})}`;
  },
  accepts(target, row) {
    return row?.category?.owner === "human" && itemId(row) === Number(target);
  },
});

function itemNameRecord(entry) {
  const id = itemId(entry);
  if (id === null) return "";
  const region = Number.parseInt(String(entry?.name_text_region ?? "00"), 16);
  const record = Number(entry?.name_text_record_id ?? id);
  if (!Number.isInteger(region) || region < 0 || region > 0xff
      || !Number.isInteger(record) || record < 0 || record > 999) return "";
  return `record:${region.toString(16).toUpperCase().padStart(2, "0")}:${
    String(record).padStart(3, "0")}`;
}

function entryBelongsToModule(entry, moduleId) {
  const definition = itemModule(moduleId);
  const owner = String(entry?.category?.owner || "");
  return owner === "empty" || owner === definition.owner;
}

function currentItemName(entry, fallback) {
  const record = itemNameRecord(entry);
  return record ? currentTextReference(record).label || fallback : fallback;
}

function itemStat(entry) {
  const values = [
    ["攻", entry?.attack?.value],
    ["防", entry?.defense?.value],
    ["重", entry?.tank_weight?.value],
    ["载", entry?.engine_capacity?.value],
    ["价", entry?.price?.value],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  return values.slice(0, 2).map(([label, value]) => `${label}${value}`).join(" · ");
}

function itemPreviewMarkup({
  moduleId,
  entry = null,
  handle = "",
  value = "",
  componentAttributes = "",
} = {}) {
  const definition = itemModule(moduleId);
  const id = itemIdFromReference({entry, handle, value});
  const resolved = entry || {id};
  const idHex = itemIdHex(resolved);
  if (id === null) {
    return `<span class="module-reference-data-preview" ${componentAttributes}>
      <b>?</b><small>${esc(definition.label)}引用未解析</small></span>`;
  }
  const fallback = String(entry?.name || `${definition.label} ${idHex}`);
  const name = currentItemName(resolved, fallback);
  const category = String(entry?.category?.name || definition.label);
  const glyph = ITEM_CATEGORY_GLYPHS[entry?.category?.id] || "物";
  const icon = entry?.equipment_icon;
  const iconMarkup = icon?.item_id === id && icon.category_id === entry?.category?.id
    && icon.tile_reference?.resource_id === "shared-chr-bank"
    ? `<canvas class="item-equipment-icon" width="8" height="8"
      data-item-equipment-icon data-chr-bank="${esc(icon.tile_reference.bank_id)}"
      data-chr-tile="${esc(icon.tile_reference.tile_id)}"
      data-sprite-palette="${esc(JSON.stringify(icon.sprite_palette))}"
      aria-hidden="true"></canvas>`
    : `<span class="item-category-glyph" aria-hidden="true">${esc(glyph)}</span>`;
  const stat = itemStat(entry);
  return `<span class="module-reference-data-preview item-entry-preview" ${componentAttributes}
    data-item-reference-module="${esc(moduleId)}" data-item-reference-id="${id}"
    aria-label="${esc(name)} · ${esc(category)}" title="${esc([name, category, stat].filter(Boolean).join(" · "))}">
    ${iconMarkup}
  </span>`;
}

async function paintEquipmentIcon(canvas) {
  const bank = await loadChrBankBytes(Number(canvas.dataset.chrBank));
  const tile = decodeChrTile(bank, Number(canvas.dataset.chrTile));
  const palette = JSON.parse(canvas.dataset.spritePalette);
  const data = new Uint8ClampedArray(8 * 8 * 4);
  paintChrTile(data, 8, 0, 0, tile, palette, {background: null});
  canvas.getContext("2d").putImageData(new ImageData(data, 8, 8), 0, 0);
}

async function hydrateEquipmentIcons(root) {
  await Promise.all([...root.querySelectorAll("canvas[data-item-equipment-icon]")]
    .map(async canvas => {
      try {
        await paintEquipmentIcon(canvas);
      } catch (error) {
        canvas.replaceWith(document.createTextNode(`图标不可用：${error.message}`));
      }
    }));
}

function itemReferenceItem(entry, reference) {
  const moduleId = String(reference?.module || "");
  const definition = itemModule(moduleId);
  if (!entryBelongsToModule(entry, moduleId)) return null;
  const id = itemId(entry);
  if (id === null) return null;
  const idHex = itemIdHex(entry);
  const fallback = String(entry?.name || `${definition.label} ${idHex}`);
  const name = currentItemName(entry, fallback);
  const category = String(entry?.category?.name || definition.label);
  const stat = itemStat(entry);
  const handle = `${moduleId}:${idHex}`;
  return {
    value: String(id),
    label: `${idHex} · ${name}`,
    description: category,
    meta: stat,
    preview: renderModuleComponent(moduleId, "preview", {entry}),
    filter: [
      id,
      idHex,
      `0x${idHex}`,
      `$${idHex}`,
      handle,
      name,
      category,
      stat,
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

function itemRows(documentValue, moduleId) {
  const records = documentValue?.records;
  if (!Array.isArray(records)) {
    throw new TypeError(`${ITEM_REFERENCE_RESOURCE_ID} 缺少 records 候选表`);
  }
  return records.filter(entry => entryBelongsToModule(entry, moduleId));
}

async function prepareItemComponent(props) {
  const moduleId = String(props.moduleId || "");
  itemModule(moduleId);
  try {
    const documentValue = await db.getResourceDocument(ITEM_REFERENCE_RESOURCE_ID, null);
    const entries = itemRows(documentValue, moduleId);
    const requestedId = itemIdFromReference(props);
    return {
      ...props,
      entries,
      entry: props.entry || entries.find(entry => itemId(entry) === requestedId) || null,
      error: entries.length ? "" : `${moduleId} 的静态候选值域为空`,
    };
  } catch (error) {
    return {
      ...props,
      entries: [],
      error: `候选项不可用：${error?.message || error}`,
    };
  }
}

function itemReferencePickerMarkup({
  moduleId,
  entries = [],
  value = null,
  label = "",
  controlMarkup = "",
  componentAttributes = "",
  error = "",
} = {}) {
  const definition = itemModule(moduleId);
  const rows = entries.filter(entry => entryBelongsToModule(entry, moduleId));
  return referenceFieldPickerMarkup({
    reference: {module: moduleId},
    rows,
    value,
    label: label || definition.label,
    controlMarkup,
    componentAttributes,
    error,
  });
}

function componentRoots(root, moduleId, kind) {
  const selector = `[data-module-component-module="${moduleId}"]`
    + `[data-module-component-kind="${kind}"]`;
  return [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
}

function hydrateItemReferencePickers(root = document) {
  hydrateReferenceFieldPickers(root);
}

for (const moduleId of Object.keys(ITEM_MODULES)) {
  registerReferenceFieldPresentation(moduleId, {
    item: itemReferenceItem,
    className: "item-reference-field",
    filterLabel: `过滤${ITEM_MODULES[moduleId].label}`,
    filterPlaceholder: "ID／名称／类别／数值",
  });

  for (const kind of ["preview", "cover"]) {
    registerModuleComponent(moduleId, kind, {
      prepare: prepareItemComponent,
      render: itemPreviewMarkup,
      hydrate: hydrateEquipmentIcons,
    });
  }

  registerModuleComponent(moduleId, "reference", {
    prepare: prepareItemComponent,
    render: itemReferencePickerMarkup,
    hydrate(root) {
      componentRoots(root, moduleId, "reference").forEach(
        hydrateItemReferencePickers,
      );
    },
  });
}

// @editor-module 战车预设与初始停放的字段对象会话。

const clone = value => JSON.parse(JSON.stringify(value));
let loading = null;

function revision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sessionMatches(repository, originalRevision) {
  return state.projectRepository === repository && revision() === originalRevision;
}

function vehicleDraftFromDocument(document_) {
  const presets = {};
  for (const preset of document_?.presets || []) {
    presets[Number(preset.preset_id)] = {
      preset_id: Number(preset.preset_id),
      defense: Number(preset.defense?.value ?? 0),
      chassis_weight_units: Number(preset.chassis_weight?.internal_units ?? 0),
      ammo_capacity: Number(preset.ammo_capacity?.value ?? 0),
      mount_mask: draftEquipmentMask(preset.mount_mask?.value),
      equipped_mask: draftEquipmentMask(preset.equipped_mask?.value),
      slot_assignments: clone(preset.slot_assignments ?? Array(5).fill(null)),
      equipment: (preset.loadout || []).slice(0, 6)
        .map(slot => Number(slot.item_id ?? 0)),
    };
  }
  const placement = {};
  for (const row of document_?.initial_placement?.records || []) {
    placement[Number(row.vehicle_slot)] = {
      vehicle_slot: Number(row.vehicle_slot),
      placed: Boolean(row.placed),
      scene_id: row.placed ? Number(row.scene_id) : null,
      x: Number(row.x),
      y: Number(row.y),
    };
  }
  return {table_sha256: document_?.writeback_state?.current_sha256 || '',
    presets, placement};
}

async function ensureVehicleDraft() {
  if (state.vehicleDraft || !state.project) return state.vehicleDraft;
  const project = state.project;
  const repository = requireBrowserProjectRepository(state);
  const originalRevision = revision();
  if (!loading || loading.project !== project || loading.repository !== repository
      || loading.revision !== originalRevision) {
    const promise = (async () => {
      await db.getFieldObjects('vehicle-preset');
      const saved = await db.readResource('vehicle-preset');
      if (state.project !== project || !sessionMatches(repository, originalRevision)) return null;
      if (!state.vehicleDraft) {
        state.vehicleDraft = vehicleDraftFromDocument(saved.value.document);
        state.vehicleOriginal = clone({presets: state.vehicleDraft.presets,
          placement: state.vehicleDraft.placement});
        state.vehicleDirty = false;
      }
      return state.vehicleDraft;
    })();
    loading = {project, repository, revision: originalRevision, promise};
    void promise.finally(() => {
      if (loading?.promise === promise) loading = null;
    }).catch(() => {});
  }
  return loading.promise;
}

function vehicleViewDraft(viewId) {
  const ids = state.project?.game_data?.vehicles?.views?.[viewId]?.preset_ids;
  if (!ids || !state.vehicleDraft) return [];
  return ids.map(Number).sort((left, right) => left - right)
    .map(id => state.vehicleDraft.presets[id]).filter(Boolean);
}

function vehiclePresetDraft(presetId) {
  return state.vehicleDraft?.presets?.[Number(presetId)] || null;
}

function vehicleEquippedMask(record) {
  return record.equipped_mask;
}

function vehicleViewDirty(viewId) {
  const presetsChanged = vehicleViewDraft(viewId).some(record =>
    JSON.stringify(record) !==
      JSON.stringify(state.vehicleOriginal?.presets?.[record.preset_id]));
  if (presetsChanged) return true;
  if (viewId !== 'player') return false;
  return JSON.stringify(state.vehicleDraft?.placement)
    !== JSON.stringify(state.vehicleOriginal?.placement);
}

function vehicleTableDirty() {
  state.vehicleDirty = JSON.stringify({presets: state.vehicleDraft?.presets,
    placement: state.vehicleDraft?.placement}) !== JSON.stringify(state.vehicleOriginal);
  return state.vehicleDirty;
}

function replaceVehicleSelection(target, restored, presetId, viewId) {
  const id = Number(presetId);
  if (restored.presets[id]) target.presets[id] = clone(restored.presets[id]);
  else delete target.presets[id];
  if (viewId !== 'player') return;
  if (restored.placement[id]) target.placement[id] = clone(restored.placement[id]);
  else delete target.placement[id];
}

function finishVehicleOriginalReset({repository, revision: originalRevision, id, viewId}, saved) {
  if (!sessionMatches(repository, originalRevision))
    throw new Error('项目会话已切换，请在当前载具页重试');
  const restored = vehicleDraftFromDocument(saved.value.document);
  replaceVehicleSelection(state.vehicleDraft, restored, id, viewId);
  replaceVehicleSelection(state.vehicleOriginal, restored, id, viewId);
  vehicleTableDirty();
  return saved;
}

function vehicleItemCategorySnapshot(records, items) {
  const snapshot = {};
  for (const itemId of new Set(records.flatMap(record => record.equipment || []))) {
    const item = items[Number(itemId)];
    if (item) snapshot[Number(itemId)] = {category: clone(item.category)};
  }
  return snapshot;
}

function vehicleViewSaveSnapshot(viewId) {
  const project = state.project;
  const view = project?.game_data?.vehicles?.views?.[viewId];
  if (!view) throw new Error(`未知的战车用途视图：${viewId}`);
  if (!state.vehicleDraft) throw new Error('战车预设草稿不可用，请刷新页面');
  const records = clone(vehicleViewDraft(viewId));
  const placement = viewId === 'player'
    ? clone(Object.values(state.vehicleDraft.placement)) : [];
  const items = vehicleItemCategorySnapshot(records,
    project?.game_data?.items?.records || []);
  return {viewId, repository: requireBrowserProjectRepository(state),
    revision: revision(), project, records, placement, items, before: clone(state.vehicleOriginal)};
}

function validateVehicleViewSaveSnapshot(viewId, snapshot) {
  if (!snapshot || snapshot.viewId !== viewId || !snapshot.repository ||
      !snapshot.project || !Array.isArray(snapshot.records) ||
      !Array.isArray(snapshot.placement) || !snapshot.items)
    throw new TypeError(`战车用途视图 ${viewId} 的保存快照不完整`);
  return snapshot;
}

async function saveVehicleView(viewId,
  snapshot = vehicleViewSaveSnapshot(viewId)) {
  const payload = validateVehicleViewSaveSnapshot(viewId, snapshot);
  const fields = await db.getFields('vehicle-preset');
  const byKey = new Map(fields.map(field =>
    [`${field.recordId}:${field.fieldName}`, field]));
  const edits = [];
  const presetValues = record => {
    const values = new Map([
      ['defense', record.defense], ['chassis_weight', record.chassis_weight_units],
      ['ammo_capacity', record.ammo_capacity], ['mount_mask', record.mount_mask],
      ['equipped_mask', vehicleEquippedMask(record)],
    ]);
    record.equipment.forEach((itemId, slot) => values.set(`loadout_${slot}`, itemId));
    return values;
  };
  for (const edited of payload.records) {
    const id = Number(edited.preset_id);
    const values = presetValues(edited);
    const before = payload.before?.presets[id];
    const previous = before ? presetValues(before) : null;
    for (const [name, value] of values) {
      const field = byKey.get(`${id}:${name}`);
      if (!field || value === null) continue;
      if ((previous ? previous.get(name) : field.value) !== value) edits.push({field, value});
    }
  }
  if (viewId === 'player') for (const row of payload.placement) {
    const id = Number(row.vehicle_slot);
    for (const [name, value] of [['scene_id', row.placed ? row.scene_id : null],
      ['x', row.x], ['y', row.y]]) {
      const field = byKey.get(`${id}:${name}`);
      if (!field) throw new Error(`vehicle-preset 缺少停放字段 ${id}:${name}`);
      const before = payload.before?.placement[id];
      const previous = before ? (name === 'scene_id' && !before.placed ? null : before[name]) : field.value;
      if (previous !== value) edits.push({field, value});
    }
  }
  if (edits.length) await db.writeFields(edits,
    {expectedVersion: fields[0]?.version ?? null});
  const saved = await db.readResource('vehicle-preset');
  if (!sessionMatches(payload.repository, payload.revision) ||
      state.project !== payload.project) return saved;
  const persisted = vehicleDraftFromDocument(saved.value.document);
  if (state.vehicleOriginal) {
    for (const record of payload.records) {
      const id = Number(record.preset_id);
      if (!persisted.presets[id])
        throw new Error(`vehicle-preset 写入后缺少战车预设 ${id}`);
      state.vehicleDraft.presets[id] = applyJsonChanges(persisted.presets[id], record, state.vehicleDraft.presets[id]);
      state.vehicleOriginal.presets[id] = clone(persisted.presets[id]);
    }
    if (viewId === 'player') for (const row of payload.placement) {
      const id = Number(row.vehicle_slot);
      if (persisted.placement[id]) {
        state.vehicleDraft.placement[id] = applyJsonChanges(persisted.placement[id], row, state.vehicleDraft.placement[id]);
        state.vehicleOriginal.placement[id] = clone(persisted.placement[id]);
      } else delete state.vehicleOriginal.placement[id];
    }
    vehicleTableDirty();
  }
  return saved;
}

// @editor-module CHR 物理字段对象承载图形资源归属与无归属字节。

function createChrPhysicalFieldObjects(shard, bytes = null) {
  const {offset: base, length} = shard?.address || {};
  if (shard?.space !== "chr" || !Number.isInteger(base) || base < 0
      || !Number.isInteger(length) || length < 1 || !Array.isArray(shard.resources)) {
    throw new TypeError("CHR 字段对象需要有效 bank 与资源范围");
  }
  const views = shard.resources.map((resource, index) => {
    const address = resource?.address || {};
    if (address.space !== "chr" || !Number.isInteger(address.offset)
        || !Number.isInteger(address.end_exclusive)
        || address.end_exclusive <= address.offset
        || address.end_exclusive <= base || address.offset >= base + length) {
      throw new TypeError(`CHR bank ${shard.bank} 资源范围 ${index} 无效`);
    }
    const associations = (resource.associations || []).map(association => {
      const owner = association.metadata?.resource_owner || association.resource_owner;
      return Object.freeze({
        producer: association.producer, status: association.status,
        resourceIds: Object.freeze([...(association.resource_ids || [])]),
        bindings: Object.freeze([...(association.resource_address_bindings || [])]),
        owner: owner?.resource_id && owner?.role ? Object.freeze({
          resourceId: owner.resource_id, role: owner.role,
          elementIndex: owner.element_index, elementCount: owner.element_count,
        }) : null,
      });
    });
    return Object.freeze({address: Object.freeze({...address}),
      associations: Object.freeze(associations), index});
  });
  const preferred = [...views].sort((left, right) =>
    Number(right.associations.some(association => association.owner))
      - Number(left.associations.some(association => association.owner))
      || left.address.length - right.address.length || left.index - right.index);
  const chosen = Array(length).fill(null);
  for (const view of preferred) {
    const start = Math.max(base, view.address.offset) - base;
    const end = Math.min(base + length, view.address.end_exclusive) - base;
    for (let local = start; local < end; local += 1) chosen[local] ||= view;
  }
  const byByte = Array(length).fill(null);
  const objects = [];
  let uncovered = 0;
  for (let local = 0; local < length;) {
    const view = chosen[local];
    if (!view) {uncovered += 1; local += 1; continue;}
    let end = local + 1;
    while (end < length && chosen[end] === view) end += 1;
    const start = base + local;
    const endExclusive = base + end;
    const windowStart = local, windowEnd = end;
    const owner = view.associations.find(association => association.owner)?.owner;
    const related = Object.freeze(views.filter(item =>
      item.address.offset < endExclusive && item.address.end_exclusive > start));
    const object = Object.freeze({
      id: owner ? `${owner.resourceId}/${owner.role}`
        : `chr.unassigned:${start.toString(16).padStart(6, "0")}-${endExclusive.toString(16).padStart(6, "0")}`,
      resourceId: owner?.resourceId || "chr.unassigned",
      role: owner?.role || null,
      physical: Object.freeze({space: "chr", offset: start,
        length: end - local, end_exclusive: endExclusive}),
      owner,
      rangeViews: related,
      writeback: owner ? null : Object.freeze({state: "unpermitted"}),
      get origin() {return bytes?.slice(windowStart, windowEnd) || null;},
      get working() {return null;},
      get edited() {return false;},
    });
    objects.push(object);
    byByte.fill(object, local, end);
    local = end;
  }
  return Object.freeze({bank: shard.bank, objects: Object.freeze(objects), byByte: Object.freeze(byByte),
    rangeViews: Object.freeze(views), total: length, uncovered});
}

// @editor-module 按字段对象身份反查 PRG、CHR 与 SRAM 物理范围。

let cachedManifest = null;
let cachedIndex = null;
let cachedCoverage = null;
const bankCatalogs = new WeakMap();

async function mapLimited(values, limit, project) {
  const output = Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(limit, values.length)}, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await project(values[index]);
    }
  }));
  return output;
}

function addRange(index, object) {
  if (!object.role || object.resourceId.endsWith(".unassigned")) return;
  const physical = object.physical;
  const range = {
    resourceId: object.resourceId, role: object.role,
    ...(object.owner?.elementIndex == null ? {} : {elementIndex: object.owner.elementIndex}),
    ...(object.owner?.elementCount == null ? {} : {elementCount: object.owner.elementCount}),
    space: physical.space, offset: physical.offset,
    length: physical.length, endExclusive: physical.end_exclusive,
    record: object.meaning || object.id,
  };
  if (!index.has(range.resourceId)) index.set(range.resourceId, new Map());
  const key = [range.role, range.space, range.offset, range.length].join("\u0000");
  index.get(range.resourceId).set(key, range);
}

async function loadBank(manifest, space, descriptor) {
  if (!bankCatalogs.has(manifest)) bankCatalogs.set(manifest, new Map());
  const cache = bankCatalogs.get(manifest);
  if (cache.has(descriptor.path)) return cache.get(descriptor.path);
  const pending = buildBank(manifest, space, descriptor);
  cache.set(descriptor.path, pending);
  try {return await pending;}
  catch (error) {cache.delete(descriptor.path); throw error;}
}

async function buildBank(manifest, space, descriptor) {
  const bank = await db.getPackageDocument(descriptor.path, null);
  if (!bank || bank.space !== space) throw new Error(`${space} bank 字段对象来源无效`);
  if (space === "chr") return createChrPhysicalFieldObjects(bank);
  const pages = await Promise.all((bank.record_pages || []).map(page =>
    db.getPackageDocument(page.path, null)));
  if (pages.some(page => !page || !Array.isArray(page.records?.annotations))) {
    throw new Error(`${space} record page 字段对象来源无效`);
  }
  if (space === "prg") {
    return createPrgPhysicalFieldObjects(pages,
      {offset: bank.address.offset, length: bank.address.length});
  }
  const document_ = {...manifest,
    annotations: pages.flatMap(page => page.records.annotations)};
  const fields = [...saveFieldBindings(document_)].map(([id, record]) => ({
    id, resourceId: "save-current", role: `field:${id}`, physical: record.address,
  }));
  return createSavePhysicalFieldObjects(document_, fields, {});
}

async function loadPhysicalFieldObjectIndex() {
  const manifest = await loadPhysicalFieldSourceIndex(db);
  if (!manifest?.bank_shards) throw new Error("物理字段对象缺少地址空间清单");
  if (manifest === cachedManifest && cachedIndex) return cachedIndex;
  cachedManifest = manifest;
  cachedCoverage = null;
  const pending = (async () => {
    const index = new Map();
    const coverage = {};
    for (const space of ADDRESS_SPACE_IDS) {
      const descriptors = manifest.bank_shards[space] || [];
      const catalogs = await mapLimited(descriptors, 8, descriptor =>
        loadBank(manifest, space, descriptor));
      coverage[space] = Object.freeze({
        total: catalogs.reduce((count, catalog) => count + catalog.total, 0),
        uncovered: catalogs.reduce((count, catalog) => count + catalog.uncovered, 0),
        objects: catalogs.reduce((count, catalog) => count + catalog.objects.length, 0),
      });
      for (const catalog of catalogs) for (const object of catalog.objects) addRange(index, object);
    }
    cachedCoverage = Object.freeze(coverage);
    return new Map([...index].map(([id, ranges]) => [id,
      [...ranges.values()].sort((left, right) =>
        ADDRESS_SPACE_IDS.indexOf(left.space) - ADDRESS_SPACE_IDS.indexOf(right.space)
          || left.offset - right.offset || left.length - right.length
          || left.role.localeCompare(right.role, "zh-CN")),
    ]));
  })();
  cachedIndex = pending;
  try {
    return await pending;
  } catch (error) {
    if (cachedManifest === manifest) {
      cachedManifest = null; cachedIndex = null; cachedCoverage = null;
    }
    throw error;
  }
}

async function loadPhysicalFieldObjectCoverage() {
  await loadPhysicalFieldObjectIndex();
  return cachedCoverage;
}

async function findPhysicalFieldObjectRanges(resourceId) {
  const id = String(resourceId || "").trim();
  if (!id) return [];
  const index = await loadPhysicalFieldObjectIndex();
  return (index.get(id) || []).map(range => ({...range}));
}

// @editor-module 仅按 target bindings 与授权 BuildMap 关系计算字节地图写回覆盖。
// ROM map write coverage comes only from semantic target bindings and their
// authorized BuildMap slot relationship groups.  Manifest writeback labels,
// byte-map roundtrip annotations and extracted reference assets are evidence,
// not linker authority.

function nonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
}

function relationshipRoot(slot) {
    return slot.alias_of || slot.mirror_of || slot.slot_id;
}

function authorizedRomMapSlotRanges(targetDefinition, region, total) {
    if (!targetDefinition || typeof targetDefinition !== "object" ||
        typeof region !== "string" || !region ||
        !nonNegativeInteger(total) || total === 0) {
        return [];
    }

    const profile = targetDefinition.profile;
    const buildMap = targetDefinition.build_map;
    const bindings = targetDefinition.bindings;
    if (!profile || !buildMap || !bindings ||
        !Array.isArray(profile.regions) ||
        !Array.isArray(buildMap.slots) ||
        !Array.isArray(bindings.bindings) ||
        typeof profile.profile_id !== "string" || !profile.profile_id ||
        buildMap.target_profile_id !== profile.profile_id ||
        bindings.target_profile_id !== profile.profile_id ||
        typeof profile.build_map_sha256 !== "string" ||
        !profile.build_map_sha256 ||
        bindings.build_map_sha256 !== profile.build_map_sha256) {
        return [];
    }

    const targetRegion = profile.regions.find(item => item?.kind === region);
    if (!targetRegion || !nonNegativeInteger(targetRegion.file_offset) ||
        !Number.isInteger(targetRegion.size) || targetRegion.size <= 0) {
        return [];
    }
    const limit = Math.min(total, targetRegion.size);
    const slotsById = new Map();
    for (const slot of buildMap.slots) {
        if (!slot || typeof slot.slot_id !== "string" || !slot.slot_id) continue;
        slotsById.set(slot.slot_id, slot);
    }

    const authorizedRoots = new Set();
    for (const binding of bindings.bindings) {
        if (!binding || typeof binding.compiler_id !== "string" ||
            !binding.compiler_id || !Array.isArray(binding.sources)) continue;
        for (const source of binding.sources) {
            const slot = slotsById.get(source?.slot_id);
            if (!slot) continue;
            const rootId = relationshipRoot(slot);
            const root = slotsById.get(rootId);
            if (root && relationshipRoot(root) === root.slot_id) {
                authorizedRoots.add(rootId);
            }
        }
    }

    const ranges = [];
    for (const slot of buildMap.slots) {
        if (!slot || slot.region !== region ||
            !authorizedRoots.has(relationshipRoot(slot)) ||
            !nonNegativeInteger(slot.file_offset) ||
            !Number.isInteger(slot.capacity) || slot.capacity <= 0) continue;
        const start = slot.file_offset - targetRegion.file_offset;
        const end = start + slot.capacity;
        if (end <= 0 || start >= limit) continue;
        ranges.push([Math.max(0, start), Math.min(limit, end)]);
    }
    ranges.sort((left, right) => left[0] - right[0] || left[1] - right[1]);

    const merged = [];
    for (const [start, end] of ranges) {
        const previous = merged.at(-1);
        if (!previous || start > previous[1]) merged.push([start, end]);
        else previous[1] = Math.max(previous[1], end);
    }
    return merged;
}

function authorizedRomMapSlotBytes(targetDefinition, region, total) {
    return authorizedRomMapSlotRanges(targetDefinition, region, total)
        .reduce((covered, [start, end]) => covered + end - start, 0);
}

// @editor-module PRG 与 CHR 物理字段对象窗口及关联视图。


let loadedPrgManifest = null;
let loadedChrManifest = null;
let chrWindow = null;

function decodeBase64(value) {
  let raw;
  try {
    raw = globalThis.atob(String(value));
  } catch {
    throw new Error("统一字节地图 base64 数据无效");
  }
  const result = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) result[index] = raw.charCodeAt(index);
  return result;
}

// 正文按发布内容直接解码：字节地图的字节就是项目基线，前端不复核它的哈希。
function decodeEnvelope(envelope) {
  return decodeBase64(envelope.data);
}

function uniqueJson(records) {
  const seen = new Set();
  return records.filter(record => {
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assembleBytes(shards, offset, length) {
  const bytes = new Uint8Array(length);
  for (const shard of shards) {
    bytes.set(decodeEnvelope(shard.bytes), shard.address.offset - offset);
  }
  return bytes;
}

function normalizedInstruction(source, windowOffset, windowLength) {
  const physicalStart = Number(source?.prg_offset);
  const size = Number(source?.size || 1);
  if (!Number.isInteger(physicalStart) || !Number.isInteger(size) || size < 1
      || physicalStart + size <= windowOffset
      || physicalStart >= windowOffset + windowLength) return null;
  const instructionBytes = String(source.bytes_hex || "").split(/\s+/).filter(Boolean)
    .map(value => Number.parseInt(value, 16));
  if (instructionBytes.some(value => !Number.isInteger(value) || value < 0 || value > 0xff)) {
    throw new Error(`PRG 指令 ${physicalStart} bytes_hex 无效`);
  }
  return {
    start: physicalStart - windowOffset,
    physicalStart,
    size,
    bytes: instructionBytes,
    mnemonic: source.mnemonic || "???",
    operand: source.operand || "",
    addressingMode: source.addressing_mode || "",
    confidence: source.confidence || "",
    execCount: Number(source.exec_count || 0),
    functionName: source.function || "",
    functionEntry: Number.isFinite(Number(source.function_entry_prg))
      ? Number(source.function_entry_prg) : null,
    domain: source.domain || "unclassified",
    submodes: Array.isArray(source.submodes) ? source.submodes : [],
  };
}

async function loadRomMapDisassembly(shards, {offset, length}) {
  const classification = new Uint8Array(length);
  let classificationIds = null;
  const rawInstructions = [];
  const functions = [];
  const namedRanges = [];
  const xrefs = [];
  const symbols = [];
  const functionSummary = {};
  for (const shard of shards) {
    const source = shard.disassembly;
    const requiredArrays = ["instructions", "functions", "symbols", "named_ranges", "xrefs"];
    if (!source || requiredArrays.some(key => !Array.isArray(source[key]))
        || !source.classification_ids || typeof source.classification_ids !== "object") {
      throw new Error(`PRG bank ${shard.bank} 反汇编 JSON 无效`);
    }
    const decoded = decodeEnvelope(source.classification);
    if (decoded.length !== shard.address.length) {
      throw new Error(`PRG bank ${shard.bank} classification 长度错误`);
    }
    classification.set(decoded, shard.address.offset - offset);
    if (classificationIds
        && JSON.stringify(classificationIds) !== JSON.stringify(source.classification_ids)) {
      throw new Error("PRG bank classification_ids 不一致");
    }
    classificationIds ||= source.classification_ids;
    rawInstructions.push(...source.instructions);
    functions.push(...source.functions);
    symbols.push(...source.symbols);
    namedRanges.push(...source.named_ranges);
    xrefs.push(...source.xrefs);
    Object.assign(functionSummary, source.function_summary || {});
  }
  const instructions = uniqueJson(rawInstructions)
    .map(source => normalizedInstruction(source, offset, length))
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);
  const uniqueFunctions = uniqueJson(functions);
  return {
    classification,
    functionsByEntry: new Map(uniqueFunctions.map(entry => [Number(entry.entry_prg), entry])),
    instructions,
    functionSummary,
    symbols: uniqueJson(symbols),
    namedRanges: uniqueJson(namedRanges),
    classificationIds,
    xrefs: uniqueJson(xrefs),
  };
}

async function loadRomMapPrg(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "prg");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? state.romMapSelectedOffset) || 0,
  ));
  if (loadedPrgManifest && loadedPrgManifest !== manifest) {
    state.romMapLoadedAll = false;
  }
  const all = request.all === true;
  const descriptors = all
    ? manifest.bank_shards.prg
    : [byteMapBankDescriptor(manifest, "prg", selected)];
  const windowOffset = all ? 0 : descriptors[0].address.offset;
  const windowLength = all ? space.length : descriptors[0].address.length;
  const loadKey = `${manifest.source_rom_sha256}:prg:${all ? "all" : descriptors[0].bank}`;
  const shards = await Promise.all(descriptors.map(descriptor =>
    loadByteMapBank(manifest, descriptor)));
  if (all || request.allPages === true) {
    await loadAllByteMapRecordPages(manifest, shards);
  } else {
    await loadByteMapRecordPagesForOffsets(manifest, shards[0], [
      selected, ...(Array.isArray(request.pageOffsets) ? request.pageOffsets : []),
    ]);
  }
  const recordPages = loadedByteMapRecordPages(manifest, shards);
  const pageKey = recordPages
    .map(page => `${page.space}:${page.bank}:${page.page}`).sort().join("|");
  const reuseWindow = loadedPrgManifest === manifest
    && state.romMapLoadKey === loadKey
    && state.romMapBytes && state.romMapDisassembly;
  const [bytes, disassembly] = reuseWindow
    ? [state.romMapBytes, state.romMapDisassembly]
    : await Promise.all([
      assembleBytes(shards, windowOffset, windowLength),
      loadRomMapDisassembly(shards, {offset: windowOffset, length: windowLength}),
    ]);
  state.romMapBytes = bytes;
  state.romMapDisassembly = disassembly;
  if (!reuseWindow || state.romMapPageLoadKey !== pageKey || !state.romMapFieldObjects) {
    const annotations = await buildRomMapPrgAnnotations(recordPages, {
      offset: windowOffset,
      length: windowLength,
      disassembly,
      lookupTables: manifest.lookup_tables,
    });
    const owners = createPrgPhysicalFieldObjects(recordPages,
      {offset: windowOffset, length: windowLength, bytes});
    state.romMapFieldObjects = projectPrgFieldObjects(annotations,
      {offset: windowOffset, bytes, owners: owners.byByte,
        namedRanges: disassembly.namedRanges,
        cpuWindows: shards.map(shard => ({offset: shard.address.offset,
          length: shard.address.length,
          cpuStart: shard.manual?.address?.cpu_start == null ? null
            : Number(shard.manual.address.cpu_start)}))});
    state.romMapAnnotations = state.romMapFieldObjects.byByte.map((object, local) =>
      object?.presentationAt(windowOffset + local) || null);
  }
  state.romMapPrgSections = descriptors;
  state.romMapWindowOffset = windowOffset;
  state.romMapTotalLength = space.length;
  state.romMapLoadedAll = all;
  state.romMapRecordPagesLoaded = recordPages.length;
  state.romMapRecordPagesTotal = shards.reduce(
    (total, shard) => total + shard.record_pages.length, 0,
  );
  state.romMapLoadedRecordPageAddresses = recordPages.map(page => ({...page.address}));
  state.romMapRecordPagesComplete =
    state.romMapRecordPagesLoaded === state.romMapRecordPagesTotal;
  state.romMapLoadKey = loadKey;
  state.romMapPageLoadKey = pageKey;
  state.romMapDisassemblyError = "";
  state.romMapSearchIndex = null;
  state.romMapFilteredOffsets = null;
  state.romMapFilterResult = null;
  state.romMapSelectedOffset = selected;
  loadedPrgManifest = manifest;
  return true;
}

function chrReferenceRecord(uid, range, association, binding = null) {
  return {
    uid,
    label: uid,
    domain: binding?.domain || "unknown",
    kind: binding?.role || "resource",
    producer: association.producer,
    status: association.status,
    start: Number(range.address.offset),
    end: Number(range.address.end_exclusive),
  };
}

function chrShardReferences(manifest, catalog) {
  const bank = Number(catalog.bank);
  const referenceByKey = new Map();
  for (const range of catalog.rangeViews) {
    for (const association of range.associations) {
      const boundIds = new Set();
      for (const binding of association.bindings) {
        const uid = String(binding.resource_id);
        boundIds.add(uid);
        const reference = chrReferenceRecord(uid, range, association, binding);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
      for (const value of association.resourceIds) {
        const uid = String(value);
        if (boundIds.has(uid)) continue;
        const reference = chrReferenceRecord(uid, range, association);
        referenceByKey.set(`${uid}:${reference.start}:${reference.end}`, reference);
      }
    }
  }
  const references = [...referenceByKey.values()]
    .sort((left, right) => String(left.label)
      .localeCompare(String(right.label), "zh-CN") || left.start - right.start);
  const knownBanks = new Set();
  if (references.length) knownBanks.add(bank);
  const semanticRanges = catalog.rangeViews.map(range => {
    const resourceIds = [...new Set(range.associations.flatMap(association => [
      ...association.resourceIds,
      ...association.bindings.map(binding => binding.resource_id),
    ]))];
    const roles = [...new Set(range.associations.flatMap(association =>
      association.bindings.map(binding => binding.role)))];
    const statuses = [...new Set(range.associations.map(association => association.status))];
    const signal = [...resourceIds, ...roles].join(" ");
    return {
      id: `chr:${range.address.offset}:${range.address.end_exclusive}`,
      label: resourceIds.length
        ? `${resourceIds[0]}${resourceIds.length > 1 ? ` 等 ${resourceIds.length} 项` : ""}`
        : "CHR 图像资源范围",
      kind: roles.join(" / ") || "image-data",
      status: statuses.join(" / ") || "classified",
      start: Number(range.address.offset),
      end: Number(range.address.end_exclusive),
      isFont: /font|glyph|字库|字模/i.test(signal),
    };
  });
  return {
    byBank: new Map([[bank, references]]),
    referencedBanks: knownBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

function chrReferences(manifest, catalogs) {
  const byBank = new Map();
  const referencedBanks = new Set();
  const semanticRanges = [];
  for (const catalog of catalogs) {
    const projected = chrShardReferences(manifest, catalog);
    for (const [bank, references] of projected.byBank) byBank.set(bank, references);
    for (const bank of projected.referencedBanks) referencedBanks.add(bank);
    semanticRanges.push(...projected.semanticRanges);
  }
  semanticRanges.sort((left, right) => left.start - right.start);
  return {
    byBank,
    referencedBanks,
    summary: {total_banks: manifest.bank_shards.chr.length},
    semanticRanges,
  };
}

async function loadRomMapChr(options = {}) {
  const request = typeof options === "number" ? {offset: options} : options;
  const manifest = await loadByteMapIndex();
  const space = byteMapSpaceDescriptor(manifest, "chr");
  const selected = Math.max(0, Math.min(
    space.length - 1, Number(request.offset ?? Number(state.romMapChrTile || 0) * 16) || 0,
  ));
  const descriptors = manifest.bank_shards.chr;
  const loadKey = `${manifest.source_rom_sha256}:chr:all`;
  if (loadedChrManifest !== manifest || chrWindow?.repository !== state.projectRepository
      || chrWindow?.bytes !== state.romMapChrBytes) {
    chrWindow = {repository: state.projectRepository, bytes: new Uint8Array(space.length),
      catalogs: new Map(), inflight: new Map()};
    loadedChrManifest = manifest;
    state.romMapChrBytes = chrWindow.bytes;
  }
  const window = chrWindow;
  const requested = Array.isArray(request.banks)
    ? descriptors.filter(descriptor => request.banks.includes(Number(descriptor.bank))) : descriptors;
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(16, requested.length)}, async () => {
    while (cursor < requested.length) {
      const descriptor = requested[cursor++], bank = Number(descriptor.bank);
      if (window.catalogs.has(bank)) continue;
      if (!window.inflight.has(bank)) {
        const pending = loadByteMapBank(manifest, descriptor).then(shard => {
          const bytes = assembleBytes([shard], descriptor.address.offset, descriptor.address.length);
          const catalog = createChrPhysicalFieldObjects(shard, bytes);
          if (catalog.uncovered) throw new Error(`CHR Bank ${catalog.bank} 缺少字段对象`);
          window.bytes.set(bytes, descriptor.address.offset);
          window.catalogs.set(bank, catalog);
        }).finally(() => window.inflight.delete(bank));
        window.inflight.set(bank, pending);
      }
      await window.inflight.get(bank);
    }
  }));
  if (window !== chrWindow || window.bytes !== state.romMapChrBytes
      || window.repository !== state.projectRepository) return false;
  const catalogs = [...window.catalogs.values()].sort((left, right) => left.bank - right.bank);
  state.romMapChrFieldObjects = {byBank: window.catalogs, total: Number(space.bank_size)};
  state.romMapChrReferences = chrReferences(manifest, catalogs);
  state.romMapChrReferences.summary.total_ranges = descriptors.reduce((total, descriptor) => total + descriptor.resources, 0);
  state.romMapChrBankDirectory = Object.freeze(descriptors.map(descriptor => Object.freeze({
    bank: Number(descriptor.bank), resources: descriptor.resources,
    offset: Number(descriptor.address.offset), length: Number(descriptor.address.length),
    ...(window.catalogs.has(Number(descriptor.bank)) ? {uncovered: window.catalogs.get(Number(descriptor.bank)).uncovered} : {}),
  })));
  state.romMapChrSections = descriptors;
  state.romMapChrWindowOffset = 0;
  state.romMapChrTotalLength = space.length;
  if (!request.background) {
    state.romMapChrTile = Math.floor(selected / 16);
    state.romMapChrBank = Math.floor(selected / Number(space.bank_size));
  }
  state.romMapChrLoadKey = loadKey;
  loadedChrManifest = manifest;
  return true;
}

// @editor-module PRG 页面模块归属与展示计算。







//
// 来源：拆分前 engine/editor/app.js 第 743-1137 行。






function romMapFunctionModule(moduleId) {
  return ROM_MAP_FUNCTION_MODULE_BY_ID.get(moduleId)
    || ROM_MAP_FUNCTION_MODULE_BY_ID.get("unassigned");
}



function romMapAnnotationModuleId(annotation) {
  if (!annotation) return "unassigned";
  if (ROM_MAP_FUNCTION_MODULE_BY_ID.has(annotation.moduleId)) return annotation.moduleId;
  const moduleIds = new Set(annotation.moduleIds || []);
  for (const moduleId of ROM_MAP_FUNCTION_MODULE_PRIORITY) {
    if (moduleIds.has(moduleId)) return moduleId;
  }

  const signal = [
    annotation.block?.id,
    annotation.block?.label,
    annotation.record,
    annotation.classificationName,
    annotation.classificationLabel,
    annotation.writebackPath,
    ...(annotation.aliases || []),
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  if (/jukebox|点唱机/.test(signal)) return "jukebox";
  if (/vending|售货机/.test(signal)) return "vending";
  if (/frog-race|青蛙赌博|青蛙赛跑/.test(signal)) return "frograce";
  if (/investigation|调查命令|调查激活|调查功能/.test(signal)) return "investigation";
  if (/field-item|非战斗工具|非战斗道具/.test(signal)) return "fielditems";
  if (/battle-item|战斗工具|战斗道具/.test(signal)) return "battleitems";
  if (/special-shell|normal-shell|炮弹配置|炮弹类型/.test(signal)) return "shells";
  if (/game-data-characters|角色初始|玩家角色初始配置|角色成长/.test(signal)) return "characters";
  if (/game-data-vehicles|载具初始|战车初始化|战车初始配置|玩家战车初始配置/.test(signal)) return "vehicles";
  if (/game-data-monsters|怪物战斗属性|怪物属性/.test(signal)) return "monsters";
  if (/game-data-items|装备与道具|装备配置/.test(signal)) return "equipment";
  if (/scene-npc|npc|场景角色|场景对象/.test(signal)) return "npcs";
  if (/audio|音频|声音命令|dpcm|音序/.test(signal)) return "audio";
  if (/font|glyph|字库|文本|名称/.test(signal)) return "text";
  if (/ending|credits|story|剧情|结局|职员表/.test(signal)) return "story";
  if (/enemy|weapon|monster.*(?:palette|graphic)|攻击视觉|攻击特效|战斗视觉|战斗图形/.test(signal)) return "battle";
  if (/actor|sprite|metasprite|非战斗视觉|非战斗图形|角色形象/.test(signal)) return "actors";
  if (/world-|scene-|地图|场景|metatile/.test(signal)) return "scenes";
  if (/\bui\b|菜单|界面|窗口/.test(signal)) return "ui";

  const domain = annotation.codeFunction?.domain;
  const submodes = annotation.codeFunction?.submodeLabels || annotation.classificationSubmodeLabels || [];
  if (domain === "battle") return "battle";
  if (domain === "audio") return "audio";
  if (domain === "non-battle-ui") return "ui";
  if (domain === "shared-core") return "shared";
  if (domain === "non-battle" && submodes.includes("地图行走")) return "scenes";
  if (annotation.classificationDomainLabel === "战斗流程") return "battle";
  if (annotation.classificationDomainLabel === "音频流程") return "audio";
  if (annotation.classificationDomainLabel === "共享基础代码") return "shared";
  if (annotation.category === "scene" || annotation.category === "world") return "scenes";
  if (annotation.category === "textdata" || annotation.category === "fontdata") return "text";
  if (annotation.category === "script") return "story";
  return "unassigned";
}

function romMapAnnotationModule(annotation) {
  return romMapFunctionModule(romMapAnnotationModuleId(annotation));
}

function romMapDataModuleSummary(annotations) {
  const counts = new Map(ROM_MAP_FUNCTION_MODULES.map(module => [module.id, {
    ...module, total: 0, fields: 0, structures: 0,
  }]));
  for (const annotation of annotations) {
    if (!annotation || annotation.category === "code"
        || !["exact", "partial", "classified"].includes(annotation.status)) continue;
    const entry = counts.get(romMapAnnotationModuleId(annotation)) || counts.get("unassigned");
    entry.total += 1;
    if (["exact", "partial"].includes(annotation.status)) entry.fields += 1;
    else entry.structures += 1;
  }
  return ROM_MAP_FUNCTION_MODULES
    .map(module => counts.get(module.id))
    .filter(entry => entry.total > 0);
}

function romMapHex(value, width = 6) {
  return `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;
}

function romMapPercent(value, total) {
  return total ? `${(Number(value) * 100 / Number(total)).toFixed(2)}%` : "0.00%";
}

function romMapWritebackBytes(total) {
  const manifest = state.browserProjectManifest;
  const targetId = manifest?.default_target;
  const targetDefinition = typeof targetId === "string" && targetId
    ? manifest?.targets?.[targetId]
    : null;
  return authorizedRomMapSlotBytes(targetDefinition, "prg", total);
}

// @editor-module 项目概览展示 ROM 基线、物理布局与覆盖。


function renderHome() {
  const project = state.project || {};
  const manifest = project.manifest || {};
  const rom = manifest.rom || {};
  const coverage = manifest.coverage || {};
  const summary = project.summary || {};
  const resources = project.resource_index?.summary || {};
  const chrReference = project.resource_index?.chr_reference || {};
  // 反向引用图不再进首屏，被引用的 bank 由 chr_reference 直接给。
  const chrReferencedBanks = Array.isArray(chrReference.bank_ids)
    ? new Set(chrReference.bank_ids).size
    : Object.values(chrReference.sources_by_bank || {})
      .filter(sources => sources.length).length;
  const prgBanks = Math.ceil(Number(rom.prg_rom_bytes || 0) / 0x2000);
  const chrBanks = Math.ceil(Number(rom.chr_rom_bytes || 0) / 0x400);
  const physicalCoverage = Number(coverage.covered_bytes || 0) === Number(rom.file_bytes || -1)
    ? "100%" : `${Number(coverage.covered_bytes || 0).toLocaleString()} B`;
  return `<div class="visual-stats home-stats">
      <div><b>${esc(rom.format || "—")}</b><span>卡带格式</span></div>
      <div><b>${rom.mapper ?? "—"}</b><span>Mapper / MMC3 系</span></div>
      <div><b>${bytes(Number(rom.prg_rom_bytes || 0))}</b><span>PRG-ROM · ${prgBanks}×8 KiB</span></div>
      <div><b>${bytes(Number(rom.chr_rom_bytes || 0))}</b><span>CHR-ROM · ${chrBanks}×1 KiB</span></div>
      <div><b>${physicalCoverage}</b><span>物理布局覆盖</span></div>
    </div>
    <div class="section-line"><h2>ROM 基线</h2><span>INES HEADER VERIFIED</span></div>
    <div class="table-wrap home-rom-table"><table>
      <thead><tr><th>属性</th><th>当前值</th></tr></thead>
      <tbody>
        <tr><td title="ROM 导入履历">导入来源</td><td><b>${esc(rom.source_name || "—")}</b></td></tr>
        <tr><td title="导入基线哈希">SHA-256</td><td class="mono home-rom-hash">${esc(rom.sha256 || "—")}</td></tr>
        <tr><td>格式 / Mapper</td><td class="mono">${esc(rom.format || "—")} / ${rom.mapper ?? "—"}${rom.submapper != null ? `.${rom.submapper}` : ""}</td></tr>
        <tr><td>镜像 / 存档</td><td>${esc(rom.mirroring || "—")} / ${rom.battery ? "电池 SRAM" : "无电池"}</td></tr>
        <tr><td title="总大小 ${bytes(Number(rom.file_bytes || 0))}">文件结构</td><td class="mono">HEADER ${bytes(Number(rom.header_bytes || 0))} · TRAINER ${bytes(Number(rom.trainer_bytes || 0))} · TRAILING ${bytes(Number(rom.trailing_bytes || 0))}</td></tr>
        <tr><td>原始头</td><td class="mono">${esc(rom.header_hex || "—")}</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>物理布局</h2><span>FILE OFFSETS</span></div>
    <div class="table-wrap home-layout-table"><table>
      <thead><tr><th>区域</th><th>文件起点</th><th>容量</th><th>Bank 粒度</th><th>状态</th></tr></thead>
      <tbody>
        <tr><td><b>iNES HEADER</b></td><td class="mono">0x000000</td><td>${bytes(Number(rom.header_bytes || 0))}</td><td>固定 16 B</td><td>完整保留</td></tr>
        <tr><td><b>PRG-ROM</b></td><td class="mono">${hex$a(Number(rom.prg_file_offset || 0), 6)}</td><td>${bytes(Number(rom.prg_rom_bytes || 0))}</td><td>${prgBanks} × 8 KiB</td><td>代码、配置、文本与内容资源</td></tr>
        <tr><td><b>CHR-ROM</b></td><td class="mono">${hex$a(Number(rom.chr_file_offset || 0), 6)}</td><td>${bytes(Number(rom.chr_rom_bytes || 0))}</td><td>${chrBanks} × 1 KiB</td><td>NES 2bpp 图块连续平铺</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>字段对象覆盖</h2><button class="button ghost" type="button"
      data-home-field-coverage-load>统计字段对象覆盖</button></div>
    <div class="table-wrap"><table data-home-field-coverage>
      <thead><tr><th>空间</th><th>字段对象</th><th>覆盖字节</th><th>未覆盖</th></tr></thead>
      <tbody>${[["prg", "PRG", "bytemap-prg"], ["chr", "CHR", "bytemap-chr"],
        ["sram", "SRAM", "bytemap-sram"]].map(([space, label, view]) => `<tr data-home-field-space="${space}" data-home-view="${view}" role="link" tabindex="0" title="${label} 字节地图">
        <td>${label} ↗</td><td data-home-field-objects>按需统计</td>
        <td data-home-field-total>按需统计</td><td data-home-field-uncovered>按需统计</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="section-line"><h2>解析覆盖</h2><span>PHYSICAL ≠ SEMANTIC</span></div>
    <div class="table-wrap home-coverage-table"><table>
      <thead><tr><th>指标</th><th>数量 / 状态</th></tr></thead>
      <tbody>
        <tr><td title="${Number(coverage.covered_bytes || 0).toLocaleString()} / ${Number(rom.file_bytes || 0).toLocaleString()} 字节">规范物理布局</td><td><b>${esc(coverage.canonical_layout || "—")}</b> · ${physicalCoverage}</td></tr>
        <tr><td title="${summary.canonical_sections || 0} 个规范分段">语义资产</td><td><b>${summary.semantic_assets || 0}</b> 项</td></tr>
        <tr><td title="${resources.kinds || 0} 类 · ${resources.addressed_records || 0} 行拥有直接物理地址">可寻址资源</td><td><b>${resources.records || 0}</b> 行</td></tr>
        <tr><td title="${resources.unresolved_references || 0} 条未解析引用">资源关联</td><td><b>${resources.resolved_references || 0} / ${resources.references || 0}</b></td></tr>
        <tr><td title="已知功能与配置显式指向的 1 KiB bank">CHR 已知引用</td><td><b>${chrReferencedBanks.toLocaleString()} / ${Number(chrReference.total_banks || chrBanks).toLocaleString()}</b> banks · ${romMapPercent(chrReferencedBanks, chrReference.total_banks || chrBanks)}</td></tr>
        <tr><td>编辑版本</td><td><b>原始版本 / 编辑版本</b></td></tr>
        <tr><td>派生预览</td><td><b>${summary.derived_previews || 0}</b> 项</td></tr>
      </tbody>
    </table></div>`;
}

function bindHomeFieldCoverage() {
  const table = document.querySelector("[data-home-field-coverage]");
  const button = document.querySelector("[data-home-field-coverage-load]");
  if (!table || !button) return;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "统计中…";
    try {
      const coverage = await loadPhysicalFieldObjectCoverage();
      if (!table.isConnected) return;
      for (const [space, count] of Object.entries(coverage)) {
        const row = table.querySelector(`[data-home-field-space="${space}"]`);
        if (!row) continue;
        row.dataset.homeFieldUncovered = String(count.uncovered);
        row.querySelector("[data-home-field-objects]").textContent = count.objects.toLocaleString();
        row.querySelector("[data-home-field-total]").textContent = count.total.toLocaleString();
        row.querySelector("[data-home-field-uncovered]").textContent = count.uncovered.toLocaleString();
      }
      button.textContent = "已统计";
    } catch (error) {
      editorLog.error("项目统计", `操作失败：${error?.message || error}`, error);
      if (!table.isConnected) return;
      table.querySelectorAll("[data-home-field-objects]").forEach(node => {
        node.textContent = `统计失败：${error.message}`;
      });
      button.disabled = false;
      button.textContent = "重试统计";
    }
  });
}

// @editor-module 页面导航、名称过滤与页面内的常驻对象列表。

const storyPageIds = new Set(STORY_PAGE_DEFINITIONS.map(definition => definition.view));
const shopPageIds = new Set([...SHOP_PAGES.map(page => page.id), "jukebox", "vending"]);
const byteMapPageIds = new Set(["prg", "chr", "sram"]);
const bootPageIds = new Set(["boot-logo", "title"]);
const interfacePageIds = new Set(EDITOR_PAGES.filter(page => page.route.view === "interfaceui").map(page => page.id));
const itemPageIds = new Set(EDITOR_PAGES.filter(page => ["equipment", "items", "shells"].includes(page.route.view)).map(page => page.id));

function matches(route, current) {
  return Object.entries(route).every(([key, value]) => String(current[key]) === String(value));
}

function pageRouteAttributes(route) {
  return Object.entries(route).map(([key, value]) => {
    const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    return `data-${name}="${esc(String(value))}"`;
  }).join(" ");
}

function pageRouteHref(route) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(route)) {
    params.set(key === "interfacePage" ? "interface" : key, value);
  }
  return `?${params}`;
}

function pageNavigationMarkup(storyNavigation) {
  return `<div class="page-nav-filter">
      <input type="text" data-page-name-filter aria-label="查找编辑页面" placeholder="查找编辑页面…" autocomplete="off">
      <small data-page-filter-count aria-live="polite"></small>
      <button type="button" data-page-filter-reset aria-label="清空页面过滤" hidden>×</button>
    </div>${editorPageGroups(storyNavigation).map(group => `<section class="nav-group" data-group="${esc(group.label)}">
      <button class="nav-label" type="button">${esc(group.label)}</button>
      ${group.children.map(page => `<button type="button" class="nav-item" data-editor-page="${esc(page.id)}"
        title="${esc(page.title || page.label)}"
        data-page-search="${esc([page.label, ...(page.objects || []).map(item => item.label)].join(" ").toLocaleLowerCase("zh-CN"))}"
        ${pageRouteAttributes(page.route)}>${storyPageIds.has(page.id) ? handleTextMarkup(page.label) : esc(page.label)}</button>`).join("")}
      ${group.label === "项目工具" ? `<details class="cache-control" data-cache-control>
        <summary>缓存 <small data-cache-total>正在统计…</small></summary>
        <div class="cache-control-items">
          <div><b>运行包数据</b><small data-cache-status="package">正在统计…</small>
            <button type="button" data-cache-clear="package" aria-label="清理运行包数据缓存">清理</button></div>
          <div><b>派生预览</b><small data-cache-status="preview">正在统计…</small>
            <button type="button" data-cache-clear="preview" aria-label="清理派生预览缓存">清理</button></div>
          <button type="button" data-cache-clear="all">全部清理</button>
        </div></details>` : ""}
    </section>`).join("")}`;
}

function applyPageNavigationFilters(root = document) {
  const nav = root.querySelector?.("#navigation") || root;
  const query = String(nav.querySelector("[data-page-name-filter]")?.value || "").trim().toLocaleLowerCase("zh-CN");
  const items = [...nav.querySelectorAll("[data-editor-page]")];
  for (const item of items) item.hidden = Boolean(query) && !item.dataset.pageSearch.includes(query);
  for (const group of nav.querySelectorAll(".nav-group")) {
    group.hidden = ![...group.querySelectorAll("[data-editor-page]")].some(item => !item.hidden);
  }
  nav.dataset.pageFilterActive = String(Boolean(query));
  const visible = items.filter(item => !item.hidden).length;
  nav.querySelector("[data-page-filter-count]").textContent = query ? `${visible}/${items.length}` : String(items.length);
  nav.querySelector("[data-page-filter-reset]").hidden = !query;
  return {visible, total: items.length, query};
}

function mountPageNavigation({root = document, storyNavigation = []} = {}) {
  const nav = root.querySelector("#navigation");
  nav.innerHTML = pageNavigationMarkup(storyNavigation);
  if (nav.dataset.pageNavigationBound !== "1") {
    nav.dataset.pageNavigationBound = "1";
    nav.addEventListener("input", event => {
      if (event.target.matches("[data-page-name-filter]")) applyPageNavigationFilters(root);
    });
    nav.addEventListener("click", event => {
      if (!event.target.closest("[data-page-filter-reset]")) return;
      const input = nav.querySelector("[data-page-name-filter]");
      input.value = "";
      applyPageNavigationFilters(root);
      input.focus();
    });
  }
  applyPageNavigationFilters(root);
  return nav;
}

function updatePageNavigation(current, root = document) {
  const page = editorPageForRoute(current);
  const entries = [...root.querySelectorAll("#navigation [data-editor-page]")];
  const screenEntry = entries.find(item => item.dataset.interfaceScreen
    && item.dataset.view === current.view && item.dataset.interfacePage === current.interfacePage
    && item.dataset.interfaceScreen === current.interfaceScreen);
  if (root.body) root.body.dataset.page = page?.id || "";
  if (root.body) root.body.dataset.pageFamily = storyPageIds.has(current.view) ? "story"
    : shopPageIds.has(page?.id) ? "shops"
    : byteMapPageIds.has(page?.id) ? "bytemap"
    : bootPageIds.has(page?.id) ? "boot"
    : interfacePageIds.has(page?.id) ? "interface"
    : itemPageIds.has(page?.id) ? "items" : "";
  for (const item of entries) {
    const active = screenEntry ? item === screenEntry : Boolean(page && item.dataset.editorPage === page.id);
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  const content = root.querySelector("#content");
  if (!content) return page;
  let body = content.closest(".editor-page-body");
  if (!body) {
    body = content.ownerDocument.createElement("div");
    body.className = "editor-page-body";
    content.before(body);
    const list = content.ownerDocument.createElement("nav");
    list.className = "page-objects";
    body.append(list, content);
  }
  const list = body.querySelector(".page-objects");
  list.hidden = !page?.objects;
  body.classList.toggle("has-page-objects", Boolean(page?.objects));
  content.dataset.editorPage = page?.id || "";
  list.setAttribute("aria-label", `${page?.label || "页面"}对象`);
  list.innerHTML = (page?.objects || []).map(item => {
    const active = matches(item.route, current);
    return `<a class="page-object${active ? " active" : ""}" data-page-object="${esc(item.id)}"
      ${pageRouteAttributes(item.route)} href="${esc(pageRouteHref(item.route))}"
      ${active ? 'aria-current="true"' : ""}>${esc(item.label)}</a>`;
  }).join("");
  list.querySelector(".active")?.scrollIntoView({block: "nearest"});
  return page;
}

// @editor-module 承载页面上的模块编辑器；按定稿清单（proposal.json）的 primary_page 归组。
// 模块进入编辑页面的途径只有这一份清单，不从页面或资源形状反推。
const SHOP_PAGE_MODULES = Object.freeze([
  "application-config-family",
  "facility-config",
  "ui-facility",
]);

const PAGE_MODULES = Object.freeze({
  "actors": Object.freeze([
    "direct-frame",
    "metasprite",
    "sprite-palette",
    "actor-visual",
    "shared-chr-bank",
    "metasprite-record",
  ]),
  "audio": Object.freeze([
    "audio-command",
    "audio-driver-section",
    "audio-opcode",
    "audio-voice",
    "dpcm-sample",
    "dpcm-storage",
  ]),
  "attack-effects": Object.freeze([
    "attack-visual",
    "attack-visual-aux-script",
    "battle-action",
    "battle-object-layout",
    "weapon-attack-parameter",
    "shared-indexed-byte-overlays",
  ]),
  "battle-test": Object.freeze([
    "battle-engine",
    "battle-amount-scaling-service",
    "battle-probability-thresholds",
    "battle-random-amount-service",
    "battle-status-scheduler",
    "battle-test-point",
    "index-stride-table",
  ]),
  "battleactors": Object.freeze([
    "battle-party-vertical-layout",
  ]),
  "boot-logo": Object.freeze([
    "boot-presentation",
  ]),
  "characters": Object.freeze([
    "character-growth",
    "character-initial-record",
    "fixed-text-slot",
    "party-field-actor-type-map",
    "party-healing-service",
    "ui-role-status",
    "ui-party-paired-selector",
  ]),
  "equipment-human": Object.freeze([
    "item-entry",
    "role-equipment-derived",
    "ui-equipment-control",
  ]),
  "equipment-tank": Object.freeze([
    "item-entry",
  ]),
  "items": Object.freeze([
    "item-entry",
    "field-item-dispatch",
    "field-item-use",
    "item-acquisition-service",
    "battle-item-service",
  ]),
  "monsters": Object.freeze([
    "monster-profile",
    "enemy-action",
    "enemy-action-pattern",
    "enemy-action-selection-service",
    "monster-figure",
    "monster-graphic",
    "monster-palette",
    "monster-palette-pair",
    "monster-visual-layout",
  ]),
  "scenes": Object.freeze([
    "encounter-event-flag-map",
    "encounter-trigger-runtime",
    "field-scene-lifecycle-service",
    "field-scroll-coordinate-delta-set",
    "metatile-page",
    "metatile-set",
    "palette",
    "scene",
    "scene-encounter-zone",
    "scene-direction-transform",
    "world-event",
  ]),
  "save": Object.freeze([
    "save-slot-runtime-service",
  ]),
  "shells": Object.freeze([
    "shell-record",
  ]),
  ...Object.fromEntries(SHOP_PAGES.filter(page => !['shop-1', 'shop-2', 'shop-3'].includes(page.id))
    .map(page => [page.id, SHOP_PAGE_MODULES])),
  "party-strength": Object.freeze([
    "ui-vehicle-status",
  ]),
  "battle-results": Object.freeze([
    "battle-result-script",
  ]),
  "name-entry": Object.freeze([
    "ui-name-entry",
  ]),
  "text": Object.freeze([
    "char",
    "core-latin",
    "text-render-runtime",
    "text-record",
    "ui-tile-rectangle-service",
  ]),
  "title": Object.freeze([
    "boot-presentation",
  ]),
  "vehicles": Object.freeze([
    "vehicle-preset",
    "save-vehicle",
    "vehicle-visual-selector",
  ]),
  "wanted": Object.freeze([
    "wanted-record",
  ]),
  "wanted-ui": Object.freeze([
    "ui-wanted",
  ]),
});

// 同一页面里一个模块只能出现一条：重复会让承载页面长出两个同名模块段。
for (const [page, modules] of Object.entries(PAGE_MODULES)) {
  if (new Set(modules).size !== modules.length) throw new TypeError(`承载页面模块清单有重复：${page}`);
}

// @editor-module 承载页面上常驻的模块编辑器：列出定稿清单里属于本页的模块，展开时把控件挂进页面。
//
// **展开才挂。** 一个页面最多几十个模块，实测全量挂载最重的一页要 57 秒（176 个
// 合计 143 秒），页面打开会卡死；折叠时只有标题，展开的那一项才取数、渲染、绑定。

// 这些 owner 的字段对象按资源实例登记，不能作为一个抽象模块交给 core 的
// PAGE_MODULES。承载页在这里展开它们；折叠项不会取数或挂载控件。
const FIELD_OBJECT_PAGE_MODULES = Object.freeze({
  scenes: Object.freeze(['scene-encounter-zone']),
  text: Object.freeze(['text.character-map']),
});

// 场景详情页只承载当前场景自己的字段对象；全局表与遇敌区留在场景列表页。
function currentSceneModule() {
  const entry = (state.project?.scenes?.editable_scenes || [])
    .find(item => item.slug === state.sceneSlug);
  return entry ? `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, '0')}` : null;
}

const FIELD_OBJECT_MODULE_TITLES = Object.freeze({
  'application-config-family': '应用配置族',
  'scene-encounter-zone': '场景遇敌区',
  'text.character-map': '字符映射注解',
});

function pageModuleIds(pageId) {
  const id = String(pageId || '');
  if (id === 'scenes' && state.sceneSlug) {
    const scene = currentSceneModule();
    return scene ? [scene] : [];
  }
  if (id === 'scenes' && state.sceneListTab === 'actors') {
    return ['application-command', 'scene-actor'];
  }
  if (id === 'scenes' && state.sceneListTab === 'investigation') {
    return ['field-reward-resolution-service', 'facility-config', 'scene', 'investigation-command'];
  }
  return [...new Set([...(PAGE_MODULES[id] || []), ...(FIELD_OBJECT_PAGE_MODULES[id] || [])])];
}

function pageModuleEditorsMarkup(pageId) {
  const modules = pageModuleIds(pageId);
  if (!modules.length) return '';
  return `<section class="page-module-editors" data-page-modules="${esc(pageId)}">${
    modules.map(moduleId => `<details class="wide-card" data-page-module="${esc(moduleId)}"${
      moduleId === 'field-reward-resolution-service' ? ' id="scene-reward-parameters"'
        : moduleId === 'application-command' ? ' id="scene-application-parameters"'
          : pageId === 'scenes' && state.sceneListTab === 'investigation' && moduleId === 'facility-config'
            ? ' id="scene-investigation-parameters"' : ''}>
      <summary>${esc(moduleId)}</summary>
      <div data-page-module-host="${esc(moduleId)}"></div>
    </details>`).join('')}</section>`;
}

async function mountSection(details) {
  const host = details.querySelector('[data-page-module-host]');
  if (!host || host.dataset.pageModuleMounted === '1') return;
  host.dataset.pageModuleMounted = '1';
  if (details.id === 'scene-investigation-parameters') {
    const objects = await db.getFieldObjects('facility-config');
    for (const object of objects.filter(object => object.fields.some(field =>
      field.entityHandle.startsWith('family-0d-')))) {
      const controls = document.createElement('div');
      host.append(controls);
      await object.mount(controls);
    }
    return;
  }
  const {mountPageFields} = await import('./battle-action-dimension-controls-BKLcECRw.js').then(function (n) { return n.pageFields; });
  await mountPageFields(host, details.dataset.pageModule);
}

async function mountPageModuleEditors(root, pageId) {
  const section = root.querySelector(`[data-page-modules="${CSS.escape(String(pageId || ''))}"]`);
  if (!section) return [];
  if (!state.moduleCatalog) state.moduleCatalog = await loadModuleCatalog();
  const sections = [...section.querySelectorAll('[data-page-module]')];
  for (const details of sections) {
    const module = details.dataset.pageModule === 'application-config-family'
      ? null : state.moduleCatalog.module(details.dataset.pageModule);
    const title = details.dataset.pageModule === 'application-config-family'
      ? FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule]
      : module?.title || resourceLabel(details.dataset.pageModule)
        || FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule];
    if (title) details.querySelector('summary').textContent = title;
    if (details.id === 'scene-investigation-parameters') details.querySelector('summary').textContent = '调查物配置';
    details.addEventListener('toggle', () => {void mountSection(details);});
    if (details.id && location.hash.slice(1).startsWith(details.id)) {
      details.open = true;
      await mountSection(details);
      const suffix = location.hash.slice(details.id.length + 2);
      const select = details.querySelector('[data-module-resource-select]');
      if (details.id === 'scene-application-parameters' && suffix && select) {
        select.value = `application-command:${suffix}`;
        select.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  }
  return sections.map(details => details.dataset.pageModule);
}

// @editor-module 合并页面在页内切换既有流程入口。

function pageVariantsMarkup(page, current) {
  if (!page?.variants?.length) return '';
  const selected = page.variants.filter(variant => Object.entries(variant.route).every(([key, value]) =>
    key === 'facility' || String(current[key]) === String(value)))
    .sort((a, b) => Object.keys(b.route).length - Object.keys(a.route).length)[0];
  return `<div class="data-editor-toolbar" data-page-variants="${esc(page.id)}"><label>流程实例
    <select data-page-variant aria-label="${esc(page.label)}流程实例">${page.variants.map(variant =>
      `<option value="${esc(variant.id)}"${variant === selected ? ' selected' : ''}>${esc(variant.label)}</option>`).join('')}</select>
    </label></div>`;
}

function bindPageVariants(root, page) {
  root.querySelector('[data-page-variant]')?.addEventListener('change', event => {
    const variant = page.variants.find(variant => variant.id === event.target.value);
    if (!variant) return;
    const params = new URLSearchParams(Object.entries(variant.route)
      .filter(([key]) => key !== 'interface')
      .map(([key, value]) => [key === 'interfacePage' ? 'interface' : key, value]));
    void navigateInternalUrl(new URL(`?${params}`, location.href));
  });
}

// @editor-module 三栏编辑页的骨架、预览排布与画布缩放。

let headerPlacement = null;

function restorePageHeader() {
  if (!headerPlacement) return;
  for (const {element, marker} of headerPlacement.moves.reverse()) marker.replaceWith(element);
  for (const group of headerPlacement.groups) group.classList.remove('page-header-group');
  headerPlacement.row.classList.remove('page-header-row');
  if (headerPlacement.created) {
    headerPlacement.row.remove();
    headerPlacement.workbench.classList.remove('screen-workbench--with-toolbar');
  }
  if (headerPlacement.external) headerPlacement.workbench.classList.add('screen-workbench--with-toolbar');
  headerPlacement = null;
  delete document.body.dataset.compactPageHeader;
}

/** 页头合并须保留控件节点、事件绑定与工作台缓存的原位置。 */
function compactPageHeader({content, head}) {
  restorePageHeader();
  const panels = '.workspace-tree, .workspace-stage, .workspace-inspector, .screen-workbench-bottom';
  const workbench = [...content.querySelectorAll('[data-screen-workbench]')]
    .find(element => !element.closest(panels)
      && (element.dataset.screenWorkbenchHeader === 'external' || element.getClientRects().length));
  const boundary = workbench || content.querySelector('table, .record-body');
  const groups = [...content.querySelectorAll('[data-page-variants], [data-story-page-io], .text-mode-tabs, .data-tabs, .data-editor-toolbar, .view-tabs')]
    .filter(element => !element.closest('[data-screen-workbench]')
      && element.getClientRects().length
      && (!boundary || element.compareDocumentPosition(boundary) & globalThis.Node.DOCUMENT_POSITION_FOLLOWING));
  const toolbar = workbench?.querySelector(':scope > .screen-workbench-top');
  const external = Boolean(workbench?.dataset.screenWorkbenchHeader === 'external' && groups.length);
  let row = external ? groups[0] : toolbar || groups[0] || head;
  const created = Boolean(workbench && !external && !toolbar);
  if (created) {
    row = document.createElement('header');
    row.className = 'screen-workbench-top';
    workbench.prepend(row);
    workbench.classList.add('screen-workbench--with-toolbar');
  }
  if (external && toolbar) {
    groups.push(toolbar);
    workbench.classList.remove('screen-workbench--with-toolbar');
  }
  headerPlacement = {row, workbench, created, external, groups, moves: []};
  const relocate = (element, target, before = null) => {
    const marker = document.createComment('page-header');
    element.before(marker);
    target.insertBefore(element, before);
    headerPlacement.moves.push({element, marker});
  };
  const move = (element, before = null) => {
    if (element !== row) relocate(element, row, before);
  };
  if (!workbench && row !== head && row.parentElement !== content) {
    let container = row.closest('form') || row.parentElement;
    while (container.parentElement !== content && !container.matches('form')) container = container.parentElement;
    relocate(row, container, container.firstChild);
  }
  const first = row.firstChild;
  move(head, first);
  for (const group of groups) {
    group.classList.add('page-header-group');
    move(group, first);
  }
  row.classList.add('page-header-row');
  for (const value of row.querySelectorAll('h1, p, .record-title')) value.title ||= value.textContent.trim();
  document.body.dataset.compactPageHeader = 'true';
}

const attributesMarkup = attributes => Object.entries(attributes || {}).map(([name, value]) =>
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

/** 顶部工具栏与页面标题共用单行。 */
function bindScreenWorkbenchPageHeader({namespace, root = document} = {}) {
  const workbench = workbenchRoot(namespace, root);
  const toolbar = workbench?.querySelector(':scope > .screen-workbench-top');
  const heading = document.querySelector('.page-head');
  if (!toolbar || !heading) return;
  toolbar.dataset.screenWorkbenchPageHeader = namespace;
  heading.insertBefore(toolbar, heading.querySelector('.head-actions'));
  workbench.classList.remove('screen-workbench--with-toolbar');
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
    data-screen-workbench="${esc(namespace)}"${attributesMarkup(attributes)}>
    ${toolbarMarkup ? `<header class="screen-workbench-top">${toolbarMarkup}</header>` : ''}
    <aside class="workspace-tree${treeScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${treeClassName ? ` ${esc(treeClassName)}` : ''}"${attributesMarkup(treeAttributes)}>
      ${treeTitle == null ? '' : `<h3>${esc(treeTitle)}</h3>`}
      ${treeMarkup}
    </aside>
    ${stageMarkup ? `<div class="workspace-stage">${stageToolbarMarkup ? `<div class="screen-workbench-stage-toolbar">${stageToolbarMarkup}</div>` : ''}${stageMarkup}</div>` : ""}
    <aside class="workspace-inspector${inspectorScroll === 'body' ? ' workspace-panel--body-scroll' : ''}${
      inspectorClassName ? ` ${esc(inspectorClassName)}` : ""
    }"${attributesMarkup(inspectorAttributes)}>
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
  }"${attributesMarkup(attributes)}>
    ${toolbarMarkup || zoomMarkup ? `<div class="screen-workbench-toolbar">
      ${toolbarMarkup}
      ${zoomMarkup ? `<div class="screen-workbench-zoom">${zoomMarkup}${zoomStatusMarkup}</div>` : ''}
    </div>` : ""}
    <div class="screen-workbench-canvas-box${viewportClassName ? ` ${esc(viewportClassName)}` : ''}"
      data-screen-workbench-canvas-box="${esc(namespace)}"${attributesMarkup(viewportAttributes)}>
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
  const available = () => workbench.clientHeight - (workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0) - 1;
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
    workbench.style.setProperty('--workbench-toolbar-height', `${workbench.querySelector('.screen-workbench-top')?.offsetHeight || 0}px`);
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

// @editor-module 显示可丢弃缓存的分类占用并提供分项与全部清理。

const formatBytes = bytes => {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
};

let refreshTimer = null;
let clearing = false;
const projectId = () => state.projectRepository?.projectId || ACTIVE_PROJECT_ID;
const controls = root => [
  ...(root.matches?.("[data-cache-control]") ? [root] : []),
  ...(root.querySelectorAll?.("[data-cache-control]") || []),
];

async function refreshCacheControls(root = document) {
  const requestedProjectId = projectId();
  const results = await Promise.allSettled([
    packageCacheStats(), previewCacheProjectStats(requestedProjectId),
  ]);
  if (requestedProjectId !== projectId()) return null;
  const stats = Object.fromEntries(["package", "preview"].map((category, index) => {
    const result = results[index];
    if (result.status === "rejected") {
      editorLog.error("后台准备", "缓存统计失败", result.reason);
    }
    return [category, result.status === "fulfilled" ? result.value : null];
  }));
  controls(root).forEach(control => {
    for (const category of Object.keys(stats)) {
      const value = stats[category];
      const status = control.querySelector(`[data-cache-status="${category}"]`);
      const button = control.querySelector(`[data-cache-clear="${category}"]`);
      if (status) status.textContent = value
        ? `${value.entries} 项 · ${formatBytes(value.bytes)}` : "缓存不可用";
      if (button) button.disabled = clearing || !value?.entries;
    }
    const values = Object.values(stats).filter(Boolean);
    const total = control.querySelector("[data-cache-total]");
    if (total) total.textContent = values.length
      ? formatBytes(values.reduce((sum, row) => sum + row.bytes, 0)) : "缓存不可用";
    const button = control.querySelector('[data-cache-clear="all"]');
    if (button) button.disabled = clearing || !values.some(row => row.entries);
  });
  return stats;
}

function scheduleRefresh(root, delay = 250) {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshCacheControls(root);
  }, delay);
}

function bindCacheControls(root = document) {
  if (root.documentElement?.dataset.cacheControlBound === "1") {
    void refreshCacheControls(root);
    return;
  }
  if (root.documentElement) root.documentElement.dataset.cacheControlBound = "1";
  globalThis.addEventListener?.("mmeditor:preview-cache-change", event => {
    if (!event.detail?.projectId || event.detail.projectId === projectId()) scheduleRefresh(root);
  });
  globalThis.addEventListener?.("mmeditor:package-cache-change", () => scheduleRefresh(root));
  root.addEventListener("click", async event => {
    const button = event.target.closest?.("[data-cache-clear]");
    if (!button || clearing) return;
    const category = button.dataset.cacheClear;
    const requestedProjectId = projectId();
    clearing = true;
    controls(root).forEach(control => control.querySelectorAll("[data-cache-clear]")
      .forEach(item => {item.disabled = true;}));
    const task = editorLog.startTask({source: "后台准备", message: "清理缓存"});
    try {
      const jobs = [];
      if (category === "package" || category === "all") {
        jobs.push(deletePackageCache().then(() => discardPackagePrefetch()));
      }
      if (category === "preview" || category === "all") {
        jobs.push(deletePreviewCacheProject(requestedProjectId));
      }
      const results = await Promise.allSettled(jobs);
      const failed = results.find(result => result.status === "rejected");
      if (failed) throw failed.reason;
      task.finish({message: "缓存已清理"});
    } catch (error) {
      task.finish({level: "error", message: `缓存清理失败：${error.message || error}`, error});
    } finally {
      clearing = false;
      await refreshCacheControls(root);
    }
  });
  void refreshCacheControls(root);
}

// @editor-module 将快速构建交给 Worker，映射回当前项目的构建状态。
let buildWorker = null;

async function runQuickBuild({onEvent} = {}) {
  if (state.browserBuildRunning) throw new Error("已有一个 ROM 构建正在进行");
  const worker = buildWorker ||= new Worker(new URL("./quick-build-worker.js", new URL("../ui/quick-build.js", import.meta.url).href), {type: "module"});
  state.browserBuildRunning = true;
  state.browserBuildError = "";
  state.browserBuildEvents = [];
  state.browserBuildCurrentEvent = null;
  state.browserBuildReport = null;
  state.browserBuildRom = null;
  state.browserBuildSave = null;
  state.browserBuildTimings = null;
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  publishBuildState();
  try {
    return await new Promise((resolve, reject) => {
      worker.onerror = event => {
        event.preventDefault();
        reject(new Error(event.message || "快速构建 Worker 启动失败"));
      };
      worker.onmessage = ({data}) => {
        if (data.type === "event") {
          if (data.event.stage === "hydrate" && data.event.status !== "success") {
            state.browserBuildCurrentEvent = data.event;
            reportBuildState({running: true, event: data.event});
          } else {
            publishBuildState(data.event);
          }
          onEvent?.(data.event);
        } else if (data.type === "hydrated") {
          state.browserProjectManifest = data.manifest;
          state.projectBootstrapStatus = "ready";
        } else if (data.type === "complete") {
          state.browserProjectManifest = data.manifest;
          state.browserBuildReport = data.result.report;
          state.browserBuildRom = data.result.rom;
          state.browserBuildSave = data.result.save;
          state.browserBuildTimings = data.timings;
          resolve(data.result);
        } else if (data.type === "error") {
          const error = new Error(data.message);
          if (data.stack) error.stack = data.stack;
          reject(error);
        }
      };
      worker.postMessage(null);
    });
  } catch (error) {
    worker.terminate();
    buildWorker = null;
    state.browserBuildError = error.message;
    if (state.projectBootstrapStatus === "loading") {
      state.projectBootstrapStatus = "error";
      state.projectBootstrapError = error.message;
    }
    publishBuildState({stage: "error", message: error.message, status: "error", error});
    throw error;
  } finally {
    state.browserBuildRunning = false;
    publishBuildState();
  }
}

var profile = {"bank_bytes":8192,"first_bank":64,"end_bank_exclusive":126,"boot_bank":125,"result_cpu":768,"stub":{"bank":127,"cpu":58757,"capacity":361,"evidence":"project/evidence/reverse-engineering/story-script-space-coverage/observations.json"},"reset":{"bank":127,"bank_offset":8188},"program":{"bank_offset":512,"cpu":1024,"capacity":512},"loader":{"bank_offset":256,"length":20},"executor":{"bank_offset":64,"length":9},"font":{"bank":35,"cpu":47104,"length":2048}};

// @editor-module 为扩容 ROM 准备复位短桩、RAM 检测程序与扩展区执行片段。


const BOOT_BANK = profile.boot_bank;
const STUB_CPU = profile.stub.cpu;
const STUB_CAPACITY = profile.stub.capacity;
const PROGRAM_CPU = profile.program.cpu;
const PROGRAM_CAPACITY = profile.program.capacity;
const RESULT = profile.result_cpu;

function program(origin) {
  const bytes = [], labels = new Map(), fixups = [];
  const emit = (...values) => bytes.push(...values);
  const label = name => labels.set(name, origin + bytes.length);
  const absolute = (opcode, target) => {
    emit(opcode, 0, 0);
    fixups.push({at: bytes.length - 2, target});
  };
  const branch = (opcode, target) => {
    emit(opcode, 0);
    fixups.push({at: bytes.length - 1, target, relative: true});
  };
  const finish = () => {
    for (const {at, target, relative} of fixups) {
      const address = labels.get(target);
      if (address === undefined) throw new Error(`检测程序缺少标签 ${target}`);
      const value = relative ? address - (origin + at + 1) : address;
      if (relative && (value < -128 || value > 127)) throw new Error(`检测程序分支越界 ${target}`);
      bytes[at] = value & 255;
      if (!relative) bytes[at + 1] = value >> 8;
    }
    return Uint8Array.from(bytes);
  };
  return {emit, label, absolute, branch, finish, labels};
}

function tiles(text) {
  return Array.from(text, character => character === " " ? 127 :
    character === "-" ? 98 : parseInt(character, 36));
}

function mapBank(emit, register, bank) {
  emit(0xA9, register, 0x8D, 0, 0x80, 0xA9, bank, 0x8D, 1, 0x80);
}

function ppuAddress(emit, address) {
  emit(0xA9, address >> 8, 0x8D, 6, 0x20, 0xA9, address & 255, 0x8D, 6, 0x20);
}

function prepareExpandedRomTest() {
  const stub = program(STUB_CPU);
  const {emit: s, label: sl, absolute: sa, branch: sb} = stub;
  s(0x78, 0xD8, 0xA2, 255, 0x9A, 0xA9, 0,
    0x8D, 0, 0x20, 0x8D, 1, 0x20, 0x8D, 0, 0xE0);
  sl("warm1"); s(0x2C, 2, 0x20); sb(0x10, "warm1");
  sl("warm2"); s(0x2C, 2, 0x20); sb(0x10, "warm2");
  mapBank(s, 0x87, BOOT_BANK);
  s(0xAD, 0, 0xA0, 0xC9, 0x4D); sb(0xD0, "bootFail");
  s(0xAD, 8, 0xA0, 0xC9, BOOT_BANK); sb(0xD0, "bootFail");
  s(0x4C, profile.loader.bank_offset & 255, 0xA0 + (profile.loader.bank_offset >> 8));
  sl("bootFail");
  s(0xA9, 2, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3,
    0xA9, BOOT_BANK, 0x8D, 2, 3);
  sa(0x20, "font");
  ppuAddress(s, 0x2146);
  s(0xA2, 0); sl("failText"); sa(0xBD, "failure");
  s(0x8D, 7, 0x20, 0xE8, 0xE0, 22); sb(0xD0, "failText");
  sa(0x4C, "waitKey");

  sl("font");
  mapBank(s, 0x87, profile.font.bank);
  mapBank(s, 0x82, 8);
  mapBank(s, 0x83, 9);
  s(0xAD, 2, 0x20, 0xA9, 0, 0x85, 0, 0x8D, 6, 0x20, 0x8D, 6, 0x20,
    0xA9, profile.font.cpu >> 8, 0x85, 1, 0xA0, 0);
  sl("fontCopy"); s(0xB1, 0, 0x8D, 7, 0x20, 0xC8); sb(0xD0, "fontCopy");
  s(0xE6, 1, 0xA5, 1, 0xC9, (profile.font.cpu + profile.font.length) >> 8); sb(0xD0, "fontCopy");
  ppuAddress(s, 0x07F0);
  s(0xA2, 16, 0xA9, 0); sl("blank"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "blank");
  ppuAddress(s, 0x2000);
  s(0xA0, 4, 0xA2, 0, 0xA9, 127); sl("clear"); s(0x8D, 7, 0x20, 0xE8); sb(0xD0, "clear");
  s(0x88); sb(0xD0, "clear");
  ppuAddress(s, 0x23C0);
  s(0xA2, 64, 0xA9, 0); sl("attributes"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "attributes");
  ppuAddress(s, 0x3F00);
  s(0xA9, 15, 0x8D, 7, 0x20, 0xA2, 3, 0xA9, 0x30);
  sl("palette"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "palette");
  s(0x60);

  sl("waitKey");
  s(0xA9, 0, 0x8D, 0, 0x20, 0x8D, 5, 0x20, 0x8D, 5, 0x20,
    0xA9, 0x0A, 0x8D, 1, 0x20);
  sa(0x20, "key"); sb(0xD0, "waitKey");
  sl("press"); sa(0x20, "key"); sb(0xF0, "press");
  s(0xA9, 0, 0x8D, 1, 0x20, 0x4C, 0x3B, 0xFF);
  sl("key");
  s(0xA9, 1, 0x8D, 0x16, 0x40, 0xA9, 0, 0x8D, 0x16, 0x40,
    0xA2, 8, 0x85, 2);
  sl("keyBit"); s(0xAD, 0x16, 0x40, 0x4A, 0x26, 2, 0xCA); sb(0xD0, "keyBit");
  s(0xA5, 2, 0x60);
  sl("failure"); s(...tiles(`FAIL BANKS 00 FIRST ${BOOT_BANK.toString(16).toUpperCase()}`));
  const stubBytes = stub.finish();
  if (stubBytes.length > STUB_CAPACITY) throw new Error(`复位短桩超过现场未读取范围：${stubBytes.length}`);

  const runtime = program(PROGRAM_CPU);
  const {emit: e, label: l, absolute: a, branch: b} = runtime;
  const callStub = name => e(0x20, stub.labels.get(name) & 255, stub.labels.get(name) >> 8);
  e(0xA9, 1, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3, 0xA9, 255, 0x8D, 2, 3,
    0xA9, profile.first_bank, 0x8D, 3, 3);
  l("bank");
  e(0xA9, 0x87, 0x8D, 0, 0x80, 0xAD, 3, 3, 0x8D, 1, 0x80, 0xA2, 7);
  l("check"); e(0xBD, 0, 0xA0); a(0xDD, "marker"); b(0xD0, "bad");
  e(0xCA); b(0x10, "check");
  e(0xAD, 8, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0x49, 255, 0xCD, 9, 0xA0); b(0xD0, "bad");
  e(0xAD, 10, 0xA0, 0xC9, 0x74); b(0xD0, "bad");
  e(0xAD, 11, 0xA0, 0xC9, 0xA5); b(0xD0, "bad");
  e(0xAD, 12, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0xAD, 13, 0xA0, 0x0D, 14, 0xA0, 0x0D, 15, 0xA0); b(0xD0, "bad");
  e(0xA2, profile.executor.length - 1);
  l("codeCheck"); e(0xBD, profile.executor.bank_offset, 0xA0); a(0xDD, "executor"); b(0xD0, "bad");
  e(0xCA); b(0x10, "codeCheck");
  e(0xA9, 0, 0x8D, 4, 3, 0x20, profile.executor.bank_offset, 0xA0,
    0xAD, 3, 3, 0x49, 0xA5, 0xCD, 4, 3); b(0xF0, "good");
  l("bad"); e(0xA9, 2, 0x8D, 0, 3, 0xAD, 2, 3, 0xC9, 255); b(0xD0, "next");
  e(0xAD, 3, 3, 0x8D, 2, 3); a(0x4C, "next");
  l("good"); e(0xEE, 1, 3);
  l("next"); e(0xEE, 3, 3, 0xAD, 3, 3, 0xC9, profile.end_bank_exclusive); b(0xF0, "display"); a(0x4C, "bank");
  l("display"); callStub("font");

  const row = (address, text, name) => {
    ppuAddress(e, address);
    e(0xA2, 0); l(name); a(0xBD, `${name}Text`); e(0x8D, 7, 0x20, 0xE8, 0xE0, text.length); b(0xD0, name);
  };
  row(0x2106, "EXPANDED ROM TEST", "title");
  ppuAddress(e, 0x2168);
  e(0xAD, 0, 3, 0xC9, 1); b(0xD0, "failed");
  for (const byte of tiles("PASS")) e(0xA9, byte, 0x8D, 7, 0x20);
  a(0x4C, "count");
  l("failed"); for (const byte of tiles("FAIL")) e(0xA9, byte, 0x8D, 7, 0x20);
  l("count"); row(0x21C6, "BANKS ", "banks");
  e(0xAD, 1, 3, 0xA2, 0);
  l("decimal"); e(0xC9, 10); b(0x90, "digits"); e(0x38, 0xE9, 10, 0xE8); a(0x4C, "decimal");
  l("digits"); e(0x48, 0x8E, 7, 0x20, 0x68, 0x8D, 7, 0x20);
  const totalText = `OF ${profile.end_bank_exclusive - profile.first_bank}`;
  row(0x21D1, totalText, "total");
  row(0x2206, "FIRST ", "first");
  e(0xAD, 2, 3, 0xC9, 255); b(0xD0, "firstBank");
  e(0xA9, 98, 0x8D, 7, 0x20, 0x8D, 7, 0x20); a(0x4C, "prompt");
  l("firstBank"); e(0x48, 0x4A, 0x4A, 0x4A, 0x4A, 0x8D, 7, 0x20, 0x68, 0x29, 15, 0x8D, 7, 0x20);
  l("prompt"); row(0x2266, "PRESS ANY BUTTON", "buttons");
  e(0x4C, stub.labels.get("waitKey") & 255, stub.labels.get("waitKey") >> 8);
  for (const [name, text] of [["title", "EXPANDED ROM TEST"], ["banks", "BANKS "],
    ["total", totalText], ["first", "FIRST "], ["buttons", "PRESS ANY BUTTON"]]) {
    l(`${name}Text`); e(...tiles(text));
  }
  l("marker"); e(...new TextEncoder().encode("MMEXP74"), 0);
  const executor = Uint8Array.from([0xAD, 8, 0xA0, 0x49, 0xA5, 0x8D, 4, 3, 0x60]);
  l("executor"); e(...executor);
  const runtimeBytes = runtime.finish();
  if (runtimeBytes.length > PROGRAM_CAPACITY) throw new Error("扩展区检测程序超过 RAM 载入容量");
  const loader = program(0xA000 + profile.loader.bank_offset);
  loader.emit(0xA2, 0);
  loader.label("copy");
  for (let page = 0; page < PROGRAM_CAPACITY / 256; page++) {
    loader.emit(0xBD, profile.program.bank_offset & 255, 0xA0 + (profile.program.bank_offset >> 8) + page,
      0x9D, PROGRAM_CPU & 255, (PROGRAM_CPU >> 8) + page);
  }
  loader.emit(0xE8);
  loader.branch(0xD0, "copy");
  loader.emit(0x4C, PROGRAM_CPU & 255, PROGRAM_CPU >> 8);
  const loaderBytes = loader.finish();
  if (loaderBytes.length !== profile.loader.length) throw new Error("扩展区载入程序长度与声明不符");
  return {stubBytes, runtimeBytes, loaderBytes, executor, bootBank: BOOT_BANK,
    firstBank: profile.first_bank, endBankExclusive: profile.end_bank_exclusive,
    bankBytes: profile.bank_bytes, executorOffset: profile.executor.bank_offset,
    stubPrgOffset: profile.stub.bank * profile.bank_bytes + STUB_CPU - 0xE000,
    resetPrgOffset: profile.reset.bank * profile.bank_bytes + profile.reset.bank_offset,
    programPrgOffset: BOOT_BANK * profile.bank_bytes + profile.program.bank_offset,
    loaderPrgOffset: BOOT_BANK * profile.bank_bytes + profile.loader.bank_offset,
    resetBytes: Uint8Array.from([STUB_CPU & 255, STUB_CPU >> 8]),
    resultCpu: RESULT, programCpu: PROGRAM_CPU, stubCapacity: STUB_CAPACITY,
    evidence: profile.stub.evidence, programCapacity: PROGRAM_CAPACITY};
}

// @editor-module 准备 mapper 74 扩展布局与可选诊断片段，由 RomLinker 写入。

const EXPANDED_PRG_BYTES = 1024 * 1024;
const ORIGINAL_PRG_BYTES = 512 * 1024;
const BANK_BYTES = 8192;
const READER = Uint8Array.from([0xA2, 0, 0xBD, 0, 0xA0, 0x9D, 0, 5, 0xE8, 0xE0, 16, 0xD0, 0xF5, 0x60]);

function inspectExpansionSource(source) {
  if (!(source instanceof Uint8Array) || source.length < 16 ||
      source[0] !== 0x4E || source[1] !== 0x45 || source[2] !== 0x53 || source[3] !== 0x1A) {
    throw new Error("扩容需要 NES ROM");
  }
  const format = source[7] & 12;
  const mapper = (source[6] >> 4) | (source[7] & 0xF0) |
    (format === 8 ? (source[8] & 15) << 8 : 0);
  const prgUnits = source[4] | (format === 8 ? (source[9] & 15) << 8 : 0);
  const chrUnits = source[5] | (format === 8 ? (source[9] >> 4) << 8 : 0);
  if (![0, 8].includes(format) || source[6] & 4 || mapper !== 74 ||
      prgUnits !== 32 || chrUnits !== 32 || source.length !== 16 + 768 * 1024) {
    throw new Error("扩容仅支持无 trainer 的 mapper 74、512 KiB PRG、256 KiB CHR ROM");
  }
}

async function createExpandedRom(source, {nes2 = false, diagnostic = false} = {}) {
  const alreadyExpanded = source instanceof Uint8Array && source[4] === 64 &&
    source.length === 16 + EXPANDED_PRG_BYTES + 256 * 1024;
  // 已扩展输入保留新增区的当前字节；诊断只应用明确列出的补丁。
  const original = alreadyExpanded ? RomLinker.originalRom(source, ORIGINAL_PRG_BYTES) : source;
  inspectExpansionSource(original);
  const header = source.slice(0, 16);
  header[4] = EXPANDED_PRG_BYTES / 16384;
  if (nes2) {
    header[7] = 0x48;
    header.set([0, 0, 0x70, 5, 0, 0, 0, 0], 8);
  }
  const fragments = [];
  const markers = [];
  const test = diagnostic ? prepareExpandedRomTest() : null;
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    const marker = new Uint8Array(16);
    marker.set(new TextEncoder().encode("MMEXP74"));
    marker.set([bank, bank ^ 255, 0x74, 0xA5, bank, 0, 0, 0], 8);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes: marker});
    fragments.push({offset: 16 + bank * BANK_BYTES + 0x20, bytes: READER});
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(marker, byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0xA020, kind: "written-marker"});
  }
  const fixedBankMirrors = {};
  for (let index = 0; index < 2; index++) {
    const bank = 0x7E + index;
    const sourceBank = ORIGINAL_PRG_BYTES / BANK_BYTES - 2 + index;
    const bytes = source.slice(16 + sourceBank * BANK_BYTES, 16 + (sourceBank + 1) * BANK_BYTES);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes});
    fixedBankMirrors[sourceBank.toString(16).toUpperCase()] = bank.toString(16).toUpperCase();
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0x0440, kind: "fixed-bank-mirror-signature"});
  }
  const bootPatches = test ? [
    {offset: 16 + test.stubPrgOffset, bytes: test.stubBytes},
    {offset: 16 + test.resetPrgOffset, bytes: test.resetBytes},
    {offset: 16 + test.programPrgOffset, bytes: test.runtimeBytes},
    {offset: 16 + test.loaderPrgOffset, bytes: test.loaderBytes},
  ] : [];
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    bootPatches.push({offset: 16 + bank * test.bankBytes + test.executorOffset, bytes: test.executor});
  }
  fragments.push(...bootPatches);
  const rom = alreadyExpanded ? RomLinker.applyFragments(source, {header, fragments}) :
    RomLinker.expandRom(source, {header, originalPrgBytes: ORIGINAL_PRG_BYTES,
    expandedPrgBytes: EXPANDED_PRG_BYTES, fragments});
  return {rom, markers, report: {output_sha256: await sha256Hex(rom),
    bytes: rom.length, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
    added_prg_bytes: EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES,
    usable_added_prg_bytes: 62 * BANK_BYTES,
    original_prg_chr_preserved: true, fixed_bank_mirrors: fixedBankMirrors,
    layout: {mapper: 74, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
      diagnostic},
    boot_test: test ? {banks: test.endBankExclusive - test.firstBank,
      first_bank: test.firstBank, last_bank: test.endBankExclusive - 1,
      result_cpu: test.resultCpu, program_cpu: test.programCpu, boot_bank: test.bootBank,
      patches: bootPatches.map(({offset, bytes}) => ({space: "prg", offset: offset - 16,
        file_offset: offset, bytes: bytes.length})),
      stub_original_prg_offset: test.stubPrgOffset - (EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES),
      stub_evidence: test.evidence} : null}};
}

async function storeExpandedRomBuild(repository, output, sourceBuild) {
  const buildId = await sha256Hex(new TextEncoder().encode(
    `${sourceBuild.build_id}:${output.report.output_sha256}:${crypto.randomUUID()}`,
  ));
  const createdAt = new Date().toISOString();
  const sourceSave = await repository.getBlob(`save-build:${sourceBuild.build_id}`);
  if (!sourceSave) throw new Error(`构建 ${sourceBuild.build_id} 没有同号存档`);
  await repository.putBlob(`rom-build:${buildId}`, new Blob([output.rom], {
    type: "application/x-nes-rom",
  }), {
    kind: "rom-build", build_id: buildId, created_at: createdAt,
    name: "metalmaxcn-diagnostic.nes", output_sha256: output.report.output_sha256,
  });
  await repository.putBlob(`save-build:${buildId}`, sourceSave.data, {
    kind: "save-build", build_id: buildId, created_at: createdAt,
    save_sha256: sourceSave.save_sha256,
    source: sourceSave.source,
  });
  await repository.putBuildReport(buildId, {
    ...output.report, build_id: buildId, created_at: createdAt,
    source_build_id: sourceBuild.build_id, save_sha256: sourceSave.save_sha256,
  }, {createdAt});
  return buildId;
}

// @editor-module 初始化浏览器编辑器，准备导航数据并分发页面渲染与交互绑定。
// WORKSPACE_VIEWS 与 isWorkspacePage() 决定页面骨架，render() 在分派视图前准备正文。
configureFieldObjectControls(async (...args) =>
  (await import('./battle-action-dimension-controls-BKLcECRw.js').then(function (n) { return n.fieldOwnerControls; })).mountFieldOwnerControls(...args));
let bindAudioPlayback, renderAudio, renderAudioRecord;
let leaveAudioPlaybackView = () => {};

let isServicePage, renderServicePage, bindServicePage;
let isSimpleServicePage, renderSimpleServicePage, bindSimpleServicePage;
let isQuantityServicePage, renderQuantityServicePage, bindQuantityServicePage;

let bindTextModeTabs, loadTextCatalog, renderText;
async function loadCurrentTextRecordDisplays(root = document) {
  if (!root.querySelector('[data-current-text-record]')) return;
  return (await import('./charset-BJ0aS3Xk.js').then(function (n) { return n.catalog; })).loadCurrentTextRecordDisplays(root);
}
async function loadNpcCurrentTexts() {
  if (!document.querySelector('[data-npc-text-reference]')) return;
  return (await import('./charset-BJ0aS3Xk.js').then(function (n) { return n.catalog; })).loadNpcCurrentTexts();
}

async function paintUiConstructionCanvases(options) {
  if (!document.querySelector('[data-ui-editor-preview], [data-ui-menu-preview], [data-ui-dialogue-preview], [data-ui-vehicle-portrait], [data-ui-font-atlas], [data-ui-core-font-tile]')) return;
  return (await import('./charset-BJ0aS3Xk.js').then(function (n) { return n.uiConstructionPreview; })).paintUiConstructionCanvases(options);
}
async function paintCanvasTargets(root, selector, load, method) {
  if (!root.querySelector(selector)) return;
  const renderer = await load();
  return renderer[method](root);
}
const paintMonsterFigureCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-monster-figure]", () => import('./monster-figure-C07vG7yu.js').then(function (n) { return n.monsterFigure; }), "paintMonsterFigureCanvases");
const paintActorAtlasCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-actor-atlas]", () => import('./monster-figure-C07vG7yu.js').then(function (n) { return n.actorAtlas; }), "paintActorAtlasCanvases");
const paintMetaspriteCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-metasprite]", () => import('./record-BbPQSBBw.js').then(function (n) { return n.metasprite; }), "paintMetaspriteCanvases");
const paintAttackVisualCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-attack-visual]", () => import('./monster-figure-C07vG7yu.js').then(function (n) { return n.weaponEffectVm; }), "paintAttackVisualCanvases");
const paintEffectObjectMotionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-effect-object-motion]", () => import('./monster-figure-C07vG7yu.js').then(function (n) { return n.weaponEffectVm; }), "paintEffectObjectMotionCanvases");
const paintBattleActionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-action]", () => import('./monster-figure-C07vG7yu.js').then(function (n) { return n.weaponEffectVm; }), "paintBattleActionCanvases");
const paintBattleSceneComposerCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-scene-composer]", () => import('./battle-actors-XIvkcBal.js').then(function (n) { return n.battleSceneComposer; }), "paintBattleSceneComposerCanvases");

let renderActors;
let renderBattle, renderBattleRecord;
let renderMonsterFormations, bindMonsterFormations;
let bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors;
let renderEmulator;
let bindSaveEditor, prepareSaveEditor, renderSaveEditor;
let bindSavePage, prepareSaveVisualComponents, renderSavePage;
let bindBuildLog, renderBuildLog;
let bindCharacterEditor, renderCharacterRecord;
let bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets;
let bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading;
let bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview;
let loadEncounterZones$1;
let bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage;
let bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord;
let bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview;
let renderInvestigation$1;
let renderNpcRecord, renderNpcs;
let bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters;
let bindRomMapPrgViewer$1, renderRomMapPrg$1;
let bindRomMapChrViewer$1, renderRomMapChr$1;
let bindSceneEditor, openSceneSlug;
let bindSceneOverviewFilter$1;
let renderScenes, bindSceneFlowInstances;
let bindMetatiles, renderMetatiles;
let renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio;
let leaveStoryPlayback, rememberStoryPlayback, restoreStoryPlayback;
let bindStoryScriptCommandAddresses, renderStoryScriptRecord;
let bindBootPresentation, paintBootBankPickers, paintBootPatternPicker;
let paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns;
let loadCharsetWorkbench;
let bindVisualEditor;
let bindBattleTestEditor;
let bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord;

const prefetchViewInputs = (...args) => import('./startup-prefetch-D5oNMEuL.js')
  .then(module => module.prefetchViewInputs(...args));

const pageRuntimeLoads = new Map();
function preparePageRuntime(view) {
  if (pageRuntimeLoads.has(view)) return pageRuntimeLoads.get(view);
  const paths = pageRuntimeModulePaths(view);
  const task = paths.length ? editorLog.startTask({source: "后台准备", message: `准备页面组件 · ${views[view]?.[1] || view}`,
    details: paths}) : null;
  const pending = Promise.all([
    paths.includes(PAGE_RUNTIME_PATHS["field-editor"]) ? import('./rectangle-preset-controls-MtKWNScU.js').then(function (n) { return n.fieldObjectEditor; }) : null,
    paths.includes(PAGE_RUNTIME_PATHS["audio"]) ? import('./audio-BLS2u4Yn.js').then(module => {({bindAudioPlayback, leaveAudioPlaybackView, renderAudio, renderAudioRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors"]) ? import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.actors; }).then(module => {({renderActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle"]) ? import('./battle-BewawxnM.js').then(module => {({renderBattle, renderBattleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['monster-formations']) ? import('./monster-formations-CNxDXbnT.js').then(function (n) { return n.monsterFormations; }).then(module => {({renderMonsterFormations, bindMonsterFormations} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-actors"]) ? import('./battle-actors-XIvkcBal.js').then(function (n) { return n.battleActors; }).then(module => {({bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["emulator"]) ? import('./emulator-Bl-sLXnd.js').then(function (n) { return n.emulator; }).then(module => {({renderEmulator} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/sram"]) ? import('./build-log-5Ih3_o65.js').then(function (n) { return n.sram; }).then(module => {({bindSaveEditor, prepareSaveEditor, renderSaveEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["save-page"]) ? import('./save-page-DLUdJuCs.js').then(module => {({bindSavePage, prepareSaveVisualComponents, renderSavePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["build-log"]) ? import('./build-log-5Ih3_o65.js').then(function (n) { return n.buildLog; }).then(module => {({bindBuildLog, renderBuildLog} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/characters"]) ? import('./characters-B0f3SPfL.js').then(function (n) { return n.characters; }).then(module => {({bindCharacterEditor, renderCharacterRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/monsters"]) ? import('./monsters-DSVVpGWY.js').then(function (n) { return n.monsters; }).then(module => {({bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["shops"]) ? import('./shops-BkPXrHg7.js').then(module => {({bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["interface-pages"]) ? import('./interface-pages-3qYQMYuX.js').then(function (n) { return n.interfacePages; }).then(module => {({bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['service-pages']) ? import('./service-pages-Cn-rFxTV.js').then(function (n) { return n.servicePages; }).then(module => {({isServicePage, renderServicePage, bindServicePage, isSimpleServicePage, renderSimpleServicePage, bindSimpleServicePage, isQuantityServicePage, renderQuantityServicePage, bindQuantityServicePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/encounter"]) ? Promise.resolve().then(function () { return encounter; }).then(module => {({loadEncounterZones: loadEncounterZones$1} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/pages"]) ? import('./pages-aQKVa7xt.js').then(module => {({bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/vehicles"]) ? import('./vehicles-BrhQ6qbn.js').then(module => {({bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["facilities"]) ? import('./facilities-C5eTNxT8.js').then(module => {({bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["investigation"]) ? Promise.resolve().then(function () { return investigation; }).then(module => {({renderInvestigation: renderInvestigation$1} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["npcs"]) ? import('./npcs-Dhp3qBbI.js').then(function (n) { return n.npcs; }).then(module => {({renderNpcRecord, renderNpcs} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["wanted"]) ? import('./wanted-C5dzzQfy.js').then(module => {({bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/prg"]) ? Promise.resolve().then(function () { return prg; }).then(module => {({bindRomMapPrgViewer: bindRomMapPrgViewer$1, renderRomMapPrg: renderRomMapPrg$1} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/chr"]) ? Promise.resolve().then(function () { return chr; }).then(module => {({bindRomMapChrViewer: bindRomMapChrViewer$1, renderRomMapChr: renderRomMapChr$1} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/interact"]) ? import('./interact-B2QFN6Fd.js').then(module => {({bindSceneEditor, openSceneSlug} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/overview"]) ? Promise.resolve().then(function () { return overview; }).then(module => {({bindSceneOverviewFilter: bindSceneOverviewFilter$1} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/workbench"]) ? import('./workbench-KKLw2uwg.js').then(function (n) { return n.workbench; }).then(module => {({renderScenes, bindSceneFlowInstances} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["metatiles"]) ? import('./metatiles-qXzb88a8.js').then(module => {({bindMetatiles, renderMetatiles} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/playback"]) ? import('./playback-C_LAHnEc.js').then(module => {({renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio,
      leaveStoryPlayback, rememberStoryPlayback, restoreStoryPlayback} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/catalog"]) ? import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.catalog; }).then(module => {({bindStoryScriptCommandAddresses, renderStoryScriptRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['boot-presentation']) ? import('./boot-presentation-CWp_Q7-i.js').then(module => {({bindBootPresentation, paintBootBankPickers, paintBootPatternPicker, paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['text/catalog']) ? import('./charset-BJ0aS3Xk.js').then(function (n) { return n.catalog; }).then(module => {({bindTextModeTabs, loadTextCatalog, renderText} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["text/charset"]) ? import('./charset-BJ0aS3Xk.js').then(function (n) { return n.charset; }).then(module => {({loadCharsetWorkbench} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors-bind"]) ? import('./actors-bind-DV2HGSY5.js').then(function (n) { return n.actorsBind; }).then(module => {({bindVisualEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-bind"]) ? import('./monster-formations-CNxDXbnT.js').then(function (n) { return n.battleBind; }).then(module => {({bindBattleTestEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/items"]) ? import('./items-DjQtJutT.js').then(module => {({bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord} = module);}) : null,
  ]);
  pageRuntimeLoads.set(view, pending);
  pending.then(() => task?.finish({level: "debug", message: "页面组件已准备"}), error => {
    task?.finish({level: "error", message: `页面组件准备失败：${error.message || error}`, error});
    if (pageRuntimeLoads.get(view) === pending) pageRuntimeLoads.delete(view);
  });
  return pending;
}

// 画布优先的视图：内容是舞台而不是数据网格，用工作台骨架。
const WORKSPACE_VIEWS = new Set([
  'generic-shop',
  "scenes", "interfaceui", "wanted-ui", ...EDITABLE_STORY_VIEW_IDS,
  "cutscene-boot-logo", "cutscene-title",
  'monster-formations',
]);
const FACILITY_WORKSPACE_VIEWS = new Set([
  "jukebox", "vending", "frograce", "teleport", "computercontroller",
]);

// 开机演出：这两屏跑在主循环之前，与 story 的 15 项 field mode 无关，
// 因此不走 renderStoryPlaceholder，而是各自读 project.boot-presentation。
const BOOT_PRESENTATION_VIEWS = new Set(["cutscene-boot-logo", "cutscene-title"]);

let renderGeneration = 0;
let latestBuildArtifactsPromise = null;
let latestBuildArtifactsId = null;

function isWorkspacePage() {
  if (state.view === "interfaceui" && isServicePage()) return false;
  return WORKSPACE_VIEWS.has(state.view)
    || (FACILITY_WORKSPACE_VIEWS.has(state.view) && state.facilityTab === "ui");
}

function renderStoryPlaceholder() {
  return '<div data-page-empty></div>';
}

function empty() {
  // 「读不到」和「确实没有」看起来一样，但一个是故障、一个是事实。渲染前该备好的
  // JSON 没取到时说清楚，别让人以为这一页本来就是空的。
  if (viewDataUnavailable()) {
    return `<div class="empty"><b>数据未能加载</b><span>刷新页面重试；状态栏有失败的数据名。</span></div>`;
  }
  return $("#empty-template").innerHTML;
}

const EQUIPMENT_DOMAIN_PARAM = "equipmentDomain";

function currentEquipmentDomain() {
  return new URL(location.href).searchParams.get(EQUIPMENT_DOMAIN_PARAM) === "tank"
    ? "tank-equipment" : "human-equipment";
}

function equipmentViewHeading() {
  return currentEquipmentDomain() === "tank-equipment"
    ? {
        title: "战车装备",
        description: "编辑战车装备的攻防、重量、载重、价格与战斗特效，并逐字段核对 ROM 地址。",
      }
    : {
        title: "人类装备",
        description: "编辑人类装备的攻防、职业约束、价格与战斗特效，并逐字段核对 ROM 地址。",
      };
}

function renderCurrentItemUseRecord() {
  const data = state.project?.game_data || {};
  return renderItemUseRecord(
    data,
    data.items?.records || [],
    state.recordId,
  );
}

// 记录页：列表页是宽表，表格放不下的明细在这里。
// 每个数据视图注册一个渲染器；没注册的视图行不可点开。
const RECORD_RENDERERS = {
  audio: () => renderAudioRecord(state.recordId),
  "attack-effects": () => renderBattleRecord(state.recordId),
  "battle-test": () => renderBattleRecord(state.recordId),
  shops: () => renderShopRecord(state.recordId),
  monsters: ({monsterRecords}) => renderMonsterRecord(
    monsterRecords || [], state.recordId
  ),
  equipment: () => renderEquipmentRecord(
    equipmentRecords(), state.recordId, currentEquipmentDomain()
  ),
  items: () => renderCurrentItemUseRecord(),
  shells: () => renderShellRecord(state.recordId),
  characters: () => renderCharacterRecord(
    state.project?.game_data || {},
    state.project?.game_data?.characters?.rom_initial?.roles || [],
    state.recordId,
  ),
  vehicles: ({vehicleRecords}) => renderVehicleRecord(
    state.project?.game_data || {},
    vehicleRecords || [],
    state.recordId,
  ),
  npcs: () => renderNpcRecord(
    state.project?.story?.npc_catalog?.records || [], state.recordId
  ),
  // 通用动作脚本目录归在角色图形页的「关联动作脚本」分页；删除通用页后，
  // 记录页也必须跟着这个现有入口迁移，资源链接不能再指向隐藏路由。
  actors: () => state.actorVisualTab === "story"
    ? renderStoryScriptRecord(state.recordId) : null,
};

// 装备页只展示非道具分类；记录页的上一条/下一条必须走同一份过滤后的顺序，
// 否则「下一条」会跳到列表里根本看不见的行。
function equipmentRecords() {
  const itemCategories = new Set(["empty", "human-item", "tank-item"]);
  return (state.project?.game_data?.items?.records || []).filter(
    item => !itemCategories.has(item.category?.id)
  );
}

// 记录页收尾。列表页不需要的（对话原文、底盘图形）只在这里跑。
const RECORD_BINDERS = {
  shops: () => bindShopInstanceReferenceLists(),
  audio: () => bindAudioPlayback(),
  battle: async () => {
    await paintMonsterFigureCanvases();
    await paintAttackVisualCanvases();
    await paintEffectObjectMotionCanvases();
    await paintBattleActionCanvases();
  },
  characters: async () => {
    bindCharacterEditor();
    await paintActorAtlasCanvases();
    await paintMetaspriteCanvases();
  },
  monsters: async () => {
    bindMonsterEditor();
    bindMonsterRecord();
    await paintMonsterFigureCanvases();
  },
  equipment: async () => {
    bindEquipmentEditor();
    await paintAttackVisualCanvases();
    await paintEffectObjectMotionCanvases();
  },
  items: () => bindEquipmentEditor(),
  shells: async () => {
    await bindShellEditor();
    await paintAttackVisualCanvases();
  },
  npcs: async () => {
    await loadNpcCurrentTexts();
    await paintActorAtlasCanvases();
    await paintMetaspriteCanvases();
  },
  actors: async () => {
    await bindStoryScriptCommandAddresses();
    await paintActorAtlasCanvases();
  },
  vehicles: async () => {
    bindVehicleEditor();
    await Promise.all([
      paintActorAtlasCanvases(),
      paintVehicleVisualCanvases(),
    ]);
  },
};

function currentRecordView() {
  return state.view;
}

async function renderRecordPage(context = {}) {
  if (state.recordId === null || state.recordId === undefined) return null;
  const renderer = RECORD_RENDERERS[currentRecordView()];
  if (!renderer) return null;
  const html = await renderer(context);
  // 记录不存在（改了地址、换了资产包）时静默退回列表，而不是留一个空页面。
  if (html === null) {
    state.recordId = null;
    return null;
  }
  return html;
}

function openRecord(recordId) {
  state.recordId = recordId === null || recordId === undefined ? null : String(recordId);
  const url = currentViewUrl();
  if (state.view === "equipment") {
    url.searchParams.set(
      EQUIPMENT_DOMAIN_PARAM,
      currentEquipmentDomain() === "tank-equipment" ? "tank" : "human",
    );
  }
  pushCurrentHistory(url);
  render();
}

function bindRecordPageControls() {
  $("[data-record-back]")?.addEventListener("click", () => openRecord(null));
  for (const selector of ["[data-record-prev]", "[data-record-next]"]) {
    const button = $(selector);
    if (button && !button.disabled) {
      button.addEventListener("click", () => openRecord(button.dataset.target));
    }
  }
}

const delegatedResourceRoots = new WeakSet();

function selectResourceQuery(node) {
  state.resourceId = node.dataset.resourceQuery;
  const url = new URL(location.href);
  url.searchParams.set("resource", state.resourceId);
  replaceHistoryUrl(url);
  document.querySelectorAll(".resource-target-focus").forEach(item =>
    item.classList.remove("resource-target-focus")
  );
  focusResourceTarget(node);
}

function bindResourceQueries(root = document, {delegate = false} = {}) {
  if (delegatedResourceRoots.has(document)) return;
  if (delegate) {
    if (delegatedResourceRoots.has(root)) return;
    delegatedResourceRoots.add(root);
    root.addEventListener("click", event => {
      const query = event.target.closest?.("[data-resource-query]");
      if (query && root.contains(query)) selectResourceQuery(query);
      const target = event.target.closest?.("[data-resource-target]");
      if (target && root.contains(target)) {
        event.preventDefault();
        navigateToResourceTarget(target.dataset.resourceTarget);
      }
    });
    return;
  }
  root.querySelectorAll("[data-resource-query]").forEach(node =>
    node.addEventListener("click", () => selectResourceQuery(node))
  );
  root.querySelectorAll("[data-resource-target]").forEach(node =>
    node.addEventListener("click", event => {
      event.preventDefault();
      navigateToResourceTarget(node.dataset.resourceTarget);
    })
  );
}

function bindSceneOpenLinks(root = document) {
  root.querySelectorAll("[data-scene-open]").forEach(node => {
    if (node.dataset.sceneOpenBound === "1") return;
    node.dataset.sceneOpenBound = "1";
    node.addEventListener("click", event => {
      if (event.target.closest("a, button, input, select, textarea, summary")) return;
      event.preventDefault();
      void openSceneSlug(node.dataset.sceneOpen);
    });
    node.addEventListener("keydown", event => {
      if (event.target !== node || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      void openSceneSlug(node.dataset.sceneOpen);
    });
  });
}

function bindWideTableWheelScrolling(root = document) {
  const content = $("#content");
  if (!content || !root.querySelector(".table-wrap")) return;
  if (content.dataset.tableWheelBound !== "1") {
    content.dataset.tableWheelBound = "1";
    content.addEventListener("wheel", event => {
      if (!event.shiftKey) return;
      const wrap = event.target.closest?.(".table-wrap");
      if (!wrap || !content.contains(wrap)) return;
      const maxScrollLeft = wrap.scrollWidth - wrap.clientWidth;
      if (maxScrollLeft <= 1) return;
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 18
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? wrap.clientWidth
          : 1;
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX : event.deltaY) * scale;
      const next = Math.max(0, Math.min(maxScrollLeft, wrap.scrollLeft + delta));
      if (!delta || next === wrap.scrollLeft) return;
      event.preventDefault();
      wrap.scrollLeft = next;
    }, {passive: false});
  }
}

// 剧情工作台的委托绑定。#content 元素本身不会被重建（每次 render 只换 innerHTML），
// 所以这些监听器必须只挂一次——bindCards() 每次渲染都跑，重复 addEventListener
// 会让一次点击触发 N 次，其中切换执行链还会再套 N 层 render()。
function bindStoryDelegatedControls() {
  const content = $("#content");
  if (!content || content.dataset.storyControlsBound === "1") return;
  content.dataset.storyControlsBound = "1";

  // 工作台左栏与下方表格都能切换当前执行链；两处都用同一个 data 属性。
  content.addEventListener("click", event => {
    const pick = event.target.closest?.("[data-story-sequence]");
    if (pick && pick.dataset.storySequence !== state.storySequenceId) {
      state.storySequenceId = pick.dataset.storySequence;
      replaceHistoryUrl(currentViewUrl());
      render();
      return;
    }
    // 播放/暂停与拖动归时间轴壳（ui/timeline-player.js）；只有「从头播」还是
    // 委托，因为它挂在走带的自定义按钮上，卡片重渲染后节点会换。
    const restart = event.target.closest?.("[data-story-card-restart]");
    if (restart) {
      const id = Number(restart.dataset.storyCardRestart);
      state.storyCardFrame.set(id, 0);
      state.storyCardPaused.delete(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    }
  });
}

function bindCards() {
  bindWideTableWheelScrolling();
  bindResourceQueries();
  document.querySelectorAll("[data-home-view]").forEach(node => {
    node.addEventListener("click", () => navigateView(node.dataset.homeView));
    node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navigateView(node.dataset.homeView);
    });
  });
  bindInternalPageLinks();
  $("#weapon-effect-select")?.addEventListener("change", event => {
    state.weaponVisual = Number.parseInt(event.target.value, 16);
    render();
  });
  document.querySelectorAll("[data-weapon-visual]").forEach(node => {
    const select = () => {
      state.weaponVisual = Number.parseInt(node.dataset.weaponVisual, 16);
      render();
    };
    node.addEventListener("click", select);
    if (node.matches("tr")) node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    });
  });
  document.querySelectorAll("[data-actor-visual-tab]").forEach(node =>
    node.addEventListener("click", () => {
      state.actorVisualTab = node.dataset.actorVisualTab;
      state.recordId = null;
      const url = new URL(location.href);
      url.searchParams.set("actorPart", state.actorVisualTab);
      replaceHistoryUrl(url);
      render();
    })
  );
  document.querySelectorAll("[data-story-playback]").forEach(node =>
    node.addEventListener("click", () => {
      state.storyPlayback = node.dataset.storyPlayback;
      state.storyFrame = 0;
      state.storyPlaying = true;
      const url = new URL(location.href);
      url.searchParams.set("storyPlayback", state.storyPlayback);
      replaceHistoryUrl(url);
      render();
    })
  );
  $("#story-play-toggle")?.addEventListener("click", event => {
    state.storyPlaying = !state.storyPlaying;
    state.storyLastTick = performance.now();
    event.currentTarget.textContent = state.storyPlaying ? "暂停" : "播放";
    updateStoryPlayback();
  });
  $("#story-restart")?.addEventListener("click", () => {
    state.storyFrame = 0;
    // 全部重播要把各条的独立游标也归零，否则只有全局帧号回到 0。
    state.storyCardFrame.clear();
    state.storyCardPaused.clear();
    state.storyPlaying = true;
    state.storyLastTick = performance.now();
    const toggle = $("#story-play-toggle");
    if (toggle) toggle.textContent = "暂停";
    updateStoryPlayback();
  });
  $("#story-speed")?.addEventListener("change", event => {
    state.storySpeed = Number(event.target.value);
    state.storyLastTick = performance.now();
  });
  bindStoryDelegatedControls();
  const storyFilter = $("#story-browser-filter");
  if (storyFilter) {
    storyFilter.addEventListener("input", () => {
      const q = storyFilter.value.trim().toLowerCase();
      document.querySelectorAll("#story-browser-list .story-browser-item").forEach(node => {
        node.hidden = Boolean(q) && !node.dataset.storySearch.includes(q);
      });
    });
  }
  document.querySelectorAll("[data-story-kind]").forEach(node =>
    node.addEventListener("click", () => {
      state.storyKind = node.dataset.storyKind;
      state.recordId = null;
      const url = new URL(location.href);
      url.searchParams.set("storyKind", state.storyKind);
      replaceHistoryUrl(url);
      render();
    })
  );
  $("#monster-filter")?.addEventListener("input", event => {
    state.monsterFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#monster-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#field-item-filter")?.addEventListener("input", event => {
    state.fieldItemFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#field-item-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#field-item-category")?.addEventListener("change", event => {
    state.fieldItemCategory = event.target.value;
    render();
  });
  $("#shell-filter")?.addEventListener("input", event => {
    state.shellFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#shell-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#equipment-filter")?.addEventListener("input", event => {
    state.equipmentFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#equipment-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#equipment-category")?.addEventListener("change", event => {
    state.equipmentCategory = event.target.value;
    render();
  });
  if (state.view === "characters") bindCharacterEditor();
  if (state.view === "vehicles") bindVehicleEditor();
  if (state.view === "monsters") bindMonsterEditor();
  if (["equipment", "items"].includes(state.view)) bindEquipmentEditor();
  if (state.view === "shells") void bindShellEditor().catch(error => showEditorError($("#shell-editor"), "炮弹字段绑定失败", error));
}

/** 当前视图有没有 DB 正文没取到。视图的空状态据此说「读不到」而不是「暂无」。 */
function viewDataUnavailable() {
  return viewDataFailures(state.view).length > 0;
}

async function ensureLatestBuildArtifacts() {
  const buildId = state.browserProjectManifest?.latest_package_build_id || null;
  if (!buildId || latestBuildArtifactsId === buildId) return;
  if (latestBuildArtifactsPromise) return latestBuildArtifactsPromise;
  const repository = state.projectRepository;
  if (!repository) return;
  latestBuildArtifactsPromise = (async () => {
    const [reportRecord, romRecord] = await Promise.all([
      repository.getBuildReport(buildId),
      repository.getBlob(`rom-build:${buildId}`),
    ]);
    const saveRecord = reportRecord?.report &&
      reportRecord.report.save_source !== "not-included"
      ? await repository.getBlob(`${SAVE_BUILD_BLOB_PREFIX}${buildId}`) : null;
    state.browserBuildReport = reportRecord?.report ? {
      ...reportRecord.report,
      created_at: reportRecord.report.created_at || reportRecord.created_at,
    } : null;
    state.browserBuildRom = romRecord
      ? new Uint8Array(await romRecord.data.arrayBuffer()) : null;
    state.browserBuildSave = saveRecord
      ? new Uint8Array(await saveRecord.data.arrayBuffer()) : null;
    state.browserBuildEvents = reportRecord?.report?.linker?.events || [];
    state.browserBuildCurrentEvent = state.browserBuildEvents.at(-1) || null;
    latestBuildArtifactsId = buildId;
  })().finally(() => {
    latestBuildArtifactsPromise = null;
  });
  return latestBuildArtifactsPromise;
}

async function render() {
  const view = state.view;
  const generation = renderGeneration + 1;
  try {
    await renderView();
  } catch (error) {
    // Only a render superseded by a newer navigation is irrelevant to this DOM.
    if (generation !== renderGeneration || view !== state.view) return;
    const block = `当前页面载入失败 · ${views[view]?.[1] || view} (${view})`;
    setStatus({selection: block});
    const content = $("#content");
    restorePageHeader();
    const head = $(".page-head");
    if (head.parentElement === content) content.before(head);
    content.innerHTML = editorErrorMarkup(block, error, {storyRecovery: true});
    compactPageHeader({content, head});
    bindStoryPageRecovery(content, {database: db, afterReset: render,
      onError: error => showEditorError(content, "清理剧情修改失败", error)});
    content.dataset.renderedView = view;
    content.dataset.renderGeneration = String(generation);
    content.dataset.destinationUsersReady = "error";
    delete content.dataset.pendingView;
  }
}

async function renderView() {
  const generation = ++renderGeneration;
  const requestedView = state.view;
  const content = $("#content");
  restorePageHeader();
  leaveStoryPlayback?.(content);
  if (!content.dataset.ownerReferenceLinksBound) {
    content.dataset.ownerReferenceLinksBound = '1';
    content.addEventListener('owner-reference-loaded', event => bindInternalPageLinks(event.target));
  }
  const pageHead = $(".page-head");
  if (pageHead.parentElement === content) content.before(pageHead);
  pageHead.querySelector('[data-story-page-heading]')?.remove();
  pageHead.querySelector('[data-screen-workbench-page-header]')?.remove();
  const compactHeader = () => {
    if (requestedView !== 'battle-test' && !(requestedView === 'scenes' && state.interactionFlow))
      compactPageHeader({content, head: pageHead});
  };
  const replaceContent = markup => {
    restorePageHeader();
    if (pageHead.parentElement === content) content.before(pageHead);
    content.innerHTML = markup;
    compactHeader();
  };
  // 页头在同步装载正文时合并，异步取数与绘图期间保持单行。
  compactHeader();
  if (requestedView === "build" && content.dataset.renderedView !== "build") {
    state.projectStateLoaded = false;
  }
  // render() deliberately leaves the previous page mounted while its async DB
  // projection is prepared.  Expose that interval explicitly so browser tests,
  // history restore, and accessibility tooling never mistake stale DOM for the
  // newly selected page.  The completion attributes are only committed after
  // every async binder/painter for this generation has finished.
  delete content.dataset.renderedView;
  delete content.dataset.renderGeneration;
  content.dataset.pendingView = requestedView;
  state.navigationGeneration += 1;
  if (state.storyTimer) clearInterval(state.storyTimer);
  state.storyTimer = null;
  stopAudioTimelines();
  if (state.view !== "audio") leaveAudioPlaybackView();
  // 静态 Web 投影尚未装载完成时不分派视图，期间
  // state.project 为 null，而全部视图都会直接读 state.project.xxx。
  //
  // 运行验证与浏览器构建只消费 IndexedDB，不依赖展示投影。
  if (!state.project && !["emulator", "build", "log", "bytemap-sram"].includes(state.view)) {
    // 装载中和装载失败是两回事，不能都用同一个转圈：失败时转圈会一直转下去。
    replaceContent(state.projectBootstrapStatus === "error"
      ? `<div class="empty"><b>资源暂不可用</b><span>${
        esc(state.projectBootstrapError)}；状态栏可重试。</span></div>`
      : `<div class="loading"><span></span>正在装载资产包…</div>`);
    return;
  }
  const stillCurrent = () => generation === renderGeneration
    && requestedView === state.view;
  let activateSceneThumbnails = null;
  let destinationPage;
  const markRendered = (reuseBindings = false) => {
    if (!stillCurrent()) return;
    compactHeader();
    flushCanvasViewportLayouts();
    content.dataset.renderedView = requestedView;
    content.dataset.renderGeneration = String(generation);
    delete content.dataset.pendingView;
    if (!reuseBindings) {
      bindSceneDestinationUsers(content, destinationPage, db, () => bindInternalPageLinks(content));
      bindControlledObjectUsers(content, state.project, () => bindInternalPageLinks(content));
    }
    content.dataset.destinationUsersReady = "true";
  };
  const dataView = requestedView;
  const saveActivation = dataView === 'save' && state.savePageSection === 'location';
  if (state.project) {
    // 页面文档须在并行取数前准备完成，以免切换仓库使在途读取失效。
    await db.prepareStoryPageDocument(dataView === 'story-page' ? state.storyPageId : storyEditableView(dataView) ? dataView : null);
    if (!stillCurrent()) return;
  }
  void prefetchViewInputs(dataView, new URLSearchParams(location.search)).catch(() => {});
  const sceneObjectsPreparation = dataView === "scenes" && !state.sceneSlug && state.sceneListTab === "investigation"
    ? db.getAll("scene-object", []).then(async objects => {await db.warm(objects); return objects;}) : null;
  sceneObjectsPreparation?.catch(() => {});
  const vehiclePreparation = ["vehicles", "scenes", "shops"].includes(dataView)
    ? ensureVehicleDraft() : null;
  vehiclePreparation?.catch(() => {});
  const pageRuntime = preparePageRuntime(dataView);
  const [, missingSchemas] = await Promise.all([
    pageRuntime,
    state.project ? prepareViewData(dataView === 'generic-shop' ? 'shops' : dataView).then(result => {
      if (applyStoryPageNames(state.project)) mountPageNavigation({storyNavigation: state.project.story_navigation});
      return result;
    }) : Promise.resolve([]),
    state.project && !saveActivation && (['save', 'scenes', 'shops', 'actors', 'npcs', 'wanted', 'wanted-ui', 'teleport',
      'computercontroller', 'interfaceui', 'facilities'].includes(dataView) || storyPlaybackView(dataView))
      ? prepareGlobalEventFlags() : null,
    !saveActivation && ["save", "scenes", "actors", "wanted", "wanted-ui"].includes(dataView)
      ? prepareSaveEventLinks() : null,
    ["save", "bytemap-sram"].includes(dataView)
      ? pageRuntime.then(() => prepareSaveEditor()) : null,
    dataView === "save" ? pageRuntime.then(() => prepareSaveVisualComponents()) : null,
    vehiclePreparation,
    ["save", "bytemap-sram"].includes(dataView) ? prepareSaveEditorWorkspace() : null,
  ]);
  if (!stillCurrent()) return;
  if (dataView === 'interfaceui' ? state.interfacePage === 'interaction-service'
      || interfacePageDefinition(state.interfacePage)?.commandIds?.length
    : ['shops', 'generic-shop', 'jukebox', 'vending', 'frograce', 'teleport',
      'computercontroller', 'wanted-ui'].includes(dataView)) {
    await (await Promise.resolve().then(function () { return servicePreviewScene; })).prepareServicePreviewSceneBindings();
    if (!stillCurrent()) return;
  }
  if (dataView === "shops" && Number(state.shopFamily) === 15) {
    state.shopElevators = await loadSceneElevators(db, state.project?.scenes?.editable_scenes || []);
    if (!stillCurrent()) return;
  }
  if (dataView === "vehicles") {
    await prepareVehicleVisualSelectors();
    if (!stillCurrent()) return;
  }
  if (["emulator", "build"].includes(requestedView)) {
    await ensureLatestBuildArtifacts();
    if (!stillCurrent()) return;
  }
  setStatus();
  let [kicker, title, description] = views[state.view];
  const storyHeading = storyPageDefinitionForView(state.view);
  if (storyHeading) {kicker = storyHeading.eyebrow; title = storyHeading.title;}
  // 页面骨架只有两种。工作台页把滚动交给自己的画布/面板，列表页与记录页由
  // .page-body 统一滚动——两者的内边距和溢出规则必须分开，否则画布页会出现
  // 双滚动条，列表页则会贴边。
  if (storyPlaybackView(state.view)) $("#view-kicker").innerHTML = handleTextMarkup(kicker);
  else $("#view-kicker").textContent = kicker;
  if (storyPlaybackView(state.view)) $("#view-title").innerHTML = handleTextMarkup(title);
  else $("#view-title").textContent = title;
  let headingHint = description;
  // shops 是一个视图承载 13 个配置族，标题要跟着族走，不能都叫"商店 / 服务配置"。
  if (state.view === "shops") {
    const heading = shopViewHeading();
    if (heading) {
      $("#view-title").textContent = heading.title;
      headingHint = heading.description;
    }
  }
  if (state.view === "interfaceui") {
    const heading = interfacePageViewHeading();
    if (heading) {
      $("#view-title").textContent = heading.title;
      headingHint = heading.description;
    }
  }
  if (state.view === "equipment") {
    const heading = equipmentViewHeading();
    $("#view-title").textContent = heading.title;
    headingHint = heading.description;
  }
  const pageRoute = editorPageRoute({
    view: state.view,
    interface: state.interfacePage,
    interfacePage: state.interfacePage,
    interfaceScreen: state.interfacePageScreen,
    shopFamily: state.shopFamily,
    shopTab: state.shopTab,
    vendingFamily: state.vendingPreviewFamily,
    resource: state.resourceId,
    record: state.recordId,
    interactionFlow: state.interactionFlow,
    facility: state.facilityTab,
    previewCommand: interfacePreviewContext().service?.command,
    equipmentDomain: currentEquipmentDomain().replace(/-equipment$/u, ""),
  });
  const editorPage = updatePageNavigation(pageRoute);
  if (editorPage) $("#view-title").textContent = editorPage.label;
  const storyInfo = storyNavigationInfo(state.view, state.project?.story_navigation);
  $("#view-kicker").hidden = !storyInfo;
  $("#view-kicker").classList.toggle("story-trigger", Boolean(storyInfo));
  if (storyInfo) $("#view-kicker").textContent = storyInfo.trigger;
  $("#view-title").title = headingHint || "";
  // 怪物列表要显示"出没于哪些随机遇敌区"。遇敌区是跨场景的全局表，不在
  // 聚合投影里，也没进 resource_index，只能单独取一次（内部有缓存）。
  if (dataView === "monsters") {
    await loadEncounterZones$1();
    if (!stillCurrent()) return;
  }
  // 已迁移页面按表取当前有效值。warm 只看这批记录里直接出现的引用，不追正文
  // 里的第二层引用；渲染阶段随后可以安全地同步 peek。
  const catalog = ["monsters", "vehicles"].includes(dataView)
    ? await loadEntityCatalog() : null;
  const monsterRecords = dataView === "monsters"
    ? await entityDisplayRecords(db, "monster", {catalog, labelFor: resourceLabel}) : null;
  const vehicleRecords = dataView === "vehicles"
    ? await entityDisplayRecords(db, "vehicle", {catalog,
      project: state.project, labelFor: resourceLabel}) : null;
  if (!stillCurrent()) return;
  if (monsterRecords) {
    await db.warm(monsterRecords);
    if (!stillCurrent()) return;
    const nameHandles = await prepareMonsterNameFacets(monsterRecords);
    if (!stillCurrent()) return;
    useMonsterNameFacets(nameHandles);
  }
  const sceneObjects = await sceneObjectsPreparation;
  if (!stillCurrent()) return;
  // 音序执行轨迹不在发布包里，是按 execution_id 现算的（见 audio/executions.js）。
  // 所有输入都已在 audio index / sequence graph JSON；只是计算本身异步，
  // 所以在渲染之前先备好。
  if (state.view === "audio") {
    await ensureSequenceExecutions(state.project?.audio);
    if (!stillCurrent()) return;
  }
  if (storyPlaybackView(state.view)) {
    await prepareStoryAudio();
    if (!stillCurrent()) return;
  }
  const destinationUsers = () => {
    destinationPage = {...state, metatileRecordId: new URLSearchParams(location.search).get('metatile')};
    if (requestedView === 'monster-formations') return '';
    return sceneDestinationUsersMarkup(destinationPage);
  };
  let html = await renderRecordPage({monsterRecords, vehicleRecords});
  if (!stillCurrent()) return;
  // 骨架要在拿到记录页结果之后再定：工作台视图里的记录页也必须落回列表骨架，
  // 否则会套上工作台的定高与零内边距。
  document.body.dataset.pageKind =
    html === null && isWorkspacePage() ? "workspace" : "list";
  if (html !== null) {
    html = pageVariantsMarkup(editorPage, pageRoute) + html;
    html += destinationUsers();
    if (state.view === "audio" && state.recordId === "audio-index") {
      html += pageModuleEditorsMarkup(editorPage?.id);
    }
    replaceContent(html);
    bindPageVariants(content, editorPage);
    bindRecordPageControls();
    await loadCurrentTextRecordDisplays();
    if (!stillCurrent()) return;
    // 记录页的按视图收尾：文本原文、画布绘制等，与列表页各自独立。
    await RECORD_BINDERS[currentRecordView()]?.();
    if (!stillCurrent()) return;
    if (state.view === "audio" && state.recordId === "audio-index") {
      await mountPageModuleEditors($("#content"), editorPage?.id);
      if (!stillCurrent()) return;
    }
    bindResourceQueries();
    markRendered();
    return;
  }
  if (state.view === "home") html = renderHome();
  else if (state.view === "scenes") {
    if (state.sceneSlug || state.interactionFlow) html = await renderScenes();
    else {
      const tabs = [["scenes", "场景"], ["actors", "场景角色"], ["investigation", "调查"]];
      const sceneList = await renderScenes();
      const body = state.sceneListTab === "actors" ? renderNpcs()
        : state.sceneListTab === "investigation" ? renderInvestigation$1(sceneObjects) : sceneList;
      html = `<div class="data-tabs" role="tablist" aria-label="地图与场景分类">${tabs.map(([id, label]) =>
        `<button class="button ${state.sceneListTab === id ? "primary" : "ghost"}" type="button" data-scene-list-tab="${id}">${label}</button>`
      ).join("")}</div>${body}`;
    }
  }
  else if (state.view === "actors") html = renderActors();
  else if (state.view === "metatiles") html = await renderMetatiles();
  // 开机演出两屏有自己的权威文档；其余 cutscene 仍是占位。
  else if (BOOT_PRESENTATION_VIEWS.has(state.view)) {
    html = renderBootPresentation(state.view);
  }
  else if (storyEditableView(state.view)) {
    restorePageHeader();
    if (restoreStoryPlayback(content)) {
      const heading = content.querySelector('.story-sequence-handle');
      if (heading) {
        heading.dataset.storyPageHeading = 'true';
        pageHead.insertBefore(heading, pageHead.querySelector('.head-actions'));
      }
      content.prepend(pageHead);
      compactHeader();
      await startStoryTimer({reuse: true});
      if (stillCurrent()) {
        focusResourceTarget();
        markRendered(true);
      }
      return;
    }
    compactHeader();
    html = renderCutsceneAnimation(state.view);
  }
  else if (state.view.startsWith("cutscene-")) html = renderStoryPlaceholder();
  else if (["attack-effects", "battle-test"].includes(state.view)) html = renderBattle();
  else if (state.view === 'monster-formations') html = await renderMonsterFormations();
  else if (state.view === "battleactors") html = renderBattleActors();
  else if (state.view === "text") html = renderText();
  else if (state.view === "characters") html = renderCharacterPage();
  else if (state.view === "save") html = renderSavePage();
  else if (state.view === "vehicles") html = renderVehiclePage(vehicleRecords);
  else if (state.view === "monsters") html = renderMonsterPage(monsterRecords);
  else if (state.view === "equipment") html = currentEquipmentDomain() === "tank-equipment"
    ? await renderTankEquipmentPage() : await renderHumanEquipmentPage();
  else if (state.view === "items") html = renderItemsPage();
  else if (state.view === "shells") html = await renderShellPage();
  else if (state.view === "audio") html = renderAudio();
  else if (state.view === "wanted" || state.view === "wanted-ui") {
    ensureWantedView();
    html = await renderWantedPosters();
  }
  else if (state.view === "shops") html = await renderShops();
  else if (state.view === 'generic-shop') html = await (await import('./generic-shop-CwrAX46z.js').then(function (n) { return n.genericShop; })).renderGenericShop();
  else if (state.view === "interfaceui") {
    html = state.interfacePage === 'interaction-service'
      ? await (await import('./interaction-service-ClhyurFC.js')).renderInteractionService()
      : isSimpleServicePage() ? await renderSimpleServicePage()
      : isQuantityServicePage() ? await renderQuantityServicePage()
      : renderInterfacePage(isServicePage() ? await renderServicePage() : {});
  }
  else if (state.view === "jukebox") {
    ensureShopView();
    html = renderJukebox();
  }
  else if (state.view === "vending") {
    ensureShopView();
    html = renderVending();
  }
  else if (state.view === "frograce") html = renderFrogRace();
  else if (state.view === "teleport") html = renderTeleportTerminal();
  else if (state.view === "computercontroller") html = renderComputerController();
  else if (state.view === "bytemap-prg") html = await renderRomMapPrg$1();
  else if (state.view === "bytemap-chr") html = await renderRomMapChr$1();
  else if (state.view === "bytemap-sram") html = renderSaveEditor();
  else if (state.view === "log") html = renderLog();
  else if (state.view === "build") html = renderBuildLog();
  else if (state.view === "emulator") html = renderEmulator();
  // 承载页面上常驻的模块编辑器：清单里属于本页的模块都挂在这一段里。
  html = pageVariantsMarkup(editorPage, pageRoute) + html;
  if (state.view !== "audio") html += pageModuleEditorsMarkup(editorPage?.id);
  html += destinationUsers();
  // scenes / 字节地图的 HTML 生成本身会等待分页正文。快速切到另一页时，旧请求
  // 即使随后成功返回，也不能再覆盖新页的 DOM。
  if (!stillCurrent()) return;
  // EmulatorJS 没有 destroy API，重建 iframe 会重启 WASM、音频和游戏进度。而
  // render() 不只在切换视图时跑：搜索框每敲一个字都会跑一次。所以模拟器已经挂上
  // 之后必须复用同一个 iframe，不能让 innerHTML 把它连根拔掉。
  // 离开本视图时照常整块重写，iframe 被移除，浏览器回收文档、停掉模拟器。
  // 换 ROM 时（刚点完“运行新 ROM”）必须重建，否则 iframe 还指着上一个产物。
  const mounted = state.view === "emulator" ? $("#emulator-frame") : null;
  const keepEmulator = mounted && mounted.dataset.rom === (state.emulatorRom || "");
  if (!keepEmulator) replaceContent(html);
  bindPageVariants(content, editorPage);
  if (storyEditableView(state.view)) {
    const heading = content.querySelector('.story-sequence-handle');
    if (heading) {
      heading.dataset.storyPageHeading = "true";
      pageHead.insertBefore(heading, pageHead.querySelector('.head-actions'));
      content.prepend(pageHead);
    }
  }
  compactHeader();
  if (missingSchemas.length) {
    setStatus({selection: `数据加载失败：${missingSchemas.join(" ")}`});
    // 单页的正文缺件同样不该换掉整屏：失败的表名挂进状态栏提示条，其余内容照常显示。
    setResourceAlert({
      title: "部分数据未能加载",
      detail: missingSchemas.join(" "),
      retry: () => render(),
    });
  }
  bindCards();
  if (state.view === "home") bindHomeFieldCoverage();
  if (state.view === "metatiles") {
    await bindMetatiles();
    if (!stillCurrent()) return;
  }
  const openTableRecord = (route, rowId) => {
    // 战斗页的记录身份在路由里包含类别；不能退回共享发布资源 UID，
    // 否则主攻击脚本会与同号攻击视觉记录落到同一详情页。
    const battleRecord = ["attack-effects", "battle-test"].includes(state.view)
      && String(route || "").match(/^(?:attack-effects|battle-test)\/(.+)$/);
    openRecord(battleRecord ? battleRecord[1] : rowId);
  };
  bindRecordLinks(document, openTableRecord);
  bindVirtualTables($("#content"), openTableRecord, wrap => {
    void hydrateModuleComponents(wrap).catch(error =>
      showEditorError(wrap, "表格组件加载失败", error));
    void paintMonsterFigureCanvases(wrap).catch(error =>
      showEditorError(wrap, "怪物图形加载失败", error));
  });
  if (state.view === "audio") bindAudioPlayback();
  if (state.view === "build") bindBuildLog();
  if (state.view === "log") bindLog();
  if (state.view === "save" || state.view === "bytemap-sram") {
    await bindSaveEditor({rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "save") bindSavePage({rerender: render});
  await loadCurrentTextRecordDisplays();
  if (!stillCurrent()) return;
  if (state.view === "shops") bindShopEditor({onChange: render});
  if (["jukebox", "vending"].includes(state.view)) {
    bindShopEditor({onChange: render});
    bindFacilityConfigurationEditor(render);
  }
  if (state.view === 'frograce') bindFacilityConfigurationEditor(render);
  if (state.view === "teleport") bindTeleportPreviewControls(render);
  if (state.view === "scenes" && !state.sceneSlug) {
    document.querySelectorAll("[data-scene-list-tab]").forEach(node =>
      node.addEventListener("click", () => {
        state.sceneListTab = node.dataset.sceneListTab;
        state.resourceId = null;
        replaceHistoryUrl(currentViewUrl());
        void render();
      })
    );
  }
  if (state.view === "scenes" && !state.sceneSlug && state.sceneListTab === "actors") {
    document.querySelectorAll("[data-npc-role]").forEach(node =>
      node.addEventListener("click", () => {
        state.npcRole = node.dataset.npcRole;
        replaceHistoryUrl(currentViewUrl());
        render();
      })
    );
    await loadNpcCurrentTexts();
    if (!stillCurrent()) return;
  }
  if (state.view === "bytemap-prg") bindRomMapPrgViewer$1();
  if (state.view === "bytemap-chr") bindRomMapChrViewer$1();
  if (BOOT_PRESENTATION_VIEWS.has(state.view)) {
    // 图元来自 shared-chr-bank 的 original/working，取数是异步的。
    await Promise.all([paintBootPresentationCanvas(state.view),
      paintBootPatternPicker(state.view), paintBootBankPickers(state.view)]);
    if (!stillCurrent()) return;
    await bindBootPresentation(state.view, {rerender: render});
    if (!stillCurrent()) return;
    reportBootPresentationPatterns();
  }
  if (state.view === "shops") {
    await bindShopStateWorkbench(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === 'generic-shop') {
    await (await import('./generic-shop-CwrAX46z.js').then(function (n) { return n.genericShop; })).bindGenericShop(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "interfaceui" && isSimpleServicePage()) {
    await bindSimpleServicePage(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === 'interfaceui' && isQuantityServicePage()) {
    await bindQuantityServicePage(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "interfaceui" && !isSimpleServicePage() && !isQuantityServicePage()) {
    if (state.interfacePage === 'interaction-service') {
      await (await import('./interaction-service-ClhyurFC.js')).bindInteractionService(content, {rerender: render});
      if (!stillCurrent()) return;
    } else if (isServicePage()) {
      await bindServicePage(content, {rerender: render, repaint: () => paintUiConstructionCanvases({
        resolveEditorPreview: resolveInterfacePageEditorPreview,
      })});
      if (!stillCurrent()) return;
    }
    const serviceWorkbench = state.interfacePage === 'interaction-service'
      ? (await import('./interaction-service-ClhyurFC.js')).interactionServiceWorkbenchOptions() : {};
    if (serviceWorkbench) await bindInterfacePageWorkbench({
      ...serviceWorkbench,
      isCurrent: stillCurrent,
      rerender: render,
      repaint: () => {
        return paintUiConstructionCanvases({
          resolveEditorPreview: resolveInterfacePageEditorPreview,
        }).catch(error => {
          // 旧页面的回调只在当前页面仍有效时报告错误。
          if (stillCurrent()) showEditorError(content, "独立界面重绘失败", error);
        });
      },
    });
    if (!stillCurrent()) return;
    await paintUiConstructionCanvases({
      resolveEditorPreview: resolveInterfacePageEditorPreview,
    });
    if (!stillCurrent()) return;
    await paintInterfacePageRuntimeCanvases();
    if (!stillCurrent()) return;
    await paintBattleSceneComposerCanvases();
    if (!stillCurrent()) return;
  }
  if (state.view === "wanted" || state.view === "wanted-ui") {
    bindWantedEditor({rerender: render});
    if (state.view === "wanted-ui") {
      bindWantedUiWorkbench({rerender: render});
      await paintWantedPreviewCanvases();
      if (!stillCurrent()) return;
    }
  }
  if (["jukebox", "vending", "frograce", "teleport", "computercontroller"].includes(state.view)) {
    document.querySelectorAll("[data-facility-tab]").forEach(node =>
      node.addEventListener("click", () => {
        if (state.facilityTab === node.dataset.facilityTab) return;
        state.facilityTab = node.dataset.facilityTab;
        replaceHistoryUrl(currentViewUrl());
        render();
      })
    );
    if (state.facilityTab === "ui") {
      await bindFacilityUiWorkbench({
        rerender: render,
        repaint: () => {
          void paintUiConstructionCanvases({
            resolveMenuPreview: resolveFacilityMenuPreview,
            resolveEditorPreview: resolveFacilityMenuPreview,
          }).catch(error => {
        // A callback from an older render must not write into the new page.
        if (stillCurrent()) showEditorError(content, "设施界面重绘失败", error);
      });
        },
      });
      if (!stillCurrent()) return;
      // 五个设施页都走 UI constructor 的同一绘制入口；resolver 只注入当前
      // 配置草稿、运行状态和所选组件，不另画一张页面专用 canvas。
      await paintUiConstructionCanvases({
        resolveMenuPreview: resolveFacilityMenuPreview,
        resolveEditorPreview: resolveFacilityMenuPreview,
      });
      if (!stillCurrent()) return;
    }
  }
  if (state.view === "scenes" && state.scene) {
    if (state.interactionFlow) await bindSceneFlowInstances(content, {rerender: render});
    else await bindSceneEditor();
    if (!stillCurrent()) return;
  }
  if (state.view === "scenes" && !state.scene) {
    bindSceneOpenLinks();
    let thumbnailsStarted = false;
    activateSceneThumbnails = () => {
      if (thumbnailsStarted) return Promise.resolve();
      thumbnailsStarted = true;
      return paintVisibleSceneThumbnailCanvases(content, {isCurrent: stillCurrent});
    };
    bindSceneOverviewFilter$1(document, () => {
      replaceHistoryUrl(currentViewUrl());
      void activateSceneThumbnails();
    });
    content.addEventListener("scroll", () => void activateSceneThumbnails(), {once: true});
    // 返回列表时先定位当前场景，再开始逐张加载缩略图。行高由固定预览框确定，
    // 后续绘图不会造成滚动位置漂移。
    focusResourceTarget();
    // 列表骨架先完成；缩略图按视口在后台补画，离页后由 painter 停止旧队列。
    // IntersectionObserver 不保证在隐藏窗口及时回调，不能拿它当导航完成闸。
    if (!stillCurrent()) return;
    await mountPageModuleEditors(content, editorPage?.id);
    if (!stillCurrent()) return;
    if (state.sceneListTab === "actors") {
      await paintActorAtlasCanvases(content);
      if (!stillCurrent()) return;
      await paintMetaspriteCanvases(content);
      if (!stillCurrent()) return;
    }
    markRendered();
    if (activateSceneThumbnails && stillCurrent()) void activateSceneThumbnails();
    return;
  }
  if (state.view === "actors") bindVisualEditor();
  if (state.view === "battleactors") {
    bindBattleActorWorkbench({rerender: render});
    await paintBattleActorCanvases();
    if (!stillCurrent()) return;
  }
  if (storyPlaybackView(state.view)) {
    await startStoryTimer();
    if (!stillCurrent()) return;
  }
  if (state.view === "text") {
    bindTextModeTabs();
    await paintUiConstructionCanvases();
    if (!stillCurrent()) return;
    if (state.textMode === "charset") await loadCharsetWorkbench();
    else await loadTextCatalog();
    if (!stillCurrent()) return;
  }
  if (state.view === 'monster-formations') await bindMonsterFormations().catch(error =>
    showEditorError(document.querySelector('[data-screen-workbench="monster-formations"]'), '编队字段绑定失败', error));
  if (state.view === "battle-test") await bindBattleTestEditor().catch(error =>
    showEditorError($("#battle-test-editor"), "战斗测试字段绑定失败", error));
  await mountPageModuleEditors(content, editorPage?.id);
  if (!stillCurrent()) return;
  // owner 模块公开的 editor / reference / preview / cover 统一在这里水合。局部重绘仍可把
  // 新 DOM 根节点交回同一个入口，消费页不需要认识 owner 内部的 canvas 选择器。
  await hydrateModuleComponents(document);
  if (!stillCurrent()) return;
  // 怪物战斗图形按视图无关的钩子现画：谁在标记里放了 [data-monster-figure]
  // 就画谁，没有目标直接返回。列表页、记录页和遇敌区共用同一个渲染器，
  // 不再有「列表用 Python 渲的 PNG、编辑页用浏览器画的 canvas」这种分叉。
  await paintMonsterFigureCanvases();
  if (!stillCurrent()) return;
  if (dataView === "vehicles") {
    await paintVehicleVisualCanvases();
    if (!stillCurrent()) return;
  }
  // 角色图集与组合图各按标记绘制。
  await Promise.all([paintActorAtlasCanvases(), paintMetaspriteCanvases()]);
  if (!stillCurrent()) return;
  // 武器特效：装备记录绘制完整预览，战斗特效表按真实阶段逐段回放。
  await Promise.all([paintAttackVisualCanvases(), paintEffectObjectMotionCanvases(), paintBattleActionCanvases()]);
  if (!stillCurrent()) return;
  document.querySelectorAll("#content select").forEach(select => {
    if (select.options.length > 12 && !select.multiple
        && !select.closest(".carry-item-picker, [data-module-reference-value-control], [data-actor-appearance-picker]")) {
      bindGroupedReferenceSelect(select);
    }
  });
  focusResourceTarget();
  if (storyEditableView(state.view)) {
    await rememberStoryPlayback(content);
    if (!stillCurrent()) return;
  }
  markRendered();
  if (activateSceneThumbnails && stillCurrent()) setTimeout(() => {
    if (stillCurrent()) void activateSceneThumbnails();
  }, 5000);
}

function setNavigationEnabled(enabled) {
  document.querySelectorAll("[data-view]").forEach(node => {
    // 这里只表达应用是否完成初始化。package 版本不兼容由 render 的正文门禁处理，
    // 不能用 disabled/pointer-events 把整个导航做成死界面。
    node.disabled = !enabled;
    node.classList.toggle("awaiting-package", !enabled);
  });
}

// 服务停掉时 fetch 抛的是 TypeError("Failed to fetch")，对着这行字看不出该去
// 重启什么。提示条上要说的是「服务器失联」，原文保留在括号里备查。
function describeLoadError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
    ? `服务器失联（${message}）` : message;
}

async function init() {
  preparePageRuntime(state.view).catch(() => {});
  // 启动只读取一次 package 清单、一次 Web 核心投影，并打开轻量项目 session。
  // 分页只按需读取自己的 original JSON；baseline/binding 只允许实际构建动作读取。
  bindDbProgress();
  const loadTask = editorLog.startTask({source: "资源载入", message: "装载资产包"});
  mountPageNavigation();
  setNavigationEnabled(false);
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  const catalogPromise = loadModuleCatalog().catch(error => {
    editorLog.error("资源载入", "模块图加载失败", error);
    return null;
  });
  try {
    const packageManifest = await db.getPackageDocument("manifest.json", undefined, {readonly: true});
    (await import('./startup-prefetch-D5oNMEuL.js')).activatePackagePrefetchManifest(packageManifest);
    state.browserPackageManifest = packageManifest;
    const path = packageManifest.web_project_path;
    if (typeof path !== "string" || !path) {
      throw new Error("资产包缺少项目视图路径");
    }
    const provider = createStaticPackageBootstrapProvider({
      readJson: path => db.getPackageDocument(path, undefined, {readonly: true}),
    });
    let [project, session, catalog] = await Promise.all([
      db.getPackageDocument(path),
      openActiveProjectStore().then(repository =>
        openProjectSessionFromPackage(
          repository,
          provider,
          packageManifest,
        )
      ),
      catalogPromise,
    ]);
    if (!project) {
      throw new Error("项目视图数据格式无效");
    }
    state.projectRepository = session.repository;
    applyInterfacePreviewSceneRoute(new URLSearchParams(location.search));
    state.browserProjectManifest = session.manifest;
    if (catalog) {
      state.moduleCatalog = catalog;
      bindCacheControls(document);
      void refreshCacheControls(document);
    }
    state.projectBootstrapStatus = session.status;
    state.projectBootstrapError = "";
    configureBrowserRomBuildProvider(
      createProjectStoreRomBuildProvider(session.repository),
    );
    db.reset({preservePrefetch: true});
    // 字段会话随 epoch 失效：构建页缓存的编辑版本资产列表跟着作废，否则
    // 再次渲染时读旧会话的 `dirty` 会抛「字段会话已失效」。
    state.projectWorkingAssets = [];
    state.projectWorkingLoaded = false;
    state.projectStateLoaded = false;
    resetViewData();
    state.storyPartyPreviewSlots.clear();
    // package DB 的 project epoch 已切换；视图层缓存也必须同时失效。仅用 ROM
    // SHA 作 key 不够：两个项目可以共享同一原始 ROM，却发布不同的标注/工作态。
    Object.assign(state, {
      resourceRangeFieldViews: null,
      romMapBytes: null,
      romMapAnnotations: null,
      romMapDisassembly: null,
      romMapPrgSections: null,
      romMapPrgBankMetadata: null,
      romMapWindowOffset: 0,
      romMapTotalLength: 0,
      romMapLoadedAll: false,
      romMapLoadKey: null,
      romMapPageLoadKey: null,
      romMapRecordPagesLoaded: 0,
      romMapRecordPagesTotal: 0,
      romMapRecordPagesComplete: false,
      romMapExplorerUi: null,
      romMapChrBytes: null,
      romMapChrSections: null,
      romMapChrReferences: null,
      romMapChrWindowOffset: 0,
      romMapChrTotalLength: 0,
      romMapChrLoadKey: null,
      saveByteMapDocument: null,
      saveByteMapAttempted: false,
      saveByteMapLoading: false,
      saveExplorerUi: null,
      saveRomInitialBytes: null,
      saveCurrentBytes: null,
      saveDraftFields: {},
      saveCurrentName: "",
      saveCurrentSource: "rom-initial",
      saveError: "",
      saveMessage: "",
    });
    latestBuildArtifactsPromise = null;
    latestBuildArtifactsId = null;
    state.project = project;
    applyStoryPageNames(project);
    mountPageNavigation({storyNavigation: project.story_navigation});
    const rom = project.manifest.rom;
    loadTask.finish({message: `资产包已载入 · Mapper ${rom.mapper} · ${Math.round(rom.file_bytes / 1024)} KiB`});
    setNavigationEnabled(true);
    await render();
    replaceHistoryUrl(location.href);
  } catch (error) {
    state.projectBootstrapStatus = "error";
    state.projectBootstrapError = describeLoadError(error);
    loadTask.finish({level: "error", message: `资产包加载失败：${state.projectBootstrapError}`, error,
      retry: () => init()});
    // 资产包没取到多半是本地服务停了，这是环境故障而不是「这个编辑器坏了」。
    // 界面保持可用：导航照常点得动，不依赖资产包的页（构建、模拟器、SRAM）
    // 仍然能开，其余页由 render 的正文门禁各自说明读不到；故障本身只在状态栏
    // 挂一条常驻提示，服务起来后就地重试即可，不必刷新页面。
    setResourceAlert({
      title: "资产包加载失败",
      detail: state.projectBootstrapError,
      retry: () => init(),
      error,
    });
    const catalog = await catalogPromise;
    if (catalog) {
      state.moduleCatalog = catalog;
      bindCacheControls(document);
    }
    setNavigationEnabled(true);
    await render();
  }
}

bindSidebarToggle();
bindNavigationTree();
async function navigateSidebarItem(node) {
  const page = EDITOR_PAGES.find(page => page.id === node.dataset.editorPage);
  if (page) {
    const params = new URLSearchParams(Object.entries(page.route)
      .map(([key, value]) => [key === 'interfacePage' ? 'interface' : key, value]));
    await navigateInternalUrl(new URL(`?${params}`, location.href));
    return;
  }
  if (node.dataset.shopTab !== undefined || node.dataset.vendingFamily !== undefined
      || node.dataset.previewCommand !== undefined) {
    const url = new URL(location.origin + location.pathname);
    for (const key of ['view', 'shopFamily', 'shopTab', 'vendingFamily', 'facility', 'previewCommand']) {
      if (node.dataset[key] !== undefined) url.searchParams.set(key, node.dataset[key]);
    }
    if (node.dataset.interfacePage !== undefined) url.searchParams.set('interface', node.dataset.interfacePage);
    await navigateInternalUrl(url);
    return;
  }
  if (node.dataset.interfaceScreen !== undefined) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", node.dataset.view);
    url.searchParams.set("interface", node.dataset.interfacePage);
    url.searchParams.set("interfaceScreen", node.dataset.interfaceScreen);
    await navigateInternalUrl(url);
    return;
  }
  if (node.dataset.equipmentDomain !== undefined) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", "equipment");
    url.searchParams.set(EQUIPMENT_DOMAIN_PARAM, node.dataset.equipmentDomain);
    await navigateInternalUrl(url);
    return;
  }
  await navigateView(node.dataset.view, {
    shopFamily: node.dataset.shopFamily,
    interfacePage: node.dataset.interfacePage,
  });
}
bindResourceQueries(document, {delegate: true});
document.addEventListener("click", event => {
  const legacyLink = event.target.closest?.("[data-legacy-view]");
  if (legacyLink) {
    event.preventDefault();
    void navigateSidebarItem(legacyLink);
    return;
  }
  const node = event.target.closest?.("[data-view]");
  if (!node || node.disabled) return;
  event.preventDefault();
  void navigateSidebarItem(node);
});
let searchTimer = null;
let searchGeneration = 0;
function hideSearchResults() {
  $("#search-results").hidden = true;
  $("#search-results").replaceChildren();
}
async function locateSearchHandle(value, generation) {
  try {
    const records = await searchResourceHandles(value);
    if (generation !== searchGeneration) return;
    const exact = records.find(record => record.uid.toLowerCase() === value.toLowerCase());
    if (!exact && records.length) {
      const scenes = records.some(record => record.domain === "scene" || record.kind === "scene-actor-record")
        ? await db.getDocument("project.scenes", null) : null;
      if (generation !== searchGeneration) return;
      const locations = new Map((scenes?.editable_scenes || []).map(scene => [Number(scene.id), scene.name]));
      const panel = $("#search-results");
      panel.innerHTML = `<div class="search-results-count" role="status">${records.length} 项</div>
        <div class="search-results-list">${records.map(record => {
          const route = resourceTargetRoute(record);
          const sceneName = record.domain === "scene" || record.kind === "scene-actor-record"
            ? locations.get(Number.parseInt(record.uid.split(":")[1], 16)) : null;
          const location = sceneName || views[route?.view]?.[1] || record.label || record.domain;
          return `<button type="button" class="search-result" data-search-handle="${esc(record.uid)}">
            <span class="mono">${esc(record.uid)}</span><span>${esc(location)}</span></button>`;
        }).join("")}</div>`;
      panel.hidden = false;
      return;
    }
    hideSearchResults();
    if (!exact && !value.includes(":")) return;
    const found = await navigateToResourceTarget(exact?.uid || value);
    if (generation !== searchGeneration) return;
    if (!found) editorLog.record({source: "搜索", level: "warning", message: "未找到可定位的句柄", details: value});
  } catch (error) {
    if (generation !== searchGeneration) return;
    editorLog.error("搜索", error?.message || "句柄定位失败", error, {details: value});
  }
}
$("#search").addEventListener("input", event => {
  clearTimeout(searchTimer);
  const generation = ++searchGeneration;
  const value = event.target.value.trim();
  hideSearchResults();
  state.navigationGeneration += 1;
  state.resourceId = null;
  state.query = event.target.value;
  const url = new URL(location.href);
  url.searchParams.delete("resource");
  replaceHistoryUrl(url);
  render();
  if (value) searchTimer = setTimeout(() => {
    void locateSearchHandle(value, generation);
  }, 180);
});
$("#search").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const value = event.target.value.trim();
  if (!value) return;
  event.preventDefault();
  clearTimeout(searchTimer);
  void locateSearchHandle(value, ++searchGeneration);
});
$("#search-results").addEventListener("click", event => {
  const result = event.target.closest("[data-search-handle]");
  if (!result) return;
  clearTimeout(searchTimer);
  hideSearchResults();
  void locateSearchHandle(result.dataset.searchHandle, ++searchGeneration);
});
document.addEventListener("click", event => {
  if (event.target.closest(".search-container")) return;
  clearTimeout(searchTimer);
  searchGeneration += 1;
  hideSearchResults();
});
$("#search").addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  clearTimeout(searchTimer);
  searchGeneration += 1;
  hideSearchResults();
});
$("#copy-hash").addEventListener("click", async () => {
  const digest = state.project?.manifest?.rom?.sha256;
  if (!digest) return;
  await navigator.clipboard.writeText(digest);
  $("#copy-hash").textContent = "已复制";
  setTimeout(() => $("#copy-hash").textContent = "复制 SHA-256", 1000);
});
document.addEventListener("keydown", event => {
  if (event.ctrlKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#search").focus();
  }
});
// 全局状态栏只消费日志服务，保存任务跟随自动保存链的真实状态。
bindLogStatus(() => navigateView("log"));

const globalBuildButton = $("#global-build-run");
const expandedBuildButton = $("#global-build-expanded");
const globalBuildOpen = $("#global-build-open");
let globalBuildRunning = false;

globalThis.addEventListener("mmeditor-browser-build", () => {
  globalBuildButton.disabled = globalBuildRunning || state.browserBuildRunning;
  expandedBuildButton.disabled = globalBuildButton.disabled;
});

function openGlobalBuildEmulator(buildId = "latest") {
  const url = new URL(siteUrl("emulator.html"), location.origin);
  url.searchParams.set("rom", buildId);
  url.searchParams.set("autostart", "1");
  const emulatorWindow = window.open(url.href, "_blank");
  if (!emulatorWindow) return false;
  emulatorWindow.opener = null;
  return true;
}

globalBuildOpen.addEventListener("click", () => {
  const opened = openGlobalBuildEmulator();
  editorLog.record({source: "模拟器", level: opened ? "info" : "warning",
    message: opened ? "模拟器已打开" : "模拟器弹窗被拦截"});
});

async function buildFromTopbar({diagnostic = false} = {}) {
  if (globalBuildRunning || state.browserBuildRunning) return;
  globalBuildRunning = true;
  const startedAt = performance.now();
  const task = editorLog.startTask({source: "构建", message: "保存编辑"});
  const elapsed = () => `${((performance.now() - startedAt) / 1000).toFixed(1)} 秒`;
  globalBuildButton.disabled = true;
  expandedBuildButton.disabled = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    await flushFixedTextEditors();
    await flushAllAutoSaves();
    if (autoSaveError()) throw autoSaveError();
    task.finish({level: "debug", message: "编辑已提交"});
    const result = await runQuickBuild();
    let emulatorBuildId = result.build_id;
    if (diagnostic) {
      const output = await createExpandedRom(result.rom, {diagnostic: true});
      emulatorBuildId = await storeExpandedRomBuild(await openActiveProjectStore(), output, result);
      const objectUrl = URL.createObjectURL(new Blob([output.rom], {type: "application/octet-stream"}));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "metalmaxcn-diagnostic.nes";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    const opened = openGlobalBuildEmulator(emulatorBuildId);
    editorLog.record({source: "构建", level: opened ? "info" : "warning",
      message: `${diagnostic ? "自检 ROM 已下载" : "构建完成"} · ${elapsed()}${opened ? " · 模拟器已打开" : " · 弹窗被拦截"}`});
  } catch (error) {
    const message = `构建失败：${error?.message || error} · ${elapsed()}`;
    task.finish({level: "error", message, error});
    if (autoSaveError() === error) editorLog.record({source: "构建", level: "error", message, error});
    else editorLog.error("构建", message, error);
  } finally {
    globalBuildRunning = false;
    globalBuildButton.disabled = state.browserBuildRunning;
    expandedBuildButton.disabled = globalBuildButton.disabled;
  }
}

globalBuildButton.addEventListener("click", () => buildFromTopbar());
expandedBuildButton.addEventListener("click", () => buildFromTopbar({diagnostic: true}));

// 页面真要走了也把防抖窗口里的那一笔立刻排进链（能不能跑完由浏览器决定，
// 至少不再等 250 毫秒的防抖窗口白白丢掉）。
window.addEventListener("pagehide", () => {void flushAllAutoSaves();});
window.addEventListener("beforeunload", () => {void flushAllAutoSaves();});
// A reload can overtake IndexedDB writes begun in an input handler. Keep this
// document alive until the existing save chain settles, then perform the reload.
let completingSavedReload = false;
window.navigation?.addEventListener("navigate", event => {
  if (completingSavedReload || event.navigationType !== "reload" ||
      !event.canIntercept || !autoSaveBusy()) return;
  event.intercept({async handler() {
    await flushAllAutoSaves();
    completingSavedReload = true;
    location.reload();
  }});
});

window.addEventListener("popstate", async event => {
  if (!await acceptHistoryNavigation(event.state)) return;
  const snapshot = event.state?.mmEditor;
  if (!snapshot) {
    location.reload();
    return;
  }
  restoreEditorHistory(snapshot);
  applyInterfacePreviewSceneRoute(new URL(location.href).searchParams);
  const input = $("#search");
  if (input) input.value = state.query;
  await render();
  requestAnimationFrame(() => window.scrollTo(
    Number(snapshot.scrollX || 0), Number(snapshot.scrollY || 0)
  ));
});

init();

// @editor-module 读取和修改队伍角色的战斗 metasprite 选择。
//
// 战斗属性页只按队伍角色选择“战斗立绘”。角色值到 generic metasprite 的
// 5 字节 ROM 表、记录顺序与值域由这个基础资产模块拥有；消费页不接触表偏移。

const VISUAL_METASPRITES_RESOURCE_ID = "metasprite-record";
const BATTLE_ACTOR_SELECTOR_COMPONENT_ID =
  "metasprite-record.battle-actor-selectors";
const BATTLE_ACTOR_SELECTOR_COUNT = 5;
const PARTY_BATTLE_ACTOR_COUNT = 3;
const GENERIC_METASPRITE_COUNT = 55;

function integer(value, label, minimum, maximum) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new TypeError(`${label} 超出 ${minimum}..${maximum}：${value}`);
  }
  return result;
}

function battleActorSelectors(document_) {
  const values = document_?.battle_actor_metasprite_selectors;
  if (!Array.isArray(values) || values.length !== BATTLE_ACTOR_SELECTOR_COUNT) {
    throw new TypeError(
      `metasprite-record 缺少 ${BATTLE_ACTOR_SELECTOR_COUNT} 条战斗角色形象映射`,
    );
  }
  const byId = new Map();
  for (const record of values) {
    const id = integer(
      record?.id,
      "战斗角色形象映射 ID",
      0,
      BATTLE_ACTOR_SELECTOR_COUNT - 1,
    );
    if (byId.has(id)) throw new TypeError(`战斗角色形象映射 ID ${id} 重复`);
    integer(
      record.metasprite_id,
      `战斗角色形象映射 ${id}`,
      0,
      GENERIC_METASPRITE_COUNT - 1,
    );
    byId.set(id, record);
  }
  return Array.from(
    {length: BATTLE_ACTOR_SELECTOR_COUNT},
    (_, id) => byId.get(id),
  );
}

/** 三名主角的队伍槽与这张表的前三项一一对应。 */
function partyBattleMetaspriteId(document_, partyRoleId) {
  const role = integer(
    partyRoleId,
    "队伍角色",
    0,
    PARTY_BATTLE_ACTOR_COUNT - 1,
  );
  return Number(battleActorSelectors(document_)[role].metasprite_id);
}

/** 存活角色值从一开始索引选择表；死亡分支使用表末项。 */
function battleRoleSelector(document_, roleValue) {
  const role = integer(roleValue, '战斗角色值', 1, BATTLE_ACTOR_SELECTOR_COUNT);
  return battleActorSelectors(document_)[role - 1];
}

/** 在 metasprite-record 正文里改写一个角色；调用方仍须走项目仓库保存。 */

// @editor-module 剧情指令与单人战角色选择构成战斗入口投影。

async function prepareStoryBattleEntry(sequenceId, story, repository = db) {
  try {
    const sequence = story?.browser_vm?.sequences?.find(row => row.id === sequenceId);
    if (!sequence) throw new TypeError(`缺少剧情序列 ${sequenceId}`);
    const [actors, scripts, metasprites, fields] = await Promise.all([
      repository.getDocument('scene-actor', null),
      repository.getResourceDraft('story-autonomous-script'),
      repository.getDocument('metasprite-record', null),
      renderCodeFields(['scripted-party-role'], source =>
        repository.getField(source.resource_id, source.entity_handle, source.field)),
    ]);
    const records = (actors?.records || []).filter(row => row.entry_id === sequence.entry_variant_id);
    const document = await prepareStorySceneActions(records, scripts, story, repository);
    const entries = records.flatMap(actor => {
      const actions = storySceneActions(actor, document, story);
      return actions.filter(action => action.operation === 'start-scripted-encounter'
        && actions.some(row => row.cursor < action.cursor && row.operation === 'refresh-field-state'))
        .map(action => ({actor, action, actions}));
    });
    if (entries.length !== 1) throw new TypeError(`剧情序列 ${sequenceId} 缺少唯一战斗入口`);
    const {actor, action} = entries[0];
    const partyRole = fields['scripted-party-role'];
    const selector = () => battleRoleSelector(metasprites, partyRole.value);
    selector();
    if (!Number.isInteger(action.operands[0])) throw new TypeError('剧情战斗编队缺失');
    return {actorHandle: actor.uid, commandHandle: action.handle, operandFields: action.operandFields,
      get formationId() {return action.operands[0];},
      get victoryFlag() {return action.operands[1];},
      get partyRoleId() {return selector().party_role_id;},
      partyRoleField: partyRole};
  } catch (error) {
    return {missing: error.message};
  }
}

var storyBattleEntry = /*#__PURE__*/Object.freeze({
  __proto__: null,
  prepareStoryBattleEntry: prepareStoryBattleEntry
});

// @editor-module 字段对象提供定长 8×8 双位面像素编辑与重置。

function paintPatternPixelPreview(canvas, fields) {
  const bytes = fields.flatMap(field => field.value);
  const pixels = new Uint8ClampedArray(8 * 8 * 4);
  paintChrTile(pixels, 8, 0, 0, decodeChrTile(bytes, 0), [0x0F, 0x30, 0x10, 0x00], {transparent: false});
  canvas.width = canvas.height = 8;
  canvas.getContext('2d').putImageData(new ImageData(pixels, 8, 8), 0, 0);
}

function mountPatternPixelEditor(host, object, {fields, onValue = () => {}}) {
  const selected = fields.map(name => object.fields.find(field => field.fieldName === name));
  if (selected.some(field => !field) || ![1, 2].includes(selected.length)
      || selected.some(field => field.value.length !== (selected.length === 1 ? 16 : 8)))
    throw new TypeError('像素字段必须含两个 8 B 位面或一段 16 B 位图');
  const key = object.id;
  host.innerHTML = `<div class="pattern-pixel-editor" data-pattern-editor="${esc(key)}">
    <code>${esc(key)}</code>${selected.some(field => field.writeback?.state === 'unpermitted')
      ? writeAccessMarker({writebackMissing: true}) : ''}
    <fieldset><legend>画笔</legend>${[0, 1, 2, 3].map(value => `<label><input
      type="radio" name="pattern-brush-${esc(key)}" value="${value}"${value === 1 ? ' checked' : ''}>${value}</label>`).join('')}</fieldset>
    <canvas width="8" height="8" data-pattern-canvas aria-label="8×8 像素"></canvas>
    ${resetToOriginalButton(key)}</div>`;
  const canvas = host.querySelector('[data-pattern-canvas]');
  let pending = 0, writes = Promise.resolve();
  const sync = () => {
    paintPatternPixelPreview(canvas, selected);
    applyResetToOriginalStates(host, new Map([[key, selected.some(field => field.hasOverride)]]), {busy: pending > 0});
  };
  const perform = action => {
    pending++;
    sync();
    writes = writes.then(action).then(() => {
      host.querySelector('[data-editor-error-block]')?.remove();
      sync();
      return onValue();
    }).catch(error => showEditorError(host, '像素编辑', error))
      .finally(() => {pending--; sync();});
    return writes;
  };
  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 8 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 8 / rect.height);
    if (x < 0 || x > 7 || y < 0 || y > 7) return;
    const brush = Number(host.querySelector('input:checked').value);
    void perform(async () => {
      const bytes = selected.flatMap(field => field.value);
      const bit = 1 << (7 - x);
      for (let plane = 0; plane < 2; plane++) bytes[y + plane * 8] =
        (bytes[y + plane * 8] & ~bit) | (((brush >> plane) & 1) ? bit : 0);
      await object.database.writeFields(selected.map((field, index) => ({field,
        value: selected.length === 1 ? bytes : bytes.slice(index * 8, index * 8 + 8)})));
    });
  });
  host.querySelector('[data-reset-to-original]').addEventListener('click', () =>
    void perform(() => object.database.writeFields(selected.map(field =>
      ({field, value: field.defaultValue, reset: true})))));
  for (const field of selected) field.bind(host, sync);
  sync();
  host.dataset.fieldObjectReady = key;
}

var patternPixelEditor = /*#__PURE__*/Object.freeze({
  __proto__: null,
  mountPatternPixelEditor: mountPatternPixelEditor,
  paintPatternPixelPreview: paintPatternPixelPreview
});

// @editor-module 战斗入口的事件号与视听分支。

// A644 从 ECC2+0F 逆序比较，末字节 20 属于相邻函数的首指令。
// 原像与消费路径见 project/evidence/battle-entry-boss-flag/rom-paths.json。
const ESCAPE_EVENT_FLAGS = Object.freeze([
  0x00, 0x50, 0x51, 0x54, 0x55, 0x57, 0x58, 0x59,
  0x53, 0xB1, 0x1C, 0xB2, 0xB3, 0x8F, 0x78, 0x20,
]);

function battleFirstMonsterId(slots) {
  if (!Array.isArray(slots)) return null;
  const first = slots[0];
  if (!first || Number(first.count) === 0) return 0xFF;
  return first.monster_reference
    ? Number.parseInt(first.monster_reference.split(":").at(-1), 16)
    : Number(first.monster_id);
}

function battleModeForPendingEventFlag(value, firstMonsterId = null) {
  const flag = Number(value);
  if (!Number.isInteger(flag) || flag < 0 || flag > 0xFF) return null;
  const boss = flag === 0xF0 || (flag > 0 && flag < 0x60);
  return Object.freeze({
    label: boss ? "BOSS" : "普通",
    musicCommand: Number.isInteger(firstMonsterId) && firstMonsterId >= 0x80 && firstMonsterId <= 0xFF
      ? 0x06 : boss ? 0x08 : 0x07,
    deathEffect: boss ? 0x02 : 0x01,
    escapeEligible: ESCAPE_EVENT_FLAGS.includes(flag),
    victorySoundCommand: flag > 0 && flag < 0x60 ? 0x70 : 0x71,
    completionFlag: flag || null,
    wantedDefeatLevel: flag >= 0x50 && flag < 0x5D,
    wantedId: flag >= 0x50 && flag <= 0x5A ? flag - 0x4F : null,
    randomMissEligible: flag === 0,
  });
}

function battleFlowForStoryState(value) {
  const storyState = Number(value);
  if (!Number.isInteger(storyState) || storyState < 0 || storyState > 0xFF) return null;
  return Object.freeze({
    automatic: storyState === 0x06,
    exitMode: storyState === 0 ? 0x08 : 0x03,
    clearStoryStateOnExit: storyState >= 0x80,
    companionRecovery: storyState === 0x04,
    restorePartyOnWipe: storyState === 0x06,
  });
}

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

// @editor-module 场景画布草稿与已保存字段的差异状态。

function different(left, right) {
  if (left === undefined || right === undefined) return left !== right;
  return !canonicalJsonEqual(left, right);
}

function refreshSceneDraftDirty() {
  state.sceneEncounterDirty = different(
    state.sceneEncounter,
    state.sceneOriginalEncounter,
  );
  state.sceneDirty = different(state.scene?.map, state.sceneOriginalMap)
    || different(state.sceneLogic, state.sceneOriginalLogic)
    || changedSceneActors().length > 0
    || different(state.vehicleDraft?.placement, state.vehicleOriginal?.placement)
    || state.sceneEncounterDirty;
  return state.sceneDirty;
}

// @editor-module 随机遇敌区域的显示与编辑

const $$ = (selector) => [...document.querySelectorAll(selector)];


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


async function loadEncounterZones() {
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
function sceneEncounterPreview() {
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
function encounterZoneAt(x, y) {
  const block = encounterBlockAt(x, y);
  return block ? Number(block.zone_id) : null;
}

/** 世界地图上某一格落在第几个区块。点选时用来记住"点中的是哪一块"。 */
function encounterBlockIndexAt(x, y) {
  const binding = sceneEncounterBinding();
  if (binding?.kind !== "world-grid") return null;
  const size = binding.blockSize;
  const grid = Number(state.sceneEncounter.world_grid.blocks_x);
  const index = Math.floor(y / size) * grid + Math.floor(x / size);
  return state.sceneEncounter.world_grid.blocks[index] ? index : null;
}

/** 世界地图上点击某个 16×16 区块时改写它的 zone。 */
function paintEncounterBlock(x, y, refresh) {
  if (state.sceneEncounterBrush === null || state.sceneEncounterBrush === undefined) return false;
  const block = encounterBlockAt(x, y);
  if (!block || Number(block.zone_id) === Number(state.sceneEncounterBrush)) return false;
  const zoneId = Number(state.sceneEncounterBrush);
  const index = Number(block.index);
  const document = state.sceneEncounter;
  block.zone_id = zoneId;
  block.zone_id_hex = hex$a(block.zone_id, 2);
  refreshSceneDraftDirty();
  void db.getFieldObject(ENCOUNTER_ZONE_RESOURCE_ID, "scene.encounter.world-grid")
    .then(async object => {
      const handle = `${ENCOUNTER_ZONE_RESOURCE_ID}:world:${hex$a(index, 2).slice(2)}`;
      const field = object.fields.find(item => item.entityHandle === handle && item.fieldName === "zone_id");
      if (!field) throw new Error(`${handle} 没有已发布字段`);
      await field.set(zoneId);
      if (state.sceneEncounter !== document) return;
      const original = state.sceneOriginalEncounter.world_grid.blocks.find(row => Number(row.index) === index);
      if (!original) throw new Error(`${handle} 本地 Original 记录不存在`);
      original.zone_id = zoneId;
      original.zone_id_hex = hex$a(zoneId, 2);
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
  return `monster:${hex$a(Number(monsterId), 2).replace("0x", "").toUpperCase()}`;
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
      || monsterResourceUid(group.monsterId)}×${group.count}`).join(" + ") || (formation ? "空编队" : "");
    return `<td class="encounter-monster"><button type="button" class="resource-inline-link" data-resource-target="${esc(candidate.reference)}" title="${esc(candidate.reference)}"${formation ? '' : ' disabled'}>编队 $${candidate.value.toString(16).toUpperCase().padStart(2, "0")}${label ? ` · ${esc(label)}` : ''}</button></td>`;
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
      title="打开怪物属性 · ${esc(uid)}"${monster ? '' : ' disabled'}>
      ${thumbnail}<span><b>${esc(monster?.name || uid)}</b><small>${esc(monsterStatLine(monster) || uid)}</small></span>
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
    ${handleMarkup(`scene-encounter-zone:zone:${hex$a(Number(zone.zone_id), 2).slice(2)}`)}
    <p><i class="logic-dot" style="background:rgb(${encounterZoneColor(Number(zone.zone_id)).join(',')})"></i>
      ${Number(zone.zone_id) === 0 ? '不遇敌' : `${monsters.size} 种怪物`}</p>
    <div class="encounter-zone-config" data-encounter-field-object="${Number(zone.zone_id)}">
      <label>类别 <span data-encounter-config-choice="class"></span></label>
      <label>伏击阈值 <span data-encounter-config-choice="ambush"></span></label>
      <label>计量初值 <span data-encounter-config-choice="meter"></span></label>
      <label>保留位 <span data-encounter-config-choice="reserved"></span></label>
      <span data-encounter-zone-reset></span>
    </div>
    <p class="encounter-probability-basis">${[...modes.values()].map(mode => `${esc(mode.label)} · ${esc(audioCommandLabel(mode.musicCommand))}`).join("；")}</p>
    <div class="encounter-probability-conditions">
      <label>步数计量 <input type="number" min="0" max="255" data-encounter-probability="meter" value="${probabilityConditions.meter}"></label>
      <label>随机状态 <select data-encounter-probability="cycleLength" title="所选状态等权"><option value="all"${probabilityConditions.cycleLength === null ? " selected" : ""}>全部 65536 状态</option>${[53,132,353].map(value => `<option value="${value}"${value === probabilityConditions.cycleLength ? " selected" : ""}>周期 ${value}</option>`).join("")}</select></label>
      <label><input type="checkbox" data-encounter-probability="protectedSteps"${probabilityConditions.protectedSteps ? " checked" : ""}> 保护步数</label>
      ${[...gatedFlags].map(([flag, slots]) => `<label title="击杀后跳过槽 ${slots.join('、')}"><input type="checkbox" data-encounter-event-flag="${flag}"${probabilityEventFlags.has(flag) ? " checked" : ""}> ${eventFlagReferenceMarkup(flag, {compact: true})} · 槽 ${slots.join("、")}</label>`).join("")}
    </div>
    <table class="encounter-entry-table">
      <thead><tr><th>槽</th><th>怪物／编队</th><th title="修改类别 ${Number(zone.config) & 3} 的权重会作用于该类别全部遇敌区">权重</th><th title="${esc(encounterAlgorithm)}">抽槽率</th></tr></thead>
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
            ? slot >= 10 ? `<button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${hex$a(Number(entry.monster_id), 2).slice(2)}" title="编队">↗</button>`
              : `<button class="editor-inline-link" type="button" data-resource-target="${esc(monsterResourceUid(entry.monster_id))}" title="怪物">↗</button>` : ""}</td>
          <td><span data-encounter-weight="${slot}"></span></td>
          <td>${share.toFixed(2)}%</td>
        </tr>${Number(entry.monster_id) ? `<tr class="encounter-entry-facts"><td colspan="4" title="${selector === null ? "" : `后续随机高字节大于 ${encounterRules?.remap_thresholds[selector >> 5]} 时，以重映射组 ${(selector & 30) >> 1} 和随机低两位选槽`}">${esc(groupLabel)}${selector === null ? " · 单组" : ` · 最多 ${state.sceneEncounter.shared_tables.group_counts[selector & 1]} 组 · 规则 ${hex$a(selector, 2)}`}${mode.musicCommand !== ordinaryMode.musicCommand ? ` · ${esc(mode.label)}` : ""}</td></tr>` : ""}`;
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

function zonesByMonster() {
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
function renderEncounterZoneSidebar() {
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
  return `<div class="encounter-zone-sidebar">
    <div class="encounter-zone-sidebar-head"><span>遇敌区域 · ${zones.length}</span></div>
    <div class="encounter-zone-list">${zones.map(zone => {
      const id = Number(zone.zone_id);
      return `<div class="encounter-zone-row-wrapper">
        <div role="button" tabindex="0" class="encounter-zone-row ${id === active ? "active" : ""} ${
          inUse.has(id) ? "in-use" : ""
        }" data-encounter-zone="${id}">
          <span>${id === 0 ? '不遇敌' : `遇敌区域 ${id + 1}`}</span>
        </div>
      </div>`;
    }).join("")}</div>
  </div>`;
}

function renderEncounterZonePanel() {
  if (!state.sceneEncounter) return "";
  const binding = sceneEncounterBinding();
  if (!binding) return "";
  if (binding.kind === "implicit-zero") return "";
  if (binding.kind === "world-grid") {
    const used = [...new Set(binding.blocks.map(block => Number(block.zone_id)))].sort((a, b) => a - b);
    const active = activeEncounterZoneId();
    return `<section class="encounter-zone-panel">
      <header><h3>遇敌区域</h3><b>${used.length} 个区域 · ${binding.blocks.length} 个区块</b></header>
      <label class="check" title="关闭画笔后点击区块选中"><input type="checkbox" data-encounter-paint ${
        state.sceneEncounterBrush == null ? '' : 'checked'
      }> 画笔</label>
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
  const handle = `${ENCOUNTER_ZONE_RESOURCE_ID}:${kind}:${hex$a(id, 2).slice(2)}`;
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
          record.zone_id_hex = hex$a(field.value, 2);
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
          zone.entries[slot].monster_id_hex = hex$a(value, 2);
          zone.entries[slot].empty = value === 0;
          const gated = slot >= 10 && value > 0 && value < 16;
          zone.entries[slot].event_flag_gated = gated;
          zone.entries[slot].event_flag_hex = gated
            ? hex$a(Number(encounterEventMap[value]), 2) : null;
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
      `encounter-trigger-runtime.selection-weights.${hex$a(Number(object.fields.find(field =>
        field.fieldName === "config").value) & 3, 2).slice(2)}`);
    if (host.isConnected) await weights.mount(host, {encounterWeightSlots: true});
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

function bindEncounterZonePanel(
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
  $(".encounter-zone-row.active")?.scrollIntoView({block: 'nearest'});
  const paint = $("[data-encounter-paint]");
  if (paint) paint.addEventListener("change", () => {
    state.sceneEncounterBrush = paint.checked ? activeEncounterZoneId() : null;
    refresh();
  });
  void mountEncounterZoneFields(refresh);
  void mountEncounterSideFields(refresh);
  void paintMonsterFigureCanvases$1($("#scene-encounter-panel") || document);
}

/** 本地重算配置字节的派生字段，保存后由 Python 端再权威刷新一次。 */
function applyConfigBits(zone) {
  const value = Number(zone.config);
  const shared = state.sceneEncounter.shared_tables;
  zone.config_hex = hex$a(value, 2);
  zone.class_id = value & 3;
  zone.ambush_threshold_index = (value >> 2) & 3;
  zone.ambush_threshold = shared.ambush_thresholds[zone.ambush_threshold_index];
  zone.meter_initial_index = (value >> 4) & 3;
  zone.meter_initial_value = shared.meter_initial_values[zone.meter_initial_index];
  zone.config_reserved_bits = (value >> 6) & 3;
}

var encounter = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindEncounterZonePanel: bindEncounterZonePanel,
  encounterBlockIndexAt: encounterBlockIndexAt,
  encounterZoneAt: encounterZoneAt,
  loadEncounterZones: loadEncounterZones,
  paintEncounterBlock: paintEncounterBlock,
  renderEncounterZonePanel: renderEncounterZonePanel,
  renderEncounterZoneSidebar: renderEncounterZoneSidebar,
  sceneEncounterPreview: sceneEncounterPreview,
  zonesByMonster: zonesByMonster
});

// @editor-module Region-neutral continuous byte-map explorer.
//
// PRG ROM and battery SRAM intentionally share this renderer, filter model,
// coverage accounting and virtual scrolling.  Loaders and address adapters
// remain space-specific; once bytes and normalized annotations arrive here,
// the physical storage kind no longer changes how a row behaves.


const BYTE_MAP_ROW_HEIGHT = 38;

const DEFAULT_TYPE_OPTIONS = Object.freeze([
  {key: "semantic", label: "字段已解码", className: "data"},
  {key: "code", label: "功能代码", className: "code"},
  {key: "config", label: "结构化配置", className: "config"},
  {key: "script", label: "脚本 / 命令流", className: "script"},
  {key: "text", label: "文本 / 名称", className: "textdata"},
  {key: "content", label: "图形 / 内容资源", className: "contentdata"},
  {key: "font", label: "字库图形", className: "fontdata"},
  {key: "mixed", label: "混合代码 / 内联数据", className: "mixed"},
  {key: "mirror", label: "历史镜像 / 填充", className: "mirror"},
  {key: "provisional", label: "候选范围", className: "provisional"},
  {key: "unknown", label: "尚未划分", className: "unknown"},
]);

const byteMapHex = (value, width = 6) =>
  `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

function requireBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("byte-map bytes must be Uint8Array");
  return bytes;
}

function requireLength(value) {
  const length = Number(value);
  if (!Number.isInteger(length) || length < 1) {
    throw new TypeError("byte-map length must be a positive integer");
  }
  return length;
}

function requireAnnotations(annotations, length) {
  if (!Array.isArray(annotations) || annotations.length !== length) {
    throw new TypeError(`byte-map annotations must contain ${length} physical-byte entries`);
  }
  return annotations;
}

function createByteMapExplorer(options) {
  const bytes = options.bytes == null ? null : requireBytes(options.bytes);
  const length = bytes ? bytes.length : requireLength(options.length);
  if (options.length != null && requireLength(options.length) !== length) {
    throw new TypeError("byte-map byte length does not match declared length");
  }
  const annotations = requireAnnotations(options.annotations, length);
  const typeOptions = options.typeOptions || DEFAULT_TYPE_OPTIONS;
  const ui = options.ui || {};
  ui.selectedOffset = Math.max(0, Math.min(length - 1, Number(ui.selectedOffset) || 0));
  ui.search ??= "";
  ui.semanticScope ??= "all";
  if (!bytes && ui.semanticScope === "value") ui.semanticScope = "all";
  ui.valueSearch ??= "";
  ui.valueCompare ??= "eq";
  ui.valueWidth = Number(ui.valueWidth) === 2 ? 2 : 1;
  ui.valueScope ??= "all";
  ui.typeFilters ??= typeOptions.map(option => option.key);
  ui.searchIndex ??= null;
  ui.filteredOffsets ??= null;
  ui.filterResult ??= null;
  ui.virtualFrame ??= null;
  ui.ownerResourceId ??= "";
  ui.ownerLookupStatus ??= "idle";
  ui.ownerLookupRanges ??= [];
  ui.ownerLookupError ??= "";
  ui.ownerSelectionStatus ??= "ready";
  ui.ownerSelectionError ??= "";
  return {
    ...options,
    id: String(options.id || options.space || "byte-map"),
    space: String(options.space || "bytes"),
    label: String(options.label || options.space || "Byte map"),
    length,
    displayOffsetBase: Number.isInteger(options.displayOffsetBase)
      ? options.displayOffsetBase : 0,
    totalLength: Number.isInteger(options.totalLength) && options.totalLength >= length
      ? options.totalLength : length,
    bytes,
    hasValues: bytes !== null,
    annotations,
    typeOptions,
    ui,
    addressHeaders: options.addressHeaders || ["区域", "区内", "物理偏移", "槽内", "CPU"],
    addressColumns: options.addressColumns || (offset => ["", "", byteMapHex(offset), "", ""]),
    parseGoto: options.parseGoto || (value => parseFlatOffset(value, length)),
    formatGoto: options.formatGoto || (offset => byteMapHex(offset)),
  };
}

function replaceByteMapBytes(model, bytes) {
  requireBytes(bytes);
  if (bytes.length !== model.length || bytes.length !== model.annotations.length) {
    throw new TypeError("byte-map byte length changed");
  }
  model.bytes = bytes;
  model.hasValues = true;
  model.ui.searchIndex = null;
  return model;
}

function byteMapAnnotationType(annotation) {
  if (!annotation) return "unknown";
  if (["exact", "partial"].includes(annotation.status)) return "semantic";
  if (annotation.status === "code" || annotation.category === "code") return "code";
  if (annotation.status === "provisional" || annotation.category === "provisional") return "provisional";
  const explicit = ({
    config: "config",
    "save-container": "config",
    "save-directory": "config",
    "save-slot": "config",
    script: "script",
    textdata: "text",
    contentdata: "content",
    fontdata: "font",
    mixed: "mixed",
    mirror: "mirror",
  })[annotation.category];
  if (explicit) return explicit;
  if (annotation.status === "classified") return "config";
  return "semantic";
}

function readUnsigned(bytes, offset, width) {
  if (offset < 0 || offset + width > bytes.length) return null;
  let value = 0;
  for (let index = 0; index < width; index += 1) {
    value += bytes[offset + index] * (2 ** (index * 8));
  }
  return value;
}

function parseFilterValue(input, width) {
  const text = String(input || "").trim();
  if (!text) return {active: false, valid: true, value: null};
  let digits = text.toUpperCase();
  let radix = 10;
  if (digits.startsWith("$")) { radix = 16; digits = digits.slice(1); }
  else if (digits.startsWith("0X")) { radix = 16; digits = digits.slice(2); }
  else if (digits.endsWith("H")) { radix = 16; digits = digits.slice(0, -1); }
  else if (digits.startsWith("%")) { radix = 2; digits = digits.slice(1); }
  else if (digits.startsWith("0B")) { radix = 2; digits = digits.slice(2); }
  else if (/[A-F]/.test(digits)) radix = 16;
  const pattern = radix === 16 ? /^[0-9A-F]+$/ : radix === 2 ? /^[01]+$/ : /^\d+$/;
  const value = pattern.test(digits) ? Number.parseInt(digits, radix) : Number.NaN;
  const maximum = (2 ** (width * 8)) - 1;
  return {active: true, valid: Number.isFinite(value) && value >= 0 && value <= maximum, value, maximum};
}

function valueMatches(value, expected, comparison) {
  if (comparison === "ne") return value !== expected;
  if (comparison === "gt") return value > expected;
  if (comparison === "gte") return value >= expected;
  if (comparison === "lt") return value < expected;
  if (comparison === "lte") return value <= expected;
  return value === expected;
}

function defaultAddressMeaning(annotation) {
  return annotation?.addressMeaning || [annotation?.record, annotation?.field?.meaning]
    .filter(Boolean).join(" · ");
}

function decodedValue(model, annotation, offset) {
  if (!annotation) return "";
  if (!model.hasValues) return "未载入";
  if (typeof model.valueMeaning === "function") {
    return String(model.valueMeaning(annotation, offset, model.bytes) ?? "");
  }
  if (annotation.decodedLabel != null) return String(annotation.decodedLabel);
  const start = annotation.rangeStart;
  const length = annotation.rangeLength;
  const encoding = annotation.binding?.encoding || annotation.field?.encoding || "";
  if (["u8", "u16le", "u24le"].includes(encoding)) {
    return String(readUnsigned(model.bytes, start, length));
  }
  if (length > 32) {
    return `${byteMapHex(model.bytes[offset], 2)} · 范围 ${length.toLocaleString()} B`;
  }
  const raw = Array.from(model.bytes.slice(start, start + length));
  return raw.map(value => byteMapHex(value, 2).slice(1)).join(" ");
}

function addressMeaning(model, annotation) {
  if (typeof model.addressMeaning === "function") return String(model.addressMeaning(annotation) ?? "");
  return defaultAddressMeaning(annotation);
}

function explanation(model, annotation, offset) {
  if (!annotation) return {current: "", consequence: "", edit: ""};
  if (!model.hasValues) {
    return {
      current: annotation.algorithmDetail || annotation.field?.detail || annotation.record || "",
      consequence: "当前字节未载入；地址与结构说明仍然有效。",
      edit: annotation.binding?.editable === true
        ? "载入同长度字节后才可读取或修改当前值。" : "当前没有可读取的字节值。",
    };
  }
  if (typeof model.explain === "function") return model.explain(annotation, offset, model.bytes) || {};
  return {
    current: annotation.algorithmDetail || annotation.field?.detail || annotation.record || "",
    consequence: annotation.rangeLength > 1
      ? `字段第 ${offset - annotation.rangeStart + 1}/${annotation.rangeLength} 字节。` : "",
    edit: annotation.binding?.editable === true
      ? "此字段可通过字节地图定点修改。" : "只读；未知位与相邻字节保持原样。",
  };
}

function buildSearchIndex(model) {
  const seen = new Set();
  const index = [];
  for (let offset = 0; offset < model.annotations.length; offset += 1) {
    const annotation = model.annotations[offset];
    if (!annotation) continue;
    const key = annotation.searchKey || `${annotation.rangeStart}:${annotation.field?.meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meaning = addressMeaning(model, annotation);
    const value = model.hasValues
      ? decodedValue(model, annotation, annotation.rangeStart) : "";
    const moduleLabel = typeof model.moduleLabel === "function"
      ? model.moduleLabel(annotation) : "";
    const addressSearchable = [
      meaning, annotation.record, annotation.field?.meaning, annotation.fieldId,
      annotation.rangeId, annotation.binding?.label, annotation.binding?.slot,
      ...(annotation.semanticPath || []), annotation.semanticDomain,
      moduleLabel, annotation.writebackPath, ...(annotation.aliases || []),
      ...(annotation.resourceIds || []),
      model.formatGoto(annotation.rangeStart), byteMapHex(annotation.rangeStart),
    ].filter(value_ => value_ !== null && value_ !== undefined && value_ !== "")
      .join(" \n ").toLocaleLowerCase();
    const valueSearchable = model.hasValues
      ? [value, annotation.valueDescription, ...(annotation.valueAliases || [])]
        .filter(Boolean).join(" \n ").toLocaleLowerCase()
      : "";
    index.push({
      offset: annotation.rangeStart,
      rangeLength: annotation.rangeLength,
      annotation,
      addressSearchable,
      valueSearchable,
      searchable: `${addressSearchable} \n ${valueSearchable}`,
    });
  }
  index.sort((left, right) => left.offset - right.offset);
  model.ui.searchIndex = index;
  return index;
}

function filterActive(model) {
  return Boolean(model.ui.search.trim() || (model.hasValues && model.ui.valueSearch.trim())
    || model.ui.typeFilters.length !== model.typeOptions.length);
}

function filterByteMap(model) {
  const query = String(model.ui.search || "").trim();
  const valueFilter = model.hasValues
    ? parseFilterValue(model.ui.valueSearch, model.ui.valueWidth)
    : {active: false, valid: true, value: null};
  if (!query && !valueFilter.active && !filterActive(model)) {
    const result = {total: model.length, offsets: null, filterLabel: `全部 ${model.label}`};
    model.ui.filteredOffsets = null;
    model.ui.filterResult = result;
    return result;
  }
  if (!valueFilter.valid) {
    const result = {total: 0, offsets: [], error: `${model.ui.valueWidth * 8}-bit 无符号值应在 0-${valueFilter.maximum} 之间`};
    model.ui.filteredOffsets = [];
    model.ui.filterResult = result;
    return result;
  }
  const index = model.ui.searchIndex || buildSearchIndex(model);
  const tokens = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const field = model.ui.semanticScope === "address" ? "addressSearchable"
    : model.ui.semanticScope === "value" ? "valueSearchable" : "searchable";
  // 物理地址搜索指向一个字节，而语义索引按 record 起点去重。若目标落在跨页/
  // 多字节 record 的中间，仅搜索 record.rangeStart 会错误返回 0 项。地址形状的
  // 查询直接解析为当前窗口的局部 offset；普通文本仍走语义索引。
  const parsedAddress = query && model.ui.semanticScope !== "value"
    ? model.parseGoto(query) : null;
  const addressOffset = Number.isInteger(parsedAddress)
    ? parsedAddress - model.displayOffsetBase : null;
  const matches = query && addressOffset === null
    ? index.filter(item => tokens.every(token => item[field].includes(token))) : null;
  const selectedTypes = new Set(model.ui.typeFilters);
  const scanWidth = model.hasValues ? model.ui.valueWidth : 1;
  const offsets = [];
  const seen = new Set();
  const consider = offset => {
    if (seen.has(offset) || offset < 0 || offset + scanWidth > model.length) return;
    seen.add(offset);
    if (!selectedTypes.has(byteMapAnnotationType(model.annotations[offset]))) return;
    if (model.hasValues && model.ui.valueScope === "known" && !model.annotations[offset]) return;
    if (model.hasValues && valueFilter.active && !valueMatches(
      readUnsigned(model.bytes, offset, model.ui.valueWidth), valueFilter.value, model.ui.valueCompare,
    )) return;
    offsets.push(offset);
  };
  if (addressOffset !== null) {
    consider(addressOffset);
  } else if (matches) {
    for (const match of matches) {
      const length = valueFilter.active && model.ui.valueWidth > 1 ? 1 : match.rangeLength;
      for (let index_ = 0; index_ < length; index_ += 1) consider(match.offset + index_);
    }
  } else {
    for (let offset = 0; offset <= model.length - scanWidth; offset += 1) consider(offset);
  }
  offsets.sort((left, right) => left - right);
  const result = {
    total: offsets.length,
    offsets,
    filterLabel: [query && `语义“${query}”`, valueFilter.active && `当前值 ${model.ui.valueCompare} ${valueFilter.value}`,
      model.hasValues && model.ui.valueScope === "known" && "仅已标注"].filter(Boolean).join(" · "),
  };
  model.ui.filteredOffsets = offsets;
  model.ui.filterResult = result;
  return result;
}

function byteMapFilterStatus(model) {
  const result = model.ui.filterResult;
  if (result?.error) return {className: "invalid", text: `过滤条件错误 · ${result.error}`};
  if (!filterActive(model)) return {className: "", text: `未过滤 · ${model.length.toLocaleString()} B`};
  return {
    className: result?.total ? "active" : "empty",
    text: `${Number(result?.total || 0).toLocaleString()} HITS / ${model.length.toLocaleString()} B · ${result?.filterLabel || ""}`,
  };
}

function byteMapCoverage(model) {
  const counts = {exact: 0, partial: 0, code: 0, classified: 0, provisional: 0, unknown: 0};
  for (const annotation of model.annotations) {
    if (!annotation) counts.unknown += 1;
    else if (annotation.status === "exact") counts.exact += 1;
    else if (annotation.status === "partial") counts.partial += 1;
    else if (annotation.status === "code" || annotation.category === "code") counts.code += 1;
    else if (annotation.status === "provisional") counts.provisional += 1;
    else counts.classified += 1;
  }
  counts.semantic = counts.exact + counts.partial;
  counts.editable = model.annotations.reduce((total, annotation) =>
    total + (annotation?.block?.web_editable === true ? 1 : 0), 0);
  counts.confirmed = counts.exact + counts.partial + counts.code + counts.classified;
  counts.total = model.length;
  counts.annotated = counts.total - counts.unknown;
  return counts;
}

const percent = (value, total) => total ? `${(value * 100 / total).toFixed(2)}%` : "0.00%";

function renderByteMapCoverage(model) {
  const coverage = byteMapCoverage(model);
  const status = byteMapFilterStatus(model);
  const saveCoverage = model.space === "sram" ? `
    <span class="exact">精确字段语义 ${coverage.exact.toLocaleString()} B · ${percent(coverage.exact, coverage.total)}</span>
    <span class="partial">部分字段语义 ${coverage.partial.toLocaleString()} B · ${percent(coverage.partial, coverage.total)}</span>
    <span class="semantic">字段语义合计 ${coverage.semantic.toLocaleString()} B · ${percent(coverage.semantic, coverage.total)}</span>
    <span class="classified">仅结构 / 大类 ${coverage.classified.toLocaleString()} B · ${percent(coverage.classified, coverage.total)}</span>
    <span class="editable">安全可编辑 ${coverage.editable.toLocaleString()} B · ${percent(coverage.editable, coverage.total)}</span>
    <span class="annotated">物理有标注 ${coverage.annotated.toLocaleString()} B · ${percent(coverage.annotated, coverage.total)}（不等于解析率）</span>` : `
    <span class="exact">字段已解码 ${coverage.exact.toLocaleString()} B · ${percent(coverage.exact, coverage.total)}</span>
    <span class="partial">字段部分解码 ${coverage.partial.toLocaleString()} B · ${percent(coverage.partial, coverage.total)}</span>
    <span class="code">功能代码 ${coverage.code.toLocaleString()} B · ${percent(coverage.code, coverage.total)}</span>
    <span class="classified">已分类内容 ${coverage.classified.toLocaleString()} B · ${percent(coverage.classified, coverage.total)}</span>
    <span class="annotated">物理有标注 ${coverage.annotated.toLocaleString()} B · ${percent(coverage.annotated, coverage.total)}</span>`;
  return `<div class="rom-memory-summary" data-byte-map-coverage="${esc(model.space)}">
    <b>${esc(model.label)} · 连续地址流</b><span>${coverage.total.toLocaleString()} B</span>
    <strong id="${esc(model.id)}-filter-status" class="rom-filter-status ${status.className}">${esc(status.text)}</strong>
    ${saveCoverage}
    <span class="provisional">候选范围 ${coverage.provisional.toLocaleString()} B · ${percent(coverage.provisional, coverage.total)}</span>
  </div>`;
}

function normalizedOwner(value) {
  return value?.resourceId && value?.role ? value : null;
}

function selectedPhysicalOffset(model) {
  return Number(model.displayOffsetBase || 0) + Number(model.ui.selectedOffset || 0);
}

function selectedByteMapResourceOwner(model) {
  const localOffset = Number(model.ui.selectedOffset || 0);
  const physicalOffset = selectedPhysicalOffset(model);
  if (typeof model.ownerAtOffset === "function") {
    return normalizedOwner(model.ownerAtOffset(physicalOffset, model));
  }
  const object = model.annotations?.[localOffset]?.fieldObject;
  return normalizedOwner(object?.role ? {resourceId: object.resourceId,
    role: object.role} : null);
}

function selectedOwnerAddressLoaded(model) {
  if (typeof model.ownerAddressLoaded !== "function") return true;
  const localOffset = Number(model.ui.selectedOffset || 0);
  return model.ownerAddressLoaded(localOffset, selectedPhysicalOffset(model), model) === true;
}

function ownerElementLabel(owner) {
  if (Number.isInteger(owner?.elementIndex) && Number.isInteger(owner?.elementCount)) {
    return `${owner.elementIndex} / ${owner.elementCount}`;
  }
  if (Number.isInteger(owner?.elementIndex)) return String(owner.elementIndex);
  if (Number.isInteger(owner?.elementCount)) return `共 ${owner.elementCount}`;
  return "";
}

function renderSelectedOwner(model) {
  const offset = selectedPhysicalOffset(model);
  const address = formatPhysicalAddress(model.space, offset) || `${model.space}:${offset}`;
  if (!selectedOwnerAddressLoaded(model)) {
    const failed = model.ui.ownerSelectionStatus === "error";
    return `<div class="byte-owner-answer pending" data-byte-owner-status="${failed ? "error" : "loading"}">
      <header><span>当前物理地址</span><b>${esc(address)}</b></header>
      <strong>${failed ? "这段字节的拥有者登记读取失败" : "正在读取这段字节的拥有者登记…"}</strong>
      <p>${failed ? esc(model.ui.ownerSelectionError || "未知错误") : ""}</p>
    </div>`;
  }
  const owner = selectedByteMapResourceOwner(model);
  if (!owner) {
    return `<div class="byte-owner-answer unowned" data-byte-owner-status="unowned">
      <header><span>当前物理地址</span><b>${esc(address)}</b></header>

    </div>`;
  }
  const element = ownerElementLabel(owner);
  const editor = resourceDomain$1(owner.resourceId)
    ? `<button type="button" class="button ghost" data-byte-owner-editor="${esc(owner.resourceId)}" title="资源编辑页" aria-label="资源编辑页">↗</button>`
    : "";
  return `<div class="byte-owner-answer owned" data-byte-owner-status="owned">
    <header><span>当前物理地址</span><b>${esc(address)}</b></header>
    <dl>
      <div><dt>资源标识</dt><dd data-byte-owner-resource-id>${esc(owner.resourceId)}</dd></div>
      <div><dt>角色</dt><dd data-byte-owner-role>${esc(owner.role)}</dd></div>
      ${element ? `<div><dt>元素索引 / 总数</dt><dd data-byte-owner-element>${esc(element)}</dd></div>` : ""}
    </dl>
    ${editor}
  </div>`;
}

function ownerRangeHref(range) {
  const target = physicalAddressTarget(range);
  if (!target) return "";
  const query = new URLSearchParams({view: target.view});
  query.set(target.parameter, String(target.focus));
  return `?${query}`;
}

function compareOwnerRanges(left, right) {
  const spaces = ["prg", "chr", "sram"];
  return spaces.indexOf(left.space) - spaces.indexOf(right.space)
    || Number(left.offset) - Number(right.offset)
    || Number(left.length) - Number(right.length)
    || String(left.role).localeCompare(String(right.role), "zh-CN");
}

function renderByteMapResourceOwnerRanges(resourceId, ranges, status = "ready", error = "") {
  const id = String(resourceId || "").trim();
  if (status === "loading") {
    return `<p class="byte-owner-lookup-message loading-owner">正在只按 <code>resource_owner</code> 扫描 PRG / CHR / SRAM…</p>`;
  }
  if (status === "error") {
    return `<p class="byte-owner-lookup-message error">反查失败：${esc(error || "未知错误")}</p>`;
  }
  if (!id) {
    return ``;
  }
  const ownedRanges = (Array.isArray(ranges) ? ranges : [])
    .filter(range => range?.resourceId === id)
    .slice().sort(compareOwnerRanges);
  if (!ownedRanges.length) {
    return ``;
  }
  return `<div class="byte-owner-range-summary"><b>${esc(id)}</b><span>${ownedRanges.length.toLocaleString()} 个拥有范围 · 跨地址空间合并列出</span></div>
    <ol class="byte-owner-range-list">${ownedRanges.map(range => {
      const address = formatPhysicalAddress(range.space, range.offset);
      const end = formatPhysicalAddress(range.space, range.endExclusive - 1);
      const href = ownerRangeHref(range);
      const element = ownerElementLabel(range);
      return `<li data-byte-owner-range data-byte-owner-space="${esc(range.space)}" data-byte-owner-offset="${range.offset}">
        <a href="${esc(href)}"><b>${esc(address)}</b><span>–${esc(end)}</span></a>
        <span>长度 ${Number(range.length).toLocaleString()} B · 角色 ${esc(range.role)}${element ? ` · 元素 ${esc(element)}` : ""}</span>
      </li>`;
    }).join("")}</ol>`;
}

function renderByteMapOwnerPanel(model) {
  const ui = model.ui;
  return `<section id="${esc(model.id)}-owner-panel" class="byte-owner-panel" data-byte-owner-panel>
    <div data-byte-owner-address-result>${renderSelectedOwner(model)}</div>
    <form class="byte-owner-lookup" data-byte-owner-lookup>
      <label>按资源标识反查拥有范围
        <input value="${esc(ui.ownerResourceId)}" placeholder="battle-appearance:vehicle-8 / monster-profile" autocomplete="off" spellcheck="false" data-byte-owner-resource-input>
      </label>
      <button class="button" type="submit">查它占了哪些字节</button>
    </form>
    <div class="byte-owner-lookup-result" data-byte-owner-resource-result>
      ${renderByteMapResourceOwnerRanges(
        ui.ownerResourceId, ui.ownerLookupRanges, ui.ownerLookupStatus, ui.ownerLookupError,
      )}
    </div>
  </section>`;
}

function ownerPanelElement(model, root = document) {
  if (root?.id === `${model.id}-owner-panel`) return root;
  return root?.querySelector?.(`#${CSS.escape(model.id)}-owner-panel`) || null;
}

function updateByteMapOwnerSelection(model, root = document) {
  const panel = ownerPanelElement(model, root);
  const result = panel?.querySelector("[data-byte-owner-address-result]");
  if (result) result.innerHTML = renderSelectedOwner(model);
}

function bindByteMapOwnerPanel(model, root = document) {
  const panel = ownerPanelElement(model, root);
  if (!panel) return;
  updateByteMapOwnerSelection(model, panel);
  panel.addEventListener("click", async event => {
    const target = event.target.closest?.("[data-byte-owner-editor]");
    if (!target) return;
    const {navigateToResourceTarget} = await Promise.resolve().then(function () { return resourceNav; });
    await navigateToResourceTarget(target.dataset.byteOwnerEditor);
  });
  panel.querySelector("[data-byte-owner-lookup]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const input = panel.querySelector("[data-byte-owner-resource-input]");
    const result = panel.querySelector("[data-byte-owner-resource-result]");
    const resourceId = String(input?.value || "").trim();
    if (!resourceId) {
      input?.setCustomValidity("请输入资源标识");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    model.ui.ownerResourceId = resourceId;
    model.ui.ownerLookupStatus = "loading";
    model.ui.ownerLookupError = "";
    model.ui.ownerLookupRanges = [];
    if (result) result.innerHTML = renderByteMapResourceOwnerRanges(resourceId, [], "loading");
    const request = Symbol(resourceId);
    model.ui.ownerLookupRequest = request;
    try {
      const lookup = typeof model.ownerLookup === "function"
        ? model.ownerLookup : findPhysicalFieldObjectRanges;
      const ranges = await lookup(resourceId, model);
      if (model.ui.ownerLookupRequest !== request) return;
      model.ui.ownerLookupStatus = "ready";
      model.ui.ownerLookupRanges = Array.isArray(ranges) ? ranges : [];
      if (result) result.innerHTML = renderByteMapResourceOwnerRanges(
        resourceId, model.ui.ownerLookupRanges,
      );
    } catch (error_) {
      editorLog.error("编辑页面", `操作失败：${error_?.message || error_}`, error_);
      if (model.ui.ownerLookupRequest !== request) return;
      model.ui.ownerLookupStatus = "error";
      model.ui.ownerLookupError = error_ instanceof Error ? error_.message : String(error_);
      if (result) result.innerHTML = renderByteMapResourceOwnerRanges(
        resourceId, [], "error", model.ui.ownerLookupError,
      );
    }
  });
}

function renderFilterControls(model) {
  const ui = model.ui;
  const valueDisabled = model.hasValues ? "" : " disabled";
  const rangeStart = model.displayOffsetBase;
  const rangeEnd = rangeStart + model.length - 1;
  const scope = model.totalLength === model.length
    ? `${model.length.toLocaleString()} 个物理字节`
    : `当前窗口 ${model.length.toLocaleString()} B / 全空间 ${model.totalLength.toLocaleString()} B`;
  return `<div class="rom-memory-toolbar">
    <div class="rom-flat-range"><small>连续 ${esc(model.space)}</small><b>${byteMapHex(rangeStart)}-${byteMapHex(rangeEnd)}</b><span>${scope}</span></div>
    <label class="rom-memory-goto">地址<input id="${esc(model.id)}-goto" value="${esc(model.formatGoto(ui.selectedOffset))}" spellcheck="false"><button class="button" id="${esc(model.id)}-goto-button" type="button" title="跳转" aria-label="跳转">↗</button></label>
    <div class="rom-cheat-filter">
      <small>字节地图筛选</small>
      <label class="rom-map-search">语义关键词<input id="${esc(model.id)}-search" value="${esc(ui.search)}" placeholder="字段、功能、field_id…" autocomplete="off" spellcheck="false"></label>
      <label>语义范围<select id="${esc(model.id)}-semantic-scope">
        <option value="all" ${ui.semanticScope === "all" ? "selected" : ""}>全部</option>
        <option value="address" ${ui.semanticScope === "address" ? "selected" : ""}>地址含义</option>
        <option value="value" ${ui.semanticScope === "value" ? "selected" : ""}${valueDisabled}>值含义</option>
      </select></label>
      <label class="rom-map-value-search">当前值<input id="${esc(model.id)}-value-search" value="${esc(ui.valueSearch)}" placeholder="${model.hasValues ? "$01 / 1 / %00000001" : "未载入"}" autocomplete="off" spellcheck="false"${valueDisabled}></label>
      <label>比较<select id="${esc(model.id)}-value-compare"${valueDisabled}>
        ${[["eq", "="], ["ne", "≠"], ["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"]]
          .map(([value, label]) => `<option value="${value}" ${ui.valueCompare === value ? "selected" : ""}>${esc(label)}</option>`).join("")}
      </select></label>
      <label>宽度<select id="${esc(model.id)}-value-width"${valueDisabled}><option value="1" ${ui.valueWidth === 1 ? "selected" : ""}>8-bit</option><option value="2" ${ui.valueWidth === 2 ? "selected" : ""}>16-bit LE</option></select></label>
      <label>范围<select id="${esc(model.id)}-value-scope"${valueDisabled}><option value="all" ${ui.valueScope === "all" ? "selected" : ""}>全部字节</option><option value="known" ${ui.valueScope === "known" ? "selected" : ""}>仅已标注</option></select></label>
      <button class="button ghost" id="${esc(model.id)}-filter-clear" type="button">清除</button>
      <div class="rom-type-filter"><small>类型</small>${model.typeOptions.map(option => `
        <label class="${esc(option.className)}"><input type="checkbox" data-byte-map-type="${esc(option.key)}" ${ui.typeFilters.includes(option.key) ? "checked" : ""}><i></i><span>${esc(option.label)}</span></label>`).join("")}
        <button type="button" data-byte-map-types="all">全选</button><button type="button" data-byte-map-types="none">清空</button>
      </div>
    </div>
  </div>`;
}

function rowValueCell(model, annotation, offset, valueMeaning) {
  if (!model.hasValues) return `<b>未载入</b>`;
  if (annotation && typeof model.fieldEditor === "function") {
    const editor = model.fieldEditor(annotation, offset, model.bytes);
    if (editor != null) return String(editor);
  }
  return annotation ? `<b>${esc(valueMeaning)}</b>` : "";
}

function renderByteMapRow(model, offset, mergeContext = null) {
  const value = model.hasValues ? model.bytes[offset] : null;
  const annotation = model.annotations[offset];
  const classes = ["rom-byte-row", Math.floor(offset / 0x2000) & 1 ? "bank-odd" : "bank-even"];
  if ((offset & 0x1fff) === 0) classes.push("bank-start");
  if (annotation) classes.push(annotation.status, annotation.category);
  if (offset === model.ui.selectedOffset) classes.push("selected");
  const groupId = annotation?.codeGroupId || annotation?.mergeGroupId;
  const merged = Boolean(groupId && mergeContext);
  const mergeStart = !merged || !mergeContext.continuation;
  const rowspan = Math.max(1, Number(mergeContext?.rowspan || 1));
  const rowspanAttribute = rowspan > 1 ? ` rowspan="${rowspan}"` : "";
  const semantic = annotation ? "rom-byte-semantic" : "rom-byte-empty";
  const mergedClasses = merged ? ` rom-byte-range-merged rom-byte-${annotation.category}-merged` : "";
  const meaning = annotation ? addressMeaning(model, annotation) : "";
  const decoded = annotation ? decodedValue(model, annotation, offset) : "";
  const detail = explanation(model, annotation, offset);
  const meta = annotation ? [
    annotation.fieldId || annotation.rangeId,
    typeof model.moduleLabel === "function" ? model.moduleLabel(annotation) : "",
    annotation.record,
    annotation.status,
    annotation.field?.encoding,
    annotation.rangeLength > 1 ? `字节 ${offset - annotation.rangeStart + 1}/${annotation.rangeLength}` : "",
  ].filter(Boolean).join(" · ") : "";
  const raw = !annotation ? "" : !model.hasValues ? "未载入" : annotation.rangeLength > 32
    ? `${byteMapHex(value, 2).slice(1)}（当前字节；全范围 ${annotation.rangeLength.toLocaleString()} B）`
    : Array.from(model.bytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength))
      .map(item => byteMapHex(item, 2).slice(1)).join(" ");
  const sram = model.space === "sram";
  const addressCell = mergeStart
    ? `<td class="rom-byte-annotation ${semantic}${mergedClasses}"${rowspanAttribute}${sram && meta ? ` title="${esc(meta)}"` : ""}>${annotation ? `<b>${esc(meaning)}</b>${sram ? "" : `<small>${esc(meta)}</small>`}` : ""}</td>` : "";
  const note = [detail.current, detail.consequence, detail.edit].filter(Boolean).join(" ");
  const noteCell = mergeStart
    ? `<td class="rom-byte-note ${semantic}${mergedClasses}"${rowspanAttribute} title="${esc(note)}">${annotation ? `<span>${esc(detail.current || "")}</span>${sram ? "" : `<small>${esc([detail.consequence, detail.edit].filter(Boolean).join(" "))}</small>`}` : ""}</td>` : "";
  const columns = model.addressColumns(offset, annotation);
  if (!Array.isArray(columns) || columns.length !== 5) throw new TypeError("byte-map address adapter must return five columns");
  return `<tr class="${classes.join(" ")}" data-byte-map-offset="${offset}" data-byte-map-space="${esc(model.space)}">
    ${columns.map(column => {
      const item = column && typeof column === "object" ? column : {value: column};
      return `<td class="rom-byte-address ${esc(item.className || "")}" title="${esc(item.title ?? item.value ?? "")}">${esc(item.value ?? "")}</td>`;
    }).join("")}
    <td class="rom-byte-value">${model.hasValues ? byteMapHex(value, 2).slice(1) : "—"}</td>
    <td class="rom-byte-bits">${model.hasValues ? value.toString(2).padStart(8, "0") : "—"}</td>
    ${addressCell}
    <td class="rom-byte-value-meaning ${semantic}"${sram && annotation ? ` title="字段原始值 ${esc(raw)}"` : ""}>${rowValueCell(model, annotation, offset, decoded)}${annotation && !sram ? `<small>字段原始值 ${esc(raw)}</small>` : ""}</td>
    ${noteCell}
  </tr>`;
}

function rootElement(model, root = document) {
  if (root?.id === `${model.id}-explorer`) return root;
  return root?.querySelector?.(`#${CSS.escape(model.id)}-explorer`) || null;
}

function filteredByteMapRowIndex(model, offset) {
  const offsets = model.ui.filteredOffsets;
  if (!offsets) return offset;
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (offsets[middle] === offset) return middle;
    if (offsets[middle] < offset) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

function renderByteMapWindow(model, root = document) {
  const container = rootElement(model, root);
  const viewer = container?.querySelector("[data-byte-map-viewer]");
  const body = container?.querySelector("[data-byte-map-body]");
  if (!viewer || !body) return [];
  const filtered = model.ui.filteredOffsets;
  const total = filtered ? filtered.length : model.length;
  if (!total) {
    const status = byteMapFilterStatus(model);
    body.innerHTML = `<tr class="rom-byte-no-results"><td colspan="10"><b>没有命中字节</b><span>${esc(status.text)}</span></td></tr>`;
    return [];
  }
  const buffer = 14;
  const first = Math.max(0, Math.floor(viewer.scrollTop / BYTE_MAP_ROW_HEIGHT) - buffer);
  // A contract page or embedded panel may omit the production max-height CSS.
  // Never let the table's own natural height feed back into the next virtual
  // window size and expand 29 → 800 → every physical row.
  const viewportHeight = Math.min(1200, viewer.clientHeight || 760);
  const visible = Math.ceil(viewportHeight / BYTE_MAP_ROW_HEIGHT) + buffer * 2;
  const end = Math.min(total, first + visible);
  const offsets = [];
  for (let row = first; row < end; row += 1) offsets.push(filtered ? filtered[row] : row);
  const mergeContexts = Array(offsets.length).fill(null);
  for (let index = 0; index < offsets.length;) {
    const offset = offsets[index];
    const annotation = model.annotations[offset];
    const groupId = annotation?.codeGroupId || annotation?.mergeGroupId;
    if (!groupId) { index += 1; continue; }
    let endIndex = index + 1;
    while (endIndex < offsets.length && offsets[endIndex] === offsets[endIndex - 1] + 1
      && (model.annotations[offsets[endIndex]]?.codeGroupId
        || model.annotations[offsets[endIndex]]?.mergeGroupId) === groupId) endIndex += 1;
    mergeContexts[index] = {rowspan: endIndex - index, continuation: false};
    for (let cursor = index + 1; cursor < endIndex; cursor += 1) {
      mergeContexts[cursor] = {rowspan: 0, continuation: true};
    }
    index = endIndex;
  }
  const rows = [];
  if (first) rows.push(`<tr class="rom-byte-spacer"><td colspan="10" style="height:${first * BYTE_MAP_ROW_HEIGHT}px"></td></tr>`);
  for (let index = 0; index < offsets.length; index += 1) rows.push(renderByteMapRow(model, offsets[index], mergeContexts[index]));
  if (end < total) rows.push(`<tr class="rom-byte-spacer"><td colspan="10" style="height:${(total - end) * BYTE_MAP_ROW_HEIGHT}px"></td></tr>`);
  body.innerHTML = rows.join("");
  return offsets;
}

async function ensureSelectedByteOwner(model, offset, root) {
  if (selectedOwnerAddressLoaded(model) || typeof model.ensureOffsets !== "function") return;
  const request = Symbol(`owner:${offset}`);
  model.ui.ownerSelectionRequest = request;
  try {
    const annotations = await model.ensureOffsets([offset], model);
    if (model.ui.ownerSelectionRequest !== request || model.ui.selectedOffset !== offset) return;
    if (Array.isArray(annotations) && annotations.length === model.length
        && annotations !== model.annotations) {
      model.annotations = annotations;
      model.ui.searchIndex = null;
      filterByteMap(model);
      renderByteMapWindow(model, root);
      updateFilterStatus(model, root);
    }
    if (!selectedOwnerAddressLoaded(model)) {
      throw new Error("字节地图语义分片没有返回这个地址");
    }
    model.ui.ownerSelectionStatus = "ready";
    model.ui.ownerSelectionError = "";
  } catch (error) {
    if (model.ui.ownerSelectionRequest !== request || model.ui.selectedOffset !== offset) return;
    model.ui.ownerSelectionStatus = "error";
    model.ui.ownerSelectionError = error instanceof Error ? error.message : String(error);
  }
  updateByteMapOwnerSelection(model, root);
}

function updateFilterStatus(model, root) {
  const status = byteMapFilterStatus(model);
  const node = root.querySelector(`#${CSS.escape(model.id)}-filter-status`);
  if (node) {
    node.className = `rom-filter-status ${status.className}`.trim();
    node.textContent = status.text;
  }
}

function selectByteMapOffset(model, offset, {scroll = false, root = document} = {}) {
  const normalized = Math.max(0, Math.min(model.length - 1, Number(offset) || 0));
  model.ui.selectedOffset = normalized;
  model.ui.ownerSelectionStatus = selectedOwnerAddressLoaded(model) ? "ready" : "loading";
  model.ui.ownerSelectionError = "";
  const container = rootElement(model, root);
  if (scroll) {
    const viewer = container?.querySelector("[data-byte-map-viewer]");
    const row = filteredByteMapRowIndex(model, normalized);
    if (viewer && row >= 0) viewer.scrollTop = Math.max(0, row * BYTE_MAP_ROW_HEIGHT - viewer.clientHeight / 2);
    renderByteMapWindow(model, container || root);
  }
  container?.querySelector(".rom-byte-row.selected")?.classList.remove("selected");
  container?.querySelector(`[data-byte-map-offset="${normalized}"]`)?.classList.add("selected");
  const goto = container?.querySelector(`#${CSS.escape(model.id)}-goto`);
  if (goto) goto.value = model.formatGoto(normalized);
  updateByteMapOwnerSelection(model, container || root);
  model.onSelect?.(normalized, model);
  if (!selectedOwnerAddressLoaded(model)) {
    void ensureSelectedByteOwner(model, normalized, container || root);
  }
}

function renderByteMapExplorer(model, {beforeTable = "", afterTable = ""} = {}) {
  filterByteMap(model);
  return `<section id="${esc(model.id)}-explorer" class="byte-map-explorer" data-byte-map-space="${esc(model.space)}" data-byte-map-total="${model.length}" data-byte-map-values="${model.hasValues ? "loaded" : "missing"}">
    ${renderFilterControls(model)}
    ${renderByteMapCoverage(model)}
    ${renderByteMapOwnerPanel(model)}
    ${beforeTable}
    <div class="rom-memory-viewer" data-byte-map-viewer>
      <table class="rom-byte-table" aria-rowcount="${model.length}">
        <thead><tr>${model.addressHeaders.map(label => `<th>${esc(label)}</th>`).join("")}<th>HEX</th><th>BITS</th><th>地址含义</th><th>当前值含义</th><th>说明 / 回写</th></tr></thead>
        <tbody data-byte-map-body></tbody>
      </table>
    </div>
    ${afterTable}
  </section>`;
}

function parseFlatOffset(value, total) {
  const text = String(value || "").trim().toUpperCase().replace(/^\$/, "").replace(/^0X/, "");
  if (!/^[0-9A-F]+$/.test(text)) return null;
  const offset = Number.parseInt(text, 16);
  return offset >= 0 && offset < total ? offset : null;
}

function syncFilter(model, root) {
  model.ui.searchIndex = null;
  filterByteMap(model);
  const viewer = root.querySelector("[data-byte-map-viewer]");
  if (viewer) viewer.scrollTop = 0;
  renderByteMapWindow(model, root);
  updateFilterStatus(model, root);
  model.onUiChange?.(model.ui, model);
}

function bindByteMapExplorer(model, root = document) {
  const container = rootElement(model, root);
  if (!container) return;
  bindByteMapOwnerPanel(model, container);
  const byId = suffix => container.querySelector(`#${CSS.escape(model.id)}-${suffix}`);
  const bindFilter = (suffix, eventName, update) => byId(suffix)?.addEventListener(eventName, event => {
    update(event.currentTarget);
    syncFilter(model, container);
  });
  bindFilter("search", "input", node => { model.ui.search = node.value; });
  bindFilter("semantic-scope", "change", node => { model.ui.semanticScope = ["address", "value"].includes(node.value) ? node.value : "all"; });
  bindFilter("value-search", "input", node => { model.ui.valueSearch = node.value; });
  bindFilter("value-compare", "change", node => { model.ui.valueCompare = node.value; });
  bindFilter("value-width", "change", node => { model.ui.valueWidth = Number(node.value) === 2 ? 2 : 1; });
  bindFilter("value-scope", "change", node => { model.ui.valueScope = node.value === "known" ? "known" : "all"; });
  const setTypes = types => {
    model.ui.typeFilters = model.typeOptions.map(option => option.key).filter(key => types.includes(key));
    container.querySelectorAll("[data-byte-map-type]").forEach(node => {
      node.checked = model.ui.typeFilters.includes(node.dataset.byteMapType);
    });
    syncFilter(model, container);
  };
  container.querySelectorAll("[data-byte-map-type]").forEach(node => node.addEventListener("change", () => {
    setTypes(Array.from(container.querySelectorAll("[data-byte-map-type]:checked"))
      .map(input => input.dataset.byteMapType));
  }));
  container.querySelector('[data-byte-map-types="all"]')?.addEventListener("click", () => setTypes(model.typeOptions.map(option => option.key)));
  container.querySelector('[data-byte-map-types="none"]')?.addEventListener("click", () => setTypes([]));
  byId("filter-clear")?.addEventListener("click", () => {
    Object.assign(model.ui, {search: "", semanticScope: "all", valueSearch: "", valueCompare: "eq", valueWidth: 1, valueScope: "all"});
    model.ui.typeFilters = model.typeOptions.map(option => option.key);
    for (const [suffix, value] of [["search", ""], ["semantic-scope", "all"], ["value-search", ""], ["value-compare", "eq"], ["value-width", "1"], ["value-scope", "all"]]) {
      const node = byId(suffix); if (node) node.value = value;
    }
    container.querySelectorAll("[data-byte-map-type]").forEach(node => { node.checked = true; });
    syncFilter(model, container);
  });
  const go = async () => {
    const input = byId("goto");
    const parsed = model.parseGoto(input?.value);
    let offset = parsed;
    if (parsed != null && typeof model.resolveGoto === "function") {
      try {
        offset = await model.resolveGoto(parsed, model);
      } catch (error) {
        input?.setCustomValidity(error instanceof Error ? error.message : String(error));
        input?.reportValidity();
        return;
      }
      // null means the resolver performed an asynchronous bank switch and
      // replaced this explorer.  The new render owns selection and validation.
      if (offset == null) return;
    }
    if (offset == null) {
      input?.setCustomValidity("地址不在当前字节空间内");
      input?.reportValidity();
      return;
    }
    if (model.ui.filteredOffsets && filteredByteMapRowIndex(model, offset) < 0) {
      input?.setCustomValidity("该地址不符合当前过滤条件");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    selectByteMapOffset(model, offset, {scroll: true, root: container});
  };
  byId("goto-button")?.addEventListener("click", () => { void go(); });
  byId("goto")?.addEventListener("keydown", event => { if (event.key === "Enter") void go(); });
  container.querySelector("[data-byte-map-body]")?.addEventListener("click", event => {
    if (event.target.closest("[data-byte-map-field-id]")) return;
    const row = event.target.closest("[data-byte-map-offset]");
    if (row) selectByteMapOffset(model, Number(row.dataset.byteMapOffset), {root: container});
  });
  container.querySelector("[data-byte-map-body]")?.addEventListener("input", async event => {
    const input = event.target.closest("[data-byte-map-field-id]");
    if (!input || !model.onFieldEdit) return;
    const value = input.type === "checkbox" ? input.checked
      : input.dataset.byteMapValueKind === "bytes" ? input.value
        : input.value === "" ? null : Number(input.value);
    try {
      const result = await model.onFieldEdit(input.dataset.byteMapFieldId, value, model, input);
      input.setCustomValidity("");
      if (result instanceof Uint8Array) {
        replaceByteMapBytes(model, result);
        filterByteMap(model);
        renderByteMapWindow(model, container);
        updateFilterStatus(model, container);
      }
      model.onUiChange?.(model.ui, model);
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
    }
  });
  const viewer = container.querySelector("[data-byte-map-viewer]");
  let initialPageScrollTop = null;
  let pageLoadingArmed = false;
  viewer?.addEventListener("scroll", () => {
    if (model.ui.virtualFrame) cancelAnimationFrame(model.ui.virtualFrame);
    model.ui.virtualFrame = requestAnimationFrame(async () => {
      model.ui.virtualFrame = null;
      const offsets = renderByteMapWindow(model, container);
      if (typeof model.ensureOffsets !== "function" || !offsets.length) return;
      if (!pageLoadingArmed) {
        if (initialPageScrollTop === null
            || Math.abs(viewer.scrollTop - initialPageScrollTop) < 1) return;
        pageLoadingArmed = true;
      }
      model.ui.pendingPageOffsets = offsets;
      if (model.ui.recordPagePromise) return;
      model.ui.recordPagePromise = (async () => {
        while (model.ui.pendingPageOffsets) {
          const wanted = model.ui.pendingPageOffsets;
          model.ui.pendingPageOffsets = null;
          const annotations = await model.ensureOffsets(wanted, model);
          if (!Array.isArray(annotations) || annotations.length !== model.length
              || annotations === model.annotations) continue;
          model.annotations = annotations;
          model.ui.searchIndex = null;
          filterByteMap(model);
          renderByteMapWindow(model, container);
          updateFilterStatus(model, container);
          updateByteMapOwnerSelection(model, container);
        }
      })();
      try {
        await model.ui.recordPagePromise;
      } catch (error) {
        model.ui.recordPageError = error instanceof Error ? error.message : String(error);
      } finally {
        model.ui.recordPagePromise = null;
      }
    });
  });
  // 先建立带上下 spacer 的虚拟高度，随后 selection 才能把任意深链行滚进窗口；
  // 这次只画占位/已缓存语义，不触发 record-page I/O。
  renderByteMapWindow(model, container);
  selectByteMapOffset(model, model.ui.selectedOffset, {scroll: true, root: container});
  initialPageScrollTop = viewer?.scrollTop ?? 0;
}

// @editor-module 设施辅助例程只执行已发布的调用状态语义。

function executeFacilityHelper(helper, input = {}, operands = [], windows) {
  if (helper?.confirmation_status !== "confirmed" || !helper.implementation)
    return {status: "unavailable", missing: helper?.missing || ["helper-semantics"]};
  const state = structuredClone(input);
  state.cpu ||= {};
  const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
  const requireByte = key => {
    if (!byte(state[key])) throw new Error(key);
    return state[key];
  };
  const requireVector = (key, index) => {
    const values = state[key];
    if (!(Array.isArray(values) || ArrayBuffer.isView(values)) || !byte(values[index]))
      throw new Error(`${key}[${index}]`);
    return values;
  };
  const flags = value => {
    state.cpu.zero = value === 0;
    state.cpu.negative = (value & 128) !== 0;
    return value;
  };
  let continuation = null;
  const selectBranch = index => {
    if (!byte(operands[index])) throw new Error(`branch_operands[${index}]`);
    const selector = operands[index];
    state.cpu.y = index + 1;
    state.cpu.a = selector;
    flags((selector - 254) & 255);
    state.cpu.carry = selector >= 254;
    continuation = selector >= 254 ? {return_marker: selector} : {next_segment_index: selector};
  };
  try {
    switch (helper.implementation) {
      case "select-configuration-value": {
        const index = (requireByte("selection_index") + 1) & 255;
        state.cpu.y = index;
        state.configuration_value = state.cpu.a = flags(requireVector("configuration", index)[index]);
        break;
      }
      case "set-field-mode":
        state.field_mode = state.cpu.a = flags(5);
        break;
      case "set-instance-from-y-minus-one":
        state.instance = state.cpu.y = flags((requireByte("y") - 1) & 255);
        break;
      case "double-selection-index": {
        const index = requireByte("selection_index");
        state.cpu.carry = (index & 128) !== 0;
        state.selection_kind = state.cpu.a = flags((index * 2) & 255);
        break;
      }
      case "increment-engine-upgrade": {
        const index = requireByte("vehicle_index");
        const values = requireVector("engine_upgrades", index);
        state.cpu.x = index;
        values[index] = flags((values[index] + 1) & 255);
        break;
      }
      case "count-active-vehicles": {
        let remaining = 4;
        for (let index = 3; index >= 0; index--) {
          const value = requireVector("vehicle_slots", index)[index];
          if (value & 128) remaining--;
          state.cpu.a = value;
        }
        state.remaining_vehicle_count = remaining;
        state.cpu.x = flags(0);
        break;
      }
      case "clear-role-status-high-bit": {
        const index = requireByte("role_index");
        const values = requireVector("role_status", index);
        state.cpu.x = index;
        values[index] = flags(values[index] & 127);
        state.cpu.carry = false;
        break;
      }
      case "save-selected-file":
        state.selected_file = state.cpu.x = flags((requireByte("selection_index") + 1) & 255);
        break;
      case "clear-selection-window": {
        const result = executeFacilityWindowRoutine(windows, 'window-FA99', state);
        if (result.status !== 'available') return result;
        Object.assign(state, result.state);
        state.cpu.y = state.rectangle_width;
        state.cpu.a = state.rectangle_pointer >> 8;
        state.cpu.x = flags(0);
        state.cpu.carry = false;
        break;
      }
      case "store-selected-capacity": {
        const index = requireByte("vehicle_index");
        const values = requireVector("packed_capacity", index);
        state.cpu.x = index;
        values[index] = state.cpu.a = flags((values[index] & 192) | requireByte("selected_capacity"));
        break;
      }
      case "select-special-inventory":
        state.configuration_kind = state.selection_kind = 2;
        state.configuration_pointer = 0x6496;
        state.cpu.a = flags(0x64);
        state.cpu.x = 4;
        state.cpu.carry = false;
        break;
      case "classify-inventory-item": {
        const item = requireByte("item_id");
        const index = [1, 0x41, 0x99, 0xCB].findLastIndex(threshold => item >= threshold);
        state.cpu.carry = index < 0;
        if (index < 0) {
          state.cpu.a = item;
          state.cpu.x = flags(255);
        } else {
          state.configuration_kind = [2, 0, 3, 1][index];
          state.configuration_pointer = [0x6496, 0x6674, 0x64AE, 0x65CF][index];
          state.cpu.x = index * 2;
          state.cpu.a = flags(state.configuration_pointer >> 8);
        }
        break;
      }
      case "zero-selection-kind":
        state.selection_kind = 0;
        break;
      case "two-selection-kind":
        state.selection_kind = state.cpu.y = flags(2);
        break;
      case "capture-selection-index":
        state.configuration_value = state.cpu.a = flags(requireByte("selection_index"));
        break;
      case "reset-selection-index":
        state.selection_index = state.cpu.a = flags(0);
        break;
      case "clear-quantity":
        state.quantity_low_byte = state.quantity_middle_byte = state.quantity_high_byte = 0;
        state.cpu.a = flags(0);
        break;
      case "copy-money-difference": {
        const values = requireVector("money_difference", 0);
        requireVector("money_difference", 1);
        requireVector("money_difference", 2);
        state.money = Array.from(values).slice(0, 3);
        state.cpu.a = values[0];
        state.cpu.x = flags(255);
        break;
      }
      case "set-quantity-low-byte":
        if (!byte(operands[0])) throw new Error("quantity operand");
        state.quantity_low_byte = state.cpu.a = flags(operands[0]);
        break;
      case "select-text-region-seven":
      case "select-text-region-sixteen":
        state.text_region = state.cpu.a = flags(helper.implementation === "select-text-region-seven" ? 7 : 16);
        break;
      case "branch-condition-index":
        selectBranch(requireByte("condition_index"));
        break;
      case "branch-role-status-negative":
      case "branch-role-status-ff": {
        const index = requireByte("role_index");
        const value = requireVector("role_status", index)[index];
        state.cpu.x = index;
        selectBranch(helper.implementation === "branch-role-status-negative" ? +(value >= 128) : +(value === 255));
        break;
      }
      case "branch-actor-count-one":
        state.remaining_vehicle_count = requireByte("actor_count");
        selectBranch(+(state.actor_count !== 1));
        break;
      case "branch-special-vehicle-present":
        selectBranch(+(requireByte("special_vehicle") !== 0));
        break;
      case "branch-slot-values-equal":
        selectBranch(+(requireByte("slot_left") === requireByte("slot_right")));
        break;
      case "branch-slot-value-zero":
        selectBranch(+(requireByte("slot_left") === 0));
        break;
      case "branch-field-progress-threshold":
        selectBranch(+(requireByte("field_progress") < 0x60));
        break;
      default:
        return {status: "unavailable", missing: ["helper-implementation"]};
    }
  } catch (error) {
    return {status: "unavailable", missing: [error.message]};
  }
  return {status: "available", state, window_effects: helper.window_effects, ...continuation};
}

function executeFacilityCallState(branch, helpers, input = {}, windows, windowContext = {}) {
  if (!branch?.call_state_program?.length)
    return {status: "unavailable", missing: ["branch-call-state-program"]};
  let state = structuredClone(input);
  const effects = [];
  for (const step of branch?.call_state_program || []) {
    if (step.kind === "helper" || step.kind === "control") {
      const helper = helpers.find(helper => helper.id === step.helper);
      state.y = step.entry_state.y;
      state.cpu = {...state.cpu, ...step.entry_state.cpu};
      const result = executeFacilityHelper(helper, state, step.operands, windows);
      if (result.status !== "available") return {...result, state, effects, stopped_at: step.source};
      state = result.state;
      effects.push(...result.window_effects);
      if (result.next_segment_index !== undefined || result.return_marker !== undefined)
        return {status: "available", state, effects,
          ...(result.next_segment_index !== undefined ? {next_segment_index: result.next_segment_index}
            : {return_marker: result.return_marker})};
    } else if (step.kind === "jump") {
      return {status: "available", state, effects, next_segment_index: step.segment_index};
    } else if (step.kind === "return") {
      return {status: "available", state, effects, return_marker: step.marker};
    } else if (step.window_routine?.id === 'window-F1DD') {
      const entry = executeFacilityWindowRoutine(windows, step.window_routine.id, state, windowContext);
      const result = entry.status === 'pending' ? resumeFacilityWindowCycle(windows, entry, windowContext) : entry;
      return {status: 'unavailable', state: result.state || state,
        effects: [...effects, ...(result.effects || [])], stopped_at: step.source,
        missing: result.missing || ['menu-callback-effects', 'menu-branch-continuation']};
    } else {
      return {status: "unavailable", state, effects, stopped_at: step.source,
        missing: step.missing};
    }
  }
  return {status: "available", state, effects};
}

// @editor-module 设施分支只组装发布的来源并保留逐项缺口。

const gapLabels = {
  'branch-condition': '自然入口与分支选择未确认',
  'runtime-palette-binding': '分支显示阶段与调色板效果未绑定',
  'body-window-effects': '正文与窗口调用阶段未确认',
  'body-geometry': '正文几何来源缺失',
  'callback-body-geometry': '回调正文起点未确认',
  'callback-pointer-effects': '回调脚本指针效果未确认',
  'transitive-callback-semantics': '传递回调语义未确认',
  'callback-window-effects': '回调窗口效果未确认',
  'opcode-window-effects': '控制指令窗口效果未确认',
  'indexed-branch-call-state': '索引分支调用状态未确认',
  'runtime-record-selection': '运行正文选择未绑定',
  'parameter-values': '正文参数存在未绑定字段公式',
  'inherited-window-state': '窗口缺少当前继承现场',
  'window-construction-program': '分支窗口提交顺序未绑定',
  'glyph-cache-stage': '字形缓存选择与复用阶段未绑定，仅有默认线性分配来源',
  'display-phase': '显示阶段缺少当前现场',
  'body-preview': '该正文尚无构建预览',
  'segment-call-entry': '分段调用入口未确认',
};

function facilityBranchGaps(branch, body = null, windowContext = null) {
  if (branch?.disposition?.status === 'unreachable') return [];
  const missing = new Set([...(branch?.missing || []), ...(body?.missing || [])]);
  if (!branch?.runtime_execution_confirmed) missing.add('branch-condition');
  if (body && !body.preview) missing.add('body-preview');
  if (!windowContext?.state) {
    missing.add('inherited-window-state');
    missing.add('glyph-cache-stage');
    missing.add('display-phase');
  }
  if (!Array.isArray(windowContext?.program)) missing.add('window-construction-program');
  return [...missing].map(kind => ({kind, source: body?.id || branch?.id,
    reason: gapLabels[kind] || `尚缺来源：${kind}`}));
}

function facilityBranchFieldSources(catalog, branch, body = null) {
  const steps = branch?.call_state_program || [];
  const helpers = [...(catalog?.application_helper_sources || []), ...(catalog?.application_control_sources || [])];
  return {
    entry_chain: branch?.entry_chain || [],
    execution_role: branch?.execution_roles || [],
    read_condition: branch?.application_read_condition || null,
    callback_reads: branch?.callback_reads || [],
    callback_continuation: branch?.callback_continuation || null,
    body: body ? {selection: body.selection, records: body.records,
      geometry: body.geometry_reference, parameters: body.parameters} : null,
    window: branch?.window || null,
    calls: steps.map(step => ({...step,
      implementation_source: helpers.find(helper => helper.id === step.helper)?.source || null})),
    construction: branch?.construction_sources || null,
    window_routines: steps.flatMap(step => step.window_routine ? [
      catalog?.application_window_sources?.routines?.find(row => row.id === step.window_routine.id),
    ].filter(Boolean) : []),
    glyph_cache: catalog?.application_window_sources?.glyph_cache || null,
    palette: branch?.palette_binding || null,
    frame_commit: {catalog: catalog?.application_window_sources?.runtime_sources?.frame_commit || null,
      scope: catalog?.frame_commit_sources?.confirmed_scope || null,
      excluded: catalog?.frame_commit_sources?.excluded || []},
  };
}

function resolveFacilityBranchPreview(catalog, branch, body = null, {
  invocation = {}, windowContext = null,
} = {}) {
  if (!branch) return null;
  const steps = branch.call_state_program || [];
  const bodyIndex = body ? steps.findIndex(step => step.action === body.id) : -1;
  const prefix = bodyIndex >= 0 ? steps.slice(0, bodyIndex) : steps;
  const helpers = [...(catalog?.application_helper_sources || []), ...(catalog?.application_control_sources || [])];
  const input = {...windowContext?.state, ...invocation};
  const callState = windowContext?.continuation ? {status: 'available', state: structuredClone(input), effects: []}
    : prefix.length || !body ? executeFacilityCallState({...branch, call_state_program: prefix},
      helpers, input, catalog?.application_window_sources)
      : {status: 'available', state: structuredClone(input), effects: []};
  const context = callState.status === 'available' ? {...invocation, ...callState.state} : invocation;
  const gaps = facilityBranchGaps(branch, body, windowContext);
  if (callState.status !== 'available') gaps.push(...(callState.missing || []).map(kind => ({
    kind: 'call-state', source: callState.stopped_at, reason: `调用状态缺少：${kind}`,
  })));
  return {...(body?.preview || {}), id: `constructor:${body?.id || branch.id}`,
    disposition: branch.disposition || null,
    source_binding: body?.id || null, source_branch: branch.id,
    scope: body ? 'body-occurrence-only' : 'conditional-segment-call-effects',
    confirmation_status: branch.confirmation_status, runtime_execution_confirmed: branch.runtime_execution_confirmed,
    structural: true, preview_basis: 'published-application-sources',
    field_sources: facilityBranchFieldSources(catalog, branch, body),
    branch_call_state: callState, control_surface: branch.control_surface,
    facility_call_context: invocation, facility_parameter_context: context,
    facility_palette_context: context,
    facility_palette_binding: branch.palette_binding,
    ...(windowContext ? {facility_window_context: {...structuredClone(windowContext),
      state: callState.status === 'available' ? callState.state : structuredClone(windowContext.state)}} : {}),
    facility_preview_gaps: [...gaps, ...(body?.callback_pointer_gaps || [])],
    missing: [...new Set(gaps.map(gap => gap.kind))],
    layers: (body?.preview?.layers || []).map(layer => ({...layer,
      facility_parameter_context: {...layer.facility_parameter_context, ...context}})),
  };
}

// @editor-module 终端服务显示目录排除机器码、数据表与电梯场景退出。
function isTerminalDisplayBranch(branch) {
  if (branch.command === 'application-command:1F' && branch.id.endsWith(':segment:01')) return false;
  if (!['application-command:36', 'application-command:38'].includes(branch.command)) return true;
  const scan = branch.entry_chain?.find(row => row.role === 'segment')?.selection_scan
    || branch.segment_selection_scan;
  if (!scan) return true;
  return !(branch.execution_roles || []).some(role => ['machine-code', 'data-table'].includes(role.kind)
    && role.offset < scan.end_exclusive && scan.offset < role.offset + role.length);
}

// @editor-module 服务状态组装发布的分支来源并保留缺口。

function serviceBodyPreview(branch, body, invocation = {}, windowContext = null) {
  const catalog = state.project?.ui?.construction?.interfaces;
  return resolveFacilityBranchPreview(catalog, branch, body, {invocation, windowContext});
}

function serviceStatePreviews(branch, body, invocation) {
  return facilityServiceStatePreviews(branch, body,
    state.project?.ui?.construction?.menu_dispatch_data?.previews, invocation,
    state.project?.ui?.construction?.interfaces?.application_branch_sources);
}

function serviceInvocation(application, sceneId, entryHandle, facilities = state.project?.facilities) {
  const invocation = {sceneId, argument: application.instance, entryHandle};
  if (entryHandle || ![0x36, 0x37, 0x38].includes(application.command)) return invocation;
  const instances = facilities?.facilities
    ?.find(row => row.id === 'computer-controller')?.instances || [];
  const candidates = instances.filter(row => row.command_id === application.command
    && (sceneId == null || row.scene_id === sceneId));
  const entry = candidates.find(row => row.instance_id === application.instance)
    || (sceneId == null ? candidates[0] : null);
  if (!entry) return invocation;
  return {...invocation, sceneId: entry.scene_id, argument: entry.instance_id,
    entryHandle: `scene:${entry.scene_id.toString(16).toUpperCase().padStart(2, '0')}:investigation:${entry.point_id.toString(16).toUpperCase().padStart(2, '0')}`};
}

function sceneServicePreviewEntries(applications, sceneId, entryHandle = null) {
  const catalog = state.project?.ui?.construction?.interfaces;
  return (applications || []).flatMap(application => {
    const command = `application-command:${Number(application.command).toString(16).toUpperCase().padStart(2, '0')}`;
    const invocation = serviceInvocation(application, sceneId, entryHandle);
    return (catalog?.application_branch_sources || []).filter(branch => branch.command === command
      && branch.disposition?.status !== 'unreachable' && isTerminalDisplayBranch(branch))
      .flatMap(branch => (branch.bodies.length ? branch.bodies : [null]).flatMap(body => {
        const confirmed = serviceStatePreviews(branch, body, invocation);
        return confirmed.length ? confirmed.map(preview => ({
          fragmentId: body?.id || branch.id,
          record: body?.record || null, label: preview.visible_state || preview.id, preview,
        })) : [{fragmentId: body?.id || branch.id, record: body?.record || null, label: body?.id || branch.id,
          preview: serviceBodyPreview(branch, body, invocation)}];
      }));
  });
}

function resolveServicePreview(preview, screen, definition, selection = null) {
  const context = interfacePreviewContext();
  if (['constructor:noah-password-terminal', 'constructor:noah-password-terminal-result'].includes(preview?.id)) {
    const instances = state.project?.facilities?.facilities?.find(row => row.id === 'computer-controller')?.instances || [];
    const entry = instances.find(row => row.command_id === 0x37 && row.scene_id === context.scene?.sceneId
      && row.instance_id === context.service?.argument);
    const entryHandle = entry ? `scene:${entry.scene_id.toString(16).toUpperCase().padStart(2, '0')}:investigation:${entry.point_id.toString(16).toUpperCase().padStart(2, '0')}`
      : 'scene:CD:investigation:63';
    const resolved = controllerServicePreview(state.project.ui.construction.menu_dispatch_data.previews,
      `application-dialogue-flow:37:segment:${preview.id.endsWith('-result') ? '05' : '00'}`, {entryHandle});
    if (resolved) preview = {...resolved, interface_state_id: preview.interface_state_id,
      interface_state_ids: preview.interface_state_ids};
  }
  if (preview && context.service && definition?.commandIds?.includes(context.service.command)) {
    preview = {...preview, facility_call_context: {...preview.facility_call_context,
      ...(context.scene ? {sceneId: context.scene.sceneId} : {}), argument: context.service.argument},
      runtime_context: {...preview.runtime_context, shop_instance: context.service.argument,
        facility_instance: context.service.argument}};
  }
  if (!definition?.commandIds?.length || preview && !preview.structural) return preview;
  const catalog = state.project?.ui?.construction?.interfaces;
  const interfaceState = (catalog?.interfaces || []).flatMap(owner => owner.states || [])
    .find(candidate => candidate.id === screen?.interface_state_id);
  const records = (interfaceState?.evidence?.records || []).map(record => record.id);
  const selected = selection?.record_id;
  const requested = selected && records.includes(selected) ? [selected] : records;
  const commands = new Set(definition.commandIds.map(id =>
    `application-command:${id.toString(16).toUpperCase().padStart(2, "0")}`));
  for (const record of requested) {
    for (const branch of catalog?.application_branch_sources || []) {
      if (!commands.has(branch.command)) continue;
      const body = branch.bodies.find(candidate => candidate.record === record);
      if (!body) continue;
      const invocation = {...preview?.facility_call_context,
        ...(context.scene ? {sceneId: context.scene.sceneId} : {}),
        ...(context.service && definition.commandIds.includes(context.service.command)
          ? {argument: context.service.argument} : {})};
      const confirmed = serviceStatePreviews(branch, body, invocation);
      const resolved = confirmed.find(candidate => candidate.interface_state_id === screen?.interface_state_id)
        || confirmed[0];
      if (resolved) return resolved;
      return {...serviceBodyPreview(branch, body, invocation,
        preview?.facility_window_context), id: screen.id,
        viewport: {x: 0, y: 0, width: 256, height: 240},
      };
    }
  }
  return preview;
}

// @editor-module 服务实例的场景位置来自当前交互调用点。

let callers = [];
let repository = null;

async function prepareServicePreviewSceneBindings() {
  const currentRepository = state.projectRepository;
  const [scenes, actors, logicIndex, facilities, story, sources, working] = await Promise.all([
    db.getDocument('project.scenes'), db.getAll('scene-actor', []),
    db.getDocument('project.scenes.logic'), db.getDocument('project.facilities'),
    db.getDocument('project.story'), db.getDocument('project.scenes.interaction-sources'),
    db.listWorkingAssets(),
  ]);
  const dirty = new Set(working.filter(row => row.dirty).map(row => row.resource_id));
  const documents = await Promise.all(sources.records.map(async ({scene, logic}) => ({scene,
    logic: dirty.has(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}`)
      ? (await db.getResourceDocument(`scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}`)).logic : logic})));
  const elevators = await loadSceneElevators(db, scenes.editable_scenes);
  const changedInteractionScripts = new Set(working.filter(row => row.resource_id === 'story-interaction-script')
    .flatMap(row => row.fields.filter(field => field.hasOverride)
      .map(field => Number.parseInt(field.entityHandle.split(':').at(-1), 16))));
  const context = {scenes, logicIndex, facilities, story, changedInteractionScripts,
    actorsByUid: new Map(actors.map(row => [row.uid, row]))};
  const result = await db.reusePreviewProjection('service-preview-scene-bindings',
    [scenes, actors, logicIndex, facilities, story, sources, ...documents.map(row => row.logic),
      JSON.stringify([...changedInteractionScripts])], () => documents.flatMap(({scene, logic}) =>
      enumerateSceneInteractionObjects(scene, logic, actors, [], context)
        .filter(object => ['actor', 'investigation', 'elevator'].includes(object.kind) || object.record.interaction_binding)
        .flatMap(object => {
          const {x, y} = object.record;
          if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 255)) return [];
          return sceneInteractionDestinations(object, {...context, sceneLogic: logic}).applications.map(application => ({
            ...application, entryHandle: object.kind === 'investigation'
              ? `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}:investigation:${Number(object.record.id).toString(16).toUpperCase().padStart(2, '0')}`
              : object.uid,
            scene: {sceneId: Number(scene.id), x, y},
          }));
        })));
  if (state.projectRepository !== currentRepository) return;
  callers = [...result, ...elevators.map(({scene, elevator, selection}) => ({command: 0x1F,
    instance: elevator.instance_id, entryHandle: `scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, '0')}:${selection}`,
    scene: {sceneId: Number(scene.id), x: elevator.x, y: elevator.y}}))];
  repository = currentRepository;
}

function bindServicePreviewScene(command, argument = 0) {
  const context = interfacePreviewContext();
  const service = context.service;
  const invocation = serviceInvocation({command, instance: argument},
    service?.locationKey === `${command}:${argument}` ? service.routeScene?.sceneId : null,
    service?.locationKey === `${command}:${argument}` ? service.entryHandle : null);
  argument = invocation.argument;
  const matching = repository === state.projectRepository
    ? callers.filter(row => row.command === command && row.instance === argument) : [];
  const locationKey = `${command}:${argument}`;
  const previous = service?.locationKey === locationKey ? service : null;
  const entry = matching.find(row => row.entryHandle === previous?.entryHandle)
    || matching.find(row => row.scene.sceneId === previous?.scene?.sceneId
      && row.scene.x === previous.scene.x && row.scene.y === previous.scene.y) || matching[0];
  const scene = entry?.scene || previous?.routeScene || null;
  context.service = {command, argument, entryHandle: entry?.entryHandle || previous?.entryHandle || null,
    routeScene: previous?.routeScene || null, locationKey, scene};
  return selectInterfacePreviewBoundScene(scene);
}

var servicePreviewScene = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindServicePreviewScene: bindServicePreviewScene,
  prepareServicePreviewSceneBindings: prepareServicePreviewSceneBindings
});

// @editor-module 隐藏目的地、大门与存档事件位的往返链接。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const link = (href, label) => `<a class="editor-inline-link" href="${esc(href)}">${esc(label)} ↗</a>`;

function hiddenTeleportConditionsMarkup(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  return `仅错误传送可达 · ${hidden.trigger_flags.map(flag => `${eventFlagReferenceMarkup(flag.id)} = ${flag.value}`).join(' 且 ')}
    <p>触发后 ${eventFlagReferenceMarkup(hidden.set_flag)} = 1；
    ${link(controllerSceneHref(hidden.gate.scene_id, project, {point: [hidden.gate.cells[0].x,
      hidden.gate.cells[0].y]}), '下方大门开放')}</p>`;
}

function hiddenTeleportSceneMarkup(sceneId, selection, project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  if (Number(sceneId) !== hidden.scene_id) return '';
  return `<div data-hidden-teleport-source><p>${link('?view=teleport&facilityTab=config#hidden-teleport',
    '来源：时空隧道错误传送')}</p>
    ${hiddenTeleportConditionsMarkup(project)}
    <p>${link(controllerSceneHref(hidden.scene_id, project), `隐藏目的地 scene:${hex(hidden.scene_id)}`)}</p></div>`;
}

async function bindHiddenTeleportControls(root = document) {
  for (const host of root.querySelectorAll('[data-hidden-teleport-fields]')) {
    const object = (await db.getFieldObjects(HIDDEN_TELEPORT_RESOURCE_ID))[0];
    if (host.isConnected) await object.mount(host, {compactIdentity: true, stacked: true});
  }
}

// @editor-module 调查交互目录
//
// 来源：拆分前 engine/editor/app.js 第 8929-9049 行。


function investigationStatusLabel(status) {
  return ({
    "confirmed-purpose": "用途已确认",
    "purpose-inferred": "用途推定",
    "investigation-associated": "已确认属于调查 · 用途待定",
    "investigation-associated-unused": "调查入口保留 · 当前未布点",
  })[status] || status || "用途待定";
}

function renderInvestigation(sceneObjects = []) {
  const directory = state.project.facilities?.investigation;
  if (!directory) return ``;
  const audit = state.project.scenes?.logic || {};
  const treasures = sceneObjects.filter(
    record => record.scene_object_kind === "treasure",
  );
  const specialPoints = sceneObjects.filter(
    record => record.scene_object_kind === "investigation-special",
  );
  const behaviors = audit.investigation_tile_behavior_catalog || [];
  const metatilePoints = sceneObjects.filter(
    record => record.scene_object_kind === "investigation-tile",
  );
  const sceneNames = new Map((state.project.scenes?.editable_scenes || []).map(scene => [Number(scene.id), scene.name]));
  const itemNames = new Map((state.project.game_data?.items?.records || []).map(item => [Number(item.id), item.name]));
  const query = state.query.trim().toLowerCase();
  const matching = items => items.filter(item => !query || JSON.stringify(item).toLowerCase().includes(query));
  const commands = directory.commands || [];
  const commandRows = commands.map(command => {
    const configuration = command.configuration_family || {};
    const resourceUid = `investigation-command:${Number(command.command_id).toString(16).toUpperCase().padStart(2, "0")}`;
    const params = (command.parameter_values_hex || []).join(" / ") || "—";
    const contextTexts = (command.context_text_records || []).map(record =>
      currentTextReferenceLink(record)
    ).join("");
    const configDetail = configuration.family_id_hex
      ? `<span title="${esc(configuration.label || "")}"
        >组 ${esc(configuration.family_id_hex)}</span>`
      : command.facility_id === "frog-race"
        ? `<span title="已在青蛙赛跑页面恢复">专用下注价格表</span>`
        : "—";
    return `<tr>
      <td>${handleMarkup(resourceUid)}</td>
      <td class="mono">${esc(command.selector_hex)}</td>
      <td class="mono">${esc(command.command_id_hex)}</td>
      <td class="mono right" title="命令号 − $10">${hex$a(Number(command.command_id) - 0x10, 2)}</td>
      <td><button class="resource-inline-link" type="button" data-resource-target="${resourceUid}">${esc(command.label)}</button></td>
      <td>${contextTexts || "—"}</td>
      <td class="right">${Number(command.point_count)}</td>
      <td class="right">${Number(command.scene_count)}</td>
      <td class="mono">${esc(params)}</td>
      <td class="mono">${(command.shared_script_command_ids_hex || []).length > 1 ? (command.shared_script_command_ids_hex || []).map(esc).join(" / ") : "—"}</td>
      <td>${configDetail}</td>
    </tr>`;
  }).join("");
  const inferredConfiguration = commands.find(command => Number(command.command_id) === 0x1D)?.configuration_family;
  const configurationRows = (inferredConfiguration?.records || []).map(record => `<tr id="investigation-command-1D-config-${Number(record.id).toString(16).toUpperCase().padStart(2, "0")}">
    <td>${handleMarkup(`investigation-command:1D:config:${Number(record.id).toString(16).toUpperCase().padStart(2, "0")}`)}</td>
    <td class="mono">${esc(record.bytes_hex)}</td>
  </tr>`).join("");
  const specialRows = matching(specialPoints).map(point => `<tr>
    <td class="mono">${handleMarkup(point.scene_object_uid)}</td>
    <td>${esc(point.label)}</td>
    <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(point.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(point.scene_id)) || `场景 ${point.scene_id_hex}`)}</button></td>
    <td class="mono right">(${point.x}, ${point.y})</td>
    <td class="wrap">${esc(point.description)}</td>
    <td>${esc(point.interaction_state?.label)}</td>
    <td class="wrap">${esc((point.interaction_state?.effects || []).join(" / "))}</td>
    <td>${(point.text_records || []).map(currentTextReferenceLink).join("") || "—"}</td>
  </tr>`).join("");
  const behaviorRows = behaviors.map(behavior => `<tr>
    <td class="mono">${esc(behavior.behavior_code_hex)}</td>
    <td class="mono right">${esc(behavior.dispatch_index_hex)}</td>
    <td>${esc(behavior.label)}</td>
    <td>${esc(behavior.kind)}</td>
    <td class="wrap">${esc(String(behavior.description || "")
      .replace("调用 $D350/$BFF9", "调用已定位例程"))}</td>
    <td class="right">${behavior.physical_point_count}</td>
    <td>${(behavior.text_records || []).map(currentTextReferenceLink).join("") || "—"}</td>
  </tr>`).join("");
  const treasureRows = matching(treasures).map(treasure => {
    const content = treasure.content_kind === "item"
      ? `${treasure.content_id_hex} · ${itemNames.get(Number(treasure.item_id)) || "道具"}`
      : treasure.content_kind === "buried-vehicle"
        ? `${treasure.content_id_hex} · ${treasure.content_label}`
        : `${treasure.content_id_hex} · ${treasure.money_base_value || 0} G`;
    return `<tr>
      <td class="mono">${handleMarkup(treasure.scene_object_uid)}</td>
      <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(treasure.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(treasure.scene_id)) || `场景 ${treasure.scene_id_hex}`)}</button></td>
      <td class="mono right">(${treasure.x}, ${treasure.y})</td>
      <td>${esc(content)}</td>
      <td>${esc(treasure.interaction_state?.label)}</td>
      <td class="mono">${esc(treasure.interaction_state?.flag_id_hex)}</td>
      <td class="mono">${esc(treasure.interaction_state?.runtime_byte_hex)} bit ${esc(treasure.interaction_state?.bit_index)}</td>
      <td>${esc(treasure.interaction_state?.commit)}</td>
    </tr>`;
  }).join("");
  const metatileRows = matching(metatilePoints).map(point => `<tr>
    <td class="mono">${handleMarkup(point.scene_object_uid)}</td>
    <td><button class="resource-inline-link" type="button" data-resource-target="scene:${Number(point.scene_id).toString(16).toUpperCase().padStart(2, "0")}">${esc(sceneNames.get(Number(point.scene_id)) || `场景 ${point.scene_id_hex}`)}</button></td>
    <td class="mono right">(${point.x}, ${point.y})</td>
    <td class="mono">${esc(point.metatile_id_hex)}</td>
    <td class="mono">${esc(point.behavior_code_hex)}</td>
    <td>${esc(point.label)}</td>
    <td>${esc(point.kind)}</td>
    <td class="wrap">${esc(point.description)}</td>
    <td>${esc(point.interaction_state?.label)}</td>
    <td class="wrap">${esc((point.interaction_state?.effects || []).join(" / "))}</td>
  </tr>`).join("");
  return `
    <div class="section-line"><h2>六个特殊调查点</h2><span>${specialPoints.length} / 6</span></div>
    <div class="table-wrap"><table><thead><tr><th>句柄</th><th>名称</th><th>场景</th><th>坐标</th><th>作用</th><th>全局状态</th><th>状态效果</th><th>文本</th></tr></thead><tbody>${specialRows}</tbody></table></div>
    <div class="section-line"><h2>地图图块调查行为</h2><span>${behaviors.length} 种类型 · ${metatilePoints.length} 个地图格</span></div>
    <div class="table-wrap"><table><thead><tr><th>行为码</th><th>分派索引</th><th>类型</th><th>分类</th><th>处理语义</th><th>物理格</th><th>文本</th></tr></thead><tbody>${behaviorRows}</tbody></table></div>
    <div class="section-line"><h2>调查处理目录</h2><span>选择码 → 调查处理 → 应用脚本</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>句柄</th><th>选择码</th><th>命令</th><th>索引</th><th>名称</th><th>语义文本</th><th>点数</th><th>场景数</th><th>参数</th><th>共用命令</th><th>相关配置</th></tr></thead>
      <tbody>${commandRows}</tbody>
    </table></div>
    <div class="section-line"><h2>调查命令配置</h2></div>
    <div class="table-wrap"><table>
      <thead><tr><th>句柄</th><th>当前 ROM 字节</th></tr></thead>
      <tbody>${configurationRows}</tbody>
    </table></div>
    <details class="ui-extraction-details"><summary>全部调查物 / 宝箱 · ${matching(treasures).length} / ${treasures.length}</summary><div class="table-wrap"><table><thead><tr><th>句柄</th><th>场景</th><th>坐标</th><th>内容</th><th>状态</th><th>标志位</th><th>运行字节</th><th>提交时机</th></tr></thead><tbody>${treasureRows}</tbody></table></div></details>
    <details class="ui-extraction-details"><summary>全部地图图块调查格 · ${matching(metatilePoints).length} / ${metatilePoints.length}</summary><div class="table-wrap"><table><thead><tr><th>句柄</th><th>场景</th><th>坐标</th><th>metatile</th><th>行为码</th><th>类型</th><th>分类</th><th>处理语义</th><th>状态</th><th>状态效果</th></tr></thead><tbody>${metatileRows}</tbody></table></div></details>`;
}

var investigation = /*#__PURE__*/Object.freeze({
  __proto__: null,
  investigationStatusLabel: investigationStatusLabel,
  renderInvestigation: renderInvestigation
});

// @editor-module 字节解释、别名与搜索索引








//
// 来源：拆分前 engine/editor/app.js 第 3597-4078 行。






function romMapDecodedValue(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  if (annotation.decodedLabel != null) return String(annotation.decodedLabel);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const encoding = annotation.field.encoding || "";
  if (annotation.field.encoding?.includes("little-endian")) {
    const result = raw.reduce((total, item, index) => total | (item << (index * 8)), 0);
    return `${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(result, raw.length * 2)}`;
  }
  if (annotation.status === "partial") return `palette ${state.romMapBytes[offset] & 3}`;
  if (encoding === "u8") return String(raw[0]);
  if (encoding.includes("page ID")) return romMapHex(raw[0], 2);
  if (encoding.includes("even 2 KiB")) return `${romMapHex(raw[0], 2)} / ${romMapHex((raw[0] + 1) & 0xFF, 2)}`;
  if (raw.length > 1) return raw.map(item => romMapHex(item, 2).slice(1)).join(" ");
  return romMapHex(raw[0], 2);
}

function romMapCodeValueMeaning(annotation, offset) {
  const instruction = annotation?.codeInstruction;
  const value = state.romMapBytes[offset];
  if (!instruction) return `机器码 ${romMapHex(value, 2)}`;
  const byteIndex = offset - instruction.start;
  if (byteIndex === 0) return `${instruction.assembly} · opcode ${romMapHex(value, 2)}`;
  const operands = Math.max(1, instruction.size - 1);
  return `${instruction.assembly} · 操作数 ${byteIndex}/${operands} ${romMapHex(value, 2)}`;
}

function romMapClassifiedValueMeaning(annotation, offset) {
  const value = state.romMapBytes[offset];
  const position = offset - annotation.rangeStart;
  return `${annotation.classificationLabel || annotation.field.meaning} 字节 ${romMapHex(value, 2)} · 区块 +${romMapHex(position, Math.max(2, Math.ceil(Math.log2(Math.max(2, annotation.rangeLength)) / 4))).slice(1)}`;
}

function romMapByteExplanation(annotation, offset) {
  if (!annotation) return {current: "", consequence: "", edit: ""};
  if (annotation.category === "code") {
    const instruction = annotation.codeInstruction;
    const byteIndex = instruction ? offset - instruction.start : 0;
    const role = instruction
      ? (byteIndex === 0 ? "opcode" : `操作数第 ${byteIndex}/${Math.max(1, instruction.size - 1)} 字节`)
      : "尚未归属的机器码字节";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: instruction
        ? `本行是 ${instruction.assembly} 的 ${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`
        : `本行是${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: "此字节计入“功能代码”覆盖；目前只读，尚未提供汇编级改写和重定位。",
    };
  }
  if (annotation.classificationKind) {
    const position = offset - annotation.rangeStart;
    const provisional = annotation.status === "provisional";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: `本行是区块内第 ${position + 1}/${annotation.rangeLength} 个字节，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: provisional
        ? "该范围只是后续分析候选，不计入已确认覆盖，不应据此直接修改。"
        : "当前已确认区块类型和边界，但未细化到本字节的具体字段；应优先在对应的类型化编辑器中修改。",
    };
  }
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const value = state.romMapBytes[offset];
  const index = offset - annotation.rangeStart;
  const decoded = raw.reduce((total, item, byteIndex) => total + item * (2 ** (byteIndex * 8)), 0);
  const block = annotation.block || {};
  const byteRole = annotation.rangeLength > 1
    ? (annotation.field.encoding?.includes("little-endian")
      ? `本行是${index === 0 ? "低位" : (index === annotation.rangeLength - 1 ? "高位" : `第 ${index + 1}`)}字节。`
      : `本行是该字段第 ${index + 1}/${annotation.rangeLength} 个字节。`)
    : "";
  let current = `${annotation.record} 的“${annotation.field.meaning}”当前字节为 ${romMapHex(value, 2)}。${byteRole}`;
  if (annotation.algorithmDetail) current = `${annotation.algorithmDetail}${byteRole ? ` ${byteRole}` : ""}`;

  if (block.id === "scene-header-records") {
    switch (annotation.field.meaning) {
      case "逻辑地图宽度":
        current = `${annotation.record} 的地图宽度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "逻辑地图高度":
        current = `${annotation.record} 的地图高度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "地图压缩流指针": {
        const target = decoded < 0xC000
          ? `PRG region ${romMapHex(decoded)}（ROM file ${romMapHex(decoded + 0x10)}）`
          : `CHR region ${romMapHex(0x02F000 + decoded)}`;
        current = `${annotation.record} 的地图流指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标是 ${target}；${byteRole}`;
        break;
      }
      case "Metatile $00-$3F 定义/属性页":
      case "Metatile $40-$7F 定义/属性页":
        current = `${annotation.record} 当前使用 page ${romMapHex(value, 2)}：定义位于 PRG region ${romMapHex(0x035000 + value * 0x100)}，属性位于 ${romMapHex(0x038700 + value * 0x40)}。`;
        break;
      case "点传送与边界传送记录指针":
        current = `${annotation.record} 的传送记录指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标 PRG region ${romMapHex(0x01E000 + decoded - 0x8000)}（ROM file ${romMapHex(0x01E010 + decoded - 0x8000)}）；${byteRole}`;
        break;
      case "场景背景 palette 源指针":
        current = `${annotation.record} 的 palette 指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，9 字节 palette 源位于 PRG region ${romMapHex(0x014000 + decoded)}（ROM file ${romMapHex(0x014010 + decoded)}）；${byteRole}`;
        break;
      case "地图对象 sprite CHR bank pair":
        current = `${annotation.record} 的地图对象使用 CHR bank ${romMapHex(value, 2)}/${romMapHex((value + 1) & 0xFF, 2)}，对应 CHR region ${romMapHex(value * 0x400)} 和 ${romMapHex(((value + 1) & 0xFF) * 0x400)}。`;
        break;
      case "场景背景 MMC3 register 2-5 bank":
        current = `${annotation.record} 的 MMC3 R${index + 2} 使用 1 KiB CHR bank ${romMapHex(value, 2)}，对应 CHR region ${romMapHex(value * 0x400)}-${romMapHex(value * 0x400 + 0x3FF)}。`;
        break;
    }
  } else if (block.id === "world-metatile-definitions") {
    current = `${annotation.record} 的${annotation.field.meaning}当前引用 PPU 图块 ${romMapHex(value, 2)}；修改这一字节会替换该地图图块对应象限的 8×8 图块。`;
  } else if (block.id === "world-metatile-attributes") {
    current = `${annotation.record} 的属性原值为 ${romMapHex(value, 2)}：已确认 bit 0-1 = ${value & 3}（palette ${value & 3}）；bit 2-7 尚未解释，修改时必须原样保留。`;
  }

  const edit = block.web_editable
    ? "网页已有对应的编辑控件，构建 ROM 时会写入该字节。"
    : (annotation.writebackPath
      ? `网页尚未开放此字段；构建 ROM 时由 ${annotation.writebackPath} 在原长度内回写。`
      : (block.roundtrip
        ? "网页尚未开放此字段；该固定范围已纳入无损回包，但当前仍需通过源数据修改。"
        : "目前只用于定位和说明，尚未建立自动回写路径。"));
  return {current, consequence: annotation.field.detail || "", edit};
}

function romMapAddressMeaning(annotation) {
  if (!annotation) return "";
  return annotation.addressMeaning || `${annotation.record} · ${annotation.field.meaning}`;
}

function romMapValueMeaning(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const numeric = raw.reduce((total, item, index) => total + item * (2 ** (index * 8)), 0);
  if (typeof annotation.valueFormatter === "function") {
    return String(annotation.valueFormatter(numeric, raw, offset));
  }
  if (annotation.valueDescription != null) return String(annotation.valueDescription);
  return romMapDecodedValue(annotation, offset);
}

// @editor-module PRG 地址空间的字节地图页
//
// 来源：拆分前 views/rommap/view.js 的 PRG 部分（更早是 app.js 4079-4736 行）。
// PRG 与 CHR 曾共用一页、靠 romMapRegion 标签切换；现在每个地址空间各有自己的
// 导航入口与模块，标签切换连同 renderRomMap() 分发一起消失。


let romPrgByteMap = null;
let codeFieldSelection = 0;

async function showSelectedCodeFieldObject() {
  const selection = ++codeFieldSelection;
  const offset = Number(state.romMapSelectedOffset || 0);
  const owner = state.romMapFieldObjects?.byByte?.[offset - romWindowOffset()];
  const answer = document.querySelector("#rom-prg-byte-map-explorer .byte-owner-answer");
  if (!answer || !owner?.role || !hasFieldOwner(owner.resourceId)
      || typeof fieldOwner(owner.resourceId).loadObjects !== "function") return;
  try {
    const objects = await fieldOwner(owner.resourceId).loadObjects();
    if (selection !== codeFieldSelection) return;
    const object = objects.find(item => offset >= item.physical.offset
      && offset < item.physical.endExclusive) || objects[0];
    if (object) object.mount(answer);
    if (object && typeof fieldOwner(owner.resourceId).describe === "function") {
      const fields = await db.getField(owner.resourceId);
      if (selection !== codeFieldSelection) return;
      const summary = document.createElement("div");
      summary.className = "code-segment-data-fields";
      summary.textContent = `${owner.resourceId} · 数据字段 ${fields.length} 项 · ${fields.slice(0, 3)
        .map(field => `${field.entityHandle}/${field.fieldName}`).join("、")}`;
      answer.append(summary);
    }
  } catch (error) {
    editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
    if (selection === codeFieldSelection) {
      const status = document.createElement("p");
      status.textContent = `代码字段对象读取失败：${error instanceof Error ? error.message : String(error)}`;
      answer.append(status);
    }
  }
}

const romWindowOffset = () => Number(state.romMapWindowOffset || 0);
const romTotalLength = () => Number(state.romMapTotalLength || state.romMapBytes?.length || 0);
const toPhysicalOffset = localOffset => romWindowOffset() + Number(localOffset);

function syncRomExplorerState(ui) {
  state.romMapSelectedOffset = toPhysicalOffset(ui.selectedOffset);
  state.romMapSearch = ui.search;
  state.romMapSemanticScope = ui.semanticScope;
  state.romMapValueSearch = ui.valueSearch;
  state.romMapValueCompare = ui.valueCompare;
  state.romMapValueWidth = ui.valueWidth;
  state.romMapValueScope = ui.valueScope;
  state.romMapTypeFilters = [...ui.typeFilters];
  state.romMapFilteredOffsets = ui.filteredOffsets;
  state.romMapFilterResult = ui.filterResult;
}

function syncRomExplorerUrl(ui) {
  syncRomExplorerState(ui);
  const url = new URL(location.href);
  if (ui.search.trim()) url.searchParams.set("romSearch", ui.search.trim());
  else url.searchParams.delete("romSearch");
  if (ui.semanticScope !== "all") url.searchParams.set("romSemantic", ui.semanticScope);
  else url.searchParams.delete("romSemantic");
  if (ui.valueSearch.trim()) url.searchParams.set("romValue", ui.valueSearch.trim());
  else url.searchParams.delete("romValue");
  if (ui.valueCompare !== "eq") url.searchParams.set("romCompare", ui.valueCompare);
  else url.searchParams.delete("romCompare");
  if (ui.valueWidth !== 1) url.searchParams.set("romWidth", String(ui.valueWidth));
  else url.searchParams.delete("romWidth");
  if (ui.valueScope !== "all") url.searchParams.set("romScope", ui.valueScope);
  else url.searchParams.delete("romScope");
  if (ui.typeFilters.length !== ROM_MAP_TYPE_OPTIONS.length) url.searchParams.set("romTypes", ui.typeFilters.join(","));
  else url.searchParams.delete("romTypes");
  replaceHistoryUrl(url);
}

function createRomPrgByteMap() {
  const base = romWindowOffset();
  const sourceUi = state.romMapExplorerUi || {
    search: state.romMapSearch,
    semanticScope: state.romMapSemanticScope,
    valueSearch: state.romMapValueSearch,
    valueCompare: state.romMapValueCompare,
    valueWidth: state.romMapValueWidth,
    valueScope: state.romMapValueScope,
    typeFilters: [...state.romMapTypeFilters],
  };
  const ui = {
    ...sourceUi,
    selectedOffset: Math.max(0, Math.min(
      state.romMapBytes.length - 1,
      Number(state.romMapSelectedOffset || 0) - base,
    )),
  };
  state.romMapExplorerUi = ui;
  ui.searchIndex = null;
  ui.filteredOffsets = null;
  ui.filterResult = null;
  ui.virtualFrame = null;
  ui.recordPagePromise = null;
  ui.pendingPageOffsets = null;
  ui.recordPageError = "";
  return createByteMapExplorer({
    id: "rom-prg-byte-map",
    space: "prg",
    label: state.romMapLoadedAll
      ? "PRG-ROM · 全部 Bank" : `PRG-ROM · Bank ${romMapHex(Math.floor(base / 0x2000), 2)}`,
    bytes: state.romMapBytes,
    annotations: state.romMapAnnotations,
    displayOffsetBase: base,
    totalLength: romTotalLength(),
    ui,
    typeOptions: ROM_MAP_TYPE_OPTIONS,
    addressHeaders: ["BANK", "BANK 内", "PRG", "ROM FILE", "CPU"],
    addressColumns(localOffset) {
      const offset = base + localOffset;
      const bank = Math.floor(offset / 0x2000);
      const local = offset & 0x1fff;
      const cpuAddress = state.romMapFieldObjects?.cpuAddressAt(offset);
      const cpu = cpuAddress == null ? "" : romMapHex(cpuAddress, 4);
      return [
        {value: romMapHex(bank, 2), className: "rom-byte-bank"},
        romMapHex(local, 4),
        romMapHex(offset),
        romMapHex(Number(state.project.manifest.rom.prg_file_offset) + offset),
        {value: cpu, className: cpu ? "" : "rom-byte-unmapped"},
      ];
    },
    parseGoto: parseRomMapGoto,
    formatGoto: localOffset => romMapHex(base + localOffset),
    async resolveGoto(offset, model) {
      if (offset >= base && offset < base + state.romMapBytes.length) {
        const previousPages = state.romMapPageLoadKey;
        syncRomExplorerState(model.ui);
        state.romMapSelectedOffset = offset;
        await loadRomMapPrg({offset});
        if (state.romMapPageLoadKey !== previousPages) {
          state.romMapExplorerUi = null;
          await render();
          return null;
        }
        return offset - base;
      }
      state.romMapSelectedOffset = offset;
      state.romMapExplorerUi = null;
      await loadRomMapPrg({offset});
      await render();
      return null;
    },
    async ensureOffsets(localOffsets) {
      if (state.romMapLoadedAll || state.romMapRecordPagesComplete) {
        return state.romMapAnnotations;
      }
      const pageOffsets = [...new Set(localOffsets.map(localOffset => {
        const globalOffset = base + Number(localOffset);
        return base + Math.floor((globalOffset - base) / 0x100) * 0x100;
      }))];
      await loadRomMapPrg({
        offset: state.romMapSelectedOffset,
        pageOffsets,
      });
      return state.romMapAnnotations;
    },
    ownerAddressLoaded(localOffset) {
      const offset = base + Number(localOffset);
      return (state.romMapLoadedRecordPageAddresses || []).some(address =>
        offset >= address.offset && offset < address.end_exclusive);
    },
    ownerAtOffset(offset) {
      const object = state.romMapFieldObjects?.byByte?.[offset - base];
      return object?.role ? {resourceId: object.resourceId, role: object.role} : null;
    },
    addressMeaning: romMapAddressMeaning,
    valueMeaning: (annotation, offset) => romMapValueMeaning(annotation, offset),
    explain: (annotation, offset) => romMapByteExplanation(annotation, offset),
    moduleLabel: annotation => romMapAnnotationModule(annotation).label,
    onUiChange: syncRomExplorerUrl,
    onSelect(localOffset, model) {
      syncRomExplorerState(model.ui);
      const offset = base + localOffset;
      state.romMapSelectedOffset = offset;
      const url = new URL(location.href);
      url.searchParams.set("romOffset", String(offset));
      url.searchParams.delete("romBank");
      replaceHistoryUrl(url);
      void showSelectedCodeFieldObject();
    },
  });
}





function parseRomMapGoto(value) {
  const textValue = String(value || "").trim().toUpperCase();
  if (!textValue) return null;
  const bankAddress = textValue.match(/^(?:B(?:ANK)?\s*)?\$?([0-9A-F]{1,2})\s*[:/]\s*\$?([0-9A-F]{1,4})$/);
  if (bankAddress) {
    const bank = Number.parseInt(bankAddress[1], 16);
    const offset = Number.parseInt(bankAddress[2], 16);
    const result = bank * 0x2000 + offset;
    return offset < 0x2000 && result < romTotalLength() ? result : null;
  }
  const fileAddress = textValue.match(/^F(?:ILE)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const prgAddress = textValue.match(/^P(?:RG)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  let parsed;
  if (fileAddress) {
    parsed = Number.parseInt(fileAddress[1], 16) - Number(state.project.manifest.rom.prg_file_offset);
  } else {
    const raw = prgAddress ? prgAddress[1] : textValue.replace(/^\$/, "").replace(/^0X/, "");
    if (!/^[0-9A-F]+$/.test(raw)) return null;
    parsed = Number.parseInt(raw, 16);
  }
  return Number.isFinite(parsed) && parsed >= 0 && parsed < romTotalLength() ? parsed : null;
}

function renderRomMapDataModuleSummary(entries, confirmedDataBytes) {
  return `<div class="rom-module-summary">
    <header><div><b>已确认数据 · 按功能模块归属</b></div><strong>${confirmedDataBytes.toLocaleString()} B</strong></header>
    <div class="rom-module-summary-grid">${entries.map(entry => {
      const body = `<b>${esc(entry.label)}</b><strong>${entry.total.toLocaleString()} B</strong><small>字段已解码 ${entry.fields.toLocaleString()} B · 结构已定位 ${entry.structures.toLocaleString()} B · ${romMapPercent(entry.total, confirmedDataBytes)}</small>`;
      return entry.view
        ? `<a href="?view=${entry.view}" title="打开${esc(entry.label)}模块">${body}</a>`
        : `<div>${body}</div>`;
    }).join("")}</div>
  </div>`;
}

async function renderRomMapPrg() {
  try {
    await loadRomMapPrg({
      offset: state.romMapSelectedOffset,
      all: state.romMapLoadedAll === true,
    });
  } catch (error) {
    return `<div class="empty"><b>PRG JSON bank 读取失败</b><span>${esc(error instanceof Error ? error.message : String(error))}</span><a class="button primary" href="?view=bytemap-prg&amp;romOffset=${Number(state.romMapSelectedOffset || 0)}">重试当前地址</a></div>`;
  }
  state.romMapBytes.length;
  const base = romWindowOffset();
  const bank = Math.floor(Number(state.romMapSelectedOffset || base) / 0x2000);
  const bankCount = Math.ceil(romTotalLength() / 0x2000);
  const exact = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "exact" ? 1 : 0), 0);
  const partial = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "partial" ? 1 : 0), 0);
  const config = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "config" ? 1 : 0), 0);
  const font = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "fontdata" ? 1 : 0), 0);
  const content = state.romMapAnnotations.reduce((sum, annotation) => sum + (
    annotation?.status === "classified" && ["script", "textdata", "contentdata"].includes(annotation.category) ? 1 : 0
  ), 0);
  const mixed = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "mixed" ? 1 : 0), 0);
  const mirror = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "mirror" ? 1 : 0), 0);
  const typed = config + font + content + mixed + mirror;
  const confirmedData = exact + partial + typed;
  const dataModules = romMapDataModuleSummary(state.romMapAnnotations);
  const roundtrip = romMapWritebackBytes(romTotalLength());
  const web = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.block?.web_editable ? 1 : 0), 0);
  romPrgByteMap = createRomPrgByteMap();
  const beforeTable = `<div class="data-editor-toolbar">
      <a class="button ghost" href="${fileUrl("analysis/byte-map/index.json")}" target="_blank" title="字节地图清单" aria-label="字节地图清单">↗</a>
      ${state.romMapLoadedAll ? `<button class="button" id="rom-prg-current-bank" type="button">只看当前 Bank ${romMapHex(bank, 2)}</button>` : `
        <button class="button ghost" data-rom-prg-bank="${bank - 1}" type="button" ${bank <= 0 ? "disabled" : ""}>← 上一 Bank</button>
        <button class="button ghost" data-rom-prg-bank="${bank + 1}" type="button" ${bank + 1 >= bankCount ? "disabled" : ""}>下一 Bank →</button>
        ${state.romMapRecordPagesComplete ? "" : `<button class="button ghost" id="rom-prg-bank-semantics" type="button">加载当前 Bank 全部语义页</button>`}
        <button class="button" id="rom-prg-global-search" type="button">加载全部 Bank · 全局搜索</button>`}
      <span class="spacer"></span><p>${state.romMapLoadedAll ? "全局" : `当前 Bank ${romMapHex(bank, 2)}`} · 语义页 ${Number(state.romMapRecordPagesLoaded || 0).toLocaleString()} / ${Number(state.romMapRecordPagesTotal || 0).toLocaleString()} · 解码 / 打包链路 ${roundtrip.toLocaleString()} B · 可网页修改 ${web.toLocaleString()} B</p>
    </div>${renderRomMapDataModuleSummary(dataModules, confirmedData)}`;
  const afterTable = ``;
  return `${renderByteMapExplorer(romPrgByteMap, {beforeTable, afterTable})}`;
}

function bindRomMapPrgViewer() {
  if (romPrgByteMap) bindByteMapExplorer(romPrgByteMap);
  void showSelectedCodeFieldObject();
  document.querySelectorAll("[data-rom-prg-bank]").forEach(button =>
    button.addEventListener("click", async () => {
      const bank = Number(button.dataset.romPrgBank);
      if (!Number.isInteger(bank) || bank < 0) return;
      syncRomExplorerState(romPrgByteMap.ui);
      state.romMapSelectedOffset = bank * 0x2000;
      state.romMapLoadedAll = false;
      state.romMapExplorerUi = null;
      await loadRomMapPrg({offset: state.romMapSelectedOffset});
      await render();
    })
  );
  document.querySelector("#rom-prg-global-search")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapExplorerUi = null;
    await loadRomMapPrg({offset: state.romMapSelectedOffset, all: true});
    await render();
  });
  document.querySelector("#rom-prg-bank-semantics")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapExplorerUi = null;
    await loadRomMapPrg({
      offset: state.romMapSelectedOffset,
      allPages: true,
    });
    await render();
  });
  document.querySelector("#rom-prg-current-bank")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapLoadedAll = false;
    state.romMapExplorerUi = null;
    await loadRomMapPrg({offset: state.romMapSelectedOffset});
    await render();
  });
}

var prg = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindRomMapPrgViewer: bindRomMapPrgViewer,
  parseRomMapGoto: parseRomMapGoto,
  renderRomMapPrg: renderRomMapPrg
});

// @editor-module CHR 地址空间的字节地图页
//
// 来源：拆分前 views/rommap/view.js 的 CHR 部分。CHR 按 NES 2BPP 图块网格浏览，
// 与 PRG 的逐字节表是两种完全不同的呈现，因此拆成各自的模块而不是同页切换。


const ROM_CHR_COLUMNS = 32;
const ROM_CHR_SCALE = 2;
const ROM_CHR_TILE_SIZE = 8 * ROM_CHR_SCALE;
const ROM_CHR_GUTTER = 36;

let romChrOwnerModel = null;

function selectedChrByteOffset() {
  const tileStart = Number(state.romMapChrTile || 0) * 16;
  const selected = Number(state.romMapChrSelectedOffset);
  return Number.isInteger(selected) && selected >= tileStart && selected < tileStart + 16
    ? selected : tileStart;
}

function createRomChrOwnerModel() {
  const ui = state.romMapChrOwnerUi || {};
  state.romMapChrOwnerUi = ui;
  ui.selectedOffset = selectedChrByteOffset();
  ui.ownerResourceId ??= "";
  ui.ownerLookupStatus ??= "idle";
  ui.ownerLookupRanges ??= [];
  ui.ownerLookupError ??= "";
  return {
    id: "rom-chr-byte-owner",
    space: "chr",
    displayOffsetBase: 0,
    ui,
    annotations: [],
    ownerAtOffset(offset) {
      const bank = Math.floor(offset / 0x400);
      return state.romMapChrFieldObjects?.byBank?.get(bank)?.byByte?.[offset % 0x400]?.owner || null;
    },
  };
}

// 少数 bank 的图块并不从 bank 首字节开始。当前 bank 网格需要一个 0-15 字节的
// 显示偏移；它只影响这一段怎么切图块，不改动任何字节。
function chrBankAlign(bank) {
  return Number(state.romMapChrBankAlign?.get(Number(bank)) || 0) & 0x0f;
}

function setChrBankAlign(bank, value) {
  if (!(state.romMapChrBankAlign instanceof Map)) state.romMapChrBankAlign = new Map();
  const align = Math.max(0, Math.min(15, Number(value) || 0));
  if (align) state.romMapChrBankAlign.set(Number(bank), align);
  else state.romMapChrBankAlign.delete(Number(bank));
}

function renderRomChrInspector() {
  const tile = state.romMapChrTile;
  const bank = Math.floor(tile / 64);
  const bankTile = tile % 64;
  const bankOffset = bankTile * 16;
  const region = tile * 16;
  const selectedOffset = selectedChrByteOffset();
  const file = Number(state.project.manifest.rom.chr_file_offset) + region;
  const raw = Array.from(state.romMapChrBytes.slice(region, region + 16));
  const bankReferences = state.romMapChrReferences?.byBank.get(bank) || [];
  const references = bankReferences
    .filter(reference => region < reference.end && region + 16 > reference.start);
  const semanticRanges = (state.romMapChrReferences?.semanticRanges || [])
    .filter(range => region < range.end && region + 16 > range.start);
  const grouped = new Map();
  for (const reference of references) {
    const key = `${reference.domain} · ${reference.kind}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }
  const visibleReferences = references.slice(0, 24);
  const referenceMarkup = references.length
    ? `<div class="rom-chr-reference-groups">${[...grouped].map(([label, count]) => `<span>${esc(label)} · ${count}</span>`).join("")}</div>
      <div class="rom-chr-reference-list">${visibleReferences.map(reference => `<span title="${esc(reference.uid)}"><b>${esc(reference.label)}</b><small>${esc(reference.uid)}</small></span>`).join("")}</div>
      `
    : ``;
  const rangeMarkup = semanticRanges.length
    ? `<div class="rom-chr-reference-list">${semanticRanges.map(range => `<span title="${esc(range.id)}"><b>${esc(range.label)}</b><small>${esc(range.kind)} · ${esc(range.status)} · C:${romMapHex(range.start)}-${romMapHex(range.end - 1)}</small></span>`).join("")}</div>`
    : ``;
  return `<div class="rom-chr-inspector-addresses">
      <span><small>CHR Bank</small><b>${romMapHex(bank, 2)}</b></span>
      <span><small>Bank 内图块</small><b>${romMapHex(bankTile, 2)}</b></span>
      <span><small>全局图块</small><b>${romMapHex(tile, 4)}</b></span>
      <span><small>Bank 内偏移</small><b>${romMapHex(bankOffset, 4)}</b></span>
      <span><small>图块起点</small><b>${romMapHex(region)}</b></span>
      <span><small>选中 CHR 字节</small><b>${romMapHex(selectedOffset)}</b></span>
      <span><small>ROM 文件地址</small><b>${romMapHex(file)}</b></span>
      <span><small>已知引用</small><b class="${references.length ? "referenced" : "unreferenced"}">${references.length ? `有 · ${references.length} 个来源` : "未发现"}</b></span>
    </div>
    <div class="rom-chr-raw"><small>16 字节 NES 2BPP</small><code>${raw.map(value => romMapHex(value, 2).slice(1)).join(" ")}</code></div>
    <div class="rom-chr-references"><small>CHR Bank / 资产物理范围</small>${rangeMarkup}</div>
    <div class="rom-chr-references"><small>当前物理范围的资源关联</small>${referenceMarkup}</div>
    ${renderByteMapOwnerPanel(romChrOwnerModel || createRomChrOwnerModel())}`;
}

function renderRomChrRegistrationGaps() {
  const directory = state.romMapChrBankDirectory || [];
  if (!directory.length) return "";
  const missing = directory.filter(entry => !entry.resources);

  const registered = directory.length - missing.length;

  const links = missing.map(entry =>
    `<a href="?view=bytemap-chr&amp;chrTile=${entry.offset / 16}" data-rom-chr-bank="${entry.bank}" title="CHR ${romMapHex(entry.offset)}-${romMapHex(entry.offset + entry.length - 1)}">${romMapHex(entry.bank, 2)}</a>`,
  ).join(" ");
  return `<div class="rom-chr-runtime-note"><b>已登记 bank ${registered} / ${directory.length}</b><span>${links}</span></div>`;
}

async function renderRomMapChr() {
  try {
    const bank = Math.floor(Number(state.romMapChrTile || 0) / 64);
    await loadRomMapChr({offset: Number(state.romMapChrTile || 0) * 16,
      banks: Array.from({length: 32}, (_, index) => Math.max(0, bank - 16) + index)});
  } catch (error) {
    return `<div class="empty"><b>CHR JSON bank 读取失败</b><span>${esc(error instanceof Error ? error.message : String(error))}</span><a class="button primary" href="?view=bytemap-chr&amp;chrTile=${Number(state.romMapChrTile || 0)}">重试当前图块</a></div>`;
  }
  const total = Number(state.romMapChrTotalLength || state.romMapChrBytes.length);
  state.romMapChrSelectedOffset = selectedChrByteOffset();
  romChrOwnerModel = createRomChrOwnerModel();
  const tileCount = Math.floor(total / 16);
  const currentBank = Number(state.romMapChrBank || 0);
  const totalBanks = Math.ceil(total / 0x400);
  const referenceCount = state.romMapChrReferences?.byBank.get(currentBank)?.length || 0;
  const rangeCount = state.romMapChrReferences?.summary.total_ranges || 0;
  return `    <div class="rom-memory-toolbar rom-chr-toolbar">
      <div class="rom-flat-range"><small>连续 CHR</small><b>${romMapHex(0)}-${romMapHex(total - 1)}</b><span>256 × 1 KiB · 16,384 个图块 · 按物理地址连续</span></div>
      <label class="rom-memory-goto">地址<input id="rom-chr-goto" value="T:${romMapHex(state.romMapChrTile, 4)}" placeholder="T:$1907 / C:$019070 / 64:07" spellcheck="false"><button class="button" id="rom-chr-goto-button" type="button" title="跳转" aria-label="跳转">↗</button></label>
      <label class="rom-chr-bank-jump">跳到 Bank<select id="rom-chr-bank-jump">${Array.from({length: totalBanks}, (_, bank) => `<option value="${bank}" ${bank === currentBank ? "selected" : ""}>${romMapHex(bank, 2)}</option>`).join("")}</select></label>
      <label>Bank 对齐<input id="rom-chr-align" title="Bank ${romMapHex(currentBank, 2)} 的图块起始偏移" type="number" min="0" max="15" step="1" value="${chrBankAlign(currentBank)}"><span>字节</span></label>
    </div>
    <div class="rom-memory-summary"><b>CHR-ROM · 全部 Bank 图块网格</b><span>${total.toLocaleString()} B · ${tileCount.toLocaleString()} 个图块 · 当前 Bank <em id="rom-chr-current-bank">${romMapHex(currentBank, 2)}</em></span><strong class="rom-chr-reference-rate">${rangeCount.toLocaleString()} 个 Bank / 资产范围 · 当前 <em id="rom-chr-current-references">${referenceCount.toLocaleString()}</em> 个资源关联</strong><i class="chr-referenced">■ 已登记</i><i class="chr-unreferenced">■ 未登记</i><i class="chr-font-range">■ 已登记字体范围</i></div>
    <div class="rom-chr-runtime-note"><a href="?view=bytemap-prg&amp;romOffset=292864">跳到 PRG 基础字模 →</a></div>
    ${renderRomChrRegistrationGaps()}
    <div class="rom-chr-layout">
      <div class="rom-chr-stage" id="rom-chr-stage"><canvas id="rom-chr-canvas" width="${ROM_CHR_GUTTER + ROM_CHR_COLUMNS * ROM_CHR_TILE_SIZE}" height="${Math.ceil(tileCount / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE}" aria-label="CHR 图块网格"></canvas></div>
      <aside class="rom-chr-inspector" id="rom-chr-inspector">${renderRomChrInspector()}</aside>
    </div>`;
}
function paintRomMapChrCanvas() {
  const canvas = $("#rom-chr-canvas");
  if (!canvas || !state.romMapChrBytes) return;
  const context = canvas.getContext("2d");
  context.fillStyle = '#070a0b';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const tileCount = Math.floor(state.romMapChrBytes.length / 16);
  const bankBytes = Number(state.romMapChrFieldObjects?.total || 0x400);
  const bankTiles = Math.floor(bankBytes / 16);
  const registeredBanks = new Set((state.romMapChrBankDirectory || [])
    .filter(entry => entry.resources).map(entry => entry.bank));
  const fontRanges = (state.romMapChrReferences?.semanticRanges || [])
    .filter(range => range.isFont);
  const surface = document.createElement('canvas');
  surface.width = ROM_CHR_COLUMNS * 8;
  surface.height = Math.ceil(tileCount / ROM_CHR_COLUMNS) * 8;
  const pixels = surface.getContext('2d').createImageData(surface.width, surface.height);
  const palette = [[7, 10, 11, 255], [83, 97, 102, 255],
    [167, 181, 183, 255], [238, 245, 242, 255]];
  context.font = "8px monospace";
  context.textBaseline = "top";
  for (let localTile = 0; localTile < tileCount; localTile += 1) {
    const originY = Math.floor(localTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
    const tileBank = Math.floor(localTile / bankTiles);
    if (localTile % bankTiles === 0) {
      context.fillStyle = registeredBanks.has(tileBank) ? "#d8f231" : "#77858a";
      context.fillText(romMapHex(tileBank, 2), 3, originY + 3);
    }
    const source = localTile * 16 + chrBankAlign(tileBank);
    const bankEnd = (tileBank + 1) * bankBytes;
    for (let y = 0; y < 8; y += 1) {
      const low = source + y < bankEnd ? state.romMapChrBytes[source + y] : 0;
      const high = source + y + 8 < bankEnd ? state.romMapChrBytes[source + y + 8] : 0;
      for (let x = 0; x < 8; x += 1) {
        const bit = 7 - x;
        const color = ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
        const pixelX = localTile % ROM_CHR_COLUMNS * 8 + x;
        const pixelY = Math.floor(localTile / ROM_CHR_COLUMNS) * 8 + y;
        pixels.data.set(palette[color], (pixelY * surface.width + pixelX) * 4);
      }
    }
  }
  surface.getContext('2d').putImageData(pixels, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(surface, ROM_CHR_GUTTER, 0,
    surface.width * ROM_CHR_SCALE, surface.height * ROM_CHR_SCALE);
  context.fillStyle = "#42d7e8";
  for (const range of fontRanges) {
    const firstTile = Math.max(0, Math.floor(range.start / 16));
    const lastTile = Math.min(tileCount - 1, Math.ceil(range.end / 16) - 1);
    for (let localTile = firstTile; localTile <= lastTile; localTile += 1) {
      const originX = ROM_CHR_GUTTER + (localTile % ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      const originY = Math.floor(localTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      context.fillRect(originX + 1, originY + 1, 3, 3);
    }
  }
  context.fillStyle = "#222a2d";
  for (let tile = bankTiles; tile < tileCount; tile += bankTiles) {
    const y = Math.floor(tile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
    context.fillRect(ROM_CHR_GUTTER - 5, y, canvas.width - ROM_CHR_GUTTER + 5, 1);
  }
  const selectedLocalTile = state.romMapChrTile;
  const selectedX = ROM_CHR_GUTTER + (selectedLocalTile % ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
  const selectedY = Math.floor(selectedLocalTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
  context.strokeStyle = "#f45151";
  context.lineWidth = 2;
  context.strokeRect(selectedX + 1, selectedY + 1, ROM_CHR_TILE_SIZE - 2, ROM_CHR_TILE_SIZE - 2);
}

async function selectRomMapChrTile(tile, scrollToTile = false, byteOffset = null) {
  const tileCount = Math.floor(Number(state.romMapChrTotalLength || 0) / 16);
  state.romMapChrTile = Math.max(0, Math.min(tileCount - 1, Number(tile) || 0));
  const tileStart = state.romMapChrTile * 16;
  const requestedOffset = Number(byteOffset);
  state.romMapChrSelectedOffset = Number.isInteger(requestedOffset)
      && requestedOffset >= tileStart && requestedOffset < tileStart + 16
    ? requestedOffset : tileStart;
  await loadRomMapChr({offset: state.romMapChrTile * 16, banks: [Math.floor(state.romMapChrTile / 64)]});
  const url = new URL(location.href);
  url.searchParams.set("chrTile", String(state.romMapChrTile));
  url.searchParams.delete("chrBank");
  replaceHistoryUrl(url);
  paintRomMapChrCanvas();
  const inspector = $("#rom-chr-inspector");
  if (romChrOwnerModel) romChrOwnerModel.ui.selectedOffset = selectedChrByteOffset();
  if (inspector) {
    inspector.innerHTML = renderRomChrInspector();
    if (romChrOwnerModel) bindByteMapOwnerPanel(romChrOwnerModel, inspector);
  }
  const align = $("#rom-chr-align");
  if (align) {
    align.value = String(chrBankAlign(state.romMapChrBank));
    align.title = `Bank ${romMapHex(state.romMapChrBank, 2)} 的图块起始偏移`;
  }
  const bankJump = $("#rom-chr-bank-jump");
  if (bankJump) bankJump.value = String(state.romMapChrBank);
  const currentBank = $("#rom-chr-current-bank");
  if (currentBank) currentBank.textContent = romMapHex(state.romMapChrBank, 2);
  const currentReferences = $("#rom-chr-current-references");
  if (currentReferences) currentReferences.textContent = String(
    state.romMapChrReferences?.byBank.get(state.romMapChrBank)?.length || 0);
  if (scrollToTile) {
    const stage = $("#rom-chr-stage");
    const canvas = $("#rom-chr-canvas");
    if (stage && canvas) {
      const canvasY = Math.floor(state.romMapChrTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      const displayScale = canvas.clientHeight / canvas.height;
      stage.scrollTop = Math.max(0, canvasY * displayScale - stage.clientHeight / 2);
    }
  }
}


function parseRomChrGotoTarget(value) {
  const textValue = String(value || "").trim().toUpperCase();
  const bankTile = textValue.match(/^(?:B(?:ANK)?\s*)?\$?([0-9A-F]{1,2})\s*[:/]\s*\$?([0-9A-F]{1,2})$/);
  if (bankTile) {
    const bank = Number.parseInt(bankTile[1], 16);
    const tile = Number.parseInt(bankTile[2], 16);
    const globalTile = bank * 64 + tile;
    return bank < 256 && tile < 64
      ? {tile: globalTile, offset: globalTile * 16} : null;
  }
  const chrAddress = textValue.match(/^C(?:HR)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const tileAddress = textValue.match(/^T(?:ILE)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  let tile;
  let offset;
  if (chrAddress) {
    offset = Number.parseInt(chrAddress[1], 16);
    tile = Math.floor(offset / 16);
  } else {
    tile = Number.parseInt(tileAddress ? tileAddress[1] : textValue.replace(/^\$/, "").replace(/^0X/, ""), 16);
    offset = tile * 16;
  }
  const tileCount = Math.floor(Number(state.romMapChrTotalLength || 0) / 16);
  return Number.isFinite(tile) && Number.isInteger(offset)
      && tile >= 0 && tile < tileCount && offset >= 0 && offset < tileCount * 16
    ? {tile, offset} : null;
}

function bindRomMapChrViewer() {
  const canvas = $("#rom-chr-canvas");
  void loadRomMapChr({background: true}).then(loaded => {
    if (loaded && canvas?.isConnected) void selectRomMapChrTile(state.romMapChrTile);
  }).catch(error => {
    if (canvas?.isConnected) showEditorError(canvas.parentElement, 'CHR bank', error);
  });
  $("#rom-chr-canvas")?.addEventListener("click", event => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    if (x < ROM_CHR_GUTTER) return;
    const localTile = Math.floor((x - ROM_CHR_GUTTER) / ROM_CHR_TILE_SIZE)
      + Math.floor(y / ROM_CHR_TILE_SIZE) * ROM_CHR_COLUMNS;
    if (localTile < Math.floor(state.romMapChrTotalLength / 16)) {
      void selectRomMapChrTile(localTile);
    }
  });
  const go = () => {
    const input = $("#rom-chr-goto");
    const target = parseRomChrGotoTarget(input?.value);
    if (!target) {
      input?.setCustomValidity("请输入 T:全局图块、C:CHR 字节地址，或 Bank:Bank 内图块（例如 64:07）");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    void selectRomMapChrTile(target.tile, true, target.offset);
    if (input) input.value = target.offset === target.tile * 16
      ? `T:${romMapHex(target.tile, 4)}` : `C:${romMapHex(target.offset)}`;
  };
  $("#rom-chr-goto-button")?.addEventListener("click", go);
  $("#rom-chr-goto")?.addEventListener("keydown", event => {
    if (event.key === "Enter") go();
  });
  $("#rom-chr-align")?.addEventListener("input", event => {
    setChrBankAlign(state.romMapChrBank, event.currentTarget.value);
    paintRomMapChrCanvas();
  });
  $("#rom-chr-bank-jump")?.addEventListener("change", event => {
    void selectRomMapChrTile(Number(event.currentTarget.value) * 64, true);
  });
  document.querySelectorAll("[data-rom-chr-bank]").forEach(button =>
    button.addEventListener("click", event => {
      event.preventDefault();
      const bank = Number(button.dataset.romChrBank);
      if (Number.isInteger(bank) && bank >= 0) void selectRomMapChrTile(bank * 64, true);
    })
  );
  void selectRomMapChrTile(state.romMapChrTile, true);
}

var chr = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindRomMapChrViewer: bindRomMapChrViewer,
  renderRomMapChr: renderRomMapChr
});

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









//
// 来源：拆分前 engine/editor/app.js 第 8250-8368 行。








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
        <td class="mono">${tableValueStack((item.metatile_pages || []).map(x => hex$a(x,2)))}</td>
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

// @editor-module 播放控件旁的预览声音开关。

function previewSoundControl() {
  return `<label><input type="checkbox" data-preview-sound ${
    previewSoundEnabled() ? "checked" : ""}> 声音</label>`;
}

function bindPreviewSound(root, onChange) {
  root?.querySelector("[data-preview-sound]")?.addEventListener("change", event => {
    const enabled = setPreviewSoundEnabled(event.target.checked);
    document.querySelectorAll("[data-preview-sound]").forEach(control => {
      control.checked = enabled;
    });
    onChange(enabled);
  });
}

export { ACTOR_MOTION_CHR_TILE_CODEC_ID, APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID, ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID, ATTACK_VISUAL_COMMANDS_CODEC_ID, AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID, AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID, BATTLE_ACTOR_SELECTOR_COMPONENT_ID, INVESTIGATION_HANDLER_SELECTOR_CODEC_ID, SCENE_HANDLE_REFERENCE_CODEC_ID, SHELL_VISUAL_REFERENCE_CODEC_ID, VISUAL_METASPRITES_RESOURCE_ID, actorInteractionMode, allSequenceExecutions, applicationDestination, applyOpcodeOperandEdits, battleFirstMonsterId, battleFlowForStoryState, battleModeForPendingEventFlag, battleRoleSelector, bindByteMapExplorer, bindEncounterZonePanel, bindHiddenTeleportControls, bindInternalPageLinks, bindOwnerReferenceList, bindPreviewSound, bindResourceQueries, bindScreenWorkbenchBottomResize, bindScreenWorkbenchPageHeader, bindScreenWorkbenchZoom, bindServicePreviewScene, bindWideTableWheelScrolling, byteMapHex, characterSlotShape, chr, conditionalEntranceCells, conditionalEntranceRecord, conditionalEntranceState, conditionalSceneRecord, configureSaveEditorCallbacks, consolidateSceneDestinationLinks, controlledObjectMarkup, controllerAt, controllerHref, controllerSceneHref, controllerTargetsMarkup, copyFieldDocumentView, createAudioTimelinePlayer, createByteMapExplorer, createNesApuSynth, currentOwnerReferenceImpact, currentViewUrl, draftEquipmentMask, empty, encounter, encounterBlockIndexAt, encounterCandidate, encounterFormationGroups, encounterZoneAt, ensureAudioCommandLabelsData, ensureAudioSequenceData, ensureBattleSceneData, ensureInterfacePreviewActor, ensureSequenceExecutions, ensureVehicleDraft, entityFacetFields, entityPeekPreviewInput, entityPreviewInput, entityPreviewInputs, filterByteMap, finishVehicleOriginalReset, hiddenTeleportConditionsMarkup, hiddenTeleportSceneMarkup, interfacePreviewContext, interfacePreviewWantedHistoryOverrides, investigation, investigationStatusLabel, isTerminalDisplayBranch, loadEncounterZones, loadEntityCatalog, loadModuleCatalog, metatileEditSession, moduleResourceDescriptors, navigateInternalUrl, navigateToResourceTarget, openRecord, overview, ownerReferenceListMarkup, paintEncounterBlock, paintPatternPixelPreview, partyBattleMetaspriteId, patternPixelEditor, prepareEventFlagReferences, prepareSaveEditorWorkspace, prepareStorySceneActions, prepareViewData, previewSoundControl, previewSoundEnabled, prg, pushCurrentHistory, recordViewHref, refreshSceneDraftDirty, registerBitSliceReferenceCodec, registerContextAwareReferenceCodec, registerEncodedScalarReferenceCodec, registerLinkedFieldReferenceCodec, registerOpcodeOperandCodec, rememberCurrentHistoryEntry, render, renderByteMapExplorer, renderEncounterZonePanel, renderEncounterZoneSidebar, renderSceneDestinationLinks, renderSceneResources, replaceHistoryUrl, resolveServicePreview, resourceNav, saveFields, saveVehicleView, sceneActorStateObjects, sceneBgmItemsForProject, sceneConfigurationStays, sceneControllerMarkup, sceneEncounterPreview, sceneEntryMusicCommand, sceneEntryStoryItemsForProject, sceneInteractionDestinations, sceneInvestigationLayerCount, sceneOwnedInteractionConfigurations, sceneResourceUid, sceneServicePreviewEntries, sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins, screenWorkbench, screenWorkbenchCanvasStage, selectByteMapOffset, selectInterfacePreviewBoundScene, selectInterfacePreviewContext, serviceInvocation, shopConfigurationForActor, storySceneActionPresentation, storySceneActions, storySceneDialogueReferences, uiEditorNodeMap, uiScreenTemplateBinding, uiTemplateBinding, uiTemplateBindings, vehicleAssignedSlot, vehicleDraftFromDocument, vehicleEquippedMask, vehicleMountableSlots, vehiclePresetDraft, vehicleSlotShape, vehicleTableDirty, vehicleViewDirty, vehicleViewDraft, vehicleViewSaveSnapshot, withCurrentOwnerRecord, worldTideScenes, worldTideTriggers, zonesByMonster };
