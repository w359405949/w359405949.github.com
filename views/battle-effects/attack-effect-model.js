// @editor-module 攻击视效行内编辑共用的语义模型
//
// 这里只对照 owner 已发布的命令序号、引用候选与 VM 分段。operand 编码仍交给
// attack-visual 专用 codec；消费视图不解释字节布局，也不建立第二条写回路径。

import {
  ATTACK_VISUAL_COMMANDS_CODEC_ID,
  applyOpcodeOperandEdits,
} from "../../ui/reference-fields.js";
import {
  applyAttackVisualCommandFieldEdits,
} from "../../ui/reference-codecs.js";
import {attackChrReferenceKey} from "../../core/attack-chr-owner.js";
import {
  attackAnimationCommandSegments,
  attackAnimationState,
} from "../../render/weapon-effect-vm.js";

export const ATTACK_VISUAL_RESOURCE_ID = "attack-visual";
const ATTACK_VISUAL_AUX_RESOURCE_ID = "attack-visual-aux-script";
export const BATTLE_ACTION_RESOURCE_ID = "battle-action";

export const ATTACK_EDITABLE_SEGMENTS = Object.freeze([
  "launch",
  "trajectory",
  "impact",
]);

const STAGE_COMMAND_NAMES = new Set([
  "spawn_object_at_actor",
  "spawn_object_at_target",
]);

export function cloneAttackEffectValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function attackEffectResourceHandle(prefix, value) {
  return `${prefix}:${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
}


/** Owner 命令表中所有可选生成命令的位置。 */
export function attackEffectStages(record) {
  if (!record || !Array.isArray(record.commands)) return [];
  return record.commands.flatMap((command, commandIndex) => {
    if (!STAGE_COMMAND_NAMES.has(command?.name)) return [];
    const operandIndex = (command.operands || []).findIndex(operand =>
      operand?.name === "action"
    );
    if (operandIndex < 0) return [];
    return [{
      commandIndex,
      operandIndex,
      anchor: command.name === "spawn_object_at_actor" ? "actor" : "target",
      actionId: Number(command.operands[operandIndex].value),
    }];
  });
}

/**
 * 把 owner 的生成命令放回 VM 现算的发射／弹道／击中段。
 *
 * 同一条 owner 命令在 repeat 展开后可以进入多个段；这种情况在每个实际段都保留
 * 一个同步入口，绝不把两个 operand 合并成一个新概念。
 */
export function attackEffectSegmentStages(record, animation) {
  const groups = {
    launch: [],
    trajectory: [],
    impact: [],
    unmapped: [],
  };
  const commands = animation?.commands || [];
  const commandSegments = animation?.commandSegments
    || attackAnimationCommandSegments(
      commands,
      animation?.frames || [],
      animation?.segments || null,
    );
  const sourceNode = `visual:${Number(record?.id)
    .toString(16).toUpperCase().padStart(2, "0")}`;
  for (const stage of attackEffectStages(record)) {
    const occurrences = commands.flatMap((command, expandedIndex) =>
      command.source_node === sourceNode
        && Number(command.source_command_index) === Number(stage.commandIndex)
        ? [expandedIndex] : []
    );
    const matched = ATTACK_EDITABLE_SEGMENTS.filter(segment => {
      const range = commandSegments[segment];
      return range && occurrences.some(index =>
        index >= Number(range.start) && index < Number(range.end)
      );
    });
    if (!matched.length) {
      groups.unmapped.push(stage);
      continue;
    }
    matched.forEach(segment => {
      const frameRange = animation?.segments?.[segment];
      const sourceFrames = frameRange
        ? (animation.frames || []).slice(Number(frameRange.start), Number(frameRange.end))
        : [];
      let contextFrames = sourceFrames.filter(frame => (frame.objects || []).some(item =>
        item.spawnSourceNode === sourceNode
          && Number(item.spawnSourceCommandIndex) === Number(stage.commandIndex)
      ));
      if (!contextFrames.length) {
        contextFrames = sourceFrames.filter(frame =>
          occurrences.includes(Number(frame.commandIndex))
        );
      }
      if (!contextFrames.length) contextFrames = sourceFrames;
      const contexts = [...new Map(contextFrames
        .map(frame => frame.chrContext)
        .filter(context => attackChrReferenceKey(context))
        .map(context => [attackChrReferenceKey(context), context])).values()];
      groups[segment].push({...stage, chrContexts: contexts});
    });
  }
  return groups;
}

/**
 * 三个页面的动态目录：以 stage 中实际命中的 spawn 为使用记录，再按 action 去重。
 * `chrContexts` 已在 shared-chr-bank owner 边界封成不透明引用，页面不会看到 mode/bank。
 */
function attackEffectStageCatalogs(effectAssets) {
  const catalogs = Object.fromEntries(ATTACK_EDITABLE_SEGMENTS.map(stage => [
    stage,
    new Map(),
  ]));
  for (const record of effectAssets?.scripts?.primary || []) {
    if (Number(record?.id) === 0x46 || record?.decode_status !== "decoded") continue;
    const animation = attackAnimationState(effectAssets, Number(record.id));
    if (!animation) continue;
    const groups = attackEffectSegmentStages(record, animation);
    for (const stage of ATTACK_EDITABLE_SEGMENTS) {
      groups[stage].forEach((spawn, ordinal) => {
        const actionId = Number(spawn.actionId);
        if (!Number.isInteger(actionId)) return;
        const byAction = catalogs[stage];
        if (!byAction.has(actionId)) {
          byAction.set(actionId, {
            stage,
            actionId,
            handle: attackEffectResourceHandle(BATTLE_ACTION_RESOURCE_ID, actionId),
            usages: [],
          });
        }
        byAction.get(actionId).usages.push({
          key: [stage, Number(record.id), spawn.commandIndex, spawn.operandIndex]
            .join(":"),
          visualCode: Number(record.id),
          visualHandle: attackEffectResourceHandle(
            ATTACK_VISUAL_RESOURCE_ID,
            Number(record.id),
          ),
          commandIndex: Number(spawn.commandIndex),
          operandIndex: Number(spawn.operandIndex),
          anchor: spawn.anchor,
          ordinal,
          chrContexts: spawn.chrContexts || [],
        });
      });
    }
  }
  return Object.fromEntries(ATTACK_EDITABLE_SEGMENTS.map(stage => [
    stage,
    Object.freeze([...catalogs[stage].values()]
      .sort((left, right) => left.actionId - right.actionId)
      .map(entry => Object.freeze({
        ...entry,
        usageCount: entry.usages.length,
        visualCount: new Set(entry.usages.map(usage => usage.visualHandle)).size,
        chrContexts: Object.freeze([...new Map(entry.usages.flatMap(usage =>
          usage.chrContexts.map(context => [
            `${context.schema}:${context.resource_id}:${context.token}`,
            context,
          ])
        )).values()]),
        usages: Object.freeze(entry.usages.map(Object.freeze)),
      }))),
  ]));
}

/**
 * 效果对象目录：一条 battle-action 一行。
 *
 * **不按发射/弹道/击中分。** 那三段是从 attack-visual 的命令流反推出来的读法，
 * 不是 battle-action 的属性——实测有 2 条 action 同时落在两段（`102` 在发射与
 * 击中、`222` 在发射与弹道），一个属性不可能同时有两个值。合并时 usages 与 CHR
 * context 取并集：一条 action 被谁生成、在哪套 CHR 下解算，本来就可以是多份。
 */
export function attackEffectObjectCatalog(effectAssets) {
  const catalogs = attackEffectStageCatalogs(effectAssets);
  const byAction = new Map();
  for (const stage of ATTACK_EDITABLE_SEGMENTS) {
    for (const entry of catalogs[stage] || []) {
      const current = byAction.get(entry.actionId);
      if (!current) {
        byAction.set(entry.actionId, {
          actionId: entry.actionId,
          handle: entry.handle,
          usages: [...entry.usages],
          chrContexts: [...entry.chrContexts],
        });
        continue;
      }
      const seenUsage = new Set(current.usages.map(item => item.key));
      for (const usage of entry.usages) {
        if (!seenUsage.has(usage.key)) current.usages.push(usage);
      }
      const seenContext = new Set(current.chrContexts.map(item =>
        `${item.schema}:${item.resource_id}:${item.token}`));
      for (const context of entry.chrContexts) {
        const key = `${context.schema}:${context.resource_id}:${context.token}`;
        if (!seenContext.has(key)) current.chrContexts.push(context);
      }
    }
  }
  return Object.freeze([...byAction.values()]
    .sort((left, right) => left.actionId - right.actionId)
    .map(entry => Object.freeze({
      ...entry,
      usageCount: entry.usages.length,
      visualCount: new Set(entry.usages.map(usage => usage.visualHandle)).size,
      usages: Object.freeze(entry.usages),
      chrContexts: Object.freeze(entry.chrContexts),
    })));
}

/** Overlay canonical attack-visual Working commands onto the VM catalog input. */
export function projectAttackVisualOwner(effectAssets, attackDocument) {
  const primary = effectAssets?.scripts?.primary;
  const records = attackDocument?.records;
  if (!Array.isArray(primary) || !Array.isArray(records)) {
    throw new TypeError("attack-visual owner 投影输入不完整");
  }
  const byId = new Map(records.map(record => [Number(record?.id), record]));
  const projected = primary.map(base => {
    const record = byId.get(Number(base?.id));
    if (!record || !Array.isArray(record.commands)) {
      throw new TypeError(`attack-visual:${Number(base?.id)
        .toString(16).toUpperCase().padStart(2, "0")} 缺少 canonical owner`);
    }
    return {
      ...base,
      decode_status: record.decode_status,
      commands: cloneAttackEffectValue(record.commands),
    };
  });
  return {
    ...effectAssets,
    scripts: {...effectAssets.scripts, primary: projected},
  };
}

export function attackEffectRecordCommandState(record) {
  return JSON.stringify([
    record?.commands || null,
    record?.direct_references || null,
  ]);
}

/** 通过 attack-visual owner codec 修改一条生成命令的 action 引用。 */
export function applyAttackEffectStageSelection(document_, {
  visualCode,
  commandIndex,
  operandIndex,
  actionId,
}) {
  const records = document_?.records;
  if (!Array.isArray(records)) throw new TypeError("attack-visual 文档缺少 records");
  const recordIndex = records.findIndex(record =>
    Number(record?.id) === Number(visualCode)
  );
  if (recordIndex < 0) throw new TypeError(`attack-visual 缺少记录 ${visualCode}`);
  const record = records[recordIndex];
  const command = record.commands?.[Number(commandIndex)];
  const operand = command?.operands?.[Number(operandIndex)];
  if (!STAGE_COMMAND_NAMES.has(command?.name) || operand?.name !== "action") {
    throw new TypeError("所选位置不是 action 引用");
  }
  const encoded = applyOpcodeOperandEdits(
    ATTACK_VISUAL_COMMANDS_CODEC_ID,
    record.commands,
    [{
      id: `command:${Number(commandIndex)}/operand:${Number(operandIndex)}`,
      token: "action",
      value: Number(actionId),
    }],
  );
  applyAttackVisualCommandFieldEdits(
    document_,
    [{
      path: ["records", recordIndex, "commands"],
      opcode: {codec: ATTACK_VISUAL_COMMANDS_CODEC_ID},
    }],
    () => {
      record.commands = encoded;
    },
  );
  return record;
}
