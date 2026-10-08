// @editor-module 提供防抖和串行排队的 Working 自动保存节拍。
//
// **这个编辑器没有「保存」按钮。** 改动即时进 Working 层，用户只需要一个「重置」
// 把这一行的 Working 清掉回 Origin（控件见 `ui/table.js`）。这个模块是那条写入链
// 的节拍器：防抖窗口、串行排队、以及「切走之后那一笔仍要落到它原来的目标上」。
//
// **保存状态只有一份。** 所有链的等待、排队、正在提交与未清除的失败合起来就是
// 下侧状态栏消费的状态（`docs/metalmaxcn_project.md`「编辑器怎么存」）；建链的
// 是哪个入口不改变这件事——没有「要不要纳入统计」的选项。
//
// 失败按写入的影响范围记账：某一处失败后，只有把同一范围写成功（或重置）才解除；
// 别处的成功不会替它把错误抹掉，别处的失败也不会被它抹掉。
//
// **不做的事**：不报「正在保存…」「已保存」。写入成功是常态，只有失败才是用户需要
// 知道的结果（见 `no-meta-information-in-ui`）。所以这里只有 `onError`。

import {editorLog} from "./editor-log.js";

const DEFAULT_DELAY = 250;

// 离开页面／切换视图前要能把还没落盘的写入立刻排进各自的链。
// 只留弱引用：链的存活与否仍由调用方决定（字段对象按资源常驻，逐次挂载的编辑器随视图丢弃）。
const liveChains = new Set();
const saveWatchers = new Set();
const preparingWrites = new Set();
let lastSaveKey = null;

/** Track an edit which is preparing field changes before it enters a save chain. */
export function trackAutoSavePreparation(promise) {
  preparingWrites.add(promise);
  notifySaveWatchers();
  void promise.finally(() => {
    preparingWrites.delete(promise);
    notifySaveWatchers();
  }).catch(() => {});
  return promise;
}

function liveChainsOf(set) {
  const live = [];
  for (const reference of set) {
    const chain = reference.deref();
    if (chain) live.push(chain);
    else set.delete(reference);
  }
  return live;
}

/** 有等待防抖、排队或正在提交的写入。 */
export function autoSaveBusy() {
  return preparingWrites.size > 0 || liveChainsOf(liveChains).some(chain => chain.busy);
}

/** 最近一次未清除的写入错误（状态栏显示真实错误）。 */
export function autoSaveError() {
  for (const chain of liveChainsOf(liveChains)) if (chain.error) return chain.error;
  return null;
}

/** 给定影响范围内未清除的写入错误（控件显示自己那几个字段的错误）。 */
export function autoSaveErrorOf(scopes) {
  const wanted = new Set(scopes);
  for (const chain of liveChainsOf(liveChains)) {
    const error = chain.errorOf(wanted);
    if (error) return error;
  }
  return null;
}

/** 整体作废（如项目切换）时清掉全部未清除的失败。 */
export function clearAutoSaveErrors() {
  clearAutoSaveErrorsOf(null);
}

/**
 * 给定影响范围内未清除的失败作废（重置成功即解除这一处，别处的失败留着）。
 * 范围以外的链也会被问一遍：同一处可能同时挂在旧入口的链上。
 */
export function clearAutoSaveErrorsOf(scopes) {
  const wanted = scopes === null || scopes === undefined ? null : new Set(scopes);
  let changed = false;
  for (const chain of liveChainsOf(liveChains)) if (chain.clearErrors(wanted)) changed = true;
  if (changed) notifySaveWatchers();
}

function saveState() {
  return {busy: autoSaveBusy(), error: autoSaveError()};
}

function saveStateKey(state) {
  return `${state.busy}\u0000${state.error ? state.error.message || state.error : ""}`;
}

function notifySaveWatchers() {
  const state = saveState(), key = saveStateKey(state);
  if (key === lastSaveKey) return;
  lastSaveKey = key;
  for (const watcher of saveWatchers) watcher(state);
}

/** 订阅保存状态；回调立即收到当前值，返回退订函数。 */
export function watchAutoSaveState(watcher) {
  saveWatchers.add(watcher);
  const state = saveState();
  lastSaveKey = saveStateKey(state);
  watcher(state);
  return () => saveWatchers.delete(watcher);
}

/** 把还在防抖窗口里的写入立刻排进各自的链，并等所有链跑完。 */
export async function flushAllAutoSaves() {
  while (true) {
    const preparing = [...preparingWrites];
    await Promise.all([...liveChainsOf(liveChains).map(chain => chain.flush()),
      ...preparing.map(write => write.catch(() => {}))]);
    if (!preparingWrites.size && !liveChainsOf(liveChains).some(chain => chain.busy)) return;
  }
}

/** 是否有防抖窗口里的写入（用于省掉没有写入时的等待）。 */
export function hasPendingAutoSaves() {
  return preparingWrites.size > 0 || liveChainsOf(liveChains).some(chain => chain.pending);
}

/**
 * 建一条自动写入链。
 *
 * `write(payload, key)` 由调用方提供，负责真正的
 * `updateProjectAssetDocument` / `updateSemanticProjectAsset` / 字段写入。
 *
 * - `commit(key, payload)`：防抖排一笔。同一个 key 反复 commit 只留最后一笔；
 *   **payload 在 commit 时就取好**，所以改完立刻切页，那一笔仍落在原来的目标上。
 *   返回的 Promise 在该笔落定时兑现；被合并的调用与合并后的那一笔一起兑现。
 * - `cancel(key)`：丢掉尚未开始写入的请求，包括排队中的请求（不传 key 就全丢）。
 *   已经开始的写入仍由 settled 等待，字段版本栅栏拒绝失效写入。恢复 Origin 之前必须
 *   先 cancel，否则那一笔会在恢复之后才落盘，改动又回来了。
 * - `settled()`：等当前排队的写入跑完。
 *
 * `scope(payload, key)` 声明这一笔的影响范围（默认就是 key）：失败记在范围内的每一处，
 * 同一范围写成功才解除。
 *
 * key 可以是任何值——屏 id、行状态对象都行；用 Map 存，对象 key 不会因此续命，
 * 因为落盘或 cancel 之后立刻删除。
 */
export function createAutoSave(write, {delay = DEFAULT_DELAY, onError = null, scope = null} = {}) {
  if (typeof write !== "function") throw new TypeError("write must be callable");
  const timers = new Map();
  const payloads = new Map();
  const queued = new Set();
  const failed = new Map();
  let chain = Promise.resolve();
  // 排队进链但还没落定的笔数。
  let outstanding = 0;

  const scopesOf = (payload, key) => {
    const declared = scope ? scope(payload, key) : key;
    return (Array.isArray(declared) ? declared : [declared]).filter(item => item !== undefined && item !== null);
  };

  /** 落定一笔后按影响范围解除／记录失败。 */
  const settleErrors = (scopes, error) => {
    for (const item of scopes) {
      if (error) failed.set(item, error);
      else failed.delete(item);
    }
  };

  const flush = key => {
    const pending = payloads.get(key);
    if (!pending) return;
    payloads.delete(key);
    timers.delete(key);
    // 同一条链按排队顺序提交。
    const entry = {key, cancelled: false, waiters: pending.waiters, scopes: scopesOf(pending.payload, key)};
    queued.add(entry);
    outstanding += 1;
    chain = chain.then(() => {
      queued.delete(entry);
      if (entry.cancelled) return undefined;
      return write(pending.payload, key);
    }).then(result => {
      settleErrors(entry.scopes, null);
      for (const waiter of entry.waiters) waiter.resolve(result);
    }, error => {
      settleErrors(entry.scopes, error);
      editorLog.error("保存", `保存失败：${error.message || error}`, error, {details: {key, scopes: [...entry.scopes]}});
      if (onError) onError(error, key);
      for (const waiter of entry.waiters) waiter.reject(error);
    }).finally(() => {
      outstanding -= 1;
      notifySaveWatchers();
    });
    notifySaveWatchers();
  };

  const api = {
    commit(key, payload) {
      clearTimeout(timers.get(key));
      let resolve, reject;
      const outcome = new Promise((onSettled, onFailed) => {resolve = onSettled; reject = onFailed;});
      // 不接返回值的调用方（旧编辑器）不应产生未处理的拒绝。
      outcome.catch(() => {});
      const previous = payloads.get(key);
      const waiters = previous ? previous.waiters : [];
      waiters.push({resolve, reject});
      payloads.set(key, {payload, waiters});
      timers.set(key, setTimeout(() => flush(key), delay));
      notifySaveWatchers();
      return outcome;
    },
    cancel(key = undefined) {
      const keys = key === undefined ? [...timers.keys()] : [key];
      for (const item of keys) {
        clearTimeout(timers.get(item));
        timers.delete(item);
        const dropped = payloads.get(item);
        payloads.delete(item);
        // 被丢掉的那一笔不会落盘：调用方等在它上面也不会永远悬着。
        for (const waiter of dropped?.waiters || []) waiter.resolve(undefined);
      }
      for (const entry of queued) if (key === undefined || entry.key === key) entry.cancelled = true;
      notifySaveWatchers();
    },
    /** 立刻把还在防抖窗口里的那一笔排进链，然后等链跑完。 */
    async flush(key = undefined) {
      const keys = key === undefined ? [...timers.keys()] : [key];
      for (const item of keys) {
        clearTimeout(timers.get(item));
        flush(item);
      }
      await chain;
    },
    async settled() {
      await chain;
    },
    get pending() {
      return timers.size > 0;
    },
    /** 等待防抖、排队或正在提交。 */
    get busy() {
      return timers.size > 0 || outstanding > 0;
    },
    /** 这一条链上未清除的第一个失败。 */
    get error() {
      for (const error of failed.values()) return error;
      return null;
    },
    errorOf(scopes) {
      for (const [item, error] of failed) if (scopes.has(item)) return error;
      return null;
    },
    clearErrors(scopes = null) {
      if (!failed.size) return false;
      if (scopes === null) {
        failed.clear();
        return true;
      }
      let changed = false;
      for (const item of [...failed.keys()]) if (scopes.has(item)) {failed.delete(item); changed = true;}
      return changed;
    },
  };
  liveChains.add(new WeakRef(Object.freeze(api)));
  return Object.freeze(api);
}
