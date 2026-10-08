// @editor-module 应用命令处理体与私有表按声明的字节块提供字段控件。
import {ROM_WRITE_PENDING} from "./field-codec.js";
import {createNamedByteTablesOwner} from "./named-byte-tables-owner.js";
import {VEHICLE_TRADE_COMPILER_ID, VEHICLE_TRADE_TABLES, encodeVehicleTradeFields,
  validateVehicleTradePreimage} from './vehicle-trade-parameters.js';

const APPLICATION_COMMAND_OWNER = "application-command";
const APPLICATION_COMMAND_SCHEMA = "metalmaxcn.field-ui-module.asset.application-command";

// 表随文档声明的块走：一块连续字节一个字段对象，标签取块的既有标签。
function tables(document) {
  if (!Array.isArray(document?.blocks) || !document.blocks.length) {
    throw new TypeError("应用命令文档必须声明块");
  }
  return document.blocks.map((block, position) => {
    if (typeof block?.id !== "string" || !block.id.startsWith(`${APPLICATION_COMMAND_OWNER}.`)
      || typeof block.label !== "string" || !Array.isArray(block.values)) {
      throw new TypeError("应用命令块身份或取值无效");
    }
    const trade = VEHICLE_TRADE_TABLES.some(row => row.fragmentId === block.id);
    return {name: trade ? `2C:${block.id.endsWith('price-codes') ? '00' : '01'}`
      : block.id.slice(APPLICATION_COMMAND_OWNER.length + 1), label: block.label,
      length: block.values.length, fragmentId: trade ? block.id : null,
      ...(trade ? {labelAt: index => `档位 ${index + 1}`} : {}),
      path: ["blocks", position, "values"]};
  });
}

const codec = createNamedByteTablesOwner({owner: APPLICATION_COMMAND_OWNER,
  schema: APPLICATION_COMMAND_SCHEMA, tables, writeback: ROM_WRITE_PENDING});

export function applicationCommandObjects(document, options) {
  return codec.objects(document, options).map(object => object.id === 'application-command:2C:00'
    ? {...object, editor: {...object.editor,
      columns: object.editor.columns.map(column => ({...column, max: 0xE8}))}} : object);
}
export const serializeApplicationCommandField = codec.serializeField;
export const applicationCommandFieldOwner = Object.freeze({...codec.fieldOwner,
  compilerId: VEHICLE_TRADE_COMPILER_ID,
  describe: document => codec.fieldDescriptions(document).map(field => {
    const block = document.blocks[field.documentPath[1]], index = Number(field.fieldName.slice(5));
    const offset = block.address.offset + index;
    return {...field, sourceAddress: {space: 'prg', offset, length: 1, end_exclusive: offset + 1},
      ...(VEHICLE_TRADE_TABLES.some(row => row.fragmentId === block.id) ? {writeback: undefined} : {})};
  }),
  encode: encodeVehicleTradeFields, validatePreimage: validateVehicleTradePreimage});
