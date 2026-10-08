// @editor-module 地形行为处理器的电梯分派语义。
// 依据：project/evidence/reverse-engineering/scene-elevator-dynamic-list/observations.json。
export function fieldElevatorSceneRanges(document) {
  const values = name => document?.blocks?.find(block =>
    block.id === `field-terrain-behavior-service.elevator-scene-${name}`)?.values;
  const lower = values('lower'), upper = values('upper');
  if (lower?.length !== 5 || upper?.length !== 5) throw new TypeError('电梯场景范围表未发布');
  return lower.map((value, instance) => [value, upper[instance]]);
}

export function fieldElevatorInstance(sceneId, behaviorCode, document) {
  if (behaviorCode !== 0x11) return null;
  const instance = fieldElevatorSceneRanges(document).findIndex(([lower, upper]) =>
    sceneId >= lower && sceneId < upper);
  return instance < 0 ? null : instance;
}

export function sceneHasElevatorDispatch(sceneId, document) {
  return fieldElevatorInstance(sceneId, 0x11, document) !== null;
}

// PRG $029034、$0290AA..$02911E 的移动前地形分派。
export function fieldTerrainMotion(document, behaviorCode, animationStep) {
  const blocks = document?.blocks || document?.document?.blocks || [];
  const whitelist = blocks.find(block => block.id === "field-terrain-behavior-service.whitelist-b065")?.values || [];
  if (!whitelist.slice(0, whitelist.indexOf(0)).includes(behaviorCode)) return null;
  if (behaviorCode >= 1 && behaviorCode <= 4) {
    return {directionCode: behaviorCode, speedIndex: 2, transported: true};
  }
  if (behaviorCode < 6 || behaviorCode > 10 || !animationStep) return null;
  const directions = blocks.find(block => block.id === "field-terrain-behavior-service.conveyor-directions")?.values;
  const index = 2 * (animationStep + 1) + behaviorCode - 8;
  const directionCode = directions?.[index];
  return directionCode >= 1 && directionCode <= 4
    ? {directionCode, speedIndex: 0, transported: true} : null;
}
