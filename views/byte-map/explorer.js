// @editor-module Region-neutral continuous byte-map explorer.
//
// PRG ROM and battery SRAM intentionally share this renderer, filter model,
// coverage accounting and virtual scrolling.  Loaders and address adapters
// remain space-specific; once bytes and normalized annotations arrive here,
// the physical storage kind no longer changes how a row behaves.

import {editorLog} from "../../core/editor-log.js";
import {esc} from "../../core/dom.js";
import {
  formatPhysicalAddress,
  physicalAddressTarget,
} from "../../core/physical-address.js";
import {findPhysicalFieldObjectRanges} from "../../core/physical-field-object-index.js";
import {resourceDomain} from "../../core/resource-index.js";

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

export const byteMapHex = (value, width = 6) =>
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

export function createByteMapExplorer(options) {
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

export function filterByteMap(model) {
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

export function renderByteMapOwnerPanel(model) {
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

export function bindByteMapOwnerPanel(model, root = document) {
  const panel = ownerPanelElement(model, root);
  if (!panel) return;
  updateByteMapOwnerSelection(model, panel);
  panel.addEventListener("click", async event => {
    const target = event.target.closest?.("[data-byte-owner-editor]");
    if (!target) return;
    const {navigateToResourceTarget} = await import("../../core/resource-nav.js");
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

export function selectByteMapOffset(model, offset, {scroll = false, root = document} = {}) {
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

export function renderByteMapExplorer(model, {beforeTable = "", afterTable = ""} = {}) {
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

export function bindByteMapExplorer(model, root = document) {
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
