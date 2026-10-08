// @editor-module 从统一日志服务呈现全局任务与消息并绑定日志入口。
import {editorLog, logProgressText} from "../core/editor-log.js";
import {watchAutoSaveState} from "../core/auto-save.js";
import {esc} from "../core/dom.js";

export function bindLogStatus(openLog) {
  const bar = document.querySelector("#statusbar");
  if (!bar || bar.dataset.logBound) return;
  bar.dataset.logBound = "true";
  globalThis.addEventListener("error", event => {
    const resource = event.target?.src || event.target?.href;
    const details = {file: event.filename || resource, line: event.lineno, column: event.colno};
    if (!resource && event.target === globalThis && event.error == null
      && event.lineno === 0 && event.colno === 0
      && ["ResizeObserver loop completed with undelivered notifications.",
        "ResizeObserver loop limit exceeded"].includes(event.message)) {
      editorLog.record({source: "ResizeObserver", level: "debug", message: event.message, details});
      return;
    }
    editorLog.error(resource ? "资源载入" : "编辑器", event.message || "资源文件加载失败", event.error,
      {details});
  }, true);
  globalThis.addEventListener("unhandledrejection", event => {
    editorLog.error("编辑器", `未处理的错误：${event.reason?.message || event.reason}`, event.reason);
  });
  let saveTask = null;
  watchAutoSaveState(({busy}) => {
    if (busy && !saveTask) saveTask = editorLog.startTask({source: "保存", message: "保存中"});
    if (!busy && saveTask) {
      saveTask.finish({level: "debug", message: "保存任务结束"});
      saveTask = null;
    }
  });
  let scheduled = false;
  editorLog.subscribe(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const context = editorLog.context();
      for (const key of ["rows", "selection", "dirty", "address"]) {
        document.querySelector(`#status-${key}`).textContent = context[key] || "";
      }
      const tasks = document.querySelector("#status-tasks");
      tasks.innerHTML = editorLog.tasks().map(task => `<span class="log-task" title="${esc(task.message)}">
        <b>${esc(task.source)}</b> ${esc(task.summary || task.message)} ${esc(logProgressText(task.progress))}</span>`).join("");
      const attention = editorLog.attention();
      const message = document.querySelector("#status-message");
      message.hidden = !attention;
      message.dataset.level = attention?.level || "";
      message.textContent = attention ? `${attention.source} · ${attention.message}` : "";
      const dismiss = document.querySelector("#status-dismiss");
      dismiss.hidden = !attention;
      dismiss.dataset.logId = attention?.id || "";
    });
  });
  bar.addEventListener("click", event => {
    if (event.target.closest("#status-dismiss")) {
      editorLog.acknowledge([Number(event.target.closest("#status-dismiss").dataset.logId)]);
      return;
    }
    void openLog();
  });
  bar.addEventListener("keydown", event => {
    if (event.target === bar && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      void openLog();
    }
  });
}
