// @editor-module 服务临时状态只属于单次预览，不修改存档字段。

export const SERVICE_ROLES = ['hunter', 'mechanic', 'soldier'];
export const SERVICE_PARTS = ['main_gun', 'sub_gun', 'special', 'c_unit', 'engine', 'chassis', 'generic_7', 'generic_8'];

export function servicePreviewContext(preview, context) {
  return {...context, ...preview.service_preview_state?.selection};
}

export function servicePreviewTerminalState(preview, context) {
  return {...context, ...preview.service_preview_state?.terminal};
}

export function servicePreviewFields(preview, fields) {
  const values = preview.service_preview_state?.values;
  if (!values || !Object.keys(values).length) return fields;
  const object = id => {
    const source = fields.object(id);
    if (!Object.hasOwn(values, id)) return source;
    const descriptors = Object.getOwnPropertyDescriptors(source);
    for (const key of ['set', 'reset', 'mount', 'setNameText']) delete descriptors[key];
    descriptors.value = {value: values[id], enumerable: true};
    return Object.freeze(Object.create(null, descriptors));
  };
  return Object.freeze({object, find: id => fields.find(id) ? object(id) : null,
    all: prefix => fields.all(prefix).map(field => object(field.fieldId)),
    slotStatus: slot => preview.service_preview_state?.slotStatus?.[slot] || fields.slotStatus(slot),
    vehicleAcquired: (slot, vehicle) => {
      const id = vehicle < 8 ? `save.slot.${slot}.global_event_flag.${(vehicle + 8).toString(16).toUpperCase().padStart(2, '0')}`
        : `save.slot.${slot}.active_rental_vehicle_preset.${vehicle - 8}`;
      if (!Object.hasOwn(values, id)) return fields.vehicleAcquired(slot, vehicle);
      if (vehicle < 8) return Boolean(object(id).value);
      const rental = object(id).value;
      return Number.isInteger(rental) && rental >= 8 && rental <= 17;
    }});
}

export function inheritServicePreviewState(preview, parent) {
  return parent.service_preview_state ? {...preview, service_preview_state: parent.service_preview_state} : preview;
}

function serviceConditionEnvironment(preview, {fields, context, terminal = {}, codes = {}, items = null, shells = null}) {
  const temporary = {values: {}, selection: {}, terminal: {}, conditions: []};
  const slot = preview.runtime_context?.save_slot ?? context.slot;
  const normalized = value => ArrayBuffer.isView(value) ? [...value] : value;
  const equal = (left, right) => JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
  const env = {preview, context, terminal, codes, items, shells, temporary,
    prefix: `save.slot.${slot}.`, role: SERVICE_ROLES[context.role] || SERVICE_ROLES[0],
    vehicle: context.vehicle >= 0 && context.vehicle <= 10 ? context.vehicle : 0,
    get: suffix => {
      const id = env.prefix + suffix;
      return Object.hasOwn(temporary.values, id) ? temporary.values[id] : fields.object(id).value;
    },
    put: (suffix, value) => {
      if (!equal(env.get(suffix), value)) temporary.values[env.prefix + suffix] = structuredClone(value);
    },
    select: (key, value) => {
      if (!equal(temporary.selection[key] ?? context[key], value)) temporary.selection[key] = value;
    },
    random: (key, value) => {
      if (!equal(temporary.terminal[key] ?? terminal[key], value)) temporary.terminal[key] = value;
    },
    item: predicate => {
      const item = items?.records?.find(predicate);
      if (!item) throw new TypeError('服务临时条件缺少对应物品');
      return item.id;
    },
    partyVehicles: () => [...env.get('entity_scene_object_slots').slice(0, 4)].filter(value => value < 128),
    equipment: (vehicle, part, id) => env.put(`vehicle.${vehicle}.equipment.${part}`, id),
    state: (vehicle, part, value) => env.put(`vehicle.${vehicle}.equipment_state.${part}`, value),
    equipped: (vehicle, part, value) => {
      env.put(`vehicle.${vehicle}.equipped.${part}`, value);
      const bit = 128 >> SERVICE_PARTS.indexOf(part);
      const mask = env.get(`vehicle.${vehicle}.equipped_mask_raw`);
      env.put(`vehicle.${vehicle}.equipped_mask_raw`, value ? mask | bit : mask & ~bit);
    },
    roleStatus: (role, key) => {
      const suffix = `role.${role}.${key}`, binding = fields.object(env.prefix + suffix).binding;
      if (env.get(suffix)) return;
      env.put(suffix, 1);
      const parent = binding.status_parent_field?.slice(env.prefix.length);
      if (parent) {
        const raw = env.get(parent);
        env.put(parent, binding.encoding === 'marker' ? binding.marker_value
          : (raw === binding.excluded_raw_value ? 0 : raw) | binding.bit_mask);
        if (key === 'numb') env.put(`role.${role}.dead`, 0);
      }
    },
  };
  return env;
}

export function constructServicePreviewState(preview, dependencies, conditions) {
  const env = serviceConditionEnvironment(preview, dependencies);
  for (const condition of conditions) {
    const before = JSON.stringify([env.temporary.values, env.temporary.selection, env.temporary.terminal]);
    condition.construct(env);
    if (before !== JSON.stringify([env.temporary.values, env.temporary.selection, env.temporary.terminal])
        && !env.temporary.conditions.some(row => row.id === condition.id))
      env.temporary.conditions.push({id: condition.id, label: condition.label});
  }
  return {...preview, service_preview_state: env.temporary};
}
