// @editor-module 场景角色取格消费当前场景与元图块属性，进位按所属控制锁计算。
import {sceneMapCell, sceneRuntimeMetatileId} from './scene-runtime-map.js';
import {sceneMetatileAttributeRecords} from './metatile-source.js';
import {worldCoarsePatternCells} from './scene-config-owner.js';

export function createSceneActorTileServices({state, readScene, readDocument}) {
  return Object.freeze({fetch({x, y} = {}) {
    const before = state.capture();
    try {
      if (![x, y].every(value => Number.isInteger(value) && value >= 0 && value <= 255))
        throw new TypeError('actor-tile-coordinate');
      const sceneId = state.field('field.sceneId').value;
      const scene = readScene(sceneId);
      if (!scene || scene.id !== sceneId) throw new TypeError('current-scene');
      const cell = sceneMapCell(scene, x, y);
      const loadedMap = state.fields().find(field => field.fieldName === 'field.sceneMap');
      const loadedTile = cell && loadedMap?.rawBytes[y * scene.width + x];
      const worldCell = (column, row) => {
        const coarse = state.field('field.worldCoarseMap').value;
        const raw = readDocument('scene:00').world_raw;
        const cells = worldCoarsePatternCells(raw, column, row, coarse[(row >> 2) * 64 + (column >> 2)]);
        return cells[(row & 3) * 4 + (column & 3)].metatile_id;
      };
      const metatile = cell ? Number(scene.id) === 0 ? sceneRuntimeMetatileId(scene, x, y, worldCell)
        : loadedTile ?? cell.metatileId
        : scene.header_extension?.[6];
      if (!Number.isInteger(metatile) || metatile < 0 || metatile >= (sceneId === 0 ? scene.metatile_definitions.length : 128))
        throw new TypeError('current-scene-metatile');
      const attributes = sceneMetatileAttributeRecords(scene, {pages: readDocument('metatile-page'),
        sets: readDocument('metatile-set')}).flatMap(record => record.metatile_attributes || record.metatile_attribute_page || []);
      const loadedAttributes = state.fields().find(field => field.fieldName === 'field.metatileAttributes');
      const attribute = sceneId === 0 ? attributes[metatile] : loadedAttributes?.rawBytes[metatile] ?? attributes[metatile];
      if (!Number.isInteger(attribute) || attribute < 0 || attribute > 255) throw new TypeError('current-metatile-attribute');
      const lock = state.field('control.controlLock').value;
      if (!Number.isInteger(lock) || lock < 0 || lock > 255) throw new TypeError('control.controlLock');
      state.field('scratch.tileX').value = x;
      state.field('scratch.tileY').value = y;
      state.field('projection.tileX').value = x;
      state.field('projection.tileY').value = y;
      state.field('map.attribute').value = attribute;
      if (sceneId === 0) state.field('text.recordBank').value = 7;
      const code = attribute & 0x7C;
      return {status: 'available', state: state.capture(), attribute,
        carry: Boolean(attribute & 128) || !lock && code >= 0x1C && code < 0x54,
        effects: []};
    } catch (error) {
      state.restore(before);
      return {status: 'unavailable', missing: [error.message]};
    }
  }});
}
