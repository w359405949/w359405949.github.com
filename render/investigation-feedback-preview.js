// @editor-module 调查反馈引用当前文字、奖励参数和场景元图块。
import {db} from '../core/project-db.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {saveFields} from '../core/save-editor-session.js';
import {TILE_ACTION_OWNER, TILE_ACTION_HANDLE} from '../core/scene-tile-action-owner.js';
import {loadSceneMetatileRenderer} from '../modules/scene/visual-preview.js';
import {loadScenePreviewSourceById, paintScenePreview} from '../modules/scene/preview.js';
import {sceneActorVisualRaster} from './scene-actor-appearance.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';

const hex = id => Number(id).toString(16).toUpperCase().padStart(2, '0');
const text = id => `record:05:${String(id).padStart(3, '0')}`;
const roles = ['hunter', 'mechanic', 'soldier'];

function acquisitionSaveState(call) {
  const slot = interfacePreviewContext().slot;
  if (!saveFields.ready() || !saveFields.slotStatus(slot).valid) return null;
  const prefix = `save.slot.${slot}`;
  const flag = call.acquisition_condition.flag_reference.split(':').at(-1);
  const recipient = roles.find(role => saveFields.object(`${prefix}.role.${role}.present`).value
    && saveFields.object(`${prefix}.role.${role}.inventory`).value.includes(0));
  return {unavailable: Boolean(saveFields.object(`${prefix}.global_event_flag.${flag}`).value), recipient};
}

export function investigationFeedbackEntries(object, {calls, encounters, acquisition}, interactionPreview) {
  const call = object.kind === 'investigation-special' && calls?.reward_calls?.find(call =>
    call.handler_prg === object.record.handler_prg && call.kind === object.record.kind);
  if (call) {
    const context = encounters.views.dispatch_result_parameters.find(row =>
      `encounter-trigger-runtime:context:${row.context_id}` === call.context_reference);
    if (!context || !acquisition.result_records) throw new TypeError('调查奖励反馈来源未发布');
    const current = call.acquisition_condition ? acquisitionSaveState(call) : null;
    if (current?.unavailable) {
      const record = call.acquisition_condition.unavailable_feedback.record;
      return [{record, label: '调查反馈', preview: {...interactionPreview(record),
        preview_entity_types: ['role', 'save-slot'],
        investigation_feedback: {kind: 'item', object, context_reference: call.context_reference,
          item_index: 0, phase: 'unavailable'}}}];
    }
    return call.item_references.flatMap((item, index) => [
      {record: text(context.when_result_code_is_standard), label: `发现 · ${item}`,
        phase: 'discovery', item, index},
      {record: acquisition.result_records.success.record, label: `取得 · ${item}`,
        phase: 'success', item, index},
      {record: acquisition.result_records.full.record, label: `携带已满 · ${item}`,
        phase: 'full', item, index},
    ]).filter(entry => !current || entry.phase === 'discovery'
      || entry.phase === (current.recipient ? 'success' : 'full'))
      .map(entry => ({...entry, preview: {...interactionPreview(entry.record),
      ...(call.acquisition_condition ? {preview_entity_types: ['role', 'save-slot']} : {}),
      investigation_feedback: {kind: 'item', object, context_reference: call.context_reference,
        item_index: entry.index, phase: entry.phase}}}));
  }
  if (object.kind === 'investigation-tile' && object.record.behavior_code === 0x54) {
    const audio = calls.records.find(record => record.handle === TILE_ACTION_HANDLE).audio_command;
    return ['before', 'after'].map(phase => ({label: phase === 'before' ? '调查前'
      : `调查后 · audio-command:${hex(audio)}`,
      preview: {id: `investigation-feedback:${object.uid}:${phase}`, viewport: {x: 0, y: 0, width: 256, height: 240},
        layers: [], investigation_feedback: {kind: 'tile', object, phase}}}));
  }
  return null;
}

export async function investigationFeedbackAudioCommand(preview) {
  const {kind, phase} = preview?.investigation_feedback || {};
  if (kind === 'tile' && phase === 'after') {
    const field = await db.getField(TILE_ACTION_OWNER, TILE_ACTION_HANDLE, 'audio_command');
    return field.value;
  }
  if (kind === 'item' && phase === 'success') {
    const acquisition = await db.getResourceDocument('item-acquisition-service');
    return Number.parseInt(acquisition.result_records.audio_reference.split(':').at(-1), 16);
  }
  return null;
}

export async function resolveInvestigationFeedbackPreview(preview) {
  const binding = preview.investigation_feedback;
  if (!binding) return preview;
  const {object} = binding;
  let {phase} = binding;
  if (binding.kind === 'item') {
    const [calls, encounters, acquisition, origin] = await Promise.all([
      db.getResourceDocument(TILE_ACTION_OWNER), db.getResourceDocument('encounter-trigger-runtime'),
      db.getResourceDocument('item-acquisition-service'),
      fieldSubmenuCodeValues(['menu-text-origin-low', 'menu-text-origin-high']),
    ]);
    const call = calls.reward_calls.find(call => call.handler_prg === object.record.handler_prg);
    const context = encounters.views.dispatch_result_parameters.find(row =>
      `encounter-trigger-runtime:context:${row.context_id}` === binding.context_reference);
    if (!call || !context) throw new TypeError('所选调查缺奖励调用来源');
    const current = call.acquisition_condition ? acquisitionSaveState(call) : null;
    if (current?.unavailable) phase = 'unavailable';
    else if (current && phase !== 'discovery') phase = current.recipient ? 'success' : 'full';
    if (phase === 'unavailable') {
      const record = call.acquisition_condition.unavailable_feedback.record;
      const actor = interfacePreviewContext().role ?? 0;
      const name = `save.slot.${interfacePreviewContext().slot}.role.${roles[actor]}.name_codes`;
      const body = preview.layers.findLast(layer => layer.kind === 'script');
      return {...preview, layers: preview.layers.map(layer => layer === body
        ? {...layer, record, record_calls: [{record, cursor: layer.cursor, line_count: 0,
          ...(current ? {provider_script_hex: {7: fixedRuntimeTextScriptHex(
            saveNameTextSource(saveFields.object(name), saveFields.object(name).value))}} : {})}],
          confirmed_waits: preview.runtime_context?.confirmed_waits ?? 0} : layer)};
    }
    const record = phase === 'discovery' ? text(context.when_result_code_is_standard)
      : acquisition.result_records[phase === 'full' ? 'full' : 'success'].record;
    const itemHandle = call.item_references[binding.item_index];
    const item = await db.get(itemHandle);
    if (!item?.name_source) throw new TypeError('调查物品缺名称引用');
    const slot = interfacePreviewContext().slot;
    let discoveryName = null, resultName = null;
    if (interfacePreviewContext().actor.startsWith('save-')
        && saveFields.ready() && saveFields.slotStatus(slot).valid) {
      const actor = interfacePreviewContext().role ?? 0;
      const role = phase === 'success' ? current?.recipient || roles.find(role =>
        saveFields.object(`save.slot.${slot}.role.${role}.present`).value
        && saveFields.object(`save.slot.${slot}.role.${role}.inventory`).value.includes(0)) : roles[actor];
      discoveryName = `save.slot.${slot}.role.${roles[actor]}.name_codes`;
      if (role) resultName = `save.slot.${slot}.role.${role}.name_codes`;
    }
    const body = preview.layers.findLast(layer => layer.kind === 'script');
    const provider = path => path ? {provider_script_hex: {7: fixedRuntimeTextScriptHex(
      saveNameTextSource(saveFields.object(path), saveFields.object(path).value))}} : {};
    const discovery = text(context.when_result_code_is_standard);
    const resultCursor = (fieldSubmenuCodeValue(origin, 'menu-text-origin-high') - 0x60) * 256
      + fieldSubmenuCodeValue(origin, 'menu-text-origin-low') + acquisition.result_records.cursor_offset + body.line_origin;
    const recordCalls = [{record: discovery, cursor: body.cursor, line_count: 0, ...provider(discoveryName)},
      ...(phase === 'discovery' ? [] : [{record, cursor: resultCursor,
        line_count: 2, ...provider(resultName)}])];
    return {...preview, layers: preview.layers.map(layer => layer === body ? {...layer, record,
      record_calls: recordCalls, confirmed_waits: phase === 'discovery'
        ? preview.runtime_context?.confirmed_waits ?? 0 : 255,
      runtime_record_pair: `record:00:${String(item.name_source.record_id).padStart(3, '0')}`,
      } : layer)};
  }
  const sceneDocument = await db.getResourceDocument(`scene:${hex(object.sceneId)}`);
  const scene = sceneDocument.scene || sceneDocument;
  const x = object.record.x, y = object.record.y;
  const cameraX = x - 8, cameraY = y - 7;
  const background = await loadScenePreviewSourceById(object.sceneId, {view: 'viewport', cameraX, cameraY});
  if (!background) throw new TypeError('调查地图动作缺场景视口');
  const surface = document.createElement('canvas');
  const action = await db.getFieldObject(TILE_ACTION_OWNER, TILE_ACTION_HANDLE);
  const field = name => action.fields.find(field => field.fieldName === name).value;
  const renderer = phase === 'after' ? await loadSceneMetatileRenderer(scene) : null;
  const types = await db.getResourceDocument('party-field-actor-type-map');
  const role = interfacePreviewContext().role ?? 0;
  const actorType = Number.parseInt(types.living_actor_types[role].split(':').at(-1), 16);
  const raster = await sceneActorVisualRaster({actor_type: actorType, direction: 0}, scene);
  await paintScenePreview(surface, {scene, surface: background, renderer, cameraX, cameraY,
    cells: phase === 'after' ? [{x, y, metatile_id: field('replacement_metatile')}] : [],
    actors: raster ? [{raster, x, y}] : []});
  return {...preview, layers: [{kind: 'prepared_interface_window', interface_background: true, output: {surface,
      rectangle: {x: 0, y: 0, width: 256, height: 240}}}]};
}
