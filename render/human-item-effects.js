// @editor-module 道具效果从当前登记和显式随机输入计算，缺现场的效果保持未确认。
import {SERVICE_ROLES} from '../core/service-preview-state.js';
import {HUMAN_ITEM_STATES as S} from './human-items-state-model.js';
import {currentVehicleEquipmentLoad} from '../core/vehicle-equipment-load.js';

export function humanItemEffects({uses, healing, codes, items}, {get, put, consume, enter, result, block, vehicles}) {
  const targetPath = state => `role.${SERVICE_ROLES[state.context.item_target ?? state.context.role]}`;
  const status = (state, path, value) => {
    put(state, `${path}.status`, value);
    for (const [name, mask] of [['acid', 8], ['numb', 128]])
      if (Object.hasOwn(state.fields, `save.slot.${state.context.slot}.${path}.${name}`))
        put(state, `${path}.${name}`, Number(value !== 255 && Boolean(value & mask)));
    if (Object.hasOwn(state.fields, `save.slot.${state.context.slot}.${path}.dead`)) put(state, `${path}.dead`, Number(value === 255));
  };
  const apply = state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    const family = use?.effect_family.id, path = targetPath(state);
    if (family === 'throw-stone') {consume(state); return result(state, 129);}
    if (family === 'wallet') {
      const middle = get(state, 'gold') >>> 8 & 255;
      return result(state, 82 + Number(Boolean(middle & 0xFC)) + Number(Boolean(middle & 0xE0)));
    }
    if (family === 'ancient-coin') {
      state.domainResults.coin = {region: codes['runtime-action-record-region'],
        record: codes['field-item-coin-record-base'] + Number(!(state.execution.itemRandom & 0x80))};
      return result(state, 114);
    }
    if (family === 'heal-hp') {
      if (get(state, `${path}.status`) === 255) return result(state, 118);
      const base = healing.records.find(row => row.id === use.id)?.base_healing;
      if (!Number.isInteger(base) || base < 0 || base > 65535) return block(state, '当前回复基础值未确认');
      const random = state.execution.itemRandom & 15, low = (base & 255) + random;
      const current = get(state, `${path}.current_hp`), sumLow = (current & 255) + (low & 255) + Number(low > 255);
      const sumHigh = (current >>> 8) + (base >>> 8) + Number(sumLow > 255);
      const total = ((sumHigh & 255) << 8) | (sumLow & 255), maximum = get(state, `${path}.max_hp`);
      state.domainResults.healing = {amount: ((base & 0xFF00) | (low & 255)), random};
      put(state, `${path}.current_hp`, total > maximum ? maximum : total);
      if (use.id !== 0xD1) consume(state);
      return result(state, 89 + Number(total > maximum));
    }
    if (family === 'revive') {
      if (get(state, `${path}.status`) !== 255) return result(state, 140);
      put(state, `${path}.current_hp`, get(state, `${path}.max_hp`)); status(state, path, 0);
      put(state, 'global_event_flag.4D', 0); consume(state); return result(state, 139);
    }
    if (['clear-poison', 'clear-drunk'].includes(family)) {
      const before = get(state, `${path}.status`), mask = family === 'clear-poison' ? 8 : 128;
      const changed = before !== 255 && Boolean(before & mask);
      if (changed) {status(state, path, before & ~mask); if (use.id !== 0xAD) consume(state);}
      return result(state, (family === 'clear-poison' ? 138 : 136) - Number(changed));
    }
    if (family === 'scripted-message') {
      return result(state, Number(use.text_record_references[0].split(':').at(-1)));
    }
    if (family === 'vehicle-context') {
      if (state.context.role !== 1 && get(state, `role.${SERVICE_ROLES[state.context.role]}.repair_skill`)
          < codes['field-item-repair-skill-threshold']) return result(state, codes['field-item-repair-failure-record']);
      if (!vehicles(state).length) return result(state, 130);
      return enter(state, S.vehicleUse);
    }
    if (['restore-sp', 'wax'].includes(family)) return enter(state, S.vehicleUse);
    if (family === 'world-map') return get(state, 'scene_id') === 0 ? result(state, 156, {next: S.map}) : result(state, 158);
    if (family === 'fax') return block(state, '传真场景类型缺少当前入口属性，不能由场景编号猜测洞穴');
    if (!use) return result(state, 119);
    block(state, `“${use.effect_family.label}”的场景字段或领域完成结果未确认`);
  };
  const vehicle = state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    if (use?.effect_family.id === 'wax') {
      const path = `vehicle.${state.context.item_vehicle}`;
      consume(state);
      put(state, `${path}.condition_raw`, get(state, `${path}.condition_raw`) & ~4);
      put(state, `${path}.acid`, 0);
      return result(state, 124);
    }
    if (use?.effect_family.id === 'restore-sp') {
      const path = `vehicle.${state.context.item_vehicle}`;
      const amount = uses.pag_sp_restore_values_low_high.find(row => Number.parseInt(row.item_reference.split(':')[1], 16) === use.id)?.sp_restore;
      const load = currentVehicleEquipmentLoad({read: suffix => get(state, `${path}.${suffix}`), items, extra: amount});
      if (!load) return block(state, 'PAG 缺少当前设备重量或引擎载重');
      const adjusted = !load.overloaded ? amount : load.capacity === 0 ? 0
        : (amount - ((load.weight - load.capacity) & 0xFFFF)) & 0xFFFF;
      consume(state);
      put(state, `${path}.sp`, (get(state, `${path}.sp`) + adjusted) & 0xFFFF);
      return result(state, 142);
    }
    block(state, '所选战车道具的容量截取或状态重算未确认');
  };
  return {apply, vehicle, use: state => {
    const use = uses.records.find(row => row.id === state.execution.item.id);
    if (state.execution.item.source.kind === 'vehicle' && state.execution.item.id < 0xCB)
      return block(state, '战车携带人类道具时的状态检查跨字段读取未确认');
    if (state.execution.item.id < 0xCB && get(state, `role.${SERVICE_ROLES[state.context.role]}.status`) & 128)
      return result(state, 22);
    if (use?.effect_family.id === 'fax') {
      if (state.context.fieldSceneType === 1) return enter(state, S.faxReturn);
      if (state.context.fieldSceneType === undefined) return apply(state);
      return result(state, 87, {next: S.fax});
    }
    if (use?.target_required) {
      const roles = SERVICE_ROLES.flatMap((role, id) => get(state, `role.${role}.present`) ? [id] : []);
      if (roles.length === 1) {state.context.item_target = roles[0]; return apply(state);}
      return enter(state, S.target);
    }
    return apply(state);
  }};
}
