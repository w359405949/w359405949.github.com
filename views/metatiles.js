// @editor-module 元图块记录页与场景选格共用的投影与行为码编辑。
import {editorLog} from "../core/editor-log.js";
import {resetToOriginalButton, applyResetToOriginalStates} from "../ui/table.js";
import {ownerReferenceListMarkup, bindOwnerReferenceList, withCurrentOwnerRecord, currentOwnerReferenceImpact} from "../ui/owner-reference-impact.js";
import {bindInternalPageLinks} from "../core/router.js";
import {db} from "../core/project-db.js";
import {sceneMapCell} from "../core/scene-runtime-map.js";
import {setProjectField} from "../core/project-data.js";
import {trackAutoSavePreparation} from "../core/auto-save.js";
import {metatileAttributeWithBehavior, metatileBehaviorCode, metatileBehaviorLabel,
  metatileBehaviorOptions} from "../core/metatile-behavior.js";
import {terrainWhitelistCodes, terrainWhitelistSpecs} from "../core/terrain-whitelist-owner.js";
import {esc} from "../core/dom.js";
import {handleMarkup} from "../ui/handle.js";
import {writeAccessMarker} from "../ui/write-access-marker.js";
import {state} from "../core/state.js";
import {navigateInternalUrl, replaceHistoryUrl} from "../core/router.js";
import {metatileEditSession} from "../ui/metatile-edit-session.js";
import {setReferencePickerValue} from "../ui/reference-picker.js";
import {sceneMetatileAttributeRecords} from "../core/metatile-source.js";
import {worldZoneAt, loadSceneMetatileRenderer, loadWorldMetatileRenderer,
  paintSceneMetatileCells} from "../modules/scene/visual-preview.js";
import {metatileEditorMarkup, bindMetatileEditor} from "../ui/metatile-pixel-editor.js";
import {screenWorkbench} from "../ui/screen-workbench.js";
import {referenceFieldPickerMarkup, hydrateReferenceFieldPickers} from "../ui/reference-field.js";
import {prepareModuleComponent} from "../ui/module-components.js";
import "../modules/scene/components.js";
import "../modules/visual/components.js";

const WORLD_ZONES = ["northwest", "northeast", "southwest", "southeast"];
const hex = value => Number(value).toString(16).toUpperCase().padStart(2, "0");
const sceneId = handle => Number.parseInt(String(handle).split(":")[1], 16);
const sceneHandle = id => `scene:${hex(id)}`;
const tileHandle = (handle, index) => `${handle}:${hex(index)}`;
const chrHandle = (bank, tile) => `shared-chr-bank:bank:${hex(bank)}:tile:${hex(tile)}`;
let pendingEdit = Promise.resolve();
const paintRequests = new WeakMap();

function edit(operation) {
  const result = pendingEdit.then(operation);
  pendingEdit = result.catch(() => {});
  return trackAutoSavePreparation(result);
}

function bankIdsForScene(scene, zone) {
  return Number(scene.id) === 0
    ? scene.render?.zones?.find(item => item.name === zone)?.mmc3_banks
    : scene.render?.mmc3_banks;
}

function tileReferenceMarkup(definition, bankIds) {
  return `<details data-metatile-tile-references><summary>四个图块引用</summary>${definition.map(value => {
    const tile = Number(value);
    return `<code>${esc(chrHandle(bankIds[Math.floor(tile / 64)], tile % 64))}</code>`;
  }).join("")}</details>`;
}

function sources(pageDocument, setDocument, handle) {
  const sets = setDocument.records.filter(record => handle === "metatile-set:00"
    ? record.handle === handle
    : record.lower_metatile_page === handle || record.upper_metatile_page === handle);
  const scenes = [...new Set(sets.flatMap(record => record.scene_references || []))].sort();
  const page = handle === "metatile-set:00" ? sets[0]
    : pageDocument.records.find(record => record.handle === handle);
  const definitions = page?.metatile_definitions || page?.metatile_definition_page;
  const attributes = page?.metatile_attributes || page?.metatile_attribute_page;
  if (!page || !Array.isArray(definitions) || !Array.isArray(attributes)
      || definitions.length !== attributes.length) throw new Error(`${handle} 元图块正文不完整`);
  return {sets, scenes, definitions, attributes};
}

function metatileForScene(pageDocument, setDocument, scene, index) {
  const id = Number(scene.id);
  const set = setDocument.records.find(record => (record.scene_references || []).includes(sceneHandle(id)));
  if (!set) throw new Error(`${sceneHandle(id)} 没有已发布的元图块集引用`);
  const handle = id === 0 ? set.handle
    : index < 64 ? set.lower_metatile_page : set.upper_metatile_page;
  const local = id === 0 ? index : index % 64;
  const source = sources(pageDocument, setDocument, handle);
  if (!Number.isInteger(local) || local < 0 || local >= source.definitions.length)
    throw new Error(`${sceneHandle(id)} 元图块编号无效：${index}`);
  return {handle, local, definition: source.definitions[local], attribute: source.attributes[local]};
}

function metatileUrl(handle, index, context = "", point = null) {
  const params = new URLSearchParams({view: "metatiles", metatile: handle, tile: String(index)});
  if (context) params.set("context", context);
  if (point) params.set("point", point.join(","));
  return `?${params}`;
}

function terrainWhitelistMarkup(document_, draft) {
  if (!Array.isArray(document_?.blocks))
    throw new TypeError("地形行为白名单正文不完整");
  return `<section class="metatile-whitelists"><h3>行为回调白名单 ${writeAccessMarker({writebackMissing: true})}</h3>
    <div class="metatile-whitelist-tables">${terrainWhitelistSpecs.map(spec => {
      const block = document_.blocks.find(block => block.id === `field-terrain-behavior-service.${spec.id}`);
      if (!Array.isArray(block?.values) || block.values.length !== spec.length || block.values.at(-1) !== 0)
        throw new TypeError(`${spec.label} 正文不完整`);
      return `<div class="metatile-whitelist"><h4>${spec.label}</h4><div>${block.values.slice(0, -1).map((saved, index) => {
        const code = draft.value("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`, saved);
        return `<label>位置 ${index + 1} <select data-terrain-whitelist="${spec.id}" data-terrain-index="${index}">
          ${metatileBehaviorOptions.filter(item => terrainWhitelistCodes.includes(item.code)).map(item =>
            `<option value="${item.code}" ${item.code === code ? "selected" : ""}>${esc(item.label)}</option>`).join("")}
        </select></label>`;
      }).join("")}</div></div>`;
    }).join("")}</div><span role="status" data-terrain-whitelist-status></span></section>`;
}

function sceneUrl(handle, point = null) {
  const id = sceneId(handle);
  const entry = state.project?.scenes?.editable_scenes?.find(item => Number(item.id) === id);
  const params = new URLSearchParams({view: "scenes", scene: entry?.slug || `${String(id).padStart(3, "0")}-scene-${hex(id)}`});
  if (id !== 0) params.set("sceneMode", "tiles");
  if (point) params.set("scenePoint", point.join(","));
  return `?${params}`;
}

async function paintCanvases(root, scene, zone, {draft = null, handle = draft?.handle,
  localIndex = null} = {}) {
  const request = {};
  paintRequests.set(root, request);
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
  ]);
  const records = sceneMetatileAttributeRecords(scene, {pages, sets});
  let offset = 0;
  for (const record of records) {
    if (record.handle === handle) break;
    offset += (record.metatile_definitions || record.metatile_definition_page).length;
  }
  const options = draft ? {metatileEdits: [{handle, definitions: draft.read(draft.definitions),
    attributes: draft.read(draft.attributes)}],
    transformPatternTable: (table, banks) => draft.paintChrTable(table, banks)} : {};
  const renderer = await (Number(scene.id) === 0 ? loadWorldMetatileRenderer : loadSceneMetatileRenderer)(scene, options);
  if (!root.isConnected || paintRequests.get(root) !== request) return;
  for (const canvas of root.querySelectorAll("canvas[data-metatile-index]")) {
    paintSceneMetatileCells(canvas.getContext("2d"), scene, renderer,
      [{x: 0, y: 0, metatile_id: offset + (localIndex ?? Number(canvas.dataset.metatileIndex))}], {zone});
    canvas.dataset.metatilePainted = "1";
  }
}

export async function renderMetatiles() {
  const [pages, sets, terrain] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
    db.getResourceDocument("field-terrain-behavior-service", null),
  ]);
  if (!Array.isArray(pages?.records) || !Array.isArray(sets?.records))
    throw new Error("元图块字段对象正文不可用");
  const params = new URLSearchParams(location.search);
  const requested = params.get("metatile");
  const selectedSet = sets.records.find(record => record.handle === requested
    && record.kind === "shared-page-pair");
  if (selectedSet) return `<div class="metatile-page" data-metatile-set-detail>
    <p><a href="?view=metatiles">← 元图块页</a></p><h2>${esc(selectedSet.handle)}</h2>${handleMarkup(selectedSet.handle)}
    <div class="metatile-set-pages"><a href="${esc(metatileUrl(selectedSet.lower_metatile_page, 0))}">下页 ${esc(selectedSet.lower_metatile_page)}</a>
      <a href="${esc(metatileUrl(selectedSet.upper_metatile_page, 0))}">上页 ${esc(selectedSet.upper_metatile_page)}</a></div>
    ${ownerReferenceListMarkup("引用场景", `data-metatile-users="${esc(selectedSet.handle)}"`)}</div>`;
  const handles = [...pages.records.map(record => record.handle), "metatile-set:00"];
  const handle = handles.includes(requested) ? requested : handles[0];
  const {scenes} = sources(pages, sets, handle);
  const draft = await metatileEditSession(handle);
  const definitions = draft.read(draft.definitions), attributes = draft.read(draft.attributes);
  const requestedContext = params.get("context");
  const context = scenes.includes(requestedContext) ? requestedContext : scenes[0];
  const point = /^\d{1,3},\d{1,3}$/.test(params.get("point") || "")
    ? params.get("point").split(",").map(Number) : null;
  const zone = context === "scene:00" && point ? worldZoneAt(...point)
    : WORLD_ZONES.includes(params.get("zone")) ? params.get("zone") : "northwest";
  const contextDocument = await db.getResourceDocument(context, null);
  const contextScene = contextDocument?.scene || contextDocument;
  const bankIds = bankIdsForScene(contextScene, zone);
  if (!Array.isArray(bankIds) || bankIds.length !== 4) throw new Error(`${context} 缺少 CHR 上下文`);
  const focus = Number(params.get("tile"));
  const selected = Number.isInteger(focus) && focus >= 0 && focus < definitions.length ? focus : 0;
  const url = (next, nextContext = context, nextZone = zone) => {
    const target = metatileUrl(handle, next, nextContext, point);
    return nextZone === "northwest" || point ? target : `${target}&zone=${nextZone}`;
  };
  const [pageOptions, setOptions] = await Promise.all([
    prepareModuleComponent("metatile-page", "reference"),
    prepareModuleComponent("metatile-set", "reference"),
  ]);
  const pageChoices = [...pageOptions.entries, setOptions.entries.find(record => record.handle === "metatile-set:00")];
  const pagePicker = referenceFieldPickerMarkup({
    reference: {key: ["handle"], targets: {domains: [{module: "metatile-page"}, {module: "metatile-set"}]}},
    rows: pageChoices, rowModules: pageChoices.map(record => record.handle.split(":")[0]),
    value: handle, label: "元图块页", componentAttributes: "data-metatile-page-picker",
  });
  const contextEntries = state.project.scenes.editable_scenes.filter(entry => scenes.includes(sceneHandle(entry.id)));
  const contextMarkup = `<div class="metatile-context"><span>像素上下文</span>${referenceFieldPickerMarkup({
    reference: {module: "scene-header-map", key: ["id"]}, rows: contextEntries,
    value: sceneId(context), label: "场景", componentAttributes: "data-metatile-context-picker",
  })}
    ${context === "scene:00" ? `<label>地理区 <select data-metatile-zone>${WORLD_ZONES.map(item =>
      `<option value="${item}" ${item === zone ? "selected" : ""}>${item}</option>`).join("")}</select></label>` : ""}
    </div>`;
  const editor = metatileEditorMarkup({handle, selected, definition: definitions[selected],
    attribute: attributes[selected], colors: contextScene.render.background_palette.colors, contextMarkup});
  const whitelistTab = params.get("metatileTab") === "whitelists";
  return `<div class="metatile-page" data-metatile-editor>
    <div data-metatile-reference-header>
    <nav class="view-tabs" aria-label="元图块工作台"><button type="button" class="button ${whitelistTab ? "ghost" : "primary"}"
      data-metatile-tab="workbench" aria-pressed="${!whitelistTab}">元图块</button>
      <button type="button" class="button ${whitelistTab ? "primary" : "ghost"}"
      data-metatile-tab="whitelists" aria-pressed="${whitelistTab}">地形白名单</button>
      <button type="button" class="button primary" data-metatile-save ${draft.dirty ? "" : "disabled"}>保存</button>
      <span role="status" data-metatile-save-status>${draft.dirty ? "未保存" : ""}</span></nav>
    ${ownerReferenceListMarkup("使用此元图块页", `data-metatile-users="${esc(handle)}"`)}
    </div>
    <section class="metatile-workbench-panel" data-metatile-panel="workbench" ${whitelistTab ? "hidden" : ""}>
      ${screenWorkbench({namespace: "metatiles", className: "metatile-workbench", treeTitle: "元图块页",
        treeMarkup: `${pagePicker}<div class="metatile-grid">${definitions.map((_, index) =>
          `<a class="metatile-card ${index === selected ? "selected" : ""}" id="metatile-${hex(index)}"
            href="${esc(url(index))}" aria-label="元图块 ${esc(tileHandle(handle, index))}" ${index === selected ? 'aria-current="true"' : ""}>
            <canvas width="16" height="16" data-metatile-index="${index}" aria-hidden="true"></canvas>
            <code>${hex(index)}</code></a>`).join("")}</div>`,
        stageMarkup: editor.stageMarkup, inspectorTitle: "元图块详情",
        inspectorMarkup: `${editor.inspectorMarkup}<div class="metatile-inspector-fields">
          <div class="inline-reset-row"><label>碰撞行为 <select data-metatile-behavior data-metatile-index="${selected}">${metatileBehaviorOptions.map(option =>
            `<option value="${option.code}" ${option.code === metatileBehaviorCode(attributes[selected]) ? "selected" : ""}>${esc(option.label)}</option>`).join("")}</select></label>${
            resetToOriginalButton(`behavior:${selected}`, {attributes: {
              'data-metatile-behavior-reset': '', 'data-metatile-index': selected},
              dirty: metatileBehaviorCode(attributes[selected]) !== metatileBehaviorCode(draft.attributes.defaultValue[selected]),
            })}</div>
          <span role="status" data-metatile-behavior-status></span>
          ${tileReferenceMarkup(definitions[selected], bankIds)}
        </div>`,
      })}
    </section>
    <section data-metatile-panel="whitelists" ${whitelistTab ? "" : "hidden"}>${terrainWhitelistMarkup(terrain, draft)}</section>
  </div>`;
}

export async function bindMetatiles() {
  const root = document.querySelector(".metatile-page");
  if (!root) return;
  root.querySelectorAll('[data-metatile-users]').forEach(host =>
    bindOwnerReferenceList(host, async () => {
      const handle = host.dataset.metatileUsers;
      const {sets, scenes} = await withCurrentOwnerRecord({kind: 'metatile', handle}, db,
        () => currentOwnerReferenceImpact());
      return (handle.startsWith('metatile-page:') ? `<div class="metatile-set-links">${sets.map(item =>
        `<a href="${esc(metatileUrl(item.handle, 0))}">${esc(item.handle)} ↗</a>`).join('')}</div>` : '')
        + `<div class="metatile-scene-links">${scenes.map(item =>
          `<a href="${esc(sceneUrl(item))}">${esc(item)} ↗</a>`).join('')}</div>`;
    }, () => bindInternalPageLinks(root)));
  if (root.hasAttribute("data-metatile-set-detail")) return;
  const params = new URLSearchParams(location.search);
  const handle = params.get("metatile") || "metatile-page:00";
  const [pages, sets] = await Promise.all([
    db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
  ]);
  const selectedHandle = handle === "metatile-set:00" || pages.records.some(item => item.handle === handle)
    ? handle : pages.records[0].handle;
  const {scenes} = sources(pages, sets, selectedHandle);
  const draft = await metatileEditSession(selectedHandle);
  const definitions = draft.read(draft.definitions), attributes = draft.read(draft.attributes);
  const context = scenes.includes(params.get("context")) ? params.get("context") : scenes[0];
  const point = /^\d{1,3},\d{1,3}$/.test(params.get("point") || "")
    ? params.get("point").split(",").map(Number) : null;
  const zone = context === "scene:00" && point ? worldZoneAt(...point)
    : WORLD_ZONES.includes(params.get("zone")) ? params.get("zone") : "northwest";
  const document_ = await db.getResourceDocument(context, null);
  if (!root.isConnected) return;
  const canonical = new URL(location.href);
  canonical.searchParams.set("metatile", selectedHandle);
  canonical.searchParams.set("tile", String(Math.max(0, Math.min(definitions.length - 1, Number(params.get("tile")) || 0))));
  canonical.searchParams.set("context", context);
  if (context === "scene:00") canonical.searchParams.set("zone", zone);
  else canonical.searchParams.delete("zone");
  replaceHistoryUrl(canonical);
  await paintCanvases(root, document_?.scene || document_, zone, {draft});
  if (!root.isConnected) return;
  await bindMetatileEditor(root, {
    index: Math.max(0, Math.min(definitions.length - 1, Number(params.get("tile")) || 0)),
    scene: document_?.scene || document_,
    bankIds: bankIdsForScene(document_?.scene || document_, zone), draft,
    paintMetatiles: () => paintCanvases(root, document_?.scene || document_, zone, {draft})});
  if (!root.isConnected) return;
  const saveButton = root.querySelector("[data-metatile-save]");
  const saveStatus = root.querySelector("[data-metatile-save-status]");
  let paintFrame = null;
  draft.onChange = () => {
    if (!root.isConnected) return;
    if (paintFrame === null) paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      if (!root.isConnected) return;
      void paintCanvases(root, document_?.scene || document_, zone, {draft}).catch(error => {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        if (root.isConnected) saveStatus.textContent = String(error?.message || error);
      });
    });
    const reset = root.querySelector('[data-metatile-behavior-reset]');
    if (reset) {
      const index = Number(reset.dataset.metatileIndex);
      applyResetToOriginalStates(reset.parentElement, new Map([[`behavior:${index}`,
        metatileBehaviorCode(draft.read(draft.attributes)[index])
          !== metatileBehaviorCode(draft.attributes.defaultValue[index])]]), {busy: Boolean(draft.saving)});
    }
    saveButton.disabled = !draft.dirty || Boolean(draft.saving);
    saveStatus.textContent = draft.saving ? "保存中" : draft.dirty ? "未保存" : "";
    root.querySelectorAll("[data-metatile-panel]").forEach(panel => {panel.inert = Boolean(draft.saving);});
  };
  draft.onChange();
  saveButton.addEventListener("click", async () => {
    try {await draft.save();}
    catch (error) {
      editorLog.error("元图块", `操作失败：${error?.message || error}`, error);saveStatus.textContent = String(error?.message || error);}
  });
  hydrateReferenceFieldPickers(root);
  root.querySelector("[data-metatile-page-picker]").addEventListener("module-reference-change", async event => {
    const picker = event.currentTarget;
    if (!await navigateInternalUrl(metatileUrl(picker.dataset.moduleReferenceValue, 0)))
      await setReferencePickerValue(picker, selectedHandle);
  });
  root.querySelector("[data-metatile-context-picker]").addEventListener("module-reference-change", event => {
    void navigateInternalUrl(metatileUrl(selectedHandle, Number(params.get("tile")) || 0,
      sceneHandle(Number(event.currentTarget.dataset.moduleReferenceValue))));
  });
  root.querySelectorAll("[data-metatile-tab]").forEach(button => button.addEventListener("click", () => {
    const tab = button.dataset.metatileTab;
    root.querySelectorAll("[data-metatile-panel]").forEach(panel => {panel.hidden = panel.dataset.metatilePanel !== tab;});
    root.querySelectorAll("[data-metatile-tab]").forEach(item => {
      const active = item === button;
      item.classList.toggle("primary", active);
      item.classList.toggle("ghost", !active);
      item.setAttribute("aria-pressed", String(active));
    });
    const target = new URL(location.href);
    if (tab === "whitelists") target.searchParams.set("metatileTab", tab);
    else target.searchParams.delete("metatileTab");
    replaceHistoryUrl(target);
    window.dispatchEvent(new Event("resize"));
  }));
  root.querySelector("[data-metatile-zone]")?.addEventListener("change", event => {
    void navigateInternalUrl(`${metatileUrl(selectedHandle, Number(params.get("tile")) || 0, context)}&zone=${event.target.value}`);
  });
  const behaviorSelect = root.querySelector("[data-metatile-behavior]");
  const behaviorReset = root.querySelector("[data-metatile-behavior-reset]");
  const behaviorStatus = root.querySelector("[data-metatile-behavior-status]");
  const field = draft.attributes;
  function changeBehavior(code) {
    try {
      const index = Number(behaviorSelect.dataset.metatileIndex);
      const values = [...draft.read(field)];
      values[index] = metatileAttributeWithBehavior(values[index], code);
      draft.set(field, values);
      behaviorSelect.value = String(code);
      behaviorStatus.textContent = "";
    } catch (error) {
      editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
      behaviorStatus.textContent = String(error?.message || error);
      behaviorSelect.value = String(metatileBehaviorCode(draft.read(field)[Number(behaviorSelect.dataset.metatileIndex)]));
    }
  }
  behaviorSelect?.addEventListener("change", event => {
    const raw = event.target.value;
    const code = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(code) || code < 0 || code > 63) {
      behaviorStatus.textContent = "行为码必须是 0–63 的整数";
      behaviorSelect.value = String(metatileBehaviorCode(draft.read(field)[Number(behaviorSelect.dataset.metatileIndex)]));
      return;
    }
    void changeBehavior(code);
  });
  behaviorReset?.addEventListener("click", () => {
    const index = Number(behaviorReset.dataset.metatileIndex);
    void changeBehavior(metatileBehaviorCode(field.defaultValue[index]));
  });
  root.querySelectorAll("[data-terrain-whitelist]").forEach(select => {
    select.addEventListener("change", async () => {
      const status = root.querySelector("[data-terrain-whitelist-status]");
      const spec = terrainWhitelistSpecs.find(item => item.id === select.dataset.terrainWhitelist);
      const index = Number(select.dataset.terrainIndex);
      const code = Number(select.value);
      try {
        if (!spec || !Number.isInteger(index) || index < 0 || index >= spec.length - 1
            || !terrainWhitelistCodes.includes(code)) throw new TypeError("白名单行为码无效");
        const field = await db.getField("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`);
        draft.set(field, code);
        status.textContent = "";
      } catch (error) {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        status.textContent = String(error?.message || error);
        const field = await db.getField("field-terrain-behavior-service",
          `field-terrain-behavior-service:${spec.id}`, `value${index}`);
        select.value = String(draft.read(field));
      }
    });
  });
  if (!root.querySelector('[data-metatile-panel="workbench"]').hidden)
    root.querySelector(".metatile-card.selected")?.scrollIntoView({block: "nearest"});
}

export async function hydrateSceneMetatileInspector() {
  const root = document.querySelector("[data-scene-metatile], [data-scene-metatile-brush]");
  const selected = root?.dataset.sceneMetatile?.split(",").map(Number);
  if (!root || !state.scene) return;
  const [x, y] = selected || [];
  const id = selected ? sceneMapCell(state.scene, x, y)?.metatileId : Number(root.dataset.sceneMetatileBrush);
  try {
    const [pages, sets] = await Promise.all([
      db.getResourceDocument("metatile-page", null), db.getResourceDocument("metatile-set", null),
    ]);
    if (!root.isConnected || selected && root.dataset.sceneMetatile !== `${x},${y}`
        || !selected && Number(root.dataset.sceneMetatileBrush) !== id) return;
    const record = metatileForScene(pages, sets, state.scene, id);
    const zone = Number(state.scene.id) === 0 ? worldZoneAt(x, y) : "northwest";
    root.innerHTML = `<div class="scene-metatile-identity"><span>${selected ? `${x}, ${y}` : `当前画笔 $${hex(id)}`}</span>
      <a class="editor-inline-link" href="${esc(metatileUrl(record.handle, record.local, sceneHandle(state.scene.id), selected))}">${esc(tileHandle(record.handle, record.local))} ↗</a></div>
      <canvas width="16" height="16" data-metatile-index="0" aria-label="${esc(tileHandle(record.handle, record.local))} 像素"></canvas>
      <div class="metatile-info"><label>调色板 <select data-scene-metatile-palette aria-label="调色板">${Array.from({length: 4}, (_, value) =>
        `<option value="${value}" ${value === (record.attribute & 3) ? "selected" : ""}>0x${hex(value)}</option>`).join("")}</select></label>
      <label>碰撞行为 <select data-scene-metatile-behavior aria-label="碰撞行为">${metatileBehaviorOptions.map(option =>
        `<option value="${option.code}" title="${esc(metatileBehaviorLabel(option.code))}" ${option.code === metatileBehaviorCode(record.attribute) ? "selected" : ""}>0x${hex(option.code)}</option>`).join("")}</select></label></div>
      <small class="scene-metatile-chr">CHR ${record.definition.map(value => `0x${hex(value)}`).join(" · ")}</small>
      <p role="alert" data-scene-metatile-error hidden></p>`;
    const resource = record.handle.startsWith("metatile-set:") ? "metatile-set" : "metatile-page";
    const suffix = record.handle.split(":").at(-1);
    const field = await db.getField(resource, resource === "metatile-set"
      ? `${resource}:${suffix}-attributes` : `${resource}:attributes-${suffix}`, "value0");
    if (!root.isConnected) return;
    const palette = root.querySelector("[data-scene-metatile-palette]");
    const behavior = root.querySelector("[data-scene-metatile-behavior]");
    const sync = () => {
      palette.value = String(field.value[record.local] & 3);
      behavior.value = String(metatileBehaviorCode(field.value[record.local]));
      behavior.title = metatileBehaviorLabel(Number(behavior.value));
    };
    sync();
    for (const control of [palette, behavior]) control.addEventListener("change", () => {
      const value = Number(control.value);
      void edit(async () => {
        const values = [...field.value];
        values[record.local] = control === palette
          ? (values[record.local] & 0xfc) | value
          : metatileAttributeWithBehavior(values[record.local], value);
        await setProjectField(db, field, values);
        await import("../main.js").then(module => module.render());
      }).catch(error => {
        editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
        if (!root.isConnected) return;
        sync();
        const status = root.querySelector("[data-scene-metatile-error]");
        status.hidden = false;
        status.textContent = String(error?.message || error);
      });
    });
    await paintCanvases(root, state.scene, zone, {handle: record.handle, localIndex: record.local});
  } catch (error) {
    editorLog.error("元图块", `操作失败：${error?.message || error}`, error);
    if (root.isConnected) root.textContent = String(error?.message || error);
  }
}
