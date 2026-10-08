// @editor-module 外壳行为：导航栏收起、导航分组折叠与状态栏。

import {$} from "../core/dom.js";
import {editorLog} from "../core/editor-log.js";

const COLLAPSE_KEY = "mm-editor.nav-collapsed";

const SIDEBAR_COLLAPSE_KEY = "mm-editor.sidebar-collapsed";

export function bindSidebarToggle() {
  const button = $("#sidebar-toggle");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  const apply = collapsed => {
    document.body.dataset.sidebarCollapsed = String(collapsed);
    button.textContent = collapsed ? "›" : "‹";
    button.setAttribute("aria-expanded", String(!collapsed));
    const label = collapsed ? "展开导航栏" : "收起导航栏";
    button.setAttribute("aria-label", label);
    button.title = label;
  };
  try {
    apply(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true");
  } catch {
    apply(false);
  }
  button.addEventListener("click", () => {
    const collapsed = document.body.dataset.sidebarCollapsed !== "true";
    apply(collapsed);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(collapsed));
    } catch {
      // 浏览器禁止保存偏好时仍允许收起与展开。
    }
  });
}

function collapsedGroups() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function persistCollapsed(groups) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...groups]));
  } catch {
    // 隐私模式下 localStorage 可能不可写：折叠状态是便利功能，不值得中断渲染。
  }
}

/** 分组折叠。状态存本地，因为它是「这台机器上我怎么用」，不属于项目数据。 */
export function bindNavigationTree() {
  const nav = $("#navigation");
  if (!nav) return;
  const restore = () => {
    const collapsed = collapsedGroups();
    for (const group of nav.querySelectorAll(".nav-group")) {
      const name = group.dataset.group || "";
      group.dataset.collapsed = String(collapsed.has(name));
    }
  };
  restore();
  if (nav.dataset.navigationTreeBound === "1") return;
  nav.dataset.navigationTreeBound = "1";
  // 页面导航重新挂载时恢复分组折叠状态。
  new MutationObserver(restore).observe(nav, {childList: true});
  nav.addEventListener("click", event => {
    const label = event.target.closest(".nav-label");
    if (!label) return;
    const group = label.closest(".nav-group");
    if (!group) return;
    const name = group.dataset.group || "";
    const next = group.dataset.collapsed !== "true";
    group.dataset.collapsed = String(next);
    const store = collapsedGroups();
    if (next) store.add(name);
    else store.delete(name);
    persistCollapsed(store);
  });
}

/** 当前页面的行数、选中、未保存与地址统一交给日志服务驱动状态栏。 */
export function setStatus({rows, selection, dirty, address} = {}) {
  editorLog.setContext({rows, selection, dirty, address});
}

/**
 * 资源错误只上报统一日志，重试入口由日志页提供。
 */
export function setResourceAlert({title = "资源加载失败", detail = "", retry, error} = {}) {
  return editorLog.error("资源载入", `${title}：${detail}`, error, {retry});
}

/** 表格页的通用状态：可见行 / 总行数，以及未保存条数。 */
export function setTableStatus(visible, total, {dirty = 0, address = ""} = {}) {
  setStatus({
    rows: visible === total
      ? `${total} 行`
      : `${visible} / ${total} 行`,
    dirty: dirty ? `未保存 ${dirty}` : "",
    address,
  });
}

/**
 * 数据集事实：一行紧凑文字，不是一排数字方块。
 *
 * 旧版每页顶部铺 4-8 个 24px 大字方块，其中多数只是「表里有几行」——表格自己
 * 就在显示这件事，状态栏也在显示。方块把首屏让给了重复信息，真正的工作区被
 * 推到下面去了。
 *
 * 留下来的只有两种：表里数不出来的派生事实（去重后画面数、可达指令数），
 * 以及指向别处的资源链接。它们放在过滤条那一行，跟着表走。
 */
export function datasetFacts(entries) {
  const cells = entries
    .filter(entry => entry && entry[1] !== null && entry[1] !== undefined)
    .map(([label, value]) => `<span><i>${label}</i>${value}</span>`)
    .join("");
  return cells ? `<div class="dataset-facts">${cells}</div>` : "";
}
