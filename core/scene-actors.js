// @editor-module 场景角色记录的未提交值按共用字段身份读写。
import {state} from "./state.js";
import {db} from "./project-db.js";
import {
  requireBrowserProjectRepository,
  setProjectFields,
  createProjectFieldDraft,
  acceptProjectFieldDraft,
} from "./project-data.js";
import {SCENE_ACTOR_FIELDS} from "./scene-actor-compiler.js";

export const SCENE_ACTORS_RESOURCE_ID = "scene-actor";
export const SCENE_ACTOR_EDITABLE_FIELDS = SCENE_ACTOR_FIELDS;

export async function getSceneActorFields(uid) {
  return Promise.all(SCENE_ACTOR_EDITABLE_FIELDS.map(name =>
    db.peekField(SCENE_ACTORS_RESOURCE_ID, uid, name) || db.getField(SCENE_ACTORS_RESOURCE_ID, uid, name)));
}

let cache = null;
let cacheSource = null;

function sceneActorProjectRevision() {
  return state.browserProjectManifest?.active_original_revision_id ?? null;
}

function sceneActorSaveSessionMatches(snapshot) {
  return state.projectRepository === snapshot.repository
    && sceneActorProjectRevision() === snapshot.revision
    && state.project === snapshot.project
    && state.sceneActors === snapshot.draft;
}

/** 编辑中的超集：草稿优先，没有草稿就用服务端下发的那份。 */
export function sceneActorDocument() {
  return state.sceneActors
    || state.project?.scenes?.actors
    || db.peekDocument("scene-actor", null);
}

/**
 * 按 uid 取权威记录。缓存按来源数组的**身份**失效——写成
 * `if (!cache)` 的话，换了 project 或建了新草稿照样读到旧对象。
 */
export function sceneActorRecord(uid) {
  const records = sceneActorDocument()?.records;
  if (!records) return null;
  if (!cache || cacheSource !== records) {
    cache = new Map(records.map(record => [record.uid, record]));
    cacheSource = records;
  }
  return cache.get(uid) || null;
}

/** 一张 actor 表（entry_id）下的全部权威记录，按记录号排序。 */
function sceneActorTable(entryId) {
  const records = sceneActorDocument()?.records || [];
  return records
    .filter(record => Number(record.entry_id) === Number(entryId))
    .sort((left, right) => Number(left.id) - Number(right.id));
}

/** 同一物理 6 字节记录可能被多个入口表别名引用；编辑必须同步全部别名。 */
export function sceneActorAliasRecords(document_, recordOrUid) {
  const records = document_?.records || [];
  const record = typeof recordOrUid === "object" && recordOrUid
    ? recordOrUid
    : records.find(item => String(item.uid) === String(recordOrUid));
  if (!record) return [];
  const offset = Number(record.source?.offset);
  const length = Number(record.source?.length);
  if (!Number.isInteger(offset) || !Number.isInteger(length)) return [record];
  return records.filter(item => (
    Number(item.source?.offset) === offset
      && Number(item.source?.length) === length
  ));
}

/** 把一份 semantic patch 应用到共享物理记录的每个稳定 uid。 */
export function applySceneActorAliasPatch(document_, uid, patch) {
  const records = sceneActorAliasRecords(document_, uid);
  const values = Object.fromEntries(SCENE_ACTOR_EDITABLE_FIELDS
    .filter(field => Object.hasOwn(patch || {}, field))
    .map(field => [field, Number(patch[field])]));
  records.forEach(record => Object.assign(record, values));
  return records;
}

// 未提交值按共用字段身份存储。
export async function beginSceneActorDraft() {
  const source = await db.getDocument("scene-actor", null);
  if (!source) return null;
  state.sceneActors = createProjectFieldDraft(source, await db.getFields(SCENE_ACTORS_RESOURCE_ID));
  state.sceneActorsOriginal = source.records;
  cache = null;
  cacheSource = null;
  return state.sceneActors;
}

/** 相对草稿基线变过的记录。保存时只合并这些字段，不替换整份资产。 */
export function changedSceneActors() {
  const records = state.sceneActors?.records;
  const original = state.sceneActorsOriginal;
  if (!records || !original) return [];
  const before = new Map(original.map(record => [record.uid, record]));
  return records.filter(record => {
    const previous = before.get(record.uid);
    if (!previous) return true;
    return SCENE_ACTOR_EDITABLE_FIELDS.some(
      field => Number(record[field]) !== Number(previous[field]),
    );
  });
}

function sceneActorFields(record) {
  return Object.fromEntries(SCENE_ACTOR_EDITABLE_FIELDS.map(field => [
    field,
    Number(record[field]),
  ]));
}

/** 在自动保存 commit 时冻结场景角色的字段补丁与项目会话。 */
export function sceneActorSaveSnapshot() {
  const directlyChanged = changedSceneActors();
  if (!directlyChanged.length) return null;
  directlyChanged.forEach(record => {
    applySceneActorAliasPatch(
      state.sceneActors,
      record.uid,
      sceneActorFields(record),
    );
  });
  return {
    repository: requireBrowserProjectRepository(state),
    revision: sceneActorProjectRevision(),
    project: state.project,
    draft: state.sceneActors,
    version: state.sceneActorsVersion,
    records: changedSceneActors().map(record => ({
      uid: String(record.uid),
      fields: Object.fromEntries(Object.entries(sceneActorFields(record)).filter(([name, value]) => {
        const before = state.sceneActorsOriginal.find(row => row.uid === record.uid);
        return !before || Number(before[name]) !== value;
      })),
    })),
  };
}

function validateSceneActorSaveSnapshot(snapshot) {
  if (!snapshot?.repository || !snapshot.project || !snapshot.draft ||
      !Array.isArray(snapshot.records)) {
    throw new TypeError("场景角色保存快照不完整");
  }
  return snapshot;
}

// 与 Scene semantic compiler 一致：只有这九个字段能改，其余都是派生值。
export async function saveSceneActors(
  snapshot = sceneActorSaveSnapshot(),
) {
  if (!snapshot) return {changed_fields: 0, records: 0};
  const payload = validateSceneActorSaveSnapshot(snapshot);
  if (payload.repository !== requireBrowserProjectRepository(state)) throw new Error("场景角色字段会话已改变");
  const changes = new Map();
  for (const {uid, fields: values} of payload.records) for (const field of await getSceneActorFields(uid)) {
    if (!Object.hasOwn(values, field.fieldName)) continue;
    const value = values[field.fieldName];
    if (changes.has(field) && changes.get(field).value !== value) throw new Error("场景角色别名草稿冲突");
    changes.set(field, {field, value});
  }
  await setProjectFields(db, [...changes.values()], {expectedVersion: payload.version});
  const saved = await db.readResource(SCENE_ACTORS_RESOURCE_ID);
  acceptProjectFieldDraft(payload.draft, [...changes.keys()]);
  if (sceneActorSaveSessionMatches(payload)) {
    const persisted = saved.value.document;
    state.project.scenes.actors = persisted;
    const persistedByUid = new Map((persisted.records || []).map(record => [
      String(record.uid),
      record,
    ]));
    const savedUids = new Set(payload.records.map(record => record.uid));
    for (const uid of savedUids) {
      if (!persistedByUid.has(uid)) {
        throw new Error(`scene-actor 写入后缺少记录 ${uid}`);
      }
    }
    state.sceneActorsOriginal = state.sceneActorsOriginal.map(record =>
      savedUids.has(String(record.uid))
        ? persistedByUid.get(String(record.uid))
        : record);
    state.sceneActorsVersion = saved.version;
  }
  const changedFields = changes.size;
  return {
    changed_fields: changedFields,
    records: payload.records.length,
    version: saved.version,
    dirty: saved.dirty,
  };
}
