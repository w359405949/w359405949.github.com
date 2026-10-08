// @editor-module 武器攻击特效的浏览器视觉脚本 VM 与帧回放
//
// 配方权威是已发布的视觉脚本命令流（`clean_animations` 之外的 `scripts.primary`
// / `scripts.auxiliary`）与战斗对象动作布局；像素权威是 `shared-chr-bank`。
//
// **为什么必须在浏览器里跑 VM**：逐帧状态（每帧每个对象槽的动作码与坐标）不在
// 包里，它是 `mm_weapon_effects._clean_animation_states` 在提取期算出来的。要么
// 把 states 也发进 JSON（等于又造一份派生表，正是要消除的东西），要么把 VM 搬过
// 来。选后者。见 shiftboss/plans/archive/docs-history/metalmaxcn_base_assets_and_references.md §5.2 E5-b。
//
// 与 Python 侧的对应（逐帧必须完全一致）：
//   `expandAttackCommands`  ← `_expand_attack_commands`（内联调用与 repeat 块）
//   `cleanAnimationStates`  ← `_clean_animation_states`（对象槽 VM）
//   `paintBattleAction`     ← `_paint_battle_action`
//   `battleActionPlacements`← `_battle_action_tile_placements`

import {db} from "../core/project-db.js";
import {
  nesFrameDurationMs,
  nesVideoStandard,
  startNesFrameClock,
} from "../core/nes-video-standard.js";
import {composeChrPatternTable} from "../core/media-assets.js";
import {
  attackChrContextReference,
  effectPaletteAfterCommand,
  isBattleObjectOwnerProjection,
  projectBattleObjectOwners,
  resolveAttackChrPatternBanks,
  VISUAL_METASPRITES_RESOURCE_ID,
} from "../core/attack-chr-owner.js";
import {attackInitialEffectBank, prepareAttackChrEntryContext} from '../core/render-code-sources.js';
import {createRaster, decodeChrTiles, paintChrTile} from "./chr-raster.js";

// 干净舞台的归一锚点。刻意不是战场坐标——预览要的是可比较的固定构图。
export const ACTOR_ANCHOR = Object.freeze([42.0, 76.0]);
const TARGET_ANCHOR = Object.freeze([210.0, 56.0]);
// `RenderBattleObject` 看 $0314 bit 0；干净舞台把角色放左边，因此所有效果对象
// 都走渲染器的镜像分支。
const CLEAN_STAGE_FLIP_X = true;
const MAX_FRAMES = 360;
const MAX_COMMANDS = 2500;
export const CLEAN_CANVAS = Object.freeze({width: 256, height: 240});
// 干净舞台的背景色。它是「舞台」，不是 NES 颜色。
const STAGE_BACKGROUND = Object.freeze([7, 10, 12]);

const signedByte = value => (value < 0x80 ? value : value - 0x100);

/** `_command_operand` 的镜像：命令的 operands 是 `[{name, value}]`。 */
function operand(command, name) {
  for (const item of command?.operands || []) {
    if (String(item?.name) === name) {
      const value = Number(item.value);
      return Number.isFinite(value) ? value : null;
    }
  }
  return null;
}

/** `_expand_attack_commands` 的镜像：把调用与 repeat 块内联成一条命令流。 */
export function expandAttackCommands(rootVisual, primary, auxiliary) {
  const expanded = [];

  const appendScript = (namespace, scriptId, stack) => {
    const node = `${namespace}:${scriptId.toString(16).toUpperCase().padStart(2, "0")}`;
    if (stack.includes(node) || expanded.length >= MAX_COMMANDS) return;
    const script = namespace === "visual"
      ? primary.get(scriptId) : auxiliary.get(scriptId);
    if (!script) return;
    const commands = script.commands || [];

    const replay = (command, currentNode, sourceCommandIndex) => {
      const name = String(command.name);
      if (name === "call_visual_script") {
        const target = operand(command, "visual_code");
        if (target !== null && primary.has(target)) {
          appendScript("visual", target, [...stack, currentNode]);
        }
      } else if (name === "call_aux_script") {
        const target = operand(command, "script_id");
        if (target !== null && auxiliary.has(target)) {
          appendScript("aux", target, [...stack, currentNode]);
        }
      } else if (!command.marker) {
        expanded.push({
          ...command,
          source_node: currentNode,
          source_command_index: Number(sourceCommandIndex),
        });
      }
    };

    let index = 0;
    while (index < commands.length && expanded.length < MAX_COMMANDS) {
      const command = commands[index];
      const name = String(command.name);
      if (name === "end_record") break;
      if (name === "end_repeat_block") {
        index += 1;
        continue;
      }
      if (name === "repeat_command_block") {
        const blockStart = index + 1;
        let blockEnd = blockStart;
        let depth = 1;
        while (blockEnd < commands.length) {
          const blockName = String(commands[blockEnd].name);
          if (blockName === "repeat_command_block") depth += 1;
          else if (blockName === "end_repeat_block") {
            depth -= 1;
            if (depth === 0) break;
          }
          blockEnd += 1;
        }
        const count = Math.min(Math.max(operand(command, "repeat_count") ?? 1, 1), 16);
        for (let pass = 0; pass < count; pass += 1) {
          for (let cursor = blockStart; cursor < blockEnd; cursor += 1) {
            replay(commands[cursor], node, cursor);
            if (expanded.length >= MAX_COMMANDS) break;
          }
          if (expanded.length >= MAX_COMMANDS) break;
        }
        index = Math.min(blockEnd + 1, commands.length);
        continue;
      }
      replay(command, node, index);
      index += 1;
    }
  };

  appendScript("visual", rootVisual, []);
  return expanded;
}

/** `_clean_animation_states` 的镜像：对象槽 VM，产出逐帧状态。 */
export function cleanAnimationStates(closure, commands, actionById, {
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank,
} = {}) {
  if (!Number.isInteger(initialEffectBank) || initialEffectBank < 0 || initialEffectBank > 255)
    throw new TypeError('缺少攻击初始 CHR 上下文');
  let effectBank = initialEffectBank;
  let spritePaletteSelector = null;
  let actorStateDelta = 0;
  let actorXDeltaNormal = 0;
  let actorXDeltaAlternate = 0;
  const objects = new Map();
  const frames = [];
  const pathCommands = [];

  const packedSlot = command => {
    const packed = command?.packed_object_delay;
    if (!packed) return [0, 0];
    return [Number(packed.object_slot), Math.min(Number(packed.delay), 0x0f)];
  };

  // Python 的 `state_signature()` 首元素永远是 chr_effect_bank，所以它**永不为
  // 空**——`if not signature: return` 那道门实际上从不生效，对象为零时同样会记一帧
  // （objects 为空数组）。这里必须照样记，否则每条剪辑都会少掉那些空帧。
  const snapshot = (command, hold = 1, commandIndex = commands.length) => {
    if (hold <= 0) return;
    const event = typeof command === "string"
      ? command : String(command?.name || "");
    const sourceNode = typeof command === "string"
      ? "" : String(command?.source_node || "");
    const copies = [...objects.keys()].sort((a, b) => a - b).map(slot => {
      const item = objects.get(slot);
      return {
        slot,
        action: item.action,
        x: item.x,
        y: item.y,
        flipX: item.flipX,
        spawnAnchor: item.spawnAnchor,
        spawnAction: item.spawnAction,
        spawnSourceNode: item.spawnSourceNode,
        spawnSourceCommandIndex: item.spawnSourceCommandIndex,
      };
    });
    const repeat = Math.min(hold, Math.max(0, MAX_FRAMES - frames.length));
    for (let step = 0; step < repeat; step += 1) {
      frames.push({
        event,
        commandIndex,
        sourceNode,
        effectBank,
        spritePaletteSelector,
        chrContext: attackChrContextReference(effectBank),
        actorStateDelta,
        actorXDeltaNormal,
        actorXDeltaAlternate,
        objects: copies,
      });
    }
  };

  const available = value =>
    actionById.has(value) && Boolean(actionById.get(value).available);

  for (const [commandIndex, command] of commands.entries()) {
    const name = String(command.name);
    const [slot, hold] = packedSlot(command);
    const actionValue = operand(command, "action");
    if (name === "set_frame_mode_and_wait") {
      const mode = operand(command, "mode");
      if (mode !== null) effectBank = mode;
      // opcode $04 直接尾调 WaitForNextFrame，不走常规 packed delay 字段。
      snapshot(command, 1, commandIndex);
    } else if (name === "set_battle_sprite_palette") {
      spritePaletteSelector = operand(command, "palette_offset");
      if (spritePaletteSelector === null) {
        throw new TypeError("set_battle_sprite_palette 缺少调色板选择器");
      }
    } else if (name === "increment_actor_state"
        || name === "decrement_actor_state") {
      actorStateDelta += name === "increment_actor_state" ? 1 : -1;
      snapshot(command, operand(command, "delay") ?? 0, commandIndex);
    } else if (name === "move_actor_x_or_skip"
        || name === "skip_or_move_actor_x") {
      const delta = signedByte(operand(command, "delta_x") ?? 0);
      if (name === "move_actor_x_or_skip") actorXDeltaNormal += delta;
      else actorXDeltaAlternate += delta;
    } else if (name === "spawn_object_at_actor" || name === "spawn_object_at_target") {
      const anchor = name === "spawn_object_at_actor" ? actorAnchor : targetAnchor;
      if (actionValue !== null) {
        objects.set(slot, {
          action: actionValue,
          x: anchor[0],
          y: anchor[1],
          flipX: CLEAN_STAGE_FLIP_X,
          spawnAnchor: name === "spawn_object_at_actor" ? "actor" : "target",
          spawnAction: actionValue,
          spawnSourceNode: String(command.source_node || ""),
          spawnSourceCommandIndex: Number(command.source_command_index),
        });
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "set_object_action") {
      if (objects.has(slot) && actionValue !== null) {
        objects.get(slot).action = actionValue;
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "increment_object_action" || name === "decrement_object_action") {
      if (objects.has(slot)) {
        const delta = name.startsWith("increment") ? 1 : -1;
        const candidate = (objects.get(slot).action + delta) & 0xff;
        if (available(candidate)) {
          objects.get(slot).action = candidate;
          snapshot(command, hold, commandIndex);
        }
      }
    } else if (name === "move_object_x" || name === "move_object_xy") {
      if (objects.has(slot)) {
        const item = objects.get(slot);
        item.x += signedByte(operand(command, "delta_x") ?? 0);
        if (name === "move_object_xy") {
          item.y += signedByte(operand(command, "delta_y") ?? 0);
        }
        snapshot(command, hold, commandIndex);
      }
    } else if (name === "clear_object_set_delay") {
      objects.delete(slot);
      snapshot(command, hold, commandIndex);
    } else if (name === "clear_effect_objects" || name === "clear_object0_y") {
      if (name === "clear_effect_objects") objects.clear();
      else objects.delete(0);
    } else if (name.startsWith("animate_")) {
      pathCommands.push(name);
      // 六个路径 handler 都把对象 0 硬编码在 $0337/$0347。
      const pathSlot = 0;
      if (!objects.has(pathSlot)) {
        const fallback = (closure.object_actions || [])
          .map(Number).find(value => available(value));
        if (fallback === undefined) continue;
        objects.set(pathSlot, {
          action: fallback, x: actorAnchor[0], y: actorAnchor[1],
          flipX: CLEAN_STAGE_FLIP_X, spawnAnchor: "actor",
          spawnAction: null,
          spawnSourceNode: "",
          spawnSourceCommandIndex: null,
        });
      }
      const item = objects.get(pathSlot);
      const startX = item.x;
      const startY = item.y;
      const [endX, endY] = targetAnchor;
      const duration = operand(command, "duration");
      const parameter = Math.max(1, operand(command, "path_parameter") ?? 1);
      // InitAttackPathFromActorAnchor 用「水平距离 / path_parameter」当 $D7；
      // opcode $18/$19 再用自己的 duration 字节替换它，并不每次都插值到终点。
      const fullSteps = Math.max(1, Math.floor(Math.abs(endX - startX) / parameter));
      const steps = duration !== null ? Math.max(1, duration) : fullSteps;
      const stepX = endX >= actorAnchor[0] ? parameter : -parameter;
      const stepY = (endY - startY) / fullSteps;
      const pathYStep = Math.floor(Math.abs(stepY) * 256);
      const signedPathYStep = stepY < 0 ? -pathYStep - 1 : pathYStep;
      const trailCount = operand(command, "trail_object_count") ?? 0;
      const toggled = name.includes("toggled");
      for (let step = 0; step < steps; step += 1) {
        // CopyAttackPathPositionHistory 按降序把真实槽坐标从 N-1 拷到 N。
        // 拖尾是有自己动作码的实心 metasprite，不是合成的半透明残影。
        for (let trailSlot = trailCount; trailSlot > 0; trailSlot -= 1) {
          const previous = objects.get(trailSlot - 1);
          const follower = objects.get(trailSlot);
          if (!previous || !follower) continue;
          follower.x = previous.x;
          follower.y = previous.y;
        }
        if (toggled) {
          const candidate = item.action ^ 1;
          if (available(candidate)) item.action = candidate;
        }
        item.x += stepX;
        item.y = gamePath
          ? Math.floor(startY + signedPathYStep * (step + 1) / 256)
          : item.y + stepY;
        snapshot(command, 1, commandIndex);
      }
    } else if (name === "set_delay") {
      snapshot(command, operand(command, "frames") ?? 0, commandIndex);
    }
    if (frames.length >= MAX_FRAMES) break;
  }

  if (!frames.length) {
    for (const action of (closure.object_actions || []).map(Number)) {
      if (!available(action)) continue;
      objects.clear();
      objects.set(0, {
        action, x: 128.0, y: 64.0, flipX: CLEAN_STAGE_FLIP_X,
        spawnAction: null,
        spawnSourceNode: "",
        spawnSourceCommandIndex: null,
      });
      snapshot("action_fallback", 3);
    }
  }
  return frames;
}

/**
 * 找出完整攻击里可按目标重播的受击段起点。
 *
 * 攻击脚本通常先用 `$13` 从攻击者锚点生成发射物，弹道结束后清空对象，再用
 * `$12` 从目标锚点进入命中特效。少数脚本（例如 `$02`）不在两段之间清空，
 * 因此以“最后一个攻击者对象之后的第一个目标对象”为硬边界；清空命令只用于把
 * 紧邻命中特效的空白/换 CHR 帧一并纳入。没有 `$12` 的震屏类命中段则退回到最后
 * 一次清空之后。无法识别时返回 `frames.length`，宁可不追加也不重播整次攻击。
 */
function attackImpactCommandStart(commands, frames) {
  const nameAt = index => String(commands[index]?.name || "");
  let lastActorSpawn = -1;
  for (let index = 0; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_actor") lastActorSpawn = index;
  }

  let targetSpawn = -1;
  for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
    if (nameAt(index) === "spawn_object_at_target") {
      targetSpawn = index;
      break;
    }
  }

  let boundaryCommand = targetSpawn;
  if (targetSpawn >= 0) {
    for (let index = lastActorSpawn + 1; index < targetSpawn; index += 1) {
      if (nameAt(index) === "clear_effect_objects") boundaryCommand = index + 1;
    }
  } else {
    for (let index = lastActorSpawn + 1; index < commands.length; index += 1) {
      if (nameAt(index) !== "clear_effect_objects") continue;
      if (frames.some(frame => Number(frame.commandIndex) > index)) {
        boundaryCommand = index + 1;
      }
    }
  }
  return boundaryCommand < 0 ? commands.length : boundaryCommand;
}

function attackImpactFrameStart(commands, frames) {
  if (!frames.length) return 0;
  const boundaryCommand = attackImpactCommandStart(commands, frames);
  if (boundaryCommand >= commands.length) return frames.length;
  const frameIndex = frames.findIndex(
    frame => Number(frame.commandIndex) >= boundaryCommand,
  );
  return frameIndex < 0 ? frames.length : frameIndex;
}

/**
 * 把完整攻击按 VM 的真实命令边界切成发射、弹道、击中三段。
 *
 * 发射段从脚本开头持续到第一个对象位移/路径命令；弹道段从该位移开始，到
 * `attackImpactFrameStart` 找出的目标对象边界；击中段则保留余下所有目标效果。
 * 没有位移命令的近战、枪口闪光等攻击自然得到 0 帧弹道，而不是硬按帧数三等分。
 */
function attackAnimationSegments(commands, frames) {
  const fullEnd = frames.length;
  const impactStart = Math.min(
    Math.max(attackImpactFrameStart(commands, frames), 0),
    fullEnd,
  );
  const trajectoryIndex = frames.findIndex((frame, index) => {
    if (index >= impactStart) return false;
    const event = String(frame.event || "");
    return event.startsWith("animate_") ||
      event === "move_object_x" || event === "move_object_xy";
  });
  const trajectoryStart = trajectoryIndex < 0 ? impactStart : trajectoryIndex;
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, fullEnd),
    full: range(0, fullEnd),
  };
}

/**
 * 给 owner 命令定位到与逐帧切分一致的语义段。
 *
 * 范围使用 VM 展开后的命令序号；消费方只需拿 `source_node` 与
 * `source_command_index` 对照 owner 命令，不需要看字节偏移。一个 repeat 中的同一条
 * owner 命令可能跨段执行，因此调用方应保留它命中的全部段。
 */
export function attackAnimationCommandSegments(commands, frames, segments = null) {
  const frameSegments = segments || attackAnimationSegments(commands, frames);
  const impactStart = Math.min(
    Math.max(attackImpactCommandStart(commands, frames), 0),
    commands.length,
  );
  const firstTrajectoryFrame = frameSegments.trajectory.count > 0
    ? frames[frameSegments.trajectory.start] : null;
  const trajectoryStart = Math.min(
    Math.max(
      firstTrajectoryFrame == null
        ? impactStart : Number(firstTrajectoryFrame.commandIndex),
      0,
    ),
    impactStart,
  );
  const range = (start, end) => ({
    start,
    end,
    count: Math.max(0, end - start),
  });
  return {
    launch: range(0, trajectoryStart),
    trajectory: range(trajectoryStart, impactStart),
    impact: range(impactStart, commands.length),
    full: range(0, commands.length),
  };
}

/**
 * `_battle_action_tile_placements` 的镜像。
 *
 * 打包的 `origin` **不是视觉中心**：高/低 nibble 分别是 X/Y 的四分之一图块锚点
 * 偏移。镜像路径反转 X 步长，并给每个发出的图块置上 OAM 水平翻转位。
 */
export function battleActionPlacements(action, flipX = false) {
  if (!action?.available) return [];
  const origin = Number(action.origin);
  const originX = (origin >> 4) * 4;
  const originY = (origin & 0x0f) * 4;
  const startX = flipX ? originX : -originX - 1;
  const startY = -originY - 1;
  const stepX = flipX ? -8 : 8;
  const columns = Number(action.columns);
  const placements = [];
  (action.tiles || []).forEach((tileId, index) => {
    placements.push([
      Number(tileId),
      startX + (index % columns) * stepX,
      startY + Math.floor(index / columns) * 8,
      flipX,
    ]);
  });
  return placements;
}

/** `_paint_battle_action` 的镜像。`gameAnchor` 时坐标就是对象锚点。 */
export function paintBattleAction(
  raster, action, tiles, palettes, x, y,
  {scale = 1, gameAnchor = false, flipX = false, tileVisible = null} = {},
) {
  if (!action?.available) return;
  const placements = battleActionPlacements(action, flipX);
  if (!placements.length) return;
  let offsetX = x;
  let offsetY = y;
  if (!gameAnchor) {
    const xs = placements.map(item => item[1]);
    const ys = placements.map(item => item[2]);
    const minimumX = Math.min(...xs);
    const maximumX = Math.max(...xs) + 8;
    const minimumY = Math.min(...ys);
    const maximumY = Math.max(...ys) + 8;
    offsetX = Math.round(x - (minimumX + maximumX) * scale / 2);
    offsetY = Math.round(y - (minimumY + maximumY) * scale / 2);
  }
  const paletteId = Number(action.palette_id);
  const palette = palettes.slice(paletteId * 4, paletteId * 4 + 4);
  for (const [tileId, relativeX, relativeY, tileFlipX] of placements) {
    if (tileId === 0) continue;
    const tileX = offsetX + relativeX * scale;
    // OAM 的 Y 是图块首行前一条扫描线。
    const tileY = offsetY + (relativeY + (gameAnchor ? 1 : 0)) * scale;
    if (tileVisible && !tileVisible(tileX, tileY)) continue;
    paintChrTile(
      raster.data, raster.width,
      tileX, tileY,
      tiles[tileId], palette,
      {hflip: tileFlipX, scale, background: null});
  }
}

/** 把一帧状态画成干净舞台画面。 */
export function paintCleanFrame(frame, {tilesByBank, actionById, palettes}) {
  const raster = createRaster(
    CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects) {
    const action = actionById.get(item.action);
    if (!action?.available) continue;
    paintBattleAction(
      raster, action, tiles, attackFramePalettes(frame, palettes),
      Math.round(item.x), Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX});
  }
  return raster;
}

// ---------------------------------------------------------------------------
// 数据装配

const sourceCaches = new WeakMap();
const attackVisualPlaybacks = new WeakMap();
let attackVisualObserver = null;

function observeAttackVisualPlayback(canvas, start, stop) {
  attackVisualPlaybacks.set(canvas, {start, stop});
  if (typeof IntersectionObserver !== "function") {
    start();
    return;
  }
  attackVisualObserver ||= new IntersectionObserver(entries => {
    for (const entry of entries) {
      const playback = attackVisualPlaybacks.get(entry.target);
      if (!playback) continue;
      if (entry.isIntersecting) playback.start();
      else playback.stop();
    }
  }, {rootMargin: "160px 0px"});
  attackVisualObserver.observe(canvas);
}

/** 自定义缩略图选择器显隐时，立即启停已建立的 VM 时钟。 */
export function setWeaponEffectPreviewPlayback(root, active) {
  if (!root) return;
  const canvases = [];
  if (root.matches?.("canvas[data-attack-visual], canvas[data-effect-object-motion]")) {
    canvases.push(root);
  }
  canvases.push(...(root.querySelectorAll?.(
    "canvas[data-attack-visual], canvas[data-effect-object-motion]",
  ) || []));
  canvases.forEach(canvas => {
    const playback = attackVisualPlaybacks.get(canvas);
    if (!playback) return;
    if (active) playback.start();
    else playback.stop();
  });
}

/** 战斗特效图案表：固定对 + 效果对，按 `chr_effect_bank` 选。 */
export function battleEffectChrBanks(effectBank) {
  return resolveAttackChrPatternBanks(attackChrContextReference(effectBank));
}

const projectedOwnerAssets = new WeakMap();

async function effectiveBattleObjectAssets(assets) {
  if (!assets || typeof assets !== "object") return assets;
  if (isBattleObjectOwnerProjection(assets)) return assets;
  const [actionDocument, layoutDocument, metaspriteDocument] = await Promise.all([
    db.getResourceDocument("battle-action", null),
    db.getResourceDocument("battle-object-layout", null),
    db.getDocument(VISUAL_METASPRITES_RESOURCE_ID, null),
  ]);
  if (!actionDocument || !layoutDocument || !metaspriteDocument) {
    throw new TypeError("战斗预览缺少当前 battle-action / battle-object-layout / metasprite-record 正文");
  }
  const revision = ["battle-action", "battle-object-layout", VISUAL_METASPRITES_RESOURCE_ID]
    .map(id => db.fieldRevision(id)).join("|");
  const cached = projectedOwnerAssets.get(assets);
  if (cached?.actionDocument === actionDocument
      && cached?.layoutDocument === layoutDocument
      && cached?.metaspriteDocument === metaspriteDocument && cached.revision === revision) return cached.value;
  const value = projectBattleObjectOwners(
    assets, actionDocument, layoutDocument, metaspriteDocument);
  projectedOwnerAssets.set(
    assets, {actionDocument, layoutDocument, metaspriteDocument, revision, value});
  return value;
}

async function weaponEffectSources(assets) {
  await prepareAttackChrEntryContext();
  const [chrDocument, spritePaletteDocument] = await Promise.all([
    db.getDocument("shared-chr-bank", null),
    db.getResourceDocument("sprite-palette", null),
  ]);
  const revision = ["shared-chr-bank", "sprite-palette"].map(id => db.fieldRevision(id)).join("|");
  let byAssets = sourceCaches.get(chrDocument);
  if (!byAssets) {
    byAssets = new WeakMap();
    sourceCaches.set(chrDocument, byAssets);
  }
  let cache = byAssets.get(assets);
  if (!cache || cache.spritePaletteDocument !== spritePaletteDocument || cache.revision !== revision) {
    cache = {
      assets,
      spritePaletteDocument,
      revision,
      tilesByBank: new Map(),
      tileRequests: new Map(),
      states: new Map(),
      objectMotions: new Map(),
    };
    byAssets.set(assets, cache);
  }
  return cache;
}

async function effectTiles(cache, effectBank) {
  if (cache.tilesByBank.has(effectBank)) return;
  if (!cache.tileRequests.has(effectBank)) {
    const request = composeChrPatternTable(battleEffectChrBanks(effectBank))
      .then(table => {cache.tilesByBank.set(effectBank, decodeChrTiles(table));})
      .finally(() => {cache.tileRequests.delete(effectBank);});
    cache.tileRequests.set(effectBank, request);
  }
  await cache.tileRequests.get(effectBank);
}

function resolveFramePalettes(animation, documentValue) {
  const palettesBySelector = new Map();
  for (const frame of animation.frames) {
    const selector = frame.spritePaletteSelector;
    if (selector === null || selector === undefined) continue;
    if (!palettesBySelector.has(selector)) {
      palettesBySelector.set(selector,
        effectPaletteAfterCommand(animation.palettes, documentValue, selector));
    }
    frame.palettes = palettesBySelector.get(selector);
  }
}

export function attackFramePalettes(frame, initialPalettes) {
  if (frame.spritePaletteSelector !== null && frame.spritePaletteSelector !== undefined) {
    if (!frame.palettes) throw new TypeError("攻击帧调色板尚未解析");
    return frame.palettes;
  }
  return initialPalettes;
}

/**
 * 解析一条视觉脚本的逐帧画面。
 *
 * `assets` 是 `clean_animations` 所在的武器特效资产文档。
 */
export function attackAnimationState(assets, visualCode, {
  spawnActionOverride = null,
  actorAnchor = ACTOR_ANCHOR, targetAnchor = TARGET_ANCHOR,
  gamePath = false,
  initialEffectBank = attackInitialEffectBank(),
} = {}) {
  const scripts = assets.scripts || {};
  const primary = new Map(
    (scripts.primary || []).map(item => [Number(item.id), item]));
  const auxiliary = new Map(
    (scripts.auxiliary || []).map(item => [Number(item.id), item]));
  const actionById = new Map(
    (assets.battle_objects?.actions || [])
      .map(item => [Number(item.id), item]));
  const closure = (assets.dependency_closures || []).find(
    item => Number(item.visual_code) === Number(visualCode)) || {};
  const script = primary.get(Number(visualCode));
  if (!script || String(script.decode_status) !== "decoded") return null;

  let commands = expandAttackCommands(Number(visualCode), primary, auxiliary);
  if (spawnActionOverride) {
    const sourceNode = `visual:${Number(visualCode)
      .toString(16).toUpperCase().padStart(2, "0")}`;
    const sourceCommandIndex = Number(spawnActionOverride.sourceCommandIndex);
    const actionId = Number(spawnActionOverride.actionId);
    commands = commands.map(command => {
      if (command.source_node !== sourceNode
          || Number(command.source_command_index) !== sourceCommandIndex
          || !["spawn_object_at_actor", "spawn_object_at_target"].includes(
            String(command.name),
          )) return command;
      return {
        ...command,
        operands: (command.operands || []).map(item => item?.name === "action"
          ? {...item, value: actionId}
          : item),
      };
    });
  }
  const frames = cleanAnimationStates(closure, commands, actionById,
    {actorAnchor, targetAnchor, gamePath, initialEffectBank});
  const segments = attackAnimationSegments(commands, frames);
  const commandSegments = attackAnimationCommandSegments(commands, frames, segments);
  const impactFrameStart = segments.impact.start;
  const palettes = Uint8Array.from(
    (assets.clean_animations?.palette?.values || []).map(Number));
  return {
    commands,
    actorAnchor,
    targetAnchor,
    frames,
    segments,
    commandSegments,
    impactFrameStart,
    impactFrameCount: Math.max(0, frames.length - impactFrameStart),
    impactUsesTargetObjects: frames.slice(impactFrameStart).some(frame =>
      (frame.objects || []).some(item => item.spawnAnchor === "target")
    ),
    actionById,
    palettes,
  };
}

function realSpawnIdentity(item) {
  if (!String(item?.spawnSourceNode || "")
      || !Number.isInteger(Number(item?.spawnSourceCommandIndex))) return "";
  return [
    item.spawnSourceNode,
    Number(item.spawnSourceCommandIndex),
    Number(item.slot),
  ].join(":");
}

function spawnedObjectFrames(animation, matchesObject, projectObject = item => item) {
  if (!animation?.frames?.length) return [];
  const projected = [];
  for (const frame of animation.frames) {
    const objects = (frame.objects || []).filter(item =>
      realSpawnIdentity(item) && matchesObject(item)
    ).map(projectObject);
    if (objects.length) projected.push({...frame, objects});
  }
  return projected;
}

/**
 * 物品“核心效果对象”预览。游戏的六种路径 handler 都硬编码推进效果对象槽 0
 * （$0337/$0347）；拖尾只把该坐标复制给其它槽。因此这里从真实 spawn 中选择第一条
 * 确实移动过的槽 0 载体，只借它的逐帧坐标，再用 equipment flags 选出的独立核心
 * action 重绘。VM 的 action_fallback、其它对象、背景均不进入结果。
 */
function coreEffectMotionState(assets, visualCode, actionId) {
  if (actionId === null || actionId === undefined || actionId === ""
      || !Number.isInteger(Number(actionId))) return null;
  const animation = attackAnimationState(assets, visualCode);
  if (!animation) return null;
  const wantedAction = Number(actionId);
  const carriers = new Map();
  for (const frame of animation.frames) {
    for (const item of frame.objects || []) {
      const identity = realSpawnIdentity(item);
      if (!identity || Number(item.slot) !== 0) continue;
      let carrier = carriers.get(identity);
      if (!carrier) {
        carrier = {
          identity,
          sourceNode: item.spawnSourceNode,
          sourceCommandIndex: Number(item.spawnSourceCommandIndex),
          spawnAction: Number(item.spawnAction),
          positions: new Set(),
        };
        carriers.set(identity, carrier);
      }
      carrier.positions.add(
        `${Number(item.x).toFixed(4)},${Number(item.y).toFixed(4)}`,
      );
    }
  }
  const carrier = [...carriers.values()].find(item => item.positions.size > 1);
  const frames = carrier ? spawnedObjectFrames(
    animation,
    item => realSpawnIdentity(item) === carrier.identity,
    item => ({...item, sourceAction: item.action, action: wantedAction}),
  ) : [];
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: wantedAction,
    projectedSourceCommandIndex: carrier?.sourceCommandIndex ?? null,
    carrierSpawnAction: carrier?.spawnAction ?? null,
  };
}

/**
 * 分段 battle-action 候选预览：把指定 owner spawn 的 action 临时替换成候选，
 * 再跑同一套 VM，只投影该 spawn 产生的对象。它不修改 Working 草稿。
 */
function attackActionCandidateMotionState(
  assets,
  visualCode,
  sourceCommandIndex,
  actionId,
) {
  const commandIndex = Number(sourceCommandIndex);
  const candidate = Number(actionId);
  if (!Number.isInteger(commandIndex) || !Number.isInteger(candidate)) return null;
  const animation = attackAnimationState(assets, visualCode, {
    spawnActionOverride: {sourceCommandIndex: commandIndex, actionId: candidate},
  });
  if (!animation) return null;
  const sourceNode = `visual:${Number(visualCode)
    .toString(16).toUpperCase().padStart(2, "0")}`;
  const frames = spawnedObjectFrames(animation, item =>
    item.spawnSourceNode === sourceNode
      && Number(item.spawnSourceCommandIndex) === commandIndex
      && Number(item.spawnAction) === candidate
  );
  return {
    ...animation,
    frames,
    sourceFrameCount: animation.frames.length,
    computedFrameCount: frames.length,
    projectedAction: candidate,
    projectedSourceCommandIndex: commandIndex,
  };
}

export async function cleanAnimationFrames(assets, visualCode, options = {}) {
  const document_ = await effectiveBattleObjectAssets(assets);
  const cache = await weaponEffectSources(document_);
  return animationFrames(document_, cache, visualCode, options);
}

async function animationFrames(document_, cache, visualCode, options = {}) {
  const currentOptions = {initialEffectBank: attackInitialEffectBank(), ...options};
  const key = JSON.stringify([visualCode, currentOptions]);
  if (cache.states.has(key)) return cache.states.get(key);

  const animation = attackAnimationState(document_, visualCode, currentOptions);
  if (!animation) return null;
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {
    ...animation,
    tilesByBank: cache.tilesByBank,
  };
  cache.states.set(key, result);
  return result;
}

async function objectMotionFrames(cache, key, createState) {
  if (cache.objectMotions.has(key)) return cache.objectMotions.get(key);
  const animation = createState();
  if (!animation) {
    cache.objectMotions.set(key, null);
    return null;
  }
  resolveFramePalettes(animation, cache.spritePaletteDocument);
  for (const effectBank of new Set(animation.frames.map(frame => frame.effectBank))) {
    await effectTiles(cache, effectBank);
  }
  const result = {...animation, tilesByBank: cache.tilesByBank};
  cache.objectMotions.set(key, result);
  return result;
}

/**
 * 渲染后统一扫一遍 `[data-attack-visual]` 并批量画。
 *
 * 一条剪辑有几十帧。各画布先画所选分段的第一帧，需要动画的地方用
 * `data-attack-visual-play`；每个 VM 状态就是一个 NES 帧，实际步进速度由
 * `data-attack-visual-standard` 的 PAL / NTSC 制式决定。
 */
export async function paintAttackVisualCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-attack-visual]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  // 同一批画布共用当前字段快照与 VM，取数不按画布重复。
  const resolvedByCode = new Map();
  const firstFrames = new Map();
  let emptyFrame;
  const resolveVisual = visualCode => {
    if (!resolvedByCode.has(visualCode)) {
      resolvedByCode.set(
        visualCode,
        animationFrames(document_, cache, visualCode),
      );
    }
    return resolvedByCode.get(visualCode);
  };
  for (const canvas of canvases) {
    if (canvas.dataset.attackVisualPainted === "1" || !canvas.isConnected) continue;
    try {
      const resolved = await resolveVisual(Number(canvas.dataset.attackVisual));
      if (!resolved?.frames.length) {
        canvas.dataset.attackVisualError = "该视觉脚本没有可解码帧";
        continue;
      }
      const context = canvas.getContext("2d");
      if (!context) continue;
      canvas.width = CLEAN_CANVAS.width;
      canvas.height = CLEAN_CANVAS.height;
      context.imageSmoothingEnabled = false;
      const segmentId = String(canvas.dataset.attackVisualSegment || "full");
      const segment = resolved.segments?.[segmentId];
      if (!segment) throw new TypeError(`未知攻击特效分段：${segmentId}`);
      canvas.dataset.attackVisualSegment = segmentId;
      canvas.dataset.attackVisualSegmentStart = String(segment.start);
      canvas.dataset.attackVisualSegmentEnd = String(segment.end);
      canvas.dataset.attackVisualFrames = String(segment.count);
      canvas.dataset.attackVisualComputedFrames = String(segment.count);
      canvas.dataset.attackVisualRenderedFrames = "0";
      canvas.dataset.attackVisualTotalFrames = String(resolved.frames.length);
      const status = canvas.closest("[data-attack-visual-segment-card]")
        ?.querySelector("[data-attack-visual-status]");
      if (status) {
        status.textContent = segment.count ? `${segment.count} 帧` : "";
      }
      const renderedFrames = new Set();
      const draw = index => {
        let image;
        if (!renderedFrames.size) {
          let frames = firstFrames.get(resolved);
          if (!frames) firstFrames.set(resolved, frames = new Map());
          image = frames.get(index);
          if (!image) {
            const raster = paintCleanFrame(resolved.frames[index], resolved);
            image = new ImageData(raster.data, raster.width, raster.height);
            frames.set(index, image);
          }
        } else {
          const raster = paintCleanFrame(resolved.frames[index], resolved);
          image = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(image, 0, 0);
        if (index >= segment.start && index < segment.end) {
          renderedFrames.add(index - segment.start);
          canvas.dataset.attackVisualRenderedFrames = String(renderedFrames.size);
        }
      };
      if (segment.count) {
        draw(segment.start + Math.min(
          Number(canvas.dataset.attackVisualFrame || 0),
          segment.count - 1));
        delete canvas.dataset.attackVisualEmpty;
      } else {
        if (!emptyFrame) {
          const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, STAGE_BACKGROUND);
          emptyFrame = new ImageData(raster.data, raster.width, raster.height);
        }
        context.putImageData(emptyFrame, 0, 0);
        canvas.dataset.attackVisualEmpty = "1";
      }
      canvas.dataset.attackVisualPainted = "1";
      const video = nesVideoStandard(canvas.dataset.attackVisualStandard);
      canvas.dataset.attackVisualStandard = video.key;
      canvas.dataset.attackVisualPlaybackHz = video.hz.toFixed(5);
      canvas.dataset.attackVisualFrameDurationMs = nesFrameDurationMs(video.key)
        .toFixed(4);
      delete canvas.dataset.attackVisualError;
      if (canvas.dataset.attackVisualPlay === "1" && segment.count) {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.attackVisualTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: segment.count,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: index => draw(segment.start + index),
          });
          canvas.dataset.attackVisualTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      canvas.dataset.attackVisualError = String(error?.message || error);
    }
  }
  firstFrames.clear();
}

function paintEffectObjectMotionFrame(frame, {
  tilesByBank,
  actionById,
  palettes,
}) {
  const raster = createRaster(CLEAN_CANVAS.width, CLEAN_CANVAS.height, null);
  const tiles = tilesByBank.get(frame.effectBank);
  if (!tiles) return raster;
  for (const item of frame.objects || []) {
    const action = actionById.get(Number(item.action));
    if (!action?.available) continue;
    paintBattleAction(
      raster,
      action,
      tiles,
      attackFramePalettes(frame, palettes),
      Math.round(item.x),
      Math.round(item.y),
      {gameAnchor: true, flipX: item.flipX},
    );
  }
  return raster;
}

/**
 * 核心效果与 battle-action 候选共用的“单个真实 spawn 对象”画布。核心模式没有
 * 真实槽 0 运动时保持透明，并把现算/渲染帧数都置为 0。
 */
export async function paintEffectObjectMotionCanvases(
  root = document,
  assets = null,
) {
  const canvases = [...root.querySelectorAll("canvas[data-effect-object-motion]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const cache = await weaponEffectSources(document_);
  for (const canvas of canvases) {
    if (canvas.dataset.effectObjectMotionPainted === "1" || !canvas.isConnected) continue;
    const visualText = canvas.getAttribute("data-effect-object-visual");
    const visualCode = visualText === null || visualText === ""
      ? null : Number(visualText);
    const actionText = canvas.getAttribute("data-effect-object-action");
    const actionId = actionText === null || actionText === ""
      ? null : Number(actionText);
    const sourceText = canvas.getAttribute("data-effect-object-source-command");
    const sourceCommandIndex = sourceText === null || sourceText === ""
      ? null : Number(sourceText);
    const context = canvas.getContext("2d");
    if (!context) continue;
    canvas.width = CLEAN_CANVAS.width;
    canvas.height = CLEAN_CANVAS.height;
    context.imageSmoothingEnabled = false;
    const status = canvas.closest("[data-effect-object-motion-card]")
      ?.querySelector("[data-effect-object-motion-status]");
    const paintEmpty = () => {
      context.clearRect(0, 0, CLEAN_CANVAS.width, CLEAN_CANVAS.height);
      canvas.dataset.effectObjectMotionComputedFrames = "0";
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionEmpty = "1";
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = sourceCommandIndex === null
          ? "这个核心效果没有可播的运动"
          : "这个候选没有可播的帧";
      }
    };
    try {
      if (!Number.isInteger(visualCode) || !Number.isInteger(actionId)) {
        paintEmpty();
        continue;
      }
      const key = sourceCommandIndex === null
        ? `core:${visualCode}:${actionId}`
        : `candidate:${visualCode}:${sourceCommandIndex}:${actionId}`;
      const resolved = await objectMotionFrames(cache, key, () =>
        sourceCommandIndex === null
          ? coreEffectMotionState(document_, visualCode, actionId)
          : attackActionCandidateMotionState(
              document_, visualCode, sourceCommandIndex, actionId,
            )
      );
      if (!resolved?.frames?.length) {
        paintEmpty();
        continue;
      }
      const renderedFrames = new Set();
      const draw = index => {
        const raster = paintEffectObjectMotionFrame(resolved.frames[index], resolved);
        context.putImageData(
          new ImageData(raster.data, raster.width, raster.height),
          0,
          0,
        );
        renderedFrames.add(index);
        canvas.dataset.effectObjectMotionRenderedFrames = String(
          renderedFrames.size,
        );
      };
      const computed = resolved.frames.length;
      canvas.dataset.effectObjectMotionComputedFrames = String(computed);
      canvas.dataset.effectObjectMotionRenderedFrames = "0";
      canvas.dataset.effectObjectMotionSourceFrames = String(
        resolved.sourceFrameCount,
      );
      canvas.dataset.effectObjectMotionMaxObjects = String(Math.max(
        0,
        ...resolved.frames.map(frame => frame.objects?.length || 0),
      ));
      canvas.dataset.effectObjectMotionSpawnActions = [...new Set(
        resolved.frames.flatMap(frame =>
          (frame.objects || []).map(item => Number(item.spawnAction))
        ),
      )].join(",");
      if (resolved.projectedSourceCommandIndex !== null
          && resolved.projectedSourceCommandIndex !== undefined) {
        canvas.dataset.effectObjectMotionCarrierCommand = String(
          resolved.projectedSourceCommandIndex,
        );
      }
      if (resolved.carrierSpawnAction !== null
          && resolved.carrierSpawnAction !== undefined) {
        canvas.dataset.effectObjectMotionCarrierSpawnAction = String(
          resolved.carrierSpawnAction,
        );
      }
      draw(Math.min(
        Number(canvas.dataset.effectObjectMotionFrame || 0),
        computed - 1,
      ));
      delete canvas.dataset.effectObjectMotionEmpty;
      canvas.dataset.effectObjectMotionPainted = "1";
      if (status) {
        status.textContent = status.hasAttribute("data-effect-object-motion-compact-status")
          ? `${computed} 帧`
          : `${computed} 帧 · 只播放核心效果对象`;
      }
      const video = nesVideoStandard(canvas.dataset.effectObjectMotionStandard);
      canvas.dataset.effectObjectMotionStandard = video.key;
      canvas.dataset.effectObjectMotionPlaybackHz = video.hz.toFixed(5);
      delete canvas.dataset.effectObjectMotionError;
      if (canvas.dataset.effectObjectMotionPlay === "1") {
        let clock = null;
        const stop = () => {
          clock?.cancel();
          clock = null;
          delete canvas.dataset.effectObjectMotionTimer;
        };
        const start = () => {
          if (clock || !canvas.isConnected) return;
          clock = startNesFrameClock({
            standard: video.key,
            frameCount: computed,
            loop: true,
            shouldContinue: () => canvas.isConnected,
            onFrame: draw,
          });
          canvas.dataset.effectObjectMotionTimer = "1";
        };
        observeAttackVisualPlayback(canvas, start, stop);
      }
    } catch (error) {
      paintEmpty();
      canvas.dataset.effectObjectMotionError = String(error?.message || error);
    }
  }
}

/**
 * 单个「CHR 模式 / 动作码」的对照格。
 *
 * 取代 `previews/clean/action-atlases/*.png` 与那张总图 `action-atlas.png`：
 * 图集本来就是把同一个动作在不同 opcode-$04 模式下各画一格，现画之后按格渲染，
 * 不需要预先拼成一张大图。
 */
export async function paintBattleActionCanvases(root = document, assets = null) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-action]")];
  if (!canvases.length) return;
  const sourceDocument = assets
    || await db.getDocument("weapon-attack-parameter", null);
  if (!sourceDocument) return;
  const document_ = await effectiveBattleObjectAssets(sourceDocument);
  const actionById = new Map(
    (document_.battle_objects?.actions || []).map(item => [Number(item.id), item]));
  const palettes = Uint8Array.from(
    (document_.clean_animations?.palette?.values || []).map(Number));
  const cache = await weaponEffectSources(document_);
  const cell = 64;
  for (const canvas of canvases) {
    if (canvas.dataset.battleActionPainted === "1" || !canvas.isConnected) continue;
    try {
      const effectBank = Number(canvas.dataset.battleActionBank);
      const action = actionById.get(Number(canvas.dataset.battleAction));
      if (!action) throw new TypeError("动作码不存在");
      await effectTiles(cache, effectBank);
      const raster = createRaster(cell, cell, STAGE_BACKGROUND);
      paintBattleAction(
        raster, action, cache.tilesByBank.get(effectBank), palettes,
        cell / 2, cell / 2 + 5, {scale: 1});
      canvas.width = cell;
      canvas.height = cell;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.imageSmoothingEnabled = false;
      context.putImageData(new ImageData(raster.data, cell, cell), 0, 0);
      canvas.dataset.battleActionPainted = "1";
      delete canvas.dataset.battleActionError;
    } catch (error) {
      canvas.dataset.battleActionError = String(error?.message || error);
    }
  }
}

/** 单个真实 spawn 对象运动预览的标记生成器。 */
export function effectObjectMotionCanvas({
  visualCode,
  action,
  sourceCommandIndex = null,
  frame = 0,
  play = false,
  className = "",
  label = "",
} = {}) {
  const attributes = [
    "data-effect-object-motion",
    `data-effect-object-visual="${visualCode === null || visualCode === undefined
      ? "" : Number(visualCode)}"`,
    `data-effect-object-action="${action === null || action === undefined
      ? "" : Number(action)}"`,
    sourceCommandIndex === null || sourceCommandIndex === undefined
      ? "" : `data-effect-object-source-command="${Number(sourceCommandIndex)}"`,
    frame ? `data-effect-object-motion-frame="${Number(frame)}"` : "",
    play ? 'data-effect-object-motion-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

/** 动作对照格的标记生成器。 */
export function battleActionCanvas({effectBank, action, className = "", label = ""} = {}) {
  const attributes = [
    `data-battle-action="${Number(action)}"`,
    `data-battle-action-bank="${Number(effectBank)}"`,
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}

/** 给消费方用的标记生成器。 */
export function attackVisualCanvas({
  visualCode, frame = 0, play = false, segment = "full", className = "", label = "",
} = {}) {
  const segmentId = ["launch", "trajectory", "impact", "full"].includes(segment)
    ? segment : "full";
  const attributes = [
    `data-attack-visual="${Number(visualCode)}"`,
    `data-attack-visual-segment="${segmentId}"`,
    frame ? `data-attack-visual-frame="${Number(frame)}"` : "",
    play ? 'data-attack-visual-play="1"' : "",
    className ? `class="${className}"` : "",
    label ? `aria-label="${label}"` : "",
  ].filter(Boolean).join(" ");
  return `<canvas ${attributes}></canvas>`;
}
