// @editor-module OAM 写入器只从视觉字段对象当前正文取得帧与布局。
import {metaspriteGenericObject} from './visual-compiler.js';
import {decodeDirectFrames} from './metasprite-layout.js';
import {requireFrameByte, requireFrameVector} from './frame-state-values.js';
import {attackChrTileEncoding} from './attack-chr-owner.js';

const requireValue = (condition, name) => {if (!condition) throw new TypeError(name);};
const byte = (value, name) => requireFrameByte({[name]: value}, name);
const orderedValues = (rows, count, name) => {
  requireValue(Array.isArray(rows) && rows.length === count
    && rows.every((row, index) => row.id === index), name);
  return [...requireFrameVector(rows.map(row => row.value), count, name)];
};
const record = (document, id, name) => {
  const value = document?.records?.find(row => row.id === id);
  requireValue(value, `${name}:${id}`);
  return value;
};

function createSceneOamSources({actors, metasprites, countedReferences, packedReferences, actions, layouts}) {
  return Object.freeze({
    actorFrame(id) {
      const frame = actors?.frames?.find(row => row.id === id);
      requireValue(frame, `actor-frame:${id}`);
      return frame;
    },
    actorTables() {
      return {deltas: orderedValues(actors?.tile_deltas, 16, 'actor-tile-deltas'),
        quadrantMaps: orderedValues(actors?.quadrant_maps, 32, 'actor-quadrant-maps'),
        xDeltas: [0, 8, 0, 8], yDeltas: [1, 1, 9, 9, 2, 2, 10, byte(actors?.frames?.[0]?.descriptor, 'actor-frame-00')]};
    },
    counted(id) {
      const object = metaspriteGenericObject(metasprites, record(countedReferences, id, 'metasprite'));
      requireValue(!object.runtimeGenerated, `runtime-metasprite:${id}`);
      return object;
    },
    packed(id) {
      const reference = record(packedReferences, id, 'direct-frame');
      const pointers = Array(0x46).fill(0);
      pointers[id] = reference.pointer.value;
      const data = orderedValues(metasprites?.direct_frame_record_region, 543, 'direct-frame-records');
      const object = decodeDirectFrames(pointers, data)[id];
      requireValue(object && !object.runtimeGenerated, `runtime-direct-frame:${id}`);
      return object;
    },
    battle(id) {
      const action = record(actions, id, 'battle-action');
      requireValue(action.available && typeof action.layout_reference === 'string', `battle-action:${id}`);
      const layout = layouts?.records?.find(row => row.handle === action.layout_reference);
      requireValue(layout?.fields, action.layout_reference);
      return {origin: (byte(layout.fields.origin.x_quarter_tiles, 'battle-origin-x') << 4)
          | byte(layout.fields.origin.y_quarter_tiles, 'battle-origin-y'),
        columns: action.columns, rows: action.rows, palette: action.palette_id,
        tiles: layout.fields.tile_references.map(attackChrTileEncoding)};
    },
  });
}

export async function loadSceneOamSources(database) {
  const ids = ['actor-visual', 'metasprite-record', 'metasprite', 'direct-frame', 'battle-action', 'battle-object-layout'];
  const documents = await Promise.all(ids.map(id => database.getResourceDocument(id, null)));
  requireValue(documents.every(Boolean), 'scene-oam-field-objects');
  const [actors, metasprites, countedReferences, packedReferences, actions, layouts] = documents;
  return createSceneOamSources({actors, metasprites, countedReferences, packedReferences, actions, layouts});
}
