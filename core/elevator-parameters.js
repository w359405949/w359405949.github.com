// @editor-module 电梯数据表的片段声明与序列化；代码和长度前缀不参与写入。
import {fieldRomValue} from './field-codec.js';

export const ELEVATOR_PARAMETERS_COMPILER_ID = 'elevator-parameters/v1';
export const ELEVATOR_PARAMETERS_COMPONENT_CODEC = 'metalmaxcn.elevator-parameters';
const specs = {
  'ui-facility': [{fragmentId: 'ui-facility.elevator-scene-bases', length: 5}],
  'field-terrain-behavior-service': [
    {fragmentId: 'field-terrain-behavior-service.elevator-scene-lower', length: 5},
    {fragmentId: 'field-terrain-behavior-service.elevator-scene-upper', length: 5},
  ],
};

export function elevatorParameterComponentSpecs(resourceId) {
  if (!Object.hasOwn(specs, resourceId)) throw new TypeError('电梯数据表归属无效');
  return specs[resourceId].map(row => ({...row}));
}

export function elevatorParameterAssetSchema(resourceId) {
  elevatorParameterComponentSpecs(resourceId);
  return `metalmaxcn.field-ui-module.asset.${resourceId}`;
}

export function encodeElevatorParameterFields(fields, options = {}) {
  const resourceId = fields[0]?.resourceId;
  return elevatorParameterComponentSpecs(resourceId).map(({fragmentId, length}) => {
    const selected = fields.filter(field => field.fragmentId === fragmentId
      || field.physical?.component?.fragment_id === fragmentId);
    if (selected.length !== length || selected.some((field, index) =>
      field.resourceId !== resourceId || field.fieldName !== `value${index}`))
      throw new TypeError('电梯数据表字段身份或数量漂移');
    const values = selected.map(field => fieldRomValue(field, options));
    if (values.some(value => !Number.isInteger(value) || value < 0 || value > 255))
      throw new TypeError('电梯参数必须是 0–255 整数');
    return {fragment_id: fragmentId, payload: new Uint8Array(values), relocations: []};
  });
}

export function validateElevatorParameterPreimage(fields, fragmentId, baseline) {
  const selected = fields.filter(field => field.fragmentId === fragmentId
    || field.physical?.component?.fragment_id === fragmentId);
  const spec = elevatorParameterComponentSpecs(selected[0]?.resourceId)
    .find(row => row.fragmentId === fragmentId);
  if (!spec || selected.length !== spec.length || baseline?.length !== spec.length
      || selected.some((field, index) => field.fieldName !== `value${index}`
        || field.defaultValue !== baseline[index])) throw new TypeError('电梯数据表 Origin 与基线不符');
}
