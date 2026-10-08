// @editor-module 战斗入口的事件号与视听分支。

// A644 从 ECC2+0F 逆序比较，末字节 20 属于相邻函数的首指令。
// 原像与消费路径见 project/evidence/battle-entry-boss-flag/rom-paths.json。
const ESCAPE_EVENT_FLAGS = Object.freeze([
  0x00, 0x50, 0x51, 0x54, 0x55, 0x57, 0x58, 0x59,
  0x53, 0xB1, 0x1C, 0xB2, 0xB3, 0x8F, 0x78, 0x20,
]);

export function battleFirstMonsterId(slots) {
  if (!Array.isArray(slots)) return null;
  const first = slots[0];
  if (!first || Number(first.count) === 0) return 0xFF;
  return first.monster_reference
    ? Number.parseInt(first.monster_reference.split(":").at(-1), 16)
    : Number(first.monster_id);
}

export function battleModeForPendingEventFlag(value, firstMonsterId = null) {
  const flag = Number(value);
  if (!Number.isInteger(flag) || flag < 0 || flag > 0xFF) return null;
  const boss = flag === 0xF0 || (flag > 0 && flag < 0x60);
  return Object.freeze({
    label: boss ? "BOSS" : "普通",
    musicCommand: Number.isInteger(firstMonsterId) && firstMonsterId >= 0x80 && firstMonsterId <= 0xFF
      ? 0x06 : boss ? 0x08 : 0x07,
    deathEffect: boss ? 0x02 : 0x01,
    escapeEligible: ESCAPE_EVENT_FLAGS.includes(flag),
    victorySoundCommand: flag > 0 && flag < 0x60 ? 0x70 : 0x71,
    completionFlag: flag || null,
    wantedDefeatLevel: flag >= 0x50 && flag < 0x5D,
    wantedId: flag >= 0x50 && flag <= 0x5A ? flag - 0x4F : null,
    randomMissEligible: flag === 0,
  });
}

export function battleFlowForStoryState(value) {
  const storyState = Number(value);
  if (!Number.isInteger(storyState) || storyState < 0 || storyState > 0xFF) return null;
  return Object.freeze({
    automatic: storyState === 0x06,
    exitMode: storyState === 0 ? 0x08 : 0x03,
    clearStoryStateOnExit: storyState >= 0x80,
    companionRecovery: storyState === 0x04,
    restorePartyOnWipe: storyState === 0x06,
  });
}
