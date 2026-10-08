// @editor-module 应用片段只含逻辑目录与程序字节。
export const APPLICATION_PROGRAM_SCHEMA = 'metalmaxcn.field-ui-module.asset.application-program';
export const EXTENDED_APPLICATION_COMMANDS = Object.freeze(Array.from({length: 199}, (_, index) => index + 0x39));
export const EXTENDED_APPLICATION_SELECTOR = 0x3F;
export const applicationCommandId = command => {
  if (!Number.isInteger(command) || command < 0x10 || command > 0xFF) throw new TypeError('应用命令编号无效');
  return `application-command:${command.toString(16).toUpperCase().padStart(2, '0')}`;
};
export const applicationProgramId = index => `application-program:${index.toString(16).toUpperCase().padStart(2, '0')}`;
export const applicationProgramFragment = id => `${id}.slot`;
export const applicationEntryFragments = command => {
  const id = applicationCommandId(command);
  return [id, `${id}.pointer`, `${id}.directory`];
};
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`应用程序链接：${message}`);};
export const readApplicationWord = (bytes, offset) => bytes[offset] | bytes[offset + 1] << 8;
const writeApplicationWord = (bytes, offset, value) => {
  bytes[offset] = value & 255; bytes[offset + 1] = value >> 8;
};
export const applicationOperandWidths = new Map([[0xCB, 1], [0xD1, 1], [0xD2, 2], [0xD4, 2],
  ...[0xD5, 0xD9, 0xDB, 0xDC, 0xDE, 0xDF, 0xE0, 0xE4, 0xEA].map(op => [op, 2]), [0xF7, 3]]);
export const applicationNoOperands = new Set([0x93, 0x99, 0x9A, 0x9B, 0x9C, 0x9D,
  0xAE, 0xB3, 0xB4, 0xB5, 0xBA, 0xBB, 0xBF, 0xC3, 0xC8, 0xFE, 0xFF]);

export function applicationProgramSlot(logical) {
  requireValue(logical.bytes.length <= 3584, '程序超过 3584 字节容量');
  const payload = new Uint8Array(4096);
  payload.fill(255, 0, 512);
  logical.segmentOffsets.forEach((offset, index) => writeApplicationWord(payload, index * 2, offset));
  payload.set(logical.bytes, 512);
  return payload;
}

export function validateApplicationProgramSlot(payload, {count, length, prefix, native_handlers}) {
  requireValue(payload.length === 4096 && Number.isInteger(count) && count > 0 && count <= 254
    && Number.isInteger(length) && length > 1 && length <= 3584, '段数或容量越界');
  requireValue(payload[512] === prefix && payload.subarray(512 + length).every(byte => byte === 0), '前缀或有效长度外填充不同');
  const offsets = Array.from({length: count}, (_, index) => readApplicationWord(payload, index * 2));
  requireValue(offsets[0] === 1 && offsets.every((offset, index) => offset < length
    && (!index || offset > offsets[index - 1]))
    && Array.from({length: 256 - count}, (_, index) => readApplicationWord(payload, (count + index) * 2))
      .every(offset => offset === 65535), '错误段边界或保留目录不同');
  const branch = (value, endAllowed = true) => requireValue(value < count || endAllowed && value >= 0xFE, '去向超出段目录');
  for (const [index, start] of offsets.entries()) {
    let cursor = 512 + start, end = 512 + (offsets[index + 1] ?? length), terminal = false;
    while (cursor < end) {
      requireValue(!terminal, '段边界包含结束后的指令');
      const opcode = payload[cursor++];
      if (opcode < 0x8F) continue;
      if (opcode === 0x8F) {
        let size = 0;
        while (cursor < end && payload[cursor] < 0xFE) {branch(payload[cursor++]); size++;}
        requireValue(size > 0 && size <= 128 && cursor === end - 1 && payload[cursor++] >= 0xFE,
          '索引表长度或段边界错误');
        terminal = true; continue;
      }
      const width = applicationOperandWidths.get(opcode) ?? (applicationNoOperands.has(opcode) ? 0 : undefined);
      requireValue(width !== undefined && cursor + width <= end, '错误段边界或未声明指令');
      if (opcode === 0xD2) requireValue(native_handlers.includes(readApplicationWord(payload, cursor)), '原生处理器未许可');
      if (opcode === 0xCB) requireValue(payload[cursor] < 20, '正文来源槽含未确认的消费');
      if (opcode === 0xD1) branch(payload[cursor], false);
      else if (opcode >= 0xD5 && opcode < 0xFE) {
        for (let operand = opcode === 0xF7 ? 1 : 0; operand < width; operand++) branch(payload[cursor + operand]);
      }
      cursor += width;
      terminal = opcode === 0xD1 || opcode >= 0xD5;
    }
    requireValue(cursor === end && terminal, '错误段边界或缺少结束指令');
  }
  return offsets;
}
