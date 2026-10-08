// @editor-module 逻辑窗口按行提交图块，再合成与提交属性。
import {requireFrameVector as vector, requireFrameByte as requireByte, commitPpuQueues, commitFrameNmi, advanceFrameBarrier} from './frame-commit-semantics.js';
import {measureFrameNmiClock} from './frame-nmi-clock.js';
import {advanceRandomWaitClock, nextNmiEdgeCycle} from './random-wait-clock.js';

import {cloneFrameValue} from './frame-state-values.js';

const unavailable = missing => ({status: 'unavailable', missing});
const wrapY = value => value >= 15 ? value - 15 : value;
const attributeIndex = (x, y) => ((y << 2) & 56) | ((x >> 1) & 7) | ((x << 2) & 64);
const quadrant = (x, y) => (y & 1) * 2 + (x & 1);
const tileAddress = (x, y) => 0x2000 | ((x & 32) << 5) | ((y & 31) << 5) | (x & 31);
const attributeAddress = (x, y) => 0x23C0 | ((y << 2) & 56) | ((x >> 1) & 7) | ((x >> 2) & 4) << 8;

function context(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.logical_profiles?.[requireByte(state, 'logical_profile')];
  if (!profile) throw new Error('logical-profile-domain');
  const pages = vector(state.nametable_pages, 2, 'nametable_pages');
  const x = (requireByte(state, 'camera_x') + (pages[profile.page_selector] ? 0 : 16)) & 31;
  const y = wrapY((requireByte(state, 'camera_y') + profile.source_y) & 255);
  if (y >= 15) throw new Error('logical-camera-domain');
  return {profile, x, y};
}

function beginLogicalWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  let savedOam;
  try {
    context(catalog, state);
    vector(state.logical_tiles, 1024, 'logical_tiles');
    vector(state.main_queue, 352, 'main_queue');
    savedOam = requireByte(state, 'oam_pending');
    state.oam_pending = 0;
  } catch (error) { return unavailable([error.message]); }
  return {status: 'pending', state, effects: [], continuation: {phase: 'logical-tiles', row: 0, saved_oam_pending: savedOam}};
}

function tileBatch(state, profile, x, y, row) {
  const queue = state.main_queue;
  let cursor = 0, spans = 0;
  const startX = x * 2;
  let tileY = y * 2;
  const nextY = value => (value + 1 + (value + 1 >= 30 ? 2 : 0)) & 31;
  for (let index = 0; index < row * 2; index++) tileY = nextY(tileY);
  for (let half = 0; half < 2; half++) {
    if (!(half && state.logical_skip_gate && (profile.skip_row & 1) && tileY === profile.skip_row)) {
      let column = 0;
      while (column < 32) {
        const currentX = (startX + column) & 63;
        const size = Math.min(32 - column, 32 - (currentX & 31));
        const address = tileAddress(currentX, tileY);
        queue[cursor++] = address >> 8;
        queue[cursor++] = address & 255;
        queue[cursor++] = size;
        for (let index = 0; index < size; index++)
          queue[cursor++] = state.logical_tiles[profile.source_offset + row * 64 + half * 32 + column + index];
        column += size;
        spans++;
      }
    }
    tileY = nextY(tileY);
  }
  state.span_count = spans;
}

function mergeAttributes(catalog, state, profile, x, y) {
  const logical = state.logical_tiles;
  const shadow = vector(state.attribute_shadow, 128, 'attribute_shadow');
  const masks = catalog.masks;
  if (!requireByte(state, 'logical_attribute_gate')) {
    for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
      const sourceY = (profile.source_y + row) & 255;
      const index = attributeIndex(column, sourceY);
      logical[960 + index] |= masks.keep[quadrant(column, sourceY)] ^ 255;
    }
  }
  for (let row = 0; row < profile.rows; row++) for (let column = 0; column < 16; column++) {
    const sourceY = wrapY((profile.source_y + row) & 255);
    const targetY = wrapY((y + row) & 255);
    const targetX = (x + column) & 255;
    const source = logical[960 + attributeIndex(column, sourceY)];
    const palette = (source >> (quadrant(column, sourceY) * 2)) & 3;
    const index = attributeIndex(targetX, targetY), keep = masks.keep[quadrant(targetX, targetY)];
    shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & masks.palette_values[palette]);
  }
}

function attributeBatch(state, x, y, row) {
  let cursor = 0;
  const targetY = y + row * 2;
  for (let column = 0; column < 8 + (x & 1); column++) {
    const targetX = x + column * 2;
    const address = attributeAddress(targetX, targetY);
    state.main_queue[cursor++] = address >> 8;
    state.main_queue[cursor++] = address & 255;
    state.main_queue[cursor++] = state.attribute_shadow[attributeIndex(targetX, targetY)];
  }
  state.main_queue_length = cursor;
}

function resumeLogicalWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable(['logical-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  let continuation = {...pending.continuation};
  try {
    const {profile, x, y} = context(catalog, state);
    if (continuation.phase !== 'logical-barrier') {
      if (continuation.phase === 'logical-tiles') tileBatch(state, profile, x, y, continuation.row);
      else if (continuation.phase === 'logical-attributes') attributeBatch(state, x, y, continuation.row);
      else throw new Error('logical-window-phase');
      continuation = {...continuation, phase: 'logical-barrier', next_phase: continuation.phase};
    }
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state;
    effects.push(...frame.effects);
    const row = continuation.row + 1;
    if (continuation.next_phase === 'logical-tiles') {
      if (row < profile.rows) continuation = {...continuation, phase: 'logical-tiles', row};
      else {
        state.oam_pending = continuation.saved_oam_pending;
        mergeAttributes(catalog, state, profile, x, y);
        continuation = {...continuation, phase: 'logical-attributes', row: 0};
      }
    } else if (row < profile.attribute_rows + (y >= 9 || (y & 1) ? 1 : 0))
      continuation = {...continuation, phase: 'logical-attributes', row};
    else return {status: 'available', state, effects};
    return {status: 'pending', state, effects, continuation};
  } catch (error) { return unavailable([error.message]); }
}

function restoreSceneLogicalRow(catalog, input, row, {readMetatile} = {}) {
  const state = cloneFrameValue(input);
  const effects = [];
  try {
    const {profile} = context(catalog, state);
    if (!Number.isInteger(row) || row < 0 || row >= profile.rows) throw new Error('scene-logical-row');
    if (typeof readMetatile !== 'function') throw new Error('current-scene-metatiles');
    const logical = vector(state.logical_tiles, 1024, 'logical_tiles');
    const shadow = vector(state.attribute_shadow, 128, 'attribute_shadow');
    const worldX = requireByte(state, 'world_x'), worldY = requireByte(state, 'world_y');
    const screenX = requireByte(state, 'camera_x');
    const screenY = wrapY((requireByte(state, 'camera_y') + profile.source_y + row) & 255);
    for (let column = 0; column < 16; column++) {
      const cell = readMetatile((worldX + column) & 255, (worldY + profile.source_y + row) & 255);
      const tiles = vector(cell?.tiles, 4, 'current-metatile-tiles');
      const palette = requireByte(cell, 'palette');
      if (palette > 3) throw new Error('current-metatile-palette');
      const offset = profile.source_offset + row * 64 + column * 2;
      logical[offset] = tiles[0]; logical[offset + 1] = tiles[1];
      logical[offset + 32] = tiles[2]; logical[offset + 33] = tiles[3];
      const x = (screenX + column) & 255;
      const index = attributeIndex(x, screenY), keep = catalog.masks.keep[quadrant(x, screenY)];
      shadow[index] = (shadow[index] & keep) | ((keep ^ 255) & catalog.masks.palette_values[palette]);
    }
    effects.push({kind: 'scene-logical-row', row});
  } catch (error) { return unavailable([error.message]); }
  return {status: 'available', state, effects};
}

function partialContext(catalog, state) {
  if (catalog?.confirmation_status !== 'confirmed') throw new Error('frame-commit-sources');
  const profile = catalog.partial_profiles?.[requireByte(state, 'logical_profile')];
  if (!profile) throw new Error('partial-window-profile');
  vector(state.logical_tiles, 1024, 'logical_tiles');
  vector(state.main_queue, 352, 'main_queue');
  const pages = vector(state.nametable_pages, 2, 'nametable_pages');
  const x = (((requireByte(state, 'camera_x') & 31) * 2 + profile.x) & 255)
    ^ (pages[profile.page_selector] ? 32 : 0);
  let y = (requireByte(state, 'camera_y') * 2 + profile.y) & 255;
  if (y >= 30) y -= 30;
  return {profile, x, y};
}

function beginPartialWindowCommit(catalog, input) {
  const state = cloneFrameValue(input);
  try {partialContext(catalog, state);}
  catch (error) {return unavailable([error.message]);}
  return {status: 'pending', state, effects: [], continuation: {phase: 'partial-tiles', batch: 0}};
}

function resumePartialWindowCommit(catalog, pending, {advanceFrame} = {}) {
  if (pending?.status !== 'pending') return unavailable(['partial-window-continuation']);
  let state = cloneFrameValue(pending.state);
  const effects = [...pending.effects];
  const continuation = {...pending.continuation};
  try {
    const {profile, x, y} = partialContext(catalog, state);
    if (continuation.phase === 'partial-tiles') {
      let cursor = 0, spans = 0;
      const firstRow = continuation.batch * profile.batch_rows;
      for (let row = firstRow; row < firstRow + profile.batch_rows; row++) {
        let column = 0;
        while (column < profile.width) {
          const currentX = (x + column) & 255;
          const size = Math.min(profile.width - column, 32 - (currentX & 31));
          const address = tileAddress(currentX, (y + row) % 30);
          state.main_queue[cursor++] = address >> 8;
          state.main_queue[cursor++] = address & 255;
          state.main_queue[cursor++] = size;
          for (let index = 0; index < size; index++) state.main_queue[cursor++] =
            state.logical_tiles[((profile.y + row) * 32 + profile.x + column + index) & 1023];
          column += size; spans++;
        }
      }
      state.span_count = spans;
      continuation.phase = 'partial-barrier';
    } else if (continuation.phase !== 'partial-barrier') throw new Error('partial-window-phase');
    const barrier = {status: 'pending', state, effects, continuation};
    let frame;
    if (requireByte(state, 'nmi_mode') === 1) {
      if (typeof advanceFrame !== 'function') return {...barrier, missing: ['frame-barrier-effects']};
      frame = advanceFrame(cloneFrameValue(state));
      if (frame?.status === 'pending') return {...barrier, state: frame.state, effects: [...effects, ...frame.effects]};
      if (frame?.status !== 'available') return frame || unavailable(['frame-barrier-effects']);
      if (frame.state.frame_counter === state.frame_counter) return barrier;
    } else frame = commitPpuQueues(catalog, state);
    if (frame.status !== 'available') return frame;
    state = frame.state; effects.push(...frame.effects);
    const batch = continuation.batch + 1;
    return batch === profile.batches ? {status: 'available', state, effects}
      : {status: 'pending', state, effects, continuation: {phase: 'partial-tiles', batch}};
  } catch (error) {return unavailable([error.message]);}
}

export function createFrameCommitServices(catalog, {advanceRandom, pollController, nmiEvents, readMetatile,
  advanceFrame: frameService} = {}) {
  const advanceFrame = frameService || (state => advanceFrameBarrier(catalog, state, {
    advanceRandom, pollController,
    nmiEvents: typeof nmiEvents === 'function' ? nmiEvents(state) : nmiEvents,
  }));
  return {
    commitNmi: state => commitFrameNmi(catalog, state),
    measureNmiClock: (state, timing) => measureFrameNmiClock(catalog, state, timing),
    measureWaitClock: (state, {cpuCycle, phase, nmiEdgeCycle} = {}) => {
      try {
        return advanceRandomWaitClock(catalog, state, {cpuCycle,
          nmiEdgeCycle: nmiEdgeCycle ?? nextNmiEdgeCycle(cpuCycle, phase)});
      } catch (error) {return unavailable([error.message]);}
    },
    advanceFrame,
    beginLogicalWindow: state => beginLogicalWindowCommit(catalog, state),
    resumeLogicalWindow: pending => resumeLogicalWindowCommit(catalog, pending, {advanceFrame}),
    beginPartialWindow: state => beginPartialWindowCommit(catalog, state),
    resumePartialWindow: pending => resumePartialWindowCommit(catalog, pending, {advanceFrame}),
    restoreSceneRow: (state, row) => restoreSceneLogicalRow(catalog, state, row, {readMetatile}),
  };
}
