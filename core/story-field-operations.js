// @editor-module 剧情现场实体与条件处理器的预览语义。
export const STORY_FIELD_OPERATIONS = Object.freeze({
  0x17: {operation: "step-toward-story-target", fidelity: "exact"},
  0x1E: {operation: "enter-field-travel-service", fidelity: "partial",
    missing: "field-travel-service-runtime"},
  0x2B: {operation: "restore-party-member-health", fidelity: "exact"},
  0x30: {operation: "release-selected-vehicle", fidelity: "exact"},
  0x31: {operation: "park-selected-vehicle", fidelity: "exact"},
  0x34: {operation: "step-toward-story-target-until-adjacent", adjacent_distance: 2, fidelity: "exact"},
  0x36: {operation: "branch-if-party-level-insufficient", fidelity: "exact"},
  0x40: {operation: "adopt-runtime-entity-state", fidelity: "exact"},
  0x45: {operation: "branch-if-party-money-insufficient", fidelity: "exact"},
  0x46: {operation: "set-runtime-party-slot-index", fidelity: "exact"},
  0x4B: {operation: "subtract-party-money", fidelity: "exact"},
  0x4D: {operation: "branch-on-field-ui-target", fidelity: "partial",
    missing: "field-ui-target-selection"},
  0x4E: {operation: "transfer-actor-to-runtime-entity", fidelity: "exact"},
  0x57: {operation: "relocate-runtime-target", fidelity: "exact"},
  0x5D: {operation: "branch-if-party-health-insufficient", fidelity: "exact"},
  0x6C: {operation: "clear-runtime-entity-render-slots", fidelity: "exact"},
  0x6D: {operation: "set-runtime-entity-move-direction", fidelity: "exact"},
  0x6F: {operation: "mark-ridden-vehicle-event-flags", fidelity: "exact",
    handler_cpu: 0xB5A0, handler_prg: 0x0355A0},
});

// $A097 把存活成员排在死亡成员前；$A053 的初始位置重叠。
export function storyFieldPartyOrder(members, slots) {
  const present = members.filter(member => slots.has(member.slot)).sort((a,b) => a.slot-b.slot);
  return [...present.filter(member => member.status !== 0xFF),
    ...present.filter(member => member.status === 0xFF)].map(member => member.slot);
}

// $A2AB 在每次格步开始时从尾到头复制前一实体的位置与移动方向。
export function beginStoryFieldStep(entities, x, y, direction, duration) {
  const directions = ["up", "down", "left", "right"];
  for (let index = entities.length - 1; index >= 0; index -= 1) {
    const entity = entities[index];
    const previous = entities[index - 1];
    entity.motion = {fromX: entity.x, fromY: entity.y,
      toX: previous?.x ?? x, toY: previous?.y ?? y,
      elapsed: 0, duration, animate: entity.renderMode === "type-animation"};
    entity.moveDirectionCode = previous ? previous.moveDirectionCode ?? 0
      : directions.indexOf(direction) + 1;
    entity.moveDirection = directions[entity.moveDirectionCode - 1] ?? null;
    if (entity.moveDirection) entity.direction = entity.moveDirection;
  }
}

export function advanceStoryFieldStep(entities) {
  let completed = false;
  for (const entity of entities) {
    const motion = entity.motion;
    if (!motion) continue;
    motion.elapsed += 1;
    const fraction = Math.min(1, motion.elapsed / motion.duration);
    entity.x = motion.fromX + (motion.toX-motion.fromX) * fraction;
    entity.y = motion.fromY + (motion.toY-motion.fromY) * fraction;
    if (fraction === 1) {
      entity.motion = null;
      completed = true;
    }
  }
  // PRG $034301–$03430A 在格步结束后从尾到头复制前一实体的朝向。
  if (completed) for (let index = entities.length - 1; index > 0; index -= 1)
    entities[index].direction = entities[index - 1].direction;
}
