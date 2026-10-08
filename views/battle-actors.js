// @editor-module 战斗形象与动作的统一工作台
import {screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom} from '../ui/screen-workbench.js';
import {esc, hex} from "../core/dom.js";
import {
  battleActorAction,
  battleActorActionAtFrame,
  battleActorCatalog,
} from "../core/battle-actor-assets.js";
import {
  nesFrameDurationMs,
  nesVideoStandard,
  startNesFrameClock,
} from "../core/nes-video-standard.js";
import {
  battleScenePreviewCatalog,
  normalizeBattleScenePreview,
} from "../core/battle-scene-preview.js";
import {currentViewUrl, replaceHistoryUrl} from "../core/router.js";
import {state} from "../core/state.js";
import {battleActorImage, battleActorSources} from "../render/battle-actor.js";
import {vehiclePortraitImage} from "../modules/vehicle/components.js";
import {blitRaster} from "../render/chr-raster.js";

const previewClocks = new WeakMap();

function selectedModel(project = state.project) {
  const catalog = battleActorCatalog(project);
  let appearance = catalog.appearanceByKey.get(
    String(state.battleActorAppearance || ""),
  ) || catalog.appearances[0] || null;
  state.battleActorAppearance = appearance?.key || null;
  let action = battleActorAction(
    catalog,
    appearance?.key,
    state.battleActorAction,
  );
  state.battleActorAction = action?.pose || null;
  return {catalog, appearance, action};
}

function appearanceTypeLabel(appearance) {
  if (appearance?.kind === "vehicle") return "载具";
  if (appearance?.kind === "npc") return "NPC";
  return "主角团";
}

function sourceFacts(action) {
  if (!action) return [];
  if (action.kind === "battle-action") {
    return [
      ["基础资产", action.resourceUid],
      ["底盘", action.chassisIdHex],
      ["战斗动作", hex(action.id, 2)],
      ["布局", `${action.resource.columns} × ${action.resource.rows} 图块`],
      ["调色板", `子调色板 ${action.resource.palette_id}`],
    ];
  }
  return [
    ["基础资产", action.resourceUid],
    ["组合精灵", hex(action.id, 2)],
    ["姿势", action.poseLabel || action.pose],
    ["精灵数", action.resource?.sprite_count ?? "—"],
    ["CHR 上下文", "$24 / $25 / $26 / $27"],
    ["识别", action.resource?.identification_status || "—"],
  ];
}

export function renderBattleActors(project = state.project) {
  const {catalog, appearance, action} = selectedModel(project);
  if (!appearance || !action) {
    return ``;
  }
  const video = nesVideoStandard(state.battleVideoStandard);
  return screenWorkbench({namespace: 'battleactors', className: 'battle-actor-workbench',
    attributes: {'data-battle-actor-workbench': ''},
    toolbarMarkup: `<header class="battle-actor-head">
      <div><p class="eyebrow">SHARED BATTLE ACTOR ASSETS</p>
        <h2>战斗角色形象与动作</h2>
      </div>
      <div class="battle-actor-video-controls" role="group" aria-label="NES 视频制式">
        ${Object.values({ntsc: nesVideoStandard("ntsc"), pal: nesVideoStandard("pal")})
          .map(item => `<button class="button ${video.key === item.key ? "primary" : "ghost"}"
            type="button" data-battle-video-standard="${item.key}"
            aria-pressed="${video.key === item.key}">${esc(item.label)}</button>`).join("")}
        <button class="button" type="button" data-battle-actor-play
          aria-pressed="${state.battleActorPlaying}">${
            state.battleActorPlaying ? "暂停动作" : "播放动作"
          }</button>
      </div>
    </header>`,
    treeTitle: null, treeClassName: 'battle-actor-roster',
    treeAttributes: {'aria-label': '战斗形象目录'},
    treeMarkup: `<div class="battle-actor-roster-head"><b>战斗形象</b><span>${catalog.appearances.length} 类</span></div>
      ${catalog.appearances.map(item => {
          const selected = item.key === appearance.key;
          const defaultAction = battleActorAction(
            catalog,
            item.key,
            item.defaultAction,
          );
          return `<button class="battle-actor-roster-row${selected ? " is-selected" : ""}"
            type="button" data-battle-actor-select="${esc(item.key)}"
            aria-current="${selected ? "true" : "false"}">
            <canvas width="64" height="64" data-battle-actor-thumbnail
              data-battle-actor-appearance="${esc(item.key)}"
              data-battle-actor-action="${esc(defaultAction?.pose || "")}"></canvas>
            <span><b>${esc(item.label)}</b><small>${appearanceTypeLabel(item)} · ${
              item.actions.length
            } 个动作 / 姿势</small></span>
          </button>`;
        }).join("")}`,
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'battleactors', canvasMarkup: `<canvas width="192" height="192" data-battle-actor-preview
              data-battle-actor-appearance="${esc(appearance.key)}"
              data-battle-actor-action="${esc(action.pose)}"
              aria-label="${esc(appearance.label)}动作预览"></canvas>`}),
    inspectorTitle: null, inspectorClassName: 'battle-actor-editor',
    inspectorMarkup: `<div class="battle-actor-stage-copy">
            <span class="badge confirmed">${appearanceTypeLabel(appearance)}</span>
            <h3>${esc(appearance.label)}</h3>
            <p>当前动作：<b>${esc(action.poseLabel || action.label)}</b></p>
            <div class="battle-actor-apply-row"><span>应用到战斗场景：</span>
              ${[0, 1, 2].map(index => `<button class="button ghost" type="button"
                data-battle-actor-apply-slot="${index}">P${index + 1}</button>`).join("")}
            </div>
          </div>
        <section class="battle-actor-action-editor">
          <header><div><p class="eyebrow">ACTION / POSE</p><h3>动作与姿势</h3></div>
            </header>
          <div class="battle-actor-action-list">
            ${appearance.actions.map(item => `<button class="battle-actor-action-row${
              item.key === action.key ? " is-selected" : ""
            }" type="button" data-battle-actor-action-select="${esc(item.pose)}">
              <span><b>${esc(item.poseLabel || item.label)}</b>
                <small>${esc(item.resourceUid)}</small></span>
              <span class="mono">${item.kind === "battle-action"
                ? hex(item.id, 2) : hex(item.id, 2)}</span>
            </button>`).join("")}
          </div>
        </section>
        <section class="battle-actor-source">
          <header><div><p class="eyebrow">SOURCE ASSET</p><h3>当前基础资产</h3></div>
            <button class="resource-uid" type="button"
              data-resource-query="${esc(action.resourceUid)}">${esc(action.resourceUid)}</button>
          </header>
          <dl>${sourceFacts(action).map(([label, value]) =>
            `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
        </section>`,
  });
}

function stopPreview(canvas) {
  previewClocks.get(canvas)?.cancel?.();
  previewClocks.delete(canvas);
}

export async function paintBattleActorCanvases(root = document) {
  const canvases = [...root.querySelectorAll(
    "canvas[data-battle-actor-thumbnail], canvas[data-battle-actor-preview]",
  )];
  if (!canvases.length) return;
  bindScreenWorkbenchZoom({namespace: 'battleactors', root});
  const {catalog} = selectedModel();
  const sources = await battleActorSources();
  for (const canvas of canvases) {
    stopPreview(canvas);
    const appearanceKey = canvas.dataset.battleActorAppearance;
    const actionKey = canvas.dataset.battleActorAction;
    const isPreview = canvas.hasAttribute("data-battle-actor-preview");
    const size = isPreview ? 192 : 64;
    const draw = (frameIndex = null, frameCount = 0) => {
      const action = battleActorActionAtFrame(
        catalog,
        appearanceKey,
        actionKey,
        frameIndex,
        frameCount,
      );
      const paint = action.actorKind === 'vehicle'
        ? options => vehiclePortraitImage({sources, action}, options)
        : options => battleActorImage(sources, action, options);
      const raster = paint({
        size,
        scale: isPreview ? 3 : 1,
        background: [0, 0, 0],
      });
      if (!raster) return;
      blitRaster(canvas, raster);
      canvas.dataset.battleActorPainted = "1";
      canvas.dataset.battleActorFrame = frameIndex === null ? "" : String(frameIndex);
      canvas.dataset.battleActorFrameKey = action?.key || "";
    };
    draw();
    if (!isPreview) continue;
    const video = nesVideoStandard(state.battleVideoStandard);
    const frameCount = Math.round(video.hz);
    canvas.dataset.battleActorStandard = video.key;
    canvas.dataset.battleActorPlaybackHz = video.hz.toFixed(5);
    canvas.dataset.battleActorFrameCount = String(frameCount);
    canvas.dataset.battleActorFrameDurationMs = nesFrameDurationMs(video.key)
      .toFixed(4);
    if (!state.battleActorPlaying) continue;
    const appearance = catalog.appearanceByKey.get(appearanceKey);
    if ((appearance?.actions || []).length < 2) continue;
    draw(0, frameCount);
    const clock = startNesFrameClock({
      standard: video.key,
      frameCount,
      loop: true,
      shouldContinue: () => canvas.isConnected,
      onFrame: index => draw(index, frameCount),
    });
    previewClocks.set(canvas, clock);
  }
}

export function bindBattleActorWorkbench({rerender = async () => {}} = {}) {
  document.querySelectorAll("[data-battle-actor-select]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleActorAppearance = button.dataset.battleActorSelect;
      state.battleActorAction = null;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-actor-action-select]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleActorAction = button.dataset.battleActorActionSelect;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelectorAll("[data-battle-video-standard]").forEach(button => {
    button.addEventListener("click", () => {
      state.battleVideoStandard = button.dataset.battleVideoStandard;
      replaceHistoryUrl(currentViewUrl());
      void rerender();
    });
  });
  document.querySelector("[data-battle-actor-play]")?.addEventListener("click", () => {
    state.battleActorPlaying = !state.battleActorPlaying;
    replaceHistoryUrl(currentViewUrl());
    void rerender();
  });
  document.querySelectorAll("[data-battle-actor-apply-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.battleActorApplySlot);
      const preview = normalizeBattleScenePreview(
        state.battleScenePreview,
        state.project,
      );
      const previewCatalog = battleScenePreviewCatalog(state.project);
      const appearance = battleActorCatalog(state.project).appearanceByKey.get(
        String(state.battleActorAppearance || ""),
      );
      if (appearance?.kind === "vehicle") {
        const currentPreset = previewCatalog.vehiclePresetById.get(
          Number(preview.party[slot].vehiclePresetId),
        );
        const vehiclePreset = currentPreset?.appearanceKey === appearance.key
          ? currentPreset
          : previewCatalog.vehiclePresets.find(
            item => item.appearanceKey === appearance.key,
          );
        if (vehiclePreset) {
          preview.party[slot].vehiclePresetId = vehiclePreset.id;
          preview.party[slot].attacks = {
            ...preview.party[slot].attacks,
            ...vehiclePreset.attacks,
          };
          preview.party[slot].riding = true;
        }
      } else if (appearance) {
        preview.party[slot].normalAppearance = appearance.key;
        preview.party[slot].riding = false;
      }
      state.battleScenePreview = normalizeBattleScenePreview(preview, state.project);
      button.textContent = `P${slot + 1} · 已应用`;
    });
  });
}
