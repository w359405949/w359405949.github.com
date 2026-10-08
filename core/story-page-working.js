// @editor-module 剧情页 Working 版本、脚本归属与结构片段。
import {canonicalJsonEqual} from "./project-store-values.js";
import {storyPageDefinitionForView} from "./story-view-config.js";
import {isStoryPageDocument, validateStoryPageJson, STORY_PAGE_DOCUMENT_VERSION} from './story-page-json.js';

const PREFIX = "story-page-working:";
export class StoryPageDataError extends TypeError {
  constructor(message, page) {super(message); this.storyPage = page;}
}
export const storyPageWorkingKey = page => `${PREFIX}${page}`;
export const isStoryPageWorking = record => record.resource_id?.startsWith(PREFIX);
export const isStoryScriptResource = id => ["story-autonomous-script", "story-interaction-script"].includes(id);

export function validateStoryPageWorking(record) {
  const page = record.resource_id.slice(PREFIX.length);
  if (isStoryPageDocument(record)) {
    if (record.overrides.data_version !== STORY_PAGE_DOCUMENT_VERSION)
      throw new StoryPageDataError(`剧情页 ${page} 数据版本不符`, page);
    try {validateStoryPageJson(record.overrides.document);}
    catch (error) {throw new StoryPageDataError(error.message, page);}
    if (!Array.isArray(record.overrides.edits) || record.overrides.edits.length)
      throw new StoryPageDataError(`剧情页 ${page} 不得持有 ROM 脚本编辑`, page);
    const entries = record.overrides.rom_entries || [];
    if (!Array.isArray(entries) || new Set(entries.map(entry => entry.key)).size !== entries.length
        || entries.some(entry => !record.overrides.document.programs.some(program => program.key === entry.key
          && program.kind === entry.kind) || !Number.isInteger(entry.script_id)))
      throw new StoryPageDataError(`剧情页 ${page} ROM 入口无效`, page);
    return page;
  }
  const definition = storyPageDefinitionForView(page);
  if (!definition) throw new StoryPageDataError(`剧情页 ${page} 不存在`, page);
  if (record.overrides?.data_version !== definition.workingDataVersion)
    throw new StoryPageDataError(`剧情页 ${page} 数据版本不符：${record.overrides?.data_version}，需要 ${definition.workingDataVersion}；未加载，不执行迁移`, page);
  if (!Array.isArray(record.overrides.edits)
      || !record.overrides.edits.length) throw new StoryPageDataError(`剧情页 ${page} 编辑数据无效`, page);
  const seen = new Set();
  for (const edit of record.overrides.edits) {
    const key = `${edit.resource_id}/${edit.script_id}`;
    if (!isStoryScriptResource(edit.resource_id) || !Number.isInteger(edit.script_id)
        || seen.has(key) || (!Object.hasOwn(edit, "bytecode") && !Object.hasOwn(edit, "sequence")))
      throw new StoryPageDataError(`剧情页 ${page} 脚本归属无效`, page);
    seen.add(key);
  }
  return page;
}

// 失效页保留在仓库供显式清理，不参与共享脚本的投影与写入。
export function usableStoryPageWorking(pages) {
  return pages.filter(record => {
    if (isStoryPageDocument(record)) return false;
    try {validateStoryPageWorking(record); return true;}
    catch (error) {if (error instanceof StoryPageDataError) return false; throw error;}
  });
}

function sequenceParts(asset, sequence) {
  if (!asset.layout) {
    if (sequence !== undefined) throw new TypeError("剧情结构声明未发布");
    return new Map();
  }
  const groups = new Map(asset.layout.groups.map(group => [group.id, group.script_id]));
  const parts = new Map();
  for (const token of sequence) {
    const id = typeof token === "string" ? groups.get(token) : token.script_id;
    if (!Number.isInteger(id)) throw new TypeError("剧情结构缺少脚本归属");
    if (!parts.has(id)) parts.set(id, []);
    parts.get(id).push(token);
  }
  return parts;
}

export function projectStoryPageWorking(asset, pages, legacy = []) {
  const resourceId = asset.resource_id;
  const overrides = legacy.filter(row => row.field_name !== "sequence");
  const legacySequence = legacy.find(row => row.field_name === "sequence");
  const parts = sequenceParts(asset, legacySequence?.value ?? asset.sequence);
  const order = [...sequenceParts(asset, asset.sequence).keys()];
  const owners = {};
  for (const record of usableStoryPageWorking(pages)) {
    const page = validateStoryPageWorking(record);
    for (const edit of record.overrides.edits.filter(edit => edit.resource_id === resourceId)) {
      if (owners[edit.script_id]) throw new TypeError("剧情脚本存在重复归属");
      if (!asset.scripts.some(script => script.id === edit.script_id)) throw new TypeError("剧情页引用了不存在的脚本");
      owners[edit.script_id] = page;
      if (Object.hasOwn(edit, "bytecode")) {
        const entityHandle = `${resourceId}:script:${edit.script_id.toString(16).toUpperCase().padStart(2, "0")}`;
        const index = overrides.findIndex(row => row.entity_handle === entityHandle);
        if (index >= 0) overrides.splice(index, 1);
        overrides.push({resource_id: resourceId, entity_handle: entityHandle, field_name: "bytecode", value: edit.bytecode});
      }
      if (Object.hasOwn(edit, "sequence")) parts.set(edit.script_id, edit.sequence);
    }
  }
  const sequence = order.flatMap(id => parts.get(id) ?? []);
  if (asset.layout && !canonicalJsonEqual(sequence, asset.sequence)) overrides.push({resource_id: resourceId,
    entity_handle: `${resourceId}:pool`, field_name: "sequence", value: sequence});
  return {overrides, storyOwners: owners};
}

// 共用脚本归首个编辑页；后续编辑与重置仍修改该页的一份 Working。
export function updateStoryPageWorking(asset, pages, writes, page, projectId) {
  if (!storyPageDefinitionForView(page)) throw new TypeError("剧情编辑缺少页面身份");
  const result = structuredClone(pages);
  const oldParts = sequenceParts(asset, asset.sequence);
  const updates = [];
  for (const {record, remove} of writes) {
    if (record.field_name === "sequence") {
      const next = sequenceParts(asset, remove ? asset.sequence : record.value);
      for (const id of oldParts.keys()) updates.push({scriptId: id, kind: "sequence",
        value: next.get(id) ?? [], remove: canonicalJsonEqual(next.get(id) ?? [], oldParts.get(id))});
    } else updates.push({scriptId: parseInt(record.entity_handle.split(":").at(-1), 16),
      kind: "bytecode", value: record.value, remove});
  }
  for (const update of updates) {
    let owner = result.find(row => row.overrides.edits.some(edit => edit.resource_id === asset.resource_id
      && edit.script_id === update.scriptId));
    if (!owner && update.remove) continue;
    if (!owner) {
      owner = result.find(row => row.resource_id === storyPageWorkingKey(page));
      if (!owner) {
        owner = {project_id: projectId, resource_id: storyPageWorkingKey(page),
          schema: "metalmaxcn.working-asset", asset_schema: "metalmaxcn.story-page-working", codec: null,
          version: 0, overrides: {data_version: storyPageDefinitionForView(page).workingDataVersion, edits: []}};
        result.push(owner);
      }
    }
    let edit = owner.overrides.edits.find(edit => edit.resource_id === asset.resource_id && edit.script_id === update.scriptId);
    if (!edit) {edit = {resource_id: asset.resource_id, script_id: update.scriptId}; owner.overrides.edits.push(edit);}
    if (update.remove) delete edit[update.kind]; else edit[update.kind] = structuredClone(update.value);
    owner.overrides.edits = owner.overrides.edits.filter(edit => Object.hasOwn(edit, "bytecode") || Object.hasOwn(edit, "sequence"));
  }
  return result.filter(row => row.overrides.edits.length);
}
