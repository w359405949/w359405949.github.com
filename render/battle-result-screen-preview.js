// @editor-module 战斗结果预览只读取全局选择与字段对象当前值。
import {db} from '../core/project-db.js';
import {state} from '../core/state.js';
import {interfacePreviewContext} from '../core/interface-preview-context.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex} from '../core/text-record-project.js';
import {battleResultScreenValues, battleResultScreenCalls} from '../core/battle-result-screen.js';
import {battleConditionCursors} from '../core/battle-condition-code-sources.js';
import {battleMessageWaitPosition} from '../core/render-code-sources.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];

export async function resolveBattleResultScreenPreview(preview) {
  const phase = preview?.battle_results?.phase;
  if (!phase) return preview;
  if (phase === 'returned') return preview;
  const execution = preview.battle_result_execution;
  const context = {...interfacePreviewContext(), ...(execution?.context || {})};
  const repository = state.projectRepository;
  const [monsters, formations, characters, fields, cursors, waitPosition] = await Promise.all([
    db.getAll('monster', []), db.getResourceDocument('battle-test-point', null),
    db.getDocument('character-initial-record', null), ensureSaveCurrentFieldObjects(state),
    battleConditionCursors(source => db.getField(source.resource_id, source.entity_handle, source.field)),
    ['victory', 'defeat'].includes(phase)
      ? battleMessageWaitPosition() : null,
  ]);
  if (state.projectRepository !== repository) throw new Error('项目已切换，停止读取战斗结果');
  const formation = formations?.formations?.find(row => row.id === context.formation);
  const fromSave = Boolean(execution) || context.actor.startsWith('save-');
  const roles = characters?.rom_initial?.roles || [];
  const slots = execution?.domainResults.battleResult.party.map(actor => actor.roleId)
    || context.partyRoles || roles.filter(role => role.present).map(role => role.id);
  const party = slots.map(slot => {
    const terminal = execution?.domainResults.battleResult.party.find(actor => actor.roleId === slot);
    const role = roles.find(role => role.id === slot);
    const prefix = `save.slot.${context.slot}.role.${ROLES[slot]}`;
    const read = field => execution && Object.hasOwn(execution.fields, `${prefix}.${field}`)
      ? execution.fields[`${prefix}.${field}`] : fromSave ? fields.object(`${prefix}.${field}`).value : role?.[field];
    const items = field => fromSave ? Array.from(read(field))
      : role?.[field]?.map(item => item.item_id);
    const name = fromSave ? saveNameTextSource(fields.object(`${prefix}.name_codes`), read('name_codes'))
      : state.project?.game_data?.text_slots?.slots?.[`character-init:name-presets:${slot + 1}`];
    const vehicleSlot = fromSave ? read('current_vehicle') : 255;
    return {slot, name: fixedRuntimeTextScriptHex(name), inventory: items('inventory'),
      equipment: items('equipment'), hp: terminal?.hp ?? read('current_hp'), vehicleSlot,
      ridingVehicle: vehicleSlot < 11};
  });
  const rentalCount = fromSave ? [0, 1, 2].filter(index => {
    const preset = fields.object(`save.slot.${context.slot}.active_rental_vehicle_preset.${index}`).value;
    return preset < 128;
  }).length : 0;
  const result = execution?.domainResults.battleResult;
  const values = result ? {status: result.rewards.status, ...result.rewards, drop: result.drop,
    defeat: party.some(member => member.slot > 0) ? 6 : 0}
    : battleResultScreenValues({groups: formation?.slots, monsters, party, dropRoll: context.dropRoll, rentalCount});
  const shown = execution?.selections.reward === 'experience' ? {...values, gold: 0} : values;
  const calls = battleResultScreenCalls(phase, shown, party, cursors);
  const retained = phase === 'rewards' ? Math.max(0, calls.length - 2) : phase === 'drop' ? 1 : 0;
  const item = values.drop && await db.get(`item:${values.drop.itemId.toString(16).toUpperCase().padStart(2, '0')}`, null);
  const script = (recordCalls, confirmedWaits, extra = {}) => ({kind: 'script', record_calls: recordCalls,
    provider_constants: {13: values.experience, 0xDF: values.gold},
    ...(item ? {runtime_record_pair: 'battle-result-drop-item',
      records: [{id: 'battle-result-drop-item', raw_hex: fixedRuntimeTextScriptHex(item.name_source)}]} : {}),
    glyph_pixel_y_offset: -4, dialogue_runtime: true, line_origin: 2,
    confirmed_waits: confirmedWaits, confirm_input: 255, ...extra});
  return {...preview, glyph_cache_source: 'single-pool', battle_result_values: values,
    interface_value_sources: {formation: context.formation, party: slots, source: fromSave ? 'save' : 'rom'},
    layers: [...(phase === 'drop' && calls.length ? [script(
      battleResultScreenCalls('rewards', values, party, cursors), 255, {glyph_cache_only: true})] : []),
    preview.layers[0], ...(calls.length ? [script(calls, retained, {
      dialogue_terminal_wait: true,
      ...(waitPosition ? {
        terminal_wait_cursor: waitPosition.cursor,
        terminal_wait_origin: waitPosition.origin,
      } : {}),
    })] : []), ...(party.length ? [{kind: 'interface_battle_actor', actor: {
      row_stride: 24,
      rows: party.map(member => ({label: phase === 'defeat' ? 'SI' : 'HP',
        value: phase === 'defeat' ? 0 : member.hp})),
    }}] : [])]};
}
