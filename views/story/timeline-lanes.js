// @editor-module 剧情时间轴源行与片段投影。
import {hex} from "../../core/dom.js";
import {storyScriptHandle, storyActorHandle,
  storyAudioLabel as audioCommandLabel} from "./handles.js";
import {storyExecutionTrace} from "./trace.js";
import {storyTimelineFieldsLabel, storyTimelineShortText} from "./timeline-rows.js";
import {storyVmSemanticsMap, storyBrowserVm} from "./vm.js";
import {esc} from "../../core/dom.js";
import {storyBranchKeyMarkup} from "./branches.js";
import {globalEventFlagHandle} from '../../core/global-event-flags.js';
import {eventFlagTextMarkup} from '../../modules/save/event-flags.js';

const directions = {up: "上", down: "下", left: "左", right: "右"};

function storyCommandLabel(run, program) {
  const semantic = storyVmSemanticsMap().get(run.opcode) || {};
  const command = program?.commands.find(command => command.cursor === run.cursor);
  const operandCount = Math.max(0, Number(command?.readWidth || command?.normal_advance || 1) - 1,
    ...(command?.dynamic_advance_operands || []).map(index => Number(index) + 1));
  const values = (run.operands || []).slice(0, operandCount);
  const pair = `(${values[0]}, ${values[1]})`;
  const names = {
    "set-direction": `朝${directions[semantic.direction] || "当前方向"}`,
    "attempt-tile-step": `向${directions[semantic.direction]}走 1 格`,
    "move-actor-to-position": `走到 ${pair}`,
    "set-actor-position": `位置到 ${pair}`,
    "set-packed-camera-relative-position": `相机相对 (${values[0] >> 4}, ${values[0] & 15})`,
    "drive-scripted-input": `向${["", "右", "左", "上", "下"][semantic.input_value]}走 ${values[semantic.count_operand_index]} 格`,
    "wait-operand-frames": `等 ${values[semantic.count_operand_index]} 帧`,
    "wait": `等 ${semantic.frames} 帧`,
    "set-event-flag": `置 ${globalEventFlagHandle(values[0])}`,
    "clear-event-flag": `清 ${globalEventFlagHandle(values[0])}`,
    "wait-event-flag-set": `等 ${globalEventFlagHandle(values[0])}`,
    "start-blocking-dialogue": `显示台词 ${values.join(" · ")}`,
    "start-blocking-ui-action": `显示窗口 ${values.join(" · ")}`,
    "start-event-selected-dialogue": `条件台词 ${values.join(" · ")}`,
    "sound-command": `播放 ${audioCommandLabel(values[0])}`,
    "switch-scene-inside-story-state": `切换镜头 ${values[0]}`,
    "advance-global-screen-effect": `滚屏 ${values.join(" · ")}`,
    "set-motion-attributes": `运动 ${values[0]}`,
    "end-actor-script": "脚本结束",
    "countdown-relative-branch": `循环 ${values[semantic.count_operand_index]} 次 · 跳 ${values[semantic.branch_operand_index]}`,
    "toggle-player-control-lock": "切换操控锁",
    "set-direct-frame-id": `形象帧 ${values[0]}`,
    "set-actor-type-animation-renderer": `动画形象 ${values[0]}`,
    "set-actor-type": `形象 ${values[0]}`,
    "relative-cursor-advance": `跳 ${values[0]}`,
    "move-actor-off-map": "移出地图",
    "remove-actor": "隐藏角色",
    "branch-if-event-flag-clear": `${globalEventFlagHandle(values[0])} 分支 ${values[1]}`,
    "initialize-actor-motion-state": "初始化运动",
    "set-dialogue-actor-parameter": `说话人 ${values[0]}`,
    "set-story-state": `剧情 ${values.join(" · ")}`,
    "end-story-state": "剧情结束",
    "terminate-or-change-mode": "切换模式",
    "follow-rom-waypoint-loop": `沿路线 ${values[0]}`,
    "step-toward-story-target": "向目标走 1 格",
    "step-toward-story-target-until-adjacent": "走近目标",
    "advance-wander-motion": "漫游 1 格",
    "wander-inside-rectangle": `漫游 ${values.join(" · ")}`,
  };
  const labels = {
    "face-opposite-runtime-direction": "背向玩家", "branch-on-player-position-exact": "位置分支",
    "branch-if-runtime-result-nonzero": "结果分支", "branch-on-published-preview-route": "路线分支",
    "branch-if-runtime-slot-empty": "空槽分支", "branch-if-runtime-slot-present": "占用分支",
    "restore-party-member-health": "恢复生命", "branch-on-player-direction": "朝向分支",
    "play-rom-recovery-effect": "复活效果", "play-render-slot-offset-sequence": "偏移序列",
    "branch-on-player-position-rectangle": "范围分支", "start-scripted-encounter": "开始战斗",
    "clear-story-state-and-mode": "清除剧情", "decrement-actor-type": "前一形象",
    "set-global-parameter": "全局参数", "adopt-runtime-entity-state": "采用实体状态",
    "set-story-parameter": "镜头路线", "step-by-rom-direction-table": "按方向表走",
    "set-runtime-party-slot-index": "队伍槽", "clear-runtime-party-slot": "清除队伍槽",
    "play-table-driven-actor-transformation": "形象变换", "subtract-party-money": "扣金钱",
    "transfer-actor-to-runtime-entity": "接管实体", "mutate-field-tile-near-actor": "修改邻格",
    "relocate-runtime-target": "目标位置", "write-field-tile-at-actor": "写当前格",
    "branch-if-runtime-party-actor-type-absent": "队伍形象分支", "branch-if-runtime-slot-is-not-player-actor": "角色分支",
    "end-story-state-with-scene-context": "退出场景", "await-render-gate-then-refresh": "等刷新",
    "pop-story-actor-slot": "移除角色槽", "remove-actor-if-event-flag-set": "按事件位隐藏",
    "refresh-field-state": "刷新场景", "set-runtime-parameter-$9c": "参数 9C",
    "set-runtime-parameter-$a2": "参数 A2", "enter-dedicated-field-mode": "进入场景模式",
    "clear-runtime-entity-render-slots": "清除实体显示", "set-runtime-entity-move-direction": "实体方向",
    "replace-runtime-player-actor-type": "替换形象", "enter-field-travel-service": "场景旅行",
    "join-party-and-remove-scene-actor": "加入队伍", "release-selected-vehicle": "释放战车",
    "park-selected-vehicle": "停放战车", "branch-if-party-level-insufficient": "等级分支",
    "find-party-item-and-branch": "物品分支", "replace-party-item": "替换物品",
    "branch-if-party-money-insufficient": "金钱分支", "grant-party-item-and-branch": "获得物品",
    "branch-on-field-ui-target": "操作分支", "branch-if-party-health-insufficient": "生命分支",
    "push-temporary-field-entity": "加入临时实体",
  };
  return names[run.operation] || `${labels[run.operation] || "命令"}${values.length ? ` ${values.join(" · ")}` : ""}`;
}

function storyCommandBlock(run, tone, compiled, programs) {
  const duration = Math.max(1, Number(run.frames) || 1);
  const program = programs.get(`${run.scriptKind}:${run.programId}`);
  const overflow = program?.unwrittenOverflowBytes || 0;
  const reason = program?.unwrittenReason || (overflow ? `容量不足，超出 ${overflow} 字节` : null);
  let label = storyCommandLabel(run, program);
  const branch = storyBranchKeyMarkup(run, compiled);
  if (branch) label = branch.label;
  const battle = compiled.frames?.[run.start]?.battleEntry;
  if (run.operation === "start-scripted-encounter" && battle?.assumedResult === "victory")
    label = `战斗 ${battle.formationId} · 假定胜利`;
  const actor = compiled.frames?.[run.start]?.actors.find(actor => actor.actorSlot === run.actorSlot);
  if (run.operation === "move-actor-to-position" && actor) {
    const fromX = actor.motion?.fromX ?? actor.x, fromY = actor.motion?.fromY ?? actor.y;
    const distance = Math.abs(run.operands[0] - fromX) + Math.abs(run.operands[1] - fromY);
    label = `走 ${distance} 格到 (${run.operands[0]}, ${run.operands[1]})`;
  }
  if (["set-story-state", "switch-scene-inside-story-state"].includes(run.operation)) {
    const snapshot = compiled.frames?.[run.start + duration];
    if (snapshot) label += ` · 相机 (${snapshot.cameraTileOriginX}, ${snapshot.cameraTileOriginY})`;
  }
  return {
    start: run.start,
    data: {"story-node": run.id, "story-command-key": "true", ...(branch ? {"story-branch-key": "true"} : {})},
    ...(duration > 1 ? {frames: duration} : {}),
    label: storyTimelineShortText(label) + (reason ? " ↛" : ""),
    labelMarkup: `${eventFlagTextMarkup(storyTimelineShortText(label))}${branch?.marker || ''}`,
    ...(branch ? {branch: true} : {}),
    unwrittenReason: reason,
    command: run,
    tone,
    title: [label,
      reason ? `未进 ROM（${reason}）` : "",
      `第 ${run.start + 1} 帧起${duration > 1 ? ` · ${duration} 帧` : ""}`,
      `角色 ${run.actorSlot + 1}`,
      storyScriptHandle(run.scriptKind, run.programId),
      `cursor ${run.cursorHex || hex(run.cursor, 2)}`,
      run.operation,
    ].filter(Boolean).join(" · "),
  };
}

function storyCommandLanes(compiled, enabled, fieldsForRun) {
  if (!enabled) return [];
  const editable = new Map();
  const readonly = new Map();
  const programs = new Map((storyBrowserVm().programs || []).map(program => [
    `${program.kind || 'autonomous'}:${program.id}`, program,
  ]));
  const commandFields = new Map();
  for (const run of storyExecutionTrace(compiled).commands) {
    const identity = `${run.scriptKind}:${run.programId}:${run.cursor}:${run.opcode}`;
    if (!commandFields.has(identity)) commandFields.set(identity, fieldsForRun(run));
    const fields = commandFields.get(identity);
    if (fields.length) {
      const key = fields.map(field => field.identity).sort().join("|");
      if (!editable.has(key)) {
        editable.set(key, {key, fields, runs: [], firstStart: run.start});
      }
      const group = editable.get(key);
      group.runs.push(run);
      group.firstStart = Math.min(group.firstStart, run.start);
      continue;
    }
    if (!readonly.has(run.actorKey)) {
      readonly.set(run.actorKey, {
        key: run.actorKey,
        actorSlot: run.actorSlot,
        variantId: run.variantId,
        runs: [],
        firstStart: run.start,
      });
    }
    const group = readonly.get(run.actorKey);
    group.runs.push(run);
    group.firstStart = Math.min(group.firstStart, run.start);
  }
  const lanes = [...editable.values()].map(group => ({
    id: `operand:${group.key}`,
    label: storyTimelineFieldsLabel(group.fields),
    originalLabel: group.fields.map(field => `${field.label} · ${field.value}`).join(" / "),
    fields: group.fields,
    kind: "key",
    blocks: group.runs.map(run => storyCommandBlock(run, "operand", compiled, programs)),
    firstStart: group.firstStart,
  }));
  lanes.push(...[...readonly.values()].map(group => ({
    id: `command:${group.key}`,
    label: `角色 ${hex(group.variantId, 2).replace("0x", "")}·${hex(group.actorSlot, 2).replace("0x", "")} 命令`,
    originalLabel: `${storyActorHandle(group.variantId, group.actorSlot)} 命令`,
    control: `<small>${group.runs.length} 段</small>`,
    kind: "key",
    blocks: group.runs.map(run => storyCommandBlock(run, "command", compiled, programs)),
    firstStart: group.firstStart,
  })));
  return lanes.sort((left, right) => left.firstStart - right.firstStart
    || left.label.localeCompare(right.label));
}

export function storyTimelineSourceLanes(compiled, {editable = true, fieldsForRun = () => []} = {}) {
  return storyCommandLanes(compiled, true, editable ? fieldsForRun : () => []);
}
