// @editor-module 显示可丢弃缓存的分类占用并提供分项与全部清理。
import {ACTIVE_PROJECT_ID} from "../core/project-session.js";
import {deletePreviewCacheProject, previewCacheProjectStats} from "../core/preview-cache.js";
import {deletePackageCache, packageCacheStats} from "../core/package-cache.js";
import {discardPackagePrefetch} from "../core/package-io.js";
import {state} from "../core/state.js";
import {editorLog} from "../core/editor-log.js";

const formatBytes = bytes => {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
};

let refreshTimer = null;
let clearing = false;
const projectId = () => state.projectRepository?.projectId || ACTIVE_PROJECT_ID;
const controls = root => [
  ...(root.matches?.("[data-cache-control]") ? [root] : []),
  ...(root.querySelectorAll?.("[data-cache-control]") || []),
];

export async function refreshCacheControls(root = document) {
  const requestedProjectId = projectId();
  const results = await Promise.allSettled([
    packageCacheStats(), previewCacheProjectStats(requestedProjectId),
  ]);
  if (requestedProjectId !== projectId()) return null;
  const stats = Object.fromEntries(["package", "preview"].map((category, index) => {
    const result = results[index];
    if (result.status === "rejected") {
      editorLog.error("后台准备", "缓存统计失败", result.reason);
    }
    return [category, result.status === "fulfilled" ? result.value : null];
  }));
  controls(root).forEach(control => {
    for (const category of Object.keys(stats)) {
      const value = stats[category];
      const status = control.querySelector(`[data-cache-status="${category}"]`);
      const button = control.querySelector(`[data-cache-clear="${category}"]`);
      if (status) status.textContent = value
        ? `${value.entries} 项 · ${formatBytes(value.bytes)}` : "缓存不可用";
      if (button) button.disabled = clearing || !value?.entries;
    }
    const values = Object.values(stats).filter(Boolean);
    const total = control.querySelector("[data-cache-total]");
    if (total) total.textContent = values.length
      ? formatBytes(values.reduce((sum, row) => sum + row.bytes, 0)) : "缓存不可用";
    const button = control.querySelector('[data-cache-clear="all"]');
    if (button) button.disabled = clearing || !values.some(row => row.entries);
  });
  return stats;
}

function scheduleRefresh(root, delay = 250) {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshCacheControls(root);
  }, delay);
}

export function bindCacheControls(root = document) {
  if (root.documentElement?.dataset.cacheControlBound === "1") {
    void refreshCacheControls(root);
    return;
  }
  if (root.documentElement) root.documentElement.dataset.cacheControlBound = "1";
  globalThis.addEventListener?.("mmeditor:preview-cache-change", event => {
    if (!event.detail?.projectId || event.detail.projectId === projectId()) scheduleRefresh(root);
  });
  globalThis.addEventListener?.("mmeditor:package-cache-change", () => scheduleRefresh(root));
  root.addEventListener("click", async event => {
    const button = event.target.closest?.("[data-cache-clear]");
    if (!button || clearing) return;
    const category = button.dataset.cacheClear;
    const requestedProjectId = projectId();
    clearing = true;
    controls(root).forEach(control => control.querySelectorAll("[data-cache-clear]")
      .forEach(item => {item.disabled = true;}));
    const task = editorLog.startTask({source: "后台准备", message: "清理缓存"});
    try {
      const jobs = [];
      if (category === "package" || category === "all") {
        jobs.push(deletePackageCache().then(() => discardPackagePrefetch()));
      }
      if (category === "preview" || category === "all") {
        jobs.push(deletePreviewCacheProject(requestedProjectId));
      }
      const results = await Promise.allSettled(jobs);
      const failed = results.find(result => result.status === "rejected");
      if (failed) throw failed.reason;
      task.finish({message: "缓存已清理"});
    } catch (error) {
      task.finish({level: "error", message: `缓存清理失败：${error.message || error}`, error});
    } finally {
      clearing = false;
      await refreshCacheControls(root);
    }
  });
  void refreshCacheControls(root);
}
