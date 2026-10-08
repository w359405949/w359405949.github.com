// @editor-module 调色板运行时字段对象的场景 CHR 动画预览。
import {sceneFieldChrAnimation} from "./scene-config-owner.js";

export function fieldChrAnimationRecipe(document) {
  return document?.field_chr_animation || null;
}

export function fieldChrAnimationDuration(recipe, scene) {
  if (Number(scene?.id) === 0) return Number(recipe?.world?.step_frames) || 0;
  if (!recipe || !sceneFieldChrAnimation(scene)) return 0;
  return Number(scene.id) === recipe.slow_scene_id
    ? recipe.slow_step_frames : recipe.step_frames;
}

export function fieldChrAnimationMask(recipe, scene) {
  return Number(scene?.id) === 0 ? recipe.world.phase_mask : recipe.phase_mask;
}

export function advanceFieldChrAnimation(animation, recipe, scene, step) {
  const duration = fieldChrAnimationDuration(recipe, scene);
  if (!duration) return;
  animation.timer += 1;
  if (animation.timer < duration) return;
  animation.timer = 0;
  animation.phase = (animation.phase + step) & fieldChrAnimationMask(recipe, scene);
}

const loopClocks = new WeakMap();

export function fieldChrAnimationPlaybackPhase(compiled, frameIndex, rawFrame) {
  const snapshot = compiled.frames[frameIndex];
  if (!snapshot?.backgroundAnimationClock?.duration) return snapshot?.backgroundAnimationPhase;
  const start = compiled.loopStart;
  if (start == null || rawFrame < compiled.duration) return snapshot.backgroundAnimationPhase;
  let profile = loopClocks.get(compiled);
  if (!profile) {
    const cycle = compiled.frames.slice(start);
    const first = cycle.find(frame => frame.backgroundAnimationClock);
    const clock = {...(first?.backgroundAnimationVisibleClock || first?.backgroundAnimationClock)};
    const phases = [], seen = new Map();
    while (!seen.has(clock.timer)) {
      seen.set(clock.timer, phases.length);
      for (const frame of cycle) {
        phases.push(clock.phase);
        const tick = frame.backgroundAnimationVisibleClock || frame.backgroundAnimationClock;
        if (!tick?.duration) continue;
        clock.timer += 1;
        if (clock.timer < tick.duration) continue;
        clock.timer = 0;
        clock.phase = (clock.phase + tick.step) & tick.mask;
      }
    }
    const repeat = seen.get(clock.timer);
    profile = {phases, repeat, length: phases.length - repeat,
      delta: clock.phase - phases[repeat], mask: clock.mask};
    loopClocks.set(compiled, profile);
  }
  const offset = rawFrame - start;
  if (offset < profile.phases.length) return profile.phases[offset];
  const cycles = Math.floor((offset - profile.repeat) / profile.length);
  return (profile.phases[profile.repeat + (offset - profile.repeat) % profile.length]
    + cycles * profile.delta) & profile.mask;
}

export function fieldChrAnimationBanks(scene, recipe, phase) {
  const banks = scene.render?.mmc3_banks;
  if (phase == null || !recipe || !sceneFieldChrAnimation(scene)) return banks;
  const result = [...banks];
  const firstBank = Number(scene.id) === recipe.first_bank_scene_id;
  result[firstBank ? 0 : 2] = recipe.banks[firstBank
    ? (phase & recipe.phase_mask) >> 1 : phase % recipe.banks.length];
  return result;
}

export function worldChrAnimationBank(recipe, phase) {
  return phase == null || !recipe?.world ? null
    : recipe.world.banks[phase & recipe.world.phase_mask];
}
