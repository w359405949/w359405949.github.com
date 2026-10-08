// @editor-module 通过 Web Lock 与 IndexedDB 事务管理项目资产、Working、blob 和导入导出。
// IndexedDB v1 repository for the browser-only project lifecycle.
//
// Views consume this API by stable resource ID.  They do not know whether the
// backing provider is IndexedDB, a static package, or a future project archive.
// Every mutation takes an exclusive Web Lock and completes in one IndexedDB
// transaction; no synchronous key/value browser store is authoritative.

import {fieldOwner, hasFieldOwner, closesLegacyResource} from "./field-owners.js";
import {SPARSE_ARRAY_FORMAT, changeArrayFieldWorking} from "./field-codec.js";
import {isStoryPageWorking, isStoryScriptResource, storyPageWorkingKey,
    validateStoryPageWorking, usableStoryPageWorking, projectStoryPageWorking, updateStoryPageWorking} from "./story-page-working.js";

import {migrateLegacyOpaqueEditPolicies} from "./edit-policy.js";
import {isStoryPageDocument, validateStoryPageJson} from './story-page-json.js';
import {allocateStoryPageEntries, assertStoryPageEntryRom} from './story-page-entries.js';
import {allocateExtendedApplicationProgram} from './application-program.js';
import {EXTENDED_APPLICATION_COMMANDS, applicationCommandId} from './application-program-format.js';
import {interfaceStateDocumentKey, isInterfaceStateDocumentRecord, validateInterfaceStateDocument,
    INTERFACE_STATE_DOCUMENT_SCHEMA} from './interface-state-document.js';

import {
    AssetSchemaMigrationRegistry,
    ProjectAssetMigrationMissingError,
    MISSING,
    applyOverrides,
    applyJsonChanges,
    assertJsonValue,
    assetModelIdentity,
    base64ToBytes,
    bytesToBase64,
    canonicalJsonEqual,
    validatedJsonEqual,
    canonicalJsonStringify,
    cloneJson,
    cloneValidatedJson,
    freezeValidatedJson,
    isFrozenValidatedJson,
    diffJson,
    isPlainJsonObject,
    isWorkingDirty,
    jsonSelectionStates,
    resetJsonSelections,
} from "./project-store-values.js";

export * from "./project-store-values.js";

export const PROJECT_DATABASE_NAME = "metalmaxcn-projects";
const PROJECT_DATABASE_VERSION = 3;
const PROJECT_MANIFEST_SCHEMA = "metalmaxcn.web-project-manifest";
const ORIGINAL_REVISION_SCHEMA = "metalmaxcn.original-revision";
const ORIGINAL_ASSET_SCHEMA = "metalmaxcn.original-asset";
const WORKING_ASSET_SCHEMA = "metalmaxcn.working-asset";
const PROJECT_BLOB_SCHEMA = "metalmaxcn.project-blob";
const BUILD_REPORT_RECORD_SCHEMA =
    "metalmaxcn.build-report-record";
const PROJECT_EXPORT_SCHEMA = "metalmaxcn.web-project-export";

export const PROJECT_OBJECT_STORES = Object.freeze({
    manifests: "manifests",
    originalRevisions: "original_revisions",
    originalAssets: "original_assets",
    working: "working",
    fieldWorking: "field_working",
    fieldState: "field_state",
    blobs: "blobs",
    buildReports: "build_reports",
});

const INDEX_BY_PROJECT = "by_project";
const INDEX_BY_REVISION = "by_revision";
const INDEX_BY_RESOURCE = "by_resource";
const INDEX_BY_ACTIVE_REVISION = "by_active_revision";

const allStoreNames = () => Object.values(PROJECT_OBJECT_STORES);

const nonEmptyString = (value, label) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
};

const requestResult = request => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
        request.error || new ProjectStoreError("IndexedDB request failed"),
    );
});

const transactionCompletion = transaction => new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
        transaction.error || new ProjectStoreError("IndexedDB transaction aborted"),
    );
    transaction.onerror = () => {
        // The abort event owns rejection so the original transaction error wins.
    };
});

const BUILD_INPUT_STAMP_ID = "__build_input_stamp__";
const inputWrites = new WeakMap();

// 构建输入写事务须同时更新标记；构建产物写入除外。
async function transact(database, storeNames, mode, callback, trackInputs = true, trackMaterialization = true, afterCommit) {
    const tracks = mode === "readwrite" && trackInputs &&
        storeNames.some(name => name !== PROJECT_OBJECT_STORES.buildReports);
    const names = tracks ? [...new Set([...storeNames, PROJECT_OBJECT_STORES.manifests])] : storeNames;
    const transaction = database.transaction(names, mode);
    const completion = transactionCompletion(transaction);
    try {
        const result = await callback(transaction);
        const changed = tracks && (typeof trackInputs === "function" ? trackInputs(result) : true);
        let committedStamp;
        if (changed) {
            const store = transaction.objectStore(PROJECT_OBJECT_STORES.manifests);
            const previous = await requestResult(store.get(BUILD_INPUT_STAMP_ID));
            const stamp = crypto.randomUUID();
            committedStamp = stamp;
            store.put({project_id: BUILD_INPUT_STAMP_ID, stamp,
                materialization_stamp: trackMaterialization ? stamp : previous?.materialization_stamp || previous?.stamp || stamp,
                count: (previous?.count || 0) + 1});
        }
        await completion;
        if (changed) inputWrites.set(database, (inputWrites.get(database) || 0) + 1);
        afterCommit?.(committedStamp);
        return result;
    } catch (error) {
        try {
            transaction.abort();
        } catch (_abortError) {
            // The transaction may already have aborted because of request error.
        }
        try {
            await completion;
        } catch (_transactionError) {
            // Preserve the more specific callback/request error.
        }
        throw error;
    }
}

function createObjectStore(database, name, keyPath, indexes = []) {
    const store = database.createObjectStore(name, {keyPath});
    for (const [indexName, indexKeyPath, options] of indexes) {
        store.createIndex(indexName, indexKeyPath, options);
    }
    return store;
}

function installProjectDatabaseV1(database) {
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.manifests,
        "project_id",
    );
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.originalRevisions,
        ["project_id", "revision_id"],
        [[INDEX_BY_PROJECT, "project_id", {unique: false}]],
    );
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.originalAssets,
        ["project_id", "revision_id", "resource_id"],
        [
            [INDEX_BY_PROJECT, "project_id", {unique: false}],
            [INDEX_BY_REVISION, ["project_id", "revision_id"], {unique: false}],
        ],
    );
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.working,
        ["project_id", "resource_id"],
        [[INDEX_BY_PROJECT, "project_id", {unique: false}]],
    );
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.blobs,
        ["project_id", "blob_id"],
        [[INDEX_BY_PROJECT, "project_id", {unique: false}]],
    );
    createObjectStore(
        database,
        PROJECT_OBJECT_STORES.buildReports,
        ["project_id", "build_id"],
        [[INDEX_BY_PROJECT, "project_id", {unique: false}]],
    );
}

// Format installation only. Existing edits are not converted or silently consumed.
function installProjectDatabaseV2(database) {
    createObjectStore(database, PROJECT_OBJECT_STORES.fieldWorking,
        ["project_id", "resource_id", "entity_handle", "field_name"], [
            [INDEX_BY_PROJECT, "project_id", {unique: false}],
            [INDEX_BY_RESOURCE, ["project_id", "resource_id"], {unique: false}],
        ]);
    createObjectStore(database, PROJECT_OBJECT_STORES.fieldState,
        ["project_id", "resource_id"], [[INDEX_BY_PROJECT, "project_id", {unique: false}]]);
}

function installProjectDatabaseV3(transaction) {
    transaction.objectStore(PROJECT_OBJECT_STORES.manifests).createIndex(
        INDEX_BY_ACTIVE_REVISION, ["project_id", "active_original_revision_id"], {unique: true});
}

export class ProjectFieldFormatError extends Error {}
const FIELD_FORMAT = 1;
const storyFieldChecks = new WeakMap();
const fieldVersion = meta => meta ? `${meta.epoch}:${meta.version}` : null;
const fieldStores = () => [PROJECT_OBJECT_STORES.manifests, PROJECT_OBJECT_STORES.originalAssets,
    PROJECT_OBJECT_STORES.working, PROJECT_OBJECT_STORES.fieldWorking, PROJECT_OBJECT_STORES.fieldState];

function requireFieldOwner(resourceId) {
    fieldOwner(resourceId);
}

function assertApplicationAllocationChange(resourceId, snapshot, overrides) {
    const name = resourceId === 'application-program' ? 'independent_programs'
        : EXTENDED_APPLICATION_COMMANDS.map(applicationCommandId).includes(resourceId) ? 'program_reference' : null;
    if (!name) return;
    const value = rows => rows.find(row => row.field_name === name)?.value ?? snapshot.original.value.document[name];
    const previous = value(snapshot.overrides), next = value(overrides);
    if (name === 'program_reference') {
        if (previous !== null && next !== previous) throw new TypeError('已分配的扩展命令不可回收或改绑');
    } else if (next.length < previous.length || previous.some((program, index) => program.id !== next[index]?.id)) {
        throw new TypeError('已创建的应用程序不可回收或重排');
    }
}

// Field owners may publish either a document-wrapped asset or a flat semantic
// asset (for example world-event). Keep the storage validation path on
// the same repository-document boundary used by project-db instead of making
// every owner invent a wrapper solely for Working writes.
function fieldDocument(value, resourceId) {
    if (!isPlainJsonObject(value)) {
        throw new ProjectFieldFormatError(`${resourceId} Original 正文不是对象`);
    }
    const document = Object.hasOwn(value, "document") ? value.document : value;
    if (!isPlainJsonObject(document)) {
        throw new ProjectFieldFormatError(`${resourceId} 字段正文不是对象`);
    }
    return document;
}

function validateFieldMeta(meta, original) {
    if (meta && (meta.format !== FIELD_FORMAT || meta.revision_id !== original.revision_id
        || typeof meta.epoch !== "string" || !meta.epoch || !Number.isSafeInteger(meta.version) || meta.version < 0)) {
        throw new ProjectFieldFormatError("字段 Working 格式或默认来源已失效；须明确丢弃后重新编辑，不执行迁移");
    }
}

async function assertLegacyResource(transaction, projectId, resourceId) {
    if (closesLegacyResource(resourceId) || (hasFieldOwner(resourceId) && await requestResult(transaction.objectStore(
        PROJECT_OBJECT_STORES.fieldState).get([projectId, resourceId])))) {
        throw new ProjectFieldFormatError(`${resourceId} 已使用字段 Working；旧整资源入口已停用，请使用字段入口`);
    }
}

async function readFieldSnapshot(transaction, projectId, resourceId, {discard = false, originals} = {}) {
    requireFieldOwner(resourceId);
    const key = [projectId, resourceId];
    const [revisionId, meta, overrides] = await Promise.all([
        readActiveRevisionId(transaction, projectId),
        requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.fieldState).get(key)),
        requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking)
            .index(INDEX_BY_RESOURCE).getAll(key)),
    ]);
    const dependencyIds = fieldOwner(resourceId).dependencies || [];
    const [original, dependencyRecords] = await Promise.all([
        readOriginalSnapshot(transaction, projectId, revisionId, resourceId, originals),
        Promise.all(dependencyIds.map(dependency =>
            readOriginalSnapshot(transaction, projectId, revisionId, dependency, originals))),
    ]);
    if (!original) throw new ProjectRecordNotFoundError(`${resourceId}: Original 未准备`);
    const dependencies = {};
    for (const [index, dependency] of dependencyIds.entries()) {
        const record = dependencyRecords[index];
        if (!record || record.revision_id !== revisionId)
            throw new ProjectRecordNotFoundError(`${dependency}: 同版本 Original 未准备`);
        dependencies[dependency] = record.value;
    }
    if (discard) return {original, meta, overrides, dependencies, version: fieldVersion(meta)};
    // 数据不设版本号，也不强制旧数据退役：读不上的元数据与覆盖静默忽略，不拒绝加载（项目说明架构第 11 条）。
    const usableMeta = usableFieldMeta(meta);
    let usable = usableOverrides(fieldOwner(resourceId), original.value, overrides, dependencies);
    let storyOwners, storyPages;
    if (isStoryScriptResource(resourceId)) {
        storyPages = usableStoryPageWorking((await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
            .index(INDEX_BY_PROJECT).getAll(projectId))).filter(isStoryPageWorking));
        ({overrides: usable, storyOwners} = projectStoryPageWorking(original.value, storyPages, usable));
        // 不可变 Origin 的同值 Working 复用已通过的脚本校验。
        const previous = storyFieldChecks.get(original);
        if (!previous || !validatedJsonEqual(previous, usable)) {
            fieldOwner(resourceId).validate(original.value, usable, dependencies);
            if (isFrozenValidatedJson(original)) storyFieldChecks.set(original,
                freezeValidatedJson(cloneValidatedJson(usable)));
        }
    }
    return {original, meta: usableMeta, overrides: usable, dependencies, storyOwners, storyPages,
        version: fieldVersion(usableMeta)};
}

const freezeOriginal = freezeValidatedJson;

async function readOriginalSnapshot(transaction, projectId, revisionId, resourceId, originals) {
    const key = JSON.stringify([revisionId, resourceId]);
    if (originals?.has(key)) return originals.get(key);
    const pending = requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.originalAssets)
        .get([projectId, revisionId, resourceId])).then(record => originals ? freezeOriginal(record ?? null) : record ?? null);
    if (originals) {
        originals.set(key, pending);
        pending.catch(() => {if (originals.get(key) === pending) originals.delete(key);});
    }
    return pending;
}

function usableFieldMeta(meta) {
    return meta && meta.format === FIELD_FORMAT && typeof meta.epoch === "string" && meta.epoch
        && Number.isSafeInteger(meta.version) && meta.version >= 0 ? meta : null;
}

function usableOverrides(owner, original, overrides, dependencies) {
    // 空覆盖恒可用：没有覆盖就没有可校验的东西。空集走全量校验要给整份
    // Original 做克隆与描述，shared-chr-bank 一次约 0.7 秒。
    if (!overrides.length) return overrides;
    const accepts = rows => {
        try { owner.validate(original, rows, dependencies); return true; } catch { return false; }
    };
    if (accepts(overrides)) return overrides;
    const single = overrides.filter(row => accepts([row]));
    return accepts(single) ? single : [];
}

const upgradeHooksAt = (hooks, version) => {
    if (hooks instanceof Map) {
        const hook = hooks.get(version);
        return hook ? (Array.isArray(hook) ? hook : [hook]) : [];
    }
    if (Array.isArray(hooks)) {
        return hooks
            .filter(entry => entry && entry.version === version)
            .map(entry => entry.upgrade);
    }
    if (hooks && typeof hooks === "object") {
        const hook = hooks[version];
        return hook ? (Array.isArray(hook) ? hook : [hook]) : [];
    }
    return [];
};

/**
 * Apply synchronous upgrade hooks. Hooks may enqueue IDB requests on the
 * versionchange transaction, but may not return a Promise.
 */
function applyProjectDatabaseMigrations(event, upgradeHooks = []) {
    const database = event.target.result;
    const transaction = event.target.transaction;
    for (let version = event.oldVersion + 1;
        version <= event.newVersion; version += 1) {
        if (version === 1) installProjectDatabaseV1(database);
        if (version === 2) installProjectDatabaseV2(database);
        if (version === 3) installProjectDatabaseV3(transaction);
        for (const hook of upgradeHooksAt(upgradeHooks, version)) {
            if (typeof hook !== "function") {
                throw new TypeError(`database upgrade hook v${version} is not a function`);
            }
            const result = hook({
                database,
                transaction,
                version,
                oldVersion: event.oldVersion,
                newVersion: event.newVersion,
            });
            if (result && typeof result.then === "function") {
                throw new TypeError(
                    "IndexedDB upgrade hooks must synchronously enqueue requests",
                );
            }
        }
    }
}

function openProjectDatabase({
    name = PROJECT_DATABASE_NAME,
    version = PROJECT_DATABASE_VERSION,
    indexedDBFactory = globalThis.indexedDB,
    upgradeHooks = [],
} = {}) {
    if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") {
        return Promise.reject(new ProjectStoreUnavailableError(
            "IndexedDB is unavailable in this browser context",
        ));
    }
    return new Promise((resolve, reject) => {
        let upgradeError = null;
        let settled = false;
        const request = indexedDBFactory.open(name, version);
        request.onupgradeneeded = event => {
            try {
                applyProjectDatabaseMigrations(event, upgradeHooks);
            } catch (error) {
                upgradeError = error;
                try {
                    event.target.transaction.abort();
                } catch (_abortError) {
                    // onerror will report the captured migration error.
                }
            }
        };
        request.onerror = () => {
            settled = true;
            reject(upgradeError || request.error ||
                new ProjectStoreError("failed to open project database"));
        };
        request.onblocked = () => {
            settled = true;
            reject(new ProjectStoreBlockedError(
                "project database upgrade is blocked by another tab",
            ));
        };
        request.onsuccess = () => {
            if (settled) {
                request.result.close();
                return;
            }
            settled = true;
            const database = request.result;
            database.onversionchange = () => database.close();
            resolve(database);
        };
    });
}

class ProjectStoreError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

class ProjectStoreUnavailableError extends ProjectStoreError {}
class ProjectStoreBlockedError extends ProjectStoreError {}
class ProjectWriterLockUnavailableError extends ProjectStoreError {}
class ProjectRecordNotFoundError extends ProjectStoreError {}
class ProjectOriginalImmutableError extends ProjectStoreError {}
export class ProjectWorkingVersionError extends ProjectStoreError {}
class ProjectImportConflictError extends ProjectStoreError {}

async function runWithProjectWriterLock(projectId, callback, {
    databaseName = PROJECT_DATABASE_NAME,
    lockManager = globalThis.navigator?.locks,
} = {}) {
    nonEmptyString(projectId, "projectId");
    if (!lockManager || typeof lockManager.request !== "function") {
        throw new ProjectWriterLockUnavailableError(
            "Web Locks API is required for project mutations; write was not attempted",
        );
    }
    const lockName = `metalmaxcn-project:${databaseName}:${projectId}`;
    const options = {mode: "exclusive"};
    // Web Locks already release automatically when a page closes or crashes.
    // Queue short project mutations instead of using a non-blocking probe:
    // concurrent
    // resolve/materialize calls in one tab are just as legitimate as writes
    // arriving from two tabs and must not be misreported as a stale writer.
    return lockManager.request(lockName, options, async () => callback());
}

function normalizeManifest(input, projectId) {
    assertJsonValue(input, "$.manifest");
    if (!isPlainJsonObject(input)) throw new TypeError("manifest must be an object");
    return {
        ...cloneJson(input),
        schema: PROJECT_MANIFEST_SCHEMA,
        project_id: projectId,
    };
}

function normalizeOriginalAssetCatalog(input) {
    if (!Array.isArray(input)) {
        throw new TypeError("revision.asset_catalog must be an array");
    }
    const resourceIds = new Set();
    return input.map((rawDescriptor, index) => {
        const label = `revision.asset_catalog[${index}]`;
        assertJsonValue(rawDescriptor, label);
        if (!isPlainJsonObject(rawDescriptor)) {
            throw new TypeError(`${label} must be an object`);
        }
        const resourceId = nonEmptyString(
            rawDescriptor.resource_id,
            `${label}.resource_id`,
        );
        const assetSchema = nonEmptyString(
            rawDescriptor.asset_schema,
            `${label}.asset_schema`,
        );
        if (!Object.hasOwn(rawDescriptor, "codec")) {
            throw new TypeError(`${label}.codec is required`);
        }
        const codec = rawDescriptor.codec;
        if (codec !== null) nonEmptyString(codec, `${label}.codec`);
        if (resourceIds.has(resourceId)) {
            throw new TypeError(
                `duplicate revision.asset_catalog resource_id: ${resourceId}`,
            );
        }
        resourceIds.add(resourceId);
        return {
            ...cloneJson(rawDescriptor),
            resource_id: resourceId,
            asset_schema: assetSchema,
            codec,
        };
    });
}

function normalizeRevision(input, projectId) {
    assertJsonValue(input, "$.revision");
    if (!isPlainJsonObject(input)) throw new TypeError("revision must be an object");
    const revisionId = nonEmptyString(input.revision_id, "revision.revision_id");
    const record = {
        ...cloneJson(input),
        schema: ORIGINAL_REVISION_SCHEMA,
        project_id: projectId,
        revision_id: revisionId,
    };
    if (Object.hasOwn(input, "asset_catalog")) {
        record.asset_catalog = normalizeOriginalAssetCatalog(input.asset_catalog);
    }
    return record;
}

function normalizeOriginalAsset(input, projectId, revisionId) {
    assertJsonValue(input, "$.assets[]");
    if (!isPlainJsonObject(input)) throw new TypeError("asset must be an object");
    const resourceId = nonEmptyString(input.resource_id, "asset.resource_id");
    const assetSchema = nonEmptyString(input.asset_schema, "asset.asset_schema");
    if (!("value" in input)) throw new TypeError(`${resourceId}: asset.value is required`);
    const codec = input.codec === undefined ? null : input.codec;
    if (codec !== null) nonEmptyString(codec, "asset.codec");
    // 已校验且完全冻结的 Origin 共享正文，其余输入隔离容器。
    const {value, ...metadata} = input;
    return {
        ...cloneJson(metadata),
        schema: ORIGINAL_ASSET_SCHEMA,
        project_id: projectId,
        revision_id: revisionId,
        resource_id: resourceId,
        asset_schema: assetSchema,
        codec,
        value: isFrozenValidatedJson(value) ? value : cloneValidatedJson(value),
    };
}

function originalAssetCatalogByResource(revision) {
    if (!Object.hasOwn(revision, "asset_catalog")) return null;
    let catalog;
    try {
        catalog = normalizeOriginalAssetCatalog(revision.asset_catalog);
    } catch (error) {
        throw new ProjectOriginalImmutableError(
            `original revision ${revision.revision_id} has an invalid asset_catalog`,
            {cause: error},
        );
    }
    return new Map(catalog.map(descriptor => [
        descriptor.resource_id,
        descriptor,
    ]));
}

function assertOriginalAssetDeclared(revision, catalog, asset) {
    const descriptor = catalog.get(asset.resource_id);
    if (!descriptor) {
        throw new ProjectOriginalImmutableError(
            `${asset.resource_id}: not declared by original revision ` +
            revision.revision_id,
        );
    }
    if (asset.asset_schema !== descriptor.asset_schema) {
        throw new ProjectOriginalImmutableError(
            `${asset.resource_id}: asset_schema does not match original revision ` +
            revision.revision_id,
        );
    }
    if ((asset.codec ?? null) !== descriptor.codec) {
        throw new ProjectOriginalImmutableError(
            `${asset.resource_id}: codec does not match original revision ` +
            revision.revision_id,
        );
    }
}

// 认不出来的 working 记录一律当作「没有覆盖」：值回落到当前默认值，下一次保存
// 就写成当前形状。db 自己静默处理这件事，页面不该看见任何「记录无效」。
function normalizeWorkingRecord(record) {
    if (!record) throw new ProjectStoreError("working record is missing");
    if (!isPlainJsonObject(record.overrides)) record.overrides = {};
    return record;
}

function normalizeBuildReportRecord(input, projectId) {
    assertJsonValue(input, "$.buildReportRecord");
    if (!isPlainJsonObject(input) ||
        !isPlainJsonObject(input.report)) {
        throw new TypeError("invalid build report record");
    }
    const buildId = nonEmptyString(input.build_id, "buildReport.build_id");
    const createdAt = nonEmptyString(
        input.created_at,
        "buildReport.created_at",
    );
    if (input.report.build_id !== buildId) {
        throw new TypeError("build report ID does not match its record key");
    }
    if (Number.isNaN(Date.parse(createdAt))) {
        throw new TypeError("buildReport.created_at must be an ISO timestamp");
    }
    return {
        ...cloneJson(input),
        schema: BUILD_REPORT_RECORD_SCHEMA,
        project_id: projectId,
        build_id: buildId,
        created_at: createdAt,
        report: cloneJson(input.report),
    };
}

function newWorkingRecord(projectId, original) {
    return {
        schema: WORKING_ASSET_SCHEMA,
        project_id: projectId,
        resource_id: original.resource_id,
        asset_schema: original.asset_schema,
        codec: original.codec ?? null,
        version: 0,
        overrides: {},
    };
}

function saveCurrentOriginal(value) {
    return {resource_id: "save-current", asset_schema: "metalmaxcn.save-current",
        codec: "save-current", value, revision_id: null};
}

// 覆盖永远铺在**当前**默认值上。默认值换了（ROM/存档重解析）不需要迁移
// working 记录，也不存在「这份编辑属于哪个版本」。
function resolvedWorking(record, original) {
    normalizeWorkingRecord(record);
    const value = applyOverrides(original.value, record.overrides);
    if (record.resource_id === "save-current" && isPlainJsonObject(value)
        && isPlainJsonObject(record.overrides?.drafts)) {
        value.drafts = cloneJson(record.overrides.drafts);
    }
    return {
        resource_id: record.resource_id,
        revision_id: original.revision_id,
        asset_schema: record.asset_schema,
        codec: record.codec ?? null,
        layer: "working",
        version: record.version,
        dirty: isWorkingDirty(record),
        value,
    };
}

function resolvedOriginal(original) {
    return {
        resource_id: original.resource_id,
        revision_id: original.revision_id,
        asset_schema: original.asset_schema,
        codec: original.codec ?? null,
        layer: "original",
        version: null,
        dirty: false,
        value: cloneValidatedJson(original.value),
    };
}

function activeRevisionId(manifest) {
    const revisionId = manifest?.active_original_revision_id;
    return nonEmptyString(revisionId, "manifest.active_original_revision_id");
}

// 当前修订只从清单索引键读取，不反序列化清单中的构建目标。
async function readActiveRevisionId(transaction, projectId) {
    const cursor = await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.manifests)
        .index(INDEX_BY_ACTIVE_REVISION).openKeyCursor(
            globalThis.IDBKeyRange.bound([projectId], [projectId, []])));
    return nonEmptyString(cursor?.key[1], "manifest.active_original_revision_id");
}

async function deleteIndexRecords(index, query) {
    const keys = await requestResult(index.getAllKeys(query));
    for (const key of keys) index.objectStore.delete(key);
    return keys.length;
}

function deterministicConflictId(resourceId, incomingRevisionId) {
    return canonicalJsonStringify([resourceId, incomingRevisionId]);
}

export class IndexedDbProjectStore {
    static async open({
        projectId,
        databaseName = PROJECT_DATABASE_NAME,
        indexedDBFactory = globalThis.indexedDB,
        lockManager = globalThis.navigator?.locks,
        upgradeHooks = [],
        assetMigrations = new AssetSchemaMigrationRegistry(),
    } = {}) {
        const database = await openProjectDatabase({
            name: databaseName,
            indexedDBFactory,
            upgradeHooks,
        });
        return new IndexedDbProjectStore(database, {
            projectId,
            databaseName,
            lockManager,
            assetMigrations,
        });
    }

    constructor(database, {
        projectId,
        databaseName = database.name || PROJECT_DATABASE_NAME,
        lockManager = globalThis.navigator?.locks,
        assetMigrations = new AssetSchemaMigrationRegistry(),
    } = {}) {
        if (!database || typeof database.transaction !== "function") {
            throw new TypeError("database must be an open IDBDatabase");
        }
        this.database = database;
        this.databaseName = databaseName;
        this.projectId = nonEmptyString(projectId, "projectId");
        this.lockManager = lockManager;
        this.assetMigrations = assetMigrations;
        this.editPolicyMigrations = new Map();
        this.originalSnapshots = {stamp: undefined, records: new Map()};
        this.workingListeners = new Set();
        this.workingChannel = typeof globalThis.BroadcastChannel === "function"
            ? new globalThis.BroadcastChannel(`${databaseName}:${projectId}:working`) : null;
        this.workingChannel?.unref?.();
        if (this.workingChannel) this.workingChannel.onmessage = () => {
            for (const listener of this.workingListeners) listener();
        };
    }

    async originalSnapshotRecords(transaction) {
        // Origin 快照只在当前事务的仓库写入标记一致时复用，写事务始终重新取数。
        const record = await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.manifests)
            .get(BUILD_INPUT_STAMP_ID));
        const stamp = record?.stamp ?? null;
        if (this.originalSnapshots.stamp !== stamp) {
            this.originalSnapshots = {stamp, records: new Map()};
        }
        return this.originalSnapshots.records;
    }

    close() {
        this.workingChannel?.close();
        this.workingListeners.clear();
        this.database.close();
    }

    subscribeWorking(listener) {
        this.workingListeners.add(listener);
        return () => this.workingListeners.delete(listener);
    }

    async withWriterLock(callback) {
        return runWithProjectWriterLock(this.projectId, async () => {
            const before = inputWrites.get(this.database) || 0;
            const result = await callback();
            if ((inputWrites.get(this.database) || 0) !== before) this.workingChannel?.postMessage(null);
            return result;
        }, {
            databaseName: this.databaseName,
            lockManager: this.lockManager,
        });
    }

    async getManifest() {
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.manifests],
            "readonly",
            async transaction => {
                const record = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests,
                ).get(this.projectId));
                return record ? cloneValidatedJson(record) : null;
            },
        );
    }

    async getBuildInputStamp() {
        return transact(this.database, [PROJECT_OBJECT_STORES.manifests], "readonly",
            async transaction => {
                const record = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests).get(BUILD_INPUT_STAMP_ID));
                return {stamp: record?.stamp || null, count: record?.count || 0,
                    materializationStamp: record?.materialization_stamp || record?.stamp || null,
                    localWrites: inputWrites.get(this.database) || 0};
            });
    }

    async pruneOriginalRevisions({expectedRevisionId} = {}) {
        return this.withWriterLock(() => transact(this.database, [
            PROJECT_OBJECT_STORES.manifests,
            PROJECT_OBJECT_STORES.originalRevisions,
            PROJECT_OBJECT_STORES.originalAssets,
        ], "readwrite", async transaction => {
            const manifests = transaction.objectStore(PROJECT_OBJECT_STORES.manifests);
            const manifest = await requestResult(manifests.get(this.projectId));
            const revisionId = activeRevisionId(manifest);
            if (expectedRevisionId !== undefined && revisionId !== expectedRevisionId) {
                throw new ProjectWorkingVersionError("默认来源已改变；拒绝旧会话清理");
            }
            const prune = async name => {
                const store = transaction.objectStore(name);
                const keys = await requestResult(store.index(INDEX_BY_PROJECT).getAllKeys(this.projectId));
                const obsolete = keys.filter(key => key[1] !== revisionId);
                for (const key of obsolete) store.delete(key);
                return obsolete.length;
            };
            const [revisions, assets] = await Promise.all([
                prune(PROJECT_OBJECT_STORES.originalRevisions),
                prune(PROJECT_OBJECT_STORES.originalAssets),
            ]);
            if (manifest.original_revision_ids?.length !== 1 || manifest.original_revision_ids[0] !== revisionId) {
                manifests.put({...manifest, original_revision_ids: [revisionId]});
            }
            return {revisions, assets, revisionId};
        }, false));
    }

    async saveManifest(manifest, {expectedActiveRevisionId, buildOutputOnly = false} = {}) {
        const record = normalizeManifest(manifest, this.projectId);
        return this.withWriterLock(() => transact(
            this.database,
            [PROJECT_OBJECT_STORES.manifests],
            "readwrite",
            async transaction => {
                const store = transaction.objectStore(PROJECT_OBJECT_STORES.manifests);
                const existing = await requestResult(store.get(this.projectId));
                if (buildOutputOnly) {
                    const inputs = value => {
                        const copy = {...value};
                        delete copy.latest_package_build_id;
                        return copy;
                    };
                    if (!canonicalJsonEqual(inputs(existing), inputs(record))) {
                        throw new ProjectStoreError("build output update changed project inputs");
                    }
                }
                if (expectedActiveRevisionId !== undefined &&
                    existing?.active_original_revision_id !== expectedActiveRevisionId) {
                    throw new ProjectWorkingVersionError(
                        "active original changed before manifest save",
                    );
                }
                if (existing && record.active_original_revision_id !==
                    existing.active_original_revision_id) {
                    throw new ProjectImportConflictError(
                        "use activateOriginalRevision() to change the active original",
                    );
                }
                store.put(record);
                return cloneJson(record);
            },
            !buildOutputOnly,
        ));
    }

    async activateOriginalRevision(revisionId, {expectedRevisionId} = {}) {
        nonEmptyString(revisionId, "revisionId");
        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalRevisions,
            ],
            "readwrite",
            async transaction => {
                const revision = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalRevisions,
                ).get([this.projectId, revisionId]));
                if (!revision) {
                    throw new ProjectRecordNotFoundError(
                        `original revision not found: ${revisionId}`,
                    );
                }
                const manifests = transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests,
                );
                const manifest = await requestResult(manifests.get(this.projectId));
                if (!manifest) {
                    throw new ProjectRecordNotFoundError("project manifest not found");
                }
                if (expectedRevisionId !== undefined &&
                    manifest.active_original_revision_id !== expectedRevisionId) {
                    throw new ProjectWorkingVersionError(
                        "active original changed before revision activation",
                    );
                }
                // 新的 original 只是换一张默认值表；已保存的覆盖照旧铺在它上面，
                // 因此这里不需要检查任何「陈旧」或「冲突」。
                const next = normalizeManifest({
                    ...manifest,
                    active_original_revision_id: revisionId,
                }, this.projectId);
                manifests.put(next);
                return cloneJson(next);
            },
        ));
    }

    /**
     * 切换到新的默认值（original revision），顺带一次写入 manifest 补丁、
     * working 覆盖种子与 blob。
     *
     * 这取代了原来的 rebaseAndActivateOriginalRevision：默认值与覆盖层正交，
     * 切换默认值不需要三方合并，也不会产生冲突。
     */
    async activateOriginalRevisionWithState(revisionId, {
        expectedRevisionId,
        manifestPatch = {},
        workingSeeds = [],
        blobs = [],
    } = {}) {
        nonEmptyString(revisionId, "revisionId");
        assertJsonValue(manifestPatch, "$.manifestPatch");
        const seeds = workingSeeds.map(seed => ({
            resource_id: nonEmptyString(seed.resource_id, "workingSeeds[].resource_id"),
            overrides: cloneJson(seed.overrides ?? {}),
        }));
        const preparedBlobs = await Promise.all(blobs.map(blob => prepareBlobRecord(
            this.projectId, blob.blob_id, blob.data, blob.metadata,
        )));
        await this.activateOriginalRevision(revisionId, {expectedRevisionId});
        const manifest = await this.getManifest();
        const next = await this.saveManifest({...manifest, ...manifestPatch}, {
            expectedActiveRevisionId: revisionId,
        });
        if (seeds.length || preparedBlobs.length) {
            await this.withWriterLock(() => transact(
                this.database,
                [PROJECT_OBJECT_STORES.working, PROJECT_OBJECT_STORES.blobs],
                "readwrite",
                async transaction => {
                    const workingStore = transaction.objectStore(
                        PROJECT_OBJECT_STORES.working,
                    );
                    for (const seed of seeds) {
                        const existing = await requestResult(workingStore.get(
                            [this.projectId, seed.resource_id],
                        ));
                        // 已有编辑就不覆盖：种子只是包里带来的初始覆盖。
                        if (existing) continue;
                        workingStore.put({
                            schema: WORKING_ASSET_SCHEMA,
                            project_id: this.projectId,
                            resource_id: seed.resource_id,
                            asset_schema: null,
                            codec: null,
                            version: 0,
                            overrides: seed.overrides,
                        });
                    }
                    const blobStore = transaction.objectStore(
                        PROJECT_OBJECT_STORES.blobs,
                    );
                    for (const record of preparedBlobs) blobStore.put(record);
                },
            ));
        }
        return {status: "updated", manifest: next};
    }

    async addOriginalRevision(revision, assets, {activate = false} = {}) {
        const revisionRecord = normalizeRevision(revision, this.projectId);
        if (!Array.isArray(assets)) throw new TypeError("assets must be an array");
        const assetRecords = assets.map(asset => normalizeOriginalAsset(
            asset,
            this.projectId,
            revisionRecord.revision_id,
        ));
        const ids = new Set();
        for (const asset of assetRecords) {
            if (ids.has(asset.resource_id)) {
                throw new TypeError(`duplicate resource_id: ${asset.resource_id}`);
            }
            ids.add(asset.resource_id);
        }
        const assetCatalog = originalAssetCatalogByResource(revisionRecord);
        if (assetCatalog) {
            for (const asset of assetRecords) {
                assertOriginalAssetDeclared(
                    revisionRecord,
                    assetCatalog,
                    asset,
                );
            }
        }

        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalRevisions,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
            ],
            "readwrite",
            async transaction => {
                const revisions = transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalRevisions,
                );
                const originals = transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                );
                const revisionKey = [this.projectId, revisionRecord.revision_id];
                const existingRevision = await requestResult(revisions.get(revisionKey));
                const existingAssets = await requestResult(originals.index(
                    INDEX_BY_REVISION,
                ).getAll(revisionKey));

                if (existingRevision) {
                    const sameRevision = canonicalJsonEqual(
                        existingRevision,
                        revisionRecord,
                    );
                    const normalizedExisting = [...existingAssets].sort((a, b) =>
                        a.resource_id.localeCompare(b.resource_id));
                    const normalizedIncoming = [...assetRecords].sort((a, b) =>
                        a.resource_id.localeCompare(b.resource_id));
                    const sameAssets = assetCatalog
                        ? normalizedIncoming.every(incoming => {
                            const existing = normalizedExisting.find(candidate =>
                                candidate.resource_id === incoming.resource_id);
                            return existing && canonicalJsonEqual(existing, incoming);
                        })
                        : canonicalJsonEqual(
                            normalizedExisting,
                            normalizedIncoming,
                        );
                    if (!sameRevision || !sameAssets) {
                        throw new ProjectOriginalImmutableError(
                            `original revision ${revisionRecord.revision_id} is immutable`,
                        );
                    }
                } else {
                    revisions.add(revisionRecord);
                    for (const asset of assetRecords) originals.add(asset);
                }

                const manifests = transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests,
                );
                const manifest = await requestResult(manifests.get(this.projectId));
                const revisionIds = new Set(
                    manifest?.original_revision_ids || [],
                );
                revisionIds.add(revisionRecord.revision_id);
                const nextManifest = normalizeManifest({
                    ...(manifest || {}),
                    active_original_revision_id:
                        manifest?.active_original_revision_id ||
                        (activate ? revisionRecord.revision_id : null),
                    original_revision_ids: [...revisionIds],
                }, this.projectId);

                if (activate && manifest?.active_original_revision_id &&
                    manifest.active_original_revision_id !== revisionRecord.revision_id) {
                    const workingCount = await requestResult(transaction.objectStore(
                        PROJECT_OBJECT_STORES.working,
                    ).index(INDEX_BY_PROJECT).count(this.projectId));
                    if (workingCount) {
                        throw new ProjectImportConflictError(
                            "cannot activate a new original while working assets are inconsistent",
                        );
                    }
                    nextManifest.active_original_revision_id = revisionRecord.revision_id;
                }
                manifests.put(nextManifest);
                return {
                    revision: cloneJson(revisionRecord),
                    assets: assetRecords.map(cloneJson),
                    manifest: cloneJson(nextManifest),
                    idempotent: Boolean(existingRevision),
                };
            },
        ));
    }

    async materializeOriginalAssets(revisionId, assets) {
        nonEmptyString(revisionId, "revisionId");
        if (!Array.isArray(assets)) throw new TypeError("assets must be an array");
        const assetRecords = assets.map(asset => normalizeOriginalAsset(
            asset,
            this.projectId,
            revisionId,
        ));
        const resourceIds = new Set();
        for (const asset of assetRecords) {
            if (resourceIds.has(asset.resource_id)) {
                throw new TypeError(`duplicate resource_id: ${asset.resource_id}`);
            }
            resourceIds.add(asset.resource_id);
        }

        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.originalRevisions,
                PROJECT_OBJECT_STORES.originalAssets,
            ],
            "readwrite",
            async transaction => {
                const revisions = transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalRevisions,
                );
                const originals = transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                );
                const revision = await requestResult(revisions.get([
                    this.projectId,
                    revisionId,
                ]));
                if (!revision) {
                    throw new ProjectRecordNotFoundError(
                        `original revision not found: ${revisionId}`,
                    );
                }
                const catalog = originalAssetCatalogByResource(revision);
                const existingRecords = await Promise.all(assetRecords.map(
                    asset => requestResult(originals.get([
                        this.projectId,
                        revisionId,
                        asset.resource_id,
                    ])),
                ));
                const materializedResourceIds = [];

                for (let index = 0; index < assetRecords.length; index += 1) {
                    const asset = assetRecords[index];
                    const existing = existingRecords[index];
                    if (catalog) {
                        assertOriginalAssetDeclared(revision, catalog, asset);
                    } else if (!existing) {
                        throw new ProjectOriginalImmutableError(
                            `${asset.resource_id}: legacy original revision ` +
                            `${revisionId} does not declare lazy assets`,
                        );
                    }
                    if (existing && !canonicalJsonEqual(existing, asset)) {
                        throw new ProjectOriginalImmutableError(
                            `original asset ${asset.resource_id} in revision ` +
                            `${revisionId} is immutable`,
                        );
                    }
                    if (!existing) materializedResourceIds.push(asset.resource_id);
                }

                for (let index = 0; index < assetRecords.length; index += 1) {
                    if (!existingRecords[index]) originals.add(assetRecords[index]);
                }
                return {
                    revision: cloneJson(revision),
                    assets: assetRecords.map(cloneJson),
                    materialized_resource_ids: materializedResourceIds,
                    idempotent: materializedResourceIds.length === 0,
                };
            },
        ));
    }

    async refreshPackageOriginal(revisionId, asset, options) {
        return this.refreshPackageOriginals(revisionId, [asset], options);
    }

    async refreshPackageOriginals(revisionId, assets, {
        requireActive = true, onProgress = () => {},
    } = {}) {
        const records = assets.map(asset => normalizeOriginalAsset(asset, this.projectId, revisionId));
        let observedStamp;
        const refresh = mode => {
            let changed = false;
            return transact(this.database, [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalRevisions,
                PROJECT_OBJECT_STORES.originalAssets,
            ], mode, async transaction => {
                const [stampRecord, manifest, revision] = await Promise.all([
                    requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.manifests)
                        .get(BUILD_INPUT_STAMP_ID)),
                    requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.manifests)
                        .get(this.projectId)),
                    requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.originalRevisions)
                        .get([this.projectId, revisionId])),
                ]);
                observedStamp = stampRecord?.stamp ?? null;
                if (requireActive && activeRevisionId(manifest) !== revisionId) {
                    throw new ProjectWorkingVersionError("字段默认来源已改变；拒绝旧缓存刷新");
                }
                if (!revision) throw new ProjectRecordNotFoundError(`original revision not found: ${revisionId}`);
                const catalog = originalAssetCatalogByResource(revision);
                if (!catalog) throw new ProjectOriginalImmutableError(`${revisionId}: 缺少已发布资源清单`);
                for (const record of records) assertOriginalAssetDeclared(revision, catalog, record);
                const originals = transaction.objectStore(PROJECT_OBJECT_STORES.originalAssets);
                const existing = await Promise.all(records.map(record => requestResult(
                    originals.get([this.projectId, revisionId, record.resource_id]))));
                for (const [index, record] of records.entries()) {
                    if (!existing[index] || !validatedJsonEqual(existing[index], record)) {
                        if (mode === "readwrite") originals.put(record);
                        changed = true;
                    }
                    onProgress({message: `写入默认值 ${record.resource_id}`,
                        progress_current: index + 1, progress_total: records.length});
                }
                if (!changed || mode === "readonly") return changed;
                const manifests = transaction.objectStore(PROJECT_OBJECT_STORES.manifests);
                manifests.put({...manifest, browser_bootstrap_digest: null});
                return true;
            }, changed => mode === "readwrite" && changed, true, committedStamp => {
                if (mode === "readonly" && changed) return;
                // 已校验的发布正文只在事务提交后成为只读 Origin 快照。
                const stamp = committedStamp ?? observedStamp;
                if (this.originalSnapshots.stamp === observedStamp) this.originalSnapshots.stamp = stamp;
                else this.originalSnapshots = {stamp, records: new Map()};
                for (const record of records) this.originalSnapshots.records.set(
                    JSON.stringify([revisionId, record.resource_id]), freezeOriginal(record));
            });
        };
        if (!await refresh("readonly")) return false;
        return this.withWriterLock(() => refresh("readwrite"));
    }

    /** Read only the key count; existence checks must not deserialize an asset. */
    async hasOriginal(resourceId, {revisionId = null} = {}) {
        nonEmptyString(resourceId, "resourceId");
        return transact(this.database, [
            PROJECT_OBJECT_STORES.manifests,
            PROJECT_OBJECT_STORES.originalAssets,
        ], "readonly", async transaction => {
            let selectedRevision = revisionId;
            if (!selectedRevision) {
                selectedRevision = await readActiveRevisionId(transaction, this.projectId);
            }
            return (await requestResult(transaction.objectStore(
                PROJECT_OBJECT_STORES.originalAssets,
            ).count([this.projectId, selectedRevision, resourceId]))) > 0;
        });
    }

    /** 当前激活的 Original revision；只读清单索引键。 */
    async activeOriginalRevisionId() {
        return transact(this.database, [PROJECT_OBJECT_STORES.manifests],
            "readonly", transaction => readActiveRevisionId(transaction, this.projectId));
    }

    async getOriginal(resourceId, {revisionId = null, snapshot = false} = {}) {
        nonEmptyString(resourceId, "resourceId");
        return transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
            ],
            "readonly",
            async transaction => {
                let selectedRevision = revisionId;
                if (!selectedRevision) {
                    selectedRevision = await readActiveRevisionId(transaction, this.projectId);
                }
                const originals = snapshot ? await this.originalSnapshotRecords(transaction) : undefined;
                return readOriginalSnapshot(transaction, this.projectId, selectedRevision, resourceId, originals);
            },
        );
    }

    async getFieldState(resourceId, {includeOriginal = false, includeDependencies = false} = {}) {
        return transact(this.database, fieldStores(), "readonly", async transaction => {
            const originals = await this.originalSnapshotRecords(transaction);
            const {original, dependencies, ...snapshot} = await readFieldSnapshot(transaction, this.projectId, resourceId, {originals});
            return {...snapshot, revisionId: original.revision_id, ...(includeOriginal ? {original} : {}),
                ...(includeDependencies ? {dependencies} : {})};
        });
    }

    async writeFieldValue(resourceId, entityHandle, fieldName, value, {expectedVersion, expectedRevisionId, reset = false, selection} = {}) {
        return this.writeFieldValues(resourceId, [{entityHandle, fieldName, value, reset, selection}], {expectedVersion, expectedRevisionId});
    }

    /** One complete candidate, one transaction and one version for a linked edit. */
    async writeFieldValues(resourceId, changes, {expectedVersion, expectedRevisionId, storyPage} = {}) {
        requireFieldOwner(resourceId);
        if (!Array.isArray(changes) || !changes.length) throw new TypeError("字段批次不能为空");
        const captured = changes.map(({entityHandle, fieldName, value, reset = false, selection = null}) => {
            nonEmptyString(entityHandle, "entityHandle");
            nonEmptyString(fieldName, "fieldName");
            if (typeof reset !== "boolean") throw new TypeError("字段 reset 必须为布尔值");
            if (!reset) assertJsonValue(value);
            return {entityHandle, fieldName, reset, selection: cloneJson(selection), value: reset ? undefined : cloneJson(value)};
        });
        return this.withWriterLock(() => transact(this.database, fieldStores(), "readwrite", async transaction => {
            if (storyPage && isStoryScriptResource(resourceId)) {
                const page = await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                    .get([this.projectId, storyPageWorkingKey(storyPage)]));
                if (page) validateStoryPageWorking(page);
            }
            const snapshot = await readFieldSnapshot(transaction, this.projectId, resourceId);
            if (snapshot.original.revision_id !== expectedRevisionId) throw new ProjectWorkingVersionError("字段默认来源已改变；拒绝旧自动保存");
            const descriptions = new Map(fieldOwner(resourceId).describe(fieldDocument(snapshot.original.value, resourceId), {asset: snapshot.original.value})
                .map(field => [JSON.stringify([field.entityHandle, field.fieldName]), field]));
            const seen = new Set();
            const writes = captured.map(({entityHandle, fieldName, value, reset, selection}) => {
                const identity = JSON.stringify([entityHandle, fieldName]), field = descriptions.get(identity);
                if (!field || seen.has(identity)) throw new TypeError("未知或重复字段身份");
                seen.add(identity);
                if (selection !== null && field.workingFormat !== SPARSE_ARRAY_FORMAT)
                    throw new TypeError("该字段不支持选区写入");
                let remove;
                if (field.workingFormat === SPARSE_ARRAY_FORMAT) {
                    const previous = snapshot.overrides.find(row => row.entity_handle === entityHandle
                        && row.field_name === fieldName)?.value;
                    value = changeArrayFieldWorking(field, previous, {value, reset, selection});
                    remove = value === undefined;
                } else remove = reset || canonicalJsonEqual(value, field.defaultValue);
                const record = {project_id: this.projectId, resource_id: resourceId,
                    entity_handle: entityHandle, field_name: fieldName, value: remove ? null : value};
                return {field, remove, record};
            });
            const overrides = snapshot.overrides.filter(entry => !seen.has(JSON.stringify([entry.entity_handle, entry.field_name])));
            for (const {remove, record} of writes) if (!remove) overrides.push(record);
            fieldOwner(resourceId).validate(snapshot.original.value, overrides, snapshot.dependencies);
            assertApplicationAllocationChange(resourceId, snapshot, overrides);
            const meta = {...(snapshot.meta || {project_id: this.projectId, resource_id: resourceId,
                format: FIELD_FORMAT, epoch: crypto.randomUUID(), version: 0}),
                revision_id: snapshot.original.revision_id, version: (snapshot.meta?.version || 0) + 1};
            if (!Number.isSafeInteger(meta.version)) throw new TypeError("字段版本溢出");
            const store = transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking);
            if (storyPage && isStoryScriptResource(resourceId)) {
                const pages = updateStoryPageWorking(snapshot.original.value, snapshot.storyPages, writes, storyPage, this.projectId);
                const pageStore = transaction.objectStore(PROJECT_OBJECT_STORES.working);
                for (const previous of snapshot.storyPages) if (!pages.some(row => row.resource_id === previous.resource_id))
                    pageStore.delete([this.projectId, previous.resource_id]);
                for (const row of pages) {
                    const previous = snapshot.storyPages.find(before => before.resource_id === row.resource_id);
                    if (!previous || !canonicalJsonEqual(row.overrides, previous.overrides)) {row.version += 1; pageStore.put(row);}
                }
                for (const {field} of writes) store.delete([this.projectId, resourceId, field.entityHandle, field.fieldName]);
            } else {
                if (isStoryScriptResource(resourceId) && Object.keys(snapshot.storyOwners).length)
                    throw new TypeError("脚本由剧情页改动，请在归属剧情页编辑");
                for (const {field, remove, record} of writes) {
                    const key = [this.projectId, resourceId, field.entityHandle, field.fieldName];
                    if (remove) store.delete(key); else store.put(record);
                }
            }
            transaction.objectStore(PROJECT_OBJECT_STORES.fieldState).put(meta);
            if (storyPage && isStoryScriptResource(resourceId)) {
                const {original, ...current} = await readFieldSnapshot(transaction, this.projectId, resourceId);
                return {...current, revisionId: original.revision_id};
            }
            return {meta, overrides, version: fieldVersion(meta), revisionId: snapshot.original.revision_id};
        }, true, false));
    }

    /** Explicitly abandon obsolete edits. Never a conversion or a read-time fallback. */
    async discardFieldWorking(resourceId) {
        return this.withWriterLock(() => transact(this.database, fieldStores(), "readwrite", async transaction => {
            const snapshot = await readFieldSnapshot(transaction, this.projectId, resourceId, {discard: true});
            assertApplicationAllocationChange(resourceId, snapshot, []);
            const meta = {project_id: this.projectId, resource_id: resourceId, format: FIELD_FORMAT,
                epoch: crypto.randomUUID(), version: 0, revision_id: snapshot.original.revision_id};
            await deleteIndexRecords(transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking)
                .index(INDEX_BY_RESOURCE), [this.projectId, resourceId]);
            transaction.objectStore(PROJECT_OBJECT_STORES.working).delete([this.projectId, resourceId]);
            if (isStoryScriptResource(resourceId)) await this.clearStoryPageEdits(transaction, row => row.resource_id === resourceId);
            transaction.objectStore(PROJECT_OBJECT_STORES.fieldState).put(meta);
            return {meta, overrides: [], version: fieldVersion(meta), revisionId: snapshot.original.revision_id};
        }, true, false));
    }

    async getWorking(resourceId) {
        nonEmptyString(resourceId, "resourceId");
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.working],
            "readonly",
            async transaction => {
                const record = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                ).get([this.projectId, resourceId]));
                return record ? cloneJson(normalizeWorkingRecord(record)) : null;
            },
        );
    }

    async listWorking() {
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.working],
            "readonly",
            async transaction => {
                const records = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                ).index(INDEX_BY_PROJECT).getAll(this.projectId));
                return records.filter(record => !isStoryPageWorking(record) && !isInterfaceStateDocumentRecord(record))
                    .map(record => cloneJson(normalizeWorkingRecord(record)));
            },
        );
    }

    /** Discover sparse owners without copying their field values into a list. */
    async listFieldWorkingResourceIds() {
        return transact(this.database, [PROJECT_OBJECT_STORES.fieldWorking, PROJECT_OBJECT_STORES.working], "readonly", async transaction => {
            const keys = await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking)
                .index(INDEX_BY_PROJECT).getAllKeys(this.projectId));
            const pages = (await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                .index(INDEX_BY_PROJECT).getAll(this.projectId))).filter(isStoryPageWorking);
            return [...new Set([...keys.map(key => key[1]), ...usableStoryPageWorking(pages).flatMap(page =>
                page.overrides.edits.map(edit => edit.resource_id).filter(isStoryScriptResource))])].sort();
        });
    }

    async listStoryPageWorking() {
        return transact(this.database, [PROJECT_OBJECT_STORES.working], "readonly", async transaction =>
            (await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                .index(INDEX_BY_PROJECT).getAll(this.projectId))).filter(isStoryPageWorking));
    }

    async listInterfaceStateDocuments() {
        return transact(this.database, [PROJECT_OBJECT_STORES.working], 'readonly', async transaction =>
            (await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                .index(INDEX_BY_PROJECT).getAll(this.projectId))).filter(isInterfaceStateDocumentRecord));
    }

    async readInterfaceStateDocument(id) {
        return transact(this.database, [PROJECT_OBJECT_STORES.working], 'readonly', transaction =>
            requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                .get([this.projectId, interfaceStateDocumentKey(id)])));
    }

    async updateInterfaceStateDocument(id, change) {
        nonEmptyString(id, 'interfaceStateDocument');
        const previous = await this.readInterfaceStateDocument(id);
        const allocated = previous?.overrides.document;
        const assignment = allocated?.program && allocated.source?.entry.commandId >= 0x39 ? {
            program: allocated.program.id, source: allocated.source.id, domain: allocated.source.domain,
            command: allocated.source.entry.commandId, page: allocated.source.entry.pageId,
            sequence: allocated.source.entry.sequenceId,
        } : null;
        const document = validateInterfaceStateDocument(await change(previous?.overrides.document ?? null));
        if (assignment && (document.program?.id !== assignment.program || document.source?.id !== assignment.source
                || document.source?.domain !== assignment.domain
                || document.source?.entry.commandId !== assignment.command
                || document.source?.entry.pageId !== assignment.page
                || document.source?.entry.sequenceId !== assignment.sequence))
            throw new TypeError('已创建的扩展文档只能修改原程序');
        return this.withWriterLock(async () => {
            const current = await this.readInterfaceStateDocument(id);
            if (current?.version !== previous?.version)
                throw new ProjectWorkingVersionError('状态机文档已更新；拒绝旧文档覆盖');
            const record = {project_id: this.projectId, resource_id: interfaceStateDocumentKey(id),
                schema: WORKING_ASSET_SCHEMA, asset_schema: INTERFACE_STATE_DOCUMENT_SCHEMA,
                codec: null, version: (previous?.version ?? -1) + 1, overrides: {document}};
            await transact(this.database, [PROJECT_OBJECT_STORES.working], 'readwrite', transaction =>
                requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working).put(record)), false);
            return document;
        });
    }

    async readStoryPageDocument(page) {
        return transact(this.database, [PROJECT_OBJECT_STORES.working], 'readonly', transaction =>
            requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                .get([this.projectId, storyPageWorkingKey(page)])));
    }

    async updateStoryPageDocument(page, change) {
        nonEmptyString(page, 'storyPage');
        return this.withWriterLock(async () => {
            const previous = await this.readStoryPageDocument(page);
            const document = validateStoryPageJson(await change(previous));
            const record = {project_id: this.projectId, resource_id: storyPageWorkingKey(page),
                schema: 'metalmaxcn.working-asset', asset_schema: 'metalmaxcn.story-page-working',
                codec: null, version: (previous?.version ?? -1) + 1,
                overrides: {edits: [], document,
                    ...(previous?.overrides.rom_entries ? {rom_entries: previous.overrides.rom_entries} : {})}};
            validateStoryPageWorking(record);
            await transact(this.database, [PROJECT_OBJECT_STORES.working], 'readwrite', transaction =>
                requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working).put(record)));
            return record;
        }, true, false);
    }

    async assertStoryPageWorking(page = null) {
        for (const record of await this.listStoryPageWorking()) {
            if (!isStoryPageDocument(record) && !usableStoryPageWorking([record]).length) continue;
            if (page === null || record.resource_id === storyPageWorkingKey(page)) validateStoryPageWorking(record);
        }
    }

    async allocateApplicationProgram(program, requestedCommand = null, stateDocument = null) {
        return this.withWriterLock(() => transact(this.database, fieldStores(), 'readwrite', async transaction => {
            const ids = ['application-program', ...EXTENDED_APPLICATION_COMMANDS.map(applicationCommandId)];
            const snapshots = await Promise.all(ids.map(id => readFieldSnapshot(transaction, this.projectId, id)));
            const documents = snapshots.map((snapshot, index) => {
                const document = cloneJson(snapshot.original.value.document);
                const descriptions = fieldOwner(ids[index]).describe(document, {asset: snapshot.original.value});
                for (const override of snapshot.overrides) {
                    const field = descriptions.find(field => field.entityHandle === override.entity_handle
                        && field.fieldName === override.field_name);
                    const parent = field.documentPath.slice(0, -1).reduce((value, key) => value[key], document);
                    parent[field.documentPath.at(-1)] = cloneJson(override.value);
                }
                return document;
            });
            let documentRecord;
            if (stateDocument) {
                documentRecord = await requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working)
                    .get([this.projectId, interfaceStateDocumentKey(stateDocument.id)]));
                if (documentRecord && !canonicalJsonEqual(documentRecord.overrides.document, stateDocument.document))
                    throw new ProjectWorkingVersionError('状态机文档已更新；拒绝旧文档分配');
                if (stateDocument.document.source?.entry.commandId >= 0x39)
                    throw new TypeError('已创建的扩展文档只能修改原程序');
            }
            const allocation = allocateExtendedApplicationProgram(documents[0], documents.slice(1), program, requestedCommand);
            for (const [index, handle, name, value] of [[0, documents[0].id, 'independent_programs',
                [...documents[0].independent_programs, allocation.program]],
            [allocation.command - 0x39 + 1, applicationCommandId(allocation.command), 'program_reference', allocation.program.id]]) {
                const snapshot = snapshots[index], id = ids[index];
                const record = {project_id: this.projectId, resource_id: id, entity_handle: handle, field_name: name, value};
                const overrides = [...snapshot.overrides.filter(row => row.entity_handle !== handle || row.field_name !== name), record];
                fieldOwner(id).validate(snapshot.original.value, overrides, snapshot.dependencies);
                transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking).put(record);
                transaction.objectStore(PROJECT_OBJECT_STORES.fieldState).put({...(snapshot.meta || {
                    project_id: this.projectId, resource_id: id, format: FIELD_FORMAT, epoch: crypto.randomUUID()}),
                    revision_id: snapshot.original.revision_id, version: (snapshot.meta?.version || 0) + 1});
            }
            if (stateDocument) {
                const document = validateInterfaceStateDocument({...stateDocument.document, program: allocation.program,
                    source: {id: `application:${allocation.command.toString(16).toUpperCase()}`, domain: 'shop',
                        entry: {pageId: null, commandId: allocation.command, sequenceId: null}}});
                transaction.objectStore(PROJECT_OBJECT_STORES.working).put({project_id: this.projectId,
                    resource_id: interfaceStateDocumentKey(stateDocument.id), schema: WORKING_ASSET_SCHEMA,
                    asset_schema: INTERFACE_STATE_DOCUMENT_SCHEMA, codec: null,
                    version: (documentRecord?.version ?? -1) + 1, overrides: {document}});
            }
            return {command: applicationCommandId(allocation.command), program: allocation.program.id};
        }, true, false));
    }

    async allocateStoryPageRomEntries(page, serializeProgram) {
        return this.withWriterLock(async () => {
            assertStoryPageEntryRom(await this.getManifest());
            const records = await this.listStoryPageWorking();
            const record = records.find(row => row.resource_id === storyPageWorkingKey(page));
            if (!record?.overrides.document) throw new TypeError('剧情页不存在');
            const entries = allocateStoryPageEntries(page, record.overrides.document, records, serializeProgram);
            const next = {...record, version: record.version + 1,
                overrides: {edits: [], document: record.overrides.document, rom_entries: entries}};
            await transact(this.database, [PROJECT_OBJECT_STORES.working], 'readwrite', transaction =>
                requestResult(transaction.objectStore(PROJECT_OBJECT_STORES.working).put(next)));
            return next;
        }, true, false);
    }

    async clearStoryPageEdits(transaction, matches, page = null) {
        const store = transaction.objectStore(PROJECT_OBJECT_STORES.working);
        const pages = (await requestResult(store.index(INDEX_BY_PROJECT).getAll(this.projectId))).filter(isStoryPageWorking);
        const changed = new Set();
        for (const row of pages) {
            if (page && row.resource_id !== storyPageWorkingKey(page)) continue;
            if (page) {
                for (const id of ["story-autonomous-script", "story-interaction-script"]) changed.add(id);
                store.delete([this.projectId, row.resource_id]);
                continue;
            }
            const edits = row.overrides.edits.filter(edit => {
                if (!matches(edit)) return true;
                changed.add(edit.resource_id);
                return false;
            });
            if (edits.length === row.overrides.edits.length) continue;
            if (edits.length) store.put({...row, version: row.version + 1, overrides: {...row.overrides, edits}});
            else store.delete([this.projectId, row.resource_id]);
        }
        return [...changed];
    }

    async resetStoryPageWorking(page) {
        return this.withWriterLock(() => transact(this.database, fieldStores(), "readwrite", async transaction => {
            const changed = await this.clearStoryPageEdits(transaction, () => true, page);
            const store = transaction.objectStore(PROJECT_OBJECT_STORES.fieldState);
            for (const resourceId of changed) {
                const previous = await requestResult(store.get([this.projectId, resourceId]));
                store.put({...previous, project_id: this.projectId, resource_id: resourceId,
                    format: FIELD_FORMAT, epoch: crypto.randomUUID(), version: 0});
            }
            return changed;
        }, true, false));
    }

    /** Delete only resource IDs that still have no current Original or field owner. */
    async discardInvalidWorking(resourceIds) {
        if (!Array.isArray(resourceIds)) throw new TypeError("resourceIds must be an array");
        const ids = [...new Set(resourceIds.map(id => nonEmptyString(id, "resourceId")))];
        return this.withWriterLock(() => transact(this.database, fieldStores(), "readwrite", async transaction => {
            const revisionId = await readActiveRevisionId(transaction, this.projectId);
            const originals = transaction.objectStore(PROJECT_OBJECT_STORES.originalAssets);
            const working = transaction.objectStore(PROJECT_OBJECT_STORES.working);
            const fieldWorking = transaction.objectStore(PROJECT_OBJECT_STORES.fieldWorking);
            const fieldState = transaction.objectStore(PROJECT_OBJECT_STORES.fieldState);
            const deleted = [];
            for (const resourceId of ids) {
                if (resourceId === "save-current" || hasFieldOwner(resourceId) ||
                    await requestResult(originals.count([this.projectId, revisionId, resourceId]))) continue;
                working.delete([this.projectId, resourceId]);
                await deleteIndexRecords(fieldWorking.index(INDEX_BY_RESOURCE), [this.projectId, resourceId]);
                fieldState.delete([this.projectId, resourceId]);
                deleted.push(resourceId);
            }
            return deleted;
        }));
    }

    // The current battery save has a generated ROM-initial default, rather
    // than a static package Original. It uses the same sparse Working store,
    // diff/apply rules, project lock and export.
    async resolveSaveCurrent(originalValue) {
        assertJsonValue(originalValue);
        const original = saveCurrentOriginal(originalValue);
        const working = await this.getWorking(original.resource_id);
        return working ? resolvedWorking(working, original) : resolvedOriginal(original);
    }

    async saveSaveCurrent(originalValue, value, {previousValue, applyChanges} = {}) {
        assertJsonValue(originalValue);
        assertJsonValue(value);
        return this.withWriterLock(() => transact(this.database,
            [PROJECT_OBJECT_STORES.working], "readwrite", async transaction => {
                const store = transaction.objectStore(PROJECT_OBJECT_STORES.working);
                const original = saveCurrentOriginal(originalValue);
                let record = await requestResult(store.get([this.projectId, original.resource_id]));
                const current = record ? resolvedWorking(record, original).value : originalValue;
                if (previousValue !== undefined) value = applyChanges
                    ? applyChanges(current, previousValue, value) : applyJsonChanges(current, previousValue, value);
                record ||= newWorkingRecord(this.projectId, original);
                const overrides = diffJson(originalValue, value);
                record.overrides = overrides === MISSING ? {} : overrides;
                record.original_source = "runtime";
                record.version += 1;
                store.put(record);
                return resolvedWorking(record, original);
            }, true, false));
    }

    async materialize(resourceId) {
        nonEmptyString(resourceId, "resourceId");
        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readwrite",
            async transaction => {
                await assertLegacyResource(transaction, this.projectId, resourceId);
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const workingStore = transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                );
                const key = [this.projectId, resourceId];
                const existing = await requestResult(workingStore.get(key));
                if (existing) {
                    normalizeWorkingRecord(existing);
                    return cloneJson(existing);
                }
                const original = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                ).get([this.projectId, revisionId, resourceId]));
                if (!original) {
                    throw new ProjectRecordNotFoundError(
                        `${resourceId}: original asset not found in ${revisionId}`,
                    );
                }
                const working = newWorkingRecord(this.projectId, original);
                workingStore.add(working);
                return cloneJson(working);
            },
        ));
    }

    async resolve(resourceId, {materialize = true} = {}) {
        nonEmptyString(resourceId, "resourceId");
        if (materialize) await this.materialize(resourceId);
        let originalSnapshot;
        const resolved = await transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readonly",
            async transaction => {
                await assertLegacyResource(transaction, this.projectId, resourceId);
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const working = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                ).get([this.projectId, resourceId]));
                const original = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                ).get([this.projectId, revisionId, resourceId]));
                if (!original) {
                    throw new ProjectRecordNotFoundError(
                        `${resourceId}: original asset not found in ${revisionId}`,
                    );
                }
                originalSnapshot = original;
                if (working) {
                    normalizeWorkingRecord(working);
                    return resolvedWorking(working, original);
                }
                return resolvedOriginal(original);
            },
        );
        if (migrateLegacyOpaqueEditPolicies(originalSnapshot.value, resolved.value) === null) {
            return resolved;
        }
        if (!this.editPolicyMigrations.has(resourceId)) {
            // Only a legacy Working needs the browser's migration boundary.
            // Pass storage snapshots, never a pre-edited value or callback.
            const pending = import("./project-data.js").then(
                ({migrateLegacyProjectAssetEditPolicies}) =>
                    migrateLegacyProjectAssetEditPolicies(this, resourceId, {
                        original: originalSnapshot,
                        working: resolved,
                    }),
            ).finally(() => this.editPolicyMigrations.delete(resourceId));
            this.editPolicyMigrations.set(resourceId, pending);
        }
        return this.editPolicyMigrations.get(resourceId);
    }

    async saveValue(resourceId, value, {previousValue} = {}) {
        return (await this.saveValues([{resourceId, value, previousValue}]))[0];
    }

    // 关联字段对象在同一事务中提交。
    async saveValues(entries) {
        if (!Array.isArray(entries) || !entries.length
            || new Set(entries.map(entry => entry.resourceId)).size !== entries.length) {
            throw new TypeError("saveValues requires distinct resource IDs");
        }
        for (const {resourceId, value} of entries) {
            nonEmptyString(resourceId, "resourceId");
            assertJsonValue(value, "$.value");
        }
        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readwrite",
            async transaction => {
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const workingStore = transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                );
                const results = [];
                for (const {resourceId, value, previousValue} of entries) {
                    await assertLegacyResource(transaction, this.projectId, resourceId);
                    let working = await requestResult(workingStore.get(
                        [this.projectId, resourceId],
                    ));
                    const original = await requestResult(transaction.objectStore(
                        PROJECT_OBJECT_STORES.originalAssets,
                    ).get([this.projectId, revisionId, resourceId]));
                    if (!original) {
                        throw new ProjectRecordNotFoundError(
                            `${resourceId}: original asset not found in ${revisionId}`,
                        );
                    }
                    if (working) normalizeWorkingRecord(working);
                    const current = working ? resolvedWorking(working, original).value : original.value;
                    const next = previousValue === undefined ? value : applyJsonChanges(current, previousValue, value);
                    if (!working) working = newWorkingRecord(this.projectId, original);
                    // 只留下与当前默认值不同的分支：没改过的字段以后自动跟随新默认值。
                    const overrides = diffJson(original.value, next);
                    working.overrides = overrides === MISSING ? {} : overrides;
                    working.version += 1;
                    workingStore.put(working);
                    results.push(resolvedWorking(working, original));
                }
                return results;
            },
        ));
    }

    async reset(resourceId) {
        nonEmptyString(resourceId, "resourceId");
        if (resourceId === "save-current") {
            return this.withWriterLock(() => transact(this.database,
                [PROJECT_OBJECT_STORES.working], "readwrite", async transaction => {
                    const store = transaction.objectStore(PROJECT_OBJECT_STORES.working);
                    const record = await requestResult(store.get([this.projectId, resourceId]))
                        || newWorkingRecord(this.projectId, saveCurrentOriginal(null));
                    record.overrides = {};
                    record.original_source = "runtime";
                    record.version += 1;
                    store.put(record);
                    return {resource_id: resourceId, layer: "original", dirty: false};
                }));
        }
        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readwrite",
            async transaction => {
                await assertLegacyResource(transaction, this.projectId, resourceId);
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const original = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                ).get([this.projectId, revisionId, resourceId]));
                if (!original) {
                    throw new ProjectRecordNotFoundError(
                        `${resourceId}: original asset not found in ${revisionId}`,
                    );
                }
                transaction.objectStore(PROJECT_OBJECT_STORES.working).delete(
                    [this.projectId, resourceId],
                );
                return resolvedOriginal(original);
            },
        ));
    }

    /** Restore several paths/keyed items to the current defaults in one go. */
    async resetSelections(resourceId, selectors, {expectedVersion} = {}) {
        nonEmptyString(resourceId, "resourceId");
        return this.withWriterLock(() => transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readwrite",
            async transaction => {
                await assertLegacyResource(transaction, this.projectId, resourceId);
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const workingStore = transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                );
                const key = [this.projectId, resourceId];
                const working = await requestResult(workingStore.get(key));
                if (!working) {
                    const original = await requestResult(transaction.objectStore(
                        PROJECT_OBJECT_STORES.originalAssets,
                    ).get([this.projectId, revisionId, resourceId]));
                    if (!original) {
                        throw new ProjectRecordNotFoundError(
                            `${resourceId}: original asset not found in ${revisionId}`,
                        );
                    }
                    // Validate selectors even for a clean original so a stale
                    // UI identity cannot be reported as a successful reset.
                    resetJsonSelections(
                        original.value,
                        original.value,
                        selectors,
                    );
                    return {...resolvedOriginal(original), changed: false};
                }
                normalizeWorkingRecord(working);
                const current = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                ).get([this.projectId, revisionId, resourceId]));
                if (!current) {
                    throw new ProjectRecordNotFoundError(
                        `${resourceId}: original asset not found in ${revisionId}`,
                    );
                }
                // 「恢复 Original」的基准永远是当前默认值，不是物化时的快照。
                const reset = resetJsonSelections(
                    current.value,
                    applyOverrides(current.value, working.overrides),
                    selectors,
                );
                if (!reset.changed) {
                    return {...resolvedWorking(working, current), changed: false};
                }
                const overrides = reset.overrides;
                working.overrides = overrides === MISSING ? {} : overrides;
                working.version += 1;
                workingStore.put(working);
                return {...resolvedWorking(working, current), changed: true};
            },
        ));
    }

    async resetItem(resourceId, selector, options) {
        return this.resetSelections(resourceId, [{
            ...selector,
            kind: "item",
        }], options);
    }

    async resetPaths(resourceId, paths, options) {
        if (!Array.isArray(paths) || !paths.length) {
            throw new TypeError("paths must be a non-empty array");
        }
        return this.resetSelections(resourceId, paths.map(path => ({
            kind: "path",
            path,
        })), options);
    }

    /** Evaluate many row/button dirty states after one IndexedDB read. */
    async selectionStates(resourceId, groups) {
        nonEmptyString(resourceId, "resourceId");
        if (!Array.isArray(groups) || !groups.length) {
            throw new TypeError("groups must be a non-empty array");
        }
        return transact(
            this.database,
            [
                PROJECT_OBJECT_STORES.manifests,
                PROJECT_OBJECT_STORES.originalAssets,
                PROJECT_OBJECT_STORES.working,
                PROJECT_OBJECT_STORES.fieldState,
            ],
            "readonly",
            async transaction => {
                await assertLegacyResource(transaction, this.projectId, resourceId);
                const revisionId = await readActiveRevisionId(transaction, this.projectId);
                const working = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.working,
                ).get([this.projectId, resourceId]));
                const original = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.originalAssets,
                ).get([this.projectId, revisionId, resourceId]));
                if (!original) {
                    throw new ProjectRecordNotFoundError(
                        `${resourceId}: original asset not found in ${revisionId}`,
                    );
                }
                const base = original.value;
                let value = original.value;
                let layer = "original";
                let version = null;
                let dirty = false;
                if (working) {
                    normalizeWorkingRecord(working);
                    value = applyOverrides(original.value, working.overrides);
                    layer = "working";
                    version = working.version;
                    dirty = isWorkingDirty(working);
                }
                const keys = [];
                const selectorGroups = [];
                const seenKeys = new Set();
                for (const [index, group] of groups.entries()) {
                    if (!isPlainJsonObject(group)) {
                        throw new TypeError(`groups/${index}: group must be an object`);
                    }
                    const key = nonEmptyString(group.key, `groups/${index}.key`);
                    if (seenKeys.has(key)) {
                        throw new TypeError(`groups/${index}: duplicate key ${key}`);
                    }
                    seenKeys.add(key);
                    keys.push(key);
                    selectorGroups.push(group.selectors);
                }
                const values = jsonSelectionStates(base, value, selectorGroups);
                const states = Object.create(null);
                keys.forEach((key, index) => { states[key] = values[index]; });
                return {
                    resource_id: resourceId,
                    layer,
                    version,
                    dirty,
                    states,
                };
            },
        );
    }

    async selectionsDirty(resourceId, selectors) {
        const result = await this.selectionStates(resourceId, [{
            key: "selection",
            selectors,
        }]);
        return result.states.selection;
    }

    async dirty(resourceId) {
        const working = await this.getWorking(resourceId);
        return working ? isWorkingDirty(working) : false;
    }

    async putBlob(blobId, data, metadata = {}, {overwrite = true} = {}) {
        const record = await prepareBlobRecord(
            this.projectId,
            blobId,
            data,
            metadata,
        );
        return this.withWriterLock(() => transact(
            this.database,
            [PROJECT_OBJECT_STORES.blobs],
            "readwrite",
            async transaction => {
                const store = transaction.objectStore(PROJECT_OBJECT_STORES.blobs);
                await requestResult(overwrite ? store.put(record) : store.add(record));
                return blobRecordCopy(record);
            },
            !(blobId.startsWith("rom-build:") && metadata.kind === "rom-build" ||
                blobId.startsWith("save-build:") && metadata.kind === "save-build" ||
                blobId.startsWith("preview:") && metadata.kind === "preview"),
        ));
    }

    async getBlob(blobId) {
        nonEmptyString(blobId, "blobId");
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.blobs],
            "readonly",
            async transaction => {
                const record = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.blobs,
                ).get([this.projectId, blobId]));
                return record ? blobRecordCopy(record) : null;
            },
        );
    }

    async listBlobs(prefix = "") {
        return transact(this.database, [PROJECT_OBJECT_STORES.blobs], "readonly",
            async transaction => {
                const records = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.blobs).index(INDEX_BY_PROJECT).getAll(this.projectId));
                return records.filter(record => record.blob_id.startsWith(prefix)).map(blobRecordCopy);
            });
    }

    async deleteBlob(blobId) {
        nonEmptyString(blobId, "blobId");
        return this.withWriterLock(() => transact(
            this.database,
            [PROJECT_OBJECT_STORES.blobs],
            "readwrite",
            async transaction => {
                const store = transaction.objectStore(PROJECT_OBJECT_STORES.blobs);
                const key = [this.projectId, blobId];
                if (!await requestResult(store.getKey(key))) return false;
                store.delete(key);
                return true;
            },
        ));
    }

    async putBuildReport(buildId, report, {
        createdAt = new Date().toISOString(),
    } = {}) {
        nonEmptyString(buildId, "buildId");
        assertJsonValue(report, "$.report");
        const record = normalizeBuildReportRecord({
            schema: BUILD_REPORT_RECORD_SCHEMA,
            project_id: this.projectId,
            build_id: buildId,
            created_at: createdAt,
            report: cloneJson(report),
        }, this.projectId);
        return this.withWriterLock(() => transact(
            this.database,
            [PROJECT_OBJECT_STORES.buildReports],
            "readwrite",
            async transaction => {
                transaction.objectStore(
                    PROJECT_OBJECT_STORES.buildReports,
                ).put(record);
                return cloneJson(record);
            },
        ));
    }

    async getBuildReport(buildId) {
        nonEmptyString(buildId, "buildId");
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.buildReports],
            "readonly",
            async transaction => {
                const record = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.buildReports,
                ).get([this.projectId, buildId]));
                return record
                    ? normalizeBuildReportRecord(record, this.projectId) : null;
            },
        );
    }

    async listBuildReports() {
        return transact(
            this.database,
            [PROJECT_OBJECT_STORES.buildReports],
            "readonly",
            async transaction => {
                const records = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.buildReports,
                ).index(INDEX_BY_PROJECT).getAll(this.projectId));
                return records.map(record =>
                    normalizeBuildReportRecord(record, this.projectId));
            },
        );
    }

    async exportProject({
        includeBlobs = true,
        includeBuildReports = true,
        format = "blob",
    } = {}) {
        const records = await transact(
            this.database,
            allStoreNames(),
            "readonly",
            async transaction => {
                const manifest = await requestResult(transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests,
                ).get(this.projectId));
                const byProject = async storeName => requestResult(
                    transaction.objectStore(storeName).index(
                        INDEX_BY_PROJECT,
                    ).getAll(this.projectId),
                );
                const [originalRevisions, originalAssets, working,
                    blobs, buildReports, fieldWorking, fieldState] = await Promise.all([
                    byProject(PROJECT_OBJECT_STORES.originalRevisions),
                    byProject(PROJECT_OBJECT_STORES.originalAssets),
                    byProject(PROJECT_OBJECT_STORES.working),
                    includeBlobs ? byProject(PROJECT_OBJECT_STORES.blobs) : [],
                    includeBuildReports
                        ? byProject(PROJECT_OBJECT_STORES.buildReports) : [],
                    byProject(PROJECT_OBJECT_STORES.fieldWorking),
                    byProject(PROJECT_OBJECT_STORES.fieldState),
                ]);
                return {
                    manifest,
                    original_revisions: originalRevisions,
                    original_assets: originalAssets,
                    working,
                    field_working: fieldWorking,
                    field_state: fieldState,
                    blobs,
                    build_reports: buildReports,
                };
            },
        );

        const exportedBlobs = [];
        for (const record of records.blobs) {
            const {data, ...metadata} = record;
            const bytes = new Uint8Array(await data.arrayBuffer());
            exportedBlobs.push({
                ...cloneJson(metadata),
                data: {
                    encoding: "base64",
                    media_type: data.type || record.media_type || "",
                    value: bytesToBase64(bytes),
                },
            });
        }
        const document = {
            schema: PROJECT_EXPORT_SCHEMA,
            database_version: PROJECT_DATABASE_VERSION,
            project_id: this.projectId,
            records: {
                manifest: records.manifest ? cloneJson(records.manifest) : null,
                original_revisions: records.original_revisions.map(cloneJson),
                original_assets: records.original_assets.map(cloneJson),
                working: records.working.map(cloneJson),
                field_working: records.field_working.map(cloneJson),
                field_state: records.field_state.map(cloneJson),
                blobs: exportedBlobs,
                build_reports: records.build_reports.map(cloneJson),
            },
        };
        const json = canonicalJsonStringify(document);
        if (format === "json") return json;
        if (format === "object") return JSON.parse(json);
        if (format === "blob") {
            if (typeof Blob !== "function") {
                throw new ProjectStoreUnavailableError("Blob is unavailable");
            }
            return new Blob([json], {type: "application/json"});
        }
        throw new TypeError(`unknown export format: ${format}`);
    }

    async importProject(input, {replace = false} = {}) {
        const document = await parseProjectExport(input);
        const records = prepareImportedRecords(document, this.projectId);
        return this.withWriterLock(() => transact(
            this.database,
            allStoreNames(),
            "readwrite",
            async transaction => {
                const manifests = transaction.objectStore(
                    PROJECT_OBJECT_STORES.manifests,
                );
                const counts = await Promise.all(
                    allStoreNames()
                        .filter(name => name !== PROJECT_OBJECT_STORES.manifests)
                        .map(name => requestResult(transaction.objectStore(name)
                            .index(INDEX_BY_PROJECT).count(this.projectId))),
                );
                const existingManifest = await requestResult(
                    manifests.get(this.projectId),
                );
                if (!replace && (existingManifest || counts.some(Boolean))) {
                    throw new ProjectImportConflictError(
                        `project ${this.projectId} already contains data`,
                    );
                }
                if (replace) {
                    manifests.delete(this.projectId);
                    for (const storeName of allStoreNames()) {
                        if (storeName === PROJECT_OBJECT_STORES.manifests) continue;
                        await deleteIndexRecords(transaction.objectStore(storeName)
                            .index(INDEX_BY_PROJECT), this.projectId);
                    }
                }

                if (records.manifest) manifests.put(records.manifest);
                const mappings = [
                    [PROJECT_OBJECT_STORES.originalRevisions,
                        records.original_revisions],
                    [PROJECT_OBJECT_STORES.originalAssets, records.original_assets],
                    [PROJECT_OBJECT_STORES.working, records.working],
                    [PROJECT_OBJECT_STORES.fieldWorking, records.field_working],
                    [PROJECT_OBJECT_STORES.fieldState, records.field_state],
                    [PROJECT_OBJECT_STORES.blobs, records.blobs],
                    [PROJECT_OBJECT_STORES.buildReports, records.build_reports],
                ];
                for (const [storeName, items] of mappings) {
                    const store = transaction.objectStore(storeName);
                    for (const item of items) store.put(item);
                }
                return {
                    project_id: this.projectId,
                    source_project_id: document.project_id,
                    replaced: replace,
                    counts: Object.fromEntries(mappings.map(
                        ([name, items]) => [name, items.length],
                    )),
                };
            },
        ));
    }
}

async function normalizeBlob(data, mediaType = "") {
    if (typeof Blob !== "function") {
        throw new ProjectStoreUnavailableError("Blob is unavailable");
    }
    if (data instanceof Blob) {
        return data.slice(0, data.size, mediaType || data.type);
    }
    if (data instanceof ArrayBuffer) return new Blob([data], {type: mediaType});
    if (ArrayBuffer.isView(data)) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        return new Blob([bytes], {type: mediaType});
    }
    throw new TypeError("blob data must be Blob, ArrayBuffer, or ArrayBufferView");
}

async function prepareBlobRecord(projectId, blobId, data, metadata = {}) {
    nonEmptyString(projectId, "projectId");
    nonEmptyString(blobId, "blobId");
    assertJsonValue(metadata, "$.metadata");
    if (!isPlainJsonObject(metadata)) {
        throw new TypeError("blob metadata must be a JSON object");
    }
    const blob = await normalizeBlob(data, metadata.media_type || "");
    return {
        ...cloneJson(metadata),
        schema: PROJECT_BLOB_SCHEMA,
        project_id: projectId,
        blob_id: blobId,
        media_type: blob.type || metadata.media_type || "",
        byte_length: blob.size,
        data: blob,
    };
}

function blobRecordCopy(record) {
    const {data, ...metadata} = record;
    return {...cloneJson(metadata), data};
}

async function parseProjectExport(input) {
    let value = input;
    if (typeof Blob === "function" && input instanceof Blob) value = await input.text();
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch (error) {
            throw new TypeError("project import is not valid JSON", {cause: error});
        }
    }
    assertJsonValue(value, "$.projectExport");
    if (!isPlainJsonObject(value) ||
        value.database_version !== PROJECT_DATABASE_VERSION ||
        !isPlainJsonObject(value.records)) {
        throw new ProjectFieldFormatError("项目归档格式已作废；仅加载当前格式，不转换旧 Working，请重新建立项目");
    }
    return cloneJson(value);
}

function prepareImportedRecords(document, projectId) {
    const source = document.records;
    const array = name => {
        if (!Array.isArray(source[name])) {
            throw new TypeError(`project export records.${name} must be an array`);
        }
        return source[name];
    };
    const remap = record => {
        assertJsonValue(record);
        if (!isPlainJsonObject(record)) throw new TypeError("record must be an object");
        return {...cloneJson(record), project_id: projectId};
    };
    const originalRevisions = array("original_revisions").map(remap);
    const originalAssets = array("original_assets").map(remap);
    const working = array("working").map(record => {
        const result = remap(record);
        normalizeWorkingRecord(result);
        if (isStoryPageWorking(result)) validateStoryPageWorking(result);
        return result;
    });
    const fieldWorking = array("field_working").map(remap);
    const fieldState = array("field_state").map(remap);
    const states = new Map();
    for (const meta of fieldState) {
        requireFieldOwner(meta.resource_id);
        if (states.has(meta.resource_id)) throw new TypeError("重复字段资源代数");
        const original = originalAssets.find(asset => asset.resource_id === meta.resource_id
            && asset.revision_id === source.manifest?.active_original_revision_id);
        if (!original) throw new ProjectFieldFormatError("字段覆盖缺少当前 Original");
        validateFieldMeta(meta, original);
        if (working.some(row => row.resource_id === meta.resource_id)) {
            throw new ProjectFieldFormatError("字段与整资源 Working 不能同时存在");
        }
        const owner = fieldOwner(meta.resource_id), dependencies = {};
        for (const dependency of owner.dependencies || []) {
            const matches = originalAssets.filter(asset => asset.resource_id === dependency
                && asset.revision_id === original.revision_id);
            if (matches.length !== 1) throw new ProjectFieldFormatError(`${dependency}: 归档缺少唯一的同版本 Original`);
            dependencies[dependency] = matches[0].value;
        }
        owner.validate(original.value,
            fieldWorking.filter(row => row.resource_id === meta.resource_id), dependencies);
        // Import is a new editing lifetime; pending saves from before replace must fail.
        meta.epoch = crypto.randomUUID();
        states.set(meta.resource_id, meta);
    }
    for (const row of fieldWorking) {
        if (!states.has(row.resource_id)) throw new ProjectFieldFormatError("字段覆盖缺少资源代数");
    }
    const buildReports = array("build_reports").map(record =>
        normalizeBuildReportRecord(remap(record), projectId));
    const blobs = array("blobs").map(record => {
        if (!isPlainJsonObject(record.data) || record.data.encoding !== "base64") {
            throw new TypeError(`${record.blob_id || "blob"}: unsupported data encoding`);
        }
        const bytes = base64ToBytes(record.data.value);
        const {data, ...metadata} = remap(record);
        const blob = new Blob([bytes], {type: data.media_type || ""});
        return {
            ...metadata,
            byte_length: blob.size,
            media_type: blob.type,
            data: blob,
        };
    });
    return {
        manifest: source.manifest === null
            ? null : normalizeManifest(source.manifest, projectId),
        original_revisions: originalRevisions,
        original_assets: originalAssets,
        working,
        field_working: fieldWorking,
        field_state: fieldState,
        blobs,
        build_reports: buildReports,
    };
}

/**
 * Thin shape-compatible provider for the eventual package-io replacement.
 * Resource IDs and blob IDs are logical identifiers; no URL or ROM path leaks
 * into views.
 */
