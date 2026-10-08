// @editor-module 角色交互方式与目标共用一个字段对象选择控件。
import {esc} from '../core/dom.js';
import {currentTextReference} from '../core/resource-index.js';
import {SCENE_SERVICE_INSTANCE_COUNTS} from '../core/scene-service-families.js';
import {sceneActorInteractionPermitted, sceneActorServiceInstance} from '../core/scene-actor-compiler.js';
import {mountFieldObjectRecordChoice} from './field-object-editor.js';
import {shopConfigurationPicker} from './shop-configuration-picker.js';
import {facilityConfigurationLabel} from '../modules/facility/configuration-summary.js';
import {bindReferencePicker, referencePickerMarkup} from './reference-picker.js';
import {db} from '../core/project-db.js';
import {EXTENDED_APPLICATION_SELECTOR} from '../core/application-program-format.js';
import {actorInteractionMode, sceneInteractionDestinations} from '../core/scene-interaction-destinations.js';
import {uiJsRenderSources, uiDialogueRecordSources, uiPaintDialogueCanvas, paintUiConstructionSemanticPreview} from '../modules/visual/ui-construction-preview.js';
import {fieldMenuInteractionPreview, fieldMenuCurrentInvestigationPreview} from '../modules/visual/field-menu.js';
import {sceneServicePreviewEntries} from '../render/service-preview.js';
import {investigationFeedbackEntries, investigationFeedbackAudioCommand} from '../render/investigation-feedback-preview.js';
import {state} from '../core/state.js';
import {prepareViewData} from '../core/view-data.js';
import {createAudioTimelinePlayer} from '../audio/timeline-player.js';
import {previewSoundEnabled} from '../audio/preview-preference.js';
import {prepareStoryReferenceDetails} from '../modules/story/reference-details.js';
import {interactionEditorHref, interactionEditorLink} from './interaction-editor-links.js';
import {hydrateModuleComponents, prepareModuleComponent, renderModuleComponent} from './module-components.js';
import '../modules/text/components.js';
import '../modules/story/interaction-components.js';
import '../modules/facility/components.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const bindingKey = values => `${Number(values.text_region)}:${Number(values.interaction_or_record_id)}`;
const previewSelections = new Map();
const previewDialogues = new Map();
const previewFrames = new Map();
const previewTargets = new Map();
let investigationAudio = null;

export function sceneInteractionPreviewTarget(pageId) {
  return previewTargets.get(pageId) || null;
}

async function preparePageInteractionEntries() {
  return Promise.all((await db.storyPageInteractionEntries()).map(async page => {
    const [entry] = await prepareStoryReferenceDetails({}, 'interaction', [{id: page.program.id}], [page.program], page.textDisplays);
    return {...page, ...entry, id: page.id,
      href: `?view=story-page&storyPage=${encodeURIComponent(page.page)}&storyPaused=1`};
  }));
}

export function sceneInteractionMenuPreview(pageId, fallbackRecord = null) {
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

export function sceneInteractionPreviewMarkup(pageId) {
  return `<div class="screen-workbench-inspector-body" data-field-interaction-target="${esc(pageId)}"></div>`;
}

export async function bindSceneInteractionPreview(host, options = {}) {
  if (!host) return;
  const selected = previewSelections.get(host.dataset.fieldInteractionTarget);
  if (selected && selected !== 'none') return prepareSceneInteractionPreview(host, {...options, lazyCandidates: true});
  host.innerHTML = referencePickerMarkup({moduleId: 'scene-actor', label: '正文',
    value: 'none', items: [{value: 'none', label: '默认正文', group: 'none', groupLabel: '正文'}],
    grouped: true, previewPanel: true, pageSize: 24, componentAttributes: 'data-field-interaction-picker'});
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

async function prepareSceneInteractionPreview(host, {repaint = () => {}, rerender = null, previewInStage = false, lazyCandidates = false} = {}) {
  if (!host) return;
  const pageId = host.dataset.fieldInteractionTarget;
  const investigation = pageId === 'field-investigation';
  if (investigation && previewSoundEnabled()) await prepareViewData('audio');
  const [actors, logic, scenes, story, facilities, scripts, metatileSets, calls, encounters, acquisition, scriptDocument] = await Promise.all([
    db.getDocument('scene-actor'), db.getDocument('project.scenes.logic'),
    db.getDocument('project.scenes'), db.getDocument('project.story'),
    db.getDocument('project.facilities'), prepareModuleComponent('story-interaction-script', 'reference'),
    db.getResourceDocument('metatile-set'),
    db.getResourceDocument('nearby-object-investigation-service'),
    db.getResourceDocument('encounter-trigger-runtime'),
    db.getResourceDocument('item-acquisition-service'),
    db.getResourceDocument('story-interaction-script'),
  ]);
  if (!host.isConnected) return;
  if (scripts.error) throw new Error(scripts.error);
  const pages = await preparePageInteractionEntries();
  if (!host.isConnected) return;
  const entries = [...pages.filter(page => Number.isInteger(page.id)),
    ...scripts.entries.filter(entry => !pages.some(page => page.id === entry.id))];
  const context = {logicIndex: logic, scenes, story, facilities, metatileSets, tileActions: calls,
    storyPageInteractions: pages};
  const rows = [
    ...actors.records.filter(record => actorInteractionMode(record) !== 'none').map(record =>
      ({kind: 'actor', record, sceneId: record.entry_id, uid: record.uid, key: `actor:${record.id}`})),
    ...[['investigation', 'investigation_points'], ['investigation-special', 'investigation_special_points'],
      ['investigation-tile', 'metatile_investigation_points'], ['treasure', 'treasures']].flatMap(([kind, key]) =>
      (logic[key] || []).map(record => ({kind, record, sceneId: record.scene_id,
        uid: `${kind}:${hex(record.scene_id)}:${hex(record.id)}`, key: `${kind}:${record.id}`}))),
  ];
  const selectedValue = previewSelections.get(pageId);
  const candidates = lazyCandidates ? rows.filter(row => selectedValue?.startsWith(`${row.uid}:fragment:`)) : rows;
  const targets = await db.reusePreviewProjection('scene-interaction-preview-targets', [pageId,
    lazyCandidates, lazyCandidates ? selectedValue : null,
    actors, logic, scenes, story, facilities, metatileSets, calls, encounters, acquisition, scriptDocument,
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
      const feedback = investigationFeedbackEntries(object, {calls, encounters, acquisition},
        record => fieldMenuInteractionPreview(record, pageId));
      const dialogues = feedback || (mode === 'direct-dialogue'
        ? [{record: `record:${hex(record.text_region)}:${String(record.interaction_or_record_id).padStart(3, '0')}`,
            interactionWindow: true}]
        : mode === 'service-handler' || result.applications.length && !script
          ? sceneServicePreviewEntries(result.applications, object.sceneId,
            object.kind === 'investigation' ? `scene:${hex(object.sceneId)}:investigation:${hex(object.record.id)}` : null)
        : script?.dialogues?.flatMap(dialogue => dialogue.application
          ? sceneServicePreviewEntries([dialogue.application], object.sceneId) : [dialogue])
          || result.targets.filter(target => target.record)
          .map(target => ({record: target.record, label: target.condition, interactionWindow: true})));
      const href = mode === 'interaction-script'
        ? script?.href || interactionEditorHref(`story-interaction-script:script:${hex(record.interaction_or_record_id)}`)
        : mode === 'direct-dialogue' ? interactionEditorHref(dialogues[0].record)
          : result.targets.find(target => target.application)?.href || result.targets[0]?.href;
      return dialogues.map((dialogue, index) => ({...object, scene, mode, href, result, script,
        uid: `${object.uid}:fragment:${index}`, objectUid: object.uid, dialogues: [dialogue],
        label: dialogue.label || (dialogue.record ? currentTextReference(dialogue.record).label : '') || object.uid,
        previewKey: `${dialogue.fragmentId || dialogue.record || object.uid}:${dialogue.preview?.id || ''}`,
        group: dialogue.preview?.facility_branch_source || result.applications.length ? 'service'
          : object.kind === 'actor' ? 'dialogue' : 'investigation',
      }));
    }).filter(row => !seenPreviews.has(row.previewKey) && seenPreviews.add(row.previewKey));
  }, {sources: [{kind: 'field', id: 'text-record'}]});
  if (!host.isConnected) return;
  let selected = targets.find(row => row.uid === previewSelections.get(pageId)) || null;
  previewTargets.set(pageId, selected);
  const groups = {dialogue: '普通对话', service: '服务片段', investigation: '调查反馈'};
  host.innerHTML = referencePickerMarkup({moduleId: 'scene-actor', label: '正文',
    value: selected?.uid || 'none', grouped: true, previewPanel: true, pageSize: 24,
    componentAttributes: 'data-field-interaction-picker',
    items: [{value: 'none', label: '默认正文', group: 'none', groupLabel: '正文'},
      ...targets.map(row => ({value: row.uid, label: row.label, group: row.group,
        groupLabel: groups[row.group], description: `${row.scene?.name || hex(row.sceneId)} · ${row.record.x}, ${row.record.y}`,
        meta: row.mode === 'direct-dialogue' ? row.dialogues[0]?.record : row.script?.label || row.record.facility_label || '',
        details: `${row.dialogues.slice(0, 1).filter(item => item.record).map(item => renderModuleComponent('text-record', 'preview',
          {value: item.record, compact: true})).join('')}${interactionEditorLink(row.href)}`,
        filter: `${row.uid} ${row.scene?.name} ${row.script?.label || ''} ${row.dialogues.filter(item => item.record).map(item => currentTextReference(item.record).label).join(' ')}`,
      }))]}) + '<div data-field-interaction-content></div>';
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
      const preview = dialogue.preview || fieldMenuInteractionPreview(dialogue.record, pageId);
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
  const picker = host.querySelector('[data-field-interaction-picker]');
  bindReferencePicker(picker, {paint: hydrateModuleComponents});
  picker.addEventListener('module-reference-change', event => {
    if (event.target !== picker) return;
    void (async () => {
      const value = event.detail.value;
      delete host.dataset.fieldInteractionReady;
      selected = targets.find(row => row.uid === value) || null;
      previewTargets.set(pageId, selected);
      previewSelections.set(pageId, selected?.uid || 'none');
      previewFrames.delete(pageId);
      await paint();
      await rerender?.();
      await playFeedback();
    })().catch(error => {
      if (host.isConnected) host.insertAdjacentHTML('beforeend', `<p role="alert">${esc(error.message)}</p>`);
    });
  });
  if (lazyCandidates) bindInteractionPreviewCandidates(host, {repaint, rerender, previewInStage});
  if (!previewInStage || selected?.dialogues[previewFrames.get(pageId) || 0] !== previewDialogues.get(pageId)) {
    await paint();
  }
  host.dataset.fieldInteractionReady = '1';
}

export async function mountSceneActorInteractionPicker(host, object, {entityHandle, regions, services, productsForRecord}) {
  const [texts, scripts, facilities, extended, programs, documents] = await Promise.all([
    prepareModuleComponent('text-record', 'reference'),
    prepareModuleComponent('story-interaction-script', 'reference'),
    prepareModuleComponent('facility-config', 'reference'),
    db.extendedApplicationCommands(), db.getResourceDocument('application-program'), db.listInterfaceStateDocuments(),
  ]);
  for (const prepared of [texts, scripts, facilities]) if (prepared.error) throw new Error(prepared.error);
  if (!host.isConnected) return;
  const field = object.fields.find(field => field.entityHandle === entityHandle
    && field.fieldName === 'text_region');
  const permission = field?.physical?.binding?.input?.actor_interaction_permission;
  const pages = await preparePageInteractionEntries();
  const pageValues = new Map(pages.map(page => [`page:${page.page}:${page.key}`, page]));
  const candidates = [{value: '0:0', label: '无专用交互', group: 'none', groupLabel: '无'}];
  const previews = new Map([['0:0', () => `<p>无专用交互</p>${renderModuleComponent('text-record', 'preview',
    {value: permission?.unbound.fallback_reference || 'record:05:000', compact: false})}`]]);
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
    candidates.push({value, label: `${hex(entry.id)} · ${entry.label}`,
      currentLabel: `story-interaction-script:script:${hex(entry.id)}`,
      group: 'interaction-script', groupLabel: '交互动作脚本', filter: `${entry.id} ${entry.label}`});
    previews.set(value, () => entry.pickerDetails);
  }
  for (const [value, page] of pageValues) {
    candidates.push({value, label: page.label, currentLabel: page.label,
      group: 'interaction-script', groupLabel: '交互动作脚本', filter: `${page.page} ${page.label}`});
    previews.set(value, () => page.pickerDetails);
  }
  const serviceConfigurations = new Map();
  const selectedArguments = new Map();
  const currentValues = () => Object.fromEntries(object.fields.filter(field => field.entityHandle === entityHandle)
    .map(field => [field.fieldName, field.value]));
  const editorHref = value => {
    if (pageValues.has(value)) return pageValues.get(value).href;
    if (value === '0:0') return interactionEditorHref(permission?.unbound.fallback_reference || 'record:05:000');
    if (value.startsWith(`${EXTENDED_APPLICATION_SELECTOR}:`)) return interactionEditorHref(
      `application-command:${hex(Number(value.split(':')[1]))}`);
    if (value.startsWith('service:')) {
      const selector = Number(value.split(':')[1]);
      const values = currentValues();
      const argument = values.text_region === selector ? values.interaction_or_record_id : selectedArguments.get(selector);
      return interactionEditorHref(`application-command:${hex(selector)}`,
        sceneActorServiceInstance(selector, argument, permission));
    }
    const [region, id] = value.split(':').map(Number);
    return interactionEditorHref(region === 0 ? `story-interaction-script:script:${hex(id)}`
      : `record:${hex(region)}:${String(id).padStart(3, '0')}`);
  };
  for (const service of services) {
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
        disabled: !sceneActorInteractionPermitted({text_region: service.selector, interaction_or_record_id: id}, permission)});
    }
    serviceConfigurations.set(service.selector, records);
    selectedArguments.set(service.selector, records.find(record => !record.disabled)?.id ?? 0);
    candidates.push({value, label, group: 'service-handler', groupLabel: '服务 / 功能入口',
      previewOnly: true, disabled: records.every(record => record.disabled),
      filter: `${hex(service.selector)} ${label} ${records.flatMap(record =>
        [record.entry?.handle, ...record.products.map(product => product.label)]).join(' ')}`});
    previews.set(value, () => {
      const values = currentValues();
      const argument = values.text_region === service.selector ? values.interaction_or_record_id
        : selectedArguments.get(service.selector);
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
    if (candidate.group === 'service-handler' || pageValues.has(candidate.value)) continue;
    const [text_region, interaction_or_record_id] = candidate.value.split(':').map(Number);
    candidate.disabled = !sceneActorInteractionPermitted({text_region, interaction_or_record_id}, permission);
  }
  mountFieldObjectRecordChoice(host, object, {
    entityHandle, fieldNames: ['text_region', 'interaction_or_record_id'], label: '主动交互',
    choices: () => {
      const values = currentValues();
      return candidates.map(candidate => {
        if (candidate.group !== 'service-handler') return candidate;
        const selector = Number(candidate.value.split(':')[1]);
        const argument = values.text_region === selector ? values.interaction_or_record_id : selectedArguments.get(selector);
        const record = serviceConfigurations.get(selector)?.find(row => row.id === argument);
        return {...candidate, currentLabel: `${candidate.label} · ${record?.label || hex(argument)}`};
      });
    },
    selected: values => values.text_region === EXTENDED_APPLICATION_SELECTOR ? bindingKey(values)
      : values.text_region >= 0x10 ? `service:${values.text_region}`
      : values.text_region === 0 && pages.some(page => page.id === values.interaction_or_record_id)
        ? [...pageValues].find(([, page]) => page.id === values.interaction_or_record_id)[0] : bindingKey(values),
    valuesFor: async value => {
      if (pageValues.has(value)) {
        const page = pageValues.get(value);
        const values = await db.allocateStoryPageInteraction(page.page, page.key);
        page.id = values.interaction_or_record_id;
        return values;
      }
      if (value.startsWith('service:')) {
        const text_region = Number(value.split(':')[1]);
        return {text_region, interaction_or_record_id: selectedArguments.get(text_region)};
      }
      const [text_region, interaction_or_record_id] = value.split(':').map(Number);
      return {text_region, interaction_or_record_id};
    },
    picker: {moduleId: 'scene-actor', resettable: true, destination: editorHref,
      preview: value => `${interactionEditorLink(editorHref(value))}${previews.get(value)?.() || ''}`, paint: async root => {
        await hydrateModuleComponents(root);
        const control = root.querySelector('[data-scene-service-configuration]');
        if (!control) return;
        bindReferencePicker(control.closest('[data-module-reference-picker]'), {paint: hydrateModuleComponents,
          onSelect: value => {
            const selector = Number(control.dataset.sceneServiceConfiguration);
            const argument = Number(value);
            if (!serviceConfigurations.get(selector)?.some(record => record.id === argument && !record.disabled)) return;
            selectedArguments.set(selector, argument);
            const choice = host.querySelector('[data-field-object-record-choice]');
            choice.value = `service:${selector}`;
            choice.dispatchEvent(new Event('change', {bubbles: true}));
          }});
      }},
  });
}
