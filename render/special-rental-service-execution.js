// @editor-module 出租初始化复用战车字段模板并同步乘员、归还与队伍。
import {saveRentalVehicleTemplate} from '../core/save-codec.js';
import {SERVICE_ROLES} from '../core/service-preview-state.js';

export function specialRentalServiceDomain(fields, data, {block, branch}) {
  const {get, put, board, unboard, party, rolePath} = fields;
  const rentals = state => [2, 1, 0].filter(index => get(state, `active_rental_vehicle_preset.${index}`) < 128);
  const release = (state, index) => {
    unboard(state, index + 8); put(state, `active_rental_vehicle_preset.${index}`, 255); party(state);
    state.execution.transactions.push({type: 'return', vehicle: index + 8});
  };
  return {
    rentals,
    operate(state, operation, segment) {
      const e = state.execution, op = operation.opcode;
      if (op === 0xFB) return branch(state, segment, rentals(state).length);
      if (op === 0x98) {for (const index of rentals(state)) release(state, index); return;}
      if (op === 0xE1) return branch(state, segment, get(state, `${rolePath(state)}.present`) & 128 ? 1 : 0);
      if (op === 0xE2) {
        const index = e.returnRoles[e.returnChoice];
        if (!Number.isInteger(index)) return block(state, '归还选择缺少活动出租位');
        e.returnRental = index;
        return branch(state, segment, fields.vehicles(state).includes(index + 8) ? 0 : 1);
      }
      if (op === 0xC0) {
        const slot = [0, 1, 2].find(index => get(state, `active_rental_vehicle_preset.${index}`) >= 128);
        if (slot === undefined) return block(state, '出租记录已满');
        const values = saveRentalVehicleTemplate(e.preset, data);
        const target = 8 + slot;
        const names = [...get(state, `vehicle.${target}.name_codes`)];
        names[6] = values.nameCode;
        for (const [suffix, value] of Object.entries(values)) if (suffix !== 'nameCode') put(state, `vehicle.${target}.${suffix}`, value);
        put(state, `vehicle.${target}.name_codes`, names);
        put(state, `active_rental_vehicle_preset.${slot}`, e.preset);
        board(state, target);
        e.transactions.push({type: 'rent', vehicle: target, preset: e.preset, role: state.context.role});
        return;
      }
      if (op === 0xD2) {
        const callback = operation.operands[0] | operation.operands[1] << 8;
        if (callback === 0xFA99) {e.rentalChoice = 0; return;}
        if (callback === 0xA1F4) return;
        if (callback === 0xA4AF) {e.preset = data.goods[e.rentalChoice]; return;}
        if (callback === 0xA450) {
          e.returnRoles = rentals(state); e.returnChoice = 0;
          if (e.returnRoles.length) state.context.vehicle = 8 + e.returnRoles[0];
          return;
        }
        if (callback === 0xA43F) {release(state, e.returnRental); return;}
        if (callback === 0xA411) {
          const vehicle = get(state, `${rolePath(state)}.current_vehicle`);
          if (vehicle >= 128) return block(state, '换乘缺少原战车');
          state.domainResults.parkedVehicle = {vehicle, positionStatus: '场景位置更新未确认'};
          unboard(state, vehicle); return;
        }
      }
      return false;
    },
  };
}
