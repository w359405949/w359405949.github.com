import { $, bindTextInputEvents, esc, resetToOriginalButton, applyResetToOriginalStates, setStatus, bindStoryPageRecovery, bindFieldResetToOriginalButtons, storyPageRecoveryButton } from './monster-figure-C07vG7yu.js';
import { saveWorkspaceChanged, resetSaveWorkspace, installLoadedSave, queueSaveWorking, openActiveProjectStore, buildBrowserRom, runLatestBrowserRomButton, db, prepareSaveBuildFieldObjects, bootstrapActiveProjectFromPackage, BOOTSTRAP_DIGEST_KEY, reportBuildState, saveAnnotations } from './scene-actors-Cftr7mCE.js';
import { editorLog } from './project-store-values-klefznSR.js';
import { putProjectSave, listProjectSaves, getProjectSave, SAVE_SOURCE_EDITOR, deleteProjectSave, buildTimeStamp, buildTimeLabel } from './emulator-eSa0Jyze.js';
import { renderSaveCurrentFieldObject } from './rectangle-preset-controls-MtKWNScU.js';
import { saveFields, byteMapHex, renderByteMapExplorer, prepareSaveEditorWorkspace, createByteMapExplorer, configureSaveEditorCallbacks, replaceHistoryUrl, filterByteMap, bindByteMapExplorer, selectByteMapOffset } from './preview-sound-DHDXA99x.js';
import { state } from './emulator-Bl-sLXnd.js';

// @editor-module Local battery-save workbench backed by the unified byte map.
//
// The page has no save-specific parsed document or duplicate layout tables.
// SRAM bank/page JSON supplies addresses/annotations; a deterministic default or an
// imported .sav replaces the one current value array. That array goes through the
// same ByteMapExplorer as PRG/CHR bank bytes.  Only field_id edits declared exact
// and editable by the map can reach the lossless writer.


let saveByteMapExplorer = null;
let saveLibraryEntries = null;
let saveLibrarySelectedId = "";
let saveLibraryMessage = "";
let saveLibraryBusy = false;
let saveLibraryRepositoryRef = null;

const hex$1 = (value, width = 2) =>
  `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

function saveImportControl(label = "选择 8 KiB 电池存档") {
  return `<label class="button primary">${esc(label)}
    <input data-save-import type="file" accept=".sav,.srm,application/octet-stream" hidden>
  </label>`;
}

function saveByteMapComplete() {
  return saveFields.complete();
}

/**
 * Whether the shared SRAM ROM-initial / current workspace is ready for a
 * field-oriented consumer such as the character attributes page.
 */
function saveWorkspaceReady() {
  return saveFields.ready();
}

async function loadSaveByteMap(options = {}) {
  await saveFields.load(options);
}


function downloadBlob$1(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function outputName() {
  const name = state.saveCurrentName || "metalmaxcn-current.sav";
  const stem = name.replace(/\.[^.]*$/, "") || "metalmaxcn";
  return stem.endsWith("-current") ? `${stem}.sav` : `${stem}-current.sav`;
}

function byteMapRange(rangeId) {
  const view = saveFields.rangeView(rangeId);
  if (!view) throw new Error(`字节地图缺少唯一范围 ${rangeId}`);
  return view.address;
}

function refreshSaveDirtyState(message = null) {
  const changes = saveFields.changedOffsets();
  if (saveWorkspaceChanged(state)) {
    state.saveCurrentSource = "edited";
  } else {
    state.saveCurrentSource = "rom-initial";
    state.saveCurrentName = "metalmaxcn-current.sav";
  }
  state.saveMessage = typeof message === "function" ? message(changes) : message || "";
  updateSaveStatus();
  return changes;
}

configureSaveEditorCallbacks({
  onChanged: message => refreshSaveDirtyState(message),
  onError: () => updateSaveStatus(`存档 Working 写入失败：${state.saveError}`),
});

const currentFieldObject = fieldId => saveFields.object(fieldId);
const findCurrentFieldObject = fieldId => saveFields.find(fieldId);
const allCurrentFieldObjects = prefix => saveFields.all(prefix);
const currentSlotStatus = slot => saveFields.slotStatus(slot);

/**
 * Patch declared save fields in the one shared current byte array.
 *
 * Consumers pass field_ids only. Width, encoding, writable status, slot
 * ownership and checksum updates remain owned by save-codec / the byte map.
 */
function patchSaveCurrentFields(edits, {message = null} = {}) {
  const bytes = saveFields.writeFields(edits, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function equipSaveCurrentVehicleCarryMain(request, {message = null} = {}) {
  const bytes = saveFields.equipVehicleCarryMain(request, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function fillSaveCurrentRentalVehicle(request, {message = null} = {}) {
  const bytes = saveFields.fillRentalVehicle(request, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function setSaveCurrentSlotActivation(slot, active, {message = null} = {}) {
  const bytes = saveFields.activateSlot(slot, active, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function resetSaveCurrentSlotActivation(slot, {message = null} = {}) {
  const bytes = saveFields.resetSlotActivation(slot, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function persistSaveCurrent() {
  state.saveError = "";
  document.querySelectorAll("[data-save-working-error]").forEach(node => { node.hidden = true; });
  const onError = error => {
    state.saveError = String(error?.message || error);
    updateSaveStatus(`存档 Working 写入失败：${state.saveError}`);
    document.querySelectorAll("[data-save-working-error]").forEach(node => {
      node.hidden = false;
      node.textContent = `存档 Working 写入失败：${state.saveError}`;
    });
  };
  try {
    queueSaveWorking(state, {onError});
  } catch (error) {
    // The current bytes have already changed. Report a synchronous queue
    // failure just like an asynchronous write failure, then refresh the rows.
    onError(error);
  }
}

/** Keep existing SRAM consumers on the domain reset authority. */
function resetSaveCurrentFields(fieldIds, {message = null} = {}) {
  const bytes = saveFields.resetFields(fieldIds, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

function optionalByteMapRange(rangeId) {
  return saveFields.rangeView(rangeId)?.address || null;
}

function saveRangeRecords(predicate = () => true) {
  return saveFields.rangeViews().filter(predicate);
}

function rangeShortcut(record) {
  const address = record.address;
  const label = record.semantic_path?.at(-1) || record.record || record.range_id;
  const range = `${byteMapHex(address.offset, 4)}–${byteMapHex(address.end_exclusive - 1, 4)}`;
  return `<button type="button" class="save-layout-jump" data-save-byte-map-jump="${address.offset}"
    title="跳到 ${esc(label)} ${esc(range)}">
    <b>${esc(label)}</b><span>${esc(range)} · ${address.length.toLocaleString()} B</span>
  </button>`;
}

function saveStructureOverview() {
  const major = saveRangeRecords(record =>
    record.range_id !== "save-container"
      && /^save\.(?:runtime-(?:prefix|suffix)|active-(?:workspace|serialized|unserialized)|directory|slot\.\d+\.record)$/.test(
        record.range_id,
      )
      && Number(record.apply_order) === 1
  ).map(rangeShortcut).join("");
  const slots = [1, 2].map(slot => {
    const slotAddress = optionalByteMapRange(`save.slot.${slot}.record`);
    if (!slotAddress) return "";
    const domains = saveRangeRecords(record =>
      record.range_id.startsWith(`save.slot.${slot}.domain.`)
    ).map(rangeShortcut).join("");
    return `<article class="save-slot-layout" data-save-layout-slot="${slot}">
      <header><div><b>存档槽 ${slot}</b><span>${byteMapHex(slotAddress.offset, 4)}–${byteMapHex(slotAddress.end_exclusive - 1, 4)} · 1 KiB</span></div>
        </header>
      <div class="save-slot-domain-grid">${domains}</div>
    </article>`;
  }).join("");
  return `<section class="save-layout-overview" aria-label="存档 SRAM 结构导航">
    <div class="section-line"><h2>8 KiB SRAM 实际分区</h2></div>
    <div class="save-major-range-grid">${major}</div>
    <div class="save-slot-layout-grid">${slots}</div>
  </section>`;
}

function slotAtOffset(offset) {
  for (const slot of [1, 2]) {
    const address = optionalByteMapRange(`save.slot.${slot}.record`);
    if (!address) continue;
    if (offset >= address.offset && offset < address.end_exclusive) {
      return {slot, local: offset - address.offset};
    }
  }
  return null;
}

function structuralLabel(offset) {
  const candidates = saveFields.rangesAt(offset)
    .sort((left, right) => left.address.length - right.address.length
      || Number(right.apply_order || 0) - Number(left.apply_order || 0));
  return candidates[0]?.record || "未标注";
}

function saveAddressColumns(offset) {
  const space = saveFields.space();
  const slot = slotAtOffset(offset);
  return [
    structuralLabel(offset),
    slot ? `槽 ${slot.slot}` : "共享",
    byteMapHex(offset, 4),
    slot ? byteMapHex(slot.local, 3) : "—",
    byteMapHex(Number(space.cpu_base) + offset, 4),
  ];
}

function parseSaveGoto(value) {
  const text = String(value || "").trim().toUpperCase();
  const space = saveFields.space();
  const physical = text.match(/^SRAM\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const cpu = text.match(/^C(?:PU)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const file = text.match(/^F(?:ILE)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const slot = text.match(/^S(?:LOT)?\s*([12])\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  let offset;
  if (physical) offset = Number.parseInt(physical[1], 16);
  else if (cpu) offset = Number.parseInt(cpu[1], 16) - Number(space.cpu_base);
  else if (file) offset = Number.parseInt(file[1], 16);
  else if (slot) {
    const address = optionalByteMapRange(`save.slot.${Number(slot[1])}.record`);
    if (!address) return null;
    const local = Number.parseInt(slot[2], 16);
    offset = local < address.length ? address.offset + local : Number.NaN;
  } else {
    const raw = text.replace(/^\$/, "").replace(/^0X/, "");
    offset = /^[0-9A-F]+$/.test(raw) ? Number.parseInt(raw, 16) : Number.NaN;
  }
  return Number.isFinite(offset) && offset >= 0 && offset < space.length ? offset : null;
}

function editableFieldMarkup(annotation, offset, bytes) {
  if (!(bytes instanceof Uint8Array) || !saveByteMapComplete()) return null;
  if (offset !== annotation.rangeStart || !annotation.fieldId) return null;
  const label = annotation.binding.label || annotation.field.meaning || annotation.fieldId;
  return renderSaveCurrentFieldObject(saveFields.object(annotation.fieldId), {label});
}

function parseByteFieldEdit(fieldId, value) {
  const object = saveFields.object(fieldId);
  const parts = String(value ?? "").trim().split(/\s+/u).filter(Boolean);
  const length = Number(object.physical.length);
  if (parts.length !== length || parts.some(part => !/^[0-9a-f]{2}$/iu.test(part))) {
    throw new Error(`${fieldId} 必须提供 ${length} 个两位十六进制字节`);
  }
  return Uint8Array.from(parts.map(part => Number.parseInt(part, 16)));
}

function buildSaveExplorer() {
  const bytes = state.saveCurrentBytes;
  const space = saveFields.space();
  const length = bytes?.length ?? space.length;
  const annotations = saveFields.projectAnnotations();
  const ui = state.saveExplorerUi || {
    selectedOffset: state.saveSelectedOffset !== null
      && state.saveSelectedOffset !== undefined
      && Number.isInteger(Number(state.saveSelectedOffset))
      ? Number(state.saveSelectedOffset)
      : optionalByteMapRange("save.slot.1.record")?.offset ?? 0,
    search: "",
    semanticScope: "all",
    valueSearch: "",
    valueCompare: "eq",
    valueWidth: 1,
    valueScope: "all",
  };
  state.saveExplorerUi = ui;
  state.saveSelectedOffset = ui.selectedOffset;
  ui.searchIndex = null;
  ui.filteredOffsets = null;
  ui.filterResult = null;
  ui.virtualFrame = null;
  ui.recordPagePromise = null;
  ui.pendingPageOffsets = null;
  ui.recordPageError = "";
  return createByteMapExplorer({
    id: "sram-byte-map",
    space: "sram",
    label: "SRAM",
    bytes,
    length,
    annotations,
    ui,
    addressHeaders: ["区域", "归属", "文件偏移", "槽内偏移", "CPU"],
    addressColumns: saveAddressColumns,
    parseGoto: parseSaveGoto,
    formatGoto: offset => byteMapHex(offset, 4),
    async resolveGoto(offset, model) {
      const previousPages = saveFields.loadedPageCount();
      await loadSaveByteMap({pageOffsets: [offset]});
      if (saveFields.loadedPageCount() !== previousPages) {
        model.annotations = saveFields.projectAnnotations();
        model.ui.searchIndex = null;
        filterByteMap(model);
      }
      return offset;
    },
    async ensureOffsets(offsets) {
      if (saveByteMapComplete()) return saveByteMapExplorer.annotations;
      const pageOffsets = [...new Set(offsets.map(offset =>
        Math.floor(Number(offset) / 0x100) * 0x100))];
      await loadSaveByteMap({pageOffsets});
      return saveFields.projectAnnotations();
    },
    ownerAddressLoaded(offset) {
      return saveFields.addressLoaded(offset);
    },
    fieldEditor: editableFieldMarkup,
    onFieldEdit(fieldId, value, model) {
      if (value === null) throw new Error(`${fieldId} 不能为空`);
      const object = saveFields.object(fieldId);
      const normalized = object.binding?.encoding === "bytes"
        ? parseByteFieldEdit(fieldId, value) : value;
      return object.set(normalized);
    },
    onUiChange(ui_) {
      state.saveExplorerUi = ui_;
      state.saveSelectedOffset = ui_.selectedOffset;
    },
    onSelect(offset) {
      state.saveExplorerUi.selectedOffset = offset;
      state.saveSelectedOffset = offset;
      const url = new URL(location.href);
      url.searchParams.set("sramOffset", String(offset));
      replaceHistoryUrl(url);
      setStatus({address: state.view === "save" ? "" : `SRAM ${byteMapHex(offset, 4)}`});
    },
  });
}

function installSaveCurrent(bytes, name, message) {
  // The byte-map-backed status calls validate both exact length and required
  // metadata/range annotations before this source replaces the current value.
  saveFields.slotStatusFor(bytes, 1);
  saveFields.slotStatusFor(bytes, 2);
  installLoadedSave(state, bytes, name);
  state.saveError = "";
  state.saveMessage = message
    || "已用载入文件刷新当前值；未另存一份载入文件副本。";
  state.saveExplorerUi = null;
  persistSaveCurrent();
}

function editorSaveRomSha256() {
  const value = state.project?.manifest?.rom?.sha256 ||
    state.project?.rom?.sha256 || "";
  return /^[0-9a-f]{64}$/iu.test(value) ? value.toLowerCase() : "";
}

function saveLibrarySourceLabel(source) {
  return source === SAVE_SOURCE_EDITOR ? "编辑器草稿" : "模拟器电池存档";
}

function saveLibraryOption(entry) {
  const source = saveLibrarySourceLabel(entry.source);
  const time = entry.created_at.replace("T", " ").replace(/\.\d{3}Z$/u, "Z");
  return `${entry.name} · ${entry.byte_length} B · ${source} · ${time}`;
}

function saveLibraryMarkup() {
  const entries = saveLibraryEntries || [];
  const repositoryAvailable = state.projectRepository &&
    ["putBlob", "getBlob", "deleteBlob"].every(
      method => typeof state.projectRepository[method] === "function",
    );
  const hasSelection = entries.some(entry => entry.id === saveLibrarySelectedId);
  const options = entries.map(entry => `<option value="${esc(entry.id)}"
    ${entry.id === saveLibrarySelectedId ? "selected" : ""}>${esc(saveLibraryOption(entry))}</option>`).join("");
  const defaultName = state.saveCurrentName || "metalmaxcn-current.sav";
  const status = saveLibraryMessage || "";
  return `<div class="save-library-toolbar" data-save-library>
    <label class="save-library-name"><span>存入名称</span>
      <input id="save-library-name" type="text" value="${esc(defaultName)}" maxlength="120">
    </label>
    <button class="button primary" type="button" id="save-library-store-current"
      ${saveLibraryBusy || !repositoryAvailable || !state.saveCurrentBytes ? "disabled" : ""}>存入</button>
    <label class="save-library-select"><span>项目存档库</span>
      <select id="save-library-select" ${saveLibraryBusy || !entries.length ? "disabled" : ""}>
        <option value="">${entries.length ? "选择一份存档…" : "存档库为空"}</option>${options}
      </select>
    </label>
    <button class="button ghost" type="button" id="save-library-load-current"
      ${saveLibraryBusy || !hasSelection ? "disabled" : ""}>载入</button>
    <button class="button ghost" type="button" id="save-library-delete"
      ${saveLibraryBusy || !hasSelection ? "disabled" : ""}>删除</button>
    <button class="button ghost" type="button" id="save-library-refresh"
      ${saveLibraryBusy || !repositoryAvailable ? "disabled" : ""}>刷新</button>
    <p id="save-library-state">${esc(status)}</p>
  </div>`;
}

async function refreshEditorSaveLibrary(repository, {selectedId = saveLibrarySelectedId} = {}) {
  saveLibraryEntries = await listProjectSaves(repository);
  saveLibrarySelectedId = saveLibraryEntries.some(entry => entry.id === selectedId)
    ? selectedId : "";
  return saveLibraryEntries;
}

async function storeSaveCurrentInProjectLibrary(repository, {
  name = state.saveCurrentName || "metalmaxcn-current.sav",
  romSha256 = editorSaveRomSha256(),
  id,
  createdAt,
} = {}) {
  if (!(state.saveCurrentBytes instanceof Uint8Array)) {
    throw new Error("当前存档尚未就绪，不能存入项目库");
  }
  return putProjectSave(repository, state.saveCurrentBytes, {
    id,
    name,
    source: SAVE_SOURCE_EDITOR,
    romSha256,
    createdAt,
  });
}

async function loadProjectSaveAsCurrent(repository, id) {
  if (!saveByteMapComplete()) await loadSaveByteMap({allPages: true});
  const entry = await getProjectSave(repository, id);
  if (!entry) throw new Error(`项目存档库里没有 ${id}`);
  const space = saveFields.space();
  if (entry.bytes.length !== space.length) {
    throw new Error(
      `存档是 ${entry.bytes.length} 字节；sram 地址空间要求精确 ${space.length} 字节`,
    );
  }
  installSaveCurrent(
    entry.bytes,
    entry.name,
    `已从项目存档库载入“${entry.name}”作为当前值。`,
  );
  saveLibrarySelectedId = entry.id;
  return entry;
}

function slotStatusRows() {
  return [1, 2].map(slot => {
    const status = saveFields.slotStatus(slot);
    const address = byteMapRange(`save.slot.${slot}.record`);
    return `<tr data-save-slot-status="${slot}">
      <td><b>槽 ${slot}</b></td>
      <td class="mono">${byteMapHex(address.offset, 4)}–${byteMapHex(address.end_exclusive - 1, 4)}</td>
      <td class="mono" data-save-marker="${slot}">${hex$1(status.marker)} / ${hex$1(status.expectedMarker)}</td>
      <td class="mono" data-save-checksum="${slot}">${hex$1(status.storedChecksum, 4)} / ${hex$1(status.computedChecksum, 4)}</td>
      <td data-save-valid="${slot}">${status.valid ? "有效" : status.markerValid ? "校验失败" : "未初始化 / 无效"}</td>
    </tr>`;
  }).join("");
}

function validityTable() {
  const selected = saveFields.object("save.directory.selected_slot").value;
  return `<div class="section-line"><h2>槽有效性</h2><span>当前槽 ${esc(selected)}</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>槽</th><th>SRAM 范围</th><th>标记 / 期望</th><th>存储 / 计算校验</th><th>结论</th></tr></thead>
      <tbody>${slotStatusRows()}</tbody>
    </table></div>`;
}

function renderSaveEditor() {
  if (!saveFields.loaded()) {
    return `<div class="data-editor-toolbar">
      <button class="button ghost" type="button" id="save-byte-map-retry" ${state.saveByteMapLoading ? "disabled" : ""}>${state.saveError ? "重试载入统一字节地图" : "正在载入统一字节地图…"}</button>
      <p>${state.saveError ? `统一字节地图加载失败：${esc(state.saveError)}` : ""}</p>
    </div>`;
  }
  const space = saveFields.space();
  saveByteMapExplorer = buildSaveExplorer();
  if (!state.saveRomInitialBytes) {
    const toolbar = `<div class="data-editor-toolbar">${saveImportControl(`载入 ${space.length} B 存档到当前值`)}
      <p>${state.saveError ? `初始化失败：${esc(state.saveError)}` : "正在根据当前 ROM 属性生成结构与校验合法的初始存档…"}</p>
    </div><div class="dataset-facts">
      <span><i>ROM 初始值</i><b>正在从当前项目属性生成</b></span>
      <span><i>地址空间</i><b>${esc(space.id)} · ${space.length.toLocaleString()} B</b></span>
      <span><i>CPU</i><b>${byteMapHex(space.cpu_base, 4)}–${byteMapHex(space.cpu_base + space.length - 1, 4)}</b></span>
      <span><i>当前值</i><b>等待 ROM 初始值</b></span>
    </div>`;
    const footnote = ``;
    return `${toolbar}${renderByteMapExplorer(saveByteMapExplorer, {
      beforeTable: saveStructureOverview(), afterTable: footnote,
    })}`;
  }
  const semanticsComplete = saveByteMapComplete();
  const toolbar = `<div class="data-editor-toolbar">
    ${saveImportControl("导入 .sav")}
    ${semanticsComplete ? "" : `<button class="button ghost" type="button" id="save-load-all-semantics">加载语义页</button>`}
    <span class="spacer"></span>
    <p id="save-editor-state">${esc(state.saveMessage || "")}</p>
    <span data-save-reset-control>${resetToOriginalButton("save-all", {
      dirty: saveWorkspaceChanged(state), title: "丢弃整个当前存档的编辑，回到 ROM 初始值",
    })}</span>
    <button class="button primary" type="button" id="save-download">导出 .sav</button>
  </div><div class="dataset-facts">
    <span><i>地址空间</i><b>${esc(space.id)} · ${space.length.toLocaleString()} B</b></span>
    <span><i>CPU</i><b>${byteMapHex(space.cpu_base, 4)}–${byteMapHex(space.cpu_base + space.length - 1, 4)}</b></span>
    <span><i>当前值</i><b>${esc(state.saveCurrentName)}</b></span>
  </div>${semanticsComplete ? validityTable() : ``}`;
  const footnote = ``;
  return `${toolbar}${saveLibraryMarkup()}${renderByteMapExplorer(saveByteMapExplorer, {
    beforeTable: saveStructureOverview(), afterTable: footnote,
  })}`;
}

function updateSaveStatus(message = "") {
  if (message) state.saveMessage = message;
  const status = $("#save-editor-state");
  if (status) {
    status.textContent = state.saveMessage || "";
  }
  const resetRoot = document.querySelector("[data-save-reset-control]");
  if (resetRoot) applyResetToOriginalStates(resetRoot, {"save-all": saveWorkspaceChanged(state)});
  if (state.saveCurrentBytes && saveByteMapComplete()) {
    for (const slot of [1, 2]) {
      const value = saveFields.slotStatus(slot);
      const checksum = document.querySelector(`[data-save-checksum="${slot}"]`);
      const validity = document.querySelector(`[data-save-valid="${slot}"]`);
      if (checksum) checksum.textContent = `${hex$1(value.storedChecksum, 4)} / ${hex$1(value.computedChecksum, 4)}`;
      if (validity) validity.textContent = value.valid
        ? "有效" : value.markerValid ? "校验失败" : "未初始化 / 无效";
    }
  }
  setStatus({
    rows: state.saveCurrentBytes ? `${state.saveCurrentBytes.length.toLocaleString()} SRAM 字节` : "等待存档",
    dirty: "",
    address: state.view === "save" ? "" : state.saveCurrentBytes
      ? `SRAM ${byteMapHex(state.saveSelectedOffset || 0, 4)}` : "$6000-$7FFF",
  });
}

async function prepareSaveEditorState() {
  await prepareSaveEditorWorkspace();
  if (!state.saveRomInitialBytes) return;
  const libraryRepository = state.projectRepository;
  const libraryAvailable = libraryRepository &&
    ["putBlob", "getBlob", "deleteBlob"].every(
      method => typeof libraryRepository[method] === "function",
    );
  if (libraryRepository !== saveLibraryRepositoryRef) {
    saveLibraryRepositoryRef = libraryRepository;
    saveLibraryEntries = null;
    saveLibrarySelectedId = "";
    saveLibraryMessage = "";
  }
  if (libraryAvailable && saveLibraryEntries === null && !saveLibraryBusy) {
    saveLibraryBusy = true;
    try {
      await refreshEditorSaveLibrary(libraryRepository);
      saveLibraryMessage = "";
    } catch (error) {
      saveLibraryEntries = [];
      saveLibraryMessage = `存档库读取失败：${error.message}`;
    } finally {
      saveLibraryBusy = false;
    }
  }
}

let saveEditorPreparation = null;

function prepareSaveEditor() {
  if (!saveEditorPreparation) {
    saveEditorPreparation = prepareSaveEditorState().finally(() => {saveEditorPreparation = null;});
  }
  return saveEditorPreparation;
}

async function bindSaveEditor({rerender} = {}) {
  if (!saveFields.loaded()) {
    $("#save-byte-map-retry")?.addEventListener("click", async () => {
      state.saveByteMapAttempted = false;
      state.saveError = "";
      await rerender?.();
    });
    return;
  }
  if (!state.saveRomInitialBytes) return;
  const libraryRepository = state.projectRepository;
  const libraryAvailable = libraryRepository &&
    ["putBlob", "getBlob", "deleteBlob"].every(method => typeof libraryRepository[method] === "function");
  if (!libraryAvailable && !saveLibraryMessage) {
    saveLibraryMessage = "当前项目库尚未就绪，存档库入口暂不可用。";
  }
  bindTextInputEvents($("#save-library-name"));
  $("#save-library-select")?.addEventListener("change", event => {
    saveLibrarySelectedId = event.currentTarget.value;
    const selected = Boolean(saveLibrarySelectedId);
    $("#save-library-load-current").disabled = !selected;
    $("#save-library-delete").disabled = !selected;
  });
  $("#save-library-store-current")?.addEventListener("click", async () => {
    const name = $("#save-library-name")?.value.trim();
    saveLibraryBusy = true;
    try {
      if (!name) throw new Error("请先填写存档名称");
      const entry = await storeSaveCurrentInProjectLibrary(
        libraryRepository, {name},
      );
      await refreshEditorSaveLibrary(libraryRepository, {selectedId: entry.id});
      saveLibraryMessage = `已把当前值存为“${entry.name}”；${entry.byte_length} 字节原样保存。`;
    } catch (error) {
      saveLibraryMessage = `存入失败：${error.message}`;
    } finally {
      saveLibraryBusy = false;
    }
    await rerender?.();
  });
  $("#save-library-load-current")?.addEventListener("click", async () => {
    if (!saveLibrarySelectedId) return;
    if (saveWorkspaceChanged(state) &&
        !globalThis.confirm("当前存档已有修改；载入项目存档会直接替换当前值，确定继续吗？")) {
      return;
    }
    saveLibraryBusy = true;
    try {
      await loadProjectSaveAsCurrent(libraryRepository, saveLibrarySelectedId);
      saveLibraryMessage = state.saveMessage;
    } catch (error) {
      saveLibraryMessage = `载入失败：${error.message}`;
    } finally {
      saveLibraryBusy = false;
    }
    await rerender?.();
  });
  $("#save-library-delete")?.addEventListener("click", async () => {
    const entry = saveLibraryEntries?.find(item => item.id === saveLibrarySelectedId);
    if (!entry || !globalThis.confirm(`从项目存档库删除“${entry.name}”？`)) return;
    saveLibraryBusy = true;
    try {
      await deleteProjectSave(libraryRepository, entry.id);
      await refreshEditorSaveLibrary(libraryRepository);
      saveLibraryMessage = `已删除“${entry.name}”；其它存档不受影响。`; // structure-check-exempt 6: 这里说明删除一份存档不会删除其他存档。
    } catch (error) {
      saveLibraryMessage = `删除失败：${error.message}`;
    } finally {
      saveLibraryBusy = false;
    }
    await rerender?.();
  });
  $("#save-library-refresh")?.addEventListener("click", async () => {
    saveLibraryBusy = true;
    try {
      const entries = await refreshEditorSaveLibrary(libraryRepository);
      saveLibraryMessage = `已刷新：项目库中 ${entries.length} 份电池存档。`;
    } catch (error) {
      saveLibraryMessage = `刷新失败：${error.message}`;
    } finally {
      saveLibraryBusy = false;
    }
    await rerender?.();
  });
  document.querySelectorAll("[data-save-import]").forEach(input =>
    input.addEventListener("change", async event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      if (saveWorkspaceChanged(state)
          && !globalThis.confirm("当前存档已有修改；载入文件会直接替换当前值，确定继续吗？")) {
        event.currentTarget.value = "";
        return;
      }
      try {
        if (!saveByteMapComplete()) await loadSaveByteMap({allPages: true});
        const space = saveFields.space();
        if (file.size !== space.length) {
          throw new Error(`文件是 ${file.size} 字节；sram 地址空间要求精确 ${space.length} 字节`);
        }
        installSaveCurrent(new Uint8Array(await file.arrayBuffer()), file.name);
      } catch (error) {
        state.saveError = error instanceof Error ? error.message : String(error);
        state.saveMessage = state.saveCurrentBytes
          ? `导入失败：${state.saveError}；仍保留当前值 ${state.saveCurrentName}。` : "";
      }
      await rerender?.();
    })
  );
  if (saveByteMapExplorer) {
    bindByteMapExplorer(saveByteMapExplorer);
    // 输入、筛选和虚拟滚动都会重画字节行；Reset 必须委托到稳定的
    // explorer 根节点，才能覆盖重画后新出现的按钮。
    const explorerRoot = document.querySelector("#sram-byte-map-explorer");
    explorerRoot?.addEventListener(
      "click", async event => {
        const button = event.target.closest?.("[data-reset-to-original]");
        if (!button || button.disabled) return;
        event.preventDefault();
        event.stopPropagation();
        const fieldId = button.dataset.resetToOriginal;
        saveFields.object(fieldId).reset({message: changes => changes.length
          ? `已将该字段恢复为 ROM 初始值；当前仍相差 ${changes.length} 个字节`
          : "该字段已恢复；当前值与 ROM 初始值一致"});
        await rerender?.();
      },
    );
    if (explorerRoot) explorerRoot.dataset.saveFieldResetBound = "1";
    document.querySelectorAll("[data-save-byte-map-jump]").forEach(button =>
      button.addEventListener("click", () => {
        document.querySelector("#sram-byte-map-filter-clear")?.click();
        const offset = Number(button.dataset.saveByteMapJump);
        selectByteMapOffset(saveByteMapExplorer, offset, {scroll: true});
        setStatus({address: state.view === "save" ? "" : `SRAM ${byteMapHex(offset, 4)}`});
      })
    );
  }
  $("#save-load-all-semantics")?.addEventListener("click", async () => {
    try {
      await loadSaveByteMap({allPages: true});
      state.saveError = "";
      state.saveMessage = "已载入";
    } catch (error) {
      state.saveError = error instanceof Error ? error.message : String(error);
      state.saveMessage = `SRAM 语义页加载失败：${state.saveError}`;
    }
    await rerender?.();
  });
  const resetButton = document.querySelector("[data-save-reset-control] [data-reset-to-original]");
  resetButton?.addEventListener("click", async () => {
    if (resetButton.disabled) return;
    try {
      resetSaveWorkspace(state, {onError: error => {
        state.saveError = String(error?.message || error);
      }});
      refreshSaveDirtyState("当前值已恢复为 ROM 初始值。");
    } catch (error) {
      state.saveError = String(error?.message || error);
      refreshSaveDirtyState(`存档还原失败：${state.saveError}`);
    }
    await rerender?.();
  });
  $("#save-download")?.addEventListener("click", async () => {
    const changes = saveFields.changedOffsets();
    downloadBlob$1(new Blob([state.saveCurrentBytes], {type: "application/octet-stream"}), outputName());
    state.saveMessage = `已导出 · ${changes.length} B`;
    await rerender?.();
  });
  updateSaveStatus();
}

var sram = /*#__PURE__*/Object.freeze({
  __proto__: null,
  allCurrentFieldObjects: allCurrentFieldObjects,
  bindSaveEditor: bindSaveEditor,
  currentFieldObject: currentFieldObject,
  currentSlotStatus: currentSlotStatus,
  equipSaveCurrentVehicleCarryMain: equipSaveCurrentVehicleCarryMain,
  fillSaveCurrentRentalVehicle: fillSaveCurrentRentalVehicle,
  findCurrentFieldObject: findCurrentFieldObject,
  patchSaveCurrentFields: patchSaveCurrentFields,
  prepareSaveEditor: prepareSaveEditor,
  renderSaveEditor: renderSaveEditor,
  resetSaveCurrentFields: resetSaveCurrentFields,
  resetSaveCurrentSlotActivation: resetSaveCurrentSlotActivation,
  saveImportControl: saveImportControl,
  saveWorkspaceReady: saveWorkspaceReady,
  setSaveCurrentSlotActivation: setSaveCurrentSlotActivation
});

// @editor-module 展示项目与构建报告并将准备、构建和项目操作上报统一日志。

const shortHash = value => typeof value === "string" && value.length > 16
  ? `${value.slice(0, 12)}…${value.slice(-4)}` : (value || "—");
const integer = value => Number.isSafeInteger(value) ? value.toLocaleString() : "—";
const hex = value => Number.isSafeInteger(value)
  ? `0x${value.toString(16).toUpperCase().padStart(6, "0")}` : "—";
let verifyBuild = true;

function isSaveCurrentWorking(working) {
  return working?.resource_id === "save-current"
    && working.asset_schema === "metalmaxcn.save-current"
    && working.codec === "save-current"
    && working.original_source === "runtime";
}

function targetDefinition() {
  const manifest = state.browserProjectManifest;
  return manifest?.targets?.[manifest.default_target] || null;
}

function byteMapHref(diff) {
  if (diff.region === "prg") {
    const region = targetDefinition()?.profile?.regions?.find(item => item.kind === "prg");
    if (!region) return null;
    return `?view=bytemap-prg&romOffset=${diff.file_offset - region.file_offset}`;
  }
  if (diff.region === "chr") {
    const region = targetDefinition()?.profile?.regions?.find(item => item.kind === "chr");
    if (!region) return null;
    const tile = Math.floor((diff.file_offset - region.file_offset) / 16);
    return `?view=bytemap-chr&chrTile=${tile}`;
  }
  return null;
}

function readinessMarkup() {
  const manifest = state.browserProjectManifest;
  const definition = targetDefinition();
  const status = state.projectBootstrapStatus;
  const ready = [
    "ready", "already-imported", "bootstrapped", "reimported",
  ]
    .includes(status);
  const targetId = manifest?.default_target || "—";
  const missing = [];
  if (!manifest) missing.push("项目清单");
  if (manifest && !manifest.baseline_blob_id) missing.push("ROM 基线");
  if (manifest && !manifest.default_target) missing.push("默认构建目标");
  if (manifest?.default_target && !definition?.profile) missing.push("构建目标配置");
  if (manifest?.default_target && !definition?.build_map) missing.push("写入映射");
  if (manifest?.default_target && !definition?.bindings) missing.push("资产绑定");
  // A navigation-ready project intentionally has only the immutable asset
  // catalog materialized. Baseline/targets are completed only by an explicit
  // build, never by opening, exporting, or navigating the project.
  const deferred = status === "ready" && missing.length
    ? `构建时将按需准备 ${missing.join("、")}` : "";
  const error = state.projectBootstrapError || (missing.length && !deferred
    ? `缺少 ${missing.join("、")}` : "");
  return `<section class="build-readiness ${error ? "has-error" : "is-ready"}">
    <div>
      <small>项目状态</small>
      <b>${esc(ready && !error ? "已就绪" : status === "loading" ? "正在准备" : "不可用")}</b>
      <span>${error ? esc(error) : deferred ? esc(deferred) : ""}</span>
    </div>
    <div><small>当前原始版本</small><b class="mono">${esc(
      manifest?.active_original_revision_id || "—",
    )}</b></div>
    <div><small>构建目标</small><b class="mono">${esc(targetId)}</b></div>
    <div><small>ROM 基线</small><b class="mono">${esc(
      manifest?.baseline_blob_id || "—",
    )}</b></div>
  </section>`;
}

async function materializeCompleteStaticProject(verify) {
  let lastEventAt = performance.now();
  state.projectBootstrapStatus = "loading";
  state.projectBootstrapError = "";
  state.browserBuildError = "";
  state.browserBuildEvents = [];
  state.browserBuildCurrentEvent = null;
  const append = event => {
    const now = performance.now();
    const timedEvent = {...event, duration_ms: now - lastEventAt};
    lastEventAt = now;
    state.browserBuildCurrentEvent = timedEvent;
    state.browserBuildEvents.push(timedEvent);
    reportBuildState({event: timedEvent});
    refreshBuildLog();
  };
  append({
    stage: "hydrate",
    event_type: "build-input-hydration-started",
    status: "running",
    progress_current: 1,
    progress_total: 2,
    message: "读取并校验构建专用 baseline、target、binding 与 original",
  });
  try {
    const result = await bootstrapActiveProjectFromPackage({verify,
      onProgress: event => {
        if (!Number.isSafeInteger(event.progress_current)) append({stage: "hydrate", ...event});
      }});
    // Keep the lazy facade installed in state: it delegates to the same store
    // and preserves the per-resource boundary if a future package adds an
    // asset after this build.  The full bootstrap only updates local metadata.
    state.browserProjectManifest = result.manifest;
    state.projectBootstrapStatus = result.status;
    append({
      stage: "hydrate",
      event_type: "build-input-hydration-complete",
      status: "success",
      progress_current: 2,
      progress_total: 2,
      message: `${result.original_assets || 0} 个 original · ` +
        `${result.binding_assets || 0} 个 binding binary`,
    });
    return result;
  } catch (error) {
    state.projectBootstrapStatus = "error";
    state.projectBootstrapError = error instanceof Error
      ? error.message : String(error);
    append({
      stage: "hydrate",
      event_type: "build-input-hydration-failed",
      status: "error",
      progress_current: 2,
      progress_total: 2,
      message: state.projectBootstrapError,
      error,
    });
    throw error;
  } finally {
    refreshBuildLog();
  }
}

function projectArchiveToolbar() {
  const unavailable = ["idle", "loading"].includes(state.projectBootstrapStatus);
  const manifest = state.browserProjectManifest;
  const complete = Boolean(
    manifest?.[BOOTSTRAP_DIGEST_KEY]
    && manifest?.baseline_blob_id
    && manifest?.default_target
    && manifest?.targets?.[manifest.default_target],
  );
  const exportUnavailable = unavailable || !complete;
  return `<div class="toolbar build-project-toolbar">
    <button class="button" id="browser-project-export" ${exportUnavailable ? "disabled" : ""}
      title="${exportUnavailable ? "先执行构建，生成完整且可独立恢复的项目归档" : "导出完整项目归档"}">
      导出项目
    </button>
    <label class="button ${unavailable ? "disabled" : ""}" for="browser-project-import">
      导入项目
    </label>
    <input id="browser-project-import" type="file" accept="application/json,.json"
      ${unavailable ? "disabled" : ""}>

  </div>`;
}

function filteredWorkingAssets() {
  const query = String(state.projectWorkingQuery || "").trim().toLowerCase();
  return state.projectWorkingAssets.filter(working => working.ownership !== "invalid" && (!query || [
    working.resource_id,
    working.asset_schema,
    working.codec,
  ].some(value => String(value || "").toLowerCase().includes(query))));
}

let saveDiffExpanded = false;
let saveDiffLoading = false;
let saveDiffError = "";
let saveDiffCache = null;

function sameBytes(left, right) {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function savePartitionDiffs() {
  if (!saveWorkspaceReady()) return {partitions: [], checksumBytes: 0, editedCount: 0};
  const original = state.saveRomInitialBytes;
  const current = state.saveCurrentBytes;
  const annotations = saveAnnotations(state.saveByteMapDocument);
  const annotationContent = JSON.stringify(annotations);
  if (saveDiffCache && saveDiffCache.annotationContent === annotationContent
      && sameBytes(saveDiffCache.original, original)
      && sameBytes(saveDiffCache.current, current)) return saveDiffCache.result;
  const partitions = [...new Map(annotations.filter(record =>
    /^(save\.partition\.|save-container\.partition\.)/u.test(record.range_id || ""))
    .map(record => [record.range_id, record])).values()]
    .sort((a, b) => a.address.offset - b.address.offset);
  const metadata = annotations.filter(record =>
    String(record.field_id || "").startsWith("save.directory."));
  const scopes = annotations.filter(record => ["save.active-workspace", "save.slot.1.record",
    "save.slot.2.record", "save.partition.runtime-workspace.0"].includes(record.range_id));
  const metadataOffsets = new Set(metadata.flatMap(record =>
    Array.from({length: record.address.length}, (_, index) => record.address.offset + index)));
  const currentFields = allCurrentFieldObjects();
  const editedCount = currentFields.filter(field => field.edited
    && !field.binding?.derived).length;
  const fields = currentFields.filter(field => field.edited
    && field.status === "exact" && field.binding?.editable === true
    && !field.binding?.derived);
  const results = [];
  let checksumBytes = 0;
  for (const partition of partitions) {
    const changed = [];
    for (let offset = partition.address.offset; offset < partition.address.end_exclusive; offset++) {
      if (original[offset] === current[offset]) continue;
      if (metadataOffsets.has(offset)) checksumBytes++;
      else changed.push(offset);
    }
    if (!changed.length) continue;
    const changedSet = new Set(changed);
    const published = fields.filter(field => {
      const start = field.physical.offset;
      const end = field.physical.end_exclusive;
      for (let offset = start; offset < end; offset++) {
        if (changedSet.has(offset)) return true;
      }
      return false;
    });
    const scope = scopes.find(record => record.address.offset <= partition.address.offset
      && record.address.end_exclusive >= partition.address.end_exclusive);
    const scopeLabel = scope?.range_id === "save.active-workspace" ? "活动区"
      : /^save\.slot\.[12]\.record$/u.test(scope?.range_id || "")
      ? `槽 ${scope.range_id.split(".")[2]}`
      : scope?.range_id === "save.partition.runtime-workspace.0" ? "运行工作区"
      : "SRAM 容器";
    results.push({partition, count: changed.length, fields: published, scope: scopeLabel});
  }
  const result = {partitions: results, checksumBytes, editedCount};
  saveDiffCache = {
    annotationContent, original: original.slice(), current: current.slice(), result,
  };
  return result;
}

function savePartitionMarkup() {
  if (!saveDiffExpanded) return `<details class="build-save-diff">
    <summary>查看存档改动分区</summary></details>`;
  if (saveDiffError) return `<details class="build-save-diff" open>
    <summary>存档改动分区</summary><small>${esc(saveDiffError)}</small></details>`;
  if (!saveWorkspaceReady()) return `<details class="build-save-diff" open>
    <summary>存档改动分区</summary><small>${saveDiffLoading ? "正在读取 SRAM 分区…" : "展开后读取存档当前值"}</small>
  </details>`;
  const {partitions, checksumBytes} = savePartitionDiffs();
  const rows = partitions.map(({partition, count, fields, scope}) => {
    const address = partition.address;
    const names = [...new Set(fields.map(field => field.fieldMeaning || field.valueMeaning)
      .filter(Boolean))];
    return `<tr><td>${esc(scope)}</td><td>${esc(names.join("、") || partition.value_meaning || partition.record)}</td>
      <td class="mono">SRAM ${address.offset.toString(16).toUpperCase().padStart(4, "0")}–${(address.end_exclusive - 1).toString(16).toUpperCase().padStart(4, "0")}</td>
      <td>${integer(count)}</td><td>${fields.length ? fields.map(field =>
        `${esc(field.fieldMeaning || field.valueMeaning || field.fieldId)} <small class="mono">${esc(field.fieldId)}</small>`)
        .join("<br>") : "—"}</td></tr>`;
  }).join("");
  const checksum = checksumBytes ? `<p>校验：${integer(checksumBytes)} 字节（校验和／槽目录）</p>` : "";
  return `<details class="build-save-diff" ${saveDiffExpanded ? "open" : ""}>
    <summary>${integer(partitions.length)} 个改动分区${checksumBytes ? ` · 校验 ${integer(checksumBytes)} 字节` : ""}</summary>
    ${partitions.length ? `<div class="table-wrap"><table><thead><tr><th>所属</th><th>所属字段中文名</th><th>SRAM 范围</th><th>改动字节</th><th>改动的已发布字段</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
    ${checksum}</details>`;
}

function workingAssetsMarkup() {
  const invalidIds = state.projectWorkingAssets.filter(working => working.ownership === "invalid")
    .map(working => working.resource_id);
  const filtered = filteredWorkingAssets();
  const limit = Math.max(100, Number(state.projectWorkingLimit) || 100);
  const visible = filtered.slice(0, limit);
  const rows = visible.map(working => {
    const saveCurrent = isSaveCurrentWorking(working);
    const changedFields = working.format === "fields" && !working.error
      ? working.fields.filter(field => field.hasOverride) : [];
    const saveChangeCount = saveCurrent && saveDiffExpanded && saveWorkspaceReady()
      ? savePartitionDiffs().editedCount : null;
    const reset = working.format === "fields" ? resetToOriginalButton(working.resource_id, {
      title: "重置整个资产；其他资产保留",
      dirty: working.dirty,
    }) : "";
    return `<tr data-working-resource="${esc(working.resource_id)}">
    <td><b>${esc(working.resource_id)}</b><small>${esc(working.asset_schema)}</small>
      ${saveChangeCount === null ? "" : `<small data-working-change-count>${integer(saveChangeCount)} 项字段改动</small>`}
      ${saveCurrent ? savePartitionMarkup() : ""}
      ${changedFields.length ? `<small data-working-fields>${changedFields.map(field => {
        const source = field.physical?.source;
        const start = source?.file_offset;
        const delta = field.physical?.offsetInFragment;
        const length = field.physical?.byteLength;
        const offset = start + delta;
        const physical = source?.region && Number.isSafeInteger(start) && Number.isSafeInteger(delta)
          && Number.isSafeInteger(offset) && offset >= 0
          && Number.isSafeInteger(length) && length > 0
          ? ` <span class="mono">${esc(source.region)} file ${hex(offset)} · ${integer(length)} B</span>` : "";
        return `${esc(`${field.entityHandle}.${field.fieldName}`)}${physical}`;
      }).join("<br>")}</small>` : ""}</td>
    <td><span data-working-status class="build-status status-${working.dirty ? "written" : "mapped"}">
      ${working.error ? esc(working.error) : working.dirty ? "已修改" : "未修改"}
    </span></td>
    <td data-working-version>${integer(working.version)}</td>
    <td class="mono">${esc(working.codec || "—")}</td>
    <td>${working.format === "story-page" ? storyPageRecoveryButton(working.storyPage) : working.error ? "" : reset}</td>
  </tr>`;
  }).join("") || `<tr><td colspan="5" class="build-empty-row">没有符合条件的编辑版本资产</td></tr>`;
  return `<section class="panel build-working-panel">
    <header><div><p class="eyebrow">编辑版本</p><h2>编辑版本资产</h2></div>
      <span>${integer(state.projectWorkingAssets.length - invalidIds.length)} 项已载入</span></header>
    ${invalidIds.length ? `<div class="build-working-invalid" role="status">
      有 ${integer(invalidIds.length)} 项失效修改需要清理。
      <button class="button ghost" id="project-working-clear-invalid">清理失效修改</button>
    </div>` : ""}
    <div class="build-working-tools">
      <label>筛选资产 <input id="project-working-query" type="search"
        value="${esc(state.projectWorkingQuery || "")}" placeholder="资源 ID / 数据结构 / 编解码器 / 导入版本"></label>
      <button class="button ghost" id="project-state-refresh">刷新项目状态</button>
      <span>显示 ${integer(visible.length)} / ${integer(filtered.length)}</span>
      <button class="button ghost" id="project-working-more"
        ${visible.length < filtered.length ? "" : "disabled"}>再显示 100</button>
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>资源 / 数据结构</th><th>状态</th><th>版本</th><th>编解码器</th><th>重置</th>
    </tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

async function loadProjectAssetState({refresh = true} = {}) {
  if (state.projectStateLoading) return;
  state.projectStateLoading = true;
  const task = editorLog.startTask({source: "后台准备", message: "读取项目修改状态"});
  state.projectStateError = "";
  if (refresh) refreshBuildLog();
  try {
    state.projectRepository ||= await openActiveProjectStore();
    const repository = state.projectRepository;
    const working = await db.listWorkingAssets();
    if (repository !== state.projectRepository) return;
    state.projectWorkingAssets = working;
    state.projectStateLoaded = true;
    state.projectWorkingLoaded = true;
  } catch (error) {
    state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
  } finally {
    state.projectStateLoading = false;
    task.finish({level: "debug", message: "项目修改状态读取结束"});
    if (refresh) refreshBuildLog();
  }
}

async function loadSavePartitionDetails() {
  if (saveDiffLoading || saveWorkspaceReady()) return;
  saveDiffLoading = true;
  saveDiffError = "";
  refreshBuildLog();
  const repository = state.projectRepository;
  try {
    const save = await prepareSaveBuildFieldObjects(repository);
    if (repository !== state.projectRepository) return;
    await save.openCurrent(state);
  } catch (error) {
    saveDiffError = error instanceof Error ? error.message : String(error);
    editorLog.error("后台准备", `存档差异准备失败：${saveDiffError}`, error);
  } finally {
    saveDiffLoading = false;
    refreshBuildLog();
  }
}

function diffRows(report) {
  const diffs = report?.linker?.diffs || [];
  if (!diffs.length) return `<tr><td colspan="9" class="build-empty-row">最终 ROM 与项目基线没有物理差异</td></tr>`;
  return diffs.map(diff => {
    const href = byteMapHref(diff);
    return `<tr>
      <td><b>${esc(diff.region)}</b><small>Bank ${integer(diff.bank_index)}</small></td>
      <td class="mono">${esc(diff.baseline_bin)}</td>
      <td class="mono">${hex(diff.file_offset)}</td>
      <td>${integer(diff.length)}</td>
      <td>${diff.asset_ids.map(esc).join("<br>")}</td>
      <td class="mono">${diff.slot_ids.map(esc).join("<br>")}</td>
      <td class="mono" title="${esc(diff.before_sha256)}">${esc(shortHash(diff.before_sha256))}</td>
      <td class="mono" title="${esc(diff.after_sha256)}">${esc(shortHash(diff.after_sha256))}</td>
      <td>${href ? `<a class="button ghost" href="${href}">字节地图 ↗</a>` : "—"}</td>
    </tr>`;
  }).join("");
}

function renderBuildLog() {
  const firstBuild = !state.browserProjectManifest?.latest_package_build_id;
  if (firstBuild) {
    state.buildRomSelected = true;
    state.buildSaveSelected = true;
  }
  const report = state.browserBuildReport;
  const linker = report?.linker || null;
  const running = state.browserBuildRunning;
  const bootstrapLoading = ["idle", "loading"].includes(state.projectBootstrapStatus);
  const canBuild = (state.buildRomSelected || state.buildSaveSelected) &&
    !running && !bootstrapLoading && !state.projectBootstrapError &&
    state.projectStateLoaded;
  return `<div class="toolbar build-toolbar">
      <div class="build-output">
        <label><input type="checkbox" id="browser-build-rom" ${state.buildRomSelected ? "checked" : ""} ${running || firstBuild ? "disabled" : ""}> ROM</label>
        <button class="button" id="browser-build-download" ${state.browserBuildRom ? "" : "disabled"}>下载 ROM</button>
      </div>
      <div class="build-output">
        <label><input type="checkbox" id="browser-build-sav" ${state.buildSaveSelected ? "checked" : ""} ${running || firstBuild ? "disabled" : ""}> SAV</label>
        <button class="button" id="browser-save-download" ${state.browserBuildSave ? "" : "disabled"}>下载存档</button>
      </div>
      <button class="button primary" id="browser-build-start" ${canBuild ? "" : "disabled"}>
        ${running || bootstrapLoading ? "正在构建…" : "构建"}
      </button>
      <label><input type="checkbox" id="browser-build-verify" ${verifyBuild ? "checked" : ""} ${running ? "disabled" : ""}> 核对/校验</label>
      <button class="button ghost" id="browser-report-download" ${report ? "" : "disabled"}>导出构建报告</button>
      ${runLatestBrowserRomButton()}
    </div>
    ${report?.omitted_scripts?.length ? `<section class="panel build-log-panel" data-build-omitted-scripts>
      <h2>未进 ROM</h2><div class="table-wrap"><table><thead><tr><th>脚本</th><th>原因</th><th>超出字节</th></tr></thead>
      <tbody>${report.omitted_scripts.map(script => `<tr><td>${esc(script.handle)}</td><td>${esc(script.reason)}</td>
        <td>${integer(script.overflow_bytes)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    ${report ? `<section class="build-summary">
      <div><small>构建时间</small><b>${esc(buildTimeLabel(report.created_at))}</b></div>
      <div><small>ROM 布局</small><b>${report.layout ? `Mapper ${integer(report.layout.mapper)} · PRG ${integer(report.layout.prg_bytes / 1024)} KB / CHR ${integer(report.layout.chr_bytes / 1024)} KB · ${report.layout.diagnostic ? "自检" : "游戏"}` : "—"}</b></div>
      <div><small>核对/校验</small><b>${report.verification?.enabled === false ? "关闭" : "打开"}</b></div>
      <div><small>内部构建 ID</small><b class="mono" title="${esc(report.build_id)}">${esc(shortHash(report.build_id))}</b></div>
      <div><small>输出 SHA-256</small><b class="mono" title="${esc(linker.output_sha256)}">${esc(shortHash(linker.output_sha256))}</b></div>
      <div><small>存档 SHA-256</small><b class="mono" title="${esc(report.save_sha256)}">${esc(shortHash(report.save_sha256))}</b></div>
      <div><small>存档大小</small><b>${integer(report.save_bytes)} B</b></div>
      <div><small>存档校验</small><b>${report.save_checksum_valid ? "双槽有效" : "无效"}</b></div>
      <div><small>存档来源</small><b>${["original", "rom-initial"].includes(report.save_source)
        ? "Original" : report.save_source === "not-included" ? "未包含存档" :
          `Working · 改动 ${integer(report.save_working_changed_bytes)} 字节`}</b></div>
      <div><small>改动字节</small><b>${integer(linker.changed_bytes)}</b></div>
      <div><small>差异范围</small><b>${integer(linker.diffs.length)}</b></div>
      <div><small>构建事件</small><b>${integer(linker.events.length)}</b></div>
    </section>` : ""}
    ${readinessMarkup()}
    ${projectArchiveToolbar()}
    ${workingAssetsMarkup()}
    <section class="panel build-log-panel">
      <header><div><p class="eyebrow">最终物理差异</p><h2>最终 ROM 字节差异</h2></div></header>
      <div class="table-wrap"><table class="build-diff-table"><thead><tr>
        <th>区域 / Bank</th><th>文件块</th><th>文件偏移</th><th>长度</th><th>资产</th>
        <th>写入区</th><th>修改前</th><th>修改后</th><th>ROM 字节地图</th>
      </tr></thead><tbody>${diffRows(report)}</tbody></table></div>
    </section>`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

let refreshScheduled = false;
function refreshBuildLog() {
  if (state.view !== "build" || refreshScheduled) return;
  refreshScheduled = true;
  requestAnimationFrame(() => {
    refreshScheduled = false;
    const content = document.querySelector("#content");
    if (!content || state.view !== "build") return;
    content.innerHTML = renderBuildLog();
    bindBuildLog();
  });
}

let liveListenerBound = false;
function bindBuildLog() {
  if (!liveListenerBound) {
    globalThis.addEventListener("mmeditor-browser-build", refreshBuildLog);
    liveListenerBound = true;
  }
  if (!state.projectStateLoaded && !state.projectStateLoading) {
    loadProjectAssetState();
  }
  document.querySelector("#browser-project-export")?.addEventListener(
    "click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const repository = state.projectRepository || await openActiveProjectStore();
        const blob = await repository.exportProject({format: "blob"});
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        downloadBlob(blob, `metalmaxcn-project-${stamp}.json`);
      } catch (error) {
        state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
        refreshBuildLog();
      } finally {
        button.disabled = false;
      }
    },
  );
  document.querySelector("#browser-project-import")?.addEventListener(
    "change", async event => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      const approved = globalThis.confirm(
        "导入会在完整校验归档后替换当前项目。请先导出现有项目备份。继续吗？",
      );
      if (!approved) {
        input.value = "";
        return;
      }
      input.disabled = true;
      try {
        const repository = state.projectRepository || await openActiveProjectStore();
        await repository.importProject(file, {replace: true});
        location.reload();
      } catch (error) {
        state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
        input.disabled = false;
        input.value = "";
        refreshBuildLog();
      }
    },
  );
  document.querySelector("#project-working-query")?.addEventListener(
    "change", event => {
      state.projectWorkingQuery = event.currentTarget.value;
      state.projectWorkingLimit = 100;
      refreshBuildLog();
    },
  );
  document.querySelector("#project-working-more")?.addEventListener("click", () => {
    state.projectWorkingLimit = (Number(state.projectWorkingLimit) || 100) + 100;
    refreshBuildLog();
  });
  document.querySelector("#project-state-refresh")?.addEventListener("click", async () => {
    state.projectStateLoaded = false;
    state.projectWorkingLoaded = false;
    await loadProjectAssetState();
  });
  document.querySelector("#project-working-clear-invalid")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const ids = state.projectWorkingAssets.filter(working => working.ownership === "invalid")
        .map(working => working.resource_id);
      const repository = state.projectRepository || await openActiveProjectStore();
      await repository.discardInvalidWorking(ids);
      await loadProjectAssetState();
    } catch (error) {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    } finally {
      button.disabled = false;
    }
  });
  document.querySelector(".build-save-diff")?.addEventListener("toggle", event => {
    const expanded = event.currentTarget.open;
    if (saveDiffExpanded === expanded) return;
    saveDiffExpanded = expanded;
    if (expanded && !saveWorkspaceReady()) void loadSavePartitionDetails();
    else refreshBuildLog();
  });
  const workingPanel = document.querySelector(".build-working-panel");
  bindStoryPageRecovery(workingPanel, {database: db, afterReset: loadProjectAssetState,
    onError: error => {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    }});
  // 构建会切换仓储，清单里缓存的字段会话可能已失效：重新取一次清单再绑，
  // 而不是把回调绑到失效会话上抛错。
  if (state.projectWorkingAssets.some(working => working.stale)) {
    state.projectWorkingLoaded = false;
    void loadProjectAssetState();
    return;
  }
  for (const row of workingPanel?.querySelectorAll("[data-working-resource]") || []) {
    const resourceId = row.dataset.workingResource;
    const working = state.projectWorkingAssets.find(item => item.resource_id === resourceId);
    if (!working || working.error) continue;
    const confirmMessage = () => `${resourceId} 含有编辑。重置会丢弃此资产的编辑，其他资产保留。继续吗？`;
    const onError = error => {
      state.projectStateError = error instanceof Error ? error.message : String(error);
        editorLog.error("项目操作", `项目操作失败：${state.projectStateError}`, error);
      refreshBuildLog();
    };
    if (working.format === "fields") {
      for (const field of working.fields) field.bind(row, (_target, _value, _field, reason) => {
        if (reason !== "initial") void loadProjectAssetState();
      });
      bindFieldResetToOriginalButtons(row, new Map([[resourceId, working.fields]]), {
        database: db, confirmMessage, onError,
        afterReset: async () => {await loadProjectAssetState();},
      });
    }
  }
  document.querySelector("#browser-build-start")?.addEventListener("click", async () => {
    const buildRom = state.buildRomSelected;
    const buildSave = state.buildSaveSelected;
    const verify = verifyBuild;
    if (!buildRom && !buildSave) return;
    refreshBuildLog();
    try {
      // Compilation needs the complete baseline, targets, bindings and every
      // compiler input.  This is the deliberate full-materialization gate;
      // merely visiting home or a data page never crosses it.
      const started = performance.now();
      const hydrated = buildRom ? await materializeCompleteStaticProject(verify) : null;
      await buildBrowserRom({preserveEvents: buildRom, buildRom, buildSave, verify,
        verification: hydrated?.verification || "not-required",
        timings: {hydrate: performance.now() - started}});
    } catch (error) {
      editorLog.error("构建", `构建失败：${error.message || error}`, error);
    }
    refreshBuildLog();
  });
  document.querySelector("#browser-build-verify")?.addEventListener("change", event => {
    verifyBuild = event.currentTarget.checked;
  });
  for (const [selector, key] of [["#browser-build-rom", "buildRomSelected"],
    ["#browser-build-sav", "buildSaveSelected"]]) {
    document.querySelector(selector)?.addEventListener("change", event => {
      state[key] = event.currentTarget.checked;
      document.querySelector("#browser-build-start").disabled =
        !state.buildRomSelected && !state.buildSaveSelected;
    });
  }
  document.querySelector("#browser-build-download")?.addEventListener("click", () => {
    if (!state.browserBuildRom || !state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([state.browserBuildRom], {type: "application/x-nes-rom"}),
      `metalmaxcn-${stamp}.nes`,
    );
  });
  document.querySelector("#browser-save-download")?.addEventListener("click", () => {
    if (!state.browserBuildSave || !state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([state.browserBuildSave], {type: "application/octet-stream"}),
      `metalmaxcn-${stamp}.sav`,
    );
  });
  document.querySelector("#browser-report-download")?.addEventListener("click", () => {
    if (!state.browserBuildReport) return;
    const stamp = buildTimeStamp(state.browserBuildReport.created_at);
    downloadBlob(
      new Blob([JSON.stringify(state.browserBuildReport, null, 2)], {type: "application/json"}),
      `metalmaxcn-${stamp}-report.json`,
    );
  });
}

var buildLog = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindBuildLog: bindBuildLog,
  renderBuildLog: renderBuildLog
});

export { allCurrentFieldObjects, buildLog, currentFieldObject, currentSlotStatus, equipSaveCurrentVehicleCarryMain, fillSaveCurrentRentalVehicle, findCurrentFieldObject, patchSaveCurrentFields, resetSaveCurrentFields, resetSaveCurrentSlotActivation, saveImportControl, saveWorkspaceReady, setSaveCurrentSlotActivation, sram };
