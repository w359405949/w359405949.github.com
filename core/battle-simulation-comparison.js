// @editor-module 按回合、行动方、阶段与同类序号对齐实机记录与演算。

function tracePhase(step) {
  if (step.event.includes("回合开始")) return "turn";
  if (step.event.includes("攻击")) return "attack";
  if (step.event.includes("受伤")) return "damage";
  if (step.event.includes("死亡")) return "death";
  return step.phase === "exit" ? "end" : "entry";
}

export function compareBattleTrace(simulation, trace) {
  if (!trace?.steps) return [];
  let round = 0;
  const occurrences = new Map();
  return trace.steps.map((observed, index) => {
    const kind = tracePhase(observed);
    if (kind === "turn") round++;
    const side = observed.event.includes("戈斯战车攻击") || observed.event.includes("红狼受伤") ? "enemy"
      : observed.event.includes("红狼攻击") || observed.event.includes("护罩受伤") ? "party" : "";
    const key = `${round}:${kind}:${side}`;
    const ordinal = occurrences.get(key) || 0;
    occurrences.set(key, ordinal + 1);
    const candidates = simulation.steps.filter(step => step.kind === kind
      && (kind === "end" || step.round === round)
      && (!side || step.actor?.startsWith(`${side}:`)));
    const calculated = candidates[ordinal];
    const hp = calculated?.actors.find(actor => actor.side === "party")?.hp;
    const shield = calculated?.actors.find(actor => actor.side === "enemy")?.shield;
    const sameMessage = Boolean(calculated && observed.messageRecordId
      && observed.messageRecordId === calculated.messageRecordId);
    const sameHp = observed.hp === undefined ? null : Boolean(calculated && Number(observed.hp.replace("SI ", "")) === hp);
    const sameShield = observed.shield === undefined ? null : Boolean(calculated && observed.shield === shield);
    return {index, frame: observed.frame, round, observed, calculated, hp, shield, sameShield,
      sameMessage: observed.messageRecordId ? sameMessage : null, sameHp,
      reason: !calculated ? kind === "death" ? "规则缺口：占位结算得到不同胜负，无对应死亡步骤" : "规则缺口：每回合一次行动的占位没有对应步骤"
        : kind === "end" ? "规则缺口：只判存活方，未执行剧情返回"
          : sameHp === false || sameShield === false ? "规则缺口与随机状态差异：结果脚本／重复行动尚未解码；NMI 随机推进未对齐"
            : sameMessage === false && observed.messageRecordId ? "规则缺口：占位行动或结束分支的消息不同"
              : "可对齐；HP 初值相同不代表后续规则完整"};
  });
}
