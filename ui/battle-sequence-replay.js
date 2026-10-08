// @editor-module 通用战斗时间线的播放、暂停、单步及证据展示。

import {editorLog} from "../core/editor-log.js";
import {esc} from "../core/dom.js";
import {db} from "../core/project-db.js";
import {battleSequenceStep} from "../core/battle-sequence-replay.js";
import {paintBattleSceneComposerCanvas, paintBattleSceneComposerFrame} from "../render/battle-scene-composer.js";

export function battleSequenceReplayMarkup({split = false} = {}) {
  if (split) return `<section class="battle-sequence-replay battle-sequence-replay--split" data-battle-sequence-replay>
    <div class="battle-sequence-replay-visual" role="region" aria-label="战斗回放画面">
      <h3 data-battle-sequence-title>战斗回放</h3>
      <canvas width="256" height="240" data-battle-sequence-canvas aria-label="战斗时间线画面"></canvas>
      <p data-battle-sequence-exit hidden>战斗画面已结束；场景画面尚未接入回放。</p>
      <div class="battle-sequence-replay-controls">
        <button type="button" data-battle-sequence-play>播放</button>
        <button type="button" data-battle-sequence-step>下一步</button>
        <label>跳到步骤 <select data-battle-sequence-jump></select></label>
      </div>
    </div>
    <section class="battle-sequence-replay-detail" aria-label="战斗回放步骤说明">
      <p data-battle-sequence-event></p>
      <dl data-battle-sequence-facts></dl>
      <p class="battle-sequence-replay-missing" data-battle-sequence-missing></p>
    </section>
  </section>`;
  return `<section class="battle-sequence-replay" data-battle-sequence-replay>
    <h3 data-battle-sequence-title>战斗回放</h3>
    <div class="battle-sequence-replay-body">
      <canvas width="256" height="240" data-battle-sequence-canvas aria-label="战斗时间线画面"></canvas>
      <p data-battle-sequence-exit hidden>战斗画面已结束；场景画面尚未接入回放。</p>
      <div class="battle-sequence-replay-detail">
        <div class="battle-sequence-replay-controls">
          <button type="button" data-battle-sequence-play>播放</button>
          <button type="button" data-battle-sequence-step>下一步</button>
          <label>跳到步骤 <select data-battle-sequence-jump></select></label>
        </div>
        <p data-battle-sequence-event></p>
        <dl data-battle-sequence-facts></dl>
        <p class="battle-sequence-replay-missing" data-battle-sequence-missing></p>
      </div>
    </div>
  </section>`;
}

/** timeline={id,title,formationId,bgm,romBasis,steps:[{frame,event,messageRecordId,statusWindow,evidence,missing,enemyEvents,party,attack}]} */
export function bindBattleSequenceReplay(root, {timeline, project}) {
  if (!root || root.dataset.battleSequenceBound) return;
  const canvas = root.querySelector("[data-battle-sequence-canvas]");
  const jump = root.querySelector("[data-battle-sequence-jump]");
  const play = root.querySelector("[data-battle-sequence-play]");
  let index = 0;
  let timer = null;
  let generation = 0;
  let playing = false;
  let playbackId = 0;
  let paintPromise = Promise.resolve();
  const stop = () => {
    playing = false;
    playbackId += 1;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    play.textContent = "播放";
  };
  const show = async next => {
    index = Math.max(0, Math.min(timeline.steps.length - 1, next));
    const token = ++generation;
    const {step, preview} = battleSequenceStep(timeline, index, project);
    jump.value = String(index);
    root.dataset.battleSequenceStep = String(index);
    root.dataset.battleSequenceFrame = String(step.frame);
    root.dataset.battleSequencePainted = "pending";
    root.querySelector("[data-battle-sequence-event]").textContent =
      `步骤 ${index + 1}/${timeline.steps.length} · Mesen 第 ${step.frame} 帧 · ${step.event}`;
    root.querySelector("[data-battle-sequence-facts]").innerHTML = [
      ["Mesen 消息", step.message || "未观察"],
      ["Mesen 数值", step.hp || "未读取"],
      ["消息记录", step.messageRecordId || "该帧无正文记录"],
      ["行动模式", step.actionPatternHandle || "未观察"],
      ["敌方行动", step.actionHandle || "未观察"],
      ["结果脚本", step.resultScriptHandle || "未观察"],
      ["攻击视觉", step.attackVisualHandle || "未观察"],
      ["状态窗", step.statusWindow
        ? `${step.statusWindow.label} ${step.statusWindow.value}（Mesen 观察值）` : "未观察到数值"],
      ["BGM", step.bgm ?? timeline.bgm ?? "未确认"],
      ["ROM 依据", step.romBasis ?? timeline.romBasis ?? "未确认"],
      ["帧依据", step.evidence || "未确认"],
    ].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    const missing = [...(step.missing || [])];
    const missingHost = root.querySelector("[data-battle-sequence-missing]");
    missingHost.textContent = missing.length ? `画面尚缺解码：${missing.join("；")}` : "";
    const ended = step.phase === "exit";
    canvas.hidden = ended;
    root.querySelector("[data-battle-sequence-exit]").hidden = !ended;
    if (ended) {
      root.dataset.battleSequencePainted = "false";
      return;
    }
    delete canvas.dataset.battleSceneComposerPainted;
    let messageAction = null;
    if (step.actionHandle && step.messageRecordId) {
      const actions = await db.getDocument("enemy-action", null);
      messageAction = actions?.records?.find(item => item.handle === step.actionHandle
        && item.fields?.message?.reference === step.messageRecordId) || null;
    }
    if (token !== generation || !root.isConnected) return;
    const painted = await paintBattleSceneComposerCanvas(canvas, {project, preview,
      messageAction, messageRecordId: step.messageRecordId ?? null,
      messageWindowState: step.messageWindowState || null,
      messageRuntime: step.messageRuntime || null,
      statusWindow: step.statusWindow || null,
      messageSequence: step.messageSequence || null});
    if (token !== generation || !root.isConnected) return;
    const visual = Number.isInteger(step.attackFrameIndex)
      ? paintBattleSceneComposerFrame(canvas, step.attackFrameIndex) : null;
    const note = canvas.dataset.battleSceneComposerError
      || (step.messageRecordId ? canvas.dataset.battleSceneWindowNote : "");
    if (note) missingHost.textContent = `画面尚缺解码：${[...missing, note].join("；")}`;
    if (visual === false) missingHost.textContent =
      `画面尚缺解码：${[...missing, "本次攻击剪辑帧不可用"].join("；")}`;
    root.dataset.battleSequencePainted = String(painted && visual !== false);
  };
  const display = next => {
    paintPromise = show(next).catch(error => {
      editorLog.error("字段编辑", `操作失败：${error?.message || error}`, error);
      root.dataset.battleSequencePainted = "false";
      root.querySelector("[data-battle-sequence-missing]").textContent =
        `画面尚缺解码：${error.message}`;
    });
    return paintPromise;
  };
  root.querySelector("[data-battle-sequence-title]").textContent = timeline.title;
  jump.innerHTML = timeline.steps.map((step, i) =>
    `<option value="${i}">${i + 1} · ${esc(step.event)} · ${step.frame}</option>`).join("");
  const queueNext = id => {
    const pending = paintPromise;
    void pending.then(() => {
      if (id !== playbackId) return;
      if (!playing || !root.isConnected || root.dataset.battleSequencePainted === "false") {
        stop(); return;
      }
      if (index === timeline.steps.length - 1) {stop(); return;}
      timer = setTimeout(() => {
        timer = null;
        if (id !== playbackId) return;
        if (!playing || !root.isConnected) {stop(); return;}
        void display(index + 1);
        queueNext(id);
      }, 1200);
    });
  };
  play.addEventListener("click", () => {
    if (playing) {stop(); return;}
    playing = true;
    const id = ++playbackId;
    play.textContent = "暂停";
    if (index === timeline.steps.length - 1) {
      void display(0);
    }
    queueNext(id);
  });
  root.querySelector("button[data-battle-sequence-step]").addEventListener("click", () => {
    stop(); void display(index + 1);
  });
  jump.addEventListener("change", () => {stop(); void display(Number(jump.value));});
  root.dataset.battleSequenceBound = "1";
  void display(0);
}
