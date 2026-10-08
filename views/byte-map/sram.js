// @editor-module Local battery-save workbench backed by the unified byte map.
//
// The page has no save-specific parsed document or duplicate layout tables.
// SRAM bank/page JSON supplies addresses/annotations; a deterministic default or an
// imported .sav replaces the one current value array. That array goes through the
// same ByteMapExplorer as PRG/CHR bank bytes.  Only field_id edits declared exact
// and editable by the map can reach the lossless writer.

import {resetToOriginalButton, applyResetToOriginalStates} from "../../ui/table.js";
import {renderSaveCurrentFieldObject} from "../../ui/field-object-editor.js";
import {$, bindTextInputEvents, esc} from "../../core/dom.js";
import {db} from "../../core/project-db.js";
import {replaceHistoryUrl} from "../../core/router.js";
import {
  installLoadedSave,
  queueSaveWorking,
  resetSaveWorkspace,
  saveWorkspaceChanged,
} from "../../core/save-build.js";
import {state} from "../../core/state.js";
import {saveFields, prepareSaveEditorWorkspace, configureSaveEditorCallbacks} from "../../core/save-editor-session.js";
import {setStatus} from "../../ui/shell.js";
import {
  SAVE_SOURCE_EDITOR,
  deleteProjectSave,
  getProjectSave,
  listProjectSaves,
  putProjectSave,
} from "../../emulator.js";
import {
  bindByteMapExplorer,
  byteMapHex,
  createByteMapExplorer,
  filterByteMap,
  renderByteMapExplorer,
  selectByteMapOffset,
} from "./explorer.js";

let saveByteMapExplorer = null;
let saveLibraryEntries = null;
let saveLibrarySelectedId = "";
let saveLibraryMessage = "";
let saveLibraryBusy = false;
let saveLibraryRepositoryRef = null;

const hex = (value, width = 2) =>
  `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

export function saveImportControl(label = "选择 8 KiB 电池存档") {
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
export function saveWorkspaceReady() {
  return saveFields.ready();
}

function pendingSaveRecordPage(offset) {
  return saveFields.pendingPage(offset);
}

async function loadSaveByteMap(options = {}) {
  await saveFields.load(options);
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

export const currentFieldObject = fieldId => saveFields.object(fieldId);
export const findCurrentFieldObject = fieldId => saveFields.find(fieldId);
export const allCurrentFieldObjects = prefix => saveFields.all(prefix);
export const currentSlotStatus = slot => saveFields.slotStatus(slot);

/**
 * Patch declared save fields in the one shared current byte array.
 *
 * Consumers pass field_ids only. Width, encoding, writable status, slot
 * ownership and checksum updates remain owned by save-codec / the byte map.
 */
export function patchSaveCurrentFields(edits, {message = null} = {}) {
  const bytes = saveFields.writeFields(edits, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

export function equipSaveCurrentVehicleCarryMain(request, {message = null} = {}) {
  const bytes = saveFields.equipVehicleCarryMain(request, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

export function fillSaveCurrentRentalVehicle(request, {message = null} = {}) {
  const bytes = saveFields.fillRentalVehicle(request, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

export function setSaveCurrentSlotActivation(slot, active, {message = null} = {}) {
  const bytes = saveFields.activateSlot(slot, active, {message});
  return {bytes, changes: saveFields.changedOffsets(bytes)};
}

export function resetSaveCurrentSlotActivation(slot, {message = null} = {}) {
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
export function resetSaveCurrentFields(fieldIds, {message = null} = {}) {
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
      <td class="mono" data-save-marker="${slot}">${hex(status.marker)} / ${hex(status.expectedMarker)}</td>
      <td class="mono" data-save-checksum="${slot}">${hex(status.storedChecksum, 4)} / ${hex(status.computedChecksum, 4)}</td>
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

export function renderSaveEditor() {
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
      if (checksum) checksum.textContent = `${hex(value.storedChecksum, 4)} / ${hex(value.computedChecksum, 4)}`;
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

export function prepareSaveEditor() {
  if (!saveEditorPreparation) {
    saveEditorPreparation = prepareSaveEditorState().finally(() => {saveEditorPreparation = null;});
  }
  return saveEditorPreparation;
}

export async function bindSaveEditor({rerender} = {}) {
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
    downloadBlob(new Blob([state.saveCurrentBytes], {type: "application/octet-stream"}), outputName());
    state.saveMessage = `已导出 · ${changes.length} B`;
    await rerender?.();
  });
  updateSaveStatus();
}
