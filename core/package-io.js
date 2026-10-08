// @editor-module 封装静态包 JSON 读取和文件、图片 URL。
// 非构建页面读取静态资产包的唯一入口：页面不自行拼接资源路径；`.bin` 只由构建流程经 `build-package-io.js` 读取；
// 缺少像素投影时显示不可用状态，不回退读取 layout、region、pattern 或 bank 二进制。
//
// 架构约束（见 docs/metalmaxcn_project.md 架构第 21 条）：
// 视图不得自行拼接资源路径，一律经过本模块；`.bin` 只经构建路径读取。

import {editorLog} from "./editor-log.js";
import {siteUrl} from "./site-url.js";
import {readPackageBytes, readPackageManifest} from "./package-cache.js";

let valueOperations;
const jsonOperations = () => valueOperations ||= import("./project-store-values.js");

export const fileUrl = path => {
    const value = String(path);
    const pathname = value.split(/[?#]/, 1)[0];
    if (pathname.toLowerCase().endsWith(".bin")) {
        throw new Error(`${path}: .bin package inputs are build-only`);
    }
    return siteUrl(`package/${value.split("/").map(encodeURIComponent).join("/")}`);
};

export const visualUrl = (path) => fileUrl(`game/visuals/${path}`);

const prefetched = new Map();
const pendingReads = new Map();
const backgroundQueue = new Set();
let backgroundActive = 0;
let prefetchVersion = 0;
export const packagePrefetchVersion = () => prefetchVersion;

async function fetchPackageJson(path, priority) {
    fileUrl(path);
    const task = priority === "low" ? editorLog.startTask({source: "后台准备", message: "预取数据", details: path}) : null;
    try {
        const value = path === "manifest.json" ? await readPackageManifest(priority)
            : JSON.parse(new globalThis.TextDecoder("utf-8", {fatal: true}).decode(await readPackageBytes(path, priority)));
        task?.finish({level: "debug", message: "预取完成"});
        return value;
    } catch (error) {
        if (task) task.finish({level: "error", message: `预取失败：${path}`, error});
        else editorLog.error("资源载入", `载入失败：${path}`, error);
        throw error;
    }
}

function readPackageJson(path, priority = "high") {
    let pending = pendingReads.get(path);
    if (!pending) {
        pending = fetchPackageJson(path, priority).then(async value =>
            (await jsonOperations()).freezeValidatedJson(value));
        pendingReads.set(path, pending);
        const release = () => {if (pendingReads.get(path) === pending) pendingReads.delete(path);};
        pending.catch(release);
    }
    return pending;
}

function drainBackgroundReads() {
    while (backgroundActive < 2 && backgroundQueue.size) {
        const job = backgroundQueue.values().next().value;
        backgroundQueue.delete(job);
        void job.start(true);
    }
}

export function prefetchPackageJson(path, {background = false} = {}) {
    let job = prefetched.get(path);
    if (!job) {
        job = {started: false};
        job.promise = new Promise((resolve, reject) => {
            job.start = async backgroundRead => {
                if (job.started) return;
                job.started = true;
                backgroundQueue.delete(job);
                if (backgroundRead) backgroundActive += 1;
                try {
                    const value = await readPackageJson(path, backgroundRead ? "low" : "high");
                    resolve((await jsonOperations()).freezeValidatedJson(value));
                } catch (error) {
                    reject(error);
                } finally {
                    if (backgroundRead) {
                        backgroundActive -= 1;
                        drainBackgroundReads();
                    }
                }
            };
            job.cancel = () => {
                if (job.started) return;
                job.started = true;
                backgroundQueue.delete(job);
                reject(new Error(`${path}: 静态预取已失效`));
            };
        });
        prefetched.set(path, job);
        job.promise.catch(() => {if (prefetched.get(path) === job) prefetched.delete(path);});
        if (background) {
            backgroundQueue.add(job);
            queueMicrotask(drainBackgroundReads);
        } else void job.start();
    } else if (!background) void job.start();
    return job.promise;
}

export function discardPackagePrefetch(path) {
    prefetchVersion += 1;
    if (path === undefined) {
        pendingReads.clear();
        for (const job of prefetched.values()) job.cancel();
        prefetched.clear();
    } else {
        pendingReads.delete(path);
        prefetched.get(path)?.cancel();
        prefetched.delete(path);
    }
}

export function packageJson(path) {
    const job = prefetched.get(path);
    if (job) void job.start();
    return (job ? job.promise : readPackageJson(path)).then(async value =>
        (await jsonOperations()).cloneValidatedJson(value));
}

export function readonlyPackageJson(path) {
    const job = prefetched.get(path);
    if (!job) return readPackageJson(path);
    void job.start();
    return job.promise;
}
