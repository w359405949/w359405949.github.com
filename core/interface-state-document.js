// @editor-module 状态机文档保存领域语义与选定字段的独立副本。
import {canonicalJsonStringify, canonicalJsonEqual, cloneValidatedJson} from './project-store-values.js';
import {fieldOwner} from './field-owners.js';
import {changeArrayFieldWorking, SPARSE_ARRAY_FORMAT} from './field-codec.js';
import {applicationProgramFieldOwner, applicationProgramWithMetadata} from './application-program.js';
import {fieldObjectControls} from './field-object.js';
import {validateApplicationProgramEdit, validateExtendedApplicationProgram} from './application-program-compiler.js';

export const INTERFACE_STATE_DOCUMENT_SCHEMA = 'metalmaxcn.interface-state-document';
export const interfaceStateDocumentKey = id => `interface-state-document:${id}`;
export const isInterfaceStateDocumentRecord = record =>
  record?.asset_schema === INTERFACE_STATE_DOCUMENT_SCHEMA
  && record.resource_id?.startsWith('interface-state-document:');
export const interfaceStateFieldKey = row => JSON.stringify([row.resourceId, row.handle, row.field]);
const requireValue = (condition, message) => {if (!condition) throw new TypeError(`状态机文档：${message}`);};
const exact = (value, keys) => requireValue(value && !Array.isArray(value)
  && Object.keys(value).sort().join() === [...keys].sort().join(), '格式字段不同');

export function blankInterfaceStateDocument(title = '新状态机') {
  return {schema: INTERFACE_STATE_DOCUMENT_SCHEMA, title, source: null, program: null, fields: []};
}

export function appendInterfaceStateProgramSegment(document) {
  const id = Array.from({length: 254}, (_, index) =>
    `${document.program.id}:${index.toString(16).toUpperCase().padStart(2, '0')}`)
    .find(id => !document.program.segments.some(row => row.id === id));
  if (!id) throw new TypeError('段目录已满');
  document.program.segments.push({id, instructions: [{kind: 'text', record: 'text-record:06:004'},
    {kind: 'opcode', opcode: 0xD1, operands: [{kind: 'segment', target: document.program.segments[0].id}]}]});
  return document;
}

export function validateInterfaceStateDocument(input) {
  const value = cloneValidatedJson(input);
  exact(value, ['schema', 'title', 'source', 'program', 'fields']);
  requireValue(value.schema === INTERFACE_STATE_DOCUMENT_SCHEMA && typeof value.title === 'string'
    && value.title.trim() && Array.isArray(value.fields), '格式、标题或字段集合无效');
  if (value.source !== null) {
    exact(value.source, ['id', 'domain', 'entry']);
    requireValue(typeof value.source.id === 'string' && value.source.id.length
      && ['shop', 'machine', 'menu', 'dialogue', 'system', 'battle', 'published', 'story'].includes(value.source.domain),
    '来源身份无效');
    exact(value.source.entry, ['pageId', 'commandId', 'sequenceId']);
    requireValue([value.source.entry.pageId, value.source.entry.sequenceId]
      .every(item => item === null || typeof item === 'string')
      && (value.source.entry.commandId === null || Number.isInteger(value.source.entry.commandId)
        && value.source.entry.commandId >= 0 && value.source.entry.commandId <= 255), '来源入口无效');
  }
  if (value.program !== null) {
    exact(value.program, ['id', 'prefix', 'segments']);
    requireValue((value.source === null || value.source.domain === 'shop')
      && /^application-program:[0-9A-F]{2}$/u.test(value.program.id)
      && Number.isInteger(value.program.prefix) && Array.isArray(value.program.segments), '程序身份无效');
    for (const segment of value.program.segments) {
      exact(segment, ['id', 'instructions']);
      requireValue(Array.isArray(segment.instructions), '程序指令集合无效');
      for (const instruction of segment.instructions) {
        const keys = {text: ['kind', 'record'], 'native-call': ['kind', 'handler'],
          'indexed-branches': ['kind', 'targets', 'terminator'], opcode: ['kind', 'opcode', 'operands']}[instruction.kind];
        requireValue(keys, '程序指令语义无效'); exact(instruction, keys);
        for (const operand of instruction.operands || instruction.targets || []) {
          const keys = {segment: ['kind', 'target'], end: ['kind', 'value'], parameter: ['kind', 'value'],
            'runtime-text-slot': ['kind', 'value'], 'borrowed-byte': ['kind', 'reference']}[operand.kind];
          requireValue(keys, '程序参数语义无效'); exact(operand, keys);
        }
      }
    }
  }
  const seen = new Set();
  for (const row of value.fields) {
    exact(row, ['resourceId', 'handle', 'field', 'value']);
    requireValue(typeof row.resourceId === 'string' && !row.resourceId.startsWith('save-')
      && typeof row.handle === 'string' && /^[a-z0-9-]+:.+$/u.test(row.handle)
      && typeof row.field === 'string' && row.field.length, '字段引用无效或指向存档');
    const key = interfaceStateFieldKey(row);
    requireValue(!seen.has(key), '字段引用重复'); seen.add(key);
  }
  requireValue(value.source !== null || value.program !== null || value.fields.length === 0, '空文档含来源内容');
  return value;
}

export const parseInterfaceStateDocument = text => validateInterfaceStateDocument(JSON.parse(text));
export const serializeInterfaceStateDocument = value => canonicalJsonStringify(validateInterfaceStateDocument(value));

export async function validateInterfaceStateDocumentReferences(document, database, sources) {
  const value = validateInterfaceStateDocument(document);
  const extended = value.source?.entry.commandId >= 0x39;
  if (value.source && !extended) requireValue(sources.some(source => source.identity.id === value.source.id
    && source.identity.domain === value.source.domain
    && canonicalJsonEqual(source.documentEntry, value.source.entry)), '来源未登记或入口不符');
  const groups = new Map();
  for (const row of value.fields) {
    const field = await database.getField(row.resourceId, row.handle, row.field);
    requireValue(!field.readOnly, '字段只读');
    if (!groups.has(row.resourceId)) groups.set(row.resourceId, []);
    groups.get(row.resourceId).push({field, value: row.value});
  }
  for (const [resourceId, changes] of groups) {
    const asset = await database.readResource(resourceId);
    const fields = await database.getFields(resourceId);
    const original = structuredClone(asset.value);
    const originalDocument = original.document || original;
    for (const field of fields) {
      const path = field.documentPath;
      const parent = path.slice(0, -1).reduce((row, key) => row[key], originalDocument);
      parent[path.at(-1)] = structuredClone(field.defaultValue);
    }
    const overrides = fields.flatMap(field => {
      const change = changes.find(row => row.field === field);
      let current = change ? change.value : field.value;
      if (canonicalJsonEqual(current, field.defaultValue)) return [];
      if (field.workingFormat === SPARSE_ARRAY_FORMAT)
        current = changeArrayFieldWorking(field, undefined, {value: current, reset: false, selection: null});
      return [{resource_id: resourceId, entity_handle: field.entityHandle, field_name: field.fieldName, value: current}];
    });
    const dependencies = Object.fromEntries(await Promise.all((fieldOwner(resourceId).dependencies || [])
      .map(async id => [id, (await database.readResource(id)).value])));
    fieldOwner(resourceId).validate(original, overrides, dependencies);
  }
  if (value.program) {
    const source = await database.getResourceDocument('application-program');
    if (value.source) {
      const command = await database.getResourceDocument(`application-command:${value.source.entry.commandId
        .toString(16).toUpperCase().padStart(2, '0')}`);
      requireValue(command.program_reference === value.program.id, '程序与来源入口引用不符');
      if (extended) requireValue(value.source.id === `application:${value.source.entry.commandId.toString(16).toUpperCase()}`
        && value.source.domain === 'shop' && value.source.entry.pageId === null && value.source.entry.sequenceId === null,
      '扩展来源入口无效');
    }
    const metadata = applicationProgramWithMetadata(source, value.program);
    applicationProgramFieldOwner.serializeLogical({...metadata, ...value.program}, {resolveBorrowedByte: () => 0x1D});
    const text = structuredClone(await database.getResourceDocument('text-record'));
    for (const row of value.fields.filter(row => row.resourceId === 'text-record')) {
      const field = await database.getField(row.resourceId, row.handle, row.field);
      const parent = field.documentPath.slice(0, -1).reduce((item, key) => item[key], text);
      parent[field.documentPath.at(-1)] = structuredClone(row.value);
    }
    const validate = !value.source || extended ? validateExtendedApplicationProgram : validateApplicationProgramEdit;
    validate({...metadata, ...value.program}, source, {
      text, selection: await database.getResourceDocument('selection-layout'),
    });
    for (const instruction of value.program.segments.flatMap(segment => segment.instructions))
      if (instruction.kind === 'text') requireValue(text.records[
        `record:06:${String(Number.parseInt(instruction.record.slice(-3), 16)).padStart(3, '0')}`], '正文引用不存在');
  }
  requireValue(!extended || value.program, '扩展来源缺程序');
  return value;
}

export function interfaceStateDocumentFieldObject(document, id, update) {
  return {id: interfaceStateDocumentKey(id), resourceId: 'interface-state-document',
    origin: blankInterfaceStateDocument(), value: document, physical: null,
    mount: (host, options) => fieldObjectControls('interface-state-document')(host,
      interfaceStateDocumentFieldObject(document, id, update), options),
    set: value => update(() => value),
    edit: change => update(current => change(structuredClone(current)))};
}
