// @editor-module 场景逻辑对象、交互、调查与宝箱编辑器
import {render} from "../../main.js";
import {esc, hex} from "../../core/dom.js";
import {globalEventFlagHandle} from '../../core/global-event-flags.js';
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';
import {sceneEntityResourceUid} from "../../core/project-db.js";
import {sceneActorDocument, sceneActorRecord} from "../../core/scene-actors.js";
import {ensureVehicleDraft} from "../../core/vehicle-field-session.js";
import {state} from "../../core/state.js";
import {saveEventHref, saveBattleCatalog} from "../../core/save-page-links.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {battleFirstMonsterId, battleModeForPendingEventFlag} from "../../core/battle-mode.js";
import {actorInteractionMode} from "../../core/scene-interaction-destinations.js";
import {sceneElevatorPoints} from "../../core/scene-elevators.js";
import {sceneActorStateObjects} from "../../core/scene-entry-states.js";
import {sceneMapRewrites} from '../../core/scene-map-rewrites.js';
import {worldTideTriggers} from '../../core/world-tide.js';
import {sceneActorName} from '../../core/scene-actor-labels.js';
import {storyComponentLabel, storySequenceComponentLabel} from '../../core/story-component-labels.js';
import {vehicleName} from '../../core/vehicle-preset-views.js';







//
// 来源：拆分前 engine/editor/app.js 第 8369-8920 行。






// layers.actors 里只有 uid 引用；记录本体到超集里按 uid 现取。解析不到就
// 跳过——那说明 actors.json 与 logic.json 不是同一次提取的产物，宁可少显示
// 一行，也不要拿半截数据往下渲染。
function resolvedActorRows(view, extra) {
  return (view.records || []).flatMap(reference => {
    const record = sceneActorRecord(reference.uid);
    return record
      ? [{kind: "actor", layer: "actors", record, reference, ...extra(reference)}]
      : [];
  });
}

/** 初始停放记录从战车字段会话取得，并按当前场景筛选。 */
function sceneVehiclePlacements() {
  const sceneId = Number(state.sceneLogic?.scene_id);
  ensureVehicleDraft();
  const drafts = state.vehicleDraft?.placement;
  if (!drafts) return [];
  return Object.values(drafts)
    .filter(record => record.placed && Number(record.scene_id) === sceneId)
    .sort((left, right) => left.vehicle_slot - right.vehicle_slot)
    .map(record => ({
      key: `vehicle:${record.vehicle_slot}`,
      kind: "vehicle",
      layer: "vehicles",
      record,
      // preset_id 在草稿里没存（槽号即 preset 号），标签与资源链接要用。
      presetId: record.vehicle_slot,
    }));
}

export function sceneLogicObjects() {
  if (!state.sceneLogic) return [];
  const layers = state.sceneLogic.layers;
  const variantActors = (layers.actors.dynamic_variants || []).flatMap(variant =>
    resolvedActorRows(variant.actor_list, reference => ({
      key: `variant-${variant.replacement_entry_id}-actor:${reference.id}`,
      variant,
    }))
  );
  const dynamicBoundary = layers.transitions.dynamic_boundary_return
    ? [{
        key: "boundary:return", kind: "boundary-return", layer: "transitions",
        record: layers.transitions.dynamic_boundary_return,
      }]
    : [];
  const actors = [...resolvedActorRows(layers.actors, reference => ({key: `actor:${reference.id}`})), ...variantActors];
  return [
    ...worldTideTriggers(state.sceneTideDocument, state.sceneEntry.id).map(record => ({
      key: `tide:${record.id}`, kind: 'tide', layer: 'events', record,
    })),
    ...sceneElevatorPoints(state.scene, state.sceneElevatorMetatiles).map(record => ({
      key: `elevator:${record.id}`, kind: "elevator", layer: "transitions", record,
    })),
    ...(layers.metatile_investigation_points || []).map(record => ({key: `investigation-tile:${record.id}`, kind: "investigation-tile", layer: "investigations", record})),
    ...actors,
    ...actors.flatMap(object => sceneActorStateObjects(object, state.sceneStoryDocuments?.autonomous, state.project.story)),
    ...sceneMapRewrites(state.scene, {worldRaw: state.sceneWorldRaw,
      tide: state.sceneTideDocument, lifecycle: state.sceneBgmDocument,
      scenes: state.project.scenes.editable_scenes}).map(rewrite => ({
      key: rewrite.key, kind: rewrite.type === 'scene-remap' ? 'scene-state' : 'map-rewrite',
      layer: 'events', record: rewrite.record, rewrite,
    })),
    ...sceneVehiclePlacements(),
    ...layers.treasures.map(record => ({key: `treasure:${record.id}`, kind: "treasure", layer: "treasures", record})),
    ...layers.investigation_points.map(record => ({key: `investigation:${record.id}`, kind: "investigation", layer: "investigations", record})),
    ...(layers.investigation_special_points || []).map(record => ({key: `investigation-special:${record.id}`, kind: "investigation-special", layer: "investigations", record})),
    ...layers.transitions.point_transitions.map(record => ({key: `transition:${record.id}`, kind: "transition", layer: "transitions", record})),
    ...layers.transitions.boundary_exits.map(record => ({key: `boundary:${record.id}`, kind: "boundary", layer: "transitions", record})),
    ...dynamicBoundary,
    ...layers.event_triggers.map(record => ({key: `event:${record.id}`, kind: "event", layer: "events", record})),
  ];
}

export function selectedSceneLogicObject() {
  return sceneLogicObjects().find(item => item.key === state.sceneLogicSelection) || null;
}

export function sceneObjectResourceUid(item) {
  const sceneId = Number(state.sceneEntry?.id || 0);
  const sceneIdHex = sceneId.toString(16).toUpperCase().padStart(2, "0");
  if (item.rewrite) return item.rewrite.handle;
  // actor 的 uid 由超集给定，不在这里从 entry_id 和记录号拼——拼出来的是
  // 第二套生成规则，两边一旦不一致就会静默指向不存在的资源。
  if (item.kind === "actor") return item.record.uid;
  if (item.kind === 'scene-state') return item.record.handle;
  if (item.kind === 'tide') return item.record.handle;
  // 载具指向资源索引里已有的 preset 记录，不另造一套场景对象 uid。
  if (item.kind === "vehicle") return `vehicle:${Number(item.presetId).toString(16).toUpperCase().padStart(2, "0")}`;
  if (item.kind === "boundary-return") return `scene:${sceneIdHex}`;
  if (item.kind === "elevator") return item.record.map_handle;
  return sceneEntityResourceUid(item.kind, sceneId, item.record.id);
}

const sceneBoundaryDirections = {
  1: {side: "up", label: "上边界", arrow: "↑"},
  2: {side: "down", label: "下边界", arrow: "↓"},
  3: {side: "left", label: "左边界", arrow: "←"},
  4: {side: "right", label: "右边界", arrow: "→"},
};

export function sceneBoundarySides(record) {
  const direction = sceneBoundaryDirections[Number(record.direction_code)];
  return direction ? [direction.side] : ["up", "down", "left", "right"];
}

export function sceneBoundaryFocusCoordinate(item) {
  if (!item?.kind?.startsWith("boundary") || !state.scene) return null;
  const side = sceneBoundarySides(item.record)[0];
  const centerX = Math.max(0, Math.floor((Number(state.scene.width) - 1) / 2));
  const centerY = Math.max(0, Math.floor((Number(state.scene.height) - 1) / 2));
  if (side === "up") return [centerX, 0];
  if (side === "down") return [centerX, Number(state.scene.height) - 1];
  if (side === "left") return [0, centerY];
  return [Number(state.scene.width) - 1, centerY];
}

export function sceneBoundaryMatchesCell(item, x, y) {
  if (!item.kind.startsWith("boundary")) return false;
  const sides = sceneBoundarySides(item.record);
  return (sides.includes("up") && y === 0)
    || (sides.includes("down") && y === Number(state.scene.height) - 1)
    || (sides.includes("left") && x === 0)
    || (sides.includes("right") && x === Number(state.scene.width) - 1);
}

function sceneInteractionStateLabel(record) {
  return record?.interaction_state?.label || "";
}

export function renderSceneInteractionLinks(record, kind) {
  const battles = saveBattleCatalog().entries.filter(row =>
    row.scene_id === Number(state.sceneLogic?.scene_id) && (kind === "actor"
      ? row.actor_uid === record.uid : kind === "entry-story"
        ? row.entrance_object_key === record.key : row.object_key === `${kind}:${record.id}`));
  const battleLinks = battles.map(row => {
    const flag = row.suppression_flag ?? row.victory_flag;
    const links = flag == null ? "" : [1, 2].map(slot =>
      `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flag))}" title="存档战斗状态">槽 ${slot} ↗</a>`).join(" · ");
    return `<p class="scene-content-note" data-scene-battle-state="${esc(row.id)}"${
      row.condition ? ` title="${esc(row.condition)}"` : ""}>${row.shadowed_by != null
        ? `被坐标事件 ${row.shadowed_by} 覆盖` : `一次性：${row.one_time ? "是" : "否"}`} · ${links || "—"}</p>`;
  }).join("");
  if (kind === "actor") {
    const actor = (state.project?.story?.npc_catalog?.records || [])
      .find(item => item.uid === record.uid);
    const flags = [...new Set((actor?.state_references || []).map(reference => Number(reference.flag_id)))]
      .filter(Number.isInteger);
    return battleLinks + flags.map(flagId => {
      const links = [1, 2].map(slot =>
        `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flagId))}">槽 ${slot} 事件位</a>`).join(" · ");
      return `<p class="scene-content-note">${eventFlagReferenceMarkup(flagId)} · ${links}</p>`;
    }).join("");
  }
  if (kind === "event" && Number.isInteger(Number(record?.event_flag))) {
    const flagId = Number(record.event_flag);
    const links = [1, 2].map(slot =>
      `<a class="editor-inline-link" href="${esc(saveEventHref(slot, flagId))}">槽 ${slot} 事件位</a>`).join(" · ");
    return battleLinks + `<p class="scene-content-note">${eventFlagReferenceMarkup(flagId)} · ${links}</p>`;
  }
  const model = record?.interaction_state;
  if (model?.class !== "treasure-collected-flag" || !Number.isInteger(Number(model.flag_id))) return battleLinks;
  const links = [1, 2].map(slot =>
    `<a class="editor-inline-link" href="${esc(saveEventHref(slot, model.flag_id, {treasure: true}))}">槽 ${slot} 取得位</a>`).join(" · ");
  return battleLinks + `<p class="scene-content-note">${links}</p>`;
}

export function renderSceneInteractionState(record) {
  const model = record?.interaction_state;
  if (!model) return '';
  const flag = Number.isInteger(Number(model.flag_id)) ? ` · ${model.class === 'treasure-collected-flag'
    ? `调查物取得位 ${hex(model.flag_id, 2)}` : eventFlagReferenceMarkup(model.flag_id)}` : '';
  const runtime = model.runtime_byte_hex
    ? ` · RAM ${model.runtime_byte_hex} bit ${Number(model.bit_index)}` : '';
  const commit = model.commit === 'deferred-until-battle-victory' ? '；战斗胜利后提交'
    : String(model.commit || '').startsWith('immediate-after-successful') ? '；取得成功后立即提交' : '';
  return `<p class="scene-content-note"><b>交互状态：</b>${esc(model.label || model.class)}${flag}${esc(runtime)}${esc(commit)}。</p>`;
}

/**
 * 场景调查格只说明“会进入调查战斗处理器”；编队正文归 battle-test-point。
 *
 * logic.json 里的 encounter_id / monster_ids / label 是提取期审计快照，不能在用户
 * 修改 working 后继续当当前值显示。这里始终从浏览器 repository 已挂载的有效文档
 * 解析编队，并用当前怪物表补名称。
 */
export function investigationBattleFormation(record) {
  if (record?.kind !== "investigation-battle-trigger") return null;
  const configuration = state.project?.game_data?.battle_test;
  const encounterId = Number(configuration?.encounter_id);
  const formation = Array.isArray(configuration?.formations)
    ? configuration.formations.find(item => Number(item.id) === encounterId)
    : null;
  if (!Number.isInteger(encounterId) || !formation || !Array.isArray(formation.slots)) {
    return {
      available: false,
      message: "battle-test-point 当前编队不可用",
    };
  }
  const monsters = new Map(
    (state.project?.game_data?.monsters?.records || []).map(monster => [
      Number(monster.id),
      monster,
    ]),
  );
  const slots = formation.slots.flatMap((slot, index) => {
    const count = Number(slot.count);
    if (!Number.isInteger(count) || count < 1) return [];
    const monsterId = Number(slot.monster_id);
    const monster = monsters.get(monsterId);
    const monsterIdHex = hex(monsterId, 2);
    return [{
      index,
      count,
      monsterIdHex,
      monsterName: monster?.name || `怪物 ${monsterIdHex}`,
    }];
  });
  return {
    available: true,
    encounterId,
    encounterIdHex: hex(encounterId, 2),
    battleMode: battleModeForPendingEventFlag(configuration.state_flag, battleFirstMonsterId(formation.slots)),
    pendingEventFlag: Number(configuration.state_flag),
    slots,
    totalCount: slots.reduce((total, slot) => total + slot.count, 0),
    summary: slots.length
      ? slots.map(slot => `${slot.monsterName} ×${slot.count}`).join(" / ")
      : "无有效怪物",
  };
}

export function sceneObjectLabel(item) {
  const record = item.record;
  if (item.rewrite) return `${item.rewrite.label} · global-event-flag:${Number(item.rewrite.eventFlag).toString(16).toUpperCase().padStart(2, '0')}`;
  if (item.kind === 'scene-state') return record.label;
  if (item.kind === 'tide') return `潮汐触发 · ${['↑', '↓', '←', '→'][record.direction]}`;
  if (item.kind === "elevator") return `电梯 · ${record.configuration_handle}`;
  if (item.kind === "actor") {
    const interaction = actorInteractionLabel(record);
    const variant = item.variant
      ? `[${globalEventFlagHandle(item.variant.event_flag)} → ${hex(item.variant.replacement_entry_id, 2)}] ` : "";
    const pose = item.pose;
    return `${variant}角色 ${hex(record.id, 2)} · 类型 ${hex(pose?.actor_type ?? record.actor_type, 2)} · ${interaction}${pose ? ` · ${pose.conditions.join('、')} · 初始动作` : ''}`;
  }
  if (item.kind === "vehicle") {
    return `战车初始停放 · 车位 ${Number(record.vehicle_slot) + 1} · 预设 ${hex(item.presetId, 2)}`;
  }
  if (item.kind === "treasure") {
    const contentId = Number(record.content_id);
    const itemRecord = state.project.game_data?.items?.records?.find(entry => Number(entry.id) === contentId);
    const content = record.content_label || (contentId >= 0xF0 && contentId <= 0xFB
      ? `金钱奖励 ${hex(contentId, 2)}`
      : `${itemRecord?.name || "物品"} ${hex(record.content_id, 2)}`);
    const stateLabel = sceneInteractionStateLabel(record);
    return `调查物 ${hex(record.id, 2)} · ${content}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "investigation") {
    return `调查激活点 ${hex(record.id, 2)} · ${record.facility_label} · 实例 ${hex(record.instance_id, 2)}`;
  }
  if (item.kind === "investigation-special") {
    const stateLabel = sceneInteractionStateLabel(record);
    return `专用调查点 ${hex(record.id, 2)} · ${record.label}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "investigation-tile") {
    if (Number(record.behavior_code) === 0x54) return '地图机关 · 离场复原';
    const stateLabel = sceneInteractionStateLabel(record);
    const battle = investigationBattleFormation(record);
    const label = battle?.available
      ? `调查战斗 · ${battle.battleMode?.label || "类型未确认"} · 编队 ${battle.encounterIdHex} · ${battle.summary}`
      : record.kind === "investigation-battle-trigger"
        ? "调查战斗 · 当前编队不可用"
        : record.label;
    return `图块调查 ${record.behavior_code_hex} · ${label} · metatile ${record.metatile_id_hex}${stateLabel ? ` · ${stateLabel}` : ""}`;
  }
  if (item.kind === "transition") {
    const target = (state.project.scenes?.editable_scenes || []).find(
      scene => Number(scene.id) === Number(record.destination_scene_id)
    );
    const targetLabel = target?.name || target?.slug || `场景 ${hex(record.destination_scene_id, 2)}`;
    return record.transition_kind === "world-location-entrance"
      ? `大地图地点入口 ${hex(record.id, 2)} → ${targetLabel}`
      : `门/传送 ${hex(record.id, 2)} → ${targetLabel}`;
  }
  if (item.kind === "boundary-return") {
    return "全部边界 → 返回进入本场景前保存的场景与坐标";
  }
  if (item.kind === "boundary") {
    const direction = sceneBoundaryDirections[Number(record.direction_code)];
    const label = direction ? `${direction.label} ${direction.arrow}` : "全部边界";
    return `${label} → 场景 ${hex(record.destination_scene_id, 2)}`;
  }
  return `坐标事件 ${hex(record.id, 2)} · ${globalEventFlagHandle(record.event_flag)} · 状态 ${hex(record.story_state, 2)}`;
}

export function sceneObjectTreeLabel(item) {
  const record = item.record;
  const sceneName = id => storyComponentLabel((state.project.scenes?.editable_scenes || [])
    .find(scene => Number(scene.id) === Number(id))?.name || '场景');
  if (item.rewrite) return item.rewrite.label;
  if (item.kind === 'scene-state') return `事件后场景 · ${sceneName(record.target_scene_reference?.split(':').at(-1)
    ? parseInt(record.target_scene_reference.split(':').at(-1), 16) : record.target_scene_id)}`;
  if (item.kind === 'tide') return '潮汐触发';
  if (item.kind === 'elevator') return '电梯';
  if (item.kind === 'actor') return `${sceneActorName(record).label}${item.variant ? ' · 事件后角色' : ''}${
    item.pose ? ' · 初始动作' : ''}`;
  if (item.kind === 'vehicle') {
    const preset = state.vehicleDraft?.presets?.[item.presetId];
    return preset ? `${vehicleName(preset)} · 初始停放` : '战车初始停放';
  }
  if (item.kind === 'treasure') {
    const id = Number(record.content_id);
    const content = id >= 0xF0 && id <= 0xFB ? '金钱奖励'
      : state.project.game_data?.items?.records?.find(row => Number(row.id) === id)?.name || '物品';
    return `调查物 · ${content}`;
  }
  if (item.kind === 'investigation') return record.facility_label || '设施调查';
  if (item.kind === 'investigation-special') return record.label || '专用调查';
  if (item.kind === 'investigation-tile') return Number(record.behavior_code) === 0x54 ? '离场复原机关'
    : investigationBattleFormation(record) ? '调查战斗' : record.label || '图块调查';
  if (item.kind === 'transition') return `${record.transition_kind === 'world-location-entrance' ? '地点入口' : '门与传送'} · ${sceneName(record.destination_scene_id)}`;
  if (item.kind === 'boundary-return') return '边界返回';
  if (item.kind === 'boundary') return `${sceneBoundaryDirections[Number(record.direction_code)]?.label || '全部边界'} · ${sceneName(record.destination_scene_id)}`;
  const context = state.project.story?.story_mode_contexts?.entries?.find(row => Number(row.story_state) === Number(record.story_state));
  const sequence = state.project.story?.cutscene_inventory?.entries?.find(row => row.actor_list_ids?.includes(context?.scene_actor_entry));
  return sequence ? `坐标触发 · ${storySequenceComponentLabel(sequence.id, sequence.label)}` : '坐标剧情事件';
}

export function sceneObjectCoordinate(item) {
  if (item.rewrite) {
    const bounds = item.rewrite.bounds;
    return bounds ? [Math.floor(bounds.x + bounds.width / 2), Math.floor(bounds.y + bounds.height / 2)] : null;
  }
  if (item.pose) return [item.pose.x, item.pose.y];
  if (item.kind === 'scene-state') return null;
  if (item.kind === "event") return [item.record.trigger_x, item.record.trigger_y];
  if (item.kind.startsWith("boundary")) return null;
  return [item.record.x, item.record.y];
}

export function sceneObjectCoordinateLabel(item) {
  if (item.rewrite) {
    const bounds = item.rewrite.bounds;
    return bounds ? `${bounds.x}, ${bounds.y}–${bounds.x + bounds.width - 1}, ${bounds.y + bounds.height - 1}` : '';
  }
  if (item.kind === 'scene-state') return '';
  const coordinate = sceneObjectCoordinate(item);
  if (coordinate) return coordinate.join(", ");
  const maxX = Number(state.scene.width) - 1;
  const maxY = Number(state.scene.height) - 1;
  return sceneBoundarySides(item.record).map(side => ({
    up: `0–${maxX}, 0`, down: `0–${maxX}, ${maxY}`,
    left: `0, 0–${maxY}`, right: `${maxX}, 0–${maxY}`,
  })[side]).join(" / ");
}

export const sceneLogicFieldSpecs = {
  actor: [
    ["x", "X", 0, 63], ["y", "Y", 0, 63],
    ["actor_type", "角色类型", 0, 63], ["direction", "方向 0上/1下/2左/3右", 0, 3],
  ],
  treasure: [["x", "X", 0, 255], ["y", "Y", 0, 255]],
  // 只放 X/Y：换场景等于把车挪到另一张图，那不该靠在画布上拖，去载具页选。
  vehicle: [["x", "X", 0, 255], ["y", "Y", 0, 255]],
  investigation: [
    ["x", "激活点 X", 0, 255], ["y", "激活点 Y", 0, 255],
  ],
  transition: [
    ["x", "入口 X", 0, 255], ["y", "入口 Y", 0, 255],
    ["destination_x", "目标 X", 0, 255], ["destination_y", "目标 Y", 0, 255],
  ],
  boundary: [
    ["destination_x", "目标 X", 0, 255], ["destination_y", "目标 Y", 0, 255],
  ],
  event: [
    ["trigger_x", "触发 X", 0, 255], ["trigger_y", "触发 Y", 0, 255],
    ["event_flag", "一次性事件 flag", 0, 255], ["story_state", "剧情状态", 0, 255],
  ],
};


function actorServiceDisplayName(entry) {
  return String(entry?.label || "").trim() || "服务/功能入口";
}

function actorServiceStatusPresentation(entry) {
  const semanticStatus = String(entry?.semantic_status || "").trim();
  if (!entry?.label || !semanticStatus) return null;
  const confirmed = semanticStatus === "confirmed-purpose";
  return {
    id: confirmed ? "confirmed" : "inferred",
    label: confirmed ? "已确认" : "推定",
  };
}

function actorInteractionLabel(record) {
  const selector = Number(record.text_region);
  const argument = Number(record.interaction_or_record_id);
  const mode = actorInteractionMode(record);
  if (mode === "none") return "无主动交互";
  if (mode === "interaction-script") return `交互脚本 ${hex(argument, 2)}`;
  if (mode === "direct-dialogue") return `直接对话 ${hex(selector, 2)}:${hex(argument, 2)}`;
  const service = actorServiceCatalog().find(entry => entry.selector === selector);
  const status = actorServiceStatusPresentation(service);
  return `${actorServiceDisplayName(service)}${status ? `（${status.label}）` : ""} ${
    hex(selector, 2)
  } · 参数 ${hex(argument, 2)}`;
}



export function actorDirectTextRegions() {
  return (state.project.ui?.construction?.script_catalog?.regions || [])
    .filter(region => Number(region.id) > 0 && Number(region.id) < 0x10)
    .sort((left, right) => Number(left.id) - Number(right.id));
}

/**
 * 服务 selector 的已观察参数按当前 actor 超集现算。以前读 npc_catalog 的
 * service 字段：那是提取期快照，场景里改完 actor，这个下拉框的参数还是旧的。
 *
 * parameter_rule 仍来自剧情侧视图——它是 $16/$32 的参数映射规则，属于剧情侧
 * 解出来的语义，不是 actor 字节本身。
 */
export function actorServiceCatalog() {
  const observed = new Map();
  const rulesBySelector = new Map();
  const commandsBySelector = new Map();
  for (const command of state.project?.facilities?.applications?.commands || []) {
    const selector = Number(command.command_id);
    if (!Number.isInteger(selector) || commandsBySelector.has(selector)) continue;
    commandsBySelector.set(selector, command);
  }
  for (const npc of state.project.story?.npc_catalog?.records || []) {
    const service = npc.service;
    if (!service?.parameter_rule) continue;
    const selector = Number(service.selector);
    if (!rulesBySelector.has(selector)) rulesBySelector.set(selector, new Set());
    rulesBySelector.get(selector).add(service.parameter_rule);
  }
  for (const record of sceneActorDocument()?.records || []) {
    const selector = Number(record.text_region);
    if (selector < 0x10) continue;
    if (!observed.has(selector)) observed.set(selector, {arguments: new Set(), rules: new Set()});
    const entry = observed.get(selector);
    entry.arguments.add(Number(record.interaction_or_record_id));
    for (const rule of rulesBySelector.get(selector) || []) entry.rules.add(rule);
  }
  return Array.from({length: 0x30}, (_, index) => {
    const selector = 0x10 + index;
    const usage = observed.get(selector);
    const command = commandsBySelector.get(selector);
    return {
      selector,
      label: String(command?.label || "").trim(),
      kind: String(command?.kind || "").trim(),
      semantic_status: String(command?.semantic_status || "").trim(),
      arguments: [...(usage?.arguments || [])].sort((left, right) => left - right),
      rules: [...(usage?.rules || [])],
    };
  });
}

export function actorServiceRuleLabel(rule) {
  if (rule === 'selector-32-remaps-byte-4-through-$1A:$BD88')
    return '参数先通过 $1A:$BD88 映射表转换';
  if (rule === 'selector-16-splits-$1A:$BD8D-byte-into-record-and-$05B0')
    return '参数通过 $1A:$BD8D 拆分为记录号与 $05B0 状态';
  return '字节 4 直接作为服务参数';
}



const investigationCommandIds = [0x1B, 0x1C, 0x1D, 0x32, 0x33, 0x1A, 0x2D, 0x35, 0x36, 0x37, 0x38];
const knownInvestigationCommands = new Map([
  [0x1A, {facilityId: "jukebox"}],
  [0x1B, {facilityId: "vending-machine", family: "item"}],
  [0x1C, {facilityId: "vending-machine", family: "ammunition"}],
  [0x32, {facilityId: "frog-race"}],
]);

export function investigationCommandCatalog() {
  const extracted = state.project.scenes?.logic?.investigation_handler_commands || [];
  const authority = state.project.facilities?.investigation?.commands || [];
  return investigationCommandIds.map((commandId, selector) => {
    const source = extracted.find(entry => Number(entry.selector) === selector) || {};
    const command = authority.find(entry => Number(entry.command_id) === commandId);
    const extractedLabel = source.facility_label;
    return {
      ...source,
      selector,
      command_id: commandId,
      selector_hex: hex(selector, 2),
      command_id_hex: hex(commandId, 2),
      facility_kind: command?.kind || source.facility_kind || "investigation-command",
      facility_label: command?.label || (
        extractedLabel && extractedLabel !== "调查命令"
          ? extractedLabel
          : `调查命令 ${hex(commandId, 2)}`
      ),
      semantic_status: command?.semantic_status || source.semantic_status,
      investigation_evidence: command?.evidence || source.investigation_evidence,
    };
  });
}

export function investigationCommandEntry(selector) {
  return investigationCommandCatalog().find(entry => Number(entry.selector) === Number(selector)) || null;
}

export function investigationConfigurations(commandId) {
  const id = Number(commandId);
  const command = (state.project.facilities?.investigation?.commands || [])
    .find(entry => Number(entry.command_id) === id);
  const known = {
    0x1a: {facility: "jukebox"},
    0x1b: {facility: "vending-machine", family: "item"},
    0x1c: {facility: "vending-machine", family: "ammunition"},
    0x32: {facility: "frog-race"},
  }[id];
  if (!known) return (command?.configuration_family?.records || []).map(record => ({
    ...record, instance_id: Number(record.id),
  }));
  const facility = (state.project.facilities?.facilities || []).find(item => item.id === known.facility);
  return (facility?.configuration?.variants || [])
    .filter(variant => !known.family || variant.family === known.family)
    .map(variant => ({...variant, instance_id: Number(known.family
      ? variant.family_configuration_id : variant.id)}))
    .sort((left, right) => left.instance_id - right.instance_id);
}

export function investigationConfigurationLabel(commandId, variant) {
  const prefix = `配置 ${hex(variant.instance_id, 2)}`;
  if (Number(commandId) === 0x1a) return `${prefix} · ${(variant.tracks || [])
    .map(track => audioCommandLabel(track.audio_command_id)).join(" / ") || "空曲目表"}`;
  if ([0x1b, 0x1c].includes(Number(commandId))) return `${prefix} · ${(variant.slots || [])
    .slice(0, 3).map(slot => `${investigationProductName(commandId, slot.product_id)}×${slot.amount}`)
    .join(" / ")}`;
  if (Number(commandId) === 0x32) return `${prefix} · 下注 ${variant.price}G`;
  return variant.bytes_hex ? `${prefix} · ${variant.payload_length} B payload` : prefix;
}


function investigationProductName(commandId, productId) {
  const records = Number(commandId) === 0x1B
    ? state.project.game_data?.items?.records || []
    : state.project.game_data?.shells?.records || [];
  return records.find(record => Number(record.id) === Number(productId))?.name
    || `${Number(commandId) === 0x1B ? "道具" : "炮弹"} ${hex(productId, 2)}`;
}


export function refreshInvestigationDerivedFields(record) {
  const command = investigationCommandEntry(record.handler_selector);
  if (!command) return;
  const selector = Number(command.selector);
  const instanceId = Number(record.instance_id);
  record.handler_selector = selector;
  record.handler_selector_hex = hex(selector, 2);
  record.instance_id = instanceId;
  record.instance_id_hex = hex(instanceId, 2);
  record.packed_handler_instance = (instanceId << 4) | selector;
  record.packed_handler_instance_hex = hex(record.packed_handler_instance, 2);
  record.command_id = Number(command.command_id);
  record.command_id_hex = hex(command.command_id, 2);
  record.facility_kind = command.facility_kind;
  record.facility_label = command.facility_label;
  record.semantic_status = command.semantic_status;
  record.investigation_evidence = command.investigation_evidence;
  record.configuration_family_id = Number(command.command_id) >= 0x10 && Number(command.command_id) < 0x20
    ? Number(command.command_id) - 0x10
    : null;
}
