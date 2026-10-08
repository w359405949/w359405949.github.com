// @editor-module 场景音乐与进场剧情入口的纯数据投影。
import {storyViewForSequenceId} from "./story-view-config.js";
import {sceneDefaultMusicCommand} from "./scene-config-owner.js";
import {globalEventFlagHandle} from './global-event-flags.js';
const hex = (value, width = 2) => `0x${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

const ENTRY_KINDS = Object.freeze({
  "scene-loaded-autonomous-script": "场景加载后执行自动脚本",
  "coordinate-gated-autonomous-script": "场景加载后由坐标门触发自动脚本",
  "referenced-interaction-bootstrap+coordinate-gated-autonomous-script": "坐标门自动脚本；另有交互入口",
});

function uniqueEntryPath(program, targetCursor) {
  const commands = new Map((program?.commands || []).map(command => [command.cursor, command]));
  const paths = [];
  function walk(cursor, path, visited) {
    if (paths.length > 1 || visited.has(cursor)) return;
    if (cursor === targetCursor) { paths.push(path); return; }
    const command = commands.get(cursor);
    if (!command) return;
    const nextVisited = new Set(visited);
    nextVisited.add(cursor);
    for (const edge of command.edges || []) {
      walk(edge.target_cursor, [...path, {command, edge}], nextVisited);
    }
  }
  walk(0, [], new Set());
  return paths.length === 1 ? paths[0] : null;
}

function entryCondition(story, item) {
  const list = story.browser_vm?.extended_actor_lists?.find(entry =>
    Number(entry.id) === Number(item.actor_list_ids?.[0])
  );
  const constraints = list?.entry_flag_constraints;
  if (!Number.isInteger(constraints?.source_script_id)
    || !Number.isInteger(constraints?.target_control_lock_cursor)) return null;
  const program = story.browser_vm?.programs?.find(entry =>
    entry.kind === "autonomous" && Number(entry.id) === constraints.source_script_id
  );
  const path = uniqueEntryPath(program, constraints.target_control_lock_cursor);
  if (!path) return null;
  const flags = [
    ...(constraints.required_set_flags || []).map(id => `${globalEventFlagHandle(id)} 已置位`),
    ...(constraints.required_clear_flags || []).map(id => `${globalEventFlagHandle(id)} 未置位`),
  ];
  const positions = path.flatMap(({command, edge}) => {
    if (command.opcode === 0x35) return [
      `${hex(command.operands[0], 2)}≤X<${hex(command.operands[1], 2)}、${
        hex(command.operands[2], 2)}≤Y<${hex(command.operands[3], 2)}${edge.kind === "normal" ? "" : " 的范围外"}`,
    ];
    if (command.opcode === 0x08) return [
      `X=${hex(command.operands[0], 2)}、Y=${hex(command.operands[1], 2)}${
        edge.kind === "normal" ? "" : " 以外"}`,
    ];
    return [];
  });
  return {
    trigger: [ENTRY_KINDS[item.entry_evidence], ...flags, ...positions].join("；"),
    evidence: `自动脚本 ${hex(constraints.source_script_id, 2)} · 控制锁`,
  };
}

export function sceneEntryStoryItemsForProject(sceneId, story) {
  const inventory = story.cutscene_inventory?.entries || [];
  const entries = inventory.filter(item =>
    ENTRY_KINDS[item.entry_evidence]
    && item.scene_ids?.includes(Number(sceneId))
    && storyViewForSequenceId(item.id)
  ).map(item => {
    const condition = entryCondition(story, item);
    return condition ? {id: item.id, label: item.label, ...condition,
      classification: item.classification} : null;
  }).filter(Boolean);
  for (const variant of story.special_actor_lists || []) {
    if (!Number.isInteger(variant.selection?.story_state)) continue;
    const context = story.story_mode_contexts?.entries?.find(item =>
      Number(item.story_state) === Number(variant.selection.story_state)
      && Number(item.scene_actor_entry) === Number(variant.id)
    );
    if (Number(context?.scene_id) !== Number(sceneId)
      || !variant.entry_sources?.sources?.length) continue;
    const sequence = inventory.find(item => item.actor_list_ids?.includes(Number(variant.id))
      && storyViewForSequenceId(item.id));
    if (!sequence) continue;
    entries.unshift({
      id: sequence.id,
      label: sequence.label,
      trigger: `剧情状态 $0481=${hex(variant.selection.story_state, 2)} 时选择特殊角色表 ${String(variant.id_hex)}`,
      evidence: `写入来源 ${variant.entry_sources?.sources?.map(source => source.kind === "machine-code-constant-writer"
        ? "常量写入"
        : `自动脚本 ${hex(source.script_id, 2)} 执行 ${String(source.opcode_hex)}`
      ).join("、")}`,
      classification: sequence.classification,
    });
  }
  for (const event of story.browser_vm?.entry_events || []) {
    if (event.scene_id !== Number(sceneId) || !storyViewForSequenceId(event.sequence_id)) continue;
    const item = entries.find(row => row.id === event.sequence_id);
    const sequence = story.browser_vm.sequences?.find(row => row.id === event.sequence_id);
    const values = {id: event.sequence_id, label: sequence?.label || event.sequence_id,
      trigger: event.trigger,
      evidence: `ROM ${event.evidence_prg_offsets.map(offset => hex(offset, 6)).join(" · ")}`,
      classification: inventory.find(row => row.id === event.sequence_id)?.classification};
    if (item) Object.assign(item, values);
    else entries.push(values);
  }
  return entries.map(item => ({...item, key: `entry-story:${item.id}`}));
}


export function sceneBgmItemsForProject(sceneId, document, scenes, commandLabel = id => `曲目 ${hex(id, 2)}`, sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const defaultId = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  const defaultAddress = Number(catalog?.header_record_address?.offset) + 0x17;
  const items = Number(sceneId) === 0 ? [5, 24].map(id => ({key: `bgm:world:${id}`,
      label: `世界地图 · ${commandLabel(id)}`, id,
      condition: id === 24 ? "活动存档“是否在队”字节 $6478–$647A 任一字节的 $80 位为 1。"
        : "活动存档“是否在队”字节 $6478–$647A 的 $80 位均为 0。",
      evidence: "加载例程与选曲例程"}))
    : Number.isInteger(defaultId) && defaultId >= 0 && defaultId <= 0xFF
      && Number.isInteger(defaultAddress)
    ? [{key: "bgm:default", label: `默认 · ${commandLabel(defaultId)}`, id: defaultId,
      condition: "场景头默认曲目；条件音乐和运行时覆盖可能改变实际播放。",
      evidence: "场景头"}]
    : [];
  for (const row of document?.records || []) {
    if (row.kind !== "conditional-audio" || row.scene_reference !== `scene:${hex(Number(sceneId), 2).slice(2)}`) continue;
    const id = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
    const flag = row.global_event_flag_reference.split(":").at(-1);
    items.push({key: `bgm:${row.handle}`, label: `条件 · ${commandLabel(id)}`, id,
      condition: `global-event-flag:${flag} 已置位；后匹配的条件行优先。`,
      evidence: row.handle});
  }
  return items;
}

export function sceneEntryMusicCommand(sceneId, lifecycle, scenes, eventFlags = [], sceneDocument = null) {
  const catalog = (scenes?.catalog || []).find(item => Number(item.id) === Number(sceneId));
  const flags = new Set(eventFlags);
  let command = sceneDefaultMusicCommand(sceneDocument) ?? Number(catalog?.header_extension?.[7]);
  if (Number(sceneId) === 0) command = 5;
  for (const row of lifecycle?.records || []) {
    if (row.kind !== "conditional-audio"
        || row.scene_reference !== `scene:${hex(sceneId, 2).slice(2)}`) continue;
    const flag = Number.parseInt(row.global_event_flag_reference.split(":").at(-1), 16);
    if (flags.has(flag)) command = Number.parseInt(row.audio_command_reference.split(":").at(-1), 16);
  }
  return Number.isInteger(command) && command >= 0 && command < 0xF0 ? command : null;
}
