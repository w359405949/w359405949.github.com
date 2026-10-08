// @editor-module 按运行包清单的内容摘要缓存 JSON 与构建二进制。
import {siteUrl} from "./site-url.js";
import {sha256Hex} from "./rom-linker.js";

const DATABASE_NAME = "metalmaxcn-package-cache";
const STORE_NAME = "files";
const SHA256 = /^[0-9a-f]{64}$/;
const packageRoot = siteUrl("package/");
const reads = new Map();
let manifestPromise;
let digestPromise;
let databasePromise;
let clearGeneration = 0;

function announceChange() {
  if (typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent?.(new CustomEvent("mmeditor:package-cache-change"));
  }
}

function database() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {resolve(null); return;}
      let failed = false;
      const request = globalThis.indexedDB.open(DATABASE_NAME);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, {keyPath: "url"});
      request.onerror = () => {failed = true; reject(request.error);};
      request.onblocked = () => {failed = true; reject(new Error("运行包缓存被其他标签页占用"));};
      request.onsuccess = () => {
        const db = request.result;
        if (failed) {db.close(); return;}
        db.onversionchange = () => {db.close(); databasePromise = null;};
        resolve(db);
      };
    }).catch(() => null);
  }
  return databasePromise;
}

async function transact(mode, operation) {
  const db = await database();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || new Error("运行包缓存操作失败"));
    transaction.onerror = () => {};
  });
}

const fileUrl = path => `${packageRoot}${String(path).split("/").map(encodeURIComponent).join("/")}`;
const cacheKey = path => new URL(fileUrl(path), globalThis.location?.href || "http://localhost/").href;

async function networkBytes(path, priority) {
  const response = await fetch(fileUrl(path), {priority, cache: "no-cache"});
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

export function readPackageManifest(priority = "high") {
  if (!manifestPromise) {
    manifestPromise = networkBytes("manifest.json", priority).then(bytes =>
      JSON.parse(new globalThis.TextDecoder("utf-8", {fatal: true}).decode(bytes)));
    manifestPromise.catch(() => {manifestPromise = null; digestPromise = null;});
  }
  return manifestPromise;
}

function manifestDigests(manifest) {
  const digests = new Map();
  const add = (path, digest) => {
    if (typeof path !== "string" || !path || typeof digest !== "string" || !SHA256.test(digest)) {
      throw new Error(`${path}: 运行包文件摘要无效`);
    }
    if (digests.has(path) && digests.get(path) !== digest) {
      throw new Error(`${path}: 运行包清单的文件摘要冲突`);
    }
    digests.set(path, digest);
  };
  if (manifest.package_file_sha256) {
    for (const [path, digest] of Object.entries(manifest.package_file_sha256)) add(path, digest);
  } else {
    const visit = value => {
      if (!value || typeof value !== "object") return;
      if (value.path && value.sha256) add(value.path, value.sha256);
      for (const child of Object.values(value)) visit(child);
    };
    visit(manifest);
  }
  return digests;
}

async function loadBytes(path, priority) {
  const generation = clearGeneration;
  const digests = await (digestPromise ||= readPackageManifest(priority).then(manifestDigests));
  const digest = digests.get(path);
  if (!digest) return networkBytes(path, priority);
  const url = cacheKey(path);
  let cached;
  try {cached = await transact("readonly", store => store.get(url));} catch (_) {}
  if (cached) {
    if (cached.sha256 === digest && cached.bytes instanceof Blob
        && cached.byte_length === cached.bytes.size) {
      try {
        const bytes = await cached.bytes.arrayBuffer();
        if (await sha256Hex(new Uint8Array(bytes)) === digest) return bytes;
      } catch (_) {}
    }
    try {await transact("readwrite", store => store.delete(url)); announceChange();} catch (_) {}
  }
  const bytes = await networkBytes(path, priority);
  if (await sha256Hex(new Uint8Array(bytes)) !== digest) {
    throw new Error(`${path}: 运行包文件 SHA-256 与清单不符`);
  }
  if (generation === clearGeneration) {
    try {
      const stored = await transact("readwrite", store => store.put({
        url, sha256: digest, bytes: new Blob([bytes]), byte_length: bytes.byteLength,
      }));
      if (stored !== null) announceChange();
    } catch (_) {}
  }
  return bytes;
}

export function readPackageBytes(path, priority = "high") {
  let pending = reads.get(path);
  if (!pending) {
    pending = loadBytes(path, priority);
    reads.set(path, pending);
    const release = () => {if (reads.get(path) === pending) reads.delete(path);};
    pending.then(release, release);
  }
  return pending.then(bytes => bytes.slice(0));
}

function scopeRange() {
  const prefix = new URL(packageRoot, globalThis.location?.href || "http://localhost/").href;
  return globalThis.IDBKeyRange.bound(prefix, `${prefix}\uffff`);
}

export async function packageCacheStats() {
  const records = await transact("readonly", store => store.getAll(scopeRange()));
  if (!records) return null;
  return {entries: records.length, bytes: records.reduce((sum, row) =>
    sum + (Number(row.byte_length) || 0), 0)};
}

export async function deletePackageCache() {
  clearGeneration += 1;
  reads.clear();
  await transact("readwrite", store => store.delete(scopeRange()));
  announceChange();
}
