// @editor-module 文本交互经所属现场、逻辑窗口、角色动作和帧服务续行。
import {createFrameCommitServices} from './logical-window-commit.js';
import {createSemanticFrameWait} from './semantic-frame-wait.js';
import {executeFacilityWindowRoutine} from './facility-window-semantics.js';

import {cloneFrameValue, sameFrameVector, requireFrameVector} from './frame-state-values.js';

const windowFields = Object.freeze({
  logical_profile: 'display.logicalProfile', logical_skip_gate: 'display.logicalSkipGate',
  logical_attribute_gate: 'display.logicalAttributeGate', camera_x: 'display.textCameraX',
  camera_y: 'display.textCameraY', nmi_mode: 'display.nmiMode', frame_counter: 'display.frameCounter',
  oam_pending: 'display.oamPending', span_count: 'display.spanCount',
  main_queue_length: 'display.mainQueueLength', main_queue: 'display.mainQueue',
  logical_tiles: 'display.logicalTiles', attribute_shadow: 'display.attributeShadow',
});
const windowFieldEntries = Object.entries(windowFields);

export function createTextInteractionServices({state, catalog, displayServices, controllerServices,
  renderScene, createHookExecution, windowCatalog, clearRectangles, recordOrigin}) {
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const current = field(id, index);
    if (current.knowledge !== 'confirmed' || current.value === null) throw new TypeError(id);
    return current.value;
  };
  const write = (id, value, index = 0) => {field(id, index).value = value;};

  function createExecution(run, initialDisplay) {
    const waits = createSemanticFrameWait({state, displayServices, controllerServices});
    let current = null, waiting = false, child = null, cancelled = false, display = initialDisplay, frame = null;
    const effects = [];
    const snapshot = (status, continuation = null, extra = {}) => ({status, state: state.capture(),
      effects: effects.splice(0), continuation, ...(display ? {display} : {}), ...(frame ? {frame} : {}), ...extra});
    function accept(response) {
      if (response.state) state.restore(response.state);
      effects.push(...(response.effects || []));
      if (response.display) display = response.display;
      if (response.frame) frame = response.frame;
    }
    function* wait() {
      waits.begin('controller');
      waiting = true;
      yield snapshot('pending', {kind: 'text-interaction-frame'});
      waiting = false;
    }
    function* call(kind, service, request) {
      let response = typeof service === 'function' ? service({...request, state: state.capture(), display}) : null;
      if (typeof response?.advance === 'function') {child = response; response = child.advance();}
      for (;;) {
        if (response) accept(response);
        if (response?.status === 'available' || response?.status === 'complete') {child = null; return response;}
        response = yield snapshot('pending', {kind, service: response?.continuation},
          {request, missing: response?.missing || [response?.reason || kind]});
      }
    }
    function* render(request) {
      const bank = read('text.recordBank'), subroutineBank = read('display.subroutineBank');
      write('display.subroutineBank', 0x1A);
      yield* call('text-scene-render', renderScene, request);
      write('display.subroutineBank', subroutineBank); write('text.recordBank', bank);
    }
    const execution = run({wait, call, render, snapshot, accept, getDisplay: () => display});
    return Object.freeze({
      advance(input = {}) {
        if (cancelled) throw new TypeError('text-interaction-cancelled');
        if (current?.status === 'available') return current;
        frame = null;
        let response;
        if (current?.status === 'pending') {
          if (waiting) {
            response = waits.advance({...input, display: input.display || display});
            if (response.status !== 'available') return {...current, ...response};
            accept(response);
            frame = {state: response.state, display: response.display};
          } else if (child) response = child.advance(input);
          else {
            if (!['available', 'pending', 'unavailable'].includes(input.status)) return current;
            response = input;
          }
        }
        current = execution.next(response).value;
        return current;
      },
      cancel() {cancelled = true; child?.cancel?.(); waits.cancel(); execution.return();},
    });
  }

  function commitWindow({preset, display, waitBefore = false} = {}) {
    return createExecution(function* ({wait, render, snapshot, getDisplay, accept}) {
      const subroutineBank = read('display.subroutineBank');
      write('display.subroutineBank', 0x14);
      if (waitBefore) yield* wait();
      write('display.logicalProfile', 0); write('display.logicalSkipGate', 0);
      const project = () => ({...getDisplay(),
        ...Object.fromEntries(windowFieldEntries.map(([key, id]) => {
          const value = read(id);
          return [key, Array.isArray(value) ? Uint8Array.from(requireFrameVector(value, value.length, id)) : value];
        })),
        nametable_pages: [read('display.nametablePage'), read('display.nametableXor')]});
      const apply = output => {
        for (const [key, id] of windowFieldEntries) {
          const value = output[key], vector = Array.isArray(value) || value instanceof Uint8Array;
          if (!(vector ? sameFrameVector(value, read(id)) : value === read(id)))
            write(id, vector ? Array.from(value) : value);
        }
      };
      let ready = false;
      const services = createFrameCommitServices(catalog, {advanceFrame: input => {
        if (ready) {ready = false; return {status: 'available', state: project(), effects: []};}
        apply(input);
        return {status: 'pending', state: input, effects: []};
      }});
      let result = services.beginLogicalWindow(project());
      if (result.state) apply(result.state);
      for (;;) {
        if (result.status === 'available') {
          const page = catalog.logical_profiles[0].page_selector === 0 ? 'display.nametablePage' : 'display.nametableXor';
          write(page, read(page) ^ 1); write('control.displayProfile', preset);
          yield* render({kind: 'text-window', preset});
          yield* wait();
          write('display.subroutineBank', subroutineBank);
          return snapshot('available');
        }
        if (result.status !== 'pending') {
          accept((yield snapshot('pending', {kind: 'text-window'}, {missing: result.missing})) || {});
          result = services.beginLogicalWindow(project());
          continue;
        }
        result = services.resumeLogicalWindow({...result, effects: []});
        if (result.state) apply(result.state);
        if (result.effects?.length) {
          const device = getDisplay();
          const display = device && Object.fromEntries(Object.keys(device).map(key =>
            [key, result.state[key] ?? device[key]]));
          accept({effects: result.effects, display});
        }
        if (result.status === 'pending' && result.continuation.phase === 'logical-barrier') {
          yield* wait();
          ready = true;
        }
      }
    }, display);
  }
  return Object.freeze({
    prepareRecord({display} = {}) {
      return createExecution(function* ({call, snapshot, accept}) {
        if (!Number.isInteger(recordOrigin) || recordOrigin < 0x6000 || recordOrigin >= 0x6400)
          throw new TypeError('文本记录缺少所属输出起点');
        const rectangle = clearRectangles?.[read('text.clearPreset')];
        const cleared = executeFacilityWindowRoutine(windowCatalog, 'window-FA63', {
          logical_tiles: read('display.logicalTiles'), rectangle_index: rectangle});
        if (cleared.status !== 'available') {
          yield* call('text-record-clear', null, {missing: cleared.missing});
        } else {
          write('display.logicalTiles', cleared.state.logical_tiles);
          accept({effects: cleared.effects});
        }
        yield* call('text-record-window', commitWindow, {preset: read('control.displayProfile')});
        write('text.outputPointer', (recordOrigin + read('text.windowOffset')) & 65535);
        write('text.active', 1);
        return snapshot('available');
      }, display);
    },
    commitWindow,
    choose({parameters, display} = {}) {
      return createExecution(function* ({wait, render, snapshot}) {
        const origin = read('text.outputPointer');
        write('text.choiceOrigin', origin >> 2);
        const x = ((origin << 3) - parameters.x_bias) & 255;
        write('text.choiceX', x);
        write('selection.y', ((origin >> 2) - parameters.y_bias) & 255);
        write('scratch.tileX', 5); write('scratch.tileY', 0);
        write('parameter.result', 0); write('selection.sprite', parameters.sprite);
        write('selection.x', x);
        for (;;) {
          yield* render({kind: 'text-choice'});
          yield* wait();
          const edges = read('controller.edges');
          if (edges & 128) break;
          if (edges & 64) {write('parameter.result', 1); break;}
          const direction = read('controller.direction');
          if (edges && direction >= 3) {
            const value = direction - 3;
            write('parameter.result', value);
            write('selection.x', (x + (value ? parameters.x_spacing : 0)) & 255);
          }
        }
        write('selection.sprite', 0);
        write('text.nestedState', (read('text.nestedState') + 1) & 255);
        return snapshot('available', null, {confirmed: true, value: read('parameter.result')});
      }, display);
    },
    runHook({hook, display} = {}) {
      return createExecution(function* ({wait, call, snapshot, accept}) {
        const command = [...read('dispatch.commandWindow')]; command[0] = hook;
        write('dispatch.commandWindow', command);
        const bank = read('text.recordBank'), subroutineBank = read('display.subroutineBank');
        write('display.subroutineBank', 0x1A);
        const actor = read('control.activeActor');
        write('dispatch.actorIndex', actor);
        let slot = 255;
        for (let index = 15; index >= 0; index--)
          if ([0x83, 0x44].includes(read('render.marker', index)) && read('render.actorIndex', index) === actor) {
            slot = index; break;
          }
        while (slot === 255) {
          accept((yield snapshot('pending', {kind: 'text-hook-actor'}, {missing: ['active-actor-render-slot']})) || {});
          for (let index = 15; index >= 0; index--)
            if ([0x83, 0x44].includes(read('render.marker', index)) && read('render.actorIndex', index) === actor) {
              slot = index; break;
            }
        }
        write('dispatch.renderSlot', slot);
        const savedAction = read('render.actionState', slot), savedLock = read('control.controlLock');
        write('render.actionState', 0, slot); write('control.controlLock', 255);
        do {
          write('dispatch.renderSlot', slot);
          if (!read('actor.movementResult', actor) || !read('actor.motionPhase', actor))
            yield* call('text-hook-action', () => createHookExecution?.([...read('dispatch.commandWindow')]), {hook});
          yield* call('text-hook-scene', renderScene, {kind: 'text-hook', actor, slot});
          yield* wait();
        } while (read('render.actionState', slot) || read('actor.movementResult', actor) && read('actor.motionPhase', actor));
        write('control.controlLock', savedLock); write('render.actionState', savedAction, slot);
        write('display.subroutineBank', subroutineBank); write('text.recordBank', bank);
        return snapshot('available');
      }, display);
    },
  });
}
