// @editor-module 战车工具调用绑定当前驾驶员、战车与隔离执行字段。
import {SERVICE_ROLES as roles} from './service-preview-state.js';
const BATTLE_VEHICLE_ITEM_EVIDENCE = 'project/evidence/reverse-engineering/battle-vehicle-item-calls/observations.json';
const calls = {
  'battle-result-script:AE': {bytes: [0xC3, 0xC2, 0xF5, 0xA3], texts: [61],
    states: ['air-conditioner-use'], before: {coolerEnabled: 1, heaterEnabled: 1}, clear: true,
    dependency: {handle: 'battle-result-script:A3', bytes: [0xD2, 0x3D, 0xE3]}},
  'battle-result-script:AC': {bytes: [0xD2, 0x3D, 0xC2, 0xFF], texts: [61],
    states: ['heater-use'], after: {heaterEnabled: 1}},
  'battle-result-script:AD': {bytes: [0xD2, 0x3D, 0xC3, 0xFF], texts: [61],
    states: ['cooler-use'], after: {coolerEnabled: 1}},
  'battle-result-script:A3': {bytes: [0xD2, 0x3D, 0xE3], texts: [61],
    states: ['fan-use'], clear: true},
  'battle-result-script:8F': {bytes: [0xCF, 0xD2, 0x3D, 0xF7, 0x3E], texts: [61, 62],
    states: ['radar-use', 'radar-effect'], radar: true},
  'battle-result-script:8E': {bytes: [0xCE, 0xD2, 0x3D, 0xFF], texts: [61],
    states: ['shield-use'], before: {resultCondition: 2}},
};
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const matchingRecord = (record, handle, bytes) => record?.handle === handle
  && record.raw_bytes?.length === bytes.length && record.raw_bytes.every((value, index) => value === bytes[index]);

export function battleVehicleItemCallContract(handle) {
  return calls[handle] ? {...structuredClone(calls[handle]), evidence: BATTLE_VEHICLE_ITEM_EVIDENCE} : null;
}

// 战车姓名与临时效果分别绑定战车及其本次驾驶员。
export function battleVehicleItemContext({context, fields, items} = {}) {
  if (!context || !fields || ![1, 2].includes(context.slot)) return null;
  const prefix = `save.slot.${context.slot}.`;
  let role = context.role, vehicle;
  if (context.actor === `save-role:${role}` && roles[role])
    vehicle = fields[`${prefix}role.${roles[role]}.current_vehicle`];
  else if (context.actor === `save-vehicle:${context.vehicle}`) {
    vehicle = context.vehicle;
    const drivers = roles.flatMap((name, index) =>
      fields[`${prefix}role.${name}.current_vehicle`] === vehicle
        && byte(fields[`${prefix}role.${name}.present`])
        && fields[`${prefix}role.${name}.present`] === (0x80 | (index + 1)) ? [index] : []);
    if (drivers.length !== 1) return null;
    [role] = drivers;
  } else return null;
  if (!Number.isInteger(vehicle) || vehicle < 0 || vehicle > 10 || !roles[role]) return null;
  const rolePrefix = `${prefix}role.${roles[role]}.`, vehiclePrefix = `${prefix}vehicle.${vehicle}.`;
  const slot = context.inventory_index ?? 0, status = fields[`${rolePrefix}status`];
  if (fields[`${rolePrefix}present`] !== (0x80 | (role + 1)) || !byte(status) || (status & 0xE0)
      || !Number.isInteger(slot) || slot < 0 || slot >= 8) return null;
  const inventory = Array.from({length: 8}, (_, index) => fields[`${vehiclePrefix}item.${index}`]);
  if (!inventory.every(byte)) return null;
  const item = items?.find(row => row?.id === inventory[slot]);
  if (!item || !calls[`battle-result-script:${item.battle_use_effect?.result_selector?.toString(16).toUpperCase().padStart(2, '0')}`]) return null;
  return {role, vehicle, rolePrefix, vehiclePrefix, inventoryField: `${vehiclePrefix}item.${slot}`, item,
    messageActor: {kind: 'vehicle', id: vehicle}, effectActor: `save-role:${role}`};
}

export function battleVehicleItemCallOperations({call, path, record, item, fields, context, resultScripts} = {}) {
  const binding = battleVehicleItemContext({context, fields, items: [item]});
  const selector = `battle-result-script:${item?.battle_use_effect?.result_selector?.toString(16).toUpperCase().padStart(2, '0')}`;
  if (!binding || path.enemyActionReference || selector !== path.resultScript
      || context.item !== item.id || !matchingRecord(record, path.resultScript, call.bytes)
      || (call.dependency && !matchingRecord(resultScripts?.find(row => row.handle === call.dependency.handle),
        call.dependency.handle, call.dependency.bytes)))
    return [{kind: 'boundary', missing: '本次驾驶员、战车工具或结果记录不匹配已确认调用'}];
  const evidence = BATTLE_VEHICLE_ITEM_EVIDENCE;
  const operations = [];
  const runtime = value => operations.push({kind: 'effect', id: 'vehicle-tool-runtime', confirmed: true, evidence,
    actor: binding.effectActor, vehicle: binding.vehicle, value});
  if (call.before) runtime(call.before);
  if (call.radar) {
    const skill = fields[`${binding.rolePrefix}driving_skill`];
    if (!byte(skill)) return [{kind: 'boundary', missing: '本次雷达调用缺少驾驶员的驾驶技能'}];
    runtime({resultSkill: (skill + 0x32) & 255});
  }
  operations.push(...path.phases.map(phase => ({kind: 'message', phase, evidence})));
  if (call.after) runtime(call.after);
  if (call.clear) {
    const field = `${binding.vehiclePrefix}condition_raw`;
    if (!byte(fields[field])) return [{kind: 'boundary', missing: '本次气扇调用缺少当前战车状态'}];
    operations.push({kind: 'effect', id: 'vehicle-tool-clear', confirmed: true, evidence, field});
  }
  operations.push({kind: 'return', evidence, value: {scope: 'result-script', confirmed: true,
    actor: binding.effectActor, vehicle: binding.vehicle, item: item.id, resultScript: path.resultScript}});
  return operations;
}

export function applyBattleVehicleItemCallEffect(fields, operation, context, domainResults = {}) {
  if (operation.id === 'vehicle-tool-clear') {
    if (!byte(fields[operation.field])) return {status: 'unavailable', reason: '当前战车状态缺失'};
    fields[operation.field] &= 0x1F;
    const acid = operation.field.replace(/\.condition_raw$/, '.acid');
    if (Object.hasOwn(fields, acid)) fields[acid] = 0;
    return {status: 'available', fields};
  }
  if (operation.id === 'vehicle-tool-runtime' && operation.actor === context.effectActor
      && operation.vehicle === context.vehicle)
    return {status: 'available', fields, domainResults: {battleActor: {...domainResults.battleActor,
      actor: operation.actor, vehicle: operation.vehicle, ...structuredClone(operation.value)}}};
  return {status: 'unavailable', reason: '本次战车工具效果的驾驶员不匹配'};
}
