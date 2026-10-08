// @editor-module 构建时把已绑定剧情页投影到字段对象与逻辑脚本片段。
import {canonicalJsonEqual} from './project-store-values.js';
import {fieldOwner} from './field-owners.js';
import {isStoryPageDocument, validateStoryPageReferences} from './story-page-json.js';
import {storyPageEntryProgram, assertStoryPageEntryRom} from './story-page-entries.js';
import {createStoryPageScriptCodec} from './story-page-scripts.js';
import {createProjectDb} from './project-db.js';
import {storyPageExpandedEntryIds} from './story-farjump-format.js';

export async function prepareStoryPageRomBuild(repository, database) {
  if (!repository.listStoryPageWorking) return {repository, fieldDb: database, assertCurrent: async () => {}};
  const records = await repository.listStoryPageWorking();
  const assigned = records.filter(record => isStoryPageDocument(record) && record.overrides.rom_entries?.length);
  const manifest = await repository.getManifest();
  if (assigned.length) assertStoryPageEntryRom(manifest);
  const actors = await database.readBuildFields('scene-actor', repository, manifest.active_original_revision_id);
  const values = new Map();
  for (const field of actors.fields) {
    if (!values.has(field.entityHandle)) values.set(field.entityHandle, {});
    values.get(field.entityHandle)[field.fieldName] = field.value;
  }
  for (const actor of values.values()) {
    if (actor.text_region === 0 && storyPageExpandedEntryIds('interaction').includes(actor.interaction_or_record_id)
      && !assigned.some(record => record.overrides.rom_entries.some(entry => entry.kind === 'interaction'
        && entry.script_id === actor.interaction_or_record_id)))
      throw new TypeError('场景对象的扩展入口缺少剧情页');
  }
  const active = assigned.filter(record => record.overrides.rom_entries.some(entry => [...values.values()].some(actor =>
    entry.kind === 'interaction' ? actor.text_region === 0 && actor.interaction_or_record_id === entry.script_id
      : actor.autonomous_script_id === entry.script_id)));
  if (!active.length) return {repository, fieldDb: database, assertCurrent: actors.assertCurrent};
  const assertCurrent = actors.assertCurrent;
  const [source, assets, actorOriginal] = await Promise.all([
    database.getPackageDocument('game/story/index.json', null),
    Promise.all(['story-autonomous-script', 'story-interaction-script'].map(async id => (await repository.getOriginal(id)).value)),
    repository.getOriginal('scene-actor'),
  ]);
  const scripts = createStoryPageScriptCodec(source.browser_vm, assets, actorOriginal.value.document ?? actorOriginal.value);
  const programs = new Map(), edits = new Map();
  for (const record of active) {
    const document = record.overrides.document;
    await validateStoryPageReferences(document, repository, source.browser_vm.sequences);
    if (record.overrides.rom_entries.length !== document.programs.length)
      throw new TypeError('剧情页的全部指令序列须分配 ROM 入口');
    for (const entry of record.overrides.rom_entries) {
      const program = storyPageEntryProgram(record, entry), resourceId = `story-${entry.kind}-script`;
      if (!programs.has(resourceId)) programs.set(resourceId, []);
      if (programs.get(resourceId).some(row => row.script_id === entry.script_id)) throw new TypeError('剧情页入口重复分配');
      programs.get(resourceId).push({script_id: entry.script_id, ...scripts.serializeProgram(program)});
      if ((actorOriginal.value.document ?? actorOriginal.value).records.some(actor => entry.kind === 'interaction'
        ? actor.text_region === 0 && actor.interaction_or_record_id === entry.script_id : actor.autonomous_script_id === entry.script_id))
        throw new TypeError('剧情页入口已有原始场景调用者');
    }
    for (const row of document.fields) {
      if (!edits.has(row.resource)) edits.set(row.resource, []);
      const overrides = edits.get(row.resource);
      const previous = overrides.find(edit => edit.entity_handle === row.handle && edit.field_name === row.field);
      if (previous && !canonicalJsonEqual(previous.value, row.value)) throw new TypeError('剧情页的共用字段取值冲突');
      if (!previous) overrides.push({resource_id: row.resource, entity_handle: row.handle, field_name: row.field, value: row.value});
    }
  }
  const proxy = new Proxy(repository, {get(target, name) {
    if (name === 'getStoryPageRomPrograms') return async resourceId => {
      await assertCurrent();
      return programs.get(resourceId) || [];
    };
    if (name === 'listFieldWorkingResourceIds') return async () => {
      await assertCurrent();
      return [...new Set([...await repository.listFieldWorkingResourceIds(), ...programs.keys(), ...edits.keys()])];
    };
    if (name === 'getFieldState') return async (resourceId, options) => {
      await assertCurrent();
      const snapshot = await repository.getFieldState(resourceId, edits.has(resourceId)
        ? {...options, includeOriginal: true, includeDependencies: true} : options);
      if (!edits.has(resourceId)) return snapshot;
      const overrides = [...snapshot.overrides];
      for (const edit of edits.get(resourceId)) {
        const old = overrides.find(row => row.entity_handle === edit.entity_handle && row.field_name === edit.field_name);
        if (old && !canonicalJsonEqual(old.value, edit.value)) throw new TypeError('剧情页与字段对象的 Working 取值冲突');
        if (!old) overrides.push(edit);
      }
      fieldOwner(resourceId).validate(snapshot.original.value, overrides, snapshot.dependencies);
      const version = snapshot.version + active.reduce((sum, record) => sum + record.version + 1, 1);
      return {...snapshot, overrides, version, meta: {...snapshot.meta, version}};
    };
    const value = Reflect.get(target, name);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  return {repository: proxy, fieldDb: createProjectDb({repository: proxy, packageManifest: manifest}), assertCurrent};
}
