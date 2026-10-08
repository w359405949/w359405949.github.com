// @editor-module 条件入口的语义状态与事件位引用。
import {sceneTileAction} from './scene-tile-action.js';
import {tideEntrance, worldTideCondition} from './world-tide.js';
import {hiddenTeleportGate} from './teleport-hidden-destination.js';
import {storyActorCondition} from './story-scene-actions.js';

export function conditionalSceneRecord(object, context) {
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

export function conditionalEntranceRecord(record, context) {
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
export function conditionalEntranceState(record, preview) {
  const condition = record?.appearance_condition;
  if (!condition) return null;
  return condition.states.find(row => row.id === preview?.stateId) || condition.states[0];
}

export function conditionalEntranceCells(record, preview) {
  return conditionalEntranceState(record, preview)?.cells || [];
}

export function conditionalEntrancesForFlag(flagId, logicIndex, tide, project) {
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
