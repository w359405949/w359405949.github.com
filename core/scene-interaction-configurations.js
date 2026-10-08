// @editor-module 将场景交互去向绑定到承载页共用的配置字段对象。
import {sceneInteractionDestinations, actorInteractionMode, sceneTreasureProbeResolution, sceneCoordinateEvent} from './scene-interaction-destinations.js';
import {INTERFACE_PAGE_DEFINITIONS} from './ui-page-registry.js';
import {sceneTreasureContent} from './scene-config-owner.js';
import {TILE_ACTION_OWNER, TILE_ACTION_HANDLE} from './scene-tile-action-owner.js';
import {WORLD_TIDE_OWNER, WORLD_TIDE_HANDLE} from './world-tide-owner.js';
import {tideEntrance} from './world-tide.js';
import {storySceneActions, storySceneDialogueReferences} from './story-scene-actions.js';
import {itemPageRoute} from './editor-pages.js';
import {controllerAt} from './controller-switch-links.js';
import {controllerSceneRemaps, SCENE_REMAP_OWNER} from './scene-remap-owner.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

export function sceneOwnedInteractionConfigurations(object, context) {
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

export function sceneInteractionConfigurations(object, context) {
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
      '目标场景与落点', ['destination_scene_id', 'destination_x', 'destination_y']).existingInspector = true;
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

export function sceneConfigurationStays(request, object) {
  return request.existingInspector || request.inPlace || [TILE_ACTION_OWNER, WORLD_TIDE_OWNER].includes(request.resourceId)
    || request.resourceId === `scene:${hex(object.sceneId)}`;
}
