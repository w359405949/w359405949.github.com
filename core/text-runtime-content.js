// @editor-module 文本提供器从所属现场读取当前字节，内联控制只写所属字段。
const byte = value => Number.isInteger(value) && value >= 0 && value <= 255;
const unavailable = missing => ({status: "unavailable", missing: [missing]});

export function createTextRuntimeContentServices({state, providerCatalog}) {
  const providers = new Map((providerCatalog?.providers || []).map(row => [row.id, row.cpu_address]));
  const readByte = address => state.readCurrentByte(address);
  const read = id => {
    const field = state.field(id);
    if (field.knowledge !== "confirmed" || field.value === null) throw new TypeError(id);
    return field.value;
  };
  const write = (id, value) => {state.field(id).value = value;};
  return Object.freeze({
    resolveProvider({instruction, valueType}) {
      const {token, operands} = instruction;
      const pointer = token === 0xE9 ? 0x00E2 : token === 0xE8 ? 0x051D
        : token === 0xE2 ? 0x00DF : providers.get(operands[0]);
      if (!Number.isInteger(pointer)) return unavailable("text-provider-source");
      if (valueType === "unsigned-integer") {
        const width = token === 0xE2 ? 3 : (operands[1] & 15) + 1;
        if (width > 3) return unavailable("text-provider-number-width");
        const bytes = Array.from({length: width}, (_, index) => readByte(pointer + index));
        if (bytes.includes(null)) return unavailable("text-provider-number");
        return {status: "available", value: bytes.reduce((value, part, index) => value + part * 256 ** index, 0)};
      }
      if (valueType === "text-record-ref") {
        const record = readByte(pointer);
        if (record === null) return unavailable("text-provider-record");
        if (record === 255) return {status: "available", empty: true};
        const region = readByte(pointer + 1);
        if (region === null) return unavailable("text-provider-region");
        return {status: "available", value: {region, record}};
      }
      if (readByte(pointer) === null) return unavailable("text-provider-string");
      return {status: "available", value: {pointer,
        readByte: offset => readByte((pointer + offset) & 65535)}};
    },
    controlGlyph({instruction}) {
      const {token, operands} = instruction;
      if (token < 0x2F || token > 0x34 || !byte(operands[0])) return unavailable("text-glyph-control");
      write("glyph.addressLow", token - 0x24);
      write("glyph.addressHigh", operands[0]);
      const mark = (offset, value) => {
        const tiles = [...read("display.logicalTiles")];
        tiles[offset] = value; write("display.logicalTiles", tiles);
      };
      if (token === 0x2F) {
        mark(0x30, 0xFA);
        const pools = [...read("glyph.pools")];
        pools[1] = ((read("text.streamPointer") - 1) & 255) === 0x6E ? 0x26
          : (read("text.outputPointer") & 255) === 0x64 ? 0x16 : 0x3B;
        write("glyph.pools", pools);
      } else if (token === 0x30) mark(0x255, 0xFD);
      else if (token === 0x31 || token === 0x32) {
        const pools = [...read("glyph.pools")]; pools[0] = 0x60; write("glyph.pools", pools);
        mark(token === 0x31 ? 0x395 : 0x38B, token === 0x31 ? 0xF8 : 0xF7);
      } else if (token === 0x33) {
        write("control.displayProfile", 1); write("display.ppuMaskShadow", 0x0E);
      } else write("text.command", 3);
      return {status: "available", rewind: token === 0x2F || token === 0x30,
        redispatch: token === 0x30};
    },
  });
}
