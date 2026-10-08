// @editor-module 剧情页 JSON 格式、句柄引用与独立 Working 字段。
import {canonicalJsonStringify, canonicalJsonEqual, cloneValidatedJson} from './project-store-values.js';
import {fieldOwner, hasFieldOwner} from './field-owners.js';
import {SPARSE_ARRAY_FORMAT, changeArrayFieldWorking} from './field-codec.js';

// 格式：schema、title、sequences（执行链身份与入口、镜头、运行阶段）、prelude（前置执行链或 null）、
// programs（文档内 key、类型、语义指令与可选 slot）、bindings（角色句柄到文档内指令序列 key 的绑定）、
// fields（外部字段对象名、记录句柄、字段名与稀疏 Working 值），可选 source 只供溯源。
// 指令含逻辑 cursor、operation、options 与具名 arguments；分支值为目标 cursor，台词值为文本记录句柄。
// options 承载方向、固定帧数、输入、文本区、端点与等价操作变体；effect 标明未实现指令的效果。
// source 与 slot 只作溯源，不参与运行投影；运行入口由角色绑定与文档内 key 分配。
// 时间轴、key、分支与预览只由文档内指令及外部字段生成；物理位置、分析目录与编辑器呈现状态不入格式。
const STORY_PAGE_JSON_SCHEMA = 'metalmaxcn.story-page';
export const isStoryPageDocument = record => Boolean(record?.overrides?.document);

class StoryPageJsonError extends TypeError {
  constructor(reasons) {super(reasons.join('\n')); this.reasons = reasons;}
}

export function blankStoryPage(title = '新剧情页') {
  return {schema: STORY_PAGE_JSON_SCHEMA, title, sequences: [], prelude: null,
    programs: [], bindings: [], fields: []};
}

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const sequenceHandle = value => typeof value === 'string' && /^story-sequence:[a-z0-9-]+$/u.test(value);
const scriptHandle = value => typeof value === 'string'
  && /^story-(?:autonomous|interaction)-script:script:[0-9A-F]{2}$/u.test(value);
const physicalKey = key => /(?:^|_)(?:prg|cpu|bank)(?:_|$)|(?:^|_)(?:pointer|address|file_offset)(?:_|$)/u.test(key);
const analysisKey = key => /^(?:inventory_|source_|entry_evidence|evidence$|confidence$|canonical_signature$|logical_index|alias_|related_sequence_ids$|trigger_actor_handles$|audit_|completion_predicate$|transitions$|terminal_operations$)/u.test(key)
  || /(?:_hex$|_evidence$|^raw(?:_|$)|^package$|^schema$|^execution$|^preview_branch_policy$|^machine_stage_count$|^initial_music_note$|^queue_preview_assumption$|^maximal_preview_branch$|^machine_code_cues$|^alternate_branch_cues$|^track_name_policy$|^source$|^(?:script_id|autonomous_script_id|interaction_script_id)$)/u.test(key);
const sequenceKeys = ['id', 'kind', 'label', 'player_control', 'player_control_disabled', 'entry_variant_id',
  'variant_ids', 'shots', 'shot_count', 'blocking_caller_entry', 'preview_entry', 'interaction_trigger',
  'interaction_caller', 'initial_event_flags', 'preview_context_story_state', 'preview_context', 'ending_animation', 'trigger_label', 'completion', 'stage_labels', 'independent_entry_actor_list_id'];
const referenceModule = key => /(?:^|_)scene_id$/u.test(key) ? 'scene'
  : /(?:^|_)(?:variant_id|actor_list_id|scene_actor_entry_id)$/u.test(key) ? 'scene-actor-list'
  : key === 'interaction_script_id' ? 'story-interaction-script:script'
  : key === 'autonomous_script_id' ? 'story-autonomous-script:script'
  : /(?:^|_)formation_id$/u.test(key) ? 'encounter-formation'
  : /(?:^|_)(?:event_flag|event_flag_id|flag_id)$/u.test(key) ? 'global-event-flag' : null;
const numberedHandle = (module, id) => `${module}:${id.toString(16).toUpperCase().padStart(2, '0')}`;

export function storySequenceJson(sequence) {
  const scriptModule = sequence.interaction_trigger ? 'story-interaction-script:script' : 'story-autonomous-script:script';
  const convert = (node, key = '', list = sequence.entry_variant_id, region = null, kind = scriptModule) => {
    if (Array.isArray(node)) return node.map(value => convert(value, key.replace(/_ids$/u, '_id').replace(/_flags$/u, '_flag'), list, region, kind));
    if (plain(node)) return Object.fromEntries(Object.entries(node)
      .filter(([name]) => !physicalKey(name) && !analysisKey(name)).map(([name, value]) => [name === 'entry_context' ? 'activation' : name,
        convert(name === 'entry_context' ? {trigger: value.trigger} : value, name,
        node.variant_id ?? node.entry_variant_id ?? node.scene_actor_entry_id ?? list,
        node.region_id ?? node.text_region_id ?? region,
        ['autonomous', 'interaction'].includes(node.script_kind ?? node.kind)
          ? `story-${node.script_kind ?? node.kind}-script:script` : kind)]));
    if (Number.isInteger(node) && node >= 0 && /(?:^|_)actor_record_id$/u.test(key) && Number.isInteger(list))
      return `${numberedHandle('scene-actor', list)}:${node.toString(16).toUpperCase().padStart(2, '0')}`;
    if (Number.isInteger(node) && node >= 0 && /(?:^|_)(?:record_id|text_record_id)$/u.test(key) && Number.isInteger(region))
      return `${numberedHandle('record', region)}:${String(node).padStart(3, '0')}`;
    const module = referenceModule(key) || (key === 'script_id' ? kind : null);
    return module && Number.isInteger(node) && node >= 0 ? numberedHandle(module, node) : node;
  };
  const content = convert(Object.fromEntries(Object.entries(sequence).filter(([name]) => sequenceKeys.includes(name))));
  if (content.preview_entry) {content.entry = content.preview_entry; delete content.preview_entry;}
  if (content.ending_animation) {content.stages = content.ending_animation; delete content.ending_animation;}
  return {handle: `story-sequence:${sequence.id}`, content};
}

function sequenceFromJson(sequence) {
  const convert = (node, key = '') => Array.isArray(node)
    ? node.map(value => convert(value, key.replace(/_ids$/u, '_id').replace(/_flags$/u, '_flag'))) : plain(node)
    ? Object.fromEntries(Object.entries(node).map(([name, value]) => [name === 'activation' ? 'entry_context' : name, convert(value, name)]))
    : (referenceModule(key) || key === 'script_id' || /(?:^|_)(?:actor_record_id|record_id|text_record_id)$/u.test(key)) && typeof node === 'string'
      && /^(?:scene|scene-actor-list|scene-actor|record|encounter-formation|global-event-flag|story-(?:autonomous|interaction)-script:script):[0-9A-F]+(?::[0-9A-F]+)?$/u.test(node)
      ? parseInt(node.split(':').at(-1), node.startsWith('record:') ? 10 : 16) : node;
  const content = convert(sequence.content);
  if (content.entry) {content.preview_entry = content.entry; delete content.entry;}
  if (content.stages) {content.ending_animation = content.stages; delete content.stages;}
  return {...content, id: sequence.handle.slice('story-sequence:'.length)};
}

function storyPageSequences(document) {
  return [...document.sequences, ...(document.prelude ? [document.prelude] : [])].map(sequenceFromJson);
}

export function storyPageBrowserVm(source, document, scripts = null, currentDocument = () => document) {
  const sequences = storyPageSequences(document);
  const audioTemplates = new Map((source.sequences || []).flatMap(sequence =>
    sequence.ending_animation?.audio?.main_branch_cues || []).filter(cue => Array.isArray(cue.raw))
    .map(cue => [cue.dispatch, cue.raw]));
  const projectAudio = node => {
    if (Array.isArray(node)) node.forEach(projectAudio);
    else if (plain(node)) {
      const template = audioTemplates.get(node.dispatch);
      if (template && Number.isInteger(node.command_id)) {
        node.raw = [...template];
        node.raw[1] = node.command_id;
        node.raw_hex = node.raw.map(value => value.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      }
      Object.values(node).forEach(projectAudio);
    }
  };
  const contexts = new Map((source.sequences || []).flatMap(sequence =>
    sequence.ending_animation?.scene_contexts || []).map(context => [context.scene_id, context]));
  sequences.forEach(sequence => {
    projectAudio(sequence.ending_animation);
    for (const context of sequence.ending_animation?.scene_contexts || []) {
      const published = contexts.get(context.scene_id);
      for (const name of ['evidence', 'package', 'scene_id_hex'])
        if (published && Object.hasOwn(published, name)) context[name] = published[name];
    }
  });
  const ids = new Set(sequences.map(sequence => sequence.id));
  const result = {...source, pagePrograms: true,
    sequences: [...sequences, ...(source.sequences || []).filter(sequence => !ids.has(sequence.id))]};
  Object.defineProperty(result, 'programs', {enumerable: true,
    get: () => scripts ? scripts.projectPrograms(currentDocument()) : []});
  const bindings = new Map(document.bindings.map(binding => [binding.actor, binding]));
  const slots = binding => {
    const programSlots = scripts?.slotsFor(currentDocument()) || new Map();
    return {autonomous: programSlots.get(binding?.autonomous) ?? 0,
      interaction: programSlots.get(binding?.interaction) ?? 0};
  };
  Object.defineProperty(result, 'pageBindings', {get: () =>
    new Map(currentDocument().bindings.map(binding => [binding.actor, slots(binding)]))});
  for (const name of ['variants', 'continuation_actor_lists', 'extended_actor_lists', 'interaction_actor_lists'])
    result[name] = (source[name] || []).map(list => ({...list, actors: list.actors.map(actor => {
      const binding = bindings.get(`${numberedHandle('scene-actor', list.id)}:${actor.record_id.toString(16).toUpperCase().padStart(2, '0')}`);
      const result = {...actor};
      Object.defineProperty(result, 'pagePrograms', {get: () => slots(binding)});
      return result;
    })}));
  return result;
}

export function storySequencesForDefinition(sequences, definition, selectedId) {
  const ids = definition.sequenceIds || (definition.sequenceId ? [definition.sequenceId] : selectedId ? [selectedId] : []);
  const selected = ids.map(id => sequences.find(sequence => sequence.id === id)).filter(Boolean);
  const prelude = sequences.find(sequence => sequence.id === definition.preludeSequenceId);
  if (!prelude?.shots?.length || !selected.length) return selected;
  if (selectedId === prelude.id) return [prelude];
  const sequence = selected[0];
  const shots = [...prelude.shots.map(shot => ({...shot, phase_label: shot.phase_label || '前置事件',
    prelude_sequence_id: prelude.id})), ...(sequence.shots || [])]
    .map((shot, shot_index) => ({...shot, shot_index}));
  const variantIds = [...new Set([...shots.map(shot => Number(shot.variant_id)),
    ...(prelude.variant_ids || []).map(Number), ...(sequence.variant_ids || []).map(Number)].filter(Number.isInteger))];
  return [{...sequence, entry_variant_id: Number(prelude.entry_variant_id),
    entry_variant_id_hex: prelude.entry_variant_id_hex, variant_ids: variantIds,
    variant_ids_hex: variantIds.map(id => `0x${id.toString(16).toUpperCase().padStart(2, '0')}`),
    shots, shot_count: shots.length, prelude_sequence_id: prelude.id, prelude_sequence_label: prelude.label}];
}

export function validateStoryPageJson(value) {
  const errors = [];
  const fail = (path, reason) => errors.push(`${path}：${reason}`);
  if (!plain(value)) throw new StoryPageJsonError(['$：必须是 JSON 对象']);
  const keys = ['schema', 'title', 'sequences', 'prelude', 'programs', 'bindings', 'fields'];
  for (const key of Object.keys(value)) if (!keys.includes(key) && key !== 'source') fail(key, '未知字段');
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(key, '缺少字段');
  if (value.schema !== STORY_PAGE_JSON_SCHEMA) fail('schema', `必须是 ${STORY_PAGE_JSON_SCHEMA}`);
  if (typeof value.title !== 'string' || !value.title.trim()) fail('title', '必须是非空文字');
  for (const key of ['sequences', 'programs', 'bindings', 'fields'])
    if (!Array.isArray(value[key])) fail(key, '必须是数组');
  const sequences = Array.isArray(value.sequences) ? value.sequences : [];
  const checkSequence = (entry, path) => {
    if (!plain(entry)) {fail(path, '必须是对象'); return;}
    if (Object.keys(entry).sort().join() !== 'content,handle') fail(path, '必须含 handle 与 content');
    if (!sequenceHandle(entry.handle)) fail(`${path}.handle`, '执行链句柄无效');
    if (!plain(entry.content)) {fail(`${path}.content`, '必须是执行链内容对象'); return;}
    if (entry.content.id !== entry.handle?.slice('story-sequence:'.length)) fail(`${path}.content.id`, '执行链身份不符');
    if (typeof entry.content.kind !== 'string') fail(`${path}.content.kind`, '执行链类型无效');
    if (typeof entry.content.entry_variant_id !== 'string' || !/^scene-actor-list:[0-9A-F]{2}$/u.test(entry.content.entry_variant_id)) fail(`${path}.content.entry_variant_id`, '角色表句柄无效');
    if (!Array.isArray(entry.content.variant_ids) || entry.content.variant_ids.some(ref => typeof ref !== 'string' || !/^scene-actor-list:[0-9A-F]{2}$/u.test(ref))) fail(`${path}.content.variant_ids`, '角色表句柄数组无效');
    if (!Array.isArray(entry.content.shots)) fail(`${path}.content.shots`, '镜头必须是数组');
    else entry.content.shots.forEach((shot, index) => {
      if (!plain(shot) || typeof shot.kind !== 'string' || !Number.isInteger(shot.shot_index)
          || shot.shot_index < 0 || typeof shot.variant_id !== 'string'
          || !/^scene-actor-list:[0-9A-F]{2}$/u.test(shot.variant_id)
          || typeof shot.scene_id !== 'string' || !/^scene:[0-9A-F]{2}$/u.test(shot.scene_id))
        fail(`${path}.content.shots[${index}]`, '镜头类型、顺序或场景／角色表句柄无效');
    });
    const inspect = (node, position) => {
      if (Array.isArray(node)) node.forEach((item, index) => inspect(item, `${position}[${index}]`));
      else if (plain(node)) for (const [key, item] of Object.entries(node)) {
        if (physicalKey(key)) fail(`${position}.${key}`, '不得携带物理位置');
        if (analysisKey(key)) fail(`${position}.${key}`, '不得携带分析与目录元数据');
        const module = referenceModule(key);
        if (module && item !== null && (typeof item !== 'string'
            || !new RegExp(`^${module}:[0-9A-F]{2}$`, 'u').test(item))) fail(`${position}.${key}`, '引用句柄无效');
        if (key === 'script_id' && item !== null && !scriptHandle(item)) fail(`${position}.${key}`, '脚本句柄无效');
        inspect(item, `${position}.${key}`);
      }
    };
    inspect(entry.content, `${path}.content`);
  };
  sequences.forEach((entry, index) => checkSequence(entry, `sequences[${index}]`));
  const sequenceRefs = sequences.map(entry => entry?.handle);
  if (new Set(sequenceRefs).size !== sequences.length) fail('sequences', '执行链重复');
  if (value.prelude !== null) checkSequence(value.prelude, 'prelude');
  if (value.prelude?.handle) sequenceRefs.push(value.prelude.handle);
  const shape = (entry, allowed, path) => {
    if (!plain(entry)) {fail(path, '必须是对象'); return false;}
    for (const key of Object.keys(entry)) if (!allowed.includes(key)) fail(`${path}.${key}`, '未知字段');
    for (const key of allowed) if (!Object.hasOwn(entry, key)) fail(`${path}.${key}`, '缺少字段');
    return true;
  };
  const programKeys = new Set(), programKinds = new Map();
  (Array.isArray(value.programs) ? value.programs : []).forEach((program, i) => {
    const path = `programs[${i}]`;
    if (!shape(plain(program) ? Object.fromEntries(Object.entries(program).filter(([name]) => name !== 'slot')) : program,
      ['key', 'kind', 'instructions'], path)) return;
    if (typeof program.key !== 'string' || !/^[a-z0-9-]+$/iu.test(program.key) || programKeys.has(program.key)) fail(`${path}.key`, '指令序列身份无效或重复');
    programKeys.add(program.key);
    programKinds.set(program.key, program.kind);
    if (!['autonomous', 'interaction'].includes(program.kind)) fail(path, '指令序列类型无效');
    if (Object.hasOwn(program, 'slot') && (!Number.isInteger(program.slot)
        || program.slot < 0 || program.slot > 255)) fail(path, '来源编号无效');
    if (!Array.isArray(program.instructions)) {fail(`${path}.instructions`, '必须是语义指令数组'); return;}
    const cursors = new Set();
    program.instructions.forEach((instruction, index) => {
      const position = `${path}.instructions[${index}]`;
      if (!plain(instruction)) {fail(position, '必须是语义指令对象'); return;}
      if (!shape(Object.fromEntries(Object.entries(instruction).filter(([name]) => name !== 'effect')),
        ['cursor', 'operation', 'options', 'arguments'], position)) return;
      if (!Number.isInteger(instruction.cursor) || instruction.cursor < 0 || instruction.cursor > 255 || cursors.has(instruction.cursor)) fail(`${position}.cursor`, '指令游标无效或重复');
      cursors.add(instruction.cursor);
      if (typeof instruction.operation !== 'string' || !instruction.operation) fail(`${position}.operation`, '操作无效');
      if (!plain(instruction.options)) fail(`${position}.options`, '必须是语义选项对象');
      if (!Array.isArray(instruction.arguments)) fail(`${position}.arguments`, '必须是具名参数数组');
      else instruction.arguments.forEach((argument, argumentIndex) => {
        if (!shape(argument, ['name', 'value'], `${position}.arguments[${argumentIndex}]`)) return;
        if (typeof argument.name !== 'string' || !argument.name) fail(position, '参数名称无效');
      });
      if (Object.hasOwn(instruction, 'effect') && typeof instruction.effect !== 'string') fail(`${position}.effect`, '必须是效果文字');
    });
  });
  const actors = new Set();
  (Array.isArray(value.bindings) ? value.bindings : []).forEach((binding, index) => {
    const path = `bindings[${index}]`;
    if (!shape(binding, ['actor', 'autonomous', 'interaction'], path)) return;
    if (typeof binding.actor !== 'string' || !/^scene-actor:[0-9A-F]{2}:[0-9A-F]{2}$/u.test(binding.actor)
        || actors.has(binding.actor)) fail(`${path}.actor`, '角色句柄无效或重复');
    actors.add(binding.actor);
    for (const kind of ['autonomous', 'interaction']) if (binding[kind] !== null
        && (!programKeys.has(binding[kind]) || programKinds.get(binding[kind]) !== kind))
      fail(`${path}.${kind}`, '文档内指令序列不存在或类型不符');
  });
  const identities = new Set();
  (Array.isArray(value.fields) ? value.fields : []).forEach((entry, i) => {
    if (!shape(entry, ['resource', 'handle', 'field', 'value'], `fields[${i}]`)) return;
    if (typeof entry.resource !== 'string' || !hasFieldOwner(entry.resource)) fail(`fields[${i}].resource`, '字段对象不存在');
    if (['story-autonomous-script', 'story-interaction-script'].includes(entry.resource)) fail(`fields[${i}].resource`, '剧情脚本必须承载于语义指令');
    if (typeof entry.handle !== 'string' || !entry.handle.trim()) fail(`fields[${i}].handle`, '记录句柄无效');
    if (typeof entry.field !== 'string' || !entry.field) fail(`fields[${i}].field`, '字段名无效');
    const identity = JSON.stringify([entry.resource, entry.handle, entry.field]);
    if (identities.has(identity)) fail(`fields[${i}]`, '字段重复');
    identities.add(identity);
  });
  if (errors.length) throw new StoryPageJsonError(errors);
  return cloneValidatedJson(value);
}

export function parseStoryPageJson(text) {
  let value;
  try {value = JSON.parse(text);} catch (error) {throw new StoryPageJsonError([`$：${error.message}`]);}
  return validateStoryPageJson(value);
}

export function serializeStoryPageJson(value) {
  return `${canonicalJsonStringify(validateStoryPageJson(value))}\n`;
}

export function storyPageJsonDefinition(document, slots = new Map()) {
  return {view: 'story-page', editable: true, editorOnly: true,
    title: document.title, navigationLabel: document.title, eyebrow: 'STORY',
    sequenceIds: document.sequences.map(ref => ref.handle.slice('story-sequence:'.length)),
    preludeSequenceId: document.prelude?.handle.slice('story-sequence:'.length),
    links: document.programs.some(program => program.instructions.some(instruction => instruction.arguments
      .some(argument => argument.value === 'record:05:202')))
      ? [{label: '卫星地图 ↗', href: '?view=interfaceui&interface=satellite-map'}] : [],
    unimplementedStops: document.sequences.flatMap(sequence => document.programs.flatMap(program => program.instructions
      .filter(instruction => instruction.effect).map(instruction => ({sequenceId: sequence.content.id,
        scriptId: slots.get(program.key), cursor: instruction.cursor, effect: instruction.effect}))))};
}

function storyPageFieldSnapshot(snapshot, document, resourceId, version, scripts) {
  const overrides = scripts?.isScriptResource(resourceId) ? scripts.overridesFor(document, snapshot.original)
    : document.fields.filter(row => row.resource === resourceId).map(row => ({
    resource_id: resourceId, entity_handle: row.handle, field_name: row.field, value: row.value,
  }));
  if (overrides.length) fieldOwner(resourceId).validate(snapshot.original.value, overrides, snapshot.dependencies);
  return {...snapshot, overrides, storyPages: [], storyOwners: {}, version,
    meta: {...snapshot.meta, version}};
}

function documentFieldVersion(document, resourceId) {
  let hash = 2166136261;
  const content = ['story-autonomous-script', 'story-interaction-script'].includes(resourceId)
    ? document.programs.filter(program => `story-${program.kind}-script` === resourceId)
    : document.fields.filter(row => row.resource === resourceId);
  for (const character of canonicalJsonStringify(content))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

export async function validateStoryPageReferences(document, repository, sequences) {
  const errors = [];
  const references = value => {
    const result = new Set();
    const visit = node => {
      if (Array.isArray(node)) node.forEach(visit);
      else if (plain(node)) Object.values(node).forEach(visit);
      else if (typeof node === 'string' && /^(?:scene|scene-actor-list|scene-actor|record|encounter-formation|global-event-flag|story-(?:autonomous|interaction)-script:script):[0-9A-F]+(?::[0-9A-F]+)?$/u.test(node)) result.add(node);
    };
    visit(value);
    return result;
  };
  const knownReferences = references(sequences.map(storySequenceJson));
  const owners = new Map();
  const actorSource = await repository.getOriginal('scene-actor');
  const actorLists = new Set((actorSource.value.document ?? actorSource.value).tables.filter(table => table.count > 0)
    .map(table => table.entry_id));
  for (const reference of references([...document.sequences, document.prelude, document.programs, document.bindings])) {
    if (knownReferences.has(reference)) continue;
    if (/^global-event-flag:[0-9A-F]{2}$/u.test(reference)) continue;
    if (reference.startsWith('scene-actor-list:') && actorLists.has(parseInt(reference.split(':')[1], 16))) continue;
    try {
      if (await repository.hasOriginal(reference)) continue;
      const module = reference.startsWith('record:') ? 'text-record' : reference.split(':')[0];
      if (!owners.has(module)) {
        const source = await repository.getOriginal(module);
        const owner = fieldOwner(module);
        owners.set(module, new Set(owner.describe(source.value.document ?? source.value, {asset: source.value})
          .flatMap(field => [field.entityHandle, ...(field.entityAliases || [])])));
      }
      if (!owners.get(module).has(reference)) throw new TypeError('记录不存在');
    } catch (error) {errors.push(`${reference}：${error.message}`);}
  }
  for (const sequence of storyPageSequences(document)) for (const id of [sequence.entry_variant_id, ...sequence.variant_ids])
    if (!actorLists.has(id)) errors.push(`${numberedHandle('scene-actor-list', id)}：角色表不存在`);
  const resources = [...new Set(document.fields.map(row => row.resource))];
  for (const id of resources) {
    try {
      const snapshot = await repository.getFieldState(id, {includeOriginal: true, includeDependencies: true});
      storyPageFieldSnapshot(snapshot, document, id, 0);
    } catch (error) {errors.push(`${id}：${error.message}`);}
  }
  if (errors.length) throw new StoryPageJsonError(errors);
}

export function createStoryPageRepository(repository, page, initial, {scripts = null, onChange = () => {}} = {}) {
  let record = initial;
  const snapshot = async (resourceId, options = {}) => {
    record = await repository.readStoryPageDocument(page);
    if (!isStoryPageDocument(record)) throw new TypeError('剧情页 Working 不存在');
    const source = await repository.getFieldState(resourceId, {...options, includeOriginal: true, includeDependencies: true});
    return storyPageFieldSnapshot(source, record.overrides.document, resourceId,
      documentFieldVersion(record.overrides.document, resourceId), scripts);
  };
  const proxy = new Proxy(repository, {get(target, key) {
    if (key === 'getFieldState') return snapshot;
    if (key === 'writeFieldValues') return async (resourceId, changes, options) => {
      record = await repository.updateStoryPageDocument(page, async current => {
        const source = await repository.getFieldState(resourceId, {includeOriginal: true, includeDependencies: true});
        if (options.expectedRevisionId !== source.original.revision_id) throw new TypeError('剧情页 Origin 已改变');
        const document = cloneValidatedJson(current.overrides.document);
        const owner = fieldOwner(resourceId);
        const body = source.original.value.document ?? source.original.value;
        const descriptions = owner.describe(body, {asset: source.original.value});
        if (scripts?.isScriptResource(resourceId)) {
          let overrides = scripts.overridesFor(document, source.original);
          for (const change of changes) {
            const field = descriptions.find(row => row.entityHandle === change.entityHandle && row.fieldName === change.fieldName);
            if (!field || field.readOnly) throw new TypeError('未知或只读字段');
            const previous = overrides.find(row => row.entity_handle === field.entityHandle && row.field_name === field.fieldName);
            const value = changeArrayFieldWorking(field, previous?.value, {...change, selection: change.selection ?? null});
            overrides = overrides.filter(row => row !== previous);
            if (value !== undefined) overrides.push({resource_id: resourceId, entity_handle: field.entityHandle, field_name: field.fieldName, value});
          }
          owner.validate(source.original.value, overrides, source.dependencies);
          document.programs = scripts.updatePrograms(document, source.original, overrides);
          scripts.validate(document);
          return document;
        }
        for (const change of changes) {
          const field = descriptions.find(row => row.entityHandle === change.entityHandle && row.fieldName === change.fieldName);
          if (!field || field.readOnly) throw new TypeError('未知或只读字段');
          const index = document.fields.findIndex(row => row.resource === resourceId
            && row.handle === change.entityHandle && row.field === change.fieldName);
          let value = change.value;
          let remove = change.reset || canonicalJsonEqual(value, field.defaultValue);
          if (field.workingFormat === SPARSE_ARRAY_FORMAT) {
            value = changeArrayFieldWorking(field, index < 0 ? undefined : document.fields[index].value,
              {...change, selection: change.selection ?? null});
            remove = value === undefined;
          }
          if (index >= 0) document.fields.splice(index, 1);
          if (!remove) document.fields.push({resource: resourceId, handle: change.entityHandle, field: change.fieldName, value});
        }
        document.fields.sort((a, b) => JSON.stringify([a.resource, a.handle, a.field]).localeCompare(JSON.stringify([b.resource, b.handle, b.field])));
        storyPageFieldSnapshot(source, document, resourceId, current.version + 1, scripts);
        return document;
      });
      onChange(record.overrides.document);
      return snapshot(resourceId);
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  return proxy;
}
