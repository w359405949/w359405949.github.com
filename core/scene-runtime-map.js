// @editor-module 按已发布的加载配方投影运行地图与源地图格。
import {sceneMetatileAttributeRecords} from "./metatile-source.js";

export function sceneRuntimeMetatileOverlays(scene, logic, {visibleLayers = null, resolveMetatileId = null} = {}) {
  return Object.entries(logic?.layers || {}).flatMap(([layerName, records]) => {
    if (!Array.isArray(records) || visibleLayers?.[layerName] === false) return [];
    return records.flatMap(record => {
      const overlay = record?.runtime_metatile_overlay;
      const x = Number(record.x), y = Number(record.y);
      if (!overlay || !Number.isInteger(x) || !Number.isInteger(y)
        || x < 0 || y < 0 || x >= scene.width || y >= scene.height) return [];
      const metatileId = Number(resolveMetatileId ? resolveMetatileId({layerName, record, overlay})
        : overlay.uncollected_metatile_id ?? overlay.metatile_id);
      return Number.isInteger(metatileId) ? [{x, y, metatileId}] : [];
    });
  });
}

export function sceneInteractionTileChanges(scene, actor, documents, currentTiles = []) {
  if (!scene || Number(scene.id) === 0) return [];
  const replacement = scene.header_extension?.[4];
  if (!Number.isInteger(replacement)) return [];
  const attributes = sceneMetatileAttributeRecords(scene, documents).flatMap(record =>
    record.metatile_attributes || record.metatile_attribute_page || []);
  const deltaY = {up: -1, down: 1, left: 0, right: 0}[actor.direction] ?? 0;
  const x = Math.round(actor.x), y = Math.round(actor.y);
  const result = [];
  const apply = column => {
    for (const row of new Set([y + deltaY, y + deltaY * 2])) {
      if (sceneMapCell(scene, column, row)) {
        result.push({sceneId: Number(scene.id), x: column, y: row, tileId: replacement});
      }
    }
  };
  const interactive = column => {
    const row = y + deltaY;
    const override = [...currentTiles, ...result].findLast(tile =>
      Number(tile.sceneId) === Number(scene.id) && tile.x === column && tile.y === row);
    const id = override?.tileId ?? sceneMapCell(scene, column, row)?.metatileId;
    const behavior = Number(attributes[id]) & 0x7c;
    return behavior === 0x3c || behavior === 0x68;
  };
  // PRG $035F42..$035FB5 改写纵向两格，并优先检查右侧相邻门体。
  apply(x);
  if (interactive(x + 1)) apply(x + 1);
  else if (interactive(x - 1)) apply(x - 1);
  return result;
}

export function sceneMapCell(scene, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0
      || x >= scene.width || y >= scene.height) return null;
  const recipe = scene.runtime_map;
  if (!recipe) return {metatileId: scene.map[y]?.[x], sourceX: x, sourceY: y};
  const sourceY = y % recipe.block_height;
  const source = sourceY < recipe.source_height;
  const override = (y < recipe.block_height ? recipe.first_cells : recipe.repeated_cells)
    .find(cell => cell.x === x && cell.y === sourceY);
  return {metatileId: override?.metatile_id ?? (source ? scene.map[sourceY][x] : recipe.fill_metatile),
    sourceX: source ? x : null, sourceY: source ? sourceY : null};
}

export function sceneRuntimeMetatileId(scene, x, y, readCell = (x, y) => sceneMapCell(scene, x, y)?.metatileId) {
  const cell = readCell(x, y);
  if (Number(scene.id) !== 0 || cell !== 2) return cell;
  // PRG $07DDC7..$07DE75 按原始邻格与坐标奇偶选择世界地图 $02 的显示图块。
  if (readCell((x - 1) & 0xff, y) !== 2) return 0x0a;
  if (readCell((x + 1) & 0xff, y) !== 2) return 0x0b;
  return ((x + y) & 1) ? 2 : 3;
}

export function sceneRuntimeMap(scene) {
  if (!scene.runtime_map) return scene.map;
  return Array.from({length: scene.height}, (_, y) =>
    Array.from({length: scene.width}, (_, x) => sceneMapCell(scene, x, y).metatileId));
}
