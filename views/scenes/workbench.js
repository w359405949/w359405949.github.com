// @editor-module 场景工作台布局与侧栏
import {editorLog} from "../../core/editor-log.js";
import {scenePreviewControls, scenePreviewCanvasMarkup} from '../../modules/scene/preview.js';
import {screenWorkbench, screenWorkbenchCanvasStage} from "../../ui/screen-workbench.js";
import {empty} from "../../main.js";
import {esc, hex} from "../../core/dom.js";
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';
import {
  beginSceneActorDraft,
  sceneActorAliasRecords,
  SCENE_ACTORS_RESOURCE_ID,
} from "../../core/scene-actors.js";
import {db} from "../../core/project-db.js";
import {prepareStorySceneActions} from '../../core/story-scene-actions.js';
import {sceneMapCell} from "../../core/scene-runtime-map.js";
import {createSceneTileHistory} from "../../core/scene-tile-history.js";
import {prepareSaveEditorWorkspace} from '../../core/save-editor-session.js';
import {loadElevatorMetatiles, sceneElevatorPoints} from "../../core/scene-elevators.js";
import {mountElevatorDestinations} from "../../modules/facility/elevator-destinations.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {mountFieldObjectElementReset, mountFieldObjectRecordChoice, mountFieldObjectReset} from "../../ui/field-object-editor.js";
import {prepareModuleComponent, hydrateModuleComponents, renderModuleComponent} from '../../ui/module-components.js';
import '../../modules/scene/step-effects.js';
import {acceptProjectFieldDraft} from "../../core/project-data.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {writeAccessMarker} from "../../ui/write-access-marker.js";
import {handleMarkup} from "../../ui/handle.js";
import {state} from "../../core/state.js";
import {storyComponentLabel, storySequenceComponentLabel} from '../../core/story-component-labels.js';
import {mountSceneActorInteractionPicker} from "../../ui/scene-actor-interaction-picker.js";
import {interactionEditorHref, interactionEditorLink} from '../../ui/interaction-editor-links.js';
import {shopConfigurationForActor} from "../../ui/shop-npc-reference.js";
import {shopConfigurationProducts} from '../shops.js';
import {renderSceneDestinationLinks, consolidateSceneDestinationLinks} from "../../ui/scene-interaction-links.js";
import {sceneControllerMarkup, controlledObjectMarkup} from '../../ui/controller-switch-links.js';
import {hiddenTeleportSceneMarkup} from '../../ui/teleport-hidden-links.js';
import {conditionalEntranceMarkup} from '../../ui/conditional-entrances.js';
import {conditionalEntranceCells, conditionalEntranceRecord, conditionalSceneRecord} from '../../core/conditional-entrances.js';
import {WORLD_TIDE_OWNER} from '../../core/world-tide-owner.js';
import {worldTideSceneMarkup, worldTidePreviewMarkup} from '../../modules/scene/tide-preview.js';
import {saveEventHref} from '../../core/save-page-links.js';
import {renderSceneMapRewriteInspector, sceneMapRewriteControlsMarkup} from '../../modules/scene/map-rewrites.js';
import {mountSceneInteractionConfigurations} from "../../ui/scene-interaction-configurations.js";
import {INTERFACE_PAGE_DEFINITIONS} from "../../core/ui-page-registry.js";
import {
  actorDirectTextRegions,
  actorServiceCatalog,
  actorServiceRuleLabel,
  investigationBattleFormation,
  investigationCommandCatalog,
  investigationCommandEntry,
  investigationConfigurationLabel,
  investigationConfigurations,
  refreshInvestigationDerivedFields,
  renderSceneInteractionLinks,
  renderSceneInteractionState,
  sceneLogicObjects,
  sceneObjectCoordinateLabel,
  sceneObjectLabel,
  sceneObjectTreeLabel,
  sceneObjectResourceUid,
  selectedSceneLogicObject,
} from "../../views/scenes/logic.js";
import {loadEncounterZones, renderEncounterZonePanel, renderEncounterZoneSidebar} from "../../views/scenes/encounter.js";
import {
  refreshSceneDraftDirty,
} from "../../views/scenes/original-reset.js";
import {renderSceneResources, sceneInvestigationLayerCount, sceneResourceUid} from "../../views/scenes/overview.js";
import {sceneEntryStoryItems, renderSceneEntryStoryInspector} from "../../views/scenes/entry-story.js";
import {sceneRelatedStories} from "../../core/scene-related-stories.js";
import {renderSceneRelatedStoryInspector} from "./related-stories.js";
import {sceneBgmItems, renderSceneBgmInspector} from "../../views/scenes/bgm.js";
import {invalidateSceneSurface} from "../../modules/scene/visual-preview.js";
import {buildLogButton} from "../../core/rom-build.js";
import {
  actorAppearanceContextForScene,
  sceneActorVisualDescriptor,
  sceneActorVisualMarkup,
} from "../../ui/actor-appearance.js";
import {sceneVariantMarkup} from "../../modules/scene/components.js";
import {scenePickerVariants} from '../../modules/scene/picker-groups.js';
import '../../modules/story/components.js';
import '../../modules/story/interaction-components.js';
import '../../modules/text/components.js';
import {mountSceneActorAppearance} from '../../modules/scene/actor-appearance-editor.js';
import {
  actorBattleEntries,
  coordinateBattleEntry,
  investigationBattleEntry,
  renderSceneActorBattleEntries,
  renderSceneBattleEntry,
  sceneBattleZone,
  zoneBattleEntry,
} from "./battle-entries.js";

const SCENE_ROOT_SELECTION = 'scene-root';

export function sceneRootSelected() {
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
    <p>地图 ${handleMarkup(sceneResourceUid(entry), {inline: true})}</p>
    ${sceneVariantMarkup(entry.id, scenePickerVariants(state.sceneBgmDocument), state.project.scenes.editable_scenes)}
    <p>元图块集 ${state.sceneMetatileSets.map(record => handleMarkup(record.handle, {inline: true})).join(' · ') || '—'}</p>
    ${worldTidePreviewMarkup(entry.id, state.sceneTideDocument, state.sceneBgmDocument)}
    <div class="page-global-info" id="field-step-effects"><b>场景移动效果</b>${renderModuleComponent(
      'field-exploration-runtime', 'movement-effects')}</div>
    <section><h3>音乐</h3>${sceneBgmItems(entry.id, state.sceneBgmDocument).map(item =>
      `<p><a class="editor-inline-link" href="?view=audio&amp;record=${
        encodeURIComponent(`audio-command:${hex(item.id, 2).slice(2)}`)}">${esc(item.label)} ↗</a></p>`).join('')}</section>
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

const sceneServiceNames = new Map([[0x1d, "装甲片自动售货机"], [0x1e, "药店"], [0x1f, "楼层电梯"]]);

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

export function renderSceneLogicInspector() {
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
  return `<div class="scene-object-editor" tabindex="-1">
    <div class="scene-object-identity">${handleMarkup(sceneObjectResourceUid(selected), {inline: true})} <span>${esc(sceneObjectCoordinateLabel(selected))}</span></div>
    ${selected.kind === 'tide' ? `<p>方向 ${['↑', '↓', '←', '→'][selected.record.direction]} · ${eventFlagReferenceMarkup(selected.record.event_flag)}</p>` : ''}
    ${actorAppearance}
    ${selected.kind === 'tide' ? '' : sceneControllerMarkup({...selected, sceneId: state.sceneEntry.id}, state.project, state.sceneLogic)}
    ${selected.kind === 'tide' ? '' : controlledObjectMarkup(state.sceneEntry.id, {object: selected.key}, state.project)}
    ${hiddenTeleportSceneMarkup(state.sceneEntry.id, {}, state.project)}
    ${sceneConditionMarkup(selected)}
    <div data-scene-field-object="${esc(selected.key)}"></div>
    <div data-scene-object-semantics="${esc(selected.key)}"></div>
    <div data-scene-interaction-configurations="${esc(selected.key)}"></div>
    ${selected.kind === 'treasure' && !state.scene?.preview_only
      && Number(selected.record.x) >= 0 && Number(selected.record.x) < Number(state.scene?.width)
      && Number(selected.record.y) >= 0 && Number(selected.record.y) < Number(state.scene?.height)
      ? `<div class="scene-treasure-appearance"><span>所在格背景图块（可作为宝箱外观修改）</span>
        <div data-scene-tile-field-object="${Number(selected.record.x)},${Number(selected.record.y)}"></div></div>` : ''}
    ${selected.kind === "actor" ? sceneActorInterfaceLink(selected.record) : ""}
    ${shopConfiguration}
    ${renderSceneActorBattleEntries(actorBattles)}
    ${selected.kind === "event" ? renderSceneBattleEntry(coordinateBattleEntry(selected.record)) : ""}
    ${selected.kind === "investigation-tile" ? `${renderInvestigationBattleFormation(selected.record)}` : ""}
    ${selected.kind === 'treasure' && selected.record.investigation_resolution_detail
      ? `<p class="scene-content-note">调查入口：${esc(selected.record.investigation_resolution_detail)}</p>` : ''}
    ${renderSceneInteractionState(selected.record)}
    ${renderSceneInteractionLinks(selected.record, selected.kind)}
    <div data-scene-destination-links>${renderSceneDestinationLinks({...selected,
      sceneId: Number(state.sceneEntry.id)}, sceneDestinationContext())}</div>
    ${physicalRows.length ? physicalLocationMarkup({rows: physicalRows}) : ""}
  </div>`;
}

async function sceneObjectSemanticChoices(selected, object, handle) {
  const root = document.querySelector('[data-scene-object-semantics]');
  if (!root) return;
  const record = selected.record;
  const add = (label, fieldNames, choices, selectedValue, valuesFor, picker = null) => {
    const host = document.createElement('div');
    root.append(host);
    mountFieldObjectRecordChoice(host, object, {entityHandle: handle, fieldNames, label,
      choices, selected: selectedValue, valuesFor, picker});
  };
  if (selected.kind === 'actor') {
    const host = document.createElement('div');
    root.append(host);
    await mountSceneActorInteractionPicker(host, object, {entityHandle: handle,
      productsForRecord: shopConfigurationProducts,
      regions: actorDirectTextRegions(), services: actorServiceCatalog().map(service =>
        ({...service, ruleLabels: service.rules.map(actorServiceRuleLabel)}))});
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
    add('交互类型', ['handler_selector', 'instance_id'],
      () => investigationCommandCatalog().map(command => ({value: command.selector,
        label: `${command.command_id_hex} · ${command.facility_label}`})),
      values => values.handler_selector, value => {
        const variants = investigationConfigurations(investigationCommandEntry(value)?.command_id);
        return {handler_selector: Number(value), ...(variants.length && !variants.some(variant =>
          Number(variant.instance_id) === Number(record.instance_id))
          ? {instance_id: Number(variants[0].instance_id)} : {})};
      });
    const command = investigationCommandEntry(record.handler_selector);
    const variants = investigationConfigurations(command?.command_id);
    if (variants.length) add('配置实例 / 参数', ['instance_id'],
      () => variants.map(variant => ({value: variant.instance_id,
        label: investigationConfigurationLabel(command.command_id, variant)})),
      values => values.instance_id, value => ({instance_id: Number(value)}));
  } else if (selected.kind === 'treasure') {
    const isMoney = Number(record.content_id) >= 0xf0;
    add('内容类型', ['content_id'], () => [
      {value: 'item', label: '物品 / 人物装备 / 战车装备'},
      {value: 'money', label: '金钱奖励'},
    ], values => Number(values.content_id) >= 0xf0 ? 'money' : 'item',
    value => ({content_id: value === 'money' ? 0xf0 : 1}));
    root.insertAdjacentHTML('beforeend', `<p class="scene-content-note">${isMoney ? '金钱档位' : '具体物品或装备'}由上方内容选择器编辑。</p>`);
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
    handle: `story.world-event:${hex(Number(selected.record.id), 2).slice(2)}`};
  if (selected.kind === "actor") return {resourceId: SCENE_ACTORS_RESOURCE_ID,
    handle: String(selected.record.uid)};
  if (selected.kind === "vehicle") return {resourceId: "vehicle-preset",
    handle: `vehicle-preset:placement:${hex(Number(selected.record.vehicle_slot), 2).slice(2)}`};
  const segment = sceneObjectSegments[selected.kind];
  if (!segment) return null;
  const resourceId = `scene:${hex(Number(state.sceneEntry.id), 2).slice(2)}`;
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

export async function mountSceneLogicFieldObject(refresh) {
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
  void mountSceneInteractionConfigurations(document.querySelector('[data-scene-interaction-configurations]'),
    {...selected, sceneId: Number(state.sceneEntry.id)}, {
      scenes: state.project.scenes, logicIndex: state.project.scenes.logic,
      facilities: state.project.facilities, story: state.project.story,
      wanted: state.project.wanted, sceneLogic: state.sceneLogic, worldEvents: state.sceneWorldEvents,
      metatileSets: state.sceneElevatorMetatiles?.sets,
      items: state.project.game_data?.items?.records,
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
      ? ['actor_type', 'text_region', 'interaction_or_record_id', 'autonomous_script_id']
      : selected.kind === 'investigation' ? ['handler_selector',
        ...(investigationConfigurations(investigationCommandEntry(selected.record.handler_selector)?.command_id).length
          ? ['instance_id'] : [])] : [];
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

export function renderSceneObjectList() {
  const transitionTitle = state.scene?.kind === "world-map"
    ? "城镇、洞穴及其他地点入口"
    : "门、楼梯与坐标传送";
  const groups = [
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
    const records = objects.filter(item => item.layer === layer && (
      kind === "boundary" ? item.kind.startsWith("boundary") : item.kind === kind
    ));
    return `<details open><summary>${esc(title)} <b>${records.length}</b></summary>
      ${records.length ? records.map(item => {
        const row = `<div class="scene-object-row ${state.sceneLogicSelection === item.key ? "active" : ""}" role="button" tabindex="0" data-scene-object="${esc(item.key)}">
          <i class="logic-dot ${esc(item.kind)}"></i><span><b>${esc(sceneObjectTreeLabel(item))}</b></span>
        </div>`;
        return row;
      }).join("") : ``}
    </details>`;
  }).join("")}${links.map(([title, items]) => `<details open><summary>${title} <b>${items.length}</b></summary>${
    items.map(item => `<button type="button" class="scene-object-row scene-link-row ${
      state.sceneLogicSelection === item.key ? "active" : ""}" data-scene-object="${esc(item.key)}">
      <i class="logic-dot"></i><span><b>${esc(item.id != null && /story:/u.test(item.key)
        ? storySequenceComponentLabel(item.id, item.label) : storyComponentLabel(item.label)
          .replace(/音频命令\s+0x[0-9A-F]+/gu, '场景音乐'))}</b></span></button>`).join("")}</details>`).join("")}
    <details open><summary>战斗入口 <b>${actorBattles.length + investigationBattles.length + coordinateBattles.length + zoneBattles.length}</b></summary>
      ${actorBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot actor"></i><span><b>${esc(sceneObjectTreeLabel(item))} · 战斗</b></span></button>`).join("")}
      ${investigationBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot investigation-tile"></i><span><b>调查战斗</b></span></button>`).join("")}
      ${coordinateBattles.map(item => `<button type="button" class="scene-object-row scene-link-row" data-scene-object="${esc(item.key)}"><i class="logic-dot event"></i><span><b>坐标触发战斗</b></span></button>`).join("")}
      ${zoneBattles.map(entry => `<a class="scene-object-row scene-link-row" href="${esc(entry.sourceHref)}"><i class="logic-dot"></i><span><b>随机遇敌</b></span></a>`).join("")}
    </details></div>`;
}

function renderMetatileSidebar() {
  const definition = state.scene.metatile_definitions[state.selectedMetatile] || [];
  return `<div class="metatile-sidebar">
    <div class="metatile-sidebar-head"><span>地图图块列表</span><b>${state.scene.metatile_definitions.length}</b></div>
    <div data-scene-brush-selector></div>
    <div class="selected-tile"><b data-selected-metatile-id>${hex(state.selectedMetatile,2)}</b><em>当前画笔</em><span data-selected-metatile-def>${definition.map(value => hex(value,2)).join(" ")}</span></div>
  </div>`;
}

export function renderSceneTileInspector() {
  const selected = state.sceneTileSelection;
  return `<div class="scene-tile-editor">
    ${selected ? `<div class="scene-metatile-preview" data-scene-metatile="${selected[0]},${selected[1]}"></div>
      <div data-scene-tile-field-object="${selected[0]},${selected[1]}"></div>`
      : `<div class="scene-metatile-preview" data-scene-metatile-brush="${state.selectedMetatile}"></div>`}
    ${selected ? controlledObjectMarkup(state.sceneEntry.id, {point: selected}, state.project) : ''}
    ${hiddenTeleportSceneMarkup(state.sceneEntry.id, {point: selected}, state.project)}
    ${sceneConditionMarkup(null)}
  </div>`;
}

export function renderWorldSceneTileInspector() {
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
    ${preview ? `<p>条件预览地形 ${hex(preview.metatile_id, 2)} · 以下编辑原始地图格</p>` : ''}
    ${controlledObjectMarkup(state.sceneEntry.id, {point: selected}, state.project)}
    <div class="scene-metatile-preview" data-scene-metatile="${selected.join(",")}"></div>
    <div data-scene-tile-field-object="${selected.join(",")}"></div></div>`;
}

export async function mountSceneTileFieldReset(refresh, {beforeReset = null, afterReset = null} = {}) {
  const host = document.querySelector("[data-scene-tile-field-object]");
  if (!host) return;
  const [runtimeX, runtimeY] = host.dataset.sceneTileFieldObject.split(",").map(Number);
  const cell = sceneMapCell(state.scene, runtimeX, runtimeY);
  if (cell?.sourceY == null) {
    host.textContent = `加载时填充图块 ${hex(cell?.metatileId, 2)}`;
    return;
  }
  const x = cell.sourceX, y = cell.sourceY;
  const resourceId = `scene:${hex(Number(state.sceneEntry.id), 2).slice(2)}`;
  const handle = `${resourceId}:map:${hex(y, 2).slice(2)}`;
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

export async function mountSceneTileMapReset(refresh, {beforeReset = null, afterReset = null} = {}) {
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

function renderSceneWorkbench() {
  const entry = state.sceneEntry;
  const scene = state.scene;
  const summary = state.sceneLogic.summary;
  const actorCount = sceneLogicObjects().filter(item => item.kind === 'actor').length;
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
  const toolbarMarkup = `<div class="scene-toolbar">
    <button class="button ghost scene-back-button" type="button" id="scene-back">← 返回场景列表</button>
    ${handleMarkup(sceneResourceUid(entry))}
    <div class="scene-mode-switch">${modeButton("logic", "场景对象")}${
      scene.preview_only ? "" : modeButton("tiles", "地图图块")
    }${modeButton("encounters", "遇敌区域")}</div>
    ${tileMode ? `<button class="button ghost" type="button" id="scene-tile-undo"
      aria-label="撤销" title="撤销（Ctrl+Z）"${state.sceneTileHistory?.canUndo ? '' : ' disabled'}>↶</button>
    <button class="button ghost" type="button" id="scene-tile-redo"
      aria-label="重做" title="重做（Ctrl+Y／Ctrl+Shift+Z）"${state.sceneTileHistory?.canRedo ? '' : ' disabled'}>↷</button>
    <span data-scene-tile-map-reset></span>` : ''}
    <label class="check"><input type="checkbox" id="scene-grid" ${state.sceneGrid ? "checked" : ""}> 网格</label>
    ${worldTideSceneMarkup(state.sceneEntry.id, state.sceneTideDocument, state.sceneBgmDocument, state.project.scenes)}
    ${buildLogButton()}
    <span class="scene-save-state ${state.sceneMessage?.startsWith("保存失败：") ? "dirty" : ""}"
      id="scene-save-state" ${state.sceneMessage ? "" : "hidden"}>${esc(state.sceneMessage || "")}</span>
  </div>
  <div class="scene-layer-bar">
    ${tileMode ? `<span class="scene-tile-mode-note">地图图块模式 · 当前画笔 <b data-selected-metatile-id>${hex(state.selectedMetatile,2)}</b></span>`
      : encounterMode ? ""
      : `
      ${[["actors","场景角色",actorCount],["treasures","宝箱与调查物",summary.treasures],["investigations","调查交互",sceneInvestigationLayerCount(summary)],["transitions",scene.kind === "world-map" ? "地点入口" : "入口与传送",summary.point_transitions + summary.boundary_exits + sceneElevatorPoints(scene, state.sceneElevatorMetatiles).length],["events","事件与地图改写",sceneLogicObjects().filter(item => item.layer === 'events').length],["vehicles","战车初始位置",vehiclePlacementCount()]].map(([layer,label,count]) => `<label class="logic-layer ${layer}"><input type="checkbox" data-scene-layer="${layer}" ${state.sceneLayers[layer] ? "checked" : ""}> ${label} <b>${count}</b></label>`).join("")}
      ${state.sceneLogic.layers.actors.dynamic_variants.length ? `<span class="scene-variant-note">含 ${state.sceneLogic.layers.actors.dynamic_variants.length} 组由事件 flag 选择的替换角色表</span>` : ""}`}
  </div>`;
  return screenWorkbench({namespace: 'scene', className: `scene-workbench ${mode}-mode`,
    toolbarMarkup, treeTitle: null, treeClassName: 'scene-tools',
    treeMarkup: tileMode ? renderMetatileSidebar()
      : encounterMode ? renderEncounterZoneSidebar() : renderSceneObjectList(),
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'scene', sizing: 'fill',
      className: 'scene-stage', zoomMarkup: '',
      toolbarMarkup: `${scenePreviewControls("场景缩放")}
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
      <div id="scene-encounter-panel">${encounterMode ? renderEncounterZonePanel() : ""}</div>
      <div id="scene-object-inspector"${sceneRootSelected() ? ' hidden' : ''}>${tileMode ? renderSceneTileInspector()
        : encounterMode ? "" : `${selectedSceneLogicObject()?.rewrite ? '' : renderWorldSceneTileInspector()}${renderSceneLogicInspector()}`}</div>
    `,
  });
}

export async function renderScenes() {
  const entries = state.project.scenes?.editable_scenes || [];
  if (!entries.length) {
    return ``;
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
