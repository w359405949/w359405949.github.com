// @editor-module 传真场景调用只在隔离现场完成装载与入口返回。
import {playerTileFromSaveCamera, saveCameraFromPlayerTile} from '../core/save-position.js';
import {humanItemSceneType} from './human-items-state-model.js';

export const FAX_SCENE_EVIDENCE = 'project/evidence/reverse-engineering/fax-cave-scene-return/observations.json';
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const sceneHandle = id => `scene:${id.toString(16).toUpperCase().padStart(2, '0')}`;

function directionVector(cameraModel, direction) {
  const vector = [cameraModel?.delta_x?.[direction], cameraModel?.delta_y?.[direction]];
  return vector.every(value => Number.isInteger(value) && value >= -128 && value <= 255)
    ? vector.map(value => value & 255) : null;
}

export function faxEntranceDestination(entrance, cameraModel) {
  if (!entrance || entrance.provenance !== 'natural-point-transition'
      || ![entrance.sceneId, entrance.cameraX, entrance.cameraY].every(byte)
      || !Number.isInteger(entrance.direction) || entrance.direction < 1 || entrance.direction > 4) return null;
  const vector = directionVector(cameraModel, entrance.direction);
  if (!vector) return null;
  const [dx, dy] = vector;
  return {kind: 'fax-return', sceneId: entrance.sceneId,
    cameraX: (entrance.cameraX - dx) & 255, cameraY: (entrance.cameraY - dy) & 255,
    evidence: FAX_SCENE_EVIDENCE};
}

export async function completeFaxScene(snapshot, initialize) {
  const request = snapshot.domainResults.scene;
  if (snapshot.execution.status !== 'scene-loading' || !request) return snapshot;
  try {
    if (!byte(request.sceneId)) throw new TypeError('传真场景落点无效');
    const point = playerTileFromSaveCamera(request.cameraX, request.cameraY);
    const context = {...snapshot.context, scene: {sceneId: request.sceneId, ...point}};
    const {entry} = await initialize({...snapshot, context});
    const prefix = `save.slot.${context.slot}.`;
    for (const [field, value] of Object.entries({scene_id: request.sceneId,
      camera_x: entry.camera.x & 255, camera_y: entry.camera.y & 255})) {
      if (!Object.hasOwn(snapshot.fields, prefix + field)) throw new TypeError(`预览缺少字段：${prefix + field}`);
      if (!byte(value)) throw new TypeError('传真场景落点无效');
    }
    const next = structuredClone(snapshot);
    Object.assign(next.context, context, {fieldSceneType: humanItemSceneType(entry.scene)});
    Object.assign(next.fields, {[prefix + 'scene_id']: request.sceneId,
      [prefix + 'camera_x']: entry.camera.x & 255, [prefix + 'camera_y']: entry.camera.y & 255});
    next.context.scene = {sceneId: request.sceneId, ...playerTileFromSaveCamera(entry.camera.x & 255, entry.camera.y & 255)};
    delete next.view.deviceScene;
    next.view.sceneEntry = {sceneId: request.sceneId, direction: 0, state: entry.state, display: entry.display,
      party: entry.state.owners.flatMap(owner => owner.fields).filter(field =>
        ['party.x', 'party.y', 'party.direction', 'party.order', 'party.renderState', 'field.partyCount'].includes(field.field)),
      evidence: FAX_SCENE_EVIDENCE};
    next.domainResults.scene = {...request, status: 'confirmed', cameraX: entry.camera.x & 255, cameraY: entry.camera.y & 255};
    next.execution.status = 'returned'; delete next.execution.reason;
    next.execution.trace.push({effect: 'fax-scene', ...next.domainResults.scene});
    next.windows = []; next.returnStack = []; next.pause = null;
    return next;
  } catch (error) {
    snapshot.execution.status = 'unknown'; snapshot.execution.reason = error.message;
    snapshot.domainResults.scene = {...request, status: 'unknown'};
    return snapshot;
  }
}

export async function prepareFaxNaturalEntry(snapshot, direction, {readDocument, initialize}) {
  const source = snapshot.context.scene;
  if (!source || !Number.isInteger(direction) || direction < 1 || direction > 4)
    throw new TypeError('自然进入须选择入口场景、坐标与进入方向');
  const document = await readDocument(sceneHandle(source.sceneId)), scene = document.scene || document;
  const transition = document.logic?.layers?.transitions?.point_transitions?.find(row => row.x === source.x && row.y === source.y);
  if (humanItemSceneType(scene) !== 0 || !transition)
    throw new TypeError('所选位置没有保存返回入口的自然转场');
  const targetDocument = await readDocument(sceneHandle(transition.destination_scene_id));
  if (humanItemSceneType(targetDocument.scene || targetDocument) !== 1)
    throw new TypeError('所选入口的目的场景没有洞穴传真分支');
  const {core} = await initialize(snapshot);
  const vector = directionVector(core.storyBrowserVm().camera_model, direction);
  if (!vector) throw new TypeError('自然进入方向的当前坐标增量未确认');
  // 入口解析消费格步完成后的所选坐标与进入方向。
  const entrance = {provenance: 'natural-point-transition', sceneId: source.sceneId,
    ...saveCameraFromPlayerTile(source.x, source.y), direction, transitionId: transition.id,
    destinationSceneId: transition.destination_scene_id, evidence: FAX_SCENE_EVIDENCE};
  snapshot.view.savedEntrance = entrance;
  snapshot.domainResults.scene = {kind: 'natural-entry', sceneId: transition.destination_scene_id,
    ...saveCameraFromPlayerTile(transition.destination_x, transition.destination_y), evidence: FAX_SCENE_EVIDENCE};
  snapshot.execution.status = 'scene-loading';
  const entered = await completeFaxScene(snapshot, initialize);
  if (entered.execution.status !== 'returned') throw new TypeError(entered.execution.reason);
  entered.execution.status = 'waiting'; entered.pause = {kind: 'menu'};
  return entered;
}
