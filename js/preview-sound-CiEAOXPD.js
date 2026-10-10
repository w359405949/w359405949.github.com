import { state, writeTabParam } from './emulator-Bpa8EsFw.js';
import { allowEditorNavigation, rememberCurrentHistoryEntry, pushCurrentHistory, focusByteMapTarget, uiEditorScreenForResource as uiEditorScreenForResource$1, replaceHistoryUrl } from './element-tree-C1bWRgTl.js';
import { indexedResource, resourcePrimaryAddress, romMapAddressHref, $ } from './interface-state-preview-Dlotqlmn.js';
import { db, physicalAddressTarget, BOOTSTRAP_DIGEST_KEY, createStaticPackageBootstrapProvider } from './prg-loaders-DnCSmXk9.js';
import { storyViewForSequenceId } from './baseline-assembly-DW8BWbDB.js';
import { render, SHOP_PAGES, SHOP_ITEM_BUYER_ROUTE, itemPageRoute, dedicatedUiPageForScreen, INTERFACE_PAGE_DEFINITIONS } from './editor-renderer-n2nBwXk_.js';
import { ensureResourceNavigationData, setPreviewSoundEnabled, previewSoundEnabled } from './overview-BWR5QCHz.js';

// @editor-module 把资源身份解析为页面路由并执行跳转、聚焦。


const uiEditorScreenForResource = uid => uiEditorScreenForResource$1(uid, state.project?.ui?.editor);

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
    "scene-actor-record": {view: "scenes", sceneSlug: null},
    "scene-event": {view: "scenes"},
    "scene-boundary": {view: "scenes"},
    "scene-transition": {view: "scenes"},
    "npc-service-handler": {view: "interfaceui", interfacePage: "interaction-service", interfacePageScreen: null},
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
    "investigation-command": {view: "interfaceui", interfacePage: "field-investigation", interfacePageScreen: null},
    "investigation-configuration": {view: "interfaceui", interfacePage: "interaction-service", interfacePageScreen: null},
    "application-command": {view: null},
    "application-configuration-family": {view: null},
  };
  const route = routes[record.kind] ? {...routes[record.kind]} : null;
  if (route && record.kind === "scene-actor-record"
      && !record.references?.some(reference => reference.relation === "belongs-to-scene")) {
    route.view = "story-sequence";
    route.recordId = null;
    route.storyPlaying = false;
  }
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
    route.view = "interfaceui";
    route.interfacePage = pageId || "interaction-service";
    route.interfacePageScreen = null;
  }
  if (route && record.kind === "investigation-configuration") {
    const [, command, , instance] = record.uid.split(":");
    route.resourceId = `application-command:${command}`;
    route.recordId = String(Number.parseInt(instance, 16));
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
    if (!await allowEditorNavigation(`?view=metatiles&metatile=${metatile[1]}`)) return false;
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
    if (!await allowEditorNavigation("?view=scenes")) return false;
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
  if (!await allowEditorNavigation("?view=home")) return false;
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
  if (route && record.kind === "scene-actor-record" && route.view === "story-sequence") {
    const entryId = Number.parseInt(uid.split(":")[1], 16);
    const story = await db.getDocument("project.story", null);
    if (!stillCurrent()) return false;
    const sequences = story?.browser_vm?.sequences || [];
    const sequence = sequences.find(row => Number(row.entry_variant_id) === entryId)
      || sequences.find(row => row.variant_ids?.includes(entryId));
    if (!sequence) return false;
    route.storySequenceId = sequence.id;
  }
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
  let targetActorSelection = null;
  const targetsSceneEditor = record.kind === "map-scene" || record.kind === "scene-actor-record" && route.view === "scenes"
    || ["scene-event", "scene-boundary", "scene-transition"].includes(record.kind)
    || record.kind.startsWith("scene-investigation")
    || record.kind === "scene-treasure";
  if (targetsSceneEditor) {
    const [, sceneHex = "00"] = uid.split(":");
    const actorScenes = record.kind === "scene-actor-record" ? record.references
      ?.filter(reference => reference.relation === "belongs-to-scene") : null;
    const sceneId = actorScenes?.length
      ? Number.parseInt(actorScenes[0].target.split(":")[1], 16) : Number.parseInt(sceneHex, 16);
    const scenes = await db.getDocument("project.scenes", null);
    if (!stillCurrent()) return false;
    targetSceneEntry = (scenes?.editable_scenes || []).find(
      item => Number(item.id) === sceneId,
    );
    if (targetSceneEntry && record.kind === "scene-actor-record") {
      const scene = await db.getResourceDocument(`scene:${Number(targetSceneEntry.id).toString(16).toUpperCase().padStart(2, "0")}`);
      if (!stillCurrent()) return false;
      const actors = scene.logic.layers.actors;
      const reference = actors.records.find(row => row.uid === uid);
      const variant = actors.dynamic_variants?.find(row => row.actor_list.records.some(actor => actor.uid === uid));
      if (!reference && !variant) return false;
      targetActorSelection = reference ? `actor:${reference.id}`
        : `variant-${variant.replacement_entry_id}-actor:${variant.actor_list.records.find(row => row.uid === uid).id}`;
    }
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
    state.sceneLogicSelection = targetActorSelection || `${objectKind}:${Number.parseInt(objectHex, 16)}`;
    state.sceneEditMode = "logic";
  } else {
    state.resourceId = uid;
    Object.assign(state, route);
  }
  clearQuery();
  const url = new URL(location.href);
  [
    "scene", "textRegion", "textKind", "textSearch", "textMode", "charsetSearch",
    "charsetStatus", "charsetPage", "charsetEditor", "actorPart",
    "storyKind", "battlePart", "data", "interface", "interfaceScreen",
    "record", "sceneObject", "sceneMode", "encounterZone", "metatile", "tile",
    "storySequence", "facility", "vendingFamily", "vendingConfig",
  ].forEach(key => url.searchParams.delete(key));
  url.searchParams.set("view", state.view);
  url.searchParams.set("resource", state.resourceId);
  url.hash = record.kind === "investigation-command"
    ? `investigation-command-parameters-${uid.split(":")[1]}` : "";
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
  if (state.storySequenceId && (record.kind === "story-sequence" || route.view === "story-sequence")) {
    url.searchParams.set("storySequence", state.storySequenceId);
    if (!state.storyPlaying) url.searchParams.set("storyPaused", "1");
  }
  if (state.view === "scenes" && state.sceneSlug) url.searchParams.set("scene", state.sceneSlug);
  if (state.view === "scenes" && state.sceneLogicSelection) url.searchParams.set("sceneObject", state.sceneLogicSelection);
  if (targetsSceneEditor && record.kind !== "map-scene") url.searchParams.set("sceneMode", "logic");
  if (state.recordId !== null) url.searchParams.set("record", state.recordId);
  pushCurrentHistory(url);
  await render();
  if (route.recordId !== undefined && route.recordId !== null && state.recordId === null) return false;
  if (record.kind === "investigation-command") return [...document.querySelectorAll(
    '[data-page-module="investigation-command"] [data-module-resource-select]',
  )].some(select => select.value === uid);
  if (record.kind === "investigation-configuration") return Boolean(document.querySelector(
    `[data-interaction-service="${CSS.escape(route.resourceId)}"][data-interaction-service-instance="${CSS.escape(route.recordId)}"]`,
  ));
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

// @editor-module 资源引用选择与跳转共用委托绑定。
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

// @editor-module 宽表格共用 Shift 滚轮横向滚动。

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

// @editor-module 加载 target 定义并只读检查各资源的写回能力。
// Read-only capability inspection follows the same target hydration as a build.

// Only package documents are cached, never Working values or inspection results.
// A new repository facade or package manifest starts a new session. Include the
// build identity and target declarations to also detect updates within a session.
const sessionTargets = new WeakMap();

async function loadSessionTargets(repository, packageManifest, manifest) {
  const session = repository || packageManifest;
  const identity = JSON.stringify([
    manifest[BOOTSTRAP_DIGEST_KEY], manifest.default_target, manifest.targets,
  ]);
  let cached = sessionTargets.get(session);
  if (!cached || cached.packageManifest !== packageManifest || cached.identity !== identity) {
    cached = {packageManifest, identity,
      pending: createStaticPackageBootstrapProvider({
        readJson: path => db.getPackageDocument(path),
      }).loadTargets(manifest)};
    sessionTargets.set(session, cached);
  }
  try {
    return await cached.pending;
  } catch (error) {
    // A failed fetch must remain retryable; don't evict a newer concurrent load.
    if (sessionTargets.get(session) === cached) sessionTargets.delete(session);
    throw error;
  }
}

async function loadWritebackCapabilities(repository, packageManifest) {
  try {
    const project = await repository?.getManifest?.();
    // Persisted build targets may predate the package opened by this session.
    // Reuse them only for that same build, or for a standalone imported project.
    const manifest = project?.default_target && (!packageManifest?.default_target ||
      (project[BOOTSTRAP_DIGEST_KEY] &&
        project[BOOTSTRAP_DIGEST_KEY] === packageManifest[BOOTSTRAP_DIGEST_KEY]))
      ? project : packageManifest;
    const targetId = manifest?.default_target;
    if (!targetId) throw new Error("当前项目没有构建目标");
    const targets = await loadSessionTargets(repository, packageManifest, manifest);
    const definition = targets[targetId];
    if (!definition) throw new Error(`缺少目标 ${targetId}`);
    const {inspectAssetWriteback} = await import('./asset-compiler-B1MJV5At.js').then(function (n) { return n.assetCompiler; });
    const byResource = inspectAssetWriteback({targetProfileId: targetId,
      target: definition.profile, buildMap: definition.build_map, bindings: definition.bindings});
    return {targetId, byResource, error: ""};
  } catch (error) {
    // Keep drafts usable, but show the actual target error and never claim bound.
    return {targetId: null, byResource: new Map(), error: String(error?.message || error)};
  }
}

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

export { bindPreviewSound, bindResourceQueries, bindWideTableWheelScrolling, focusResourceTarget, loadWritebackCapabilities, navigateToResourceTarget, previewSoundControl, resourceNav, resourceTargetRoute };
