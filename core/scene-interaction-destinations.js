// @editor-module 按已发布的交互语义解析场景对象的承载页面。
import {INTERFACE_PAGE_DEFINITIONS, serviceFamilyPage} from './ui-page-registry.js';
import {SHOP_PAGES, SHOP_ITEM_BUYER_ROUTE, itemPageRoute} from './editor-pages.js';
import {storyViewForSequenceId} from './story-view-config.js';
import {sceneTreasureContent} from './scene-config-owner.js';
import {sceneBgmItemsForProject, sceneEntryStoryItemsForProject} from './scene-entry-interactions.js';
import {sceneTileAction, sceneTileActionArrival} from './scene-tile-action.js';
import {sceneRemapItems, sceneActorStateObjects} from './scene-entry-states.js';
import {STORY_DIALOGUE_OPERATIONS} from './story-dialogue-operations.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const facilityViews = {jukebox: 'jukebox', 'item-vending-machine': 'vending',
  'ammunition-vending-machine': 'vending', 'frog-race': 'frograce',
  'teleport-terminal': 'teleport', 'computer-controller': 'computercontroller'};

const investigationLayers = [['treasure', 'treasures'], ['investigation-special', 'investigation_special_points'],
  ['investigation', 'investigation_points'], ['investigation-tile', 'metatile_investigation_points']];

export function sceneTreasureProbeResolution(object, context) {
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

export function sceneInvestigationResolution(object, context) {
  if (!investigationLayers.some(([kind]) => kind === object.kind)) return null;
  const layers = context.sceneLogic?.layers;
  if (!layers) return null;
  const scene = object.scene || context.scenes?.editable_scenes?.find(row =>
    Number(row.id) === Number(object.sceneId))?.slug;
  const peers = investigationLayers.flatMap(([kind, layer]) => (layers[layer] || [])
    .filter(record => Number(record.x) === Number(object.record.x)
      && Number(record.y) === Number(object.record.y))
    .map(record => ({kind, record, sceneId: object.sceneId, scene,
      key: `${kind}:${record.id}`, uid: `${kind}:${hex(object.sceneId)}:${hex(record.id)}`})));
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

export function sceneUsageAnchor(scene, key) {
  return `scene-use-${scene}-${key}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function actorInteractionMode(record) {
  const selector = Number(record.text_region), argument = Number(record.interaction_or_record_id);
  if (selector === 0) return argument === 0 ? 'none' : 'interaction-script';
  return selector < 0x10 ? 'direct-dialogue' : 'service-handler';
}

export function sceneCoordinateEvent(record, context) {
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

export function applicationDestination(command, instance, context) {
  if (Number(command) >= 0x39 && Number(command) <= 0xFF) return {target: destination(`扩展流程 ${hex(command)}`,
    {view: 'interfaceui', interface: 'interaction-service', resource: `application-command:${hex(command)}`},
    `application-command:${hex(command)}`)};
  if (Number(command) === 0x24) return {target: destination('人类物品收购',
    SHOP_ITEM_BUYER_ROUTE, 'application-command:24')};
  const source = (context.facilities?.applications?.commands || [])
    .find(row => Number(row.command_id) === Number(command));
  if (!source) return {gap: `应用命令 ${hex(command)} 缺少已发布处理语义。`};
  const evidence = {command: `application-command:${hex(command)}`,
    source: source.application_script_pointer_entry, definition: source.evidence};
  const family = source.configuration_family;
  if (Number(command) === 0x30 && source.kind === 'vehicle-rental-service')
    return {target: destination(source.label, {view: 'shops', shopFamily: 4, shopTab: 'flow'},
      {...evidence, carrier: 'project/evidence/scene-gap-misc/resolution.json'})};
  if (Number(family?.family_id) === 13) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 0D 缺少实例 ${hex(instance)}。`};
    const target = destination(`investigation-command:${hex(command)}:config:${hex(instance)}`,
      {view: 'scenes', sceneTab: 'investigation'}, evidence, {instance});
    target.href += `#investigation-command-${hex(command)}-config-${hex(instance)}`;
    return {target};
  }
  if (family && SHOP_PAGES.some(page => Number(page.route.shopFamily) === Number(family.family_id))) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 ${hex(family.family_id)} 缺少实例 ${hex(instance)} 的选择规则。`};
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
  return {gap: `应用命令 ${hex(command)} 的 ${source.kind} 没有已确认的页面对应关系。`};
}

export function sceneInteractionDestinations(object, context) {
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
    applications.push({command, instance, label: application?.label || `应用命令 ${hex(command)}`});
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
      resource: `item:${hex(id)}`}, evidence));
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
      `自动动作脚本 ${hex(record.autonomous_script_id)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'autonomous', record: Number(record.autonomous_script_id)}, record.uid));
    for (const sequence of context.story?.browser_vm?.sequences || []) {
      const view = storyViewForSequenceId(sequence.id);
      if (view && sequence.trigger_actor_handles?.includes(record.uid)) targets.push(destination(
        sequence.label, {view, storySequence: sequence.id, storyPaused: 1}, record.uid));
    }
    if (mode === 'none') return {targets, gaps, applications, noInteraction: !targets.length};
    if (mode === 'direct-dialogue') {
      addTexts([`record:${hex(record.text_region)}:${String(record.interaction_or_record_id).padStart(3, '0')}`], source);
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
        else gaps.push(`服务 ${hex(selector)} 参数 ${hex(argument)} 缺已发布的 ROM 映射表项。`);
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
      else targets.push(destination(`交互脚本 ${hex(scriptId)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'interaction', record: scriptId}, source));
      const semantic = !context.changedInteractionScripts?.has(scriptId) && context.story?.npc_catalog?.records?.find(row =>
        Number(row.interaction_script?.id) === scriptId);
      if (!semantic) gaps.push(`交互脚本 ${hex(scriptId)} 缺少当前正文的对话与应用去向解析。`);
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
    else gaps.push(`调查选择值 ${hex(record.handler_selector)} 缺少已发布的命令映射。`);
  } else if (kind === 'investigation-tile') {
    const behavior = context.logicIndex?.investigation_tile_behavior_catalog?.find(row =>
      Number(row.behavior_code) === Number(record.behavior_code));
    if (!behavior) gaps.push(`行为 ${hex(record.behavior_code)} 缺少处理器语义。`);
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
        targets.push(destination('调查音效', {view: 'audio', record: `audio-command:${hex(action.audio_command)}`},
          {definition: scenery.evidence, source: action.source.audio}));
        if (action.transition) {
          const arrival = sceneTileActionArrival(action.transition, context.scenes, context.logicIndex);
          if (arrival) targets.push(destination(`同格入口 → ${arrival.scene.name} (${arrival.x}, ${arrival.y})`,
            {view: 'scenes', scene: arrival.scene.slug, sceneMode: 'logic',
              scenePoint: `${arrival.x},${arrival.y}`},
            {source: action.transition.source}, {tileActionTransition: action.transition}));
        }
        const set = context.metatileSets?.records?.find(row => row.scene_references?.includes(`scene:${hex(sceneId)}`));
        if (!set) gaps.push('地图格替换动作缺所属场景的元图块集引用。');
        else {
          const handle = Number(sceneId) === 0 ? set.handle
            : action.replacement_metatile < 64 ? set.lower_metatile_page : set.upper_metatile_page;
          const index = Number(sceneId) === 0 ? action.replacement_metatile : action.replacement_metatile % 64;
          targets.push(destination('调查后的元图块', {view: 'metatiles', metatile: handle,
            tile: index, context: `scene:${hex(sceneId)}`},
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
  } else if (kind === 'boundary-return') {
    nonConfigurable.push({reason: 'runtime-return-not-saved', label: '返回进入前的位置',
      evidence: 'project/evidence/scene-gap-misc/resolution.json'});
  } else if (kind === 'event') {
    if ([0, 0xff].includes(Number(record.story_state))) {
      const formationId = Number(record.encounter_formation_id);
      if (Number.isInteger(formationId) && formationId >= 0 && formationId < 0x39)
        targets.push(destination('坐标遭遇编队', {view: 'battle-test',
          resource: `encounter-formation:${hex(formationId)}`},
        {source, definition: 'project/evidence/scene-gap-misc/resolution.json',
          path: 'B9B6→B9E3→B97E', state: record.story_state}));
      else gaps.push(`坐标事件 ${hex(record.id)} 缺已发布的遭遇编队。`);
      return {targets, gaps, resolution, applications};
    }
    const lists = context.story?.special_actor_lists?.filter(row =>
      Number(row.selection?.story_state) === Number(record.story_state)) || [];
    const sequence = context.story?.browser_vm?.sequences?.find(row =>
      lists.some(list => row.variant_ids?.includes(Number(list.id))));
    const view = sequence && storyViewForSequenceId(sequence.id);
    if (view) targets.push(destination(sequence.label, {view, storySequence: sequence.id,
      storyPaused: 1}, {source, state: record.story_state}));
    else gaps.push(`剧情状态 ${hex(record.story_state)} 缺到已发布剧情序列的入口对应关系。`);
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
      `scene:${hex(row.id)}` === record.target_scene_reference);
    if (target) targets.push(destination(record.target_scene_reference,
      {view: 'scenes', scene: target.slug, sceneMode: 'logic'}, record.handle,
      {condition: `${record.global_event_flag_reference} = 1`}));
    else gaps.push(`${record.target_scene_reference} 缺场景承载页。`);
  } else if (kind === 'bgm') {
    targets.push(destination(record.label, {view: 'audio', record: `audio-command:${hex(record.id)}`}, record.evidence));
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

export function enumerateSceneInteractionObjects(scene, sceneLogic, actors, placements = [], context = null) {
  const layers = sceneLogic.layers, sceneId = Number(scene.id);
  const rows = [], byUid = context?.actorsByUid || new Map(actors.map(row => [row.uid, row]));
  const includes = kind => !context?.objectKinds || context.objectKinds.has(kind);
  const add = (kind, record, key, uid = `${kind}:${hex(sceneId)}:${hex(record.id)}`) => {
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
    layers.transitions.dynamic_boundary_return, 'boundary:return', `scene:${hex(sceneId)}`);
  for (const record of placements.filter(row => row.placed && Number(row.scene_id) === sceneId))
    add('vehicle', record, `vehicle:${record.vehicle_slot}`, `vehicle:${hex(record.vehicle_slot)}`);
  if (context) {
    for (const object of [...rows].filter(row => row.kind === 'actor'))
      rows.push(...sceneActorStateObjects(object, context.autonomousScripts, context.story));
    if (includes('scene-state')) for (const item of sceneRemapItems(sceneId, context.bgm))
      add('scene-state', item, item.key, item.handle);
    if (includes('bgm')) for (const item of sceneBgmItemsForProject(sceneId, context.bgm, context.scenes))
      add('bgm', item, item.key, `scene:${hex(sceneId)}`);
    for (const item of sceneEntryStoryItemsForProject(sceneId, context.story))
      add('entry-story', item, item.key, `scene:${hex(sceneId)}`);
  }
  return rows;
}
