// @editor-module 场景直接进入按当前字段构造所属现场与显示设备。
import {sceneCameraCoordinate} from './story-camera.js';
import {projectSceneMetatileSources, sceneMetatileAttributeRecords} from './metatile-source.js';
import {sceneRuntimeMap, sceneMapCell, sceneRuntimeMetatileId, sceneRuntimeMetatileOverlays} from './scene-runtime-map.js';
import {worldCoarsePatternCells} from './scene-config-owner.js';
import {rebuildSceneParty} from './scene-party-rebuild.js';
import {fieldSubmenuCodeSource} from './field-submenu-code-sources.js';

const byte = (value, label) => {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError(label);
  return value;
};

function sceneEntryNametables(scene, camera, offset = {x: 0, y: 0}) {
  const tables = Array(2048).fill(0);
  for (let y = 0; y < 15; y++) for (let x = 0; x < 32; x++) {
    const world = scene.id === 0;
    const id = (world ? sceneRuntimeMetatileId(scene, (camera.x + x) & 255, (camera.y + y) & 255)
      : sceneMapCell(scene, camera.x + x, camera.y + y)?.metatileId)
      ?? scene.header_extension[6];
    const tiles = scene.metatile_definitions[id], palette = scene.metatile_palette_ids[id];
    if (!Array.isArray(tiles) || tiles.length !== 4) throw new TypeError(`scene-metatile:${id}`);
    const physicalX = (x + offset.x) & 31, physicalY = ((y + offset.y) % 15 + 15) % 15;
    const page = physicalX >> 4, column = physicalX & 15, start = page * 1024 + physicalY * 64 + column * 2;
    tiles.forEach((tile, quadrant) => {
      tables[start + (quadrant & 1) + (quadrant >> 1) * 32] = byte(tile, 'scene-tile');
    });
    const at = page * 1024 + 960 + (physicalY >> 1) * 8 + (column >> 1);
    tables[at] |= palette << (((physicalY & 1) * 2 + (column & 1)) * 2);
  }
  return tables;
}

export async function initializeSceneContext({state, readDocument, readField, createRenderServices, entry = {}}) {
  if (typeof readDocument !== 'function' || typeof readField !== 'function' || typeof createRenderServices !== 'function')
    throw new TypeError('scene-entry-services');
  const before = state.capture();
  const field = (id, index = 0) => state.field(id, index);
  const read = (id, index = 0) => {
    const value = field(id, index).value;
    if (value === null || value === undefined) throw new TypeError(`scene-entry-field:${id}:${index}`);
    return value;
  };
  const write = (id, value, index = 0) => {field(id, index).value = value;};
  const fill = (id, value) => {
    for (const current of state.fields().filter(current => current.fieldName === id)) current.value = value;
  };
  try {
    const sceneId = byte(entry.sceneId ?? read('field.sceneId'), 'scene-entry-id');
    if (sceneId > 0xEF) throw new TypeError('scene-entry-id');
    const world = sceneId === 0;
    const [document, pages, sets, actors, visual, partyTypes, vehicles] = await Promise.all([
      readDocument(`scene:${sceneId.toString(16).toUpperCase().padStart(2, '0')}`),
      ...['metatile-page', 'metatile-set', 'scene-actor', 'actor-visual',
        'party-field-actor-type-map', 'vehicle-visual-selector'].map(id => readDocument(id)),
    ]);
    let scene = projectSceneMetatileSources(document.scene || document, {pages, sets});
    const map = sceneRuntimeMap(scene).map(row => [...row]);
    const coarseMap = world ? [...document.world_raw.coarse_map] : null;
    const overlays = sceneRuntimeMetatileOverlays(scene, document.logic, {
      resolveMetatileId: ({record, overlay}) => {
        if (record.save_flag_bit !== undefined)
          return read(`save.active.treasure_collected_flag.${Number(record.save_flag_bit).toString(16).toUpperCase().padStart(2, '0')}`)
            ? overlay.collected_metatile_id : overlay.uncollected_metatile_id;
        return overlay.metatile_id ?? overlay.uncollected_metatile_id;
      }});
    for (const {x, y, metatileId} of overlays) map[y][x] = metatileId;
    if ((world || scene.header[0] & 4) && !Array.isArray(scene.event_metatile_replacements))
      throw new TypeError('scene-event-metatile-replacements');
    for (const group of scene.event_metatile_replacements || []) {
      if (!read(`save.active.global_event_flag.${group.event_flag.toString(16).toUpperCase().padStart(2, '0')}`)) continue;
      for (const cell of group.replacements) {
        if (world) {
          if (group.coordinate_space !== 'world-coarse-map' || cell.x < 0 || cell.x >= 64 || cell.y < 0 || cell.y >= 64)
            throw new TypeError('scene-event-coarse-coordinate');
          coarseMap[cell.y * 64 + cell.x] = byte(cell.metatile_id, 'scene-event-coarse-pattern');
          for (const replacement of worldCoarsePatternCells(document.world_raw, cell.x * 4, cell.y * 4, cell.metatile_id))
            map[replacement.y][replacement.x] = replacement.metatile_id;
          continue;
        }
        if (!map[cell.y] || cell.x < 0 || cell.x >= scene.width)
          throw new TypeError('scene-event-metatile-coordinate');
        map[cell.y][cell.x] = byte(cell.metatile_id, 'scene-event-metatile');
      }
    }
    for (const {x, y, metatileId} of entry.mapChanges || []) {
      if (!Number.isInteger(x) || !Number.isInteger(y) || !map[y] || x < 0 || x >= scene.width)
        throw new TypeError('scene-entry-map-coordinate');
      map[y][x] = byte(metatileId, 'scene-entry-map-metatile');
    }
    scene = {...scene, map, runtime_map: null};
    if (world) write('field.worldCoarseMap', coarseMap);
    else {
      state.writeBytes('field.sceneMap', map.flat());
      write('field.metatileDefinitions', scene.metatile_definitions.flat());
    }
    const attributes = sceneMetatileAttributeRecords(scene, {pages, sets}).flatMap(record =>
      record.metatile_attributes || record.metatile_attribute_page || []);
    if (!world) {
      attributes[0] = 128;
      write('field.metatileAttributes', attributes);
    }
    const coordinate = (value, label, extent) => {
      if (!Number.isInteger(value) || value < -128 || value > 255) throw new TypeError(label);
      return sceneCameraCoordinate(sceneId, value, extent);
    };
    const camera = {
      x: coordinate(entry.cameraX ?? read('field.cameraX'), 'scene-entry-camera-x', scene.width),
      y: coordinate(entry.cameraY ?? read('field.cameraY'), 'scene-entry-camera-y', scene.height),
    };
    const direction = byte(entry.direction ?? 0, 'scene-entry-direction');
    if (direction > 3) throw new TypeError('scene-entry-direction');
    const offset = entry.scrollTiles || {x: 0, y: 0};
    if (!Number.isInteger(offset.x) || !Number.isInteger(offset.y)) throw new TypeError('scene-entry-scroll');
    write('field.sceneId', sceneId); write('field.cameraX', camera.x & 255); write('field.cameraY', camera.y & 255);
    for (const id of ['field.movementStatus', 'field.cameraMotionDirection', 'party.animationGate',
      'party.blinkDirection', 'control.displayProfile', 'parameter.story', 'control.storyAux',
      'control.controlLock', 'control.activeActor', 'control.interactionCursor', 'parameter.animationStep',
      'display.scrollXShadow', 'display.scrollYShadow', 'display.nametablePage', 'display.nametableXor',
      'display.mainQueueLength', 'display.contiguousLength', 'display.spanCount',
      'display.secondaryQueueLength', 'display.oamPending', 'display.palettePending',
      'display.contiguousLow', 'display.contiguousHigh', 'display.rasterPhase',
      'display.rasterAddress', 'display.rasterTransferCount', 'scratch.savedY',
      'display.irqHandlerIndex', 'controller.current', 'controller.edges', 'controller.direction']) write(id, 0);
    write('control.storyState', byte(entry.storyState ?? 0, 'scene-entry-story-state'));
    write('control.mainMode', 0); write('control.dialogueGate', 255);
    write('display.frameCounter', byte(entry.frameCounter ?? 0, 'scene-entry-frame-counter'));
    write('random.high', byte(entry.randomHigh ?? 0, 'scene-entry-random-high'));
    write('random.low', byte(entry.randomLow ?? 0, 'scene-entry-random-low'));
    write('party.motionSpeed', 1);
    write('display.ppuCtrlShadow', 0x88 | (offset.x >> 4 & 1)); write('display.ppuMaskShadow', 0x1E);
    write('display.scrollXShadow', offset.x * 16 & 255);
    write('display.scrollYShadow', ((offset.y * 16) % 240 + 240) % 240);
    write('display.nmiMode', 1); write('display.nmiWorker', 0xD22F); write('display.irqHandler', 0xD46B);
    write('display.rasterCtrl', read('display.ppuCtrlShadow')); write('display.dynamicIrqLatch', 0xCB);
    write('display.mainQueue', Array(352).fill(0));
    write('display.oamShadow', Array.from({length: 256}, (_, at) => at % 4 === 0 ? 0xEF : 0));
    write('text.recordBank', world ? 7 : 0x13); write('display.subroutineBank', 0x14);
    const zone = camera.x < 128 && camera.y < 145 ? 'northwest'
      : camera.y < 97 ? 'northeast' : camera.x < 96 ? 'southwest' : 'southeast';
    const backgroundBanks = world ? scene.render.zones.find(row => row.name === zone).mmc3_banks
      : scene.render.mmc3_banks;
    const banks = [4, world ? 0x94 : byte(scene.header[15], 'scene-sprite-bank'), ...backgroundBanks];
    write('display.chrShadow', banks);
    const rasterBanks = [0x26, 0x26, 8, 9, 10, 0xCB];
    write('display.rasterChrBanks', rasterBanks);
    write('display.primaryChrBanks', rasterBanks);
    const palette = [...scene.render.background_palette.colors,
      ...visual.field_sprite_palettes.flatMap(row => row.colors)];
    if (palette.length !== 32) throw new TypeError('scene-entry-palette');
    write('display.paletteShadow', palette);
    for (const id of ['render.marker', 'render.frame', 'render.screenXLow', 'render.screenXHigh',
      'render.screenYLow', 'render.screenYHigh', 'render.attributes', 'render.actorIndex',
      'render.waitCounter', 'render.actionState', 'render.loopCounter']) fill(id, 0);
    const allocate = (marker, actor) => {
      for (let slot = 15; slot >= 0; slot--) if (read('render.marker', slot) === 0) {
        write('render.marker', marker, slot); write('render.actorIndex', actor, slot); return;
      }
    };
    for (let index = 0; index < 4; index++) {
      write('party.x', (camera.x + 8) & 255, index); write('party.y', (camera.y + 7) & 255, index);
      write('party.direction', direction, index);
      write('party.motionPhase', 0, index); write('party.motionDirection', 0, index);
      write('party.renderState', 0, index); write('party.order', 0, index);
    }
    write('field.partyCount', 0);
    rebuildSceneParty({state, visual, partyTypes, vehicles});
    for (const id of ['actor.type', 'actor.motionPhase', 'actor.motionAttributes', 'actor.cursor',
      'actor.x', 'actor.y', 'actor.direction', 'actor.movementResult', 'actor.interactionLow',
      'actor.interactionHigh', 'actor.autonomousScript']) fill(id, id === 'actor.type' ? 255 : 0);
    let actorList = read('control.storyState') ? read('control.storyState') + 0xEF : sceneId;
    for (const variant of document.logic?.layers?.actors?.dynamic_variants || []) {
      if (read(`save.active.global_event_flag.${Number(variant.event_flag).toString(16).toUpperCase().padStart(2, '0')}`))
        actorList = variant.actor_list.entry_id;
    }
    const records = actors.records.filter(record => record.entry_id === actorList).sort((a, b) => a.id - b.id);
    for (const record of records) {
      if (record.id > 13) throw new TypeError('scene-entry-actor-capacity');
      for (const [id, value] of Object.entries({x: record.x, y: record.y, type: record.actor_type,
        direction: record.direction, motionAttributes: record.direction_attributes,
        interactionLow: record.interaction_or_record_id, interactionHigh: record.text_region,
        autonomousScript: record.autonomous_script_id})) write(`actor.${id}`, byte(value, id), record.id);
    }
    for (const record of [...records].reverse()) allocate([0x83, 0x44, 4][record.render_slot_marker], record.id);
    for (let index = 10; index >= 0; index--)
      if (read(`save.active.field_object.${index}.scene_id`) === sceneId) allocate(0x85, index);
    for (let id = 0; id < 8; id++) write(`save.active.global_event_flag.${id.toString(16).toUpperCase().padStart(2, '0')}`, 0);
    const renderServices = await createRenderServices({randomPolicy: 'stationary'});
    const frames = [];
    for (let index = 0; index < 6; index++) {
      const result = renderServices.createExecution().advance();
      if (result.status !== 'available') {
        state.restore(before);
        return {...result, stage: 'scene-entry-render', initial_frame: index};
      }
      frames.push(result);
    }
    const nametables = sceneEntryNametables(scene, camera, offset);
    write('display.attributeShadow', [...nametables.slice(960, 1024), ...nametables.slice(1984)]);
    for (const id of ['glyph.tiles', 'glyph.patterns']) {
      const current = field(id); current.value = Array(current.physical.length).fill(0);
    }
    for (const id of ['glyph.addressLow', 'glyph.addressHigh', 'glyph.firstHalf', 'glyph.secondHalf',
      'glyph.pending', 'glyph.half']) write(id, 0);
    const firstTile = await readField(fieldSubmenuCodeSource('glyph-cache-first-tile'));
    write('glyph.pools', Array(3).fill(byte(firstTile.value, 'scene-entry-glyph-first-tile')));
    write('display.logicalTiles', Array(1024).fill(255));
    write('display.oamPending', 0);
    return {status: 'available', state: state.capture(), scene, camera,
      map, actor_list: actorList, initial_frames: frames,
      random_actors: [...new Set(frames.flatMap(frame => frame.effects || [])
        .filter(effect => effect.kind === 'random-actor').map(effect => effect.actor))],
      display: {chr_banks: read('display.chrShadow'), chr_ram: Array(2048).fill(0),
        nametables, ppu_palette: palette, oam: read('display.oamShadow'),
        chr_mode: 1, ppu_ctrl: read('display.ppuCtrlShadow'), ppu_mask: read('display.ppuMaskShadow'),
        scroll_x: read('display.scrollXShadow'), scroll_y: read('display.scrollYShadow'),
        irq_latch: 0xCB, irq_enabled: false, mirroring: 'vertical'},
    };
  } catch (error) {
    state.restore(before);
    return {status: 'unavailable', stage: 'scene-entry', missing: [error.message]};
  }
}
