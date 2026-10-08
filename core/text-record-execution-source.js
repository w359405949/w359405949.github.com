// @editor-module 文本字段对象向执行器提供当前记录流与动态字符串流。
import {textRecord, textRecordNodeId, TEXT_CONTROL_CODES, fixedRuntimeTextScriptHex} from "./text-record-project.js";

const hex = value => value.toString(16).toUpperCase().padStart(2, "0");
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
export function createTextRecordExecutionSource({readDocument, catalog}) {
  const locations = new Map((catalog?.records || []).map(record => [record.node_id, record]));
  const regions = new Map((catalog?.regions || []).map(region => [region.id, region]));
  const runtime = new Map();
  let sequence = 0;
  const open = reference => {
    if (runtime.has(reference)) return runtime.get(reference);
    const record = textRecord(readDocument(), reference);
    const location = locations.get(reference), region = regions.get(record?.region_id);
    if (!record || !location || !region) throw new TypeError(`text-record-source:${reference}`);
    return {bytes: record.bytes, pointer: region.cpu_entry + location.prg_offset - region.prg_offset,
      bank: region.bank_8k, region: region.id, index: record.id};
  };
  return Object.freeze({
    record: textRecordNodeId,
    runtime(source) {
      if (typeof source.readByte === "function") {
        if (!Number.isInteger(source.pointer) || source.pointer < 0 || source.pointer > 65535)
          throw new TypeError("runtime-text-source-pointer");
        const reference = `runtime-text:${++sequence}`;
        runtime.set(reference, source);
        return reference;
      }
      const bytes = fixedRuntimeTextScriptHex(source).trim().split(/\s+/).map(value => Number.parseInt(value, 16));
      if (!bytes.length || bytes.some(value => !Number.isInteger(value))) throw new TypeError("runtime-text-source");
      const reference = `runtime-text:${++sequence}`;
      if (!Number.isInteger(source.pointer) || source.pointer < 0 || source.pointer > 65535)
        throw new TypeError("runtime-text-source-pointer");
      runtime.set(reference, {bytes, pointer: source.pointer});
      return reference;
    },
    pointer(reference, offset) {return (open(reference).pointer + offset) & 65535;},
    location(reference) {
      const {bank, region, index} = open(reference);
      return {bank, region, index};
    },
    read: (reference, offset, rawMode = false, repeat = false) => instruction(reference, offset, rawMode, repeat),
    dispatch: (reference, offset, token) => instruction(reference, offset, false, false, token),
  });
  function instruction(reference, offset, rawMode, repeat, dispatched) {
    const source = open(reference);
    const readByte = at => source.readByte ? source.readByte(at) : source.bytes[at];
    const token = dispatched ?? readByte(offset);
    if (!byte(token)) {
      if (source.readByte) return {kind: "unavailable", missing: ["text-provider-string"]};
      throw new TypeError(`text-stream-end:${reference}:${offset}`);
    }
    let kind = "literal", length = 1, operands = [], glyph = null;
    if (repeat) {
      if (token >= 0xE2 && token < 0xFF) {
        kind = "control";
        length += TEXT_CONTROL_CODES.get(token)?.[1].length || 0;
      }
    } else if (token === 0x9F && dispatched === undefined) kind = "end";
    else if (rawMode) {
      if ([0x63, 0x43, 0x8C, 0x9E].includes(token)) {
        kind = "control";
        length += ({0x63: 0, 0x43: 1, 0x8C: 2, 0x9E: 1})[token];
      }
    } else if (token >= 0x24 && token < 0x35) {
      kind = token < 0x2F ? "glyph" : "glyph-control";
      length = 2;
    } else if (token >= 0xE2 && token < 0xFF || token === 0x42) {
      kind = "control";
      length += TEXT_CONTROL_CODES.get(token)?.[1].length || 0;
    }
    const operandOffset = offset + (dispatched === undefined ? 1 : 0);
    operands = Array.from({length: length - 1}, (_, index) => readByte(operandOffset + index));
    if (operands.some(value => !byte(value))) {
      if (source.readByte) return {kind: "unavailable", missing: ["text-provider-string"]};
      throw new TypeError(`text-token-end:${reference}:${offset}`);
    }
    if (kind === "glyph") glyph = `font-glyph:${hex(token)}:${hex(operands[0])}`;
    if (dispatched !== undefined) length--;
    return {reference, offset, token, kind, length, operands, glyph};
  }
}
