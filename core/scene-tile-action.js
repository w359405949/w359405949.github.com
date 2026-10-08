// @editor-module 调查后的地图格、同格入口与离场状态。
import {sceneMetatileAttributeRecords} from './metatile-projection.js';
import {metatileBehaviorCode, metatileBehaviorLabel} from './metatile-behavior.js';
import {TILE_ACTION_HANDLE} from './scene-tile-action-owner.js';

export function sceneTileAction(object, context) {
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

export function sceneTileActionArrival(transition, scenes, logicIndex = null) {
  const scene = scenes?.editable_scenes?.find(row => Number(row.id) === Number(transition.destination_scene_id));
  if (!scene) return null;
  const x = Number(transition.destination_x), y = Number(transition.destination_y);
  const entrance = logicIndex?.point_transitions?.find(record => Number(record.scene_id) === Number(scene.id)
    && Number(record.x) === x && Number(record.y) === y);
  return {scene, x, y, href: `?${new URLSearchParams({view: 'scenes', scene: scene.slug,
    sceneMode: 'logic', scenePoint: `${x},${y}`,
    ...(entrance ? {sceneObject: `transition:${entrance.id}`} : {})})}`};
}

export async function sceneTileActionOrigins(object, context, database) {
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
