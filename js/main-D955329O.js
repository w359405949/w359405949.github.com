import { navigateInternalUrl, replaceHistoryUrl, acceptHistoryNavigation, restoreEditorHistory, applyInterfacePreviewSceneRoute, navigateView, bindInternalPageLinks, interfacePreviewContext, currentViewUrl, openRecord, configureEditorRenderer, configureEditorNavigation } from './ui-editor-nodes-CtPdwTyu.js';
import { suspendMetatileEditor, allowMetatileNavigation } from './metatile-edit-session-CjsiVVHM.js';
import { bindResourceQueries, resourceTargetRoute, navigateToResourceTarget, focusResourceTarget, bindWideTableWheelScrolling } from './preview-sound-DsPhxRYS.js';
import { loadSceneElevators, bindGroupedReferenceSelect } from './scene-elevators-N46oPTJC.js';
import { esc, bytes, $, showEditorError, hydrateModuleComponents, compactPageHeader, resourceLabel, flushCanvasViewportLayouts, restorePageHeader, editorErrorMarkup, bindStoryPageRecovery } from './element-tree-DsgOBeTK.js';
import { sceneDestinationUsersMarkup, bindSceneDestinationUsers } from './battle-result-state-machine-CED-HbAa.js';
import { stopAudioTimelines, bindControlledObjectUsers } from './teleport-hidden-links-IE1jgp1P.js';
import { editorLog, logProgressText, LOG_LEVELS, logEntryText, deletePackageCache, discardPackagePrefetch, packageCacheStats, RomLinker, sha256Hex, siteUrl } from './visual-metasprites-DJP54-bV.js';
import { db, watchAutoSaveState, hex, ACTIVE_PROJECT_ID, configureFieldObjectControls, flushAllAutoSaves, autoSaveBusy, autoSaveError, openActiveProjectStore, createStaticPackageBootstrapProvider, openProjectSessionFromPackage } from './battle-result-script-runtime-B_EClFew.js';
import { ensureVehicleDraft, loadEntityCatalog, entityDisplayRecords } from './vehicle-field-session-CBRi3Az7.js';
import { searchResourceHandles, resetViewData, prepareViewData } from './overview-CxFLx7O1.js';
import { romMapPercent, loadPhysicalFieldObjectCoverage, publishBuildState, reportBuildState, configureBrowserRomBuildProvider, createProjectStoreRomBuildProvider, SAVE_BUILD_BLOB_PREFIX } from './prg-loaders-BmwiQmdC.js';
import { prepareSaveEditorWorkspace } from './interface-pattern-banks-DmLVA2TH.js';
import { state, views } from './emulator-DynsZsth.js';
import { SHOP_PAGES, EDITOR_PAGES, editorPageForRoute, editorPageGroups, interfacePageDefinition, editorPageRoute, storyNavigationInfo } from './story-event-links-CRjG_25M.js';
import { prepareSaveEventLinks } from './timeline-player-y3hI_sah.js';
import { prepareGlobalEventFlags } from './facility-window-semantics-BvUme8Kk.js';
import { loadModuleCatalog } from './page-modules-C3rwAFeP.js';
import { STORY_PAGE_DEFINITIONS, EDITABLE_STORY_VIEW_IDS, applyStoryPageNames, storyEditableView, storyPlaybackView, storyPageDefinitionForView } from './package-schema-paths-gCIepLXx.js';
import { handleTextMarkup, deletePreviewCacheProject, previewCacheProjectStats, paintVisibleSceneThumbnailCanvases } from './preview-DMSrQMyk.js';
import { bindSidebarToggle, bindNavigationTree, flushFixedTextEditors, setResourceAlert, setStatus, ensureSequenceExecutions, bindRecordLinks, bindVirtualTables } from './pattern-pixel-editor-B8puYQ8A.js';
import './components-CzR4vjXT.js';
import { mountPageWorkingExchange, pageModuleEditorsMarkup, mountPageModuleEditors } from './working-exchange-BEt_dNlf.js';
import { pageRuntimeModulePaths, PAGE_RUNTIME_PATHS } from './page-runtime-paths-C0wxpxf1.js';
import './page-package-inputs-DcoC8ZQj.js';
import './attack-chr-tile-selector-DxIfuyLU.js';
import './reference-fields-DRprsJJr.js';

// @editor-module 将 DB 的真实加载批次与进度上报给日志服务。

let unsubscribe$1 = null;
let task = null;

function bindDbProgress() {
  unsubscribe$1?.();
  unsubscribe$1 = db.subscribeProgress(snapshot => {
    if (!snapshot.active) {
      task?.finish({message: "数据载入结束", progress: null});
      task = null;
      return;
    }
    const entry = {source: "数据载入", message: "载入数据", details: snapshot.labels.join("、"),
      progress: {current: snapshot.done, total: snapshot.total}};
    if (!task) task = editorLog.startTask(entry);
    else task.update(entry);
  });
}

// @editor-module 从统一日志服务呈现全局任务与消息并绑定日志入口。

function bindLogStatus(openLog) {
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

// @editor-module 筛选会话日志并提供详情、调用栈、复制与失败重试。

let source = "";
let level = "";
let visibleCount = 200;
const expanded = new Set();
let unsubscribe = null;

const filteredEntries = () => editorLog.entries().filter(entry => (!source || entry.source === source)
  && (!level || entry.level === level));

function renderLog() {
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

function bindLog() {
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

// @editor-module 项目概览展示 ROM 基线、物理布局与覆盖。


function renderHome() {
  const project = state.project || {};
  const manifest = project.manifest || {};
  const rom = manifest.rom || {};
  const coverage = manifest.coverage || {};
  const summary = project.summary || {};
  const resources = project.resource_index?.summary || {};
  const chrReference = project.resource_index?.chr_reference || {};
  // 反向引用图不再进首屏，被引用的 bank 由 chr_reference 直接给。
  const chrReferencedBanks = Array.isArray(chrReference.bank_ids)
    ? new Set(chrReference.bank_ids).size
    : Object.values(chrReference.sources_by_bank || {})
      .filter(sources => sources.length).length;
  const prgBanks = Math.ceil(Number(rom.prg_rom_bytes || 0) / 0x2000);
  const chrBanks = Math.ceil(Number(rom.chr_rom_bytes || 0) / 0x400);
  const physicalCoverage = Number(coverage.covered_bytes || 0) === Number(rom.file_bytes || -1)
    ? "100%" : `${Number(coverage.covered_bytes || 0).toLocaleString()} B`;
  return `<div class="visual-stats home-stats">
      <div><b>${esc(rom.format || "—")}</b><span>卡带格式</span></div>
      <div><b>${rom.mapper ?? "—"}</b><span>Mapper / MMC3 系</span></div>
      <div><b>${bytes(Number(rom.prg_rom_bytes || 0))}</b><span>PRG-ROM · ${prgBanks}×8 KiB</span></div>
      <div><b>${bytes(Number(rom.chr_rom_bytes || 0))}</b><span>CHR-ROM · ${chrBanks}×1 KiB</span></div>
      <div><b>${physicalCoverage}</b><span>物理布局覆盖</span></div>
    </div>
    <div class="section-line"><h2>ROM 基线</h2><span>INES HEADER VERIFIED</span></div>
    <div class="table-wrap home-rom-table"><table>
      <thead><tr><th>属性</th><th>当前值</th></tr></thead>
      <tbody>
        <tr><td title="ROM 导入履历">导入来源</td><td><b>${esc(rom.source_name || "—")}</b></td></tr>
        <tr><td title="导入基线哈希">SHA-256</td><td class="mono home-rom-hash">${esc(rom.sha256 || "—")}</td></tr>
        <tr><td>格式 / Mapper</td><td class="mono">${esc(rom.format || "—")} / ${rom.mapper ?? "—"}${rom.submapper != null ? `.${rom.submapper}` : ""}</td></tr>
        <tr><td>镜像 / 存档</td><td>${esc(rom.mirroring || "—")} / ${rom.battery ? "电池 SRAM" : "无电池"}</td></tr>
        <tr><td title="总大小 ${bytes(Number(rom.file_bytes || 0))}">文件结构</td><td class="mono">HEADER ${bytes(Number(rom.header_bytes || 0))} · TRAINER ${bytes(Number(rom.trainer_bytes || 0))} · TRAILING ${bytes(Number(rom.trailing_bytes || 0))}</td></tr>
        <tr><td>原始头</td><td class="mono">${esc(rom.header_hex || "—")}</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>物理布局</h2><span>FILE OFFSETS</span></div>
    <div class="table-wrap home-layout-table"><table>
      <thead><tr><th>区域</th><th>文件起点</th><th>容量</th><th>Bank 粒度</th><th>状态</th></tr></thead>
      <tbody>
        <tr><td><b>iNES HEADER</b></td><td class="mono">0x000000</td><td>${bytes(Number(rom.header_bytes || 0))}</td><td>固定 16 B</td><td>完整保留</td></tr>
        <tr><td><b>PRG-ROM</b></td><td class="mono">${hex(Number(rom.prg_file_offset || 0), 6)}</td><td>${bytes(Number(rom.prg_rom_bytes || 0))}</td><td>${prgBanks} × 8 KiB</td><td>代码、配置、文本与内容资源</td></tr>
        <tr><td><b>CHR-ROM</b></td><td class="mono">${hex(Number(rom.chr_file_offset || 0), 6)}</td><td>${bytes(Number(rom.chr_rom_bytes || 0))}</td><td>${chrBanks} × 1 KiB</td><td>NES 2bpp 图块连续平铺</td></tr>
      </tbody>
    </table></div>
    <div class="section-line"><h2>字段对象覆盖</h2><button class="button ghost" type="button"
      data-home-field-coverage-load>统计字段对象覆盖</button></div>
    <div class="table-wrap"><table data-home-field-coverage>
      <thead><tr><th>空间</th><th>字段对象</th><th>覆盖字节</th><th>未覆盖</th></tr></thead>
      <tbody>${[["prg", "PRG", "bytemap-prg"], ["chr", "CHR", "bytemap-chr"],
        ["sram", "SRAM", "bytemap-sram"]].map(([space, label, view]) => `<tr data-home-field-space="${space}" data-home-view="${view}" role="link" tabindex="0" title="${label} 字节地图">
        <td>${label} ↗</td><td data-home-field-objects>按需统计</td>
        <td data-home-field-total>按需统计</td><td data-home-field-uncovered>按需统计</td>
      </tr>`).join("")}</tbody>
    </table></div>
    <div class="section-line"><h2>解析覆盖</h2><span>PHYSICAL ≠ SEMANTIC</span></div>
    <div class="table-wrap home-coverage-table"><table>
      <thead><tr><th>指标</th><th>数量 / 状态</th></tr></thead>
      <tbody>
        <tr><td title="${Number(coverage.covered_bytes || 0).toLocaleString()} / ${Number(rom.file_bytes || 0).toLocaleString()} 字节">规范物理布局</td><td><b>${esc(coverage.canonical_layout || "—")}</b> · ${physicalCoverage}</td></tr>
        <tr><td title="${summary.canonical_sections || 0} 个规范分段">语义资产</td><td><b>${summary.semantic_assets || 0}</b> 项</td></tr>
        <tr><td title="${resources.kinds || 0} 类 · ${resources.addressed_records || 0} 行拥有直接物理地址">可寻址资源</td><td><b>${resources.records || 0}</b> 行</td></tr>
        <tr><td title="${resources.unresolved_references || 0} 条未解析引用">资源关联</td><td><b>${resources.resolved_references || 0} / ${resources.references || 0}</b></td></tr>
        <tr><td title="已知功能与配置显式指向的 1 KiB bank">CHR 已知引用</td><td><b>${chrReferencedBanks.toLocaleString()} / ${Number(chrReference.total_banks || chrBanks).toLocaleString()}</b> banks · ${romMapPercent(chrReferencedBanks, chrReference.total_banks || chrBanks)}</td></tr>
        <tr><td>编辑版本</td><td><b>原始版本 / 编辑版本</b></td></tr>
        <tr><td>派生预览</td><td><b>${summary.derived_previews || 0}</b> 项</td></tr>
      </tbody>
    </table></div>`;
}

function bindHomeFieldCoverage() {
  const table = document.querySelector("[data-home-field-coverage]");
  const button = document.querySelector("[data-home-field-coverage-load]");
  if (!table || !button) return;
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "统计中…";
    try {
      const coverage = await loadPhysicalFieldObjectCoverage();
      if (!table.isConnected) return;
      for (const [space, count] of Object.entries(coverage)) {
        const row = table.querySelector(`[data-home-field-space="${space}"]`);
        if (!row) continue;
        row.dataset.homeFieldUncovered = String(count.uncovered);
        row.querySelector("[data-home-field-objects]").textContent = count.objects.toLocaleString();
        row.querySelector("[data-home-field-total]").textContent = count.total.toLocaleString();
        row.querySelector("[data-home-field-uncovered]").textContent = count.uncovered.toLocaleString();
      }
      button.textContent = "已统计";
    } catch (error) {
      editorLog.error("项目统计", `操作失败：${error?.message || error}`, error);
      if (!table.isConnected) return;
      table.querySelectorAll("[data-home-field-objects]").forEach(node => {
        node.textContent = `统计失败：${error.message}`;
      });
      button.disabled = false;
      button.textContent = "重试统计";
    }
  });
}

// @editor-module 页面导航、名称过滤与页面内的常驻对象列表。

const storyPageIds = new Set(STORY_PAGE_DEFINITIONS.map(definition => definition.view));
const shopPageIds = new Set([...SHOP_PAGES.map(page => page.id), "jukebox", "vending"]);
const byteMapPageIds = new Set(["prg", "chr", "sram"]);
const bootPageIds = new Set(["boot-logo", "title"]);
const interfacePageIds = new Set(EDITOR_PAGES.filter(page => page.route.view === "interfaceui").map(page => page.id));
const itemPageIds = new Set(EDITOR_PAGES.filter(page => ["equipment", "items", "shells"].includes(page.route.view)).map(page => page.id));

function matches(route, current) {
  return Object.entries(route).every(([key, value]) => String(current[key]) === String(value));
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

function mountPageNavigation({root = document, storyNavigation = []} = {}) {
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

function updatePageNavigation(current, root = document) {
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

// @editor-module 合并页面在页内切换既有流程入口。

function pageVariantsMarkup(page, current) {
  if (!page?.variants?.length) return '';
  const selected = page.variants.filter(variant => Object.entries(variant.route).every(([key, value]) =>
    key === 'facility' || String(current[key]) === String(value)))
    .sort((a, b) => Object.keys(b.route).length - Object.keys(a.route).length)[0];
  return `<div class="data-editor-toolbar" data-page-variants="${esc(page.id)}"><label>流程实例
    <select data-page-variant aria-label="${esc(page.label)}流程实例">${page.variants.map(variant =>
      `<option value="${esc(variant.id)}"${variant === selected ? ' selected' : ''}>${esc(variant.label)}</option>`).join('')}</select>
    </label></div>`;
}

function bindPageVariants(root, page) {
  root.querySelector('[data-page-variant]')?.addEventListener('change', event => {
    const variant = page.variants.find(variant => variant.id === event.target.value);
    if (!variant) return;
    const params = new URLSearchParams(Object.entries(variant.route)
      .filter(([key]) => key !== 'interface')
      .map(([key, value]) => [key === 'interfacePage' ? 'interface' : key, value]));
    void navigateInternalUrl(new URL(`?${params}`, location.href));
  });
}

// @editor-module 显示缓存占用并提供后台填充、取消与清理。

const formatBytes = bytes => {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
};

let refreshTimer = null;
let clearing = false;
let fillJob = null;
let fillStatus = "";
const projectId = () => state.projectRepository?.projectId || ACTIVE_PROJECT_ID;
const controls = root => [
  ...(root.matches?.("[data-cache-control]") ? [root] : []),
  ...(root.querySelectorAll?.("[data-cache-control]") || []),
];

function renderFillControls(root) {
  controls(root).forEach(control => {
    const fill = control.querySelector("[data-cache-fill]");
    if (fill) {fill.hidden = Boolean(fillJob); fill.disabled = clearing;}
    const cancel = control.querySelector("[data-cache-cancel]");
    if (cancel) {cancel.hidden = !fillJob; cancel.disabled = Boolean(fillJob?.cancelling);}
    const status = control.querySelector("[data-cache-fill-status]");
    if (status) {status.hidden = !fillStatus; status.textContent = fillStatus;}
  });
}

function startFill(root) {
  if (fillJob || clearing) return;
  const task = editorLog.startTask({source: "后台准备", message: "填满缓存"});
  fillStatus = "正在整理页面输入…";
  try {
    const worker = new Worker(new URL("./package-cache-fill-worker.js", new URL("../ui/cache-control.js", import.meta.url).href), {type: "module"});
    let resolve;
    const done = new Promise(finish => {resolve = finish;});
    const job = {worker, done, cancelling: false};
    fillJob = job;
    const finish = (message, error) => {
      worker.terminate();
      if (fillJob === job) fillJob = null;
      fillStatus = message;
      task.finish({message, ...(error ? {level: "error", error} : {})});
      resolve();
      renderFillControls(root);
      void refreshCacheControls(root);
    };
    worker.onmessage = event => {
      const {type, progress, message} = event.data;
      if (progress) {
        job.progress = progress;
        fillStatus = progress.phase === "planning" ? "正在整理页面输入…"
          : `${progress.completed}/${progress.total} 项 · 新增 ${progress.filled} · 已有 ${progress.skipped}`;
        renderFillControls(root);
        scheduleRefresh(root);
      }
      if (type === "complete") finish(`填充完成 · ${fillStatus}`);
      else if (type === "cancelled") finish(`已取消${job.progress?.total ? ` · ${job.progress.completed}/${job.progress.total} 项` : ""}`);
      else if (type === "error") finish(`缓存填充失败：${message}`, new Error(message));
    };
    worker.onerror = event => finish(`缓存填充失败：${event.message}`, new Error(event.message));
    worker.postMessage({type: "fill", manifest: state.browserPackageManifest});
  } catch (error) {
    fillStatus = `缓存填充失败：${error.message}`;
    task.finish({level: "error", message: fillStatus, error});
  }
  renderFillControls(root);
}

async function cancelFill(root) {
  if (!fillJob) return;
  const job = fillJob;
  job.cancelling = true;
  job.worker.postMessage({type: "cancel"});
  renderFillControls(root);
  await job.done;
}

async function refreshCacheControls(root = document) {
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
  renderFillControls(root);
  return stats;
}

function scheduleRefresh(root, delay = 250) {
  if (refreshTimer !== null) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshCacheControls(root);
  }, delay);
}

function bindCacheControls(root = document) {
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
    if (event.target.closest?.("[data-cache-fill]")) {startFill(root); return;}
    if (event.target.closest?.("[data-cache-cancel]")) {await cancelFill(root); return;}
    const button = event.target.closest?.("[data-cache-clear]");
    if (!button || clearing) return;
    const category = button.dataset.cacheClear;
    const requestedProjectId = projectId();
    clearing = true;
    controls(root).forEach(control => control.querySelectorAll("[data-cache-clear]")
      .forEach(item => {item.disabled = true;}));
    const task = editorLog.startTask({source: "后台准备", message: "清理缓存"});
    try {
      if (category === "package" || category === "all") await cancelFill(root);
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
      if (category === "package" || category === "all") fillStatus = "";
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

// @editor-module 将快速构建交给 Worker，映射回当前项目的构建状态。
let buildWorker = null;

async function runQuickBuild({onEvent} = {}) {
  if (state.browserBuildRunning) throw new Error("已有一个 ROM 构建正在进行");
  const worker = buildWorker ||= new Worker(new URL("./quick-build-worker.js", new URL("../ui/quick-build.js", import.meta.url).href), {type: "module"});
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

var profile = {"bank_bytes":8192,"first_bank":64,"end_bank_exclusive":126,"boot_bank":125,"result_cpu":768,"stub":{"bank":127,"cpu":58757,"capacity":361,"evidence":"project/evidence/reverse-engineering/story-script-space-coverage/observations.json"},"reset":{"bank":127,"bank_offset":8188},"program":{"bank_offset":512,"cpu":1024,"capacity":512},"loader":{"bank_offset":256,"length":20},"executor":{"bank_offset":64,"length":9},"font":{"bank":35,"cpu":47104,"length":2048}};

// @editor-module 为扩容 ROM 准备复位短桩、RAM 检测程序与扩展区执行片段。


const BOOT_BANK = profile.boot_bank;
const STUB_CPU = profile.stub.cpu;
const STUB_CAPACITY = profile.stub.capacity;
const PROGRAM_CPU = profile.program.cpu;
const PROGRAM_CAPACITY = profile.program.capacity;
const RESULT = profile.result_cpu;

function program(origin) {
  const bytes = [], labels = new Map(), fixups = [];
  const emit = (...values) => bytes.push(...values);
  const label = name => labels.set(name, origin + bytes.length);
  const absolute = (opcode, target) => {
    emit(opcode, 0, 0);
    fixups.push({at: bytes.length - 2, target});
  };
  const branch = (opcode, target) => {
    emit(opcode, 0);
    fixups.push({at: bytes.length - 1, target, relative: true});
  };
  const finish = () => {
    for (const {at, target, relative} of fixups) {
      const address = labels.get(target);
      if (address === undefined) throw new Error(`检测程序缺少标签 ${target}`);
      const value = relative ? address - (origin + at + 1) : address;
      if (relative && (value < -128 || value > 127)) throw new Error(`检测程序分支越界 ${target}`);
      bytes[at] = value & 255;
      if (!relative) bytes[at + 1] = value >> 8;
    }
    return Uint8Array.from(bytes);
  };
  return {emit, label, absolute, branch, finish, labels};
}

function tiles(text) {
  return Array.from(text, character => character === " " ? 127 :
    character === "-" ? 98 : parseInt(character, 36));
}

function mapBank(emit, register, bank) {
  emit(0xA9, register, 0x8D, 0, 0x80, 0xA9, bank, 0x8D, 1, 0x80);
}

function ppuAddress(emit, address) {
  emit(0xA9, address >> 8, 0x8D, 6, 0x20, 0xA9, address & 255, 0x8D, 6, 0x20);
}

function prepareExpandedRomTest() {
  const stub = program(STUB_CPU);
  const {emit: s, label: sl, absolute: sa, branch: sb} = stub;
  s(0x78, 0xD8, 0xA2, 255, 0x9A, 0xA9, 0,
    0x8D, 0, 0x20, 0x8D, 1, 0x20, 0x8D, 0, 0xE0);
  sl("warm1"); s(0x2C, 2, 0x20); sb(0x10, "warm1");
  sl("warm2"); s(0x2C, 2, 0x20); sb(0x10, "warm2");
  mapBank(s, 0x87, BOOT_BANK);
  s(0xAD, 0, 0xA0, 0xC9, 0x4D); sb(0xD0, "bootFail");
  s(0xAD, 8, 0xA0, 0xC9, BOOT_BANK); sb(0xD0, "bootFail");
  s(0x4C, profile.loader.bank_offset & 255, 0xA0 + (profile.loader.bank_offset >> 8));
  sl("bootFail");
  s(0xA9, 2, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3,
    0xA9, BOOT_BANK, 0x8D, 2, 3);
  sa(0x20, "font");
  ppuAddress(s, 0x2146);
  s(0xA2, 0); sl("failText"); sa(0xBD, "failure");
  s(0x8D, 7, 0x20, 0xE8, 0xE0, 22); sb(0xD0, "failText");
  sa(0x4C, "waitKey");

  sl("font");
  mapBank(s, 0x87, profile.font.bank);
  mapBank(s, 0x82, 8);
  mapBank(s, 0x83, 9);
  s(0xAD, 2, 0x20, 0xA9, 0, 0x85, 0, 0x8D, 6, 0x20, 0x8D, 6, 0x20,
    0xA9, profile.font.cpu >> 8, 0x85, 1, 0xA0, 0);
  sl("fontCopy"); s(0xB1, 0, 0x8D, 7, 0x20, 0xC8); sb(0xD0, "fontCopy");
  s(0xE6, 1, 0xA5, 1, 0xC9, (profile.font.cpu + profile.font.length) >> 8); sb(0xD0, "fontCopy");
  ppuAddress(s, 0x07F0);
  s(0xA2, 16, 0xA9, 0); sl("blank"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "blank");
  ppuAddress(s, 0x2000);
  s(0xA0, 4, 0xA2, 0, 0xA9, 127); sl("clear"); s(0x8D, 7, 0x20, 0xE8); sb(0xD0, "clear");
  s(0x88); sb(0xD0, "clear");
  ppuAddress(s, 0x23C0);
  s(0xA2, 64, 0xA9, 0); sl("attributes"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "attributes");
  ppuAddress(s, 0x3F00);
  s(0xA9, 15, 0x8D, 7, 0x20, 0xA2, 3, 0xA9, 0x30);
  sl("palette"); s(0x8D, 7, 0x20, 0xCA); sb(0xD0, "palette");
  s(0x60);

  sl("waitKey");
  s(0xA9, 0, 0x8D, 0, 0x20, 0x8D, 5, 0x20, 0x8D, 5, 0x20,
    0xA9, 0x0A, 0x8D, 1, 0x20);
  sa(0x20, "key"); sb(0xD0, "waitKey");
  sl("press"); sa(0x20, "key"); sb(0xF0, "press");
  s(0xA9, 0, 0x8D, 1, 0x20, 0x4C, 0x3B, 0xFF);
  sl("key");
  s(0xA9, 1, 0x8D, 0x16, 0x40, 0xA9, 0, 0x8D, 0x16, 0x40,
    0xA2, 8, 0x85, 2);
  sl("keyBit"); s(0xAD, 0x16, 0x40, 0x4A, 0x26, 2, 0xCA); sb(0xD0, "keyBit");
  s(0xA5, 2, 0x60);
  sl("failure"); s(...tiles(`FAIL BANKS 00 FIRST ${BOOT_BANK.toString(16).toUpperCase()}`));
  const stubBytes = stub.finish();
  if (stubBytes.length > STUB_CAPACITY) throw new Error(`复位短桩超过现场未读取范围：${stubBytes.length}`);

  const runtime = program(PROGRAM_CPU);
  const {emit: e, label: l, absolute: a, branch: b} = runtime;
  const callStub = name => e(0x20, stub.labels.get(name) & 255, stub.labels.get(name) >> 8);
  e(0xA9, 1, 0x8D, 0, 3, 0xA9, 0, 0x8D, 1, 3, 0xA9, 255, 0x8D, 2, 3,
    0xA9, profile.first_bank, 0x8D, 3, 3);
  l("bank");
  e(0xA9, 0x87, 0x8D, 0, 0x80, 0xAD, 3, 3, 0x8D, 1, 0x80, 0xA2, 7);
  l("check"); e(0xBD, 0, 0xA0); a(0xDD, "marker"); b(0xD0, "bad");
  e(0xCA); b(0x10, "check");
  e(0xAD, 8, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0x49, 255, 0xCD, 9, 0xA0); b(0xD0, "bad");
  e(0xAD, 10, 0xA0, 0xC9, 0x74); b(0xD0, "bad");
  e(0xAD, 11, 0xA0, 0xC9, 0xA5); b(0xD0, "bad");
  e(0xAD, 12, 0xA0, 0xCD, 3, 3); b(0xD0, "bad");
  e(0xAD, 13, 0xA0, 0x0D, 14, 0xA0, 0x0D, 15, 0xA0); b(0xD0, "bad");
  e(0xA2, profile.executor.length - 1);
  l("codeCheck"); e(0xBD, profile.executor.bank_offset, 0xA0); a(0xDD, "executor"); b(0xD0, "bad");
  e(0xCA); b(0x10, "codeCheck");
  e(0xA9, 0, 0x8D, 4, 3, 0x20, profile.executor.bank_offset, 0xA0,
    0xAD, 3, 3, 0x49, 0xA5, 0xCD, 4, 3); b(0xF0, "good");
  l("bad"); e(0xA9, 2, 0x8D, 0, 3, 0xAD, 2, 3, 0xC9, 255); b(0xD0, "next");
  e(0xAD, 3, 3, 0x8D, 2, 3); a(0x4C, "next");
  l("good"); e(0xEE, 1, 3);
  l("next"); e(0xEE, 3, 3, 0xAD, 3, 3, 0xC9, profile.end_bank_exclusive); b(0xF0, "display"); a(0x4C, "bank");
  l("display"); callStub("font");

  const row = (address, text, name) => {
    ppuAddress(e, address);
    e(0xA2, 0); l(name); a(0xBD, `${name}Text`); e(0x8D, 7, 0x20, 0xE8, 0xE0, text.length); b(0xD0, name);
  };
  row(0x2106, "EXPANDED ROM TEST", "title");
  ppuAddress(e, 0x2168);
  e(0xAD, 0, 3, 0xC9, 1); b(0xD0, "failed");
  for (const byte of tiles("PASS")) e(0xA9, byte, 0x8D, 7, 0x20);
  a(0x4C, "count");
  l("failed"); for (const byte of tiles("FAIL")) e(0xA9, byte, 0x8D, 7, 0x20);
  l("count"); row(0x21C6, "BANKS ", "banks");
  e(0xAD, 1, 3, 0xA2, 0);
  l("decimal"); e(0xC9, 10); b(0x90, "digits"); e(0x38, 0xE9, 10, 0xE8); a(0x4C, "decimal");
  l("digits"); e(0x48, 0x8E, 7, 0x20, 0x68, 0x8D, 7, 0x20);
  const totalText = `OF ${profile.end_bank_exclusive - profile.first_bank}`;
  row(0x21D1, totalText, "total");
  row(0x2206, "FIRST ", "first");
  e(0xAD, 2, 3, 0xC9, 255); b(0xD0, "firstBank");
  e(0xA9, 98, 0x8D, 7, 0x20, 0x8D, 7, 0x20); a(0x4C, "prompt");
  l("firstBank"); e(0x48, 0x4A, 0x4A, 0x4A, 0x4A, 0x8D, 7, 0x20, 0x68, 0x29, 15, 0x8D, 7, 0x20);
  l("prompt"); row(0x2266, "PRESS ANY BUTTON", "buttons");
  e(0x4C, stub.labels.get("waitKey") & 255, stub.labels.get("waitKey") >> 8);
  for (const [name, text] of [["title", "EXPANDED ROM TEST"], ["banks", "BANKS "],
    ["total", totalText], ["first", "FIRST "], ["buttons", "PRESS ANY BUTTON"]]) {
    l(`${name}Text`); e(...tiles(text));
  }
  l("marker"); e(...new TextEncoder().encode("MMEXP74"), 0);
  const executor = Uint8Array.from([0xAD, 8, 0xA0, 0x49, 0xA5, 0x8D, 4, 3, 0x60]);
  l("executor"); e(...executor);
  const runtimeBytes = runtime.finish();
  if (runtimeBytes.length > PROGRAM_CAPACITY) throw new Error("扩展区检测程序超过 RAM 载入容量");
  const loader = program(0xA000 + profile.loader.bank_offset);
  loader.emit(0xA2, 0);
  loader.label("copy");
  for (let page = 0; page < PROGRAM_CAPACITY / 256; page++) {
    loader.emit(0xBD, profile.program.bank_offset & 255, 0xA0 + (profile.program.bank_offset >> 8) + page,
      0x9D, PROGRAM_CPU & 255, (PROGRAM_CPU >> 8) + page);
  }
  loader.emit(0xE8);
  loader.branch(0xD0, "copy");
  loader.emit(0x4C, PROGRAM_CPU & 255, PROGRAM_CPU >> 8);
  const loaderBytes = loader.finish();
  if (loaderBytes.length !== profile.loader.length) throw new Error("扩展区载入程序长度与声明不符");
  return {stubBytes, runtimeBytes, loaderBytes, executor, bootBank: BOOT_BANK,
    firstBank: profile.first_bank, endBankExclusive: profile.end_bank_exclusive,
    bankBytes: profile.bank_bytes, executorOffset: profile.executor.bank_offset,
    stubPrgOffset: profile.stub.bank * profile.bank_bytes + STUB_CPU - 0xE000,
    resetPrgOffset: profile.reset.bank * profile.bank_bytes + profile.reset.bank_offset,
    programPrgOffset: BOOT_BANK * profile.bank_bytes + profile.program.bank_offset,
    loaderPrgOffset: BOOT_BANK * profile.bank_bytes + profile.loader.bank_offset,
    resetBytes: Uint8Array.from([STUB_CPU & 255, STUB_CPU >> 8]),
    resultCpu: RESULT, programCpu: PROGRAM_CPU, stubCapacity: STUB_CAPACITY,
    evidence: profile.stub.evidence, programCapacity: PROGRAM_CAPACITY};
}

// @editor-module 准备 mapper 74 扩展布局与可选诊断片段，由 RomLinker 写入。

const EXPANDED_PRG_BYTES = 1024 * 1024;
const ORIGINAL_PRG_BYTES = 512 * 1024;
const BANK_BYTES = 8192;
const READER = Uint8Array.from([0xA2, 0, 0xBD, 0, 0xA0, 0x9D, 0, 5, 0xE8, 0xE0, 16, 0xD0, 0xF5, 0x60]);

function inspectExpansionSource(source) {
  if (!(source instanceof Uint8Array) || source.length < 16 ||
      source[0] !== 0x4E || source[1] !== 0x45 || source[2] !== 0x53 || source[3] !== 0x1A) {
    throw new Error("扩容需要 NES ROM");
  }
  const format = source[7] & 12;
  const mapper = (source[6] >> 4) | (source[7] & 0xF0) |
    (format === 8 ? (source[8] & 15) << 8 : 0);
  const prgUnits = source[4] | (format === 8 ? (source[9] & 15) << 8 : 0);
  const chrUnits = source[5] | (format === 8 ? (source[9] >> 4) << 8 : 0);
  if (![0, 8].includes(format) || source[6] & 4 || mapper !== 74 ||
      prgUnits !== 32 || chrUnits !== 32 || source.length !== 16 + 768 * 1024) {
    throw new Error("扩容仅支持无 trainer 的 mapper 74、512 KiB PRG、256 KiB CHR ROM");
  }
}

async function createExpandedRom(source, {nes2 = false, diagnostic = false} = {}) {
  const alreadyExpanded = source instanceof Uint8Array && source[4] === 64 &&
    source.length === 16 + EXPANDED_PRG_BYTES + 256 * 1024;
  // 已扩展输入保留新增区的当前字节；诊断只应用明确列出的补丁。
  const original = alreadyExpanded ? RomLinker.originalRom(source, ORIGINAL_PRG_BYTES) : source;
  inspectExpansionSource(original);
  const header = source.slice(0, 16);
  header[4] = EXPANDED_PRG_BYTES / 16384;
  if (nes2) {
    header[7] = 0x48;
    header.set([0, 0, 0x70, 5, 0, 0, 0, 0], 8);
  }
  const fragments = [];
  const markers = [];
  const test = diagnostic ? prepareExpandedRomTest() : null;
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    const marker = new Uint8Array(16);
    marker.set(new TextEncoder().encode("MMEXP74"));
    marker.set([bank, bank ^ 255, 0x74, 0xA5, bank, 0, 0, 0], 8);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes: marker});
    fragments.push({offset: 16 + bank * BANK_BYTES + 0x20, bytes: READER});
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(marker, byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0xA020, kind: "written-marker"});
  }
  const fixedBankMirrors = {};
  for (let index = 0; index < 2; index++) {
    const bank = 0x7E + index;
    const sourceBank = ORIGINAL_PRG_BYTES / BANK_BYTES - 2 + index;
    const bytes = source.slice(16 + sourceBank * BANK_BYTES, 16 + (sourceBank + 1) * BANK_BYTES);
    fragments.push({offset: 16 + bank * BANK_BYTES, bytes});
    fixedBankMirrors[sourceBank.toString(16).toUpperCase()] = bank.toString(16).toUpperCase();
    markers.push({bank, prg_offset: bank * BANK_BYTES,
      marker: Array.from(bytes.slice(0, 16), byte => byte.toString(16).padStart(2, "0")).join(""),
      reader_cpu: 0x0440, kind: "fixed-bank-mirror-signature"});
  }
  const bootPatches = test ? [
    {offset: 16 + test.stubPrgOffset, bytes: test.stubBytes},
    {offset: 16 + test.resetPrgOffset, bytes: test.resetBytes},
    {offset: 16 + test.programPrgOffset, bytes: test.runtimeBytes},
    {offset: 16 + test.loaderPrgOffset, bytes: test.loaderBytes},
  ] : [];
  for (let bank = 0x40; diagnostic && bank < 0x7E; bank++) {
    bootPatches.push({offset: 16 + bank * test.bankBytes + test.executorOffset, bytes: test.executor});
  }
  fragments.push(...bootPatches);
  const rom = alreadyExpanded ? RomLinker.applyFragments(source, {header, fragments}) :
    RomLinker.expandRom(source, {header, originalPrgBytes: ORIGINAL_PRG_BYTES,
    expandedPrgBytes: EXPANDED_PRG_BYTES, fragments});
  return {rom, markers, report: {output_sha256: await sha256Hex(rom),
    bytes: rom.length, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
    added_prg_bytes: EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES,
    usable_added_prg_bytes: 62 * BANK_BYTES,
    original_prg_chr_preserved: true, fixed_bank_mirrors: fixedBankMirrors,
    layout: {mapper: 74, prg_bytes: EXPANDED_PRG_BYTES, chr_bytes: 256 * 1024,
      diagnostic},
    boot_test: test ? {banks: test.endBankExclusive - test.firstBank,
      first_bank: test.firstBank, last_bank: test.endBankExclusive - 1,
      result_cpu: test.resultCpu, program_cpu: test.programCpu, boot_bank: test.bootBank,
      patches: bootPatches.map(({offset, bytes}) => ({space: "prg", offset: offset - 16,
        file_offset: offset, bytes: bytes.length})),
      stub_original_prg_offset: test.stubPrgOffset - (EXPANDED_PRG_BYTES - ORIGINAL_PRG_BYTES),
      stub_evidence: test.evidence} : null}};
}

async function storeExpandedRomBuild(repository, output, sourceBuild) {
  const buildId = await sha256Hex(new TextEncoder().encode(
    `${sourceBuild.build_id}:${output.report.output_sha256}:${crypto.randomUUID()}`,
  ));
  const createdAt = new Date().toISOString();
  const sourceSave = await repository.getBlob(`save-build:${sourceBuild.build_id}`);
  if (!sourceSave) throw new Error(`构建 ${sourceBuild.build_id} 没有同号存档`);
  await repository.putBlob(`rom-build:${buildId}`, new Blob([output.rom], {
    type: "application/x-nes-rom",
  }), {
    kind: "rom-build", build_id: buildId, created_at: createdAt,
    name: "metalmaxcn-diagnostic.nes", output_sha256: output.report.output_sha256,
  });
  await repository.putBlob(`save-build:${buildId}`, sourceSave.data, {
    kind: "save-build", build_id: buildId, created_at: createdAt,
    save_sha256: sourceSave.save_sha256,
    source: sourceSave.source,
  });
  await repository.putBuildReport(buildId, {
    ...output.report, build_id: buildId, created_at: createdAt,
    source_build_id: sourceBuild.build_id, save_sha256: sourceSave.save_sha256,
  }, {createdAt});
  return buildId;
}

// @editor-module 初始化浏览器编辑器，准备导航数据并分发页面渲染与交互绑定。
configureFieldObjectControls(async (...args) =>
  (await import('./battle-action-dimension-controls-Dn1GV-yN.js').then(function (n) { return n.fieldOwnerControls; })).mountFieldOwnerControls(...args));
let bindAudioPlayback, renderAudio, renderAudioRecord;
let leaveAudioPlaybackView = () => {};

let isServicePage, renderServicePage, bindServicePage;
let isSimpleServicePage, renderSimpleServicePage, bindSimpleServicePage;
let isQuantityServicePage, renderQuantityServicePage, bindQuantityServicePage;

let bindTextModeTabs, loadTextCatalog, renderText;
async function loadCurrentTextRecordDisplays(root = document) {
  if (!root.querySelector('[data-current-text-record]')) return;
  return (await import('./charset-C-1TZfXo.js').then(function (n) { return n.catalog; })).loadCurrentTextRecordDisplays(root);
}

async function paintUiConstructionCanvases(options) {
  if (!document.querySelector('[data-ui-editor-preview], [data-ui-menu-preview], [data-ui-dialogue-preview], [data-ui-vehicle-portrait], [data-ui-font-atlas], [data-ui-core-font-tile]')) return;
  return (await import('./ui-construction-preview-C97hIjGW.js').then(function (n) { return n.uiConstructionPreview; })).paintUiConstructionCanvases(options);
}
async function paintCanvasTargets(root, selector, load, method) {
  if (!root.querySelector(selector)) return;
  const renderer = await load();
  return renderer[method](root);
}
const paintMonsterFigureCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-monster-figure]", () => import('./element-tree-DsgOBeTK.js').then(function (n) { return n.monsterFigure; }), "paintMonsterFigureCanvases");
const paintActorAtlasCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-actor-atlas]", () => import('./preview-DMSrQMyk.js').then(function (n) { return n.actorAtlas; }), "paintActorAtlasCanvases");
const paintMetaspriteCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-metasprite]", () => import('./element-tree-DsgOBeTK.js').then(function (n) { return n.metasprite; }), "paintMetaspriteCanvases");
const paintAttackVisualCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-attack-visual]", () => import('./element-tree-DsgOBeTK.js').then(function (n) { return n.weaponEffectVm; }), "paintAttackVisualCanvases");
const paintEffectObjectMotionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-effect-object-motion]", () => import('./element-tree-DsgOBeTK.js').then(function (n) { return n.weaponEffectVm; }), "paintEffectObjectMotionCanvases");
const paintBattleActionCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-action]", () => import('./element-tree-DsgOBeTK.js').then(function (n) { return n.weaponEffectVm; }), "paintBattleActionCanvases");
const paintBattleSceneComposerCanvases = (root = document) => paintCanvasTargets(root,
  "canvas[data-battle-scene-composer]", () => import('./battle-simulation-player-ZYN9IgYB.js').then(function (n) { return n.battleSceneComposer; }), "paintBattleSceneComposerCanvases");

let renderActors;
let renderBattle, renderBattleRecord;
let renderMonsterFormations, bindMonsterFormations;
let bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors;
let renderEmulator;
let bindSaveEditor, prepareSaveEditor, renderSaveEditor;
let bindSavePage, prepareSaveVisualComponents, renderSavePage;
let bindBuildLog, renderBuildLog;
let bindCharacterEditor, renderCharacterRecord;
let bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets;
let bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading;
let bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview;
let loadEncounterZones;
let bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage;
let bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord;
let bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview;
let bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters;
let bindRomMapPrgViewer, renderRomMapPrg;
let bindRomMapChrViewer, renderRomMapChr;
let bindSceneEditor, openSceneSlug;
let bindSceneOverviewFilter;
let renderScenes, bindSceneFlowInstances;
let bindMetatiles, renderMetatiles;
let renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio;
let leaveStoryPlayback, rememberStoryPlayback, restoreStoryPlayback;
let bindStoryScriptCommandAddresses, renderStoryScriptRecord;
let bindBootPresentation, paintBootBankPickers, paintBootPatternPicker;
let paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns;
let loadCharsetWorkbench;
let bindVisualEditor;
let bindBattleTestEditor;
let bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord;

const prefetchViewInputs = (...args) => import('./startup-prefetch-ChIz8AdD.js')
  .then(module => module.prefetchViewInputs(...args));

const pageRuntimeLoads = new Map();
function preparePageRuntime(view) {
  if (pageRuntimeLoads.has(view)) return pageRuntimeLoads.get(view);
  const paths = pageRuntimeModulePaths(view);
  const task = paths.length ? editorLog.startTask({source: "后台准备", message: `准备页面组件 · ${views[view]?.[1] || view}`,
    details: paths}) : null;
  const pending = Promise.all([
    paths.includes(PAGE_RUNTIME_PATHS["field-editor"]) ? import('./rectangle-preset-controls-vTa_haKM.js').then(function (n) { return n.fieldObjectEditor; }) : null,
    paths.includes(PAGE_RUNTIME_PATHS["audio"]) ? import('./audio-B6bfDIB5.js').then(module => {({bindAudioPlayback, leaveAudioPlaybackView, renderAudio, renderAudioRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors"]) ? import('./actors-bind-CmT481e8.js').then(function (n) { return n.actors; }).then(module => {({renderActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle"]) ? import('./battle-7-3MjX6d.js').then(module => {({renderBattle, renderBattleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['monster-formations']) ? import('./monster-formations-B0YFAUG8.js').then(function (n) { return n.monsterFormations; }).then(module => {({renderMonsterFormations, bindMonsterFormations} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-actors"]) ? import('./battle-actors-B548R92n.js').then(function (n) { return n.battleActors; }).then(module => {({bindBattleActorWorkbench, paintBattleActorCanvases, renderBattleActors} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["emulator"]) ? import('./emulator-DynsZsth.js').then(function (n) { return n.emulator; }).then(module => {({renderEmulator} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/sram"]) ? import('./sram-CuBZYYNn.js').then(module => {({bindSaveEditor, prepareSaveEditor, renderSaveEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["save-page"]) ? import('./save-page-BfLjTliy.js').then(module => {({bindSavePage, prepareSaveVisualComponents, renderSavePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["build-log"]) ? import('./build-log-R3qUY7Fk.js').then(module => {({bindBuildLog, renderBuildLog} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/characters"]) ? import('./characters-BFq1hik2.js').then(function (n) { return n.characters; }).then(module => {({bindCharacterEditor, renderCharacterRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/monsters"]) ? import('./monsters-BPjlt1RQ.js').then(function (n) { return n.monsters; }).then(module => {({bindMonsterEditor, bindMonsterRecord, prepareMonsterNameFacets, renderMonsterRecord, useMonsterNameFacets} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["shops"]) ? import('./shops-DzcKMGb8.js').then(module => {({bindShopEditor, bindShopInstanceReferenceLists, bindShopStateWorkbench, ensureShopView, renderShopRecord, renderShops, shopViewHeading} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["interface-pages"]) ? import('./interface-pages-Cnmx21yc.js').then(function (n) { return n.interfacePages; }).then(module => {({bindInterfacePageWorkbench, interfacePageViewHeading, paintInterfacePageRuntimeCanvases, renderInterfacePage, resolveInterfacePageEditorPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['service-pages']) ? import('./service-pages-CZwQ_DjO.js').then(function (n) { return n.servicePages; }).then(module => {({isServicePage, renderServicePage, bindServicePage, isSimpleServicePage, renderSimpleServicePage, bindSimpleServicePage, isQuantityServicePage, renderQuantityServicePage, bindQuantityServicePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/encounter"]) ? import('./encounter-DuEBgoNG.js').then(function (n) { return n.encounter; }).then(module => {({loadEncounterZones} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/pages"]) ? import('./pages-19fig6Hr.js').then(module => {({bindShellEditor, renderCharacterPage, renderItemsPage, renderHumanEquipmentPage, renderMonsterPage, renderShellPage, renderShellRecord, renderTankEquipmentPage, renderVehiclePage} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/vehicles"]) ? import('./vehicles-C1pv7I-R.js').then(module => {({bindVehicleEditor, paintVehicleVisualCanvases, prepareVehicleVisualSelectors, renderVehicleRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["facilities"]) ? import('./facilities-CegcvGqa.js').then(module => {({bindFacilityConfigurationEditor, bindFacilityUiWorkbench, bindTeleportPreviewControls, renderComputerController, renderFrogRace, renderJukebox, renderTeleportTerminal, renderVending, resolveFacilityMenuPreview} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["wanted"]) ? import('./wanted-CAQMAd-N.js').then(module => {({bindWantedEditor, bindWantedUiWorkbench, ensureWantedView, paintWantedPreviewCanvases, renderWantedPosters} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/prg"]) ? import('./chr-CWVtqLX5.js').then(function (n) { return n.prg; }).then(module => {({bindRomMapPrgViewer, renderRomMapPrg} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["byte-map/chr"]) ? import('./chr-CWVtqLX5.js').then(function (n) { return n.chr; }).then(module => {({bindRomMapChrViewer, renderRomMapChr} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/interact"]) ? import('./interact-DlE0rspZ.js').then(module => {({bindSceneEditor, openSceneSlug} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/overview"]) ? import('./overview-CxFLx7O1.js').then(function (n) { return n.overview; }).then(module => {({bindSceneOverviewFilter} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["scenes/workbench"]) ? import('./workbench-qxwbKQTO.js').then(function (n) { return n.workbench; }).then(module => {({renderScenes, bindSceneFlowInstances} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["metatiles"]) ? import('./metatiles-11kbwanN.js').then(module => {({bindMetatiles, renderMetatiles} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/playback"]) ? import('./playback-BV1fhruN.js').then(module => {({renderCutsceneAnimation, startStoryTimer, updateStoryPlayback, prepareStoryAudio,
      leaveStoryPlayback, rememberStoryPlayback, restoreStoryPlayback} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["story/catalog"]) ? import('./actors-bind-CmT481e8.js').then(function (n) { return n.catalog; }).then(module => {({bindStoryScriptCommandAddresses, renderStoryScriptRecord} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['boot-presentation']) ? import('./boot-presentation-Dn-UB_83.js').then(module => {({bindBootPresentation, paintBootBankPickers, paintBootPatternPicker, paintBootPresentationCanvas, renderBootPresentation, reportBootPresentationPatterns} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS['text/catalog']) ? import('./charset-C-1TZfXo.js').then(function (n) { return n.catalog; }).then(module => {({bindTextModeTabs, loadTextCatalog, renderText} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["text/charset"]) ? import('./charset-C-1TZfXo.js').then(function (n) { return n.charset; }).then(module => {({loadCharsetWorkbench} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["actors-bind"]) ? import('./actors-bind-CmT481e8.js').then(function (n) { return n.actorsBind; }).then(module => {({bindVisualEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["battle-bind"]) ? import('./monster-formations-B0YFAUG8.js').then(function (n) { return n.battleBind; }).then(module => {({bindBattleTestEditor} = module);}) : null,
    paths.includes(PAGE_RUNTIME_PATHS["data/items"]) ? import('./items-BQN6hnvv.js').then(module => {({bindEquipmentEditor, renderEquipmentRecord, renderItemUseRecord} = module);}) : null,
  ]);
  pageRuntimeLoads.set(view, pending);
  pending.then(() => task?.finish({level: "debug", message: "页面组件已准备"}), error => {
    task?.finish({level: "error", message: `页面组件准备失败：${error.message || error}`, error});
    if (pageRuntimeLoads.get(view) === pending) pageRuntimeLoads.delete(view);
  });
  return pending;
}

// 画布优先的视图：内容是舞台而不是数据网格，用工作台骨架。
const WORKSPACE_VIEWS = new Set([
  'generic-shop',
  "scenes", "interfaceui", "wanted-ui", ...EDITABLE_STORY_VIEW_IDS,
  "cutscene-boot-logo", "cutscene-title",
  'monster-formations',
]);
const FACILITY_WORKSPACE_VIEWS = new Set([
  "jukebox", "vending", "frograce", "teleport", "computercontroller",
]);

// 开机演出：这两屏跑在主循环之前，与 story 的 15 项 field mode 无关，
// 因此不走 renderStoryPlaceholder，而是各自读 project.boot-presentation。
const BOOT_PRESENTATION_VIEWS = new Set(["cutscene-boot-logo", "cutscene-title"]);

let renderGeneration = 0;
let latestBuildArtifactsPromise = null;
let latestBuildArtifactsId = null;

function isWorkspacePage() {
  if (state.view === "interfaceui" && isServicePage()) return false;
  return WORKSPACE_VIEWS.has(state.view)
    || (FACILITY_WORKSPACE_VIEWS.has(state.view) && state.facilityTab === "ui");
}

function renderStoryPlaceholder() {
  return '<div data-page-empty></div>';
}

const EQUIPMENT_DOMAIN_PARAM = "equipmentDomain";

function currentEquipmentDomain() {
  return new URL(location.href).searchParams.get(EQUIPMENT_DOMAIN_PARAM) === "tank"
    ? "tank-equipment" : "human-equipment";
}

function equipmentViewHeading() {
  return currentEquipmentDomain() === "tank-equipment"
    ? {
        title: "战车装备",
        description: "编辑战车装备的攻防、重量、载重、价格与战斗特效，并逐字段核对 ROM 地址。",
      }
    : {
        title: "人类装备",
        description: "编辑人类装备的攻防、职业约束、价格与战斗特效，并逐字段核对 ROM 地址。",
      };
}

function renderCurrentItemUseRecord() {
  const data = state.project?.game_data || {};
  return renderItemUseRecord(
    data,
    data.items?.records || [],
    state.recordId,
  );
}

// 记录页：列表页是宽表，表格放不下的明细在这里。
// 每个数据视图注册一个渲染器；没注册的视图行不可点开。
const RECORD_RENDERERS = {
  audio: () => renderAudioRecord(state.recordId),
  "attack-effects": () => renderBattleRecord(state.recordId),
  "battle-test": () => renderBattleRecord(state.recordId),
  shops: () => renderShopRecord(state.recordId),
  monsters: ({monsterRecords}) => renderMonsterRecord(
    monsterRecords || [], state.recordId
  ),
  equipment: () => renderEquipmentRecord(
    equipmentRecords(), state.recordId, currentEquipmentDomain()
  ),
  items: () => renderCurrentItemUseRecord(),
  shells: () => renderShellRecord(state.recordId),
  characters: () => renderCharacterRecord(
    state.project?.game_data || {},
    state.project?.game_data?.characters?.rom_initial?.roles || [],
    state.recordId,
  ),
  vehicles: ({vehicleRecords}) => renderVehicleRecord(
    state.project?.game_data || {},
    vehicleRecords || [],
    state.recordId,
  ),
  // 通用动作脚本目录归在角色图形页的「关联动作脚本」分页；删除通用页后，
  // 记录页也必须跟着这个现有入口迁移，资源链接不能再指向隐藏路由。
  actors: () => state.actorVisualTab === "story"
    ? renderStoryScriptRecord(state.recordId) : null,
};

// 装备页只展示非道具分类；记录页的上一条/下一条必须走同一份过滤后的顺序，
// 否则「下一条」会跳到列表里根本看不见的行。
function equipmentRecords() {
  const itemCategories = new Set(["empty", "human-item", "tank-item"]);
  return (state.project?.game_data?.items?.records || []).filter(
    item => !itemCategories.has(item.category?.id)
  );
}

// 记录页收尾。列表页不需要的（对话原文、底盘图形）只在这里跑。
const RECORD_BINDERS = {
  shops: () => bindShopInstanceReferenceLists(),
  audio: () => bindAudioPlayback(),
  battle: async () => {
    await paintMonsterFigureCanvases();
    await paintAttackVisualCanvases();
    await paintEffectObjectMotionCanvases();
    await paintBattleActionCanvases();
  },
  characters: async () => {
    bindCharacterEditor();
    await paintActorAtlasCanvases();
    await paintMetaspriteCanvases();
  },
  monsters: async () => {
    bindMonsterEditor();
    bindMonsterRecord();
    await paintMonsterFigureCanvases();
  },
  equipment: async () => {
    bindEquipmentEditor();
    await paintAttackVisualCanvases();
    await paintEffectObjectMotionCanvases();
  },
  items: () => bindEquipmentEditor(),
  shells: async () => {
    await bindShellEditor();
    await paintAttackVisualCanvases();
  },
  actors: async () => {
    await bindStoryScriptCommandAddresses();
    await paintActorAtlasCanvases();
  },
  vehicles: async () => {
    bindVehicleEditor();
    await Promise.all([
      paintActorAtlasCanvases(),
      paintVehicleVisualCanvases(),
    ]);
  },
};

function currentRecordView() {
  return state.view;
}

async function renderRecordPage(context = {}) {
  if (state.recordId === null || state.recordId === undefined) return null;
  const renderer = RECORD_RENDERERS[currentRecordView()];
  if (!renderer) return null;
  const html = await renderer(context);
  // 记录不存在（改了地址、换了资产包）时静默退回列表，而不是留一个空页面。
  if (html === null) {
    state.recordId = null;
    return null;
  }
  return html;
}

function bindRecordPageControls() {
  $("[data-record-back]")?.addEventListener("click", () => openRecord(null));
  for (const selector of ["[data-record-prev]", "[data-record-next]"]) {
    const button = $(selector);
    if (button && !button.disabled) {
      button.addEventListener("click", () => openRecord(button.dataset.target));
    }
  }
}

function bindSceneOpenLinks(root = document) {
  root.querySelectorAll("[data-scene-open]").forEach(node => {
    if (node.dataset.sceneOpenBound === "1") return;
    node.dataset.sceneOpenBound = "1";
    node.addEventListener("click", event => {
      if (event.target.closest("a, button, input, select, textarea, summary")) return;
      event.preventDefault();
      void openSceneSlug(node.dataset.sceneOpen);
    });
    node.addEventListener("keydown", event => {
      if (event.target !== node || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      void openSceneSlug(node.dataset.sceneOpen);
    });
  });
}

// 剧情工作台的委托绑定。#content 元素本身不会被重建（每次 render 只换 innerHTML），
// 所以这些监听器必须只挂一次——bindCards() 每次渲染都跑，重复 addEventListener
// 会让一次点击触发 N 次，其中切换执行链还会再套 N 层 render()。
function bindStoryDelegatedControls() {
  const content = $("#content");
  if (!content || content.dataset.storyControlsBound === "1") return;
  content.dataset.storyControlsBound = "1";

  // 工作台左栏与下方表格都能切换当前执行链；两处都用同一个 data 属性。
  content.addEventListener("click", event => {
    const pick = event.target.closest?.("[data-story-sequence]");
    if (pick && pick.dataset.storySequence !== state.storySequenceId) {
      state.storySequenceId = pick.dataset.storySequence;
      replaceHistoryUrl(currentViewUrl());
      render();
      return;
    }
    // 播放/暂停与拖动归时间轴壳（ui/timeline-player.js）；只有「从头播」还是
    // 委托，因为它挂在走带的自定义按钮上，卡片重渲染后节点会换。
    const restart = event.target.closest?.("[data-story-card-restart]");
    if (restart) {
      const id = Number(restart.dataset.storyCardRestart);
      state.storyCardFrame.set(id, 0);
      state.storyCardPaused.delete(id);
      state.storyLastTick = performance.now();
      updateStoryPlayback();
    }
  });
}

function bindCards() {
  bindWideTableWheelScrolling();
  bindResourceQueries();
  document.querySelectorAll("[data-home-view]").forEach(node => {
    node.addEventListener("click", () => navigateView(node.dataset.homeView));
    node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navigateView(node.dataset.homeView);
    });
  });
  bindInternalPageLinks();
  $("#weapon-effect-select")?.addEventListener("change", event => {
    state.weaponVisual = Number.parseInt(event.target.value, 16);
    render();
  });
  document.querySelectorAll("[data-weapon-visual]").forEach(node => {
    const select = () => {
      state.weaponVisual = Number.parseInt(node.dataset.weaponVisual, 16);
      render();
    };
    node.addEventListener("click", select);
    if (node.matches("tr")) node.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      select();
    });
  });
  document.querySelectorAll("[data-actor-visual-tab]").forEach(node =>
    node.addEventListener("click", () => {
      state.actorVisualTab = node.dataset.actorVisualTab;
      state.recordId = null;
      const url = new URL(location.href);
      url.searchParams.set("actorPart", state.actorVisualTab);
      replaceHistoryUrl(url);
      render();
    })
  );
  document.querySelectorAll("[data-story-playback]").forEach(node =>
    node.addEventListener("click", () => {
      state.storyPlayback = node.dataset.storyPlayback;
      state.storyFrame = 0;
      state.storyPlaying = true;
      const url = new URL(location.href);
      url.searchParams.set("storyPlayback", state.storyPlayback);
      replaceHistoryUrl(url);
      render();
    })
  );
  $("#story-play-toggle")?.addEventListener("click", event => {
    state.storyPlaying = !state.storyPlaying;
    state.storyLastTick = performance.now();
    event.currentTarget.textContent = state.storyPlaying ? "暂停" : "播放";
    updateStoryPlayback();
  });
  $("#story-restart")?.addEventListener("click", () => {
    state.storyFrame = 0;
    // 全部重播要把各条的独立游标也归零，否则只有全局帧号回到 0。
    state.storyCardFrame.clear();
    state.storyCardPaused.clear();
    state.storyPlaying = true;
    state.storyLastTick = performance.now();
    const toggle = $("#story-play-toggle");
    if (toggle) toggle.textContent = "暂停";
    updateStoryPlayback();
  });
  $("#story-speed")?.addEventListener("change", event => {
    state.storySpeed = Number(event.target.value);
    state.storyLastTick = performance.now();
  });
  bindStoryDelegatedControls();
  const storyFilter = $("#story-browser-filter");
  if (storyFilter) {
    storyFilter.addEventListener("input", () => {
      const q = storyFilter.value.trim().toLowerCase();
      document.querySelectorAll("#story-browser-list .story-browser-item").forEach(node => {
        node.hidden = Boolean(q) && !node.dataset.storySearch.includes(q);
      });
    });
  }
  document.querySelectorAll("[data-story-kind]").forEach(node =>
    node.addEventListener("click", () => {
      state.storyKind = node.dataset.storyKind;
      state.recordId = null;
      const url = new URL(location.href);
      url.searchParams.set("storyKind", state.storyKind);
      replaceHistoryUrl(url);
      render();
    })
  );
  $("#monster-filter")?.addEventListener("input", event => {
    state.monsterFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#monster-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#field-item-filter")?.addEventListener("input", event => {
    state.fieldItemFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#field-item-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#field-item-category")?.addEventListener("change", event => {
    state.fieldItemCategory = event.target.value;
    render();
  });
  $("#shell-filter")?.addEventListener("input", event => {
    state.shellFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#shell-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#equipment-filter")?.addEventListener("input", event => {
    state.equipmentFilter = event.target.value;
    const cursor = event.target.selectionStart;
    render().then(() => {
      const input = $("#equipment-filter");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  });
  $("#equipment-category")?.addEventListener("change", event => {
    state.equipmentCategory = event.target.value;
    render();
  });
  if (state.view === "characters") bindCharacterEditor();
  if (state.view === "vehicles") bindVehicleEditor();
  if (state.view === "monsters") bindMonsterEditor();
  if (["equipment", "items"].includes(state.view)) bindEquipmentEditor();
  if (state.view === "shells") void bindShellEditor().catch(error => showEditorError($("#shell-editor"), "炮弹字段绑定失败", error));
}

async function ensureLatestBuildArtifacts() {
  const buildId = state.browserProjectManifest?.latest_package_build_id || null;
  if (!buildId || latestBuildArtifactsId === buildId) return;
  if (latestBuildArtifactsPromise) return latestBuildArtifactsPromise;
  const repository = state.projectRepository;
  if (!repository) return;
  latestBuildArtifactsPromise = (async () => {
    const [reportRecord, romRecord] = await Promise.all([
      repository.getBuildReport(buildId),
      repository.getBlob(`rom-build:${buildId}`),
    ]);
    const saveRecord = reportRecord?.report &&
      reportRecord.report.save_source !== "not-included"
      ? await repository.getBlob(`${SAVE_BUILD_BLOB_PREFIX}${buildId}`) : null;
    state.browserBuildReport = reportRecord?.report ? {
      ...reportRecord.report,
      created_at: reportRecord.report.created_at || reportRecord.created_at,
    } : null;
    state.browserBuildRom = romRecord
      ? new Uint8Array(await romRecord.data.arrayBuffer()) : null;
    state.browserBuildSave = saveRecord
      ? new Uint8Array(await saveRecord.data.arrayBuffer()) : null;
    state.browserBuildEvents = reportRecord?.report?.linker?.events || [];
    state.browserBuildCurrentEvent = state.browserBuildEvents.at(-1) || null;
    latestBuildArtifactsId = buildId;
  })().finally(() => {
    latestBuildArtifactsPromise = null;
  });
  return latestBuildArtifactsPromise;
}

async function render() {
  const view = state.view;
  const generation = renderGeneration + 1;
  try {
    await renderView();
  } catch (error) {
    // Only a render superseded by a newer navigation is irrelevant to this DOM.
    if (generation !== renderGeneration || view !== state.view) return;
    const block = `当前页面载入失败 · ${views[view]?.[1] || view} (${view})`;
    setStatus({selection: block});
    const content = $("#content");
    restorePageHeader();
    const head = $(".page-head");
    if (head.parentElement === content) content.before(head);
    content.innerHTML = editorErrorMarkup(block, error, {storyRecovery: true});
    compactPageHeader({content, head});
    bindStoryPageRecovery(content, {database: db, afterReset: render,
      onError: error => showEditorError(content, "清理剧情修改失败", error)});
    content.dataset.renderedView = view;
    content.dataset.renderGeneration = String(generation);
    content.dataset.destinationUsersReady = "error";
    delete content.dataset.pendingView;
  }
}

async function renderView() {
  const generation = ++renderGeneration;
  const requestedView = state.view;
  const content = $("#content");
  restorePageHeader();
  leaveStoryPlayback?.(content);
  if (!content.dataset.ownerReferenceLinksBound) {
    content.dataset.ownerReferenceLinksBound = '1';
    content.addEventListener('owner-reference-loaded', event => bindInternalPageLinks(event.target));
  }
  const pageHead = $(".page-head");
  if (pageHead.parentElement === content) content.before(pageHead);
  pageHead.querySelector('[data-story-page-heading]')?.remove();
  pageHead.querySelector('[data-screen-workbench-page-header]')?.remove();
  const compactHeader = () => compactPageHeader({content, head: pageHead});
  const replaceContent = markup => {
    restorePageHeader();
    if (pageHead.parentElement === content) content.before(pageHead);
    content.innerHTML = markup;
    compactHeader();
  };
  // 页头在同步装载正文时合并，异步取数与绘图期间保持单行。
  compactHeader();
  if (requestedView === "build" && content.dataset.renderedView !== "build") {
    state.projectStateLoaded = false;
  }
  // render() deliberately leaves the previous page mounted while its async DB
  // projection is prepared.  Expose that interval explicitly so browser tests,
  // history restore, and accessibility tooling never mistake stale DOM for the
  // newly selected page.  The completion attributes are only committed after
  // every async binder/painter for this generation has finished.
  delete content.dataset.renderedView;
  delete content.dataset.renderGeneration;
  content.dataset.pendingView = requestedView;
  state.navigationGeneration += 1;
  if (state.storyTimer) clearInterval(state.storyTimer);
  state.storyTimer = null;
  stopAudioTimelines();
  if (state.view !== "audio") leaveAudioPlaybackView();
  // 静态 Web 投影尚未装载完成时不分派视图，期间
  // state.project 为 null，而全部视图都会直接读 state.project.xxx。
  //
  // 运行验证与浏览器构建只消费 IndexedDB，不依赖展示投影。
  if (!state.project && !["emulator", "build", "log", "bytemap-sram"].includes(state.view)) {
    // 装载中和装载失败是两回事，不能都用同一个转圈：失败时转圈会一直转下去。
    replaceContent(state.projectBootstrapStatus === "error"
      ? `<div class="empty"><b>资源暂不可用</b><span>${
        esc(state.projectBootstrapError)}；状态栏可重试。</span></div>`
      : `<div class="loading"><span></span>正在装载资产包…</div>`);
    return;
  }
  const stillCurrent = () => generation === renderGeneration
    && requestedView === state.view;
  let activateSceneThumbnails = null;
  let destinationPage;
  const markRendered = (reuseBindings = false) => {
    if (!stillCurrent()) return;
    compactHeader();
    flushCanvasViewportLayouts();
    content.dataset.renderedView = requestedView;
    content.dataset.renderGeneration = String(generation);
    delete content.dataset.pendingView;
    if (!reuseBindings) {
      bindSceneDestinationUsers(content, destinationPage, db, () => bindInternalPageLinks(content));
      bindControlledObjectUsers(content, state.project, () => bindInternalPageLinks(content));
    }
    content.dataset.destinationUsersReady = "true";
  };
  const dataView = requestedView;
  const saveActivation = dataView === 'save' && state.savePageSection === 'location';
  if (state.project) {
    // 页面文档须在并行取数前准备完成，以免切换仓库使在途读取失效。
    await db.prepareStoryPageDocument(dataView === 'story-page' ? state.storyPageId : storyEditableView(dataView) ? dataView : null);
    if (!stillCurrent()) return;
  }
  void prefetchViewInputs(dataView, new URLSearchParams(location.search)).catch(() => {});
  const vehiclePreparation = ["vehicles", "scenes", "shops"].includes(dataView)
    ? ensureVehicleDraft() : null;
  vehiclePreparation?.catch(() => {});
  const pageRuntime = preparePageRuntime(dataView);
  const [, missingSchemas] = await Promise.all([
    pageRuntime,
    state.project ? prepareViewData(dataView === 'generic-shop' ? 'shops' : dataView).then(result => {
      if (applyStoryPageNames(state.project)) mountPageNavigation({storyNavigation: state.project.story_navigation});
      return result;
    }) : Promise.resolve([]),
    state.project && !saveActivation && (['save', 'scenes', 'shops', 'actors', 'npcs', 'wanted', 'wanted-ui', 'teleport',
      'computercontroller', 'interfaceui', 'facilities'].includes(dataView) || storyPlaybackView(dataView))
      ? prepareGlobalEventFlags() : null,
    !saveActivation && ["save", "scenes", "actors", "wanted", "wanted-ui"].includes(dataView)
      ? prepareSaveEventLinks() : null,
    ["save", "bytemap-sram"].includes(dataView)
      ? pageRuntime.then(() => prepareSaveEditor()) : null,
    dataView === "save" ? pageRuntime.then(() => prepareSaveVisualComponents()) : null,
    vehiclePreparation,
    ["save", "bytemap-sram"].includes(dataView) ? prepareSaveEditorWorkspace() : null,
  ]);
  if (!stillCurrent()) return;
  if (dataView === 'interfaceui' ? state.interfacePage === 'interaction-service'
      || interfacePageDefinition(state.interfacePage)?.commandIds?.length
    : ['shops', 'generic-shop', 'jukebox', 'vending', 'frograce', 'teleport',
      'computercontroller', 'wanted-ui'].includes(dataView)) {
    await (await import('./service-preview-scene-76gf-8YL.js').then(function (n) { return n.servicePreviewScene; })).prepareServicePreviewSceneBindings();
    if (!stillCurrent()) return;
  }
  if (dataView === "shops" && Number(state.shopFamily) === 15) {
    state.shopElevators = await loadSceneElevators(db, state.project?.scenes?.editable_scenes || []);
    if (!stillCurrent()) return;
  }
  if (dataView === "vehicles") {
    await prepareVehicleVisualSelectors();
    if (!stillCurrent()) return;
  }
  if (["emulator", "build"].includes(requestedView)) {
    await ensureLatestBuildArtifacts();
    if (!stillCurrent()) return;
  }
  setStatus();
  let [kicker, title, description] = views[state.view];
  const storyHeading = storyPageDefinitionForView(state.view);
  if (storyHeading) {kicker = storyHeading.eyebrow; title = storyHeading.title;}
  // 页面骨架只有两种。工作台页把滚动交给自己的画布/面板，列表页与记录页由
  // .page-body 统一滚动——两者的内边距和溢出规则必须分开，否则画布页会出现
  // 双滚动条，列表页则会贴边。
  if (storyPlaybackView(state.view)) $("#view-kicker").innerHTML = handleTextMarkup(kicker);
  else $("#view-kicker").textContent = kicker;
  if (storyPlaybackView(state.view)) $("#view-title").innerHTML = handleTextMarkup(title);
  else $("#view-title").textContent = title;
  let headingHint = description;
  // shops 是一个视图承载 13 个配置族，标题要跟着族走，不能都叫"商店 / 服务配置"。
  if (state.view === "shops") {
    const heading = shopViewHeading();
    if (heading) {
      $("#view-title").textContent = heading.title;
      headingHint = heading.description;
    }
  }
  if (state.view === "interfaceui") {
    const heading = interfacePageViewHeading();
    if (heading) {
      $("#view-title").textContent = heading.title;
      headingHint = heading.description;
    }
  }
  if (state.view === "equipment") {
    const heading = equipmentViewHeading();
    $("#view-title").textContent = heading.title;
    headingHint = heading.description;
  }
  const pageRoute = editorPageRoute({
    view: state.view,
    interface: state.interfacePage,
    interfacePage: state.interfacePage,
    interfaceScreen: state.interfacePageScreen,
    shopFamily: state.shopFamily,
    shopTab: state.shopTab,
    vendingFamily: state.vendingPreviewFamily,
    resource: state.resourceId,
    record: state.recordId,
    interactionFlow: state.interactionFlow,
    facility: state.facilityTab,
    previewCommand: interfacePreviewContext().service?.command,
    equipmentDomain: currentEquipmentDomain().replace(/-equipment$/u, ""),
  });
  const editorPage = updatePageNavigation(pageRoute);
  if (editorPage) $("#view-title").textContent = editorPage.label;
  mountPageWorkingExchange(pageHead, {afterImport: render, page: editorPage});
  const storyInfo = storyNavigationInfo(state.view, state.project?.story_navigation);
  $("#view-kicker").hidden = !storyInfo;
  $("#view-kicker").classList.toggle("story-trigger", Boolean(storyInfo));
  if (storyInfo) $("#view-kicker").textContent = storyInfo.trigger;
  $("#view-title").title = headingHint || "";
  // 怪物列表要显示"出没于哪些随机遇敌区"。遇敌区是跨场景的全局表，不在
  // 聚合投影里，也没进 resource_index，只能单独取一次（内部有缓存）。
  if (dataView === "monsters") {
    await loadEncounterZones();
    if (!stillCurrent()) return;
  }
  // 已迁移页面按表取当前有效值。warm 只看这批记录里直接出现的引用，不追正文
  // 里的第二层引用；渲染阶段随后可以安全地同步 peek。
  const catalog = ["monsters", "vehicles"].includes(dataView)
    ? await loadEntityCatalog() : null;
  const monsterRecords = dataView === "monsters"
    ? await entityDisplayRecords(db, "monster", {catalog, labelFor: resourceLabel}) : null;
  const vehicleRecords = dataView === "vehicles"
    ? await entityDisplayRecords(db, "vehicle", {catalog,
      project: state.project, labelFor: resourceLabel}) : null;
  if (!stillCurrent()) return;
  if (monsterRecords) {
    await db.warm(monsterRecords);
    if (!stillCurrent()) return;
    const nameHandles = await prepareMonsterNameFacets(monsterRecords);
    if (!stillCurrent()) return;
    useMonsterNameFacets(nameHandles);
  }
  if (!stillCurrent()) return;
  // 音序执行轨迹不在发布包里，是按 execution_id 现算的（见 audio/executions.js）。
  // 所有输入都已在 audio index / sequence graph JSON；只是计算本身异步，
  // 所以在渲染之前先备好。
  if (state.view === "audio") {
    await ensureSequenceExecutions(state.project?.audio);
    if (!stillCurrent()) return;
  }
  if (storyPlaybackView(state.view)) {
    await prepareStoryAudio();
    if (!stillCurrent()) return;
  }
  const destinationUsers = () => {
    destinationPage = {...state, metatileRecordId: new URLSearchParams(location.search).get('metatile')};
    if (requestedView === 'monster-formations') return '';
    return sceneDestinationUsersMarkup(destinationPage);
  };
  let html = await renderRecordPage({monsterRecords, vehicleRecords});
  if (!stillCurrent()) return;
  // 骨架要在拿到记录页结果之后再定：工作台视图里的记录页也必须落回列表骨架，
  // 否则会套上工作台的定高与零内边距。
  document.body.dataset.pageKind =
    html === null && isWorkspacePage() ? "workspace" : "list";
  if (html !== null) {
    html = pageVariantsMarkup(editorPage, pageRoute) + html;
    html += destinationUsers();
    if (state.view === "audio" && state.recordId === "audio-index") {
      html += pageModuleEditorsMarkup(editorPage?.id);
    }
    replaceContent(html);
    bindPageVariants(content, editorPage);
    bindRecordPageControls();
    await loadCurrentTextRecordDisplays();
    if (!stillCurrent()) return;
    // 记录页的按视图收尾：文本原文、画布绘制等，与列表页各自独立。
    await RECORD_BINDERS[currentRecordView()]?.();
    if (!stillCurrent()) return;
    if (state.view === "audio" && state.recordId === "audio-index") {
      await mountPageModuleEditors($("#content"), editorPage?.id);
      if (!stillCurrent()) return;
    }
    bindResourceQueries();
    markRendered();
    return;
  }
  if (state.view === "home") html = renderHome();
  else if (state.view === "scenes") html = await renderScenes();
  else if (state.view === "actors") html = renderActors();
  else if (state.view === "metatiles") html = await renderMetatiles();
  // 开机演出两屏有自己的权威文档；其余 cutscene 仍是占位。
  else if (BOOT_PRESENTATION_VIEWS.has(state.view)) {
    html = renderBootPresentation(state.view);
  }
  else if (storyEditableView(state.view)) {
    restorePageHeader();
    if (restoreStoryPlayback(content)) {
      const heading = content.querySelector('.story-sequence-handle');
      if (heading) {
        heading.dataset.storyPageHeading = 'true';
        pageHead.insertBefore(heading, pageHead.querySelector('.head-actions'));
      }
      content.prepend(pageHead);
      compactHeader();
      await startStoryTimer({reuse: true});
      if (stillCurrent()) {
        focusResourceTarget();
        markRendered(true);
      }
      return;
    }
    compactHeader();
    html = renderCutsceneAnimation(state.view);
  }
  else if (state.view.startsWith("cutscene-")) html = renderStoryPlaceholder();
  else if (["attack-effects", "battle-test"].includes(state.view)) html = renderBattle();
  else if (state.view === 'monster-formations') html = await renderMonsterFormations();
  else if (state.view === "battleactors") html = renderBattleActors();
  else if (state.view === "text") html = renderText();
  else if (state.view === "characters") html = renderCharacterPage();
  else if (state.view === "save") html = renderSavePage();
  else if (state.view === "vehicles") html = renderVehiclePage(vehicleRecords);
  else if (state.view === "monsters") html = renderMonsterPage(monsterRecords);
  else if (state.view === "equipment") html = currentEquipmentDomain() === "tank-equipment"
    ? await renderTankEquipmentPage() : await renderHumanEquipmentPage();
  else if (state.view === "items") html = renderItemsPage();
  else if (state.view === "shells") html = await renderShellPage();
  else if (state.view === "audio") html = renderAudio();
  else if (state.view === "wanted" || state.view === "wanted-ui") {
    ensureWantedView();
    html = await renderWantedPosters();
  }
  else if (state.view === "shops") html = await renderShops();
  else if (state.view === 'generic-shop') html = await (await import('./generic-shop-CNIYVl4D.js').then(function (n) { return n.genericShop; })).renderGenericShop();
  else if (state.view === "interfaceui") {
    html = state.interfacePage === 'interaction-service'
      ? await (await import('./interaction-service-Br-mVKD5.js')).renderInteractionService()
      : isSimpleServicePage() ? await renderSimpleServicePage()
      : isQuantityServicePage() ? await renderQuantityServicePage()
      : renderInterfacePage(isServicePage() ? await renderServicePage() : {});
  }
  else if (state.view === "jukebox") {
    ensureShopView();
    html = renderJukebox();
  }
  else if (state.view === "vending") {
    ensureShopView();
    html = renderVending();
  }
  else if (state.view === "frograce") html = renderFrogRace();
  else if (state.view === "teleport") html = renderTeleportTerminal();
  else if (state.view === "computercontroller") html = renderComputerController();
  else if (state.view === "bytemap-prg") html = await renderRomMapPrg();
  else if (state.view === "bytemap-chr") html = await renderRomMapChr();
  else if (state.view === "bytemap-sram") html = renderSaveEditor();
  else if (state.view === "log") html = renderLog();
  else if (state.view === "build") html = renderBuildLog();
  else if (state.view === "emulator") html = renderEmulator();
  // 承载页面上常驻的模块编辑器：清单里属于本页的模块都挂在这一段里。
  html = pageVariantsMarkup(editorPage, pageRoute) + html;
  if (state.view !== "audio") html += pageModuleEditorsMarkup(editorPage?.id);
  html += destinationUsers();
  // scenes / 字节地图的 HTML 生成本身会等待分页正文。快速切到另一页时，旧请求
  // 即使随后成功返回，也不能再覆盖新页的 DOM。
  if (!stillCurrent()) return;
  // EmulatorJS 没有 destroy API，重建 iframe 会重启 WASM、音频和游戏进度。而
  // render() 不只在切换视图时跑：搜索框每敲一个字都会跑一次。所以模拟器已经挂上
  // 之后必须复用同一个 iframe，不能让 innerHTML 把它连根拔掉。
  // 离开本视图时照常整块重写，iframe 被移除，浏览器回收文档、停掉模拟器。
  // 换 ROM 时（刚点完“运行新 ROM”）必须重建，否则 iframe 还指着上一个产物。
  const mounted = state.view === "emulator" ? $("#emulator-frame") : null;
  const keepEmulator = mounted && mounted.dataset.rom === (state.emulatorRom || "");
  if (!keepEmulator) replaceContent(html);
  bindPageVariants(content, editorPage);
  if (storyEditableView(state.view)) {
    const heading = content.querySelector('.story-sequence-handle');
    if (heading) {
      heading.dataset.storyPageHeading = "true";
      pageHead.insertBefore(heading, pageHead.querySelector('.head-actions'));
      content.prepend(pageHead);
    }
  }
  compactHeader();
  if (missingSchemas.length) {
    setStatus({selection: `数据加载失败：${missingSchemas.join(" ")}`});
    // 单页的正文缺件同样不该换掉整屏：失败的表名挂进状态栏提示条，其余内容照常显示。
    setResourceAlert({
      title: "部分数据未能加载",
      detail: missingSchemas.join(" "),
      retry: () => render(),
    });
  }
  bindCards();
  if (state.view === "home") bindHomeFieldCoverage();
  if (state.view === "metatiles") {
    await bindMetatiles();
    if (!stillCurrent()) return;
  }
  const openTableRecord = (route, rowId) => {
    // 战斗页的记录身份在路由里包含类别；不能退回共享发布资源 UID，
    // 否则主攻击脚本会与同号攻击视觉记录落到同一详情页。
    const battleRecord = ["attack-effects", "battle-test"].includes(state.view)
      && String(route || "").match(/^(?:attack-effects|battle-test)\/(.+)$/);
    openRecord(battleRecord ? battleRecord[1] : rowId);
  };
  bindRecordLinks(document, openTableRecord);
  bindVirtualTables($("#content"), openTableRecord, wrap => {
    void hydrateModuleComponents(wrap).catch(error =>
      showEditorError(wrap, "表格组件加载失败", error));
    void paintMonsterFigureCanvases(wrap).catch(error =>
      showEditorError(wrap, "怪物图形加载失败", error));
  });
  if (state.view === "audio") bindAudioPlayback();
  if (state.view === "build") bindBuildLog();
  if (state.view === "log") bindLog();
  if (state.view === "save" || state.view === "bytemap-sram") {
    await bindSaveEditor({rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "save") bindSavePage({rerender: render});
  await loadCurrentTextRecordDisplays();
  if (!stillCurrent()) return;
  if (state.view === "shops") bindShopEditor({onChange: render});
  if (["jukebox", "vending"].includes(state.view)) {
    bindShopEditor({onChange: render});
    bindFacilityConfigurationEditor(render);
  }
  if (state.view === 'frograce') bindFacilityConfigurationEditor(render);
  if (state.view === "teleport") bindTeleportPreviewControls(render);
  if (state.view === "bytemap-prg") bindRomMapPrgViewer();
  if (state.view === "bytemap-chr") bindRomMapChrViewer();
  if (BOOT_PRESENTATION_VIEWS.has(state.view)) {
    // 图元来自 shared-chr-bank 的 original/working，取数是异步的。
    await Promise.all([paintBootPresentationCanvas(state.view),
      paintBootPatternPicker(state.view), paintBootBankPickers(state.view)]);
    if (!stillCurrent()) return;
    await bindBootPresentation(state.view, {rerender: render});
    if (!stillCurrent()) return;
    reportBootPresentationPatterns();
  }
  if (state.view === "shops") {
    await bindShopStateWorkbench(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === 'generic-shop') {
    await (await import('./generic-shop-CNIYVl4D.js').then(function (n) { return n.genericShop; })).bindGenericShop(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "interfaceui" && isSimpleServicePage()) {
    await bindSimpleServicePage(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === 'interfaceui' && isQuantityServicePage()) {
    await bindQuantityServicePage(content, {rerender: render});
    if (!stillCurrent()) return;
  }
  if (state.view === "interfaceui" && !isSimpleServicePage() && !isQuantityServicePage()) {
    if (state.interfacePage === 'interaction-service') {
      await (await import('./interaction-service-Br-mVKD5.js')).bindInteractionService(content, {rerender: render});
      if (!stillCurrent()) return;
    } else if (isServicePage()) {
      await bindServicePage(content, {rerender: render, repaint: () => paintUiConstructionCanvases({
        resolveEditorPreview: resolveInterfacePageEditorPreview,
      })});
      if (!stillCurrent()) return;
    }
    const serviceWorkbench = state.interfacePage === 'interaction-service'
      ? (await import('./interaction-service-Br-mVKD5.js')).interactionServiceWorkbenchOptions() : {};
    if (serviceWorkbench) await bindInterfacePageWorkbench({
      ...serviceWorkbench,
      isCurrent: stillCurrent,
      rerender: render,
      repaint: () => {
        return paintUiConstructionCanvases({
          resolveEditorPreview: resolveInterfacePageEditorPreview,
        }).catch(error => {
          // 旧页面的回调只在当前页面仍有效时报告错误。
          if (stillCurrent()) showEditorError(content, "独立界面重绘失败", error);
        });
      },
    });
    if (!stillCurrent()) return;
    await paintUiConstructionCanvases({
      resolveEditorPreview: resolveInterfacePageEditorPreview,
    });
    if (!stillCurrent()) return;
    await paintInterfacePageRuntimeCanvases();
    if (!stillCurrent()) return;
    await paintBattleSceneComposerCanvases();
    if (!stillCurrent()) return;
  }
  if (state.view === "wanted" || state.view === "wanted-ui") {
    bindWantedEditor({rerender: render});
    if (state.view === "wanted-ui") {
      bindWantedUiWorkbench({rerender: render});
      await paintWantedPreviewCanvases();
      if (!stillCurrent()) return;
    }
  }
  if (["jukebox", "vending", "frograce", "teleport", "computercontroller"].includes(state.view)) {
    document.querySelectorAll("[data-facility-tab]").forEach(node =>
      node.addEventListener("click", () => {
        if (state.facilityTab === node.dataset.facilityTab) return;
        state.facilityTab = node.dataset.facilityTab;
        replaceHistoryUrl(currentViewUrl());
        render();
      })
    );
    if (state.facilityTab === "ui") {
      await bindFacilityUiWorkbench({
        rerender: render,
        repaint: () => {
          void paintUiConstructionCanvases({
            resolveMenuPreview: resolveFacilityMenuPreview,
            resolveEditorPreview: resolveFacilityMenuPreview,
          }).catch(error => {
        // A callback from an older render must not write into the new page.
        if (stillCurrent()) showEditorError(content, "设施界面重绘失败", error);
      });
        },
      });
      if (!stillCurrent()) return;
      // 五个设施页都走 UI constructor 的同一绘制入口；resolver 只注入当前
      // 配置草稿、运行状态和所选组件，不另画一张页面专用 canvas。
      await paintUiConstructionCanvases({
        resolveMenuPreview: resolveFacilityMenuPreview,
        resolveEditorPreview: resolveFacilityMenuPreview,
      });
      if (!stillCurrent()) return;
    }
  }
  if (state.view === "scenes" && state.scene) {
    if (state.interactionFlow) await bindSceneFlowInstances(content, {rerender: render});
    else await bindSceneEditor();
    if (!stillCurrent()) return;
  }
  if (state.view === "scenes" && !state.scene) {
    bindSceneOpenLinks();
    let thumbnailsStarted = false;
    activateSceneThumbnails = () => {
      if (thumbnailsStarted) return Promise.resolve();
      thumbnailsStarted = true;
      return paintVisibleSceneThumbnailCanvases(content, {isCurrent: stillCurrent});
    };
    bindSceneOverviewFilter(document, () => {
      replaceHistoryUrl(currentViewUrl());
      void activateSceneThumbnails();
    });
    content.addEventListener("scroll", () => void activateSceneThumbnails(), {once: true});
    // 返回列表时先定位当前场景，再开始逐张加载缩略图。行高由固定预览框确定，
    // 后续绘图不会造成滚动位置漂移。
    focusResourceTarget();
    // 列表骨架先完成；缩略图按视口在后台补画，离页后由 painter 停止旧队列。
    // IntersectionObserver 不保证在隐藏窗口及时回调，不能拿它当导航完成闸。
    if (!stillCurrent()) return;
    await mountPageModuleEditors(content, editorPage?.id);
    if (!stillCurrent()) return;
    markRendered();
    if (activateSceneThumbnails && stillCurrent()) void activateSceneThumbnails();
    return;
  }
  if (state.view === "actors") bindVisualEditor();
  if (state.view === "battleactors") {
    bindBattleActorWorkbench({rerender: render});
    await paintBattleActorCanvases();
    if (!stillCurrent()) return;
  }
  if (storyPlaybackView(state.view)) {
    await startStoryTimer();
    if (!stillCurrent()) return;
  }
  if (state.view === "text") {
    bindTextModeTabs();
    await paintUiConstructionCanvases();
    if (!stillCurrent()) return;
    if (state.textMode === "charset") await loadCharsetWorkbench();
    else await loadTextCatalog();
    if (!stillCurrent()) return;
  }
  if (state.view === 'monster-formations') await bindMonsterFormations().catch(error =>
    showEditorError(document.querySelector('[data-screen-workbench="monster-formations"]'), '编队字段绑定失败', error));
  if (state.view === "battle-test") await bindBattleTestEditor().catch(error =>
    showEditorError($("#battle-test-editor"), "战斗测试字段绑定失败", error));
  await mountPageModuleEditors(content, editorPage?.id);
  if (!stillCurrent()) return;
  // owner 模块公开的 editor / reference / preview / cover 统一在这里水合。局部重绘仍可把
  // 新 DOM 根节点交回同一个入口，消费页不需要认识 owner 内部的 canvas 选择器。
  await hydrateModuleComponents(document);
  if (!stillCurrent()) return;
  // 怪物战斗图形按视图无关的钩子现画：谁在标记里放了 [data-monster-figure]
  // 就画谁，没有目标直接返回。列表页、记录页和遇敌区共用同一个渲染器，
  // 不再有「列表用 Python 渲的 PNG、编辑页用浏览器画的 canvas」这种分叉。
  await paintMonsterFigureCanvases();
  if (!stillCurrent()) return;
  if (dataView === "vehicles") {
    await paintVehicleVisualCanvases();
    if (!stillCurrent()) return;
  }
  // 角色图集与组合图各按标记绘制。
  await Promise.all([paintActorAtlasCanvases(), paintMetaspriteCanvases()]);
  if (!stillCurrent()) return;
  // 武器特效：装备记录绘制完整预览，战斗特效表按真实阶段逐段回放。
  await Promise.all([paintAttackVisualCanvases(), paintEffectObjectMotionCanvases(), paintBattleActionCanvases()]);
  if (!stillCurrent()) return;
  document.querySelectorAll("#content select").forEach(select => {
    if (select.options.length > 12 && !select.multiple
        && !select.closest(".carry-item-picker, [data-module-reference-value-control], [data-actor-appearance-picker]")) {
      bindGroupedReferenceSelect(select);
    }
  });
  focusResourceTarget();
  if (storyEditableView(state.view)) {
    await rememberStoryPlayback(content);
    if (!stillCurrent()) return;
  }
  markRendered();
  if (activateSceneThumbnails && stillCurrent()) setTimeout(() => {
    if (stillCurrent()) void activateSceneThumbnails();
  }, 5000);
}

function setNavigationEnabled(enabled) {
  document.querySelectorAll("[data-view]").forEach(node => {
    // 这里只表达应用是否完成初始化。package 版本不兼容由 render 的正文门禁处理，
    // 不能用 disabled/pointer-events 把整个导航做成死界面。
    node.disabled = !enabled;
    node.classList.toggle("awaiting-package", !enabled);
  });
}

// 服务停掉时 fetch 抛的是 TypeError("Failed to fetch")，对着这行字看不出该去
// 重启什么。提示条上要说的是「服务器失联」，原文保留在括号里备查。
function describeLoadError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message)
    ? `服务器失联（${message}）` : message;
}

async function init() {
  preparePageRuntime(state.view).catch(() => {});
  // 启动只读取一次 package 清单、一次 Web 核心投影，并打开轻量项目 session。
  // 分页只按需读取自己的 original JSON；baseline/binding 只允许实际构建动作读取。
  bindDbProgress();
  const loadTask = editorLog.startTask({source: "资源载入", message: "装载资产包"});
  mountPageNavigation();
  setNavigationEnabled(false);
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  const catalogPromise = loadModuleCatalog().catch(error => {
    editorLog.error("资源载入", "模块图加载失败", error);
    return null;
  });
  try {
    const packageManifest = await db.getPackageDocument("manifest.json", undefined, {readonly: true});
    (await import('./startup-prefetch-ChIz8AdD.js')).activatePackagePrefetchManifest(packageManifest);
    state.browserPackageManifest = packageManifest;
    const path = packageManifest.web_project_path;
    if (typeof path !== "string" || !path) {
      throw new Error("资产包缺少项目视图路径");
    }
    const provider = createStaticPackageBootstrapProvider({
      readJson: path => db.getPackageDocument(path, undefined, {readonly: true}),
    });
    let [project, session, catalog] = await Promise.all([
      db.getPackageDocument(path),
      openActiveProjectStore().then(repository =>
        openProjectSessionFromPackage(
          repository,
          provider,
          packageManifest,
        )
      ),
      catalogPromise,
    ]);
    if (!project) {
      throw new Error("项目视图数据格式无效");
    }
    state.projectRepository = session.repository;
    applyInterfacePreviewSceneRoute(new URLSearchParams(location.search));
    state.browserProjectManifest = session.manifest;
    if (catalog) {
      state.moduleCatalog = catalog;
      bindCacheControls(document);
      void refreshCacheControls(document);
    }
    state.projectBootstrapStatus = session.status;
    state.projectBootstrapError = "";
    configureBrowserRomBuildProvider(
      createProjectStoreRomBuildProvider(session.repository),
    );
    db.reset({preservePrefetch: true});
    // 字段会话随 epoch 失效：构建页缓存的编辑版本资产列表跟着作废，否则
    // 再次渲染时读旧会话的 `dirty` 会抛「字段会话已失效」。
    state.projectWorkingAssets = [];
    state.projectWorkingLoaded = false;
    state.projectStateLoaded = false;
    resetViewData();
    state.storyPartyPreviewSlots.clear();
    // package DB 的 project epoch 已切换；视图层缓存也必须同时失效。仅用 ROM
    // SHA 作 key 不够：两个项目可以共享同一原始 ROM，却发布不同的标注/工作态。
    Object.assign(state, {
      resourceRangeFieldViews: null,
      romMapBytes: null,
      romMapAnnotations: null,
      romMapDisassembly: null,
      romMapPrgSections: null,
      romMapPrgBankMetadata: null,
      romMapWindowOffset: 0,
      romMapTotalLength: 0,
      romMapLoadedAll: false,
      romMapLoadKey: null,
      romMapPageLoadKey: null,
      romMapRecordPagesLoaded: 0,
      romMapRecordPagesTotal: 0,
      romMapRecordPagesComplete: false,
      romMapExplorerUi: null,
      romMapChrBytes: null,
      romMapChrSections: null,
      romMapChrReferences: null,
      romMapChrWindowOffset: 0,
      romMapChrTotalLength: 0,
      romMapChrLoadKey: null,
      saveByteMapDocument: null,
      saveByteMapAttempted: false,
      saveByteMapLoading: false,
      saveExplorerUi: null,
      saveRomInitialBytes: null,
      saveCurrentBytes: null,
      saveDraftFields: {},
      saveCurrentName: "",
      saveCurrentSource: "rom-initial",
      saveError: "",
      saveMessage: "",
    });
    latestBuildArtifactsPromise = null;
    latestBuildArtifactsId = null;
    state.project = project;
    applyStoryPageNames(project);
    mountPageNavigation({storyNavigation: project.story_navigation});
    const rom = project.manifest.rom;
    loadTask.finish({message: `资产包已载入 · Mapper ${rom.mapper} · ${Math.round(rom.file_bytes / 1024)} KiB`});
    setNavigationEnabled(true);
    await render();
    replaceHistoryUrl(location.href);
  } catch (error) {
    state.projectBootstrapStatus = "error";
    state.projectBootstrapError = describeLoadError(error);
    loadTask.finish({level: "error", message: `资产包加载失败：${state.projectBootstrapError}`, error,
      retry: () => init()});
    // 资产包没取到多半是本地服务停了，这是环境故障而不是「这个编辑器坏了」。
    // 界面保持可用：导航照常点得动，不依赖资产包的页（构建、模拟器、SRAM）
    // 仍然能开，其余页由 render 的正文门禁各自说明读不到；故障本身只在状态栏
    // 挂一条常驻提示，服务起来后就地重试即可，不必刷新页面。
    setResourceAlert({
      title: "资产包加载失败",
      detail: state.projectBootstrapError,
      retry: () => init(),
      error,
    });
    const catalog = await catalogPromise;
    if (catalog) {
      state.moduleCatalog = catalog;
      bindCacheControls(document);
    }
    setNavigationEnabled(true);
    await render();
  }
}

configureEditorRenderer(render);
configureEditorNavigation({allow: allowMetatileNavigation, suspend: suspendMetatileEditor});
bindSidebarToggle();
bindNavigationTree();
async function navigateSidebarItem(node) {
  const page = EDITOR_PAGES.find(page => page.id === node.dataset.editorPage);
  if (page) {
    const params = new URLSearchParams(Object.entries(page.route)
      .map(([key, value]) => [key === 'interfacePage' ? 'interface' : key, value]));
    await navigateInternalUrl(new URL(`?${params}`, location.href));
    return;
  }
  if (node.dataset.shopTab !== undefined || node.dataset.vendingFamily !== undefined
      || node.dataset.previewCommand !== undefined) {
    const url = new URL(location.origin + location.pathname);
    for (const key of ['view', 'shopFamily', 'shopTab', 'vendingFamily', 'facility', 'previewCommand']) {
      if (node.dataset[key] !== undefined) url.searchParams.set(key, node.dataset[key]);
    }
    if (node.dataset.interfacePage !== undefined) url.searchParams.set('interface', node.dataset.interfacePage);
    await navigateInternalUrl(url);
    return;
  }
  if (node.dataset.interfaceScreen !== undefined) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", node.dataset.view);
    url.searchParams.set("interface", node.dataset.interfacePage);
    url.searchParams.set("interfaceScreen", node.dataset.interfaceScreen);
    await navigateInternalUrl(url);
    return;
  }
  if (node.dataset.equipmentDomain !== undefined) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set("view", "equipment");
    url.searchParams.set(EQUIPMENT_DOMAIN_PARAM, node.dataset.equipmentDomain);
    await navigateInternalUrl(url);
    return;
  }
  await navigateView(node.dataset.view, {
    shopFamily: node.dataset.shopFamily,
    interfacePage: node.dataset.interfacePage,
  });
}
bindResourceQueries(document, {delegate: true});
document.addEventListener("click", event => {
  const legacyLink = event.target.closest?.("[data-legacy-view]");
  if (legacyLink) {
    event.preventDefault();
    void navigateSidebarItem(legacyLink);
    return;
  }
  const node = event.target.closest?.("[data-view]");
  if (!node || node.disabled) return;
  event.preventDefault();
  void navigateSidebarItem(node);
});
let searchTimer = null;
let searchGeneration = 0;
function hideSearchResults() {
  $("#search-results").hidden = true;
  $("#search-results").replaceChildren();
}
async function locateSearchHandle(value, generation) {
  try {
    const records = await searchResourceHandles(value);
    if (generation !== searchGeneration) return;
    const exact = records.find(record => record.uid.toLowerCase() === value.toLowerCase());
    if (!exact && records.length) {
      const scenes = records.some(record => record.domain === "scene" || record.kind === "scene-actor-record")
        ? await db.getDocument("project.scenes", null) : null;
      if (generation !== searchGeneration) return;
      const locations = new Map((scenes?.editable_scenes || []).map(scene => [Number(scene.id), scene.name]));
      const panel = $("#search-results");
      panel.innerHTML = `<div class="search-results-count" role="status">${records.length} 项</div>
        <div class="search-results-list">${records.map(record => {
          const route = resourceTargetRoute(record);
          const sceneName = record.domain === "scene" || record.kind === "scene-actor-record"
            ? locations.get(Number.parseInt(record.uid.split(":")[1], 16)) : null;
          const location = sceneName || views[route?.view]?.[1] || record.label || record.domain;
          return `<button type="button" class="search-result" data-search-handle="${esc(record.uid)}">
            <span class="mono">${esc(record.uid)}</span><span>${esc(location)}</span></button>`;
        }).join("")}</div>`;
      panel.hidden = false;
      return;
    }
    hideSearchResults();
    if (!exact && !value.includes(":")) return;
    const found = await navigateToResourceTarget(exact?.uid || value);
    if (generation !== searchGeneration) return;
    if (!found) editorLog.record({source: "搜索", level: "warning", message: "未找到可定位的句柄", details: value});
  } catch (error) {
    if (generation !== searchGeneration) return;
    editorLog.error("搜索", error?.message || "句柄定位失败", error, {details: value});
  }
}
$("#search").addEventListener("input", event => {
  clearTimeout(searchTimer);
  const generation = ++searchGeneration;
  const value = event.target.value.trim();
  hideSearchResults();
  state.navigationGeneration += 1;
  state.resourceId = null;
  state.query = event.target.value;
  const url = new URL(location.href);
  url.searchParams.delete("resource");
  replaceHistoryUrl(url);
  render();
  if (value) searchTimer = setTimeout(() => {
    void locateSearchHandle(value, generation);
  }, 180);
});
$("#search").addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  const value = event.target.value.trim();
  if (!value) return;
  event.preventDefault();
  clearTimeout(searchTimer);
  void locateSearchHandle(value, ++searchGeneration);
});
$("#search-results").addEventListener("click", event => {
  const result = event.target.closest("[data-search-handle]");
  if (!result) return;
  clearTimeout(searchTimer);
  hideSearchResults();
  void locateSearchHandle(result.dataset.searchHandle, ++searchGeneration);
});
document.addEventListener("click", event => {
  if (event.target.closest(".search-container")) return;
  clearTimeout(searchTimer);
  searchGeneration += 1;
  hideSearchResults();
});
$("#search").addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  clearTimeout(searchTimer);
  searchGeneration += 1;
  hideSearchResults();
});
$("#copy-hash").addEventListener("click", async () => {
  const digest = state.project?.manifest?.rom?.sha256;
  if (!digest) return;
  await navigator.clipboard.writeText(digest);
  $("#copy-hash").textContent = "已复制";
  setTimeout(() => $("#copy-hash").textContent = "复制 SHA-256", 1000);
});
document.addEventListener("keydown", event => {
  if (event.ctrlKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#search").focus();
  }
});
// 全局状态栏只消费日志服务，保存任务跟随自动保存链的真实状态。
bindLogStatus(() => navigateView("log"));

const globalBuildButton = $("#global-build-run");
const expandedBuildButton = $("#global-build-expanded");
const globalBuildOpen = $("#global-build-open");
let globalBuildRunning = false;

globalThis.addEventListener("mmeditor-browser-build", () => {
  globalBuildButton.disabled = globalBuildRunning || state.browserBuildRunning;
  expandedBuildButton.disabled = globalBuildButton.disabled;
});

function openGlobalBuildEmulator(buildId = "latest") {
  const url = new URL(siteUrl("emulator.html"), location.origin);
  url.searchParams.set("rom", buildId);
  url.searchParams.set("autostart", "1");
  const emulatorWindow = window.open(url.href, "_blank");
  if (!emulatorWindow) return false;
  emulatorWindow.opener = null;
  return true;
}

globalBuildOpen.addEventListener("click", () => {
  const opened = openGlobalBuildEmulator();
  editorLog.record({source: "模拟器", level: opened ? "info" : "warning",
    message: opened ? "模拟器已打开" : "模拟器弹窗被拦截"});
});

async function buildFromTopbar({diagnostic = false} = {}) {
  if (globalBuildRunning || state.browserBuildRunning) return;
  globalBuildRunning = true;
  const startedAt = performance.now();
  const task = editorLog.startTask({source: "构建", message: "保存编辑"});
  const elapsed = () => `${((performance.now() - startedAt) / 1000).toFixed(1)} 秒`;
  globalBuildButton.disabled = true;
  expandedBuildButton.disabled = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    await flushFixedTextEditors();
    await flushAllAutoSaves();
    if (autoSaveError()) throw autoSaveError();
    task.finish({level: "debug", message: "编辑已提交"});
    const result = await runQuickBuild();
    let emulatorBuildId = result.build_id;
    if (diagnostic) {
      const output = await createExpandedRom(result.rom, {diagnostic: true});
      emulatorBuildId = await storeExpandedRomBuild(await openActiveProjectStore(), output, result);
      const objectUrl = URL.createObjectURL(new Blob([output.rom], {type: "application/octet-stream"}));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "metalmaxcn-diagnostic.nes";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    const opened = openGlobalBuildEmulator(emulatorBuildId);
    editorLog.record({source: "构建", level: opened ? "info" : "warning",
      message: `${diagnostic ? "自检 ROM 已下载" : "构建完成"} · ${elapsed()}${opened ? " · 模拟器已打开" : " · 弹窗被拦截"}`});
  } catch (error) {
    const message = `构建失败：${error?.message || error} · ${elapsed()}`;
    task.finish({level: "error", message, error});
    if (autoSaveError() === error) editorLog.record({source: "构建", level: "error", message, error});
    else editorLog.error("构建", message, error);
  } finally {
    globalBuildRunning = false;
    globalBuildButton.disabled = state.browserBuildRunning;
    expandedBuildButton.disabled = globalBuildButton.disabled;
  }
}

globalBuildButton.addEventListener("click", () => buildFromTopbar());
expandedBuildButton.addEventListener("click", () => buildFromTopbar({diagnostic: true}));

// 页面真要走了也把防抖窗口里的那一笔立刻排进链（能不能跑完由浏览器决定，
// 至少不再等 250 毫秒的防抖窗口白白丢掉）。
window.addEventListener("pagehide", () => {void flushAllAutoSaves();});
window.addEventListener("beforeunload", () => {void flushAllAutoSaves();});
// A reload can overtake IndexedDB writes begun in an input handler. Keep this
// document alive until the existing save chain settles, then perform the reload.
let completingSavedReload = false;
window.navigation?.addEventListener("navigate", event => {
  if (completingSavedReload || event.navigationType !== "reload" ||
      !event.canIntercept || !autoSaveBusy()) return;
  event.intercept({async handler() {
    await flushAllAutoSaves();
    completingSavedReload = true;
    location.reload();
  }});
});

window.addEventListener("popstate", async event => {
  if (!await acceptHistoryNavigation(event.state)) return;
  const snapshot = event.state?.mmEditor;
  if (!snapshot) {
    location.reload();
    return;
  }
  restoreEditorHistory(snapshot);
  applyInterfacePreviewSceneRoute(new URL(location.href).searchParams);
  const input = $("#search");
  if (input) input.value = state.query;
  await render();
  requestAnimationFrame(() => window.scrollTo(
    Number(snapshot.scrollX || 0), Number(snapshot.scrollY || 0)
  ));
});

init();
