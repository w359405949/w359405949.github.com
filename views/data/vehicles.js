// @editor-module ROM 载具初值编辑
import {editorLog} from "../../core/editor-log.js";
import {itemPickerFieldMarkup} from "../../ui/item-picker.js";
import {renderModuleComponent} from "../../ui/module-components.js";
import {entityAddressFields, entityDetailEquipmentMarkup, entityDetailFieldTableMarkup,
  entityDetailPageMarkup, entityDetailPanel, entityDetailSection} from "../../ui/entity-detail.js";
import {vehicleSlotShape, vehicleMountableSlots, vehicleAssignedSlot} from "../../core/equipment-slot-shape.js";
import {ensureVehicleDraft, finishVehicleOriginalReset, saveVehicleView,
  vehicleDraftFromDocument, vehicleEquippedMask, vehiclePresetDraft,
  vehicleTableDirty, vehicleViewDirty, vehicleViewDraft,
  vehicleViewSaveSnapshot} from "../../core/vehicle-field-session.js";
export {ensureVehicleDraft, vehiclePresetDraft, vehicleTableDirty, vehicleViewSaveSnapshot};
import {render} from "../../main.js";
import {
  chassisName,
  presetsOfView,
  rentalName,
} from "../../core/vehicle-preset-views.js";
import {equipmentColumnState, setEquipmentColumnState} from "../../core/game-data-compiler.js";
import {$, esc, hex} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {entityFacetFields, entityPreviewInputs, loadEntityCatalog} from "../../core/entities.js";
import {resetRecordFieldObjects} from "../../core/field-object-reset-scope.js";
import {buildLogButton} from "../../core/rom-build.js";
import {
  requireBrowserProjectRepository,
} from "../../core/project-data.js";
import {canonicalJsonEqual} from "../../core/project-store-values.js";
import {
  currentTextReference,
  recordUid,
  resourceForwardReferenceCell,
  resourceLabel,
} from "../../core/resource-index.js";
import {
  bindFieldResetToOriginalButtons,
  bindResetToOriginalButtons,
  dataTable,
  resetToOriginalButton,
} from "../../ui/table.js";
import {reconcileFieldAddressRows} from "../../ui/field-address-table.js";
import {fields, panel, recordPage} from "../../ui/record.js";
import {handleMarkup} from "../../ui/handle.js";
import {mountFieldObjectField, mountFieldObjectChoice, mountFieldObjectMappedChoice, mountFieldObjectBit,
  bindFieldObjectPicker, bindFieldObjectPositionPicker} from "../../ui/field-object-editor.js";
import {state} from "../../core/state.js";
import {copyEditorDraft} from "../../views/data/monsters.js";
import {currentViewUrl, replaceHistoryUrl} from "../../core/router.js";
import {resolveTab} from "../../core/tabs.js";
import {VISUAL_ACTORS_RESOURCE_ID} from "../../core/visual-actors.js";
import {
  ATTACK_LAUNCH_ANCHORS_RESOURCE_ID,
  editedLaunchAnchorProfile,
  effectiveLaunchAnchorAssets,
  launchAnchorControlValue,
  launchAnchorSaveQueue,
} from "../../core/attack-launch-anchors.js";
import {anchorFieldsMarkup} from "../../ui/attack-anchor-fields.js";
import {writeAccessMarker} from "../../ui/write-access-marker.js";
import {
  hydrateScenePositionPicker,
  scenePositionPickerMarkup,
} from "../../modules/scene/components.js";
import {
  battleSceneActiveEnemySlots,
  battleSceneEntityAttackSources,
  battleScenePartyAppearanceKey,
  battleScenePreviewCatalog,
  normalizeBattleScenePreview,
  resolveBattleSceneAttack,
} from "../../core/battle-scene-preview.js";
import {ensureBattleSceneData} from "../../core/view-data.js";
import {bindBattleItemRowText, battleItemRowPreview, battlePreviewFormationMarkup, selectBattlePreviewFormation} from "./characters.js";
import {paintCharacterWalkStrip} from "../../render/character-motion.js";
import {paintVehicleHitMotion, vehicleHitMotions} from "../../render/vehicle-hit-motion.js";
import {
  paintBattleSceneComposerCanvas,
  playBattleSceneComposerAttack,
} from "../../render/battle-scene-composer.js";
import {
  ACTOR_ENTRY_TYPE_SELECTOR,
  actorAppearanceCatalogFromDocument,
  paintActorAtlasCanvases,
} from "../../render/actor-atlas.js";
import {actorPickerPreview} from "../../ui/actor-appearance.js";
import {configureAnimatedResourcePicker} from "../../ui/animated-resource-picker.js";
import {imagePickerCell} from "../../ui/image-picker-cell.js";
import {bindBattlePreviewControls, battlePreviewTargets, mountBattlePreviewStage} from "../../ui/battle-preview-stage.js";
import {listChrBankIds} from "../../core/media-assets.js";
import {
  paintVehicleBattlePortraitCanvases,
  paintVehicleChrBank,
  paintVehicleStatusParts,
  vehicleStatusBackground,
  vehicleStatusPartArtForSelector,
  vehicleStatusParts,
  vehicleBattleActionKey,
  vehicleBattlePreviewMarkup,
} from "../../modules/vehicle/components.js";
import {battleActorSources} from "../../render/battle-actor.js";
import {
  uiJsRenderSources,
  uiMenuRecordSources,
} from "../../modules/visual/ui-construction-preview.js";
import {
  currentFieldObject,
  saveWorkspaceReady,
} from "../byte-map/sram.js";

//
// 来源：拆分前 engine/editor/app.js 第 9489-9672;11087-11233 行。






const VEHICLE_VISUAL_SELECTORS_RESOURCE_ID =
  "vehicle-visual-selector";

const VEHICLE_MAP_ACTOR_TABLE = "map_actor_types";
const VEHICLE_STATUS_SPRITE_TABLE = "status_sprite_chr_banks";
const VEHICLE_STATUS_BACKGROUND_TABLE = "status_background_chr_banks";

const VEHICLE_VISUAL_DOCUMENTS = Object.freeze([
  ["selectorDocument", `${VEHICLE_VISUAL_SELECTORS_RESOURCE_ID} 当前有效正文`],
  ["selectorOptionDocument", `${VEHICLE_VISUAL_SELECTORS_RESOURCE_ID} 原始正文`],
  ["actorDocument", `${VISUAL_ACTORS_RESOURCE_ID} 正文`],
  ["visualProjection", "project.visuals 正文"],
  ["weaponAssets", "weapon-attack-parameter 正文"],
]);

let loadedVehicleVisualContext = null;
// Preview inputs never enter the preset draft or any project asset.
let vehicleStatusPreviewRepository = null;
const vehicleStatusPreviewValues = new Map();
// 按预览格存：一格一份背景与部件图像，浮层里的预览画布共用同一份。
const vehicleStatusPreviews = new WeakMap();

function vehicleVisualProjectPair(visuals) {
  const sets = visuals?.actors?.sets || [];
  const pair = Number(
    sets.find(item => item.kind === "world-map-runtime")?.id
      ?? sets[0]?.id,
  );
  return Number.isInteger(pair) ? pair : null;
}

async function vehicleSelectorOriginalDocument(repository) {
  const original = await repository.getOriginal(
    VEHICLE_VISUAL_SELECTORS_RESOURCE_ID,
  );
  return original?.value?.document || null;
}

function assertVehicleVisualDocuments(documents) {
  for (const [key, label] of VEHICLE_VISUAL_DOCUMENTS) {
    if (!documents[key]) {
      throw new Error(`战车视觉资源未能加载：缺少 ${key}（${label}）`);
    }
  }
}

/**
 * 战车页自己的异步准备边界。选择表是新发布的独立资源，不把它复制进
 * vehicle-preset 或视觉分析投影；渲染前直接从项目仓库取得当前有效正文。
 */
export async function prepareVehicleVisualSelectors() {
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  // getOriginal() is the immutable-store primitive and intentionally does not
  // materialize a lazy package asset. Resolve the effective document first so
  // a cold page cannot race that raw read against first-time installation.
  const catalog = await loadEntityCatalog();
  const inputs = await entityPreviewInputs(db, catalog.handleFor("vehicle", 0),
    "vehicle.visual", {catalog});
  const selectorDocument = inputs[VEHICLE_VISUAL_SELECTORS_RESOURCE_ID];
  const [
    selectorOptionDocument,
    chrOptions,
  ] = await Promise.all([
    vehicleSelectorOriginalDocument(repository),
    listChrBankIds().then(ids => ({ids}), error => ({ids: [], error: error.message})),
  ]);
  const actorDocument = inputs[VISUAL_ACTORS_RESOURCE_ID];
  const visualProjection = inputs["project.visuals"];
  const weaponAssets = inputs["weapon-attack-parameter"];
  const statusDocument = inputs["ui-vehicle-status"];
  assertVehicleProjectSession(repository, revision);
  assertVehicleVisualDocuments({
    selectorDocument,
    selectorOptionDocument,
    actorDocument,
    visualProjection,
    weaponAssets,
  });
  for (const table of [
    VEHICLE_MAP_ACTOR_TABLE,
    VEHICLE_STATUS_SPRITE_TABLE,
    VEHICLE_STATUS_BACKGROUND_TABLE,
  ]) {
    if (!Array.isArray(selectorDocument[table]) || !selectorDocument[table].length
        || !Array.isArray(selectorOptionDocument[table])
        || !selectorOptionDocument[table].length) {
      throw new TypeError(`vehicle-visual-selector 缺少 ${table}`);
    }
  }
  const actorAppearances = actorAppearanceCatalogFromDocument(actorDocument, {
    entryPoint: ACTOR_ENTRY_TYPE_SELECTOR,
  });
  if (vehicleStatusPreviewRepository !== repository) {
    vehicleStatusPreviewRepository = repository;
    vehicleStatusPreviewValues.clear();
  }
  loadedVehicleVisualContext = {
    repository,
    revision,
    selectorDocument,
    selectorOptionDocument,
    actorDocument,
    visualProjection,
    weaponAssets,
    statusDocument,
    chrOptions,
    actorPair: vehicleVisualProjectPair(visualProjection),
    actorAppearances,
    actorById: new Map(actorAppearances.map(item => [Number(item.id), item])),
  };
  return loadedVehicleVisualContext;
}

function vehicleVisualContext() {
  if (loadedVehicleVisualContext?.repository !== state.projectRepository ||
      loadedVehicleVisualContext?.revision !== vehicleProjectRevision()) {
    return {
      selectorDocument: null,
      selectorOptionDocument: null,
      visualProjection: null,
      weaponAssets: null,
      actorPair: null,
      actorAppearances: [],
      actorById: new Map(),
    };
  }
  return loadedVehicleVisualContext;
}

function dollarHex(value, width = 2) {
  return `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;
}

function vehicleSelectorRecord(table, field, value, context = vehicleVisualContext()) {
  return (context.selectorDocument?.[table] || []).find(
    row => Number(row?.[field]) === Number(value),
  ) || null;
}

function vehicleActorPreview(context, appearance, label) {
  return actorPickerPreview({pair: context.actorPair, appearance, label,
    className: "vehicle-map-preview", canvasClassName: "vehicle-map-preview-canvas",
    placeholderClassName: "vehicle-visual-placeholder"});
}

function vehicleMapAppearanceCell(vehicle, context = vehicleVisualContext()) {
  const record = vehicleSelectorRecord(
    VEHICLE_MAP_ACTOR_TABLE,
    "id",
    vehicle.preset_id,
    context,
  );
  const actorType = Number(record?.actor_type);
  const appearance = context.actorById.get(actorType) || null;
  const label = chassisName(vehicle);
  const ready = Boolean(record && appearance);
  const reason = !record ? "缺少 vehicle-visual-selector 地图形象记录"
    : !context.actorAppearances.length ? "actor-visual 没有可用角色类型"
      : context.actorPair === null ? "缺少地图角色预览上下文" : "";
  return imagePickerCell({label: `${label}的地图行走形象`, value: actorType,
    attribute: `data-vehicle-map-appearance="${Number(vehicle.preset_id)}"`,
    reason, unavailableLabel: "地图形象不可用：", disabled: !ready || vehicleEditorBusy()});
}

function vehicleStatusPicker(kind, chassisId, bank, rows, context, label) {
  const ids = [...new Set(rows.map(row => Number(row.chr_bank)))];
  const missing = ids.filter(id => !context.chrOptions?.ids.includes(id));
  const reason = context.chrOptions?.error || (!ids.length ? "选择表没有候选" : "")
    || (missing.length ? `shared-chr-bank 缺少 ${missing.map(id => dollarHex(id)).join("、")}` : "")
    || (!Number.isInteger(bank) ? "缺少当前 CHR 绑定" : "");
  return imagePickerCell({label, value: bank,
    attribute: `data-vehicle-status-${kind}="${chassisId}"`, reason,
    disabled: vehicleEditorBusy()});
}

function vehicleStatusStateOptions(context) {
  const values = context.statusDocument?.portrait_part_selection?.state_case_by_value || [];
  return [...new Set(values)].map(stateCase => ({
    stateCase, value: values.indexOf(stateCase),
  }));
}

function vehicleStatusAppearanceCell(vehicle, context = vehicleVisualContext()) {
  const chassisId = Number(vehicle.chassis_id);
  const sprite = vehicleSelectorRecord(
    VEHICLE_STATUS_SPRITE_TABLE,
    "chassis_id",
    chassisId,
    context,
  );
  const background = vehicleSelectorRecord(
    VEHICLE_STATUS_BACKGROUND_TABLE,
    "chassis_id",
    chassisId,
    context,
  );
  const spriteRows =
    context.selectorOptionDocument?.[VEHICLE_STATUS_SPRITE_TABLE] || [];
  const backgroundRows =
    context.selectorOptionDocument?.[VEHICLE_STATUS_BACKGROUND_TABLE] || [];
  const spriteBank = Number(sprite?.chr_bank);
  const backgroundBank = Number(background?.chr_bank);
  const ready = spriteRows.length && backgroundRows.length
    && Number.isInteger(spriteBank) && Number.isInteger(backgroundBank);
  const presetId = Number(vehicle.preset_id);
  const stateOptions = vehicleStatusStateOptions(context);
  const previewValue = vehicleStatusPreviewValues.get(presetId) ?? stateOptions[0]?.value;
  return `<div class="vehicle-status-binding" data-vehicle-status-binding="${chassisId}"
    data-vehicle-status-preset="${presetId}">
    <button class="vehicle-status-preview" type="button" data-vehicle-status-open
      aria-haspopup="dialog"
      aria-label="${esc(chassisName(vehicle))}的状态界面立绘，点击选择 Sprite CHR 与背景 CHR">
      ${ready ? `<canvas data-vehicle-status-portrait="${chassisId}"
        data-vehicle-status-sprite-bank="${spriteBank}"
        data-vehicle-status-background-bank="${backgroundBank}"
        aria-label="${esc(chassisName(vehicle))}的底盘背景与装备立绘"></canvas>`
        : '<span class="vehicle-visual-placeholder">无预览</span>'}
    </button>
    <small data-vehicle-status-error role="alert" hidden></small>
    <dialog class="vehicle-status-dialog" data-vehicle-status-dialog
      aria-label="${esc(chassisName(vehicle))}的状态界面立绘选择">
      <div class="vehicle-status-dialog-toolbar">
        <b>状态界面立绘 · ${esc(chassisName(vehicle))}</b>
        <button class="button ghost" type="button" data-vehicle-status-close>关闭</button>
      </div>
      <div class="vehicle-status-dialog-body">
        <span class="vehicle-status-dialog-preview" data-vehicle-status-dialog-preview></span>
        <span class="vehicle-status-selectors">
          <label><span>Sprite CHR</span>${vehicleStatusPicker("sprite", chassisId, spriteBank,
            spriteRows, context, `${chassisName(vehicle)}的状态界面 Sprite CHR`)}</label>
          <label><span>背景 CHR</span>${vehicleStatusPicker("background", chassisId, backgroundBank,
            backgroundRows, context, `${chassisName(vehicle)}的状态界面背景 CHR`)}</label>
          <label><span>五列预览状态</span><select class="inline-data-select" data-vehicle-status-state
            aria-label="预设 ${presetId} 的五列预览状态" ${stateOptions.length ? "" : "disabled"}>
            ${stateOptions.map(option => `<option value="${option.value}" ${previewValue === option.value ? "selected" : ""}>${esc(option.stateCase)}</option>`).join("")}
          </select></label>

          <output class="vehicle-status-parts-summary" data-vehicle-status-parts></output>
        </span>
      </div>
    </dialog>
  </div>`;
}

function refreshVehicleStatusParts(binding) {
  const preview = vehicleStatusPreviews.get(binding);
  if (!preview) return;
  const canvases = [...binding.querySelectorAll(
    "canvas[data-vehicle-status-portrait], [data-vehicle-status-dialog-preview] canvas")];
  const error = binding.querySelector("[data-vehicle-status-error]");
  const summary = binding.querySelector("[data-vehicle-status-parts]");
  try {
    const context = vehicleVisualContext();
    const chassisId = Number(binding.dataset.vehicleStatusBinding);
    const presetId = Number(binding.dataset.vehicleStatusPreset);
    const value = Number(binding.querySelector("[data-vehicle-status-state]").value);
    const parts = vehicleStatusParts(context.statusDocument, chassisId,
      vehicleStatusPortraitMask(vehiclePresetDraft(presetId)), value);
    for (const canvas of canvases) {
      paintVehicleStatusParts(canvas, preview.background,
        context.statusDocument.portrait_parts.filter(row => row.chassis_id === chassisId), parts,
        context.statusDocument, preview.partArt);
      canvas.hidden = false;
      canvas.dataset.vehicleStatusPainted = "1";
      delete canvas.dataset.vehicleStatusError;
    }
    summary.textContent = parts.length ? parts.map(part =>
      `列 ${part.physical_column} · ${part.part_type} (${part.x}, ${part.y})`).join("；") : "";
    error.hidden = true;
  } catch (problem) {
    editorLog.error("战车", `操作失败：${problem?.message || problem}`, problem);
    for (const canvas of canvases) {
      canvas.hidden = true;
      canvas.dataset.vehicleStatusError = problem.message;
    }
    summary.textContent = "";
    error.textContent = `部件预览不可用：${problem.message}`;
    error.hidden = false;
  }
}

function vehicleBattleAppearanceCell(vehicle) {
  const chassisId = Number(vehicle.chassis_id);
  const actionKey = vehicleBattleActionKey(chassisId);
  if (!actionKey) {
    return "";
  }
  const action = chassisId - 0x90;
  const actionHex = dollarHex(action);
  return `<div class="vehicle-battle-derived" data-vehicle-battle-derived="${chassisId}">
    <span class="vehicle-battle-preview">${vehicleBattlePreviewMarkup(chassisId, {
      label: `${chassisName(vehicle)}的战斗立绘`,
    })}</span>
    <span class="vehicle-battle-result">
      <span class="badge confirmed">固定推导</span>
      <output data-vehicle-battle-action="${action}">ACTION ${actionHex}</output>
      <code>${dollarHex(chassisId)} − $90 = ${actionHex}</code>

    </span>
  </div>`;
}

function vehicleStatusPreviewModel(model, chassisId, backgroundBank, profiles) {
  const profile = [...profiles.values()].find(item =>
    Number(item?.bank) === Number(backgroundBank)
      && Number(item?.first_tile) <= 0xC0
      && Number(item?.last_tile) >= 0xFF
  );
  if (!profile) {
    throw new Error(`状态立绘背景 CHR ${dollarHex(backgroundBank)} 没有 UI profile`);
  }
  const dispatch = model.menu_dispatch_data || {};
  const portraits = dispatch.vehicle_portraits || {};
  const variants = (portraits.variants || []).map(variant =>
    Number(variant.chassis_id) === Number(chassisId)
      ? {...variant, background_pattern_profile: profile.id}
      : variant
  );
  return {
    ...model,
    menu_dispatch_data: {
      ...dispatch,
      vehicle_portraits: {...portraits, variants},
    },
  };
}

/** 共享图像来源取一次，逐格重建背景与部件图像，再重画这一格里全部画布。 */
async function paintVehicleStatusCanvases(canvases) {
  if (!canvases.length) return;
  // 共用 UI/CHR 正文不可用时，仍让载具表和编辑控件可见；每张状态画布
  // 已有自己的错误占位。取图失败必须落在同一条边界内，不能把整个模块页
  // 变成 renderView 的全页错误。
  let sources = null;
  let sourceError = null;
  try {
    sources = await uiJsRenderSources();
  } catch (error) {
    sourceError = error;
  }
  const model = sources?.model;
  const profilePatterns = sources?.profilePatterns;
  let records = null;
  if (sources) {
    try {
      records = await uiMenuRecordSources(model);
    } catch (error) {
      sourceError = error;
      sources = null;
    }
  }
  const context = vehicleVisualContext();
  const painted = new Set();
  for (const canvas of canvases) {
    const binding = canvas.closest("[data-vehicle-status-preset]");
    if (!binding || painted.has(binding)) continue;
    painted.add(binding);
    try {
      if (!sources) throw sourceError || new Error("状态预览共用图像来源不可用");
      const chassisId = Number(canvas.dataset.vehicleStatusPortrait);
      const backgroundBank = Number(
        canvas.dataset.vehicleStatusBackgroundBank,
      );
      vehicleStatusPreviews.set(binding, {
        background: vehicleStatusBackground(
          chassisId, sources, records,
          vehicleStatusPreviewModel(
            model,
            chassisId,
            backgroundBank,
            profilePatterns,
          ),
        ),
        partArt: await vehicleStatusPartArtForSelector(
          context.statusDocument,
          chassisId,
          Number(canvas.dataset.vehicleStatusSpriteBank),
        ),
      });
      refreshVehicleStatusParts(binding);
    } catch (error) {
      editorLog.error("战车", `操作失败：${error?.message || error}`, error);
      canvas.dataset.vehicleStatusError = String(error?.message || error);
      canvas.hidden = true;
      const message = binding.querySelector("[data-vehicle-status-error]");
      message.textContent = `状态预览不可用：${canvas.dataset.vehicleStatusError}`;
      message.hidden = false;
    }
  }
}

/** 选择器改选后按底盘就地重画：同一底盘的各预览格共用一条选择表记录。 */
async function repaintVehicleStatusBindings(chassisId) {
  const canvases = [];
  const bindings = [...document.querySelectorAll(
    `[data-vehicle-status-binding="${chassisId}"]`)];
  for (const binding of bindings) {
    const sprite = Number(binding.querySelector("[data-vehicle-status-sprite]")?.value);
    const background = Number(binding.querySelector("[data-vehicle-status-background]")?.value);
    for (const canvas of binding.querySelectorAll("canvas[data-vehicle-status-portrait]")) {
      if (Number.isInteger(sprite)) canvas.dataset.vehicleStatusSpriteBank = String(sprite);
      if (Number.isInteger(background)) {
        canvas.dataset.vehicleStatusBackgroundBank = String(background);
      }
      canvases.push(canvas);
    }
  }
  await paintVehicleStatusCanvases(canvases);
}

/** 立绘一格只留预览；选择器搬进点击后打开的浮层，浮层里另放一份同源预览画布。 */
function bindVehicleStatusDialogs() {
  document.querySelectorAll("[data-vehicle-status-binding]").forEach(binding => {
    const dialog = binding.querySelector("[data-vehicle-status-dialog]");
    const trigger = binding.querySelector("[data-vehicle-status-open]");
    if (!dialog || !trigger) return;
    trigger.addEventListener("click", () => {
      const host = dialog.querySelector("[data-vehicle-status-dialog-preview]");
      if (host && !host.querySelector("canvas")) {
        const canvas = document.createElement("canvas");
        const label = binding.querySelector("canvas[data-vehicle-status-portrait]")
          ?.getAttribute("aria-label");
        if (label) canvas.setAttribute("aria-label", label);
        host.append(canvas);
      }
      if (!dialog.open) dialog.showModal();
      refreshVehicleStatusParts(binding);
    });
    dialog.querySelector("[data-vehicle-status-close]")?.addEventListener(
      "click", () => dialog.close(),
    );
    // 浮层里的点击到此为止：点到浮层空白处只关浮层，不当作点了整行。
    dialog.addEventListener("click", event => {
      event.stopPropagation();
      if (event.target === dialog) dialog.close();
    });
  });
}

/** 只做页面适配；像素组合仍分别由 UI 与战斗形象基础绘制器负责。 */
export async function paintVehicleVisualCanvases(root = document) {
  await paintVehicleStatusCanvases([...root.querySelectorAll(
    "canvas[data-vehicle-status-portrait]",
  )]);
  await paintVehicleBattlePortraitCanvases(root);
}





function vehicleTons(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} t`;
}

export const vehicleEquipmentSlots = [
  ["tank-main-gun", "主炮", 0x80],
  ["tank-sub-gun", "副炮", 0x40],
  ["tank-special", "S-E", 0x20],
  ["tank-c-unit", "C 装置", 0],
  ["tank-engine", "引擎", 0],
];

function vehicleWithDraftChassis(vehicle) {
  const itemId = vehiclePresetDraft(vehicle.preset_id)?.equipment?.[5];
  if (!Number.isInteger(itemId) || itemId === Number(vehicle.chassis_id)) return vehicle;
  const loadout = vehicle.loadout?.map((slot, index) => index === 5
    ? {...slot, item_id: itemId} : slot);
  const item = state.project?.game_data?.items?.records?.[itemId];
  return {...vehicle, chassis_id: itemId, chassis_id_hex: hex(itemId, 2),
    chassisName: item?.name, chassis_name_hint: item?.name, loadout};
}

let vehicleImportBaseRepository = null;
let vehicleImportBaseRevision = null;
let vehicleImportBaseDraft = null;
let vehicleImportBasePromise = null;

function vehicleProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function vehicleProjectSessionMatches(repository, revision) {
  return state.projectRepository === repository &&
    vehicleProjectRevision() === revision;
}

function assertVehicleProjectSession(repository, revision) {
  if (!vehicleProjectSessionMatches(repository, revision)) {
    throw new Error("项目会话已切换，请在当前载具页重试");
  }
}

/** Load immutable O once per open repository; page projections only expose W. */
async function ensureVehicleImportBase() {
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  if (vehicleImportBaseRepository !== repository ||
      vehicleImportBaseRevision !== revision) {
    vehicleImportBaseRepository = repository;
    vehicleImportBaseRevision = revision;
    vehicleImportBaseDraft = null;
    vehicleImportBasePromise = null;
  }
  if (vehicleImportBaseDraft) return vehicleImportBaseDraft;
  if (!vehicleImportBasePromise) {
    const request = (async () => {
      const original = await repository.getOriginal("vehicle-preset");
      const value = original?.value;
      if (!value?.document) {
        throw new Error("vehicle-preset 缺少导入 original");
      }
      const draft = vehicleDraftFromDocument(value.document);
      assertVehicleProjectSession(repository, revision);
      if (vehicleImportBaseRepository !== repository ||
          vehicleImportBaseRevision !== revision) {
        throw new Error("载具 Original 请求已失效，请重试");
      }
      vehicleImportBaseDraft = draft;
      return draft;
    })();
    vehicleImportBasePromise = request;
    void request.finally(() => {
      if (vehicleImportBasePromise === request) {
        vehicleImportBasePromise = null;
      }
    }).catch(() => {});
  }
  return vehicleImportBasePromise;
}

function vehicleSelectionValue(draft, presetId, viewId) {
  if (!draft) return null;
  const id = Number(presetId);
  const preset = draft.presets?.[id] || null;
  if (viewId !== "player") return preset;
  return {
    preset,
    placement: draft.placement?.[id] || null,
  };
}

function vehicleOriginalState(presetId, viewId) {
  if (!vehicleImportBaseDraft) return null;
  const base = vehicleSelectionValue(vehicleImportBaseDraft, presetId, viewId);
  const draft = vehicleSelectionValue(state.vehicleDraft, presetId, viewId);
  const persisted = vehicleSelectionValue(
    state.vehicleOriginal,
    presetId,
    viewId,
  );
  return {
    draftDirty: !canonicalJsonEqual(draft, base),
    persistedDirty: !canonicalJsonEqual(persisted, base),
  };
}

function vehicleOriginalResetControl(presetId, label = "Reset") {
  const id = Number(presetId);
  return `<span class="original-reset-control" data-vehicle-original-control="${id}">
    ${resetToOriginalButton(id, {
      title: "恢复这一辆车的导入 original；其他战车编辑会保留",
    })}
  </span>`;
}

/**
 * Original、最后保存值与本地草稿是三个层次。本地草稿的变化不能让页面误报
 * “已保存值与 Original 不同”。
 */
function updateVehicleOriginalControls(root, viewId) {
  if (!vehicleImportBaseDraft || !root?.querySelectorAll) return;
  const busy = state.vehicleVisualSaving || state.vehicleBuilding ||
    (viewId === "rental" && state.rentalSaving);
  for (const control of root.querySelectorAll(
    "[data-vehicle-original-control]",
  )) {
    const status = vehicleOriginalState(
      control.dataset.vehicleOriginalControl,
      viewId,
    );
    if (!status) continue;
    control.classList.toggle("is-original-dirty", status.draftDirty);
    control.classList.toggle("is-persisted-dirty", status.persistedDirty);
    const button = control.querySelector("[data-reset-to-original]");
    if (button) {
      const dirty = status.draftDirty || status.persistedDirty;
      button.dataset.originalDirty = String(dirty);
      button.classList.toggle("dirty", dirty);
      button.disabled = busy || !dirty || button.dataset.resetPending === "true";
      button.title = dirty
        ? "恢复原值：只恢复这一辆车"
        : "恢复原值：当前值与原值一致";
    }
  }
  for (const row of root.querySelectorAll("tbody tr")) {
    const controls = [...row.querySelectorAll(
      "[data-vehicle-original-control]",
    )];
    if (!controls.length) continue;
    row.classList.toggle("original-dirty", controls.some(control =>
      control.classList.contains("is-original-dirty") ||
      control.classList.contains("is-persisted-dirty")
    ));
  }
}

async function vehiclePresetFields(presetId, {placement = false} = {}) {
  const catalog = await loadEntityCatalog();
  const handle = catalog.handleFor("vehicle", Number(presetId));
  const facets = ["initial_preset", "initial_loadout",
    ...(placement ? ["initial_placement"] : [])];
  const fields = new Set();
  const objects = new Set();
  for (const facet of await Promise.all(facets.map(facetId =>
    entityFacetFields(db, handle, facetId, {catalog})))) {
    for (const field of facet.fields) fields.add(field);
    for (const object of facet.objects) {
      if (facet.fields.some(field => object.fields.includes(field))) objects.add(object);
    }
  }
  return {fields: [...fields], objects: [...objects]};
}

async function vehiclePresetFieldObjects(presetIds, {placement = false} = {}) {
  const selected = new Map();
  const ids = [...new Set(presetIds.map(Number))];
  for (const {fields, objects} of await Promise.all(ids.map(id =>
    vehiclePresetFields(id, {placement})))) {
    for (const field of fields) {
      const object = objects.find(candidate => candidate.fields.includes(field));
      if (!object) throw new TypeError(`战车切面缺少字段对象：${field.entityHandle}`);
      selected.set(`${field.recordId}:${field.fieldName}`, {object, field});
    }
  }
  return selected;
}

export async function resetVehicleToOriginal(presetId, {viewId = 'player'} = {}) {
  const context = await vehicleOriginalResetContext(presetId, viewId);
  const saved = await resetRecordFieldObjects(db, "vehicle", context.id,
    {viewId, project: state.project});
  return finishVehicleOriginalReset(context, saved);
}

async function vehicleOriginalResetContext(presetId, viewId) {
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  const id = Number(presetId);
  const presetIds = state.project?.game_data?.vehicles
    ?.views?.[viewId]?.preset_ids?.map(Number) || [];
  if (!Number.isInteger(id) || !presetIds.includes(id)) {
    throw new Error(`战车视图 ${viewId} 不包含预设 ${presetId}`);
  }
  await ensureVehicleImportBase();
  assertVehicleProjectSession(repository, revision);
  return {repository, revision, id, viewId};
}

async function bindVehicleOriginalFieldResets(root, {
  viewId, beforeReset, afterReset, onError, confirmMessage,
}) {
  const repository = requireBrowserProjectRepository(state), revision = vehicleProjectRevision();
  const buttons = [...root.querySelectorAll(
    "[data-vehicle-original-control] [data-reset-to-original]",
  )];
  for (const button of buttons) {
    bindResetToOriginalButtons(button.parentElement, async key => {
      try {
        assertVehicleProjectSession(repository, revision);
        await beforeReset?.();
        assertVehicleProjectSession(repository, revision);
        await afterReset?.(await resetVehicleToOriginal(key, {viewId}));
      } catch (error) {
        if (!onError) throw error;
        onError(error);
      }
    }, {confirmMessage});
  }
  root.dataset.vehicleOriginalFields = "ready";
}

function vehicleRecordDraftError(record, items) {
  if (!record) return "战车预设记录不可用，请刷新页面";
  const prefix = `预设 ${hex(Number(record.preset_id), 2)}`;
  for (const [field, label, maximum] of [
    ["defense", "底盘防御", 65535],
    ["chassis_weight_units", "底盘自重", 65535],
    ["ammo_capacity", "弹仓容量", 255],
  ]) {
    if (!Number.isInteger(record[field]) || record[field] < 0 || record[field] > maximum) {
      return `${prefix} ${label}必须是 0–${maximum} 的整数`;
    }
  }
  if (record.mount_mask !== null && (!Number.isInteger(record.mount_mask) || record.mount_mask < 0 || record.mount_mask > 255)) {
    return `${prefix} 的武器挂载许可无效`;
  }
  if (record.equipped_mask !== null && (!Number.isInteger(record.equipped_mask) || record.equipped_mask < 0 || record.equipped_mask > 255)) {
    return `${prefix} 的装备状态无效`;
  }
  if (!Array.isArray(record.slot_assignments) || record.slot_assignments.length !== 5) {
    return `${prefix} 的所在槽选择不完整`;
  }
  if (!Array.isArray(record.equipment) || record.equipment.length !== 6) {
    return `${prefix} 必须有五个初始装备槽与一个底盘位`;
  }
  if (items[record.equipment[5]]?.category?.id !== "tank-chassis") {
    return `${prefix} 的底盘位必须选择底盘物品`;
  }
  for (let slot = 0; slot < vehicleEquipmentSlots.length; slot += 1) {
    const itemId = record.equipment[slot];
    const [category, label] = vehicleEquipmentSlots[slot];
    const item = items[itemId];
    if (!Number.isInteger(itemId) || !item || (itemId !== 0 && !vehicleEquipmentSlots.some(([id]) => item.category?.id === id))) {
      return `${prefix} 的${label}槽物品类型不正确`;
    }
    const assigned = record.slot_assignments[slot];
    if (assigned !== null && assigned !== "" && !vehicleMountableSlots(item).includes(assigned)) {
      return `${prefix} 的装备 ${slot + 1} 不能装入所选槽`;
    }
  }
  return null;
}

function vehicleDraftError(items, viewId = "player") {
  const draft = state.vehicleDraft;
  const records = vehicleViewDraft(viewId);
  if (!draft || !records.length) {
    return "战车预设记录不可用，请刷新页面";
  }
  for (const record of records) {
    const error = vehicleRecordDraftError(record, items);
    if (error) return error;
  }
  return null;
}

function vehicleViewIdForPreset(presetId) {
  const id = Number(presetId);
  return presetsOfView("rental").some(preset => Number(preset.preset_id) === id)
    ? "rental" : "player";
}

// The stored mask activates carry columns. Portrait columns instead describe
// named parts: project active assignments through the published slot binding.
// Keep this projection out of vehicleDerived() and the save document.
function vehicleStatusPortraitMask(record) {
  const stored = vehicleEquippedMask(record);
  if (stored === null) throw new Error("草稿未记录装备掩码");
  const slots = vehicleSlotShape(state.project, record.preset_id).equipped_mask.slots;
  const items = state.project.game_data.items.records;
  let mask = stored;
  record.equipment.forEach((_, column) => {
    mask = setEquipmentColumnState(mask, column, false);
  });
  record.equipment.forEach((itemId, column) => {
    if (!equipmentColumnState(stored, column)) return;
    const item = items.find(entry => Number(entry.id) === Number(itemId));
    const selected = vehicleAssignedSlot(state.project, record, column, item);
    if (!selected) return;
    const target = slots.find(slot => slot.slot_id === selected);
    if (!target) throw new Error(`所在槽 ${selected} 缺少发布立绘列`);
    mask = setEquipmentColumnState(mask, target.equipment_column, true);
  });
  return mask;
}

function vehicleDerived(record, items) {
  let equipmentUnits = 0;
  let capacityUnits = null;
  record.equipment.slice(0, 5).forEach((itemId, slot) => {
    const item = items[itemId];
    equipmentUnits += Number(item?.tank_weight?.internal_units || 0);
    if (slot === 4 && item?.engine_capacity) {
      capacityUnits = Number(item.engine_capacity.internal_units);
    }
  });
  const totalUnits = Number(record.chassis_weight_units) + equipmentUnits;
  return {
    equippedMask: vehicleEquippedMask(record),
    totalUnits,
    capacityUnits,
    remainingUnits: capacityUnits === null ? null : capacityUnits - totalUnits,
  };
}

function vehicleItemOptions(items, category, selected) {
  return items.filter(item =>
    category === "tank-chassis" ? item.category?.id === "tank-chassis"
      : Number(item.id) === 0 || vehicleEquipmentSlots.some(([id]) => item.category?.id === id)
  ).map(item => `<option data-reference-group="${esc(Number(item.id) ? item.category?.id || "" : "")}" data-reference-group-label="${esc(Number(item.id) ? item.category?.name || "" : "")}" value="${Number(item.id)}" ${Number(item.id) === Number(selected) ? "selected" : ""}>${Number(item.id) === 0 ? "— 空栏" : `${esc(item.id_hex)} · ${esc(item.name)}`}</option>`).join("");
}

function vehicleEditorStatus(items, viewId = state.vehicleTab === "rental"
  ? "rental" : "player") {
  if (state.vehicleBuilding) return "正在生成新的 ROM…";
  if (state.vehicleMessage) return state.vehicleMessage;
  const error = vehicleDraftError(items, viewId);
  if (error) return `无法保存：${error}`;
  return "";
}

function vehicleEditorBusy() {
  return Boolean(
    state.vehicleVisualSaving || state.vehicleBuilding,
  );
}

function assignVehicleVisualValue(
  document_, table, identityField, identity, valueField, value,
) {
  const rows = document_?.[table];
  if (!Array.isArray(rows)) {
    throw new TypeError(`vehicle-visual-selector 缺少 ${table}`);
  }
  const matches = rows.filter(
    row => Number(row?.[identityField]) === Number(identity),
  );
  if (matches.length !== 1) {
    throw new TypeError(`${table} 的 ${identityField}=${identity} 必须恰好有一条记录`);
  }
  if (valueField === "actor_type") {
    const valid = vehicleVisualContext().actorById.has(Number(value));
    if (!valid) throw new TypeError(`actor type ${value} 不在角色形象基础表中`);
  } else if (!(vehicleVisualContext().selectorOptionDocument?.[table] || [])
    .some(row => Number(row?.[valueField]) === Number(value))) {
    throw new TypeError(`${table} 不包含可选 CHR bank ${value}`);
  }
  matches[0][valueField] = Number(value);
}

function bindVehicleVisualControls() {
  const context = vehicleVisualContext();
  const items = state.project?.game_data?.items?.records || [];
  const walkRoot = document.querySelector("[data-vehicle-walk-strip]");
  if (walkRoot) {
    const record = vehicleSelectorRecord(VEHICLE_MAP_ACTOR_TABLE, "id",
      Number(walkRoot.dataset.vehicleWalkStrip), context);
    void paintCharacterWalkStrip(walkRoot, {
      pair: context.actorPair,
      appearance: context.actorById.get(Number(record?.actor_type)),
    }).catch(error => {
      editorLog.error("战车", `操作失败：${error?.message || error}`, error);
      if (walkRoot.isConnected) walkRoot.textContent = `行走图不可用：${error.message || error}`;
    });
  }
  for (const [kind, table] of [["sprite", VEHICLE_STATUS_SPRITE_TABLE],
    ["background", VEHICLE_STATUS_BACKGROUND_TABLE]]) {
    const rows = context.selectorOptionDocument?.[table] || [];
    document.querySelectorAll(`[data-vehicle-status-${kind}]`).forEach(picker =>
      configureAnimatedResourcePicker(picker, {
        value: picker.value,
        options: [...new Set(rows.map(row => Number(row.chr_bank)))].map(bank => ({
          value: bank, label: `CHR ${dollarHex(bank)}`,
        })),
        renderPreview: option => `<canvas width="128" height="32" aria-label="${esc(option.label)} 整张 bank"></canvas>`,
        paintPreview: (root, option) => paintVehicleChrBank(root.querySelector("canvas"), Number(option.value)),
      })
    );
  }
  document.querySelectorAll("[data-vehicle-status-state]").forEach(control =>
    control.addEventListener("change", () => {
      const binding = control.closest("[data-vehicle-status-preset]");
      vehicleStatusPreviewValues.set(Number(binding.dataset.vehicleStatusPreset), Number(control.value));
      refreshVehicleStatusParts(binding);
    })
  );
  document.querySelectorAll("[data-vehicle-map-appearance]").forEach(picker =>
    configureAnimatedResourcePicker(picker, {
      value: picker.value,
      options: context.actorAppearances.map(item => ({
        value: item.id, handle: item.resourceId,
        label: `TYPE ${hex(item.id, 2)} · ${item.motionLabel}`, appearance: item,
      })),
      renderPreview: option => vehicleActorPreview(context, option.appearance, option.label),
      paintPreview: root => paintActorAtlasCanvases(root),
    })
  );
  const descriptors = [
    ["[data-vehicle-map-appearance]", VEHICLE_MAP_ACTOR_TABLE, "id", "actor_type", "行走形象",
      context.actorAppearances.map(item => Number(item.id)), "map-actor-types"],
    ["[data-vehicle-status-sprite]", VEHICLE_STATUS_SPRITE_TABLE, "chassis_id", "chr_bank",
      "状态界面 Sprite CHR", [...new Set((context.selectorOptionDocument?.[VEHICLE_STATUS_SPRITE_TABLE] || [])
        .map(row => Number(row.chr_bank)))], "status-sprite-chr-banks"],
    ["[data-vehicle-status-background]", VEHICLE_STATUS_BACKGROUND_TABLE, "chassis_id", "chr_bank",
      "状态界面背景 CHR", [...new Set((context.selectorOptionDocument?.[VEHICLE_STATUS_BACKGROUND_TABLE] || [])
        .map(row => Number(row.chr_bank)))], "status-background-chr-banks"],
  ];
  const selections = descriptors.flatMap(([selector, ...rest]) =>
    [...document.querySelectorAll(selector)].map(picker => [picker, ...rest]));
  if (!selections.length) return;
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  bindVehicleStatusDialogs();
  void (async () => {
    const catalog = await loadEntityCatalog();
    assertVehicleProjectSession(repository, revision);
    await Promise.all(selections.map(async ([picker, table, identityField, valueField,
      label, allowedValues, slug]) => {
      if (!picker.isConnected) return;
      const identity = Number(picker.dataset.vehicleMapAppearance
        ?? picker.dataset.vehicleStatusSprite ?? picker.dataset.vehicleStatusBackground);
      const presetId = table === VEHICLE_MAP_ACTOR_TABLE ? identity
        : Number(picker.closest('[data-vehicle-status-preset]')?.dataset.vehicleStatusPreset);
      const handle = catalog.handleFor('vehicle', presetId);
      const facet = await entityFacetFields(db, handle,
        table === VEHICLE_MAP_ACTOR_TABLE ? 'walk_selector' : 'status_graphics', {catalog});
      const field = facet.fields.find(candidate => candidate.fieldName === valueField
        && candidate.entityHandle.includes(`:${slug}:`));
      const object = facet.objects.find(candidate => candidate.fields.includes(field));
      if (!object) throw new Error(`${label}字段对象未发布：${handle}/${slug}/${valueField}`);
      const entityHandle = field.entityHandle;
      if (!vehicleProjectSessionMatches(repository, revision) || !picker.isConnected) return;
      bindFieldObjectPicker(picker, object, {
        entityHandle, fieldName: valueField, label, allowedValues,
        beforeCommit: async (value, field, resetting) => {
          const current = await db.readResource(VEHICLE_VISUAL_SELECTORS_RESOURCE_ID);
          if (!current?.value?.document || current.version === undefined)
            throw new Error('vehicle-visual-selector 字段正文不可用');
          if (!resetting) assignVehicleVisualValue(structuredClone(current.value.document),
            table, identityField, identity, valueField, value);
        },
        onStart: () => {
          state.vehicleVisualSaving = true;
          updateVehicleEditorState(items);
        },
        onSettled: async error => {
          if (!vehicleProjectSessionMatches(repository, revision)) return;
          state.vehicleVisualSaving = false;
          updateVehicleEditorState(items,
            error ? `${label}保存失败：${error.message || error}` : '');
          // 状态立绘的两个 CHR 选择器只喂这一格的预览：就地重画，不整页重渲染，
          // 否则改选的瞬间会把正开着的浮层一起换掉。
          if (table === VEHICLE_MAP_ACTOR_TABLE) await render();
          else await repaintVehicleStatusBindings(identity);
        },
      });
    }));
  })().catch(error => {
    if (vehicleProjectSessionMatches(repository, revision))
      updateVehicleEditorState(items,
        `读取战车视觉字段对象失败：${error.message || error}`);
  });
}

function vehicleTabs() {
  const tabs = [
    ["initial", "玩家战车"],
    ["rental", "出租战车"],
  ];
  state.vehicleTab = resolveTab(
    "vehicle", tabs.map(([id]) => id), state.vehicleTab,
  );
  return `<nav class="text-mode-tabs">${tabs.map(([id, label]) =>
    `<button type="button" data-vehicle-tab="${id}" class="${
      state.vehicleTab === id ? "active" : ""
    }">${label}</button>`
  ).join("")}</nav>`;
}

function vehicleSaveFieldId(slot, vehicleSlot, suffix) {
  return `save.slot.${slot}.vehicle.${vehicleSlot}.${suffix}`;
}

function vehicleSaveItemLabel(data, itemId) {
  const id = Number(itemId);
  if (!id) return "— 空栏";
  const item = (data.items?.records || []).find(record => Number(record.id) === id);
  return resourceLabel(recordUid("item", id), item?.name || `物品 ${hex(id, 2)}`);
}

export function renderVehicleData(data, vehicles) {
  const tabs = vehicleTabs();
  const viewId = state.vehicleTab === "rental" ? "rental" : "player";
  vehicles = vehicles.map(vehicleWithDraftChassis);
  const allVehicles = vehicles;
  vehicles = allVehicles.filter(vehicle => vehicle.displayViews.includes(viewId));
  ensureVehicleDraft();
  const tableDirty = vehicleTableDirty();
  const items = data.items?.records || [];
  const error = vehicleDraftError(items, viewId);
  const status = vehicleEditorStatus(items, viewId);
  const visualContext = vehicleVisualContext();
  // 主表仍是一行一辆玩家车：可编辑值、派生值、视觉选择和装备槽各自成列。
  // 初始停放位置与运行状态仍只放记录页，它们是逐车的细节，不适合按列比较。
  const draftOf = vehicle => vehiclePresetDraft(vehicle.preset_id);
  const derivedCell = (vehicle, field, text) =>
    `<span data-vehicle-derived="${vehicle.preset_id}" data-derived-field="${field}">${text}</span>`;
  const slotColumn = ([category, label, bit], slot) => ({
    key: `slot-${slot}`,
    label,
    width: bit ? 190 : 148,
    cell: vehicle => `<span class="vehicle-mount-slot">${bit ? `<span data-vehicle-bit-object="mount_mask"
      data-vehicle-id="${vehicle.preset_id}" data-vehicle-bit="${bit}"
      data-vehicle-bit-label="${esc(label)}"></span>` : ""}<span data-vehicle-choice-object="loadout_${slot}"
      data-vehicle-id="${vehicle.preset_id}" data-vehicle-choice-category="${esc(category)}"
      data-vehicle-choice-label="${esc(`${chassisName(vehicle)} ${label}`)}"></span></span>`,
  });
  const columns = [
    {key: "resource_id", label: "资源 ID", mono: true, sticky: true, width: 138,
      cell: vehicle => handleMarkup(vehicleUid(vehicle))},
    {key: "slot", label: "车槽", mono: true, sticky: true, width: 52,
      cell: vehicle => vehicle.vehicle_slot === null || vehicle.vehicle_slot === undefined
        ? "—" : vehicle.vehicle_slot + 1},
    {key: "chassis", label: "底盘", sticky: true, width: 252,
      cell: vehicle => `<span class="vehicle-chassis-cell">
        <span data-vehicle-choice-object="loadout_5"
          data-vehicle-id="${vehicle.preset_id}" data-vehicle-choice-category="tank-chassis"
          data-vehicle-choice-label="${esc(`预设 ${vehicle.preset_id} 底盘`)}"></span>
        <small><span>防御 <span data-vehicle-field-object="defense"
          data-vehicle-id="${vehicle.preset_id}"></span></span>${
            viewId === "rental" ? `<span>出租名 <b data-vehicle-rental-name="${vehicle.preset_id}">${
              esc(rentalName(vehicle) || "—")}</b></span>` : ""
          }</small>
      </span>`},
    {key: "map-appearance", label: "行走形象", width: 246,
      title: "选择角色形象基础表中的地图 actor type",
      cell: vehicle => vehicleMapAppearanceCell(vehicle, visualContext)},
    {key: "status-appearance", label: "状态界面立绘", width: 132,
      title: "分别选择 UI raw-tile 背景与运行时 OAM 使用的 CHR",
      cell: vehicle => vehicleStatusAppearanceCell(vehicle, visualContext)},
    {key: "battle-appearance", label: "战斗立绘", width: 292,
      title: "由底盘编号减 $90 固定推导，不是配置项",
      cell: vehicle => vehicleBattleAppearanceCell(vehicle)},
    {key: "sp", label: "初始 SP", align: "right", mono: true, width: 78,
      title: "代码常量，不可编辑",
      cell: vehicle => esc(vehicle.initial_sp?.value ?? "—")},
    {key: "ammo", label: "弹仓容量", align: "right", width: 86,
      cell: vehicle => `<span data-vehicle-field-object="ammo_capacity"
        data-vehicle-id="${vehicle.preset_id}"></span>`},
    {key: "weight", label: "自重 (t)", align: "right", width: 86,
      cell: vehicle => `<span data-vehicle-field-object="chassis_weight"
        data-vehicle-id="${vehicle.preset_id}"></span>`},
    {key: "total", label: "装备后总重", align: "right", mono: true, width: 96,
      cell: vehicle => derivedCell(vehicle, "total",
        vehicleTons(vehicleDerived(draftOf(vehicle), items).totalUnits / 100))},
    {key: "capacity", label: "引擎载重", align: "right", mono: true, width: 90,
      cell: vehicle => {
        const units = vehicleDerived(draftOf(vehicle), items).capacityUnits;
        return derivedCell(vehicle, "capacity", vehicleTons(units === null ? null : units / 100));
      }},
    {key: "remaining", label: "剩余载重", align: "right", mono: true, width: 90,
      cell: vehicle => {
        const units = vehicleDerived(draftOf(vehicle), items).remainingUnits;
        return derivedCell(vehicle, "remaining", vehicleTons(units === null ? null : units / 100));
      }},
    ...vehicleEquipmentSlots.slice(0, 3).map(slotColumn),
    {key: "mount_mask", label: "挂载位", mono: true, align: "right", width: 74,
      cell: vehicle => derivedCell(vehicle, "mount", draftOf(vehicle).mount_mask === null ? "未记录" : hex(draftOf(vehicle).mount_mask, 2))},
    {key: "equipped", label: "装配状态", mono: true, align: "right", width: 82,
      title: "草稿中的装备掩码",
      cell: vehicle => derivedCell(vehicle, "equipped",
        draftOf(vehicle).equipped_mask === null ? "未记录" : hex(vehicleDerived(draftOf(vehicle), items).equippedMask, 2))},
    ...vehicleEquipmentSlots.slice(3).map((slot, index) => slotColumn(slot, index + 3)),
    {key: "reset-original", label: "", title: "恢复原值", width: 36, reset: true,
      cell: vehicle => vehicleOriginalResetControl(vehicle.preset_id)},
  ];
  const visiblePresetIds = new Set(vehicles.map(vehicle => Number(vehicle.preset_id)));
  const otherPresets = allVehicles.filter(
    vehicle => !visiblePresetIds.has(Number(vehicle.preset_id)),
  );
  const otherMapSelectors = viewId === "player" && otherPresets.length ? `<section
    class="wide-card vehicle-map-selector-supplement">
      <h3>其他 preset 的行走形象</h3>
      ${dataTable({
        columns: [
          {key: "resource_id", label: "资源 ID", mono: true, width: 138,
            cell: vehicle => handleMarkup(vehicleUid(vehicle))},
          {key: "name", label: "底盘", width: 118,
            cell: vehicle => esc(chassisName(vehicle))},
          {key: "chassis_id", label: "底盘 ID", mono: true, width: 74,
            cell: vehicle => esc(vehicle.chassis_id_hex)},
          {key: "map-appearance", label: "行走形象", width: 246,
            cell: vehicle => vehicleMapAppearanceCell(vehicle, visualContext)},
        ],
        rows: otherPresets,
        rowId: vehicle => vehicle.preset_id,
      })}
    </section>` : "";
  return `${tabs}<form id="vehicle-editor" data-vehicle-view="${viewId}">
    <style>#vehicle-editor .vehicle-mount-slot {display:grid;gap:4px;min-width:0}
      #vehicle-editor .vehicle-mount-slot > span {min-width:0}</style>
    <div class="data-editor-toolbar">
      <p id="vehicle-save-state" class="${error ? "invalid" : ""}"
        ${status ? "" : "hidden"}>${esc(status)}</p>
      ${buildLogButton()}
    </div>

    ${dataTable({
      columns,
      rows: vehicles,
      rowId: vehicle => vehicle.preset_id,
      recordRoute: vehicle => `vehicles/${vehicle.preset_id}`,
    })}
    ${otherMapSelectors}
    </form>
    `;
}

export function vehicleUid(vehicle) {
  return `vehicle:${Number(vehicle.preset_id).toString(16).toUpperCase().padStart(2, "0")}`;
}

const vehicleRecordFields = [
  ["loadout_5", "底盘"],
  ["defense", "底盘防御"],
  ["chassis_weight", "底盘重量"],
  ["ammo_capacity", "弹仓容量"],
  ["mount_mask", "挂载位"],
];

const vehicleAttackScopeLabels = {single: "单体", group: "一组", all: "全体"};
function renderVehicleWeaponHoles(vehicle) {
  const shape = vehicleSlotShape(state.project, vehicle.preset_id);
  const labels = new Map(shape.loadout.map(slot => [slot.slot_id, slot.slot_name]));
  return `<section data-vehicle-weapon-holes="${vehicle.preset_id}">
    <div class="slot-title"><b>武器孔</b>${resetToOriginalButton("mount_mask", {
      disabled: true, title: "恢复三个武器孔的初始开孔状态",
    })}</div>
    ${shape.mount_mask.slots.map(hole => `<label class="equipment-state-toggle">
      <span data-vehicle-hole-object data-vehicle-id="${vehicle.preset_id}"
        data-vehicle-bit="${0x80 >> hole.weapon_hole}"></span>${esc(labels.get(hole.id) || hole.id)}</label>`).join("")}
  </section>`;
}

async function bindVehicleWeaponHoles(root, items) {
  const hosts = [...root.querySelectorAll("[data-vehicle-hole-object]")];
  if (!hosts.length) return;
  const repository = requireBrowserProjectRepository(state), revision = vehicleProjectRevision();
  const selected = await vehiclePresetFieldObjects(hosts.map(host => host.dataset.vehicleId));
  assertVehicleProjectSession(repository, revision);
  for (const host of hosts) {
    if (!host.isConnected) return;
    const id = Number(host.dataset.vehicleId);
    const mounted = selected.get(`${id}:mount_mask`);
    if (!mounted) throw new Error(`vehicle-preset 缺少开孔字段 ${id}`);
    const {field, object} = mounted;
    const bit = Number(host.dataset.vehicleBit);
    if (!vehicleSlotShape(state.project, id).mount_mask.slots.some(hole => (0x80 >> hole.weapon_hole) === bit)) {
      throw new Error("战车开孔位未发布");
    }
    mountFieldObjectBit(host, object, {
      entityHandle: field.entityHandle, fieldName: "mount_mask", bit,
      label: `${host.parentElement.textContent.trim()}开孔`,
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const draft = vehiclePresetDraft(id);
        const changed = draft.mount_mask !== value;
        draft.mount_mask = value;
        state.vehicleOriginal.presets[id].mount_mask = value;
        if (changed) {
          updateVehicleDerived(id, items);
          updateVehicleEditorState(items);
        }
      },
    });
  }
  for (const host of root.querySelectorAll("[data-vehicle-weapon-holes]")) {
    const id = Number(host.dataset.vehicleWeaponHoles);
    const field = selected.get(`${id}:mount_mask`)?.field;
    if (!field) throw new Error(`vehicle-preset 缺少开孔字段 ${id}`);
    const button = host.querySelector("[data-reset-to-original]");
    field.bind(button, (node, _value, current) => {
      node.dataset.originalDirty = String(current.hasOverride);
      node.classList.toggle("dirty", current.hasOverride);
      node.disabled = !current.hasOverride || node.dataset.resetPending === "true";
    });
    bindFieldResetToOriginalButtons(host, new Map([["mount_mask", field]]), {
      database: db,
      beforeReset: async () => {
        assertVehicleProjectSession(repository, revision);
        return {expectedVersion: field.version};
      },
      afterReset: () => {
        updateVehicleDerived(id, items);
        updateVehicleEditorState(items);
      },
      onError: error => updateVehicleEditorState(items, `重置失败：${error.message || error}`),
    });
    host.dataset.fieldObjects = "ready";
  }
}

function setVehicleEquippedSlot(draft, column, selected, items) {
  if (draft.equipped_mask === null) throw new Error("草稿未记录装备掩码；请重置整辆战车恢复 Original");
  const equippedItem = items.find(entry =>
    Number(entry.id) === Number(draft.equipment[column]));
  if (selected && !vehicleMountableSlots(equippedItem).includes(selected))
    throw new RangeError(`战车装备列 ${column} 不支持槽位 ${selected}`);
  draft.slot_assignments[column] = selected || "";
  draft.equipped_mask = setEquipmentColumnState(draft.equipped_mask, column, Boolean(selected));
  if (!selected) return;
  const category = items.find(entry => Number(entry.id) === Number(draft.equipment[column]))?.category?.id;
  draft.equipment.forEach((itemId, other) => {
    const item = items.find(entry => Number(entry.id) === Number(itemId));
    if (other !== column && ((category && item?.category?.id === category) ||
        vehicleAssignedSlot(state.project, draft, other, item) === selected)) {
      draft.equipped_mask = setEquipmentColumnState(draft.equipped_mask, other, false);
      draft.slot_assignments[other] = "";
    }
  });
}

function refreshVehicleSlotStates() {
  document.querySelectorAll("[data-vehicle-loadout]").forEach(root => {
    const draft = vehiclePresetDraft(root.dataset.vehicleLoadout);
    root.querySelectorAll("[data-vehicle-state-column]").forEach(row => {
      const column = Number(row.dataset.vehicleStateColumn);
      const status = row.querySelector("[data-vehicle-slot-status]");
      if (status) status.textContent = draft.equipped_mask === null ? "未记录"
        : equipmentColumnState(draft.equipped_mask, column) ? "已装备" : "未装备";
      const equipped = row.querySelector("[data-vehicle-assignment-choice] select");
      if (!equipped) return;
      const shape = vehicleSlotShape(state.project, root.dataset.vehicleLoadout);
      const slot = shape.equipped_mask.slots.find(entry => entry.equipment_column === column);
      const record = slot?.initial_record;
      const declaration = record ? shape[record.collection]?.[record.index] : null;
      const item = (state.project.game_data.items?.records || []).find(entry =>
        Number(entry.id) === Number(draft.equipment[column]));
      const candidates = vehicleMountableSlots(item);
      const chassis = declaration?.slot_id === "chassis";
    const selected = vehicleAssignedSlot(state.project, draft, column, item);
      const active = equipmentColumnState(draft.equipped_mask, column);
      const labels = new Map(shape.loadout.map(entry => [entry.slot_id, entry.slot_name]));
      equipped.innerHTML = `<option value="">不装备</option>${candidates.map(id =>
        `<option value="${esc(id)}">${esc(labels.get(id) || id)}</option>`).join("")}`;
      equipped.value = active ? selected || "" : "";
      equipped.disabled = chassis || !candidates.length || draft.equipped_mask === null;
      equipped.title = chassis ? "底盘位由携带槽选择" : "所在槽选择暂时不写进 ROM";
    });
  });
}

function renderVehicleLoadout(vehicle) {
  const chassis = vehicle.loadout?.find(slot => slot.slot_id === "chassis");
  const rows = vehicleEquipmentSlots.map(([category], slot) => ({
    id: String(slot), label: `携带 ${slot + 1}`,
    attributes: `data-vehicle-loadout-row="${slot}" data-vehicle-state-column="${slot}"`,
    address: vehicle.loadout?.[slot]?.source,
    itemMarkup: `<span data-vehicle-choice-object="loadout_${slot}"
      data-vehicle-id="${Number(vehicle.preset_id)}"
      data-vehicle-choice-category="${esc(category)}"
      data-vehicle-choice-label="${esc(`${chassisName(vehicle)} 携带 ${slot + 1}`)}"
      data-vehicle-choice-detail="true"></span>`,
    stateMarkup: `<div class="vehicle-equipment-slot">
      <span data-vehicle-assignment-choice data-vehicle-id="${vehicle.preset_id}"
        data-vehicle-assignment-column="${slot}"></span>
      <small title="所在槽用于预览；装备状态写入 ROM">†</small></div>`,
    statusMarkup: `<output data-vehicle-slot-status="${slot}">—</output>`,
    resetMarkup: `<span data-vehicle-slot-reset="${slot}" data-vehicle-id="${vehicle.preset_id}">${
      resetToOriginalButton(slot, {disabled: true})}</span>`,
    previewMarkup: `<div data-vehicle-loadout-preview="${esc(category)}"></div>`,
  }));
  if (chassis) rows.push({
    id: "chassis", label: "携带 6", attributes: 'data-vehicle-loadout-row="chassis" data-vehicle-state-column="5"',
    address: chassis.source,
    itemMarkup: `<span data-vehicle-choice-object="loadout_5"
      data-vehicle-id="${Number(vehicle.preset_id)}" data-vehicle-choice-category="tank-chassis"
      data-vehicle-choice-label="${esc(`预设 ${vehicle.preset_id} 携带 6 · 底盘`)}"></span>`,
    stateMarkup: "底盘",
    statusMarkup: '<output data-vehicle-slot-status="5">—</output>',
  });
  else rows.push({
    id: "chassis", label: "携带 6",
    itemMarkup: '<span aria-disabled="true">—</span>',
    stateMarkup: "—", statusMarkup: "—",
  });
  for (const slot of [6, 7]) rows.push({
    id: String(slot), label: `携带 ${slot + 1}`,
    itemMarkup: '<span aria-disabled="true">—</span>',
    stateMarkup: "—", statusMarkup: "—",
  });
  return `<div data-vehicle-loadout="${Number(vehicle.preset_id)}">
    ${entityDetailEquipmentMarkup({rows})}
    <a class="editor-inline-link" href="?view=save&amp;saveSection=party${Number.isInteger(vehicle.vehicle_slot)
      ? `&amp;saveEntity=vehicle-${vehicle.vehicle_slot}` : ""}"
      aria-label="当前存档战车装备" title="当前存档战车装备">↗</a>
    <p id="vehicle-save-state" class="module-editor-message" hidden role="alert"></p>
  </div>`;
}

/** 受击与行走形象一样，只排列自动循环的画面。 */
async function bindVehicleHitMotion(root, {project, preview, enemyActions}) {
  if (!root) return;
  const sources = await battleActorSources();
  if (!root.isConnected) return;
  if (!enemyActions?.records) throw new Error("缺少 enemy-action 当前有效正文");
  const catalog = battleScenePreviewCatalog(project);
  const appearanceKey = battleScenePartyAppearanceKey(catalog, preview.party[0]);
  const {groups} = vehicleHitMotions({
    assets: project.visuals.weapon_effect_catalog.asset_catalog_data,
    actorCatalog: catalog.actorCatalog, appearanceKey, records: enemyActions.records,
  });
  root.innerHTML = '<div class="vehicle-hit-gallery"></div>';
  const host = root.firstElementChild;
  groups.forEach((motion, index) => {
    const card = document.createElement("figure");
    card.className = "vehicle-hit-figure";
    card.dataset.vehicleHitKind = String(index);
    card.innerHTML = `<canvas aria-label="走法 ${index + 1}受击车体"></canvas>
      <figcaption>走法 ${index + 1}</figcaption>`;
    host.append(card);
    paintVehicleHitMotion(card, {motion, sources});
  });
  if (!groups.length) host.replaceChildren();
}

/** 只编排页面输入；排布、目标解析、取帧与播放都用怪物详情页的场景入口。 */
async function bindVehicleBattleScene(root) {
  if (!root || root.dataset.bound) return;
  // 炮弹与道具预览读取共享当前存档。bindSaveEditor 完成初始化及 Working
  // 恢复后会重绘页面；此前不能把 null 交给 codec，也不能绑定尚未生成的库存控件。
  if (!saveWorkspaceReady()) return;
  root.dataset.bound = "1";
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  // 偏移属于通道，不属于某辆车；快速切到下一辆时先落下上一页已接受的草稿。
  const anchorAutoSave = launchAnchorSaveQueue(repository);
  await anchorAutoSave.flush();
  const failures = await ensureBattleSceneData();
  if (failures.length) throw new Error(`战斗资源不可用：${failures.join("、")}`);
  // 详情页按需取当前有效正文，不能依赖此前去过角色/怪物/编队页留下的投影。
  const entityCatalog = await loadEntityCatalog();
  const inputs = await entityPreviewInputs(db, entityCatalog.handleFor("vehicle",
    Number(root.dataset.vehicleBattleScene)), "vehicle.battle", {catalog: entityCatalog});
  const weaponAssets = await effectiveLaunchAnchorAssets(
    inputs["weapon-attack-parameter"]);
  const characters = inputs["character-initial-record"];
  const monsters = inputs.monster;
  const battleTest = inputs["battle-test-point"];
  const itemService = inputs["battle-item-service"];
  assertVehicleProjectSession(repository, revision);
  if (!root.isConnected) return;
  if (!characters || !monsters || !battleTest) {
    throw new Error("战斗预览缺少当前角色、怪物或编队正文");
  }
  if (!Array.isArray(itemService?.human_item_presentations)) {
    throw new Error("人类道具战斗表现声明尚未加载");
  }
  if (!Array.isArray(itemService?.vehicle_item_presentations)) {
    throw new Error("战车道具战斗表现声明尚未加载");
  }
  const project = {
    ...state.project,
    visuals: {...state.project.visuals, weapon_effect_catalog: {
      ...state.project.visuals.weapon_effect_catalog, asset_catalog_data: weaponAssets,
    }},
    game_data: {
      ...state.project.game_data,
      characters, monsters, battle_test: battleTest, battle_item_service: itemService,
      vehicles: {
        ...state.project.game_data.vehicles,
        presets: state.project.game_data.vehicles.presets.map(vehicleWithDraftChassis),
      },
    },
  };
  const catalog = battleScenePreviewCatalog(project);
  const vehicle = catalog.vehiclePresetById.get(Number(root.dataset.vehicleBattleScene));
  if (!vehicle) throw new Error("当前战车没有已发布的战斗形象");
  const selection = selectBattlePreviewFormation(project);
  const {base} = selection;
  const channels = catalog.partyAttackChannels.filter(channel => channel.loadoutSlotId);
  const loadoutRoot = document.querySelector(`[data-vehicle-loadout="${vehicle.id}"]`);
  vehicleEquipmentSlots.forEach(([category], column) => {
    const key = channels.find(channel => channel.categoryId === category)?.key || `column:${column}`;
    loadoutRoot.querySelector(`[data-vehicle-loadout-preview="${category}"]`).innerHTML =
      `<button class="button" type="button" data-vehicle-preview-play="${key}">发射</button>
       <small data-vehicle-loadout-effect="${key}"></small>`;
  });
  const firstChannel = channels.find(channel => vehicle.attacks[channel.key]) || channels[0];
  let firingColumn = 0;
  let preview = normalizeBattleScenePreview({
    ...base,
    party: base.party.map((member, index) => ({
      ...member,
      visible: index === 0,
      vehiclePresetId: vehicle.id,
      riding: true,
      attacks: {...member.attacks, ...vehicle.attacks},
    })),
    attack: {...base.attack, side: "party", attacker: 0, channel: firstChannel.key},
  }, project);
  const enemySlots = battleSceneActiveEnemySlots(preview);
  const saveSlot = Number(state.vehicleSaveSlot) === 2 ? 2 : 1;
  const shellBar = project.game_data.vehicles.runtime_inventories.bars.find(bar => bar.id === "shells");
  const shellSlots = Array.from({length: shellBar.slots}, (_, index) => {
    const type = currentFieldObject(
      vehicleSaveFieldId(saveSlot, vehicle.preset.vehicle_slot, `shell_type.${index}`)).value;
    return {index, type, source: catalog.shellAttackChannel.sources.find(source => Number(source.source.id) === type)};
  });
  let selectedShellSlot = null;
  const runtimeRoot = document.querySelector("[data-vehicle-runtime-bars]");
  for (const slot of runtimeRoot ? shellSlots : []) {
    runtimeRoot.querySelector(`[data-vehicle-shell-action="${slot.index}"]`).innerHTML =
      `<button class="button" type="button" data-vehicle-shell-fire="${slot.index}">发射</button>
       <small data-vehicle-shell-effect="${slot.index}"></small>`;
  }
  const canvas = mountBattlePreviewStage(root, {kind: "vehicle", label: "战车攻击",
    selection, preview, enemySlots, formationMarkup: battlePreviewFormationMarkup,
    scopeLabels: vehicleAttackScopeLabels, automaticScopeLabel: "按武器"});
  await bindVehicleHitMotion(document.querySelector("[data-vehicle-hit-motion]"),
    {project, preview, enemyActions: inputs["enemy-action"]});
  const anchorPanel = document.querySelector(`[data-vehicle-launch-anchors="${vehicle.id}"]`);
  if (!anchorPanel) throw new Error("发射点页签未挂载");
  const launchFields = await db.getFields(ATTACK_LAUNCH_ANCHORS_RESOURCE_ID);
  assertVehicleProjectSession(repository, revision);
  function mountAnchorFields() {
    for (const channel of channels) {
      if (!channel.launchAnchorProfile) throw new Error("武器类别缺少已发布发射点");
      if (anchorPanel.querySelector(`[data-profile="${channel.launchAnchorProfile.id}"]`)) continue;
      const editor = document.createElement("section");
      editor.dataset.vehicleAnchorEditor = "";
      anchorPanel.append(editor);
      mountAnchorProfile(channel, editor);
    }
    anchorPanel.dataset.fieldObjects = "ready";
  }
  function mountAnchorProfile(channel, anchorEditor) {
    const profile = channel.launchAnchorProfile;
    anchorEditor.dataset.profile = profile.id;
    const profileFields = launchFields.filter(field => field.recordId === profile.id);
    if (profileFields.length !== 2) throw new Error("发射锚点字段不完整");
    const xBounds = profileFields.find(field => field.fieldName === "x").editDomain.allowed_integer_values;
    const yBounds = profileFields.find(field => field.fieldName === "y").editDomain.allowed_integer_values;
    const value = {...launchAnchorControlValue(profile),
      xMin: Number(profile.actor_reference_x) - xBounds.maximum,
      xMax: Number(profile.actor_reference_x) - xBounds.minimum,
      yMin: yBounds.minimum, yMax: yBounds.maximum};
    anchorEditor.innerHTML = anchorFieldsMarkup(value, null, null, {
      ...value, prefix: "vehicle-attack-anchor", title: `${channel.anchorLabel || channel.label}发射点`,
      xLabel: "前向偏移（像素）", yLabel: "向上偏移（像素）",
      readout: `前 ${value.x} / 上 ${value.y}`,
      marker: writeAccessMarker({writebackMissing: profileFields.some(field => !field.physical)}),
    }) + resetToOriginalButton(profile.id)
      + `<p class="module-editor-message" data-vehicle-anchor-error hidden aria-live="polite"></p>`;
    const readout = anchorEditor.querySelector("[data-vehicle-attack-anchor-readout]");
    for (const field of profileFields) {
      const control = anchorEditor.querySelector(`[data-vehicle-attack-anchor-${field.fieldName}]`);
      let painted = control.value;
      field.bind(control, (node, value, _field, reason) => {
        const displayed = String(field.fieldName === "x" ? Number(profile.actor_reference_x) - value : value);
        if (reason === "initial" || reason === "reset" || node.value === painted) node.value = displayed;
        painted = displayed;
      });
      field.bind(readout, node => {
        const x = profileFields.find(entry => entry.fieldName === "x").value;
        const y = profileFields.find(entry => entry.fieldName === "y").value;
        node.textContent = `前 ${Number(profile.actor_reference_x) - x} / 上 ${y}`;
      });
    }
    const enableAnchor = () => anchorEditor.querySelectorAll("input").forEach(control => {control.disabled = false;});
    bindFieldResetToOriginalButtons(anchorEditor, new Map([[profile.id, profileFields]]), {
      database: db,
      beforeReset: async () => {
        if (!anchorEditor.isConnected) throw new Error("发射点页面已切换");
        anchorAutoSave.cancel(profile.id);
        anchorEditor.querySelectorAll("input").forEach(control => {control.disabled = true;});
        await anchorAutoSave.flush();
        anchorAutoSave.cancel(profile.id);
        assertVehicleProjectSession(repository, revision);
        return {expectedVersion: profileFields[0].version};
      },
      afterReset: async () => {
        try {
          const restored = await effectiveLaunchAnchorAssets(weaponAssets);
          Object.assign(profile, restored.attack_launch_anchor_profiles.find(row => row.id === profile.id));
          if (!root.isConnected) return;
          mountAnchorProfile(channel, anchorEditor);
          anchorError(anchorEditor, null);
          await paint(channel.key === preview.attack.channel);
        } finally {enableAnchor();}
      },
      onError: error => {enableAnchor(); anchorError(anchorEditor, error);},
    });
    anchorEditor.dataset.fieldObjects = "ready";
  }
  function refreshControls() {
    mountAnchorFields();
    for (const slot of runtimeRoot ? shellSlots : []) {
      const shellPreview = normalizeBattleScenePreview({...preview,
        party: preview.party.map((member, index) => index ? member : {
          ...member, attacks: {...member.attacks, shell: slot.source?.key || ""},
        }), attack: {...preview.attack, channel: "shell"},
      }, project);
      const attack = resolveBattleSceneAttack(shellPreview, project);
      const button = runtimeRoot.querySelector(`[data-vehicle-shell-fire="${slot.index}"]`);
      button.classList.toggle("is-active", preview.attack.channel === "shell" && selectedShellSlot === slot.index);
      button.disabled = !slot.source || !attack.available;
      runtimeRoot.querySelector(`[data-vehicle-shell-effect="${slot.index}"]`).textContent =
        attack.available && slot.source ? attack.scopeLabel : "";
    }
    const attack = resolveBattleSceneAttack(preview, project);
    battlePreviewTargets(root,
      `${attack.scopeLabel} · ${attack.targets.length} 个目标：${
        attack.targetIndices.map(index => `E${index + 1}`).join("、")}`);
    loadoutRoot.querySelectorAll("[data-vehicle-preview-play]").forEach(button => {
      const key = button.dataset.vehiclePreviewPlay;
      const slot = Number(button.closest("[data-vehicle-state-column]").dataset.vehicleStateColumn);
      const itemId = vehiclePresetDraft(vehicle.id).equipment[slot];
      const source = catalog.attackSources.find(source => source.group === "战车武器" && Number(source.source?.id) === itemId);
      button.classList.toggle("is-active", slot === firingColumn);
      button.disabled = !source?.visualAvailable;
      loadoutRoot.querySelector(`[data-vehicle-loadout-effect="${key}"]`).textContent =
        source?.visualAvailable ? vehicleAttackScopeLabels[source.targetScope] || "" : "";
    });
  }
  async function paint(play = false) {
    assertVehicleProjectSession(repository, revision);
    if (!root.isConnected) return;
    preview.party[0].attacks.shell = shellSlots[selectedShellSlot]?.source?.key || "";
    for (const channel of channels) {
      const slot = vehicleEquipmentSlots.findIndex(([category]) => category === channel.categoryId);
      const itemId = vehiclePresetDraft(vehicle.id).equipment[slot];
      preview.party[0].attacks[channel.key] = channel.sources.find(
        source => Number(source.source.id) === itemId,
      )?.key || "";
    }
    const firingDraft = vehiclePresetDraft(vehicle.id);
    const firingItem = project.game_data.items.records.find(item => Number(item.id) === firingDraft.equipment[firingColumn]);
    const assigned = vehicleAssignedSlot(state.project, firingDraft, firingColumn, firingItem);
    const firingChannel = channels.find(channel => channel.loadoutSlotId === assigned);
    if (firingChannel) {
      preview.attack.channel = firingChannel.key;
      preview.party[0].attacks[firingChannel.key] = firingChannel.sources.find(
        source => Number(source.source.id) === Number(firingItem?.id))?.key || "";
    } else if (Number.isInteger(firingColumn)) {
      preview.party[0].attacks[preview.attack.channel] = "";
    }
    preview = normalizeBattleScenePreview(preview, project);
    refreshControls();
    const messageSaveSlot = Number(state.vehicleSaveSlot);
    if (play) {
      await playBattleSceneComposerAttack(canvas, {preview, project, messageSaveSlot});
    } else await paintBattleSceneComposerCanvas(canvas, {preview, project, messageSaveSlot});
  }
  const showError = bindBattlePreviewControls(root, () => preview, paint);
  runtimeRoot?.querySelectorAll('[data-vehicle-loadout-preview^="item:"]').forEach(host => {
    const itemId = currentFieldObject(vehicleSaveFieldId(saveSlot,
      vehicle.preset.vehicle_slot, `item.${host.dataset.vehicleLoadoutPreview.split(":")[1]}`)).value;
    host.innerHTML = battleItemRowPreview(itemId, catalog);
    bindBattleItemRowText(host, canvas);
    const source = catalog.itemAttackChannel.sources.find(source => source.source.id === itemId);
    host.addEventListener("click", event => {
      const button = event.target.closest("[data-battle-item-use]");
      if (!button || button.disabled) return;
      firingColumn = null;
      preview.attack.channel = "item";
      preview.party[0].attacks.item = source.key;
      void paint(true).catch(showError);
    });
  });
  const anchorError = (anchorEditor, error) => {
    const message = anchorEditor.querySelector("[data-vehicle-anchor-error]");
    message.hidden = !error;
    message.textContent = error ? String(error?.message || error) : "";
  };
  anchorPanel.addEventListener("input", event => {
    if (!event.target.matches("[data-vehicle-attack-anchor-x], [data-vehicle-attack-anchor-y]")) return;
    const anchorEditor = event.target.closest("[data-vehicle-anchor-editor]");
    const channel = channels.find(entry => entry.launchAnchorProfile.id === anchorEditor.dataset.profile);
    const profile = channel.launchAnchorProfile;
    const onError = error => anchorError(anchorEditor, error);
    const point = {
      x: anchorEditor.querySelector("[data-vehicle-attack-anchor-x]").value,
      y: anchorEditor.querySelector("[data-vehicle-attack-anchor-y]").value,
    };
    try {
      Object.assign(profile, editedLaunchAnchorProfile(profile, point));
      onError(null);
      anchorEditor.querySelector("[data-vehicle-attack-anchor-readout]").textContent =
        `前 ${profile.forward_offset_pixels} / 上 ${profile.upward_offset_pixels}`;
      anchorAutoSave.commit(profile.id, {profile: {...profile}, point, onError});
      void paint(channel.key === preview.attack.channel).catch(onError);
    } catch (error) {
      onError(error);
    }
  });
  loadoutRoot.addEventListener("change", event => {
    const choice = event.target.closest('[data-vehicle-choice-detail]');
    const assignment = event.target.closest('[data-vehicle-assignment-choice]');
    if (!choice && !assignment) return;
    if (assignment && event.target !== assignment) return;
    firingColumn = Number(choice?.dataset.vehicleChoiceObject?.slice('loadout_'.length)
      ?? assignment.dataset.vehicleAssignmentColumn);
    const [category] = vehicleEquipmentSlots[firingColumn];
    const channel = channels.find(item => item.categoryId === category);
    if (channel) preview.attack.channel = channel.key;
    void paint().catch(showError);
  });
  loadoutRoot.addEventListener("click", event => {
    const button = event.target.closest("[data-vehicle-preview-play]");
    if (!button) return;
    firingColumn = Number(button.closest("[data-vehicle-state-column]").dataset.vehicleStateColumn);
    preview.attack.channel = channels.find(channel => channel.key === button.dataset.vehiclePreviewPlay)?.key || "main";
    void paint(true).catch(showError);
  });
  runtimeRoot?.addEventListener("click", event => {
    const button = event.target.closest("[data-vehicle-shell-fire]");
    if (!button) return;
    firingColumn = null;
    selectedShellSlot = Number(button.dataset.vehicleShellFire);
    preview.attack.channel = "shell";
    void paint(true).catch(showError);
  });
  await paint();
}

/** 记录页：配装与试演、外观与动作、初始停放、字段与记录定位依次分组。 */
export function renderVehicleRecord(data, vehicles, presetId) {
  vehicles = vehicles.map(vehicleWithDraftChassis);
  const selected = vehicles.find(
    vehicle => Number(vehicle.preset_id) === Number(presetId));
  if (!selected) return null;
  const viewId = selected.displayViews.includes("rental") ? "rental" : "player";
  vehicles = vehicles.filter(vehicle => vehicle.displayViews.includes(viewId));
  const index = vehicles.findIndex(
    vehicle => Number(vehicle.preset_id) === Number(presetId));
  if (index < 0) return null;
  ensureVehicleDraft();
  const vehicle = vehicles[index];
  const uid = vehicleUid(vehicle);
  const draft = vehiclePresetDraft(vehicle.preset_id);
  const valueFor = row => {
    const fieldKey = row.fieldKey || row.key;
    if (["defense", "chassis_weight", "ammo_capacity"].includes(fieldKey)) {
      return `<span data-vehicle-field-object="${esc(fieldKey)}"
        data-vehicle-id="${vehicle.preset_id}"></span>`;
    }
    const draftKey = fieldKey === "chassis_weight"
      ? "chassis_weight_units" : fieldKey;
    const value = fieldKey === "loadout_5" ? draft?.equipment?.[5] : draft?.[draftKey];
    const label = fieldKey === "chassis_weight"
      ? `${vehicleTons(Number(value) / 100)} · ${value} 内部单位`
      : fieldKey === "mount_mask" ? (value === null ? "未记录" : hex(value, 2)) : value;
    return `<span class="vehicle-detail-value"
      data-vehicle-field-value="${esc(fieldKey)}"
      data-vehicle-current-value="${esc(value ?? "")}">${esc(label ?? "—")}</span>`;
  };
  const addressTable = fields => entityDetailFieldTableMarkup({
    fields: entityAddressFields(reconcileFieldAddressRows({uid, fields, valueFor}).map(row => {
      if (row.key !== "loadout_5") return row;
      const address = vehicle.loadout?.find(slot => slot.slot_id === "chassis")?.source;
      return address?.space === "prg" && address.length === 1
        ? {...row, address, length: 1, hasRange: true} : row;
    })),
    pageStatus: {
      selection: uid,
      dirty: "",
    },
  });
  const initializer = data.vehicles?.initializer || {};
  const visualContext = vehicleVisualContext();
  const panels = [
      entityDetailSection("equipment", "装备", renderVehicleLoadout(vehicle)),
      entityDetailSection("equipment-state", "装备状态", `<div>
        ${renderVehicleWeaponHoles(vehicle)}
        <div data-vehicle-launch-anchors="${Number(presetId)}"></div>
      </div>`),
      entityDetailSection("appearance", "形象与预览", `<div class="vehicle-motion-visuals">
        <div data-vehicle-battle-scene="${Number(presetId)}"></div>
        <div class="vehicle-walk-row">
          <div class="vehicle-walk-binding"><h4>行走形象</h4>
            ${vehicleMapAppearanceCell(vehicle, visualContext)}</div>
          <div data-vehicle-walk-strip="${Number(presetId)}"></div>
        </div>
        <div class="vehicle-battle-row">
          <section class="vehicle-battle-binding"><h4>战斗立绘</h4>
            ${vehicleBattleAppearanceCell(vehicle)}</section>

        </div>
        <div class="vehicle-status-row">
          <div class="vehicle-status-heading"><h4>状态界面立绘</h4></div>
          ${vehicleStatusAppearanceCell(vehicle, visualContext)}
        </div>
        <section class="vehicle-hit-motion"><h4>受击动作</h4>
          <div data-vehicle-hit-motion></div></section>
      </div>`, {wide: true, flat: true}),
    ];
  if (viewId === "player") {
    panels.push(entityDetailPanel("位置", `<div data-vehicle-record-editor>
      ${renderVehiclePlacement(vehicle)}
    </div>`, {wide: true, flat: true}));
  } else {
    panels.push(entityDetailPanel("操作", `<div data-vehicle-record-editor>
      ${vehicleOriginalResetControl(vehicle.preset_id, "重置")}
    </div>`));
  }
  panels.push(
      entityDetailSection("fields", "字段",
        addressTable(vehicleRecordFields)),
      entityDetailPanel("标识", fields([
        ["战车槽", vehicle.vehicle_slot === null || vehicle.vehicle_slot === undefined
          ? "—" : `${vehicle.vehicle_slot + 1}`],
        ["预设 ID", `<span class="mono">${esc(vehicle.preset_id_hex)}</span>`],
        ["底盘 ID", `<span class="mono">${esc(vehicle.chassis_id_hex)}</span>`],
        ["初始 SP", `<span class="mono">${esc(vehicle.initial_sp?.value ?? "—")}</span>`],
      ])),
      entityDetailPanel("引用关系", `<div class="record-field">
        <span class="record-field-value">${resourceForwardReferenceCell(uid)}</span>
      </div>`),
  );
  return recordPage({
    title: viewId === "rental" ? rentalName(vehicle) || chassisName(vehicle) : chassisName(vehicle),
    uid,
    physicalRows: (vehicle.loadout || []).map((slot, index) => ({
      label: `装备槽 ${index + 1}`, address: slot.source,
    })).filter(row => row.address),
    backLabel: viewId === "rental" ? "全部出租战车" : "全部玩家战车",
    prevId: index > 0 ? vehicles[index - 1].preset_id : null,
    nextId: index < vehicles.length - 1 ? vehicles[index + 1].preset_id : null,
    panels: [entityDetailPageMarkup({heading: false, sections: panels})],
  });
}

/**
 * 载具的初始停放位置。
 *
 * 权威是 bank $1C 的三张并行表（$8E4C 场景 ID / $8E57 X / $8E5F Y），由
 * $1C:$8E1F 铺进场景对象槽。玩家找到车之后可以停到任何地方，那之后位置走
 * 存档，这张表只决定"一开始停在哪"。
 *
 * 场景选择与停放点预览由 scene 组件提供，保存仍走本页的 placement 草稿。
 */
function renderVehiclePlacement(vehicle) {
  const slot = Number(vehicle.vehicle_slot);
  const draft = state.vehicleDraft?.placement?.[slot];
  if (!draft) return "";
  const scenes = state.project?.scenes?.editable_scenes || [];
  return `<div class="vehicle-placement-editor">
    <div class="vehicle-placement-toolbar">
      <div class="record-editor-actions">
        ${vehicleOriginalResetControl(vehicle.preset_id, "Reset Original")}
      </div>
    </div>
    <label class="toolbar-field"><span>初始停放点</span>
      <span data-vehicle-placement-choice data-vehicle-id="${slot}"></span></label>
    ${draft.placed ? scenePositionPickerMarkup({
        entries: scenes.filter(scene => Number(scene.id) > 0),
        sceneId: draft.scene_id, x: draft.x, y: draft.y,
        label: "初始停放点", pointLabel: "停放点", minSceneId: 1,
      }) : ``}
  </div>`;
}

/** 记录页与存档属性页共用唯一当前存档及统一 field_id 控件。 */
function updateVehicleDerived(presetId, items) {
  const record = vehiclePresetDraft(presetId);
  if (!record) return;
  const derived = vehicleDerived(record, items);
  const values = {
    total: vehicleTons(derived.totalUnits / 100),
    capacity: vehicleTons(derived.capacityUnits === null ? null : derived.capacityUnits / 100),
    remaining: vehicleTons(derived.remainingUnits === null ? null : derived.remainingUnits / 100),
    equipped: record.equipped_mask === null ? "未记录" : hex(derived.equippedMask, 2),
    mount: record.mount_mask === null ? "未记录" : hex(record.mount_mask, 2),
  };
  document.querySelectorAll(`[data-vehicle-derived="${presetId}"]`).forEach(node => {
    node.textContent = values[node.dataset.derivedField] ?? "—";
  });
  document.querySelectorAll(`[data-vehicle-status-preset="${presetId}"]`)
    .forEach(refreshVehicleStatusParts);
}

function updateVehicleEditorState(items, message = "") {
  if (!state.vehicleDraft || !state.vehicleOriginal) return;
  state.vehicleMessage = message;
  const viewId = state.vehicleTab === "rental" ? "rental" : "player";
  vehicleTableDirty();
  const error = vehicleDraftError(items, viewId);
  const status = $("#vehicle-save-state");
  if (status) {
    const text = vehicleEditorStatus(items, viewId);
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle("invalid", Boolean(error));
  }
  const root = $("#vehicle-editor") ||
    document.querySelector("[data-vehicle-record-editor]") ||
    document.querySelector("[data-vehicle-loadout]");
  if (root) updateVehicleOriginalControls(root, viewId);
}

async function bindVehicleFieldObjects(form, items) {
  const hosts = [...form.querySelectorAll('[data-vehicle-field-object]')];
  const choices = [...form.querySelectorAll('[data-vehicle-choice-object]')];
  const bits = [...form.querySelectorAll('[data-vehicle-bit-object]')];
  const assignments = [...form.querySelectorAll('[data-vehicle-assignment-choice]')];
  const placements = [...form.querySelectorAll('[data-vehicle-placement-choice]')];
  const positionPickers = [...form.querySelectorAll('.vehicle-placement-editor [data-scene-position-picker]')];
  if (!hosts.length && !choices.length && !bits.length && !assignments.length
      && !placements.length && !positionPickers.length) return;
  const repository = requireBrowserProjectRepository(state);
  const revision = vehicleProjectRevision();
  const byField = await vehiclePresetFieldObjects([
    ...hosts, ...choices, ...bits, ...assignments,
  ].map(host => host.dataset.vehicleId), {placement: placements.length > 0});
  if (!vehicleProjectSessionMatches(repository, revision) || !form.isConnected) return;
  for (const host of hosts) {
    const id = Number(host.dataset.vehicleId);
    const name = host.dataset.vehicleFieldObject;
    const selected = byField.get(`${id}:${name}`);
    if (!selected) throw new Error(`vehicle-preset 缺少字段对象 ${id}:${name}`);
    const draftKey = name === 'chassis_weight' ? 'chassis_weight_units' : name;
    mountFieldObjectField(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: name,
      scale: name === 'chassis_weight' ? 100 : 1,
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const draft = vehiclePresetDraft(id);
        const changed = draft[draftKey] !== value;
        draft[draftKey] = value;
        if (state.vehicleOriginal?.presets[id]) state.vehicleOriginal.presets[id][draftKey] = value;
        if (changed) {
          updateVehicleDerived(id, items);
          updateVehicleEditorState(items);
        }
      },
    });
  }
  for (const host of choices) {
    const id = Number(host.dataset.vehicleId);
    const name = host.dataset.vehicleChoiceObject;
    const slot = Number(name.slice('loadout_'.length));
    const selected = byField.get(`${id}:${name}`);
    if (!selected) throw new Error(`vehicle-preset 缺少字段对象 ${id}:${name}`);
    let initialized = false;
    mountFieldObjectChoice(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: name,
      label: host.dataset.vehicleChoiceLabel,
      optionsMarkup: value => vehicleItemOptions(items,
        host.dataset.vehicleChoiceCategory, value),
      pickerMarkup: (value, controlMarkup) => itemPickerFieldMarkup({
        records: items, value, controlMarkup,
        label: host.dataset.vehicleChoiceLabel,
        allowedCategories: host.dataset.vehicleChoiceCategory === 'tank-chassis'
          ? ['tank-chassis'] : vehicleEquipmentSlots.map(([category]) => category),
      }),
      afterCommit: async () => {
        if (slot === 5) {
          if (host.isConnected) await render();
          return;
        }
        const mask = byField.get(`${id}:equipped_mask`)?.field;
        const value = vehiclePresetDraft(id).equipped_mask;
        if (mask && value !== null && mask.value !== value) {
          await mask.set(value);
          if (state.vehicleOriginal?.presets?.[id])
            state.vehicleOriginal.presets[id].equipped_mask = value;
        }
        if (host.isConnected) updateVehicleEditorState(items);
      },
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const draft = vehiclePresetDraft(id);
        const changed = draft.equipment[slot] !== value;
        const previousItem = items.find(entry => Number(entry.id) === draft.equipment[slot]);
        const selectedSlot = vehicleAssignedSlot(state.project, draft, slot, previousItem);
        draft.equipment[slot] = value;
        const original = state.vehicleOriginal?.presets?.[id];
        if (original) original.equipment[slot] = value;
        if (slot === 5) {
          if (initialized && changed) updateVehicleEditorState(items);
          initialized = true;
          return;
        }
        if (initialized && changed) {
          const item = items.find(entry => Number(entry.id) === value);
          const nextSlot = vehicleMountableSlots(item).includes(selectedSlot) ? selectedSlot : '';
          draft.slot_assignments[slot] = nextSlot;
          if (draft.equipped_mask !== null) {
            setVehicleEquippedSlot(draft, slot,
              equipmentColumnState(draft.equipped_mask, slot) ? nextSlot : '', items);
          }
          refreshVehicleSlotStates();
          updateVehicleDerived(id, items);
          updateVehicleEditorState(items);
        }
        initialized = true;
      },
    });
    initialized = true;
  }
  for (const host of assignments) {
    const id = Number(host.dataset.vehicleId);
    const column = Number(host.dataset.vehicleAssignmentColumn);
    const selected = byField.get(`${id}:equipped_mask`);
    if (!selected) throw new Error(`vehicle-preset 缺少装备掩码字段对象 ${id}`);
    const shape = vehicleSlotShape(state.project, id);
    const slot = shape.equipped_mask.slots.find(entry => entry.equipment_column === column);
    if (!slot) throw new Error(`战车装备列 ${column} 未发布`);
    const record = slot.initial_record;
    const declaration = record ? shape[record.collection]?.[record.index] : null;
    const chassis = declaration?.slot_id === 'chassis';
    const labels = new Map(shape.loadout.map(entry => [entry.slot_id, entry.slot_name]));
    const draft = vehiclePresetDraft(id);
    const currentItem = () => items.find(item => Number(item.id) === Number(draft.equipment[column]));
    mountFieldObjectMappedChoice(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: 'equipped_mask',
      label: `装备 ${column + 1} 所在槽`,
      optionsMarkup: () => `<option value="">不装备</option>${vehicleMountableSlots(currentItem())
        .map(slotId => `<option value="${esc(slotId)}">${esc(labels.get(slotId) || slotId)}</option>`).join('')}`,
      allowedSelection: selection => !selection ||
        vehicleMountableSlots(currentItem()).includes(selection),
      selectionValue: value => equipmentColumnState(value, column)
        ? vehicleAssignedSlot(state.project, draft, column, currentItem()) || '' : '',
      fieldValueFor: selection => {
        const projected = copyEditorDraft(draft);
        setVehicleEquippedSlot(projected, column, selection, items);
        return projected.equipped_mask;
      },
      disabled: () => chassis
        || !vehicleMountableSlots(currentItem()).length || draft.equipped_mask === null,
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        draft.equipped_mask = value;
        if (state.vehicleOriginal?.presets?.[id])
          state.vehicleOriginal.presets[id].equipped_mask = value;
      },
      afterCommit: selection => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        setVehicleEquippedSlot(draft, column, selection, items);
        const original = state.vehicleOriginal?.presets?.[id];
        if (original) original.slot_assignments = copyEditorDraft(draft.slot_assignments);
        refreshVehicleSlotStates();
        updateVehicleDerived(id, items);
        updateVehicleEditorState(items);
        host.dispatchEvent(new Event('change', {bubbles: true}));
      },
    });
  }
  if (assignments.length) refreshVehicleSlotStates();
  for (const host of bits) {
    const id = Number(host.dataset.vehicleId);
    const bit = Number(host.dataset.vehicleBit);
    if (vehiclePresetDraft(id).mount_mask === null) {
      host.textContent = '未记录';
      continue;
    }
    if (!vehicleSlotShape(state.project, id).mount_mask.slots.some(
      hole => (0x80 >> hole.weapon_hole) === bit)) {
      throw new Error(`vehicle-preset 缺少开孔位 ${id}:${bit}`);
    }
    const selected = byField.get(`${id}:mount_mask`);
    if (!selected) throw new Error(`vehicle-preset 缺少字段对象 ${id}:mount_mask`);
    mountFieldObjectBit(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: 'mount_mask', bit,
      label: `${host.dataset.vehicleBitLabel}开孔`,
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const draft = vehiclePresetDraft(id);
        const changed = draft.mount_mask !== value;
        draft.mount_mask = value;
        if (state.vehicleOriginal?.presets?.[id])
          state.vehicleOriginal.presets[id].mount_mask = value;
        if (changed) {
          updateVehicleDerived(id, items);
          updateVehicleEditorState(items);
        }
      },
    });
  }
  const scenes = (state.project?.scenes?.editable_scenes || [])
    .filter(scene => Number(scene.id) > 0);
  for (const host of placements) {
    const slot = Number(host.dataset.vehicleId);
    const selected = byField.get(`${slot}:scene_id`);
    if (!selected) throw new Error(`vehicle-preset 缺少停放字段对象 ${slot}:scene_id`);
    mountFieldObjectChoice(host, selected.object, {
      entityHandle: selected.field.entityHandle, fieldName: 'scene_id',
      label: '初始停放点', nullable: true,
      optionsMarkup: () => `<option value="">未放置</option>${scenes.map(scene =>
        `<option value="${Number(scene.id)}">${esc(scene.name || `场景 ${scene.id}`)}</option>`).join('')}`,
      onValue: value => {
        if (!vehicleProjectSessionMatches(repository, revision) || !host.isConnected) return;
        const row = state.vehicleDraft?.placement?.[slot];
        if (!row) return;
        row.scene_id = value;
        row.placed = value !== null;
        const original = state.vehicleOriginal?.placement?.[slot];
        if (original) {original.scene_id = value; original.placed = value !== null;}
        updateVehicleEditorState(items);
      },
      afterCommit: () => render(),
    });
  }
  for (const root of positionPickers) {
    const slot = Number(root.closest('.vehicle-placement-editor')
      ?.querySelector('[data-vehicle-placement-choice]')?.dataset.vehicleId);
    const selected = byField.get(`${slot}:scene_id`);
    if (!selected) throw new Error(`vehicle-preset 缺少停放字段对象 ${slot}:scene_id`);
    bindFieldObjectPositionPicker(root, selected.object, {
      entityHandle: selected.field.entityHandle, entries: scenes,
      hydrate: hydrateScenePositionPicker,
      onValue: ({sceneId, x, y}) => {
        if (!vehicleProjectSessionMatches(repository, revision) || !root.isConnected) return;
        const row = state.vehicleDraft?.placement?.[slot];
        if (row) Object.assign(row, {placed: true, scene_id: sceneId, x, y});
        const original = state.vehicleOriginal?.placement?.[slot];
        if (original) Object.assign(original, {placed: true, scene_id: sceneId, x, y});
        updateVehicleEditorState(items);
      },
    });
  }
}

export function bindVehicleEditor() {
  const battleRoot = document.querySelector("[data-vehicle-battle-scene]");
  void bindVehicleBattleScene(battleRoot).catch(error => {
    editorLog.error("战车", `操作失败：${error?.message || error}`, error);
    if (battleRoot?.isConnected) {
      battleRoot.innerHTML = `<p class="module-editor-message">${esc(
        error?.message || error)}</p>`;
      const motionRoot = document.querySelector("[data-vehicle-hit-motion]");
      if (motionRoot) motionRoot.textContent = `受击预览不可用：${error?.message || error}`;
    }
  });
  document.querySelectorAll("[data-vehicle-tab]").forEach(node =>
    node.addEventListener("click", () => {
      if (state.vehicleTab === node.dataset.vehicleTab) return;
      state.vehicleTab = node.dataset.vehicleTab;
      replaceHistoryUrl(currentViewUrl());
      render();
    })
  );
  const form = $("#vehicle-editor");
  if (!state.vehicleDraft) return;
  const items = state.project.game_data.items?.records || [];
  bindVehicleVisualControls();
  form?.addEventListener("submit", event => event.preventDefault());
  const fieldRoot = form || document;
  if (fieldRoot) void bindVehicleFieldObjects(fieldRoot, items).catch(error => {
    if (fieldRoot.isConnected) updateVehicleEditorState(items, `读取战车字段对象失败：${error.message || error}`);
  });
  document.vehicleWeaponHolesReady = bindVehicleWeaponHoles(document, items).catch(error => {
    updateVehicleEditorState(items, `读取开孔失败：${error.message || error}`);
    throw error;
  });
  refreshVehicleSlotStates();
  document.querySelectorAll("[data-vehicle-slot-reset]").forEach(control => {
    const presetId = Number(control.dataset.vehicleId);
    const column = Number(control.dataset.vehicleSlotReset);
    void (async () => {
      const repository = requireBrowserProjectRepository(state);
      const revision = vehicleProjectRevision();
      const shape = vehicleSlotShape(state.project, presetId);
      const slot = shape.equipped_mask.slots.find(entry => entry.equipment_column === column);
      if (!slot) throw new Error("战车装备槽身份未发布");
      const record = slot.initial_record;
      const {fields} = await vehiclePresetFields(presetId);
      assertVehicleProjectSession(repository, revision);
      if (!control.isConnected) return;
      const take = name => {
        const field = fields.find(entry => entry.recordId === presetId && entry.fieldName === name);
        if (!field) throw new Error(`vehicle-preset 缺少装备字段 ${presetId}:${name}`);
        return field;
      };
      const mask = take("equipped_mask");
      const loadout = record?.collection === "initial_equipment"
        ? take(`loadout_${record.index}`) : null;
      bindFieldResetToOriginalButtons(control,
        new Map([[String(column), loadout ? [mask, loadout] : [mask]]]), {
          database: db, resourceId: "vehicle-preset",
          dirtyFor: () => Boolean(loadout?.hasOverride)
            || equipmentColumnState(mask.value, column) !== equipmentColumnState(mask.defaultValue, column),
          beforeReset: () => {
            assertVehicleProjectSession(repository, revision);
            if (vehiclePresetDraft(presetId).equipped_mask === null)
              throw new Error("草稿未记录掩码；请重置整辆战车恢复 Original");
            const value = setEquipmentColumnState(mask.value, column,
              equipmentColumnState(mask.defaultValue, column));
            const changes = [value === mask.defaultValue
              ? {field: mask, reset: true} : {field: mask, value}];
            if (loadout) changes.push({field: loadout, reset: true});
            return {expectedVersion: mask.version, changes};
          },
          changesFor: (_selected, context) => context.changes,
          afterReset: async (_selected, _context, saved) => {
            assertVehicleProjectSession(repository, revision);
            const draft = vehiclePresetDraft(presetId);
            const restored = vehicleDraftFromDocument(saved.value.document).presets[presetId];
            draft.equipped_mask = setEquipmentColumnState(draft.equipped_mask, column,
              equipmentColumnState(mask.value, column));
            if (loadout) draft.equipment[record.index] = loadout.value;
            draft.slot_assignments[column] = restored.slot_assignments[column];
            state.vehicleOriginal.presets[presetId] = copyEditorDraft(restored);
            vehicleTableDirty();
            refreshVehicleSlotStates();
            updateVehicleDerived(presetId, items);
            updateVehicleEditorState(items);
          },
          onError: error => updateVehicleEditorState(items, `重置失败：${error.message || error}`),
        });
    })().catch(error => {
      if (control.isConnected) updateVehicleEditorState(items, `重置失败：${error.message || error}`);
    });
  });
  const originalRoot = form ||
    document.querySelector("[data-vehicle-record-editor]") ||
    document.querySelector("[data-vehicle-loadout]");
  if (originalRoot) {
    const viewId = vehicleViewIdForPreset(
      originalRoot.querySelector("[data-vehicle-id]")?.dataset.vehicleId ??
        originalRoot.querySelector("[data-vehicle-original-control]")
          ?.dataset.vehicleOriginalControl,
    );
    void ensureVehicleImportBase().then(async () => {
      if (originalRoot.isConnected) {
        await bindVehicleOriginalFieldResets(originalRoot, {
          viewId,
          confirmMessage: () =>
            viewId === "player"
              ? "恢复这辆车的导入 original？preset 与初始停放位置会一起恢复。"
              : "恢复这辆出租战车的导入 original？其他战车编辑会保留。",
          onError: error => updateVehicleEditorState(
            items, `恢复失败：${error.message || error}`,
          ),
          afterReset: async () => {
            state.vehicleMessage = "";
            await render();
          },
        });
        updateVehicleOriginalControls(originalRoot, viewId);
      }
    }).catch(error => {
      if (originalRoot.isConnected) {
        updateVehicleEditorState(
          items,
          `读取导入 original 失败：${error.message}`,
        );
      }
    });
  }
}
