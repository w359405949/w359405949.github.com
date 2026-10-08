// @editor-module 战车改造只执行已有资格、计价、载重与设备字段效果。
import {SERVICE_PARTS} from '../core/service-preview-state.js';
import {currentVehicleEquipmentLoad} from '../core/vehicle-equipment-load.js';

export function specialVehicleServiceDomain(cid, fields, data, {block, branch, changeSegment}) {
  const {get, put, vehiclePath, formula} = fields;
  const read = (state, suffix) => get(state, `${vehiclePath(state)}.${suffix}`);
  const price = code => {
    const row = data.items.equipment_editor.numeric_codes.find(row => row.raw_code === code && row.available);
    if (!Number.isInteger(row?.value)) throw new TypeError('底盘报价码未确认');
    return row.value;
  };
  return (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if (op === 0xFD && cid === 0x28) {
      const id = read(state, 'equipment.engine');
      const eligible = !read(state, 'equipped.engine') ? 1 : read(state, 'equipment_state.engine') & 192 ? 2
        : [0x7B, 0x7E, 0x81, 0x84, 0x87, 0x8A, 0x8D, 0x90].includes(id) ? 3 : 0;
      return branch(state, segment, eligible);
    }
    if (op === 0xE6) {
      e.quote = formula(state, 'current-chassis-capacity-cost');
      return branch(state, segment, read(state, 'ammo_capacity') >= 128 ? 1 : 0);
    }
    if (op === 0xE7) {
      const defense = read(state, 'defense');
      e.quote = formula(state, 'current-chassis-weight-cost');
      const preset = data.vehicles.presets.find(row => row.preset_id === state.context.vehicle);
      const limit = preset?.chassis_weight?.internal_units;
      if (!Number.isInteger(limit)) return block(state, '底盘上限缺少当前预设基重量');
      return branch(state, segment, limit >= defense ? 0 : 1);
    }
    if (op === 0xE8) {
      const mask = data.overlays.descending_bit_masks[e.hole];
      if (!Number.isInteger(mask)) return block(state, '孔位许可掩码未确认');
      e.quote = Math.floor(price(0xE0 + state.context.vehicle) / [10, 40, 30][e.hole]);
      return branch(state, segment, read(state, 'mount_mask_raw') & mask ? 1 : 0);
    }
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA27B) return;
      if (callback === 0xAA69) return changeSegment(state, read(state, 'equipment_state.chassis') ? 9 : 10);
      if (callback === 0xAA48) {e.weapon = 4; e.quote = formula(state, 'current-engine-upgrade-price'); return;}
      if (callback === 0xAA42) {
        const id = read(state, 'equipment.engine');
        formula(state, 'current-engine-upgrade-price');
        put(state, `${vehiclePath(state)}.equipment.engine`, id + 1);
        e.transactions.push({type: 'engine', vehicle: state.context.vehicle, from: id, to: id + 1, quote: e.quote});
        return;
      }
      if (callback === 0xAAA4) {
        const index = e.project === 2 ? e.hole : e.project + 3;
        e.weightIncrease = data.codes[`chassis-upgrade-weight-${index}`];
        const load = currentVehicleEquipmentLoad({read: suffix => read(state, suffix), items: data.items.records,
          extra: e.weightIncrease, limit: data.codes['armor-equipment-item-limit']});
        if (!load) return block(state, '底盘改造载重或当前引擎容量未确认');
        state.domainResults.load = load;
        e.branch = load.overloaded ? 1 : 0; return;
      }
      if (callback === 0xA146) {
        const path = vehiclePath(state);
        put(state, `${path}.chassis_weight`, (read(state, 'chassis_weight') + e.weightIncrease) & 65535);
        if (e.project === 0) put(state, `${path}.ammo_capacity`, (read(state, 'ammo_capacity') + 8) & 255);
        if (e.project === 1) put(state, `${path}.defense`, (read(state, 'defense') + 10) & 65535);
        if (e.project === 2) {
          const mask = read(state, 'mount_mask_raw') | data.overlays.descending_bit_masks[e.hole];
          put(state, `${path}.mount_mask_raw`, mask);
          SERVICE_PARTS.slice(0, 3).forEach((part, index) => put(state, `${path}.mount_permission.${part}`, Number(Boolean(mask & (128 >> index)))));
        }
        e.transactions.push({type: 'chassis', vehicle: state.context.vehicle, project: e.project, hole: e.hole, quote: e.quote});
        return;
      }
    }
    return false;
  };
}
