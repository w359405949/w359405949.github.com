// @editor-module 剧情显示从当前仓库和存档建立现场，完整画面按当前显示构造直接合成。
import {paintScenePreview} from '../modules/scene/preview.js';
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {prepareSaveEditorWorkspace} from '../core/save-editor-session.js';
import {saveCurrentValue} from '../core/save-codec.js';
import {createStoryDisplayPreview, storyUsesSceneDisplay} from '../core/story-display-preview.js';
import {uiJsRenderSources} from '../modules/visual/ui-construction-preview.js';
import {uiGlyphId, uiWriteGlyphCells} from '../ui/glyphs.js';
import {loadChrBankBytes} from '../core/media-assets.js';
import {resolveRasterDisplayResult} from './raster-display-frame.js';
import {uiPaintFrameComposition} from './frame-composition.js';
import {sameFrameVector} from '../core/frame-state-values.js';
import {loadSceneDrawProjectionParameters} from '../core/scene-draw-slot-projection.js';
import {loadSceneOamSources} from '../core/scene-oam-sources.js';
import {FIELD_SUBMENU_CODE_PARAMETERS, fieldSubmenuCodeValues} from '../core/field-submenu-code-sources.js';

const previews = new WeakMap();
const sourceIds = ['scene-actor-runtime', 'scene-actor', 'actor-visual', 'metatile-page', 'metatile-set',
  'metasprite-record', 'metasprite', 'direct-frame', 'battle-action', 'battle-object-layout',
  'shared-chr-bank', 'core-latin', 'char', 'text.character-map', 'text-record', 'text-render-runtime',
  'code-module', 'code-module:application-dialogue-flow-vm', 'chr-bank-mapping-service',
  'field-scene-lifecycle-service', 'party-field-actor-type-map', 'vehicle-visual-selector',
  'runtime-workspace', 'save-container'];
const sceneSource = scene => `scene:${scene.toString(16).toUpperCase().padStart(2, '0')}`;
const sourceVersions = () => sourceIds.map(id => db.fieldRevision(id));
const sourcesChanged = (before, after) => before.some((version, index) => version !== null && version !== after[index]);
const wholeScreen = [{x: 0, y: 0, width: 256, height: 240}];

function prepareStorySceneDisplay(sceneId) {
  const readField = source => db.getField(source.resource_id, source.entity_handle, source.field);
  return Promise.all([prepareSaveEditorWorkspace(),
    ...['runtime-workspace', 'save-container', 'scene-actor-runtime', 'actor-visual',
      'metasprite-record', 'metasprite', 'direct-frame', 'battle-action', 'battle-object-layout']
      .map(id => db.getResourceDocument(id)),
    ...[sceneSource(sceneId), 'metatile-page', 'metatile-set', 'party-field-actor-type-map',
      'vehicle-visual-selector', 'chr-bank-mapping-service'].map(id => db.getResourceDocument(id, null)),
    db.getDocument('project.ui.frame-commits', null), db.getDocument('project.text-catalog', null),
    db.getDocument('project.text-providers', null), loadSceneOamSources(db),
    loadSceneDrawProjectionParameters({readDocument: id => db.getResourceDocument(id, null), readField}),
    fieldSubmenuCodeValues(FIELD_SUBMENU_CODE_PARAMETERS.filter(row =>
      /^(glyph-cache-|dialogue-|confirm-|menu-text-origin-|field-ui-palette-)/.test(row.name)).map(row => row.name), readField)]);
}

export async function paintStorySceneDisplay(canvas, compiled, snapshot, isCurrent = () => true, sourceSnapshot = snapshot) {
  if (!storyUsesSceneDisplay(compiled) || !snapshot.cameraKnown || snapshot.sceneId < 0 || snapshot.sceneId > 0xEF) return false;
  const repository = state.projectRepository, saveBytes = state.saveCurrentBytes;
  const versions = sourceVersions(), sceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
  const saveSlot = state.savePageSlot || 1;
  let cached = previews.get(compiled);
  if (cached && !db.isPreviewProjectionCurrent('story-display-context', await cached.promise)) cached = null;
  if (!cached || cached.repository !== repository || cached.saveBytes !== saveBytes
      || cached.saveSlot !== saveSlot || sourcesChanged(cached.versions, versions)
      || cached.scenes.has(snapshot.sceneId) && cached.scenes.get(snapshot.sceneId) !== sceneVersion) {
    const promise = (async () => {
      const [, workspaceDocument, saveRuntimeDocument] = await prepareStorySceneDisplay(snapshot.sceneId);
      if (!state.saveCurrentBytes || !state.saveByteMapDocument) throw new Error(state.saveError || '剧情显示缺少存档现场');
      return db.reusePreviewProjection('story-display-context', [state.saveCurrentBytes, saveSlot], async () => {
        let glyphs = null;
        const glyphBitmaps = new Map();
        const services = await createStoryDisplayPreview({database: db, readProject: () => state.project,
          workspaceDocument, saveDocument: state.saveByteMapDocument, saveRuntimeDocument,
          saveValue: saveCurrentValue(state.saveCurrentBytes), saveSlot,
          readCorePatterns: () => Uint8Array.from(glyphs.corePatterns),
          writeGlyphCells: (cells, handle, x, y) => {
            const [, lead, selector] = handle.split(':');
            const index = uiGlyphId(glyphs.model, parseInt(lead, 16), parseInt(selector, 16));
            uiWriteGlyphCells(cells, glyphs.glyphs, index, x, y);
          },
          readGlyph: handle => {
            if (glyphBitmaps.has(handle)) return glyphBitmaps.get(handle);
            const [, lead, selector] = handle.split(':');
            const index = uiGlyphId(glyphs?.model || {}, parseInt(lead, 16), parseInt(selector, 16));
            if (index === null) throw new Error(`剧情文字缺少字形：${handle}`);
            const bitmap = glyphs.glyphs.slice(index * 18, (index + 1) * 18);
            glyphBitmaps.set(handle, bitmap); return bitmap;
          }});
        let tail = Promise.resolve();
        return {services, async render(snapshot) {
          const previous = tail;
          let release;
          tail = new Promise(resolve => {release = resolve;});
          await previous;
          try {
            if (snapshot.dialogue && !glyphs) glyphs = await uiJsRenderSources();
            return await services.render(snapshot);
          } finally {release();}
        }};
      }, {sources: sourceIds.map(id => ({kind: id === 'text.character-map' ? 'table' : 'field', id}))});
    })();
    const entries = new WeakMap();
    let sceneEntry = null;
    for (const frame of compiled.frames) {
      if (!sceneEntry || sceneEntry.sceneId !== frame.sceneId)
        sceneEntry = {sceneId: frame.sceneId, displayEntryCameraX: frame.cameraTileOriginX,
          displayEntryCameraY: frame.cameraTileOriginY};
      entries.set(frame, sceneEntry);
    }
    cached = {repository, saveBytes, saveSlot, versions, promise, entries, scenes: new Map(), frames: new Map(),
      composition: {}, tail: Promise.resolve()};
    previews.set(compiled, cached);
    promise.catch(() => {if (previews.get(compiled) === cached) previews.delete(compiled);});
  }
  const previous = cached.tail;
  let release;
  cached.tail = new Promise(resolve => {release = resolve;});
  await previous;
  try {
    if (!isCurrent()) return false;
    let painted = cached.frames.get(snapshot);
    if (!painted) {
      const preview = await cached.promise;
      cached.saveBytes = state.saveCurrentBytes;
      const versions = sourceVersions(), sceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
      const frame = await preview.render({...snapshot, ...cached.entries.get(sourceSnapshot)});
      const signature = JSON.stringify([frame.display.mirroring, frame.raster.frame.phases]);
      const previous = cached.last;
      const raster = previous?.signature === signature && sameFrameVector(previous.display.chr_ram, frame.display.chr_ram)
        ? previous.raster : await resolveRasterDisplayResult(frame.raster, frame.raster.state, loadChrBankBytes);
      if (raster.status !== 'available') throw new Error(raster.missing.join(', '));
      const unchanged = previous?.signature === signature
        && sameFrameVector(previous.display.nametables, frame.display.nametables)
        && sameFrameVector(previous.display.ppu_palette, frame.display.ppu_palette)
        && sameFrameVector(previous.display.oam, frame.display.oam)
        && sameFrameVector(previous.display.chr_ram, frame.display.chr_ram)
        && previous.textCells?.size === frame.textCells.size
        && [...frame.textCells].every(([position, pixels]) => sameFrameVector(previous.textCells.get(position), pixels));
      const regions = unchanged ? [] : wholeScreen;
      const image = regions.length ? {width: 256, height: 240,
        data: previous ? previous.image.data.slice() : new Uint8ClampedArray(256 * 240 * 4)} : previous.image;
      if (regions.length) uiPaintFrameComposition(image, {frame_state: frame.display, pattern_table: raster.frame.phases[0].pattern_table,
        raster_frame: raster.frame, regions, text_cells: frame.textCells}, undefined, cached.composition);
      const currentVersions = sourceVersions(), currentSceneVersion = db.fieldRevision(sceneSource(snapshot.sceneId));
      if (sourcesChanged(versions, currentVersions) || sceneVersion !== null && sceneVersion !== currentSceneVersion) return false;
      cached.versions = currentVersions;
      cached.scenes.set(snapshot.sceneId, currentSceneVersion);
      painted = {image, display: frame.display, raster, signature, textCells: frame.textCells};
      cached.frames.set(snapshot, painted);
      if (cached.frames.size > 32) cached.frames.delete(cached.frames.keys().next().value);
    }
    if (state.projectRepository !== repository || !isCurrent()
        || cached.saveBytes !== state.saveCurrentBytes || saveSlot !== (state.savePageSlot || 1)
        || sourcesChanged(cached.versions, sourceVersions())
        || cached.scenes.get(snapshot.sceneId) !== db.fieldRevision(sceneSource(snapshot.sceneId))) return false;
    cached.last = painted;
    await paintScenePreview(canvas, {raster: painted.image});
    return true;
  } finally {release();}
}
