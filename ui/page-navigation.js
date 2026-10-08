// @editor-module 页面导航、名称过滤与页面内的常驻对象列表。
import {esc} from "../core/dom.js";
import {editorPageGroups, EDITOR_PAGES, SHOP_PAGES} from "../core/editor-pages.js";
import {STORY_PAGE_DEFINITIONS} from "../core/story-view-config.js";
import {handleTextMarkup} from "./handle.js";

const storyPageIds = new Set(STORY_PAGE_DEFINITIONS.map(definition => definition.view));
const shopPageIds = new Set([...SHOP_PAGES.map(page => page.id), "jukebox", "vending"]);
const byteMapPageIds = new Set(["prg", "chr", "sram"]);
const bootPageIds = new Set(["boot-logo", "title"]);
const interfacePageIds = new Set(EDITOR_PAGES.filter(page => page.route.view === "interfaceui").map(page => page.id));
const itemPageIds = new Set(EDITOR_PAGES.filter(page => ["equipment", "items", "shells"].includes(page.route.view)).map(page => page.id));

function matches(route, current) {
  return Object.entries(route).every(([key, value]) => String(current[key]) === String(value));
}

function editorPageForRoute(current) {
  return EDITOR_PAGES.find(page => (page.objects || [page]).some(item => matches(item.route, current))) || null;
}

function pageRouteAttributes(route) {
  return Object.entries(route).map(([key, value]) => {
    const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    return `data-${name}="${esc(String(value))}"`;
  }).join(" ");
}

function pageRouteHref(route) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(route)) {
    params.set(key === "interfacePage" ? "interface" : key, value);
  }
  return `?${params}`;
}

function pageNavigationMarkup(storyNavigation) {
  return `<div class="page-nav-filter">
      <input type="text" data-page-name-filter aria-label="查找编辑页面" placeholder="查找编辑页面…" autocomplete="off">
      <small data-page-filter-count aria-live="polite"></small>
      <button type="button" data-page-filter-reset aria-label="清空页面过滤" hidden>×</button>
    </div>${editorPageGroups(storyNavigation).map(group => `<section class="nav-group" data-group="${esc(group.label)}">
      <button class="nav-label" type="button">${esc(group.label)}</button>
      ${group.children.map(page => `<button type="button" class="nav-item" data-editor-page="${esc(page.id)}"
        title="${esc(page.title || page.label)}"
        data-page-search="${esc([page.label, ...(page.objects || []).map(item => item.label)].join(" ").toLocaleLowerCase("zh-CN"))}"
        ${pageRouteAttributes(page.route)}>${storyPageIds.has(page.id) ? handleTextMarkup(page.label) : esc(page.label)}</button>`).join("")}
      ${group.label === "项目工具" ? `<details class="cache-control" data-cache-control>
        <summary>缓存 <small data-cache-total>正在统计…</small></summary>
        <div class="cache-control-items">
          <div><b>运行包数据</b><small data-cache-status="package">正在统计…</small>
            <button type="button" data-cache-clear="package" aria-label="清理运行包数据缓存">清理</button></div>
          <div><b>派生预览</b><small data-cache-status="preview">正在统计…</small>
            <button type="button" data-cache-clear="preview" aria-label="清理派生预览缓存">清理</button></div>
          <button type="button" data-cache-clear="all">全部清理</button>
        </div></details>` : ""}
    </section>`).join("")}`;
}

function applyPageNavigationFilters(root = document) {
  const nav = root.querySelector?.("#navigation") || root;
  const query = String(nav.querySelector("[data-page-name-filter]")?.value || "").trim().toLocaleLowerCase("zh-CN");
  const items = [...nav.querySelectorAll("[data-editor-page]")];
  for (const item of items) item.hidden = Boolean(query) && !item.dataset.pageSearch.includes(query);
  for (const group of nav.querySelectorAll(".nav-group")) {
    group.hidden = ![...group.querySelectorAll("[data-editor-page]")].some(item => !item.hidden);
  }
  nav.dataset.pageFilterActive = String(Boolean(query));
  const visible = items.filter(item => !item.hidden).length;
  nav.querySelector("[data-page-filter-count]").textContent = query ? `${visible}/${items.length}` : String(items.length);
  nav.querySelector("[data-page-filter-reset]").hidden = !query;
  return {visible, total: items.length, query};
}

export function mountPageNavigation({root = document, storyNavigation = []} = {}) {
  const nav = root.querySelector("#navigation");
  nav.innerHTML = pageNavigationMarkup(storyNavigation);
  if (nav.dataset.pageNavigationBound !== "1") {
    nav.dataset.pageNavigationBound = "1";
    nav.addEventListener("input", event => {
      if (event.target.matches("[data-page-name-filter]")) applyPageNavigationFilters(root);
    });
    nav.addEventListener("click", event => {
      if (!event.target.closest("[data-page-filter-reset]")) return;
      const input = nav.querySelector("[data-page-name-filter]");
      input.value = "";
      applyPageNavigationFilters(root);
      input.focus();
    });
  }
  applyPageNavigationFilters(root);
  return nav;
}

export function updatePageNavigation(current, root = document) {
  const page = editorPageForRoute(current);
  const entries = [...root.querySelectorAll("#navigation [data-editor-page]")];
  const screenEntry = entries.find(item => item.dataset.interfaceScreen
    && item.dataset.view === current.view && item.dataset.interfacePage === current.interfacePage
    && item.dataset.interfaceScreen === current.interfaceScreen);
  if (root.body) root.body.dataset.page = page?.id || "";
  if (root.body) root.body.dataset.pageFamily = storyPageIds.has(current.view) ? "story"
    : shopPageIds.has(page?.id) ? "shops"
    : byteMapPageIds.has(page?.id) ? "bytemap"
    : bootPageIds.has(page?.id) ? "boot"
    : interfacePageIds.has(page?.id) ? "interface"
    : itemPageIds.has(page?.id) ? "items" : "";
  for (const item of entries) {
    const active = screenEntry ? item === screenEntry : Boolean(page && item.dataset.editorPage === page.id);
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  const content = root.querySelector("#content");
  if (!content) return page;
  let body = content.closest(".editor-page-body");
  if (!body) {
    body = content.ownerDocument.createElement("div");
    body.className = "editor-page-body";
    content.before(body);
    const list = content.ownerDocument.createElement("nav");
    list.className = "page-objects";
    body.append(list, content);
  }
  const list = body.querySelector(".page-objects");
  list.hidden = !page?.objects;
  body.classList.toggle("has-page-objects", Boolean(page?.objects));
  content.dataset.editorPage = page?.id || "";
  list.setAttribute("aria-label", `${page?.label || "页面"}对象`);
  list.innerHTML = (page?.objects || []).map(item => {
    const active = matches(item.route, current);
    return `<a class="page-object${active ? " active" : ""}" data-page-object="${esc(item.id)}"
      ${pageRouteAttributes(item.route)} href="${esc(pageRouteHref(item.route))}"
      ${active ? 'aria-current="true"' : ""}>${esc(item.label)}</a>`;
  }).join("");
  list.querySelector(".active")?.scrollIntoView({block: "nearest"});
  return page;
}
