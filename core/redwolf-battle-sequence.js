// @editor-module 已发布的戈麦斯与红狼 Mesen 战斗事件投影。

const SOURCE = "project/evidence/mesen/redwolf-battle-trace/timeline.jsonl";
const PATTERN = "enemy-action-pattern:0A";
const actions = {
  "04": {resultScriptHandle: "battle-result-script:29", attackVisualHandle: "attack-visual:02",
    source: "monster:12:4", selectionSlot: 1},
  "05": {resultScriptHandle: "battle-result-script:01", attackVisualHandle: "attack-visual:01",
    source: "monster:12", selectionSlot: 0},
};
const runtime = {monsterId: 0x0C, enemyGroupCount: 1};

function retainedDamageSequence(promptRecord, damageRecord) {
  return [
    {state: "battle-messages.action", slot: "slot:message:0",
      text_record_ref: {resource_id: "text-record", node_id: promptRecord},
      retain_previous: false},
    {state: "battle-messages.damage", slot: "slot:message:0",
      text_record_ref: {resource_id: "text-record", node_id: damageRecord},
      retain_previous: true},
  ];
}

function turn(frame, number, hp, shield, seed) {
  return {frame, event: `第 ${number} 回合开始`, message: `红狼 HP ${hp}；戈麦斯护罩 ${shield}`,
    hp: String(hp), shield, statusWindow: {label: "HP", value: hp},
    actionPatternHandle: PATTERN,
    romBasis: `PRG $02052B 排序；$37/$38=${seed}；PRG $0203FD 选择敌方行动`,
    evidence: `${SOURCE}：${frame === 2738 ? 2741 : frame} turn-queue；画面取第 ${frame} 帧`};
}

function attack(frame, sourceFrame, action, hp, attackFrameIndex = null) {
  const {source, selectionSlot, ...handles} = actions[action];
  return {frame, event: "戈斯战车攻击红狼", message: "戈斯战车的攻击！",
    hp: String(hp), statusWindow: {label: "HP", value: hp},
    actionPatternHandle: PATTERN, actionHandle: `enemy-action:${action}`,
    ...handles, attack: {side: "enemy", attacker: 0, partyTarget: 0, source, selectionSlot},
    attackFrameIndex,
    messageRecordId: "record:0A:112", messageRuntime: runtime,
    romBasis: `PRG $020506 写 $71B5=$${action}；行动 ${action} 指向消息 112、结果脚本与攻击视觉`,
    evidence: `${SOURCE}：${sourceFrame} gomez-attack-message；画面第 ${frame} 帧`
      + (attackFrameIndex === null ? "" : `；攻击视觉剪辑第 ${attackFrameIndex} 帧与 Mesen 同帧核对`),
    missing: attackFrameIndex === null ? ["本次视觉特效起止帧与攻击位置"]
      : ["攻击视觉结束帧与受击时序"]};
}

function wolfDamage(frame, sourceFrame, amount, hp, statusWindow = {label: "HP", value: hp}) {
  return {frame, event: "红狼受伤", message: `狼损伤了 ${amount}！；HP ${hp}`,
    hp: statusWindow.label === "SI" ? "SI 0" : String(hp), statusWindow,
    messageRecordId: "record:0A:008",
    messageSequence: retainedDamageSequence("record:0A:112", "record:0A:008"),
    messageRuntime: {monsterId: 0x0C, enemyGroupCount: 1, placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 文本观察"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(amount), label: "Mesen 伤害观察"},
    }},
    romBasis: "PRG $02EF03 计算伤害；PRG $02F011 扣除红狼 HP",
    evidence: `${SOURCE}：${sourceFrame} wolf-damage；画面第 ${frame} 帧；Mesen 保留行动 112 后显示伤害 008`};
}

function wolfAttack(frame, sourceFrame, hp) {
  return {frame, event: "红狼攻击戈麦斯", message: "红狼的攻击", hp: String(hp),
    statusWindow: {label: "HP", value: hp}, messageRecordId: "record:0A:020",
    messageRuntime: {placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 出手者观察"},
    }},
    romBasis: "PRG $02ECA5；record:0A:020",
    evidence: `${SOURCE}：${sourceFrame} wolf-attack-message；画面第 ${frame} 帧`,
    missing: ["红狼指令与攻击视觉的运行时选择"]};
}

function shieldDamage(frame, sourceFrame, amount, shield, hp) {
  return {frame, event: "戈麦斯护罩受伤", message: `戈斯战车损伤了 ${amount}！；护罩剩余 ${shield}`,
    hp: String(hp), shield, statusWindow: {label: "HP", value: hp},
    messageRecordId: "record:0A:016",
    messageSequence: retainedDamageSequence("record:0A:020", "record:0A:016"),
    messageRuntime: {enemyGroupCount: 1, placeholders: {
      "ui-text-provider-workspace.current-string": {text: "狼", label: "Mesen 出手者观察"},
      "ui-text-provider-zero-page-overlays.current-record": {text: "戈斯战车", label: "Mesen 受击者观察"},
      "ui-text-provider-zero-page-overlays.battle-quantity": {text: String(amount), label: "Mesen 护罩伤害观察"},
    }},
    romBasis: "PRG $02EDDB 计算；PRG $02ECA5 结算护罩",
    evidence: `${SOURCE}：${sourceFrame} gomez-shield-damage；画面第 ${frame} 帧；Mesen 保留行动 020 后显示伤害 016`,
    missing: ["护罩状态窗取值"]};
}

export const REDWOLF_BATTLE_SEQUENCE = Object.freeze({
  id: "gomez-redwolf-trace", title: "戈麦斯与红狼 · 已观察战斗回放",
  formationId: 0x0C, bgm: "音频命令 $07",
  romBasis: "PRG $025C1A 经剧情 opcode $37 进入编队 $0C；逐帧依据见 redwolf-battle-trace",
  steps: [
    {frame: 2670, event: "战斗入场", message: "戈斯战车出现", hp: "3779",
      messageRecordId: "record:0A:013", messageRuntime: runtime,
      romBasis: "PRG $0399C1 编队 $0C；record:0A:013；音频命令 $07",
      evidence: `${SOURCE}：2491 battle-entry、2620 text-selector；entry.png`,
      missing: ["入场字幕与画面逐帧时序"]},
    turn(2738, 1, 3779, 175, "$F5/$A0"),
    attack(2790, 2755, "04", 3779, 0), wolfDamage(2835, 2801, 294, 3485),
    attack(2880, 2842, "05", 3485, 0), wolfDamage(2970, 2938, 753, 2732),
    attack(3095, 2979, "05", 2732), wolfDamage(3105, 3075, 603, 2129),
    wolfAttack(3145, 3116, 2129), shieldDamage(3240, 3210, 17, 158, 2129),
    turn(3278, 2, 2129, 158, "$15/$26"),
    attack(3393, 3292, "05", 2129), wolfDamage(3420, 3388, 547, 1582),
    attack(3460, 3428, "04", 1582), wolfDamage(3500, 3474, 405, 1177),
    attack(3560, 3514, "05", 1177), wolfDamage(3640, 3610, 535, 642),
    wolfAttack(3670, 3651, 642), shieldDamage(3780, 3745, 16, 142, 642),
    turn(3813, 3, 642, 142, "$FD/$A4"),
    attack(3940, 3827, "05", 642), wolfDamage(3950, 3923, 700, 0, {label: "SI", value: 0}),
    {frame: 4000, event: "红狼死亡", message: "狼死了！；SI 0", hp: "SI 0",
      statusWindow: {label: "SI", value: 0}, messageRecordId: "record:0A:011",
      romBasis: "PRG $02EF74 死亡分支；3984 party-wipe 与 wolf-death-recovery",
      evidence: `${SOURCE}：3964 wolf-death-message；wolf-death.png`,
      missing: ["死亡形态与退场动画", "死亡消息运行时姓名绑定"]},
    {frame: 4500, phase: "exit", event: "剧情场景返回", message: "场景 $84",
      romBasis: "PRG $02EF74 返回剧情", evidence: `${SOURCE}：4140 story-return；story-return.png`,
      missing: ["剧情场景画面与战斗回放的切换接口"]},
  ],
});
