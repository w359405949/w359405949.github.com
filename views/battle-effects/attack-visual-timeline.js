// @editor-module attack-visual 的走带
//
// 壳复用 `ui/timeline-player.js`：开机演出与剧情已经在用它，壳自己的注释里把
// 武器特效写成它留的第三处。时间源是 `weapon-effect-vm` 逐帧算出来的状态，
// 渲染器是 `paintCleanFrame`。本模块只做一件事——把命令流装配成轨道。
//
// **不分段。** 发射/弹道/击中曾被当成三个可互换的零件，那是个错误前提：一条
// attack-visual 是独立且完整的一段编排，段边界只是 VM 从命令流现算出来的一种
// 读法，不改代码就换不掉。78 条已解码脚本里没有一条是「每段恰好一个
// battle-action」，多数段里一条生成命令都没有。所以这里就是一条完整的时间轴，
// 不切块、不标段。
//
// **能改的接缝只有一个**：某条生成命令指向哪条 battle-action。它就放在对应那条
// 轨道的标签区，写回仍然经 attack-visual owner 的既有 codec，不另开写入路径。

import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {startNesFrameClock} from "../../core/nes-video-standard.js";
import {db} from "../../core/project-db.js";
import {state} from "../../core/state.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {
  CLEAN_CANVAS,
  cleanAnimationFrames,
  paintCleanFrame,
  effectObjectMotionCanvas,
  paintEffectObjectMotionCanvases,
  setWeaponEffectPreviewPlayback,
} from "../../render/weapon-effect-vm.js";
import {configureAnimatedResourcePicker} from "../../ui/animated-resource-picker.js";
import {
  bindTimelinePlayer,
  syncTimelinePlayer,
  timelinePlayer,
} from "../../ui/timeline-player.js";
import {timelineViewportControls} from "../../ui/timeline-viewport.js";
import {
  ATTACK_STAGE_CATALOG_ELEMENT,
  attackStageCatalogTableMarkup,
  configureAttackStageCatalogElement,
} from "./attack-stage-catalog.js";
import {
  ATTACK_VISUAL_RESOURCE_ID,
  applyAttackEffectStageSelection,
  attackEffectObjectCatalog,
  attackEffectResourceHandle,
  attackEffectStages,
  projectAttackVisualOwner,
} from "./attack-effect-model.js";

const ELEMENT_NAME = "attack-visual-timeline";
const BATTLE_ACTION_RESOURCE_ID = "battle-action";
// 块要占到全长这么多，标签才写得下（`battle-action:XX` 约十一个字符）。
const LABEL_MIN_SHARE = 0.12;
const controllers = new WeakMap();

function repository() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

function baseEffectAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function visualSourceNode(visualCode) {
  return `visual:${Number(visualCode).toString(16).toUpperCase().padStart(2, "0")}`;
}

function actionHandle(value) {
  return attackEffectResourceHandle(BATTLE_ACTION_RESOURCE_ID, value);
}

/** 某条展开后的命令第一次落在第几帧。轨道上的关键帧位置都由它换算。 */
function firstFrameByCommand(frames) {
  const byCommand = new Map();
  frames.forEach((frame, index) => {
    const command = Number(frame.commandIndex);
    if (!byCommand.has(command)) byCommand.set(command, index);
  });
  return byCommand;
}

function operandValue(command, name) {
  const operand = (command?.operands || []).find(item => item?.name === name);
  return operand === undefined ? null : Number(operand.value);
}

/**
 * 生成轨：一条 owner 生成命令一条轨。
 *
 * 块按「同一个对象连续存在且动作码不变」切分——`set_object_action` 会在对象活着
 * 的时候换掉它的动作码，切开才能看出来是同一个槽换了图，而不是新生成一个。
 */
function spawnLanes(controller) {
  const {animation, record} = controller;
  const sourceNode = visualSourceNode(record.id);
  return attackEffectStages(record).map(stage => {
    const blocks = [];
    let run = null;
    animation.frames.forEach((frame, index) => {
      const item = (frame.objects || []).find(object =>
        object.spawnSourceNode === sourceNode
          && Number(object.spawnSourceCommandIndex) === Number(stage.commandIndex));
      if (!item) {
        run = null;
        return;
      }
      const action = Number(item.action);
      if (!run || run.action !== action) {
        run = {action, start: index, frames: 0};
        blocks.push(run);
      }
      run.frames = index - run.start + 1;
    });
    return {
      id: `spawn-${stage.commandIndex}`,
      label: stage.anchor === "actor" ? "攻击者生成" : "目标生成",
      note: `owner 命令 #${stage.commandIndex}`,
      control: actionControlMarkup(controller, stage),
      kind: "span",
      blocks: blocks.map(item => ({
        start: item.start,
        frames: item.frames,
        // **块放不下就不写字。** 块宽是帧数占全长的比例，`battle-action:3D` 这种
        // 十来个字符在几帧宽的块里只会剩两三个字母，一排下来像一串乱码——那比
        // 不写更难认。全文留在 title 上。
        label: item.frames / animation.frames.length >= LABEL_MIN_SHARE
          ? actionHandle(item.action) : "",
        title: `${actionHandle(item.action)}　第 ${item.start}–${
          item.start + item.frames - 1} 帧`,
      })),
    };
  });
}

/** 坐标轨：只给真的动过的对象画，恒定不动的对象画一条直线是噪音。 */
function motionLanes(controller) {
  const {animation, record} = controller;
  const sourceNode = visualSourceNode(record.id);
  const lanes = [];
  for (const stage of attackEffectStages(record)) {
    for (const axis of ["x", "y"]) {
      const points = [];
      animation.frames.forEach((frame, index) => {
        const item = (frame.objects || []).find(object =>
          object.spawnSourceNode === sourceNode
            && Number(object.spawnSourceCommandIndex) === Number(stage.commandIndex));
        if (item) points.push([index, Number(item[axis])]);
      });
      const values = points.map(point => point[1]);
      if (values.length < 2 || new Set(values).size < 2) continue;
      lanes.push({
        id: `motion-${stage.commandIndex}-${axis}`,
        label: `坐标 ${axis.toUpperCase()}`,
        note: `owner 命令 #${stage.commandIndex} 生成的对象在这一轴上的逐帧位置`,
        control: `<small class="mono">${Math.round(Math.min(...values))} – ${
          Math.round(Math.max(...values))}</small>`,
        kind: "curve",
        curve: {
          points,
          min: Math.min(...values),
          max: Math.max(...values),
        },
      });
    }
  }
  return lanes;
}

/** 命令轨：按 operand 认出来的一次性写入，音频与调色板各一条。 */
function commandLane(controller, {id, label, note, operand, tone, format}) {
  const byCommand = firstFrameByCommand(controller.animation.frames);
  const blocks = [];
  controller.animation.commands.forEach((command, index) => {
    const value = operandValue(command, operand);
    if (value === null || !byCommand.has(index)) return;
    blocks.push({
      start: byCommand.get(index),
      label: format(value),
      tone,
      title: `第 ${byCommand.get(index)} 帧　${command.name}　${format(value)}`,
    });
  });
  if (!blocks.length) return null;
  return {id, label, note, control: `<small>${blocks.length} 次</small>`,
    kind: "key", blocks};
}

function actionOptions(controller) {
  return [...controller.animation.actionById.values()]
    .filter(action => action?.available === true)
    .sort((left, right) => Number(left.id) - Number(right.id));
}

function actionControlMarkup(controller, stage) {
  if (!actionOptions(controller).length) {
    return '';
  }
  return `<animated-resource-picker data-attack-visual-timeline-action
    data-animated-resource-value="${stage.actionId}"
    data-command-index="${stage.commandIndex}"
    data-operand-index="${stage.operandIndex}"
    aria-label="这条生成命令指向哪条 battle-action"></animated-resource-picker>`;
}

/** 走带右侧那行读数。段是错误前提留下的概念，这里不报段，只报到没到末帧。 */
function timelineStatus(animation, frame) {
  return frame + 1 >= animation.frames.length ? "已到末帧" : "";
}

const COMMAND_LABELS = Object.freeze({
  spawn_object_at_actor: "生成·攻击者",
  spawn_object_at_target: "生成·目标",
  set_object_action: "换动作",
  increment_object_action: "动作+1",
  decrement_object_action: "动作-1",
  move_object_x: "移动 X",
  move_object_xy: "移动 XY",
  clear_object_set_delay: "清对象·延时",
  clear_effect_objects: "清空对象",
  clear_object0_y: "清 Y",
  set_frame_mode_and_wait: "换 CHR 页并等待",
  set_delay: "延时",
  increment_actor_state: "角色态+1",
  decrement_actor_state: "角色态-1",
  move_actor_x_or_skip: "移动角色 X",
  skip_or_move_actor_x: "移动角色 X",
  repeat_command_block: "重复块开始",
  end_repeat_block: "重复块结束",
  call_visual_script: "调用视效",
  call_aux_script: "调用辅助脚本",
  end_record: "结束",
});

function commandLabel(command) {
  const name = String(command?.name || "");
  return COMMAND_LABELS[name] || name;
}

/** 引用操作数显示目标身份。 */
function operandText(operand) {
  const name = String(operand?.name || "");
  const value = Number(operand?.value);
  if (name === "action") return `${name}=${actionHandle(value)}`;
  if (name === "sound_id") return `${name}=${audioCommandLabel(value)}`;
  if (name === "palette_offset") return `${name}=组 ${value + 1}`;
  if (!Number.isFinite(value)) return `${name}=${operand?.value}`;
  return `${name}=${value}`
    + (value > 9 ? `（$${value.toString(16).toUpperCase().padStart(2, "0")}）` : "");
}

function commandText(command, index) {
  const operands = (command?.operands || []).map(operandText).join("　");
  return `#${index} ${commandLabel(command)}${operands ? `　${operands}` : ""}`;
}

/**
 * 命令轨：这条脚本每条命令第一次生效在第几帧。
 *
 * **它必须永远在**：50/78 条脚本一条生成命令都没有，只装生成轨的话它们会得到一条
 * 空时间轴——那不是「没东西」，是「这条脚本干的是别的事」。
 */
function commandStreamLane(controller) {
  const byCommand = firstFrameByCommand(controller.animation.frames);
  return {
    id: "commands",
    label: "命令",
    note: "展开后的命令流；块的位置是它第一次生效的帧",
    control: `<small>${controller.animation.commands.length} 条</small>`,
    kind: "key",
    blocks: controller.animation.commands.flatMap((command, index) =>
      byCommand.has(index)
        ? [{
            start: byCommand.get(index),
            label: "",
            title: `第 ${byCommand.get(index)} 帧　${commandText(command, index)}`,
          }]
        : []),
  };
}

function lanes(controller) {
  return [
    commandStreamLane(controller),
    ...spawnLanes(controller),
    ...motionLanes(controller),
    commandLane(controller, {
      id: "audio", label: "音频", note: "脚本自己发出的声音命令",
      operand: "sound_id", tone: "sfx",
      format: value => audioCommandLabel(value),
    }),
    commandLane(controller, {
      id: "palette", label: "调色板", note: "脚本切换战斗精灵调色板的时刻",
      operand: "palette_offset", tone: "fade-control",
      format: value => `组 ${value + 1}`,
    }),
  ].filter(Boolean);
}

/**
 * 这条视效用到的效果对象。
 *
 * **battle-action 没有自己的页面了。** 它是「哪条 layout ＋ 形状 ＋ 用哪一组
 * 调色板」的组合，只在某条视效底下才有意义，所以整块编辑器就挂在走带下面：
 * 形状与调色板属于这条 action，原点与图块属于它指的那条 layout（layout 被共享
 * 时，改了对所有指向它的 action 都生效）。
 */
function objectSectionMarkup() {
  return '<div class="attack-visual-timeline-objects"></div>';
}

/**
 * 这条视效实际画过的每一条 action。
 *
 * **不能只取生成命令指向的那几条。** `set_object_action` / `increment_object_action`
 * 会在对象活着的时候换掉它的动作码——`attack-visual:04` 生成命令只指 5 条，实际
 * 画出来的是 11 条。少列的那 6 条同样是可编辑的 battle-action，漏掉就等于说
 * 「这几块图不属于任何东西」。CHR context 从这条视效自己的帧里取。
 */
function objectEntries(controller) {
  const {animation, record} = controller;
  const sourceNode = visualSourceNode(record.id);
  const contextsByAction = new Map();
  for (const frame of animation.frames) {
    for (const item of frame.objects || []) {
      if (item.spawnSourceNode !== sourceNode) continue;
      const actionId = Number(item.action);
      if (!contextsByAction.has(actionId)) contextsByAction.set(actionId, new Map());
      const context = frame.chrContext;
      if (context) {
        contextsByAction.get(actionId).set(
          `${context.schema}:${context.resource_id}:${context.token}`, context);
      }
    }
  }
  const catalog = new Map(attackEffectObjectCatalog(controller.effectAssets)
    .map(entry => [Number(entry.actionId), entry]));
  return [...contextsByAction.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([actionId, contexts]) => {
      const known = catalog.get(actionId);
      const usages = (known?.usages || []).filter(usage =>
        Number(usage.visualCode) === Number(record.id));
      return {
        actionId,
        handle: actionHandle(actionId),
        usages,
        usageCount: usages.length,
        visualCount: usages.length ? 1 : 0,
        chrContexts: [...contexts.values()],
      };
    });
}

function configureObjectSection(controller) {
  const host = controller.root.querySelector(".attack-visual-timeline-objects");
  if (!host) return;
  const element = document.createElement(ATTACK_STAGE_CATALOG_ELEMENT);
  element.dataset.attackStage = "objects";
  element.dataset.attackStageEmbedded = "1";
  const entries = objectEntries(controller);
  element.attackStageEntries = entries;
  element.attackStageEffectAssets = controller.effectAssets;
  element.innerHTML = attackStageCatalogTableMarkup(entries, {embedded: true});
  host.replaceChildren(element);
  configureAttackStageCatalogElement(element, entries, controller.effectAssets);
}

/**
 * 播放头所在那一帧是哪条命令做出来的。
 *
 * **命令流不再单独列一张表。** 那张表逐条列 opcode 与原始操作数，看不出「什么
 * 时候发生」——而时间是这条数据唯一说得清的东西。放在走带里，拖到哪一帧就报哪
 * 一条，命令与画面对得上。
 */
function commandReadout(controller) {
  const frame = controller.animation.frames[controller.frame];
  const index = Number(frame?.commandIndex);
  const command = controller.animation.commands[index];
  if (!command) return "";
  const source = frame?.sourceNode && frame.sourceNode !== visualSourceNode(
    controller.record.id) ? `　来自 ${frame.sourceNode}` : "";
  return `${commandText(command, index)}${source}`;
}

function markup(controller) {
  const {animation} = controller;
  const total = animation.frames.length;
  return `<div class="attack-visual-timeline-stage">
    <canvas data-attack-visual-timeline-canvas
      width="${CLEAN_CANVAS.width}" height="${CLEAN_CANVAS.height}"
      aria-label="第 ${controller.frame} 帧的画面"></canvas>
  </div>
  ${timelinePlayer({
    id: `attack-visual:${controller.visualCode}`,
    totalFrames: Math.max(total - 1, 0),
    frame: controller.frame,
    playing: controller.playing,
    live: true,
    lanes: lanes(controller),
    status: timelineStatus(animation, controller.frame),
    labelWidth: 208,
    viewport: controller.viewport || {},
    transport: timelineViewportControls(),
    footer: `<p class="mono attack-visual-timeline-command"
      data-attack-visual-timeline-command>${esc(commandReadout(controller))}</p>`,
  })}
  ${objectSectionMarkup()}
  <p class="module-editor-message" data-attack-visual-timeline-message hidden
    aria-live="polite"></p>`;
}

function paint(controller) {
  const canvas = controller.root.querySelector(
    "[data-attack-visual-timeline-canvas]");
  const frame = controller.animation.frames[controller.frame];
  if (!canvas || !frame) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  const raster = paintCleanFrame(frame, controller.animation);
  context.putImageData(
    new ImageData(raster.data, raster.width, raster.height), 0, 0);
  canvas.dataset.attackVisualTimelinePainted = "1";
  canvas.dataset.attackVisualTimelineFrame = String(controller.frame);
}

function sync(controller) {
  paint(controller);
  const readout = controller.root.querySelector(
    "[data-attack-visual-timeline-command]");
  if (readout) readout.textContent = commandReadout(controller);
  syncTimelinePlayer(controller.root.querySelector(".tl"), {
    frame: controller.frame,
    totalFrames: Math.max(controller.animation.frames.length - 1, 0),
    playing: controller.playing,
    live: true,
    status: timelineStatus(controller.animation, controller.frame),
    currentBlockFrame: controller.frame,
  });
}

function seek(controller, frame) {
  const last = Math.max(controller.animation.frames.length - 1, 0);
  controller.frame = Math.min(Math.max(Math.round(frame), 0), last);
  sync(controller);
}

function stopClock(controller) {
  controller.clock?.cancel();
  controller.clock = null;
  controller.playing = false;
}

function toggle(controller) {
  if (controller.playing) {
    stopClock(controller);
    sync(controller);
    return;
  }
  const frames = controller.animation.frames.length;
  if (frames < 2) return;
  controller.playing = true;
  controller.clock = startNesFrameClock({
    frameCount: frames,
    loop: true,
    onFrame: index => {
      controller.frame = index % frames;
      sync(controller);
    },
    shouldContinue: () => controller.playing && controller.root.isConnected,
  });
  sync(controller);
}

function showMessage(controller, message) {
  const node = controller.root.querySelector(
    "[data-attack-visual-timeline-message]");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message;
}

async function saveAction(controller, select) {
  const commandIndex = Number(select.dataset.commandIndex);
  const operandIndex = Number(select.dataset.operandIndex);
  const actionId = Number(select.value);
  if (controller.busy) return;
  controller.busy = true;
  try {
    const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const current = resolved?.value?.document?.records?.find(record =>
      Number(record.id) === controller.visualCode);
    if (!current) throw new Error("攻击视觉脚本不存在");
    const draft = structuredClone(current);
    applyAttackEffectStageSelection({records: [draft]}, {
      visualCode: controller.visualCode, commandIndex, operandIndex, actionId,
    });
    const field = await db.getField(ATTACK_VISUAL_RESOURCE_ID, current.handle, "commands");
    await field.set(draft.commands, {expectedVersion: field.version});
    await load(controller);
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    controller.busy = false;
    showMessage(controller, `保存失败：${error?.message || error}`);
  }
}

async function load(controller) {
  const source = repository();
  const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
  const asset = resolved?.value;
  if (!asset?.document) throw new TypeError("attack-visual owner 资产不可用");
  controller.repository = source;
  controller.version = resolved.version;

  const assets = projectAttackVisualOwner(baseEffectAssets(), asset.document);
  controller.effectAssets = assets;
  const record = (asset.document.records || []).find(item =>
    Number(item?.id) === controller.visualCode);
  if (!record) throw new TypeError(`attack-visual 缺少记录 ${controller.visualCode}`);
  const animation = await cleanAnimationFrames(assets, controller.visualCode);
  if (!animation?.frames?.length) {
    throw new TypeError(`${record.handle || controller.visualCode} 没有可播的帧`);
  }
  controller.record = record;
  controller.animation = animation;
  controller.frame = Math.min(controller.frame, animation.frames.length - 1);
  controller.busy = false;
  controller.root.innerHTML = markup(controller);
  controller.root.dataset.attackVisualTimelineFrames = String(animation.frames.length);
  controller.root.dataset.attackVisualTimelineCommands =
    String(animation.commands.length);
  controller.root.dataset.attackVisualTimelineOwnerCommands =
    String((record.commands || []).length);
  controller.root.querySelectorAll("[data-attack-visual-timeline-action]").forEach(picker =>
    configureAnimatedResourcePicker(picker, {
      value: picker.value,
      options: actionOptions(controller).map(action => ({
        value: action.id, handle: actionHandle(action.id), label: actionHandle(action.id),
      })),
      renderPreview: option => effectObjectMotionCanvas({
        visualCode: controller.visualCode,
        sourceCommandIndex: Number(picker.dataset.commandIndex),
        action: Number(option.value), play: true, label: option.label,
      }),
      paintPreview: root => paintEffectObjectMotionCanvases(root, controller.effectAssets),
      setPreviewActive: setWeaponEffectPreviewPlayback,
    })
  );
  bindTimelinePlayer(controller.root.querySelector(".tl"), {
    totalFrames: () => Math.max(controller.animation.frames.length - 1, 0),
    currentFrame: () => controller.frame,
    onSeek: frame => {
      stopClock(controller);
      seek(controller, frame);
    },
    onToggle: () => toggle(controller),
    onViewport: value => { controller.viewport = value; },
    // 标签区里那个 battle-action 选择器不是定位控件，别把点它当成拖时间轴。
    skip: event => Boolean(event.target?.closest?.("animated-resource-picker")),
  });
  configureObjectSection(controller);
  sync(controller);
}

async function hydrate(element) {
  const visualCode = Number(element.dataset.visualCode);
  if (!Number.isInteger(visualCode)) {
    throw new TypeError("attack-visual-timeline 缺少 data-visual-code");
  }
  const controller = {
    root: element,
    visualCode,
    frame: 0,
    playing: false,
    clock: null,
    busy: false,
  };
  controllers.set(element, controller);
  element.addEventListener("change", event => {
    const action = event.target.matches?.("[data-attack-visual-timeline-action]")
      ? event.target : null;
    if (action) {
      void saveAction(controller, action);
      return;
    }
    // 形状/调色板/原点/图块的写回全在内嵌的效果对象编辑器里，这里不重复一条。
  });
  await load(controller);
}

const HTMLElementBase = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME)) {
  globalThis.customElements.define(ELEMENT_NAME, class extends HTMLElementBase {
    connectedCallback() {
      if (this.dataset.attackVisualTimelineBound === "1") return;
      this.dataset.attackVisualTimelineBound = "1";
      void hydrate(this).then(() => {
        this.dataset.attackVisualTimelineState = "ready";
      }).catch(error => {
        editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
        this.dataset.attackVisualTimelineState = "error";
        this.dataset.attackVisualTimelineError = String(error?.message || error);
        this.innerHTML =
          `<p class="resource-empty">时间轴不可用：${esc(error?.message || error)}</p>`;
      });
    }

    disconnectedCallback() {
      const controller = controllers.get(this);
      if (controller) stopClock(controller);
    }
  });
}

export function attackVisualTimelineMarkup(visualCode) {
  return `<${ELEMENT_NAME} style="display:block"
    data-visual-code="${Number(visualCode)}"></${ELEMENT_NAME}>`;
}
