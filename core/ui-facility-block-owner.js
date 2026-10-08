// @editor-module 设施物理块与可写电梯场景基值的字段对象。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";
import {ELEVATOR_PARAMETERS_COMPILER_ID, encodeElevatorParameterFields,
  validateElevatorParameterPreimage} from './elevator-parameters.js';

const OWNER = "ui-facility";
const require = (valid, message) => {if (!valid) throw new TypeError(message);};

function tables(document) {
  require(Array.isArray(document?.blocks) && document.blocks.length,
    "设施物理块未发布");
  return document.blocks.map((block, position) => {
    require(typeof block?.id === "string" && block.id.startsWith(`${OWNER}.`)
      && typeof block.label === "string" && Array.isArray(block.values)
      && block.address?.space === "prg" && block.address.length === block.values.length,
    "设施物理块身份或地址无效");
    return {name: block.id.slice(OWNER.length + 1), label: block.label,
      length: block.values.length,
      fragmentId: block.id === 'ui-facility.elevator-scene-bases' ? block.id : null,
      ...(block.id === 'ui-facility.elevator-scene-bases'
        ? {labelAt: index => `实例 ${index} 场景基值`} : {}),
      path: ["blocks", position, "values"]};
  });
}

const codec = createNamedByteTablesOwner({owner: OWNER,
  schema: "metalmaxcn.field-ui-module.asset.ui-facility",
  tables, writeback: ROM_WRITE_PENDING});

export const uiFacilityBlockFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: ELEVATOR_PARAMETERS_COMPILER_ID,
  describe: document => codec.fieldDescriptions(document).map(field => {
    if (field.fragmentId === 'ui-facility.elevator-scene-bases') return {...field, writeback: undefined};
    const block = document.blocks[field.documentPath[1]], index = Number(field.fieldName.slice(5));
    const offset = block.address.offset + index;
    return {...field, sourceAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1}};
  }),
  encode: encodeElevatorParameterFields, validatePreimage: validateElevatorParameterPreimage});
export const uiFacilityBlockObjects = codec.objects;
export const serializeUiFacilityBlockField = codec.serializeField;

// A130 按 A140 的实例基值减去选单位置选择场景。
export function uiFacilityElevatorDestinationScene(document, instance, selection) {
  const base = uiFacilityElevatorSceneBase(document, instance);
  require(Number.isInteger(selection) && selection >= 0 && selection < 256,
    '电梯选单位置无效');
  return (base - selection) & 255;
}

export function uiFacilityElevatorSceneBase(document, instance) {
  const block = document?.blocks?.find(row => row.id === 'ui-facility.elevator-scene-bases');
  const base = block?.values?.[instance];
  require(Number.isInteger(instance) && instance >= 0 && instance < 5
    && Number.isInteger(base) && base >= 0 && base <= 255, '电梯目标场景基值未发布');
  return base;
}
