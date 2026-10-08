// @editor-module 场景角色形象与运动权威表
//
// 页面按 actor-visual.motions 的完整运动单位展示，不再把每个动画帧列成一个
// 独立形象。actor_types 只是 ROM 选择值到 motion/OAM 的引用；CHR set 只提供像素。

import {esc, hex} from "../core/dom.js";
import {db} from "../core/project-db.js";
import {VISUAL_ACTORS_RESOURCE_ID} from "../core/visual-actors.js";
import {
  ACTOR_ENTRY_TYPE_SELECTOR,
  ACTOR_ENTRY_SCENE_OBJECT,
  ACTOR_MOTION_DIRECTIONAL,
  ACTOR_MOTION_DIRECTIONLESS,
  ACTOR_MOTION_SINGLE,
  actorMotionCatalogFromDocument,
  actorAtlasCanvas,
  actorPoseForAppearance,
  paintActorAtlasCanvases,
} from "../render/actor-atlas.js";
import {configureAnimatedResourcePicker} from "../ui/animated-resource-picker.js";
import {state} from "../core/state.js";
import {renderStorySequences} from "../views/story/catalog.js";


const motionKindLabels = Object.freeze({
  [ACTOR_MOTION_SINGLE]: "单帧",
  [ACTOR_MOTION_DIRECTIONLESS]: "多帧 · 无方向",
  [ACTOR_MOTION_DIRECTIONAL]: "普通行走 · 2 帧 4 向",
});

const entryPointLabels = new Map([
  [ACTOR_ENTRY_TYPE_SELECTOR, "类型选择入口"],
  [ACTOR_ENTRY_SCENE_OBJECT, "场景入口"],
]);

function actorMotionRows(pair, motion) {
  const variants = motion.appearanceVariants.length
    ? motion.appearanceVariants
    : [{
      actorType: null,
      entryPoint: null,
      appearance: motion.previewAppearance,
      poses: motion.previewPoses,
    }];
  const rowSpan = variants.length;
  return `<tbody class="actor-motion-group">${variants.map((variant, index) => {
    const appearance = variant.appearance;
    const poses = variant.poses;
    const frames = poses.map(pose => pose.frame);
    const attributes = poses.map(pose => pose.oamAttributes);
    const typeLabel = appearance.id === null ? "—" : hex(appearance.id, 2);
    const entryLabel = appearance.id === null
      ? "—"
      : entryPointLabels.get(variant.entryPoint) || (variant.entryPoint ? "其他入口" : "默认");
    const groupCells = index ? "" : `
      <td class="actor-motion-resource" rowspan="${rowSpan}"><button class="resource-uid" type="button"
        data-resource-query="${esc(motion.resourceId)}">${esc(motion.resourceId)}</button></td>
      <td class="actor-motion-name" rowspan="${rowSpan}"><b>${esc(motion.label)}</b></td>
      <td class="actor-motion-kind" rowspan="${rowSpan}">${esc(motionKindLabels[motion.kind] || motion.kind)}</td>`;
    return `<tr>${groupCells}
      <td>${appearance.resourceId
        ? `<button class="resource-uid" type="button" data-resource-query="${esc(appearance.resourceId)}">${esc(appearance.resourceId)}</button>`
        : `<span class="mono">${esc(typeLabel)}</span>`}</td>
      <td>${esc(entryLabel)}</td>
      <td class="actor-motion-preview-cell"><span class="actor-motion-strip"
        style="--actor-appearance-offset:${-Number(appearance.palette) * 25}%;--actor-motion-columns:${poses.length}">${actorAtlasCanvas({
          pair,
          frames,
          attributes,
          scale: 2,
          className: "actor-motion-canvas",
          label: `${typeLabel} · ${entryLabel} · ${appearance.motionLabel}`,
        })}</span></td>
    </tr>`;
  }).join("")}</tbody>`;
}

function renderActorAppearances() {
  const actorDocument = db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null);
  const sets = state.project?.visuals?.actors?.sets || [];
  if (!actorDocument) {
    return `<div class="empty"><b>角色形象基础表未能加载</b><span>当前项目缺少 ${VISUAL_ACTORS_RESOURCE_ID} 的有效正文。</span></div>`;
  }
  if (!sets.length) {
    return ``;
  }

  const selectedSet = sets.find(item => Number(item.id) === Number(state.actorSet))
    || sets[0];
  state.actorSet = Number(selectedSet.id);

  let catalog;
  try {
    catalog = actorMotionCatalogFromDocument(actorDocument);
  } catch (error) {
    return `<div class="empty"><b>角色形象基础表无效</b><span>${esc(error?.message || error)}</span></div>`;
  }

  const appearanceCount = catalog.reduce(
    (count, motion) => count + motion.appearanceVariants.length,
    0,
  );
  return `<section class="actor-appearance-page">
    <div class="section-line actor-appearance-page-heading">
      <div><h2>角色形象与运动表</h2></div>
      <span>${catalog.length} 个完整运动 · ${appearanceCount} 个类型 / 入口外观 · 当前 ${esc(selectedSet.id_hex || hex(selectedSet.id, 2))}</span>
    </div>
    <div class="actor-appearance-page-toolbar">
      <div><span>预览场景图案</span>
        <animated-resource-picker id="actor-set" class="image-column-picker"
          aria-label="预览场景图案"
          data-animated-resource-value="${Number(selectedSet.id)}"></animated-resource-picker>
      </div>
      <p><button class="resource-uid" type="button" data-resource-query="actor-visual.type-frame-bases">actor-visual</button></p>
    </div>
    <div class="table-wrap actor-motion-table" aria-label="角色形象与运动表"><table>
      <thead><tr><th>资源 ID</th><th>运动名称</th><th>运动模型</th>
        <th>角色类型</th><th>引用入口</th><th>动画预览</th></tr></thead>
      ${catalog.map(item => actorMotionRows(selectedSet.id, item)).join("")}
    </table></div>
  </section>`;
}

export function configureActorSetPicker(picker) {
  if (!picker) return;
  const catalog = actorMotionCatalogFromDocument(db.peekDocument(VISUAL_ACTORS_RESOURCE_ID, null));
  const appearances = catalog.flatMap(motion => motion.appearanceVariants)
    .map(variant => variant.appearance);
  configureAnimatedResourcePicker(picker, {
    value: state.actorSet,
    options: (state.project?.visuals?.actors?.sets || []).map(item => ({
      value: item.id, label: item.label || `SET ${item.id_hex || hex(item.id, 2)}`, set: item,
    })),
    renderPreview: option => {
      const animation = (option.set.animations || []).find(item =>
        item.depends_on_scene_chr && item.actor_type_ids?.length);
      const appearance = appearances.find(item =>
        Number(item?.id) === Number(animation?.actor_type_ids?.[0]))
        || appearances.find(item => item?.id !== null);
      const pose = actorPoseForAppearance(appearance, {direction: "down", step: 0});
      return actorAtlasCanvas({
        pair: option.set.id, frames: [pose.frame], attributes: [pose.oamAttributes],
        scale: 3, palette: pose.palette, label: option.label,
      });
    },
    paintPreview: root => paintActorAtlasCanvases(root),
  });
}

export function renderActors() {
  const active = state.actorVisualTab === "story" ? "story" : "sprites";
  state.actorVisualTab = active;
  const tabs = `<div class="data-tabs battle-visual-tabs" role="tablist" aria-label="角色形象与动作脚本分类">
    <button class="button ${active === "sprites" ? "primary" : "ghost"}" data-actor-visual-tab="sprites">角色形象表</button>
    <button class="button ${active === "story" ? "primary" : "ghost"}" data-actor-visual-tab="story">关联动作脚本 <small>动作脚本</small></button>
  </div>`;
  return tabs + (active === "story" ? renderStorySequences() : renderActorAppearances());
}
