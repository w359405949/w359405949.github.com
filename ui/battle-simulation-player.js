// @editor-module 战斗演算步骤、攻击帧与实机对照的播放控件。
import {editorLog} from "../core/editor-log.js";
import {esc} from "../core/dom.js";
import {battleSimulationScene} from "../render/battle-simulation-scene.js";
import {battleSimulationInput, prepareBattleSimulationSave} from "../core/battle-simulation-input.js";
import {db} from "../core/project-db.js";
import {state} from "../core/state.js";
import {compareBattleTrace} from "../core/battle-simulation-comparison.js";
import {simulateBattle, BATTLE_SIMULATION_RULES} from "../render/battle-simulation.js";
import {prepareBattleSceneComposerPlayback, restoreBattleSceneComposerPlayback, prepareBattleSceneComposerSources} from "../render/battle-scene-composer.js";
import {nesFrameDurationMs} from "../core/nes-video-standard.js";
import {prepareBattleSimulationStatus} from "../render/battle-simulation-status.js";
import {battleSequenceReplayMarkup, bindBattleSequenceReplay} from "./battle-sequence-replay.js";
import {battleScenePartyVehicle, battleScenePreviewCatalog, resolveBattleSceneAttack} from "../core/battle-scene-preview.js";
import {screenWorkbench, screenWorkbenchCanvasStage, bindScreenWorkbenchZoom} from './screen-workbench.js';
import {paintUiConstructionSemanticPreview} from '../modules/visual/ui-construction-preview.js';
import {battleMessageExecution, BATTLE_MESSAGE_EVIDENCE} from '../render/battle-message-state-machine.js';
import {fieldSubmenuCodeValues, fieldSubmenuCodeValue} from '../core/field-submenu-code-sources.js';
import {InterfacePreviewSession} from '../render/interface-state-preview.js';
import {battleResultExecution} from '../render/battle-result-state-machine.js';

export function battleSimulationMarkup({singleAction = false, interfaceScene = false, pageId = '', workbench = {}} = {}) {
  if (interfaceScene) return screenWorkbenchCanvasStage({namespace: 'battle-interface', sizing: 'fill',
      attributes: {'data-battle-simulation': '', 'data-interface-scene': ''},
      canvasMarkup: `<canvas width="256" height="240" data-simulation-canvas data-interface-page-workbench="${esc(pageId)}" aria-label="战斗界面预览"></canvas>`,
      footerMarkup: '<p data-simulation-error role="status"></p>'});
  if (singleAction) return `<section data-battle-simulation data-single-action>
    ${screenWorkbenchCanvasStage({namespace: 'battle-action', sizing: 'fill',
      canvasMarkup: '<canvas width="256" height="240" data-simulation-canvas aria-label="单次行动战斗预览"></canvas>',
      viewportClassName: 'battle-test-canvas-viewport', footerMarkup: `<div class="battle-sequence-replay-controls">
      <button class="button" type="button" data-simulation-play disabled>播放</button>
      <button class="button" type="button" data-simulation-step disabled>下一帧</button>
    </div>
    <label class="simulation-progress">行动进度 <output data-simulation-position></output>
      <input type="range" min="0" max="0" value="0" data-simulation-progress disabled>
    </label>
    <label data-single-action-outcome hidden>结果预览 <select data-single-action-outcome-choice></select></label>
    <p data-simulation-event></p><p data-simulation-error role="status"></p>`})}
  </section>`;
  return screenWorkbench({namespace: 'battle-simulation', heightMode: 'fill', ...workbench,
    attributes: {...workbench.attributes, 'data-battle-simulation': ''},
    stageMarkup: screenWorkbenchCanvasStage({namespace: 'battle-simulation', sizing: 'fill',
      className: 'battle-sequence-replay-visual', attributes: {'aria-label': '战斗演算画面'},
      viewportClassName: 'simulation-canvas-viewport',
      canvasMarkup: '<canvas width="256" height="240" data-simulation-canvas></canvas>',
      footerMarkup: `<div class="battle-sequence-replay-controls">
        <button class="button" type="button" data-simulation-generate>生成</button>
        <button class="button" type="button" data-simulation-play>播放</button>
        <button class="button" type="button" data-simulation-step>下一步</button>
        <label>种子 <input type="number" min="0" max="65535" value="62880" data-simulation-seed></label>
      </div>
      <div class="simulation-progress">
        <label><span>战斗进度 <span class="simulation-progress-legend">▲ 攻击 · ● 命中 · ◆ 弃车 · ■ 结束</span></span><output data-simulation-position></output>
          <input type="range" min="0" max="0" value="0" step="1" aria-label="战斗进度" data-simulation-progress disabled>
        </label>
        <div class="simulation-progress-markers" data-simulation-markers aria-label="关键事件"></div>
      </div>
      <div class="battle-sequence-replay-controls" data-simulation-result hidden style="display:none">
        <button class="button" type="button" data-simulation-result-input="a">A</button>
        <button class="button" type="button" data-simulation-result-input="b">B</button>
        <span data-simulation-result-status></span>
      </div>
    `}),
    bottomMarkup: `<section class="battle-sequence-replay-detail">
      <label>查看 <select data-simulation-mode><option value="simulation">演算步骤</option><option value="comparison">实机对照</option></select></label>
      <p data-simulation-event></p>
      <dl data-simulation-facts></dl>
      <p data-simulation-error role="status"></p>
      <details class="simulation-basis"><summary>规则依据与演算说明</summary><p data-simulation-rule-step></p><div data-simulation-basis></div></details>
      <div data-simulation-details>
        <table class="simulation-table"><thead><tr><th>行动方</th><th>行动</th><th>目标</th><th>结算量</th><th>HP</th></tr></thead><tbody data-simulation-log></tbody></table>
      </div>
      <div data-simulation-comparison hidden>
        <table class="simulation-table"><thead><tr><th>实机步骤／帧</th><th>实机事件／消息／HP／护罩</th><th>演算步骤／事件／消息／HP／护罩</th><th>消息／HP／护罩 一致</th></tr></thead><tbody data-simulation-comparison-rows></tbody></table>
        <details data-simulation-trace><summary>查看实机时间线回放</summary>${battleSequenceReplayMarkup()}</details>
      </div>
    </section>`,
  });
}

const displayText = value => String(value || "—")
  .replace(/^enemy-action:[^ ]+ · /u, "")
  .replace(/（(?:含)?占位[^）]*）/gu, "");
const actorValues = step => step.actors.map(actor => `${actor.label} HP ${actor.hp}`
  + (actor.riding && actor.vehicle ? `；SP ${actor.vehicle.sp}` : '')
  + (actor.maxShield > 0 ? `；护罩 ${actor.shield}` : "")).join("；");
const targetValues = step => step.targetLabel || (step.targets || [])
  .map(id => step.actors.find(actor => actor.id === id)?.label || "—").join("、") || "—";
const eventMarker = step => step.actors.some((actor, i) => actor.riding === false && step.previousActors?.[i]?.riding)
  || /弃车/u.test(step.event) ? ["dismount", "◆", "弃车"]
  : ({attack: ["attack", "▲", "攻击"], damage: ["hit", "●", "命中"],
    end: ["end", "■", "结束"]}[step.kind] || null);

function simulationMarkerGroups(steps, width) {
  const groups = [], common = new Map(), rareLanes = [];
  const distance = 20, last = Math.max(1, steps.length - 1);
  for (const [index, step] of steps.entries()) {
    const marker = eventMarker({...step, previousActors: steps[index - 1]?.actors});
    if (!marker) continue;
    const [kind, symbol, label] = marker, percent = index * 100 / last, x = percent * width / 100;
    const ordinary = kind === "attack" || kind === "hit", previous = common.get(kind);
    if (ordinary && previous && x - previous.x < distance) {
      previous.indices.push(index);
      continue;
    }
    let lane = kind === "attack" ? 0 : 1;
    if (!ordinary) {
      let slot = rareLanes.findIndex(previousX => x - previousX >= distance);
      if (slot < 0) slot = rareLanes.length;
      rareLanes[slot] = x;
      lane = slot + 2;
    }
    const group = {kind, symbol, label, percent, x, lane, indices: [index]};
    groups.push(group);
    if (ordinary) common.set(kind, group);
  }
  return groups;
}

function animateBattleClip({clip, canvas, frameDuration = 1000 / 60, minimumFrames = 0,
  startedAt = performance.now(), current, onFrame = () => {}, onElapsed = () => true,
  readyToComplete = () => true, onComplete, schedule}) {
  let lastFrame = 0;
  clip.paint(canvas, 0);
  onFrame(0);
  const duration = Math.max(1, clip.frameCount, minimumFrames) * frameDuration;
  const tick = time => {
    if (!current()) return;
    const elapsed = Math.max(0, time - startedAt);
    const frame = Math.min(Math.max(0, clip.frameCount - 1), Math.floor(elapsed / frameDuration));
    if (frame !== lastFrame) {clip.paint(canvas, frame); onFrame(frame); lastFrame = frame;}
    if (onElapsed(Math.floor(elapsed / frameDuration)) === false) return;
    if (elapsed < duration || !readyToComplete()) schedule(requestAnimationFrame(tick));
    else onComplete(Math.max(startedAt + duration, time));
  };
  schedule(requestAnimationFrame(tick));
}

async function bindSingleAction(root, {project, preview, isCurrent}) {
  const saveStarted = performance.now();
  const save = await prepareBattleSimulationSave();
  root.dataset.simulationSaveMs = String(performance.now() - saveStarted);
  const canvas = root.querySelector("[data-simulation-canvas]");
  const play = root.querySelector("[data-simulation-play]");
  const next = root.querySelector("[data-simulation-step]");
  const progress = root.querySelector("[data-simulation-progress]");
  const errorHost = root.querySelector("[data-simulation-error]");
  const outcome = root.querySelector("[data-single-action-outcome-choice]");
  let clip, generation = 0, timer, frame = 0;
  let sourceKey = "", outcomeId = "";
  const stop = () => {generation++; cancelAnimationFrame(timer); play.textContent = "播放";};
  const position = value => {
    frame = Math.min(Math.max(0, clip.frameCount - 1), value);
    progress.value = String(frame);
    root.querySelector("[data-simulation-position]").textContent = `${frame + 1} / ${Math.max(1, clip.frameCount)}`;
    root.dataset.simulationPainted = "true";
  };
  const paint = value => {position(value); clip.paint(canvas, frame);};
  const start = () => {
    stop();
    const token = generation;
    play.textContent = "暂停";
    animateBattleClip({clip, canvas, frameDuration: nesFrameDurationMs(state.battleVideoStandard),
      current: () => {
        if (!isCurrent()) {stop(); clip.dispose(); return false;}
        return generation === token;
      }, onFrame: position, onComplete: stop, schedule: value => {timer = value;}});
  };
  const update = async ({project: nextProject = project, preview: nextPreview = preview, autoplay = false} = {}) => {
    stop();
    project = nextProject; preview = nextPreview;
    const token = generation;
    play.disabled = next.disabled = progress.disabled = true;
    root.dataset.simulationReady = "false";
    errorHost.textContent = "准备播放画面…";
    try {
      const attack = resolveBattleSceneAttack(preview, project);
      if (sourceKey !== attack.source?.key) {sourceKey = attack.source?.key; outcomeId = "";}
      const saveSlot = save.fields.find("save.directory.selected_slot")?.value === 2 ? 2 : 1;
      const member = preview.party[attack.side === "party" ? attack.attackerIndex : preview.attack.partyTarget];
      const vehicle = member?.riding ? battleScenePartyVehicle(battleScenePreviewCatalog(project), member) : null;
      const role = save.initialRoles[member?.roleId];
      const hp = save.fields.find(`save.slot.${saveSlot}.role.${role?.slug}.current_hp`)?.value;
      const sp = vehicle ? save.fields.find(`save.slot.${saveSlot}.vehicle.${vehicle.preset.vehicle_slot}.sp`)?.value : null;
      const started = performance.now();
      const prepared = await prepareBattleSceneComposerPlayback({project, preview, phase: "single-action",
        sources: {saveFields: save.fields},
        messageSaveSlot: saveSlot, messageOutcomeId: outcomeId,
        messageActor: {kind: "role", id: member?.roleId},
        statusWindow: hp == null ? null : {label: "HP", value: hp,
          secondary: sp == null ? null : {label: "SP", value: sp}}});
      if (token !== generation || !isCurrent()) {prepared.dispose(); return;}
      clip?.dispose(); clip = prepared;
      outcome.closest("label").hidden = !clip.outcomes.length;
      outcome.innerHTML = `<option value="">请选择</option>${clip.outcomes.map(item =>
        `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join("")}`;
      outcome.value = outcomeId;
      progress.max = String(Math.max(0, clip.frameCount - 1));
      root.querySelector("[data-simulation-event]").textContent = attack.source?.label || "";
      errorHost.textContent = attack.available ? "" : attack.reason || "";
      play.disabled = next.disabled = progress.disabled = false;
      root.dataset.simulationReady = "true";
      paint(0);
      root.dataset.simulationClipsMs = String(performance.now() - started);
      if (autoplay) start();
    } catch (error) {
      if (token === generation && isCurrent()) {
        editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
        errorHost.textContent = error.message; root.dataset.simulationPainted = "false";
      }
    }
  };
  play.addEventListener("click", () => play.textContent === "暂停" ? stop() : start());
  next.addEventListener("click", () => {stop(); paint(frame + 1);});
  progress.addEventListener("input", () => {stop(); paint(Number(progress.value));});
  outcome.addEventListener("change", () => {outcomeId = outcome.value; void update({autoplay: true});});
  root.dataset.simulationBound = "1";
  await update();
  return {update};
}

export async function bindBattleSimulation(root, {project, preview, trace, encounter = {}, onComplete, onError, onMessageState,
  interfaceFrame = null, isCurrent = () => root.isConnected}) {
  const navigation = state.navigationGeneration;
  const currentPage = () => root?.isConnected && isCurrent() && navigation === state.navigationGeneration;
  const workbench = root?.closest('[data-screen-workbench]');
  if (workbench) bindScreenWorkbenchZoom({namespace: workbench.dataset.screenWorkbench,
    root: workbench.parentElement});
  if (root?.hasAttribute('data-interface-scene')) {
    const canvas = root.querySelector('[data-simulation-canvas]');
    const overlay = document.createElement('canvas');
    await paintUiConstructionSemanticPreview(overlay, interfaceFrame, {isCurrent: currentPage});
    if (!currentPage()) return;
    const clip = await prepareBattleSceneComposerPlayback({project, preview, phase: 'interface',
      paintOverlay: surface => surface.getContext('2d').drawImage(overlay, 0, 144, 256, 96, 0, 144, 256, 96)});
    if (!currentPage()) {clip.dispose(); return;}
    clip.paint(canvas, 0); clip.dispose();
    canvas.uiResolvedPreview = overlay.uiResolvedPreview;
    canvas.uiDrawnComponents = overlay.uiDrawnComponents;
    canvas.uiComponentSlots = overlay.uiComponentSlots;
    canvas.uiTextSlotProgress = overlay.uiTextSlotProgress;
    root.querySelector('[data-simulation-error]').textContent = overlay.uiTextSlotProgress?.reason || '';
    root.dataset.simulationReady = root.dataset.simulationPainted = 'true';
    canvas.dispatchEvent(new CustomEvent('ui-preview-painted'));
    return;
  }
  if (root?.hasAttribute("data-single-action")) return bindSingleAction(root, {project, preview, isCurrent: currentPage});
  if (!root || root.dataset.simulationBound) return;
  root.dataset.simulationBound = "1";
  const canvas = root.querySelector("[data-simulation-canvas]");
  const progress = root.querySelector("[data-simulation-progress]");
  const position = root.querySelector("[data-simulation-position]");
  const log = root.querySelector("[data-simulation-log]");
  const play = root.querySelector("[data-simulation-play]");
  const generate = root.querySelector("[data-simulation-generate]");
  const seedInput = root.querySelector("[data-simulation-seed]");
  const errorHost = root.querySelector("[data-simulation-error]");
  const markers = root.querySelector("[data-simulation-markers]");
  const comparisonOption = root.querySelector('[data-simulation-mode] option[value="comparison"]');
  comparisonOption.disabled = !trace?.steps;
  root.querySelector('[data-simulation-trace]').hidden = !trace?.steps;
  let playbackPreview = preview;
  let result, prepared = [], rows = [], index = 0, generation = 0, playing = false, timer = null;
  let markerWidth = 0;
  let preparing = false, messageConfig = {}, preparation = 0;
  let messageAdapter = null, messageState = null, stepFinished = false, pendingNext = false;
  const completed = new Set();
  const publishMessage = () => {
    const execution = messageState?.execution;
    root.dataset.simulationMessageStatus = execution?.status || '';
    root.dataset.simulationMessageWait = execution?.wait?.kind || '';
    root.dataset.simulationMessageWindow = String(messageState?.windows[0]?.instance || '');
    if (execution?.status === 'unknown') {
      errorHost.textContent = execution.reason; playing = false; play.textContent = '播放';
    }
    onMessageState?.(messageState && structuredClone(messageState));
  };
  const messageInput = type => {
    if (!messageState) return;
    messageAdapter.advance(messageState, {type}); publishMessage();
  };
  root.addEventListener('battle-message-input', event => messageInput(event.detail.type));
  const frameDuration = nesFrameDurationMs("ntsc");
  const renderMarkers = () => {
    markerWidth = markers.getBoundingClientRect().width;
    if (!result || !markerWidth) return;
    const groups = simulationMarkerGroups(result.steps, markerWidth);
    markers.style.height = `${Math.max(3, ...groups.map(group => group.lane + 1)) * 14 + 2}px`;
    markers.innerHTML = groups.map(group => {
      const first = group.indices[0], multiple = group.indices.length > 1;
      const title = group.indices.map(i => `步骤 ${i + 1} · ${displayText(result.steps[i].event)}`).join("\n")
        + (multiple ? `\n${group.label}共 ${group.indices.length} 步；点击定位步骤 ${first + 1}` : "");
      const label = `步骤 ${group.indices.map(i => i + 1).join("、")} · ${group.label}`
        + (multiple ? `；点击定位步骤 ${first + 1}` : "");
      return `<button type="button" class="simulation-marker simulation-marker--${group.kind}${multiple ? " is-grouped" : ""}"
        style="left:${group.percent}%;top:${group.lane * 14}px" data-simulation-seek="${first}"
        title="${esc(title)}" aria-label="${esc(label)}">${group.symbol}</button>`;
    }).join("");
  };
  const markerObserver = new ResizeObserver(() => {
    if (!currentPage()) {markerObserver.disconnect(); return;}
    if (markers.getBoundingClientRect().width !== markerWidth) renderMarkers();
  });
  markerObserver.observe(markers);
  const stop = () => {playing = false; generation++; cancelAnimationFrame(timer); timer = null; play.textContent = "播放";};
  const disposeClips = items => new Set(items.map(item => item.clip)).forEach(clip => clip.dispose());
  let resultSession = null, resultAdapter = null;
  const resultHost = root.querySelector('[data-simulation-result]');
  const paintResult = async () => {
    const snapshot = resultSession.state;
    const phase = snapshot.node.split('.').at(-1);
    root.dataset.simulationResult = phase;
    resultHost.querySelector('[data-simulation-result-status]').textContent = (result.completion.unconfirmed || []).join('；');
    const source = project.ui.construction.menu_dispatch_data.previews.find(row => row.id === `constructor:battle-result-${phase}`);
    await paintUiConstructionSemanticPreview(canvas, {...source, battle_result_execution: snapshot},
      {isCurrent: () => currentPage() && resultSession?.state === snapshot});
  };
  const finish = async () => {
    if (!onComplete || resultSession) return;
    resultAdapter = battleResultExecution(result.completion);
    resultSession = new InterfacePreviewSession(resultAdapter.initial({fields: encounter.fields,
      context: {slot: encounter.saveSlot, scene: encounter.scene}, returnStack: [{caller: 'battle'}]}));
    if (resultSession.state.execution.status !== 'waiting') {
      onComplete(structuredClone(result)); return;
    }
    resultHost.hidden = false;
    resultHost.style.display = 'flex';
    play.disabled = progress.disabled = root.querySelector('[data-simulation-step]').disabled = true;
    await paintResult();
  };
  for (const button of resultHost.querySelectorAll('[data-simulation-result-input]')) button.addEventListener('click', () => {
    if (!resultSession || resultSession.state.execution.status !== 'waiting') return;
    resultSession.advance({type: button.dataset.simulationResultInput}, resultAdapter);
    if (resultSession.state.execution.status === 'returned') {
      resultHost.hidden = true; resultHost.style.display = 'none'; onComplete(structuredClone(result));
    } else void paintResult().catch(error => {errorHost.textContent = error.message;});
  });
  const prepareStep = async (step, stepIndex, statusRenderer, clips, catalog, sources, templates) => {
    const facts = [
      ["行动方", step.actorLabel || "—"], ["行动", displayText(step.action || step.event)],
      ["目标", targetValues(step)],
      ["结算量", step.settled ?? "—"], ["HP", actorValues(step)],
      ...(step.resources ? [[step.resources.label, `${step.resources.displayBefore} → ${step.resources.displayAfter}`]] : []),
      ...step.actors.filter(actor => actor.side === "party").flatMap(actor => [
        ["速度", `${actor.speed} · ${actor.inputSources?.speed || "—"}`],
        [actor.riding ? "驾驶技能" : "战斗技能", `${actor.attackSkill} · ${actor.inputSources?.[actor.riding ? 'driving_skill' : 'battle_skill'] || "—"}`],
        ...(step.kind === "story-return" ? [["恢复 HP", `${actor.hp} · ${actor.inputSources?.current_hp || "—"}`]] : []),
      ]),
    ].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    const ruleStep = [
      `当前步骤规则：${step.rules.map(key => BATTLE_SIMULATION_RULES[key].label).join("；") || "—"}`,
      `随机高位 ${step.random.high}、低位 ${step.random.low}、调用量 ${step.random.calls}`,
      `行动顺序：${step.queue?.map(row => `${row.label} ${row.score}`).join(" → ") || "—"}`,
      `未钳制量：${step.amount ?? "—"}`,
      ...step.actors.map(actor => `${actor.label} 护罩 ${actor.shield}、状态 ${actor.status}`),
      ...step.actors.filter(actor => actor.vehicle).map(actor => `${actor.label} SP ${actor.vehicle.sp}、战车状态 ${actor.vehicle.condition}、部件 ${actor.vehicle.parts.map(part => part.state).join('/')}`),
    ].join("；");
    const {scene, runtime, messageSequence, messageOutcomeId, enemyPaletteMonsterId, previousEnemyScene}
      = battleSimulationScene(project, playbackPreview, result.steps, stepIndex, catalog, templates);
    const paintStatus = await statusRenderer(step.actors, step.kind === "entry");
    const options = {preview: scene,
      messageRecordId: step.messageRecordId || null, messageRuntime: runtime, messageOutcomeId,
      messageSequence, phase: step.kind, presentation: step.presentation || 0,
      enemyPaletteMonsterId, previousEnemyScene};
    // 相同状态窗口与场景只在本次输入准备中共用播放投影。
    if (!clips.has(paintStatus)) clips.set(paintStatus, new Map());
    const scenes = clips.get(paintStatus), key = JSON.stringify(options);
    if (!scenes.has(key)) scenes.set(key,
      prepareBattleSceneComposerPlayback({...options, project, paintOverlay: paintStatus, catalog, sources}));
    const clip = await scenes.get(key);
    return {facts, ruleStep, clip};
  };
  const show = (next, startedAt = performance.now()) => {
    cancelAnimationFrame(timer);
    const token = ++generation;
    const windows = next === index + 1 && messageState?.execution.status === 'returned' ? messageState.windows : [];
    rows[index]?.classList.remove("is-current");
    rows[index]?.removeAttribute("aria-current");
    index = Math.max(0, Math.min(result.steps.length - 1, next));
    const step = result.steps[index], current = prepared[index];
    stepFinished = pendingNext = false;
    current.clip.paint(canvas, 0);
    const phase = current.clip.messagePhase;
    messageAdapter = step.messageRecordId ? battleMessageExecution({
      ...messageConfig,
      operations: phase ? [
        {kind: 'message', phase, evidence: BATTLE_MESSAGE_EVIDENCE,
          wait: step.kind === 'entry' ? {kind: 'input', confirmed: true, evidence: BATTLE_MESSAGE_EVIDENCE} : undefined},
        {kind: 'return', value: {confirmed: true, scope: 'message-phase'}, evidence: BATTLE_MESSAGE_EVIDENCE},
      ] : [{kind: 'boundary', missing: canvas.dataset.battleSceneWindowNote || '本次行动缺少已发布的消息阶段'}],
      resolveParameters: () => (canvas.dataset.battleSceneTextStates || '').split(',').every(value => value === 'complete')
        ? {status: 'available'} : {status: 'unavailable', reason: '本次行动正文或参数尚未完整确认'},
    }) : null;
    messageState = messageAdapter?.initial({context: {settings: messageConfig.settings}, windows}) || null;
    publishMessage();
    progress.value = String(index);
    position.textContent = `${index + 1} / ${result.steps.length}`;
    progress.setAttribute("aria-valuetext", `步骤 ${index + 1}：${displayText(step.event)}`);
    root.dataset.simulationStep = String(index);
    root.dataset.simulationAnimationFrames = String(current.clip.frameCount);
    root.dataset.simulationMessageFrames = String(messageState?.execution.wait?.frames || 0);
    root.querySelector("[data-simulation-event]").textContent = `步骤 ${index + 1}/${result.steps.length} · ${displayText(step.event)}`
      + (step.resources ? ` · ${step.resources.label}：${step.resources.displayBefore} → ${step.resources.displayAfter}` : '');
    root.querySelector("[data-simulation-facts]").innerHTML = current.facts;
    root.querySelector("[data-simulation-rule-step]").textContent = current.ruleStep;
    rows[index].classList.add("is-current");
    rows[index].setAttribute("aria-current", "step");
    const viewport = log.closest("[data-simulation-details]");
    const rowRect = rows[index].getBoundingClientRect(), viewRect = viewport.getBoundingClientRect();
    const headerHeight = log.closest("table").tHead.getBoundingClientRect().height;
    if (rowRect.top < viewRect.top + headerHeight || rowRect.bottom > Math.min(viewRect.bottom, window.innerHeight))
      viewport.scrollTop += rowRect.top - viewRect.top - headerHeight;
    root.dataset.simulationPainted = "true";
    let elapsedFrames = 0;
    animateBattleClip({clip: current.clip, canvas, frameDuration, startedAt,
      onElapsed: frames => {
        if (!messageState) return true;
        const status = messageState.execution.status;
        messageAdapter.advance(messageState, {type: 'frames', frames: frames - elapsedFrames});
        elapsedFrames = frames;
        if (status !== messageState.execution.status) publishMessage();
        return messageState.execution.status !== 'unknown';
      },
      readyToComplete: () => !messageState || messageState.execution.status === 'returned',
      current: () => {
        if (token !== generation) return false;
        if (!currentPage()) {stop(); disposeClips(prepared); prepared = []; return false;}
        return true;
      }, onComplete: endedAt => {
        stepFinished = true;
        if (index === 0 || completed.has(index - 1)) completed.add(index);
        if ((playing || pendingNext) && index < result.steps.length - 1) show(index + 1, endedAt);
        else {
          if (playing) stop();
          if (index === result.steps.length - 1 && completed.size === result.steps.length) void finish().catch(error => {
            errorHost.textContent = error.message; onError?.(error);
          });
        }
      }, schedule: value => {timer = value;}});
    if (messageState?.execution.status !== 'unknown') errorHost.textContent = '';
  };
  const rebuild = async ({force = false} = {}) => {
    if (preparing) return;
    preparing = true;
    stop();
    resultSession = null; resultHost.hidden = true; resultHost.style.display = 'none'; delete root.dataset.simulationResult;
    const token = generation, revision = ++preparation;
    const started = performance.now();
    disposeClips(prepared);
    prepared = [];
    completed.clear(); messageState = messageAdapter = null; publishMessage();
    play.disabled = true;
    generate.disabled = true;
    seedInput.disabled = true;
    generate.textContent = "生成 0%";
    progress.disabled = true;
    root.querySelector("[data-simulation-step]").disabled = true;
    root.dataset.simulationPainted = "pending";
    root.dataset.simulationReady = "false";
    errorHost.textContent = "";
    const pending = [];
    let persist = null;
    root.dataset.simulationSnapshotMs = root.dataset.simulationCacheWriteMs = "0";
    try {
      const cacheInput = {messageExecution: true, resultExecution: true, seed: Number(seedInput.value), preview, encounter};
      let cached = null;
      const cacheStarted = performance.now();
      try {cached = force ? null : await db.readPreviewCache("battle-simulation", cacheInput);} catch { /* 缓存不可读时重新生成。 */ }
      root.dataset.simulationCacheReadMs = String(performance.now() - cacheStarted);
      root.dataset.simulationCache = cached ? "hit" : force ? "forced" : "miss";
      const calculatedAt = performance.now();
      if (cached) {
        const clips = [];
        try {
          const form = await new Response(cached.data, {headers: {"Content-Type": cached.contentType}}).formData();
          const saved = JSON.parse(await form.get("steps").text());
          result = saved.result;
          playbackPreview = saved.preview;
          messageConfig = saved.messageConfig;
          const restored = await Promise.allSettled(saved.clips.map((clip, i) =>
            restoreBattleSceneComposerPlayback({...clip, image: form.get(`clip:${i}`)})));
          clips.push(...restored.filter(clip => clip.status === "fulfilled").map(clip => clip.value));
          const failed = restored.find(clip => clip.status === "rejected");
          if (failed) throw failed.reason;
          for (const row of saved.prepared) pending.push({...row, clip: clips[row.clip]});
        } catch {
          clips.forEach(clip => clip.dispose()); pending.length = 0; cached = null;
          root.dataset.simulationCache = "miss";
        }
      }
      root.dataset.simulationRestoreMs = String(cached ? performance.now() - calculatedAt : 0);
      root.dataset.simulationCalculationMs = "0";
      if (!cached) {
        const {sources} = await db.collectPreviewSources(async () => {
          const inputStarted = performance.now();
          const visualStarted = performance.now();
          const playbackSources = {actorRasters: new Map(), ready: prepareBattleSceneComposerSources().then(value => {
            root.dataset.simulationResourcesMs = String(performance.now() - visualStarted);
            return value;
          })};
          const savePromise = prepareBattleSimulationSave().then(save => {
            root.dataset.simulationSaveMs = String(performance.now() - inputStarted);
            return save;
          });
          const readStarted = performance.now();
          const [save, input] = await Promise.all([savePromise,
            battleSimulationInput(project, preview, db, savePromise, encounter), playbackSources.ready]);
          playbackPreview = input.preview;
          const overlays = await db.getResourceDocument("shared-indexed-byte-overlays", null);
          const slot = encounter.saveSlot ?? (save.fields.find("save.directory.selected_slot")?.value === 2 ? 2 : 1);
          const settingsField = `save.slot.${slot}.adventure_data_settings`;
          const settings = encounter.fields?.[settingsField] ?? save.fields.find(settingsField)?.value;
          const code = await fieldSubmenuCodeValues(['dialogue-wait-input-mask']);
          messageConfig = {settings, waitValues: overlays.level_value_codebook,
            inputMask: fieldSubmenuCodeValue(code, 'dialogue-wait-input-mask')};
          root.dataset.simulationInputReadMs = String(performance.now() - readStarted);
          root.dataset.simulationInputMs = String(performance.now() - inputStarted);
          const simulationStarted = performance.now();
          result = simulateBattle(input, {seed: Number(seedInput.value)});
          root.dataset.simulationCalculationMs = String(performance.now() - simulationStarted);
          const statusRenderer = await prepareBattleSimulationStatus(project);
          const clips = new Map();
          const clipsStarted = performance.now();
          const catalog = battleScenePreviewCatalog(project);
          const templates = await db.getDocument('project.ui.templates');
          for (const [stepIndex, step] of result.steps.entries()) {
            pending.push(await prepareStep(step, stepIndex, statusRenderer, clips, catalog, playbackSources, templates));
            generate.textContent = `生成 ${Math.round((stepIndex + 1) * 90 / result.steps.length)}%`;
            if (token !== generation || !currentPage()) return;
          }
          root.dataset.simulationClipsMs = String(performance.now() - clipsStarted);
        }, {includeLoaded: true});
        sources.push({kind: "save", id: "save-current"},
          ...["character-initial-record", "vehicle-preset", "fixed-text-slot"]
            .map(id => ({kind: "repository", id})));
        if (token !== generation || !currentPage()) {disposeClips(pending); return;}
        const write = await db.preparePreviewCache("battle-simulation", cacheInput, {sources});
        const savedResult = result, savedMessageConfig = messageConfig;
        const isCurrent = () => revision === preparation && currentPage();
        persist = async () => {
          if (!isCurrent()) return;
          root.dataset.simulationCacheWrite = "pending";
          try {
            const unique = [...new Set(pending.map(item => item.clip))];
            const form = new FormData(), savedClips = [];
            const snapshotStarted = performance.now();
            for (const [i, clip] of unique.entries()) {
              if (!isCurrent()) return;
              const snapshot = await clip.snapshot({isCurrent});
              if (!isCurrent() || !snapshot) return;
              const {image, ...descriptor} = snapshot;
              form.append(`clip:${i}`, image, `${i}.png`); savedClips.push(descriptor);
            }
            form.append("steps", new Blob([JSON.stringify({result: savedResult, preview: playbackPreview,
              messageConfig: savedMessageConfig, clips: savedClips,
              prepared: pending.map(item => ({...item, clip: unique.indexOf(item.clip)}))})],
              {type: "application/json"}), "steps.json");
            const response = new Response(form);
            root.dataset.simulationBackgroundSnapshotMs = String(performance.now() - snapshotStarted);
            const writeStarted = performance.now();
            const written = await write(await response.blob(),
              {contentType: response.headers.get("Content-Type"), isCurrent});
            root.dataset.simulationBackgroundCacheWriteMs = String(performance.now() - writeStarted);
            root.dataset.simulationCacheWrite = written ? "complete" : "obsolete";
          } catch (error) {
            if (isCurrent()) {
              editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
              root.dataset.simulationCacheWrite = "failed";
              errorHost.textContent = `缓存失败：${error.message}`;
            }
          }
        };
      }
      if (token !== generation || !currentPage()) {disposeClips(pending); return;}
      root.dataset.simulationResultSeed = String(result.seed);
      disposeClips(prepared);
      prepared = pending;
      progress.max = String(result.steps.length - 1);
      log.innerHTML = result.steps.map((step, i) => `<tr data-simulation-log-step="${i}">
        <td>${esc(step.actorLabel || "—")}</td><td><button type="button" data-simulation-seek="${i}">${i + 1} · ${esc(displayText(step.action || step.event))}</button></td>
        <td>${esc(targetValues(step))}</td><td>${step.settled ?? "—"}</td><td>${esc(actorValues(step))}</td></tr>`).join("");
      rows = [...log.rows];
      renderMarkers();
      const comparison = compareBattleTrace(result, trace);
      const keys = [...new Set(result.steps.flatMap(step => step.rules))];
      const missing = [...new Set(result.steps.flatMap(step => step.missing))];
      root.querySelector("[data-simulation-basis]").innerHTML = `<ul>${keys.map(key => {
        const rule = BATTLE_SIMULATION_RULES[key];
        return `<li>${esc(rule.label)}：${esc(rule.basis)}</li>`;
      }).join("")}${missing.map(value => `<li>${esc(value)}</li>`).join("")}</ul>
        <p>实机对照按回合、行动方、阶段与同类序号对齐；实机帧不作为演算时钟。</p>
        <p>消息按当前战斗信息速度等待；手动档接受确认输入后继续，未确认的正文、参数或等待规则停在当前阶段。</p>
        <ul>${comparison.map(row => `<li>实机步骤 ${row.index + 1}：${esc(row.reason)}</li>`).join("")}</ul>`;
      const same = value => value == null ? "—" : value ? "是" : "否";
      root.querySelector("[data-simulation-comparison-rows]").innerHTML = comparison.map(row => `<tr>
        <td>${row.index + 1}／${row.frame}</td><td>${esc(row.observed.event)}／${esc(row.observed.messageRecordId || "—")}／${esc(row.observed.hp || "—")}／${row.observed.shield ?? "—"}</td>
        <td>${row.calculated ? `${row.calculated.index + 1} · ${esc(displayText(row.calculated.event))}／${esc(row.calculated.messageRecordId || "—")}／${row.hp}／${row.shield}` : "无对应步骤"}</td>
        <td>${same(row.sameMessage)}／${same(row.sameHp)}／${same(row.sameShield)}</td></tr>`).join("");
      play.disabled = progress.disabled = root.querySelector("[data-simulation-step]").disabled = false;
      root.dataset.simulationReady = "true";
      show(0);
      root.dataset.simulationGenerationMs = String(performance.now() - started);
      if (persist) setTimeout(() => void persist(), 0);
    } catch (error) {
      disposeClips(pending);
      if (token === generation && revision === preparation && currentPage()) {
        editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
        errorHost.textContent = error.message; root.dataset.simulationPainted = "false";
        onError?.(error);
      }
    } finally {
      preparing = false;
      generate.disabled = seedInput.disabled = false;
      generate.textContent = "生成";
    }
  };
  play.addEventListener("click", () => {
    if (root.dataset.simulationReady !== "true") return;
    if (playing) {stop(); return;}
    playing = true; play.textContent = "暂停";
    show(index === result.steps.length - 1 ? 0 : index);
  });
  const seek = next => {if (root.dataset.simulationReady === "true") {stop(); show(next);}};
  root.querySelector("[data-simulation-step]").addEventListener("click", () => {
    if (root.dataset.simulationReady !== 'true' || messageState?.execution.status === 'unknown') return;
    if (stepFinished) seek(index + 1);
    else {pendingNext = true; messageInput('a');}
  });
  root.addEventListener("click", event => {
    const target = event.target.closest("[data-simulation-seek], [data-simulation-log-step]");
    if (target && root.contains(target)) seek(Number(target.dataset.simulationSeek ?? target.dataset.simulationLogStep));
  });
  progress.addEventListener("input", () => seek(Number(progress.value)));
  seedInput.addEventListener("change", () => void rebuild());
  generate.addEventListener("click", () => void rebuild({force: true}));
  root.querySelector("[data-simulation-mode]").addEventListener("change", event => {
    const comparison = event.target.value === "comparison";
    root.querySelector("[data-simulation-details]").hidden = comparison;
    root.querySelector("[data-simulation-comparison]").hidden = !comparison;
  });
  root.querySelector("[data-simulation-trace]").addEventListener("toggle", event => {
    if (event.target.open) bindBattleSequenceReplay(root.querySelector("[data-battle-sequence-replay]"),
      {timeline: {...trace, preview}, project});
  });
  await rebuild();
}
