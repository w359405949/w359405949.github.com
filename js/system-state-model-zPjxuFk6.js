import { sceneTreasureProbeResolution, sceneInteractionDestinations, controllerAt, tideEntrance, sceneCoordinateEvent, actorInteractionMode, sceneInvestigationResolution, ownerReferenceListMarkup, bindOwnerReferenceList, supportsSceneDestinationPage, withCurrentOwnerRecord, currentOwnerReferenceImpact, sceneUsageAnchor, controllerHref, controllerSceneHref, controllerTargetLabel, controllerFlagId } from './battle-result-state-machine-BbK2hSud.js';
import { storySceneActions, storySceneDialogueReferences, esc, currentTextReference, interfacePreviewState } from './interface-state-preview-Dlotqlmn.js';
import { INTERFACE_PAGE_DEFINITIONS, itemPageRoute } from './editor-renderer-n2nBwXk_.js';
import { TILE_ACTION_OWNER, WORLD_TIDE_OWNER, WORLD_TIDE_HANDLE, controllerSceneRemaps, SCENE_REMAP_OWNER, sceneTreasureContent, TILE_ACTION_HANDLE, advanceNameEntry, initialNameEntry } from './prg-loaders-DnCSmXk9.js';
import { storyPlaybackView } from './baseline-assembly-DW8BWbDB.js';
import { eventFlagReferenceMarkup } from './scene-encounter-probabilities-C0m_IdC-.js';
import { createNesApuSynth, ensureSequenceExecutions } from './battle-result-script-runtime-BSeJpUGH.js';
import { previewSoundEnabled, subscribePreviewSound } from './overview-BWR5QCHz.js';
import { getSaveSlotStatus, previewSaveFileOperation, previewSaveFileFields } from './physical-field-object-windows-DnQmS3eb.js';

// @editor-module 将场景交互去向绑定到承载页共用的配置字段对象。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneOwnedInteractionConfigurations(object, context) {
  const ownContext = {...context, skipConfigurationResolution: true};
  const configuration = sceneInteractionConfigurations(object, ownContext);
  const probe = sceneTreasureProbeResolution(object, context);
  if (!probe?.record) return configuration;
  const treasure = sceneInteractionConfigurations({kind: 'treasure', sceneId: object.sceneId,
    record: probe.record}, ownContext);
  const external = new Set(treasure.requests.map(request => `${request.resourceId}/${request.handle}`));
  external.add(`scene:${hex(object.sceneId)}/scene:${hex(object.sceneId)}:treasure:${hex(probe.record.id)}`);
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
        const resourceId = `scene:${hex(object.sceneId)}`;
        add(target, resourceId, `${resourceId}:transition:${hex(target.tileActionTransition.id)}`,
          '通往场景与落点', ['destination_scene_id', 'destination_x', 'destination_y']);
      }
    }
  }
  if (['transition', 'boundary'].includes(object.kind)) {
    if (tideEntrance(object, context.worldTide)) add({}, WORLD_TIDE_OWNER, WORLD_TIDE_HANDLE,
      '潮汐切换时的地形配置');
    const resourceId = `scene:${hex(object.sceneId)}`;
    add(result.targets[0] || {}, resourceId, `${resourceId}:${object.kind}:${hex(object.record.id)}`,
      '目标场景与落点', ['destination_scene_id', 'destination_x', 'destination_y']).existingInspector = !object.boundInteraction;
    return {requests, gaps, unresolved: result.gaps};
  }
  if (object.kind === 'scene-state') {
    return {requests, gaps, unresolved: result.gaps};
  }
  if (!['actor', 'treasure', 'investigation-special', 'investigation', 'investigation-tile', 'event', 'elevator', 'vehicle', 'bgm', 'entry-story'].includes(object.kind)) return {requests, gaps, unresolved: result.gaps};
  if (object.kind === 'bgm' && object.record.key === 'bgm:default') {
    const resourceId = `scene:${hex(object.sceneId)}`;
    add({}, resourceId, `${resourceId}:music`, '入口音乐', ['command_id']);
  }
  const addFormation = (target, id) => {
    if (!Number.isInteger(Number(id)) || Number(id) < 0 || Number(id) >= 0x39) return;
    for (let slot = 0; slot < 4; slot++) add(target, 'battle-test-point',
      `encounter-formation:${hex(id)}:slot:${slot}`, `战斗编队 ${hex(id)} · 槽 ${slot + 1}`);
  };
  if (object.kind === 'event') addFormation({}, sceneCoordinateEvent(object.record, context).encounter_formation_id);
  const addReward = record => {
    const content = sceneTreasureContent(record, context.logicIndex?.treasures || []);
    if (content.kind === 'money') {
      if (Number(record.content_id) <= 0xfa) add({}, 'field-reward-resolution-service',
        `field-reward-resolution-service:${hex(record.content_id)}`, '金钱奖励倍率');
      else gaps.push(`调查物 ${hex(record.id)} 的结果 ${hex(record.content_id)} 缺金钱倍率字段引用。`);
    }
  };
  if (object.kind === 'treasure') addReward(object.record);
  if (object.kind === 'investigation-tile') {
    const record = sceneTreasureProbeResolution(object, context)?.record;
    if (record) {
      addReward(record);
      const resourceId = `scene:${hex(object.sceneId)}`;
      add({condition: '未取得'}, resourceId, `${resourceId}:treasure:${hex(record.id)}`,
        '调查物坐标与内容', ['x', 'y', 'content_id']);
    }
  }
  if (object.kind === 'actor' && actorInteractionMode(object.record) === 'interaction-script'
      && !result.targets.some(target => target.query.view === 'story-page'))
    add(result.targets.find(target => target.query.view === 'actors'
      && target.query.storyKind === 'interaction') || {}, 'story-interaction-script',
      `story-interaction-script:script:${hex(object.record.interaction_or_record_id)}`, '交互脚本');
  if (object.kind === 'actor' && Number(object.record.autonomous_script_id) > 0)
    add(result.targets.find(target => target.query.view === 'actors'
      && target.query.storyKind === 'autonomous') || {}, 'story-autonomous-script',
      `story-autonomous-script:script:${hex(object.record.autonomous_script_id)}`, '自动动作脚本').physicalOnly = true;
  if (object.kind === 'actor') for (const action of storySceneActions(object.record, context.autonomous, context.story)) {
    if (action.handle !== `story-autonomous-script:script:${hex(object.record.autonomous_script_id)}`)
      add({}, 'story-autonomous-script', action.handle, '自动动作脚本').physicalOnly = true;
    for (const {regionId, recordId} of storySceneDialogueReferences(action))
      add({}, 'text-record', `record:${hex(regionId)}:${String(recordId).padStart(3, '0')}`, '剧情文字');
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
        `story-autonomous-script:script:${hex(id)}`, `自动剧情脚本 ${hex(id)}`);
      for (const clue of sequence?.dialogue_clues || []) add(target, 'text-record',
        `record:${hex(clue.region_id)}:${String(clue.record_id).padStart(3, '0')}`, '剧情文字');
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
      `vehicle-preset:preset:${hex(target.query.record)}`, '战车预设');
    if (target.record) add(target, 'text-record', target.record, '对话与调查文字');
    const service = INTERFACE_PAGE_DEFINITIONS.find(row => row.id === target.query.interface);
    if (service?.configResourceId) add(target, service.configResourceId, null, service.label);
    if (!target.application) continue;
    const {command, instance} = target.application;
    const application = context.facilities.applications.commands.find(row =>
      Number(row.command_id) === Number(command));
    const family = application?.configuration_family;
    const commandResource = `application-command:${hex(command)}`;
    add(target, commandResource, commandResource, '应用脚本入口');
    if (family) {
      const alias = context.facilityConfiguration?.families?.find(row =>
        Number(row.id) === Number(family.family_id))?.records.find(row => Number(row.id) === Number(instance));
      const record = context.facilityConfiguration?.records.find(row => row.id === alias?.record_id);
      if (!record) {gaps.push(`配置族 ${hex(family.family_id)} 实例 ${hex(instance)} 缺字段对象引用。`); continue;}
      if (record.slots.length) add(target, 'facility-config', record.id, `${target.label} · 实例 ${hex(instance)}`);
      const namespace = family.value_namespace;
      for (const slot of record.slots) {
        if (Number(family.family_id) === 0x0a) add(target, 'audio-command',
          `audio-command:${hex(slot.value)}`, `曲目 ${hex(slot.value)}`);
        const schema = namespace?.slot_schema?.slots.find(row => Number(row.slot) === Number(slot.id));
        const domain = schema?.namespace || (namespace?.slot_schema ? null : namespace?.namespace);
        if (domain === 'item') add(target, 'item-entry', `item-entry:item:${hex(slot.value)}`,
          `${context.items?.find(row => Number(row.id) === Number(slot.value))?.name || hex(slot.value)} · 商品价格`, ['price.raw_code']);
        if (domain === 'shell') add(target, 'shell-record', `shell:${hex(slot.value)}`, '炮弹价格', ['price.raw_code']);
        if (domain === 'vehicle-preset') add(target, 'vehicle-preset', `vehicle-preset:preset:${hex(slot.value)}`, '出租车型');
        if (domain === 'service-goods') {
          const goods = namespace.goods.find(row => Number(row.value) === Number(slot.value));
          if (goods?.text_record) add(target, 'text-record', goods.text_record, namespace.goods_label || '服务项目');
        }
      }
    }
    if ([0x32, 0x33].includes(Number(command))) add(target,
      `ui-facility:frog-race:config:${hex(instance)}`, `ui-facility:frog-race:config:${hex(instance)}`, '下注金额');
    if (Number(command) === 0x2d) for (let id = 0; id < 12; id++) add(target,
      `ui-facility:teleport-terminal:config:${hex(id)}`,
      `ui-facility:teleport-terminal:config:${hex(id)}`, `传送落点 ${hex(id)}`);
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
    return '?view=interfaceui&interface=field-investigation#investigation-reward-parameters';
  if (resourceId.startsWith('application-command:'))
    return `?view=interfaceui&interface=interaction-service&resource=${resourceId}`;
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
    return `?view=interfaceui&interface=interaction-service&resource=application-command:1D&record=${parseInt(handle.split('-').at(-1), 16)}`;
  if (resourceId.startsWith('ui-facility:') && fallback)
    return `${fallback.split('#')[0]}#facility-parameters-${resourceId.replaceAll(':', '-')}`;
  return fallback;
}

function sceneConfigurationStays(request, object) {
  if (object.boundInteraction) return false;
  return request.existingInspector || request.inPlace || [TILE_ACTION_OWNER, WORLD_TIDE_OWNER].includes(request.resourceId)
    || request.resourceId === `scene:${hex(object.sceneId)}`;
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

function link(href, label, role) {
  return href ? `<a class="editor-inline-link" data-controller-link="${role}" href="${esc(href)}">${esc(label)} ↗</a>` : esc(label);
}

function controllerTargetsMarkup(instance, project) {
  const control = instance.switch;
  if (!control) return '';
  const targets = (control.targets || []).map(target => {
    const points = target.cells || (target.x == null ? [] : [{x: target.x, y: target.y}]);
    return `<p>${esc(target.label)} · ${points.length ? points.map(point => link(
      controllerSceneHref(target.scene_id, project, {object: target.scene_object,
        point: [point.x, point.y], mode: target.kind === 'map-replacement' ? 'tiles' : 'logic'}),
      `场景 $${Number(target.scene_id).toString(16).toUpperCase()} (${point.x}, ${point.y})`, 'target')).join(' · ')
      : link(controllerSceneHref(target.scene_id, project), controllerTargetLabel(target), 'target')}
      ${target.target_scene_id == null ? '' : ` → ${link(controllerSceneHref(target.target_scene_id, project),
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
  return link(controllerHref(instance, project), `控制器 ${instance.scene_object_uid} · (${instance.x}, ${instance.y})`, 'controller');
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

// @editor-module 系统状态图保留文件、命名与结局的稳定等待点及领域交接。


const EVIDENCE = 'project/evidence/system-state-machine/observations.json';
const node = (id, label, previewId, role = 'screen') => ({id, label, previewId, role});

function systemStateGraph(page, previews, variant = 'player-name') {
  let nodes = [], routes = [];
  if (page === 'startup-load') {
    nodes = [node('title', '等待开始', null, 'title'),
      node('files', '文件菜单', 'constructor:startup-load-file-menu'),
      node('file-slot', '文件槽选择', 'constructor:startup-load-file-menu'),
      node('player-name', '主角命名', 'constructor:player-name'),
      node('game', '进入游戏', null, 'call')];
    routes = [['title', 'files', 'A / START', '有效记录存在'], ['title', 'player-name', 'A / START', '没有有效记录'],
      ['files', 'file-slot', '继续 / 移动 / 删除 · A', ''],
      ['file-slot', 'game', '继续 · A', '所选记录有效'], ['file-slot', 'files', '移动 / 删除 · A', '所选记录有效'],
      ['file-slot', 'file-slot', 'A', '所选记录无效'], ['files', 'player-name', '重开 · A', ''],
      ['file-slot', 'files', 'B', ''],
      ['player-name', 'game', 'END · A', '']];
  } else if (page === 'save-management') {
    nodes = [node('save-prompt', '存档确认', 'constructor:save-prompt'),
      node('save-slot', '存档槽选择', 'constructor:slot-select'),
      node('save-overwrite', '覆盖确认', 'constructor:save-management-overwrite'),
      node('saved', '保存完成', 'constructor:saved'),
      node('save-continue', '继续游戏', 'constructor:save-management-continue'),
      node('save-bed', '就寝提示', 'constructor:save-management-bed')];
    routes = [['save-prompt', 'save-slot', '是 · A', '首次保存'], ['save-prompt', 'saved', '是 · A', '已有当前文件槽'],
      ['save-prompt', null, '否 / B', ''], ['save-slot', 'save-overwrite', 'A', '已有有效记录'],
      ['save-slot', 'saved', 'A', '空记录'], ['save-slot', null, 'B', ''],
      ['save-overwrite', 'saved', '是 · A', ''], ['save-overwrite', null, '否 / B', ''],
      ['saved', 'save-continue', 'A / B', '正文续接'], ['save-continue', null, '是 · A', ''],
      ['save-continue', 'save-bed', '否 / B', ''], ['save-bed', null, 'A / B', '结束游戏并等待重启或关机']];
  } else if (page === 'name-entry') {
    const stem = variant === 'vehicle-name' ? 'vehicle-name' : 'player-name';
    nodes = [node('name-grid', '字符表', `constructor:${stem}`), node('name-typed', '已输入姓名', `constructor:${stem}-typed`),
      node('name-end', 'END 选中', `constructor:${stem}-end`), node('name-return', '返回调用者', null, 'call')];
    routes = [['name-grid', 'name-typed', '字符 · A', ''], ['name-typed', 'name-typed', '字符 / 删除', ''],
      ['name-grid', 'name-end', '方向键', ''], ['name-typed', 'name-end', '方向键', ''],
      ['name-end', 'name-grid', '方向键', ''], ['name-end', 'name-return', 'A', variant === 'vehicle-name' ? '名字非空' : '']];
  } else if (page === 'ending-credits') {
    nodes = [node('ending-retirement', '退隐终页', 'constructor:ending-retirement-message'),
      node('ending-noah', '诺亚结局消息', 'constructor:ending-message-10'),
      node('ending-record', '通关记录', 'constructor:ending-message-11'),
      node('ending-terminal', '终页等待', 'constructor:ending-message-12'),
      node('credits', '职员表播放', null, 'call')];
    routes = [['ending-retirement', null, '任意新按键', '重启边界'], ['ending-noah', 'credits', '领域交接', ''],
      ['ending-record', 'credits', '领域交接', '']];
  }
  for (const row of nodes) {
    if (page === 'startup-load' && row.id === 'player-name') row.referenceTarget = {
      pageId: 'name-entry', nodeId: 'name-grid', label: '命名'};
    if (row.id === 'game') row.referenceTarget = {pageId: 'scenes', label: '场景进入', route: {view: 'scenes'}};
    if (row.id === 'credits') row.referenceTarget = {label: '结局与职员表',
      identity: {id: 'story:extended-fa-ending', domain: 'story', key: 'extended-fa-ending'},
      route: {view: 'ending', storySequence: 'extended-fa-ending'}};
  }
  nodes = nodes.map(row => ({...row, publishedPreview: previews.find(preview => preview.id === row.previewId) || null}));
  const transitions = routes.map(([from, to, input, condition], index) => ({id: `system:${page}:${index}`,
    from, to: nodes.some(row => row.id === to) ? to : null, input, condition, evidence: EVIDENCE,
    executable: true, unknown: false,
    ...(from === 'save-bed' ? {evidence: 'project/evidence/reverse-engineering/small-service-groups/observations.json',
      scope: 'A000 交接结束游戏提示；保存记录不执行旅馆 HP 恢复；重启后的开机流程归调用者'} : {})}));
  return {nodes, transitions, edges: transitions.map(row => ({...row, routes: [row]})),
    entry: page === 'startup-load' ? 'files' : nodes[0]?.id};
}

function systemStateExecution({page, graph, protocol, byteMap, variant = 'player-name'}) {
  const status = state => getSaveSlotStatus(state.execution.files, state.selections.slot, byteMap);
  const selectNode = state => {
    const name = state.execution.name;
    state.node = name.confirmed ? (page === 'startup-load' ? 'game' : 'name-return')
      : page === 'startup-load' ? 'player-name'
      : name.index === protocol.endIndex ? 'name-end' : name.buffer.some(code => code < 159) ? 'name-typed' : 'name-grid';
    if (name.confirmed) {
      state.domainResults.name = {variant: name.variant, codes: [...name.buffer], confirmed: true};
      const suffix = name.variant === 'player-name' ? 'role.hunter' : `vehicle.${state.context.vehicle || 0}`;
      if (name.buffer[0] < 159) state.fields[`save.slot.${state.context.slot || 1}.${suffix}.name_codes`] = Uint8Array.from(name.buffer);
      state.execution.status = 'called';
      state.domainResults.call = {kind: page === 'startup-load' ? 'new-game' : 'name-return', confirmed: true};
    }
  };
  const save = state => {
    state.execution.files = previewSaveFileOperation(state.execution.files,
      {operation: 'save', slot: state.selections.slot, from: state.context.slot}, byteMap);
    state.fields = previewSaveFileFields(state.execution.files, byteMap);
    state.execution.currentSlot = state.selections.slot;
    state.domainResults.file = {operation: 'save', slot: state.selections.slot, confirmed: true};
    state.node = 'saved'; state.selections.choice = 0;
  };
  return {
    initial({fields = {}, context = {}, files = [], currentSlot = null, node: entry = graph.entry} = {}) {
      const initial = interfacePreviewState({fields, context, node: entry, entry,
        selections: {choice: 0, slot: context.slot || 1},
        execution: {files: Uint8Array.from(files), currentSlot, status: 'waiting', name: null, trace: []}});
      if (page === 'name-entry') initial.execution.name = initialNameEntry(protocol, variant);
      if (page === 'ending-credits' && entry !== 'ending-retirement') {
        initial.execution.status = entry === 'ending-terminal' ? 'terminal' : 'called';
        if (entry !== 'ending-terminal') initial.domainResults.call = {kind: 'credits', confirmed: true};
      }
      return initial;
    },
    advance(previous, input) {
      const state = structuredClone(previous), type = typeof input === 'string' ? input : input.type;
      if (state.execution.status !== 'waiting') return state;
      state.execution.trace.push({node: state.node, input: structuredClone(input), evidence: EVIDENCE});
      if (state.node === 'ending-retirement' && ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'].includes(type)) {
        state.execution.status = 'called'; state.domainResults.call = {kind: 'reset', confirmed: true}; return state;
      }
      if (state.execution.name) {
        state.execution.name = advanceNameEntry(state.execution.name, type, protocol); selectNode(state); return state;
      }
      if (type === 'slot') {state.selections.slot = input.slot; return state;}
      if (type === 'option') {state.selections.choice = input.index; return state;}
      if (['up', 'down', 'left', 'right'].includes(type)) {
        const value = state.selections.choice;
        state.selections.choice = state.node === 'files'
          ? type === 'up' ? value % 2 : type === 'down' ? value % 2 + 2
          : type === 'left' ? value & 2 : (value & 2) + 1
          : type === 'up' || type === 'left' ? 0 : 1;
        return state;
      }
      if (state.node === 'title' && ['a', 'start'].includes(type)) {
        if ([1, 2].some(slot => getSaveSlotStatus(state.execution.files, slot, byteMap).valid)) state.node = 'files';
        else {state.node = 'player-name'; state.execution.name = initialNameEntry(protocol, 'player-name');}
      } else if (state.node === 'files' && type === 'a') {
        const operation = ['load', 'clone', 'restart', 'delete'][state.selections.choice];
        state.execution.operation = operation;
        if (operation === 'restart') {
          state.domainResults.file = {operation, confirmed: true};
          state.node = 'player-name'; state.execution.name = initialNameEntry(protocol, 'player-name');
        }
        else {state.node = 'file-slot'; state.selections.choice = 0;}
      } else if (state.node === 'file-slot' && type === 'a') {
        const operation = state.execution.operation;
        state.selections.slot = state.selections.choice + 1;
        if (!status(state).valid) return state;
        else if (operation === 'load') {
          state.execution.currentSlot = state.selections.slot;
          state.domainResults.file = {operation, slot: state.selections.slot, confirmed: true};
          state.domainResults.call = {kind: 'load-game', slot: state.selections.slot, confirmed: true};
          state.execution.status = 'called'; state.node = 'game';
        } else {
          const from = state.selections.slot;
          const slot = operation === 'clone' ? 3 - from : from;
          state.execution.files = previewSaveFileOperation(state.execution.files, {operation, slot, from}, byteMap);
          state.fields = previewSaveFileFields(state.execution.files, byteMap);
          state.domainResults.file = {operation, from, slot, confirmed: true};
          state.node = 'files'; state.selections.choice = 0;
        }
      } else if (state.node === 'file-slot' && type === 'b') {state.node = 'files'; state.selections.choice = 0;}
      else if (state.node === 'save-prompt' && ['a', 'b'].includes(type)) {
        if (type === 'b' || state.selections.choice) state.execution.status = 'returned';
        else if (state.execution.currentSlot) {state.selections.slot = state.execution.currentSlot; save(state);}
        else {state.node = 'save-slot'; state.selections.choice = 0;}
      } else if (state.node === 'save-slot' && type === 'a') {
        state.selections.slot = state.selections.choice + 1;
        if (status(state).valid) {state.node = 'save-overwrite'; state.selections.choice = 0;}
        else save(state);
      } else if (state.node === 'save-overwrite' && type === 'a' && !state.selections.choice) save(state);
      else if (['save-slot', 'save-overwrite'].includes(state.node) && ['a', 'b'].includes(type)) state.execution.status = 'returned';
      else if (state.node === 'saved' && ['a', 'b'].includes(type)) state.node = 'save-continue';
      else if (state.node === 'save-continue' && ['a', 'b'].includes(type)) {
        if (type === 'a' && !state.selections.choice) state.execution.status = 'returned';
        else state.node = 'save-bed';
      } else if (state.node === 'save-bed' && ['a', 'b'].includes(type)) {
        state.execution.status = 'terminal';
        state.domainResults.call = {kind: 'power-off-prompt', confirmed: true};
      }
      return state;
    },
  };
}

export { bindControlledObjectUsers, bindSceneDestinationUsers, consolidateSceneDestinationLinks, controlledObjectMarkup, controllerTargetsMarkup, createAudioTimelinePlayer, renderSceneDestinationLinks, sceneConfigurationStays, sceneControllerMarkup, sceneDestinationUsersMarkup, sceneOwnedInteractionConfigurations, stopAudioTimelines, systemStateExecution, systemStateGraph };
