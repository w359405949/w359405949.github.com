// @editor-module 存档事件位的已发布读写引用投影。
import {db} from './project-db.js';
import {globalEventFlagEntries, globalEventFlagEntry, prepareGlobalEventFlags} from './global-event-flags.js';
import {loadByteMapIndex, loadByteMapBank} from './physical-field-object-document.js';
import {storyViewForSequenceId} from './story-view-config.js';
import {HIDDEN_TELEPORT_RESOURCE_ID} from './ui-facility-record-owner.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
let catalog = [];
let unresolvedRomCalls = [];

export function eventFlagReferenceCatalog() { return {rows: catalog, unresolvedRomCalls}; }

function collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps}) {
  const rows = globalEventFlagEntries().map(row => ({...row, writes: [], reads: []}));
  const seen = new Set();
  const add = (flag, access, source, href, operation, evidence = null) => {
    const row = globalEventFlagEntry(flag);
    if (!row || !href) return;
    const key = JSON.stringify([row.id, access, source, operation, evidence]);
    if (seen.has(key)) return;
    seen.add(key);
    const location = typeof href === 'string' ? {href} : href;
    rows[row.id][access === 'write' ? 'writes' : 'reads'].push({source, ...location, operation, evidence});
  };
  const sceneHref = (id, object = '', point = {}) => {
    const scene = (scenes?.editable_scenes || []).find(row => Number(row.id) === Number(id));
    return scene ? {href: `?view=scenes&scene=${scene.slug}&sceneMode=logic${object ? `&sceneObject=${object}` : ''}`,
      scenePosition: {sceneId: Number(scene.id), sceneObject: object,
        x: point.x ?? point.trigger_x ?? null, y: point.y ?? point.trigger_y ?? null}} : null;
  };
  for (const kind of ['autonomous', 'interaction']) for (const script of story?.[kind]?.entries || []) {
    for (const ref of script.state_references || []) add(ref.flag_id,
      ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      `story-${kind}-script:script:${hex(script.id)}`,
      `?view=actors&actorPart=story&storyKind=${kind}&record=${script.id}`,
      ref.operation, ref.source_prg_offset);
  }
  for (const actor of story?.npc_catalog?.records || []) for (const ref of actor.state_references || []) {
    add(ref.flag_id, ref.access === 'write' || ref.operation === 'set-after-victory' ? 'write' : 'read',
      actor.uid || `scene-actor:${hex(actor.entry_id)}:${hex(actor.record_id)}`,
      sceneHref(actor.entry_id, `actor:${actor.record_id}`,
        actors.records.find(row => row.uid === actor.uid)), ref.operation, ref.source_prg_offset);
  }
  for (const row of story?.world_event_triggers?.entries || []) {
    const href = sceneHref(row.scene_id, `event:${row.id}`, row);
    add(row.event_flag, 'read', `world-event:${hex(row.id)}`, href, '触发检查');
    if (Number(row.event_flag) !== 0 && row.classification === 'coordinate-triggered-encounter')
      add(row.event_flag, 'write', `world-event:${hex(row.id)}`, href, '胜利置位');
  }
  for (const writer of story?.browser_vm?.wait_state_model?.external_writers || []) {
    if (writer.confirmation === 'confirmed') add(writer.flag_id, 'write', writer.label, writer.href, '置位', writer.evidence);
  }
  const control = story?.browser_vm?.control_state_model;
  for (const flag of control?.scene_reload_cleared_event_flags || []) add(flag, 'write', '场景初始化',
    `?view=bytemap-prg&romOffset=${control.scene_initializer_prg}`, '清零', control.scene_initializer_prg);
  for (const variant of story?.browser_vm?.variants || []) {
    if (variant.selection?.event_flag === undefined) continue;
    add(variant.selection.event_flag, 'read', `scene-actor-list:${hex(variant.id)}`,
      sceneHref(variant.selection.scene_id ?? variant.scene_id, `variant-${variant.id}-actor:0`,
        actors.records.find(row => Number(row.entry_id) === Number(variant.id) && Number(row.id) === 0)), '角色表选择');
  }
  for (const event of story?.browser_vm?.entry_events || []) {
    const view = storyViewForSequenceId(event.sequence_id);
    if (!view) continue;
    const href = `?view=${view}`;
    for (const flag of event.completion_flags || []) add(flag, 'read', event.sequence_id, href, '完成状态');
    if (event.entry_music) add(event.entry_music.flag_id, 'read', event.sequence_id, href, '入口音乐');
  }
  for (const sequence of story?.browser_vm?.sequences || []) {
    const view = storyViewForSequenceId(sequence.id);
    if (!view || !sequence.ending_animation) continue;
    for (const stage of sequence.ending_animation.timeline || []) if (stage.conditional)
      add(stage.event_flag, 'read', sequence.id, `?view=${view}`, '结局分支');
    const flag = sequence.ending_animation.audio?.event_flag;
    if (Number.isInteger(flag)) add(flag, 'read', sequence.id, `?view=${view}`, '结局音乐');
  }
  for (const row of lifecycle?.records || []) add(row.global_event_flag_reference, 'read', row.handle,
    sceneHref(Number.parseInt((row.scene_reference || row.source_scene_reference).split(':')[1], 16),
      `scene-state:${row.handle}`),
    row.kind === 'conditional-audio' ? '入口音乐' : '场景重映射');
  for (const scene of maps) for (const [index, group] of (scene.event_metatile_replacements || []).entries()) {
    add(group.event_flag, 'read', `scene:${hex(scene.id)}:event-map:${hex(index)}`,
      sceneHref(scene.id, `map-rewrite:scene:${hex(scene.id)}:event-map:${hex(index)}`), '地图改写');
  }
  for (const family of facilities?.configuration_loader?.pointer_entries || []) {
    for (const good of family.value_namespace?.goods || []) {
      if (!good.event_flag_reference) continue;
      for (const ref of family.value_namespace.event_flag_accesses || []) add(good.event_flag_reference,
        ref.access, good.resource_uid,
        `?view=shops&shopFamily=${family.family_id}&shopTab=catalog&record=${good.resource_uid}`,
        ref.operation, ref.script_prg);
    }
  }
  for (const transition of logic?.point_transitions || []) for (const flag of transition.appearance_condition?.flags || [])
    add(flag, 'read', `transition:${hex(transition.scene_id)}:${hex(transition.id)}`,
      sceneHref(transition.scene_id, `transition:${transition.id}`, transition), '入口条件');
  for (const facility of facilities?.facilities || []) {
    for (const instance of facility.instances || []) {
      const control = instance.switch;
      if (!control) continue;
      const href = sceneHref(instance.scene_id, `investigation:${instance.point_id}`, instance);
      add(control.event_flag_reference, 'read', instance.scene_object_uid, href, '开关状态');
      add(control.event_flag_reference, 'write', instance.scene_object_uid, href, control.password_required ? '密码正确置位' : '置位／清零');
      if (control.failure_flag_reference) add(control.failure_flag_reference, 'write', instance.scene_object_uid,
        href, '密码错误置位');
    }
    if (facility.id === 'teleport-terminal') for (const destination of facility.configuration?.destinations || []) {
      add(destination.availability_flag, 'read', `传送地点 ${destination.id}`, '?view=teleport&facilityTab=config', '可用状态');
    }
  }
  if (hidden) {
    const href = '?view=teleport&facilityTab=config#hidden-teleport';
    for (const flag of hidden.trigger_flags || []) add(flag.id, 'read', 'ui-facility:hidden-teleport', href, `条件 ${flag.value}`);
    add(hidden.set_flag, 'write', 'ui-facility:hidden-teleport', href, '错误传送置位');
    add(hidden.gate.event_flag, 'read', 'ui-facility:hidden-teleport', sceneHref(hidden.gate.scene_id, '', hidden.gate), '大门条件');
  }
  for (const call of investigation?.reward_calls || []) {
    if (!call.acquisition_condition) continue;
    const flag = call.acquisition_condition.flag_reference;
    const href = '?view=scenes&sceneTab=investigation';
    add(flag, 'read', `调查 · ${call.kind}`, href, '取得条件', call.handler_prg);
    add(flag, 'write', `调查 · ${call.kind}`, href, '取得置位', call.handler_prg);
    if (call.acquisition_condition.clear_on_successful_use) add(flag, 'write',
      call.acquisition_condition.clear_on_successful_use, '?view=items&resource=' + call.acquisition_condition.clear_on_successful_use,
      '使用后清零');
  }
  for (const row of encounters?.encounter_selector_to_global_event_flag || []) if (row.selector !== 0)
    add(row.global_event_flag_id, 'read', `encounter-event-flag-map:${hex(row.selector)}`,
      '?view=scenes&sceneTab=encounters', '遭遇禁用检查');
  for (const row of encounters?.battle_state_review?.wanted_targets || []) {
    const href = '?view=wanted';
    add(row.claim_flag, 'read', `通缉目标 ${row.target_id}`, href, '领赏检查');
    add(row.claim_flag, 'write', `通缉目标 ${row.target_id}`, href, '领取置位');
  }
  if (tide) {
    const href = sceneHref(tide.trigger?.scene_id, 'tide:0', tide.trigger);
    add(tide.event_flag, 'read', 'field-exploration-runtime:00', href, '潮汐地形');
    add(tide.event_flag, 'write', 'field-exploration-runtime:00', href, '潮汐切换');
  }
  for (const ref of rom) add(ref.flag, ref.access, ref.source, ref.href, ref.operation, ref.evidence);
  return rows;
}

async function romReferences() {
  const [symbols, xrefs, index] = await Promise.all([
    db.getPackageDocument('analysis/disassembly/symbols.json'),
    db.getPackageDocument('analysis/disassembly/xrefs.json'), loadByteMapIndex(),
  ]);
  const helpers = new Map(['SetGlobalEventFlag', 'ClearGlobalEventFlag', 'TestGlobalEventFlag'].map(name => {
    const symbol = symbols.symbols.find(row => row.name === name);
    return [symbol?.prg_offset, {name, access: name === 'TestGlobalEventFlag' ? 'read' : 'write'}];
  }));
  const calls = [...new Map(xrefs.xrefs.filter(row => ['call', 'jump'].includes(row.kind) && helpers.has(row.to_prg))
    .map(row => [`${row.from_prg}:${row.to_prg}`, row])).values()];
  const banks = [...new Set(calls.map(row => Math.floor(row.from_prg / 0x2000)))];
  const shards = await Promise.all(banks.map(bank => loadByteMapBank(index, index.bank_shards.prg[bank])));
  const instructions = new Map(shards.flatMap(shard => shard.disassembly.instructions).map(row => [row.prg_offset, row]));
  const results = [], unresolved = [];
  for (const call of calls) {
    const helper = helpers.get(call.to_prg);
    const previous = instructions.get(call.from_prg - 2);
    const incoming = xrefs.xrefs.some(row => row.to_prg === call.from_prg && ['call', 'jump', 'branch'].includes(row.kind));
    const match = !incoming && previous?.mnemonic === 'LDA' && previous.addressing_mode === 'Imm'
      ? /^#\$([0-9A-F]{2})$/u.exec(previous.operand) : null;
    const instruction = instructions.get(call.from_prg);
    const record = {access: helper.access, source: instruction?.function || helper.name,
      href: `?view=bytemap-prg&romOffset=${call.from_prg}`, operation: helper.name,
      evidence: call.from_prg};
    if (match) results.push({...record, flag: Number.parseInt(match[1], 16)});
    else unresolved.push(record);
  }
  unresolvedRomCalls = unresolved;
  return results;
}

export async function prepareEventFlagReferences() {
  const [story, facilities, logic, scenes, lifecycle, encounters, investigation, tide, hidden, rom, actors] = await Promise.all([
    db.getDocument('project.story'), db.getDocument('project.facilities'),
    db.getDocument('project.scenes.logic'), db.getDocument('project.scenes'),
    db.getResourceDocument('field-scene-lifecycle-service'), db.getResourceDocument('encounter-event-flag-map'),
    db.getResourceDocument('nearby-object-investigation-service'), db.getResourceDocument('field-exploration-runtime'),
    db.getResourceDocument(HIDDEN_TELEPORT_RESOURCE_ID), romReferences(), db.getDocument('scene-actor'), prepareGlobalEventFlags(),
  ]);
  const maps = [];
  const sceneEntries = scenes.editable_scenes;
  for (let start = 0; start < sceneEntries.length; start += 12) {
    maps.push(...await Promise.all(sceneEntries.slice(start, start + 12).map(async row =>
      (await db.getResourceDocument(`scene:${hex(row.id)}`)).scene)));
  }
  catalog = collectReferences({story, facilities, logic, scenes, actors, lifecycle, encounters, investigation, tide, hidden, rom, maps});
}
