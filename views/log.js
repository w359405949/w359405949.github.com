// @editor-module 筛选会话日志并提供详情、调用栈、复制与失败重试。
import {editorLog, LOG_LEVELS, logEntryText, logProgressText} from "../core/editor-log.js";
import {esc} from "../core/dom.js";

let source = "";
let level = "";
let visibleCount = 200;
const expanded = new Set();
let unsubscribe = null;

const filteredEntries = () => editorLog.entries().filter(entry => (!source || entry.source === source)
  && (!level || entry.level === level));

export function renderLog() {
  const sources = [...new Set(editorLog.entries().map(entry => entry.source))].sort();
  return `<div class="toolbar log-filters">
    <label>来源 <select id="log-source"><option value="">全部来源</option>${sources.map(value =>
      `<option ${source === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label>
    <label>级别 <select id="log-level"><option value="">全部级别</option>${Object.entries(LOG_LEVELS).map(([value, label]) =>
      `<option value="${value}" ${level === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
    <button class="button" id="log-copy">复制筛选日志</button><span id="log-count"></span>
  </div><div id="log-entries" class="log-entries"></div>
    <button class="button ghost" id="log-more" hidden>查看更早日志</button>`;
}

function paintLog(root) {
  if (!root.isConnected) return;
  const all = filteredEntries();
  const visible = all.slice(-visibleCount).reverse();
  root.innerHTML = visible.map(entry => `<details class="log-entry" data-log-id="${entry.id}"
    data-level="${esc(entry.level)}" ${expanded.has(entry.id) ? "open" : ""}>
    <summary><time datetime="${entry.time}">${esc(new Date(entry.time).toLocaleTimeString())}</time>
      <b>${esc(entry.source)}</b><span class="log-level">${LOG_LEVELS[entry.level] || esc(entry.level)}</span>
      <span class="log-message">${esc(entry.message)}</span><span>${esc(logProgressText(entry.progress))}</span></summary>
    <div class="log-detail"><button class="button ghost" data-log-copy="${entry.id}">复制条目</button>
      ${entry.retry ? `<button class="button" data-log-retry="${entry.id}">重试</button>` : ""}
      <p>${esc(entry.time)}</p>${entry.details ? `<h3>详情</h3><pre>${esc(entry.details)}</pre>` : ""}
      ${entry.stack ? `<h3>错误调用栈</h3><pre>${esc(entry.stack)}</pre>` : ""}
    </div></details>`).join("") || '<div class="empty"><b>暂无匹配日志</b></div>';
  const sources = document.querySelector("#log-source");
  for (const value of new Set(editorLog.entries().map(entry => entry.source))) {
    if (![...sources.options].some(option => option.value === value)) sources.add(new Option(value, value));
  }
  document.querySelector("#log-count").textContent = `${visible.length} / ${all.length} 条`;
  document.querySelector("#log-more").hidden = visible.length === all.length;
  editorLog.acknowledge(visible.map(entry => entry.id));
}

export function bindLog() {
  unsubscribe?.();
  const root = document.querySelector("#log-entries");
  let scheduled = false;
  let stop = null;
  root.addEventListener("toggle", event => {
    const entry = event.target.closest("[data-log-id]");
    if (!entry) return;
    const id = Number(entry.dataset.logId);
    if (entry.open) expanded.add(id); else expanded.delete(id);
  }, true);
  const copy = async (value, button) => {
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "已复制";
    } catch (error) {editorLog.error("日志", `复制失败：${error.message}`, error);}
  };
  root.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = Number(button.dataset.logCopy || button.dataset.logRetry);
    const entry = editorLog.entries().find(item => item.id === id);
    if (!entry) return;
    if (button.dataset.logCopy) return copy(logEntryText(entry), button);
    button.disabled = true;
    try {await entry.retry();}
    catch (error) {editorLog.error(entry.source, `重试失败：${error.message}`, error);}
    finally {button.disabled = false;}
  });
  for (const selector of ["#log-source", "#log-level"]) document.querySelector(selector).addEventListener("change", () => {
    source = document.querySelector("#log-source").value;
    level = document.querySelector("#log-level").value;
    visibleCount = 200;
    paintLog(root);
  });
  document.querySelector("#log-copy").addEventListener("click", event =>
    copy(filteredEntries().map(logEntryText).join("\n\n"), event.currentTarget));
  document.querySelector("#log-more").addEventListener("click", () => {visibleCount += 200; paintLog(root);});
  paintLog(root);
  stop = editorLog.subscribe(() => {
    if (!root.isConnected) {stop?.(); return;}
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {scheduled = false; paintLog(root);});
  });
  unsubscribe = stop;
}
