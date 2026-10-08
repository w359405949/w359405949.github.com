// @editor-module 设施常量从既有代码字段对象读取。
const parameter = (resourceId, index, name, offset) => Object.freeze({name,
  resource_id: resourceId, entity_handle: `${resourceId}:${index}`, field: 'value',
  physical: Object.freeze({space: 'prg', offset, length: 1, end_exclusive: offset + 1})});

export const FACILITY_RUNTIME_CODE_PARAMETERS = Object.freeze([
  ...['scene', 'camera-x', 'camera-y'].flatMap((name, column) => Array.from({length: 35}, (_, index) =>
    parameter('story-action-handler', `code-parameter:inn-rest-${name}-${index}`,
      `inn-rest-${name}-${index}`, [0x21403, 0x21426, 0x21449][column] + index))),
  parameter('application-command', '00', 'inn-price-37', 0x302FB),
  parameter('application-command', '01', 'inn-price-38', 0x302FC),
  parameter('application-command', '02', 'inn-price-39', 0x302FD),
  parameter('application-command', '03', 'minor-repair-price', 0x30CBF),
  ...Array.from({length: 10}, (_, index) => parameter('application-command',
    (index + 4).toString(16).toUpperCase().padStart(2, '0'), `chassis-weight-price-${index}`, 0x30B89 + index)),
  ...Array.from({length: 5}, (_, index) => parameter('application-command',
    `code-parameter:chassis-upgrade-weight-${index}`, `chassis-upgrade-weight-${index}`, 0x30ABF + index)),
  parameter('ui-facility', 'code-parameter:equipment-quantity-unit-price', 'equipment-quantity-unit-price', 0x306AC),
  parameter('ui-facility', 'code-parameter:armor-price-rounding-bias', 'armor-price-rounding-bias', 0x306BC),
  parameter('ui-facility', 'code-parameter:armor-price-divisor', 'armor-price-divisor', 0x306C8),
  parameter('vehicle-equipment-service', 'code-parameter:armor-equipment-item-limit', 'armor-equipment-item-limit', 0x217D9),
  parameter('field-scene-lifecycle-service', '00', 'ui-color-0', 0x28921),
  parameter('field-scene-lifecycle-service', '01', 'ui-color-1', 0x2896B),
  parameter('field-scene-lifecycle-service', '02', 'ui-color-2', 0x28970),
  parameter('field-scene-lifecycle-service', '03', 'ui-color-3', 0x28975),
]);

export async function facilityRuntimeCodeValues(names, readField) {
  const {db} = await import('./project-db.js');
  const read = readField ?? (source => db.getField(source.resource_id, source.entity_handle, source.field));
  const entries = await Promise.all(names.map(async name => {
    const source = FACILITY_RUNTIME_CODE_PARAMETERS.find(row => row.name === name);
    if (!source) throw new TypeError(`设施代码参数未发布：${name}`);
    return [name, (await read(source)).value];
  }));
  return Object.fromEntries(entries);
}
