// @editor-module 场景概览与资源表
import {empty} from "../../main.js";
import {esc, hex} from "../../core/dom.js";
import {resourceForwardReferenceCell, tableValueStack} from "../../core/resource-index.js";
import {state} from "../../core/state.js";
import {assets, badge} from "../../ui/cards.js";
import {renderModuleComponent} from "../../ui/module-components.js";









//
// 来源：拆分前 engine/editor/app.js 第 8250-8368 行。








export function sceneInvestigationLayerCount(summary) {
  return Number(summary?.investigation_points || 0)
    + Number(summary?.investigation_special_points || 0)
    + Number(summary?.metatile_investigation_points || 0);
}

export function sceneResourceUid(entry) {
  return `scene:${Number(entry.id).toString(16).toUpperCase().padStart(2, "0")}`;
}

function normalizeSceneFilter(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[×＊*]/g, "x")
    .replace(/\s+/g, " ");
}

function sceneFilterText(entry) {
  const id = Number(entry.id);
  const idHex = id.toString(16).toUpperCase().padStart(2, "0");
  const width = Number(entry.width) || 0;
  const height = Number(entry.height) || 0;
  return normalizeSceneFilter([
    id,
    idHex,
    `0x${idHex}`,
    `$${idHex}`,
    sceneResourceUid(entry),
    entry.id_hex,
    entry.slug,
    entry.name,
    `${width}x${height}`,
    `${width * 16}x${height * 16}`,
  ].join(" "));
}

function sceneMatchesFilter(entry, query) {
  const terms = normalizeSceneFilter(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const text = sceneFilterText(entry);
  return terms.every(term => text.includes(term));
}

function applySceneOverviewFilter(root = document) {
  const input = root.querySelector("[data-scene-list-filter]");
  if (!input) return 0;
  const query = normalizeSceneFilter(input.value);
  const terms = query.split(" ").filter(Boolean);
  const rows = [...root.querySelectorAll("[data-scene-list-row]")];
  let visible = 0;
  for (const row of rows) {
    const pinned = row.dataset.sceneResourceId === state.resourceId;
    const globalMatch = row.dataset.sceneGlobalMatch !== "0";
    const localMatch = terms.every(term => row.dataset.sceneListSearch.includes(term));
    row.hidden = !(pinned || (globalMatch && localMatch));
    if (!row.hidden) visible += 1;
  }
  const count = root.querySelector("[data-scene-list-count]");
  if (count) count.textContent = String(visible);
  const table = root.querySelector("[data-scene-list-table]");
  if (table) table.hidden = visible === 0;
  const emptyState = root.querySelector("[data-scene-list-empty]");
  if (emptyState) emptyState.hidden = visible !== 0;
  const clear = root.querySelector("[data-scene-list-filter-clear]");
  if (clear) clear.disabled = !input.value;
  return visible;
}

export function bindSceneOverviewFilter(root = document, onChange = null) {
  const input = root.querySelector("[data-scene-list-filter]");
  if (!input || input.dataset.sceneListFilterBound === "1") return;
  input.dataset.sceneListFilterBound = "1";
  const update = () => {
    state.sceneListFilter = input.value;
    if (String(state.resourceId || "").startsWith("scene:")) {
      state.resourceId = null;
      root.querySelectorAll(".resource-target-focus").forEach(node =>
        node.classList.remove("resource-target-focus")
      );
    }
    applySceneOverviewFilter(root);
    onChange?.();
  };
  input.addEventListener("input", update);
  root.querySelector("[data-scene-list-filter-clear]")?.addEventListener("click", () => {
    if (!input.value) return;
    input.value = "";
    update();
    input.focus({preventScroll: true});
  });
  applySceneOverviewFilter(root);
}

function renderSceneOverview() {
  const scenes = state.project.scenes || {};
  const entries = scenes.editable_scenes || [];
  const q = state.query;
  const localFilter = state.sceneListFilter || "";
  const resourceTarget = String(state.resourceId || "");
  const candidates = entries.filter(entry =>
    sceneMatchesFilter(entry, q) || sceneResourceUid(entry) === resourceTarget
  );
  const visible = candidates.filter(entry =>
    sceneResourceUid(entry) === resourceTarget || sceneMatchesFilter(entry, localFilter)
  );
  const rows = candidates.map(entry => {
    const counts = entry.logic_summary || {};
    const pointTransitions = Number(counts.point_transitions || 0);
    const boundaryExits = Number(counts.boundary_exits || 0);
    const resourceUid = sceneResourceUid(entry);
    const pinned = resourceUid === resourceTarget;
    const globalMatch = sceneMatchesFilter(entry, q);
    const localMatch = sceneMatchesFilter(entry, localFilter);
    return `<tr class="${entry.id === 0 ? "world" : ""}" data-scene-open="${esc(entry.slug)}" tabindex="0" role="link" aria-label="${esc(entry.name)}"
      data-scene-list-row="${esc(entry.slug)}"
      data-scene-resource-id="${resourceUid}"
      data-scene-global-match="${globalMatch ? "1" : "0"}"
      data-scene-list-search="${esc(sceneFilterText(entry))}"${pinned || (globalMatch && localMatch) ? "" : " hidden"}>
      <td><button class="resource-uid" type="button" data-resource-query="${resourceUid}">${resourceUid}</button></td>
      <td>${renderModuleComponent("scene-header-map", "preview", {
        entry, sceneId: entry.id, width: 110, height: 66, interactive: false,
      })}</td>
      <td><b>${esc(entry.name)}</b></td>
      <td class="mono num">${entry.width}</td>
      <td class="mono num">${entry.height}</td>
      <td class="mono num">${entry.width * 16} × ${entry.height * 16}</td>
      <td class="mono num">${Number(counts.actors || 0)}</td>
      <td class="mono num">${Number(counts.treasures || 0)}</td>
      <td class="mono num" title="设施 ${Number(counts.investigation_points || 0)} / 专用坐标 ${Number(counts.investigation_special_points || 0)} / 图块行为 ${Number(counts.metatile_investigation_points || 0)}">${sceneInvestigationLayerCount(counts)}</td>
      <td class="mono num">${pointTransitions}</td>
      <td class="mono num">${boundaryExits}</td>
      <td class="mono num">${Number(counts.event_triggers || 0)}</td>
      <td>${resourceForwardReferenceCell(resourceUid)}</td>
    </tr>`;
  }).join("");
  return `<div class="section-line"><h2>场景列表</h2><span><b data-scene-list-count>${visible.length}</b> / ${entries.length} ROM 重建预览</span></div>
    <div class="scene-list-filter-bar">
      <label class="scene-list-filter-label" for="scene-list-filter">过滤场景</label>
      <input id="scene-list-filter" type="search" data-scene-list-filter
        value="${esc(localFilter)}" placeholder="ID、名称或尺寸，例如 $98、城镇、18×12"
        autocomplete="off" spellcheck="false">
      <button class="button ghost" type="button" data-scene-list-filter-clear${localFilter ? "" : " disabled"}>清除</button>
    </div>
    ${candidates.length ? `<div class="table-wrap scene-overview-table" data-scene-list-table${visible.length ? "" : " hidden"}><table>
      <thead><tr>
        <th>资源 ID</th><th>缩略图</th><th>场景名称</th>
        <th>宽</th><th>高</th><th>像素尺寸</th>
        <th>NPC</th><th>调查物</th><th>调查交互</th><th>坐标传送</th><th>边界出口</th><th>坐标事件</th>
        <th>引用资产</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>` : ""}
    <div class="empty scene-list-empty" data-scene-list-empty${visible.length ? " hidden" : ""}><b>没有匹配的场景</b></div>`;
}

export function renderSceneResources() {
  const list = assets().filter(a => a.kind?.startsWith("map.") || a.kind?.includes("map-stream"));
  const catalog = state.project.scenes?.catalog || [];
  const realScenes = state.project.scenes?.real_scene_count ?? catalog.filter(item => item.editable).length;
  if (!list.length && !catalog.length) return empty();
  return `${renderSceneOverview()}
    <details class="wide-card scene-catalog-details">
      <summary>场景入口与底层地图资产（${realScenes} 个场景 · ${catalog.length} 条索引记录）</summary>
      <div class="table-wrap scene-catalog"><table>
      <thead><tr><th>资源 ID</th><th>游戏索引 ID</th><th>名称</th><th>尺寸</th><th>METATILE 页</th></tr></thead>
      <tbody>${catalog.map(item => {
        const resourceUid = `scene:${Number(item.id).toString(16).toUpperCase().padStart(2, "0")}`;
        const editable = (state.project.scenes?.editable_scenes || []).find(scene => Number(scene.id) === Number(item.id));
        return `<tr>
        <td><button class="resource-uid" type="button" data-resource-query="${resourceUid}">${resourceUid}</button></td>
        <td class="mono">${esc(item.id_hex)}</td>
        <td><b>${esc(editable?.name || editable?.slug || `场景 ${item.id_hex}`)}</b></td>
        <td class="mono">${item.width ?? "—"} × ${item.height ?? "—"}</td>
        <td class="mono">${tableValueStack((item.metatile_pages || []).map(x => hex(x,2)))}</td>
      </tr>`;
      }).join("")}</tbody>
      </table></div>
      <div class="section-line"><h2>其他地图资产</h2><span>${list.length} ASSETS</span></div>
      <div class="table-wrap scene-asset-table"><table>
        <thead><tr><th>资源 ID</th><th>资产 ID</th><th>名称</th><th>类型</th><th>可信度</th></tr></thead>
        <tbody>${list.map(a => {
          const resourceUid = `asset:${a.id}`;
          return `<tr>
            <td><button class="resource-uid" type="button" data-resource-query="${esc(resourceUid)}">${esc(resourceUid)}</button></td>
            <td class="mono">${esc(a.id)}</td>
            <td><b>${esc(a.name || "未命名")}</b></td>
            <td class="mono">${esc(a.kind)}</td>
            <td>${badge(a)}</td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </details>`;
}
