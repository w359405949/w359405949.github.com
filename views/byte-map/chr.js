// @editor-module CHR 地址空间的字节地图页
//
// 来源：拆分前 views/rommap/view.js 的 CHR 部分。CHR 按 NES 2BPP 图块网格浏览，
// 与 PRG 的逐字节表是两种完全不同的呈现，因此拆成各自的模块而不是同页切换。

import {$, esc} from "../../core/dom.js";
import {replaceHistoryUrl} from "../../core/router.js";
import {state} from "../../core/state.js";
import {loadRomMapChr, romMapHex} from "./prg-loaders.js";
import {bindByteMapOwnerPanel, renderByteMapOwnerPanel} from "./explorer.js";
import {showEditorError} from '../../ui/editor-error.js';

const ROM_CHR_COLUMNS = 32;
const ROM_CHR_SCALE = 2;
const ROM_CHR_TILE_SIZE = 8 * ROM_CHR_SCALE;
const ROM_CHR_GUTTER = 36;

let romChrOwnerModel = null;

function selectedChrByteOffset() {
  const tileStart = Number(state.romMapChrTile || 0) * 16;
  const selected = Number(state.romMapChrSelectedOffset);
  return Number.isInteger(selected) && selected >= tileStart && selected < tileStart + 16
    ? selected : tileStart;
}

function createRomChrOwnerModel() {
  const ui = state.romMapChrOwnerUi || {};
  state.romMapChrOwnerUi = ui;
  ui.selectedOffset = selectedChrByteOffset();
  ui.ownerResourceId ??= "";
  ui.ownerLookupStatus ??= "idle";
  ui.ownerLookupRanges ??= [];
  ui.ownerLookupError ??= "";
  return {
    id: "rom-chr-byte-owner",
    space: "chr",
    displayOffsetBase: 0,
    ui,
    annotations: [],
    ownerAtOffset(offset) {
      const bank = Math.floor(offset / 0x400);
      return state.romMapChrFieldObjects?.byBank?.get(bank)?.byByte?.[offset % 0x400]?.owner || null;
    },
  };
}

// 少数 bank 的图块并不从 bank 首字节开始。当前 bank 网格需要一个 0-15 字节的
// 显示偏移；它只影响这一段怎么切图块，不改动任何字节。
function chrBankAlign(bank) {
  return Number(state.romMapChrBankAlign?.get(Number(bank)) || 0) & 0x0f;
}

function setChrBankAlign(bank, value) {
  if (!(state.romMapChrBankAlign instanceof Map)) state.romMapChrBankAlign = new Map();
  const align = Math.max(0, Math.min(15, Number(value) || 0));
  if (align) state.romMapChrBankAlign.set(Number(bank), align);
  else state.romMapChrBankAlign.delete(Number(bank));
}

function renderRomChrInspector() {
  const tile = state.romMapChrTile;
  const bank = Math.floor(tile / 64);
  const bankTile = tile % 64;
  const bankOffset = bankTile * 16;
  const region = tile * 16;
  const selectedOffset = selectedChrByteOffset();
  const file = Number(state.project.manifest.rom.chr_file_offset) + region;
  const raw = Array.from(state.romMapChrBytes.slice(region, region + 16));
  const bankReferences = state.romMapChrReferences?.byBank.get(bank) || [];
  const references = bankReferences
    .filter(reference => region < reference.end && region + 16 > reference.start);
  const semanticRanges = (state.romMapChrReferences?.semanticRanges || [])
    .filter(range => region < range.end && region + 16 > range.start);
  const grouped = new Map();
  for (const reference of references) {
    const key = `${reference.domain} · ${reference.kind}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }
  const visibleReferences = references.slice(0, 24);
  const referenceMarkup = references.length
    ? `<div class="rom-chr-reference-groups">${[...grouped].map(([label, count]) => `<span>${esc(label)} · ${count}</span>`).join("")}</div>
      <div class="rom-chr-reference-list">${visibleReferences.map(reference => `<span title="${esc(reference.uid)}"><b>${esc(reference.label)}</b><small>${esc(reference.uid)}</small></span>`).join("")}</div>
      `
    : ``;
  const rangeMarkup = semanticRanges.length
    ? `<div class="rom-chr-reference-list">${semanticRanges.map(range => `<span title="${esc(range.id)}"><b>${esc(range.label)}</b><small>${esc(range.kind)} · ${esc(range.status)} · C:${romMapHex(range.start)}-${romMapHex(range.end - 1)}</small></span>`).join("")}</div>`
    : ``;
  return `<div class="rom-chr-inspector-addresses">
      <span><small>CHR Bank</small><b>${romMapHex(bank, 2)}</b></span>
      <span><small>Bank 内图块</small><b>${romMapHex(bankTile, 2)}</b></span>
      <span><small>全局图块</small><b>${romMapHex(tile, 4)}</b></span>
      <span><small>Bank 内偏移</small><b>${romMapHex(bankOffset, 4)}</b></span>
      <span><small>图块起点</small><b>${romMapHex(region)}</b></span>
      <span><small>选中 CHR 字节</small><b>${romMapHex(selectedOffset)}</b></span>
      <span><small>ROM 文件地址</small><b>${romMapHex(file)}</b></span>
      <span><small>已知引用</small><b class="${references.length ? "referenced" : "unreferenced"}">${references.length ? `有 · ${references.length} 个来源` : "未发现"}</b></span>
    </div>
    <div class="rom-chr-raw"><small>16 字节 NES 2BPP</small><code>${raw.map(value => romMapHex(value, 2).slice(1)).join(" ")}</code></div>
    <div class="rom-chr-references"><small>CHR Bank / 资产物理范围</small>${rangeMarkup}</div>
    <div class="rom-chr-references"><small>当前物理范围的资源关联</small>${referenceMarkup}</div>
    ${renderByteMapOwnerPanel(romChrOwnerModel || createRomChrOwnerModel())}`;
}

function renderRomChrRegistrationGaps() {
  const directory = state.romMapChrBankDirectory || [];
  if (!directory.length) return "";
  const missing = directory.filter(entry => !entry.resources);

  const registered = directory.length - missing.length;

  const links = missing.map(entry =>
    `<a href="?view=bytemap-chr&amp;chrTile=${entry.offset / 16}" data-rom-chr-bank="${entry.bank}" title="CHR ${romMapHex(entry.offset)}-${romMapHex(entry.offset + entry.length - 1)}">${romMapHex(entry.bank, 2)}</a>`,
  ).join(" ");
  return `<div class="rom-chr-runtime-note"><b>已登记 bank ${registered} / ${directory.length}</b><span>${links}</span></div>`;
}

export async function renderRomMapChr() {
  try {
    const bank = Math.floor(Number(state.romMapChrTile || 0) / 64);
    await loadRomMapChr({offset: Number(state.romMapChrTile || 0) * 16,
      banks: Array.from({length: 32}, (_, index) => Math.max(0, bank - 16) + index)});
  } catch (error) {
    return `<div class="empty"><b>CHR JSON bank 读取失败</b><span>${esc(error instanceof Error ? error.message : String(error))}</span><a class="button primary" href="?view=bytemap-chr&amp;chrTile=${Number(state.romMapChrTile || 0)}">重试当前图块</a></div>`;
  }
  const total = Number(state.romMapChrTotalLength || state.romMapChrBytes.length);
  state.romMapChrSelectedOffset = selectedChrByteOffset();
  romChrOwnerModel = createRomChrOwnerModel();
  const tileCount = Math.floor(total / 16);
  const currentBank = Number(state.romMapChrBank || 0);
  const totalBanks = Math.ceil(total / 0x400);
  const referenceCount = state.romMapChrReferences?.byBank.get(currentBank)?.length || 0;
  const rangeCount = state.romMapChrReferences?.summary.total_ranges || 0;
  return `    <div class="rom-memory-toolbar rom-chr-toolbar">
      <div class="rom-flat-range"><small>连续 CHR</small><b>${romMapHex(0)}-${romMapHex(total - 1)}</b><span>256 × 1 KiB · 16,384 个图块 · 按物理地址连续</span></div>
      <label class="rom-memory-goto">地址<input id="rom-chr-goto" value="T:${romMapHex(state.romMapChrTile, 4)}" placeholder="T:$1907 / C:$019070 / 64:07" spellcheck="false"><button class="button" id="rom-chr-goto-button" type="button" title="跳转" aria-label="跳转">↗</button></label>
      <label class="rom-chr-bank-jump">跳到 Bank<select id="rom-chr-bank-jump">${Array.from({length: totalBanks}, (_, bank) => `<option value="${bank}" ${bank === currentBank ? "selected" : ""}>${romMapHex(bank, 2)}</option>`).join("")}</select></label>
      <label>Bank 对齐<input id="rom-chr-align" title="Bank ${romMapHex(currentBank, 2)} 的图块起始偏移" type="number" min="0" max="15" step="1" value="${chrBankAlign(currentBank)}"><span>字节</span></label>
    </div>
    <div class="rom-memory-summary"><b>CHR-ROM · 全部 Bank 图块网格</b><span>${total.toLocaleString()} B · ${tileCount.toLocaleString()} 个图块 · 当前 Bank <em id="rom-chr-current-bank">${romMapHex(currentBank, 2)}</em></span><strong class="rom-chr-reference-rate">${rangeCount.toLocaleString()} 个 Bank / 资产范围 · 当前 <em id="rom-chr-current-references">${referenceCount.toLocaleString()}</em> 个资源关联</strong><i class="chr-referenced">■ 已登记</i><i class="chr-unreferenced">■ 未登记</i><i class="chr-font-range">■ 已登记字体范围</i></div>
    <div class="rom-chr-runtime-note"><a href="?view=bytemap-prg&amp;romOffset=292864">跳到 PRG 基础字模 →</a></div>
    ${renderRomChrRegistrationGaps()}
    <div class="rom-chr-layout">
      <div class="rom-chr-stage" id="rom-chr-stage"><canvas id="rom-chr-canvas" width="${ROM_CHR_GUTTER + ROM_CHR_COLUMNS * ROM_CHR_TILE_SIZE}" height="${Math.ceil(tileCount / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE}" aria-label="CHR 图块网格"></canvas></div>
      <aside class="rom-chr-inspector" id="rom-chr-inspector">${renderRomChrInspector()}</aside>
    </div>`;
}
function paintRomMapChrCanvas() {
  const canvas = $("#rom-chr-canvas");
  if (!canvas || !state.romMapChrBytes) return;
  const context = canvas.getContext("2d");
  context.fillStyle = '#070a0b';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const tileCount = Math.floor(state.romMapChrBytes.length / 16);
  const bankBytes = Number(state.romMapChrFieldObjects?.total || 0x400);
  const bankTiles = Math.floor(bankBytes / 16);
  const registeredBanks = new Set((state.romMapChrBankDirectory || [])
    .filter(entry => entry.resources).map(entry => entry.bank));
  const fontRanges = (state.romMapChrReferences?.semanticRanges || [])
    .filter(range => range.isFont);
  const surface = document.createElement('canvas');
  surface.width = ROM_CHR_COLUMNS * 8;
  surface.height = Math.ceil(tileCount / ROM_CHR_COLUMNS) * 8;
  const pixels = surface.getContext('2d').createImageData(surface.width, surface.height);
  const palette = [[7, 10, 11, 255], [83, 97, 102, 255],
    [167, 181, 183, 255], [238, 245, 242, 255]];
  context.font = "8px monospace";
  context.textBaseline = "top";
  for (let localTile = 0; localTile < tileCount; localTile += 1) {
    const originY = Math.floor(localTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
    const tileBank = Math.floor(localTile / bankTiles);
    if (localTile % bankTiles === 0) {
      context.fillStyle = registeredBanks.has(tileBank) ? "#d8f231" : "#77858a";
      context.fillText(romMapHex(tileBank, 2), 3, originY + 3);
    }
    const source = localTile * 16 + chrBankAlign(tileBank);
    const bankEnd = (tileBank + 1) * bankBytes;
    for (let y = 0; y < 8; y += 1) {
      const low = source + y < bankEnd ? state.romMapChrBytes[source + y] : 0;
      const high = source + y + 8 < bankEnd ? state.romMapChrBytes[source + y + 8] : 0;
      for (let x = 0; x < 8; x += 1) {
        const bit = 7 - x;
        const color = ((low >> bit) & 1) | (((high >> bit) & 1) << 1);
        const pixelX = localTile % ROM_CHR_COLUMNS * 8 + x;
        const pixelY = Math.floor(localTile / ROM_CHR_COLUMNS) * 8 + y;
        pixels.data.set(palette[color], (pixelY * surface.width + pixelX) * 4);
      }
    }
  }
  surface.getContext('2d').putImageData(pixels, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(surface, ROM_CHR_GUTTER, 0,
    surface.width * ROM_CHR_SCALE, surface.height * ROM_CHR_SCALE);
  context.fillStyle = "#42d7e8";
  for (const range of fontRanges) {
    const firstTile = Math.max(0, Math.floor(range.start / 16));
    const lastTile = Math.min(tileCount - 1, Math.ceil(range.end / 16) - 1);
    for (let localTile = firstTile; localTile <= lastTile; localTile += 1) {
      const originX = ROM_CHR_GUTTER + (localTile % ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      const originY = Math.floor(localTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      context.fillRect(originX + 1, originY + 1, 3, 3);
    }
  }
  context.fillStyle = "#222a2d";
  for (let tile = bankTiles; tile < tileCount; tile += bankTiles) {
    const y = Math.floor(tile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
    context.fillRect(ROM_CHR_GUTTER - 5, y, canvas.width - ROM_CHR_GUTTER + 5, 1);
  }
  const selectedLocalTile = state.romMapChrTile;
  const selectedX = ROM_CHR_GUTTER + (selectedLocalTile % ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
  const selectedY = Math.floor(selectedLocalTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
  context.strokeStyle = "#f45151";
  context.lineWidth = 2;
  context.strokeRect(selectedX + 1, selectedY + 1, ROM_CHR_TILE_SIZE - 2, ROM_CHR_TILE_SIZE - 2);
}

async function selectRomMapChrTile(tile, scrollToTile = false, byteOffset = null) {
  const tileCount = Math.floor(Number(state.romMapChrTotalLength || 0) / 16);
  state.romMapChrTile = Math.max(0, Math.min(tileCount - 1, Number(tile) || 0));
  const tileStart = state.romMapChrTile * 16;
  const requestedOffset = Number(byteOffset);
  state.romMapChrSelectedOffset = Number.isInteger(requestedOffset)
      && requestedOffset >= tileStart && requestedOffset < tileStart + 16
    ? requestedOffset : tileStart;
  await loadRomMapChr({offset: state.romMapChrTile * 16, banks: [Math.floor(state.romMapChrTile / 64)]});
  const url = new URL(location.href);
  url.searchParams.set("chrTile", String(state.romMapChrTile));
  url.searchParams.delete("chrBank");
  replaceHistoryUrl(url);
  paintRomMapChrCanvas();
  const inspector = $("#rom-chr-inspector");
  if (romChrOwnerModel) romChrOwnerModel.ui.selectedOffset = selectedChrByteOffset();
  if (inspector) {
    inspector.innerHTML = renderRomChrInspector();
    if (romChrOwnerModel) bindByteMapOwnerPanel(romChrOwnerModel, inspector);
  }
  const align = $("#rom-chr-align");
  if (align) {
    align.value = String(chrBankAlign(state.romMapChrBank));
    align.title = `Bank ${romMapHex(state.romMapChrBank, 2)} 的图块起始偏移`;
  }
  const bankJump = $("#rom-chr-bank-jump");
  if (bankJump) bankJump.value = String(state.romMapChrBank);
  const currentBank = $("#rom-chr-current-bank");
  if (currentBank) currentBank.textContent = romMapHex(state.romMapChrBank, 2);
  const currentReferences = $("#rom-chr-current-references");
  if (currentReferences) currentReferences.textContent = String(
    state.romMapChrReferences?.byBank.get(state.romMapChrBank)?.length || 0);
  if (scrollToTile) {
    const stage = $("#rom-chr-stage");
    const canvas = $("#rom-chr-canvas");
    if (stage && canvas) {
      const canvasY = Math.floor(state.romMapChrTile / ROM_CHR_COLUMNS) * ROM_CHR_TILE_SIZE;
      const displayScale = canvas.clientHeight / canvas.height;
      stage.scrollTop = Math.max(0, canvasY * displayScale - stage.clientHeight / 2);
    }
  }
}


function parseRomChrGotoTarget(value) {
  const textValue = String(value || "").trim().toUpperCase();
  const bankTile = textValue.match(/^(?:B(?:ANK)?\s*)?\$?([0-9A-F]{1,2})\s*[:/]\s*\$?([0-9A-F]{1,2})$/);
  if (bankTile) {
    const bank = Number.parseInt(bankTile[1], 16);
    const tile = Number.parseInt(bankTile[2], 16);
    const globalTile = bank * 64 + tile;
    return bank < 256 && tile < 64
      ? {tile: globalTile, offset: globalTile * 16} : null;
  }
  const chrAddress = textValue.match(/^C(?:HR)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  const tileAddress = textValue.match(/^T(?:ILE)?\s*:\s*(?:\$|0X)?([0-9A-F]+)$/);
  let tile;
  let offset;
  if (chrAddress) {
    offset = Number.parseInt(chrAddress[1], 16);
    tile = Math.floor(offset / 16);
  } else {
    tile = Number.parseInt(tileAddress ? tileAddress[1] : textValue.replace(/^\$/, "").replace(/^0X/, ""), 16);
    offset = tile * 16;
  }
  const tileCount = Math.floor(Number(state.romMapChrTotalLength || 0) / 16);
  return Number.isFinite(tile) && Number.isInteger(offset)
      && tile >= 0 && tile < tileCount && offset >= 0 && offset < tileCount * 16
    ? {tile, offset} : null;
}

export function bindRomMapChrViewer() {
  const canvas = $("#rom-chr-canvas");
  void loadRomMapChr({background: true}).then(loaded => {
    if (loaded && canvas?.isConnected) void selectRomMapChrTile(state.romMapChrTile);
  }).catch(error => {
    if (canvas?.isConnected) showEditorError(canvas.parentElement, 'CHR bank', error);
  });
  $("#rom-chr-canvas")?.addEventListener("click", event => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    if (x < ROM_CHR_GUTTER) return;
    const localTile = Math.floor((x - ROM_CHR_GUTTER) / ROM_CHR_TILE_SIZE)
      + Math.floor(y / ROM_CHR_TILE_SIZE) * ROM_CHR_COLUMNS;
    if (localTile < Math.floor(state.romMapChrTotalLength / 16)) {
      void selectRomMapChrTile(localTile);
    }
  });
  const go = () => {
    const input = $("#rom-chr-goto");
    const target = parseRomChrGotoTarget(input?.value);
    if (!target) {
      input?.setCustomValidity("请输入 T:全局图块、C:CHR 字节地址，或 Bank:Bank 内图块（例如 64:07）");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    void selectRomMapChrTile(target.tile, true, target.offset);
    if (input) input.value = target.offset === target.tile * 16
      ? `T:${romMapHex(target.tile, 4)}` : `C:${romMapHex(target.offset)}`;
  };
  $("#rom-chr-goto-button")?.addEventListener("click", go);
  $("#rom-chr-goto")?.addEventListener("keydown", event => {
    if (event.key === "Enter") go();
  });
  $("#rom-chr-align")?.addEventListener("input", event => {
    setChrBankAlign(state.romMapChrBank, event.currentTarget.value);
    paintRomMapChrCanvas();
  });
  $("#rom-chr-bank-jump")?.addEventListener("change", event => {
    void selectRomMapChrTile(Number(event.currentTarget.value) * 64, true);
  });
  document.querySelectorAll("[data-rom-chr-bank]").forEach(button =>
    button.addEventListener("click", event => {
      event.preventDefault();
      const bank = Number(button.dataset.romChrBank);
      if (Number.isInteger(bank) && bank >= 0) void selectRomMapChrTile(bank * 64, true);
    })
  );
  void selectRomMapChrTile(state.romMapChrTile, true);
}
