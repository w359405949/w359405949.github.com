// @editor-module 地形行为白名单与电梯场景范围的字段对象。
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";
import {ELEVATOR_PARAMETERS_COMPILER_ID, encodeElevatorParameterFields,
  validateElevatorParameterPreimage} from './elevator-parameters.js';

const OWNER = "field-terrain-behavior-service";
const SCHEMA = "metalmaxcn.field-ui-module.asset.field-terrain-behavior-service";
const SPECS = [
  {id: "whitelist-b065", offset: 0x29065, length: 16, label: "行为回调白名单 $B065"},
  {id: "whitelist-b075", offset: 0x29075, length: 7, label: "行为回调白名单 $B075"},
  {id: "whitelist-b07c", offset: 0x2907c, length: 2, label: "行为回调白名单 $B07C"},
];
const handlerCodes = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 19, 20]);

function checkedBlocks(document) {
  const blocks = document?.blocks;
  if (!Array.isArray(blocks))
    throw new TypeError("地形行为白名单缺少三张表");
  const named = new Map();
  for (const name of [...SPECS.map(spec => spec.id), 'conveyor-directions',
    'elevator-scene-lower', 'elevator-scene-upper']) {
    const matches = blocks.flatMap((block, index) => block?.id === `${OWNER}.${name}` ? [{block, index}] : []);
    if (matches.length !== 1) throw new TypeError(`${OWNER}.${name} 必须唯一且存在`);
    named.set(name, matches[0]);
  }
  for (const spec of SPECS) {
    const {block} = named.get(spec.id);
    if (block.address?.space !== "prg"
        || block.address.offset !== spec.offset || block.address.length !== spec.length
        || block.address.end_exclusive !== spec.offset + spec.length
        || !Array.isArray(block.values) || block.values.length !== spec.length
        || block.values.at(-1) !== 0
        || block.values.slice(0, -1).some(value => !handlerCodes.has(value))
        || new Set(block.values.slice(0, -1)).size !== spec.length - 1)
      throw new TypeError(`${spec.label} 字节范围、行为码或终止符无效`);
  }
  const conveyor = named.get('conveyor-directions').block;
  if (conveyor.address?.space !== "prg" || conveyor.address.offset !== 0x29116
      || conveyor.address.length !== 8 || conveyor.address.end_exclusive !== 0x2911e
      || conveyor.values?.length !== 8
      || conveyor.values.some(value => !Number.isInteger(value) || value < 1 || value > 4))
    throw new TypeError("传送带方向表边界或方向码无效");
  for (const [index, name] of ['lower', 'upper'].entries()) {
    const block = named.get(`elevator-scene-${name}`).block, offset = 0x29216 + index * 5;
    if (block.address?.space !== 'prg'
        || block.address.offset !== offset || block.address.length !== 5
        || block.address.end_exclusive !== offset + 5 || block.values?.length !== 5
        || block.values.some(value => !Number.isInteger(value) || value < 0 || value > 255))
      throw new TypeError('电梯场景范围表边界或值无效');
  }
  return named;
}

const codec = createNamedByteTablesOwner({owner: OWNER, schema: SCHEMA,
  tables: document => {
    const named = checkedBlocks(document);
    return SPECS.map(spec => {
      const {block, index} = named.get(spec.id);
      return {name: spec.id, label: spec.label, length: block.values.length - 1, fragmentId: null,
        pathAt: at => ['blocks', index, 'values', at]};
    }).concat(['lower', 'upper'].map((name, rangeIndex) => {
      const {block, index} = named.get(`elevator-scene-${name}`);
      return {name: block.id.slice(OWNER.length + 1), label: block.label, length: 5,
        fragmentId: block.id, path: ['blocks', index, 'values'],
        labelAt: instance => `实例 ${instance} ${rangeIndex === 0 ? '下界（含）' : '上界（不含）'}`};
    }));
  }});

const describe = document => codec.fieldDescriptions(document).map(field => {
  if (field.fragmentId?.startsWith(`${OWNER}.elevator-scene-`)) return {...field, writeback: undefined};
  const spec = SPECS.find(item => field.entityHandle === `${OWNER}:${item.id}`);
  const index = Number(field.fieldName.slice("value".length));
  if (!spec || !Number.isInteger(index) || index < 0 || index >= spec.length - 1)
    throw new TypeError("地形行为白名单字段位置无效");
  return {...field, sourceAddress: {space: "prg", offset: spec.offset + index,
    length: 1, end_exclusive: spec.offset + index + 1}};
});

function validate(original, overrides) {
  codec.validate(original, overrides);
  const values = new Map(codec.fieldDescriptions(original.document).map(field =>
    [`${field.entityHandle}/${field.fieldName}`, field.defaultValue]));
  for (const entry of overrides || []) values.set(`${entry.entity_handle}/${entry.field_name}`, entry.value);
  for (const spec of SPECS) {
    const codes = Array.from({length: spec.length - 1}, (_, index) =>
      values.get(`${OWNER}:${spec.id}/value${index}`));
    if (codes.some(code => !handlerCodes.has(code)) || new Set(codes).size !== codes.length)
      throw new TypeError(`${spec.label} 只可选有处理器且互不重复的行为码`);
  }
}

export const terrainWhitelistOwner = Object.freeze({
  objects: codec.objects, serializeField: codec.serializeField,
  fieldOwner: Object.freeze({...codec.fieldOwner, describe, validate,
    compilerId: ELEVATOR_PARAMETERS_COMPILER_ID, encode: encodeElevatorParameterFields,
    validatePreimage: validateElevatorParameterPreimage}),
});
export const terrainWhitelistSpecs = Object.freeze(SPECS.map(spec => Object.freeze({...spec})));
export const terrainWhitelistCodes = Object.freeze([...handlerCodes]);
