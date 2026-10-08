// @editor-module 售车价格码与成交阈值由应用命令字段对象序列化。
import {fieldRomValue} from './field-codec.js';

export const VEHICLE_TRADE_COMPILER_ID = 'vehicle-trade-parameters/v1';
export const VEHICLE_TRADE_COMPONENT_CODEC = 'metalmaxcn.vehicle-trade-parameters';
export const VEHICLE_TRADE_TABLES = Object.freeze([
  {fragmentId: 'application-command.trade-price-codes', length: 8},
  {fragmentId: 'application-command.trade-probability-thresholds', length: 8},
]);

export function vehicleTradeAssetSchema(resourceId) {
  vehicleTradeComponentSpecs(resourceId);
  return 'metalmaxcn.field-ui-module.asset.application-command';
}

export function vehicleTradeComponentSpecs(resourceId) {
  if (resourceId !== 'application-command') throw new TypeError('售车参数归属无效');
  return VEHICLE_TRADE_TABLES.map(row => ({...row}));
}

export function encodeVehicleTradeFields(fields, options = {}) {
  return vehicleTradeComponentSpecs(fields[0]?.resourceId).map(({fragmentId, length}) => {
    const selected = fields.filter(field => field.fragmentId === fragmentId
      || field.physical?.component?.fragment_id === fragmentId);
    if (selected.length !== length || selected.some((field, index) =>
      field.resourceId !== 'application-command' || field.fieldName !== `value${index}`))
      throw new TypeError('售车参数字段身份或数量不符');
    const values = selected.map(field => fieldRomValue(field, options));
    const maximum = fragmentId.endsWith('price-codes') ? 0xE8 : 255;
    if (values.some(value => !Number.isInteger(value) || value < 0 || value > maximum))
      throw new TypeError('售车参数超出数值码或字节范围');
    return {fragment_id: fragmentId, payload: Uint8Array.from(values), relocations: []};
  });
}

export function validateVehicleTradePreimage(fields, fragmentId, baseline) {
  const spec = VEHICLE_TRADE_TABLES.find(row => row.fragmentId === fragmentId);
  const selected = fields.filter(field => field.fragmentId === fragmentId
    || field.physical?.component?.fragment_id === fragmentId);
  if (!spec || selected.length !== spec.length || baseline?.length !== spec.length
    || selected.some((field, index) => field.fieldName !== `value${index}`
      || field.defaultValue !== baseline[index])) throw new TypeError('售车参数 Origin 与基线不符');
}

export function vehicleTradeDecision(amount, randomByte, priceCodes, thresholds, numericCodes) {
  if (!Number.isInteger(amount) || amount < 0 || amount > 9999999
    || !Number.isInteger(randomByte) || randomByte < 0 || randomByte > 255
    || priceCodes?.length !== 8 || thresholds?.length !== 8)
    throw new TypeError('售车判定输入无效');
  for (let index = 7; index >= 0; index--) {
    const price = numericCodes.find(row => row.raw_code === priceCodes[index])?.value;
    if (!Number.isInteger(price)) throw new TypeError('售车价格码未发布');
    if (amount >= price) return {tier: index, accepted: randomByte <= thresholds[index],
      numerator: thresholds[index] + 1, denominator: 256, minimum: price};
  }
  return {tier: null, accepted: false, numerator: 0, denominator: 256};
}
