// @editor-module 财产保管在两侧当前库存之间绑定所选物理槽。
import {SERVICE_ROLES, SERVICE_PARTS} from '../core/service-preview-state.js';
import {removeCarriedItem} from './carried-inventory.js';

export function storageServiceDomain(fields, {block, branch, changeSegment}) {
  const {get, put, vehicles, roles, vehiclePath} = fields;
  const stored = state => Array.from({length: 64}, (_, index) => ({index,
    id: get(state, `property_storage.item.${index}`), condition: get(state, `property_storage.paired_condition.${index}`)}));
  const object = state => state.execution.receiverKind === 0 ? vehiclePath(state) : `role.${SERVICE_ROLES[state.context.role]}`;
  const inventory = state => {
    const e = state.execution, path = object(state);
    if (e.receiverKind) return [...get(state, `${path}.${e.category ? 'inventory' : 'equipment'}`)];
    return Array.from({length: 8}, (_, index) => get(state, `${path}.${e.category ? `item.${index}` : `equipment.${SERVICE_PARTS[index]}`}`));
  };
  const entries = state => inventory(state).flatMap((id, index) => id ? [{id, index}] : []);
  const actors = state => state.execution.receiverKind ? roles(state) : vehicles(state);
  const sort = state => {
    const rows = stored(state).sort((a, b) => b.id - a.id);
    rows.forEach((row, index) => {
      put(state, `property_storage.item.${index}`, row.id);
      put(state, `property_storage.paired_condition.${index}`, row.condition);
    });
    if (rows.every(row => row.id)) block(state, '满 64 槽保管物的首零扫描越界未确认');
  };
  const menus = state => {
    if (state.control === 2) return ['存入', '取出', '退出'];
    if (state.control === 7) return ['战车', '人物', '退出'];
    if ([11, 36].includes(state.control)) return actors(state).map(id => state.execution.receiverKind
      ? ['猎人', '机械师', '战士'][id] : `战车 ${id + 1}`);
    if (state.control === 16) return ['装备', '道具'];
    if (state.control === 19) return entries(state).map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    if (state.control === 49) return stored(state).filter(row => row.id)
      .map(row => `物品 ${row.id.toString(16).toUpperCase().padStart(2, '0')}`);
    return [];
  };
  const select = (state, index) => {
    const e = state.execution;
    if (state.pause.selector === 1) {
      state.context[e.receiverKind ? 'role' : 'vehicle'] = actors(state)[index]; state.selections.object = index;
    } else if (state.control === 16) {e.category = index; e.sale = 0;}
    else if (state.control === 19) e.sale = index;
    else if (state.control === 49) {e.stored = index; e.storagePage = Math.max(0, index - 7);}
  };
  const withdraw = state => {
    const e = state.execution, rows = inventory(state), destination = rows.indexOf(0);
    if (destination < 0) return block(state, '当前接收栏没有空位');
    const path = object(state);
    if (e.receiverKind) {rows[destination] = e.item; put(state, `${path}.${e.category ? 'inventory' : 'equipment'}`, rows);}
    else {
      put(state, `${path}.${e.category ? `item.${destination}` : `equipment.${SERVICE_PARTS[destination]}`}`, e.item);
      if (!e.category) put(state, `${path}.equipment_state.${SERVICE_PARTS[destination]}`, e.condition);
    }
    put(state, `property_storage.item.${e.stored}`, 0);
    e.transactions.push({type: 'withdraw', source: e.stored, destination, object: path, item: e.item});
  };
  const operate = (state, operation, segment) => {
    const e = state.execution, op = operation.opcode;
    if ([0xC9, 0x93].includes(op)) return;
    if (op === 0xD4) {e.menuSelector = operation.operands[1]; e.choice = 0; return;}
    if (op === 0xC3) {e.objectList = segment.index; return;}
    if (op === 0xDF) return branch(state, segment, vehicles(state).length ? 1 : 0);
    if (op === 0xE9) return branch(state, segment, get(state, 'property_storage.item.62') ? 1 : 0);
    if (op === 0xEC) {
      sort(state);
      if (e.status === 'unknown') return;
      return branch(state, segment, get(state, 'property_storage.item.0') ? 1 : 0);
    }
    if (op === 0xE0) return branch(state, segment, e.receiverKind);
    if (op === 0xBB) {e.branch = e.receiverKind === 0 && state.context.vehicle >= 8 ? 1 : 0; return;}
    if (op === 0xBF) {e.category = 0; e.sale = 0; return;}
    if (op === 0xD9) return branch(state, segment, inventory(state).some(Boolean) ? 1 : 0);
    if (op === 0xBA) {e.branch = inventory(state).at(-1) ? 1 : 0; return;}
    if (op === 0xEB) return branch(state, segment, e.item <= 0xDC ? 0 : 1);
    if (op === 0xEA) return block(state, '装备移除、安装位与属性重算的传递效果未确认');
    if (op === 0xD2) {
      const callback = operation.operands[0] | operation.operands[1] << 8;
      if (callback === 0xA1AA) {e.receiverKind = e.choice; return;}
      if (callback === 0xA13E) return;
      if (callback === 0xA9D9) {
        const row = entries(state)[e.sale];
        if (!row) return block(state, '所选携带物已不在当前栏');
        e.item = row.id; e.saleSlot = row.index; return;
      }
      if (callback === 0xA0DF) {
        const index = state.context[e.receiverKind ? 'role' : 'vehicle'];
        if (index >= SERVICE_ROLES.length) return block(state, '人物状态检查的战车索引跨字段读取未确认');
        const choice = Number(get(state, `role.${SERVICE_ROLES[index]}.status`) === 255);
        const continuation = segment.callback_continuation;
        const read = continuation?.reads?.find(row => row.relative_offset === choice);
        if (continuation?.confirmation_status !== 'confirmed' || read?.confirmation_status !== 'confirmed'
            || !Number.isInteger(read.value) || read.value >= 0xFE)
          return block(state, '人物状态检查的当前脚本续接未确认');
        return changeSegment(state, read.value);
      }
      if (callback === 0xABCE) {
        if (!e.receiverKind || !e.category) return block(state, '装备移除与属性重算未闭合；保管栏与携带栏均不提交');
        const destination = stored(state).findIndex(row => !row.id);
        if (destination < 0) return block(state, '保管栏首零扫描越界未确认');
        const next = removeCarriedItem(inventory(state), e.saleSlot);
        put(state, `property_storage.item.${destination}`, e.item);
        put(state, `${object(state)}.inventory`, next);
        e.transactions.push({type: 'deposit', source: e.saleSlot, destination, object: object(state), item: e.item});
        return;
      }
      if (callback === 0xABEC) return;
      if (callback === 0xAC12) {
        const row = stored(state)[e.stored];
        if (!row?.id) return block(state, '所选保管物为空');
        e.item = row.id; e.condition = row.condition;
        e.receiverKind = row.id >= 0xCB || row.id >= 0x41 && row.id < 0x99 ? 0 : 1;
        e.category = row.id >= 0x99 ? 1 : 0;
        state.selections.object = 0;
        state.context[e.receiverKind ? 'role' : 'vehicle'] = actors(state)[0]; return;
      }
      if (callback === 0xF4C6) {
        if (!e.item) return block(state, '取出缺少已确认的物品类别');
        return;
      }
      if (callback === 0xAC33) return withdraw(state);
    }
    block(state, `此保管调用的原生 ${op.toString(16).toUpperCase()} 效果未确认`);
  };
  return {menus, select, operate, actors, quantityMenu: () => false,
    saleIndex: state => entries(state)[state.execution.sale]?.index ?? 0,
    inventoryKind: state => state.execution.category};
}
