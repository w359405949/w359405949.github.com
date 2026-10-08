// @editor-module 列表服务只读当前字段并把领域效果写入预览快照。
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {resolveFacilityParameterBindings} from '../core/facility-runtime-parameters.js';

export function listQuantityFields({items, overlays, codes, fieldStatuses = {}}) {
  const key = (state, suffix) => `save.slot.${state.context.slot}.${suffix}`;
  const get = (state, suffix) => {
    const id = key(state, suffix);
    if (!Object.hasOwn(state.fields, id)) throw new TypeError(`预览缺少字段：${id}`);
    return state.fields[id];
  };
  const put = (state, suffix, value) => {state.fields[key(state, suffix)] = structuredClone(value);};
  const vehicles = state => [...get(state, 'entity_scene_object_slots').slice(0, 4)].filter(id => id < 128);
  const roles = state => SERVICE_ROLES.flatMap((role, index) => get(state, `role.${role}.present`) ? [index] : []);
  const vehiclePath = state => `vehicle.${state.context.vehicle}`;
  const formula = (state, operation, invocation = {}) => {
    const [result] = resolveFacilityParameterBindings([{confirmation_status: 'confirmed', value_source: {operation}}],
      {items, overlays, codeValues: codes, saveFields: Object.entries(state.fields).map(([fieldId, value]) =>
        ({fieldId, value, status: fieldStatuses[fieldId] || 'exact'})),
      invocation: {saveSlot: state.context.slot, vehicle: state.context.vehicle,
        part: SERVICE_PARTS[state.execution.weapon], amount: state.context.service_amount, ...invocation}});
    if (result.status !== 'available') throw new TypeError(result.reason);
    return result.value;
  };
  const item = id => items.records.find(row => row.id === id);
  const capacity = id => {
    const flags = item(id)?.equipment?.raw_flags;
    if (!Number.isInteger(flags)) throw new TypeError('所选武器弹数属性未确认');
    const code = flags & 7;
    const value = code === 7 ? overlays.zero_prefixed_ascending_bit_masks[0] : overlays.level_value_codebook[code];
    if (!Number.isInteger(value)) throw new TypeError('所选武器弹数容量未确认');
    return value;
  };
  const weapons = state => SERVICE_PARTS.flatMap((part, index) => {
    const id = get(state, `${vehiclePath(state)}.equipment.${part}`);
    return id && id < 0x75 ? [{id, index}] : [];
  });
  return {get, put, vehicles, roles, vehiclePath, formula, item, capacity, weapons};
}
