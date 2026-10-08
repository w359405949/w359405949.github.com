// @editor-module 卫星地图预览与整屏图像字段对象的编辑控件。
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {ensureSaveCurrentFieldObjects} from "../../core/save-build.js";
import {playerTileFromSaveCamera, saveCameraFromPlayerTile} from "../../core/save-position.js";
import {attributeByteWith, attributeIndexAt, defaultGeometry} from "../../ui/nametable-editor.js";
import {showEditorError} from "../../ui/editor-error.js";
import {writeAccessMarker} from "../../ui/write-access-marker.js";
import {resetToOriginalButton, applyResetToOriginalStates} from "../../ui/table.js";
import {interfacePatternMarkup, bindInterfacePatterns} from './interface-patterns.js';

const MAP_HANDLE = "asset:graphics.ui.field_item_world_map.nametable";

async function satelliteMapPreviewPosition(preview) {
  if (preview?.satellite_position) return preview.satellite_position;
  if (!preview?.satellite_save) return {x: 128, y: 112, visible: true};
  const fields = await ensureSaveCurrentFieldObjects(state);
  return {...playerTileFromSaveCamera(fields.object(preview.satellite_save.camera_x).value,
    fields.object(preview.satellite_save.camera_y).value), visible: true};
}

export async function resolveSatelliteMapPreview(preview) {
  if (!preview?.layers?.some(layer => layer.asset_id === "field-item-world-map")) return preview;
  const [asset, palette] = await Promise.all([
    db.getResourceDocument("asset"), db.getResourceDocument("palette"),
  ]);
  const layout = asset.records.find(record => record.handle === MAP_HANDLE)?.nametable_attribute;
  const seed = palette.records.find(record => record.handle === "palette:field-item-world-map")?.palette_seed;
  if (!layout || seed?.length !== 8) throw new TypeError("卫星地图字段对象缺少图像或调色板");
  const position = await satelliteMapPreviewPosition(preview);
  const camera = saveCameraFromPlayerTile(position.x, position.y);
  const expanded = Array.from({length: 32}, (_, index) => seed[index % 8]);
  expanded[21] = position?.visible === false ? 0x0F : 0x30;
  const palettes = offset => Array.from({length: 4}, (_, index) =>
    expanded.slice(offset + index * 4, offset + index * 4 + 4));
  const rawHex = [...layout.nametable, ...layout.attributes]
    .map(value => value.toString(16).padStart(2, "0")).join(" ");
  return {...preview, layers: preview.layers.map(layer => {
    if (layer.asset_id !== "field-item-world-map") return layer;
    if (layer.kind === "rom_nametable") return {...layer, raw_hex: rawHex, palette_sets: palettes(0)};
    if (layer.kind !== "rom_oam") return layer;
    // PRG $02844B-$02845A 替换 OAM #0；PPU 显示 Y 比 OAM Y 多 1。
    return {...layer, palette_sets: palettes(16), sprites: layer.sprites.map((sprite, index) =>
      index === 0 ? {...sprite, x: 64 + Math.floor(camera.cameraX / 2),
        y: 47 + Math.floor(camera.cameraY / 2)} : sprite)};
  })};
}

export function satelliteMapEditorMarkup() {
  return `<section><h3>地图图像 <span data-satellite-layout-permission></span>
    ${resetToOriginalButton(MAP_HANDLE, {title: "重置地图图像", attributes: {'data-satellite-layout-reset': ''}})}
    </h3><div data-satellite-layout-editor>
    <label>图块列 <input type="number" min="0" max="31" value="8" data-satellite-cell="x"></label>
    <label>图块行 <input type="number" min="0" max="29" value="8" data-satellite-cell="y"></label>
    <label>图块 <input type="number" min="0" max="255" data-satellite-tile></label>
    <label>配色 <select data-satellite-attribute>${[0, 1, 2, 3].map(value =>
      `<option value="${value}">${value + 1}</option>`).join("")}</select></label>
  </div></section><section><h3>调色板</h3><div data-satellite-palette-editor></div></section>
    <section><h3>图块像素</h3>${interfacePatternMarkup('satellite')}</section>`;
}

export async function bindSatelliteMapFields(root, {repaint, preview}) {
  const host = root.querySelector("[data-satellite-layout-editor]");
  if (!host) return;
  await bindInterfacePatterns(root, {repaint});
  const [object, palette, position] = await Promise.all([
    db.getFieldObject("asset", MAP_HANDLE), db.getFieldObject("palette", "palette:palette-seed"),
    satelliteMapPreviewPosition(preview),
  ]);
  if (!host.isConnected) return;
  for (const input of root.querySelectorAll('[data-satellite-position]'))
    input.value = position[input.dataset.satellitePosition];
  const marker = root.querySelector('[data-satellite-marker]');
  if (marker) marker.value = position.visible ? '1' : '0';
  const field = object.fields.find(candidate => candidate.fieldName === "nametable_attribute");
  const x = host.querySelector('[data-satellite-cell="x"]');
  const y = host.querySelector('[data-satellite-cell="y"]');
  const tile = host.querySelector("[data-satellite-tile]");
  const attribute = host.querySelector("[data-satellite-attribute]");
  let pending = 0;
  const cell = () => ({row: Number(y.value), column: Number(x.value)});
  const sync = () => {
    const {row, column} = cell();
    const value = field.value;
    tile.value = value.nametable[row * 32 + column];
    attribute.value = (value.attributes[attributeIndexAt(defaultGeometry, row, column) - 960]
      >> (((row & 2) << 1) | (column & 2))) & 3;
    applyResetToOriginalStates(root, new Map([[MAP_HANDLE, field.hasOverride]]), {busy: pending > 0});
  };
  let writes = Promise.resolve();
  const perform = action => {
    pending++;
    sync();
    writes = writes.then(action).then(() => {sync(); return repaint();})
      .catch(error => {showEditorError(host, "卫星地图图像", error);})
      .finally(() => {pending--; sync();});
    return writes;
  };
  for (const input of [x, y]) input.addEventListener("change", () => {
    if (!input.checkValidity() || input.value === "") return;
    sync();
  });
  root.querySelector("[data-ui-editor-preview]")?.addEventListener("click", event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    x.value = Math.min(31, Math.floor((event.clientX - bounds.left) * 32 / bounds.width));
    y.value = Math.min(29, Math.floor((event.clientY - bounds.top) * 30 / bounds.height));
    sync();
  });
  for (const input of [tile, attribute]) input.addEventListener("change", () => {
    if (!input.checkValidity() || input.value === "" || !x.checkValidity() || !y.checkValidity()) return;
    const {row, column} = cell(), next = Number(input.value);
    void perform(async () => {
      const value = structuredClone(field.value);
      if (input === tile) value.nametable[row * 32 + column] = next;
      else {
        const index = attributeIndexAt(defaultGeometry, row, column) - 960;
        value.attributes[index] = attributeByteWith(value.attributes[index], row, column, next);
      }
      await object.database.writeFields([{field, value}]);
    });
  });
  root.querySelector("[data-satellite-layout-reset]").addEventListener("click", () =>
    void perform(() => field.reset()));
  field.bind(host, sync);
  root.querySelector("[data-satellite-layout-permission]").innerHTML =
    field.writeback?.state === "unpermitted" ? writeAccessMarker({writebackMissing: true}) : "";
  host.dataset.fieldObjectReady = object.id;
  const paletteHost = root.querySelector("[data-satellite-palette-editor]");
  await palette.mount(paletteHost);
  for (const member of palette.fields) member.bind(paletteHost, () => {void repaint();});
  sync();
}
