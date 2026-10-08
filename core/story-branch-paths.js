// @editor-module 从当前指令与文字计算剧情候选路径和入口条件。
import {globalEventFlagHandle} from './global-event-flags.js';
const clone = value => structuredClone(value);
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");

export function storyBranchCondition(command, semantic) {
  const operands = command.currentOperands || command.operands || [];
  const [value, second] = operands;
  const operation = semantic?.operation;
  const condition = (key, label, jumpWhen, advanceIndex = semantic?.branch_operand_index) => ({
    key, label, jumpWhen, value, operands,
    normal: (command.cursor + command.normal_advance) & 255,
    jump: (command.cursor + Number(operands[advanceIndex])) & 255,
  });
  switch (operation) {
    case "branch-if-event-flag-clear": return condition(`flag:${value}`, globalEventFlagHandle(value), false);
    case "branch-if-party-member-alive": return condition(`alive:${value}`, `队员 ${value + 1} 存活`, true, 1);
    case "branch-if-runtime-slot-empty": return condition(`present:${value}`, `队员 ${value + 1} 在队`, false);
    case "branch-if-runtime-slot-present": return condition(`present:${value}`, `队员 ${value + 1} 在队`, true);
    case "branch-if-party-not-riding": return condition("riding", "乘车", false, 0);
    case "branch-if-investigation-acquired": return condition(`acquired:${value}`, `取得位 ${hex(value)}`, true, 1);
    case "branch-if-party-money-insufficient": return condition(`money:${value}`, `金钱 ≥ ${value}`, false, 1);
    case "branch-if-party-level-insufficient": return condition(`level:${value}`, `队伍等级 ≥ ${value}`, false, 1);
    case "branch-if-party-health-insufficient": return condition(`hp:${value}`, `队伍 HP ≥ ${value}`, false, 1);
    case "find-party-item-and-branch": return condition(`item:${value}`, `持有道具 ${hex(value)}`, false, 1);
    case "grant-party-item-and-branch": return condition(`item-space:${value}`, "背包有空位", false, 1);
    case "branch-if-party-descriptor-absent": return condition(`descriptor:${value}`, `队伍描述符 ${hex(value)}`, false, 1);
    case "branch-if-object-outside-scene": return condition(`object:${value}`, `对象 ${hex(value)} 在本场景`, false, 1);
    case "branch-if-runtime-result-nonzero": return condition("result", "返回值 D5 非零", true);
    case "branch-on-field-ui-target": return {...condition("target", "界面已选目标", true, 0), normal: (command.cursor + 1) & 255};
    case "branch-on-player-position-exact": return condition(`position:${value}:${second}`, `玩家位置 (${value}, ${second})`, false, semantic.mismatch_advance_operand_index);
    case "branch-on-player-direction": return condition(`direction:${value}`, `玩家朝向 ${["上", "下", "左", "右"][value & 3]}`, false, semantic.mismatch_advance_operand_index);
    case "branch-on-player-position-rectangle": return condition(`rectangle:${operands.slice(0, 4).join(":")}`, `玩家在范围 ${operands.slice(0, 4).join(" · ")}`, false, semantic.outside_advance_operand_index);
    default: return null;
  }
}

// 每条入口条件只赋值一次；脚本写入的值优先于入口条件。
function constrain(path, key, value) {
  const known = Object.hasOwn(path.values, key) ? path.values[key] : path.conditions[key];
  if (known !== undefined && known !== value) return null;
  const next = clone(path);
  if (known === undefined) next.conditions[key] = value;
  return next;
}

export function storyCandidatePaths({program, semantics, resolveDialogue, resolveUi}) {
  const commands = new Map((program?.commands || []).map(command => [command.cursor, command]));
  const paths = [];
  const visit = (cursor, path, seen) => {
    const command = commands.get(cursor);
    if (!command || seen.has(cursor)) {
      paths.push({...path, termination: seen.has(cursor) ? "loop" : "end", cursor});
      return;
    }
    const semantic = semantics.get(command.opcode) || {};
    const operation = semantic.operation;
    const operands = command.currentOperands || command.operands || [];
    path = {...path, cursors: [...path.cursors, cursor]};
    const nextSeen = new Set([...seen, cursor]);
    const normal = (cursor + command.normal_advance) & 255;
    const branch = storyBranchCondition(command, semantic);
    if (branch) {
      const key = branch.key === "result" ? path.resultKey || "result" : branch.key;
      for (const value of [branch.jumpWhen, !branch.jumpWhen]) {
        const next = constrain(path, key, value);
        if (!next) continue;
        const jump = value === branch.jumpWhen;
        const target = jump ? branch.jump : branch.normal;
        next.decisions.push({cursor, key, value, label: branch.label, jump, target});
        if (operation === "find-party-item-and-branch" || operation === "grant-party-item-and-branch") {
          next.resultKey = null;
          next.values.result = !value;
        }
        visit(target, next, nextSeen);
      }
      return;
    }
    if (operation === "set-event-flag" || operation === "clear-event-flag")
      path.values[`flag:${operands[0]}`] = operation === "set-event-flag";
    if (operation === "restore-party-member-health") path.values[`alive:${operands[0]}`] = true;
    if (operation === "clear-runtime-party-slot") path.values[`present:${operands[0]}`] = false;
    if (operation === "dispatch-interaction-service" && operands[0] >= 16) {
      path.resultKey = `service:${path.services.length}`;
      path.services.push({selector: operands[0], parameter: operands[1]});
    } else if (["start-blocking-dialogue", "start-blocking-ui-action", "dispatch-interaction-service", "start-event-selected-dialogue"].includes(operation)) {
      const emit = (input, flags) => {
        const ui = resolveUi(command, flags).blockingUi;
        const expand = choices => {
          let index = 0;
          let missing = false;
          const stages = resolveDialogue(ui.region_id, ui.record_id, () => {
            if (index === choices.length) {missing = true; index++; return 0;}
            return choices[index++];
          });
          if (missing) {expand([...choices, 0]); expand([...choices, 1]); return;}
          const next = clone(input);
          for (const stage of stages) {
            next.texts.push({handle: `record:${hex(stage.region_id)}:${String(stage.record_id).padStart(3, "0")}`, text: stage.text});
            for (const choice of stage.choices || []) {
              const key = `choice:${next.choices.length}`;
              next.conditions[key] = choice.value !== 0;
              next.choices.push(choice);
              next.values.result = choice.value !== 0;
              next.resultKey = null;
            }
          }
          if (semantic.terminates_script) paths.push({...next, termination: "dialogue", cursor});
          else visit(normal, next, nextSeen);
        };
        expand([]);
      };
      if (operation === "start-event-selected-dialogue") {
        const flag = operands[semantic.flag_operand_index];
        for (const value of [false, true]) {
          const next = constrain(path, `flag:${flag}`, value);
          if (next) emit(next, value ? new Set([flag]) : new Set());
        }
      } else emit(path, new Set());
      return;
    }
    if (operation === "relative-cursor-advance") visit((cursor + operands[0]) & 255, path, nextSeen);
    else if (!command.normal_advance || ["start-scripted-encounter", "enter-field-travel-service", "end-actor-script", "terminate-or-change-mode"].includes(operation)) {
      paths.push({...path, termination: operation, cursor});
    }
    else visit(normal, path, nextSeen);
  };
  if (program) visit(0, {conditions: {}, values: {}, cursors: [], decisions: [], texts: [], choices: [], services: []}, new Set());
  return paths;
}

export function storyPathPreviewConditions(conditions, defaults, sceneId) {
  const result = {};
  const party = new Map();
  const member = slot => {
    if (!party.has(slot)) party.set(slot, {slot});
    return party.get(slot);
  };
  const flags = new Set(defaults.eventFlags || []);
  const acquired = new Set(defaults.investigationBits || []);
  for (const [key, value] of Object.entries(conditions)) {
    const [kind, number, second] = key.split(":");
    const id = Number(number);
    if (kind === "flag") {if (value) flags.add(id); else flags.delete(id); result.eventFlags = [...flags];}
    else if (kind === "acquired") {if (value) acquired.add(id); else acquired.delete(id); result.investigationBits = [...acquired];}
    else if (kind === "present") member(id).state = value ? (conditions[`alive:${id}`] === false ? "dead" : "present") : "absent";
    else if (kind === "alive") {
      const original = defaults.partyMembers?.find(row => row.slot === id);
      if (!Object.hasOwn(conditions, `present:${id}`))
        member(id).state = value ? (defaults.partySlots?.includes(id) ? "present" : "absent") : "dead";
      member(id).status = value ? 0 : 255;
      if (original?.currentHp !== undefined) member(id).currentHp = original.currentHp;
    } else if (kind === "riding") result.ridingVehicle = value;
    else if (kind === "money") result.money = value ? id : Math.max(0, id - 1);
    else if (kind === "level" || kind === "hp") for (const row of defaults.partyMembers || []) {
      member(row.slot)[kind === "level" ? "level" : "currentHp"] = value ? id : Math.max(0, id - 1);
      member(row.slot).state = "present";
    } else if (kind === "choice") (result.choices ||= [])[id] = value ? 1 : 0;
    else if (kind === "service") (result.serviceResults ||= [])[id] = value ? 1 : 0;
    else if (kind === "result") result.runtimeResultD5 = value ? 1 : 0;
    else if (kind === "target") result.fieldUiTarget = value ? 0 : 255;
    else if (kind === "position") {result.playerMapX = value ? id : (id + 1) & 255; result.playerMapY = Number(second);}
    else if (kind === "direction") result.playerDirection = ["up", "down", "left", "right"][value ? id & 3 : (id + 1) & 3];
    else if (kind === "rectangle") {result.playerMapX = value ? id : Number(second); result.playerMapY = Number(key.split(":")[3]);}
    else if (kind === "object") (result.objectScenes ||= {})[id] = value ? sceneId : 255;
    else if (kind === "descriptor") {
      const descriptors = new Set(result.partyDescriptors || defaults.partyDescriptors || []);
      if (value) descriptors.add(id); else descriptors.delete(id);
      result.partyDescriptors = [...descriptors];
    } else if (kind === "item") {
      result.partyInventories ||= (defaults.partyInventories || Array.from({length: 3}, () => Array(8).fill(0))).map(row => [...row]);
      for (const row of result.partyInventories) for (let index = 0; index < row.length; index++) if (row[index] === id) row[index] = 0;
      if (value) {result.partyInventories[0][0] = id; member(0).state = "present";}
    } else if (kind === "item-space") {
      result.partyInventories = Array.from({length: 3}, () => Array(8).fill(value ? 0 : 1));
      member(0).state = "present";
    }
  }
  if (party.size) result.party = [...party.values()];
  return result;
}
