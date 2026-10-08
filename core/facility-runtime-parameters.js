// @editor-module 设施正文按已发布公式读取当前字段值。
import {currentActorNameSource} from "./text-record-project.js";
import {runtimeWeightScript} from './runtime-weight-text.js';
import {currentVehicleEquipmentLoad} from './vehicle-equipment-load.js';

function currentFieldPartyCount(saveFields, saveSlot) {
  const read = suffix => saveFields?.find(field =>
    field.fieldId === `save.slot.${saveSlot}.${suffix}` && field.status === 'exact')?.value;
  const present = ['hunter', 'mechanic', 'soldier'].map(role => read(`role.${role}.present`));
  const entities = read('entity_scene_object_slots');
  if (present.some(value => typeof value !== 'boolean'
      && (!Number.isInteger(value) || value < 0 || value > 255))
      || !(Array.isArray(entities) || entities instanceof Uint8Array)
      || entities.length !== 10 || !Number.isInteger(entities[3])) return null;
  return present.filter(Boolean).length + Number(entities[3] < 128);
}

function facilityRuntimeParameter(binding, {items, wanted, overlays, statusWords, saveFields, codeValues = {}, invocation = {}} = {}) {
  const source = binding?.value_source;
  const unavailable = reason => ({status: "unavailable", reason});
  if (binding?.callback_pointer_gaps?.length)
    return unavailable(binding.callback_pointer_gaps.map(gap => gap.reason).join("；"));
  if (!source || binding.confirmation_status !== "confirmed")
    return unavailable(binding?.unresolved_source?.reason || "该插入尚缺参数写入链与调用状态绑定");
  const saveValue = suffix => {
    const field = saveFields?.find(field => field.fieldId === `save.slot.${invocation.saveSlot}.${suffix}`);
    return field?.status === 'exact' && Number.isInteger(field.value) ? field.value : null;
  };
  const repairState = suffix => {
    const value = saveValue(suffix);
    if (value !== null) return value;
    const field = saveFields?.find(field => field.fieldId === `save.slot.${invocation.saveSlot}.${suffix}`);
    return source.state_mask === 0xC0 && field?.status === 'partial'
      && /^vehicle\.\d+\.equipment_state\.generic_[78]$/.test(suffix)
      && Number.isInteger(field.value) && field.value >= 0 && field.value <= 255
      ? field.value & source.state_mask : null;
  };
  const partyCount = () => currentFieldPartyCount(saveFields, invocation.saveSlot);
  if (source.operation === 'school-reset-name-buffer') {
    const raw = invocation.runtimeNameBuffer;
    if (raw !== undefined && raw !== '') {
      if (typeof raw !== 'string' || !/^[0-9a-f]{2}(?:\s+[0-9a-f]{2})*$/iu.test(raw.trim()))
        return unavailable('姓名缓冲区须为十六进制字节');
      const bytes = raw.trim().split(/\s+/u).map(value => parseInt(value, 16));
      const end = bytes.indexOf(0x9F);
      if (end < 0) return unavailable('姓名缓冲区缺少 9F 终止符');
      const value = bytes.slice(0, end + 1);
      return {status: 'available', value: {raw_hex: value.map(byte => byte.toString(16).padStart(2, '0')).join(' '),
        length: value.length, terminator: 0x9F}};
    }
    const roles = ['hunter', 'mechanic', 'soldier'].filter(role => saveFields?.find(field =>
      field.fieldId === `save.slot.${invocation.saveSlot}.role.${role}.present`
      && field.status === 'exact')?.value);
    const role = roles.at(-1);
    const statusField = role && saveFields?.find(field =>
      field.fieldId === `save.slot.${invocation.saveSlot}.role.${role}.status`);
    const status = ['exact', 'partial'].includes(statusField?.status) ? statusField.value : null;
    if (!Number.isInteger(status)) return unavailable('复位入口缺少队伍状态缓冲区');
    const word = status === 0xFF ? 8 : status ? 1 + Math.floor(Math.log2(status)) : 0;
    const slot = statusWords?.slots?.[`ui-status:${word.toString(16).toUpperCase().padStart(2, '0')}`];
    if (!slot) return unavailable('队伍状态文字缺少所属字段');
    return {status: 'available', value: {raw_hex: [...Array(source.reset_prefix_length).fill('00'),
      slot.raw_hex, '9F'].join(' '), length: source.reset_prefix_length + slot.length + 1, terminator: 0x9F}};
  }
  if (source.operation === 'current-service-amount')
    return Number.isInteger(invocation.amount) && invocation.amount >= 0 && invocation.amount <= 9999999
      ? {status: 'available', value: invocation.amount} : unavailable('服务正文缺少当前输入数量或金额');
  if (['current-ammunition-deficit', 'current-ammunition-deficit-cost', 'current-party-ammunition-cost',
    'current-ammunition-input-cost'].includes(source.operation)) {
    const parts = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'];
    const deficit = (vehicle, part) => {
      const path = `vehicle.${vehicle}`, id = saveValue(`${path}.equipment.${part}`);
      const item = items?.records?.find(row => row.id === id);
      const field = saveFields?.find(field => field.fieldId === `save.slot.${invocation.saveSlot}.${path}.equipment_state.${part}`);
      if (!item || id >= 0x65 || !Number.isInteger(item.equipment?.raw_flags)
          || !['exact', 'partial'].includes(field?.status) || !Number.isInteger(field.value)
          || field.status === 'partial' && !['generic_7', 'generic_8'].includes(part)) return null;
      const code = item.equipment.raw_flags & 7;
      const capacity = code === 7 ? overlays?.zero_prefixed_ascending_bit_masks?.[0]
        : overlays?.level_value_codebook?.[code];
      const unit = id < 0x55 ? codeValues['equipment-quantity-unit-price']
        : item.price?.available && Number.isSafeInteger(item.price.value) ? Math.floor(item.price.value / 16) : null;
      if (!Number.isInteger(capacity) || !Number.isSafeInteger(unit) || unit < 0) return null;
      const quantity = (capacity - (field.value & 0x3F)) & 255;
      return {quantity, unit, cost: (quantity * unit) % 0x1000000};
    };
    if (source.operation !== 'current-party-ammunition-cost') {
      if (!Number.isInteger(invocation.vehicle) || invocation.vehicle < 0 || invocation.vehicle > 10
          || !parts.includes(invocation.part)) return unavailable('弹药补给缺少当前战车与武器选择');
      const result = deficit(invocation.vehicle, invocation.part);
      if (source.operation === 'current-ammunition-input-cost')
        return result && Number.isInteger(invocation.amount) && invocation.amount > 0
          && invocation.amount <= result.quantity ? {status: 'available', value:
            (invocation.amount * result.unit) % 0x1000000} : unavailable('当前弹药输入须在所选武器的补给数量内');
      return result && result.quantity ? {status: 'available', value:
        source.operation === 'current-ammunition-deficit' ? result.quantity : result.cost}
        : unavailable('所选武器没有已确认的非零补给数量');
    }
    const entities = saveFields?.find(field => field.fieldId ===
      `save.slot.${invocation.saveSlot}.entity_scene_object_slots` && field.status === 'exact')?.value;
    if (!(Array.isArray(entities) || entities instanceof Uint8Array) || entities.length !== 10)
      return unavailable('全部弹药补给缺少当前编队');
    let total = 0;
    for (const vehicle of entities.slice(0, 4)) {
      if (vehicle >= 128) continue;
      if (vehicle > 10) return unavailable('全部弹药补给缺少已确认的战车位');
      for (const part of parts) {
        const id = saveValue(`vehicle.${vehicle}.equipment.${part}`);
        if (id === null) return unavailable('全部弹药补给缺少当前设备字段');
        if (!id || id >= 0x65) continue;
        const result = deficit(vehicle, part);
        if (!result) return unavailable('全部弹药补给缺少弹数码表、状态低六位或当前价格');
        total = (total + result.cost) % 0x1000000;
      }
    }
    return {status: 'available', value: total};
  }
  if (source.operation === 'current-chassis-upgrade-deficit') {
    const vehicle = invocation.vehicle, kind = invocation.upgradeKind, part = invocation.upgradePart;
    if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10 || ![0, 1, 2].includes(kind)
        || kind === 2 && ![0, 1, 2].includes(part))
      return unavailable('超重提示缺少战车、改造项目与孔位选择');
    const index = kind === 2 ? part : kind + 3;
    const increase = codeValues[`chassis-upgrade-weight-${index}`];
    const limit = codeValues['armor-equipment-item-limit'];
    const path = `vehicle.${vehicle}`, chassis = saveValue(`${path}.chassis_weight`);
    const sp = saveValue(`${path}.sp`), equipped = saveValue(`${path}.equipped.engine`);
    if (!Number.isInteger(increase) || increase < 0 || increase > 255
        || !Number.isInteger(limit) || limit < 1 || limit > 255
        || [chassis, sp, equipped].some(value => value === null))
      return unavailable('超重提示缺少当前底盘、装甲、引擎或改造重量代码字段');
    const load = currentVehicleEquipmentLoad({read: suffix => saveValue(`${path}.${suffix}`),
      items: items?.records || [], extra: increase, limit});
    if (!load) return unavailable('超重提示缺少当前设备重量或引擎容量');
    const {weight, capacity} = load;
    if (capacity >= weight)
      return unavailable('当前战车没有进入已确认的超重分支');
    const deficit = capacity ? weight - capacity : increase;
    return {status: 'available', value: {raw_hex: runtimeWeightScript(deficit, {overflow: true}),
      length: 7, terminator: 0x9F, padding: 0xFF}, internal_units: deficit};
  }
  if (['current-party-armor-cost', 'current-vehicle-armor-deficit', 'current-armor-input-cost'].includes(source.operation)) {
    const single = source.operation !== 'current-party-armor-cost';
    const entities = single ? [invocation.vehicle, 255, 255, 255, 255, 255, 255, 255, 255, 255]
      : saveFields?.find(field => field.fieldId ===
        `save.slot.${invocation.saveSlot}.entity_scene_object_slots` && field.status === 'exact')?.value;
    const bias = codeValues['armor-price-rounding-bias'], divisor = codeValues['armor-price-divisor'];
    const limit = codeValues['armor-equipment-item-limit'];
    if (!(Array.isArray(entities) || entities instanceof Uint8Array) || entities.length !== 10
        || ![bias, divisor, limit].every(value => Number.isInteger(value) && value >= 0 && value <= 255)
        || !divisor) return unavailable('装甲补给费用缺少当前编队或所属代码参数');
    let total = 0;
    for (const vehicle of entities.slice(0, 4)) {
      if (vehicle >= 128) continue;
      if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10)
        return unavailable('装甲补给费用缺少已确认的战车位');
      const path = `vehicle.${vehicle}`, chassis = saveValue(`${path}.chassis_weight`);
      const sp = saveValue(`${path}.sp`), equipped = saveValue(`${path}.equipped.engine`);
      if ([chassis, sp, equipped].some(value => value === null))
        return unavailable('装甲补给费用缺少当前底盘及装甲和引擎装载字段');
      let weight = (chassis + sp) & 0xFFFF, engine;
      for (const part of ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8']) {
        const id = saveValue(`${path}.equipment.${part}`);
        if (id === null) return unavailable('装甲补给费用缺少当前设备字段');
        const item = items?.records?.find(row => row.id === id);
        if (part === 'engine') engine = item;
        if (!id || id >= limit) continue;
        const units = item?.tank_weight?.internal_units;
        if (!Number.isInteger(units) || units < 0) return unavailable('装甲补给费用缺少当前设备重量');
        weight = (weight + units) & 0xFFFF;
      }
      const capacity = equipped ? engine?.engine_capacity?.internal_units : 0;
      if (!Number.isInteger(capacity) || capacity < 0 || capacity > 0xFFFF)
        return unavailable('装甲补给费用缺少当前引擎容量');
      const missing = Math.max(0, capacity - weight);
      if (source.operation === 'current-vehicle-armor-deficit') return {status: 'available', value: missing};
      if (source.operation === 'current-armor-input-cost')
        return Number.isInteger(invocation.amount) && invocation.amount > 0 && invocation.amount <= missing
          ? {status: 'available', value: Math.floor(((invocation.amount + bias) & 0xFFFF) / divisor)}
          : unavailable('当前装甲输入须在所选战车的载重量差内');
      total = (total + Math.floor(((missing + bias) & 0xFFFF) / divisor)) % 0x1000000;
    }
    return {status: 'available', value: total};
  }
  if (source.operation === 'current-chassis-ammo-capacity') {
    const vehicle = invocation.vehicle;
    if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10)
      return unavailable('弹仓结果缺少所选战车位');
    const value = saveValue(`vehicle.${vehicle}.ammo_capacity`);
    return Number.isInteger(value) && value >= 0 && value <= 255
      ? {status: 'available', value} : unavailable('弹仓结果缺少当前精确容量字段');
  }
  if (source.operation === 'current-party-repair-cost') {
    const entities = saveFields?.find(field => field.fieldId ===
      `save.slot.${invocation.saveSlot}.entity_scene_object_slots` && field.status === 'exact')?.value;
    if (!(Array.isArray(entities) || entities instanceof Uint8Array) || entities.length !== 10)
      return unavailable('全部修理费用缺少当前编队字段');
    let total = 0;
    for (const vehicle of entities.slice(0, 4)) {
      if (vehicle >= 128) continue;
      if (vehicle > 10) return unavailable('全部修理费用缺少已确认的战车位');
      for (const part of ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8']) {
        const item = saveValue(`vehicle.${vehicle}.equipment.${part}`);
        if (item === null) return unavailable('全部修理费用缺少精确设备字段');
        if (!item) continue;
        const condition = repairState(`vehicle.${vehicle}.equipment_state.${part}`);
        if (condition === null) return unavailable('全部修理费用缺少精确设备字段');
        if (!(condition & 0xC0)) continue;
        const cost = facilityRuntimeParameter({...binding, value_source: {
          ...source, operation: 'current-repair-cost'}}, {items, saveFields, codeValues,
          invocation: {...invocation, vehicle, part}});
        if (cost.status !== 'available') return cost;
        total = (total + cost.value) % 0x1000000;
      }
    }
    return {status: 'available', value: total};
  }
  if (source.operation === 'current-party-count') {
    const count = partyCount();
    return count === null ? unavailable('队伍数量缺少精确存档字段') : {status: 'available', value: count};
  }
  if (source.operation === 'current-inn-cost') {
    const count = partyCount(), name = invocation.configuredName;
    const raw = codeValues[`inn-price-${name}`];
    const price = items?.equipment_editor?.numeric_codes?.find(row => row.raw_code === raw);
    if (count === null || ![37, 38, 39].includes(name) || !price?.available
        || !Number.isSafeInteger(price.value)) return unavailable('旅馆费用缺少队伍数量、配置名称或当前价格码字段');
    return {status: 'available', value: (count * (price.value & 0xFFFF)) & 0xFFFF};
  }
  if (['current-chassis-capacity-cost', 'current-chassis-weight-cost'].includes(source.operation)) {
    const vehicle = invocation.vehicle;
    if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10)
      return unavailable('底盘改造缺少所选战车位');
    if (source.operation === 'current-chassis-capacity-cost') {
      const word = items?.equipment_editor?.numeric_codes?.find(row => row.raw_code === 0xE0 + vehicle);
      return word?.available && Number.isSafeInteger(word.value) && word.value % 10 === 0
        ? {status: 'available', value: Math.floor(word.value / 80)}
        : unavailable('承重改造缺少所选战车的当前共享字表字段');
    }
    const defense = saveValue(`vehicle.${vehicle}.defense`);
    if (!Number.isInteger(defense) || defense < 0 || defense >= 1000)
      return unavailable('当前底盘守备力超出已确认的十项费用码表范围');
    const code = codeValues[`chassis-weight-price-${Math.floor(defense / 100)}`];
    const price = items?.equipment_editor?.numeric_codes?.find(row => row.raw_code === code);
    return price?.available && Number.isSafeInteger(price.value)
      ? {status: 'available', value: price.value} : unavailable('底盘守备力改造缺少当前费用码字段');
  }
  if (['current-equipment-name', 'current-repair-cost', 'current-engine-upgrade-price',
    'current-equipment-quantity', 'current-equipment-quantity-cost'].includes(source.operation)) {
    const vehicle = invocation.vehicle, part = source.part ?? invocation.part;
    if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10
        || !['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'].includes(part))
      return unavailable('设备参数缺少战车位与设备列的选择状态');
    const path = `vehicle.${vehicle}`, itemId = saveValue(`${path}.equipment.${part}`);
    const item = items?.records?.find(row => row.id === itemId);
    if (!item || !Number.isInteger(itemId) || itemId < 0 || itemId > 0xDD)
      return unavailable('所选设备缺少精确物品字段');
    if (source.operation === 'current-equipment-name') return {status: 'available', value: {
      resource_id: 'text-record', node_id: `record:00:${String(itemId).padStart(3, '0')}`}};
    if (['current-equipment-quantity', 'current-equipment-quantity-cost'].includes(source.operation)) {
      const quantity = invocation.quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 255)
        return unavailable('数量参数缺少已接受的非零字节输入阶段');
      if (source.operation === 'current-equipment-quantity') return {status: 'available', value: quantity};
      const unit = itemId < 0x55 ? codeValues['equipment-quantity-unit-price']
        : item.price?.available && Number.isSafeInteger(item.price.value) ? Math.floor(item.price.value / 16) : null;
      return Number.isSafeInteger(unit) && unit >= 0
        ? {status: 'available', value: (unit * quantity) % 0x1000000}
        : unavailable('数量费用缺少当前设备价格或单价代码字段');
    }
    const condition = source.operation === 'current-repair-cost'
      ? repairState(`${path}.equipment_state.${part}`) : saveValue(`${path}.equipment_state.${part}`);
    if (!Number.isInteger(condition) || condition < 0 || condition > 255)
      return unavailable('所选设备缺少精确状态字段');
    if (source.operation === 'current-repair-cost') {
      const damage = (condition >> 7) + ((condition >> 6) & 1);
      if (!damage) return unavailable('所选设备不在损坏设备选择域内');
      if (damage === 1) {
        const price = codeValues['minor-repair-price'];
        return Number.isInteger(price) && price >= 0 && price <= 255
          ? {status: 'available', value: price} : unavailable('轻度修理费用缺少代码字段');
      }
      return item.price?.available && Number.isSafeInteger(item.price.value)
        ? {status: 'available', value: Math.floor(item.price.value / 4)}
        : unavailable('所选设备的当前价格码不可用');
    }
    if (saveValue(`${path}.equipped.engine`) !== 1 || (condition & 0xC0)
        || item.category?.id !== 'tank-engine' || [0x7B, 0x7E, 0x81, 0x84, 0x87, 0x8A, 0x8D, 0x90].includes(itemId))
      return unavailable('当前引擎不在可改造选择域内');
    const next = items.records.find(row => row.id === itemId + 1);
    if (!item.price?.available || !next?.price?.available
        || ![item.price.value, next.price.value].every(Number.isSafeInteger))
      return unavailable('引擎改造缺少当前与下一物品价格字段');
    return {status: 'available', value: (next.price.value - item.price.value + 0x1000000) % 0x1000000};
  }
  if (source.operation === "current-hunter-name") {
    return currentActorNameSource({saveSlot: invocation.saveSlot,
      actor: {kind: "role", id: 0}, fieldObjects: saveFields});
  }
  if (source.operation === 'current-last-party-vehicle-name') {
    const vehicles = saveFields?.find(field => field.fieldId ===
      `save.slot.${invocation.saveSlot}.entity_scene_object_slots` && field.status === 'exact')?.value;
    if (!(Array.isArray(vehicles) || vehicles instanceof Uint8Array) || vehicles.length !== 10)
      return unavailable('姓名承接缺少当前队列战车位');
    const vehicle = [...vehicles.slice(0, 4)].filter(id => id < 128).at(-1);
    return currentActorNameSource({saveSlot: invocation.saveSlot,
      actor: {kind: 'vehicle', id: vehicle}, fieldObjects: saveFields});
  }
  if (["current-role-name", "current-vehicle-name"].includes(source.operation)) {
    return currentActorNameSource({saveSlot: invocation.saveSlot,
      actor: {kind: source.operation === "current-role-name" ? "role" : "vehicle",
        id: invocation[source.selection]}, fieldObjects: saveFields});
  }
  if (source.operation === "current-shop-actor-name") {
    const index = invocation[source.selection], kind = invocation[source.selection_kind];
    if (!Number.isInteger(index) || index < 0 || index > 5
        || !Number.isInteger(kind) || kind < 0 || kind > 255)
      return unavailable("姓名写入缺少选择行与实体类别的调用状态");
    const role = Math.floor(index / 2);
    if (kind !== 0) return currentActorNameSource({saveSlot: invocation.saveSlot,
      actor: {kind: "role", id: role}, fieldObjects: saveFields});
    const matches = saveFields?.filter(field => field.fieldId.endsWith(".current_vehicle")
      && field.binding.slot === invocation.saveSlot && field.binding.role === role);
    const field = matches?.length === 1 ? matches[0] : null;
    if (field?.status !== "exact" || !Number.isInteger(field.value)
        || field.value < 0 || field.value > 10)
      return unavailable("所选角色缺少当前战车位的精确存档字段");
    return {...currentActorNameSource({saveSlot: invocation.saveSlot,
      actor: {kind: "vehicle", id: field.value}, fieldObjects: saveFields}),
      selection_field_id: field.fieldId};
  }
  const selected = invocation[source.selection];
  if (source.operation === "current-text-record") {
    if (!Number.isInteger(selected) || selected < source.input_domain.min
        || selected > source.input_domain.max)
      return unavailable("正文名称缺少已确认范围内的选择状态");
    if (source.activation_flag_base !== undefined) {
      if (saveValue(`teleport_destination.${selected}.unlocked`) !== 1)
        return unavailable('所选传送地点缺少已激活的当前事件位');
    }
    const record = selected + (source.selection_offset || 0);
    return {status: "available", value: {resource_id: "text-record",
      node_id: `record:${source.region.toString(16).toUpperCase().padStart(2, "0")}:${record.toString().padStart(3, "0")}`}};
  }
  if (["current-wanted-name", "current-wanted-bounty"].includes(source.operation)) {
    if (!Number.isInteger(selected) || selected < 1 || selected > 11)
      return unavailable("该分支缺少所选通缉目标的调用状态");
    if (source.operation === "current-wanted-name") return {status: "available",
      value: {resource_id: "text-record",
        node_id: `record:01:${selected.toString().padStart(3, "0")}`}};
    const row = wanted?.bounty_codes?.find(row => row.wanted_id === selected);
    const value = items?.equipment_editor?.numeric_codes?.find(code => code.raw_code === row?.raw_code);
    if (!row || !value?.available || !Number.isSafeInteger(value.value))
      return unavailable("通缉目标的当前赏金码或共享数值表不可用");
    return {status: "available", value: value.value};
  }
  if (!Number.isInteger(selected) || selected < 0 || selected > 0xDD)
    return unavailable("该分支缺少所选物品的调用状态");
  const item = items?.records?.find(row => row.id === selected);
  if (!item) return unavailable("所选物品的当前字段对象不可用");
  if (source.operation === "current-item-name") return {status: "available",
    value: {resource_id: "text-record",
      node_id: `record:00:${selected.toString().padStart(3, "0")}`}};
  if (!["current-item-price", "half-current-item-price", "quarter-current-item-price"].includes(source.operation))
    return unavailable("该参数公式尚无执行定义");
  if (!item.price?.available || !Number.isSafeInteger(item.price.value))
    return unavailable("所选物品的当前价格码不可用");
  if (source.operation === "quarter-current-item-price"
      && (!Number.isInteger(item.price.raw_code) || item.price.raw_code >= 0xE0))
    return unavailable("该物品价格码不属于收购分支接受的范围");
  const divisor = source.operation === "quarter-current-item-price" ? 4
    : source.operation === "half-current-item-price" ? 2 : 1;
  return {status: "available", value: Math.floor(item.price.value / divisor)};
}

export function resolveFacilityParameterBindings(bindings, inputs) {
  return (bindings || []).map(binding => ({binding,
    ...facilityRuntimeParameter(binding, inputs)}));
}
