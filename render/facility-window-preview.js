// @editor-module 设施窗口按当前继承状态提交，窗口外画面由现有预览合成。
import {db} from '../core/project-db.js';
import {executeFacilityWindowConstruction, facilityWindowFrameSchedule} from '../core/facility-window-semantics.js';
import {requireFrameVector} from '../core/frame-commit-semantics.js';
import {loadChrBankBytes} from '../core/media-assets.js';
import {genericMetaspriteObject} from './metasprite.js';
import {uiFrameCompositionInputs} from './frame-composition.js';
import {resolveRasterDisplayFrame} from './raster-display-frame.js';

export async function resolveFacilityWindowPreview(preview) {
  const context = preview?.facility_window_context;
  if (!context) return preview;
  const interfaces = await db.getDocument('project.ui.interfaces', null);
  const catalog = interfaces?.application_window_sources;
  const selectionLayout = await db.getResourceDocument('selection-layout', null);
  const selectionMovement = await db.getResourceDocument('code-module', null);
  const cursorObject = context.state?.cursor_object_id
    ? await genericMetaspriteObject(context.state.cursor_object_id) : null;
  const input = structuredClone(context.state);
  if (preview.facility_palette_binding && !context.continuation) {
    const binding = preview.facility_palette_binding;
    if (context.palette_scope !== binding.scope || preview.facility_palette_resolution?.status !== 'inherited')
      return {...preview, facility_window_resolution: {status: 'unavailable',
        missing: ['facility-palette-entry-phase']}};
    const colors = [...preview.background_palettes, ...preview.sprite_palettes].flat();
    requireFrameVector(colors, 32, 'current-facility-palette');
    input.palette_shadow = [...colors];
    input.ppu_palette = [...colors];
  }
  const result = executeFacilityWindowConstruction(catalog, context.program, input, {
    ...facilityWindowFrameSchedule(catalog, context.events),
    selectionLayout, selectionMovement, cursorObject, windowOnly: true, frameCommitCatalog: interfaces?.frame_commit_sources,
    continuation: context.continuation,
  });
  const resolved = {...preview, facility_window_resolution: result};
  if (result.status === 'unavailable') return resolved;
  try {
    const frame = result.state;
    const palette = requireFrameVector(frame.ppu_palette, 32, 'window-palette');
    const background = [0, 4, 8, 12].map(offset => [palette[0], ...palette.slice(offset + 1, offset + 4)]);
    const sprites = [16, 20, 24, 28].map(offset => palette.slice(offset, offset + 4));
    const raster = await resolveRasterDisplayFrame(interfaces?.frame_commit_sources, frame, loadChrBankBytes);
    if (raster.status !== 'available') throw new TypeError(raster.missing.join(', '));
    const layer = {kind: 'facility_window_frame', frame_state: frame,
      pattern_table: raster.frame.phases[0].pattern_table, raster_frame: raster.frame, regions: context.regions};
    uiFrameCompositionInputs(layer);
    return {...resolved, background_palettes: background, sprite_palettes: sprites,
      facility_palette_resolution: {...preview.facility_palette_resolution,
        background_palettes: background, sprite_palettes: sprites,
        ui_background: background[3], phase: 'window-construction-current-state'},
      layers: [...(preview.layers || []), layer]};
  } catch (error) {
    return {...resolved, facility_window_resolution: {...result, status: 'unavailable', missing: [error.message]}};
  }
}
