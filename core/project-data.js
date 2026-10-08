// @editor-module 提供资产定点编辑、选择性重置和迁移写入入口，写后使 DB 失效。
import {assertEditPoliciesPreserved, migrateLegacyOpaqueEditPolicies} from "./edit-policy.js";
import {canonicalJsonEqual, isPlainJsonObject} from "./project-store-values.js";
import {db} from "./project-db.js";
import {hasFieldOwner, fieldOwner} from "./field-owners.js";
import {SPARSE_ARRAY_FORMAT, fieldAssetPaths} from "./field-codec.js";
import {state} from "./state.js";

function cloneJson(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function semanticAsset(value, resourceId) {
  if (!isPlainJsonObject(value) || value.resource_id !== resourceId ||
      !isPlainJsonObject(value.document) || !Array.isArray(value.components)) {
    throw new TypeError(`${resourceId}: browser project value is not a semantic asset`);
  }
  return value;
}

function editableJsonAsset(value, resourceId) {
  if (!isPlainJsonObject(value) || value.resource_id !== resourceId ||
      !isPlainJsonObject(value.document)) {
    throw new TypeError(`${resourceId}: browser project value is not an editable JSON asset`);
  }
  return value;
}

/** Save a full JSON document without imposing one domain's component schema. */
async function updateProjectAssetDocument(
  repository,
  resourceId,
  mutate,
  {expectedVersion} = {},
) {
  return updateProjectAssetValue(repository, resourceId, async next => {
    editableJsonAsset(next, resourceId);
    await mutate(next.document, next);
    editableJsonAsset(next, resourceId);
  }, {expectedVersion});
}

/** Flat semantic resources (such as Story scripts) use the same write boundary. */
async function updateProjectAssetValue(
  repository, resourceId, mutate, {expectedVersion} = {},
) {
  if (!repository || typeof repository.resolve !== "function" ||
      typeof repository.saveValue !== "function") {
    throw new TypeError("repository must implement resolve/saveValue");
  }
  if (typeof resourceId !== "string" || !resourceId.trim()) {
    throw new TypeError("resourceId must be a non-empty string");
  }
  if (typeof mutate !== "function") throw new TypeError("mutate must be callable");
  const resolved = await repository.resolve(resourceId);
  const before = resolved.value;
  if (!isPlainJsonObject(before) || before.resource_id !== resourceId) {
    throw new TypeError(`${resourceId}: invalid asset identity`);
  }
  const next = cloneJson(before);
  await mutate(next);
  assertEditPoliciesPreserved(before, next, resourceId);
  if (next.resource_id !== before.resource_id) {
    throw new TypeError(`${resourceId}: editor changed asset identity`);
  }
  const saved = await repository.saveValue(resourceId, next, {
    previousValue: before,
  });
  // 所有编辑器保存最终都经过这里；在来源边界统一失效，避免某个页面忘记清理
  // project-db 后又被旧 working 值覆盖。
  db.invalidateResource(resourceId);
  return {...saved, changed: !canonicalJsonEqual(before, next)};
}

/**
 * 修改本次读取的字段，并在最新 Working 上提交。
 *
 * The callback receives the cloned document and complete asset. It may mutate
 * either in place, but must not replace schema/resource identity or immutable
 * component preimages.
 */
async function updateSemanticProjectAsset(repository, resourceId, mutate) {
  if (!repository || typeof repository.resolve !== "function" ||
      typeof repository.saveValue !== "function") {
    throw new TypeError("repository must implement resolve/saveValue");
  }
  if (typeof resourceId !== "string" || !resourceId.trim()) {
    throw new TypeError("resourceId must be a non-empty string");
  }
  if (typeof mutate !== "function") throw new TypeError("mutate must be callable");

  const resolved = await repository.resolve(resourceId);
  const before = semanticAsset(resolved.value, resourceId);
  const saved = await updateProjectAssetDocument(
    repository,
    resourceId,
    async (document, next) => {
      await mutate(document, next);
      semanticAsset(next, resourceId);
      if (!canonicalJsonEqual(next.components, before.components)) {
        throw new TypeError(`${resourceId}: editor changed immutable asset components`);
      }
    },
    {expectedVersion: resolved.version},
  );
  return saved;
}

/**
 * Upgrade legacy Working policy metadata from one storage read's snapshots.
 * This is a storage migration, not an editor callback: current Original owns
 * the policy. Resolving again here would re-enter the in-flight migration.
 */
export async function migrateLegacyProjectAssetEditPolicies(
  repository,
  resourceId,
  {original, working},
) {
  if (!repository || typeof repository.saveValue !== "function") {
    throw new TypeError("repository must implement saveValue");
  }
  requireResourceId(resourceId);
  if (!isPlainJsonObject(original) || !isPlainJsonObject(working) ||
      original.resource_id !== resourceId || working.resource_id !== resourceId ||
      original.revision_id !== working.revision_id || working.layer !== "working" ||
      !Number.isSafeInteger(working.version) || working.version < 0) {
    throw new TypeError(`${resourceId}: migration requires matching storage snapshots`);
  }
  const migrated = migrateLegacyOpaqueEditPolicies(
    editableJsonAsset(original.value, resourceId),
    editableJsonAsset(working.value, resourceId),
  );
  if (migrated === null) return working;
  const saved = await repository.saveValue(resourceId, migrated, {
    previousValue: working.value,
  });
  db.invalidateResource(resourceId);
  return saved;
}

function requireResetRepository(repository, method) {
  if (!repository || typeof repository[method] !== "function") {
    throw new TypeError(`repository must implement ${method}`);
  }
  return repository;
}

function requireResourceId(resourceId) {
  if (typeof resourceId !== "string" || !resourceId.trim()) {
    throw new TypeError("resourceId must be a non-empty string");
  }
  return resourceId;
}

/** 在最新 Working 中把所选位置恢复为当前 Origin。 */
async function resetProjectAssetSelections(
  repository,
  resourceId,
  selectors,
  {expectedVersion} = {},
) {
  if (hasFieldOwner(resourceId) && fieldOwner(resourceId).workingFormat !== SPARSE_ARRAY_FORMAT) {
    const fields = await projectFieldsForSelectors(repository, resourceId, selectors);
    await resetProjectFields(db, fields, {expectedVersion});
    return db.readResource(resourceId);
  }
  requireResetRepository(repository, "resetSelections");
  requireResourceId(resourceId);
  const reset = await repository.resetSelections(
    resourceId,
    selectors,
    {expectedVersion},
  );
  if (!isPlainJsonObject(reset.value) || reset.value.resource_id !== resourceId) {
    throw new TypeError(`${resourceId}: reset changed asset identity`);
  }
  db.invalidateResource(resourceId);
  return reset;
}

/** Batch keyed records atomically; each selector may target another array. */
async function resetProjectAssetItems(
  repository,
  resourceId,
  itemSelectors,
  options,
) {
  if (!Array.isArray(itemSelectors) || !itemSelectors.length) {
    throw new TypeError("itemSelectors must be a non-empty array");
  }
  return resetProjectAssetSelections(
    repository,
    resourceId,
    itemSelectors.map(selector => ({...selector, kind: "item"})),
    options,
  );
}

/** Batch property paths atomically; a path absent from base is deleted. */
async function resetProjectAssetPaths(
  repository,
  resourceId,
  paths,
  options,
) {
  if (!Array.isArray(paths) || !paths.length) {
    throw new TypeError("paths must be a non-empty array");
  }
  return resetProjectAssetSelections(
    repository,
    resourceId,
    paths.map(path => ({kind: "path", path})),
    options,
  );
}

/** Convenience form used by a single table-row button. */

const fieldSelectionSources = new WeakMap();

async function fieldSelectionSource(repository, resourceId) {
  if (requireBrowserProjectRepository(state) !== repository) throw new TypeError("字段选区不属于当前项目会话");
  const selection = await db.getFieldSelectionSource(resourceId);
  const fields = selection.fields;
  if (!fields.length) throw new TypeError("字段选区缺少字段");
  let source = fieldSelectionSources.get(fields[0]);
  if (!source) {
    source = (async () => {
      const byPath = new Map();
      for (const field of fields) for (const path of fieldAssetPaths(field)) for (let size = 1; size <= path.length; size++) {
        const key = JSON.stringify(path.slice(0, size));
        if (!byPath.has(key)) byPath.set(key, new Set());
        byPath.get(key).add(field);
      }
      return {fields, original: selection.original, byPath, selection};
    })();
    fieldSelectionSources.set(fields[0], source);
    source.catch(() => fieldSelectionSources.delete(fields[0]));
  }
  return source;
}

function selectProjectFields({original, byPath}, selectors) {
  if (!Array.isArray(selectors) || !selectors.length) throw new TypeError("字段选区不能为空");
  const selected = new Set();
  // 选区可以落在字段值内部（`logic.layers.transitions.point_transitions[0]`、剧情脚本的
  // 字节下标）：认最深的已登记前缀，但余下的路径必须真的落在那一份值里——随便给一条
  // 路径不该选中某个字段。
  const valueAt = (value, path) => path.reduce(
    (node, key) => node === null || node === undefined ? undefined : node[key], value);
  const coveringFields = path => {
    for (let size = path.length - 1; size > 0; size -= 1) {
      const parent = byPath.get(JSON.stringify(path.slice(0, size)));
      if (!parent?.size) continue;
      const suffix = path.slice(size);
      const covered = [...parent].filter(field => valueAt(field.defaultValue, suffix) !== undefined);
      if (covered.length) return new Set(covered);
    }
    return null;
  };
  for (const selector of selectors) {
    let path;
    if (selector?.kind === "path") path = selector.path;
    else if (selector?.kind === "item") {
      const collection = selector.collectionPath?.reduce((node, key) => node?.[key], original);
      if (!Array.isArray(collection)) throw new TypeError("字段选区集合不存在");
      const indices = collection.flatMap((row, index) => String(row?.[selector.identityKey]) === String(selector.identityValue) ? [index] : []);
      if (indices.length !== 1) throw new TypeError("字段选区身份不唯一");
      path = [...selector.collectionPath, indices[0]];
    } else throw new TypeError("字段选区类型无效");
    if (!Array.isArray(path) || !path.length) throw new TypeError("字段选区路径无效");
    const matches = byPath.get(JSON.stringify(path)) ?? coveringFields(path);
    if (!matches?.size) throw new TypeError("字段选区没有登记字段");
    matches.forEach(field => selected.add(field));
  }
  return [...selected];
}

export async function projectFieldsForSelectors(repository, resourceId, selectors) {
  const source = await fieldSelectionSource(repository, resourceId);
  return selectProjectFields(source, selectors).map(source.selection.resolve);
}

export async function projectAssetSelectionStates(
  repository,
  resourceId,
  groups,
) {
  if (hasFieldOwner(resourceId) && fieldOwner(resourceId).workingFormat !== SPARSE_ARRAY_FORMAT) {
    if (!Array.isArray(groups) || !groups.length) throw new TypeError("字段选区组不能为空");
    const source = await fieldSelectionSource(repository, resourceId);
    const states = Object.create(null);
    for (const group of groups) {
      if (!group || typeof group.key !== "string" || !group.key || Object.hasOwn(states, group.key))
        throw new TypeError("字段选区组无效");
      const fields = selectProjectFields(source, group.selectors);
      states[group.key] = fields.some(source.selection.overridden);
    }
    const dirty = source.selection.dirty;
    return {resource_id: resourceId, layer: dirty ? "working" : "original", version: source.selection.version, dirty, states};
  }
  if (hasFieldOwner(resourceId) && fieldOwner(resourceId).workingFormat === SPARSE_ARRAY_FORMAT) {
    const fields = await db.getFields(resourceId);
    if (fields.every(field => field.workingFormat === SPARSE_ARRAY_FORMAT)) {
      if ((await repository.getManifest()).project_id !== fields[0].key[0])
        throw new TypeError("字段选区不属于当前项目");
      if (!Array.isArray(groups) || !groups.length) throw new TypeError("字段选区组不能为空");
      const states = Object.create(null);
      for (const group of groups) {
        if (!group || typeof group.key !== "string" || !group.key || Object.hasOwn(states, group.key)
            || !Array.isArray(group.selectors) || !group.selectors.length)
          throw new TypeError("字段选区组无效");
        states[group.key] = group.selectors.some(selector => {
          if (selector?.kind !== "path" || !Array.isArray(selector.path))
            throw new TypeError("数组字段只接受值路径选区");
          return fields.some(field => {
            const path = ["document", ...field.documentPath], selected = selector.path;
            const common = Math.min(path.length, selected.length);
            if (!path.slice(0, common).every((part, index) => part === selected[index])) return false;
            if (selected.length <= path.length) return field.hasOverride;
            if (selected.length !== path.length + 1 || !Number.isSafeInteger(selected.at(-1))
                || selected.at(-1) < 0 || selected.at(-1) >= field.defaultValue.length)
              throw new TypeError("数组字段选区越界");
            return field.workingValue?.entries.some(entry => entry.index === selected.at(-1)) || false;
          });
        });
      }
      return {resource_id: resourceId, layer: fields.some(field => field.hasOverride) ? "working" : "original",
        version: fields[0].version, dirty: fields.some(field => field.hasOverride), states};
    }
  }
  requireResetRepository(repository, "selectionStates");
  requireResourceId(resourceId);
  return repository.selectionStates(resourceId, groups);
}

export async function projectAssetSelectionsDirty(
  repository,
  resourceId,
  selectors,
) {
  if (hasFieldOwner(resourceId))
    return (await projectAssetSelectionStates(repository, resourceId,
    [{key: "selection", selectors}])).states.selection;
  requireResetRepository(repository, "selectionsDirty");
  requireResourceId(resourceId);
  return repository.selectionsDirty(resourceId, selectors);
}

export function requireBrowserProjectRepository(state) {
  const repository = state?.projectRepository;
  if (!repository) {
    throw new Error("当前项目尚未初始化，不能保存更改");
  }
  return repository;
}

export {createProjectFieldDraft, projectFieldDraftRevision, acceptProjectFieldDraft} from "./project-field-draft.js";

export function applyFacilityConfigurationProjection(project, document, dirty = false) {
  const entries = project.facilities?.configuration_loader?.pointer_entries;
  if (!Array.isArray(entries) || !Array.isArray(document?.families) ||
      !Array.isArray(document?.records)) return;
  const records = new Map(document.records.map(record => [record.id, record]));
  const families = new Map(document.families.map(family => [Number(family.id), family]));
  for (const entry of entries) {
    const family = families.get(Number(entry.family_id));
    if (!family) throw new Error(`facility-config missing family ${entry.family_id}`);
    const recordIds = new Map((family.records || []).map(record => [
      Number(record.id), record.record_id,
    ]));
    for (const projection of entry.records || []) {
      const record = records.get(recordIds.get(Number(projection.id)));
      if (!record || !Array.isArray(record.slots)) {
        throw new Error(
          `facility-config missing ${entry.family_id}:${projection.id}`,
        );
      }
      // readResource supplies getters backed by the shared field instances.
      // Keep held facility projections live without a second saved value set.
      for (const [key, read] of Object.entries({
        values: () => record.slots.map(slot => Number(slot.value)),
        values_hex: () => record.slots.map(slot => `0x${Number(slot.value).toString(16).toUpperCase().padStart(2, "0")}`),
        payload_hex: () => record.slots.map(slot => Number(slot.value).toString(16).toUpperCase().padStart(2, "0")).join(" "),
      })) Object.defineProperty(projection, key, {configurable: true, enumerable: true, get: read});
    }
  }
  const jukebox = project.facilities.facilities?.find(row => row.id === 'jukebox');
  for (const track of jukebox?.configuration?.tracks || []) {
    const alias = families.get(0x0a)?.records.find(row => Number(row.id) === Number(track.configuration_id));
    const record = records.get(alias?.record_id);
    const slot = record?.slots.find(row => Number(row.id) === Number(track.index));
    if (!slot) continue;
    Object.defineProperties(track, {
      audio_command_id: {configurable: true, enumerable: true, get: () => Number(slot.value)},
      audio_command_id_hex: {configurable: true, enumerable: true,
        get: () => `0x${Number(slot.value).toString(16).toUpperCase().padStart(2, '0')}`},
    });
  }
  project.facilities.configuration_writeback_state = {
    component: document.component_id,
    length: Number(document.byte_length),
    modified: Boolean(dirty),
  };
}

/**
 * Unified field mutations. The DB publishes to all references after the store commits.
 * 字段层在事务中读取最新 Working，并只提交本次选择的字段。
 */
export async function setProjectField(database, field, value, {expectedVersion, selection, storyPage} = {}) {
  return database.writeField(field, value, {expectedVersion, selection, storyPage});
}

export async function resetProjectField(database, field, {expectedVersion, selection, storyPage} = {}) {
  return database.writeField(field, undefined, {expectedVersion, reset: true, selection, storyPage});
}

export async function setProjectFields(database, changes, {expectedVersion} = {}) {
  return database.writeFields(changes, {expectedVersion});
}

export async function resetProjectFields(database, fields, {expectedVersion} = {}) {
  return database.writeFields(fields.map(field => ({field, reset: true})), {expectedVersion});
}

/** 页面给的是仓库记录路径（`document` 打头），字段发布的是正文内路径：入口去掉那一层。 */
function documentRelativePath(path) {
  return path[0] === "document" ? path.slice(1) : path;
}

function pathIsUnder(prefix, path) {
  return prefix.length <= path.length && prefix.every((step, index) => path[index] === step);
}

/**
 * 重置按字段对象声明的全部正文路径匹配，并按字段身份去重。
 * 父路径选择子树；无匹配路径报错。
 * 字段写入负责投影失效。
 */
export async function resetProjectFieldsAtPaths(resourceId, paths, {expectedVersion} = {}) {
  if (!Array.isArray(paths) || !paths.length) throw new TypeError("paths must be a non-empty array");
  const wanted = paths.map(path => {
    if (!Array.isArray(path) || !path.length || path.some(step => step === undefined || step === null))
      throw new TypeError("path must be a non-empty array of steps");
    return documentRelativePath(path);
  });
  const fields = await db.getFields(resourceId);
  const matched = new Set();
  wanted.forEach((prefix, position) => {
    const hits = fields.filter(field => (field.documentPaths || [field.documentPath])
      .some(path => Array.isArray(path) && pathIsUnder(prefix, path)));
    if (!hits.length) throw new TypeError(`${resourceId}: 第 ${position + 1} 个正文位置没有对应字段：${JSON.stringify(prefix)}`);
    for (const field of hits) matched.add(field);
  });
  const selected = [...matched];
  await resetProjectFields(db, selected, {expectedVersion});
  return Object.freeze(selected);
}
