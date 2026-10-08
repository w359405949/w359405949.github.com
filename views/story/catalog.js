// @editor-module 剧情序列目录与 trace 诊断
import {editorLog} from "../../core/editor-log.js";
import {$, esc} from "../../core/dom.js";
import {fileUrl, visualUrl} from "../../core/package-io.js";
import {
  resourceForwardReferenceCell,
  recordUid,
} from "../../core/resource-index.js";
import {handleMarkup, handleTextMarkup as storyHandleTextMarkup} from "../../ui/handle.js";
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';
import {storyScriptHandle, storyTextHandle, storyTextMarkup, storyResourceMarkup} from "./handles.js";
import {state} from "../../core/state.js";
import {saveEventHref} from "../../core/save-page-links.js";
import {db} from "../../core/project-db.js";
import {fields, panel, recordPage} from "../../ui/record.js";
import {physicalLocationMarkup} from "../../ui/physical-location.js";
import {
  ACTOR_ENTRY_SCENE_OBJECT,
  actorAtlasCanvas,
  peekActorAppearance,
} from "../../render/actor-atlas.js";
import {datasetFacts} from "../../ui/shell.js";
import {storySceneLink} from "./scene-link.js";
import {dataTable} from "../../ui/table.js";
import {mountStorySceneActions} from '../../modules/story/scene-actions.js';
import {prepareStorySceneActions} from '../../core/story-scene-actions.js';
import {prepareStoryReferenceDetails, paintStoryReferenceDetails} from '../../modules/story/reference-details.js';







//
// 来源：拆分前 engine/editor/app.js 第 4737-4992 行。






// 动作脚本三个来源共用一张表。族的顺序、标签和一句话说明只在这里登记一次。
const STORY_SCRIPT_KINDS = {
  autonomous: ["角色自动动作", "场景角色记录 byte 5 直接选择的 bank $12 流程"],
  interaction: ["交互与事件动作", "无文本区角色记录 byte 4 选择的 bank $13 流程"],
  inline: ["文本内联动作", "文本控制码 $F5 直接调用同一套动作处理器"],
};

function storyScriptEntries(kind) {
  const story = state.project.story || {};
  if (kind === "inline") return story.inline_actions || [];
  return story[kind]?.entries || [];
}

function storyScriptKind() {
  return STORY_SCRIPT_KINDS[state.storyKind] ? state.storyKind : "autonomous";
}

function storyScriptUid(kind, id) {
  return `story:${kind}:${Number(id).toString(16).toUpperCase().padStart(2, "0")}`;
}

// 列表与记录页共用同一份过滤后的顺序，否则「下一条」会跳到列表里看不见的行。
function storyScriptRows(kind = storyScriptKind()) {
  const source = storyScriptEntries(kind);
  const q = state.query.trim().toLowerCase();
  if (!q) return source;
  return source.filter(item => JSON.stringify(item).toLowerCase().includes(q));
}

function storyScriptById(kind, recordId) {
  const key = kind === "inline" ? "opcode" : "id";
  return storyScriptEntries(kind).find(
    item => String(item[key]) === String(recordId)
  ) || null;
}

export function renderStorySequences() {
  const story = state.project.story || {};
  const summary = story.summary || {};
  if (!Object.keys(STORY_SCRIPT_KINDS).some(kind => storyScriptEntries(kind).length)) {
    return ``;
  }
  const kind = storyScriptKind();
  state.storyKind = kind;
  const source = storyScriptEntries(kind);
  const rows = storyScriptRows(kind);
  const tabs = `<div class="data-tabs story-kind-tabs" role="tablist" aria-label="动作脚本来源">
    ${Object.entries(STORY_SCRIPT_KINDS).map(([id, [label]]) => `<button class="button ${kind === id ? "primary" : "ghost"}" data-story-kind="${id}">
      ${esc(label)} <small>${storyScriptEntries(id).length}</small>
    </button>`).join("")}
  </div>`;
  const hint = ``;
  const table = kind === "inline"
    ? dataTable({
      columns: storyInlineColumns(),
      rows,
      rowId: row => row.opcode,
      recordRoute: row => `story-inline/${row.opcode}`,
      selectedId: state.recordId,
      total: source.length,
      empty: "没有匹配的内联动作",
    })
    : dataTable({
      columns: storyScriptColumns(kind),
      rows,
      rowId: row => row.id,
      recordRoute: row => `story-script/${row.id}`,
      selectedId: state.recordId,
      total: source.length,
      empty: "没有匹配的脚本",
    });
  return `${tabs}${hint}${table}`;
}

function storyScriptColumns(kind) {
  return [
    {key: "uid", label: "资源 ID", mono: true, width: 280, sticky: true,
      cell: row => {
        const uid = storyScriptUid(kind, row.id);
        return `<button class="resource-uid" type="button" data-resource-query="${uid}">${handleMarkup(storyScriptHandle(kind, row.id))}</button>`;
      }},
    {key: "id_hex", label: "游戏索引 ID", mono: true, width: 280, sticky: true,
      cell: row => handleMarkup(storyScriptHandle(kind, row.id))},
    {key: "label", label: "名称", width: 190,
      cell: row => `<span class="record-link">${esc(
        row.label || `${kind === "autonomous" ? "自动动作" : "交互动作"} ${row.id_hex}`
      )}</span>`},
    {key: "preview", label: "缩略图", width: 92,
      cell: row => row.primary_actor_sprite_recipe
        ? `<span class="story-table-actor">${actorAtlasCanvas({
            pair: row.primary_actor_sprite_recipe.actor_set,
            actorType: row.primary_actor_sprite_recipe.actor_type,
            entryPoint: row.primary_actor_sprite_recipe.entry_point,
          })}</span>`
        : `<span class="resource-empty">无</span>`},
    {key: "reachable_command_count", label: "可达命令", mono: true, align: "right", width: 76},
    {key: "cursors", label: "游标数", mono: true, align: "right", width: 66,
      cell: row => String((row.reachable_cursors || []).length)},
    {key: "categories", label: "分类", width: 120,
      cell: row => esc((row.categories || []).join(" ") || "—")},
    {key: "first_command", label: "首命令", mono: true, width: 130,
      cell: row => {
        const command = (row.command_preview || [])[0];
        return command
          ? `<span title="${esc(command.raw_window_hex)}">${esc(command.opcode_hex)} ${esc(command.name)}</span>`
          : "—";
      }},
    {key: "reference_count", label: "引用数", mono: true, align: "right", width: 66},
    {key: "validation_tags", label: "验证标记", width: 140,
      cell: row => esc((row.validation_tags || []).join(" ") || "—")},
    {key: "issues", label: "问题", mono: true, align: "right", width: 56,
      cell: row => String((row.issues || []).length)},
    {key: "refs", label: "引用资产", width: 150,
      cell: row => resourceForwardReferenceCell(storyScriptUid(kind, row.id))},
    {key: "status", label: "状态", width: 100},
  ];
}

function storyInlineColumns() {
  return [
    {key: "uid", label: "资源 ID", mono: true, width: 150, sticky: true,
      cell: row => {
        const uid = storyScriptUid("inline", row.opcode);
        return `<button class="resource-uid" type="button" data-resource-query="${uid}">${handleMarkup(storyScriptUid("inline", row.opcode))}</button>`;
      }},
    {key: "opcode_hex", label: "游戏索引 ID", mono: true, width: 96, sticky: true,
      cell: row => handleMarkup(storyScriptUid("inline", row.opcode))},
    {key: "name", label: "名称", width: 190,
      cell: row => `<span class="record-link">${esc(row.name)}</span>`},
    {key: "category", label: "类别", width: 130},
    {key: "usage_count", label: "文本调用数", mono: true, align: "right", width: 90},
    {key: "first_use", label: "首个调用位置", mono: true, width: 200,
      cell: row => {
        const use = (row.usages || [])[0];
        return use
          ? storyTextMarkup(storyTextHandle(use.region_id, use.record_id))
          : "—";
      }},
    {key: "regions", label: "涉及文本区", mono: true, width: 150,
      cell: row => esc([...new Set((row.usages || []).map(use => use.region_id_hex))].join(" ") || "—")},
  ];
}

// ---------------------------------------------------------------------------
// 记录页：表格放不下的东西——角色图形、完整命令表、逐条引用、原始字节。
// ---------------------------------------------------------------------------

export function renderStoryScriptRecord(recordId) {
  const kind = storyScriptKind();
  const entry = storyScriptById(kind, recordId);
  if (!entry) return null;
  const rows = storyScriptRows(kind);
  const key = kind === "inline" ? "opcode" : "id";
  const index = rows.findIndex(item => String(item[key]) === String(recordId));
  const neighbours = {
    prevId: index > 0 ? rows[index - 1][key] : null,
    nextId: index >= 0 && index < rows.length - 1 ? rows[index + 1][key] : null,
  };
  return kind === "inline"
    ? storyInlineRecord(entry, neighbours)
    : storyScriptRecord(kind, entry, neighbours);
}

function storyScriptRecord(kind, entry, neighbours) {
  const uid = storyScriptUid(kind, entry.id);
  const label = entry.label || `${kind === "autonomous" ? "自动动作" : "交互动作"} ${entry.id_hex}`;
  const range = entry.encoded_range || {};
  const spriteRecipes = entry.actor_sprite_recipes || [];
  const commands = entry.command_preview || [];
  const references = entry.references || [];
  const panels = [
    panel("基本信息", fields([
      ["游戏索引 ID", handleMarkup(storyScriptHandle(kind, entry.id))],
      ["名称", esc(label)],
      ["来源", esc(STORY_SCRIPT_KINDS[kind][0])],
      ["状态", esc(entry.status || "—")],
      ["分类", esc((entry.categories || []).join(" ") || "—")],
      ["验证标记", esc((entry.validation_tags || []).join(" ") || "—")],
      ["资产源文件", `<a href="${fileUrl(`game/story/${entry.path}`)}" target="_blank">${esc(entry.path)} ↗</a>`],
    ])),
    panel("指针与命令", fields([
      ["可达命令数", String(entry.reachable_command_count || 0)],
      ["可达游标", `<code>${esc((entry.reachable_cursors_hex || []).join(" ") || "—")}</code>`],
    ])),
    panel(`绑定角色图形${spriteRecipes.length ? `（${spriteRecipes.length}）` : ""}`, spriteRecipes.length
      ? `<div class="record-preview-strip">${spriteRecipes.map(recipe =>
        actorAtlasCanvas({
          pair: recipe.actor_set,
          actorType: recipe.actor_type,
          entryPoint: recipe.entry_point,
          label: `${esc(label)} 绑定角色图形`,
        })
      ).join("")}</div>`
      : `<span class="resource-empty">逻辑对象或不可见对象</span>`),
    panel("引用关系", fields([
      ["场景引用数", String(entry.reference_count || 0)],
      ["引用资产", resourceForwardReferenceCell(uid)],
    ])),
    ...(entry.state_references?.length ? [panel("存档状态引用", entry.state_references.map(reference => {
      const flag = eventFlagReferenceMarkup(reference.flag_id);
      const links = [1, 2].map(slot =>
        `<a class="editor-inline-link" href="${esc(saveEventHref(slot, reference.flag_id))}">槽 ${slot} 事件位</a>`).join(" · ");
      const access = reference.operation === "set-after-victory" ? "战斗胜利写入"
        : reference.access === "write" ? "写入" : "读取";
      return `<p data-story-event-flag="${reference.flag_id}">${flag} · ${access} · ${links}</p>`;
    }).join(""))] : []),
    panel("原始字节", entry.encoded_bytes_preview_hex
      ? `<code class="record-bytes">${esc(entry.encoded_bytes_preview_hex)}</code>`
      : ``),
    panel("字段对象", `<div id="story-script-field-object" data-story-script-field-object="${esc(kind)}:${Number(entry.id)}"></div>`),
    panel("动作与台词", '<div data-story-script-details></div>', {wide: true, flat: true}),
    panel("命令表", commands.length
      ? `<div class="table-wrap"><table class="record-subtable">
        <thead><tr><th>游标</th><th>OPCODE</th><th>名称</th><th>类别</th><th>原始窗口</th></tr></thead>
        <tbody>${commands.map(command => `<tr>
          <td class="mono">${esc(command.cursor_hex)}</td>
          <td class="mono">${esc(command.opcode_hex)}</td>
          <td>${esc(command.name)}</td>
          <td>${esc(command.category)}</td>
          <td class="mono">${esc(command.raw_window_hex)}</td>
        </tr>`).join("")}</tbody></table></div>`
      : ``,
      {wide: true}),
  ];
  if ((entry.issues || []).length) {
    panels.push(panel("问题", `<ul class="record-issues">${entry.issues.map(
      issue => `<li>${esc(typeof issue === "string" ? issue : JSON.stringify(issue))}</li>`
    ).join("")}</ul>`, {wide: true}));
  }
  panels.push(panel(`引用它的场景角色记录（${references.length}）`, references.length
    ? `<div class="table-wrap"><table class="record-subtable">
      <thead><tr><th>资源 ID</th><th>场景</th><th>记录</th><th>类型</th>
        <th>X</th><th>Y</th><th>朝向</th><th>调色板</th><th>渲染来源</th><th>运动 / 图形</th>
        <th>文本区</th><th>交互/记录 ID</th><th>原始字节</th></tr></thead>
      <tbody>${references.map(ref => {
        const marker = Number(ref.render_slot_marker || 0);
        const appearance = marker === 0 ? peekActorAppearance(
          Number(ref.actor_type), {entryPoint: ACTOR_ENTRY_SCENE_OBJECT},
        ) : null;
        const visualSource = marker === 0 ? "actor-visual" : "metasprite-record";
        const visualLabel = marker === 0
          ? appearance?.motionLabel || "无有效角色运动"
          : marker === 1
            ? `直接帧 ${recordUid("direct-frame", ref.actor_type)}`
            : `通用 metasprite ${recordUid("metasprite", ref.actor_type)}`;
        return `<tr>
        <td><button class="resource-uid" type="button" data-resource-query="${esc(ref.uid)}">${handleMarkup(ref.uid)}</button></td>
        <td class="mono">${Number(ref.scene_actor_entry_id) <= 0xEF ? storySceneLink(ref.scene_actor_entry_id)
          : handleMarkup(recordUid("scene-actor-list", ref.scene_actor_entry_id))}</td>
        <td class="mono">${handleMarkup(ref.uid)}</td>
        <td class="mono">${storyResourceMarkup(recordUid(marker === 1 ? "direct-frame" : marker ? "metasprite" : "actor-type", ref.actor_type))}</td>
        <td class="mono right">${esc(ref.x)}</td>
        <td class="mono right">${esc(ref.y)}</td>
        <td>${esc(ref.direction || "—")}</td>
        <td class="mono right">${esc(ref.palette)}</td>
        <td class="mono">${esc(visualSource)}</td>
        <td>${storyHandleTextMarkup(visualLabel)}</td>
        <td class="mono">${esc(ref.text_region_hex || "—")}</td>
        <td class="mono">${ref.text_region ? storyTextMarkup(storyTextHandle(ref.text_region, ref.interaction_or_record_id))
          : ref.interaction_or_record_id ? handleMarkup(storyScriptHandle("interaction", ref.interaction_or_record_id)) : "—"}</td>
        <td class="mono">${esc(ref.raw_hex)}</td>
      </tr>`;
      }).join("")}</tbody></table></div>`
    : ``, {wide: true}));
  return recordPage({
    title: label,
    uid: storyScriptHandle(kind, entry.id),
    physicalRows: [
      {label: "脚本入口", address: {space: "prg", offset: entry.pointer_prg}},
      {label: "入口指针", address: {space: "prg", offset: entry.pointer_entry_prg}},
    ].filter(row => Number.isInteger(row.address.offset)),
    backLabel: "返回动作脚本",
    ...neighbours,
    panels,
  });
}

export async function bindStoryScriptCommandAddresses() {
  if (state.recordId == null || state.actorVisualTab !== "story") return;
  const entry = storyScriptById(storyScriptKind(), state.recordId);
  if (!entry?.path) return;
  const host = document.querySelector("[data-physical-location]");
  if (!host) return;
  const source = await db.getPackageDocument(`game/story/${entry.path}`, null);
  if (source?.id !== entry.id || source?.kind !== storyScriptKind()) return;
  if (!host.isConnected) return;
  const open = host.open;
  host.outerHTML = physicalLocationMarkup({uid: storyScriptUid(storyScriptKind(), entry.id),
    rows: (source.commands || []).filter(command => Number.isInteger(command.prg_offset))
      .map(command => ({label: `命令 ${command.cursor_hex}`,
        address: {space: "prg", offset: command.prg_offset}}))});
  if (open) document.querySelector("[data-physical-location]").open = true;
  const fieldHost = document.querySelector("[data-story-script-field-object]");
  if (!fieldHost) return;
  const resourceId = `story-${storyScriptKind()}-script`;
  const handle = `${resourceId}:script:${Number(entry.id).toString(16).toUpperCase().padStart(2, "0")}`;
  try {
    const object = await db.getFieldObject(resourceId, handle);
    if (!fieldHost.isConnected) return;
    const bytecode = object.fields.find(field => field.entityHandle === handle
      && field.fieldName === "bytecode")?.value;
    if (!Array.isArray(bytecode)) throw new Error(`${handle}.bytecode 不存在`);
    await object.mount(fieldHost, {rowHandles: [handle], compactIdentity: true});
    const detailsHost = document.querySelector('[data-story-script-details]');
    if (detailsHost) {
      const refresh = async () => {
        const [details] = await prepareStoryReferenceDetails(
          await db.getResourceDocument(resourceId), storyScriptKind(), [entry]);
        if (!detailsHost.isConnected) return;
        detailsHost.innerHTML = details.details;
        await paintStoryReferenceDetails(detailsHost);
      };
      await refresh();
      object.fields.find(field => field.entityHandle === handle && field.fieldName === 'bytecode')
        ?.bind(detailsHost, (_node, _value, _field, reason) => {
          if (reason !== 'initial') void refresh().catch(error => {
            editorLog.error("剧情", `操作失败：${error?.message || error}`, error);
            detailsHost.textContent = error.message;
            detailsHost.setAttribute('role', 'alert');
          });
        });
    }
    if (storyScriptKind() === 'autonomous') {
      const record = {autonomous_script_id: Number(entry.id)};
      const scenes = await db.getDocument('project.scenes');
      const actors = await db.getAll('scene-actor', []);
      const actor = actors.find(row => Number(row.autonomous_script_id) === Number(entry.id));
      const shot = state.project.story.browser_vm?.sequences?.flatMap(sequence => sequence.shots || [])
        .find(shot => Number(shot.variant_id) === Number(actor?.entry_id));
      const sceneId = Number(actor?.entry_id) < 0xf0 ? Number(actor.entry_id) : Number(shot?.scene_id ?? 0);
      const autonomous = await prepareStorySceneActions([record],
        await db.getResourceDocument(resourceId), state.project.story, db);
      await mountStorySceneActions(fieldHost, record,
        {autonomous, story: state.project.story, scenes}, db, sceneId);
    }
  } catch (error) {
    editorLog.error("剧情", `操作失败：${error?.message || error}`, error);
    if (fieldHost.isConnected) fieldHost.textContent = error?.message || String(error);
  }
}

function storyInlineRecord(entry, neighbours) {
  const uid = storyScriptUid("inline", entry.opcode);
  const usages = entry.usages || [];
  return recordPage({
    title: entry.name,
    uid,
    backLabel: "返回动作脚本",
    ...neighbours,
    panels: [
      panel("基本信息", fields([
        ["游戏索引 ID", handleMarkup(uid)],
        ["名称", esc(entry.name)],
        ["类别", esc(entry.category)],
        ["涉及文本区", esc([...new Set(usages.map(use => use.region_id_hex))].join(" ") || "—")],
      ])),
      panel("引用关系", fields([
        ["文本调用数", String(entry.usage_count || 0)],
      ])),
      panel(`文本调用位置（${usages.length}）`, usages.length
        ? `<div class="table-wrap"><table class="record-subtable">
          <thead><tr><th>文本区</th><th>记录</th><th>OPCODE</th><th>来源文件</th></tr></thead>
          <tbody>${usages.map(use => `<tr>
            <td class="mono">${esc(use.region_id_hex)}</td>
            <td class="mono">${storyTextMarkup(storyTextHandle(use.region_id, use.record_id))}</td>
            <td class="mono">${esc(use.opcode_hex)}</td>
            <td class="mono">${esc(use.source || "—")}</td>
          </tr>`).join("")}</tbody></table></div>`
        : ``, {wide: true}),
    ],
  });
}

export function storyPlaybackScenarios() {
  return state.project.story?.playback?.scenarios || [];
}


export function storyClock(frames, fps = 60) {
  const seconds = Math.max(0, frames) / fps;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}
