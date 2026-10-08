import {enumerateSceneInteractionObjects, sceneInteractionDestinations} from "../core/scene-interaction-destinations.js";
import {storyPlaybackView, storyViewForSequenceId} from "../core/story-view-config.js";
import {uiTemplateBindings} from "../core/ui-template-bindings.js";
import {controllersForTarget, controllersForFlag} from "../core/controller-switch-links.js";
import {conditionalEntrancesForFlag} from "../core/conditional-entrances.js";
import {storiesForEventFlag} from "../core/story-event-links.js";
import {hiddenTeleportDestination, hiddenTeleportFlags} from "../core/teleport-hidden-destination.js";
import {shopConfigurationForActor} from "./shop-npc-reference.js";
import {esc} from "../core/dom.js";
import {editorErrorMarkup} from "./editor-error.js";
import {eventFlagReferenceCatalog} from '../core/event-flag-references.js';
import {treasureFlagReferences} from '../core/treasure-flag-references.js';

// @editor-module 反查只回答当前详情中的字段对象被谁引用。

let currentOwner = null;

export function ownerReferenceListMarkup(label, attributes = "") {
  return `<details data-owner-reference-list ${attributes}><summary>${esc(label)}</summary><div data-owner-reference-content></div></details>`;
}

export function bindOwnerReferenceList(host, load, onLoaded = () => {}) {
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

export function withCurrentOwnerRecord(record, project, render, {elevators = []} = {}) {
  const previous = currentOwner;
  currentOwner = {record, project, elevators};
  try { return render(); }
  finally { currentOwner = previous; }
}

export function currentOwnerReferenceImpact() {
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

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const destinationViews = new Set(['shops', 'interfaceui', 'jukebox', 'vending', 'frograce',
  'teleport', 'computercontroller', 'wanted', 'wanted-ui', 'actors', 'text', 'items',
  'equipment', 'battle-test', 'monster-formations', 'vehicles', 'scenes', 'audio', 'metatiles']);

export function destinationMatchesPage(target, page) {
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
      ...(sequence.interaction_trigger ? [`scene-actor:${hex(sequence.entry_variant_id)}:${hex(sequence.interaction_trigger.actor_record_id)}`] : []),
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
      const handle = `scene:${hex(scene.id)}`;
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

export function supportsSceneDestinationPage(view) {
  return destinationViews.has(view) || storyPlaybackView(view);
}
