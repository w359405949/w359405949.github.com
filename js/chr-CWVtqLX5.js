import { state, ROM_MAP_TYPE_OPTIONS } from './emulator-DynsZsth.js';
import { editorLog, fileUrl } from './visual-metasprites-DJP54-bV.js';
import { render, replaceHistoryUrl } from './ui-editor-nodes-CtPdwTyu.js';
import { esc, resourceDomain, $, showEditorError } from './element-tree-DsgOBeTK.js';
import { formatPhysicalAddress, physicalAddressTarget, hasFieldOwner, fieldOwner, db } from './battle-result-script-runtime-B_EClFew.js';
import { findPhysicalFieldObjectRanges, romMapHex, loadRomMapPrg, romMapDataModuleSummary, romMapWritebackBytes, romMapPercent, romMapAnnotationModule, loadRomMapChr } from './prg-loaders-BmwiQmdC.js';

// @editor-module Region-neutral continuous byte-map explorer.
//
// PRG ROM and battery SRAM intentionally share this renderer, filter model,
// coverage accounting and virtual scrolling.  Loaders and address adapters
// remain space-specific; once bytes and normalized annotations arrive here,
// the physical storage kind no longer changes how a row behaves.


const BYTE_MAP_ROW_HEIGHT = 38;

const DEFAULT_TYPE_OPTIONS = Object.freeze([
  {key: "semantic", label: "字段已解码", className: "data"},
  {key: "code", label: "功能代码", className: "code"},
  {key: "config", label: "结构化配置", className: "config"},
  {key: "script", label: "脚本 / 命令流", className: "script"},
  {key: "text", label: "文本 / 名称", className: "textdata"},
  {key: "content", label: "图形 / 内容资源", className: "contentdata"},
  {key: "font", label: "字库图形", className: "fontdata"},
  {key: "mixed", label: "混合代码 / 内联数据", className: "mixed"},
  {key: "mirror", label: "历史镜像 / 填充", className: "mirror"},
  {key: "provisional", label: "候选范围", className: "provisional"},
  {key: "unknown", label: "尚未划分", className: "unknown"},
]);

const byteMapHex = (value, width = 6) =>
  `$${Number(value).toString(16).toUpperCase().padStart(width, "0")}`;

function requireBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("byte-map bytes must be Uint8Array");
  return bytes;
}

function requireLength(value) {
  const length = Number(value);
  if (!Number.isInteger(length) || length < 1) {
    throw new TypeError("byte-map length must be a positive integer");
  }
  return length;
}

function requireAnnotations(annotations, length) {
  if (!Array.isArray(annotations) || annotations.length !== length) {
    throw new TypeError(`byte-map annotations must contain ${length} physical-byte entries`);
  }
  return annotations;
}

function createByteMapExplorer(options) {
  const bytes = options.bytes == null ? null : requireBytes(options.bytes);
  const length = bytes ? bytes.length : requireLength(options.length);
  if (options.length != null && requireLength(options.length) !== length) {
    throw new TypeError("byte-map byte length does not match declared length");
  }
  const annotations = requireAnnotations(options.annotations, length);
  const typeOptions = options.typeOptions || DEFAULT_TYPE_OPTIONS;
  const ui = options.ui || {};
  ui.selectedOffset = Math.max(0, Math.min(length - 1, Number(ui.selectedOffset) || 0));
  ui.search ??= "";
  ui.semanticScope ??= "all";
  if (!bytes && ui.semanticScope === "value") ui.semanticScope = "all";
  ui.valueSearch ??= "";
  ui.valueCompare ??= "eq";
  ui.valueWidth = Number(ui.valueWidth) === 2 ? 2 : 1;
  ui.valueScope ??= "all";
  ui.typeFilters ??= typeOptions.map(option => option.key);
  ui.searchIndex ??= null;
  ui.filteredOffsets ??= null;
  ui.filterResult ??= null;
  ui.virtualFrame ??= null;
  ui.ownerResourceId ??= "";
  ui.ownerLookupStatus ??= "idle";
  ui.ownerLookupRanges ??= [];
  ui.ownerLookupError ??= "";
  ui.ownerSelectionStatus ??= "ready";
  ui.ownerSelectionError ??= "";
  return {
    ...options,
    id: String(options.id || options.space || "byte-map"),
    space: String(options.space || "bytes"),
    label: String(options.label || options.space || "Byte map"),
    length,
    displayOffsetBase: Number.isInteger(options.displayOffsetBase)
      ? options.displayOffsetBase : 0,
    totalLength: Number.isInteger(options.totalLength) && options.totalLength >= length
      ? options.totalLength : length,
    bytes,
    hasValues: bytes !== null,
    annotations,
    typeOptions,
    ui,
    addressHeaders: options.addressHeaders || ["区域", "区内", "物理偏移", "槽内", "CPU"],
    addressColumns: options.addressColumns || (offset => ["", "", byteMapHex(offset), "", ""]),
    parseGoto: options.parseGoto || (value => parseFlatOffset(value, length)),
    formatGoto: options.formatGoto || (offset => byteMapHex(offset)),
  };
}

function replaceByteMapBytes(model, bytes) {
  requireBytes(bytes);
  if (bytes.length !== model.length || bytes.length !== model.annotations.length) {
    throw new TypeError("byte-map byte length changed");
  }
  model.bytes = bytes;
  model.hasValues = true;
  model.ui.searchIndex = null;
  return model;
}

function byteMapAnnotationType(annotation) {
  if (!annotation) return "unknown";
  if (["exact", "partial"].includes(annotation.status)) return "semantic";
  if (annotation.status === "code" || annotation.category === "code") return "code";
  if (annotation.status === "provisional" || annotation.category === "provisional") return "provisional";
  const explicit = ({
    config: "config",
    "save-container": "config",
    "save-directory": "config",
    "save-slot": "config",
    script: "script",
    textdata: "text",
    contentdata: "content",
    fontdata: "font",
    mixed: "mixed",
    mirror: "mirror",
  })[annotation.category];
  if (explicit) return explicit;
  if (annotation.status === "classified") return "config";
  return "semantic";
}

function readUnsigned(bytes, offset, width) {
  if (offset < 0 || offset + width > bytes.length) return null;
  let value = 0;
  for (let index = 0; index < width; index += 1) {
    value += bytes[offset + index] * (2 ** (index * 8));
  }
  return value;
}

function parseFilterValue(input, width) {
  const text = String(input || "").trim();
  if (!text) return {active: false, valid: true, value: null};
  let digits = text.toUpperCase();
  let radix = 10;
  if (digits.startsWith("$")) { radix = 16; digits = digits.slice(1); }
  else if (digits.startsWith("0X")) { radix = 16; digits = digits.slice(2); }
  else if (digits.endsWith("H")) { radix = 16; digits = digits.slice(0, -1); }
  else if (digits.startsWith("%")) { radix = 2; digits = digits.slice(1); }
  else if (digits.startsWith("0B")) { radix = 2; digits = digits.slice(2); }
  else if (/[A-F]/.test(digits)) radix = 16;
  const pattern = radix === 16 ? /^[0-9A-F]+$/ : radix === 2 ? /^[01]+$/ : /^\d+$/;
  const value = pattern.test(digits) ? Number.parseInt(digits, radix) : Number.NaN;
  const maximum = (2 ** (width * 8)) - 1;
  return {active: true, valid: Number.isFinite(value) && value >= 0 && value <= maximum, value, maximum};
}

function valueMatches(value, expected, comparison) {
  if (comparison === "ne") return value !== expected;
  if (comparison === "gt") return value > expected;
  if (comparison === "gte") return value >= expected;
  if (comparison === "lt") return value < expected;
  if (comparison === "lte") return value <= expected;
  return value === expected;
}

function defaultAddressMeaning(annotation) {
  return annotation?.addressMeaning || [annotation?.record, annotation?.field?.meaning]
    .filter(Boolean).join(" · ");
}

function decodedValue(model, annotation, offset) {
  if (!annotation) return "";
  if (!model.hasValues) return "未载入";
  if (typeof model.valueMeaning === "function") {
    return String(model.valueMeaning(annotation, offset, model.bytes) ?? "");
  }
  if (annotation.decodedLabel != null) return String(annotation.decodedLabel);
  const start = annotation.rangeStart;
  const length = annotation.rangeLength;
  const encoding = annotation.binding?.encoding || annotation.field?.encoding || "";
  if (["u8", "u16le", "u24le"].includes(encoding)) {
    return String(readUnsigned(model.bytes, start, length));
  }
  if (length > 32) {
    return `${byteMapHex(model.bytes[offset], 2)} · 范围 ${length.toLocaleString()} B`;
  }
  const raw = Array.from(model.bytes.slice(start, start + length));
  return raw.map(value => byteMapHex(value, 2).slice(1)).join(" ");
}

function addressMeaning(model, annotation) {
  if (typeof model.addressMeaning === "function") return String(model.addressMeaning(annotation) ?? "");
  return defaultAddressMeaning(annotation);
}

function explanation(model, annotation, offset) {
  if (!annotation) return {current: "", consequence: "", edit: ""};
  if (!model.hasValues) {
    return {
      current: annotation.algorithmDetail || annotation.field?.detail || annotation.record || "",
      consequence: "当前字节未载入；地址与结构说明仍然有效。",
      edit: annotation.binding?.editable === true
        ? "载入同长度字节后才可读取或修改当前值。" : "当前没有可读取的字节值。",
    };
  }
  if (typeof model.explain === "function") return model.explain(annotation, offset, model.bytes) || {};
  return {
    current: annotation.algorithmDetail || annotation.field?.detail || annotation.record || "",
    consequence: annotation.rangeLength > 1
      ? `字段第 ${offset - annotation.rangeStart + 1}/${annotation.rangeLength} 字节。` : "",
    edit: annotation.binding?.editable === true
      ? "此字段可通过字节地图定点修改。" : "只读；未知位与相邻字节保持原样。",
  };
}

function buildSearchIndex(model) {
  const seen = new Set();
  const index = [];
  for (let offset = 0; offset < model.annotations.length; offset += 1) {
    const annotation = model.annotations[offset];
    if (!annotation) continue;
    const key = annotation.searchKey || `${annotation.rangeStart}:${annotation.field?.meaning}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meaning = addressMeaning(model, annotation);
    const value = model.hasValues
      ? decodedValue(model, annotation, annotation.rangeStart) : "";
    const moduleLabel = typeof model.moduleLabel === "function"
      ? model.moduleLabel(annotation) : "";
    const addressSearchable = [
      meaning, annotation.record, annotation.field?.meaning, annotation.fieldId,
      annotation.rangeId, annotation.binding?.label, annotation.binding?.slot,
      ...(annotation.semanticPath || []), annotation.semanticDomain,
      moduleLabel, annotation.writebackPath, ...(annotation.aliases || []),
      ...(annotation.resourceIds || []),
      model.formatGoto(annotation.rangeStart), byteMapHex(annotation.rangeStart),
    ].filter(value_ => value_ !== null && value_ !== undefined && value_ !== "")
      .join(" \n ").toLocaleLowerCase();
    const valueSearchable = model.hasValues
      ? [value, annotation.valueDescription, ...(annotation.valueAliases || [])]
        .filter(Boolean).join(" \n ").toLocaleLowerCase()
      : "";
    index.push({
      offset: annotation.rangeStart,
      rangeLength: annotation.rangeLength,
      annotation,
      addressSearchable,
      valueSearchable,
      searchable: `${addressSearchable} \n ${valueSearchable}`,
    });
  }
  index.sort((left, right) => left.offset - right.offset);
  model.ui.searchIndex = index;
  return index;
}

function filterActive(model) {
  return Boolean(model.ui.search.trim() || (model.hasValues && model.ui.valueSearch.trim())
    || model.ui.typeFilters.length !== model.typeOptions.length);
}

function filterByteMap(model) {
  const query = String(model.ui.search || "").trim();
  const valueFilter = model.hasValues
    ? parseFilterValue(model.ui.valueSearch, model.ui.valueWidth)
    : {active: false, valid: true, value: null};
  if (!query && !valueFilter.active && !filterActive(model)) {
    const result = {total: model.length, offsets: null, filterLabel: `全部 ${model.label}`};
    model.ui.filteredOffsets = null;
    model.ui.filterResult = result;
    return result;
  }
  if (!valueFilter.valid) {
    const result = {total: 0, offsets: [], error: `${model.ui.valueWidth * 8}-bit 无符号值应在 0-${valueFilter.maximum} 之间`};
    model.ui.filteredOffsets = [];
    model.ui.filterResult = result;
    return result;
  }
  const index = model.ui.searchIndex || buildSearchIndex(model);
  const tokens = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const field = model.ui.semanticScope === "address" ? "addressSearchable"
    : model.ui.semanticScope === "value" ? "valueSearchable" : "searchable";
  // 物理地址搜索指向一个字节，而语义索引按 record 起点去重。若目标落在跨页/
  // 多字节 record 的中间，仅搜索 record.rangeStart 会错误返回 0 项。地址形状的
  // 查询直接解析为当前窗口的局部 offset；普通文本仍走语义索引。
  const parsedAddress = query && model.ui.semanticScope !== "value"
    ? model.parseGoto(query) : null;
  const addressOffset = Number.isInteger(parsedAddress)
    ? parsedAddress - model.displayOffsetBase : null;
  const matches = query && addressOffset === null
    ? index.filter(item => tokens.every(token => item[field].includes(token))) : null;
  const selectedTypes = new Set(model.ui.typeFilters);
  const scanWidth = model.hasValues ? model.ui.valueWidth : 1;
  const offsets = [];
  const seen = new Set();
  const consider = offset => {
    if (seen.has(offset) || offset < 0 || offset + scanWidth > model.length) return;
    seen.add(offset);
    if (!selectedTypes.has(byteMapAnnotationType(model.annotations[offset]))) return;
    if (model.hasValues && model.ui.valueScope === "known" && !model.annotations[offset]) return;
    if (model.hasValues && valueFilter.active && !valueMatches(
      readUnsigned(model.bytes, offset, model.ui.valueWidth), valueFilter.value, model.ui.valueCompare,
    )) return;
    offsets.push(offset);
  };
  if (addressOffset !== null) {
    consider(addressOffset);
  } else if (matches) {
    for (const match of matches) {
      const length = valueFilter.active && model.ui.valueWidth > 1 ? 1 : match.rangeLength;
      for (let index_ = 0; index_ < length; index_ += 1) consider(match.offset + index_);
    }
  } else {
    for (let offset = 0; offset <= model.length - scanWidth; offset += 1) consider(offset);
  }
  offsets.sort((left, right) => left - right);
  const result = {
    total: offsets.length,
    offsets,
    filterLabel: [query && `语义“${query}”`, valueFilter.active && `当前值 ${model.ui.valueCompare} ${valueFilter.value}`,
      model.hasValues && model.ui.valueScope === "known" && "仅已标注"].filter(Boolean).join(" · "),
  };
  model.ui.filteredOffsets = offsets;
  model.ui.filterResult = result;
  return result;
}

function byteMapFilterStatus(model) {
  const result = model.ui.filterResult;
  if (result?.error) return {className: "invalid", text: `过滤条件错误 · ${result.error}`};
  if (!filterActive(model)) return {className: "", text: `未过滤 · ${model.length.toLocaleString()} B`};
  return {
    className: result?.total ? "active" : "empty",
    text: `${Number(result?.total || 0).toLocaleString()} HITS / ${model.length.toLocaleString()} B · ${result?.filterLabel || ""}`,
  };
}

function byteMapCoverage(model) {
  const counts = {exact: 0, partial: 0, code: 0, classified: 0, provisional: 0, unknown: 0};
  for (const annotation of model.annotations) {
    if (!annotation) counts.unknown += 1;
    else if (annotation.status === "exact") counts.exact += 1;
    else if (annotation.status === "partial") counts.partial += 1;
    else if (annotation.status === "code" || annotation.category === "code") counts.code += 1;
    else if (annotation.status === "provisional") counts.provisional += 1;
    else counts.classified += 1;
  }
  counts.semantic = counts.exact + counts.partial;
  counts.editable = model.annotations.reduce((total, annotation) =>
    total + (annotation?.block?.web_editable === true ? 1 : 0), 0);
  counts.confirmed = counts.exact + counts.partial + counts.code + counts.classified;
  counts.total = model.length;
  counts.annotated = counts.total - counts.unknown;
  return counts;
}

const percent = (value, total) => total ? `${(value * 100 / total).toFixed(2)}%` : "0.00%";

function renderByteMapCoverage(model) {
  const coverage = byteMapCoverage(model);
  const status = byteMapFilterStatus(model);
  const saveCoverage = model.space === "sram" ? `
    <span class="exact">精确字段语义 ${coverage.exact.toLocaleString()} B · ${percent(coverage.exact, coverage.total)}</span>
    <span class="partial">部分字段语义 ${coverage.partial.toLocaleString()} B · ${percent(coverage.partial, coverage.total)}</span>
    <span class="semantic">字段语义合计 ${coverage.semantic.toLocaleString()} B · ${percent(coverage.semantic, coverage.total)}</span>
    <span class="classified">仅结构 / 大类 ${coverage.classified.toLocaleString()} B · ${percent(coverage.classified, coverage.total)}</span>
    <span class="editable">安全可编辑 ${coverage.editable.toLocaleString()} B · ${percent(coverage.editable, coverage.total)}</span>
    <span class="annotated">物理有标注 ${coverage.annotated.toLocaleString()} B · ${percent(coverage.annotated, coverage.total)}（不等于解析率）</span>` : `
    <span class="exact">字段已解码 ${coverage.exact.toLocaleString()} B · ${percent(coverage.exact, coverage.total)}</span>
    <span class="partial">字段部分解码 ${coverage.partial.toLocaleString()} B · ${percent(coverage.partial, coverage.total)}</span>
    <span class="code">功能代码 ${coverage.code.toLocaleString()} B · ${percent(coverage.code, coverage.total)}</span>
    <span class="classified">已分类内容 ${coverage.classified.toLocaleString()} B · ${percent(coverage.classified, coverage.total)}</span>
    <span class="annotated">物理有标注 ${coverage.annotated.toLocaleString()} B · ${percent(coverage.annotated, coverage.total)}</span>`;
  return `<div class="rom-memory-summary" data-byte-map-coverage="${esc(model.space)}">
    <b>${esc(model.label)} · 连续地址流</b><span>${coverage.total.toLocaleString()} B</span>
    <strong id="${esc(model.id)}-filter-status" class="rom-filter-status ${status.className}">${esc(status.text)}</strong>
    ${saveCoverage}
    <span class="provisional">候选范围 ${coverage.provisional.toLocaleString()} B · ${percent(coverage.provisional, coverage.total)}</span>
  </div>`;
}

function normalizedOwner(value) {
  return value?.resourceId && value?.role ? value : null;
}

function selectedPhysicalOffset(model) {
  return Number(model.displayOffsetBase || 0) + Number(model.ui.selectedOffset || 0);
}

function selectedByteMapResourceOwner(model) {
  const localOffset = Number(model.ui.selectedOffset || 0);
  const physicalOffset = selectedPhysicalOffset(model);
  if (typeof model.ownerAtOffset === "function") {
    return normalizedOwner(model.ownerAtOffset(physicalOffset, model));
  }
  const object = model.annotations?.[localOffset]?.fieldObject;
  return normalizedOwner(object?.role ? {resourceId: object.resourceId,
    role: object.role} : null);
}

function selectedOwnerAddressLoaded(model) {
  if (typeof model.ownerAddressLoaded !== "function") return true;
  const localOffset = Number(model.ui.selectedOffset || 0);
  return model.ownerAddressLoaded(localOffset, selectedPhysicalOffset(model), model) === true;
}

function ownerElementLabel(owner) {
  if (Number.isInteger(owner?.elementIndex) && Number.isInteger(owner?.elementCount)) {
    return `${owner.elementIndex} / ${owner.elementCount}`;
  }
  if (Number.isInteger(owner?.elementIndex)) return String(owner.elementIndex);
  if (Number.isInteger(owner?.elementCount)) return `共 ${owner.elementCount}`;
  return "";
}

function renderSelectedOwner(model) {
  const offset = selectedPhysicalOffset(model);
  const address = formatPhysicalAddress(model.space, offset) || `${model.space}:${offset}`;
  if (!selectedOwnerAddressLoaded(model)) {
    const failed = model.ui.ownerSelectionStatus === "error";
    return `<div class="byte-owner-answer pending" data-byte-owner-status="${failed ? "error" : "loading"}">
      <header><span>当前物理地址</span><b>${esc(address)}</b></header>
      <strong>${failed ? "这段字节的拥有者登记读取失败" : "正在读取这段字节的拥有者登记…"}</strong>
      <p>${failed ? esc(model.ui.ownerSelectionError || "未知错误") : ""}</p>
    </div>`;
  }
  const owner = selectedByteMapResourceOwner(model);
  if (!owner) {
    return `<div class="byte-owner-answer unowned" data-byte-owner-status="unowned">
      <header><span>当前物理地址</span><b>${esc(address)}</b></header>

    </div>`;
  }
  const element = ownerElementLabel(owner);
  const editor = resourceDomain(owner.resourceId)
    ? `<button type="button" class="button ghost" data-byte-owner-editor="${esc(owner.resourceId)}" title="资源编辑页" aria-label="资源编辑页">↗</button>`
    : "";
  return `<div class="byte-owner-answer owned" data-byte-owner-status="owned">
    <header><span>当前物理地址</span><b>${esc(address)}</b></header>
    <dl>
      <div><dt>资源标识</dt><dd data-byte-owner-resource-id>${esc(owner.resourceId)}</dd></div>
      <div><dt>角色</dt><dd data-byte-owner-role>${esc(owner.role)}</dd></div>
      ${element ? `<div><dt>元素索引 / 总数</dt><dd data-byte-owner-element>${esc(element)}</dd></div>` : ""}
    </dl>
    ${editor}
  </div>`;
}

function ownerRangeHref(range) {
  const target = physicalAddressTarget(range);
  if (!target) return "";
  const query = new URLSearchParams({view: target.view});
  query.set(target.parameter, String(target.focus));
  return `?${query}`;
}

function compareOwnerRanges(left, right) {
  const spaces = ["prg", "chr", "sram"];
  return spaces.indexOf(left.space) - spaces.indexOf(right.space)
    || Number(left.offset) - Number(right.offset)
    || Number(left.length) - Number(right.length)
    || String(left.role).localeCompare(String(right.role), "zh-CN");
}

function renderByteMapResourceOwnerRanges(resourceId, ranges, status = "ready", error = "") {
  const id = String(resourceId || "").trim();
  if (status === "loading") {
    return `<p class="byte-owner-lookup-message loading-owner">正在只按 <code>resource_owner</code> 扫描 PRG / CHR / SRAM…</p>`;
  }
  if (status === "error") {
    return `<p class="byte-owner-lookup-message error">反查失败：${esc(error || "未知错误")}</p>`;
  }
  if (!id) {
    return ``;
  }
  const ownedRanges = (Array.isArray(ranges) ? ranges : [])
    .filter(range => range?.resourceId === id)
    .slice().sort(compareOwnerRanges);
  if (!ownedRanges.length) {
    return ``;
  }
  return `<div class="byte-owner-range-summary"><b>${esc(id)}</b><span>${ownedRanges.length.toLocaleString()} 个拥有范围 · 跨地址空间合并列出</span></div>
    <ol class="byte-owner-range-list">${ownedRanges.map(range => {
      const address = formatPhysicalAddress(range.space, range.offset);
      const end = formatPhysicalAddress(range.space, range.endExclusive - 1);
      const href = ownerRangeHref(range);
      const element = ownerElementLabel(range);
      return `<li data-byte-owner-range data-byte-owner-space="${esc(range.space)}" data-byte-owner-offset="${range.offset}">
        <a href="${esc(href)}"><b>${esc(address)}</b><span>–${esc(end)}</span></a>
        <span>长度 ${Number(range.length).toLocaleString()} B · 角色 ${esc(range.role)}${element ? ` · 元素 ${esc(element)}` : ""}</span>
      </li>`;
    }).join("")}</ol>`;
}

function renderByteMapOwnerPanel(model) {
  const ui = model.ui;
  return `<section id="${esc(model.id)}-owner-panel" class="byte-owner-panel" data-byte-owner-panel>
    <div data-byte-owner-address-result>${renderSelectedOwner(model)}</div>
    <form class="byte-owner-lookup" data-byte-owner-lookup>
      <label>按资源标识反查拥有范围
        <input value="${esc(ui.ownerResourceId)}" placeholder="battle-appearance:vehicle-8 / monster-profile" autocomplete="off" spellcheck="false" data-byte-owner-resource-input>
      </label>
      <button class="button" type="submit">查它占了哪些字节</button>
    </form>
    <div class="byte-owner-lookup-result" data-byte-owner-resource-result>
      ${renderByteMapResourceOwnerRanges(
        ui.ownerResourceId, ui.ownerLookupRanges, ui.ownerLookupStatus, ui.ownerLookupError,
      )}
    </div>
  </section>`;
}

function ownerPanelElement(model, root = document) {
  if (root?.id === `${model.id}-owner-panel`) return root;
  return root?.querySelector?.(`#${CSS.escape(model.id)}-owner-panel`) || null;
}

function updateByteMapOwnerSelection(model, root = document) {
  const panel = ownerPanelElement(model, root);
  const result = panel?.querySelector("[data-byte-owner-address-result]");
  if (result) result.innerHTML = renderSelectedOwner(model);
}

function bindByteMapOwnerPanel(model, root = document) {
  const panel = ownerPanelElement(model, root);
  if (!panel) return;
  updateByteMapOwnerSelection(model, panel);
  panel.addEventListener("click", async event => {
    const target = event.target.closest?.("[data-byte-owner-editor]");
    if (!target) return;
    const {navigateToResourceTarget} = await import('./preview-sound-DsPhxRYS.js').then(function (n) { return n.resourceNav; });
    await navigateToResourceTarget(target.dataset.byteOwnerEditor);
  });
  panel.querySelector("[data-byte-owner-lookup]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const input = panel.querySelector("[data-byte-owner-resource-input]");
    const result = panel.querySelector("[data-byte-owner-resource-result]");
    const resourceId = String(input?.value || "").trim();
    if (!resourceId) {
      input?.setCustomValidity("请输入资源标识");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    model.ui.ownerResourceId = resourceId;
    model.ui.ownerLookupStatus = "loading";
    model.ui.ownerLookupError = "";
    model.ui.ownerLookupRanges = [];
    if (result) result.innerHTML = renderByteMapResourceOwnerRanges(resourceId, [], "loading");
    const request = Symbol(resourceId);
    model.ui.ownerLookupRequest = request;
    try {
      const lookup = typeof model.ownerLookup === "function"
        ? model.ownerLookup : findPhysicalFieldObjectRanges;
      const ranges = await lookup(resourceId, model);
      if (model.ui.ownerLookupRequest !== request) return;
      model.ui.ownerLookupStatus = "ready";
      model.ui.ownerLookupRanges = Array.isArray(ranges) ? ranges : [];
      if (result) result.innerHTML = renderByteMapResourceOwnerRanges(
        resourceId, model.ui.ownerLookupRanges,
      );
    } catch (error_) {
      editorLog.error("编辑页面", `操作失败：${error_?.message || error_}`, error_);
      if (model.ui.ownerLookupRequest !== request) return;
      model.ui.ownerLookupStatus = "error";
      model.ui.ownerLookupError = error_ instanceof Error ? error_.message : String(error_);
      if (result) result.innerHTML = renderByteMapResourceOwnerRanges(
        resourceId, [], "error", model.ui.ownerLookupError,
      );
    }
  });
}

function renderFilterControls(model) {
  const ui = model.ui;
  const valueDisabled = model.hasValues ? "" : " disabled";
  const rangeStart = model.displayOffsetBase;
  const rangeEnd = rangeStart + model.length - 1;
  const scope = model.totalLength === model.length
    ? `${model.length.toLocaleString()} 个物理字节`
    : `当前窗口 ${model.length.toLocaleString()} B / 全空间 ${model.totalLength.toLocaleString()} B`;
  return `<div class="rom-memory-toolbar">
    <div class="rom-flat-range"><small>连续 ${esc(model.space)}</small><b>${byteMapHex(rangeStart)}-${byteMapHex(rangeEnd)}</b><span>${scope}</span></div>
    <label class="rom-memory-goto">地址<input id="${esc(model.id)}-goto" value="${esc(model.formatGoto(ui.selectedOffset))}" spellcheck="false"><button class="button" id="${esc(model.id)}-goto-button" type="button" title="跳转" aria-label="跳转">↗</button></label>
    <div class="rom-cheat-filter">
      <small>字节地图筛选</small>
      <label class="rom-map-search">语义关键词<input id="${esc(model.id)}-search" value="${esc(ui.search)}" placeholder="字段、功能、field_id…" autocomplete="off" spellcheck="false"></label>
      <label>语义范围<select id="${esc(model.id)}-semantic-scope">
        <option value="all" ${ui.semanticScope === "all" ? "selected" : ""}>全部</option>
        <option value="address" ${ui.semanticScope === "address" ? "selected" : ""}>地址含义</option>
        <option value="value" ${ui.semanticScope === "value" ? "selected" : ""}${valueDisabled}>值含义</option>
      </select></label>
      <label class="rom-map-value-search">当前值<input id="${esc(model.id)}-value-search" value="${esc(ui.valueSearch)}" placeholder="${model.hasValues ? "$01 / 1 / %00000001" : "未载入"}" autocomplete="off" spellcheck="false"${valueDisabled}></label>
      <label>比较<select id="${esc(model.id)}-value-compare"${valueDisabled}>
        ${[["eq", "="], ["ne", "≠"], ["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"]]
          .map(([value, label]) => `<option value="${value}" ${ui.valueCompare === value ? "selected" : ""}>${esc(label)}</option>`).join("")}
      </select></label>
      <label>宽度<select id="${esc(model.id)}-value-width"${valueDisabled}><option value="1" ${ui.valueWidth === 1 ? "selected" : ""}>8-bit</option><option value="2" ${ui.valueWidth === 2 ? "selected" : ""}>16-bit LE</option></select></label>
      <label>范围<select id="${esc(model.id)}-value-scope"${valueDisabled}><option value="all" ${ui.valueScope === "all" ? "selected" : ""}>全部字节</option><option value="known" ${ui.valueScope === "known" ? "selected" : ""}>仅已标注</option></select></label>
      <button class="button ghost" id="${esc(model.id)}-filter-clear" type="button">清除</button>
      <div class="rom-type-filter"><small>类型</small>${model.typeOptions.map(option => `
        <label class="${esc(option.className)}"><input type="checkbox" data-byte-map-type="${esc(option.key)}" ${ui.typeFilters.includes(option.key) ? "checked" : ""}><i></i><span>${esc(option.label)}</span></label>`).join("")}
        <button type="button" data-byte-map-types="all">全选</button><button type="button" data-byte-map-types="none">清空</button>
      </div>
    </div>
  </div>`;
}

function rowValueCell(model, annotation, offset, valueMeaning) {
  if (!model.hasValues) return `<b>未载入</b>`;
  if (annotation && typeof model.fieldEditor === "function") {
    const editor = model.fieldEditor(annotation, offset, model.bytes);
    if (editor != null) return String(editor);
  }
  return annotation ? `<b>${esc(valueMeaning)}</b>` : "";
}

function renderByteMapRow(model, offset, mergeContext = null) {
  const value = model.hasValues ? model.bytes[offset] : null;
  const annotation = model.annotations[offset];
  const classes = ["rom-byte-row", Math.floor(offset / 0x2000) & 1 ? "bank-odd" : "bank-even"];
  if ((offset & 0x1fff) === 0) classes.push("bank-start");
  if (annotation) classes.push(annotation.status, annotation.category);
  if (offset === model.ui.selectedOffset) classes.push("selected");
  const groupId = annotation?.codeGroupId || annotation?.mergeGroupId;
  const merged = Boolean(groupId && mergeContext);
  const mergeStart = !merged || !mergeContext.continuation;
  const rowspan = Math.max(1, Number(mergeContext?.rowspan || 1));
  const rowspanAttribute = rowspan > 1 ? ` rowspan="${rowspan}"` : "";
  const semantic = annotation ? "rom-byte-semantic" : "rom-byte-empty";
  const mergedClasses = merged ? ` rom-byte-range-merged rom-byte-${annotation.category}-merged` : "";
  const meaning = annotation ? addressMeaning(model, annotation) : "";
  const decoded = annotation ? decodedValue(model, annotation, offset) : "";
  const detail = explanation(model, annotation, offset);
  const meta = annotation ? [
    annotation.fieldId || annotation.rangeId,
    typeof model.moduleLabel === "function" ? model.moduleLabel(annotation) : "",
    annotation.record,
    annotation.status,
    annotation.field?.encoding,
    annotation.rangeLength > 1 ? `字节 ${offset - annotation.rangeStart + 1}/${annotation.rangeLength}` : "",
  ].filter(Boolean).join(" · ") : "";
  const raw = !annotation ? "" : !model.hasValues ? "未载入" : annotation.rangeLength > 32
    ? `${byteMapHex(value, 2).slice(1)}（当前字节；全范围 ${annotation.rangeLength.toLocaleString()} B）`
    : Array.from(model.bytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength))
      .map(item => byteMapHex(item, 2).slice(1)).join(" ");
  const sram = model.space === "sram";
  const addressCell = mergeStart
    ? `<td class="rom-byte-annotation ${semantic}${mergedClasses}"${rowspanAttribute}${sram && meta ? ` title="${esc(meta)}"` : ""}>${annotation ? `<b>${esc(meaning)}</b>${sram ? "" : `<small>${esc(meta)}</small>`}` : ""}</td>` : "";
  const note = [detail.current, detail.consequence, detail.edit].filter(Boolean).join(" ");
  const noteCell = mergeStart
    ? `<td class="rom-byte-note ${semantic}${mergedClasses}"${rowspanAttribute} title="${esc(note)}">${annotation ? `<span>${esc(detail.current || "")}</span>${sram ? "" : `<small>${esc([detail.consequence, detail.edit].filter(Boolean).join(" "))}</small>`}` : ""}</td>` : "";
  const columns = model.addressColumns(offset, annotation);
  if (!Array.isArray(columns) || columns.length !== 5) throw new TypeError("byte-map address adapter must return five columns");
  return `<tr class="${classes.join(" ")}" data-byte-map-offset="${offset}" data-byte-map-space="${esc(model.space)}">
    ${columns.map(column => {
      const item = column && typeof column === "object" ? column : {value: column};
      return `<td class="rom-byte-address ${esc(item.className || "")}" title="${esc(item.title ?? item.value ?? "")}">${esc(item.value ?? "")}</td>`;
    }).join("")}
    <td class="rom-byte-value">${model.hasValues ? byteMapHex(value, 2).slice(1) : "—"}</td>
    <td class="rom-byte-bits">${model.hasValues ? value.toString(2).padStart(8, "0") : "—"}</td>
    ${addressCell}
    <td class="rom-byte-value-meaning ${semantic}"${sram && annotation ? ` title="字段原始值 ${esc(raw)}"` : ""}>${rowValueCell(model, annotation, offset, decoded)}${annotation && !sram ? `<small>字段原始值 ${esc(raw)}</small>` : ""}</td>
    ${noteCell}
  </tr>`;
}

function rootElement(model, root = document) {
  if (root?.id === `${model.id}-explorer`) return root;
  return root?.querySelector?.(`#${CSS.escape(model.id)}-explorer`) || null;
}

function filteredByteMapRowIndex(model, offset) {
  const offsets = model.ui.filteredOffsets;
  if (!offsets) return offset;
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (offsets[middle] === offset) return middle;
    if (offsets[middle] < offset) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

function renderByteMapWindow(model, root = document) {
  const container = rootElement(model, root);
  const viewer = container?.querySelector("[data-byte-map-viewer]");
  const body = container?.querySelector("[data-byte-map-body]");
  if (!viewer || !body) return [];
  const filtered = model.ui.filteredOffsets;
  const total = filtered ? filtered.length : model.length;
  if (!total) {
    const status = byteMapFilterStatus(model);
    body.innerHTML = `<tr class="rom-byte-no-results"><td colspan="10"><b>没有命中字节</b><span>${esc(status.text)}</span></td></tr>`;
    return [];
  }
  const buffer = 14;
  const first = Math.max(0, Math.floor(viewer.scrollTop / BYTE_MAP_ROW_HEIGHT) - buffer);
  // A contract page or embedded panel may omit the production max-height CSS.
  // Never let the table's own natural height feed back into the next virtual
  // window size and expand 29 → 800 → every physical row.
  const viewportHeight = Math.min(1200, viewer.clientHeight || 760);
  const visible = Math.ceil(viewportHeight / BYTE_MAP_ROW_HEIGHT) + buffer * 2;
  const end = Math.min(total, first + visible);
  const offsets = [];
  for (let row = first; row < end; row += 1) offsets.push(filtered ? filtered[row] : row);
  const mergeContexts = Array(offsets.length).fill(null);
  for (let index = 0; index < offsets.length;) {
    const offset = offsets[index];
    const annotation = model.annotations[offset];
    const groupId = annotation?.codeGroupId || annotation?.mergeGroupId;
    if (!groupId) { index += 1; continue; }
    let endIndex = index + 1;
    while (endIndex < offsets.length && offsets[endIndex] === offsets[endIndex - 1] + 1
      && (model.annotations[offsets[endIndex]]?.codeGroupId
        || model.annotations[offsets[endIndex]]?.mergeGroupId) === groupId) endIndex += 1;
    mergeContexts[index] = {rowspan: endIndex - index, continuation: false};
    for (let cursor = index + 1; cursor < endIndex; cursor += 1) {
      mergeContexts[cursor] = {rowspan: 0, continuation: true};
    }
    index = endIndex;
  }
  const rows = [];
  if (first) rows.push(`<tr class="rom-byte-spacer"><td colspan="10" style="height:${first * BYTE_MAP_ROW_HEIGHT}px"></td></tr>`);
  for (let index = 0; index < offsets.length; index += 1) rows.push(renderByteMapRow(model, offsets[index], mergeContexts[index]));
  if (end < total) rows.push(`<tr class="rom-byte-spacer"><td colspan="10" style="height:${(total - end) * BYTE_MAP_ROW_HEIGHT}px"></td></tr>`);
  body.innerHTML = rows.join("");
  return offsets;
}

async function ensureSelectedByteOwner(model, offset, root) {
  if (selectedOwnerAddressLoaded(model) || typeof model.ensureOffsets !== "function") return;
  const request = Symbol(`owner:${offset}`);
  model.ui.ownerSelectionRequest = request;
  try {
    const annotations = await model.ensureOffsets([offset], model);
    if (model.ui.ownerSelectionRequest !== request || model.ui.selectedOffset !== offset) return;
    if (Array.isArray(annotations) && annotations.length === model.length
        && annotations !== model.annotations) {
      model.annotations = annotations;
      model.ui.searchIndex = null;
      filterByteMap(model);
      renderByteMapWindow(model, root);
      updateFilterStatus(model, root);
    }
    if (!selectedOwnerAddressLoaded(model)) {
      throw new Error("字节地图语义分片没有返回这个地址");
    }
    model.ui.ownerSelectionStatus = "ready";
    model.ui.ownerSelectionError = "";
  } catch (error) {
    if (model.ui.ownerSelectionRequest !== request || model.ui.selectedOffset !== offset) return;
    model.ui.ownerSelectionStatus = "error";
    model.ui.ownerSelectionError = error instanceof Error ? error.message : String(error);
  }
  updateByteMapOwnerSelection(model, root);
}

function updateFilterStatus(model, root) {
  const status = byteMapFilterStatus(model);
  const node = root.querySelector(`#${CSS.escape(model.id)}-filter-status`);
  if (node) {
    node.className = `rom-filter-status ${status.className}`.trim();
    node.textContent = status.text;
  }
}

function selectByteMapOffset(model, offset, {scroll = false, root = document} = {}) {
  const normalized = Math.max(0, Math.min(model.length - 1, Number(offset) || 0));
  model.ui.selectedOffset = normalized;
  model.ui.ownerSelectionStatus = selectedOwnerAddressLoaded(model) ? "ready" : "loading";
  model.ui.ownerSelectionError = "";
  const container = rootElement(model, root);
  if (scroll) {
    const viewer = container?.querySelector("[data-byte-map-viewer]");
    const row = filteredByteMapRowIndex(model, normalized);
    if (viewer && row >= 0) viewer.scrollTop = Math.max(0, row * BYTE_MAP_ROW_HEIGHT - viewer.clientHeight / 2);
    renderByteMapWindow(model, container || root);
  }
  container?.querySelector(".rom-byte-row.selected")?.classList.remove("selected");
  container?.querySelector(`[data-byte-map-offset="${normalized}"]`)?.classList.add("selected");
  const goto = container?.querySelector(`#${CSS.escape(model.id)}-goto`);
  if (goto) goto.value = model.formatGoto(normalized);
  updateByteMapOwnerSelection(model, container || root);
  model.onSelect?.(normalized, model);
  if (!selectedOwnerAddressLoaded(model)) {
    void ensureSelectedByteOwner(model, normalized, container || root);
  }
}

function renderByteMapExplorer(model, {beforeTable = "", afterTable = ""} = {}) {
  filterByteMap(model);
  return `<section id="${esc(model.id)}-explorer" class="byte-map-explorer" data-byte-map-space="${esc(model.space)}" data-byte-map-total="${model.length}" data-byte-map-values="${model.hasValues ? "loaded" : "missing"}">
    ${renderFilterControls(model)}
    ${renderByteMapCoverage(model)}
    ${renderByteMapOwnerPanel(model)}
    ${beforeTable}
    <div class="rom-memory-viewer" data-byte-map-viewer>
      <table class="rom-byte-table" aria-rowcount="${model.length}">
        <thead><tr>${model.addressHeaders.map(label => `<th>${esc(label)}</th>`).join("")}<th>HEX</th><th>BITS</th><th>地址含义</th><th>当前值含义</th><th>说明 / 回写</th></tr></thead>
        <tbody data-byte-map-body></tbody>
      </table>
    </div>
    ${afterTable}
  </section>`;
}

function parseFlatOffset(value, total) {
  const text = String(value || "").trim().toUpperCase().replace(/^\$/, "").replace(/^0X/, "");
  if (!/^[0-9A-F]+$/.test(text)) return null;
  const offset = Number.parseInt(text, 16);
  return offset >= 0 && offset < total ? offset : null;
}

function syncFilter(model, root) {
  model.ui.searchIndex = null;
  filterByteMap(model);
  const viewer = root.querySelector("[data-byte-map-viewer]");
  if (viewer) viewer.scrollTop = 0;
  renderByteMapWindow(model, root);
  updateFilterStatus(model, root);
  model.onUiChange?.(model.ui, model);
}

function bindByteMapExplorer(model, root = document) {
  const container = rootElement(model, root);
  if (!container) return;
  bindByteMapOwnerPanel(model, container);
  const byId = suffix => container.querySelector(`#${CSS.escape(model.id)}-${suffix}`);
  const bindFilter = (suffix, eventName, update) => byId(suffix)?.addEventListener(eventName, event => {
    update(event.currentTarget);
    syncFilter(model, container);
  });
  bindFilter("search", "input", node => { model.ui.search = node.value; });
  bindFilter("semantic-scope", "change", node => { model.ui.semanticScope = ["address", "value"].includes(node.value) ? node.value : "all"; });
  bindFilter("value-search", "input", node => { model.ui.valueSearch = node.value; });
  bindFilter("value-compare", "change", node => { model.ui.valueCompare = node.value; });
  bindFilter("value-width", "change", node => { model.ui.valueWidth = Number(node.value) === 2 ? 2 : 1; });
  bindFilter("value-scope", "change", node => { model.ui.valueScope = node.value === "known" ? "known" : "all"; });
  const setTypes = types => {
    model.ui.typeFilters = model.typeOptions.map(option => option.key).filter(key => types.includes(key));
    container.querySelectorAll("[data-byte-map-type]").forEach(node => {
      node.checked = model.ui.typeFilters.includes(node.dataset.byteMapType);
    });
    syncFilter(model, container);
  };
  container.querySelectorAll("[data-byte-map-type]").forEach(node => node.addEventListener("change", () => {
    setTypes(Array.from(container.querySelectorAll("[data-byte-map-type]:checked"))
      .map(input => input.dataset.byteMapType));
  }));
  container.querySelector('[data-byte-map-types="all"]')?.addEventListener("click", () => setTypes(model.typeOptions.map(option => option.key)));
  container.querySelector('[data-byte-map-types="none"]')?.addEventListener("click", () => setTypes([]));
  byId("filter-clear")?.addEventListener("click", () => {
    Object.assign(model.ui, {search: "", semanticScope: "all", valueSearch: "", valueCompare: "eq", valueWidth: 1, valueScope: "all"});
    model.ui.typeFilters = model.typeOptions.map(option => option.key);
    for (const [suffix, value] of [["search", ""], ["semantic-scope", "all"], ["value-search", ""], ["value-compare", "eq"], ["value-width", "1"], ["value-scope", "all"]]) {
      const node = byId(suffix); if (node) node.value = value;
    }
    container.querySelectorAll("[data-byte-map-type]").forEach(node => { node.checked = true; });
    syncFilter(model, container);
  });
  const go = async () => {
    const input = byId("goto");
    const parsed = model.parseGoto(input?.value);
    let offset = parsed;
    if (parsed != null && typeof model.resolveGoto === "function") {
      try {
        offset = await model.resolveGoto(parsed, model);
      } catch (error) {
        input?.setCustomValidity(error instanceof Error ? error.message : String(error));
        input?.reportValidity();
        return;
      }
      // null means the resolver performed an asynchronous bank switch and
      // replaced this explorer.  The new render owns selection and validation.
      if (offset == null) return;
    }
    if (offset == null) {
      input?.setCustomValidity("地址不在当前字节空间内");
      input?.reportValidity();
      return;
    }
    if (model.ui.filteredOffsets && filteredByteMapRowIndex(model, offset) < 0) {
      input?.setCustomValidity("该地址不符合当前过滤条件");
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity("");
    selectByteMapOffset(model, offset, {scroll: true, root: container});
  };
  byId("goto-button")?.addEventListener("click", () => { void go(); });
  byId("goto")?.addEventListener("keydown", event => { if (event.key === "Enter") void go(); });
  container.querySelector("[data-byte-map-body]")?.addEventListener("click", event => {
    if (event.target.closest("[data-byte-map-field-id]")) return;
    const row = event.target.closest("[data-byte-map-offset]");
    if (row) selectByteMapOffset(model, Number(row.dataset.byteMapOffset), {root: container});
  });
  container.querySelector("[data-byte-map-body]")?.addEventListener("input", async event => {
    const input = event.target.closest("[data-byte-map-field-id]");
    if (!input || !model.onFieldEdit) return;
    const value = input.type === "checkbox" ? input.checked
      : input.dataset.byteMapValueKind === "bytes" ? input.value
        : input.value === "" ? null : Number(input.value);
    try {
      const result = await model.onFieldEdit(input.dataset.byteMapFieldId, value, model, input);
      input.setCustomValidity("");
      if (result instanceof Uint8Array) {
        replaceByteMapBytes(model, result);
        filterByteMap(model);
        renderByteMapWindow(model, container);
        updateFilterStatus(model, container);
      }
      model.onUiChange?.(model.ui, model);
    } catch (error) {
      input.setCustomValidity(error instanceof Error ? error.message : String(error));
    }
  });
  const viewer = container.querySelector("[data-byte-map-viewer]");
  let initialPageScrollTop = null;
  let pageLoadingArmed = false;
  viewer?.addEventListener("scroll", () => {
    if (model.ui.virtualFrame) cancelAnimationFrame(model.ui.virtualFrame);
    model.ui.virtualFrame = requestAnimationFrame(async () => {
      model.ui.virtualFrame = null;
      const offsets = renderByteMapWindow(model, container);
      if (typeof model.ensureOffsets !== "function" || !offsets.length) return;
      if (!pageLoadingArmed) {
        if (initialPageScrollTop === null
            || Math.abs(viewer.scrollTop - initialPageScrollTop) < 1) return;
        pageLoadingArmed = true;
      }
      model.ui.pendingPageOffsets = offsets;
      if (model.ui.recordPagePromise) return;
      model.ui.recordPagePromise = (async () => {
        while (model.ui.pendingPageOffsets) {
          const wanted = model.ui.pendingPageOffsets;
          model.ui.pendingPageOffsets = null;
          const annotations = await model.ensureOffsets(wanted, model);
          if (!Array.isArray(annotations) || annotations.length !== model.length
              || annotations === model.annotations) continue;
          model.annotations = annotations;
          model.ui.searchIndex = null;
          filterByteMap(model);
          renderByteMapWindow(model, container);
          updateFilterStatus(model, container);
          updateByteMapOwnerSelection(model, container);
        }
      })();
      try {
        await model.ui.recordPagePromise;
      } catch (error) {
        model.ui.recordPageError = error instanceof Error ? error.message : String(error);
      } finally {
        model.ui.recordPagePromise = null;
      }
    });
  });
  // 先建立带上下 spacer 的虚拟高度，随后 selection 才能把任意深链行滚进窗口；
  // 这次只画占位/已缓存语义，不触发 record-page I/O。
  renderByteMapWindow(model, container);
  selectByteMapOffset(model, model.ui.selectedOffset, {scroll: true, root: container});
  initialPageScrollTop = viewer?.scrollTop ?? 0;
}

// @editor-module PRG 地址输入按当前符号表范围解析。
const romTotalLength = () => Number(state.romMapTotalLength || state.romMapBytes?.length || 0);

function parseRomMapGoto(value) {
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

// @editor-module 字节解释、别名与搜索索引

function romMapDecodedValue(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  if (annotation.decodedLabel != null) return String(annotation.decodedLabel);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const encoding = annotation.field.encoding || "";
  if (annotation.field.encoding?.includes("little-endian")) {
    const result = raw.reduce((total, item, index) => total | (item << (index * 8)), 0);
    return `${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(result, raw.length * 2)}`;
  }
  if (annotation.status === "partial") return `palette ${state.romMapBytes[offset] & 3}`;
  if (encoding === "u8") return String(raw[0]);
  if (encoding.includes("page ID")) return romMapHex(raw[0], 2);
  if (encoding.includes("even 2 KiB")) return `${romMapHex(raw[0], 2)} / ${romMapHex((raw[0] + 1) & 0xFF, 2)}`;
  if (raw.length > 1) return raw.map(item => romMapHex(item, 2).slice(1)).join(" ");
  return romMapHex(raw[0], 2);
}

function romMapCodeValueMeaning(annotation, offset) {
  const instruction = annotation?.codeInstruction;
  const value = state.romMapBytes[offset];
  if (!instruction) return `机器码 ${romMapHex(value, 2)}`;
  const byteIndex = offset - instruction.start;
  if (byteIndex === 0) return `${instruction.assembly} · opcode ${romMapHex(value, 2)}`;
  const operands = Math.max(1, instruction.size - 1);
  return `${instruction.assembly} · 操作数 ${byteIndex}/${operands} ${romMapHex(value, 2)}`;
}

function romMapClassifiedValueMeaning(annotation, offset) {
  const value = state.romMapBytes[offset];
  const position = offset - annotation.rangeStart;
  return `${annotation.classificationLabel || annotation.field.meaning} 字节 ${romMapHex(value, 2)} · 区块 +${romMapHex(position, Math.max(2, Math.ceil(Math.log2(Math.max(2, annotation.rangeLength)) / 4))).slice(1)}`;
}

function romMapByteExplanation(annotation, offset) {
  if (!annotation) return {current: "", consequence: "", edit: ""};
  if (annotation.category === "code") {
    const instruction = annotation.codeInstruction;
    const byteIndex = instruction ? offset - instruction.start : 0;
    const role = instruction
      ? (byteIndex === 0 ? "opcode" : `操作数第 ${byteIndex}/${Math.max(1, instruction.size - 1)} 字节`)
      : "尚未归属的机器码字节";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: instruction
        ? `本行是 ${instruction.assembly} 的 ${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`
        : `本行是${role}，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: "此字节计入“功能代码”覆盖；目前只读，尚未提供汇编级改写和重定位。",
    };
  }
  if (annotation.classificationKind) {
    const position = offset - annotation.rangeStart;
    const provisional = annotation.status === "provisional";
    return {
      current: annotation.algorithmDetail || `${annotation.record}。`,
      consequence: `本行是区块内第 ${position + 1}/${annotation.rangeLength} 个字节，当前值 ${romMapHex(state.romMapBytes[offset], 2)}。`,
      edit: provisional
        ? "该范围只是后续分析候选，不计入已确认覆盖，不应据此直接修改。"
        : "当前已确认区块类型和边界，但未细化到本字节的具体字段；应优先在对应的类型化编辑器中修改。",
    };
  }
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const value = state.romMapBytes[offset];
  const index = offset - annotation.rangeStart;
  const decoded = raw.reduce((total, item, byteIndex) => total + item * (2 ** (byteIndex * 8)), 0);
  const block = annotation.block || {};
  const byteRole = annotation.rangeLength > 1
    ? (annotation.field.encoding?.includes("little-endian")
      ? `本行是${index === 0 ? "低位" : (index === annotation.rangeLength - 1 ? "高位" : `第 ${index + 1}`)}字节。`
      : `本行是该字段第 ${index + 1}/${annotation.rangeLength} 个字节。`)
    : "";
  let current = `${annotation.record} 的“${annotation.field.meaning}”当前字节为 ${romMapHex(value, 2)}。${byteRole}`;
  if (annotation.algorithmDetail) current = `${annotation.algorithmDetail}${byteRole ? ` ${byteRole}` : ""}`;

  if (block.id === "scene-header-records") {
    switch (annotation.field.meaning) {
      case "逻辑地图宽度":
        current = `${annotation.record} 的地图宽度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "逻辑地图高度":
        current = `${annotation.record} 的地图高度为 ${romMapHex(value, 2)} = ${value} 个 16×16 地图图块，即 ${value * 16} 像素。`;
        break;
      case "地图压缩流指针": {
        const target = decoded < 0xC000
          ? `PRG region ${romMapHex(decoded)}（ROM file ${romMapHex(decoded + 0x10)}）`
          : `CHR region ${romMapHex(0x02F000 + decoded)}`;
        current = `${annotation.record} 的地图流指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标是 ${target}；${byteRole}`;
        break;
      }
      case "Metatile $00-$3F 定义/属性页":
      case "Metatile $40-$7F 定义/属性页":
        current = `${annotation.record} 当前使用 page ${romMapHex(value, 2)}：定义位于 PRG region ${romMapHex(0x035000 + value * 0x100)}，属性位于 ${romMapHex(0x038700 + value * 0x40)}。`;
        break;
      case "点传送与边界传送记录指针":
        current = `${annotation.record} 的传送记录指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，目标 PRG region ${romMapHex(0x01E000 + decoded - 0x8000)}（ROM file ${romMapHex(0x01E010 + decoded - 0x8000)}）；${byteRole}`;
        break;
      case "场景背景 palette 源指针":
        current = `${annotation.record} 的 palette 指针为 ${raw.map(item => romMapHex(item, 2).slice(1)).join(" ")} → ${romMapHex(decoded, 4)}，9 字节 palette 源位于 PRG region ${romMapHex(0x014000 + decoded)}（ROM file ${romMapHex(0x014010 + decoded)}）；${byteRole}`;
        break;
      case "地图对象 sprite CHR bank pair":
        current = `${annotation.record} 的地图对象使用 CHR bank ${romMapHex(value, 2)}/${romMapHex((value + 1) & 0xFF, 2)}，对应 CHR region ${romMapHex(value * 0x400)} 和 ${romMapHex(((value + 1) & 0xFF) * 0x400)}。`;
        break;
      case "场景背景 MMC3 register 2-5 bank":
        current = `${annotation.record} 的 MMC3 R${index + 2} 使用 1 KiB CHR bank ${romMapHex(value, 2)}，对应 CHR region ${romMapHex(value * 0x400)}-${romMapHex(value * 0x400 + 0x3FF)}。`;
        break;
    }
  } else if (block.id === "world-metatile-definitions") {
    current = `${annotation.record} 的${annotation.field.meaning}当前引用 PPU 图块 ${romMapHex(value, 2)}；修改这一字节会替换该地图图块对应象限的 8×8 图块。`;
  } else if (block.id === "world-metatile-attributes") {
    current = `${annotation.record} 的属性原值为 ${romMapHex(value, 2)}：已确认 bit 0-1 = ${value & 3}（palette ${value & 3}）；bit 2-7 尚未解释，修改时必须原样保留。`;
  }

  const edit = block.web_editable
    ? "网页已有对应的编辑控件，构建 ROM 时会写入该字节。"
    : (annotation.writebackPath
      ? `网页尚未开放此字段；构建 ROM 时由 ${annotation.writebackPath} 在原长度内回写。`
      : (block.roundtrip
        ? "网页尚未开放此字段；该固定范围已纳入无损回包，但当前仍需通过源数据修改。"
        : "目前只用于定位和说明，尚未建立自动回写路径。"));
  return {current, consequence: annotation.field.detail || "", edit};
}

function romMapAddressMeaning(annotation) {
  if (!annotation) return "";
  return annotation.addressMeaning || `${annotation.record} · ${annotation.field.meaning}`;
}

function romMapValueMeaning(annotation, offset) {
  if (!annotation) return "";
  if (annotation.category === "code") return romMapCodeValueMeaning(annotation, offset);
  if (annotation.classificationKind) return romMapClassifiedValueMeaning(annotation, offset);
  const raw = Array.from(
    state.romMapBytes.slice(annotation.rangeStart, annotation.rangeStart + annotation.rangeLength)
  );
  const numeric = raw.reduce((total, item, index) => total + item * (2 ** (index * 8)), 0);
  if (typeof annotation.valueFormatter === "function") {
    return String(annotation.valueFormatter(numeric, raw, offset));
  }
  if (annotation.valueDescription != null) return String(annotation.valueDescription);
  return romMapDecodedValue(annotation, offset);
}

// @editor-module PRG 地址空间的字节地图页

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

async function renderRomMapPrg() {
  try {
    await loadRomMapPrg({
      offset: state.romMapSelectedOffset,
      all: state.romMapLoadedAll === true,
    });
  } catch (error) {
    return `<div class="empty"><b>PRG JSON bank 读取失败</b><span>${esc(error instanceof Error ? error.message : String(error))}</span><a class="button primary" href="?view=bytemap-prg&amp;romOffset=${Number(state.romMapSelectedOffset || 0)}">重试当前地址</a></div>`;
  }
  state.romMapBytes.length;
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

function bindRomMapPrgViewer() {
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

var prg = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindRomMapPrgViewer: bindRomMapPrgViewer,
  renderRomMapPrg: renderRomMapPrg
});

// @editor-module CHR 地址空间的字节地图页
//
// 来源：拆分前 views/rommap/view.js 的 CHR 部分。CHR 按 NES 2BPP 图块网格浏览，
// 与 PRG 的逐字节表是两种完全不同的呈现，因此拆成各自的模块而不是同页切换。


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

async function renderRomMapChr() {
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

function bindRomMapChrViewer() {
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

var chr = /*#__PURE__*/Object.freeze({
  __proto__: null,
  bindRomMapChrViewer: bindRomMapChrViewer,
  renderRomMapChr: renderRomMapChr
});

export { bindByteMapExplorer, byteMapHex, chr, createByteMapExplorer, filterByteMap, prg, renderByteMapExplorer, selectByteMapOffset };
