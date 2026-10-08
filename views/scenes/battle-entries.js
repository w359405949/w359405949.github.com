// @editor-module 场景战斗入口只读投影。
import {esc, hex} from "../../core/dom.js";
import {battleFirstMonsterId, battleFlowForStoryState, battleModeForPendingEventFlag} from "../../core/battle-mode.js";
import {state} from "../../core/state.js";
import {db} from "../../core/project-db.js";
import {audioCommandLabel} from "../../core/resource-index.js";
import {encounterCandidate} from "../../core/scene-encounter-probabilities.js";
import {eventFlagReferenceMarkup} from '../../modules/save/event-flags.js';

const hex2 = value => hex(Number(value), 2).slice(2);

export function actorBattleEntries(actor) {
  const sources = [
    ["interaction", actor.interaction_mode === "interaction-script"
      ? Number(actor.interaction_or_record_id) : null, "交互"],
    ["autonomous", Number(actor.autonomous_script_id), "自主"],
  ];
  return sources.flatMap(([kind, id, trigger]) => {
    if (!Number.isInteger(id)) return [];
    const entry = state.project?.story?.[kind]?.entries?.find(row => Number(row.id) === id);
    const script = state.sceneStoryDocuments?.[kind]?.scripts?.find(row => Number(row.id) === id);
    if (!entry || !script) return [];
    return (entry.reachable_cursors || []).flatMap(cursor => {
      const bytes = script.bytecode || [];
      if (bytes[cursor] !== 0x37 || cursor + 3 >= bytes.length) return [];
      const formationId = Number(bytes[cursor + 1]);
      const flag = Number(bytes[cursor + 2]);
      return [{
        kind: "script", trigger: `${trigger}脚本 $37`,
        scriptKind: kind, scriptId: id, cursor,
        source: `story-${kind}-script:script:${hex2(id)}`,
        sourceHref: `?view=actors&actorPart=story&storyKind=${kind}&record=${id}#story-script-field-object`,
        address: Number(entry.pointer_prg) + cursor,
        formationId, flag, storyState: Number(bytes[cursor + 3]),
      }];
    });
  });
}

export function investigationBattleEntry(record, battle) {
  if (!battle) return null;
  const sceneId = Number(state.sceneEntry?.id);
  return {
    kind: "investigation", trigger: "调查图块",
    source: `scene:${hex2(sceneId)}:investigation-tile:${Number(record.id).toString(16).toUpperCase().padStart(4, "0")}`,
    sourceHref: `?view=scenes&scene=${encodeURIComponent(state.sceneEntry.slug)}&sceneMode=logic&sceneObject=investigation-tile:${record.id}`,
    formationId: battle.available ? battle.encounterId : null,
    flag: battle.available ? battle.pendingEventFlag : null,
    summary: battle.available ? battle.summary : null,
  };
}

export function coordinateBattleEntry(record) {
  const current = state.sceneWorldEvents?.records?.find(row => Number(row.id) === Number(record?.id));
  if (!current || Number(current.scene_id) !== Number(state.sceneEntry?.id)) return null;
  return {
    kind: "coordinate", trigger: `坐标 ${Number(current.trigger_x)}, ${Number(current.trigger_y)}`,
    recordId: Number(current.id),
    source: `story.world-event:${hex2(current.id)}`,
    sourceHref: "#scene-battle-source",
    formationId: Number(current.encounter_formation_id),
    flag: Number(current.event_flag),
    storyState: Number(current.story_state),
  };
}

export function sceneBattleZone() {
  const document = state.sceneEncounter;
  const sceneId = Number(state.sceneEntry?.id);
  if (!document || !Number.isInteger(sceneId) || sceneId === 0) return null;
  const first = Number(document.scene_zones?.first_scene_id);
  const last = Number(document.scene_zones?.last_scene_id);
  if (sceneId < first || sceneId > last) return null;
  const assignment = document.scene_zones.assignments.find(row => Number(row.scene_id) === sceneId);
  return document.zones?.find(row => Number(row.zone_id) === Number(assignment?.zone_id)) || null;
}

export function zoneBattleEntry(zone) {
  if (!zone || !Number(zone.zone_id)) return null;
  const entries = (zone.entries || []).filter(row => Number(row.monster_id));
  if (!entries.length) return null;
  const map = state.sceneEncounter?.shared_tables?.entry_event_flag_map || [];
  return {
    kind: "zone", trigger: `遇敌区 ${hex(zone.zone_id, 2)} · 按权重抽取候选槽`,
    source: `scene-encounter-zone:zone:${hex2(zone.zone_id)}`,
    sourceHref: `?view=scenes&scene=${encodeURIComponent(state.sceneEntry.slug)}&sceneMode=encounters&encounterZone=${zone.zone_id}`,
    candidates: entries.map(row => ({
      slot: Number(row.slot), monsterId: Number(row.monster_id),
      ...encounterCandidate(row),
      flag: Number(row.slot) >= 10 && Number(row.monster_id) < 0x10
        ? Number(map[Number(row.monster_id)] || 0) : 0,
    })),
  };
}

function sourceLink(entry) {
  return `<a class="editor-inline-link" href="${esc(entry.sourceHref)}"><code>${esc(entry.source)}</code></a>`;
}

function battleEntryFacts(entry) {
  const slots = state.sceneEncounterFormations?.records?.find(row => Number(row.id) === entry.formationId)?.slots;
  const mode = entry.flag === null || entry.flag === undefined
    ? null : battleModeForPendingEventFlag(entry.flag, battleFirstMonsterId(slots));
  const flow = entry.storyState === null || entry.storyState === undefined
    ? null : battleFlowForStoryState(entry.storyState);
  const storyContext = state.project?.story?.story_mode_contexts?.entries?.find(
    row => Number(row.story_state) === entry.storyState);
  const bounty = mode?.wantedId ? db.peekResourceDocument("wanted-record", null)?.bounty_codes?.find(
    row => Number(row.wanted_id) === mode.wantedId) : null;
  const formation = Number.isInteger(entry.formationId)
    ? `<span>编队 <button type="button" class="resource-inline-link" data-resource-target="encounter-formation:${hex2(entry.formationId)}"><code>encounter-formation:${hex2(entry.formationId)}</code></button>${entry.summary ? ` · ${esc(entry.summary)}` : ""}</span>`
    : "";
  const candidates = entry.candidates?.map(row => {
    if (row.kind === "formation") return `<li>槽 ${row.slot} · 固定编队 <button type="button" class="resource-inline-link" data-resource-target="${esc(row.reference)}">${esc(row.reference)}</button>${row.flag ? ` · ${eventFlagReferenceMarkup(row.flag)} 置位后跳过` : ""}</li>`;
    const monster = state.project?.game_data?.monsters?.records?.find(item => Number(item.id) === row.monsterId);
    const flag = row.flag ? ` · 完成 ${eventFlagReferenceMarkup(row.flag)}` : "";
    const candidateMode = battleModeForPendingEventFlag(row.flag, row.monsterId);
    return `<li>槽 ${row.slot} · ${esc(monster?.name || `怪物 ${hex(row.monsterId, 2)}`)} <code>monster:${hex2(row.monsterId)}</code> · ${esc(candidateMode?.label || "未确认")} / BGM ${esc(audioCommandLabel(candidateMode?.musicCommand ?? 0))}${flag}</li>`;
  }).join("");
  const editor = !["coordinate", "script"].includes(entry.kind)
    ? ""
    : `<div data-scene-battle-formation="${esc(entry.kind)}"
      data-battle-script-kind="${esc(entry.scriptKind || "")}"
      data-battle-script-id="${esc(entry.scriptId ?? "")}"
      data-battle-cursor="${esc(entry.cursor ?? "")}"
      data-battle-record-id="${esc(entry.recordId ?? "")}"><select aria-label="编队" disabled><option>编队</option></select></div>`;
  return `<p class="scene-content-note">${esc(entry.trigger)} · ${sourceLink(entry)} · ${formation}
    ${mode ? ` · ${esc(mode.label)} / ${esc(audioCommandLabel(mode.musicCommand))} · ${eventFlagReferenceMarkup(entry.flag)}` : ''}</p>
    ${mode ? `<p class="scene-content-note">逃跑 ${mode.escapeEligible ? '概率判定' : '禁止'} · 常规击破效果 ${mode.deathEffect === 2 ? 'BOSS' : '普通'} · ${entry.kind === 'coordinate' ? '改事件号同时改变触发检查与胜利提交' : entry.kind === 'script' ? '胜利提交对应事件位，脚本触发检查须同步审查' : '胜利提交对应事件位'}</p>` : ''}
    ${mode ? `<p class="scene-content-note">有经验时胜利音效 ${esc(audioCommandLabel(mode.victorySoundCommand))} · 随机「间不容发」${mode.randomMissEligible ? '参与检查' : '跳过'}</p>` : ''}
    ${mode?.wantedId ? `<p class="scene-content-note">通缉目标 <a class="editor-inline-link" href="?view=wanted#wanted-target-${mode.wantedId}">${mode.wantedId}</a> · 赏金代码 ${bounty ? hex(bounty.raw_code, 2) : '未加载'} · 胜利且取得经验后记录猎人等级，事务所按击破等级与领赏位发放赏金。</p>` : ''}
    ${mode?.wantedDefeatLevel && !mode.wantedId ? '<p class="scene-content-note">胜利且取得经验后向相邻分类计数写入猎人等级，无对应通缉目标。</p>' : ''}
    ${flow ? `<p class="scene-content-note">操作 ${flow.automatic ? '自动战斗' : '指令选择'} · 剧情状态 ${hex(entry.storyState, 2)} · 战后 ${flow.exitMode === 3 ? '继续剧情' : '返回场景'}${flow.clearStoryStateOnExit ? ' · 战后清空剧情状态' : ''}</p>` : ''}
    ${storyContext ? `<p class="scene-content-note">战后剧情场景 ${hex(storyContext.scene_id, 2)} · 角色表 ${hex(storyContext.scene_actor_entry, 2)} · 镜头 ${storyContext.camera_tile_origin_x}, ${storyContext.camera_tile_origin_y}</p>` : ''}
    ${flow?.companionRecovery || flow?.restorePartyOnWipe ? `<p class="scene-content-note">${flow.companionRecovery ? '第 2 回合执行队友剧情动作，第二队员受伤时跳过常规受伤消息与 HP 显示刷新，战后恢复队友 HP 与姓名' : `全灭时恢复剧情战前队伍与猎人 HP，并提交 ${eventFlagReferenceMarkup(0x82)}`}</p>` : ''}
    ${editor}
    ${candidates ? `<ul class="scene-battle-candidates">${candidates}</ul>` : ""}`;
}

export function renderSceneBattleEntry(entry) {
  if (!entry) return "";
  return `<section class="scene-battle-entry" data-scene-battle-entry="${esc(entry.source)}">
    <h3>战斗入口 · ${esc(entry.trigger)}</h3>
    ${battleEntryFacts(entry)}
  </section>`;
}

export function renderSceneActorBattleEntries(entries) {
  const formations = new Map();
  for (const entry of entries) {
    if (!formations.has(entry.formationId)) formations.set(entry.formationId, []);
    formations.get(entry.formationId).push(entry);
  }
  return [...formations].map(([formationId, triggers]) => `<section class="scene-battle-entry"
      data-scene-battle-group="${Number(formationId)}">
    <h3>战斗入口 · 编队</h3>
    ${triggers.map(entry => `<div data-scene-battle-entry="${esc(entry.source)}">
      ${battleEntryFacts(entry)}
    </div>`).join("")}
  </section>`).join("");
}
