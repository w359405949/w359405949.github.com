// @editor-module 场景保留对象字段，流程配置只显示摘要与编辑入口。
import {esc} from '../core/dom.js';
import {sceneOwnedInteractionConfigurations, sceneConfigurationStays} from '../core/scene-interaction-configurations.js';
import {sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins} from '../core/scene-tile-action.js';
import {TILE_ACTION_OWNER} from '../core/scene-tile-action-owner.js';
import {WORLD_TIDE_OWNER} from '../core/world-tide-owner.js';
import {consolidateSceneDestinationLinks, renderSceneDestinationLinks} from './scene-interaction-links.js';
import {currentTextReference} from '../core/resource-index.js';
import {prepareStorySceneActions} from '../core/story-scene-actions.js';
import {controllerAt} from '../core/controller-switch-links.js';
import {controllerSceneRemaps, SCENE_REMAP_OWNER} from '../core/scene-remap-owner.js';
import {scenePositionPickerMarkup, hydrateScenePositionPicker} from '../modules/scene/components.js';

export async function mountSceneInteractionConfigurations(host, object, context, database) {
  if (!host) return;
  const generation = Symbol();
  host.__sceneConfigurationGeneration = generation;
  const current = () => host.isConnected && host.__sceneConfigurationGeneration === generation;
  if (host.__sceneConfigurationSaved) host.__sceneConfigurationSavedTarget
    .removeEventListener('field-object-saved', host.__sceneConfigurationSaved);
  delete host.dataset.sceneInteractionConfigurationsReady;
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
  for (const gap of [...gaps, ...unresolved]) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(gap)}</p>`);
  for (const request of requests) {
    if (!current() || request.existingInspector) continue;
    const group = `${request.resourceId}/${request.href}`;
    if (!sceneConfigurationStays(request, object) && summaries.has(group)) continue;
    summaries.add(group);
    const section = document.createElement('section');
    section.dataset.sceneInteractionConfiguration = `${request.resourceId}/${request.handle}`;
    host.append(section);
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
          && related.some(row => (row.handle == null || field.entityHandle === row.handle)
            && (!row.fields || row.fields.includes(field.fieldName)))));
        const summary = request.resourceId === 'text-record' ? currentTextReference(request.handle).label
          : request.resourceId.startsWith('story-') ? context.story?.[request.resourceId.includes('autonomous')
            ? 'autonomous' : 'interaction']?.entries?.find(entry =>
              Number(entry.id) === parseInt(request.handle.split(':').at(-1), 16))?.label
          : fields.map(field => `${objects.flatMap(candidate => candidate.definition.editor?.columns || [])
            .find(column => column.name === field.fieldName)?.label || field.fieldName} ${Array.isArray(field.value)
            ? `${field.value.length} 项` : object.kind === 'elevator'
              && request.resourceId.startsWith('application-command:') && Number.isInteger(field.value)
              ? `$${field.value.toString(16).toUpperCase().padStart(4, '0')}` : field.value}`).join(' · ');
        const caption =
          [[...new Set(related.map(row => row.condition).filter(Boolean))].join(' / '), related.length > 1 && request.resourceId === 'battle-test-point'
            ? request.label.replace(/ · 槽 \d+$/u, '') : request.label, summary?.replace(/\s+/gu, ' ')]
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
    const summary = document.createElement('div');
    summary.dataset.sceneTileAction = object.key;
    summary.innerHTML = `${action.behavior ? `<p>行为 · ${esc(action.behavior.label)}</p>` : ''}
      ${arrival ? `<p>${action.behavior?.code === 13 ? '踩入' : '同格入口'} → <a class="editor-inline-link" data-scene-action-arrival href="${esc(arrival.href)}">${esc(arrival.scene.name)} (${arrival.x}, ${arrival.y}) ↗</a></p>` : ''}
      <p>持久状态 · ${esc(action.persistence.label)}</p>
      <label><input type="checkbox" data-scene-action-preview${previewActive ? ' checked' : ''}>调查后</label>`;
    host.append(summary);
    summary.querySelector('[data-scene-action-preview]').addEventListener('change', event => {
      context.onActionPreview?.(event.target.checked ? {key: object.key, sceneId: Number(object.sceneId),
        x: Number(object.record.x), y: Number(object.record.y), metatileId: Number(action.replacement_metatile)} : null);
    });
    if (previewActive) context.onActionPreview?.({key: object.key,
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
  host.dataset.sceneInteractionConfigurationsReady = object.key;
}
