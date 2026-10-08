// @editor-module 剧情时间轴行名称、定位地址与详情。
import {esc} from "../../core/dom.js";
import {currentTextReference} from "../../core/resource-index.js";
import {storyTimelineRowId} from "../../core/story-timeline-row-id.js";
import {storyInterfaceMarkup, storyResourceMarkup} from "./handles.js";
import {storyCommandPresentation} from "../../core/story-command-presentation.js";
import {storyActorIsVisible, storyVmSemanticsMap, storyBrowserVm} from "./vm.js";
import {storySnapshotInterface} from "./driver-trace.js";
import {handleMarkup} from "../../ui/handle.js";
import {state} from '../../core/state.js';

const FIELD_NAMES = new Map([
  ["条件分支相对位移", "分支"],
  ["角色运动属性", "运动"],
  ["对话角色参数", "对话角色"],
  ["对话文本记录 id", "文本"],
  ["声音命令 id", "声音"],
  ["目标 story state", "剧情状态"],
  ["相机相对位置（高 / 低半字节为 X / Y）", "相机位置"],
  ["角色目标格 X（u8 地图坐标）", "目标 X"],
  ["角色目标格 Y（u8 地图坐标）", "目标 Y"],
  ["等待事件位 / 结束参数 2", "结束事件位"],
  ["战斗编队 id", "编队"],
  ["游标相对位移", "跳转"],
  ["运行时角色槽 id", "角色槽"],
  ["运行时目标槽 id", "目标槽"],
  ["运行时队伍槽 id", "队伍槽"],
  ["剧情内镜头路线 id", "镜头路线"],
  ["文本区域 id", "文本区"],
  ["文本记录 id", "文本"],
  ["漫游矩形左边界 X（u8 地图坐标）", "漫游左"],
  ["漫游矩形右边界 X（u8 地图坐标）", "漫游右"],
  ["漫游矩形上边界 Y（u8 地图坐标）", "漫游上"],
  ["漫游矩形下边界 Y（u8 地图坐标）", "漫游下"],
  ["朝向不匹配分支相对位移", "朝向分支"],
  ["空槽分支相对位移", "空槽分支"],
  ["已占用槽分支相对位移", "占用分支"],
  ["战斗后的 story state（$FF 为无后继状态）", "战后状态"],
  ["退出后的场景 id", "退出场景"],
  ["退出后的相机 tile 原点 X（有符号原始字节）", "退出相机 X"],
  ["退出后的相机 tile 原点 Y（有符号原始字节）", "退出相机 Y"],
  ["渲染偏移序列 id", "偏移序列"],
  ["序列结束后的角色类型", "结束角色"],
  ["向右脚本输入帧数", "向右"],
  ["向左脚本输入帧数", "向左"],
  ["向上脚本输入帧数", "向上"],
  ["向下脚本输入帧数", "向下"],
  ["运行结果非零分支相对位移", "结果分支"],
  ["非玩家角色分支相对位移", "角色分支"],
]);

export function storyTimelineShortText(text) {
  return String(text || "").replace(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu,
    handle => handle.split(":").at(-1));
}

function storyTimelineFieldLabel(field) {
  const name = FIELD_NAMES.get(field.label) || String(field.label)
    .replace(/（[^）]*）/gu, "").replace(/\s+id$/iu, "")
    .replace(/^运行时/u, "").replace(/相对位移/gu, "位移")
    .replace(/story state/gu, "剧情状态");
  const handle = String(field.value).match(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/u)?.[0];
  return handle ? `${name} ${handle.split(":").slice(handle.startsWith("record:") ? 1 : -1).join("·")}` : name;
}

export function storyTimelineFieldsLabel(fields) {
  const names = fields.map(field => field.label);
  if (fields.length === 2 && fields.every(field => field.label.startsWith("角色目标格"))) return "目标格";
  if (fields.length === 4 && fields.every(field => field.label.startsWith("漫游矩形"))) return "漫游范围";
  if (names.some(name => name.startsWith("位置矩形"))) return "位置范围 / 分支";
  if (names.some(name => name.startsWith("玩家目标格"))) return "玩家位置 / 分支";
  if (fields.length === 2 && names.every(name => name.startsWith("角色格坐标"))) return "角色位置";
  if (names.some(name => name.startsWith("被替换的角色类型"))) return "角色替换";
  if (names.includes("战斗编队 id")) return storyTimelineFieldLabel(fields.find(field => field.label === "战斗编队 id"));
  if (names.includes("文本区域 id") && names.includes("文本记录 id")) return "文本";
  if (names.includes("循环次数")) return "循环";
  if (fields.length > 1 && fields.every(field => field.label.startsWith("退出后的"))) {
    return storyTimelineFieldLabel(fields.find(field => field.label === "退出后的场景 id") || fields[0]);
  }
  return fields.map(storyTimelineFieldLabel).join(" / ");
}

export function storyTimelineRowAddress(view, sequenceId, laneId) {
  const query = new URLSearchParams({view, storyRow: storyTimelineRowId(view, sequenceId, laneId),
    storyPaused: "1"});
  if (state.storyPageId) query.set('storyPage', state.storyPageId);
  return `?${query}`;
}

function referencedTextMarkup(text) {
  const source = String(text || "");
  let cursor = 0;
  let markup = "";
  for (const match of source.matchAll(/\b[a-z][a-z0-9-]*(?::[A-Za-z0-9_-]+)+/gu)) {
    const handle = match[0];
    const target = handle.startsWith("record:") ? currentTextReference(handle).uid
      : handle.replace(/^story-(autonomous|interaction)-script:script:/u, "story:$1:");
    markup += esc(source.slice(cursor, match.index)) + storyResourceMarkup(handle, "", target);
    cursor = match.index + handle.length;
  }
  return markup + esc(source.slice(cursor));
}

export function storyTimelineCommandSummary(block) {
  if (!block) return "";
  const dialogue = block.driver?.property === "dialogue"
    || ["start-blocking-dialogue", "start-event-selected-dialogue"].includes(block.command?.operation);
  const label = block.dialogueWindow ? "对话窗口" : block.branch ? block.label : dialogue ? "台词" : block.driver?.label
    || (block.command?.operation === "start-blocking-ui-action" ? "界面窗口"
      : block.command ? storyCommandPresentation(storyVmSemanticsMap().get(block.command.opcode)).label : block.label);
  const program = block.command && storyBrowserVm().programs.find(program => program.id === block.command.programId
    && (program.kind || "autonomous") === block.command.scriptKind);
  const reason = block.unwrittenReason || program?.unwrittenReason
    || (program?.unwrittenOverflowBytes ? `容量不足，超出 ${program.unwrittenOverflowBytes} 字节` : null);
  return `<h4>${esc(label)}${block.command?.movementRuns ? ` · ${(block.command.movementInstructions || block.command.movementRuns).length} 步` : ''}${block.dialogueWindow || block.runtimeSource || block.driver && !block.command ? ' · 只读' : ''}</h4>${
    reason ? `<span data-script-unwritten title="${esc(`未进 ROM：${reason}`)}">↛</span>` : ""}${
    block.driver && (!dialogue || !block.driver.value) ? storyDriverDetails(block.driver) : ""}`;
}

function storyDriverDetails(driver) {
  const value = item => item == null ? "—" : referencedTextMarkup(typeof item === "object" ? JSON.stringify(item) : String(item));
  const current = driver.value;
  const resource = (owner, id) => id == null ? "—"
    : storyResourceMarkup(`${owner}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`);
  let content;
  if (driver.property === "dialogue") content = `<dt>显示</dt><dd>隐藏</dd>`;
  else if (driver.property === "scene") content = `<dt>场景</dt><dd>${current.scene >= 0 ? storyResourceMarkup(`scene:${Number(current.scene).toString(16).toUpperCase().padStart(2, "0")}`) : "—"}</dd>
    <dt>落点</dt><dd>${value(current.player)}</dd>`;
  else if (driver.group === "interface") content = current ? `<dt>显示</dt><dd>${esc(current.label)}</dd>
    ${current.screen ? `<dt>界面</dt><dd>${storyInterfaceMarkup(current)}</dd>` : ""}
    ${current.context?.vehicle_slot != null ? `<dt>战车</dt><dd>${current.context.vehicle_slot + 1}</dd>` : ""}
    ${current.context?.role_slot != null ? `<dt>人物</dt><dd>${value(`character:${Number(current.context.role_slot).toString(16).toUpperCase().padStart(2, "0")}`)}</dd>` : ""}
    ${current.target != null ? `<dt>通缉目标</dt><dd>${value(`encounter-formation:${Number(current.target).toString(16).toUpperCase().padStart(2, "0")}`)}</dd>` : ""}`
    : "<dt>显示</dt><dd>隐藏</dd>";
  else if (driver.property === "appearance") content = `<dt>形象</dt><dd>${resource({
    "direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite",
  }[current?.[1]] || "actor-type", current?.[0])}${current?.[2] == null ? "" : ` · P${current[2]}`}</dd>`;
  else if (driver.group === "audio") content = driver.property === "music"
    ? `<dt>音乐</dt><dd>${current == null ? "未播放" : resource("audio-command", current)}</dd>`
    : driver.property === "audio-fade" ? `<dt>淡出</dt><dd>${current == null ? "无" : resource("audio-control", current)}</dd>`
      : driver.property === "music-status" ? `<dt>播放</dt><dd>${esc({playing: "播放中", fading: "淡出中",
        "inherited-unknown": "继承现场", "stopped-after-fade-reset": "已停止"}[current] || current || "未载入")}</dd>`
      : `<dt>声音</dt><dd>${value(current?.command)}</dd>`;
  else if (["position", "camera"].includes(driver.property)) content = `<dt>位置</dt><dd>${value(current?.slice(0, 2))}</dd>`;
  else if (driver.property === "direction") content = `<dt>朝向</dt><dd>${esc({up: "上", down: "下", left: "左", right: "右"}[current] || current)}</dd>`;
  else if (driver.property === "visibility") content = `<dt>显示</dt><dd>${current ? "可见" : "隐藏"}</dd>`;
  else if (driver.property === "lock") content = `<dt>操控锁</dt><dd>${current ? "锁定" : "释放"}</dd>`;
  else if (driver.property === "flag") content = `<dt>当前值</dt><dd>${current ? "已置位" : "未置位"}</dd>`;
  else if (driver.property === "confirm") content = `<dt>确认</dt><dd>${current.presses} 次</dd><dt>等待</dt><dd>${current.waitFrames} 帧</dd>`;
  else if (driver.property === "fade") content = `<dt>不透明度</dt><dd>${Math.round(Number(current) * 100)}%</dd>`;
  else if (driver.property === "field-fade") content = current
    ? `<dt>阶段</dt><dd>${current.phase === "scene-loading" ? "装载场景" : "渐显"}</dd><dt>亮度减量</dt><dd>${value(current.decrement)}</dd>`
    : "<dt>渐显</dt><dd>结束</dd>";
  else if (driver.property === "scroll") content = `<dt>画面偏移 Y</dt><dd>${value(current)}</dd>`;
  else if (driver.property === "offset") content = `<dt>画面偏移</dt><dd>${value(current)}</dd>`;
  else if (driver.property === "execution") content = `<dt>执行</dt><dd>${current?.[1] ? "阻塞" : current?.[0] ? "结束" : "运行"}</dd>`;
  else if (driver.property === "battle") content = current ? `<dt>编队</dt><dd>${resource("encounter-formation", current.formationId)}</dd>
    <dt>预览结果</dt><dd>${current.assumedResult === "victory" ? "假定胜利" : value(current.assumedResult)}</dd>` : "<dt>战斗</dt><dd>无</dd>";
  else if (driver.property === "service") content = `<dt>目的地</dt><dd>${value(current?.destination)}</dd>`;
  else if (driver.property === "party") content = `<dt>队员</dt><dd>${(current || []).map(slot => resource("character", slot)).join(" · ") || "无"}</dd>`;
  else if (driver.property === "entities") content = `<dt>实体数</dt><dd>${value(current?.[0])}</dd>`;
  else if (driver.property === "vehicles") content = (current || []).flatMap((vehicle, index) => {
    if (JSON.stringify(vehicle) === JSON.stringify(driver.before?.[index])) return [];
    const parked = vehicle.parked;
    return [`<dt>战车</dt><dd>${resource("vehicle", vehicle.slot)}</dd><dt>停放</dt><dd>${parked
      ? `${resource("scene", parked.sceneId)} · (${parked.x}, ${parked.y})` : "未停放"}</dd>`];
  }).join("") || "<dt>战车</dt><dd>未载入</dd>";
  else if (driver.property === "members") content = (current || []).flatMap((member, index) => {
    if (JSON.stringify(member) === JSON.stringify(driver.before?.[index])) return [];
    return [`<dt>队员</dt><dd>${resource("character", member.slot)}</dd><dt>HP</dt><dd>${value(member.currentHp)}</dd>`];
  }).join("") || "<dt>队伍</dt><dd>未载入</dd>";
  else if (driver.property === "inventory") content = (current || []).flatMap((rows, kind) => (rows || []).flatMap((items, slot) =>
    (items || []).flatMap((item, index) => item === driver.before?.[kind]?.[slot]?.[index] ? []
      : [`<dt>${kind === 0 ? "背包" : "装备"} ${index + 1}</dt><dd>${resource("character", slot)} · ${item ? resource("item-entry", item) : "空"}</dd>`]))).join("")
    || "<dt>携带物</dt><dd>未载入</dd>";
  else content = `<dt>当前值</dt><dd>${value(current)}</dd>`;
  return `<dl class="story-inspector-fields" data-story-driver-details>${content}</dl>`;
}

export function storyTimelineRowDetails(model, lane, block, selectedLane = lane, editor = "") {
  if (selectedLane.objectRoot && !block) return "";
  const identity = `<a class="editor-inline-link" href="${esc(storyTimelineRowAddress(model.view, model.sequenceId, selectedLane.id))}">${handleMarkup(selectedLane.rowId)}</a>`;
  const script = block?.command ? `story-${block.command.scriptKind}-script:script:${Number(block.command.programId).toString(16).toUpperCase().padStart(2, "0")}` : null;
  const source = `<dl class="story-inspector-fields"><dt>键</dt><dd>${identity}</dd><dt>执行链</dt><dd>${referencedTextMarkup(`story-sequence:${model.sequenceId}`)}</dd>
    ${script ? `<dt>脚本</dt><dd>${referencedTextMarkup(script)}</dd>` : ""}</dl>`;
  const owners = [...editor.matchAll(/<span data-story-command-owner="[^"]*"><\/span>/gu)].map(match => match[0]).join("");
  editor = editor.replace(/<span data-story-command-owner="[^"]*"><\/span>/gu, "");
  const runtimeResult = editor.match(/<div data-story-key-runtime>[\s\S]*?<\/div>/u)?.[0] || "";
  editor = editor.replace(runtimeResult, "");
  const textEnd = editor.indexOf('<div data-story-key-operands>');
  const reset = editor.match(/<button[^>]*data-story-command-reset="[^"]*"[^>]*>⟲<\/button>/u)?.[0] || "";
  const keyReset = textEnd < 0 ? reset : "";
  if (reset) editor = editor.replace(reset, "");
  const text = textEnd < 0 ? editor : editor.slice(0, textEnd);
  const operands = textEnd < 0 ? "" : editor.slice(textEnd);
  const routine = block?.dialogueWindow ? "buildStoryVmVariant / activeDialogue / buildStoryVmSequence / dialogueForStage"
    : block?.runtimeSource || (block?.driver && !block.command ? block.driver.source : null);
  const runtimeSource = routine
    ? `<dl class="story-inspector-fields"><dt>来源例程</dt><dd>${esc(routine)}</dd></dl>` : "";
  const provenance = `<details data-story-key-source><summary>来源${textEnd < 0 ? "" : reset}</summary>${source}${runtimeSource}${owners}${runtimeResult}
      <div class="story-script-operands">${operands}</div></details>`;
  return `<section class="story-timeline-command is-current" data-story-timeline-command${block ? " data-story-key-inspector" : ""}>
    <div class="story-key-head"><div data-story-command-summary>${storyTimelineCommandSummary(block)}</div>${keyReset}</div>
    <div class="story-script-operands">${text}</div>
    ${provenance}
  </section>`;
}

export function storyTimelineCurrentValues(model, lane, frame) {
  const snapshot = model.compiled?.frames[frame] || {};
  const object = model.trace?.objects.find(object => object.id === lane.objectId);
  const currentActor = object && frame >= object.start && frame < object.end
    ? [...(snapshot.actors || []), ...(snapshot.partyActors || []), ...(snapshot.temporaryEntities || [])]
      .find(item => object.partySlot != null ? item.partySlot === object.partySlot
        : object.fieldEntityIndex !== undefined ? item.fieldEntityIndex === object.fieldEntityIndex
          : item.actorSlot === object.actorSlot) : null;
  const value = (label, current) => `<dt>${label}</dt><dd>${current}</dd>`;
  const number = value => Number.isFinite(value) ? Number(value.toFixed(2)) : "—";
  let values = "";
  if (lane.actorRoot) {
    values = currentActor ? value("位置", `(${number(currentActor.x)}, ${number(currentActor.y)})`)
      + value("朝向", esc({up: "上", down: "下", left: "左", right: "右"}[currentActor.direction] || currentActor.direction))
      + value("形象", storyResourceMarkup(`${{"direct-actor-frame": "direct-frame", "generic-metasprite": "metasprite"}[currentActor.renderMode] || "actor-type"}:${Number(currentActor.actorType).toString(16).toUpperCase().padStart(2, "0")}`))
      + value("显示", storyActorIsVisible(currentActor) ? "可见" : "隐藏") : value("状态", "非当前幕");
  } else if (lane.objectId === "object:camera") {
    values = value("场景", snapshot.sceneId >= 0 ? storyResourceMarkup(`scene:${Number(snapshot.sceneId).toString(16).toUpperCase().padStart(2, "0")}`) : "—")
      + value("相机", `(${number(snapshot.cameraTileOriginX)}, ${number(snapshot.cameraTileOriginY)})`);
  } else if (lane.flagId !== undefined) values = value("当前值", (snapshot.eventFlags || []).includes(lane.flagId) ? "已置位" : "未置位");
  else if (lane.objectId === "object:input") values = value("操控锁", snapshot.controlLock ? "锁定" : "释放");
  else if (lane.objectId === "object:dialogue") values = value("台词", esc(snapshot.dialogue?.text || snapshot.dialogue?.lines?.join(" ") || "隐藏"));
  else if (lane.objectId === "object:interface") values = value("界面", esc(storySnapshotInterface(snapshot)?.label || "隐藏"));
  else if (lane.objectId === "object:audio") values = value("曲目", snapshot.audioState?.currentMusicCommandId == null ? "未播放"
    : storyResourceMarkup(`audio-command:${Number(snapshot.audioState.currentMusicCommandId).toString(16).toUpperCase().padStart(2, "0")}`));
  else if (lane.objectId === "object:flow") values = value("剧情状态", esc(String(snapshot.storyState ?? "—")))
    + value("场景", snapshot.sceneId == null ? "—"
      : storyResourceMarkup(`scene:${Number(snapshot.sceneId).toString(16).toUpperCase().padStart(2, "0")}`));
  return `<small data-story-row-frame>F${frame}</small><dl class="story-inspector-fields">${values}</dl>`;
}
