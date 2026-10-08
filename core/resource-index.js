// @editor-module 解析资源外键、文本引用、字节范围与地址展示单元格。
//
// 来源：拆分前 engine/editor/app.js 第 1232-1493 行。

import {editorLog} from "./editor-log.js";
import {esc, hex} from "../core/dom.js";
import {visualUrl} from "../core/package-io.js";
import {
  physicalAddressOf,
  physicalAddressTarget,
  summarizePhysicalRanges,
} from "../core/physical-address.js";
import {state} from "../core/state.js";
import {recordUid} from "./record-handle.js";
export {recordUid} from "./record-handle.js";
import {attackVisualCanvas} from "../render/weapon-effect-vm.js";
import {decodeFixedTextRecord, decodeFixedTextRecordSelection} from "./text-record-project.js";

export function romMapAddressHref(address) {
  const target = physicalAddressTarget(address);
  return target
    ? `?view=${target.view}&amp;${target.parameter}=${target.focus}`
    : null;
}

// 地址里的十六进制一律在这儿现算。投影不再把 bank_hex / prg_offset_hex 这类
// 数值字段的孪生字符串一起发过来——26 854 条记录发两遍是 7.5 MiB 的纯冗余。

// 一行的物理地址就是 `<space>:<offset>`，三个空间同一种写法。以前这里是
// `space === "chr" ? CHR : PRG`——任何非 CHR 空间都会被标成 "PRG"，sram 一旦
// 登记 resource_ids 就会显示成错误的空间。
/** 资源 UID 关联范围只从实际字段对象组成的视图取得；缺少登记须单独报告。 */
function resourceByteRangeLookup(uid) {
  const key = uid === null || uid === undefined ? "" : String(uid);
  if (!key) return {uid: key, status: "no-uid", ranges: []};
  const associations = state.resourceRangeFieldViews;
  if (!associations) {
    return {uid: key, status: "unavailable", ranges: []};
  }
  if (associations.has(key)) {
    const ranges = associations.ranges(key);
    return Array.isArray(ranges)
      ? {uid: key, status: "found", ranges}
      : {uid: key, status: "invalid", ranges: []};
  }
  const addressKind = String(indexedResource(key)?.physical_address_kind || "");
  if (addressKind === "composite" || addressKind === "derived") {
    return {uid: key, status: "addressless", ranges: []};
  }
  const expectedShard = resourceDomain(key)
    || associations.expectedShard(key)
    || null;
  if (expectedShard && !associations.loadedShards.includes(expectedShard)) {
    return {uid: key, status: "not-loaded", ranges: []};
  }
  return {uid: key, status: "missing", ranges: []};
}

let reportedByteRangeSource = null;
const reportedByteRangeIssues = new Set();

function reportResourceByteRangeIssue(lookup) {
  const source = state.resourceRangeFieldViews || null;
  if (source !== reportedByteRangeSource) {
    reportedByteRangeSource = source;
    reportedByteRangeIssues.clear();
  }
  const issue = `${lookup.status}:${lookup.uid}`;
  if (reportedByteRangeIssues.has(issue)) return;
  reportedByteRangeIssues.add(issue);
  if (lookup.status === "missing") {
    editorLog.record({source: "数据载入", level: "warning", message: `${lookup.uid} 不在已加载的字段对象关联视图中`});
  } else if (lookup.status === "invalid") {
    editorLog.record({source: "数据载入", level: "warning", message: `${lookup.uid} 的关联范围无效`});
  }
}

export function resourceByteRanges(uid) {
  const lookup = resourceByteRangeLookup(uid);
  if (lookup.status === "missing" || lookup.status === "invalid") {
    reportResourceByteRangeIssue(lookup);
  }
  return lookup.ranges;
}

/** 这一行的 ROM 范围登记了没有。 */

const FIELD_RANGE_ROLE_PREFIX = "field:";

function normalizedResourceByteRange(range, rangeIndex) {
  const role = String(range?.role || "");
  const rawOffset = range?.offset;
  const numericOffset = rawOffset === null || rawOffset === undefined
    ? null : Number(rawOffset);
  const rawLength = range?.length;
  const numericLength = rawLength === null || rawLength === undefined
    ? null : Number(rawLength);
  const fieldKey = role.startsWith(FIELD_RANGE_ROLE_PREFIX)
    ? role.slice(FIELD_RANGE_ROLE_PREFIX.length) : null;
  return {
    key: fieldKey ?? role,
    fieldKey,
    role,
    space: String(range?.space || "").toLowerCase(),
    offset: Number.isInteger(numericOffset) && numericOffset >= 0
      ? numericOffset : null,
    length: Number.isInteger(numericLength) && numericLength >= 0
      ? numericLength : null,
    status: range?.status === null || range?.status === undefined
      ? "" : String(range.status),
    source: range?.source === null || range?.source === undefined
      ? "" : String(range.source),
    rangeIndex,
    slotIndex: null,
    slotCount: null,
    slotWidth: null,
  };
}

/** uid 下所有 `field:<key>` 片段的统一展示模型。 */
export function resourceFieldByteRanges(uid) {
  const ranges = resourceByteRanges(uid);
  if (!Array.isArray(ranges)) return [];
  return ranges.flatMap((range, rangeIndex) => {
    if (!String(range?.role || "").startsWith(FIELD_RANGE_ROLE_PREFIX)) return [];
    return [normalizedResourceByteRange(range, rangeIndex)];
  });
}

function slotDeclaration(declarations, role) {
  if (declarations instanceof Map) return declarations.get(role) || null;
  if (!declarations || typeof declarations !== "object"
      || !Object.prototype.hasOwnProperty.call(declarations, role)) return null;
  return declarations[role] || null;
}

/**
 * 把资源片段按调用方声明的 `{slotCount, slotWidth}` 展开。
 *
 * 原语不认识任何业务 role；没有声明的片段保留为一行。声明必须恰好覆盖整段，
 * 否则立刻报错，避免提取器改变段长后仍用旧槽宽悄悄错位。
 */
export function expandResourceByteRangeSlots(uid, declarations = {}) {
  const ranges = resourceByteRanges(uid);
  if (!Array.isArray(ranges)) return [];
  return ranges.flatMap((range, rangeIndex) => {
    const normalized = normalizedResourceByteRange(range, rangeIndex);
    const declaration = slotDeclaration(declarations, normalized.role);
    if (!declaration) return [normalized];
    const slotCount = Number(declaration.slotCount);
    const slotWidth = Number(declaration.slotWidth);
    if (!Number.isInteger(slotCount) || slotCount <= 0
        || !Number.isInteger(slotWidth) || slotWidth <= 0) {
      throw new TypeError(
        `${normalized.role || "（无 role）"} 的槽声明必须给出正整数 slotCount / slotWidth`,
      );
    }
    if (normalized.offset === null || normalized.length === null
        || normalized.length !== slotCount * slotWidth) {
      throw new RangeError(
        `${String(uid || "（无 uid）")} 的 ${normalized.role || "（无 role）"} `
        + `长度为 ${normalized.length ?? "未登记"} B，不能按 ${slotCount} × ${slotWidth} B 展开`,
      );
    }
    return Array.from({length: slotCount}, (_, slotIndex) => ({
      ...normalized,
      key: `${normalized.key}[${slotIndex}]`,
      offset: normalized.offset + slotIndex * slotWidth,
      length: slotWidth,
      slotIndex,
      slotCount,
      slotWidth,
      segmentOffset: normalized.offset,
      segmentLength: normalized.length,
    }));
  });
}

// 资源索引按模块存放，用命名规则寻址。
//
// uid 是 `表名:序号`，62 种前缀零跨域歧义，所以前缀本身就够定位它属于哪个模块
// （投影里的 `resource_index.uid_domains` 就是那张 1.5 KB 的路由表）。以前这里
// 是一个 26 854 条的全局数组，任何一次查询都要先把整块建成 Map；现在每个模块
// 一份，查询按前缀直达自己那一份。
//
// 每份表按**来源数组身份**缓存，而不是"建一次就永远用"：字符映射保存后会重算
// 并替换 state.project，按需分段补进来时也会换掉数组。用身份做键，两种情况都
// 自动重建，调用点不需要记得手动失效。
const domainMaps = new Map();
const domainSources = new Map();

function domainRecords(domain) {
  return state.project?.resource_index?.by_domain?.[domain] || null;
}

function domainIndex(domain) {
  const records = domainRecords(domain);
  if (!records) return null;
  if (domainSources.get(domain) !== records) {
    domainMaps.set(domain, new Map(records.map(record => [record.uid, record])));
    domainSources.set(domain, records);
  }
  return domainMaps.get(domain);
}

/** uid 前缀 → 它属于哪个模块。 */
export function resourceDomain(uid) {
  const prefix = String(uid || "").split(":", 1)[0];
  return state.project?.resource_index?.uid_domains?.[prefix] || null;
}

export function indexedResource(uid) {
  if (!uid) return null;
  const domain = resourceDomain(uid);
  if (!domain) return null;
  return domainIndex(domain)?.get(String(uid)) || null;
}

function addresslessResourceKind(record) {
  const declared = String(record?.physical_address_kind || "");
  if (declared === "composite" || declared === "derived") return declared;
  // 是否无独立地址是生成期逐资源审计的事实，不能靠前端 kind 白名单猜测。
  // 未声明且没有 range 的记录一律暴露为登记缺口。
  return "unregistered";
}

/** 资源 UID 对应的统一物理地址展示模型。 */
export function resourcePhysicalAddressSummary(uid) {
  const summary = summarizePhysicalRanges(resourceByteRanges(uid));
  if (summary.kind !== "unregistered") return {...summary, uid: String(uid || "")};
  return {
    ...summary,
    uid: String(uid || ""),
    kind: addresslessResourceKind(indexedResource(uid)),
  };
}

/** 资源跳转没有专属页面时所用的语义主入口；无声明时才回退到展示首项。 */
export function resourcePrimaryAddress(uid) {
  const summary = resourcePhysicalAddressSummary(uid);
  return summary.ranges.find(range => range?.primary === true || range?.is_primary === true)
    || summary.entries[0]?.range
    || null;
}

/**
 * 遍历所有模块的索引记录。
 *
 * 只给「按 kind 找一批记录」这类需求用（CHR bank、字模、调查图块）。按 uid 找
 * 单条一律走 `indexedResource()`，那是 O(1) 的。
 */

// 引用处显示的名字是**副本**：权威在各自的域表里。副本不许编辑，也不该缓存
// ——渲染时现查，实时查询的开销完全可以接受。这里按 kind 路由到权威表；投影
// 里已经不再发这些 kind 的 label（见 mm_preview.COPIED_LABEL_KINDS）。
//
// 没登记的 kind 的 label 不是副本，是索引自己合成的显示名（「场景 02 图块调查
// 格 (1,3)」这种），没有别处可查，照用索引里的那一份。
function uidTail(uid, prefix) {
  return String(uid || "").startsWith(`${prefix}:`)
    ? String(uid).slice(prefix.length + 1) : null;
}

function gameDataName(section, uid, prefix) {
  const tail = uidTail(uid, prefix);
  if (tail === null) return null;
  const id = Number.parseInt(tail, 16);
  if (!Number.isInteger(id)) return null;
  const records = state.project?.game_data?.[section]?.records || [];
  return records.find(record => Number(record.id) === id)?.name || null;
}

const LABEL_AUTHORITIES = {
  "monster-stat": uid => gameDataName("monsters", uid, "monster"),
  item: uid => gameDataName("items", uid, "item"),
  "normal-shell": uid => gameDataName("shells", uid, "shell"),
  "special-shell": uid => gameDataName("shells", uid, "shell"),
  "map-scene": uid => {
    const tail = uidTail(uid, "scene");
    const id = tail === null ? null : Number.parseInt(tail, 16);
    if (!Number.isInteger(id)) return null;
    return (state.project?.scenes?.editable_scenes || [])
      .find(entry => Number(entry.id) === id)?.name || null;
  },
  "ui-script-record": uid => currentTextReference(uid).label || null,
  "font-glyph": uid => {
    const code = String(uid).replace(/^font-glyph:/, "").replaceAll(":", " ");
    const unicode = state.project?.text_references?.glyphs?.[code]?.unicode;
    return unicode ? `字符「${unicode}」 · ${code}` : `字符 ${code}`;
  },
};

/**
 * 按资源 ID 取当前显示名。
 *
 * 名字来自 ROM 文本，会随字符映射编辑而变。以前索引里存一份 label 副本，还要
 * 靠一段回写逻辑维持同步；现在直接到权威表里查，副本不复存在，也就没有"文本
 * 更新了、引用处还是旧名"这回事。
 */
export function resourceLabel(uid, fallback = null) {
  if (!uid) return fallback;
  if (String(uid).startsWith("audio-command:")) {
    return audioCommandLabel(Number.parseInt(uidTail(uid, "audio-command"), 16));
  }
  const record = indexedResource(uid);
  const authority = LABEL_AUTHORITIES[record?.kind];
  if (authority) return authority(uid, record) || record?.label || fallback || uid;
  return record?.label || fallback;
}

// 物品类别按已发布 UID 关联判断，UID 不作为物理字段对象的 owner。
const ITEM_ASSOCIATION_UID_PREFIXES = Object.freeze(["human-item", "tank-item"]);

export function itemResourceUid(itemOrId) {
  const id = Number(itemOrId && typeof itemOrId === "object" ? itemOrId.id : itemOrId);
  if (!Number.isInteger(id) || id < 0 || id > 0xFF) {
    throw new TypeError(`无效的物品 ID：${String(id)}`);
  }
  const associations = state.resourceRangeFieldViews;
  if (!associations) {
    throw new Error("物品资源关联范围尚未加载");
  }
  const candidates = ITEM_ASSOCIATION_UID_PREFIXES
    .map(prefix => recordUid(prefix, id))
    .filter(uid => associations.has(uid));
  if (candidates.length !== 1) {
    const suffix = id.toString(16).toUpperCase().padStart(2, "0");
    throw new RangeError(
      `字段对象关联视图没有给物品 ${suffix} 唯一类别（命中：${candidates.join("、") || "0"}）`,
    );
  }
  return candidates[0];
}

function uiScriptResourceUid(reference) {
  const value = String(reference || "");
  return value.startsWith("record:")
    ? `ui-script:${value.slice("record:".length)}`
    : value;
}

export function currentTextReference(reference, {ranges = null} = {}) {
  const uid = uiScriptResourceUid(reference);
  const resource = indexedResource(uid);
  const nodeId = uid.startsWith("ui-script:") ? `record:${uid.slice("ui-script:".length)}` : "";
  const project = state.project;
  const record = project?.text_record_edits?.records?.[nodeId];
  const encoding = project?.text_record_encoding;
  return {
    uid,
    label: record && encoding
      ? ranges ? decodeFixedTextRecordSelection(record, encoding, ranges).text
        : decodeFixedTextRecord(record, encoding, {fillPlaceholders: true}).formatted_text
      : String(project?.text_references?.records?.[nodeId]?.text || ""),
    status: resource?.status || null,
  };
}

export function currentTextChoiceLabel(reference) {
  const match = /^text-record:([0-9A-F]{2}):([0-9A-F]{3})$/u.exec(reference?.record || '');
  if (!match) return '';
  const record = `record:${match[1]}:${String(parseInt(match[2], 16)).padStart(3, '0')}`;
  const text = currentTextReference(record).label;
  if (Number.isInteger(reference.line)) return text.split('\n')[reference.line]?.trim() || '';
  if (Number.isInteger(reference.glyph_index)) return [...text.replace(/\s/gu, '')][reference.glyph_index] || '';
  return text.trim();
}

/** 曲名只解引用点唱机声明的游戏文字；无曲名时显示命令编号。 */
export function audioCommandLabel(id) {
  const entry = (state.project?.facilities?.configuration_loader?.pointer_entries || [])
    .find(item => Number(item.family_id) === 0x0A);
  const good = (entry?.value_namespace?.goods || [])
    .find(item => Number(item.value) === Number(id));
  return currentTextReference(good?.text_record || good?.resource_uid).label
    || `音频命令 ${hex(Number(id), 2)}`;
}

export function currentTextReferenceLink(reference, fallback = null) {
  const current = currentTextReference(reference);
  const label = current.label || fallback || reference || current.uid;
  return `<button class="resource-inline-link current-text-reference" type="button" data-resource-target="${esc(current.uid)}" title="${esc(current.uid)}"><b>${esc(label)}</b><small>${esc(current.uid)}</small></button>`;
}

function currentTextReferenceStatusLabel(status) {
  const mappingStatus = String(status || "").match(/unicode-([^/]+)$/)?.[1];
  if (mappingStatus === "confirmed") return "人工确认";
  if (mappingStatus === "candidate-complete") return "完整映射";
  return String(status || "状态未登记");
}

/** 引用处的当前正文：附注进 title，视觉上只保留可点击文字。 */
export function plainTextRecordReferences(
  recordIds,
  emptyLabel = "没有可直接显示的静态文字",
) {
  const ids = [...new Set((recordIds || []).filter(Boolean).map(String))];
  const links = ids.map(reference => {
    const current = currentTextReference(reference);
    if (!current.label) return "";
    const nodeId = String(indexedResource(current.uid)?.game_id || reference);
    const title = `${nodeId} · ${currentTextReferenceStatusLabel(current.status)}`;
    return `<button class="resource-inline-link plain-text-reference" type="button" data-resource-target="${esc(current.uid)}" title="${esc(title)}">${esc(current.label)}</button>`;
  }).filter(Boolean);
  return links.length
    ? `<span class="plain-text-references">${links.join("")}</span>`
    : `<span class="resource-empty">${esc(emptyLabel)}</span>`;
}

export function textRecordDisplayText(record) {
  if (!record) return "";
  const direct = String(record.formatted_text || record.display_text || "");
  if (direct) return direct;
  const mapping = record.unicode_mapping || {};
  const preview = String(record.unicode_preview || "");
  return mapping.confirmed_complete && preview && !preview.includes("□")
    ? preview : "";
}

/**
 * 不要在普通引用处调用这套重建式呈现：卡片外壳会挤占表格与记录页的视觉空间。
 * 引用处请调用 plainTextRecordReferences()；重建式卡片只归 views/text/ 的文本
 * 管理页与 views/ui-editor.js 的 1:1 UI 重建。
 */
export function currentTextRecordCard(record, {compact = false} = {}) {
  const text = currentTextReference(record?.node_id).label || textRecordDisplayText(record);
  if (!text) return "";
  const resourceUid = uiScriptResourceUid(record.node_id);
  const status = record.unicode_mapping?.status === "confirmed"
    ? "人工确认" : record.unicode_mapping?.complete ? "完整映射" : "映射未完整";
  return `<button class="current-text-record ${compact ? "compact" : ""}" type="button" data-resource-target="${esc(resourceUid)}" title="${esc(resourceUid)}">
    <span>${esc(text)}</span><small>${esc(record.node_id)} · ${esc(status)}</small>
  </button>`;
}

export function currentTextRecordPlaceholder(recordIds, emptyLabel = "没有可直接显示的静态文字") {
  const ids = [...new Set((recordIds || []).filter(Boolean))];
  if (!ids.length) return `<span class="resource-empty">${esc(emptyLabel)}</span>`;
  const immediate = ids.map(reference => {
    const current = currentTextReference(reference);
    return current.label
      ? `<button class="current-text-record compact" type="button" data-resource-target="${esc(current.uid)}"><span>${esc(current.label)}</span><small>${esc(reference)}</small></button>`
      : "";
  }).filter(Boolean).join("");
  return `<div class="current-text-record" data-current-text-record="${esc(ids.join(","))}" data-empty-label="${esc(emptyLabel)}">${immediate || `<span class="resource-empty">读取当前文字…</span>`}</div>`;
}

function physicalRangeTitle(range) {
  const label = physicalAddressOf(range) || "无效地址";
  const length = Number(range?.length);
  const size = Number.isInteger(length) && length > 0 ? `${length} B` : "长度未登记";
  const roles = Array.isArray(range?.roles) && range.roles.length
    ? range.roles.join(" / ") : range?.role;
  return [label, size, roles, range?.status || "未分级"].filter(Boolean).join(" · ");
}

/** 已有直接 `{space, offset}` source 的可点击物理地址。 */
export function directPhysicalAddress(address, options = {}) {
  const label = options.label || physicalAddressOf(address);
  const href = romMapAddressHref(address);
  if (!label || !href) {
    return `<span class="resource-unregistered" title="物理地址无效或尚未登记">未登记</span>`;
  }
  const title = options.title || physicalRangeTitle(address);
  const deferredTitle = options.deferredAddressTitle
    ? ` data-address-title-space="${esc(String(address.space || ""))}"` : "";
  return `<a class="mono resource-address-link" href="${href}" title="${esc(title)}"${deferredTitle}>${esc(label)}</a>`;
}

export function physicalAddressLink(source, {
  label = "", fallback = "未登记", missingClass = "resource-unregistered",
  includeCpu = false, invalidFallback = null, ...options
} = {}) {
  const value = source?.offset != null || source?.prg_offset != null
    ? source : source?.source;
  const offset = value?.offset ?? value?.prg_offset;
  if (offset == null || !Number.isInteger(Number(offset))) {
    return `<span class="${esc(missingClass)}">${esc(fallback)}</span>`;
  }
  const address = {...value, space: value.space || "prg", offset: Number(offset),
    length: Number(value.length ?? value.width ?? 1)};
  if (invalidFallback !== null && !romMapAddressHref(address)) {
    return `<span class="${esc(missingClass)}">${esc(invalidFallback)}</span>`;
  }
  const text = label || (includeCpu
    ? `${physicalAddressOf(address) || "—"} · CPU ${address.cpu_address != null ? hex(address.cpu_address, 4) : "—"}`
    : physicalAddressOf(address));
  return directPhysicalAddress(address, {...options, label: text});
}

/** 明确表示该行只是组合/派生视图，不把子资源入口冒充成自身地址。 */
function noIndependentPhysicalAddress(label = "组合资源（无独立地址）") {
  return `<span class="resource-empty" title="该行引用其他资源，但没有可归属给自身的独立物理字节">${esc(label)}</span>`;
}

function unregisteredResourceAddress(uid) {
  // 未登记 ≠ 没有地址。字节地图的 100% 覆盖是分类兜底填出来的，这一行到底占哪
  // 几个字节还没确认过——显式说出来，不要留白，也不要拿兜底范围充数。
  return `<span class="resource-unregistered" title="${esc(uid)} 的物理范围尚未登记进字节地图">未登记</span>`;
}

let compactAddressTitleBound = false;

function bindCompactAddressTitle() {
  if (compactAddressTitleBound || typeof document === "undefined") return;
  compactAddressTitleBound = true;
  const expand = event => {
    const link = event.target.closest?.("[data-address-title-space]");
    if (!link) return;
    const details = link.closest("[data-address-details]")?.dataset.addressDetails;
    if (!details) return;
    link.title += `\n点击打开 ${link.dataset.addressTitleSpace.toUpperCase()} 字节地图\n\n全部物理片段：\n${details}`;
    link.removeAttribute("data-address-title-space");
  };
  document.addEventListener("pointerover", expand, true);
  document.addEventListener("focusin", expand, true);
}

export function compactResourceAddress(uid, {deferFullTitle = false} = {}) {
  const summary = resourcePhysicalAddressSummary(uid);
  if (summary.kind === "composite") return noIndependentPhysicalAddress();
  if (summary.kind === "derived") return noIndependentPhysicalAddress("派生资源（无独立地址）");
  if (summary.kind === "unregistered") return unregisteredResourceAddress(uid);
  const details = summary.ranges.map(physicalRangeTitle).join("\n");
  // 非连续片段全部实际渲染。此前只露出每个介质的一个入口、把「另 N 段」藏在
  // tooltip，用户无法直接比较或跳到余下地址；现在每一段都有自己的可点击深链。
  if (deferFullTitle) bindCompactAddressTitle();
  const links = summary.ranges.map(range => directPhysicalAddress(range, {
    title: deferFullTitle ? physicalRangeTitle(range)
      : `${physicalRangeTitle(range)}\n点击打开 ${String(range.space).toUpperCase()} 字节地图\n\n全部物理片段：\n${details}`,
    deferredAddressTitle: deferFullTitle,
  })).join("");
  return `<div class="compact-resource-address" data-address-kind="${summary.kind}"${deferFullTitle ? ` data-address-details="${esc(details)}"` : ""}>${links}</div>`;
}

export function tableValueStack(values, empty = "—") {
  const items = (values || []).filter(value => value !== null && value !== undefined && String(value) !== "");
  if (!items.length) return `<span class="resource-empty">${esc(empty)}</span>`;
  return `<div class="table-cell-stack">${items.map(value => `<span>${esc(value)}</span>`).join("")}</div>`;
}

const resourceRelationLabels = {
  "uses-text": "使用文本",
  "uses-name": "使用名称文本",
  "uses-script": "引用界面或文本记录",
  "uses-layout": "引用界面布局",
  "uses-composition": "使用界面组合",
  "uses-scene": "使用场景",
  "uses-story-actor-list": "使用剧情角色表",
  "uses-actor-set": "使用角色图形组",
  "uses-actor-type": "使用角色类型",
  "uses-actor-motion": "使用角色运动",
  "uses-scene-entry-motion": "场景入口覆盖运动",
  "uses-attack-visual": "引用攻击特效",
  "uses-attack-script": "使用攻击脚本",
  "uses-battle-action": "使用战斗对象动作",
  "uses-chr-bank": "使用 CHR bank",
  "uses-core-font-glyph": "使用 PRG 基础字模",
  "uses-static-font-glyph": "使用 CHR 固定字模",
  "contains-core-font-glyph": "包含基础字模",
  "part-of-font-template": "属于基础字模模板",
  "part-of-chr-bank": "属于 CHR bank",
  "uses-monster-graphic": "使用怪物图形",
  "uses-monster-palette": "使用怪物调色板",
  "uses-monster-palette-pair": "使用怪物双色组合",
  "uses-battle-figure": "引用角色或怪物图形",
  "uses-sprite-context": "引用精灵图形上下文",
  "uses-npc-service": "关联 NPC 服务入口",
  "uses-vehicle-portrait": "使用战车立绘",
  "uses-ui-script": "使用 UI / 文本记录",
  "includes-record": "嵌入文本记录",
  "runs-inline-story-action": "触发内联剧情动作",
  "contains-scene-actor": "包含场景角色",
  "runs-autonomous-script": "运行自动动作脚本",
  "selects-autonomous-script": "选择自动动作脚本",
  "selects-interaction-script": "选择交互动作脚本",
  "belongs-to-scene": "属于场景",
  "calls-primary-script": "调用主攻击脚本",
  "calls-auxiliary-script": "调用辅助攻击脚本",
  "initial-item": "初始装备 / 道具",
  "contains-item": "包含道具",
  "has-field-use": "具有非战斗使用记录",
  "has-battle-use": "具有战斗使用记录",
  "uses-item-definition": "引用道具信息与名称",
  "uses-field-item-dispatch": "使用非战斗调度",
  "uses-battle-item-dispatch": "使用战斗调度",
  "uses-audio-sequence-region": "使用音序区",
  "contains-audio-track": "包含音频轨道",
  "uses-audio-sequence-stream": "使用音序流",
  "decoded-from-audio-command": "由声音命令引用",
  "resolves-audio-sequence-execution": "使用解析执行",
  "resolved-by-audio-sequence-execution": "由解析执行展开",
  "executes-audio-sequence-stream": "执行音序流",
  "part-of-audio-sequence-stream": "属于音序流",
  "uses-audio-opcode-definition": "使用音序 opcode",
  "selects-audio-voice": "选择音色 / 包络",
  "contains-audio-voice-instruction": "包含包络指令",
  "part-of-audio-voice": "属于音色 / 包络",
  "triggers-dpcm-sample": "触发 DPCM 参数",
  "aliases-audio-command": "共用声音 header",
  "selects-audio-command": "选择声音命令",
  "plays-audio-command": "播放声音命令",
  "uses-audio-control": "使用音频控制",
  "has-configuration": "包含设施配置",
  "activates-facility-configuration": "调查后激活设施配置",
  "dispatches-investigation-command": "分派到调查命令",
  "has-investigation-configuration": "包含调查配置",
  "configuration-of-investigation-command": "属于调查命令",
  "uses-facility-ui": "使用完整设施 UI",
  "used-by-investigation-instance": "被调查实例使用",
  "has-track": "包含曲目",
  "track-of-facility": "属于点唱机",
  "has-routine": "包含运行入口",
  "routine-of-facility": "属于设施应用",
  "offers-item": "售卖道具",
  "offers-shell": "售卖炮弹",
  "lottery-prize-item": "抽奖奖品",
};

function resourceReferenceCell(edges, targetKinds = null) {
  const visible = (edges || []).filter(edge => {
    if (!targetKinds) return true;
    return targetKinds.includes(indexedResource(edge.target)?.kind);
  });
  if (!visible.length) return `<span class="resource-empty">—</span>`;
  return `<div class="resource-reference-list">${visible.map(edge => {
    const uid = edge.target;
    const target = indexedResource(uid);
    const relation = resourceRelationLabels[edge.relation] || edge.relation;
    // 攻击特效缩略图直接播放 VM 的完整帧序列，像素来自视觉脚本 + shared-chr-bank。
    const preview = target?.kind === "attack-visual" && target.game_index != null
      ? attackVisualCanvas({visualCode: target.game_index, play: true})
      : "";
    const currentText = currentTextReference(uid);
    const label = currentText.label || (target?.kind === "audio-command" ? resourceLabel(uid) : "") || uid;
    const stableIdentity = label !== uid
      ? `<small class="resource-reference-identity">${esc(uid)}</small>`
      : "";
    return `<button type="button" class="${preview ? "resource-reference-preview" : ""}" data-resource-target="${esc(uid)}" title="${esc(relation)} → ${esc(uid)}">${preview}<span><small>${esc(relation)}</small><b>${esc(label)}</b>${stableIdentity}</span></button>`;
  }).join("")}</div>`;
}

// 总表里的引用只显示条数：资源索引还在变大，逐行铺开会持续把表撑宽，而读总表的人
// 多数时候并不需要它。要看引用关系去具体资产的编辑/预览界面，那里用
// resourceReferenceList() 给完整列表。悬停可看明细，不必点。
function referenceCountCell(edges) {
  if (!edges.length) return `<span class="resource-empty">—</span>`;
  const lines = edges.map(edge =>
    `${resourceRelationLabels[edge.relation] || edge.relation} → ${
      currentTextReference(edge.target).label || (indexedResource(edge.target)?.kind === "audio-command"
        ? resourceLabel(edge.target) : "") || edge.target}`
  );
  return `<span class="resource-reference-count" title="${esc(lines.join("\n"))}">${edges.length}</span>`;
}

/** 完整引用列表。资产详情/预览用这个，总表不要用。 */
function resourceReferenceList(uid, targetKinds = null) {
  return resourceReferenceCell(indexedResource(uid)?.references || [], targetKinds);
}

export function resourceForwardReferenceCell(uid, targetKinds = null) {
  const edges = (indexedResource(uid)?.references || []).filter(edge =>
    !targetKinds || targetKinds.includes(indexedResource(edge.target)?.kind)
  );
  return referenceCountCell(edges);
}

const textCharacterResourceKinds = new Set([
  "font-glyph",
  "font-core-glyph",
  "font-static-glyph",
]);

export function textCharacterResourceUid(reference) {
  const encoded = String(reference?.encoded_hex || "").trim();
  if (encoded) return `font-glyph:${encoded.replaceAll(" ", ":")}`;
  const tile = Number(reference?.tile_id);
  if (!Number.isFinite(tile)) return null;
  const prefix = reference?.font_source === "chr-static-pattern" || tile >= 0x80
    ? "font-static-glyph"
    : "font-core-glyph";
  return `${prefix}:${tile.toString(16).toUpperCase().padStart(2, "0")}`;
}

function textCharacterEncodingSequence(record) {
  const references = [
    ...(record?.glyph_references || []),
    ...(record?.literal_tile_references || []),
  ].sort((left, right) => Number(left.offset) - Number(right.offset));
  if (!references.length) return "";
  const tokens = references.map(reference => {
    const code = String(
      reference.encoded_hex || reference.tile_id_hex || "??"
    ).toUpperCase();
    const unicode = reference.unicode === " "
      ? "空格"
      : String(reference.unicode || "待识别");
    const uid = textCharacterResourceUid(reference);
    const title = `${unicode} · ${code}${uid ? ` · ${uid}` : ""}`;
    return uid && indexedResource(uid)
      ? `<button type="button" class="text-encoding-token" data-resource-target="${esc(uid)}" title="${esc(title)}">${esc(code)}</button>`
      : `<span class="text-encoding-token" title="${esc(title)}">${esc(code)}</span>`;
  }).join("");
  return `<div class="text-encoding-reference"><small>字符编码 · ${references.length} token</small><div class="text-encoding-sequence">${tokens}</div></div>`;
}

export function textRecordReferenceCell(record, uid) {
  const otherEdges = (indexedResource(uid)?.references || []).filter(
    edge => !textCharacterResourceKinds.has(indexedResource(edge.target)?.kind)
  );
  const sequence = textCharacterEncodingSequence(record);
  const otherReferences = otherEdges.length
    ? `<div class="text-record-other-references">${referenceCountCell(otherEdges)}</div>`
    : "";
  return sequence || otherReferences
    ? `<div class="text-record-reference-cell">${sequence}${otherReferences}</div>`
    : `<span class="resource-empty">—</span>`;
}
