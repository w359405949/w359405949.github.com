// @editor-module 剧情快照只提供动作现场，显示复用场景进入、槽投影、OAM 与文本服务。
import {createSceneActionState} from './scene-action-state.js';
import {initializeSceneContext} from './scene-context-initialization.js';
import {createSceneDrawSlotServices, loadSceneDrawProjectionParameters} from './scene-draw-slot-projection.js';
import {createSceneOamServices} from './scene-oam-composition.js';
import {loadSceneOamSources} from './scene-oam-sources.js';
import {createSceneRenderServices} from './scene-render-execution.js';
import {createSceneActionCore} from './scene-action-core.js';
import {createTextInteractionServices} from './text-interaction-execution.js';
import {FIELD_SUBMENU_CODE_PARAMETERS, fieldSubmenuCodeValues, fieldSubmenuCodeValue,
  dialogueRuntimeParameters} from './field-submenu-code-sources.js';
import {cloneFrameValue, sameFrameVector, requireFrameVector} from './frame-state-values.js';
import {packSceneDisplayDevice, unpackSceneDisplayDevice, unpackSceneDisplayRaster} from './scene-display-state.js';

const directions = ['up', 'down', 'left', 'right'];
const available = result => {
  if (result?.status !== 'available') throw new Error(`剧情显示：${(result?.missing || [result?.continuation?.kind || result?.status]).join(', ')}`);
  return result;
};

export function storyUsesSceneDisplay(compiled) {
  const first = compiled?.frames?.[0];
  return Boolean(first?.context && first.sceneId >= 0 && first.sceneId <= 0xEF && !compiled.endingAnimation);
}

export async function createStoryDisplayPreview({database, readProject, workspaceDocument,
  saveDocument, saveRuntimeDocument, saveValue, saveSlot = 1, readGlyph, readCorePatterns, writeGlyphCells}) {
  const readDocument = id => database.getResourceDocument(id, null);
  const readField = source => database.getField(source.resource_id, source.entity_handle, source.field);
  const preparedSources = Promise.all([
    loadSceneDrawProjectionParameters({readDocument, readField}), loadSceneOamSources(database),
    database.getDocument('project.ui.frame-commits', null), database.getDocument('project.text-catalog', null),
    fieldSubmenuCodeValues(FIELD_SUBMENU_CODE_PARAMETERS.filter(row =>
      /^(glyph-cache-|dialogue-|confirm-|menu-text-origin-|field-ui-palette-)/.test(row.name)).map(row => row.name), readField),
    readDocument('chr-bank-mapping-service'),
    database.getDocument('project.text-providers', null),
  ]);
  const state = createSceneActionState({workspaceDocument, saveDocument, saveRuntimeDocument, saveValue, saveSlot});
  const [parameters, sources, interfaces, textCatalog, codeValues, chrPresets, providerCatalog] = await preparedSources;
  const frameCommitCatalog = interfaces.frame_commit_sources;
  const write = (id, value, index = 0) => {state.field(id, index).value = value;};
  const read = (id, index = 0) => state.field(id, index).value;
  const oamServices = createSceneOamServices({state, sources});
  const slotServices = createSceneDrawSlotServices({state, parameters,
    readDocument: id => database.peekResourceDocument(id, null),
  });
  const sceneRenderer = createSceneRenderServices({state, slotServices, oamServices});
  const renderServices = {createExecution: options => sceneRenderer.createExecution({...options, advanceActions: false})};
  const core = createSceneActionCore({readProject, database, sceneActionState: state,
    frameCommitCatalog});
  const glyphParameters = Object.fromEntries(FIELD_SUBMENU_CODE_PARAMETERS
    .filter(row => row.name.startsWith('glyph-cache-')).map(row =>
      [row.name.slice(12).replaceAll('-', '_'), fieldSubmenuCodeValue(codeValues, row.name)]));
  const runtime = dialogueRuntimeParameters(codeValues);
  const clearRectangles = Array.from({length: 3}, (_, index) => fieldSubmenuCodeValue(codeValues, `dialogue-clear-rectangle-${index}`));
  const interactions = createTextInteractionServices({state, catalog: frameCommitCatalog,
    displayServices: core.createSceneDisplayServices(),
    controllerServices: core.createControllerInputServices(interfaces.application_window_sources),
    windowCatalog: interfaces.application_window_sources,
    clearRectangles,
    recordOrigin: fieldSubmenuCodeValue(codeValues, 'menu-text-origin-low') | fieldSubmenuCodeValue(codeValues, 'menu-text-origin-high') << 8,
    renderScene: () => renderServices.createExecution(), createHookExecution: core.createSceneActionInlineExecution});
  let textCells = new Map();
  const onTextOutput = event => {
    if (event.kind === 'glyph') writeGlyphCells?.(textCells, event.glyph,
      event.cursor % 32 * 8 - (event.half ? 4 : 0), (event.cursor >> 5) * 8 - 4);
    else if (event.kind === 'tile') textCells.delete(event.position);
    else if (event.kind === 'scroll') {
      let {source, target} = event;
      for (let row = 0; row < event.rows; row++) {
        for (let column = 0; column < event.width; column++) {
          const pixels = textCells.get((source + column) & 1023);
          if (pixels) textCells.set((target + column) & 1023, pixels);
          else textCells.delete((target + column) & 1023);
        }
        source += event.source_step; target += event.target_step;
      }
    }
  };
  const textServices = core.createTextExecutionServices({...interactions, textCatalog, providerCatalog, codeValues, runtime, glyphParameters, readGlyph, onTextOutput,
    windowCatalog: interfaces.application_window_sources,
    controllerCatalog: interfaces.application_window_sources, renderServices});
  let entry = null, display = null, textKey = null;
  const entries = new Map(), textFrames = new Map(), textExecutions = new Map();
  const eventFields = state.fields().filter(field => field.fieldName.startsWith('save.active.global_event_flag.'));
  const textFields = state.fields().filter(field => (field.fieldName.startsWith('text.')
    || field.fieldName.startsWith('glyph.') || field.fieldName.startsWith('display.')
    || field.fieldName.startsWith('controller.') || field.fieldName === 'control.displayProfile')
    && field.knowledge === 'confirmed'
    && !['display.oamShadow', 'display.oamPending', 'display.frameCounter'].includes(field.fieldName));
  const buttons = a => Object.fromEntries(['a', 'b', 'select', 'start', ...directions].map(name => [name, name === 'a' && a]));
  const advanceAudio = ({state, display}) => ({status: 'available', state, display, effects: []});
  function drain(execution, {page = null, initial = null} = {}) {
    let result = initial || execution.advance(), ticks = 0;
    while (result.status === 'pending') {
      if (result.missing?.some(value => value !== result.continuation?.kind))
        throw new Error(`剧情文本：${result.missing.join(', ')}`);
      if (result.display) display = result.display;
      const confirmation = result.continuation?.kind === 'text-frame' && result.continuation.wait === 'controller';
      if (page !== null && confirmation && result.page >= page && !read('controller.current')) {
        result = execution.advance({display, buttons: buttons(false), advanceAudio});
        if (result.display) display = result.display;
        break;
      }
      if (++ticks > 8192) throw new Error('剧情文本未到达稳定边界');
      const choosing = result.continuation?.kind === 'text-choice';
      result = execution.advance({display, buttons: buttons((confirmation || choosing) && !(ticks & 1)), advanceAudio});
      if (result.status === 'pending' && result.missing?.length && !result.frame && !result.display)
        throw new Error(`剧情文本：${result.missing.join(', ')}`);
    }
    if (result.display) display = result.display;
    if (page === null) available(result);
    return result;
  }
  const position = (family, index, actor) => {
    const pose = actor.renderPose || actor, motion = pose.motion;
    write(`${family}.x`, (motion ? motion.toX : Math.round(pose.x)) & 255, index);
    write(`${family}.y`, (motion ? motion.toY : Math.round(pose.y)) & 255, index);
    write(`${family}.direction`, Math.max(0, directions.indexOf(pose.direction || actor.direction)), index);
    write(`${family}.motionPhase`, motion ? Math.max(0, Math.round(32 * (1 - motion.elapsed / motion.duration))) : 0, index);
    const direction = motion ? directions.findIndex(name => ({up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]})[name]
      .every((delta, axis) => delta === Math.sign((axis ? motion.toY - motion.fromY : motion.toX - motion.fromX)))) + 1 : 0;
    write(`${family}.${family === 'party' ? 'motionDirection' : 'movementResult'}`, direction, index);
  };
  async function initialize(snapshot) {
    const mapChanges = (snapshot.fieldTiles || []).filter(tile => tile.sceneId === snapshot.sceneId)
      .map(tile => ({x: tile.x, y: tile.y, metatileId: tile.tileId}));
    const scrollTiles = {
      x: Math.floor(snapshot.cameraTileOriginX) - Math.floor(snapshot.displayEntryCameraX ?? snapshot.cameraTileOriginX),
      y: Math.floor(snapshot.cameraTileOriginY) - Math.floor(snapshot.displayEntryCameraY ?? snapshot.cameraTileOriginY),
    };
    const key = JSON.stringify([snapshot.sceneId, snapshot.actorListId, Math.floor(snapshot.cameraTileOriginX),
      Math.floor(snapshot.cameraTileOriginY), (snapshot.eventFlags || []).filter(flag => flag >= 8), mapChanges, scrollTiles]);
    const source = `scene:${snapshot.sceneId.toString(16).toUpperCase().padStart(2, '0')}`;
    const version = database.fieldRevision?.(source) ?? null;
    if (entry?.key === key && entry.sceneVersion === version) return;
    const cached = entries.get(key);
    if (cached && cached.entry.sceneVersion === version) {
      state.restore(cached.state); entry = cached.entry;
      display = packSceneDisplayDevice(entry.display); textKey = null; textCells = new Map(); return;
    }
    entry = available(await initializeSceneContext({state, readDocument, readField,
      createRenderServices: async () => {
        write('dispatch.commandWindow', Array(6).fill(0));
        return renderServices;
      },
      entry: {sceneId: snapshot.sceneId, cameraX: Math.floor(snapshot.cameraTileOriginX),
        cameraY: Math.floor(snapshot.cameraTileOriginY), storyState: snapshot.storyState || 0, mapChanges, scrollTiles}}));
    entry.scrollTiles = scrollTiles;
    entry.sceneVersion = database.fieldRevision?.(source) ?? null;
    entry.key = key; display = packSceneDisplayDevice(entry.display); textKey = null;
    textCells = new Map();
    for (const id of ['text.windowOffset', 'text.command', 'text.nestedState', 'text.active',
      'text.windowRow', 'text.nextRecord', 'text.regionId', 'text.clearPreset', 'text.recordCounter',
      'text.mode', 'text.outputCount', 'text.characterDelay']) write(id, 0);
    for (const field of state.fields().filter(field => ['oam.secondaryDescriptor', 'oam.secondaryFrame',
      'oam.secondaryX', 'oam.secondaryY'].includes(field.fieldName))) field.value = 0;
    entries.set(key, {entry, state: state.capture()});
    if (entries.size > 16) entries.delete(entries.keys().next().value);
  }
  function project(snapshot) {
    write('display.frameCounter', snapshot.renderFrameParity || 0);
    write('parameter.frameCountdown', 0);
    write('control.storyState', snapshot.storyState || 0);
    write('control.controlLock', snapshot.controlLock || 0);
    write('parameter.result', snapshot.runtimeResultD5 || 0);
    write('parameter.story', snapshot.parameters?.storyParameter || 0);
    for (let slot = 0; slot < 16; slot++) if ((read('render.marker', slot) & 63) !== 5) {
      write('render.marker', 0, slot); write('render.frame', 0, slot);
    }
    for (const actor of snapshot.actors || []) {
      if (actor.hidden || !Number.isInteger(actor.actorSlot) || actor.actorSlot >= 14) continue;
      const index = actor.actorSlot, slot = actor.renderSlot;
      if (!Number.isInteger(slot) || slot < 0 || slot > 15) continue;
      position('actor', index, actor);
      write('actor.type', actor.renderPose?.actorType ?? actor.actorType, index);
      write('actor.motionAttributes', actor.motionAttributes || 0, index);
      write('render.marker', actor.renderMode === 'type-animation' ? 0x83 : actor.renderMode === 'direct-actor-frame' ? 0x44 : 4, slot);
      write('render.actorIndex', index, slot);
    }
    const usedParty = new Set((snapshot.actors || []).filter(actor => !actor.hidden && actor.partySlot != null).map(actor => actor.partySlot));
    for (const actor of snapshot.partyActors || []) {
      if (usedParty.has(actor.partySlot)) continue;
      const index = actor.fieldEntityIndex ?? actor.partySlot;
      if (index < 0 || index > 3) continue;
      let slot = 15;
      while (slot >= 0 && read('render.marker', slot)) slot--;
      if (slot < 0) break;
      position('party', index, actor);
      write('party.order', actor.partySlot, index);
      write('party.renderState', actor.actorType, index);
      write('render.marker', actor.renderMode === 'direct-actor-frame' ? 0x42 : 0x81, slot);
      write('render.actorIndex', index, slot);
    }
    for (const field of eventFields)
      field.value = Number((snapshot.eventFlags || []).includes(parseInt(field.fieldName.split('.').at(-1), 16)));
    const rendered = available(renderServices.createExecution().advance());
    display = {...display, oam: Uint8Array.from(requireFrameVector(read('display.oamShadow'), 256, 'oam'))};
    write('display.oamPending', 0);
    return rendered;
  }
  function dialogue(snapshot) {
    const line = snapshot.dialogue;
    if (!line) {textKey = null; textCells = new Map(); return;}
    if (!line.recordFound || line.synthetic || line.uiScreenId) throw new Error('剧情台词缺少文本执行入口');
    const recordKey = JSON.stringify([entry.key, entry.sceneVersion, line.regionId, line.recordId, line.commandCursor,
      line.prefixRecordId, line.interactionWindow]);
    const page = line.pageIndex || 0, key = `${recordKey}:${page}`;
    if (textKey === key) return;
    const cached = textFrames.get(key);
    if (cached) {
      for (const field of cached.fields) write(field.id, cloneFrameValue(field.value), field.index);
      display = {...display, ...cloneFrameValue(cached.display)};
      textCells = new Map(cached.textCells); textKey = key; return;
    }
    const continuing = textExecutions.get(recordKey);
    if (continuing && continuing.page < page) {
      for (const field of continuing.fields) write(field.id, cloneFrameValue(field.value), field.index);
      display = {...display, ...cloneFrameValue(continuing.display)};
      textCells = new Map(continuing.textCells);
      drain(continuing.execution, {page, initial: continuing.execution.advance({display, buttons: buttons(true), advanceAudio})});
      remember(continuing.execution); return;
    }
    display = {...display, chr_ram: Uint8Array.from(requireFrameVector(readCorePatterns(), 2048, 'chr_ram'))};
    const preset = chrPresets.shared_chr_bank_register_4_5_preset_pairs[1];
    const banks = [...chrPresets.shared_chr_bank_register_0_3_prefix, preset.register_4, preset.register_5];
    write('display.primaryChrBanks', banks); write('display.rasterChrBanks', banks);
    write('display.textCameraX', entry.scrollTiles.x & 255); write('display.textCameraY', entry.scrollTiles.y & 255);
    write('display.logicalAttributeGate', 0);
    write('display.logicalTiles', Array(1024).fill(255));
    textCells = new Map();
    write('text.recordCounter', 0); write('text.active', 0);
    write('text.outputPointer', 0x6000 + readProject().ui.construction.dialogue_runtime.logical_layout_origin);
    drain(textServices.createExecution({record: line.interactionWindow ? 'record:03:007'
      : readProject().ui.construction.dialogue_runtime.common_layout_record, finalConfirmation: false}));
    const palette = [...read('display.paletteShadow')];
    ['background', 'foreground', 'light', 'dark'].forEach((name, index) => {
      palette[12 + index] = fieldSubmenuCodeValue(codeValues, `field-ui-palette-${name}`);
    });
    write('display.paletteShadow', palette); write('display.palettePending', 255);
    write('display.textCameraX', entry.scrollTiles.x & 255); write('display.textCameraY', entry.scrollTiles.y & 255);
    write('display.rasterCtrl', entry.display.ppu_ctrl);
    write('control.displayProfile', 1);
    write('text.windowOffset', line.interactionWindow ? 0x4C : runtime.text_origin);
    write('text.windowRow', line.interactionWindow ? 0x0E : runtime.line_origin);
    const clearPreset = line.interactionWindow ? 0
      : clearRectangles.indexOf(readProject().ui.construction.dialogue_runtime.clear_rectangle.selector);
    if (clearPreset < 0) throw new Error('剧情对白缺少清除矩形');
    write('text.command', 0); write('text.clearPreset', clearPreset); write('text.characterDelay', 0);
    write('text.recordCounter', 1); write('parameter.dialogueActor', line.prefixRecordId || 0);
    write('control.activeActor', line.actorSlot || 0);
    drain(interactions.prepareRecord({display}));
    const execution = textServices.createExecution({record: `record:${line.regionId.toString(16).toUpperCase().padStart(2, '0')}:${String(line.recordId).padStart(3, '0')}`});
    drain(execution, {page}); remember(execution);
    function remember(execution) {
      const cached = cloneFrameValue({display: Object.fromEntries(Object.entries(display).filter(([name]) => name !== 'oam')),
        textCells: [...textCells],
        fields: textFields.filter(field => field.value !== null).map(field => ({id: field.fieldName, index: field.index, value: field.value}))});
      textFrames.set(key, cached); textExecutions.set(recordKey, {...cached, page, execution});
      if (textFrames.size > 32) textFrames.delete(textFrames.keys().next().value);
      if (textExecutions.size > 16) textExecutions.delete(textExecutions.keys().next().value);
      textKey = key;
    }
  }
  return {async render(snapshot) {
    const before = state.capture(), previousEntry = entry, previousDisplay = display, previousTextKey = textKey,
      previousTextCells = new Map(textCells);
    try {
      for (const field of eventFields)
        field.value = Number((snapshot.eventFlags || []).includes(parseInt(field.fieldName.split('.').at(-1), 16)));
      await initialize(snapshot);
      if (!snapshot.dialogue) {
        display = packSceneDisplayDevice(entry.display);
        write('control.displayProfile', 0); write('display.chrShadow', [...entry.display.chr_banks]);
        write('display.paletteShadow', [...entry.display.ppu_palette]);
      }
      write('control.displayProfile', snapshot.dialogue ? 1 : 0);
      const rendered = project(snapshot);
      dialogue(snapshot);
      const raster = available(core.createSceneDisplayServices().rasterFrame(display));
      const result = {status: 'available', display: unpackSceneDisplayDevice(display, entry.display),
        textCells: new Map([...textCells].map(([position, pixels]) => {
          let x = ((read('display.textCameraX') << 1) + (position & 31)) & 255;
          if (read('display.nametablePage')) x ^= 32;
          let y = ((read('display.textCameraY') << 1) + (position >> 5)) & 255;
          if (y >= 30) y = (y - 30) & 255;
          return [(x & 32) * 32 + (y & 31) * 32 + (x & 31), pixels];
        })),
        raster: unpackSceneDisplayRaster(raster, entry.display), state: state.capture(), rendered,
        randomActors: (snapshot.actors || []).filter(actor => actor.currentCommand?.operation?.includes('wander')).map(actor => actor.actorSlot)};
      return result;
    } catch (error) {
      state.restore(before); entry = previousEntry; display = previousDisplay; textKey = previousTextKey;
      textCells = previousTextCells;
      textExecutions.clear();
      throw error;
    }
  }, state, core};
}
