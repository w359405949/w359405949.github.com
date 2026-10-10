import { isStoryPageDocument, usableStoryPageWorking, createProjectDb, workingDocumentRecord, assertWorkingDocumentAssignment, isStoryPageWorking, createStoryPageScriptCodec, validateStoryPageReferences, fieldStoredValue, assertStoryPageEntryRom, projectStoryPageWorking, prepareFieldWorking, validateInterfaceStateDocumentReferences, hasFieldOwner, SPARSE_ARRAY_FORMAT, fieldOwner, SCENE_INTERACTION_LAYERS, EXTENDED_APPLICATION_COMMANDS, applicationCommandId, UI_FACILITY_PARAMETER_RESOURCE_IDS, fieldSubmenuCodeValues, fieldSubmenuCodeValue, metaspriteGenericObject, sharedJsonValue, flushAllAutoSaves, db } from './prg-loaders-DnCSmXk9.js';
import { state } from './emulator-Bpa8EsFw.js';
import { PACKAGE_SCHEMA_PATHS, storyPageDefinitionForView } from './baseline-assembly-DW8BWbDB.js';
import { esc, resourceLabel, selectionLayoutFieldReferences, selectionHighlightFields } from './interface-state-preview-Dlotqlmn.js';
import { PAGE_MODULES, loadModuleCatalog } from './page-modules-8OIfo4cI.js';
import { assertJsonValue, isPlainJsonObject, canonicalJsonEqual, cloneJson, isWorkingDirty, editorLog } from './visual-metasprites-IDA0o2Z8.js';
import { readSaveField, saveVehicleAcquisitionFlag } from './physical-field-object-windows-DnQmS3eb.js';
import { EDITOR_PAGES, itemPageRoute, sceneInteractionFlowPage, sceneInteractionFlowMatches, SERVICE_FAMILY_PAGES, interfacePageDefinition } from './editor-renderer-n2nBwXk_.js';
import { uiTemplateBindings } from './page-runtime-paths-BvtuMnH7.js';
import { battleMenuCalls, interfacePatternBanks } from './configuration-table-FR1xSC8W.js';

// @editor-module 页面放置字段对象控件；配置页展开紧凑表，其他页面按需挂载。

// 这些 owner 的字段对象按资源实例登记，不能作为一个抽象模块交给 core 的
// PAGE_MODULES。承载页在这里展开它们；折叠项不会取数或挂载控件。
const FIELD_OBJECT_PAGE_MODULES = Object.freeze({
  scenes: Object.freeze(['scene-encounter-zone']),
  text: Object.freeze(['text.character-map']),
});

// 场景详情页只承载当前场景自己的字段对象；全局表与遇敌区留在场景列表页。
function currentSceneModule() {
  const entry = (state.project?.scenes?.editable_scenes || [])
    .find(item => item.slug === state.sceneSlug);
  return entry ? `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, '0')}` : null;
}

const FIELD_OBJECT_MODULE_TITLES = Object.freeze({
  'application-config-family': '应用配置族',
  'scene-encounter-zone': '场景遇敌区',
  'text.character-map': '字符映射注解',
});

function compactConfigurationPage() {
  return state.view === 'wanted' || state.view === 'shops' && state.shopTab === 'config'
    || ['jukebox', 'vending', 'teleport', 'frograce', 'computercontroller'].includes(state.view)
      && state.facilityTab === 'config';
}

function pageModuleIds(pageId) {
  const id = String(pageId || '');
  if (id === 'scenes' && state.sceneSlug) {
    const scene = currentSceneModule();
    return scene ? [scene] : [];
  }
  return [...new Set([...(PAGE_MODULES[id] || []), ...(FIELD_OBJECT_PAGE_MODULES[id] || [])])];
}

function pageModuleEditorsMarkup(pageId) {
  const modules = pageModuleIds(pageId);
  if (!modules.length) return '';
  if (compactConfigurationPage()) return `<section class="page-module-editors configuration-sections" data-page-modules="${esc(pageId)}">${
    modules.map(moduleId => `<section class="configuration-section" data-page-module="${esc(moduleId)}" data-configuration-module>
      <h2>${esc(moduleId)}</h2><div data-page-module-host="${esc(moduleId)}"></div>
    </section>`).join('')}</section>`;
  return `<section class="page-module-editors" data-page-modules="${esc(pageId)}">${
    modules.map(moduleId => `<details class="wide-card" data-collapse-key="page-module:${esc(moduleId)}" data-page-module="${esc(moduleId)}"${
      moduleId === 'field-reward-resolution-service' ? ' id="investigation-reward-parameters"'
        : moduleId === 'investigation-command' ? ' id="investigation-command-parameters"'
          : ''}>
      <summary>${esc(moduleId)}</summary>
      <div data-page-module-host="${esc(moduleId)}"></div>
    </details>`).join('')}</section>`;
}

async function mountSection(details) {
  const host = details.querySelector('[data-page-module-host]');
  if (!host || host.dataset.pageModuleMounted === '1') return;
  host.dataset.pageModuleMounted = '1';
  const {mountPageFields} = await import('./rectangle-preset-controls-C5lbpUyl.js').then(function (n) { return n.pageFields; });
  await mountPageFields(host, details.dataset.pageModule, null,
    {compact: details.hasAttribute('data-configuration-module')});
}

async function mountPageModuleEditors(root, pageId) {
  const section = root.querySelector(`[data-page-modules="${CSS.escape(String(pageId || ''))}"]`);
  if (!section) return [];
  if (!state.moduleCatalog) state.moduleCatalog = await loadModuleCatalog();
  const sections = [...section.querySelectorAll('[data-page-module]')];
  for (const details of sections) {
    const module = details.dataset.pageModule === 'application-config-family'
      ? null : state.moduleCatalog.module(details.dataset.pageModule);
    const title = details.dataset.pageModule === 'application-config-family'
      ? FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule]
      : module?.title || resourceLabel(details.dataset.pageModule)
        || FIELD_OBJECT_MODULE_TITLES[details.dataset.pageModule];
    if (title) details.querySelector('summary, h2').textContent = title;
    if (details.hasAttribute('data-configuration-module')) {
      await mountSection(details);
      continue;
    }
    details.addEventListener('toggle', () => {void mountSection(details);});
    if (details.open) await mountSection(details);
    if (details.id && location.hash.slice(1).startsWith(details.id)) {
      details.open = true;
      await mountSection(details);
      const suffix = location.hash.slice(details.id.length + 2);
      const select = details.querySelector('[data-module-resource-select]');
      if (details.id === 'investigation-command-parameters' && suffix && select) {
        select.value = `investigation-command:${suffix}`;
        select.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }
  }
  return sections.map(details => details.dataset.pageModule);
}

// @editor-module 浏览器与命令行共用交换文件的结构与基线校验。

function baselineOf(manifest) {
  const baseline = manifest?.build_baseline || manifest?.rom;
  if (!/^[a-f0-9]{64}$/u.test(baseline?.sha256) || !Number.isSafeInteger(baseline.file_bytes))
    throw new TypeError('项目缺少 ROM 基线摘要');
  return {sha256: baseline.sha256, file_bytes: baseline.file_bytes};
}

function parseWorkingExchange(input, manifest) {
  const document = typeof input === 'string' ? JSON.parse(input) : input;
  assertJsonValue(document);
  if (!isPlainJsonObject(document) || document.schema !== 'metalmaxcn.working-exchange'
      || !Array.isArray(document.fields) || document.save_fields !== undefined && !Array.isArray(document.save_fields)
      || document.save_name !== undefined && typeof document.save_name !== 'string')
    throw new TypeError('交换文件必须包含 schema、baseline、fields 数组与可选的 save_fields 数组');
  if (Object.hasOwn(document, 'documents') && !Array.isArray(document.documents))
    throw new TypeError('交换文件的 documents 必须是数组');
  if (!canonicalJsonEqual(document.baseline, baselineOf(manifest)))
    throw new TypeError('ROM 基线摘要不符，拒绝导入');
  return document;
}

// @editor-module 存档交换只使用当前存档的具名字段与领域写入入口。

const jsonValue = value => ArrayBuffer.isView(value) ? [...value] : structuredClone(value);
const derived = field => Boolean(field.binding?.derived || ['vehicle-equipped-bits',
  'vehicle-mount-permission-bits', 'vehicle-equipment-damage-bit'].includes(field.binding?.derivation));
const initializesVehicle = field => saveVehicleAcquisitionFlag(field.id)
  || /^save\.slot\.[12]\.active_rental_vehicle_preset\.[0-2]$/.test(field.id);
const validationOptions = {initializeRentals: true};

function exportSaveWorking(fields, state, {template = false} = {}) {
  if (!fields.ready()) throw new TypeError('当前存档尚未就绪');
  let selected = fields.all().filter(field => !derived(field) && !field.acquisitionPending
    && (template || field.edited) && (template || field.status === 'exact' && field.binding?.editable
      || Object.hasOwn(state.saveDraftFields || {}, field.id)));
  if (!template) {
    const acquisition = selected.filter(initializesVehicle);
    const initialized = fields.validateFields(Object.fromEntries(acquisition.map(field => [field.id, field.value])), {...validationOptions, fromOrigin: true});
    selected = selected.filter(field => initializesVehicle(field)
      || !canonicalJsonEqual(jsonValue(field.value), jsonValue(initialized.drafts[field.id]
        ?? readSaveField(initialized.bytes, field.id, state.saveByteMapDocument))));
  }
  const rows = selected.map(field => ({
    field_id: field.id, value: jsonValue(template ? field.defaultValue : field.value),
    description: {label: field.binding?.label || field.id,
      type: ArrayBuffer.isView(field.defaultValue) || Array.isArray(field.defaultValue) ? 'array' : 'number',
      ...(field.binding?.min !== undefined ? {min: field.binding.min} : {}),
      ...(field.binding?.max !== undefined ? {max: field.binding.max} : {}),
      origin: jsonValue(field.defaultValue),
      save_write: field.status === 'exact' && field.binding?.editable === true ? 'permitted' : 'unpermitted'},
  })).sort((a, b) => a.field_id.localeCompare(b.field_id));
  if (!template) {
    const candidate = fields.validateFields(Object.fromEntries(rows.map(row => [row.field_id, row.value])), {...validationOptions, fromOrigin: true});
    const originalState = state.saveCurrentBytes;
    // 未声明或无许可的已载入原始字节不能伪装成可恢复的字段交换。
    if (candidate.bytes.some((byte, index) => byte !== originalState[index])
        || !canonicalJsonEqual(candidate.drafts, state.saveDraftFields || {}))
      throw new TypeError('当前 SAV 含不能由具名字段恢复的字节；请导出 .sav 保留完整现场');
  }
  return {save_fields: rows,
    ...(typeof state.saveCurrentName === 'string' && state.saveCurrentName !== 'metalmaxcn-current.sav'
      ? {save_name: state.saveCurrentName} : {})};
}

function inspectSaveWorking(document, fields) {
  const accepted = [], rejected = [], seen = new Set();
  const reject = (item, error) => rejected.push({position: item.position, resource_id: 'save-current',
    field_name: item.row?.field_id ?? null, reason: error.message || String(error)});
  const items = [];
  for (const [index, row] of (document.save_fields || []).entries()) {
    const item = {row, position: `$.save_fields[${index}]`};
    try {
      if (!fields?.ready()) throw new TypeError('存档字段不属于当前范围或当前存档尚未就绪');
      if (!isPlainJsonObject(row) || typeof row.field_id !== 'string' || !Object.hasOwn(row, 'value'))
        throw new TypeError('存档字段必须包含 field_id 与 value');
      if (seen.has(row.field_id)) throw new TypeError('重复存档字段');
      seen.add(row.field_id);
      const field = fields.object(row.field_id);
      if (derived(field)) throw new TypeError('派生存档字段不可独立编辑');
      items.push({...item, field});
    } catch (error) {reject(item, error);}
  }
  const edits = list => Object.fromEntries(list.map(({row}) => [row.field_id, row.value]));
  try {fields?.validateFields(edits(items), validationOptions); accepted.push(...items);}
  catch {
    for (const item of items) {
      try {fields.validateFields(edits([...accepted, item]), validationOptions); accepted.push(item);}
      catch (error) {reject(item, error);}
    }
  }
  let name;
  if (document.save_name !== undefined) {
    if (!fields?.ready()) reject({position: '$.save_name'}, new TypeError('当前范围不能导入存档名称'));
    else name = document.save_name;
  }
  return {accepted, rejected, name, overwrite_count: accepted.filter(item => item.field.edited).length};
}

async function importSaveWorking(fields, accepted, name) {
  fields.writeFields(Object.fromEntries(accepted.map(({row}) => [row.field_id, row.value])), {...validationOptions, name});
  await fields.flush();
}

// @editor-module 独立文档交换复用剧情与状态机的正文、引用和入口校验。

async function exportExchangeDocuments(repository) {
  const pages = await repository.listStoryPageWorking?.() || [];
  const records = [...pages.filter(isStoryPageDocument), ...usableStoryPageWorking(pages),
    ...await repository.listInterfaceStateDocuments?.() || []];
  return records.map(record => ({resource_id: record.resource_id, value: cloneJson(record.overrides)}))
    .sort((a, b) => a.resource_id.localeCompare(b.resource_id));
}

function candidateRepository(repository, accepted) {
  const groups = new Map();
  for (const {field, value} of accepted) {
    if (!groups.has(field.resourceId)) groups.set(field.resourceId, []);
    groups.get(field.resourceId).push({entityHandle: field.entityHandle, fieldName: field.fieldName, value});
  }
  return new Proxy(repository, {get(target, key) {
    if (key === 'getFieldState') return async (id, options) => {
      const snapshot = await repository.getFieldState(id, groups.has(id)
        ? {...options, includeOriginal: true, includeDependencies: true} : options);
      if (!groups.has(id)) return snapshot;
      return {...snapshot, overrides: prepareFieldWorking(id, snapshot, groups.get(id), snapshot.original.project_id).overrides};
    };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}

async function inspectExchangeDocuments(database, repository, rows, acceptedFields, {resources = null} = {}) {
  const accepted = [], rejected = [], seen = new Set();
  if (!rows.length) return {accepted, rejected};
  const candidate = candidateRepository(repository, acceptedFields);
  const validationDb = createProjectDb({repository: candidate,
    packageManifest: await database.getPackageDocument('manifest.json', undefined, {readonly: true}), storyPage: () => null,
    packageLoader: path => database.getPackageDocument(path, undefined, {readonly: true})});
  const records = [...await repository.listStoryPageWorking?.() || [],
    ...await repository.listInterfaceStateDocuments?.() || []];
  let scripts = null, story = null, sources = null;
  for (const [index, row] of rows.entries()) {
    const position = `$.documents[${index}]`;
    try {
      if (resources !== null) throw new TypeError('独立文档不属于当前编辑页的字段范围');
      const record = workingDocumentRecord(row);
      if (seen.has(record.resource_id)) throw new TypeError('重复独立文档');
      seen.add(record.resource_id);
      assertWorkingDocumentAssignment(record, records);
      if (isStoryPageWorking(record)) {
        if (isStoryPageDocument(record)) {
          story ||= await database.getPackageDocument('game/story/index.json', undefined, {readonly: true});
          if (!scripts) {
            const assets = await Promise.all(['story-autonomous-script', 'story-interaction-script', 'scene-actor']
              .map(async id => (await repository.getOriginal(id)).value));
            const actors = assets.pop();
            scripts = createStoryPageScriptCodec(story.browser_vm, assets, actors.document ?? actors);
          }
          const document = record.overrides.document;
          scripts.validate(document);
          await validateStoryPageReferences(document, candidate, story.browser_vm.sequences);
          for (const row of document.fields) {
            const field = await validationDb.getField(row.resource, row.handle, row.field);
            if (field.readOnly || field.entityHandle !== row.handle || field.fieldName !== row.field)
              throw new TypeError(`${row.handle}.${row.field}：未知或只读字段`);
            await validationDb.validateFieldValues([{field, value: fieldStoredValue(field, row.value)}]);
          }
          if (record.overrides.rom_entries?.length) {
            assertStoryPageEntryRom(await repository.getManifest());
            for (const program of document.programs) scripts.serializeProgram(program);
          }
        } else {
          for (const id of new Set(record.overrides.edits.map(edit => edit.resource_id))) {
            const snapshot = await candidate.getFieldState(id, {includeOriginal: true, includeDependencies: true});
            if (record.overrides.edits.some(edit => edit.resource_id === id
                && !snapshot.original.value.scripts.some(script => script.id === edit.script_id)))
              throw new TypeError('剧情页引用的 ROM 脚本不存在');
            const projected = projectStoryPageWorking(snapshot.original.value, [record]);
            const changes = await Promise.all(projected.overrides.map(async row => {
              const field = await validationDb.getField(id, row.entity_handle, row.field_name);
              const value = fieldStoredValue(field, row.value);
              await validationDb.validateFieldValues([{field, value}]);
              return {entityHandle: row.entity_handle, fieldName: row.field_name, value};
            }));
            prepareFieldWorking(id, snapshot, changes, snapshot.original.project_id);
          }
        }
      } else {
        sources ||= await validationDb.interfaceStateDocumentSources();
        for (const row of record.overrides.document.fields) {
          const field = await validationDb.getField(row.resourceId, row.handle, row.field);
          if (field.entityHandle !== row.handle || field.fieldName !== row.field)
            throw new TypeError('文档字段须使用仓库的同名键');
          await validationDb.validateFieldValues([{field, value: row.value}]);
        }
        await validateInterfaceStateDocumentReferences(record.overrides.document, validationDb, sources);
      }
      const previous = records.find(row => row.resource_id === record.resource_id);
      accepted.push({row, record, position, hasOverride: Boolean(previous), version: previous?.version});
      const existing = records.findIndex(row => row.resource_id === record.resource_id);
      if (existing >= 0) records.splice(existing, 1);
      records.push(record);
    } catch (error) {
      rejected.push({position, resource_id: row?.resource_id ?? null, entity_handle: null, field_name: null,
        reason: error.message || String(error)});
    }
  }
  return {accepted, rejected};
}

// @editor-module 稀疏 Working 交换复用字段对象、引用候选与仓库候选校验。

const keyOf = row => JSON.stringify([row.resource_id, row.entity_handle, row.field_name]);
const compare = (a, b) => keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0;

async function exchangeManifest(database, repository) {
  const manifest = await repository.getManifest();
  return manifest?.build_baseline || manifest?.rom ? manifest
    : database.getPackageDocument('manifest.json', undefined, {readonly: true});
}

function acceptsResource(resourceId, resources) {
  return resources == null || resources.includes(resourceId);
}

function descriptionIndex(original, resourceId) {
  const owner = fieldOwner(resourceId), document = original.document ?? original;
  const index = new Map();
  for (const object of owner.objects?.(document, {asset: original}) || []) {
    for (const [handle, name] of object.fields) {
      const column = object.editor?.columns?.find(column => column.name === name);
      if (column) index.set(JSON.stringify([handle, name]), column);
    }
  }
  return index;
}

async function describe(database, field, columns) {
  const column = columns.get(JSON.stringify([field.entityHandle, field.fieldName]));
  const candidates = await database.fieldValueCandidates(field);
  const origin = field.defaultValue;
  const collectionBound = Boolean(field.collectionBinding);
  return {
    label: column?.label || field.label || field.fieldName,
    type: Array.isArray(origin) ? 'array' : origin === null ? 'null' : typeof origin,
    ...(column?.min !== undefined ? {min: column.min} : {}),
    ...(column?.max !== undefined ? {max: column.max} : {}),
    ...(column?.semantic ? {semantic: cloneJson(column.semantic)} : {}),
    ...(candidates ? {candidates: cloneJson(candidates)} : {}),
    ...(field.workingFormat ? {working_format: field.workingFormat} : {}),
    origin: cloneJson(origin),
    rom_write: collectionBound || field.writeback?.state !== 'unpermitted' && field.physical ? 'permitted' : 'unpermitted',
  };
}

async function exportWorkingExchange(database, repository, {resources = null, scope = null, template = false, saveFields = null, saveState = null} = {}) {
  if (!template && resources === null) {
    const unsupported = [];
    for (const row of await repository.listWorking()) {
      if (isWorkingDirty(row) && (row.resource_id === 'save-current' ? !saveFields
          : !hasFieldOwner(row.resource_id) && await repository.hasOriginal(row.resource_id)))
        unsupported.push(row.resource_id);
    }
    if (unsupported.length) throw new TypeError(`以下编辑数据使用独立字段入口，当前交换尚不能导出：${[...new Set(unsupported)].join('、')}；可导出项目备份保留全部数据`);
  }
  const fields = [], ids = template ? resources : await repository.listFieldWorkingResourceIds();
  if (!ids) throw new TypeError('模板须指定编辑页或字段对象');
  for (const resourceId of [...new Set(ids)].sort()) {
    if (!acceptsResource(resourceId, resources) || !hasFieldOwner(resourceId)) continue;
    const snapshot = await repository.getFieldState(resourceId, {includeOriginal: true});
    const columns = descriptionIndex(snapshot.original.value, resourceId);
    const overrides = snapshot.overrides.filter(row => resources !== null || !snapshot.storyOwners?.[parseInt(row.entity_handle.split(':').at(-1), 16)]
      && !(row.field_name === 'sequence' && snapshot.storyPages?.some(page => page.overrides.edits.some(edit =>
        edit.resource_id === resourceId && Object.hasOwn(edit, 'sequence')))));
    const source = template ? await database.getFields(resourceId) : await Promise.all(overrides.map(row =>
      database.getField(resourceId, row.entity_handle, row.field_name)));
    for (const field of source) {
      if (field.readOnly || scope && !scope.includes(field) || !template && !field.hasOverride) continue;
      fields.push({resource_id: resourceId, entity_handle: field.entityHandle, field_name: field.fieldName,
        value: template ? field.workingFormat === SPARSE_ARRAY_FORMAT
          ? {kind: SPARSE_ARRAY_FORMAT, entries: []} : cloneJson(field.defaultValue) : cloneJson(field.workingValue),
        description: await describe(database, field, columns)});
    }
  }
  const documents = !template && resources === null ? await exportExchangeDocuments(repository) : [];
  const save = saveFields && acceptsResource('save-current', resources)
    ? exportSaveWorking(saveFields, saveState, {template}) : {};
  return {schema: 'metalmaxcn.working-exchange', baseline: baselineOf(await exchangeManifest(database, repository)),
    fields: fields.sort(compare), ...save, ...(documents.length ? {documents} : {})};
}

function incomingValue(field, value) {
  if (field.workingFormat === SPARSE_ARRAY_FORMAT && isPlainJsonObject(value)
      && value.kind === SPARSE_ARRAY_FORMAT && Array.isArray(value.entries) && value.entries.length === 0
      && Object.keys(value).sort().join() === 'entries,kind') return cloneJson(field.defaultValue);
  return fieldStoredValue(field, value);
}

async function inspectWorkingExchange(database, repository, input, {resources = null, scope = null, saveFields = null} = {}) {
  const document = parseWorkingExchange(input, await exchangeManifest(database, repository));
  const groups = new Map(), rejected = [], seen = new Set();
  const reject = (item, error) => rejected.push({position: item.position, resource_id: item.row?.resource_id ?? null,
    entity_handle: item.row?.entity_handle ?? null, field_name: item.row?.field_name ?? null,
    reason: error?.message || String(error)});
  for (const [index, row] of document.fields.entries()) {
    const item = {row, position: `$.fields[${index}]`};
    try {
      if (!isPlainJsonObject(row) || ['resource_id', 'entity_handle', 'field_name'].some(name =>
        typeof row[name] !== 'string' || !row[name]) || !Object.hasOwn(row, 'value'))
        throw new TypeError('字段必须包含 resource_id、entity_handle、field_name 与 value');
      const key = keyOf(row);
      if (seen.has(key)) throw new TypeError('重复字段');
      seen.add(key);
      if (!acceptsResource(row.resource_id, resources) || scope && !scope.includes(row)) throw new TypeError('字段不属于当前编辑页');
      const field = await database.getField(row.resource_id, row.entity_handle, row.field_name);
      if (field.entityHandle !== row.entity_handle || field.fieldName !== row.field_name)
        throw new TypeError('字段身份须使用仓库的同名键');
      if (field.readOnly) throw new TypeError('只读字段没有编辑许可');
      const value = incomingValue(field, row.value);
      await database.validateFieldValues([{field, value}]);
      Object.assign(item, {field, value});
      if (!groups.has(row.resource_id)) groups.set(row.resource_id, []);
      groups.get(row.resource_id).push(item);
    } catch (error) {reject(item, error);}
  }
  const accepted = [];
  for (const [resourceId, items] of groups) {
    const snapshot = await repository.getFieldState(resourceId, {includeOriginal: true, includeDependencies: true});
    const changes = list => list.map(({field, value}) => ({entityHandle: field.entityHandle, fieldName: field.fieldName, value}));
    let valid;
    try {
      prepareFieldWorking(resourceId, snapshot, changes(items), snapshot.original.project_id);
      valid = items;
    } catch {
      valid = [];
      for (const item of items) {
        try {
          prepareFieldWorking(resourceId, snapshot, changes([...valid, item]), snapshot.original.project_id);
          valid.push(item);
        } catch (error) {reject(item, error);}
      }
    }
    accepted.push(...valid);
  }
  const documents = await inspectExchangeDocuments(database, repository, document.documents || [], accepted, {resources});
  accepted.push(...documents.accepted);
  const save = inspectSaveWorking(document, acceptsResource('save-current', resources) ? saveFields : null);
  rejected.push(...documents.rejected, ...save.rejected);
  return {document, accepted, save_accepted: save.accepted, save_name: save.name, rejected: rejected.sort((a, b) => a.position.localeCompare(b.position, undefined, {numeric: true})),
    overwrite_count: accepted.filter(item => item.field?.hasOverride || item.hasOverride).length + save.overwrite_count};
}

async function importWorkingExchange(database, repository, input, {resources = null, scope = null, saveFields = null, confirm = async () => true} = {}) {
  const plan = await inspectWorkingExchange(database, repository, input, {resources, scope, saveFields});
  if (!await confirm({accepted_count: plan.accepted.length + plan.save_accepted.length, overwrite_count: plan.overwrite_count, rejected: plan.rejected}))
    return {imported_count: 0, overwrite_count: plan.overwrite_count, rejected: plan.rejected, cancelled: true};
  const groups = new Map();
  for (const item of plan.accepted) {
    if (!item.field) continue;
    const id = item.field.resourceId;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(item);
  }
  let imported = 0;
  const rejected = [...plan.rejected];
  const importGroup = async items => {
    try {
      await database.writeFields(items.map(({field, value}) => ({field, value})), {storyPage: null});
      imported += items.length;
    } catch (error) {
      for (const {row, position} of items) rejected.push({position, resource_id: row.resource_id,
        entity_handle: row.entity_handle, field_name: row.field_name, reason: error.message || String(error)});
    }
  };
  const codeGroups = [];
  // 剧情代码激活须在调用字段与独立正文导入后提交。
  for (const [id, items] of groups) {
    if (fieldOwner(id).compilerId === 'story-farjump-code/v1') codeGroups.push(items);
    else await importGroup(items);
  }
  for (const item of plan.accepted.filter(item => item.record)) {
    try {
      const current = await inspectExchangeDocuments(database, repository, [item.row], [], {resources});
      if (current.rejected.length) throw new TypeError(current.rejected[0].reason);
      await repository.importWorkingDocument(item.row, {expectedVersion: item.version});
      for (const id of new Set(item.record.overrides.edits?.map(edit => edit.resource_id) || []))
        await database.refreshFields(id);
      imported += 1;
    } catch (error) {
      rejected.push({position: item.position, resource_id: item.row.resource_id, entity_handle: null, field_name: null,
        reason: error.message || String(error)});
    }
  }
  for (const items of codeGroups) await importGroup(items);
  if (plan.save_accepted.length || plan.save_name !== undefined) {
    try {
      await importSaveWorking(saveFields, plan.save_accepted, plan.save_name);
      imported += plan.save_accepted.length;
    } catch (error) {
      for (const {row, position} of plan.save_accepted) rejected.push({position, resource_id: 'save-current',
        field_name: row.field_id, reason: error.message || String(error)});
      if (!plan.save_accepted.length) rejected.push({position: '$.save_name', resource_id: 'save-current',
        field_name: null, reason: error.message || String(error)});
    }
  }
  return {imported_count: imported, overwrite_count: plan.overwrite_count, rejected, cancelled: false};
}

// @editor-module 页面交换范围由页面、实体、设施与界面构造的字段声明组成。

const identity = row => [row.resource_id ?? row.resourceId, row.entity_handle ?? row.entityHandle,
  row.field_name ?? row.fieldName];
const matches = (id, prefix) => id === prefix || id.startsWith(`${prefix}:`);
const pattern = text => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  .replace(/\\\{(?:index|tag)\\\}/gu, '[0-9A-F]+').replace(/\\\{index10\\\}/gu, '[0-9]+')}$`, 'u');

async function workingExchangeScope(pageId, manifest, readJson, {modules = [], sceneId = null} = {}) {
  const page = EDITOR_PAGES.find(page => page.id === pageId);
  if (!page) throw new TypeError(`未登记编辑页：${pageId}`);
  const assets = new Map(manifest.browser_original_assets.map(row => [row.resource_id, row]));
  const whole = new Set(), rules = new Map(), cache = new Map();
  const read = path => {
    if (!cache.has(path)) cache.set(path, Promise.resolve(readJson(path)).then(value =>
      value.schema === 'metalmaxcn.shared-json' ? sharedJsonValue(value) : value));
    return cache.get(path);
  };
  const document = async id => (await read(assets.get(id).path)).document;
  const add = (id, handle = null, field = null) => {
    if (!id || !assets.has(id) || !hasFieldOwner(id) || !fieldOwner(id).describe) return;
    if (handle === null && field === null) whole.add(id);
    else {
      if (!rules.has(id)) rules.set(id, []);
      rules.get(id).push({handle: handle === null ? null : pattern(handle), field});
    }
  };
  const addPrefix = prefix => {
    for (const id of assets.keys()) if (matches(id, prefix)) add(id);
  };
  const assigned = [...new Set([...(PAGE_MODULES[pageId] || []), ...modules])];
  for (const id of assigned) {
    if (['facility-config', 'application-config-family', 'ui-facility'].includes(id) && page.route.view === 'shops') continue;
    if (id === 'item-entry' && ['items', 'equipment'].includes(page.route.view)) continue;
    addPrefix(id);
  }
  const declarations = await read('metadata/entities.json');
  for (const entity of Object.values(declarations.entity_classes || {})) {
    for (const facet of Object.values(entity.facets || {})) {
      if ((facet.page || entity.primary_page) !== pageId || facet.runtime?.provider) continue;
      const runtime = facet.runtime;
      if (runtime?.records) for (const record of runtime.records)
        for (const name of record.fields || runtime.fields || [null]) add(runtime.resource_id, record.entity_handle, name);
      else if (runtime?.kind === 'fragments') {
        const id = runtime.resource_id;
        if (!assets.has(id)) {addPrefix(id); continue;}
        const asset = await read(assets.get(id).path);
        for (const field of fieldOwner(id).describe(asset.document, {asset}))
          if (runtime.fragments.includes(field.fragmentId)) add(id, field.entityHandle, field.fieldName);
      } else add(runtime?.resource_id || facet.field_object);
      for (const other of runtime?.also || []) for (const name of other.fields) add(other.resource_id, other.entity_handle, name);
    }
  }
  if (['items', 'equipment'].includes(page.route.view)) {
    whole.delete('item-entry'); rules.delete('item-entry');
    for (const item of (await document('item-entry')).records) {
      const route = itemPageRoute(item);
      if (route.view === page.route.view && route.equipmentDomain === page.route.equipmentDomain)
        add('item-entry', `item-entry:item:${Number(item.id).toString(16).toUpperCase().padStart(2, '0')}`);
    }
  }
  if (page.route.view === 'metatiles') {
    for (const id of ['metatile-page', 'metatile-set', 'palette', 'scene', 'shared-chr-bank', 'terrain-whitelist']) addPrefix(id);
  }
  if (page.route.view === 'monster-formations') addPrefix('encounter-formation');
  if (page.route.view === 'text') add('text.character-map');
  const flow = sceneInteractionFlowPage(pageId);
  if (flow) {
    const [, layer, parent] = SCENE_INTERACTION_LAYERS.find(([kind]) => kind === flow.filter.kind);
    for (const id of assets.keys()) if (id.startsWith('scene:')) {
      const original = await document(id), layers = original.logic.layers;
      for (const record of (parent ? layers[parent][layer] : layers[layer]) || [])
        if (sceneInteractionFlowMatches(flow, {kind: flow.filter.kind, sceneId: original.scene_id, record})) {
          const width = flow.filter.kind === 'investigation-tile' ? 4 : 2;
          add(id, `${id}:${flow.filter.kind}:${Number(record.id).toString(16).toUpperCase().padStart(width, '0')}`);
        }
    }
  }
  if (sceneId !== null) {
    whole.clear(); rules.clear();
    const id = `scene:${Number(sceneId).toString(16).toUpperCase().padStart(2, '0')}`;
    add(id);
    const actors = (await document(id)).logic.layers.actors;
    for (const actor of [...actors.records, ...(actors.dynamic_variants || []).flatMap(row => row.actor_list.records)])
      add('scene-actor', actor.uid);
  }
  const routes = [page.route, ...(page.variants || []).map(row => row.route)];
  const services = SERVICE_FAMILY_PAGES.filter(service => routes.some(route =>
    Object.entries(service.route).every(([key, value]) => key === 'facility'
      || key === 'interface' && String(route.interface || route.interfacePage) === String(value)
      || key === 'shopTab' && value === 'ui' && route.shopTab !== 'buyer'
      || String(route[key]) === String(value))));
  const definitions = [interfacePageDefinition(pageId), ...services,
    ...(page.variants || []).map(row => interfacePageDefinition(row.id))].filter(Boolean);
  if (page.route.resource?.startsWith('application-command:')) definitions.push({
    commandIds: [Number.parseInt(page.route.resource.slice(-2), 16)], interfaceIds: ['frog-race']});
  if (page.route.view === 'generic-shop') {
    add('application-program');
    for (const id of EXTENDED_APPLICATION_COMMANDS) add(applicationCommandId(id));
  }
  const interfaces = new Set(definitions.flatMap(row => row.interfaceIds || [row.id]));
  for (const id of UI_FACILITY_PARAMETER_RESOURCE_IDS)
    if (interfaces.has(id.split(':')[1])) add(id);
  const states = new Set(definitions.flatMap(row => row.stateIds || []));
  const excluded = new Set(definitions.flatMap(row => row.excludedStateIds || []));
  const screens = new Set(definitions.flatMap(row => row.screenIds || []));
  const commands = new Set(definitions.flatMap(row => row.commandIds || []));
  const reference = value => {
    if (typeof value === 'string' && /^record:[0-9A-F]{2}:[0-9]{3}$/u.test(value)) {
      add('text-record', value); return;
    }
    if (!value || typeof value !== 'object') return;
    const id = value.resource_id ?? value.resourceId;
    const handle = value.entity_handle ?? value.handle;
    const field = value.field ?? value.field_name ?? value.fieldName;
    if (id && handle) add(id, handle, field ?? null);
    for (const name of ['record', 'record_id', 'reference', 'node_id']) {
      const handle = value[name];
      if (typeof handle === 'string' && /^record:[0-9A-F]{2}:[0-9]{3}$/u.test(handle)) add('text-record', handle);
    }
    for (const child of Object.values(value)) reference(child);
  };
  const readField = async source => {
    reference(source);
    const owner = fieldOwner(source.resource_id);
    if (owner.hasReadOnlyField?.(source.entity_handle, source.field)) {
      const fields = await owner.loadReadOnlyFields({database: {getPackageDocument: read}});
      return owner.loadReadOnlyField(source.entity_handle, source.field, fields);
    }
    const asset = await read(assets.get(source.resource_id).path);
    const field = owner.describe(asset.document, {asset}).find(field =>
      field.entityHandle === source.entity_handle && field.fieldName === source.field);
    if (!field) throw new TypeError(`界面缺少字段：${source.entity_handle}.${source.field}`);
    return {value: field.defaultValue};
  };
  for (const definition of definitions) {
    if (definition.configHandles) for (const handle of definition.configHandles) add(definition.configResourceId, handle);
    else if (definition.configResourceId) add(definition.configResourceId);
  }
  for (const command of commands) {
    const id = applicationCommandId(command);
    add(id);
    if (!assets.has(id)) continue;
    const config = (await document(id)).configuration_family_resource_id;
    if (config) {
      const family = Number.parseInt(config.slice(-2), 16);
      const source = await document('facility-config');
      for (const row of source.families.find(row => row.id === family)?.records || []) add('facility-config', row.record_id);
    }
  }
  if (definitions.length) {
    const [dispatch, catalog, templates] = await Promise.all(['project.ui.dispatch', 'project.ui.interfaces', 'project.ui.templates']
      .map(schema => read(PACKAGE_SCHEMA_PATHS[schema][0])));
    const accepts = row => !excluded.has(row.interface_state_id || row.state)
      && (states.size ? states.has(row.interface_state_id || row.state)
        : (row.interface_ids || [row.interface_id || row.interface]).some(id => interfaces.has(id))
          || interfaces.has((row.interface_state_id || row.state || '').split('.')[0])
          || screens.has(`ui-screen:${row.id}`));
    for (const entry of catalog.interfaces.filter(row => interfaces.has(row.id)))
      for (const state of entry.states.filter(row => row.status !== 'unreachable' && !excluded.has(row.id)
          && (!states.size || states.has(row.id)))) {
        for (const row of state.evidence?.records || []) add('text-record', row.id);
        reference(state.input_binding);
      }
    for (const binding of uiTemplateBindings(templates).filter(accepts)) reference(binding);
    const selections = [...dispatch.previews.filter(accepts), ...(dispatch.choice_groups || [])
      .filter(group => (group.interface_state_ids || []).some(state => accepts({interface_state_id: state})))
      .map(group => ({...group, selection_cursor: group.cursor_source}))];
    for (const preview of selections) {
      reference(preview);
      const source = preview.selection_cursor;
      if (source?.kind === 'indexed-coordinate' && Number.isInteger(source.selector)) {
        const selection = await document('selection-layout');
        const selector = selection.selectors.find(row => row.selector === (source.selection_profile_selector ?? source.selector));
        const profile = selection.profiles[selector?.profile];
        for (const row of selectionLayoutFieldReferences(selection, source)) add(row.resourceId || 'selection-layout', row.handle, row.fieldName);
        for (const handle of [...(profile?.x_fields || []), ...(profile?.y_fields || []),
          ...selectionHighlightFields(selection, preview)]) add('selection-layout', handle, 'coordinate');
      }
    }
    if (['battle-command-target', 'battle-party-status', 'battle-items-equipment'].includes(pageId)) {
      const calls = await battleMenuCalls(readField, {menu_dispatch_data: dispatch});
      for (const handle of [...Object.values(calls.layouts), calls.name_record,
        ...(pageId === 'battle-items-equipment' ? [calls.shell_record, calls.shell_count_record] : []),
        ...(pageId === 'battle-command-target' ? [calls.target_record] : [])]) add('text-record', handle);
      const selection = await document('selection-layout');
      const selectors = pageId === 'battle-items-equipment' ? [calls.equipment_selector, calls.shell_selector]
        : [calls.human_selector, calls.vehicle_selector, calls.target_selector];
      for (const selector of selectors) {
        for (const row of selectionLayoutFieldReferences(selection, {selector})) add(row.resourceId || 'selection-layout', row.handle, row.fieldName);
        const profile = selection.profiles[selection.selectors.find(row => row.selector === selector)?.profile];
        for (const handle of [...profile.x_fields, ...profile.y_fields]) add('selection-layout', handle, 'coordinate');
      }
    }
  }
  if (pageId === 'common-elements') {
    const rectangles = await document('ui-tile-rectangle-service');
    for (const row of rectangles.rectangle_presets.filter(row => ['00', '02', '06', '28', '2E'].includes(row.id)))
      for (const block of [row.origin_block, row.dimensions_block]) add('ui-tile-rectangle-service', `ui-tile-rectangle-service:${block}`);
    const text = await document('text-render-runtime');
    add('text-render-runtime', 'text-render-runtime:window-clear-selector');
    for (const row of text.tile_transfer_presets) for (const block of [row.origin_block, row.geometry_block])
      add('text-render-runtime', `text-render-runtime:${block}`);
    reference(text.wait_marker);
    for (const id of ['ui-equipment-control', 'ui-role-status']) add(id);
    add('char', null, 'core_glyph_bitmap');
    add('core-latin', 'core-latin:slot-0x63');
    for (let index = 0; index < 4; index++) add('actor-visual', null, `color_${index}`);
    const fixed = await document('fixed-text-slot');
    for (const field of fieldOwner('fixed-text-slot').describe(fixed))
      if (field.recordId.startsWith('ui-status:')) add('fixed-text-slot', field.entityHandle, field.fieldName);
    const selection = await document('selection-layout');
    reference(selection.common_cursor); reference(selection.highlights);
    const sources = [selection.common_cursor.metasprite_id_source, selection.highlights.metasprite_id_source];
    const metasprites = await document('metasprite-record');
    const references = await document('metasprite');
    const ids = await Promise.all(sources.map(async source => (await readField(source)).value));
    const markerNames = Array.from({length: 12}, (_, index) => `shop-equipment-category-marker-${index}`);
    const markerValues = await fieldSubmenuCodeValues(markerNames, readField);
    ids.push(...markerNames.map(name => fieldSubmenuCodeValue(markerValues, name)));
    for (const id of new Set(ids)) {
      const object = metaspriteGenericObject(metasprites, references.records.find(row => row.id === id));
      for (const source of object.source_fields.slice(1)) reference(source);
    }
    for (const handle of selection.highlights.x_fields) add('selection-layout', handle, 'coordinate');
    add('sprite-palette', 'sprite-palette:colors', 'value18'); add('sprite-palette', 'sprite-palette:colors', 'value19');
    const status = await document('ui-vehicle-status'), actions = await document('battle-action');
    for (const part of status.portrait_part_art) {
      const handle = part.action_reference.resource_id;
      for (const field of fieldOwner('battle-action').describe(actions).filter(field =>
        field.entityHandle === handle && field.fieldName !== 'palette_id')) add('battle-action', handle, field.fieldName);
      add('battle-object-layout', actions.records.find(row => row.handle === handle).layout_reference);
    }
    const [dispatch, staticAssets, vehicle] = await Promise.all([
      read(PACKAGE_SCHEMA_PATHS['project.ui.dispatch'][0]), read('game/ui/construction/static/index.json'),
      document('vehicle-visual-selector')]);
    for (const group of ['menu', 'vehicle']) for (const bank of interfacePatternBanks(group,
      {menu_dispatch_data: dispatch, static_assets: staticAssets}, vehicle))
      add('shared-chr-bank', `shared-chr-bank:bank:${bank.toString(16).toUpperCase().padStart(2, '0')}:tile:{index}`);
  }
  const resources = [...new Set([...whole, ...rules.keys()])].sort();
  return {pageId, resources, includes(row) {
    const [id, handle, field] = identity(row);
    return whole.has(id) || (rules.get(id) || []).some(rule => (!rule.handle || rule.handle.test(handle))
      && (rule.field === null || rule.field === field));
  }};
}

// @editor-module 项目与页头的编辑数据交换入口共用导入预检与结果显示。

function workingExchangeButtons({project = false} = {}) {
  return `<span class="working-exchange-actions" data-working-exchange="${project ? 'project' : 'page'}">
    <button type="button" class="button ghost" data-working-export title="导出${project ? '全部' : '本页'}编辑数据" aria-label="导出${project ? '全部' : '本页'}编辑数据">${project ? '导出编辑数据' : '⇧'}</button>
    <button type="button" class="button ghost" data-working-import title="导入${project ? '全部' : '本页'}编辑数据" aria-label="导入${project ? '全部' : '本页'}编辑数据">${project ? '导入编辑数据' : '⇩'}</button>
    <input type="file" data-working-file accept="application/json,.json" hidden>
  </span>`;
}

function report(result) {
  const message = `已导入 ${result.imported_count} 项编辑数据；拒绝 ${result.rejected.length} 项`;
  editorLog.record({source: '编辑数据交换', level: result.rejected.length ? 'warning' : 'info', message});
  const dialog = document.createElement('dialog');
  const output = document.createElement('pre');
  output.textContent = [message, ...result.rejected.map(row =>
    `${row.position} · ${row.entity_handle ?? row.resource_id ?? ''}.${row.field_name ?? ''}：${row.reason}`)].join('\n');
  const close = document.createElement('button');
  close.className = 'button';
  close.textContent = '关闭';
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.append(output, close);
  document.body.append(dialog);
  dialog.showModal();
}

async function resourcesForPage(page) {
  const entry = (state.project?.scenes?.editable_scenes || []).find(row => row.slug === state.sceneSlug);
  return workingExchangeScope(page.id, state.browserPackageManifest,
    path => db.getPackageDocument(path), {modules: pageModuleIds(page.id),
      sceneId: page.id === 'scenes' && state.sceneSlug ? entry?.id ?? null : null});
}

function bindWorkingExchange(root, {afterImport = () => {}, page = null} = {}) {
  for (const actions of root.querySelectorAll('[data-working-exchange]')) {
    if (actions.dataset.bound) continue;
    actions.dataset.bound = '1';
    const project = actions.dataset.workingExchange === 'project';
    const input = actions.querySelector('[data-working-file]');
    const run = async operation => {
      const buttons = actions.querySelectorAll('button');
      for (const button of buttons) button.disabled = true;
      try {
        await flushAllAutoSaves();
        if (!state.projectRepository) throw new TypeError('当前项目仓库不可用');
        const scope = project || page?.id === 'save' ? null : await resourcesForPage(page);
        const resources = !project && page?.id === 'save' ? ['save-current'] : scope?.resources ?? null;
        if (resources?.length === 0) throw new TypeError('当前编辑页缺少字段对象范围声明');
        const database = createProjectDb({repository: state.projectRepository, packageManifest: state.browserPackageManifest,
          packageLoader: path => db.getPackageDocument(path, undefined, {readonly: true}), storyPage: () => null});
        let saveFields = null;
        if (project || page?.id === 'save') {
          const session = await import('./configuration-table-FR1xSC8W.js').then(function (n) { return n.saveEditorSession; });
          await session.prepareSaveEditorWorkspace();
          await Promise.all(['vehicle-preset', 'item-entry', 'shared-indexed-byte-overlays']
            .map(id => db.getResourceDocument(id)));
          saveFields = session.saveFields;
          if (!saveFields.ready()) throw new TypeError(state.saveError || '当前存档尚未就绪');
        }
        await operation(resources, database, scope, saveFields);
      } catch (error) {
        editorLog.error('编辑数据交换', error.message || String(error), error);
        report({imported_count: 0, rejected: [{position: '$', reason: error.message || String(error)}]});
      } finally {
        for (const button of buttons) button.disabled = false;
        input.value = '';
      }
    };
    actions.querySelector('[data-working-export]').addEventListener('click', () => run(async (resources, database, scope, saveFields) => {
      const document = await exportWorkingExchange(database, state.projectRepository, {resources, scope, saveFields, saveState: state});
      const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2) + '\n'], {type: 'application/json'}));
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `metalmaxcn-working-${project ? 'project' : page.id}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }));
    actions.querySelector('[data-working-import]').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void run(async (resources, database, scope, saveFields) => {
        const result = await importWorkingExchange(database, state.projectRepository, await file.text(), {resources, scope, saveFields, saveState: state,
          confirm: plan => globalThis.confirm(`将导入 ${plan.accepted_count} 项编辑数据，覆盖已有 Working ${plan.overwrite_count} 项，拒绝 ${plan.rejected.length} 项。继续吗？`)});
        if (!result.cancelled) {await afterImport(); report(result);}
      });
    });
  }
}

function mountPageWorkingExchange(head, {page, ...options}) {
  head.querySelector('[data-working-exchange]')?.remove();
  if (!page || storyPageDefinitionForView(state.view) || ['home', 'build', 'log', 'emulator', 'handlers'].includes(state.view)
      || state.view.startsWith('bytemap-')) return;
  const target = head.querySelector('.head-actions') || head;
  target.insertAdjacentHTML('beforeend', workingExchangeButtons());
  bindWorkingExchange(head, {...options, page});
}

export { bindWorkingExchange, mountPageModuleEditors, mountPageWorkingExchange, pageModuleEditorsMarkup, workingExchangeButtons };
