// @editor-module 初始化浏览器编辑器，准备导航数据并分发页面渲染与交互绑定。
// WORKSPACE_VIEWS 与 isWorkspacePage() 决定页面骨架，render() 在分派视图前准备正文。
import {focusResourceTarget, navigateToResourceTarget, resourceTargetRoute} from "./core/resource-nav.js";
import {bindGroupedReferenceSelect} from "./ui/reference-picker.js";
import {editorErrorMarkup, showEditorError, bindStoryPageRecovery} from "./ui/editor-error.js";
import {$, esc} from "./core/dom.js";
import {flushCanvasViewportLayouts} from "./ui/canvas-viewport.js";
import {sceneDestinationUsersMarkup, bindSceneDestinationUsers} from "./ui/scene-interaction-links.js";
import {bindControlledObjectUsers} from "./ui/controller-switch-links.js";
import {packageJson, readonlyPackageJson} from "./core/package-io.js";
import {siteUrl} from "./core/site-url.js";
import {
  createStaticPackageBootstrapProvider,
  openProjectSessionFromPackage,
} from "./core/project-bootstrap.js";
import {db} from "./core/project-db.js";
import {configureFieldObjectControls} from './core/field-object.js';
configureFieldObjectControls(async (...args) =>
  (await import('./ui/field-owner-controls.js')).mountFieldOwnerControls(...args));
import {entityDisplayRecords, loadEntityCatalog} from "./core/entities.js";
import {resourceLabel} from "./core/resource-index.js";
import {bindDbProgress} from "./core/db-progress.js";
import {editorLog} from "./core/editor-log.js";
import {bindLogStatus} from "./ui/log-status.js";
import {renderLog, bindLog} from "./views/log.js";
import {openActiveProjectStore} from "./core/project-session.js";
import {
  prepareViewData,
  resetViewData,
  searchResourceHandles,
  viewDataFailures,
} from "./core/view-data.js";
import {configureBrowserRomBuildProvider, createProjectStoreRomBuildProvider} from "./core/rom-build.js";
import {SAVE_BUILD_BLOB_PREFIX} from "./core/save-build.js";
import {prepareSaveEditorWorkspace} from "./core/save-editor-session.js";
import {acceptHistoryNavigation, bindInternalPageLinks, currentViewUrl, navigateInternalUrl, navigateView, pushCurrentHistory, rememberCurrentHistoryEntry, replaceHistoryUrl, restoreEditorHistory} from "./core/router.js";
import {state, views} from "./core/state.js";
import {storyNavigationInfo} from "./core/editor-pages.js";
import {prepareSaveEventLinks} from "./core/save-page-links.js";
import {prepareGlobalEventFlags} from './core/global-event-flags.js';
import {loadModuleCatalog} from "./modules/catalog.js";
import {
  EDITABLE_STORY_VIEW_IDS,
  storyEditableView,
  storyPlaybackView,
  storyPageDefinitionForView,
} from "./core/story-view-config.js";
import {handleTextMarkup} from "./ui/handle.js";

import {ensureSequenceExecutions} from "./audio/executions.js";
import {stopAudioTimelines} from "./audio/timeline-player.js";
let bindAudioPlayback, renderAudio, renderAudioRecord;
let leaveAudioPlaybackView = () => {};

import "./modules/item/components.js";

import {isServicePage, renderServicePage, bindServicePage,
  isSimpleServicePage, renderSimpleServicePage, bindSimpleServicePage,
  isQuantityServicePage, renderQuantityServicePage, bindQuantityServicePage} from "./views/service-pages.js";

import {ensureVehicleDraft} from "./core/vehicle-field-session.js";

import {bindHomeFieldCoverage, renderHome} from "./views/home.js";

import {loadSceneElevators} from "./core/scene-elevators.js";

import {paintVisibleSceneThumbnailCanvases} from "./modules/scene/preview.js";

import {bindTextModeTabs, loadCurrentTextRecordDisplays, loadNpcCurrentTexts, loadTextCatalog, renderText} from "./views/text/catalog.js";

import {paintUiConstructionCanvases} from "./modules/visual/ui-construction-preview.js";
async function paintCanvasTargets(root, selector, load, method) {
  if (!root.querySelector(selector)) return;
  const renderer = await load();
  return renderer[method](root);
}
const paintMonsterFigureCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-monster-figure]", () => import("./render/monster-figure.js"), "paintMonsterFigureCanvases");
const paintActorAtlasCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-actor-atlas]", () => import("./render/actor-atlas.js"), "paintActorAtlasCanvases");
const paintMetaspriteCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-metasprite]", () => import("./render/metasprite.js"), "paintMetaspriteCanvases");
const paintAttackVisualCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-attack-visual]", () => import("./render/weapon-effect-vm.js"), "paintAttackVisualCanvases");
const paintEffectObjectMotionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-effect-object-motion]", () => import("./render/weapon-effect-vm.js"), "paintEffectObjectMotionCanvases");
const paintBattleActionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-action]", () => import("./render/weapon-effect-vm.js"), "paintBattleActionCanvases");
const paintBattleSceneComposerCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-scene-composer]", () => import("./render/battle-scene-composer.js"), "paintBattleSceneComposerCanvases");

import {bindSidebarToggle, bindNavigationTree, setResourceAlert, setStatus} from "./ui/shell.js";
import {hydrateModuleComponents} from "./ui/module-components.js";
import {applyInterfacePreviewSceneRoute, interfacePreviewContext} from './core/interface-preview-context.js';
import {
  mountPageNavigation,
  updatePageNavigation,
} from "./ui/page-navigation.js";
import {mountPageModuleEditors, pageModuleEditorsMarkup} from "./ui/page-modules.js";
import {
  bindCacheControls,
  refreshCacheControls,
} from "./ui/cache-control.js";
import {bindRecordLinks, bindVirtualTables} from "./ui/table.js";

import {autoSaveBusy, autoSaveError, flushAllAutoSaves} from "./core/auto-save.js";
import {flushFixedTextEditors} from "./ui/fixed-text-editor.js";
import {runQuickBuild} from "./ui/quick-build.js";
import {createExpandedRom, storeExpandedRomBuild} from "./core/expanded-rom.js";

let renderActors;
let renderBattle, renderBattleRecord;
let renderMonsterFormations, bindMonsterFormations;
let bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors;
let paintGomezRedWolfBattle, renderGomezRedWolfBattle;
let renderEmulator;
let bindSaveEditor, prepareSaveEditor, renderSaveEditor;
let bindSavePage, prepareSaveVisualComponents, renderSavePage;
let bindBuildLog, renderBuildLog;
let bindCharacterEditor, renderCharacterRecord;
let bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets;
let bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading;
let bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview;
let loadEncounterZones;
let bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage;
let bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord;
let bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview;
let renderInvestigation;
let renderNpcRecord, renderNpcs;
let bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters;
let bindRomMapPrgViewer, renderRomMapPrg;
let bindRomMapChrViewer, renderRomMapChr;
let bindSceneEditor, openSceneSlug;
let bindSceneOverviewFilter;
let renderScenes;
let bindMetatiles, renderMetatiles;
let renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio;
let bindStoryScriptCommandAddresses, renderStoryScriptRecord;
import {bindBootPresentation, paintBootBankPickers, paintBootPatternPicker,
  paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns} from './views/boot-presentation.js';
let loadCharsetWorkbench;
let bindVisualEditor;
let bindBattleTestEditor;
let bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord;

import {PAGE_RUNTIME_PATHS, pageRuntimeModulePaths} from "./core/page-runtime-paths.js";

const prefetchViewInputs = (...args) => import("./core/startup-prefetch.js")
  .then(module => module.prefetchViewInputs(...args));

const pageRuntimeLoads = new Map();
function preparePageRuntime(view) {
  if (pageRuntimeLoads.has(view)) return pageRuntimeLoads.get(view);
  const paths = pageRuntimeModulePaths(view);
  const task = paths.length ? editorLog.startTask({source: "后台准备", message: `准备页面组件 · ${views[view]?.[1] || view}`,
    details: paths}) : null;
  const pending = Promise.all([
    paths.includes(PAGE_RUNTIME_PATHS["field-editor"]) ? import(PAGE_RUNTIME_PATHS["field-editor"]) : null,
    paths.includes(PAGE_RUNTIME_PATHS["audio"]) ? import(PAGE_RUNTIME_PATHS["audio"]).then(module => {({bindAudioPlayback, leaveAudioPlaybackView, renderAudio, renderAudioRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors"]) ? import(PAGE_RUNTIME_PATHS["actors"]).then(module => {({renderActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle"]) ? import(PAGE_RUNTIME_PATHS["battle"]).then(module => {({renderBattle, renderBattleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['monster-formations']) ? import(PAGE_RUNTIME_PATHS['monster-formations']).then(module => {({renderMonsterFormations, bindMonsterFormations} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-actors"]) ? import(PAGE_RUNTIME_PATHS["battle-actors"]).then(module => {({bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["gomez-red-wolf-battle"]) ? import(PAGE_RUNTIME_PATHS["gomez-red-wolf-battle"]).then(module => {({paintGomezRedWolfBattle, renderGomezRedWolfBattle} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["emulator"]) ? import(PAGE_RUNTIME_PATHS["emulator"]).then(module => {({renderEmulator} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/sram"]) ? import(PAGE_RUNTIME_PATHS["byte-map/sram"]).then(module => {({bindSaveEditor, prepareSaveEditor, renderSaveEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["save-page"]) ? import(PAGE_RUNTIME_PATHS["save-page"]).then(module => {({bindSavePage, prepareSaveVisualComponents, renderSavePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["build-log"]) ? import(PAGE_RUNTIME_PATHS["build-log"]).then(module => {({bindBuildLog, renderBuildLog} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/characters"]) ? import(PAGE_RUNTIME_PATHS["data/characters"]).then(module => {({bindCharacterEditor, renderCharacterRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/monsters"]) ? import(PAGE_RUNTIME_PATHS["data/monsters"]).then(module => {({bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["shops"]) ? import(PAGE_RUNTIME_PATHS["shops"]).then(module => {({bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["interface-pages"]) ? import(PAGE_RUNTIME_PATHS["interface-pages"]).then(module => {({bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/encounter"]) ? import(PAGE_RUNTIME_PATHS["scenes/encounter"]).then(module => {({loadEncounterZones} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/pages"]) ? import(PAGE_RUNTIME_PATHS["data/pages"]).then(module => {({bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/vehicles"]) ? import(PAGE_RUNTIME_PATHS["data/vehicles"]).then(module => {({bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["facilities"]) ? import(PAGE_RUNTIME_PATHS["facilities"]).then(module => {({bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["investigation"]) ? import(PAGE_RUNTIME_PATHS["investigation"]).then(module => {({renderInvestigation} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["npcs"]) ? import(PAGE_RUNTIME_PATHS["npcs"]).then(module => {({renderNpcRecord, renderNpcs} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["wanted"]) ? import(PAGE_RUNTIME_PATHS["wanted"]).then(module => {({bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/prg"]) ? import(PAGE_RUNTIME_PATHS["byte-map/prg"]).then(module => {({bindRomMapPrgViewer, renderRomMapPrg} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/chr"]) ? import(PAGE_RUNTIME_PATHS["byte-map/chr"]).then(module => {({bindRomMapChrViewer, renderRomMapChr} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/interact"]) ? import(PAGE_RUNTIME_PATHS["scenes/interact"]).then(module => {({bindSceneEditor, openSceneSlug} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/overview"]) ? import(PAGE_RUNTIME_PATHS["scenes/overview"]).then(module => {({bindSceneOverviewFilter} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/workbench"]) ? import(PAGE_RUNTIME_PATHS["scenes/workbench"]).then(module => {({renderScenes} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["metatiles"]) ? import(PAGE_RUNTIME_PATHS["metatiles"]).then(module => {({bindMetatiles, renderMetatiles} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/playback"]) ? import(PAGE_RUNTIME_PATHS["story/playback"]).then(module => {({renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/catalog"]) ? import(PAGE_RUNTIME_PATHS["story/catalog"]).then(module => {({bindStoryScriptCommandAddresses, renderStoryScriptRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["text/charset"]) ? import(PAGE_RUNTIME_PATHS["text/charset"]).then(module => {({loadCharsetWorkbench} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors-bind"]) ? import(PAGE_RUNTIME_PATHS["actors-bind"]).then(module => {({bindVisualEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-bind"]) ? import(PAGE_RUNTIME_PATHS["battle-bind"]).then(module => {({bindBattleTestEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/items"]) ? import(PAGE_RUNTIME_PATHS["data/items"]).then(module => {({bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord} = module);}) : null,
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
  "cutscene-boot-logo", "cutscene-title", "gomez-red-wolf-battle",
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

export function empty() {
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

export function openRecord(recordId) {
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

export function bindResourceQueries(root = document, {delegate = false} = {}) {
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

export function bindWideTableWheelScrolling(root = document) {
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

export async function render() {
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
    content.innerHTML = editorErrorMarkup(block, error, {storyRecovery: true});
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
  if (!content.dataset.ownerReferenceLinksBound) {
    content.dataset.ownerReferenceLinksBound = '1';
    content.addEventListener('owner-reference-loaded', event => bindInternalPageLinks(event.target));
  }
  const pageHead = $(".page-head");
  if (pageHead.parentElement === content) content.before(pageHead);
  pageHead.querySelector('[data-story-page-heading]')?.remove();
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
    $("#content").innerHTML = state.projectBootstrapStatus === "error"
      ? `<div class="empty"><b>资源暂不可用</b><span>${
        esc(state.projectBootstrapError)}；状态栏可重试。</span></div>`
      : `<div class="loading"><span></span>正在装载资产包…</div>`;
    return;
  }
  const stillCurrent = () => generation === renderGeneration
    && requestedView === state.view;
  let activateSceneThumbnails = null;
  let destinationPage;
  const markRendered = () => {
    if (!stillCurrent()) return;
    flushCanvasViewportLayouts();
    content.dataset.renderedView = requestedView;
    content.dataset.renderGeneration = String(generation);
    delete content.dataset.pendingView;
    bindSceneDestinationUsers(content, destinationPage, db, () => bindInternalPageLinks(content));
    bindControlledObjectUsers(content, state.project, () => bindInternalPageLinks(content));
    content.dataset.destinationUsersReady = "true";
  };
  const dataView = requestedView;
  const saveActivation = dataView === 'save' && state.savePageSection === 'location';
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
    state.project ? prepareViewData(dataView === 'generic-shop' ? 'shops' : dataView) : Promise.resolve([]),
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
  const editorPage = updatePageNavigation({
    view: state.view,
    interface: state.interfacePage,
    interfacePage: state.interfacePage,
    interfaceScreen: state.interfacePageScreen,
    shopFamily: state.shopFamily,
    facility: state.facilityTab,
    previewCommand: interfacePreviewContext().service?.command,
    equipmentDomain: currentEquipmentDomain().replace(/-equipment$/u, ""),
  });
  if (editorPage?.objects || state.view === 'computercontroller' && editorPage)
    $("#view-title").textContent = editorPage.label;
  const storyInfo = storyNavigationInfo(state.view, state.project?.story_navigation);
  $("#view-kicker").hidden = !storyInfo;
  $("#view-kicker").classList.toggle("story-trigger", Boolean(storyInfo));
  if (storyInfo) $("#view-kicker").textContent = storyInfo.trigger;
  $("#view-title").title = headingHint || "";
  // 怪物列表要显示"出没于哪些随机遇敌区"。遇敌区是跨场景的全局表，不在
  // 聚合投影里，也没进 resource_index，只能单独取一次（内部有缓存）。
  if (dataView === "monsters") {
    await loadEncounterZones();
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
    html += destinationUsers();
    if (state.view === "audio" && state.recordId === "audio-index") {
      html += pageModuleEditorsMarkup(editorPage?.id);
    }
    $("#content").innerHTML = html;
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
    if (state.sceneSlug) html = await renderScenes();
    else {
      const tabs = [["scenes", "场景"], ["actors", "场景角色"], ["investigation", "调查"]];
      const sceneList = await renderScenes();
      const body = state.sceneListTab === "actors" ? renderNpcs()
        : state.sceneListTab === "investigation" ? renderInvestigation(sceneObjects) : sceneList;
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
    html = renderCutsceneAnimation(state.view);
  }
  else if (state.view.startsWith("cutscene-")) html = renderStoryPlaceholder("cutscene");
  else if (["attack-effects", "battle-test"].includes(state.view)) html = renderBattle();
  else if (state.view === 'monster-formations') html = await renderMonsterFormations();
  else if (state.view === "gomez-red-wolf-battle") html = renderGomezRedWolfBattle();
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
  else if (state.view === 'generic-shop') html = await (await import('./views/generic-shop.js')).renderGenericShop();
  else if (state.view === "interfaceui") {
    html = state.interfacePage === 'interaction-service'
      ? await (await import('./views/interaction-service.js')).renderInteractionService()
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
  else if (state.view === "bytemap-prg") html = await renderRomMapPrg();
  else if (state.view === "bytemap-chr") html = await renderRomMapChr();
  else if (state.view === "bytemap-sram") html = renderSaveEditor();
  else if (state.view === "log") html = renderLog();
  else if (state.view === "build") html = renderBuildLog();
  else if (state.view === "emulator") html = renderEmulator();
  // 承载页面上常驻的模块编辑器：清单里属于本页的模块都挂在这一段里。
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
  if (!keepEmulator) $("#content").innerHTML = html;
  if (storyEditableView(state.view)) {
    const heading = content.querySelector('.story-sequence-handle');
    if (heading) {
      heading.dataset.storyPageHeading = "true";
      pageHead.insertBefore(heading, pageHead.querySelector('.head-actions'));
      content.prepend(pageHead);
    }
  }
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
  if (state.view === "bytemap-prg") bindRomMapPrgViewer();
  if (state.view === "bytemap-chr") bindRomMapChrViewer();
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
    await (await import('./views/generic-shop.js')).bindGenericShop(content, {rerender: render});
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
      await (await import('./views/interaction-service.js')).bindInteractionService(content, {rerender: render});
      if (!stillCurrent()) return;
    } else if (isServicePage()) {
      await bindServicePage(content, {rerender: render, repaint: () => paintUiConstructionCanvases({
        resolveEditorPreview: resolveInterfacePageEditorPreview,
      })});
      if (!stillCurrent()) return;
    }
    const serviceWorkbench = state.interfacePage === 'interaction-service'
      ? (await import('./views/interaction-service.js')).interactionServiceWorkbenchOptions() : {};
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
    await bindSceneEditor();
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
    bindSceneOverviewFilter(document, () => {
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
  if (state.view === "gomez-red-wolf-battle") {
    await paintGomezRedWolfBattle();
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
    const packageManifest = await packageJson("manifest.json");
    (await import("./core/startup-prefetch.js")).activatePackagePrefetchManifest(packageManifest);
    state.browserPackageManifest = packageManifest;
    const path = packageManifest.web_project_path;
    if (typeof path !== "string" || !path) {
      throw new Error("资产包缺少项目视图路径");
    }
    const provider = createStaticPackageBootstrapProvider({readJson: readonlyPackageJson});
    let [project, session, catalog] = await Promise.all([
      packageJson(path),
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
