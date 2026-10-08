// @editor-module 战车受击只消费共享 VM 的逐帧结果，不解释命令或推导第二张车体图。
import {battleActorActionFromStateDelta} from "../core/battle-actor-assets.js";
import {nesVideoStandard, startNesFrameClock} from "../core/nes-video-standard.js";
import {vehiclePortraitImage} from "../modules/vehicle/components.js";
import {blitRaster} from "./chr-raster.js";
import {attackAnimationState} from "./weapon-effect-vm.js";

/** 分类只比较车体与连续位置变化；原始逐帧轨迹仍用于播放与来源时长。 */
export function vehicleHitMotions({assets, actorCatalog, appearanceKey, records}) {
  const animations = new Map();
  const groups = new Map();
  const unavailable = [];
  for (const record of records) {
    try {
      const visual = record.fields.visual_and_counter_initializer;
      if (visual.visual_selector == null) throw new Error("此行动没有可解码视觉，受击图暂不可预览。");
      if (!animations.has(visual.visual_selector)) {
        animations.set(visual.visual_selector, attackAnimationState(assets, visual.visual_selector));
      }
      const animation = animations.get(visual.visual_selector);
      if (!animation?.frames.length) throw new Error(`${visual.value} 没有可解码帧，受击图暂不可预览。`);
      const actions = new Map(animation.frames.map(frame => {
        const action = battleActorActionFromStateDelta(
          actorCatalog, appearanceKey, undefined, frame.actorStateDelta,
        );
        if (!action) throw new Error("当前战车没有可解码的车体图形。");
        return [action.key, action];
      }));
      if (actions.size !== 1) throw new Error("此行动含多个车体图形，不能按固定车体播放。");
      // 与战斗场景的 enemy 路径相同：这是我方受击者的轨迹。
      const positions = animation.frames.map(frame => frame.actorXDeltaAlternate);
      if (!positions.every(Number.isFinite)) throw new Error("共享 VM 未提供完整的受击位移。");
      const shape = positions.filter((x, index) => index === 0 || x !== positions[index - 1]);
      const action = actions.values().next().value;
      const key = JSON.stringify([action.key, shape]);
      if (!groups.has(key)) {
        groups.set(key, {
          positions, action, records: [], timingByRecord: new Map(),
          minX: Math.min(...positions), maxX: Math.max(...positions),
        });
      }
      groups.get(key).records.push(record);
      groups.get(key).timingByRecord.set(record.handle, positions.length);
    } catch (error) {
      unavailable.push({record, reason: String(error.message || error)});
    }
  }
  return {groups: [...groups.values()], unavailable};
}

/** 以真实 NES 帧时钟循环；全程位置相同的脚本保持静止。 */
export function paintVehicleHitMotion(root, {motion, sources}) {
  const canvas = root.querySelector("canvas");
  const scale = 3;
  const sprite = document.createElement("canvas");
  const raster = vehiclePortraitImage({sources, action: motion.action}, {size: 96, scale, background: null});
  if (!raster) throw new Error("当前战车没有可绘制的车体图形。");
  blitRaster(sprite, raster);
  canvas.width = 128 + (motion.maxX - motion.minX) * scale;
  canvas.height = 104;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  canvas.dataset.vehicleHitFrames = String(motion.positions.length);
  canvas.dataset.vehicleHitAction = motion.action.resourceUid;
  canvas.dataset.vehicleHitPositions = JSON.stringify(motion.positions);
  const draw = index => {
    const x = motion.positions[index];
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(sprite, 16 + (x - motion.minX) * scale, 4);
    canvas.dataset.vehicleHitFrame = String(index);
    canvas.dataset.vehicleHitX = String(x);
  };
  draw(0);
  startNesFrameClock({
    standard: nesVideoStandard().key, frameCount: motion.positions.length, loop: true,
    onFrame: draw, shouldContinue: () => canvas.isConnected,
  });
}
