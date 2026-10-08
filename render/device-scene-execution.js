// @editor-module 终端返回的自主动作只更新预览现场，操作数取当前字段对象。
import {prepareStorySceneActions, storySceneActions} from '../core/story-scene-actions.js';
import {executeSceneActionLocalHandler} from '../core/scene-action-local-handlers.js';
import {sceneInteractionTileChanges} from '../core/scene-runtime-map.js';

const DEVICE_SCENE_EVIDENCE = 'project/evidence/reverse-engineering/scene-actor-autonomy/observations.json';
const localOperations = new Set(['wait-event-flag-set', 'set-actor-type', 'remove-actor',
  'branch-on-player-position-rectangle', 'toggle-player-control-lock', 'set-actor-position',
  'end-actor-script']);

export async function prepareDeviceSceneExecution(context, dependencies, alarm = null) {
  if (!context.scene) return null;
  const [actors, scripts, story, document, pages, sets] = await Promise.all([
    'scene-actor', 'story-autonomous-script', 'project.story',
    `scene:${context.scene.sceneId.toString(16).toUpperCase().padStart(2, '0')}`,
    'metatile-page', 'metatile-set',
  ].map(id => dependencies.readDocument(id)));
  const records = actors.records.filter(row => row.entry_id === context.scene.sceneId);
  const programs = await prepareStorySceneActions(records, scripts, story, {
    getPackageDocument: path => dependencies.readPackageDocument(path),
  });
  const definitions = records.map(record => ({record, actions: storySceneActions(record, programs, story)}))
    .filter(({actions}) => actions[0]?.operation === 'wait-event-flag-set'
      && actions[0].operands[0] >= 0xA0 && actions[0].operands[0] <= 0xA3);
  return definitions.length ? deviceSceneExecution({definitions, scene: document.scene || document, pages, sets, alarm}) : null;
}

function deviceSceneExecution({definitions, scene, pages, sets, alarm}) {
  const initial = () => ({sceneId: scene.id, controlLock: 0, tiles: [],
    actors: definitions.map(({record}) => ({handle: record.uid, id: record.id, cursor: 0,
      x: record.x, y: record.y, actorType: record.actor_type, direction: record.direction,
      marker: record.render_slot_marker, actionState: 0})), pending: []});
  return {reload(state) {
    delete state.view.deviceScene;
    const initialization = [];
    const missing = [];
    if (alarm?.initialization) {
      executeSceneActionLocalHandler(alarm.initialization, {
        read: () => undefined,
        write: (id, value) => {
          const field = id.replace('save.active.', `save.slot.${state.context.slot}.`);
          if (!Object.hasOwn(state.fields, field)) missing.push(`${alarm.actor} 缺少报警初始化事件字段`);
          else {
            state.fields[field] = value;
            if (Array.isArray(state.fields.eventFlags))
              state.fields.eventFlags = state.fields.eventFlags.filter(flag => flag !== alarm.initialization.commandBytes[1]);
            initialization.push({actor: alarm.actor, field, value});
          }
        },
      });
    }
    const result = this.advance(state);
    return {...result, initialization, ...(missing.length ? {confirmed: false, status: 'unknown', reason: missing.join('；')} : {})};
  }, advance(state) {
    const snapshot = state.view.deviceScene ||= initial();
    const effects = [], missing = [];
    snapshot.pending = [];
    for (const actor of snapshot.actors) {
      if (actor.actorType === 255) continue;
      const definition = definitions.find(row => row.record.uid === actor.handle);
      const keys = {'actor.type': 'actorType', 'actor.x': 'x', 'actor.y': 'y',
        'actor.direction': 'direction', 'actor.cursor': 'cursor', 'render.marker': 'marker',
        'render.actionState': 'actionState'};
      const scratch = {};
      const read = id => id.startsWith('save.active.')
        ? state.fields[id.replace('save.active.', `save.slot.${state.context.slot}.`)]
        : id === 'control.controlLock' ? snapshot.controlLock
          : id === 'party.x' ? state.context.scene.x : id === 'party.y' ? state.context.scene.y
            : actor[keys[id]] ?? scratch[id];
      const write = (id, value) => {
        if (id === 'control.controlLock') snapshot.controlLock = value;
        else if (keys[id]) {
          if (actor[keys[id]] !== value) effects.push({actor: actor.handle, field: keys[id], value});
          actor[keys[id]] = value;
        } else scratch[id] = value;
      };
      for (let count = 0; count <= definition.actions.length; count++) {
        const action = definition.actions.find(row => row.cursor === actor.cursor);
        if (!action || !localOperations.has(action.operation) && action.operation !== 'mutate-field-tile-near-actor') {
          missing.push(`${actor.handle} 自主动作未确认`); break;
        }
        let advance;
        if (action.operation === 'wait-event-flag-set'
            && !Object.hasOwn(state.fields, `save.slot.${state.context.slot}.global_event_flag.${action.operands[0].toString(16).toUpperCase().padStart(2, '0')}`)) {
          missing.push(`${actor.handle} 缺少自主动作事件字段`); break;
        }
        if (action.operation === 'mutate-field-tile-near-actor') {
          const changes = sceneInteractionTileChanges(scene, {...actor,
            direction: ['up', 'down', 'left', 'right'][actor.direction]}, {pages, sets}, snapshot.tiles);
          if (!changes.length) {missing.push(`${actor.handle} 地图变化未确认`); break;}
          for (const tile of changes) {
            const at = snapshot.tiles.findIndex(row => row.x === tile.x && row.y === tile.y);
            if (at < 0) snapshot.tiles.push(tile); else snapshot.tiles[at] = tile;
          }
          effects.push({actor: actor.handle, kind: 'scene-tiles', tiles: changes});
          advance = 1;
        } else advance = executeSceneActionLocalHandler({commandBytes: [action.command.opcode, ...action.operands],
          semantic: action.semantic}, {read, write, actor: actor.id, slot: actor.id});
        if (!Number.isInteger(advance)) {missing.push(`${actor.handle} 自主动作返回未确认`); break;}
        if (advance === 0) {
          if (actor.actorType !== 255) snapshot.pending.push({actor: actor.handle, cursor: actor.cursor,
            operation: action.operation, ...(action.operation === 'wait-event-flag-set' ? {flag: action.operands[0]} : {})});
          break;
        }
        actor.cursor = (actor.cursor + advance) & 255;
      }
    }
    return {committed: effects.length > 0, confirmed: missing.length === 0,
      status: missing.length ? 'unknown' : 'confirmed', evidence: DEVICE_SCENE_EVIDENCE,
      actors: structuredClone(snapshot.actors), tiles: structuredClone(snapshot.tiles),
      controlLock: snapshot.controlLock, pending: structuredClone(snapshot.pending), effects,
      reason: missing.join('；')};
  }};
}
