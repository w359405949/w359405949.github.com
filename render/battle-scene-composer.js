// @editor-module 战斗场景的共享合成预览
//
// 这层只做组合：角色仍由 metasprite-record 现解，敌人仍由 monster-visual-layout
// 现解，攻击效果仍由 weapon-effect-vm 执行。敌方坐标来自共享的 ROM 排布算法，
// 这里不保存也不解释另一套位置规则。

import {editorLog} from "../core/editor-log.js";
import {currentTextReferenceLink} from "../core/resource-index.js";
import {
  BATTLE_SCENE_FIELD_HEIGHT,
  BATTLE_SCENE_HEIGHT,
  BATTLE_SCENE_WIDTH,
  battleSceneAttackImpactAnchor,
  battleSceneAttackLaunchAnchor,
  battleScenePartyAppearanceKey,
  battleScenePartyVehicle,
  battleScenePreviewCatalog,
  battleSceneSprite,
  normalizeBattleScenePreview,
  resolveBattleSceneAttack,
  battleMessageWindow,
  battleMessageSequenceWindow,
  battleItemMessageWindow,
  battleEnemyMessageWindow,
  battleMessageTextSlot,
} from "../core/battle-scene-preview.js";
import {
  battleActorActionFromStateDelta,
} from "../core/battle-actor-assets.js";
import {
  BATTLE_ENEMY_GRID_CELL_PIXELS,
  BATTLE_ENEMY_GRID_COLUMNS,
  BATTLE_ENEMY_GRID_LEFT,
  BATTLE_ENEMY_GRID_ROWS,
  BATTLE_ENEMY_GRID_TOP,
} from "../core/battle-enemy-formation.js";
import {state} from "../core/state.js";
import {esc} from "../core/dom.js";
import {db} from "../core/project-db.js";
import {prepareAttackChrEntryContext} from '../core/render-code-sources.js';
import {effectiveTextRecordSources} from "../core/text-record-project.js";
import {uiTemplateBindings} from "../core/ui-template-bindings.js";
import {battleMessageCalls} from '../core/battle-message-calls.js';
import {fileUrl} from "../core/package-io.js";
import {prepareUiBattleStatusSlot, prepareUiTextSlot, uiBindTextSlotConfirmation, uiSceneWindowSurface, uiJsRenderSources} from "../modules/visual/ui-construction-preview.js";
import {
  nesFrameDurationMs,
  nesVideoStandard,
  startNesFrameClock,
} from "../core/nes-video-standard.js";
import {blitRaster, createRaster} from "./chr-raster.js";
import {battlePresentationFrame, battlePresentationParameters} from "./battle-presentation.js";
import {
  battleActorGameAnchorOffset,
  battleActorImage,
  battleActorSources,
} from "./battle-actor.js";
import {vehiclePortraitImage} from "../modules/vehicle/components.js";
import {
  monsterFigureImage,
  monsterFigureSources,
} from "./monster-figure.js";
import {
  ACTOR_ANCHOR,
  attackFramePalettes,
  cleanAnimationFrames,
  paintBattleAction,
} from "./weapon-effect-vm.js";

/** 消息跟随本次来源；视觉编号不能代替当前行动或道具的文本引用。 */
async function battleSceneMessageSource({attack = null, action = null, recordId = undefined,
  runtime = null} = {}) {
  if (Number.isInteger(runtime?.monsterId)) {
    const monster = (await db.getAll("monster", [])).find(item => item.id === runtime.monsterId);
    const reference = monster?.name_reference;
    runtime = {...runtime, monsterNameRef: reference?.mapping_status === "confirmed"
      ? {resource_id: "text-record", node_id: reference.node_id} : null};
  }
  const source = attack?.source?.source;
  if (!action && source?.action_resource) {
    const actions = await db.getDocument("enemy-action", null);
    action = actions?.records?.find(record => record.handle === source.action_resource);
  }
  if (action) return {
    action, item: null, attack: attack?.side === "enemy" ? attack : null,
    resultRecords: (await db.getResourceDocument("battle-result-script", null))?.records || [],
    monster: attack?.side === "enemy"
      ? (await db.getAll("monster", [])).find(record => record.id === attack.attacker?.monsterId) : null,
    recordIds: recordId === undefined ? [action.fields?.message?.value].filter(Boolean)
      : [recordId].filter(Boolean),
    empty: recordId === null,
    runtime,
  };
  const item = attack?.channel === "item" ? source?.item : null;
  return {attack, item, action: null, empty: recordId === null, runtime,
    recordIds: recordId === undefined ? (item?.battle_use_effect?.text_outputs || [])
      .map(output => output.text_record?.node_id).filter(Boolean) : [recordId].filter(Boolean)};
}

/** 行动目录与播放入口消费同一消息来源，不给每类来源另建窗口。 */


/** Explicit preview choices do not predict or modify the game's random result. */
function bindBattleMessageOutcomes(canvas, prepared) {
  const root = canvas.closest("[data-battle-scene-preview-host]");
  const anchor = root?.querySelector("[data-battle-scene-simulation-status]");
  if (!anchor) return;
  let label = root.querySelector("[data-battle-outcomes]");
  const outcomes = prepared.messageWindow?.outcomes || [];
  if (!outcomes.length) {
    label?.remove();
    root.querySelector("[data-battle-result-editors]")?.remove();
    return;
  }
  if (!label) {
    label = document.createElement("label");
    label.dataset.battleOutcomes = "";
    label.append("结果预览 ");
    const select = document.createElement("select");
    select.dataset.battleOutcome = "";
    label.append(select);
    anchor.after(label);
    select.addEventListener("change", async () => {
      const current = preparedCompositions.get(canvas);
      if (!current) return;
      const token = (paintTokens.get(canvas) || 0) + 1;
      paintTokens.set(canvas, token);
      stopPlayback(canvas);
      const messageSource = {...current.messageSource, outcomeId: select.value};
      const repository = state.projectRepository;
      try {
        const messageWindow = await prepareMessageWindow("", null, state.project,
          messageSource, current.messageSaveSlot);
        if (paintTokens.get(canvas) !== token || !canvas.isConnected
            || state.projectRepository !== repository) return;
        drawPrepared(canvas, {...current, messageSource, messageWindow});
        updateStatus(canvas, "");
      } catch (error) {
        editorLog.error("预览", `操作失败：${error?.message || error}`, error);
        if (paintTokens.get(canvas) === token) updateStatus(canvas, error.message, true);
      }
    });
  }
  const select = label.querySelector("select");
  const options = [{id: "", label: "请选择"}, ...outcomes];
  const signature = JSON.stringify(options);
  if (select.dataset.options !== signature) {
    select.replaceChildren(...options.map(({id, label}) => new Option(label, id)));
    select.dataset.options = signature;
  }
  select.value = prepared.messageWindow.outcomeId || "";
  // 结果文字引用与画布使用同一文本槽。
  const primary = new Set(prepared.messageSource.recordIds || []);
  const records = [...new Set((prepared.messageWindow.textSlots || [])
    .map(slot => slot.textRecordRef?.node_id).filter(id => id && !primary.has(id)))];
  const previousEditors = root.querySelector("[data-battle-result-editors]");
  const recordSignature = JSON.stringify(records);
  if (previousEditors?.dataset.records !== recordSignature) {
    const editors = document.createElement("div");
    editors.dataset.battleResultEditors = "";
    editors.dataset.records = recordSignature;
    editors.innerHTML = records.map(recordId =>
      `<p>结果战斗文本 ${currentTextReferenceLink(recordId)}</p>`).join("");
    editors.querySelectorAll("[data-resource-target]").forEach(link => {
      link.addEventListener("click", event => {
        event.stopImmediatePropagation();
        void import("../core/resource-nav.js").then(({navigateToResourceTarget}) =>
          navigateToResourceTarget(link.dataset.resourceTarget));
      });
    });
    previousEditors?.remove();
    label.after(editors);
  }
}
const PARTY_SPRITE_BOX = 96;
const ENEMY_GROUP_COLORS = Object.freeze([
  "#ff8f72", "#ffbf69", "#d58cff", "#75df9b",
]);
const runtimeImageCache = new Map();
const playbackTimers = new WeakMap();
const paintTokens = new WeakMap();
const preparedCompositions = new WeakMap();
const preparedFrameIndices = new WeakMap();
const messageSurfaces = new WeakMap();

function messageSurface(layer) {
  let bySize = messageSurfaces.get(layer.raster);
  if (!bySize) messageSurfaces.set(layer.raster, bySize = new Map());
  const key = `${layer.rectangle.width}:${layer.rectangle.height}`;
  if (!bySize.has(key)) bySize.set(key, uiSceneWindowSurface(layer.raster, layer.rectangle));
  return {surface: bySize.get(key), rectangle: layer.rectangle};
}

export async function refreshMessageText(canvas) {
  const prepared = preparedCompositions.get(canvas);
  const window = prepared?.messageWindow;
  if (!window?.textSlots?.length) return;
  stopPlayback(canvas);
  paintTokens.set(canvas, (paintTokens.get(canvas) || 0) + 1);
  const outputs = await Promise.all(window.textSlots.map(slot => prepareUiTextSlot({
    ...slot, recordDocument: state.project?.text_record_edits,
  })));
  if (preparedCompositions.get(canvas) !== prepared || !canvas.isConnected) return;
  window.textOutputs = outputs;
  drawPrepared(canvas, prepared, preparedFrameIndices.get(canvas));
}

function currentPreview(project = state.project, sourcePreview = null, catalog) {
  const preview = normalizeBattleScenePreview(
    sourcePreview ?? state.battleScenePreview,
    project,
    catalog,
  );
  if (sourcePreview === null) state.battleScenePreview = preview;
  return preview;
}

function runtimeImage(url) {
  if (!url) return Promise.resolve(null);
  if (!runtimeImageCache.has(url)) {
    runtimeImageCache.set(url, new Promise(resolve => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image), {once: true});
      image.addEventListener("error", () => resolve(null), {once: true});
      image.src = url;
    }));
  }
  return runtimeImageCache.get(url);
}

function alphaBlit(target, source, centerX, centerY, clip = null) {
  if (!source?.data?.length) return;
  const left = Math.round(centerX - source.width / 2);
  const top = Math.round(centerY - source.height / 2);
  const startX = Math.max(0, -left);
  const endX = Math.min(source.width, target.width - left);
  const startY = Math.max(0, (clip?.top ?? 0) - top);
  const endY = Math.min(source.height, (clip?.bottom ?? target.height) - top);
  for (let sourceY = startY; sourceY < endY; sourceY += 1) {
    for (let sourceX = startX; sourceX < endX; sourceX += 1) {
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[sourceIndex + 3];
      if (!alpha) continue;
      const targetIndex = (
        (top + sourceY) * target.width + left + sourceX
      ) * 4;
      if (alpha === 255 || target.data[targetIndex + 3] === 0) {
        target.data[targetIndex] = source.data[sourceIndex];
        target.data[targetIndex + 1] = source.data[sourceIndex + 1];
        target.data[targetIndex + 2] = source.data[sourceIndex + 2];
        target.data[targetIndex + 3] = alpha;
        continue;
      }
      const ratio = alpha / 255;
      const inverse = 1 - ratio;
      target.data[targetIndex] = Math.round(
        source.data[sourceIndex] * ratio + target.data[targetIndex] * inverse,
      );
      target.data[targetIndex + 1] = Math.round(
        source.data[sourceIndex + 1] * ratio
          + target.data[targetIndex + 1] * inverse,
      );
      target.data[targetIndex + 2] = Math.round(
        source.data[sourceIndex + 2] * ratio
          + target.data[targetIndex + 2] * inverse,
      );
      target.data[targetIndex + 3] = 255;
    }
  }
}

async function prepareMessageWindow(runtimeUrl, stateId, project, messageSource, messageSaveSlot = null,
  messageSequence = null, catalog = null, sources = null) {
  const {attack} = messageSource;
  const scene = runtimeUrl ? project?.ui?.scenes?.find(item =>
    fileUrl(`game/ui/${item.preview}`) === runtimeUrl) : null;
  if (!stateId && runtimeUrl) {
    stateId = [scene, ...(scene?.interface_links || [])].find(
      item => item?.interface_id === "battle-messages",
    )?.interface_state_id;
    // 命令／目标等非消息场景仍由原来的场景预览负责。
    if (!stateId) return null;
  }
  // 显式场景状态消费自己的 fill；按来源演出时才按当前记录查状态，不能强塞到指定布局。
  const recordIds = stateId ? [] : messageSource.recordIds;
  const templates = await db.getDocument("project.ui.templates", null);
  if (messageSource.empty) {
    const frame = battleMessageWindow(templates, "battle-messages.action");
    return {...frame, empty: true, textSlots: [], textOutputs: [], layers: frame.layers.map(messageSurface)};
  }
  let window = null;
  if (messageSequence?.length) {
    try {window = battleMessageSequenceWindow(templates, messageSequence);}
    catch (error) {
      const reason = `本次行动消息序列未确认：${error.message}`;
      window = {stateId: '', layers: [], reason, textSlots: recordIds.map(recordId => ({
        textRecordRef: {resource_id: 'text-record', node_id: recordId}, unavailableReason: reason,
      }))};
    }
  }
  window ||= !stateId && messageSource.item
    ? battleItemMessageWindow(templates, messageSource.item, messageSource.outcomeId) : null;
  if (!stateId && !window && messageSource.action) {
    window = battleEnemyMessageWindow(templates, messageSource.action, messageSource);
  }
  if (!stateId && !window) {
    const states = recordIds.map(recordId => uiTemplateBindings(templates).filter(binding =>
      binding.interface === "battle-messages"
      && !templates.templates.find(template => template.id === binding.template)?.requires_message_sequence && [
        ...(binding.fills || []).map(fill => fill.text_record_ref?.node_id),
        ...(binding.deferred_records || []),
      ].includes(recordId),
    ));
    if (states.length && states.every(bindings => bindings.length === 1
        && bindings[0].state === states[0][0]?.state)) {
      stateId = states[0][0].state;
    } else if (!recordIds.length && attack?.side === "party" && attack.channel !== "item") {
      // 没有专属消息时继续消费已发布的行动窗 fill，缺值由共用文字入口说明。
      stateId = "battle-messages.action";
    } else {
      // 缺布局也保留本次消息交给文字入口；没有像素声明就不制造可绘制的槽位。
      window = {stateId: "", layers: [], reason: "", textSlots: recordIds.length
        ? recordIds.map((recordId, index) => ({
          textRecordRef: {resource_id: "text-record", node_id: recordId},
          unavailableReason: states[index].length !== 1
            ? `当前消息 ${recordId} 尚无唯一的已发布状态布局绑定（UI 消息提取）`
            : `当前消息 ${recordId} 已绑定 ${states[index][0].state}，本次消息尚无共同的已发布状态布局（UI 消息提取）`,
        }))
        : [{unavailableReason: "当前来源未发布战斗消息引用（enemy-action／battle-item-service）"}]};
    }
  }
  window ??= battleMessageWindow(templates, stateId, {recordIds,
    sceneId: scene?.interface_state_id === stateId ? scene.id : ""});
  if (attack?.channel === "shell" && !messageSequence?.length && !messageSource.recordIds.length) {
    // ExecuteSpecialShellAttack 保留出手提示，再在行动窗第二行显示发射记录。
    const calls = await battleMessageCalls();
    const primary = battleMessageWindow(templates, "battle-messages.action");
    const firing = battleMessageWindow(templates, "battle-messages.action", {recordIds: [calls['shell-firing']]});
    window = {...primary, textSlots: [...primary.textSlots, ...firing.textSlots.map(slot => ({
      ...slot, includesShellName: true,
      geometry: {...slot.geometry, first_line: slot.geometry.second_line},
    }))]};
  }
  // 怪物宿主始终展示已发布的行动窗框；缺记录落点仍交共用入口报缺，
  // 不把 action 的正文槽位或 fill 借给尚未绑定的记录。
  if (messageSource.action && !window.layers.length) {
    const frame = battleMessageWindow(templates, "battle-messages.action");
    window = {...window, layers: frame.layers, templateId: frame.templateId};
  }
  // A rendered primary prompt does not establish the item's later result.
  // Keep its proven text visible while reporting the missing result sequence.
  if (messageSource.item && !window.sequenceId) {
    window.reason = [window.reason,
      "本次道具的后续效果消息尚未完整发布，已显示的使用提示不代表效果文本完整",
    ].filter(Boolean).join("；");
  }
  let textSlots = window.textSlots || [];
  if (!textSlots.length) {
    textSlots = [{unavailableReason: window.reason
      || `当前状态 ${stateId} 尚无正文槽位绑定（UI 消息提取）`}];
  }
  textSlots = textSlots.map(slot => battleMessageTextSlot(slot, {
    attack, action: messageSource.action, monster: messageSource.monster,
    saveSlot: messageSaveSlot, project, runtime: messageSource.runtime, actor: messageSource.actor, catalog,
    saveFields: sources?.saveFields,
  }));
  if (sources && textSlots.some(slot => !slot.unavailableReason))
    sources.textRecords ||= effectiveTextRecordSources(null, project?.text_record_edits);
  const textOutputs = await Promise.all(textSlots.map(slot => prepareUiTextSlot({
    ...slot, recordDocument: project?.text_record_edits,
    recordSources: sources?.textRecords,
    waitMarker: messageSource.runtime?.waitForInput ? "battle-command" : "battle-message",
  })));
  return {...window, textSlots, textOutputs, layers: window.layers.map(messageSurface)};
}

async function prepareComposition(preview, runtimeUrl, project, messageWindowState, messageSaveSlot, messageSource,
  statusWindow = null, messageSequence = null, enemyPaletteMonsterId = null, previousEnemyScene = null,
  catalog = null, sources = null, actorSources = null) {
  actorSources ||= await battleActorSources();
  catalog ||= battleScenePreviewCatalog(project);
  const partySprites = preview.party.map(member => battleSceneSprite(
    catalog,
    battleScenePartyAppearanceKey(catalog, member),
  ));
  const partyActions = [...new Map(preview.party.flatMap(member => {
    const appearance = catalog.appearanceByKey.get(
      battleScenePartyAppearanceKey(catalog, member),
    );
    return (appearance?.stateActions || appearance?.actions || [])
      .map(item => [item.key, item]);
  })).values()];
  const enemyIds = [...new Set(
    [...preview.enemies, ...(previousEnemyScene?.enemies || [])]
      .filter(item => item?.visible).map(item => item.monsterId),
  )];
  const selectedAttack = resolveBattleSceneAttack(preview, project, catalog);
  const textOnlyAction = selectedAttack.side === "enemy"
    && messageSource.action?.fields?.visual_and_counter_initializer?.value === null;
  const attack = textOnlyAction
    ? {...selectedAttack, available: false, visualCode: null, reason: "当前行动没有攻击视觉"}
    : selectedAttack;
  const messageWindow = await prepareMessageWindow(runtimeUrl, messageWindowState, project,
    messageSource, messageSaveSlot, messageSequence, catalog, sources);
  const statusSlot = statusWindow ? await prepareUiBattleStatusSlot(statusWindow, project) : null;
  const enemySource = enemyId => {
    if (!sources) return monsterFigureSources({enemyId});
    sources.enemySources ||= new Map();
    if (!sources.enemySources.has(enemyId)) sources.enemySources.set(enemyId, monsterFigureSources({enemyId}));
    return sources.enemySources.get(enemyId);
  };
  const [paletteSource, background, ...enemySources] = await Promise.all([
    enemyPaletteMonsterId == null ? null : enemySource(enemyPaletteMonsterId),
    messageWindow ? null : runtimeImage(runtimeUrl),
    ...enemyIds.map(enemySource),
  ]);
  const actorRasters = sources?.actorRasters || new Map();
  const partyRasters = new Map(partyActions.map(action => {
    if (!actorRasters.has(action.key)) actorRasters.set(action.key,
      action.actorKind === 'vehicle' ? vehiclePortraitImage({sources: actorSources, action},
        {size: PARTY_SPRITE_BOX, scale: 1, background: null})
        : battleActorImage(actorSources, action, {size: PARTY_SPRITE_BOX, scale: 1, background: null}));
    return [action.key, actorRasters.get(action.key)];
  }));
  const partyGameAnchorOffsets = partySprites.map(action =>
    battleActorGameAnchorOffset(actorSources, action)
  );
  const partyActionGameAnchorOffsets = new Map(partyActions.map(action => [
    action.key, battleActorGameAnchorOffset(actorSources, action),
  ]));
  // SelectWeaponCoreEffect 使用当前装备效果码选择持握图形。
  const weaponEffect = attack.channel === "melee" && !attack.attacker?.riding
    ? Number(attack.source?.source?.item?.equipment?.battle_effect_code) : 0;
  const weaponAction = weaponEffect > 0 && weaponEffect < 8
    ? {kind: "metasprite", id: 0x0d + weaponEffect} : null;
  const weaponRaster = weaponAction
    ? battleActorImage(actorSources, weaponAction, {size: PARTY_SPRITE_BOX, scale: 1, background: null}) : null;
  const weaponGameAnchorOffset = battleActorGameAnchorOffset(actorSources, weaponAction);
  const enemyRasters = new Map(enemyIds.map((enemyId, index) => [
    enemyId,
    monsterFigureImage(paletteSource ? {...enemySources[index], palettes: paletteSource.palettes}
      : enemySources[index], 1, {background: null}),
  ]));
  const effectAssets = project?.visuals
    ?.weapon_effect_catalog?.asset_catalog_data || null;
  const launchAnchor = battleSceneAttackLaunchAnchor(attack, attack.target,
    attack.side === "party" ? partyGameAnchorOffsets[attack.attackerIndex] : null);
  const impactAnchor = battleSceneAttackImpactAnchor(attack, attack.target,
    attack.targetSide === "party" ? partyGameAnchorOffsets[attack.targetIndices[0]] : null);
  const animationOptions = launchAnchor && impactAnchor ? {
    actorAnchor: ACTOR_ANCHOR,
    targetAnchor: [ACTOR_ANCHOR[0] + Math.abs(impactAnchor.x - launchAnchor.x),
      ACTOR_ANCHOR[1] + impactAnchor.y - launchAnchor.y],
    gamePath: true,
  } : {};
  const animation = attack.available && effectAssets
    ? await cleanAnimationFrames(effectAssets, attack.visualCode, animationOptions)
    : null;
  // 先核实本次状态轨需要的资源；缺图不能等播放到半途才失败。
  const animatedPartyIndices = attack.side === "enemy"
    ? attack.targetIndices : [attack.attackerIndex];
  for (const index of animatedPartyIndices) {
    const appearanceKey = battleScenePartyAppearanceKey(catalog, preview.party[index]);
    for (const frame of animation?.frames || []) {
      battleActorActionFromStateDelta(catalog.actorCatalog, appearanceKey, undefined,
        frame.actorStateDelta);
    }
  }
  return {
    preview,
    previousEnemyScene,
    catalog,
    background,
    messageSource,
    messageSaveSlot,
    messageWindow,
    statusSlot,
    statusWindow,
    partySprites,
    partyRasters,
    partyGameAnchorOffsets,
    partyActionGameAnchorOffsets,
    weaponRaster,
    weaponGameAnchorOffset,
    enemyRasters,
    attack,
    animation,
  };
}

function playbackFrame(prepared, frameIndex = null) {
  const frames = prepared.animation?.frames || [];
  const targets = prepared.attack.targets || [];
  const clipFrameCount = frames.length;
  const requestedImpactStart = Number(prepared.animation?.impactFrameStart);
  const impactFrameStart = Number.isFinite(requestedImpactStart)
    ? Math.max(0, Math.min(Math.trunc(requestedImpactStart), clipFrameCount))
    : clipFrameCount;
  const impactFrameCount = Math.max(0, clipFrameCount - impactFrameStart);
  const totalFrameCount = targets.length
    ? clipFrameCount + impactFrameCount * Math.max(0, targets.length - 1)
    : 0;
  if (frameIndex === null || !clipFrameCount || !targets.length) {
    return {
      frame: null,
      frameIndex: null,
      localFrameIndex: null,
      phaseFrameIndex: null,
      phase: null,
      targetOrdinal: null,
      targetIndex: null,
      target: targets[0] || null,
      clipFrameCount,
      impactFrameStart,
      impactFrameCount,
      totalFrameCount,
    };
  }
  const resolvedFrameIndex = Math.max(
    0,
    Math.min(Number(frameIndex) || 0, totalFrameCount - 1),
  );
  const repeatedImpact = resolvedFrameIndex >= clipFrameCount && impactFrameCount > 0;
  const repeatedFrameIndex = Math.max(0, resolvedFrameIndex - clipFrameCount);
  const targetOrdinal = repeatedImpact
    ? 1 + Math.floor(repeatedFrameIndex / impactFrameCount) : 0;
  const phaseFrameIndex = repeatedImpact
    ? repeatedFrameIndex % impactFrameCount : resolvedFrameIndex;
  const localFrameIndex = repeatedImpact
    ? impactFrameStart + phaseFrameIndex : resolvedFrameIndex;
  return {
    frame: frames[localFrameIndex],
    frameIndex: resolvedFrameIndex,
    localFrameIndex,
    phaseFrameIndex,
    phase: repeatedImpact ? "impact-repeat" : "attack",
    targetOrdinal,
    targetIndex: prepared.attack.targetIndices[targetOrdinal],
    target: targets[targetOrdinal],
    clipFrameCount,
    impactFrameStart,
    impactFrameCount,
    totalFrameCount,
  };
}

function actorXDelta(frame, side) {
  if (!frame) return 0;
  return Number(side === "enemy"
    ? frame.actorXDeltaAlternate : frame.actorXDeltaNormal) || 0;
}

function mapEffectObject(item, sourceAnchor, impactAnchor, animation) {
  const [cleanActorX, cleanActorY] = animation.actorAnchor;
  const [cleanTargetX, cleanTargetY] = animation.targetAnchor;
  const reverse = Number(impactAnchor.x) < Number(sourceAnchor.x);
  if (item.spawnAnchor === "target") {
    return {
      x: Math.round(Number(impactAnchor.x) + (Number(item.x) - cleanTargetX) * (reverse ? -1 : 1)),
      y: Math.round(Number(impactAnchor.y) + Number(item.y) - cleanTargetY),
      flipX: Boolean(item.flipX) !== reverse,
    };
  }
  const progress = (Number(item.x) - cleanActorX)
    / (cleanTargetX - cleanActorX || 1);
  const cleanPathY = cleanActorY
    + (cleanTargetY - cleanActorY) * progress;
  const x = Number(sourceAnchor.x)
    + (Number(impactAnchor.x) - Number(sourceAnchor.x)) * progress;
  const y = Number(sourceAnchor.y)
    + (Number(impactAnchor.y) - Number(sourceAnchor.y)) * progress
    + (Number(item.y) - cleanPathY);
  return {
    x: Math.round(x),
    y: Math.round(y),
    flipX: Boolean(item.flipX) !== reverse,
  };
}

function compositionRaster(prepared, frameIndex = null) {
  const raster = createRaster(
    BATTLE_SCENE_WIDTH,
    BATTLE_SCENE_HEIGHT,
    null,
  );
  const playback = playbackFrame(prepared, frameIndex);
  const repeatedImpact = playback.phase === "impact-repeat";
  // `$0331/$14/$15` 的 X/Y 不是抽象的“攻击者轨”。`$D1` 在我方攻击时
  // 指向我方攻击者，在敌方攻击时则指向当前我方受击者。
  const activePartyActorIndex = playback.frame
    ? prepared.attack.side === "enemy"
      ? Number(playback.targetIndex)
      : repeatedImpact ? null : Number(prepared.attack.attackerIndex)
    : null;
  const currentActorXDelta = activePartyActorIndex === null
    ? 0 : actorXDelta(playback.frame, prepared.attack.side);
  if (prepared.presentation?.clip && prepared.previousEnemyScene) {
    prepared.previousEnemyScene.enemies.forEach(enemy => {
      if (enemy?.visible) alphaBlit(raster, prepared.enemyRasters.get(Number(enemy.monsterId)),
        enemy.x, enemy.y, {top: 0, bottom: prepared.presentation.clip.top});
    });
  }
  prepared.preview.enemies.forEach((enemy, index) => {
    if (!enemy?.visible || prepared.presentation?.visible === false) return;
    alphaBlit(
      raster,
      prepared.enemyRasters.get(Number(enemy.monsterId)),
      enemy.x,
      enemy.y,
      prepared.presentation?.clip,
    );
  });
  const partyFrameKeys = [];
  prepared.preview.party.forEach((member, index) => {
    const isActiveActor = activePartyActorIndex === index;
    const action = isActiveActor
      ? battleActorActionFromStateDelta(
        prepared.catalog.actorCatalog,
        battleScenePartyAppearanceKey(prepared.catalog, member),
        undefined,
        playback.frame.actorStateDelta,
      )
      : prepared.partySprites[index];
    partyFrameKeys.push(action?.key || "");
    if (!member.visible) return;
    const baseAnchor = prepared.partyGameAnchorOffsets[index];
    const actionAnchor = prepared.partyActionGameAnchorOffsets.get(action?.key) || baseAnchor;
    alphaBlit(
      raster,
      prepared.partyRasters.get(action?.key),
      Number(member.x) + baseAnchor.x - actionAnchor.x + (isActiveActor ? currentActorXDelta : 0),
      Number(member.y) + baseAnchor.y - actionAnchor.y,
    );
  });
  if (playback.frame && prepared.weaponRaster) {
    const index = prepared.attack.attackerIndex;
    const member = prepared.preview.party[index];
    const anchor = prepared.partyGameAnchorOffsets[index];
    alphaBlit(raster, prepared.weaponRaster,
      Number(member.x) + anchor.x - prepared.weaponGameAnchorOffset.x,
      Number(member.y) + anchor.y - prepared.weaponGameAnchorOffset.y);
  }
  let paintedEffectObjects = 0;
  let launchAnchor = null;
  let impactAnchor = null;
  if (playback.frame && playback.target) {
    const frame = playback.frame;
    // `$13` 使用方向各自的固定源锚点，并不跟随 `$14/$15` 的角色位移量；
    // 位移只作用于 `$D1` 指向的我方图形。目标端复用 `$12` 的侧别锚点。
    launchAnchor = battleSceneAttackLaunchAnchor(
      prepared.attack,
      playback.target,
      prepared.attack.side === "party"
        ? prepared.partyGameAnchorOffsets[prepared.attack.attackerIndex]
        : null,
    );
    impactAnchor = battleSceneAttackImpactAnchor(
      prepared.attack,
      playback.target,
      prepared.attack.targetSide === "party"
        ? prepared.partyGameAnchorOffsets[playback.targetIndex]
        : null,
    );
    const tiles = prepared.animation.tilesByBank.get(frame.effectBank);
    if (tiles) {
      const frameObjects = frame.objects || [];
      // `$02` 一类脚本不在发射段与命中段之间清对象；后续目标只保留其中
      // 从 `$12` 目标锚点生成的对象，不能把仍在状态槽里的炮口/弹道对象再画一遍。
      const effectObjects = repeatedImpact
          && prepared.animation.impactUsesTargetObjects
        ? frameObjects.filter(item => item.spawnAnchor === "target")
        : frameObjects;
      for (const item of effectObjects) {
        const action = prepared.animation.actionById.get(Number(item.action));
        if (!action?.available) continue;
        const mapped = mapEffectObject(
          item,
          launchAnchor,
          impactAnchor,
          prepared.animation,
        );
        paintBattleAction(
          raster,
          action,
          tiles,
          attackFramePalettes(frame, prepared.animation.palettes),
          mapped.x,
          mapped.y,
          {
            gameAnchor: true, flipX: mapped.flipX,
            // RenderBattleObject $87A4..$87BA, battle mode 02:
            // reject tile origins with nonzero coordinate high bytes, and
            // effect-object rows at/after $90. Do not clamp the launch byte.
            tileVisible: (x, y) => x >= 0 && x < 256
              && y >= 0 && y < BATTLE_SCENE_FIELD_HEIGHT,
          },
        );
        paintedEffectObjects += 1;
      }
    }
  }
  raster.paintedEffectObjects = paintedEffectObjects;
  raster.partyFrameKeys = partyFrameKeys;
  raster.playback = playback;
  raster.actorXDelta = currentActorXDelta;
  raster.activePartyActorIndex = activePartyActorIndex;
  raster.actorRole = activePartyActorIndex === null
    ? "" : prepared.attack.side === "enemy" ? "target" : "attacker";
  raster.launchAnchor = launchAnchor;
  raster.impactAnchor = impactAnchor;
  return raster;
}

function drawFormationGrid(context, preview) {
  if (!preview.guides) return;
  context.save();
  for (const enemy of preview.enemies) {
    if (!enemy?.visible) continue;
    const color = ENEMY_GROUP_COLORS[enemy.groupIndex] || ENEMY_GROUP_COLORS[0];
    context.fillStyle = `${color}24`;
    context.strokeStyle = `${color}b8`;
    context.lineWidth = 1;
    context.fillRect(
      enemy.pixelX,
      enemy.pixelY,
      enemy.widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
      enemy.heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS,
    );
    context.strokeRect(
      enemy.pixelX + 0.5,
      enemy.pixelY + 0.5,
      enemy.widthCells * BATTLE_ENEMY_GRID_CELL_PIXELS - 1,
      enemy.heightCells * BATTLE_ENEMY_GRID_CELL_PIXELS - 1,
    );
  }
  context.strokeStyle = "rgba(114, 229, 255, .28)";
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 0; column <= BATTLE_ENEMY_GRID_COLUMNS; column += 1) {
    const x = BATTLE_ENEMY_GRID_LEFT
      + column * BATTLE_ENEMY_GRID_CELL_PIXELS + 0.5;
    context.moveTo(x, BATTLE_ENEMY_GRID_TOP);
    context.lineTo(
      x,
      BATTLE_ENEMY_GRID_TOP
        + BATTLE_ENEMY_GRID_ROWS * BATTLE_ENEMY_GRID_CELL_PIXELS,
    );
  }
  for (let row = 0; row <= BATTLE_ENEMY_GRID_ROWS; row += 1) {
    const y = BATTLE_ENEMY_GRID_TOP
      + row * BATTLE_ENEMY_GRID_CELL_PIXELS + 0.5;
    context.moveTo(BATTLE_ENEMY_GRID_LEFT, y);
    context.lineTo(
      BATTLE_ENEMY_GRID_LEFT
        + BATTLE_ENEMY_GRID_COLUMNS * BATTLE_ENEMY_GRID_CELL_PIXELS,
      y,
    );
  }
  context.stroke();
  context.restore();
}

function opaqueRasterBounds(raster, centerX, centerY) {
  if (!raster?.data?.length) return null;
  let minX = raster.width;
  let minY = raster.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      if (!raster.data[(y * raster.width + x) * 4 + 3]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const rasterLeft = Math.round(centerX - raster.width / 2);
  const rasterTop = Math.round(centerY - raster.height / 2);
  return {
    left: rasterLeft + minX,
    top: rasterTop + minY,
    right: rasterLeft + maxX + 1,
    bottom: rasterTop + maxY + 1,
  };
}

function attackTargetBounds(prepared, targets = prepared.attack.targets) {
  const bounds = targets.flatMap(entity => {
    const raster = prepared.attack.targetSide === "enemy"
      ? prepared.enemyRasters.get(Number(entity.monsterId))
      : prepared.partyRasters.get(battleSceneSprite(
          prepared.catalog,
          battleScenePartyAppearanceKey(prepared.catalog, entity),
        )?.key);
    const value = opaqueRasterBounds(raster, entity.x, entity.y);
    return value ? [value] : [];
  });
  if (!bounds.length) return null;
  return {
    left: Math.min(...bounds.map(item => item.left)),
    top: Math.min(...bounds.map(item => item.top)),
    right: Math.max(...bounds.map(item => item.right)),
    bottom: Math.max(...bounds.map(item => item.bottom)),
  };
}

function drawGuideLabelsAndTargetFrame(context, prepared, playback) {
  if (!prepared.preview.guides) return;
  context.save();
  context.font = "8px monospace";
  context.textBaseline = "bottom";
  context.lineWidth = 1;
  const drawLabel = (item, label, color) => {
    context.fillStyle = color;
    context.fillText(label, item.x + 6, item.y + 3);
  };
  prepared.preview.party.forEach((item, index) => {
    if (item.visible) drawLabel(item, `P${index + 1}`, "#72e5ff");
  });
  prepared.preview.enemies.forEach((item, index) => {
    if (item?.visible) drawLabel(
      item,
      `E${index + 1}/G${item.groupIndex + 1}`,
      ENEMY_GROUP_COLORS[item.groupIndex] || ENEMY_GROUP_COLORS[0],
    );
  });
  const targetBounds = attackTargetBounds(prepared);
  if (targetBounds) {
    const padding = 3;
    const left = Math.max(1, targetBounds.left - padding);
    const top = Math.max(1, targetBounds.top - padding);
    const right = Math.min(BATTLE_SCENE_WIDTH - 1, targetBounds.right + padding);
    const bottom = Math.min(
      BATTLE_SCENE_FIELD_HEIGHT - 1,
      targetBounds.bottom + padding,
    );
    context.strokeStyle = "#ffe05c";
    context.lineWidth = 2;
    context.strokeRect(
      left + 0.5,
      top + 0.5,
      Math.max(1, right - left - 1),
      Math.max(1, bottom - top - 1),
    );
    const label = `${prepared.attack.scopeLabel} · ${
      prepared.attack.targetIndices.map(index =>
        `${prepared.attack.targetSide === "enemy" ? "E" : "P"}${index + 1}`
      ).join("、")
    }`;
    const labelWidth = context.measureText(label).width + 4;
    const labelTop = top >= 10 ? top - 10 : top + 2;
    context.fillStyle = "rgba(0, 0, 0, .85)";
    context.fillRect(left, labelTop, labelWidth, 9);
    context.fillStyle = "#ffe05c";
    context.fillText(label, left + 2, labelTop + 8);
  }
  if (playback?.frame && playback.target) {
    const activeBounds = attackTargetBounds(prepared, [playback.target]);
    if (activeBounds) {
      const padding = 1;
      const left = Math.max(1, activeBounds.left - padding);
      const top = Math.max(1, activeBounds.top - padding);
      const right = Math.min(
        BATTLE_SCENE_WIDTH - 1,
        activeBounds.right + padding,
      );
      const bottom = Math.min(
        BATTLE_SCENE_FIELD_HEIGHT - 1,
        activeBounds.bottom + padding,
      );
      context.strokeStyle = "#72e5ff";
      context.lineWidth = 1;
      context.strokeRect(
        left + 0.5,
        top + 0.5,
        Math.max(1, right - left - 1),
        Math.max(1, bottom - top - 1),
      );
    }
  }
  context.restore();
}

function updateStatus(canvas, text, error = false, passive = false) {
  const root = canvas.closest(
    "[data-battle-scene-preview-host], [data-screen-workbench]",
  ) || document;
  const status = root.querySelector("[data-battle-scene-simulation-status]");
  if (status) {
    const errorsOnly = status.hasAttribute("data-battle-scene-status-errors-only");
    status.textContent = errorsOnly && (passive || !error) ? ""
      : [text, errorsOnly ? "" : canvas.dataset.battleSceneWindowNote].filter(Boolean).join("；");
    status.classList.toggle("invalid", error && Boolean(status.textContent));
  }
}

function drawPrepared(canvas, prepared, frameIndex = null, drawing = null) {
  preparedCompositions.set(canvas, prepared);
  preparedFrameIndices.set(canvas, frameIndex);
  bindBattleMessageOutcomes(canvas, prepared);
  if (!drawing || canvas.width !== BATTLE_SCENE_WIDTH) canvas.width = BATTLE_SCENE_WIDTH;
  if (!drawing || canvas.height !== BATTLE_SCENE_HEIGHT) canvas.height = BATTLE_SCENE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const messageWindow = prepared.messageWindow;
  canvas.dataset.battleSceneWindowState = messageWindow?.stateId || "";
  canvas.dataset.battleSceneWindowTemplate = messageWindow?.templateId || "";
  canvas.dataset.battleSceneWindowNote = messageWindow
    ? [...new Set([messageWindow.reason, ...(messageWindow.textOutputs || []).map(output => output.reason),
      messageWindow.layers.length && !messageWindow.empty && !messageWindow.textSlots?.length
        ? "仅显示已发布窗框，当前来源尚无可填入的正文绑定" : ""].filter(Boolean))].join("；")
    : "";
  canvas.dataset.battleSceneTextRecords = (messageWindow?.textOutputs || []).map(output => output.recordId).join(",");
  canvas.dataset.battleSceneTextStates = (messageWindow?.textOutputs || []).map(output => output.status).join(",");
  const placeholders = (messageWindow?.textOutputs || []).flatMap(output =>
    (output.placeholders || []).map(item => ({...item, slotRecord: output.recordId})));
  canvas.dataset.battleSceneTextPlaceholders = JSON.stringify(placeholders);
  canvas.dataset.battleSceneItemMessageStatus = prepared.messageSource?.item
    ? messageWindow?.sequenceId && messageWindow.sequenceComplete && messageWindow.textOutputs?.length
      && messageWindow.textOutputs.every(output => output.status === "complete")
      ? placeholders.length ? "structure-complete" : "complete" : "incomplete"
    : "";
  canvas.dataset.battleSceneEnemyMessageStatus = prepared.messageSource?.action
    ? messageWindow?.sequenceId && messageWindow.sequenceComplete && messageWindow.textOutputs?.length
      && messageWindow.textOutputs.every(output => output.status === "complete")
      ? placeholders.length ? "structure-complete" : "complete" : "incomplete"
    : "";
  canvas.dataset.battleSceneMessagePhase = messageWindow?.totalPhases
    ? `${messageWindow.phaseCount}/${messageWindow.totalPhases}` : "";
  if (prepared.background) {
    context.drawImage(
      prepared.background,
      0,
      BATTLE_SCENE_FIELD_HEIGHT,
      BATTLE_SCENE_WIDTH,
      BATTLE_SCENE_HEIGHT - BATTLE_SCENE_FIELD_HEIGHT,
      0,
      BATTLE_SCENE_FIELD_HEIGHT,
      BATTLE_SCENE_WIDTH,
      BATTLE_SCENE_HEIGHT - BATTLE_SCENE_FIELD_HEIGHT,
    );
  }
  drawFormationGrid(context, prepared.preview);
  const composition = compositionRaster(prepared, frameIndex);
  const overlay = drawing?.overlay || document.createElement("canvas");
  if (drawing) {
    if (overlay.width !== composition.width) overlay.width = composition.width;
    if (overlay.height !== composition.height) overlay.height = composition.height;
    overlay.getContext("2d").putImageData(new ImageData(composition.data,
      composition.width, composition.height), 0, 0);
  } else blitRaster(overlay, composition);
  context.drawImage(overlay, 0, 0);
  for (const layer of [...(messageWindow?.layers || []), ...(messageWindow?.textOutputs || [])]) {
    if (layer.surface) context.drawImage(layer.surface, layer.rectangle.x, layer.rectangle.y);
  }
  if (prepared.statusSlot?.surface) context.drawImage(prepared.statusSlot.surface,
    prepared.statusSlot.rectangle.x, prepared.statusSlot.rectangle.y);
  canvas.dataset.battleSceneStatusWindow = prepared.statusWindow
    ? `${prepared.statusWindow.label}:${prepared.statusWindow.value}` : "";
  const pending = messageWindow?.textOutputs?.find(output => output.status === "waiting")
    || messageWindow?.textOutputs?.find(output => output.status === "blocked");
  uiBindTextSlotConfirmation(canvas, pending, next => {
    const index = messageWindow.textOutputs.indexOf(pending);
    if (index < 0 || preparedCompositions.get(canvas) !== prepared) return;
    messageWindow.textOutputs[index] = next;
    drawPrepared(canvas, prepared, preparedFrameIndices.get(canvas));
  });
  drawGuideLabelsAndTargetFrame(context, prepared, composition.playback);
  canvas.dataset.battleSceneComposerPainted = "1";
  canvas.dataset.battleScenePartyVisible = String(
    prepared.preview.party.filter(item => item.visible).length,
  );
  canvas.dataset.battleSceneEnemiesVisible = String(
    prepared.preview.enemies.filter(item => item?.visible).length,
  );
  canvas.dataset.battleScenePartyPositions = prepared.preview.party
    .map(item => `${item.x},${item.y}`).join(";");
  canvas.dataset.battleSceneEnemyPositions = prepared.preview.enemies
    .map(item => item ? `${item.x},${item.y}` : "empty").join(";");
  canvas.dataset.battleSceneAttackAvailable = String(prepared.attack.available);
  canvas.dataset.battleSceneGrid = `${BATTLE_ENEMY_GRID_COLUMNS}x${
    BATTLE_ENEMY_GRID_ROWS
  }`;
  canvas.dataset.battleSceneTargetScope = prepared.attack.scope;
  // 发射点逐槽取，而一个攻击方式常覆盖好几个槽：这一格说明这次到底用了哪一槽。
  canvas.dataset.battleSceneAttackSelectionSlot = String(
    prepared.attack.selectionSlot,
  );
  canvas.dataset.battleSceneTargetCount = String(prepared.attack.targets.length);
  canvas.dataset.battleSceneTargetIndices = prepared.attack.targetIndices.join(",");
  canvas.dataset.battleSceneAttackVisualCode = prepared.attack.visualCode == null
    ? "" : String(prepared.attack.visualCode);
  canvas.dataset.battleSceneAttackChannel = prepared.attack.channel || "";
  canvas.dataset.battleSceneLaunchAnchorProfile = String(
    prepared.attack.launchAnchorProfile?.id || "",
  );
  canvas.dataset.battleSceneAppearanceKeys = prepared.preview.party
    .map(item => battleScenePartyAppearanceKey(prepared.catalog, item)).join(";");
  canvas.dataset.battleSceneNormalAppearanceKeys = prepared.preview.party
    .map(item => item.normalAppearance).join(";");
  canvas.dataset.battleSceneVehicleAppearanceKeys = prepared.preview.party
    .map(item => battleScenePartyVehicle(
      prepared.catalog, item,
    )?.appearanceKey || "").join(";");
  canvas.dataset.battleSceneVehiclePresetIds = prepared.preview.party
    .map(item => item.vehiclePresetId ?? "").join(";");
  canvas.dataset.battleSceneRidingStates = prepared.preview.party
    .map(item => String(Boolean(item.riding))).join(";");
  canvas.dataset.battleSceneActionKeys = prepared.preview.party
    .map((item, index) => prepared.partySprites[index]?.pose || "").join(";");
  canvas.dataset.battleSceneSpriteKeys = prepared.partySprites
    .map(item => item?.key || "").join(";");
  canvas.dataset.battleSceneActorFrameKeys = composition.partyFrameKeys.join(";");
  canvas.dataset.battleSceneActorAnimated = String(
    frameIndex !== null && composition.activePartyActorIndex !== null,
  );
  const playback = composition.playback;
  canvas.dataset.battleSceneAttackTotalFrames = String(
    playback?.totalFrameCount || 0,
  );
  canvas.dataset.battleSceneAttackClipFrames = String(
    playback?.clipFrameCount || 0,
  );
  canvas.dataset.battleSceneAttackImpactStartFrame = String(
    playback?.impactFrameStart || 0,
  );
  canvas.dataset.battleSceneAttackImpactFrames = String(
    playback?.impactFrameCount || 0,
  );
  canvas.dataset.battleScenePlaybackPhase = playback?.phase || "";
  canvas.dataset.battleSceneLocalAttackFrame = playback?.localFrameIndex == null
    ? "" : String(playback.localFrameIndex);
  canvas.dataset.battleSceneActiveTargetOrdinal = playback?.targetOrdinal == null
    ? "" : String(playback.targetOrdinal);
  canvas.dataset.battleSceneActiveTargetIndex = playback?.targetIndex == null
    ? "" : String(playback.targetIndex);
  canvas.dataset.battleSceneActorStateDelta = playback?.frame
    ? String(Number(playback.frame.actorStateDelta) || 0) : "";
  canvas.dataset.battleSceneActorXDelta = playback?.frame
    ? String(composition.actorXDelta || 0) : "";
  canvas.dataset.battleSceneActorRole = composition.actorRole || "";
  canvas.dataset.battleSceneActivePartyActorIndex =
    composition.activePartyActorIndex === null
      ? "" : String(composition.activePartyActorIndex);
  canvas.dataset.battleSceneLaunchAnchor = composition.launchAnchor
    ? `${Math.round(composition.launchAnchor.x)},${Math.round(
      composition.launchAnchor.y,
    )}` : "";
  canvas.dataset.battleSceneImpactAnchor = composition.impactAnchor
    ? `${Math.round(composition.impactAnchor.x)},${Math.round(
      composition.impactAnchor.y,
    )}` : "";
  const video = nesVideoStandard(prepared.videoStandard ?? state.battleVideoStandard);
  canvas.dataset.battleSceneVideoStandard = video.key;
  canvas.dataset.battleScenePlaybackHz = video.hz.toFixed(5);
  canvas.dataset.battleSceneFrameDurationMs = nesFrameDurationMs(video.key).toFixed(4);
  canvas.dataset.battleSceneAttackFrame = frameIndex === null
    ? "" : String(frameIndex);
  canvas.dataset.battleSceneEffectObjects = String(
    composition.paintedEffectObjects || 0,
  );
  delete canvas.dataset.battleSceneComposerError;
}

function stopPlayback(canvas) {
  const timer = playbackTimers.get(canvas);
  timer?.cancel?.();
  playbackTimers.delete(canvas);
}

async function paintCanvas(canvas, {
  project = state.project,
  preview: sourcePreview = null,
  messageAction = null,
  messageWindowState = null,
  messageSaveSlot = null,
  messageRecordId = undefined,
  messageRuntime = null,
  statusWindow = null,
  messageSequence = null,
  enemyPaletteMonsterId = null,
  previousEnemyScene = null,
} = {}) {
  stopPlayback(canvas);
  canvas.dataset.battleSceneComposerPainted = "0";
  delete canvas.dataset.battleSceneComposerError;
  const token = (paintTokens.get(canvas) || 0) + 1;
  paintTokens.set(canvas, token);
  const preview = currentPreview(project, sourcePreview);
  try {
    const messageSource = await battleSceneMessageSource({
      attack: resolveBattleSceneAttack(preview, project), action: messageAction,
      recordId: messageRecordId, runtime: messageRuntime,
    });
    const prepared = await prepareComposition(
      preview,
      String(canvas.dataset.battleSceneRuntimePreview || ""),
      project,
      messageWindowState,
      messageSaveSlot,
      messageSource,
      statusWindow,
      messageSequence,
      enemyPaletteMonsterId,
      previousEnemyScene,
    );
    if (paintTokens.get(canvas) !== token || !canvas.isConnected) return;
    drawPrepared(canvas, prepared);
    const sourceLabel = prepared.messageSource.action?.name_hint
      || prepared.attack.source?.label || "未选择攻击视觉";
    updateStatus(
      canvas,
      prepared.attack.available
        ? `${sourceLabel} · ${prepared.attack.scopeLabel} · 选择武器或动作后播放攻击动画`
        : prepared.messageSource.action
          ? `${sourceLabel} · 文字演示就绪，点击播放这条行动`
          : `${sourceLabel} · ${prepared.attack.reason}`,
      !prepared.attack.available && !prepared.messageSource.action,
      true,
    );
  } catch (error) {
    if (paintTokens.get(canvas) !== token) return;
    canvas.dataset.battleSceneComposerError = String(error?.message || error);
    updateStatus(canvas, `预览失败：${error?.message || error}`, true);
    editorLog.error("预览", "战斗场景合成失败", error);
  }
}

/** 重画页面上所有战斗编排画布；坐标输入时可以直接调用，不必重建 DOM。 */
export async function paintBattleSceneComposerCanvases(root = document) {
  const canvases = [...root.querySelectorAll("canvas[data-battle-scene-composer]")];
  await Promise.all(canvases.map(canvas => paintCanvas(canvas)));
}

/** 用指定预览绘制单张画布；只读预设借此复用渲染器而不覆盖战斗页草稿。 */
export async function paintBattleSceneComposerCanvas(canvas, options = {}) {
  if (!canvas) return false;
  await paintCanvas(canvas, options);
  return canvas.dataset.battleSceneComposerPainted === "1";
}

/** 战斗画面独立的绘制输入共用一份并行准备。 */
export function prepareBattleSceneComposerSources() {
  return Promise.all([prepareAttackChrEntryContext(), battleActorSources(), db.getDocument("project.ui", null).then(ui =>
    uiJsRenderSources(ui.construction))]);
}

/** 播放投影按输入准备，逐帧绘制只读取本次投影。 */
export async function prepareBattleSceneComposerPlayback({project = state.project,
  preview: sourcePreview, messageRecordId = null, messageRuntime = null,
  messageSequence = null, phase = "", presentation = 0,
  enemyPaletteMonsterId = null, previousEnemyScene = null, paintOverlay = null,
  messageSaveSlot = null, statusWindow = null, messageOutcomeId = "", messageActor = null,
  catalog = null, sources = null} = {}) {
  // 目录在本次输入准备内复用，先加载当前人物配方再创建目录。
  const [, actorSources] = await (sources?.ready || prepareBattleSceneComposerSources());
  catalog ||= battleScenePreviewCatalog(project);
  const preview = currentPreview(project, sourcePreview, catalog);
  const messageSource = await battleSceneMessageSource({
    attack: resolveBattleSceneAttack(preview, project, catalog),
    recordId: phase === "single-action" ? undefined : messageRecordId, runtime: messageRuntime,
  });
  if (phase === "single-action") {
    messageSource.outcomeId = messageOutcomeId;
    messageSource.actor = messageActor;
  } else if (messageOutcomeId) messageSource.outcomeId = messageOutcomeId;
  const prepared = await prepareComposition(preview, "", project, null, messageSaveSlot,
    messageSource, statusWindow, messageSequence, enemyPaletteMonsterId, previousEnemyScene, catalog, sources, actorSources);
  prepared.videoStandard = state.battleVideoStandard;
  const playback = playbackFrame(prepared, 0);
  const start = phase === "damage" ? playback.impactFrameStart : 0;
  const end = phase === "attack" ? playback.impactFrameStart : playback.totalFrameCount;
  const animated = ["attack", "damage", "single-action"].includes(phase) && start < end;
  const presentationParameters = [1, 4].includes(presentation) ? await battlePresentationParameters() : null;
  const presentationCount = battlePresentationFrame(presentation, 0, presentationParameters).count;
  const surface = document.createElement("canvas");
  const drawing = {overlay: document.createElement("canvas")};
  const count = (animated ? end - start : 0)
    + (!animated || presentationCount ? presentationCount + 1 : 0);
  const columns = Math.min(16, count), atlas = document.createElement("canvas");
  const metadata = Array(count), completed = new Set();
  let disposed = false, snapshot = null, context = null, lastFrame = -1;
  const prepareFrame = index => {
    if (disposed) throw new Error("播放剪辑已释放");
    if (completed.has(index)) return;
    const animationCount = animated ? end - start : 0;
    const current = index < animationCount ? prepared
      : {...prepared, presentation: battlePresentationFrame(presentation, index - animationCount, presentationParameters)};
    if (lastFrame !== index) {
      drawPrepared(surface, current, index < animationCount ? start + index : null, drawing);
      paintOverlay?.(surface);
      metadata[index] = {...surface.dataset};
      lastFrame = index;
    }
    if (context) {
      context.drawImage(surface, (index % columns) * surface.width,
        Math.floor(index / columns) * surface.height);
      completed.add(index);
    }
  };
  return {
    outcomes: prepared.messageWindow?.outcomes || [],
    messagePhase: prepared.messageWindow?.messagePhases?.at(-1) || null,
    frameCount: animated || presentationCount ? count : 0,
    snapshot({isCurrent = () => true} = {}) {
      return snapshot ||= (async () => {
        const current = () => !disposed && isCurrent();
        if (!current()) return null;
        atlas.width = columns * BATTLE_SCENE_WIDTH;
        atlas.height = Math.ceil(count / columns) * BATTLE_SCENE_HEIGHT;
        context = atlas.getContext("2d");
        // 图集按短批次补齐，播放与跳转同步准备所需帧。
        let batchStarted = performance.now();
        for (let index = 0; index < count; index++) {
          if (!current()) return null;
          prepareFrame(index);
          if (performance.now() - batchStarted >= 8) {
            await new Promise(resolve => setTimeout(resolve, 0));
            batchStarted = performance.now();
          }
        }
        if (!current()) return null;
        const image = await new Promise(resolve => atlas.toBlob(resolve, "image/png"));
        if (!current()) return null;
        if (!image) throw new Error("播放帧缓存失败");
        return {image, columns, width: surface.width, height: surface.height,
          frameCount: this.frameCount, messagePhase: this.messagePhase, metadata};
      })();
    },
    dispose() {disposed = true; atlas.width = atlas.height = 0; surface.width = surface.height = 0;},
    paint(canvas, frameIndex = 0) {
      const index = Math.max(0, Math.min(count - 1, frameIndex));
      prepareFrame(index);
      const output = canvas.getContext("2d");
      output.clearRect(0, 0, canvas.width, canvas.height);
      if (completed.has(index)) output.drawImage(atlas, (index % columns) * surface.width,
        Math.floor(index / columns) * surface.height, surface.width, surface.height,
        0, 0, surface.width, surface.height);
      else output.drawImage(surface, 0, 0);
      Object.assign(canvas.dataset, metadata[index]);
    },
  };
}

/** PNG 帧图集恢复为只读播放投影。 */
export async function restoreBattleSceneComposerPlayback({image, columns, width, height, frameCount, messagePhase, metadata}) {
  const atlas = await createImageBitmap(image);
  return {
    frameCount,
    messagePhase,
    dispose() {atlas.close();},
    async snapshot() {return {image, columns, width, height, frameCount, messagePhase, metadata};},
    paint(canvas, frameIndex = 0) {
      const index = Math.max(0, Math.min(metadata.length - 1, frameIndex));
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(atlas, (index % columns) * width, Math.floor(index / columns) * height,
        width, height, 0, 0, width, height);
      Object.assign(canvas.dataset, metadata[index]);
    },
  };
}

/** 绘出同一套已准备资产的指定攻击剪辑帧。 */
export function paintBattleSceneComposerFrame(canvas, frameIndex) {
  const prepared = preparedCompositions.get(canvas);
  if (!prepared || !Number.isInteger(frameIndex) || frameIndex < 0
      || frameIndex >= playbackFrame(prepared, frameIndex).totalFrameCount) return false;
  drawPrepared(canvas, prepared, frameIndex);
  return true;
}

/**
 * 按所选 PAL / NTSC 的逐帧时钟播放一次当前双方攻击。
 *
 * `preview` 与 `paintBattleSceneComposerCanvas` 对齐：内嵌进别的页时，画的是传进来
 * 的那一套，播的也得是同一套。原来这里写死取战斗场景页的草稿，内嵌就会「画的是这
 * 只怪物、播的是战斗页那一套」。
 */
export async function playBattleSceneComposerAttack(canvas = null, {
  project = state.project,
  preview: sourcePreview = null,
  messageSaveSlot = null,
  messageAction = null,
  messageOutcome = null,
} = {}) {
  const target = canvas || document.querySelector(
    "canvas[data-battle-scene-composer]",
  );
  if (!target) return false;
  stopPlayback(target);
  const token = (paintTokens.get(target) || 0) + 1;
  paintTokens.set(target, token);
  const preview = currentPreview(project, sourcePreview);
  try {
    const messageSource = await battleSceneMessageSource({
      attack: resolveBattleSceneAttack(preview, project), action: messageAction,
    });
    const previousSource = preparedCompositions.get(target)?.messageSource;
    if (messageSource.action && messageOutcome?.actionReference === messageSource.action.handle) {
      messageSource.outcomeId = messageOutcome.id;
      messageSource.phaseCount = 1;
    } else if (messageSource.action && previousSource?.action?.handle === messageSource.action.handle) {
      messageSource.outcomeId = previousSource.outcomeId || "";
      messageSource.phaseCount = 1;
    }
    const prepared = await prepareComposition(
      preview,
      String(target.dataset.battleSceneRuntimePreview || ""),
      project,
      null,
      messageSaveSlot,
      messageSource,
    );
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    const sourceLabel = prepared.messageSource.action?.name_hint
      || prepared.attack.source?.label || "攻击视觉";
    const messageStages = [];
    const totalMessagePhases = messageSource.action ? prepared.messageWindow?.totalPhases || 0 : 0;
    for (let phaseCount = 2; phaseCount <= totalMessagePhases; phaseCount++) {
      const nextSource = {...messageSource, phaseCount};
      messageStages.push({...prepared, messageSource: nextSource,
        messageWindow: await prepareMessageWindow("", null, project, nextSource, messageSaveSlot)});
    }
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    const current = () => target.isConnected && paintTokens.get(target) === token;
    const finish = latest => {
      if (!current()) return;
      stopPlayback(target);
      drawPrepared(target, latest);
      updateStatus(target, `${sourceLabel} · 播放完成${messageStages.length
        ? ` · 结果消息 ${latest.messageWindow.phaseCount}/${latest.messageWindow.totalPhases}` : ""}`);
    };
    let messageStageIndex = 0;
    const advanceMessage = () => {
      if (!current()) return;
      const next = messageStages[messageStageIndex++];
      if (!next) { finish(prepared); return; }
      drawPrepared(target, next);
      if (messageStageIndex === messageStages.length) { finish(next); return; }
      updateStatus(target, `${sourceLabel} · 结果消息 ${next.messageWindow.phaseCount}/${next.messageWindow.totalPhases}`);
      playbackTimers.set(target, startNesFrameClock({standard: state.battleVideoStandard,
        frameCount: 60, shouldContinue: current, onFrame: () => {}, onComplete: advanceMessage}));
    };
    const frames = prepared.animation?.frames || [];
    if (!prepared.attack.available || !frames.length) {
      drawPrepared(target, prepared);
      if (prepared.messageSource.action) {
        if (messageStages.length) {
          updateStatus(target, `${sourceLabel} · 正在演示行动提示`);
          // Text-only previews hold each message for 60 preview frames, independent of ROM timing.
          playbackTimers.set(target, startNesFrameClock({standard: state.battleVideoStandard,
            frameCount: 60, shouldContinue: current, onFrame: () => {}, onComplete: advanceMessage}));
          return true;
        }
        const outputs = prepared.messageWindow?.textOutputs || [];
        const complete = outputs.length && outputs.every(output => output.status === "complete");
        updateStatus(target, `${sourceLabel} · ${complete
          ? "文字演示完成"
          : `已演示消息窗；文字未完整显示：${target.dataset.battleSceneWindowNote}`}`);
        return true;
      }
      updateStatus(
        target,
        `${sourceLabel} · ${prepared.attack.reason || "该攻击视觉没有可播放帧"}`,
        true,
      );
      return false;
    }
    const totalFrameCount = playbackFrame(prepared, 0).totalFrameCount;
    const playbackStatus = frameIndex => {
      const playback = playbackFrame(prepared, frameIndex);
      const targetStatus = prepared.attack.targets.length > 1
        ? ` · 目标 ${playback.targetOrdinal + 1}/${prepared.attack.targets.length}`
        : "";
      const phaseStatus = playback.phase === "impact-repeat"
        ? `受击 ${playback.phaseFrameIndex + 1}/${playback.impactFrameCount}`
        : `首轮 ${playback.localFrameIndex + 1}/${playback.clipFrameCount}`;
      return `正在播放 ${sourceLabel}${
        targetStatus
      } · ${phaseStatus} · 总帧 ${
        playback.frameIndex + 1
      }/${totalFrameCount}`;
    };
    let index = 0;
    drawPrepared(target, prepared, index);
    updateStatus(target, playbackStatus(index));
    const timer = startNesFrameClock({
      standard: state.battleVideoStandard,
      frameCount: totalFrameCount,
      shouldContinue: () => target.isConnected
        && paintTokens.get(target) === token,
      onFrame: nextIndex => {
        index = nextIndex;
        drawPrepared(target, prepared, index);
        updateStatus(target, playbackStatus(index));
      },
      onComplete: advanceMessage,
    });
    playbackTimers.set(target, timer);
    return true;
  } catch (error) {
    editorLog.error("预览", `操作失败：${error?.message || error}`, error);
    if (paintTokens.get(target) !== token || !target.isConnected) return false;
    target.dataset.battleSceneComposerError = String(error?.message || error);
    updateStatus(target, `攻击模拟失败：${error?.message || error}`, true);
    return false;
  }
}
