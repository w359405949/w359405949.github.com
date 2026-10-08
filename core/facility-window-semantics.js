// @editor-module 设施窗口只执行已确认的局部效果，帧循环经共享服务续行。
import {selectionCursorCoordinates} from './selection-layout-owner.js';
import {createFrameCommitServices} from './logical-window-commit.js';
import {advanceGlobalRandom} from './global-random.js';
import {resolveControllerSamples} from './controller-input-semantics.js';
import {writeCountedOam} from './scene-oam-composition.js';

const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const requireByte = (state, key) => {
  if (!byte(state[key])) throw new Error(key);
  return state[key];
};
const vector = (value, size, key) => {
  if (!(Array.isArray(value) || ArrayBuffer.isView(value))
      || value.length !== size || !value.every(byte)) throw new Error(key);
  return value;
};
const unavailable = missing => ({status: 'unavailable', missing});

export function executeFacilityWindowRoutine(catalog, id, input = {}, context = {}) {
  const {selectionLayout, selectionMovement, cursorObject} = context;
  const routine = catalog?.routines?.find(row => row.id === id);
  if (routine?.confirmation_status !== 'confirmed' || !routine.implementation)
    return unavailable(routine?.missing || ['window-routine-semantics']);
  const state = structuredClone(input);
  const effects = [];
  try {
    switch (routine.implementation) {
      case 'selection-coordinates': {
        if (requireByte(state, 'coordinate_update_gate') !== 0) break;
        const coordinates = selectionCursorCoordinates(selectionLayout,
          {resource_id: 'selection-layout', kind: 'indexed-coordinate',
            selector: requireByte(state, 'selector')}, requireByte(state, 'selection_index'));
        state.cursor_x = coordinates.x;
        state.cursor_y = coordinates.y;
        effects.push({kind: 'selection-coordinates', ...coordinates});
        break;
      }
      case 'selection-movement': {
        const selector = selectionLayout?.selectors?.find(row => row.selector === requireByte(state, 'selector'));
        const profile = selectionLayout?.profiles?.[selector?.profile];
        const index = requireByte(state, 'selection_index');
        const direction = requireByte(state, 'direction_index');
        const maximum = (requireByte(state, 'selection_count') - 1) & 255;
        if (!profile || direction > 4 || index >= profile.capacity) throw new Error('selection-movement-domain');
        const movementTable = selectionMovement?.records?.find(record =>
          record.id === 'code-module.fixed-ui-table-core-a')?.values || catalog.movement;
        const directionMask = movementTable?.[direction];
        const movementMask = movementTable?.[5 + profile.movement_offset + index];
        if (!byte(directionMask) || !byte(movementMask)) throw new Error('selection-movement-source');
        const movement = directionMask & movementMask;
        let next = index, moved = false;
        if (movement & 1) {
          if (index !== maximum) {next = (index + 1) & 255; moved = true;}
          else if (index !== 0) {next = index - 1; moved = true;}
        } else if (movement & 2) {next = (index - 1) & 255; moved = true;}
        else {
          const candidate = (index + profile.columns) & 255;
          if (movement & 4 && candidate <= maximum) {next = candidate; moved = true;}
          else if (movement & 8) {next = (index - profile.columns) & 255; moved = true;}
        }
        state.selection_index = next;
        if (moved) effects.push({kind: 'audio-command', command: 'audio-command:67'});
        break;
      }
      case 'selection-highlight': {
        const selector = requireByte(state, 'selector');
        if (selector !== 0 && selector !== 2) break;
        const role = requireByte(state, 'role_index');
        const record = catalog.highlight_records?.[role];
        if (!byte(record)) throw new Error('highlight-record-source');
        const x = (((requireByte(state, 'camera_x') * 2) & 255) + 13) & 255;
        let y = (((requireByte(state, 'camera_y') * 2) & 255) + record) & 255;
        if (y >= 30) y -= 30;
        const column = x ^ (requireByte(state, 'nametable_page') !== 0 ? 32 : 0);
        const pointer = 0x2000 + ((column & 32) ? 0x400 : 0) + (y & 31) * 32 + (column & 31);
        const tile = requireByte(state, 'frame_counter') & 32 ? 255 : selector === 0 ? 0x86 : 0x11;
        state.highlight_region = 13;
        state.highlight_record = record;
        state.highlight_pointer = pointer;
        const triple = [pointer >> 8, pointer & 255, tile];
        if (state.main_queue?.length >= 3) {
          for (let index = 0; index < 3; index++) state.main_queue[index] = triple[index];
        } else state.main_queue = triple;
        state.main_queue_length = 3;
        effects.push({kind: 'replace-main-queue', queue: triple});
        break;
      }
      case 'selection-cursor': {
        const sprites = [];
        if (requireByte(state, 'display_profile') && requireByte(state, 'cursor_object_id')) {
          const object = typeof cursorObject === 'function' ? cursorObject(state.cursor_object_id) : cursorObject;
          if (object?.id !== state.cursor_object_id || !object.sprites?.length)
            throw new Error('current-cursor-metasprite');
          const x = requireByte(state, 'cursor_x'), y = requireByte(state, 'cursor_y');
          const result = writeCountedOam({oam: state.oam_shadow, cursor: requireByte(state, 'oam_cursor')}, object, x, y);
          state.oam_shadow = result.oam;
          state.oam_cursor = result.cursor;
          sprites.push(...result.sprites.map(sprite => ({...sprite, attribute: sprite.attribute & 0xE3})));
        }
        state.window_sprites = sprites;
        effects.push({kind: 'window-sprites', sprites});
        break;
      }
      case 'flush-main-queue': {
        const size = requireByte(state, 'main_queue_length');
        if (size % 3) throw new Error('main-queue-triple-domain');
        const transferred = size || 3;
        const queue = state.main_queue;
        if (!(Array.isArray(queue) || ArrayBuffer.isView(queue))
            || queue.length < transferred || !Array.from(queue).slice(0, transferred).every(byte)) throw new Error('main_queue');
        for (let index = 0; index < transferred; index += 3)
          effects.push({kind: 'ppu-write', address: ((queue[index] << 8) | queue[index + 1]) & 0x3FFF,
            value: queue[index + 2]});
        state.main_queue_length = 0;
        break;
      }
      case 'frame-barrier':
        return createFrameCommitServices(context.frameCommitCatalog, context).advanceFrame(state);
      case 'clear-logical-rectangle': {
        vector(state.logical_tiles, 1024, 'logical_tiles');
        const index = routine.rectangle_index ?? requireByte(state, 'rectangle_index');
        const rectangle = catalog.rectangles?.find(row => row.index === index);
        if (!rectangle) throw new Error('logical-rectangle-source');
        const width = rectangle.width || 256, height = rectangle.height || 256;
        const positions = [];
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const offset = ((rectangle.pointer + row * 32 + column) & 0xFFFF) - 0x6000;
          if (offset < 0 || offset >= 1024) throw new Error('rectangle-outside-logical-buffer');
          positions.push(offset);
        }
        for (const offset of positions) state.logical_tiles[offset] = 255;
        state.rectangle_width = width & 255;
        state.rectangle_pointer = (rectangle.pointer + height * 32) & 0xFFFF;
        effects.push({kind: 'logical-buffer-clear', rectangle: {...rectangle}, value: 255});
        break;
      }
      case 'begin-selection-cycle': {
        const coordinates = executeFacilityWindowRoutine(catalog, 'window-F256', state, {selectionLayout});
        if (coordinates.status !== 'available') return coordinates;
        Object.assign(state, coordinates.state);
        effects.push(...coordinates.effects);
        // F1DD 从 F256 返回后读取 059B，随后直落 F1E3。
      }
      // fall through
      case 'begin-selection-wait':
        state.wait_remaining = requireByte(state, 'wait_count');
        return {status: 'pending', state, effects, continuation: {phase: 'scene-render'}, missing: routine.missing};
      default:
        return unavailable(['window-routine-implementation']);
    }
  } catch (error) {
    return unavailable([error.message]);
  }
  return {status: 'available', state, effects};
}

export function resumeFacilityWindowCycle(catalog, pending, {renderScene, windowOnly = false, cursorObject,
  advanceFrame, frameCommitCatalog, advanceRandom, pollController, nmiEvents} = {}) {
  if (pending?.status !== 'pending') return unavailable(['selection-cycle-continuation']);
  let state = structuredClone(pending.state);
  const effects = [...pending.effects];
  try {
    if (!advanceFrame && frameCommitCatalog) advanceFrame = createFrameCommitServices(frameCommitCatalog,
      {advanceRandom, pollController, nmiEvents}).advanceFrame;
    if (pending.continuation.phase === 'scene-render') {
      if (typeof renderScene !== 'function' && !windowOnly)
        return {...pending, ...unavailable(['scene-actor-frame-effects'])};
      let rendered;
      if (typeof renderScene === 'function') rendered = renderScene(state);
      else {
        state.oam_shadow = Array.from({length: 256}, (_, index) => index % 4 === 0 ? 0xEF : 0);
        state.oam_cursor = 0;
        rendered = executeFacilityWindowRoutine(catalog, 'window-A233-cursor', state, {cursorObject});
        if (rendered.status === 'available') rendered.state.oam_pending = 255;
      }
      if (rendered?.status !== 'available') return {...pending, ...unavailable(rendered?.missing || ['scene-actor-frame-effects'])};
      state = rendered.state;
      effects.push(...rendered.effects);
      const highlighted = executeFacilityWindowRoutine(catalog, 'window-F276', state);
      if (highlighted.status !== 'available') return highlighted;
      state = highlighted.state;
      effects.push(...highlighted.effects);
    } else if (pending.continuation.phase !== 'frame-barrier') throw new Error('selection-cycle-phase');
    const barrier = {status: 'pending', state, effects, continuation: {phase: 'frame-barrier'}};
    if (typeof advanceFrame !== 'function') return {...barrier, ...unavailable(['frame-barrier-effects'])};
    const frame = advanceFrame(structuredClone(state));
    if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
    if (frame?.status !== 'available') return {...barrier, ...unavailable(frame?.missing || ['frame-barrier-effects'])};
    if (requireByte(frame.state, 'frame_counter') === requireByte(state, 'frame_counter')) return barrier;
    state = frame.state;
    effects.push(...frame.effects);
    if (requireByte(state, 'controller_edges') !== 0) return {status: 'available', state, effects};
    state.wait_remaining = (requireByte(state, 'wait_remaining') - 1) & 255;
    return state.wait_remaining === 0 ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'scene-render'}};
  } catch (error) {
    return unavailable([error.message]);
  }
}

export function executeFacilityWindowConstruction(catalog, program, input, context = {}) {
  if (!Array.isArray(program)) return unavailable(['window-construction-program']);
  const previous = context.continuation;
  let index = previous?.index ?? 0;
  if (!Number.isInteger(index) || index < 0 || index > program.length)
    return unavailable(['window-construction-continuation']);
  let state = structuredClone(input), effects = [];
  const services = createFrameCommitServices(context.frameCommitCatalog, context);
  for (; index < program.length; index++) {
    const operation = program[index];
    let result;
    const pending = previous?.index === index ? previous.pending : null;
    if (operation.kind === 'window-routine') {
      result = pending && ['window-F1DD', 'window-F1E3'].includes(operation.routine)
        ? resumeFacilityWindowCycle(catalog, {...pending, state, effects: []}, context)
        : executeFacilityWindowRoutine(catalog, operation.routine, state, context);
    } else if (operation.kind === 'logical-window') {
      result = pending ? services.resumeLogicalWindow({...pending, state, effects: []})
        : services.beginLogicalWindow(state);
    } else if (operation.kind === 'restore-scene-row') {
      result = services.restoreSceneRow(state, operation.row);
    } else return {status: 'unavailable', state, effects, stopped_at: index,
      missing: ['window-construction-operation']};
    if (result.status !== 'available') return {...result, state: result.state || state,
      effects: [...effects, ...(result.effects || [])],
      construction_continuation: {index, pending: result.status === 'pending' ? result : pending}};
    state = result.state;
    effects.push(...result.effects);
  }
  return {status: 'available', state, effects};
}

export function facilityWindowFrameSchedule(catalog, events) {
  let current;
  return {
    nmiEvents: events,
    advanceRandom(state, event) {
      if (!Number.isSafeInteger(event?.random_calls) || event.random_calls < 0)
        return unavailable(['random-wait-schedule']);
      const next = structuredClone(state);
      try {
        for (let index = 0; index < event.random_calls; index++) {
          const random = advanceGlobalRandom(requireByte(next, 'random_high'), requireByte(next, 'random_low'));
          next.random_high = random.high;
          next.random_low = random.low;
          next.random_workspace = random.workspaceHigh;
        }
      } catch (error) { return unavailable([error.message]); }
      current = event;
      return {status: 'available', state: next, effects: [{kind: 'random-wait', calls: event.random_calls}]};
    },
    pollController(state) {
      return resolveControllerSamples(catalog, state, current?.controller_samples);
    },
  };
}
