// @editor-module 服务阶段的临时条件按既有构造声明登记。
import {SERVICE_ROLES, SERVICE_PARTS} from './service-preview-state.js';
import {fieldGlyphEntryCalls} from './field-glyph-cache-path.js';

const shop = preview => preview.shop_menu || {};
const operations = preview => preview.layers?.flatMap(layer =>
  (layer.facility_parameter_bindings || []).map(binding => binding.value_source?.operation)) || [];
const hasOperation = (preview, ...names) => operations(preview).some(name => names.includes(name));
const template = preview => preview.service_response?.template_id || preview.confirmed_state_binding?.preview_id || preview.id;
const named = (preview, expression) => expression.test(template(preview));
const vehicleMenu = preview => ['goods-vehicle-select', 'service-vehicle-select', 'service-vehicle-dialogue', 'service-vehicle-menu'].includes(shop(preview).mode);
const selectedVehicle = env => `vehicle.${env.vehicle}`;
const selectedRole = env => `role.${env.role}`;
const ammunitionParts = env => SERVICE_PARTS.filter(part => {
  const id = env.get(`${selectedVehicle(env)}.equipment.${part}`);
  return id > 0 && id < 0x75;
});
const damaged = env => env.partyVehicles().flatMap(vehicle => SERVICE_PARTS.filter(part =>
  env.get(`vehicle.${vehicle}.equipment.${part}`) && env.get(`vehicle.${vehicle}.equipment_state.${part}`) & 0xC0)
  .map(part => ({vehicle, part})));

function mountSelectedVehicle(env) {
  const path = selectedRole(env);
  const driver = SERVICE_ROLES.find(role => env.get(`role.${role}.present`)
    && env.get(`role.${role}.driving`) && env.get(`role.${role}.current_vehicle`) === env.vehicle);
  if (!driver) {
    env.put(`${path}.present`, 1);
    env.put(`${path}.driving`, 1);
    env.put(`${path}.current_vehicle`, env.vehicle);
  }
  const vehicles = [...env.get('entity_scene_object_slots')];
  if (!vehicles.slice(0, 4).includes(env.vehicle)) {
    const empty = vehicles.slice(0, 4).findIndex(value => value >= 128);
    vehicles[empty < 0 ? 0 : empty] = env.vehicle;
    env.put('entity_scene_object_slots', vehicles);
  }
  if (env.vehicle < 8) env.put(`global_event_flag.${(env.vehicle + 8).toString(16).toUpperCase().padStart(2, '0')}`, 1);
}

function setRoleStatus(env, key) {
  if (!env.get(`${selectedRole(env)}.present`)) env.put(`${selectedRole(env)}.present`, 1);
  env.roleStatus(env.role, key);
}

function repairCondition(env) {
  const mode = shop(env.preview).repair_component_mode;
  const existing = damaged(env);
  if (mode === 'single') {
    if (existing.length === 1 && existing[0].vehicle === env.vehicle) return;
    for (const {vehicle, part} of existing) env.state(vehicle, part,
      env.get(`vehicle.${vehicle}.equipment_state.${part}`) & 0x3F);
  } else if (mode === 'multiple' && existing.length >= 2) return;
  else if (mode === 'selected') {
    const index = env.preview.runtime_context?.repair_item_index ?? 0;
    const selected = existing.filter(row => row.vehicle === env.vehicle)[index];
    let row = 0, selectedRow = -1;
    for (const vehicle of env.partyVehicles()) {
      const components = existing.filter(component => component.vehicle === vehicle);
      for (const component of components) {if (component === selected) selectedRow = row + 1; row++;}
      if (components.length) row++;
    }
    const choice = selectedRow - (env.preview.runtime_context?.first_row ?? 0);
    if (selected && choice >= 0 && choice <= 7) return;
    for (const component of existing.filter(component => component.vehicle !== env.vehicle))
      env.state(component.vehicle, component.part,
        env.get(`vehicle.${component.vehicle}.equipment_state.${component.part}`) & 0x3F);
    if (selected) return;
  } else if (!mode && existing.some(row => row.vehicle === env.vehicle)) return;
  const count = mode === 'multiple' ? 2 : mode === 'selected' ? (env.preview.runtime_context?.repair_item_index ?? 0) + 1 : 1;
  for (const part of SERVICE_PARTS.slice(0, count)) {
    if (!env.get(`${selectedVehicle(env)}.equipment.${part}`))
      env.equipment(env.vehicle, part, env.item(item => item.category?.id === 'tank-main-gun'));
    env.state(env.vehicle, part, env.get(`${selectedVehicle(env)}.equipment_state.${part}`) | 0x40);
  }
}

function ammunitionCondition(env) {
  const index = env.preview.runtime_context?.list_choice_index ?? 0;
  while (ammunitionParts(env).length <= index) {
    const part = SERVICE_PARTS.find(part => !ammunitionParts(env).includes(part));
    if (!part) throw new TypeError('服务临时条件的武器选择超出携带范围');
    env.equipment(env.vehicle, part, env.item(item => item.id > 0 && item.id < 0x65
      && item.category?.id === 'tank-main-gun' && (item.equipment.raw_flags & 7) > 0));
  }
  const part = ammunitionParts(env)[index];
  const id = env.get(`${selectedVehicle(env)}.equipment.${part}`);
  const item = env.items.records.find(row => row.id === id);
  if (id >= 0x65 || !(item?.equipment?.raw_flags & 7))
    env.equipment(env.vehicle, part, env.item(row => row.id > 0 && row.id < 0x65
      && row.category?.id === 'tank-main-gun' && (row.equipment.raw_flags & 7) > 0));
  const code = env.items.records.find(row => row.id === env.get(`${selectedVehicle(env)}.equipment.${part}`)).equipment.raw_flags & 7;
  const capacity = code === 7 ? env.codes.ammunition_capacity_zero : env.codes.ammunition_capacities[code];
  let remaining = (capacity - (env.get(`${selectedVehicle(env)}.equipment_state.${part}`) & 0x3F)) & 255;
  if (!remaining) {
    env.state(env.vehicle, part, env.get(`${selectedVehicle(env)}.equipment_state.${part}`) & 0xC0);
    remaining = capacity;
  }
  if (shop(env.preview).service_amount && !shop(env.preview).service_amount_input) {
    const amount = env.context.service_amount ?? env.codes['service-input-initial-amount'];
    if (!Number.isInteger(amount) || amount < 1 || amount > remaining) env.select('service_amount', 1);
  }
}

function storageCondition(env) {
  const index = env.preview.runtime_context?.stored_item_index ?? env.preview.runtime_context?.choice_index ?? 0;
  const entries = Array.from({length: 64}, (_, row) => env.get(`property_storage.item.${row}`)).sort((a, b) => b - a);
  if (entries[index]) return;
  let needed = index + 1 - entries.filter(Boolean).length;
  for (let row = 0; row < 64 && needed > 0; row++) if (!env.get(`property_storage.item.${row}`)) {
    env.put(`property_storage.item.${row}`, env.item(item => item.id > 0 && item.category?.id === 'human-item'));
    env.put(`property_storage.paired_condition.${row}`, 0);
    needed--;
  }
}

function saleCondition(env) {
  const source = shop(env.preview), index = env.preview.runtime_context?.sale_item_index ?? 0;
  if (source.sale_entity === 'vehicle') {
    const suffix = source.sale_item_bar === 'equipment'
      ? `${selectedVehicle(env)}.equipment.${SERVICE_PARTS[index]}` : `${selectedVehicle(env)}.item.${index}`;
    if (!env.get(suffix)) env.put(suffix, env.item(item => item.id > 0 && item.price?.value > 0
      && item.category?.id === (source.sale_item_bar === 'equipment' ? 'tank-main-gun' : 'tank-item')));
  } else {
    const suffix = `${selectedRole(env)}.${source.sale_item_bar}`;
    const values = [...env.get(suffix)];
    if (!values[index]) {
      values[index] = env.item(item => item.id > 0 && item.price?.value > 0
        && item.category?.id === (source.sale_item_bar === 'equipment' ? 'human-weapon' : 'human-item'));
      env.put(suffix, values);
    }
  }
}

const SERVICE_PREVIEW_CONDITIONS = [
  {id: 'field-repair-item', label: '所选物品为修理工具',
    applies: p => Boolean(p.field_use_result), assets: ['items'],
    construct: e => {
      const role = SERVICE_ROLES[e.preview.runtime_context?.actor ?? 0];
      const index = e.preview.runtime_context?.inventory_index ?? 0;
      const suffix = `role.${role}.inventory`, values = [...e.get(suffix)];
      const handler = e.preview.field_use_result.handler_prg_offset;
      const selected = e.items.records.find(item => item.id === values[index]);
      if (selected?.use_effect?.handler?.prg_offset === handler) return;
      values[index] = e.item(item => item.use_effect?.handler?.prg_offset === handler);
      e.put(suffix, values);
    }},
  {id: 'party-role', label: '所选人物在队伍中',
    applies: p => ['goods-actor-select', 'service-actor-select', 'service-character-select', 'service-character-target', 'service-character-dialogue'].includes(shop(p).mode)
      || p.terminal_response?.party === 'characters' || p.terminal_response?.inventory_check || p.terminal_response?.lottery,
    construct: e => {if (!e.get(`${selectedRole(e)}.present`)) e.put(`${selectedRole(e)}.present`, 1);}},
  {id: 'party-vehicle', label: '乘坐所选战车且战车在队伍中',
    applies: p => vehicleMenu(p) || shop(p).requires_driving || shop(p).sale_entity === 'vehicle'
      || shop(p).retained_vehicle_window || p.terminal_response?.party === 'vehicles'
      || p.terminal_response?.shell_check || shop(p).repair_component_mode || shop(p).ammunition_selection,
    construct: mountSelectedVehicle},
  {id: 'rental-return', label: '所选出租战车可归还',
    applies: p => shop(p).mode === 'service-rental-return',
    construct: e => {
      if (e.vehicle < 8) {e.vehicle = 8; e.select('vehicle', 8);}
      const suffix = `active_rental_vehicle_preset.${e.vehicle - 8}`;
      if (e.get(suffix) >= 128) e.put(suffix, 8);
    }},
  {id: 'wanted-claim', label: '有已击破且尚未领赏的通缉目标',
    applies: p => shop(p).wanted_claim, codes: ['wanted-claim-scan-limit', 'wanted-claim-event-base'],
    construct: e => {
      const limit = e.codes['wanted-claim-scan-limit'], base = e.codes['wanted-claim-event-base'];
      if (limit < 2 || limit > 12 || base + limit > 256) throw new TypeError('领赏扫描超出已发布范围');
      const flag = target => `global_event_flag.${(base + target).toString(16).toUpperCase().padStart(2, '0')}`;
      if (Array.from({length: limit - 1}, (_, index) => index + 1).some(target =>
        e.get(`wanted_defeat_level_at_victory.${target}`) && !e.get(flag(target)))) return;
      const target = e.context.wanted > 0 && e.context.wanted < limit ? e.context.wanted : 1;
      e.put(`wanted_defeat_level_at_victory.${target}`, Math.max(1, e.get(`${selectedRole(e)}.level`)));
      e.put(flag(target), 0);
    }},
  {id: 'stored-item', label: '保管处有所选物品',
    applies: p => shop(p).stored_item_selection || shop(p).storage_actor_selection,
    assets: ['items'], construct: storageCondition},
  {id: 'storage-vehicle-recipient', label: '战车保管物有所选接收战车与驾驶者',
    applies: p => shop(p).storage_actor_selection,
    codes: ['storage-vehicle-item-first', 'storage-human-item-first', 'storage-vehicle-tool-first'],
    construct: e => {
      const index = e.preview.runtime_context?.stored_item_index ?? e.preview.runtime_context?.choice_index ?? 0;
      const item = Array.from({length: 64}, (_, row) => e.get(`property_storage.item.${row}`)).sort((a, b) => b - a)[index];
      if (item >= e.codes['storage-vehicle-tool-first'] || item >= e.codes['storage-vehicle-item-first']
          && item < e.codes['storage-human-item-first']) mountSelectedVehicle(e);
    }},
  {id: 'sale-item', label: '携带栏有所选物品',
    applies: p => shop(p).sale_item_bar && !shop(p).sale_item_optional,
    assets: ['items'], construct: saleCondition},
  {id: 'bar-status', label: '所选人物死亡或麻痹', applies: p => shop(p).role_status_records,
    construct: e => {
      if (!e.get(`${selectedRole(e)}.dead`) && !e.get(`${selectedRole(e)}.numb`)) setRoleStatus(e, 'numb');
    }},
  {id: 'required-status', label: '所选人物麻痹', applies: p => shop(p).required_role_status,
    construct: e => setRoleStatus(e, shop(e.preview).required_role_status)},
  {id: 'laser-empty', label: '已持有激光炮且没有可借出的镜片', applies: p => shop(p).laser_empty_result,
    codes: ['laser-carried-weapon-first', 'laser-carried-weapon-limit', 'laser-borrowed-lens-first', 'laser-borrowed-lens-limit'],
    construct: e => {
      e.put('global_event_flag.16', 1);
      const roles = SERVICE_ROLES.filter(role => e.get(`role.${role}.present`));
      if (!roles.some(role => e.get(`role.${role}.equipment`).some(item =>
        item >= e.codes['laser-carried-weapon-first'] && item < e.codes['laser-carried-weapon-limit']))) {
        e.put(`${selectedRole(e)}.present`, 1);
        const equipment = [...e.get(`${selectedRole(e)}.equipment`)];
        equipment[0] = e.codes['laser-carried-weapon-first'];
        e.put(`${selectedRole(e)}.equipment`, equipment);
      }
      for (const role of SERVICE_ROLES.filter(role => e.get(`role.${role}.present`)))
        for (const item of e.get(`role.${role}.inventory`))
          if (item >= e.codes['laser-borrowed-lens-first'] && item < e.codes['laser-borrowed-lens-limit'])
            e.put(`global_event_flag.${item.toString(16).toUpperCase()}`, 1);
    }},
  {id: 'repair-damage', label: '损坏设备数量与所选列表行满足修理阶段',
    applies: p => shop(p).repair_component_mode || hasOperation(p, 'current-repair-cost', 'current-party-repair-cost'),
    assets: ['items'], construct: repairCondition},
  {id: 'ammunition', label: '所选武器有可补给弹药且数量有效',
    applies: p => shop(p).ammunition_selection || hasOperation(p, 'current-ammunition-deficit', 'current-ammunition-input-cost'),
    codes: ['service-input-initial-amount'], assets: ['items', 'overlays'], construct: ammunitionCondition},
  {id: 'no-weapons', label: '所选战车没有携带武器',
    applies: p => shop(p).no_ammunition_components || shop(p).shell_no_weapons,
    construct: e => ammunitionParts(e).forEach(part => e.equipment(e.vehicle, part, 0))},
  {id: 'engine-denial', label: '所选战车的发动机不可改造', applies: p => shop(p).engine_eligibility_handle,
    codes: ['engine-damage-mask', ...Array.from({length: 8}, (_, index) => `engine-terminal-item-${index}`)],
    construct: e => {
      const suffix = selectedVehicle(e), terminal = Array.from({length: 8}, (_, index) => e.codes[`engine-terminal-item-${index}`]);
      if (e.get(`${suffix}.equipped.engine`) && !(e.get(`${suffix}.equipment_state.engine`) & e.codes['engine-damage-mask'])
          && !terminal.includes(e.get(`${suffix}.equipment.engine`))) e.equipped(e.vehicle, 'engine', 0);
    }},
  {id: 'engine-upgrade', label: '所选战车装有可改造的完好发动机',
    applies: p => hasOperation(p, 'current-engine-upgrade-price'), assets: ['items'],
    construct: e => {
      const suffix = selectedVehicle(e), id = e.get(`${suffix}.equipment.engine`);
      if (!e.items.records.some(item => item.id === id && item.category?.id === 'tank-engine'
        && ![0x7B, 0x7E, 0x81, 0x84, 0x87, 0x8A, 0x8D, 0x90].includes(id)))
        e.equipment(e.vehicle, 'engine', e.item(item => item.category?.id === 'tank-engine'
          && ![0x7B, 0x7E, 0x81, 0x84, 0x87, 0x8A, 0x8D, 0x90].includes(item.id)));
      e.state(e.vehicle, 'engine', e.get(`${suffix}.equipment_state.engine`) & 0x3F);
      e.equipped(e.vehicle, 'engine', 1);
    }},
  {id: 'wash-items', label: '队伍战车没有携带特殊清洗物品', applies: p => shop(p).wash_result,
    codes: ['wash-wax-item', 'wash-lead-item'],
    construct: e => {
      for (const vehicle of e.partyVehicles()) for (let index = 0; index < 8; index++)
        if ([e.codes['wash-wax-item'], e.codes['wash-lead-item']].includes(e.get(`vehicle.${vehicle}.item.${index}`)))
          e.put(`vehicle.${vehicle}.item.${index}`, 0);
    }},
  {id: 'shell-sale', label: '有所选炮弹且出售数量有效', applies: p => shop(p).shell_sale_quote || shop(p).shell_quantity_input,
    assets: ['shells'], construct: e => {
      const index = e.preview.runtime_context?.shell_index ?? 0, suffix = selectedVehicle(e);
      const type = e.get(`${suffix}.shell_type.${index}`);
      if (!e.shells.records.some(row => row.id === type && row.price?.available)) {
        const shell = e.shells.records.find(row => row.price?.available);
        if (!shell) throw new TypeError('服务临时条件缺少可出售炮弹');
        e.put(`${suffix}.shell_type.${index}`, shell.id);
      }
      if (e.get(`${suffix}.shell_count.${index}`) < 1) e.put(`${suffix}.shell_count.${index}`, 1);
      const amount = e.context.service_amount ?? (shop(e.preview).shell_quantity_input ? 0 : 1);
      if (amount < (shop(e.preview).shell_quantity_input ? 0 : 1) || amount > e.get(`${suffix}.shell_count.${index}`)) e.select('service_amount', 1);
    }},
  {id: 'shell-space', label: '炮弹仓有空余且购买数量有效', applies: p => shop(p).shell_purchase_input || shop(p).shell_purchase_quote,
    construct: e => {
      const suffix = selectedVehicle(e), used = Array.from({length: 6}, (_, index) => e.get(`${suffix}.shell_count.${index}`)).reduce((a, b) => a + b, 0);
      if (used >= e.get(`${suffix}.ammo_capacity`)) {
        for (let index = 0; index < 6; index++) e.put(`${suffix}.shell_count.${index}`, 0);
        if (!e.get(`${suffix}.ammo_capacity`)) e.put(`${suffix}.ammo_capacity`, 1);
      }
      const remaining = e.get(`${suffix}.ammo_capacity`) - Array.from({length: 6}, (_, index) => e.get(`${suffix}.shell_count.${index}`)).reduce((a, b) => a + b, 0);
      if ((e.context.service_amount ?? 0) > remaining || (e.context.service_amount ?? 0) < 0) e.select('service_amount', 0);
    }},
  {id: 'armor-input', label: '装甲补给数量在载重量差内', applies: p => hasOperation(p, 'current-armor-input-cost'),
    codes: ['service-input-initial-amount'], runtimeCodes: ['armor-equipment-item-limit'], assets: ['items'],
    construct: e => {
      const suffix = selectedVehicle(e), limit = e.codes['armor-equipment-item-limit'];
      const equipmentWeight = () => SERVICE_PARTS.reduce((total, part) => {
        const id = e.get(`${suffix}.equipment.${part}`);
        return total + (id > 0 && id < limit ? e.items.records.find(item => item.id === id)?.tank_weight?.internal_units ?? 0 : 0);
      }, 0);
      let engine = e.items.records.find(item => item.id === e.get(`${suffix}.equipment.engine`));
      let capacity = e.get(`${suffix}.equipped.engine`) ? engine?.engine_capacity?.internal_units ?? 0 : 0;
      let remaining = Math.max(0, capacity - ((e.get(`${suffix}.chassis_weight`) + e.get(`${suffix}.sp`) + equipmentWeight()) & 0xFFFF));
      if (!remaining) {
        engine = e.items.records.find(item => item.category?.id === 'tank-engine' && item.engine_capacity?.internal_units > 0);
        if (!engine) throw new TypeError('服务临时条件缺少可承载发动机');
        e.equipment(e.vehicle, 'engine', engine.id);
        e.equipped(e.vehicle, 'engine', 1);
        e.put(`${suffix}.sp`, 0);
        e.put(`${suffix}.chassis_weight`, 0);
        for (const part of SERVICE_PARTS.filter(part => part !== 'engine')) e.equipment(e.vehicle, part, 0);
        capacity = engine.engine_capacity.internal_units;
        remaining = capacity - equipmentWeight();
      }
      const amount = e.context.service_amount ?? e.codes['service-input-initial-amount'];
      if (amount < 1 || amount > remaining) e.select('service_amount', 1);
    }},
  {id: 'chassis-overweight', label: '底盘改造后超重', applies: p => hasOperation(p, 'current-chassis-upgrade-deficit'),
    assets: ['items'], runtimeCodes: ['armor-equipment-item-limit',
      ...Array.from({length: 5}, (_, index) => `chassis-upgrade-weight-${index}`)],
    construct: e => {
      const suffix = selectedVehicle(e), kind = shop(e.preview).chassis_upgrade;
      const increase = e.codes[`chassis-upgrade-weight-${kind === 2 ? e.preview.runtime_context?.list_choice_index ?? 0 : kind + 3}`];
      const id = e.get(`${suffix}.equipment.engine`), engine = e.items.records.find(item => item.id === id);
      const capacity = e.get(`${suffix}.equipped.engine`) ? engine?.engine_capacity?.internal_units ?? 0 : 0;
      const weight = SERVICE_PARTS.reduce((sum, part) => {
        const item = e.get(`${suffix}.equipment.${part}`);
        return sum + (item > 0 && item < e.codes['armor-equipment-item-limit']
          ? e.items.records.find(row => row.id === item)?.tank_weight?.internal_units ?? 0 : 0);
      }, e.get(`${suffix}.chassis_weight`) + ((e.get(`${suffix}.sp`) + increase) & 0xFFFF)) & 0xFFFF;
      if (capacity >= weight) e.equipped(e.vehicle, 'engine', 0);
    }},
  {id: 'lottery-win', label: '抽奖结果为中奖', applies: p => p.terminal_response?.lottery && p.terminal_response.lottery.stage > 0,
    construct: e => e.random('lotteryResult', 'win')},
  {id: 'lottery-full', label: '中奖人物的携带栏已满', applies: p => p.terminal_response?.lottery?.stage === 3,
    assets: ['items'], construct: e => {
      const values = [...e.get(`${selectedRole(e)}.inventory`)];
      const item = e.item(row => row.id > 0 && row.category?.id === 'human-item');
      e.put(`${selectedRole(e)}.inventory`, values.map(value => value || item));
    }},
  {id: 'insufficient-money', label: '金额不足', applies: p => named(p, /insufficient-funds|vehicle-trade-insufficient/u)
      || p.terminal_response && /^application-dialogue-flow:(1B:segment:11|1C:segment:15|1D:segment:10):action:00$/u.test(p.terminal_response.source || ''),
    construct: e => e.put('gold', 0)},
];

function servicePreviewConditions(preview) {
  return SERVICE_PREVIEW_CONDITIONS.filter(condition => condition.applies(preview));
}

export function servicePreviewConditionSources(preview, previews) {
  const result = [], seen = new Set();
  const visit = source => {
    if (!source || seen.has(source.id)) return;
    seen.add(source.id);
    const calls = source.glyph_cache_entry ? fieldGlyphEntryCalls(source.glyph_cache_entry,
      preview.runtime_context?.glyph_entry_path) : [];
    for (const call of calls) {
      const stage = previews.find(row => call.preview_id ? row.id === call.preview_id : row.interface_state === call.interface_state);
      if (stage?.shop_menu) visit({...stage,
        runtime_context: {...stage.runtime_context, save_slot: source.runtime_context?.save_slot,
          shop_instance: source.runtime_context?.shop_instance ?? 0,
          shop_item_index: source.runtime_context?.shop_item_index ?? 0},
        shop_menu: {...stage.shop_menu,
        ...(call.sale_item_bar ? {sale_item_bar: call.sale_item_bar} : {}),
        ...(call.shop_welcome_slot !== undefined ? {mode: 'reception'} : {})}});
    }
    const retained = source.shop_menu?.retained_preview_id;
    if (retained) {
      const previous = previews.find(row => row.id === retained);
      if (previous) visit({...previous, runtime_context: {...previous.runtime_context, ...source.runtime_context}});
    }
    const conditions = servicePreviewConditions(source);
    if (conditions.length) result.push({preview: source, conditions});
  };
  visit(preview);
  return result;
}
