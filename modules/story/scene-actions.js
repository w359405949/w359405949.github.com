// @editor-module 自主脚本字段对象为场景提供语义操作数控件。
import {esc} from '../../core/dom.js';
import {storySceneActions, storySceneActionPresentation} from '../../core/story-scene-actions.js';
import {sceneCameraCoordinate, sceneCameraByte} from '../../core/story-camera.js';
import {mountFieldObjectField, mountFieldObjectArrayPosition, mountFieldObjectArrayReference} from '../../ui/field-object-editor.js';
import {prepareModuleComponent} from '../../ui/module-components.js';
import {storyCommandOperandReference} from './operand-references.js';
import {saveEventHref} from '../../core/save-page-links.js';
import {actorAppearanceContextForScene} from '../../ui/actor-appearance.js';
import {mountStoryInsertedOperand} from './script-structure-controls.js';
import '../components.js';

export async function mountStorySceneActions(host, record, context, database, sceneId = Number(record.entry_id)) {
  const scripts = context.autonomous || await database.getResourceDocument('story-autonomous-script');
  if (!host.isConnected) return;
  const actions = storySceneActions(record, scripts, context.story);
  if (!actions.length) return;
  const handles = [...new Set(actions.flatMap(action => {
    const presentation = storySceneActionPresentation(action);
    return presentation ? [...presentation.operands.map(({index}) => action.operandFields[index].entityHandle),
      ...(presentation.destination ? [action.handle] : [])] : [];
  }))];
  const objects = new Map(await Promise.all(handles.map(async handle => [handle,
    await database.getFieldObject('story-autonomous-script', handle)])));
  const references = new Map(await Promise.all([...new Set(actions.flatMap(action =>
    (storySceneActionPresentation(action)?.operands || []).map(({index}) =>
      storyCommandOperandReference(action.command, action.semantic, index, action.operands)?.module)
      .filter(module => module && module !== 'scene-header-map')))].map(async module =>
    [module, await prepareModuleComponent(module === 'global-event-flag' ? 'save-container' : module,
      module === 'global-event-flag' ? 'event-flag-reference' : 'reference')])));
  const appearance = references.has('actor-type') ? actorAppearanceContextForScene(
    (await database.getResourceDocument(`scene:${sceneId.toString(16).toUpperCase().padStart(2, '0')}`)).scene) : null;
  if (!host.isConnected) return;
  const section = document.createElement('section');
  section.dataset.storySceneActions = actions[0].handle;
  const labels = context.story.browser_vm.scene_action_labels?.find(row =>
    row.handle === actions[0].handle);
  section.innerHTML = `<h3>${esc(labels?.label || '自主动作')} <a class="editor-inline-link"
    href="?view=actors&actorPart=story&storyKind=autonomous&record=${Number(record.autonomous_script_id)}">↗</a></h3>
    <table class="data-table field-object-action-table"><thead><tr><th>动作</th><th>值</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead><tbody></tbody></table>`;
  host.append(section);
  const body = section.querySelector('tbody');
  const rowControls = label => {
    const row = body.insertRow();
    row.insertCell().textContent = label;
    const control = row.insertCell(), resetHost = row.insertCell();
    resetHost.className = 'reset-column';
    return {control, resetHost};
  };
  const operand = async (action, index, label) => {
    const {control, resetHost} = rowControls(label);
    control.dataset.storySceneOperand = `${action.cursor}:${index}`;
    const field = action.operandFields[index];
    if (field.tokenId) {
      mountStoryInsertedOperand(control, objects.get(field.entityHandle), {...field, label});
      return;
    }
    const options = {entityHandle: field.entityHandle, fieldName: 'bytecode',
      byteIndex: field.byteIndex, label, resetHost};
    const target = storyCommandOperandReference(action.command, action.semantic, index, action.operands);
    if (target) {
      control.dataset.storySceneReference = target.module;
      control.classList.add('field-object-linked-reference');
      const variableRegion = target.module === 'text-record' && action.command.opcode === 0x26;
      await mountFieldObjectArrayReference(control, objects.get(field.entityHandle), {...options,
        indices: variableRegion ? [action.operandFields[0].byteIndex, field.byteIndex] : [field.byteIndex],
        moduleId: target.module === 'global-event-flag' ? 'save-container' : target.module,
        kind: target.module === 'global-event-flag' ? 'event-flag-reference' : 'reference',
        prepared: {...references.get(target.module),
          ...(target.module === 'actor-type' ? appearance : {}),
          ...(target.module === 'text-record' && !variableRegion ? {regionId: target.regionId} : {}),
          ...(target.module === 'direct-frame' ? {reference: {module: target.module, key: ['id']}} : {})},
        ...(target.module === 'actor-type' ? {candidateSelector: '[data-actor-appearance-option]',
          candidateValue: row => row.dataset.actorAppearanceOption} : {}),
        ...(variableRegion ? {
          decode: ([region, record]) => `record:${region.toString(16).toUpperCase().padStart(2, '0')}:${String(record).padStart(3, '0')}`,
          encode: value => [parseInt(value.split(':')[1], 16), Number(value.split(':')[2])],
        } : {}),
      });
      if (target.module === 'global-event-flag') control.insertAdjacentHTML('beforeend',
        `<a class="editor-inline-link" href="${esc(saveEventHref(1, action.operands[index]))}">↗</a>`);
    } else mountFieldObjectField(control, objects.get(field.entityHandle), options);
  };
  const position = (action, indices, label, destination = false) => {
    const {control, resetHost} = rowControls(label);
    control.dataset.storyScenePosition = `${action.cursor}:${indices.join(',')}`;
    if (destination) control.dataset.storySceneDestination = String(action.cursor);
    const fields = indices.map(index => action.operandFields[index]);
    const handle = fields[0].entityHandle;
    if (fields.some(field => field.entityHandle !== handle)) throw new TypeError('坐标组跨脚本字段');
    mountFieldObjectArrayPosition(control, objects.get(handle), {entityHandle: handle,
      fieldName: 'bytecode', indices: fields.map(field => field.byteIndex),
      entries: context.scenes.editable_scenes, label, resetHost,
      ...(destination ? {anchor: [8, 7], decodeCoordinate: sceneCameraCoordinate,
        encodeCoordinate: sceneCameraByte} : {sceneId}),
    });
  };
  for (const action of actions) {
    const presentation = storySceneActionPresentation(action);
    if (!presentation) continue;
    const start = body.rows.length;
    const coordinates = ['set-actor-position', 'move-actor-to-position',
      'branch-on-player-position-exact'].includes(action.operation) ? [[0, 1]]
      : ['branch-on-player-position-rectangle', 'wander-inside-rectangle'].includes(action.operation)
        ? [[0, 2], [1, 3]] : [];
    if (action.command.instructionSource?.kind === 'sequence') coordinates.length = 0;
    const grouped = new Set(coordinates.flat());
    for (const [part, indices] of coordinates.entries()) position(action, indices,
      coordinates.length === 1 ? presentation.label : `${presentation.label} · ${part ? '上界' : '起点'}`);
    for (const {index, label} of presentation.operands) {
      if (grouped.has(index) || action.command.opcode === 0x26 && index === 0) continue;
      await operand(action, index, label);
    }
    if (presentation.destination && action.command.instructionSource?.kind !== 'sequence') {
      position(action, [0, 1, 2], labels?.destinations?.[action.cursor] || '目的地', true);
    } else if (presentation.destination) {
      for (const index of [0, 1, 2]) await operand(action, index, ['场景', 'X', 'Y'][index]);
    }
    if (body.rows.length === start) {
      const row = body.insertRow();
      row.insertCell().textContent = presentation.label;
      row.insertCell().textContent = presentation.value;
      row.insertCell().textContent = '—';
    }
    const first = body.rows[start];
    first.dataset.storySceneCommand = String(action.cursor);
    first.dataset.storySceneOperation = action.operation;
    first.cells[0].title = presentation.label;
    if (presentation.operands.length && presentation.value)
      first.cells[0].append(` · ${presentation.value}`);
  }
  if (!body.rows.length) section.remove();
  else section.dataset.storySceneActionsReady = '1';
}
