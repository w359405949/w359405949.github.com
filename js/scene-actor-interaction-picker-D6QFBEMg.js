import { state } from './emulator-Bpa8EsFw.js';
import { decodeFixedTextRecord, WORLD_TIDE_OWNER, db, prepareSceneInteractionBinding, sceneInteractionBoundObject, sceneInteractionPointValue, sceneInteractionScriptPrograms, sceneInteractionTemplates, sceneTreasureContent, EXTENDED_APPLICATION_SELECTOR, sceneInteractionScriptActorDependency, SCENE_INTERACTION_ACTOR_REASON, SCENE_SERVICE_INSTANCE_COUNTS, sceneActorServiceInstance, sceneActorInteractionPermitted } from './prg-loaders-DnCSmXk9.js';
import { esc, prepareModuleComponent, currentTextReference, showEditorError, renderModuleComponent, hydrateModuleComponents } from './interface-state-preview-Dlotqlmn.js';
import { mountFieldObjectFormationChoice, mountFieldObjectRecordChoice } from './field-object-editor-Blro4OF0.js';
import { fieldMenuCurrentInvestigationPreview, fieldMenuInteractionPreview, shopConfigurationPicker } from './interface-state-frame-ZrXRl0fR.js';
import { facilityConfigurationLabel } from './configuration-summary-m9SZR_6_.js';
import { loadSceneElevators, referencePickerMarkup, bindReferencePicker } from './timeline-player-YCH7Y-3h.js';
import { worldTideTriggers, sceneEntryStoryItemsForProject, actorInteractionMode, sceneInteractionDestinations } from './battle-result-state-machine-BbK2hSud.js';
import { investigationFeedbackEntries, investigationFeedbackAudioCommand, paintUiConstructionSemanticPreview, uiJsRenderSources, uiDialogueRecordSources, uiPaintDialogueCanvas } from './ui-construction-preview-BuoQ5mM6.js';
import { sceneServicePreviewEntries } from './service-preview-scene-CPwiqon9.js';
import { selectInterfacePreviewBoundScene, interfacePreviewContext } from './element-tree-C1bWRgTl.js';
import { previewSoundEnabled, prepareViewData } from './overview-BWR5QCHz.js';
import { createAudioTimelinePlayer } from './system-state-model-zPjxuFk6.js';
import { interactionEditorHref, interactionEditorLink, prepareStoryReferenceDetails } from './interaction-components-DjtMdVmW.js';
import { EDITOR_PAGES, sceneInteractionFlowMatches } from './editor-renderer-n2nBwXk_.js';
import { formationUsage, FORMATION_GROUPS, formationGroup } from './text-record-controls-Ca9jGqUd.js';
import './document-controls-C8YiQAPz.js';
import './components-DZ4_ZF2v.js';
import './components-DbJXuRMn.js';
import './components-BIpJ3l3a.js';

// @editor-module 对话正文与翻页位置由文本字段对象提供。

function dialoguePreviewFrames(recordId) {
  const record = state.project?.text_record_edits?.records?.[recordId];
  const encoding = state.project?.text_record_encoding;
  if (!record || !encoding) return [];
  const decoded = decodeFixedTextRecord(record, encoding, {fillPlaceholders: true});
  const boundaries = decoded.commands.filter(command => command.token === 0xE4
    || [0xFE, 0xF0].includes(command.token) && command.repeat_role !== 'delimiter');
  const frames = [];
  let pageIndex = 0, confirmedWaits = 0, offset = 0;
  for (const command of [...boundaries, {offset: record.capacity, length: 0}]) {
    const length = command.offset - offset;
    const text = length > 0 ? decodeFixedTextRecord({...record, capacity: length,
      bytes: record.bytes.slice(offset, command.offset),
      protected_ranges: record.protected_ranges.filter(range => range.offset >= offset
        && range.offset + range.length <= command.offset).map(range => ({...range, offset: range.offset - offset})),
    }, encoding, {fillPlaceholders: true}).formatted_text : '';
    frames.push({pageIndex, confirmedWaits, offset, text});
    offset = command.offset + command.length;
    if ([0xE4, 0xFE, 0xF0].includes(command.token)) confirmedWaits += 1;
    if (command.token !== 0xE4) pageIndex += 1;
  }
  return frames;
}

// @editor-module 专用生命周期交互只提供查看候选。

const hex$2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const labels = Object.freeze({elevator: '电梯触发格', 'boundary-return': '动态边界返回',
  tide: '潮汐', vehicle: '战车停放', 'entry-story': '进场与控制接管剧情',
  autonomous: '角色自动动作'});

async function loadSceneInteractionExceptions(database, {scenes, actors, story}) {
  const [elevators, sources, vehicles, tide] = await Promise.all([
    loadSceneElevators(database, scenes.editable_scenes),
    database.getDocument('project.scenes.interaction-sources'),
    database.getResourceDocument('vehicle-preset'),
    database.getResourceDocument(WORLD_TIDE_OWNER),
  ]);
  const rows = [];
  const add = (kind, sceneId, key, handle, record, label = labels[kind]) => {
    const scene = scenes.editable_scenes.find(scene => Number(scene.id) === Number(sceneId));
    const point = Number.isInteger(record.x) && Number.isInteger(record.y)
      ? ` · ${record.x}, ${record.y}` : '';
    rows.push({value: `exception:${kind}:${handle}:${key}`, label: `${label} · ${scene?.name || hex$2(sceneId)}${point}`,
      currentLabel: handle, description: handle, group: `exception-${kind}`, groupLabel: labels[kind],
      filter: `${label} ${handle} ${scene?.name || ''} ${point}`, previewOnly: true, disabled: true,
      object: {kind, sceneId: Number(sceneId), scene: scene?.slug, key, record}, scene});
  };
  for (const {scene, elevator, selection} of elevators)
    add('elevator', scene.id, selection, elevator.configuration_handle, elevator);
  for (const {scene, logic} of sources.records) {
    const record = logic.layers.transitions.dynamic_boundary_return;
    if (record) add('boundary-return', scene.id, 'boundary:return', `scene:${hex$2(scene.id)}`, record);
  }
  for (const record of worldTideTriggers(tide, tide.trigger.scene_id))
    add('tide', record.scene_id, 'tide:0', record.handle, record);
  for (const record of vehicles.initial_placement.records.filter(record => record.placed))
    add('vehicle', record.scene_id, `vehicle:${record.vehicle_slot}`, `vehicle:${hex$2(record.vehicle_slot)}`,
      record, `${record.vehicle_slot + 1} 号战车停放`);
  for (const scene of scenes.editable_scenes)
    for (const record of sceneEntryStoryItemsForProject(scene.id, story))
      add('entry-story', scene.id, record.key, `scene:${hex$2(scene.id)}`, record, record.label);
  for (const record of actors.records.filter(record => record.autonomous_script_id > 0)) {
    const sceneId = actors.tables.find(table => table.entry_id === record.entry_id)?.owner?.scene_id ?? record.entry_id;
    add('autonomous', sceneId, record.uid, `story-autonomous-script:script:${hex$2(record.autonomous_script_id)}`,
      record, `角色 ${record.uid} · 自动动作 ${hex$2(record.autonomous_script_id)}`);
  }
  return rows;
}

// @editor-module 调查状态图只投影发布模型与当前场景引用。

const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function pendingGraph(flow) {
  const node = {id: flow.id, label: flow.label, regions: [], status: 'unknown', boundary: true};
  return {nodes: [node], transitions: [], edges: [], entry: node.id, initializations: [], boundaries: [node]};
}

function sceneInteractionFlowGraph(flow, targets = [], {object, logic, catalog, calls, scenes} = {}) {
  const definition = catalog?.flows?.[flow.id];
  if (!definition) return pendingGraph(flow);
  const key = definition.by_scene?.[object?.sceneId]
    || definition.by_metatile?.[object?.record.metatile_id]
    || definition.by_content?.[object?.record.content_id] || definition.default_model;
  const graph = structuredClone(definition.models[key]);
  if (definition.content_item_binding) {
    const item = `item:${hex$1(object?.record.content_id)}`;
    for (const node of graph.nodes) if (Object.hasOwn(node, 'item')) {
      node.item = item;
      if (node.phase === 'discovery') node.label = `发现物品 ${hex$1(object.record.content_id)}`;
    }
    for (const edge of graph.transitions) if (Object.hasOwn(edge.operation, 'item'))
      edge.operation.item = item;
  }
  if (definition.facility_binding) {
    const matches = (logic?.investigation_points || []).filter(row => Number(row.scene_id) === Number(object?.sceneId)
      && Number(row.x) === Number(object?.record.x) && Number(row.y) === Number(object?.record.y))
      .sort((a, b) => Number(b.id) - Number(a.id));
    const facility = matches[0];
    const command = facility?.command_id ?? logic?.investigation_handler_commands
      ?.find(row => Number(row.selector) === Number(facility?.handler_selector))?.command_id;
    const node = graph.nodes.find(node => node.id === definition.facility_binding.node);
    if (facility?.facility_label) node.label = facility.facility_label;
    if (command != null) node.referenceTarget = {commandId: Number(command), argument: facility.instance_id,
      sceneId: object.sceneId};
    for (const edge of graph.transitions) if (edge.id === definition.facility_binding.transition)
      edge.operation = {...edge.operation, command, instance: facility?.instance_id};
  }
  const fallback = graph.nodes.find(node => node.id === `${flow.id}:fallback` && node.boundary);
  const continuation = calls?.reward_calls?.find(call => call.handler_prg === object?.record.handler_prg)
    ?.acquisition_condition?.unavailable_feedback?.target_reference;
  if (fallback && continuation) {
    const [kind, scene, id] = continuation.split(':');
    const record = logic?.metatile_investigation_points?.find(row => row.scene_id === Number.parseInt(scene, 16)
      && row.id === Number.parseInt(id, 16));
    const target = record && {kind, sceneId: record.scene_id, record};
    const page = target && EDITOR_PAGES.find(page => page.route.interactionFlow && sceneInteractionFlowMatches(page, target));
    const entry = scenes?.editable_scenes?.find(scene => scene.id === record?.scene_id);
    if (page && entry) fallback.referenceTarget = {pageId: page.id,
      route: {...page.route, scene: entry.slug, sceneObject: `${kind}:${record.id}`, scenePoint: `${record.x},${record.y}`}};
  }
  for (const node of graph.nodes) {
    const reference = node.referenceTarget;
    const formation = /^encounter-formation:([0-9A-F]{2})$/u.exec(reference?.route?.resource || '');
    if (reference?.pageId === 'battle-command' && formation) node.referenceTarget = {...reference,
      route: {view: 'battle-test', battleFormation: Number.parseInt(formation[1], 16)}};
  }
  for (const node of graph.nodes) node.target = targets.find(target => target.dialogues.some(dialogue =>
    node.preview_phase ? dialogue.preview?.investigation_feedback?.phase === node.preview_phase
      : node.record && dialogue.record === node.record && (!node.item || dialogue.item === node.item)
        && (!node.phase || (dialogue.phase || dialogue.preview?.investigation_feedback?.phase) === node.phase)));
  const transitions = new Map(graph.transitions.map(edge => [edge.id, edge]));
  graph.edges = graph.edges.map(edge => ({...edge, ...transitions.get(edge.id),
    routes: edge.routes.map(route => transitions.get(route.id) || route)}));
  graph.boundaries = graph.nodes.filter(node => node.boundary);
  return graph;
}

// @editor-module 角色交互方式与目标共用一个字段对象选择控件。

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const bindingKey = values => `${Number(values.text_region)}:${Number(values.interaction_or_record_id)}`;
const previewSelections = new Map();
const previewDialogues = new Map();
const previewFrames = new Map();
const previewTargets = new Map();
let investigationAudio = null;

async function treasureContentLabel(record, treasures) {
  const content = sceneTreasureContent(record, treasures);
  if (content.kind === 'buried-vehicle') return `${content.vehicleSlot + 1} 号战车挖掘`;
  if (content.kind === 'money') return `金钱奖励 $${hex(record.content_id)}`;
  const item = await db.get(`item:${hex(content.itemId)}`);
  return currentTextReference(`record:00:${String(item.name_source.record_id).padStart(3, '0')}`).label;
}

function sceneInteractionPreviewTarget(pageId) {
  return previewTargets.get(pageId) || null;
}

async function preparePageInteractionEntries() {
  return Promise.all((await db.storyPageInteractionEntries()).map(async page => {
    const [entry] = await prepareStoryReferenceDetails({}, 'interaction', [{id: page.program.id}], [page.program], page.textDisplays);
    return {...page, ...entry, id: page.id,
      href: `?view=story-page&storyPage=${encodeURIComponent(page.page)}&storyPaused=1`};
  }));
}

function sceneInteractionMenuPreview(pageId, fallbackRecord = null) {
  const selected = previewDialogues.get(pageId);
  if (selected?.preview) return selected.preview;
  if (!selected && pageId === 'field-investigation') {
    const current = fieldMenuCurrentInvestigationPreview();
    if (current) return current;
  }
  const record = selected?.record
    || fallbackRecord || (pageId === 'field-investigation' ? 'record:05:005' : null);
  return record ? fieldMenuInteractionPreview(record, pageId) : null;
}

function sceneInteractionPreviewMarkup(pageId) {
  return `<div class="screen-workbench-inspector-body" data-field-interaction-target="${esc(pageId)}"></div>`;
}

async function bindSceneInteractionPreview(host, options = {}) {
  if (!host) return;
  if (options.objectUid) return prepareSceneInteractionPreview(host, options);
  const selected = previewSelections.get(host.dataset.fieldInteractionTarget);
  if (selected && selected !== 'none') return prepareSceneInteractionPreview(host, {...options, lazyCandidates: true});
  if (options.previewInStage) selectInterfacePreviewBoundScene(null);
  host.innerHTML = referencePickerMarkup({moduleId: 'scene-actor', label: '正文',
    value: 'none', items: [{value: 'none', label: '默认正文', group: 'none', groupLabel: '正文'}],
    grouped: true, groupColumn: true, previewPanel: true, pageSize: 24, componentAttributes: 'data-field-interaction-picker'});
  bindInteractionPreviewCandidates(host, options);
  host.dataset.fieldInteractionReady = '1';
}

function bindInteractionPreviewCandidates(host, options) {
  const details = host.querySelector('details');
  let preparing = false;
  details.addEventListener('toggle', async () => {
    if (!details.open || preparing) return;
    preparing = true;
    try {
      await prepareSceneInteractionPreview(host, options);
      if (host.isConnected && details.open) host.querySelector('details').open = true;
    } catch (error) {
      preparing = false;
      if (host.isConnected) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    }
  });
}

async function prepareSceneInteractionPreview(host, {repaint = () => {}, rerender = null, previewInStage = false, selectionInTree = false, lazyCandidates = false, objectUid = null, sourceObject = null, flowPreview = false} = {}) {
  if (!host) return;
  const pageId = host.dataset.fieldInteractionTarget;
  const investigation = pageId === 'field-investigation';
  const actorScripts = !objectUid || objectUid.startsWith('actor:');
  if (investigation && previewSoundEnabled()) await prepareViewData('audio');
  const [actors, logic, scenes, story, facilities, scripts, metatileSets, calls, encounters, acquisition, scriptDocument, catalog] = await Promise.all([
    db.getDocument('scene-actor'), db.getDocument('project.scenes.logic'),
    db.getDocument('project.scenes'), db.getDocument('project.story'),
    db.getDocument('project.facilities'), actorScripts
      ? prepareModuleComponent('story-interaction-script', 'reference') : {entries: []},
    db.getResourceDocument('metatile-set'),
    db.getResourceDocument('nearby-object-investigation-service'),
    db.getResourceDocument('encounter-trigger-runtime'),
    db.getResourceDocument('item-acquisition-service'),
    actorScripts ? db.getResourceDocument('story-interaction-script') : null,
    flowPreview ? db.getDocument('project.ui.scene-flow-states') : null,
  ]);
  if (!host.isConnected) return;
  if (scripts.error) throw new Error(scripts.error);
  const pages = actorScripts ? await preparePageInteractionEntries() : [];
  if (!host.isConnected) return;
  const entries = [...pages.filter(page => Number.isInteger(page.id)),
    ...scripts.entries.filter(entry => !pages.some(page => page.id === entry.id))];
  const context = {logicIndex: logic, scenes, story, facilities, metatileSets, tileActions: calls,
    ...(sourceObject ? {sceneLogic: state.sceneLogic} : {}),
    storyPageInteractions: pages};
  let previewSource = sourceObject;
  if (flowPreview && sourceObject?.record.interaction_binding) {
    Object.assign(context, await prepareSceneInteractionBinding(sourceObject, context, db));
    previewSource = sceneInteractionBoundObject(sourceObject, context);
  }
  const rows = [
    ...actors.records.filter(record => actorInteractionMode(record) !== 'none').map(record =>
      ({kind: 'actor', record, sceneId: record.entry_id, uid: record.uid, key: `actor:${record.id}`})),
    ...[['investigation', 'investigation_points'], ['investigation-special', 'investigation_special_points'],
      ['investigation-tile', 'metatile_investigation_points'], ['treasure', 'treasures']].flatMap(([kind, key]) =>
      (logic[key] || []).map(record => ({kind, record, sceneId: record.scene_id,
        uid: `${kind}:${hex(record.scene_id)}:${hex(record.id)}`, key: `${kind}:${record.id}`}))),
  ];
  const selectedValue = previewSelections.get(pageId);
  const candidates = previewSource ? [{...previewSource, record: {...previewSource.record}, uid: objectUid}]
    : objectUid ? rows.filter(row => row.uid === objectUid)
    : lazyCandidates ? rows.filter(row => selectedValue?.startsWith(`${row.uid}:fragment:`)) : rows;
  const preparedTargets = await db.reusePreviewProjection('scene-interaction-preview-targets', [pageId,
    lazyCandidates, lazyCandidates ? selectedValue : null, objectUid, JSON.stringify(previewSource?.record), flowPreview,
    actors, logic, scenes, story, facilities, metatileSets, calls, encounters, acquisition, scriptDocument, catalog,
    state.project?.text_record_edits, state.project?.ui?.construction?.interfaces,
    state.project?.ui?.construction?.menu_dispatch_data?.previews,
    JSON.stringify(pages.map(({textDisplays, ...page}) => ({...page, textDisplays: [...textDisplays]}))),
  ], async () => {
    const seenPreviews = new Set();
    return candidates.flatMap(object => {
      const scene = scenes.editable_scenes.find(row => Number(row.id) === Number(object.sceneId));
      const mode = object.kind === 'actor' ? actorInteractionMode(object.record) : object.kind;
      const result = sceneInteractionDestinations({...object, scene: scene?.slug}, context);
      const record = object.record;
      const script = mode === 'interaction-script' ? entries.find(entry =>
        Number(entry.id) === Number(record.interaction_or_record_id)) : null;
      const flow = flowPreview && EDITOR_PAGES.find(page => page.route.interactionFlow && sceneInteractionFlowMatches(page, object));
      const nodes = flow ? sceneInteractionFlowGraph(flow, [], {object, logic, catalog}).nodes : [];
      const feedback = investigationFeedbackEntries(object, {calls, encounters, acquisition,
        ...(flowPreview ? {logic, flowPreview, nodes} : {})},
        record => fieldMenuInteractionPreview(record, pageId));
      let dialogues = feedback || (mode === 'direct-dialogue'
        ? [{record: `record:${hex(record.text_region)}:${String(record.interaction_or_record_id).padStart(3, '0')}`,
            interactionWindow: true}]
        : mode === 'service-handler' || result.applications.length && !script
          ? sceneServicePreviewEntries(result.applications, object.sceneId,
            object.kind === 'investigation' ? `scene:${hex(object.sceneId)}:investigation:${hex(object.record.id)}` : null)
        : script?.dialogues?.flatMap(dialogue => dialogue.application
          ? sceneServicePreviewEntries([dialogue.application], object.sceneId) : [dialogue])
          || result.targets.filter(target => target.record)
          .map(target => ({record: target.record, label: target.condition, interactionWindow: true})));
      if (flowPreview && mode === 'investigation-tile' && !feedback) {
        const native = sceneInteractionDestinations(object, {...context, skipInvestigationTakeovers: true});
        dialogues = native.targets.filter(target => target.record)
          .map(target => ({record: target.record, label: target.condition || '调查反馈', interactionWindow: true}));
      }
      const href = mode === 'interaction-script'
        ? script?.href || interactionEditorHref(`story-interaction-script:script:${hex(record.interaction_or_record_id)}`)
        : mode === 'direct-dialogue' ? interactionEditorHref(dialogues[0].record)
          : result.targets.find(target => target.application)?.href || result.targets[0]?.href;
      return dialogues.map((dialogue, index) => ({...object, scene, mode, href, result, script,
        uid: `${object.uid}:fragment:${index}`, objectUid: object.uid, dialogues: [dialogue],
        label: dialogue.label || (dialogue.record ? currentTextReference(dialogue.record).label : '') || object.uid,
        previewKey: `${dialogue.fragmentId || dialogue.record || object.uid}:${dialogue.preview?.id || ''}:${
          dialogue.preview?.investigation_feedback?.context_reference || ''}:${
          dialogue.preview?.investigation_feedback?.item_index ?? ''}:${
          dialogue.preview?.investigation_feedback?.phase || ''}`,
        group: dialogue.preview?.facility_branch_source || result.applications.length ? 'service'
          : object.kind === 'actor' ? 'dialogue' : 'investigation',
      }));
    }).filter(row => !seenPreviews.has(row.previewKey) && seenPreviews.add(row.previewKey));
  }, {sources: [{kind: 'field', id: 'text-record'}]});
  const itemNames = new Map(await Promise.all([...new Set(preparedTargets
    .map(target => target.dialogues[0]?.item).filter(Boolean))].map(async handle => {
    const item = await db.get(handle);
    const record = item?.name_source?.record_id;
    if (!Number.isInteger(record)) throw new TypeError(`${handle} 缺少物品名称引用`);
    const name = currentTextReference(`record:00:${String(record).padStart(3, '0')}`).label;
    if (!name) throw new TypeError(`${handle} 缺少当前物品名称正文`);
    return [handle, name];
  })));
  const targets = preparedTargets.map(target => target.dialogues[0]?.item
    ? {...target, label: `${target.label.split(' · ')[0]} · ${itemNames.get(target.dialogues[0].item)}`} : target);
  if (!host.isConnected) return;
  let selected = targets.find(row => row.uid === previewSelections.get(pageId)) || (objectUid ? targets[0] : null);
  previewTargets.set(pageId, selected);
  if (objectUid && !targets.length) {
    showEditorError(host, '反馈画面暂不可用', new TypeError(`${objectUid} 缺少反馈文字与画面来源`));
    host.dataset.fieldInteractionReady = 'error';
    return;
  }
  const groups = {dialogue: '普通对话', service: '服务片段', investigation: '调查反馈'};
  host.innerHTML = (selectionInTree ? '' : referencePickerMarkup({moduleId: 'scene-actor', label: '正文',
    value: selected?.uid || 'none', grouped: true, groupColumn: true, previewPanel: true, pageSize: 24,
    componentAttributes: 'data-field-interaction-picker',
    items: [...(objectUid ? [] : [{value: 'none', label: '默认正文', group: 'none', groupLabel: '正文'}]),
      ...targets.map(row => ({value: row.uid, label: row.label, group: row.group,
        groupLabel: groups[row.group], description: `${row.scene?.name || hex(row.sceneId)} · ${row.record.x}, ${row.record.y}`,
        meta: row.mode === 'direct-dialogue' ? row.dialogues[0]?.record : row.script?.label || row.record.facility_label || '',
        details: `${row.dialogues.slice(0, 1).filter(item => item.record).map(item => renderModuleComponent('text-record', 'preview',
          {value: item.record, compact: true})).join('')}${interactionEditorLink(row.href)}`,
        filter: `${row.uid} ${row.scene?.name} ${row.script?.label || ''} ${row.dialogues.filter(item => item.record).map(item => currentTextReference(item.record).label).join(' ')}`,
      }))]})) + '<div data-field-interaction-content></div>';
  const content = host.querySelector('[data-field-interaction-content]');
  const playFeedback = async () => {
    investigationAudio?.dispose();
    investigationAudio = null;
    if (!previewSoundEnabled()) return;
    const command = await investigationFeedbackAudioCommand(
      selected?.dialogues[previewFrames.get(pageId) || 0]?.preview);
    if (command === null) return;
    investigationAudio = createAudioTimelinePlayer(state.project.audio,
      [{frame: 0, command_id: command}], 180);
    await investigationAudio.play(0);
  };
  const paint = async () => {
    if (!host.isConnected) return;
    if (previewInStage && !flowPreview) selectInterfacePreviewBoundScene(selected
      ? {sceneId: selected.sceneId, x: selected.record.x, y: selected.record.y} : null);
    content.innerHTML = !previewInStage && selected ? `<p>${interactionEditorLink(selected.href)}
      <a class="editor-inline-link" href="?view=scenes&amp;scene=${esc(selected.scene?.slug || '')}&amp;sceneMode=logic&amp;sceneObject=${esc(selected.key)}">${esc(selected.objectUid)} ↗</a></p>
      ${selected.dialogues.length ? `${previewInStage ? '' : `<label>画面 <select data-field-interaction-frame>${selected.dialogues.map((item, index) =>
        `<option value="${index}" ${index === (previewFrames.get(pageId) || 0) ? 'selected' : ''}
          title="${esc(item.label || item.record)}">${esc(item.label || item.record || `片段 ${index + 1}`)}</option>`).join('')}</select></label>`}
        ${previewInStage ? '' : `<p>${fieldMenuInteractionPreview(selected.dialogues[0].record, pageId)
          ? '交互文字预览' : '文字与窗口预览；完整交互画面尚未提供。'}</p>
        <div class="field-interaction-window"><canvas width="256" height="240" data-field-interaction-preview aria-label="交互结构预览"></canvas></div>`}`
        : `<p role="alert">${esc(selected.result.gaps.join('；') || '该交互的画面尚缺运行时参数绑定。')}</p>`}` : '';
    let drawVersion = 0;
    const draw = async () => {
      const version = ++drawVersion;
      const dialogue = selected?.dialogues[previewFrames.get(pageId) || 0];
      if (previewInStage) {
        if (dialogue) previewDialogues.set(pageId, dialogue);
        else previewDialogues.delete(pageId);
        await repaint();
        return;
      }
      const canvas = content.querySelector('[data-field-interaction-preview]');
      if (!canvas || !dialogue) return;
      const isCurrent = () => canvas.isConnected && version === drawVersion;
      const source = dialogue.preview || fieldMenuInteractionPreview(dialogue.record, pageId);
      const preview = source && {...source, interface_preview_state: {context: {...interfacePreviewContext(),
        scene: {sceneId: selected.sceneId, x: selected.record.x, y: selected.record.y}}}};
      if (preview) {
        await paintUiConstructionSemanticPreview(canvas, preview,
          {isCurrent});
      } else {
        const sources = await uiJsRenderSources();
        const records = await uiDialogueRecordSources([dialogue.record], sources.model);
        if (!isCurrent()) return;
        uiPaintDialogueCanvas(canvas, dialogue.record, 0, sources, records,
          {interactionWindow: !!dialogue.interactionWindow});
      }
      if (!isCurrent()) return;
      canvas.dataset.fieldInteractionPainted = '1';
    };
    const gap = () => {
      if (previewInStage) return;
      content.querySelector('[data-field-interaction-gap]')?.remove();
      const dialogue = selected?.dialogues[previewFrames.get(pageId) || 0];
      if (dialogue?.preview?.missing?.length) content.insertAdjacentHTML('beforeend',
        `<p role="alert" data-field-interaction-gap title="${esc(dialogue.preview.missing.join('; '))}">服务流程预览未闭合。</p>`);
    };
    content.querySelector('select')?.addEventListener('change', event => {
      previewFrames.set(pageId, Number(event.currentTarget.value));
      gap(); void draw().then(async () => {
        await rerender?.();
        await playFeedback();
      }).catch(error => {
      const current = document.querySelector(`[data-field-interaction-target="${pageId}"] [data-field-interaction-content]`);
      current?.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    });});
    gap();
    await draw();
    if (!previewInStage) await repaint();
  };
  const select = async value => {
    delete host.dataset.fieldInteractionReady;
    selected = targets.find(row => row.uid === value) || null;
    previewTargets.set(pageId, selected);
    previewSelections.set(pageId, selected?.uid || 'none');
    previewFrames.delete(pageId);
    await paint();
    await rerender?.();
    await playFeedback();
    host.dataset.fieldInteractionReady = '1';
  };
  const picker = host.querySelector('[data-field-interaction-picker]');
  if (picker) {
    bindReferencePicker(picker, {paint: hydrateModuleComponents});
    picker.addEventListener('module-reference-change', event => {
      if (event.target !== picker) return;
      void select(event.detail.value).catch(error => {
        if (host.isConnected) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
      });
    });
  }
  if (lazyCandidates) bindInteractionPreviewCandidates(host, {repaint, rerender, previewInStage});
  if (selectionInTree || !previewInStage || selected?.dialogues[previewFrames.get(pageId) || 0] !== previewDialogues.get(pageId)) {
    await paint();
  }
  host.dataset.fieldInteractionReady = '1';
  return {targets, select, get selected() {return selected;}};
}

async function mountSceneActorInteractionPicker(host, object, {entityHandle, regions, services, productsForRecord,
  source = null, context = {}, battle, candidateFilter = () => true}) {
  const isCurrent = () => host.isConnected && (object.isCurrent?.() ?? true);
  if (battle) {
    const prepared = await prepareModuleComponent('encounter-formation', 'reference');
    if (prepared.error) throw new Error(prepared.error);
    const uses = await formationUsage(db);
    if (!isCurrent()) return;
    return mountFieldObjectFormationChoice(host, object, {entityHandle, ...battle, prepared,
      picker: {items: prepared.entries.map(entry => ({value: entry.id,
        label: `${hex(entry.id)} · ${(entry.slots || []).filter(slot => slot.count).map(slot =>
          `${slot.current_name} ×${slot.count}`).join(' / ') || '空编队'}`,
        group: formationGroup(uses.get(Number(entry.id)) || []),
        groupLabel: FORMATION_GROUPS.find(([kind]) => kind === formationGroup(uses.get(Number(entry.id)) || []))[1],
        meta: `encounter-formation:${hex(entry.id)}`})),
        preview: value => renderModuleComponent('encounter-formation', 'preview',
          {entry: prepared.entries.find(entry => Number(entry.id) === Number(value))}), paint: hydrateModuleComponents}});
  }
  const [texts, scripts, facilities, extended, programs, documents, actors, logic, scenes, scriptDocument, story] = await Promise.all([
    prepareModuleComponent('text-record', 'reference'),
    prepareModuleComponent('story-interaction-script', 'reference'),
    prepareModuleComponent('facility-config', 'reference'),
    db.extendedApplicationCommands(), db.getResourceDocument('application-program'), db.listInterfaceStateDocuments(),
    db.getResourceDocument('scene-actor'), db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('story-interaction-script'), db.getDocument('project.story'),
  ]);
  for (const prepared of [texts, scripts, facilities]) if (prepared.error) throw new Error(prepared.error);
  if (!isCurrent()) return;
  const field = object.fields.find(field => field.entityHandle === entityHandle
    && field.fieldName === 'text_region');
  const permission = field?.physical?.binding?.input?.actor_interaction_permission || actors.writeback?.interaction_permission;
  const actor = !source || source.kind === 'actor';
  services = [...services, ...logic.investigation_handler_commands.filter(command =>
    !services.some(service => service.selector === command.command_id))
    .map(command => ({selector: command.command_id, label: command.facility_label}))];
  const nativeValue = source?.mapPoint ? `point:map-investigation:${source.mapPoint.handle}`
    : !actor ? sceneInteractionPointValue(source.kind, source.sceneId, source.record.id) : null;
  const pages = await preparePageInteractionEntries();
  const pageValues = new Map(pages.map(page => [`page:${page.page}:${page.key}`, page]));
  const currentScripts = new Map(sceneInteractionScriptPrograms(scriptDocument, story)
    .map(program => [Number(program.id), program]));
  const roleScriptValues = new Set();
  const candidates = [{value: '0:0', label: '无专用交互', group: 'none', groupLabel: '无'}];
  const previews = new Map([['0:0', () => `<p>无专用交互</p>${renderModuleComponent('text-record', 'preview',
    {value: permission?.unbound.fallback_reference || 'record:05:000', compact: false})}`]]);
  const templates = sceneInteractionTemplates(logic, scenes);
  const templateDestinations = new Map();
  if (source?.mapPoint) {
    candidates.push({value: nativeValue, label: '当前图块调查行为', group: 'investigation-tile', groupLabel: '图块调查'});
    previews.set(nativeValue, () => `<p>${esc(source.record.label || source.record.kind)}</p>`);
  }
  const exceptions = await loadSceneInteractionExceptions(db, {scenes, actors,
    story: state.project.story || await db.getDocument('project.story')});
  if (!isCurrent()) return;
  for (const entry of exceptions) {
    candidates.push(entry);
    const {kind, record, sceneId, key} = entry.object;
    const sceneHref = entry.scene ? `?${new URLSearchParams({view: 'scenes', scene: entry.scene.slug,
      sceneMode: 'logic', sceneObject: kind === 'autonomous' ? `actor:${record.id}` : key})}` : '';
    templateDestinations.set(entry.value, kind === 'autonomous'
      ? interactionEditorHref(entry.currentLabel) : sceneHref);
    previews.set(entry.value, async () => {
      let details = '';
      if (kind === 'autonomous') {
        const prepared = await prepareModuleComponent('story-autonomous-script', 'reference');
        if (prepared.error) throw new Error(prepared.error);
        details = prepared.entries.find(script => Number(script.id) === Number(record.autonomous_script_id))?.pickerDetails || '';
      } else if (kind === 'entry-story') details = `<p>${esc(record.trigger)}</p>`;
      else if (kind === 'tide') details = `<p>${['↑', '↓', '←', '→'][record.direction]} · ${esc(record.handle)}</p>`;
      return `<p>${esc(entry.label)}</p>${entry.scene ? renderModuleComponent('scene-header-map', 'preview',
        {entry: entry.scene, sceneId, interactive: false, width: 240, height: 150}) : ''}${details}`;
    });
  }
  for (const entry of templates) {
    if (entry.object.kind === 'treasure') entry.label = await treasureContentLabel(entry.object.record, logic.treasures);
    entry.label = `${entry.label} · ${entry.description}`;
    entry.filter += ` ${entry.label}`;
    const result = sceneInteractionDestinations(entry.object, {...context, logicIndex: logic, scenes,
      facilities: state.project.facilities, story: state.project.story, skipInvestigationTakeovers: true});
    templateDestinations.set(entry.value, result.targets.find(target => !target.effectiveObject)?.href);
    candidates.push(entry);
    previews.set(entry.value, async () => {
      const scope = await prepareSceneInteractionBinding({record: {interaction_binding: entry.value}},
        {...context, logicIndex: logic, scenes, facilities: state.project.facilities, story: state.project.story}, db);
      const target = sceneInteractionBoundObject({record: {interaction_binding: entry.value}}, scope);
      const current = sceneInteractionDestinations(target, {...scope, skipInvestigationTakeovers: true});
      templateDestinations.set(entry.value, current.targets.find(target => !target.effectiveObject)?.href);
      const content = target.kind === 'treasure' && sceneTreasureContent(target.record, logic.treasures);
      if (content) {
        entry.label = `${await treasureContentLabel(target.record, logic.treasures)} · ${entry.description}`;
      }
      const texts = content?.kind === 'buried-vehicle'
        ? ['record:05:198'] : current.targets.filter(target => target.record).map(target => target.record);
      return `<p>${esc(entry.label)}</p>${texts.map(value =>
        renderModuleComponent('text-record', 'preview', {value, compact: false})).join('')}`;
    });
  }
  for (const command of extended.filter(command => command.program_reference !== null)) {
    const value = `${EXTENDED_APPLICATION_SELECTOR}:${command.command_id}`;
    const program = programs.independent_programs.find(program => program.id === command.program_reference);
    const title = documents.find(document => document.command === command.command_id)?.title;
    candidates.push({value, label: title || command.label, currentLabel: `application-command:${hex(command.command_id)}`,
      group: 'extended-flow', groupLabel: '扩展流程',
      filter: `${title || command.label} ${command.command_id_hex} ${command.program_reference}`});
    previews.set(value, () => (program?.segments || []).flatMap(segment => segment.instructions)
      .filter(instruction => instruction.kind === 'text').map(instruction => renderModuleComponent('text-record', 'preview',
        {value: `record:06:${String(Number.parseInt(instruction.record.slice(-3), 16)).padStart(3, '0')}`, compact: false})).join(''));
  }
  for (const region of regions) for (let id = 0; id < Math.min(Number(region.record_count), 256); id++) {
    const handle = `record:${hex(region.id)}:${String(id).padStart(3, '0')}`;
    const value = `${Number(region.id)}:${id}`;
    candidates.push({value, label: `${handle} · ${currentTextReference(handle).label}`, currentLabel: handle,
      group: 'direct-dialogue', groupLabel: '直接对话文本',
      description: region.name, filter: `${handle} ${region.name} ${currentTextReference(handle).label}`});
    previews.set(value, () => renderModuleComponent('text-record', 'preview', {value: handle, compact: false}));
  }
  for (const entry of scripts.entries) {
    if (pages.some(page => page.id === entry.id)) continue;
    const value = `0:${entry.id}`;
    const bytes = scriptDocument.scripts.find(row => Number(row.id) === Number(entry.id))?.bytecode || [];
    const battle = story.interaction.entries.find(row => Number(row.id) === Number(entry.id))
      ?.reachable_cursors?.some(cursor => bytes[cursor] === 0x37);
    const requiresActor = !actor && sceneInteractionScriptActorDependency(currentScripts.get(Number(entry.id)));
    if (requiresActor) roleScriptValues.add(value);
    candidates.push({value, label: `${hex(entry.id)} · ${entry.label}`,
      currentLabel: `story-interaction-script:script:${hex(entry.id)}`,
      group: battle ? 'battle' : 'interaction-script', groupLabel: battle ? '战斗' : '交互动作脚本',
      filter: `${entry.id} ${entry.label}`,
      ...(requiresActor ? {disabled: true, previewOnly: true, description: SCENE_INTERACTION_ACTOR_REASON} : {})});
    previews.set(value, () => `${requiresActor ? `<p>${esc(SCENE_INTERACTION_ACTOR_REASON)}</p>` : ''}${entry.pickerDetails}`);
  }
  for (const [value, page] of pageValues) {
    const requiresActor = !actor && sceneInteractionScriptActorDependency(page.program);
    if (requiresActor) roleScriptValues.add(value);
    candidates.push({value, label: page.label, currentLabel: page.label,
      group: 'interaction-script', groupLabel: '交互动作脚本', filter: `${page.page} ${page.label}`,
      ...(requiresActor ? {disabled: true, previewOnly: true, description: SCENE_INTERACTION_ACTOR_REASON} : {})});
    previews.set(value, () => `${requiresActor ? `<p>${esc(SCENE_INTERACTION_ACTOR_REASON)}</p>` : ''}${page.pickerDetails}`);
  }
  if (!isCurrent()) return;
  const serviceConfigurations = new Map();
  const selectedArguments = new Map();
  const currentValues = () => Object.fromEntries(object.fields.filter(field => field.entityHandle === entityHandle)
    .map(field => [field.fieldName, field.value]));
  const interactionValues = () => {
    const values = currentValues();
    if (actor) return values;
    if (values.interaction_binding?.startsWith('actor:')) {
      const [, text_region, interaction_or_record_id] = values.interaction_binding.split(':').map(Number);
      return {text_region, interaction_or_record_id};
    }
    if (source.kind === 'investigation') return {text_region: logic.investigation_handler_commands
      .find(command => Number(command.selector) === values.handler_selector)?.command_id,
      interaction_or_record_id: values.instance_id};
    return {};
  };
  const editorHref = value => {
    if (templateDestinations.has(value)) return templateDestinations.get(value);
    if (pageValues.has(value)) return pageValues.get(value).href;
    if (value === '0:0') return interactionEditorHref(permission?.unbound.fallback_reference || 'record:05:000');
    if (value.startsWith(`${EXTENDED_APPLICATION_SELECTOR}:`)) return interactionEditorHref(
      `application-command:${hex(Number(value.split(':')[1]))}`);
    if (value.startsWith('service:')) {
      const selector = Number(value.split(':')[1]);
      const values = interactionValues();
      const argument = values.text_region === selector ? values.interaction_or_record_id : selectedArguments.get(selector);
      return interactionEditorHref(`application-command:${hex(selector)}`,
        sceneActorServiceInstance(selector, argument, permission));
    }
    const [region, id] = value.split(':').map(Number);
    return interactionEditorHref(region === 0 ? `story-interaction-script:script:${hex(id)}`
      : `record:${hex(region)}:${String(id).padStart(3, '0')}`);
  };
  for (const service of services) {
    const investigation = !actor && logic.investigation_handler_commands.find(command =>
      Number(command.command_id) === service.selector);
    const permitted = argument => investigation ? argument >= investigation.instance_min
      && argument <= investigation.instance_max
      : sceneActorInteractionPermitted({text_region: service.selector, interaction_or_record_id: argument}, permission);
    const count = Math.max(SCENE_SERVICE_INSTANCE_COUNTS.get(service.selector) || 256,
      (permission?.interactions.find(row => row.selector === service.selector)?.argument_max ?? -1) + 1);
    const label = service.label || `服务 ${hex(service.selector)}`;
    const value = `service:${service.selector}`;
    const records = [];
    for (let id = 0; id < count; id++) {
      const instance = sceneActorServiceInstance(service.selector, id, permission);
      const handle = `application-config-instance:${hex(service.selector - 0x10)}:${hex(instance)}`;
      const entry = facilities.entries.find(row => row.handle === handle);
      const products = entry ? productsForRecord(entry, entry) : [];
      records.push({id, id_hex: hex(id), label: entry ? facilityConfigurationLabel(entry, entry.values, id) : `配置 ${hex(id)}`, entry, products,
        disabled: !permitted(id)});
    }
    serviceConfigurations.set(service.selector, records);
    selectedArguments.set(service.selector, interactionValues().text_region === service.selector
      ? interactionValues().interaction_or_record_id : records.find(record => !record.disabled)?.id ?? 0);
    candidates.push({value, label, group: 'service-handler', groupLabel: '服务 / 功能入口',
      disabled: records.every(record => record.disabled),
      filter: `${hex(service.selector)} ${label} ${records.flatMap(record =>
        [record.entry?.handle, ...record.products.map(product => product.label)]).join(' ')}`});
    previews.set(value, () => {
      const argument = selectedArguments.get(service.selector);
      const record = records.find(record => record.id === argument);
      return `<p>${esc(label)}</p>${shopConfigurationPicker({family: {records}, recordId: argument,
        productsForRecord: (_family, record) => record.products,
        controlAttribute: 'data-scene-service-configuration', controlValue: service.selector,
        label: '配置', emptyLabel: '', countLabel: '项',
        labelForRecord: record => record.label,
        filterLabel: '搜索配置', filterPlaceholder: '配置编号或名称'})}
        ${record?.entry && !record.products.length ? renderModuleComponent('facility-config', 'preview', {entry: record.entry}) : ''}`;
    });
  }
  for (const candidate of candidates) {
    if (roleScriptValues.has(candidate.value)) continue;
    if (candidate.group === 'service-handler' || candidate.value.startsWith('point:')
        || candidate.value.startsWith('exception:') || pageValues.has(candidate.value)) continue;
    const [text_region, interaction_or_record_id] = candidate.value.split(':').map(Number);
    candidate.disabled = !sceneActorInteractionPermitted({text_region, interaction_or_record_id}, permission);
  }
  const activePoint = currentValues().interaction_binding || nativeValue;
  if (templateDestinations.has(activePoint)) await previews.get(activePoint)();
  if (!isCurrent()) return;
  mountFieldObjectRecordChoice(host, object, {
    entityHandle, fieldNames: ['interaction_binding', ...(actor ? ['text_region', 'interaction_or_record_id']
      : source.kind === 'investigation' ? ['handler_selector', 'instance_id'] : [])], label: '主动交互',
    choices: () => {
      const values = interactionValues();
      return candidates.filter(candidateFilter).map(candidate => {
        if (candidate.group !== 'service-handler') return candidate;
        const selector = Number(candidate.value.split(':')[1]);
        const argument = values.text_region === selector ? values.interaction_or_record_id : selectedArguments.get(selector);
        const record = serviceConfigurations.get(selector)?.find(row => row.id === argument);
        return {...candidate, currentLabel: `${candidate.label} · ${record?.label || hex(argument)}`};
      });
    },
    selected: values => values.interaction_binding?.startsWith('point:') ? values.interaction_binding
      : !actor && !values.interaction_binding && source.kind !== 'investigation' ? nativeValue
      : (() => {
        values = interactionValues();
        return values.text_region === EXTENDED_APPLICATION_SELECTOR ? bindingKey(values)
      : values.text_region >= 0x10 ? `service:${values.text_region}`
      : values.text_region === 0 && pages.some(page => page.id === values.interaction_or_record_id)
        ? [...pageValues].find(([, page]) => page.id === values.interaction_or_record_id)[0] : bindingKey(values);
      })(),
    valuesFor: async value => {
      if (roleScriptValues.has(value)) throw new TypeError(SCENE_INTERACTION_ACTOR_REASON);
      if (value.startsWith('point:')) return {interaction_binding: value === nativeValue ? '' : value};
      let values;
      if (pageValues.has(value)) {
        const page = pageValues.get(value);
        values = await db.allocateStoryPageInteraction(page.page, page.key);
        page.id = values.interaction_or_record_id;
      } else if (value.startsWith('service:')) {
        const text_region = Number(value.split(':')[1]);
        values = {text_region, interaction_or_record_id: selectedArguments.get(text_region)};
      } else {
        const [text_region, interaction_or_record_id] = value.split(':').map(Number);
        values = {text_region, interaction_or_record_id};
      }
      if (actor) return {...values, interaction_binding: ''};
      const native = source.kind === 'investigation' && logic.investigation_handler_commands
        .find(command => Number(command.command_id) === values.text_region);
      return native && values.interaction_or_record_id <= 15
        ? {handler_selector: native.selector, instance_id: values.interaction_or_record_id, interaction_binding: ''}
        : {interaction_binding: `actor:${bindingKey(values)}`};
    },
    picker: {moduleId: 'scene-actor', resettable: true, groupColumn: true, destination: editorHref,
      onOpen: () => {
        const values = interactionValues();
        for (const [selector, records] of serviceConfigurations) selectedArguments.set(selector,
          values.text_region === selector ? values.interaction_or_record_id
            : records.find(record => !record.disabled)?.id ?? 0);
      },
      writebackMissing: () => Boolean(currentValues().interaction_binding)
        && object.fields.find(field => field.entityHandle === entityHandle && field.fieldName === 'interaction_binding')
          ?.writeback?.state === 'unpermitted',
      preview: async value => {
        const markup = await previews.get(value)?.() || '';
        return `${interactionEditorLink(editorHref(value))}${markup}`;
      }, paint: async root => {
        await hydrateModuleComponents(root);
        const control = root.querySelector('[data-scene-service-configuration]');
        if (!control) return;
        bindReferencePicker(control.closest('[data-module-reference-picker]'), {paint: hydrateModuleComponents,
          onSelect: value => {
            const selector = Number(control.dataset.sceneServiceConfiguration);
            const argument = Number(value);
            if (!serviceConfigurations.get(selector)?.some(record => record.id === argument && !record.disabled)) return;
            selectedArguments.set(selector, argument);
          }});
      }},
  });
}

export { bindSceneInteractionPreview, dialoguePreviewFrames, mountSceneActorInteractionPicker, sceneInteractionFlowGraph, sceneInteractionMenuPreview, sceneInteractionPreviewMarkup, sceneInteractionPreviewTarget };
