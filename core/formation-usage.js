// @editor-module 固定编队的当前引用与场景位置投影。
import {projectStoryScriptPrograms} from './story-script-layout.js';
import {encounterCandidate} from './scene-encounter-probabilities.js';
import {projectFieldDraftRevision} from './project-field-draft.js';

const hex2 = value => Number(value).toString(16).toUpperCase().padStart(2, '0');

export async function formationUsage(database) {
  const [story, autonomous, interaction, events, zones, battle, wanted, actors] = await Promise.all([
    database.getDocument('project.story'),
    database.getResourceDocument('story-autonomous-script'),
    database.getResourceDocument('story-interaction-script'),
    database.getResourceDocument('world-event'),
    database.getDocument('scene-encounter-zone'),
    database.getDocument('battle-test-point'),
    database.getDocument('wanted-record'),
    database.getDocument('scene-actor'),
  ]);
  return database.reusePreviewProjection('formation-usage', [story, autonomous, interaction,
    events, zones, battle, wanted, actors,
    ...[story, autonomous, interaction, events, zones, battle, wanted, actors].map(projectFieldDraftRevision)],
  () => prepareFormationUsage(database, {story, autonomous, interaction, events, zones, battle, wanted, actors}));
}

async function prepareFormationUsage(database, {story, autonomous, interaction, events, zones, battle, wanted, actors}) {
  const uses = new Map();
  const append = (id, row) => {
    if (!Number.isInteger(id)) return;
    if (!uses.has(id)) uses.set(id, []);
    uses.get(id).push(row);
  };
  for (const row of events.records) append(Number(row.encounter_formation_id), {
    kind: 'coordinate', label: `固定坐标战斗 ${hex2(row.id)}`,
    sceneId: Number(row.scene_id), x: Number(row.trigger_x), y: Number(row.trigger_y),
    sceneObject: `event:${row.id}`,
  });
  const vm = story.browser_vm;
  const encounterOpcodes = new Set(vm.opcode_semantics.filter(row =>
    row.operation === 'start-scripted-encounter').map(row => row.opcode));
  const lists = [...vm.variants, ...vm.continuation_actor_lists, ...vm.extended_actor_lists,
    ...vm.interaction_actor_lists];
  for (const [kind, asset] of [['autonomous', autonomous], ['interaction', interaction]]) {
    const published = vm.programs.filter(row => (row.kind || 'autonomous') === kind);
    const known = new Set(published.map(row => row.id));
    const remaining = await Promise.all(story[kind].entries.filter(row => !known.has(row.id))
      .map(row => database.getPackageDocument(`game/story/${row.path}`)));
    const programs = projectStoryScriptPrograms(asset, [...published, ...remaining]);
    for (const program of programs) for (const command of program.commands) {
      if (!encounterOpcodes.has(command.opcode)) continue;
      const positions = (actors.records || []).filter(actor => kind === 'autonomous'
        ? Number(actor.autonomous_script_id) === program.id
        : actor.interaction_mode === 'interaction-script' && Number(actor.interaction_or_record_id) === program.id)
        .flatMap(actor => (actors.tables || []).filter(table => table.entry_id === actor.entry_id
          && Number.isInteger(table.owner?.scene_id)).map(table => ({sceneId: table.owner.scene_id,
            x: Number(actor.x), y: Number(actor.y), sceneObject: `actor:${actor.id}`})));
      for (const list of lists) for (const actor of list.actors || []) {
        if (kind !== 'autonomous' || Number(actor.autonomous_script_id) !== program.id) continue;
        const sceneId = list.story_mode_context?.scene_id ?? list.entry_context?.scene_id ?? list.selection?.scene_id ?? list.scene_id;
        if (Number.isInteger(sceneId)) positions.push({sceneId, x: Number(actor.x), y: Number(actor.y)});
      }
      append(Number(command.operands[0]), {
        kind: 'script', label: `${kind === 'autonomous' ? '自主' : '交互'}剧情 ${hex2(program.id)} · ${hex2(command.cursor)}`,
        href: `?view=actors&actorPart=story&storyKind=${kind}&record=${program.id}#story-script-field-object`,
        positions: positions.filter((row, index) => positions.findIndex(other =>
          other.sceneId === row.sceneId && other.x === row.x && other.y === row.y) === index),
      });
    }
  }
  for (const zone of zones.zones) {
    if (!Number(zone.zone_id)) continue;
    for (const entry of zone.entries) {
      const candidate = encounterCandidate(entry);
      if (candidate.empty || candidate.kind !== 'formation') continue;
      const positions = zones.scene_zones.assignments.filter(row => Number(row.zone_id) === Number(zone.zone_id))
        .map(row => ({sceneId: Number(row.scene_id), x: null, y: null, encounterZone: zone.zone_id}));
      for (const block of zones.world_grid.blocks.filter(row => Number(row.zone_id) === Number(zone.zone_id)))
        positions.push({sceneId: 0, x: Number(block.cell_x), y: Number(block.cell_y), encounterZone: zone.zone_id});
      append(candidate.value, {kind: 'random', label: `随机遇敌区 ${hex2(zone.zone_id)} · 槽 ${candidate.slot + 1}`,
        resource: `scene-encounter-zone:zone:${hex2(zone.zone_id)}`, positions});
    }
  }
  for (let id = 1; id <= 11; id++) append(id, {
    kind: 'wanted', label: '通缉目标与结局回顾', href: `?view=wanted#wanted-target-${id}`,
  });
  for (const row of [{...wanted.default_pair, index: 0}, ...wanted.targets]) {
    for (const id of new Set([Number(row.high_target_id), Number(row.low_target_id)]))
      append(id, {kind: 'poster', label: `通缉海报目标对 ${hex2(row.index)}`,
        href: `?view=wanted&wantedTarget=${row.index === 0 ? 'default' : row.index}&wantedSide=${Number(row.high_target_id) === id ? 'high' : 'low'}`,
        ...(row.scene_id == null ? {} : {sceneId: Number(row.scene_id), x: null, y: null})});
  }
  append(Number(battle.encounter_id), {
    kind: 'test', label: '调查战斗测试', href: '?view=battle-test',
    sceneId: Number(battle.scene_id), x: Number(battle.x), y: Number(battle.y),
  });
  append(0, {kind: 'shared', label: '随机遇敌后续候选重映射', resource: 'code-module:random-encounter-service'});
  return uses;
}

export const FORMATION_GROUPS = Object.freeze([
  ['wanted', '赏金首'], ['script', '剧情战斗'], ['coordinate', '固定坐标战斗'],
  ['random', '随机遇敌'], ['test', '战斗测试'], ['shared', '共用字节'], ['unused', '其他编队'],
]);

export function formationGroup(uses) {
  return FORMATION_GROUPS.find(([kind]) => uses.some(row => row.kind === kind))?.[0] || 'unused';
}
