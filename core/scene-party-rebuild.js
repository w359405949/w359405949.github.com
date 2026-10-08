// @editor-module 队伍重建按当前存档字段排序并复用所属形象字段。
import {partyAliveActorType} from './visual-actors.js';
import {vehicleFieldActorType} from './visual-runtime-values.js';

const byte = value => {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError('party-rebuild-byte');
  return value;
};
const typeId = handle => {
  if (!/^actor-type:[0-9A-F]{2}$/i.test(handle || '')) throw new TypeError('party-actor-type');
  return parseInt(handle.split(':')[1], 16);
};

export function rebuildSceneParty({state, visual, partyTypes, vehicles}) {
  const read = (id, index = 0) => byte(state.field(id, index).value);
  const write = (id, value, index = 0) => {state.field(id, index).value = byte(value);};
  for (let slot = 15; slot >= 0; slot--) if ([0x81, 0x42].includes(read('render.marker', slot))) {
    write('render.marker', 0, slot); write('render.frame', 0, slot);
  }
  if (read('control.storyState')) return;
  const roles = ['hunter', 'mechanic', 'soldier'];
  const present = role => read(`save.active.role.${roles[role]}.present`);
  const dead = role => read(`save.active.role.${roles[role]}.isDead`) !== 0;
  const order = [
    ...roles.map((_, role) => role).filter(role => present(role) !== 0 && !dead(role)),
    ...roles.map((_, role) => role).filter(role => present(role) !== 0 && dead(role)),
  ];
  if (read('save.active.towed_vehicle') < 128) order.push(3);
  order.forEach((role, index) => write('party.order', role, index));
  write('field.partyCount', order.length);
  for (let index = 3; index >= 0; index--) write('party.renderState', 0, index);
  for (let index = 0; index < Math.max(1, order.length); index++) {
    const role = read('party.order', index);
    let type, marker = 0x81;
    if (role === 3 || present(role) >= 128) {
      const vehicle = read(role === 3 ? 'save.active.towed_vehicle'
        : `save.active.role.${roles[role]}.current_vehicle`);
      if (vehicle === 0x24) {type = vehicle; marker = 0x42;}
      else type = vehicleFieldActorType(vehicles, vehicle < 8 ? vehicle
        : read(`save.active.active_rental_vehicle_preset.${vehicle - 8}`));
    } else if (dead(role)) {type = typeId(partyTypes.dead_actor_types[role]); marker = 0x42;}
    else type = partyAliveActorType(visual, role);
    write('party.renderState', type, index);
    for (let slot = 15; slot >= 0; slot--) if (read('render.marker', slot) === 0) {
      write('render.marker', marker, slot); write('render.actorIndex', index, slot);
      for (const id of ['render.actionState', 'render.waitCounter', 'render.loopCounter']) write(id, 0, slot);
      break;
    }
  }
}
