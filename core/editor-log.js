// @editor-module 在当前页面会话内统一记录日志、任务进度与未查看的错误。

const entries = [];
const tasks = new Map();
const listeners = new Set();
const errors = new WeakMap();
let sequence = 0;
let context = {};

export const LOG_LEVELS = Object.freeze({debug: "调试", info: "信息", warning: "警告", error: "错误"});

function detailText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {return JSON.stringify(value, null, 2);}
  catch {return String(value);}
}

function notify() {
  for (const listener of listeners) {
    try {listener();} catch { /* 日志订阅不能中断被记录的操作。 */ }
  }
}

function record({source = "编辑器", level = "info", time = new Date(), message = "", progress = null,
  details = null, error = null, retry = null, running = false} = {}) {
  const entry = {
    id: ++sequence, source, level, time: new Date(time).toISOString(), message: String(message),
    progress: progress ? Object.freeze({...progress}) : null,
    details: detailText(details), stack: error?.stack || "", viewed: false, running,
    retry: typeof retry === "function" ? retry : null,
  };
  entries.push(entry);
  notify();
  return entry;
}

function error(source, message, failure, options = {}) {
  if (failure && typeof failure === "object") {
    if (errors.has(failure)) {
      const existing = errors.get(failure);
      if (typeof options.retry === "function") {existing.retry = options.retry; notify();}
      return existing;
    }
    const entry = record({source, message, error: failure, ...options, level: "error"});
    errors.set(failure, entry);
    return entry;
  }
  return record({source, message, ...options, level: "error"});
}

function startTask({source, message, ...options}) {
  const id = Symbol(source);
  let finished = false;
  const update = patch => {
    if (finished) return;
    const value = {...tasks.get(id), ...patch, source};
    tasks.set(id, value);
    return record({...value, running: true});
  };
  tasks.set(id, {source, message, ...options});
  record({source, message, ...options, running: true});
  return Object.freeze({
    update,
    finish(patch = {}) {
      if (finished) return;
      finished = true;
      const value = {...tasks.get(id), ...patch, source, running: false};
      tasks.delete(id);
      if (patch.error) {
        const entry = error(source, value.message, patch.error, value);
        notify();
        return entry;
      }
      return record(value);
    },
  });
}

function acknowledge(ids) {
  const selected = new Set(ids);
  let changed = false;
  for (const entry of entries) if (selected.has(entry.id) && !entry.viewed) {
    entry.viewed = true;
    changed = true;
  }
  if (changed) notify();
}

export function logProgressText(progress) {
  if (!progress) return "";
  return Number.isFinite(progress.current) && Number.isFinite(progress.total) && progress.total > 0
    ? `${progress.current}/${progress.total}` : "…";
}

export function logEntryText(entry) {
  return [`${entry.time} [${entry.source}] [${LOG_LEVELS[entry.level] || entry.level}] ${entry.message}`,
    logProgressText(entry.progress), entry.details, entry.stack].filter(Boolean).join("\n");
}

export const editorLog = Object.freeze({
  record, error, startTask, acknowledge,
  setContext(value) {context = {...value}; notify();},
  context: () => ({...context}),
  entries: () => entries.slice(),
  tasks: () => [...tasks.values()],
  attention: () => entries.findLast(entry => entry.level === "error" && !entry.viewed)
    || entries.findLast(entry => !entry.viewed && !entry.running && ["warning", "info"].includes(entry.level)),
  subscribe(listener) {
    listeners.add(listener);
    listener();
    return () => listeners.delete(listener);
  },
});
