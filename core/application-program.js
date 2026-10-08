// @editor-module 应用程序的段引用、借用读取与逻辑序列化。
import {ROM_WRITE_PENDING, validateFieldOverrides} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';
import {applicationOperandWidths as widths, applicationNoOperands as noOperands,
  applicationProgramId, EXTENDED_APPLICATION_COMMANDS} from './application-program-format.js';

const APPLICATION_PROGRAM_RESOURCE_ID = 'application-program';
const SHOP_PROGRAM_HANDLE = 'application-program:00';
export const APPLICATION_PROGRAM_COMPILER = 'application-program/v1';
const PROGRAM_WRITE = Object.freeze({target: 'rom', state: 'permitted', compiler_id: APPLICATION_PROGRAM_COMPILER});
const require = (condition, message) => {if (!condition) throw new TypeError(message);};
const byte = value => {
  require(Number.isInteger(value) && value >= 0 && value <= 255, '应用程序字节无效');
  return value;
};
const hex = value => value.toString(16).toUpperCase().padStart(2, '0');
const segmentHandle = index => `${SHOP_PROGRAM_HANDLE}:${hex(index)}`;
const branch = (value, count) => {
  if (value >= 0xFE) return {kind: 'end', value};
  require(value < count, '应用程序去向不在声明段内');
  return {kind: 'segment', target: segmentHandle(value)};
};

export function readApplicationProgram({source, declaration, readByte}) {
  require(source.resource_id === APPLICATION_PROGRAM_RESOURCE_ID
    && declaration.resource_id === APPLICATION_PROGRAM_RESOURCE_ID
    && declaration.program_handle === SHOP_PROGRAM_HANDLE, '应用程序身份无效');
  require(typeof source.raw_hex === 'string' && /^(?:[0-9A-F]{2})(?: [0-9A-F]{2})*$/.test(source.raw_hex),
    '应用程序源字节无效');
  const raw = Uint8Array.from(source.raw_hex.split(' ').map(token => Number.parseInt(token, 16)));
  require(raw.length === declaration.length, '应用程序源长度无效');
  const count = declaration.segments.length;
  let cursor = 1;
  const segments = declaration.segments.map((range, index) => {
    require(range.index === index && range.offset === cursor && range.length > 0,
      '应用程序段声明不连续');
    const end = cursor + range.length;
    const instructions = [];
    while (cursor < end) {
      const opcode = byte(raw[cursor++]);
      if (opcode < 0x8F) {
        instructions.push({kind: 'text', record: `text-record:06:${opcode.toString(16).toUpperCase().padStart(3, '0')}`});
        continue;
      }
      if (opcode === 0x8F) {
        const targets = [];
        while (cursor < end - 1) targets.push(branch(byte(raw[cursor++]), count));
        const terminator = byte(raw[cursor++]);
        require(terminator >= 0xFE, '应用程序索引表缺结束字节');
        instructions.push({kind: 'indexed-branches', targets, terminator});
        continue;
      }
      require(widths.has(opcode) || noOperands.has(opcode), '样例未声明此应用指令');
      if (opcode === 0xD2) {
        const address = byte(raw[cursor++]) | (byte(raw[cursor++]) << 8);
        const handler = declaration.native_handlers.find(row => row.cpu_address === address);
        require(handler, '应用程序原生入口未声明');
        instructions.push({kind: 'native-call', handler: handler.id});
        continue;
      }
      const operands = Array.from({length: widths.get(opcode) || 0}, (_, position) => {
        const offset = cursor++;
        const borrowed = declaration.borrowed_reads.find(row => row.program_offset === offset);
        if (borrowed) return {kind: 'borrowed-byte', reference: structuredClone(borrowed.reference)};
        const value = byte(raw[offset]);
        if (opcode === 0xD1 || opcode >= 0xD5 && opcode !== 0xF7 || opcode === 0xF7 && position > 0)
          return branch(value, count);
        return {kind: opcode === 0xCB ? 'runtime-text-slot' : 'parameter', value};
      });
      instructions.push({kind: 'opcode', opcode, operands});
    }
    require(cursor === end, '应用程序指令跨越声明段边界');
    return {id: segmentHandle(index), instructions};
  });
  require(cursor === raw.length + declaration.borrowed_reads.length, '应用程序读取范围无效');
  const document = {id: SHOP_PROGRAM_HANDLE, prefix: byte(raw[0]), segments,
    native_handlers: structuredClone(declaration.native_handlers),
    extra_reads: structuredClone(declaration.extra_reads),
    source: structuredClone(source.address),
    segment_sources: declaration.segments.map(row => ({offset: source.address.offset + row.offset,
      length: Math.min(row.length, raw.length - row.offset)})),
    confirmation_status: 'confirmed', confirmed_scope: 'byte-ownership-and-local-script-consumption',
    runtime_execution_confirmed: false,
    structure: {order: declaration.segments.map((_, index) => segmentHandle(index)), added: []},
    independent_programs: []};
  const rebuilt = serializeApplicationProgram(document, {resolveBorrowedByte: reference =>
    readByte(reference)}).bytes;
  require(rebuilt.length === cursor && raw.every((value, index) => rebuilt[index] === value),
    '应用程序字段不能还原源字节');
  return document;
}

function serializeApplicationProgram(document, {resolveBorrowedByte, relocateBorrowed = false} = {}) {
  require(/^application-program:[0-9A-F]{2}$/.test(document?.id) && Array.isArray(document.segments)
    && document.segments.length > 0 && document.segments.length <= 254, '应用程序段集合无效');
  const indices = new Map(document.segments.map((segment, index) => [segment.id, index]));
  require(indices.size === document.segments.length && [...indices.keys()].every(id =>
    new RegExp(`^${document.id}:[0-9A-F]{2}$`).test(id)), '应用程序段身份重复或无效');
  const valueOf = operand => {
    if (operand?.kind === 'segment') {
      require(indices.has(operand.target), '应用程序段引用悬空');
      return indices.get(operand.target);
    }
    if (operand?.kind === 'borrowed-byte') {
      require(typeof resolveBorrowedByte === 'function', '应用程序缺借用字节提供方');
      const value = byte(resolveBorrowedByte(operand.reference));
      if (!relocateBorrowed) return value;
      const target = `${document.id}:${hex(value)}`;
      require(indices.has(target), '应用程序借用去向悬空');
      return indices.get(target);
    }
    require(['parameter', 'runtime-text-slot', 'end'].includes(operand?.kind), '应用程序字段种类无效');
    require(operand.kind !== 'end' || operand.value >= 0xFE, '应用程序结束值无效');
    return byte(operand.value);
  };
  const bytes = [byte(document.prefix)], segmentOffsets = [];
  for (const segment of document.segments) {
    segmentOffsets.push(bytes.length);
    require(Array.isArray(segment.instructions) && segment.instructions.length > 0, '应用程序段为空');
    for (const instruction of segment.instructions) {
      if (instruction.kind === 'text') {
        require(/^text-record:06:0[0-9A-F]{2}$/.test(instruction.record), '应用程序文字引用无效');
        const value = Number.parseInt(instruction.record.split(':')[2], 16);
        require(value <= 0x8E, '应用程序文字超出字面值域');
        bytes.push(value);
      } else if (instruction.kind === 'indexed-branches') {
        require(Array.isArray(instruction.targets) && instruction.targets.length > 0
          && instruction.targets.length <= 128 && instruction.terminator >= 0xFE,
        '应用程序索引表无效');
        require(instruction.targets.every(target => ['segment', 'end'].includes(target.kind)),
          '应用程序索引表去向无效');
        bytes.push(0x8F, ...instruction.targets.map(valueOf), byte(instruction.terminator));
      } else if (instruction.kind === 'native-call') {
        const handler = document.native_handlers.find(row => row.id === instruction.handler);
        require(handler && Number.isInteger(handler.cpu_address)
          && handler.cpu_address >= 0 && handler.cpu_address <= 65535, '应用程序原生入口无效');
        bytes.push(0xD2, handler.cpu_address & 255, handler.cpu_address >> 8);
      } else {
        const opcode = instruction.opcode;
        require(instruction.kind === 'opcode' && (widths.has(opcode) || noOperands.has(opcode))
          && opcode !== 0xD2 && Array.isArray(instruction.operands)
          && instruction.operands.length === (widths.get(opcode) || 0), '应用程序指令参数无效');
        instruction.operands.forEach((operand, position) => {
          const isBranch = opcode === 0xD1 || opcode >= 0xD5 && opcode !== 0xF7
            || opcode === 0xF7 && position > 0;
          require(isBranch ? (opcode === 0xD1 ? ['segment', 'borrowed-byte'] : ['segment', 'end']).includes(operand.kind)
            : operand.kind === (opcode === 0xCB ? 'runtime-text-slot' : 'parameter'),
          '应用程序参数语义无效');
        });
        bytes.push(opcode, ...instruction.operands.map(valueOf));
      }
    }
  }
  for (const read of document.extra_reads || []) {
    const segment = document.segments.find(row => row.id === read.byte_reference.segment);
    const instruction = segment?.instructions[read.byte_reference.instruction];
    require(instruction?.kind === 'text' && read.byte_reference.field === 'record',
      '应用程序附加读取引用失效');
  }
  return {id: `${document.id}.program`, bytes: Uint8Array.from(bytes), segmentOffsets};
}

function describe(document) {
  require(document?.id === SHOP_PROGRAM_HANDLE, '应用程序字段身份无效');
  return [{resourceId: APPLICATION_PROGRAM_RESOURCE_ID, entityHandle: document.id,
    fieldName: 'prefix', defaultValue: document.prefix, documentPath: ['prefix'],
    sourceAddress: {space: 'prg', offset: document.source.offset, length: 1,
      end_exclusive: document.source.offset + 1}, writeback: ROM_WRITE_PENDING},
  ...document.segments.map((segment, index) => ({resourceId: APPLICATION_PROGRAM_RESOURCE_ID,
    entityHandle: document.id, fieldName: `segment:${segment.id.split(':').at(-1)}`,
    defaultValue: segment.instructions, documentPath: ['segments', index, 'instructions'],
    sourceAddress: {space: 'prg', ...document.segment_sources[index],
      end_exclusive: document.segment_sources[index].offset + document.segment_sources[index].length},
    writeback: PROGRAM_WRITE})),
  ...['structure', 'independent_programs'].map(fieldName => ({resourceId: APPLICATION_PROGRAM_RESOURCE_ID,
    entityHandle: document.id, fieldName, defaultValue: document[fieldName], documentPath: [fieldName],
    sourceAddress: {space: 'prg', offset: document.source.offset, length: 0,
      end_exclusive: document.source.offset}, writeback: PROGRAM_WRITE}))];
}

export function currentApplicationPrograms(document) {
  require(document.structure && Object.keys(document.structure).sort().join() === 'added,order'
    && Array.isArray(document.structure.order) && Array.isArray(document.structure.added)
    && Array.isArray(document.independent_programs), '应用程序结构字段无效');
  for (const program of document.independent_programs) require(Object.keys(program).sort().join() === 'id,prefix,segments'
    && /^application-program:[0-9A-F]{2}$/.test(program.id)
    && Number.parseInt(program.id.slice(-2), 16) > 0 && Number.parseInt(program.id.slice(-2), 16) < 60,
    '独立应用程序声明无效');
  const byId = new Map([...document.segments, ...document.structure.added].map(segment => [segment.id, segment]));
  require(byId.size === document.segments.length + document.structure.added.length
    && new Set(document.structure.order).size === document.structure.order.length, '应用程序段身份重复');
  const segments = document.structure.order.map(id => {
    require(byId.has(id), '应用程序段顺序引用悬空');
    return byId.get(id);
  });
  return [{...document, segments}, ...document.independent_programs.map(program => applicationProgramWithMetadata(document, program))];
}

export function applicationProgramWithMetadata(document, program) {
  return {...document, ...program,
    extra_reads: document.extra_reads.map(read => JSON.parse(JSON.stringify(read).replaceAll(document.id, program.id)))
      .filter(read => program.segments.some(segment => segment.id === read.instruction_segment))};
}

export function allocateExtendedApplicationProgram(document, commands, input, requestedCommand = null) {
  require(Array.isArray(commands) && commands.length === 199 && commands.every((row, index) =>
    row.command_id === EXTENDED_APPLICATION_COMMANDS[index]), '扩展命令目录不完整');
  const lastCommand = Math.max(0x38, ...commands.filter(row => row.program_reference !== null)
    .map(row => row.command_id));
  const command = requestedCommand ?? lastCommand + 1;
  require(EXTENDED_APPLICATION_COMMANDS.includes(command), '扩展命令编号非法或目录已满');
  require(commands.find(row => row.command_id === command).program_reference === null, '扩展命令已分配');
  const programs = currentApplicationPrograms(document);
  const index = Math.max(...programs.map(program => Number.parseInt(program.id.slice(-2), 16))) + 1;
  require(index < 60, '应用程序分配超过 60 槽');
  const id = applicationProgramId(index);
  require(input?.prefix === 12 && Array.isArray(input.segments), '扩展程序格式无效');
  const program = {id, prefix: input.prefix,
    segments: JSON.parse(JSON.stringify(input.segments).replaceAll(input.id, id))};
  const metadata = applicationProgramWithMetadata(document, program);
  serializeApplicationProgram(metadata, {resolveBorrowedByte: () => 0x1D, relocateBorrowed: true});
  return {command, program};
}

export function newApplicationProgram() {
  return {id: SHOP_PROGRAM_HANDLE, prefix: 12, segments: [{id: `${SHOP_PROGRAM_HANDLE}:00`, instructions: [
    {kind: 'text', record: 'text-record:06:05E'}, {kind: 'opcode', opcode: 0xFE, operands: []}]}]};
}

export function appendApplicationProgramChoice(program) {
  const entry = program.segments.find(segment => segment.instructions.at(-1)?.opcode === 0xFE);
  require(entry, '选择须接在返回段之后');
  const ids = Array.from({length: 254}, (_, index) => `${program.id}:${hex(index)}`)
    .filter(id => !program.segments.some(segment => segment.id === id)).slice(0, 5);
  require(ids.length === 5, '段目录已满');
  const [menu, table, ...branches] = ids;
  entry.instructions.splice(-1, 1, {kind: 'opcode', opcode: 0xD1, operands: [{kind: 'segment', target: menu}]});
  program.segments.push({id: menu, instructions: [
    {kind: 'opcode', opcode: 0xD4, operands: [{kind: 'parameter', value: 49}, {kind: 'parameter', value: 138}]},
    {kind: 'opcode', opcode: 0xF7, operands: [{kind: 'parameter', value: 0},
      {kind: 'segment', target: table}, {kind: 'segment', target: branches[2]}]}]},
  {id: table, instructions: [{kind: 'indexed-branches', targets: branches.map(target => ({kind: 'segment', target})),
    terminator: 0xFE}]}, ...branches.map(id => ({id, instructions: [
    {kind: 'text', record: 'text-record:06:05E'}, {kind: 'opcode', opcode: 0xFE, operands: []}]})));
  return program;
}

function independentApplicationProgram(document, id) {
  require(/^application-program:[0-9A-F]{2}$/.test(id) && id !== document.id, '独立应用程序身份无效');
  const program = currentApplicationPrograms(document)[0];
  return {id, prefix: program.prefix,
    segments: JSON.parse(JSON.stringify(program.segments).replaceAll(document.id, id))};
}

export const applicationProgramFieldOwner = Object.freeze({compilerId: APPLICATION_PROGRAM_COMPILER,
  physicalWriteback: false, writeback: ROM_WRITE_PENDING, documentView: true,
  serializeLogical: serializeApplicationProgram,
  createIndependent: independentApplicationProgram,
  describe, objects: document => [{id: document.id, label: '商店程序', fragmentIds: [],
    fields: describe(document).map(field => [field.entityHandle, field.fieldName])}],
  validate: (original, overrides) => validateFieldOverrides(original, overrides, describe,
    (candidate, baseline) => {
      const expected = structuredClone(baseline);
      expected.document.prefix = candidate.document.prefix;
      expected.document.segments.forEach((segment, index) => {
        segment.instructions = candidate.document.segments[index].instructions;
      });
      expected.document.structure = candidate.document.structure;
      expected.document.independent_programs = candidate.document.independent_programs;
      require(canonicalJsonEqual(candidate, expected), '应用程序结构声明不可改写');
      const references = baseline.document.segments.flatMap(segment => segment.instructions)
        .flatMap(instruction => instruction.operands || []).filter(operand => operand.kind === 'borrowed-byte')
        .map(operand => operand.reference);
      const programs = currentApplicationPrograms(candidate.document);
      require(programs.length <= 60 && new Set(programs.map(program => program.id)).size === programs.length,
        '应用程序分配超过 60 槽或身份重复');
      for (const program of programs) serializeApplicationProgram(program, {resolveBorrowedByte: reference => {
        require(references.some(original => canonicalJsonEqual(original, reference)), '应用程序借用引用不可改写');
        return 0x1D;
      }});
    }),
  encode: () => [],
});
