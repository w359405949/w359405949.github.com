// @editor-module 场景选择器按世界入口与固定场景连接投影分组。
import {currentTextChoiceLabel} from '../../core/resource-index.js';

const hex = id => Number(id).toString(16).toUpperCase().padStart(2, '0');

export function scenePickerVariants(lifecycle) {
  return (lifecycle?.records || []).filter(row => row.kind === 'scene-remap').map(row => ({
    handle: row.handle, source: row.source_scene_reference,
    target: row.target_scene_reference, flag: row.global_event_flag_reference,
  }));
}

export function buildScenePickerGroups(entries, logic, elevatorConnections = [], lifecycle = null) {
  const scenes = new Map(entries.map(entry => [Number(entry.id), entry]));
  const variants = scenePickerVariants(lifecycle);
  const connections = [
    ...(logic.point_transitions || []).map(row => ({...row, kind: 'transition'})),
    ...(logic.boundary_exits || []).map(row => ({...row, kind: 'boundary'})),
    ...(logic.investigation_special_points || []).filter(row =>
      Number.isInteger(row.fixed_behavior?.destination_scene_id)).map(row => ({
      ...row, ...row.fixed_behavior, kind: 'investigation',
    })),
    ...elevatorConnections,
    ...variants.map(row => ({kind: 'scene-remap', resource_id: row.handle,
      scene_id: Number.parseInt(row.source.split(':').at(-1), 16),
      destination_scene_id: Number.parseInt(row.target.split(':').at(-1), 16),
      event_flag_reference: row.flag})),
  ].filter(row => scenes.has(Number(row.scene_id))
    && scenes.has(Number(row.destination_scene_id)));
  const adjacency = new Map(entries.map(entry => [Number(entry.id), new Set()]));
  for (const row of connections) {
    if (Number(row.destination_scene_id) !== 0)
      adjacency.get(Number(row.scene_id)).add(Number(row.destination_scene_id));
  }
  const roots = new Map();
  for (const row of connections.filter(row => Number(row.scene_id) === 0
      && Number(row.destination_scene_id) !== 0)) {
    const scene = scenes.get(Number(row.destination_scene_id));
    const key = scene.name_reference || `entrance:${hex(scene.id)}`;
    if (!roots.has(key)) roots.set(key, {id: key, nameReference: scene.name_reference || '',
      entrances: [], seeds: new Set()});
    const group = roots.get(key);
    group.entrances.push({handle: row.resource_id || `${row.kind}:00:${hex(row.id)}`,
      x: row.x, y: row.y, sceneId: Number(row.destination_scene_id)});
    group.seeds.add(Number(scene.id));
  }
  const memberships = new Map(entries.map(entry => [Number(entry.id), []]));
  const primary = new Map();
  for (const group of roots.values()) {
    const distances = new Map([...group.seeds].map(id => [id, 0])), pending = [...group.seeds];
    for (let index = 0; index < pending.length; index++) {
      for (const target of adjacency.get(pending[index]) || []) {
        if (distances.has(target)) continue;
        distances.set(target, distances.get(pending[index]) + 1);
        pending.push(target);
      }
    }
    for (const [id, distance] of distances) {
      memberships.get(id).push(group.id);
      if (!primary.has(id) || distance < primary.get(id).distance)
        primary.set(id, {group: group.id, distance});
    }
  }
  const groups = [...roots.values()].map(group => ({...group, seeds: [...group.seeds]}));
  groups.unshift({id: 'world', label: '世界地图', entrances: [], seeds: [0]});
  groups.push({id: 'unreachable', label: '不可达场景', entrances: [], seeds: []});
  const rows = entries.map(entry => {
    const id = Number(entry.id), reached = memberships.get(id);
    const group = id === 0 ? 'world' : primary.get(id)?.group || 'unreachable';
    return {sceneId: id, group, reachableGroups: reached,
      distance: primary.get(id)?.distance ?? null,
      otherGroups: reached.filter(id => id !== group),
      reason: id !== 0 && reached.length === 0 ? '没有世界入口的固定连接路径' : ''};
  });
  return {groups, rows, connections, variants};
}

export function scenePickerGroupLabel(group) {
  if (group.nameReference) {
    const name = currentTextChoiceLabel({record: group.nameReference});
    if (name) return name;
  }
  return group.label || `入口 ${group.entrances[0].x}, ${group.entrances[0].y}`;
}
