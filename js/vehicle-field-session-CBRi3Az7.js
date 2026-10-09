import { siteUrl, applyJsonChanges } from './visual-metasprites-DJP54-bV.js';
import { draftEquipmentMask } from './overview-CxFLx7O1.js';
import { requireBrowserProjectRepository } from './element-tree-DsgOBeTK.js';
import { db } from './battle-result-script-runtime-B_EClFew.js';
import { state } from './emulator-DynsZsth.js';

// @editor-module 实体声明：句柄 + 切面指向字段对象，引用方不再各自解析实体数据。
//
// 权威声明是 `project/config/metalmaxcn.entities.json`（与引用图并列，人工维护）。
// 发布包包含声明引用的关系正文，证据路径只作出处与包内查找键。
// 本模块不导入 DOM、页面状态与界面模块：切面解析是纯函数，取数经注入的数据库。
//
// 切面自带范围：`records` 声明具体记录（可再限定字段名），`fragments` 声明具体片段。
// 取数只回声明范围内的字段，缺记录、缺片段或缺字段名即报错，不退回整资源。

const ENTITY_DECLARATION_SCHEMA = "metalmaxcn.entities";

const ENTITY_SOURCES = Object.freeze([
  siteUrl("package/metadata/entities.json"),
]);

const RUNTIME_KINDS = Object.freeze(["records", "fragments"]);
const FIELD_PROVIDER_IDS = Object.freeze(["save-context"]);
const INDEX_SLOT = "{index}";
const INDEX10_SLOT = "{index10}";
const TAG_SLOT = "{tag}";
const SLOTS = Object.freeze([INDEX_SLOT, INDEX10_SLOT, TAG_SLOT]);
const PREVIEW_SOURCES = Object.freeze({
  "monster.figure": Object.freeze(["monster-visual-layout", "monster-graphic"]),
  "vehicle.visual": Object.freeze(["vehicle-visual-selector", "actor-visual",
    "project.visuals", "weapon-attack-parameter", "ui-vehicle-status"]),
  "vehicle.battle": Object.freeze(["character-initial-record", "monster", "battle-test-point",
    "battle-item-service", "enemy-action", "weapon-attack-parameter"]),
});

function previewSources(target, previewId, catalog = null) {
  const entityClass = catalog ? catalog.instance(target).entityClass : String(target).split(":")[0];
  if (!previewId.startsWith(`${entityClass}.`) || !PREVIEW_SOURCES[previewId])
    throw new TypeError(`未声明的实体预览输入：${target}/${previewId}`);
  return PREVIEW_SOURCES[previewId];
}

/** 同步渲染从已装载的当前正文取预览输入。 */
function entityPeekPreviewInput(database, target, previewId, resourceId) {
  if (!previewSources(target, previewId).includes(resourceId))
    throw new TypeError(`实体预览没有输入：${previewId}/${resourceId}`);
  const value = database.peekDocument(resourceId, null);
  if (!value) throw new TypeError(`实体预览缺少当前正文：${resourceId}`);
  return value;
}

async function previewDocument(database, resourceId) {
  const documentValue = resourceId === "vehicle-visual-selector"
    ? (await database.readResource(resourceId))?.value?.document
    : resourceId === "monster-graphic"
      || resourceId === "ui-vehicle-status" || resourceId === "battle-item-service"
      ? await database.getResourceDocument(resourceId, null)
      : await database.getDocument(resourceId, null);
  if (!documentValue && resourceId !== "ui-vehicle-status")
    throw new TypeError(`实体预览缺少当前正文：${resourceId}`);
  return documentValue;
}

async function entityPreviewInput(database, target, previewId, resourceId,
  {catalog = null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  if (!previewSources(target, previewId, directory).includes(resourceId))
    throw new TypeError(`实体预览没有输入：${previewId}/${resourceId}`);
  return previewDocument(database, resourceId);
}

/** 按当前正文生成列表与记录页的只读记录，不保存展示副本。 */
async function entityDisplayRecords(database, entityClass,
  {catalog = null, project = null, labelFor = () => null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const handles = new Set(directory.instances(entityClass));
  if (entityClass === "monster") {
    const records = await database.getAll("monster", []);
    return Object.freeze(records.map(record => {
      const entityHandle = directory.handleFor("monster", Number(record.id));
      if (!handles.has(entityHandle)) throw new TypeError(`未声明的怪物展示记录：${entityHandle}`);
      return Object.freeze({...record, entityHandle,
        displayName: labelFor(entityHandle, record.name || null)});
    }));
  }
  if (entityClass === "vehicle") {
    const source = project?.game_data?.vehicles;
    if (!source) throw new TypeError("战车展示记录缺少当前项目正文");
    const views = new Map();
    for (const [viewId, view] of Object.entries(source.views || {}))
      for (const id of view.preset_ids || []) {
        const key = Number(id);
        if (!views.has(key)) views.set(key, new Set());
        views.get(key).add(viewId);
      }
    return Object.freeze((source.presets || []).map(record => {
      const entityHandle = directory.handleFor("vehicle", Number(record.preset_id));
      if (!handles.has(entityHandle)) throw new TypeError(`未声明的战车展示记录：${entityHandle}`);
      const chassisName = labelFor(`item:${Number(record.chassis_id).toString(16)
        .toUpperCase().padStart(2, "0")}`, record.chassis_name_hint || "未命名底盘");
      const rentalName = record.rental_name?.list_label
        || record.rental_name?.value || null;
      return Object.freeze({...record, entityHandle, chassisName,
        rentalName, displayName: rentalName || chassisName,
        displayViews: Object.freeze([...(views.get(Number(record.preset_id)) || [])])});
    }));
  }
  throw new TypeError(`实体类没有展示记录：${entityClass}`);
}

/** 跨实体预览只取当前输入；组合与绘制仍由各资源的 owner 负责。 */
async function entityPreviewInputs(database, target, previewId,
  {catalog = null} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const entries = await Promise.all(previewSources(target, previewId, directory)
    .map(async resourceId => [resourceId, await previewDocument(database, resourceId)]));
  return Object.freeze(Object.fromEntries(entries));
}

function text(value, what) {
  if (typeof value !== "string" || !value) throw new TypeError(`${what} 缺少文本`);
  return value;
}

function integer(value, what, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new TypeError(`${what} 无效：${value}`);
  return value;
}

function textList(value, what) {
  if (!Array.isArray(value) || !value.length) throw new TypeError(`${what} 声明为空`);
  const seen = new Set();
  return Object.freeze(value.map(item => {
    const name = text(item, what);
    if (seen.has(name)) throw new TypeError(`${what} 重复：${name}`);
    seen.add(name);
    return name;
  }));
}

/** 索引集合：count（自 0 起）、index_ranges（多段）与 index_values（显式）三选一。 */
function readIndexValues(entityClass, value) {
  const forms = ["count", "index_ranges", "index_values"].filter(name => value[name] !== undefined);
  if (forms.length !== 1)
    throw new TypeError(`实体 ${entityClass} 的索引集合只给 count／index_ranges／index_values 之一`);
  const index = raw => integer(raw, `实体 ${entityClass} 索引`, 0, 0xffffff);
  if (forms[0] === "count")
    return Array.from(
      {length: integer(value.count, `实体 ${entityClass} 实例数`, 1, 0x10000)},
      (_, offset) => offset);
  if (forms[0] === "index_values") {
    if (!Array.isArray(value.index_values) || !value.index_values.length)
      throw new TypeError(`实体 ${entityClass} 的 index_values 声明为空`);
    return value.index_values.map(index);
  }
  if (!Array.isArray(value.index_ranges) || !value.index_ranges.length)
    throw new TypeError(`实体 ${entityClass} 的 index_ranges 声明为空`);
  return value.index_ranges.flatMap(range => {
    if (!range || Object.keys(range).sort().join() !== "count,start")
      throw new TypeError(`实体 ${entityClass} 的 index_ranges 条目必须是 {start, count}`);
    const start = index(range.start);
    const count = integer(range.count, `实体 ${entityClass} 索引段长度`, 1, 0x10000);
    return Array.from({length: count}, (_, offset) => start + offset);
  });
}

function formatIndex(identity, index, what) {
  if (!Number.isInteger(index) || !identity.indexSet.has(index))
    throw new RangeError(`${what} 序号越界：${index}`);
  return index.toString(identity.indexRadix).toUpperCase()
    .padStart(identity.indexWidth, "0");
}

function readIndexedIdentity(entityClass, value, what) {
  const indexRadix = integer(value.index_radix, `${what}序号进制`, 2, 36);
  const indexWidth = integer(value.index_width, `${what}序号宽度`, 1, 8);
  const declared = readIndexValues(entityClass, value);
  const indexes = Object.freeze([...new Set(declared)].sort((left, right) => left - right));
  if (indexes.length !== declared.length)
    throw new TypeError(`${what}索引集合有重复`);
  if (indexes.length > 0x10000)
    throw new TypeError(`${what}索引集合过大：${indexes.length}`);
  const limit = indexRadix ** indexWidth;
  if (indexes.some(index => index >= limit))
    throw new TypeError(`${what}索引超出 ${indexRadix}^${indexWidth} 位宽`);
  return Object.freeze({indexRadix, indexWidth, count: indexes.length,
    indexes, indexSet: new Set(indexes)});
}

function readIdentity(entityClass, value) {
  if (value === undefined) return null;
  const prefix = text(value.resource_prefix, `实体 ${entityClass} 序号前缀`);
  if (prefix !== `${entityClass}:`)
    throw new TypeError(`实体 ${entityClass} 序号前缀必须是实体类自己的句柄空间：${prefix}`);
  const source = text(value.source, `实体 ${entityClass} 身份来源`);
  if (value.variants !== undefined) {
    if (value.published_prefix !== undefined || value.index_radix !== undefined
        || value.index_width !== undefined || ["count", "index_ranges", "index_values"]
          .some(name => value[name] !== undefined))
      throw new TypeError(`实体 ${entityClass} 的 variants 与单序号身份字段互斥`);
    if (!Array.isArray(value.variants) || !value.variants.length)
      throw new TypeError(`实体 ${entityClass} 的 variants 声明为空`);
    const tags = new Set();
    const publishedPrefixes = new Set();
    const variants = value.variants.map(raw => {
      if (!raw || typeof raw !== "object")
        throw new TypeError(`实体 ${entityClass} 的 tagged identity 条目无效`);
      const tag = text(raw.tag, `实体 ${entityClass} 身份标签`);
      if (!/^[A-Za-z0-9._-]+$/u.test(tag) || tags.has(tag))
        throw new TypeError(`实体 ${entityClass} 身份标签无效或重复：${tag}`);
      tags.add(tag);
      const indexed = readIndexedIdentity(entityClass, raw, `实体 ${entityClass} 标签 ${tag} 的`);
      const publishedPrefix = text(
        raw.published_prefix, `实体 ${entityClass} 标签 ${tag} 发布前缀`);
      if (!publishedPrefix.endsWith(":") || publishedPrefixes.has(publishedPrefix))
        throw new TypeError(`实体 ${entityClass} 标签 ${tag} 发布前缀无效或重复：${publishedPrefix}`);
      publishedPrefixes.add(publishedPrefix);
      return Object.freeze({tag, publishedPrefix, ...indexed});
    });
    const count = variants.reduce((total, variant) => total + variant.count, 0);
    if (count > 0x10000) throw new TypeError(`实体 ${entityClass} 复合身份集合过大：${count}`);
    const identity = Object.freeze({kind: "tagged", source, resourcePrefix: prefix,
      count, variants: Object.freeze(variants), variantByTag: new Map(variants.map(item => [item.tag, item]))});
    const instances = value.instances;
    if (instances !== undefined) {
      if (!Array.isArray(instances) || !instances.length)
        throw new TypeError(`实体 ${entityClass} 实例清单无效`);
      const expected = variants.flatMap(variant => variant.indexes.map(index =>
        `${entityClass}:${variant.tag}:${formatIndex(
          variant, index, `实体 ${entityClass} 标签 ${variant.tag}`)}`));
      if (JSON.stringify(instances) !== JSON.stringify(expected))
        throw new TypeError(`实体 ${entityClass} 实例清单与发布复合身份不符：${instances.join("、")}`);
    }
    return identity;
  }
  // 发布记录的身份前缀可以不同（如实体类 actor_appearance 的发布记录是 actor-type:XX）：
  // 实体句柄只属于实体，字段对象名不拿来当实体类名。
  const publishedPrefix = value.published_prefix === undefined
    ? prefix : text(value.published_prefix, `实体 ${entityClass} 发布前缀`);
  const indexed = readIndexedIdentity(entityClass, value, `实体 ${entityClass} 的`);
  const identity = Object.freeze({
    kind: "indexed",
    source,
    resourcePrefix: prefix,
    publishedPrefix,
    ...indexed,
  });
  const instances = value.instances;
  if (instances !== undefined) {
    if (!Array.isArray(instances) || !instances.length)
      throw new TypeError(`实体 ${entityClass} 实例清单无效`);
    const expected = identity.indexes.map(index =>
      `${entityClass}:${formatIndex(identity, index, `实体 ${entityClass}`)}`);
    if (JSON.stringify(instances) !== JSON.stringify(expected))
      throw new TypeError(`实体 ${entityClass} 实例清单与发布身份不符：${instances.join("、")}`);
  }
  return identity;
}

function readRuntime(entityClass, facetId, value) {
  if (value === undefined) return null;
  const what = `切面 ${entityClass}.${facetId}`;
  const kind = value.kind;
  if (!RUNTIME_KINDS.includes(kind))
    throw new TypeError(`${what} 运行期解析种类无效：${kind}`);
  const resourceId = text(value.resource_id, `${what} 运行期字段对象`);
  const providerId = value.provider === undefined ? null
    : text(value.provider, `${what} 字段提供器`);
  if (providerId !== null && !FIELD_PROVIDER_IDS.includes(providerId))
    throw new TypeError(`${what} 字段提供器无效：${providerId}`);
  const identityTags = value.identity_tags === undefined ? null
    : textList(value.identity_tags, `${what} identity_tags`);
  const also = value.also === undefined ? [] : value.also;
  if (!Array.isArray(also) || also.some(item => !item || typeof item !== "object"
      || typeof item.resource_id !== "string" || !item.resource_id
      || typeof item.entity_handle !== "string" || !item.entity_handle
      || !Array.isArray(item.fields) || !item.fields.length
      || item.fields.some(name => typeof name !== "string" || !name)))
    throw new TypeError(`${what} 的附加字段声明无效`);
  // 资源名与引用图节点名不一致时写明对应节点（校验两端都要存在，写错要拒）。
  const resourceNode = value.resource_node === undefined ? null
    : text(value.resource_node, `${what} 运行期资源节点`);
  if (kind === "fragments") {
    if (value.records !== undefined || value.from !== undefined)
      throw new TypeError(`${what} 片段切面不得带 records／from`);
    if (also.length) throw new TypeError(`${what} 片段切面不得带附加字段`);
    return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags,
      fragments: textList(value.fragments, `${what} fragments`)});
  }
  if (value.fragments !== undefined) throw new TypeError(`${what} 记录切面不得带 fragments`);
  const fields = value.fields === undefined ? null : textList(value.fields, `${what} fields`);
  if (value.from !== undefined) {
    if (value.records !== undefined) throw new TypeError(`${what} records 与 from 只能给一个`);
    return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags, fields,
      also: Object.freeze(also.map(item => Object.freeze({resourceId: item.resource_id,
        entityHandle: item.entity_handle, fields: Object.freeze([...item.fields])}))),
      from: readRuntimeSource(entityClass, facetId, value.from)});
  }
  const declared = value.records;
  if (!Array.isArray(declared) || !declared.length) throw new TypeError(`${what} records 声明为空`);
  const seen = new Set();
  const records = declared.map(record => {
    if (!record || typeof record !== "object") throw new TypeError(`${what} 记录声明无效`);
    const handle = text(record.entity_handle, `${what} 记录句柄`);
    if (!handle.startsWith(`${resourceId}:`))
      throw new TypeError(`${what} 记录句柄不属于 ${resourceId}：${handle}`);
    if ([...handle.matchAll(/\{([^}]*)\}/gu)].some(match => !SLOTS.includes(`{${match[1]}}`)))
      throw new TypeError(`${what} 记录句柄占位符无效：${handle}`);
    if (seen.has(handle)) throw new TypeError(`${what} 记录句柄重复：${handle}`);
    seen.add(handle);
    return Object.freeze({entityHandle: handle,
      fields: record.fields === undefined ? null : textList(record.fields, `${what} 记录字段`)});
  });
  return Object.freeze({kind, resourceId, resourceNode, providerId, identityTags, fields,
    also: Object.freeze(also.map(item => Object.freeze({resourceId: item.resource_id,
      entityHandle: item.entity_handle, fields: Object.freeze([...item.fields])}))),
    records: Object.freeze(records)});
}

/** 记录由实例正文现查时的来源声明：正文资源 + 路径 + 句柄模板，或按字段值挑这个资源自己的记录。 */
function readRuntimeSource(entityClass, facetId, value) {
  const what = `切面 ${entityClass}.${facetId} 的 from`;
  if (!value || typeof value !== "object") throw new TypeError(`${what} 声明无效`);
  if (value.relation !== undefined) {
    // 已发布引用解析：声明只指向证据里的那条解析，对应关系本身不许在声明里重写。
    for (const key of ["path", "select", "pick", "handle", "handles", "document_path", "resource_id"])
      if (value[key] !== undefined)
        throw new TypeError(`${what} 的 relation 与其他形态互斥`);
    const relation = value.relation;
    if (!relation || typeof relation !== "object") throw new TypeError(`${what} 的 relation 声明无效`);
    const location = text(relation.location, `${what} 的 relation.location`);
    if (!location.startsWith("project/"))
      throw new TypeError(`${what} 的 relation.location 必须是仓库相对路径：${location}`);
    if (!Array.isArray(relation.path) || !relation.path.length
        || relation.path.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 的 relation.path 声明无效`);
    const sourceRoot = relation.source_root;
    if (sourceRoot !== undefined && (!Array.isArray(sourceRoot)
        || sourceRoot.some(step => typeof step !== "string" || !step)))
      throw new TypeError(`${what} 的 relation.source_root 声明无效`);
    const fieldHandleTemplate = relation.field_handle_template === undefined ? null
      : text(relation.field_handle_template, `${what} 的 relation.field_handle_template`);
    if (fieldHandleTemplate !== null && !fieldHandleTemplate.includes("{"))
      throw new TypeError(`${what} 的 relation.field_handle_template 缺少占位符`);
    const fieldHandleList = relation.field_handle_list === undefined ? null
      : text(relation.field_handle_list, `${what} 的 relation.field_handle_list`);
    if (fieldHandleList !== null && fieldHandleTemplate !== null)
      throw new TypeError(`${what} 的 relation 字段句柄列表与模板互斥`);
    let sourceField = null;
    if (relation.source_field !== undefined) {
      const raw = relation.source_field;
      if (!raw || typeof raw !== "object")
        throw new TypeError(`${what} 的 relation.source_field 声明无效`);
      const handleTemplate = text(raw.handle_template,
        `${what} 的 relation.source_field.handle_template`);
      if (!handleTemplate.includes("{"))
        throw new TypeError(`${what} 的 relation.source_field.handle_template 缺少占位符`);
      sourceField = Object.freeze({
        resourceId: text(raw.resource_id, `${what} 的 relation.source_field.resource_id`),
        handleTemplate,
        field: text(raw.field, `${what} 的 relation.source_field.field`),
      });
    }
    return Object.freeze({relation: Object.freeze({location, path: Object.freeze([...relation.path]),
      sourceRoot: Object.freeze(sourceRoot === undefined ? [] : [...sourceRoot]),
      fieldHandleTemplate, fieldHandleList, sourceField}),
      resourceId: null, path: null, pick: null, handles: null, documentPath: null,
      handle: null, select: null, field: null, where: null, condition: null});
  }
  const hasPath = value.path !== undefined || value.resource_id !== undefined;
  const hasSelect = value.select !== undefined;
  if (hasPath === hasSelect)
    throw new TypeError(`${what} 只能给「正文资源 + path + handle」「select」或「正文取值 + handles」之一`);
  if (value.pick !== undefined) {
    if (!hasPath) throw new TypeError(`${what} 的正文取值形态不得同时给 select`);
    if (!Array.isArray(value.path) || !value.path.length
        || value.path.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 缺少 path`);
    if (!Array.isArray(value.pick) || !value.pick.length
        || value.pick.some(index => !Number.isInteger(index) || index < 0))
      throw new TypeError(`${what} 的 pick 声明无效`);
    if (!Array.isArray(value.handles) || !value.handles.length)
      throw new TypeError(`${what} 的 handles 声明为空`);
    const handles = value.handles.map(item => text(item, `${what} 的 handles`));
    if (handles.some(handle => !handle.includes("{value")))
      throw new TypeError(`${what} 的 handles 模板缺少 {value}：${handles.join("、")}`);
    return Object.freeze({
      resourceId: text(value.resource_id, `${what} 的正文资源`),
      path: Object.freeze([...value.path]),
      pick: Object.freeze([...value.pick]),
      handles: Object.freeze(handles),
      relation: null, handle: null, select: null, field: null, where: null, condition: null,
    });
  }
  if (hasSelect) {
    const mapped = value.field !== undefined || value.handle !== undefined;
    if (mapped && (value.field === undefined || value.handle === undefined))
      throw new TypeError(`${what} 按字段值取记录时要同时给 field 与 handle`);
    const handle = mapped ? text(value.handle, `${what} 的 handle`) : null;
    if (mapped && !handle.includes("{value"))
      throw new TypeError(`${what} 的 handle 模板缺少 {value} 占位符：${handle}`);
    return Object.freeze({select: readRuntimeSelect(what, value.select),
      field: mapped ? text(value.field, `${what} 的 field`) : null, handle,
      relation: null, pick: null, handles: null, where: null, condition: null});
  }
  if (!Array.isArray(value.path) || !value.path.length
      || value.path.some(step => typeof step !== "string" || !step))
    throw new TypeError(`${what} 缺少 path`);
  // 目标记录也可以按字段对象自己发布的正文位置（documentPath）找：句柄推不出来时用这一式。
  const documentPath = value.document_path;
  if (documentPath !== undefined) {
    if (value.handle !== undefined || value.handles !== undefined)
      throw new TypeError(`${what} 的 document_path 与 handle 只能给一个`);
    if (!Array.isArray(documentPath) || !documentPath.length
        || documentPath.some(step => typeof step !== "string" || !step))
      throw new TypeError(`${what} 的 document_path 声明无效`);
  }
  let within = null;
  if (value.within !== undefined) {
    if (documentPath !== undefined || value.pick !== undefined)
      throw new TypeError(`${what} 的 within 只能与正文记录形态一起给`);
    within = readRuntimeWithin(what, value.within);
  }
  const templates = (documentPath !== undefined || within !== null) ? null
    : (value.handles === undefined ? [text(value.handle, `${what} 句柄模板`)] : value.handles);
  if (templates !== null && (!Array.isArray(templates) || !templates.length
      || templates.some(item => typeof item !== "string" || !item || !item.includes("{"))))
    throw new TypeError(`${what} 句柄模板至少要有一个含占位符的模板`);
  const handle = templates === null ? null : templates[0];
  let where = null;
  if (value.where !== undefined) {
    if (!value.where || typeof value.where !== "object")
      throw new TypeError(`${what} 的 where 声明无效`);
    const kinds = ["equals", "contains"].filter(name => value.where[name] !== undefined);
    if (kinds.length !== 1)
      throw new TypeError(`${what} 的 where 只能给 equals 或 contains 之一`);
    where = Object.freeze({
      field: text(value.where.field, `${what} 的 where.field`),
      kind: kinds[0],
      value: text(value.where[kinds[0]], `${what} 的 where.${kinds[0]}`),
    });
  }
  let condition = null;
  if (value.condition !== undefined) {
    if (!value.condition || typeof value.condition !== "object")
      throw new TypeError(`${what} 的 condition 声明无效`);
    const kinds = ["equals", "starts_with"].filter(name => value.condition[name] !== undefined);
    if (kinds.length !== 1)
      throw new TypeError(`${what} 的 condition 只能给 equals 或 starts_with 之一`);
    condition = Object.freeze({field: text(value.condition.field, `${what} 的 condition.field`),
      kind: kinds[0], value: text(value.condition[kinds[0]], `${what} 的 condition.${kinds[0]}`)});
  }
  return Object.freeze({
    resourceId: text(value.resource_id, `${what} 的正文资源`),
    path: Object.freeze([...value.path]),
    handle,
    handles: templates === null ? null : Object.freeze([...templates]),
    documentPath: documentPath === undefined ? null : Object.freeze([...documentPath]),
    within,
    relation: null,
    select: null,
    field: null,
    pick: null,
    where, condition,
  });
}

/** 在字段对象自己的记录里按某个字段的值挑：`select.field` 等于 `select.equals` 的那几条。 */
function readRuntimeSelect(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 select 声明无效`);
  return Object.freeze({
    field: text(value.field, `${what} 的 select.field`),
    equals: text(value.equals, `${what} 的 select.equals`),
  });
}

function readFacet(entityClass, facetId, value) {
  const what = `切面 ${entityClass}.${facetId}`;
  if (!value || typeof value !== "object") throw new TypeError(`${what} 声明无效`);
  return Object.freeze({
    id: facetId,
    label: text(value.label, `${what} 标签`),
    fieldObject: text(value.field_object, `${what} 字段对象`),
    page: text(value.page, `${what} 承载页面`),
    recordScope: text(value.record_scope, `${what} 记录范围`),
    runtime: readRuntime(entityClass, facetId, value.runtime),
  });
}

function readEntityClass(entityClass, value) {
  if (!value || typeof value !== "object") throw new TypeError(`实体类 ${entityClass} 声明无效`);
  const declared = value.facets;
  if (!declared || typeof declared !== "object" || !Object.keys(declared).length)
    throw new TypeError(`实体类 ${entityClass} 没有切面`);
  const identity = readIdentity(entityClass, value.identity);
  const facets = {};
  for (const [facetId, facet] of Object.entries(declared))
    facets[facetId] = readFacet(entityClass, facetId, facet);
  return Object.freeze({
    id: entityClass,
    label: text(value.label, `实体类 ${entityClass} 标签`),
    primaryPage: text(value.primary_page, `实体类 ${entityClass} 承载页面`),
    identityScope: text(value.identity_scope, `实体类 ${entityClass} 身份范围`),
    identity,
    facets: Object.freeze(facets),
  });
}

/** 记录句柄占位符：`{index}` 用发布序号文本，`{index10}` 用十进制序号，`{tag}` 用复合身份标签。 */
function substituteSlots(handle, index, indexText, tag = null) {
  if (handle.includes(TAG_SLOT) && tag === null)
    throw new TypeError(`非复合实体身份不能使用 ${TAG_SLOT}：${handle}`);
  return handle.split(INDEX_SLOT).join(indexText).split(INDEX10_SLOT).join(String(index))
    .split(TAG_SLOT).join(tag ?? "");
}

/** 记录字段占位符：`{field}` 取原文，`{field:hexN}` 取 N 位大写十六进制。 */
function substituteRecordSlots(template, record, index, indexText, tag = null) {
  return substituteSlots(template, index, indexText, tag).replace(
    /\{([A-Za-z0-9_.]+)(?::(hex|dec)(\d+)|:(tail))?\}/gu, (match, field, radix, width, tail) => {
      // 字段名可以走点号取嵌套值（`{name_reference.node_id}`）。
      const value = field.split(".").reduce((node, step) => node?.[step], record);
      if (value === undefined || value === null)
        throw new TypeError(`实体切面来源记录缺少 ${field}：${JSON.stringify(record)}`);
      // `:tail` 取已发布句柄的最后一段（如 `metatile-page:03` → `03`），供目标资源自己的命名用。
      if (tail) return String(value).split(":").at(-1);
      if (width === undefined) return String(value);
      if (!Number.isInteger(value) || value < 0)
        throw new TypeError(`实体切面来源记录的 ${field} 不是非负整数：${value}`);
      const digits = value.toString(radix === "dec" ? 10 : 16);
      return (radix === "dec" ? digits : digits.toUpperCase()).padStart(Number(width), "0");
    });
}

/** 嵌套引用清单形态：`path` 指向记录里的数组，`where` 按关系筛，`handles` 映射目标句柄。 */
function readRuntimeWithin(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 within 声明无效`);
  if (!Array.isArray(value.path) || !value.path.length
      || value.path.some(step => typeof step !== "string" || !step))
    throw new TypeError(`${what} 的 within.path 声明无效`);
  if (!value.where || typeof value.where !== "object")
    throw new TypeError(`${what} 的 within.where 声明无效`);
  const kinds = ["equals", "contains"].filter(name => value.where[name] !== undefined);
  if (kinds.length !== 1)
    throw new TypeError(`${what} 的 within.where 只能给 equals 或 contains 之一`);
  const handles = value.handles;
  if (!Array.isArray(handles) || !handles.length
      || handles.some(item => typeof item !== "string" || !item || !item.includes("{")))
    throw new TypeError(`${what} 的 within.handles 至少要有一个含占位符的模板`);
  return Object.freeze({path: Object.freeze([...value.path]),
    where: Object.freeze({field: text(value.where.field, `${what} 的 within.where.field`),
      kind: kinds[0], value: text(value.where[kinds[0]], `${what} 的 within.where.${kinds[0]}`)}),
    handles: Object.freeze([...handles]),
    then: value.then === undefined ? null : readRuntimeWithinThen(what, value.then)});
}

/** 第二跳：拿第一跳映射出来的句柄，去读它字段对象上的某个字段，字段值就是下一层的句柄。 */
function readRuntimeWithinThen(what, value) {
  if (!value || typeof value !== "object") throw new TypeError(`${what} 的 within.then 声明无效`);
  const then = Object.freeze({
    resourceId: text(value.resource_id, `${what} 的 within.then.resource_id`),
    field: text(value.field, `${what} 的 within.then.field`),
    handles: value.handles === undefined ? null : value.handles,
  });
  if (then.handles !== null && (!Array.isArray(then.handles) || !then.handles.length
      || then.handles.some(item => typeof item !== "string" || !item.includes("{value"))))
    throw new TypeError(`${what} 的 within.then.handles 模板缺少 {value}：${then.handles}`);
  return then;
}

/** 已发布证据里的占用符：`{id_hex2}`／`{id10}`／`{id}` 都是实例身份，别的一律拒绝。 */
function substitutePublishedSlots(template, index, indexText, tag = null) {
  const text_ = String(template)
    .split("{id_hex2}").join(indexText)
    .split("{id10}").join(String(index))
    .split("{id}").join(String(index))
    .split("{index}").join(indexText)
    .split("{index10}").join(String(index))
    .split("{tag}").join(tag ?? "");
  const leftover = /\{[^}]*\}/u.exec(text_);
  if (leftover) throw new TypeError(`已发布证据的占位符不认识：${leftover[0]}`);
  return text_;
}

const PUBLISHED_RELATION_SCHEMA = "metalmaxcn.published-reference-resolution/v1";
const CROSS_RESOURCE_RELATION_SCHEMA = "metalmaxcn.cross-resource-handle-relations/v1";
const FIELD_OWNER_RESOLUTION_SCHEMA = "metalmaxcn.field-owner-resolutions/v1";
const PUBLISHED_RESOLUTION_KINDS = Object.freeze(["consecutive-u8-values"]);

/** 已发布引用解析里的取值：`resolution` 决定由正文里的哪个数解出几个目标编号。 */
function publishedRelationValues(what, resolution, source) {
  if (!resolution || typeof resolution !== "object")
    throw new TypeError(`${what} 缺少 resolution`);
  if (!PUBLISHED_RESOLUTION_KINDS.includes(resolution.kind))
    throw new TypeError(`${what} 的 resolution.kind 不认识：${resolution.kind}`);
  if (resolution.first !== "source")
    throw new TypeError(`${what} 的 resolution.first 不认识：${resolution.first}`);
  if (resolution.ordered !== true)
    throw new TypeError(`${what} 的 resolution.ordered 不是 true`);
  const count = resolution.count, step = resolution.step;
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(step) || step < 1)
    throw new TypeError(`${what} 的 count／step 无效`);
  const values = [];
  for (let position = 0; position < count; position += 1) {
    const value = source + position * step;
    if (!Number.isInteger(value) || value < 0 || value > 0xff)
      throw new TypeError(`${what} 解出的编号不是 0–255：${value}`);
    values.push(value);
  }
  return values;
}

/** 已发布句柄模板：`{bank}`／`{bank:hex2}`／`{tile}`／`{tile:hex2}`，其余占位符拒绝。 */
function publishedTargetHandle(what, template, bank, tile) {
  const render = (value, width) => (width === undefined ? String(value)
    : value.toString(16).toUpperCase().padStart(Number(width), "0"));
  const handle = String(template).replace(
    /\{(bank|tile)(?::hex(\d+))?\}/gu,
    (match, name, width) => render(name === "bank" ? bank : tile, width));
  const leftover = /\{[^}]*\}/u.exec(handle);
  if (leftover) throw new TypeError(`${what} 的句柄模板占位符不认识：${leftover[0]}`);
  return handle;
}

/** 正文位置模板：整段只有一个占位符时按记录原值取（如 `{id}` 仍是数字），否则当字符串拼。 */
function substituteDocumentPathStep(step, record, index, indexText, tag = null) {
  const whole = /^\{([A-Za-z0-9_.]+)\}$/u.exec(step);
  if (!whole) return substituteRecordSlots(step, record, index, indexText, tag);
  const value = record?.[whole[1]];
  if (value === undefined || value === null)
    throw new TypeError(`实体切面来源记录缺少 ${whole[1]}：${JSON.stringify(record)}`);
  return value;
}

function nonNegativeHex(value, label, width) {
  if (!Number.isInteger(value) || value < 0)
    throw new TypeError(`实体切面来源记录的 ${label} 不是非负整数：${value}`);
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function readPath(source, path) {
  return path.reduce((node, key) =>
    (node === null || node === undefined ? undefined : node[key]), source);
}

/** 校验静态声明并给出实体目录；不合规的切面在这里就拒绝，不带进页面。 */
function createEntityCatalog(declaration, {source = ""} = {}) {
  if (!declaration || typeof declaration !== "object"
      || declaration.schema !== ENTITY_DECLARATION_SCHEMA)
    throw new TypeError(`实体声明 schema 不是 ${ENTITY_DECLARATION_SCHEMA}`);
  const declared = declaration.entity_classes;
  if (!declared || typeof declared !== "object" || !Object.keys(declared).length)
    throw new TypeError("实体声明没有实体类");
  const classes = new Map();
  for (const [entityClass, value] of Object.entries(declared))
    classes.set(entityClass, readEntityClass(entityClass, value));

  function entityClassOf(target) {
    const name = String(target);
    if (!name.includes(":")) {
      const owner = classes.get(name);
      if (!owner) throw new TypeError(`未声明的实体类：${name}`);
      return {owner, index: null, indexText: null, tag: null};
    }
    const [className, ...parts] = name.split(":");
    const owner = classes.get(className);
    if (!owner) throw new TypeError(`未声明的实体类：${className}`);
    const identity = owner.identity;
    if (!identity) throw new TypeError(`实体类 ${owner.id} 没有发布序号身份，不接受实体句柄`);
    let indexed = identity, tag = null, rawIndex = null;
    if (identity.kind === "tagged") {
      if (parts.length !== 2) throw new TypeError(`复合实体句柄形状无效：${name}`);
      [tag, rawIndex] = parts;
      indexed = identity.variantByTag.get(tag);
      if (!indexed) throw new TypeError(`实体 ${owner.id} 没有发布身份标签：${tag}`);
    } else {
      if (parts.length !== 1) throw new TypeError(`实体句柄形状无效：${name}`);
      [rawIndex] = parts;
    }
    const index = Number.parseInt(rawIndex, indexed.indexRadix);
    const indexText = formatIndex(indexed, index, `实体 ${owner.id}${tag ? ` 标签 ${tag}` : ""}`);
    if (indexText !== rawIndex)
      throw new TypeError(`实体句柄序号与发布身份不符：${name}`);
    return {owner, index, indexText, tag};
  }

  const instanceHandles = owner => {
    if (!owner?.identity) throw new TypeError(`实体类 ${owner?.id ?? "（未知）"} 没有发布序号身份`);
    if (owner.identity.kind === "tagged") return owner.identity.variants.flatMap(variant =>
      variant.indexes.map(index => `${owner.id}:${variant.tag}:${
        formatIndex(variant, index, `实体 ${owner.id} 标签 ${variant.tag}`)}`));
    return owner.identity.indexes.map(index =>
      `${owner.id}:${formatIndex(owner.identity, index, `实体 ${owner.id}`)}`);
  };

  const catalog = {
    relationDocument(location) {
      const documents = declaration.runtime_relation_documents;
      if (!documents || !Object.hasOwn(documents, location))
        throw new TypeError(`实体切面关系未发布：${location}`);
      return documents[location];
    },
    source,
    classIds: Object.freeze([...classes.keys()]),
    entityClass: id => classes.get(id) ?? null,
    instances(entityClass) {
      const owner = classes.get(entityClass);
      return Object.freeze(instanceHandles(owner));
    },
    handleFor(entityClass, tagOrIndex, maybeIndex) {
      const owner = classes.get(entityClass);
      if (!owner?.identity) throw new TypeError(`实体类 ${entityClass} 没有发布序号身份`);
      if (owner.identity.kind === "tagged") {
        const tag = String(tagOrIndex), variant = owner.identity.variantByTag.get(tag);
        if (!variant) throw new TypeError(`实体 ${owner.id} 没有发布身份标签：${tag}`);
        return `${owner.id}:${tag}:${formatIndex(variant, maybeIndex, `实体 ${owner.id} 标签 ${tag}`)}`;
      }
      if (maybeIndex !== undefined)
        throw new TypeError(`实体 ${owner.id} 不是复合身份`);
      return `${owner.id}:${formatIndex(owner.identity, tagOrIndex, `实体 ${owner.id}`)}`;
    },
    /** 实体句柄 → 实体类与序号；类名本身表示与实例无关的切面。 */
    instance(handle) {
      const {owner, index, indexText, tag} = entityClassOf(handle);
      return Object.freeze({entityClass: owner.id, index, indexText, tag, handle: String(handle)});
    },
    /** 切面解析：返回声明范围内的记录或片段，不取数。 */
    facet(target, facetId) {
      const {owner, index, indexText, tag} = entityClassOf(target);
      const facet = owner.facets[facetId];
      if (!facet) throw new TypeError(`未声明的切面：${owner.id}.${facetId}`);
      if (!facet.runtime)
        throw new TypeError(`切面尚未接入运行期字段对象：${owner.id}.${facetId}（${facet.fieldObject}）`);
      if (facet.runtime.identityTags && !facet.runtime.identityTags.includes(tag))
        throw new TypeError(`切面 ${owner.id}.${facetId} 不属于身份标签：${tag}`);
      const {kind, resourceId, providerId} = facet.runtime;
      const publishedPrefix = owner.identity?.kind === "tagged"
        ? owner.identity.variantByTag.get(tag)?.publishedPrefix
        : owner.identity?.publishedPrefix;
      const common = {entityClass: owner.id, facetId, label: facet.label,
        fieldObject: facet.fieldObject, page: facet.page, recordScope: facet.recordScope,
        kind, resourceId, providerId, also: facet.runtime.also ?? [],
        index, indexText, tag, entityHandle: String(target),
        publishedHandle: indexText === null ? null : `${publishedPrefix}${indexText}`};
      if (kind === "fragments")
        return Object.freeze({...common, fragments: facet.runtime.fragments});
      if (facet.runtime.from) {
        const {from} = facet.runtime;
        if (indexText === null)
          throw new TypeError(`切面 ${owner.id}.${facetId} 需要实体句柄：${
            from.handle ?? from.select?.equals ?? ""}`);
        return Object.freeze({...common, index, indexText, fields: facet.runtime.fields,
          from: Object.freeze({resourceId: from.resourceId, path: from.path,
            handle: from.handle, select: from.select, field: from.field ?? null,
            pick: from.pick ?? null, handles: from.handles ?? null,
            documentPath: from.documentPath ?? null, where: from.where ?? null,
            within: from.within ?? null, condition: from.condition ?? null,
            relation: from.relation ?? null})});
      }
      return Object.freeze({...common, records: Object.freeze(facet.runtime.records.map(record => {
        if (record.entityHandle.includes("{") && indexText === null)
          throw new TypeError(`切面 ${owner.id}.${facetId} 需要实体句柄：${record.entityHandle}`);
        return Object.freeze({entityHandle: substituteSlots(record.entityHandle, index, indexText, tag),
          fields: record.fields});
      }))});
    },
  };
  return Object.freeze(catalog);
}

async function fetchDeclaration(sources) {
  const {db} = await import('./battle-result-script-runtime-B_EClFew.js').then(function (n) { return n.projectDb; });
  const declaration = await db.getPackageDocument('metadata/entities.json', null, {readonly: true});
  if (!declaration) throw new TypeError('实体声明不可用');
  return {source: sources[0], declaration};
}

let catalogPromise = null;

/** 载入实体目录；`readDeclaration` 供 Node 侧注入，浏览器用发布包/开发配置。 */
function loadEntityCatalog({readDeclaration = fetchDeclaration} = {}) {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const {source, declaration} = await readDeclaration(ENTITY_SOURCES);
      return createEntityCatalog(declaration, {source});
    })().catch(error => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

/** 按记录句柄从字段对象里取字段；声明了字段名就按名收窄，缺任何一个都报错。 */
function selectFacetFields(resourceId, objects, entries) {
  const all = objects.flatMap(object => object.fields);
  const selected = [];
  for (const record of entries) {
    let fields = all.filter(field => field.entityHandle === record.entityHandle);
    if (!fields.length)
      throw new TypeError(`字段对象缺少记录：${resourceId}/${record.entityHandle}`);
    if (record.fields) {
      const byName = new Map(fields.map(field => [field.fieldName, field]));
      fields = record.fields.map(fieldName => {
        const field = byName.get(fieldName);
        if (!field)
          throw new TypeError(`字段对象缺少字段：${record.entityHandle}/${fieldName}`);
        return field;
      });
    }
    selected.push(...fields);
  }
  return Object.freeze([...new Set(selected)]);
}

/** 记录由实例正文或字段对象自己现查：按声明定出记录集合。 */
async function referencedFacetEntries(database, resolved, objects, readEvidence, provider) {
  const {from} = resolved;
  if (from.relation) {
    // 已发布引用解析：source 取值 → resolution 解编号 → target 按发布文档定位记录。
    const what = `切面来源 ${from.relation.location}#${from.relation.path.join(".")}`;
    const evidence = await readEvidence(from.relation.location);
    const published = readPath(evidence, from.relation.path);
    if (!published || typeof published !== "object")
      throw new TypeError(`${what} 在证据里不存在`);
    if (evidence.schema === FIELD_OWNER_RESOLUTION_SCHEMA) {
      if (published.status !== "confirmed") throw new TypeError(`${what} 尚未确认`);
      if (published.logical_owner_resource_id !== resolved.fieldObject)
        throw new TypeError(`${what} 的逻辑字段对象与切面不一致：${
          published.logical_owner_resource_id} ≠ ${resolved.fieldObject}`);
      const domains = published.identity_domains;
      if (Array.isArray(domains) && !domains.some(domain =>
        resolved.index >= domain.first_item_id && resolved.index <= domain.last_item_id))
        throw new TypeError(`${what} 未发布实体 ${resolved.publishedHandle} 的字段域`);
      const publishedRecord = Array.isArray(published.records)
        ? published.records.find(row => row?.entity_handle === resolved.entityHandle) : null;
      if (Array.isArray(published.records) && !publishedRecord)
        throw new TypeError(`${what} 未发布实体 ${resolved.entityHandle} 的字段 owner`);
      const record = publishedRecord ?? {index: resolved.index};
      const template = from.relation.fieldHandleTemplate ?? published.record_handle_template;
      if (typeof template !== "string" || !template)
        throw new TypeError(`${what} 缺少字段对象句柄模板`);
      const entityHandle = substituteRecordSlots(template, record,
        resolved.index, resolved.indexText, resolved.tag);
      let fields = resolved.fields;
      if (fields === null && published.common_fields) {
        fields = Object.keys(published.common_fields);
        for (const [fieldName, field] of Object.entries(published.optional_fields ?? {})) {
          const condition = field.presence_condition;
          if (resolved.index >= condition.monster_id_minimum
              && resolved.index <= condition.monster_id_maximum) fields.push(fieldName);
        }
      } else if (fields === null && published.fields
          && from.relation.fieldHandleTemplate === null) {
        fields = Object.keys(published.fields);
      }
      return [Object.freeze({entityHandle, fields: fields === null ? null : Object.freeze(fields)})];
    }
    if (evidence.schema === CROSS_RESOURCE_RELATION_SCHEMA) {
      if (published.status !== "confirmed") throw new TypeError(`${what} 尚未确认`);
      const {source, target, condition} = published;
      if (evidence.subject === "vehicle-new-game-template-relations") {
        if (resolved.fieldObject !== "save-vehicle" || resolved.resourceId !== "save-vehicle"
            || resolved.providerId !== null)
          throw new TypeError(`${what} 的战车模板字段对象不一致`);
        const row = published.resolved?.find(item => item.entity_handle === resolved.entityHandle);
        if (!row) {
          if (published.not_applicable?.some(item => item.entity_handle === resolved.entityHandle))
            return [];
          throw new TypeError(`${what} 未发布战车模板关系：${resolved.entityHandle}`);
        }
        if (!Array.isArray(row.template_handles) || !row.template_handles.length
            || row.template_handles.some(handle => typeof handle !== "string"
              || !handle.startsWith("save-vehicle.initial-template-")))
          throw new TypeError(`${what} 的战车模板句柄无效`);
        return row.template_handles.map(entityHandle =>
          Object.freeze({entityHandle, fields: null}));
      }
      if (target?.logical_owner_resource_id === "save-vehicle") {
        if (resolved.providerId !== "save-context" || resolved.resourceId !== "save-vehicle"
            || resolved.fieldObject !== "save-vehicle"
            || typeof provider.matchingRentalVehicleSlots !== "function")
          throw new TypeError(`${what} 缺少战车存档字段提供器`);
        const fixed = published.fixed?.find(row => row.entity_handle === resolved.entityHandle);
        const dynamic = published.dynamic?.find(row => row.entity_handle === resolved.entityHandle);
        if (Boolean(fixed) === Boolean(dynamic) || (fixed ?? dynamic).preset_id !== resolved.index)
          throw new TypeError(`${what} 未发布战车实体关系：${resolved.entityHandle}`);
        const slots = fixed ? [fixed.persistent_vehicle_slot]
          : provider.matchingRentalVehicleSlots(dynamic.preset_id, dynamic.persistent_vehicle_slots);
        if (slots.some(slot => !Number.isInteger(slot) || slot < 0 || slot > 10))
          throw new TypeError(`${what} 持久战车槽越界`);
        return slots.map(slot => Object.freeze({entityHandle: `save-vehicle:${slot}`, fields: null}));
      }
      if (!source || typeof source !== "object" || !target || typeof target !== "object")
        throw new TypeError(`${what} 缺少 source／target`);
      if (target.resource_id !== resolved.fieldObject
          && target.resource_id !== resolved.resourceId)
        throw new TypeError(`${what} 的目标字段对象与切面不一致：${target.resource_id} ≠ ${resolved.fieldObject}/${resolved.resourceId}`);
      if (target.resource_id !== resolved.resourceId
          && from.relation.fieldHandleTemplate === null
          && from.relation.fieldHandleList === null)
        throw new TypeError(`${what} 的目标字段对象需要运行期句柄映射：${resolved.resourceId}`);
      const sourceHandles = new Set([resolved.entityHandle, resolved.publishedHandle]);
      const resolvedRecord = Array.isArray(published.resolved)
        ? published.resolved.find(row => sourceHandles.has(row?.entity_handle)) : null;
      if (Array.isArray(published.resolved) && !resolvedRecord) {
        const notApplicable = (published.not_applicable ?? []).some(row =>
          sourceHandles.has(row?.entity_handle))
          || (published.registered_without_profile ?? []).some(handle => sourceHandles.has(handle));
        if (notApplicable) return [];
        throw new TypeError(`${what} 未发布实体 ${resolved.publishedHandle} 的目标关系`);
      }
      if (resolvedRecord) {
        if (from.relation.fieldHandleList !== null) {
          const logicalHandles = Object.values(resolvedRecord).filter(value =>
            typeof value === "string" && value.startsWith(`${target.resource_id}:`));
          if (target.resource_id !== resolved.resourceId && !logicalHandles.length)
            throw new TypeError(`${what} 缺少目标逻辑句柄`);
          const handles = resolvedRecord[from.relation.fieldHandleList];
          if (!Array.isArray(handles) || !handles.length
              || handles.some(handle => typeof handle !== "string"
                || !handle || (target.resource_id !== resolved.resourceId
                  && !handle.startsWith(`${resolved.resourceId}:`))))
            throw new TypeError(`${what} 缺少运行期字段句柄列表`);
          return [...new Set(handles)].map(entityHandle =>
            Object.freeze({entityHandle, fields: resolved.fields}));
        }
        if (Array.isArray(target.shared_block_ids)) return target.shared_block_ids.map(id =>
          Object.freeze({entityHandle: `${resolved.resourceId}:${id}`, fields: resolved.fields}));
        const templates = [target, published.paired_target]
          .filter(candidate => candidate?.resource_id === target.resource_id)
          .map(candidate => candidate.handle_template);
        const publishedHandles = Object.values(resolvedRecord).filter(value =>
          typeof value === "string" && value.startsWith(`${target.resource_id}:`));
        const handles = from.relation.fieldHandleTemplate === null
          ? (publishedHandles.length ? publishedHandles : templates.map(template =>
            substituteRecordSlots(template, resolvedRecord,
              resolved.index, resolved.indexText, resolved.tag)))
          : [substituteRecordSlots(from.relation.fieldHandleTemplate, resolvedRecord,
            resolved.index, resolved.indexText, resolved.tag)];
        return [...new Set(handles)].map(entityHandle =>
          Object.freeze({entityHandle, fields: resolved.fields}));
      }
      if (from.relation.sourceField) {
        if (published.resolution?.kind !== "graphic-id-times-two"
            || !published.paired_target?.handle_template)
          throw new TypeError(`${what} 的 source_field 解析种类不认识`);
        const spec = from.relation.sourceField;
        const sourceHandle = substituteRecordSlots(spec.handleTemplate, {},
          resolved.index, resolved.indexText, resolved.tag);
        const sourceValue = (await database.getField(spec.resourceId, sourceHandle, spec.field)).value;
        if (!Number.isInteger(sourceValue)
            || sourceValue < published.resolution.source_first
            || sourceValue >= published.resolution.source_first + published.resolution.source_count)
          throw new TypeError(`${what} 的来源字段超出已发布图形域：${sourceValue}`);
        const pairEntries = recordId => {
          const pair = {anchor_byte_index: recordId * published.resolution.anchor_byte_index_multiplier,
            anchor_byte_index_plus_one: recordId * published.resolution.anchor_byte_index_multiplier
              + published.resolution.paired_target_delta};
          return [target.handle_template, published.paired_target.handle_template].map(template =>
            Object.freeze({entityHandle: substituteRecordSlots(template, pair,
              resolved.index, resolved.indexText, resolved.tag), fields: resolved.fields}));
        };
        const entries = pairEntries(sourceValue);
        const slots = published.slot_resolution;
        if (slots === undefined) return entries;
        if (slots.kind !== "x-bit7-low7-plus-selection-slot"
            || slots.selection_slot_count !== 6 || slots.record_count !== 121
            || slots.field_name !== "value")
          throw new TypeError(`${what} 的逐槽锚点解析声明不认识`);
        const pairs = new Map();
        const pairAt = async recordId => {
          if (!pairs.has(recordId)) pairs.set(recordId, (async () => {
            const pair = pairEntries(recordId);
            const [x, y] = await Promise.all(pair.map(entry =>
              database.getField(resolved.resourceId, entry.entityHandle, slots.field_name)));
            return {x: Number(x.value), y: Number(y.value), entries: pair};
          })());
          return pairs.get(recordId);
        };
        const slotRecords = [];
        for (let slot = 0; slot < slots.selection_slot_count; slot += 1) {
          let recordId = sourceValue;
          const visited = new Set();
          while (!visited.has(recordId)) {
            visited.add(recordId);
            if (recordId < 0 || recordId >= slots.record_count) {
              slotRecords.push(Object.freeze({slot, recordId,
                reason: "索引越出锚点表", redirected: visited.size > 1}));
              break;
            }
            const pair = await pairAt(recordId);
            for (const entry of pair.entries) {
              if (!entries.some(item => item.entityHandle === entry.entityHandle)) entries.push(entry);
            }
            if (pair.x & 0x80) {
              recordId = ((pair.x & 0x7f) + slot) & 0xff;
              continue;
            }
            slotRecords.push(Object.freeze({slot, recordId, x: pair.x, y: pair.y,
              reason: pair.y & 0x80 ? "这一槽没有固定源点" : "",
              redirected: visited.size > 1}));
            break;
          }
          if (!slotRecords.some(item => item.slot === slot))
            slotRecords.push(Object.freeze({slot, recordId,
              reason: "锚点重定向成环", redirected: true}));
        }
        entries.slotRecords = Object.freeze(slotRecords);
        return entries;
      }
      const sourceHandle = substituteRecordSlots(source.handle_template, {},
        resolved.index, resolved.indexText, resolved.tag);
      const record = {};
      for (const fieldName of source.fields ?? []) {
        const field = await database.getField(source.resource_id, sourceHandle, fieldName);
        record[fieldName] = field.value;
      }
      if (condition?.identity_tag !== undefined && condition.identity_tag !== resolved.tag) return [];
      if (condition?.field !== undefined) {
        if (!Object.hasOwn(record, condition.field))
          throw new TypeError(`${what} 的条件字段未由 source.fields 发布：${condition.field}`);
        if (condition.equals !== undefined && record[condition.field] !== condition.equals) return [];
        if (condition.not_equals !== undefined && record[condition.field] === condition.not_equals) return [];
      }
      // 先展开证据发布的目标句柄，即使字段 owner 使用自己的记录句柄，也不跳过证据形状校验。
      substituteRecordSlots(target.handle_template, record,
        resolved.index, resolved.indexText, resolved.tag);
      const entityHandle = from.relation.fieldHandleTemplate === null
        ? substituteRecordSlots(target.handle_template, record,
          resolved.index, resolved.indexText, resolved.tag)
        : substituteRecordSlots(from.relation.fieldHandleTemplate, record,
          resolved.index, resolved.indexText, resolved.tag);
      return [Object.freeze({entityHandle, fields: resolved.fields})];
    }
    if (published.schema !== PUBLISHED_RELATION_SCHEMA)
      throw new TypeError(`${what} 的 schema 不认识：${published.schema}`);
    const {source, target} = published;
    if (!source || typeof source !== "object" || !target || typeof target !== "object")
      throw new TypeError(`${what} 缺少 source／target`);
    const sourceId = substitutePublishedSlots(source.resource_id_template,
      resolved.index, resolved.indexText, resolved.tag);
    const sourceDocument = await database.getResourceDocument(sourceId, null);
    if (!sourceDocument) throw new TypeError(`实体切面来源不可用：${sourceId}`);
    const sourceValue = readPath(sourceDocument,
      [...from.relation.sourceRoot, ...source.document_path]);
    if (!Number.isInteger(sourceValue) || sourceValue < 0 || sourceValue > 0xff)
      throw new TypeError(`${what} 的来源值不是 0–255：${sourceValue}`);
    const values = publishedRelationValues(what, published.resolution, sourceValue);
    const targetDocument = await database.getResourceDocument(target.resource_id, null);
    if (!targetDocument) throw new TypeError(`实体切面目标不可用：${target.resource_id}`);
    const bankPath = target.bank_document_path;
    const tilePath = target.tile_document_path;
    if (!Array.isArray(bankPath) || !Array.isArray(tilePath)
        || bankPath.at(-1) !== "{bank}" || !tilePath.includes("{bank}"))
      throw new TypeError(`${what} 的 bank／tile 路径不认识`);
    const banks = readPath(targetDocument, bankPath.slice(0, -1));
    if (!Array.isArray(banks)) throw new TypeError(`${what} 的目标文档缺少 ${bankPath.slice(0, -1).join(".")}`);
    const tileTail = tilePath.slice(tilePath.indexOf("{bank}") + 1);
    const entries = [];
    for (const value of values) {
      const bank = banks.find(row => row?.[target.bank_id_field] === value);
      // 缺 bank 就报错：不假定编号连续、不按数组位置回退。
      if (!bank) throw new TypeError(`${what} 的目标文档里没有 ${target.bank_id_field} 为 ${value} 的 bank`);
      const tiles = readPath(bank, tileTail);
      if (!Array.isArray(tiles) || !tiles.length)
        throw new TypeError(`${what} 的 bank ${value} 没有已发布图块：${tileTail.join(".")}`);
      for (const tile of tiles) {
        const tileId = tile?.[target.tile_id_field];
        if (!Number.isInteger(tileId) || tileId < 0 || tileId > 0xff)
          throw new TypeError(`${what} 的 bank ${value} 里有图块缺少 ${target.tile_id_field}`);
        const entityHandle = publishedTargetHandle(what, target.tile_handle_template, value, tileId);
        if (!entries.some(entry => entry.entityHandle === entityHandle))
          entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    return entries;
  }
  if (!from.path) {
    const target = String(substituteSlots(from.select.equals,
      resolved.index, resolved.indexText, resolved.tag));
    if (!objects.some(object => object.fields.some(field => field.fieldName === from.select.field)))
      throw new TypeError(`字段对象里没有 ${from.select.field}：${resolved.resourceId}`);
    const matched = [];
    for (const object of objects) for (const field of object.fields) {
      if (field.fieldName !== from.select.field) continue;
      if (String(field.value) === target && !matched.includes(field.entityHandle))
        matched.push(field.entityHandle);
    }
    if (!from.field) return matched.map(entityHandle =>
      Object.freeze({entityHandle, fields: resolved.fields}));
    // 第二步：拿选中记录的另一个字段值当句柄（`{value}`／`{value:hexN}`）。
    const handles = [];
    for (const entityHandle of matched) {
      for (const object of objects) for (const field of object.fields) {
        if (field.entityHandle !== entityHandle || field.fieldName !== from.field) continue;
        const mapped = from.handle.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) => {
          if (width === undefined) return String(field.value);
          if (!Number.isInteger(field.value) || field.value < 0)
            throw new TypeError(`字段 ${entityHandle}/${from.field} 不是非负整数：${field.value}`);
          return field.value.toString(16).toUpperCase().padStart(Number(width), "0");
        });
        if (!handles.includes(mapped)) handles.push(mapped);
      }
    }
    return handles.map(entityHandle => Object.freeze({entityHandle, fields: resolved.fields}));
  }
  const sourceId = substituteSlots(from.resourceId, resolved.index, resolved.indexText, resolved.tag);
  const document_ = await database.getResourceDocument(sourceId, null);
  if (!document_) throw new TypeError(`实体切面来源不可用：${sourceId}`);
  const rows = readPath(document_, from.path);
  if (from.pick) {
    // 正文里取几个下标的值，每个值按模板铺成句柄（已发布页／指针这类"由数值选资源"）。
    if (!Array.isArray(rows))
      throw new TypeError(`实体切面来源缺少 ${from.path.join(".")}：${sourceId}`);
    const handles = [];
    for (const index of from.pick) {
      const value = rows[index];
      if (!Number.isInteger(value) || value < 0)
        throw new TypeError(`实体切面来源的 ${from.path.join(".")}[${index}] 不是非负整数：${value}`);
      for (const template of from.handles) {
        const handle = template.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) =>
          width === undefined ? String(value)
            : value.toString(16).toUpperCase().padStart(Number(width), "0"));
        if (!handles.includes(handle)) handles.push(handle);
      }
    }
    return handles.map(entityHandle => Object.freeze({entityHandle, fields: resolved.fields}));
  }
  if (!Array.isArray(rows))
    throw new TypeError(`实体切面来源缺少 ${from.path.join(".")}：${sourceId}`);
  let chosen = rows;
  if (from.where) {
    const want = substituteSlots(from.where.value, resolved.index, resolved.indexText, resolved.tag);
    chosen = rows.filter(row => {
      const value = row?.[from.where.field];
      if (from.where.kind === "contains")
        return Array.isArray(value) && value.map(String).includes(want);
      return String(value) === want;
    });
    if (!chosen.length)
      throw new TypeError(`实体切面来源里没有 ${from.where.field} ${
        from.where.kind === "contains" ? "含" : "等于"} ${want} 的记录：${sourceId}`);
  }
  if (from.condition) {
    chosen = chosen.filter(row => {
      const value = readPath(row, from.condition.field.split("."));
      if (from.condition.kind === "starts_with") return String(value).startsWith(from.condition.value);
      return String(value) === from.condition.value;
    });
    if (!chosen.length) return [];
  }
  if (from.documentPath) {
    // 目标记录按字段对象自己发布的正文位置找：找不到即报错，不退回整资源、不按序号回退。
    const published = objects.flatMap(object => object.fields);
    const entries = [];
    for (const row of chosen) {
      const path = from.documentPath.map(step =>
        substituteDocumentPathStep(step, row, resolved.index, resolved.indexText, resolved.tag));
      const wanted = JSON.stringify(path);
      const matched = published.filter(field => JSON.stringify(field.documentPath) === wanted);
      if (!matched.length)
        throw new TypeError(`字段对象里没有正文位置 ${wanted}：${resolved.resourceId}`);
      for (const field of matched) {
        if (entries.some(entry => entry.entityHandle === field.entityHandle
            && entry.fields[0] === field.fieldName)) continue;
        entries.push(Object.freeze({entityHandle: field.entityHandle, fields: [field.fieldName]}));
      }
    }
    return entries;
  }
  if (from.within) {
    // 已发布引用清单：先按 where 取到该实例的记录，再从它的嵌套引用数组里按关系筛目标句柄。
    const within = from.within;
    const entries = [];
    for (const row of chosen) {
      const rows = readPath(row, within.path);
      if (!Array.isArray(rows))
        throw new TypeError(`实体切面来源记录缺少 ${within.path.join(".")}：${sourceId}`);
      const matched = rows.filter(entry => {
        const value = entry?.[within.where.field];
        if (within.where.kind === "contains")
          return Array.isArray(value) && value.map(String).includes(within.where.value);
        return String(value) === within.where.value;
      });
      for (const entry of matched) for (const template of within.handles) {
        const entityHandle = substituteRecordSlots(
          template, entry, resolved.index, resolved.indexText, resolved.tag);
        if (!entries.some(existing => existing.entityHandle === entityHandle))
          entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    if (!within.then) return entries;
    // 第二跳：第一跳句柄所在的字段对象上读一个字段，字段值就是下一层的句柄。
    const then = within.then;
    const mapped = [];
    for (const entry of entries) {
      // 第一跳句柄属于声明的第二跳资源：不在那儿就由 getField 报错，不换资源顶替。
      const field = await database.getField(then.resourceId, entry.entityHandle, then.field);
      for (const template of then.handles ?? ["{value}"]) {
        const entityHandle = template.replace(/\{value(?::hex(\d+))?\}/gu, (match, width) =>
          width === undefined ? String(field.value)
            : nonNegativeHex(field.value, `${then.field}`, Number(width)));
        if (!mapped.some(existing => existing.entityHandle === entityHandle))
          mapped.push(Object.freeze({entityHandle, fields: resolved.fields}));
      }
    }
    return mapped;
  }
  const entries = [];
  for (const row of chosen) for (const template of from.handles ?? [from.handle]) {
    const entityHandle = substituteRecordSlots(
      template, row, resolved.index, resolved.indexText, resolved.tag);
    if (!entries.some(entry => entry.entityHandle === entityHandle))
      entries.push(Object.freeze({entityHandle, fields: resolved.fields}));
  }
  return entries;
}

/**
 * 经实体句柄 + 切面取字段对象的共享实例，只回切面声明范围内的字段。
 * 声明里的记录、片段或字段名在字段对象里不存在即报错，不退回整资源。
 * 记录集合可以写在声明里，也可以由实例正文的已发布引用现查（`from`）。
 */
async function entityFacetFields(database, target, facetId,
  {catalog = null, readEvidence = null, fieldProviders = {}} = {}) {
  const directory = catalog ?? await loadEntityCatalog();
  const resolved = directory.facet(target, facetId);
  const provider = resolved.providerId === null ? database
    : (fieldProviders instanceof Map
      ? fieldProviders.get(resolved.providerId) : fieldProviders[resolved.providerId]);
  if (!provider || typeof provider.getFieldObjects !== "function"
      || typeof provider.getField !== "function")
    throw new TypeError(`实体取数缺少字段提供器：${resolved.providerId ?? "project"}`);
  // 字段对象所在的资源本身也可以是实例资源（如场景资产 `scene:XX`）。
  const resourceId = resolved.resourceId.includes("{")
    ? substituteSlots(resolved.resourceId, resolved.index, resolved.indexText, resolved.tag)
    : resolved.resourceId;
  const withAlso = async fields => {
    const selected = [...fields];
    for (const entry of resolved.also) {
      const handle = substituteSlots(entry.entityHandle,
        resolved.index, resolved.indexText, resolved.tag);
      for (const name of entry.fields) {
        const field = await database.getField(entry.resourceId, handle, name);
        if (!selected.includes(field)) selected.push(field);
      }
    }
    return Object.freeze(selected);
  };
  // 已发布引用形态的切面按句柄直接定位字段：整资源列对象在 CHR 这种上万对象的资源上不可用。
  const relationForm = resolved.kind === "records" && Boolean(resolved.from?.relation);
  const objects = relationForm ? null : await provider.getFieldObjects(resourceId);
  if (resolved.kind === "fragments") {
    const selected = resolved.fragments.map(declared => {
      const fragmentId = declared.includes("{")
        ? substituteSlots(declared, resolved.index, resolved.indexText, resolved.tag)
        : declared;
      const object = objects.find(candidate => candidate.id === fragmentId);
      if (!object) throw new TypeError(`字段对象缺少片段：${resourceId}/${fragmentId}`);
      return object;
    });
    return Object.freeze({...resolved, resourceId, objects: Object.freeze(selected),
      fields: Object.freeze(selected.flatMap(object => object.fields))});
  }
  const entries = resolved.from
    ? await referencedFacetEntries(database, resolved, objects,
      readEvidence ?? (location => directory.relationDocument(location)), provider)
    : resolved.records;
  if (relationForm) {
    if (entries.some(entry => entry.fields === null)) {
      const relationObjects = await provider.getFieldObjects(resourceId);
      const fields = selectFacetFields(resourceId, relationObjects, entries);
      return Object.freeze({...resolved, resourceId, objects: Object.freeze(relationObjects),
        records: Object.freeze(entries), fields: await withAlso(fields)});
    }
    const fields = [];
    for (const entry of entries) for (const name of entry.fields) {
      const field = await provider.getField(resourceId, entry.entityHandle, name);
      if (!fields.includes(field)) fields.push(field);
    }
    return Object.freeze({...resolved, resourceId, objects: Object.freeze([]),
      records: Object.freeze(entries), slotRecords: entries.slotRecords ?? null,
      fields: await withAlso(fields)});
  }
  const fields = selectFacetFields(resourceId, objects, entries);
  return Object.freeze({...resolved, resourceId, objects: Object.freeze(objects),
    records: Object.freeze(entries), fields: await withAlso(fields)});
}

// @editor-module 战车预设与初始停放的字段对象会话。

const clone = value => JSON.parse(JSON.stringify(value));
let loading = null;

function revision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sessionMatches(repository, originalRevision) {
  return state.projectRepository === repository && revision() === originalRevision;
}

function vehicleDraftFromDocument(document_) {
  const presets = {};
  for (const preset of document_?.presets || []) {
    presets[Number(preset.preset_id)] = {
      preset_id: Number(preset.preset_id),
      defense: Number(preset.defense?.value ?? 0),
      chassis_weight_units: Number(preset.chassis_weight?.internal_units ?? 0),
      ammo_capacity: Number(preset.ammo_capacity?.value ?? 0),
      mount_mask: draftEquipmentMask(preset.mount_mask?.value),
      equipped_mask: draftEquipmentMask(preset.equipped_mask?.value),
      slot_assignments: clone(preset.slot_assignments ?? Array(5).fill(null)),
      equipment: (preset.loadout || []).slice(0, 6)
        .map(slot => Number(slot.item_id ?? 0)),
    };
  }
  const placement = {};
  for (const row of document_?.initial_placement?.records || []) {
    placement[Number(row.vehicle_slot)] = {
      vehicle_slot: Number(row.vehicle_slot),
      placed: Boolean(row.placed),
      scene_id: row.placed ? Number(row.scene_id) : null,
      x: Number(row.x),
      y: Number(row.y),
    };
  }
  return {table_sha256: document_?.writeback_state?.current_sha256 || '',
    presets, placement};
}

async function ensureVehicleDraft() {
  if (state.vehicleDraft || !state.project) return state.vehicleDraft;
  const project = state.project;
  const repository = requireBrowserProjectRepository(state);
  const originalRevision = revision();
  if (!loading || loading.project !== project || loading.repository !== repository
      || loading.revision !== originalRevision) {
    const promise = (async () => {
      await db.getFieldObjects('vehicle-preset');
      const saved = await db.readResource('vehicle-preset');
      if (state.project !== project || !sessionMatches(repository, originalRevision)) return null;
      if (!state.vehicleDraft) {
        state.vehicleDraft = vehicleDraftFromDocument(saved.value.document);
        state.vehicleOriginal = clone({presets: state.vehicleDraft.presets,
          placement: state.vehicleDraft.placement});
        state.vehicleDirty = false;
      }
      return state.vehicleDraft;
    })();
    loading = {project, repository, revision: originalRevision, promise};
    void promise.finally(() => {
      if (loading?.promise === promise) loading = null;
    }).catch(() => {});
  }
  return loading.promise;
}

function vehicleViewDraft(viewId) {
  const ids = state.project?.game_data?.vehicles?.views?.[viewId]?.preset_ids;
  if (!ids || !state.vehicleDraft) return [];
  return ids.map(Number).sort((left, right) => left - right)
    .map(id => state.vehicleDraft.presets[id]).filter(Boolean);
}

function vehiclePresetDraft(presetId) {
  return state.vehicleDraft?.presets?.[Number(presetId)] || null;
}

function vehicleEquippedMask(record) {
  return record.equipped_mask;
}

function vehicleViewDirty(viewId) {
  const presetsChanged = vehicleViewDraft(viewId).some(record =>
    JSON.stringify(record) !==
      JSON.stringify(state.vehicleOriginal?.presets?.[record.preset_id]));
  if (presetsChanged) return true;
  if (viewId !== 'player') return false;
  return JSON.stringify(state.vehicleDraft?.placement)
    !== JSON.stringify(state.vehicleOriginal?.placement);
}

function vehicleTableDirty() {
  state.vehicleDirty = JSON.stringify({presets: state.vehicleDraft?.presets,
    placement: state.vehicleDraft?.placement}) !== JSON.stringify(state.vehicleOriginal);
  return state.vehicleDirty;
}

function replaceVehicleSelection(target, restored, presetId, viewId) {
  const id = Number(presetId);
  if (restored.presets[id]) target.presets[id] = clone(restored.presets[id]);
  else delete target.presets[id];
  if (viewId !== 'player') return;
  if (restored.placement[id]) target.placement[id] = clone(restored.placement[id]);
  else delete target.placement[id];
}

function finishVehicleOriginalReset({repository, revision: originalRevision, id, viewId}, saved) {
  if (!sessionMatches(repository, originalRevision))
    throw new Error('项目会话已切换，请在当前载具页重试');
  const restored = vehicleDraftFromDocument(saved.value.document);
  replaceVehicleSelection(state.vehicleDraft, restored, id, viewId);
  replaceVehicleSelection(state.vehicleOriginal, restored, id, viewId);
  vehicleTableDirty();
  return saved;
}

function vehicleItemCategorySnapshot(records, items) {
  const snapshot = {};
  for (const itemId of new Set(records.flatMap(record => record.equipment || []))) {
    const item = items[Number(itemId)];
    if (item) snapshot[Number(itemId)] = {category: clone(item.category)};
  }
  return snapshot;
}

function vehicleViewSaveSnapshot(viewId) {
  const project = state.project;
  const view = project?.game_data?.vehicles?.views?.[viewId];
  if (!view) throw new Error(`未知的战车用途视图：${viewId}`);
  if (!state.vehicleDraft) throw new Error('战车预设草稿不可用，请刷新页面');
  const records = clone(vehicleViewDraft(viewId));
  const placement = viewId === 'player'
    ? clone(Object.values(state.vehicleDraft.placement)) : [];
  const items = vehicleItemCategorySnapshot(records,
    project?.game_data?.items?.records || []);
  return {viewId, repository: requireBrowserProjectRepository(state),
    revision: revision(), project, records, placement, items, before: clone(state.vehicleOriginal)};
}

function validateVehicleViewSaveSnapshot(viewId, snapshot) {
  if (!snapshot || snapshot.viewId !== viewId || !snapshot.repository ||
      !snapshot.project || !Array.isArray(snapshot.records) ||
      !Array.isArray(snapshot.placement) || !snapshot.items)
    throw new TypeError(`战车用途视图 ${viewId} 的保存快照不完整`);
  return snapshot;
}

async function saveVehicleView(viewId,
  snapshot = vehicleViewSaveSnapshot(viewId)) {
  const payload = validateVehicleViewSaveSnapshot(viewId, snapshot);
  const fields = await db.getFields('vehicle-preset');
  const byKey = new Map(fields.map(field =>
    [`${field.recordId}:${field.fieldName}`, field]));
  const edits = [];
  const presetValues = record => {
    const values = new Map([
      ['defense', record.defense], ['chassis_weight', record.chassis_weight_units],
      ['ammo_capacity', record.ammo_capacity], ['mount_mask', record.mount_mask],
      ['equipped_mask', vehicleEquippedMask(record)],
    ]);
    record.equipment.forEach((itemId, slot) => values.set(`loadout_${slot}`, itemId));
    return values;
  };
  for (const edited of payload.records) {
    const id = Number(edited.preset_id);
    const values = presetValues(edited);
    const before = payload.before?.presets[id];
    const previous = before ? presetValues(before) : null;
    for (const [name, value] of values) {
      const field = byKey.get(`${id}:${name}`);
      if (!field || value === null) continue;
      if ((previous ? previous.get(name) : field.value) !== value) edits.push({field, value});
    }
  }
  if (viewId === 'player') for (const row of payload.placement) {
    const id = Number(row.vehicle_slot);
    for (const [name, value] of [['scene_id', row.placed ? row.scene_id : null],
      ['x', row.x], ['y', row.y]]) {
      const field = byKey.get(`${id}:${name}`);
      if (!field) throw new Error(`vehicle-preset 缺少停放字段 ${id}:${name}`);
      const before = payload.before?.placement[id];
      const previous = before ? (name === 'scene_id' && !before.placed ? null : before[name]) : field.value;
      if (previous !== value) edits.push({field, value});
    }
  }
  if (edits.length) await db.writeFields(edits,
    {expectedVersion: fields[0]?.version ?? null});
  const saved = await db.readResource('vehicle-preset');
  if (!sessionMatches(payload.repository, payload.revision) ||
      state.project !== payload.project) return saved;
  const persisted = vehicleDraftFromDocument(saved.value.document);
  if (state.vehicleOriginal) {
    for (const record of payload.records) {
      const id = Number(record.preset_id);
      if (!persisted.presets[id])
        throw new Error(`vehicle-preset 写入后缺少战车预设 ${id}`);
      state.vehicleDraft.presets[id] = applyJsonChanges(persisted.presets[id], record, state.vehicleDraft.presets[id]);
      state.vehicleOriginal.presets[id] = clone(persisted.presets[id]);
    }
    if (viewId === 'player') for (const row of payload.placement) {
      const id = Number(row.vehicle_slot);
      if (persisted.placement[id]) {
        state.vehicleDraft.placement[id] = applyJsonChanges(persisted.placement[id], row, state.vehicleDraft.placement[id]);
        state.vehicleOriginal.placement[id] = clone(persisted.placement[id]);
      } else delete state.vehicleOriginal.placement[id];
    }
    vehicleTableDirty();
  }
  return saved;
}

export { ensureVehicleDraft, entityDisplayRecords, entityFacetFields, entityPeekPreviewInput, entityPreviewInput, entityPreviewInputs, finishVehicleOriginalReset, loadEntityCatalog, saveVehicleView, vehicleDraftFromDocument, vehicleEquippedMask, vehiclePresetDraft, vehicleTableDirty, vehicleViewDirty, vehicleViewDraft, vehicleViewSaveSnapshot };
