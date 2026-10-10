import { serviceFamilyPage, itemPageRoute, SHOP_ITEM_BUYER_ROUTE, SHOP_PAGES, INTERFACE_PAGE_DEFINITIONS } from './editor-renderer-n2nBwXk_.js';
import { storyViewForSequenceId, storyPlaybackView } from './baseline-assembly-DW8BWbDB.js';
import { sceneDefaultMusicCommand, TILE_ACTION_HANDLE, sceneMetatileAttributeRecords, sceneInteractionBoundObject, STORY_DIALOGUE_OPERATIONS, sceneTreasureContent, WORLD_TIDE_HANDLE, worldCoarsePatternCells, hiddenTeleportGate, SCENE_SERVICE_INSTANCE_COUNTS, db, HIDDEN_TELEPORT_RESOURCE_ID, loadByteMapIndex, loadByteMapBank, battleModeForPendingEventFlag, hiddenTeleportDestination, hiddenTeleportFlags, selectionCursorCoordinates } from './prg-loaders-DnCSmXk9.js';
import { globalEventFlagHandle, prepareGlobalEventFlags, globalEventFlagEntries, globalEventFlagEntry, advanceGlobalRandom } from './global-random-DAuRNoyj.js';
import { metatileBehaviorLabel, metatileBehaviorCode } from './battle-result-script-runtime-BSeJpUGH.js';
import { sceneActorStateObjects, sceneRemapItems, storyActorCondition, storySceneActions, prepareStorySceneActions, esc, editorErrorMarkup, storiesForEventFlag, interfacePreviewState } from './interface-state-preview-Dlotqlmn.js';
import { uiTemplateBindings } from './page-runtime-paths-BvtuMnH7.js';

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

// @editor-module 自主脚本的轰炸范围、条件与 ROM 选点投影。

function bombardmentContains(region, x, y) {
  return x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
}

function effectPaths(actions, region) {
  const byCursor = new Map(actions.map(action => [action.cursor, action]));
  const queue = [{cursor: 0, set: [], clear: []}], seen = new Set(), paths = [];
  const point = {x: region.x + Math.floor(region.width / 2), y: region.y + Math.floor(region.height / 2)};
  const append = (path, cursor, set = path.set, clear = path.clear) => {
    if (!set.some(flag => clear.includes(flag))) queue.push({cursor: cursor & 255, set, clear});
  };
  for (let index = 0; index < queue.length && seen.size < 1024; index++) {
    const path = queue[index], key = JSON.stringify(path);
    if (seen.has(key)) continue;
    seen.add(key);
    const action = byCursor.get(path.cursor);
    if (!action) continue;
    const [a, b, c, d, e] = action.operands;
    const next = path.cursor + Number(action.command.normal_advance);
    if (action.operation === 'step-by-rom-direction-table') {paths.push({...path, effect: action}); continue;}
    if (action.operation === 'branch-on-player-position-rectangle') {
      append(path, point.x >= a && point.x < b && point.y >= c && point.y < d ? next : path.cursor + e);
    } else if (action.operation === 'branch-if-event-flag-clear') {
      append(path, next, [...new Set([...path.set, a])], path.clear);
      append(path, path.cursor + b, path.set, [...new Set([...path.clear, a])]);
    } else if (action.operation === 'relative-cursor-advance') append(path, path.cursor + a);
    else if (action.command.normal_advance > 0 && !action.command.terminal_side_effect) append(path, next);
  }
  return paths;
}

function sceneBombardments(actors, document, story) {
  return actors.flatMap(actor => {
    const actions = storySceneActions(actor, document, story);
    if (!actions.some(action => action.operation === 'step-by-rom-direction-table')) return [];
    return actions.filter(action => action.operation === 'branch-on-player-position-rectangle').flatMap(range => {
      const [x, endX, y, endY] = range.operands;
      const region = {x, y, width: endX - x, height: endY - y};
      if (!(region.width > 0 && region.height > 0)) return [];
      const paths = effectPaths(actions, region);
      if (!paths.length) return [];
      const effect = paths[0].effect;
      const visual = actions.find(action => action.cursor === effect.cursor + Number(effect.command.normal_advance)
        && action.operation === 'play-table-driven-actor-transformation');
      if (!visual) return [];
      const nextRange = actions.find(action => action.cursor > range.cursor
        && action.operation === 'branch-on-player-position-rectangle');
      const controls = actions.filter(action => action.cursor === range.cursor
        || action.cursor > range.cursor && action.cursor < (nextRange?.cursor ?? effect.cursor)
          && action.operation === 'branch-if-event-flag-clear' || action === visual);
      const handshake = actions.find(action => action.cursor > effect.cursor && action.operation === 'set-event-flag');
      const companion = actors.map(record => ({record, actions: storySceneActions(record, document, story)}))
        .find(row => row.actions[0]?.operation === 'wait-event-flag-set'
          && row.actions[0].operands[0] === handshake?.operands[0]
          && row.actions.some(action => action.operation === effect.operation));
      return [{key: `bombardment:${range.handle}:${range.cursor}`, handle: range.handle, actor,
        region, regions: [region], eventFlag: paths[0].clear[0], range, effect, visual, paths,
        flags: [...new Set(paths.flatMap(path => [...path.set, ...path.clear]))], controls, companion}];
    });
  });
}

// @editor-module 世界事件胜利位与场景地图改写的当前值投影。
const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

const worldEventHandle = id => `story.world-event:${hex$2(id)}`;

function worldEventSceneHref(record, scenes) {
  const scene = scenes.find(row => Number(row.id) === Number(record.scene_id));
  return scene ? `?view=scenes&scene=${encodeURIComponent(scene.slug)}&sceneMode=logic&sceneObject=event:${record.id}` : '';
}

function worldEventsForFlag(records, flag) {
  return records.filter(row => Number(row.event_flag) === Number(flag) && Number(flag) !== 0);
}

function worldEventMapEffects(flag, maps, scenes) {
  if (!Number(flag)) return [];
  return maps.flatMap(scene => (scene.event_metatile_replacements || []).flatMap((group, index) => {
    if (Number(group.event_flag) !== Number(flag)) return [];
    const entry = scenes.find(row => Number(row.id) === Number(scene.id));
    const handle = `scene:${hex$2(scene.id)}:event-map:${hex$2(index)}`;
    const coarse = group.coordinate_space === 'world-coarse-map';
    return [{handle, group, coarse, sceneId: Number(scene.id),
      cells: coarse && scene.eventMapWorldRaw ? group.replacements.flatMap(cell =>
        worldCoarsePatternCells(scene.eventMapWorldRaw, cell.x * 4, cell.y * 4, cell.metatile_id)) : group.replacements,
      cellCount: group.replacements.length * (coarse ? 16 : 1),
      href: entry ? `?view=scenes&scene=${encodeURIComponent(entry.slug)}&sceneMode=logic&sceneObject=map-rewrite:${handle}` : ''}];
  }));
}

async function loadEventMapScenes(database, scenes) {
  const maps = [];
  for (let start = 0; start < scenes.length; start += 12) {
    const batch = await Promise.all(scenes.slice(start, start + 12).map(row =>
      database.getResourceDocument(`scene:${hex$2(row.id)}`, null)));
    maps.push(...batch.filter(document => document?.scene?.event_metatile_replacements?.length)
      .map(document => ({...document.scene, eventMapWorldRaw: document.world_raw})));
  }
  return maps;
}

// @editor-module 存档事件位的已发布读写引用投影。

const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
let catalog = [];
let unresolvedRomCalls = [];

function eventFlagReferenceCatalog() { return {rows: catalog, unresolvedRomCalls}; }

function collectReferences({story, worldEvents, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps}) {
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
      `story-${kind}-script:script:${hex$1(script.id)}`,
      `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}`,
      ref.operation, ref.source_prg_offset);
  }
  for (const actor of story?.npc_catalog?.records || []) for (const ref of actor.state_references || []) {
    add(ref.flag_id, ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      actor.uid || `scene-actor:${hex$1(actor.entry_id)}:${hex$1(actor.record_id)}`,
      sceneHref(actor.entry_id, `actor:${actor.record_id}`,
        actors.records.find(row => row.uid === actor.uid)), ref.operation, ref.source_prg_offset);
  }
  for (const row of worldEvents?.records || []) {
    const href = sceneHref(row.scene_id, `event:${row.id}`, row);
    add(row.event_flag, 'read', `story.world-event:${hex$1(row.id)}`, href, '触发检查');
    if (Number(row.event_flag) !== 0)
      add(row.event_flag, 'write', `story.world-event:${hex$1(row.id)}`, href,
        battleModeForPendingEventFlag(row.event_flag)?.wantedDefeatLevel ? '胜利且金钱奖励非零时置位' : '胜利置位');
  }
  for (const writer of story?.browser_vm?.wait_state_model?.external_writers || []) {
    if (writer.confirmation === 'confirmed') add(writer.flag_id, 'write', writer.label, writer.href, '置位', writer.evidence);
  }
  const control = story?.browser_vm?.control_state_model;
  for (const flag of control?.scene_reload_cleared_event_flags || []) add(flag, 'write', '场景初始化',
    `?view=bytemap-prg&romOffset=${control.scene_initializer_prg}`, '清零', control.scene_initializer_prg);
  for (const variant of story?.browser_vm?.variants || []) {
    if (variant.selection?.event_flag === undefined) continue;
    add(variant.selection.event_flag, 'read', `scene-actor-list:${hex$1(variant.id)}`,
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
    const effect = worldEventMapEffects(group.event_flag, [scene], scenes.editable_scenes)
      .find(row => row.handle === `scene:${hex$1(scene.id)}:event-map:${hex$1(index)}`);
    add(group.event_flag, 'read', `scene:${hex$1(scene.id)}:event-map:${hex$1(index)}`,
      sceneHref(scene.id, `map-rewrite:scene:${hex$1(scene.id)}:event-map:${hex$1(index)}`),
      `${group.replacements.length * (group.coordinate_space === 'world-coarse-map' ? 16 : 1)} 格 → ${
        [...new Set((effect?.cells || group.replacements).map(cell => cell.metatile_id))].join('、')}`);
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
    add(flag, 'read', `transition:${hex$1(transition.scene_id)}:${hex$1(transition.id)}`,
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
    add(row.global_event_flag_id, 'read', `encounter-event-flag-map:${hex$1(row.selector)}`,
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
  const [story, facilities, logic, scenes, lifecycle, encounters, investigation, tide, hidden, rom, actors, , worldEvents] = await Promise.all([
    db.getDocument('project.story'), db.getDocument('project.facilities'),
    db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('field-scene-lifecycle-service'), db.getResourceDocument('encounter-event-flag-map'),
    db.getResourceDocument('nearby-object-investigation-service'), db.getResourceDocument('field-exploration-runtime'),
    db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID), romReferences(), db.getDocument('scene-actor'), prepareGlobalEventFlags(),
    db.getResourceDocument('world-event'),
  ]);
  const maps = await loadEventMapScenes(db, scenes.editable_scenes);
  catalog = collectReferences({story, worldEvents, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps});
  const worldActors = actors.records.filter(row => Number(row.entry_id) === 0);
  const autonomous = await prepareStorySceneActions(worldActors,
    await db.getResourceDocument('story-autonomous-script'), story, db);
  const world = scenes.editable_scenes.find(row => Number(row.id) === 0);
  for (const bomb of sceneBombardments(worldActors, autonomous, story)) for (const flag of bomb.flags) {
    catalog[flag].reads.push({source: `轰炸区域 (${bomb.region.x}, ${bomb.region.y})`,
      href: `?view=scenes&scene=${world.slug}&sceneMode=logic&sceneObject=${bomb.key}`,
      operation: bomb.flags.length > 1 ? '全部置位停止发起轰炸' : '置位停止发起轰炸'});
  }
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
  return `<details data-owner-reference-list data-collapse-key="owner-references:${esc(label)}" ${attributes}><summary>${esc(label)}</summary><div data-owner-reference-content></div></details>`;
}

function bindOwnerReferenceList(host, load, onLoaded = () => {}) {
  if (!host || host.dataset.ownerReferenceBound) return;
  host.dataset.ownerReferenceBound = "1";
  let pending = false;
  let loaded = false;
  const label = host.querySelector('summary').textContent;
  const populate = async () => {
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
  };
  host.addEventListener('toggle', populate);
  if (host.open) void populate();
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

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
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

function supportsSceneDestinationPage(view) {
  return destinationViews.has(view) || storyPlaybackView(view);
}

// @editor-module 显示现场的字节与向量在共享边界校验。
const byte$3 = value => Number.isInteger(value) && value >= 0 && value <= 255;
const validatedVectors = new WeakSet();
function requireFrameByte(state, key) {
  if (!byte$3(state[key])) throw new Error(key);
  return state[key];
}
function requireFrameVector(value, size, key) {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value)) || value.length !== size) throw new Error(key);
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) return value;
  if (validatedVectors.has(value)) return value;
  for (const item of value) if (!byte$3(item)) throw new Error(key);
  if (Object.isFrozen(value)) validatedVectors.add(value);
  return value;
}

function cloneFrameValue(value, seen = new Map()) {
  if (value === null || typeof value !== 'object')
    return ['function', 'symbol'].includes(typeof value) ? structuredClone(value) : value;
  if (seen.has(value)) return seen.get(value);
  if ((value instanceof Uint8Array || value instanceof Uint8ClampedArray) && value.buffer instanceof ArrayBuffer) {
    const result = value instanceof Uint8ClampedArray
      ? new Uint8ClampedArray(value) : new Uint8Array(value);
    seen.set(value, result); return result;
  }
  const array = Array.isArray(value);
  if (!array && Object.getPrototypeOf(value) !== Object.prototype) {
    const result = structuredClone(value); seen.set(value, result); return result;
  }
  const result = array ? value.slice() : {};
  seen.set(value, result);
  if (array) {
    if (validatedVectors.has(value)) return result;
    for (let index = 0; index < result.length; index++) {
      const type = typeof result[index];
      if (result[index] !== null && type === 'object' || type === 'function' || type === 'symbol')
        result[index] = cloneFrameValue(result[index], seen);
    }
  } else for (const key of Object.keys(value)) {
    const cloned = cloneFrameValue(value[key], seen);
    if (key === '__proto__') Object.defineProperty(result, key, {value: cloned, enumerable: true, writable: true, configurable: true});
    else result[key] = cloned;
  }
  return result;
}

function sameByteVector(left, right) {
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index]) return false;
  return true;
}

function sameFrameVector(left, right) {
  if (left === right) return true;
  if (left?.length !== right?.length) return false;
  if (left instanceof Uint8Array || left instanceof Uint8ClampedArray)
    return sameByteVector(left, right);
  if (!Array.isArray(left)) return left.every((value, index) => value === right[index]);
  for (let index = 0; index < left.length; index++)
    if (left[index] !== right[index] && index in left) return false;
  return true;
}

// @editor-module CHR 映射服务独占寄存器映射与图样地址解算。

function applyChrBankSet(state, banks, effects = []) {
  state.chr_banks = Array.from(requireFrameVector(banks, 6, 'chr-bank-set'), (bank, index) => index < 2 ? bank & 254 : bank);
  state.chr_mode = 1;
  effects.push({kind: 'chr-banks', banks: [...state.chr_banks], mode: 1});
}

function setChrBank(state, register, bank, effects = []) {
  requireFrameVector(state.chr_banks, 6, 'chr_banks');
  requireFrameByte({bank}, 'bank');
  if (!Number.isInteger(register) || register < 0 || register > 5) throw new Error('chr-register');
  state.chr_banks[register] = register < 2 ? bank & 254 : bank;
  state.chr_mode = 1;
  effects.push({kind: 'chr-bank', register, bank, mode: 1});
}

function chrMappedPages(state) {
  const banks = requireFrameVector(state.chr_banks, 6, 'chr_banks'), mode = requireFrameByte(state, 'chr_mode');
  if (mode > 1) throw new Error('chr_mode');
  const pages = [banks[0] & 254, banks[0] | 1, banks[1] & 254, banks[1] | 1, ...banks.slice(2)];
  return mode ? [...pages.slice(4), ...pages.slice(0, 4)] : pages;
}

function writeChrRam(state, address, value) {
  const bank = chrMappedPages(state)[address >> 10];
  if (bank === 8 || bank === 9)
    requireFrameVector(state.chr_ram, 2048, 'chr_ram')[(bank - 8) * 1024 + (address & 1023)] = value;
}

async function resolveChrPatternTable(state, readBank) {
  const result = new Uint8Array(8192);
  await Promise.all(chrMappedPages(state).map(async (bank, index) => {
    const bytes = bank === 8 || bank === 9
      ? requireFrameVector(state.chr_ram, 2048, 'chr_ram').slice((bank - 8) * 1024, (bank - 7) * 1024)
      : await readBank(bank);
    result.set(requireFrameVector(bytes, 1024, 'chr-bank-patterns'), index * 1024);
  }));
  return result;
}

// @editor-module 光栅服务按显示配置与当前现场执行所属 IRQ handler。

const unavailable$7 = missing => ({status: 'unavailable', missing});
function rasterTables(catalog) {
  if (catalog?.confirmation_status !== 'confirmed' || !catalog.raster) throw new Error('raster-sources');
  const tables = catalog.raster;
  for (const key of ['handler_indices', 'latches', 'chr_sets']) requireFrameVector(tables[key], 13, `raster.${key}`);
  if (!Array.isArray(tables.handlers) || tables.handlers.length !== 16
      || !tables.handlers.every(value => Number.isInteger(value) && value >= 0 && value <= 65535))
    throw new Error('raster.handlers');
  return tables;
}
function selectHandler(tables, state, selector, effects) {
  if (!Number.isInteger(selector) || selector < 0 || selector >= 16) throw new Error('raster-handler-domain');
  state.irq_handler_index = selector;
  state.irq_handler = tables.handlers[selector];
  effects.push({kind: 'irq-handler', selector, address: state.irq_handler});
}
function control(state, value, effects) {
  state.ppu_ctrl = state.raster_ctrl = value;
  effects.push({kind: 'ppu-control', value});
}
function latch(state, value, effects) {
  state.irq_latch = value;
  effects.push({kind: 'irq-latch', value});
}
function disable(state, effects) {
  state.irq_enabled = false;
  effects.push({kind: 'irq-enable', enabled: false});
}

function configureFrameRaster(catalog, state, effects) {
  const tables = rasterTables(catalog), profile = requireFrameByte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  control(state, requireFrameByte(state, 'ppu_ctrl_shadow'), effects);
  state.ppu_mask = requireFrameByte(state, 'ppu_mask_shadow');
  state.scroll_x = requireFrameByte(state, 'scroll_x_shadow');
  state.scroll_y = requireFrameByte(state, 'scroll_y_shadow');
  latch(state, tables.latches[profile] || requireFrameByte(state, 'dynamic_irq_latch'), effects);
  state.raster_phase = 0;
  delete state.ppu_address;
  selectHandler(tables, state, tables.handler_indices[profile], effects);
  state.irq_enabled = profile !== 0;
  state.raster_complete = false;
  if (profile && tables.chr_sets[profile]) {
    applyChrBankSet(state, requireFrameVector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
    control(state, state.ppu_ctrl ^ requireFrameByte(state, 'nametable_xor'), effects);
  }
  effects.push({kind: 'raster-setup', profile, irq_latch: state.irq_latch,
    irq_handler: state.irq_handler, irq_enabled: state.irq_enabled,
    ppu_ctrl: state.ppu_ctrl, ppu_mask: state.ppu_mask, scroll_x: state.scroll_x, scroll_y: state.scroll_y});
}

function runHandler(catalog, state, effects) {
  const tables = rasterTables(catalog), selector = requireFrameByte(state, 'irq_handler_index');
  if (selector >= 16 || state.irq_handler !== tables.handlers[selector]) throw new Error('raster-handler-binding');
  if (!requireFrameByte(state, 'display_profile')) {disable(state, effects); return;}
  state.irq_enabled = true;
  const primary = () => applyChrBankSet(state, requireFrameVector(state.primary_chr_banks, 6, 'primary_chr_banks'), effects);
  const raster = () => applyChrBankSet(state, requireFrameVector(state.raster_chr_banks, 6, 'raster_chr_banks'), effects);
  const toggle = () => control(state, requireFrameByte(state, 'ppu_ctrl_shadow') ^ requireFrameByte(state, 'nametable_page'), effects);
  const fixed = () => {
    setChrBank(state, 2, 0x34, effects);
    setChrBank(state, 4, 0x12, effects);
    setChrBank(state, 5, 0x13, effects);
  };
  switch (selector) {
    case 0:
      disable(state, effects); toggle(); primary(); break;
    case 1:
      latch(state, 0x30, effects); selectHandler(tables, state, 0, effects);
      applyChrBankSet(state, requireFrameVector(state.chr_shadow, 6, 'chr_shadow'), effects);
      control(state, requireFrameByte(state, 'ppu_ctrl_shadow'), effects); break;
    case 2: {
      state.raster_phase = (requireFrameByte(state, 'raster_phase') + 1) & 255;
      const phase = state.raster_phase;
      if (phase < 1 || phase > 3) throw new Error('raster-phase-domain');
      const bank = phase === 3 ? 0x24 : requireFrameVector(tables.stage_chr2, 3, 'raster.stage_chr2')[phase];
      setChrBank(state, 2, bank, effects); setChrBank(state, 3, (bank + 1) & 255, effects);
      latch(state, phase === 3 ? 0x19 : requireFrameVector(tables.stage_latches, 3, 'raster.stage_latches')[phase], effects);
      selectHandler(tables, state, phase === 3 ? 3 : 2, effects); break;
    }
    case 3:
      toggle(); setChrBank(state, 2, 8, effects); setChrBank(state, 3, 9, effects);
      latch(state, 0x0F, effects); selectHandler(tables, state, 4, effects); break;
    case 4:
      disable(state, effects); fixed(); break;
    case 5: {
      disable(state, effects); toggle();
      const banks = requireFrameVector(state.primary_chr_banks, 6, 'primary_chr_banks');
      setChrBank(state, 0, banks[0], effects); setChrBank(state, 1, banks[1], effects); fixed(); break;
    }
    case 6:
      disable(state, effects);
      if (!Number.isInteger(state.raster_address) || state.raster_address < 0 || state.raster_address > 65535)
        throw new Error('raster_address');
      state.ppu_address = state.raster_address & 0x3FFF;
      state.scroll_x = requireFrameByte(state, 'scroll_x_shadow'); state.scroll_y = requireFrameByte(state, 'scroll_y_shadow');
      effects.push({kind: 'ppu-scroll-restore', address: state.ppu_address,
        x: state.scroll_x, y: state.scroll_y});
      control(state, requireFrameByte(state, 'raster_restore_ctrl'), effects); primary(); break;
    case 7: case 12: case 13: break;
    case 8:
      latch(state, 0x34, effects); selectHandler(tables, state, 9, effects); primary(); break;
    case 9:
      disable(state, effects); raster(); break;
    case 10:
      disable(state, effects); control(state, requireFrameByte(state, 'ppu_ctrl_shadow') ^ 1, effects);
      state.ppu_mask = requireFrameByte(state, 'ppu_mask_shadow') & 0xEF;
      effects.push({kind: 'ppu-mask', value: state.ppu_mask}); break;
    case 11: case 14: case 15:
      selectHandler(tables, state, 0, effects);
      latch(state, (0x90 - requireFrameByte(state, 'dynamic_irq_latch')) & 255, effects);
      control(state, requireFrameByte(state, 'raster_ctrl') ^ 1, effects);
      if (selector !== 11) {
        for (let register = 2; register <= 4; register++) setChrBank(state, register, 0xA2 + register, effects);
        state.raster_transfer_count = 0;
      }
      break;
    default: throw new Error('raster-handler-domain');
  }
}

function commitRasterIrq(catalog, input) {
  const state = cloneFrameValue(input), effects = [];
  try {runHandler(catalog, state, effects);}
  catch (error) {return unavailable$7([error.message]);}
  return {status: 'available', state, effects};
}

const displayPhase = state => Object.fromEntries(['chr_banks', 'chr_mode', 'ppu_ctrl', 'ppu_mask',
  'scroll_x', 'scroll_y', 'ppu_address'].filter(key => state[key] !== undefined)
  .map(key => [key, cloneFrameValue(state[key])]));

function timedDisplayPhases(tables, before, after, selector, line) {
  const timing = tables.timing;
  const path = timing?.handlers?.find(row => row.selector === selector
    && row.phase === (selector === 2 ? after.raster_phase : 0));
  if (!path || timing.irq_entry_cycles !== 7 || timing.ppu_cycles_per_cpu !== 3
      || timing.irq_issue?.split_line_offset !== -2 || timing.irq_issue?.ppu_dot !== 261)
    throw new Error('raster-handler-timing');
  const display = displayPhase(before), phases = [];
  // $0000 背景与 $1000 精灵的 A12 上升位于第 261 dot，整行边界晚两行。
  const issue = (line + timing.irq_issue.split_line_offset) * 341 + timing.irq_issue.ppu_dot;
  const origin = issue + timing.irq_entry_cycles * timing.ppu_cycles_per_cpu;
  let previous = -1, latchTime;
  for (const event of path.events) {
    if (!Number.isInteger(event.cpu_cycle) || event.cpu_cycle <= previous) throw new Error('raster-handler-timing');
    previous = event.cpu_cycle;
    const time = origin + event.cpu_cycle * timing.ppu_cycles_per_cpu;
    if (event.kind === 'irq-latch') {latchTime = time; continue;}
    switch (event.kind) {
      case 'chr-bank':
        setChrBank(display, event.register, after.chr_banks[event.register]); break;
      case 'ppu-control': display.ppu_ctrl = after.ppu_ctrl; break;
      case 'ppu-mask': display.ppu_mask = after.ppu_mask; break;
      case 'ppu-address':
        display.ppu_address = after.ppu_address;
        display.scroll_origin_line = Math.floor(time / 341); break;
      case 'ppu-scroll-x': display.scroll_x = after.scroll_x; break;
      case 'ppu-scroll-y': display.scroll_y = after.scroll_y; break;
      default: throw new Error('raster-timing-event');
    }
    phases.push({line: Math.floor(time / 341), dot: ((time % 341) + 341) % 341, ...cloneFrameValue(display)});
  }
  return {phases, reloadPreviousLatch: latchTime !== undefined && latchTime >= issue + 341};
}

function completeRasterFrame(catalog, input) {
  const state = cloneFrameValue(input), effects = [], phases = [{line: 0, dot: 0, ...displayPhase(state)}];
  try {
    const tables = rasterTables(catalog);
    if (typeof state.irq_enabled !== 'boolean') throw new Error('irq_enabled');
    let line = requireFrameByte(state, 'irq_latch') + 1;
    if (!state.raster_complete && state.ppu_mask & 0x18) while (state.irq_enabled && line < 240) {
      const previousLatch = state.irq_latch;
      const selector = state.irq_handler_index;
      const before = displayPhase(state);
      const irq = commitRasterIrq(catalog, state);
      if (irq.status !== 'available') return irq;
      Object.assign(state, irq.state);
      effects.push({kind: 'raster-irq', line, effects: irq.effects});
      const timed = timedDisplayPhases(tables, before, state, selector, line);
      for (const phase of timed.phases) {
        if (phase.line < 0) Object.assign(phases[0], phase, {line: 0, dot: 0});
        else if (phase.line < 240) phases.push(phase);
      }
      // 长分支的 latch 写入晚于下一次 A12 上升，计数器已装入前一个 latch。
      line += (timed.reloadPreviousLatch ? previousLatch : requireFrameByte(state, 'irq_latch')) + 1;
    }
    state.raster_complete = true;
  } catch (error) {return unavailable$7([error.message]);}
  return {status: 'available', state, effects, frame: {phases}};
}

// @editor-module 共享 NMI 提交按当前工作区执行，帧屏障按显式调度续行。
const byte$2 = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte$1 = requireFrameByte, vector$2 = requireFrameVector;
const unavailable$6 = missing => ({status: 'unavailable', missing});

function writePpu(state, effects, address, value, targets) {
  if (!byte$2(value)) throw new Error("ppu-write-value");
  address &= 0x3FFF;
  effects.push({kind: 'ppu-write', address, value});
  if (address < 0x2000) {
    writeChrRam(state, address, value);
  } else if (address < 0x3F00) {
    const offset = (address - 0x2000) & 4095;
    const page = offset >> 10;
    if (!['horizontal', 'vertical'].includes(state.mirroring)) throw new Error('mirroring');
    const physicalPage = state.mirroring === 'vertical' ? page & 1 : page >> 1;
    const tables = targets.nametables ||= vector$2(state.nametables, 2048, 'nametables');
    tables[physicalPage * 1024 + (offset & 1023)] = value;
  } else {
    const palette = targets.palette ||= vector$2(state.ppu_palette, 32, 'ppu_palette');
    const index = address & 31;
    palette[index] = value & 63;
    if ((index & 3) === 0) palette[index ^ 16] = value & 63;
  }
}

function uploadGlyph(state, effects) {
  const targets = {};
  const glyph = state.glyph;
  if (!glyph || !byte$2(glyph.pending)) throw new Error('glyph.pending');
  if (glyph.pending !== 0) return;
  const first = requireByte$1(glyph, 'first_half');
  const second = requireByte$1(glyph, 'second_half');
  const tiles = vector$2(glyph.tiles, 4, 'glyph.tiles');
  const patterns = vector$2(glyph.patterns, 48, 'glyph.patterns');
  const plane = (tile, offset) => {
    const address = tile * 16;
    glyph.address_low = address & 255;
    glyph.address_high = address >> 8;
    for (let index = 0; index < 8; index++)
      writePpu(state, effects, address + index * (requireByte$1(state, 'ppu_ctrl') & 4 ? 32 : 1), patterns[offset + index], targets);
  };
  if (first !== 0) {
    applyChrBankSet(state, [...state.chr_banks.slice(0, 2), 8, 9, 10, 11], effects);
    plane(tiles[0], 0);
    plane(tiles[1], 8);
    plane(tiles[2], 16);
    plane(tiles[3], 24);
  } else if (second !== 0) {
    plane(tiles[2], 16);
    plane(tiles[3], 24);
    plane(tiles[0], 32);
    plane(tiles[1], 40);
  }
  glyph.pending = 255;
}

function flushQueues(state, effects) {
  const targets = {};
  const main = vector$2(state.main_queue, 352, 'main_queue');
  const increment = requireByte$1(state, 'ppu_ctrl') & 4 ? 32 : 1;
  const spans = requireByte$1(state, 'span_count');
  let cursor = 0;
  for (let span = 0; span < spans; span++) {
    const high = main[cursor]; cursor = (cursor + 1) & 255;
    const low = main[cursor]; cursor = (cursor + 1) & 255;
    const size = main[cursor];
    if (size) cursor = (cursor + 1) & 255;
    for (let index = 0; index < size; index++) {
      writePpu(state, effects, (high << 8 | low) + index * increment, main[cursor], targets);
      cursor = (cursor + 1) & 255;
    }
  }
  state.span_count = 0;
  const triples = (queue, length, offset = 0) => {
    if (!length) return;
    // 尾项允许超过声明长度，X 在递增至 255 时仍可退出。
    for (let index = 0; index < length; index += 3)
      writePpu(state, effects, queue[offset + index] << 8 | queue[offset + index + 1], queue[offset + index + 2], targets);
  };
  triples(main, requireByte$1(state, 'main_queue_length'));
  state.main_queue_length = 0;
  const size = requireByte$1(state, 'contiguous_length');
  if (size) {
    const address = requireByte$1(state, 'contiguous_high') << 8 | requireByte$1(state, 'contiguous_low');
    for (let index = 0; index < size; index++) writePpu(state, effects, address + index * increment, main[index], targets);
  }
  state.contiguous_length = 0;
  if (requireByte$1(state, 'palette_pending')) {
    const palette = vector$2(state.palette_shadow, 32, 'palette_shadow');
    for (let index = 0; index < 32; index++) writePpu(state, effects, 0x3F00 + index * increment, palette[index], targets);
  }
  state.palette_pending = 0;
  const secondary = requireByte$1(state, 'secondary_queue_length');
  if (secondary) triples(main, secondary, 96);
  state.secondary_queue_length = 0;
}

function commitFrameNmi(catalog, input, {advanceAudio} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    vector$2(state.chr_banks, 6, 'chr_banks');
    uploadGlyph(state, effects);
    const mode = requireByte$1(state, 'nmi_mode');
    if (mode & 128) return {status: 'available', state, effects};
    if (mode) {
      if (state.nmi_worker !== 'normal-display') return unavailable$6(['nmi-worker-semantics']);
      if (requireByte$1(state, 'oam_pending')) {
        state.oam = [...vector$2(state.oam_shadow, 256, 'oam_shadow')]
          .map((value, index) => (index & 3) === 2 ? value & 0xE3 : value);
        state.oam_pending = 0;
        effects.push({kind: 'oam-dma', page: 7});
      }
      flushQueues(state, effects);
      applyChrBankSet(state, vector$2(state.chr_shadow, 6, 'chr_shadow'), effects);
      configureFrameRaster(catalog, state, effects);
    }
    if (advanceAudio !== undefined) {
      if (typeof advanceAudio !== 'function') return unavailable$6(['audio-frame-service']);
      const audio = advanceAudio(cloneFrameValue(state));
      if (audio?.status === 'pending') return {status: 'pending', state, effects,
        continuation: {phase: 'nmi-audio'}};
      if (audio?.status !== 'available') return audio || unavailable$6(['audio-frame-service']);
      state = audio.state;
      effects.push(...(audio.effects || []));
    } else effects.push({kind: 'audio-frame'});
    commitNmiTail(state);
  } catch (error) { return unavailable$6([error.message]); }
  return {status: 'available', state, effects};
}

function commitNmiTail(state) {
  state.frame_counter = (requireByte$1(state, 'frame_counter') + 1) & 255;
  if (!requireByte$1(state, 'display_profile') && requireByte$1(state, 'brightness_countdown')) {
    state.brightness_countdown--;
    if (state.brightness_countdown & 1) {
      const palette = vector$2(state.palette_shadow, 32, 'palette_shadow');
      const queue = vector$2(state.main_queue, 352, 'main_queue');
      for (let index = 0; index < 16; index++) {
        const value = palette[index];
        const raised = ((value & 240) + 16) & 255;
        queue[index] = value === 15 ? 15 : raised === 64 ? 48 : raised;
      }
      state.contiguous_low = 0;
      state.contiguous_high = 63;
      state.contiguous_length = 16;
    } else state.palette_pending = (requireByte$1(state, 'palette_pending') + 1) & 255;
  }
}

function completeFrameNmiTail(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  const state = cloneFrameValue(input);
  try {commitNmiTail(state);}
  catch (error) {return unavailable$6([error.message]);}
  return {status: 'available', state, effects: []};
}

function advanceFrameBarrier(catalog, input, {advanceRandom, pollController, nmiEvents} = {}) {
  if (typeof advanceRandom !== 'function') return unavailable$6(['random-wait-schedule']);
  if (typeof pollController !== 'function') return unavailable$6(['controller-poll-effects']);
  if (!Array.isArray(nmiEvents)) return unavailable$6(['nmi-event-schedule']);
  let state = cloneFrameValue(input);
  const effects = [];
  try {
    const previous = requireByte$1(state, 'frame_counter');
    for (const event of nmiEvents) {
      const raster = completeRasterFrame(catalog, state);
      if (raster.status !== 'available') return raster;
      state = raster.state;
      effects.push(...raster.effects);
      const random = advanceRandom(state, event);
      if (random?.status !== 'available') return random || unavailable$6(['random-wait-schedule']);
      state = random.state;
      effects.push(...random.effects);
      const frame = commitFrameNmi(catalog, state);
      if (frame.status !== 'available') return frame;
      state = frame.state;
      effects.push(...frame.effects);
      if (state.frame_counter !== previous) {
        const polled = pollController(state);
        if (polled?.status !== 'available') return polled || unavailable$6(['controller-poll-effects']);
        return {status: 'available', state: polled.state, effects: [...effects, ...polled.effects]};
      }
    }
  } catch (error) { return unavailable$6([error.message]); }
  return {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
}

function commitPpuQueues(catalog, input) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$6(['frame-commit-sources']);
  const state = cloneFrameValue(input), effects = [];
  try { flushQueues(state, effects); }
  catch (error) { return unavailable$6([error.message]); }
  return {status: 'available', state, effects};
}

// @editor-module 已确认的音频空闲、淡出与持续音分支按当前工作区计算 CPU 耗时。

const unavailable$5 = missing => ({status: 'unavailable', missing});

function measureAudioFrameClock(input) {
  const state = cloneFrameValue(input), paths = [];
  let cycles = 0;
  const add = (kind, cost) => {cycles += cost; paths.push({kind, cycles: cost});};
  try {
    const requests = requireFrameVector(state.requests, 8, 'audio.requests');
    const fade = requireFrameByte(state, 'fade_interval');
    if (!fade) {
      state.fade_index = state.fade_amount = 0;
      add('fade-idle', 15);
    } else {
      state.fade_countdown = (requireFrameByte(state, 'fade_countdown') - 1) & 255;
      if (state.fade_countdown) add('fade-countdown', 15);
      else {
        const fadeCurve = requireFrameVector(state.fade_curve, 16, 'audio.fade_curve');
        const index = requireFrameByte(state, 'fade_index');
        if (index >= fadeCurve.length) return unavailable$5(['audio-fade-index-domain']);
        state.fade_countdown = fade;
        state.fade_amount = (requireFrameByte(state, 'fade_amount') + fadeCurve[index]) & 255;
        state.fade_index = (index + 1) & 255;
        if (state.fade_index === 16) {
          state.requests.fill(0);
          for (const key of ['duration', 'note_countdown', 'note_reload', 'channel_flags']) state[key].fill(0);
          for (const key of ['active_mask', 'effect_mask', 'tempo_low', 'tempo_high', 'tempo_pause',
            'fade_interval', 'fade_countdown', 'fade_index', 'fade_amount', 'dpcm_stop']) state[key] = 0;
          state.tempo_increment_low = state.tempo_increment_high = 255;
          add('fade-reset', 56 + 6 + 4014 + 2 + 4 + 4 + 4);
        } else add('fade-step', 57);
      }
    }
    let admission = 6;
    for (const [first, second] of [[0, 4], [1, 5]]) {
      admission += 8;
      if (!(requests[first] | requests[second])) {admission += 3; continue;}
      admission += 2 + 8;
      if (requests[first] !== requests[first + 2]) return unavailable$5(['audio-command-admission-clock']);
      admission += 2 + 8;
      if (requests[second] !== requests[second + 2]) return unavailable$5(['audio-command-admission-clock']);
      admission += 3;
    }
    add('command-check', 6 + admission);
    let sum = requireFrameByte(state, 'tempo_low') + requireFrameByte(state, 'tempo_increment_low') + 1;
    state.tempo_low = sum & 255;
    sum = requireFrameByte(state, 'tempo_high') + requireFrameByte(state, 'tempo_increment_high') + (sum >>> 8);
    state.tempo_high = sum & 255;
    state.tick = sum > 255 && !requireFrameByte(state, 'tempo_pause') ? 255 : 0;
    add('tempo', 6 + 28 + (sum <= 255 ? 3 : 2 + 4 + (state.tempo_pause ? 3 : 2 + 2 + 4)) + 6);
    const active = requireFrameByte(state, 'active_mask'), effects = requireFrameByte(state, 'effect_mask');
    const duration = requireFrameVector(state.duration, 4, 'audio.duration');
    const noteCountdown = requireFrameVector(state.note_countdown, 4, 'audio.note_countdown');
    const noteReload = requireFrameVector(state.note_reload, 4, 'audio.note_reload');
    const flags = requireFrameVector(state.channel_flags, 4, 'audio.channel_flags');
    add('channel-start', 2);
    for (let channel = 3; channel >= 0; channel--) {
      const mask = 1 << channel;
      let cost = 3 + 4;
      if (!active) {
        cost += 2 + 16 + 3;
        for (const index of [0, 2, 4, 6]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(active & mask)) cost += 3;
        else {
          cost += 2 + 4;
          if (!state.tick) cost += 3;
          else {
            cost += 2 + 7;
            noteCountdown[channel] = (noteCountdown[channel] - 1) & 255;
            if (!noteCountdown[channel]) return unavailable$5(['audio-note-decode-clock']);
            cost += 3;
          }
        }
      }
      cost += 4;
      if (!effects) {
        cost += 2 + 16 + 4;
        for (const index of [1, 3, 5, 7]) requests[index] = 0;
      } else {
        cost += 3 + 4;
        if (!(effects & mask)) cost += 4;
        else {
          cost += 2 + 4 + 2 + 5 + 7;
          flags[channel] |= 32;
          duration[channel] = (duration[channel] - 1) & 255;
          if (!duration[channel]) return unavailable$5(['audio-effect-restore-clock']);
          cost += 3;
          add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
          continue;
        }
      }
      cost += 4 + 4;
      if (!(active & mask)) cost += 3;
      else {
        cost += 2 + 4;
        if (!state.tick) cost += 3;
        else {
          cost += 2 + 4 + 4;
          if (noteCountdown[channel] === noteReload[channel]) return unavailable$5(['audio-note-output-clock']);
          cost += 3 + 6;
          if (!(flags[channel] & 32)) return unavailable$5(['audio-envelope-clock']);
          cost += 4 + 2 + 2 + 6;
        }
      }
      add(`channel-${channel}`, cost + 8 + (channel ? 2 + 3 : 3));
    }
    add('dpcm-tail', 4 + (requireFrameByte(state, 'dpcm_stop') ? 2 + 2 + 4 : 3) + 6);
    // D155 的 JSR、D362 的 bank 信封与 A006 trampoline 包住音频帧服务。
    add('nmi-audio-envelope', 65);
  } catch (error) {return unavailable$5([error.message]);}
  return {status: 'available', state, cycles, paths};
}

// @editor-module 普通 NMI 按当前显示与音频工作区计算耗时，不读取 ROM 或采集调用量。

const unavailable$4 = missing => ({status: 'unavailable', missing});
const pageCross = (low, index) => low + index > 255 ? 1 : 0;

function queueCycles(state) {
  const queue = requireFrameVector(state.main_queue, 352, 'main_queue');
  let cycles = 26, cursor = 0;
  const spans = requireFrameByte(state, 'span_count');
  cycles += 6;
  if (spans) {
    cycles += 5 + 2 + 6;
    for (let span = 0; span < spans; span++) {
      cycles += 4;
      cycles += 4 + 4 + pageCross(147, cursor); cursor = (cursor + 1) & 255;
      cycles += 2 + 4 + 4 + pageCross(147, cursor); cursor = (cursor + 1) & 255;
      cycles += 2 + 4 + 2 + pageCross(147, cursor);
      const size = queue[cursor];
      if (!size) cycles += 3;
      else {
        cycles += 2 + 2;
        cursor = (cursor + 1) & 255;
        for (let index = 0; index < size; index++) {
          cycles += 15 + pageCross(147, cursor);
          cursor = (cursor + 1) & 255;
        }
        cycles--;
      }
      cycles += 5 + (span + 1 === spans ? 2 : 3);
    }
  }
  for (const [key, low] of [['main_queue_length', 147], ['secondary_queue_length', 243]]) {
    const length = requireFrameByte(state, key);
    cycles += 6;
    if (!length) continue;
    cycles += 5 + 2 + 11;
    for (let index = 0; index < length; index += 3)
      cycles += 36 + pageCross(low, index) + pageCross(low + 1, index) + pageCross(low + 2, index);
    cycles--;
  }
  const contiguous = requireFrameByte(state, 'contiguous_length');
  cycles += 6;
  if (contiguous) {
    cycles += 5 + 19 + 9;
    for (let index = 0; index < contiguous; index++) cycles += 15 + pageCross(147, index);
    cycles--;
  }
  cycles += 6;
  if (requireFrameByte(state, 'palette_pending')) cycles += 5 + 516;
  return cycles;
}

function glyphCycles(state) {
  const glyph = state.glyph;
  if (requireFrameByte(glyph, 'pending')) return 26;
  const banks = requireFrameByte(state, 'prg_bank_8000') === 10 ? 26 : 92;
  const prelude = 70 + banks;
  if (requireFrameByte(glyph, 'first_half')) return prelude + 1135;
  if (requireFrameByte(glyph, 'second_half')) return prelude + 1043;
  return prelude + 26;
}

function rasterCycles(catalog, state) {
  const profile = requireFrameByte(state, 'display_profile');
  if (profile >= 13) throw new Error('display-profile-domain');
  const latches = requireFrameVector(catalog.raster?.latches, 13, 'raster.latches');
  const sets = requireFrameVector(catalog.raster?.chr_sets, 13, 'raster.chr_sets');
  let cycles = 139 + pageCross(249, profile);
  if (latches[profile]) cycles -= 2;
  if (profile) {
    cycles += 3 + 4;
    if (!sets[profile]) cycles += 3;
    else cycles += 2 + 6 + 147 + 3 + 3 + 4 + 3;
  }
  return cycles;
}

function tailCycles(state) {
  const profile = requireFrameByte(state, 'display_profile');
  if (profile) return 33;
  const countdown = requireFrameByte(state, 'brightness_countdown');
  if (!countdown) return 38;
  if (!((countdown - 1) & 1)) return 55;
  const palette = requireFrameVector(state.palette_shadow, 32, 'palette_shadow');
  let brightness = 2 + 21;
  for (const value of palette.slice(0, 16)) {
    if (value === 15) brightness += 23;
    else brightness += ((value & 240) + 16) === 64 ? 35 : 31;
  }
  return 59 + brightness - 1;
}

function measureFrameNmiClock(catalog, state, {cpuCycle = 0} = {}) {
  if (catalog?.confirmation_status !== 'confirmed') return unavailable$4(['frame-commit-sources']);
  const paths = [];
  let cycles = 0;
  const add = (kind, cost) => {paths.push({kind, start: cycles, cycles: cost}); cycles += cost;};
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0) throw new Error('cpu-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    add('glyph', glyphCycles(state));
    const mode = requireFrameByte(state, 'nmi_mode');
    if (mode & 128) {
      add('disabled-tail', 3 + 3 + 22);
      return {status: 'available', cycles, paths, changesFrameCounter: false};
    }
    add('dispatch', mode ? 16 : 8);
    if (mode) {
      if (state.nmi_worker !== 'normal-display') throw new Error('nmi-worker-clock');
      let prefix = 6;
      if (requireFrameByte(state, 'oam_pending')) {
        // DMA 在 $4014 写入后的下一个读取开始，奇数相位多一个对齐周期。
        const dmaCycle = cpuCycle + cycles + 3 + 2 + 2 + 3 + 4 + 2 + 4;
        prefix = 20 + 513 + ((dmaCycle + 1) & 1);
      }
      add('display', prefix + 6 + queueCycles(state) + 90);
      add('raster', 6 + rasterCycles(catalog, state) + 3);
    }
    const audio = measureAudioFrameClock(state.audio);
    if (audio.status !== 'available') return audio;
    add('audio', audio.cycles);
    add('tail', tailCycles(state));
    return {status: 'available', cycles, paths, changesFrameCounter: true, audio: audio.state};
  } catch (error) {return unavailable$4([error.message]);}
}

// @editor-module D01D 的随机等待按原生指令边界和普通 NMI 耗时推进。

const unavailable$3 = missing => ({status: 'unavailable', missing});
// 固定随机转换没有条件分支，保留边界只为确定中断接受位置。
const randomInstructionCycles = [3, 3, 3, 3, 2, 5, 2, 5, 3, 3, 2, 3, 3, 3, 2, 3, 6];

function nextNmiEdgeCycle(cpuCycle, phase) {
  if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0 || phase?.region !== 'ntsc'
      || !Number.isInteger(phase.scanline) || phase.scanline < -1 || phase.scanline > 260
      || !Number.isInteger(phase.dot) || phase.dot < 0 || phase.dot > 340)
    throw new TypeError('nmi-ppu-phase');
  const lines = 241 - phase.scanline + (phase.scanline >= 241 ? 262 : 0);
  let dots = lines * 341 + 1 - phase.dot;
  if (phase.scanline >= 241 || phase.scanline === -1 && phase.dot < 340) {
    if (!Number.isSafeInteger(phase.frame) || phase.frame < 0 || typeof phase.rendering !== 'boolean')
      throw new TypeError('nmi-ppu-frame-phase');
    if (phase.rendering && (phase.frame & 1)) dots--;
  }
  return cpuCycle + Math.ceil(dots / 3);
}

function advanceRandomWaitClock(catalog, state, {cpuCycle, nmiEdgeCycle} = {}) {
  try {
    if (!Number.isSafeInteger(cpuCycle) || cpuCycle < 0 || !Number.isSafeInteger(nmiEdgeCycle)
        || nmiEdgeCycle < cpuCycle || nmiEdgeCycle > cpuCycle + 30000)
      throw new Error('nmi-edge-cycle');
    if (state.dmc_active !== false) throw new Error('dmc-dma-clock');
    if (state.irq_enabled !== false || requireFrameByte(state, 'display_profile') !== 0)
      throw new Error('irq-acceptance-clock');
    let cycle = cpuCycle, counter = requireFrameByte(state, 'frame_counter'), snapshot;
    let random = {high: requireFrameByte(state.random, 'high'), low: requireFrameByte(state.random, 'low')};
    let calls = 0, nmi = null;
    const step = (cost, action) => {
      cycle += cost;
      action?.();
      // NMI 边沿在下一 CPU 周期进入待处理中断；接受发生在指令完成处。
      if (!nmi && cycle > nmiEdgeCycle) {
        cycle += 7;
        const clock = measureFrameNmiClock(catalog, state, {cpuCycle: cycle});
        if (clock.status !== 'available') throw new Error(clock.missing.join(','));
        nmi = {cpu_cycle: cycle, cycles: clock.cycles, paths: clock.paths, audio: clock.audio};
        cycle += clock.cycles;
        if (clock.changesFrameCounter) counter = (counter + 1) & 255;
      }
    };
    step(2); step(3); step(3, () => {snapshot = counter;});
    for (let iteration = 0; iteration < 512; iteration++) {
      step(6);
      calls++;
      for (const cost of randomInstructionCycles) step(cost);
      random = advanceGlobalRandom(random.high, random.low);
      let equal;
      step(3, () => {equal = counter === snapshot;});
      step(equal ? 3 : 2);
      if (!equal) return {status: 'available', random, calls, cpu_cycle: cycle, frame_counter: counter, nmi};
      if (nmi && counter === snapshot) return {status: 'pending', random, calls, cpu_cycle: cycle,
        frame_counter: counter, nmi, continuation: {phase: 'frame-barrier'}};
    }
    return unavailable$3(['random-wait-clock-domain']);
  } catch (error) {return unavailable$3([error.message]);}
}

// @editor-module 逻辑窗口按行提交图块，再合成与提交属性。

const unavailable$2 = missing => ({status: 'unavailable', missing});
const wrapY = value => value >= 15 ? value - 15 : value;
const attributeIndex = (x, y) => ((y << 2) & 56) | ((x >> 1) & 7) | ((x << 2) & 64);
const quadrant = (x, y) => (y & 1) * 2 + (x & 1);
const tileAddress = (x, y) => 0x2000 | ((x & 32) << 5) | ((y & 31) << 5) | (x & 31);
const attributeAddress = (x, y) => 0x23C0 | ((y << 2) & 56) | ((x >> 1) & 7) | ((x >> 2) & 4) << 8;

function context(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.logical_profiles?.[requireFrameByte(state, 'logical_profile')];
  if (!profile) throw new Error('logical-profile-domain');
  const pages = requireFrameVector(state.nametable_pages, 2, 'nametable_pages');
  const x = (requireFrameByte(state, 'camera_x') + (pages[profile.page_selector] ? 0 : 16)) & 31;
  const y = wrapY((requireFrameByte(state, 'camera_y') + profile.source_y) & 255);
  if (y >= 15) throw new Error('logical-camera-domain');
  return {profile, x, y};
}

function beginLogicalWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  let savedOam;
  try {
    context(catalog, state);
    requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
    requireFrameVector(state.main_queue, 352, 'main_queue');
    savedOam = requireFrameByte(state, 'oam_pending');
    state.oam_pending = 0;
  } catch (error) { return unavailable$2([error.message]); }
  return {status: 'pending', state, effects: [], continuation: {phase: 'logical-tiles', row: 0, saved_oam_pending: savedOam}};
}

function tileBatch(state, profile, x, y, row) {
  const queue = state.main_queue;
  let cursor = 0, spans = 0;
  const startX = x * 2;
  let tileY = y * 2;
  const nextY = value => (value + 1 + (value + 1 >= 30 ? 2 : 0)) & 31;
  for (let index = 0; index < row * 2; index++) tileY = nextY(tileY);
  for (let half = 0; half < 2; half++) {
    if (!(half && state.logical_skip_gate && (profile.skip_row & 1) && tileY === profile.skip_row)) {
      let column = 0;
      while (column < 32) {
        const currentX = (startX + column) & 63;
        const size = Math.min(32 - column, 32 - (currentX & 31));
        const address = tileAddress(currentX, tileY);
        queue[cursor++] = address >> 8;
        queue[cursor++] = address & 255;
        queue[cursor++] = size;
        for (let index = 0; index < size; index++)
          queue[cursor++] = state.logical_tiles[profile.source_offset + row * 64 + half * 32 + column + index];
        column += size;
        spans++;
      }
    }
    tileY = nextY(tileY);
  }
  state.span_count = spans;
}

function mergeAttributes(catalog, state, profile, x, y) {
  const logical = state.logical_tiles;
  const shadow = requireFrameVector(state.attribute_shadow, 128, 'attribute_shadow');
  const masks = catalog.masks;
  if (!requireFrameByte(state, 'logical_attribute_gate')) {
    for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
      const sourceY = (profile.source_y + row) & 255;
      const index = attributeIndex(column, sourceY);
      logical[960 + index] |= masks.keep[quadrant(column, sourceY)] ^ 255;
    }
  }
  for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
    const sourceY = wrapY((profile.source_y + row) & 255);
    const targetY = wrapY((y + row) & 255);
    const targetX = (x + column) & 255;
    const source = logical[960 + attributeIndex(column, sourceY)];
    const palette = (source >> (quadrant(column, sourceY) * 2)) & 3;
    const index = attributeIndex(targetX, targetY), keep = masks.keep[quadrant(targetX, targetY)];
    shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & masks.palette_values[palette]);
  }
}

function attributeBatch(state, x, y, row) {
  let cursor = 0;
  const targetY = y + row * 2;
  for (let column = 0; column < 8 + (x & 1); column++) {
    const targetX = x + column * 2;
    const address = attributeAddress(targetX, targetY);
    state.main_queue[cursor++] = address >> 8;
    state.main_queue[cursor++] = address & 255;
    state.main_queue[cursor++] = state.attribute_shadow[attributeIndex(targetX, targetY)];
  }
  state.main_queue_length = cursor;
}

function resumeLogicalWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable$2(['logical-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  let continuation = {...pending.continuation};
  try {
    const {profile, x, y} = context(catalog, state);
    if (continuation.phase !== 'logical-barrier') {
      if (continuation.phase === 'logical-tiles') tileBatch(state, profile, x, y, continuation.row);
      else if (continuation.phase === 'logical-attributes') attributeBatch(state, x, y, continuation.row);
      else throw new Error('logical-window-phase');
      continuation = {...continuation, phase: 'logical-barrier', next_phase: continuation.phase};
    }
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireFrameByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable$2(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state;
    effects.push(...frame.effects);
    const row = continuation.row + 1;
    if (continuation.next_phase === 'logical-tiles') {
      if (row < profile.rows) continuation = {...continuation, phase: 'logical-tiles', row};
      else {
        state.oam_pending = continuation.saved_oam_pending;
        mergeAttributes(catalog, state, profile, x, y);
        continuation = {...continuation, phase: 'logical-attributes', row: 0};
      }
    } else if (row < profile.attribute_rows + (y >= 9 || (y & 1) ? 1 : 0))
      continuation = {...continuation, phase: 'logical-attributes', row};
    else return {status: 'available', state, effects};
    return {status: 'pending', state, effects, continuation};
  } catch (error) { return unavailable$2([error.message]); }
}

function restoreSceneLogicalRow(catalog, input, row, {readMetatile} = {}) {
  const state = cloneFrameValue(input);
  const effects = [];
  try {
    const {profile} = context(catalog, state);
    if (!Number.isInteger(row) || row < 0 || row >= profile.rows) throw new Error('scene-logical-row');
    if (typeof readMetatile !== 'function') throw new Error('current-scene-metatiles');
    const logical = requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
    const shadow = requireFrameVector(state.attribute_shadow, 128, 'attribute_shadow');
    const worldX = requireFrameByte(state, 'world_x'), worldY = requireFrameByte(state, 'world_y');
    const screenX = requireFrameByte(state, 'camera_x');
    const screenY = wrapY((requireFrameByte(state, 'camera_y') + profile.source_y + row) & 255);
    for (let column = 0; column < 16; column++) {
      const cell = readMetatile((worldX + column) & 255, (worldY + profile.source_y + row) & 255);
      const tiles = requireFrameVector(cell?.tiles, 4, 'current-metatile-tiles');
      const palette = requireFrameByte(cell, 'palette');
      if (palette > 3) throw new Error('current-metatile-palette');
      const offset = profile.source_offset + row * 64 + column * 2;
      logical[offset] = tiles[0]; logical[offset + 1] = tiles[1];
      logical[offset + 32] = tiles[2]; logical[offset + 33] = tiles[3];
      const x = (screenX + column) & 255;
      const index = attributeIndex(x, screenY), keep = catalog.masks.keep[quadrant(x, screenY)];
      shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & catalog.masks.palette_values[palette]);
    }
    effects.push({kind: 'scene-logical-row', row});
  } catch (error) { return unavailable$2([error.message]); }
  return {status: 'available', state, effects};
}

function partialContext(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.partial_profiles?.[requireFrameByte(state, 'logical_profile')];
  if (!profile) throw new Error('partial-window-profile');
  requireFrameVector(state.logical_tiles, 1024, 'logical_tiles');
  requireFrameVector(state.main_queue, 352, 'main_queue');
  const pages = requireFrameVector(state.nametable_pages, 2, 'nametable_pages');
  const x = (((requireFrameByte(state, 'camera_x') & 31) * 2 + profile.x) & 255)
    ^ (pages[profile.page_selector] ? 32 : 0);
  let y = (requireFrameByte(state, 'camera_y') * 2 + profile.y) & 255;
  if (y >= 30) y -= 30;
  return {profile, x, y};
}

function beginPartialWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  try {partialContext(catalog, state);}
  catch (error) {return unavailable$2([error.message]);}
  return {status: 'pending', state, effects: [], continuation: {phase: 'partial-tiles', batch: 0}};
}

function resumePartialWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable$2(['partial-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  const continuation = {...pending.continuation};
  try {
    const {profile, x, y} = partialContext(catalog, state);
    if (continuation.phase === 'partial-tiles') {
      let cursor = 0, spans = 0;
      const firstRow = continuation.batch * profile.batch_rows;
      for (let row = firstRow; row < firstRow + profile.batch_rows; row++) {
        let column = 0;
        while (column < profile.width) {
          const currentX = (x + column) & 255;
          const size = Math.min(profile.width - column, 32 - (currentX & 31));
          const address = tileAddress(currentX, (y + row) % 30);
          state.main_queue[cursor++] = address >> 8;
          state.main_queue[cursor++] = address & 255;
          state.main_queue[cursor++] = size;
          for (let index = 0; index < size; index++) state.main_queue[cursor++] =
            state.logical_tiles[((profile.y + row) * 32 + profile.x + column + index) & 1023];
          column += size; spans++;
        }
      }
      state.span_count = spans;
      continuation.phase = 'partial-barrier';
    } else if (continuation.phase !== 'partial-barrier') throw new Error('partial-window-phase');
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireFrameByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable$2(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state; effects.push(...frame.effects);
    const batch = continuation.batch + 1;
    return batch === profile.batches ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'partial-tiles', batch}};
  } catch (error) {return unavailable$2([error.message]);}
}

function createFrameCommitServices(catalog, {advanceRandom, pollController, nmiEvents, readMetatile,
  advanceFrame: frameService} = {}) {
  const advanceFrame = frameService || (state => advanceFrameBarrier(catalog, state, {
    advanceRandom, pollController,
    nmiEvents: typeof nmiEvents === 'function' ? nmiEvents(state) : nmiEvents,
  }));
  return {
    commitNmi: state => commitFrameNmi(catalog, state),
    measureNmiClock: (state, timing) => measureFrameNmiClock(catalog, state, timing),
    measureWaitClock: (state, {cpuCycle, phase, nmiEdgeCycle} = {}) => {
      try {
        return advanceRandomWaitClock(catalog, state, {cpuCycle,
          nmiEdgeCycle: nmiEdgeCycle ?? nextNmiEdgeCycle(cpuCycle, phase)});
      } catch (error) {return unavailable$2([error.message]);}
    },
    advanceFrame,
    beginLogicalWindow: state => beginLogicalWindowCommit(catalog, state),
    resumeLogicalWindow: pending => resumeLogicalWindowCommit(catalog, pending, {advanceFrame}),
    beginPartialWindow: state => beginPartialWindowCommit(catalog, state),
    resumePartialWindow: pending => resumePartialWindowCommit(catalog, pending, {advanceFrame}),
    restoreSceneRow: (state, row) => restoreSceneLogicalRow(catalog, state, row, {readMetatile}),
  };
}

// @editor-module 一号手柄服务从按键输入计算三次锁存及所属输入字段。

const unavailable$1 = missing => ({status: "unavailable", missing});
const buttons = Object.freeze({a: 128, b: 64, select: 32, start: 16, up: 8, down: 4, left: 2, right: 1});

function controllerButtonMask(input) {
  if (!input || typeof input !== "object") throw new TypeError("controller-buttons");
  let value = 0;
  for (const [name, mask] of Object.entries(buttons)) {
    if (typeof input[name] !== "boolean") throw new TypeError(`controller-buttons.${name}`);
    if (input[name]) value |= mask;
  }
  return value;
}

function resolveControllerSamples(catalog, input, samples) {
  const state = structuredClone(input);
  try {
    requireFrameVector(samples, 3, "controller-read-samples");
    const [first, second, third] = samples;
    const value = first === second || first === third ? first : second === third ? second : null;
    state.controller_samples = [...samples];
    if (value !== null) {
      state.controller_edges = (value ^ requireFrameByte(state, "controller_previous")) & value;
      state.controller_previous = value;
      state.direction_index = requireFrameVector(catalog?.controller_directions, 16,
        "controller-direction-source")[value & 15];
      state.controller_samples[0] = value;
    }
    return {status: "available", state, effects: [{kind: "controller-poll", samples: [...samples]}]};
  } catch (error) {return unavailable$1([error.message]);}
}

function pollControllerInput(catalog, input, {readButtons, buttons: heldButtons} = {}) {
  const samples = [];
  let cycles = 2;
  try {
    if (typeof readButtons !== "function" && heldButtons === undefined) throw new Error("controller-buttons");
    for (let sample = 2; sample >= 0; sample--) {
      // STY $4016 的高电平锁存发生在本轮第六个周期。
      const value = controllerButtonMask(typeof readButtons === "function"
        ? readButtons({sample, cycle_offset: cycles + 6}) : heldButtons);
      samples[sample] = value;
      const ones = [...Array(8).keys()].reduce((sum, bit) => sum + ((value >> bit) & 1), 0);
      // BPL 从 D10D 跳到 D0F5 时跨页。
      cycles += 14 + 167 - ones + 2 + (sample ? 4 : 2);
    }
    const result = resolveControllerSamples(catalog, input, samples);
    if (result.status !== "available") return result;
    const [first, second, third] = samples;
    cycles += first === second ? 9 + 35 : first === third ? 14 + 35
      : second === third ? 21 + 35 : 22 + 6;
    return {...result, cycles, timing_scope: "no-interrupts-or-bus-stalls"};
  } catch (error) {return unavailable$1([error.message]);}
}

function createControllerInputServices({state, catalog}) {
  return Object.freeze({
    poll(input) {
      try {
        const fields = Object.fromEntries(["current", "edges", "direction", "samples"].map(name => {
          const field = state.field(`controller.${name}`);
          if (field.knowledge !== "confirmed") throw new TypeError(`controller.${name}`);
          return [name, field];
        }));
        const before = {
          controller_previous: fields.current.value,
          controller_edges: fields.edges.value,
          direction_index: fields.direction.value,
        };
        for (const key of Object.keys(before)) requireFrameByte(before, key);
        const result = pollControllerInput(catalog, before, input);
        if (result.status !== "available") return result;
        fields.samples.value = result.state.controller_samples;
        fields.current.value = result.state.controller_previous;
        fields.edges.value = result.state.controller_edges;
        fields.direction.value = result.state.direction_index;
        return {...result, state: state.capture()};
      } catch (error) {return unavailable$1([error.message]);}
    },
  });
}

// @editor-module OAM 所属计算保留继承字节、写入顺序、裁剪与八位游标。

const byte$1 = (value, name) => requireFrameByte({[name]: value}, name);
const vector$1 = (value, length, name) => requireFrameVector(value, length, name);
const primaryOrders = Object.freeze([
  [0, 1, 15], [14, -1, -1], [15, -1, -1], [0, 1, 16],
]);
const secondaryOrders = Object.freeze([[1, 1, 16], [15, -1, 0]]);

function target(input) {
  const cursor = byte$1(input.cursor, 'oam-cursor');
  if (cursor & 3) throw new TypeError('oam-cursor-alignment');
  return {oam: [...vector$1(input.oam, 256, 'oam-shadow')], cursor, writes: [], sprites: []};
}
function write(output, offset, value) {
  output.oam[offset] = value & 255;
  output.writes.push({offset, value: value & 255});
}
function quartet(output, y, tile, attributes, x) {
  write(output, output.cursor + 1, tile);
  write(output, output.cursor + 3, x);
  write(output, output.cursor, y);
  write(output, output.cursor + 2, attributes);
  output.sprites.push({x: x & 255, y: y & 255, tile, attribute: attributes});
  output.cursor = (output.cursor + 4) & 255;
}

// PRG $026000：横向越界仍写四字节并隐藏 Y，下一条复用当前游标。
function writeCountedOam(input, object, x, y) {
  const output = target(input);
  byte$1(x, 'oam-x'); byte$1(y, 'oam-y');
  if (!Array.isArray(object?.sprites) || !object.sprites.length) throw new TypeError('counted-metasprite');
  for (const sprite of object.sprites) {
    if (![sprite.x, sprite.y].every(value => Number.isInteger(value) && value >= -128 && value <= 127))
      throw new TypeError('counted-metasprite-offset');
    byte$1(sprite.tile, 'metasprite-tile'); byte$1(sprite.attribute, 'metasprite-attribute');
    const rawX = sprite.x & 255, sum = x + rawX, screenX = sum & 255;
    const screenY = (y + sprite.y) & 255;
    write(output, output.cursor, screenY);
    write(output, output.cursor + 1, sprite.tile);
    write(output, output.cursor + 2, sprite.attribute);
    write(output, output.cursor + 3, screenX);
    if ((((screenX >>> 1) | (sum > 255 ? 128 : 0)) ^ rawX) & 128) {
      write(output, output.cursor, 0xEF);
    } else {
      output.sprites.push({x: screenX, y: screenY, tile: sprite.tile, attribute: sprite.attribute});
      output.cursor = (output.cursor + 4) & 255;
    }
  }
  return output;
}

// PRG $02635C/$026422：翻转位与调色板只随接纳的象限推进。
function writeActorOam(input, frame, slot, tables) {
  const output = target(input);
  const descriptor = byte$1(frame?.descriptor, 'actor-descriptor');
  const deltas = vector$1(tables?.deltas, 16, 'actor-tile-deltas');
  const maps = vector$1(tables?.quadrantMaps, 32, 'actor-quadrant-maps');
  const deltaX = vector$1(tables?.xDeltas, 4, 'actor-x-deltas');
  const deltaY = vector$1(tables?.yDeltas, 8, 'actor-y-deltas');
  const attributes = byte$1(slot.attributes, 'actor-attributes');
  const x = byte$1(slot.xLow, 'actor-x-low') | byte$1(slot.xHigh, 'actor-x-high') << 8;
  const y = ((byte$1(slot.yLow, 'actor-y-low') | byte$1(slot.yHigh, 'actor-y-high') << 8) - 4) & 65535;
  const tiles = [byte$1(frame.tile_a, 'actor-tile-a'), (frame.tile_a + deltas[descriptor & 7]) & 255,
    byte$1(frame.tile_b, 'actor-tile-b'), (frame.tile_b + deltas[8 + (descriptor & 7)]) & 255];
  let flips = (descriptor & 0x78) >>> 3, palette = attributes & 15;
  if (attributes & 0x40) {
    flips = maps[flips];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[1], tiles[0], tiles[3], tiles[2]];
  }
  if (attributes & 0x80) {
    flips = maps[16 + flips]; palette = maps[16 + palette];
    [tiles[0], tiles[1], tiles[2], tiles[3]] = [tiles[2], tiles[3], tiles[0], tiles[1]];
  }
  flips = (flips << 3) & 255;
  for (let quadrant = 3; quadrant >= 0; quadrant--) {
    const screenX = (x + deltaX[quadrant]) & 65535;
    write(output, output.cursor + 3, screenX);
    if (screenX >>> 8) continue;
    const screenY = (y + deltaY[quadrant | ((descriptor & 128) ? 4 : 0)]) & 65535;
    write(output, output.cursor, screenY);
    if (screenY >>> 8) continue;
    write(output, output.cursor + 1, tiles[quadrant]);
    const attribute = ((flips & 0x40) ^ (attributes & 0xC0)) | palette;
    flips = (flips << 1) & 255;
    write(output, output.cursor + 2, attribute);
    output.sprites.push({x: screenX, y: screenY, tile: tiles[quadrant], attribute});
    if (quadrant === 2) palette >>>= 2;
    output.cursor = (output.cursor + 4) & 255;
  }
  return output;
}

// PRG $027031：首列坐标取低字节，列步进溢出后跳过下一格。
function writePackedOam(input, object, x, y) {
  const output = target(input);
  byte$1(x, 'packed-x'); byte$1(y, 'packed-y');
  byte$1(object?.anchor, 'packed-anchor'); byte$1(object?.grid, 'packed-grid');
  const columns = ((object.grid >>> 2) & 7) + 1, rows = (object.grid >>> 5) + 1;
  if (!Array.isArray(object.sprites) || object.sprites.length !== rows * columns)
    throw new TypeError('packed-grid');
  const originX = (x - (object.anchor & 0x1C)) & 255;
  let screenY = (y + 4 - ((object.anchor & 0xE0) >>> 3)) & 255;
  for (let row = 0; row < rows; row++) {
    let screenX = originX, clipped = false;
    for (let column = 0; column < columns; column++) {
      const sprite = object.sprites[row * columns + column];
      byte$1(sprite.tile, 'packed-tile'); byte$1(sprite.attribute, 'packed-attribute');
      if (!clipped && sprite.tile) quartet(output, screenY, sprite.tile, sprite.attribute, screenX);
      const sum = screenX + 8;
      clipped = sum > 255;
      screenX = sum & 255;
    }
    screenY = (screenY + 8) & 255;
  }
  return output;
}

// PRG $026701：原点与列步进保留进位，战斗模式裁掉槽 3..15 的下侧。
function writeBattleOam(input, object, slot, index, mode) {
  const output = target(input);
  const origin = byte$1(object?.origin, 'battle-origin');
  const {columns, rows, palette, tiles} = object;
  if (![columns, rows].every(value => Number.isInteger(value) && value >= 1 && value <= 8))
    throw new TypeError('battle-grid');
  vector$1(tiles, columns * rows, 'battle-tiles');
  if (byte$1(palette, 'battle-palette') > 3) throw new TypeError('battle-palette');
  const flip = byte$1(slot.descriptor, 'battle-descriptor') & 1;
  const x = byte$1(slot.x, 'battle-x'), y = byte$1(slot.y, 'battle-y');
  byte$1(index, 'battle-slot'); byte$1(mode, 'battle-mode');
  const inverse = flip ? 0 : 255;
  const xSum = (((origin & 0xF0) >>> 2) ^ inverse) + x;
  const highSum = inverse + Number(index >= 13 && x < 128 && mode === 2) + Number(xSum > 255);
  let screenY = ((origin & 15) << 2 ^ 255) + y;
  let yHigh = (255 + Number(screenY > 255)) & 255;
  screenY &= 255;
  for (let row = 0; row < rows; row++) {
    let screenX = xSum & 255, xHigh = highSum & 255;
    for (let column = 0; column < columns; column++) {
      const tile = tiles[row * columns + column];
      if (!(xHigh | yHigh) && !(mode === 2 && index >= 3 && screenY >= 0x90) && tile)
        quartet(output, screenY, tile, palette | (flip ? 0x40 : 0), screenX);
      const sum = screenX + (flip ? 0xF8 : 8);
      screenX = sum & 255;
      xHigh = (xHigh + (flip ? 255 : 0) + Number(sum > 255)) & 255;
    }
    const sum = screenY + 8;
    screenY = sum & 255;
    yHigh = (yHigh + Number(sum > 255)) & 255;
  }
  return output;
}

function createSceneOamServices({state, sources}) {
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const value = field(id, index);
    if (value.knowledge !== 'confirmed' || value.value === null) throw new TypeError(id);
    return value.value;
  };
  const scalar = id => byte$1(read(id), id);
  const primary = index => ({descriptor: byte$1(read('render.marker', index), 'render.marker'),
    frame: byte$1(read('render.frame', index), 'render.frame'),
    xLow: byte$1(read('render.screenXLow', index), 'render.screenXLow'),
    xHigh: byte$1(read('render.screenXHigh', index), 'render.screenXHigh'),
    yLow: byte$1(read('render.screenYLow', index), 'render.screenYLow'),
    yHigh: byte$1(read('render.screenYHigh', index), 'render.screenYHigh'),
    attributes: byte$1(read('render.attributes', index), 'render.attributes')});
  const secondary = index => ({descriptor: byte$1(read('oam.secondaryDescriptor', index), 'secondary-descriptor'),
    frame: byte$1(read('oam.secondaryFrame', index), 'secondary-frame'),
    x: byte$1(read('oam.secondaryX', index), 'secondary-x'), y: byte$1(read('oam.secondaryY', index), 'secondary-y')});
  return Object.freeze({compose({entry = 'primary'} = {}) {
    const before = state.capture();
    try {
      if (!['primary', 'secondary', 'append-secondary'].includes(entry)) throw new TypeError('oam-entry');
      let output = target({oam: read('display.oamShadow'), cursor: entry === 'append-secondary' ? scalar('dispatch.renderSlot') : 0});
      const writes = [], slots = [], sprites = [];
      if (entry !== 'append-secondary') {
        for (let at = 0; at < 256; at += 4) write(output, at, 0xEF);
        output.cursor = 0;
      }
      const merge = result => {
        writes.push(...output.writes, ...result.writes); sprites.push(...result.sprites);
        output = {...result, writes: []};
      };
      const counted = slot => writeCountedOam(output, sources.counted(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const packed = slot => writePackedOam(output, sources.packed(slot.frame), slot.x ?? slot.xLow, slot.y ?? slot.yLow);
      const actor = slot => writeActorOam(output, sources.actorFrame(slot.frame), slot, sources.actorTables());
      const draw = (group, index, slot, forced = null) => {
        if (!slot.frame) return;
        const kind = forced || (slot.descriptor & 128 ? group === 'primary' ? 'actor' : 'battle'
          : slot.descriptor & 64 ? 'packed' : 'counted');
        slots.push({group, index, kind});
        merge(kind === 'actor' ? actor(slot) : kind === 'packed' ? packed(slot) : kind === 'counted'
          ? counted(slot) : writeBattleOam(output, sources.battle(slot.frame), slot, index, scalar('control.mainMode')));
      };
      const phase = scalar('display.frameCounter') & 1;
      if (entry === 'primary') {
        const profile = scalar('parameter.story');
        if (profile >= primaryOrders.length) throw new TypeError('primary-oam-profile');
        if (!profile) draw('primary', 15, primary(15), 'actor');
        const [start, step, end] = primaryOrders[profile || phase];
        for (let index = start; index !== end; index += step) draw('primary', index, primary(index));
      }
      if (entry !== 'primary' || scalar('control.displayProfile')) {
        draw('secondary', 0, secondary(0), 'counted');
        const [start, step, end] = secondaryOrders[phase];
        for (let index = start; index !== end; index += step) draw('secondary', index, secondary(index));
      }
      writes.push(...output.writes);
      field('display.oamShadow').value = output.oam;
      field('dispatch.renderSlot').value = output.cursor;
      field('display.oamPending').value = 255;
      return {status: 'available', state: state.capture(), oam: output.oam, cursor: output.cursor,
        writes, slots, sprites, effects: [{kind: 'oam-dma-request', value: 255}],
        ...(entry === 'primary' ? {randomSnapshot: [scalar('random.high'), scalar('random.low')]} : {})};
    } catch (error) {
      state.restore(before);
      return {status: 'unavailable', missing: [error.message]};
    }
  }});
}

// @editor-module 设施窗口只执行已确认的局部效果，帧循环经共享服务续行。

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (state, key) => {
  if (!byte(state[key])) throw new Error(key);
  return state[key];
};
const vector = (value, size, key) => {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value))
      || value.length !== size || !value.every(byte)) throw new Error(key);
  return value;
};
const unavailable = missing => ({status: 'unavailable', missing});

function executeFacilityWindowRoutine(catalog, id, input = {}, context = {}) {
  const {selectionLayout, selectionMovement, cursorObject} = context;
  const routine = catalog?.routines?.find(row => row.id === id);
  if (routine?.confirmation_status !== 'confirmed' || !routine.implementation)
    return unavailable(routine?.missing || ['window-routine-semantics']);
  const state = structuredClone(input);
  const effects = [];
  try {
    switch (routine.implementation) {
      case 'selection-coordinates': {
        if (requireByte(state, 'coordinate_update_gate') !== 0) break;
        const coordinates = selectionCursorCoordinates(selectionLayout,
          {resource_id: 'selection-layout', kind: 'indexed-coordinate',
            selector: requireByte(state, 'selector')}, requireByte(state, 'selection_index'));
        state.cursor_x = coordinates.x;
        state.cursor_y = coordinates.y;
        effects.push({kind: 'selection-coordinates', ...coordinates});
        break;
      }
      case 'selection-movement': {
        const selector = selectionLayout?.selectors?.find(row => row.selector === requireByte(state, 'selector'));
        const profile = selectionLayout?.profiles?.[selector?.profile];
        const index = requireByte(state, 'selection_index');
        const direction = requireByte(state, 'direction_index');
        const maximum = (requireByte(state, 'selection_count') - 1) & 255;
        if (!profile || direction > 4 || index >= profile.capacity) throw new Error('selection-movement-domain');
        const movementTable = selectionMovement?.records?.find(record =>
          record.id === 'code-module.fixed-ui-table-core-a')?.values || catalog.movement;
        const directionMask = movementTable?.[direction];
        const movementMask = movementTable?.[5 + profile.movement_offset + index];
        if (!byte(directionMask) || !byte(movementMask)) throw new Error('selection-movement-source');
        const movement = directionMask & movementMask;
        let next = index, moved = false;
        if (movement & 1) {
          if (index !== maximum) {next = (index + 1) & 255; moved = true;}
          else if (index !== 0) {next = index - 1; moved = true;}
        } else if (movement & 2) {next = (index - 1) & 255; moved = true;}
        else {
          const candidate = (index + profile.columns) & 255;
          if (movement & 4 && candidate <= maximum) {next = candidate; moved = true;}
          else if (movement & 8) {next = (index - profile.columns) & 255; moved = true;}
        }
        state.selection_index = next;
        if (moved) effects.push({kind: 'audio-command', command: 'audio-command:67'});
        break;
      }
      case 'selection-highlight': {
        const selector = requireByte(state, 'selector');
        if (selector !== 0 && selector !== 2) break;
        const role = requireByte(state, 'role_index');
        const record = catalog.highlight_records?.[role];
        if (!byte(record)) throw new Error('highlight-record-source');
        const x = (((requireByte(state, 'camera_x') * 2) & 255) + 13) & 255;
        let y = (((requireByte(state, 'camera_y') * 2) & 255) + record) & 255;
        if (y >= 30) y -= 30;
        const column = x ^ (requireByte(state, 'nametable_page') !== 0 ? 32 : 0);
        const pointer = 0x2000 + ((column & 32) ? 0x400 : 0) + (y & 31) * 32 + (column & 31);
        const tile = requireByte(state, 'frame_counter') & 32 ? 255 : selector === 0 ? 0x86 : 0x11;
        state.highlight_region = 13;
        state.highlight_record = record;
        state.highlight_pointer = pointer;
        const triple = [pointer >> 8, pointer & 255, tile];
        if (state.main_queue?.length >= 3) {
          for (let index = 0; index < 3; index++) state.main_queue[index] = triple[index];
        } else state.main_queue = triple;
        state.main_queue_length = 3;
        effects.push({kind: 'replace-main-queue', queue: triple});
        break;
      }
      case 'selection-cursor': {
        const sprites = [];
        if (requireByte(state, 'display_profile') && requireByte(state, 'cursor_object_id')) {
          const object = typeof cursorObject === 'function' ? cursorObject(state.cursor_object_id) : cursorObject;
          if (object?.id !== state.cursor_object_id || !object.sprites?.length)
            throw new Error('current-cursor-metasprite');
          const x = requireByte(state, 'cursor_x'), y = requireByte(state, 'cursor_y');
          const result = writeCountedOam({oam: state.oam_shadow, cursor: requireByte(state, 'oam_cursor')}, object, x, y);
          state.oam_shadow = result.oam;
          state.oam_cursor = result.cursor;
          sprites.push(...result.sprites.map(sprite => ({...sprite, attribute: sprite.attribute & 0xE3})));
        }
        state.window_sprites = sprites;
        effects.push({kind: 'window-sprites', sprites});
        break;
      }
      case 'flush-main-queue': {
        const size = requireByte(state, 'main_queue_length');
        if (size % 3) throw new Error('main-queue-triple-domain');
        const transferred = size || 3;
        const queue = state.main_queue;
        if (!(Array.isArray(queue) || ArrayBuffer.isView(queue))
            || queue.length < transferred || !Array.from(queue).slice(0, transferred).every(byte)) throw new Error('main_queue');
        for (let index = 0; index < transferred; index += 3)
          effects.push({kind: 'ppu-write', address: ((queue[index] << 8) | queue[index + 1]) & 0x3FFF,
            value: queue[index + 2]});
        state.main_queue_length = 0;
        break;
      }
      case 'frame-barrier':
        return createFrameCommitServices(context.frameCommitCatalog, context).advanceFrame(state);
      case 'clear-logical-rectangle': {
        vector(state.logical_tiles, 1024, 'logical_tiles');
        const index = routine.rectangle_index ?? requireByte(state, 'rectangle_index');
        const rectangle = catalog.rectangles?.find(row => row.index === index);
        if (!rectangle) throw new Error('logical-rectangle-source');
        const width = rectangle.width || 256, height = rectangle.height || 256;
        const positions = [];
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const offset = ((rectangle.pointer + row * 32 + column) & 0xFFFF) - 0x6000;
          if (offset < 0 || offset >= 1024) throw new Error('rectangle-outside-logical-buffer');
          positions.push(offset);
        }
        for (const offset of positions) state.logical_tiles[offset] = 255;
        state.rectangle_width = width & 255;
        state.rectangle_pointer = (rectangle.pointer + height * 32) & 0xFFFF;
        effects.push({kind: 'logical-buffer-clear', rectangle: {...rectangle}, value: 255});
        break;
      }
      case 'begin-selection-cycle': {
        const coordinates = executeFacilityWindowRoutine(catalog, 'window-F256', state, {selectionLayout});
        if (coordinates.status !== 'available') return coordinates;
        Object.assign(state, coordinates.state);
        effects.push(...coordinates.effects);
        // F1DD 从 F256 返回后读取 059B，随后直落 F1E3。
      }
      // fall through
      case 'begin-selection-wait':
        state.wait_remaining = requireByte(state, 'wait_count');
        return {status: 'pending', state, effects, continuation: {phase: 'scene-render'}, missing: routine.missing};
      default:
        return unavailable(['window-routine-implementation']);
    }
  } catch (error) {
    return unavailable([error.message]);
  }
  return {status: 'available', state, effects};
}

function resumeFacilityWindowCycle(catalog, pending, {renderScene, windowOnly = false, cursorObject,
  advanceFrame, frameCommitCatalog, advanceRandom, pollController, nmiEvents} = {}) {
  if (pending?.status !== 'pending') return unavailable(['selection-cycle-continuation']);
  let state = structuredClone(pending.state);
  const effects = [...pending.effects];
  try {
    if (!advanceFrame && frameCommitCatalog) advanceFrame = createFrameCommitServices(frameCommitCatalog,
      {advanceRandom, pollController, nmiEvents}).advanceFrame;
    if (pending.continuation.phase === 'scene-render') {
      if (typeof renderScene !== 'function' && !windowOnly)
        return {...pending, ...unavailable(['scene-actor-frame-effects'])};
      let rendered;
      if (typeof renderScene === 'function') rendered = renderScene(state);
      else {
        state.oam_shadow = Array.from({length: 256}, (_, index) => index % 4 === 0 ? 0xEF : 0);
        state.oam_cursor = 0;
        rendered = executeFacilityWindowRoutine(catalog, 'window-A233-cursor', state, {cursorObject});
        if (rendered.status === 'available') rendered.state.oam_pending = 255;
      }
      if (rendered?.status !== 'available') return {...pending, ...unavailable(rendered?.missing || ['scene-actor-frame-effects'])};
      state = rendered.state;
      effects.push(...rendered.effects);
      const highlighted = executeFacilityWindowRoutine(catalog, 'window-F276', state);
      if (highlighted.status !== 'available') return highlighted;
      state = highlighted.state;
      effects.push(...highlighted.effects);
    } else if (pending.continuation.phase !== 'frame-barrier') throw new Error('selection-cycle-phase');
    const barrier = {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
    if (typeof advanceFrame !== 'function') return {...barrier, ...unavailable(['frame-barrier-effects'])};
    const frame = advanceFrame(structuredClone(state));
    if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
    if (frame?.status !== 'available') return {...barrier, ...unavailable(frame?.missing || ['frame-barrier-effects'])};
    if (requireByte(frame.state, 'frame_counter') === requireByte(state, 'frame_counter')) return barrier;
    state = frame.state;
    effects.push(...frame.effects);
    if (requireByte(state, 'controller_edges') !== 0) return {status: 'available', state, effects};
    state.wait_remaining = (requireByte(state, 'wait_remaining') - 1) & 255;
    return state.wait_remaining === 0 ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'scene-render'}};
  } catch (error) {
    return unavailable([error.message]);
  }
}

function executeFacilityWindowConstruction(catalog, program, input, context = {}) {
  if (!Array.isArray(program)) return unavailable(['window-construction-program']);
  const previous = context.continuation;
  let index = previous?.index ?? 0;
  if (!Number.isInteger(index) || index < 0 || index > program.length)
    return unavailable(['window-construction-continuation']);
  let state = structuredClone(input), effects = [];
  const services = createFrameCommitServices(context.frameCommitCatalog, context);
  for (; index < program.length; index++) {
    const operation = program[index];
    let result;
    const pending = previous?.index === index ? previous.pending : null;
    if (operation.kind === 'window-routine') {
      result = pending && ['window-F1DD', 'window-F1E3'].includes(operation.routine)
        ? resumeFacilityWindowCycle(catalog, {...pending, state, effects: []}, context)
        : executeFacilityWindowRoutine(catalog, operation.routine, state, context);
    } else if (operation.kind === 'logical-window') {
      result = pending ? services.resumeLogicalWindow({...pending, state, effects: []})
        : services.beginLogicalWindow(state);
    } else if (operation.kind === 'restore-scene-row') {
      result = services.restoreSceneRow(state, operation.row);
    } else return {status: 'unavailable', state, effects, stopped_at: index,
      missing: ['window-construction-operation']};
    if (result.status !== 'available') return {...result, state: result.state || state,
      effects: [...effects, ...(result.effects || [])],
      construction_continuation: {index, pending: result.status === 'pending' ? result : pending}};
    state = result.state;
    effects.push(...result.effects);
  }
  return {status: 'available', state, effects};
}

function facilityWindowFrameSchedule(catalog, events) {
  let current;
  return {
    nmiEvents: events,
    advanceRandom(state, event) {
      if (!Number.isSafeInteger(event?.random_calls) || event.random_calls < 0)
        return unavailable(['random-wait-schedule']);
      const next = structuredClone(state);
      try {
        for (let index = 0; index < event.random_calls; index++) {
          const random = advanceGlobalRandom(requireByte(next, 'random_high'), requireByte(next, 'random_low'));
          next.random_high = random.high;
          next.random_low = random.low;
          next.random_workspace = random.workspaceHigh;
        }
      } catch (error) { return unavailable([error.message]); }
      current = event;
      return {status: 'available', state: next, effects: [{kind: 'random-wait', calls: event.random_calls}]};
    },
    pollController(state) {
      return resolveControllerSamples(catalog, state, current?.controller_samples);
    },
  };
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

export { actorInteractionMode, applicationDestination, applyBattleResultEffects, battleResultExecution, battleResultGraph, bindOwnerReferenceList, bombardmentContains, cloneFrameValue, commitFrameNmi, commitRasterIrq, completeFrameNmiTail, completeRasterFrame, conditionalEntranceCells, conditionalEntranceRecord, conditionalEntranceState, conditionalSceneRecord, controllerAt, controllerFlagId, controllerHref, controllerSceneHref, controllerTargetLabel, createControllerInputServices, createFrameCommitServices, createSceneOamServices, currentOwnerReferenceImpact, enumerateSceneInteractionObjects, executeFacilityWindowConstruction, executeFacilityWindowRoutine, facilityWindowFrameSchedule, loadEventMapScenes, ownerReferenceListMarkup, prepareEventFlagReferences, requireFrameByte, requireFrameVector, resolveChrPatternTable, resumeFacilityWindowCycle, sameFrameVector, sceneBgmItemsForProject, sceneBombardments, sceneCoordinateEvent, sceneEntryMusicCommand, sceneEntryStoryItemsForProject, sceneInteractionDestinations, sceneInvestigationResolution, sceneTileAction, sceneTileActionArrival, sceneTileActionOrigins, sceneTreasureProbeResolution, sceneUsageAnchor, shopConfigurationForActor, supportsSceneDestinationPage, tideEntrance, withCurrentOwnerRecord, worldEventHandle, worldEventMapEffects, worldEventSceneHref, worldEventsForFlag, worldTideScenes, worldTideTriggers };
