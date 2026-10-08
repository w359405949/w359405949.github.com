// @editor-module 所有角色编辑面板共用的形象选择器
//
// 选择器只认角色类型这个语义值。类型到显式 motion 由 actor-visual 的当前 working
// 正文解析，像素由 shared-chr-bank 现画；场景页和剧情页只负责把各自原有的 input
// 交进来，选择后仍触发原页面的 input/change 保存链路。

import {editorLog} from "../core/editor-log.js";
import {esc} from "../core/dom.js";
import {actorAppearanceContextForScene, sceneActorVisualDescriptor} from '../render/scene-actor-appearance.js';
export {actorAppearanceContextForScene, sceneActorVisualDescriptor} from '../render/scene-actor-appearance.js';
import {db} from "../core/project-db.js";
import {
  ACTOR_ENTRY_SCENE_OBJECT,
  ACTOR_ENTRY_TYPE_SELECTOR,
  actorAppearanceCatalog,
  actorAtlasCanvas,
  actorPoseForAppearance,
  actorPreviewPoses,
  actorSetBanks,
  paintActorAtlasCanvases,
  peekActorAppearance,
} from "../render/actor-atlas.js";
import {metaspriteCanvas, paintMetaspriteCanvases} from "../render/metasprite.js";
import {registerModuleComponent} from "./module-components.js";
import {bindPickerPreview, closePickerSurface, markPickerSelection, pickerVisibleOptions} from "./picker-interaction.js";

const WORLD_ACTOR_SET = 0x94;
const NO_APPEARANCE_TYPE = 0x3f;
const ACTOR_TYPE_MODULE_ID = "actor-type";
const catalogByPicker = new WeakMap();

const byteHex = value => `0x${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;

export function actorPickerPreview({pair, appearance, label, className, canvasClassName,
  placeholderClassName}) {
  if (!appearance || pair === null) {
    return `<span class="${esc(placeholderClassName)}">无预览</span>`;
  }
  const pose = actorPoseForAppearance(appearance, {direction: "down", step: 0});
  return `<span class="${esc(className)}">${actorAtlasCanvas({
    pair, frames: [pose.frame], attributes: [pose.oamAttributes],
    scale: 2, palette: pose.palette, className: canvasClassName, label,
  })}</span>`;
}

function integerOrNull(value, minimum = 0, maximum = 0xff) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isInteger(result) && result >= minimum && result <= maximum
    ? result : null;
}

/** 场景检查器、NPC 目录和记录页共用的当前有效图形。 */
export function sceneActorVisualMarkup({record, pair, label = "场景角色图形",
  canvasClassName = "scene-metasprite-appearance-canvas", compact = false} = {}) {
  const normalizedPair = integerOrNull(pair);
  if (normalizedPair === null || !record) return "";
  const descriptor = sceneActorVisualDescriptor(record);
  if (descriptor.kind === "actor-motion") {
    if (Number(record.actor_type) === NO_APPEARANCE_TYPE) return '<span class="scene-actor-not-drawn">无形象</span>';
    if (!descriptor.appearance) return "";
    const poses = compact ? [actorPoseForAppearance(descriptor.appearance,
      {direction: ['up', 'down', 'left', 'right'][Number(record.direction)] || 'down', step: 0})]
      : actorPreviewPoses(descriptor.appearance);
    return `<span class="scene-actor-visual-strip"
      style="--actor-motion-columns:${poses.length}">${actorAtlasCanvas({
        pair: normalizedPair,
        frames: poses.map(pose => pose.frame),
        attributes: poses.map(pose => pose.oamAttributes),
        scale: 2,
        palette: descriptor.appearance.palette,
        className: "scene-actor-visual-canvas",
        label,
      })}</span>`;
  }
  if (Number(record.actor_type) === 0) return '<span class="scene-actor-not-drawn">不绘制</span>';
  const fieldPalettes = [
    ...(db.peekDocument("actor-visual", null)?.field_sprite_palettes || []),
  ].sort((left, right) => Number(left.id) - Number(right.id))
    .flatMap(item => item.colors || []);
  if (fieldPalettes.length !== 16) return "";
  return metaspriteCanvas({
    banks: actorSetBanks(normalizedPair),
    kind: descriptor.kind === "direct-frame" ? "direct-frame" : "object",
    id: record.actor_type,
    size: 64,
    palettes: fieldPalettes,
    className: canvasClassName,
    label,
  });
}

export function storyActorVisualMarkup({actor, record, variant, label = "角色形象"}) {
  const source = record || {};
  const mode = actor?.renderMode || source.initial_render_mode;
  const context = actorAppearanceContextForStory(source, variant);
  const marker = {"type-animation": 0, "direct-actor-frame": 1,
    "generic-metasprite": 2}[mode];
  const markup = sceneActorVisualMarkup({
    record: {...source, actor_type: actor?.actorType ?? source.actor_type,
      render_slot_marker: marker ?? source.render_slot_selector},
    pair: context.pair, label, canvasClassName: "",
  });
  return `<span class="actor-type-module-preview" style="width:32px;height:32px">${markup}</span>`;
}

export async function hydrateStoryActorVisuals(root) {
  await Promise.all([paintActorAtlasCanvases(root), paintMetaspriteCanvases(root)]);
}

/** 从剧情持有的 `actor-visual` 语义引用中取得角色集与运行时入口。 */
export function actorAppearanceContextForStory(actor, variant) {
  const byType = variant?.sprite_sheets_by_actor_type || {};
  const actorType = integerOrNull(actor?.actor_type, 0, 0x3f);
  const recordRecipe = (variant?.actors || []).find(item =>
    Number(item.record_id) === Number(actor?.record_id))?.sprite_recipe;
  const candidates = [
    actor?.sprite_recipe,
    actorType === null ? null : byType[String(actorType)],
    recordRecipe,
    variant?.primary_actor_sprite_recipe,
    ...Object.values(byType),
    ...(variant?.actors || []).map(item => item?.sprite_recipe),
  ];
  for (const recipe of candidates) {
    const pair = integerOrNull(recipe?.actor_set);
    if (pair !== null) {
      return {
        pair,
        entryPoint: String(
          recipe?.entry_point || ACTOR_ENTRY_SCENE_OBJECT,
        ),
      };
    }
  }
  return {pair: null, entryPoint: ACTOR_ENTRY_SCENE_OBJECT};
}

/** 主角团队走普通字段类型选择入口，但沿用当前剧情场景的角色 CHR 集。 */
export function actorAppearanceContextForParty(member, variant) {
  const context = actorAppearanceContextForStory({
    actor_type: member?.storyActorType,
  }, variant);
  return {...context, entryPoint: ACTOR_ENTRY_TYPE_SELECTOR};
}

/**
 * `controlMarkup` 是消费页原本的数值/位域控件。组件不会另造写入 API；点击形象
 * 只是设置这个控件并派发 input/change，因此保存、撤销和并发版本检查仍归消费页。
 */
function actorAppearancePickerMarkup({
  pair,
  entryPoint = ACTOR_ENTRY_SCENE_OBJECT,
  value,
  controlMarkup = "",
  label = "角色形象",
  componentAttributes = "",
  picker = {},
} = {}) {
  const normalizedPair = integerOrNull(pair);
  const normalizedValue = integerOrNull(value, 0, 0x3f);
  return `<section class="actor-appearance-picker${picker.previewPanel ? ' compact' : ''}" ${componentAttributes}
    data-actor-appearance-picker
    data-actor-appearance-pair="${normalizedPair ?? ""}"
    data-actor-appearance-entry="${esc(entryPoint)}"
    data-actor-appearance-value="${normalizedValue ?? ""}">
    <div class="actor-appearance-live" data-actor-appearance-live
      aria-live="polite"><span>正在读取 ${esc(label)}基础表…</span></div>
    <div class="actor-appearance-native" data-actor-appearance-value-control>
      ${controlMarkup}
    </div>
  </section>`;
}

/**
 * actor-type owner 的轻量封面。引用方只给 actor-type 与当前 CHR 上下文；类型到
 * motion/OAM 的解析仍由 actor atlas 从 owner 正文现算。
 */
function actorTypePreviewMarkup({
  pair,
  value,
  handle = "",
  entryPoint = ACTOR_ENTRY_TYPE_SELECTOR,
  compact = false,
  scale = 2,
  label = "角色形象",
  className = "",
  canvasClassName = "actor-type-module-preview-canvas",
  componentAttributes = "",
} = {}) {
  // 跨模块引用未必附带场景 CHR pair；owner 用世界地图角色集作为“封面”上下文。
  // 真正嵌进场景/剧情编辑器时，消费页仍传精确 pair，像素不会被这个默认值覆盖。
  const normalizedPair = integerOrNull(pair) ?? WORLD_ACTOR_SET;
  const reference = String(handle || value || "");
  const match = /^actor-type:([0-9a-f]{1,2})$/iu.exec(reference);
  const normalizedValue = match
    ? integerOrNull(Number.parseInt(match[1], 16), 0, 0x3f)
    : integerOrNull(value, 0, 0x3f);
  const classes = `actor-type-module-preview${className ? ` ${esc(className)}` : ""}`;
  if (normalizedValue === null) {
    return `<span class="${classes}" ${componentAttributes}>
      <span class="resource-empty">角色类型未解析</span></span>`;
  }
  if (normalizedValue === NO_APPEARANCE_TYPE) {
    return `<span class="${classes}" ${componentAttributes}>
      <span class="resource-empty">无角色形象</span></span>`;
  }
  const appearance = compact ? peekActorAppearance(normalizedValue, {entryPoint}) : null;
  if (compact && !appearance) return "";
  return `<span class="${classes}" ${componentAttributes}>${actorAtlasCanvas({
    pair: normalizedPair,
    actorType: compact ? null : normalizedValue,
    entryPoint,
    frames: compact ? [appearance.representativeFrame] : null,
    attributes: compact ? [appearance.oamAttributes] : null,
    palette: compact ? appearance.palette : null,
    scale,
    className: canvasClassName,
    label,
  })}</span>`;
}

function pickerControl(picker) {
  return picker.querySelector(
    "[data-actor-appearance-value-control] input,"
    + "[data-actor-appearance-value-control] select",
  );
}

function swatchMarkup(pair, appearance, scale, label) {
  return `<span class="actor-appearance-swatch"
    style="--actor-appearance-offset:${-Number(appearance.palette) * 25}%">${actorAtlasCanvas({
    pair,
    frames: [appearance.representativeFrame],
    attributes: [appearance.oamAttributes],
    scale,
    className: "actor-appearance-canvas",
    label,
  })}</span>`;
}

function pickerLiveMarkup(picker, catalog) {
  const pair = integerOrNull(picker.dataset.actorAppearancePair);
  if (pair === null) {
    return `<p class="actor-appearance-error">缺少当前角色的 CHR 上下文；仍可用下方数值控件编辑类型。</p>`;
  }
  const value = integerOrNull(picker.dataset.actorAppearanceValue, 0, 0x3f);
  const current = catalog.find(item => item.id === value) || null;
  const preview = current || catalog[0];
  const disabled = pickerControl(picker)?.disabled ? " disabled" : "";
  return `<details class="actor-appearance-details">
    <summary>
      <span data-actor-appearance-current-swatch>${swatchMarkup(
        pair,
        preview,
        4,
        `角色类型 ${byteHex(preview.id)}`,
      )}</span>
      <span class="actor-appearance-current-copy">
        <small>角色形象 · SET ${byteHex(pair)}</small>
        <b data-actor-appearance-current-type>${
          value === NO_APPEARANCE_TYPE ? "TYPE 0x3F" : `TYPE ${byteHex(preview.id)}`
        }</b>
        <em data-actor-appearance-current-frame>${
          value === NO_APPEARANCE_TYPE
            ? "无形象（保留值）"
            : `${preview.motionLabel} · P${preview.palette}`
        }</em>
      </span>
      <span class="actor-appearance-open-label">选择形象</span>
    </summary>
    <div class="actor-appearance-panel">
      <label class="module-reference-picker-filter">搜索形象
        <input type="search" data-actor-appearance-filter placeholder="类型、动作或调色板"></label>
      <nav class="module-reference-picker-groups" aria-label="调色板分组">
        <button type="button" data-actor-appearance-group="" aria-pressed="true">全部</button>
        ${[0, 1, 2, 3].map(palette => `<button type="button"
          data-actor-appearance-group="${palette}" aria-pressed="false">P${palette}</button>`).join("")}
      </nav>
      <div class="actor-appearance-grid" role="listbox" aria-label="角色形象">
        ${catalog.map(item => `<button type="button"
          class="actor-appearance-option${item.id === value ? " active" : ""}"
          data-actor-appearance-option="${item.id}"
          data-actor-appearance-palette="${item.palette}"
          data-actor-appearance-search="${esc(`${item.id} ${byteHex(item.id)} ${item.motionLabel} ${item.palette}`.toLowerCase())}"
          role="option" aria-selected="${item.id === value}"
          title="TYPE ${byteHex(item.id)} · ${esc(item.motionLabel)} · PALETTE ${item.palette}"${disabled}>
          ${swatchMarkup(
            pair,
            item,
            3,
            `角色类型 ${byteHex(item.id)}`,
          )}
          <b>${byteHex(item.id)}</b><small>${esc(item.motionLabel)} · P${item.palette}</small>
        </button>`).join("")}
      </div>
      <p class="actor-appearance-status" data-actor-appearance-status>
        形象映射来自当前 actor-visual，像素来自当前 shared-chr-bank。
      </p>
    </div>
  </details>`;
}

function syncPicker(picker, paintCurrent) {
  const catalog = catalogByPicker.get(picker);
  const control = pickerControl(picker);
  if (!catalog || !control) return;
  const value = integerOrNull(control.value, 0, 0x3f);
  picker.dataset.actorAppearanceValue = value ?? "";
  const current = catalog.find(item => item.id === value) || null;
  markPickerSelection(picker.querySelectorAll("[data-actor-appearance-option]"),
    value, button => button.dataset.actorAppearanceOption);
  const type = picker.querySelector("[data-actor-appearance-current-type]");
  const frame = picker.querySelector("[data-actor-appearance-current-frame]");
  const canvas = picker.querySelector(
    "[data-actor-appearance-current-swatch] canvas[data-actor-atlas]",
  );
  if (type) type.textContent = current
    ? `TYPE ${byteHex(current.id)}`
    : value === NO_APPEARANCE_TYPE ? "TYPE 0x3F" : "TYPE —";
  if (frame) frame.textContent = current
    ? `${current.motionLabel} · P${current.palette}`
    : value === NO_APPEARANCE_TYPE ? "无形象（保留值）" : "请输入 0–62";
  if (!canvas) return;
  canvas.hidden = !current;
  if (!current) return;
  canvas.closest(".actor-appearance-swatch")?.style.setProperty(
    "--actor-appearance-offset",
    `${-current.palette * 25}%`,
  );
  const nextFrame = String(current.representativeFrame);
  const nextAttributes = String(current.oamAttributes);
  if (canvas.dataset.actorAtlasFrames !== nextFrame) {
    canvas.dataset.actorAtlasFrames = nextFrame;
    canvas.dataset.actorAtlasAttributes = nextAttributes;
    delete canvas.dataset.actorAtlasPainted;
    delete canvas.dataset.actorAtlasError;
  } else if (canvas.dataset.actorAtlasAttributes !== nextAttributes) {
    canvas.dataset.actorAtlasAttributes = nextAttributes;
    delete canvas.dataset.actorAtlasPainted;
    delete canvas.dataset.actorAtlasError;
  }
  if (paintCurrent) void paintActorAtlasCanvases(
    canvas.closest("[data-actor-appearance-current-swatch]"),
  );
}

/** 同步由消费页程序化改写的原生控件（Original 恢复、共用字节联动等）。 */

function syncActorAppearancePickers(root = document) {
  const pickers = [
    ...(root?.matches?.("[data-actor-appearance-picker]") ? [root] : []),
    ...(root?.querySelectorAll?.("[data-actor-appearance-picker]") || []),
  ];
  pickers.forEach(picker => syncPicker(picker, true));
}

function bindPicker(picker) {
  const control = pickerControl(picker);
  control?.addEventListener("input", () => syncPicker(picker, true));
  let group = "";
  const filter = picker.querySelector("[data-actor-appearance-filter]");
  bindPickerPreview(picker.querySelector('.actor-appearance-grid'), {
    selector: '[data-actor-appearance-option]', render: option => {
      const preview = document.createElement('div');
      const label = document.createElement('b');
      label.textContent = option.title;
      const swatch = option.querySelector('.actor-appearance-swatch').cloneNode(true);
      const source = option.querySelector('canvas'), canvas = swatch.querySelector('canvas');
      canvas.getContext('2d').drawImage(source, 0, 0);
      preview.append(label, swatch);
      return preview;
    },
  });
  const updateOptions = () => {
    const options = [...picker.querySelectorAll("[data-actor-appearance-option]")];
    const {visible} = pickerVisibleOptions(options, {query: filter.value, category: group,
      searchText: option => option.dataset.actorAppearanceSearch,
      group: option => option.dataset.actorAppearancePalette});
    options.forEach(option => { option.hidden = !visible.has(option); });
  };
  filter?.addEventListener("input", updateOptions);
  picker.querySelectorAll("[data-actor-appearance-group]").forEach(button => {
    button.addEventListener("click", () => {
      group = button.dataset.actorAppearanceGroup;
      picker.querySelectorAll("[data-actor-appearance-group]").forEach(candidate =>
        candidate.setAttribute("aria-pressed", String(candidate === button)));
      updateOptions();
    });
  });
  picker.addEventListener("click", event => {
    const option = event.target.closest?.("[data-actor-appearance-option]");
    if (!option || !control || control.disabled || option.disabled) return;
    control.value = option.dataset.actorAppearanceOption;
    control.dispatchEvent(new Event("input", {bubbles: true}));
    control.dispatchEvent(new Event("change", {bubbles: true}));
    syncPicker(picker, true);
    const details = picker.querySelector("details");
    closePickerSurface(details);
  });
}

/**
 * 把同步骨架水合成图形目录。可注入 catalog/painter 只为薄浏览器合同；产品路径
 * 默认读取当前项目正文并调用共享 actor atlas 渲染器。
 */
async function hydrateActorAppearancePickers(
  root = document,
  {catalog = null, painter = paintActorAtlasCanvases} = {},
) {
  const pickers = [
    ...(root?.matches?.("[data-actor-appearance-picker]") ? [root] : []),
    ...(root?.querySelectorAll?.("[data-actor-appearance-picker]") || []),
  ].filter(picker => picker.dataset.actorAppearanceHydrated !== "1");
  if (!pickers.length) return;
  const ready = [];
  for (const picker of pickers) {
    try {
      const entryPoint = String(
        picker.dataset.actorAppearanceEntry || ACTOR_ENTRY_TYPE_SELECTOR,
      );
      const resolvedCatalog = catalog || await actorAppearanceCatalog({entryPoint});
      if (!Array.isArray(resolvedCatalog) || !resolvedCatalog.length) {
        throw new TypeError("actor-visual 没有角色类型记录");
      }
      catalogByPicker.set(picker, resolvedCatalog);
      const live = picker.querySelector("[data-actor-appearance-live]");
      if (live) live.innerHTML = pickerLiveMarkup(picker, resolvedCatalog);
      picker.dataset.actorAppearanceHydrated = "1";
      bindPicker(picker);
      syncPicker(picker, false);
      ready.push(picker);
    } catch (error) {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      const live = picker.querySelector("[data-actor-appearance-live]");
      if (live) live.innerHTML = `<p class="actor-appearance-error">形象表读取失败：${
        esc(error?.message || error)}</p>`;
    }
  }
  if (!ready.length) return;
  await painter(root);
  ready.forEach(picker => {
    const current = picker.querySelector(
      "[data-actor-appearance-current-swatch] canvas[data-actor-atlas]",
    );
    const status = picker.querySelector("[data-actor-appearance-status]");
    if (current?.dataset.actorAtlasError && status) {
      status.textContent = `当前 CHR 上下文无法渲染：${current.dataset.actorAtlasError}`;
      status.classList.add("error");
    }
  });
}

function actorTypeComponentRoots(root, kind) {
  const selector = `[data-module-component-module="${ACTOR_TYPE_MODULE_ID}"]`
    + `[data-module-component-kind="${kind}"]`;
  return [
    ...(root?.matches?.(selector) ? [root] : []),
    ...(root?.querySelectorAll?.(selector) || []),
  ];
}

async function hydrateActorTypePreviews(root = document) {
  const previews = [
    ...actorTypeComponentRoots(root, "preview"),
    ...actorTypeComponentRoots(root, "cover"),
  ];
  if (previews.length) await paintActorAtlasCanvases(root);
}

registerModuleComponent(ACTOR_TYPE_MODULE_ID, "reference", {
  render: actorAppearancePickerMarkup,
  hydrate: hydrateActorAppearancePickers,
  sync: syncActorAppearancePickers,
});

for (const kind of ["preview", "cover"]) {
  registerModuleComponent(ACTOR_TYPE_MODULE_ID, kind, {
    render: actorTypePreviewMarkup,
    hydrate: hydrateActorTypePreviews,
  });
}
