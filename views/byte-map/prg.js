// @editor-module PRG 地址空间的字节地图页
//
// 来源：拆分前 views/rommap/view.js 的 PRG 部分（更早是 app.js 4079-4736 行）。
// PRG 与 CHR 曾共用一页、靠 romMapRegion 标签切换；现在每个地址空间各有自己的
// 导航入口与模块，标签切换连同 renderRomMap() 分发一起消失。

import {editorLog} from "../../core/editor-log.js";
import {render} from "../../main.js";
import {esc} from "../../core/dom.js";
import {fileUrl} from "../../core/package-io.js";
import {replaceHistoryUrl} from "../../core/router.js";
import {fieldOwner, hasFieldOwner} from "../../core/field-owners.js";
import {db} from "../../core/project-db.js";
import {ROM_MAP_TYPE_OPTIONS, state} from "../../core/state.js";
import {romMapAddressMeaning, romMapByteExplanation, romMapValueMeaning} from "./prg-explain.js";
import {loadRomMapPrg, romMapAnnotationModule, romMapDataModuleSummary, romMapHex, romMapPercent, romMapWritebackBytes} from "./prg-loaders.js";
import {bindByteMapExplorer, createByteMapExplorer, renderByteMapExplorer, selectByteMapOffset} from "./explorer.js";

let romPrgByteMap = null;
let codeFieldSelection = 0;

async function showSelectedCodeFieldObject() {
  const selection = ++codeFieldSelection;
  const offset = Number(state.romMapSelectedOffset || 0);
  const owner = state.romMapFieldObjects?.byByte?.[offset - romWindowOffset()];
  const answer = document.querySelector("#rom-prg-byte-map-explorer .byte-owner-answer");
  if (!answer || !owner?.role || !hasFieldOwner(owner.resourceId)
      || typeof fieldOwner(owner.resourceId).loadObjects !== "function") return;
  try {
    const objects = await fieldOwner(owner.resourceId).loadObjects();
    if (selection !== codeFieldSelection) return;
    const object = objects.find(item => offset >= item.physical.offset
      && offset < item.physical.endExclusive) || objects[0];
    if (object) object.mount(answer);
    if (object && typeof fieldOwner(owner.resourceId).describe === "function") {
      const fields = await db.getField(owner.resourceId);
      if (selection !== codeFieldSelection) return;
      const summary = document.createElement("div");
      summary.className = "code-segment-data-fields";
      summary.textContent = `${owner.resourceId} · 数据字段 ${fields.length} 项 · ${fields.slice(0, 3)
        .map(field => `${field.entityHandle}/${field.fieldName}`).join("、")}`;
      answer.append(summary);
    }
  } catch (error) {
    editorLog.error("编辑页面", `操作失败：${error?.message || error}`, error);
    if (selection === codeFieldSelection) {
      const status = document.createElement("p");
      status.textContent = `代码字段对象读取失败：${error instanceof Error ? error.message : String(error)}`;
      answer.append(status);
    }
  }
}

const romWindowOffset = () => Number(state.romMapWindowOffset || 0);
const romTotalLength = () => Number(state.romMapTotalLength || state.romMapBytes?.length || 0);
const toPhysicalOffset = localOffset => romWindowOffset() + Number(localOffset);

function syncRomExplorerState(ui) {
  state.romMapSelectedOffset = toPhysicalOffset(ui.selectedOffset);
  state.romMapSearch = ui.search;
  state.romMapSemanticScope = ui.semanticScope;
  state.romMapValueSearch = ui.valueSearch;
  state.romMapValueCompare = ui.valueCompare;
  state.romMapValueWidth = ui.valueWidth;
  state.romMapValueScope = ui.valueScope;
  state.romMapTypeFilters = [...ui.typeFilters];
  state.romMapFilteredOffsets = ui.filteredOffsets;
  state.romMapFilterResult = ui.filterResult;
}

function syncRomExplorerUrl(ui) {
  syncRomExplorerState(ui);
  const url = new URL(location.href);
  if (ui.search.trim()) url.searchParams.set("romSearch", ui.search.trim());
  else url.searchParams.delete("romSearch");
  if (ui.semanticScope !== "all") url.searchParams.set("romSemantic", ui.semanticScope);
  else url.searchParams.delete("romSemantic");
  if (ui.valueSearch.trim()) url.searchParams.set("romValue", ui.valueSearch.trim());
  else url.searchParams.delete("romValue");
  if (ui.valueCompare !== "eq") url.searchParams.set("romCompare", ui.valueCompare);
  else url.searchParams.delete("romCompare");
  if (ui.valueWidth !== 1) url.searchParams.set("romWidth", String(ui.valueWidth));
  else url.searchParams.delete("romWidth");
  if (ui.valueScope !== "all") url.searchParams.set("romScope", ui.valueScope);
  else url.searchParams.delete("romScope");
  if (ui.typeFilters.length !== ROM_MAP_TYPE_OPTIONS.length) url.searchParams.set("romTypes", ui.typeFilters.join(","));
  else url.searchParams.delete("romTypes");
  replaceHistoryUrl(url);
}

function createRomPrgByteMap() {
  const base = romWindowOffset();
  const sourceUi = state.romMapExplorerUi || {
    search: state.romMapSearch,
    semanticScope: state.romMapSemanticScope,
    valueSearch: state.romMapValueSearch,
    valueCompare: state.romMapValueCompare,
    valueWidth: state.romMapValueWidth,
    valueScope: state.romMapValueScope,
    typeFilters: [...state.romMapTypeFilters],
  };
  const ui = {
    ...sourceUi,
    selectedOffset: Math.max(0, Math.min(
      state.romMapBytes.length - 1,
      Number(state.romMapSelectedOffset || 0) - base,
    )),
  };
  state.romMapExplorerUi = ui;
  ui.searchIndex = null;
  ui.filteredOffsets = null;
  ui.filterResult = null;
  ui.virtualFrame = null;
  ui.recordPagePromise = null;
  ui.pendingPageOffsets = null;
  ui.recordPageError = "";
  return createByteMapExplorer({
    id: "rom-prg-byte-map",
    space: "prg",
    label: state.romMapLoadedAll
      ? "PRG-ROM · 全部 Bank" : `PRG-ROM · Bank ${romMapHex(Math.floor(base / 0x2000), 2)}`,
    bytes: state.romMapBytes,
    annotations: state.romMapAnnotations,
    displayOffsetBase: base,
    totalLength: romTotalLength(),
    ui,
    typeOptions: ROM_MAP_TYPE_OPTIONS,
    addressHeaders: ["BANK", "BANK 内", "PRG", "ROM FILE", "CPU"],
    addressColumns(localOffset) {
      const offset = base + localOffset;
      const bank = Math.floor(offset / 0x2000);
      const local = offset & 0x1fff;
      const cpuAddress = state.romMapFieldObjects?.cpuAddressAt(offset);
      const cpu = cpuAddress == null ? "" : romMapHex(cpuAddress, 4);
      return [
        {value: romMapHex(bank, 2), className: "rom-byte-bank"},
        romMapHex(local, 4),
        romMapHex(offset),
        romMapHex(Number(state.project.manifest.rom.prg_file_offset) + offset),
        {value: cpu, className: cpu ? "" : "rom-byte-unmapped"},
      ];
    },
    parseGoto: parseRomMapGoto,
    formatGoto: localOffset => romMapHex(base + localOffset),
    async resolveGoto(offset, model) {
      if (offset >= base && offset < base + state.romMapBytes.length) {
        const previousPages = state.romMapPageLoadKey;
        syncRomExplorerState(model.ui);
        state.romMapSelectedOffset = offset;
        await loadRomMapPrg({offset});
        if (state.romMapPageLoadKey !== previousPages) {
          state.romMapExplorerUi = null;
          await render();
          return null;
        }
        return offset - base;
      }
      state.romMapSelectedOffset = offset;
      state.romMapExplorerUi = null;
      await loadRomMapPrg({offset});
      await render();
      return null;
    },
    async ensureOffsets(localOffsets) {
      if (state.romMapLoadedAll || state.romMapRecordPagesComplete) {
        return state.romMapAnnotations;
      }
      const pageOffsets = [...new Set(localOffsets.map(localOffset => {
        const globalOffset = base + Number(localOffset);
        return base + Math.floor((globalOffset - base) / 0x100) * 0x100;
      }))];
      await loadRomMapPrg({
        offset: state.romMapSelectedOffset,
        pageOffsets,
      });
      return state.romMapAnnotations;
    },
    ownerAddressLoaded(localOffset) {
      const offset = base + Number(localOffset);
      return (state.romMapLoadedRecordPageAddresses || []).some(address =>
        offset >= address.offset && offset < address.end_exclusive);
    },
    ownerAtOffset(offset) {
      const object = state.romMapFieldObjects?.byByte?.[offset - base];
      return object?.role ? {resourceId: object.resourceId, role: object.role} : null;
    },
    addressMeaning: romMapAddressMeaning,
    valueMeaning: (annotation, offset) => romMapValueMeaning(annotation, offset),
    explain: (annotation, offset) => romMapByteExplanation(annotation, offset),
    moduleLabel: annotation => romMapAnnotationModule(annotation).label,
    onUiChange: syncRomExplorerUrl,
    onSelect(localOffset, model) {
      syncRomExplorerState(model.ui);
      const offset = base + localOffset;
      state.romMapSelectedOffset = offset;
      const url = new URL(location.href);
      url.searchParams.set("romOffset", String(offset));
      url.searchParams.delete("romBank");
      replaceHistoryUrl(url);
      void showSelectedCodeFieldObject();
    },
  });
}





export function parseRomMapGoto(value) {
  const textValue = String(value || "").trim().toUpperCase();
  if (!textValue) return null;
  const bankAddress = textValue.match(/^(?:B(?:ANK)?\s*)?\$?([0-9A-F]{1,2})\s*[:/]\s*\$?([0-9A-F]{1,4})$/);
  if (bankAddress) {
    const bank = Number.parseInt(bankAddress[1], 16);
    const offset = Number.parseInt(bankAddress[2], 16);
    const result = bank * 0x2000 + offset;
    return offset < 0x2000 && result < romTotalLength() ? result : null;
  }
  const fileAddress = textValue.match(/^F(?:ILE)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const prgAddress = textValue.match(/^P(?:RG)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  let parsed;
  if (fileAddress) {
    parsed = Number.parseInt(fileAddress[1], 16) - Number(state.project.manifest.rom.prg_file_offset);
  } else {
    const raw = prgAddress ? prgAddress[1] : textValue.replace(/^\$/, "").replace(/^0X/, "");
    if (!/^[0-9A-F]+$/.test(raw)) return null;
    parsed = Number.parseInt(raw, 16);
  }
  return Number.isFinite(parsed) && parsed >= 0 && parsed < romTotalLength() ? parsed : null;
}

function renderRomMapDataModuleSummary(entries, confirmedDataBytes) {
  return `<div class="rom-module-summary">
    <header><div><b>已确认数据 · 按功能模块归属</b></div><strong>${confirmedDataBytes.toLocaleString()} B</strong></header>
    <div class="rom-module-summary-grid">${entries.map(entry => {
      const body = `<b>${esc(entry.label)}</b><strong>${entry.total.toLocaleString()} B</strong><small>字段已解码 ${entry.fields.toLocaleString()} B · 结构已定位 ${entry.structures.toLocaleString()} B · ${romMapPercent(entry.total, confirmedDataBytes)}</small>`;
      return entry.view
        ? `<a href="?view=${entry.view}" title="打开${esc(entry.label)}模块">${body}</a>`
        : `<div>${body}</div>`;
    }).join("")}</div>
  </div>`;
}

export async function renderRomMapPrg() {
  try {
    await loadRomMapPrg({
      offset: state.romMapSelectedOffset,
      all: state.romMapLoadedAll === true,
    });
  } catch (error) {
    return `<div class="empty"><b>PRG JSON bank 读取失败</b><span>${esc(error instanceof Error ? error.message : String(error))}</span><a class="button primary" href="?view=bytemap-prg&amp;romOffset=${Number(state.romMapSelectedOffset || 0)}">重试当前地址</a></div>`;
  }
  const total = state.romMapBytes.length;
  const base = romWindowOffset();
  const bank = Math.floor(Number(state.romMapSelectedOffset || base) / 0x2000);
  const bankCount = Math.ceil(romTotalLength() / 0x2000);
  const exact = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "exact" ? 1 : 0), 0);
  const partial = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "partial" ? 1 : 0), 0);
  const config = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "config" ? 1 : 0), 0);
  const font = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "fontdata" ? 1 : 0), 0);
  const content = state.romMapAnnotations.reduce((sum, annotation) => sum + (
    annotation?.status === "classified" && ["script", "textdata", "contentdata"].includes(annotation.category) ? 1 : 0
  ), 0);
  const mixed = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "mixed" ? 1 : 0), 0);
  const mirror = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.status === "classified" && annotation.category === "mirror" ? 1 : 0), 0);
  const typed = config + font + content + mixed + mirror;
  const confirmedData = exact + partial + typed;
  const dataModules = romMapDataModuleSummary(state.romMapAnnotations);
  const roundtrip = romMapWritebackBytes(romTotalLength());
  const web = state.romMapAnnotations.reduce((sum, annotation) => sum + (annotation?.block?.web_editable ? 1 : 0), 0);
  romPrgByteMap = createRomPrgByteMap();
  const beforeTable = `<div class="data-editor-toolbar">
      <a class="button ghost" href="${fileUrl("analysis/byte-map/index.json")}" target="_blank" title="字节地图清单" aria-label="字节地图清单">↗</a>
      ${state.romMapLoadedAll ? `<button class="button" id="rom-prg-current-bank" type="button">只看当前 Bank ${romMapHex(bank, 2)}</button>` : `
        <button class="button ghost" data-rom-prg-bank="${bank - 1}" type="button" ${bank <= 0 ? "disabled" : ""}>← 上一 Bank</button>
        <button class="button ghost" data-rom-prg-bank="${bank + 1}" type="button" ${bank + 1 >= bankCount ? "disabled" : ""}>下一 Bank →</button>
        ${state.romMapRecordPagesComplete ? "" : `<button class="button ghost" id="rom-prg-bank-semantics" type="button">加载当前 Bank 全部语义页</button>`}
        <button class="button" id="rom-prg-global-search" type="button">加载全部 Bank · 全局搜索</button>`}
      <span class="spacer"></span><p>${state.romMapLoadedAll ? "全局" : `当前 Bank ${romMapHex(bank, 2)}`} · 语义页 ${Number(state.romMapRecordPagesLoaded || 0).toLocaleString()} / ${Number(state.romMapRecordPagesTotal || 0).toLocaleString()} · 解码 / 打包链路 ${roundtrip.toLocaleString()} B · 可网页修改 ${web.toLocaleString()} B</p>
    </div>${renderRomMapDataModuleSummary(dataModules, confirmedData)}`;
  const afterTable = ``;
  return `${renderByteMapExplorer(romPrgByteMap, {beforeTable, afterTable})}`;
}

export function bindRomMapPrgViewer() {
  if (romPrgByteMap) bindByteMapExplorer(romPrgByteMap);
  void showSelectedCodeFieldObject();
  document.querySelectorAll("[data-rom-prg-bank]").forEach(button =>
    button.addEventListener("click", async () => {
      const bank = Number(button.dataset.romPrgBank);
      if (!Number.isInteger(bank) || bank < 0) return;
      syncRomExplorerState(romPrgByteMap.ui);
      state.romMapSelectedOffset = bank * 0x2000;
      state.romMapLoadedAll = false;
      state.romMapExplorerUi = null;
      await loadRomMapPrg({offset: state.romMapSelectedOffset});
      await render();
    })
  );
  document.querySelector("#rom-prg-global-search")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapExplorerUi = null;
    await loadRomMapPrg({offset: state.romMapSelectedOffset, all: true});
    await render();
  });
  document.querySelector("#rom-prg-bank-semantics")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapExplorerUi = null;
    await loadRomMapPrg({
      offset: state.romMapSelectedOffset,
      allPages: true,
    });
    await render();
  });
  document.querySelector("#rom-prg-current-bank")?.addEventListener("click", async () => {
    syncRomExplorerState(romPrgByteMap.ui);
    state.romMapLoadedAll = false;
    state.romMapExplorerUi = null;
    await loadRomMapPrg({offset: state.romMapSelectedOffset});
    await render();
  });
}
