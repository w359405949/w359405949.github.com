import {editorLog} from "../core/editor-log.js";
import {db} from "../core/project-db.js";
import {composeChrPatternTable} from "../core/media-assets.js";
import {esc} from "../core/dom.js";
import {decodeChrTile, paintChrTile} from "../render/chr-raster.js";
import {nesPalette} from "../render/nes.js";
import {referencePickerMarkup, bindReferencePicker, setReferencePickerValue} from "./reference-picker.js";
import {screenWorkbenchCanvasStage, bindScreenWorkbenchZoom} from "./screen-workbench.js";
import {resetToOriginalButton, applyResetToOriginalStates} from "./table.js";

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const handleFor = (bank, tile) => `shared-chr-bank:bank:${hex(bank)}:tile:${hex(tile)}`;
const color = value => `rgb(${nesPalette[value & 63].join(",")})`;
const validTile = value => Number.isInteger(value) && value >= 0 && value < 256;
let selection = {key: "", quadrant: 0, brush: 1, zoom: "fit"};

export function metatileEditorMarkup({handle, selected, definition, attribute, colors, contextMarkup = ""}) {
  const key = `${handle}:${hex(selected)}`;
  if (selection.key !== key) selection = {key, quadrant: 0, brush: 1, zoom: "fit"};
  const palette = Number(attribute) & 3;
  const swatches = Array.from({length: 4}, (_, index) =>
    `<span class="metatile-swatches">${colors.slice(index * 4, index * 4 + 4).map(value =>
      `<i style="background:${color(value)}"></i>`).join("")}</span>`);
  return {inspectorMarkup: `<div class="metatile-inspector-fields">
      <div class="metatile-identity"><code>${esc(key)}</code><span title="组成与调色板选择暂不写入 ROM">↛</span></div>
      <fieldset class="metatile-quadrants"><legend>CHR 象限</legend>${definition.map((tile, quadrant) =>
        `<label><input type="radio" name="metatile-quadrant" value="${quadrant}" ${quadrant === selection.quadrant ? "checked" : ""}>${["左上", "右上", "左下", "右下"][quadrant]} <code data-quadrant-value="${quadrant}">${hex(tile)}</code></label>`).join("")}</fieldset>
      <div class="inline-reset-row">${referencePickerMarkup({moduleId: "shared-chr-bank", label: "CHR 图块", compact: true,
        value: definition[selection.quadrant], componentAttributes: "data-metatile-chr-picker",
        grouped: true, filterPlaceholder: "CHR 编号", items: Array.from({length: 256}, (_, tile) => ({
          value: tile, label: `CHR ${hex(tile)}`, group: String(Math.floor(tile / 64)),
          groupLabel: `${hex(Math.floor(tile / 64) * 64)}–${hex(Math.floor(tile / 64) * 64 + 63)}`,
          preview: `<canvas width="8" height="8" data-metatile-candidate="${tile}" aria-label="CHR ${hex(tile)}"></canvas>`,
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

export async function bindMetatileEditor(root, data) {
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
    definition().forEach((tile, q) => {panel.querySelector(`[data-quadrant-value="${q}"]`).textContent = hex(tile);});
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
