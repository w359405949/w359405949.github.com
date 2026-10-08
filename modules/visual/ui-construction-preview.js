// @editor-module UI 构造视觉预览：界面脚本、画布与车辆立绘
//
// 来源：拆分前 engine/editor/app.js 第 27-742 行。

import {$} from "../../core/dom.js";
import {BATTLE_ACTOR_CHR_PATTERN_PROFILES} from "../../core/battle-actor-assets.js";
import {sharedSpritePatternProfile} from '../../core/shared-sprite-pattern-source.js';
import {chrPatternByteSource, composeCorePatternTable, decodeWebByteArray, loadChrBankBytes} from "../../core/media-assets.js";
import {indexedByteSource} from '../../core/indexed-byte-source.js';
import {db} from "../../core/project-db.js";
import {sceneMapCell} from "../../core/scene-runtime-map.js";
import {state} from "../../core/state.js";
import {projectFieldDraftOrigin} from '../../core/project-field-draft.js';
import {ensureSaveCurrentFieldObjects} from "../../core/save-build.js";
import {resolveFacilityParameterBindings} from "../../core/facility-runtime-parameters.js";
import {resolveFacilityInheritedPalette, resolveFacilityWindowAttributes} from "../../core/facility-runtime-palette.js";
import {facilityRuntimeCodeValues} from "../../core/facility-runtime-code-sources.js";
import {
  effectiveTextRecordSources,
  decodeFixedRuntimeText,
  fixedRuntimeTextScriptHex,
  textSlotProviderBindings,
} from "../../core/text-record-project.js";
import {nesPalette, uiBlankCanvas, uiHexBytes, uiPaintPattern, uiPaintResolvedMetasprite, uiPaintRomNametable, uiPaintRomTileGrid, uiPaintTileFill, uiPaintTileWrites, uiPutRgb} from "../../render/nes.js";
import {executeFacilityWindowConstruction, facilityWindowFrameSchedule} from '../../core/facility-window-semantics.js';
import {resolveFacilityWindowPreview} from '../../render/facility-window-preview.js';
import {uiPaintFrameComposition, uiFrameCompositionInputs, uiFrameCompositionRegions, uiFrameBackgroundTiles} from '../../render/frame-composition.js';
import {uiGlyphId, uiPaintCoreFontTile, uiPaintFontAtlas, uiPaintGlyph, uiWriteGlyphCells, uiPaintGlyphCell, uiPaintFontTile} from "../../ui/glyphs.js";
import {outlineBox} from "../../ui/nametable-editor.js";
import {resolveSatelliteMapPreview} from "./satellite-map.js";
import {fieldSubmenuCodeSource, fieldSubmenuCodeValues, fieldSubmenuCodeValue, DIALOGUE_CODE_PARAMETER_NAMES,
  dialogueRuntimeParameters} from '../../core/field-submenu-code-sources.js';
import {interfaceTextSlot, interfaceItemSlotProviders} from '../../render/interface-slots.js';
import {selectionCursorCoordinates} from '../../core/selection-layout-owner.js';
import {resolveFieldSubmenuPreview} from "../../render/field-submenu-preview.js";
import {interfacePreviewItemValue, registerInterfacePreviewItem} from '../../core/interface-preview-items.js';
import {resolveFieldOverviewPreview} from "../../render/field-overview-preview.js";
import {resolveInvestigationFeedbackPreview} from '../../render/investigation-feedback-preview.js';
import {resolveFieldUiPalette} from "../../render/field-ui-palette.js";
import {createFieldGlyphCache, writeFieldGlyph, copyFieldGlyphTiles} from '../../core/field-glyph-cache-vm.js';
import {fieldGlyphEntryCalls} from '../../core/field-glyph-cache-path.js';
import {dialogueNextLine, dialogueScrollPasses, dialogueWaitPosition} from '../../core/dialogue-layout.js';
import {resolveFieldPartySummaryPreview} from "../../render/field-party-summary-preview.js";
import {resolveInterfaceValuePreview} from "../../render/interface-value-preview.js";
import {battleMenuCalls} from '../../core/battle-menu-calls.js';
import {interfaceRecordProviders} from '../../render/interface-slots.js';
import {resolveShopMenuPreview} from "../../render/shop-menu-preview.js";
import {resolveServiceResponsePreview} from "../../render/service-response-preview.js";
import {resolveFacilityScreenPreview} from "../../render/facility-screen-preview.js";
import {resolveServiceConditionPreview} from "../../render/service-condition-preview.js";
import {servicePreviewFields, inheritServicePreviewState} from "../../core/service-preview-state.js";
import {interfacePreviewSceneImage} from '../../render/interface-preview-scene.js';
import {vehiclePortraitImage} from '../vehicle/components.js';
import {resolveBattleResultScreenPreview} from '../../render/battle-result-screen-preview.js';
import {genericMetaspriteObject} from "../../render/metasprite.js";
import {COMMON_FRAME_PREFIX, UI_TEMPLATE_PREFIX, uiEditorCommonFrameDraft, uiEditorPreviewDraft, uiEditorTemplateDraft, uiLayerTextRecordIds} from "../../views/ui-editor.js";

export const UI_PREVIEW_VIEWPORT = Object.freeze({x: 0, y: 0, width: 256, height: 240});

const uiJsRenderCache = {
  model: null,
  repository: null,
  patterns: null,
  corePatterns: null,
  glyphs: null,
  profilePatterns: null,
  menuRecords: null,
  recordRegions: new Map(),
  renderSources: null,
};

export const textCatalogCache = {
  repository: null,
  sourceCatalog: null,
  characterMap: null,
  textRecords: null,
  candidateItems: null,
  candidateMonsters: null,
  candidateShells: null,
  requestSourceCatalog: null,
  requestCharacterMap: null,
  requestTextRecords: null,
  requestCandidateItems: null,
  requestCandidateMonsters: null,
  requestCandidateShells: null,
  promise: null,
  document: null,
  recordMap: null,
  recordsByNode: null,
};
export const charsetMapCache = {
  repository: null,
  sourceDocument: null,
  textCatalog: null,
  itemSource: null,
  monsterSource: null,
  shellSource: null,
  promise: null,
  document: null,
};

function stalePreviewRequest(message) {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function ensureUiRenderCacheIdentity(model, repository) {
  if (uiJsRenderCache.model === model &&
      uiJsRenderCache.repository === repository) return;
  uiJsRenderCache.model = model;
  uiJsRenderCache.repository = repository;
  uiJsRenderCache.patterns = null;
  uiJsRenderCache.corePatterns = null;
  uiJsRenderCache.glyphs = null;
  uiJsRenderCache.profilePatterns = null;
  uiJsRenderCache.menuRecords = null;
  uiJsRenderCache.recordRegions = new Map();
  uiJsRenderCache.renderSources = null;
}


export function uiConstructionModel() {
  return state.project?.ui?.construction || {};
}

export function startupLoadPreview(preview) {
  return preview;
}

export function noahTerminalPreview(model = uiConstructionModel()) {
  return model.menu_dispatch_data?.previews?.find(
    preview => preview.id === "constructor:noah-password-terminal") || null;
}

function uiLayoutRecord(layoutId) {
  const model = uiConstructionModel();
  const layout = (model.static_assets?.layouts || [])
    .find(item => item.id === layoutId);
  if (layout) {
    const metadata = db.metadata('text-record');
    if (metadata && !metadata.dirty) return layout;
    const document = state.project?.text_record_edits;
    const origin = projectFieldDraftOrigin(document) || document;
    const ids = [layoutId, ...(layout.render?.dependencies || [])];
    const edited = ids.some(id => document?.records?.[id]?.bytes.some((value, index) =>
      value !== origin?.records?.[id]?.bytes[index]));
    const sources = uiJsRenderCache.renderSources?.value;
    if (!edited || !sources) return layout;
    const writes = new Map();
    const image = {width: 256, height: 240, data: new Uint8ClampedArray(256 * 240 * 4)};
    uiPaintInterfaceScript(image, {record: layoutId, glyph_cache_replay: true,
      on_tile_write: (position, tile) => writes.set(position, tile)}, model,
    sources.patterns, sources.corePatterns, sources.glyphs,
    effectiveTextRecordSources(null, document), sources.profilePatterns);
    return {...layout, render: {...layout.render, logical_tile_writes: [...writes]}};
  }
  // 导出的公共窗口组件走同一条渲染路径：它只是一组跨记录共有的图块写入，
  // 没有自己的 ROM 记录，所以在这里包成 layout 的形状。
  const component = (model.components_data?.components || [])
    .find(item => item.id === layoutId);
  if (!component) return null;
  return {
    id: component.id,
    render: {logical_tile_writes: component.logical_tile_writes || []},
  };
}

let dialogueRenderRuntime = null;
async function uiDialogueRenderRuntime() {
  const repository = state.projectRepository, revision = db.fieldRevision('text-render-runtime');
  if (dialogueRenderRuntime?.repository === repository && dialogueRenderRuntime.revision === revision)
    return dialogueRenderRuntime.value;
  const value = dialogueRuntimeParameters(await fieldSubmenuCodeValues(DIALOGUE_CODE_PARAMETER_NAMES));
  dialogueRenderRuntime = {repository, revision: db.fieldRevision('text-render-runtime'), value};
  return value;
}

export async function uiJsRenderSources(sourceModel = null, {fullAtlas = false} = {}) {
  const model = sourceModel || uiConstructionModel();
  const repository = state.projectRepository;
  ensureUiRenderCacheIdentity(model, repository);
  const [chrDocument, coreDocument, characters, dialogueRuntime] = await Promise.all([
    db.getDocument("shared-chr-bank", null), db.getResourceDocument('core-latin'),
    db.getResourceDocument('char'), uiDialogueRenderRuntime(),
  ]);
  const cached = uiJsRenderCache.renderSources;
  if (cached?.model === model && cached.repository === repository
      && cached.chrDocument === chrDocument && cached.coreDocument === coreDocument
      && cached.characters === characters && cached.chrRevision === db.fieldRevision('shared-chr-bank')
      && cached.glyphRevision === db.fieldRevision('char')) {
    return {...cached.value, dialogueRuntime,
      ...(fullAtlas ? {glyphFields: (await db.getFields('char')).filter(field => field.fieldName === 'narrative_glyph_bitmap')} : {})};
  }
  if (!chrDocument || typeof chrDocument !== "object") {
    throw new TypeError("shared-chr-bank 图像基础表不可用");
  }
  const chr = model.static_assets?.chr || {};
  const tableReference = chr.pattern_table_web;
  if (tableReference?.resource_id !== "shared-chr-bank"
      || !Array.isArray(tableReference.banks)) {
    throw new TypeError("UI pattern table 的 shared-chr-bank 引用无效");
  }
  const profiles = chr.profile_pattern_tables || [];
  const [patterns, corePatterns, glyphs, profileEntries] = await Promise.all([
    chrPatternByteSource(chrDocument, tableReference.banks),
    composeCorePatternTable({lazy: true}),
    currentNarrativeGlyphBytes(model, characters),
    Promise.all([
      ...profiles.map(async profile => {
        const reference = profile.web_source;
        if (reference?.resource_id !== "shared-chr-bank"
            || Number(reference.bank) !== Number(profile.bank)) {
          throw new TypeError(`${profile.id}: shared-chr-bank 引用无效`);
        }
        return [profile.id, {
          ...profile,
          patterns: chrPatternByteSource(chrDocument, [reference.bank]),
        }];
      }),
      ...BATTLE_ACTOR_CHR_PATTERN_PROFILES.map(async profile => [
        profile.id,
        {...profile, patterns: chrPatternByteSource(chrDocument, [profile.bank])},
      ]),
    ]),
  ]);
  if (patterns.length !== 0x800) {
    throw new TypeError(`UI pattern table 长度 ${patterns.length} 无效`);
  }
  if (corePatterns.length !== 0x800) {
    throw new TypeError(`UI core patterns 长度 ${corePatterns.length} 无效`);
  }
  if (glyphs.length !== Number(model.font?.glyph_data_length)) {
    throw new TypeError(`UI glyphs 长度 ${glyphs.length} 无效`);
  }
  const value = {
    model,
    patterns,
    corePatterns,
    glyphs, dialogueRuntime,
    profilePatterns: new Map(profileEntries),
  };
  const loadedChrDocument = db.peekDocument("shared-chr-bank", null);
  if ((!sourceModel && uiConstructionModel() !== model) || state.projectRepository !== repository ||
      loadedChrDocument !== chrDocument) {
    throw stalePreviewRequest("UI 预览资产在读取期间已更新");
  }
  uiJsRenderCache.renderSources = {
    model, repository, chrDocument, coreDocument, characters, value,
    chrRevision: db.fieldRevision('shared-chr-bank'), glyphRevision: db.fieldRevision('char'),
  };
  return fullAtlas ? {...value, glyphFields: (await db.getFields('char')).filter(field => field.fieldName === 'narrative_glyph_bitmap')} : value;
}

function currentNarrativeGlyphBytes(model, document) {
  const origin = projectFieldDraftOrigin(document) || document;
  const records = origin.records.filter(record => record.kind === 'narrative-12x12');
  const positions = new Map(), seen = new Set();
  for (const record of records) {
    const glyphId = uiGlyphId(model, record.lead, record.selector);
    if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId >= records.length || seen.has(glyphId)) {
      throw new TypeError(`${record.handle}: 缺唯一的已发布字形图集绑定`);
    }
    seen.add(glyphId);
    positions.set(glyphId, origin.records.indexOf(record));
  }
  return indexedByteSource(records.length * 18, offset =>
    document.records[positions.get(Math.floor(offset / 18))].narrative_glyph_bitmap[offset % 18]);
}

export async function uiMenuRecordSources(model) {
  if (state.project?.text_record_edits) return effectiveTextRecordSources(null, state.project.text_record_edits);
  ensureUiRenderCacheIdentity(model, state.projectRepository);
  if (uiJsRenderCache.menuRecords) return uiJsRenderCache.menuRecords;
  const dispatch = model.menu_dispatch_data || {};
  const recordIds = new Set();
  for (const route of dispatch.runtime_routes || []) {
    for (const record of route.records || []) recordIds.add(record);
  }
  for (const preview of dispatch.previews || []) {
    for (const layer of preview.layers || []) {
      if (layer.record) recordIds.add(layer.record);
      if (layer.runtime_record_pair) recordIds.add(layer.runtime_record_pair);
      for (const record of Object.values(layer.provider_records || {})) {
        recordIds.add(record);
      }
      for (const pair of Object.values(layer.provider_record_pairs || {})) {
        const record = uiRecordPairId(pair);
        if (record) recordIds.add(record);
      }
    }
  }
  for (const variant of dispatch.vehicle_portraits?.variants || []) {
    if (variant.record) recordIds.add(variant.record);
  }
  for (const region of ["09", "11", "13", "14"]) {
    recordIds.add(`record:${region}:000`);
  }
  const regionIds = new Set(
    [...recordIds].map(record => String(record).split(":")[1]).filter(Boolean)
  );
  uiJsRenderCache.menuRecords = uiRecordSourcesByRegions(model, regionIds);
  return uiJsRenderCache.menuRecords;
}

async function uiRecordSourcesByRegions(model, regionIds) {
  if (state.project?.text_record_edits) return effectiveTextRecordSources(null, state.project.text_record_edits);
  ensureUiRenderCacheIdentity(model, state.projectRepository);
  const normalized = [...new Set([...regionIds].map(value =>
    String(value).replace(/^0x/i, "").toUpperCase().padStart(2, "0")
  ))];
  const sources = new Map((model.script_catalog?.regions || []).map(region => [
    String(region.id_hex).replace(/^0x/i, "").toUpperCase().padStart(2, "0"),
    region,
  ]));
  const groups = await Promise.all(normalized.map(async regionId => {
    if (!uiJsRenderCache.recordRegions.has(regionId)) {
      const source = sources.get(regionId);
      const promise = source ? db.getPackageDocument(
        `game/ui/construction/${source.path}`,
        null,
      ).then(document => {
        if (!document) throw new Error(`文字区 ${regionId} 正文不存在`);
        const records = new Map();
        for (const record of document.records || []) {
          records.set(record.node_id, uiHexBytes(record.raw_hex));
        }
        return records;
      }) : Promise.resolve(new Map());
      uiJsRenderCache.recordRegions.set(regionId, promise);
    }
    return uiJsRenderCache.recordRegions.get(regionId);
  }));
  const records = new Map();
  for (const group of groups) {
    for (const [recordId, raw] of group) records.set(recordId, raw);
  }
  return records;
}

function uiPaintLayoutWrites(
  image, layout, patterns, corePatterns, shift = 0, patternProfiles = [],
  paletteSets = null, defaultAttribute = 0, logicalAttributes = null, logicalTiles = null
) {
  const writes = layout?.render?.logical_tile_writes || [];
  const attributes = new Map(writes
    .map(([position, tile]) => [
      (Number(position) + Number(shift || 0)) & 0x3FF, Number(tile),
    ])
    .filter(([position]) => position >= 0x3C0));
  for (const [position, tile] of writes) {
    const logicalPosition = (Number(position) + Number(shift || 0)) & 0x3FF;
    const tileX = logicalPosition % 32;
    const tileY = Math.floor(logicalPosition / 32);
    if (tileY >= 30) continue;
    let palette = null;
    if (paletteSets?.length) {
      const attributePosition = 0x3C0
        + Math.floor(tileY / 4) * 8 + Math.floor(tileX / 4);
      const attribute = logicalAttributes?.[attributePosition - 0x3C0] ?? attributes.get(attributePosition)
        ?? (Number(defaultAttribute) & 0xFF);
      const attributeShift = ((tileY & 0x02) << 1) | (tileX & 0x02);
      palette = paletteSets[(attribute >> attributeShift) & 0x03];
    }
    uiPaintPattern(
      image.data, image.width, image.height, patterns, corePatterns, Number(logicalTiles?.[logicalPosition] ?? tile),
      tileX * 8, tileY * 8, patternProfiles, palette
    );
    uiTraceArea(image, {x: tileX * 8, y: tileY * 8, width: 8, height: 8}, [{recordId: layout.id}]);
  }
}


function uiRecordPairId(pair) {
  if (typeof pair === "string") return pair;
  const record = Array.isArray(pair) ? pair[0] : pair?.record;
  const region = Array.isArray(pair) ? pair[1] : pair?.region;
  if ([record, region].some(value => typeof value !== "number"
      && (typeof value !== "string" || value.trim() === ""))) return null;
  const recordId = Number(record);
  const regionId = Number(region);
  if (!Number.isInteger(recordId) || !Number.isInteger(regionId)) return null;
  return `record:${regionId.toString(16).toUpperCase().padStart(2, "0")}:${recordId.toString().padStart(3, "0")}`;
}

function uiDataPathValue(path) {
  return String(path || "").split(".").reduce(
    (value, part) => value?.[Number.isInteger(Number(part)) ? Number(part) : part],
    state.project?.game_data
  );
}

function uiNestedValue(value, path) {
  return String(path || "").split(".").reduce(
    (current, part) => current?.[part],
    value
  );
}

function uiProviderValue(layer, providerId) {
  const isNumber = value => (typeof value === "number"
    || (typeof value === "string" && value.trim() !== ""))
    && Number.isFinite(Number(value));
  const constant = layer.provider_constants?.[String(providerId)];
  if (isNumber(constant)) {
    return Math.max(0, Number(constant));
  }
  const path = layer.provider_values?.[String(providerId)];
  const value = path ? uiDataPathValue(path) : undefined;
  return isNumber(value) ? Math.max(0, Number(value)) : null;
}

/** Whether one rendered source token belongs to the selected semantic component. */
function uiSelectionMatchesSource(
  selection, recordId, offset, length = 1
) {
  if (!selection || String(selection.record_id || "") !== String(recordId || "")) {
    return false;
  }
  if (!Array.isArray(selection.ranges)) return true;
  const start = Number(offset);
  const end = start + Math.max(1, Number(length) || 1);
  return selection.ranges.some(range => {
    const rangeStart = Number(range.offset);
    const rangeEnd = rangeStart + Number(range.length);
    return start < rangeEnd && end > rangeStart;
  });
}

function uiMergeSelectionBounds(current, box) {
  if (!box) return current;
  const left = Math.min(Number(box.x), Number(box.x) + Number(box.width));
  const top = Math.min(Number(box.y), Number(box.y) + Number(box.height));
  const right = Math.max(Number(box.x), Number(box.x) + Number(box.width));
  const bottom = Math.max(Number(box.y), Number(box.y) + Number(box.height));
  if (![left, top, right, bottom].every(Number.isFinite) ||
      right <= left || bottom <= top) return current;
  if (!current) return {x: left, y: top, width: right - left, height: bottom - top};
  const mergedLeft = Math.min(current.x, left);
  const mergedTop = Math.min(current.y, top);
  const mergedRight = Math.max(current.x + current.width, right);
  const mergedBottom = Math.max(current.y + current.height, bottom);
  return {
    x: mergedLeft,
    y: mergedTop,
    width: mergedRight - mergedLeft,
    height: mergedBottom - mergedTop,
  };
}

// 绘制来源随覆盖、搬移与滚屏保留，组件区域只取最终画面。
function uiComponentTrace(image, inherited = null) {
  return image.componentTrace ||= {catalog: inherited?.catalog || [], keys: inherited?.keys || new Map(),
    pixels: inherited ? new Uint32Array(inherited.pixels) : new Uint32Array(image.width * image.height)};
}

function uiTraceArea(image, box, sources) {
  const trace = uiComponentTrace(image);
  const painted = image.interfacePixels ||= new Uint8Array(image.width * image.height);
  const chain = sources.filter(Boolean).filter((source, index, all) => all.findIndex(other =>
    other.recordId === source.recordId && other.offset === source.offset && other.length === source.length) === index);
  const key = JSON.stringify(chain);
  let id = trace.keys.get(key);
  if (id === undefined) { id = trace.catalog.push(chain); trace.keys.set(key, id); }
  const left = Math.max(0, Math.floor(box.x)), top = Math.max(0, Math.floor(box.y));
  const right = Math.min(image.width, Math.ceil(box.x + box.width));
  const bottom = Math.min(image.height, Math.ceil(box.y + box.height));
  for (let y = top; y < bottom; y++) {
    trace.pixels.fill(id, y * image.width + left, y * image.width + right);
    painted.fill(1, y * image.width + left, y * image.width + right);
  }
}

function uiTraceCopy(image, source, region) {
  const painted = image.interfacePixels ||= new Uint8Array(image.width * image.height);
  for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
    const sx = region.source_x + x, sy = region.source_y + y, dx = region.x + x, dy = region.y + y;
    if (Math.min(sx, sy, dx, dy) < 0 || sx >= source.width || sy >= source.height || dx >= image.width || dy >= image.height) continue;
    if (source.interfacePixels?.[sy * source.width + sx] || source.componentTrace?.pixels[sy * source.width + sx])
      painted[dy * image.width + dx] = 1;
  }
  if (!source.componentTrace) return;
  const target = uiComponentTrace(image);
  const origin = source.componentTrace;
  const ids = new Map();
  for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
    const sx = region.source_x + x, sy = region.source_y + y, dx = region.x + x, dy = region.y + y;
    if (Math.min(sx, sy, dx, dy) < 0 || sx >= source.width || sy >= source.height || dx >= image.width || dy >= image.height) continue;
    const old = origin.pixels[sy * source.width + sx];
    if (region.preserve_unpainted && !old) continue;
    let id = 0;
    if (old) {
      if (!ids.has(old)) {
        const chain = origin.catalog[old - 1], key = JSON.stringify(chain);
        let mapped = target.keys.get(key);
        if (mapped === undefined) { mapped = target.catalog.push(chain); target.keys.set(key, mapped); }
        ids.set(old, mapped);
      }
      id = ids.get(old);
    }
    target.pixels[dy * image.width + dx] = id;
  }
}

function uiDrawnComponents(image, viewport = null) {
  const trace = image.componentTrace;
  if (!trace) return [];
  const area = viewport || {x: 0, y: 0, width: image.width, height: image.height};
  const owners = new Map();
  for (let y = Math.max(0, area.y); y < Math.min(image.height, area.y + area.height); y++) {
    for (let x = Math.max(0, area.x); x < Math.min(image.width, area.x + area.width); x++) {
      const position = y * image.width + x, id = trace.pixels[position];
      if (!id) continue;
      let owner = owners.get(id);
      if (!owner) { owner = {left: x, top: y, right: x + 1, bottom: y + 1, visible: false}; owners.set(id, owner); }
      owner.left = Math.min(owner.left, x); owner.top = Math.min(owner.top, y);
      owner.right = Math.max(owner.right, x + 1); owner.bottom = Math.max(owner.bottom, y + 1);
      const pixel = position * 4;
      if (image.data[pixel + 3] && (image.data[pixel] || image.data[pixel + 1] || image.data[pixel + 2])) owner.visible = true;
    }
  }
  return [...owners].filter(([, owner]) => owner.visible).flatMap(([id, owner]) =>
    trace.catalog[id - 1].map(source => ({...source, bounds: {x: owner.left - area.x, y: owner.top - area.y,
      width: owner.right - owner.left, height: owner.bottom - owner.top}})));
}

function uiTracePixels(image, sources, paint) {
  const trace = uiComponentTrace(image);
  const painted = image.interfacePixels ||= new Uint8Array(image.width * image.height);
  const key = JSON.stringify(sources);
  let id = sources.length ? trace.keys.get(key) : 0;
  if (id === undefined) { id = trace.catalog.push(sources); trace.keys.set(key, id); }
  const pixels = new Proxy(image.data, {
    get: (target, property) => {
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set: (target, property, value) => {
      target[property] = value;
      const index = Number(property);
      if (Number.isInteger(index) && index % 4 === 3) {
        trace.pixels[(index - 3) / 4] = id;
        painted[(index - 3) / 4] = 1;
      }
      return true;
    },
  });
  paint({width: image.width, height: image.height, data: pixels});
}

function uiTraceMetasprite(image, layer, profiles, preview) {
  const source = {recordId: layer.component_source || (Number(layer.object_id) === 0x30 ? 'selection-cursor'
    : layer.record || `metasprite:${Number(layer.object_id).toString(16).toUpperCase()}`)};
  uiTracePixels(image, [source], target => uiPaintResolvedMetasprite(target, layer, profiles, preview));
}

function uiTransferSlots(image, source, region) {
  for (const slot of source.interfaceSlots || []) {
    const x = Math.max(slot.bounds.x, region.source_x), y = Math.max(slot.bounds.y, region.source_y);
    const right = Math.min(slot.bounds.x + slot.bounds.width, region.source_x + region.width);
    const bottom = Math.min(slot.bounds.y + slot.bounds.height, region.source_y + region.height);
    if (right > x && bottom > y) (image.interfaceSlots ||= []).push({...slot,
      bounds: {x: x + region.x - region.source_x, y: y + region.y - region.source_y,
        width: right - x, height: bottom - y}});
  }
}

function uiTraceWindow(image, layer) {
  const previous = new Uint8ClampedArray(image.data);
  const trace = uiComponentTrace(image);
  const painted = image.interfacePixels ||= new Uint8Array(image.width * image.height);
  const owners = new Uint32Array(trace.pixels);
  const inputs = uiFrameCompositionInputs(layer);
  uiPaintFrameComposition(image, layer, inputs);
  const source = layer.component_surface || (layer.component_tiles
    ? {width: image.width, height: image.height, componentTrace: {...trace, pixels: owners}} : null);
  const slotBounds = new Map();
  const slotCells = new Map();
  for (const slot of source?.interfaceSlots || []) {
    const box = slot.bounds;
    for (let row = Math.max(0, Math.floor(box.y / 8)); row < Math.min(30, Math.ceil((box.y + box.height) / 8)); row++)
      for (let column = Math.max(0, Math.floor(box.x / 8)); column < Math.min(32, Math.ceil((box.x + box.width) / 8)); column++) {
        const cell = row * 32 + column;
        if (!slotCells.has(cell)) slotCells.set(cell, []);
        slotCells.get(cell).push(slot);
      }
  }
  for (const region of inputs.regions)
    for (let y = Math.max(0, region.y); y < Math.min(image.height, region.y + region.height); y++)
      for (let x = Math.max(0, region.x); x < Math.min(image.width, region.x + region.width); x++) {
        const index = y * image.width + x, old = owners[index];
        painted[index] = 1;
        if (!old || !trace.catalog[old - 1].some(item => item.recordId === 'selection-cursor')
            || previous.subarray(index * 4, index * 4 + 4).some((value, byte) => value !== image.data[index * 4 + byte]))
          trace.pixels[index] = 0;
      }
  for (const region of uiFrameCompositionRegions(inputs)) for (const tile of uiFrameBackgroundTiles(inputs, region)) {
    const box = tile.bounds;
    for (let y = box.y; y < box.y + box.height; y++) for (let x = box.x; x < box.x + box.width; x++) {
      const index = y * image.width + x, old = owners[index];
      painted[index] = 1;
      if (old && trace.catalog[old - 1].some(item => item.recordId === 'selection-cursor')
          && previous.subarray(index * 4, index * 4 + 4).every((value, byte) => value === image.data[index * 4 + byte])) continue;
      trace.pixels[index] = 0;
      if (!source) continue;
      const cell = layer.component_tiles[tile.at] - 1;
      if (cell < 0 || cell >= 960) continue;
      const sx = cell % 32 * 8 + (x - tile.x), sy = Math.floor(cell / 32) * 8 + (y - tile.y);
      for (const slot of slotCells.get(cell) || []) {
        const box = slot.bounds;
        if (sx < box.x || sx >= box.x + box.width || sy < box.y || sy >= box.y + box.height) continue;
        const bounds = slotBounds.get(slot);
        if (!bounds) slotBounds.set(slot, {x, y, width: 1, height: 1});
        else {
          const left = Math.min(bounds.x, x), top = Math.min(bounds.y, y);
          bounds.width = Math.max(bounds.x + bounds.width, x + 1) - left;
          bounds.height = Math.max(bounds.y + bounds.height, y + 1) - top;
          bounds.x = left; bounds.y = top;
        }
      }
      uiTraceCopy(image, source, {x, y, width: 1, height: 1,
        source_x: cell % 32 * 8 + (x - tile.x), source_y: Math.floor(cell / 32) * 8 + (y - tile.y)});
    }
  }
  for (const [slot, bounds] of slotBounds) (image.interfaceSlots ||= []).push({...slot, bounds});
}

export function uiComponentSelectionBounds(components, selection) {
  return (components || []).filter(source => uiSelectionMatchesSource(selection,
    source.recordId, source.offset, source.length)).reduce((bounds, source) =>
      uiMergeSelectionBounds(bounds, source.bounds), null);
}

/** 已发布的颜色像素行只有这一条绘制入口；不解 ROM / PPU。 */
export function uiSceneWindowSurface(raster, rectangle) {
  if (raster?.format !== "indexed-color-rows"
      || raster.width !== rectangle?.width || raster.height !== rectangle?.height
      || raster.rows.length !== raster.height) {
    throw new TypeError("窗口像素尺寸与布局不一致");
  }
  const surface = document.createElement("canvas");
  surface.width = raster.width;
  surface.height = raster.height;
  const context = surface.getContext("2d");
  raster.rows.forEach((row, y) => {
    if (row.length !== raster.width) throw new TypeError("窗口像素行长度不一致");
    [...row].forEach((index, x) => {
      const colour = raster.colors[Number.parseInt(index, 16)];
      if (!colour) throw new TypeError("窗口像素颜色缺失");
      context.fillStyle = colour;
      context.fillRect(x, y, 1, 1);
    });
  });
  return surface;
}

/** 战斗状态窗的字形取自共用 UI 字库；数值由调用方提供。 */
export async function prepareUiBattleStatusSlot({label, value, secondary = null, rows = null,
  row_stride = 8}, project = state.project) {
  rows ||= [{label, value}, ...(secondary ? [secondary] : [])];
  if (rows.some(row => !["HP", "SI", "SP"].includes(row.label) || !Number.isSafeInteger(row.value)
      || row.value < 0 || row.value > 9999)) throw new TypeError("战斗状态窗需要 HP／SI／SP 与四位以内的数值");
  const ui = await db.getDocument("project.ui", null);
  if (!ui?.construction) throw new TypeError("UI 绘制资产未发布");
  const sources = await uiJsRenderSources(ui.construction);
  const encoding = project?.text_record_encoding?.glyphs;
  const labelTiles = rows.map(row => [...row.label].map(character => encoding?.get(character)?.bytes));
  if (labelTiles.flat().some(bytes => bytes?.length !== 1)) {
    throw new TypeError("战斗状态窗缺少已发布的标签字形");
  }
  const rectangle = {x: 174, y: 160, width: 60, height: (rows.length - 1) * row_stride + 8};
  const surface = document.createElement("canvas");
  surface.width = rectangle.width;
  surface.height = rectangle.height;
  const context = surface.getContext("2d");
  const image = context.createImageData(surface.width, surface.height);
  const paint = (tile, x, y) => uiPaintFontTile(image, tile,
    sources.patterns, sources.corePatterns, x, y);
  rows.forEach((row, rowIndex) => {
    labelTiles[rowIndex].forEach((bytes, index) => paint(bytes[0], 2 + index * 8, rowIndex * row_stride));
    const digits = String(row.value);
    [...digits].forEach((digit, index) => paint(Number(digit), 58 - digits.length * 8 + index * 8, rowIndex * row_stride));
  });
  context.putImageData(image, 0, 0);
  return {surface, rectangle};
}

/** 战斗命令布局引用当前文本记录与共享战斗字形页。 */
export async function prepareUiBattleCommandWindow(name, project = state.project, calls = null, nameScriptHex = null, vehicle = false) {
  calls ||= await battleMenuCalls(source => db.getField(source.resource_id, source.entity_handle, source.field));
  const ui = await db.getDocument("project.ui", null);
  const sources = await uiJsRenderSources(ui.construction);
  const layoutRecord = vehicle ? calls.layouts.vehicle : calls.layouts.human;
  const layout = uiLayoutRecord(layoutRecord);
  const positions = layout?.render?.logical_tile_writes?.map(([position]) => position).filter(position => position < 960);
  if (!positions?.length) throw new TypeError('战斗命令缺少窗口范围');
  const templates = await db.getDocument('project.ui.templates', null);
  const window = templates?.scene_windows?.find(row => row.scene === 'battle-command');
  const nameCursor = calls.name_origin - calls.body_origin;
  const nameColumn = nameCursor % 32, nameRow = Math.floor(nameCursor / 32) + window?.bounds?.first_row;
  const header = window?.interiors?.find(row => nameColumn >= row.first_column && nameColumn <= row.last_column
    && nameRow >= row.first_row && nameRow <= row.last_row);
  if (!header) throw new TypeError('战斗命令缺少姓名窗口构造');
  const xs = positions.map(position => position % 32 * 8), ys = positions.map(position => Math.floor(position / 32) * 8);
  const local = {x: Math.min(...xs), y: Math.min(...ys),
    width: (header.last_column + 1) * 8 - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) + 8};
  const profiles = new Map(sources.profilePatterns);
  for (const [index, id] of calls.pattern_profiles.entries()) profiles.set(id, {
    first_tile: index ? 0xC0 : 0x80, last_tile: index ? 0xFF : 0xBF,
    patterns: await loadChrBankBytes(Number.parseInt(id.split(':')[1], 16))});
  const providers = interfaceRecordProviders({record: calls.name_record}, [0xE8, 0xFC, 0xFD]);
  if (providers.length !== 1) throw new TypeError('战斗命令缺少姓名提供器');
  const bytes = (nameScriptHex ? [] : [...String(name)]).flatMap(character => {
    const bytes = project.text_record_encoding.glyphs.get(character)?.bytes;
    if (!bytes) throw new TypeError(`命令窗缺少已发布字形：${character}`);
    return bytes;
  });
  const source = document.createElement("canvas");
  uiPaintMenuPreviewCanvas(source, {
    pattern_profiles: calls.pattern_profiles,
    layers: [{kind: 'layout', record: layoutRecord},
      {kind: 'script', record: calls.name_record, cursor: calls.name_origin - calls.body_origin,
        glyph_pixel_y_offset: -4, provider_script_hex: {[providers[0]]: nameScriptHex ||
          [...bytes, 0x9F].map(byte => byte.toString(16).padStart(2, '0')).join(' ')}}],
  }, sources.patterns, sources.corePatterns, sources.glyphs, sources.model,
  effectiveTextRecordSources(null, project.text_record_edits), profiles);
  const rectangle = {...local, x: local.x + calls.body_origin % 32 * 8,
    y: local.y + Math.floor(calls.body_origin / 32) * 8};
  const surface = document.createElement("canvas");
  surface.width = rectangle.width;
  surface.height = rectangle.height;
  const context = surface.getContext("2d");
  context.drawImage(source, -local.x, -local.y);
  return {surface, rectangle};
}

/**
 * 稳定引用 + 当前正文 + 像素槽位 + 字库声明 + 发布参数目录与本次调用的取值出口。
 * 返回局部像素和不透明的确认操作，页面不接触记录游标或命令。
 */
export async function prepareUiTextSlot(options) {
  // 未解析的调用仍有正文状态；不借用其他记录的几何，也不伪造空白像素层。
  if (options.unavailableReason) return {
    status: "blocked", reason: options.unavailableReason,
    recordId: options.textRecordRef?.node_id || "",
    surface: null, rectangle: null, confirm: null,
  };
  const repository = state.projectRepository;
  // 数据页不会预先挂载 UI 工作台；绘制器自己从同一个资产入口按需取数。
  const ui = await db.getDocument("project.ui", null);
  if (!ui?.construction) throw new TypeError("UI 绘制资产未发布");
  const sources = await uiJsRenderSources(ui.construction);
  if (repository !== state.projectRepository) throw stalePreviewRequest("文字槽位所属项目已切换");
  return uiRenderTextSlot(options, sources);
}

function uiRenderTextSlot(options, sources) {
  const {textRecordRef, recordDocument, geometry, fonts} = options;
  const providers = textSlotProviderBindings(options);
  if (textRecordRef?.resource_id !== "text-record"
      || !recordDocument?.records?.[textRecordRef.node_id]) {
    throw new TypeError("文字槽位缺少有效的 text-record 引用／当前正文");
  }
  const rectangle = geometry?.rectangle;
  const first = geometry?.first_line;
  if (geometry?.coordinate_space !== "screen-pixels"
      || ![rectangle?.x, rectangle?.y, rectangle?.width, rectangle?.height,
        first?.x, first?.y, first?.baseline_y, geometry.line_height,
        geometry.available_width].every(Number.isInteger)
      || rectangle.width <= 0 || rectangle.height <= 0
      || geometry.line_height <= 0 || geometry.available_width <= 0) {
    throw new TypeError("文字槽位缺少有效的屏幕像素几何");
  }
  const fontIds = new Set();
  for (const font of fonts || []) {
    if (font.catalog !== "game/text/fonts/index.json"
        || !["core-latin", "narrative-12x12"].includes(font.id)) {
      throw new TypeError(`文字槽位的字库尚无共用绘制器：${font.id}`);
    }
    fontIds.add(font.id);
  }
  const localGeometry = {...geometry,
    rectangle: {...rectangle, x: 0, y: 0},
    first_line: {...first, x: first.x - rectangle.x, y: first.y - rectangle.y,
      baseline_y: first.baseline_y - rectangle.y},
    line_break_entries: (geometry.line_break_entries || []).map(entry => ({...entry,
      from_baseline_y: entry.from_baseline_y - rectangle.y,
      destination: {...entry.destination, x: entry.destination.x - rectangle.x,
        y: entry.destination.y - rectangle.y,
        baseline_y: entry.destination.baseline_y - rectangle.y},
    })),
  };
  const records = options.recordSources || effectiveTextRecordSources(null, recordDocument);
  const render = confirmedWaits => {
    const surface = document.createElement("canvas");
    surface.width = rectangle.width;
    surface.height = rectangle.height;
    const context = surface.getContext("2d");
    const image = context.createImageData(surface.width, surface.height);
    const progress = {status: "complete", reason: "", placeholders: []};
    uiPaintInterfaceScript(image, {
      ...providers,
      record: textRecordRef.node_id,
      wait_marker: options.waitMarker,
      text_slot: {geometry: localGeometry, fontIds, confirmedWaits, progress, recordDocument},
    }, sources.model, sources.patterns, sources.corePatterns, sources.glyphs, records);
    context.putImageData(image, 0, 0);
    surface.componentTrace = image.componentTrace;
    if (progress.status === "complete" && progress.placeholders.length) {
      progress.reason = "运行时取值为预览占位";
    }
    return {surface, rectangle, recordId: textRecordRef.node_id, ...progress,
      confirm: progress.status === "waiting" ? () => render(confirmedWaits + 1) : null};
  };
  return render(0);
}

const textSlotControls = new WeakMap();
const textSlotControlOutputs = new WeakMap();

/** 编辑器确认操作继续当前文字槽位。 */
export function uiBindTextSlotConfirmation(canvas, output, onConfirm) {
  canvas.uiTextSlotProgress = output ? {status: output.status, reason: output.reason || ''} : null;
  let control = textSlotControls.get(canvas);
  if (!output?.reason) {
    control?.remove();
    textSlotControls.delete(canvas);
    return;
  }
  if (control?.isConnected && textSlotControlOutputs.get(control) === output) return;
  if (!control) {
    control = document.createElement("span");
    control.className = "ui-text-slot-status";
    control.setAttribute("role", "status");
    canvas.insertAdjacentElement("afterend", control);
    textSlotControls.set(canvas, control);
  }
  textSlotControlOutputs.set(control, output);
  control.textContent = output.reason;
  if (output.confirm) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = 'button';
    button.dataset.uiTextSlotConfirm = "";
    button.textContent = "确认继续";
    button.setAttribute("aria-label", "确认并继续显示文字");
    button.onclick = () => onConfirm(output.confirm());
    control.append(button);
  }
}

export function uiPaintInterfaceScript(
  image, layer, model, patterns, corePatterns, glyphData,
  externalRecords = null, patternProfiles = [], selection = null, onInlineConfirm = null,
  glyphCaches = new Map()
) {
  const logicalSurface = layer.logical_surface;
  const records = effectiveTextRecordSources(externalRecords);
  for (const [recordId, raw] of
    (layer.records || []).map(record => [record.id, uiHexBytes(record.raw_hex)])
  ) if (!records.has(recordId)) records.set(recordId, raw);
  const recordProviders = new Map();
  const scriptProviders = new Map();
  for (const [providerId, path] of Object.entries(
    layer.provider_scripts || {}
  )) {
    const source = uiDataPathValue(path);
    if (!source) continue;
    const rawHex = typeof source === "string"
      ? source : fixedRuntimeTextScriptHex(source);
    if (!rawHex.trim()) continue;
    const key = `provider-script:${providerId}`;
    records.set(key, uiHexBytes(rawHex));
    scriptProviders.set(Number(providerId), key);
  }
  for (const [providerId, rawHex] of Object.entries(
    layer.provider_script_hex || {}
  )) {
    if (typeof rawHex !== "string" || !rawHex.trim()) continue;
    const key = `provider-script:${providerId}`;
    records.set(key, uiHexBytes(rawHex));
    scriptProviders.set(Number(providerId), key);
  }
  for (const [index, call] of (layer.record_calls || []).entries()) {
    for (const [providerId, rawHex] of Object.entries(call.provider_script_hex || {}))
      records.set(`call:${index}:provider:${providerId}`, uiHexBytes(rawHex));
  }
  for (const [providerId, recordId] of Object.entries(
    layer.provider_records || {}
  )) {
    if (records.has(recordId)) {
      recordProviders.set(Number(providerId), recordId);
    }
  }
  for (const [providerId, pair] of Object.entries(
    layer.provider_record_pairs || {}
  )) {
    const recordId = uiRecordPairId(pair);
    if (recordId && records.has(recordId)) {
      recordProviders.set(Number(providerId), recordId);
    }
  }
  const sequences = [
    ...(layer.provider_record_sequence
      ? [layer.provider_record_sequence] : []),
    ...(layer.provider_record_sequences || []),
  ];
  for (const sequence of sequences) {
    const source = sequence.values ?? uiDataPathValue(sequence.source) ?? [];
    const catalog = uiDataPathValue(sequence.catalog) || [];
    (sequence.providers || []).forEach((providerId, index) => {
      const recordId = source[index]?.[sequence.record_id_field];
      const entry = catalog.find(
        item => item?.[sequence.catalog_id_field] === recordId
      );
      const rawHex = uiNestedValue(entry, sequence.raw_hex_field);
      if (!rawHex) return;
      const key = `provider:${providerId}`;
      records.set(key, uiHexBytes(rawHex));
      recordProviders.set(Number(providerId), key);
    });
  }
  const operandCounts = new Map([
    [0xEA, 1], [0xEB, 2], [0xEC, 1], [0xED, 1], [0xEE, 1],
    [0xEF, 2], [0xF0, 1], [0xF1, 1], [0xF2, 1], [0xF3, 1],
    [0xF4, 1], [0xF5, 1], [0xF6, 0], [0xF7, 2], [0xF8, 2],
    [0xF9, 2], [0xFA, 1], [0xFB, 1], [0xFC, 1], [0xFD, 1],
    [0xFE, 0],
  ]);
  const initialCursor = Number(layer.cursor || 0) & 0x3FF;
  const tilePalette = position => {
    if (!layer.palette_sets?.length) return layer.background_palette;
    const x = position & 31, y = position >> 5;
    const attribute = layer.logical_attributes?.[(y >> 2) * 8 + (x >> 2)] ?? layer.default_attribute ?? 0;
    return layer.palette_sets[(attribute >> (((y & 2) << 1) | (x & 2))) & 3];
  };
  const targetPage = layer.page_index === undefined || layer.page_index === null
    ? null
    : Math.max(0, Number(layer.page_index) || 0);
  const vm = {
    cursor: initialCursor,
    lineOrigin: Number(layer.line_origin ?? (initialCursor & 0x1F)) & 0x1F,
    glyphPixelX: null,
    rawMode: false,
    page: 0,
    stack: [],
    dialogueLines: 0,
    dialoguePrefix: layer.continuation_prefix_record || layer.prefix_record,
  };
  const fieldCache = layer.glyph_cache?.mode === 'field-pools';
  const glyphCache = layer.glyph_cache ? glyphCaches.get(layer.glyph_cache.cache_key)
    || (fieldCache ? {tiles: new Uint8Array(1024).fill(255), cells: new Map(), references: new WeakMap(),
      parameters: layer.glyph_cache.parameters} : logicalSurface ? createFieldGlyphCache(logicalSurface.patterns,
      {...layer.glyph_cache,
        linear: true, first_tile: Number(layer.glyph_cache.initial_tile),
        end_tile: 0x62}, logicalSurface.tiles) : {cells: new Map()}) : null;
  if (layer.glyph_cache?.cache_key) glyphCaches.set(layer.glyph_cache.cache_key, glyphCache);
  const paintCachedGlyph = (glyphId, originX, originY) => {
    const allocator = layer.glyph_cache.linear_allocator;
    if (logicalSurface && (!allocator || allocator.excluded_tags.some(tag =>
      logicalSurface.tiles[tag.offset] === tag.value)))
      throw new TypeError('窗口正文需要未确认的字形缓存分配分支');
    if (glyphId === null || glyphId * 18 + 18 > glyphData.length)
      throw new TypeError('字形缓存引用了未发布的字形');
    // 窗口执行现场仍维护 ROM 的逻辑图块与寄存器，显示只取字符像素。
    if (logicalSurface) writeFieldGlyph(glyphCache, glyphData.subarray(glyphId * 18, glyphId * 18 + 18),
      (vm.cursor + ((Number(layer.glyph_pixel_y_offset || 0) + 4) / 8) * 32) & 0x3FF,
      vm.glyphPixelX !== null && originX % 8 === 4);
    const cells = logicalSurface ? (logicalSurface.glyphCells ||= new Map()) : glyphCache.cells;
    const positions = uiWriteGlyphCells(cells, glyphData, glyphId, originX, originY);
    const references = fieldCache ? glyphCache.references.get(image) || new Map() : null;
    if (fieldCache) glyphCache.references.set(image, references);
    for (const position of positions) {
      const pixels = cells.get(position), palette = layer.glyph_cache.palette || [0x0F, 0x30, 0x10, 0x00];
      if (fieldCache) {
        glyphCache.tiles[position] = 255;
        references.set(position, {pixels, palette});
      }
      uiPaintGlyphCell(image, position, pixels, palette.map(value => nesPalette[value & 63]));
    }
  };
  // 像素槽位与旧 nametable 现场共用下面的记录执行器；消费页不接触编码。
  const slot = layer.text_slot || null;
  const progress = slot?.progress;
  const callProgress = layer.record_calls ? {status: 'complete', reason: ''} : null;
  if (callProgress) layer.record_call_progress = callProgress;
  let slotX = slot?.geometry.first_line.x;
  let slotBaseline = slot?.geometry.first_line.baseline_y;
  let waits = 0;
  const stopSlot = reason => {
    if (callProgress) {callProgress.status = 'blocked'; callProgress.reason = reason;}
    if (logicalSurface) logicalSurface.missing.push(reason);
    if (progress?.status === "complete") {
      progress.status = "blocked";
      progress.reason = reason;
    }
  };
  const missingProvider = "正文需要运行时插入内容，槽位尚未发布对应参数绑定";
  let runtimeScriptSequence = 0;
  const runtimeInput = (recordId, offset, valueType) => {
    const catalog = layer.runtimeParameters;
    if (!catalog) return null; // Existing non-catalog providers keep their own contract.
    const unavailable = reason => {
      stopSlot(reason);
      return {status: "unavailable"};
    };
    // The text owner already identifies commands, including non-insertion commands.
    // This ordinal is local to the current record, including fixed/dynamic includes.
    const commands = slot?.recordDocument?.records?.[recordId]?.protected_ranges
      ?.filter(range => range.kind === "command") || [];
    const commandIndex = commands.findIndex(command => command.offset === offset);
    const binding = catalog.records[recordId]?.insertions?.find(
      item => item.command_index === commandIndex,
    );
    const source = catalog.sources[binding?.source];
    if (commandIndex < 0 || !binding || !source) {
      return unavailable(`当前记录 ${recordId} 的插入命令尚未发布参数来源`);
    }
    if (source.value_type !== valueType) {
      return unavailable(`当前记录 ${recordId} 的参数类型与文字命令不符`);
    }
    if (layer.invocation === null || layer.invocation === undefined
        || typeof layer.resolveRuntimeParameter !== "function") {
      return unavailable("参数来源已发布，尚缺本次消息调用现场与取值接口");
    }
    const result = layer.resolveRuntimeParameter({
      text_record_ref: {resource_id: "text-record", node_id: recordId},
      command_index: commandIndex,
      source: binding.source,
      invocation: layer.invocation,
    });
    if (result?.status === "unavailable") {
      return unavailable(result.reason || "本次消息的运行时参数不可用");
    }
    if (result?.status === "placeholder") {
      // The shared text owner encodes an explicit marker at the existing command.
      // It is neither a runtime text reference nor an integer value. Fixed/dynamic
      // includes and number formatting below retain their normal cursor semantics.
      const characters = Array.from(String(result.text || ""));
      const encoded = characters.map(character => state.project?.text_record_encoding?.glyphs.get(character));
      if (!slot || !characters.length || !result.label || encoded.some(item => !item)
          || (valueType === "unsigned-integer" && encoded.some(item => item.bytes.length !== 1))) {
        return unavailable("预览占位缺少对应字库或插入形式");
      }
      const target = `preview-placeholder:${++runtimeScriptSequence}`;
      records.set(target, Uint8Array.from([...encoded.flatMap(item => [...item.bytes]), 0x9F]));
      progress.placeholders.push({recordId, commandIndex, source: binding.source, valueType,
        text: result.text, label: result.label, x: slotX, baselineY: slotBaseline});
      return {status: "placeholder", target, text: result.text};
    }
    if (result?.status === "empty" && valueType !== "unsigned-integer") return result;
    if (result?.status !== "available") {
      return unavailable("本次消息的取值接口未返回有效参数状态");
    }
    if (valueType === "unsigned-integer") {
      return Number.isSafeInteger(result.value) && result.value >= 0
        ? result : unavailable("本次消息的数值参数尚未解析为非负整数");
    }
    if (valueType === "text-record-ref") {
      const target = result.value;
      return target?.resource_id === "text-record" && typeof target.node_id === "string"
        && target.node_id ? {status: "available", target: target.node_id}
        : unavailable("本次消息的文本参数尚未解析为记录引用");
    }
    const rawHex = fixedRuntimeTextScriptHex(result.value);
    const target = `runtime-input:${++runtimeScriptSequence}`;
    records.set(target, uiHexBytes(rawHex));
    return {status: "available", target};
  };
  const slotFits = (width, height, fontId) => {
    if (!slot) return true;
    if (progress.status !== "complete") return false;
    if (!slot.fontIds.has(fontId)) {
      stopSlot(`槽位没有声明所需字库 ${fontId}`);
      return false;
    }
    const {rectangle, first_line: first, available_width: available} = slot.geometry;
    if (slotBaseline > rectangle.y + rectangle.height) {
      stopSlot("滚动边界尚未发布，无法继续输出下一行");
      return false;
    }
    if (slotBaseline - height < rectangle.y || slotX < rectangle.x
        || slotX + width > Math.min(rectangle.x + rectangle.width, first.x + available)) {
      stopSlot("正文超出已发布槽位；自动折行／滚屏规则尚未确认");
      return false;
    }
    return true;
  };
  let selectionBounds = null;
  let currentSource = null;
  const sourceStack = [];
  const pageVisible = () => Boolean(layer.dialogue_runtime) || targetPage === null || vm.page === targetPage;
  // PRG $07F8C5–$07F902：等待列来自窗口状态，行来自调用时的文字游标。
  const paintSlotWaitMarker = () => {
    if (!layer.wait_marker) return;
    const command = layer.wait_marker === "battle-command";
    uiPaintPattern(image.data, image.width, image.height, patterns, corePatterns,
      0x63, command ? slot.geometry.first_line.x + 64 : slot.geometry.rectangle.width - 8,
      command ? slotBaseline : slot.geometry.rectangle.height - 8, [], layer.background_palette);
  };
  const paintWaitMarker = () => {
    if (!layer.wait_marker || !pageVisible()) return;
    const column = Number(layer.runtime_line_column);
    if (!Number.isInteger(column) || column < 0 || column > 24) return;
    const row = Math.floor(((vm.cursor - 1) & 0x3FF) / 32) + 1;
    if (row >= 30) return;
    uiPaintPattern(image.data, image.width, image.height,
      patterns, corePatterns, 0x63, (column + 7) * 8, row * 8,
      patternProfiles, tilePalette(row * 32 + column + 7));
    includeSelection(currentSource || {recordId: layer.record}, {x: (column + 7) * 8, y: row * 8, width: 8, height: 8});
  };
  const paintDialogueWait = tile => {
    const wait = layer.dialogue_runtime.wait;
    if (tile === wait.tile && Number.isInteger(layer.frame_counter)
        && (layer.frame_counter & wait.frame_mask)) tile = wait.hidden_tile;
    const waitPosition = dialogueWaitPosition(vm.cursor, vm.lineOrigin, layer.dialogue_runtime);
    const row = waitPosition >> 5;
    if (fieldCache) {
      const position = waitPosition;
      glyphCache.tiles[position] = tile;
      glyphCache.cells.delete(position);
      glyphCache.references.get(image)?.delete(position);
    }
    uiPaintPattern(image.data, image.width, image.height, patterns, corePatterns, tile,
      (vm.lineOrigin + wait.column_bias) * 8, row * 8, patternProfiles, layer.background_palette);
    includeSelection(currentSource || {recordId: layer.record}, {x: (vm.lineOrigin + wait.column_bias) * 8,
      y: row * 8, width: 8, height: 8});
  };
  const scrollDialogue = () => {
    const scroll = layer.dialogue_runtime.scroll;
    for (const pass of dialogueScrollPasses(vm.lineOrigin, layer.dialogue_runtime)) {
      let {source, target} = pass;
      if (fieldCache) copyFieldGlyphTiles(glyphCache, {source, target, width: scroll.width,
        rows: scroll.rows, source_step: scroll.source_step, target_step: scroll.target_step});
      for (let row = 0; row < scroll.rows; row += 1) {
        for (let column = 0; column < scroll.width; column += 1) {
          const position = target + column, transfer = layer.dialogue_scroll_commit;
          const committed = !transfer || position % 32 >= transfer.column
            && position % 32 < transfer.column + transfer.width
            && Math.floor(position / 32) >= transfer.row
            && Math.floor(position / 32) < transfer.row + transfer.rows;
          if (!committed) continue;
          if (fieldCache) {
            const cell = glyphCache.cells.get(source + column);
            if (cell) glyphCache.cells.set(target + column, cell);
            else glyphCache.cells.delete(target + column);
            const references = glyphCache.references.get(image);
            const reference = references?.get(source + column);
            if (reference) references.set(target + column, reference);
            else references?.delete(target + column);
          }
          for (let y = 0; y < 8; y += 1) {
            const sx = ((source + column) % 32) * 8;
            const sy = Math.floor((source + column) / 32) * 8 + y;
            const tx = ((target + column) % 32) * 8;
            const ty = Math.floor((target + column) / 32) * 8 + y;
            if (sy < 0 || ty < 0 || sy >= image.height || ty >= image.height) continue;
            image.data.set(image.data.slice((sy * image.width + sx) * 4,
              (sy * image.width + sx + 8) * 4), (ty * image.width + tx) * 4);
            const trace = uiComponentTrace(image);
            trace.pixels.copyWithin(ty * image.width + tx, sy * image.width + sx, sy * image.width + sx + 8);
          }
        }
        source += scroll.source_step;
        target += scroll.target_step;
      }
    }
  };
  const dialogueLineBreak = () => {
    vm.glyphPixelX = null;
    if (layer.dialogue_runtime) {
      const next = dialogueNextLine(vm.cursor, vm.lineOrigin, vm.dialogueLines, layer.dialogue_runtime);
      vm.dialogueLines = next.lines;
      vm.cursor = next.cursor;
      if (next.scroll) scrollDialogue();
      return;
    }
    vm.cursor = ((vm.cursor & ~0x1F) + (layer.dialogue_runtime?.line_step ?? 0x40)
      + vm.lineOrigin) & 0x3FF;
  };
  const includeSelection = (source, box) => {
    if (layer.glyph_cache_replay) return;
    const sources = [...sourceStack, source || currentSource].map(source =>
      source && layer.component_id ? {...source, componentId: layer.component_id} : source);
    uiTraceArea(image, box, sources);
    if (!sources.some(item => item && uiSelectionMatchesSource(
      selection, item.recordId, item.offset, item.length))) return;
    selectionBounds = uiMergeSelectionBounds(selectionBounds, box);
  };
  const paintTile = (tile, pixelYOffset = 0, source = null, outputIndex = 0) => {
    if (slot) {
      // Narrative glyphs pack at 12px; a following 8px literal starts at
      // the next nametable cell, just like vm.cursor in the shared VM path.
      const nextSlotX = Math.ceil(slotX / 8) * 8 + 8;
      slotX = nextSlotX - 8 + outputIndex * 8;
      if (!slotFits(8, 8, "core-latin")) return;
      uiPaintFontTile(image, tile, patterns, corePatterns,
        slotX, slotBaseline - 8, patternProfiles, layer.background_palette);
      includeSelection(source, {x: slotX, y: slotBaseline - 8, width: 8, height: 8});
      slotX = nextSlotX;
      return;
    }
    vm.glyphPixelX = null;
    const position = (vm.cursor + outputIndex) & 0x3FF;
    layer.on_tile_write?.(position, tile);
    const tileY = Math.floor(position / 32);
    if (tileY < 30 && pageVisible()) {
      const originX = (position % 32) * 8;
      const originY = tileY * 8 + Number(pixelYOffset || 0);
      if (logicalSurface) {
        if (originY % 8) throw new TypeError('正文图块的垂直偏移未确认');
        logicalSurface.tiles[originY / 8 * 32 + position % 32] = tile;
        logicalSurface.glyphCells?.delete(originY / 8 * 32 + position % 32);
      }
      if (fieldCache) {
        glyphCache.tiles[position] = tile;
        glyphCache.cells.delete(originY / 8 * 32 + position % 32);
        glyphCache.references.get(image)?.delete(originY / 8 * 32 + position % 32);
      }
      if (!layer.glyph_cache_replay) uiPaintFontTile(image, tile, patterns, corePatterns,
        originX, originY, patternProfiles, tilePalette(position));
      includeSelection(source, {x: originX, y: originY, width: 8, height: 8});
    }
    vm.cursor = (vm.cursor + 1) & 0x3FF;
  };
  const paintNumber = (value, format, preserveOutput) => {
    if (value === null) {
      stopSlot(missingProvider);
      return;
    }
    const byteIndex = Number(format) & 0x0F;
    const byteCount = Math.min(3, byteIndex + 1);
    const modulus = 2 ** (byteCount * 8);
    const placeholder = value?.status === "placeholder" ? value : null;
    const numericValue = placeholder ? null : Math.max(0, Math.floor(value)) % modulus;
    // $F8 and $F9 share the binary-to-decimal formatter.  The low nibble
    // selects a one-, two- or three-byte provider, whose decimal field is
    // respectively 3, 5 or 8 cells wide.
    //
    // $F8 increments Y for suppressed leading zeroes, so its digits are
    // right-aligned in that fixed field; it then leaves $B6:$B7 at the
    // field's first cell.  This lets a following tile (usually ':') occupy
    // the field start without overwriting the right-aligned digits.
    //
    // $F9 does not increment Y for suppressed zeroes and commits the final
    // Y through $BC63, so it emits a compact number and advances normally.
    if (preserveOutput && (Number(format) & 0x80) && numericValue === 0) {
      return;
    }
    const savedCursor = vm.cursor;
    const savedGlyphPixelX = vm.glyphPixelX;
    const savedSlotX = slotX;
    const digits = placeholder ? placeholder.text : String(numericValue);
    if (preserveOutput) {
      const fieldWidths = [3, 5, 8];
      const fieldWidth = fieldWidths[byteIndex] || digits.length;
      if (slot) slotX += Math.max(0, fieldWidth - digits.length) * 8;
      vm.cursor = (
        vm.cursor + Math.max(0, fieldWidth - digits.length)
      ) & 0x3FF;
      vm.glyphPixelX = null;
    }
    if (placeholder) execute(placeholder.target);
    else for (const digit of digits) paintTile(Number(digit), 0, currentSource);
    if (preserveOutput) {
      vm.cursor = savedCursor;
      vm.glyphPixelX = savedGlyphPixelX;
      if (slot) slotX = savedSlotX;
    }
  };
  const execute = (
    recordId, start = 0, repeatEnd = false, allowSameRecord = false, commandLimit = Infinity, literalOutputIndex = 0
  ) => {
    const raw = records.get(recordId);
    if (!raw || (!allowSameRecord && vm.stack.includes(recordId))) {
      stopSlot(!raw ? `当前正文缺少被引用的记录 ${recordId}` : `记录 ${recordId} 循环引用`);
      return raw?.length || start;
    }
    vm.stack.push(recordId);
    const parentSource = currentSource;
    if (parentSource) sourceStack.push(parentSource);
    let offset = start;
    let commands = 0;
    try {
      while (offset < raw.length) {
        if (commands++ >= commandLimit) return offset;
        if (slot && progress.status !== "complete"
            || callProgress && callProgress.status !== 'complete') return offset;
        const token = raw[offset];
        currentSource = {recordId, offset, length: vm.rawMode ? 1
          : token >= 0x24 && token <= 0x2E ? 2 : 1 + (operandCounts.get(token) || 0)};
        const declaredSlot = !vm.rawMode && [0xFA, 0xFB, 0xFC, 0xFD].includes(token)
          && layer.component_slot_providers?.[raw[offset + 1]];
        if (declaredSlot) {
          (image.interfaceSlots ||= []).push(interfaceTextSlot(declaredSlot.id, declaredSlot.label,
            vm.cursor, {...declaredSlot, pixelYOffset: Number(layer.glyph_pixel_y_offset || 0) - (glyphCache ? 4 : 0),
              sourceRecord: layer.record, source: currentSource}));
        }
        if (vm.rawMode) {
          if (token === 0x9F) return offset + 1;
          if (token === 0x63) {
            vm.rawMode = false;
            offset += 1;
            continue;
          }
          if (token === 0x43 && offset + 1 < raw.length) {
            vm.rawMode = false;
            execute(
              `record:09:${Number(raw[offset + 1]).toString().padStart(3, "0")}`
            );
            offset += 2;
            continue;
          }
          if (token === 0x8C && offset + 2 < raw.length) {
            for (let count = raw[offset + 1]; count > 0; count -= 1) {
              paintTile(raw[offset + 2], 0, {
                recordId, offset: offset + 2, length: 1,
              });
            }
            offset += 3;
            continue;
          }
          if (token === 0x9E && offset + 1 < raw.length) {
            vm.cursor = (vm.cursor + raw[offset + 1]) & 0x3FF;
            offset += 2;
            continue;
          }
          paintTile(token, 0, {recordId, offset, length: 1});
          offset += 1;
          continue;
        }
        if (token === 0x9F || (token === 0xFE && repeatEnd)) {
          if (token === 0x9F) {
            // 19:1BC0 -> 19:1FC9/1FCC clears the dynamic glyph half-cell
            // at every record terminator, including an E9 name include.
            // The output pointer already denotes the next 8px cell.
            vm.glyphPixelX = null;
            if (slot) slotX = Math.ceil(slotX / 8) * 8;
          }
          return offset + 1;
        }
        const inlineOperation = model.script_vm?.inline_state_ops?.operations?.find(operation => operation.lead === token);
        if (inlineOperation) {
          const inlineCache = fieldCache && layer.glyph_cache_inline_state === true;
          for (const write of inlineOperation.writes || []) {
            const address = write.address ?? Number.parseInt(String(write.address_hex).replace('$', ''), 16);
            const value = write.value ?? (write.value_hex == null ? null : Number(write.value_hex));
            if (layer.dialogue_runtime && address === layer.dialogue_runtime.line_count_register
                && Number.isInteger(value)) vm.dialogueLines = value;
            if (!Number.isInteger(value) || address < 0x6000 || address >= 0x63C0) continue;
            const position = address - 0x6000;
            if (logicalSurface) {
              logicalSurface.tiles[position] = value;
              logicalSurface.glyphCells?.delete(position);
            }
            if (inlineCache) {
              glyphCache.tiles[position] = value;
              glyphCache.cells.delete(position);
              glyphCache.references.get(image)?.delete(position);
              continue;
            }
            uiPaintPattern(image.data, image.width, image.height, patterns, corePatterns, value,
              (position % 32) * 8, Math.floor(position / 32) * 8, patternProfiles, layer.background_palette);
            includeSelection(currentSource, {x: (position % 32) * 8, y: Math.floor(position / 32) * 8, width: 8, height: 8});
          }
          if (inlineOperation.redispatches_lookahead && offset + 1 < raw.length) {
            execute(recordId, offset + 1, false, true, 1,
              Number(inlineOperation.redispatch_literal_output_index || 0));
          }
          offset += inlineOperation.stream_bytes;
          continue;
        }
        if (token >= 0x24 && token <= 0x2E && offset + 1 < raw.length) {
          if (slot) {
            if (!slotFits(12, 12, "narrative-12x12")) return offset;
            const glyphId = uiGlyphId(model, token, raw[offset + 1]);
            if (glyphId === null) {
              stopSlot(`记录 ${recordId} 引用了未发布的字形`);
              return offset;
            }
            uiPaintGlyph(image.data, image.width, glyphData, glyphId,
              slotX, slotBaseline - 12, nesPalette[Number(layer.glyph_colour ?? 0x30) & 0x3F]);
            includeSelection({recordId, offset, length: 2},
              {x: slotX, y: slotBaseline - 12, width: 12, height: 12});
            slotX += 12;
            offset += 2;
            continue;
          }
          const position = vm.cursor & 0x3FF;
          const tileY = Math.floor(position / 32);
          const originX = vm.glyphPixelX ?? ((position % 32) * 8);
          if (tileY < 30 && pageVisible()) {
            const colourRows = layer.glyph_colour_rows || [];
            const defaultColour = nesPalette[
              Number(layer.glyph_colour ?? tilePalette(position)?.[1] ?? 0x30) & 0x3F
            ];
            const colour = colourRows.length
              ? (_x, y) => {
                const range = colourRows.find(item => (
                  y >= Number(item.first_y ?? 0)
                  && y <= Number(item.last_y ?? 239)
                ));
                return nesPalette[
                  Number(range?.colour ?? layer.glyph_colour ?? 0x30) & 0x3F
                ];
              }
              : defaultColour;
            const glyphId = uiGlyphId(model, token, raw[offset + 1]);
            const originY = tileY * 8 + Number(layer.glyph_pixel_y_offset || 0);
            if (callProgress && !glyphCache) {
              const background = nesPalette[Number(tilePalette(position)?.[0] ?? 0x0F) & 0x3F];
              for (let y = originY; y < originY + 12; y++)
                for (let x = originX; x < originX + 12; x++)
                  uiPutRgb(image.data, image.width, x, y, background);
            }
            if (glyphCache) paintCachedGlyph(glyphId, originX, originY);
            else uiPaintGlyph(image.data, image.width, glyphData, glyphId, originX, originY, colour);
            includeSelection(
              {recordId, offset, length: 2},
              {
                x: originX,
                y: tileY * 8 + Number(layer.glyph_pixel_y_offset || 0) - (glyphCache ? 4 : 0),
                width: 12,
                height: glyphCache ? 16 : 12,
              },
            );
          }
          vm.glyphPixelX = originX + 12;
          vm.cursor = (
            (position & ~0x1F) + Math.ceil(vm.glyphPixelX / 8)
          ) & 0x3FF;
          offset += 2;
          continue;
        }
        if (token < 0xE2 || token === 0xFF) {
          if (token === 0x42) {
            if (logicalSurface) {
              const reset = layer.glyph_cache.reset;
              if (!reset || reset.lead !== token) throw new TypeError('窗口正文缺少字形缓存控制码来源');
              glyphCache.nextTile = reset.next_tile;
            }
            offset += 1;
            continue;
          }
          paintTile(
            token < 0x24 && token >= 0x16 ? token + 0x6A : token,
            Number(layer.literal_tile_pixel_y_offset || 0),
            {recordId, offset, length: 1}, literalOutputIndex,
          );
          offset += 1;
          continue;
        }
        if ((token === 0xFE || token === 0xF0)
            && !repeatEnd && targetPage !== null && !layer.dialogue_runtime) {
          if (vm.page >= targetPage) {
            paintWaitMarker();
            return offset + 1;
          }
          vm.page += 1;
          vm.cursor = initialCursor;
          vm.glyphPixelX = null;
          vm.rawMode = false;
          offset += token === 0xF0 ? 2 : 1;
          continue;
        }
        const operandCount = operandCounts.get(token) ?? 0;
        const operands = raw.slice(offset + 1, offset + 1 + operandCount);
        if (slot) {
          if (token === 0xE4) {
            if (waits++ >= slot.confirmedWaits) {
              paintSlotWaitMarker();
              progress.status = "waiting";
              progress.reason = "等待确认";
              return offset;
            }
            offset += 1;
            continue;
          }
          if (token === 0xE5) {
            const commands = slot.recordDocument.records[recordId]?.protected_ranges
              ?.filter(range => range.kind === "command") || [];
            const commandIndex = commands.findIndex(command => command.offset === offset);
            const entries = (slot.geometry.line_break_entries || []).filter(entry =>
              entry.record === recordId && entry.command_index === commandIndex
              && entry.from_baseline_y === slotBaseline);
            const destination = entries.length === 1 ? entries[0].destination : null;
            if (!destination || ![destination.x, destination.y, destination.baseline_y]
              .every(Number.isInteger)) {
              stopSlot("换行滚屏的滚动边界尚未发布");
              return offset;
            }
            // Only this command's independently located, non-scrolling entry
            // is published. Other positions still stop; no generic scroll is inferred.
            slotX = destination.x;
            slotBaseline = destination.baseline_y;
            offset += 1;
            continue;
          }
          if (token === 0xE7) {
            slotX = slot.geometry.first_line.x;
            slotBaseline += slot.geometry.line_height;
            offset += 1;
            continue;
          }
          // 引用与 provider 共用下方执行器；在实际取值处检查缺参。
          // 缺失或嵌套阻塞都必须停止，不能跳过未知宽度继续画正文。
          if (![0xF7, 0xF2, 0xF3, 0xEA, 0xEC, 0xE8, 0xE9,
            0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD].includes(token)) {
            stopSlot([0xE2, 0xE3, 0xE6].includes(token)
              ? missingProvider
              : `命令 ${token.toString(16).toUpperCase()} 的槽位绘制规则尚未确认`);
            return offset;
          }
        }
        if (token === 0xED) {
          vm.glyphPixelX = null;
          vm.cursor = (vm.cursor + operands[0]) & 0x3FF;
        } else if (token === 0xE5) {
          dialogueLineBreak();
        } else if ([0xFE, 0xF0].includes(token) && layer.dialogue_runtime) {
          const runtime = layer.dialogue_runtime;
          if (token === 0xF0) vm.dialoguePrefix = `record:${runtime.prefix_region.toString(16)
            .toUpperCase().padStart(2, '0')}:${String(operands[0]).padStart(3, '0')}`;
          if (waits++ >= layer.confirmed_waits || !(layer.confirm_input & runtime.wait.input_mask)) {
            paintDialogueWait(runtime.wait.tile);
            return offset;
          }
          paintDialogueWait(runtime.wait.clear_tile);
          dialogueLineBreak();
          vm.cursor = (vm.cursor - runtime.prefix_retreat) & 0x3FF;
          execute(vm.dialoguePrefix);
        } else if (token === 0xE4) {
          if (layer.dialogue_runtime) {
            const wait = layer.dialogue_runtime.wait;
            if (waits++ >= layer.confirmed_waits || !(layer.confirm_input & wait.input_mask)) {
              paintDialogueWait(wait.tile);
              if (callProgress) {
                callProgress.status = 'waiting';
                callProgress.reason = '等待确认';
              }
              return offset;
            }
            paintDialogueWait(wait.clear_tile);
          } else paintWaitMarker();
        } else if ((token === 0xE3 || token === 0xEB) && layer.inline_confirm) {
          dialogueLineBreak();
          const textCursor = 0x6000 + vm.cursor;
          if (!layer.inline_confirm_record) throw new TypeError('确认选择缺少文字构造引用');
          execute(layer.inline_confirm_record);
          onInlineConfirm?.(textCursor);
        } else if (token === 0xEB && layer.choice_record) {
          vm.glyphPixelX = null;
          vm.cursor = ((vm.cursor & ~0x1F) + 0x40
            + Number(layer.runtime_line_column)) & 0x3FF;
          execute(layer.choice_record);
        } else if (token === 0xE7) {
          vm.glyphPixelX = null;
          vm.cursor = (
            (vm.cursor & ~0x1F) + 0x80 + vm.lineOrigin
          ) & 0x3FF;
        } else if (token === 0xE8) {
          const input = runtimeInput(recordId, offset, "fixed-runtime-text-source");
          const target = input ? input.target : scriptProviders.get(7);
          if (target) execute(target);
          else if (!input) stopSlot(missingProvider);
        } else if (token === 0xE9) {
          const input = runtimeInput(recordId, offset, "text-record-ref");
          const target = input ? input.target : uiRecordPairId(layer.runtime_record_pair);
          if (target) execute(target);
          else if (!input) stopSlot(missingProvider);
        } else if (token === 0xE2) {
          // 通缉令字段：把运行时 $DF-$E1 的三字节小端值紧凑输出。
          // constructor 用 provider 0xDF 注入当前赏金，数字 tile 仍来自
          // PRG $047800 的核心字体，与实机上传到 CHR-RAM 的内容一致。
          if (layer.runtime_value_cursor !== undefined) {
            vm.cursor = Number(layer.runtime_value_cursor) & 0x3FF;
            vm.glyphPixelX = null;
          }
          paintNumber(uiProviderValue(layer, 0xDF), 2, false);
        } else if (token === 0xEF) {
          for (let count = operands[0]; count > 0; count -= 1) {
            paintTile(operands[1], 0, currentSource);
          }
        } else if (token === 0xF6) {
          vm.rawMode = !vm.rawMode;
        } else if (token === 0xF7) {
          execute(
            `record:${Number(operands[1]).toString(16).toUpperCase().padStart(2, "0")}:${Number(operands[0]).toString().padStart(3, "0")}`
          );
        } else if (token === 0xF2) {
          execute(`record:09:${Number(operands[0]).toString().padStart(3, "0")}`);
        } else if (token === 0xF3) {
          execute(`record:11:${Number(operands[0]).toString().padStart(3, "0")}`);
        } else if (token === 0xEA) {
          execute(`record:13:${Number(operands[0]).toString().padStart(3, "0")}`);
        } else if (token === 0xEC) {
          execute(`record:14:${Number(operands[0]).toString().padStart(3, "0")}`);
        } else if (token === 0xF8 || token === 0xF9) {
          const input = runtimeInput(recordId, offset, "unsigned-integer");
          if (!input || input.status === "available" || input.status === "placeholder") {
            paintNumber(input?.status === "placeholder" ? input : input ? input.value : uiProviderValue(layer, operands[0]),
              operands[1], token === 0xF8);
          }
        } else if (token === 0xFA || token === 0xFB) {
          const input = runtimeInput(recordId, offset, "text-record-ref");
          const target = input ? input.target : recordProviders.get(Number(operands[0]));
          if (target) {
            const savedCursor = vm.cursor;
            const savedSlotX = slotX, savedSlotBaseline = slotBaseline;
            execute(target);
            if (token === 0xFA) {
              vm.cursor = savedCursor;
              if (slot) { slotX = savedSlotX; slotBaseline = savedSlotBaseline; }
            }
          } else if (!input) stopSlot(missingProvider);
        } else if (token === 0xFC || token === 0xFD) {
          const input = runtimeInput(recordId, offset, "fixed-runtime-text-source");
          const target = input ? input.target : scriptProviders.get(Number(operands[0]));
          if (target) {
            const savedCursor = vm.cursor;
            const savedSlotX = slotX, savedSlotBaseline = slotBaseline;
            execute(target);
            if (token === 0xFC) {
              vm.cursor = savedCursor;
              if (slot) { slotX = savedSlotX; slotBaseline = savedSlotBaseline; }
            }
          } else if (!input) stopSlot(missingProvider);
        } else if (token === 0xF4) {
          const substream = offset + 2;
          let repeatOffset = substream;
          for (let count = operands[0]; count > 0; count -= 1) {
            repeatOffset = execute(recordId, substream, true, true);
          }
          offset = repeatOffset;
          continue;
        } else if (logicalSurface) {
          stopSlot(`窗口正文缺少命令 ${token.toString(16).toUpperCase()} 的构建声明`);
          return offset;
        }
        offset += 1 + operandCount;
      }
      return offset;
    } finally {
      currentSource = parentSource;
      if (parentSource) sourceStack.pop();
      vm.stack.pop();
    }
  };
  if (layer.prefix_record) execute(layer.prefix_record);
  if (layer.record_calls) {
    for (const [index, call] of layer.record_calls.entries()) {
      vm.cursor = call.cursor;
      vm.dialogueLines = call.line_count;
      vm.glyphPixelX = null;
      for (const provider of Object.keys(call.provider_script_hex || {}))
        scriptProviders.set(Number(provider), `call:${index}:provider:${provider}`);
      execute(call.record);
      if (callProgress.status !== 'complete') break;
    }
  } else execute(layer.record);
  if (layer.dialogue_terminal_wait) {
    if (layer.terminal_wait_cursor !== undefined) vm.cursor = layer.terminal_wait_cursor;
    if (layer.terminal_wait_origin !== undefined) vm.lineOrigin = layer.terminal_wait_origin;
    paintDialogueWait(layer.dialogue_runtime.wait.tile);
  }
  if (logicalSurface && glyphCache) {
    logicalSurface.patterns = glyphCache.patterns;
    logicalSurface.next_tile = glyphCache.nextTile;
  }
  if (slot && layer.wait_marker === "battle-command" && progress.status === "complete") {
    paintSlotWaitMarker();
  }
  return selectionBounds;
}

function uiPaintInterfaceCanvas(
  canvas, selected, patterns, corePatterns, glyphData, model,
  records = null, patternProfiles = [], selection = null
) {
  const layers = selected?.layers || selected?.reconstruction_layers || [];
  const layoutLayer = layers.find(layer => layer.kind === "layout");
  const layout = uiLayoutRecord(layoutLayer?.record);
  if (!layout) return;
  const {context, image} = uiBlankCanvas(canvas);
  uiPaintLayoutWrites(
    image, layout, patterns, corePatterns, 0, patternProfiles
  );
  let selectionBounds = null;
  for (const layer of layers.filter(item => item.kind === "script")) {
    selectionBounds = uiMergeSelectionBounds(
      selectionBounds,
      uiPaintInterfaceScript(
        image, layer, model, patterns, corePatterns, glyphData, records,
        patternProfiles, selection,
      ),
    );
  }
  context.putImageData(image, 0, 0);
  canvas.componentTrace = image.componentTrace;
  canvas.interfacePixels = image.interfacePixels;
  return selectionBounds;
}

function uiPaintDialogueBackdrop(image, layout, shift = 0) {
  const positions = (layout?.render?.logical_tile_writes || [])
    .map(([position]) => Number(position))
    .filter(Number.isInteger)
    .map(position => (position + Number(shift || 0)) & 0x3FF)
    .filter(position => position < 32 * 30);
  if (!positions.length) {
    throw new TypeError("地图对话窗口布局没有可绘制范围");
  }
  const tileYs = positions.map(position => Math.floor(position / 32));
  const top = Math.min(...tileYs) * 8;
  // NES 的底部对话区域先用黑色横跨整张 nametable，再在其上绘制内缩的
  // 窗口框体；左右框外同样属于状态栏区域，不能继续透出场景。
  const bottom = image.height;
  const black = nesPalette[0x0F];
  for (let y = top; y < bottom; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      uiPutRgb(image.data, image.width, x, y, black);
    }
  }
}

function uiBottomFilledDialogueLayout(layout, shift, imageHeight) {
  const writes = layout?.render?.logical_tile_writes || [];
  const resolvedWrites = writes.map(([position, tile]) => [
    (Number(position) + Number(shift || 0)) & 0x3FF,
    Number(tile),
  ]).filter(([position, tile]) => (
    Number.isInteger(position) && Number.isInteger(tile)
  ));
  const visibleWrites = resolvedWrites.filter(
    ([position]) => position < 32 * 30,
  );
  if (!visibleWrites.length) return {layout, shift};
  const rowOf = position => Math.floor(position / 32);
  const bottomRow = Math.max(...visibleWrites.map(([position]) => (
    rowOf(position)
  )));
  const targetBottomRow = Math.min(
    29,
    Math.floor((Math.max(1, Number(imageHeight)) - 1) / 8),
  );
  if (bottomRow >= targetBottomRow) return {layout, shift};

  const xs = visibleWrites.map(([position]) => position % 32);
  const edgeXs = [...new Set([Math.min(...xs), Math.max(...xs)])];
  const sideTiles = edgeXs.map(x => visibleWrites
    .filter(([position]) => position % 32 === x && rowOf(position) < bottomRow)
    .sort(([left], [right]) => rowOf(right) - rowOf(left))[0]
  ).filter(Boolean);
  const bottomWrites = visibleWrites.filter(
    ([position]) => rowOf(position) === bottomRow,
  );
  if (!bottomWrites.length || sideTiles.length !== edgeXs.length) {
    return {layout, shift};
  }

  // 完整 30 行舞台按底部窗口的常规拼法补齐：框体顶部和正文仍留在 ROM
  // 坐标，复用已有边柱填充缺少的行，再把 ROM 的整行底边放到最后一个
  // 可见 tile 行。这里不缩放像素，也不新造窗口 tile。
  const filledWrites = [
    ...visibleWrites.filter(([position]) => rowOf(position) !== bottomRow),
    ...Array.from(
      {length: targetBottomRow - bottomRow},
      (_, index) => sideTiles.map(([position, tile]) => [
        (bottomRow + index) * 32 + (position % 32),
        tile,
      ]),
    ).flat(),
    ...bottomWrites.map(([position, tile]) => [
      targetBottomRow * 32 + (position % 32),
      tile,
    ]),
    ...resolvedWrites.filter(([position]) => position >= 32 * 30),
  ];
  return {
    layout: {
      ...layout,
      render: {
        ...(layout.render || {}),
        logical_tile_writes: filledWrites,
      },
    },
    shift: 0,
  };
}

// $BCAA 表的 00/01/02 指向 $6400/$6405/$640A；$BBDE–$BBEC 初始化三个人物姓名。
const dialogueNameProviders = Object.freeze({
  0: "text_slots.slots.character-init:name-presets:1",
  1: "text_slots.slots.character-init:name-presets:2",
  2: "text_slots.slots.character-init:name-presets:3",
});

// 剧情姓名沿用对话画布的姓名提供方。
export function uiDialogueActorName(slot) {
  const path = dialogueNameProviders[slot];
  const source = path && uiDataPathValue(path);
  if (!source || !state.project?.text_record_encoding) return null;
  const name = decodeFixedRuntimeText(source, state.project.text_record_encoding);
  return name.complete && name.text.trim() ? {name: name.text.trim(), source: source.id} : null;
}

export function uiDialogueRuntimeKey() {
  return JSON.stringify([db.fieldRevision('text-render-runtime'), Object.entries(dialogueNameProviders)
    .map(([id, path]) => [id, uiDataPathValue(path)])]);
}

export async function uiDialogueRecordSources(records, model = uiConstructionModel()) {
  const sources = await uiRecordSourcesByRegions(model, records.map(record => record.split(':')[1]));
  return effectiveTextRecordSources(sources, state.project?.text_record_edits);
}

export function uiPaintDialogueCanvas(
  canvas, record, pageIndex, renderSources, records = null,
  {fieldWindow = true, prefixRecord = null, interactionWindow = false} = {}
) {
  const {model, patterns, corePatterns, glyphs, dialogueRuntime} = renderSources || {};
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const image = context.createImageData(canvas.width, canvas.height);
  let cursor = 0;
  let lineOrigin = 0;
  let continuationPrefix = prefixRecord;
  if (fieldWindow) {
    const runtime = model?.dialogue_runtime || null;
    const interaction = model?.menu_dispatch_data?.previews?.find(preview =>
      preview.interface_state_id === 'walking-dialogue.start');
    const window = interaction?.layers?.find(layer => layer.kind === 'layout');
    const body = interaction?.layers?.find(layer => layer.dialogue_runtime);
    continuationPrefix ||= body?.continuation_prefix_record;
    const layout = uiLayoutRecord(interactionWindow ? window?.record : runtime?.common_layout_record);
    const layoutOrigin = Number(interactionWindow ? window?.shift : runtime?.logical_layout_origin);
    cursor = Number(runtime?.logical_text_cursor);
    lineOrigin = Number(dialogueRuntime?.line_origin);
    if (interactionWindow) {
      cursor = body?.cursor - Number(runtime?.prefix_retreat ?? dialogueRuntime?.prefix_retreat);
      lineOrigin = body?.line_origin;
    }
    if (!layout || !Number.isInteger(layoutOrigin)
        || !Number.isInteger(cursor) || !Number.isInteger(lineOrigin) || !continuationPrefix) {
      throw new TypeError("地图对话窗口布局或正文落点不可用");
    }
    // 舞台把对话作为独立图层叠在场景上；窗口框只写边线 tile，未写的内部
    // 不能沿用透明画布。先按同一份布局的实际边界铺 NES 黑色，再画框和正文。
    uiPaintDialogueBackdrop(image, layout, layoutOrigin);
    const filledLayout = uiBottomFilledDialogueLayout(
      layout, layoutOrigin, image.height,
    );
    uiPaintLayoutWrites(
      image, filledLayout.layout, patterns, corePatterns, filledLayout.shift,
    );
  }
  const dialogueRecords = effectiveTextRecordSources(records);
  let scriptRecord = record;
  if (prefixRecord) {
    // $F58A→$BD87 先运行 $0C 前缀，正文共享前缀推进后的光标。
    scriptRecord = "dialogue:prefixed";
    const prefix = dialogueRecords.get(prefixRecord);
    const body = dialogueRecords.get(record);
    if (!prefix || !body) throw new TypeError("对话前缀或正文记录不可用");
    dialogueRecords.set(scriptRecord, [...prefix.slice(0, -1), ...body]);
  }
  uiPaintInterfaceScript(
    image,
    {
      kind: "script",
      record: scriptRecord,
      cursor,
      line_origin: lineOrigin,
      page_index: Number(pageIndex) || 0,
      ...(fieldWindow ? {dialogue_runtime: dialogueRuntime,
        continuation_prefix_record: continuationPrefix,
        confirmed_waits: Number(pageIndex) || 0,
        confirm_input: dialogueRuntime.wait.input_mask, dialogue_terminal_wait: true} : {}),
      provider_scripts: dialogueNameProviders,
    },
    model,
    patterns,
    corePatterns,
    glyphs,
    dialogueRecords,
  );
  context.putImageData(image, 0, 0);
}

export function uiPatternProfiles(entry, profilePatterns, layer = null) {
  const ids = [
    ...(layer?.pattern_profiles || []),
    ...(layer?.pattern_profile ? [layer.pattern_profile] : []),
    ...(entry?.pattern_profiles || []),
  ];
  return [...new Set(ids)].map(id => profilePatterns.get(id)).filter(Boolean);
}

export function uiVehiclePortraitLayer(layer, model) {
  const chassisId = typeof layer.chassis_id === "string"
    ? Number.parseInt(
      layer.chassis_id,
      layer.chassis_id.toLowerCase().startsWith("0x") ? 16 : 10
    )
    : Number(layer.chassis_id);
  const dispatch = model.menu_dispatch_data || {};
  const variant = dispatch.vehicle_portraits?.variants?.find(
    item => Number(item.chassis_id) === chassisId
  );
  if (!variant) return null;
  return {
    ...layer,
    kind: "script",
    record: variant.record,
    cursor: Number(
      layer.cursor ?? dispatch.vehicle_portraits?.portrait_cursor ?? 0
    ),
    pattern_profiles: [
      variant.background_pattern_profile,
      ...(layer.pattern_profiles || []),
    ],
  };
}

function uiPaintVehiclePortraitCanvas(
  canvas, chassisId, patterns, corePatterns, glyphData, model, records,
  profilePatterns
) {
  const source = document.createElement("canvas");
  const {context, image} = uiBlankCanvas(source);
  const layer = uiVehiclePortraitLayer({chassis_id: chassisId}, model);
  if (!layer) return;
  uiPaintInterfaceScript(
    image, layer, model, patterns, corePatterns, glyphData, records,
    uiPatternProfiles(null, profilePatterns, layer)
  );
  context.putImageData(image, 0, 0);

  const background = nesPalette[0x0F];
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (
        image.data[offset] === background[0]
        && image.data[offset + 1] === background[1]
        && image.data[offset + 2] === background[2]
      ) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const hasContent = maxX >= minX && maxY >= minY;
  const left = hasContent ? Math.max(0, Math.floor(minX / 8) * 8 - 8) : 0;
  const top = hasContent ? Math.max(0, Math.floor(minY / 8) * 8 - 8) : 0;
  const right = hasContent
    ? Math.min(image.width, Math.ceil((maxX + 1) / 8) * 8 + 8) : 64;
  const bottom = hasContent
    ? Math.min(image.height, Math.ceil((maxY + 1) / 8) * 8 + 8) : 48;
  canvas.width = right - left;
  canvas.height = bottom - top;
  const target = canvas.getContext("2d");
  target.imageSmoothingEnabled = false;
  target.drawImage(
    source, left, top, canvas.width, canvas.height,
    0, 0, canvas.width, canvas.height
  );
}

export function uiPaintSelectionOutline(image, bounds) {
  if (!bounds) return;
  const x = Math.max(0, Math.floor(bounds.x) - 2);
  const y = Math.max(0, Math.floor(bounds.y) - 2);
  const right = Math.min(image.width, Math.ceil(bounds.x + bounds.width) + 2);
  const bottom = Math.min(image.height, Math.ceil(bounds.y + bounds.height) + 2);
  if (right > x && bottom > y) outlineBox(image, {x, y, width: right - x, height: bottom - y}, {dash: 0});
}

function uiPaintMenuPreviewCanvas(
  canvas, preview, patterns, corePatterns, glyphData, model, records,
  profilePatterns, slotOutputs = new Map(), glyphCaches = new Map(), componentViewport = null
) {
  // 画面保留实机全屏；独立图形与标签只有显式组件视口才裁剪。
  const viewport = componentViewport || UI_PREVIEW_VIEWPORT;
  const surface = viewport ? document.createElement("canvas") : canvas;
  let finalImage;
  const previewProfiles = uiPatternProfiles(preview, profilePatterns);
  const explicitSelection = preview.selection?.bounds || null;
  let selectionBounds = explicitSelection
    && ["x", "y", "width", "height"].every(key =>
      Number.isFinite(Number(explicitSelection[key])))
    && Number(explicitSelection.width) > 0
    && Number(explicitSelection.height) > 0
    ? {
        x: Number(explicitSelection.x),
        y: Number(explicitSelection.y),
        width: Number(explicitSelection.width),
        height: Number(explicitSelection.height),
      }
    : null;
  const paintSelectionOutline = image => uiPaintSelectionOutline(image, selectionBounds);
  if (preview.composition) {
    const composition = model.compositions?.compositions?.find(
      item => item.id === preview.composition
    );
    if (composition) {
      selectionBounds = uiMergeSelectionBounds(
        selectionBounds,
        uiPaintInterfaceCanvas(
          surface, composition, patterns, corePatterns, glyphData, model,
          records, previewProfiles, preview.selection,
        ),
      );
      if (selectionBounds) {
        const context = surface.getContext("2d");
        const image = context.getImageData(0, 0, surface.width, surface.height);
        paintSelectionOutline(image);
        context.putImageData(image, 0, 0);
      }
      finalImage = surface.getContext('2d').getImageData(0, 0, surface.width, surface.height);
      finalImage.componentTrace = surface.componentTrace;
      finalImage.interfacePixels = surface.interfacePixels;
    }
  } else {
    const {context, image} = uiBlankCanvas(surface, {
      transparent: preview.transparent_background === true,
    });
    finalImage = image;
    uiComponentTrace(image);
    for (const history of preview.glyph_cache_history || []) {
      uiPaintMenuPreviewCanvas(document.createElement('canvas'), history, patterns, corePatterns,
        glyphData, model, records, profilePatterns, new Map(), glyphCaches);
    }
    if (preview.glyph_cache_source === 'field-pools' && !glyphCaches.has('field-pools')) {
      const parameters = preview.glyph_cache_parameters
        || preview.layers.find(layer => layer.glyph_cache)?.glyph_cache.parameters;
      glyphCaches.set('field-pools', {tiles: new Uint8Array(1024).fill(255), cells: new Map(),
        parameters, references: new WeakMap()});
    }
    const fieldCache = glyphCaches.get('field-pools');
    if (fieldCache) fieldCache.references = new WeakMap();
    const writeTile = (position, tile) => {
      if (!fieldCache) return;
      fieldCache.tiles[position & 0x3FF] = tile;
      fieldCache.cells.delete(position & 0x3FF);
      fieldCache.references.get(image)?.delete(position & 0x3FF);
    };
    const overlays = [];

    for (const sourceLayer of preview.layers || []) {
      const layer = preview.glyph_cache_replay ? {...sourceLayer, glyph_cache_replay: true} : sourceLayer;
      if (preview.glyph_cache_replay && !['layout', 'script', 'tile_fill', 'tile_writes'].includes(layer.kind)) continue;
      if (layer.kind === 'prepared_interface_window') {
        context.putImageData(image, 0, 0);
        if (layer.output) context.drawImage(layer.output.surface, layer.output.rectangle.x, layer.output.rectangle.y);
        image.data.set(context.getImageData(0, 0, surface.width, surface.height).data);
        if (layer.output?.surface?.componentTrace) uiTraceCopy(image, layer.output.surface,
          {...layer.output.rectangle, source_x: 0, source_y: 0});
        continue;
      }
      const layerProfiles = uiPatternProfiles(
        preview, profilePatterns, layer
      );
      if (layer.kind === 'facility_window_frame') {
        uiTraceWindow(image, layer);
      } else if (layer.kind === "scene_window_raster" || layer.kind === "text_slot") {
        let output;
        if (layer.kind === "scene_window_raster") {
          const window = model.templates_data?.scene_windows?.find(item => item.id === layer.window);
          output = {surface: uiSceneWindowSurface(window?.raster, layer.rectangle),
            rectangle: layer.rectangle};
        } else {
          output = slotOutputs.get(layer) || uiRenderTextSlot({
            ...textSlotProviderBindings(layer),
            textRecordRef: layer.text_record_ref,
            recordDocument: state.project?.text_record_edits,
            geometry: layer.geometry, fonts: layer.fonts,
            waitMarker: layer.waitMarker,
          }, {model, patterns, corePatterns, glyphs: glyphData});
          slotOutputs.set(layer, output);
        }
        const pixels = output.surface.getContext("2d").getImageData(
          0, 0, output.surface.width, output.surface.height);
        for (let y = 0; y < pixels.height; y += 1) {
          for (let x = 0; x < pixels.width; x += 1) {
            const index = (y * pixels.width + x) * 4;
            if (!pixels.data[index + 3]) continue;
            uiPutRgb(image.data, image.width, x + output.rectangle.x,
              y + output.rectangle.y, pixels.data.subarray(index, index + 3));
            (image.interfacePixels ||= new Uint8Array(image.width * image.height))[
              (y + output.rectangle.y) * image.width + x + output.rectangle.x] = 1;
          }
        }
        if (output.surface.componentTrace) uiTraceCopy(image, output.surface,
          {...output.rectangle, source_x: 0, source_y: 0, preserve_unpainted: layer.kind === 'text_slot'});
      } else if (layer.kind === "layout") {
        const layout = uiLayoutRecord(layer.record);
        if (layout) {
          if (layer.dialogue_backdrop && !preview.glyph_cache_replay)
            uiPaintDialogueBackdrop(image, layout, Number(layer.shift || 0));
          if (!layer.preserve_glyph_cache_tiles) for (const [position, tile] of layout.render?.logical_tile_writes || [])
            writeTile(position + Number(layer.shift || 0), tile);
          if (!preview.glyph_cache_replay) uiPaintLayoutWrites(
            image, layout, patterns, corePatterns, Number(layer.shift || 0),
            layerProfiles,
            layer.palette_sets || preview.background_palettes || null,
            layer.default_attribute ?? preview.default_attribute ?? 0, layer.logical_attributes,
            layer.preserve_glyph_cache_tiles ? fieldCache?.tiles : null
          );
        }
      } else if (layer.kind === "script") {
        const scriptImage = !preview.glyph_cache_replay && (layer.text_transfer_regions || layer.glyph_cache_only)
          ? {width: image.width, height: image.height, data: new Uint8ClampedArray(image.data)} : image;
        if (scriptImage !== image) uiComponentTrace(scriptImage, image.componentTrace);
        selectionBounds = uiMergeSelectionBounds(
          selectionBounds,
          uiPaintInterfaceScript(
            scriptImage, layer.glyph_cache ? {...layer, glyph_cache: {...layer.glyph_cache,
              initial_tile: preview.runtime_context?.[layer.glyph_cache.initial_tile_field]
                ?? layer.glyph_cache.initial_tile}}
              : layer, model, patterns, corePatterns, glyphData, records,
            layerProfiles, preview.selection,
            preview.inline_confirm_cursor ? textCursor => {
              const binding = preview.inline_confirm_cursor;
              const point = selectionCursorCoordinates(binding.document, preview.selection_cursor,
                preview.runtime_context?.choice_index ?? 0, {textCursor, codeValues: binding.codeValues,
                  hidden: preview.runtime_context?.cursor_hidden === true});
              if (point) uiTraceMetasprite(image, {...binding.sprite,
                anchor_x: point.x, anchor_y: point.y},
                uiPatternProfiles(preview, profilePatterns, binding.sprite), preview);
            } : null, glyphCaches,
          ),
        );
        for (const region of preview.glyph_cache_replay ? [] : layer.text_transfer_regions || []) {
          if (fieldCache) {
            const references = fieldCache.references.get(image) || new Map();
            fieldCache.references.set(image, references);
            for (let y = 0; y < region.height; y += 8) {
              for (let x = 0; x < region.width; x += 8) {
                const source = (region.source_y + y) / 8 * 32 + (region.source_x + x) / 8;
                const target = (region.y + y) / 8 * 32 + (region.x + x) / 8;
                const reference = fieldCache.references.get(scriptImage)?.get(source);
                if (reference) references.set(target, reference);
                else references.delete(target);
              }
            }
          }
          for (let y = 0; y < region.height; y++) {
            for (let x = 0; x < region.width; x++) {
              const sx = region.source_x + x, sy = region.source_y + y;
              const dx = region.x + x, dy = region.y + y;
              if (Math.min(sx, sy, dx, dy) < 0 || Math.max(sx, dx) >= image.width
                  || Math.max(sy, dy) >= image.height) continue;
              const source = (sy * image.width + sx) * 4, target = (dy * image.width + dx) * 4;
              image.data.set(scriptImage.data.subarray(source, source + 4), target);
            }
          }
          uiTraceCopy(image, scriptImage, region);
          uiTransferSlots(image, scriptImage, region);
        }
      } else if (layer.kind === "vehicle_portrait") {
        const portraitLayer = uiVehiclePortraitLayer(layer, model);
        if (portraitLayer) {
          selectionBounds = uiMergeSelectionBounds(
            selectionBounds,
            uiPaintInterfaceScript(
              image, portraitLayer, model, patterns, corePatterns, glyphData,
              records,
              uiPatternProfiles(preview, profilePatterns, portraitLayer),
              preview.selection,
            ),
          );
        }
      } else if (layer.kind === "rom_tile_grid") {
        uiTracePixels(image, layer.record ? [{recordId: layer.record}] : [], target =>
          uiPaintRomTileGrid(target, layer, patterns, corePatterns, layerProfiles));
      } else if (layer.kind === "tile_writes") {
        for (const [position, tile] of layer.writes || []) writeTile(position, tile);
        if (preview.glyph_cache_replay) continue;
        uiTracePixels(image, layer.record ? [{recordId: layer.record}] : [], target => uiPaintTileWrites(
          target,
          {
            ...layer,
            palette_sets: layer.palette_sets || preview.background_palettes,
            default_attribute: layer.default_attribute
              ?? preview.default_attribute ?? 0,
          },
          patterns, corePatterns, layerProfiles
        ));
      } else if (layer.kind === 'cached_field_tiles') {
        if (!fieldCache) throw new TypeError('承接窗口缺少当前字形缓存构造');
        const palette = preview.background_palettes?.[preview.ui_palette_source?.palette_index];
        if (!palette) throw new TypeError('承接窗口缺少所属界面调色板');
        for (let y = layer.y; y < layer.y + layer.height; y++) {
          for (let x = layer.x; x < layer.x + layer.width; x++) {
            const position = y * 32 + x, tile = fieldCache.tiles[position & 0x3FF];
            const pixels = fieldCache.cells.get(position);
            if (pixels) {
              uiPaintGlyphCell(image, position, pixels, palette.map(value => nesPalette[value & 63]));
              const references = fieldCache.references.get(image) || new Map();
              references.set(position, {pixels, palette});
              fieldCache.references.set(image, references);
            } else uiPaintPattern(image.data, image.width, image.height, patterns, corePatterns,
              tile, x * 8, y * 8, layerProfiles, palette);
            uiTraceArea(image, {x: x * 8, y: y * 8, width: 8, height: 8}, [{recordId: layer.record}]);
          }
        }
      } else if (layer.kind === "tile_fill") {
        for (let y = 0; y < layer.height; y++)
          for (let x = 0; x < layer.width; x++) {
            const position = (layer.y + y) * 32 + layer.x + x;
            if (layer.glyph_cache_only && fieldCache) fieldCache.tiles[position & 0x3FF] = layer.tile;
            else writeTile(position, layer.tile);
          }
        if (preview.glyph_cache_replay || layer.glyph_cache_only) continue;
        uiTracePixels(image, layer.record ? [{recordId: layer.record}] : [], target => uiPaintTileFill(
          target,

          {
            ...layer,
            palette_sets: layer.palette_sets || preview.background_palettes,
            default_attribute: layer.default_attribute
              ?? preview.default_attribute ?? 0,
          },
          patterns, corePatterns, layerProfiles
        ));
      } else if (layer.kind === "rom_nametable") {
        if (fieldCache) fieldCache.tiles.set(uiHexBytes(layer.raw_hex));
        uiTracePixels(image, layer.record ? [{recordId: layer.record}] : [], target => uiPaintRomNametable(
          target, layer, patterns, corePatterns, layerProfiles,
          (layer.pattern_row_profiles || []).map(segment => ({
            first_row: Number(segment.first_row),
            last_row: Number(segment.last_row),
            profiles: uiPatternProfiles(preview, profilePatterns, segment),
          }))
        ));
      } else if (layer.kind === 'vehicle_status_parts') {
        const paintParts = () => uiTracePixels(image,
          [{recordId: 'ui-vehicle-status:portrait-parts'}], target =>
            vehiclePortraitImage({kind: 'status', raster: target, parts: layer.parts,
              statusDocument: layer.document, partArt: layer.art}));
        if (fieldCache) overlays.push(paintParts);
        else paintParts();
      } else if (
        layer.kind === "generic_metasprite"
        || layer.kind === "battle_object"
        || layer.kind === "rom_oam"
      ) {
        if (fieldCache) overlays.push(() => uiTraceMetasprite(image, layer, layerProfiles, preview));
        else uiTraceMetasprite(image, layer, layerProfiles, preview);

      }
    }
    if (preview.glyph_cache_replay) return null;
    if (fieldCache) {
      for (const [position, reference] of fieldCache.references.get(image) || []) {
        uiPaintGlyphCell(image, position, reference.pixels,
          reference.palette.map(value => nesPalette[value & 63]));
      }
      for (const overlay of overlays) overlay();
    }
    paintSelectionOutline(image);
    context.putImageData(image, 0, 0);
  }
  if (finalImage && Object.hasOwn(preview, 'interface_preview_background')) {
    const background = preview.interface_preview_background;
    canvas.uiInterfacePixelMask = finalImage.interfacePixels || new Uint8Array(finalImage.width * finalImage.height);
    if (preview.interface_preview_fullscreen) canvas.uiInterfacePixelMask.fill(1);
    for (let index = 0; index < canvas.uiInterfacePixelMask.length; index++) {
      if (canvas.uiInterfacePixelMask[index]) continue;
      const offset = index * 4;
      if (background) finalImage.data.set(background.data.subarray(offset, offset + 4), offset);
    }
    surface.getContext('2d').putImageData(new ImageData(finalImage.data, finalImage.width, finalImage.height), 0, 0);
    if (canvas.dataset) canvas.dataset.interfacePreviewRandomActors = JSON.stringify(background?.randomActors || []);
  }
  if (viewport) {
    const x = Number(viewport.x || 0);
    const y = Number(viewport.y || 0);
    const width = Number(viewport.width || 256);
    const height = Number(viewport.height || 240);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.drawImage(
      surface, x, y, width, height, 0, 0, width, height
    );
    if (selectionBounds) {
      const left = Math.max(selectionBounds.x, x);
      const top = Math.max(selectionBounds.y, y);
      const right = Math.min(selectionBounds.x + selectionBounds.width, x + width);
      const bottom = Math.min(selectionBounds.y + selectionBounds.height, y + height);
      selectionBounds = right > left && bottom > top ? {
        x: left - x,
        y: top - y,
        width: right - left,
        height: bottom - top,
      } : null;
    }
  }
  if (canvas.dataset) {
    canvas.dataset.uiTextSlotStates = [...slotOutputs.values()].map(item =>
      item.status === "complete" && item.placeholders?.length
        ? "structure-complete" : item.status).join(",");
    if (selectionBounds) {
      canvas.dataset.uiSelectionBounds = JSON.stringify(selectionBounds);
    } else {
      delete canvas.dataset.uiSelectionBounds;
    }
  }
  const pending = [...slotOutputs].find(([, output]) => output.status === "waiting")
    || [...slotOutputs].find(([, output]) => output.status === "blocked")
    || [...slotOutputs].find(([, output]) => output.placeholders?.length);
  const gaps = preview.facility_preview_gaps || [];
  if (canvas.dataset) canvas.dataset.facilityPreviewGaps = JSON.stringify(gaps);
  const callLayer = preview.layers?.find(layer => layer.record_call_progress
    && layer.record_call_progress.status !== 'complete');
  const callOutput = callLayer && {...callLayer.record_call_progress,
    confirm: callLayer.record_call_progress.status === 'waiting' ? () => {
      callLayer.confirmed_waits += 1;
    } : null};
  uiBindTextSlotConfirmation(canvas, gaps.length ? {
    ...pending?.[1], status: "blocked",
    reason: [...new Set([...gaps.map(gap => gap.reason), pending?.[1]?.reason].filter(Boolean))].join("；"),
  } : callOutput || pending?.[1], next => {
    if (!callOutput) slotOutputs.set(pending[0], next);
    uiPaintMenuPreviewCanvas(canvas, preview, patterns, corePatterns, glyphData,
      model, records, profilePatterns, slotOutputs, undefined, componentViewport);
  });
  canvas.uiDrawnComponents = finalImage ? uiDrawnComponents(finalImage, viewport) : [];
  if (finalImage) {
    const area = viewport || {x: 0, y: 0, width: finalImage.width, height: finalImage.height};
    const pixels = new Uint8Array(canvas.width * canvas.height);
    const trace = finalImage.componentTrace;
    const traced = new Uint32Array(pixels.length);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const source = (y + area.y) * finalImage.width + x + area.x, target = y * canvas.width + x;
      pixels[target] = finalImage.interfacePixels?.[source] || 0;
      traced[target] = trace?.pixels[source] || 0;
    }
    canvas.interfacePixels = canvas.uiInterfacePixelMask = pixels;
    if (trace) canvas.componentTrace = {...trace, pixels: traced};
  }
  canvas.uiResolvedPreview = {...preview, viewport};
  canvas.uiComponentSlots = [...(preview.component_slots || []), ...(finalImage?.interfaceSlots || [])];
  for (const slot of canvas.uiComponentSlots) {
    if (!slot.source) continue;
    const next = canvas.uiComponentSlots.filter(other => other.sourceRecord === slot.sourceRecord
      && other.bounds.y === slot.bounds.y && other.bounds.x > slot.bounds.x)
      .sort((a, b) => a.bounds.x - b.bounds.x)[0];
    slot.bounds.width = Math.min(slot.bounds.width, (next?.bounds.x ?? 248) - slot.bounds.x);
  }
  canvas.dispatchEvent?.(new CustomEvent('ui-preview-painted', {detail: canvas.uiDrawnComponents}));
  return selectionBounds;
}

/** Give a consumer the current composed UI image and its selected semantic area. */
export async function paintUiConstructionSemanticPreview(
  canvas, preview, {isCurrent = () => true, readCodeField, componentViewport = null, backgroundCanvas = canvas,
    textDocument = state.project?.text_record_edits} = {},
) {
  if (!canvas || !preview || !isCurrent()) return null;
  try {
    const project = state.project;
    const repository = state.projectRepository;
    const {model, patterns, corePatterns, glyphs, profilePatterns} =
      await uiJsRenderSources();
    let records = await uiMenuRecordSources(model);
    const published = await uiResolvePublishedPreviewLayers(preview, profilePatterns, {readCodeField});
    const resolved = await uiResolveLaserPreviewLayers(published.draft, published.profilePatterns, repository, {readCodeField});
    resolved.draft = await uiResolveInterfaceBackground(resolved.draft, canvas, backgroundCanvas);
    records = await uiRecordsForDraft(model, records, resolved.draft);
    records = effectiveTextRecordSources(records, textDocument);
    if (!isCurrent()) return null;
    if (project !== state.project || repository !== state.projectRepository) {
      throw stalePreviewRequest("UI 预览数据在读取期间已更新");
    }
    const selectionBounds = uiPaintMenuPreviewCanvas(
      canvas, resolved.draft, patterns, corePatterns, glyphs, model, records,
      resolved.profilePatterns, undefined, undefined, componentViewport,
    );
    return {surface: canvas, selectionBounds, gaps: resolved.draft.facility_preview_gaps || [],
      components: canvas.uiDrawnComponents, slots: canvas.uiComponentSlots,
      windowResolution: resolved.draft.facility_window_resolution};
  } catch (error) {
    if (!isCurrent()) return null;
    throw error;
  }
}

export function uiConstructionPreviewRegion(surface, viewport) {
  const image = surface.getContext('2d').getImageData(0, 0, surface.width, surface.height);
  image.componentTrace = surface.componentTrace;
  return {components: uiDrawnComponents(image, viewport), slots: surface.uiComponentSlots || [],
    preview: {...surface.uiResolvedPreview, viewport}};
}

async function uiResolveInterfaceBackground(draft, canvas, backgroundCanvas = canvas) {
  if (!draft) return draft;
  const host = backgroundCanvas.closest?.('[data-screen-workbench]')?.querySelector('[data-interface-preview-scene]');
  const errorHost = host?.querySelector('[data-interface-preview-scene-error]');
  let image = null;
  try {
    if (host) image = await interfacePreviewSceneImage(draft.interface_preview_state || null);
    if (errorHost) {
      errorHost.textContent = image?.randomActors.length ? '随机角色位置不固定' : '';
      errorHost.hidden = !errorHost.textContent;
    }
    if (canvas.dataset) delete canvas.dataset.interfacePreviewSceneError;
  } catch (error) {
    if (canvas.dataset) canvas.dataset.interfacePreviewSceneError = error.message;
    if (errorHost) {errorHost.textContent = error.message; errorHost.hidden = false;}
  }
  return {...draft, layers: (draft.layers || []).filter(layer => !layer.interface_background), interface_preview_background: image};
}

// 公共等待标记与对话正文引用同一组文本运行时字段。
export async function paintUiDialogueWaitMarker(canvas, {frameCounter = 0, isCurrent = () => true} = {}) {
  const runtime = await db.getResourceDocument('text-render-runtime', null);
  const marker = runtime?.wait_marker;
  if (!marker) throw new TypeError('对话等待标记来源未发布');
  const read = async source => (await db.getField(source.resource_id, source.entity_handle, source.field)).value;
  const [mask, visible, hidden] = await Promise.all([
    read(marker.frame_mask_source), read(marker.visible_tile_source), read(marker.hidden_tile_source)]);
  const surface = document.createElement('canvas');
  const output = await paintUiConstructionSemanticPreview(surface, {
    id: 'common-interface-wait-marker',
    ui_palette_source: marker.ui_palette_source,
    layers: [{kind: 'tile_writes', writes: [[14 * 32 + 15, frameCounter & mask ? hidden : visible]]}],
  }, {isCurrent, componentViewport: {x: 104, y: 96, width: 48, height: 48}});
  if (!output || !isCurrent()) return null;
  if (canvas.width !== surface.width) canvas.width = surface.width;
  if (canvas.height !== surface.height) canvas.height = surface.height;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(surface, 0, 0);
  return {...output, surface: canvas};
}

// 各功能页把某条已登记预览直接嵌进自己的分页：`data-ui-menu-preview` 写预览
// ID（dispatch/index.json 的 previews），画法与 UI 页完全相同，不另起一套。
function uiMenuPreviewById(model, previewId) {
  return (model.menu_dispatch_data?.previews || [])
    .find(item => item.id === previewId) || null;
}

async function uiRecordsForDraft(model, records, draft) {
  const extraRegions = new Set();
  for (const layer of draft?.layers || []) {
    for (const record of [layer.record, layer.prefix_record, layer.continuation_prefix_record, layer.choice_record,
      ...(layer.inline_confirm ? [layer.inline_confirm_record] : []),
      ...uiLayerTextRecordIds(layer)]) {
      const region = String(record || "").split(":")[1];
      if (region && !records.has(record)) extraRegions.add(region);
    }
  }
  if (!extraRegions.size) return records;
  const extra = await uiRecordSourcesByRegions(model, extraRegions);
  return new Map([...records, ...extra]);
}

async function uiResolvePublishedPreviewLayers(draft, profilePatterns, {readCodeField, glyphReplay = false} = {}) {
  draft = await resolveServiceConditionPreview(draft, {readCodeField});
  draft = {...draft, component_slots: [], preview_item_slots: {},
    layers: (draft.layers || []).map(layer => interfaceItemSlotProviders(
      glyphReplay && layer.glyph_cache_inline_state_during_replay
        ? {...layer, glyph_cache_inline_state: true} : layer))};
  const shopResolved = ['goods-list', 'goods-confirm', 'goods-actor-select'].includes(draft.shop_menu?.mode);
  if (shopResolved) draft = await resolveShopMenuPreview(draft, {readCodeField});
  const entry = draft.glyph_cache_entry;
  if (entry && !glyphReplay) {
    const fields = new Map(), stages = new Map();
    const read = readCodeField || (source => db.getField(source.resource_id, source.entity_handle, source.field));
    readCodeField = source => {
      const key = `${source.resource_id}:${source.entity_handle}:${source.field}`;
      if (!fields.has(key)) fields.set(key, read(source));
      return fields.get(key);
    };
    const history = [];
    for (const call of fieldGlyphEntryCalls(entry, draft.runtime_context?.glyph_entry_path)) {
      const key = JSON.stringify(call);
      if (stages.has(key)) {history.push(stages.get(key)); continue;}
      const source = uiConstructionModel().menu_dispatch_data.previews.find(row => call.preview_id
        ? row.id === call.preview_id : row.interface_state === call.interface_state);
      if (!source) throw new TypeError(`字形缓存路径缺少菜单构造 ${call.preview_id}`);
      let stage = {...structuredClone(source), glyph_cache_source: 'field-pools', glyph_cache_replay: true,
        runtime_context: {...source.runtime_context,
          ...(draft.service_preview_state ? draft.runtime_context : {}),
          save_slot: draft.runtime_context?.save_slot ?? 1,
          ...(source.shop_menu ? {shop_instance: draft.runtime_context?.shop_instance ?? 0,
            shop_item_index: draft.runtime_context?.shop_item_index ?? 0} : {})}};
      delete stage.selection_cursor;
      if (draft.field_overview && stage.menu_highlight?.preset === 'parent-menu')
        delete stage.runtime_context.parent_choice_index;
      if (stage.shop_menu?.sale_item_bar) stage.shop_menu = {...stage.shop_menu,
        sale_item_bar: draft.shop_menu?.sale_item_bar || stage.shop_menu.sale_item_bar, sale_item_optional: true};
      if (call.sale_item_bar !== undefined) {
        if (!stage.shop_menu?.sale_item_bar || !['equipment', 'inventory'].includes(call.sale_item_bar))
          throw new TypeError('保管处字形阶段缺少已确认的携带栏');
        stage.shop_menu = {...stage.shop_menu, sale_item_bar: call.sale_item_bar};
      }
      if (call.shop_welcome_slot !== undefined) {
        if (!stage.shop_menu || !Number.isInteger(call.shop_welcome_slot) || call.shop_welcome_slot < 0)
          throw new TypeError('商店字形缓存阶段缺少应用命令记录槽');
        stage.shop_menu = {...stage.shop_menu, mode: 'reception', welcome_slot: call.shop_welcome_slot};
        stage.layers = stage.layers.filter(layer => layer.shop_welcome || layer.dialogue_prefix);
      }
      if (call.category_only) {
        stage.layers = stage.layers.filter(layer => layer.category_transfer || (call.parent_reset
          && ['layout', 'window_clear'].includes(layer.kind))).map(layer => layer.category_transfer
          ? {...layer, record: `record:08:${String(9 + call.category_index).padStart(3, '0')}`} : layer);
        stage.field_overview = {kind: 'vehicle-grid'};
      }
      stage = inheritServicePreviewState(stage, draft);
      const resolved = await uiResolvePublishedPreviewLayers(stage, profilePatterns, {readCodeField, glyphReplay: true});
      stages.set(key, resolved.draft);
      history.push(resolved.draft);
    }
    draft = {...draft, glyph_cache_source: 'field-pools', glyph_cache_history: history};
  }
  if (!shopResolved) draft = await resolveShopMenuPreview(draft, {readCodeField});
  draft = await resolveServiceResponsePreview(draft, {readCodeField});
  if ((['goods-confirm', 'goods-actor-select', 'goods-vehicle-select', 'inn-dialogue', 'service-actor-select', 'service-dialogue', 'service-character-select', 'decoration-list', 'decoration-dialogue'].includes(draft.shop_menu?.mode)
      || draft.shop_menu?.retained_character_window || draft.shop_menu?.retained_vehicle_window || draft.shop_menu?.retained_storage_window) && !glyphReplay) {
    const source = uiConstructionModel().menu_dispatch_data.previews.find(row =>
      row.id === draft.shop_menu.retained_preview_id);
    const expected = draft.shop_menu.mode === 'inn-dialogue' ? 'inn-list'
      : draft.shop_menu.mode === 'decoration-list' ? 'reception'
      : draft.shop_menu.mode === 'decoration-dialogue' ? 'decoration-list'
      : draft.shop_menu.mode === 'service-dialogue' ? 'service-actor-select'
      : draft.shop_menu.mode === 'service-actor-select' ? 'service-list' : 'goods-list';
    const characterMenu = draft.shop_menu.mode === 'service-character-select';
    const characterWindow = draft.shop_menu.retained_character_window;
    const vehicleWindow = draft.shop_menu.retained_vehicle_window;
    const storageWindow = draft.shop_menu.retained_storage_window;
    const retainedModes = expected === 'goods-list' ? ['goods-list', 'herbal-goods'] : [expected];
    if (storageWindow ? !(source?.facility_screen?.kind === 'storage-withdraw' || source?.shop_menu?.retained_storage_window)
      || source.shop_menu.resource_id !== draft.shop_menu.resource_id
      : vehicleWindow ? source?.shop_menu?.mode !== 'service-vehicle-select'
      || source.shop_menu.resource_id !== draft.shop_menu.resource_id
      : characterWindow ? source?.shop_menu?.mode !== 'service-character-select'
      || source.shop_menu.resource_id !== draft.shop_menu.resource_id
      : characterMenu ? !source?.shop_menu?.prompt_handle
      || source.shop_menu.resource_id !== draft.shop_menu.resource_id
      : !retainedModes.includes(source?.shop_menu?.mode)) throw new TypeError('设施对话缺少已发布的承接窗口构造');
    const retained = document.createElement('canvas');
    const previous = inheritServicePreviewState({...structuredClone(source), runtime_context: {...source.runtime_context, ...draft.runtime_context}}, draft);
    if (storageWindow && draft.shop_menu.mode !== 'reception') previous.runtime_context.cursor_hidden = true;
    if (draft.shop_menu.mode === 'decoration-list') {
      previous.runtime_context.confirmed_waits = source.runtime_context?.confirmed_waits;
      previous.runtime_context.cursor_hidden = true;
      if (previous.menu_highlight) previous.menu_highlight.show_cursor = false;
    }
    if (storageWindow || characterWindow || vehicleWindow || ['goods-confirm', 'goods-actor-select', 'goods-vehicle-select', 'service-actor-select', 'service-character-select'].includes(draft.shop_menu.mode)) {
      delete previous.selection_cursor;
      delete previous.selection_cursors;
    }
    await paintUiConstructionSemanticPreview(retained, previous, {readCodeField});
    draft = {...draft, layers: [{kind: 'prepared_interface_window', output: {surface: retained,
      rectangle: {x: 0, y: 0, width: 256, height: 240}}}, ...draft.layers.filter(layer =>
        layer.kind !== 'prepared_interface_window')]};
  }
  draft = await resolveSatelliteMapPreview(draft);
  draft = await resolveFieldPartySummaryPreview(draft, {readCodeField});
  draft = await resolveFacilityScreenPreview(draft, {readCodeField});
  draft = await resolveInterfaceValuePreview(draft, {readCodeField});
  draft = {...draft, layers: draft.layers.map(layer => {
    const resolved = interfaceItemSlotProviders(layer);
    const sequence = row => {
      const values = interfacePreviewItemValue(draft, row.source, row.values ?? uiDataPathValue(row.source));
      if (!Array.isArray(values)) return row;
      row.providers?.forEach((provider, index) => {
        const id = resolved.component_slot_providers?.[provider]?.id;
        if (id) registerInterfacePreviewItem(draft, id, row.source,
          Number(values[index]?.[row.record_id_field] ?? values[index] ?? 0), index);
      });
      return {...row, values};
    };
    return {...resolved,
      ...(layer.provider_record_sequence ? {provider_record_sequence: sequence(layer.provider_record_sequence)} : {}),
      ...(layer.provider_record_sequences ? {provider_record_sequences: layer.provider_record_sequences.map(sequence)} : {})};
  })};
  draft = await resolveBattleResultScreenPreview(draft);
  draft = await resolveInvestigationFeedbackPreview(draft);
  draft = await resolveFieldSubmenuPreview(draft, {readCodeField});
  if (draft.layers?.some(layer => layer.provider_context_codes || layer.sprite_context_offset)) {
    draft = {...draft, layers: draft.layers.map(layer => {
      let resolved = {...layer};
      for (const [provider, context] of Object.entries(layer.provider_context_codes || {})) {
        const codes = draft.runtime_context?.[context];
        if (!Array.isArray(codes) || codes.some(code => !Number.isInteger(code) || code < 0 || code > 255))
          throw new TypeError('运行时文字上下文缺少有效字节');
        const terminator = layer.provider_script_hex[provider].trim().split(/\s+/).at(-1);
        resolved.provider_script_hex = {...resolved.provider_script_hex,
          [provider]: [...codes.map(code => code.toString(16).padStart(2, '0')), terminator].join(' ')};
      }
      if (layer.sprite_context_offset) {
        const {context, x_stride = 0, y_stride = 0} = layer.sprite_context_offset;
        const index = draft.runtime_context?.[context];
        if (!Number.isInteger(index)) throw new TypeError('运行时精灵位移上下文缺少有效序号');
        resolved.sprites = layer.sprites.map(sprite => ({...sprite,
          x: sprite.x + index * x_stride, y: sprite.y + index * y_stride}));
      }
      return resolved;
    })};
  }
  draft = await resolveFieldOverviewPreview(draft, {readCodeField});
  if (draft?.layers?.some(layer => layer.kind === 'interface_battle_actor')) {
    const layers = [];
    for (const layer of draft.layers) {
      if (layer.kind !== 'interface_battle_actor') {layers.push(layer); continue;}
      if (!layer.actor) continue;
      if (layer.command) layers.push({kind: 'prepared_interface_window',
        output: await prepareUiBattleCommandWindow(layer.actor.name, state.project, draft.battle_menu_calls,
          layer.actor.name_script_hex, layer.actor.vehicle || layer.actor.label === 'SP')});
      if (layer.status !== false) layers.push({kind: 'prepared_interface_window',
        output: await prepareUiBattleStatusSlot(layer.actor)});
    }
    draft = {...draft, layers};
  }
  if (draft?.layers?.some(layer => layer.kind === 'generic_metasprite'
      && layer.object_id !== undefined && !layer.sprites)) {
    const layers = await Promise.all(draft.layers.map(async layer => {
      if (layer.kind !== 'generic_metasprite' || layer.object_id === undefined || layer.sprites) return layer;
      const object = await genericMetaspriteObject(Number(layer.object_id));
      return {...layer, sprites: object.sprites};
    }));
    draft = {...draft, layers};
  }
  for (const sourceBinding of [...(draft?.selection_cursors || []),
    ...(draft?.selection_cursor ? [draft.selection_cursor] : [])]) {
    let binding = sourceBinding;
    if (draft.overview_category && binding.selector === 0x90) {
      const values = await fieldSubmenuCodeValues(['category-selection-layout', 'category-selection-domain'], readCodeField);
      if ((draft.runtime_context?.choice_index ?? 0) >= fieldSubmenuCodeValue(values, 'category-selection-domain'))
        throw new TypeError('一览选择序号超出代码字段的选择域');
      binding = {...binding, selector: fieldSubmenuCodeValue(values, 'category-selection-layout')};
    }
    const layout = await db.getResourceDocument(binding.resource_id, null);
    const cursorValues = await fieldSubmenuCodeValues(['selection-cursor-object-id'], readCodeField);
    const cursor = await genericMetaspriteObject(Number(binding.object_id ??
      fieldSubmenuCodeValue(cursorValues, 'selection-cursor-object-id')));
    if (!cursor?.sprites?.length) throw new TypeError('选择光标缺少组合精灵');
    const sprite = {kind: 'generic_metasprite', oam_y_bias: 1, component_source: 'selection-cursor',
      pattern_profiles: ['sprite-chr:27-40-7F'], sprites: cursor.sprites};
    const point = binding.kind === 'inline-text-confirm' ? null : selectionCursorCoordinates(layout, binding,
      binding.choice_index ?? draft.runtime_context?.choice_index ?? 0,
      {hidden: draft.runtime_context?.cursor_hidden === true,
        textCursor: draft.runtime_context?.text_cursor});
    if (binding.kind === 'inline-text-confirm') {
      const codeValues = await fieldSubmenuCodeValues(['confirm-cursor-x-bias', 'confirm-cursor-y-bias',
        'confirm-choice-x-spacing', 'confirm-text-region', 'confirm-text-record'], readCodeField);
      const record = `record:${fieldSubmenuCodeValue(codeValues, 'confirm-text-region').toString(16).toUpperCase().padStart(2, '0')}:${String(fieldSubmenuCodeValue(codeValues, 'confirm-text-record')).padStart(3, '0')}`;
      draft = {...draft, layers: draft.layers.map(layer => layer.inline_confirm
        ? {...layer, inline_confirm_record: record} : layer),
        inline_confirm_cursor: {document: layout, sprite, codeValues}};
    }
    else if (point) draft = {...draft, layers: [...draft.layers,
      {...sprite, anchor_x: point.x, anchor_y: point.y}]};
  }
  if (draft?.layers?.some(layer => layer.facility_parameter_bindings?.length)) {
    const bindings = draft.layers.flatMap(layer => layer.facility_parameter_bindings || []);
    const needsSave = bindings.some(binding => ["save-role", "save-vehicle", "save-container"].includes(binding.value_source?.field_object)
      || binding.value_source?.activation_flag_base !== undefined);
    const needsItems = bindings.some(binding => binding.value_source?.field_object === "item-entry"
      || ["current-item-name", "current-wanted-bounty", "current-equipment-name", "current-repair-cost", "current-party-repair-cost", "current-party-armor-cost",
        "current-engine-upgrade-price", "current-inn-cost", "current-chassis-capacity-cost",
        "current-chassis-weight-cost", "current-chassis-upgrade-deficit", "current-equipment-quantity",
        "current-equipment-quantity-cost", "current-ammunition-deficit", "current-ammunition-deficit-cost",
        "current-party-ammunition-cost", "current-vehicle-armor-deficit", "current-armor-input-cost",
        "current-ammunition-input-cost"].includes(binding.value_source?.operation));
    const needsOverlays = bindings.some(binding => ['current-ammunition-deficit',
      'current-ammunition-deficit-cost', 'current-party-ammunition-cost',
      'current-ammunition-input-cost'].includes(binding.value_source?.operation));
    const needsWanted = bindings.some(binding => binding.value_source?.field_object === "wanted-record");
    const codeNames = [...new Set(bindings.flatMap(binding => binding.value_source?.code_parameters || []))];
    const [items, save, wanted, codeValues, overlays, statusWords] = await Promise.all([
      needsItems ? db.getResourceDocument("item-entry", null) : null,
      needsSave ? ensureSaveCurrentFieldObjects(state) : null,
      needsWanted ? db.getResourceDocument("wanted-record", null) : null,
      facilityRuntimeCodeValues(codeNames, readCodeField),
      needsOverlays ? db.getResourceDocument('shared-indexed-byte-overlays', null) : null,
      bindings.some(binding => binding.value_source?.operation === 'school-reset-name-buffer')
        ? db.getResourceDocument('fixed-text-slot', null) : null,
    ]);
    const layers = [], gaps = [...(draft.facility_preview_gaps || [])];
    for (const layer of draft.layers) {
      if (!layer.facility_parameter_bindings?.length) {layers.push(layer); continue;}
      const resolved = resolveFacilityParameterBindings(layer.facility_parameter_bindings,
        {items, wanted, overlays, statusWords, saveFields: save ? servicePreviewFields(draft, save).all() : null, codeValues, invocation: {
          saveSlot: state.savePageSlot, ...layer.facility_parameter_context,
        }});
      const unavailable = resolved.filter(parameter => parameter.status !== "available");
      if (unavailable.length) {
        gaps.push(...unavailable.map(parameter => ({record: parameter.binding.record,
          token: parameter.binding.token, provider: parameter.binding.provider,
          record_relative_offset: parameter.binding.record_relative_offset,
          reason: parameter.reason})));
        if (draft.facility_window_context) draft = {...draft, facility_window_missing: [
          ...(draft.facility_window_missing || []),
          ...unavailable.map(parameter => parameter.reason),
        ]};
        continue;
      }
      const result = {...layer, provider_constants: {...layer.provider_constants},
        provider_script_hex: {...layer.provider_script_hex}};
      for (const parameter of resolved) {
        const binding = parameter.binding;
        if (binding.token === 0xE2) result.provider_constants[0xDF] = parameter.value;
        else if (binding.token === 0xE9) result.runtime_record_pair = parameter.value.node_id;
        else if (binding.token === 0xE8)
          result.provider_script_hex[7] = fixedRuntimeTextScriptHex(parameter.value);
        else if (binding.provider !== undefined) {
          if (Number.isSafeInteger(parameter.value)) result.provider_constants[binding.provider] = parameter.value;
          else result.provider_script_hex[binding.provider] = fixedRuntimeTextScriptHex(parameter.value);
        }
      }
      layers.push(result);
    }
    draft = {...draft, layers, facility_preview_gaps: gaps};
  }
  if (draft?.facility_palette_binding) {
    const binding = draft.facility_palette_binding;
    const [palettes, actors, codeValues] = await Promise.all([
      db.getResourceDocument(binding.background.field_object, null),
      db.getResourceDocument(binding.sprites.field_object, null),
      facilityRuntimeCodeValues(binding.ui_background.code_parameters || [], readCodeField),
    ]);
    const resolved = resolveFacilityInheritedPalette(binding, {palettes, actors, codeValues,
      invocation: {...draft.facility_palette_context}});
    const attributes = resolveFacilityWindowAttributes(draft.facility_window_context?.state
      ?? draft.facility_palette_context);
    const gaps = [...(draft.facility_preview_gaps || [])];
    if (attributes.status !== 'available') gaps.push({kind: 'window-palette', reason: attributes.reason});
    draft = {...draft, facility_palette_resolution: resolved,
      facility_preview_gaps: gaps,
      ...(resolved.background_palettes ? {background_palettes: resolved.background_palettes} : {}),
      ...(resolved.sprite_palettes ? {sprite_palettes: resolved.sprite_palettes} : {})};
    if (!resolved.background_palettes && resolved.ui_background) {
      const background = Array(4).fill(null);
      background[binding.ui_background.palette_index] = resolved.ui_background;
      draft = {...draft, background_palettes: background};
    }
    if (attributes.status === 'available') {
      const selected = new Set(attributes.attributes.flatMap(attribute => [0, 2, 4, 6]
        .map(shift => (attribute >> shift) & 3)));
      if ([...selected].every(index => draft.background_palettes?.[index]?.length === 4)) draft = {...draft,
        layers: draft.layers.map(layer => ['layout', 'script'].includes(layer.kind) ? {...layer,
          palette_sets: draft.background_palettes, logical_attributes: attributes.attributes} : layer)};
      else draft = {...draft, facility_preview_gaps: [...gaps,
        {kind: 'window-palette', reason: '窗口选色缺少所选属性对应的当前背景色表'}]};
    }
  }
  if (draft?.layers?.some(layer => layer.provider_save_items || layer.runtime_save_item)) {
    const fields = servicePreviewFields(draft, await ensureSaveCurrentFieldObjects(state));
    const layers = [];
    for (const layer of draft.layers) {
      const resolved = {...layer};
      if (layer.provider_save_items) {
        const binding = layer.provider_save_items;
        const values = binding.field_ids
          ? binding.field_ids.map(id => interfacePreviewItemValue(draft, id, fields.object(id).value))
          : interfacePreviewItemValue(draft, binding.field_id, fields.object(binding.field_id).value);
        const indices = [...values].map((_, index) => index)
          .filter(index => !binding.pack_nonzero || values[index]);
        const emptyIndices = binding.pack_nonzero
          ? [...values].map((_, index) => index).filter(index => !values[index]) : [];
        const items = indices.map(index => values[index]);
        resolved.provider_records = {...resolved.provider_records};
        resolved.records = [...(resolved.records || [])];
        for (const [index, provider] of binding.providers.entries()) {
          const sourceIndex = indices[index] ?? emptyIndices[index - indices.length] ?? index;
          const source = binding.field_ids?.[sourceIndex] || binding.field_id;
          const id = layer.component_slot_providers?.[provider]?.id;
          if (id && source) registerInterfacePreviewItem(draft, id, source, items[index] ?? 0,
            binding.field_ids ? null : sourceIndex);
          const itemId = items[index];
          if (!itemId) continue;
          const item = await db.get(`item:${Number(itemId).toString(16).toUpperCase().padStart(2, "0")}`, null);
          if (!item?.name_source) throw new TypeError(`物品 ${itemId} 缺少文字来源`);
          const recordId = `save-item-provider:${provider}`;
          resolved.records.push({id: recordId, raw_hex: fixedRuntimeTextScriptHex(item.name_source)});
          resolved.provider_records[provider] = recordId;
        }
      }
      if (layer.runtime_save_item) {
        const binding = layer.runtime_save_item;
        const value = binding.field_ids
          ? binding.field_ids.map(id => interfacePreviewItemValue(draft, id, fields.object(id).value))
          : interfacePreviewItemValue(draft, binding.field_id, fields.object(binding.field_id).value);
        const index = binding.index_context
          ? draft.runtime_context?.[binding.index_context] ?? binding.index : binding.index;
        const itemId = index === undefined ? value : value[index];
        const item = itemId ? await db.get(
          `item:${Number(itemId).toString(16).toUpperCase().padStart(2, "0")}`, null) : null;
        if (itemId && !item?.name_source) throw new TypeError("当前道具动作缺少所选物品的文字来源");
        const recordId = "save-selected-item";
        const raw = item ? fixedRuntimeTextScriptHex(item.name_source) : '9F';
        if (binding.string_provider !== undefined) resolved.provider_script_hex = {
          ...resolved.provider_script_hex, [binding.string_provider]: raw};
        else {
          resolved.records = [...(resolved.records || []), {id: recordId, raw_hex: raw}];
          resolved.runtime_record_pair = recordId;
        }
      }
      layers.push(resolved);
    }
    draft = {...draft, layers};
  }
  for (const [source, field] of [["sprite_palette_source", "sprite_palettes"],
    ["background_palette_source", "background_palettes"]]) {
    const binding = draft?.[source];
    if (!binding) continue;
    const document = await db.getResourceDocument(binding.resource_id, null);
    if (binding.records) {
      const entries = binding.records.map(handle => document?.records?.find(row => row.handle === handle));
      if (entries.length !== 4 || entries.some(row => row?.fields?.nontransparent_colors?.length !== 3))
        throw new TypeError("界面调色板记录缺失");
      draft = {...draft, [field]: entries.map(row => [15, ...row.fields.nontransparent_colors])};
    } else {
      const entries = document?.[binding.field];
      if (!Array.isArray(entries) || entries.length !== 4
          || entries.some(entry => !Array.isArray(entry.colors) || entry.colors.length !== 4))
        throw new TypeError("界面调色板缺少已发布的四色字段对象");
      draft = {...draft, [field]: entries.map(entry => entry.colors)};
    }
  }
  draft = await resolveFieldUiPalette(draft, {readCodeField});
  if (draft?.layers?.some(layer => layer.field_source)) {
    const layers = await Promise.all(draft.layers.map(async layer => {
      const binding = layer.field_source;
      if (!binding) return layer;
      const document = await db.getResourceDocument(binding.resource_id, null);
      const values = document?.blocks?.find(row => row.id === binding.block)?.[binding.field];
      const {start, length} = binding.slice || {};
      if (layer.kind !== "rom_tile_grid" || !Array.isArray(values)
          || !Number.isInteger(start) || !Number.isInteger(length)
          || start < 0 || length !== layer.length || start + length > values.length)
        throw new TypeError("界面图块网格缺少已发布的字段对象切片");
      return {...layer, raw_hex: values.slice(start, start + length)
        .map(value => value.toString(16).padStart(2, "0")).join(" ")};
    }));
    draft = {...draft, layers};
  }
  if (draft?.overview_category || draft?.field_overview?.kind === 'vehicle-grid') {
    const profiles = new Map(profilePatterns);
    if (draft.overview_category) {
      const codeValues = await fieldSubmenuCodeValues(['category-font-low-bank', 'category-font-high-bank'], readCodeField);
      const fontLow = await db.getField('chr-bank-mapping-service', 'chr-bank-mapping-service:preset:1', 'register_4');
      profiles.set('field-overview:font-low', {first_tile: 0x80, last_tile: 0xBF,
        patterns: await loadChrBankBytes(fontLow.value)});
      profiles.set('field-overview:font-high', {first_tile: 0xC0, last_tile: 0xFF,
        patterns: await loadChrBankBytes(fieldSubmenuCodeValue(codeValues, 'category-font-high-bank'))});
      profiles.set('field-overview:sprite', {first_tile: 0x40, last_tile: 0x7F,
        patterns: await loadChrBankBytes(fieldSubmenuCodeValue(codeValues, 'category-font-low-bank') + 1)});
    }
    for (const register of [4, 5]) {
      const cache = draft.field_overview?.kind === 'vehicle-grid' && draft.glyph_cache_source === 'field-pools'
        ? draft.layers.find(layer => layer.glyph_cache)?.glyph_cache.parameters : null;
      const bank = cache ? cache[register === 4 ? 'font_low_bank' : 'font_high_bank']
        : (await db.getField('chr-bank-mapping-service', 'chr-bank-mapping-service:preset:0', `register_${register}`)).value;
      profiles.set(`field-overview:footer-${register}`, {first_tile: register === 4 ? 0x80 : 0xC0,
        last_tile: register === 4 ? 0xBF : 0xFF, patterns: await loadChrBankBytes(bank)});
    }
    draft = {...draft, pattern_profiles: [...(draft.overview_category
      ? ['field-overview:font-low', 'field-overview:font-high']
      : ['field-overview:footer-4', 'field-overview:footer-5']), ...(draft.pattern_profiles || [])],
      layers: draft.layers.map(layer => layer.kind === 'generic_metasprite' && draft.overview_category
        ? {...layer, pattern_profiles: ['field-overview:sprite', ...(layer.pattern_profiles || [])]}
        : (draft.field_overview?.kind === 'vehicle-grid' ? layer.overview_role === 'footer'
          : ['frame', 'clear'].includes(layer.overview_role))
          ? {...layer, pattern_profiles: ['field-overview:footer-4', 'field-overview:footer-5', ...(layer.pattern_profiles || [])]}
          : layer)};
    profilePatterns = profiles;
  }
  if (draft.battle_menu_calls) {
    const profiles = new Map(profilePatterns);
    for (const [index, id] of draft.battle_menu_calls.pattern_profiles.entries()) profiles.set(id, {
      first_tile: index ? 0xC0 : 0x80, last_tile: index ? 0xFF : 0xBF,
      patterns: await loadChrBankBytes(Number.parseInt(id.split(':')[1], 16))});
    profilePatterns = profiles;
  }
  if (draft.layers.some(layer => layer.sprite_pattern_source)) {
    const profiles = new Map(profilePatterns);
    const read = readCodeField || (source => db.getField(source.resource_id, source.entity_handle, source.field));
    const layers = [];
    for (const layer of draft.layers) {
      if (!layer.sprite_pattern_source) {layers.push(layer); continue;}
      const profile = await sharedSpritePatternProfile(layer.sprite_pattern_source, read, loadChrBankBytes);
      profiles.set(profile.id, profile);
      layers.push({...layer, pattern_profiles: [profile.id, ...(layer.pattern_profiles || [])]});
    }
    draft = {...draft, layers};
    profilePatterns = profiles;
  }
  if (!draft?.layers?.some(layer => layer.equipment_slots)) return uiResolveFacilityWindowLayers(draft, profilePatterns);
  const profiles = new Map(profilePatterns);
  const layers = [];
  const equipmentSlotValues = [];
  for (const layer of draft.layers) {
    const binding = layer.equipment_slots;
    if (!binding) {layers.push(layer); continue;}
    const [rowDocument, columnDocument] = binding.coordinates ? [null, null] : await Promise.all([
      db.getResourceDocument(binding.rows.resource_id, null),
      db.getResourceDocument(binding.columns.resource_id, null),
    ]);
    const rows = binding.coordinates ? Array.from({length: 8}, (_, index) =>
      binding.coordinates.y + index * binding.coordinates.row_stride)
      : rowDocument?.blocks?.find(block => block.id === binding.rows.block)?.values;
    const columns = binding.coordinates ? [binding.coordinates.x]
      : columnDocument?.blocks?.find(block => block.id === binding.columns.block)?.values;
    const equipment = binding.values ?? binding.equipment ?? uiDataPathValue(binding.source);
    const flags = binding.flags ?? uiDataPathValue(binding.flags_source);
    if (!rows?.length || !columns?.length || !Array.isArray(equipment) || !flags)
      throw new TypeError("装备标记缺少已发布的行列、装备或装备位状态");
    equipmentSlotValues.push(...equipment.map((slot, index) => ({item_id: slot.item_id,
      marker_visible: Boolean(flags[`slot_${index}`] && slot.item_id)})));
    for (const [index, slot] of equipment.entries()) {
      if (!flags[`slot_${index}`] || !slot.item_id) continue;
      const y = rows[Math.floor(index / columns.length)];
      const x = columns[index % columns.length];
      if (!Number.isInteger(x) || !Number.isInteger(y))
        throw new TypeError(`装备位 ${index} 缺少行列位置`);
      if (binding.marker_objects) {
        const object = await genericMetaspriteObject(Number(binding.marker_objects[index]));
        layers.push({kind: "generic_metasprite", oam_y_bias: 1, sprites: object.sprites,
          object_id: binding.marker_objects[index], anchor_x: x, anchor_y: y,
          pattern_profiles: binding.pattern_profiles});
        continue;
      }
      const entry = await db.get(`item:${Number(slot.item_id).toString(16).toUpperCase().padStart(2, "0")}`, null);
      const icon = entry?.[binding.icon_field];
      const reference = icon?.tile_reference;
      if (reference?.resource_id !== "shared-chr-bank" || icon.item_id !== slot.item_id)
        throw new TypeError(`装备位 ${index} 缺少物品图标绑定`);
      const profileId = `equipment-icon:${reference.bank_id}`;
      if (!profiles.has(profileId)) profiles.set(profileId, {
        first_tile: 0, last_tile: 63, patterns: await loadChrBankBytes(reference.bank_id),
      });
      layers.push({kind: "generic_metasprite", oam_y_bias: 0,
        pattern_profiles: [profileId], palette_sets: [icon.sprite_palette],
        sprites: [{x, y, tile: reference.tile_id, attribute: 0}],
      });
    }
  }
  return uiResolveFacilityWindowLayers({...draft, layers, equipment_slot_values: equipmentSlotValues}, profiles);
}

async function uiResolveLaserPreviewLayers(draft, profilePatterns, repository, {readCodeField} = {}) {
  if (!draft?.layers?.some(layer => ["scene_tile_grid", "laser_cannon_layout"]
    .includes(layer.kind))) {
    return {draft, profilePatterns};
  }
  const resolvedProfiles = new Map(profilePatterns);
  const layers = [];
  let spriteProfile = null;
  const laserSpriteSource = async () => {
    if (!spriteProfile) {
      const source = {...fieldSubmenuCodeSource('laser-cannon-chr-bank'),
        first_tile: 0x40, last_tile: 0x7F};
      const read = readCodeField || (source => db.getField(source.resource_id, source.entity_handle, source.field));
      const profile = await sharedSpritePatternProfile(source, async reference => {
        const field = await read(reference);
        if (field?.value == null) throw new TypeError('激光炮预览缺少当前 CHR 图案来源');
        return field;
      }, loadChrBankBytes);
      spriteProfile = `laser-lens:sprite:${profile.bank}`;
      resolvedProfiles.set(spriteProfile, profile);
    }
    return spriteProfile;
  };
  const spritePalettes = [
    [0x0F, 0x36, 0x0F, 0x16], [0x0F, 0x36, 0x0F, 0x21],
    [0x0F, 0x37, 0x0F, 0x18], [0x0F, 0x36, 0x0F, 0x12],
  ];
  for (const layer of draft.layers) {
    if (layer.kind === "laser_lens_runtime") {
      for (let index = 0; index < 4; index++) draft.component_slots.push({
        id: `laser-lens:${index}`, label: `镜片 ${index + 1}`,
        bounds: {x: 0x58 + index * 16, y: 0x47, width: 8, height: 8}});
      const profile = await laserSpriteSource();
      layers.push({kind: "rom_oam", pattern_profiles: [profile],
        palette_sets: spritePalettes,
        sprites: (layer.slots || []).filter(index => Number.isInteger(index)
          && index >= 0 && index < 4).map(index => ({
            x: 0x58 + index * 16, y: 0x47, tile: 0x6C,
            attribute: layer.phase === "arrangement" ? 3 : 0,
          }))});
      continue;
    }
    if (layer.kind === "laser_choice_hand") {
      const profile = await laserSpriteSource();
      const baseX = 14 * 8 - 10, baseY = 23 * 8 + 3;
      layers.push({kind: "rom_oam", pattern_profiles: [profile],
        palette_sets: spritePalettes,
        sprites: [
          [-1, 0x64, -1], [-1, 0x65, 7],
          [7, 0x74, -1], [7, 0x75, 7],
        ].map(([dy, tile, dx]) => ({x: baseX + dx, y: baseY + dy,
          tile, attribute: 0}))});
      continue;
    }
    if (layer.kind === "laser_cannon_layout") {
      const profiles = [];
      const patternBank = layer.pattern_bank;
      if (!Number.isInteger(patternBank) || patternBank < 0 || patternBank > 255)
        throw new TypeError('激光炮构造缺少当前 CHR 图案来源');
      for (const [bank, first] of [[patternBank, 0x80], [patternBank + 1, 0xC0]]) {
        const id = `laser-lens:cannon:${bank}`;
        resolvedProfiles.set(id, {first_tile: first, last_tile: first + 0x3F,
          patterns: await loadChrBankBytes(bank)});
        profiles.push(id);
      }
      if (!layer.backdrop_record) throw new TypeError('激光炮构造缺少背景文字引用');
      layers.push({...layer, kind: "script", record: layer.backdrop_record,
        background_palette: draft.background_palettes?.[layer.palette_index ?? draft.ui_palette_source?.palette_index],
        pattern_profiles: profiles});
      layers.push({...layer, kind: "layout", record: layer.record,
        default_attribute: (layer.palette_index ?? draft.ui_palette_source?.palette_index ?? 3) * 0x55,
        pattern_profiles: profiles});
      continue;
    }
    if (layer.kind !== "scene_tile_grid") { layers.push(layer); continue; }
    const document_ = Number(state.scene?.id) === layer.scene_id
      && state.sceneDraftRepository === repository
      ? {scene: state.scene}
      : await db.getResourceDocument(`scene:${layer.scene_id.toString(16).toUpperCase().padStart(2, "0")}`, null);
    const scene = document_?.scene || document_;
    if (!Array.isArray(scene?.map) || !Array.isArray(scene?.metatile_definitions)
        || !Array.isArray(scene?.metatile_palette_ids)
        || !Array.isArray(scene?.render?.background_palette?.colors)) {
      throw new TypeError("激光炮排列预览缺少场景结构来源");
    }
    const bankIds = scene.render.mmc3_banks;
    if (!Array.isArray(bankIds) || bankIds.length !== 4) {
      throw new TypeError("激光炮服务预览缺少场景图案来源");
    }
    const profileIds = [];
    for (let index = 0; index < bankIds.length; index += 1) {
      if (bankIds[index] == null) continue;
      const id = `laser-lens:${layer.mode}:${index}`;
      resolvedProfiles.set(id, {
        first_tile: index * 0x40, last_tile: index * 0x40 + 0x3F,
        patterns: await loadChrBankBytes(bankIds[index]),
      });
      profileIds.push(id);
    }
    const writes = [];
    for (let y = 0; y < layer.rows; y += 1) {
      for (let x = 0; x < 32; x += 1) {
        const metatile = sceneMapCell(scene, layer.camera_x + Math.floor(x / 2),
          layer.camera_y + Math.floor(y / 2))?.metatileId;
        const tiles = scene.metatile_definitions[metatile];
        if (!Array.isArray(tiles) || tiles.length !== 4) {
          throw new TypeError("激光炮排列预览的场景图块不可用");
        }
        writes.push([y * 32 + x, tiles[(y % 2) * 2 + (x % 2)]]);
      }
    }
    const attribute_writes = [];
    for (let y = 0; y < Math.ceil(layer.rows / 4); y += 1) {
      for (let x = 0; x < 8; x += 1) {
        let attribute = 0;
        for (let quadrant = 0; quadrant < 4; quadrant += 1) {
          const metatile = sceneMapCell(scene, layer.camera_x + x * 2 + quadrant % 2,
            layer.camera_y + y * 2 + Math.floor(quadrant / 2))?.metatileId;
          const palette = scene.metatile_palette_ids[metatile];
          if (!Number.isInteger(palette)) {
            throw new TypeError("激光炮排列预览的场景配色不可用");
          }
          attribute |= palette << (quadrant * 2);
        }
        attribute_writes.push([0x3C0 + y * 8 + x, attribute]);
      }
    }
    const palette = scene.render.background_palette.colors;
    layers.push({kind: "tile_writes", writes, attribute_writes,
      palette_sets: Array.from({length: 4}, (_, index) =>
        palette.slice(index * 4, index * 4 + 4)),
      pattern_profiles: profileIds});
  }
  return {draft: {...draft, layers}, profilePatterns: resolvedProfiles};
}

async function uiResolveFacilityWindowLayers(draft, profilePatterns) {
  const unavailable = missing => ({draft: {...draft,
    facility_window_resolution: {status: 'unavailable', missing: [...new Set(missing)]},
    facility_preview_gaps: [...(draft.facility_preview_gaps || []),
      ...[...new Set(missing)].map(reason => ({kind: 'window-construction', reason}))]}, profilePatterns});
  if (draft.facility_window_missing?.length) return unavailable(draft.facility_window_missing);
  let componentSurface = null;
  if (draft.facility_window_context?.construct_body && !draft.facility_window_context.continuation) {
    const context = draft.facility_window_context;
    const frame = structuredClone(context.state || {});
    const logicalSurface = {tiles: frame.logical_tiles, patterns: frame.chr_ram,
      next_tile: frame.glyph_next_tile, missing: []};
    if (logicalSurface.tiles?.length !== 1024 || logicalSurface.patterns?.length !== 2048)
      return unavailable(['窗口正文缺少继承的逻辑缓冲区与字形缓存']);
    const windowSources = (await db.getDocument('project.ui.interfaces', null))?.application_window_sources;
    const {model, patterns, corePatterns, glyphs} = await uiJsRenderSources();
    let records = await uiMenuRecordSources(model);
    records = await uiRecordsForDraft(model, records, draft);
    records = effectiveTextRecordSources(records, state.project?.text_record_edits);
    const image = {width: 256, height: 240, data: new Uint8ClampedArray(256 * 240 * 4)};
    try { for (const layer of draft.layers) {
      if (layer.kind === 'layout') {
        const layout = uiLayoutRecord(layer.record);
        if (!layout) throw new TypeError('窗口缺少当前布局');
        for (const [offset, value] of layout.render.logical_tile_writes) {
          const position = (offset + Number(layer.shift || 0)) & 1023;
          logicalSurface.tiles[position] = value;
          uiTraceArea(image, {x: position % 32 * 8, y: Math.floor(position / 32) * 8,
            width: 8, height: 8}, [{recordId: layer.record}]);
        }
      } else if (layer.kind === 'script') {
        uiPaintInterfaceScript(image, {...layer, logical_surface: logicalSurface,
          glyph_cache: {...windowSources?.glyph_cache, initial_tile: logicalSurface.next_tile,
            palette: draft.background_palettes?.[3]}}, model, patterns, corePatterns, glyphs, records);
      }
    }
    } catch (error) { logicalSurface.missing.push(error.message); }
    if (logicalSurface.missing.length) return unavailable(logicalSurface.missing);
    frame.chr_ram = Array.from(logicalSurface.patterns);
    frame.glyph_next_tile = logicalSurface.next_tile;
    draft = {...draft, facility_window_context: {...context, state: frame}};
    componentSurface = image;
    componentSurface.glyphCells = logicalSurface.glyphCells;
  }
  draft = await resolveFacilityWindowPreview(draft);
  if (draft.facility_window_context && draft.facility_window_resolution?.status === 'available') {
    const context = draft.facility_window_context;
    const interfaces = await db.getDocument('project.ui.interfaces', null);
    const selectionLayout = await db.getResourceDocument('selection-layout', null);
    const selectionMovement = await db.getResourceDocument('code-module', null);
    const cursorObject = context.state.cursor_object_id
      ? await genericMetaspriteObject(context.state.cursor_object_id) : null;
    const maps = [0, 8].map(shift => {
      // 来源标签沿用窗口提交程序，像素只取原始提交结果。
      const input = structuredClone(context.state);
      input.nametables.fill(0);
      input.logical_tiles = input.logical_tiles.map((value, index) => index < 960 ? ((index + 1) >> shift) & 255 : value);
      return executeFacilityWindowConstruction(interfaces.application_window_sources, context.program, input, {
        ...facilityWindowFrameSchedule(interfaces.application_window_sources, context.events),
        selectionLayout, selectionMovement, cursorObject, windowOnly: true, frameCommitCatalog: interfaces.frame_commit_sources,
      });
    });
    if (maps.every(result => result.status === 'available')) {
      const tiles = maps[0].state.nametables.map((value, index) => value | maps[1].state.nametables[index] << 8);
      const textCells = new Map(tiles.flatMap((cell, position) => {
        const pixels = componentSurface?.glyphCells?.get(cell - 1);
        return pixels ? [[position, pixels]] : [];
      }));
      draft = {...draft, layers: draft.layers.map(layer => layer.kind === 'facility_window_frame'
        ? {...layer, component_surface: componentSurface, component_tiles: tiles, text_cells: textCells} : layer)};
    }
  }
  return draft.facility_window_resolution?.status === 'unavailable'
    ? unavailable(draft.facility_window_resolution.missing || ['窗口显示阶段未确认'])
    : {draft, profilePatterns};
}

/** Paint a canonical UI screen outside the UI workbench. */
export async function paintUiEditorPreviewCanvas(
  canvas,
  screenId,
  {resolvePreview} = {},
) {
  if (!canvas) return false;
  const project = state.project;
  const repository = state.projectRepository;
  const {
    model, patterns, corePatterns, glyphs, profilePatterns,
  } = await uiJsRenderSources();
  if (state.project !== project || state.projectRepository !== repository) {
    throw stalePreviewRequest("UI 预览资产在读取期间已更新");
  }
  let draft = uiEditorPreviewDraft(screenId);
  if (typeof resolvePreview === "function") {
    draft = resolvePreview(draft);
  }
  if (!draft) return false;
  const equipment = await uiResolvePublishedPreviewLayers(draft, profilePatterns);
  const resolved = await uiResolveLaserPreviewLayers(equipment.draft, equipment.profilePatterns, repository);
  draft = resolved.draft;
  let records = await uiMenuRecordSources(model);
  records = await uiRecordsForDraft(model, records, draft);
  records = effectiveTextRecordSources(records, state.project?.text_record_edits);
  if (state.project !== project || state.projectRepository !== repository) {
    throw stalePreviewRequest("UI 预览数据在读取期间已更新");
  }
  uiPaintMenuPreviewCanvas(
    canvas, draft, patterns, corePatterns, glyphs, model, records,
    resolved.profilePatterns,
  );
  canvas.dataset.uiPreviewPainted = screenId;
  delete canvas.dataset.uiPreviewError;
  return true;
}

export async function paintUiConstructionCanvases({
  resolveMenuPreview,
  resolveEditorPreview,
} = {}) {
  const project = state.project;
  const repository = state.projectRepository;
  const canvases = [...document.querySelectorAll(
    "[data-ui-editor-preview], [data-ui-menu-preview], [data-ui-dialogue-preview], [data-ui-vehicle-portrait], [data-ui-font-atlas], [data-ui-core-font-tile]"
  )];
  if (!canvases.length) return;
  try {
    const {
      model, patterns, corePatterns, glyphs, profilePatterns,
    } = await uiJsRenderSources();
    if (state.project !== project || state.projectRepository !== repository) return;
    const editorCanvases = canvases.filter(canvas =>
      canvas.matches("[data-ui-editor-preview]"));
    const menuCanvases = canvases.filter(canvas =>
      canvas.matches("[data-ui-menu-preview]"));
    const dialogueCanvases = canvases.filter(canvas =>
      canvas.matches("[data-ui-dialogue-preview]"));
    const portraitCanvases = canvases.filter(canvas =>
      canvas.matches("[data-ui-vehicle-portrait]"));
    let menuRecords = editorCanvases.length || menuCanvases.length
      || dialogueCanvases.length || portraitCanvases.length
      ? await uiMenuRecordSources(model) : new Map();
    if (state.project !== project || state.projectRepository !== repository) return;
    const drafts = [
      ...[...editorCanvases].map(canvas => {
        const id = canvas.dataset.uiEditorPreview;
        // 公共窗口和界面模板是合成条目，各走自己的骨架草稿。
        let draft = String(id).startsWith(UI_TEMPLATE_PREFIX)
          ? uiEditorTemplateDraft(id)
          : String(id).startsWith(COMMON_FRAME_PREFIX)
            ? uiEditorCommonFrameDraft(id)
            : uiEditorPreviewDraft(id);
        if (typeof resolveEditorPreview === "function") {
          draft = resolveEditorPreview(canvas, draft);
        }
        return [canvas, draft];
      }),
      ...[...menuCanvases].map(canvas => {
        const preview = uiMenuPreviewById(
          model, canvas.dataset.uiMenuPreview
        );
        return [
          canvas,
          typeof resolveMenuPreview === "function"
            ? resolveMenuPreview(canvas, preview) : preview,
        ];
      }),
    ];
    let resolvedProfiles = profilePatterns;
    for (const pair of drafts) {
      pair[1] = await pair[1];
      if (!pair[1]) continue;
      const equipment = await uiResolvePublishedPreviewLayers(pair[1], resolvedProfiles);
      const resolved = await uiResolveLaserPreviewLayers(equipment.draft, equipment.profilePatterns, repository);
      pair[1] = resolved.draft;
      pair[1] = await uiResolveInterfaceBackground(pair[1], pair[0]);
      resolvedProfiles = resolved.profilePatterns;
    }
    if (state.project !== project || state.projectRepository !== repository) return;
    // 结构预览引用的文本区不一定被 uiMenuRecordSources 收集（那份只覆盖
    // 已登记的 dispatch 预览）。按当前界面实际引用的区补加载，避免为了
    // 一个界面把 22 个区共 9.9 MB 全拉下来。
    // 模板槽位填的是该状态自有记录，它们挂在 provider_records 上而不是
    // layer.record，因此按图层引用的全部记录 ID 收集。
    const extraRegions = new Set();
    for (const [, draft] of drafts) {
      for (const layer of draft?.layers || []) {
        for (const record of [layer.record, ...uiLayerTextRecordIds(layer)]) {
          const region = String(record || "").split(":")[1];
          if (region && !menuRecords.has(record)) extraRegions.add(region);
        }
      }
    }
    for (const canvas of dialogueCanvases) {
      const record = canvas.dataset.uiDialoguePreview;
      const region = String(record || "").split(":")[1];
      if (region && !menuRecords.has(record)) extraRegions.add(region);
    }
    if (extraRegions.size) {
      const extra = await uiRecordSourcesByRegions(model, extraRegions);
      if (state.project !== project || state.projectRepository !== repository) return;
      menuRecords = new Map([...menuRecords, ...extra]);
    }
    menuRecords = effectiveTextRecordSources(
      menuRecords,
      state.project?.text_record_edits,
    );
    for (const [canvas, entry] of drafts) {
      if (entry && canvas.isConnected) {
        uiPaintMenuPreviewCanvas(
          canvas, entry, patterns, corePatterns, glyphs, model, menuRecords,
          resolvedProfiles
        );
      }
    }
    dialogueCanvases.forEach(canvas => {
      if (!canvas.isConnected || !canvas.dataset.uiDialoguePreview) return;
      uiPaintDialogueCanvas(
        canvas,
        canvas.dataset.uiDialoguePreview,
        Number(canvas.dataset.uiDialoguePage || 0),
        {model, patterns, corePatterns, glyphs},
        menuRecords,
        {fieldWindow: canvas.dataset.uiDialogueFieldWindow !== "false"},
      );
      canvas.dataset.uiDialoguePreviewPainted = canvas.dataset.uiDialoguePreview;
    });
    portraitCanvases.forEach(canvas => {
      if (!canvas.isConnected) return;
      uiPaintVehiclePortraitCanvas(
        canvas, Number(canvas.dataset.uiVehiclePortrait),
        patterns, corePatterns, glyphs, model, menuRecords, profilePatterns
      );
    });
    canvases.filter(canvas => canvas.isConnected && canvas.matches("[data-ui-font-atlas]")).forEach(canvas =>
      uiPaintFontAtlas(canvas, model, glyphs)
    );
    canvases.filter(canvas => canvas.isConnected && canvas.matches("[data-ui-core-font-tile]")).forEach(canvas =>
      uiPaintCoreFontTile(
        canvas, Number(canvas.dataset.uiCoreFontTile), patterns, corePatterns
      )
    );
  } catch (error) {
    if (error?.name === "AbortError") return;
    canvases.forEach(canvas => {
      if (!canvas.isConnected) return;
      const context = canvas.getContext("2d");
      canvas.width = 256;
      canvas.height = canvas.matches('[data-ui-editor-preview], [data-ui-menu-preview], [data-ui-dialogue-preview]')
        ? UI_PREVIEW_VIEWPORT.height : 96;
      context.fillStyle = "#080B0C";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#9A4358";
      context.font = "10px monospace";
      context.fillText(String(error.message || error), 8, 18);
    });
  }
}
