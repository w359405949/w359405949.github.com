// @editor-module 将快速构建交给 Worker，映射回当前项目的构建状态。
import {state} from "../core/state.js";
import {publishBuildState} from "../core/rom-build.js";
import {reportBuildState} from "../core/build-log-events.js";
let buildWorker = null;

export async function runQuickBuild({onEvent} = {}) {
  if (state.browserBuildRunning) throw new Error("已有一个 ROM 构建正在进行");
  const worker = buildWorker ||= new Worker(new URL("./quick-build-worker.js", import.meta.url), {type: "module"});
  state.browserBuildRunning = true;
  state.browserBuildError = "";
  state.browserBuildEvents = [];
  state.browserBuildCurrentEvent = null;
  state.browserBuildReport = null;
  state.browserBuildRom = null;
  state.browserBuildSave = null;
  state.browserBuildTimings = null;
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  publishBuildState();
  try {
    return await new Promise((resolve, reject) => {
      worker.onerror = event => {
        event.preventDefault();
        reject(new Error(event.message || "快速构建 Worker 启动失败"));
      };
      worker.onmessage = ({data}) => {
        if (data.type === "event") {
          if (data.event.stage === "hydrate" && data.event.status !== "success") {
            state.browserBuildCurrentEvent = data.event;
            reportBuildState({running: true, event: data.event});
          } else {
            publishBuildState(data.event);
          }
          onEvent?.(data.event);
        } else if (data.type === "hydrated") {
          state.browserProjectManifest = data.manifest;
          state.projectBootstrapStatus = "ready";
        } else if (data.type === "complete") {
          state.browserProjectManifest = data.manifest;
          state.browserBuildReport = data.result.report;
          state.browserBuildRom = data.result.rom;
          state.browserBuildSave = data.result.save;
          state.browserBuildTimings = data.timings;
          resolve(data.result);
        } else if (data.type === "error") {
          const error = new Error(data.message);
          if (data.stack) error.stack = data.stack;
          reject(error);
        }
      };
      worker.postMessage(null);
    });
  } catch (error) {
    worker.terminate();
    buildWorker = null;
    state.browserBuildError = error.message;
    if (state.projectBootstrapStatus === "loading") {
      state.projectBootstrapStatus = "error";
      state.projectBootstrapError = error.message;
    }
    publishBuildState({stage: "error", message: error.message, status: "error", error});
    throw error;
  } finally {
    state.browserBuildRunning = false;
    publishBuildState();
  }
}
