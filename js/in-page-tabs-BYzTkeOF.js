import { blitRaster, uiBlankCanvas, esc, nesPalette, decodeChrTiles, loadChrBankBytes, createRaster, paintChrTile } from './element-tree-DsgOBeTK.js';
import { battleActorCatalog, battleActorSources, vehiclePortraitImage, vehiclePresetEntry, VEHICLE_PRESET_GROUPS, vehiclePresetChoices } from './configuration-summary-NWu3_nCt.js';
import { db, hex } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';
import { uiVehiclePortraitLayer, uiPaintInterfaceScript, uiPatternProfiles } from './ui-construction-preview-C97hIjGW.js';
import { registerReferenceFieldPresentation, referencePickerMarkup } from './scene-elevators-N46oPTJC.js';

// @editor-module 战车页、界面页与战斗页共用战车立绘与字段对象输入。

const VEHICLE_PRESET_MODULE_ID = "vehicle-preset";

/** 战车立绘接受战斗动作或状态部件，目标光栅保留调用方的布局与选区追踪。 */

/** 战斗 action 键；底盘不在 $91-$98 时返回空串。 */
function vehicleBattleActionKey(chassisId) {
  // 底盘编号减 $90 是固定推导：$91-$98 对应战斗 action $01-$08。
  const action = Number(chassisId) - 0x90;
  if (!Number.isInteger(action) || action < 1 || action > 8) return "";
  return `battle-action:${action.toString(16).toUpperCase().padStart(2, "0")}`;
}

/**
 * 战斗立绘画布。picker 的候选行按装饰图处理（不给 `label`），
 * 独立成格的地方传 `label` 当可读名。
 */
function vehicleBattlePreviewMarkup(chassisId, {label = ""} = {}) {
  const actionKey = vehicleBattleActionKey(chassisId);
  if (!actionKey) return "";
  return `<canvas width="64" height="64" data-vehicle-battle-preview="${actionKey}"${
    label ? ` aria-label="${esc(label)}"` : ' aria-hidden="true"'}></canvas>`;
}

/** 候选项带底盘战斗立绘；立绘缺失的底盘不画占位。 */
function vehiclePresetReferenceItem(preset) {
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
async function paintVehicleBattlePortraitCanvases(root = document) {
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

/** 部件图像读取当前动作、布局、CHR 与精灵调色板。 */

/** 状态立绘背景以完整界面画布为坐标原点。 */
function vehicleStatusBackground(chassisId, sources, records, model) {
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
function paintVehicleStatusParts(canvas, background, allParts, visibleParts, statusDocument,
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
async function paintVehicleChrBank(canvas, bank) {
  const tiles = decodeChrTiles(await loadChrBankBytes(bank));
  const columns = 16;
  const side = 8;
  const raster = createRaster(columns * side, Math.ceil(tiles.length / columns) * side);
  const palette = [0x0F, 0x00, 0x10, 0x30];
  tiles.forEach((tile, index) => paintChrTile(raster.data, raster.width,
    (index % columns) * side, Math.floor(index / columns) * side, tile, palette));
  blitRaster(canvas, raster);
}

// @editor-module 载具预设的引用控件：用途视图提供分组，使用处声明允许的组。

/**
 * `extraEntries` 是消费页自己的哨兵值（如存档的「未租用」），排在候选之前。
 * `controlMarkup` 是消费页原有的精确值控件；`compact` 下它只留作写回路径。
 */
function vehiclePresetPickerMarkup({
  value,
  label = "载具预设",
  allowedGroups = VEHICLE_PRESET_GROUPS,
  componentAttributes = "",
  controlMarkup = "",
  extraEntries = [],
  compact = true,
  disabled = false,
  previewPanel = false,
} = {}) {
  return referencePickerMarkup({
    moduleId: VEHICLE_PRESET_MODULE_ID,
    value,
    label,
    items: [...extraEntries, ...vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
      ...vehiclePresetReferenceItem(preset), group, groupLabel,
    }))],
    grouped: true,
    controlMarkup,
    componentAttributes,
    compact,
    disabled,
    previewPanel,
  });
}

/** 精确值控件（`<select>`）里的候选项，与引用控件同源。 */
function vehiclePresetOptionMarkup(value, allowedGroups = VEHICLE_PRESET_GROUPS) {
  const selected = Number(value);
  const entries = vehiclePresetChoices(allowedGroups).map(({preset, group, groupLabel}) => ({
    ...vehiclePresetEntry(preset, group), group, groupLabel,
  }));
  const known = entries.some(entry => Number(entry.value) === selected);
  // 原值可能在候选表外；保留它，避免精确值控件改掉当前选择。
  return [
    ...(known ? [] : [`<option value="${selected}" selected>${
      esc(`${hex(selected, 2)} · 表外值`)}</option>`]),
    ...[...new Map(entries.map(entry => [entry.group, entry.groupLabel]))]
      .map(([group, groupLabel]) => `<optgroup label="${esc(groupLabel)}">${
        entries.filter(entry => entry.group === group).map(entry => `<option value="${entry.value}"${
          Number(entry.value) === selected ? " selected" : ""}>${
          esc(`${hex(Number(entry.value), 2)} · ${entry.label} · ${entry.description}`)
        }</option>`).join("")}</optgroup>`),
  ].join("");
}

// @editor-module 切换页内展示分页，保留已挂载控件和待写入编辑。

/** Local display tabs. All controls stay mounted, including pending edits. */
function inPageTabs({id, label, tabs, content, active = tabs[0].id}) {
  const selected = tabs.some(tab => tab.id === active) ? active : tabs[0].id;
  return `<div class="in-page-tabs" data-in-page-tabs data-active-tab="${esc(selected)}">
    <div class="in-page-tab-list" role="tablist" aria-label="${esc(label)}">
      ${tabs.map(tab => `<button type="button" role="tab" class="in-page-tab"
        id="${esc(id)}-tab-${esc(tab.id)}" data-in-page-tab="${esc(tab.id)}"
        aria-controls="${esc(id)}-panel" aria-selected="${tab.id === selected}"
        tabindex="${tab.id === selected ? 0 : -1}">${esc(tab.label)}</button>`).join("")}
    </div>
    <div class="in-page-tab-content" id="${esc(id)}-panel" role="tabpanel"
      aria-labelledby="${esc(id)}-tab-${esc(selected)}" tabindex="0">${content}</div>
  </div>`;
}

/** data-in-page-tabs-show lists the tabs that share a piece of content. */
function bindInPageTabs(root, {onChange} = {}) {
  if (!root) return;
  const own = selector => [...root.querySelectorAll(selector)].filter(
    node => node.closest("[data-in-page-tabs]") === root);
  const buttons = own("[data-in-page-tab]");
  const content = own("[data-in-page-tabs-show]");
  const panel = own('[role="tabpanel"]')[0];
  const select = (button, focus = false) => {
    const active = button.dataset.inPageTab;
    for (const tab of buttons) {
      tab.setAttribute("aria-selected", String(tab === button));
      tab.tabIndex = tab === button ? 0 : -1;
    }
    for (const group of content) {
      group.hidden = !group.dataset.inPageTabsShow.split(/\s+/).includes(active);
    }
    panel.setAttribute("aria-labelledby", button.id);
    root.dataset.activeTab = active;
    onChange?.(active);
    if (focus) button.focus();
  };
  for (const [index, button] of buttons.entries()) {
    button.addEventListener("click", () => select(button));
    button.addEventListener("keydown", event => {
      const next = {ArrowRight: (index + 1) % buttons.length,
        ArrowLeft: (index + buttons.length - 1) % buttons.length,
        Home: 0, End: buttons.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(buttons[next], true);
    });
  }
  select(buttons.find(button => button.dataset.inPageTab === root.dataset.activeTab)
    || buttons[0]);
}

export { bindInPageTabs, inPageTabs, paintVehicleBattlePortraitCanvases, paintVehicleChrBank, paintVehicleStatusParts, vehicleBattleActionKey, vehicleBattlePreviewMarkup, vehiclePresetOptionMarkup, vehiclePresetPickerMarkup, vehiclePresetReferenceItem, vehicleStatusBackground };
