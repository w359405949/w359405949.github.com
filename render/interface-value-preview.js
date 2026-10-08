// @editor-module 界面动态值由所选实体的当前字段构造。
import {servicePreviewFields, servicePreviewContext} from '../core/service-preview-state.js';
import {state} from '../core/state.js';
import {db} from '../core/project-db.js';
import {ensureSaveCurrentFieldObjects} from '../core/save-build.js';
import {saveFields} from '../core/save-editor-session.js';
import {saveNameTextSource, fixedRuntimeTextScriptHex, currentActorNameSource, decodeFixedRuntimeText} from '../core/text-record-project.js';
import {saveVehicleMenuInitialValues} from '../core/save-codec.js';
import {resolveBattleTargetPreview} from './battle-target-preview.js';
import {characterGrowthRequiredExperience} from '../core/character-growth-values.js';
import {interfacePreviewContext, selectInterfacePreviewContext} from '../core/interface-preview-context.js';
import {effectPaletteValues} from '../core/attack-chr-owner.js';
import {battleConditionRecordCalls} from '../core/battle-condition-preview.js';
import {battleConditionCursors} from '../core/battle-condition-code-sources.js';
import {interfacePreviewItemValue, registerInterfacePreviewItem} from '../core/interface-preview-items.js';
import {interfaceSaveSlotBindings, interfaceRecordProviders} from './interface-slots.js';
import {battleMenuCalls} from '../core/battle-menu-calls.js';
import {battleMessageParameterPlaceholder} from '../core/battle-message-calls.js';

const ROLES = ['hunter', 'mechanic', 'soldier'];
const DEFAULT_SELECTION = Object.freeze({slot: 1, actor: 'save-role:0', wanted: 1});
const PAGES = new Set(['startup-load', 'save-management', 'save-service',
  'experience-information-terminal', 'ending-credits', 'battle-messages',
  'battle-command-target', 'battle-party-status', 'battle-items-equipment']);

export function interfaceValueSelection(pageId) {
  const context = interfacePreviewContext();
  let actor = context.actor;
  if (pageId.startsWith('battle-') && actor.startsWith('rom-role:')) actor = actor.replace('rom-', 'save-');
  return {slot: context.slot, actor, wanted: context.wanted,
    inventory_index: context.inventory_index ?? 0,
    glyph_entry_path: context.glyph_entry_path ?? 'direct'};
}

export function selectInterfaceValue(pageId, field, value) {
  selectInterfacePreviewContext(field, value);
}

function interfaceValuePage(pageId) {return PAGES.has(pageId);}

export function interfaceValueContext(preview, pageId) {
  if (!preview) return preview;
  const slot = servicePreviewContext(preview, interfacePreviewContext()).slot;
  const currentSlot = value => {
    if (typeof value === 'string') return value.replace(/save\.slot\.\d+\./gu, `save.slot.${slot}.`);
    if (Array.isArray(value)) return value.map(currentSlot);
    if (value && Object.getPrototypeOf(value) === Object.prototype)
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, currentSlot(item)]));
    return value;
  };
  return {...preview, layers: (preview.layers || []).map(layer => ({...currentSlot(layer),
    ...(pageId === 'battle-messages' && layer.runtimeParameters
      ? {preview_entity_types: ['role', 'vehicle', 'rental', 'save-slot']} : {})})),
    ...(preview.satellite_save ? {satellite_save: currentSlot(preview.satellite_save)} : {}),
    runtime_context: {...preview.runtime_context, save_slot: slot},
    ...(interfaceValuePage(pageId) ? {interface_value_context: {pageId, ...interfaceValueSelection(pageId)}} : {})};
}

export function interfaceBattleValuePreview(preview, pageId, screen) {
  if (['battle-command-target.target', 'battle-items-equipment.target'].includes(screen?.interface_state_id)) {
    return interfaceValueContext({id: screen.id, battle_target: true,
      interface_battle_palette: true, viewport: {x: 0, y: 0, width: 256, height: 240},
      layers: [{kind: 'interface_battle_target', preview_entity_types: ['save-slot']}]}, pageId);
  }
  const vehicle = ['battle-party-status.vehicle', 'battle-items-equipment.vehicle-items',
    'battle-items-equipment.special-shell']
    .includes(screen?.interface_state_id);
  const actorTypes = vehicle ? ['vehicle', 'rental']
    : ['battle-command-target.command', 'battle-party-status.condition'].includes(screen?.interface_state_id)
      ? ['role', 'vehicle', 'rental'] : ['role'];
  const actorLayer = {kind: 'interface_battle_actor', preview_entity_types: [...actorTypes, 'save-slot']};
  if (screen?.interface_state_id === 'battle-items-equipment.special-shell') {
    return interfaceValueContext({id: screen.id, interface_battle_palette: true,
      viewport: {x: 0, y: 144, width: 256, height: 96},
      menu_highlight: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
        battle_menu_selector: 'vehicle', choice_index: 3, preset: 'parent-menu'},
      selection_cursor: {resource_id: 'selection-layout', kind: 'indexed-coordinate', battle_menu_selector: 'shell'},
      layers: [{kind: 'interface_battle_layout', vehicle: true},
        {kind: 'interface_battle_shell_list', preview_entity_types: [...actorTypes, 'save-slot']}]}, pageId);
  }
  if (screen?.interface_state_id === 'battle-party-status.condition') {
    return interfaceValueContext({id: screen.id, interface_battle_palette: true,
      viewport: {x: 0, y: 144, width: 256, height: 96},
      menu_highlight: {resource_id: 'selection-layout', kind: 'indexed-coordinate',
        battle_menu_selector: 'human', choice_index: 3, preset: 'parent-menu'},
      layers: [{kind: 'interface_battle_layout'},
        {kind: 'interface_battle_name',
          role_only: true, condition_role: true, glyph_pixel_y_offset: -4,
          preview_entity_types: [...actorTypes, 'save-slot']},
        {kind: 'interface_battle_condition', preview_entity_types: [...actorTypes, 'save-slot']}]}, pageId);
  }
  if (['battle-items-equipment.human-items', 'battle-items-equipment.vehicle-items',
    'battle-items-equipment.human-equipment']
    .includes(screen?.interface_state_id)) {
    const source = state.project?.ui?.construction?.menu_dispatch_data?.previews
      ?.find(item => item.id === 'command:23/1B');
    if (!source) return preview;
    const equipment = screen.interface_state_id === 'battle-items-equipment.human-equipment';
    // 17:A33D 与 3F:F347/F564/F578 分别提供选择布局、装备来源和文字游标。
    return interfaceValueContext({...source, id: screen.id,
      field_sources: [], preview_entity_types: [],
      ...(equipment ? {sprite_palette_source: null, interface_battle_palette: true} : {}),
      menu_highlight: equipment ? {...source.menu_highlight, battle_menu_selector: 'human', choice_index: 2} : null,
      selection_cursor: equipment ? {...source.selection_cursor, battle_menu_selector: 'equipment'} : null,
      layers: [...(equipment ? [{kind: 'interface_battle_layout'},
        {kind: 'interface_battle_name',
          role_only: true, glyph_pixel_y_offset: -4, preview_entity_types: [...actorTypes, 'save-slot']}
        ] : [{...actorLayer, command: true, status: false}]),
        ...source.layers.filter(layer => layer.provider_save_items)
          .map(layer => ({...layer, kind: 'interface_battle_inventory', equipment,
            preview_entity_types: [...actorTypes, 'save-slot'],
            provider_save_items: {providers: layer.provider_save_items.providers}}))]}, pageId);
  }
  const applicable = ['battle-command-target.command', 'battle-party-status.human',
    'battle-party-status.vehicle'].includes(screen?.interface_state_id);
  if (!applicable) return preview;
  return interfaceValueContext({id: screen.id, viewport: {x: 0, y: 144, width: 256, height: 96},
    layers: [{...actorLayer, command: pageId === 'battle-command-target'}]}, pageId);
}

function clearProviders(layer, ids) {
  const result = {...layer};
  for (const key of ['provider_constants', 'provider_values', 'provider_scripts',
    'provider_script_hex', 'provider_records', 'provider_record_pairs']) {
    result[key] = {...layer[key]};
    ids.forEach(id => delete result[key][id]);
  }
  delete result.provider_source;
  return result;
}

function nameHex(fields, fieldId) {
  const object = fields.object(fieldId);
  return fixedRuntimeTextScriptHex(saveNameTextSource(object, object.value));
}

function actorFields(context, fields) {
  const [kind, idText] = String(context.actor).split(':');
  const id = Number(idText);
  const role = kind === 'save-role' && Number.isInteger(id) && id >= 0 && id < ROLES.length;
  const vehicle = kind === 'save-vehicle' && Number.isInteger(id) && id >= 0 && id <= 10;
  const actor = {kind: role ? 'role' : vehicle ? 'vehicle' : null, id};
  const prefix = `save.slot.${context.slot}.${role ? `role.${ROLES[id]}` : `vehicle.${id}`}`;
  const available = fields.slotStatus(context.slot).valid && (role
    ? fields.object(`${prefix}.present`).value : vehicle && fields.vehicleAcquired(context.slot, id));
  return {actor, prefix, available};
}

function conditionActorFields(context, fields) {
  const selected = actorFields(context, fields);
  if (!selected.available || selected.actor.kind !== 'vehicle') return selected;
  const rider = ROLES.findIndex(role => {
    const prefix = `save.slot.${context.slot}.role.${role}`;
    return fields.object(`${prefix}.present`).value
      && fields.object(`${prefix}.current_vehicle`).value === selected.actor.id;
  });
  return rider < 0 ? {...selected, available: false}
    : actorFields({...context, actor: `save-role:${rider}`}, fields);
}

function roleValues(selection, fields, gameData) {
  const [kind, idText] = String(selection.actor).split(':');
  const id = Number(idText);
  if (!Number.isInteger(id) || id < 0 || id >= ROLES.length) return null;
  if (kind === 'rom-role') {
    const role = gameData.characters?.rom_initial?.roles?.find(row => Number(row.id) === id);
    const source = gameData.text_slots?.slots?.[`character-init:name-presets:${id + 1}`];
    return role && source ? {name: fixedRuntimeTextScriptHex(source), level: role.level,
      experience: role.experience, source: `character-initial-record:rom-role:${id.toString(16).toUpperCase().padStart(2, '0')}`,
      nameSource: `fixed-text-slot:character-init:name-presets:${id + 1}`} : null;
  }
  if (kind !== 'save-role' || !fields.slotStatus(selection.slot).valid) return null;
  const prefix = `save.slot.${selection.slot}.role.${ROLES[id]}`;
  if (!fields.object(`${prefix}.present`).value) return null;
  return {name: nameHex(fields, `${prefix}.name_codes`),
    level: fields.object(`${prefix}.level`).value,
    experience: fields.object(`${prefix}.experience`).value, source: prefix, nameSource: `${prefix}.name_codes`};
}

function resolveInterfaceValueFields(preview, {fields, gameData = {}, growth = null, conditionCursors, romVehicle, menuCalls} = {}) {
  if (!preview) return preview;
  const context = preview.interface_value_context || {...DEFAULT_SELECTION,
    ...(layersPage(preview) === 'experience-information-terminal' ? {actor: 'rom-role:0'} : {})};
  const layers = preview.layers || [];
  const sources = {};
  const slotValid = slot => fields.slotStatus(slot).valid;
  const runtimeContext = {...preview.runtime_context};
  const resolved = {...preview, runtime_context: runtimeContext, layers: layers.flatMap(layer => {
    if (layer.kind === 'interface_battle_layout') return {...layer, kind: 'layout',
      record: menuCalls.layouts[layer.vehicle ? 'vehicle' : 'human'], shift: menuCalls.body_origin,
      pattern_profiles: menuCalls.pattern_profiles};
    if (layer.kind === 'interface_battle_shell_list') {
      const {actor, prefix, available} = actorFields(context, fields);
      if (!available || actor.kind !== 'vehicle'
          || !(fields.object(`${prefix}.equipped_mask_raw`).value & 128)
          || fields.object(`${prefix}.equipment_state.main_gun`).value & 128) return [];
      const types = Array.from({length: 6}, (_, index) => `${prefix}.shell_type.${index}`);
      const values = types.map(field => interfacePreviewItemValue(preview, field, fields.object(field).value));
      if (!values.some(value => value < 128)) return [];
      const count = `${prefix}.shell_count.${context.shell_index ?? preview.runtime_context?.choice_index ?? 0}`;
      types.forEach((source, index) => registerInterfacePreviewItem(preview, `vehicle-shell:${index}`,
        source, values[index], null, {countSource: `${prefix}.shell_count.${index}`,
          count: interfacePreviewItemValue(preview, `${prefix}.shell_count.${index}`,
            fields.object(`${prefix}.shell_count.${index}`).value)}));
      sources.shells = {types, count, equipped: `${prefix}.equipped_mask_raw`,
        condition: `${prefix}.equipment_state.main_gun`};
      // 3F:F2E7 提供六个 0D 记录对，17:A4B6 提供首个炮弹槽的数量。
      const providers = interfaceRecordProviders({record: menuCalls.shell_record}, [0xFA, 0xFB]);
      const counts = interfaceRecordProviders({record: menuCalls.shell_count_record}, [0xF8, 0xF9]);
      if (providers.length !== types.length || counts.length !== 1) throw new TypeError('战斗炮弹缺少槽位构造');
      return [{kind: 'script', record: menuCalls.shell_record, cursor: menuCalls.body_origin, glyph_pixel_y_offset: -4,
        component_slot_providers: Object.fromEntries(providers.map((provider, index) =>
          [provider, {id: `vehicle-shell:${index}`, label: `炮弹 ${index + 1}`} ])),
        provider_record_pairs: Object.fromEntries(providers.flatMap((provider, index) =>
          values[index] < 128 ? [[provider, {region: menuCalls.shell_region, record: values[index]}]] : []))},
      {kind: 'script', record: menuCalls.shell_count_record, cursor: menuCalls.name_origin,
        provider_constants: {[counts[0]]: interfacePreviewItemValue(preview, count, fields.object(count).value)}}];
    }
    if (layer.kind === 'interface_battle_response') {
      const responseContext = Number.isInteger(layer.role) ? {...context, actor: `save-role:${layer.role}`} : context;
      const {prefix, available} = conditionActorFields(responseContext, fields);
      if (!available) return [];
      sources.response = {record: layer.record, name: `${prefix}.name_codes`};
      return {kind: 'script', record: layer.record, cursor: menuCalls.target_origin,
        ...(layer.partRecord ? {runtime_record_pair: layer.partRecord} : {}),
        provider_script_hex: {7: nameHex(fields, `${prefix}.name_codes`)},
        dialogue_runtime: true, confirmed_waits: 0, confirm_input: 0xFF,
        line_origin: menuCalls.target_origin & 31, runtime_line_column: menuCalls.target_origin & 31,
        glyph_pixel_y_offset: -4, dialogue_terminal_wait: true};
    }
    if (layer.kind === 'interface_battle_condition') {
      const {actor, prefix, available} = conditionActorFields(context, fields);
      if (!available || actor.kind !== 'role') return [];
      const field = `${prefix}.status`;
      const actors = [{kind: 'role', status: fields.object(field).value,
        name: nameHex(fields, `${prefix}.name_codes`)}];
      const mountedField = `${prefix}.current_vehicle`;
      const mounted = fields.object(mountedField).value;
      const vehiclePrefix = `save.slot.${context.slot}.vehicle.${mounted}`;
      sources.condition = {field, name: `${prefix}.name_codes`, mounted: mountedField};
      if (mounted >= 0 && mounted < 11) {
        const vehicleField = `${vehiclePrefix}.condition_raw`;
        actors.push({kind: 'vehicle', status: fields.object(vehicleField).value,
          name: nameHex(fields, `${vehiclePrefix}.name_codes`)});
        sources.condition.vehicle = {field: vehicleField, name: `${vehiclePrefix}.name_codes`};
      }
      const calls = battleConditionRecordCalls(actors, conditionCursors);
      sources.condition.records = calls.map(call => call.record);
      return [{kind: 'script', record_calls: calls, dialogue_runtime: true,
        confirmed_waits: preview.runtime_context?.confirmed_waits ?? 0,
        confirm_input: 0xFF, line_origin: conditionCursors[0] & 31,
        runtime_line_column: conditionCursors[0] & 31, glyph_pixel_y_offset: -4, dialogue_terminal_wait: true}];
    }
    if (layer.kind === 'interface_battle_name') {
      const {actor, prefix, available} = layer.condition_role
        ? conditionActorFields(context, fields) : actorFields(context, fields);
      const present = available && (!layer.role_only || actor.kind === 'role');
      sources.name = romVehicle ? romVehicle.nameSource : present ? `${prefix}.name_codes` : null;
      const providers = interfaceRecordProviders({record: menuCalls.name_record}, [0xE8, 0xFC, 0xFD]);
      if (providers.length !== 1) throw new TypeError('战斗姓名缺少提供器构造');
      return {...clearProviders(layer, providers), kind: 'script', record: menuCalls.name_record,
        cursor: menuCalls.name_origin,
        provider_script_hex: {[providers[0]]: romVehicle?.nameScriptHex || (present ? nameHex(fields, `${prefix}.name_codes`) : '9F')}};
    }
    if (layer.kind === 'interface_battle_inventory') {
      const {actor, prefix, available} = actorFields(context, fields);
      const result = clearProviders(layer, layer.provider_save_items.providers);
      delete result.provider_save_items;
      if (!available || (layer.equipment && actor.kind !== 'role')) return {...result, kind: 'script'};
      const ids = actor.kind === 'role' ? [`${prefix}.${layer.equipment ? 'equipment' : 'inventory'}`]
        : Array.from({length: 8}, (_, index) => `${prefix}.item.${index}`);
      sources[layer.equipment ? 'equipment' : 'inventory'] = {fields: ids, providers: layer.provider_save_items.providers};
      return {...result, kind: 'script', provider_save_items: {providers: layer.provider_save_items.providers,
        ...(actor.kind === 'role' ? {field_id: ids[0]} : {field_ids: ids})}};
    }
    if (layer.kind === 'interface_battle_actor') {
      if (context.actor.startsWith('rom-vehicle:')) {
        sources.name = romVehicle?.nameSource || null;
        if (layer.status !== false) sources.status = romVehicle?.statusSource || null;
        if (romVehicle && Number.isInteger(preview.battle_actor_role)) {
          const hp = `save.slot.${context.slot}.role.${ROLES[preview.battle_actor_role]}.current_hp`;
          sources.status_hp = hp;
          return {...layer, actor: {name: romVehicle.name, name_script_hex: romVehicle.nameScriptHex,
            vehicle: true, label: 'HP', value: fields.object(hp).value, secondary: {label: 'SP', value: romVehicle.sp}}};
        }
        return {...layer, actor: romVehicle ? {name: romVehicle.name, name_script_hex: romVehicle.nameScriptHex,
          label: 'SP', value: romVehicle.sp} : null};
      }
      const {actor, prefix, available} = actorFields(context, fields);
      if (!available) return {...layer, actor: null};
      const name = fields.object(`${prefix}.name_codes`).nameText;
      const field = actor.kind === 'role' ? 'current_hp' : 'sp';
      const value = fields.object(`${prefix}.${field}`).value;
      sources.name = `${prefix}.name_codes`;
      if (layer.status !== false) sources.status = `${prefix}.${field}`;
      if (actor.kind === 'vehicle') {
        const rider = ROLES.find((role, index) => (preview.battle_actor_role === undefined || preview.battle_actor_role === index)
          && fields.object(`save.slot.${context.slot}.role.${role}.present`).value & 128
          && fields.object(`save.slot.${context.slot}.role.${role}.current_vehicle`).value === actor.id);
        if (rider) {
          const hp = `save.slot.${context.slot}.role.${rider}.current_hp`;
          sources.status_hp = hp;
          return {...layer, actor: {name, name_script_hex: nameHex(fields, `${prefix}.name_codes`), vehicle: true,
            label: 'HP', value: fields.object(hp).value, secondary: {label: 'SP', value}}};
        }
      }
      return {...layer, actor: {name, name_script_hex: nameHex(fields, `${prefix}.name_codes`),
        label: actor.kind === 'role' ? 'HP' : 'SP', value}};
    }
    const slots = interfaceSaveSlotBindings(layer);
    if (slots) {
      const result = clearProviders(layer, slots.flatMap(row => [row.name, row.level]).filter(value => value !== undefined));
      for (const {slot, name, level} of slots) {
        const prefix = `save.slot.${slot}.role.hunter`;
        const available = slotValid(slot) && fields.object(`${prefix}.present`).value;
        result.provider_script_hex[name] = available ? nameHex(fields, `${prefix}.name_codes`) : '9F';
        sources[name] = available ? `${prefix}.name_codes` : null;
        if (level !== undefined) {
          if (available) result.provider_constants[level] = fields.object(`${prefix}.level`).value;
          sources[level] = available ? `${prefix}.level` : null;
        }
      }
      delete runtimeContext.slot_names;
      delete runtimeContext.slot_1_name;
      delete runtimeContext.slot_1_level;
      delete runtimeContext.slot_2_empty;
      return result;
    }
    if (layer.ending_hunter_name) {
      const prefix = `save.slot.${context.slot}.role.hunter`;
      sources.name = `${prefix}.name_codes`;
      return {...clearProviders(layer, [0]),
        provider_script_hex: {0: nameHex(fields, `${prefix}.name_codes`)}};
    }
    if (layer.facility_experience_rows) {
      const names = interfaceRecordProviders(layer, [0xFC, 0xFD]);
      const numbers = interfaceRecordProviders(layer, [0xF8, 0xF9]);
      if (names.length !== 1 || numbers.length !== 2) throw new TypeError('升级提示缺少提供器构造');
      const [name] = names, [level, requiredExperience] = numbers;
      const result = clearProviders(layer, [...names, ...numbers]);
      const role = roleValues(layer.experience_role_index === undefined ? context
        : {...context, actor: `save-role:${layer.experience_role_index}`}, fields, gameData);
      result.provider_script_hex[name] = role?.name || '9F';
      if (role) {
        result.provider_constants[level] = role.level;
        const required = characterGrowthRequiredExperience(growth, role.level, role.experience);
        if (required !== null) result.provider_constants[requiredExperience] = required;
      }
      sources[name] = role?.nameSource || null;
      sources[level] = role ? `${role.source}.level` : null;
      sources[requiredExperience] = role ? {level: `${role.source}.level`, experience: `${role.source}.experience`,
        threshold: `character-growth:experience-thresholds:current_level:${role.level}.required_total_experience`} : null;
      delete runtimeContext.actor_name;
      delete runtimeContext.actor_level;
      delete runtimeContext.required_experience;
      return result;
    }
    if (layer.provider_source?.path === 'runtime_context.defeat_level') {
      const result = clearProviders(layer, [56]);
      const path = `save.slot.${context.slot}.wanted_defeat_level_at_victory.${context.wanted}`;
      const field = fields.find(path);
      const level = field && slotValid(context.slot) ? field.value : null;
      const monster = gameData.monsters?.records?.find(row => row.id === field?.binding.monster_id);
      const name = monster?.name_reference;
      if (['record:15:016', 'record:15:017'].includes(result.record))
        result.record = level > 0 ? 'record:15:016' : 'record:15:017';
      if (level !== null && name?.mapping_status === 'confirmed') {
        result.runtime_record_pair = name.node_id;
      } else delete result.runtime_record_pair;
      if (level > 0) result.provider_constants[56] = level;
      sources[56] = level > 0 ? path : null;
      delete runtimeContext.defeat_level;
      return result;
    }
    if (context.pageId === 'battle-messages' && layer.runtimeParameters) {
      const originalResolver = layer.resolveRuntimeParameter;
      const {actor, prefix, available} = actorFields(context, fields);
      sources['ui-text-provider-workspace.current-string'] = available ? {slot: context.slot, actor} : null;
      return {...layer, invocation: {kind: 'interface-actor', ...context},
        resolveRuntimeParameter(request) {
          const result = request.source === 'ui-text-provider-workspace.current-string'
            ? (available ? currentActorNameSource({saveSlot: context.slot, actor, fieldObjects: fields.all(`${prefix}.`)})
              : {status: 'unavailable', reason: '所选出手者没有当前存档值'})
            : originalResolver?.(request) || {status: 'unavailable', reason: '本次消息的参数尚未确认'};
          return result.status === 'unavailable' ? battleMessageParameterPlaceholder(request) : result;
        }};
    }
    return layer;
  })};
  return {...resolved, interface_value_sources: sources,
    ...(layers.some(layer => layer.equipment) && !sources.equipment
      || layers.some(layer => layer.kind === 'interface_battle_condition') && !sources.condition
      || layers.some(layer => layer.kind === 'interface_battle_shell_list') && !sources.shells
      ? {selection_cursor: null, menu_highlight: null} : {})};
}

export async function resolveInterfaceValuePreview(preview, {readCodeField} = {}) {
  if (!preview || (!preview.interface_value_context && !preview.layers?.some(layer =>
    layer.save_slot_values || layer.facility_experience_rows
    || layer.ending_hunter_name
    || layer.provider_source?.path === 'runtime_context.defeat_level'))) return preview;
  const repository = state.projectRepository;
  const fields = servicePreviewFields(preview, await ensureSaveCurrentFieldObjects(state, saveFields));
  if (preview.battle_target) return resolveBattleTargetPreview(preview, fields, {readCodeField});
  let romVehicle = null;
  if (preview.interface_value_context?.actor.startsWith('rom-vehicle:')
      && preview.layers?.some(layer => layer.kind === 'interface_battle_actor')) {
    const id = Number(preview.interface_value_context.actor.split(':')[1]);
    const vehicles = await db.getResourceDocument('vehicle-preset', null);
    const preset = vehicles?.presets?.find(row => Number(row.preset_id) === id);
    if (preset) {
      const rental = vehicles.views.rental.preset_ids.includes(id);
      let nameSource;
      if (rental) {
        const [items, overlays, saveVehicles] = await Promise.all([
          db.getResourceDocument('item-entry', null), db.getResourceDocument('shared-indexed-byte-overlays', null),
          db.getResourceDocument('save-vehicle', null),
        ]);
        nameSource = saveVehicleMenuInitialValues(id, {vehicles, items, overlays, saveVehicles}).name_source;
      } else {
        const item = await db.get(`item:${preset.chassis_id.toString(16).toUpperCase().padStart(2, '0')}`, null);
        nameSource = item?.name_source;
      }
      romVehicle = {name: decodeFixedRuntimeText(nameSource, state.project.text_record_encoding).text,
        nameScriptHex: fixedRuntimeTextScriptHex(nameSource),
        sp: preset.initial_sp.value, statusSource: `vehicle-preset:${id}.initial_sp`,
        nameSource: rental
          ? `vehicle-preset:${id}.rental_name` : `item:${preset.chassis_id}.name_source`};
    }
  }
  const growth = preview.layers?.some(layer => layer.facility_experience_rows)
    ? await db.getResourceDocument('character-growth', null) : null;
  const palette = preview.interface_battle_palette
    ? effectPaletteValues(await db.getResourceDocument('metasprite-record', null)) : null;
  const conditionCursors = preview.layers?.some(layer => layer.kind === 'interface_battle_condition')
    ? await battleConditionCursors(source => db.getField(source.resource_id, source.entity_handle, source.field)) : null;
  if (state.projectRepository !== repository) throw new Error('项目已切换，停止读取界面动态值');
  const menuCalls = preview.layers?.some(layer => layer.kind.startsWith('interface_battle_'))
    ? await battleMenuCalls(readCodeField || (source => db.getField(source.resource_id, source.entity_handle, source.field))) : null;
  const selection = binding => binding?.battle_menu_selector ? {...binding,
    selector: menuCalls[`${binding.battle_menu_selector}_selector`]} : binding;
  preview = {...preview, selection_cursor: selection(preview.selection_cursor),
    menu_highlight: selection(preview.menu_highlight), ...(menuCalls ? {battle_menu_calls: menuCalls} : {})};
  const resolved = resolveInterfaceValueFields(preview, {fields, gameData: state.project?.game_data, growth, conditionCursors, romVehicle, menuCalls});
  return palette ? {...resolved,
    sprite_palettes: Array.from({length: 4}, (_, index) => palette.slice(index * 4, index * 4 + 4))} : resolved;
}

function layersPage(preview) {
  return preview.layers?.some(layer => layer.facility_experience_rows)
    ? 'experience-information-terminal' : '';
}
