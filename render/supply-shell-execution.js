// @editor-module 补给与炮弹交易按当前数量、容量和单价推进领域效果。
import {creditedGold} from './carried-inventory.js';
import {SERVICE_PARTS} from '../core/service-preview-state.js';
import {prepareInterfaceQuantity, acceptInterfaceQuantity} from './interface-quantity-input.js';

export function supplyShellDomain(cid, fields, {goods, shells}, {block, branch}) {
  const {get, put, vehiclePath, formula, item, capacity, weapons, vehicles} = fields;
  const counts = state => Array.from({length: 6}, (_, index) => get(state, `${vehiclePath(state)}.shell_count.${index}`));
  const storedShells = state => counts(state).flatMap((count, index) => {
    const id = get(state, `${vehiclePath(state)}.shell_type.${index}`);
    return id < 128 ? [{index, count, id}] : [];
  });
  const maximum = state => Math.max(0, get(state, `${vehiclePath(state)}.ammo_capacity`) - counts(state).reduce((sum, n) => sum + n, 0));
  const quote = state => {
    const price = shells.records.find(row => row.id === state.execution.item)?.price;
    if (!price?.available || !Number.isInteger(price.value)) throw new TypeError('所选炮弹单价未确认');
    return price.value;
  };
  const prepare = (state, kind) => {
    const e = state.execution;
    const max = kind === 'special' ? maximum(state) : kind === 'sale' ? storedShells(state)[e.sale]?.count
      : kind === 'armor' ? formula(state, 'current-vehicle-armor-deficit') : e.deficit;
    prepareInterfaceQuantity(state, max, kind);
  };
  const menus = state => {
    const control = state.control, e = state.execution;
    if (cid === 0x20) {
      if (control === 1) return ['弹药', '装甲', '退出'];
      if ([6, 28].includes(control)) return ['全部', '选数量', '退出'];
      if ([15, 27].includes(control)) return vehicles(state).map(id => `战车 ${id + 1}`);
      if (control === 18) return weapons(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    } else {
      if (control === 1) return ['购买', '出售', '退出'];
      if (control === 5) return ['普通弹', '特殊弹', '退出'];
      if (control === 7) return goods.map(id => `record:0D:${String(id).padStart(3, '0')}`);
      if ([10, 20, 35].includes(control)) return vehicles(state).map(id => `战车 ${id + 1}`);
      if (control === 22) return weapons(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
      if (control === 44) return storedShells(state).map(row => `record:0D:${String(row.id).padStart(3, '0')}`);
    }
    return [];
  };
  const select = (state, index) => {
    if (cid === 0x20 && state.control === 6) state.execution.supplyChoice = index;
    else if (cid === 0x20 && state.control === 28) state.execution.armorChoice = index;
    else if (state.pause.selector === 1) {
      state.context.vehicle = vehicles(state)[index]; state.selections.object = index;
    } else if (cid === 0x15 && state.control === 7) state.execution.goods = index;
    else if ([18, 22].includes(state.control)) state.execution.weaponChoice = index;
    else if (state.control === 44) state.execution.sale = index;
  };
  const refill = state => {
    const part = SERVICE_PARTS[state.execution.weapon];
    const suffix = `${vehiclePath(state)}.equipment_state.${part}`;
    put(state, suffix, (get(state, suffix) + state.context.service_amount) & 255);
    state.execution.transactions.push({type: 'ammunition', vehicle: state.context.vehicle,
      part, quantity: state.context.service_amount, quote: state.execution.quote});
  };
  const resumeCallback = state => {
    const e = state.execution;
    for (const [suffix, value] of e.supplyUpdates) put(state, suffix, value);
    e.transactions.push({type: e.supplyKind ? 'party-armor' : 'party-ammunition', quote: e.quote});
    delete e.supplyUpdates; delete e.callbackWait;
  };
  const operate = (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if ([0x94, 0xA7, 0x97, 0xC9].includes(op)) return;
    if (op === 0xC4) {if (!goods.length) block(state, '零商品计数的原生列表回绕未确认'); return;}
    if (op === 0xD4) {e.menuSelector = operation.operands[1]; e.choice = 0; return;}
    if (op === 0xB6) {e.choice = 0; return;}
    if (op === 0xBD) {e.quote = 0; return;}
    if (op === 0xC6) {e.supplyKind = e.choice; return;}
    if (op === 0xE3) return branch(state, segment, e.supplyKind);
    if (op === 0xDF) return branch(state, segment, vehicles(state).length ? 1 : 0);
    if (op === 0xC3) {e.objectList = segment.index; return;}
    if (op === 0xBB) {e.branch = state.context.vehicle >= 8 ? 1 : 0; return;}
    if (op === 0xC5) {e.item = goods[e.goods]; e.unit = quote(state); return;}
    if (op === 0xD6) return branch(state, segment, weapons(state).length ? 1 : 0);
    if (op === 0xA8) {
      const selected = weapons(state)[e.weaponChoice ?? 0];
      if (!selected) return block(state, '所选武器不在当前列表');
      e.weapon = selected.index; e.item = selected.id;
      e.branch = e.item >= 0x65 ? 1 : 0; return;
    }
    if (op === 0xA9) {
      const current = get(state, `${vehiclePath(state)}.equipment_state.${SERVICE_PARTS[e.weapon]}`) & 63;
      e.deficit = (capacity(e.item) - current) & 255; e.branch = e.deficit ? 1 : 0;
      if (e.deficit) {
        state.context.service_amount = e.deficit;
        e.quote = formula(state, 'current-ammunition-deficit-cost');
      }
      return;
    }
    if (op === 0x96) return prepare(state, 'ammunition');
    if (op === 0xDA) {
      const quantity = acceptInterfaceQuantity(state); e.branch = quantity ? 1 : 0;
      if (quantity) e.quote = formula(state, 'current-equipment-quantity-cost', {quantity});
      return branch(state, segment, e.branch);
    }
    if (op === 0xAD) {
      const quantity = acceptInterfaceQuantity(state); e.branch = quantity ? 1 : 0;
      if (quantity) e.quote = (e.unit & 0xFF0000) + ((e.unit * quantity) & 65535);
      return;
    }
    if (op === 0xAC) {
      const entries = storedShells(state); const existing = entries.find(row => row.id === e.item);
      e.shellSlot = existing?.index ?? counts(state).indexOf(0);
      e.branch = e.shellSlot < 0 ? 0 : 1; return;
    }
    if (op === 0xAB) {e.branch = maximum(state) ? 1 : 0; return;}
    if (op === 0xF0 || op === 0xF1) return branch(state, segment, op === 0xF0
      ? maximum(state) ? 0 : 1 : storedShells(state).length ? 0 : 1);
    if (op === 0xDC) {
      e.moneyAfter = get(state, 'gold') - e.quote;
      return branch(state, segment, e.moneyAfter >= 0 ? 0 : 1);
    }
    if (op === 0x9C || op === 0xBC) {put(state, 'gold', e.moneyAfter); return;}
    if (op === 0xAA) return refill(state);
    if (op === 0xA6) {
      const path = `${vehiclePath(state)}.shell_count.${e.shellSlot}`;
      put(state, `${vehiclePath(state)}.shell_type.${e.shellSlot}`, e.item);
      put(state, path, (get(state, path) + state.context.service_amount) & 255);
      e.transactions.push({type: 'shell', vehicle: state.context.vehicle, item: e.item,
        index: e.shellSlot, quantity: state.context.service_amount, quote: e.quote}); return;
    }
    if (op === 0xAE) {put(state, 'gold', creditedGold(get(state, 'gold'), e.quote)); return;}
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xB098) return prepare(state, 'special');
      if (callback === 0xB027) return prepare(state, 'armor');
      if (callback === 0xB074) {
        const row = storedShells(state)[e.sale]; e.item = row.id; e.shellSlot = row.index;
        const unit = quote(state); e.unit = unit - (unit & 255) + ((unit & 255) >>> 1);
        return prepare(state, 'sale');
      }
      if (callback === 0xF49B) {e.sale = 0; return;}
      if (callback === 0xA28C) {
        state.context.service_amount = formula(state, 'current-vehicle-armor-deficit');
        e.quote = state.context.service_amount ? formula(state, 'current-armor-input-cost') : 0; return;
      }
      if (callback === 0xB03E) {
        const quantity = state.context.service_amount, values = counts(state), types = Array.from({length: 6},
          (_, index) => get(state, `${vehiclePath(state)}.shell_type.${index}`));
        values[e.shellSlot] = (values[e.shellSlot] - quantity) & 255;
        if (!values[e.shellSlot]) {
          values.splice(e.shellSlot, 1); values.push(0);
          types.splice(e.shellSlot, 1); types.push(255);
        }
        values.forEach((count, index) => put(state, `${vehiclePath(state)}.shell_count.${index}`, count));
        types.forEach((id, index) => put(state, `${vehiclePath(state)}.shell_type.${index}`, id));

        e.transactions.push({type: 'sell-shell', vehicle: state.context.vehicle, item: e.item,
          index: e.shellSlot, quantity, quote: e.quote}); return;
      }
      if (callback === 0xA4F6) {
        acceptInterfaceQuantity(state);
        e.quote = state.context.service_amount ? formula(state, 'current-armor-input-cost') : 0; return;
      }
      if (callback === 0xA6E3) {
        put(state, `${vehiclePath(state)}.sp`, (get(state, `${vehiclePath(state)}.sp`) + state.context.service_amount) & 65535);
        e.transactions.push({type: 'armor', vehicle: state.context.vehicle, quantity: state.context.service_amount, quote: e.quote}); return;
      }
      if (callback === 0xA58E) {
        e.quote = formula(state, e.supplyKind ? 'current-party-armor-cost' : 'current-party-ammunition-cost');
        e.branch = e.supplyKind ? Number(Boolean(e.quote)) : Number(vehicles(state).some(vehicle =>
          SERVICE_PARTS.some(part => {
            const path = `vehicle.${vehicle}`, id = get(state, `${path}.equipment.${part}`);
            return id > 0 && id < 0x65 && ((capacity(id) - (get(state, `${path}.equipment_state.${part}`) & 63)) & 255);
          })));
        return;
      }
      if (callback === 0xA601) {
        const updates = [];
        for (const vehicle of [...vehicles(state)].reverse()) {
          const path = `vehicle.${vehicle}`;
          if (e.supplyKind) {
            const current = {...state, context: {...state.context, vehicle}};
            updates.push([`${path}.sp`, (get(state, `${path}.sp`) + formula(current, 'current-vehicle-armor-deficit')) & 65535]);
          } else for (const part of SERVICE_PARTS) {
            const id = get(state, `${path}.equipment.${part}`);
            if (id < 0x65) updates.push([`${path}.equipment_state.${part}`,
              ((get(state, `${path}.equipment_state.${part}`) & 0xC0) + capacity(id)) & 255]);
          }
        }
        e.supplyUpdates = updates;
        if (e.supplyKind) return resumeCallback(state);
        e.callbackWait = {record: 'record:06:123'};
        e.status = 'waiting'; state.pause = {kind: 'wait', quantity: false}; return;
      }
    }
    block(state, `此调用的原生 ${op.toString(16).toUpperCase()} 效果未确认`);
  };
  return {menus, select, operate, resumeCallback, quantityMenu: state => state.pause.selector === 2,
    saleIndex: () => 0, inventoryKind: () => 0, weaponRows: weapons, shellRows: storedShells};
}
