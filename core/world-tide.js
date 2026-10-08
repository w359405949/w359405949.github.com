// @editor-module 潮汐字段对象的入口条件与地图格投影。
import {WORLD_TIDE_HANDLE} from './world-tide-owner.js';
import {worldCoarsePatternCells} from './scene-config-owner.js';

export function worldTideTriggers(tide, sceneId) {
  const trigger = tide?.trigger;
  return trigger && Number(trigger.scene_id) === Number(sceneId)
    ? [{...trigger, id: 0, handle: WORLD_TIDE_HANDLE, event_flag: tide.event_flag}] : [];
}

export function worldTideScenes(tide, lifecycle, sceneId) {
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

export function tideEntrance(object, tide) {
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

export function worldTideCondition(tide, raw) {
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
