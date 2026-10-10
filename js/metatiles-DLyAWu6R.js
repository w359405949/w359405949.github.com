import { bindScreenWorkbenchZoom, screenWorkbenchCanvasStage, replaceHistoryUrl, navigateInternalUrl, pageHeaderTabs, pageHeaderControls, screenWorkbench, bindInternalPageLinks } from './element-tree-C1bWRgTl.js';
import { render } from './editor-renderer-n2nBwXk_.js';
import { editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { resetToOriginalButton, applyResetToOriginalStates, metatileBehaviorCode, metatileBehaviorOptions, metatileAttributeWithBehavior, metatileBehaviorLabel } from './battle-result-script-runtime-BSeJpUGH.js';
import { bindOwnerReferenceList, ownerReferenceListMarkup, withCurrentOwnerRecord, currentOwnerReferenceImpact } from './battle-result-state-machine-BbK2hSud.js';
import { db, terrainWhitelistSpecs, terrainWhitelistCodes, sceneMetatileAttributeRecords, sceneMapCell, trackAutoSavePreparation } from './prg-loaders-DnCSmXk9.js';
import { composeChrPatternTable, esc, nesPalette, paintChrTile, decodeChrTile, prepareModuleComponent, writeAccessMarker, setProjectField } from './interface-state-preview-Dlotqlmn.js';
import { worldZoneAt, handleMarkup, loadWorldMetatileRenderer, loadSceneMetatileRenderer, paintSceneMetatileCells } from './record-6_wsSDi2.js';
import { state } from './emulator-Bpa8EsFw.js';
import { metatileEditSession } from './metatile-edit-session-CkenLTKq.js';
import { bindReferencePicker, setReferencePickerValue, referencePickerMarkup, hydrateReferenceFieldPickers, referenceFieldPickerMarkup } from './timeline-player-YCH7Y-3h.js';
import './components-DbJXuRMn.js';
import './components-C2dkTMIc.js';
import './baseline-assembly-DW8BWbDB.js';
import './global-random-DAuRNoyj.js';
import './page-runtime-paths-BvtuMnH7.js';
import './field-address-table-BnL1Mgdy.js';

const hex$1 = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const handleFor = (bank, tile) => `shared-chr-bank:bank:${hex$1(bank)}:tile:${hex$1(tile)}`;
const color = value => `rgb(${nesPalette[value & 63].join(",")})`;
const validTile = value => Number.isInteger(value) && value >= 0 && value < 256;
let selection = {key: "", quadrant: 0, brush: 1, zoom: "fit"};

function metatileEditorMarkup({handle, selected, definition, attribute, colors, contextMarkup = ""}) {
  const key = `${handle}:${hex$1(selected)}`;
  if (selection.key !== key) selection = {key, quadrant: 0, brush: 1, zoom: "fit"};
  const palette = Number(attribute) & 3;
  const swatches = Array.from({length: 4}, (_, index) =>
    `<span class="metatile-swatches">${colors.slice(index * 4, index * 4 + 4).map(value =>
      `<i style="background:${color(value)}"></i>`).join("")}</span>`);
  return {inspectorMarkup: `<div class="metatile-inspector-fields">
      <div class="metatile-identity"><code>${esc(key)}</code><span title="组成与调色板选择暂不写入 ROM">↛</span></div>
      <fieldset class="metatile-quadrants"><legend>CHR 象限</legend>${definition.map((tile, quadrant) =>
        `<label><input type="radio" name="metatile-quadrant" value="${quadrant}" ${quadrant === selection.quadrant ? "checked" : ""}>${["左上", "右上", "左下", "右下"][quadrant]} <code data-quadrant-value="${quadrant}">${hex$1(tile)}</code></label>`).join("")}</fieldset>
      <div class="inline-reset-row">${referencePickerMarkup({moduleId: "shared-chr-bank", label: "CHR 图块", compact: true,
        value: definition[selection.quadrant], componentAttributes: "data-metatile-chr-picker",
        grouped: true, filterPlaceholder: "CHR 编号", items: Array.from({length: 256}, (_, tile) => ({
          value: tile, label: `CHR ${hex$1(tile)}`, group: String(Math.floor(tile / 64)),
          groupLabel: `${hex$1(Math.floor(tile / 64) * 64)}–${hex$1(Math.floor(tile / 64) * 64 + 63)}`,
          preview: `<canvas width="8" height="8" data-metatile-candidate="${tile}" aria-label="CHR ${hex$1(tile)}"></canvas>`,
        }))})}${resetToOriginalButton("chr-tile", {title: "恢复所选 CHR 图块", attributes: {'data-chr-reset': ''}})}</div>
      <div class="inline-reset-row"><fieldset><legend>背景调色板</legend>${swatches.map((swatch, index) =>
        `<label><input type="radio" name="metatile-palette" value="${index}" ${index === palette ? "checked" : ""}>${index} ${swatch}</label>`).join("")}</fieldset>
      ${resetToOriginalButton("metatile", {title: "恢复当前元图块的 CHR 象限与配色", attributes: {'data-metatile-reset': ''}})}</div>
      <p role="status" data-metatile-message></p>
    </div>`,
    stageMarkup: screenWorkbenchCanvasStage({namespace: "metatiles",
      canvasMarkup: `<canvas width="16" height="16" data-metatile-pixels data-metatile-index="${selected}" aria-label="16×16 像素编辑画布"></canvas>`,
      toolbarMarkup: `<fieldset class="metatile-brush"><legend>画笔</legend>${colors.slice(palette * 4, palette * 4 + 4).map((value, index) =>
        `<label title="颜色 ${index}"><input type="radio" name="metatile-brush" value="${index}" ${index === selection.brush ? "checked" : ""}><i class="metatile-brush-color" style="background:${color(value)}"></i>${index}</label>`).join("")}</fieldset>`,
      footerMarkup: contextMarkup,
    })};
}

async function bindMetatileEditor(root, data) {
  const panel = root.matches("[data-metatile-editor]") ? root : root.querySelector("[data-metatile-editor]");
  if (!panel) return;
  const {index, scene, bankIds, draft, paintMetatiles} = data;
  const definitionField = draft.definitions, attributeField = draft.attributes;
  const table = draft.paintChrTable(await composeChrPatternTable(bankIds), bankIds);
  const chrFields = new Map();
  await Promise.all(Array.from({length: 256}, (_, tile) => {
    const id = handleFor(bankIds[Math.floor(tile / 64)], tile % 64);
    return Promise.all([0, 1].map(async plane => {
      chrFields.set(`${id}/${plane}`, await db.getField("shared-chr-bank", id, `plane_${plane}`));
    }));
  }));
  if (!panel.isConnected) return;
  const colors = scene.render.background_palette.colors;
  bindScreenWorkbenchZoom({namespace: "metatiles", root: panel, zoom: selection.zoom,
    canPan: event => event.button === 1,
    onChange: zoom => {selection.zoom = zoom;}});
  panel.querySelectorAll("[name=metatile-brush]").forEach(input =>
    input.addEventListener("change", () => {selection.brush = Number(input.value);}));
  const status = panel.querySelector("[data-metatile-message]");
  const definition = () => draft.read(definitionField)[index];
  const palette = () => draft.read(attributeField)[index] & 3;
  const quadrant = () => Number(panel.querySelector("[name=metatile-quadrant]:checked").value);
  const selectedTile = () => Number(definition()[quadrant()]);
  const physical = () => ({bank: Number(bankIds[Math.floor(selectedTile() / 64)]), tile: selectedTile() % 64});
  const refreshResets = () => {
    const id = handleFor(physical().bank, physical().tile);
    applyResetToOriginalStates(panel, new Map([
      ['metatile', definition().some((value, quadrant) => value !== definitionField.defaultValue[index][quadrant])
        || palette() !== (attributeField.defaultValue[index] & 3)],
      ['chr-tile', [0, 1].some(plane => {
        const field = chrFields.get(`${id}/${plane}`);
        return draft.read(field).some((value, index) => value !== field.defaultValue[index]);
      })],
    ]), {busy: Boolean(draft.saving)});
  };
  const drawTile = (canvas, tileId, paletteId, size = 8) => {
    const pixels = new Uint8ClampedArray(size * size * 4);
    paintChrTile(pixels, size, 0, 0, decodeChrTile(table, tileId),
      colors.slice(paletteId * 4, paletteId * 4 + 4), {transparent: false});
    canvas.getContext("2d").putImageData(new ImageData(pixels, size, size), 0, 0);
  };
  const draw = () => {
    void paintMetatiles().catch(error => {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      if (panel.isConnected) status.textContent = String(error?.message || error);
    });
  };
  const candidates = panel.querySelector("[data-metatile-chr-picker]");
  const paintCandidate = host => host.querySelectorAll("[data-metatile-candidate]")
    .forEach(canvas => drawTile(canvas, Number(canvas.dataset.metatileCandidate), palette()));
  bindReferencePicker(candidates, {paint: paintCandidate});
  candidates.addEventListener("toggle", () => {if (candidates.open) paintCandidate(candidates);});
  const refresh = () => {
    refreshResets();
    draft.paintChrTable(table, bankIds);
    draw();
    definition().forEach((tile, q) => {panel.querySelector(`[data-quadrant-value="${q}"]`).textContent = hex$1(tile);});
    panel.querySelectorAll("[name=metatile-palette]").forEach(input => {input.checked = Number(input.value) === palette();});
    panel.querySelectorAll("[name=metatile-brush]").forEach(input => {
      input.closest("label").querySelector("i").style.background = color(colors[palette() * 4 + Number(input.value)]);
    });
    const refs = panel.querySelector("[data-metatile-tile-references]");
    if (refs) refs.querySelectorAll("code").forEach((node, q) => {
      const tile = Number(definition()[q]);
      node.textContent = handleFor(bankIds[Math.floor(tile / 64)], tile % 64);
    });
    void setReferencePickerValue(candidates, selectedTile(), {paint: paintCandidate});
    if (candidates.open) paintCandidate(candidates);
    status.textContent = "";
  };
  const setRow = (field, row) => {
    const value = draft.read(field).map((item, at) => at === index ? row : item);
    draft.set(field, value);
  };
  candidates.addEventListener("module-reference-change", () => {
    const tile = Number(candidates.dataset.moduleReferenceValue);
    if (!validTile(tile)) {status.textContent = "图块超出图案表"; return;}
    try {
      const row = [...definition()];
      row[quadrant()] = tile;
      setRow(definitionField, row);
      refresh();
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  });
  panel.querySelectorAll("[name=metatile-palette]").forEach(input => input.addEventListener("change", () => {
    const next = Number(input.value);
    if (!Number.isInteger(next) || next < 0 || next > 3) {status.textContent = "调色板编号无效"; return;}
    try {setRow(attributeField, (draft.read(attributeField)[index] & 0xfc) | next); refresh();}
    catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  }));
  panel.querySelector("[data-metatile-reset]").addEventListener("click", () => {
    try {
      setRow(definitionField, definitionField.defaultValue[index]);
      setRow(attributeField, (draft.read(attributeField)[index] & 0xfc)
        | (attributeField.defaultValue[index] & 3));
      refresh();
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  });
  panel.querySelectorAll("[name=metatile-quadrant]").forEach(input =>
    input.addEventListener("change", () => {
      selection.quadrant = Number(input.value);
      refreshResets();
      void setReferencePickerValue(candidates, selectedTile(), {paint: paintCandidate});
    }));
  panel.querySelector("[data-chr-reset]").addEventListener("click", () => {
    try {
      const {bank, tile} = physical();
      const id = handleFor(bank, tile);
      for (const plane of [0, 1]) {
        const field = chrFields.get(`${id}/${plane}`);
        draft.set(field, field.defaultValue);
        bankIds.forEach((bankId, at) => {
          if (Number(bankId) === bank) table.set(field.defaultValue, at * 1024 + tile * 16 + plane * 8);
        });
      }
      refresh();
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  });
  const canvas = panel.querySelector("[data-metatile-pixels]");
  let previous = null, thumbnailFrame = null;
  const pointAt = event => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * 16 / rect.width);
    const y = Math.floor((event.clientY - rect.top) * 16 / rect.height);
    if (x < 0 || x >= 16 || y < 0 || y >= 16) {previous = null; return;}
    const brush = selection.brush;
    const from = previous || [x, y];
    const steps = Math.max(Math.abs(x - from[0]), Math.abs(y - from[1]), 1);
    const changes = new Map();
    for (let step = 0; step <= steps; step++) {
      const px = Math.round(from[0] + (x - from[0]) * step / steps);
      const py = Math.round(from[1] + (y - from[1]) * step / steps);
      const tileId = Number(definition()[(py >> 3) * 2 + (px >> 3)]);
      if (!validTile(tileId)) throw new RangeError("图块超出图案表");
      const bank = bankIds[Math.floor(tileId / 64)], tile = tileId % 64;
      const id = handleFor(bank, tile), bit = 1 << (7 - (px & 7));
      for (const plane of [0, 1]) {
        const field = chrFields.get(`${id}/${plane}`);
        const value = changes.get(field) || [...draft.read(field)];
        value[py & 7] = brush & (1 << plane) ? value[py & 7] | bit : value[py & 7] & ~bit;
        changes.set(field, value);
        bankIds.forEach((bankId, at) => {
          if (Number(bankId) === Number(bank)) table.set(value, at * 1024 + tile * 16 + plane * 8);
        });
      }
    }
    for (const [field, value] of changes) draft.set(field, value);
    refreshResets();
    previous = [x, y];
    if (thumbnailFrame === null) thumbnailFrame = requestAnimationFrame(() => {
      thumbnailFrame = null;
      if (panel.isConnected) {
        draw();
        const preview = candidates.querySelector("[data-reference-picker-current-preview]");
        if (preview) paintCandidate(preview);
        if (candidates.open) paintCandidate(candidates);
      }
    });
  };
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary) return;
    previous = null;
    try {pointAt(event); canvas.setPointerCapture(event.pointerId);}
    catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  });
  canvas.addEventListener("pointermove", event => {
    if (!canvas.hasPointerCapture(event.pointerId)) return;
    try {pointAt(event);} catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
  });
  canvas.addEventListener("pointerup", event => {
    if (!canvas.hasPointerCapture(event.pointerId)) return;
    try {pointAt(event);} catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);status.textContent = String(error.message || error);}
    canvas.releasePointerCapture(event.pointerId);
    previous = null;
  });
  canvas.addEventListener("lostpointercapture", () => {previous = null;});
  refreshResets();
  draw();
}

// @editor-module 元图块记录页与场景选格共用的投影与行为码编辑。

const WORLD_ZONES = ["northwest", "northeast", "southwest", "southeast"];
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const sceneId = handle => Number.parseInt(String(handle).split(":")[1], 16);
const sceneHandle = id => `scene:${hex(id)}`;
const tileHandle = (handle, index) => `${handle}:${hex(index)}`;
const chrHandle = (bank, tile) => `shared-chr-bank:bank:${hex(bank)}:tile:${hex(tile)}`;
let pendingEdit = Promise.resolve();
const paintRequests = new WeakMap();

function edit(operation) {
  const result = pendingEdit.then(operation);
  pendingEdit = result.catch(() => {});
  return trackAutoSavePreparation(result);
}

function bankIdsForScene(scene, zone) {
  return Number(scene.id) === 0
    ? scene.render?.zones?.find(item => item.name === zone)?.mmc3_banks
    : scene.render?.mmc3_banks;
}

function tileReferenceMarkup(definition, bankIds) {
  return `<details data-metatile-tile-references data-collapse-key="metatile-tile-references"><summary>四个图块引用</summary>${definition.map(value => {
    const tile = Number(value);
    return `<code>${esc(chrHandle(bankIds[Math.floor(tile / 64)], tile % 64))}</code>`;
  }).join("")}</details>`;
}

function sources(pageDocument, setDocument, handle) {
  const sets = setDocument.records.filter(record => handle === "metatile-set:00"
    ? record.handle === handle
    : record.lower_metatile_page === handle || record.upper_metatile_page === handle);
  const scenes = [...new Set(sets.flatMap(record => record.scene_references || []))].sort();
  const page = handle === "metatile-set:00" ? sets[0]
    : pageDocument.records.find(record => record.handle === handle);
  const definitions = page?.metatile_definitions || page?.metatile_definition_page;
  const attributes = page?.metatile_attributes || page?.metatile_attribute_page;
  if (!page || !Array.isArray(definitions) || !Array.isArray(attributes)
      || definitions.length !== attributes.length) throw new Error(`${handle} 元图块正文不完整`);
  return {sets, scenes, definitions, attributes};
}

function metatileForScene(pageDocument, setDocument, scene, index) {
  const id = Number(scene.id);
  const set = setDocument.records.find(record => (record.scene_references || []).includes(sceneHandle(id)));
  if (!set) throw new Error(`${sceneHandle(id)} 没有已发布的元图块集引用`);
  const handle = id === 0 ? set.handle
    : index < 64 ? set.lower_metatile_page : set.upper_metatile_page;
  const local = id === 0 ? index : index % 64;
  const source = sources(pageDocument, setDocument, handle);
  if (!Number.isInteger(local) || local < 0 || local >= source.definitions.length)
    throw new Error(`${sceneHandle(id)} 元图块编号无效：${index}`);
  return {handle, local, definition: source.definitions[local], attribute: source.attributes[local]};
}

function metatileUrl(handle, index, context = "", point = null) {
  const params = new URLSearchParams({view: "metatiles", metatile: handle, tile: String(index)});
  if (context) params.set("context", context);
  if (point) params.set("point", point.join(","));
  return `?${params}`;
}

function terrainWhitelistMarkup(document_, draft) {
  if (!Array.isArray(document_?.blocks))
    throw new TypeError("地形行为白名单正文不完整");
  return `<section class="metatile-whitelists"><h3>行为回调白名单 ${writeAccessMarker({writebackMissing: true})}</h3>
    <div class="metatile-whitelist-tables">${terrainWhitelistSpecs.map(spec => {
      const block = document_.blocks.find(block => block.id === `field-terrain-behavior-service.${spec.id}`);
      if (!Array.isArray(block?.values) || block.values.length !== spec.length || block.values.at(-1) !== 0)
        throw new TypeError(`${spec.label} 正文不完整`);
      return `<div class="metatile-whitelist"><h4>${spec.label}</h4><div>${block.values.slice(0, -1).map((saved, index) => {
        const code = draft.value("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`, saved);
        return `<label>位置 ${index + 1} <select data-terrain-whitelist="${spec.id}" data-terrain-index="${index}">
          ${metatileBehaviorOptions.filter(item => terrainWhitelistCodes.includes(item.code)).map(item =>
            `<option value="${item.code}" ${item.code === code ? "selected" : ""}>${esc(item.label)}</option>`).join("")}
        </select></label>`;
      }).join("")}</div></div>`;
    }).join("")}</div><span role="status" data-terrain-whitelist-status></span></section>`;
}

function sceneUrl(handle, point = null) {
  const id = sceneId(handle);
  const entry = state.project?.scenes?.editable_scenes?.find(item => Number(item.id) === id);
  const params = new URLSearchParams({view: "scenes", scene: entry?.slug || `${String(id).padStart(3, "0")}-scene-${hex(id)}`});
  if (id !== 0) params.set("sceneMode", "tiles");
  if (point) params.set("scenePoint", point.join(","));
  return `?${params}`;
}

async function paintCanvases(root, scene, zone, {draft = null, handle = draft?.handle,
  localIndex = null} = {}) {
  const request = {};
  paintRequests.set(root, request);
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
  ]);
  const records = sceneMetatileAttributeRecords(scene, {pages, sets});
  let offset = 0;
  for (const record of records) {
    if (record.handle === handle) break;
    offset += (record.metatile_definitions || record.metatile_definition_page).length;
  }
  const options = draft ? {metatileEdits: [{handle, definitions: draft.read(draft.definitions),
    attributes: draft.read(draft.attributes)}],
    transformPatternTable: (table, banks) => draft.paintChrTable(table, banks)} : {};
  const renderer = await (Number(scene.id) === 0 ? loadWorldMetatileRenderer : loadSceneMetatileRenderer)(scene, options);
  if (!root.isConnected || paintRequests.get(root) !== request) return;
  for (const canvas of root.querySelectorAll("canvas[data-metatile-index]")) {
    paintSceneMetatileCells(canvas.getContext("2d"), scene, renderer,
      [{x: 0, y: 0, metatile_id: offset + (localIndex ?? Number(canvas.dataset.metatileIndex))}], {zone});
    canvas.dataset.metatilePainted = "1";
  }
}

async function renderMetatiles() {
  const [pages, sets, terrain] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
    db.getResourceDocument("field-terrain-behavior-service", null),
  ]);
  if (!Array.isArray(pages?.records) || !Array.isArray(sets?.records))
    throw new Error("元图块字段对象正文不可用");
  const params = new URLSearchParams(location.search);
  const requested = params.get("metatile");
  const selectedSet = sets.records.find(record => record.handle === requested
    && record.kind === "shared-page-pair");
  if (selectedSet) return `<div class="metatile-page" data-metatile-set-detail>
    <p><a href="?view=metatiles">← 元图块页</a></p><h2>${esc(selectedSet.handle)}</h2>${handleMarkup(selectedSet.handle)}
    <div class="metatile-set-pages"><a href="${esc(metatileUrl(selectedSet.lower_metatile_page, 0))}">下页 ${esc(selectedSet.lower_metatile_page)}</a>
      <a href="${esc(metatileUrl(selectedSet.upper_metatile_page, 0))}">上页 ${esc(selectedSet.upper_metatile_page)}</a></div>
    ${ownerReferenceListMarkup("引用场景", `data-metatile-users="${esc(selectedSet.handle)}"`)}</div>`;
  const handles = [...pages.records.map(record => record.handle), "metatile-set:00"];
  const handle = handles.includes(requested) ? requested : handles[0];
  const {scenes} = sources(pages, sets, handle);
  const draft = await metatileEditSession(handle);
  const definitions = draft.read(draft.definitions), attributes = draft.read(draft.attributes);
  const requestedContext = params.get("context");
  const context = scenes.includes(requestedContext) ? requestedContext : scenes[0];
  const point = /^\d{1,3},\d{1,3}$/.test(params.get("point") || "")
    ? params.get("point").split(",").map(Number) : null;
  const zone = context === "scene:00" && point ? worldZoneAt(...point)
    : WORLD_ZONES.includes(params.get("zone")) ? params.get("zone") : "northwest";
  const contextDocument = await db.getResourceDocument(context, null);
  const contextScene = contextDocument?.scene || contextDocument;
  const bankIds = bankIdsForScene(contextScene, zone);
  if (!Array.isArray(bankIds) || bankIds.length !== 4) throw new Error(`${context} 缺少 CHR 上下文`);
  const focus = Number(params.get("tile"));
  const selected = Number.isInteger(focus) && focus >= 0 && focus < definitions.length ? focus : 0;
  const url = (next, nextContext = context, nextZone = zone) => {
    const target = metatileUrl(handle, next, nextContext, point);
    return nextZone === "northwest" || point ? target : `${target}&zone=${nextZone}`;
  };
  const [pageOptions, setOptions] = await Promise.all([
    prepareModuleComponent("metatile-page", "reference"),
    prepareModuleComponent("metatile-set", "reference"),
  ]);
  const pageChoices = [...pageOptions.entries, setOptions.entries.find(record => record.handle === "metatile-set:00")];
  const pagePicker = referenceFieldPickerMarkup({
    reference: {key: ["handle"], targets: {domains: [{module: "metatile-page"}, {module: "metatile-set"}]}},
    rows: pageChoices, rowModules: pageChoices.map(record => record.handle.split(":")[0]),
    value: handle, label: "元图块页", componentAttributes: "data-metatile-page-picker",
  });
  const contextEntries = state.project.scenes.editable_scenes.filter(entry => scenes.includes(sceneHandle(entry.id)));
  const contextMarkup = `<div class="metatile-context"><span>像素上下文</span>${referenceFieldPickerMarkup({
    reference: {module: "scene-header-map", key: ["id"]}, rows: contextEntries,
    value: sceneId(context), label: "场景", componentAttributes: "data-metatile-context-picker",
  })}
    ${context === "scene:00" ? `<label>地理区 <select data-metatile-zone>${WORLD_ZONES.map(item =>
      `<option value="${item}" ${item === zone ? "selected" : ""}>${item}</option>`).join("")}</select></label>` : ""}
    </div>`;
  const editor = metatileEditorMarkup({handle, selected, definition: definitions[selected],
    attribute: attributes[selected], colors: contextScene.render.background_palette.colors, contextMarkup});
  const whitelistTab = params.get("metatileTab") === "whitelists";
  return `<div class="metatile-page" data-metatile-editor>
    <div data-metatile-reference-header>
    ${pageHeaderTabs({label: '元图块工作台', active: whitelistTab ? 'whitelists' : 'workbench', attribute: 'data-metatile-tab',
      tabs: [{id: 'workbench', label: '元图块'}, {id: 'whitelists', label: '地形白名单'}]})}
    ${pageHeaderControls(`<button type="button" class="button primary" data-metatile-save ${draft.dirty ? "" : "disabled"}>保存</button>
      <span role="status" data-metatile-save-status>${draft.dirty ? "未保存" : ""}</span>`)}
    ${ownerReferenceListMarkup("使用此元图块页", `data-metatile-users="${esc(handle)}"`)}
    </div>
    <section class="metatile-workbench-panel" data-metatile-panel="workbench" ${whitelistTab ? "hidden" : ""}>
      ${screenWorkbench({namespace: "metatiles", className: "metatile-workbench", treeTitle: "元图块页",
        attributes: {'data-screen-workbench-header': 'external'},
        toolbarMarkup: pagePicker,
        treeMarkup: `<div class="metatile-grid">${definitions.map((_, index) =>
          `<a class="metatile-card ${index === selected ? "selected" : ""}" id="metatile-${hex(index)}"
            href="${esc(url(index))}" aria-label="元图块 ${esc(tileHandle(handle, index))}" ${index === selected ? 'aria-current="true"' : ""}>
            <canvas width="16" height="16" data-metatile-index="${index}" aria-hidden="true"></canvas>
            <code>${hex(index)}</code></a>`).join("")}</div>`,
        stageMarkup: editor.stageMarkup, inspectorTitle: "元图块详情",
        inspectorMarkup: `${editor.inspectorMarkup}<div class="metatile-inspector-fields">
          <div class="inline-reset-row"><label>碰撞行为 <select data-metatile-behavior data-metatile-index="${selected}">${metatileBehaviorOptions.map(option =>
            `<option value="${option.code}" ${option.code === metatileBehaviorCode(attributes[selected]) ? "selected" : ""}>${esc(option.label)}</option>`).join("")}</select></label>${
            resetToOriginalButton(`behavior:${selected}`, {attributes: {
              'data-metatile-behavior-reset': '', 'data-metatile-index': selected},
              dirty: metatileBehaviorCode(attributes[selected]) !== metatileBehaviorCode(draft.attributes.defaultValue[selected]),
            })}</div>
          <span role="status" data-metatile-behavior-status></span>
          ${tileReferenceMarkup(definitions[selected], bankIds)}
        </div>`,
      })}
    </section>
    <section data-metatile-panel="whitelists" ${whitelistTab ? "" : "hidden"}>${terrainWhitelistMarkup(terrain, draft)}</section>
  </div>`;
}

async function bindMetatiles() {
  const root = document.querySelector(".metatile-page");
  if (!root) return;
  root.querySelectorAll('[data-metatile-users]').forEach(host =>
    bindOwnerReferenceList(host, async () => {
      const handle = host.dataset.metatileUsers;
      const {sets, scenes} = await withCurrentOwnerRecord({kind: 'metatile', handle}, db,
        () => currentOwnerReferenceImpact());
      return (handle.startsWith('metatile-page:') ? `<div class="metatile-set-links">${sets.map(item =>
        `<a href="${esc(metatileUrl(item.handle, 0))}">${esc(item.handle)} ↗</a>`).join('')}</div>` : '')
        + `<div class="metatile-scene-links">${scenes.map(item =>
          `<a href="${esc(sceneUrl(item))}">${esc(item)} ↗</a>`).join('')}</div>`;
    }, () => bindInternalPageLinks(root)));
  if (root.hasAttribute("data-metatile-set-detail")) return;
  const params = new URLSearchParams(location.search);
  const handle = params.get("metatile") || "metatile-page:00";
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
  ]);
  const selectedHandle = handle === "metatile-set:00" || pages.records.some(item => item.handle === handle)
    ? handle : pages.records[0].handle;
  const {scenes} = sources(pages, sets, selectedHandle);
  const draft = await metatileEditSession(selectedHandle);
  const definitions = draft.read(draft.definitions); draft.read(draft.attributes);
  const context = scenes.includes(params.get("context")) ? params.get("context") : scenes[0];
  const point = /^\d{1,3},\d{1,3}$/.test(params.get("point") || "")
    ? params.get("point").split(",").map(Number) : null;
  const zone = context === "scene:00" && point ? worldZoneAt(...point)
    : WORLD_ZONES.includes(params.get("zone")) ? params.get("zone") : "northwest";
  const document_ = await db.getResourceDocument(context, null);
  if (!root.isConnected) return;
  const canonical = new URL(location.href);
  canonical.searchParams.set("metatile", selectedHandle);
  canonical.searchParams.set("tile", String(Math.max(0, Math.min(definitions.length - 1, Number(params.get("tile")) || 0))));
  canonical.searchParams.set("context", context);
  if (context === "scene:00") canonical.searchParams.set("zone", zone);
  else canonical.searchParams.delete("zone");
  replaceHistoryUrl(canonical);
  await paintCanvases(root, document_?.scene || document_, zone, {draft});
  if (!root.isConnected) return;
  await bindMetatileEditor(root, {
    index: Math.max(0, Math.min(definitions.length - 1, Number(params.get("tile")) || 0)),
    scene: document_?.scene || document_,
    bankIds: bankIdsForScene(document_?.scene || document_, zone), draft,
    paintMetatiles: () => paintCanvases(root, document_?.scene || document_, zone, {draft})});
  if (!root.isConnected) return;
  const saveButton = root.querySelector("[data-metatile-save]");
  const saveStatus = root.querySelector("[data-metatile-save-status]");
  let paintFrame = null;
  draft.onChange = () => {
    if (!root.isConnected) return;
    if (paintFrame === null) paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      if (!root.isConnected) return;
      void paintCanvases(root, document_?.scene || document_, zone, {draft}).catch(error => {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        if (root.isConnected) saveStatus.textContent = String(error?.message || error);
      });
    });
    const reset = root.querySelector('[data-metatile-behavior-reset]');
    if (reset) {
      const index = Number(reset.dataset.metatileIndex);
      applyResetToOriginalStates(reset.parentElement, new Map([[`behavior:${index}`,
        metatileBehaviorCode(draft.read(draft.attributes)[index])
          !== metatileBehaviorCode(draft.attributes.defaultValue[index])]]), {busy: Boolean(draft.saving)});
    }
    saveButton.disabled = !draft.dirty || Boolean(draft.saving);
    saveStatus.textContent = draft.saving ? "保存中" : draft.dirty ? "未保存" : "";
    root.querySelectorAll("[data-metatile-panel]").forEach(panel => {panel.inert = Boolean(draft.saving);});
  };
  draft.onChange();
  saveButton.addEventListener("click", async () => {
    try {await draft.save();}
    catch (error) {
      editorLog.error("元图块", `操作失败：${error?.message || error}`, error);saveStatus.textContent = String(error?.message || error);}
  });
  hydrateReferenceFieldPickers(root);
  root.querySelector("[data-metatile-page-picker]").addEventListener("module-reference-change", async event => {
    const picker = event.currentTarget;
    if (!await navigateInternalUrl(metatileUrl(picker.dataset.moduleReferenceValue, 0)))
      await setReferencePickerValue(picker, selectedHandle);
  });
  root.querySelector("[data-metatile-context-picker]").addEventListener("module-reference-change", event => {
    void navigateInternalUrl(metatileUrl(selectedHandle, Number(params.get("tile")) || 0,
      sceneHandle(Number(event.currentTarget.dataset.moduleReferenceValue))));
  });
  root.querySelectorAll("[data-metatile-tab]").forEach(button => button.addEventListener("click", () => {
    const tab = button.dataset.metatileTab;
    root.querySelectorAll("[data-metatile-panel]").forEach(panel => {panel.hidden = panel.dataset.metatilePanel !== tab;});
    root.querySelectorAll("[data-metatile-tab]").forEach(item => {
      const active = item === button;
      item.setAttribute("aria-selected", String(active));
    });
    const target = new URL(location.href);
    if (tab === "whitelists") target.searchParams.set("metatileTab", tab);
    else target.searchParams.delete("metatileTab");
    replaceHistoryUrl(target);
    window.dispatchEvent(new Event("resize"));
  }));
  root.querySelector("[data-metatile-zone]")?.addEventListener("change", event => {
    void navigateInternalUrl(`${metatileUrl(selectedHandle, Number(params.get("tile")) || 0, context)}&zone=${event.target.value}`);
  });
  const behaviorSelect = root.querySelector("[data-metatile-behavior]");
  const behaviorReset = root.querySelector("[data-metatile-behavior-reset]");
  const behaviorStatus = root.querySelector("[data-metatile-behavior-status]");
  const field = draft.attributes;
  function changeBehavior(code) {
    try {
      const index = Number(behaviorSelect.dataset.metatileIndex);
      const values = [...draft.read(field)];
      values[index] = metatileAttributeWithBehavior(values[index], code);
      draft.set(field, values);
      behaviorSelect.value = String(code);
      behaviorStatus.textContent = "";
    } catch (error) {
      editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
      behaviorStatus.textContent = String(error?.message || error);
      behaviorSelect.value = String(metatileBehaviorCode(draft.read(field)[Number(behaviorSelect.dataset.metatileIndex)]));
    }
  }
  behaviorSelect?.addEventListener("change", event => {
    const raw = event.target.value;
    const code = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(code) || code < 0 || code > 63) {
      behaviorStatus.textContent = "行为码必须是 0–63 的整数";
      behaviorSelect.value = String(metatileBehaviorCode(draft.read(field)[Number(behaviorSelect.dataset.metatileIndex)]));
      return;
    }
    void changeBehavior(code);
  });
  behaviorReset?.addEventListener("click", () => {
    const index = Number(behaviorReset.dataset.metatileIndex);
    void changeBehavior(metatileBehaviorCode(field.defaultValue[index]));
  });
  root.querySelectorAll("[data-terrain-whitelist]").forEach(select => {
    select.addEventListener("change", async () => {
      const status = root.querySelector("[data-terrain-whitelist-status]");
      const spec = terrainWhitelistSpecs.find(item => item.id === select.dataset.terrainWhitelist);
      const index = Number(select.dataset.terrainIndex);
      const code = Number(select.value);
      try {
        if (!spec || !Number.isInteger(index) || index < 0 || index >= spec.length - 1
            || !terrainWhitelistCodes.includes(code)) throw new TypeError("白名单行为码无效");
        const field = await db.getField("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`);
        draft.set(field, code);
        status.textContent = "";
      } catch (error) {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        status.textContent = String(error?.message || error);
        const field = await db.getField("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`);
        select.value = String(draft.read(field));
      }
    });
  });
  if (!root.querySelector('[data-metatile-panel="workbench"]').hidden)
    root.querySelector(".metatile-card.selected")?.scrollIntoView({block: "nearest"});
}

async function hydrateSceneMetatileInspector() {
  const root = document.querySelector("[data-scene-metatile], [data-scene-metatile-brush]");
  const selected = root?.dataset.sceneMetatile?.split(",").map(Number);
  if (!root || !state.scene) return;
  const [x, y] = selected || [];
  const id = selected ? sceneMapCell(state.scene, x, y)?.metatileId : Number(root.dataset.sceneMetatileBrush);
  try {
    const [pages, sets] = await Promise.all([
      db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
    ]);
    if (!root.isConnected || selected && root.dataset.sceneMetatile !== `${x},${y}`
        || !selected && Number(root.dataset.sceneMetatileBrush) !== id) return;
    const record = metatileForScene(pages, sets, state.scene, id);
    const zone = Number(state.scene.id) === 0 ? worldZoneAt(x, y) : "northwest";
    root.innerHTML = `<div class="scene-metatile-identity"><span>${selected ? `${x}, ${y}` : `当前画笔 $${hex(id)}`}</span>
      <a class="editor-inline-link" href="${esc(metatileUrl(record.handle, record.local, sceneHandle(state.scene.id), selected))}">${esc(tileHandle(record.handle, record.local))} ↗</a></div>
      <canvas width="16" height="16" data-metatile-index="0" aria-label="${esc(tileHandle(record.handle, record.local))} 像素"></canvas>
      <div class="metatile-info"><label>调色板 <select data-scene-metatile-palette aria-label="调色板">${Array.from({length: 4}, (_, value) =>
        `<option value="${value}" ${value === (record.attribute & 3) ? "selected" : ""}>0x${hex(value)}</option>`).join("")}</select></label>
      <label>碰撞行为 <select data-scene-metatile-behavior aria-label="碰撞行为">${metatileBehaviorOptions.map(option =>
        `<option value="${option.code}" title="${esc(metatileBehaviorLabel(option.code))}" ${option.code === metatileBehaviorCode(record.attribute) ? "selected" : ""}>0x${hex(option.code)}</option>`).join("")}</select></label></div>
      <small class="scene-metatile-chr">CHR ${record.definition.map(value => `0x${hex(value)}`).join(" · ")}</small>
      <p role="alert" data-scene-metatile-error hidden></p>`;
    const resource = record.handle.startsWith("metatile-set:") ? "metatile-set" : "metatile-page";
    const suffix = record.handle.split(":").at(-1);
    const field = await db.getField(resource, resource === "metatile-set"
      ? `${resource}:${suffix}-attributes` : `${resource}:attributes-${suffix}`, "value0");
    if (!root.isConnected) return;
    const palette = root.querySelector("[data-scene-metatile-palette]");
    const behavior = root.querySelector("[data-scene-metatile-behavior]");
    const sync = () => {
      palette.value = String(field.value[record.local] & 3);
      behavior.value = String(metatileBehaviorCode(field.value[record.local]));
      behavior.title = metatileBehaviorLabel(Number(behavior.value));
    };
    sync();
    for (const control of [palette, behavior]) control.addEventListener("change", () => {
      const value = Number(control.value);
      void edit(async () => {
        const values = [...field.value];
        values[record.local] = control === palette
          ? (values[record.local] & 0xfc) | value
          : metatileAttributeWithBehavior(values[record.local], value);
        await setProjectField(db, field, values);
        await render();
      }).catch(error => {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        if (!root.isConnected) return;
        sync();
        const status = root.querySelector("[data-scene-metatile-error]");
        status.hidden = false;
        status.textContent = String(error?.message || error);
      });
    });
    await paintCanvases(root, state.scene, zone, {handle: record.handle, localIndex: record.local});
  } catch (error) {
    editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
    if (root.isConnected) root.textContent = String(error?.message || error);
  }
}

export { bindMetatiles, hydrateSceneMetatileInspector, renderMetatiles };
