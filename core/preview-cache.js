// @editor-module 管理可丢弃的媒体预览缓存。
// 删除缓存后，媒体预览由当前字段对象重绘。
// 缓存不进入项目导出与构建输入。

const PREVIEW_CACHE_DATABASE_NAME = "metalmaxcn-preview-cache";
const PREVIEW_CACHE_DATABASE_VERSION = 3;
const PREVIEW_CACHE_STORE = "previews";
const PREVIEW_CACHE_MAX_BYTES = 32 * 1024 * 1024;
const PREVIEW_CACHE_MAX_ENTRIES = 512;

const INDEX_BY_PROJECT = "by_project";

function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveInteger(value, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return result;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
      request.error || new Error("preview cache IndexedDB request failed"),
    );
  });
}

function transactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error || new Error("preview cache transaction aborted"),
    );
    transaction.onerror = () => {
      // transaction abort owns the rejection so the original IDB error wins.
    };
  });
}

async function transact(database, mode, callback) {
  const transaction = database.transaction(PREVIEW_CACHE_STORE, mode);
  const completion = transactionCompletion(transaction);
  try {
    const result = await callback(transaction.objectStore(PREVIEW_CACHE_STORE));
    await completion;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch (_abortError) {
      // The request may already have aborted the transaction.
    }
    try {
      await completion;
    } catch (_transactionError) {
      // Preserve the more specific callback/request error.
    }
    throw error;
  }
}

function openPreviewCacheDatabase({
  name = PREVIEW_CACHE_DATABASE_NAME,
  indexedDBFactory = globalThis.indexedDB,
} = {}) {
  if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable for preview cache"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDBFactory.open(name, PREVIEW_CACHE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (database.objectStoreNames.contains("package_json")) {
        database.deleteObjectStore("package_json");
      }
      if (!database.objectStoreNames.contains(PREVIEW_CACHE_STORE)) {
        const store = database.createObjectStore(PREVIEW_CACHE_STORE, {
          keyPath: ["project_id", "cache_key"],
        });
        store.createIndex(INDEX_BY_PROJECT, "project_id", {unique: false});
      }
    };
    request.onerror = () => {
      settled = true;
      reject(request.error || new Error("failed to open preview cache"));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("preview cache upgrade is blocked by another tab"));
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

function copyRecord(record) {
  if (!record) return null;
  const {data, ...metadata} = record;
  return {...metadata, data};
}

class IndexedDbPreviewCache {
  static async open(options = {}) {
    const database = await openPreviewCacheDatabase(options);
    return new IndexedDbPreviewCache(database);
  }

  constructor(database) {
    if (!database || typeof database.transaction !== "function") {
      throw new TypeError("preview cache requires an open IDBDatabase");
    }
    this.database = database;
  }

  close() {
    this.database.close();
  }

  async get(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      const record = await requestResult(store.get([project, key]));
      if (!record) return null;
      record.last_accessed_at = Date.now();
      store.put(record);
      return copyRecord(record);
    });
  }

  async put(projectId, cacheKey, data, {
    width,
    height,
    mediaType = "image/png",
  } = {}) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    if (!(data instanceof Blob)) {
      throw new TypeError("preview cache data must be a Blob");
    }
    const now = Date.now();
    const record = {
      schema: "metalmaxcn.derived-preview/v1",
      project_id: project,
      cache_key: key,
      media_type: data.type || mediaType,
      width: positiveInteger(width, "width"),
      height: positiveInteger(height, "height"),
      byte_length: data.size,
      created_at: now,
      last_accessed_at: now,
      data,
    };
    return transact(this.database, "readwrite", async store => {
      store.put(record);
      return copyRecord(record);
    });
  }

  async delete(projectId, cacheKey) {
    const project = nonEmptyString(projectId, "projectId");
    const key = nonEmptyString(cacheKey, "cacheKey");
    return transact(this.database, "readwrite", async store => {
      store.delete([project, key]);
    });
  }

  async deleteProject(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readwrite", async store => {
      const index = store.index(INDEX_BY_PROJECT);
      const keys = await requestResult(index.getAllKeys(project));
      keys.forEach(key => store.delete(key));
      return keys.length;
    });
  }

  async stats(projectId) {
    const project = nonEmptyString(projectId, "projectId");
    return transact(this.database, "readonly", async store => {
      const records = await requestResult(store.index(INDEX_BY_PROJECT).getAll(project));
      return records.reduce((summary, record) => ({
        entries: summary.entries + 1,
        bytes: summary.bytes + Math.max(0, Number(record.byte_length) || 0),
        lastAccessedAt: Math.max(
          summary.lastAccessedAt,
          Number(record.last_accessed_at) || Number(record.created_at) || 0,
        ),
      }), {entries: 0, bytes: 0, lastAccessedAt: 0});
    });
  }

  async prune({
    maxBytes = PREVIEW_CACHE_MAX_BYTES,
    maxEntries = PREVIEW_CACHE_MAX_ENTRIES,
  } = {}) {
    const byteLimit = positiveInteger(maxBytes, "maxBytes");
    const entryLimit = positiveInteger(maxEntries, "maxEntries");
    return transact(this.database, "readwrite", async store => {
      const records = await requestResult(store.getAll());
      records.sort((left, right) =>
        Number(right.last_accessed_at || 0) - Number(left.last_accessed_at || 0)
        || Number(right.created_at || 0) - Number(left.created_at || 0));
      let keptEntries = 0;
      let keptBytes = 0;
      let deletedEntries = 0;
      for (const record of records) {
        const size = Math.max(0, Number(record.byte_length) || 0);
        const keep = keptEntries < entryLimit && keptBytes + size <= byteLimit;
        if (keep) {
          keptEntries += 1;
          keptBytes += size;
        } else {
          store.delete([record.project_id, record.cache_key]);
          deletedEntries += 1;
        }
      }
      return {keptEntries, keptBytes, deletedEntries};
    });
  }
}

let sharedCachePromise = null;

function announcePreviewCacheChange(projectId = null) {
  if (typeof globalThis.dispatchEvent !== "function"
      || typeof globalThis.CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent("mmeditor:preview-cache-change", {
    detail: {projectId},
  }));
}

async function sharedCache() {
  if (!sharedCachePromise) {
    sharedCachePromise = IndexedDbPreviewCache.open().then(async cache => {
      await cache.prune();
      return cache;
    }).catch(() => null);
  }
  return sharedCachePromise;
}

/** 缓存故障永远退化成 miss，不能让派生视图阻断编辑器。 */
export async function getPreviewCacheEntry(projectId, cacheKey) {
  try {
    return await (await sharedCache())?.get(projectId, cacheKey) || null;
  } catch (_error) {
    return null;
  }
}

export async function putPreviewCacheEntry(projectId, cacheKey, data, metadata) {
  try {
    const result = await (await sharedCache())?.put(projectId, cacheKey, data, metadata) || null;
    if (result) announcePreviewCacheChange(projectId);
    return result;
  } catch (_error) {
    return null;
  }
}

export async function deletePreviewCacheEntry(projectId, cacheKey) {
  try {
    await (await sharedCache())?.delete(projectId, cacheKey);
    announcePreviewCacheChange(projectId);
  } catch (_error) {
    // A corrupt cache entry is still only a cache miss.
  }
}

export async function deletePreviewCacheProject(projectId) {
  try {
    const deleted = await (await sharedCache())?.deleteProject(projectId) || 0;
    announcePreviewCacheChange(projectId);
    return deleted;
  } catch (_error) {
    return 0;
  }
}

export async function previewCacheProjectStats(projectId) {
  try {
    return await (await sharedCache())?.stats(projectId) || {
      entries: 0,
      bytes: 0,
      lastAccessedAt: 0,
    };
  } catch (_error) {
    return null;
  }
}

export async function prunePreviewCache(options) {
  try {
    const result = await (await sharedCache())?.prune(options) || null;
    if (result?.deletedEntries) announcePreviewCacheChange(null);
    return result;
  } catch (_error) {
    return null;
  }
}
