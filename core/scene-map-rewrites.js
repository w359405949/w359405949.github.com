// @editor-module 场景事件改写记录的覆盖范围与两态投影。
import {worldCoarsePatternCells} from './scene-config-owner.js';
import {sceneMapCell, sceneRuntimeMap} from './scene-runtime-map.js';
import {WORLD_TIDE_HANDLE, WORLD_TIDE_OWNER} from './world-tide-owner.js';
import {SCENE_REMAP_OWNER} from './scene-remap-owner.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

function sceneMapRewriteBounds(regions) {
  if (!regions.length) return null;
  const x = Math.min(...regions.map(row => row.x));
  const y = Math.min(...regions.map(row => row.y));
  return {x, y, width: Math.max(...regions.map(row => row.x + row.width)) - x,
    height: Math.max(...regions.map(row => row.y + row.height)) - y};
}

export function sceneMapRewriteContains(rewrite, x, y) {
  return rewrite.regions.some(row => x >= row.x && y >= row.y
    && x < row.x + row.width && y < row.y + row.height);
}

export function sceneMapRewriteScene(scene, rewrite, phase) {
  const map = sceneRuntimeMap(scene).map(row => [...row]);
  for (const cell of rewrite[phase].cells || []) map[cell.y][cell.x] = cell.metatile_id;
  return {...scene, map, runtime_map: null};
}

export function sceneEventFlagMap(scene, flagValue) {
  const groups = (scene.event_metatile_replacements || []).filter(group =>
    group.coordinate_space !== 'world-coarse-map' && flagValue(group.event_flag));
  if (!groups.length) return scene;
  const map = sceneRuntimeMap(scene).map(row => [...row]);
  for (const group of groups) for (const cell of group.replacements)
    map[cell.y][cell.x] = cell.metatile_id;
  return {...scene, map, runtime_map: null};
}

function mapCells(scene, regions) {
  return regions.flatMap(row => Array.from({length: row.width * row.height}, (_, index) => {
    const x = row.x + index % row.width, y = row.y + Math.floor(index / row.width);
    return {x, y, metatile_id: sceneMapCell(scene, x, y)?.metatileId};
  }));
}

export function sceneMapRewrites(scene, {worldRaw, tide, lifecycle, scenes = []} = {}) {
  if (!scene) return [];
  const resourceId = `scene:${hex(scene.id)}`;
  const rewrites = (scene.event_metatile_replacements || []).map((group, index) => {
    const coarse = group.coordinate_space === 'world-coarse-map';
    const size = coarse ? 4 : 1;
    const regions = group.replacements.map(cell => ({x: cell.x * size, y: cell.y * size,
      width: size, height: size}));
    const handle = `${resourceId}:event-map:${hex(index)}`;
    return {key: `map-rewrite:${handle}`, handle, resourceId, groupIndex: index,
      type: coarse ? 'world-coarse-replacement' : 'metatile-replacement',
      label: coarse ? '粗格替换' : '地图格替换', eventFlag: group.event_flag,
      record: group, regions, bounds: sceneMapRewriteBounds(regions),
      before: {label: '事件前', cells: mapCells(scene, regions)},
      after: {label: '事件后', cells: coarse
        ? group.replacements.flatMap(cell => worldCoarsePatternCells(worldRaw,
          cell.x * 4, cell.y * 4, cell.metatile_id)) : group.replacements},
      fieldObjectIds: [`${resourceId}.event-map.${hex(index)}`,
        `${resourceId}.event-map.${hex(index)}.cells`]};
  });
  if (Number(scene.id) === Number(tide?.trigger?.scene_id)) {
    const record = tide.records.find(row => row.handle === WORLD_TIDE_HANDLE);
    const regions = tide.blocks.map(block => ({x: block.x, y: block.y, width: 4, height: 4}));
    rewrites.push({key: `map-rewrite:${WORLD_TIDE_HANDLE}`, handle: WORLD_TIDE_HANDLE,
      resourceId: WORLD_TIDE_OWNER, type: 'world-coarse-switch', label: '潮汐地形切换',
      eventFlag: tide.event_flag, record, regions, bounds: sceneMapRewriteBounds(regions),
      ...Object.fromEntries([['before', 'high', '涨潮'], ['after', 'low', '退潮']]
        .map(([phase, field, label]) => [phase, {label, cells: tide.blocks.flatMap(block =>
          worldCoarsePatternCells(worldRaw, block.x, block.y, record[block[`${field}_field`]]))}]))});
  }
  for (const row of lifecycle?.records || []) {
    if (row.kind !== 'scene-remap' || ![row.source_scene_reference, row.target_scene_reference]
      .includes(resourceId)) continue;
    const source = scenes.find(entry => `scene:${hex(entry.id)}` === row.source_scene_reference) || scene;
    const target = scenes.find(entry => `scene:${hex(entry.id)}` === row.target_scene_reference) || scene;
    const regions = [{x: 0, y: 0, width: source.width, height: source.height}];
    if (target.width > source.width) regions.push({x: source.width, y: 0,
      width: target.width - source.width, height: target.height});
    if (target.height > source.height) regions.push({x: 0, y: source.height,
      width: Math.min(source.width, target.width), height: target.height - source.height});
    rewrites.push({key: `scene-state:${row.handle}`, handle: row.handle, resourceId: SCENE_REMAP_OWNER,
      type: 'scene-remap', label: '场景重映射',
      eventFlag: Number.parseInt(row.global_event_flag_reference.split(':').at(-1), 16),
      record: row, regions, bounds: sceneMapRewriteBounds(regions),
      before: {label: '事件前', sceneReference: row.source_scene_reference},
      after: {label: '事件后', sceneReference: row.target_scene_reference}});
  }
  return rewrites;
}
