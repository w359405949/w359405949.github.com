// @editor-module 专用效果同步同一快照中的存档字段与派生队伍表示。
import {listQuantityFields} from './list-quantity-service-fields.js';
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';

export function specialServiceFields(data) {
  const fields = listQuantityFields(data), {get, roles} = fields;
  const put = (state, suffix, value) => fields.put(state, suffix,
    get(state, suffix) instanceof Uint8Array ? Uint8Array.from(value) : value);
  const rolePath = state => `role.${SERVICE_ROLES[state.context.role]}`;
  const status = (state, value) => {
    const path = rolePath(state);
    put(state, `${path}.status`, value);
    for (const [name, mask] of [['acid', 8], ['numb', 128]])
      put(state, `${path}.${name}`, Number(value !== 255 && Boolean(value & mask)));
    put(state, `${path}.dead`, Number(value === 255));
  };
  const equipmentState = (state, vehicle, part, value) => {
    put(state, `vehicle.${vehicle}.equipment_state.${part}`, value);
    put(state, `vehicle.${vehicle}.${part}_damaged`, Number(Boolean(value & 128)));
  };
  const party = state => {
    const slots = [...get(state, 'entity_scene_object_slots')];
    SERVICE_ROLES.forEach((role, index) => {slots[index] = get(state, `role.${role}.current_vehicle`);});
    for (let index = 0; index < 3; index++) slots[4 + index] = get(state, `active_rental_vehicle_preset.${index}`);
    put(state, 'entity_scene_object_slots', slots);
    state.domainResults.party = roles(state).map(index => ({role: index,
      present: get(state, `role.${SERVICE_ROLES[index]}.present`),
      status: get(state, `role.${SERVICE_ROLES[index]}.status`),
      vehicle: slots[index]}));
  };
  const board = (state, vehicle) => {
    const path = rolePath(state);
    state.context.vehicle = vehicle;
    put(state, `${path}.current_vehicle`, vehicle);
    put(state, `${path}.present`, get(state, `${path}.present`) | 128);
    put(state, `${path}.driving`, 1); party(state);
  };
  const unboard = (state, vehicle) => {
    SERVICE_ROLES.forEach(role => {
      const path = `role.${role}`;
      if (get(state, `${path}.current_vehicle`) !== vehicle) return;
      put(state, `${path}.current_vehicle`, 255);
      put(state, `${path}.present`, get(state, `${path}.present`) & 127);
      put(state, `${path}.driving`, 0);
    });
    const slots = [...get(state, 'entity_scene_object_slots')];
    if (slots[3] === vehicle) {slots[3] = 255; put(state, 'entity_scene_object_slots', slots);}
    party(state);
  };
  const damaged = state => fields.vehicles(state).flatMap(vehicle => SERVICE_PARTS.flatMap((part, index) => {
    const item = get(state, `vehicle.${vehicle}.equipment.${part}`);
    const condition = get(state, `vehicle.${vehicle}.equipment_state.${part}`);
    return item && condition & 192 ? [{vehicle, part, index, item}] : [];
  }));
  return {...fields, put, rolePath, status, equipmentState, party, board, unboard, damaged};
}
