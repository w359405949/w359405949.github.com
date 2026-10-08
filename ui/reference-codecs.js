// @editor-module 字段引用所需的 owner 专有编码器
//
// 位布局、边界与派生投影只留在拥有者一侧；通用字段引用层只看 codec ID 与
// decode/encode/accepts/candidates 这些不透明操作。

import {
  ACTOR_MOTION_CHR_TILE_CODEC_ID,
  APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID,
  AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID,
  AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID,
  ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID,
  ATTACK_VISUAL_COMMANDS_CODEC_ID,
  INVESTIGATION_HANDLER_SELECTOR_CODEC_ID,
  registerBitSliceReferenceCodec,
  registerContextAwareReferenceCodec,
  registerEncodedScalarReferenceCodec,
  registerLinkedFieldReferenceCodec,
  registerOpcodeOperandCodec,
  SCENE_HANDLE_REFERENCE_CODEC_ID,
  SHELL_VISUAL_REFERENCE_CODEC_ID,
} from "./reference-fields.js";
import {actorChrTileBinding} from "../core/actor-chr-owner.js";

// 角色帧图块的上下文、候选与像素归 owner 自身；引用层只登记入口。
registerContextAwareReferenceCodec(ACTOR_MOTION_CHR_TILE_CODEC_ID, {
  bind: actorChrTileBinding,
});

const ATTACK_VISUAL_REFERENCE_TARGETS = Object.freeze({
  visual_code: Object.freeze({
    prefix: "attack-visual",
    relation: "calls-visual-script",
  }),
  script_id: Object.freeze({
    prefix: "attack-visual-aux-script",
    relation: "calls-auxiliary-script",
  }),
  sound_id: Object.freeze({
    prefix: "audio-command",
    relation: "plays-audio-command",
  }),
  action: Object.freeze({
    prefix: "battle-action",
    relation: "uses-battle-action",
  }),
  sprite_palette: Object.freeze({
    prefix: "sprite-palette",
    relation: "uses-sprite-palette",
  }),
});

const ATTACK_VISUAL_REFERENCE_TOKENS = new Set(
  Object.keys(ATTACK_VISUAL_REFERENCE_TARGETS),
);
const ATTACK_VISUAL_REFERENCE_RELATIONS = new Set(
  Object.values(ATTACK_VISUAL_REFERENCE_TARGETS).map(target => target.relation),
);

function byteValue(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new TypeError(`${label} 必须是 u8`);
  }
  return value;
}

function shellVisualId(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x3f) {
    throw new TypeError("炮弹攻击视觉 owner 只接受 0..63 的目标键");
  }
  return value;
}

function hexByte(value) {
  return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// uid 是 consumer 保存的 owner 身份；game_id 是发布行另给的呈现键。两者不能互相解析或重组。
function sceneHandle(value, label) {
  if (typeof value !== "string" || !value) {
    throw new TypeError(`${label} 必须是非空的不透明字符串`);
  }
  return value;
}

function sceneHandleCandidateRows(rows) {
  const sceneIds = new Set();
  return rows.map((row, index) => {
    if (!plainObject(row)) {
      throw new TypeError(`scene owner 发布候选第 ${index + 1} 行必须是对象`);
    }
    sceneHandle(row.uid, `scene owner 发布候选第 ${index + 1} 行 uid`);
    const gameId = row.game_id;
    if (!new Set(["number", "string"]).has(typeof gameId)
        || (typeof gameId === "string" && !gameId.trim())) {
      throw new TypeError(`scene owner 发布候选第 ${index + 1} 行缺少 game_id`);
    }
    const id = Number(gameId);
    if (!Number.isInteger(id)) {
      throw new TypeError(`scene owner 发布候选第 ${index + 1} 行 game_id 不是整数`);
    }
    if (sceneIds.has(id)) {
      throw new TypeError(`scene owner 发布候选 game_id ${String(gameId)} 重复`);
    }
    sceneIds.add(id);
    return Object.freeze({
      ...row,
      id,
      slug: String(row.source_path || ""),
    });
  });
}

registerEncodedScalarReferenceCodec(SCENE_HANDLE_REFERENCE_CODEC_ID, {
  decode(sourceValue) {
    return sceneHandle(sourceValue, "scene consumer 句柄");
  },
  encode(_sourceValue, targetValue) {
    return sceneHandle(targetValue, "scene owner 候选句柄");
  },
  candidates: sceneHandleCandidateRows,
  accepts(targetValue, row) {
    return typeof targetValue === "string" && row?.uid === targetValue;
  },
});

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${label} 必须是非负整数`);
  }
  return value;
}

function attackVisualOperandId(commandIndex, operandIndex) {
  return `command:${commandIndex}/operand:${operandIndex}`;
}

function attackVisualReferenceToken(operandName) {
  const token = operandName === "palette_offset" ? "sprite_palette" : operandName;
  return ATTACK_VISUAL_REFERENCE_TOKENS.has(token) ? token : null;
}

function paletteIdFromOffset(value) {
  const offset = byteValue(value, "攻击动画调色板偏移");
  if (offset % 3 !== 0 || offset / 3 > 0x1f) {
    throw new TypeError("攻击动画调色板偏移必须精确指向 0..31 的语义调色板");
  }
  return offset / 3;
}

function paletteOffsetFromId(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x1f) {
    throw new TypeError("攻击动画调色板 owner 只接受 0..31 的语义目标键");
  }
  return value * 3;
}

function decodedAttackVisualCommands(source, label) {
  if (!Array.isArray(source)) throw new TypeError(`${label} 必须是命令数组`);
  const offsets = new Set();
  return source.map((command, commandIndex) => {
    const commandLabel = `${label}[${commandIndex}]`;
    if (!plainObject(command) || !Array.isArray(command.operands)) {
      throw new TypeError(`${commandLabel} 必须是含 operands 的命令对象`);
    }
    const offset = nonNegativeInteger(command.offset, `${commandLabel}.offset`);
    if (offsets.has(offset)) throw new TypeError(`${label} 含重复命令偏移 ${offset}`);
    offsets.add(offset);
    byteValue(command.opcode, `${commandLabel}.opcode`);
    return {
      id: `command:${commandIndex}`,
      opcode: String(command.opcode_hex || hexByte(command.opcode)),
      label: String(command.name || `命令 ${commandIndex + 1}`),
      operands: command.operands.flatMap((operand, operandIndex) => {
        const operandLabel = `${commandLabel}.operands[${operandIndex}]`;
        if (!plainObject(operand) || typeof operand.name !== "string" || !operand.name) {
          throw new TypeError(`${operandLabel} 必须是含稳定 name 的 operand 对象`);
        }
        const encodedValue = byteValue(operand.value, `${operandLabel}.value`);
        const token = attackVisualReferenceToken(operand.name);
        if (!token) return [];
        return [{
          id: attackVisualOperandId(commandIndex, operandIndex),
          token,
          label: token,
          value: token === "sprite_palette"
            ? paletteIdFromOffset(encodedValue) : encodedValue,
          meta: operand.value_hex || hexByte(encodedValue),
        }];
      }),
    };
  });
}

function encodeAttackVisualCommandEdits(source, updates, label) {
  const decoded = decodedAttackVisualCommands(source, label);
  const encoded = source.map(command => ({
    ...command,
    operands: command.operands.map(operand => ({...operand})),
  }));
  const operands = new Map(decoded.flatMap(command => command.operands.map(operand => {
    const match = /^command:(\d+)\/operand:(\d+)$/u.exec(operand.id);
    if (!match) throw new TypeError(`${label} 产生了无效的 owner operand ID ${operand.id}`);
    return [operand.id, {
      operand,
      commandIndex: Number(match[1]),
      operandIndex: Number(match[2]),
    }];
  })));
  const updated = new Set();
  updates.forEach(update => {
    const located = operands.get(update.id);
    if (!located || located.operand.token !== update.token || updated.has(update.id)) {
      throw new TypeError(`${label} 拒绝无效或重复的 operand 修改 ${update.id}/${update.token}`);
    }
    if (!ATTACK_VISUAL_REFERENCE_TOKENS.has(update.token)) {
      throw new TypeError(`${label} 拒绝修改非引用 operand ${update.token}`);
    }
    updated.add(update.id);
    const value = update.token === "sprite_palette"
      ? paletteOffsetFromId(update.value)
      : byteValue(update.value, `${label}.${update.id}`);
    const operand = encoded[located.commandIndex].operands[located.operandIndex];
    operand.value = value;
    operand.value_hex = hexByte(value);
  });
  return encoded;
}

function registerAttackVisualCommandCodec(codecId, label) {
  registerOpcodeOperandCodec(codecId, {
    decode: source => decodedAttackVisualCommands(source, label),
    encode: (source, updates) => encodeAttackVisualCommandEdits(source, updates, label),
  });
}

registerAttackVisualCommandCodec(
  ATTACK_VISUAL_COMMANDS_CODEC_ID,
  "attack-visual.commands",
);
registerAttackVisualCommandCodec(
  ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID,
  "attack-visual-aux-script.commands",
);

const shellVisualReferenceCodec = Object.freeze({
  decode(sourceValue) {
    const source = byteValue(sourceValue, "炮弹外观打包值");
    return {target: source & 0x3f, preserved: source & 0xc0};
  },
  encode(sourceValue, targetValue) {
    const source = byteValue(sourceValue, "炮弹外观打包值");
    return (source & 0xc0) | shellVisualId(targetValue);
  },
  accepts(targetValue) {
    return Number.isInteger(targetValue) && targetValue >= 0 && targetValue <= 0x3f;
  },
});

// 既有静态列仍使用 encoded-scalar；它与新 bit-slice 入口共用同一个 owner 实现，
// 不复制位布局。encoded-scalar 的 decoder 只投影目标键，bit-slice 还发布保存态。
registerEncodedScalarReferenceCodec(SHELL_VISUAL_REFERENCE_CODEC_ID, {
  decode(sourceValue) {
    return shellVisualReferenceCodec.decode(sourceValue).target;
  },
  encode: shellVisualReferenceCodec.encode,
  accepts: shellVisualReferenceCodec.accepts,
});
registerBitSliceReferenceCodec(SHELL_VISUAL_REFERENCE_CODEC_ID, shellVisualReferenceCodec);

function envelopePointerTarget(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new TypeError("音色包络程序目标键必须是 u16");
  }
  return value;
}

registerLinkedFieldReferenceCodec(AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID, {
  decode(sourceValues) {
    if (sourceValues.length !== 2) {
      throw new TypeError("音色包络指针必须由两个 owner 字段组成");
    }
    const [high, low] = sourceValues.map((value, index) =>
      byteValue(value, `音色包络指针字段 ${index + 1}`));
    return (high * 0x100) + low;
  },
  encode(_sourceValues, targetValue) {
    const target = envelopePointerTarget(targetValue);
    return [target >> 8, target & 0xff];
  },
  accepts(targetValue, row) {
    return Number.isInteger(targetValue) && targetValue >= 0 && targetValue <= 0xffff
      && (row === undefined
        || !String(row?.status || "").startsWith("invalid-reserved-sentinel"));
  },
});

function applicationConfigurationPointerTarget(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new TypeError("应用配置族目标键必须是 u16");
  }
  return value;
}

function applicationConfigurationCandidateRows(rows) {
  const groups = new Map();
  rows.forEach((row, index) => {
    if (!plainObject(row)) {
      throw new TypeError(`应用配置族发布候选第 ${index + 1} 行必须是对象`);
    }
    const target = applicationConfigurationPointerTarget(row.target_cpu);
    const family = String(row.family_id_hex || "").trim();
    const label = String(row.label || "").trim();
    if (!family || !label) {
      throw new TypeError(`应用配置族发布候选第 ${index + 1} 行缺少 family 或标签`);
    }
    if (!groups.has(target)) groups.set(target, []);
    const group = groups.get(target);
    if (group.some(entry => entry.family === family)) {
      throw new TypeError(`应用配置族目标 ${String(target)} 重复发布 family ${family}`);
    }
    group.push({row, family, label});
  });
  return [...groups.values()].map(group => {
    const families = group.map(entry => entry.family).join(" / ");
    const labels = group.map(entry => entry.label).join(" / ");
    return Object.freeze({
      ...group[0].row,
      family_id_hex: families,
      label: `${families} · ${labels}`,
    });
  });
}

registerLinkedFieldReferenceCodec(APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID, {
  decode(sourceValues) {
    if (sourceValues.length !== 2) {
      throw new TypeError("应用配置族指针必须由两个 owner 字段组成");
    }
    const [high, low] = sourceValues.map((value, index) =>
      byteValue(value, `应用配置族指针字段 ${index + 1}`));
    return (high * 0x100) + low;
  },
  encode(_sourceValues, targetValue) {
    const target = applicationConfigurationPointerTarget(targetValue);
    return [target >> 8, target & 0xff];
  },
  candidates: applicationConfigurationCandidateRows,
  candidatePresentation: "declared",
  accepts(targetValue, row) {
    return Number.isInteger(targetValue) && targetValue >= 0 && targetValue <= 0xffff
      && (row === undefined || row?.target_cpu === targetValue);
  },
});

const AUDIO_TRACK_CHANNELS_LOW_TO_HIGH = Object.freeze([
  "noise",
  "triangle",
  "pulse-2",
  "pulse-1",
]);

function audioTrackContext(value) {
  if (!plainObject(value)
      || typeof value.source_stream_id !== "string"
      || !value.source_stream_id
      || !new Set(["music", "sound-effect"]).has(value.parser_mode)
      || !AUDIO_TRACK_CHANNELS_LOW_TO_HIGH.includes(value.channel_key)) {
    throw new TypeError("音频命令音序引用缺少合法 owner 上下文");
  }
  return value;
}

function audioCommandTrackContext(row, itemIndex) {
  if (!plainObject(row) || !Number.isInteger(itemIndex) || itemIndex < 0) {
    throw new TypeError("音频命令音序引用需要记录与当前数组项序号");
  }
  const high = row.track_sequence_pointer_high;
  const low = row.track_sequence_pointer_low;
  const references = row.track_sequence_references;
  if (!Array.isArray(high) || !Array.isArray(low) || !Array.isArray(references)
      || high.length !== low.length || high.length !== references.length) {
    throw new TypeError("音频命令音序高低字节与发布引用数组长度不一致");
  }
  const mask = byteValue(row.channel_mask_and_kind, "音频命令声道标记");
  const channels = AUDIO_TRACK_CHANNELS_LOW_TO_HIGH.filter((_channel, bit) =>
    (mask & (1 << bit)) !== 0);
  if (channels.length !== high.length || itemIndex >= channels.length) {
    throw new TypeError("音频命令音序数组项与 owner 声道值域不一致");
  }
  const parserMode = String(row.kind || "");
  if (!new Set(["music", "sound-effect"]).has(parserMode)) {
    throw new TypeError("音频命令音序引用缺少合法解析模式");
  }
  const sourceStreamId = references[itemIndex];
  if (typeof sourceStreamId !== "string" || !sourceStreamId) {
    throw new TypeError("音频命令音序数组项缺少发布 stream 引用");
  }
  return Object.freeze({
    source_stream_id: sourceStreamId,
    parser_mode: parserMode,
    channel_key: channels[itemIndex],
  });
}

function publishedAudioTrackContext(candidateRows, context) {
  const expected = audioTrackContext(context);
  if (!Array.isArray(candidateRows)) {
    throw new TypeError("音频命令音序引用缺少发布 stream 候选表");
  }
  const sourceRows = candidateRows.filter(row => row?.id === expected.source_stream_id);
  if (sourceRows.length !== 1) {
    throw new TypeError(
      `音频命令音序发布引用 ${expected.source_stream_id} 未唯一命中 stream 候选`,
    );
  }
  const source = sourceRows[0];
  const selectedBank = source?.selected_sequence_bank;
  if (!Object.hasOwn(source, "selected_sequence_bank")
      || !(selectedBank === null || (Number.isInteger(selectedBank) && selectedBank >= 0))
      || source?.parser_mode !== expected.parser_mode
      || source?.channel_key !== expected.channel_key) {
    throw new TypeError("音频命令音序发布引用与 owner 上下文不一致");
  }
  return source;
}

registerLinkedFieldReferenceCodec(AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID, {
  context: audioCommandTrackContext,
  decode(sourceValues, context) {
    audioTrackContext(context);
    if (sourceValues.length !== 2) {
      throw new TypeError("音频命令音序指针必须由两个 owner 字段组成");
    }
    const [high, low] = sourceValues.map((value, index) =>
      byteValue(value, `音频命令音序指针字段 ${index + 1}`));
    return (high * 0x100) + low;
  },
  encode(_sourceValues, targetValue, context) {
    audioTrackContext(context);
    const target = envelopePointerTarget(targetValue);
    return [target >> 8, target & 0xff];
  },
  accepts(targetValue, row, context, candidateRows) {
    const expected = publishedAudioTrackContext(candidateRows, context);
    return Number.isInteger(targetValue) && targetValue >= 0 && targetValue <= 0xffff
      && (row === undefined || (
        row?.entry_pointer === targetValue
        && row?.selected_sequence_bank === expected.selected_sequence_bank
        && row?.parser_mode === expected.parser_mode
        && row?.channel_key === expected.channel_key
      ));
  },
});

function investigationHandlerTarget(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x0f) {
    throw new TypeError("调查命令 handler 目标键必须能装入 owner 的低四位");
  }
  return value;
}

const investigationHandlerReferenceCodec = Object.freeze({
  decode(sourceValue) {
    const source = byteValue(sourceValue, "调查命令打包值");
    return {target: source & 0x0f, preserved: source & 0xf0};
  },
  encode(sourceValue, targetValue) {
    const source = byteValue(sourceValue, "调查命令打包值");
    return (source & 0xf0) | investigationHandlerTarget(targetValue);
  },
  accepts(targetValue, row) {
    return Number.isInteger(targetValue) && targetValue >= 0 && targetValue <= 0x0f
      && (row === undefined || row?.investigation_selector === targetValue);
  },
});

registerBitSliceReferenceCodec(
  INVESTIGATION_HANDLER_SELECTOR_CODEC_ID,
  investigationHandlerReferenceCodec,
);

/** 同步 shell-record owner 自己发布的同字节派生投影，避免 Working 内部发生分叉。 */
function synchronizeShellVisualReference(documentValue, recordIndex) {
  const record = documentValue?.records?.[recordIndex];
  if (!record || typeof record !== "object") {
    throw new TypeError(`shell-record.records[${recordIndex}] 不存在`);
  }
  const packed = byteValue(record.visual_packed, "炮弹外观打包值");
  const visualCode = packed & 0x3f;
  record.visual_packed_hex = hexByte(packed);
  record.visual_code = visualCode;
  record.visual_code_hex = hexByte(visualCode);
  record.visual_variant = packed >> 6;
  record.pre_shift_value = packed >> 3;

  const table = documentValue?.tables?.visual_selectors;
  if (Array.isArray(table?.values) && recordIndex < table.values.length) {
    table.values[recordIndex] = packed;
  }
  if (Array.isArray(table?.values_hex) && recordIndex < table.values_hex.length) {
    table.values_hex[recordIndex] = hexByte(packed);
  }
}



function attackVisualTargetHandle(token, encodedValue) {
  const target = ATTACK_VISUAL_REFERENCE_TARGETS[token];
  if (!target) throw new TypeError(`未知攻击动画引用 operand：${token}`);
  const semanticId = token === "sprite_palette"
    ? paletteIdFromOffset(encodedValue)
    : byteValue(encodedValue, `攻击动画 ${token} operand`);
  return `${target.prefix}:${semanticId.toString(16).toUpperCase().padStart(2, "0")}`;
}

/** 同步攻击动画 owner 发布的直接引用投影；缺项、重项与游离投影都拒绝保存。 */
function synchronizeAttackVisualCommandReferences(documentValue, recordIndex) {
  const record = documentValue?.records?.[recordIndex];
  if (!plainObject(record) || !Array.isArray(record.commands)
      || !Array.isArray(record.direct_references)) {
    throw new TypeError(`攻击动画 records[${recordIndex}] 缺少命令或直接引用投影`);
  }
  const expected = new Map();
  record.commands.forEach((command, commandIndex) => {
    if (!plainObject(command) || !Array.isArray(command.operands)) {
      throw new TypeError(`攻击动画 records[${recordIndex}].commands[${commandIndex}] 无效`);
    }
    const offset = nonNegativeInteger(
      command.offset,
      `攻击动画 records[${recordIndex}].commands[${commandIndex}].offset`,
    );
    command.operands.forEach(operand => {
      const operandName = String(operand?.name || "");
      const token = attackVisualReferenceToken(operandName);
      if (!token) return;
      const target = ATTACK_VISUAL_REFERENCE_TARGETS[token];
      const field = `commands[${offset}].${operandName}`;
      const key = JSON.stringify([offset, field, target.relation]);
      if (expected.has(key)) {
        throw new TypeError(`攻击动画 records[${recordIndex}] 含重复引用 operand ${field}`);
      }
      expected.set(key, {
        field,
        target: attackVisualTargetHandle(token, operand.value),
      });
    });
  });

  const published = new Map();
  record.direct_references.forEach((reference, referenceIndex) => {
    if (!plainObject(reference)
        || !ATTACK_VISUAL_REFERENCE_RELATIONS.has(reference.relation)) return;
    const key = JSON.stringify([
      reference.command_offset,
      reference.field,
      reference.relation,
    ]);
    if (!expected.has(key)) {
      throw new TypeError(
        `攻击动画 records[${recordIndex}] 含没有对应 operand 的直接引用投影 ${
          reference.field || referenceIndex}`,
      );
    }
    if (published.has(key)) {
      throw new TypeError(
        `攻击动画 records[${recordIndex}] 含重复直接引用投影 ${reference.field}`,
      );
    }
    published.set(key, reference);
  });
  expected.forEach((projection, key) => {
    const reference = published.get(key);
    if (!reference) {
      throw new TypeError(
        `攻击动画 records[${recordIndex}] 缺少直接引用投影 ${projection.field}`,
      );
    }
    reference.target = projection.target;
  });
}

export function applyAttackVisualCommandFieldEdits(documentValue, edits, applyDefault) {
  applyDefault();
  const changedRecords = new Set();
  edits.forEach(edit => {
    const [root, index, field] = edit.path;
    if (edit.path.length === 3 && root === "records" && Number.isInteger(index)
        && field === "commands" && edit.opcode) {
      changedRecords.add(index);
    }
  });
  changedRecords.forEach(index =>
    synchronizeAttackVisualCommandReferences(documentValue, index));
}
