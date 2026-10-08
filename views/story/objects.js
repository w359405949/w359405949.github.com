// @editor-module 剧情执行轨迹的对象列表与当前帧详情
import {state} from "../../core/state.js";
import {esc, hex} from "../../core/dom.js";
import {renderModuleComponent} from "../../ui/module-components.js";
import {actorAppearanceContextForStory, actorAppearanceContextForParty, storyActorVisualMarkup} from "../../ui/actor-appearance.js";
import {scenePositionPickerMarkup, hydrateScenePositionPicker, syncScenePositionPicker} from "../../modules/scene/components.js";
import {currentTextReference} from "../../core/resource-index.js";
import {storyActorObjectId, storyTraceObjectAt} from "./trace.js";
import {storyActorIsVisible, storyBrowserVm} from "./vm.js";
import {storySnapshotInterface} from "./driver-trace.js";
import {uiDialogueActorName} from "../../modules/visual/ui-construction-preview.js";
import {recordUid} from "../../core/resource-index.js";
import {handleMarkup, handleTextMarkup as storyHandleTextMarkup} from "../../ui/handle.js";
import {storyActorHandle, storyScriptMarkup, storyResourceMarkup,
  storyInterfaceMarkup,
  storyAudioLabel as audioCommandLabel} from "./handles.js";
import {globalEventFlagHandle} from '../../core/global-event-flags.js';
import {sceneActorName, dialogueSpeakerName} from '../../core/scene-actor-labels.js';
import {sceneActorRecord} from '../../core/scene-actors.js';

const objectSourceIndexes = new WeakMap();
const objectPositionKeys = new WeakMap();
const objectInspectorControls = new WeakMap();

function objectInspectorControl(root, selector) {
  let controls = objectInspectorControls.get(root);
  if (!controls) objectInspectorControls.set(root, controls = new Map());
  const cached = controls.get(selector);
  if (cached?.isConnected && root.contains(cached)) return cached;
  const node = root.querySelector(selector);
  controls.set(selector, node);
  return node;
}

function syncObjectText(node, text) {
  if (!node || node.textContent === text) return;
  if (node.childNodes.length === 1 && node.firstChild.nodeType === globalThis.Node.TEXT_NODE) node.firstChild.nodeValue = text;
  else node.textContent = text;
}

function objectSourceIndex(context) {
  const cached = objectSourceIndexes.get(context);
  if (cached?.nodes === context.nodes && cached.trace === context.trace) return cached;
  const objects = new Map(context.trace.objects.map(object => {
    const sources = [...new Map(context.nodes.filter(node => node.kind === "actor" && node.parentId === object.shotId && object.refs?.some(ref =>
      Number(node.shot.variant_id) === ref.variantId && Number(node.actor.record_id) === ref.actorSlot))
      .map(node => [`${node.shot.variant_id}:${node.actor.record_id}`, node])).values()];
    const party = context.nodes.find(node => node.kind === "party-member"
      && node.partyMember.slot === object.partySlot);
    const fieldNodes = object.kind === "actor" ? sources : context.nodes.filter(node =>
      object.kind === "camera" ? ["camera", "camera-settings"].includes(node.kind)
        : object.kind === "text" && ["text", "script-text"].includes(node.kind));
    const fields = [...new Map(fieldNodes.flatMap(node => node.fields || []).map(field => [field.id, field])).values()];
    return [object.id, {sources, party, fields}];
  }));
  const index = {nodes: context.nodes, trace: context.trace, objects,
    nodesById: new Map(context.nodes.map(node => [node.id, node]))};
  objectSourceIndexes.set(context, index);
  return index;
}

function actorName(context, object, party, source) {
  if (object.fieldEntityIndex !== undefined) {
    return {label: '临时角色', nameSource: '姓名未确认；现场实体槽'};
  }
  if (party) {
    const name = uiDialogueActorName(object.partySlot);
    return name ? {label: name.name, nameSource: `队伍身份 · ${name.source}`}
      : {label: party.label, nameSource: `队伍身份 · 槽 ${object.partySlot}`};
  }
  for (const run of context.trace.dialogues) {
    const dialogue = run.dialogue;
    if (dialogue.machineCodeOwned || !object.refs.some(ref =>
      ref.variantId === dialogue.sourceVariantId && ref.actorSlot === dialogue.actorSlot)) continue;
    const reference = `record:0C:${String(dialogue.prefixRecordId || 0).padStart(3, "0")}`;
    const label = dialogueSpeakerName(reference);
    if (label) return {label, nameSource: `说话人前缀 · ${reference}`};
  }
  return sceneActorName(source && sceneActorRecord(storyActorHandle(source.shot.variant_id, source.actor.record_id))
    || source?.actor);
}

export function storyObjectRows(context) {
  const index = objectSourceIndex(context).objects;
  return context.trace.objects.flatMap(object => {
    const {snapshot, actor, withinShot} = storyTraceObjectAt(context.entry.compiled, object, context.frame || 0);
    const {sources, party, fields} = index.get(object.id);
    const source = sources.find(node => Number(node.shot.variant_id) === snapshot.variantId) || sources[0];
    const variant = context.variantsById.get(object.kind === "actor" ? object.variantId : snapshot.variantId)
      || source?.variant || context.entry.variant;
    const appearance = actor ? {actor_type: actor.actorType, record_id: actor.actorSlot}
      : source?.actor || {actor_type: party?.partyMember.storyActorType};
    const name = object.kind === "actor" ? actorName(context, object, party, source)
      : {label: {text: "对话窗口", camera: "镜头／画面", audio: "音乐", interface: "界面", "player-input": "玩家操控"}[object.kind]};
    const {label} = name;
    const detail = object.kind === "actor" ? !withinShot ? "非当前幕" : actor ? `(${formatCoordinate(actor.x)}, ${formatCoordinate(actor.y)})${storyActorIsVisible(actor) ? "" : " · 隐藏"}` : "未出场"
      : object.kind === "text" ? snapshot.dialogue?.text || snapshot.dialogue?.lines?.join(" ") || (snapshot.dialogue ? "当前记录" : "隐藏")
      : object.kind === "camera" ? `(${snapshot.cameraTileOriginX ?? "—"}, ${snapshot.cameraTileOriginY ?? "—"})`
      : object.kind === "player-input" ? "预览模拟输入"
      : object.kind === "interface" ? storySnapshotInterface(snapshot)?.label || "隐藏"
      : snapshot.audioState?.currentMusicCommandId == null ? "未播放" : audioCommandLabel(snapshot.audioState.currentMusicCommandId);
    const audioHandle = snapshot.audioState?.currentMusicCommandId == null ? null
      : recordUid("audio-command", snapshot.audioState.currentMusicCommandId);
    const row = {...object, objectKind: object.kind, depth: 0, ...name, detail,
      detailMarkup: object.kind === "audio" && audioHandle
        ? storyResourceMarkup(audioHandle, detail, null) : null, actor, snapshot,
      sources, source, party, variant, appearance, fields,
      get thumbnail() {
        if (object.kind !== "actor") return "";
        if (!actor || actor.renderMode === "type-animation") return renderModuleComponent("actor-type", "preview", {
          ...(party ? actorAppearanceContextForParty(party.partyMember, variant)
            : actorAppearanceContextForStory(appearance, variant)),
          value: appearance.actor_type, compact: true, scale: 1, label,
        });
        return storyActorVisualMarkup({actor, record: source?.actor, variant, label});
      }};
    if (object.kind !== 'text') return [row];
    const pages = context.nodes.filter(node => Number.isInteger(node.dialoguePage));
    return [row, ...pages.map(node => ({...row, id: node.id, depth: 1,
      label: node.label, detail: node.detail, fields: node.fields,
      dialoguePageNode: node, sources: [], source: node}))];
  });
}

function formatCoordinate(value) {
  return Number.isFinite(value) ? String(Number(value.toFixed(2))) : "—";
}

function eventList(nodes, selectedId = null) {
  return `<div class="story-object-events">${nodes.map(node => `<button type="button"
    class="story-object-event${node.id === selectedId ? " is-current" : ""}"
    data-story-object-event="${esc(node.id)}"><small>${Number.isInteger(node.start) ? `F${node.start}` : "未执行"}</small>
    <span>${storyHandleTextMarkup(node.label)}</span></button>`).join("")}</div>`;
}

function sourceDetails(nodes) {
  return nodes.map(node => `<details class="story-object-source" data-story-object-source="${esc(node.id)}"><summary>${storyHandleTextMarkup(node.label)}</summary><div data-story-object-source-body></div></details>`).join("");
}

export function hydrateStoryObjectSources(root, context, renderSource, hydrate) {
  root.querySelectorAll("[data-story-object-source]").forEach(details => {
    const body = details.querySelector(":scope > [data-story-object-source-body]");
    if (!body || body.dataset.bound) return;
    body.dataset.bound = "true";
    const populate = () => {
      if (!details.open || body.dataset.loaded) return;
      const node = context.nodes.find(item => item.id === details.dataset.storyObjectSource);
      if (!node) return;
      body.innerHTML = renderSource(node);
      body.dataset.loaded = "true";
      hydrate(body);
    };
    details.addEventListener("toggle", populate);
    populate();
  });
}

export function storyInspectorObject(context, id, rows = storyObjectRows(context)) {
  const object = rows.find(item => item.id === id);
  if (object) return object;
  const flag = /^object:flag:([0-9]+)$/u.exec(id || "");
  const kind = flag ? "flag" : {"object:flags": "flags", "object:input": "input",
    "object:flow": "flow"}[id];
  if (!kind) return null;
  const snapshot = context.entry.compiled.frames[context.frame || 0] || {};
  return {id, kind, label: flag ? globalEventFlagHandle(Number(flag[1]))
    : {flags: "事件位", input: "输入", flow: "流程"}[kind],
    flagId: flag ? Number(flag[1]) : null, snapshot, fields: [], sources: []};
}

export function storyObjectInspector(context, object, renderSource, fixedMarkup = "") {
  if (object.dialoguePageNode) return renderSource(object.dialoguePageNode);
  const snapshot = object.snapshot;
  const frame = context.frame || 0;
  let current = "";
  let fixed = fixedMarkup;
  if (object.kind === "actor") {
    const actor = object.actor;
    const program = actor && storyBrowserVm().programs.find(program => program.id === actor.scriptId
      && (program.kind || "autonomous") === (actor.scriptKind || "autonomous"));
    fixed += `<dl class="story-inspector-fields"><dt>名称来源</dt><dd>${storyHandleTextMarkup(object.nameSource)}</dd></dl>`;
    if (!fixedMarkup) fixed += "<p>运行时实体没有独立的 ROM 角色记录。</p>";
    current = actor ? `${scenePositionPickerMarkup({
      entries: context.project?.scenes?.editable_scenes || [], sceneId: snapshot.sceneId,
      x: actor.x, y: actor.y, coordinatesText: `${formatCoordinate(actor.x)}, ${formatCoordinate(actor.y)}`,
      label: "当前帧位置", disabled: true, componentAttributes: 'data-story-object-position',
    })}<dl class="story-inspector-fields">
      <dt>朝向</dt><dd data-story-object-direction>${esc({up: "上", down: "下", left: "左", right: "右"}[actor.direction] || actor.direction)}</dd>
      <dt>形象</dt><dd>${storyResourceMarkup(recordUid({
        "direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite",
      }[actor.renderMode] || "actor-type", actor.actorType))} ${object.thumbnail}</dd>
      <dt>脚本</dt><dd>${actor.scriptId == null ? "—" : storyScriptMarkup(actor.scriptKind, actor.scriptId,
        program?.unwrittenOverflowBytes, {location: program?.scriptLocation, reason: program?.unwrittenReason})}</dd>
      <dt>当前指令</dt><dd data-story-object-command>${actor.currentCommand
        ? `${hex(actor.currentCommand.cursor, 2)} · ${esc(actor.currentCommand.operation || actor.currentCommand.opcodeHex)}` : "—"}</dd>
      <dt>显示</dt><dd data-story-object-visible>${storyActorIsVisible(actor) ? "可见" : "隐藏"}</dd></dl>`
      : `<p>${esc(object.detail)}</p>`;
    if (object.party) current += `<dl class="story-inspector-fields">
      <dt>乘车预览</dt><dd><select data-story-party-vehicle-slot="${Number(object.party.partyMember.slot)}"
        data-story-party-vehicle-sequence="${esc(context.entry.sequence.id)}" aria-label="乘车预览">
        <option value="">步行</option>${Array.from({length: 8}, (_, slot) =>
          `<option value="${slot}"${state.storyPartyPreviewVehicles.get(String(context.entry.sequence.id))
            ?.get(Number(object.party.partyMember.slot)) === slot ? " selected" : ""}>战车 ${slot + 1}</option>`).join("")}
      </select></dd>
    </dl>`;
  } else if (object.kind === "text") {
    fixed = `<dl class="story-inspector-fields"><dt>窗口</dt><dd>剧情对话窗口</dd>
      <dt>文字来源</dt><dd>文本记录</dd></dl>`;
    const currentNode = context.nodes.findLast(node => ["text", "interface-reference"].includes(node.kind)
      && node.start <= frame && frame < node.end);
    current = currentNode ? renderSource(currentNode, {currentState: true}) : "<p>隐藏</p>";
  } else if (object.kind === "camera") {
    current = `<dl class="story-inspector-fields"><dt>当前位置</dt><dd data-story-camera-current>${esc(object.detail)}</dd></dl>`;
  } else if (object.kind === "player-input") {
    const declared = context.entry.compiled.frames[0]?.previewFieldInputs || [];
    const inputs = declared.length ? declared : [{direction: "right", steps: 0, wait_for_release: true}];
    fixed = `<table title="预览假设；路线只改变预览，不写 ROM"><thead><tr><th>方向</th><th>步数</th></tr></thead><tbody>${inputs.map((input, index) =>
      `<tr><td><select data-story-player-input="direction" data-story-player-input-index="${index}">${Object.entries({up: "上", down: "下", left: "左", right: "右"}).map(([value, label]) =>
        `<option value="${value}"${input.direction === value ? " selected" : ""}>${label}</option>`).join("")}</select></td><td><input type="number" min="0" max="255" value="${input.steps}" data-story-player-input="steps" data-story-player-input-index="${index}" title="0：停住；不写 ROM"></td></tr>`).join("")}</tbody></table>
      <div><button type="button" class="button ghost" data-story-player-input="add" title="添加预览路线，不写 ROM">＋</button>
      <button type="button" class="button ghost" data-story-player-input="reset" title="重置预览路线，不写 ROM">↺</button></div>`;
    current = `${scenePositionPickerMarkup({entries: context.project?.scenes?.editable_scenes || [],
      sceneId: snapshot.sceneId, x: snapshot.playerMapX, y: snapshot.playerMapY,
      label: "玩家当前位置", disabled: true})}<div data-story-row-current></div>`;
  } else if (object.kind === "audio") {
    fixed = `<dl class="story-inspector-fields"><dt>资源来源</dt><dd>声音命令</dd></dl>`;
    current = `<dl class="story-inspector-fields"><dt>当前曲目</dt><dd>${object.detailMarkup ?? esc(object.detail)}</dd></dl>`;
  } else if (object.kind === "interface") {
    const interfaceState = storySnapshotInterface(snapshot);
    fixed = `<dl class="story-inspector-fields"><dt>对象</dt><dd>剧情界面</dd>
      <dt>来源</dt><dd>剧情界面构造</dd></dl>`;
    current = `<dl class="story-inspector-fields"><dt>界面</dt><dd>${esc(interfaceState?.label || "隐藏")}</dd>
      ${interfaceState?.screen ? `<dt>画面</dt><dd>${storyInterfaceMarkup(interfaceState)}</dd>` : ""}</dl>`;
  } else {
    fixed = `<dl class="story-inspector-fields"><dt>对象</dt><dd>${object.flagId === null
      ? esc(object.label) : storyResourceMarkup(recordUid("global-event-flag", object.flagId))}</dd>
      <dt>初值来源</dt><dd>剧情入口与运行现场</dd></dl>`;
    current = `<div data-story-row-current></div>`;
  }
  return `<article class="story-workbench-card" data-story-workbench-card="${esc(object.id)}">
    <header class="story-workbench-card-head"><h2>${object.labelMarkup ?? esc(object.label)}</h2></header>
    <section class="story-inspector-layer" data-story-object-fixed><h3>固定信息</h3>${fixed}</section>
    <section class="story-inspector-layer" data-story-object-current><h3 data-story-object-frame>当前状态 · F${frame}</h3>${current}</section>
  </article>`;
}

export function storyObjectInspectorSources(context, object) {
  if (!object) return "";
  const frame = context.frame || 0;
  let sources = [];
  let commands = [];
  if (object.kind === "actor") {
    sources = [...object.sources, ...context.nodes.filter(node => node.kind === "script-text"
      && object.sources.some(source => source.id === node.parentId))];
    commands = context.nodes.filter(node => node.kind === "action" && node.shotId === object.shotId
      && object.refs.some(ref => ref.variantId === node.variantId && ref.actorSlot === node.actorSlot));
  } else if (object.kind === "text") {
    sources = context.nodes.filter(node => node.kind === "script-text");
    commands = context.nodes.filter(node => node.kind === "text");
  } else if (object.kind === "interface") {
    sources = context.nodes.filter(node => node.kind === "interface-reference" && node.stage);
    commands = context.nodes.filter(node => node.kind === "interface-reference" && !node.stage);
  } else if (object.kind === "camera") {
    sources = context.nodes.filter(node => ["sequence", "shot", "script-shot", "ending-stage", "party", "party-member"].includes(node.kind)
      || node.kind === "camera-settings" && !(node.start <= frame && frame < node.end));
    commands = context.nodes.filter(node => node.kind === "camera");
  } else if (object.kind === "player-input") {
    sources = context.nodes.filter(node => node.kind === "player-boundary");
    commands = sources;
  } else if (object.kind === "audio") commands = context.nodes.filter(node => node.kind === "audio");
  const current = commands.findLast(node => node.start <= frame && frame < node.end);
  let body = sourceDetails(sources) + `<h3>指令</h3>${eventList(commands, current?.id)}`;
  if (object.kind === "camera") body += `<h3>主角团队</h3>${context.nodes.filter(node => node.kind === "party-member").map(node => `<label>
    <input type="checkbox" data-story-party-render-slot="${node.partyMember.slot}"
      data-story-party-render-sequence="${esc(node.sequenceId)}"${node.rendered ? " checked" : ""}>${esc(node.label)}</label>`).join("")}`;
  const otherActors = [...new Map(context.nodes.filter(node => node.kind === "actor"
    && !context.trace.objects.some(item => item.shotId === node.parentId && item.refs?.some(ref =>
      ref.variantId === Number(node.shot.variant_id) && ref.actorSlot === Number(node.actor.record_id))))
    .map(node => [`${node.parentId}:${node.actor.record_id}`, {...node,
      label: `${context.nodes.find(item => item.id === node.parentId)?.label
        || recordUid("scene-actor-list", node.shot.variant_id)} · ${node.label}`}])).values()];
  if (otherActors.length) body += `<details class="story-object-source"><summary>本场景其他角色 · ${otherActors.length}</summary>${sourceDetails(otherActors)}</details>`;
  return body;
}

export function storyObjectInspectorKey(context, object) {
  const actor = object.actor;
  const current = context.nodes.findLast(node => node.kind === object.kind
    && node.start <= context.frame && context.frame < node.end);
  return JSON.stringify([context.objectGeneration, object.id, object.label, object.nameSource, context.detailEventId,
    object.snapshot.sceneId, object.snapshot.variantId,
    actor ? [actor.actorType, actor.renderMode, actor.scriptKind, actor.scriptId] : null,
    ["actor", "camera"].includes(object.kind) ? null : [current?.id, object.detail],
    object.kind === "interface" ? storySnapshotInterface(object.snapshot) : null]);
}

export function syncStoryObjectInspector(root, context, object) {
  const output = objectInspectorControl(root, "[data-story-object-frame]");
  const frameLabel = `当前状态 · F${context.frame}`;
  syncObjectText(output, frameLabel);
  const actor = object.actor;
  if (actor) for (const [selector, text] of [
    ["[data-story-object-direction]", {up: "上", down: "下", left: "左", right: "右"}[actor.direction] || actor.direction],
    ["[data-story-object-command]", actor.currentCommand
      ? `${hex(actor.currentCommand.cursor, 2)} · ${actor.currentCommand.operation || actor.currentCommand.opcodeHex}` : "—"],
    ["[data-story-object-visible]", storyActorIsVisible(actor) ? "可见" : "隐藏"],
  ]) {
    const value = objectInspectorControl(root, selector);
    syncObjectText(value, text);
  }
  const camera = objectInspectorControl(root, "[data-story-camera-current]");
  syncObjectText(camera, object.detail);
  const nodesById = objectSourceIndex(context).nodesById;
  root.querySelectorAll("[data-story-object-event]").forEach(button => {
    const node = nodesById.get(button.dataset.storyObjectEvent);
    const label = button.querySelector("span");
    if (node && label && label.textContent !== node.label) label.innerHTML = storyHandleTextMarkup(node.label);
  });
  const picker = objectInspectorControl(root, "[data-story-object-position]");
  if (!picker || !object.actor) return;
  const {x, y} = object.actor;
  const key = [object.snapshot.sceneId, x, y, context.project?.scenes];
  const previous = objectPositionKeys.get(picker);
  if (previous && key.every((value, index) => value === previous[index])) return;
  objectPositionKeys.set(picker, key);
  picker.dataset.scenePositionSceneId = String(object.snapshot.sceneId);
  picker.dataset.scenePositionX = String(x);
  picker.dataset.scenePositionY = String(y);
  syncScenePositionPicker(picker, {entries: context.project?.scenes?.editable_scenes || [],
    sceneId: object.snapshot.sceneId, x, y});
  const coordinates = picker.querySelector("[data-scene-position-current]");
  if (coordinates) {
    const text = `${formatCoordinate(x)}, ${formatCoordinate(y)}`;
    syncObjectText(coordinates, text);
    coordinates.hidden = false;
  }
}

export function hydrateStoryObjectPosition(root) {
  root.querySelectorAll("[data-scene-position-picker]").forEach(picker => hydrateScenePositionPicker(picker));
}

export function storyObjectForEvent(context, event) {
  if (!event) return null;
  if (["player-input", "player-boundary"].includes(event.kind)) return "object:input";
  if (["text", "script-text"].includes(event.kind)) return "object:dialogue";
  if (event.kind === "interface-reference") return "object:interface";
  if (event.kind === "audio") return "object:audio";
  if (event.kind === "action") {
    const snapshot = context.entry.compiled.frames[event.start];
    const actor = snapshot?.actors?.find(actor => actor.actorSlot === event.actorSlot);
    return actor ? storyActorObjectId(event.shotId, actor) : null;
  }
  return "object:camera";
}

export function highlightStoryObjectTracks(root, context, object) {
  root.closest("#content")?.querySelectorAll("[data-tl-lane]").forEach(lane => {
    lane.classList.remove("story-object-track-selected");
    lane.previousElementSibling?.classList.remove("story-object-track-selected");
  });
}
