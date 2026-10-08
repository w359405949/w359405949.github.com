// @editor-module 人物详情的独立动图。取帧与像素均交给已有资源渲染器。
import {editorLog} from "../core/editor-log.js";
import {
  ACTOR_MOTION_DIRECTIONAL,
  actorAtlasImage,
  actorPreviewPoses,
  actorSetSources,
} from "./actor-atlas.js";
import {battleActorMetaspriteChoices, battleActorActionFromStateDelta} from "../core/battle-actor-assets.js";
import {battleScenePreviewCatalog} from "../core/battle-scene-preview.js";
import {recordUid} from "../core/resource-index.js";
import {startNesFrameClock} from "../core/nes-video-standard.js";
import {attackAnimationState} from "./weapon-effect-vm.js";
import {battleActorImage, battleActorSources} from "./battle-actor.js";
import {blitRaster} from "./chr-raster.js";

function framePainter(canvas, rasters) {
  blitRaster(canvas, rasters[0]);
  const context = canvas.getContext("2d");
  const images = new Map(rasters.map(raster => [raster,
    new ImageData(raster.data, raster.width, raster.height),
  ]));
  // 固定画布大小，只更新像素；每帧重设 width/height 会反复清空画布并触发 DOM 变更。
  return index => context.putImageData(images.get(rasters[index]), 0, 0);
}

/** 四向各一个画布；非四向资源如实显示其已发布的运动类别。 */
export async function paintCharacterWalkStrip(root, {pair, appearance}) {
  if (!root) return;
  if (!appearance || pair === null) {
    root.replaceChildren();
    return;
  }
  const directional = appearance.motionKind === ACTOR_MOTION_DIRECTIONAL;
  const directions = directional
    ? [["up", "上"], ["down", "下"], ["left", "左"], ["right", "右"]]
    : [[null, "当前形象"]];
  const sources = await actorSetSources(pair);
  if (!root.isConnected) return;
  root.dataset.characterWalkMotion = appearance.motionResourceId;
  root.replaceChildren();
  if (!directional) {
    const message = document.createElement("p");
    message.textContent = `${appearance.resourceId} · ${appearance.motionLabel}`;
    root.append(message);
  }
  const strip = document.createElement("div");
  strip.className = "character-walk-strip";
  root.append(strip);
  const entries = directions.map(([direction, label]) => {
    const card = document.createElement("figure");
    const canvas = document.createElement("canvas");
    canvas.dataset.characterWalkDirection = direction || "none";
    canvas.setAttribute("aria-label", `${label} · ${appearance.resourceId}`);
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    card.append(canvas, caption);
    strip.append(card);
    const poses = directional
      ? actorPreviewPoses(appearance).filter(pose => pose.direction === direction)
      : actorPreviewPoses(appearance);
    const images = poses.map(pose => actorAtlasImage(sources, [pose], 3, pose.palette));
    canvas.dataset.characterWalkFrames = poses.map(pose => pose.frame).join(",");
    const draw = framePainter(canvas, images);
    draw(0);
    return {draw, count: images.length};
  });
  // 这是编辑器的匀速循环试听节拍，不声称是地图移动速度。
  const started = performance.now();
  let previous = 0;
  const tick = now => {
    if (!root.isConnected) return;
    const step = Math.max(0, Math.floor((now - started) / 240));
    if (step !== previous && !document.hidden) {
      for (const entry of entries) entry.draw(step % entry.count);
      previous = step;
    }
    requestAnimationFrame(tick);
  };
  if (entries.some(entry => entry.count > 1)) requestAnimationFrame(tick);
}

function poseSourceHandle(source) {
  return source.source.resource || recordUid("item", source.source.id);
}

/** 同一种只比较连续姿势/位置的变化顺序；停留帧数留在来源上，不参与分类。 */
function characterPoseCatalog(project, roleId, selectedId) {
  const catalog = battleScenePreviewCatalog(project);
  const appearance = catalog.normalAppearances.find(item => item.partyRoleId === roleId);
  const choices = battleActorMetaspriteChoices(project);
  const selected = choices.find(item => item.id === selectedId);
  const groupRole = selected?.resource.battle_pose ? selected.resource.party_role_id : null;
  const choicesByHandle = new Map(choices.filter(item => groupRole != null
    && item.resource.party_role_id === groupRole && item.resource.battle_pose)
    .map(item => [item.resourceUid, item]));
  const assets = project.visuals.weapon_effect_catalog.asset_catalog_data;
  const sections = [
    {kind: "attack", label: "攻击走法", sources: catalog.humanWeaponSources},
    {kind: "hit", label: "受击走法", sources: (assets.enemy_actions || []).map(action => ({
      source: action, visualCode: action.visual_code, visualAvailable: action.visual_code != null,
    }))},
  ];
  const animations = new Map();
  for (const section of sections) {
    const groups = new Map(), missing = new Map();
    for (const source of section.sources) {
      let animation;
      try {
        if (!source.visualAvailable) throw new Error("没有可解码视觉");
        if (!animations.has(source.visualCode)) {
          animations.set(source.visualCode, attackAnimationState(assets, source.visualCode));
        }
        animation = animations.get(source.visualCode);
        if (!animation?.frames.length) throw new Error("VM 没有返回姿势帧");
      } catch (error) {
        missing.set(poseSourceHandle(source), {source, reason: String(error.message || error)});
        continue;
      }
      const states = [];
      for (const frame of animation.frames) {
        // 与原战斗预览相同：我方攻击取 normal，敌方攻击的我方受击者取 alternate。
        const x = section.kind === "hit" ? frame.actorXDeltaAlternate : frame.actorXDeltaNormal;
        const last = states.at(-1);
        if (last?.state === frame.actorStateDelta && last.x === x) last.frames += 1;
        else states.push({state: frame.actorStateDelta, x, frames: 1});
      }
      if (!states.every(run => Number.isFinite(run.x))) {
        missing.set(poseSourceHandle(source), {source, reason: "共享 VM 未提供完整的位置帧"});
        continue;
      }
      const key = JSON.stringify(states.map(run => [run.state, run.x]));
      if (!groups.has(key)) {
        const entry = {key, sources: new Map(), runs: [], stateCount: states.length,
          frames: animation.frames.length, error: ""};
        try {
          if (!choicesByHandle.size) throw new Error("缺少这个人物的姿势分组");
          if (!appearance) throw new Error("没有此人物的战斗形象");
          entry.runs = states.map(run => {
            const action = battleActorActionFromStateDelta(
              catalog.actorCatalog, appearance.key, undefined, run.state,
            );
            const choice = choicesByHandle.get(action?.resourceUid);
            if (!choice?.available) throw new Error(`${action?.resourceUid || "脚本姿势"} 不在当前立绘的可绘制 battle_pose 分组内`);
            return {action: {...choice, key: choice.resourceUid, kind: "metasprite"},
              x: run.x, frames: run.frames};
          });
        } catch (error) {
          entry.error = String(error.message || error);
        }
        groups.set(key, entry);
      }
      groups.get(key).sources.set(poseSourceHandle(source), {source, states, frames: animation.frames.length});
    }
    section.groups = [...groups.values()].sort((a, b) => b.stateCount - a.stateCount);
    section.missing = [...missing.values()];
  }
  return {sections, selected, groupRole};
}

/** 各类平铺并原速循环播放其首个真实来源。 */
export async function paintCharacterBattlePoses(root, {project, roleId, selectedId}) {
  if (!root) return;
  const {sections, selected, groupRole} = characterPoseCatalog(project, roleId, selectedId);
  const sources = await battleActorSources();
  if (!root.isConnected) return;
  root.replaceChildren();
  root.dataset.characterPoseCount = String(sections.reduce((sum, section) => sum + section.groups.length, 0));
  root.dataset.characterPoseMissing = String(sections.reduce((sum, section) => sum + section.missing.length, 0));
  root.dataset.characterPoseGroup = String(groupRole ?? "");

  if (groupRole == null) {
    const card = document.createElement("figure");
    card.className = "character-offgroup-pose";
    const caption = document.createElement("figcaption");
    caption.textContent = `当前战斗立绘 · ${selected?.resourceUid || "未选择"}`;
    card.append(caption);
    try {
      const action = selected && {...selected, key: selected.resourceUid, kind: "metasprite"};
      const raster = battleActorImage(sources, action, {size: 64, scale: 2, background: null});
      if (!raster) return;
      const canvas = document.createElement("canvas");
      canvas.dataset.characterOffgroupPose = selected.resourceUid;
      canvas.setAttribute("aria-label", caption.textContent);
      blitRaster(canvas, raster);
      card.append(canvas);
    } catch (error) {
      editorLog.error("预览", `操作失败：${error?.message || error}`, error);
      const message = document.createElement("p");
      message.className = "module-editor-error";
      message.textContent = `立绘预览失败：${error.message || error}`;
      card.append(message);
    }
    if (card.querySelector("canvas, .module-editor-error")) root.append(card);
  }

  for (const section of sections) {
    const {groups, kind} = section;
    const panel = document.createElement("section");
    panel.dataset.characterPoseKind = kind;
    panel.dataset.characterPoseCount = String(groups.length);
    const heading = document.createElement("h4");
    heading.textContent = section.label;
    panel.append(heading);
    root.append(panel);
    const strip = document.createElement("div");
    strip.className = `character-battle-pose-strip character-${kind}-gallery`;
    panel.append(strip);
    function drawEntry(entry) {
      if (entry.error) return;
      const card = document.createElement("figure");
      card.dataset.characterPoseSequence = entry.key;
      const caption = document.createElement("figcaption");
      caption.textContent = `走法 ${groups.indexOf(entry) + 1}`;
      card.append(caption);
      strip.append(card);
      const canvas = document.createElement("canvas");
      canvas.dataset.characterBattleLoop = "";
      canvas.setAttribute("aria-label", caption.textContent);
      card.append(canvas);
      try {
        const sprites = new Map();
        for (const run of entry.runs) {
          const raster = battleActorImage(sources, run.action, {size: 64, scale: 2, background: null});
          if (!raster) {card.remove(); return;}
          const sprite = document.createElement("canvas");
          blitRaster(sprite, raster);
          sprites.set(run.action.key, sprite);
        }
        const minX = Math.min(0, ...entry.runs.map(run => run.x));
        const maxX = Math.max(0, ...entry.runs.map(run => run.x));
        canvas.width = 64 + (maxX - minX) * 2;
        canvas.height = 64;
        const context = canvas.getContext("2d");
        const frames = entry.runs.flatMap(run => Array(run.frames).fill(run));
        let paintedFrames = 0;
        const draw = index => {
            const run = frames[index];
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(sprites.get(run.action.key), (run.x - minX) * 2, 0);
            canvas.dataset.characterBattleFrame = String(index);
            canvas.dataset.characterBattleTick = String(++paintedFrames);
        };
        canvas.dataset.characterBattleFrames = String(frames.length);
        draw(0);
        startNesFrameClock({frameCount: frames.length, loop: true,
          shouldContinue: () => canvas.isConnected, onFrame: draw});
      } catch (error) {
        editorLog.error("预览", `操作失败：${error?.message || error}`, error);
        canvas.remove();
        const message = document.createElement("p");
        message.className = "module-editor-error";
        message.textContent = `动作预览失败：${error.message || error}`;
        card.append(message);
      }
    }
    if (groupRole != null) groups.forEach(drawEntry);
  }
}
