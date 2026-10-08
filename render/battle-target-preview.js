// @editor-module 战斗命令与道具共用 ROM 目标窗口，现场来自预览存档与战斗测试编队。
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {createBattleContextValues} from '../core/battle-context-values.js';
import {fixedRuntimeTextScriptHex, textRecordNodeId} from '../core/text-record-project.js';
import {effectPaletteValues} from '../core/attack-chr-owner.js';
import {battleMenuCalls} from '../core/battle-menu-calls.js';
import {interfaceRecordProviders} from './interface-slots.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];

function currentFormation(test) {
  const id = test?.encounter_id;
  const slots = test?.formations?.find(row => Number(row.id) === Number(id))?.slots;
  if (!Array.isArray(slots) || slots.length !== 4
      || slots.some(row => !Number.isInteger(row.count) || row.count < 0
        || row.count > 9 || row.count && !Number.isInteger(row.monster_id))
      || slots.reduce((sum, row) => sum + row.count, 0) > 9)
    throw new TypeError('战斗目标缺少有效的当前四敌群编队');
  const configured = slots.map(row => ({monster_id: row.monster_id, population: row.count}));
  const preview = state.battleScenePreview;
  const matching = state.battleTestView?.encounter_id === id && preview?.enemyGroups?.length === 4
    && preview.enemyGroups.every((row, index) =>
    row.count === configured[index].population
      && (!row.count || row.monsterId === configured[index].monster_id));
  if (matching && preview.formation) return {id,
    groups: preview.formation.groups.map(row => ({monster_id: row.monsterId, population: row.count})),
    instances: preview.formation.slots.map(row => row ? {group: row.groupIndex,
      monster_id: row.monsterId, present: true, targetable: true} : null)};
  return {id, groups: configured, instances: configured.flatMap((row, group) =>
    Array.from({length: row.population}, () => ({group, monster_id: row.monster_id,
      present: true, targetable: true})))};
}

function partyInvocation(fields, slot, context) {
  if (!fields.slotStatus(slot).valid) return null;
  const party = ROLES.flatMap((role, id) => {
    const prefix = `save.slot.${slot}.role.${role}`;
    if (!fields.object(`${prefix}.present`).value) return [];
    const vehicle = fields.object(`${prefix}.current_vehicle`).value;
    return [{id, prefix, vehicle: vehicle < 11 && fields.vehicleAcquired(slot, vehicle) ? vehicle : null}];
  });
  const roleId = Number(context.actor.split(':')[1]);
  const actor = party.find(row => context.actor.includes('role:') && row.id === roleId) || party[0];
  if (!actor) return null;
  const riding = fields.object(`${actor.prefix}.present`).value & 128;
  const vehicle = riding ? actor.vehicle : null;
  const prefix = vehicle == null ? actor.prefix : `save.slot.${slot}.vehicle.${vehicle}`;
  const itemMode = context.pageId === 'battle-items-equipment';
  const field = itemMode ? vehicle == null ? `${prefix}.inventory` : `${prefix}.item.${context.inventory_index ?? 0}`
    : vehicle == null ? `${prefix}.equipment` : `${prefix}.equipment.main_gun`;
  const value = fields.object(field).value;
  const item = Array.isArray(value) || ArrayBuffer.isView(value)
    ? value[itemMode ? context.inventory_index ?? 0 : 0] : value;
  return {party: party.map(row => row.prefix), vehicle, item, itemMode, field};
}

export async function resolveBattleTargetPreview(preview, fields, {readCodeField} = {}) {
  const repository = state.projectRepository;
  const context = preview.interface_value_context;
  const calls = await battleMenuCalls(readCodeField || (source => db.getField(source.resource_id, source.entity_handle, source.field)));
  const names = interfaceRecordProviders({record: calls.target_record}, [0xFA, 0xFB, 0xFC, 0xFD]);
  const numbers = interfaceRecordProviders({record: calls.target_record}, [0xF8, 0xF9]);
  if (names.length !== 1 || numbers.length !== 1) throw new TypeError('战斗目标缺少敌群提供器构造');
  const [test, monsters, templates, metasprites] = await Promise.all([
    db.getResourceDocument('battle-test-point', null), db.getAll('monster', []),
    db.getDocument('project.ui.templates', null), db.getResourceDocument('metasprite-record', null),
  ]);
  const formation = currentFormation(test);
  const actor = partyInvocation(fields, context.slot, context);
  const identity = {battle_id: `interface-preview:${formation.id}`, action_id: 'target-selection',
    target_iteration: -1, target_slot: -1, result_execution: -1};
  const battle = {origin: 'current-battle-execution', identity, save_slot: context.slot,
    enemy_groups: formation.groups, enemy_instances: formation.instances};
  const values = createBattleContextValues({catalog: templates.battle_message_runtime_parameters,
    readBattle: () => battle, readSaveFields: () => fields,
    readMonster: id => monsters.find(row => row.id === id)}).targetChoices(identity);
  if (values.status !== 'available') throw new TypeError(values.reason);
  const selected = preview.battle_command_selection;
  const vehicle = selected?.vehicle ?? actor?.vehicle;
  const itemId = selected?.item ?? actor?.item;
  const item = itemId ? await db.get(`item:${itemId.toString(16).toUpperCase().padStart(2, '0')}`, null) : null;
  if (state.projectRepository !== repository) throw new Error('项目已切换，停止读取战斗目标');
  const palette = effectPaletteValues(metasprites);
  // 17:A409/A4B3/A479 共用 A41B 的逆序敌群循环，3F:EAFB 每行推进 $40。
  const groups = [...values.groups].reverse();
  const layers = [{kind: 'layout', record: vehicle == null ? calls.layouts.human : calls.layouts.vehicle,
    shift: calls.body_origin, pattern_profiles: calls.pattern_profiles},
    ...(selected?.kind === 'shell' ? [{kind: 'script', record: textRecordNodeId(calls.shell_region, selected.shell),
      cursor: calls.name_origin, glyph_pixel_y_offset: -4}] : item?.name_source ? [{kind: 'script', record: 'battle-target-action-name', cursor: calls.name_origin,
      records: [{id: 'battle-target-action-name', raw_hex: fixedRuntimeTextScriptHex(item.name_source)}],
      glyph_pixel_y_offset: -4}] : []),
    ...groups.map((group, index) => ({kind: 'script', record: calls.target_record,
      cursor: calls.target_origin + index * calls.row_step, glyph_pixel_y_offset: -4,
      provider_records: {[names[0]]: group.text_record_ref.node_id}, provider_constants: {[numbers[0]]: group.population}}))];
  return {...preview, layers, pattern_profiles: calls.pattern_profiles, battle_menu_calls: calls,
    sprite_palettes: Array.from({length: 4}, (_, index) => palette.slice(index * 4, index * 4 + 4)),
    ...(groups.length ? {selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', selector: calls.target_selector},
      runtime_context: {...preview.runtime_context, choice_index: preview.runtime_context?.choice_index ?? 0}} : {}),
    menu_highlight: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
      selector: vehicle == null ? calls.human_selector : calls.vehicle_selector,
      choice_index: selected?.kind === 'item' ? 1 : selected?.kind === 'shell' ? 3
        : selected?.part != null ? selected.part * 2 : actor?.itemMode ? 1 : 0, preset: 'parent-menu'},
    interface_value_sources: {formation: `battle-test-point:formation:${formation.id}`,
      party: actor?.party || [], action: actor?.field || null,
      groups: values.groups.map(row => ({group: row.group, name: row.text_record_ref.node_id, population: row.population}))},
    battle_target_values: values};
}
