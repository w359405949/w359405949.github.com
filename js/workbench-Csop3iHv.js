import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { handleMarkup, loadWorldMetatileRenderer, loadSceneMetatileRenderer, invalidateSceneSurface, bindScenePreview, paintScenePreviewById, scenePreviewMarkup, loadSceneSurface, physicalLocationMarkup, fields, sceneActorVisualDescriptor, actorAppearanceContextForScene, actorAppearanceCatalog, ACTOR_ENTRY_SCENE_OBJECT, scenePreviewCanvasMarkup, scenePreviewControls } from './record-6_wsSDi2.js';
import { replaceHistoryUrl, currentViewUrl, bindScreenWorkbenchBottomResize, bindScreenWorkbenchZoom, bindInternalPageLinks, interfacePreviewContext, screenWorkbench, screenWorkbenchCanvasStage, elementTree, navigateInternalUrl } from './element-tree-C1bWRgTl.js';
import { sceneActorName, storySequenceComponentLabel, storyComponentLabel, createInterfaceStateControllerWorkbench, interfaceStateGraphMarkup } from './story-component-labels-CSjCRgXX.js';
import { mountSceneActorInteractionPicker, sceneInteractionPreviewTarget, bindSceneInteractionPreview, sceneInteractionFlowGraph, sceneInteractionMenuPreview, dialoguePreviewFrames } from './scene-actor-interaction-picker-D6QFBEMg.js';
import { fieldElevatorSceneRanges, ensureSequenceExecutions, createNesApuSynth, collapseAttributes } from './battle-result-script-runtime-BSeJpUGH.js';
import { esc, prepareModuleComponent, renderModuleComponent, hydrateModuleComponents, sceneActorStateObjects, audioCommandLabel, writeAccessMarker, prepareStorySceneActions, currentTextReference } from './interface-state-preview-Dlotqlmn.js';
import { eventFlagReferenceMarkup, saveBattleCatalog, saveEventHref, encounterFormationGroups, encounterCandidate, eventFlagTextMarkup } from './scene-encounter-probabilities-C0m_IdC-.js';
import { sceneActorDocument, sceneActorRecord, refreshSceneDraftDirty, loadEncounterZones, SCENE_ACTORS_RESOURCE_ID, encounterBlockIndexAt, beginSceneActorDraft, sceneActorAliasRecords, renderEncounterZonePanel, renderEncounterZoneSidebar } from './encounter-ybfuhcXm.js';
import { worldCoarsePatternCells, WORLD_TIDE_HANDLE, WORLD_TIDE_OWNER, sceneRemapRecords, SCENE_REMAP_OWNER, sceneRuntimeMap, sceneMapCell, battleModeForPendingEventFlag, sceneRemapCollection, db, newSceneObjectHandle, editSceneObjectCollection, sceneInteractionScriptPrograms, SCENE_INTERACTION_ACTOR_REASON, sceneInteractionScriptActorDependency, SCENE_SERVICE_INSTANCE_COUNTS, sceneActorServiceInstance, sceneActorInteractionPermitted, FACILITY_POINT_OWNER, facilityPointRecords, flushAllAutoSaves, facilityPointCollection, addFacilityPoint, hex as hex$6, battleFirstMonsterId, sceneMapPointObjects, sceneEntityResourceUid, uiFacilityElevatorSceneBase, sceneMetatileAttributeRecords, editSceneMapPoint, hiddenTeleportDestination, sceneMapPointMetatiles, sceneMapPointTransferCapacity, sceneMapPointConflict, sceneMapPointRecords, deleteSceneMapPoint, addSceneMapPoint, battleFlowForStoryState, prepareSceneInteractionBinding, sceneInteractionBoundObject, TILE_ACTION_OWNER, controllerSceneRemaps, sceneInteractionTemplates, acceptProjectFieldDraft } from './prg-loaders-DnCSmXk9.js';
import { prepareSaveEditorWorkspace } from './configuration-table-FR1xSC8W.js';
import { referencePickerMarkup, referenceFieldPickerMarkup, hydrateReferenceFieldPickers, bindReferencePicker, sceneElevatorPoints, sceneElevatorDestinations, setReferencePickerValue, loadElevatorMetatiles } from './timeline-player-YCH7Y-3h.js';
import { mountFieldObjectNumber, mountFieldObjectField, mountFieldObjectChoice, mountFieldObjectRecordChoice, mountFieldObjectElementReset, mountFieldObjectReset } from './field-object-editor-Blro4OF0.js';
import { scenePositionPickerMarkup, hydrateScenePositionPicker, sceneVariantMarkup, scenePickerVariants } from './components-DbJXuRMn.js';
import { elevatorServicePreview } from './service-preview-scene-CPwiqon9.js';
import { paintUiConstructionSemanticPreview, fieldCameraOrigin, createSceneActionCore } from './ui-construction-preview-BuoQ5mM6.js';
import './components-DZ4_ZF2v.js';
import { state, battleSimulatorHref } from './emulator-Bpa8EsFw.js';
import './items-BwRIA2t-.js';
import { sceneInteractionFlowPage, EDITOR_PAGES, sceneInteractionFlowMatches, INTERFACE_PAGE_DEFINITIONS } from './editor-renderer-n2nBwXk_.js';
import { interactionEditorLink, interactionEditorHref } from './interaction-components-DjtMdVmW.js';
import { worldEventsForFlag, worldEventHandle, worldEventSceneHref, worldEventMapEffects, worldTideTriggers, sceneBombardments, actorInteractionMode, controllerSceneHref, conditionalEntranceState, bombardmentContains, worldTideScenes, controllerAt, sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins, sceneEntryStoryItemsForProject, sceneBgmItemsForProject, loadEventMapScenes, conditionalEntranceCells, conditionalEntranceRecord, shopConfigurationForActor, conditionalSceneRecord } from './battle-result-state-machine-BbK2hSud.js';
import { shopConfigurationProducts } from './shops-CokyNsz7.js';
import { renderSceneDestinationLinks, sceneOwnedInteractionConfigurations, sceneConfigurationStays, consolidateSceneDestinationLinks, controlledObjectMarkup, sceneControllerMarkup } from './system-state-model-zPjxuFk6.js';
import { facilityConfigurationLabel, vehicleName } from './configuration-summary-m9SZR_6_.js';
import { prepareGlobalEventFlags, globalEventFlagHandle } from './global-random-DAuRNoyj.js';
import { ensureVehicleDraft } from './vehicle-field-session-CTl5UxXM.js';
import './components-DFg4zDq1.js';
import { mountStorySceneActions } from './actors-bind-Dz7Oe1bO.js';
import { prepareViewData, sceneResourceUid, renderSceneResources } from './overview-BWR5QCHz.js';
import { storyViewForSequenceId, storyPageDefinitionForView } from './baseline-assembly-DW8BWbDB.js';
import { actorAppearanceCandidatePreview, sceneActorVisualMarkup, actorAppearanceCandidateLabel, hydrateStoryActorVisuals } from './actor-appearance-BNElc4Fg.js';
import './document-controls-C8YiQAPz.js';

// @editor-module 场景事件改写记录的覆盖范围与两态投影。

const hex$5 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

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
  const resourceId = `scene:${hex$5(scene.id)}`;
  const rewrites = (scene.event_metatile_replacements || []).map((group, index) => {
    const coarse = group.coordinate_space === 'world-coarse-map';
    const size = coarse ? 4 : 1;
    const regions = group.replacements.map(cell => ({x: cell.x * size, y: cell.y * size,
      width: size, height: size}));
    const handle = `${resourceId}:event-map:${hex$5(index)}`;
    return {key: `map-rewrite:${handle}`, handle, resourceId, groupIndex: index,
      type: coarse ? 'world-coarse-replacement' : 'metatile-replacement',
      label: coarse ? '粗格替换' : '地图格替换', eventFlag: group.event_flag,
      record: group, regions, bounds: sceneMapRewriteBounds(regions),
      before: {label: '事件前', cells: mapCells(scene, regions)},
      after: {label: '事件后', cells: coarse
        ? group.replacements.flatMap(cell => worldCoarsePatternCells(worldRaw,
          cell.x * 4, cell.y * 4, cell.metatile_id)) : group.replacements},
      fieldObjectIds: [`${resourceId}.event-map.${hex$5(index)}`,
        `${resourceId}.event-map.${hex$5(index)}.cells`]};
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
  for (const row of sceneRemapRecords(lifecycle)) {
    if (row.kind !== 'scene-remap' || ![row.source_scene_reference, row.target_scene_reference]
      .includes(resourceId)) continue;
    const source = scenes.find(entry => `scene:${hex$5(entry.id)}` === row.source_scene_reference) || scene;
    const target = scenes.find(entry => `scene:${hex$5(entry.id)}` === row.target_scene_reference) || scene;
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

// @editor-module 世界事件、胜利位与地图改写的因果链引用。

function worldEventSourcesMarkup(flag, {compact = false} = {}) {
  const scenes = state.project.scenes.editable_scenes;
  return worldEventsForFlag(state.sceneWorldEvents?.records || [], flag).map(record =>
    `<a class="editor-inline-link" data-world-event-source title="${worldEventHandle(record.id)} · 战斗胜利" href="${esc(worldEventSceneHref(record, scenes))}">${compact ? '战斗 ↗' : `${worldEventHandle(record.id)} · 战斗胜利 ↗`}</a>`).join(' · ');
}

function worldEventVictoryMarkup(record) {
  if (record.event_flag == null) return '';
  const flag = Number(record.event_flag);
  if (!flag) return '<section data-world-event-victory><b>胜利效果 · 0 项</b></section>';
  const scenes = state.project.scenes.editable_scenes;
  const maps = (state.sceneEventMaps || []).map(scene => Number(scene.id) === Number(state.scene.id)
    ? {...state.scene, eventMapWorldRaw: state.sceneWorldRaw} : scene);
  const effects = worldEventMapEffects(flag, maps, scenes);
  const world = scenes.find(scene => Number(scene.id) === 0);
  const bombs = (state.sceneBombardmentCatalog || []).filter(bomb => bomb.flags.includes(flag));
  return `<section data-world-event-victory><b>胜利效果</b>
    <p>${eventFlagReferenceMarkup(flag, {compact: true})} = 1${battleModeForPendingEventFlag(flag)?.wantedDefeatLevel ? ' · 金钱奖励非零时提交' : ''}</p>
    ${effects.length ? effects.map(effect => `<details data-world-event-map-effect>
      <summary><a class="editor-inline-link" href="${esc(effect.href)}">${effect.handle} · ${effect.cellCount} 格 ↗</a></summary>
      ${effect.coarse ? `<p>粗格图案 ${effect.group.replacements.map(cell => cell.metatile_id).join('、')}</p>` : ''}
      <ul>${effect.cells.map(cell => `<li>(${cell.x}, ${cell.y}) → 图块 ${cell.metatile_id}</li>`).join('')}</ul>
    </details>`).join('') : '<p>地图改写 · 0 格</p>'}
    ${bombs.map(bomb => `<p data-world-event-bombardment><a class="editor-inline-link" href="?view=scenes&scene=${esc(world?.slug)}&sceneMode=logic&sceneObject=${esc(bomb.key)}">轰炸区域 (${bomb.region.x}, ${bomb.region.y})–(${bomb.region.x + bomb.region.width - 1}, ${bomb.region.y + bomb.region.height - 1}) ↗</a> · ${bomb.flags.length > 1 ? '全部条件位均置位后关闭' : '关闭'}</p>`).join('')}
  </section>`;
}

// @editor-module 场景对象面板的集合入口与新增记录编辑由字段对象接入。

function sceneObjectCollectionActions({collection, handle = null, capacity = null}) {
  const full = !handle && capacity && capacity.used >= capacity.maximum;
  const limit = full ? ` disabled title="${esc(capacity.scope || '')}容量已满（${capacity.used} / ${capacity.maximum}）"` : '';
  return handle
    ? `<button type="button" class="button" data-scene-collection-delete="${esc(collection)}" data-scene-collection-handle="${esc(handle)}">删除</button>`
    : `<button type="button" class="button" data-scene-collection-add="${esc(collection)}"${limit}>新增</button>`;
}

function sceneCellInteractionRow({items, value, current, point, key = ''}) {
  return `<div class="scene-cell-interaction-row"><span>交互</span>${referencePickerMarkup({
    moduleId: 'scene-cell-interaction', label: '交互', items, value, current,
    compact: true, groupColumn: true, previewPanel: true, className: 'reference-detail-field',
    filterLabel: '搜索交互', filterPlaceholder: '类型或名称',
    componentAttributes: `data-scene-cell-interaction="${esc(key)}" data-scene-interaction-point="${point.join(',')}"`,
  })}</div>`;
}

function bindSceneObjectCollectionActions(root, adapters, onChanged) {
  for (const button of root.querySelectorAll('[data-scene-collection-add], [data-scene-collection-delete], [data-scene-cell-add]')) {
    if (button.dataset.collectionBound) continue;
    const id = button.dataset.sceneCollectionAdd || button.dataset.sceneCollectionDelete || button.dataset.sceneCellAdd;
    const adapter = adapters.get(id);
    if (!adapter) continue;
    button.dataset.collectionBound = '1';
    button.addEventListener('click', async event => {
      event.stopPropagation();
      event.preventDefault();
      button.disabled = true;
      try {
        const adding = Boolean(button.dataset.sceneCollectionAdd || button.dataset.sceneCellAdd);
        const record = adding ? await adapter.add(button.dataset.sceneAddPoint?.split(',').map(Number))
          : await adapter.remove(button.dataset.sceneCollectionHandle);
        await onChanged({collection: id, record, deleted: !adding});
      } catch (error) {
        const host = button.parentElement;
        host.querySelector('[data-scene-collection-error]')?.remove();
        host.insertAdjacentHTML('beforeend', `<p role="alert" data-scene-collection-error>${esc(error.message)}</p>`);
      } finally {if (button.isConnected) button.disabled = Boolean(adapter.full?.());}
    });
  }
}

// columns 的候选由该类字段对象声明，onEdit 经同一集合字段写入。
function mountCreatedSceneObjectFields(host, {record, columns, onEdit, bound}) {
  host.innerHTML = `<table class="data-table"><tbody>${columns.map(column => `<tr><th>${esc(column.label)}</th>
    <td>${referenceFieldPickerMarkup({reference: column.reference, rows: column.rows, label: column.label,
      value: record[column.name], picker: {grouped: true, previewPanel: true},
      componentAttributes: `data-scene-collection-field="${esc(column.name)}"`})}</td></tr>`).join('')}</tbody></table>${bound ? '' : '↛'}`;
  hydrateReferenceFieldPickers(host);
  for (const picker of host.querySelectorAll('[data-scene-collection-field]')) picker.addEventListener('module-reference-change',
    async event => {
      try {await onEdit({[picker.dataset.sceneCollectionField]: event.detail.value});}
      catch (error) {host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);}
    });
}

// @editor-module 地图格交互类型只经此注册表提供放置规则与集合事务。
const types = new Map([
  ['actor', '场景角色'], ['treasure', '宝箱与调查物'], ['investigation', '设施调查点'],
  ['investigation-special', '专用调查点'], ['investigation-tile', '图块调查（上锁的门）'],
  ['transition', '门、楼梯与坐标传送'], ['boundary', '边界出口'], ['event', '坐标事件'],
  ['map-rewrite', '事件地图改写'], ['scene-state', '场景重映射'],
].map(([kind, label]) => [kind, {kind, label,
  canPlace: ({scene, point}) => kind === 'boundary' && ![0, scene.width - 1].includes(point[0])
    && ![0, scene.height - 1].includes(point[1]) ? '仅边界格' : '未开放', add: null, remove: null}]));

// canPlace({point, objects, scene, operation, object}) 返回空串或一句禁用原因；operation 为 add 或 remove。
// add(context) 返回 {key, record}；remove(object, context) 调用所属字段对象的删除事务。
function registerSceneCellInteraction({kind, label, canPlace, add, remove}) {
  if (!kind || !label || ![canPlace, add, remove].every(callback => typeof callback === 'function')
    || types.get(kind)?.add) throw new TypeError(`格交互类型登记无效：${kind}`);
  types.set(kind, Object.freeze({kind, label, canPlace, add, remove}));
}

function sceneCellInteractionTypes() {return [...types.values()];}
function sceneCellInteractionType(kind) {return types.get(kind);}

// @editor-module 场景重映射接入集合入口并复用场景与事件位选择器。

const sceneHandle = () => `scene:${Number(state.sceneEntry.id).toString(16).toUpperCase().padStart(2, '0')}`;
const repository = () => state.projectRepository;

async function change$1(operation) {
  await editSceneObjectCollection(db, repository(), SCENE_REMAP_OWNER, sceneRemapCollection, operation,
    operation.kind === 'delete' ? await sceneRemapCollection.referenceDocuments(db, repository()) : []);
  state.sceneBgmDocument = await db.getResourceDocument(SCENE_REMAP_OWNER);
}

const remapAdapter = {
  async add() {
    if (sceneRemapRecords(await db.getResourceDocument(SCENE_REMAP_OWNER)).length >= sceneRemapCollection.maximum)
      throw new Error(`已满 ${sceneRemapCollection.maximum}/${sceneRemapCollection.maximum}`);
    const record = {handle: newSceneObjectHandle(SCENE_REMAP_OWNER, Number(state.sceneEntry.id)), kind: 'scene-remap',
      source_scene_reference: sceneHandle(), target_scene_reference: sceneHandle(), global_event_flag_reference: 'global-event-flag:08'};
    await change$1({kind: 'add', record});
    return record;
  },
  async remove(handle) {await change$1({kind: 'delete', handle}); return null;},
  full: () => sceneRemapRecords(state.sceneBgmDocument).length >= sceneRemapCollection.maximum,
};

registerSceneCellInteraction({kind: 'scene-state', label: sceneRemapCollection.label,
  canPlace: ({scene, operation}) => operation === 'remove' || Number(scene.id) > 0 && Number(scene.id) <= 0xEF ? '' : '仅普通场景',
  async add() {
    const record = await remapAdapter.add();
    return {key: `scene-state:${record.handle}`, record};
  },
  remove: object => remapAdapter.remove(object.rewrite.handle),
});

function bindSceneRemapCollection(root, refresh) {
  bindSceneObjectCollectionActions(root, new Map([[sceneRemapCollection.id, remapAdapter]]), ({record, deleted}) => {
    state.sceneLogicSelection = deleted ? null : `scene-state:${record.handle}`;
    refresh();
  });
}

async function mountCreatedSceneRemap(host, rewrite, refresh) {
  const record = sceneRemapRecords(state.sceneBgmDocument).find(row => row.handle === rewrite.handle);
  const document = await db.getResourceDocument(SCENE_REMAP_OWNER);
  const [flags, scenes] = await Promise.all([prepareGlobalEventFlags(), db.getDocument('project.scenes')]);
  const columns = [['global_event_flag_reference', '事件位', 'global-event-flag'],
    ['target_scene_reference', '目的地', 'scene-header-map']].map(([name, label, moduleId]) => {
    const values = document.scene_remap_fields.find(row => row.record_field === name).semantic_edit_domain.allowed_reference_values;
    const candidates = moduleId === 'global-event-flag' ? flags : scenes.editable_scenes.map(row => ({...row,
      handle: `scene:${Number(row.id).toString(16).toUpperCase().padStart(2, '0')}`}));
    return {name, label, reference: {module: moduleId, key: ['handle']},
      rows: candidates.filter(row => values.includes(row.handle))};
  });
  const field = await db.getField(SCENE_REMAP_OWNER, `${SCENE_REMAP_OWNER}:collection:scene-remap`, 'members');
  const bound = Boolean(field.collectionBinding);
  mountCreatedSceneObjectFields(host, {record, columns, bound, onEdit: async changes => {
    await change$1({kind: 'edit', handle: record.handle, changes});
    refresh();
  }});
}

// @editor-module 事件地图改写的两态预览与字段对象控件。

const hex$4 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

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
    <div data-map-rewrite-battle-sources>${worldEventSourcesMarkup(rewrite.eventFlag)}</div>
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
  if (rewrite.type === 'scene-remap' && sceneRemapCollection.newHandlePattern.test(rewrite.handle)) {
    await mountCreatedSceneRemap(host.querySelector('[data-scene-map-rewrite-fields]'), rewrite, refresh);
    if (current()) host.dataset.sceneMapRewriteReady = '1';
    return;
  }
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
      metatileResourceId: `scene:${hex$4(state.scene.id)}`};
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

// @editor-module 新增设施调查点的控件与集合事务共用字段对象。

const hex$3 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const binding = row => row.interaction_binding ? row.interaction_binding.split(':').slice(1).map(Number) : null;

function facilityPointObjects(document, sceneId) {
  const commands = document?.facility_point_expansion?.commands || [];
  return facilityPointRecords(document).filter(row => row.scene_id === Number(sceneId)).map(row => {
    const transfer = binding(row), command = commands.find(command => command.selector === row.handler_selector);
    const service = transfer && state.project?.facilities?.applications?.commands.find(command => command.command_id === transfer[0]);
    return {key: `facility-point:${row.handle}`, kind: 'investigation', layer: 'investigations', facilityPoint: row,
      record: {...row, facility_label: transfer ? transfer[0] ? service?.label : `剧情 ${hex$3(transfer[1])}` : command?.label,
        command_id: transfer?.[0] ?? command?.command_id}};
  });
}

async function change(operation) {
  await flushAllAutoSaves();
  await editSceneObjectCollection(db, state.projectRepository, FACILITY_POINT_OWNER, facilityPointCollection, operation,
    operation.kind === 'delete' ? await facilityPointCollection.referenceDocuments(db, state.projectRepository) : []);
  state.sceneTileActions = await db.getResourceDocument(FACILITY_POINT_OWNER);
}

const facilityPointAdapter = Object.freeze({
  async add([x, y]) {
    await flushAllAutoSaves();
    const row = await addFacilityPoint(db, state.projectRepository, Number(state.sceneEntry.id), x, y);
    state.sceneTileActions = await db.getResourceDocument(FACILITY_POINT_OWNER);
    return row;
  },
  async remove(handle) {await change({kind: 'delete', handle});},
});

registerSceneCellInteraction({kind: 'investigation', label: '设施调查点',
  canPlace: ({point, objects, operation, object}) => {
    if (operation === 'remove') return object?.facilityPoint ? '' : '未开放';
    return objects.some(row => ['investigation', 'investigation-tile', 'treasure', 'investigation-special'].includes(row.kind)
      && row.record.x === point[0] && row.record.y === point[1]) ? '此格已占用' : '';
  },
  async add({point}) {
    const record = await facilityPointAdapter.add(point);
    return {key: `facility-point:${record.handle}`, record};
  },
  remove: object => facilityPointAdapter.remove(object.facilityPoint.handle),
});

function facilityPointInspector(item) {
  const row = item.facilityPoint;
  const number = (key, label, max) => `<label>${label}<input type="number" min="0" max="${max}" value="${row[key]}" data-facility-point-field="${key}"></label>`;
  return `<div class="scene-object-editor" data-facility-point-editor="${esc(row.handle)}">
    <p>${handleMarkup(row.handle, {label: `${row.handle.split(':')[1]}:${row.handle.split(':')[2].slice(0, 8)}…`})}</p>
    ${number('x', '激活点 X', state.scene.width - 1)}${number('y', '激活点 Y', state.scene.height - 1)}
    <div data-facility-point-choices></div></div>`;
}

async function mountFacilityPointInspector(host, item, refresh, services) {
  const row = item.facilityPoint, commands = state.sceneTileActions.facility_point_expansion.commands;
  const [scripts, actors, facilities, scriptPreviews] = await Promise.all([
    db.getResourceDocument('story-interaction-script'), db.getResourceDocument('scene-actor'),
    prepareModuleComponent('facility-config', 'reference'), prepareModuleComponent('story-interaction-script', 'reference'),
  ]);
  for (const prepared of [facilities, scriptPreviews]) if (prepared.error) throw new Error(prepared.error);
  const permission = actors.writeback.interaction_permission;
  const programs = [...sceneInteractionScriptPrograms(scripts, state.project.story),
    ...(await db.storyPageInteractionEntries()).filter(page => Number.isInteger(page.id)).map(page => ({...page.program, id: page.id, label: page.label}))];
  const scriptChoices = programs.filter(entry => entry.id).map(entry => ({value: String(entry.id),
    label: `剧情 ${hex$3(entry.id)} · ${entry.label || scriptPreviews.entries.find(preview => preview.id === entry.id)?.label || ''}`,
    disabled: Boolean(sceneInteractionScriptActorDependency(entry)),
    description: sceneInteractionScriptActorDependency(entry) ? SCENE_INTERACTION_ACTOR_REASON : '',
    details: scriptPreviews.entries.find(preview => preview.id === entry.id)?.pickerDetails || ''}));
  const serviceChoices = new Map(services.map(service => {
    const domain = permission.interactions.find(entry => entry.selector === service.selector);
    const count = Math.max(SCENE_SERVICE_INSTANCE_COUNTS.get(service.selector) || 0,
      (domain?.argument_max ?? -1) + 1, ...[...(domain?.arguments || []), ...service.arguments].map(value => value + 1));
    const choices = Array.from({length: count}, (_, argument) => {
      const instance = sceneActorServiceInstance(service.selector, argument, permission);
      const entry = facilities.entries.find(entry => entry.handle === `application-config-instance:${hex$3(service.selector - 0x10)}:${hex$3(instance)}`);
      const allowed = sceneActorInteractionPermitted({text_region: service.selector, interaction_or_record_id: argument}, permission);
      return {value: String(argument), label: entry ? facilityConfigurationLabel(entry, entry.values, instance) : `实例 ${hex$3(argument)}`,
        disabled: !allowed, description: allowed ? '' : '无有效映射',
        details: entry ? renderModuleComponent('facility-config', 'preview', {entry}) : ''};
    });
    return [service.selector, choices];
  }));
  const transfer = binding(row), activeCommand = transfer ? transfer[0] ? `service:${transfer[0]}` : 'script' : `native:${row.handler_selector}`;
  const commandChoices = [...Array.from({length: 16}, (_, selector) => {
    const command = commands.find(command => command.selector === selector), allowed = Boolean(command?.instances.length);
    return {value: `native:${selector}`, label: command?.label || `${hex$3(selector)} · 无有效映射`,
      group: 'facility', groupLabel: '设施调查', disabled: !allowed, description: allowed ? '' : '无有效映射'};
  }), ...services.filter(service => service.label || serviceChoices.get(service.selector).length).map(service => ({
    value: `service:${service.selector}`, label: service.label || `服务 ${hex$3(service.selector)}`,
    group: 'service', groupLabel: '服务', disabled: !serviceChoices.get(service.selector).some(entry => !entry.disabled),
    description: serviceChoices.get(service.selector).some(entry => !entry.disabled) ? '' : '无有效映射',
  })), {value: 'script', label: '剧情', group: 'script', groupLabel: '剧情', disabled: !scriptChoices.some(entry => !entry.disabled)}];
  if (!host.isConnected) return;
  const choicesHost = host.querySelector('[data-facility-point-choices]');
  const picker = (name, label, value, choices, moduleId = FACILITY_POINT_OWNER, extra = {}) => `<div class="scene-service-selector"><span>${esc(label)}</span>${referencePickerMarkup({
    moduleId, label, value: String(value), items: choices, compact: true,
    componentAttributes: `data-facility-point-choice="${name}"`, ...extra,
  })}</div>`;
  choicesHost.innerHTML = picker('direction', '所需朝向', row.direction,
    ['↑ 上', '↓ 下', '← 左', '→ 右'].map((label, value) => ({value: String(value), label})))
    + picker('behavior_code', '图块行为', row.behavior_code,
      [[0, '任意图块'], [0x6C, '6C · 设施'], [0x70, '70 · 计算机']].map(([value, label]) => ({value: String(value), label})))
    + picker('command', '命令', activeCommand, commandChoices, 'scene-actor', {groupColumn: true})
    + (transfer ? picker('interaction_binding', '交互转接', transfer[1], transfer[0] ? serviceChoices.get(transfer[0]) || [] : scriptChoices,
      transfer[0] ? 'facility-config' : 'story-interaction-script')
      : picker('instance_id', '实例', row.instance_id, Array.from({length: 16}, (_, value) => {
        const command = commands.find(command => command.selector === row.handler_selector), allowed = command.instances.includes(value);
        const entry = facilities.entries.find(entry => entry.handle === `application-config-instance:${hex$3(command.command_id - 0x10)}:${hex$3(value)}`);
        return {value: String(value), label: entry ? facilityConfigurationLabel(entry) : `实例 ${hex$3(value)}`,
          disabled: !allowed, description: allowed ? '' : '无有效映射',
          details: entry ? renderModuleComponent('facility-config', 'preview', {entry}) : ''};
      }), 'facility-config'));
  const edit = async changes => {
    try {
      const next = {...row, ...changes};
      if (next.x < 0 || next.x >= state.scene.width || next.y < 0 || next.y >= state.scene.height)
        throw new Error('设施调查坐标超出地图');
      if (['investigation_points', 'treasures', 'investigation_special_points'].some(key =>
        state.sceneLogic.layers[key].some(origin => origin.x === next.x && origin.y === next.y)))
        throw new Error('同格已有调查对象');
      await change({kind: 'edit', handle: row.handle, changes});
      await refresh();
    } catch (error) {
      host.querySelector('[data-facility-point-error]')?.remove();
      host.insertAdjacentHTML('beforeend', `<p role="alert" data-facility-point-error>${esc(error.message)}</p>`);
      return false;
    }
    return true;
  };
  for (const input of host.querySelectorAll('[data-facility-point-field]')) input.addEventListener('change', async () => {
    input.disabled = true;
    if (!await edit({[input.dataset.facilityPointField]: Number(input.value)})) input.value = String(row[input.dataset.facilityPointField]);
    if (input.isConnected) input.disabled = false;
  });
  for (const control of choicesHost.querySelectorAll('[data-facility-point-choice]')) bindReferencePicker(control, {
    paint: hydrateModuleComponents,
    onSelect: async value => {
      const name = control.dataset.facilityPointChoice;
      let changes;
      if (name === 'command') {
        if (value === activeCommand) return;
        const [kind, selector] = value.split(':');
        changes = kind === 'native' ? {handler_selector: Number(selector), instance_id: commands.find(command => command.selector === Number(selector)).instances[0], interaction_binding: ''}
          : {interaction_binding: kind === 'script' ? `actor:0:${scriptChoices.find(entry => !entry.disabled).value}`
            : `actor:${selector}:${serviceChoices.get(Number(selector)).find(entry => !entry.disabled).value}`};
      } else changes = name === 'interaction_binding' ? {interaction_binding: `actor:${transfer[0]}:${value}`} : {[name]: Number(value)};
      if (!await edit(changes)) await refresh();
    },
  });
}

// @editor-module 场景逻辑对象、交互、调查与宝箱编辑器


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
    ...facilityPointObjects(state.sceneTileActions, state.sceneEntry.id),
    ...(state.sceneMapPointDocument && state.sceneElevatorMetatiles ? sceneMapPointObjects(
      {...state.sceneMapPointDocument, scene: state.scene}, state.sceneElevatorMetatiles,
      state.project.scenes.logic.investigation_tile_behavior_catalog) : []),
    ...worldTideTriggers(state.sceneTideDocument, state.sceneEntry.id).map(record => ({
      key: `tide:${record.id}`, kind: 'tide', layer: 'events', record,
    })),
    ...sceneElevatorPoints(state.scene, state.sceneElevatorMetatiles).map(record => ({
      key: `elevator:${record.id}`, kind: "elevator", layer: "transitions", record,
    })),
    ...(layers.metatile_investigation_points || []).map(record => ({key: `investigation-tile:${record.id}`, kind: "investigation-tile", layer: "investigations", record})),
    ...actors,
    ...sceneBombardments(actors.map(item => item.record), state.sceneStoryDocuments?.autonomous,
      state.project.story).map(bombardment => ({key: bombardment.key, kind: 'bombardment',
      layer: 'events', record: bombardment.actor, bombardment})),
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
  if (item.facilityPoint) return item.facilityPoint.handle;
  if (item.mapPoint) return item.mapPoint.handle;
  const sceneId = Number(state.sceneEntry?.id || 0);
  const sceneIdHex = sceneId.toString(16).toUpperCase().padStart(2, "0");
  if (item.rewrite) return item.rewrite.handle;
  if (item.bombardment) return item.bombardment.handle;
  if (item.kind === 'event') return worldEventHandle(item.record.id);
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
    ? `调查物取得位 ${hex$6(model.flag_id, 2)}` : eventFlagReferenceMarkup(model.flag_id)}` : '';
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
    const monsterIdHex = hex$6(monsterId, 2);
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
    encounterIdHex: hex$6(encounterId, 2),
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
  if (item.bombardment) return `轰炸区域 · ${sceneObjectCoordinateLabel(item)}`;
  const record = item.record;
  if (item.rewrite) return `${item.rewrite.label} · global-event-flag:${Number(item.rewrite.eventFlag).toString(16).toUpperCase().padStart(2, '0')}`;
  if (item.kind === 'scene-state') return record.label;
  if (item.kind === 'tide') return `潮汐触发 · ${['↑', '↓', '←', '→'][record.direction]}`;
  if (item.kind === "elevator") return `电梯 · ${record.configuration_handle}`;
  if (item.kind === "actor") {
    const interaction = actorInteractionLabel(record);
    const variant = item.variant
      ? `[${globalEventFlagHandle(item.variant.event_flag)} → ${hex$6(item.variant.replacement_entry_id, 2)}] ` : "";
    const pose = item.pose;
    return `${variant}角色 ${hex$6(record.id, 2)} · 类型 ${hex$6(pose?.actor_type ?? record.actor_type, 2)} · ${interaction}${pose ? ` · ${pose.conditions.join('、')} · 初始动作` : ''}`;
  }
  if (item.kind === "vehicle") {
    return `战车初始停放 · 车位 ${Number(record.vehicle_slot) + 1} · 预设 ${hex$6(item.presetId, 2)}`;
  }
  if (item.kind === "treasure") {
    const contentId = Number(record.content_id);
    const itemRecord = state.project.game_data?.items?.records?.find(entry => Number(entry.id) === contentId);
    const content = record.content_label || (contentId >= 0xF0 && contentId <= 0xFB
      ? `金钱奖励 ${hex$6(contentId, 2)}`
      : `${itemRecord?.name || "物品"} ${hex$6(record.content_id, 2)}`);
    const stateLabel = sceneInteractionStateLabel(record);
    return `调查物 ${hex$6(record.id, 2)} · ${content}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "investigation") {
    if (item.facilityPoint) return `设施调查 · ${record.facility_label} · ${record.x}, ${record.y}`;
    return `调查激活点 ${hex$6(record.id, 2)} · ${record.facility_label} · 实例 ${hex$6(record.instance_id, 2)}`;
  }
  if (item.kind === "investigation-special") {
    const stateLabel = sceneInteractionStateLabel(record);
    return `专用调查点 ${hex$6(record.id, 2)} · ${record.label}${stateLabel ? ` · ${stateLabel}` : ""}`;
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
    const targetLabel = target?.name || target?.slug || `场景 ${hex$6(record.destination_scene_id, 2)}`;
    return record.transition_kind === "world-location-entrance"
      ? `大地图地点入口 ${hex$6(record.id, 2)} → ${targetLabel}`
      : `门/传送 ${hex$6(record.id, 2)} → ${targetLabel}`;
  }
  if (item.kind === "boundary-return") {
    return "全部边界 → 返回进入本场景前保存的场景与坐标";
  }
  if (item.kind === "boundary") {
    const direction = sceneBoundaryDirections[Number(record.direction_code)];
    const label = direction ? `${direction.label} ${direction.arrow}` : "全部边界";
    return `${label} → 场景 ${hex$6(record.destination_scene_id, 2)}`;
  }
  return `坐标事件 ${hex$6(record.id, 2)} · ${globalEventFlagHandle(record.event_flag)} · 状态 ${hex$6(record.story_state, 2)}`;
}

function formationContentName(id) {
  const formations = state.sceneEncounterFormations?.records || state.project.game_data.battle_test.formations;
  if (!formations.some(row => Number(row.id) === Number(id))) return '';
  return encounterFormationGroups(formations, Number(id)).map(slot =>
    state.project.game_data.monsters.records.find(row => Number(row.id) === slot.monsterId)?.name)
    .filter(Boolean).filter((name, index, names) => names.indexOf(name) === index).join('、');
}

function sceneObjectTreeLabel(item) {
  const record = item.record;
  const sceneName = id => storyComponentLabel((state.project.scenes?.editable_scenes || [])
    .find(scene => Number(scene.id) === Number(id))?.name || '场景');
  if (item.rewrite) {
    if (item.rewrite.type === 'scene-remap') return `事件后场景 · ${sceneName(parseInt(record.target_scene_reference.split(':').at(-1), 16))}`;
    if (item.rewrite.type === 'world-coarse-switch') return `${item.rewrite.after.label}地形`;
    const patterns = [...new Set((item.rewrite.record.replacements || []).map(row => row.metatile_id))];
    return patterns.length ? `${item.rewrite.type === 'world-coarse-replacement' ? '图案' : '图块'} ${patterns.join('/')}` : item.rewrite.label;
  }
  if (item.bombardment) return `(${item.bombardment.region.x},${item.bombardment.region.y})`;
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
    return content;
  }
  if (item.kind === 'investigation') return record.facility_label || '设施调查';
  if (item.kind === 'investigation-special') return record.label || '专用调查';
  if (item.kind === 'investigation-tile') return Number(record.behavior_code) === 0x54 ? '离场复原机关'
    : investigationBattleFormation(record) ? formationContentName(investigationBattleFormation(record).encounterId) || '调查战斗' : record.label || '图块调查';
  if (item.kind === 'transition') return sceneName(record.destination_scene_id);
  if (item.kind === 'boundary-return') return '边界返回';
  if (item.kind === 'boundary') return `${sceneBoundaryDirections[Number(record.direction_code)]?.label || '全部边界'} · ${sceneName(record.destination_scene_id)}`;
  const context = state.project.story?.story_mode_contexts?.entries?.find(row => Number(row.story_state) === Number(record.story_state));
  const sequence = state.project.story?.cutscene_inventory?.entries?.find(row => row.actor_list_ids?.includes(context?.scene_actor_entry));
  return formationContentName(record.encounter_formation_id)
    || (sequence ? storySequenceComponentLabel(sequence.id, sequence.label) : '坐标剧情事件');
}

function sceneObjectTreeQualifiers(item) {
  const coordinate = sceneObjectCoordinate(item);
  return [
    coordinate?.every(Number.isFinite) ? `(${coordinate.join(',')})` : '',
  ];
}

function sceneObjectTreeLabels(items, {label = sceneObjectTreeLabel,
  qualifiers = sceneObjectTreeQualifiers} = {}) {
  const labels = new Map(items.map(item => [item, label(item)]));
  const groups = new Map();
  for (const [item, name] of labels) {
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const used = new Set(labels.values());
  for (const [name, peers] of groups) {
    if (peers.length < 2) continue;
    const choices = peers.map(qualifiers);
    const unique = suffixes => suffixes.every(suffix => suffix && !used.has(`${suffix} · ${name}`))
      && new Set(suffixes).size === peers.length;
    const shared = choices[0].map((_, index) => choices.map(row => row[index]))
      .filter(unique).sort((left, right) => left.join('').length - right.join('').length)[0];
    peers.forEach((item, index) => {
      const suffix = shared?.[index] || choices[index].filter(candidate => candidate
        && choices.every((row, other) => other === index || !row.includes(candidate))
        && !used.has(`${candidate} · ${name}`)).sort((left, right) => left.length - right.length)[0]
        || (Number.isInteger(item.record?.id) ? `编号 ${hex$6(item.record.id, 2).replace('0x', '$')}` : item.key);
      let result = `${suffix} · ${name}`;
      if (used.has(result)) result = `${item.key} · ${name}`;
      labels.set(item, result);
      used.add(result);
    });
  }
  return labels;
}

function sceneObjectCoordinate(item) {
  if (item.bombardment) {
    const {x, y, width, height} = item.bombardment.region;
    return [x + Math.floor(width / 2), y + Math.floor(height / 2)];
  }
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
  if (item.bombardment) {
    const {x, y, width, height} = item.bombardment.region;
    return `${x}, ${y}–${x + width - 1}, ${y + height - 1}`;
  }
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
  if (mode === "interaction-script") return `交互脚本 ${hex$6(argument, 2)}`;
  if (mode === "direct-dialogue") return `直接对话 ${hex$6(selector, 2)}:${hex$6(argument, 2)}`;
  const service = actorServiceCatalog().find(entry => entry.selector === selector);
  const status = actorServiceStatusPresentation(service);
  return `${actorServiceDisplayName(service)}${status ? `（${status.label}）` : ""} ${
    hex$6(selector, 2)
  } · 参数 ${hex$6(argument, 2)}`;
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
      selector_hex: hex$6(selector, 2),
      command_id_hex: hex$6(commandId, 2),
      facility_kind: command?.kind || source.facility_kind || "investigation-command",
      facility_label: command?.label || (
        extractedLabel && extractedLabel !== "调查命令"
          ? extractedLabel
          : `调查命令 ${hex$6(commandId, 2)}`
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
  const prefix = `配置 ${hex$6(variant.instance_id, 2)}`;
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
    || `${Number(commandId) === 0x1B ? "道具" : "炮弹"} ${hex$6(productId, 2)}`;
}

function refreshInvestigationDerivedFields(record) {
  const command = investigationCommandEntry(record.handler_selector);
  if (!command) return;
  const selector = Number(command.selector);
  const instanceId = Number(record.instance_id);
  record.handler_selector = selector;
  record.handler_selector_hex = hex$6(selector, 2);
  record.instance_id = instanceId;
  record.instance_id_hex = hex$6(instanceId, 2);
  record.packed_handler_instance = (instanceId << 4) | selector;
  record.packed_handler_instance_hex = hex$6(record.packed_handler_instance, 2);
  record.command_id = Number(command.command_id);
  record.command_id_hex = hex$6(command.command_id, 2);
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

// @editor-module 新增调查记录的编辑字段引用集合字段，不另存正文。

async function sceneMapPointFieldObject(database, resourceId, handle) {
  const members = await database.getField(resourceId, `${resourceId}:collection:map-investigation`, 'members');
  const record = () => {
    const row = members.value.created.find(row => row.handle === handle);
    if (!row) throw new TypeError('新增图块调查不存在');
    return row;
  };
  const initial = record();
  const [document, pages, sets] = await Promise.all([database.getResourceDocument(resourceId),
    database.getResourceDocument('metatile-page'), database.getResourceDocument('metatile-set')]);
  const attributes = sceneMetatileAttributeRecords(document.scene, {pages, sets})
    .flatMap(row => row.metatile_attributes || row.metatile_attribute_page || []);
  const nativeBehavior = attributes[sceneMapCell(document.scene, initial.x, initial.y).metatileId] & 0x7c;
  const names = ['interaction_binding', 'behavior_code'];
  const fields = names.map(fieldName => ({resourceId, entityHandle: handle, fieldName,
    defaultValue: fieldName === 'interaction_binding' ? '' : initial.behavior_code ?? nativeBehavior,
    get value() {return record()[fieldName] ?? (fieldName === 'behavior_code' ? nativeBehavior : '');},
    get hasOverride() {return this.value !== this.defaultValue;},
    writeback: members.collectionBinding ? {state: 'permitted'} : {state: 'unpermitted'},
    bind(host, render) {members.bind(host, () => {
      if (members.value.created.some(row => row.handle === handle)) render();
    });},
  }));
  return {id: handle, resourceId, fields,
    isCurrent: () => members.value.created.some(row => row.handle === handle),
    database: {async writeFields(changes) {
    if (changes.some(row => !fields.includes(row.field))) throw new TypeError('新增调查字段身份无效');
    await editSceneMapPoint(database, resourceId, handle,
      Object.fromEntries(changes.map(row => [row.field.fieldName, row.reset ? row.field.defaultValue : row.value])));
    return changes.map(row => row.field);
  }}};
}

// @editor-module 隐藏目的地、大门与存档事件位的往返链接。

const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const link$1 = (href, label) => `<a class="editor-inline-link" href="${esc(href)}">${esc(label)} ↗</a>`;

function hiddenTeleportConditionsMarkup(project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  return `仅错误传送可达 · ${hidden.trigger_flags.map(flag => `${eventFlagReferenceMarkup(flag.id)} = ${flag.value}`).join(' 且 ')}
    <p>触发后 ${eventFlagReferenceMarkup(hidden.set_flag)} = 1；
    ${link$1(controllerSceneHref(hidden.gate.scene_id, project, {point: [hidden.gate.cells[0].x,
      hidden.gate.cells[0].y]}), '下方大门开放')}</p>`;
}

function hiddenTeleportSceneMarkup(sceneId, selection, project) {
  const hidden = hiddenTeleportDestination(project);
  if (!hidden) return '';
  if (Number(sceneId) !== hidden.scene_id) return '';
  return `<div data-hidden-teleport-source><p>${link$1('?view=teleport&facilityTab=config#hidden-teleport',
    '来源：时空隧道错误传送')}</p>
    ${hiddenTeleportConditionsMarkup(project)}
    <p>${link$1(controllerSceneHref(hidden.scene_id, project), `隐藏目的地 scene:${hex$2(hidden.scene_id)}`)}</p></div>`;
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

// @editor-module 场景对象容量按读取器、身份域与地图尺寸计算。

function sceneObjectsAtCell(scene, objects, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= scene.width || y >= scene.height) return [];
  return objects.filter(item => {
    if (item.rewrite) return sceneMapRewriteContains(item.rewrite, x, y);
    if (item.bombardment) return bombardmentContains(item.bombardment.region, x, y);
    if (item.kind.startsWith('boundary')) {
      const sides = {1: y === 0, 2: y === scene.height - 1, 3: x === 0, 4: x === scene.width - 1};
      return item.record.direction_code ? sides[item.record.direction_code] : Object.values(sides).some(Boolean);
    }
    const row = item.pose || item.record;
    return Number(row.x ?? row.trigger_x) === x && Number(row.y ?? row.trigger_y) === y;
  });
}

function sceneObjectCapacity(kind, {scene, objects, logicIndex, lifecycle, worldEvents, facilityPoints}) {
  const rows = objects.filter(item => kind === 'boundary' ? item.kind.startsWith(kind) : item.kind === kind);
  const global = (key, maximum) => ({used: (logicIndex?.[key] || []).length, maximum, scope: '全游戏'});
  const local = maximum => ({used: rows.length, maximum, scope: '本场景'});
  switch (kind) {
    case 'actor': return {...local(14), used: new Set(rows.filter(row => !row.variant)
      .map(row => row.reference?.id ?? row.record.id)).size, constraint: '每张角色表最多14槽', slots: 14};
    case 'treasure': return global('treasures', 256);
    case 'investigation': return {used: (logicIndex?.investigation_points || []).length + facilityPointRecords(facilityPoints).length,
      maximum: 255, scope: '全游戏'};
    case 'investigation-special': return global('investigation_special_points', 128);
    case 'investigation-tile': return {...local(null),
      constraint: '受地图尺寸、既有调查行为、坐标转接表与扩展共用池约束'};
    case 'transition': return local(86);
    case 'elevator': return {...local(null), constraint: '受地图尺寸与五个原版实例的场景范围约束'};
    case 'boundary': return {...local(4), used: rows.some(row => !Number(row.record.direction_code)) ? 4 : rows.length,
      slots: 4, constraint: '四个方向'};
    case 'event': return {used: worldEvents?.records?.length ?? logicIndex?.summary?.event_triggers ?? 44,
      maximum: 129, scope: '全游戏', constraint: '原扫描算法'};
    case 'tide': return {used: 1, maximum: 1, slots: 1, scope: '全游戏', constraint: '固定触发'};
    case 'map-rewrite': {
      const groups = scene.event_metatile_replacements || [];
      return {used: 1 + groups.reduce((n, group) => n + 2 + group.replacements.length * 3, 0),
        maximum: 256, scope: '本场景', constraint: '单组最多84格', unit: '字节'};
    }
    case 'scene-state': return {used: sceneRemapRecords(lifecycle).length,
      maximum: sceneRemapCollection.maximum, scope: '全游戏'};
    case 'vehicle': return {...local(8), slots: 8, constraint: '八辆原版自有战车'};
    case 'bombardment': return {...local(null), constraint: '由角色自动动作派生，无独立表容量'};
    default: throw new TypeError(`未声明对象容量：${kind}`);
  }
}

// @editor-module 容量计数与小容量槽位共用场景对象的当前值。

function currentSceneObjectCapacity(kind, objects) {
  return sceneObjectCapacity(kind, {scene: state.scene, objects, logicIndex: state.project.scenes.logic,
    lifecycle: state.sceneBgmDocument, worldEvents: state.sceneWorldEvents, facilityPoints: state.sceneTileActions});
}

function sceneObjectCapacityMarkup(kind, objects) {
  const value = currentSceneObjectCapacity(kind, objects);
  const count = `${value.scope} ${value.used}${value.maximum == null ? '' : ` / ${value.maximum}`}${value.unit ? ` ${value.unit}` : ''}`;
  return `<span class="scene-object-capacity" data-scene-capacity="${kind}" title="${esc(value.constraint || value.scope)}">${esc(count)}</span>`;
}

function sceneObjectSlots(kind, records, renderRow) {
  if (kind === 'actor') {
    const tables = new Map();
    tables.set(Number(state.sceneEntry.id), []);
    for (const item of records) {
      const id = Number(item.variant?.replacement_entry_id ?? state.sceneEntry.id);
      if (!tables.has(id)) tables.set(id, []);
      tables.get(id).push(item);
    }
    return [...tables].map(([id, rows]) => `<div class="scene-slot-table" data-scene-slot-table="${id}">
      <p title="每张角色表最多14槽">${id === Number(state.sceneEntry.id) ? '默认角色表' : `替换角色表 ${id.toString(16).toUpperCase().padStart(2, '0')}`} <span data-scene-capacity="actor">本场景 ${new Set(rows.map(row => row.reference?.id ?? row.record.id)).size} / 14</span></p>
      ${Array.from({length: 14}, (_, index) => {
        const members = rows.filter(item => Number(item.reference?.id ?? item.record.id) === index);
        return `<div data-scene-slot-index="${index}">${members.length ? members.map(renderRow).join('') : emptySlot(index)}</div>`;
      }).join('')}</div>`).join('');
  }
  const slots = {boundary: 4, tide: 1, vehicle: 8}[kind];
  if (!slots) return records.map(renderRow).join('');
  const occupied = index => kind === 'vehicle' ? records.some(row => Number(row.record.vehicle_slot) === index)
    : kind === 'boundary' ? records.some(row => !Number(row.record.direction_code) || Number(row.record.direction_code) === index + 1)
    : true;
  return records.map(renderRow).join('') + `<div class="scene-capacity-slots" data-scene-capacity-slots="${kind}">${
    Array.from({length: slots}, (_, index) => `<span class="${occupied(index) ? 'scene-slot-occupied' : 'scene-slot-empty'}" title="${occupied(index) ? '占用' : '空位'}">${kind === 'boundary' ? ['↑', '↓', '←', '→'][index] : index.toString(16).toUpperCase().padStart(2, '0')} ${occupied(index) ? '●' : '空位'}</span>`).join('')}</div>`;
}

const emptySlot = index => `<div class="scene-object-row scene-empty-slot" data-scene-empty-slot="${index}"><i></i><span>${index.toString(16).toUpperCase().padStart(2, '0')} · 空位</span></div>`;

// @editor-module 地图格交互选择器调用注册表中的字段事务。

const resourceId = () => `scene:${Number(state.sceneEntry.id).toString(16).toUpperCase().padStart(2, '0')}`;
const kindOf = object => object?.kind.startsWith('boundary') ? 'boundary' : object?.kind;

async function acceptSavedMap() {
  const document = await db.getResourceDocument(resourceId());
  state.sceneMapPointDocument = document;
  state.scene.map = structuredClone(document.scene.map);
  state.sceneOriginalMap = structuredClone(document.scene.map);
  invalidateSceneSurface(state.scene);
}

async function prepareMapChange() {
  await flushAllAutoSaves();
  if (state.sceneDirty) throw new Error('场景修改尚未保存');
}

const mapAdapter = {
  async add([x, y]) {
    await prepareMapChange();
    const metatileId = sceneMapPointMetatiles(state.scene, state.sceneElevatorMetatiles)[0];
    const record = await addSceneMapPoint(db, state.projectRepository, resourceId(), {x, y, metatileId});
    await acceptSavedMap();
    return record;
  },
  async remove(handle) {
    await prepareMapChange();
    await deleteSceneMapPoint(db, state.projectRepository, resourceId(), handle);
    await acceptSavedMap();
  },
};

registerSceneCellInteraction({kind: 'investigation-tile', label: '图块调查',
  canPlace: ({point, objects, scene, operation, object}) => {
    if (operation === 'remove') return object?.mapPoint ? '' : '未开放';
    const cell = sceneMapCell(scene, ...point);
    if (!cell) return '此格不能新增图块调查';
    const coordinate = Number(scene.id) === 0 || scene.runtime_map || cell.sourceY == null
      || !sceneMapPointMetatiles(scene, state.sceneElevatorMetatiles).length;
    const transfer = sceneMapPointTransferCapacity(state.sceneMapPointDocument);
    if (coordinate && transfer.used >= transfer.maximum) return '坐标转接表容量已满，整表须在同一 bank 内';
    return sceneMapPointConflict(state.sceneMapPointDocument, ...point)
      || sceneMapPointRecords(state.sceneMapPointDocument, resourceId()).some(row => row.x === point[0] && row.y === point[1])
      || objects.some(row => row.kind === 'investigation' && row.record.x === point[0] && row.record.y === point[1])
      ? '此格已有图块调查或先行调查点' : '';
  },
  async add({point}) {
    const record = await mapAdapter.add(point);
    return {key: `map-investigation:${record.handle}`, record};
  },
  remove: object => mapAdapter.remove(object.mapPoint.handle),
});

function placementReason(type, context) {
  const {used, maximum} = currentSceneObjectCapacity(type.kind, context.objects);
  return maximum != null && used >= maximum ? `已满 ${used}/${maximum}` : type.canPlace(context);
}

function removalReason(object, context) {
  const type = sceneCellInteractionType(kindOf(object));
  return !type?.remove ? '未开放' : type.canPlace({...context, object, operation: 'remove'});
}

function sceneCellInteractionMarkup(objects, label) {
  const selected = objects.find(object => object.key === state.sceneLogicSelection);
  const point = state.sceneTileSelection || selected && sceneObjectCoordinate(selected);
  if (!point || !sceneMapCell(state.scene, ...point)) return '';
  const context = {point, objects, scene: state.scene, operation: 'add'};
  const matches = sceneObjectsAtCell(state.scene, objects, ...point);
  return `<section data-scene-cell-interactions="${point.join(',')}">${(matches.length ? matches : [null]).map(object => {
    const emptyReason = object ? removalReason(object, context) : '';
    const items = [{value: 'empty', label: emptyReason ? `空 · ${emptyReason}` : '空', group: 'empty', groupLabel: '空',
      disabled: Boolean(emptyReason)}, ...sceneCellInteractionTypes().map(type => {
      const reason = placementReason(type, context);
      return {value: type.kind, label: `${type.label}${reason ? ` · ${reason}` : ''}`,
        group: type.kind, groupLabel: type.label, disabled: Boolean(reason)};
    })];
    const kind = kindOf(object) || 'empty';
    if (!items.some(item => item.value === kind)) items.push({value: kind, label: label(object),
      group: kind, groupLabel: label(object), disabled: true, description: '未开放'});
    return sceneCellInteractionRow({items, value: kind, point, key: object?.key,
      current: {value: kind, label: object ? label(object) : '空'}});
  }).join('')}</section>`;
}

function acceptSelection(key, point, refresh) {
  state.sceneLogicSelection = key || (point && sceneObjectsAtCell(state.scene, sceneLogicObjects(), ...point)[0]?.key) || null;
  state.sceneTileSelection = point;
  state.sceneFocusPoint = point;
  replaceHistoryUrl(currentViewUrl());
  refresh();
}

function interactionPreview(value, picker) {
  const option = [...picker.querySelectorAll('[data-reference-picker-option]')]
    .find(row => row.dataset.referencePickerOption === value);
  const point = picker.dataset.sceneInteractionPoint.split(',').map(Number);
  return `<p>${esc(option?.querySelector('b').textContent || '')}</p><p>坐标 ${point.join(', ')}</p>${
    value === 'empty' ? '' : renderModuleComponent('scene-header-map', 'preview',
      {entry: state.sceneEntry, sceneId: state.sceneEntry.id, interactive: false, width: 240, height: 150})}`;
}

function bindSceneCellActions(host, refresh) {
  bindSceneObjectCollectionActions(host, new Map([['map-investigation', mapAdapter]]), ({record}) =>
    acceptSelection(record ? `map-investigation:${record.handle}` : null,
      record ? [record.x, record.y] : state.sceneTileSelection, refresh));
  for (const picker of host.querySelectorAll('[data-scene-cell-interaction]')) {
    const currentLabel = picker.querySelector('[data-reference-picker-current-copy] b').innerHTML;
    bindReferencePicker(picker, {preview: value => interactionPreview(value, picker), paint: hydrateModuleComponents,
      onSelect: async value => {
        const point = picker.dataset.sceneInteractionPoint.split(',').map(Number);
        const objects = sceneLogicObjects();
        const object = objects.find(row => row.key === picker.dataset.sceneCellInteraction);
        const previous = kindOf(object) || 'empty';
        if (value === previous) {
          picker.querySelector('[data-reference-picker-current-copy] b').innerHTML = currentLabel;
          return;
        }
        const context = {point, objects, scene: state.scene, operation: 'add'};
        try {
          if (value === 'empty') {
            const reason = removalReason(object, context);
            if (reason) throw new Error(reason);
            await sceneCellInteractionType(previous).remove(object, context);
            acceptSelection(null, point, refresh);
          } else {
            const type = sceneCellInteractionType(value);
            const reason = placementReason(type, context);
            if (reason) throw new Error(reason);
            const result = await type.add(context);
            acceptSelection(result.key, point, refresh);
          }
        } catch (error) {
          await setReferencePickerValue(picker, previous);
          picker.querySelector('[data-reference-picker-current-copy] b').innerHTML = currentLabel;
          const row = picker.closest('.scene-cell-interaction-row');
          row.querySelector('[data-scene-collection-error]')?.remove();
          row.insertAdjacentHTML('beforeend', `<p role="alert" data-scene-collection-error>${
            esc(/被引用/u.test(error.message) ? '被引用，不能删除' : error.message)}</p>`);
        }
      },
    });
  }
}

function sceneCellObjectsMarkup(objects, label) {
  if (objects.length < 2) return '';
  return `<section class="scene-cell-objects" data-scene-cell-objects><h4>本格对象</h4>${objects.map(item =>
    `<button type="button" class="button${state.sceneLogicSelection === item.key ? ' active' : ''}" data-scene-object="${esc(item.key)}">${esc(label(item))}</button>`).join('')}</section>`;
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

// @editor-module 轰炸区域的脚本字段、事件条件与共用场景动作预览。

function renderBombardmentInspector(bomb) {
  const {x, y, width, height} = bomb.region;
  const sequence = bomb.visual.semantic.sequences?.find(row => row.selector === bomb.visual.operands[0]);
  const fixed = writeAccessMarker({readOnly: true, reason: '处理器代码参数；语义写入未开放'});
  return `<div class="scene-object-editor" data-scene-bombardment="${esc(bomb.key)}">
    <div class="scene-object-identity">${handleMarkup(bomb.handle, {})} · 指令 ${bomb.range.cursor}</div>
    <h3>轰炸区域</h3><p>玩家范围 (${x}, ${y})–(${x + width - 1}, ${y + height - 1}) · 含端点</p>
    <p data-bombardment-condition>关闭位：${bomb.flags.map(flag => `${eventFlagReferenceMarkup(flag,
      {label: `$${flag.toString(16).toUpperCase().padStart(2, '0')}`})}（${worldEventSourcesMarkup(flag, {compact: true})}）`).join('、')} 全部置位后停止</p>
    <details><summary>爆炸效果 ${fixed}</summary>
    <p title="相机格原点加偏移；X 取随机高字节低三位，Y 取 X 索引加随机低字节与 X 加法进位后的低三位">随机偏移 [${bomb.effect.semantic.delta_table.join(', ')}]</p>
    <p title="越界、不可通行或属性匹配时重选">排除属性 &amp; ${bomb.effect.semantic.blocked_attribute_mask} = ${bomb.effect.semantic.blocked_attribute_value}</p>
    <p title="未乘车的存活人物">伤害 ${bomb.effect.semantic.damage_cells?.map(cell => `(${cell.x}, ${cell.y}) ${cell.damage} HP`).join('；') || '—'}</p>
    <p>形象 ${sequence?.selector ?? '—'} · ${sequence?.durations.join(' / ') ?? '—'} 帧 · 音频 ${sequence?.sound_command_hex ?? '—'}</p>
    ${bomb.companion ? `<p title="已安排的爆炸可在关闭后完成">后续 ${handleMarkup(bomb.companion.actions[0].handle, {})} · ${
      bomb.companion.actions.find(action => action.operation === 'wait')?.semantic.frames ?? '—'} 帧</p>` : ''}
    </details>
    <div class="scene-mode-switch"><button type="button" class="button" data-bombardment-phase="before">胜利前</button>
      <button type="button" class="button" data-bombardment-phase="after">关闭后</button>
      <button type="button" class="button" data-bombardment-pause>暂停</button></div>
    <p data-bombardment-frame></p>${scenePreviewMarkup({label: '轰炸预览', canvasAttributes: 'data-bombardment-canvas', height: 240})}
    <div data-bombardment-fields></div></div>`;
}

async function mountBombardment(bomb, {refresh, draw}) {
  const host = document.querySelector('[data-scene-bombardment]');
  if (host?.dataset.sceneBombardment !== bomb.key) return;
  const current = () => host.isConnected && state.sceneLogicSelection === bomb.key;
  host.addEventListener('field-object-saved', async () => {
    if (!current()) return;
    const document = await db.getResourceDocument('story-autonomous-script');
    const actors = (await db.getDocument('scene-actor')).records.filter(record => Number(record.entry_id) === 0);
    state.sceneStoryDocuments.autonomous = await prepareStorySceneActions(
      actors, document, state.project.story, db);
    state.sceneBombardmentCatalog = sceneBombardments(actors, state.sceneStoryDocuments.autonomous, state.project.story);
    refresh(); draw();
  });
  const fields = host.querySelector('[data-bombardment-fields]');
  const context = {...state.sceneStoryDocuments, story: state.project.story, scenes: state.project.scenes};
  await mountStorySceneActions(fields, bomb.actor, context, db, Number(state.scene.id),
    {filter: action => bomb.controls.some(control => control.cursor === action.cursor), editableOnly: true});
  if (bomb.companion) await mountStorySceneActions(fields, bomb.companion.record, context, db, Number(state.scene.id), {editableOnly: true});
  if (!current()) return;
  const setDocument = await db.getResourceDocument('metatile-set');
  const attributes = sceneMetatileAttributeRecords(state.scene, {sets: setDocument})
    .flatMap(record => record.metatile_attributes || []);
  const terrain = state.project.story.browser_vm.collision_model.checks.find(check => check.kind === 'terrain-attribute');
  const rows = predicate => state.scene.map.map(row => row.map(id => predicate(attributes[id]) ? '1' : '0').join(''));
  const sceneContext = {scene_id: Number(state.scene.id), width: state.scene.width, height: state.scene.height,
    terrain_out_of_bounds_rows: rows(value => value & terrain.out_of_bounds_mask),
    terrain_attribute_blocked_rows: rows(value => (value & terrain.mask) >= terrain.blocked_min
      && (value & terrain.mask) < terrain.passable_min),
    low_type_blocked_rows: rows(value => (value & terrain.mask) === bomb.effect.semantic.blocked_attribute_value)};
  const {x, y, width, height} = bomb.region;
  const playerX = x + Math.floor(width / 2), playerY = y + Math.floor(height / 2);
  const cameraX = playerX - 8, cameraY = playerY - 7;
  const background = document.createElement('canvas');
  background.width = 256; background.height = 240;
  const surface = await loadSceneSurface(state.scene);
  if (!current()) return;
  background.getContext('2d').drawImage(surface, cameraX * 16, cameraY * 16, 256, 240, 0, 0, 256, 240);
  const project = {...state.project, story_autonomous_edits: state.sceneStoryDocuments.autonomous};
  const core = createSceneActionCore({readProject: () => project, database: db});
  const actors = [bomb.actor, ...(bomb.companion ? [bomb.companion.record] : [])];
  const variant = {id: Number(state.scene.id), scene_id: Number(state.scene.id),
    selection: {scene_id: Number(state.scene.id)}, scene_contexts: [sceneContext],
    actors: actors.map(record => ({...record, record_id: record.id, currentRecord: true}))};
  const build = phase => core.buildStoryVmVariant(variant, {playerMapX: playerX, playerMapY: playerY,
    cameraTileOriginX: cameraX, cameraTileOriginY: cameraY, partySlots: [],
    eventFlags: phase === 'after' ? bomb.flags : bomb.paths[0].set,
    previewAfterControlFrames: 240, previewFrameLimit: 240});
  let phase = 'before', compiled = build(phase), frame = 0, paused = false, previous = 0;
  host.dataset.bombardmentFrames = String(compiled.frames.length);
  host.dataset.bombardmentVisibleFrames = String(compiled.frames.filter(snapshot => snapshot.actors.some(actor =>
    (actor.renderPose || actor).actorType && !(actor.renderPose || actor).hidden)).length);
  const preview = bindScenePreview({root: host.querySelector('[data-scene-preview]')});
  const status = host.querySelector('[data-bombardment-frame]');
  const paint = async () => {
    const snapshot = compiled.frames[frame % compiled.frames.length];
    const images = (snapshot?.actors || []).flatMap(actor => {
      const pose = actor.renderPose || actor;
      return pose.hidden || !pose.actorType ? [] : [{x: pose.x, y: pose.y,
        record: {actor_type: pose.actorType, render_slot_marker: pose.renderMode === 'direct-actor-frame' ? 1 : 0,
          direction: pose.direction, palette: pose.palette}}];
    });
    status.textContent = `${phase === 'before' ? '胜利前' : '关闭后'} · 帧 ${frame} · 爆炸 ${images.length}`;
    host.dataset.bombardmentFrame = String(frame);
    host.dataset.bombardmentExplosions = String(images.length);
    await preview.draw({surface: background, scene: state.scene, cameraX, cameraY, actors: images});
  };
  for (const button of host.querySelectorAll('[data-bombardment-phase]')) button.addEventListener('click', () => {
    phase = button.dataset.bombardmentPhase; core.storyVmCompilationCache.clear(); compiled = build(phase); frame = 0; void paint();
  });
  host.querySelector('[data-bombardment-pause]').addEventListener('click', event => {
    paused = !paused; event.target.textContent = paused ? '播放' : '暂停';
  });
  const tick = now => {
    if (!current()) {preview.destroy(); return;}
    if (!paused && now - previous >= 1000 / 60) {
      frame = (frame + Math.max(1, Math.round((now - (previous || now)) * 60 / 1000))) % compiled.frames.length;
      previous = now; void paint();
    } else if (paused) previous = now;
    requestAnimationFrame(tick);
  };
  await paint(); requestAnimationFrame(tick);
}

// @editor-module 场景战斗入口只读投影。

function simulationLink(entry, candidate = entry) {
  const href = battleSimulatorHref(entry, candidate);
  return href ? `<a class="editor-inline-link" data-battle-simulator-link href="${esc(href)}">战斗模拟器 ↗</a>` : '';
}

const hex2 = value => hex$6(Number(value), 2).slice(2);

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

function investigationBattleEntry(record, battle, sceneId = state.sceneEntry?.id) {
  if (!battle) return null;
  const scene = state.project.scenes.editable_scenes.find(row => Number(row.id) === Number(sceneId));
  return {
    kind: "investigation", trigger: "调查图块",
    source: `scene:${hex2(sceneId)}:investigation-tile:${Number(record.id).toString(16).toUpperCase().padStart(4, "0")}`,
    sourceHref: `?view=scenes&scene=${encodeURIComponent(scene.slug)}&sceneMode=logic&sceneObject=investigation-tile:${record.id}`,
    formationId: battle.available ? battle.encounterId : null,
    flag: battle.available ? battle.pendingEventFlag : null,
    storyState: 0,
    summary: battle.available ? battle.summary : null,
  };
}

function coordinateBattleEntry(record, sceneId = state.sceneEntry?.id) {
  const current = state.sceneWorldEvents?.records?.find(row => Number(row.id) === Number(record?.id));
  if (!current || Number(current.scene_id) !== Number(sceneId)) return null;
  return {
    kind: "coordinate", trigger: `坐标 ${Number(current.trigger_x)}, ${Number(current.trigger_y)}`,
    recordId: Number(current.id),
    source: `story.world-event:${hex2(current.id)}`,
    sourceHref: worldEventSceneHref(current, state.project.scenes.editable_scenes),
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
    kind: "zone", trigger: `遇敌区 ${hex$6(zone.zone_id, 2)} · 按权重抽取候选槽`,
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
    return `<li>${esc(monster?.name || `怪物 ${hex$6(slot.monsterId, 2)}`)} ×${slot.count}</li>`;
  }).join('') || '<li>无有效怪物</li>'}</ul>`;
}

function battleEntryFacts(entry) {
  const flow = entry.storyState == null ? null : battleFlowForStoryState(entry.storyState);
  const candidates = entry.candidates?.map(row => {
    const monster = state.project.game_data.monsters.records.find(item => Number(item.id) === row.monsterId);
    return `<section>${row.kind === 'formation' ? monsterList(Number.parseInt(row.reference.split(':').at(-1), 16))
      : `<p>${esc(monster?.name || hex$6(row.monsterId, 2))}</p>`}${simulationLink(entry, row)}</section>`;
  }).join('');
  const editor = ['coordinate', 'script', 'investigation'].includes(entry.kind)
    ? `<div data-scene-battle-formation="${esc(entry.kind)}"
      data-battle-script-kind="${esc(entry.scriptKind || '')}"
      data-battle-script-id="${esc(entry.scriptId ?? '')}"
      data-battle-cursor="${esc(entry.cursor ?? '')}"
      data-battle-record-id="${esc(entry.recordId ?? '')}"></div>` : '';
  return `${editor || candidates || monsterList(entry.formationId)}
    <p>${sourceLink(entry)} · ${esc(entry.trigger)}</p>
    <p>${simulationLink(entry)}${flow ? ` · 战后${flow.exitMode === 3 ? '继续剧情' : '返回场景'}${flow.clearStoryStateOnExit ? ' · 清空剧情状态' : ''}` : ''}</p>
    ${worldEventVictoryMarkup({event_flag: entry.flag})}
    ${Number.isInteger(entry.formationId) ? `<button type="button" class="resource-inline-link"
      data-resource-target="encounter-formation:${hex2(entry.formationId)}">编辑编队 ↗</button>` : ''}`;
}

function renderSceneBattleEntry(entry) {
  if (!entry) return '';
  return `<section data-scene-interaction-configuration="battle/${esc(entry.source)}" data-scene-battle-entry="${esc(entry.source)}">
    ${battleEntryFacts(entry)}</section>`;
}

function sceneObjectBattleEntries(object) {
  if (object.kind === 'actor') return actorBattleEntries(object.record);
  const entry = object.kind === 'event' ? coordinateBattleEntry(object.record, object.sceneId)
    : object.kind === 'investigation-tile'
      ? investigationBattleEntry(object.record, investigationBattleFormation(object.record), object.sceneId) : null;
  return entry ? [entry] : [];
}

async function ownerBinding(host) {
  const kind = host.dataset.sceneBattleFormation;
  if (kind === 'investigation') return {
    object: await db.getFieldObject('battle-test-point', 'battle-test-point.entry'),
    entityHandle: 'battle-test:entry', fieldName: 'encounter_id',
    flagField: 'state_flag'};
  if (kind === "coordinate") {
    const id = Number(host.dataset.battleRecordId);
    const handle = `story.world-event:${id.toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject("world-event", "world-event.trigger-tables"),
      entityHandle: handle, fieldName: "encounter_formation_id"};
  }
  if (kind === "script") {
    const resourceId = `story-${host.dataset.battleScriptKind}-script`;
    const handle = `${resourceId}:script:${Number(host.dataset.battleScriptId).toString(16).toUpperCase().padStart(2, "0")}`;
    return {object: await db.getFieldObject(resourceId, handle),
      resourceId, entityHandle: handle, fieldName: "bytecode", byteIndex: Number(host.dataset.battleCursor) + 1};
  }
  return null;
}

async function mountSceneBattleFormationEditors(root, refresh) {
  const hosts = [...(root?.querySelectorAll?.("[data-scene-battle-formation]") || [])];
  if (!hosts.length) return;
  for (const host of hosts) {
    if (!host.isConnected || host.dataset.battleEditorBound) continue;
    host.dataset.battleEditorBound = "1";
    const kind = host.dataset.sceneBattleFormation;
    try {
      const binding = await ownerBinding(host);
      if (!host.isConnected || !binding) continue;
      host.innerHTML = '<div data-battle-field-choice></div>';
      if (binding.resourceId || binding.flagField) host.insertAdjacentHTML("beforeend", `
        <label>完成事件号（战斗类型）<span data-battle-event-flag></span></label>
        ${binding.resourceId ? '<label>剧情状态<span data-battle-story-state></span></label>' : ''}`);
      let refreshPending = null;
      host.addEventListener("field-object-saved", () => {
        if (!host.isConnected || refreshPending) return;
        refreshPending = db.getResourceDocument(binding.resourceId || (kind === 'investigation' ? 'battle-test-point' : 'world-event'), null).then(document => {
          if (binding.resourceId) state.sceneStoryDocuments[host.dataset.battleScriptKind] = document;
          else if (kind === 'investigation') state.project.game_data.battle_test = document;
          else state.sceneWorldEvents = document;
          if (host.isConnected) refresh();
        }).catch(error => {
          editorLog.error("场景", `操作失败：${error?.message || error}`, error);
          const status = host.querySelector("[data-field-object-error]");
          if (status) {
            status.textContent = `刷新失败：${error?.message || error}`;
            status.hidden = false;
          }
        }).finally(() => {refreshPending = null;});
      });
      await mountSceneActorInteractionPicker(host.querySelector("[data-battle-field-choice]"),
        binding.object, {entityHandle: binding.entityHandle, battle: {fieldName: binding.fieldName, byteIndex: binding.byteIndex}});
      if (binding.flagField) mountFieldObjectField(host.querySelector('[data-battle-event-flag]'), binding.object,
        {entityHandle: binding.entityHandle, fieldName: binding.flagField, label: '完成事件号（战斗类型）', resettable: true});
      if (binding.resourceId) {
        mountFieldObjectField(host.querySelector("[data-battle-event-flag]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 1, label: "完成事件号（战斗类型）"});
        mountFieldObjectField(host.querySelector("[data-battle-story-state]"), binding.object,
          {...binding, byteIndex: binding.byteIndex + 2, label: "剧情状态"});
      }
      const link = host.closest('[data-scene-battle-entry]')?.querySelector('[data-resource-target^="encounter-formation:"]');
      if (link) {
        link.setAttribute('aria-label', `跳转到 ${link.textContent}`);
        link.textContent = '↗';
        host.append(link);
      }
    } catch (error) {
      editorLog.error("场景", `操作失败：${error?.message || error}`, error);
      if (host.isConnected) host.innerHTML = `<p role="alert">${esc(error?.message || error)}</p>`;
    }
  }
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
  const battles = sceneObjectBattleEntries(object);
  host.insertAdjacentHTML('beforeend', battles.map(renderSceneBattleEntry).join(''));
  if (context.addInteractionMarkup) {
    host.insertAdjacentHTML('beforeend', context.addInteractionMarkup());
    context.bindAddInteractions?.(host);
  }
  await mountSceneBattleFormationEditors(host, context.onBattleChange);
  if (!current()) return;
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
        && !event.target.closest('[data-scene-battle-formation]')
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
      encodeURIComponent(`audio-command:${hex$6(item.id, 2).slice(2)}`)}" title="audio-command:${hex$6(item.id, 2).slice(2)}">${esc(audioCommandLabel(item.id))} ↗</a>
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

// @editor-module 场景工作台布局与侧栏

const SCENE_ROOT_SELECTION = 'scene-root';

function sceneRootSelected() {
  return state.sceneEditMode === 'logic' && state.sceneLogicSelection === SCENE_ROOT_SELECTION;
}

function renderSceneRootDetails() {
  const entry = state.sceneEntry;
  const scene = state.scene;
  const variants = sceneVariantMarkup(entry.id, scenePickerVariants(state.sceneBgmDocument), state.project.scenes.editable_scenes);
  const tide = worldTidePreviewMarkup(entry.id, state.sceneTideDocument, state.sceneBgmDocument);
  const hiddenTeleport = hiddenTeleportSceneMarkup(entry.id, {}, state.project);
  const condition = sceneConditionMarkup(null, null);
  return `<section data-scene-root-details${sceneRootSelected() ? '' : ' hidden'}>
    <div class="page-global-info scene-identity">
      <b>${esc(entry.id_hex)} · ${esc(entry.name)}</b>
      <span>${scene.width}×${scene.height} CELLS · ${scene.width * 16}×${scene.height * 16} PX</span>
    </div>
    <dl class="screen-workbench-facts scene-root-facts">
      <div><dt>地图</dt><dd>${handleMarkup(sceneResourceUid(entry), {})}</dd></div>
    </dl>
    ${state.sceneEditMode === 'logic' ? renderSceneLayers() : ''}
    <dl class="screen-workbench-facts scene-root-facts">
      ${variants ? `<div><dt>版本</dt><dd>${variants}</dd></div>` : ''}
      <div><dt>元图块集</dt><dd>${state.sceneMetatileSets.map(record => handleMarkup(record.handle, {})).join(' · ') || '—'}</dd></div>
      ${tide ? `<div><dt>潮汐</dt><dd>${tide}</dd></div>` : ''}
    </dl>
    <section class="scene-root-effects" id="field-step-effects"><h3>场景移动效果</h3>${renderModuleComponent(
      'field-exploration-runtime', 'movement-effects')}</section>
    <dl class="screen-workbench-facts scene-root-facts">
      <div><dt>音乐</dt><dd>${sceneBgmItems(entry.id, state.sceneBgmDocument).map(item =>
        `<p><a class="editor-inline-link" href="?view=audio&amp;record=${
          encodeURIComponent(`audio-command:${hex$6(item.id, 2).slice(2)}`)}">${esc(item.label)} ↗</a></p>`).join('')}</dd></div>
      <div><dt>控制对象</dt><dd>${controlledObjectMarkup(entry.id, {}, state.project)}</dd></div>
      ${hiddenTeleport ? `<div><dt>隐藏传送</dt><dd>${hiddenTeleport}</dd></div>` : ''}
      ${condition ? `<div><dt>条件</dt><dd>${condition}</dd></div>` : ''}
      <div><dt>地图编码预算</dt><dd><b id="scene-budget">${scene.preview_only ? '世界地图专用' : `${scene.codec.used_tokens} / ${scene.codec.capacity_tokens} 个编码单元`}</b></dd></div>
    </dl>
  </section>`;
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
    <details class="scene-elevator-controller" data-collapse-key="scene-elevator-controller"><summary>控制器</summary>
      ${sceneControllerMarkup({...selected, sceneId: state.sceneEntry.id}, state.project, state.sceneLogic)}
      ${controlledObjectMarkup(state.sceneEntry.id, {object: selected.key}, state.project)}
      ${hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
      ${sceneConditionMarkup(selected)}
      <div data-scene-field-object="${esc(selected.key)}"></div>
      <div data-scene-object-semantics="${esc(selected.key)}"></div>
      <div data-scene-interaction-configurations="${esc(selected.key)}"></div>
      ${renderSceneInteractionState(record)}${renderSceneInteractionLinks(record, selected.kind)}
    </details>
    <details class="scene-elevator-tile" data-collapse-key="scene-elevator-tile"><summary>触发格图块</summary>
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
  const bombardment = selectedSceneLogicObject()?.bombardment;
  if (bombardment) return renderBombardmentInspector(bombardment);
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
    const point = state.sceneTileSelection, cell = point && sceneMapCell(state.scene, ...point);
    return (cell ? `<div class="scene-object-editor" data-scene-empty-cell="${point.join(',')}">
      <p>坐标 ${point.join(', ')} · 图块 ${hex$6(cell.metatileId, 2)}</p>
      <div class="scene-metatile-preview" data-scene-metatile="${point.join(',')}"></div>
      ${!state.scene.preview_only ? `<div data-scene-tile-field-object="${point.join(',')}"></div>` : ''}
      <div data-scene-interaction-configurations></div></div>` : '')
      + controlledObjectMarkup(state.sceneEntry.id, {}, state.project)
      + hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)
      + sceneConditionMarkup(null);
  }
  const directSource = selected.record.source
    || selected.record.attribute_source
    || selected.record.coordinate_source;
  if (selected.facilityPoint) return facilityPointInspector(selected);
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
  const battles = actorBattles.length || selected.kind === 'event'
    || selected.kind === 'investigation-tile' && investigationBattleFormation(selected.record);
  return `<div class="scene-object-editor" tabindex="-1">
    ${flow ? '' : `<div class="scene-object-identity">${handleMarkup(sceneObjectResourceUid(selected), {})} <span>${esc(sceneObjectCoordinateLabel(selected))}</span></div>`}
    <div data-scene-object-semantics="${esc(selected.key)}"></div>
    <div data-scene-interaction-configurations="${esc(selected.key)}"></div>
    ${renderSceneInteractionState(selected.record)}
    ${flow ? '' : renderSceneInteractionLinks(selected.record, selected.kind)}
    ${battles ? '<details data-scene-battle-configuration data-collapse-key="scene-battle-configuration"><summary>对象配置</summary>' : ''}
    ${selected.kind === 'tide' ? `<p>方向 ${['↑', '↓', '←', '→'][selected.record.direction]} · ${eventFlagReferenceMarkup(selected.record.event_flag)}</p>` : ''}
    ${actorAppearance}
    ${flow || selected.kind === 'tide' ? '' : sceneControllerMarkup({...selected, sceneId: state.sceneEntry.id}, state.project, state.sceneLogic)}
    ${flow || selected.kind === 'tide' ? '' : controlledObjectMarkup(state.sceneEntry.id, {object: selected.key}, state.project)}
    ${flow ? '' : hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
    ${sceneConditionMarkup(selected)}
    ${selected.mapPoint ? `<div class="scene-metatile-preview" data-scene-metatile="${selected.record.x},${selected.record.y}"></div>
      <div data-scene-tile-field-object="${selected.record.x},${selected.record.y}"></div>`
      : `<div data-scene-field-object="${esc(selected.key)}"></div>`}
    ${selected.kind === 'treasure' && !state.scene?.preview_only
      && Number(selected.record.x) >= 0 && Number(selected.record.x) < Number(state.scene?.width)
      && Number(selected.record.y) >= 0 && Number(selected.record.y) < Number(state.scene?.height)
      ? `<div class="scene-treasure-appearance"><span title="可作为宝箱外观修改">背景图块</span>
        <div data-scene-tile-field-object="${Number(selected.record.x)},${Number(selected.record.y)}"></div></div>` : ''}
    ${selected.kind === "actor" ? sceneActorInterfaceLink(selected.record) : ""}
    ${shopConfiguration}
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
    handle: `story.world-event:${hex$6(Number(selected.record.id), 2).slice(2)}`};
  if (selected.kind === "actor") return {resourceId: SCENE_ACTORS_RESOURCE_ID,
    handle: String(selected.record.uid)};
  if (selected.kind === "vehicle") return {resourceId: "vehicle-preset",
    handle: `vehicle-preset:placement:${hex$6(Number(selected.record.vehicle_slot), 2).slice(2)}`};
  const segment = sceneObjectSegments[selected.kind];
  if (!segment) return null;
  const resourceId = `scene:${hex$6(Number(state.sceneEntry.id), 2).slice(2)}`;
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
  if (selected.mapPoint) {
    const resourceId = sceneResourceUid(state.sceneEntry);
    const object = await sceneMapPointFieldObject(db, resourceId, selected.mapPoint.handle);
    if (!object.isCurrent() || state.sceneLogicSelection !== selected.key) return;
    const root = document.querySelector('[data-scene-object-semantics]');
    if (!root?.isConnected) return;
    root.addEventListener('field-object-saved', async () => {
      state.sceneMapPointDocument = await db.getResourceDocument(resourceId);
      state.scene.map = structuredClone(state.sceneMapPointDocument.scene.map);
      state.sceneOriginalMap = structuredClone(state.sceneMapPointDocument.scene.map);
      refresh();
    });
    {
      const behavior = document.createElement('div');
      root.prepend(behavior);
      mountFieldObjectRecordChoice(behavior, object, {entityHandle: selected.mapPoint.handle,
        fieldNames: ['behavior_code'], label: '调查行为',
        choices: () => state.project.scenes.logic.investigation_tile_behavior_catalog.map(row =>
          ({value: row.behavior_code, label: row.label})),
        selected: values => values.behavior_code, valuesFor: value => ({behavior_code: Number(value)})});
    }
    if (selected.mapPoint.behavior_code === undefined) {
      const {x, y} = selected.mapPoint;
      const field = await db.getField(resourceId, `${resourceId}:map:${hex$6(y, 2).slice(2)}`, 'cells');
      if (!root.isConnected || !object.isCurrent() || state.sceneLogicSelection !== selected.key) return;
      const behavior = document.createElement('div');
      root.prepend(behavior);
      mountFieldObjectRecordChoice(behavior, {id: field.entityHandle, fields: [field], database: db}, {
        entityHandle: field.entityHandle, fieldNames: ['cells'], label: '调查图块',
        choices: () => sceneMapPointMetatiles(state.scene, state.sceneElevatorMetatiles).map(id => {
          const attributes = sceneMetatileAttributeRecords(state.scene, state.sceneElevatorMetatiles)
            .flatMap(record => record.metatile_attributes || record.metatile_attribute_page || []);
          const semantic = state.project.scenes.logic.investigation_tile_behavior_catalog
            .find(record => Number(record.behavior_code) === (attributes[id] & 0x7c));
          return {value: id, label: `${semantic.label} · 元图块 ${hex$6(id, 2)}`};
        }), selected: values => values.cells[x], valuesFor: value => {
          const cells = [...field.value]; cells[x] = Number(value); return {cells};
        }});
    }
    if (root.isConnected && state.sceneLogicSelection === selected.key)
      await sceneObjectSemanticChoices(selected, object, selected.mapPoint.handle);
    return;
  }
  if (selected.facilityPoint) {
    const facilityHost = document.querySelector('[data-facility-point-editor]');
    if (facilityHost) await mountFacilityPointInspector(facilityHost, selected, refresh, actorServiceCatalog());
    return;
  }
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
      onBattleChange: refresh,
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

function renderSceneLayers() {
  const variants = state.sceneLogic.layers.actors.dynamic_variants.length;
  return `<div class="scene-layer-bar">${[
    ['actors', '场景角色'],
    ['treasures', '宝箱与调查物'],
    ['investigations', '调查交互'],
    ['transitions', state.scene.kind === 'world-map' ? '地点入口' : '入口与传送'],
    ['events', '事件与地图改写'],
    ['vehicles', '战车初始位置'],
  ].map(([layer, label]) => `<label class="logic-layer ${layer}"><input type="checkbox"
    data-scene-layer="${layer}"${state.sceneLayers[layer] ? ' checked' : ''}> ${label}</label>`).join('')}
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
    ["events", "轰炸区域", "bombardment"],
    ["events", "潮汐触发", "tide"],
    ["events", "事件地图改写", "map-rewrite"],
    ["events", "进场状态", "scene-state"],
    ["vehicles", "战车初始位置", "vehicle"],
  ];
}

function sceneGroupObjects(layer, kind, objects = sceneLogicObjects()) {
  return objects.filter(item => item.layer === layer && (
    kind === 'boundary' ? item.kind.startsWith('boundary') : item.kind === kind
  ));
}

function sceneLinkQualifiers(item) {
  const sequence = state.project.story?.browser_vm?.sequences?.find(row => row.id === item.id);
  const trigger = sequence?.interaction_trigger;
  const entry = sequence?.preview_entry?.scene_entry_bootstrap;
  const byte = value => hex$6(value, 2).replace('0x', '$');
  const kind = trigger ? '交互' : sequence?.kind === 'control-locked-story-sequence' ? '剧情'
    : sequence?.kind === 'controllable-scene-event-variant' ? '事件后' : sequence ? '进场' : '';
  return [sequence?.trigger_label || '', kind,
    Number.isInteger(trigger?.actor_record_id) ? `角色 ${byte(trigger.actor_record_id)}` : '',
    Number.isInteger(sequence?.entry_variant_id) ? `角色表 ${byte(sequence.entry_variant_id)}` : '',
    entry ? `入口 ${byte(entry.scene_id)}·${byte(entry.id)}` : '',
    item.condition || ''];
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
  const battles = [
    ...actorBattles.map(item => ({...item, label: `${sceneObjectTreeLabel(item)} · 战斗`})),
    ...investigationBattles.map(item => ({...item, label: sceneObjectTreeLabel(item)})),
    ...coordinateBattles.map(item => ({...item, label: sceneObjectTreeLabel(item)})),
  ];
  const battleLabels = sceneObjectTreeLabels(battles, {label: item => item.label});
  return `<div class="scene-object-list" id="scene-object-list">
    <button type="button" class="scene-object-row scene-link-row ${sceneRootSelected() ? 'active' : ''}"
      data-scene-object="${SCENE_ROOT_SELECTION}" aria-pressed="${sceneRootSelected()}">
      <i class="logic-dot"></i><span><b>${esc(storyComponentLabel(state.sceneEntry.name))}</b></span></button>
    ${groups.map(([layer, title, kind]) => {
    const records = sceneGroupObjects(layer, kind, objects);
    const labels = sceneObjectTreeLabels(records);
    return `<details data-scene-object-group="${layer}:${kind}" ${collapseAttributes(`scene-objects:${layer}:${kind}`, true)}><summary>${esc(title)}${sceneObjectCapacityMarkup(kind, objects)}</summary>${kind === 'scene-state' && Number(state.sceneEntry.id) > 0
      ? sceneObjectCollectionActions({collection: 'scene-remap', capacity: currentSceneObjectCapacity(kind, objects)}) : ''}
      ${sceneObjectSlots(kind, records, item => {
        const row = `<div class="scene-object-row ${state.sceneLogicSelection === item.key ? "active" : ""}" role="button" tabindex="0" data-scene-object="${esc(item.key)}">
          <i class="logic-dot ${esc(item.kind)}"></i><span><b>${esc(labels.get(item))}</b>${item.mapPoint || /:[0-9A-F]{32}$/u.test(sceneObjectResourceUid(item)) ? ` · ${handleMarkup(sceneObjectResourceUid(item))}` : ''}</span>
          ${item.rewrite?.type === 'scene-remap' ? sceneObjectCollectionActions({collection: 'scene-remap', handle: item.rewrite.handle}) : ''}
        </div>`;
        return row;
      })}
    </details>`;
  }).join("")}${links.map(([title, items]) => {
    const labels = sceneObjectTreeLabels(items, {label: item => {
      const sequence = state.project.story?.browser_vm?.sequences?.find(row => row.id === item.id);
      return item.id != null && /story:/u.test(item.key) && !sequence?.trigger_label
        ? storySequenceComponentLabel(item.id, item.label) : storyComponentLabel(item.label)
          .replace(/音频命令\s+0x[0-9A-F]+/gu, '场景音乐');
    }, qualifiers: sceneLinkQualifiers});
    return `<details ${collapseAttributes(`scene-links:${title}`, true)}><summary>${title}</summary>${
    items.map(item => `<button type="button" class="scene-object-row scene-link-row ${
      state.sceneLogicSelection === item.key ? "active" : ""}" data-scene-object="${esc(item.key)}">
      <i class="logic-dot"></i><span><b>${esc(labels.get(item))}</b></span></button>`).join("")}</details>`;
  }).join("")}
    <details ${collapseAttributes('scene-battle-entries', true)}><summary>战斗入口</summary>
      ${battles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot ${esc(item.kind)}"></i><span><b>${esc(battleLabels.get(item))}</b></span></button>`).join("")}
      ${zoneBattles.map(entry => `<a class="scene-object-row scene-link-row" href="${esc(entry.sourceHref)}"><i class="logic-dot"></i><span><b>${zoneBattles.length > 1 ? `区域 $${esc(entry.source.split(':').at(-1))} · ` : ''}随机遇敌</b></span></a>`).join("")}
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
  const object = selectedSceneLogicObject();
  const primary = object && (object.kind === 'event' || object.kind.startsWith('investigation')
    || object.kind === 'actor' && actorBattleEntries(object.record).length);
  if (!state.scene?.preview_only && !primary) return '';
  const selected = primary ? sceneObjectCoordinate(object) : state.sceneTileSelection;
  if (!selected || !sceneMapCell(state.scene, ...selected)) return '';
  const cells = object?.kind === 'transition' ? conditionalEntranceCells(
    conditionalEntranceRecord(object.record, {sceneId: state.sceneEntry.id,
      sceneLogic: state.sceneLogic, tileActions: state.sceneTileActions,
      logicIndex: state.project.scenes.logic, worldTide: state.sceneTideDocument,
      worldRaw: state.sceneWorldRaw}),
    state.sceneEntrancePreview?.key === object.key ? state.sceneEntrancePreview : null) : [];
  const preview = cells.find(cell => cell.x === selected[0] && cell.y === selected[1]);
  return `<div class="scene-tile-editor">
    ${preview ? `<p title="以下字段编辑原始地图格">条件预览地形 ${hex$6(preview.metatile_id, 2)}</p>` : ''}
    ${controlledObjectMarkup(state.sceneEntry.id, {point: selected}, state.project)}
    <div class="scene-metatile-preview" data-scene-metatile="${selected.join(",")}"></div>
    <div data-scene-tile-field-object="${selected.join(",")}"></div></div>`;
}

function renderSceneObjectInspector() {
  const object = selectedSceneLogicObject();
  const terrain = object?.rewrite || object?.bombardment ? '' : renderWorldSceneTileInspector();
  const primary = object && (object.kind === 'event' || object.kind.startsWith('investigation')
    || object.kind === 'actor' && actorBattleEntries(object.record).length);
  const matches = state.sceneTileSelection ? sceneObjectsAtCell(state.scene, sceneLogicObjects(), ...state.sceneTileSelection) : [];
  return `${sceneCellInteractionMarkup(sceneLogicObjects(), sceneObjectTreeLabel)}${renderSceneLogicInspector()}${terrain && primary
    ? `<details data-scene-secondary-terrain><summary>图块与地形</summary>${terrain}</details>` : terrain}${sceneCellObjectsMarkup(matches, sceneObjectTreeLabel)}`;
}

async function mountSceneTileFieldReset(refresh, {beforeReset = null, afterReset = null} = {}) {
  const host = document.querySelector("[data-scene-tile-field-object]");
  if (!host) return;
  const [runtimeX, runtimeY] = host.dataset.sceneTileFieldObject.split(",").map(Number);
  const cell = sceneMapCell(state.scene, runtimeX, runtimeY);
  if (cell?.sourceY == null) {
    host.textContent = `加载时填充图块 ${hex$6(cell?.metatileId, 2)}`;
    return;
  }
  const x = cell.sourceX, y = cell.sourceY;
  const resourceId = `scene:${hex$6(Number(state.sceneEntry.id), 2).slice(2)}`;
  const handle = `${resourceId}:map:${hex$6(y, 2).slice(2)}`;
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
      moduleId: 'scene-actor', label: '实例', compact: true, groupColumn: true,
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
        <div class="selected-tile"><b data-selected-metatile-id>${hex$6(state.selectedMetatile, 2)}</b><em>当前画笔</em>
          <span data-selected-metatile-def>${(state.scene.metatile_definitions[state.selectedMetatile] || []).map(value => hex$6(value, 2)).join(' ')}</span></div>
      </section>` : ''}
      <div id="scene-encounter-panel">${encounterMode ? renderEncounterZonePanel() : ""}</div>
      <div id="scene-object-inspector"${sceneRootSelected() ? ' hidden' : ''}>${tileMode ? renderSceneTileInspector()
        : encounterMode ? "" : renderSceneObjectInspector()}</div>
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
      Number(row.entry_id) === Number(entry.id) || Number(row.entry_id) === 0), autonomousScripts, state.project.story, db)};
  state.sceneBombardmentCatalog = sceneBombardments(actorsDocument.records.filter(row =>
    Number(row.entry_id) === 0), state.sceneStoryDocuments.autonomous, state.project.story);
  state.sceneWorldEvents = worldEvents;
  state.sceneEventMaps = await loadEventMapScenes(db, state.project.scenes.editable_scenes);
  state.sceneEncounterFormations = encounterFormations;
  state.sceneWorldRaw = document.world_raw;
  state.sceneTideDocument = tide;
  state.sceneMetatileSets = (metatileSets?.records || []).filter(record =>
    record.scene_references?.includes(resourceId));
  state.scene = scene;
  state.sceneElevatorMetatiles = elevatorMetatiles;
  state.sceneMapPointDocument = document;
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
  renderSceneObjectInspector: renderSceneObjectInspector,
  renderSceneObjectList: renderSceneObjectList,
  renderSceneTileInspector: renderSceneTileInspector,
  renderScenes: renderScenes,
  sceneRootSelected: sceneRootSelected
});

export { bindSceneBgm, bindSceneCellActions, bindSceneRemapCollection, mountBombardment, mountSceneLogicFieldObject, mountSceneMapRewrite, mountSceneTileFieldReset, mountSceneTileMapReset, mountWorldTideScene, renderSceneObjectInspector, renderSceneObjectList, renderSceneTileInspector, sceneBoundaryFocusCoordinate, sceneBoundarySides, sceneEventFlagMap, sceneLogicFieldSpecs, sceneLogicObjects, sceneMapRewriteControlsMarkup, sceneMapRewritePreview, sceneObjectCoordinate, sceneObjectCoordinateLabel, sceneObjectsAtCell, sceneRootSelected, selectedSceneLogicObject, workbench };
