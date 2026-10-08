// @editor-module 战车页、界面页与战斗页共用战车立绘与字段对象输入。
import {battleActorCatalog} from "../../core/battle-actor-assets.js";
import {esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {vehiclePresetEntry} from "../../core/vehicle-preset-views.js";
import {battleActorImage, battleActorSources} from "../../render/battle-actor.js";
import {blitRaster, createRaster, decodeChrTile, decodeChrTiles, paintChrTile} from "../../render/chr-raster.js";
import {loadChrBankBytes} from "../../core/media-assets.js";
import {nesPalette, uiBlankCanvas} from "../../render/nes.js";
import {uiPaintInterfaceScript, uiPatternProfiles, uiVehiclePortraitLayer} from "../visual/ui-construction-preview.js";
import {projectBattleObjectOwners} from "../../core/attack-chr-owner.js";
import {registerReferenceFieldPresentation} from "../../ui/reference-field.js";

export const VEHICLE_PRESET_MODULE_ID = "vehicle-preset";

/** 战车立绘接受战斗动作或状态部件，目标光栅保留调用方的布局与选区追踪。 */
export function vehiclePortraitImage({kind = 'battle', sources, action,
  raster = null, parts = [], statusDocument = null, partArt = null, x = 0, y = 0},
{size = 64, scale = 1, background = null} = {}) {
  if (kind === 'battle') return battleActorImage(sources, action, {size, scale, background});
  if (kind !== 'status') throw new TypeError(`战车立绘类型无效：${kind}`);
  const image = raster || createRaster(size, size, background);
  paintVehicleStatusPartPixels(image, parts, statusDocument, {x, y, art: partArt});
  return image;
}

/** 战斗 action 键；底盘不在 $91-$98 时返回空串。 */
export function vehicleBattleActionKey(chassisId) {
  // 底盘编号减 $90 是固定推导：$91-$98 对应战斗 action $01-$08。
  const action = Number(chassisId) - 0x90;
  if (!Number.isInteger(action) || action < 1 || action > 8) return "";
  return `battle-action:${action.toString(16).toUpperCase().padStart(2, "0")}`;
}

/**
 * 战斗立绘画布。picker 的候选行按装饰图处理（不给 `label`），
 * 独立成格的地方传 `label` 当可读名。
 */
export function vehicleBattlePreviewMarkup(chassisId, {label = ""} = {}) {
  const actionKey = vehicleBattleActionKey(chassisId);
  if (!actionKey) return "";
  return `<canvas width="64" height="64" data-vehicle-battle-preview="${actionKey}"${
    label ? ` aria-label="${esc(label)}"` : ' aria-hidden="true"'}></canvas>`;
}

/** 候选项带底盘战斗立绘；立绘缺失的底盘不画占位。 */
export function vehiclePresetReferenceItem(preset) {
  return {
    ...vehiclePresetEntry(preset),
    preview: vehicleBattlePreviewMarkup(preset?.chassis_id),
  };
}

/** 只读项目正文；战斗 action 目录读当前有效的视觉投影与武器资产目录。 */
async function battlePortraitProject() {
  const [visualProjection, weaponAssets] = await Promise.all([
    db.getDocument("project.visuals", null),
    db.getDocument("weapon-attack-parameter", null),
  ]);
  const visuals = visualProjection || state.project?.visuals || {};
  return {
    ...state.project,
    visuals: {
      ...visuals,
      weapon_effect_catalog: {
        ...visuals.weapon_effect_catalog,
        asset_catalog_data: weaponAssets || {},
      },
    },
  };
}

/** 画 `canvas[data-vehicle-battle-preview]`；失败写在画布自己的 `dataset` 上。 */
export async function paintVehicleBattlePortraitCanvases(root = document) {
  const canvases = [
    ...(root?.matches?.("canvas[data-vehicle-battle-preview]") ? [root] : []),
    ...(root?.querySelectorAll?.("canvas[data-vehicle-battle-preview]") || []),
  ];
  if (!canvases.length) return;
  let catalog = null;
  let sources = null;
  let sourceError = null;
  try {
    catalog = battleActorCatalog(await battlePortraitProject());
    sources = await battleActorSources();
  } catch (error) {
    sourceError = error;
  }
  for (const canvas of canvases) {
    try {
      if (!catalog || !sources) {
        throw sourceError || new Error("战斗立绘共用图像来源不可用");
      }
      const action = catalog.actionByKey.get(canvas.dataset.vehicleBattlePreview);
      const raster = vehiclePortraitImage({sources, action}, {
        size: 64, scale: 1, background: [0, 0, 0],
      });
      if (!raster) throw new Error("战斗 action 立绘不可用");
      blitRaster(canvas, raster);
      canvas.dataset.vehicleBattlePainted = "1";
      delete canvas.dataset.vehicleBattleError;
    } catch (error) {
      canvas.dataset.vehicleBattleError = String(error?.message || error);
    }
  }
}

registerReferenceFieldPresentation(VEHICLE_PRESET_MODULE_ID, {
  item: vehiclePresetReferenceItem,
  paint: paintVehicleBattlePortraitCanvases,
  filterLabel: "过滤载具预设",
});

/** 部件选择只读所属字段对象的声明。 */
export function vehicleStatusParts(document, chassisId, mask, stateValue) {
  const selection = document?.portrait_part_selection;
  const columns = selection?.equipped_columns_by_mask?.[mask];
  const stateCase = selection?.state_case_by_value?.[stateValue];
  if (!Array.isArray(columns) || !stateCase) {
    throw new Error("部件选择表不可用，或预览输入无效");
  }
  return columns.flatMap(column => {
    const rows = document.portrait_parts.filter(row =>
      row.chassis_id === chassisId && row.physical_column === column);
    if (rows.length !== 1) throw new Error(`缺少底盘 ${chassisId} 的物理列 ${column}`);
    const row = rows[0];
    const type = row.part_type_by_state_case[stateCase];
    if (type === undefined) throw new Error(`物理列 ${column} 缺少 ${stateCase}`);
    return type === null ? [] : [{...row, part_type: type,
      art_id: row.art_id_by_state_case?.[stateCase]}];
  });
}

function paintVehicleStatusPartPixels(image, parts, document, {x = 0, y = 0, art = null} = {}) {
  const byId = new Map((art || document.portrait_part_art).map(row => [row.id, row]));
  const order = document.portrait_part_selection.oam_column_order_by_frame_parity[0];
  for (const column of [...order].reverse()) {
    for (const part of parts.filter(row => row.physical_column === column)) {
      const source = byId.get(part.art_id);
      if (!source || source.pixel_indices.length !== source.width * source.height)
        throw new TypeError('战车部件图像字段缺失');
      const palette = [0, ...source.nontransparent_colors];
      for (let tileY = 0; tileY < source.height; tileY += 8) {
        for (let tileX = 0; tileX < source.width; tileX += 8) {
          const px = part.x + source.x_offset + tileX - x;
          const py = part.y + source.y_offset + tileY - y;
          if (px >= image.width || py >= image.height || px + 8 <= 0 || py + 8 <= 0) continue;
          const tile = new Uint8Array(64);
          for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) {
            if (tileX + dx < source.width && tileY + dy < source.height
                && px + dx >= 0 && py + dy >= 0
                && px + dx < image.width && py + dy < image.height)
              tile[dy * 8 + dx] = source.pixel_indices[(tileY + dy) * source.width + tileX + dx];
          }
          paintChrTile(image.data, image.width, px, py, tile, palette, {background: null});
        }
      }
    }
  }
}

/** 部件图像读取当前动作、布局、CHR 与精灵调色板。 */
export async function vehicleStatusPartArtForSelector(statusDocument, chassisId, spriteBank) {
  const rows = statusDocument?.portrait_part_art || [];
  const mine = rows.filter(row => Number(row.chassis_id) === Number(chassisId));
  const selector = Number(spriteBank);
  if (!Number.isInteger(selector) || !mine.length) return rows;
  const base = selector & 0xFE;
  const [palettes, actions, layouts, metasprites] = await Promise.all([
    db.getResourceDocument('sprite-palette'), db.getResourceDocument('battle-action'),
    db.getResourceDocument('battle-object-layout'), db.getResourceDocument('metasprite-record'),
  ]);
  const projected = projectBattleObjectOwners({battle_objects: {actions: actions.records.map(row => ({id: row.id}))}},
    actions, layouts, metasprites);
  const byAction = new Map(projected.battle_objects.actions.map(action => [action.id, action]));
  const banks = new Map();
  const patternOf = bank => {
    if (!banks.has(bank)) banks.set(bank, loadChrBankBytes(bank));
    return banks.get(bank);
  };
  const decoded = await Promise.all(mine.map(async row => {
    const action = actions.records.find(action => action.handle === row.action_reference.resource_id);
    const visual = byAction.get(action?.id);
    const values = visual?.tiles;
    if (!action || !visual?.available || values?.length !== visual.columns * visual.rows)
      throw new TypeError('战车部件动作与定长图块布局不符');
    const width = visual.width, height = visual.height;
    const pixels = Array(width * height).fill(0), tiles = [];
    for (const [index, value] of values.entries()) {
      if (value === 0) continue;
      if (value >= 128) throw new TypeError('战车部件图块超出已确认 CHR 上下文');
      const reference = {resource_id: 'shared-chr-bank', bank_id: base + Math.floor(value / 64),
        tile_id: value % 64};
      const tile = {x: index % action.columns * 8, y: Math.floor(index / action.columns) * 8,
        chr_reference: reference};
      tiles.push(tile);
      const pattern = await patternOf(reference.bank_id);
      const tilePixels = decodeChrTile(pattern, reference.tile_id);
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          pixels[(tile.y + y) * width + tile.x + x] = tilePixels[y * 8 + x];
        }
      }
    }
    const palette = palettes.records.find(palette => palette.id === 0x12 + action.palette_id - 1);
    if (!palette || ![1, 2].includes(action.palette_id))
      throw new TypeError('战车部件调色板超出已确认状态上下文');
    return {...row, width, height, tiles,
      x_offset: -1 - visual.origin_x_quarter_tiles * 4,
      y_offset: -visual.origin_y_quarter_tiles * 4,
      layout_reference: {resource_id: visual.layout_reference},
      pixel_indices: pixels, nontransparent_colors: palette.fields.nontransparent_colors};
  }));
  const byId = new Map(decoded.map(row => [row.id, row]));
  return rows.map(row => byId.get(row.id) || row);
}

/** 状态立绘背景以完整界面画布为坐标原点。 */
export function vehicleStatusBackground(chassisId, sources, records, model) {
  const canvas = document.createElement("canvas");
  const {context, image} = uiBlankCanvas(canvas);
  const layer = uiVehiclePortraitLayer({chassis_id: chassisId}, model);
  if (!layer) throw new Error("缺少状态立绘背景记录");
  uiPaintInterfaceScript(image, layer, model, sources.patterns, sources.corePatterns,
    sources.glyphs, records, uiPatternProfiles(null, sources.profilePatterns, layer));
  context.putImageData(image, 0, 0);
  return canvas;
}

/** 状态部件按声明的第 0 帧 OAM 优先顺序绘制。 */
export function paintVehicleStatusParts(canvas, background, allParts, visibleParts, statusDocument,
  partArt = null) {
  const artById = new Map((partArt || statusDocument?.portrait_part_art)
    ?.map(art => [art.id, art]));
  const getArt = (part, id) => {
    const art = artById.get(id);
    if (!art) throw new Error(`物理列 ${part.physical_column} 缺少部件图像 ${id ?? "（未发布引用）"}`);
    if (!Number.isInteger(art.width) || art.width <= 0
        || !Number.isInteger(art.height) || art.height <= 0
        || !Number.isInteger(art.x_offset) || !Number.isInteger(art.y_offset)
        || art.pixel_indices?.length !== art.width * art.height
        || art.pixel_indices.some(value => !Number.isInteger(value) || value < 0 || value > 3)
        || art.nontransparent_colors?.length !== 3
        || art.nontransparent_colors.some(value => !Number.isInteger(value) || !nesPalette[value])) {
      throw new Error(`部件图像 ${id} 的像素或配色无效`);
    }
    return art;
  };
  const image = background.getContext("2d").getImageData(0, 0, background.width, background.height);
  const black = nesPalette[0x0F];
  const xs = allParts.map(part => part.x);
  const ys = allParts.map(part => part.y);
  for (const part of allParts) {
    for (const [stateCase, type] of Object.entries(part.part_type_by_state_case)) {
      if (type === null) continue;
      const art = getArt(part, part.art_id_by_state_case?.[stateCase]);
      xs.push(part.x + art.x_offset, part.x + art.x_offset + art.width - 1);
      ys.push(part.y + art.y_offset, part.y + art.y_offset + art.height - 1);
    }
  }
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      if (black.some((value, channel) => value !== image.data[offset + channel])) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  // 裁剪范围包含所有状态部件的位置，与当前装备掩码无关。
  const left = Math.max(0, Math.min(...xs) - 8);
  const top = Math.max(0, Math.min(...ys) - 8);
  const right = Math.min(background.width, Math.max(...xs) + 9);
  const bottom = Math.min(background.height, Math.max(...ys) + 9);
  canvas.width = right - left;
  canvas.height = bottom - top;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(background, left, top, canvas.width, canvas.height,
    0, 0, canvas.width, canvas.height);
  const order = statusDocument?.portrait_part_selection?.oam_column_order_by_frame_parity?.[0];
  if (!Array.isArray(order) || visibleParts.some(part => !order.includes(part.physical_column))) {
    throw new Error("缺少部件 OAM 绘制顺序");
  }
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  visibleParts.forEach(part => getArt(part, part.art_id));
  vehiclePortraitImage({kind: 'status', raster: pixels, parts: visibleParts, statusDocument,
    x: left, y: top, partArt});
  context.putImageData(pixels, 0, 0);
}

/** CHR 缩略图使用共用图块解码器和中性配色。 */
export async function paintVehicleChrBank(canvas, bank) {
  const tiles = decodeChrTiles(await loadChrBankBytes(bank));
  const columns = 16;
  const side = 8;
  const raster = createRaster(columns * side, Math.ceil(tiles.length / columns) * side);
  const palette = [0x0F, 0x00, 0x10, 0x30];
  tiles.forEach((tile, index) => paintChrTile(raster.data, raster.width,
    (index % columns) * side, Math.floor(index / columns) * side, tile, palette));
  blitRaster(canvas, raster);
}
