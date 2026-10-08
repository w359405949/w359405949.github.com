// @editor-module ProjectDB 管理状态机文档与显式字段应用。
import {blankInterfaceStateDocument, validateInterfaceStateDocumentReferences, parseInterfaceStateDocument,
  interfaceStateDocumentFieldObject, interfaceStateFieldKey} from './interface-state-document.js';
import {interfaceStateSources} from '../render/interface-state-source.js';
import {currentApplicationPrograms, newApplicationProgram} from './application-program.js';

export function createInterfaceStateDocumentMethods(database, repository, scopedDatabase) {
  const read = async id => {
    const record = await repository().readInterfaceStateDocument(id);
    if (!record) throw new TypeError('状态机文档不存在');
    return structuredClone(record.overrides.document);
  };
  const sources = async () => {
    const facilities = await database.getDocument('project.facilities');
    const entries = interfaceStateSources({commands: facilities.applications.commands});
    for (const source of entries) {
      const entry = source.entries[0];
      source.documentEntry = {pageId: entry?.pageId ?? (source.identity.domain === 'system'
        ? source.identity.key : null), commandId: entry?.commandId
        ?? (source.identity.id.startsWith('application:') ? Number.parseInt(source.identity.id.slice(-2), 16) : null),
      sequenceId: null};
    }
    const story = await database.getDocument('project.story');
    entries.push(...(story.browser_vm?.sequences || []).map(sequence => ({
      identity: {id: `story:${sequence.id}`, domain: 'story', key: sequence.id}, label: sequence.label || sequence.id,
      documentEntry: {pageId: null, commandId: null, sequenceId: sequence.id},
      entries: [], references: [], capabilities: {view: true, structure: false},
    })));
    return entries;
  };
  const validate = async value => validateInterfaceStateDocumentReferences(value, database, await sources());
  const update = async (id, change) => repository().updateInterfaceStateDocument(id, async current =>
    validate(await change(current)));
  const create = async () => {
    const id = crypto.randomUUID();
    await repository().updateInterfaceStateDocument(id, () => blankInterfaceStateDocument());
    return id;
  };
  const createProgram = async (fromId = null) => {
    const document = fromId ? await read(fromId) : blankInterfaceStateDocument('新应用程序');
    if (fromId && !document.program) throw new TypeError('文档没有可另存的应用程序');
    document.source = null;
    document.program ||= newApplicationProgram();
    if (fromId) document.title += ' 副本';
    const id = crypto.randomUUID();
    await validate(document);
    await database.allocateApplicationProgram(document.program, null, {id, document});
    return id;
  };
  const importSource = async (id, sourceId) => {
    const source = (await sources()).find(row => row.identity.id === sourceId);
    if (!source) throw new TypeError('状态机来源不存在');
    const document = {...blankInterfaceStateDocument(source.label),
      source: {id: source.identity.id, domain: source.identity.domain, entry: source.documentEntry}};
    if ([0x10, 0x11, 0x12, 0x13].includes(source.documentEntry.commandId)) {
      const command = await database.getResourceDocument(`application-command:${source.documentEntry.commandId
        .toString(16).toUpperCase().padStart(2, '0')}`);
      const program = currentApplicationPrograms(await database.getResourceDocument('application-program'))
        .find(row => row.id === command.program_reference);
      document.program = structuredClone({id: program.id, prefix: program.prefix, segments: program.segments});
    }
    await update(id, () => document);
    return document;
  };
  const capture = async (id, references) => update(id, async document => {
    const known = new Set(document.fields.map(interfaceStateFieldKey));
    for (const {resourceId, handle, field: name} of references) {
      if (!handle || !name || resourceId.startsWith('save-') || resourceId === 'application-program') continue;
      const field = await database.getField(resourceId, handle, name);
      const row = {resourceId, handle, field: name, value: structuredClone(field.value)};
      if (!field.readOnly && !known.has(interfaceStateFieldKey(row))) {
        document.fields.push(row); known.add(interfaceStateFieldKey(row));
      }
    }
    return document;
  });
  const apply = async (id, selectedKeys) => {
    const document = await validate(await read(id));
    const selected = new Set(selectedKeys);
    const rows = document.fields.filter(row => selected.has(interfaceStateFieldKey(row)));
    if (rows.length !== selected.size || rows.length === 0
      || new Set(rows.map(row => row.resourceId)).size !== 1) throw new TypeError('应用须选择同一字段对象中的字段');
    const changes = await Promise.all(rows.map(async row => ({
      field: await database.getField(row.resourceId, row.handle, row.field), value: row.value,
    })));
    await database.writeFields(changes);
    return rows.length;
  };
  const applyProgram = async id => {
    const document = await validate(await read(id)), program = document.program;
    if (!program) throw new TypeError('文档没有可应用的程序');
    if (!document.source) return database.allocateApplicationProgram(program, null, {id, document});
    const current = await database.getResourceDocument('application-program');
    const changes = [];
    if (program.id === current.id) {
      for (const segment of program.segments.filter(segment => current.segments.some(row => row.id === segment.id))) {
        changes.push({field: await database.getField('application-program', current.id,
          `segment:${segment.id.split(':').at(-1)}`), value: segment.instructions});
      }
      changes.push({field: await database.getField('application-program', current.id, 'structure'), value: {
        order: program.segments.map(segment => segment.id),
        added: program.segments.filter(segment => !current.segments.some(row => row.id === segment.id)),
      }});
    } else {
      changes.push({field: await database.getField('application-program', current.id, 'independent_programs'),
        value: current.independent_programs.map(row => row.id === program.id ? program : row)});
    }
    await database.writeFields(changes);
    return changes.length;
  };
  return {
    interfaceStateDocumentSources: sources,
    createInterfaceStateDocument: create,
    createInterfaceStateApplicationProgram: createProgram,
    listInterfaceStateDocuments: async () => (await repository().listInterfaceStateDocuments())
      .map(record => ({id: record.resource_id.slice('interface-state-document:'.length), title: record.overrides.document.title,
        command: record.overrides.document.source?.entry.commandId ?? null})),
    getInterfaceStateDocument: read,
    getInterfaceStateDocumentObject: async id => interfaceStateDocumentFieldObject(await read(id), id,
      change => update(id, change)),
    importInterfaceStateSource: importSource,
    importInterfaceStateDocument: async (id, text) => update(id, () => parseInterfaceStateDocument(text)),
    exportInterfaceStateDocument: read,
    updateInterfaceStateDocument: update,
    captureInterfaceStateFields: capture,
    applyInterfaceStateFields: apply,
    applyInterfaceStateProgram: applyProgram,
    getInterfaceStateDocumentDb: id => scopedDatabase(id, update),
  };
}
