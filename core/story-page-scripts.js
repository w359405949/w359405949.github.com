// @editor-module 剧情页指令的语义读写与运行投影。
import {projectStoryScriptPrograms} from './story-script-layout.js';
import {storyCommandPresentation} from './story-command-presentation.js';
import {STORY_DIALOGUE_OPERATIONS} from './story-dialogue-operations.js';
import {STORY_PARTY_ITEM_OPERATIONS} from './story-party-item-operations.js';
import {STORY_FIELD_OPERATIONS} from './story-field-operations.js';
import {STORY_BRANCH_OPERATIONS} from './story-preview-conditions.js';
import {fieldOwner} from './field-owners.js';
import {changeArrayFieldWorking, fieldStoredValue} from './field-codec.js';
import {canonicalJsonEqual} from './project-store-values.js';
import {createProjectFieldDraft} from './project-field-draft.js';
import {validateFarjumpPage} from './story-farjump-format.js';

const hex = value => Number(value).toString(16).toUpperCase().padStart(2, '0');
const key = (kind, id) => `${kind}-${hex(id)}`;
const scriptResource = id => ['story-autonomous-script', 'story-interaction-script'].includes(id);
const scriptKind = id => id === 'story-autonomous-script' ? 'autonomous' : 'interaction';
const handle = (name, value) => `${name}:${hex(value)}`;
const referenceValue = value => typeof value === 'string' ? parseInt(value.split(':').at(-1), value.startsWith('record:') ? 10 : 16) : value;

export function createStoryPageScriptCodec(vm, assets, actorDocument = null) {
  const semantics = new Map((vm.opcode_semantics || []).map(row => [row.opcode, row]));
  for (const [opcode, row] of Object.entries({...STORY_DIALOGUE_OPERATIONS,
    ...STORY_PARTY_ITEM_OPERATIONS, ...STORY_FIELD_OPERATIONS, ...STORY_BRANCH_OPERATIONS}))
    semantics.set(Number(opcode), {...semantics.get(Number(opcode)), ...row});
  const declarations = new Map(assets.flatMap(asset => asset.layout.declarations).map(row => [row.opcode, row]));
  const models = [...declarations.values()].map(declaration => ({declaration,
    semantic: semantics.get(declaration.opcode) || {operation: declaration.name}}));
  const originals = assets.flatMap((asset, index) => {
    const kind = index ? 'interaction' : 'autonomous';
    const published = vm.programs.filter(program => (program.kind || 'autonomous') === kind);
    const first = published[0], entry = asset.layout.entries.find(row => row.script_id === first.id);
    const groups = new Map(asset.layout.groups.map(row => [row.id, row]));
    const base = first.pointer_prg - groups.get(entry.group_id).offset - entry.offset;
    const known = new Set(published.map(program => program.id));
    const draft = createProjectFieldDraft(asset, fieldOwner(asset.resource_id).describe(asset, {asset})
      .map(field => ({...field, value: field.defaultValue})), {version: () => 0});
    return projectStoryScriptPrograms(draft, [...published, ...asset.layout.entries.filter(row => !known.has(row.script_id))
      .map(row => ({kind, id: row.script_id, pointer_prg: base + groups.get(row.group_id).offset + row.offset, commands: []}))]);
  });
  const programByKey = new Map(originals.map(program => [key(program.kind || 'autonomous', program.id), program]));
  const actors = new Map((actorDocument?.records || []).map(actor => [actor.uid, actor]));
  for (const list of [...(vm.variants || []), ...(vm.continuation_actor_lists || []),
    ...(vm.extended_actor_lists || []), ...(vm.interaction_actor_lists || [])])
    for (const actor of list.actors) {
      const identity = `${handle('scene-actor', list.id)}:${hex(actor.record_id)}`;
      if (!actors.has(identity)) actors.set(identity, actor);
    }
  const slotMaps = new WeakMap();
  const slotsFor = document => {
    if (slotMaps.has(document)) return slotMaps.get(document);
    const result = new Map(), used = new Map(['autonomous', 'interaction'].map(kind => [kind, new Set()]));
    for (const program of document.programs) {
      const binding = document.bindings.find(row => row[program.kind] === program.key);
      const actor = actors.get(binding?.actor);
      const field = program.kind === 'autonomous' ? 'autonomous_script_id' : 'interaction_or_record_id';
      const override = document.fields.find(row => row.resource === 'scene-actor'
        && row.handle === binding?.actor && row.field === field);
      const candidate = override?.value ?? actor?.[field];
      const occupied = used.get(program.kind);
      const slot = Number.isInteger(candidate) && candidate >= 0 && candidate <= 255 && !occupied.has(candidate) ? candidate
        : Array.from({length: 255}, (_, index) => index + 1).find(id => !occupied.has(id));
      if (!Number.isInteger(slot)) throw new TypeError('文档内指令序列超过运行入口容量');
      occupied.add(slot);
      result.set(program.key, slot);
    }
    slotMaps.set(document, result);
    return result;
  };
  const baseOptions = (semantic, declaration) => ({
    ...(semantic.direction ? {direction: semantic.direction} : {}),
    ...(Number.isInteger(semantic.frames) ? {frames: semantic.frames} : {}),
    ...(Number.isInteger(semantic.input_value) ? {input: semantic.input_value} : {}),
    ...(Number.isInteger(semantic.region_id) ? {region: handle('text-region', semantic.region_id)} : {}),
    ...(declaration.terminal_side_effect ? {terminal: true} : {}),
  });
  const options = (semantic, declaration) => {
    const value = baseOptions(semantic, declaration);
    const duplicates = models.filter(model => model.semantic.operation === semantic.operation
      && canonicalJsonEqual(baseOptions(model.semantic, model.declaration), value));
    return duplicates.length > 1 ? {...value, variant: declaration.name} : value;
  };
  for (const model of models) model.options = options(model.semantic, model.declaration);
  const modelFor = instruction => {
    const matches = models.filter(model => model.semantic.operation === instruction.operation
      && canonicalJsonEqual(model.options, instruction.options));
    if (matches.length !== 1) throw new TypeError(`指令 ${instruction.cursor}：操作与参数声明不唯一`);
    return matches[0];
  };
  const argumentName = (semantic, index) => storyCommandPresentation(semantic).operands[index] || `参数 ${index + 1}`;
  const typedArgument = (value, index, command, model) => {
    const {semantic, declaration} = model;
    if (declaration.dynamic_advance_operands.includes(index + 1)) return {target: (command.cursor + value) & 255};
    const name = argumentName(semantic, index);
    if (name.includes('事件位')) return handle('global-event-flag', value);
    if (name === '场景' || name === '原场景' || name === '新场景') return handle('scene', value);
    if (name === '编队') return handle('encounter-formation', value);
    if (name === '物品' || name === '原物品' || name === '新物品') return handle('item', value);
    if (name === '声音') return handle(value >= 0xF0 ? 'audio-control' : 'audio-command', value);
    const region = semantic.region_operand_index === undefined ? semantic.region_id
      : command.currentOperands?.[semantic.region_operand_index] ?? command.operands?.[semantic.region_operand_index];
    if (name === '文字区') return handle('text-region', value);
    if (name.includes('文字') && Number.isInteger(region)) return `${handle('record', region)}:${String(value).padStart(3, '0')}`;
    return value;
  };
  const instructionFromCommand = command => {
    const model = models.find(row => row.declaration.opcode === command.opcode);
    if (!model) throw new TypeError(`指令 ${command.cursor}：缺少语义声明`);
    const operands = command.currentOperands || command.operands;
    return {cursor: command.cursor, operation: model.semantic.operation,
      options: {...model.options}, arguments: Array.from({length: model.declaration.width - 1}, (_, index) => ({
        name: argumentName(model.semantic, index), value: typedArgument(operands[index], index, command, model),
      }))};
  };
  const bytesFor = instruction => {
    const model = modelFor(instruction);
    if (!Array.isArray(instruction.arguments) || instruction.arguments.length !== model.declaration.width - 1)
      throw new TypeError(`指令 ${instruction.cursor}：参数数量不符`);
    const bytes = instruction.arguments.map((argument, index) => {
      if (argument.name !== argumentName(model.semantic, index)) throw new TypeError(`指令 ${instruction.cursor}：参数名称不符`);
      const branch = model.declaration.dynamic_advance_operands.includes(index + 1);
      const value = branch && argument.value && typeof argument.value === 'object'
        ? (argument.value.target - instruction.cursor) & 255 : referenceValue(argument.value);
      if (branch && (!Number.isInteger(argument.value?.target) || argument.value.target < 0 || argument.value.target > 255))
        throw new TypeError(`指令 ${instruction.cursor}：分支目标无效`);
      if (!Number.isInteger(value) || value < 0 || value > 255) throw new TypeError(`指令 ${instruction.cursor}：参数取值无效`);
      return value;
    });
    const command = {cursor: instruction.cursor, currentOperands: bytes};
    instruction.arguments.forEach((argument, index) => {
      if (!canonicalJsonEqual(argument.value, typedArgument(bytes[index], index, command, model)))
        throw new TypeError(`指令 ${instruction.cursor}：参数句柄或分支格式无效`);
    });
    return [model.declaration.opcode, ...bytes];
  };
  const exportedProgram = program => ({key: key(program.kind || 'autonomous', program.id),
    kind: program.kind || 'autonomous', slot: program.id,
    instructions: program.commands.map(instructionFromCommand)});
  const serializeProgram = program => {
    const payload = new Uint8Array(256), occupied = new Set();
    const instructions = [...program.instructions].sort((a, b) => a.cursor - b.cursor);
    for (const instruction of instructions) {
      const bytes = bytesFor(instruction);
      if (instruction.cursor + bytes.length > payload.length)
        throw new TypeError(`${program.key}：指令超过 256 字节容量`);
      for (let index = 0; index < bytes.length; index++) {
        const cursor = instruction.cursor + index;
        if (occupied.has(cursor)) throw new TypeError(`${program.key}：指令字节重叠`);
        occupied.add(cursor);
      }
      payload.set(bytes, instruction.cursor);
    }
    const boundaries = instructions.map(instruction => instruction.cursor);
    validateFarjumpPage(payload, boundaries, [...declarations.values()]);
    return {payload, instruction_boundaries: boundaries};
  };
  const projections = new WeakMap();
  const compatibleOriginal = (content, slots) => {
    const original = programByKey.get(key(content.kind, slots.get(content.key)));
    return original?.commands.length === content.instructions.length && content.instructions.every(instruction =>
      original.commands.some(command => command.cursor === instruction.cursor && command.readWidth === bytesFor(instruction).length))
      ? original : null;
  };
  const projectPrograms = document => {
    if (projections.has(document)) return projections.get(document);
    const slots = slotsFor(document);
    const encoded = new Map();
    for (const content of document.programs) {
      const original = compatibleOriginal(content, slots);
      for (const instruction of content.instructions) {
        const template = original?.commands.find(command => command.cursor === instruction.cursor);
        if (template) bytesFor(instruction).forEach((byte, index) => encoded.set(template.prg_offset + index, byte));
      }
    }
    const result = document.programs.map(content => {
      const original = compatibleOriginal(content, slots);
      const logicalBytes = new Map(content.instructions.flatMap(instruction => bytesFor(instruction)
        .map((byte, index) => [(instruction.cursor + index) & 255, byte])));
      const originalContent = original && exportedProgram(original).instructions;
      const scriptLocation = original?.scriptLocation === 'original-pool'
        && !canonicalJsonEqual(content.instructions.map(bytesFor), originalContent.map(bytesFor))
        ? 'farjump-page' : original?.scriptLocation || 'farjump-page';
      const commands = content.instructions.map(instruction => {
        const bytes = bytesFor(instruction), declaration = declarations.get(bytes[0]);
        const template = original?.commands.find(command => command.cursor === instruction.cursor) || {};
        const semantic = semantics.get(bytes[0]);
        const operands = original ? [...(template.currentOperands || template.operands || [0, 0, 0, 0, 0])]
          : Array.from({length: 5}, (_, index) => logicalBytes.get((instruction.cursor + index + 1) & 255) ?? 0);
        operands.forEach((value, index) => {
          const address = template.prg_offset + index + 1;
          if (encoded.has(address)) operands[index] = encoded.get(address);
        });
        bytes.slice(1).forEach((value, index) => {operands[index] = value;});
        const edges = [];
        if (!declaration.terminal_side_effect) {
          if (declaration.fixed_advance > 0) edges.push({kind: 'normal', advance: declaration.fixed_advance,
            operand_index: null, target_cursor: (instruction.cursor + declaration.fixed_advance) & 255, target_status: 'command'});
          for (const index of declaration.dynamic_advance_operands) if (bytes[index]) edges.push({kind: 'conditional',
            advance: bytes[index], operand_index: index, target_cursor: (instruction.cursor + bytes[index]) & 255, target_status: 'command'});
        }
        const {instructionBindings, prg_offset, instructionId, ...presentation} = template;
        return {...presentation, ...(original ? {instructionBindings, prg_offset} : {
          name: declaration.name, handler_cpu: semantic.handler_cpu, handler_prg: semantic.handler_prg,
        }),
          cursor: instruction.cursor, cursor_hex: `0x${hex(instruction.cursor)}`,
          opcode: bytes[0], opcode_hex: `0x${hex(bytes[0])}`, operands, currentOperands: operands,
          raw_window: [bytes[0], ...operands], readWidth: declaration.width, normal_advance: declaration.fixed_advance,
          scriptLocation,
          dynamic_advance_operands: declaration.dynamic_advance_operands, terminal_side_effect: declaration.terminal_side_effect,
          instructionId: original && instructionId || `${content.key}-command-${instruction.cursor}`, edges};
      });
      return {...original, id: slots.get(content.key), kind: content.kind, instructionLayout: true, scriptLocation, commands};
    });
    projections.set(document, result);
    return result;
  };
  const overridesFor = (document, source) => {
    const kind = scriptKind(source.resource_id), owner = fieldOwner(source.resource_id);
    const descriptions = owner.describe(source.value.document ?? source.value, {asset: source.value});
    const changed = new Map();
    for (const program of document.programs.filter(row => row.kind === kind)) {
      const original = compatibleOriginal(program, slotsFor(document));
      for (const instruction of program.instructions) {
        const bytes = bytesFor(instruction);
        const template = original?.commands.find(command => command.cursor === instruction.cursor);
        bytes.forEach((value, index) => {
          const binding = template?.instructionBindings?.[index];
          if (!binding?.handle || binding.resourceId !== source.resource_id) return;
          const field = descriptions.find(row => row.entityHandle === binding.handle && row.fieldName === 'bytecode');
          if (!field) return;
          if (!changed.has(field.entityHandle)) changed.set(field.entityHandle, {field, value: [...field.defaultValue]});
          changed.get(field.entityHandle).value[binding.byteIndex] = value;
        });
      }
    }
    return [...changed.values()].flatMap(({field, value}) => {
      const stored = changeArrayFieldWorking(field, undefined, {value, selection: null});
      return stored === undefined ? [] : [{resource_id: source.resource_id, entity_handle: field.entityHandle,
        field_name: 'bytecode', value: stored}];
    });
  };
  const updatePrograms = (document, source, overrides) => {
    const kind = scriptKind(source.resource_id), owner = fieldOwner(source.resource_id);
    const descriptions = owner.describe(source.value.document ?? source.value, {asset: source.value});
    const values = new Map(descriptions.map(field => {
      const override = overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
      return [field.entityHandle, override ? fieldStoredValue(field, override.value) : field.defaultValue];
    }));
    return document.programs.map(program => program.kind !== kind || !compatibleOriginal(program, slotsFor(document)) ? program : {...program,
      instructions: program.instructions.map(instruction => {
        const template = programByKey.get(key(kind, slotsFor(document).get(program.key)))?.commands.find(command => command.cursor === instruction.cursor);
        if (!template?.instructionBindings) return instruction;
        const bytes = bytesFor(instruction).map((value, index) => {
          const binding = template.instructionBindings[index];
          return binding?.handle && values.has(binding.handle) ? values.get(binding.handle)[binding.byteIndex] : value;
        });
        return {...instructionFromCommand({...template, opcode: bytes[0], currentOperands: bytes.slice(1)}),
          ...(instruction.effect ? {effect: instruction.effect} : {})};
      })});
  };
  const exportContent = (sequences, currentAssets, actorDocument) => {
    const programs = currentAssets.flatMap((asset, index) => projectStoryScriptPrograms(asset,
      originals.filter(program => (program.kind || 'autonomous') === (index ? 'interaction' : 'autonomous'))));
    const byKey = new Map(programs.map(program => [key(program.kind || 'autonomous', program.id), program]));
    const lists = [...vm.variants, ...(vm.continuation_actor_lists || []), ...(vm.extended_actor_lists || []), ...(vm.interaction_actor_lists || [])];
    const byList = new Map(lists.map(list => [list.id, list]));
    for (const record of actorDocument?.records || []) {
      if (lists.some(list => list.id === record.entry_id)) continue;
      if (!byList.has(record.entry_id)) byList.set(record.entry_id, {id: record.entry_id, actors: []});
      byList.get(record.entry_id).actors.push({...record, record_id: record.id});
    }
    const listIds = new Set();
    const collectLists = (node, name = '') => {
      if (Array.isArray(node)) node.forEach(value => collectLists(value, name.replace(/_ids$/u, '_id')));
      else if (node && typeof node === 'object') Object.entries(node).forEach(([name, value]) => collectLists(value, name));
      else if (Number.isInteger(node) && /(?:^|_)(?:scene_id|variant_id|actor_list_id|scene_actor_entry_id)$/u.test(name)) listIds.add(node);
    };
    sequences.forEach(sequence => collectLists(sequence));
    const programKeys = new Set(), bindings = [];
    const records = new Map((actorDocument?.records || []).map(record => [record.uid, record]));
    const queue = [...listIds];
    const addList = id => {if (byList.has(id) && !listIds.has(id)) {listIds.add(id); queue.push(id);}};
    for (let index = 0; index < queue.length; index++) {
      const list = byList.get(queue[index]);
      if (!list) continue;
      for (const actor of list.actors) {
        const actorHandle = `${handle('scene-actor', list.id)}:${hex(actor.record_id)}`;
        const current = records.get(actorHandle);
        const autonomous = key('autonomous', current?.autonomous_script_id ?? actor.autonomous_script_id);
        const interaction = key('interaction', current?.interaction_or_record_id ?? actor.interaction_or_record_id);
        const triggered = sequences.some(sequence => sequence.interaction_trigger?.actor_record_id === actor.record_id
          && sequence.entry_variant_id === list.id);
        bindings.push({actor: actorHandle, autonomous, interaction: triggered && byKey.has(interaction) ? interaction : null});
        for (const name of [autonomous, ...(triggered ? [interaction] : [])]) {
          if (programKeys.has(name) || !byKey.has(name)) continue;
          programKeys.add(name);
          for (const command of byKey.get(name).commands) {
            const values = command.currentOperands || command.operands;
            if (command.opcode === 0x28) {
              addList((vm.control_state_model?.special_actor_list_base ?? 0xEF) + values[0]);
              const context = vm.story_mode_contexts?.entries?.find(row => row.story_state === values[0]);
              if (context) addList(context.scene_id);
            }
            if (command.opcode === 0x5E) addList(values[0]);
          }
        }
      }
    }
    return {programs: [...programKeys].map(name => exportedProgram(byKey.get(name))), bindings};
  };
  const resetPrograms = document => document.programs.map(program => {
    const original = compatibleOriginal(program, slotsFor(document));
    return !original ? program : {...program, instructions: exportedProgram(original).instructions.map(instruction => ({...instruction,
      ...(program.instructions.find(row => row.cursor === instruction.cursor)?.effect
        ? {effect: program.instructions.find(row => row.cursor === instruction.cursor).effect} : {})}))};
  });
  return {projectPrograms, slotsFor, overridesFor, updatePrograms, exportContent, resetPrograms, serializeProgram,
    instructionFromCommand, bytesFor,
    isScriptResource: scriptResource, validate: document => {
      const reasons = [];
      try {slotsFor(document);} catch (error) {reasons.push(error.message);}
      for (const program of document.programs) for (const instruction of program.instructions)
        try {bytesFor(instruction);} catch (error) {reasons.push(`${program.key}：${error.message}`);}
      if (reasons.length) throw new TypeError(reasons.join('\n'));
    }};
}
