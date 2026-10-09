import { editorLog } from './project-store-values-klefznSR.js';
import { bindScenePreview, paintScenePreviewById, scenePreviewMarkup, scenePreviewCanvasMarkup, scenePreviewControls } from './timeline-player-C0h-EABn.js';
import { battleModeForPendingEventFlag, battleFirstMonsterId, worldTideTriggers, sceneActorStateObjects, actorInteractionMode, ensureVehicleDraft, conditionalEntranceState, controllerSceneHref, worldTideScenes, renderSceneDestinationLinks, controllerAt, prepareStorySceneActions, sceneOwnedInteractionConfigurations, sceneConfigurationStays, sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins, consolidateSceneDestinationLinks, sceneEntryStoryItemsForProject, sceneBgmItemsForProject, prepareViewData, ensureSequenceExecutions, createNesApuSynth, encounterCandidate, battleFlowForStoryState, encounterFormationGroups, bindScreenWorkbenchPageHeader, bindScreenWorkbenchBottomResize, bindScreenWorkbenchZoom, bindInternalPageLinks, refreshSceneDraftDirty, sceneResourceUid, controlledObjectMarkup, hiddenTeleportSceneMarkup, shopConfigurationForActor, sceneControllerMarkup, renderSceneResources, loadEncounterZones, prepareSaveEditorWorkspace, encounterBlockIndexAt, conditionalEntranceCells, conditionalEntranceRecord, interfacePreviewContext, conditionalSceneRecord, screenWorkbench, screenWorkbenchCanvasStage, renderEncounterZonePanel, renderEncounterZoneSidebar, sceneInvestigationLayerCount, navigateInternalUrl } from './preview-sound-DHDXA99x.js';
import { sceneActorName, storySequenceComponentLabel, storyComponentLabel, createInterfaceStateControllerWorkbench, interfaceStateGraphMarkup } from './story-component-labels-C9k8orBA.js';
import { sceneInteractionPreviewTarget, bindSceneInteractionPreview, sceneInteractionFlowGraph, sceneInteractionMenuPreview, dialoguePreviewFrames, mountSceneActorInteractionPicker } from './scene-actor-interaction-picker-hGo800Vj.js';
import { vehicleName, paintUiConstructionSemanticPreview, fieldCameraOrigin, elementTree } from './charset-BJ0aS3Xk.js';
import { sceneRuntimeMap, sceneMapCell, esc, handleMarkup, loadWorldMetatileRenderer, loadSceneMetatileRenderer, hex as hex$4, sceneElevatorPoints, audioCommandLabel, prepareModuleComponent, fieldElevatorSceneRanges, sceneElevatorDestinations, currentTextReference, actorAppearanceCatalog, referencePickerMarkup, ACTOR_ENTRY_SCENE_OBJECT, bindReferencePicker, loadElevatorMetatiles, invalidateSceneSurface, renderModuleComponent, hydrateModuleComponents } from './monster-figure-C07vG7yu.js';
import { eventFlagReferenceMarkup, globalEventFlagHandle, saveBattleCatalog, saveEventHref, physicalLocationMarkup, eventFlagTextMarkup } from './writeback-capabilities-CGLIL9l3.js';
import { worldCoarsePatternCells, WORLD_TIDE_HANDLE, WORLD_TIDE_OWNER, SCENE_REMAP_OWNER, db, sceneEntityResourceUid, sceneActorDocument, sceneActorRecord, elevatorServicePreview, uiFacilityElevatorSceneBase, prepareSceneInteractionBinding, sceneInteractionBoundObject, TILE_ACTION_OWNER, controllerSceneRemaps, sceneInteractionTemplates, SCENE_ACTORS_RESOURCE_ID, beginSceneActorDraft, acceptProjectFieldDraft, sceneActorAliasRecords, buildLogButton } from './scene-actors-Cftr7mCE.js';
import { mountFieldObjectNumber, mountFieldObjectChoice, mountFieldObjectElementReset, mountFieldObjectReset, mountFieldObjectRecordChoice } from './rectangle-preset-controls-MtKWNScU.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker, sceneVariantMarkup, scenePickerVariants } from './components-wbruLTYI.js';
import './components-C4C2LoWv.js';
import { state, battleSimulatorHref, sceneInteractionFlowPage, EDITOR_PAGES, sceneInteractionFlowMatches, INTERFACE_PAGE_DEFINITIONS } from './emulator-Bl-sLXnd.js';
import './step-effects-aB0T4dMU.js';
import { interactionEditorLink, interactionEditorHref } from './interaction-components-BXNxuJ8s.js';
import { shopConfigurationProducts } from './shops-BkPXrHg7.js';
import { storyViewForSequenceId, storyPageDefinitionForView } from './baseline-assembly-C0KRII8X.js';
import { fields } from './record-BbPQSBBw.js';
import { actorAppearanceCandidatePreview, sceneActorVisualMarkup, actorAppearanceCandidateLabel, hydrateStoryActorVisuals } from './npcs-Dhp3qBbI.js';
import './document-controls-Aq8h5H8g.js';
import { sceneActorVisualDescriptor, actorAppearanceContextForScene } from './write-access-marker-Q1IasgBx.js';

// @editor-module 场景事件改写记录的覆盖范围与两态投影。

const hex$3 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneMapRewriteBounds(regions) {
  if (!regions.length) return null;
  const x = Math.min(...regions.map(row => row.x));
  const y = Math.min(...regions.map(row => row.y));
  return {x, y, width: Math.max(...regions.map(row => row.x + row.width)) - x,
    height: Math.max(...regions.map(row => row.y + row.height)) - y};
}

function sceneMapRewriteContains(rewrite, x, y) {
  return rewrite.regions.some(row => x >= row.x && y >= row.y
    && x < row.x + row.width && y < row.y + row.height);
}

function sceneMapRewriteScene(scene, rewrite, phase) {
  const map = sceneRuntimeMap(scene).map(row => [...row]);
  for (const cell of rewrite[phase].cells || []) map[cell.y][cell.x] = cell.metatile_id;
  return {...scene, map, runtime_map: null};
}

function sceneEventFlagMap(scene, flagValue) {
  const groups = (scene.event_metatile_replacements || []).filter(group =>
    group.coordinate_space !== 'world-coarse-map' && flagValue(group.event_flag));
  if (!groups.length) return scene;
  const map = sceneRuntimeMap(scene).map(row => [...row]);
  for (const group of groups) for (const cell of group.replacements)
    map[cell.y][cell.x] = cell.metatile_id;
  return {...scene, map, runtime_map: null};
}

function mapCells(scene, regions) {
  return regions.flatMap(row => Array.from({length: row.width * row.height}, (_, index) => {
    const x = row.x + index % row.width, y = row.y + Math.floor(index / row.width);
    return {x, y, metatile_id: sceneMapCell(scene, x, y)?.metatileId};
  }));
}

function sceneMapRewrites(scene, {worldRaw, tide, lifecycle, scenes = []} = {}) {
  if (!scene) return [];
  const resourceId = `scene:${hex$3(scene.id)}`;
  const rewrites = (scene.event_metatile_replacements || []).map((group, index) => {
    const coarse = group.coordinate_space === 'world-coarse-map';
    const size = coarse ? 4 : 1;
    const regions = group.replacements.map(cell => ({x: cell.x * size, y: cell.y * size,
      width: size, height: size}));
    const handle = `${resourceId}:event-map:${hex$3(index)}`;
    return {key: `map-rewrite:${handle}`, handle, resourceId, groupIndex: index,
      type: coarse ? 'world-coarse-replacement' : 'metatile-replacement',
      label: coarse ? '粗格替换' : '地图格替换', eventFlag: group.event_flag,
      record: group, regions, bounds: sceneMapRewriteBounds(regions),
      before: {label: '事件前', cells: mapCells(scene, regions)},
      after: {label: '事件后', cells: coarse
        ? group.replacements.flatMap(cell => worldCoarsePatternCells(worldRaw,
          cell.x * 4, cell.y * 4, cell.metatile_id)) : group.replacements},
      fieldObjectIds: [`${resourceId}.event-map.${hex$3(index)}`,
        `${resourceId}.event-map.${hex$3(index)}.cells`]};
  });
  if (Number(scene.id) === Number(tide?.trigger?.scene_id)) {
    const record = tide.records.find(row => row.handle === WORLD_TIDE_HANDLE);
    const regions = tide.blocks.map(block => ({x: block.x, y: block.y, width: 4, height: 4}));
    rewrites.push({key: `map-rewrite:${WORLD_TIDE_HANDLE}`, handle: WORLD_TIDE_HANDLE,
      resourceId: WORLD_TIDE_OWNER, type: 'world-coarse-switch', label: '潮汐地形切换',
      eventFlag: tide.event_flag, record, regions, bounds: sceneMapRewriteBounds(regions),
      ...Object.fromEntries([['before', 'high', '涨潮'], ['after', 'low', '退潮']]
        .map(([phase, field, label]) => [phase, {label, cells: tide.blocks.flatMap(block =>
          worldCoarsePatternCells(worldRaw, block.x, block.y, record[block[`${field}_field`]]))}]))});
  }
  for (const row of lifecycle?.records || []) {
    if (row.kind !== 'scene-remap' || ![row.source_scene_reference, row.target_scene_reference]
      .includes(resourceId)) continue;
    const source = scenes.find(entry => `scene:${hex$3(entry.id)}` === row.source_scene_reference) || scene;
    const target = scenes.find(entry => `scene:${hex$3(entry.id)}` === row.target_scene_reference) || scene;
    const regions = [{x: 0, y: 0, width: source.width, height: source.height}];
    if (target.width > source.width) regions.push({x: source.width, y: 0,
      width: target.width - source.width, height: target.height});
    if (target.height > source.height) regions.push({x: 0, y: source.height,
      width: Math.min(source.width, target.width), height: target.height - source.height});
    rewrites.push({key: `scene-state:${row.handle}`, handle: row.handle, resourceId: SCENE_REMAP_OWNER,
      type: 'scene-remap', label: '场景重映射',
      eventFlag: Number.parseInt(row.global_event_flag_reference.split(':').at(-1), 16),
      record: row, regions, bounds: sceneMapRewriteBounds(regions),
      before: {label: '事件前', sceneReference: row.source_scene_reference},
      after: {label: '事件后', sceneReference: row.target_scene_reference}});
  }
  return rewrites;
}

// @editor-module 事件地图改写的两态预览与字段对象控件。

const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneMapRewritePhase(rewrite) {
  return state.sceneMapRewritePreview?.key === rewrite.key ? state.sceneMapRewritePreview.phase : 'before';
}

function sceneMapRewritePreview(rewrite) {
  if (rewrite.type === 'scene-remap') return state.sceneMapRewriteScenes?.key === rewrite.key
    ? state.sceneMapRewriteScenes[sceneMapRewritePhase(rewrite)] : null;
  return {scene: sceneMapRewriteScene(state.scene, rewrite, sceneMapRewritePhase(rewrite)),
    logic: state.sceneLogic, renderer: state.sceneRenderer || (state.sceneMapRewriteScenes?.key === rewrite.key
      ? state.sceneMapRewriteScenes[sceneMapRewritePhase(rewrite)].renderer : null)};
}

function sceneMapRewriteControlsMarkup(rewrite) {
  if (!rewrite) return '';
  const phase = sceneMapRewritePhase(rewrite);
  return `<div class="scene-mode-switch" aria-label="事件地图预览">${['before', 'after'].map(id =>
    `<button type="button" class="button ${phase === id ? 'active' : ''}" aria-pressed="${phase === id}"
      data-scene-map-rewrite-phase="${id}">${esc(rewrite[id].label)}</button>`).join('')}</div>`;
}

function renderSceneMapRewriteInspector(rewrite) {
  const bounds = rewrite.bounds;
  return `<div class="scene-object-editor" data-scene-map-rewrite="${esc(rewrite.key)}">
    <div class="scene-object-identity">${handleMarkup(rewrite.handle, {})}</div>
    <div class="scene-map-rewrite-title"><b>${esc(rewrite.label)}</b>
      <div data-scene-map-rewrite-event>${eventFlagReferenceMarkup(rewrite.eventFlag, {compact: true})}</div></div>
    ${bounds ? `<p>地图格范围 (${bounds.x}, ${bounds.y})–(${bounds.x + bounds.width - 1}, ${bounds.y + bounds.height - 1}) · ${
      rewrite.regions.reduce((sum, row) => sum + row.width * row.height, 0)} 格</p>` : ''}
    <div data-scene-map-rewrite-fields></div>
  </div>`;
}

async function mountSceneMapRewrite(rewrite, {refresh, draw}) {
  const host = document.querySelector('[data-scene-map-rewrite]');
  if (!host || host.dataset.sceneMapRewrite !== rewrite.key) return;
  const current = () => host.isConnected && state.sceneLogicSelection === rewrite.key;
  document.querySelectorAll('[data-scene-map-rewrite-controls] [data-scene-map-rewrite-phase]').forEach(button => {
    button.addEventListener('click', () => {
      state.sceneMapRewritePreview = {key: rewrite.key, phase: button.dataset.sceneMapRewritePhase};
      for (const node of button.parentElement.children) {
        const active = node === button;
        node.classList.toggle('active', active);
        node.setAttribute('aria-pressed', String(active));
      }
      draw();
    });
  });
  const pairs = await Promise.all(['before', 'after'].map(async phase => {
    if (rewrite.type !== 'scene-remap') {
      const renderer = state.sceneRenderer || (Number(state.scene.id) === 0
        ? await loadWorldMetatileRenderer(state.scene) : await loadSceneMetatileRenderer(state.scene));
      return [phase, {scene: sceneMapRewriteScene(state.scene, rewrite, phase),
        logic: state.sceneLogic, renderer}];
    }
    const reference = rewrite[phase].sceneReference;
    const document = await db.getResourceDocument(reference, null);
    if (!document?.scene) throw new Error(`${reference} 缺少场景地图`);
    const active = Number(document.scene.id) === Number(state.scene.id);
    const scene = active ? state.scene : document.scene;
    const renderer = Number(scene.id) === 0
      ? await loadWorldMetatileRenderer(scene) : await loadSceneMetatileRenderer(scene);
    return [phase, {scene, logic: active ? state.sceneLogic : document.logic, renderer}];
  }));
  if (!current()) return;
  state.sceneMapRewriteScenes = {key: rewrite.key, ...Object.fromEntries(pairs)};
  draw();
  const objects = await db.getFieldObjects(rewrite.resourceId);
  if (!current()) return;
  const candidates = rewrite.fieldObjectIds ? objects.filter(row => rewrite.fieldObjectIds.includes(row.id))
    : objects.filter(row => row.fields.some(field => field.entityHandle === rewrite.handle));
  const fieldsHost = host.querySelector('[data-scene-map-rewrite-fields]');
  host.addEventListener('field-object-saved', async event => {
    if (!current()) return;
    const fields = Array.isArray(event.detail.fields) ? event.detail.fields : [event.detail.fields];
    if (!fields.some(field => field.resourceId === rewrite.resourceId)) return;
    try {
      const document = await db.getResourceDocument(rewrite.resourceId, null);
      if (!current()) return;
      if (rewrite.type === 'scene-remap') state.sceneBgmDocument = document;
      else if (rewrite.type === 'world-coarse-switch') state.sceneTideDocument = document;
      else state.scene.event_metatile_replacements = JSON.parse(JSON.stringify(document.scene.event_metatile_replacements));
      state.sceneMapRewriteScenes = null;
      refresh();
    } catch (error) {
      if (current()) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    }
  });
  for (const object of candidates) {
    const eventField = object.fields.find(field => field.entityHandle === rewrite.handle
      && ['event_flag', 'global_event_flag_reference'].includes(field.fieldName));
    const fieldKey = field => JSON.stringify([field.resourceId, field.entityHandle, field.fieldName]);
    const mountOptions = {compactIdentity: true,
      stacked: rewrite.type === 'world-coarse-switch' || rewrite.type === 'scene-remap',
      ...(rewrite.fieldObjectIds ? {} : {rowHandles: [rewrite.handle]}),
      metatileResourceId: `scene:${hex$2(state.scene.id)}`};
    if (eventField) {
      await object.mount(host.querySelector('[data-scene-map-rewrite-event]'), {...mountOptions,
        stacked: false,
        reset: object.fields.every(field => field === eventField),
        suppressedFieldKeys: new Set(object.fields.filter(field => field !== eventField).map(fieldKey)),
        referencePickerOptions: {[eventField.fieldName]: {previewOnlySummary: true}}});
      if (!current()) return;
      if (object.fields.every(field => field === eventField)) continue;
    }
    const root = document.createElement('div');
    fieldsHost.append(root);
    await object.mount(root, {...mountOptions,
      suppressedFieldKeys: new Set(eventField ? [fieldKey(eventField)] : [])});
    if (!current()) return;
  }
  host.dataset.sceneMapRewriteReady = '1';
}

// @editor-module 场景逻辑对象、交互、调查与宝箱编辑器







//
// 来源：拆分前 engine/editor/app.js 第 8369-8920 行。






// layers.actors 里只有 uid 引用；记录本体到超集里按 uid 现取。解析不到就
// 跳过——那说明 actors.json 与 logic.json 不是同一次提取的产物，宁可少显示
// 一行，也不要拿半截数据往下渲染。
function resolvedActorRows(view, extra) {
  return (view.records || []).flatMap(reference => {
    const record = sceneActorRecord(reference.uid);
    return record
      ? [{kind: "actor", layer: "actors", record, reference, ...extra(reference)}]
      : [];
  });
}

/** 初始停放记录从战车字段会话取得，并按当前场景筛选。 */
function sceneVehiclePlacements() {
  const sceneId = Number(state.sceneLogic?.scene_id);
  ensureVehicleDraft();
  const drafts = state.vehicleDraft?.placement;
  if (!drafts) return [];
  return Object.values(drafts)
    .filter(record => record.placed && Number(record.scene_id) === sceneId)
    .sort((left, right) => left.vehicle_slot - right.vehicle_slot)
    .map(record => ({
      key: `vehicle:${record.vehicle_slot}`,
      kind: "vehicle",
      layer: "vehicles",
      record,
      // preset_id 在草稿里没存（槽号即 preset 号），标签与资源链接要用。
      presetId: record.vehicle_slot,
    }));
}

function sceneLogicObjects() {
  if (!state.sceneLogic) return [];
  const layers = state.sceneLogic.layers;
  const variantActors = (layers.actors.dynamic_variants || []).flatMap(variant =>
    resolvedActorRows(variant.actor_list, reference => ({
      key: `variant-${variant.replacement_entry_id}-actor:${reference.id}`,
      variant,
    }))
  );
  const dynamicBoundary = layers.transitions.dynamic_boundary_return
    ? [{
        key: "boundary:return", kind: "boundary-return", layer: "transitions",
        record: layers.transitions.dynamic_boundary_return,
      }]
    : [];
  const actors = [...resolvedActorRows(layers.actors, reference => ({key: `actor:${reference.id}`})), ...variantActors];
  return [
    ...worldTideTriggers(state.sceneTideDocument, state.sceneEntry.id).map(record => ({
      key: `tide:${record.id}`, kind: 'tide', layer: 'events', record,
    })),
    ...sceneElevatorPoints(state.scene, state.sceneElevatorMetatiles).map(record => ({
      key: `elevator:${record.id}`, kind: "elevator", layer: "transitions", record,
    })),
    ...(layers.metatile_investigation_points || []).map(record => ({key: `investigation-tile:${record.id}`, kind: "investigation-tile", layer: "investigations", record})),
    ...actors,
    ...actors.flatMap(object => sceneActorStateObjects(object, state.sceneStoryDocuments?.autonomous, state.project.story)),
    ...sceneMapRewrites(state.scene, {worldRaw: state.sceneWorldRaw,
      tide: state.sceneTideDocument, lifecycle: state.sceneBgmDocument,
      scenes: state.project.scenes.editable_scenes}).map(rewrite => ({
      key: rewrite.key, kind: rewrite.type === 'scene-remap' ? 'scene-state' : 'map-rewrite',
      layer: 'events', record: rewrite.record, rewrite,
    })),
    ...sceneVehiclePlacements(),
    ...layers.treasures.map(record => ({key: `treasure:${record.id}`, kind: "treasure", layer: "treasures", record})),
    ...layers.investigation_points.map(record => ({key: `investigation:${record.id}`, kind: "investigation", layer: "investigations", record})),
    ...(layers.investigation_special_points || []).map(record => ({key: `investigation-special:${record.id}`, kind: "investigation-special", layer: "investigations", record})),
    ...layers.transitions.point_transitions.map(record => ({key: `transition:${record.id}`, kind: "transition", layer: "transitions", record})),
    ...layers.transitions.boundary_exits.map(record => ({key: `boundary:${record.id}`, kind: "boundary", layer: "transitions", record})),
    ...dynamicBoundary,
    ...layers.event_triggers.map(record => ({key: `event:${record.id}`, kind: "event", layer: "events", record})),
  ];
}

function selectedSceneLogicObject() {
  return sceneLogicObjects().find(item => item.key === state.sceneLogicSelection) || null;
}

function sceneObjectResourceUid(item) {
  const sceneId = Number(state.sceneEntry?.id || 0);
  const sceneIdHex = sceneId.toString(16).toUpperCase().padStart(2, "0");
  if (item.rewrite) return item.rewrite.handle;
  // actor 的 uid 由超集给定，不在这里从 entry_id 和记录号拼——拼出来的是
  // 第二套生成规则，两边一旦不一致就会静默指向不存在的资源。
  if (item.kind === "actor") return item.record.uid;
  if (item.kind === 'scene-state') return item.record.handle;
  if (item.kind === 'tide') return item.record.handle;
  // 载具指向资源索引里已有的 preset 记录，不另造一套场景对象 uid。
  if (item.kind === "vehicle") return `vehicle:${Number(item.presetId).toString(16).toUpperCase().padStart(2, "0")}`;
  if (item.kind === "boundary-return") return `scene:${sceneIdHex}`;
  if (item.kind === "elevator") return item.record.map_handle;
  return sceneEntityResourceUid(item.kind, sceneId, item.record.id);
}

const sceneBoundaryDirections = {
  1: {side: "up", label: "上边界", arrow: "↑"},
  2: {side: "down", label: "下边界", arrow: "↓"},
  3: {side: "left", label: "左边界", arrow: "←"},
  4: {side: "right", label: "右边界", arrow: "→"},
};

function sceneBoundarySides(record) {
  const direction = sceneBoundaryDirections[Number(record.direction_code)];
  return direction ? [direction.side] : ["up", "down", "left", "right"];
}

function sceneBoundaryFocusCoordinate(item) {
  if (!item?.kind?.startsWith("boundary") || !state.scene) return null;
  const side = sceneBoundarySides(item.record)[0];
  const centerX = Math.max(0, Math.floor((Number(state.scene.width) - 1) / 2));
  const centerY = Math.max(0, Math.floor((Number(state.scene.height) - 1) / 2));
  if (side === "up") return [centerX, 0];
  if (side === "down") return [centerX, Number(state.scene.height) - 1];
  if (side === "left") return [0, centerY];
  return [Number(state.scene.width) - 1, centerY];
}

function sceneBoundaryMatchesCell(item, x, y) {
  if (!item.kind.startsWith("boundary")) return false;
  const sides = sceneBoundarySides(item.record);
  return (sides.includes("up") && y === 0)
    || (sides.includes("down") && y === Number(state.scene.height) - 1)
    || (sides.includes("left") && x === 0)
    || (sides.includes("right") && x === Number(state.scene.width) - 1);
}

function sceneInteractionStateLabel(record) {
  return record?.interaction_state?.label || "";
}

function renderSceneInteractionLinks(record, kind) {
  const battles = saveBattleCatalog().entries.filter(row =>
    row.scene_id === Number(state.sceneLogic?.scene_id) && (kind === "actor"
      ? row.actor_uid === record.uid : kind === "entry-story"
        ? row.entrance_object_key === record.key : row.object_key === `${kind}:${record.id}`));
  const battleLinks = battles.map(row => {
    const flag = row.suppression_flag ?? row.victory_flag;
    const links = flag == null ? "" : [1, 2].map(slot =>
      `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flag))}" title="存档战斗状态">槽 ${slot} ↗</a>`).join(" · ");
    return `<p class="scene-content-note" data-scene-battle-state="${esc(row.id)}"${
      row.condition ? ` title="${esc(row.condition)}"` : ""}>${row.shadowed_by != null
        ? `被坐标事件 ${row.shadowed_by} 覆盖` : `一次性：${row.one_time ? "是" : "否"}`} · ${links || "—"}</p>`;
  }).join("");
  if (kind === "actor") {
    const actor = (state.project?.story?.npc_catalog?.records || [])
      .find(item => item.uid === record.uid);
    const flags = [...new Set((actor?.state_references || []).map(reference => Number(reference.flag_id)))]
      .filter(Number.isInteger);
    return battleLinks + flags.map(flagId => {
      const links = [1, 2].map(slot =>
        `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flagId))}">槽 ${slot} 事件位</a>`).join(" · ");
      return `<p class="scene-content-note">${eventFlagReferenceMarkup(flagId)} · ${links}</p>`;
    }).join("");
  }
  if (kind === "event" && Number.isInteger(Number(record?.event_flag))) {
    const flagId = Number(record.event_flag);
    const links = [1, 2].map(slot =>
      `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flagId))}">槽 ${slot} 事件位</a>`).join(" · ");
    return battleLinks + `<p class="scene-content-note">${eventFlagReferenceMarkup(flagId)} · ${links}</p>`;
  }
  const model = record?.interaction_state;
  if (model?.class !== "treasure-collected-flag" || !Number.isInteger(Number(model.flag_id))) return battleLinks;
  const links = [1, 2].map(slot =>
    `<a class="editor-inline-link" href="${esc(saveEventHref(slot, model.flag_id, {treasure: true}))}">槽 ${slot} 取得位</a>`).join(" · ");
  return battleLinks + `<p class="scene-content-note">${links}</p>`;
}

function renderSceneInteractionState(record) {
  const model = record?.interaction_state;
  if (!model) return '';
  const flag = Number.isInteger(Number(model.flag_id)) ? ` · ${model.class === 'treasure-collected-flag'
    ? `调查物取得位 ${hex$4(model.flag_id, 2)}` : eventFlagReferenceMarkup(model.flag_id)}` : '';
  const commit = model.commit === 'deferred-until-battle-victory' ? '战斗胜利后提交'
    : String(model.commit || '').startsWith('immediate-after-successful') ? '取得成功后立即提交' : '';
  return `<p class="scene-content-note"${commit ? ` title="${esc(commit)}"` : ''}><b>交互状态：</b>${esc(model.label || model.class)}${flag}</p>`;
}

/**
 * 场景调查格只说明“会进入调查战斗处理器”；编队正文归 battle-test-point。
 *
 * logic.json 里的 encounter_id / monster_ids / label 是提取期审计快照，不能在用户
 * 修改 working 后继续当当前值显示。这里始终从浏览器 repository 已挂载的有效文档
 * 解析编队，并用当前怪物表补名称。
 */
function investigationBattleFormation(record) {
  if (record?.kind !== "investigation-battle-trigger") return null;
  const configuration = state.project?.game_data?.battle_test;
  const encounterId = Number(configuration?.encounter_id);
  const formation = Array.isArray(configuration?.formations)
    ? configuration.formations.find(item => Number(item.id) === encounterId)
    : null;
  if (!Number.isInteger(encounterId) || !formation || !Array.isArray(formation.slots)) {
    return {
      available: false,
      message: "battle-test-point 当前编队不可用",
    };
  }
  const monsters = new Map(
    (state.project?.game_data?.monsters?.records || []).map(monster => [
      Number(monster.id),
      monster,
    ]),
  );
  const slots = formation.slots.flatMap((slot, index) => {
    const count = Number(slot.count);
    if (!Number.isInteger(count) || count < 1) return [];
    const monsterId = Number(slot.monster_id);
    const monster = monsters.get(monsterId);
    const monsterIdHex = hex$4(monsterId, 2);
    return [{
      index,
      count,
      monsterIdHex,
      monsterName: monster?.name || `怪物 ${monsterIdHex}`,
    }];
  });
  return {
    available: true,
    encounterId,
    encounterIdHex: hex$4(encounterId, 2),
    battleMode: battleModeForPendingEventFlag(configuration.state_flag, battleFirstMonsterId(formation.slots)),
    pendingEventFlag: Number(configuration.state_flag),
    slots,
    totalCount: slots.reduce((total, slot) => total + slot.count, 0),
    summary: slots.length
      ? slots.map(slot => `${slot.monsterName} ×${slot.count}`).join(" / ")
      : "无有效怪物",
  };
}

function sceneObjectLabel(item) {
  const record = item.record;
  if (item.rewrite) return `${item.rewrite.label} · global-event-flag:${Number(item.rewrite.eventFlag).toString(16).toUpperCase().padStart(2, '0')}`;
  if (item.kind === 'scene-state') return record.label;
  if (item.kind === 'tide') return `潮汐触发 · ${['↑', '↓', '←', '→'][record.direction]}`;
  if (item.kind === "elevator") return `电梯 · ${record.configuration_handle}`;
  if (item.kind === "actor") {
    const interaction = actorInteractionLabel(record);
    const variant = item.variant
      ? `[${globalEventFlagHandle(item.variant.event_flag)} → ${hex$4(item.variant.replacement_entry_id, 2)}] ` : "";
    const pose = item.pose;
    return `${variant}角色 ${hex$4(record.id, 2)} · 类型 ${hex$4(pose?.actor_type ?? record.actor_type, 2)} · ${interaction}${pose ? ` · ${pose.conditions.join('、')} · 初始动作` : ''}`;
  }
  if (item.kind === "vehicle") {
    return `战车初始停放 · 车位 ${Number(record.vehicle_slot) + 1} · 预设 ${hex$4(item.presetId, 2)}`;
  }
  if (item.kind === "treasure") {
    const contentId = Number(record.content_id);
    const itemRecord = state.project.game_data?.items?.records?.find(entry => Number(entry.id) === contentId);
    const content = record.content_label || (contentId >= 0xF0 && contentId <= 0xFB
      ? `金钱奖励 ${hex$4(contentId, 2)}`
      : `${itemRecord?.name || "物品"} ${hex$4(record.content_id, 2)}`);
    const stateLabel = sceneInteractionStateLabel(record);
    return `调查物 ${hex$4(record.id, 2)} · ${content}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "investigation") {
    return `调查激活点 ${hex$4(record.id, 2)} · ${record.facility_label} · 实例 ${hex$4(record.instance_id, 2)}`;
  }
  if (item.kind === "investigation-special") {
    const stateLabel = sceneInteractionStateLabel(record);
    return `专用调查点 ${hex$4(record.id, 2)} · ${record.label}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "investigation-tile") {
    if (Number(record.behavior_code) === 0x54) return '地图机关 · 离场复原';
    const stateLabel = sceneInteractionStateLabel(record);
    const battle = investigationBattleFormation(record);
    const label = battle?.available
      ? `调查战斗${battle.battleMode?.label ? ` · ${battle.battleMode.label}` : ''} · 编队 ${battle.encounterIdHex} · ${battle.summary}`
      : record.kind === "investigation-battle-trigger"
        ? "调查战斗"
        : record.label;
    return `图块调查 ${record.behavior_code_hex} · ${label} · metatile ${record.metatile_id_hex}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "transition") {
    const target = (state.project.scenes?.editable_scenes || []).find(
      scene => Number(scene.id) === Number(record.destination_scene_id)
    );
    const targetLabel = target?.name || target?.slug || `场景 ${hex$4(record.destination_scene_id, 2)}`;
    return record.transition_kind === "world-location-entrance"
      ? `大地图地点入口 ${hex$4(record.id, 2)} → ${targetLabel}`
      : `门/传送 ${hex$4(record.id, 2)} → ${targetLabel}`;
  }
  if (item.kind === "boundary-return") {
    return "全部边界 → 返回进入本场景前保存的场景与坐标";
  }
  if (item.kind === "boundary") {
    const direction = sceneBoundaryDirections[Number(record.direction_code)];
    const label = direction ? `${direction.label} ${direction.arrow}` : "全部边界";
    return `${label} → 场景 ${hex$4(record.destination_scene_id, 2)}`;
  }
  return `坐标事件 ${hex$4(record.id, 2)} · ${globalEventFlagHandle(record.event_flag)} · 状态 ${hex$4(record.story_state, 2)}`;
}

function sceneObjectTreeLabel(item) {
  const record = item.record;
  const sceneName = id => storyComponentLabel((state.project.scenes?.editable_scenes || [])
    .find(scene => Number(scene.id) === Number(id))?.name || '场景');
  if (item.rewrite) return item.rewrite.label;
  if (item.kind === 'scene-state') return `事件后场景 · ${sceneName(record.target_scene_reference?.split(':').at(-1)
    ? parseInt(record.target_scene_reference.split(':').at(-1), 16) : record.target_scene_id)}`;
  if (item.kind === 'tide') return '潮汐触发';
  if (item.kind === 'elevator') return '电梯';
  if (item.kind === 'actor') {
    const name = sceneActorName(record);
    return `${name.treeLabel || name.label}${item.variant ? ' · 事件后角色' : ''}${
      item.pose ? ' · 初始动作' : ''}`;
  }
  if (item.kind === 'vehicle') {
    const preset = state.vehicleDraft?.presets?.[item.presetId];
    return preset ? `${vehicleName(preset)} · 初始停放` : '战车初始停放';
  }
  if (item.kind === 'treasure') {
    const id = Number(record.content_id);
    const content = id >= 0xF0 && id <= 0xFB ? '金钱奖励'
      : state.project.game_data?.items?.records?.find(row => Number(row.id) === id)?.name || '物品';
    return `调查物 · ${content}`;
  }
  if (item.kind === 'investigation') return record.facility_label || '设施调查';
  if (item.kind === 'investigation-special') return record.label || '专用调查';
  if (item.kind === 'investigation-tile') return Number(record.behavior_code) === 0x54 ? '离场复原机关'
    : investigationBattleFormation(record) ? '调查战斗' : record.label || '图块调查';
  if (item.kind === 'transition') return `${record.transition_kind === 'world-location-entrance' ? '地点入口' : '门与传送'} · ${sceneName(record.destination_scene_id)}`;
  if (item.kind === 'boundary-return') return '边界返回';
  if (item.kind === 'boundary') return `${sceneBoundaryDirections[Number(record.direction_code)]?.label || '全部边界'} · ${sceneName(record.destination_scene_id)}`;
  const context = state.project.story?.story_mode_contexts?.entries?.find(row => Number(row.story_state) === Number(record.story_state));
  const sequence = state.project.story?.cutscene_inventory?.entries?.find(row => row.actor_list_ids?.includes(context?.scene_actor_entry));
  return sequence ? `坐标触发 · ${storySequenceComponentLabel(sequence.id, sequence.label)}` : '坐标剧情事件';
}

function sceneObjectCoordinate(item) {
  if (item.rewrite) {
    const bounds = item.rewrite.bounds;
    return bounds ? [Math.floor(bounds.x + bounds.width / 2), Math.floor(bounds.y + bounds.height / 2)] : null;
  }
  if (item.pose) return [item.pose.x, item.pose.y];
  if (item.kind === 'scene-state') return null;
  if (item.kind === "event") return [item.record.trigger_x, item.record.trigger_y];
  if (item.kind.startsWith("boundary")) return null;
  return [item.record.x, item.record.y];
}

function sceneObjectCoordinateLabel(item) {
  if (item.rewrite) {
    const bounds = item.rewrite.bounds;
    return bounds ? `${bounds.x}, ${bounds.y}–${bounds.x + bounds.width - 1}, ${bounds.y + bounds.height - 1}` : '';
  }
  if (item.kind === 'scene-state') return '';
  const coordinate = sceneObjectCoordinate(item);
  if (coordinate) return coordinate.join(", ");
  const maxX = Number(state.scene.width) - 1;
  const maxY = Number(state.scene.height) - 1;
  return sceneBoundarySides(item.record).map(side => ({
    up: `0–${maxX}, 0`, down: `0–${maxX}, ${maxY}`,
    left: `0, 0–${maxY}`, right: `${maxX}, 0–${maxY}`,
  })[side]).join(" / ");
}

const sceneLogicFieldSpecs = {
  actor: [
    ["x", "X", 0, 63], ["y", "Y", 0, 63],
    ["actor_type", "角色类型", 0, 63], ["direction", "方向 0上/1下/2左/3右", 0, 3],
  ],
  treasure: [["x", "X", 0, 255], ["y", "Y", 0, 255]],
  // 只放 X/Y：换场景等于把车挪到另一张图，那不该靠在画布上拖，去载具页选。
  vehicle: [["x", "X", 0, 255], ["y", "Y", 0, 255]],
  investigation: [
    ["x", "激活点 X", 0, 255], ["y", "激活点 Y", 0, 255],
  ],
  transition: [
    ["x", "入口 X", 0, 255], ["y", "入口 Y", 0, 255],
    ["destination_x", "目标 X", 0, 255], ["destination_y", "目标 Y", 0, 255],
  ],
  boundary: [
    ["destination_x", "目标 X", 0, 255], ["destination_y", "目标 Y", 0, 255],
  ],
  event: [
    ["trigger_x", "触发 X", 0, 255], ["trigger_y", "触发 Y", 0, 255],
    ["event_flag", "一次性事件 flag", 0, 255], ["story_state", "剧情状态", 0, 255],
  ],
};


function actorServiceDisplayName(entry) {
  return String(entry?.label || "").trim() || "服务/功能入口";
}

function actorServiceStatusPresentation(entry) {
  const semanticStatus = String(entry?.semantic_status || "").trim();
  if (!entry?.label || !semanticStatus) return null;
  const confirmed = semanticStatus === "confirmed-purpose";
  return {
    id: confirmed ? "confirmed" : "inferred",
    label: confirmed ? "已确认" : "推定",
  };
}

function actorInteractionLabel(record) {
  const selector = Number(record.text_region);
  const argument = Number(record.interaction_or_record_id);
  const mode = actorInteractionMode(record);
  if (mode === "none") return "无主动交互";
  if (mode === "interaction-script") return `交互脚本 ${hex$4(argument, 2)}`;
  if (mode === "direct-dialogue") return `直接对话 ${hex$4(selector, 2)}:${hex$4(argument, 2)}`;
  const service = actorServiceCatalog().find(entry => entry.selector === selector);
  const status = actorServiceStatusPresentation(service);
  return `${actorServiceDisplayName(service)}${status ? `（${status.label}）` : ""} ${
    hex$4(selector, 2)
  } · 参数 ${hex$4(argument, 2)}`;
}



function actorDirectTextRegions() {
  return (state.project.ui?.construction?.script_catalog?.regions || [])
    .filter(region => Number(region.id) > 0 && Number(region.id) < 0x10)
    .sort((left, right) => Number(left.id) - Number(right.id));
}

/**
 * 服务 selector 的已观察参数按当前 actor 超集现算。以前读 npc_catalog 的
 * service 字段：那是提取期快照，场景里改完 actor，这个下拉框的参数还是旧的。
 *
 * parameter_rule 仍来自剧情侧视图——它是 $16/$32 的参数映射规则，属于剧情侧
 * 解出来的语义，不是 actor 字节本身。
 */
function actorServiceCatalog() {
  const observed = new Map();
  const rulesBySelector = new Map();
  const commandsBySelector = new Map();
  for (const command of state.project?.facilities?.applications?.commands || []) {
    const selector = Number(command.command_id);
    if (!Number.isInteger(selector) || commandsBySelector.has(selector)) continue;
    commandsBySelector.set(selector, command);
  }
  for (const npc of state.project.story?.npc_catalog?.records || []) {
    const service = npc.service;
    if (!service?.parameter_rule) continue;
    const selector = Number(service.selector);
    if (!rulesBySelector.has(selector)) rulesBySelector.set(selector, new Set());
    rulesBySelector.get(selector).add(service.parameter_rule);
  }
  for (const record of sceneActorDocument()?.records || []) {
    const selector = Number(record.text_region);
    if (selector < 0x10) continue;
    if (!observed.has(selector)) observed.set(selector, {arguments: new Set(), rules: new Set()});
    const entry = observed.get(selector);
    entry.arguments.add(Number(record.interaction_or_record_id));
    for (const rule of rulesBySelector.get(selector) || []) entry.rules.add(rule);
  }
  return Array.from({length: 0x30}, (_, index) => {
    const selector = 0x10 + index;
    const usage = observed.get(selector);
    const command = commandsBySelector.get(selector);
    return {
      selector,
      label: String(command?.label || "").trim(),
      kind: String(command?.kind || "").trim(),
      semantic_status: String(command?.semantic_status || "").trim(),
      arguments: [...(usage?.arguments || [])].sort((left, right) => left - right),
      rules: [...(usage?.rules || [])],
    };
  });
}

function actorServiceRuleLabel(rule) {
  if (rule === 'selector-32-remaps-byte-4-through-$1A:$BD88')
    return '参数先通过 $1A:$BD88 映射表转换';
  if (rule === 'selector-16-splits-$1A:$BD8D-byte-into-record-and-$05B0')
    return '参数通过 $1A:$BD8D 拆分为记录号与 $05B0 状态';
  return '字节 4 直接作为服务参数';
}



const investigationCommandIds = [0x1B, 0x1C, 0x1D, 0x32, 0x33, 0x1A, 0x2D, 0x35, 0x36, 0x37, 0x38];

function investigationCommandCatalog() {
  const extracted = state.project.scenes?.logic?.investigation_handler_commands || [];
  const authority = state.project.facilities?.investigation?.commands || [];
  return investigationCommandIds.map((commandId, selector) => {
    const source = extracted.find(entry => Number(entry.selector) === selector) || {};
    const command = authority.find(entry => Number(entry.command_id) === commandId);
    const extractedLabel = source.facility_label;
    return {
      ...source,
      selector,
      command_id: commandId,
      selector_hex: hex$4(selector, 2),
      command_id_hex: hex$4(commandId, 2),
      facility_kind: command?.kind || source.facility_kind || "investigation-command",
      facility_label: command?.label || (
        extractedLabel && extractedLabel !== "调查命令"
          ? extractedLabel
          : `调查命令 ${hex$4(commandId, 2)}`
      ),
      semantic_status: command?.semantic_status || source.semantic_status,
      investigation_evidence: command?.evidence || source.investigation_evidence,
    };
  });
}

function investigationCommandEntry(selector) {
  return investigationCommandCatalog().find(entry => Number(entry.selector) === Number(selector)) || null;
}

function investigationConfigurations(commandId) {
  const id = Number(commandId);
  const command = (state.project.facilities?.investigation?.commands || [])
    .find(entry => Number(entry.command_id) === id);
  const known = {
    0x1a: {facility: "jukebox"},
    0x1b: {facility: "vending-machine", family: "item"},
    0x1c: {facility: "vending-machine", family: "ammunition"},
    0x32: {facility: "frog-race"},
  }[id];
  if (!known) return (command?.configuration_family?.records || []).map(record => ({
    ...record, instance_id: Number(record.id),
  }));
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === known.facility);
  return (facility?.configuration?.variants || [])
    .filter(variant => !known.family || variant.family === known.family)
    .map(variant => ({...variant, instance_id: Number(known.family
      ? variant.family_configuration_id : variant.id)}))
    .sort((left, right) => left.instance_id - right.instance_id);
}

function investigationConfigurationLabel(commandId, variant) {
  const prefix = `配置 ${hex$4(variant.instance_id, 2)}`;
  if (Number(commandId) === 0x1a) return `${prefix} · ${(variant.tracks || [])
    .map(track => audioCommandLabel(track.audio_command_id)).join(" / ") || "空曲目表"}`;
  if ([0x1b, 0x1c].includes(Number(commandId))) return `${prefix} · ${(variant.slots || [])
    .slice(0, 3).map(slot => `${investigationProductName(commandId, slot.product_id)}×${slot.amount}`)
    .join(" / ")}`;
  if (Number(commandId) === 0x32) return `${prefix} · 下注 ${variant.price}G`;
  return variant.bytes_hex ? `${prefix} · ${variant.payload_length} B payload` : prefix;
}


function investigationProductName(commandId, productId) {
  const records = Number(commandId) === 0x1B
    ? state.project.game_data?.items?.records || []
    : state.project.game_data?.shells?.records || [];
  return records.find(record => Number(record.id) === Number(productId))?.name
    || `${Number(commandId) === 0x1B ? "道具" : "炮弹"} ${hex$4(productId, 2)}`;
}


function refreshInvestigationDerivedFields(record) {
  const command = investigationCommandEntry(record.handler_selector);
  if (!command) return;
  const selector = Number(command.selector);
  const instanceId = Number(record.instance_id);
  record.handler_selector = selector;
  record.handler_selector_hex = hex$4(selector, 2);
  record.instance_id = instanceId;
  record.instance_id_hex = hex$4(instanceId, 2);
  record.packed_handler_instance = (instanceId << 4) | selector;
  record.packed_handler_instance_hex = hex$4(record.packed_handler_instance, 2);
  record.command_id = Number(command.command_id);
  record.command_id_hex = hex$4(command.command_id, 2);
  record.facility_kind = command.facility_kind;
  record.facility_label = command.facility_label;
  record.semantic_status = command.semantic_status;
  record.investigation_evidence = command.investigation_evidence;
  record.configuration_family_id = Number(command.command_id) >= 0x10 && Number(command.command_id) < 0x20
    ? Number(command.command_id) - 0x10
    : null;
}

// @editor-module 场景图块编辑按笔撤销与重做。

const copyMap = map => map.map(row => [...row]);

function createSceneTileHistory(limit = 50) {
  const undo = [];
  const redo = [];
  let stroke = null;
  return {
    begin(map) {
      stroke = {map: copyMap(map), changed: false};
    },
    changed() {
      if (!stroke || stroke.changed) return;
      undo.push(stroke.map);
      if (undo.length > limit) undo.shift();
      redo.length = 0;
      stroke.changed = true;
    },
    end() {
      stroke = null;
    },
    undo(map) {
      if (stroke || !undo.length) return null;
      redo.push(copyMap(map));
      return undo.pop();
    },
    redo(map) {
      if (stroke || !redo.length) return null;
      undo.push(copyMap(map));
      return redo.pop();
    },
    clear() {
      undo.length = 0;
      redo.length = 0;
      stroke = null;
    },
    get canUndo() { return !stroke && undo.length > 0; },
    get canRedo() { return !stroke && redo.length > 0; },
  };
}

// @editor-module 电梯配置页复用服务流程的楼层构造。

function buildUnknownDynamicListPreview(preview, {familyId, instanceId, choiceIndex = 0} = {}) {
  if (Number(familyId) !== 15) return preview;
  const result = elevatorServicePreview('application-dialogue-flow:1F:segment:00');
  return {...result, selection: preview?.selection,
    runtime_context: {facility_instance: instanceId, choice_index: choiceIndex}};
}

function elevatorFloorPreviewBounds(output, row) {
  const components = output?.components?.filter(component => component.componentId === `elevator-floor:${row}`);
  if (!components?.length) throw new TypeError(`楼层 ${row} 缺少文字组件范围`);
  const left = Math.min(...components.map(component => component.bounds.x));
  const top = Math.min(...components.map(component => component.bounds.y));
  const right = Math.max(...components.map(component => component.bounds.x + component.bounds.width));
  const bottom = Math.max(...components.map(component => component.bounds.y + component.bounds.height));
  return {x: left, y: top, width: right - left, height: bottom - top};
}

// @editor-module 电梯配置提供按游戏选单顺序排列的传送列表。

let activePreview$1 = null;
const sources = new Set(['facility-config', 'ui-facility', 'field-terrain-behavior-service',
  'text-record', 'shared-chr-bank', 'scene-header-map', 'metatile-page', 'metatile-set', 'palette']);

document.addEventListener('field-object-saved', event => {
  const fields = Array.isArray(event.detail?.fields) ? event.detail.fields : [event.detail?.fields];
  if (!activePreview$1?.host.isConnected || !fields.some(field => sources.has(field?.resourceId))) return;
  const {host, elevator, database} = activePreview$1;
  void mountElevatorDestinations(host, elevator, database).catch(error => {
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
  });
});

async function mountElevatorDestinations(host, elevator, database = db) {
  if (!host) return;
  const request = {host, elevator, database};
  activePreview$1 = request;
  const current = () => host.isConnected && activePreview$1 === request;
  const [configuration, facilities, scenes, terrain] = await Promise.all([
    prepareModuleComponent('facility-config', 'reference', {value: elevator.configuration_handle}),
    database.getResourceDocument('ui-facility'),
    database.getDocument('project.scenes'),
    database.getResourceDocument('field-terrain-behavior-service'),
  ]);
  if (!current()) return;
  if (configuration.error) throw new Error(configuration.error);
  if (!configuration.entry) throw new Error(`${elevator.configuration_handle} 缺少电梯配置`);
  if (host.dataset.elevatorParameterInstance !== String(elevator.instance_id)) {
    host.innerHTML = `<h3 data-elevator-formula>目的地参数</h3><div class="scene-elevator-parameters">
      ${[['base', '场景基值'], ['lower', '触发下界 ≥'], ['upper', '触发上界 <']].map(([name, label]) =>
        `<div><label>${label}</label><span data-elevator-parameter="${name}"></span>
          <span data-elevator-parameter-scene="${name}"></span></div>`).join('')}
      </div><div data-elevator-list></div>`;
    for (const [name, resourceId, table] of [
      ['base', 'ui-facility', 'elevator-scene-bases'],
      ['lower', 'field-terrain-behavior-service', 'elevator-scene-lower'],
      ['upper', 'field-terrain-behavior-service', 'elevator-scene-upper'],
    ]) {
      const object = await database.getFieldObject(resourceId, `${resourceId}:${table}`);
      if (!current()) return;
      mountFieldObjectNumber(host.querySelector(`[data-elevator-parameter="${name}"]`), object,
        `value${elevator.instance_id}`, {reset: true, radix: 16, onValue: value => {
          host.querySelector(`[data-elevator-parameter-scene="${name}"]`).textContent =
            scenes.editable_scenes.find(scene => Number(scene.id) === Number(value))?.name || '';
        }});
    }
    host.dataset.elevatorParameterInstance = String(elevator.instance_id);
  }
  const base = uiFacilityElevatorSceneBase(facilities, elevator.instance_id);
  const [lower, upper] = fieldElevatorSceneRanges(terrain)[elevator.instance_id];
  const formula = host.querySelector('[data-elevator-formula]');
  formula.title =
    `触发场景：$${lower.toString(16).toUpperCase().padStart(2, '0')} ≤ 场景编号 < $${upper.toString(16).toUpperCase().padStart(2, '0')}（重叠范围取首个匹配实例）。`
    + `目的地 = (${base} − 选单位置) & 255，选单位置从 0 起算。`
    + `初始选单位置 = (${base} − 当前场景编号) & 255，由代码固定。`
    + `楼层数 = 配置长度前缀 ${configuration.entry.values.length}，受固定容量约束；楼层显示值不决定目的地。`
    + `落点 = (触发 X, (触发 Y + 1) & 255) = (${elevator.x}, ${(elevator.y + 1) & 255})，由代码固定。`;
  const destinations = sceneElevatorDestinations(elevator, configuration.entry.values, facilities, scenes);
  host.querySelector('[data-elevator-list]').innerHTML = `<h3>传送列表</h3><table class="scene-elevator-destinations">
    <thead><tr><th>楼层</th><th>目的地</th></tr></thead><tbody>${destinations.map(row =>
      `<tr data-elevator-destination="${row.selection}" data-elevator-scene="${row.sceneId}" data-elevator-point="${row.x},${row.y}">
        <td><canvas width="40" height="24" data-elevator-floor="${row.value}" data-elevator-row="${row.selection}" aria-label="楼层显示值 ${row.value}"></canvas></td>
        <td>${scenePositionPickerMarkup({entries: scenes.editable_scenes, sceneId: row.sceneId,
          x: row.x, y: row.y, readOnly: true, label: '目的地'})}</td></tr>`).join('')}
    </tbody></table>`;
  host.querySelectorAll('[data-scene-position-picker]').forEach(picker =>
    hydrateScenePositionPicker(picker, {entries: scenes.editable_scenes}));
  for (const canvas of host.querySelectorAll('[data-elevator-floor]')) {
    const surface = document.createElement('canvas');
    surface.width = 256;
    surface.height = 240;
    const row = Number(canvas.dataset.elevatorRow);
    const preview = buildUnknownDynamicListPreview({}, {familyId: 15,
      instanceId: elevator.instance_id, choiceIndex: row});
    const output = await paintUiConstructionSemanticPreview(surface, preview, {isCurrent: current});
    if (!current()) return;
    const bounds = elevatorFloorPreviewBounds(output, row);
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    canvas.getContext('2d').drawImage(surface, bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, canvas.width, canvas.height);
    canvas.dataset.elevatorFloorBounds = JSON.stringify(bounds);
  }
  if (current()) host.dataset.elevatorDestinationsReady = elevator.configuration_handle;
}

// @editor-module 条件入口、触发者与存档事件位的往返链接。

const link = (href, label, role) => href
  ? `<a class="editor-inline-link" data-conditional-entrance-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>`
  : esc(label);

function triggerMarkup(trigger, project) {
  const href = trigger.href || controllerSceneHref(trigger.scene_id, project,
    {object: trigger.object, point: trigger.point});
  return link(href, trigger.label, 'trigger');
}

function conditionalEntranceMarkup(record, project, preview) {
  const condition = record?.appearance_condition;
  if (!condition) return '';
  const active = conditionalEntranceState(record, preview);
  return `<section data-conditional-entrance data-conditional-entrance-key="${esc(record.key || `transition:${record.id}`)}">
    <h3${condition.note ? ` title="${esc(condition.note)}"` : ''}>出现条件 → 状态来源</h3>
    <p>${esc(condition.label)}</p>
    ${condition.persistence ? `<p>${esc(condition.persistence)}${condition.flags.length ? '' : ` → ${condition.triggers
      .map(trigger => triggerMarkup(trigger, project)).join(' · ')}`}</p>` : ''}
    ${condition.flags.map(flag => {
      const triggers = (condition.triggers || []).filter(trigger => trigger.flag === flag)
        .map(trigger => triggerMarkup(trigger, project)).join(' · ');
      return `<p>状态来源：${eventFlagReferenceMarkup(flag, {attributes: 'data-conditional-entrance-link="flag"'})}${
        triggers ? ` → ${triggers}` : ''}</p>`;
    }).join('')}
    <div class="scene-mode-switch" aria-label="入口条件预览">${condition.states.map(row =>
      `<button type="button" class="button ${row.id === active.id ? 'active' : ''}"
        data-conditional-entrance-state="${esc(row.id)}">${esc(row.label)}</button>`).join('')}</div>
    ${condition.destination ? `<p>${triggerMarkup(condition.destination, project)}</p>` : ''}
  </section>`;
}

// @editor-module 潮汐两态使用各自场景的当前值与共用视口绘制器。

let activePreview = null;
document.addEventListener('field-object-saved', event => {
  if (!activePreview?.host.isConnected) return;
  const {host, scene, resourceId, paint} = activePreview;
  const fields = Array.isArray(event.detail?.fields) ? event.detail.fields : [event.detail?.fields];
  if (!fields.some(field => [resourceId, WORLD_TIDE_OWNER, 'scene:00', 'field-scene-lifecycle-service']
    .includes(field?.resourceId))) return;
  const background = fields.find(field => field.entityHandle === `${resourceId}:background`);
  if (background) scene.header_extension[6] = background.value;
  void paint().catch(error => {
    if (host.isConnected) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
  });
});

function worldTideSceneMarkup(sceneId, tide, lifecycle, scenes) {
  const variants = worldTideScenes(tide, lifecycle, sceneId);
  return variants.length ? `<nav class="scene-mode-switch" aria-label="潮汐状态">${variants.map(row => {
    const entry = scenes.editable_scenes.find(scene => Number(scene.id) === row.sceneId);
    return entry ? `<a class="button ${row.sceneId === Number(sceneId) ? 'active' : ''}"
      data-scene-tide-phase="${row.phase}" href="?${esc(new URLSearchParams({view: 'scenes',
        scene: entry.slug}))}">${row.label}</a>` : '';
  }).join('')}</nav>` : '';
}

function worldTidePreviewMarkup(sceneId, tide, lifecycle) {
  return worldTideScenes(tide, lifecycle, sceneId).length
    ? `<section data-scene-tide-preview>${scenePreviewMarkup({label: '潮汐入口视口'})}
        <div data-scene-tide-background></div></section>` : '';
}

async function mountWorldTideScene(sceneId, scene) {
  const host = document.querySelector('[data-scene-tide-preview]');
  if (!host) return;
  const resourceId = `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, '0')}`;
  const canvas = host.querySelector('canvas');
  bindScenePreview({root: host, key: `scene-tide:${sceneId}`});
  const paint = async () => {
    const tide = await db.getResourceDocument(WORLD_TIDE_OWNER);
    const sourceId = `scene:${Number(tide.entrance.scene_id).toString(16).toUpperCase().padStart(2, '0')}`;
    const source = await db.getResourceDocument(sourceId);
    const recordId = Number.parseInt(tide.entrance.resource_id.split(':').at(-1), 16);
    const entrance = source.logic.layers.transitions.point_transitions
      .find(record => Number(record.id) === recordId);
    if (!entrance) throw new TypeError('潮汐入口连接不可用');
    const [cameraX, cameraY] = fieldCameraOrigin(sceneId,
      entrance.destination_x, entrance.destination_y);
    return paintScenePreviewById(canvas, sceneId, {view: 'viewport', cameraX, cameraY,
      isCurrent: () => host.isConnected});
  };
  activePreview = {host, scene, resourceId, paint};
  await paint();
  const fieldObject = await db.getFieldObject(resourceId, `${resourceId}.background`);
  if (!host.isConnected) return;
  await fieldObject.mount(host.querySelector('[data-scene-tide-background]'), {compactIdentity: true});
}

// @editor-module 场景保留对象字段，流程配置只显示摘要与编辑入口。

async function mountSceneInteractionConfigurations(host, object, context, database) {
  if (!host) return;
  const generation = Symbol();
  host.__sceneConfigurationGeneration = generation;
  const current = () => host.isConnected && host.__sceneConfigurationGeneration === generation;
  if (host.__sceneConfigurationSaved) host.__sceneConfigurationSavedTarget
    .removeEventListener('field-object-saved', host.__sceneConfigurationSaved);
  delete host.dataset.sceneInteractionConfigurationsReady;
  if (object.record?.interaction_binding) {
    context = await prepareSceneInteractionBinding(object, context, database);
    if (!current()) return;
    const bound = sceneInteractionBoundObject(object, context);
    if (!bound) throw new TypeError('交互绑定的流程不存在');
    object = {...bound, key: object.key, boundInteraction: true};
    context = {...context, skipInvestigationTakeovers: true};
    const links = (context.referenceHost?.closest('[data-screen-workbench], [data-screen-workbench-page-header]')
      || host.closest('.scene-object-editor'))?.querySelector('[data-scene-destination-links]');
    if (links) links.innerHTML = renderSceneDestinationLinks(object, context);
  }
  const tileAction = object.kind === 'investigation-tile' && Number(object.record.behavior_code) === 0x54;
  const controllers = controllerAt(object, context, context.sceneLogic);
  if (object.kind === 'scene-state' || controllers.length) context = {...context,
    bgm: await database.getResourceDocument(SCENE_REMAP_OWNER)};
  const [facilityConfiguration, battleTest, wantedConfiguration, metatileSets, metatilePages, tileActions] = await Promise.all([
    tileAction ? null : database.getDocument('facility-config'),
    tileAction ? null : database.getDocument('battle-test-point'),
    tileAction ? null : database.getDocument('wanted-record'),
    tileAction ? database.getResourceDocument('metatile-set') : null,
    tileAction ? database.getResourceDocument('metatile-page') : null,
    tileAction ? database.getResourceDocument(TILE_ACTION_OWNER) : null,
  ]);
  if (object.kind === 'actor' && Number(object.record.text_region) === 0 && Number(object.record.interaction_or_record_id)) {
    const id = Number(object.record.interaction_or_record_id);
    const pages = await database.storyPageInteractionEntries();
    context = {...context, storyPageInteractions: pages};
    if (pages.some(page => page.id === id)) {
      const links = host.closest('.scene-object-editor')?.querySelector('[data-scene-destination-links]');
      if (current() && links) links.innerHTML = renderSceneDestinationLinks(object, context);
    } else {
      const handle = `story-interaction-script:script:${id.toString(16).toUpperCase().padStart(2, '0')}`;
      const field = await database.getField('story-interaction-script', handle, 'bytecode');
      context = {...context, changedInteractionScripts: new Set(field.hasOverride ? [id] : [])};
    }
  }
  if (!current()) return;
  context = {...context, facilityConfiguration, battleTest, wantedConfiguration,
    metatileSets: metatileSets || context.metatileSets, metatilePages, tileActions};
  if (object.kind === 'actor') context.autonomous = await prepareStorySceneActions([object.record],
    await database.getResourceDocument('story-autonomous-script'), context.story, database);
  if (!current()) return;
  const {requests, gaps, unresolved} = sceneOwnedInteractionConfigurations(object, context);
  const inspector = host.closest('.scene-object-editor');
  const summaries = new Set();
  host.replaceChildren();
  context.referenceHost?.replaceChildren();
  for (const gap of [...gaps, ...unresolved]) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(gap)}</p>`);
  for (const request of requests) {
    if (!current() || request.existingInspector) continue;
    const battle = host.closest('.scene-object-editor')?.querySelector('[data-scene-battle-entry]');
    if (battle && request.resourceId === 'battle-test-point' && request.handle?.startsWith('encounter-formation:')) continue;
    const group = `${request.resourceId}/${request.href}`;
    if (!sceneConfigurationStays(request, object) && summaries.has(group)) continue;
    summaries.add(group);
    const section = document.createElement('section');
    section.dataset.sceneInteractionConfiguration = `${request.resourceId}/${request.handle}`;
    (context.referenceHost && !sceneConfigurationStays(request, object)
      ? context.referenceHost : host).append(section);
    try {
      const objects = await database.getFieldObjects(request.resourceId);
      if (!current()) return;
      const candidates = objects.filter(candidate => request.handle == null
        || candidate.fields.some(field => field.entityHandle === request.handle));
      if (sceneConfigurationStays(request, object)) {
        section.innerHTML = `<p>${esc(request.label)}</p>`;
        for (const candidate of candidates) {
          const controls = document.createElement('div');
          section.append(controls);
          await candidate.mount(controls, {rowHandles: request.handle == null ? undefined : [request.handle],
            suppressedFieldKeys: new Set(candidate.fields.filter(field => request.fields
              && !request.fields.includes(field.fieldName)).map(field =>
              JSON.stringify([field.resourceId, field.entityHandle, field.fieldName]))),
            compactIdentity: true, stacked: true,
            metatileResourceId: `scene:${Number(object.sceneId).toString(16).toUpperCase().padStart(2, '0')}`});
        }
      } else {
        const related = requests.filter(row => `${row.resourceId}/${row.href}` === group);
        const fields = objects.flatMap(candidate => candidate.fields.filter(field => !field.readOnly
          && field.fieldName !== 'script_pointer_cpu'
          && related.some(row => (row.handle == null || field.entityHandle === row.handle)
            && (!row.fields || row.fields.includes(field.fieldName)))));
        const summary = battle && request.resourceId === 'battle-test-point' ? '' : request.resourceId === 'text-record' ? currentTextReference(request.handle).label
          : request.resourceId.startsWith('story-') ? context.story?.[request.resourceId.includes('autonomous')
            ? 'autonomous' : 'interaction']?.entries?.find(entry =>
              Number(entry.id) === parseInt(request.handle.split(':').at(-1), 16))?.label
          : fields.map(field => `${objects.flatMap(candidate => candidate.definition.editor?.columns || [])
            .find(column => column.name === field.fieldName)?.label || field.fieldName} ${Array.isArray(field.value)
            ? `${field.value.length} 项` : field.value}`).join(' · ');
        const caption =
          [[...new Set(related.map(row => row.condition).filter(Boolean))].join(' / '), related.length > 1 && request.resourceId === 'battle-test-point'
            ? request.label.replace(/ · 槽 \d+$/u, '') : request.label,
            context.referenceHost ? '' : summary?.replace(/\s+/gu, ' ')]
            .filter(Boolean).join(' · ');
        const link = request.handle?.startsWith('encounter-formation:')
          ? `<a class="editor-inline-link" data-resource-target="${esc(request.handle.split(':').slice(0, 2).join(':'))}" href="${esc(request.href)}" aria-label="跳转到 ${esc(request.label)}">↗</a>`
          : request.href ? `<a class="editor-inline-link" data-scene-destination="${esc(request.href)}" href="${esc(request.href)}" aria-label="跳转到 ${esc(request.label)}">↗</a>` : '';
        section.innerHTML = `<p class="scene-content-note scene-configuration-note" title="${esc(caption)}"><span>${esc(caption)}</span> ${link}</p>`;
        if (!request.href) throw new Error(`${request.resourceId}/${request.handle} 缺专页入口`);
      }
    } catch (error) {
      section.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error?.message || error)}</p>`);
    }
  }
  for (const row of controllerSceneRemaps(controllers, context.bgm)) {
    const sceneId = Number.parseInt(row.target_scene_reference.split(':').at(-1), 16);
    const preview = document.createElement('section');
    preview.dataset.sceneSwitchPreview = row.handle;
    preview.innerHTML = `<p>${esc(row.source_scene_reference)} · ${esc(row.global_event_flag_reference)} = 1 · 保留玩家位置${
      row.source_scene_reference === `scene:${Number(object.sceneId).toString(16).toUpperCase().padStart(2, '0')}`
        ? '' : ' · 来源不匹配当前场景'}</p>`
      + [['当前格调查', object.record.y], ['朝上调查前方格', object.record.y + 1]].map(([label, y]) =>
        `<p>${esc(label)}</p>` + scenePositionPickerMarkup({entries: context.scenes.editable_scenes, sceneId,
          x: object.record.x, y, label, disabled: true})).join('');
    host.append(preview);
    for (const picker of preview.querySelectorAll('[data-scene-position-picker]'))
      hydrateScenePositionPicker(picker, {entries: context.scenes.editable_scenes});
  }
  const action = sceneTileAction(object, context);
  if (action) {
    const previewActive = context.actionPreview?.key === object.key
      && Number(context.actionPreview.sceneId) === Number(object.sceneId);
    const arrival = action.transition && sceneTileActionArrival(action.transition, context.scenes, context.logicIndex);
    const arrivalMarkup = arrival ? `<p>${action.behavior?.code === 13 ? '踩入' : '同格入口'} → <a class="editor-inline-link" data-scene-action-arrival href="${esc(arrival.href)}">${esc(arrival.scene.name)} (${arrival.x}, ${arrival.y}) ↗</a></p>` : '';
    if (context.referenceHost) context.referenceHost.insertAdjacentHTML('beforeend', arrivalMarkup);
    const summary = document.createElement('div');
    summary.dataset.sceneTileAction = object.key;
    summary.innerHTML = `${action.behavior ? `<p>行为 · ${esc(action.behavior.label)}</p>` : ''}
      ${context.referenceHost ? '' : arrivalMarkup}
      <p>持久状态 · ${esc(action.persistence.label)}</p>
      ${context.referenceHost ? '' : `<label><input type="checkbox" data-scene-action-preview${previewActive ? ' checked' : ''}>调查后</label>`}`;
    host.append(summary);
    summary.querySelector('[data-scene-action-preview]')?.addEventListener('change', event => {
      context.onActionPreview?.(event.target.checked ? {key: object.key, sceneId: Number(object.sceneId),
        x: Number(object.record.x), y: Number(object.record.y), metatileId: Number(action.replacement_metatile)} : null);
    });
    if (previewActive && !context.referenceHost) context.onActionPreview?.({key: object.key,
      sceneId: Number(object.sceneId), x: Number(object.record.x), y: Number(object.record.y),
      metatileId: Number(action.replacement_metatile)});
  }
  if (object.kind === 'transition') {
    const origins = await sceneTileActionOrigins(object, context, database);
    if (!current()) return;
    if (origins.length) host.insertAdjacentHTML('beforeend', `<section data-scene-action-origins><h3>调查入口</h3>${origins.map(origin =>
      `<p><a class="editor-inline-link" data-scene-action-origin href="${esc(origin.href)}">${esc(origin.handle)} (${origin.x}, ${origin.y}) ↗</a></p>`).join('')}</section>`);
  }
  let actorStateRefresh = null;
  host.__sceneConfigurationSaved = event => {
    const fields = Array.isArray(event.detail.fields) ? event.detail.fields : [event.detail.fields];
    if (current() && fields.some(field => field.resourceId === WORLD_TIDE_OWNER)
        && context.onTideChange)
      void context.onTideChange().catch(error => host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error?.message || error)}</p>`));
    if (current() && fields.some(field => field.resourceId === 'story-autonomous-script')
        && context.onActorStateChange && !actorStateRefresh)
      actorStateRefresh = context.onActorStateChange()
        .catch(error => host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error?.message || error)}</p>`))
        .finally(() => {actorStateRefresh = null;});
    if (tileAction) for (const field of fields) {
      const path = field.documentPath;
      if (field.resourceId !== `scene:${Number(object.sceneId).toString(16).toUpperCase().padStart(2, '0')}`
        || path?.[0] !== 'logic') continue;
      const parent = path.slice(1, -1).reduce((node, key) => node?.[key], context.sceneLogic);
      if (parent) parent[path.at(-1)] = field.value;
    }
    if (current() && fields.some(field => ['facility-config', 'story-interaction-script', 'wanted-record'].includes(field.resourceId)
      || field.resourceId === SCENE_REMAP_OWNER
      || (tileAction && (field.resourceId === TILE_ACTION_OWNER || field.entityHandle.includes(':transition:')))
      || (tileAction && ['metatile-page', 'metatile-set', 'audio-command'].includes(field.resourceId))
      || (field.resourceId === 'battle-test-point' && field.fieldName === 'encounter_id')))
      void mountSceneInteractionConfigurations(host, object, context, database)
      .catch(error => host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error?.message || error)}</p>`));
  };
  host.__sceneConfigurationSavedTarget = tileAction || object.kind === 'actor' ? inspector || host : host;
  host.__sceneConfigurationSavedTarget.addEventListener('field-object-saved', host.__sceneConfigurationSaved);
  consolidateSceneDestinationLinks(host.closest('.scene-object-editor'));
  consolidateSceneDestinationLinks(context.referenceHost?.closest('[data-screen-workbench], [data-screen-workbench-page-header]'));
  host.dataset.sceneInteractionConfigurationsReady = object.key;
}

// @editor-module 剧情目录声明的场景关联投影。

const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function sceneRelatedStories(sceneId, story) {
  const sequences = new Map((story?.browser_vm?.sequences || []).map(row => [row.id, row]));
  return (story?.cutscene_inventory?.entries || []).filter(row =>
    row.scene_ids?.includes(Number(sceneId))
  ).map(row => {
    const sequence = sequences.get(row.id);
    const relations = [];
    if (sequence?.interaction_trigger) {
      relations.push(`角色交互 · 角色 ${hex$1(sequence.entry_variant_id)}·${hex$1(sequence.interaction_trigger.actor_record_id)}`);
    }
    if (sequence?.kind === "scene-entry-story-sequence"
      || row.entry_evidence?.startsWith("scene-loaded-autonomous-script")) relations.push("进场");
    if (row.entry_evidence?.includes("coordinate-gated")) relations.push("坐标触发");
    if (row.entry_evidence?.includes("interaction-bootstrap")) relations.push("交互启动");
    if (row.entry_evidence?.includes("investigation")) relations.push("调查");
    if (row.player_control_disabled) relations.push("控制锁");
    if (row.scene_ids.length > 1) relations.push("跨场景演出");
    if (!relations.length) relations.push("场景动作");
    const view = storyViewForSequenceId(row.id) || "story-sequence";
    const page = storyPageDefinitionForView(view);
    return {id: row.id, key: `related-story:${row.id}`, handle: `story-sequence:${row.id}`,
      label: sequence?.trigger_label ? sequence.label
        : page?.sequenceId ? page.title : row.label || sequence?.label || row.id, relations,
      href: `?view=${encodeURIComponent(view)}&storySequence=${encodeURIComponent(row.id)}&storyPaused=1`};
  });
}

// @editor-module 场景进场剧情与关联剧情共用只读详情和剧情页入口。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

function renderSceneStoryInspector(item, extraMarkup = "") {
  const story = state.project.story || {};
  const sceneId = state.sceneEntry.id;
  const sequence = story.browser_vm?.sequences?.find(row => row.id === item.id);
  const inventory = story.cutscene_inventory?.entries?.find(row => row.id === item.id);
  const entry = sceneEntryStoryItemsForProject(sceneId, story).find(row => row.id === item.id);
  const event = story.browser_vm?.entry_events?.find(row => row.sequence_id === item.id);
  const related = sceneRelatedStories(sceneId, story).find(row => row.id === item.id);
  const view = storyViewForSequenceId(item.id) || "story-sequence";
  const page = storyPageDefinitionForView(view);
  const href = `?${new URLSearchParams({view, storySequence: item.id, storyPaused: "1"})}`;
  const actors = sequence?.trigger_actor_handles || (sequence?.interaction_trigger
    ? [`scene-actor:${hex(sequence.entry_variant_id)}:${hex(sequence.interaction_trigger.actor_record_id)}`]
    : []);
  const owners = actors.length ? actors : (inventory?.actor_list_ids || sequence?.variant_ids || [])
    .map(id => `scene-actor-list:${hex(id)}`);
  const trigger = item.trigger || entry?.trigger || event?.trigger
    || (sequence?.interaction_trigger ? "与所属角色交互" : "—");
  const relations = item.relations || related?.relations || [];
  const summary = sequence?.shots?.length ? `${sequence.shots.length} 幕演出` : "";
  const location = physicalLocationMarkup({rows: (event?.evidence_prg_offsets || [])
    .map((offset, index) => ({label: `进场证据 ${index + 1}`, address: {space: "prg", offset}}))});
  return `<div class="scene-object-editor scene-link-inspector" data-scene-story="${esc(item.id)}"${
    item.key.startsWith("related-story:") ? ` data-scene-related-story="${esc(item.id)}"` : ""}>
    <h2>剧情详情</h2>
    ${fields([
      ["剧情名", `${esc(item.label)}<br>${handleMarkup(`story-sequence:${item.id}`)}`],
      ["触发条件", esc(trigger.replace('剧情状态 $0481=', '剧情状态 ')
        .replace(' 时选择特殊角色表 ', ' · 特殊角色表 '))],
      ["角色或入口", owners.map(handleMarkup).join(" · ") || "—"],
      ...(summary ? [["摘要", esc(summary)]] : []),
    ])}
    <p><a class="record-link" data-scene-story-link href="${esc(href)}"
      aria-label="剧情编辑页" title="${esc(page?.description || '剧情编辑页')}">↗</a></p>
    ${relations.length ? `<p>${esc(relations.join(" · "))}</p>` : ""}
    ${extraMarkup}${location}</div>`;
}

// @editor-module 场景进场时可到达的剧情入口。

function sceneEntryStoryItems(sceneId) {
  return sceneEntryStoryItemsForProject(sceneId, state.project.story || {});
}

function renderSceneEntryStoryInspector(item) {
  return renderSceneStoryInspector(item, renderSceneInteractionLinks(item, "entry-story")
    + `<div data-scene-interaction-configurations="${esc(item.key)}"></div>`);
}

// @editor-module 左栏选中关联剧情后显示其只读详情与跳转。

function renderSceneRelatedStoryInspector(item) {
  return renderSceneStoryInspector(item);
}

// @editor-module 场景音乐入口与试听。

let preview = null;

function sceneBgmItems(sceneId, document) {
  return sceneBgmItemsForProject(sceneId, document, state.project.scenes, audioCommandLabel,
    db.peekResourceDocument(`scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, "0")}`, null));
}

function renderSceneBgmInspector(item) {
  const condition = item.key.startsWith('bgm:world:')
    ? Number(item.id) === 24 ? '任一人物乘车' : '全员步行'
    : item.key === 'bgm:default' ? '默认曲目' : item.condition.split('；')[0];
  const note = item.key.startsWith('bgm:world:') ? '' : item.condition.split('；').slice(1).join('；');
  return `<div class="scene-object-editor scene-link-inspector"><h2>BGM · ${esc(item.label)}</h2>
    <p${note ? ` title="${esc(note)}"` : ''}>${eventFlagTextMarkup(condition)}</p><p><a class="record-link" href="?view=audio&amp;record=${
      encodeURIComponent(`audio-command:${hex$4(item.id, 2).slice(2)}`)}" title="audio-command:${hex$4(item.id, 2).slice(2)}">${esc(audioCommandLabel(item.id))} ↗</a>
      <button type="button" class="button ghost" data-scene-bgm-play="${item.id}">试听</button></p>
    <p data-scene-bgm-status role="status" aria-live="polite"></p>
    <div data-scene-interaction-configurations="${esc(item.key)}"></div></div>`;
}

async function bindSceneBgm() {
  const previous = preview;
  preview = null;
  if (previous) void previous.dispose();
  const status = document.querySelector("[data-scene-bgm-status]");
  const button = document.querySelector("[data-scene-bgm-play]");
  if (!button) return;
  const id = Number(button.dataset.sceneBgmPlay);
  const label = audioCommandLabel(id);
  button.disabled = true;
  if (status) status.textContent = `载入曲目 ${label}…`;
  try {
    await prepareViewData("audio");
    if (!button.isConnected) return;
    const audio = state.project.audio;
    if (!audio?.sequence_graph || !audio?.playback) throw new Error("缺少音频试听数据");
    await ensureSequenceExecutions(audio);
    if (!button.isConnected) return;
    const synth = createNesApuSynth(audio, {volume: 0.75, maxPreviewSeconds: 120,
      dpcmGatePolicy: "assume-open"});
    preview = synth;
    synth.subscribe(snapshot => {
      const active = ["rendering", "playing"].includes(snapshot.status);
      button.textContent = active ? "停止" : "试听";
      button.setAttribute("aria-pressed", String(active));
      if (!status) return;
      if (snapshot.status === "playing") status.textContent = `正在试听曲目 ${label}`;
      else if (snapshot.status === "rendering") status.textContent = `正在合成曲目 ${label}…`;
      else if (snapshot.status === "stopped") status.textContent = `已停止曲目 ${label}`;
      else if (snapshot.status === "ended") status.textContent = `试听完成 ${label}`;
      else if (["blocked", "unplayable", "error"].includes(snapshot.status)) {
        status.textContent = `试听失败：${snapshot.error || snapshot.reason || "无法播放"}`;
      } else status.textContent = "";
    });
    button.addEventListener("click", async () => {
      if (["rendering", "playing"].includes(synth.state.status)) {
        synth.stop();
        return;
      }
      try {
        // 点击直接启动 AudioContext，不在用户手势前等待取数或释放旧播放器。
        const result = await synth.playCommand(id, {
          maxSeconds: 120, dpcmGatePolicy: "assume-open",
        });
        if (!result.ok && result.status !== "cancelled") {
          throw new Error(result.error || result.reason || "无法播放");
        }
      } catch (error) {
        editorLog.error("场景", `操作失败：${error?.message || error}`, error);
        if (status) status.textContent = `试听失败：${error?.message || error}`;
      }
    });
    button.disabled = false;
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (button.isConnected && status) status.textContent = `试听失败：${error?.message || error}`;
  }
}

// @editor-module 场景角色字段对象的形象控件。

async function mountSceneActorAppearance(host, object, {entityHandle, record, scene}) {
  const descriptor = sceneActorVisualDescriptor(record);
  const moduleId = descriptor.kind === 'actor-motion' ? 'actor-type'
    : descriptor.kind === 'direct-frame' ? 'direct-frame' : 'metasprite';
  const pair = actorAppearanceContextForScene(scene).pair;
  const rows = moduleId === 'actor-type'
    ? [...await actorAppearanceCatalog({entryPoint: ACTOR_ENTRY_SCENE_OBJECT}), {id: 0x3f, motionLabel: '无形象'}]
    : [{id: 0}, ...(await db.getResourceDocument(moduleId)).records];
  if (moduleId === 'actor-type') await db.getDocument('project.visuals');
  if (!host.isConnected) return;
  const items = rows.filter(row => row.id >= 0 && row.id <= 0x3f).map(row => {
    const value = row.id;
    const id = value.toString(16).toUpperCase().padStart(2, '0');
    const handle = (moduleId !== 'actor-type' && value === 0) || (moduleId === 'actor-type' && value === 0x3f)
      ? `0x${id}` : `${moduleId}:${id}`;
    const label = moduleId === 'actor-type' ? row.motionLabel
      : value === 0 ? '不绘制' : moduleId === 'direct-frame' ? '直接帧' : '组合精灵';
    const preview = moduleId === 'actor-type' && value < 0x3f
      ? actorAppearanceCandidatePreview(row, {scale: 2, label})
      : sceneActorVisualMarkup({record: {...record, actor_type: value}, pair,
        label, compact: true});
    return {value, meta: handle, preview,
      label: moduleId === 'actor-type' && value < 0x3f ? actorAppearanceCandidateLabel(row, label) : label,
      filter: `${value} ${handle} ${label}`.toLowerCase()};
  });
  mountFieldObjectChoice(host, object, {entityHandle, fieldName: 'actor_type', label: '形象',
    optionsMarkup: value => `${items.some(item => item.value === value) ? ''
      : `<option value="${esc(value)}" selected>${esc(value)}</option>`}${items.map(item =>
      `<option value="${item.value}"${item.value === value ? ' selected' : ''}>${esc(item.meta)}</option>`).join('')}`,
    pickerMarkup: (value, controlMarkup) => referencePickerMarkup({moduleId, value, items,
      label: '形象', controlMarkup, filterLabel: '搜索形象', filterPlaceholder: '名称／ID',
      className: 'scene-actor-appearance-picker'}),
    paintPreview: hydrateStoryActorVisuals,
  });
}

// @editor-module 场景战斗入口只读投影。

function simulationLink(entry, candidate = entry) {
  const href = battleSimulatorHref(entry, candidate);
  return href ? `<a class="editor-inline-link" data-battle-simulator-link href="${esc(href)}">战斗模拟器 ↗</a>` : '';
}

const hex2 = value => hex$4(Number(value), 2).slice(2);

function actorBattleEntries(actor) {
  const sources = [
    ["interaction", actor.interaction_mode === "interaction-script"
      ? Number(actor.interaction_or_record_id) : null, "交互"],
    ["autonomous", Number(actor.autonomous_script_id), "自主"],
  ];
  return sources.flatMap(([kind, id, trigger]) => {
    if (!Number.isInteger(id)) return [];
    const entry = state.project?.story?.[kind]?.entries?.find(row => Number(row.id) === id);
    const script = state.sceneStoryDocuments?.[kind]?.scripts?.find(row => Number(row.id) === id);
    if (!entry || !script) return [];
    return (entry.reachable_cursors || []).flatMap(cursor => {
      const bytes = script.bytecode || [];
      if (bytes[cursor] !== 0x37 || cursor + 3 >= bytes.length) return [];
      const formationId = Number(bytes[cursor + 1]);
      const flag = Number(bytes[cursor + 2]);
      return [{
        kind: "script", trigger: `${trigger}脚本 $37`,
        scriptKind: kind, scriptId: id, cursor,
        source: `story-${kind}-script:script:${hex2(id)}`,
        sourceHref: `?view=actors&actorPart=story&storyKind=${kind}&record=${id}#story-script-field-object`,
        address: Number(entry.pointer_prg) + cursor,
        formationId, flag, storyState: Number(bytes[cursor + 3]),
      }];
    });
  });
}

function investigationBattleEntry(record, battle) {
  if (!battle) return null;
  const sceneId = Number(state.sceneEntry?.id);
  return {
    kind: "investigation", trigger: "调查图块",
    source: `scene:${hex2(sceneId)}:investigation-tile:${Number(record.id).toString(16).toUpperCase().padStart(4, "0")}`,
    sourceHref: `?view=scenes&scene=${encodeURIComponent(state.sceneEntry.slug)}&sceneMode=logic&sceneObject=investigation-tile:${record.id}`,
    formationId: battle.available ? battle.encounterId : null,
    flag: battle.available ? battle.pendingEventFlag : null,
    summary: battle.available ? battle.summary : null,
  };
}

function coordinateBattleEntry(record) {
  const current = state.sceneWorldEvents?.records?.find(row => Number(row.id) === Number(record?.id));
  if (!current || Number(current.scene_id) !== Number(state.sceneEntry?.id)) return null;
  return {
    kind: "coordinate", trigger: `坐标 ${Number(current.trigger_x)}, ${Number(current.trigger_y)}`,
    recordId: Number(current.id),
    source: `story.world-event:${hex2(current.id)}`,
    sourceHref: "#scene-battle-source",
    formationId: Number(current.encounter_formation_id),
    flag: Number(current.event_flag),
    storyState: Number(current.story_state),
  };
}

function sceneBattleZone() {
  const document = state.sceneEncounter;
  const sceneId = Number(state.sceneEntry?.id);
  if (!document || !Number.isInteger(sceneId) || sceneId === 0) return null;
  const first = Number(document.scene_zones?.first_scene_id);
  const last = Number(document.scene_zones?.last_scene_id);
  if (sceneId < first || sceneId > last) return null;
  const assignment = document.scene_zones.assignments.find(row => Number(row.scene_id) === sceneId);
  return document.zones?.find(row => Number(row.zone_id) === Number(assignment?.zone_id)) || null;
}

function zoneBattleEntry(zone) {
  if (!zone || !Number(zone.zone_id)) return null;
  const entries = (zone.entries || []).filter(row => Number(row.monster_id));
  if (!entries.length) return null;
  const map = state.sceneEncounter?.shared_tables?.entry_event_flag_map || [];
  return {
    kind: "zone", trigger: `遇敌区 ${hex$4(zone.zone_id, 2)} · 按权重抽取候选槽`,
    source: `scene-encounter-zone:zone:${hex2(zone.zone_id)}`,
    sourceHref: `?view=scenes&scene=${encodeURIComponent(state.sceneEntry.slug)}&sceneMode=encounters&encounterZone=${zone.zone_id}`,
    candidates: entries.map(row => ({
      slot: Number(row.slot), monsterId: Number(row.monster_id),
      ...encounterCandidate(row),
      flag: Number(row.slot) >= 10 && Number(row.monster_id) < 0x10
        ? Number(map[Number(row.monster_id)] || 0) : 0,
    })),
  };
}

function sourceLink(entry) {
  return `<a class="editor-inline-link" href="${esc(entry.sourceHref)}"><code>${esc(entry.source)}</code></a>`;
}

function monsterList(formationId) {
  const formations = state.sceneEncounterFormations?.records || state.project.game_data.battle_test.formations;
  const slots = Number.isInteger(formationId) ? encounterFormationGroups(formations, formationId) : [];
  return `<ul class="scene-battle-monsters">${slots.map(slot => {
    const monster = state.project.game_data.monsters.records.find(row => Number(row.id) === slot.monsterId);
    return `<li>${esc(monster?.name || `怪物 ${hex$4(slot.monsterId, 2)}`)} ×${slot.count}</li>`;
  }).join('') || '<li>无有效怪物</li>'}</ul>`;
}

function battleEntryFacts(entry) {
  const flow = entry.storyState == null ? null : battleFlowForStoryState(entry.storyState);
  const candidates = entry.candidates?.map(row => {
    const monster = state.project.game_data.monsters.records.find(item => Number(item.id) === row.monsterId);
    return `<section>${row.kind === 'formation' ? monsterList(Number.parseInt(row.reference.split(':').at(-1), 16))
      : `<p>${esc(monster?.name || hex$4(row.monsterId, 2))}</p>`}${simulationLink(entry, row)}</section>`;
  }).join('');
  const editor = ['coordinate', 'script', 'investigation'].includes(entry.kind)
    ? `<div data-scene-battle-formation="${esc(entry.kind)}"
      data-battle-script-kind="${esc(entry.scriptKind || '')}"
      data-battle-script-id="${esc(entry.scriptId ?? '')}"
      data-battle-cursor="${esc(entry.cursor ?? '')}"
      data-battle-record-id="${esc(entry.recordId ?? '')}"></div>` : '';
  return `${candidates || `${monsterList(entry.formationId)}${simulationLink(entry)}`}
    <details data-scene-battle-interaction><summary>战斗交互</summary>
      ${sourceLink(entry)}${editor}
      ${flow ? `<p>战后${flow.exitMode === 3 ? '继续剧情' : '返回场景'}${flow.clearStoryStateOnExit ? ' · 清空剧情状态' : ''}</p>` : ''}
      ${Number.isInteger(entry.formationId) ? `<button type="button" class="resource-inline-link"
        data-resource-target="encounter-formation:${hex2(entry.formationId)}">编辑编队 ↗</button>` : ''}
    </details>`;
}

function renderSceneBattleEntry(entry) {
  if (!entry) return '';
  return `<section class="scene-battle-entry" data-scene-battle-entry="${esc(entry.source)}">
    ${battleEntryFacts(entry)}</section>`;
}

function renderSceneActorBattleEntries(entries) {
  return entries.map(renderSceneBattleEntry).join('');
}

// @editor-module 场景工作台布局与侧栏

const SCENE_ROOT_SELECTION = 'scene-root';

function sceneRootSelected() {
  return state.sceneEditMode === 'logic' && state.sceneLogicSelection === SCENE_ROOT_SELECTION;
}

function renderSceneRootDetails() {
  const entry = state.sceneEntry;
  const scene = state.scene;
  return `<section data-scene-root-details${sceneRootSelected() ? '' : ' hidden'}>
    <div class="page-global-info scene-identity">
      <b>${esc(entry.id_hex)} · ${esc(entry.name)}</b>
      <span>${scene.width}×${scene.height} CELLS · ${scene.width * 16}×${scene.height * 16} PX</span>
    </div>
    <p>地图 ${handleMarkup(sceneResourceUid(entry), {})}</p>
    <dl>${sceneObjectGroups().map(([layer, title, kind]) => `<div><dt>${esc(title)}</dt><dd>${sceneGroupObjects(layer, kind).length}</dd></div>`).join('')}</dl>
    ${state.sceneEditMode === 'logic' ? renderSceneLayers() : ''}
    ${sceneVariantMarkup(entry.id, scenePickerVariants(state.sceneBgmDocument), state.project.scenes.editable_scenes)}
    <p>元图块集 ${state.sceneMetatileSets.map(record => handleMarkup(record.handle, {})).join(' · ') || '—'}</p>
    ${worldTidePreviewMarkup(entry.id, state.sceneTideDocument, state.sceneBgmDocument)}
    <div class="page-global-info" id="field-step-effects"><b>场景移动效果</b>${renderModuleComponent(
      'field-exploration-runtime', 'movement-effects')}</div>
    <section><h3>音乐</h3>${sceneBgmItems(entry.id, state.sceneBgmDocument).map(item =>
      `<p><a class="editor-inline-link" href="?view=audio&amp;record=${
        encodeURIComponent(`audio-command:${hex$4(item.id, 2).slice(2)}`)}">${esc(item.label)} ↗</a></p>`).join('')}</section>
    ${controlledObjectMarkup(entry.id, {}, state.project)}
    ${hiddenTeleportSceneMarkup(entry.id, {}, state.project)}
    ${sceneConditionMarkup(null, null)}
    <div class="scene-facts"><small>地图编码预算</small><b id="scene-budget">${scene.preview_only ? '世界地图专用' : `${scene.codec.used_tokens} / ${scene.codec.capacity_tokens} 个编码单元`}</b></div>
  </section>`;
}










//
// 来源：拆分前 engine/editor/app.js 第 8921-9122 行。










/** 调查战斗的配置在战斗页编辑。 */
function renderInvestigationBattleFormation(record) {
  const battle = investigationBattleFormation(record);
  if (!battle) return "";
  const entry = renderSceneBattleEntry(investigationBattleEntry(record, battle));
  if (!battle.available) {
    return entry;
  }
  return entry;
}

function sceneDestinationContext() {
  return {
    scenes: state.project.scenes, logicIndex: state.project.scenes.logic,
    facilities: state.project.facilities, story: state.project.story,
    bgm: state.sceneBgmDocument,
    wanted: state.project.wanted, sceneLogic: state.sceneLogic, worldEvents: state.sceneWorldEvents,
    metatileSets: state.sceneElevatorMetatiles?.sets,
    items: state.project.game_data?.items?.records,
  };
}

function renderSceneElevator(record) {
  const selected = {kind: 'elevator', key: `elevator:${record.id}`, record};
  const instance = Number(record.instance_id);
  const configuration = (state.project?.facilities?.configuration_loader?.pointer_entries || [])
    .find(entry => Number(entry.family_id) === 15)?.records
    ?.find(entry => Number(entry.id) === instance);
  return `<div class="scene-elevator-heading"><h2>电梯 · (${record.x},${record.y})</h2>
      <div data-scene-destination-links>${renderSceneDestinationLinks({...selected,
        sceneId: Number(state.sceneEntry.id)}, sceneDestinationContext())}</div></div>
    <p class="scene-elevator-summary">配置实例 <a class="editor-inline-link" title="电梯实例"
      href="?view=shops&amp;shopFamily=15&amp;shopTab=config&amp;shopConfig=${instance}#shop-instance-15-${String(instance).padStart(2, "0")}">0F:${instance.toString(16).toUpperCase().padStart(2, '0')} ↗</a>${configuration
        ? ` · ${Number(configuration.payload_length)} 层` : ""} · 移动进入
      <span class="scene-elevator-handle">${esc(sceneObjectResourceUid(selected))}</span></p>
    <div data-scene-elevator-destinations></div>
    <details class="scene-elevator-controller"><summary>控制器</summary>
      ${sceneControllerMarkup({...selected, sceneId: state.sceneEntry.id}, state.project, state.sceneLogic)}
      ${controlledObjectMarkup(state.sceneEntry.id, {object: selected.key}, state.project)}
      ${hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
      ${sceneConditionMarkup(selected)}
      <div data-scene-field-object="${esc(selected.key)}"></div>
      <div data-scene-object-semantics="${esc(selected.key)}"></div>
      <div data-scene-interaction-configurations="${esc(selected.key)}"></div>
      ${renderSceneInteractionState(record)}${renderSceneInteractionLinks(record, selected.kind)}
    </details>
    <details class="scene-elevator-tile"><summary>触发格图块</summary>
      <div class="scene-metatile-preview" data-scene-metatile="${record.x},${record.y}"></div>
      <div data-scene-tile-field-object="${record.x},${record.y}"></div>
    </details>`;
}

function sceneActorInterfaceLink(actor) {
  const service = INTERFACE_PAGE_DEFINITIONS.find(definition =>
    definition.servicePage
      && definition.commandIds.includes(Number(actor.text_region)));
  if (service) return `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=${
    encodeURIComponent(service.id)}">${esc(service.label)} ↗</a>`;
  const page = INTERFACE_PAGE_DEFINITIONS.find(definition =>
    (definition.entryActors || []).some(entry => entry.uid === actor.uid
      && Number(actor.text_region) === 0
      && Number(actor.interaction_or_record_id) === entry.interactionScriptId));
  return page ? `<a class="editor-inline-link" href="?view=interfaceui&amp;interface=${
    encodeURIComponent(page.id)}">${esc(page.label)} ↗</a>` : "";
}

function sceneConditionMarkup(object, point = state.sceneTileSelection) {
  const record = conditionalSceneRecord(object, {sceneId: state.sceneEntry.id,
    autonomous: state.sceneStoryDocuments?.autonomous,
    point, project: state.project, sceneLogic: state.sceneLogic,
    tileActions: state.sceneTileActions, logicIndex: state.project.scenes.logic,
    worldTide: state.sceneTideDocument, worldRaw: state.sceneWorldRaw});
  return conditionalEntranceMarkup(record, state.project,
    state.sceneEntrancePreview?.key === record?.key ? state.sceneEntrancePreview : null);
}

function renderSceneLogicInspector({flow = false} = {}) {
  const bgm = sceneBgmItems(state.sceneEntry.id, state.sceneBgmDocument)
    .find(item => item.key === state.sceneLogicSelection);
  if (bgm) return renderSceneBgmInspector(bgm);
  const story = sceneEntryStoryItems(state.sceneEntry.id)
    .find(item => item.key === state.sceneLogicSelection);
  if (story) return renderSceneEntryStoryInspector(story);
  const related = sceneRelatedStories(state.sceneEntry.id, state.project.story)
    .find(item => item.key === state.sceneLogicSelection);
  if (related) return renderSceneRelatedStoryInspector(related);
  const selected = selectedSceneLogicObject();
  if (selected?.rewrite) return renderSceneMapRewriteInspector(selected.rewrite);
  if (!selected) {
    return controlledObjectMarkup(state.sceneEntry.id, {}, state.project)
      + hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)
      + sceneConditionMarkup(null);
  }
  const directSource = selected.record.source
    || selected.record.attribute_source
    || selected.record.coordinate_source;
  const actorBattles = selected.kind === "actor" ? actorBattleEntries(selected.record) : [];
  const physicalRows = [
    ...(directSource ? [{label: sceneObjectLabel(selected), address: directSource}] : []),
    ...actorBattles.filter(entry => Number.isInteger(entry.address)).map(entry => ({
      label: entry.trigger, address: {space: "prg", offset: entry.address, length: 3},
    })),
  ];
  if (selected.kind === 'elevator') return `<div class="scene-object-editor scene-elevator-editor" tabindex="-1">
    ${renderSceneElevator(selected.record)}
    ${physicalRows.length ? physicalLocationMarkup({rows: physicalRows}) : ""}</div>`;
  let actorAppearance = "";
  let shopConfiguration = '';
  if (selected.kind === "actor") {
    const target = shopConfigurationForActor(selected.record,
      state.project?.facilities?.configuration_loader?.pointer_entries || []);
    if (target) {
      const destinationFamily = target.familyId === 13 ? 0 : target.familyId;
      const configurationHref = target.familyId === 13
        ? '?view=shops&amp;shopFamily=0&amp;shopTab=config'
        : `?view=shops&amp;shopFamily=${destinationFamily}&amp;shopTab=config&amp;shopConfig=${target.recordId}`;
      shopConfiguration = `<p class="scene-content-note"><a class="editor-inline-link"
        data-scene-destination="${configurationHref}" href="${configurationHref}">配置 ${target.recordId} ↗</a></p>
        ${target.familyId === 13 ? '' : `<p class="scene-content-note"><a class="editor-inline-link"
          href="?view=shops&amp;shopFamily=${destinationFamily}&amp;shopTab=ui&amp;shopConfig=${target.recordId}">界面与完整对话 ↗</a></p>`}`;
    }
    const context = actorAppearanceContextForScene(state.scene);
    const appearanceRecord = selected.pose ? {...selected.record, ...selected.pose} : selected.record;
    const descriptor = sceneActorVisualDescriptor(appearanceRecord);
    actorAppearance = `<section class="scene-metasprite-appearance">
      <div data-scene-actor-appearance></div>
      <div class="scene-metasprite-appearance-live">
        ${sceneActorVisualMarkup({record: appearanceRecord, pair: context.pair, label: descriptor.label})}
        <span><b>${esc(descriptor.label)}</b></span>
      </div>
    </section>`;
  }
  const battles = renderSceneActorBattleEntries(actorBattles)
    + (selected.kind === 'event' ? renderSceneBattleEntry(coordinateBattleEntry(selected.record)) : '')
    + (selected.kind === 'investigation-tile' ? renderInvestigationBattleFormation(selected.record) : '');
  return `<div class="scene-object-editor" tabindex="-1">
    ${battles ? `${battles}<details data-scene-battle-configuration><summary>对象配置</summary>` : ''}
    ${flow ? '' : `<div class="scene-object-identity">${handleMarkup(sceneObjectResourceUid(selected), {})} <span>${esc(sceneObjectCoordinateLabel(selected))}</span></div>`}
    ${selected.kind === 'tide' ? `<p>方向 ${['↑', '↓', '←', '→'][selected.record.direction]} · ${eventFlagReferenceMarkup(selected.record.event_flag)}</p>` : ''}
    ${actorAppearance}
    ${flow || selected.kind === 'tide' ? '' : sceneControllerMarkup({...selected, sceneId: state.sceneEntry.id}, state.project, state.sceneLogic)}
    ${flow || selected.kind === 'tide' ? '' : controlledObjectMarkup(state.sceneEntry.id, {object: selected.key}, state.project)}
    ${flow ? '' : hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
    ${sceneConditionMarkup(selected)}
    <div data-scene-field-object="${esc(selected.key)}"></div>
    <div data-scene-object-semantics="${esc(selected.key)}"></div>
    <div data-scene-interaction-configurations="${esc(selected.key)}"></div>
    ${selected.kind === 'treasure' && !state.scene?.preview_only
      && Number(selected.record.x) >= 0 && Number(selected.record.x) < Number(state.scene?.width)
      && Number(selected.record.y) >= 0 && Number(selected.record.y) < Number(state.scene?.height)
      ? `<div class="scene-treasure-appearance"><span title="可作为宝箱外观修改">背景图块</span>
        <div data-scene-tile-field-object="${Number(selected.record.x)},${Number(selected.record.y)}"></div></div>` : ''}
    ${selected.kind === "actor" ? sceneActorInterfaceLink(selected.record) : ""}
    ${shopConfiguration}
    ${renderSceneInteractionState(selected.record)}
    ${flow ? '' : renderSceneInteractionLinks(selected.record, selected.kind)}
    ${flow ? '' : `<div data-scene-destination-links>${renderSceneDestinationLinks({...selected,
      sceneId: Number(state.sceneEntry.id)}, sceneDestinationContext())}</div>`}
    ${physicalRows.length ? physicalLocationMarkup({rows: physicalRows}) : ""}
    ${battles ? '</details>' : ''}
  </div>`;
}

async function sceneObjectSemanticChoices(selected, object, handle) {
  const root = document.querySelector('[data-scene-object-semantics]');
  if (!root) return;
  const record = selected.record;
  if (['actor', 'investigation', 'investigation-special', 'investigation-tile', 'treasure', 'transition', 'boundary'].includes(selected.kind)
      && selected.record.kind !== 'investigation-battle-trigger') {
    const host = document.createElement('div');
    root.append(host);
    await mountSceneActorInteractionPicker(host, object, {entityHandle: handle,
      source: {...selected, sceneId: Number(state.sceneEntry.id)}, context: sceneDestinationContext(),
      candidateFilter: candidate => !state.interactionFlow || Boolean(candidate.object
        && sceneInteractionFlowMatches(sceneInteractionFlowPage(state.interactionFlow), candidate.object)),
      productsForRecord: shopConfigurationProducts,
      regions: actorDirectTextRegions(), services: actorServiceCatalog().map(service =>
        ({...service, ruleLabels: service.rules.map(actorServiceRuleLabel)}))});
  }
  const add = (label, fieldNames, choices, selectedValue, valuesFor, picker = null) => {
    const host = document.createElement('div');
    root.append(host);
    mountFieldObjectRecordChoice(host, object, {entityHandle: handle, fieldNames, label,
      choices, selected: selectedValue, valuesFor, picker});
  };
  if (selected.kind === 'actor') {
    const prepared = await prepareModuleComponent('story-autonomous-script', 'reference');
    if (!root.isConnected) return;
    add('自动动作脚本', ['autonomous_script_id'],
      () => (prepared.entries || []).map(entry => ({value: Number(entry.id),
        label: `story-autonomous-script:script:${Number(entry.id).toString(16).toUpperCase().padStart(2, '0')}`,
        filter: `${entry.id} ${entry.label}`})),
      values => values.autonomous_script_id,
      value => ({autonomous_script_id: Number(value)}), {
        moduleId: 'story-autonomous-script', resettable: true,
        destination: value => interactionEditorHref(`story-autonomous-script:script:${Number(value).toString(16).toUpperCase().padStart(2, '0')}`),
        preview: value => `${interactionEditorLink(interactionEditorHref(`story-autonomous-script:script:${Number(value).toString(16).toUpperCase().padStart(2, '0')}`))}${prepared.entries.find(entry => Number(entry.id) === Number(value))?.pickerDetails || ''}`,
        paint: hydrateModuleComponents,
      });
  } else if (selected.kind === 'investigation') {
    const command = investigationCommandEntry(record.handler_selector);
    const variants = investigationConfigurations(command?.command_id);
    if (variants.length) add('配置实例 / 参数', ['instance_id'],
      () => variants.map(variant => ({value: variant.instance_id,
        label: investigationConfigurationLabel(command.command_id, variant)})),
      values => values.instance_id, value => ({instance_id: Number(value)}));
  } else if (selected.kind === 'treasure') {
    add('内容类型', ['content_id'], () => [
      {value: 'item', label: '物品 / 人物装备 / 战车装备'},
      {value: 'money', label: '金钱奖励'},
      {value: 'buried-vehicle', label: '5 号战车挖掘'},
    ], values => Number(values.content_id) === 0xfb ? 'buried-vehicle'
      : Number(values.content_id) >= 0xf0 ? 'money' : 'item',
    value => ({content_id: value === 'buried-vehicle' ? 0xfb : value === 'money' ? 0xf0 : 1}));
  }
}

const sceneObjectSegments = Object.freeze({
  treasure: ["treasures", "treasure"],
  investigation: ["investigation-points", "investigation"],
  "investigation-special": ["special-investigations", "investigation-special"],
  "investigation-tile": ["investigation-tiles", "investigation-tile"],
  transition: ["point-transitions", "transition"],
  boundary: ["boundary-exits", "boundary"],
  event: ["events", "event"],
});

function sceneObjectFieldRoute(selected) {
  if (selected.kind === "event") return {resourceId: "world-event",
    objectId: "world-event.trigger-tables",
    handle: `story.world-event:${hex$4(Number(selected.record.id), 2).slice(2)}`};
  if (selected.kind === "actor") return {resourceId: SCENE_ACTORS_RESOURCE_ID,
    handle: String(selected.record.uid)};
  if (selected.kind === "vehicle") return {resourceId: "vehicle-preset",
    handle: `vehicle-preset:placement:${hex$4(Number(selected.record.vehicle_slot), 2).slice(2)}`};
  const segment = sceneObjectSegments[selected.kind];
  if (!segment) return null;
  const resourceId = `scene:${hex$4(Number(state.sceneEntry.id), 2).slice(2)}`;
  const width = selected.kind === "investigation-tile" ? 4 : 2;
  return {resourceId, objectId: `${resourceId}.${segment[0]}`,
    handle: `${resourceId}:${segment[1]}:${Number(selected.record.id).toString(16).toUpperCase().padStart(width, "0")}`};
}

function installSceneObjectField(selected, field) {
  const value = field.value;
  if (field.resourceId === "world-event") {
    acceptProjectFieldDraft(state.sceneWorldEvents, [field]);
    for (const logic of [state.sceneLogic, state.sceneOriginalLogic]) {
      const record = logic.layers.event_triggers.find(row => Number(row.id) === Number(field.recordId));
      if (record) record[field.fieldName] = value;
    }
    return;
  }
  if (field.resourceId === SCENE_ACTORS_RESOURCE_ID) {
    const aliases = new Set(sceneActorAliasRecords(state.sceneActors, selected.record.uid)
      .map(record => String(record.uid)));
    acceptProjectFieldDraft(state.sceneActors, [field]);
    state.sceneActorsOriginal = state.sceneActorsOriginal.map(record => aliases.has(String(record.uid))
      ? {...record, [field.fieldName]: value} : record);
    return;
  }
  if (field.resourceId === "vehicle-preset") {
    const slot = Number(selected.record.vehicle_slot);
    for (const draft of [state.vehicleDraft, state.vehicleOriginal]) {
      if (draft?.placement?.[slot]) draft.placement[slot][field.fieldName] = value;
    }
    return;
  }
  const path = field.documentPath;
  if (path?.[0] !== "logic") return;
  for (const document of [state.sceneLogic, state.sceneOriginalLogic]) {
    const local = path.slice(1);
    const parent = local.slice(0, -1).reduce((node, key) => node?.[key], document);
    if (!parent) throw new Error(`场景字段投影不存在：${local.join(".")}`);
    parent[local.at(-1)] = value;
  }
  if (selected.kind === "investigation") {
    const position = Number(path.at(-2));
    refreshInvestigationDerivedFields(state.sceneLogic.layers.investigation_points[position]);
    refreshInvestigationDerivedFields(state.sceneOriginalLogic.layers.investigation_points[position]);
  }
}

async function mountSceneLogicFieldObject(refresh) {
  const host = document.querySelector("[data-scene-field-object]");
  const bgm = sceneBgmItems(state.sceneEntry.id, state.sceneBgmDocument)
    .find(item => item.key === state.sceneLogicSelection);
  const story = sceneEntryStoryItems(state.sceneEntry.id)
    .find(item => item.key === state.sceneLogicSelection);
  const selected = selectedSceneLogicObject() || (bgm && {kind: 'bgm', record: bgm, key: bgm.key})
    || (story && {kind: 'entry-story', record: story, key: story.key});
  if (!selected) return;
  if (selected.rewrite) return;
  if (selected.kind === 'elevator') {
    const preview = document.querySelector('[data-scene-elevator-destinations]');
    preview?.addEventListener('field-object-saved', event => {
      const fields = Array.isArray(event.detail?.fields) ? event.detail.fields : [event.detail?.fields];
      if (!fields.some(field => field?.resourceId === 'field-terrain-behavior-service')) return;
      void loadElevatorMetatiles(db).then(metatiles => {
        if (!preview.isConnected || state.sceneLogicSelection !== selected.key) return;
        state.sceneElevatorMetatiles = metatiles;
        refresh();
      }).catch(error => {
        editorLog.error("场景", `操作失败：${error?.message || error}`, error);
        if (preview.isConnected) preview.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
      });
    });
    void mountElevatorDestinations(preview, selected.record).catch(error => {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      if (preview?.isConnected) preview.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
    });
  }
  const configurations = mountSceneInteractionConfigurations(document.querySelector('[data-scene-interaction-configurations]'),
    {...selected, sceneId: Number(state.sceneEntry.id)}, {
      scenes: state.project.scenes, logicIndex: state.project.scenes.logic,
      facilities: state.project.facilities, story: state.project.story,
      wanted: state.project.wanted, sceneLogic: state.sceneLogic, worldEvents: state.sceneWorldEvents,
      metatileSets: state.sceneElevatorMetatiles?.sets,
      items: state.project.game_data?.items?.records,
      referenceHost: state.interactionFlow ? document.querySelector('[data-scene-flow-references]') : null,
      actionPreview: state.sceneTileActionPreview,
      worldTide: state.sceneTideDocument,
      onTideChange: async () => {
        state.sceneTideDocument = await db.getResourceDocument(WORLD_TIDE_OWNER, null);
        refresh();
      },
      onActorStateChange: async () => {
        state.sceneStoryDocuments.autonomous = await prepareStorySceneActions(state.sceneActors.records.filter(row =>
          Number(row.entry_id) === Number(state.sceneEntry.id)),
          await db.getResourceDocument('story-autonomous-script', null), state.project.story, db);
        refresh();
      },
      onActionPreview: preview => {
        if (JSON.stringify(state.sceneTileActionPreview) === JSON.stringify(preview)) return;
        state.sceneTileActionPreview = preview;
        refresh();
      },
    }, db).catch(error => {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      const root = document.querySelector('[data-scene-interaction-configurations]');
      if (root) root.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
    });
  if (state.interactionFlow) {
    await configurations;
    bindInternalPageLinks(document.querySelector('[data-screen-workbench-page-header]') || host);
  }
  if (!host) return;
  const route = sceneObjectFieldRoute(selected);
  if (!route) return;
  try {
    const objects = await db.getFieldObjects(route.resourceId);
    if (!host.isConnected || state.sceneLogicSelection !== selected.key) return;
    const object = objects.find(candidate => candidate.id === route.objectId
      || (!route.objectId && candidate.fields.some(field => field.entityHandle === route.handle
        || field.entityAliases?.includes(route.handle))));
    const field = object?.fields.find(candidate => candidate.entityHandle === route.handle
      || candidate.entityAliases?.includes(route.handle));
    if (!field) throw new Error(`${route.handle} 没有已发布字段对象`);
    const inspector = host.closest('.scene-object-editor');
    inspector.addEventListener("field-object-saved", event => {
      if (!inspector.isConnected || state.sceneLogicSelection !== selected.key) return;
      try {
        const changed = Array.isArray(event.detail.fields)
          ? event.detail.fields : [event.detail.fields];
        const relevant = changed.filter(item => item.entityHandle === field.entityHandle);
        if (!relevant.length) return;
        relevant.forEach(item => installSceneObjectField(selected, item));
        refreshSceneDraftDirty();
        refresh();
      } catch (error) {
        host.insertAdjacentHTML("afterbegin", `<p role="alert">${esc(error?.message || error)}</p>`);
      }
    });
    const mapAction = selected.kind === 'investigation-tile' && Number(selected.record.behavior_code) === 0x54;
    const behaviorKey = JSON.stringify([route.resourceId, field.entityHandle, 'behavior_code']);
    const semanticFields = selected.kind === 'event' ? ['encounter_formation_id'] : selected.kind === 'actor'
      ? ['actor_type', 'text_region', 'interaction_or_record_id', 'autonomous_script_id', 'interaction_binding']
      : selected.kind === 'investigation' ? ['handler_selector',
        'interaction_binding',
        ...(investigationConfigurations(investigationCommandEntry(selected.record.handler_selector)?.command_id).length
          ? ['instance_id'] : [])] : ['interaction_binding'];
    const suppressedFieldKeys = new Set(semanticFields.map(name =>
      JSON.stringify([route.resourceId, field.entityHandle, name])));
    if (mapAction) suppressedFieldKeys.add(behaviorKey);
    await object.mount(host, {rowHandles: [field.entityHandle], compactIdentity: true, stacked: true,
      suppressedFieldKeys});
    if (selected.kind === 'actor') await mountSceneActorAppearance(
      inspector.querySelector('[data-scene-actor-appearance]'), object,
      {entityHandle: field.entityHandle, record: selected.record, scene: state.scene});
    if (mapAction && host.isConnected) {
      const physical = inspector.querySelector('[data-physical-location]');
      const controls = document.createElement('div');
      controls.dataset.sceneActionBehavior = selected.key;
      physical?.append(controls);
      let mounted = false;
      const showBehavior = () => {
        if (!physical.open || mounted || !controls.isConnected) return;
        mounted = true;
        void object.mount(controls, {rowHandles: [field.entityHandle], compactIdentity: true, stacked: true,
          suppressedFieldKeys: new Set(object.fields.filter(item => item.fieldName !== 'behavior_code')
            .map(item => JSON.stringify([item.resourceId, item.entityHandle, item.fieldName])))})
          .catch(error => {editorLog.error("场景", `操作失败：${error?.message || error}`, error); return controls.innerHTML = `<p role="alert">${esc(error.message)}</p>`;});
      };
      physical?.addEventListener('toggle', showBehavior);
      if (physical) showBehavior();
    }
    if (host.isConnected && state.sceneLogicSelection === selected.key) {
      await sceneObjectSemanticChoices(selected, object, field.entityHandle);
      const semantics = inspector.querySelector('[data-scene-object-semantics]');
      if (semantics?.isConnected) semantics.dataset.sceneBindingsReady = selected.key;
      consolidateSceneDestinationLinks(inspector);
    }
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

/** 本场景里初始停放的载具数。 */
function vehiclePlacementCount() {
  const sceneId = Number(state.sceneLogic?.scene_id);
  return Object.values(state.vehicleDraft?.placement || {})
    .filter(record => record.placed && Number(record.scene_id) === sceneId)
    .length;
}

function renderSceneLayers() {
  const summary = state.sceneLogic.summary;
  const variants = state.sceneLogic.layers.actors.dynamic_variants.length;
  return `<div class="scene-layer-bar">${[
    ['actors', '场景角色', sceneLogicObjects().filter(item => item.kind === 'actor').length],
    ['treasures', '宝箱与调查物', summary.treasures],
    ['investigations', '调查交互', sceneInvestigationLayerCount(summary)],
    ['transitions', state.scene.kind === 'world-map' ? '地点入口' : '入口与传送',
      summary.point_transitions + summary.boundary_exits + sceneElevatorPoints(state.scene, state.sceneElevatorMetatiles).length],
    ['events', '事件与地图改写', sceneLogicObjects().filter(item => item.layer === 'events').length],
    ['vehicles', '战车初始位置', vehiclePlacementCount()],
  ].map(([layer, label, count]) => `<label class="logic-layer ${layer}"><input type="checkbox"
    data-scene-layer="${layer}"${state.sceneLayers[layer] ? ' checked' : ''}> ${label} <b>${count}</b></label>`).join('')}
    ${variants ? `<span class="scene-variant-note" title="由事件标志选择替换角色表">替换角色表 ${variants} 组</span>` : ''}</div>`;
}

function sceneObjectGroups() {
  const transitionTitle = state.scene?.kind === "world-map"
    ? "城镇、洞穴及其他地点入口"
    : "门、楼梯与坐标传送";
  return [
    ["actors", "场景角色（NPC）", "actor"],
    ["treasures", "宝箱与调查物", "treasure"],
    ["investigations", "设施调查点", "investigation"],
    ["investigations", "专用调查点", "investigation-special"],
    ["investigations", "图块调查点", "investigation-tile"],
    ["transitions", transitionTitle, "transition"],
    ["transitions", "电梯", "elevator"],
    ["transitions", "边界出口", "boundary"],
    ["events", "坐标事件", "event"],
    ["events", "潮汐触发", "tide"],
    ["events", "事件地图改写", "map-rewrite"],
    ["events", "进场状态", "scene-state"],
    ["vehicles", "战车初始位置", "vehicle"],
  ];
}

function sceneGroupObjects(layer, kind) {
  return sceneLogicObjects().filter(item => item.layer === layer && (
    kind === 'boundary' ? item.kind.startsWith('boundary') : item.kind === kind
  ));
}

function renderSceneObjectList() {
  const groups = sceneObjectGroups();
  const objects = sceneLogicObjects();
  const links = [
    ["BGM", sceneBgmItems(state.sceneEntry.id, state.sceneBgmDocument)],
    ["进场剧情", sceneEntryStoryItems(state.sceneEntry.id)],
    ["关联剧情", sceneRelatedStories(state.sceneEntry.id, state.project.story)],
  ];
  const actorBattles = objects.filter(item => item.kind === "actor"
    && actorBattleEntries(item.record).length);
  const investigationBattles = objects.filter(item => item.kind === "investigation-tile"
    && investigationBattleFormation(item.record));
  const coordinateBattles = objects.filter(item => item.kind === "event"
    && coordinateBattleEntry(item.record));
  const zones = state.sceneEntry?.id === 0
    ? [...new Set((state.sceneEncounter?.world_grid?.blocks || [])
      .map(block => Number(block.zone_id)))].map(id => state.sceneEncounter?.zones?.[id]).filter(Boolean)
    : [sceneBattleZone()].filter(Boolean);
  const zoneBattles = zones.map(zoneBattleEntry).filter(Boolean);
  return `<div class="scene-object-list" id="scene-object-list">
    <button type="button" class="scene-object-row scene-link-row ${sceneRootSelected() ? 'active' : ''}"
      data-scene-object="${SCENE_ROOT_SELECTION}" aria-pressed="${sceneRootSelected()}">
      <i class="logic-dot"></i><span><b>${esc(storyComponentLabel(state.sceneEntry.name))}</b></span></button>
    ${groups.map(([layer, title, kind]) => {
    const records = sceneGroupObjects(layer, kind);
    return `<details open><summary>${esc(title)}</summary>
      ${records.length ? records.map(item => {
        const row = `<div class="scene-object-row ${state.sceneLogicSelection === item.key ? "active" : ""}" role="button" tabindex="0" data-scene-object="${esc(item.key)}">
          <i class="logic-dot ${esc(item.kind)}"></i><span><b>${esc(sceneObjectTreeLabel(item))}</b></span>
        </div>`;
        return row;
      }).join("") : ``}
    </details>`;
  }).join("")}${links.map(([title, items]) => `<details open><summary>${title}</summary>${
    items.map(item => `<button type="button" class="scene-object-row scene-link-row ${
      state.sceneLogicSelection === item.key ? "active" : ""}" data-scene-object="${esc(item.key)}">
      <i class="logic-dot"></i><span><b>${esc(item.id != null && /story:/u.test(item.key)
        ? storySequenceComponentLabel(item.id, item.label) : storyComponentLabel(item.label)
          .replace(/音频命令\s+0x[0-9A-F]+/gu, '场景音乐'))}</b></span></button>`).join("")}</details>`).join("")}
    <details open><summary>战斗入口</summary>
      ${actorBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot actor"></i><span><b>${esc(sceneObjectTreeLabel(item))} · 战斗</b></span></button>`).join("")}
      ${investigationBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot investigation-tile"></i><span><b>调查战斗</b></span></button>`).join("")}
      ${coordinateBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot event"></i><span><b>坐标触发战斗</b></span></button>`).join("")}
      ${zoneBattles.map(entry => `<a class="scene-object-row scene-link-row" href="${esc(entry.sourceHref)}"><i class="logic-dot"></i><span><b>随机遇敌</b></span></a>`).join("")}
    </details></div>`;
}

function renderMetatileSidebar() {
  return `<div class="metatile-sidebar">
    <div class="metatile-sidebar-head"><span>地图图块列表</span></div>
    ${elementTree({showIcons: false, selectedId: String(state.selectedMetatile),
      nodes: state.scene.metatile_definitions.map((_, index) => ({id: String(index), label: `图块 ${index + 1}`})),
      buttonAttributes: node => ({'data-scene-brush': node.id}),
    })}
  </div>`;
}

function renderSceneTileInspector() {
  const selected = state.sceneTileSelection;
  return `<div class="scene-tile-editor">
    ${selected ? `<div class="scene-metatile-preview" data-scene-metatile="${selected[0]},${selected[1]}"></div>
      <div data-scene-tile-field-object="${selected[0]},${selected[1]}"></div>`
      : `<div class="scene-metatile-preview" data-scene-metatile-brush="${state.selectedMetatile}"></div>`}
    ${selected ? controlledObjectMarkup(state.sceneEntry.id, {point: selected}, state.project) : ''}
    ${hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
    ${sceneConditionMarkup(null)}
  </div>`;
}

function renderWorldSceneTileInspector() {
  if (!state.scene?.preview_only || !state.sceneTileSelection) return "";
  const selected = state.sceneTileSelection;
  const object = selectedSceneLogicObject();
  const cells = object?.kind === 'transition' ? conditionalEntranceCells(
    conditionalEntranceRecord(object.record, {sceneId: state.sceneEntry.id,
      sceneLogic: state.sceneLogic, tileActions: state.sceneTileActions,
      logicIndex: state.project.scenes.logic, worldTide: state.sceneTideDocument,
      worldRaw: state.sceneWorldRaw}),
    state.sceneEntrancePreview?.key === object.key ? state.sceneEntrancePreview : null) : [];
  const preview = cells.find(cell => cell.x === selected[0] && cell.y === selected[1]);
  return `<div class="scene-tile-editor">
    ${preview ? `<p title="以下字段编辑原始地图格">条件预览地形 ${hex$4(preview.metatile_id, 2)}</p>` : ''}
    ${controlledObjectMarkup(state.sceneEntry.id, {point: selected}, state.project)}
    <div class="scene-metatile-preview" data-scene-metatile="${selected.join(",")}"></div>
    <div data-scene-tile-field-object="${selected.join(",")}"></div></div>`;
}

async function mountSceneTileFieldReset(refresh, {beforeReset = null, afterReset = null} = {}) {
  const host = document.querySelector("[data-scene-tile-field-object]");
  if (!host) return;
  const [runtimeX, runtimeY] = host.dataset.sceneTileFieldObject.split(",").map(Number);
  const cell = sceneMapCell(state.scene, runtimeX, runtimeY);
  if (cell?.sourceY == null) {
    host.textContent = `加载时填充图块 ${hex$4(cell?.metatileId, 2)}`;
    return;
  }
  const x = cell.sourceX, y = cell.sourceY;
  const resourceId = `scene:${hex$4(Number(state.sceneEntry.id), 2).slice(2)}`;
  const handle = `${resourceId}:map:${hex$4(y, 2).slice(2)}`;
  try {
    const object = await db.getFieldObject(resourceId, `${resourceId}.map`);
    if (!host.isConnected) return;
    host.addEventListener("field-object-saved", event => {
      if (!host.isConnected) return;
      const changed = Array.isArray(event.detail.fields)
        ? event.detail.fields : [event.detail.fields];
      const field = changed.find(item => item.entityHandle === handle && item.fieldName === "cells");
      if (!field) return;
      state.scene.map[y][x] = Number(field.value[x]);
      state.sceneOriginalMap[y][x] = Number(field.value[x]);
      invalidateSceneSurface(state.scene);
      refreshSceneDraftDirty();
      afterReset?.();
      refresh();
    });
    mountFieldObjectElementReset(host, object, {handle, index: x,
      maxValue: state.scene.metatile_definitions.length - 1, beforeReset});
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

async function mountSceneTileMapReset(refresh, {beforeReset = null, afterReset = null} = {}) {
  const host = document.querySelector('[data-scene-tile-map-reset]');
  if (!host) return;
  const scene = state.scene;
  const history = state.sceneTileHistory;
  const resourceId = sceneResourceUid(state.sceneEntry);
  try {
    const object = await db.getFieldObject(resourceId, `${resourceId}.map`);
    if (!host.isConnected || state.scene !== scene) return;
    mountFieldObjectReset(host, object, {
      label: '重置整张地图', title: '恢复当前场景的全部地图图块',
      beforeReset: async () => {
        await beforeReset?.();
        return {map: scene.map.map(row => [...row])};
      },
      afterReset: (_fields, context) => {
        if (!host.isConnected || state.scene !== scene) return;
        history.begin(context.map);
        history.changed();
        history.end();
        scene.map = object.fields.map(field => [...field.value]);
        state.sceneOriginalMap = scene.map.map(row => [...row]);
        invalidateSceneSurface(scene);
        refreshSceneDraftDirty();
        afterReset?.();
        refresh();
      },
    });
  } catch (error) {
    editorLog.error('场景', `操作失败：${error?.message || error}`, error);
    if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
  }
}

const sceneFlowComponents = new Map();
const sceneFlowStates = new Map();
const sceneFlowFrames = new Map();
const sceneFlowPresentation = {namespace: 'scene-flow-state', dataPrefix: 'scene-flow-state',
  exitLabel: '返回行走'};

function sceneFlowTree(flow, target = null, selectedId = 'root') {
  return elementTree({showIcons: false, selectedId,
    nodes: [{id: 'root', kind: 'group', label: flow.label, depth: 0},
      ...(target ? [{id: target.uid, kind: target.dialogues[0]?.record ? 'text' : 'image',
        depth: 1, label: target.dialogues[0]?.record ? '反馈正文' : '地图画面'}] : [])],
    buttonAttributes: node => ({'data-scene-flow-component': node.id})});
}

function renderSceneWorkbench() {
  const entry = state.sceneEntry;
  const scene = state.scene;
  // 三个互斥的编辑状态。地图图块对世界地图不可用：它是粗格 + 共享图案字典
  // 编码的，没有按 metatile 的写回路径（见 mm_scene.py save_scene 的拒绝分支）。
  const mode = state.sceneEditMode === "tiles" && scene.preview_only
    ? "logic" : state.sceneEditMode;
  const tileMode = mode === "tiles";
  const encounterMode = mode === "encounters";
  const sceneCanvas = scenePreviewCanvasMarkup({
    id: "scene-canvas",
    owner: "scene-header-map",
    role: "map",
    columns: scene.width,
    rows: scene.height,
    cellWidth: 16,
    className: scene.preview_only ? "world-map-canvas" : "",
    label: `${entry.name}地图画布`,
  });
  const modeButton = (id, label) =>
    `<button class="button ${mode === id ? "active" : ""}" data-scene-mode="${id}">${label}</button>`;
  const flow = sceneInteractionFlowPage(state.interactionFlow);
  const instances = flow ? sceneInteractionTemplates(state.project.scenes.logic, state.project.scenes, {includeBattle: true})
    .filter(item => sceneInteractionFlowMatches(flow, item.object)) : [];
  const instancePicker = flow ? referencePickerMarkup({
      moduleId: 'scene-actor', label: '实例', compact: true,
      value: instances.find(item => item.object.scene === state.sceneSlug
        && item.object.key === state.sceneLogicSelection)?.value,
      items: instances.map(item => ({...item, group: item.object.scene,
        groupLabel: item.description.split(' · ')[0]})),
      componentAttributes: 'data-scene-flow-instance', pageSize: 24,
    }) : '';
  if (flow) {
    const selected = selectedSceneLogicObject();
    const href = new URLSearchParams({view: 'scenes', scene: state.sceneSlug,
      sceneObject: state.sceneLogicSelection, sceneMode: 'logic'});
    return screenWorkbench({namespace: 'scene-flow', heightMode: 'fill',
      bottomSize: 'resizable', bottomFit: true,
      toolbarMarkup: `<div class="toolbar">${handleMarkup(sceneObjectResourceUid(selected), {})}
        <a class="editor-inline-link" data-scene-flow-map href="?${esc(href.toString())}">地图位置 ↗</a>
        <details><summary>相关页面与触发条件</summary><div class="screen-workbench-header-popover">
        ${sceneControllerMarkup({...selected, sceneId: entry.id}, state.project, state.sceneLogic)}
        ${controlledObjectMarkup(entry.id, {object: selected.key}, state.project)}
        ${hiddenTeleportSceneMarkup(entry.id, {}, state.project)}
        ${renderSceneInteractionLinks(selected.record, selected.kind)}
        <div data-scene-destination-links>${renderSceneDestinationLinks({
          ...selected, sceneId: Number(entry.id)}, sceneDestinationContext())}</div>
        <div data-scene-flow-references></div></div></details></div>`,
      treeTitle: '组件树', treeAttributes: {'data-scene-flow-tree': ''}, treeMarkup: sceneFlowTree(flow),
      stageToolbarMarkup: `${instancePicker}<label class="screen-workbench-selection" data-scene-flow-pages hidden>
        分页 <select data-scene-flow-page aria-label="反馈分页"></select></label>
        <div data-field-interaction-target="field-investigation" hidden></div>`,
      stageMarkup: screenWorkbenchCanvasStage({namespace: 'scene-flow', sizing: 'fill',
        canvasMarkup: '<canvas width="256" height="240" data-field-interaction-preview aria-label="交互文字预览"></canvas>'}),
      inspectorTitle: '流程属性',
      inspectorMarkup: `<div id="scene-object-inspector">${renderSceneLogicInspector({flow: true})}</div>`,
      bottomMarkup: interfaceStateGraphMarkup({graph: sceneInteractionFlowGraph(flow),
        selected: {node: flow.id, fullGraph: false}, paths: [], available: () => false,
        presentation: {...sceneFlowPresentation, count: ''}})});
  }
  const toolbarMarkup = `<div class="scene-toolbar">
    <button class="button ghost scene-back-button" type="button" id="scene-back" title="场景列表" aria-label="场景列表">←</button>
    ${handleMarkup(sceneResourceUid(entry))}
    <div class="scene-mode-switch">${modeButton("logic", "场景对象")}${
      scene.preview_only ? "" : modeButton("tiles", "地图图块")
    }${modeButton("encounters", "遇敌区域")}</div>
    ${tileMode ? `<button class="button ghost" type="button" id="scene-tile-undo"
      aria-label="撤销" title="撤销（Ctrl+Z）"${state.sceneTileHistory?.canUndo ? '' : ' disabled'}>↶</button>
    <button class="button ghost" type="button" id="scene-tile-redo"
      aria-label="重做" title="重做（Ctrl+Y／Ctrl+Shift+Z）"${state.sceneTileHistory?.canRedo ? '' : ' disabled'}>↷</button>
    <span data-scene-tile-map-reset></span>` : ''}
    ${worldTideSceneMarkup(state.sceneEntry.id, state.sceneTideDocument, state.sceneBgmDocument, state.project.scenes)}
    ${buildLogButton()}
    <span class="scene-save-state ${state.sceneMessage?.startsWith("保存失败：") ? "dirty" : ""}"
      id="scene-save-state" ${state.sceneMessage ? "" : "hidden"}>${esc(state.sceneMessage || "")}</span>
  </div>`;
  return screenWorkbench({namespace: 'scene', className: `scene-workbench ${mode}-mode`,
    toolbarMarkup, treeTitle: null, treeClassName: 'scene-tools',
    treeMarkup: tileMode ? renderMetatileSidebar()
      : encounterMode ? renderEncounterZoneSidebar() : renderSceneObjectList(),
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'scene', sizing: 'fill',
      className: 'scene-stage', zoomMarkup: '',
      toolbarMarkup: `${scenePreviewControls("场景缩放")}
        <label class="check"><input type="checkbox" id="scene-grid" ${state.sceneGrid ? "checked" : ""}> 网格</label>
        <div data-scene-map-rewrite-controls>${!tileMode && !encounterMode
          ? sceneMapRewriteControlsMarkup(selectedSceneLogicObject()?.rewrite) : ''}</div>
        <div class="scene-ruler"><span id="scene-pointer-coordinate"></span><span id="scene-selected-coordinate"></span></div>`,
      viewportClassName: `scene-canvas-wrap ${scene.preview_only ? "world-map-wrap" : ""}`,
      viewportAttributes: {tabindex: 0, role: 'region', 'aria-label': '场景画布',
        title: '滚轮或＋／−缩放；拖动或方向键平移；Shift 点击移动对象；Alt 点击检查世界地图格'},
      canvasMarkup: sceneCanvas}),
    inspectorTitle: null, inspectorClassName: 'scene-bottom-editor',
    inspectorAttributes: {id: 'scene-bottom-editor'},
    inspectorMarkup: `${renderSceneRootDetails()}
      ${tileMode ? `<section class="metatile-sidebar"><h3>画笔</h3>
        <p>${state.scene.metatile_definitions.length} 个地图图块</p><div data-scene-brush-selector></div>
        <div class="selected-tile"><b data-selected-metatile-id>${hex$4(state.selectedMetatile, 2)}</b><em>当前画笔</em>
          <span data-selected-metatile-def>${(state.scene.metatile_definitions[state.selectedMetatile] || []).map(value => hex$4(value, 2)).join(' ')}</span></div>
      </section>` : ''}
      <div id="scene-encounter-panel">${encounterMode ? renderEncounterZonePanel() : ""}</div>
      <div id="scene-object-inspector"${sceneRootSelected() ? ' hidden' : ''}>${tileMode ? renderSceneTileInspector()
        : encounterMode ? "" : `${selectedSceneLogicObject()?.rewrite ? '' : renderWorldSceneTileInspector()}${renderSceneLogicInspector()}`}</div>
    `,
  });
}

async function renderScenes() {
  const entries = state.project.scenes?.editable_scenes || [];
  if (!entries.length) {
    return ``;
  }
  const flow = sceneInteractionFlowPage(state.interactionFlow);
  if (flow) {
    const instances = sceneInteractionTemplates(state.project.scenes.logic, state.project.scenes, {includeBattle: true})
      .filter(item => sceneInteractionFlowMatches(flow, item.object));
    const instance = instances.find(item => item.object.scene === state.sceneSlug
      && item.object.key === state.sceneLogicSelection) || instances[0];
    if (!instance) return '';
    state.sceneSlug = instance.object.scene;
    state.sceneLogicSelection = instance.object.key;
    state.sceneFocusPoint = [instance.object.record.x, instance.object.record.y];
    state.sceneEditMode = 'logic';
  }
  const entry = entries.find(item => item.slug === state.sceneSlug);
  if (!entry) {
    state.scene = null;
    state.sceneEntry = null;
    state.sceneLogic = null;
    state.sceneRenderer = null;
    state.sceneDraftRepository = null;
    state.sceneTileHistory = null;
    state.sceneDirty = false;
    state.sceneMessage = "";
    return renderSceneResources();
  }
  if (
    state.sceneDirty
    && state.sceneEntry?.slug === entry.slug
    && state.sceneDraftRepository === state.projectRepository
    && state.scene
    && state.sceneLogic
  ) {
    return renderSceneWorkbench();
  }
  const resourceId = `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, "0")}`;
  const [document, actorsDocument, bgmDocument, , interactionScripts, autonomousScripts, worldEvents, elevatorMetatiles, tileActions, tide, encounterFormations, , metatileSets] = await Promise.all([
    db.getResourceDocument(resourceId, null),
    db.getDocument("scene-actor", null),
    db.getDocument("field-scene-lifecycle-service", null),
    loadEncounterZones(),
    db.getResourceDocument("story-interaction-script", null),
    db.getResourceDocument("story-autonomous-script", null),
    db.getResourceDocument("world-event", null),
    loadElevatorMetatiles(db),
    db.getResourceDocument('nearby-object-investigation-service', null),
    db.getResourceDocument(WORLD_TIDE_OWNER, null),
    db.getResourceDocument("encounter-formation", null),
    db.getResourceDocument("wanted-record", null),
    db.getResourceDocument('metatile-set', null),
  ]);
  if (!document || !document.scene || !document.logic) {
    throw new Error(`${resourceId}: 当前项目中的场景资产数据不完整`);
  }
  if (!actorsDocument) {
    throw new Error(`${SCENE_ACTORS_RESOURCE_ID}: 当前项目中的场景角色数据不完整`);
  }
  const scene = JSON.parse(JSON.stringify(document.scene));
  if (scene.event_metatile_replacements?.some(group => group.coordinate_space !== 'world-coarse-map'))
    await prepareSaveEditorWorkspace();
  const logic = JSON.parse(JSON.stringify(document.logic));
  // 坐标事件的当前值由 world-event 提供，场景中的事件只作投影。
  logic.layers.event_triggers = (worldEvents?.records || [])
    .filter(row => Number(row.scene_id) === Number(entry.id))
    .map(row => ({...document.logic.layers.event_triggers.find(item => Number(item.id) === Number(row.id)), ...row}));
  state.sceneAssetVersion = db.resourceMetadata(resourceId)?.version ?? null;
  state.sceneActorsVersion = db.metadata("scene-actor")?.version ?? null;
  if (state.sceneEntry?.id !== entry.id) {
    state.sceneEntrancePreview = null;
    state.sceneMapRewritePreview = null;
    state.sceneMapRewriteScenes = null;
  }
  state.sceneEntry = entry;
  state.sceneBgmDocument = bgmDocument;
  state.sceneStoryDocuments = {interaction: interactionScripts,
    autonomous: await prepareStorySceneActions(actorsDocument.records.filter(row =>
      Number(row.entry_id) === Number(entry.id)), autonomousScripts, state.project.story, db)};
  state.sceneWorldEvents = worldEvents;
  state.sceneEncounterFormations = encounterFormations;
  state.sceneWorldRaw = document.world_raw;
  state.sceneTideDocument = tide;
  state.sceneMetatileSets = (metatileSets?.records || []).filter(record =>
    record.scene_references?.includes(resourceId));
  state.scene = scene;
  state.sceneElevatorMetatiles = elevatorMetatiles;
  state.sceneTileActions = tileActions;
  state.sceneRenderer = null;
  state.sceneDraftRepository = state.projectRepository;
  // preview_only 只挡“地图图块”（世界地图没有按 metatile 的写回路径）。
  // 遇敌区域对世界地图反而是最主要的用法——区块归属就是在这张图上刷的。
  if (scene.preview_only && state.sceneEditMode === "tiles") state.sceneEditMode = "logic";
  state.sceneLogic = logic;
  state.sceneOriginalMap = scene.map.map(row => [...row]);
  state.sceneOriginalLogic = JSON.parse(JSON.stringify(logic));
  state.sceneTileSelection = state.sceneFocusPoint
    && state.sceneFocusPoint[0] < scene.width && state.sceneFocusPoint[1] < scene.height
    ? [...state.sceneFocusPoint] : null;
  if (state.sceneEditMode === 'encounters') state.sceneEncounterBlock = state.sceneFocusPoint
    ? encounterBlockIndexAt(...state.sceneFocusPoint) : null;
  // 场景草稿保留字段引用，提交时冻结待保存值。
  await beginSceneActorDraft();
  state.sceneDirty = false;
  state.sceneMessage = "";
  state.sceneTileHistory = createSceneTileHistory();
  if (state.sceneLogicSelection !== SCENE_ROOT_SELECTION
    && !sceneLogicObjects().some(item => item.key === state.sceneLogicSelection)
    && !sceneBgmItems(entry.id, bgmDocument).some(item => item.key === state.sceneLogicSelection)
    && !sceneEntryStoryItems(entry.id).some(item => item.key === state.sceneLogicSelection)
    && !sceneRelatedStories(entry.id, state.project.story).some(item => item.key === state.sceneLogicSelection)) {
    state.sceneLogicSelection = state.sceneFocusPoint ? null : SCENE_ROOT_SELECTION;
  }
  return renderSceneWorkbench();
}

async function bindSceneFlowInstances(root, {rerender}) {
  bindReferencePicker(root.querySelector('[data-scene-flow-instance]'), {onSelect: value => {
    const flow = sceneInteractionFlowPage(state.interactionFlow);
    const instance = sceneInteractionTemplates(state.project.scenes.logic, state.project.scenes, {includeBattle: true})
      .find(item => item.value === value && sceneInteractionFlowMatches(flow, item.object));
    if (!instance) return;
    const url = new URL(location.href);
    url.searchParams.set('scene', instance.object.scene);
    url.searchParams.set('sceneObject', instance.object.key);
    url.searchParams.set('scenePoint', [instance.object.record.x, instance.object.record.y].join(','));
    void navigateInternalUrl(url);
  }});
  const selected = selectedSceneLogicObject();
  const byte = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
  const flow = sceneInteractionFlowPage(state.interactionFlow);
  const componentKey = `${flow.id}:${state.sceneSlug}:${selected.key}`;
  const canvas = root.querySelector('[data-field-interaction-preview]');
  bindScreenWorkbenchPageHeader({namespace: 'scene-flow', root});
  if (sceneFlowComponents.get(componentKey) && sceneFlowComponents.get(componentKey) !== 'root')
    await mountSceneLogicFieldObject(rerender);
  let drawVersion = 0;
  const repaint = async (textDocument = null) => {
    const version = ++drawVersion;
    delete canvas.dataset.fieldInteractionPainted;
    let draft = sceneInteractionMenuPreview('field-investigation');
    const isCurrent = () => canvas.isConnected && drawVersion === version;
    textDocument ||= await db.getDocument('text-record');
    if (!isCurrent()) return;
    const target = sceneInteractionPreviewTarget('field-investigation');
    const record = target?.dialogues[0]?.record;
    const frames = !draft?.confirmed_state_binding && draft?.layers.some(layer =>
      layer.record === record && layer.dialogue_runtime) ? dialoguePreviewFrames(record) : [];
    const frameKey = `${componentKey}:${target?.uid}`;
    const index = Math.min(sceneFlowFrames.get(frameKey) || 0, Math.max(0, frames.length - 1));
    const page = root.querySelector('[data-scene-flow-page]');
    page.parentElement.hidden = frames.length < 2 || Boolean(draft?.confirmed_state_binding);
    page.innerHTML = frames.map((_frame, frame) => `<option value="${frame}"${frame === index ? ' selected' : ''}>${frame + 1}</option>`).join('');
    if (frames[index] && !draft?.confirmed_state_binding) draft = {...draft,
      runtime_context: {...draft.runtime_context, confirmed_waits: frames[index].confirmedWaits},
      layers: draft.layers.map(layer => layer.record === record && layer.dialogue_runtime
        ? {...layer, page_index: frames[index].pageIndex} : layer)};
    draft = {...draft, interface_preview_state: {context: {...interfacePreviewContext(),
      scene: {sceneId: Number(state.sceneEntry.id), x: selected.record.x, y: selected.record.y}}}};
    await paintUiConstructionSemanticPreview(canvas, draft, {isCurrent, textDocument});
    if (isCurrent()) canvas.dataset.fieldInteractionPainted = '1';
  };
  const previewHost = root.querySelector('[data-field-interaction-target]');
  root.querySelector('[data-scene-flow-page]').addEventListener('change', event => {
    const target = sceneInteractionPreviewTarget('field-investigation');
    sceneFlowFrames.set(`${componentKey}:${target?.uid}`, Number(event.currentTarget.value));
    void repaint().catch(error => {
      editorLog.error('场景', `操作失败：${error?.message || error}`, error);
      if (canvas.isConnected) canvas.closest('.workspace-stage').insertAdjacentHTML('beforeend',
        `<p role="alert">${esc(error.message)}</p>`);
    });
  });
  const preview = await bindSceneInteractionPreview(previewHost, {
    objectUid: `${selected.kind}:${byte(state.sceneEntry.id)}:${byte(selected.record.id)}`,
    sourceObject: {...selected, sceneId: Number(state.sceneEntry.id)},
    selectionInTree: true, previewInStage: true, flowPreview: true,
    repaint,
  });
  if (!preview || !canvas.isConnected) return;
  delete previewHost.dataset.fieldInteractionReady;
  const tree = root.querySelector('[data-scene-flow-tree]');
  const inspector = root.querySelector('#scene-object-inspector');
  const [catalog, logic, scenes, calls] = await Promise.all([
    db.getDocument('project.ui.scene-flow-states'), db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('nearby-object-investigation-service'),
  ]);
  const object = {...selected, sceneId: Number(state.sceneEntry.id)};
  const context = await prepareSceneInteractionBinding(object, {logicIndex: logic, scenes}, db);
  if (!canvas.isConnected) return;
  const effective = object.record.interaction_binding ? sceneInteractionBoundObject(object, context) : object;
  const sourceFlow = effective && EDITOR_PAGES.find(page => page.route.interactionFlow
    && sceneInteractionFlowMatches(page, effective));
  const graph = sceneInteractionFlowGraph(sourceFlow || {id: 'bound-interaction', label: '主动交互调用'},
    preview.targets, {object: effective, logic, catalog, calls, scenes});
  const defaultNode = graph.nodes.find(node => node.id === 'machine-state-investigation:miss' && node.target)
    || graph.nodes.find(node => node.target);
  if (!sceneFlowStates.has(componentKey)) sceneFlowStates.set(componentKey, {
    node: defaultNode?.id || graph.entry, fullGraph: false,
  });
  const graphSelection = sceneFlowStates.get(componentKey);
  if (!graph.nodes.some(node => node.id === graphSelection.node)) graphSelection.node = graph.entry;
  const graphHost = root.querySelector('.screen-workbench-bottom');
  const workspace = graphHost.closest('[data-screen-workbench]');
  const workbench = createInterfaceStateControllerWorkbench({
    identity: {id: `scene-flow:${flow.id}`, domain: 'investigation', key: flow.id},
    pageId: flow.id, entry: {pageId: flow.id, sceneId: Number(state.sceneEntry.id)},
    selection: () => graphSelection, graph: () => graph,
    presentation: {...sceneFlowPresentation, count: `${graph.nodes.length} 个状态`},
    available: node => node.status === 'confirmed',
    preview: () => sceneInteractionMenuPreview('field-investigation'),
    references: () => [{resourceId: sceneResourceUid(state.sceneEntry), handle: sceneObjectResourceUid(selected), field: null}],
  });
  const refreshGraph = () => {
    graphHost.querySelector('.interface-state-graph-panel').outerHTML = workbench.graphMarkup();
    workbench.bind(workspace, {cacheKey: componentKey});
  };
  refreshGraph();
  bindScreenWorkbenchBottomResize({namespace: 'scene-flow', root, initialRatio: .4});
  bindScreenWorkbenchZoom({namespace: 'scene-flow', root});
  let selectionVersion = 0;
  const selectComponent = async id => {
    const version = ++selectionVersion;
    delete previewHost.dataset.fieldInteractionReady;
    const target = preview.targets.find(row => row.uid === id);
    const component = target ? id : 'root';
    sceneFlowComponents.set(componentKey, component);
    const phase = graph.nodes.find(row => row.id === graphSelection.node)?.target
      || sceneInteractionPreviewTarget('field-investigation');
    tree.querySelector('.element-tree').outerHTML = sceneFlowTree(flow, phase, component);
    delete previewHost.dataset.fieldInteractionReady;
    if (!canvas.isConnected || selectionVersion !== version) return;
    const record = target?.dialogues[0]?.record;
    if (record) {
      inspector.innerHTML = '<div data-scene-flow-text></div>';
      root.querySelector('.workspace-inspector > h3').textContent = tree.querySelector('.is-selected b').textContent;
      const object = await db.getFieldObject('text-record', record);
      if (!canvas.isConnected || selectionVersion !== version) return;
      const host = inspector.querySelector('[data-scene-flow-text]');
      await object.mount(host, {
        sceneInteractionConfiguration: true, stacked: true, compactIdentity: true,
        onSaved: ({saved}) => repaint(saved.value.document)});
    } else {
      inspector.innerHTML = renderSceneLogicInspector({flow: true});
      root.querySelector('.workspace-inspector > h3').textContent = target ? target.label.split(' · ')[0] : '流程属性';
      await Promise.all([mountSceneLogicFieldObject(rerender), mountSceneTileFieldReset(rerender)]);
    }
    if (canvas.isConnected && selectionVersion === version) previewHost.dataset.fieldInteractionReady = '1';
  };
  tree.addEventListener('click', event => {
    const button = event.target.closest('[data-scene-flow-component]');
    if (!button) return;
    void selectComponent(button.dataset.sceneFlowComponent).catch(error => {
      editorLog.error('场景', `操作失败：${error?.message || error}`, error);
      if (inspector.isConnected) inspector.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
    });
  });
  const selectPhase = async id => {
    const node = graph.nodes.find(node => node.id === id);
    if (!node) return;
    graphSelection.node = id;
    delete graphSelection.edge;
    if (node.target) await preview.select(node.target.uid);
    if (!canvas.isConnected) return;
    refreshGraph();
    await selectComponent(sceneFlowComponents.get(componentKey) === 'root' ? 'root'
      : node.target?.uid || sceneFlowComponents.get(componentKey));
  };
  const graphAction = event => {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const node = event.target.closest('[data-scene-flow-state-node]');
    const edge = event.target.closest('[data-scene-flow-state-edge]');
    if (node) {
      event.preventDefault();
      void selectPhase(node.dataset.sceneFlowStateNode).catch(error => {
        editorLog.error('场景', `操作失败：${error?.message || error}`, error);
        if (inspector.isConnected) inspector.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
      });
    } else if (edge) {
      event.preventDefault();
      graphSelection.edge = edge.dataset.sceneFlowStateEdge;
      refreshGraph();
    } else if (event.target.closest('[data-scene-flow-state-full-graph]') && event.type === 'click') {
      graphSelection.fullGraph = !graphSelection.fullGraph;
      refreshGraph();
    }
  };
  graphHost.addEventListener('click', graphAction);
  graphHost.addEventListener('keydown', graphAction);
  await preview.select(graph.nodes.find(node => node.id === graphSelection.node)?.target?.uid || preview.targets[0]?.uid);
  await selectComponent(sceneFlowComponents.get(componentKey) || 'root');
}

var workbench = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindSceneFlowInstances: bindSceneFlowInstances,
  mountSceneLogicFieldObject: mountSceneLogicFieldObject,
  mountSceneTileFieldReset: mountSceneTileFieldReset,
  mountSceneTileMapReset: mountSceneTileMapReset,
  renderSceneLogicInspector: renderSceneLogicInspector,
  renderSceneObjectList: renderSceneObjectList,
  renderSceneTileInspector: renderSceneTileInspector,
  renderScenes: renderScenes,
  renderWorldSceneTileInspector: renderWorldSceneTileInspector,
  sceneRootSelected: sceneRootSelected
});

export { bindSceneBgm, mountSceneLogicFieldObject, mountSceneMapRewrite, mountSceneTileFieldReset, mountSceneTileMapReset, mountWorldTideScene, renderSceneLogicInspector, renderSceneObjectList, renderSceneTileInspector, renderWorldSceneTileInspector, sceneBoundaryFocusCoordinate, sceneBoundaryMatchesCell, sceneBoundarySides, sceneEventFlagMap, sceneLogicFieldSpecs, sceneLogicObjects, sceneMapRewriteContains, sceneMapRewriteControlsMarkup, sceneMapRewritePreview, sceneObjectCoordinate, sceneObjectCoordinateLabel, sceneRootSelected, selectedSceneLogicObject, workbench };
