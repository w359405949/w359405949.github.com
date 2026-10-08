// @editor-module 有依据的战斗规则与明确占位共同推进只读演算。
import {globalRandom as battleRandom} from "../core/global-random.js";
import {battleDefenseCollision, battleResultStateBranch} from "../core/battle-result-script-runtime.js";
import {battleResultRewardTotals} from "../core/battle-result-values.js";
import {battleEncounterResult} from './battle-encounter-result.js';
import {battleCommandEffects} from '../core/battle-command-effects.js';
import {applyBattleVehicleCondition, battleVehicleConditionRound, settleBattleVehicleDamage} from '../core/battle-vehicle-values.js';

const evidence = name => `project/evidence/reverse-engineering/${name}/observations.json`;
export const BATTLE_SIMULATION_RULES = Object.freeze({
  random: {label: "双字节随机状态与有界乘法", basis: evidence("global-random-state")},
  initiative: {label: "速度加随机低六位，饱和至 255；稳定降序", basis: `${evidence("initiative-score-byte-saturation")}；PRG $02052B–$0205B4`},
  selection: {label: "策略阈值扫描与行动模式引用", basis: `${evidence("enemy-action-selection-field-bindings")}；PRG $0203FD–$020516`},
  amount: {label: "技能差缩放攻击、减半防御，再随机增减至多 50/256", basis: "PRG $02EC9D–$02ED8D；battle-amount-scaling-service"},
  hp: {label: "护罩除五结算；HP 扣至零；死亡退出队列", basis: `${evidence("enemy-damage-application")}；PRG $02F011–$02F051`},
  messages: {label: "行动→损伤→死亡；保留前一消息", basis: evidence("battle-message-sequences")},
  npc: {label: "红狼剧情初值 HP 3779、攻击 590、防御 750", basis: "PRG $021A17–$021A73：立即数写 $6466/$646C/$6472；未取 Mesen 采样"},
  initialization: {label: "bit7 分流护罩与内部 HP；高两位为零时内部 HP 乘四", basis: "PRG $020F42–$020F76；project/evidence/battle-simulation-rules/observations.json"},
  replacement: {label: "独存敌人的 F6 结果移除原槽并按增援规则装载操作数引用的怪物", basis: "PRG $02F499–$02F4DE、$02F824–$02F832、$0212A6–$0212F0；策略 12 比较护罩与初值四分之一：$0204A7–$0204B5"},
  exit: {label: 'EE 递减退出控制字；目标列表完成后敌槽离场，不累计击破奖励', basis: `${evidence('battle-ee-exit')}；PRG $07ECB3–$07ECB6、$02F124–$02F138、$02EE87–$02EF00`},
  presentation: {label: "存活受击保留背景；击破闪烁后移除；替换按扫描线揭示入场", basis: "PRG $02EA12–$02EA1D、$02EAF9–$02EB0D、$02F4BD–$02F4C4、$07E123–$07E184、$07D5D2–$07D5E8"},
  route: {label: "CB／D3 物理量、D4 随机量、D5 重复量、C9 抗性缩放、C0／E2 受击、F9／FA 火焰与冷气、F3／F4 恢复；其余占位", basis: "PRG $02EC2B–$02EC9D、$02F22D–$02F2E4、$02ED8E–$02EDD0、$02F3E2–$02F41A、$02F6AA–$02F729、$02F78E–$02F7E8", placeholder: true},
  conditions: {label: '火焰与冷气每回合持续伤害；三回合计数递减到零时以随机低四位小于六恢复，保留时下一回合恢复', basis: 'PRG $02F6AA–$02F6DE、$020093–$0200BE；结果记录 5E／5F→5B／5C、B8→B6'},
  vehicle: {label: '战车伤害除五后防御折半；护甲耗尽时按部件防御判定损坏，底盘破坏使人物下车', basis: `${evidence('battle-vehicle-settlement')}；PRG $02F3F6–$02F40E、$02F4F9–$02F59C`},
  vehicleConditions: {label: 'FA 06 火焰、FA 07 冷气互斥；重复施加刷新三回合计数，F4 清除战车状态', basis: `${evidence('battle-vehicle-settlement')}；PRG $02F6F0–$02F729、$02F7AF–$02F7E8`},
  party: {label: "红狼指令 0C、武器 3C；速度与技能继承玩家槽", basis: "PRG $021AD2–$021AE5、$021174–$021177、$0212CD–$0212F0"},
  partyCurrent: {label: '人物按调用方队伍与当前装备参战', basis: 'role-equipment-derived；PRG $02E7F5–$02E9B3'},
  commands: {label: '工具自用、携带栏移除、普通弹数与炮弹槽结算；辅助行动按已选命令执行',
    basis: 'project/evidence/reverse-engineering/battle-command-state-machine/command-gaps.json'},
  repeat: {label: "次数为 packed_b 高两位右移一位加一，奇数且随机高字节≥96 时再加一；bit5 每次出手前重选", basis: "PRG $020F2D–$020F3F、$02E689–$02E6DE"},
  target: {label: "单体倒序收集存活队员，固定目标优先；bit4 缓存目标；全体正序", basis: "PRG $02F07C–$02F0E6"},
  collision: {label: '双方完整防御差决定受击方；追加视觉 00；结算完成后抑制重复结算，死亡结束剩余出手', basis: evidence('battle-ed-collision')},
  end: {label: "红狼全灭恢复玩家槽并返回剧情事件 82；其余奖励占位", basis: "PRG $02EF74–$02EFB3", placeholder: true},
  encounter: {label: "胜利按击破奖励提交事件；普通败北交接复活剧情", basis: "PRG $02EECD–$02EF00、$02EF74–$02EFE1"},
  timing: {label: "占位：画面、消息与等待帧之间的随机调用未调度", basis: "PRG $07D01D–$07D063；project/evidence/battle-simulation-rules/observations.json", placeholder: true},
});

/** PRG $02EDDB–$02EEC7：当前护罩或 HP 的独立伤害结算。 */
function settleBattleDamage(target, amount, random, riding = target.riding) {
  if (target.side === 'party' && riding) return settleBattleVehicleDamage(target, amount, random);
  const shielded = target.side === "enemy" && target.shield > 0;
  const guarded = target.side === "enemy" ? Boolean(target.guard) : Boolean(target.defending);
  const reduced = guarded ? Math.floor(amount / 2) : amount;
  const settled = shielded ? Math.floor(reduced / 5) : reduced;
  const before = {hp: target.hp, shield: target.shield};
  const after = {...before, [shielded ? "shield" : "hp"]:
    Math.max(0, before[shielded ? "shield" : "hp"] - settled)};
  const dead = !after.hp && !after.shield;
  return {shielded, settled, before, after, dead, status: dead ? 255 : target.status};
}


function selectBattleEnemyAction(actor, input, rng) {
  const roll = rng.next();
  const pattern = input.patterns.find(row => row.current_monster_users?.includes(actor.handle));
  const strategy = actor.flags & 15;
  let profile, slot = 0;
  const missing = reason => ({missing: [`占位：${reason}`]});
  if (actor.status & 16) {
    const thresholds = input.profiles.find(row => row.id === 1)?.thresholds;
    if (!thresholds || !input.statusOverrideActions) return missing('乱阵覆盖的当前阈值或行动缺失');
    while (slot < 5 && roll >= thresholds[slot]) slot++;
    const id = input.statusOverrideActions[slot]?.action_id;
    const action = input.actions.find(row => row.id === id);
    return action ? {action, slot, all: false,
      missing: ['占位：状态覆盖行动的计数与模式槽位未确认']} : missing('乱阵覆盖行动不存在');
  }
  if (strategy === 0) return missing('策略零的直接行动引用尚未接入');
  else if ([1, 2].includes(strategy)) profile = strategy;
  else if (strategy === 3) {
    if (actor.hp <= Math.floor(actor.maxHp / 4)) profile = 3;
  }
  else if (strategy === 4 || strategy === 5) {
    if (!Number.isInteger(actor.aiCycle)) return missing('策略循环计数缺失');
    const next = (actor.aiCycle + 1) & 255;
    slot = next === 6 ? 0 : next;
    actor.aiCycle = strategy === 5 ? (slot + 1) & 255 : slot;
    if (strategy === 5) profile = 4;
  } else if (strategy === 6) {
    if (actor.shield <= Math.floor(actor.maxShield / 4)) profile = 3;
  } else if (strategy === 7) {
    if (!Number.isInteger(actor.defensePool)) return missing('策略可破坏防御池缺失');
    if (!actor.defensePool) profile = 3;
  } else if (strategy === 8) {
    if (!Number.isInteger(input.initiativeMode)) return missing('策略先制状态缺失');
    if (!(input.initiativeMode & 128)) profile = 3;
  } else if (strategy === 9) {
    if (!Number.isInteger(actor.actionUses?.[0])) return missing('策略首槽行动计数缺失');
    if (!actor.actionUses[0]) profile = 3;
  } else if (strategy === 10) profile = 5;
  else if (strategy === 11) profile = input.party.some(row => row.present && row.status === 255) ? 2 : 6;
  else if (strategy === 12) profile = actor.shield <= Math.floor(actor.maxShield / 4) ? 0 : 5;
  else return missing(`怪物策略 $${strategy.toString(16).toUpperCase()} 未确认`);
  if (profile !== undefined) {
    const thresholds = input.profiles.find(row => row.id === profile)?.thresholds;
    if (!thresholds) return missing('策略概率阈值缺失');
    while (slot < 5) {
      if (!Number.isInteger(thresholds[slot])) return missing('策略扫描所需的阈值缺失');
      if (thresholds[slot] && thresholds[slot] >= roll) break;
      slot++;
    }
  }
  const selected = pattern?.slots?.[slot];
  const action = input.actions.find(row => row.handle === selected?.action_reference);
  return {action,
    pattern: pattern?.handle, slot, all: Boolean(selected?.all_targets),
    missing: !selected || !action ? ['占位：行动模式或所选行动缺失'] : []};
}

function calculateBattlePhysicalAmount(attack, defense, rng,
  {attackSkill = 0, defenseSkill = 0, rateFactors} = {}) {
  if (attackSkill !== defenseSkill) {
    if (!rateFactors?.length) throw new TypeError("缺少技能差倍率当前值");
    const difference = Math.abs(attackSkill - defenseSkill);
    const index = Math.floor(Math.min(50, difference * 3) / 5) + 1;
    const adjustment = Math.floor(attack * rateFactors[index] / 256);
    attack = (attackSkill < defenseSkill ? attack - adjustment : attack + adjustment) & 65535;
  }
  let base = attack - Math.floor(defense / 2);
  if (base <= 0) base = rng.snapshot().high & 3;
  const roll = rng.below(102);
  const adjustment = Math.floor(base * (roll < 51 ? roll : roll - 51) / 256);
  return (roll < 51 ? base - adjustment : base + adjustment) & 65535;
}

function battleEnemyActionCount(actor, rng) {
  const code = actor.repeatCode ?? 0;
  return (code >>> 1) + 1 + ((code & 1) && rng.snapshot().high >= 96 ? 1 : 0);
}

/** 未确认的指令不产生伤害；缺失项随当前步骤传给消费方。 */
function calculateBattleResult(program, actor, target, input, rng, depth = 0, prepared = {}) {
  if (depth >= 16) return {missing: ["占位：结果脚本循环分支未确认"]};
  if (program?.missing?.length) return {missing: program.missing};
  if (!program?.operations) return {missing: program?.missing || ["占位：结果脚本未解码"]};
  let {amount = 0, applies = false, messages = [], conditions = [], riding = target.riding, conditionSelector} = prepared;
  const resultActor = actor.side === 'party' ? actor : target;
  const branchResult = handle => calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
    actor, target, input, rng, depth + 1, {amount, applies, messages, conditions, riding, conditionSelector});
  const physical = () => calculateBattlePhysicalAmount(actor.attack, target.defense, rng, {
    attackSkill: actor.attackSkill, defenseSkill: target.defenseSkill, rateFactors: input.rateFactors,
  });
  for (const operation of program.operations) {
    if (operation.kind === "party-physical" || operation.kind === "enemy-physical") {
      if (operation.kind === "party-physical") {
        if (actor.riding) return {missing: ['占位：战车出手结算尚未接入']};
        const state = rng.snapshot();
        if (input.story?.kind !== 'redwolf' && state.high < 85 && state.low < (actor.attackSkill ?? 0))
          return {missing: ["占位：会心一击消息与效果未确认"]};
        if (target.missing?.some(value => value.includes("特殊怪物防御")))
          return {missing: ["占位：特殊防御池的消耗分支未接入"]};
      }
      amount = physical();
      if (operation.kind === "party-physical") applies = true;
    } else if (operation.kind === "enemy-ignore-defense") {
      amount = calculateBattlePhysicalAmount(actor.attack, 0, rng, {
        attackSkill: actor.attackSkill, defenseSkill: 0, rateFactors: input.rateFactors,
      });
      messages.push(operation.messageRecordId);
    } else if (operation.kind === "random-branch") {
      const handle = (rng.next() & 15) >= operation.threshold ? operation.pass : operation.fail;
      return branchResult(handle);
    } else if (operation.kind === "state-branch") {
      const branch = battleResultStateBranch(operation, {
        readState: selector => resultActor.resultConditionStates?.[selector], random: rng,
      });
      if (branch.missing.length) return {missing: branch.missing};
      return branchResult(branch.handle);
    } else if (operation.kind === "jump" || operation.kind === "actor-branch") {
      if (operation.kind === "actor-branch" && typeof resultActor.riding !== 'boolean')
        return {missing: ['占位：本次人物与战车结果分支缺少目标类别']};
      const handle = operation.kind === "jump" ? operation.handle : resultActor.riding ? operation.vehicle : operation.role;
      return branchResult(handle);
    } else if (operation.kind === 'result-target-kind') {
      riding = operation.riding;
    } else if (operation.kind === 'random-amount') {
      const profile = input.randomAmounts?.find(row => row.profile_index === operation.profile);
      if (!profile) return {missing: ['占位：随机量参数缺失']};
      amount = profile.minimum + rng.below(profile.exclusive_random_span);
    } else if (operation.kind === 'damage-resistance') {
      const resistance = target.damageResistances?.[operation.selector];
      if (!Number.isInteger(resistance) || resistance < 0 || resistance > 3)
        return {missing: ['占位：本次目标的伤害抗性档缺失']};
      if (resistance === 3) amount = (amount * 2) & 65535;
      else if (resistance) {
        if (amount > 32767) return {missing: ['占位：高位伤害抗性乘法的进位分支未接入']};
        const factor = input.rateFactors?.[resistance - 1];
        if (!Number.isInteger(factor)) return {missing: ['占位：伤害抗性倍率缺失']};
        amount = Math.floor(amount * factor / 256);
      }
    } else if (operation.kind === 'party-condition') {
      if (target.side !== 'party') return {missing: ['占位：人物状态指令缺少人物目标']};
      conditions.push({selector: operation.selector});
    } else if (operation.kind === 'vehicle-condition') {
      if (target.side !== 'party') return {missing: ['占位：战车状态指令缺少人物目标']};
      if (target.riding && !Number.isInteger(target.vehicle?.condition))
        return {missing: ['占位：本次战车状态现场缺失']};
      conditions.push({selector: operation.selector, target: 'vehicle'});
    } else if (operation.kind === 'clear-vehicle-condition') {
      if (target.side !== 'party' || ![6, 7].includes(conditionSelector))
        return {missing: ['占位：本次战车状态恢复的状态位现场未确认']};
      conditions.push({selector: conditionSelector, operation: 'clear', target: 'vehicle'});
    } else if (operation.kind === 'clear-party-condition') {
      if (target.side !== 'party' || ![5, 6].includes(conditionSelector))
        return {missing: ['占位：本次状态恢复的状态位现场未确认']};
      conditions.push({selector: conditionSelector, operation: 'clear'});
    } else if (operation.kind === 'result-message') {
      messages.push(operation.messageRecordId);
    } else if (operation.kind === "enemy-sixteenth-repeat") {
      const profile = input.randomAmounts?.find(row => row.profile_index === operation.profile);
      if (!profile) return {missing: ["占位：随机量参数缺失"]};
      const count = (profile.minimum + rng.below(profile.exclusive_random_span)) & 255;
      amount = (Math.floor(physical() / 16) * (count || 256)) & 65535;
    } else if (operation.kind === "apply-party-damage") {
      applies = true;
    } else if (operation.kind === "replace-enemy") {
      return {replacement: operation.monsterId, applies: false, missing: []};
    } else if (operation.kind === 'defense-collision') {
      const collision = battleDefenseCollision(actor, target);
      if (collision.missing.length) return collision;
      if (!collision.reflected && riding) return {missing: ['占位：载具部件与护甲结算未解码']};
      return {amount: collision.amount, applies: true, messages, conditions, collision, missing: []};
    } else if (operation.kind === 'enemy-exit') {
      if (actor.side !== 'enemy') return {missing: ['占位：EE 缺少敌方行动现场']};
      return {enemyExit: true, applies: false, messages, conditions, missing: []};
    } else return {missing: [`未确认：本次攻击结果 ${operation.kind} 的执行现场`]};
  }
  return {amount, applies, messages, conditions, riding, missing: []};
}

/** 输入只持字段对象当前值的投影；本函数不读取 ROM 或实机时间线。 */
export function simulateBattle(input, {seed = 0, maxRounds = 100} = {}) {
  const previousRandom = input.encounter?.randomState;
  const rng = battleRandom(previousRandom ? previousRandom.high * 256 + previousRandom.low : seed);
  const actors = structuredClone([...input.party, ...input.enemies]).map(actor => ({...actor, incarnation: actor.incarnation ?? 0}));
  if (!actors.length || !input.party.length || !input.enemies.length) throw new TypeError("战斗须有双方参战者");
  const steps = [];
  const message = event => {
    const record = input.messageCalls?.[event];
    if (!record) throw new TypeError(`战斗事件缺少文字调用：${event}`);
    return record;
  };
  const enemyEvents = structuredClone(input.encounter?.enemyEvents || []);
  const deaths = structuredClone(input.encounter?.deaths || []);
  const resultMissing = new Set(actors.flatMap(actor => actor.missing || []));
  let incarnation = Math.max(...actors.map(actor => actor.incarnation));
  const commandRound = Boolean(input.encounter?.commands || input.encounter?.actorState);
  for (const actor of actors.filter(actor => actor.side === 'party'))
    actor.defending = actor.selectedCommand?.kind === 'defend';
  const protector = input.encounter?.commands?.findLast(command => command.kind === 'protect')?.role;
  const alive = side => actors.filter(actor => actor.side === side && (actor.hp > 0 || actor.shield > 0)
    && !(actor.status & 0x80));
  const snapshot = () => structuredClone(actors);
  const append = step => steps.push({index: steps.length, actors: snapshot(),
    enemyEvents: structuredClone(enemyEvents), random: rng.snapshot(), ...step});
  const applyConditions = (result, actor, target) => {
    for (const condition of result.conditions || []) {
      if (condition.target === 'vehicle') {
        const effect = applyBattleVehicleCondition(target, condition);
        for (const gap of effect.missing) resultMissing.add(gap);
        if (effect.changed) append({kind: 'condition', round, actor: actor.id, targets: [target.id],
          event: `${target.label} · ${condition.operation === 'clear' ? '状态恢复' : condition.selector === 6 ? '火焰' : '冷气'}`,
          messageRecordId: effect.messageRecordId, rules: ['vehicleConditions'], missing: []});
        continue;
      }
      if (target.status & 128) continue;
      const {selector} = condition;
      if (condition.operation === 'clear') {
        if (!(target.status & (128 >>> selector))) continue;
        target.status &= ~(128 >>> selector);
        append({kind: 'condition', round, actor: actor.id, targets: [target.id],
          event: `${target.label} · 状态恢复`, messageRecordId: `record:0A:${String(selector === 5 ? 50 : 51).padStart(3, '0')}`,
          rules: ['conditions'], missing: []});
        continue;
      }
      if (target.status & (selector === 5 ? 2 : 4)) continue;
      target.status |= 128 >>> selector;
      target.conditionTurns = {...target.conditionTurns, [selector]: 3};
      append({kind: 'condition', round, actor: actor.id, targets: [target.id],
        event: `${target.label} · ${selector === 5 ? '火焰' : '冷气'}`,
        messageRecordId: `record:0A:${String(34 + selector).padStart(3, '0')}`,
        rules: ['conditions'], missing: []});
    }
  };
  const applyDamage = (result, target) => {
    const damage = settleBattleDamage(target, result.amount, rng, result.riding);
    if (damage.missing?.length) {
      for (const gap of damage.missing) resultMissing.add(gap);
      append({kind: 'result', round, targets: [target.id], event: `${target.label} · 结果未结算`,
        rules: ['vehicle'], missing: damage.missing});
      return null;
    }
    Object.assign(target, structuredClone(damage.after), {status: damage.status});
    if (target.vehicle?.equipmentState && target.vehicle.parts)
      target.vehicle.parts.forEach((part, index) => {target.vehicle.equipmentState[index] = part.state;});
    return damage;
  };
  const appendPartDamage = (damage, actor, target) => {
    if (!damage.partDamage) return;
    const part = damage.partDamage;
    append({kind: 'condition', round, actor: actor.id, targets: [target.id], targetLabel: target.label,
      event: `${target.label} · 部件${part.after & 128 ? '破坏' : '损坏'}`,
      partDamage: part, messageRecordId: part.messageRecordId, rules: ['vehicle'], missing: []});
    if (part.index === 5 && (part.after & 128)) append({kind: 'condition', round,
      actor: target.id, targets: [target.id], event: `${target.label} · 下车`,
      messageRecordId: 'record:0A:033', rules: ['vehicle'], missing: []});
  };
  let cachedPartyTarget = null;
  const targetList = (actor, selection) => {
    const targets = alive(actor.side === "party" ? "enemy" : "party");
    if (!targets.length) return [];
    if (selection?.all) return targets;
    if (actor.side === "enemy") {
      const guarded = targets.find(row => row.roleId === protector);
      if (guarded) return [guarded];
      const fixed = targets.find(row => row.id === input.fixedPartyTarget);
      if (fixed) return [fixed];
      const cached = targets.find(row => row.id === cachedPartyTarget);
      if ((actor.targetingFlags & 16) && cached) return [cached];
      const target = [...targets].reverse()[rng.below(targets.length)];
      if (actor.targetingFlags & 16) cachedPartyTarget = target.id;
      return [target];
    }
    if (actor.targetScope === 'all') return targets;
    const selectedGroup = round === 1 ? actor.selectedGroup : null;
    const groupTargets = Number.isInteger(selectedGroup) ? targets.filter(row => row.groupIndex === selectedGroup) : targets;
    if (!groupTargets.length) return [];
    if (actor.targetScope === 'group') {
      const target = groupTargets[rng.below(groupTargets.length)];
      const group = input.enemies.find(row => row.id === target.id)?.groupIndex;
      return targets.filter(row => input.enemies.find(enemy => enemy.id === row.id)?.groupIndex === group);
    }
    return [groupTargets[rng.below(groupTargets.length)]];
  };
  const commonMissing = [...new Set([...actors.flatMap(actor => actor.missing || []),
    BATTLE_SIMULATION_RULES.timing.label])];
  append({kind: "entry", round: 0, event: "战斗入场", rules: [input.story ? 'npc' : 'partyCurrent', "selection"], missing: commonMissing,
    messageRecordId: message("entry")});
  let round = 0;
  while (alive("party").length && alive("enemy").length && round < (commandRound ? 1 : maxRounds)) {
    round++;
    const queue = [...alive("party"), ...alive("enemy").reverse()].filter(actor => !(actor.status & 0xE0)).map(actor => {
      const score = Math.min(255, actor.speed + (rng.next() & 63));
      return {actor, score, selection: actor.side === "enemy" ? selectBattleEnemyAction(actor,
        {...input, party: actors.filter(row => row.side === 'party')}, rng) : null};
    }).sort((a, b) => b.score - a.score);
    append({kind: "turn", round, event: `第 ${round} 回合`,
      queue: queue.map(({actor, score}) => ({actor: actor.id, label: actor.label, score})),
      rules: ["random", "initiative", "selection"], missing: commonMissing});
    for (const target of alive('party')) {
      const conditions = [5, 6].filter(selector => target.status & (128 >>> selector))
        .map(selector => ({selector, handle: selector === 5 ? '5E' : '5F'}));
      if (target.riding) conditions.push(...[6, 7].filter(selector => target.vehicle?.condition & (128 >>> selector))
        .map(selector => ({selector, handle: selector === 6 ? '5B' : '5C'})));
      for (const {handle: id} of conditions) {
        const handle = `battle-result-script:${id}`;
        const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
          target, target, input, rng);
        for (const gap of result.missing || []) resultMissing.add(gap);
        if (!result.applies) {
          if (result.missing?.length) append({kind: 'result', round, actor: target.id, targets: [target.id], event: `${target.label} · 状态伤害未确认`,
            rules: ['conditions', 'route'], missing: result.missing});
          applyConditions(result, target, target);
          continue;
        }
        const damage = applyDamage(result, target);
        if (!damage) continue;
        append({kind: 'damage', round, actor: target.id, actorLabel: target.label, targets: [target.id],
          targetLabel: target.label, event: `${target.label} 损伤 ${damage.settled}`, amount: result.amount,
          settled: damage.settled, before: damage.before, after: damage.after,
          messageRecordId: message('party-damage'), promptRecordId: result.messages?.[0], presentation: 0,
          rules: ['conditions', 'route', 'hp'], missing: commonMissing});
        appendPartDamage(damage, target, target);
        if (damage.dead) {
          append({kind: 'death', round, actor: target.id, targets: [target.id], targetLabel: target.label,
            event: `${target.label} 死亡`, messageRecordId: message('party-death'),
            rules: ['conditions', 'hp'], missing: []});
          break;
        }
      }
    }
    for (const queued of queue) {
      if (!alive('party').length || !alive('enemy').length) break;
      const {actor} = queued;
      let selection = queued.selection;
      if (!alive(actor.side).includes(actor)) continue;
      if (actor.side === 'party') {
        const command = battleCommandEffects(actor, input, rng);
        if (command.handled && actor.vehicle?.parts) actor.vehicle.parts.forEach((part, index) => {
          part.state = actor.vehicle.equipmentState[index];
        });
        if (command.handled) {
          for (const gap of command.missing) resultMissing.add(gap);
          for (const event of command.events) append({kind: 'result', round, actor: actor.id, actorLabel: actor.label,
            targets: [actor.id], itemId: command.itemId, itemLabel: command.itemLabel, resultScriptHandle: command.resultScriptHandle,
            rules: ['commands'], missing: command.missing, ...event});
          if (!command.events.length) append({kind: 'result', round, actor: actor.id, actorLabel: actor.label,
            event: '行动结算未确认', targets: [actor.id], rules: ['commands'], missing: command.missing});
          continue;
        }
      }
      const count = actor.side === "enemy" ? battleEnemyActionCount(actor, rng) : 1;
      let selectedTargets = actor.side === "enemy" ? targetList(actor, selection) : [];
      for (let repetition = 0; repetition < count; repetition++) {
        if (!alive(actor.side).includes(actor)) break;
        if (actor.side === "enemy" && (actor.targetingFlags & 32)) {
          selection = selectBattleEnemyAction(actor, {...input, party: actors.filter(row => row.side === 'party')}, rng);
          selectedTargets = targetList(actor, selection);
        } else if (actor.side === "party") selectedTargets = targetList(actor, selection);
        selectedTargets = selectedTargets.filter(target => alive(target.side).includes(target));
        if (!selectedTargets.length) break;
        const action = selection?.action;
        const actionName = action ? `${action.handle} · ${action.name_hint}` : `武器 ${actor.weaponId?.toString(16).toUpperCase() || "未知"}`;
        const missing = [...commonMissing, ...(selection?.missing || [])];
        for (const gap of selection?.missing || []) resultMissing.add(gap);
        const attack = {side: actor.side, attacker: actor.slot,
          partyTarget: selectedTargets[0].slot, enemyTarget: selectedTargets[0].slot,
          source: actor.side === "enemy" ? actor.visualSources?.find(source =>
            source.slots?.includes(selection?.slot))?.key || actor.visualSources?.[0]?.key : actor.attackSource,
          channel: "melee", scope: selection?.all ? "all" : actor.targetScope || "single", selectionSlot: selection?.slot ?? 0};
        append({kind: "attack", round, event: `${actor.label} → ${selectedTargets.map(row => row.label).join("、")}`,
          actor: actor.id, actorLabel: actor.label, action: actionName,
          targets: selectedTargets.map(row => row.id), attack,
          actionHandle: action?.handle, actionPatternHandle: selection?.pattern,
          resultScriptHandle: action?.fields?.result_script?.value || actor.resultScriptHandle,
          repetition: repetition + 1, actionCount: count,
          attackVisualHandle: action?.fields?.visual_and_counter_initializer?.value,
          messageRecordId: action?.fields?.message?.value || message("action"),
          rules: ["selection", "route", input.story ? 'party' : 'partyCurrent', "repeat", "target"], missing});
        let actionEnded = false;
        let exitControl = 0;
        for (const selectedTarget of selectedTargets) {
          let target = selectedTarget;
          // PRG $02EAB5–$02EAC4：命中判定独立推进随机状态，即使阈值为零。
          const hit = actor.side !== "party" || rng.next() >= [0, 8, 64, 128, 200][target.hitClass ?? 0];
          const handle = action?.fields?.result_script?.value || actor.resultScriptHandle;
          const result = hit ? calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
            actor, target, input, rng) : {amount: 0, applies: false, missing: []};
          for (const gap of result.missing || []) resultMissing.add(gap);
          if (result.enemyExit) {
            exitControl = (exitControl - 1) & 255;
            applyConditions(result, actor, target);
            continue;
          }
          const damageActor = result.collision?.reflected ? selectedTarget : actor;
          if (result.collision) {
            if (result.collision.reflected) target = actor;
            append({kind: 'attack', round, event: `${damageActor.label} → ${target.label}`,
              actor: damageActor.id, actorLabel: damageActor.label, targets: [target.id],
              action: actionName, actionHandle: action?.handle, resultScriptHandle: handle,
              additional: true, repetition: repetition + 1, actionCount: count,
              attackVisualHandle: result.collision.visualHandle,
              attack: {side: damageActor.side, attacker: damageActor.slot,
                partyTarget: selectedTarget.slot, enemyTarget: actor.slot,
                visualReference: result.collision.visualHandle,
                source: 'visual:0', channel: 'melee', scope: 'single', selectionSlot: 0},
              control: {resultComplete: 1, resultControl: result.collision.resultControlBeforeDamage,
                actionCountdown: count - repetition - 1},
              rules: ['collision', 'presentation'], missing});
          }
          if (result.replacement !== undefined) {
            const replacement = input.monsterActors?.find(row => row.monsterId === result.replacement);
            if (actor.side !== "enemy" || alive("enemy").length !== 1 || !replacement) {
              if (!replacement) resultMissing.add('占位：替换怪物当前值缺失');
              append({kind: "result", round, actor: actor.id, targets: [actor.id],
                event: "参战者替换失败", messageRecordId: message("replacement-failed"),
                rules: ["replacement"], missing: replacement ? [] : ["占位：替换怪物当前值缺失"]});
              continue;
            }
            actor.status = 255;
            append({kind: "withdrawal", round, actor: actor.id, actorLabel: actor.label,
              targets: [actor.id], event: `${actor.label} 弃车`,
              replacementMonsterId: replacement.monsterId,
              messageRecordId: action?.fields?.message?.value, presentation: 0,
              rules: ["replacement", "presentation"], missing});
            enemyEvents.push({type: "remove", slot: actor.slot});
            const occupied = new Set(alive("enemy").map(row => row.slot));
            let slot = 8;
            while (occupied.has(slot)) slot--;
            const nextActor = {...structuredClone(replacement), id: `enemy:${slot}`, slot, incarnation: ++incarnation};
            if (commandRound) resultMissing.add('未确认：增援后的敌群命令编组');
            for (const gap of nextActor.missing || []) resultMissing.add(gap);
            actors.splice(actors.indexOf(actor), 1, nextActor);
            enemyEvents.push({type: "join-new", monsterId: replacement.monsterId});
            append({kind: "enemy-entry", round, actor: nextActor.id, actorLabel: nextActor.label,
              targets: [nextActor.id], event: `${nextActor.label} 入场`,
              messageRecordId: action?.fields?.message?.value,
              presentation: 4, rules: ["replacement", "initialization", "presentation"], missing: nextActor.missing || []});
            break;
          }
          if (!result.applies) {
            append({kind: "result", round, event: hit ? `${target.label} · ${result.missing.length ? "结果未结算" : "无伤害"}` : `${target.label} · 未命中`,
              actor: actor.id, targets: [target.id], messageRecordId: hit ? null : message("miss"),
              rules: ["route"], missing: [...missing, ...result.missing]});
            applyConditions(result, actor, target);
            continue;
          }
          const {amount} = result;
          for (const messageRecordId of result.messages || []) append({kind: "message", round,
            event: `${target.label} · 结果消息`, actor: actor.id, targets: [target.id], messageRecordId,
            rules: ["route", "messages"], missing});
          const damage = applyDamage(result, target);
          if (!damage) continue;
          const {settled, before, after, dead} = damage;
          append({kind: "damage", round, event: `${target.label} 损伤 ${settled}`,
            actor: damageActor.id, actorLabel: damageActor.label, action: actionName, targets: [target.id],
            targetLabel: target.label, amount, settled, before, after,
            messageRecordId: target.side === "party" ? message("party-damage") : message("enemy-damage"),
            promptRecordId: action?.fields?.message?.value || message("action"),
            presentation: 0, rules: [result.collision ? 'collision' : 'random', "amount", "route", "hp", "messages", "presentation"], missing});
          appendPartDamage(damage, damageActor, target);
          if (dead) {
            if (target.side === "enemy") {
              enemyEvents.push({type: "remove", slot: target.slot});
              deaths.push({instance: `${target.id}:${target.incarnation}`, monsterId: target.monsterId,
                experience: target.experience, gold: target.gold});
            }
            append({kind: "death", round, event: `${target.label} 死亡`, actor: target.id,
            targetLabel: target.label, messageRecordId: target.side === "party" ? message("party-death") : message("enemy-death"),
            presentation: target.side === "enemy" ? 1 : 0,
            rules: ["hp", input.story ? "end" : "encounter", "presentation"],
            missing: input.story ? [BATTLE_SIMULATION_RULES.end.label] : []});
          }
          applyConditions(result, actor, target);
          if (result.collision) {
            actionEnded ||= dead;
            append({kind: 'result', round, event: '碰撞结算完成', actor: actor.id, targets: [target.id],
              control: {resultComplete: 1, resultControl: 1, actionCountdown: dead ? 0 : count - repetition - 1},
              rules: ['collision'], missing});
          }
        }
        if (exitControl) {
          // PRG $02F124–$02F138：目标列表完成后才消费控制字并移除行动方。
          actor.status = 255;
          actor.hp = 0;
          enemyEvents.push({type: 'remove', slot: actor.slot});
          append({kind: 'withdrawal', round, actor: actor.id, actorLabel: actor.label,
            targets: [actor.id], event: `${actor.label} 离场`,
            messageRecordId: action?.fields?.message?.value, presentation: 3,
            exitControl: {before: 0, pending: exitControl, after: 0},
            rules: ['exit', 'encounter', 'presentation'], missing});
          break;
        }
        if (actionEnded) break;
      }
    }
    if (!alive('party').length || !alive('enemy').length) break;
    for (const actor of alive('party')) {
      if (actor.riding) {
        for (const selector of [6, 7]) {
          const handle = battleVehicleConditionRound(actor, selector);
          if (!handle) continue;
          const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
            actor, actor, input, rng, 0, {conditionSelector: selector});
          for (const gap of result.missing || []) resultMissing.add(gap);
          applyConditions(result, actor, actor);
        }
      }
      for (const selector of [5, 6]) {
        const mask = 128 >>> selector;
        if (!(actor.status & mask) || !Number.isInteger(actor.conditionTurns?.[selector])) continue;
        const count = actor.conditionTurns[selector];
        actor.conditionTurns[selector] = Math.max(0, count - 1);
        if (count > 1) continue;
        const handle = `battle-result-script:${count === 1 ? 'B8' : 'B6'}`;
        const result = calculateBattleResult(input.resultPrograms?.find(row => row.handle === handle),
          actor, actor, input, rng, 0, {conditionSelector: selector});
        for (const gap of result.missing || []) resultMissing.add(gap);
        applyConditions(result, actor, actor);
      }
    }
  }
  const outcome = !alive("party").length ? "敌方胜利" : !alive("enemy").length ? "友方胜利"
    : commandRound ? "回合结束" : "回合上限，未分胜负";
  const rewardTotals = battleResultRewardTotals(deaths);
  const roundBoundary = commandRound && alive('party').length > 0 && alive('enemy').length > 0;
  const completion = battleEncounterResult(input, actors, rewardTotals,
    [...(roundBoundary ? [] : commonMissing), ...resultMissing],
    {round: commandRound, enemyEvents, deaths, random: rng.snapshot(), dropRoll: input.encounter?.dropRoll});
  append({kind: "end", round, event: completion.outcome === 'round' ? '回合结束 · 返回命令选择'
    : `战斗结束 · ${outcome}（含占位规则）`, outcome,
    rules: [input.story ? "end" : "encounter"], missing: input.story ? [BATTLE_SIMULATION_RULES.end.label] : completion.missing});
  if (!alive("party").length && input.story?.kind === "redwolf") {
    const restored = input.story.restoreParty;
    for (const saved of restored || []) {
      const actor = actors.find(row => row.id === saved.id);
      if (actor) Object.assign(actor, saved, {inputSources: saved.sources});
    }
    append({kind: "story-return", round,
      event: "剧情返回 · 事件 $82", eventFlag: input.story.returnEvent,
      restoreParty: restored || true, rules: ["end"],
      missing: restored ? [] : ["占位：玩家存档恢复值未接入"]});
  }
  return {seed, steps, outcome, rewardTotals, completion, rules: BATTLE_SIMULATION_RULES};
}
