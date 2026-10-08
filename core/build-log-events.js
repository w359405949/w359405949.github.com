// @editor-module 将构建事件映射为统一会话日志与正在进行的构建任务。
import {editorLog} from "./editor-log.js";

const STAGES = {hydrate: "准备构建数据", prepare: "准备构建", compile: "序列化", validate: "校验",
  bundle: "准备片段", link: "写入 ROM", map: "生成映射", finalize: "校验构建结果",
  verify: "校验未写入数据", save: "构建存档", persist: "保存构建结果", done: "构建完成", error: "构建失败"};
let task = null;

export function reportBuildState({running = false, event = null} = {}) {
  if (!task && (running || event)) task = editorLog.startTask({source: "构建", message: "准备构建"});
  if (!task) return;
  if (event) {
    const stage = STAGES[event.stage] || event.stage || "构建";
    const entry = {summary: stage, message: `${stage}：${event.message || event.asset_id || event.event_type || ""}`,
      level: event.status === "error" ? "error" : "info", error: event.error,
      progress: Number.isFinite(event.progress_current) && Number.isFinite(event.progress_total)
        ? {current: event.progress_current, total: event.progress_total} : null,
      details: event};
    if (["done", "error"].includes(event.stage) || event.status === "error") {
      task.finish(entry);
      task = null;
    } else task.update(entry);
  } else if (!running) {
    task.finish({level: "debug", message: "构建任务结束", progress: null});
    task = null;
  }
}
