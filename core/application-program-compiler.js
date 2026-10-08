// @editor-module 应用当前值序列化后按绑定生成原子链接片段。
import {applicationProgramFieldOwner, currentApplicationPrograms, APPLICATION_PROGRAM_COMPILER} from './application-program.js';
import {APPLICATION_READER_ID, APPLICATION_READER_COMPILER, applicationScriptReaderFieldOwner} from './application-script-reader-owner.js';
import {APPLICATION_PROGRAM_SCHEMA, applicationProgramFragment, applicationEntryFragments,
  applicationProgramSlot, validateApplicationProgramSlot, EXTENDED_APPLICATION_COMMANDS} from './application-program-format.js';
import {BUNDLE_SCHEMA, canonicalHash, sha256Hex} from './rom-linker.js';
import {canonicalJsonEqual} from './project-store-values.js';
import {fieldRomValue} from './field-codec.js';
import {textRecordStaticOptionCount} from './text-record-structure.js';
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`应用程序构建：${message}`);};
const withoutDestination = operand => ['segment', 'end'].includes(operand.kind)
  ? {kind: 'destination'} : operand;
const withoutDestinations = instructions => instructions.map(instruction => ({...instruction,
  ...(instruction.operands ? {operands: instruction.operands.map(withoutDestination)} : {}),
  ...(instruction.targets ? {targets: instruction.targets.map(withoutDestination)} : {})}));

export function validateApplicationProgramEdit(program, origin, {text, selection}) {
  requireValue(program.prefix === origin.prefix, '应用程序前缀未开放');
  const normalizeId = segment => JSON.parse(JSON.stringify(segment).replaceAll(program.id, origin.id));
  const originals = new Map(origin.segments.map(segment => [segment.id, segment.instructions]));
  const textRecord = handle => {
    const parts = /^text-record:06:(0[0-9A-F]{2})$/.exec(handle);
    const id = parts && Number.parseInt(parts[1], 16);
    requireValue(id !== null && id <= 0x8E && text.records[`record:06:${String(id).padStart(3, '0')}`],
      '文字引用没有已确认的消费');
  };
  const normalizeInstruction = instruction => {
    if (instruction.kind === 'text') {
      textRecord(instruction.record);
      return {kind: 'text'};
    }
    if (instruction.kind === 'indexed-branches') return {kind: instruction.kind, terminator: instruction.terminator};
    if (instruction.kind === 'opcode' && instruction.opcode === 0xCB) {
      requireValue(instruction.operands[0]?.kind === 'runtime-text-slot'
        && Number.isInteger(instruction.operands[0].value) && instruction.operands[0].value >= 0
        && instruction.operands[0].value < 20, '正文来源槽含未确认的消费');
      return {kind: 'opcode', opcode: 0xCB};
    }
    if (instruction.kind === 'opcode' && instruction.opcode === 0xD4)
      return {kind: 'opcode', opcode: 0xD4};
    return withoutDestinations([instruction])[0];
  };
  for (const segment of program.segments.map(normalizeId)) {
    const original = originals.get(segment.id);
    if (original) requireValue(canonicalJsonEqual(segment.instructions.map(normalizeInstruction), original.map(normalizeInstruction)),
      '指令或原生来源含未确认的消费');
    else requireValue(segment.instructions.length >= 2 && segment.instructions.slice(0, -1)
      .every(instruction => instruction.kind === 'text' && (textRecord(instruction.record), true))
      && segment.instructions.at(-1).kind === 'opcode' && segment.instructions.at(-1).opcode === 0xD1,
      '新增段只能使用已确认文字与跳转');
  }
  const menu = program.segments.find(segment => segment.id === `${program.id}:01`);
  if (menu) {
    const prompt = menu.instructions[0], input = menu.instructions[1];
    const table = program.segments.find(segment => segment.id === input?.operands?.[1]?.target)?.instructions;
    requireValue(prompt?.opcode === 0xD4 && input?.opcode === 0xF7 && input.operands[0].value === 0
      && table?.length === 1 && table[0].kind === 'indexed-branches', '选项生产者与分支表未配对');
    const [record, selector] = prompt.operands.map(operand => operand.value);
    const count = textRecordStaticOptionCount(text, `record:02:${String(record).padStart(3, '0')}`);
    const profile = selection.profiles[selection.selectors.find(row => row.selector === selector)?.profile];
    requireValue(profile?.columns === 1 && profile.capacity === count && count <= 128
      && table[0].targets.length === count, '选项数、选择生产者与表项数不配对');
  }
  for (const read of program.extra_reads) {
    const caller = program.segments.findIndex(segment => segment.id === read.instruction_segment);
    requireValue(caller >= 0 && program.segments[caller + 1]?.id === read.byte_reference.segment,
      '未确认第三去向须保持相邻段读取');
    const source = program.segments[caller + 1].instructions[read.byte_reference.instruction];
    const original = origin.segments.find(segment => segment.id === read.byte_reference.segment.replace(program.id, origin.id))
      ?.instructions[read.byte_reference.instruction];
    requireValue(canonicalJsonEqual(source, original), '未知第三去向消费不得改写文字来源');
  }
}

export function validateExtendedApplicationProgram(program, origin, consumption) {
  requireValue(program.prefix === 12, '扩展程序前缀未开放');
  const encoded = applicationProgramFieldOwner.serializeLogical(program,
    {resolveBorrowedByte: () => 0x1D, relocateBorrowed: true});
  validateApplicationProgramSlot(applicationProgramSlot(encoded), {count: encoded.segmentOffsets.length,
    length: encoded.bytes.length, prefix: 12, native_handlers: origin.native_handlers.map(row => row.cpu_address)});
  const instructions = program.segments.flatMap(segment => segment.instructions);
  const authored = instructions.every(instruction => ['text', 'indexed-branches'].includes(instruction.kind)
    || instruction.kind === 'opcode' && [0xD1, 0xD4, 0xF7, 0xFE, 0xFF].includes(instruction.opcode));
  if (!authored) return validateApplicationProgramEdit(program, origin, consumption);
  const {text, selection} = consumption, tables = new Set();
  for (const segment of program.segments) {
    for (const instruction of segment.instructions) if (instruction.kind === 'text') {
      requireValue(/^text-record:06:0[0-9A-F]{2}$/.test(instruction.record), '正文引用没有已确认的消费');
      const id = Number.parseInt(instruction.record.slice(-3), 16);
      requireValue(id <= 0x8E && text.records[`record:06:${String(id).padStart(3, '0')}`],
        '正文引用没有已确认的消费');
    }
    const prompts = segment.instructions.filter(instruction => instruction.opcode === 0xD4);
    const inputs = segment.instructions.filter(instruction => instruction.opcode === 0xF7);
    if (!prompts.length && !inputs.length) continue;
    const prompt = prompts[0], input = inputs[0];
    requireValue(prompts.length === 1 && inputs.length === 1
      && segment.instructions.at(-2) === prompt && segment.instructions.at(-1) === input
      && input.operands[0]?.kind === 'parameter' && input.operands[0].value === 0
      && prompt.operands.every(operand => operand.kind === 'parameter'), '选择生产者与输入未配对');
    const tableSegment = program.segments.find(row => row.id === input.operands[1]?.target);
    const table = tableSegment?.instructions;
    requireValue(table?.length === 1 && table[0].kind === 'indexed-branches', '选择输入缺分支表');
    const [record, selector] = prompt.operands.map(operand => operand.value);
    const count = textRecordStaticOptionCount(text, `record:02:${String(record).padStart(3, '0')}`);
    const profile = selection.profiles[selection.selectors.find(row => row.selector === selector)?.profile];
    requireValue(profile?.columns === 1 && profile.capacity === count && count <= 128
      && table[0].targets.length === count, '选项数、选择生产者与表项数不配对');
    tables.add(tableSegment.id);
  }
  requireValue(program.segments.every(segment => !segment.instructions.some(row => row.kind === 'indexed-branches')
    || tables.has(segment.id)), '分支表没有已确认的选择生产者');
}

export function applicationProgramInput(binding) {
  requireValue(binding.compiler_id === APPLICATION_PROGRAM_COMPILER
    && binding.input.resource_id === binding.asset_id
    && binding.input.asset_schema === (binding.asset_id === 'application-program'
      ? APPLICATION_PROGRAM_SCHEMA : 'metalmaxcn.field-ui-module.asset.application-command')
    && Array.isArray(binding.input.components) && binding.input.components.length === (binding.asset_id === 'application-program' ? 60
      : EXTENDED_APPLICATION_COMMANDS.includes(Number.parseInt(binding.asset_id.slice(-2), 16)) ? 1 : 2),
    '程序绑定身份不同');
  return binding.input;
}

function applicationBuildState(context) {
  context.applicationBuildState ||= (async () => {
    const policy = context.buildMap.application_farjump;
    requireValue(policy?.programs && policy.active_entries.length === 4, '迁移目标未开放');
    const revision = (await context.repository.getManifest()).active_original_revision_id;
    const database = context.fieldDb, snapshots = [];
    const read = async resourceId => {
      snapshots.push(await database.readBuildFields(resourceId, context.repository, revision));
      return (await database.readResource(resourceId)).value;
    };
    const asset = await read('application-program');
    const snapshot = snapshots[0];
    const origin = structuredClone(asset.document);
    const document = structuredClone(asset.document);
    for (const field of snapshot.fields) {
      const parent = field.documentPath.slice(0, -1).reduce((value, key) => value[key], origin);
      parent[field.documentPath.at(-1)] = structuredClone(field.defaultValue);
      if (field.writeback?.state === 'unpermitted') {
        const current = field.documentPath.slice(0, -1).reduce((value, key) => value[key], document);
        current[field.documentPath.at(-1)] = structuredClone(fieldRomValue(field));
      }
    }
    const borrowed = await read('application-command:24');
    const borrowedByte = Number.parseInt(borrowed.document.dialogue_flow.entry_prefix_hex, 16);
    requireValue(borrowedByte === 0x1D, '借用来源不同');
    const resolveBorrowedByte = reference => {
      requireValue(reference.resource_id === 'application-command:24' && reference.source_id === 'application-command:24'
        && reference.source_relative_offset === 0, '借用读取未声明');
      return borrowedByte;
    };
    const programs = new Map(currentApplicationPrograms(document).map(program => [program.id, program]));
    requireValue(programs.size === document.independent_programs.length + 1 && programs.size <= 60, '程序身份重复或容量越界');
    let consumption;
    const active = [], logical = new Map();
    for (const entry of policy.active_entries) {
      const command = await read(entry.resource_id), handle = command.document.program_reference;
      const program = programs.get(handle);
      const pointer = snapshots.at(-1).fields.find(field => field.fieldName === 'script_pointer_cpu');
      requireValue(program && pointer?.defaultValue === 0xB847, '程序引用悬空或原入口原像不同');
      const isSharedOrigin = handle === origin.id && canonicalJsonEqual(program.segments, origin.segments)
        && program.prefix === origin.prefix;
      if (isSharedOrigin) continue;
      if (!logical.has(handle)) {
        consumption ||= {text: (await read('text-record')).document,
          selection: (await read('selection-layout')).document};
        validateApplicationProgramEdit(program, origin, consumption);
        const encoded = applicationProgramFieldOwner.serializeLogical(program, {resolveBorrowedByte, relocateBorrowed: true});
        const payload = applicationProgramSlot(encoded);
        validateApplicationProgramSlot(payload, {count: encoded.segmentOffsets.length, length: encoded.bytes.length, ...policy.program_contract});
        requireValue(policy.programs.some(row => row.program_id === handle), '程序没有稳定分配槽');
        logical.set(handle, {...encoded, payload});
      }
      active.push({...entry, program: handle});
    }
    requireValue(policy.extended_entries?.length === 199, '扩展目录未开放');
    for (const entry of policy.extended_entries) {
      const command = await read(entry.resource_id), handle = command.document.program_reference;
      if (handle === null) continue;
      const program = programs.get(handle);
      requireValue(program && program.prefix === 12, '扩展程序引用悬空或前缀不同');
      consumption ||= {text: (await read('text-record')).document,
        selection: (await read('selection-layout')).document};
      validateExtendedApplicationProgram(program, origin, consumption);
      if (!logical.has(handle)) {
        const encoded = applicationProgramFieldOwner.serializeLogical(program, {resolveBorrowedByte, relocateBorrowed: true});
        const payload = applicationProgramSlot(encoded);
        validateApplicationProgramSlot(payload, {count: encoded.segmentOffsets.length, length: encoded.bytes.length, ...policy.program_contract});
        requireValue(policy.programs.some(row => row.program_id === handle), '程序没有稳定分配槽');
        logical.set(handle, {...encoded, payload});
      }
      active.push({...entry, program: handle});
    }
    const reader = await read(APPLICATION_READER_ID);
    const actors = await read('scene-actor');
    for (const actor of actors.document.records) if (actor.text_region === 0x3F)
      requireValue(active.some(entry => entry.command === actor.interaction_or_record_id
        && !entry.pointer_slot_id), '角色绑定的扩展命令未分配');
    const readerEnabled = active.some(entry => entry.pointer_slot_id) || actors.document.records
      .some(actor => actor.text_region === 0x3F);
    return {active, logical, reader, readerEnabled, inputHash: await canonicalHash(asset),
      assertCurrent: async () => {for (const snapshot of snapshots) await snapshot.assertCurrent();}};
  })();
  return context.applicationBuildState;
}

export async function compileApplicationPrograms(context, bindings) {
  bindings.forEach(applicationProgramInput);
  const state = await applicationBuildState(context), policy = context.buildMap.application_farjump;
  const fragments = [];
  const fragment = async (owner, id, slotId, payload, relocations = []) => {
    const binding = bindings.find(binding => binding.asset_id === owner), slot = context.slots.get(slotId);
    const component = binding?.input.components.find(component => component.fragment_id === id);
    const source = binding?.sources.find(source => source.slot_id === slotId);
    requireValue(component && source && slot.owner === owner && component.length === slot.capacity
      && source.asset_offset === component.asset_offset && source.length === component.length
      && source.file_offset === slot.file_offset && source.offset_in_slot === 0
      && component.original_sha256 === slot.preimage_sha256, '片段缺完整绑定');
    fragments.push({asset_id: owner, fragment_id: id, slot_id: slotId, payload, payload_sha256: await sha256Hex(payload),
      codec: 'metalmaxcn.application-program', codec_version: '1', alignment: slot.alignment, relocations});
  };
  for (const [handle, logical] of state.logical) {
    const program = policy.programs.find(program => program.program_id === handle);
    await fragment('application-program', applicationProgramFragment(handle), program.slot_id, logical.payload);
  }
  for (const entry of state.active) {
    const program = policy.programs.find(program => program.program_id === entry.program), logical = state.logical.get(entry.program);
    const [id, pointerId, directoryId] = applicationEntryFragments(entry.command);
    if (entry.pointer_slot_id) await fragment(id, pointerId, entry.pointer_slot_id, new Uint8Array(2),
      [{offset: 0, type: 'le16-pointer', target_slot_id: entry.directory_slot_id, target_offset: 0, addend: 0}]);
    const directory = new Uint8Array([255, 0, 0, 0, 0, 0, logical.segmentOffsets.length, 0,
      logical.bytes.length & 255, logical.bytes.length >> 8, 0, 16, 0, 0, 0, 0]);
    await fragment(id, directoryId, entry.directory_slot_id, directory,
      [{offset: 1, type: 'fixed-write', data_hex: context.slots.get(program.slot_id).bank_index.toString(16).padStart(2, '0')},
        {offset: 2, type: 'le16-pointer', target_slot_id: program.slot_id, target_offset: 512, addend: 0},
        {offset: 4, type: 'le16-pointer', target_slot_id: program.slot_id, target_offset: 0, addend: 0}]);
  }
  await state.assertCurrent();
  const bundles = await Promise.all([...new Set(fragments.map(fragment => fragment.asset_id))].map(async id => ({
    schema: BUNDLE_SCHEMA, asset_id: id, encoder: APPLICATION_PROGRAM_COMPILER, encoder_version: '1',
    input_sha256: state.inputHash, fragments: fragments.filter(fragment => fragment.asset_id === id)})));
  return {compiler_id: APPLICATION_PROGRAM_COMPILER, compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(),
    changed_asset_ids: bundles.map(bundle => bundle.asset_id).sort(), bundles};
}

export async function compileApplicationReader(context, bindings) {
  const state = await applicationBuildState(context), fragments = [];
  if (state.readerEnabled) {
    const fields = applicationScriptReaderFieldOwner.describe(state.reader.document).map(field => ({...field, value: true}));
    for (const product of applicationScriptReaderFieldOwner.encode(fields)) {
      const permission = context.buildMap.application_farjump.code.find(row => row.fragment_id === product.fragment_id);
      fragments.push({asset_id: APPLICATION_READER_ID, ...product, slot_id: permission.slot_id,
        payload_sha256: await sha256Hex(product.payload), codec: 'application-reader-code', codec_version: '1', alignment: 1});
    }
  }
  context.workingFieldCoverage ||= new Map();
  context.workingFieldCoverage.set(APPLICATION_READER_ID, fragments.map(fragment =>
    [fragment.fragment_id, fragment.slot_id, undefined, fragment.payload.length]));
  await state.assertCurrent();
  return {compiler_id: APPLICATION_READER_COMPILER, compiled_asset_ids: bindings.map(binding => binding.asset_id).sort(),
    changed_asset_ids: fragments.length ? [APPLICATION_READER_ID] : [],
    bundles: fragments.length ? [{schema: BUNDLE_SCHEMA, asset_id: APPLICATION_READER_ID,
      encoder: APPLICATION_READER_COMPILER, encoder_version: '1', input_sha256: state.inputHash, fragments}] : []};
}
