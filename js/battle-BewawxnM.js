import { editorLog, visualUrl } from './project-store-values-klefznSR.js';
import { esc, attackAnimationCommandSegments, attackAnimationState, resetToOriginalButton, attackVisualCanvas, applyResetToOriginalStates, configureAnimatedResourcePicker, paintEffectObjectMotionCanvases, setWeaponEffectPreviewPlayback, prepareAnimatedResourceOptions, effectObjectMotionCanvas, handleMarkup, bindFieldResetToOriginalButtons, cleanAnimationFrames, CLEAN_CANVAS, paintCleanFrame, audioCommandLabel, hex, resourceForwardReferenceCell, datasetFacts, battleActionCanvas, dataTable, resourceLabel, renderModuleComponent, recordUid, monsterFigureCanvas, prepareModuleComponent, hydrateModuleComponents } from './monster-figure-C07vG7yu.js';
import { db, actorChrTileBinding, attackChrReferenceKey, createAutoSave, BATTLE_ACTION_RESOURCE_ID as BATTLE_ACTION_RESOURCE_ID$2, BATTLE_OBJECT_LAYOUT_RESOURCE_ID, VISUAL_METASPRITES_RESOURCE_ID, hasFieldOwner, fieldOwner, visualAssetComponents, effectPaletteValues, EFFECT_PALETTE_GROUP_COUNT, resetProjectFields, projectBattleObjectOwners, buildLogButton } from './scene-actors-Cftr7mCE.js';
import { state, startNesFrameClock, battleSimulatorMode, BATTLE_SIMULATOR_MODES } from './emulator-Bl-sLXnd.js';
import { registerContextAwareReferenceCodec, registerEncodedScalarReferenceCodec, SCENE_HANDLE_REFERENCE_CODEC_ID, SHELL_VISUAL_REFERENCE_CODEC_ID, registerBitSliceReferenceCodec, registerLinkedFieldReferenceCodec, registerOpcodeOperandCodec, ACTOR_MOTION_CHR_TILE_CODEC_ID, ATTACK_VISUAL_COMMANDS_CODEC_ID, ATTACK_VISUAL_AUX_COMMANDS_CODEC_ID, AUDIO_VOICE_ENVELOPE_POINTER_CODEC_ID, APPLICATION_CONFIG_FAMILY_POINTER_CODEC_ID, AUDIO_COMMAND_TRACK_SEQUENCE_POINTER_CODEC_ID, INVESTIGATION_HANDLER_SELECTOR_CODEC_ID, applyOpcodeOperandEdits, battleModeForPendingEventFlag, battleFirstMonsterId } from './preview-sound-DHDXA99x.js';
import { battleSimulationMarkup } from './battle-simulation-player-CZ8Cov7C.js';
import { nesColorCss, nesColorGrid, paletteSwatches } from './entity-detail-D8pHuYrZ.js';
import { BATTLE_OBJECT_LAYOUT_MODULE_ID } from './components-BY2Q9sQf.js';
import { scenePositionPickerMarkup } from './components-wbruLTYI.js';
import { recordPage, panel, fields } from './record-BbPQSBBw.js';
import { physicalLocationMarkup } from './writeback-capabilities-CGLIL9l3.js';
import { copyEditorDraft } from './monsters-DSVVpGWY.js';
import { inPageTabs } from './generic-shop-CwrAX46z.js';
import './text-record-structure-editor-COmgY10x.js';
import { bindTimelinePlayer, timelinePlayer, timelineViewportControls, syncTimelinePlayer } from './timeline-player-C0h-EABn.js';
import { mountFieldObjectColumns, mountLinkedFieldChoice } from './rectangle-preset-controls-MtKWNScU.js';
import './baseline-assembly-C0KRII8X.js';
import './write-access-marker-Q1IasgBx.js';
import './page-runtime-paths-_6fUGFtn.js';
import './battle-actors-XIvkcBal.js';
import './charset-BJ0aS3Xk.js';
import './story-component-labels-C9k8orBA.js';
import './facility-configuration-controls-J3sIu6pM.js';
import './battle-scene-composer-BouUlKQZ.js';
import './visual-components-CNmZ9fox.js';

// @editor-module 攻击特效编辑器读取当前 target 的写回边界
/**
 * Return the published component count for one semantic asset in the active
 * browser target.  `null` means the project/target metadata is not available;
 * zero means it is available and the asset has no binding.
 */
function attackEffectBindingComponentCount(manifest, resourceId) {
  const targetId = manifest?.default_target;
  const bindings = targetId
    ? manifest?.targets?.[targetId]?.bindings?.bindings
    : null;
  if (!Array.isArray(bindings)) return null;
  return bindings
    .filter(item => item?.asset_id === resourceId)
    .reduce((total, binding) => total + (binding.input?.components || []).length, 0);
}

// @editor-module 攻击脚本共用的 owner 编辑入口
//
// 这里不解释 opcode、operand 编码或 ROM 布局。命令形状、可编辑 operand 与保存期
// 重编码都交给 attack-visual 已登记的字段对象；本页只把选中的一条记录嵌进
// 战斗详情页，并收窄到 owner 明确开放的命令控件。


const ATTACK_VISUAL_RESOURCE_ID$1 = "attack-visual";
const ATTACK_VISUAL_AUX_RESOURCE_ID = "attack-visual-aux-script";
const ELEMENT_NAME$2 = "attack-visual-command-authoring";
const COMMAND_RESOURCES = new Set([
  ATTACK_VISUAL_RESOURCE_ID$1,
  ATTACK_VISUAL_AUX_RESOURCE_ID,
]);

function loadingMarkup(handle) {
  return "";
}
function errorMarkup(message) {
  return `<p class="module-editor-error" role="alert">${esc(message)}</p>`;
}

function immutableMarkup(handle) {
  return `<section class="module-field-panel readonly"
      data-attack-visual-immutable="true" aria-label="不可编辑的攻击视觉记录">
  </section>`;
}

function selectedRecordRow(host, handle) {
  return [...host.querySelectorAll("[data-field-object] tbody tr")].find(row =>
    row.querySelector(':scope > td')?.textContent?.trim() === handle
  ) || null;
}

/**
 * 字段对象自己渲染正式表声明；视图层只留下当前记录的 commands 列。
 * 路径因此仍是完整文档里的 records[N].commands，保存不需要索引翻译或代理仓库。
 */
function focusSelectedCommandRow(host, handle) {
  const selected = selectedRecordRow(host, handle);
  if (!selected) throw new Error(`${handle}: owner 字段对象没有渲染这条记录`);
  const commandCell = selected.querySelector(':scope > td:nth-child(2)');
  if (!commandCell) throw new Error(`${handle}: owner 字段对象没有声明 commands 字段`);

  const selectedCells = [...selected.children];
  const commandColumnIndex = selectedCells.indexOf(commandCell);
  host.querySelectorAll("[data-field-object] tbody tr").forEach(row => {
    if (row !== selected) row.remove();
  });
  selectedCells.forEach((cell, index) => {
    if (index !== 0 && index !== commandColumnIndex && index !== selectedCells.length - 1) cell.remove();
  });
  host.querySelectorAll("[data-field-object] thead tr").forEach(row => {
    [...row.children].forEach((cell, index) => {
      if (index !== 0 && index !== commandColumnIndex && index !== row.children.length - 1) cell.remove();
    });
  });
  host.querySelectorAll(
    ".module-field-pagination, .module-resource-select, .module-field-table-tabs",
  ).forEach(node => node.remove());

  const summary = host.querySelector("[data-field-object] h3");
  if (summary) {
    summary.textContent = "命令流";
  }
  return selected;
}

async function hydrateAttackVisualCommandAuthoring(element) {
  const handle = String(element?.dataset?.attackVisualHandle || "");
  const resourceId = String(
    element?.dataset?.attackVisualResource || ATTACK_VISUAL_RESOURCE_ID$1,
  );
  if (!element || !handle) return;
  if (!COMMAND_RESOURCES.has(resourceId)) {
    element.dataset.attackVisualAuthoringState = "error";
    element.innerHTML = errorMarkup(`未知攻击视觉命令资源：${resourceId}`);
    return;
  }
  element.dataset.attackVisualAuthoringState = "loading";
  element.dataset.attackVisualSaveLayer = "working-override";
  element.dataset.attackVisualCommandResource = resourceId;
  element.innerHTML = loadingMarkup();
  try {
    const resolved = await db.readResource(resourceId);
    const records = resolved?.value?.document?.records;
    if (!Array.isArray(records)) {
      throw new Error(`${resourceId} 没有发布语义记录表`);
    }
    const record = records.find(candidate => candidate?.handle === handle);
    if (!record) throw new Error(`${handle}: Working 中找不到对应攻击视觉记录`);

    const immutable = record.edit_policy === "immutable";
    if (immutable) {
      element.innerHTML = immutableMarkup(handle);
      element.dataset.attackVisualAuthoringState = "readonly";
      element.dataset.attackVisualEditableOperands = "0";
      return;
    }

    const bindingCount = attackEffectBindingComponentCount(
      state.browserProjectManifest,
      resourceId,
    );
    element.dataset.attackVisualBindingComponents = String(
      bindingCount ?? "unknown",
    );
    const objects = await db.getFieldObjects(resourceId);
    const object = objects.find(candidate => candidate.fields.some(field =>
      field.entityHandle === handle && field.fieldName === "commands"));
    if (!object) throw new Error(`${handle}: 没有已声明的 commands 字段对象`);
    element.innerHTML = '<div data-attack-visual-owner-editor></div>';
    const editor = element.querySelector("[data-attack-visual-owner-editor]");
    await object.mount(editor);
    const selected = focusSelectedCommandRow(editor, handle);
    if (!element.isConnected) return;
    const controls = [...selected.querySelectorAll(
      "[data-field-object-operand]",
    )].filter(control => !control.disabled);
    const otherEnabled = [...selected.querySelectorAll("input, select")]
      .filter(control => !control.disabled && !controls.includes(control));
    if (otherEnabled.length) {
      throw new Error(`${handle}: owner editor 暴露了 commands 之外的可编辑字段`);
    }
    element.dataset.attackVisualEditableOperands = String(controls.length);
    element.dataset.attackVisualAuthoringState = "ready";
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    element.dataset.attackVisualAuthoringState = "error";
    element.innerHTML = errorMarkup(error?.message || error);
  }
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME$2)) {
  globalThis.customElements.define(ELEMENT_NAME$2, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.attackVisualAuthoringBound === "1") return;
      this.dataset.attackVisualAuthoringBound = "1";
      void hydrateAttackVisualCommandAuthoring(this);
    }
  });
}

// @editor-module 字段引用所需的 owner 专有编码器
//
// 位布局、边界与派生投影只留在拥有者一侧；通用字段引用层只看 codec ID 与
// decode/encode/accepts/candidates 这些不透明操作。


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

function applyAttackVisualCommandFieldEdits(documentValue, edits, applyDefault) {
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

// @editor-module 攻击视效行内编辑共用的语义模型
//
// 这里只对照 owner 已发布的命令序号、引用候选与 VM 分段。operand 编码仍交给
// attack-visual 专用 codec；消费视图不解释字节布局，也不建立第二条写回路径。


const ATTACK_VISUAL_RESOURCE_ID = "attack-visual";
const BATTLE_ACTION_RESOURCE_ID$1 = "battle-action";

const ATTACK_EDITABLE_SEGMENTS = Object.freeze([
  "launch",
  "trajectory",
  "impact",
]);

const STAGE_COMMAND_NAMES = new Set([
  "spawn_object_at_actor",
  "spawn_object_at_target",
]);

function cloneAttackEffectValue(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function attackEffectResourceHandle(prefix, value) {
  return `${prefix}:${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
}


/** Owner 命令表中所有可选生成命令的位置。 */
function attackEffectStages(record) {
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
function attackEffectSegmentStages(record, animation) {
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
            handle: attackEffectResourceHandle(BATTLE_ACTION_RESOURCE_ID$1, actionId),
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
function attackEffectObjectCatalog(effectAssets) {
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
function projectAttackVisualOwner(effectAssets, attackDocument) {
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

function attackEffectRecordCommandState(record) {
  return JSON.stringify([
    record?.commands || null,
    record?.direct_references || null,
  ]);
}

/** 通过 attack-visual owner codec 修改一条生成命令的 action 引用。 */
function applyAttackEffectStageSelection(document_, {
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

// @editor-module 主脚本列表里的分段选择与预览

const SEGMENT_LABELS = new Map([
  ["launch", "发射"],
  ["trajectory", "弹道"],
  ["impact", "击中"],
  ["full", "完整"],
]);

const sourceByRepository = new WeakMap();
const controllerByRoot = new WeakMap();

function effectAssets() {
  return state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
}

function visualIdentity(item) {
  const visualCode = Number(item?.visual_code ?? item?.id);
  const handle = item?.handle || attackEffectResourceHandle(
    ATTACK_VISUAL_RESOURCE_ID,
    visualCode,
  );
  const record = db.peekDocument(ATTACK_VISUAL_RESOURCE_ID, null)?.records
    ?.find(candidate => candidate.handle === handle);
  const immutable = recordIsImmutable(record);
  return {visualCode, handle, immutable};
}

function recordIsImmutable(record) {
  return record?.edit_policy === "immutable";
}

async function segmentEditorSource(repository) {
  let request = sourceByRepository.get(repository);
  if (!request) {
    request = Promise.all([
      db.readResource(ATTACK_VISUAL_RESOURCE_ID),
      db.readResource(BATTLE_ACTION_RESOURCE_ID$1),
    ]).then(([primary, actions]) => {
      const primaryRecords = primary?.value?.document?.records;
      const actionRecords = actions?.value?.document?.records;
      if (!Array.isArray(primaryRecords)) {
        throw new TypeError("attack-visual Working 缺少 records");
      }
      if (!Array.isArray(actionRecords)) {
        throw new TypeError("battle-action owner 候选缺少 records");
      }
      return {
        document: primary.value.document,
        actions: actionRecords,
      };
    });
    sourceByRepository.set(repository, request);
    const clearRequest = () => {
      if (sourceByRepository.get(repository) === request) {
        sourceByRepository.delete(repository);
      }
    };
    void request.then(clearRequest, clearRequest);
  }
  return request;
}

function actionPickerOption(action) {
  const id = Number(action.id);
  const handle = action.handle || attackEffectResourceHandle(
    BATTLE_ACTION_RESOURCE_ID$1,
    id,
  );
  return {
    value: String(id),
    handle,
    label: `${handle}${action.available === false ? " · 不可用空项" : ""}`,
    searchText: `${id} 0x${id.toString(16).toUpperCase().padStart(2, "0")}`,
    disabled: action.available === false,
    action,
  };
}

function actionPickerOptions(source) {
  const revision = db.fieldRevision(BATTLE_ACTION_RESOURCE_ID$1);
  if (!source.actionOptions || source.actionOptionsRevision !== revision) {
    source.actionOptions = prepareAnimatedResourceOptions(source.actions.map(actionPickerOption));
    source.actionOptionsRevision = revision;
  }
  return source.actionOptions;
}

function actionPickerPreview(visualCode, commandIndex, option) {
  if (option.disabled) return '<span class="resource-empty">不可用空项</span>';
  return effectObjectMotionCanvas({
    visualCode,
    sourceCommandIndex: commandIndex,
    action: option.value,
    play: true,
    label: `${option.handle} 在当前生成命令中的动画`,
  });
}

function segmentPreviewMarkup(visualCode, segment, label) {
  const visualLabel = Number(visualCode).toString(16).toUpperCase().padStart(2, "0");
  const editable = ATTACK_EDITABLE_SEGMENTS.includes(segment);
  return `<figure class="attack-effect-segment"
      data-attack-visual-segment-card="${segment}">
    <figcaption>${esc(label)}</figcaption>
    ${attackVisualCanvas({
      visualCode,
      play: true,
      segment,
      label: `攻击视效 ${visualLabel} · ${label}`,
    })}
    <small data-attack-visual-status>解析中…</small>
    ${editable ? `<div data-attack-visual-segment-controls="${segment}"
      style="grid-column:1 / -1;display:grid;gap:4px;min-width:0">
    </div>` : ""}
  </figure>`;
}

/** 行级重置只恢复当前攻击脚本记录。 */
function renderAttackVisualSegmentEditor(item, label = "") {
  const {visualCode, handle, immutable} = visualIdentity(item);
  return `<div data-attack-visual-segment-editor
      data-attack-visual-segment-editor-state="${immutable ? "readonly" : "loading"}"
      data-visual-code="${visualCode}" data-visual-handle="${esc(handle)}"
      data-visual-immutable="${immutable}">
    <p data-attack-visual-segment-save-status hidden></p>
    <span${immutable ? ' hidden' : ''}>${resetToOriginalButton(handle, {
      attributes: {'data-attack-visual-segment-reset': ''},
    })}</span>
  </div>`;
}

function immutableSegmentMarkup(segment) {
  return `<span class="resource-empty">按定义不可变</span>${
    ATTACK_EDITABLE_SEGMENTS.includes(segment)
      ? `<div data-attack-visual-segment-controls="${segment}">
          <span class="resource-empty">不可选择：按定义不可变</span>
        </div>` : ""}`;
}

/** 一次只渲染一个表格单元格；前三段有控件宿主，完整段没有。 */
function renderAttackVisualSegmentCell(item, label, segment, segmentLabel = "") {
  if (!SEGMENT_LABELS.has(segment)) {
    throw new RangeError(`未知攻击视效分段：${segment}`);
  }
  const {visualCode, handle, immutable} = visualIdentity(item);
  const shownLabel = segmentLabel || SEGMENT_LABELS.get(segment);
  return `<div class="attack-effect-preview-column"
      data-attack-visual-segment-column="${segment}"
      data-attack-visual-segment-state="${immutable ? "readonly" : "loading"}"
      data-visual-code="${visualCode}" data-visual-handle="${esc(handle)}">
    ${immutable
      ? immutableSegmentMarkup(segment)
      : segmentPreviewMarkup(visualCode, segment, shownLabel)}
  </div>`;
}

function rowForEditor(editor) {
  return editor?.closest?.("tr[data-row-id]") || null;
}

function setRowState(rowState, stateName) {
  rowState.editor.dataset.attackVisualSegmentEditorState = stateName;
  rowState.row.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
    cell.dataset.attackVisualSegmentState = stateName;
  });
}

function setRowError(editor, message) {
  editor.dataset.attackVisualSegmentEditorState = "error";
  const row = rowForEditor(editor);
  row?.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
    cell.dataset.attackVisualSegmentState = "error";
  });
  const status = editor.querySelector("[data-attack-visual-segment-save-status]");
  if (status) status.textContent = `分段选择载入失败：${message}`;
}

function renderSegmentControls(rowState) {
  const actionOptions = actionPickerOptions(rowState.source);
  const groups = attackEffectSegmentStages(rowState.draftRecord, rowState.animation);
  if (groups.unmapped.length) {
    throw new Error(
      `${rowState.handle}: ${groups.unmapped.length} 条生成命令无法按 VM 边界归段`,
    );
  }
  rowState.groups = groups;
  rowState.editor.dataset.attackVisualUniqueSpawnCount = String(
    new Set(ATTACK_EDITABLE_SEGMENTS.flatMap(segment =>
      groups[segment].map(stage => `${stage.commandIndex}:${stage.operandIndex}`)
    )).size,
  );
  ATTACK_EDITABLE_SEGMENTS.forEach(segment => {
    const cell = rowState.row.querySelector(
      `[data-attack-visual-segment-column="${segment}"]`,
    );
    const host = cell?.querySelector(
      `[data-attack-visual-segment-controls="${segment}"]`,
    );
    if (!host) {
      throw new Error(`${rowState.handle}: ${segment} 单元格缺少选择器宿主`);
    }
    const stages = groups[segment];
    host.dataset.spawnCommandCount = String(stages.length);
    host.innerHTML = stages.length
      ? stages.map((stage, index) => `<label data-attack-visual-segment-spawn
          data-command-index="${stage.commandIndex}"
          data-operand-index="${stage.operandIndex}"
          style="display:grid;gap:2px;min-width:0">
        <span>生成命令 ${index + 1} · ${stage.anchor === "actor" ? "攻击者" : "目标"}</span>
        <animated-resource-picker data-attack-visual-segment-action
          data-segment="${segment}"
          data-command-index="${stage.commandIndex}"
          data-operand-index="${stage.operandIndex}"></animated-resource-picker>
      </label>`).join("")
      : '';
    host.querySelectorAll("animated-resource-picker[data-attack-visual-segment-action]")
      .forEach(picker => {
        const commandIndex = Number(picker.dataset.commandIndex);
        configureAnimatedResourcePicker(picker, {
          options: actionOptions,
          value: stages.find(stage =>
            Number(stage.commandIndex) === commandIndex
              && Number(stage.operandIndex) === Number(picker.dataset.operandIndex)
          )?.actionId,
          renderPreview: option => actionPickerPreview(
            rowState.visualCode,
            commandIndex,
            option,
          ),
          paintPreview: root => paintEffectObjectMotionCanvases(
            root,
            effectAssets(),
          ),
          setPreviewActive: setWeaponEffectPreviewPlayback,
        });
      });
  });
}

function refreshDirtyState(rowState, message = "") {
  const dirty = attackEffectRecordCommandState(rowState.draftRecord)
    !== attackEffectRecordCommandState(rowState.originalRecord);
  rowState.editor.dataset.attackVisualSegmentDirty = String(dirty);
  const status = rowState.editor.querySelector(
    "[data-attack-visual-segment-save-status]",
  );
  const reset = rowState.editor.querySelector("[data-attack-visual-segment-reset]");
  // **状态行只放真实结果**（保存失败之类），不写「有未保存修改 / 已与 Working 一致」——
  // 那是关于这一行状态的元信息，而「保存」「重置」两个按钮能不能点已经说完了。
  if (status) {
    status.textContent = message || "";
    status.hidden = !message;
    status.classList.toggle("dirty", dirty);
  }
  if (reset) applyResetToOriginalStates(rowState.editor,
    new Map([[reset.dataset.resetToOriginal, dirty || rowState.commandField?.hasOverride === true]]),
    {busy: rowState.saving});
}

function applySelection(rowState, select) {
  const actionId = Number(select.value);
  const action = rowState.actionRecords.find(item => Number(item.id) === actionId);
  if (!action || action.available === false) {
    throw new Error(`battle-action 候选不可用：${select.value}`);
  }
  applyAttackEffectStageSelection(rowState.draftDocument, {
    visualCode: rowState.visualCode,
    commandIndex: Number(select.dataset.commandIndex),
    operandIndex: Number(select.dataset.operandIndex),
    actionId,
  });
  renderSegmentControls(rowState);
  refreshDirtyState(rowState);
}

async function saveRow(rowState) {
  if (rowState.saving
      || rowState.editor.dataset.attackVisualSegmentDirty !== "true") return;
  rowState.saving = true;
  refreshDirtyState(rowState);
  let finalMessage = "";
  try {
    const latest = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const current = latest.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!current) throw new Error("攻击视觉脚本不存在");
    const patch = cloneAttackEffectValue(rowState.draftRecord);
    const field = await db.getField(
      ATTACK_VISUAL_RESOURCE_ID, current.handle, "commands",
    );
    await field.set(cloneAttackEffectValue(patch.commands), {
      expectedVersion: field.version,
    });
    const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const persisted = resolved.value.document.records.find(record =>
      Number(record.id) === rowState.visualCode
    );
    rowState.originalRecord = cloneAttackEffectValue(persisted);
    rowState.draftDocument = {records: [cloneAttackEffectValue(persisted)]};
    renderSegmentControls(rowState);
    finalMessage = "本行分段已保存到 Working 覆盖";
  } catch (error) {
    finalMessage = `本行分段保存失败：${error?.message || error}`;
  } finally {
    rowState.saving = false;
    refreshDirtyState(rowState, finalMessage);
  }
}

async function resetRow(rowState) {
  if (!rowState.originalRecord || rowState.saving) return;
  rowState.saving = true;
  refreshDirtyState(rowState);
  let finalMessage = "";
  try {
    const resolved = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const current = resolved.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!current) throw new Error(`Working 缺少视效 ${rowState.visualCode}`);
    const field = await db.getField(
      ATTACK_VISUAL_RESOURCE_ID, current.handle, "commands",
    );
    await field.reset({expectedVersion: field.version});
    const reset = await db.readResource(ATTACK_VISUAL_RESOURCE_ID);
    const origin = reset.value?.document?.records?.find(record =>
      Number(record.id) === rowState.visualCode
    );
    if (!origin) throw new Error(`Origin 缺少视效 ${rowState.visualCode}`);
    rowState.originalRecord = cloneAttackEffectValue(origin);
    rowState.draftDocument = {records: [cloneAttackEffectValue(origin)]};
    renderSegmentControls(rowState);
    finalMessage = "本行已重置到 Origin";
  } catch (error) {
    finalMessage = `重置失败：${error?.message || error}`;
  } finally {
    rowState.saving = false;
    refreshDirtyState(rowState, finalMessage);
  }
}

// **改动自动写库，没有保存按钮。** 这是本项目既有的做法（样板见
// `views/boot-presentation.js`）：改一下 → 防抖 → 写进 Working，
// 用户只需要一个「重置」把这一行的 Working 清掉回到 Origin。
// 250ms 与那份保持一致；写入之间串行排队，避免同一行两次写打架。
const autoSave$1 = createAutoSave(rowState => saveRow(rowState));

function commitRow(rowState) {
  autoSave$1.commit(rowState, rowState);
}

function bindController(controller) {
  controller.root.addEventListener("change", event => {
    const select = event.target.closest?.("[data-attack-visual-segment-action]");
    if (!select) return;
    const rowState = controller.statesByRow.get(select.closest("tr[data-row-id]"));
    if (!rowState) return;
    try {
      applySelection(rowState, select);
      commitRow(rowState);
    } catch (error) {
      refreshDirtyState(rowState, `分段选择失败：${error?.message || error}`);
    }
  });
  controller.root.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    if (!button) return;
    const rowState = controller.statesByRow.get(button.closest("tr[data-row-id]"));
    if (!rowState) return;
    if (button.matches("[data-attack-visual-segment-reset]")) {
      void resetRow(rowState);
    }
  });
}

async function hydrateController(controller) {
  const repository = state.projectRepository;
  const editors = [...controller.root.querySelectorAll(
    "[data-attack-visual-segment-editor]",
  )];
  if (!repository?.resolve) {
    editors.forEach(editor => setRowError(editor, "当前项目尚未初始化"));
    controller.root.dataset.attackVisualSegmentEditorsState = "error";
    return;
  }
  try {
    const source = await segmentEditorSource(repository);
    const commandFields = await db.getFields(ATTACK_VISUAL_RESOURCE_ID);
    editors.forEach(editor => {
      const visualCode = Number(editor.dataset.visualCode);
      const row = rowForEditor(editor);
      const record = source.document.records.find(item =>
        Number(item.id) === visualCode
      );
      if (!row || !record) {
        setRowError(editor, !row
          ? "分段编辑器不在主脚本表行内"
          : `attack-visual 缺少记录 ${visualCode}`);
        return;
      }
      if (recordIsImmutable(record)) {
        editor.dataset.visualImmutable = "true";
        editor.querySelector("[data-attack-visual-segment-reset]").hidden = true;
        row.querySelectorAll("[data-attack-visual-segment-column]").forEach(cell => {
          cell.innerHTML = immutableSegmentMarkup(cell.dataset.attackVisualSegmentColumn);
        });
        const rowState = {editor, row};
        setRowState(rowState, "readonly");
        return;
      }
      try {
        const animation = attackAnimationState(effectAssets(), visualCode);
        if (!animation) throw new Error(`${record.handle}: VM 没有可解码动画状态`);
        const originalRecord = cloneAttackEffectValue(record);
        const rowState = {
          repository,
          editor,
          row,
          visualCode,
          handle: record.handle || editor.dataset.visualHandle,
          actionRecords: source.actions,
          source,
          animation,
          originalRecord,
          commandField: commandFields.find(field => field.entityHandle === record.handle
            && field.fieldName === "commands"),
          draftDocument: {records: [cloneAttackEffectValue(record)]},
          saving: false,
          get draftRecord() {
            return this.draftDocument.records[0];
          },
        };
        controller.statesByRow.set(row, rowState);
        rowState.commandField?.bind(editor, () => refreshDirtyState(rowState));
        editor.dataset.battleActionCount = String(source.actions.length);
        renderSegmentControls(rowState);
        refreshDirtyState(rowState);
        setRowState(rowState, "ready");
      } catch (error) {
        editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
        setRowError(editor, error?.message || error);
      }
    });
    controller.root.dataset.attackVisualSegmentEditorsState = editors.every(editor =>
      editor.dataset.attackVisualSegmentEditorState !== "error"
    ) ? "ready" : "error";
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    editors.forEach(editor => setRowError(editor, error?.message || error));
    controller.root.dataset.attackVisualSegmentEditorsState = "error";
  }
}

/** 水合一张主脚本表；每个 tr 是独立保存单元，四个分段单元格共享该行草稿。 */
function hydrateAttackVisualSegmentEditors(root) {
  if (!root?.querySelectorAll) {
    return Promise.reject(new TypeError("主脚本列表根节点不可用"));
  }
  const existing = controllerByRoot.get(root);
  if (existing) return existing.promise;
  const controller = {
    root,
    statesByRow: new WeakMap(),
    promise: null,
  };
  controllerByRoot.set(root, controller);
  bindController(controller);
  controller.promise = hydrateController(controller);
  return controller.promise;
}

// @editor-module 效果对象（battle-action）的逐条编辑
//
// **它没有自己的页面。** battle-action 是「哪条 layout ＋ 形状 ＋ 用哪一组调色板」
// 的组合：247 条可用记录构成 246 种不同组合，其中 20 条 layout 被共用的理由正是
// 「同一组图块换一组调色板再画一次」——所以它在数据里删不掉，但它只在某条
// attack-visual 底下才有意义，编辑器里就只出现在那条视效的走带下面。
//
// 目录身份来自 VM 对 owner spawn 的现算分段；动画只复用现有 VM 与
// animated-resource-picker。config 写 battle-action，画面写唯一共享的
// battle-object-layout；页面只传递 shared-chr-bank owner 的不透明 tile/context 引用。


const ELEMENT_NAME$1 = "attack-stage-catalog";
const VISUAL_CHR_RESOURCE_ID = "shared-chr-bank";
// **不按发射/弹道/击中分页。** 那三段是从 attack-visual 的命令流反推出来的读法，
// 不是 battle-action 的属性；把它当分类既倒转了归属，也把真正的组合点（哪条生成
// 命令指向哪条 action，在 attack-visual 的时间轴上）藏了起来。
const STAGE_LABELS = Object.freeze({objects: "效果对象"});
const controllers$1 = new WeakMap();

function repository$1() {
  const value = state.projectRepository;
  if (!value?.resolve) throw new TypeError("当前浏览器项目 repository 不可用");
  return value;
}

/**
 * 一条 action 一行。**结构固定，内容后填**——
 * 早前是先放一个 `colspan` 占位格、水合时用 `outerHTML` 换掉它，
 * 于是第二次渲染取不到那个占位格，报 `Cannot set properties of null`。
 */
function entryMarkup(entry, embedded = false) {
  return `<tr class="attack-stage-entry"
      data-attack-stage-entry="${entry.actionId}"
      data-attack-stage-usage-count="${entry.usageCount}"
      data-attack-stage-visual-count="${entry.visualCount}">
    <td class="mono sticky-col">${handleMarkup(entry.handle)}</td>
    ${embedded ? "" : '<td data-attack-stage-cell="animation"></td>'}
    <td data-attack-stage-cell="shape"></td>
    <td data-attack-stage-cell="palette"></td>
    <td data-attack-stage-cell="origin-x"></td>
    <td data-attack-stage-cell="origin-y"></td>
    <td data-attack-stage-cell="tiles"></td>
    <td data-attack-stage-cell="reset"></td>
  </tr>`;
}

/**
 * 目录的表格外壳。**水合时也要用它**——早前水合直接
 * `root.innerHTML = entries.map(entryMarkup)`，裸 `<tr>` 会被 HTML 解析器丢掉，
 * 于是整张表变空，报出来的却是「没有按 Working 重算」。
 */
function catalogTableMarkup(entries, embedded = false) {
  const columns = embedded ? 7 : 8;
  return `<div class="data-table-wrap"><table class="data-table attack-stage-table">
    <thead><tr>
      <th class="sticky-col">资源 ID</th>
      ${embedded ? "" : "<th>动画</th>"}<th>形状</th><th>调色板</th>
      <th>原点 X</th><th>原点 Y</th><th>像素</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th>
    </tr></thead>
    <tbody>${entries.map(entry => entryMarkup(entry, embedded)).join("")
      || `<tr><td colspan="${columns}" class="resource-empty">没有匹配条目</td></tr>`}</tbody>
  </table></div>`;
}

function filterEntries(entries, query) {
  const wanted = String(query || "").trim().toLocaleLowerCase("zh-CN");
  return entries.filter(entry => !wanted || JSON.stringify([
    entry.handle,
    ...entry.usages.map(usage => usage.visualHandle),
  ]).toLocaleLowerCase("zh-CN").includes(wanted));
}

function requireAsset(resolved, resourceId) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== resourceId || !asset.document) {
    throw new TypeError(`${resourceId} owner 资产不可用`);
  }
  if (hasFieldOwner(resourceId)) fieldOwner(resourceId).describe(asset.document);
  else visualAssetComponents(asset, resourceId);
  return asset;
}

function requirePaletteAsset(resolved) {
  const asset = resolved?.value;
  if (!asset || asset.resource_id !== VISUAL_METASPRITES_RESOURCE_ID
      || !asset.document) {
    throw new TypeError(`${VISUAL_METASPRITES_RESOURCE_ID} owner 资产不可用`);
  }
  effectPaletteValues(asset.document);
  return asset;
}

async function loadOwners(controller) {
  const source = repository$1();
  const [
    attackResolved, actionResolved, layoutResolved, chrResolved, metaspriteResolved,
  ] = await Promise.all([
    db.readResource(ATTACK_VISUAL_RESOURCE_ID),
    db.readResource(BATTLE_ACTION_RESOURCE_ID$2),
    db.readResource(BATTLE_OBJECT_LAYOUT_RESOURCE_ID),
    db.readResource(VISUAL_CHR_RESOURCE_ID),
    db.readResource(VISUAL_METASPRITES_RESOURCE_ID),
  ]);
  controller.repository = source;
  controller.attackAsset = requireAsset(attackResolved, ATTACK_VISUAL_RESOURCE_ID);
  controller.actionAsset = requireAsset(actionResolved, BATTLE_ACTION_RESOURCE_ID$2);
  controller.layoutAsset = requireAsset(layoutResolved, BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.chrAsset = requireAsset(chrResolved, VISUAL_CHR_RESOURCE_ID);
  // 预览只读取共用字段视图中的十二个色位；写入校验由字段 owner 负责。
  controller.metaspriteAsset = requirePaletteAsset(metaspriteResolved);
  controller.actionVersion = actionResolved.version;
  controller.actionFields = await db.getFields(BATTLE_ACTION_RESOURCE_ID$2);
  controller.actionObjects = await db.getFieldObjects(BATTLE_ACTION_RESOURCE_ID$2);
  controller.layoutVersion = layoutResolved.version;
  controller.layoutFields = await db.getFields(BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.layoutObjects = await db.getFieldObjects(BATTLE_OBJECT_LAYOUT_RESOURCE_ID);
  controller.paletteFields = (await db.getFields(VISUAL_METASPRITES_RESOURCE_ID))
    .filter(field => field.documentPath[0] === "battle_sprite_palettes");
  if (!controller.explicitEntries) {
    controller.effectAssets = projectAttackVisualOwner(
      controller.baseEffectAssets,
      controller.attackAsset.document,
    );
  }
}

function actionRecord(controller, actionId) {
  const record = controller.actionAsset.document.records?.find(item =>
    Number(item?.id) === Number(actionId)
  );
  if (!record) throw new TypeError(`battle-action:${actionId} owner 记录不存在`);
  return record;
}

function layoutRecord(controller, handle) {
  const record = controller.layoutAsset.document.records?.find(item =>
    item?.handle === handle
  );
  if (!record) throw new TypeError(`${handle} owner 记录不存在`);
  return record;
}

function shapeOptions(tileCount, columns, rows) {
  const values = [];
  for (let width = 1; width <= 8; width += 1) {
    const height = tileCount / width;
    if (Number.isInteger(height) && height >= 1 && height <= 8) {
      values.push({columns: width, rows: height});
    }
  }
  if (!values.some(item => item.columns === columns && item.rows === rows)) {
    throw new TypeError("battle-action config 形状与 layout 固定容量不一致");
  }
  return values;
}

function cloneDraft(record) {
  return cloneAttackEffectValue(record);
}


/** 画面形状。**一格一件事**，不和调色板挤在一起。 */
function shapeMarkup(cardState) {
  return `<section data-attack-stage-config>
    <span data-attack-stage-shape-fields></span>
    <small data-attack-stage-config-status></small>
  </section>`;
}

/**
 * 调色板用**色块**呈现，不是「调色板 1/2/3/4」这种文字——
 * 文字看不出是什么颜色。四组各 4 色，取自 owner 正文现算的 NES 索引。
 *
 * 选哪一组是这一行（`battle-action`）的事；**颜色本身是全局的**，
 * 四组十二个色位都能改，写 `metasprite-record` 的 `battle_sprite_palettes`。
 * 每组 0 号位是硬件通用色，画出来但不接受点击——它不在 ROM 里，改不了。
 */
function paletteMarkup(controller, cardState) {
  const {actionDraft} = cardState;
  const values = paletteValues(controller);
  const active = Number(actionDraft.palette_id);
  const swatches = values.slice(active * 4, active * 4 + 4)
    .map(index => `<i style="background:${nesColor(index)}"></i>`).join("");
  return `<div data-attack-stage-palette-fields></div>
    <div class="attack-stage-palette-choices"><span class="attack-stage-palette-choice">
      <span>${swatches}</span></span></div>${
    paletteColorsMarkup(cardState, values, active)}`;
}

/** 选中那一组的三个可改色位，外加一个只作用于这一组的重置。 */
function paletteColorsMarkup(cardState, values, group) {
  if (!Number.isInteger(group) || group < 0 || group >= EFFECT_PALETTE_GROUP_COUNT) {
    return "";
  }
  const colors = values.slice(group * 4, group * 4 + 4);
  const open = String(cardState.openColorSlot || "");
  const slots = colors.map((index, slot) => (slot === 0
    ? `<i class="attack-stage-palette-fixed"
        style="background:${nesColor(index)}"
        data-attack-stage-palette-universal></i>`
    : `<button type="button" class="attack-stage-palette-color${
        open === `${group}:${slot}` ? " is-open" : ""
      }" style="background:${nesColor(index)}"
        data-attack-stage-palette-color="${group}:${slot}"
        aria-label="调色板 ${group + 1} 第 ${slot} 色"></button>`)).join("");
  const openSlot = open.startsWith(`${group}:`)
    ? Number(open.split(":")[1]) : null;
  return `<div class="attack-stage-palette-colors"
      data-attack-stage-palette-colors="${group}">
    ${slots}
    ${resetToOriginalButton(group, {
      title: "只把这一组三色放回 Origin；形状、原点与所选组属于别的 owner，不动",
    })}
  </div>${openSlot ? colorGridMarkup(group, openSlot, colors[openSlot]) : ""}`;
}

/** 64 色 NES 取色格，排布与 PPU 一致（16×4）。 */
function colorGridMarkup(group, slot, current) {
  return nesColorGrid({
    current,
    pickAttribute: "data-attack-stage-palette-pick",
    gridAttributes: `data-attack-stage-palette-grid="${group}:${slot}"`,
  });
}

/**
 * 十六个色值只有一个来源：`metasprite-record` 的 `battle_sprite_palettes`。
 * 发布数据里的 `clean_animations.palette.values` 是同一段字节的提取快照，
 * 它不随编辑变化——读它就等于让用户改完看不见。
 */
function paletteValues(controller) {
  return effectPaletteValues(controller.metaspriteAsset.document);
}

const nesColor = nesColorCss;

/** 原点 X。**不写 handle、不写「N 个 action 共用」、不写那句保存说明**——
 *  共用是常态，提醒它是讲常识；`data-layout-shared` 留给合同用。 */
function originXMarkup(cardState) {
  const {layout} = cardState;
  const incoming = Number(layout.incoming_reference_count)
    || (layout.incoming_action_handles || []).length;
  return `<section data-attack-stage-layout
      data-layout-handle="${esc(layout.handle)}"
      data-layout-impact-count="${incoming}"
      data-layout-shared="${incoming > 1}">
    <span data-attack-stage-layout-fields></span>
    <small data-attack-stage-layout-status></small>
  </section>`;
}

function originYMarkup(cardState) {
  return '<span data-attack-stage-layout-y-fields></span>';
}

/** 像素上下文单独一列，**不跟原点挤在一起**。 */
function tileMarkup() {
  return '<span data-attack-stage-tile-fields></span>';
}

/**
 * 行正文：四个单元格，与表头一一对应。
 * **没有保存按钮**——改动自动写 Working（见 docs 的「写入链」一节）；
 * 每行只配一个「重置」，把这一行的 Working 清掉回到 Origin。
 */
/** 把六个单元格各自填上。**不动行结构**，所以可以反复调用。 */
function fillEntryCells(controller, cardState) {
  const cell = name => cardState.card.querySelector(
    `[data-attack-stage-cell="${name}"]`,
  );
  const parts = {
    ...(controller.embedded ? {} : {
      animation: `<animated-resource-picker data-attack-stage-animation-picker>
        </animated-resource-picker>`,
    }),
    shape: shapeMarkup(),
    palette: paletteMarkup(controller, cardState),
    "origin-x": originXMarkup(cardState),
    "origin-y": originYMarkup(),
    tiles: tileMarkup(),
    reset: `${resetToOriginalButton(`row:${cardState.entry.actionId}`, {
      title: "恢复这个动作的配置和当前布局；共用此布局的其他使用也会同步",
    })}
    <p class="module-editor-message" data-attack-stage-message hidden
      aria-live="polite"></p>`,
  };
  for (const [name, html] of Object.entries(parts)) {
    const node = cell(name);
    if (node) node.innerHTML = html;
  }
}

function sameConfig(left, right) {
  return Number(left.columns) === Number(right.columns)
    && Number(left.rows) === Number(right.rows)
    && Number(left.palette_id) === Number(right.palette_id);
}

function sameLayout(left, right) {
  return JSON.stringify([
    left.fields?.origin,
    left.fields?.tile_references,
  ]) === JSON.stringify([
    right.fields?.origin,
    right.fields?.tile_references,
  ]);
}

function projectedAssets(controller, cardState) {
  const actionDocument = cloneDraft(controller.actionAsset.document);
  const layoutDocument = cloneDraft(controller.layoutAsset.document);
  const action = actionDocument.records.find(item =>
    Number(item.id) === cardState.entry.actionId
  );
  Object.assign(action, {
    columns: Number(cardState.actionDraft.columns),
    rows: Number(cardState.actionDraft.rows),
    palette_id: Number(cardState.actionDraft.palette_id),
  });
  const layout = layoutDocument.records.find(item =>
    item.handle === cardState.layout.handle
  );
  layout.fields = cloneDraft(cardState.layoutDraft.fields);
  return projectBattleObjectOwners(
    controller.effectAssets,
    actionDocument,
    layoutDocument,
    controller.metaspriteAsset.document,
  );
}

function pickerOption(usage) {
  return {
    value: usage.key,
    handle: usage.visualHandle,
    label: `${usage.visualHandle} · ${usage.anchor === "actor" ? "攻击者" : "目标"}生成`,
    searchText: `${usage.visualHandle} ${usage.anchor}`,
    usage,
  };
}

function configurePreview(controller, cardState) {
  const picker = cardState.card.querySelector("[data-attack-stage-animation-picker]");
  if (!picker) throw new TypeError(`${cardState.entry.handle} 缺少动画选择器`);
  const assets = projectedAssets(controller, cardState);
  configureAnimatedResourcePicker(picker, {
    options: cardState.entry.usages.map(pickerOption),
    value: cardState.selectedUsageKey,
    renderPreview: option => effectObjectMotionCanvas({
      visualCode: option.usage.visualCode,
      sourceCommandIndex: option.usage.commandIndex,
      action: cardState.entry.actionId,
      play: true,
      label: `${cardState.entry.handle} 在 ${option.usage.visualHandle} 中的动画`,
    }),
    paintPreview: root => paintEffectObjectMotionCanvases(root, assets),
    setPreviewActive: setWeaponEffectPreviewPlayback,
  });
}

function refreshStatus(cardState) {
  const actionDirty = !sameConfig(cardState.action, cardState.actionDraft);
  const layoutDirty = !sameLayout(cardState.layout, cardState.layoutDraft);
  cardState.card.dataset.attackStageConfigDirty = String(actionDirty);
  cardState.card.dataset.attackStageLayoutDirty = String(layoutDirty);
  const configStatus = cardState.card.querySelector("[data-attack-stage-config-status]");
  const layoutStatus = cardState.card.querySelector("[data-attack-stage-layout-status]");
  // **不写「有未保存修改 / 与 Working 一致」**——重置按钮能不能点已经说完了。
  if (configStatus) configStatus.textContent = "";
  if (layoutStatus) layoutStatus.textContent = "";
  const reset = cardState.card.querySelector('[data-attack-stage-cell="reset"] [data-reset-to-original]');
  if (reset) {
    const dirty = actionDirty || layoutDirty || cardState.resetFields?.some(field => field.hasOverride) || false;
    reset.dataset.originalDirty = String(dirty);
    reset.classList.toggle('dirty', dirty);
    reset.disabled = cardState.busy || !dirty;
  }
}

function showMessage$1(cardState, message) {
  const node = cardState.card.querySelector("[data-attack-stage-message]");
  if (!node) return;
  node.hidden = !message;
  node.textContent = message;
}

/**
 * 只重画调色板那一格。
 *
 * **不要为了换一组颜色去重画整行**：`fillEntryCells` 会连动画选择器一起换掉，
 * 于是正在播的预览被拆了重建，重建期间画面是空的——在发射动画上就是「一点调色板
 * 就黑屏」，而且没有任何报错。调色板与动画分属两格，重画一格就够了。
 */
function renderPaletteCell(controller, cardState) {
  const cell = cardState.card.querySelector('[data-attack-stage-cell="palette"]');
  if (cell) {
    cell.innerHTML = paletteMarkup(controller, cardState);
    bindPaletteReset(controller, cardState);
    void mountStageFields(controller, cardState, {paletteOnly: true});
  }
}

async function mountStageFields(controller, cardState, {paletteOnly = false} = {}) {
  const action = controller.actionObjects.find(object => object.id === cardState.action.handle);
  const layout = controller.layoutObjects.find(object => object.id === cardState.layout.handle);
  if (!action || !layout) throw new TypeError("效果对象缺少字段对象");
  const paletteHost = cardState.card.querySelector('[data-attack-stage-palette-fields]');
  if (paletteHost) await mountFieldObjectColumns(paletteHost, action, ['palette_id']);
  if (paletteOnly) return;
  const shapeHost = cardState.card.querySelector('[data-attack-stage-shape-fields]');
  if (shapeHost) {
    const options = shapeOptions(cardState.layout.fields.tile_references.length,
      Number(cardState.actionDraft.columns), Number(cardState.actionDraft.rows));
    mountLinkedFieldChoice(shapeHost, action, ['columns', 'rows'], options.map(option => ({
      label: `${option.columns} × ${option.rows}`,
      values: [option.columns, option.rows],
    })), {label: '画面形状'});
  }
  const layoutHost = cardState.card.querySelector('[data-attack-stage-layout-fields]');
  if (layoutHost) await mountFieldObjectColumns(layoutHost, layout,
    ['x_quarter_tiles']);
  const layoutYHost = cardState.card.querySelector('[data-attack-stage-layout-y-fields]');
  if (layoutYHost) await mountFieldObjectColumns(layoutYHost, layout,
    ['y_quarter_tiles']);
  const tileHost = cardState.card.querySelector('[data-attack-stage-tile-fields]');
  if (tileHost) await mountFieldObjectColumns(tileHost, layout, ['tile_references']);
}

function bindPaletteReset(controller, cardState) {
  const cell = cardState.card.querySelector('[data-attack-stage-cell="palette"]');
  const selections = new Map(Array.from({length: EFFECT_PALETTE_GROUP_COUNT}, (_, group) => [String(group),
    controller.paletteFields.filter(field => field.entityHandle === `${VISUAL_METASPRITES_RESOURCE_ID}:battle-sprite-palettes:${group}`)]));
  bindFieldResetToOriginalButtons(cell, selections, {database: db,
    afterReset: () => {cardState.openColorSlot = ""; renderPaletteCell(controller, cardState);},
    onError: error => showMessage$1(cardState, `重置颜色失败：${error?.message || error}`),
  });
}

function renderCard(controller, cardState, message = "") {
  fillEntryCells(controller, cardState);
  bindPaletteReset(controller, cardState);
  void mountStageFields(controller, cardState).catch(error =>
    {editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error); return showMessage$1(cardState, `字段控件载入失败：${error?.message || error}`);});
  if (!controller.embedded) configurePreview(controller, cardState);
  cardState.resetFields = [...controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle),
    ...controller.actionFields.filter(field => field.entityHandle === cardState.action.handle && !field.readOnly)];
  refreshStatus(cardState);
  showMessage$1(cardState, message);
  const resetCell = cardState.card.querySelector('[data-attack-stage-cell="reset"]');
  const selection = {reset: async () => {
    const layout = controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle);
    const action = controller.actionFields.filter(field => field.entityHandle === cardState.action.handle && !field.readOnly);
    await resetProjectFields(db, layout);
    await resetProjectFields(db, action);
  }};
  bindFieldResetToOriginalButtons(resetCell, new Map([[`row:${cardState.entry.actionId}`, selection]]), {
    beforeReset: () => {autoSave.cancel(cardState); cardState.resetting = true; setBusy(cardState, true);},
    afterReset: async () => {cardState.resetting = false; cardState.busy = false; await refreshOwners(controller);},
    onError: error => {cardState.resetting = false; setBusy(cardState, false, `重置失败：${error?.message || error}`);},
  });
}

function rebuildCardStates(controller, messageByAction = new Map()) {
  for (const cardState of controller.cardStates.values())
    for (const unbind of cardState.fieldBindings || []) unbind();
  controller.cardStates.clear();
  controller.root.querySelectorAll("[data-attack-stage-entry]").forEach(card => {
    const actionId = Number(card.dataset.attackStageEntry);
    const entry = controller.entries.find(item => item.actionId === actionId);
    const action = actionRecord(controller, actionId);
    if (!entry || action.available !== true || !action.layout_reference) {
      const animationCell = card.querySelector('[data-attack-stage-cell="animation"]');
      if (animationCell) {
        animationCell.innerHTML =
          '';
      }
      return;
    }
    const layout = layoutRecord(controller, action.layout_reference);
    const cardState = {
      card,
      entry,
      action,
      layout,
      actionDraft: cloneDraft(action),
      actionBaseline: cloneDraft(action),
      layoutDraft: cloneDraft(layout),
      layoutBaseline: cloneDraft(layout.fields),
      selectedUsageKey: entry.usages[0]?.key || "",
      openColorSlot: "",
      busy: false,
    };
    controller.cardStates.set(card, cardState);
    try {
      renderCard(controller, cardState, messageByAction.get(actionId) || "");
      cardState.fieldBindings = [...controller.layoutFields.filter(field => field.entityHandle === layout.handle),
        ...controller.actionFields.filter(field => field.entityHandle === action.handle)]
        .map(field => {
          let observed = JSON.stringify(field.value);
          return field.bind(card, (_target, value, _field, reason) => {
            const current = JSON.stringify(value), previous = observed; observed = current;
            if (reason === "initial" || (reason === "refresh" && current === previous)
                || (cardState.busy && reason !== "reset")
                || controller.cardStates.get(card) !== cardState) return;
            const isLayout = field.resourceId === BATTLE_OBJECT_LAYOUT_RESOURCE_ID;
            const documents = isLayout ? [cardState.layoutBaseline, cardState.layoutDraft.fields]
              : [cardState.actionBaseline, cardState.actionDraft];
            const members = !isLayout && ["columns", "rows"].includes(field.fieldName)
              ? controller.actionFields.filter(member => member.entityHandle === action.handle && ["columns", "rows"].includes(member.fieldName))
              : [field];
            for (const member of members) {
              const path = member.documentPath.slice(isLayout ? 3 : 2);
              for (const document of documents)
                path.slice(0, -1).reduce((node, key) => node[key], document)[path.at(-1)] = cloneDraft(member.value);
            }
            if (cardState.resetting) {renderCard(controller, cardState); return;}
            if (!isLayout && field.fieldName === "layout_reference") {
              void autoSave.flush(cardState).then(() => refreshOwners(controller))
                .catch(error => {editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error); return showMessage$1(cardState, `布局引用刷新失败：${error?.message || error}`);});
              return;
            }
            autoSave.cancel(cardState);
            renderCard(controller, cardState);
            if (!sameLayout(cardState.layoutDraft, cardState.layout)
                || !sameConfig(cardState.actionDraft, cardState.action)) commitCard(controller, cardState);
          });
        });
      cardState.fieldBindings.push(...controller.paletteFields.map(field => {
        let observed = field.value;
        return field.bind(card, (_target, value, _field, reason) => {
          const previous = observed; observed = value;
          if (reason === "initial" || value === previous || controller.cardStates.get(card) !== cardState) return;
          renderPaletteCell(controller, cardState);
          if (!controller.embedded) configurePreview(controller, cardState);
        });
      }));
      card.dataset.attackStageEntryState = "ready";
      card.dataset.attackStageLayoutHandle = layout.handle;
    } catch (error) {
      editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
      card.dataset.attackStageEntryState = "error";
      const cell = card.querySelector('[data-attack-stage-cell="animation"]');
      if (cell) {
        cell.innerHTML =
          `<span class="resource-empty">编辑器不可用：${esc(error?.message || error)}</span>`;
      }
    }
  });
}

async function refreshOwners(controller, messageByAction = new Map()) {
  await loadOwners(controller);
  if (!controller.explicitEntries) {
    const allEntries = attackEffectObjectCatalog(controller.effectAssets);
    controller.entries = filterEntries(
      allEntries,
      controller.root.dataset.attackStageQuery,
    );
    controller.root.dataset.attackStageEntryCount = String(allEntries.length);
    controller.root.dataset.attackStageVisibleCount = String(controller.entries.length);
    controller.root.innerHTML = catalogTableMarkup(
      controller.entries, controller.embedded);
  }
  rebuildCardStates(controller, messageByAction);
}

function setBusy(cardState, value, message = "") {
  cardState.busy = Boolean(value);
  refreshStatus(cardState);
  showMessage$1(cardState, message);
}

async function saveConfig(controller, cardState) {
  if (cardState.busy || sameConfig(cardState.action, cardState.actionDraft)) return;
  setBusy(cardState, true);
  try {
    const changes = controller.actionFields.filter(field => field.entityHandle === cardState.action.handle)
      .flatMap(field => {
        const value = cardState.actionDraft[field.fieldName];
        return value === cardState.actionBaseline[field.fieldName] ? [] : [{field, value}];
      });
    if (changes.length) await db.writeFields(changes, {expectedVersion: changes[0].field.version});
    // **成功不报喜。** 写成功是常态；只有失败才是用户需要知道的结果。
    await refreshOwners(controller);
  } catch (error) {
    setBusy(cardState, false, `保存 config 失败：${error?.message || error}`);
  } finally {cardState.busy = false;}
}

async function saveLayout(controller, cardState) {
  if (cardState.busy || sameLayout(cardState.layout, cardState.layoutDraft)) return;
  setBusy(cardState, true);
  try {
    const fields = cloneDraft(cardState.layoutDraft.fields);
    const changes = controller.layoutFields.filter(field => field.entityHandle === cardState.layout.handle)
      .flatMap(field => {
        const path = field.documentPath.slice(3);
        const value = path.reduce((node, key) => node[key], fields);
        const before = path.reduce((node, key) => node[key], cardState.layoutBaseline);
        return JSON.stringify(value) === JSON.stringify(before) ? [] : [{field, value}];
      });
    if (changes.length) await db.writeFields(changes, {expectedVersion: changes[0].field.version});
    await refreshOwners(controller);
  } catch (error) {
    setBusy(cardState, false, `保存画面失败：${error?.message || error}`);
  } finally {cardState.busy = false;}
}

/** 全局色位与其他组件共用字段；先提交本行草稿，颜色写入不重建其他 owner 草稿。 */
async function savePaletteColor(controller, cardState, group, slot, color) {
  if (cardState.busy) return;
  try {
    await autoSave.flush(cardState);
    cardState = controller.cardStates.get(cardState.card) || cardState;
    setBusy(cardState, true);
    const field = controller.paletteFields.find(field =>
      field.entityHandle === `${VISUAL_METASPRITES_RESOURCE_ID}:battle-sprite-palettes:${group}`
        && field.fieldName === `color_${slot - 1}`);
    if (!field) throw new TypeError("调色板色位不存在");
    await field.set(color, {expectedVersion: field.version});
    cardState.openColorSlot = "";
    renderPaletteCell(controller, cardState);
  } catch (error) {
    editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
    showMessage$1(cardState, `保存颜色失败：${error?.message || error}`);
  } finally {cardState.busy = false; refreshStatus(cardState);}
}

function applyInputs(controller, cardState, target) {
  if (target.matches("[data-attack-stage-animation-picker]")) {
    cardState.selectedUsageKey = target.value;
    return true;
  }
  return false;
}

// 改动自动写 Working，不设保存按钮（见 docs/metalmaxcn_project.md「数据与写入／自动保存与重置」）。
// 250ms 与 `views/boot-presentation.js` 一致；config 与 layout 是两份 owner，
// 各自脏了才写，写入之间靠 `cardState.busy` 串行。
const autoSave = createAutoSave(async ({controller, cardState}) => {
  if (!sameConfig(cardState.actionDraft, cardState.action)) {
    await saveConfig(controller, cardState);
  }
  if (!sameLayout(cardState.layoutDraft, cardState.layout)) {
    await saveLayout(controller, cardState);
  }
});

function commitCard(controller, cardState) {
  autoSave.commit(cardState, {controller, cardState});
}

function bind(controller) {
  controller.root.addEventListener("change", event => {
    const card = event.target.closest?.("[data-attack-stage-entry]");
    const cardState = controller.cardStates.get(card);
    if (!cardState || cardState.busy) return;
    try {
      applyInputs(controller, cardState, event.target);
      commitCard(controller, cardState);
    } catch (error) {
      editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
      showMessage$1(cardState, `修改失败：${error?.message || error}`);
    }
  });
  controller.root.addEventListener("click", event => {
    const button = event.target.closest?.("button");
    const card = button?.closest?.("[data-attack-stage-entry]");
    const cardState = controller.cardStates.get(card);
    if (!button || !cardState || cardState.busy) return;
    if (button.matches("[data-attack-stage-palette-color]")) {
      const slot = String(button.dataset.attackStagePaletteColor || "");
      cardState.openColorSlot = cardState.openColorSlot === slot ? "" : slot;
      renderPaletteCell(controller, cardState);
      return;
    }
  });
  controller.root.addEventListener('nes-colour-confirm', event => {
    const button = event.target.closest('[data-attack-stage-palette-pick]');
    const cardState = controller.cardStates.get(button?.closest('[data-attack-stage-entry]'));
    if (button && cardState && !cardState.busy) {
      const [group, slot] = String(cardState.openColorSlot || "").split(":");
      void savePaletteColor(
        controller, cardState, Number(group), Number(slot),
        Number(button.dataset.attackStagePalettePick),
      );
      return;
    }
  });

}

async function hydrate$1(element) {
  const stage = String(element.dataset.attackStage || "");
  const embedded = element.dataset.attackStageEmbedded === "1";
  const baseEffectAssets = element.attackStageEffectAssets
    || state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {};
  const explicitEntries = Array.isArray(element.attackStageEntries);
  const entries = explicitEntries ? element.attackStageEntries : [];
  if (!STAGE_LABELS[stage] || !Array.isArray(entries)) {
    throw new TypeError("阶段目录缺少现算条目");
  }
  const controller = {
    root: element,
    stage,
    embedded,
    entries,
    explicitEntries,
    baseEffectAssets,
    effectAssets: baseEffectAssets,
    cardStates: new Map(),
  };
  controllers$1.set(element, controller);
  bind(controller);
  await refreshOwners(controller);
  element.dataset.attackStageCatalogState = [...element.querySelectorAll(
    "[data-attack-stage-entry]",
  )].every(card => card.dataset.attackStageEntryState === "ready")
    ? "ready" : "error";
}

const HTMLElementBase$1 = globalThis.HTMLElement || class {};

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ELEMENT_NAME$1)) {
  globalThis.customElements.define(ELEMENT_NAME$1, class extends HTMLElementBase$1 {
    connectedCallback() {
      if (this.dataset.attackStageCatalogBound === "1") return;
      this.dataset.attackStageCatalogBound = "1";
      void hydrate$1(this).catch(error => {
        editorLog.error("攻击视觉", `操作失败：${error?.message || error}`, error);
        this.dataset.attackStageCatalogState = "error";
        this.dataset.attackStageCatalogError = String(error?.message || error);
        this.querySelectorAll('[data-attack-stage-cell="animation"]').forEach(body => {
          body.innerHTML = `<p class="resource-empty">目录载入失败：${esc(
            error?.message || error,
          )}</p>`;
        });
      });
    }
  });
}

/** Attach dynamic catalog data before the custom element starts asynchronous hydration. */
function configureAttackStageCatalogElement(element, entries, effectAssets) {
  if (!element?.matches?.(ELEMENT_NAME$1)) return;
  element.attackStageEntries = entries;
  element.attackStageEffectAssets = effectAssets;
  if (element.isConnected && element.dataset.attackStageCatalogBound !== "1") {
    element.connectedCallback?.();
  }
}

/**
 * 显式条目模式下的表体。调用方**必须**在元素挂进 DOM 之前就把它填好并把条目挂上：
 * 自定义元素一插进来就自己水合，先插后配的话它已经按「没有显式条目」读了全表。
 */
function attackStageCatalogTableMarkup(entries, {embedded = false} = {}) {
  return catalogTableMarkup(entries, embedded);
}

const ATTACK_STAGE_CATALOG_ELEMENT = ELEMENT_NAME$1;

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

function attackVisualTimelineMarkup(visualCode) {
  return `<${ELEMENT_NAME} style="display:block"
    data-visual-code="${Number(visualCode)}"></${ELEMENT_NAME}>`;
}

// @editor-module 战斗视觉与战斗测试草稿
//
// 来源：拆分前 engine/editor/app.js 第 7525-7792 行。


const ATTACK_PREVIEW_SEGMENTS = Object.freeze([
  ["launch", "发射"],
  ["trajectory", "弹道"],
  ["impact", "击中"],
  ["full", "完整"],
]);

const ATTACK_EFFECT_LIST_ELEMENT = "attack-effect-list";
const BATTLE_OBJECT_LAYOUT_LIST_ELEMENT = "battle-object-layout-list";

function normalizedAttackEffectFilter(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

/** Apply one catalog's local filter without changing either of the other two lists. */
function filterAttackEffectList(root, query) {
  if (!root?.querySelectorAll) throw new TypeError("attack effect list root is required");
  const wanted = normalizedAttackEffectFilter(query);
  const rows = [...root.querySelectorAll("tbody tr[data-row-id]")];
  const shown = rows.filter(row => {
    const searchable = normalizedAttackEffectFilter(
      `${row.dataset.rowId || ""} ${row.textContent || ""}`,
    );
    row.hidden = Boolean(wanted) && !searchable.includes(wanted);
    return !row.hidden;
  });
  root.dataset.filteredCount = String(shown.length);
  const status = root.querySelector("[data-attack-effect-filter-status]");
  if (status) {
    status.dataset.visibleCount = String(shown.length);
    status.textContent = `${shown.length} / ${rows.length} 个匹配`;
  }
  const locate = root.querySelector("[data-attack-effect-locate]");
  if (locate) locate.disabled = shown.length === 0;
  return shown;
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(ATTACK_EFFECT_LIST_ELEMENT)) {
  globalThis.customElements.define(ATTACK_EFFECT_LIST_ELEMENT, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.attackEffectFilterBound === "1") return;
      if (this.dataset.attackEffectList === "primary") {
        void hydrateAttackVisualSegmentEditors(this).catch(error => {
          this.dataset.attackVisualSegmentEditorsState = "error";
          this.dataset.attackVisualSegmentEditorsError = String(
            error?.message || error,
          );
        });
      }
      const form = this.querySelector("[data-attack-effect-filter-form]");
      const input = this.querySelector("[data-attack-effect-filter]");
      if (!form || !input) return;
      this.dataset.attackEffectFilterBound = "1";
      input.addEventListener("input", () => filterAttackEffectList(this, input.value));
      form.addEventListener("submit", event => {
        event.preventDefault();
        filterAttackEffectList(this, input.value)[0]?.click();
      });
      filterAttackEffectList(this, input.value);
    }
  });
}

if (globalThis.customElements && globalThis.HTMLElement
    && !globalThis.customElements.get(BATTLE_OBJECT_LAYOUT_LIST_ELEMENT)) {
  globalThis.customElements.define(BATTLE_OBJECT_LAYOUT_LIST_ELEMENT, class extends HTMLElement {
    connectedCallback() {
      if (this.dataset.battleObjectLayoutListBound === "1") return;
      this.dataset.battleObjectLayoutListBound = "1";
      void loadBattleObjectLayoutList(this).catch(error => {
        editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
        if (!this.isConnected) return;
        this.dataset.layoutLoadState = "error";
        this.innerHTML = `<p class="resource-empty" data-battle-object-layout-list-error>${esc(
          error?.message || error,
        )}</p>`;
      });
    }
  });
}

function byteUid(prefix, value) {
  return `${prefix}:${Number(value).toString(16).toUpperCase().padStart(2, "0")}`;
}

function attackVisualUid(item) {
  return byteUid("attack-visual", item.visual_code);
}

function effectStreamUid(item) {
  return byteUid("effect-stream", item.effect_code);
}

function attackScriptUid(space, item) {
  if (space === "auxiliary") {
    return byteUid("attack-visual-aux-script", item.id);
  }
  return byteUid("attack-visual", item.id);
}

// 脚本和攻击视觉会引用同一个发布资源。记录页身份必须保留记录类别，
// 否则主脚本 $00 会被同号攻击视觉记录截获；资源 UID 仍只用于地址、引用与 owner。
function attackScriptRecordId(space, item) {
  return `${space === "auxiliary" ? "attack-visual-aux-script" : "attack-script"}:${
    Number(item.id).toString(16).toUpperCase().padStart(2, "0")
  }`;
}

function battleActionUid(item) {
  return byteUid("battle-action", item.id);
}

function attackEffectListMarkup({
  kind,
  className,
  rows,
  columns,
  rowId,
  recordRoute,
  publishedCount,
  total,
  placeholder,
  extraAttributes = "",
}) {
  return `<${ATTACK_EFFECT_LIST_ELEMENT} class="${esc(className)}"
    style="display:block" data-attack-effect-list="${esc(kind)}"
    data-published-count="${Number(publishedCount)}"
    data-filtered-count="${rows.length}" ${extraAttributes}>
    <form class="data-filter" data-attack-effect-filter-form>
      <span>筛选 / 定位</span>
      <input type="search" autocomplete="off" data-attack-effect-filter
        aria-label="筛选${esc(kind)}攻击特效记录" placeholder="${esc(placeholder)}">
      <button class="button ghost" type="submit" data-attack-effect-locate title="首个匹配" aria-label="首个匹配">↗</button>
      <small data-attack-effect-filter-status data-visible-count="${rows.length}">${
        rows.length
      } / ${rows.length} 个匹配</small>
    </form>
    ${dataTable({columns, rows, rowId, recordRoute, total})}
  </${ATTACK_EFFECT_LIST_ELEMENT}>`;
}

function handleCodeList(handles, dataAttribute) {
  const values = [...new Set((handles || []).map(String).filter(Boolean))];
  if (!values.length) return "—";
  return `<div class="record-resource-links">${values.map(handle =>
    `<code data-${dataAttribute}="${esc(handle)}">${esc(handle)}</code>`
  ).join("")}</div>`;
}

function battleObjectLayoutSelectionMarkup(entry, effectAssets) {
  const handle = String(entry?.handle || "");
  const actionHandles = [...new Set(
    (entry?.incoming_action_handles || []).map(String).filter(Boolean),
  )];
  const actionSet = new Set(actionHandles);
  const primaryHandles = attackEffectCompositionRoots(effectAssets, closure =>
    (closure.object_actions || []).some(action =>
      actionSet.has(byteUid("battle-action", action))
    )
  );
  return `<div data-attack-effect-preview="layout" data-layout-handle="${esc(handle)}">
    ${renderModuleComponent(BATTLE_OBJECT_LAYOUT_MODULE_ID, "preview", {entry, handle})}
    ${fields([["原点", `${esc(entry.fields?.origin?.x_quarter_tiles ?? "—")}, ${
      esc(entry.fields?.origin?.y_quarter_tiles ?? "—")} 个 1/4 tile`]])}
    ${physicalLocationMarkup({uid: handle, rows: entry.source ? [{label: "布局", address: entry.source}] : []})}
    <div data-attack-effect-usage="layout" data-action-count="${actionHandles.length}"
      data-primary-count="${primaryHandles.length}">${fields([
        ["动作入口", handleCodeList(actionHandles, "layout-action")],
        ["主脚本组合", handleCodeList(primaryHandles, "layout-primary")],
      ])}</div>
  </div>`;
}

async function loadBattleObjectLayoutList(root) {
  root.dataset.layoutLoadState = "loading";
  const [prepared, ownerDocument] = await Promise.all([
    prepareModuleComponent(
      BATTLE_OBJECT_LAYOUT_MODULE_ID,
      "reference",
      {label: "效果对象共享布局"},
    ),
    db.getResourceDocument(BATTLE_OBJECT_LAYOUT_MODULE_ID, null),
  ]);
  if (!root.isConnected) return;
  const candidates = Array.isArray(prepared.entries) ? prepared.entries : [];
  const entries = Array.isArray(ownerDocument?.records) ? ownerDocument.records : [];
  if (prepared.error || !candidates.length || !entries.length) {
    throw new Error(prepared.error || "battle-object-layout 的发布候选为空");
  }
  if (candidates.length !== entries.length) {
    throw new Error("battle-object-layout owner 正文与引用候选数量不一致");
  }
  const expectedCount = Number(root.dataset.expectedCount);
  if (Number.isInteger(expectedCount) && expectedCount !== entries.length) {
    throw new Error(
      `battle-object-layout owner 候选数量不一致：${entries.length}/${expectedCount}`,
    );
  }
  const initialHandle = String(entries[0].handle || "");
  root.dataset.publishedCount = String(entries.length);
  root.innerHTML = `${renderModuleComponent(
    BATTLE_OBJECT_LAYOUT_MODULE_ID,
    "reference",
    {...prepared, value: initialHandle, label: "效果对象共享布局"},
  )}<div class="wide-card weapon-effect-note" data-battle-object-layout-selection>${
    battleObjectLayoutSelectionMarkup(
      entries[0], state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {},
    )
  }</div>`;
  await hydrateModuleComponents(root);
  if (!root.isConnected) return;

  const picker = root.querySelector("[data-module-reference-picker]");
  const options = [...root.querySelectorAll("[data-reference-picker-option]")];
  const selection = root.querySelector("[data-battle-object-layout-selection]");
  if (!picker || !selection || options.length !== entries.length) {
    throw new Error("battle-object-layout owner 选择器未完整水合");
  }
  root.addEventListener("module-reference-change", event => {
    const entry = entries.find(candidate =>
      String(candidate.handle) === String(event.detail?.value)
    );
    if (!entry) return;
    selection.innerHTML = battleObjectLayoutSelectionMarkup(
      entry,
      state.project?.visuals?.weapon_effect_catalog?.asset_catalog_data || {},
    );
  });
  root.dataset.layoutLoadState = "ready";
}

function battleFigureUid(item) {
  return item.figure_kind === "monster"
    ? byteUid("monster-figure", item.id)
    : item.resource_id;
}

function monsterPaletteMarkup(item) {
  return (item.palettes || []).map((palette, paletteIndex) =>
    `<div class="monster-palette-line"><small>P${paletteIndex}</small>${
      paletteSwatches(palette, {className: "palette-swatches is-wide"})
    }<span>${(item.palette_ids_hex || [])[paletteIndex] || ""}</span></div>`).join("");
}

function attackScriptCommandSummary(script) {
  const commands = (script?.commands || []).filter(command => !command.marker);
  if (!commands.length) return "";
  const names = commands.slice(0, 4).map(command => command.name || command.opcode_hex);
  return `${names.join(" → ")}${commands.length > names.length ? " …" : ""}`;
}

function battleObjectLayoutPreview(item) {
  if (item.available === false) {
    return `<span class="module-reference-data-preview"
      data-battle-object-layout-preview="missing">
      <b>未使用的动作槽</b><small>发布记录明确标为指针空洞</small>
    </span>`;
  }
  const columns = Number(item.columns);
  const rows = Number(item.rows);
  const width = Number(item.width);
  const height = Number(item.height);
  const knownShape = [columns, rows, width, height].every(Number.isFinite);
  return `<span class="module-reference-data-preview"
    data-battle-object-layout-preview="${knownShape ? "published" : "missing"}"
    data-layout-columns="${knownShape ? columns : "missing"}"
    data-layout-rows="${knownShape ? rows : "missing"}">
    <b>${knownShape ? `${columns}×${rows} 布局` : ""}</b>
    <small>${knownShape ? `${width}×${height}px` : ""}</small>
  </span>`;
}

const BATTLE_TEST_ENTRY_FIELDS = Object.freeze([
  "enabled",
  "repeatable",
  "scene_id",
  "x",
  "y",
  "state_flag",
  "encounter_id",
  "intro_text_record_id",
  "completed_text_record_id",
]);

const BATTLE_TEST_ENTRY_RESET_KEY = "entry";

function battleTestFormationResetKey(formationId) {
  const id = Number(formationId);
  if (!Number.isInteger(id)) throw new TypeError("formation id must be an integer");
  return `formation:${id}`;
}

function battleTestFormation(document_, formationId) {
  if (!Array.isArray(document_?.formations)) {
    throw new Error("battle-test-point 编队文档不完整");
  }
  const id = Number(formationId);
  const formation = document_.formations.find(row => Number(row.id) === id);
  if (!formation || !Array.isArray(formation.slots) || formation.slots.length !== 4) {
    throw new Error(`battle-test-point 缺少编队 ${formationId}`);
  }
  return formation;
}

function battleTestFormationDraft(formation) {
  return [...formation.slots].sort((a, b) => a.slot - b.slot).map(slot => ({
    monster_id: Number(slot.monster_id),
    count: Number(slot.count),
  }));
}

const BATTLE_TEST_EMPTY_FORMATION_SLOT = "__empty__";

function renderBattleTestFormationControls(formationDraft, monsters = [], formationId) {
  return `<div class="table-wrap"><table class="battle-formation-slots">
    <thead><tr><th>槽</th><th>怪物</th><th>数量</th><th class="reset-column" aria-label="恢复原值" title="恢复原值"></th></tr></thead>
    <tbody>${formationDraft.map((slot, index) => {
    const active = Number(slot.count) !== 0;
    const handle = `encounter-formation:${Number(formationId).toString(16).toUpperCase().padStart(2, "0")}:slot:${index}`;
    const controlMarkup = `<input type="hidden" data-battle-formation-slot="${index}" data-battle-formation-field="monster_id" data-battle-empty-monster-id="${Number(slot.monster_id)}" value="${active ? Number(slot.monster_id) : BATTLE_TEST_EMPTY_FORMATION_SLOT}">`;
    return `<tr><td>${index + 1}</td><td class="field-object-linked-reference">${renderModuleComponent("monster-profile", "reference", {
      entries: monsters, value: active ? slot.monster_id : BATTLE_TEST_EMPTY_FORMATION_SLOT,
      emptyValue: BATTLE_TEST_EMPTY_FORMATION_SLOT, label: "怪物", controlMarkup,
    })}</td><td><input type="number" min="0" max="9" aria-label="槽 ${index + 1} 数量" data-battle-formation-slot="${index}" data-battle-formation-field="count" value="${slot.count}" ${active ? "" : "disabled"}></td><td>${resetToOriginalButton(handle, {title: "重置这一槽怪物与数量；其他槽和测试入口保留"})}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

/** 编队 label 是提取期快照；编辑器必须按当前槽和当前怪物名现算。 */
function battleTestFormationDisplayLabel(formation, monsters = []) {
  const names = new Map(monsters.map(monster => [
    Number(monster.id),
    monster.name || `怪物 ${hex(monster.id, 2)}`,
  ]));
  const groups = (formation?.slots || []).flatMap(slot => {
    const count = Number(slot.count);
    if (!Number.isInteger(count) || count < 1) return [];
    const monsterId = Number(slot.monster_id);
    return [`${names.get(monsterId) || `怪物 ${hex(monsterId, 2)}`} ×${count}`];
  });
  return groups.join(" / ") || "无有效怪物";
}

/** `selected_formation` is a derived copy, never an independent authority. */
function rebuildBattleSelectedFormation(document_) {
  const formation = battleTestFormation(document_, document_.encounter_id);
  if (Object.getOwnPropertyDescriptor(document_, "selected_formation")?.get) {
    Object.defineProperty(document_, "selected_formation", {enumerable: true, configurable: true,
      get: () => battleTestFormation(document_, document_.encounter_id)});
  } else document_.selected_formation = copyEditorDraft(formation);
  return document_.selected_formation;
}

function battleTestDraftFromDocument(configuration) {
  const selected = battleTestFormation(configuration, configuration.encounter_id);
  return {
    table_sha256: configuration.writeback_state?.current_sha256 || "",
    enabled: Boolean(configuration.enabled),
    repeatable: configuration.repeatable !== false,
    scene_id: Number(configuration.scene_id || 0),
    x: Number(configuration.x || 0),
    y: Number(configuration.y || 0),
    state_flag: Number(configuration.state_flag || 0),
    encounter_id: Number(configuration.encounter_id || 0),
    intro_text_record_id: Number(configuration.intro_text_record_id || 0),
    completed_text_record_id: Number(configuration.completed_text_record_id || 0),
    formation: battleTestFormationDraft(selected),
  };
}


function selectedEntryFields(value) {
  return Object.fromEntries(BATTLE_TEST_ENTRY_FIELDS.map(field => [
    field,
    value?.[field],
  ]));
}

function battleTestEntryLocalDirty(draft, baseline) {
  return JSON.stringify(selectedEntryFields(draft)) !==
    JSON.stringify(selectedEntryFields(baseline));
}

function battleTestFormationLocalDirty(draft, document_) {
  if (!draft) return false;
  const saved = battleTestFormation(document_, draft.encounter_id);
  return JSON.stringify(draft.formation) !==
    JSON.stringify(battleTestFormationDraft(saved));
}

/** Fail closed before an entry reset would hide an invalid local formation edit. */
function battleTestEntryResetBlockedReason(draft, document_, baseDocument) {
  if (!draft) return "战斗测试草稿不可用，请刷新页面";
  const targetFormationId = Number(baseDocument?.encounter_id);
  if (!Number.isInteger(targetFormationId)) {
    return "battle-test-point 导入 original 的 encounter_id 无效";
  }
  if (targetFormationId === Number(draft.encounter_id)) return null;
  if (!battleTestFormationLocalDirty(draft, document_)) return null;
  return "入口 Original 会切换当前编队；请先修正该编队，或先用“当前编队 Reset / Original”处理当前编辑";
}

/** Restore only entry fields in the local draft; keep the active formation draft. */
function battleTestDraftAfterEntryReset(draft, document_) {
  const next = copyEditorDraft(draft);
  const previousFormationId = Number(next.encounter_id);
  for (const field of BATTLE_TEST_ENTRY_FIELDS) next[field] = document_[field];
  if (Number(next.encounter_id) !== previousFormationId) {
    next.formation = battleTestFormationDraft(
      battleTestFormation(document_, next.encounter_id),
    );
  }
  return next;
}

/** Restore only the selected formation draft; entry-field drafts remain intact. */
function battleTestDraftAfterFormationReset(draft, document_, formationId) {
  const next = copyEditorDraft(draft);
  if (Number(next.encounter_id) !== Number(formationId)) return next;
  next.formation = battleTestFormationDraft(
    battleTestFormation(document_, formationId),
  );
  return next;
}

/** Merge persisted Original state with the current local edit for both controls. */
function updateBattleTestOriginalControls(root, {
  persistedStates = new Map(),
  localStates = new Map(),
  busy = false,
} = {}) {
  if (!root?.querySelectorAll) return;
  for (const control of root.querySelectorAll("[data-battle-original-control]")) {
    const key = control.dataset.battleOriginalControl;
    const persistedDirty = persistedStates instanceof Map
      ? persistedStates.get(key) : persistedStates[key];
    const localDirty = (localStates instanceof Map
      ? localStates.get(key) : localStates[key]) === true;
    const known = typeof persistedDirty === "boolean";
    const dirty = localDirty || persistedDirty === true;
    control.classList.toggle("is-persisted-dirty", persistedDirty === true);
    control.classList.toggle("is-local-dirty", localDirty);
    const button = control.querySelector("[data-reset-to-original]");
    if (!button) continue;
    button.dataset.originalDirty = String(dirty);
    button.classList.toggle("dirty", dirty);
    button.disabled = busy || !dirty || (!known && !localDirty);
    button.title = persistedDirty
      ? "恢复原值：只恢复这一项"
      : localDirty
        ? "恢复原值：保留另一项的编辑"
        : known
          ? "恢复原值：当前值与原值一致"
          : "恢复原值：正在读取原值状态…";
  }
}

function ensureBattleTestView(configuration) {
  if (state.battleTestView) return;
  state.battleTestView = battleTestDraftFromDocument(configuration);
  state.battleTestPersistedView = copyEditorDraft(state.battleTestView);
}

function battleTestViewPending() {
  return Boolean(state.battleTestView && state.battleTestPersistedView) &&
    JSON.stringify(state.battleTestView) !== JSON.stringify(state.battleTestPersistedView);
}

function battleTestDraftError() {
  const draft = state.battleTestView;
  if (!draft) return "战斗测试记录不可用，请刷新页面";
  const ranges = {scene_id: 0xEF, x: 0xFF, y: 0xFF, state_flag: 0xFF,
    encounter_id: 0x38, intro_text_record_id: 0xFF, completed_text_record_id: 0xFF};
  for (const [field, maximum] of Object.entries(ranges)) {
    if (!Number.isInteger(draft[field]) || draft[field] < 0 || draft[field] > maximum) {
      return `${field} 必须是 0–${maximum} 的整数`;
    }
  }
  return battleTestFormationDraftError(draft.formation);
}

function battleTestFormationDraftError(formationDraft) {
  if (!Array.isArray(formationDraft) || formationDraft.length !== 4) {
    return "编队必须正好有四个槽";
  }
  let total = 0;
  let emptySeen = false;
  for (const [index, slot] of formationDraft.entries()) {
    if (!Number.isInteger(slot.monster_id) || slot.monster_id < 0 || slot.monster_id > 130) return `槽 ${index + 1} 的怪物 ID 无效`;
    if (!Number.isInteger(slot.count) || slot.count < 0 || slot.count > 9) return `槽 ${index + 1} 的数量必须是 0–9`;
    if (!slot.count) emptySeen = true;
    else if (emptySeen) return "有效编队槽必须连续排列在空槽之前";
    total += slot.count;
  }
  if (total < 1 || total > 9) return "编队怪物总数必须是 1–9";
  return null;
}

function renderBattleTestFormationInlineEditor(formationId) {
  const configuration = state.project.game_data?.battle_test;
  const monsters = state.project.game_data?.monsters?.records || [];
  const formation = battleTestFormation(configuration, formationId);
  const draft = battleTestFormationDraft(formation);
  const total = draft.reduce((sum, slot) => sum + Number(slot.count || 0), 0);
  const error = battleTestFormationDraftError(draft);
  return `<section class="scene-battle-trigger-action scene-battle-inline-editor"
      data-scene-battle-formation-editor data-formation-id="${Number(formationId)}">
    <div class="section-line"><h2>${handleMarkup(`encounter-formation:${Number(formationId).toString(16).toUpperCase().padStart(2, '0')}`)}</h2>
      <span class="scene-battle-formation-actions">
        <b data-scene-battle-formation-total>${total}</b> / 9 MONSTER SLOTS
        ${resetToOriginalButton("scene-formation", {title: "重置当前编队；其他编队和测试入口保留"})}
      </span>
    </div>
    <p class="scene-battle-formation-alert${error ? " invalid" : ""}"
      data-scene-battle-formation-status ${error ? "" : "hidden"}>${esc(error ? `无法自动保存：${error}` : "")}</p>
    ${renderBattleTestFormationControls(draft, monsters, formationId)}
  </section>`;
}

function battleTestEditorStatus() {
  if (state.battleTestBuilding) return "正在生成新的 ROM…";
  if (state.battleTestMessage) return state.battleTestMessage;
  const error = battleTestDraftError();
  if (error) return `无法保存：${error}`;
  return "";
}

/**
 * 战斗测试入口。
 *
 * **这里不再列怪物。** 「怪物攻击与特效关联」那张 131 行的表逐怪物一行，和怪物表
 * 是同一批对象；两张表列同一批东西，改哪一张都得记得另一张。它已经并回怪物表
 * （出现编队一列）与怪物记录页（攻击运行时一栏）。
 */
function renderBattleProfiles() {
  const configuration = state.project.game_data?.battle_test || {};
  const monsters = state.project.game_data?.monsters?.records || [];
  ensureBattleTestView(configuration);
  const draft = state.battleTestView;
  const scenes = state.project.scenes?.editable_scenes || [];
  const formations = configuration.formations || [];
  const error = battleTestDraftError();
  const busy = state.battleTestBuilding;
  const entryLocalDirty = battleTestEntryLocalDirty(
    draft,
    state.battleTestPersistedView,
  );
  const battleMode = battleModeForPendingEventFlag(draft.state_flag, battleFirstMonsterId(draft.formation));
  const originalControl = (key, label, title, localDirty) =>
    `<span class="original-reset-control${localDirty ? " is-local-dirty" : ""}"
      data-battle-original-control="${esc(key)}">
      ${resetToOriginalButton(key, {
        title,
        disabled: busy || !localDirty,
        dirty: localDirty ? true : null,
      })}
    </span>`;
  const entryMarkup = `<div data-in-page-tabs-show="entry">
    <p class="battle-test-entry-summary" data-battle-simulator-entry></p>
    <p class="battle-test-entry-summary" data-battle-test-encounter-summary></p>
    <details data-battle-test-entry-details open><summary>测试点入口与文字</summary>
    <div class="section-line"><h2>入口</h2><span>
      <button class="resource-inline-link" type="button"
        data-resource-query="battle-test-point">battle-test-point</button>
      · 场景 $98 图块行为 $7C · 编队 <span data-battle-formation-reference>${byteUid('encounter-formation', draft.encounter_id)}</span></span></div>
      <div class="data-editor-toolbar">
        <p id="battle-test-save-state" class="${error ? "invalid" : ""}" ${battleTestEditorStatus() ? "" : "hidden"}>${esc(battleTestEditorStatus())}</p>
        ${originalControl(
          BATTLE_TEST_ENTRY_RESET_KEY,
          "入口 Reset / Original",
          "只恢复测试入口字段；持久化编队不变。若切换会隐藏当前编队编辑，将拒绝操作",
          entryLocalDirty,
        )}
        ${buildLogButton()}
      </div>
      <div class="character-number-grid">
        <label title="六点专用调查表第 $04 行"><small>启用</small><input type="checkbox" data-battle-test-field="enabled" ${draft.enabled ? "checked" : ""}></label>
        <label title="忽略完成位检查，仍在胜利后提交完成位"><small>重复战斗</small><input type="checkbox" data-battle-test-field="repeatable" ${draft.repeatable ? "checked" : ""}></label>
        ${scenePositionPickerMarkup({entries: scenes, sceneId: draft.scene_id,
          x: draft.x, y: draft.y, label: "目标场景", maxSceneId: 0xEF})}
        <label><small>完成位 ID</small><input type="number" min="0" max="255" data-battle-test-field="state_flag" value="${draft.state_flag}"></label>
        <div class="battle-test-text-field" data-battle-mode-readout title="由完成位决定">${battleMode?.label || "—"} · BGM ${battleMode ? esc(audioCommandLabel(battleMode.musicCommand)) : "—"} · 死亡效果 ${battleMode ? hex(battleMode.deathEffect, 2) : "—"}</div>
        <label><small>遭遇编队</small><select data-battle-test-field="encounter_id">${formations.map(formation => `<option value="${formation.id}" ${Number(formation.id) === draft.encounter_id ? "selected" : ""}>${byteUid('encounter-formation', formation.id)} · ${esc(battleTestFormationDisplayLabel(formation, monsters))}</option>`).join("")}</select></label>
        <button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${Number(draft.encounter_id).toString(16).toUpperCase().padStart(2, '0')}">编辑编队 ↗</button>
        <div class="battle-test-text-field"><small>战前文字</small><span data-battle-text-picker="intro_text_record_id"></span></div>
        <div class="battle-test-text-field"><small>完成文字</small><span data-battle-text-picker="completed_text_record_id"></span></div>
      </div>
    </details></div>`;
  return `<section class="battle-visual-panel" data-battle-panel="profiles">${battleSimulationMarkup({actionPreview: true, simulatorLayout: true, workbench: {
    namespace: "battle-test",
    className: "battle-test-workbench",
    balancedPanels: true,
    attributes: {'data-battle-scene-control-dock': ''},
    treeScroll: 'body', inspectorScroll: 'body',
    bottomScroll: 'body',
    treeTitle: "敌方",
    toolbarMarkup: `<div class="battle-test-toolbar"><label>阵容 <select data-battle-simulator-preset><option value="custom">自定义</option><option value="redwolf">戈麦斯红狼</option></select></label>
      <label>敌方编队 <select aria-label="敌方编队" data-battle-simulator-formation>${formations.map(formation => `<option value="${formation.id}">${byteUid('encounter-formation', formation.id)} · ${esc(battleTestFormationDisplayLabel(formation, monsters))}</option>`).join('')}</select></label>
      <span data-battle-simulator-source></span>
      <nav class="page-global-info" aria-label="关联界面"><a class="editor-inline-link" href="?view=interfaceui&amp;interface=battle-messages">文本与提示 ↗</a>
      <a class="editor-inline-link" href="?view=interfaceui&amp;interface=battle-command-target">命令与目标 ↗</a>
      <a class="editor-inline-link" href="?view=interfaceui&amp;interface=battle-results">结果界面 ↗</a></nav></div>`,
    treeMarkup: `<form id="battle-test-editor">${inPageTabs({
      id: 'battle-test-enemy', label: '敌方配置', active: state.battleTestEnemyTab,
      tabs: [{id: 'entry', label: '入口与文字'}, {id: 'formation', label: '编队与实例'}],
      content: `${entryMarkup}<div data-in-page-tabs-show="formation"
        ><div data-battle-test-formation-controls></div><div data-battle-test-enemy-controls></div></div>`,
    })}</form>`,
    stageToolbarMarkup: `<div data-battle-simulator-facts></div>
      <p data-battle-test-preview-status aria-live="polite"></p>
      <div data-battle-test-preview-controls></div><div data-battle-test-composer-status></div>`,
    inspectorTitle: "友方",
    inspectorMarkup: `<section><h3>我方阵容</h3>
      <div class="battle-test-party-toolbar"><button type="button" class="button" data-battle-simulator-add-companion>加入红狼</button>
      <span data-battle-simulator-companion-status aria-live="polite"></span></div><div data-battle-test-party-tabs></div></section>`,
    bottomMarkup: inPageTabs({id: 'battle-simulator-mode', label: '战斗模式',
      tabs: BATTLE_SIMULATOR_MODES, active: battleSimulatorMode(state.battleSimulatorRequest),
      content: `<span data-battle-simulator-status></span>
      <section data-in-page-tabs-show="full-demo" data-battle-simulator-mode-show="full-demo" hidden>
        <div data-battle-test-full-demo-playback></div><div data-battle-test-full-demo-details></div></section>
      <section data-in-page-tabs-show="attack-test" data-battle-simulator-mode-show="attack-test">
        <div data-battle-test-attack-test-playback></div>
        <section class="battle-test-commands" data-battle-simulator-command-section><h3>指令</h3>
        <div data-battle-simulator-commands></div></section>
        <button class="button" type="button" data-battle-simulator-execute>执行回合</button>
        <div data-battle-test-attack-test-details></div>
        <h3>单次动作</h3><div data-battle-test-action-controls></div>
        <div data-battle-test-enemy-action-controls></div>
        <div data-battle-test-single-action-playback hidden></div></section>`,
    }),
  }})}</section>`;
}

function renderBattle() {
  if (state.view === "battle-test") {
    return renderBattleProfiles();
  }
  const visuals = state.project.visuals || {};
  const weaponCatalog = visuals.weapon_effect_catalog || {};
  const effectAssets = weaponCatalog.asset_catalog_data || {};
  const primaryScripts = effectAssets.scripts?.primary || [];
  const auxiliaryScripts = effectAssets.scripts?.auxiliary || [];
  const effectStreams = effectAssets.effect_streams || [];
  const cleanAnimations = effectAssets.clean_animations || {};
  const allCleanClips = cleanAnimations.catalog || cleanAnimations.clips || [];
  const battleActions = effectAssets.battle_objects?.actions || [];
  const uniqueBattleObjectLayouts = Number(
    effectAssets.battle_objects?.unique_layout_records,
  );
  const enemyFigures = visuals.monsters?.enemies || [];
  visuals.monsters?.graphics || [];
  const battleContext = (visuals.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94);
  const battleObjects = battleContext?.battle_objects || [];
  new Map(
    (state.project.game_data?.monsters?.records || [])
      .map(item => [Number(item.id), item])
  );
  const identifiedPartyFigures = battleObjects.filter(item => item.semantic_role);
  const anonymousBattleObjects = battleObjects.filter(item => !item.semantic_role);
  const figures = [
    ...identifiedPartyFigures.map(item => ({...item, figure_kind: "battle-object"})),
    ...enemyFigures.map(item => ({...item, figure_kind: "monster"})),
    ...anonymousBattleObjects.map(item => ({...item, figure_kind: "battle-object"})),
  ];
  if (!figures.length && !allCleanClips.length) {
    return ``;
  }
  visuals.summary || {};
  const weaponSummary = effectAssets.summary || {};
  visuals.entrypoints || {};
  const q = state.query.trim().toLowerCase();
  // The visual script namespace is shared.  Caller state ($70E6 bit 0 and
  // $0314 bit 0) selects direction/mirroring; it does not select a second set
  // of enemy assets.
  const cleanClips = allCleanClips;
  const shownCleanClips = cleanClips.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const shownAuxiliaryScripts = auxiliaryScripts.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const shownBattleActions = battleActions.filter(item => !q ||
    JSON.stringify(item).toLowerCase().includes(q)
  );
  const attackEquipment = (state.project.game_data?.items?.records || [])
    .filter(item => item.attack_visual?.visual_code != null);
  const humanAttackEquipment = attackEquipment.filter(item =>
    String(item.category?.id || "").startsWith("human-")
  );
  const tankAttackEquipment = attackEquipment.filter(item =>
    String(item.category?.id || "").startsWith("tank-")
  );
  const attackColumns = [
    // **只留资源 ID。** 「游戏索引 ID」就是同一个编号的另一种写法，
    // 「名称」在 ROM 里根本不存在——游戏没有给特效命名这回事，
    // 那一列显示的是工具自己编的名字。分段保存工具条跟着资源 ID 走。
    {key: "resource_id", label: "资源 ID", width: 180,
      cell: item => {
        const uid = attackVisualUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    ...ATTACK_PREVIEW_SEGMENTS.map(([segment, label]) => ({
      key: `preview_${segment}`,
      label,
      width: 180,
      // 标签用资源 ID，不用 `effectName` 编出来的名字——ROM 里没有特效名。
      cell: item => renderAttackVisualSegmentCell(
        item,
        attackVisualUid(item),
        segment,
        label,
      ),
    })),
    // 重置单独成列，和装备表的「恢复」、怪物表的那一列一致。
    {key: "reset", label: "", title: "恢复原值", width: 36, reset: true,
      cell: item => renderAttackVisualSegmentEditor(item, attackVisualUid(item))},
    {key: "frames", label: "帧数", mono: true, align: "right", fit: true,
      fitValue: item => item.frame_count,
      cell: item => item.frame_count == null ? "—" : item.frame_count},
    {key: "phases", label: "阶段", grow: true,
      cell: item => (item.phases || []).map(esc).join(" / ") || "—"},
    {key: "status", label: "状态",
      cell: item => esc(item.preview_status || item.decode_status || "—")},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(attackVisualUid(item))},
  ];
  const streamColumns = [
    {key: "resource_id", label: "资源 ID", width: 150,
      cell: item => {
        const uid = effectStreamUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID",
      cell: item => `<b>${esc(item.effect_code_hex)}</b>`},
    {key: "name", label: "名称", width: 260,
      cell: item => `${esc(item.label || `效果对象流 ${item.effect_code_hex}`)}<small>${
        esc(item.storage_kind || "")
      }</small>`},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(effectStreamUid(item))},
    {key: "action", label: "ACTION", mono: true,
      cell: item => esc(item.action_code_hex || "运行时")},
    {key: "bytes", label: "原始字节", mono: true, width: 280,
      cell: item => esc(item.bytes_hex || "—")},
    {key: "asset", label: "资产", width: 260,
      cell: item => item.path
        ? `<code title="二进制只在构建阶段读取">${esc(item.path)}</code>`
        : `<span>RAM 构造</span>`},
  ];
  const scriptRows = [
    ...primaryScripts.map(item => ({space: "primary", item})),
    ...auxiliaryScripts.map(item => ({space: "auxiliary", item})),
  ];
  const scriptColumns = [
    {key: "resource_id", label: "资源 ID", width: 250,
      cell: row => {
        const uid = attackScriptUid(row.space, row.item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "namespace", label: "命名空间", mono: true,
      cell: row => row.space.toUpperCase()},
    {key: "game_id", label: "游戏索引 ID", mono: true,
      cell: row => esc(row.item.id_hex)},
    {key: "name", label: "名称", width: 210,
      cell: row => `<b>${row.space === "primary" ? "主攻击脚本" : "辅助攻击脚本"} ${
        esc(row.item.id_hex)
      }</b><small>${esc(row.item.decode_status || "decoded")}</small>`},
    {key: "commands", label: "命令", mono: true,
      cell: row => row.item.command_count},
    {key: "references", label: "底层资产引用",
      cell: row => resourceForwardReferenceCell(attackScriptUid(row.space, row.item))},
    {key: "asset", label: "资产",
      cell: row => `<a href="${visualUrl(
        `weapon-effects/${row.item.path.replace(/\.bin$/, ".json")}`,
      )}" target="_blank">JSON ↗</a>`},
  ];
  const auxiliaryColumns = [
    {key: "resource_id", label: "资源 ID", width: 250,
      cell: item => {
        const uid = attackScriptUid("auxiliary", item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID", mono: true, width: 110,
      cell: item => esc(item.id_hex)},
    {key: "commands", label: "命令流", width: 420,
      cell: item => `<b>${esc(item.command_count ?? (item.commands || []).length)} 条</b><small>${
        esc(attackScriptCommandSummary(item))
      }</small>`},
    {key: "status", label: "状态", width: 110,
      cell: item => esc(item.decode_status || "decoded")},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(attackScriptUid("auxiliary", item))},
  ];
  const battleActionColumns = [
    {key: "resource_id", label: "资源 ID",
      cell: item => {
        const uid = battleActionUid(item);
        return `<button class="resource-uid" type="button"
          data-resource-query="${uid}">${uid}</button>`;
      }},
    {key: "game_id", label: "游戏索引 ID", mono: true,
      cell: item => esc(item.id_hex)},
    {key: "status", label: "状态",
      cell: item => item.available === false ? "指针空洞" : "可用"},
    {key: "layout", label: "布局预览", width: 260,
      cell: battleObjectLayoutPreview},
    {key: "references", label: "底层资产引用",
      cell: item => resourceForwardReferenceCell(battleActionUid(item))},
  ];
  return `
    <section class="battle-visual-panel" data-battle-panel="attacks">
    ${datasetFacts([
      ["可渲染 / 全部特效槽", `<b>${weaponSummary.visual_catalog_rendered || 0}/${weaponSummary.visual_catalog_slots || 0}</b>`],
      ["主 + 辅助脚本", `<b>${weaponSummary.primary_scripts || 0}+${weaponSummary.auxiliary_scripts || 0}</b>`],
      ["效果对象流", `<b>${effectStreams.length}</b>`],
    ])}
    <div class="section-line"><h2>主脚本列表</h2><span>${shownCleanClips.length} / ${primaryScripts.length} 条发布记录</span></div>
    ${attackEffectListMarkup({
      kind: "primary",
      className: "clean-effect-table",
      columns: attackColumns,
      rows: shownCleanClips,
      rowId: attackVisualUid,
      recordRoute: item => `attack-effects/${attackVisualUid(item)}`,
      total: allCleanClips.length,
      publishedCount: primaryScripts.length,
      placeholder: "资源 ID、名称、阶段或状态",
    })}
    <details class="wide-card battle-action-atlas">
      <summary>特效脚本使用的动作与 CHR 组合（${cleanAnimations.action_previews?.used_action_context_count || 0} 组）</summary>
      <div class="battle-action-atlas-grid">${(cleanAnimations.action_previews?.context_atlases || [])
        .flatMap(context => (context.used_actions || []).map(action => `<figure>
          ${battleActionCanvas({
            effectBank: context.chr_effect_bank,
            action,
            label: `ACTION ${hex(action, 2)}`,
          })}
          <figcaption class="mono">${hex(action, 2)}</figcaption>
        </figure>`)).join("")}</div>
      <a href="${visualUrl("weapon-effects/assets/objects/actions.json")}" target="_blank" title="254 项入口、范围与 tile 布局清单" aria-label="254 项入口、范围与 tile 布局清单">↗</a>
    </details>
    <div class="section-line"><h2>辅助脚本列表</h2><span>${shownAuxiliaryScripts.length} / ${auxiliaryScripts.length} 条发布记录</span></div>
    ${attackEffectListMarkup({
      kind: "auxiliary",
      className: "attack-auxiliary-table",
      columns: auxiliaryColumns,
      rows: shownAuxiliaryScripts,
      rowId: item => attackScriptRecordId("auxiliary", item),
      recordRoute: item => `attack-effects/${attackScriptRecordId("auxiliary", item)}`,
      total: auxiliaryScripts.length,
      publishedCount: auxiliaryScripts.length,
      placeholder: "资源 ID、命令名或状态",
    })}
    <div class="section-line"><h2>效果对象列表 · 动作入口</h2><span>${shownBattleActions.length} / ${battleActions.length} 个动作 · ${Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "?"} 个唯一布局</span></div>
    ${attackEffectListMarkup({
      kind: "objects",
      className: "weapon-action-table",
      columns: battleActionColumns,
      rows: shownBattleActions,
      rowId: battleActionUid,
      recordRoute: item => `attack-effects/${battleActionUid(item)}`,
      total: battleActions.length,
      publishedCount: battleActions.length,
      placeholder: "资源 ID、状态或布局尺寸",
      extraAttributes: `data-published-layout-count="${
        Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "missing"
      }"`,
    })}
    <div class="section-line"><h2>效果对象列表 · 共享布局</h2><span>${
      Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "?"
    } 条 owner 发布记录</span></div>
    <${BATTLE_OBJECT_LAYOUT_LIST_ELEMENT} style="display:block"
      data-attack-effect-list="layouts" data-expected-count="${
        Number.isInteger(uniqueBattleObjectLayouts) ? uniqueBattleObjectLayouts : "missing"
      }">
      <p class="muted" data-battle-object-layout-list-loading>正在读取 battle-object-layout owner 候选…</p>
    </${BATTLE_OBJECT_LAYOUT_LIST_ELEMENT}>
    <div class="section-line"><h2>武器使用哪条视效</h2><span>${attackEquipment.length} 件攻击装备</span></div>
    <div class="wide-card weapon-effect-note clean-effect-note"
      data-attack-effect-composition>
      <div class="record-resource-links">
        <a class="button ghost" href="?view=equipment&amp;equipmentDomain=human"
          data-attack-effect-composition-link="human">编辑人类武器（${humanAttackEquipment.length}）</a>
        <a class="button ghost" href="?view=equipment&amp;equipmentDomain=tank"
          data-attack-effect-composition-link="tank">编辑战车武器（${tankAttackEquipment.length}）</a>
      </div>
    </div>
    <div class="section-line"><h2>特效对象数据</h2><span>${effectStreams.length} 个核心特效码</span></div>
    <div class="weapon-stream-table">${dataTable({
      columns: streamColumns,
      rows: effectStreams,
      rowId: effectStreamUid,
      recordRoute: item => `attack-effects/${effectStreamUid(item)}`,
    })}</div>
    <div class="section-line"><h2>攻击特效脚本</h2><span>${primaryScripts.length} 个主脚本 · ${auxiliaryScripts.length} 个辅助脚本</span></div>
    <div class="weapon-script-table">${dataTable({
      columns: scriptColumns,
      rows: scriptRows,
      rowId: row => attackScriptRecordId(row.space, row.item),
      recordRoute: row => `attack-effects/${attackScriptRecordId(row.space, row.item)}`,
    })}</div>
    </section>
`;
}

function battleRecordReferencePanel(uid) {
  return panel("引用关系", fields([
    ["被引用数", resourceForwardReferenceCell(uid)],
  ]));
}

function resourceButtons(uids, labels = []) {
  const resources = (uids || []).filter(Boolean);
  if (!resources.length) return "—";
  return `<div class="record-resource-links">${resources.map((uid, index) =>
    `<button class="resource-inline-link" type="button"
      data-resource-target="${esc(uid)}">${esc(labels[index] || uid)}</button>`
  ).join("")}</div>`;
}

function byteResourceButtons(prefix, values) {
  return resourceButtons(
    (values || []).map(value => byteUid(prefix, value)),
    (values || []).map(value => hex(value, 2)),
  );
}

function attackEffectCompositionRoots(effectAssets, predicate) {
  const visualCodes = (effectAssets.dependency_closures || [])
    .filter(predicate)
    .map(closure => closure.visual_code)
    .filter(value => value != null)
    .map(Number)
    .filter(Number.isFinite);
  return [...new Set(visualCodes)]
    .sort((left, right) => left - right)
    .map(value => byteUid("attack-visual", value));
}

function attackEffectUsageMarkup(kind, item, effectAssets) {
  const primaryHandles = attackEffectCompositionRoots(effectAssets, closure => {
    if (kind === "auxiliary") {
      return (closure.scripts || []).some(script =>
        script.namespace === "aux" && Number(script.id) === Number(item.id)
      );
    }
    return (closure.object_actions || []).some(action =>
      Number(action) === Number(item.id)
    );
  });
  return `<div data-attack-effect-usage="${esc(kind)}"
    data-primary-count="${primaryHandles.length}">${fields([
      ["主脚本组合", resourceButtons(
        primaryHandles,
        primaryHandles.map(handle => handle.slice(handle.lastIndexOf(":") + 1)),
      )],
      ["组合数", `${primaryHandles.length} 条`],
    ])}</div>`;
}

function attackScriptOperandLabel(operand) {
  return operand.name === "sound_id" ? audioCommandLabel(operand.value)
    : operand.value_hex ?? operand.value ?? "—";
}

function renderAttackScriptCommands(script) {
  const columns = [
    {key: "opcode", label: "操作码", mono: true,
      cell: command => esc(command.opcode_hex || "—")},
    {key: "name", label: "命令",
      cell: command => esc(command.name || "—")},
    {key: "bytes", label: "原始字节", mono: true,
      cell: command => esc(command.bytes_hex || "—")},
    {key: "operands", label: "参数", mono: true,
      cell: command => (command.operands || []).map(operand =>
        `${esc(operand.name || "value")}=${esc(attackScriptOperandLabel(operand))}`
      ).join(" / ") || "—"},
  ];
  return dataTable({
    columns,
    rows: script.commands || [],
    rowId: command => command.offset,
    empty: "",
  });
}

function attackScriptFirstCommandLabel(script) {
  const command = (script?.commands || []).find(item => !item.marker);
  if (!command) return "";
  const operands = (command.operands || []).map(operand =>
    `${operand.name || "value"}=${attackScriptOperandLabel(operand)}`
  );
  return `${command.name || command.opcode_hex || "未知命令"}${
    operands.length ? ` · ${operands.join(" / ")}` : ""
  }`;
}

function attackScriptPreviewMarkup(space, item) {
  const uid = attackScriptUid(space, item);
  return `<div data-attack-effect-signature="${esc(space)}"
    data-script-handle="${esc(uid)}">
    <p class="muted"><b>${esc(uid)}</b> · ${esc(
      item.command_count ?? (item.commands || []).length,
    )} 条命令 · ${esc(attackScriptFirstCommandLabel(item))}</p>
    ${renderAttackScriptCommands(item)}
  </div>`;
}

function battleObjectContextPreviewMarkup(item, effectAssets) {
  if (item.available === false) return "";
  const contexts = (effectAssets.clean_animations?.action_previews?.context_atlases || [])
    .filter(context => (context.used_actions || []).some(action =>
      Number(action) === Number(item.id)
    ));
  if (!contexts.length) {
    return ``;
  }
  return `<div data-battle-object-context-previews data-context-count="${contexts.length}">
    <div class="battle-action-atlas-grid">${contexts.map((context, index) => `<figure>
      ${battleActionCanvas({
        effectBank: context.chr_effect_bank,
        action: item.id,
        label: `战斗对象动作 ${item.id_hex} · 上下文 ${index + 1}`,
      })}
      <figcaption>上下文 ${index + 1}</figcaption>
    </figure>`).join("")}</div>
  </div>`;
}

function battleRecordContext() {
  const visuals = state.project?.visuals || {};
  const effectAssets = visuals.weapon_effect_catalog?.asset_catalog_data || {};
  const battleContext = (visuals.metasprites?.contexts || [])
    .find(context => Number(context.pair) === 0x94);
  const battleObjects = battleContext?.battle_objects || [];
  const identifiedPartyFigures = battleObjects.filter(item => item.semantic_role);
  const anonymousBattleObjects = battleObjects.filter(item => !item.semantic_role);
  const enemyFigures = visuals.monsters?.enemies || [];
  const figures = [
    ...identifiedPartyFigures.map(item => ({...item, figure_kind: "battle-object"})),
    ...enemyFigures.map(item => ({...item, figure_kind: "monster"})),
    ...anonymousBattleObjects.map(item => ({...item, figure_kind: "battle-object"})),
  ];
  const monsterRecords = new Map(
    (state.project?.game_data?.monsters?.records || [])
      .map(item => [Number(item.id), item]),
  );
  return {
    visuals,
    effectAssets,
    battleContext,
    figures,
    monsterRecords,
    profiles: effectAssets.monster_attack_profiles || [],
    attackVisuals: effectAssets.clean_animations?.catalog
      || effectAssets.clean_animations?.clips || [],
    effectStreams: effectAssets.effect_streams || [],
    scripts: [
      ...(effectAssets.scripts?.primary || []).map(item => ({space: "primary", item})),
      ...(effectAssets.scripts?.auxiliary || []).map(item => ({space: "auxiliary", item})),
    ],
    battleActions: effectAssets.battle_objects?.actions || [],
  };
}

function monsterProfileRecordPanels(profile, context) {
  const uid = profile.monster_resource;
  return [
    panel("怪物与攻击选择", fields([
      ["游戏索引 ID", `<span class="mono">${esc(profile.monster_id_hex)}</span>`],
      ["怪物", esc(resourceLabel(uid, `怪物 ${profile.monster_id_hex}`))],
      ["名称文本记录", resourceButtons(
        [profile.name_text_record], [`01:${String(profile.monster_id).padStart(3, "0")}`],
      )],
      ["出现编队", resourceButtons(
        profile.encounter_formation_resources,
        (profile.encounter_formation_ids || []).map(value => hex(value, 2)),
      )],
      ["攻击码", `<span class="mono">${esc(profile.attack_code_hex)}</span>`],
      ["选择槽", resourceButtons([profile.selector_resource], [profile.selector_id_hex])],
      ["打包值", `<span class="mono">${esc(profile.selector_packed_hex || "—")}</span>`],
      ["重复类", `<span class="mono">${esc(profile.repeat_counter_class_hex || "—")}</span>`],
      ["防御码", `${esc(profile.defense_code_hex)} · AUX ${profile.defense_aux} · ×${
        profile.defense_stat_multiplier
      }`],
    ])),
    panel("攻击特效预览", profile.visual_code == null
      ? `<div class="record-preview"><span class="resource-empty">${
        esc(profile.decode_status || "")
      }</span></div>`
      : `<div class="record-preview">${attackVisualCanvas({
        visualCode: profile.visual_code,
        play: true,
        label: resourceLabel(uid, `怪物 ${profile.monster_id_hex}`),
      })}</div>`),
    panel("运行时关联", fields([
      ["共享攻击特效", resourceButtons(
        [profile.visual_resource], [profile.visual_code_hex || "—"],
      )],
      ["战斗对象动作", byteResourceButtons("battle-action", profile.object_actions)],
      ["音效", esc((profile.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
    ])),
    battleRecordReferencePanel(uid),
  ];
}

function attackVisualRecordPanels(item, context) {
  const uid = attackVisualUid(item);
  item.display_name || item.stable_name || item.label || uid;
  const script = (context.effectAssets.scripts?.primary || []).find(record =>
    Number(record.id) === Number(item.visual_code)
  );
  const dependencies = script?.dependencies || {};
  return [
    panel("时间轴", attackVisualTimelineMarkup(Number(item.visual_code)),
      {wide: true}),
    panel("实际调用链", `<div data-attack-effect-dependency-chain="primary">${fields([
      ["装备选择入口", `<b>${esc(uid)}</b>`],
      ["直接调用主脚本", byteResourceButtons(
        "attack-visual", dependencies.visual_script_ids,
      )],
      ["调用辅助脚本", byteResourceButtons(
        "attack-visual-aux-script", dependencies.auxiliary_script_ids,
      )],
      ["完整对象动作", byteResourceButtons("battle-action", item.action_codes)],
      ["音效", esc((dependencies.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
    ])}</div>`),
    panel("基本信息", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.visual_code_hex)}</span>`],
      ["类型", esc(item.kind || "—")],
      ["说明", esc(item.label || "—")],
      ["帧数", item.frame_count == null ? "—" : esc(item.frame_count)],
      ["阶段", esc((item.phases || []).join(" / ") || "—")],
      ["状态", esc(item.preview_status || item.decode_status || "—")],
      ["使用域", esc((item.domains || []).join(" / ") || "—")],
    ])),
    panel("对象动作", fields([
      ["战斗对象动作", byteResourceButtons("battle-action", item.action_codes)],
      ["特殊炮弹", resourceButtons(
        (item.special_shell_ids || []).map(value => recordUid("shell", value)),
        item.special_shell_names_hint || item.special_shell_ids_hex || [],
      )],
    ])),
    battleRecordReferencePanel(uid),
  ];
}

function effectStreamRecordPanels(item) {
  const uid = effectStreamUid(item);
  return [
    panel("基本信息", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.effect_code_hex)}</span>`],
      ["存储类型", esc(item.storage_kind || "—")],
      ["解码状态", esc(item.decode_status || "—")],
      ["ACTION", `<span class="mono">${esc(item.action_code_hex || "运行时")}</span>`],
      ["资产", item.path
        ? `<code title="二进制只在构建阶段读取">${esc(item.path)}</code>`
        : "RAM 构造"],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(
      item.bytes_hex || "—",
    )}</code>`),
    battleRecordReferencePanel(uid),
  ];
}

function attackScriptRecordPanels(row, context) {
  const {space, item} = row;
  const uid = attackScriptUid(space, item);
  const ownerResource = space === "auxiliary"
    ? "attack-visual-aux-script" : "attack-visual";
  const ownerHandle = byteUid(ownerResource, item.id);
  const dependencies = item.dependencies || {};
  return [
    panel("基本信息", fields([
      ["命名空间", `<span class="mono">${space.toUpperCase()}</span>`],
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["解码状态", esc(item.decode_status || "decoded")],
      ["长度", `${Number(item.length || 0)} bytes`],
      ["终止符", item.terminator == null ? "—" : hex(item.terminator, 2)],
      ["命令数", esc(item.command_count ?? (item.commands || []).length)],
      ["资产", `<a href="${visualUrl(
        `weapon-effects/${item.path.replace(/\.bin$/, ".json")}`,
      )}" target="_blank">${esc(item.path)} ↗</a>`],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(item.bytes_hex || "—")}</code>`),
    panel("命令表", `<div data-attack-effect-preview="${space === "primary" ? "primary" : "auxiliary"}"
      data-command-count="${item.command_count ?? (item.commands || []).length}">${
        attackScriptPreviewMarkup(space, item)
      }</div>`, {wide: true}),
    panel("命令流编辑器", `<attack-visual-command-authoring
      data-attack-visual-resource="${esc(ownerResource)}"
      data-attack-visual-handle="${esc(ownerHandle)}"></attack-visual-command-authoring>`,
    {wide: true}),
    panel("脚本依赖", fields([
      ["主脚本", byteResourceButtons("attack-visual", dependencies.visual_script_ids)],
      ["辅助脚本", byteResourceButtons(
        "attack-visual-aux-script", dependencies.auxiliary_script_ids,
      )],
      ["战斗对象动作", byteResourceButtons("battle-action", dependencies.object_actions)],
      ["音效", esc((dependencies.sound_ids || []).map(audioCommandLabel).join(" / ") || "—")],
      ["对象槽", `<span class="mono">${(dependencies.object_slots || []).join(" / ") || "—"}</span>`],
    ])),
    ...(space === "auxiliary"
      ? [panel("组合使用情况", attackEffectUsageMarkup(
          "auxiliary", item, context.effectAssets,
        ), {wide: true})]
      : []),
    battleRecordReferencePanel(uid),
  ];
}

function battleFigureRecordPanels(item, context) {
  const uid = battleFigureUid(item);
  const isMonster = item.figure_kind === "monster";
  const monster = isMonster ? context.monsterRecords.get(Number(item.id)) : null;
  const preview = isMonster
    ? monsterFigureCanvas({
        enemyId: item.id,
        scale: 4,
        label: monster?.name || uid,
      })
    : item.preview
      ? `<img src="${visualUrl(item.preview)}" alt="${esc(item.name || uid)}">`
      : ``;
  return [
    panel("战斗图形", `<div class="record-preview">${preview}</div>`),
    panel("结构", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["类型", isMonster
        ? "怪物实例"
        : esc(item.role_label || (item.kind === "direct-frame" ? "直接帧" : "Metasprite"))],
      ["图块数", esc(item.sprite_count ?? "—")],
      ["实机 OAM", item.oam_match
        ? `<span class="mono">${esc((item.oam_match.tiles_hex || []).join(" / "))}</span>`
        : "—"],
    ])),
    panel("图形与调色板", isMonster
      ? fields([
        ["怪物图形", resourceButtons(
          [byteUid("monster-graphic", item.graphic_id)], [item.graphic_id_hex],
        )],
        ["调色板", `${item.palette_kind === "paired" ? "双色组合" : "单色板"} ${
          esc(item.palette_code_hex || "")
        }`],
        ["颜色", monsterPaletteMarkup(item) || "—"],
      ])
      : fields([
        ["CHR BANK", `<span class="mono">${esc(
          (context.battleContext?.chr_banks_hex || []).join(" / ") || "—",
        )}</span>`],
        ["调色板来源", esc(context.battleContext?.palette_source || "—")],
      ])),
    battleRecordReferencePanel(uid),
  ];
}

function battleActionRecordPanels(item, context) {
  const uid = battleActionUid(item);
  return [
    panel("布局预览", `<div data-attack-effect-preview="object">${
      battleObjectLayoutPreview(item)
    }${battleObjectContextPreviewMarkup(item, context.effectAssets)}</div>`, {wide: true}),
    panel("组合使用情况", attackEffectUsageMarkup(
      "object", item, context.effectAssets,
    ), {wide: true}),
    panel("动作布局", fields([
      ["游戏索引 ID", `<span class="mono">${esc(item.id_hex)}</span>`],
      ["状态", item.available === false ? "指针空洞" : "可用"],
      ["配置", `<span class="mono">${esc(item.config_hex || "—")}</span>`],
      ["调色板", esc(item.palette_id ?? "—")],
      ["尺寸", `${esc(item.columns ?? "—")} × ${esc(item.rows ?? "—")} tiles`],
      ["原点", `<span class="mono">${esc(item.origin_hex || "—")}</span>`],
      ["布局资产", item.layout_path ? `<code>${esc(item.layout_path)}</code>` : "—"],
    ])),
    panel("原始字节", `<code class="record-bytes">${esc(item.bytes_hex || "—")}</code>`),
    panel("图块矩阵", `<code class="record-bytes">${esc(
      (item.tile_matrix || []).map(row => row.map(value => hex(value, 2)).join(" ")).join("\n") || "—",
    )}</code>`),
    battleRecordReferencePanel(uid),
  ];
}

function battleRecordTitle(kind, item, context, uid) {
  if (kind === "monster-profile") {
    return resourceLabel(uid, `怪物 ${item.monster_id_hex}`);
  }
  if (kind === "attack-visual") {
    return item.display_name || item.stable_name || item.label || uid;
  }
  if (kind === "effect-stream") return item.label || `效果对象流 ${item.effect_code_hex}`;
  if (kind === "attack-script") {
    return `${item.space === "primary" ? "主攻击脚本" : "辅助攻击脚本"} ${item.item.id_hex}`;
  }
  if (kind === "battle-figure") {
    if (item.figure_kind === "monster") {
      return context.monsterRecords.get(Number(item.id))?.name || `怪物 ${item.id_hex}`;
    }
    return item.name || item.role_label
      || `${item.kind === "direct-frame" ? "Packed direct frame" : "ROM metasprite"} ${item.id_hex}`;
  }
  if (kind === "battle-action") return `战斗对象动作 ${item.id_hex}`;
  return uid;
}

function battleRecordPanels(kind, item, context) {
  if (kind === "monster-profile") return monsterProfileRecordPanels(item);
  if (kind === "attack-visual") return attackVisualRecordPanels(item, context);
  if (kind === "effect-stream") return effectStreamRecordPanels(item);
  if (kind === "attack-script") return attackScriptRecordPanels(item, context);
  if (kind === "battle-figure") return battleFigureRecordPanels(item, context);
  if (kind === "battle-action") return battleActionRecordPanels(item, context);
  return [];
}

/** 战斗目录记录页只展示已登记的物理范围。 */
function renderBattleRecord(recordId) {
  const context = battleRecordContext();
  const groups = [
    {kind: "monster-profile", rows: context.profiles,
      uidFor: item => item.monster_resource},
    {kind: "attack-visual", rows: context.attackVisuals, uidFor: attackVisualUid},
    {kind: "effect-stream", rows: context.effectStreams, uidFor: effectStreamUid},
    {kind: "attack-script", rows: context.scripts,
      recordIdFor: row => attackScriptRecordId(row.space, row.item),
      uidFor: row => attackScriptUid(row.space, row.item)},
    {kind: "battle-figure", rows: context.figures, uidFor: battleFigureUid},
    // 战斗对象动作由特效记录和脚本依赖引用；保留可直达记录，仍走同一外框。
    {kind: "battle-action", rows: context.battleActions, uidFor: battleActionUid},
  ];
  const wanted = String(recordId);
  for (const group of groups) {
    const recordIdFor = group.recordIdFor || group.uidFor;
    const index = group.rows.findIndex(item => recordIdFor(item) === wanted);
    if (index < 0) continue;
    const item = group.rows[index];
    const uid = group.uidFor(item);
    return recordPage({
      title: battleRecordTitle(group.kind, item, context, uid),
      uid,
      backLabel: state.view === "battle-test" ? "战斗模拟器" : "攻击特效",
      prevId: index > 0 ? recordIdFor(group.rows[index - 1]) : null,
      nextId: index < group.rows.length - 1 ? recordIdFor(group.rows[index + 1]) : null,
      panels: [
        ...battleRecordPanels(group.kind, item, context),
      ],
    });
  }
  return null;
}

export { BATTLE_TEST_EMPTY_FORMATION_SLOT, BATTLE_TEST_ENTRY_RESET_KEY, battleRecordContext, battleTestDraftAfterEntryReset, battleTestDraftAfterFormationReset, battleTestDraftError, battleTestDraftFromDocument, battleTestEditorStatus, battleTestEntryLocalDirty, battleTestEntryResetBlockedReason, battleTestFormation, battleTestFormationDisplayLabel, battleTestFormationDraft, battleTestFormationDraftError, battleTestFormationLocalDirty, battleTestFormationResetKey, battleTestViewPending, rebuildBattleSelectedFormation, renderBattle, renderBattleRecord, renderBattleTestFormationInlineEditor, updateBattleTestOriginalControls };
