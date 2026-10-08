// @editor-module 剧情播放 UI 与状态推进
import {showEditorError} from "../../ui/editor-error.js";
import {hydrateScenePositionPicker} from "../../modules/scene/components.js";
import {$, esc, hex} from "../../core/dom.js";
import {screenWorkbenchCanvasStage} from "../../ui/screen-workbench.js";
import {db} from "../../core/project-db.js";
import {ensureAudioSequenceData} from "../../core/view-data.js";
import {fileUrl} from "../../core/package-io.js";
import {recordUid} from "../../core/resource-index.js";
import {handleMarkup, handleTextMarkup as storyHandleTextMarkup} from "../../ui/handle.js";
import {storyScriptHandle, storyActorHandle, storyTextHandle, storyResourceMarkup,
  storyShotLabel, storyAudioLabel as audioCommandLabel} from "./handles.js";
import {state} from "../../core/state.js";
import {fieldChrAnimationPlaybackPhase} from "../../core/field-chr-animation.js";
import {battleFirstMonsterId, battleModeForPendingEventFlag} from "../../core/battle-mode.js";
import {resetToOriginalButton} from "../../ui/table.js";
import {hydrateModuleComponents} from "../../ui/module-components.js";
import {storyPageIoMarkup, bindStoryPageIo} from '../../ui/story-page-io.js';
import {bindStoryPageAuthoring, storyPageKeyEditorMarkup} from '../../modules/story/page-editor-controls.js';

// 这一栏一次只编辑一条剧情，恢复目标唯一；共用按钮仍要一个 itemId。
export const STORY_RESET_ITEM_ID = "cutscene";
import {
  storyPageDefinitionForView,
  storyPlaybackView,
} from "../../core/story-view-config.js";
import {storyClock, storyPlaybackScenarios} from "../../views/story/catalog.js";
import {
  buildStoryVmSequence,
  drawStoryFieldTileOverlay,
  storyAudioCommand,
  storyAudioControl,
  storyActorIsVisible,
  storyPartyRuntimeOverrides,
  storySnapshotActors,
  storyVmAllActorLists,
  storyBrowserVm,
  storyVmStage,
  storyVmSemanticsMap,
} from "../../views/story/vm.js";
import {
  bindStoryWorkbench,
  hydrateStorySceneOperands,
  syncStoryWorkbenchFrame,
  renderStoryWorkbench,
  storyEditableTimelineOperandFields,
  storyEditableWorkbenchView,
  storyVmSequencesForView,
  storyVmSelectedSequenceForView,
  storyTimelineObjectLabels,
  storyTimelineCommandEditor,
  hydrateStoryTimelineCommandEditor,
  storyWorkbenchMountState,
  restoreStoryWorkbenchMount,
} from "../../views/story/workbench.js";
import {textCatalogRecordSource} from "../../views/text/catalog.js";
import {
  paintUiEditorPreviewCanvas,
  uiJsRenderSources,
  uiDialogueRuntimeKey,
  uiPaintDialogueCanvas,
} from "../../modules/visual/ui-construction-preview.js";
import {
  VEHICLE_STATUS_DETAIL_SCREEN_ID,
  resolveEndingCreditsUiPreview,
  resolveStatusUiPreview,
  statusUiPreviewCanvas,
} from "../../views/status-ui.js";
import {storyInterfaceRuntime, storyInterfaceState} from "../../core/story-interface.js";
import {paintScenePreviewById, paintScenePreview, loadScenePreviewSourceById} from '../../modules/scene/preview.js';
import {paintWantedPreviewCanvas} from "../wanted.js";
import {
  ACTOR_ENTRY_TYPE_SELECTOR,
  actorPoseForAppearance,
  actorSpriteSheetUrl,
  actorSetBanks,
  peekActorAppearance,
} from "../../render/actor-atlas.js";
import {metaspriteStageSheetUrl, metaspriteStageOamCells} from "../../render/metasprite.js";
import {fieldPaletteSheetUrl} from "../../render/field-palette.js";
import {applyFieldSpriteLimit} from "../../render/field-oam.js";
import {
  storySceneLink,
  updateStorySceneLink,
} from "./scene-link.js";
import {
  bindTimelinePlayer,
  syncTimelinePlayer,
  timelinePlayer,
  syncTimelineTree,
} from "../../ui/timeline-player.js";
import {storyTimelineTree} from "./timeline-tree.js";
import {timelineSelectedBlocks} from "../../ui/timeline-tree.js";
import {storyExecutionTrace, storyActorObjectId} from "./trace.js";
import {bindStoryStage, disposeStoryStage, suspendStoryStage, resumeStoryStage,
  storyStageZoomMarkup, storyStageActorAttributes, syncStoryStageMap, syncStoryPlayerRegions} from "./stage.js";
import {createAudioTimelinePlayer} from "../../audio/timeline-player.js";
import {previewSoundEnabled} from "../../audio/preview-preference.js";
import {bindPreviewSound, previewSoundControl} from "../../ui/preview-sound.js";
import {bindResourceQueries, render} from "../../main.js";
import {storyTimelineSourceLanes} from "./timeline-lanes.js";
import {storyMovementTimingChanges} from '../../core/story-movement.js';
import {storyTimelineShortText, storyTimelineRowAddress,
  storyTimelineRowDetails, storyTimelineCurrentValues, storyTimelineCommandSummary} from "./timeline-rows.js";
import {storyTimelineRowId} from "../../core/story-timeline-row-id.js";
import {timelineViewportControls, timelineFrameAt, syncTimelineViewport} from '../../ui/timeline-viewport.js';
import {storyScriptStructureMarkup} from '../../modules/story/script-structure-controls.js';
import {syncStoryStageActors} from "./stage.js";
import {paintStorySceneDisplay} from '../../render/story-display-preview.js';
import {storyUsesSceneDisplay} from '../../core/story-display-preview.js';

const storyAudioPlayers = new WeakMap();
const storyTimelineModels = new Map();
const storyTimelineExpansions = new Map();
const storyPlaybackMarkup = new WeakMap();
const storyPlaybackControls = new WeakMap();
const storyTimelineViewports = new Map();
const storyAnimationSnapshots = new WeakMap();
const storyMounts = new Map();
const boundStoryTimelines = new WeakSet();
const completedStoryPlaybackStates = new WeakMap();
let mountedStory = null;
let storyMountGeneration = 0;

const storyMountKey = () => JSON.stringify([state.view, state.storyPageId, state.storySequenceId]);

function storyMountViewport(view) {
  let stage = null;
  try {stage = localStorage.getItem(`canvas-viewport:story:${view}`);} catch { /* 视口存储不可用时保留页内状态。 */ }
  return JSON.stringify([storyViewport(view), stage]);
}

function storyPlaybackState(stage) {
  const id = Number(stage.dataset.storyVmVariant);
  return {key: JSON.stringify([storyCardFrame(id), state.storyCardPaused.has(id),
    state.storyPlaying, state.storySpeed, state.storyTimelineRowId,
    stage.dataset.storySelectedNode, stage.dataset.storySelectedEvent]),
    saveBytes: state.saveCurrentBytes, saveSlot: state.savePageSlot};
}

function storyPlaybackStateMatches(stage) {
  const previous = completedStoryPlaybackStates.get(stage);
  const current = storyPlaybackState(stage);
  return previous && Object.keys(current).every(key => previous[key] === current[key]);
}

function disposeStoryMount(mount) {
  for (const stage of mount.nodes.flatMap(node => [...(node.querySelectorAll?.('[data-story-vm-variant]') || [])])) {
    storyAudioPlayers.get(stage)?.player.dispose();
    disposeStoryStage(stage);
  }
}

export function leaveStoryPlayback(content) {
  storyMountGeneration += 1;
  storyTimelineObjectListener?.abort();
  content.querySelectorAll('[data-story-vm-variant]').forEach(suspendStoryStage);
  if (!mountedStory) {
    for (const stage of content.querySelectorAll('[data-story-vm-variant]')) {
      if ([...storyMounts.values()].some(mount => mount.nodes.some(node => node.contains?.(stage)))) continue;
      storyAudioPlayers.get(stage)?.player.dispose();
      disposeStoryStage(stage);
    }
    return;
  }
  for (const stage of content.querySelectorAll('[data-story-vm-variant]')) {
    const audio = storyAudioPlayers.get(stage);
    audio?.player.stop();
    if (audio) audio.playing = false;
  }
  if (content.dataset.renderedView === mountedStory.view) {
    mountedStory.nodes = [...content.childNodes].filter(node => !node.matches?.('.page-head'));
    mountedStory.workbench = storyWorkbenchMountState();
    mountedStory.viewport = storyMountViewport(mountedStory.view);
    mountedStory.models = new Map(storyTimelineModels);
    mountedStory.heading = content.querySelector('[data-story-page-heading]');
    mountedStory.onclick = content.onclick;
    mountedStory.onkeydown = content.onkeydown;
    const previous = storyMounts.get(mountedStory.key);
    if (previous && previous !== mountedStory) disposeStoryMount(previous);
    storyMounts.delete(mountedStory.key);
    storyMounts.set(mountedStory.key, mountedStory);
    while (storyMounts.size > 2) {
      const key = storyMounts.keys().next().value;
      disposeStoryMount(storyMounts.get(key));
      storyMounts.delete(key);
    }
  }
  mountedStory = null;
  content.onclick = null;
  content.onkeydown = null;
}

export async function rememberStoryPlayback(content) {
  const generation = storyMountGeneration;
  const key = storyMountKey();
  const view = state.view;
  const input = [state.project, state.projectRepository];
  const {sources} = await db.collectPreviewSources(() => null, {includeLoaded: true});
  const token = await db.reusePreviewProjection(`story-mount:${key}`,
    input, () => ({}), {sources});
  if (generation !== storyMountGeneration || view !== state.view) return;
  mountedStory = {key, view, token, models: new Map(storyTimelineModels), nodes: []};
}

export function restoreStoryPlayback(content) {
  const sequence = storyVmSelectedSequenceForView();
  if (sequence) state.storySequenceId = sequence.id;
  const key = storyMountKey();
  const mount = storyMounts.get(key);
  if (!mount) return false;
  if (!db.isPreviewProjectionCurrent(`story-mount:${key}`, mount.token)
      || mount.viewport !== storyMountViewport(state.view)) {
    disposeStoryMount(mount);
    storyMounts.delete(key);
    return false;
  }
  const entry = mount.workbench.context?.entry;
  if (entry && entry.compiled !== buildStoryVmSequence(entry.sequence, entry.variant,
      storyPartyRuntimeOverrides(entry.sequence.id))) {
    disposeStoryMount(mount);
    storyMounts.delete(key);
    return false;
  }
  content.replaceChildren(...mount.nodes);
  content.querySelectorAll('[data-story-vm-variant]').forEach(resumeStoryStage);
  if (mount.heading) content.prepend(mount.heading);
  restoreStoryWorkbenchMount(mount.workbench);
  storyTimelineModels.clear();
  for (const [id, model] of mount.models) storyTimelineModels.set(id, model);
  content.onclick = mount.onclick;
  content.onkeydown = mount.onkeydown;
  mountedStory = mount;
  return true;
}

function storyAnimationSnapshot(source, phase) {
  if (!source || phase === source.backgroundAnimationPhase) return source;
  let phases = storyAnimationSnapshots.get(source);
  if (!phases) storyAnimationSnapshots.set(source, phases = new Map());
  if (!phases.has(phase)) phases.set(phase, {...source, backgroundAnimationPhase: phase});
  return phases.get(phase);
}

function storyViewport(view) {
  if (!storyTimelineViewports.has(view)) {
    let stored = {};
    try {stored = JSON.parse(localStorage.getItem(`story-timeline-viewport:${view}`) || '{}');} catch { /* 本机无值时适应。 */ }
    storyTimelineViewports.set(view, stored);
  }
  return storyTimelineViewports.get(view);
}

function storyToolbarEmpty() {
  return ['插入', '删除指令', '前移', '后移', '复制'].map(label =>
    `<button type="button" class="button ghost" disabled title="请先选中指令键或指令轨的开头／结尾插入点">${label}</button>`).join('')
    + resetToOriginalButton('script-unselected', {disabled: true, title: "重置脚本；请先选中指令键或插入点"});
}

function storyPlaybackControl(stage, card, selector) {
  let controls = storyPlaybackControls.get(stage);
  if (!controls) storyPlaybackControls.set(stage, controls = new Map());
  const cached = controls.get(selector);
  if (cached?.isConnected && card.contains(cached)) return cached;
  const node = card.querySelector(selector);
  controls.set(selector, node);
  return node;
}

function syncStoryPlaybackMarkup(node, markup) {
  if (!node || storyPlaybackMarkup.get(node) === markup) return;
  node.innerHTML = markup;
  storyPlaybackMarkup.set(node, markup);
}

function syncStoryPlaybackText(node, text) {
  if (!node || node.textContent === text) return;
  if (node.childNodes.length === 1 && node.firstChild.nodeType === globalThis.Node.TEXT_NODE) node.firstChild.nodeValue = text;
  else node.textContent = text;
}

function syncStoryPlaybackHidden(node, hidden) {
  if (node.hidden !== hidden) node.hidden = hidden;
}

function storyTreeExpansions(view) {
  if (!storyTimelineExpansions.has(view)) {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(`story-timeline-tree:${view}`) || "[]"); } catch { /* 无本机值时根展开。 */ }
    storyTimelineExpansions.set(view, new Map(stored));
  }
  return storyTimelineExpansions.get(view);
}

function setStoryTreeExpanded(root, id, expanded) {
  const model = storyTimelineModels.get(root.dataset.tl);
  if (!model) return;
  const expansions = storyTreeExpansions(model.view);
  expansions.set(id, expanded);
  for (const lane of model.lanes) lane.expanded = expansions.get(lane.id) !== false;
  try { localStorage.setItem(`story-timeline-tree:${model.view}`, JSON.stringify([...expansions])); } catch { /* 本机存储不可用时保留会话值。 */ }
  syncTimelineTree(root, expansions);
}

export async function prepareStoryAudio() {
  const selected = storyVmSelectedSequenceForView();
  const sequences = selected ? [selected] : [];
  const lists = storyVmAllActorLists();
  const ids = new Set(sequences.flatMap(sequence => {
    const variants = new Set([sequence.entry_variant_id, ...(sequence.actor_list_ids || [])].map(Number));
    return [
      ...lists.filter(item => variants.has(Number(item.id))).flatMap(item => item.scene_contexts || []),
      ...(sequence.shots || []), ...(sequence.ending_animation?.scene_contexts || []),
    ].map(context => Number(context.scene_id));
  }).filter(id => Number.isInteger(id) && id >= 0 && id < 0xF0));
  for (const sequence of sequences) {
    const entryScene = sequence.preview_entry?.field_traversal?.entry_transition?.scene_id;
    if (entryScene != null) ids.add(Number(entryScene));
  }
  await Promise.all([
    ...[...ids].map(id => db.getResourceDocument(recordUid("scene", id), null)),
    db.getResourceDocument("metatile-page", null),
    db.getResourceDocument("metatile-set", null),
    db.getResourceDocument("palette-runtime-service", null),
    db.getResourceDocument("field-terrain-behavior-service", null),
    db.getDocument("vehicle-visual-selector", null),
    db.getResourceDocument("encounter-formation", null),
  ]);
}

function syncStoryAudio(stage, compiled, frame, paused) {
  let playback = storyAudioPlayers.get(stage);
  if (!previewSoundEnabled()) {
    if (playback?.playing) playback.player.stop();
    if (playback) playback.playing = false;
    return;
  }
  if (!state.project.audio?.sequence_graph) return;
  if (!playback || playback.compiled !== compiled) {
    playback?.player.dispose();
    playback = {compiled, player: createAudioTimelinePlayer(state.project.audio,
      compiled.audioEvents || [], compiled.duration), playing: false, frame, speed: state.storySpeed};
    storyAudioPlayers.set(stage, playback);
  }
  if (paused) {
    if (playback.playing) playback.player.stop();
    playback.playing = false;
  } else if ((!playback.playing || frame < playback.frame || playback.speed !== state.storySpeed)
      && (globalThis.navigator?.userActivation?.isActive || playback.player.unlocked)) {
    playback.playing = true;
    playback.speed = state.storySpeed;
    void playback.player.play(() => storyTimelineFrame(compiled, Number(stage.dataset.storyVmVariant),
      storyCardFrame(Number(stage.dataset.storyVmVariant))
        + (performance.now() - state.storyLastTick) * 60 / 1000 * state.storySpeed),
      state.storySpeed).catch(error => {
      showEditorError(storyPlaybackCard(stage), "剧情声音播放失败", error);
    });
  }
  playback.frame = frame;
}


//
// 来源：拆分前 engine/editor/app.js 第 6541-7168 行。


function storyPlayerViewActive() {
  return storyPlaybackView(state.view);
}


// 音频事件本身已经是时间轴上的一条轨（见 storyTimelineMarkup），这里只留时间轴
// 上没有的那部分：$6F 清除时**没被采用**的那条分支——它不发生在任何一帧上，
// 放进轨道就是在时间轴上画一件没发生的事。
function storyAudioAlternateMarkup(animation) {
  const alternate = animation?.audio?.alternate_branch_cues || [];
  if (!alternate.length) return "";
  return `<details class="story-audio-alternate">
    <summary>${storyResourceMarkup(recordUid("global-event-flag", 0x6F))} clear · 未采用音频分支（${alternate.length}）</summary>
    <div>${alternate.map(event => `<button type="button" class="resource-inline-link"
      data-resource-target="${esc(event.resource_id)}" title="${esc(event.resource_id)}">${handleMarkup(event.resource_id)} ${esc(event.role === "fade-control" ? event.label || "" : audioCommandLabel(event.command_id))} · ${
      esc(event.role)}</button>`).join("")}</div>
  </details>`;
}

function renderStoryPlayback(view = state.view) {
  storyTimelineModels.clear();
  return storyPageIoMarkup() + renderStoryWorkbench(
    view,
    entry => storyStageMarkup(entry, view),
    storyEditableTimelinePanelMarkup,
    entry => storyEditableWorkbenchView(view) ? '' : `<div class="page-global-info">
      <span class="mono">${esc(entry.logicalIndex)}</span>
      <b>${esc(entry.label)}</b>
      <span>${esc(entry.sequence.kind)} · ${esc(entry.controlLabel)}</span>
      ${storyPlaybackReadoutsMarkup(entry)}
      ${storyTimelineMarkup(entry.compiled, entry.variant)}
      ${storyAudioAlternateMarkup(entry.sequence.ending_animation)}
    </div>`,
  );
}

// `[data-story-vm-variant]` 是唯一的舞台与播放身份。所有专页（包括结局）的
// 时间轴是 #content 的另一个直接子节点，所以由 storyPlaybackCard() 把卡片边界
// 提升到 #content。画面、走带与
// 所有 data-role 读数都必须能从这个明确的卡片边界查到。
// ——— 演出时间轴 ————————————————————————————————————————————————
//
// 和开机演出用的是同一个壳（ui/timeline-player.js）：走带、总体时间刻度轴、
// 播放头、坐标映射、键盘定位都在那边，本页只负责「这条剧情有哪些轨道」。
//
// 时间源不同——开机演出是提取器发布的步骤表，这里是 VM 逐帧模拟出来的
// frames[]——但对壳来说都只是「总共多少帧 + 哪些块落在哪一帧」。
//
// 轨道全部来自 compile 的产物，本页不自己排：镜头来自 shots，音频来自
// audioEvents，自动输入来自 uiAutoInputs；可编辑剧情工作台再把 frames[].actors[] 中
// 连续执行的命令按底稿 reference 归到操作数字段。循环点与结束是两个记号。

function storyTimelineFrame(compiled, variantId, rawFrame = storyCardFrame(variantId)) {
  const total = Math.max(1, Number(compiled.duration) || 1);
  const raw = Math.max(0, Math.floor(rawFrame));
  const loopStart = Number(compiled.loopStart);
  const loopLength = total - loopStart;
  return Number.isInteger(loopStart)
    && loopStart >= 0 && loopLength > 0 && raw >= total
    ? loopStart + ((raw - loopStart) % loopLength)
    : raw % total;
}

function storyTimelineMarkup(compiled, variant) {
  const total = Math.max(1, Number(compiled.duration) || 1);
  const frame = storyTimelineFrame(compiled, variant.id);
  const paused = state.storyCardPaused.has(Number(variant.id)) || !state.storyPlaying;
  const trace = storyExecutionTrace(compiled);
  const shots = trace.shots;
  const lanes = storyTimelineSourceLanes(compiled, {editable: storyEditableWorkbenchView(),
    fieldsForRun: storyEditableTimelineOperandFields});
  const markers = [];
  const loopStart = Number(compiled.loopStart);
  if (Number.isInteger(loopStart) && loopStart >= 0) {
    markers.push({frame: loopStart, tone: "instant",
      title: `循环点：第 ${loopStart} 帧，之后在这里与结尾之间绕回`});
  }
  for (const shot of shots) {
    markers.push({frame: Number(shot.frame) || 0, title: "镜头切换"});
  }
  const sequenceId = state.storySequenceId;
  const sequence = storyVmSequencesForView().find(item => item.id === sequenceId);
  const objectLabels = storyTimelineObjectLabels();
  const tree = storyTimelineTree({lanes, trace, frames: compiled.frames || [], actorsAt: storySnapshotActors,
    objectLabels, programs: storyBrowserVm().programs});
  const model = {view: state.view, sequenceId, compiled, trace, objectLabels, lanes: tree.lanes, mappings: tree.mappings, references: [
    recordUid("scene-actor-list", variant.id),
    ...(sequence?.interaction_trigger ? [
      storyActorHandle(variant.id, sequence.interaction_trigger.actor_record_id),
      storyScriptHandle("interaction", sequence.interaction_trigger.script_id),
    ] : []),
  ]};
  storyTimelineModels.set(`story:${variant.id}`, model);
  const baseline = state.storyMovementTimingBaselines.get(String(sequenceId));
  const timingChanges = baseline ? storyMovementTimingChanges(baseline.commands, trace.commands, baseline.edited) : new Map();
  for (const lane of tree.lanes) {
    lane.expanded = storyTreeExpansions(model.view).get(lane.id) !== false;
    lane.rowId = storyTimelineRowId(model.view, sequenceId, lane.id);
    lane.data = {"story-row": lane.id,
      "story-row-id": lane.rowId,
      "story-row-address": storyTimelineRowAddress(model.view, sequenceId, lane.id),
      ...(lane.objectId ? {"story-object-id": lane.objectId} : {})};
    lane.labelMarkup = `<span class="story-timeline-row-label"><button type="button" class="story-timeline-operand${
      lane.fields?.some(field => field.changed) ? " is-changed" : ""
    }" data-story-row-select="${esc(lane.id)}" title="${esc(lane.rowId)}" aria-pressed="false">${esc(lane.label)}</button></span>`;
    for (const block of lane.blocks || []) {
      const timing = timingChanges.get(block.command?.id)
        || block.command?.movementRuns?.map(run => timingChanges.get(run.id)).find(Boolean);
      if (timing) {
        block.title += ` · ${timing}`;
        block.data = {...block.data, 'story-timing-changed': 'true'};
      }
      block.detailTitle = block.title;
      block.title = storyTimelineShortText(block.title);
      block.labelMarkup = "";
    }
  }
  return timelinePlayer({
    id: `story:${variant.id}`,
    step: true,
    totalFrames: total,
    frame,
    playing: !paused,
    live: true,
    lanes: tree.lanes,
    markers,
    status: storyTimelineStatus(compiled, frame, total),
    labelWidth: 240,
    viewport: storyViewport(model.view),
    toolbar: `<div class="story-timeline-toolbar" role="toolbar" aria-label="演出时间轴工作条">
      <div data-story-toolbar-command>${storyToolbarEmpty()}</div>
      ${timelineViewportControls()}
      <button type="button" class="button ghost" data-story-tree-all="true">全部展开</button>
      <button type="button" class="button ghost" data-story-tree-all="false">全部收拢</button>
      <span data-story-insertion-point></span></div>`,
    transport: `<button type="button" class="button ghost"
      data-story-card-restart="${variant.id}" title="从头播这一条">⟲</button>${previewSoundControl()}`,
  });
}

/** 走带右侧那行读数：现在在第几段镜头、循环点在哪、怎么收尾。 */
function storyTimelineStatus(compiled, frame, total) {
  const shots = storyExecutionTrace(compiled).shots;
  const index = shots.findLastIndex(shot => (Number(shot.frame) || 0) <= frame);
  const shot = index >= 0 ? shots[index] : null;
  const loopStart = Number(compiled.loopStart);
  return [
    shots.length ? `SHOT ${index + 1} / ${shots.length}` : "",
    storyTimelineShortText(storyShotLabel(shot?.label)) || shot?.operation || "",
    Number.isInteger(loopStart) && loopStart >= 0 ? `循环点 ${loopStart}` : "",
    frame + 1 >= total ? "已到末帧" : "",
  ].filter(Boolean).join("　");
}

function storyScreenMarkup(entry) {
  const {variant, context, cameraLocated, sequence} = entry;
  return `<div class="story-game-screen black" data-role="story-vm-screen"
    ${sequence.interaction_trigger ? 'data-story-full-screen="true"' : ''}
    aria-label="${esc(variant.id_hex)} ROM 剧情 VM 预览">
    <canvas class="story-stage-map" data-role="story-vm-map" aria-hidden="true" hidden></canvas>
    <div class="story-stage-camera">
    <canvas class="story-stage-background" data-role="story-vm-background"
      aria-hidden="true" ${context?.scene_id !== null && context?.scene_id !== undefined
        && cameraLocated ? "" : "hidden"}></canvas>
    <canvas class="story-stage-field-tiles" data-role="story-vm-field-tiles"
      width="256" height="240" hidden></canvas>
    <canvas class="story-ending-wanted" data-role="story-ending-wanted"
      data-wanted-preview="constructor:wanted-poster-screen"
      aria-label="通缉令专用渲染器绘制的赏金首回顾" hidden></canvas>
    <div class="story-stage-actors" data-role="story-vm-actors"></div>
    <div class="story-stage-dialogue-text" data-role="story-vm-dialogue-text"
      aria-live="polite" hidden>
      ${statusUiPreviewCanvas({
        screenId: VEHICLE_STATUS_DETAIL_SCREEN_ID,
        kind: "vehicle",
        selection: "ending-runtime",
        label: "结局战车状态界面",
        className: "story-stage-status-ui",
        role: "story-vm-status-ui",
        hidden: true,
      })}
      <canvas class="story-stage-dialogue-canvas"
        data-role="story-vm-dialogue-canvas" width="256" height="240"
        aria-label="游戏字模绘制的对话" hidden></canvas>
      <div class="story-stage-dialogue-synthetic"
        data-role="story-vm-dialogue-synthetic" hidden></div>
      <small class="story-stage-dialogue-unavailable"
        data-role="story-vm-dialogue-unavailable" hidden></small>
    </div>
    <div class="story-ending-fade" data-role="story-ending-fade"></div>
    <div class="story-screen-scanlines"></div>
    </div>
    <div class="story-stage-camera-frame" aria-hidden="true"></div>
  </div>`;
}

function storyUnimplementedStop(entry) {
  const definitions = storyPageDefinitionForView(state.view)
    ?.unimplementedStops || [];
  for (const snapshot of entry.compiled.frames || []) {
    for (const actor of snapshot.actors || []) {
      const command = actor.currentCommand;
      if (actor.blockedReason !== "unimplemented-handler"
          || command?.operation !== "unimplemented-handler") continue;
      const definition = definitions.find(item => (
        String(item.sequenceId) === String(entry.sequence.id)
        && Number(item.scriptId) === Number(actor.scriptId)
        && Number(item.cursor) === Number(command.cursor)
      ));
      return {actor, command, definition};
    }
  }
  return null;
}

function storyPlaybackReadoutsMarkup(entry) {
  const {compiled} = entry;
  const shots = storyExecutionTrace(compiled).shots;
  const firstShot = shots[0] || null;
  const unimplementedStop = storyUnimplementedStop(entry);
  return `<div class="story-card-state">
    <span><small>VM 帧</small><b class="tl-readout"><i aria-hidden="true">${compiled.duration} / ${compiled.duration} ↻</i><samp data-role="story-vm-time">0 / ${compiled.duration}</samp></b></span>
    <span><small>动作</small><b data-role="story-vm-command">—</b></span>
    <span class="story-card-shot-state"><small>SHOT</small><b data-role="story-vm-shot">1 / ${
      shots.length || 1}</b>${storySceneLink(
      firstShot?.sceneId,
      null,
      {role: "story-vm-scene"},
    )}</span>
    <span><small>在场角色</small><b data-role="story-vm-actor-count">0</b></span>
    <span data-role="story-vm-battle-entry" hidden><small>战斗入口</small><b>—</b></span>
    ${unimplementedStop ? `<span data-role="story-vm-unimplemented-stop"><small>未实现指令停点</small><b>${esc(
      unimplementedStop.definition?.effect || "效果未实现",
    )}</b></span>` : ""}
    <span><small>阻塞项</small><b>${entry.missing.length}</b></span>
  </div>
  <div class="story-audio-hud" data-role="story-audio-hud">
    <span><small>BGM</small><b data-role="story-audio-bgm">继承 · ID 未知</b></span>
    <span><small>最近 SFX</small><b data-role="story-audio-sfx">—</b></span>
    <span><small>控制</small><b data-role="story-audio-control">—</b></span>
    <span class="story-audio-channel-cell"><small>APU 声道 / 入口</small><b data-role="story-audio-channels">—</b></span>
    <span><small>最近触发源</small><b data-role="story-audio-source">—</b></span>
  </div>`;
}

function storyEditableTimelinePanelMarkup(entry) {
  return `<section class="presentation-timeline"><div class="story-editable-playback"
    data-story-editable-playback>
    ${storyTimelineMarkup(entry.compiled, entry.variant)}
    <div class="story-editable-readouts">
      ${storyPlaybackReadoutsMarkup(entry)}
      ${storyAudioAlternateMarkup(entry.sequence.ending_animation)}
    </div>
  </div></section>`;
}

function storyStageMarkup(entry, view) {
  const {sequence, variant} = entry;
  const editable = storyEditableWorkbenchView(view);
  return screenWorkbenchCanvasStage({namespace: 'story', sizing: 'fill', className: 'story-stage-column',
    attributes: {'data-story-vm-variant': variant.id, 'data-story-vm-sequence': sequence.id},
    toolbarMarkup: `<div class="story-stage-toolbar">${storyStageZoomMarkup()}${editable ? resetToOriginalButton(STORY_RESET_ITEM_ID, {
        title: "丢弃本剧情字段及其可选自动脚本操作数的全部改动，"
          + "退回导入时的 ROM 原始状态",
        dirty: false,
      }) : ''}</div>`,
    viewportClassName: 'story-stage-viewport', viewportAttributes: {'data-story-stage-viewport': ''},
    canvasMarkup: storyScreenMarkup(entry), zoomMarkup: '',
  });
}

function storyDirection(from, to) {
  if (!from || !to) return null;
  const dx = Number(to.x) - Number(from.x);
  const dy = Number(to.y) - Number(from.y);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  if (dx < 0) return "left";
  if (dx > 0) return "right";
  if (dy < 0) return "up";
  return "down";
}

function storyActorState(track, frame, directionModel) {
  const keyframes = track.keyframes || [];
  let index = -1;
  for (let cursor = 0; cursor < keyframes.length; cursor += 1) {
    if (Number(keyframes[cursor].frame) > frame) break;
    index = cursor;
  }
  if (index < 0) return null;
  const current = keyframes[index];
  if (current.visible === false) return null;
  if (Number.isFinite(Number(current.screen_x))
      && Number.isFinite(Number(current.screen_y))) {
    const runtimeFrame = Number(current.runtime_animation_frame);
    const runtimeAttributes = Number(
      current.oam_attributes ?? current.actor_oam_attributes
    );
    return {
      ...current,
      x: Number(current.screen_x),
      y: Number(current.screen_y),
      screenCoordinates: true,
      animationFrame: Number.isInteger(runtimeFrame)
        && runtimeFrame >= 0 && runtimeFrame < 6
        ? runtimeFrame
        : 0,
      motionStep: Number.isInteger(runtimeFrame) ? runtimeFrame % 2 : 0,
      sequenceIndex: Number.isInteger(runtimeFrame) ? runtimeFrame : 0,
      motion: "rom-frame",
      flip: typeof current.flip === "boolean"
        ? current.flip
        : Number.isInteger(runtimeAttributes)
          && runtimeAttributes >= 0
          ? Boolean(runtimeAttributes & 0x40)
          : false,
    };
  }
  const next = keyframes[index + 1] || null;
  let x = Number(current.x);
  let y = Number(current.y);
  let direction = storyDirection(keyframes[index - 1], current) || "down";
  let walking = false;
  let motion = "idle";
  const nextDirection = storyDirection(current, next);
  if (next && nextDirection) {
    const travelFrames = Math.min(32, Math.max(1, Number(next.frame) - Number(current.frame)));
    const travelStart = Number(next.frame) - travelFrames;
    if (frame >= travelStart) {
      const progress = Math.max(0, Math.min(1, (frame - travelStart) / travelFrames));
      x += (Number(next.x) - Number(current.x)) * progress;
      y += (Number(next.y) - Number(current.y)) * progress;
      direction = nextDirection;
      walking = (next.movement_animation || "walk") !== "static";
      motion = walking ? "walk" : "drag";
    }
  }
  // Mirror SelectMapActorFrame exactly: $A597 selects 0/2/4/4 and the
  // overlapping $A59B attribute table adds OAM bit $40 only for right.
  const directionEntry = (directionModel?.directions || [])
    .find(item => item.name === direction);
  const pair = Number(directionEntry?.frame_offset
    ?? ({up: 0, down: 2, left: 4, right: 4}[direction] ?? 2));
  const runtimeFrame = Number(current.runtime_animation_frame);
  const hasRuntimeFrame = Number.isInteger(runtimeFrame)
    && runtimeFrame >= 0 && runtimeFrame < 6;
  const animationFrame = hasRuntimeFrame
    ? Math.floor(runtimeFrame / 2) * 2
      + (walking ? Math.floor(frame / 8) % 2 : runtimeFrame % 2)
    : pair + (walking ? Math.floor(frame / 8) % 2 : 0);
  const animationTick = walking ? Math.floor(frame / 8) : 0;
  const runtimeAttributes = Number(current.actor_oam_attributes);
  const hasRuntimeAttributes = Number.isInteger(runtimeAttributes)
    && runtimeAttributes >= 0;
  return {
    ...current,
    x,
    y,
    direction,
    animationFrame,
    motionStep: walking
      ? animationTick % 2 : hasRuntimeFrame ? runtimeFrame % 2 : 0,
    sequenceIndex: walking
      ? animationTick : hasRuntimeFrame ? runtimeFrame : 0,
    motion,
    flip: hasRuntimeAttributes
      ? Boolean(runtimeAttributes & 0x40)
      : directionEntry
        ? Boolean(directionEntry.horizontal_flip)
        : direction === "right",
  };
}

// 逐帧刷新是同步的，而现画精灵表要取两份正文。这里做成「同步查缓存，缺了就
// 后台补画」：第一次未命中返回 null（该 actor 这一帧不画），画完之后所有帧都命中。
// 缓存本身住在 render/actor-atlas.js，键是正文 identity，保存后自动失效。
const actorSpriteSheetUrls = new Map();
const actorSpriteSheetPending = new Set();
let actorSpriteSheetActorDocument = null;
let actorSpriteSheetChrDocument = null;

function refreshActorSpriteSheetDocumentIdentity() {
  const actorDocument = db.peekDocument("actor-visual", null);
  const chrDocument = db.peekDocument("shared-chr-bank", null);
  if (actorDocument === actorSpriteSheetActorDocument
      && chrDocument === actorSpriteSheetChrDocument) return;
  actorSpriteSheetActorDocument = actorDocument;
  actorSpriteSheetChrDocument = chrDocument;
  actorSpriteSheetUrls.clear();
  actorSpriteSheetPending.clear();
}

function actorSpriteRecipeKey(recipe) {
  const pair = Number(recipe?.actor_set);
  const actorType = Number(recipe?.actor_type);
  if (Number.isInteger(pair) && Number.isInteger(actorType)) {
    return `${pair}:type:${actorType}:${
      recipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR}`;
  }
  const frames = Array.isArray(recipe?.frames) ? recipe.frames.join(",") : "";
  return Number.isInteger(pair) && frames ? `${pair}:${frames}` : null;
}

function cachedActorSpriteSheet(recipe) {
  refreshActorSpriteSheetDocumentIdentity();
  const key = actorSpriteRecipeKey(recipe);
  if (!key) return null;
  if (actorSpriteSheetUrls.has(key)) return actorSpriteSheetUrls.get(key);
  if (!actorSpriteSheetPending.has(key)) {
    actorSpriteSheetPending.add(key);
    actorSpriteSheetUrl(recipe).then(url => {
      actorSpriteSheetPending.delete(key);
      if (url) {
        actorSpriteSheetUrls.set(key, url);
        updateStoryPlayback();
      }
    }).catch(() => actorSpriteSheetPending.delete(key));
  }
  return null;
}

function actorStagePose(
  appearance,
  {direction = "down", step = 0, sequenceIndex = 0, fallbackFrame = 0,
    fallbackHorizontalFlip = false} = {},
) {
  if (!appearance) {
    return {
      frameIndex: Math.max(0, Math.min(5, Number(fallbackFrame) || 0)),
      columns: 6,
      palette: null,
      horizontalFlip: Boolean(fallbackHorizontalFlip),
      verticalFlip: false,
    };
  }
  const pose = actorPoseForAppearance(appearance, {
    direction,
    step,
    sequenceIndex,
  });
  return {...pose, columns: appearance.frames.length};
}

function actorStagePoseCss(pose, paletteFallback = 0) {
  const columns = Math.max(1, Number(pose.columns) || 1);
  const frameIndex = Math.max(
    0,
    Math.min(columns - 1, Number(pose.frameIndex) || 0),
  );
  const positionX = columns === 1 ? 0 : frameIndex * 100 / (columns - 1);
  const palette = Math.max(0, Math.min(
    3,
    pose.palette !== null && pose.palette !== undefined
      && Number.isInteger(Number(pose.palette))
      ? Number(pose.palette) : Number(paletteFallback) || 0,
  ));
  return {
    frameIndex,
    palette,
    backgroundSize: `${columns * 100}% 400%`,
    backgroundPosition: `${positionX}% ${palette * (100 / 3)}%`,
    transform: `scale(${pose.horizontalFlip ? -1 : 1},${pose.verticalFlip ? -1 : 1})`,
  };
}

/** 项目切换或保存后丢弃现画结果，避免拿旧像素继续画。 */

// metasprite / 直接帧的舞台精灵表：和角色图集同一形状的「同步查缓存、后台补画」。
const metaspriteSheetUrls = new Map();
const metaspriteSheetPending = new Set();

function cachedMetaspriteSheet(recipe) {
  const kind = String(recipe?.kind || "");
  const id = Number(recipe?.id);
  const banks = Array.isArray(recipe?.chr_banks) ? recipe.chr_banks.join(",") : "";
  if (!kind || !Number.isInteger(id) || !banks) return null;
  const key = `${kind}:${id}:${banks}:${recipe?.palette_override ?? ""}`;
  if (metaspriteSheetUrls.has(key)) return metaspriteSheetUrls.get(key);
  if (!metaspriteSheetPending.has(key)) {
    metaspriteSheetPending.add(key);
    metaspriteStageSheetUrl(recipe).then(url => {
      metaspriteSheetPending.delete(key);
      if (url) {
        metaspriteSheetUrls.set(key, url);
        updateStoryPlayback();
      }
    }).catch(() => metaspriteSheetPending.delete(key));
  }
  return null;
}

function updateStoryScenarioCard(card, scenario, frame) {
  const phase = (scenario.phases || []).find(item => frame >= item.frame_start && frame <= item.frame_end);
  const screen = card.querySelector('[data-role="story-screen"]');
  if (!screen || !phase) return;
  screen.className = `story-game-screen ${phase.fill || "black"}`;
  const background = card.querySelector('[data-role="story-background"]');
  const camera = (phase.camera_track || []).reduce(
    (latest, item) => item.frame <= frame
      && (!latest || item.frame >= latest.frame) ? item : latest,
    null,
  );
  const offsetX = Number(camera?.offset_x ?? phase.offset_x ?? 0);
  const offsetY = Number(camera?.offset_y ?? phase.offset_y ?? 0);
  const phaseSceneId = phase.scene_id;
  const hasPhaseScene = phaseSceneId !== null && phaseSceneId !== undefined;
  if (hasPhaseScene && phase.background_enabled !== false) {
    // 与 VM 卡片同一条路径：按场景 ID 现画，不再 `<img src>` 那张成品 PNG。
    const source = `scene:${phaseSceneId}`;
    if (background.dataset.source !== source) {
      paintScenePreviewById(background, Number(phaseSceneId), {isCurrent: () => background.isConnected}).then(surface => {
        if (surface) background.dataset.source = source;
      }).catch(error => showEditorError(
        card, `剧情场景 ${phaseSceneId} 背景读取失败`, error,
      ));
    }
    syncStoryPlaybackHidden(background, false);
    background.style.left = `${offsetX / scenario.screen_width * 100}%`;
    background.style.top = `${offsetY / scenario.screen_height * 100}%`;
    background.style.width = `${phase.scene_width / scenario.screen_width * 100}%`;
    background.style.height = `${phase.scene_height / scenario.screen_height * 100}%`;
  } else {
    syncStoryPlaybackHidden(background, true);
  }
  const actors = [];
  const directionModel = state.project.story?.playback?.actor_direction_model;
  for (const track of phase.sprites_enabled === false ? [] : (phase.actor_tracks || [])) {
    const actor = storyActorState(track, frame, directionModel);
    if (!actor || !actor.sprite_recipe || actor.x >= 63 || actor.y >= 63) continue;
    // 精灵表是现画的 data URL。第一帧可能还没画完，先跳过这个 actor——缓存命中
    // 之后（同一份正文只画一次）它就稳定出现，不需要为此把逐帧刷新改成异步。
    const actorType = Number(actor.actor_type ?? actor.actorType);
    const liveRecipe = Number.isInteger(actorType) ? {
      actor_set: actor.sprite_recipe.actor_set,
      actor_type: actorType,
      entry_point: actor.sprite_recipe.entry_point,
    } : actor.sprite_recipe;
    const spriteUrl = cachedActorSpriteSheet(liveRecipe);
    if (!spriteUrl) continue;
    const left = (
      actor.screenCoordinates ? actor.x : offsetX + actor.x * 16
    ) / scenario.screen_width * 100;
    const liveAppearance = peekActorAppearance(actorType, {
      entryPoint: liveRecipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR,
    });
    const pose = actorStagePose(liveAppearance, {
      direction: actor.direction || "down",
      step: actor.motionStep ?? Number(actor.animationFrame) % 2,
      sequenceIndex: actor.sequenceIndex ?? 0,
      fallbackFrame: actor.animationFrame,
      fallbackHorizontalFlip: actor.flip,
    });
    const poseCss = actorStagePoseCss(pose, actor.palette);
    const top = (
      (actor.screenCoordinates ? actor.y : offsetY + actor.y * 16)
      + Number(pose.screenOffsetY || 0)
    ) / scenario.screen_height * 100;
    actors.push(`<span class="story-game-actor"
      data-actor-slot="${actor.actor_slot}" data-motion="${actor.motion}"
      data-animation-frame="${poseCss.frameIndex}"
      title="${esc(storyActorHandle(phase.variant_id, actor.actor_slot))} · ${esc(storyScriptHandle("autonomous", actor.script_id))} · ${actor.motion} · (${actor.x.toFixed(2)}, ${actor.y.toFixed(2)})"
      style="left:${left}%;top:${top}%;z-index:${100 + Math.round(actor.y * 4)};
      background-image:url('${spriteUrl}');
      background-size:${poseCss.backgroundSize};
      background-position:${poseCss.backgroundPosition};
      transform:${poseCss.transform}"></span>`);
  }
  card.querySelector('[data-role="story-actors"]').innerHTML = actors.join("");
  const dialogue = (scenario.dialogue_overlays || []).find(item => frame >= item.frame_start && frame <= item.frame_end);
  const dialogueImage = card.querySelector('[data-role="story-dialogue"]');
  if (dialogue) {
    const source = fileUrl(`game/story/${dialogue.path}`);
    if (dialogueImage.dataset.source !== source) {
      dialogueImage.src = source;
      dialogueImage.dataset.source = source;
    }
    syncStoryPlaybackHidden(dialogueImage, false);
    dialogueImage.style.left = `${dialogue.screen_x / scenario.screen_width * 100}%`;
    dialogueImage.style.top = `${dialogue.screen_y / scenario.screen_height * 100}%`;
    dialogueImage.style.width = `${dialogue.width / scenario.screen_width * 100}%`;
    dialogueImage.style.height = `${dialogue.height / scenario.screen_height * 100}%`;
  } else {
    syncStoryPlaybackHidden(dialogueImage, true);
  }
  const command = (phase.command_runs || []).reduce(
    (latest, item) => item.frame <= frame && (!latest || item.frame >= latest.frame) ? item : latest,
    null,
  );
  const handler = command
    ? state.project.story?.vm?.handlers?.find(item => item.opcode === command.opcode)
    : null;
  card.querySelector('[data-role="story-phase"]').textContent = phase.label;
  card.querySelector('[data-role="story-time"]').textContent =
    `${storyClock(frame, scenario.fps)} / ${storyClock(scenario.duration_frames, scenario.fps)}`;
  card.querySelector('[data-role="story-command"]').textContent =
    command ? `${command.opcode_hex} ${handler?.name || ""}` : "场景切换";
  card.querySelector('[data-role="story-actor-count"]').textContent =
    String(actors.length);
}

function updateStoryTracePlayback() {
  if (!storyPlayerViewActive()) return;
  const scenarios = storyPlaybackScenarios().filter(
    item => item.status === "runtime-scene-and-actor-complete"
      && item.duration_frames > 0
  );
  document.querySelectorAll("[data-story-scenario]").forEach(card => {
    const scenario = scenarios.find(item => item.id === card.dataset.storyScenario);
    if (!scenario) return;
    const frame = Math.floor(state.storyFrame) % scenario.duration_frames;
    updateStoryScenarioCard(card, scenario, frame);
  });
}


function storyDialogueTargets(textTarget) {
  return {
    statusUi: textTarget?.querySelector(
      '[data-role="story-vm-status-ui"]',
    ),
    canvas: textTarget?.querySelector('[data-role="story-vm-dialogue-canvas"]'),
    synthetic: textTarget?.querySelector(
      '[data-role="story-vm-dialogue-synthetic"]',
    ),
    unavailable: textTarget?.querySelector(
      '[data-role="story-vm-dialogue-unavailable"]',
    ),
  };
}

function showStoryDialogueUnavailable(textTarget, targets, message) {
  syncStoryPlaybackHidden(textTarget, false);
  if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
  syncStoryPlaybackHidden(targets.canvas, true);
  syncStoryPlaybackHidden(targets.synthetic, true);
  syncStoryPlaybackHidden(targets.unavailable, false);
  syncStoryPlaybackText(targets.unavailable, message);
}

async function updateStoryVmCurrentText(textTarget, dialogue, runtime = {}, isCurrent = () => textTarget.isConnected) {
  if (!textTarget) return;
  const targets = storyDialogueTargets(textTarget);
  if (!targets.canvas || !targets.synthetic || !targets.unavailable) return;
  if (!dialogue) {
    delete textTarget.dataset.dialogueKey;
    syncStoryPlaybackHidden(textTarget, true);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.synthetic, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
    return;
  }
  if (dialogue.uiScreenId && targets.statusUi) {
    const context = dialogue.uiPreviewContext || {};
    const revisions = ["text-record", "ui-role-status", "ui-vehicle-status", "character-initial-record",
      "vehicle-preset", "shared-chr-bank"].map(id => db.fieldRevision(id));
    const dialogueKey = `ui:${dialogue.uiScreenId}:${JSON.stringify([context, runtime.partyMembers,
      runtime.vehicles, runtime.partyMoney, revisions])}:${uiDialogueRuntimeKey()}`;
    syncStoryPlaybackHidden(textTarget, false);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.synthetic, true);
    if (textTarget.dataset.dialogueKey === dialogueKey
        && targets.statusUi.dataset.statusUiKey === dialogueKey) {
      syncStoryPlaybackHidden(targets.statusUi, false);
      syncStoryPlaybackHidden(targets.unavailable, true);
      return;
    }
    if (targets.statusUi.dataset.statusUiPending === dialogueKey) return;
    textTarget.dataset.dialogueKey = dialogueKey;
    targets.statusUi.dataset.statusUiPending = dialogueKey;
    syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.unavailable, false);
    targets.unavailable.textContent = "正在读取通用状态界面…";
    try {
      const painted = await paintUiEditorPreviewCanvas(
        targets.statusUi,
        dialogue.uiScreenId,
        {
          resolvePreview: preview => context.record
            ? resolveEndingCreditsUiPreview(preview, context, state.project)
            : resolveStatusUiPreview(preview, context, state.project, runtime),
          isCurrent,
        },
      );
      if (!isCurrent()) return;
      if (!painted) {
        throw new Error(`找不到界面资源 ${dialogue.uiScreenId}`);
      }
      if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
      targets.statusUi.dataset.statusUiKey = dialogueKey;
      syncStoryPlaybackHidden(targets.statusUi, false);
      syncStoryPlaybackHidden(targets.unavailable, true);
    } catch (error) {
      if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
      if (error?.name === "AbortError") {
        delete textTarget.dataset.dialogueKey;
        return;
      }
      showStoryDialogueUnavailable(
        textTarget,
        targets,
        `状态界面预览不可用：${error.message || error}`,
      );
    } finally {
      if (targets.statusUi.dataset.statusUiPending === dialogueKey) {
        delete targets.statusUi.dataset.statusUiPending;
      }
    }
    return;
  }
  if (dialogue?.synthetic && dialogue.recordFound) {
    // 仅供仍拥有 panel_lines 的机器码阶段使用；状态界面已在上面的 canonical
    // UI screen 分支处理。合成摘要没有 record:XX:NNN 字节可交给文字 VM。
    const lines = dialogue.lines || [];
    syncStoryPlaybackHidden(textTarget, !lines.length);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
    syncStoryPlaybackHidden(targets.synthetic, !lines.length);
    syncStoryPlaybackMarkup(targets.synthetic, lines.length
      ? `<b>${lines.map(line => esc(line)).join("<br>")}</b>`
      : "");
    textTarget.dataset.dialogueKey = `synthetic:${lines.join("\n")}`;
    return;
  }
  if (!dialogue.recordFound
      || dialogue.regionId < 0 || dialogue.recordId < 0) {
    textTarget.dataset.dialogueKey = "unavailable-record";
    showStoryDialogueUnavailable(
      textTarget,
      targets,
      "对话预览不可用：当前有效记录没有原始字节。",
    );
    return;
  }
  const regionHex = Number(dialogue.regionId)
    .toString(16).toUpperCase().padStart(2, "0");
  const recordId = `record:${regionHex}:${Number(dialogue.recordId)
    .toString().padStart(3, "0")}`;
  // 当前该显示的那一页完全采用 VM 的 pageIndex；token 流的分页仍只由
  // uiPaintInterfaceScript 解释，剧情页不另算一份。
  const pageIndex = Number(dialogue.pageIndex) || 0;
  // 普通剧情文字共用地图对话窗口。
  const fieldWindow = !dialogue.machineCodeOwned;
  const prefixRecord = fieldWindow ? `record:0C:${Number(dialogue.prefixRecordId || 0)
    .toString().padStart(3, "0")}` : null;
  const dialogueKey = `${recordId}:${pageIndex}:${fieldWindow ? "field" : "record"}:${
    prefixRecord}:${Boolean(dialogue.interactionWindow)}:${
    JSON.stringify(dialogue.pages || [])}:${uiDialogueRuntimeKey()}`;
  if (textTarget.dataset.dialogueKey === dialogueKey) return;
  textTarget.dataset.dialogueKey = dialogueKey;
  showStoryDialogueUnavailable(textTarget, targets, "正在读取对话记录…");
  try {
    const [renderSources, source] = await Promise.all([
      uiJsRenderSources(),
      textCatalogRecordSource(recordId),
    ]);
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    if (!Array.isArray(source.bytes)) {
      showStoryDialogueUnavailable(
        textTarget,
        targets,
        `对话预览不可用：${recordId} 没有原始字节。`,
      );
      return;
    }
    uiPaintDialogueCanvas(
      targets.canvas,
      recordId,
      pageIndex,
      renderSources,
      source.records,
      {fieldWindow, prefixRecord, interactionWindow: Boolean(dialogue.interactionWindow)},
    );
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    syncStoryPlaybackHidden(textTarget, false);
    if (targets.statusUi) syncStoryPlaybackHidden(targets.statusUi, true);
    syncStoryPlaybackHidden(targets.canvas, false);
    syncStoryPlaybackHidden(targets.synthetic, true);
    syncStoryPlaybackHidden(targets.unavailable, true);
  } catch (error) {
    if (!isCurrent() || textTarget.dataset.dialogueKey !== dialogueKey) return;
    if (error?.name === "AbortError") {
      delete textTarget.dataset.dialogueKey;
      return;
    }
    showStoryDialogueUnavailable(
      textTarget,
      targets,
      `对话预览不可用：${error.message || error}`,
    );
  }
}

function storyPlaybackCard(stage) {
  if (!stage) return null;
  // 剧情专页的工作台与「演出时间轴」面板都是 #content 的直接子节点；以共同的
  // #content 为卡片才能让逐帧查询同时覆盖舞台和下方面板。
  return stage.closest("#content") || stage;
}

// 场景现画会跨过一次或多次输入/计时器 tick。按舞台记录本轮刷新身份，避免旧场景
// 在用户已经拖到通缉令或职员表后才返回，并把应隐藏的背景画布重新显示出来。
const storyPlaybackUpdateRevisions = new WeakMap();
const storyAnimatedBackgrounds = new WeakMap();

function animatedBackgroundSurfaces(background, sceneId) {
  const documents = [db.peekResourceDocument(recordUid("scene", Number(sceneId)), null),
    db.peekDocument("shared-chr-bank", null), db.peekResourceDocument("metatile-page", null),
    db.peekResourceDocument("metatile-set", null), db.peekResourceDocument("palette-runtime-service", null)];
  let cached = storyAnimatedBackgrounds.get(background);
  if (!cached || documents.some((document, index) => document !== cached.documents[index])) {
    cached = {documents, surfaces: new Map()};
    storyAnimatedBackgrounds.set(background, cached);
  }
  return cached.surfaces;
}

export function updateStoryPlayback(compilations = null) {
  if (!storyPlayerViewActive()) return;
  const generation = storyMountGeneration;
  const view = state.view;
  const allActorLists = storyVmAllActorLists();
  const sequences = storyVmSequencesForView();
  // 同一快照的背景、图块与角色完成绘制后返回。
  return Promise.all([...document.querySelectorAll("[data-story-vm-variant]")].map(async stageElement => {
    const playbackState = storyPlaybackState(stageElement);
    const updateRevision = (storyPlaybackUpdateRevisions.get(stageElement) || 0) + 1;
    storyPlaybackUpdateRevisions.set(stageElement, updateRevision);
    const updateIsCurrent = () => (
      stageElement.isConnected
      && generation === storyMountGeneration && view === state.view
      && storyPlaybackUpdateRevisions.get(stageElement) === updateRevision
    );
    const card = storyPlaybackCard(stageElement);
    if (!card) return;
    const find = selector => storyPlaybackControl(stageElement, card, selector);
    const variant = allActorLists.find(
      item => Number(item.id) === Number(stageElement.dataset.storyVmVariant)
    );
    if (!variant) return;
    const sequence = sequences.find(
      item => item.id === stageElement.dataset.storyVmSequence,
    );
    if (!sequence) return;
    const compiled = compilations?.get?.(sequence.id) || buildStoryVmSequence(
      sequence,
      variant,
      storyPartyRuntimeOverrides(sequence.id),
    );
    // 每条剧情走自己的帧游标：长度从几百帧到上万帧不等，共用全局帧号会让短的
    // 一直在循环、长的还没开始。
    const frameIndex = storyTimelineFrame(compiled, variant.id);
    const sourceSnapshot = compiled.frames[frameIndex];
    const playbackPhase = fieldChrAnimationPlaybackPhase(compiled, frameIndex,
      Math.max(0, Math.floor(storyCardFrame(variant.id))));
    const snapshot = storyAnimationSnapshot(sourceSnapshot, playbackPhase) || {
      variantId: Number(variant.id),
      context: variant.scene_contexts?.[0] || null,
      actors: [],
    };
    // 走带同步必须留在第一个 await 之前：背景加载可能跨过下一次输入/计时器 tick，
    // 若在异步尾部才写读数，旧 compiled 会反过来覆盖更新后的总长。
    const paused = state.storyCardPaused.has(Number(variant.id))
      || !state.storyPlaying;
    const preferredId = stageElement.dataset.storySelectedNode || null;
    const detailId = stageElement.dataset.storySelectedEvent || null;
    delete stageElement.dataset.storySelectedNode;
    delete stageElement.dataset.storySelectedEvent;
    const selectedObject = syncStoryWorkbenchFrame(compiled, frameIndex, preferredId, detailId);
    syncStoryAudio(stageElement, compiled, frameIndex, paused);
    syncTimelinePlayer(find(`[data-tl="story:${variant.id}"]`), {
      frame: frameIndex,
      totalFrames: Math.max(1, compiled.duration),
      playing: !paused,
      live: true,
      status: storyTimelineStatus(compiled, frameIndex, compiled.duration),
      currentBlockFrame: null,
    });
    const timeline = find(`[data-tl="story:${variant.id}"]`);
    syncStoryTimelineCurrentValues(timeline, frameIndex);
    if (timeline && storyTimelineSelectedBlocks.get(timeline)?.blockIndex == null)
      syncSelectedStoryTimelineRow(timeline);
    const actors = storySnapshotActors(snapshot);
    const audioState = snapshot.audioState || {};
    const music = audioState.currentMusicCommandId == null
      ? null : storyAudioCommand(audioState.currentMusicCommandId);
    const sfx = audioState.lastSfxCommandId == null
      ? null : storyAudioCommand(audioState.lastSfxCommandId);
    const fadeControl = audioState.fadeControlId == null
      ? null : storyAudioControl(audioState.fadeControlId);
    const frameVariant = allActorLists.find(
      item => Number(item.id) === Number(snapshot.variantId),
    ) || variant;
    const needsLocatedEntryCamera =
      frameVariant.selection?.kind === "extended-logical-story-index"
      && !compiled.endingAnimation;
    const playbackContextAvailable =
      !needsLocatedEntryCamera || Boolean(snapshot.cameraKnown);
    const fieldVisible = playbackContextAvailable && snapshot.fieldPresentation?.enabled !== false;
    const paletteDecrement = Number(snapshot.fieldPresentation?.paletteDecrement) || 0;
    const backgroundFlash = Boolean(snapshot.fieldPresentation?.backgroundFlash);
    const screen = find('[data-role="story-vm-screen"]');
    const background = find('[data-role="story-vm-background"]');
    const fieldTiles = find(
      '[data-role="story-vm-field-tiles"]',
    );
    const context = snapshot.context || null;
    const stage = storyVmStage(context);
    const cameraTileOriginX = Number(snapshot.cameraTileOriginX || 0);
    const cameraTileOriginY = Number(snapshot.cameraTileOriginY || 0);
    const scrollOffsetY = Number(snapshot.screenScrollOffsetY || 0);
    if (screen) {
      screen.style.backgroundColor = fieldVisible ? "" : "black";
      const backdrop = snapshot.endingFill || (context?.kind === "interior"
        ? "interior-blue"
        : "field-green");
      const className = `story-game-screen ${backdrop}`;
      if (screen.className !== className) screen.className = className;
      screen.style.aspectRatio = `${stage.viewportWidth} / ${stage.viewportHeight}`;
      if (screen.dataset.stageWidth !== String(stage.viewportWidth)) screen.dataset.stageWidth = String(stage.viewportWidth);
      if (screen.dataset.stageHeight !== String(stage.viewportHeight)) screen.dataset.stageHeight = String(stage.viewportHeight);
    }
    let composedDisplay = false;
    const executionTrace = storyExecutionTrace(compiled);
    const objectLabels = storyTimelineModels.get(`story:${variant.id}`)?.objectLabels;
    if (screen && fieldVisible && snapshot.cameraKnown && storyUsesSceneDisplay(compiled)) {
      let canvas = screen.querySelector('[data-role="story-scene-display"]');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.dataset.role = 'story-scene-display';
        screen.prepend(canvas);
      }
      try {
        composedDisplay = await paintStorySceneDisplay(canvas, compiled, snapshot, updateIsCurrent, sourceSnapshot);
        delete screen.dataset.displayError;
      } catch (error) {
        screen.dataset.displayError = error.message;
      }
      if (!updateIsCurrent()) return;
    }
    if (screen) screen.dataset.sceneDisplay = composedDisplay ? 'composed' : 'semantic';
    syncStoryStageMap(stageElement, playbackContextAvailable ? snapshot : null, stage);
    if (composedDisplay) {
      const traceShot = executionTrace.shots.findLast(item => item.start <= frameIndex);
      syncStoryPlayerRegions(screen, snapshot, executionTrace.playerSegments, stage);
      syncStoryStageActors(find('[data-role="story-vm-actors"]'), actors.filter(actor => !actor.hidden).map(actor => {
        const pose = actor.renderPose || actor;
        const id = storyActorObjectId(traceShot?.id, actor);
        const label = (objectLabels?.get(id) || storyActorHandle(snapshot.variantId, actor.actorSlot))
          + (actor.wanderDirection !== undefined || actor.currentCommand?.operation?.includes('wander') ? ' · 随机' : '');
        return {id, attributes: {class: `story-game-actor${id === selectedObject?.id ? ' is-selected' : ''}`,
          ...storyStageActorAttributes(id, label, selectedObject?.id), title: label,
          ...(actor.partySlot == null ? {} : {'data-party-slot': String(actor.partySlot)})}, styles: {
          left: `${(pose.x - cameraTileOriginX) * 16 / 256 * 100}%`,
          top: `${(pose.y - cameraTileOriginY) * 16 / 240 * 100}%`,
          width: `${16 / 256 * 100}%`, height: `${16 / 240 * 100}%`,
        }};
      }));
    } else {
    const backgroundSceneId = context?.scene_id;
    const hasBackgroundScene = backgroundSceneId !== null
      && backgroundSceneId !== undefined;
    if (background && hasBackgroundScene && fieldVisible) {
      const backgroundCameraX = snapshot.backgroundCameraTileOriginX ?? cameraTileOriginX;
      const backgroundCameraY = snapshot.backgroundCameraTileOriginY ?? cameraTileOriginY;
      // 舞台背景与场景编辑页共用同一个渲染器；以前这里 `<img src>` 拉
      // scenes/<slug>/preview.png，是同一批像素的第二条来源，而且用文件路径
      // 而不是资源 ID 引用场景。
      const animationPhase = snapshot.backgroundAnimationPhase;
      const compositing = animationPhase == null ? "" : "transform";
      if (background.style.willChange !== compositing) background.style.willChange = compositing;
      const source = `scene:${backgroundSceneId}:${backgroundCameraX}:${backgroundCameraY}:${scrollOffsetY}:${animationPhase ?? "static"}:${paletteDecrement}:${Number(backgroundFlash)}`;
      if (background.dataset.source !== source) {
        const surfaces = animationPhase == null ? null
          : animatedBackgroundSurfaces(background, backgroundSceneId);
        const surface = surfaces?.get(source) || await loadScenePreviewSourceById(Number(backgroundSceneId), {view: 'viewport',
          cameraX: backgroundCameraX, cameraY: backgroundCameraY,
          width: stage.viewportWidth, height: stage.viewportHeight,
          cellSize: stage.tileSize,
          animationPhase,
        });
        if (!updateIsCurrent()) return;
        if (surface) {
          if (surfaces) {
            surfaces.set(source, surface);
            if (surfaces.size > 16) surfaces.delete(surfaces.keys().next().value);
          }
          await paintScenePreview(background, {surface, scrollY: scrollOffsetY, paletteDecrement, backgroundFlash});
          background.dataset.source = source;
        }
      }
      syncStoryPlaybackHidden(background, false);
      background.style.left = "0";
      background.style.top = "0";
      background.style.width = "100%";
      background.style.height = "100%";
    } else if (background) {
      syncStoryPlaybackHidden(background, true);
    }
    const endingWanted = find('[data-role="story-ending-wanted"]');
    const endingWantedTargetId = snapshot.endingWantedTargetId;
    if (
      endingWanted
      && endingWantedTargetId !== null
      && endingWantedTargetId !== undefined
    ) {
      // 结局只决定当前目标与击破状态；海报底板、编队图形、名称、赏金和击破
      // 标记全部交给导航栏「通缉令」页使用的同一个专用组件。
      const defeated = snapshot.endingWantedDefeated === true;
      const source = `wanted:${Number(endingWantedTargetId)}:${
        defeated ? "defeated" : "active"}`;
      if (endingWanted.dataset.source !== source) {
        endingWanted.dataset.source = source;
        delete endingWanted.dataset.readySource;
        delete endingWanted.dataset.wantedPreviewError;
        syncStoryPlaybackHidden(endingWanted, true);
        const isCurrent = () => (
          endingWanted.isConnected && endingWanted.dataset.source === source
        );
        paintWantedPreviewCanvas(endingWanted, {
          targetId: Number(endingWantedTargetId),
          defeated,
          isCurrent,
        }).then(resolved => {
          if (!resolved || !isCurrent()) return;
          endingWanted.dataset.readySource = source;
          syncStoryPlaybackHidden(endingWanted, false);
        }).catch(error => {
          if (!isCurrent()) return;
          endingWanted.dataset.wantedPreviewError = String(
            error?.message || error,
          );
        });
      }
      syncStoryPlaybackHidden(endingWanted, endingWanted.dataset.readySource !== source);
    } else if (endingWanted) {
      syncStoryPlaybackHidden(endingWanted, true);
    }
    const endingFade = find('[data-role="story-ending-fade"]');
    if (endingFade) {
      endingFade.style.opacity = String(
        Math.max(0, Math.min(1, Number(snapshot.endingFadeOpacity) || 0)),
      );
    }
    await drawStoryFieldTileOverlay(
      fieldTiles,
      fieldVisible ? snapshot : {...snapshot, fieldTiles: []},
      context,
      stage,
    );
    if (!updateIsCurrent()) return;
    syncStoryPlayerRegions(screen, snapshot, executionTrace.playerSegments, stage);
    const traceShot = executionTrace.shots.findLast(item => item.start <= frameIndex);
    const rendered = await Promise.all((fieldVisible && snapshot.actorPresentationEnabled !== false ? actors : [])
      .map(actor => ({...actor, ...actor.renderPose}))
      .filter(storyActorIsVisible).map(async actor => {
      const renderSlot = actor.runtimePartyEntity
        ? 15 - snapshot.partyActors.findIndex(entity => entity.actorSlot === actor.actorSlot)
        : actor.fieldEntityIndex !== undefined ? 15 - actor.fieldEntityIndex
          : actor.renderSlot ?? 16 - Number(snapshot.fieldEntityCount) - snapshot.actors.length + Number(actor.actorSlot);
      // PRG $0341B8 先提交领队，$034221 按帧奇偶交替遍历其余渲染槽。
      const renderParity = Number(snapshot.renderFrameParity ?? frameIndex) & 1;
      const oamPriority = renderSlot === 15 ? 16 : renderParity ? renderSlot : 14 - renderSlot;
      const publishedActorRecipe =
        frameVariant.sprite_sheets_by_actor_type?.[String(actor.actorType)]
        || frameVariant.actors?.find(
          item => Number(item.record_id) === actor.actorSlot,
        )?.sprite_recipe;
      const spritePair = snapshot.parameters?.spritePair ?? publishedActorRecipe?.actor_set;
      const literalRecipe = kind => Number.isInteger(spritePair) ? {
        kind, id: actor.actorType, chr_banks: actorSetBanks(spritePair),
        cell_size: 64, offset_x: -32, offset_y: -32,
      } : null;
      const genericSprite = actor.renderMode === "generic-metasprite"
        ? (snapshot.parameters?.spritePair != null ? literalRecipe("generic-metasprite") : null)
          || frameVariant.generic_metasprite_sheets?.[String(actor.actorType)]
        : null;
      const directSprite = actor.renderMode === "direct-actor-frame"
        ? (snapshot.parameters?.spritePair != null ? literalRecipe("direct-frame") : null)
          || frameVariant.direct_frame_sheets?.[String(actor.actorType)]
        : null;
      // 三条来源都已经是配方：metasprite / 直接帧走 metasprite 渲染器，
      // 其余走角色图集渲染器。两者都现画成 data URL 并按正文 identity 缓存。
      const metaspriteRecipe = genericSprite || directSprite || null;
      if (actor.renderMode !== "type-animation" && !metaspriteRecipe) return null;
      const liveActorRecipe = publishedActorRecipe ? {
        actor_set: spritePair,
        actor_type: actor.actorType,
        entry_point: publishedActorRecipe.entry_point,
      } : null;
      const liveActorAppearance = metaspriteRecipe
        ? null : peekActorAppearance(actor.actorType, {
            entryPoint: liveActorRecipe?.entry_point || ACTOR_ENTRY_TYPE_SELECTOR,
          });
      const sprite = metaspriteRecipe
        ? await metaspriteStageSheetUrl(metaspriteRecipe).catch(() => null)
        : liveActorRecipe ? await actorSpriteSheetUrl(liveActorRecipe).catch(() => null) : null;
      if (!sprite) return null;
      const directionIndex = {up: 0, down: 1, left: 2, right: 2}[actor.direction] ?? 1;
      const renderPose = actor.renderPose || actor;
      // $A3B6/$A57A 在停止步态时取属性 bit 3，否则取剩余格步计数 bit 4。
      const animationTick = renderPose.motion?.animate
        ? (Math.floor(32 * (1 - renderPose.motion.elapsed / renderPose.motion.duration)) >> 4) & 1
        : (actor.motionAttributes & 0x40) ? (actor.motionAttributes >> 3) & 1 : 0;
      const fallbackFrame = directionIndex * 2 + animationTick % 2;
      const pose = metaspriteRecipe ? {
        frameIndex: fallbackFrame,
        columns: 6,
        palette: Number(actor.palette) || 0,
        horizontalFlip: false,
        verticalFlip: false,
      } : actorStagePose(liveActorAppearance, {
        direction: actor.direction,
        step: animationTick,
        sequenceIndex: animationTick,
        fallbackFrame,
        fallbackHorizontalFlip: actor.direction === "right",
      });
      const poseCss = actorStagePoseCss(pose, actor.palette);
      const renderAsset = genericSprite || directSprite;
      const renderSize = Number(renderAsset?.cell_size || stage.tileSize);
      const actorCameraX = snapshot.actorCameraTileOriginX ?? cameraTileOriginX;
      const actorCameraY = snapshot.actorCameraTileOriginY ?? cameraTileOriginY;
      const left = (
        (renderPose.x - actorCameraX) * stage.tileSize
        + Number(actor.screenOffsetX || 0)
        + Number(renderAsset?.offset_x || 0)
      ) / stage.viewportWidth * 100;
      const top = (
        (renderPose.y - actorCameraY) * stage.tileSize
        + Number(actor.screenOffsetY || 0)
        + Number(renderAsset?.offset_y || 0)
        + Number(pose.screenOffsetY || 0)
      ) / stage.viewportHeight * 100;
      const width = renderSize / stage.viewportWidth * 100;
      const height = renderSize / stage.viewportHeight * 100;
      const objectId = storyActorObjectId(traceShot?.id, actor);
      const label = objectLabels?.get(objectId) || storyActorHandle(snapshot.variantId, actor.actorSlot);
      return {
        id: objectId,
        oam: {
          priority: oamPriority,
          left: left / 100 * stage.viewportWidth,
          top: top / 100 * stage.viewportHeight,
          size: renderSize,
          horizontalFlip: pose.horizontalFlip,
          verticalFlip: pose.verticalFlip,
          cells: metaspriteRecipe ? await metaspriteStageOamCells(metaspriteRecipe)
            : [{x: 0, y: 0}, {x: 8, y: 0}, {x: 0, y: 8}, {x: 8, y: 8}],
        },
        attributes: {
          class: `story-game-actor${objectId === selectedObject?.id ? " is-selected" : ""}`,
          ...storyStageActorAttributes(objectId, label, selectedObject?.id),
          ...(actor.partySlot === null || actor.partySlot === undefined
            ? {} : {"data-party-slot": String(Number(actor.partySlot))}),
          "data-motion": actor.motion?.operation || "idle",
          "data-animation-frame": String(poseCss.frameIndex),
          title: `${label} · ${storyActorHandle(snapshot.variantId, actor.actorSlot)} · ${storyScriptHandle(actor.scriptKind, actor.scriptId)} · (${actor.x.toFixed(2)}, ${actor.y.toFixed(2)})`,
        },
        styles: {
          left: "0", top: "0",
          translate: `calc(100cqw * ${left / 100}) calc(100cqh * ${top / 100})`,
          width: `${width}%`, height: `${height}%`,
          "z-index": String(100 + oamPriority),
          "background-image": `url('${await fieldPaletteSheetUrl(sprite, paletteDecrement)}')`,
          "background-size": poseCss.backgroundSize,
          "background-position": poseCss.backgroundPosition,
          transform: poseCss.transform,
        },
      };
    }));
    if (!updateIsCurrent()) return;
    const actorLayer = find('[data-role="story-vm-actors"]');
    const visibleActors = rendered.filter(Boolean);
    applyFieldSpriteLimit(visibleActors, stage.viewportWidth, stage.viewportHeight);
    syncStoryStageActors(actorLayer, visibleActors);
    const dialogueTarget = find(
      '[data-role="story-vm-dialogue-text"]',
    );
    if (dialogueTarget) {
      const layout = snapshot.endingOperation || "";
      if (dialogueTarget.dataset.endingLayout !== layout) dialogueTarget.dataset.endingLayout = layout;
    }
    const interfaceState = storyInterfaceState(snapshot);
    const textScreen = interfaceState?.textScreen || (interfaceState?.context?.record ? interfaceState.screen : null);
    const dialogue = textScreen ? {...snapshot.dialogue, uiScreenId: textScreen,
      uiPreviewContext: interfaceState.context} : snapshot.dialogue;
    await updateStoryVmCurrentText(dialogueTarget, fieldVisible ? dialogue : null,
      compiled.endingAnimation ? storyInterfaceRuntime(compiled, frameIndex) : snapshot, updateIsCurrent);
    if (!updateIsCurrent()) return;
    }
    const commands = actors
      .map(actor => actor.currentCommand)
      .filter(Boolean);
    const command = commands[0] || null;
    const time = find('[data-role="story-vm-time"]');
    const commandLabel = find('[data-role="story-vm-command"]');
    const actorCount = find('[data-role="story-vm-actor-count"]');
    const battleEntry = find(
      '[data-role="story-vm-battle-entry"]',
    );
    const shotLabel = find('[data-role="story-vm-shot"]');
    const sceneLink = find('[data-role="story-vm-scene"]');
    const audioHud = find('[data-role="story-audio-hud"]');
    const bgmLabel = find('[data-role="story-audio-bgm"]');
    const sfxLabel = find('[data-role="story-audio-sfx"]');
    const controlLabel = find(
      '[data-role="story-audio-control"]',
    );
    const channelLabel = find(
      '[data-role="story-audio-channels"]',
    );
    const sourceLabel = find(
      '[data-role="story-audio-source"]',
    );
    if (audioHud) {
      const event = snapshot.audioEvents?.length ? "active" : "";
      if (audioHud.dataset.event !== event) audioHud.dataset.event = event;
    }
    if (bgmLabel) {
      syncStoryPlaybackMarkup(bgmLabel, music
        ? `${storyResourceMarkup(recordUid("audio-command", music.id), audioCommandLabel(music.id))}${audioState.musicStatus === "fading" ? " · 淡出中" : ""}`
        : audioState.musicStatus === "fading" ? "淡出中" : "—");
      bgmLabel.title = music?.header
        ? "当前声音命令的轨道头"
        : audioState.musicStatus === "stopped-after-fade-reset"
          ? "F2 的 16 步淡出结束后，音频驱动执行复位"
          : "结局入口前的声音命令不在本执行链中，无法静态确定";
    }
    if (sfxLabel) {
      syncStoryPlaybackMarkup(sfxLabel, sfx
        ? storyResourceMarkup(recordUid("audio-command", sfx.id), audioCommandLabel(sfx.id))
        : "—");
    }
    if (controlLabel) {
      syncStoryPlaybackMarkup(controlLabel, fadeControl
        ? `${storyResourceMarkup(recordUid("audio-control", fadeControl.id))} · FADE interval ${fadeControl.interval} · ${Number(audioState.fadeUpdatesRemaining || 0)} updates`
        : "—");
    }
    if (channelLabel) {
      const tracks = music?.tracks || music?.stream_pointers || [];
      syncStoryPlaybackMarkup(channelLabel, tracks.length
        ? tracks.map(track => {
          const label = track.channel_short_label
            || track.channel_label
            || track.channel?.short_label
            || track.channel?.label
            || `TRACK ${Number(track.index) + 1}`;
          const registers = track.apu_registers || track.channel?.apu_registers;
          return `<i title="${esc(`${label}${
            registers ? ` · ${Array.isArray(registers) ? registers.join("-") : registers}` : ""
          }`)}">${esc(label)}</i>`;
        }).join("")
        : `<i class="unknown">${audioState.musicStatus === "stopped-after-fade-reset"
          ? "无活动 BGM 声道"
          : audioState.musicStatus === "fading"
            ? audioState.fadeSourceMusicStatus === "stopped-after-fade-reset"
              ? "无活动 BGM 声道 · 驱动复位中"
              : "活动声道未识别 · 淡出/复位中"
            : "声道入口未知"}</i>`);
    }
    if (sourceLabel) {
      const lastEvent = audioState.lastEvent;
      syncStoryPlaybackText(sourceLabel, lastEvent
        ? `${lastEvent.dispatch || lastEvent.role}`
        : "入口未显式提交");
    }
    if (time) {
      syncStoryPlaybackText(time, `${frameIndex + 1} / ${compiled.duration}${
        compiled.loopStart === null ? "" : " ↻"
      }`);
    }
    if (commandLabel) {
      commandLabel.title = screen?.dataset.displayError || '';
      syncStoryPlaybackText(commandLabel, snapshot.endingOperation
        ? snapshot.endingOperation
        : command
        ? `${command.opcodeHex} ${command.operation}`
        : `$0481=${hex(snapshot.storyState || 0, 2)} $0487=${hex(
          snapshot.controlLock || 0,
          2,
        )} $2F=${hex(
          snapshot.mode || 0,
          2,
        )}`);
    }
    syncStoryPlaybackText(actorCount, String(
      actors.filter(storyActorIsVisible).length
    ));
    if (battleEntry) {
      syncStoryPlaybackHidden(battleEntry, !snapshot.battleEntry);
      const value = battleEntry.querySelector("b");
      if (value && snapshot.battleEntry) {
        const formation = db.peekResourceDocument("encounter-formation", null)?.records?.find(
          row => Number(row.id) === Number(snapshot.battleEntry.formationId));
        const mode = battleModeForPendingEventFlag(snapshot.battleEntry.pendingEventFlag,
          battleFirstMonsterId(formation?.slots));
        syncStoryPlaybackMarkup(value, `编队 ${storyResourceMarkup(recordUid("encounter-formation", snapshot.battleEntry.formationId))} · 待置事件位 ${
          storyResourceMarkup(recordUid("global-event-flag", snapshot.battleEntry.pendingEventFlag))} · 战斗类型 ${esc(mode?.label || "未确认")} · BGM ${
          mode ? storyResourceMarkup(recordUid("audio-command", mode.musicCommand), audioCommandLabel(mode.musicCommand)) : "—"} · 死亡效果 ${
          mode ? esc(hex(mode.deathEffect, 2)) : "—"}${snapshot.battleEntry.assumedResult === "victory" ? " · 假定胜利" : ""}`);
      }
    }
    const shotIndex = Math.max(
      0,
      executionTrace.shots.findLastIndex(
        shot => Number(shot.frame) <= frameIndex,
      ),
    );
    const shot = executionTrace.shots[shotIndex] || null;
    if (shotLabel) {
      syncStoryPlaybackMarkup(shotLabel, shot
        ? `${shotIndex + 1} / ${executionTrace.shots.length} · ${
          storyHandleTextMarkup(storyShotLabel(shot.label).replace(` / ${recordUid("scene", shot.sceneId)}`, "")
            || recordUid("scene-actor-list", shot.variantId))
        }`
        : "1 / 1");
    }
    updateStorySceneLink(
      sceneLink,
      shot?.sceneId,
    );
    if (updateIsCurrent()) completedStoryPlaybackStates.set(stageElement, playbackState);
  }));
}

function storyTimelineElement(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

function syncStoryTimelineAttributes(current, fresh) {
  for (const name of current.getAttributeNames()) {
    if (!fresh.hasAttribute(name)) current.removeAttribute(name);
  }
  for (const attribute of fresh.attributes) {
    current.setAttribute(attribute.name, attribute.value);
  }
}

function syncStoryTimelineLabel(current, fresh) {
  syncStoryTimelineAttributes(current, fresh);
  if (current.innerHTML === fresh.innerHTML) {
    storyTimelinePendingLabels.get(current.closest("[data-tl]"))?.delete(current);
    return;
  }
  if (current.contains(document.activeElement)) {
    queueStoryTimelineLabelSync(current, fresh);
    return;
  }
  storyTimelinePendingLabels.get(current.closest("[data-tl]"))?.delete(current);
  current.innerHTML = fresh.innerHTML;
}

const storyTimelinePointerRoots = new WeakSet();
const storyTimelineActivePointers = new WeakMap();
const storyTimelinePendingRemoval = new WeakMap();
const storyTimelinePendingLabels = new WeakMap();
const storyTimelinePendingOrder = new WeakMap();
const storyTimelinePointerOwners = new Map();
const storyTimelineScheduledFlush = new WeakSet();
let storyTimelineDocumentPointersBound = false;

function applyStoryTimelineOrder(root, ids) {
  const grid = root.querySelector(".tl-grid");
  if (!grid) return;
  const lanes = new Map([...root.querySelectorAll("[data-tl-lane]")].map(
    lane => [lane.dataset.tlLane, lane],
  ));
  for (const id of ids) {
    const lane = lanes.get(id);
    const label = lane?.previousElementSibling;
    if (!lane || !label?.classList.contains("tl-label")) continue;
    grid.append(label, lane);
  }
}

function storyTimelineLaneHasFocus(root, activeElement = document.activeElement) {
  const row = activeElement?.closest?.(".tl-label, [data-tl-lane]");
  return Boolean(row && root.contains(row));
}

function flushStoryTimelinePending(root) {
  if (storyTimelineActivePointers.get(root)?.size) return;
  const activeElement = document.activeElement;
  const labels = storyTimelinePendingLabels.get(root);
  if (labels) {
    for (const [label, fresh] of [...labels]) {
      if (label.dataset.storyTimelineStale === "true" || !label.isConnected) {
        labels.delete(label);
      } else if (!label.contains(activeElement)) {
        labels.delete(label);
        syncStoryTimelineLabel(label, fresh);
      }
    }
  }
  const pending = storyTimelinePendingRemoval.get(root);
  if (pending) {
    for (const node of [...pending]) {
      if (!node.contains(activeElement)) {
        pending.delete(node);
        labels?.delete(node);
        if (node.dataset.storyTimelineStale === "true") node.remove();
      }
    }
  }
  const order = storyTimelinePendingOrder.get(root);
  if (order && !storyTimelineLaneHasFocus(root, activeElement)) {
    storyTimelinePendingOrder.delete(root);
    applyStoryTimelineOrder(root, order);
  }
}

function scheduleStoryTimelineFlush(root) {
  if (storyTimelineScheduledFlush.has(root)) return;
  storyTimelineScheduledFlush.add(root);
  setTimeout(() => {
    storyTimelineScheduledFlush.delete(root);
    flushStoryTimelinePending(root);
  }, 0);
}

function releaseStoryTimelinePointer(event) {
  const roots = storyTimelinePointerOwners.get(event.pointerId);
  storyTimelinePointerOwners.delete(event.pointerId);
  for (const root of roots || []) {
    // document capture 早于目标的 pointerup/click/change；到下一 task 再释放，
    // 本次手势余下的事件仍会把节点视为受保护。
    setTimeout(() => {
      storyTimelineActivePointers.get(root)?.delete(event.pointerId);
      flushStoryTimelinePending(root);
    }, 0);
  }
}

function releaseAllStoryTimelinePointers() {
  const roots = new Set();
  for (const owners of storyTimelinePointerOwners.values()) {
    owners.forEach(root => roots.add(root));
  }
  storyTimelinePointerOwners.clear();
  for (const root of roots) {
    setTimeout(() => {
      storyTimelineActivePointers.get(root)?.clear();
      flushStoryTimelinePending(root);
    }, 0);
  }
}

function bindStoryTimelineDocumentPointers() {
  if (storyTimelineDocumentPointersBound) return;
  storyTimelineDocumentPointersBound = true;
  document.addEventListener("pointerup", releaseStoryTimelinePointer, true);
  document.addEventListener("pointercancel", releaseStoryTimelinePointer, true);
  globalThis.addEventListener?.("blur", releaseAllStoryTimelinePointers);
}

function trackStoryTimelinePointers(root) {
  if (storyTimelinePointerRoots.has(root)) return;
  storyTimelinePointerRoots.add(root);
  bindStoryTimelineDocumentPointers();
  const active = new Set();
  storyTimelineActivePointers.set(root, active);
  root.addEventListener("pointerdown", event => {
    active.add(event.pointerId);
    if (!storyTimelinePointerOwners.has(event.pointerId)) {
      storyTimelinePointerOwners.set(event.pointerId, new Set());
    }
    storyTimelinePointerOwners.get(event.pointerId).add(root);
  }, true);
  root.addEventListener("focusout", () => {
    scheduleStoryTimelineFlush(root);
  }, true);
}

function queueStoryTimelineLabelSync(current, fresh) {
  const root = current.closest("[data-tl]");
  if (!root) return;
  if (!storyTimelinePendingLabels.has(root)) {
    storyTimelinePendingLabels.set(root, new Map());
  }
  storyTimelinePendingLabels.get(root).set(current, fresh.cloneNode(true));
}

function pruneStoryTimelineNodes(root, nodes) {
  if (!nodes.length) return;
  const activeElement = document.activeElement;
  const focused = nodes.some(node => node.contains(activeElement));
  if (!storyTimelineActivePointers.get(root)?.size && !focused) {
    nodes.forEach(node => node.remove());
    return;
  }
  if (!storyTimelinePendingRemoval.has(root)) {
    storyTimelinePendingRemoval.set(root, new Set());
  }
  const pending = storyTimelinePendingRemoval.get(root);
  nodes.forEach(node => pending.add(node));
}

function orderStoryTimelineNodes(root, ids) {
  const active = storyTimelineActivePointers.get(root)?.size;
  if (!active && !storyTimelineLaneHasFocus(root)) {
    applyStoryTimelineOrder(root, ids);
    return;
  }
  storyTimelinePendingOrder.set(root, [...ids]);
}

function syncStoryTimelineLayout(current, fresh) {
  syncStoryTimelineAttributes(current, fresh);
  for (const selector of ["[data-tl-play]", "[data-tl-readout]", "[data-tl-status]"]) {
    const target = current.querySelector(selector);
    const source = fresh.querySelector(selector);
    if (!target || !source) continue;
    target.innerHTML = source.innerHTML;
    if (source.hasAttribute("title")) target.title = source.title;
    else target.removeAttribute("title");
  }
  const ruler = current.querySelector("[data-tl-ruler]");
  const freshRuler = fresh.querySelector("[data-tl-ruler]");
  if (ruler && freshRuler) {
    syncStoryTimelineAttributes(ruler, freshRuler);
    ruler.innerHTML = freshRuler.innerHTML;
  }
  const grid = current.querySelector(".tl-grid");
  if (!grid) return;
  const lanes = new Map([...current.querySelectorAll("[data-tl-lane]")].map(
    lane => [lane.dataset.tlLane, lane],
  ));
  const freshIds = new Set();
  for (const freshLane of fresh.querySelectorAll("[data-tl-lane]")) {
    const id = freshLane.dataset.tlLane;
    freshIds.add(id);
    const freshLabel = freshLane.previousElementSibling;
    let lane = lanes.get(id);
    if (lane) {
      lane.removeAttribute("data-story-timeline-stale");
      const label = lane.previousElementSibling;
      label?.removeAttribute("data-story-timeline-stale");
      const pending = storyTimelinePendingRemoval.get(current);
      pending?.delete(lane);
      if (label) pending?.delete(label);
      syncStoryTimelineAttributes(lane, freshLane);
      lane.innerHTML = freshLane.innerHTML;
      if (label && freshLabel) syncStoryTimelineLabel(label, freshLabel);
      continue;
    }
    if (!freshLabel) continue;
    const label = freshLabel.cloneNode(true);
    lane = freshLane.cloneNode(true);
    bindStoryTimelineLane(current, lane);
    grid.append(label, lane);
  }
  const stale = [];
  for (const [id, lane] of lanes) {
    if (freshIds.has(id)) continue;
    const label = lane.previousElementSibling;
    lane.dataset.storyTimelineStale = "true";
    // 输入或指针手势尚未结束时，旧 lane 节点要留到安全时机再移除；但旧块已经
    // 不属于新编译结果，必须立刻清掉，否则活动 DOM 的几何仍会混入旧时间轴。
    lane.replaceChildren();
    stale.push(lane);
    if (label?.classList.contains("tl-label")) {
      label.dataset.storyTimelineStale = "true";
      stale.push(label);
    }
  }
  pruneStoryTimelineNodes(current, stale);
  orderStoryTimelineNodes(current, [...freshIds]);
  const model = storyTimelineModels.get(current.dataset.tl);
  syncTimelineViewport(current, Number(freshRuler?.getAttribute('aria-valuemax')) || 1, storyViewport(model.view));
}

/**
 * 操作数 working 值变化后重算这一条时间轴的刻度与块位置。
 *
 * 逐帧播放绝不调用这里：计时器仍只走 updateStoryPlayback →
 * syncTimelinePlayer。这里也保留现有 transport、ruler、lane 与输入节点，只更新
 * 它们的属性/子块；因此失焦提交与 pointerdown 落在同一手势时也不会丢捕获。
 */
function refreshStoryTimelineLayout(root, entry) {
  if (!root?.isConnected || !entry?.sequence || !entry?.variant) return;
  const variantId = Number(entry.variant.id);
  // 先从当前工作台锁定唯一舞台，再沿逐帧刷新的同一条卡片边界找走带；剧情专页
  // 的走带是 #content 下的兄弟面板。
  const stage = root.querySelector(`[data-story-vm-variant="${variantId}"]`);
  const current = storyPlaybackCard(stage)?.querySelector(
    `[data-tl="story:${variantId}"]`,
  );
  if (!current) return;
  const compiled = buildStoryVmSequence(
    entry.sequence,
    entry.variant,
    storyPartyRuntimeOverrides(entry.sequence.id),
  );
  const next = storyTimelineElement(storyTimelineMarkup(compiled, entry.variant));
  if (!next) return;
  syncStoryTimelineLayout(current, next);
  storyTimelineSelectionMarkup.delete(current);
  const selected = storyTimelineSelectedBlocks.get(current);
  if (selected?.nodeId) {
    const model = storyTimelineModels.get(current.dataset.tl);
    const matches = block => block.data?.["story-node"] === selected.nodeId
      || (selected.commandId && block.command?.id === selected.commandId);
    const lane = model.lanes.find(item => item.rowId === state.storyTimelineRowId && item.blocks.some(matches))
      || model.lanes.find(item => item.blocks.some(matches));
    if (lane) {
      state.storyTimelineRowId = lane.rowId;
      selected.blockIndex = lane.blocks.findIndex(matches);
      const block = lane.blocks[selected.blockIndex];
      selected.nodeId = block.data?.["story-node"];
      selected.start = block.start;
    }
  }
  syncSelectedStoryTimelineRow(current);
}

function bindStoryPlayback(content) {
  const root = content.querySelector('[data-story-workbench-editable]');
  const ready = [bindStoryPageIo(content, render),
    bindStoryPageAuthoring(content, render, storyVmSemanticsMap())
      .catch(error => {if (root?.isConnected) showEditorError(root, '剧情页', error);})];
  hydrateStorySceneOperands(document);
  document.querySelectorAll("#content [data-scene-position-picker]")
    .forEach(picker => hydrateScenePositionPicker(picker));
  ready.push(bindStoryWorkbench({
    refreshPlayback: updateStoryPlayback,
    refreshTimeline: refreshStoryTimelineLayout,
    seekPlayback: (id, frame, nodeId) => {
      state.storyCardFrame.set(Number(id), frame);
      state.storyCardPaused.add(Number(id));
      const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
      if (stage) stage.dataset.storySelectedNode = nodeId;
      updateStoryPlayback();
    },
  }));
  document.querySelectorAll("[data-story-vm-variant]").forEach(stage => {
    bindStoryStage(stage, state.view, objectId => {
      stage.dataset.storySelectedNode = objectId;
      updateStoryPlayback();
      stage.dispatchEvent(new CustomEvent("story-object-select", {
        bubbles: true, detail: {objectId},
      }));
    });
  });
  return Promise.all(ready);
}

export function startStoryTimer({reuse = false} = {}) {
  const binding = reuse ? null : bindStoryPlayback(document.querySelector('#content'));
  bindStoryTimelines();
  const sound = previewSoundEnabled();
  document.querySelectorAll('#content [data-preview-sound]').forEach(control => {control.checked = sound;});
  const painted = reuse && !sound
    && [...document.querySelectorAll('[data-story-vm-variant]')].every(storyPlaybackStateMatches);
  const initialPlayback = Promise.all([binding, painted ? null : updateStoryPlayback()]);
  const variantsById = new Map(
    storyVmAllActorLists().map(
      variant => [Number(variant.id), variant],
    ),
  );
  const entries = storyVmSequencesForView().map(sequence => ({
    sequence,
    variant: variantsById.get(Number(sequence.entry_variant_id)),
  })).filter(item => Boolean(item.variant));
  if (!entries.length) return initialPlayback;
  state.storyLastTick = performance.now();
  state.storyTimer = setInterval(() => {
    const now = performance.now();
    const elapsed = now - state.storyLastTick;
    state.storyLastTick = now;
    const step = elapsed * 60 / 1000 * state.storySpeed;
    let advanced = false;
    const compilations = new Map();
    for (const {sequence, variant} of entries) {
      if (sequence.id !== state.storySequenceId) continue;
      // 全局暂停是总开关；单条暂停只影响自己。
      if (!state.storyPlaying || state.storyCardPaused.has(Number(variant.id))) {
        continue;
      }
      const compiled = buildStoryVmSequence(sequence, variant,
        storyPartyRuntimeOverrides(sequence.id));
      compilations.set(sequence.id, compiled);
      const duration = Math.max(1, compiled.duration);
      let next = storyCardFrame(variant.id) + step;
      if (next > duration * 1024) next %= duration;
      state.storyCardFrame.set(Number(variant.id), next);
      advanced = true;
    }
    if (advanced) updateStoryPlayback(compilations);
  }, 50);
  return initialPlayback;
}

/**
 * 把每条剧情的时间轴接到壳上。
 *
 * 剧情的帧游标在 `state.storyCardFrame` 里，一条一个；拖动即暂停这一条，否则
 * 松手瞬间就被计时器推走了。壳只管交出「拖到了第几帧」。
 */
function storyTimelineBinding(root) {
  const id = Number(root.dataset.tl.split(":")[1]);
  const total = () => Math.max(1, Number(root.querySelector("[data-tl-ruler]")
    ?.getAttribute("aria-valuemax")) || 1);
  return {
    totalFrames: total,
    currentFrame: () => Math.floor(storyCardFrame(id)) % total(),
    onSeek: frame => {
      state.storyCardFrame.set(id, Math.max(0, Math.min(total() - 1, frame)));
      state.storyCardPaused.add(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    },
    onToggle: () => {
      if (!state.storyPlaying) {
        state.storyPlaying = true;
        state.storyCardPaused.delete(id);
      } else if (state.storyCardPaused.has(id)) state.storyCardPaused.delete(id);
      else state.storyCardPaused.add(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    },
    skip: event => Boolean(event.target.closest?.("[data-tl-frame], input, select, button")),
    onExpand: (laneId, expanded) => setStoryTreeExpanded(root, laneId, expanded),
    onViewport: value => {
      const view = storyTimelineModels.get(root.dataset.tl)?.view;
      if (!view) return;
      storyTimelineViewports.set(view, value);
      try {localStorage.setItem(`story-timeline-viewport:${view}`, JSON.stringify(value));} catch { /* 本机不可写时保留会话值。 */ }
    },
  };
}

function bindStoryTimelineLane(root, lane) {
  const host = document.createElement("div");
  host.append(lane);
  bindTimelinePlayer(host, {...storyTimelineBinding(root), coordinateRoot: root});
}

const storyTimelineSelectedBlocks = new WeakMap();
const storyTimelineDetailMarkup = new WeakMap();
const storyTimelineCurrentMarkup = new WeakMap();
const storyTimelineSelectionMarkup = new WeakMap();

function syncStoryTimelineCurrentValues(root, frame = null) {
  if (!root) return;
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  if (!lane) return;
  const subject = lane.objectRoot ? lane : model.lanes.find(item => item.id === lane.parentId) || lane;
  const host = document.querySelector("[data-story-row-current]");
  if (!host) return;
  const markup = storyTimelineCurrentValues(model, subject, frame ?? storyTimelineBinding(root).currentFrame());
  if (storyTimelineCurrentMarkup.get(host) !== markup) {
    host.innerHTML = markup;
    storyTimelineCurrentMarkup.set(host, markup);
  }
}

function syncSelectedStoryTimelineRow(root) {
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  const selection = storyTimelineSelectedBlocks.get(root);
  const selectedBlock = selection?.blockIndex == null ? null : lane?.blocks?.[selection.blockIndex];
  const pointCommand = selection?.insertionPoint ? (selection.insertionPoint === 'end'
    ? lane?.blocks?.findLast(block => block.command?.instructionId) : lane?.blocks?.find(block => block.command?.instructionId))?.command : null;
  const command = selectedBlock?.command || pointCommand;
  const toolbar = root.querySelector('[data-story-toolbar-command]');
  if (toolbar) {
    const key = `${lane?.id || ''}:${command?.instructionId || ''}:${selection?.insertionPoint || ''}`;
    if (toolbar.dataset.selection !== key) {
      toolbar.dataset.selection = key;
      toolbar.innerHTML = command?.instructionId ? (state.view === 'story-page' && !command.instructionBindings?.length ? storyPageKeyEditorMarkup : storyScriptStructureMarkup)(command,
        {insertionPoint: selection?.insertionPoint || null}) : storyToolbarEmpty();
      if (command?.instructionId) hydrateStoryTimelineCommandEditor(toolbar);
    }
    root.querySelector('[data-story-insertion-point]').textContent = selection?.insertionPoint === 'start'
      ? '在开头插入' : selection?.insertionPoint === 'end' ? '在结尾追加' : '';
  }
  const parent = lane?.objectRoot ? null : model?.lanes.find(item => item.id === lane?.parentId);
  const blocks = timelineSelectedBlocks(model?.lanes || [], lane?.id,
    selection?.start, selection?.blockIndex ?? null).filter(item => item.laneId === lane?.id);
  const selectionKey = JSON.stringify([lane?.id, parent?.id, selection?.start,
    blocks.map(block => block.blockIndex)]);
  const previous = storyTimelineSelectionMarkup.get(root);
  if (previous?.model !== model || previous?.key !== selectionKey) {
    root.querySelectorAll("[data-story-block-index]").forEach(node => {
      const laneId = node.closest("[data-tl-lane]")?.dataset.tlLane;
      node.classList.toggle("is-selected", blocks.some(item => item.laneId === laneId
        && item.blockIndex === Number(node.dataset.storyBlockIndex)));
    });
    root.querySelectorAll(".tl-block--summary").forEach(node => {
      node.classList.toggle("is-selected", node.closest("[data-tl-lane]")?.dataset.tlLane === lane?.id
        && Number(node.dataset.tlFrame) === selection?.start);
    });
    root.querySelectorAll("[data-story-row]").forEach(row => {
      const selected = row.dataset.storyRow === lane?.id || row.dataset.storyRow === parent?.id;
      row.classList.remove("story-object-track-selected");
      row.classList.toggle("is-story-row-selected", selected);
      row.querySelector("[data-story-row-select]")?.setAttribute("aria-pressed", String(selected));
    });
    storyTimelineSelectionMarkup.set(root, {model, key: selectionKey});
  }
  const details = document.querySelector("[data-story-timeline-details]");
  if (!details) return;
  syncStoryPlaybackHidden(details, !lane);
  if (!lane) return;
  const updateCurrent = () => syncStoryTimelineCurrentValues(root);
  updateCurrent();
  const selected = storyTimelineSelectedBlocks.get(root);
  const frame = storyTimelineBinding(root).currentFrame();
  const block = selected?.blockIndex == null
    ? lane.objectRoot ? null : lane.blocks?.findLast(block => block.start <= frame && frame < block.start + (block.frames || 1))
    : lane.blocks?.[selected.blockIndex];
  const key = `${lane.id}:${block?.driver?.id || block?.command?.identity || ""}`;
  const summary = details.querySelector("[data-story-command-summary]");
  if (details.dataset.storySelectedKey === key && summary) {
    const markup = storyTimelineCommandSummary(block);
    if (summary.innerHTML !== markup) summary.innerHTML = markup;
  }
  if (details.dataset.storySelectedKey === key && details.contains(document.activeElement)
      && document.activeElement.matches("input, select, textarea, [contenteditable]")) return;
  details.dataset.storySelectedKey = key;
  const markup = storyTimelineRowDetails(model, parent || lane, block, lane,
    storyTimelineCommandEditor(block?.command, block?.data?.["story-node"], block));
  if (storyTimelineDetailMarkup.get(details) !== markup) {
    details.innerHTML = markup;
    storyTimelineDetailMarkup.set(details, markup);
    bindResourceQueries(details);
    hydrateStoryTimelineCommandEditor(details);
    details.onfocusout = () => queueMicrotask(() => syncSelectedStoryTimelineRow(root));
    updateCurrent();
  }
}

function selectStoryTimelineRow(root, rowId, block, start = null, insertionPoint = null) {
  state.storyTimelineRowId = rowId;
  const model = storyTimelineModels.get(root.dataset.tl);
  const lane = model?.lanes.find(item => item.rowId === rowId);
  if (block?.command) state.storyMovementTimingBaselines.set(String(model.sequenceId), {
    commands: model.trace.commands, edited: block.command,
  });
  storyTimelineSelectedBlocks.set(root, {nodeId: block?.data?.["story-node"],
    commandId: block?.command?.id,
    blockIndex: block ? lane.blocks.indexOf(block) : null,
    start: start ?? block?.start ?? storyTimelineBinding(root).currentFrame(), insertionPoint});
  const id = Number(root.dataset.tl.split(":")[1]);
  const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
  if (stage) {
    stage.dataset.storySelectedNode = lane?.objectId || block?.data?.["story-node"] || "";
    stage.dataset.storySelectedEvent = block?.data?.["story-node"] || "";
  }
  syncSelectedStoryTimelineRow(root);
}

function bindStoryTimeline(root) {
  if (boundStoryTimelines.has(root)) {
    restoreStoryTimelineRow(root);
    return;
  }
  boundStoryTimelines.add(root);
  storyTimelineSelectionMarkup.delete(root);
  trackStoryTimelinePointers(root);
  bindTimelinePlayer(root, storyTimelineBinding(root));
  bindPreviewSound(root, enabled => {
    if (!enabled) {updateStoryPlayback(); return;}
    void ensureAudioSequenceData().then(() => updateStoryPlayback())
      .catch(error => showEditorError(root, "剧情声音", error));
  });
  root.addEventListener("pointerdown", event => {
    if (event.button || event.target.closest?.("[data-tl-expand], input, select, .story-timeline-toolbar, [data-story-preview-path]")) return;
    const row = event.target.closest?.("[data-story-row]");
    if (!row) return;
    const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.id === row.dataset.storyRow);
    if (!lane) return;
    const node = event.target.closest?.("[data-tl-frame]");
    const block = node?.hasAttribute("data-story-block-index")
      ? lane.blocks[Number(node.dataset.storyBlockIndex)] : null;
    const start = node ? Number(node.dataset.tlFrame) : row.hasAttribute("data-tl-lane")
      ? timelineFrameAt(root, row, event, storyTimelineBinding(root).totalFrames())
        : storyTimelineBinding(root).currentFrame();
    const insertionPoint = !block && row.hasAttribute('data-tl-lane')
      && lane.blocks?.some(block => block.command?.instructionId)
      ? start < 0 ? 'start' : start > storyTimelineBinding(root).totalFrames() ? 'end' : null : null;
    selectStoryTimelineRow(root, lane.rowId, block, start, insertionPoint);
  }, true);
  root.addEventListener("click", event => {
    if (event.target.closest?.("[data-story-preview-path]")) return;
    if (event.target.closest?.("[data-tl-expand]")) return;
    const all = event.target.closest?.("[data-story-tree-all]");
    if (all) {
      for (const lane of storyTimelineModels.get(root.dataset.tl)?.lanes || []) {
        if (storyTimelineModels.get(root.dataset.tl).lanes.some(child => child.parentId === lane.id)) {
          setStoryTreeExpanded(root, lane.id, all.dataset.storyTreeAll === "true");
        }
      }
      return;
    }
    const pick = event.target.closest?.("[data-story-row-select]");
    if (pick) {
      const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.id === pick.dataset.storyRowSelect);
      if (lane) {
        selectStoryTimelineRow(root, lane.rowId, null);
        storyTimelineBinding(root).onSeek(storyTimelineBinding(root).currentFrame());
        document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
      }
    }
    const node = event.target.closest?.("[data-tl-frame]");
    const nodeId = node?.dataset.storyNode;
    const id = Number(root.dataset.tl.split(":")[1]);
    const stage = document.querySelector(`[data-story-vm-variant="${id}"]`);
    const selectedLane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.rowId === state.storyTimelineRowId);
    if (nodeId && stage) stage.dataset.storySelectedNode = selectedLane?.objectId || nodeId;
    if (node) {
      syncSelectedStoryTimelineRow(root);
      document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
    }
  }, true);
  restoreStoryTimelineRow(root);
}

function restoreStoryTimelineRow(root) {
  const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.rowId === state.storyTimelineRowId);
  if (lane) {
    revealStoryTimelineRow(root, lane);
    selectStoryTimelineRow(root, lane.rowId, null);
    const id = Number(root.dataset.tl.split(':')[1]);
    state.storyCardFrame.set(id, Number(lane.blocks[0]?.start) || 0);
    state.storyCardPaused.add(id);
    state.storyLastTick = performance.now();
    document.querySelector(".story-workbench-inspector")?.scrollTo(0, 0);
  }
}

function revealStoryTimelineRow(root, lane) {
  const model = storyTimelineModels.get(root.dataset.tl);
  let parentId = lane.parentId;
  while (parentId) {
    setStoryTreeExpanded(root, parentId, true);
    parentId = model.lanes.find(item => item.id === parentId)?.parentId;
  }
  const row = [...root.querySelectorAll("[data-tl-lane]")].find(node => node.dataset.tlLane === lane.id);
  const scroll = root.querySelector(".tl-tree-scroll");
  if (row && scroll) scroll.scrollTop += row.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 20;
}

function bindStoryTimelines() {
  document.querySelectorAll('[data-tl^="story:"]').forEach(bindStoryTimeline);
  const content = document.querySelector("#content");
  content?.addEventListener("story-object-select", event => {
    content.querySelectorAll("[data-story-stage-object]").forEach(actor => {
      const selected = actor.dataset.storyStageObject === event.detail.objectId;
      actor.classList.toggle("is-selected", selected);
      actor.setAttribute("aria-pressed", String(selected));
    });
    for (const root of content.querySelectorAll('[data-tl^="story:"]')) {
      const lane = storyTimelineModels.get(root.dataset.tl)?.lanes.find(item => item.objectRoot
        && item.objectId === event.detail.objectId);
      if (!lane) continue;
      setStoryTreeExpanded(root, lane.id, true);
      revealStoryTimelineRow(root, lane);
      selectStoryTimelineRow(root, lane.rowId, null);
    }
  }, {signal: storyTimelineObjectListenerSignal()});
}

let storyTimelineObjectListener;
function storyTimelineObjectListenerSignal() {
  storyTimelineObjectListener?.abort();
  storyTimelineObjectListener = new globalThis.AbortController();
  return storyTimelineObjectListener.signal;
}

// 某一条的当前帧。没有记录过就是 0。
function storyCardFrame(variantId) {
  return Number(state.storyCardFrame.get(Number(variantId))) || 0;
}

export function renderCutsceneAnimation(view) {
  return renderStoryPlayback(view);
}
