import { serviceFamilyPage, itemPageRoute, SHOP_ITEM_BUYER_ROUTE, SHOP_PAGES, INTERFACE_PAGE_DEFINITIONS, storiesForEventFlag } from './story-event-links-CRjG_25M.js';
import { storyViewForSequenceId, storyPlaybackView } from './package-schema-paths-gCIepLXx.js';
import { sceneDefaultMusicCommand, TILE_ACTION_HANDLE, sceneInteractionBoundObject, STORY_DIALOGUE_OPERATIONS, sceneTreasureContent, WORLD_TIDE_HANDLE, worldCoarsePatternCells, SCENE_SERVICE_INSTANCE_COUNTS, db, HIDDEN_TELEPORT_RESOURCE_ID, loadByteMapIndex, loadByteMapBank, TILE_ACTION_OWNER, WORLD_TIDE_OWNER, controllerSceneRemaps, SCENE_REMAP_OWNER } from './battle-result-script-runtime-B_EClFew.js';
import { globalEventFlagHandle, prepareGlobalEventFlags, globalEventFlagEntries, globalEventFlagEntry } from './facility-window-semantics-BvUme8Kk.js';
import { sceneMetatileAttributeRecords } from './preview-DMSrQMyk.js';
import { metatileBehaviorLabel, metatileBehaviorCode } from './pattern-pixel-editor-B8puYQ8A.js';
import { sceneActorStateObjects, sceneRemapItems, storyActorCondition, hiddenTeleportGate, editorErrorMarkup, esc, hiddenTeleportDestination, hiddenTeleportFlags, storySceneActions, storySceneDialogueReferences, currentTextReference, interfacePreviewState } from './element-tree-DsgOBeTK.js';
import { uiTemplateBindings } from './page-runtime-paths-C0wxpxf1.js';

// @editor-module 场景音乐与进场剧情入口的纯数据投影。
const hex$5 = (value, width = 2) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

const ENTRY_KINDS = Object.freeze({
  "scene-loaded-autonomous-script": "场景加载后执行自动脚本",
  "coordinate-gated-autonomous-script": "场景加载后由坐标门触发自动脚本",
  "referenced-interaction-bootstrap+coordinate-gated-autonomous-script": "坐标门自动脚本；另有交互入口",
});

function uniqueEntryPath(program, targetCursor) {
  const commands = new Map((program?.commands || []).map(command => [command.cursor, command]));
  const paths = [];
  function walk(cursor, path, visited) {
    if (paths.length > 1 || visited.has(cursor)) return;
    if (cursor === targetCursor) { paths.push(path); return; }
    const command = commands.get(cursor);
    if (!command) return;
    const nextVisited = new Set(visited);
    nextVisited.add(cursor);
    for (const edge of command.edges || []) {
      walk(edge.target_cursor, [...path, {command, edge}], nextVisited);
    }
  }
  walk(0, [], new Set());
  return paths.length === 1 ? paths[0] : null;
}

function entryCondition(story, item) {
  const list = story.browser_vm?.extended_actor_lists?.find(entry =>
    Number(entry.id) === Number(item.actor_list_ids?.[0])
  );
  const constraints = list?.entry_flag_constraints;
  if (!Number.isInteger(constraints?.source_script_id)
    || !Number.isInteger(constraints?.target_control_lock_cursor)) return null;
  const program = story.browser_vm?.programs?.find(entry =>
    entry.kind === "autonomous" && Number(entry.id) === constraints.source_script_id
  );
  const path = uniqueEntryPath(program, constraints.target_control_lock_cursor);
  if (!path) return null;
  const flags = [
    ...(constraints.required_set_flags || []).map(id => `${globalEventFlagHandle(id)} 已置位`),
    ...(constraints.required_clear_flags || []).map(id => `${globalEventFlagHandle(id)} 未置位`),
  ];
  const positions = path.flatMap(({command, edge}) => {
    if (command.opcode === 0x35) return [
      `${hex$5(command.operands[0], 2)}≤X<${hex$5(command.operands[1], 2)}、${
        hex$5(command.operands[2], 2)}≤Y<${hex$5(command.operands[3], 2)}${edge.kind === "normal" ? "" : " 的范围外"}`,
    ];
    if (command.opcode === 0x08) return [
      `X=${hex$5(command.operands[0], 2)}、Y=${hex$5(command.operands[1], 2)}${
        edge.kind === "normal" ? "" : " 以外"}`,
    ];
    return [];
  });
  return {
    trigger: [ENTRY_KINDS[item.entry_evidence], ...flags, ...positions].join("；"),
    evidence: `自动脚本 ${hex$5(constraints.source_script_id, 2)} · 控制锁`,
  };
}

function sceneEntryStoryItemsForProject(sceneId, story) {
  const inventory = story.cutscene_inventory?.entries || [];
  const entries = inventory.filter(item =>
    ENTRY_KINDS[item.entry_evidence]
    && item.scene_ids?.includes(Number(sceneId))
    && storyViewForSequenceId(item.id)
  ).map(item => {
    const condition = entryCondition(story, item);
    return condition ? {id: item.id, label: item.label, ...condition,
      classification: item.classification} : null;
  }).filter(Boolean);
  for (const variant of story.special_actor_lists || []) {
    if (!Number.isInteger(variant.selection?.story_state)) continue;
    const context = story.story_mode_contexts?.entries?.find(item =>
      Number(item.story_state) === Number(variant.selection.story_state)
      && Number(item.scene_actor_entry) === Number(variant.id)
    );
    if (Number(context?.scene_id) !== Number(sceneId)
      || !variant.entry_sources?.sources?.length) continue;
    const sequence = inventory.find(item => item.actor_list_ids?.includes(Number(variant.id))
      && storyViewForSequenceId(item.id));
    if (!sequence) continue;
    entries.unshift({
      id: sequence.id,
      label: sequence.label,
      trigger: `剧情状态 $0481=${hex$5(variant.selection.story_state, 2)} 时选择特殊角色表 ${String(variant.id_hex)}`,
      evidence: `写入来源 ${variant.entry_sources?.sources?.map(source => source.kind === "machine-code-constant-writer"
        ? "常量写入"
        : `自动脚本 ${hex$5(source.script_id, 2)} 执行 ${String(source.opcode_hex)}`
      ).join("、")}`,
      classification: sequence.classification,
    });
  }
  for (const event of story.browser_vm?.entry_events || []) {
    if (event.scene_id !== Number(sceneId) || !storyViewForSequenceId(event.sequence_id)) continue;
    const item = entries.find(row => row.id === event.sequence_id);
    const sequence = story.browser_vm.sequences?.find(row => row.id === event.sequence_id);
    const values = {id: event.sequence_id, label: sequence?.label || event.sequence_id,
      trigger: event.trigger,
      evidence: `ROM ${event.evidence_prg_offsets.map(offset => hex$5(offset, 6)).join(" · ")}`,
      classification: inventory.find(row => row.id === event.sequence_id)?.classification};
    if (item) Object.assign(item, values);
    else entries.push(values);
  }
  return entries.map(item => ({...item, key: `entry-story:${item.id}`}));
}


function sceneBgmItemsForProject(sceneId, document, scenes, commandLabel = id => `曲目 ${hex$5(id, 2)}`, sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const defaultId = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  const defaultAddress = Number(catalog?.header_record_address?.offset) + 0x17;
  const items = Number(sceneId) === 0 ? [5, 24].map(id => ({key: `bgm:world:${id}`,
      label: `世界地图 · ${commandLabel(id)}`, id,
      condition: id === 24 ? "活动存档“是否在队”字节 $6478–$647A 任一字节的 $80 位为 1。"
        : "活动存档“是否在队”字节 $6478–$647A 的 $80 位均为 0。",
      evidence: "加载例程与选曲例程"}))
    : Number.isInteger(defaultId) && defaultId >= 0 && defaultId <= 0xFF
      && Number.isInteger(defaultAddress)
    ? [{key: "bgm:default", label: `默认 · ${commandLabel(defaultId)}`, id: defaultId,
      condition: "场景头默认曲目；条件音乐和运行时覆盖可能改变实际播放。",
      evidence: "场景头"}]
    : [];
  for (const row of document?.records || []) {
    if (row.kind !== "conditional-audio" || row.scene_reference !== `scene:${hex$5(Number(sceneId), 2).slice(2)}`) continue;
    const id = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
    const flag = row.global_event_flag_reference.split(":").at(-1);
    items.push({key: `bgm:${row.handle}`, label: `条件 · ${commandLabel(id)}`, id,
      condition: `global-event-flag:${flag} 已置位；后匹配的条件行优先。`,
      evidence: row.handle});
  }
  return items;
}

function sceneEntryMusicCommand(sceneId, lifecycle, scenes, eventFlags = [], sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const flags = new Set(eventFlags);
  let command = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  if (Number(sceneId) === 0) command = 5;
  for (const row of lifecycle?.records || []) {
    if (row.kind !== "conditional-audio"
        || row.scene_reference !== `scene:${hex$5(sceneId, 2).slice(2)}`) continue;
    const flag = Number.parseInt(row.global_event_flag_reference.split(":").at(-1), 16);
    if (flags.has(flag)) command = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
  }
  return Number.isInteger(command) && command >= 0 && command < 0xF0 ? command : null;
}

// @editor-module 调查后的地图格、同格入口与离场状态。

function sceneTileAction(object, context) {
  if (object.kind !== 'investigation-tile' || Number(object.record.behavior_code) !== 0x54) return null;
  const action = context.tileActions?.records?.find(record => record.handle === TILE_ACTION_HANDLE)
    || context.logicIndex?.investigation_scenery?.map_cell_action;
  if (!action) return null;
  const transition = context.sceneLogic?.layers?.transitions?.point_transitions?.find(record =>
    Number(record.x) === Number(object.record.x) && Number(record.y) === Number(object.record.y));
  let behavior = null;
  if (context.metatilePages && context.metatileSets) {
    const attributes = sceneMetatileAttributeRecords({id: object.sceneId},
      {pages: context.metatilePages, sets: context.metatileSets})
      .flatMap(record => record.metatile_attributes || record.metatile_attribute_page || []);
    const attribute = attributes[Number(action.replacement_metatile)];
    if (Number.isInteger(attribute)) {
      const code = metatileBehaviorCode(attribute);
      behavior = {code, label: metatileBehaviorLabel(code)};
    }
  }
  return {...action, source: action.sources || action.source, transition, behavior,
    persistence: {kind: 'scene-reload', label: '离场复原'}};
}

function sceneTileActionArrival(transition, scenes, logicIndex = null) {
  const scene = scenes?.editable_scenes?.find(row => Number(row.id) === Number(transition.destination_scene_id));
  if (!scene) return null;
  const x = Number(transition.destination_x), y = Number(transition.destination_y);
  const entrance = logicIndex?.point_transitions?.find(record => Number(record.scene_id) === Number(scene.id)
    && Number(record.x) === x && Number(record.y) === y);
  return {scene, x, y, href: `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
    sceneMode: 'logic', scenePoint: `${x},${y}`,
    ...(entrance ? {sceneObject: `transition:${entrance.id}`} : {})})}`};
}

async function sceneTileActionOrigins(object, context, database) {
  if (object.kind !== 'transition') return [];
  const sceneIds = [...new Set((context.logicIndex?.metatile_investigation_points || [])
    .filter(record => Number(record.behavior_code) === 0x54).map(record => Number(record.scene_id)))];
  const documents = await Promise.all(sceneIds.map(id => database.getResourceDocument(
    `scene:${id.toString(16).toUpperCase().padStart(2, '0')}`)));
  return documents.flatMap(document => {
    const sceneId = Number(document.logic.scene_id);
    const scene = context.scenes.editable_scenes.find(row => Number(row.id) === sceneId);
    return document.logic.layers.metatile_investigation_points.flatMap(record => {
      const action = sceneTileAction({kind: 'investigation-tile', record, sceneId},
        {...context, sceneLogic: document.logic});
      const transition = action?.transition;
      if (!transition || Number(transition.destination_scene_id) !== Number(object.sceneId)
        || Number(transition.destination_x) !== Number(object.record.x)
        || Number(transition.destination_y) !== Number(object.record.y)) return [];
      const handle = `investigation-tile:${sceneId.toString(16).toUpperCase().padStart(2, '0')}:${Number(record.id).toString(16).toUpperCase().padStart(2, '0')}`;
      return [{handle, x: record.x, y: record.y, href: `?${new URLSearchParams({view: 'scenes',
        scene: scene.slug, sceneMode: 'logic', sceneObject: `investigation-tile:${record.id}`,
        scenePoint: `${record.x},${record.y}`})}`}];
    });
  });
}

// @editor-module 按已发布的交互语义解析场景对象的承载页面。

const hex$4 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const facilityViews = {jukebox: 'jukebox', 'item-vending-machine': 'vending',
  'ammunition-vending-machine': 'vending', 'frog-race': 'frograce',
  'teleport-terminal': 'teleport', 'computer-controller': 'computercontroller'};

const investigationLayers = [['treasure', 'treasures'], ['investigation-special', 'investigation_special_points'],
  ['investigation', 'investigation_points'], ['investigation-tile', 'metatile_investigation_points']];

function sceneTreasureProbeResolution(object, context) {
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

function sceneInvestigationResolution(object, context) {
  if (!investigationLayers.some(([kind]) => kind === object.kind)) return null;
  const layers = context.sceneLogic?.layers;
  if (!layers) return null;
  const scene = object.scene || context.scenes?.editable_scenes?.find(row =>
    Number(row.id) === Number(object.sceneId))?.slug;
  const peers = investigationLayers.flatMap(([kind, layer]) => (layers[layer] || [])
    .filter(record => Number(record.x) === Number(object.record.x)
      && Number(record.y) === Number(object.record.y))
    .map(record => ({kind, record, sceneId: object.sceneId, scene,
      key: `${kind}:${record.id}`, uid: `${kind}:${hex$4(object.sceneId)}:${hex$4(record.id)}`})));
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

function sceneUsageAnchor(scene, key) {
  return `scene-use-${scene}-${key}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function actorInteractionMode(record) {
  const selector = Number(record.text_region), argument = Number(record.interaction_or_record_id);
  if (selector === 0) return argument === 0 ? 'none' : 'interaction-script';
  return selector < 0x10 ? 'direct-dialogue' : 'service-handler';
}

function sceneCoordinateEvent(record, context) {
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

function applicationDestination(command, instance, context) {
  if (Number(command) >= 0x39 && Number(command) <= 0xFF) return {target: destination(`扩展流程 ${hex$4(command)}`,
    {view: 'interfaceui', interface: 'interaction-service', resource: `application-command:${hex$4(command)}`},
    `application-command:${hex$4(command)}`)};
  if (Number(command) === 0x24) return {target: destination('人类物品收购',
    SHOP_ITEM_BUYER_ROUTE, 'application-command:24')};
  const source = (context.facilities?.applications?.commands || [])
    .find(row => Number(row.command_id) === Number(command));
  if (!source) return {gap: `应用命令 ${hex$4(command)} 缺少已发布处理语义。`};
  const evidence = {command: `application-command:${hex$4(command)}`,
    source: source.application_script_pointer_entry, definition: source.evidence};
  const family = source.configuration_family;
  if (Number(command) === 0x30 && source.kind === 'vehicle-rental-service')
    return {target: destination(source.label, {view: 'shops', shopFamily: 4, shopTab: 'ui'},
      {...evidence, carrier: 'project/evidence/scene-gap-misc/resolution.json'})};
  if (Number(family?.family_id) === 13) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 0D 缺少实例 ${hex$4(instance)}。`};
    const target = destination(`investigation-command:${hex$4(command)}:config:${hex$4(instance)}`,
      {view: 'interfaceui', interface: 'interaction-service', resource: `application-command:${hex$4(command)}`,
        record: String(instance)}, evidence, {instance});
    return {target};
  }
  if (family && SHOP_PAGES.some(page => Number(page.route.shopFamily) === Number(family.family_id))) {
    const row = family.records?.find(row => Number(row.id) === Number(instance));
    if (!row) return {gap: `配置族 ${hex$4(family.family_id)} 缺少实例 ${hex$4(instance)} 的选择规则。`};
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
  return {gap: `应用命令 ${hex$4(command)} 的 ${source.kind} 没有已确认的页面对应关系。`};
}

function sceneInteractionDestinations(object, context) {
  if (object.record?.interaction_binding) {
    const bound = sceneInteractionBoundObject(object, context);
    return bound ? sceneInteractionDestinations(bound, {...context, skipInvestigationTakeovers: true})
      : {targets: [], gaps: ['交互绑定的流程不存在。'], applications: [], nonConfigurable: []};
  }
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
    applications.push({command, instance, label: application?.label || `应用命令 ${hex$4(command)}`});
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
      resource: `item:${hex$4(id)}`}, evidence));
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
      `自动动作脚本 ${hex$4(record.autonomous_script_id)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'autonomous', record: Number(record.autonomous_script_id)}, record.uid));
    for (const sequence of context.story?.browser_vm?.sequences || []) {
      const view = storyViewForSequenceId(sequence.id);
      if (view && sequence.trigger_actor_handles?.includes(record.uid)) targets.push(destination(
        sequence.label, {view, storySequence: sequence.id, storyPaused: 1}, record.uid));
    }
    if (mode === 'none') return {targets, gaps, applications, noInteraction: !targets.length};
    if (mode === 'direct-dialogue') {
      addTexts([`record:${hex$4(record.text_region)}:${String(record.interaction_or_record_id).padStart(3, '0')}`], source);
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
        else gaps.push(`服务 ${hex$4(selector)} 参数 ${hex$4(argument)} 缺已发布的 ROM 映射表项。`);
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
      else targets.push(destination(`交互脚本 ${hex$4(scriptId)}`, {view: 'actors', actorPart: 'story',
        storyKind: 'interaction', record: scriptId}, source));
      const semantic = !context.changedInteractionScripts?.has(scriptId) && context.story?.npc_catalog?.records?.find(row =>
        Number(row.interaction_script?.id) === scriptId);
      if (!semantic) gaps.push(`交互脚本 ${hex$4(scriptId)} 缺少当前正文的对话与应用去向解析。`);
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
    else gaps.push(`调查选择值 ${hex$4(record.handler_selector)} 缺少已发布的命令映射。`);
  } else if (kind === 'investigation-tile') {
    const behavior = context.logicIndex?.investigation_tile_behavior_catalog?.find(row =>
      Number(row.behavior_code) === Number(record.behavior_code));
    if (!behavior) gaps.push(`行为 ${hex$4(record.behavior_code)} 缺少处理器语义。`);
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
        targets.push(destination('调查音效', {view: 'audio', record: `audio-command:${hex$4(action.audio_command)}`},
          {definition: scenery.evidence, source: action.source.audio}));
        if (action.transition) {
          const arrival = sceneTileActionArrival(action.transition, context.scenes, context.logicIndex);
          if (arrival) targets.push(destination(`同格入口 → ${arrival.scene.name} (${arrival.x}, ${arrival.y})`,
            {view: 'scenes', scene: arrival.scene.slug, sceneMode: 'logic',
              scenePoint: `${arrival.x},${arrival.y}`},
            {source: action.transition.source}, {tileActionTransition: action.transition}));
        }
        const set = context.metatileSets?.records?.find(row => row.scene_references?.includes(`scene:${hex$4(sceneId)}`));
        if (!set) gaps.push('地图格替换动作缺所属场景的元图块集引用。');
        else {
          const handle = Number(sceneId) === 0 ? set.handle
            : action.replacement_metatile < 64 ? set.lower_metatile_page : set.upper_metatile_page;
          const index = Number(sceneId) === 0 ? action.replacement_metatile : action.replacement_metatile % 64;
          targets.push(destination('调查后的元图块', {view: 'metatiles', metatile: handle,
            tile: index, context: `scene:${hex$4(sceneId)}`},
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
    const handle = `${kind}:${hex$4(sceneId)}:${hex$4(record.id)}`;
    for (const event of context.story?.browser_vm?.entry_events || []) {
      if (!event.transition_handles?.includes(handle)) continue;
      const view = storyViewForSequenceId(event.sequence_id);
      const sequence = context.story.browser_vm.sequences.find(row => row.id === event.sequence_id);
      if (view && sequence) targets.push(destination(sequence.label,
        {view, storySequence: sequence.id, storyPaused: 1}, event.evidence_prg_offsets,
        {condition: event.trigger}));
    }
  } else if (kind === 'boundary-return') {
    nonConfigurable.push({reason: 'runtime-return-not-saved', label: '返回进入前的位置',
      evidence: 'project/evidence/scene-gap-misc/resolution.json'});
  } else if (kind === 'event') {
    if ([0, 0xff].includes(Number(record.story_state))) {
      const formationId = Number(record.encounter_formation_id);
      if (Number.isInteger(formationId) && formationId >= 0 && formationId < 0x39)
        targets.push(destination('坐标遭遇编队', {view: 'battle-test',
          resource: `encounter-formation:${hex$4(formationId)}`},
        {source, definition: 'project/evidence/scene-gap-misc/resolution.json',
          path: 'B9B6→B9E3→B97E', state: record.story_state}));
      else gaps.push(`坐标事件 ${hex$4(record.id)} 缺已发布的遭遇编队。`);
      return {targets, gaps, resolution, applications};
    }
    const lists = context.story?.special_actor_lists?.filter(row =>
      Number(row.selection?.story_state) === Number(record.story_state)) || [];
    const sequence = context.story?.browser_vm?.sequences?.find(row =>
      lists.some(list => row.variant_ids?.includes(Number(list.id))));
    const view = sequence && storyViewForSequenceId(sequence.id);
    if (view) targets.push(destination(sequence.label, {view, storySequence: sequence.id,
      storyPaused: 1}, {source, state: record.story_state}));
    else gaps.push(`剧情状态 ${hex$4(record.story_state)} 缺到已发布剧情序列的入口对应关系。`);
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
      `scene:${hex$4(row.id)}` === record.target_scene_reference);
    if (target) targets.push(destination(record.target_scene_reference,
      {view: 'scenes', scene: target.slug, sceneMode: 'logic'}, record.handle,
      {condition: `${record.global_event_flag_reference} = 1`}));
    else gaps.push(`${record.target_scene_reference} 缺场景承载页。`);
  } else if (kind === 'bgm') {
    targets.push(destination(record.label, {view: 'audio', record: `audio-command:${hex$4(record.id)}`}, record.evidence));
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

function enumerateSceneInteractionObjects(scene, sceneLogic, actors, placements = [], context = null) {
  const layers = sceneLogic.layers, sceneId = Number(scene.id);
  const rows = [], byUid = context?.actorsByUid || new Map(actors.map(row => [row.uid, row]));
  const includes = kind => !context?.objectKinds || context.objectKinds.has(kind);
  const add = (kind, record, key, uid = `${kind}:${hex$4(sceneId)}:${hex$4(record.id)}`) => {
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
    layers.transitions.dynamic_boundary_return, 'boundary:return', `scene:${hex$4(sceneId)}`);
  for (const record of placements.filter(row => row.placed && Number(row.scene_id) === sceneId))
    add('vehicle', record, `vehicle:${record.vehicle_slot}`, `vehicle:${hex$4(record.vehicle_slot)}`);
  if (context) {
    for (const object of [...rows].filter(row => row.kind === 'actor'))
      rows.push(...sceneActorStateObjects(object, context.autonomousScripts, context.story));
    if (includes('scene-state')) for (const item of sceneRemapItems(sceneId, context.bgm))
      add('scene-state', item, item.key, item.handle);
    if (includes('bgm')) for (const item of sceneBgmItemsForProject(sceneId, context.bgm, context.scenes))
      add('bgm', item, item.key, `scene:${hex$4(sceneId)}`);
    for (const item of sceneEntryStoryItemsForProject(sceneId, context.story))
      add('entry-story', item, item.key, `scene:${hex$4(sceneId)}`);
  }
  return rows;
}

// @editor-module 控制器实例与受控对象的已发布引用。

const hex$3 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function controllerInstances(project) {
  return project?.facilities?.facilities?.find(row => row.id === 'computer-controller')?.instances || [];
}

function controllerAt(object, project, sceneLogic) {
  if (!['investigation', 'investigation-tile'].includes(object.kind)) return [];
  const instances = controllerInstances(project);
  const records = object.kind === 'investigation' ? [object.record]
    : (sceneInvestigationResolution(object, {...project, sceneLogic})?.branches || [])
      .filter(branch => branch.effective.kind === 'investigation').map(branch => branch.effective.record);
  return records.flatMap(record => {
    const instance = instances.find(row => Number(row.scene_id) === Number(object.sceneId)
      && Number(row.point_id) === Number(record.id));
    const command = project?.facilities?.investigation?.commands?.find(row =>
      Number(row.selector) === Number(record.handler_selector))?.command_id;
    const control = instances.find(row => Number(row.command_id) === Number(command)
      && Number(row.instance_id) === Number(record.instance_id))?.switch;
    return instance && control ? [{...instance, x: record.x, y: record.y, switch: control}] : [];
  });
}

function controllerFlagId(reference) {
  return Number.parseInt(String(reference).split(':').at(-1), 16);
}

function controllerSceneHref(sceneId, project, {object, point, mode = 'logic'} = {}) {
  const scene = project?.scenes?.editable_scenes?.find(row => Number(row.id) === Number(sceneId));
  if (!scene) return null;
  return `?${new URLSearchParams({view: 'scenes', scene: scene.slug, sceneMode: mode,
    ...(object ? {sceneObject: object} : {}), ...(point ? {scenePoint: point.join(',')} : {})})}`;
}

function controllerHref(instance, project) {
  return controllerSceneHref(instance.scene_id, project, {
    object: `investigation:${instance.point_id}`, point: [instance.x, instance.y],
  });
}

function controllerTargetLabel(target) {
  const coordinates = target.cells ? target.cells.map(cell => `(${cell.x}, ${cell.y})`).join('、')
    : target.x == null ? '' : `(${target.x}, ${target.y})`;
  return `场景 $${hex$3(target.scene_id)} ${coordinates} · ${target.label}`;
}

function controllersForTarget(sceneId, {object, point} = {}, project) {
  return controllerInstances(project).filter(instance => instance.switch?.targets?.some(target =>
    target.kind === 'scene-remap' && !object && !point
      ? [target.scene_id, target.target_scene_id].some(id => Number(id) === Number(sceneId))
      : Number(target.scene_id) === Number(sceneId) && (object
      ? target.scene_object === object
      : point && (target.cells || []).some(cell => cell.x === point[0] && cell.y === point[1]))));
}

function controllersForFlag(flagId, project) {
  return controllerInstances(project).filter(instance => [instance.switch?.event_flag_reference,
    instance.switch?.failure_flag_reference].filter(Boolean).some(reference =>
    controllerFlagId(reference) === Number(flagId)));
}

// @editor-module 潮汐字段对象的入口条件与地图格投影。

function worldTideTriggers(tide, sceneId) {
  const trigger = tide?.trigger;
  return trigger && Number(trigger.scene_id) === Number(sceneId)
    ? [{...trigger, id: 0, handle: WORLD_TIDE_HANDLE, event_flag: tide.event_flag}] : [];
}

function worldTideScenes(tide, lifecycle, sceneId) {
  const flag = `global-event-flag:${Number(tide?.event_flag).toString(16).toUpperCase().padStart(2, '0')}`;
  const row = lifecycle?.records?.find(record => record.kind === 'scene-remap'
    && record.global_event_flag_reference === flag
    && [record.source_scene_reference, record.target_scene_reference].includes(
      `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, '0')}`));
  if (!row) return [];
  return [['high', '涨潮', row.source_scene_reference], ['low', '退潮', row.target_scene_reference]]
    .map(([phase, label, handle]) => ({phase, label, handle,
      sceneId: Number.parseInt(handle.split(':')[1], 16)}));
}

function tideEntrance(object, tide) {
  return tide?.entrance && object?.kind === 'transition'
    && Number(object.sceneId) === Number(tide.entrance.scene_id)
    && object.key === tide.entrance.object;
}

function worldTideCells(raw, tide, phase) {
  if (!raw || !tide) return [];
  const record = tide.records.find(row => row.handle === WORLD_TIDE_HANDLE);
  return tide.blocks.flatMap(block => worldCoarsePatternCells(raw, block.x, block.y,
    record[phase === 'low' ? block.low_field : block.high_field]));
}

function worldTideCondition(tide, raw) {
  const trigger = tide.trigger;
  const direction = ['向上', '向下', '向左', '向右'][trigger.direction];
  const destination = tide.entrance.effective_destination_scene_id;
  return {
    label: '退潮时洞口出现并可进入；涨潮时被海水遮住且无法通行。',
    flags: [tide.event_flag],
    flag_labels: {[tide.event_flag]: '潮汐事件位'},
    persistence: tide.persistent ? '置位为退潮，清位为涨潮，随存档保存。' : '',
    triggers: [{flag: tide.event_flag, reference: WORLD_TIDE_HANDLE,
      label: `${direction}走到世界地图 (${trigger.x},${trigger.y})，每次翻转涨退潮`,
      scene_id: trigger.scene_id, object: 'tide:0', point: [trigger.x, trigger.y]}],
    states: [
      {id: 'before', label: '涨潮', cells: worldTideCells(raw, tide, 'high')},
      {id: 'after', label: '退潮', cells: worldTideCells(raw, tide, 'low')},
    ],
    note: '地形配置影响切换时的地图；重新进场的退潮地形由进场替换表决定。',
    destination: {label: `退潮进场：入口目标 $C6 由同一事件位选择场景 $${
      Number(destination).toString(16).toUpperCase().padStart(2, '0')}`,
      scene_id: destination},
  };
}

// @editor-module 条件入口的语义状态与事件位引用。

function conditionalSceneRecord(object, context) {
  if (object?.kind === 'actor') {
    const condition = storyActorCondition(object.record, context.autonomous, context.project?.story,
      context.project?.scenes?.actors);
    return condition ? {key: object.key, appearance_condition: condition} : null;
  }
  if (object?.kind === 'transition') return {
    ...conditionalEntranceRecord(object.record, context), key: object.key,
  };
  const gate = hiddenTeleportGate(context.project);
  if (!gate || Number(context.sceneId) !== gate.scene_id) return null;
  const point = object ? [object.record.x, object.record.y] : context.point;
  return !point || gate.appearance_condition.states[1].cells.some(cell =>
    cell.x === point[0] && cell.y === point[1]) ? gate : null;
}

function conditionalEntranceRecord(record, context) {
  if (record?.appearance_condition) return record;
  if (tideEntrance({kind: 'transition', sceneId: context.sceneId,
    key: `transition:${record.id}`}, context.worldTide)) {
    const condition = worldTideCondition(context.worldTide, context.worldRaw);
    return {...record, appearance_condition: {...condition,
      destination: Number(record.destination_scene_id) === 0xc6 ? condition.destination : null}};
  }
  const investigation = context.sceneLogic?.layers?.metatile_investigation_points?.find(row =>
    Number(row.behavior_code) === 0x54 && row.x === record.x && row.y === record.y);
  if (!investigation) return record;
  const action = sceneTileAction({kind: 'investigation-tile', record: investigation}, context);
  if (!action) return record;
  return {...record, appearance_condition: {
    label: '调查当前地图格后出现入口', flags: [],
    persistence: action.persistence.label,
    triggers: [{label: '调查机关', scene_id: context.sceneId,
      object: `investigation-tile:${investigation.id}`}],
    states: [
      {id: 'before', label: '调查前', cells: []},
      {id: 'after', label: '调查后', cells: [{x: record.x, y: record.y,
        metatile_id: action.replacement_metatile}]},
    ],
  }};
}
function conditionalEntranceState(record, preview) {
  const condition = record?.appearance_condition;
  if (!condition) return null;
  return condition.states.find(row => row.id === preview?.stateId) || condition.states[0];
}

function conditionalEntranceCells(record, preview) {
  return conditionalEntranceState(record, preview)?.cells || [];
}

function conditionalEntrancesForFlag(flagId, logicIndex, tide, project) {
  const records = (logicIndex?.point_transitions || []).filter(record =>
    record.appearance_condition?.flags.includes(Number(flagId)));
  if (tide && Number(flagId) === tide.event_flag) {
    records.push({...tide.entrance, id: Number(tide.entrance.object.split(':')[1]),
      appearance_condition: worldTideCondition(tide)});
  }
  const gate = hiddenTeleportGate(project);
  if (gate?.appearance_condition.flags.includes(Number(flagId))) records.push(gate);
  return records;
}

// @editor-module 场景角色的服务参数按设施配置选择器解析。

function shopConfigurationForActor(actor, pointerEntries) {
  const command = Number(actor?.text_region);
  const argument = Number(actor?.interaction_or_record_id);
  if (!Number.isInteger(command) || !Number.isInteger(argument)
      || !SCENE_SERVICE_INSTANCE_COUNTS.has(command)) return null;
  const familyId = command - 0x10;
  const family = pointerEntries.find(entry => Number(entry.family_id) === familyId);
  if (family?.records?.length !== SCENE_SERVICE_INSTANCE_COUNTS.get(command)) return null;
  const record = family?.records?.find(item => Number(item.id) === argument);
  return record ? {familyId, recordId: argument, family, record} : null;
}

// @editor-module 存档事件位的已发布读写引用投影。

const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
let catalog = [];
let unresolvedRomCalls = [];

function eventFlagReferenceCatalog() { return {rows: catalog, unresolvedRomCalls}; }

function collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps}) {
  const rows = globalEventFlagEntries().map(row => ({...row, writes: [], reads: []}));
  const seen = new Set();
  const add = (flag, access, source, href, operation, evidence = null) => {
    const row = globalEventFlagEntry(flag);
    if (!row || !href) return;
    const key = JSON.stringify([row.id, access, source, operation, evidence]);
    if (seen.has(key)) return;
    seen.add(key);
    const location = typeof href === 'string' ? {href} : href;
    rows[row.id][access === 'write' ? 'writes' : 'reads'].push({source, ...location, operation, evidence});
  };
  const sceneHref = (id, object = '', point = {}) => {
    const scene = (scenes?.editable_scenes || []).find(row => Number(row.id) === Number(id));
    return scene ? {href: `?view=scenes&scene=${scene.slug}&sceneMode=logic${object ? `&sceneObject=${object}` : ''}`,
      scenePosition: {sceneId: Number(scene.id), sceneObject: object,
        x: point.x ?? point.trigger_x ?? null, y: point.y ?? point.trigger_y ?? null}} : null;
  };
  for (const kind of ['autonomous', 'interaction']) for (const script of story?.[kind]?.entries || []) {
    for (const ref of script.state_references || []) add(ref.flag_id,
      ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      `story-${kind}-script:script:${hex$2(script.id)}`,
      `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}`,
      ref.operation, ref.source_prg_offset);
  }
  for (const actor of story?.npc_catalog?.records || []) for (const ref of actor.state_references || []) {
    add(ref.flag_id, ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      actor.uid || `scene-actor:${hex$2(actor.entry_id)}:${hex$2(actor.record_id)}`,
      sceneHref(actor.entry_id, `actor:${actor.record_id}`,
        actors.records.find(row => row.uid === actor.uid)), ref.operation, ref.source_prg_offset);
  }
  for (const row of story?.world_event_triggers?.entries || []) {
    const href = sceneHref(row.scene_id, `event:${row.id}`, row);
    add(row.event_flag, 'read', `world-event:${hex$2(row.id)}`, href, '触发检查');
    if (Number(row.event_flag) !== 0 && row.classification === 'coordinate-triggered-encounter')
      add(row.event_flag, 'write', `world-event:${hex$2(row.id)}`, href, '胜利置位');
  }
  for (const writer of story?.browser_vm?.wait_state_model?.external_writers || []) {
    if (writer.confirmation === 'confirmed') add(writer.flag_id, 'write', writer.label, writer.href, '置位', writer.evidence);
  }
  const control = story?.browser_vm?.control_state_model;
  for (const flag of control?.scene_reload_cleared_event_flags || []) add(flag, 'write', '场景初始化',
    `?view=bytemap-prg&romOffset=${control.scene_initializer_prg}`, '清零', control.scene_initializer_prg);
  for (const variant of story?.browser_vm?.variants || []) {
    if (variant.selection?.event_flag === undefined) continue;
    add(variant.selection.event_flag, 'read', `scene-actor-list:${hex$2(variant.id)}`,
      sceneHref(variant.selection.scene_id ?? variant.scene_id, `variant-${variant.id}-actor:0`,
        actors.records.find(row => Number(row.entry_id) === Number(variant.id) && Number(row.id) === 0)), '角色表选择');
  }
  for (const event of story?.browser_vm?.entry_events || []) {
    const view = storyViewForSequenceId(event.sequence_id);
    if (!view) continue;
    const href = `?view=${view}`;
    for (const flag of event.completion_flags || []) add(flag, 'read', event.sequence_id, href, '完成状态');
    if (event.entry_music) add(event.entry_music.flag_id, 'read', event.sequence_id, href, '入口音乐');
  }
  for (const sequence of story?.browser_vm?.sequences || []) {
    const view = storyViewForSequenceId(sequence.id);
    if (!view || !sequence.ending_animation) continue;
    for (const stage of sequence.ending_animation.timeline || []) if (stage.conditional)
      add(stage.event_flag, 'read', sequence.id, `?view=${view}`, '结局分支');
    const flag = sequence.ending_animation.audio?.event_flag;
    if (Number.isInteger(flag)) add(flag, 'read', sequence.id, `?view=${view}`, '结局音乐');
  }
  for (const row of lifecycle?.records || []) add(row.global_event_flag_reference, 'read', row.handle,
    sceneHref(Number.parseInt((row.scene_reference || row.source_scene_reference).split(':')[1], 16),
      `scene-state:${row.handle}`),
    row.kind === 'conditional-audio' ? '入口音乐' : '场景重映射');
  for (const scene of maps) for (const [index, group] of (scene.event_metatile_replacements || []).entries()) {
    add(group.event_flag, 'read', `scene:${hex$2(scene.id)}:event-map:${hex$2(index)}`,
      sceneHref(scene.id, `map-rewrite:scene:${hex$2(scene.id)}:event-map:${hex$2(index)}`), '地图改写');
  }
  for (const family of facilities?.configuration_loader?.pointer_entries || []) {
    for (const good of family.value_namespace?.goods || []) {
      if (!good.event_flag_reference) continue;
      for (const ref of family.value_namespace.event_flag_accesses || []) add(good.event_flag_reference,
        ref.access, good.resource_uid,
        `?view=shops&shopFamily=${family.family_id}&shopTab=catalog&record=${good.resource_uid}`,
        ref.operation, ref.script_prg);
    }
  }
  for (const transition of logic?.point_transitions || []) for (const flag of transition.appearance_condition?.flags || [])
    add(flag, 'read', `transition:${hex$2(transition.scene_id)}:${hex$2(transition.id)}`,
      sceneHref(transition.scene_id, `transition:${transition.id}`, transition), '入口条件');
  for (const facility of facilities?.facilities || []) {
    for (const instance of facility.instances || []) {
      const control = instance.switch;
      if (!control) continue;
      const href = sceneHref(instance.scene_id, `investigation:${instance.point_id}`, instance);
      add(control.event_flag_reference, 'read', instance.scene_object_uid, href, '开关状态');
      add(control.event_flag_reference, 'write', instance.scene_object_uid, href, control.password_required ? '密码正确置位' : '置位／清零');
      if (control.failure_flag_reference) add(control.failure_flag_reference, 'write', instance.scene_object_uid,
        href, '密码错误置位');
    }
    if (facility.id === 'teleport-terminal') for (const destination of facility.configuration?.destinations || []) {
      add(destination.availability_flag, 'read', `传送地点 ${destination.id}`, '?view=teleport&facilityTab=config', '可用状态');
    }
  }
  if (hidden) {
    const href = '?view=teleport&facilityTab=config#hidden-teleport';
    for (const flag of hidden.trigger_flags || []) add(flag.id, 'read', 'ui-facility:hidden-teleport', href, `条件 ${flag.value}`);
    add(hidden.set_flag, 'write', 'ui-facility:hidden-teleport', href, '错误传送置位');
    add(hidden.gate.event_flag, 'read', 'ui-facility:hidden-teleport', sceneHref(hidden.gate.scene_id, '', hidden.gate), '大门条件');
  }
  for (const call of investigation?.reward_calls || []) {
    if (!call.acquisition_condition) continue;
    const flag = call.acquisition_condition.flag_reference;
    const href = '?view=interfaceui&interface=field-investigation';
    add(flag, 'read', `调查 · ${call.kind}`, href, '取得条件', call.handler_prg);
    add(flag, 'write', `调查 · ${call.kind}`, href, '取得置位', call.handler_prg);
    if (call.acquisition_condition.clear_on_successful_use) add(flag, 'write',
      call.acquisition_condition.clear_on_successful_use, '?view=items&resource=' + call.acquisition_condition.clear_on_successful_use,
      '使用后清零');
  }
  for (const row of encounters?.encounter_selector_to_global_event_flag || []) if (row.selector !== 0)
    add(row.global_event_flag_id, 'read', `encounter-event-flag-map:${hex$2(row.selector)}`,
      '?view=scenes', '遭遇禁用检查');
  for (const row of encounters?.battle_state_review?.wanted_targets || []) {
    const href = '?view=wanted';
    add(row.claim_flag, 'read', `通缉目标 ${row.target_id}`, href, '领赏检查');
    add(row.claim_flag, 'write', `通缉目标 ${row.target_id}`, href, '领取置位');
  }
  if (tide) {
    const href = sceneHref(tide.trigger?.scene_id, 'tide:0', tide.trigger);
    add(tide.event_flag, 'read', 'field-exploration-runtime:00', href, '潮汐地形');
    add(tide.event_flag, 'write', 'field-exploration-runtime:00', href, '潮汐切换');
  }
  for (const ref of rom) add(ref.flag, ref.access, ref.source, ref.href, ref.operation, ref.evidence);
  return rows;
}

async function romReferences() {
  const [symbols, xrefs, index] = await Promise.all([
    db.getPackageDocument('analysis/disassembly/symbols.json'),
    db.getPackageDocument('analysis/disassembly/xrefs.json'), loadByteMapIndex(),
  ]);
  const helpers = new Map(['SetGlobalEventFlag', 'ClearGlobalEventFlag', 'TestGlobalEventFlag'].map(name => {
    const symbol = symbols.symbols.find(row => row.name === name);
    return [symbol?.prg_offset, {name, access: name === 'TestGlobalEventFlag' ? 'read' : 'write'}];
  }));
  const calls = [...new Map(xrefs.xrefs.filter(row => ['call', 'jump'].includes(row.kind) && helpers.has(row.to_prg))
    .map(row => [`${row.from_prg}:${row.to_prg}`, row])).values()];
  const banks = [...new Set(calls.map(row => Math.floor(row.from_prg / 0x2000)))];
  const shards = await Promise.all(banks.map(bank => loadByteMapBank(index, index.bank_shards.prg[bank])));
  const instructions = new Map(shards.flatMap(shard => shard.disassembly.instructions).map(row => [row.prg_offset, row]));
  const results = [], unresolved = [];
  for (const call of calls) {
    const helper = helpers.get(call.to_prg);
    const previous = instructions.get(call.from_prg - 2);
    const incoming = xrefs.xrefs.some(row => row.to_prg === call.from_prg && ['call', 'jump', 'branch'].includes(row.kind));
    const match = !incoming && previous?.mnemonic === 'LDA' && previous.addressing_mode === 'Imm'
      ? /^#\$([0-9A-F]{2})$/u.exec(previous.operand) : null;
    const instruction = instructions.get(call.from_prg);
    const record = {access: helper.access, source: instruction?.function || helper.name,
      href: `?view=bytemap-prg&romOffset=${call.from_prg}`, operation: helper.name,
      evidence: call.from_prg};
    if (match) results.push({...record, flag: Number.parseInt(match[1], 16)});
    else unresolved.push(record);
  }
  unresolvedRomCalls = unresolved;
  return results;
}

async function prepareEventFlagReferences() {
  const [story, facilities, logic, scenes, lifecycle, encounters, investigation, tide, hidden, rom, actors] = await Promise.all([
    db.getDocument('project.story'), db.getDocument('project.facilities'),
    db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('field-scene-lifecycle-service'), db.getResourceDocument('encounter-event-flag-map'),
    db.getResourceDocument('nearby-object-investigation-service'), db.getResourceDocument('field-exploration-runtime'),
    db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID), romReferences(), db.getDocument('scene-actor'), prepareGlobalEventFlags(),
  ]);
  const maps = [];
  const sceneEntries = scenes.editable_scenes;
  for (let start = 0; start < sceneEntries.length; start += 12) {
    maps.push(...await Promise.all(sceneEntries.slice(start, start + 12).map(async row =>
      (await db.getResourceDocument(`scene:${hex$2(row.id)}`)).scene)));
  }
  catalog = collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps});
}

// @editor-module 调查物取得位的已发布读写引用投影。

function treasureFlagReferences(index, project) {
  const scenes = new Map((project?.scenes?.editable_scenes || [])
    .map(scene => [Number(scene.id), scene]));
  const writes = [], reads = [];
  const effects = new Map([
    ['spawn-or-materialize-uncollected-metatile', '未取得图块生成'],
    ['collected-metatile-selection', '取得后图块选择'],
  ]);
  for (const row of project?.scenes?.logic?.treasures || []) {
    const model = row.interaction_state;
    const scene = scenes.get(Number(row.scene_id));
    if (!scene || model?.class !== 'treasure-collected-flag' || Number(model.flag_id) !== Number(index)) continue;
    const reference = {source: `treasure:${Number(row.scene_id).toString(16).toUpperCase().padStart(2, '0')}:${
      Number(row.id).toString(16).toUpperCase().padStart(2, '0')} · ${scene.name} · ${row.x}, ${row.y}`,
      href: `?view=scenes&scene=${scene.slug}&sceneObject=treasure:${row.id}`,
      scenePosition: {sceneId: Number(scene.id), x: row.x, y: row.y, sceneObject: `treasure:${row.id}`},
      evidence: model.commit};
    if (model.commit === 'immediate-after-successful-acquisition')
      writes.push({...reference, operation: '取得成功置位'});
    if (Number.isInteger(model.test_helper_cpu)) reads.push({...reference, operation: '取得状态检查'});
    for (const effect of model.effects || []) {
      if (effects.has(effect)) reads.push({...reference, operation: effects.get(effect)});
    }
  }
  return {writes, reads};
}

// @editor-module 反查只回答当前详情中的字段对象被谁引用。

let currentOwner = null;

function ownerReferenceListMarkup(label, attributes = "") {
  return `<details data-owner-reference-list ${attributes}><summary>${esc(label)}</summary><div data-owner-reference-content></div></details>`;
}

function bindOwnerReferenceList(host, load, onLoaded = () => {}) {
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

function withCurrentOwnerRecord(record, project, render, {elevators = []} = {}) {
  const previous = currentOwner;
  currentOwner = {record, project, elevators};
  try { return render(); }
  finally { currentOwner = previous; }
}

function currentOwnerReferenceImpact() {
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

const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const destinationViews = new Set(['shops', 'interfaceui', 'jukebox', 'vending', 'frograce',
  'teleport', 'computercontroller', 'wanted', 'wanted-ui', 'actors', 'text', 'items',
  'equipment', 'battle-test', 'monster-formations', 'vehicles', 'scenes', 'audio', 'metatiles']);

function destinationMatchesPage(target, page) {
  const query = target.query;
  if (query.view !== page.view) return false;
  if (page.view === 'monster-formations' && page.resourceId?.startsWith('encounter-formation:'))
    return query.resource === page.resourceId;
  if (query.resource && query.resource === page.resourceId
      && ['battle-test', 'items', 'equipment'].includes(page.view)) return true;
  if (query.view === 'interfaceui') return query.interface === page.interfacePage
    && (query.interface !== 'interaction-service' || !query.resource
      || query.resource === page.resourceId && (query.record == null || Number(query.record) === Number(page.recordId ?? 0)));
  if (query.view === 'shops') return Number(query.shopFamily) === Number(page.shopFamily)
    && (query.shopTab === 'buyer' ? page.shopTab === 'buyer' : page.shopTab !== 'buyer')
    && (query.shopConfig == null || Number(query.shopConfig) === Number(page.shopPreviewRecord));
  if (query.view === 'wanted' || query.view === 'wanted-ui')
    return String(query.wantedTarget ?? 'default') === String(page.wantedTargetIndex)
      && String(query.wantedSide ?? 'high') === String(page.wantedTargetSide);
  if (query.view === 'scenes') return query.scene ? query.scene === page.sceneSlug
    : !page.sceneSlug;
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
  if (page.view === 'scenes' && !page.sceneSlug) return [];
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
      ...(sequence.interaction_trigger ? [`scene-actor:${hex$1(sequence.entry_variant_id)}:${hex$1(sequence.interaction_trigger.actor_record_id)}`] : []),
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
      const handle = `scene:${hex$1(scene.id)}`;
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

function supportsSceneDestinationPage(view) {
  return destinationViews.has(view) || storyPlaybackView(view);
}

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

// @editor-module 战斗结果沿稳定画面推进，提交后恢复原调用现场。

const BATTLE_RESULT_EVIDENCE = 'project/evidence/reverse-engineering/battle-result-settlement/observations.json';
const nodeId = phase => `battle-results.${phase}`;

function battleResultCompletionConfirmed(completion, fields, slot, applied = [], scene) {
  const prefix = `save.slot.${slot}.`;
  const invocation = completion?.invocation;
  const expected = {...invocation?.sourceFields, ...Object.fromEntries(applied.map(effect => [effect.field, effect.value]))};
  return completion?.confirmed === true && ['victory', 'defeat'].includes(completion.outcome)
    && (!invocation || invocation.saveSlot === slot && invocation.sourceFields
      && (invocation.sceneId === undefined || invocation.sourceFields[`${prefix}scene_id`] === invocation.sceneId)
      && (invocation.sceneId === undefined || completion.sceneReturn?.context?.sceneId === invocation.sceneId)
      && (scene?.sceneId === undefined || invocation.sceneId === undefined || scene.sceneId === invocation.sceneId)
      && Object.entries(expected).every(([field, value]) =>
        field.startsWith(prefix) && Object.hasOwn(fields, field) && JSON.stringify(fields[field]) === JSON.stringify(value)))
    && completion.sceneReturn?.context && ['resume', 'reload'].includes(completion.sceneReturn.mode)
    && completion.rewards?.status === 'available'
    && Array.isArray(completion.effects) && Array.isArray(completion.eventFlags)
    && completion.eventFlags.every(flag => Number.isInteger(flag) && flag >= 0 && flag <= 255)
    && completion.effects.every(effect => typeof effect?.field === 'string'
      && effect.field.startsWith(prefix) && Object.hasOwn(fields, effect.field) && effect.value !== undefined)
    && (!completion.stages || ['entry', 'rewards', 'drop'].every(phase => Array.isArray(completion.stages[phase])
      && completion.stages[phase].every(effect => completion.effects.some(row => row.field === effect.field
        && JSON.stringify(row.value) === JSON.stringify(effect.value)))));
}

/** 调用者只接收同一存档组已有字段的完整效果。 */
function applyBattleResultEffects(state, completion) {
  if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
      state.execution?.appliedEffects, state.context.scene)) return false;
  for (const effect of completion.effects) state.fields[effect.field] = structuredClone(effect.value);
  state.fields.eventFlags = [...new Set([...(state.fields.eventFlags || []), ...completion.eventFlags])];
  state.context.scene = {...state.context.scene, ...completion.sceneReturn.context};
  state.context.storyState = completion.sceneReturn.context.storyState;
  state.domainResults.sceneReturn = structuredClone(completion.sceneReturn);
  return true;
}

function battleResultGraph(previews = []) {
  const nodes = [['victory', '胜利'], ['defeat', '失败'], ['rewards', '经验 / 金钱'],
    ['drop', '掉落'], ['story-commit', '剧情状态提交']].map(([phase, label]) => ({id: nodeId(phase), phase, label,
      publishedPreview: previews.find(row => row.id === `constructor:battle-result-${phase}`),
      role: phase === 'story-commit' ? 'action' : 'screen'}));
  const routes = [['victory', 'rewards', '有击破经验'], ['victory', 'story-commit', '没有击破经验'],
    ['defeat', 'story-commit', '败北恢复'], ['rewards', 'rewards', '确认经验值后显示金钱'],
    ['rewards', 'drop', '奖励确认结束且触发掉落'],
    ['rewards', 'story-commit', '奖励确认结束且未触发掉落'], ['drop', 'story-commit', '提交已确认部分'],
    ['story-commit', null, '返回调用者']].map(([from, to, condition], index) => ({id: `battle-result:${index}`,
      from: nodeId(from), to: to ? nodeId(to) : null, input: from === 'story-commit' || condition === '没有击破经验' ? '自然返回' : 'A / B',
      condition, evidence: BATTLE_RESULT_EVIDENCE}));
  return {nodes, transitions: routes, edges: routes.map(row => ({...row, routes: [row]})), entry: nodeId('victory')};
}

/** 返回效果只写本次预览字段；未知胜负保留完整调用栈。 */
function battleResultExecution(completion) {
  completion = structuredClone(completion);
  const stages = completion?.stages || {entry: [], rewards: completion?.effects || [], drop: []};
  const apply = (state, phase) => {
    for (const effect of stages[phase]) {
      state.fields[effect.field] = structuredClone(effect.value);
      state.execution.appliedEffects.push(structuredClone(effect));
    }
  };
  const pause = (state, phase) => {
    state.node = nodeId(phase); state.pause = {kind: 'confirm', evidence: BATTLE_RESULT_EVIDENCE};
    state.windows = [{id: 'battle-result', phase}];
    return state;
  };
  const complete = state => {
    if (!applyBattleResultEffects(state, completion)) {
      state.execution.status = 'unknown'; state.execution.reason = '战斗返回字段与调用现场不一致；未提交结果';
      return state;
    }
    state.node = nodeId('story-commit'); state.pause = null; state.windows = [];
    state.returnStack.pop(); state.execution.status = 'returned';
    state.execution.reason = completion.sceneReturn.handoff ? '已交接败北剧情' : '已返回调用者';
    return state;
  };
  return {
    initial({fields = {}, context = {}, returnStack = []} = {}) {
      const valid = battleResultCompletionConfirmed(completion, fields, context.slot, [], context.scene);
      const state = interfacePreviewState({fields, context, returnStack,
        domainResults: {battleResult: completion}, execution: {status: valid ? 'waiting' : 'unknown', trace: [], appliedEffects: [],
          reason: valid ? '' : [...(completion?.missing || []), '战斗完成效果未确认；未提交结果'].join('；')}});
      if (valid) apply(state, 'entry');
      if (valid && completion.outcome === 'victory' && !completion.rewards.experience) return complete(state);
      return pause(state, completion?.outcome === 'defeat' ? 'defeat' : 'victory');
    },
    advance(state, input) {
      if (state.execution.status !== 'waiting' || !['a', 'b'].includes(input.type)) return state;
      if (!battleResultCompletionConfirmed(completion, state.fields, state.context.slot,
          state.execution.appliedEffects, state.context.scene)) {
        state.execution.status = 'unknown'; state.execution.reason = '战斗结果与本次调用字段不一致；未继续提交';
        return state;
      }
      const phase = state.node.split('.').at(-1);
      state.execution.trace.push({node: state.node, input: input.type, evidence: BATTLE_RESULT_EVIDENCE});
      if (phase === 'victory' && completion.rewards.experience) {
        state.selections.reward = 'experience'; return pause(state, 'rewards');
      }
      if (phase === 'rewards') {
        if (state.selections.reward === 'experience' && completion.rewards.gold) {
          state.selections.reward = 'gold'; return pause(state, 'rewards');
        }
        apply(state, 'rewards'); apply(state, 'drop');
        if (completion.drop) return pause(state, 'drop');
      }
      return complete(state);
    },
  };
}

export { actorInteractionMode, applicationDestination, applyBattleResultEffects, battleResultExecution, battleResultGraph, bindOwnerReferenceList, bindSceneDestinationUsers, conditionalEntranceCells, conditionalEntranceRecord, conditionalEntranceState, conditionalSceneRecord, consolidateSceneDestinationLinks, controllerAt, controllerFlagId, controllerHref, controllerSceneHref, controllerTargetLabel, currentOwnerReferenceImpact, enumerateSceneInteractionObjects, ownerReferenceListMarkup, prepareEventFlagReferences, renderSceneDestinationLinks, sceneBgmItemsForProject, sceneConfigurationStays, sceneDestinationUsersMarkup, sceneEntryMusicCommand, sceneEntryStoryItemsForProject, sceneInteractionDestinations, sceneOwnedInteractionConfigurations, sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins, shopConfigurationForActor, withCurrentOwnerRecord, worldTideScenes, worldTideTriggers };
