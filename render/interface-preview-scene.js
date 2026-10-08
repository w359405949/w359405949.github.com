// @editor-module 明确选择的界面背景只由场景进入现场绘制。
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {prepareSaveEditorWorkspace} from '../core/save-editor-session.js';
import {saveCurrentValue} from '../core/save-codec.js';
import {createSceneActionCore} from '../core/scene-action-core.js';
import {loadSceneDrawProjectionParameters} from '../core/scene-draw-slot-projection.js';
import {loadSceneOamSources} from '../core/scene-oam-sources.js';
import {resolveRasterDisplayFrame} from './raster-display-frame.js';
import {loadChrBankBytes} from '../core/media-assets.js';
import {uiPaintFrameComposition} from './frame-composition.js';

export async function initializeInterfacePreviewScene(previewState, entryOptions = {}) {
  const {scene, slot} = previewState.context;
  await prepareSaveEditorWorkspace();
  const [workspaceDocument, saveRuntimeDocument, interfaces, story, autonomous, interaction, actors] = await Promise.all([
    db.getResourceDocument('runtime-workspace'), db.getResourceDocument('save-container'),
    db.getDocument('project.ui.interfaces'), db.getDocument('project.story'),
    db.getResourceDocument('story-autonomous-script'), db.getResourceDocument('story-interaction-script'),
    db.getResourceDocument('scene-actor'), loadSceneOamSources(db),
    loadSceneDrawProjectionParameters({readDocument: id => db.getResourceDocument(id, null),
      readField: source => db.getField(source.resource_id, source.entity_handle, source.field)}),
  ]);
  const project = {...state.project, story, story_autonomous_edits: autonomous,
    story_interaction_edits: interaction, story_scene_actor_edits: actors};
  const core = createSceneActionCore({database: db, readProject: () => project,
    sceneActionContext: {workspaceDocument, saveRuntimeDocument,
      saveDocument: state.saveByteMapDocument, saveValue: saveCurrentValue(state.saveCurrentBytes), saveSlot: slot}});
  const names = new Set(core.captureSceneActionState().owners.flatMap(owner => owner.fields
    .filter(field => field.knowledge === 'confirmed').map(field => field.field)));
  for (const [id, value] of Object.entries(previewState.fields || {})) {
    if (!id.startsWith(`save.slot.${slot}.`)) continue;
    const name = id.replace(`save.slot.${slot}.`, 'save.active.');
    if (names.has(name)) {
      const field = core.sceneActionField(name);
      if (field.writable) field.value = value;
    }
  }
  const entry = await core.initializeSceneContext({sceneId: scene.sceneId,
    cameraX: scene.x - 8, cameraY: scene.y - 7, ...entryOptions});
  if (entry.status !== 'available')
    throw new Error(`预览场景：${(entry.missing || [entry.continuation?.kind || entry.status]).join('；')}`);
  return {core, entry, interfaces};
}

export async function interfacePreviewSceneImage(previewState = null) {
  const {scene, slot} = previewState?.context || interfacePreviewContext();
  if (!scene) return null;
  await prepareSaveEditorWorkspace();
  const deviceScene = previewState?.view?.deviceScene?.sceneId === scene.sceneId ? previewState.view.deviceScene : null;
  const fields = previewState?.fields || {};
  return db.reusePreviewProjection('interface-scene-image', [state.saveCurrentBytes, slot, scene.sceneId, scene.x, scene.y,
    JSON.stringify([deviceScene, fields, previewState?.view?.sceneEntry?.direction])], async () => {
    const {core, entry, interfaces} = await initializeInterfacePreviewScene({context: {scene, slot}, fields}, {
      direction: previewState?.view?.sceneEntry?.direction ?? 0,
      mapChanges: (deviceScene?.tiles || []).map(tile => ({x: tile.x, y: tile.y, metatileId: tile.tileId}))});
    if (deviceScene) {
      for (const actor of deviceScene.actors) {
        for (const [field, value] of Object.entries({type: actor.actorType, x: actor.x, y: actor.y,
          cursor: actor.cursor, direction: actor.direction})) core.sceneActionField(`actor.${field}`, actor.id).value = value;
        if (actor.actorType === 255) for (let slot = 0; slot < 16; slot++)
          if ([0, 3, 4].includes(core.sceneActionField('render.marker', slot).value & 63)
              && core.sceneActionField('render.actorIndex', slot).value === actor.id) {
            core.sceneActionField('render.marker', slot).value = 0;
            core.sceneActionField('render.frame', slot).value = 0;
          }
      }
      core.sceneActionField('control.controlLock').value = deviceScene.controlLock;
      const services = await core.createSceneRenderServices({randomPolicy: 'stationary'});
      const rendered = services.createExecution({advanceActions: false}).advance();
      if (rendered.status !== 'available') throw new Error(`预览场景：${rendered.missing?.join('；') || rendered.status}`);
      entry.display.oam = Uint8Array.from(core.sceneActionField('display.oamShadow').value);
    }
    const raster = await resolveRasterDisplayFrame(interfaces.frame_commit_sources, entry.display, loadChrBankBytes);
    if (raster.status !== 'available') throw new Error(`预览场景：${raster.missing.join('；')}`);
    const image = {width: 256, height: 240, data: new Uint8ClampedArray(256 * 240 * 4)};
    uiPaintFrameComposition(image, {frame_state: entry.display, pattern_table: raster.frame.phases[0].pattern_table,
      raster_frame: raster.frame, regions: [{x: 0, y: 0, width: 256, height: 240}]});
    return {...image, randomActors: entry.random_actors};
  });
}
