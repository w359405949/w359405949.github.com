// @editor-module 对话交互目录
//
// 来源：拆分前 engine/editor/app.js 第 7449-7524 行。

import {$, esc} from "../core/dom.js";
import {globalEventFlagHandle} from '../core/global-event-flags.js';
import {eventFlagReferenceMarkup} from '../modules/save/event-flags.js';
import {plainTextRecordReferences, resourceForwardReferenceCell} from "../core/resource-index.js";
import {sceneActorRecord} from "../core/scene-actors.js";
import {state} from "../core/state.js";
import {investigationStatusLabel} from "../views/investigation.js";
import {dataTable} from "../ui/table.js";
import {fields, panel, recordPage} from "../ui/record.js";
import {
  sceneActorVisualDescriptor,
  sceneActorVisualMarkup,
} from "../ui/actor-appearance.js";

function scriptCell(script) {
  if (!script) return `<span class="resource-empty">—</span>`;
  return `<button class="resource-inline-link" type="button"
    data-resource-target="${script.resource_id}"
    title="${esc((script.opcodes_hex || []).join(" "))}">${esc(script.resource_id)}</button>`;
}

export function renderNpcs() {
  const catalog = state.project.story?.npc_catalog || {};
  const records = catalog.records || [];
  if (!records.length) {
    return ``;
  }
  const summary = catalog.summary || {};
  const roles = [["all", "全部", records.length], ...(catalog.interaction_types || []).map(
    item => [item.id, item.label, item.count]
  )];
  if (!roles.some(([id]) => id === state.npcRole)) state.npcRole = "all";
  const actorOf = item => sceneActorRecord(item.uid);
  const searchDocument = item => {
    const {
      preview: _preview,
      animation_id: _animationId,
      animation_id_hex: _animationIdHex,
      frame_base: _frameBase,
      frame_base_hex: _frameBaseHex,
      ...semantic
    } = item;
    return {...semantic, scene_actor: actorOf(item)};
  };
  const q = state.query.trim().toLowerCase();
  const visible = records.filter(item =>
    (state.npcRole === "all" || item.role === state.npcRole)
    && (!q || JSON.stringify(searchDocument(item)).toLowerCase().includes(q))
  );
  // 每个细节自成一列：场景、坐标、朝向、selector、argument、图形、脚本分开，
  // 原来它们被压进五个复合单元格，一行能占三四行高。对话文本是逐条的多值，
  // 留在记录页；列表里只给条数。
  const visualCell = item => {
    const actor = actorOf(item);
    if (!actor) return `<span class="resource-empty">—</span>`;
    const descriptor = sceneActorVisualDescriptor(actor);
    const markup = sceneActorVisualMarkup({
      record: actor,
      pair: item.context_pairs?.[0],
      label: descriptor.label,
    });
    return `<span class="npc-actor-visual">${markup}
      <small>${esc(descriptor.source)} · ${esc(descriptor.label)}</small></span>`;
  };
  const columns = [
    {key: "uid", label: "资源 ID", mono: true, sticky: true, width: 132,
      cell: item => `<button class="resource-uid" type="button"
        data-resource-query="${item.uid}">${esc(item.uid)}</button>`},
    {key: "index", label: "索引", mono: true, width: 78,
      cell: item => `${esc(item.entry_id_hex)}:${esc(item.record_id_hex)}`},
    {key: "role", label: "交互类型", width: 140,
      cell: item => esc(item.role_label)},
    {key: "scene", label: "场景", width: 140,
      cell: item => (item.scenes || []).map(scene =>
        `<button class="resource-inline-link" type="button"
          data-resource-target="scene:${Number(scene.id).toString(16).toUpperCase().padStart(2, "0")}"
        >${esc(scene.name)}</button>`).join("、")
        || `<span class="resource-empty">特殊 / 动态角色表</span>`},
    {key: "position", label: "坐标", mono: true, align: "right", width: 76,
      cell: item => {
        const actor = actorOf(item);
        return actor ? `(${actor.x}, ${actor.y})` : "—";
      }},
    {key: "direction", label: "朝向", width: 62,
      cell: item => esc(actorOf(item)?.direction_name || "—")},
    {key: "actor_type", label: "类型 / 图形 ID", mono: true, width: 104,
      cell: item => esc(actorOf(item)?.actor_type_hex ?? "—")},
    {key: "selector", label: "选择码", mono: true, align: "right", width: 76,
      cell: item => esc(actorOf(item)?.text_region_hex ?? "—")},
    {key: "argument", label: "参数", mono: true, align: "right", width: 68,
      cell: item => esc(actorOf(item)?.interaction_or_record_id_hex ?? "—")},
    {key: "appearance", label: "形象与运动", width: 300,
      cell: visualCell},
    {key: "texts", label: "对话记录", align: "right", width: 82,
      cell: item => {
        const count = (item.text_references || []).length;
        return count
          ? `<span class="resource-reference-count" title="${esc(
              (item.text_references || []).map(text => text.node_id).join("\n"))}">${count}</span>`
          : `<span class="resource-empty">—</span>`;
      }},
    {key: "service", label: "服务命令", width: 150,
      cell: item => item.service
        ? `<button class="resource-inline-link" type="button"
            data-resource-target="${esc(item.service.application_resource_id)}"
            title="${esc(item.service.parameter_rule || "")}"
          >${esc(item.service.label)}</button>`
        : `<span class="resource-empty">—</span>`},
    {key: "service_selector", label: "命令号", mono: true, align: "right", width: 76,
      cell: item => esc(item.service?.selector_hex || "—")},
    {key: "battle", label: "触发战斗", width: 110,
      cell: item => {
        const effects = (item.interaction_effects || [])
          .filter(effect => effect.kind === "scripted-encounter");
        return effects.length
          ? effects.map(effect => `<button class="resource-inline-link" type="button"
              data-resource-target="${esc(effect.formation_resource_id)}"
              title="待提交 ${globalEventFlagHandle(effect.pending_event_flag)} · 剧情状态 ${esc(effect.story_state_hex)}"
            >编队 ${esc(effect.formation_id_hex)}</button>`).join("、")
          : `<span class="resource-empty">—</span>`;
      }},
    {key: "interaction_script", label: "交互脚本", mono: true, width: 130,
      cell: item => scriptCell(item.interaction_script)},
    {key: "autonomous_script", label: "自主动作", mono: true, width: 130,
      cell: item => scriptCell(item.autonomous_script)},
    {key: "references", label: "关联资产", width: 170,
      cell: item => resourceForwardReferenceCell(item.uid)},
  ];
  return `<div class="data-tabs npc-role-tabs" role="tablist" aria-label="NPC 功能分类">
      ${roles.map(([id, label, count]) => `<button class="button ${state.npcRole === id ? "primary" : "ghost"}" type="button" data-npc-role="${id}">${label} <small>${count}</small></button>`).join("")}
    </div>

    ${dataTable({
      columns,
      rows: visible,
      rowId: item => item.uid,
    })}`;
}

const NPC_TEXT_SOURCE = source => {
  if (source === "actor-record") return "角色记录直连";
  const opcode = String(source || "").match(/^interaction-opcode-([0-9A-F]{2})$/i)?.[1];
  return opcode ? `交互脚本操作码 $${opcode.toUpperCase()}` : String(source || "来源未标注");
};

/** 记录页：对话原文、交互效果、服务参数规则——都是逐条多值，列里放不下。 */
export function renderNpcRecord(records, uid) {
  const index = records.findIndex(item => item.uid === uid);
  if (index < 0) return null;
  const item = records[index];
  const actor = sceneActorRecord(item.uid);
  const visualDescriptor = actor ? sceneActorVisualDescriptor(actor) : null;
  const visualMarkup = actor ? sceneActorVisualMarkup({
    record: actor,
    pair: item.context_pairs?.[0],
    label: visualDescriptor.label,
  }) : "";
  const texts = item.text_references || [];
  const effects = item.interaction_effects || [];
  return recordPage({
    title: item.role_label,
    uid: item.uid,
    backLabel: "NPC 交互",
    prevId: index > 0 ? records[index - 1].uid : null,
    nextId: index < records.length - 1 ? records[index + 1].uid : null,
    panels: [
      panel("角色记录", fields([
        ["索引", `<span class="mono">${esc(item.entry_id_hex)}:${esc(item.record_id_hex)}</span>`],
        ["类型 / 图形 ID", `<span class="mono">${esc(actor?.actor_type_hex ?? "—")}</span>`],
        ["坐标", actor ? `(${actor.x}, ${actor.y}) · ${esc(actor.direction_name)}` : "记录未解析"],
        ["选择码", `<span class="mono">${esc(actor?.text_region_hex ?? "—")}</span>`],
        ["参数", `<span class="mono">${esc(actor?.interaction_or_record_id_hex ?? "—")}</span>`],
      ])),
      panel("角色形象与运动", visualMarkup
        ? `<div class="record-preview npc-record-actor-visual" title="${esc(visualDescriptor.source)} · ${esc(visualDescriptor.label)}">${visualMarkup}</div>`
        : `<div class="record-preview"><span class="resource-empty">当前场景图形上下文不可用</span></div>`),
      item.service ? panel("服务命令", fields([
        ["应用", `<button class="resource-inline-link" type="button"
          data-resource-target="${esc(item.service.application_resource_id)}">${esc(item.service.label)}</button>`],
        ["命令 / 参数", `<span class="mono">${esc(item.service.selector_hex)} · ${esc(item.service.argument_hex)} → ${esc(item.service.effective_argument_hex)}</span>`],
        ["语义状态", esc(investigationStatusLabel(item.service.semantic_status))],
        ["参数规则", esc(item.service.parameter_rule)],
      ])) : "",
      panel("对话文本", texts.length
        ? `<div class="record-fields">${texts.map(text =>
          `<div class="record-field">
            <span class="record-field-label">
              <button class="resource-inline-link" type="button"
                data-resource-target="${esc(text.resource_id)}"
                title="${esc(text.region_name)} · ${esc(NPC_TEXT_SOURCE(text.source))}">${esc(text.node_id)}</button>
            </span>
            <span class="record-field-value">
              ${text.found
                ? plainTextRecordReferences([text.node_id], "")
                : `<span class="resource-empty">文本记录未找到</span>`}
            </span>
          </div>`).join("")}</div>`
        : `<div class="record-preview"><span class="resource-empty">无对话文本</span></div>`),
      panel("交互效果", effects.length
        ? fields(effects.map(effect => [
          effect.kind === "scripted-encounter" ? "触发战斗" : effect.kind,
          effect.kind === "scripted-encounter"
            ? `编队 ${esc(effect.formation_id_hex)} · 待提交 ${eventFlagReferenceMarkup(effect.pending_event_flag)}
               · 剧情状态 ${esc(effect.story_state_hex)} · opcode ${esc(effect.opcode_hex)}`
            : esc(JSON.stringify(effect)),
        ]))
        : `<div class="record-preview"><span class="resource-empty">无已确认交互效果</span></div>`),
      panel("引用关系", fields([
        ["被引用数", resourceForwardReferenceCell(item.uid)],
      ])),
    ].filter(Boolean),
  });
}
