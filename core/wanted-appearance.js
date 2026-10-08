// @editor-module 通缉目标出现位置由战斗入口、遇敌区与场景角色的当前值投影。
import {resolveBattleStateCatalog, targetBattleState} from './battle-state-catalog.js';

function entranceAnnotations(coordinates) {
  const area = /^(\d+)[–-](\d+),\s*(\d+)[–-](\d+)$/u.exec(coordinates);
  if (area) {
    const [, left, right, top, bottom] = area.map(Number);
    return right >= left && bottom >= top ? [{kind: 'area', x: left, y: top,
      width: right - left + 1, height: bottom - top + 1, label: `触发区域 ${coordinates}`}] : [];
  }
  const points = coordinates.split(/\s*\/\s*/u).map(value => /^(\d+),\s*(\d+)$/u.exec(value));
  return points.every(Boolean) ? points.map(([, x, y]) => ({kind: 'point',
    x: Number(x), y: Number(y), label: `入场位置 ${x}, ${y}`})) : [];
}

export function resolveWantedAppearanceLocations({targetId, review = {}, story = {}, actors = {}, zones = {}, scenes = []}) {
  const catalog = resolveBattleStateCatalog({review, story, actors, zones});
  const entries = targetBattleState(catalog, targetId).entries.filter(row => row.shadowed_by == null);
  const locations = new Map();
  const missing = [];
  for (const row of entries) {
    const scene = scenes.find(scene => Number(scene.id) === Number(row.scene_id));
    if (!scene) {missing.push(`缺少场景 ${row.scene_id} 的目录记录`); continue;}
    const random = row.kind === 'random';
    const key = random ? `zone:${row.zone_id}:${scene.id}`
      : `${scene.id}:${row.entrance_object_key || row.object_key}`;
    const location = locations.get(key) || {sceneId: Number(scene.id),
      sceneObject: row.entrance_object_key || row.object_key,
      encounterZone: random ? row.zone_id : null, annotations: [], sources: [],
      label: random ? `遇敌区 ${row.zone_id}` : row.entrance_object_key
        ? '固定入场触发' : row.kind === 'interaction' ? '固定交互触发' : '固定剧情触发',
      coordinatesText: row.entrance_coordinates || '',
    };
    let annotations;
    if (random) {
      const cell = Number(zones.world_grid?.block_cell_size);
      if (Number(scene.id) === 0 && (!Number.isInteger(cell) || cell <= 0)) {
        missing.push('缺少世界地图遇敌区块尺寸'); continue;
      }
      annotations = [{kind: 'area', x: row.x === null ? 0 : row.x * cell,
        y: row.y === null ? 0 : row.y * cell,
        width: row.x === null ? Number(scene.width) : cell,
        height: row.y === null ? Number(scene.height) : cell,
        label: row.x === null ? `遇敌区 ${row.zone_id} 全场景`
          : `遇敌区 ${row.zone_id} 区块 ${row.x}, ${row.y}`}];
      if (row.x !== null && row.y !== null) location.coordinatesText = [...new Set([
        ...location.coordinatesText.split(' / ').filter(Boolean), `${row.x}, ${row.y}`,
      ])].join(' / ');
      location.sources.push(`scene-encounter-zone:zone:${Number(row.zone_id).toString(16).toUpperCase().padStart(2, '0')}`);
    } else if (row.entrance_object_key) {
      annotations = entranceAnnotations(row.entrance_coordinates || '');
      if (!annotations.length) missing.push(`${row.entrance_object_key} 缺少可识别的入场坐标`);
      location.sources.push(row.entrance_object_key);
    } else {
      annotations = Number.isInteger(row.x) && Number.isInteger(row.y)
        ? [{kind: 'point', x: row.x, y: row.y, label: `角色位置 ${row.x}, ${row.y}`}] : [];
      if (!annotations.length) missing.push(`${row.actor_uid || row.id} 缺少坐标`);
      location.coordinatesText = annotations.length ? `${row.x}, ${row.y}` : '';
    }
    if (row.actor_uid) location.sources.push(row.actor_uid);
    location.sources.push(`encounter-formation:${Number(row.formation_id).toString(16).toUpperCase().padStart(2, '0')}`);
    location.annotations.push(...annotations);
    locations.set(key, location);
  }
  if (!entries.length) missing.push(`目标 ${targetId} 缺少战斗入口与场景对应`);
  return {locations: [...locations.values()].map(location => ({...location,
    sources: [...new Set(location.sources)],
    annotations: [...new Map(location.annotations.map(annotation => [JSON.stringify(annotation), annotation])).values()],
  })), missing: [...new Set(missing)]};
}
