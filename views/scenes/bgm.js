// @editor-module 场景音乐入口与试听。
import {editorLog} from "../../core/editor-log.js";
import {esc, hex} from "../../core/dom.js";
import {eventFlagTextMarkup} from '../../modules/save/event-flags.js';
import {state} from "../../core/state.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {sceneBgmItemsForProject} from "../../core/scene-entry-interactions.js";
import {prepareViewData} from "../../core/view-data.js";
import {createNesApuSynth} from "../../audio/synth.js";
import {ensureSequenceExecutions} from "../../audio/executions.js";
import {db} from "../../core/project-db.js";

let preview = null;

export function sceneBgmItems(sceneId, document) {
  return sceneBgmItemsForProject(sceneId, document, state.project.scenes, audioCommandLabel,
    db.peekResourceDocument(`scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, "0")}`, null));
}

export function renderSceneBgmInspector(item) {
  return `<div class="scene-object-editor scene-link-inspector"><h2>BGM · ${esc(item.label)}</h2>
    <p>${eventFlagTextMarkup(item.condition)}</p><p><a class="record-link" href="?view=audio&amp;record=${
      encodeURIComponent(`audio-command:${hex(item.id, 2).slice(2)}`)}" title="audio-command:${hex(item.id, 2).slice(2)}">${esc(audioCommandLabel(item.id))} ↗</a>
      <button type="button" class="button ghost" data-scene-bgm-play="${item.id}">试听</button></p>
    <small>${esc(item.evidence)}</small><p data-scene-bgm-status role="status" aria-live="polite"></p>
    <div data-scene-interaction-configurations="${esc(item.key)}"></div></div>`;
}

export async function bindSceneBgm() {
  const previous = preview;
  preview = null;
  if (previous) void previous.dispose();
  const status = document.querySelector("[data-scene-bgm-status]");
  const button = document.querySelector("[data-scene-bgm-play]");
  if (!button) return;
  const id = Number(button.dataset.sceneBgmPlay);
  const label = audioCommandLabel(id);
  button.disabled = true;
  if (status) status.textContent = `载入曲目 ${label}…`;
  try {
    await prepareViewData("audio");
    if (!button.isConnected) return;
    const audio = state.project.audio;
    if (!audio?.sequence_graph || !audio?.playback) throw new Error("缺少音频试听数据");
    await ensureSequenceExecutions(audio);
    if (!button.isConnected) return;
    const synth = createNesApuSynth(audio, {volume: 0.75, maxPreviewSeconds: 120,
      dpcmGatePolicy: "assume-open"});
    preview = synth;
    synth.subscribe(snapshot => {
      const active = ["rendering", "playing"].includes(snapshot.status);
      button.textContent = active ? "停止" : "试听";
      button.setAttribute("aria-pressed", String(active));
      if (!status) return;
      if (snapshot.status === "playing") status.textContent = `正在试听曲目 ${label}`;
      else if (snapshot.status === "rendering") status.textContent = `正在合成曲目 ${label}…`;
      else if (snapshot.status === "stopped") status.textContent = `已停止曲目 ${label}`;
      else if (snapshot.status === "ended") status.textContent = `试听完成 ${label}`;
      else if (["blocked", "unplayable", "error"].includes(snapshot.status)) {
        status.textContent = `试听失败：${snapshot.error || snapshot.reason || "无法播放"}`;
      } else status.textContent = "";
    });
    button.addEventListener("click", async () => {
      if (["rendering", "playing"].includes(synth.state.status)) {
        synth.stop();
        return;
      }
      try {
        // 点击直接启动 AudioContext，不在用户手势前等待取数或释放旧播放器。
        const result = await synth.playCommand(id, {
          maxSeconds: 120, dpcmGatePolicy: "assume-open",
        });
        if (!result.ok && result.status !== "cancelled") {
          throw new Error(result.error || result.reason || "无法播放");
        }
      } catch (error) {
        editorLog.error("场景", `操作失败：${error?.message || error}`, error);
        if (status) status.textContent = `试听失败：${error?.message || error}`;
      }
    });
    button.disabled = false;
  } catch (error) {
    editorLog.error("场景", `操作失败：${error?.message || error}`, error);
    if (button.isConnected && status) status.textContent = `试听失败：${error?.message || error}`;
  }
}
