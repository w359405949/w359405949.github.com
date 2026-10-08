// @editor-module owner 模块向消费页公开可嵌入 UI 能力
//
// 模块图决定数据与引用归属；本注册表只决定一个 owner 怎样提供可嵌入的
// reference / preview / cover。编辑控件只由字段对象提供。
// 消费页按 `module id + component kind` 取组件，
// 不再复制名称解析、候选目录、缩略图和水合代码。字段结构、编码与保存规则仍是
// 模块专有函数，不在这里描述，因而这不是通用表单 schema 或逐字节解释器。

import {esc} from "../core/dom.js";

const MODULE_ID = /^[a-z0-9][a-z0-9._-]*$/u;
const COMPONENT_KIND = /^[a-z][a-z0-9-]*$/u;
const registry = new Map();
const fallbacks = new Map();
const hydrationByHost = new WeakMap();

function identity(moduleId, kind) {
  const normalizedModule = String(moduleId || "");
  const normalizedKind = String(kind || "");
  if (!MODULE_ID.test(normalizedModule)) {
    throw new TypeError(`模块组件 ID 无效：${normalizedModule || "（空）"}`);
  }
  if (!COMPONENT_KIND.test(normalizedKind)) {
    throw new TypeError(`模块组件类型无效：${normalizedKind || "（空）"}`);
  }
  return {moduleId: normalizedModule, kind: normalizedKind};
}

function componentKey(moduleId, kind) {
  return `${moduleId}:${kind}`;
}

function validateDefinition(moduleId, kind, definition) {
  if (!definition || typeof definition !== "object") {
    throw new TypeError(`${moduleId}:${kind} 必须提供组件定义`);
  }
  if (typeof definition.render !== "function") {
    throw new TypeError(`${moduleId}:${kind} 缺少 render`);
  }
  for (const hook of ["prepare", "hydrate", "sync", "dispose"]) {
    if (definition[hook] !== undefined && typeof definition[hook] !== "function") {
      throw new TypeError(`${moduleId}:${kind}.${hook} 必须是函数`);
    }
  }
  return Object.freeze({...definition});
}

/** owner 可分散登记 reference / preview / cover，但同种能力只有一个实现。 */
export function registerModuleComponent(moduleId, kind, definition) {
  const id = identity(moduleId, kind);
  if (id.kind === "editor") {
    throw new TypeError("editor 不能作为通用组件");
  }
  const key = componentKey(id.moduleId, id.kind);
  if (registry.has(key)) {
    throw new TypeError(`模块组件重复登记：${key}`);
  }
  registry.set(key, validateDefinition(id.moduleId, id.kind, definition));
}

/**
 * 所有 owner 都有的保底嵌入能力。精确登记始终优先；fallback 只提供身份卡，
 * 不包含 editor、ROM 字段、编码或模块专有布局。
 */
export function registerModuleComponentFallback(kind, definition) {
  const normalizedKind = identity("fallback", kind).kind;
  if (normalizedKind === "editor") {
    throw new TypeError("editor 禁止 fallback");
  }
  if (fallbacks.has(normalizedKind)) {
    throw new TypeError(`模块组件 fallback 重复登记：${normalizedKind}`);
  }
  fallbacks.set(
    normalizedKind,
    validateDefinition("fallback", normalizedKind, definition),
  );
}

export function moduleComponentDefinition(moduleId, kind) {
  const id = identity(moduleId, kind);
  return registry.get(componentKey(id.moduleId, id.kind))
    || fallbacks.get(id.kind)
    || null;
}

/** 异步读取 owner 资源、目录或缓存；render 本身继续保持纯同步字符串函数。 */
export async function prepareModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  if (!definition.prepare) return props;
  const prepared = await definition.prepare({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
  });
  return prepared === undefined ? props : prepared;
}

/** owner 渲染根节点时带上这两个属性，通用水合器才能按模块把行为送回 owner。 */
function moduleComponentAttributes(moduleId, kind) {
  const id = identity(moduleId, kind);
  return `data-module-component-module="${esc(id.moduleId)}" `
    + `data-module-component-kind="${esc(id.kind)}"`;
}

/** 消费页唯一需要调用的渲染入口。具体 HTML 仍由 owner 的 render 决定。 */
export function renderModuleComponent(moduleId, kind, props = {}) {
  const id = identity(moduleId, kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) {
    throw new TypeError(`模块没有登记 ${id.kind} 组件：${id.moduleId}`);
  }
  return definition.render({
    ...props,
    moduleId: id.moduleId,
    componentKind: id.kind,
    componentAttributes: moduleComponentAttributes(id.moduleId, id.kind),
  });
}

function componentHosts(root) {
  if (!root) return [];
  const selector = "[data-module-component-module][data-module-component-kind]";
  return [
    ...(root.matches?.(selector) ? [root] : []),
    ...(root.querySelectorAll?.(selector) || []),
  ].filter(host => {
    const menu = host.closest(".module-reference-picker-menu");
    const picker = menu?.closest("[data-save-item-picker]");
    return !picker || Boolean(menu.closest("details.module-reference-picker")?.open);
  });
}

async function hydrateHost(host) {
  if (host.dataset.moduleComponentHydrated === "1") return;
  const pending = hydrationByHost.get(host);
  if (pending) return pending;
  const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
  const id = identity(moduleId, kind);
  const key = componentKey(id.moduleId, id.kind);
  const definition = moduleComponentDefinition(id.moduleId, id.kind);
  if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
  let resolveHydration;
  let rejectHydration;
  const hydration = new Promise((resolve, reject) => {
    resolveHydration = resolve;
    rejectHydration = reject;
  });
  // 先公布进行中的任务，再调用 owner hook。这样重入会复用同一个 Promise，
  // 而场景过滤/键盘绑定这类同步工作仍在 DOM 交给用户前立即完成。
  hydrationByHost.set(host, hydration);
  void (async () => {
    try {
      if (definition.hydrate) await definition.hydrate(host, {
        moduleId: id.moduleId,
        componentKind: id.kind,
      });
      host.dataset.moduleComponentHydrated = "1";
      resolveHydration();
    } catch (error) {
      rejectHydration(error);
    } finally {
      hydrationByHost.delete(host);
    }
  })();
  return hydration;
}

/**
 * 页面只调一次统一水合；首次渲染与局部刷新即使重叠，也会复用同一宿主正在进行的
 * Promise。模块 hook 只拿到自己的宿主，不会越过边界扫描或重复绑定相邻组件。
 */
export async function hydrateModuleComponents(root = document) {
  await Promise.all(componentHosts(root).map(hydrateHost));
}

/** Original 恢复或共享字段联动后，让各 owner 从原生控件重新同步自己的组件。 */
export function syncModuleComponents(root = document) {
  const groups = new Map();
  for (const host of componentHosts(root)) {
    const {moduleComponentModule: moduleId, moduleComponentKind: kind} = host.dataset;
    const id = identity(moduleId, kind);
    const key = componentKey(id.moduleId, id.kind);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(host);
  }
  for (const [key] of groups) {
    const [moduleId, ...kindParts] = key.split(":");
    const kind = kindParts.join(":");
    const definition = moduleComponentDefinition(moduleId, kind);
    if (!definition) throw new TypeError(`页面使用了未登记的模块组件：${key}`);
    definition.sync?.(root);
  }
}

/** 只供目录页与薄合同枚举能力；页面不能靠这个结果猜字段或保存方式。 */
